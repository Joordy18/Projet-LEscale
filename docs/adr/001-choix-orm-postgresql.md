# ADR 001 — Choix de l'ORM PostgreSQL

## Contexte

L'application L'Escale utilise PostgreSQL pour stocker les données métier :

- utilisateurs et rôles ;
- ressources ;
- réservations ;
- périodes de maintenance.

Le cahier des charges impose l'utilisation de PostgreSQL avec un ORM
compatible TypeScript. Le schéma doit évoluer uniquement par migrations et un
script de seed doit fournir un jeu d'essai complet.

Les deux solutions envisagées sont Prisma et Drizzle.

## Décision

Le projet utilise **Prisma** comme ORM PostgreSQL.

Les éléments suivants seront versionnés dans le dépôt :

- le schéma Prisma ;
- les migrations ;
- le script de seed ;
- la configuration de connexion à PostgreSQL ;
- les repositories utilisant le client Prisma.

## Raisons du choix

Prisma est retenu pour les raisons suivantes :

- génération automatique d'un client fortement typé pour TypeScript ;
- définition centralisée du schéma de données ;
- gestion intégrée des migrations ;
- support d'un script de seed ;
- bonne intégration avec Next.js ;
- réduction du risque d'erreurs entre le modèle de données et le code ;
- prise en main adaptée au périmètre pédagogique du projet.

## Conséquences positives

- Les modèles TypeScript sont générés à partir du schéma Prisma.
- Les migrations sont explicites et peuvent être relues dans Git.
- Le seed facilite l'installation et les tests.
- Les repositories disposent d'une API typée.
- Le modèle relationnel est plus simple à maintenir.

## Conséquences et limites

- Le projet dépend de Prisma et de son client généré.
- Les développeurs doivent connaître le fonctionnement des migrations Prisma.
- Les besoins avancés de concurrence sur les réservations nécessitent une
  migration SQL complémentaire, car Prisma ne permet pas de déclarer
  directement une contrainte `EXCLUDE USING GIST`.
- Cette migration devra activer l'extension PostgreSQL `btree_gist` et pourra
  utiliser du SQL contrôlé via une migration Prisma ou
  `prisma.$executeRaw`.
- Les requêtes MongoDB ne passent pas par Prisma, car MongoDB possède ses
  propres repositories.

## Alternatives écartées

### Drizzle

Drizzle reste une solution compatible avec TypeScript et PostgreSQL. Elle n'est
pas retenue pour ce projet, car Prisma fournit une expérience plus intégrée
pour la génération du client, les migrations et le seed dans le contexte
pédagogique du projet.

### Requêtes SQL directes

Les requêtes SQL directes ne répondent pas au besoin d'un ORM imposé par le
cahier des charges et augmenteraient le risque de duplication et d'erreurs de
typage dans le code applicatif.

## Impact sur l'architecture

Prisma sera utilisé uniquement dans la couche d'accès aux données. Les
services métier ne dépendront pas directement de Prisma : ils utiliseront des
interfaces ou des repositories injectés.

```text
Contrôleurs
    ↓
Services métier
    ↓
Repositories PostgreSQL
    ↓
Prisma Client
    ↓
PostgreSQL
```
