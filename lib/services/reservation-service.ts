import {
  conflictError,
  notFoundError,
  ruleViolationError,
  validationError,
} from '@/lib/domain/errors';
import { assertCan, can } from '@/lib/domain/permissions';
import type { NewNotification } from '@/lib/domain/notification';
import { type Reservation, type ReservationDetails } from '@/lib/domain/reservation';
import {
  MAX_UPCOMING_PER_CATEGORY,
  bufferMinutes,
  checkCancellation,
  checkReservationRules,
  slotsConflict,
} from '@/lib/domain/reservation-rules';
import { categoryRequiresApproval } from '@/lib/domain/resource';
import { formatSlot } from '@/lib/domain/time';
import type { Actor } from '@/lib/domain/user';
import type { MaintenanceRepository } from '@/lib/repositories/maintenance-repository';
import type { ReservationRepository } from '@/lib/repositories/reservation-repository';
import type { ResourceRepository } from '@/lib/repositories/resource-repository';
import type { UserRepository } from '@/lib/repositories/user-repository';
import { SYSTEM_AUTHOR, type ActivityService } from './activity-service';
import type { Clock } from './clock';
import type { NotificationService } from './notification-service';

/** Créneau demandé par un adhérent. */
export type ReservationRequest = { resourceId: string; startsAt: Date; endsAt: Date };

/** Décision d'un gestionnaire sur une demande en attente. */
export type Decision = { approve: true } | { approve: false; reason: string };

/** Créneau occupé d'une ressource, sans donnée personnelle. */
export type OccupiedSlot = { startsAt: Date; endsAt: Date; kind: 'reservation' | 'maintenance' };

const MIN_REASON_LENGTH = 3;
const MAX_REASON_LENGTH = 500;

/**
 * Service métier des réservations : création et contrôle des règles de
 * gestion R1 à R5 et RC-01 (EF-06), annulation (R4, EF-07), validation ou
 * refus motivé par un gestionnaire (R6, EF-08) et expiration des demandes non
 * traitées (R8).
 */
export class ReservationService {
  /**
   * @param reservations Repository des réservations.
   * @param resources Repository des ressources.
   * @param maintenances Repository des maintenances.
   * @param users Repository des comptes, pour retrouver les gestionnaires à prévenir.
   * @param notifications Service des notifications.
   * @param activity Journal d'activité.
   * @param clock Horloge.
   */
  constructor(
    private readonly reservations: ReservationRepository,
    private readonly resources: ResourceRepository,
    private readonly maintenances: MaintenanceRepository,
    private readonly users: UserRepository,
    private readonly notifications: NotificationService,
    private readonly activity: ActivityService,
    private readonly clock: Clock,
  ) {}

  /**
   * Réserve une ressource. Selon sa catégorie, la réservation est confirmée
   * immédiatement ou devient une demande en attente de validation.
   *
   * @param actor Personne connectée.
   * @param request Ressource et créneau demandés.
   * @throws DomainError si une règle de gestion est enfreinte ou si le créneau n'est pas libre.
   */
  async reserve(actor: Actor | null, request: ReservationRequest): Promise<Reservation> {
    assertCan(actor, 'reservation:create');

    const now = this.clock();
    const resource = await this.resources.findById(request.resourceId);

    if (!resource?.isActive) {
      throw notFoundError('Cette ressource n’est pas disponible à la réservation.');
    }

    const upcomingCount = await this.reservations.countUpcomingByUser(
      actor.id,
      resource.category,
      now,
    );
    const violations = checkReservationRules({
      category: resource.category,
      startsAt: request.startsAt,
      endsAt: request.endsAt,
      now,
      upcomingCount,
    });

    if (violations.length > 0) {
      throw ruleViolationError(violations.map((violation) => violation.message).join(' '));
    }

    await this.assertAvailable(request, resource.category);

    const status = categoryRequiresApproval(resource.category) ? 'PENDING' : 'CONFIRMED';
    const reservation = await this.reservations.createWithQuota(
      {
        resourceId: resource.id,
        userId: actor.id,
        startsAt: request.startsAt,
        endsAt: request.endsAt,
        status,
      },
      { category: resource.category, limit: MAX_UPCOMING_PER_CATEGORY, now },
    );

    await this.activity.record({
      authorId: actor.id,
      action: 'RESERVATION_CREATED',
      targetType: 'Reservation',
      targetId: reservation.id,
      metadata: { resource: resource.name, status },
    });

    if (status === 'PENDING') {
      await this.notifyStaff({
        type: 'REQUEST_CREATED',
        title: 'Nouvelle demande à traiter',
        message: `${resource.name} · ${formatSlot(reservation.startsAt, reservation.endsAt)}`,
        link: `/gestion/demandes/${reservation.id}`,
      });
    }

    return reservation;
  }

  /**
   * Annule une réservation. Un adhérent n'annule que ses propres réservations
   * et jusqu'à 24 heures avant leur début (R4) ; un gestionnaire peut annuler
   * toute réservation à venir.
   *
   * @param actor Personne connectée.
   * @param reservationId Réservation à annuler.
   */
  async cancel(actor: Actor | null, reservationId: string): Promise<Reservation> {
    assertCan(actor, 'reservation:create');

    const reservation = await this.getOwnedOrManaged(actor, reservationId);
    const violation = checkCancellation({ actor, reservation, now: this.clock() });

    if (violation) {
      throw ruleViolationError(violation.message);
    }

    const wasPending = reservation.status === 'PENDING';
    const cancelled = await this.reservations.updateStatus(reservation.id, {
      status: 'CANCELLED',
      decidedAt: this.clock(),
    });

    await this.activity.record({
      authorId: actor.id,
      action: 'RESERVATION_CANCELLED',
      targetType: 'Reservation',
      targetId: reservation.id,
      metadata: { resource: reservation.resource.name },
    });

    const slot = `${reservation.resource.name} · ${formatSlot(reservation.startsAt, reservation.endsAt)}`;

    if (reservation.userId && reservation.userId !== actor.id) {
      await this.notifications.send({
        userId: reservation.userId,
        type: 'RESERVATION_CANCELLED',
        title: 'Réservation annulée par un gestionnaire',
        message: slot,
        link: '/reservations',
      });
    } else if (wasPending) {
      await this.notifyStaff({
        type: 'RESERVATION_CANCELLED',
        title: 'Demande retirée par l’adhérent',
        message: slot,
        link: null,
      });
    }

    return cancelled;
  }

  /**
   * Valide ou refuse une demande en attente. Un refus doit toujours être
   * accompagné d'un motif, visible par l'adhérent (R6).
   *
   * @param actor Personne connectée.
   * @param reservationId Demande à traiter.
   * @param decision Validation, ou refus avec son motif.
   */
  async decide(
    actor: Actor | null,
    reservationId: string,
    decision: Decision,
  ): Promise<Reservation> {
    assertCan(actor, 'reservation:decide');

    const reservation = await this.reservations.findById(reservationId);

    if (!reservation) {
      throw notFoundError('Cette demande est introuvable.');
    }

    if (reservation.status !== 'PENDING') {
      throw conflictError('Cette demande a déjà été traitée.');
    }

    const now = this.clock();

    if (reservation.startsAt <= now) {
      await this.expire(reservation, now);
      throw conflictError('Le créneau de cette demande a commencé : elle a expiré.');
    }

    const reason = decision.approve ? null : decision.reason.trim();

    if (!decision.approve && (reason === null || reason.length < MIN_REASON_LENGTH)) {
      throw validationError('Un refus doit être accompagné d’un motif.');
    }

    if (reason && reason.length > MAX_REASON_LENGTH) {
      throw validationError(`Le motif ne doit pas dépasser ${MAX_REASON_LENGTH} caractères.`);
    }

    const updated = await this.reservations.updateStatus(reservation.id, {
      status: decision.approve ? 'CONFIRMED' : 'REJECTED',
      decisionReason: reason,
      decidedAt: now,
    });

    await this.activity.record({
      authorId: actor.id,
      action: decision.approve ? 'RESERVATION_APPROVED' : 'RESERVATION_REJECTED',
      targetType: 'Reservation',
      targetId: reservation.id,
      metadata: { resource: reservation.resource.name, reason },
    });

    if (reservation.userId) {
      await this.notifications.send({
        userId: reservation.userId,
        type: decision.approve ? 'REQUEST_APPROVED' : 'REQUEST_REJECTED',
        title: decision.approve ? 'Demande validée' : 'Demande refusée',
        message: decision.approve
          ? `${reservation.resource.name} · ${formatSlot(reservation.startsAt, reservation.endsAt)}`
          : `${reservation.resource.name} : ${reason}`,
        link: '/reservations',
      });
    }

    return updated;
  }

  /**
   * Annule automatiquement les demandes dont le créneau a commencé sans avoir
   * été validées ni refusées (R8) et prévient les adhérents concernés.
   *
   * @returns Le nombre de demandes expirées.
   */
  async expireStale(): Promise<number> {
    const now = this.clock();
    const stale = await this.reservations.findPendingStartedBefore(now);

    for (const reservation of stale) {
      await this.expire(reservation, now);
    }

    return stale.length;
  }

  /**
   * Liste les réservations de la personne connectée, à venir et passées (EF-07).
   *
   * @param actor Personne connectée.
   */
  async listMine(actor: Actor | null): Promise<ReservationDetails[]> {
    assertCan(actor, 'reservation:create');

    return this.reservations.findByUser(actor.id);
  }

  /**
   * Liste les demandes en attente de validation.
   *
   * @param actor Personne connectée.
   */
  async listPending(actor: Actor | null): Promise<ReservationDetails[]> {
    assertCan(actor, 'reservation:decide');

    return this.reservations.findPending();
  }

  /**
   * Retourne une réservation visible par la personne connectée : la sienne,
   * ou n'importe laquelle pour un gestionnaire.
   *
   * @param actor Personne connectée.
   * @param reservationId Réservation demandée.
   */
  async getVisible(actor: Actor | null, reservationId: string): Promise<ReservationDetails> {
    assertCan(actor, 'reservation:create');

    return this.getOwnedOrManaged(actor, reservationId);
  }

  /**
   * Liste les créneaux déjà pris d'une ressource, sans donnée personnelle.
   *
   * @param resourceId Ressource concernée.
   * @param from Début de la période affichée.
   * @param to Fin de la période affichée.
   */
  async listOccupiedSlots(resourceId: string, from: Date, to: Date): Promise<OccupiedSlot[]> {
    const [reserved, maintenance] = await Promise.all([
      this.reservations.findActiveInRange(resourceId, from, to),
      this.maintenances.findOverlapping(resourceId, from, to),
    ]);

    return [
      ...reserved.map((item) => ({
        startsAt: item.startsAt,
        endsAt: item.endsAt,
        kind: 'reservation' as const,
      })),
      ...maintenance.map((item) => ({
        startsAt: item.startsAt,
        endsAt: item.endsAt,
        kind: 'maintenance' as const,
      })),
    ].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  }

  private async getOwnedOrManaged(
    actor: Actor,
    reservationId: string,
  ): Promise<ReservationDetails> {
    const reservation = await this.reservations.findById(reservationId);

    // Une réservation d'autrui est présentée comme inexistante : on ne révèle pas son existence.
    if (!reservation || (reservation.userId !== actor.id && !can(actor, 'reservation:decide'))) {
      throw notFoundError('Cette réservation est introuvable.');
    }

    return reservation;
  }

  private async assertAvailable(
    request: ReservationRequest,
    category: keyof typeof bufferMinutes,
  ): Promise<void> {
    const bufferMs = bufferMinutes[category] * 60 * 1000;
    const maintenance = await this.maintenances.findOverlapping(
      request.resourceId,
      request.startsAt,
      request.endsAt,
    );

    if (maintenance.length > 0) {
      throw ruleViolationError(
        `La ressource est en maintenance sur ce créneau (${formatSlot(maintenance[0].startsAt, maintenance[0].endsAt)}).`,
      );
    }

    const neighbours = await this.reservations.findActiveInRange(
      request.resourceId,
      new Date(request.startsAt.getTime() - bufferMs),
      new Date(request.endsAt.getTime() + bufferMs),
    );

    if (neighbours.some((other) => slotsConflict(request, other, bufferMs))) {
      throw conflictError('Ce créneau n’est plus disponible. Choisissez un autre horaire.');
    }
  }

  private async expire(reservation: ReservationDetails, now: Date): Promise<void> {
    await this.reservations.updateStatus(reservation.id, { status: 'EXPIRED', decidedAt: now });
    await this.activity.record({
      authorId: SYSTEM_AUTHOR,
      action: 'RESERVATION_EXPIRED',
      targetType: 'Reservation',
      targetId: reservation.id,
      metadata: { resource: reservation.resource.name },
    });

    if (reservation.userId) {
      await this.notifications.send({
        userId: reservation.userId,
        type: 'RESERVATION_EXPIRED',
        title: 'Demande expirée',
        message: `${reservation.resource.name} : aucune décision avant le début du créneau.`,
        link: '/reservations',
      });
    }
  }

  private async notifyStaff(notification: Omit<NewNotification, 'userId'>): Promise<void> {
    const staff = await this.users.findActiveByRoles(['MANAGER', 'ADMIN']);

    await this.notifications.send(...staff.map((user) => ({ ...notification, userId: user.id })));
  }
}
