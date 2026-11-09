import type { MaintenancePeriod } from '@/lib/domain/maintenance';
import type { Resource, ResourceInput } from '@/lib/domain/resource';
import { getServices } from '@/lib/services';
import type { PhotoUpload } from '@/lib/services/photo';
import { idSchema, maintenanceSchema, resourceSchema } from '@/lib/validations/forms';
import { execute, executeForm, type Result } from './execute';
import { requireUser } from './session';

type ResourceFormInput = ReturnType<typeof resourceSchema.parse>;

function toResourceInput(input: ResourceFormInput): ResourceInput {
  return {
    name: input.name,
    description: input.description,
    category: input.category,
    usageConditions: input.usageConditions,
    capacity: input.capacity ?? null,
    inventoryCode: input.inventoryCode ?? null,
    photoUrl: null,
  };
}

async function readPhoto(formData: FormData): Promise<PhotoUpload | undefined> {
  const file = formData.get('photo');

  if (!(file instanceof File) || file.size === 0) {
    return undefined;
  }

  return { content: new Uint8Array(await file.arrayBuffer()), declaredType: file.type };
}

/** Charge toutes les ressources, archivées comprises, pour la gestion du catalogue. */
export async function loadManagedResources(): Promise<Resource[]> {
  const user = await requireUser('catalogue:manage', '/gestion/ressources');

  return getServices().resources.listForManagement({ id: user.id, role: user.role });
}

/**
 * Charge une ressource et ses maintenances à venir pour la page de gestion.
 *
 * @param id Identifiant de la ressource.
 * @returns La ressource et ses maintenances, ou `null` si elle n'existe pas.
 */
export async function loadManagedResource(
  id: string,
): Promise<{ resource: Resource; maintenances: MaintenancePeriod[] } | null> {
  const user = await requireUser('catalogue:manage', `/gestion/ressources/${id}`);
  const actor = { id: user.id, role: user.role };
  const services = getServices();
  const result = await execute(async () => ({
    resource: await services.resources.getForManagement(actor, id),
    maintenances: await services.maintenances.listUpcoming(actor, id),
  }));

  return result.success ? result.data : null;
}

/**
 * Ajoute une ressource au catalogue (EF-09).
 *
 * @param formData Champs de la ressource et photo facultative.
 */
export function createResource(formData: FormData): Promise<Result<Resource>> {
  return executeForm(resourceSchema, formData, async (actor, input) =>
    getServices().resources.create(actor, toResourceInput(input), await readPhoto(formData)),
  );
}

/**
 * Modifie une ressource (EF-09).
 *
 * @param id Identifiant de la ressource.
 * @param formData Champs de la ressource et nouvelle photo facultative.
 */
export function updateResource(id: string, formData: FormData): Promise<Result<Resource>> {
  return executeForm(resourceSchema, formData, async (actor, input) =>
    getServices().resources.update(actor, id, toResourceInput(input), await readPhoto(formData)),
  );
}

/**
 * Retire une ressource du catalogue ou la rétablit.
 *
 * @param formData Contient `id` et `isActive` (`true` ou `false`).
 */
export function setResourceActive(formData: FormData): Promise<Result<Resource>> {
  const isActive = formData.get('isActive') === 'true';

  return executeForm(idSchema, formData, (actor, { id }) =>
    getServices().resources.setActive(actor, id, isActive),
  );
}

/**
 * Déclare une période de maintenance (EF-10, R5).
 *
 * @param formData Ressource, début, fin et motif.
 */
export function scheduleMaintenance(
  formData: FormData,
): Promise<Result<{ period: MaintenancePeriod; cancelledReservations: number }>> {
  return executeForm(maintenanceSchema, formData, (actor, input) =>
    getServices().maintenances.schedule(actor, input),
  );
}

/**
 * Annule une période de maintenance (RC-07).
 *
 * @param formData Contient l'identifiant `id` de la maintenance.
 */
export function cancelMaintenance(formData: FormData): Promise<Result<void>> {
  return executeForm(idSchema, formData, (actor, { id }) =>
    getServices().maintenances.cancel(actor, id),
  );
}
