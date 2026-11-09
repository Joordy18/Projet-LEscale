import type { Metadata } from 'next';
import { ActionForm, SubmitButton } from '@/components/form-ui';
import { StatusBadge } from '@/components/status-badge';
import { toURLSearchParams } from '@/lib/controllers/search-params';
import { cancelReservationAction } from '@/lib/controllers/reservation-actions';
import { loadUpcomingReservations } from '@/lib/controllers/reservation-controller';
import { resourceCategoryLabels } from '@/lib/domain/resource';
import { formatSlot } from '@/lib/domain/time';

export const metadata: Metadata = { title: 'Réservations à venir' };

/** Réservations à venir de tous les adhérents, avec annulation à tout moment par un gestionnaire (R4). */
export default async function UpcomingReservationsPage(props: PageProps<'/gestion/reservations'>) {
  const searchParams = toURLSearchParams(await props.searchParams);
  const reservations = await loadUpcomingReservations();

  return (
    <div className="container page">
      <h1 className="page-title">Réservations à venir</h1>
      <p className="page-lead">
        Toutes les réservations confirmées et demandes en attente. Un gestionnaire peut annuler une
        réservation à tout moment ; l’adhérent en est prévenu.
      </p>

      {searchParams.get('annulation') === 'ok' ? (
        <div className="alert alert-success" role="status">
          La réservation a été annulée et l’adhérent a été prévenu.
        </div>
      ) : null}

      <section className="panel">
        {reservations.length === 0 ? (
          <p className="empty">Aucune réservation à venir.</p>
        ) : (
          <div className="table-wrap" role="region" aria-label="Réservations à venir" tabIndex={0}>
            <table className="table">
              <caption className="sr-only">Réservations à venir</caption>
              <thead>
                <tr>
                  <th scope="col">Ressource</th>
                  <th scope="col">Adhérent</th>
                  <th scope="col">Créneau</th>
                  <th scope="col">Statut</th>
                  <th scope="col">
                    <span className="sr-only">Action</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {reservations.map((reservation) => (
                  <tr key={reservation.id}>
                    <td>
                      <strong>{reservation.resource.name}</strong>
                      <br />
                      <span className="muted">
                        {resourceCategoryLabels[reservation.resource.category]}
                      </span>
                    </td>
                    <td>
                      {reservation.requester
                        ? `${reservation.requester.firstName} ${reservation.requester.lastName}`
                        : 'Compte supprimé'}
                    </td>
                    <td>{formatSlot(reservation.startsAt, reservation.endsAt)}</td>
                    <td>
                      <StatusBadge status={reservation.status} />
                    </td>
                    <td>
                      <ActionForm action={cancelReservationAction}>
                        <input type="hidden" name="id" value={reservation.id} />
                        <input type="hidden" name="from" value="gestion" />
                        <SubmitButton variant="secondary" pendingLabel="Annulation…">
                          Annuler
                          <span className="sr-only">
                            {' '}
                            la réservation de {reservation.resource.name}
                          </span>
                        </SubmitButton>
                      </ActionForm>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
