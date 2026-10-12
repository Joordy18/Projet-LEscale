import type { Metadata } from 'next';
import Link from 'next/link';
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from '@/lib/controllers/account-actions';
import { loadNotifications } from '@/lib/controllers/monitoring-controller';
import { formatDateTime } from '@/lib/domain/time';

export const metadata: Metadata = { title: 'Notifications' };

/** Notifications de la personne connectée (EF-11). */
export default async function NotificationsPage() {
  const notifications = await loadNotifications();
  const unread = notifications.filter((notification) => !notification.readAt).length;

  return (
    <div className="page-narrow">
      <h1 className="page-title">Notifications</h1>
      <p className="page-lead">
        {unread > 0
          ? `${unread} notification${unread > 1 ? 's' : ''} non lue${unread > 1 ? 's' : ''}.`
          : 'Tout est à jour.'}
      </p>

      {unread > 0 ? (
        <form action={markAllNotificationsReadAction}>
          <button type="submit" className="button button-secondary button-small">
            Tout marquer comme lu
          </button>
        </form>
      ) : null}

      <section className="panel" style={{ marginTop: 20 }}>
        {notifications.length === 0 ? (
          <p className="empty">Vous n’avez aucune notification.</p>
        ) : (
          <ul className="list-plain card-list">
            {notifications.map((notification) => (
              <li
                key={notification.id}
                className={`notification-item ${notification.readAt ? '' : 'unread'}`}
              >
                <div>
                  <h2 style={{ margin: 0, fontSize: 16 }}>{notification.title}</h2>
                  <p>{notification.message}</p>
                  <p className="muted">{formatDateTime(notification.createdAt)}</p>
                  {notification.link ? <Link href={notification.link}>Ouvrir</Link> : null}
                </div>
                {notification.readAt ? null : (
                  <form action={markNotificationReadAction}>
                    <input type="hidden" name="id" value={notification.id} />
                    <button type="submit" className="button button-secondary button-small">
                      Marquer comme lue
                      <span className="sr-only"> : {notification.title}</span>
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
