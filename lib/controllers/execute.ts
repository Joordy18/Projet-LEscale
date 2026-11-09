import type { z } from 'zod';
import { DomainError } from '@/lib/domain/errors';
import type { Actor } from '@/lib/domain/user';
import { formToObject, parseWith, type FieldErrors } from '@/lib/validations/form';
import { type FormState } from './form-state';
import { getActor } from './session';

/** Résultat d'une opération exposée à l'interface. */
export type Result<T> =
  { success: true; data: T } | { success: false; error: string; fieldErrors?: FieldErrors };

/**
 * Convertit une exception en résultat. Les erreurs métier gardent leur message ;
 * toute autre erreur est consignée côté serveur et remplacée par un message
 * générique, pour ne rien révéler de l'implémentation.
 *
 * @param error Exception interceptée.
 */
export function toFailure(error: unknown): { success: false; error: string } {
  if (error instanceof DomainError) {
    return { success: false, error: error.message };
  }

  console.error(error);

  return { success: false, error: 'Une erreur est survenue. Réessayez dans un instant.' };
}

/**
 * Exécute une opération pour la personne connectée en convertissant les
 * erreurs en résultat.
 *
 * @param operation Opération recevant la personne connectée, ou `null` pour un visiteur.
 */
export async function execute<T>(
  operation: (actor: Actor | null) => Promise<T>,
): Promise<Result<T>> {
  try {
    return { success: true, data: await operation(await getActor()) };
  } catch (error) {
    return toFailure(error);
  }
}

/**
 * Valide les données d'un formulaire avec Zod, puis exécute l'opération.
 *
 * @param schema Schéma Zod attendu.
 * @param formData Données du formulaire.
 * @param operation Opération recevant la personne connectée et les données validées.
 */
export async function executeForm<T, I>(
  schema: z.ZodType<I>,
  formData: FormData,
  operation: (actor: Actor | null, input: I, formData: FormData) => Promise<T>,
): Promise<Result<T>> {
  const parsed = parseWith(schema, formToObject(formData));

  if (!parsed.success) {
    return { success: false, error: parsed.error, fieldErrors: parsed.fieldErrors };
  }

  return execute((actor) => operation(actor, parsed.data, formData));
}

/** Champs dont la valeur n'est jamais renvoyée au navigateur après une erreur. */
const secretFields = /password|confirmation/i;

/**
 * Convertit un résultat en état de formulaire. En cas d'erreur, les valeurs
 * saisies sont renvoyées (sauf les mots de passe) pour ne pas obliger à tout
 * ressaisir.
 *
 * @param result Résultat de l'opération.
 * @param successMessage Message affiché en cas de succès.
 * @param formData Données reçues, dont les valeurs sont conservées en cas d'erreur.
 */
export function toFormState(
  result: Result<unknown>,
  successMessage: string,
  formData?: FormData,
): FormState {
  if (result.success) {
    return { status: 'success', message: successMessage, submittedAt: Date.now() };
  }

  const values = formData
    ? Object.fromEntries(
        Object.entries(formToObject(formData)).filter(([name]) => !secretFields.test(name)),
      )
    : undefined;

  return {
    status: 'error',
    message: result.error,
    fieldErrors: result.fieldErrors,
    values,
    submittedAt: Date.now(),
  };
}
