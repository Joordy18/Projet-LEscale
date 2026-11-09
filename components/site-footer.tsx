import Link from 'next/link';

/** Pied de page avec les pages d'information légales. */
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <span>L’Escale · Réservation de ressources partagées</span>
        <nav aria-label="Informations légales">
          <Link href="/accessibilite">Accessibilité</Link>
          <Link href="/confidentialite">Confidentialité</Link>
          <Link href="/aide">Contact</Link>
        </nav>
      </div>
    </footer>
  );
}
