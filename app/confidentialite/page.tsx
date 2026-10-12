import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Confidentialité' };

/** Page d'information RGPD : données collectées, finalités, durées et droits. */
export default function PrivacyPage() {
  return (
    <div className="page-narrow prose">
      <h1 className="page-title">Confidentialité et données personnelles</h1>
      <p className="page-lead">
        L’Escale ne collecte que les données nécessaires pour gérer les réservations de ses
        ressources partagées.
      </p>

      <section className="panel" aria-labelledby="titre-collectees">
        <h2 id="titre-collectees">Données collectées</h2>
        <table className="table">
          <caption className="sr-only">
            Données collectées, finalité et durée de conservation
          </caption>
          <thead>
            <tr>
              <th scope="col">Donnée</th>
              <th scope="col">Pourquoi</th>
              <th scope="col">Durée de conservation</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Nom, prénom, adresse e-mail</td>
              <td>Vous identifier et vous prévenir des événements qui vous concernent</td>
              <td>Tant que votre compte existe</td>
            </tr>
            <tr>
              <td>Mot de passe</td>
              <td>Vous connecter. Il est conservé sous forme d’empreinte, jamais en clair.</td>
              <td>Tant que votre compte existe</td>
            </tr>
            <tr>
              <td>Réservations et demandes</td>
              <td>Gérer les créneaux et retrouver l’historique d’une ressource</td>
              <td>Tant que votre compte existe ; anonymisées à la suppression du compte</td>
            </tr>
            <tr>
              <td>Notifications</td>
              <td>Vous informer dans l’application</td>
              <td>Supprimées avec votre compte</td>
            </tr>
            <tr>
              <td>Journal d’activité (auteur, action, date)</td>
              <td>Retrouver qui a réservé, annulé, validé ou modifié quoi</td>
              <td>Un an</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="panel" aria-labelledby="titre-droits">
        <h2 id="titre-droits">Vos droits</h2>
        <p>
          Depuis la page <Link href="/mon-compte">Mon compte</Link>, vous pouvez consulter vos
          données et supprimer votre compte. À la suppression, vos réservations à venir sont
          annulées, vos notifications supprimées et vos réservations passées conservées sans votre
          nom, pour garder les statistiques d’utilisation.
        </p>
        <p>
          Pour toute autre demande (rectification, question), contactez l’équipe depuis la page{' '}
          <Link href="/aide">Aide et contact</Link>.
        </p>
      </section>

      <section className="panel" aria-labelledby="titre-cookies">
        <h2 id="titre-cookies">Cookies</h2>
        <p>
          L’application utilise uniquement un cookie technique de session, nécessaire pour vous
          garder connecté. Il n’y a aucun traceur publicitaire ni outil de mesure d’audience.
        </p>
      </section>
    </div>
  );
}
