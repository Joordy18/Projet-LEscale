import { z } from 'zod';
import { resourceCategories } from '@/lib/domain/resource';
import { parseLocalDateTime } from '@/lib/domain/time';
import { MIN_PASSWORD_LENGTH, roles } from '@/lib/domain/user';
import { optionalText, requiredText } from './form';

const uuid = z.uuid('Identifiant invalide.');

const localDateTime = (label: string) =>
  z.string({ error: `${label} est obligatoire.` }).transform((value, context) => {
    const date = parseLocalDateTime(value);

    if (!date) {
      context.addIssue({ code: 'custom', message: `${label} est invalide.` });

      return z.NEVER;
    }

    return date;
  });

const password = z
  .string({ error: 'Le mot de passe est obligatoire.' })
  .min(
    MIN_PASSWORD_LENGTH,
    `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`,
  )
  .max(200, 'Le mot de passe est trop long.');

/** Formulaire de connexion (EF-01). */
export const loginSchema = z.object({
  email: z.email('Saisissez une adresse e-mail valide.').max(254),
  password: z.string().min(1, 'Le mot de passe est obligatoire.').max(200),
});

/** Formulaire de réservation (EF-06). */
export const reservationSchema = z.object({
  resourceId: uuid,
  startsAt: localDateTime('Le début'),
  endsAt: localDateTime('La fin'),
});

/** Formulaire de décision sur une demande (EF-08, R6). */
export const decisionSchema = z
  .object({
    reservationId: uuid,
    decision: z.enum(['approve', 'reject'], { error: 'Choisissez une décision.' }),
    reason: optionalText(500),
  })
  .refine((value) => value.decision === 'approve' || (value.reason?.length ?? 0) >= 3, {
    path: ['reason'],
    message: 'Un refus doit être accompagné d’un motif.',
  });

/** Formulaire de création ou de modification d'une ressource (EF-09). */
export const resourceSchema = z.object({
  name: requiredText('Le nom', 100),
  description: requiredText('La description', 1000),
  category: z.enum(resourceCategories, { error: 'Choisissez une catégorie.' }),
  usageConditions: requiredText('Les conditions d’utilisation', 300),
  capacity: z.preprocess(
    (value) => (value === '' || value === undefined ? undefined : value),
    z.coerce
      .number({ error: 'La capacité doit être un nombre.' })
      .int('La capacité doit être un nombre entier.')
      .min(1, 'La capacité doit être comprise entre 1 et 500.')
      .max(500, 'La capacité doit être comprise entre 1 et 500.')
      .optional(),
  ),
  inventoryCode: optionalText(50),
});

/** Formulaire de déclaration de maintenance (EF-10). */
export const maintenanceSchema = z.object({
  resourceId: uuid,
  startsAt: localDateTime('Le début'),
  endsAt: localDateTime('La fin'),
  reason: requiredText('Le motif', 300),
});

/** Formulaire de création de compte (EF-02). */
export const accountSchema = z.object({
  firstName: requiredText('Le prénom', 60),
  lastName: requiredText('Le nom', 60),
  email: z.email('Saisissez une adresse e-mail valide.').max(254),
  password,
  role: z.enum(roles, { error: 'Choisissez un rôle.' }),
});

/** Changement de rôle d'un compte (EF-02). */
export const roleChangeSchema = z.object({ userId: uuid, role: z.enum(roles) });

/** Activation ou désactivation d'un compte (R7). */
export const activationSchema = z.object({
  userId: uuid,
  isActive: z.enum(['true', 'false']).transform((value) => value === 'true'),
});

/** Changement de mot de passe de la personne connectée. */
export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, 'Le mot de passe actuel est obligatoire.').max(200),
    newPassword: password,
    confirmation: z.string(),
  })
  .refine((value) => value.newPassword === value.confirmation, {
    path: ['confirmation'],
    message: 'La confirmation ne correspond pas au nouveau mot de passe.',
  });

/** Confirmation de suppression de compte (EF-03). */
export const accountDeletionSchema = z.object({
  password: z.string().min(1, 'Le mot de passe est obligatoire.').max(200),
});

/** Identifiant seul, pour les actions qui portent sur un élément. */
export const idSchema = z.object({ id: uuid });
