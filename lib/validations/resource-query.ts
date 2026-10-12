import { z } from 'zod';
import { resourceCategories } from '@/lib/domain/resource';
import { parseLocalDateTime } from '@/lib/domain/time';

const emptyToUndefined = (value: unknown) => (value === '' || value === null ? undefined : value);

const localDateTime = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .transform((value, context) => {
      const date = parseLocalDateTime(value);

      if (!date) {
        context.addIssue({ code: 'custom', message: 'Date invalide.' });

        return z.NEVER;
      }

      return date;
    })
    .optional(),
);

const resourceQuerySchema = z
  .object({
    q: z.preprocess(emptyToUndefined, z.string().trim().max(100).optional()),
    category: z.preprocess(emptyToUndefined, z.enum(resourceCategories).optional()),
    minCapacity: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).max(500).optional()),
    from: localDateTime,
    to: localDateTime,
  })
  .refine((value) => Boolean(value.from) === Boolean(value.to), {
    message: 'Indiquez le début et la fin de la période.',
  })
  .refine((value) => !value.from || !value.to || value.from < value.to, {
    message: 'La fin de la période doit suivre son début.',
  });

/**
 * Valide les paramètres de recherche du catalogue.
 *
 * @param searchParams Paramètres `q`, `category`, `minCapacity`, `from` et `to` de l'URL.
 * @returns Les filtres validés, ou un message d'erreur sans détail technique.
 */
export function parseResourceQuery(searchParams: URLSearchParams) {
  const result = resourceQuerySchema.safeParse({
    q: searchParams.get('q') ?? undefined,
    category: searchParams.get('category') ?? undefined,
    minCapacity: searchParams.get('minCapacity') ?? undefined,
    from: searchParams.get('from') ?? undefined,
    to: searchParams.get('to') ?? undefined,
  });

  if (!result.success) {
    return { success: false as const, error: 'Les filtres du catalogue sont invalides.' };
  }

  const { q, category, minCapacity, from, to } = result.data;

  return {
    success: true as const,
    data: { query: q, category, minCapacity, availableFrom: from, availableTo: to },
  };
}
