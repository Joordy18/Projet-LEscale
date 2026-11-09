import type { Metadata } from 'next';
import { ActionForm, Field, SubmitButton } from '@/components/form-ui';
import { StatusBadge } from '@/components/status-badge';
import { loadMyData } from '@/lib/controllers/account-controller';
import { changePasswordAction, deleteAccountAction } from '@/lib/controllers/account-actions';
import { formatDateTime, formatSlot } from '@/lib/domain/time';
import { roleLabels } from '@/lib/domain/user';

export const metadata: Metadata = { title: 'Mon compte' };

/** Données personnelles, mot de passe et suppression du compte (EF-03, RGPD). */
export default async function AccountPage() {
  const { profile, reservations, notifications } = await loadMyData();

  return (
    <div className="page-narrow">
      <h1 className="page-title">Mon compte</h1>
      <p className="page-lead">Consultez les données que L’Escale conserve sur vous.</p>

      <section className="panel" aria-labelledby="titre-donnees">
        <h2 id="titre-donnees">Mes données</h2>
        <dl className="definition-list">
          <dt>Prénom</dt>
          <dd>{profile.firstName}</dd>
          <dt>Nom</dt>
          <dd>{profile.lastName}</dd>
          <dt>Adresse e-mail</dt>
          <dd>{profile.email}</dd>
          <dt>Rôle</dt>
          <dd>{roleLabels[profile.role]}</dd>
        </dl>
        <h3>Mes réservations ({reservations.length})</h3>
        {reservations.length === 0 ? (
          <p className="muted">Aucune réservation.</p>
        ) : (
          <ul className="slot-list">
            {reservations.map((reservation) => (
              <li key={reservation.id}>
                <span>
                  {reservation.resource.name} ·{' '}
                  {formatSlot(reservation.startsAt, reservation.endsAt)}
                </span>
                <StatusBadge status={reservation.status} />
              </li>
            ))}
          </ul>
        )}
        <h3>Mes notifications ({notifications.length})</h3>
        <p className="muted">
          {notifications.length === 0
            ? 'Aucune notification.'
            : `La plus récente date du ${formatDateTime(notifications[0].createdAt)}.`}
        </p>
        <p className="muted">
          Pour savoir pourquoi ces données sont collectées et combien de temps elles sont
          conservées, consultez la <a href="/confidentialite">page confidentialité</a>.
        </p>
      </section>

      <section className="panel" aria-labelledby="titre-mdp">
        <h2 id="titre-mdp">Changer mon mot de passe</h2>
        <ActionForm action={changePasswordAction}>
          <Field
            name="currentPassword"
            label="Mot de passe actuel"
            type="password"
            autoComplete="current-password"
            required
          />
          <Field
            name="newPassword"
            label="Nouveau mot de passe"
            type="password"
            autoComplete="new-password"
            required
            hint="12 caractères au minimum."
          />
          <Field
            name="confirmation"
            label="Confirmer le nouveau mot de passe"
            type="password"
            autoComplete="new-password"
            required
          />
          <SubmitButton pendingLabel="Enregistrement…">Changer le mot de passe</SubmitButton>
        </ActionForm>
      </section>

      <section className="panel" aria-labelledby="titre-suppression">
        <h2 id="titre-suppression">Supprimer mon compte</h2>
        <p>
          Vos réservations à venir seront annulées et vos notifications supprimées. Vos réservations
          passées sont conservées sans votre nom, pour les statistiques d’utilisation. Cette action
          est définitive.
        </p>
        <ActionForm action={deleteAccountAction}>
          <Field
            name="password"
            label="Mot de passe, pour confirmer"
            type="password"
            autoComplete="current-password"
            required
          />
          <SubmitButton variant="danger" pendingLabel="Suppression…">
            Supprimer définitivement mon compte
          </SubmitButton>
        </ActionForm>
      </section>
    </div>
  );
}
