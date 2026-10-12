import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ActionForm, Field } from '@/components/form-ui';
import { StatusBadge } from '@/components/status-badge';
import { decideReservationAction } from '@/lib/controllers/reservation-actions';
import { loadReservation } from '@/lib/controllers/reservation-controller';
import { requireUser } from '@/lib/controllers/session';
import { resourceCategoryLabels } from '@/lib/domain/resource';
import { formatDateTime, formatSlot } from '@/lib/domain/time';

export const metadata: Metadata = { title: 'Détail d’une demande' };

/** Détail d'une demande avec validation ou refus motivé (EF-08, R6). */
export default async function RequestDetailPage(props: PageProps<'/gestion/demandes/[id]'>) {
  const { id } = await props.params;

  await requireUser('reservation:decide', `/gestion/demandes/${id}`);

  const request = await loadReservation(id, `/gestion/demandes/${id}`);

  if (!request) {
    notFound();
  }

  const pending = request.status === 'PENDING';

  return (
    <div className="container page">
      <nav className="breadcrumb" aria-label="Fil d’Ariane">
        <ol>
          <li>
            <Link href="/gestion/demandes">Demandes</Link>
          </li>
          <li aria-current="page">{request.resource.name}</li>
        </ol>
      </nav>

      <h1 className="page-title">Demande : {request.resource.name}</h1>

      <div className="two-columns">
        <section className="panel" aria-labelledby="titre-demande">
          <h2 id="titre-demande">Informations</h2>
          <dl className="definition-list">
            <dt>Statut</dt>
            <dd>
              <StatusBadge status={request.status} />
            </dd>
            <dt>Ressource</dt>
            <dd>
              {request.resource.name} ({resourceCategoryLabels[request.resource.category]})
            </dd>
            <dt>Demandeur</dt>
            <dd>
              {request.requester
                ? `${request.requester.firstName} ${request.requester.lastName} (${request.requester.email})`
                : 'Compte supprimé'}
            </dd>
            <dt>Créneau</dt>
            <dd>{formatSlot(request.startsAt, request.endsAt)}</dd>
            <dt>Demandée le</dt>
            <dd>{formatDateTime(request.createdAt)}</dd>
            {request.decisionReason ? (
              <>
                <dt>Motif</dt>
                <dd>{request.decisionReason}</dd>
              </>
            ) : null}
          </dl>
        </section>

        <section className="panel" aria-labelledby="titre-decision">
          <h2 id="titre-decision">Décision</h2>
          {pending ? (
            <ActionForm action={decideReservationAction}>
              <input type="hidden" name="reservationId" value={request.id} />
              <Field
                name="reason"
                label="Motif du refus"
                as="textarea"
                rows={4}
                maxLength={500}
                hint="Obligatoire en cas de refus. Le motif est visible par l’adhérent."
              />
              <div className="inline-actions">
                <button
                  type="submit"
                  name="decision"
                  value="approve"
                  className="button button-primary"
                >
                  Valider la demande
                </button>
                <button
                  type="submit"
                  name="decision"
                  value="reject"
                  className="button button-danger"
                >
                  Refuser la demande
                </button>
              </div>
            </ActionForm>
          ) : (
            <p>Cette demande a déjà été traitée.</p>
          )}
        </section>
      </div>
    </div>
  );
}
