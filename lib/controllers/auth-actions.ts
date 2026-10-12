'use server';

import { AuthError } from 'next-auth';
import { redirect } from 'next/navigation';
import { formToObject, parseWith } from '@/lib/validations/form';
import { loginSchema } from '@/lib/validations/forms';
import { signIn, signOut, TOO_MANY_ATTEMPTS_CODE } from './auth';
import type { FormState } from './form-state';
import { safeReturnPath } from './session';

/**
 * Connecte la personne avec son adresse e-mail et son mot de passe (EF-01).
 * Il n'existe pas d'inscription libre : les comptes sont créés par l'administrateur.
 *
 * @param _previous État précédent du formulaire.
 * @param formData Adresse e-mail, mot de passe et page de retour facultative.
 */
export async function signInAction(_previous: FormState, formData: FormData): Promise<FormState> {
  const fields = formToObject(formData);
  const parsed = parseWith(loginSchema, fields);

  if (!parsed.success) {
    return {
      status: 'error',
      message: parsed.error,
      fieldErrors: parsed.fieldErrors,
      values: { email: fields.email ?? '' },
      submittedAt: Date.now(),
    };
  }

  try {
    await signIn('credentials', { ...parsed.data, redirect: false });
  } catch (error) {
    if (
      error instanceof AuthError &&
      (error as { code?: string }).code === TOO_MANY_ATTEMPTS_CODE
    ) {
      return {
        status: 'error',
        message: 'Trop de tentatives de connexion. Patientez quelques minutes avant de réessayer.',
        values: { email: parsed.data.email },
        submittedAt: Date.now(),
      };
    }

    if (error instanceof AuthError) {
      return {
        status: 'error',
        message: 'Adresse e-mail ou mot de passe incorrect, ou compte désactivé.',
        values: { email: parsed.data.email },
        submittedAt: Date.now(),
      };
    }

    throw error;
  }

  redirect(safeReturnPath(fields.next));
}

/** Déconnecte la personne et la ramène au catalogue. */
export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: '/' });
}
