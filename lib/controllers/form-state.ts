import type { FieldErrors } from '@/lib/validations/form';

/**
 * État d'un formulaire, utilisé avec `useActionState` : il porte le message de
 * succès ou d'erreur, les erreurs par champ et les valeurs saisies.
 */
export type FormState = {
  status: 'idle' | 'success' | 'error';
  message?: string;
  fieldErrors?: FieldErrors;
  /** Valeurs saisies, renvoyées en cas d'erreur (hors mots de passe). */
  values?: Record<string, string>;
  /** Identifiant de la soumission, pour recréer les champs avec leurs valeurs. */
  submittedAt?: number;
};

export const idleFormState: FormState = { status: 'idle' };
