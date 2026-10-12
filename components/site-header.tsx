import Link from 'next/link';
import { signOutAction } from '@/lib/controllers/auth-actions';
import { getCurrentUser } from '@/lib/controllers/session';
import { loadUnreadCount } from '@/lib/controllers/monitoring-controller';
import { can } from '@/lib/domain/permissions';
import { roleLabels } from '@/lib/domain/user';

function initials(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();
}

/** Marque de L'Escale, lien vers le catalogue. */
function Brand() {
  return (
    <Link className="brand" href="/" aria-label="L’Escale, accueil">
      <span className="brand-mark" aria-hidden="true">
        ▤
      </span>
      <span>
        <strong>L’Escale</strong>
        <small>RESSOURCES PARTAGÉES</small>
      </span>
    </Link>
  );
}

/** Barre de navigation, adaptée au rôle de la personne connectée. */
export async function SiteHeader() {
  const user = await getCurrentUser();
  const actor = user ? { id: user.id, role: user.role } : null;
  const unread = user ? await loadUnreadCount() : 0;

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Brand />
        <nav className="site-nav" aria-label="Navigation principale">
          <Link href="/">Catalogue</Link>
          {user ? <Link href="/reservations">Mes réservations</Link> : null}
          {can(actor, 'reservation:decide') ? <Link href="/gestion/demandes">Demandes</Link> : null}
          {can(actor, 'catalogue:manage') ? (
            <Link href="/gestion/ressources">Ressources</Link>
          ) : null}
          {can(actor, 'dashboard:read') ? <Link href="/gestion">Tableau de bord</Link> : null}
          {can(actor, 'activity:read') ? <Link href="/gestion/journal">Journal</Link> : null}
          {can(actor, 'user:manage') ? <Link href="/admin/comptes">Comptes</Link> : null}
          <Link href="/aide">Aide et contact</Link>
        </nav>
        <div className="site-account">
          {user ? (
            <>
              <Link
                href="/notifications"
                className="icon-link"
                aria-label={
                  unread > 0
                    ? `Notifications, ${unread} non lue${unread > 1 ? 's' : ''}`
                    : 'Notifications'
                }
              >
                <span aria-hidden="true">🔔</span>
                {unread > 0 ? <span className="count-badge">{unread}</span> : null}
              </Link>
              <Link href="/mon-compte" className="profile-link">
                <span className="avatar" aria-hidden="true">
                  {initials(user.firstName, user.lastName)}
                </span>
                <span className="profile-text">
                  <strong>
                    {user.firstName} {user.lastName}
                  </strong>
                  <small>{roleLabels[user.role]}</small>
                </span>
              </Link>
              <form action={signOutAction}>
                <button type="submit" className="button button-secondary button-small">
                  Se déconnecter
                </button>
              </form>
            </>
          ) : (
            <Link href="/connexion" className="button button-primary button-small">
              Se connecter
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

/** Version du bandeau affichée pendant le chargement de la session. */
export function SiteHeaderFallback() {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Brand />
      </div>
    </header>
  );
}
