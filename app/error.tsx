'use client';

/** Page affichée quand une erreur inattendue se produit pendant l'affichage. */
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="page-narrow" role="alert">
      <h1 className="page-title">Une erreur est survenue</h1>
      <p className="page-lead">
        Le service est momentanément indisponible. Réessayez dans un instant ; si le problème
        persiste, prévenez l’équipe de L’Escale.
      </p>
      <button type="button" className="button button-primary" onClick={reset}>
        Réessayer
      </button>
    </div>
  );
}
