'use server';

import { revalidatePath } from 'next/cache';
import { signOut } from './auth';
import { changeMyPassword, deleteMyAccount } from './account-controller';
import { changeRole, createAccount, setUserActive } from './admin-controller';
import { toFormState } from './execute';
import type { FormState } from './form-state';
import { markAllNotificationsRead, markNotificationRead } from './monitoring-controller';

/**
 * Crée un compte (EF-02).
 *
 * @param _previous État précédent du formulaire.
 * @param formData Identité, mot de passe initial et rôle.
 */
export async function createAccountAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const result = await createAccount(formData);

  revalidatePath('/admin/comptes');

  return toFormState(result, 'Le compte a été créé.', formData);
}

/**
 * Change le rôle d'un compte (EF-02).
 *
 * @param _previous État précédent du formulaire.
 * @param formData Identifiant du compte et nouveau rôle.
 */
export async function changeRoleAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const result = await changeRole(formData);

  revalidatePath('/admin/comptes');

  return toFormState(result, 'Le rôle a été modifié.');
}

/**
 * Active ou désactive un compte (EF-02, R7).
 *
 * @param _previous État précédent du formulaire.
 * @param formData Identifiant du compte et état souhaité.
 */
export async function setUserActiveAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const result = await setUserActive(formData);

  revalidatePath('/', 'layout');

  return toFormState(
    result,
    formData.get('isActive') === 'true'
      ? 'Le compte a été réactivé.'
      : 'Le compte a été désactivé et ses réservations à venir sont annulées.',
  );
}

/**
 * Change le mot de passe de la personne connectée.
 *
 * @param _previous État précédent du formulaire.
 * @param formData Mot de passe actuel, nouveau mot de passe et confirmation.
 */
export async function changePasswordAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const result = await changeMyPassword(formData);

  return toFormState(result, 'Votre mot de passe a été modifié.', formData);
}

/**
 * Supprime le compte de la personne connectée (EF-03), puis la déconnecte.
 *
 * @param _previous État précédent du formulaire.
 * @param formData Mot de passe, redemandé pour confirmer.
 */
export async function deleteAccountAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const result = await deleteMyAccount(formData);

  if (!result.success) {
    return toFormState(result, '', formData);
  }

  await signOut({ redirectTo: '/?compte=supprime' });

  return toFormState(result, 'Votre compte a été supprimé.');
}

/**
 * Marque une notification comme lue.
 *
 * @param formData Contient l'identifiant `id` de la notification.
 */
export async function markNotificationReadAction(formData: FormData): Promise<void> {
  await markNotificationRead(String(formData.get('id') ?? ''));
  revalidatePath('/', 'layout');
}

/** Marque toutes les notifications de la personne connectée comme lues. */
export async function markAllNotificationsReadAction(): Promise<void> {
  await markAllNotificationsRead();
  revalidatePath('/', 'layout');
}
