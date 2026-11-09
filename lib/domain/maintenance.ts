/** Période pendant laquelle une ressource n'est pas réservable (R5). */
export type MaintenancePeriod = {
  id: string;
  resourceId: string;
  startsAt: Date;
  endsAt: Date;
  reason: string;
  createdById: string;
  createdAt: Date;
};

/** Données nécessaires pour déclarer une maintenance. */
export type NewMaintenancePeriod = Omit<MaintenancePeriod, 'id' | 'createdAt'>;
