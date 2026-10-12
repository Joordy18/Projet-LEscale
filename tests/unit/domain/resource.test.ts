import { describe, expect, it } from 'vitest';
import { categoryRequiresApproval } from '@/lib/domain/resource';

describe('categoryRequiresApproval', () => {
  it.each(['STUDIO', 'VEHICLE'] as const)(
    'exige une validation pour la catégorie %s',
    (category) => {
      expect(categoryRequiresApproval(category)).toBe(true);
    },
  );

  it.each(['ROOM', 'EQUIPMENT'] as const)(
    "n'exige pas de validation pour la catégorie %s",
    (category) => {
      expect(categoryRequiresApproval(category)).toBe(false);
    },
  );
});
