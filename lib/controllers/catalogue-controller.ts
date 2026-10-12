import type { Resource } from '@/lib/domain/resource';
import { DAY_MS } from '@/lib/domain/time';
import { getServices } from '@/lib/services';
import type { OccupiedSlot } from '@/lib/services/reservation-service';
import { parseResourceQuery } from '@/lib/validations/resource-query';
import { toFailure, type Result } from './execute';

/** Nombre de jours de disponibilités affichés sur la fiche d'une ressource. */
const OCCUPANCY_DAYS = 30;

/**
 * Contrôleur du catalogue public : valide les filtres reçus puis délègue au
 * service. Le catalogue est accessible sans authentification (EF-04, EF-05).
 *
 * @param searchParams Paramètres de recherche reçus de l'URL.
 */
export async function getCatalogue(
  searchParams: URLSearchParams = new URLSearchParams(),
): Promise<Result<Resource[]>> {
  const parsedQuery = parseResourceQuery(searchParams);

  if (!parsedQuery.success) {
    return parsedQuery;
  }

  try {
    return { success: true, data: await getServices().resources.listCatalogue(parsedQuery.data) };
  } catch (error) {
    return toFailure(error);
  }
}

/** Fiche d'une ressource avec ses créneaux déjà pris. */
export type ResourceDetail = { resource: Resource; occupiedSlots: OccupiedSlot[] };

/**
 * Retourne la fiche d'une ressource du catalogue (EF-04) et les créneaux déjà
 * pris sur les 30 prochains jours, sans donnée personnelle.
 *
 * @param slug Identifiant lisible de la ressource.
 * @returns La fiche, ou `null` si la ressource n'existe pas ou est archivée.
 */
export async function getResourceDetail(slug: string): Promise<ResourceDetail | null> {
  const services = getServices();
  const resource = await services.resources.getCatalogueResource(slug);

  if (!resource) {
    return null;
  }

  const now = new Date();
  const occupiedSlots = await services.reservations.listOccupiedSlots(
    resource.id,
    now,
    new Date(now.getTime() + OCCUPANCY_DAYS * DAY_MS),
  );

  return { resource, occupiedSlots };
}
