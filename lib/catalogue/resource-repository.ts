import { resourceData } from './resource-data';
import type { Resource, ResourceCategory } from './types';

export type ResourceFilters = {
  category?: ResourceCategory;
  query?: string;
};

export interface ResourceRepository {
  findAll(filters?: ResourceFilters): Promise<Resource[]>;
  findBySlug(slug: string): Promise<Resource | null>;
}

export class InMemoryResourceRepository implements ResourceRepository {
  async findAll(filters: ResourceFilters = {}): Promise<Resource[]> {
    const normalizedQuery = filters.query?.trim().toLocaleLowerCase('fr-FR');

    return resourceData.filter((resource) => {
      const matchesCategory = !filters.category || resource.category === filters.category;
      const searchableText = `${resource.name} ${resource.description}`.toLocaleLowerCase('fr-FR');
      const matchesQuery = !normalizedQuery || searchableText.includes(normalizedQuery);

      return matchesCategory && matchesQuery;
    });
  }

  async findBySlug(slug: string): Promise<Resource | null> {
    return resourceData.find((resource) => resource.slug === slug) ?? null;
  }
}
