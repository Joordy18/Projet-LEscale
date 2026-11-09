import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ActionForm, Field, SubmitButton } from '@/components/form-ui';
import { signInAction } from '@/lib/controllers/auth-actions';
import { getCurrentUser, safeReturnPath } from '@/lib/controllers/session';

export const metadata: Metadata = { title: 'Connexion' };

const demoAccounts = [
  { label: 'Administrateur', email: 'admin@lescale.test' },
  { label: 'Gestionnaire', email: 'gestionnaire@lescale.test' },
  { label: 'Adhérente', email: 'camille.martin@lescale.test' },
  { label: 'Adhérent', email: 'lucas.bernard@lescale.test' },
];

/** Page de connexion (EF-01). Il n'existe pas d'inscription libre. */
export default async function ConnexionPage(props: PageProps<'/connexion'>) {
  const { next } = await props.searchParams;
  const returnTo = safeReturnPath(Array.isArray(next) ? next[0] : next);

  if (await getCurrentUser()) {
    redirect(returnTo);
  }

  const showDemoAccounts = process.env.SHOW_DEMO_ACCOUNTS === 'true';

  return (
    <div className="page-narrow">
      <h1 className="page-title">Se connecter</h1>
      <p className="page-lead">
        Utilisez le compte que l’équipe de L’Escale vous a communiqué. Les inscriptions se font au
        comptoir.
      </p>

      <section className="panel" aria-labelledby="titre-formulaire">
        <h2 id="titre-formulaire" className="sr-only">
          Formulaire de connexion
        </h2>
        <ActionForm action={signInAction}>
          <input type="hidden" name="next" value={returnTo} />
          <Field
            name="email"
            label="Adresse e-mail"
            type="email"
            autoComplete="username"
            required
          />
          <Field
            name="password"
            label="Mot de passe"
            type="password"
            autoComplete="current-password"
            required
          />
          <SubmitButton pendingLabel="Connexion en cours…">Se connecter</SubmitButton>
        </ActionForm>
      </section>

      {showDemoAccounts ? (
        <section className="panel" aria-labelledby="titre-demo">
          <h2 id="titre-demo">Comptes de démonstration</h2>
          <p className="muted">
            Environnement de démonstration uniquement. Mot de passe commun : voir le fichier README
            du projet.
          </p>
          <ul className="list-plain">
            {demoAccounts.map((account) => (
              <li key={account.email}>
                <strong>{account.label}</strong> : {account.email}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
