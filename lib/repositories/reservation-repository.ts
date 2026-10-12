import type {
  NewReservation,
  Reservation,
  ReservationDetails,
  ReservationStatus,
} from '@/lib/domain/reservation';
import type { ResourceCategory } from '@/lib/domain/resource';

/** Limite de quota à appliquer de façon atomique lors d'une création (R1). */
export type QuotaGuard = { category: ResourceCategory; limit: number; now: Date };

/** Décision prise sur une réservation. */
export type StatusChange = {
  status: Exclude<ReservationStatus, 'PENDING'>;
  decisionReason?: string | null;
  decidedAt: Date;
};

/** Ressource qui a été réservée, avec le nombre de réservations. */
export type ResourceUsage = { resourceId: string; name: string; count: number };

/** Contrat d'accès aux réservations. */
export interface ReservationRepository {
  /**
   * Crée une réservation si l'adhérent n'a pas atteint son quota et si le
   * créneau est libre, de façon atomique (ADR 004).
   *
   * @throws DomainError `RULE_VIOLATION` si le quota est atteint, `CONFLICT` si le créneau est pris.
   */
  createWithQuota(input: NewReservation, quota: QuotaGuard): Promise<Reservation>;
  /** Retourne une réservation avec sa ressource et son demandeur, ou `null`. */
  findById(id: string): Promise<ReservationDetails | null>;
  /** Liste les réservations d'un adhérent, de la plus récente à la plus ancienne. */
  findByUser(userId: string): Promise<ReservationDetails[]>;
  /** Liste les demandes en attente de validation, de la plus proche à la plus lointaine. */
  findPending(): Promise<ReservationDetails[]>;
  /** Compte les réservations à venir et demandes en attente d'un adhérent dans une catégorie. */
  countUpcomingByUser(userId: string, category: ResourceCategory, now: Date): Promise<number>;
  /** Liste les réservations actives d'une ressource qui touchent l'intervalle donné. */
  findActiveInRange(resourceId: string, from: Date, to: Date): Promise<ReservationDetails[]>;
  /** Liste les réservations actives d'un adhérent qui ne sont pas terminées. */
  findUpcomingActiveByUser(userId: string, now: Date): Promise<ReservationDetails[]>;
  /** Liste les demandes en attente dont le créneau a déjà commencé (R8). */
  findPendingStartedBefore(now: Date): Promise<ReservationDetails[]>;
  /** Liste les réservations actives dont le créneau chevauche l'intervalle donné, toutes ressources. */
  findAllActiveInRange(from: Date, to: Date): Promise<ReservationDetails[]>;
  /** Retourne les identifiants des ressources occupées sur l'intervalle donné. */
  findBusyResourceIds(from: Date, to: Date): Promise<string[]>;
  /** Change le statut d'une réservation. */
  updateStatus(id: string, change: StatusChange): Promise<Reservation>;
  /** Classe les ressources les plus réservées depuis une date. */
  topResources(since: Date, limit: number): Promise<ResourceUsage[]>;
}
