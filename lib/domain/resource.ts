/**
 * Catégories de ressources proposées par L'Escale.
 *
 * La liste est fixe (dossier d'analyse, Q-08 et Q-09) : elle n'est pas
 * administrable depuis l'application.
 */
export const resourceCategories = ['ROOM', 'STUDIO', 'VEHICLE', 'EQUIPMENT'] as const;

export type ResourceCategory = (typeof resourceCategories)[number];

/** Libellés affichés pour chaque catégorie. */
export const resourceCategoryLabels: Record<ResourceCategory, string> = {
  ROOM: 'Salle',
  STUDIO: 'Studio',
  VEHICLE: 'Véhicule',
  EQUIPMENT: 'Matériel',
};

/** Ressource réservable, telle que décrite dans le modèle de données. */
export type Resource = {
  id: string;
  slug: string;
  name: string;
  category: ResourceCategory;
  description: string;
  usageConditions: string;
  photoUrl: string | null;
  capacity: number | null;
  /** Numéro de série ou code d'inventaire d'un équipement (RC-12). */
  inventoryCode: string | null;
  isActive: boolean;
};

/** Champs modifiables d'une ressource par un gestionnaire. */
export type ResourceInput = Omit<Resource, 'id' | 'slug' | 'isActive'>;

const categoriesRequiringApproval: ReadonlySet<ResourceCategory> = new Set(['STUDIO', 'VEHICLE']);

/**
 * Indique si une réservation dans cette catégorie doit être validée par un
 * gestionnaire (besoin B05 : studio et véhicule).
 *
 * @param category Catégorie de la ressource.
 * @returns `true` si la réservation est d'abord une demande en attente.
 */
export function categoryRequiresApproval(category: ResourceCategory): boolean {
  return categoriesRequiringApproval.has(category);
}

/**
 * Indique si la capacité (nombre de personnes ou de places) a un sens pour
 * cette catégorie.
 *
 * @param category Catégorie de la ressource.
 */
export function categoryHasCapacity(category: ResourceCategory): boolean {
  return category !== 'EQUIPMENT';
}

/**
 * Construit l'identifiant lisible d'une ressource à partir de son nom.
 *
 * @param name Nom de la ressource.
 * @returns Un texte en minuscules, sans accent, séparé par des tirets.
 */
export function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}
