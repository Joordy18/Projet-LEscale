import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ActionForm, Field, SubmitButton } from '@/components/form-ui';
import { ResourceForm } from '@/components/resource-form';
import { toURLSearchParams } from '@/lib/controllers/search-params';
import {
  cancelMaintenanceAction,
  scheduleMaintenanceAction,
  setResourceActiveAction,
  updateResourceAction,
} from '@/lib/controllers/resource-actions';
import { loadManagedResource } from '@/lib/controllers/resource-management-controller';
import { formatSlot } from '@/lib/domain/time';

export const metadata: Metadata = { title: 'Gérer une ressource' };

/** Modification, retrait et maintenances d'une ressource (EF-09, EF-10). */
export default async function ManageResourcePage(props: PageProps<'/gestion/ressources/[id]'>) {
  const { id } = await props.params;
  const searchParams = toURLSearchParams(await props.searchParams);
  const data = await loadManagedResource(id);

  if (!data) {
    notFound();
  }

  const { resource, maintenances } = data;

  return (
    <div className="container page">
      <nav className="breadcrumb" aria-label="Fil d’Ariane">
        <ol>
          <li>
            <Link href="/gestion/ressources">Ressources</Link>
          </li>
          <li aria-current="page">{resource.name}</li>
        </ol>
      </nav>

      <h1 className="page-title">{resource.name}</h1>

      {searchParams.get('creation') ? (
        <div className="alert alert-success" role="status">
          La ressource a été créée.
        </div>
      ) : null}

      <div className="two-columns">
        <div>
          <section className="panel" aria-labelledby="titre-modifier">
            <h2 id="titre-modifier">Informations</h2>
            <ResourceForm
              action={updateResourceAction.bind(null, resource.id)}
              resource={resource}
              submitLabel="Enregistrer les modifications"
            />
          </section>
        </div>

        <div>
          <section className="panel" aria-labelledby="titre-etat">
            <h2 id="titre-etat">Présence au catalogue</h2>
            <p>
              {resource.isActive
                ? 'Cette ressource est proposée aux adhérents. La retirer l’archive : elle reste visible dans l’historique des réservations.'
                : 'Cette ressource est retirée du catalogue.'}
            </p>
            <ActionForm action={setResourceActiveAction}>
              <input type="hidden" name="id" value={resource.id} />
              <input type="hidden" name="isActive" value={resource.isActive ? 'false' : 'true'} />
              <SubmitButton variant={resource.isActive ? 'danger' : 'primary'}>
                {resource.isActive ? 'Retirer du catalogue' : 'Rétablir au catalogue'}
              </SubmitButton>
            </ActionForm>
          </section>

          <section className="panel" aria-labelledby="titre-maintenance">
            <h2 id="titre-maintenance">Maintenance</h2>
            <p className="muted">
              Pendant une maintenance, la ressource ne peut pas être réservée. Les réservations
              existantes sur la période sont annulées et les adhérents prévenus.
            </p>
            <ActionForm action={scheduleMaintenanceAction}>
              <input type="hidden" name="resourceId" value={resource.id} />
              <Field name="startsAt" label="Début" type="datetime-local" required />
              <Field name="endsAt" label="Fin" type="datetime-local" required />
              <Field name="reason" label="Motif" required maxLength={300} />
              <SubmitButton pendingLabel="Planification…">Planifier la maintenance</SubmitButton>
            </ActionForm>

            <h3>Maintenances à venir</h3>
            {maintenances.length === 0 ? (
              <p className="muted">Aucune maintenance planifiée.</p>
            ) : (
              <ul className="list-plain card-list">
                {maintenances.map((maintenance) => (
                  <li key={maintenance.id}>
                    <p>
                      <strong>{formatSlot(maintenance.startsAt, maintenance.endsAt)}</strong>
                      <br />
                      {maintenance.reason}
                    </p>
                    <ActionForm action={cancelMaintenanceAction}>
                      <input type="hidden" name="id" value={maintenance.id} />
                      <SubmitButton variant="secondary" pendingLabel="Annulation…">
                        Annuler cette maintenance
                      </SubmitButton>
                    </ActionForm>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
