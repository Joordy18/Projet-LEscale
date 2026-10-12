import { reservationStatusLabels, type ReservationStatus } from '@/lib/domain/reservation';

/** Pastille de statut d'une réservation. Le texte porte l'information, la couleur la renforce. */
export function StatusBadge({ status }: { status: ReservationStatus }) {
  return (
    <span className={`status-badge status-${status.toLowerCase()}`}>
      {reservationStatusLabels[status]}
    </span>
  );
}
