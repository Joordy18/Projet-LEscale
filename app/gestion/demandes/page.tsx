import type { Metadata } from 'next';
import Link from 'next/link';
import { toURLSearchParams } from '@/lib/controllers/search-params';
import { loadPendingRequests } from '@/lib/controllers/reservation-controller';
import { resourceCategoryLabels } from '@/lib/domain/resource';
import { formatSlot } from '@/lib/domain/time';

export const metadata: Metadata = { title: 'Demandes à traiter' };

/** Liste des demandes en attente de validation (EF-08). */
export default async function RequestsPage(props: PageProps<'/gestion/demandes'>) {
  const searchParams = toURLSearchParams(await props.searchParams);
  const requests = await loadPendingRequests();
  const decision = searchParams.get('decision');

  return (
    <div className="container page">
      <h1 className="page-title">Demandes à traiter</h1>
      <p className="page-lead">
        Validez ou refusez les demandes de studio et de véhicule. Une demande non traitée avant le
        début du créneau est annulée automatiquement.
      </p>

      {decision ? (
        <div className="alert alert-success" role="status">
          La demande a été {decision === 'validee' ? 'validée' : 'refusée'} et l’adhérent a été
          prévenu.
        </div>
      ) : null}

      <section className="panel">
        {requests.length === 0 ? (
          <p className="empty">Aucune demande en attente.</p>
        ) : (
          <div className="table-wrap" role="region" aria-label="Demandes en attente" tabIndex={0}>
            <table className="table">
              <caption className="sr-only">Demandes en attente de validation</caption>
              <thead>
                <tr>
                  <th scope="col">Ressource</th>
                  <th scope="col">Demandeur</th>
                  <th scope="col">Créneau</th>
                  <th scope="col">Demandée le</th>
                  <th scope="col">
                    <span className="sr-only">Action</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={request.id}>
                    <td>
                      <strong>{request.resource.name}</strong>
                      <br />
                      <span className="muted">
                        {resourceCategoryLabels[request.resource.category]}
                      </span>
                    </td>
                    <td>
                      {request.requester
                        ? `${request.requester.firstName} ${request.requester.lastName}`
                        : 'Compte supprimé'}
                    </td>
                    <td>{formatSlot(request.startsAt, request.endsAt)}</td>
                    <td>
                      {new Intl.DateTimeFormat('fr-FR', {
                        dateStyle: 'short',
                        timeZone: 'Europe/Paris',
                      }).format(request.createdAt)}
                    </td>
                    <td>
                      <Link
                        className="button button-secondary button-small"
                        href={`/gestion/demandes/${request.id}`}
                      >
                        Traiter
                        <span className="sr-only"> la demande de {request.resource.name}</span>
                      </Link>
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
