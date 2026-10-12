import { toPublicUser, type Actor, type User } from '@/lib/domain/user';
import type { UserRepository } from '@/lib/repositories/user-repository';
import type { PasswordHasher } from './password-hasher';

/** Service d'authentification : vérifie les identifiants et l'état du compte. */
export class AuthService {
  private dummyHash: Promise<string> | null = null;

  /**
   * @param users Repository des comptes.
   * @param hasher Hachage des mots de passe.
   */
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
  ) {}

  /**
   * Vérifie une adresse e-mail et un mot de passe. Un compte désactivé ne peut
   * pas se connecter (R7). La réponse ne distingue pas un compte inconnu d'un
   * mauvais mot de passe, et le temps de calcul est le même dans les deux cas.
   *
   * @param email Adresse e-mail saisie.
   * @param password Mot de passe saisi.
   * @returns L'utilisateur, ou `null` si la connexion est refusée.
   */
  async authenticate(email: string, password: string): Promise<User | null> {
    const credentials = await this.users.findCredentialsByEmail(email.trim().toLowerCase());
    const hash = credentials?.passwordHash ?? (await this.getDummyHash());
    const passwordMatches = await this.hasher.verify(password, hash);

    if (!credentials || !passwordMatches || !credentials.isActive) {
      return null;
    }

    return toPublicUser(credentials);
  }

  /**
   * Recharge l'acteur à partir de la base : le rôle et l'état du compte sont
   * toujours relus côté serveur, jamais déduits d'une donnée du client. Un
   * compte désactivé perd donc immédiatement l'accès (ADR 002).
   *
   * @param userId Identifiant contenu dans la session.
   * @returns L'utilisateur actif, ou `null` si le compte n'existe plus ou est désactivé.
   */
  async resolveActiveUser(userId: string): Promise<User | null> {
    const user = await this.users.findById(userId);

    return user?.isActive ? user : null;
  }

  /**
   * Convertit un utilisateur en acteur.
   *
   * @param user Utilisateur authentifié.
   */
  static toActor(user: Pick<User, 'id' | 'role'>): Actor {
    return { id: user.id, role: user.role };
  }

  private getDummyHash(): Promise<string> {
    this.dummyHash ??= this.hasher.hash('mot-de-passe-factice');

    return this.dummyHash;
  }
}
