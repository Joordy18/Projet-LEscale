import type { Metadata } from 'next';
import Link from 'next/link';
import { loadDashboard } from '@/lib/controllers/monitoring-controller';
import { formatSlot } from '@/lib/domain/time';

export const metadata: Metadata = { title: 'Tableau de bord' };

/** Tableau de bord des gestionnaires : demandes, réservations du jour, ressources les plus utilisées (EF-13). */
export default async function DashboardPage() {
  const { pendingRequests, todayReservations, topResources } = await loadDashboard();

  return (
    <div className="container page">
      <h1 className="page-title">Tableau de bord</h1>
      <p className="page-lead">L’activité de L’Escale en un coup d’œil.</p>

      <div className="stat-grid">
        <section className="panel" aria-labelledby="titre-demandes">
          <h2 id="titre-demandes">Demandes en attente</h2>
          <p className="stat-number">{pendingRequests.length}</p>
          <p>
            <Link href="/gestion/demandes">Traiter les demandes</Link>
          </p>
        </section>
        <section className="panel" aria-labelledby="titre-jour">
          <h2 id="titre-jour">Réservations du jour</h2>
          <p className="stat-number">{todayReservations.length}</p>
        </section>
      </div>

      <section className="panel" aria-labelledby="titre-programme">
        <h2 id="titre-programme">Programme du jour</h2>
        {todayReservations.length === 0 ? (
          <p className="empty">Aucune réservation aujourd’hui.</p>
        ) : (
          <ul className="slot-list">
            {todayReservations.map((reservation) => (
              <li key={reservation.id}>
                <span>
                  <strong>{reservation.resource.name}</strong> ·{' '}
                  {formatSlot(reservation.startsAt, reservation.endsAt)}
                </span>
                <span className="muted">
                  {reservation.requester
                    ? `${reservation.requester.firstName} ${reservation.requester.lastName}`
                    : 'Compte supprimé'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel" aria-labelledby="titre-top">
        <h2 id="titre-top">Ressources les plus utilisées (30 derniers jours)</h2>
        {topResources.length === 0 ? (
          <p className="empty">Pas encore de réservation confirmée.</p>
        ) : (
          <ol>
            {topResources.map((usage) => (
              <li key={usage.resourceId}>
                {usage.name} : {usage.count} réservation{usage.count > 1 ? 's' : ''}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
