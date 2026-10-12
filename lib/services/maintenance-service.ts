import { conflictError, notFoundError, validationError } from '@/lib/domain/errors';
import type { MaintenancePeriod } from '@/lib/domain/maintenance';
import { assertCan } from '@/lib/domain/permissions';
import { formatSlot } from '@/lib/domain/time';
import type { Actor } from '@/lib/domain/user';
import type { MaintenanceRepository } from '@/lib/repositories/maintenance-repository';
import type { ReservationRepository } from '@/lib/repositories/reservation-repository';
import type { ResourceRepository } from '@/lib/repositories/resource-repository';
import type { ActivityService } from './activity-service';
import type { Clock } from './clock';
import type { NotificationService } from './notification-service';

/** Période de maintenance à déclarer. */
export type MaintenanceRequest = {
  resourceId: string;
  startsAt: Date;
  endsAt: Date;
  reason: string;
};

/** Résultat de la déclaration d'une maintenance. */
export type MaintenanceOutcome = { period: MaintenancePeriod; cancelledReservations: number };

/**
 * Service métier des périodes de maintenance (EF-10, R5). Déclarer une
 * maintenance annule les réservations concernées, conservées avec le statut
 * annulé, et prévient les adhérents (RC-06).
 */
export class MaintenanceService {
  /**
   * @param maintenances Repository des maintenances.
   * @param reservations Repository des réservations.
   * @param resources Repository des ressources.
   * @param notifications Service des notifications.
   * @param activity Journal d'activité.
   * @param clock Horloge.
   */
  constructor(
    private readonly maintenances: MaintenanceRepository,
    private readonly reservations: ReservationRepository,
    private readonly resources: ResourceRepository,
    private readonly notifications: NotificationService,
    private readonly activity: ActivityService,
    private readonly clock: Clock,
  ) {}

  /**
   * Déclare une période de maintenance sur une ressource.
   *
   * @param actor Personne connectée.
   * @param request Ressource, période et motif.
   * @throws DomainError si la période est invalide ou chevauche une autre maintenance.
   */
  async schedule(actor: Actor | null, request: MaintenanceRequest): Promise<MaintenanceOutcome> {
    assertCan(actor, 'maintenance:manage');

    const now = this.clock();
    const reason = request.reason.trim();
    const resource = await this.resources.findById(request.resourceId);

    if (!resource) {
      throw notFoundError('Cette ressource est introuvable.');
    }

    if (!(request.startsAt < request.endsAt)) {
      throw validationError('La fin de la maintenance doit être postérieure à son début.');
    }

    if (request.endsAt <= now) {
      throw validationError('La maintenance doit se terminer dans le futur.');
    }

    if (reason.length < 3 || reason.length > 300) {
      throw validationError('Le motif doit contenir entre 3 et 300 caractères.');
    }

    const overlapping = await this.maintenances.findOverlapping(
      resource.id,
      request.startsAt,
      request.endsAt,
    );

    if (overlapping.length > 0) {
      throw conflictError('Une maintenance est déjà planifiée sur une partie de cette période.');
    }

    const period = await this.maintenances.create({
      resourceId: resource.id,
      startsAt: request.startsAt,
      endsAt: request.endsAt,
      reason,
      createdById: actor.id,
    });

    const affected = await this.reservations.findActiveInRange(
      resource.id,
      request.startsAt,
      request.endsAt,
    );

    for (const reservation of affected) {
      await this.reservations.updateStatus(reservation.id, {
        status: 'CANCELLED',
        decisionReason: `Maintenance : ${reason}`,
        decidedAt: now,
      });
      await this.activity.record({
        authorId: actor.id,
        action: 'RESERVATION_CANCELLED',
        targetType: 'Reservation',
        targetId: reservation.id,
        metadata: { resource: resource.name, cause: 'maintenance' },
      });

      if (reservation.userId) {
        await this.notifications.send({
          userId: reservation.userId,
          type: 'RESERVATION_CANCELLED_BY_MAINTENANCE',
          title: 'Réservation annulée pour maintenance',
          message: `${resource.name} · ${formatSlot(reservation.startsAt, reservation.endsAt)}. Motif : ${reason}`,
          link: '/reservations',
        });
      }
    }

    await this.activity.record({
      authorId: actor.id,
      action: 'MAINTENANCE_SCHEDULED',
      targetType: 'MaintenancePeriod',
      targetId: period.id,
      metadata: { resource: resource.name, cancelledReservations: affected.length },
    });

    return { period, cancelledReservations: affected.length };
  }

  /**
   * Annule une période de maintenance. Une maintenance ne se modifie pas : on
   * l'annule puis on en déclare une nouvelle (RC-07). Les réservations déjà
   * annulées ne sont pas rétablies.
   *
   * @param actor Personne connectée.
   * @param id Période à annuler.
   */
  async cancel(actor: Actor | null, id: string): Promise<void> {
    assertCan(actor, 'maintenance:manage');

    const period = await this.maintenances.findById(id);

    if (!period) {
      throw notFoundError('Cette maintenance est introuvable.');
    }

    await this.maintenances.delete(id);
    await this.activity.record({
      authorId: actor.id,
      action: 'MAINTENANCE_CANCELLED',
      targetType: 'MaintenancePeriod',
      targetId: id,
      metadata: { resourceId: period.resourceId },
    });
  }

  /**
   * Liste les maintenances à venir d'une ressource.
   *
   * @param actor Personne connectée.
   * @param resourceId Ressource concernée.
   */
  async listUpcoming(actor: Actor | null, resourceId: string): Promise<MaintenancePeriod[]> {
    assertCan(actor, 'maintenance:manage');

    return this.maintenances.findUpcomingByResource(resourceId, this.clock());
  }
}
