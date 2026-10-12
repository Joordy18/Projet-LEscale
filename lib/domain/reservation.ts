import type { Resource } from './resource';

export const reservationStatuses = [
  'PENDING',
  'CONFIRMED',
  'REJECTED',
  'CANCELLED',
  'EXPIRED',
] as const;

export type ReservationStatus = (typeof reservationStatuses)[number];

/** Libellés affichés pour chaque statut. */
export const reservationStatusLabels: Record<ReservationStatus, string> = {
  PENDING: 'En attente',
  CONFIRMED: 'Confirmée',
  REJECTED: 'Refusée',
  CANCELLED: 'Annulée',
  EXPIRED: 'Expirée',
};

/** Statuts qui occupent la ressource et comptent dans le quota (R1). */
export const activeStatuses: readonly ReservationStatus[] = ['PENDING', 'CONFIRMED'];

/**
 * Indique si une réservation occupe encore sa ressource.
 *
 * @param status Statut de la réservation.
 */
export function isActiveStatus(status: ReservationStatus): boolean {
  return activeStatuses.includes(status);
}

/** Réservation ou demande de réservation. */
export type Reservation = {
  id: string;
  resourceId: string;
  /** `null` lorsque le compte du demandeur a été supprimé (réservation anonymisée). */
  userId: string | null;
  startsAt: Date;
  endsAt: Date;
  status: ReservationStatus;
  decisionReason: string | null;
  decidedAt: Date | null;
  createdAt: Date;
};

/** Données nécessaires pour créer une réservation. */
export type NewReservation = {
  resourceId: string;
  userId: string;
  startsAt: Date;
  endsAt: Date;
  status: Extract<ReservationStatus, 'PENDING' | 'CONFIRMED'>;
};

/** Réservation enrichie des informations affichées dans les listes. */
export type ReservationDetails = Reservation & {
  resource: Pick<Resource, 'id' | 'slug' | 'name' | 'category' | 'photoUrl'>;
  requester: { id: string; firstName: string; lastName: string; email: string } | null;
};
