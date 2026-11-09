import { getServices } from '@/lib/services';
import type { PersonalData } from '@/lib/services/user-service';
import { accountDeletionSchema, passwordChangeSchema } from '@/lib/validations/forms';
import { executeForm, type Result } from './execute';
import { requireUser } from './session';

/** Charge les données personnelles de la personne connectée (EF-03). */
export async function loadMyData(): Promise<PersonalData> {
  const user = await requireUser(undefined, '/mon-compte');

  return getServices().users.getMyData({ id: user.id, role: user.role });
}

/**
 * Change le mot de passe de la personne connectée.
 *
 * @param formData Mot de passe actuel, nouveau mot de passe et confirmation.
 */
export function changeMyPassword(formData: FormData): Promise<Result<void>> {
  return executeForm(passwordChangeSchema, formData, (actor, input) =>
    getServices().users.changeMyPassword(actor, input.currentPassword, input.newPassword),
  );
}

/**
 * Supprime le compte de la personne connectée (EF-03).
 *
 * @param formData Mot de passe, redemandé pour confirmer.
 */
export function deleteMyAccount(formData: FormData): Promise<Result<void>> {
  return executeForm(accountDeletionSchema, formData, (actor, input) =>
    getServices().users.deleteMyAccount(actor, input.password),
  );
}
