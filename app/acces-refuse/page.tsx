import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Accès refusé', robots: { index: false } };

/** Page affichée quand le rôle de la personne connectée ne suffit pas. */
export default function AccessDeniedPage() {
  return (
    <div className="page-narrow">
      <h1 className="page-title">Accès refusé</h1>
      <p className="page-lead">
        Votre rôle ne vous permet pas d’ouvrir cette page. Si vous pensez qu’il s’agit d’une erreur,
        contactez l’équipe de L’Escale.
      </p>
      <Link href="/" className="button button-primary">
        Retour au catalogue
      </Link>
    </div>
  );
}
