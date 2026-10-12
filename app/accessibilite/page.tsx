import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Accessibilité' };

/** Déclaration d'accessibilité de l'application. */
export default function AccessibilityPage() {
  return (
    <div className="page-narrow">
      <h1 className="page-title">Accessibilité</h1>
      <p className="page-lead">
        L’Escale s’engage à rendre l’application utilisable par toutes et tous, au clavier comme
        avec un lecteur d’écran.
      </p>

      <section className="panel" aria-labelledby="titre-etat">
        <h2 id="titre-etat">État de conformité</h2>
        <p>
          L’application vise la conformité au niveau AA des WCAG 2.2 sur ses parcours principaux :
          rechercher une ressource, réserver et annuler une réservation. Le RGAA sert de méthode de
          vérification. Aucun audit externe n’a encore été réalisé : l’état de conformité n’est donc
          pas déclaré.
        </p>
        <h3>Ce qui est mis en place</h3>
        <ul>
          <li>
            Navigation complète au clavier, avec un focus visible et un lien « Aller au contenu ».
          </li>
          <li>
            Structure de titres cohérente et repères de page (en-tête, navigation, contenu, pied de
            page).
          </li>
          <li>
            Libellés associés à tous les champs de formulaire, messages d’erreur explicites et
            annoncés.
          </li>
          <li>
            Contrastes de couleurs suffisants ; l’état d’une réservation n’est jamais indiqué par la
            couleur seule.
          </li>
          <li>Interface conçue pour mobile et adaptée aux écrans d’ordinateur.</li>
        </ul>
      </section>

      <section className="panel" aria-labelledby="titre-signaler">
        <h2 id="titre-signaler">Signaler un problème</h2>
        <p>
          Si vous rencontrez une difficulté, contactez l’équipe depuis la page{' '}
          <Link href="/aide">Aide et contact</Link> : nous vous proposerons une alternative, par
          exemple une réservation au comptoir.
        </p>
      </section>
    </div>
  );
}
