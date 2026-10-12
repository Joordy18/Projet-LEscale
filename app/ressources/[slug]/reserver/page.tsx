import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ActionForm, Field, SubmitButton } from '@/components/form-ui';
import { getResourceDetail } from '@/lib/controllers/catalogue-controller';
import { reserveAction } from '@/lib/controllers/reservation-actions';
import { requireUser } from '@/lib/controllers/session';
import {
  MAX_ADVANCE_DAYS,
  MAX_UPCOMING_PER_CATEGORY,
  MIN_CANCEL_NOTICE_HOURS,
} from '@/lib/domain/reservation-rules';
import { categoryRequiresApproval } from '@/lib/domain/resource';
import { formatSlot } from '@/lib/domain/time';

export const metadata: Metadata = { title: 'Réserver' };

/** Formulaire de réservation d'une ressource (EF-06). */
export default async function ReservePage(props: PageProps<'/ressources/[slug]/reserver'>) {
  const { slug } = await props.params;

  await requireUser('reservation:create', `/ressources/${slug}/reserver`);

  const detail = await getResourceDetail(slug);

  if (!detail) {
    notFound();
  }

  const { resource, occupiedSlots } = detail;
  const needsApproval = categoryRequiresApproval(resource.category);
  const durationRule =
    resource.category === 'ROOM' || resource.category === 'STUDIO'
      ? '4 heures au maximum, entre 8 h et 20 h, du lundi au samedi'
      : '3 jours au maximum';

  return (
    <div className="container page">
      <nav className="breadcrumb" aria-label="Fil d’Ariane">
        <ol>
          <li>
            <Link href="/">Catalogue</Link>
          </li>
          <li>
            <Link href={`/ressources/${resource.slug}`}>{resource.name}</Link>
          </li>
          <li aria-current="page">Réserver</li>
        </ol>
      </nav>

      <h1 className="page-title">Préparer votre réservation</h1>
      <p className="page-lead">{resource.name}</p>

      <div className="two-columns">
        <section className="panel" aria-labelledby="titre-creneau">
          <h2 id="titre-creneau">Choisir un créneau</h2>
          <ActionForm action={reserveAction}>
            <input type="hidden" name="resourceId" value={resource.id} />
            <div className="form-grid">
              <Field name="startsAt" label="Début" type="datetime-local" required />
              <Field name="endsAt" label="Fin" type="datetime-local" required />
            </div>
            <p className="muted">
              {needsApproval
                ? 'Cette ressource est réservée après validation d’un gestionnaire : votre demande sera en attente jusqu’à sa décision.'
                : 'Cette ressource est confirmée immédiatement si le créneau est libre.'}
            </p>
            <div className="inline-actions">
              <SubmitButton pendingLabel="Vérification du créneau…">
                {needsApproval ? 'Envoyer la demande' : 'Confirmer la réservation'}
              </SubmitButton>
              <Link href={`/ressources/${resource.slug}`} className="button button-secondary">
                Annuler
              </Link>
            </div>
          </ActionForm>
        </section>

        <div>
          <section className="panel" aria-labelledby="titre-regles">
            <h2 id="titre-regles">Règles à connaître</h2>
            <ul>
              <li>Durée : {durationRule}.</li>
              <li>Délai : pas plus de {MAX_ADVANCE_DAYS} jours à l’avance.</li>
              <li>
                Quota : {MAX_UPCOMING_PER_CATEGORY} réservations à venir par catégorie, demandes en
                attente comprises.
              </li>
              <li>
                Annulation : jusqu’à {MIN_CANCEL_NOTICE_HOURS} heures avant le début, ensuite
                contactez un gestionnaire.
              </li>
            </ul>
          </section>
          <section className="panel" aria-labelledby="titre-pris">
            <h2 id="titre-pris">Créneaux déjà pris</h2>
            {occupiedSlots.length === 0 ? (
              <p>Aucun créneau pris sur les 30 prochains jours.</p>
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
    </div>
  );
}
