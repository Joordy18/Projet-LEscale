import type { Reservation, ReservationDetails } from '@/lib/domain/reservation';
import { getServices } from '@/lib/services';
import { decisionSchema, idSchema, reservationSchema } from '@/lib/validations/forms';
import { execute, executeForm, type Result } from './execute';
import { requireUser } from './session';

/**
 * Annule les demandes dont le créneau a commencé sans décision (R8). Appelée
 * avant d'afficher les listes, en plus de la tâche planifiée, pour que l'état
 * affiché soit toujours à jour.
 */
export async function expireStaleRequests(): Promise<void> {
  try {
    await getServices().reservations.expireStale();
  } catch (error) {
    console.error('Expiration des demandes impossible', error);
  }
}

/**
 * Crée une réservation à partir du formulaire (EF-06).
 *
 * @param formData Ressource, début et fin du créneau.
 */
export function createReservation(formData: FormData): Promise<Result<Reservation>> {
  return executeForm(reservationSchema, formData, (actor, input) =>
    getServices().reservations.reserve(actor, input),
  );
}

/**
 * Annule une réservation (EF-07, R4).
 *
 * @param formData Contient l'identifiant `id` de la réservation.
 */
export function cancelReservation(formData: FormData): Promise<Result<Reservation>> {
  return executeForm(idSchema, formData, (actor, { id }) =>
    getServices().reservations.cancel(actor, id),
  );
}

/**
 * Valide ou refuse une demande (EF-08, R6).
 *
 * @param formData Identifiant de la demande, décision et motif.
 */
export function decideReservation(formData: FormData): Promise<Result<Reservation>> {
  return executeForm(decisionSchema, formData, (actor, input) =>
    getServices().reservations.decide(
      actor,
      input.reservationId,
      input.decision === 'approve'
        ? { approve: true }
        : { approve: false, reason: input.reason ?? '' },
    ),
  );
}

/** Charge les réservations de la personne connectée pour la page « Mes réservations ». */
export async function loadMyReservations(): Promise<ReservationDetails[]> {
  const user = await requireUser('reservation:create', '/reservations');

  await expireStaleRequests();

  return getServices().reservations.listMine({ id: user.id, role: user.role });
}

/** Charge les demandes en attente pour les gestionnaires. */
export async function loadPendingRequests(): Promise<ReservationDetails[]> {
  const user = await requireUser('reservation:decide', '/gestion/demandes');

  await expireStaleRequests();

  return getServices().reservations.listPending({ id: user.id, role: user.role });
}

/**
 * Charge le détail d'une réservation visible par la personne connectée.
 *
 * @param id Identifiant de la réservation.
 * @param returnTo Page à rouvrir après la connexion.
 * @returns La réservation, ou `null` si elle est introuvable ou appartient à un autre adhérent.
 */
export async function loadReservation(
  id: string,
  returnTo: string,
): Promise<ReservationDetails | null> {
  await requireUser('reservation:create', returnTo);
  await expireStaleRequests();

  const result = await execute((actor) => getServices().reservations.getVisible(actor, id));

  return result.success ? result.data : null;
}
