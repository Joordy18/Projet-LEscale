import { z } from 'zod';
import { resourceCategories } from './types';

const resourceQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.enum(resourceCategories).optional(),
});

export function parseResourceQuery(searchParams: URLSearchParams) {
  const result = resourceQuerySchema.safeParse({
    q: searchParams.get('q') ?? undefined,
    category: searchParams.get('category') ?? undefined,
  });

  if (!result.success) {
    return { success: false as const, error: 'Les filtres du catalogue sont invalides.' };
  }

  return { success: true as const, data: { query: result.data.q, category: result.data.category } };
}
