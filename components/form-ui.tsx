'use client';

import {
  createContext,
  useActionState,
  useContext,
  useEffect,
  useId,
  useRef,
  type ReactNode,
} from 'react';
import { useFormStatus } from 'react-dom';
import { idleFormState, type FormState } from '@/lib/controllers/form-state';

const FormStateContext = createContext<FormState>(idleFormState);

type ActionFormProps = {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  children: ReactNode;
  className?: string;
};

/**
 * Formulaire relié à une Server Action. Il affiche le message de résultat dans
 * une zone annoncée par les lecteurs d'écran et y place le focus, et il
 * transmet aux champs leurs erreurs et les valeurs saisies.
 */
export function ActionForm({ action, children, className }: ActionFormProps) {
  const [state, formAction] = useActionState(action, idleFormState);
  const messageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.status !== 'idle') {
      messageRef.current?.focus();
    }
  }, [state]);

  return (
    <FormStateContext value={state}>
      <form action={formAction} className={className}>
        {state.status !== 'idle' && state.message ? (
          <div
            ref={messageRef}
            tabIndex={-1}
            role={state.status === 'error' ? 'alert' : 'status'}
            className={`alert alert-${state.status}`}
          >
            {state.message}
          </div>
        ) : null}
        {children}
      </form>
    </FormStateContext>
  );
}

type FieldProps = {
  name: string;
  label: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'datetime-local' | 'file' | 'search';
  as?: 'input' | 'textarea' | 'select';
  required?: boolean;
  hint?: string;
  defaultValue?: string | number | null;
  autoComplete?: string;
  accept?: string;
  min?: number | string;
  max?: number | string;
  maxLength?: number;
  rows?: number;
  children?: ReactNode;
};

/**
 * Champ de formulaire accessible : le libellé est associé au champ, l'aide et
 * l'erreur sont reliées par `aria-describedby`, et l'erreur est signalée par
 * `aria-invalid`.
 */
export function Field({
  name,
  label,
  type = 'text',
  as = 'input',
  required = false,
  hint,
  defaultValue,
  autoComplete,
  accept,
  min,
  max,
  maxLength,
  rows = 4,
  children,
}: FieldProps) {
  const state = useContext(FormStateContext);
  const id = useId();
  const error = state.fieldErrors?.[name];
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null]
    .filter(Boolean)
    .join(' ');
  const value = state.values?.[name] ?? (defaultValue === null ? undefined : defaultValue);
  const common = {
    id,
    name,
    required,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy || undefined,
    className: 'input',
  };
  // Un nouveau `key` recrée le champ avec les valeurs renvoyées par le serveur.
  const fieldKey = state.submittedAt ?? 'initial';

  return (
    <div className="field">
      <label htmlFor={id}>
        {label}
        {required ? <span className="required"> (obligatoire)</span> : null}
      </label>
      {hint ? (
        <p id={`${id}-hint`} className="hint">
          {hint}
        </p>
      ) : null}
      {as === 'textarea' ? (
        <textarea
          key={fieldKey}
          {...common}
          rows={rows}
          maxLength={maxLength}
          defaultValue={value ?? ''}
        />
      ) : as === 'select' ? (
        <select key={fieldKey} {...common} defaultValue={value ?? ''}>
          {children}
        </select>
      ) : (
        <input
          key={fieldKey}
          {...common}
          type={type}
          autoComplete={autoComplete}
          accept={accept}
          min={min}
          max={max}
          maxLength={maxLength}
          defaultValue={type === 'password' || type === 'file' ? undefined : (value ?? '')}
        />
      )}
      {error ? (
        <p id={`${id}-error`} className="field-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

type SubmitButtonProps = {
  children: ReactNode;
  pendingLabel?: string;
  variant?: 'primary' | 'secondary' | 'danger';
};

/** Bouton d'envoi, désactivé pendant le traitement pour éviter les doubles envois. */
export function SubmitButton({
  children,
  pendingLabel = 'Envoi en cours…',
  variant = 'primary',
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className={`button button-${variant}`}
      disabled={pending}
      aria-busy={pending}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
