import { conflictError, notFoundError, validationError } from '@/lib/domain/errors';
import { assertCan } from '@/lib/domain/permissions';
import {
  categoryHasCapacity,
  slugify,
  type Resource,
  type ResourceInput,
} from '@/lib/domain/resource';
import type { Actor } from '@/lib/domain/user';
import type { MaintenanceRepository } from '@/lib/repositories/maintenance-repository';
import type { PhotoStorage } from '@/lib/repositories/photo-storage';
import type { ReservationRepository } from '@/lib/repositories/reservation-repository';
import type { ResourceFilters, ResourceRepository } from '@/lib/repositories/resource-repository';
import type { ActivityService } from './activity-service';
import type { Clock } from './clock';
import { validatePhoto, type PhotoUpload } from './photo';

/** Critères de recherche du catalogue public. */
export type CatalogueFilters = Omit<ResourceFilters, 'isActive'> & {
  /** Début de la période de disponibilité recherchée. */
  availableFrom?: Date;
  /** Fin de la période de disponibilité recherchée. */
  availableTo?: Date;
};

const inventoryAlphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Génère le code d'inventaire à 6 caractères d'un équipement sans numéro de série (RC-12). */
function generateInventoryCode(): string {
  return Array.from(
    { length: 6 },
    () => inventoryAlphabet[Math.floor(Math.random() * inventoryAlphabet.length)],
  ).join('');
}

/**
 * Service métier du catalogue : consultation publique (EF-04, EF-05) et
 * gestion des ressources par les gestionnaires (EF-09). Il ne dépend que des
 * contrats de repositories, injectés à la construction.
 */
export class ResourceService {
  /**
   * @param resources Repository des ressources.
   * @param reservations Repository des réservations, pour la recherche par disponibilité.
   * @param maintenances Repository des maintenances, pour la recherche par disponibilité.
   * @param photos Stockage des photos.
   * @param activity Journal d'activité.
   * @param clock Horloge.
   */
  constructor(
    private readonly resources: ResourceRepository,
    private readonly reservations: ReservationRepository,
    private readonly maintenances: MaintenanceRepository,
    private readonly photos: PhotoStorage,
    private readonly activity: ActivityService,
    private readonly clock: Clock,
  ) {}

  /**
   * Liste les ressources proposées dans le catalogue public. Les ressources
   * archivées en sont exclues. Si une période est fournie, seules les
   * ressources libres sur toute cette période sont retournées.
   *
   * @param filters Catégorie, mot-clé, capacité et période facultatifs.
   */
  async listCatalogue(filters: CatalogueFilters = {}): Promise<Resource[]> {
    const { availableFrom, availableTo, ...criteria } = filters;
    const resources = await this.resources.findAll({ ...criteria, isActive: true });

    if (!availableFrom || !availableTo || resources.length === 0) {
      return resources;
    }

    const [reserved, inMaintenance] = await Promise.all([
      this.reservations.findBusyResourceIds(availableFrom, availableTo),
      this.maintenances.findBusyResourceIds(availableFrom, availableTo),
    ]);
    const busy = new Set([...reserved, ...inMaintenance]);

    return resources.filter((resource) => !busy.has(resource.id));
  }

  /**
   * Retourne la fiche d'une ressource du catalogue, ou `null` si elle n'existe
   * pas ou est archivée.
   *
   * @param slug Identifiant lisible de la ressource.
   */
  async getCatalogueResource(slug: string): Promise<Resource | null> {
    const resource = await this.resources.findBySlug(slug);

    return resource?.isActive ? resource : null;
  }

  /**
   * Liste toutes les ressources, archivées comprises, pour la gestion du catalogue.
   *
   * @param actor Personne connectée.
   * @param filters Critères de recherche.
   */
  async listForManagement(actor: Actor | null, filters: ResourceFilters = {}): Promise<Resource[]> {
    assertCan(actor, 'catalogue:manage');

    return this.resources.findAll(filters);
  }

  /**
   * Retourne une ressource par identifiant, archivée ou non, pour la gestion du catalogue.
   *
   * @param actor Personne connectée.
   * @param id Identifiant de la ressource.
   */
  async getForManagement(actor: Actor | null, id: string): Promise<Resource> {
    assertCan(actor, 'catalogue:manage');

    const resource = await this.resources.findById(id);

    if (!resource) {
      throw notFoundError('Cette ressource est introuvable.');
    }

    return resource;
  }

  /**
   * Ajoute une ressource au catalogue (EF-09).
   *
   * @param actor Personne connectée.
   * @param input Champs de la ressource.
   * @param photo Photo facultative.
   */
  async create(actor: Actor | null, input: ResourceInput, photo?: PhotoUpload): Promise<Resource> {
    assertCan(actor, 'catalogue:manage');

    const normalized = this.normalize(input);
    const slug = await this.uniqueSlug(normalized.name);
    const photoUrl = photo ? await this.storePhoto(photo) : null;

    try {
      const resource = await this.resources.create(slug, {
        ...normalized,
        photoUrl,
        inventoryCode: normalized.inventoryCode ?? this.inventoryCodeFor(normalized),
      });

      await this.activity.record({
        authorId: actor.id,
        action: 'RESOURCE_CREATED',
        targetType: 'Resource',
        targetId: resource.id,
        metadata: { name: resource.name },
      });

      return resource;
    } catch (error) {
      if (photoUrl) {
        await this.photos.remove(photoUrl);
      }

      throw error;
    }
  }

  /**
   * Modifie une ressource. Sans nouvelle photo, la photo actuelle est conservée.
   *
   * @param actor Personne connectée.
   * @param id Identifiant de la ressource.
   * @param input Nouveaux champs.
   * @param photo Nouvelle photo facultative.
   */
  async update(
    actor: Actor | null,
    id: string,
    input: ResourceInput,
    photo?: PhotoUpload,
  ): Promise<Resource> {
    assertCan(actor, 'catalogue:manage');

    const existing = await this.getForManagement(actor, id);
    const normalized = this.normalize(input);
    const photoUrl = photo ? await this.storePhoto(photo) : existing.photoUrl;

    try {
      const resource = await this.resources.update(id, {
        ...normalized,
        photoUrl,
        inventoryCode:
          normalized.inventoryCode ?? existing.inventoryCode ?? this.inventoryCodeFor(normalized),
      });

      if (photo && existing.photoUrl) {
        await this.photos.remove(existing.photoUrl);
      }

      await this.activity.record({
        authorId: actor.id,
        action: 'RESOURCE_UPDATED',
        targetType: 'Resource',
        targetId: id,
        metadata: { name: resource.name },
      });

      return resource;
    } catch (error) {
      if (photo && photoUrl) {
        await this.photos.remove(photoUrl);
      }

      throw error;
    }
  }

  /**
   * Retire une ressource du catalogue ou la rétablit. Une ressource retirée est
   * archivée : elle reste visible dans l'historique des réservations (RC-11).
   * Elle ne peut pas être retirée tant que des réservations sont à venir.
   *
   * @param actor Personne connectée.
   * @param id Identifiant de la ressource.
   * @param isActive `false` pour retirer, `true` pour rétablir.
   */
  async setActive(actor: Actor | null, id: string, isActive: boolean): Promise<Resource> {
    assertCan(actor, 'catalogue:manage');

    await this.getForManagement(actor, id);

    if (!isActive) {
      const now = this.clock();
      const horizon = new Date(now.getTime() + 366 * 24 * 60 * 60 * 1000);
      const upcoming = await this.reservations.findActiveInRange(id, now, horizon);

      if (upcoming.length > 0) {
        throw conflictError(
          'Cette ressource a des réservations à venir. Annulez-les ou planifiez une maintenance avant de la retirer.',
        );
      }
    }

    const resource = await this.resources.setActive(id, isActive);

    await this.activity.record({
      authorId: actor.id,
      action: isActive ? 'RESOURCE_RESTORED' : 'RESOURCE_ARCHIVED',
      targetType: 'Resource',
      targetId: id,
      metadata: { name: resource.name },
    });

    return resource;
  }

  private normalize(input: ResourceInput): ResourceInput {
    const name = input.name.trim();
    const description = input.description.trim();
    const usageConditions = input.usageConditions.trim();
    const inventoryCode = input.inventoryCode?.trim().toUpperCase() || null;

    if (!name || !description || !usageConditions) {
      throw validationError(
        'Le nom, la description et les conditions d’utilisation sont obligatoires.',
      );
    }

    if (inventoryCode && !/^[A-Z0-9]{1,50}$/.test(inventoryCode)) {
      throw validationError('Le numéro de série ne peut contenir que 50 lettres ou chiffres.');
    }

    if (categoryHasCapacity(input.category)) {
      if (!input.capacity || input.capacity < 1 || input.capacity > 500) {
        throw validationError('La capacité doit être comprise entre 1 et 500 personnes.');
      }
    }

    return {
      ...input,
      name,
      description,
      usageConditions,
      inventoryCode,
      capacity: categoryHasCapacity(input.category) ? input.capacity : null,
    };
  }

  private inventoryCodeFor(input: ResourceInput): string | null {
    return input.category === 'EQUIPMENT' ? generateInventoryCode() : null;
  }

  private async uniqueSlug(name: string): Promise<string> {
    const base = slugify(name) || 'ressource';
    let candidate = base;

    for (let suffix = 2; await this.resources.slugExists(candidate); suffix += 1) {
      candidate = `${base}-${suffix}`;
    }

    return candidate;
  }

  private async storePhoto(photo: PhotoUpload): Promise<string> {
    const type = validatePhoto(photo);

    return this.photos.save(photo.content, type);
  }
}
