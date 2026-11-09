import { conflictError, forbiddenError, notFoundError, validationError } from '@/lib/domain/errors';
import type { ReservationDetails } from '@/lib/domain/reservation';
import type { Notification } from '@/lib/domain/notification';
import { assertCan } from '@/lib/domain/permissions';
import { MIN_PASSWORD_LENGTH, roles, type Actor, type Role, type User } from '@/lib/domain/user';
import type { NotificationRepository } from '@/lib/repositories/notification-repository';
import type { ReservationRepository } from '@/lib/repositories/reservation-repository';
import type { UserRepository } from '@/lib/repositories/user-repository';
import type { ActivityService } from './activity-service';
import type { Clock } from './clock';
import type { PasswordHasher } from './password-hasher';

/** Données nécessaires pour créer un compte (EF-02). */
export type NewAccount = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: Role;
};

/** Données personnelles d'un utilisateur, pour l'exercice du droit d'accès (RGPD). */
export type PersonalData = {
  profile: User;
  reservations: ReservationDetails[];
  notifications: Notification[];
};

/**
 * Service métier des comptes : gestion par l'administrateur (EF-02, R7) et
 * droits de la personne connectée sur ses propres données (EF-03, RGPD).
 */
export class UserService {
  /**
   * @param users Repository des comptes.
   * @param reservations Repository des réservations.
   * @param notifications Repository des notifications.
   * @param hasher Hachage des mots de passe.
   * @param activity Journal d'activité.
   * @param clock Horloge.
   */
  constructor(
    private readonly users: UserRepository,
    private readonly reservations: ReservationRepository,
    private readonly notifications: NotificationRepository,
    private readonly hasher: PasswordHasher,
    private readonly activity: ActivityService,
    private readonly clock: Clock,
  ) {}

  /**
   * Liste tous les comptes.
   *
   * @param actor Personne connectée.
   */
  async list(actor: Actor | null): Promise<User[]> {
    assertCan(actor, 'user:manage');

    return this.users.findAll();
  }

  /**
   * Crée un compte. Il n'existe pas d'inscription libre : seul l'administrateur
   * crée des comptes.
   *
   * @param actor Personne connectée.
   * @param account Identité, mot de passe initial et rôle.
   */
  async create(actor: Actor | null, account: NewAccount): Promise<User> {
    assertCan(actor, 'user:manage');

    const email = account.email.trim().toLowerCase();

    this.assertPasswordStrength(account.password);

    if (!roles.includes(account.role)) {
      throw validationError('Ce rôle n’existe pas.');
    }

    if (await this.users.findCredentialsByEmail(email)) {
      throw conflictError('Un compte existe déjà avec cette adresse e-mail.');
    }

    const user = await this.users.create({
      firstName: account.firstName.trim(),
      lastName: account.lastName.trim(),
      email,
      passwordHash: await this.hasher.hash(account.password),
      role: account.role,
    });

    await this.activity.record({
      authorId: actor.id,
      action: 'USER_CREATED',
      targetType: 'User',
      targetId: user.id,
      metadata: { role: user.role },
    });

    return user;
  }

  /**
   * Attribue ou retire le rôle de gestionnaire, ou change le rôle d'un compte.
   * Le dernier administrateur actif ne peut pas perdre son rôle.
   *
   * @param actor Personne connectée.
   * @param userId Compte à modifier.
   * @param role Nouveau rôle.
   */
  async changeRole(actor: Actor | null, userId: string, role: Role): Promise<User> {
    assertCan(actor, 'user:manage');

    if (!roles.includes(role)) {
      throw validationError('Ce rôle n’existe pas.');
    }

    const target = await this.requireUser(userId);

    if (target.role === 'ADMIN' && role !== 'ADMIN') {
      await this.assertNotLastAdmin(target);
    }

    const user = await this.users.updateRole(userId, role);

    await this.activity.record({
      authorId: actor.id,
      action: 'USER_ROLE_CHANGED',
      targetType: 'User',
      targetId: userId,
      metadata: { from: target.role, to: role },
    });

    return user;
  }

  /**
   * Désactive ou réactive un compte. Un compte désactivé ne peut plus se
   * connecter et ses réservations à venir sont annulées (R7). L'historique est
   * conservé.
   *
   * @param actor Personne connectée.
   * @param userId Compte concerné.
   * @param isActive `false` pour désactiver, `true` pour réactiver.
   */
  async setActive(actor: Actor | null, userId: string, isActive: boolean): Promise<User> {
    assertCan(actor, 'user:manage');

    const target = await this.requireUser(userId);

    if (!isActive) {
      if (target.id === actor.id) {
        throw forbiddenError('Vous ne pouvez pas désactiver votre propre compte.');
      }

      if (target.role === 'ADMIN') {
        await this.assertNotLastAdmin(target);
      }
    }

    const user = await this.users.setActive(userId, isActive);

    if (!isActive) {
      await this.cancelUpcomingReservations(userId);
    }

    await this.activity.record({
      authorId: actor.id,
      action: isActive ? 'USER_REACTIVATED' : 'USER_DEACTIVATED',
      targetType: 'User',
      targetId: userId,
      metadata: {},
    });

    return user;
  }

  /**
   * Retourne les données personnelles de la personne connectée.
   *
   * @param actor Personne connectée.
   */
  async getMyData(actor: Actor | null): Promise<PersonalData> {
    if (!actor) {
      throw forbiddenError('Vous devez vous connecter.');
    }

    const profile = await this.requireUser(actor.id);
    const [reservations, notifications] = await Promise.all([
      this.reservations.findByUser(actor.id),
      this.notifications.findByUser(actor.id, 500),
    ]);

    return { profile, reservations, notifications };
  }

  /**
   * Change le mot de passe de la personne connectée.
   *
   * @param actor Personne connectée.
   * @param currentPassword Mot de passe actuel.
   * @param newPassword Nouveau mot de passe.
   */
  async changeMyPassword(
    actor: Actor | null,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    if (!actor) {
      throw forbiddenError('Vous devez vous connecter.');
    }

    await this.verifyPassword(actor.id, currentPassword);
    this.assertPasswordStrength(newPassword);
    await this.users.updatePasswordHash(actor.id, await this.hasher.hash(newPassword));
  }

  /**
   * Supprime le compte de la personne connectée (EF-03). Ses réservations à
   * venir sont annulées, ses notifications supprimées et ses réservations
   * passées anonymisées pour conserver les statistiques d'utilisation.
   *
   * @param actor Personne connectée.
   * @param password Mot de passe, redemandé pour confirmer.
   */
  async deleteMyAccount(actor: Actor | null, password: string): Promise<void> {
    if (!actor) {
      throw forbiddenError('Vous devez vous connecter.');
    }

    const user = await this.verifyPassword(actor.id, password);

    if (user.role === 'ADMIN') {
      await this.assertNotLastAdmin(user);
    }

    await this.cancelUpcomingReservations(actor.id);
    await this.notifications.deleteByUser(actor.id);
    await this.users.delete(actor.id);
    await this.activity.record({
      authorId: actor.id,
      action: 'USER_DELETED',
      targetType: 'User',
      targetId: actor.id,
      metadata: {},
    });
  }

  private async cancelUpcomingReservations(userId: string): Promise<void> {
    const now = this.clock();
    const upcoming = await this.reservations.findUpcomingActiveByUser(userId, now);

    for (const reservation of upcoming) {
      await this.reservations.updateStatus(reservation.id, {
        status: 'CANCELLED',
        decisionReason: 'Compte désactivé ou supprimé',
        decidedAt: now,
      });
    }
  }

  private async verifyPassword(userId: string, password: string): Promise<User> {
    const user = await this.requireUser(userId);
    const credentials = await this.users.findCredentialsByEmail(user.email);

    if (!credentials || !(await this.hasher.verify(password, credentials.passwordHash))) {
      throw forbiddenError('Le mot de passe est incorrect.');
    }

    return user;
  }

  private async requireUser(userId: string): Promise<User> {
    const user = await this.users.findById(userId);

    if (!user) {
      throw notFoundError('Ce compte est introuvable.');
    }

    return user;
  }

  private async assertNotLastAdmin(target: User): Promise<void> {
    if (target.isActive && (await this.users.countActiveAdmins()) <= 1) {
      throw conflictError('Il doit rester au moins un administrateur actif.');
    }
  }

  private assertPasswordStrength(password: string): void {
    if (password.length < MIN_PASSWORD_LENGTH) {
      throw validationError(
        `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`,
      );
    }
  }
}
