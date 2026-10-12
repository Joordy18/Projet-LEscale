'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { toFormState } from './execute';
import type { FormState } from './form-state';
import { cancelReservation, createReservation, decideReservation } from './reservation-controller';

/**
 * Réserve une ressource (EF-06). En cas de succès, la personne est conduite à
 * la page de ses réservations avec la confirmation de sa demande.
 *
 * @param _previous État précédent du formulaire.
 * @param formData Ressource, début et fin du créneau.
 */
export async function reserveAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const result = await createReservation(formData);

  if (!result.success) {
    return toFormState(result, '', formData);
  }

  revalidatePath('/', 'layout');
  redirect(`/reservations?confirmation=${result.data.id}`);
}

/**
 * Annule une réservation (EF-07, R4).
 *
 * @param _previous État précédent du formulaire.
 * @param formData Identifiant de la réservation.
 */
export async function cancelReservationAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const result = await cancelReservation(formData);

  if (!result.success) {
    return toFormState(result, '');
  }

  // La réservation quitte la liste « à venir » : le message est donc affiché par la page, pas par le formulaire.
  revalidatePath('/', 'layout');
  // Un gestionnaire qui annule depuis sa liste y revient ; seule cette destination est acceptée.
  redirect(
    formData.get('from') === 'gestion'
      ? '/gestion/reservations?annulation=ok'
      : '/reservations?annulation=ok',
  );
}

/**
 * Valide ou refuse une demande (EF-08, R6).
 *
 * @param _previous État précédent du formulaire.
 * @param formData Identifiant de la demande, décision et motif.
 */
export async function decideReservationAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const result = await decideReservation(formData);

  if (!result.success) {
    return toFormState(result, '', formData);
  }

  revalidatePath('/', 'layout');
  redirect(
    `/gestion/demandes?decision=${result.data.status === 'CONFIRMED' ? 'validee' : 'refusee'}`,
  );
}
