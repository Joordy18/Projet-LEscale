import type { Metadata } from 'next';
import Link from 'next/link';
import { loadActivity } from '@/lib/controllers/monitoring-controller';
import { toURLSearchParams } from '@/lib/controllers/search-params';
import { activityActionLabels } from '@/lib/domain/notification';
import { formatDateTime } from '@/lib/domain/time';

export const metadata: Metadata = { title: 'Journal d’activité' };

function describe(metadata: Record<string, string | number | boolean | null>): string {
  return Object.entries(metadata)
    .filter(([, value]) => value !== null && value !== '')
    .map(([key, value]) => `${key} : ${value}`)
    .join(' · ');
}

/** Journal d'activité, du plus récent au plus ancien (EF-12). Conservé un an. */
export default async function ActivityPage(props: PageProps<'/gestion/journal'>) {
  const searchParams = toURLSearchParams(await props.searchParams);
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const { entries, total, pageSize, authorNames } = await loadActivity(page);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="container page">
      <h1 className="page-title">Journal d’activité</h1>
      <p className="page-lead">
        Qui a fait quoi, et quand. Les entrées sont conservées un an puis supprimées
        automatiquement.
      </p>

      <section className="panel">
        {entries.length === 0 ? (
          <p className="empty">Aucune action enregistrée.</p>
        ) : (
          <div className="table-wrap" role="region" aria-label="Actions enregistrées" tabIndex={0}>
            <table className="table">
              <caption className="sr-only">Actions enregistrées</caption>
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Action</th>
                  <th scope="col">Auteur</th>
                  <th scope="col">Cible</th>
                  <th scope="col">Détail</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td>{formatDateTime(entry.createdAt)}</td>
                    <td>{activityActionLabels[entry.action]}</td>
                    <td>
                      {entry.authorId === 'system'
                        ? 'Système'
                        : (authorNames[entry.authorId] ?? 'Compte supprimé')}
                    </td>
                    <td>{entry.targetType}</td>
                    <td>{describe(entry.metadata)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <nav className="pagination" aria-label="Pagination du journal">
          {page > 1 ? (
            <Link href={`/gestion/journal?page=${page - 1}`}>← Plus récentes</Link>
          ) : (
            <span />
          )}
          <span>
            Page {page} sur {pageCount}
          </span>
          {page < pageCount ? (
            <Link href={`/gestion/journal?page=${page + 1}`}>Plus anciennes →</Link>
          ) : (
            <span />
          )}
        </nav>
      </section>
    </div>
  );
}
