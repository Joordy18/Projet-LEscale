import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getResourceDetail } from '@/lib/controllers/catalogue-controller';
import { getCurrentUser } from '@/lib/controllers/session';
import { categoryRequiresApproval, resourceCategoryLabels } from '@/lib/domain/resource';
import { formatSlot } from '@/lib/domain/time';

export async function generateMetadata(props: PageProps<'/ressources/[slug]'>): Promise<Metadata> {
  const { slug } = await props.params;
  const detail = await getResourceDetail(slug);

  return { title: detail?.resource.name ?? 'Ressource introuvable' };
}

/** Fiche détaillée d'une ressource, accessible sans connexion (EF-04). */
export default async function ResourcePage(props: PageProps<'/ressources/[slug]'>) {
  const { slug } = await props.params;
  const detail = await getResourceDetail(slug);

  if (!detail) {
    notFound();
  }

  const { resource, occupiedSlots } = detail;
  const user = await getCurrentUser();
  const needsApproval = categoryRequiresApproval(resource.category);
  const reservePath = `/ressources/${resource.slug}/reserver`;

  return (
    <div className="container page">
      <nav className="breadcrumb" aria-label="Fil d’Ariane">
        <ol>
          <li>
            <Link href="/">Catalogue</Link>
          </li>
          <li>
            <Link href={`/?category=${resource.category}`}>
              {resourceCategoryLabels[resource.category]}
            </Link>
          </li>
          <li aria-current="page">{resource.name}</li>
        </ol>
      </nav>

      <div className="resource-hero">
        <div className="resource-hero-image">
          {resource.photoUrl ? (
            <Image
              src={resource.photoUrl}
              alt={`Photo de ${resource.name}`}
              fill
              sizes="(max-width: 1000px) 100vw, 55vw"
              priority
              unoptimized={resource.photoUrl.startsWith('/media/')}
            />
          ) : (
            <span className="resource-image-placeholder">Photo à venir</span>
          )}
        </div>
        <div>
          <p className="eyebrow">{resourceCategoryLabels[resource.category].toUpperCase()}</p>
          <h1>{resource.name}</h1>
          <p>{resource.description}</p>
          <p className={`availability ${needsApproval ? 'limited' : ''}`}>
            <span aria-hidden="true" />
            {needsApproval ? 'Sur validation d’un gestionnaire' : 'Réservation directe'}
          </p>
          <div>
            {user ? (
              <Link className="button button-primary" href={reservePath}>
                Réserver cette ressource
              </Link>
            ) : (
              <Link
                className="button button-primary"
                href={`/connexion?next=${encodeURIComponent(reservePath)}`}
              >
                Se connecter pour réserver
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="two-columns">
        <section className="panel" aria-labelledby="titre-infos">
          <h2 id="titre-infos">Informations pratiques</h2>
          <dl className="definition-list">
            <dt>Catégorie</dt>
            <dd>{resourceCategoryLabels[resource.category]}</dd>
            {resource.capacity !== null ? (
              <>
                <dt>{resource.category === 'VEHICLE' ? 'Places' : 'Capacité'}</dt>
                <dd>
                  {resource.capacity}{' '}
                  {resource.category === 'VEHICLE' ? 'places' : 'personnes maximum'}
                </dd>
              </>
            ) : null}
            {resource.inventoryCode ? (
              <>
                <dt>Numéro d’inventaire</dt>
                <dd>{resource.inventoryCode}</dd>
              </>
            ) : null}
            <dt>Réservation</dt>
            <dd>{needsApproval ? 'Soumise à validation' : 'Confirmée immédiatement'}</dd>
          </dl>
          <h3>Conditions d’utilisation</h3>
          <p>{resource.usageConditions}</p>
        </section>

        <section className="panel" aria-labelledby="titre-creneaux">
          <h2 id="titre-creneaux">Créneaux déjà pris</h2>
          <p className="muted">Sur les 30 prochains jours.</p>
          {occupiedSlots.length === 0 ? (
            <p>Aucune réservation : la ressource est libre.</p>
          ) : (
            <ul className="slot-list">
              {occupiedSlots.map((slot) => (
                <li key={`${slot.kind}-${slot.startsAt.toISOString()}`}>
                  <span>{formatSlot(slot.startsAt, slot.endsAt)}</span>
                  <strong>{slot.kind === 'maintenance' ? 'Maintenance' : 'Réservé'}</strong>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
