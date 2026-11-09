import { z } from 'zod';

/** Messages d'erreur par champ, prêts à être affichés sous les champs du formulaire. */
export type FieldErrors = Record<string, string>;

/** Résultat d'une validation : les données typées, ou un message et les erreurs par champ. */
export type ParseResult<T> =
  { success: true; data: T } | { success: false; error: string; fieldErrors: FieldErrors };

/**
 * Convertit un `FormData` en objet de chaînes. Les fichiers et les champs
 * internes de React (`$ACTION_…`) sont ignorés.
 *
 * @param formData Données reçues d'un formulaire.
 */
export function formToObject(formData: FormData): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, value] of formData.entries()) {
    if (typeof value === 'string' && !key.startsWith('$ACTION_')) {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Valide une entrée avec un schéma Zod. Toutes les données qui viennent du
 * client passent par cette fonction avant d'être utilisées.
 *
 * @param schema Schéma attendu.
 * @param input Données non fiables.
 */
export function parseWith<T>(schema: z.ZodType<T>, input: unknown): ParseResult<T> {
  const result = schema.safeParse(input);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const fieldErrors: FieldErrors = {};

  for (const issue of result.error.issues) {
    const field = String(issue.path[0] ?? '_');

    fieldErrors[field] ??= issue.message;
  }

  return {
    success: false,
    error: 'Certains champs sont invalides. Corrigez-les puis réessayez.',
    fieldErrors,
  };
}

/** Champ texte obligatoire, sans espaces superflus. */
export const requiredText = (label: string, max: number) =>
  z
    .string({ error: `${label} est obligatoire.` })
    .trim()
    .min(1, `${label} est obligatoire.`)
    .max(max, `${label} ne doit pas dépasser ${max} caractères.`);

/** Champ texte facultatif : une chaîne vide devient `undefined`. */
export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Ce champ ne doit pas dépasser ${max} caractères.`)
    .transform((value) => value || undefined)
    .optional();
