import type { Resource, ResourceCategory, ResourceInput } from '@/lib/domain/resource';

/** Critères de recherche des ressources. */
export type ResourceFilters = {
  category?: ResourceCategory;
  query?: string;
  isActive?: boolean;
  minCapacity?: number;
};

/** Contrat d'accès aux ressources, indépendant du moteur de stockage. */
export interface ResourceRepository {
  /** Retourne les ressources correspondant aux filtres, triées par nom. */
  findAll(filters?: ResourceFilters): Promise<Resource[]>;
  /** Retourne la ressource portant ce slug, ou `null`. */
  findBySlug(slug: string): Promise<Resource | null>;
  /** Retourne la ressource portant cet identifiant, ou `null`. */
  findById(id: string): Promise<Resource | null>;
  /** Indique si ce slug est déjà utilisé. */
  slugExists(slug: string): Promise<boolean>;
  /** Crée une ressource active. */
  create(slug: string, input: ResourceInput): Promise<Resource>;
  /** Modifie les champs d'une ressource. */
  update(id: string, input: ResourceInput): Promise<Resource>;
  /** Archive ou rétablit une ressource (RC-11). */
  setActive(id: string, isActive: boolean): Promise<Resource>;
}
