import type { Metadata } from 'next';
import { ActionForm, Field, SubmitButton } from '@/components/form-ui';
import { loadUsers } from '@/lib/controllers/admin-controller';
import {
  changeRoleAction,
  createAccountAction,
  setUserActiveAction,
} from '@/lib/controllers/account-actions';
import { roleLabels, roles } from '@/lib/domain/user';

export const metadata: Metadata = { title: 'Gestion des comptes' };

/** Gestion des comptes et des rôles par l'administrateur (EF-02, R7). */
export default async function AccountsPage() {
  const { users, currentUserId } = await loadUsers();

  return (
    <div className="container page">
      <h1 className="page-title">Gestion des comptes</h1>
      <p className="page-lead">
        Il n’existe pas d’inscription libre : vous créez les comptes et attribuez les rôles.
      </p>

      <div className="two-columns">
        <section className="panel" aria-labelledby="titre-liste">
          <h2 id="titre-liste">Comptes ({users.length})</h2>
          <ul className="list-plain card-list">
            {users.map((user) => (
              <li key={user.id}>
                <p>
                  <strong>
                    {user.firstName} {user.lastName}
                  </strong>{' '}
                  {user.isActive ? null : (
                    <span className="status-badge status-expired">Désactivé</span>
                  )}
                  <br />
                  <span className="muted">{user.email}</span>
                </p>
                <div className="inline-actions">
                  <ActionForm action={changeRoleAction} className="inline-actions">
                    <input type="hidden" name="userId" value={user.id} />
                    <label className="sr-only" htmlFor={`role-${user.id}`}>
                      Rôle de {user.firstName} {user.lastName}
                    </label>
                    <select
                      id={`role-${user.id}`}
                      name="role"
                      className="input"
                      defaultValue={user.role}
                      style={{ width: 'auto' }}
                    >
                      {roles.map((role) => (
                        <option key={role} value={role}>
                          {roleLabels[role]}
                        </option>
                      ))}
                    </select>
                    <SubmitButton variant="secondary" pendingLabel="Enregistrement…">
                      Changer le rôle
                    </SubmitButton>
                  </ActionForm>
                  {user.id === currentUserId ? null : (
                    <ActionForm action={setUserActiveAction}>
                      <input type="hidden" name="userId" value={user.id} />
                      <input
                        type="hidden"
                        name="isActive"
                        value={user.isActive ? 'false' : 'true'}
                      />
                      <SubmitButton variant={user.isActive ? 'danger' : 'primary'}>
                        {user.isActive ? 'Désactiver' : 'Réactiver'}
                        <span className="sr-only">
                          {' '}
                          le compte de {user.firstName} {user.lastName}
                        </span>
                      </SubmitButton>
                    </ActionForm>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel" aria-labelledby="titre-creation">
          <h2 id="titre-creation">Créer un compte</h2>
          <ActionForm action={createAccountAction}>
            <Field name="firstName" label="Prénom" required maxLength={60} autoComplete="off" />
            <Field name="lastName" label="Nom" required maxLength={60} autoComplete="off" />
            <Field name="email" label="Adresse e-mail" type="email" required autoComplete="off" />
            <Field
              name="password"
              label="Mot de passe initial"
              type="password"
              required
              autoComplete="new-password"
              hint="12 caractères au minimum. Communiquez-le à la personne de vive voix."
            />
            <Field name="role" label="Rôle" as="select" required defaultValue="MEMBER">
              {roles.map((role) => (
                <option key={role} value={role}>
                  {roleLabels[role]}
                </option>
              ))}
            </Field>
            <SubmitButton pendingLabel="Création…">Créer le compte</SubmitButton>
          </ActionForm>
        </section>
      </div>
    </div>
  );
}
