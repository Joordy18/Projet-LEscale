import Link from 'next/link';

/** Page affichée quand l'adresse demandée n'existe pas. */
export default function NotFound() {
  return (
    <div className="page-narrow">
      <h1 className="page-title">Page introuvable</h1>
      <p className="page-lead">La page que vous cherchez n’existe pas ou n’est plus disponible.</p>
      <Link href="/" className="button button-primary">
        Retour au catalogue
      </Link>
    </div>
  );
}
