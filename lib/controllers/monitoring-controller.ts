import type { ActivityEntry, Notification } from '@/lib/domain/notification';
import { getServices } from '@/lib/services';
import type { DashboardOverview } from '@/lib/services/dashboard-service';
import { execute, type Result } from './execute';
import { expireStaleRequests } from './reservation-controller';
import { getActor, requireUser } from './session';

/** Charge les notifications de la personne connectée (EF-11). */
export async function loadNotifications(): Promise<Notification[]> {
  const user = await requireUser(undefined, '/notifications');

  return getServices().notifications.listMine({ id: user.id, role: user.role });
}

/** Compte les notifications non lues de la personne connectée, 0 pour un visiteur. */
export async function loadUnreadCount(): Promise<number> {
  return getServices().notifications.countUnread(await getActor());
}

/**
 * Marque une notification comme lue.
 *
 * @param id Identifiant de la notification.
 */
export function markNotificationRead(id: string): Promise<Result<void>> {
  return execute((actor) => getServices().notifications.markRead(actor, id));
}

/** Marque toutes les notifications de la personne connectée comme lues. */
export function markAllNotificationsRead(): Promise<Result<void>> {
  return execute((actor) => getServices().notifications.markAllRead(actor));
}

/**
 * Charge une page du journal d'activité (EF-12).
 *
 * @param page Numéro de page, à partir de 1.
 */
export async function loadActivity(page: number): Promise<{
  entries: ActivityEntry[];
  total: number;
  pageSize: number;
  authorNames: Record<string, string>;
}> {
  const user = await requireUser('activity:read', '/gestion/journal');

  return getServices().activity.list({ id: user.id, role: user.role }, page);
}

/** Charge le tableau de bord des gestionnaires (EF-13). */
export async function loadDashboard(): Promise<DashboardOverview> {
  const user = await requireUser('dashboard:read', '/gestion');

  await expireStaleRequests();

  return getServices().dashboard.getOverview({ id: user.id, role: user.role });
}
