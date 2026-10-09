import {
  InMemoryResourceRepository,
  type ResourceFilters,
  type ResourceRepository,
} from './resource-repository';

const defaultResourceRepository = new InMemoryResourceRepository();

export function createResourceService(repository: ResourceRepository = defaultResourceRepository) {
  return {
    listResources(filters?: ResourceFilters) {
      return repository.findAll(filters);
    },
    getResource(slug: string) {
      return repository.findBySlug(slug);
    },
  };
}

export const resourceService = createResourceService();
