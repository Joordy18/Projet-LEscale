import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Aide et contact' };

/** Aide sur le fonctionnement des réservations et coordonnées de l'équipe. */
export default function HelpPage() {
  return (
    <div className="page-narrow">
      <h1 className="page-title">Aide et contact</h1>
      <p className="page-lead">Tout ce qu’il faut savoir pour réserver.</p>

      <section className="panel" aria-labelledby="titre-fonctionnement">
        <h2 id="titre-fonctionnement">Comment ça marche</h2>
        <ol>
          <li>
            <Link href="/">Parcourez le catalogue</Link> : filtrez par catégorie, mot-clé, capacité
            ou période.
          </li>
          <li>
            Ouvrez la fiche d’une ressource pour voir ses conditions et ses créneaux déjà pris.
          </li>
          <li>
            Connectez-vous, choisissez un créneau et validez. Le studio et le véhicule sont réservés
            après validation d’un gestionnaire ; le reste est confirmé immédiatement.
          </li>
          <li>
            Retrouvez vos réservations dans <Link href="/reservations">Mes réservations</Link>.
          </li>
        </ol>
      </section>

      <section className="panel" aria-labelledby="titre-regles">
        <h2 id="titre-regles">Les règles</h2>
        <ul>
          <li>
            Trois réservations à venir au maximum par catégorie, demandes en attente comprises.
          </li>
          <li>
            Une salle ou le studio : 4 heures au maximum. Le matériel et le véhicule : 3 jours.
          </li>
          <li>Réservation possible jusqu’à 30 jours à l’avance.</li>
          <li>
            Annulation possible jusqu’à 24 heures avant le début ; ensuite, contactez l’équipe.
          </li>
          <li>Salles et studio ouverts du lundi au samedi, de 8 h à 20 h.</li>
        </ul>
      </section>

      <section className="panel" aria-labelledby="titre-contact">
        <h2 id="titre-contact">Contacter l’équipe</h2>
        <p>
          Les comptes sont créés par l’équipe : l’inscription se fait au comptoir. Pour toute
          question, passez au comptoir de L’Escale (du lundi au samedi, de 8 h à 20 h) ou écrivez à{' '}
          <a href="mailto:contact@lescale.example">contact@lescale.example</a>.
        </p>
      </section>
    </div>
  );
}
