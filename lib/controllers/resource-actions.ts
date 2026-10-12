'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { toFormState } from './execute';
import type { FormState } from './form-state';
import {
  cancelMaintenance,
  createResource,
  scheduleMaintenance,
  setResourceActive,
  updateResource,
} from './resource-management-controller';

/**
 * Ajoute une ressource au catalogue (EF-09).
 *
 * @param _previous État précédent du formulaire.
 * @param formData Champs de la ressource et photo facultative.
 */
export async function createResourceAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const result = await createResource(formData);

  if (!result.success) {
    return toFormState(result, '', formData);
  }

  revalidatePath('/', 'layout');
  redirect(`/gestion/ressources/${result.data.id}?creation=1`);
}

/**
 * Modifie une ressource (EF-09).
 *
 * @param id Identifiant de la ressource, fourni par `bind`.
 * @param _previous État précédent du formulaire.
 * @param formData Champs de la ressource et nouvelle photo facultative.
 */
export async function updateResourceAction(
  id: string,
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const result = await updateResource(id, formData);

  revalidatePath('/', 'layout');

  return toFormState(result, 'La ressource a été enregistrée.', formData);
}

/**
 * Retire une ressource du catalogue ou la rétablit (RC-11).
 *
 * @param _previous État précédent du formulaire.
 * @param formData Identifiant de la ressource et état souhaité.
 */
export async function setResourceActiveAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const result = await setResourceActive(formData);

  revalidatePath('/', 'layout');

  return toFormState(
    result,
    formData.get('isActive') === 'true'
      ? 'La ressource est de nouveau proposée.'
      : 'La ressource a été retirée du catalogue.',
  );
}

/**
 * Déclare une période de maintenance (EF-10, R5).
 *
 * @param _previous État précédent du formulaire.
 * @param formData Ressource, début, fin et motif.
 */
export async function scheduleMaintenanceAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const result = await scheduleMaintenance(formData);

  revalidatePath('/', 'layout');

  if (!result.success) {
    return toFormState(result, '', formData);
  }

  const { cancelledReservations } = result.data;

  return toFormState(
    result,
    cancelledReservations > 0
      ? `Maintenance planifiée. ${cancelledReservations} réservation${cancelledReservations > 1 ? 's ont été annulées' : ' a été annulée'} et les adhérents ont été prévenus.`
      : 'Maintenance planifiée.',
  );
}

/**
 * Annule une période de maintenance (RC-07).
 *
 * @param _previous État précédent du formulaire.
 * @param formData Identifiant de la maintenance.
 */
export async function cancelMaintenanceAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const result = await cancelMaintenance(formData);

  revalidatePath('/', 'layout');

  return toFormState(result, 'La maintenance a été annulée.');
}
