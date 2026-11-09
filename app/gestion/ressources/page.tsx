import type { Metadata } from 'next';
import Link from 'next/link';
import { loadManagedResources } from '@/lib/controllers/resource-management-controller';
import { resourceCategoryLabels } from '@/lib/domain/resource';

export const metadata: Metadata = { title: 'Gestion des ressources' };

/** Liste de toutes les ressources, archivées comprises (EF-09). */
export default async function ManageResourcesPage() {
  const resources = await loadManagedResources();

  return (
    <div className="container page">
      <h1 className="page-title">Gestion des ressources</h1>
      <p className="page-lead">
        Ajoutez, modifiez ou retirez des ressources et planifiez leurs maintenances.
      </p>

      <p>
        <Link href="/gestion/ressources/nouveau" className="button button-primary">
          Ajouter une ressource
        </Link>
      </p>

      <section className="panel">
        <div className="table-wrap" role="region" aria-label="Toutes les ressources" tabIndex={0}>
          <table className="table">
            <caption className="sr-only">Toutes les ressources</caption>
            <thead>
              <tr>
                <th scope="col">Nom</th>
                <th scope="col">Catégorie</th>
                <th scope="col">Capacité</th>
                <th scope="col">État</th>
                <th scope="col">
                  <span className="sr-only">Action</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {resources.map((resource) => (
                <tr key={resource.id}>
                  <td>
                    <strong>{resource.name}</strong>
                    {resource.inventoryCode ? (
                      <>
                        <br />
                        <span className="muted">N° {resource.inventoryCode}</span>
                      </>
                    ) : null}
                  </td>
                  <td>{resourceCategoryLabels[resource.category]}</td>
                  <td>{resource.capacity ?? '—'}</td>
                  <td>
                    <span
                      className={`status-badge ${resource.isActive ? 'status-confirmed' : 'status-expired'}`}
                    >
                      {resource.isActive ? 'Au catalogue' : 'Retirée'}
                    </span>
                  </td>
                  <td>
                    <Link
                      className="button button-secondary button-small"
                      href={`/gestion/ressources/${resource.id}`}
                    >
                      Gérer<span className="sr-only"> {resource.name}</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
