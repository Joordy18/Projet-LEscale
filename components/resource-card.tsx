import Image from 'next/image';
import Link from 'next/link';
import {
  categoryRequiresApproval,
  resourceCategoryLabels,
  type Resource,
} from '@/lib/domain/resource';

function describeMeta(resource: Resource): string {
  const parts: string[] = [];

  if (resource.capacity !== null) {
    parts.push(
      resource.category === 'VEHICLE'
        ? `${resource.capacity} places`
        : `${resource.capacity} personnes`,
    );
  }

  parts.push(resource.usageConditions);

  return parts.join(' · ');
}

/** Carte d'une ressource dans le catalogue. */
export function ResourceCard({ resource }: { resource: Resource }) {
  const needsApproval = categoryRequiresApproval(resource.category);

  return (
    <article className="resource-card">
      <div className="resource-image">
        {resource.photoUrl ? (
          <Image
            src={resource.photoUrl}
            alt=""
            fill
            sizes="(max-width: 800px) 100vw, 30vw"
            unoptimized={resource.photoUrl.startsWith('/media/')}
          />
        ) : (
          <span className="resource-image-placeholder">Photo à venir</span>
        )}
      </div>
      <div className="resource-body">
        <p className="resource-category">
          {resourceCategoryLabels[resource.category].toUpperCase()}
        </p>
        <h3>{resource.name}</h3>
        <p className="resource-description">{resource.description}</p>
        <p className={`availability ${needsApproval ? 'limited' : ''}`}>
          <span aria-hidden="true" />
          {needsApproval ? 'Sur validation d’un gestionnaire' : 'Réservation directe'}
        </p>
        <p className="resource-meta">{describeMeta(resource)}</p>
        <Link className="details-button" href={`/ressources/${resource.slug}`}>
          Voir le détail<span className="sr-only"> : {resource.name}</span>
        </Link>
      </div>
    </article>
  );
}
