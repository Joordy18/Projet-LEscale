import type { MaintenancePeriod, NewMaintenancePeriod } from '@/lib/domain/maintenance';

/** Contrat d'accès aux périodes de maintenance. */
export interface MaintenanceRepository {
  /** Déclare une période de maintenance. */
  create(input: NewMaintenancePeriod): Promise<MaintenancePeriod>;
  /** Retourne une période, ou `null`. */
  findById(id: string): Promise<MaintenancePeriod | null>;
  /** Liste les périodes d'une ressource qui ne sont pas terminées. */
  findUpcomingByResource(resourceId: string, now: Date): Promise<MaintenancePeriod[]>;
  /** Liste les périodes d'une ressource qui touchent l'intervalle donné. */
  findOverlapping(resourceId: string, from: Date, to: Date): Promise<MaintenancePeriod[]>;
  /** Retourne les identifiants des ressources en maintenance sur l'intervalle donné. */
  findBusyResourceIds(from: Date, to: Date): Promise<string[]>;
  /** Annule une période de maintenance (RC-07). */
  delete(id: string): Promise<void>;
}
