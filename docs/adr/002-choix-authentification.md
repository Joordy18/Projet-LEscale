# ADR 002 — Choix de la solution d'authentification

## Contexte

L'application L'Escale doit permettre aux utilisateurs de se connecter et de
se déconnecter. Elle doit également appliquer des droits différents selon le
profil :

- adhérent ;
- gestionnaire ;
- administrateur.

L'inscription libre est exclue du périmètre. Les comptes sont créés ou
importés par l'équipe. Les contrôles d'authentification et d'autorisation
doivent être réalisés côté serveur.

Le cahier des charges impose Auth.js pour l'authentification.

## Décision

Le projet utilise **Auth.js**, intégré à Next.js avec l'App Router.

L'authentification sera complétée par une gestion applicative des rôles et des
permissions. Auth.js gère la session et l'identité authentifiée ; les services
et contrôleurs de l'application vérifient ensuite les droits nécessaires à
chaque action.

Les sessions sont stockées en base avec l'adaptateur Prisma Auth.js. Ce choix
permet d'invalider immédiatement les sessions d'un compte désactivé, sans
attendre l'expiration d'un JWT.

## Raisons du choix

Auth.js est retenu pour les raisons suivantes :

- il s'agit de la solution imposée par le cahier des charges ;
- son intégration avec Next.js et l'App Router est prévue ;
- la session peut être vérifiée côté serveur ;
- les sessions peuvent être invalidées immédiatement lorsqu'un compte est
  désactivé ;
- la solution permet de centraliser la configuration de l'authentification ;
- elle évite de développer un mécanisme de session personnalisé ;
- elle permet de faire évoluer ultérieurement les providers si nécessaire.

## Gestion des rôles

Les rôles fonctionnels sont stockés avec le compte utilisateur :

- `MEMBER` : adhérent ;
- `MANAGER` : gestionnaire ;
- `ADMIN` : administrateur.

Les contrôleurs vérifient le rôle requis avant d'appeler un service. Les
services vérifient également les règles de propriété des données lorsqu'une
action concerne une ressource personnelle, par exemple l'annulation d'une
réservation.

Le masquage d'une fonctionnalité dans l'interface ne constitue pas un contrôle
d'accès.

## Désactivation d'un compte

Le callback `signIn` refuse toute nouvelle connexion lorsque `User.isActive`
vaut `false`. Les contrôles côté serveur vérifient également l'état actif du
compte lors de l'utilisation d'une session. Lorsqu'un compte est désactivé,
ses sessions persistées sont supprimées ou invalidées afin que la règle R7
s'applique immédiatement.

## Conséquences positives

- La solution respecte la contrainte technique du cahier des charges.
- Les sessions peuvent être vérifiées dans les Server Actions et Route
  Handlers.
- La logique d'authentification reste distincte des services métier.
- Les droits peuvent être testés séparément de l'interface.

## Conséquences et limites

- La configuration Auth.js doit être protégée par des variables
  d'environnement.
- Le modèle utilisateur doit rester cohérent entre Auth.js et PostgreSQL.
- Les permissions métier ne doivent pas être déduites uniquement de la session.
- Les tables `Account`, `Session` et éventuellement `VerificationToken`
  nécessaires à l'adaptateur Auth.js doivent être ajoutées au modèle
  PostgreSQL.
- Les flux de récupération ou de modification de compte devront être définis
  si le client les demande.
- La configuration devra être vérifiée lors des évolutions de Next.js et
  d'Auth.js.

## Sécurité attendue

- les mots de passe ne sont jamais stockés en clair ;
- les données d'identification sont validées avec Zod ;
- les secrets ne sont pas versionnés ;
- les sessions sont vérifiées côté serveur ;
- les utilisateurs ne peuvent consulter ou modifier que leurs propres données,
  sauf permission explicite liée à leur rôle ;
- les comptes désactivés ne peuvent plus ouvrir de session ;
- les accès gestionnaire et administrateur sont testés automatiquement.

## Impact sur l'architecture

Auth.js appartient à la couche de contrôle de l'authentification. Les services
métier ne dépendent pas directement de l'interface Next.js.

```text
Présentation
    ↓
Contrôleurs / Server Actions
    ↓
Auth.js : session et identité
    ↓
Permissions et services métier
    ↓
Repositories PostgreSQL
```
