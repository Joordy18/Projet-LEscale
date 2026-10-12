import { assertCan } from '@/lib/domain/permissions';
import type { ReservationDetails } from '@/lib/domain/reservation';
import { DAY_MS, startOfLocalDay } from '@/lib/domain/time';
import type { Actor } from '@/lib/domain/user';
import type {
  ReservationRepository,
  ResourceUsage,
} from '@/lib/repositories/reservation-repository';
import type { Clock } from './clock';

/** Indicateurs du tableau de bord des gestionnaires (EF-13). */
export type DashboardOverview = {
  pendingRequests: ReservationDetails[];
  todayReservations: ReservationDetails[];
  topResources: ResourceUsage[];
};

/** Nombre de ressources affichées dans le classement. */
const TOP_RESOURCES_LIMIT = 5;

/** Période retenue pour le classement des ressources les plus utilisées, en jours. */
const TOP_RESOURCES_DAYS = 30;

/** Service du tableau de bord des gestionnaires. */
export class DashboardService {
  /**
   * @param reservations Repository des réservations.
   * @param clock Horloge.
   */
  constructor(
    private readonly reservations: ReservationRepository,
    private readonly clock: Clock,
  ) {}

  /**
   * Retourne les demandes en attente, les réservations du jour et les
   * ressources les plus utilisées sur les 30 derniers jours.
   *
   * @param actor Personne connectée.
   */
  async getOverview(actor: Actor | null): Promise<DashboardOverview> {
    assertCan(actor, 'dashboard:read');

    const now = this.clock();
    const dayStart = startOfLocalDay(now);
    const dayEnd = startOfLocalDay(now, 1);
    const [pendingRequests, todayReservations, topResources] = await Promise.all([
      this.reservations.findPending(),
      this.reservations.findAllActiveInRange(dayStart, dayEnd),
      this.reservations.topResources(
        new Date(now.getTime() - TOP_RESOURCES_DAYS * DAY_MS),
        TOP_RESOURCES_LIMIT,
      ),
    ]);

    return { pendingRequests, todayReservations, topResources };
  }
}
