import type { Metadata } from 'next';
import Link from 'next/link';
import { ActionForm, SubmitButton } from '@/components/form-ui';
import { StatusBadge } from '@/components/status-badge';
import { toURLSearchParams } from '@/lib/controllers/search-params';
import { cancelReservationAction } from '@/lib/controllers/reservation-actions';
import { loadMyReservations } from '@/lib/controllers/reservation-controller';
import { isActiveStatus, type ReservationDetails } from '@/lib/domain/reservation';
import { resourceCategoryLabels } from '@/lib/domain/resource';
import { formatSlot } from '@/lib/domain/time';

export const metadata: Metadata = { title: 'Mes réservations' };

function ReservationItem({
  reservation,
  cancellable,
}: {
  reservation: ReservationDetails;
  cancellable: boolean;
}) {
  return (
    <li className="reservation-item">
      <div>
        <h3>
          <Link href={`/ressources/${reservation.resource.slug}`}>{reservation.resource.name}</Link>
        </h3>
        <p>{formatSlot(reservation.startsAt, reservation.endsAt)}</p>
        <p className="muted">{resourceCategoryLabels[reservation.resource.category]}</p>
        {reservation.decisionReason ? (
          <p>
            <strong>Motif :</strong> {reservation.decisionReason}
          </p>
        ) : null}
      </div>
      <div className="stack">
        <StatusBadge status={reservation.status} />
        {cancellable ? (
          <ActionForm action={cancelReservationAction}>
            <input type="hidden" name="id" value={reservation.id} />
            <SubmitButton variant="secondary" pendingLabel="Annulation…">
              Annuler<span className="sr-only"> la réservation de {reservation.resource.name}</span>
            </SubmitButton>
          </ActionForm>
        ) : null}
      </div>
    </li>
  );
}

/** Réservations à venir et passées de l'adhérent, avec annulation (EF-07). */
export default async function ReservationsPage(props: PageProps<'/reservations'>) {
  const searchParams = toURLSearchParams(await props.searchParams);
  const reservations = await loadMyReservations();
  const now = new Date();
  const upcoming = reservations
    .filter((item) => item.endsAt > now && isActiveStatus(item.status))
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const past = reservations.filter((item) => !upcoming.includes(item));
  const confirmed = reservations.find((item) => item.id === searchParams.get('confirmation'));

  return (
    <div className="container page">
      <h1 className="page-title">Mes réservations</h1>
      <p className="page-lead">
        Retrouvez vos réservations à venir, vos demandes en attente et votre historique.
      </p>

      {searchParams.get('annulation') === 'ok' ? (
        <div className="alert alert-success" role="status">
          La réservation a été annulée.
        </div>
      ) : null}

      {confirmed ? (
        <div className="alert alert-success" role="status">
          {confirmed.status === 'PENDING'
            ? `Votre demande pour « ${confirmed.resource.name} » est enregistrée. Un gestionnaire va la traiter ; vous serez prévenu de sa décision.`
            : `C’est réservé ! « ${confirmed.resource.name} » est confirmée.`}
        </div>
      ) : null}

      <section className="panel" aria-labelledby="titre-venir">
        <h2 id="titre-venir">À venir et en attente</h2>
        {upcoming.length === 0 ? (
          <p className="empty">
            Vous n’avez aucune réservation à venir. <Link href="/">Parcourir le catalogue</Link>
          </p>
        ) : (
          <ul className="list-plain card-list">
            {upcoming.map((reservation) => (
              <ReservationItem key={reservation.id} reservation={reservation} cancellable />
            ))}
          </ul>
        )}
      </section>

      <section className="panel" aria-labelledby="titre-passees">
        <h2 id="titre-passees">Historique</h2>
        {past.length === 0 ? (
          <p className="empty">Aucune réservation passée.</p>
        ) : (
          <ul className="list-plain card-list">
            {past.map((reservation) => (
              <ReservationItem key={reservation.id} reservation={reservation} cancellable={false} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
