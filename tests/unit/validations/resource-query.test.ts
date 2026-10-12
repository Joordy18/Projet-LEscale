import { describe, expect, it } from 'vitest';
import { parseResourceQuery } from '@/lib/validations/resource-query';

describe('parseResourceQuery', () => {
  it('accepte un mot-clé et une catégorie valides', () => {
    const result = parseResourceQuery(new URLSearchParams({ q: ' salle ', category: 'ROOM' }));

    expect(result).toEqual({ success: true, data: { query: 'salle', category: 'ROOM' } });
  });

  it('accepte une recherche sans filtre', () => {
    const result = parseResourceQuery(new URLSearchParams());

    expect(result).toEqual({ success: true, data: { query: undefined, category: undefined } });
  });

  it('refuse une catégorie inconnue', () => {
    const result = parseResourceQuery(new URLSearchParams({ category: 'JARDIN' }));

    expect(result.success).toBe(false);
  });

  it('refuse un mot-clé de plus de 100 caractères', () => {
    const result = parseResourceQuery(new URLSearchParams({ q: 'a'.repeat(101) }));

    expect(result.success).toBe(false);
  });
});
