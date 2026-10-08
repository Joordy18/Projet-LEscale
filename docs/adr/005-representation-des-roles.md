# ADR 005 — Représentation des rôles utilisateur

## Contexte

L'application possède trois rôles fonctionnels :

- `MEMBER` pour les adhérents ;
- `MANAGER` pour les gestionnaires ;
- `ADMIN` pour les administrateurs.

Le modèle de données doit empêcher l'enregistrement de valeurs arbitraires
tout en restant suffisamment simple pour le périmètre actuel. Une table de
rôles dédiée permettrait de gérer des rôles dynamiques, mais ajouterait une
structure et des opérations d'administration qui ne sont pas nécessaires à ce
stade.

## Décision

Le rôle principal est stocké dans la table `User` avec une valeur contrôlée
par un enum PostgreSQL/Prisma :

```text
MEMBER
MANAGER
ADMIN
```

Chaque utilisateur possède un seul rôle principal. Les permissions sont
définies dans le code applicatif et vérifiées côté serveur avant l'exécution
des actions protégées.

Le visiteur n'est pas un rôle enregistré en base : il correspond à l'absence
de session authentifiée. Le champ `isActive` de `User` est un booléen défini
avec la valeur par défaut `true`. Il permet de désactiver un compte sans
supprimer son historique et interdit toute nouvelle utilisation de ce compte.

## Raisons du choix

- le nombre de rôles est limité et connu pour la première version ;
- un enum empêche les valeurs invalides au niveau du schéma ;
- le modèle correspond directement aux règles fonctionnelles ;
- la lecture des permissions est simple ;
- une table supplémentaire n'est pas nécessaire pour gérer des rôles
  actuellement fixes.

## Conséquences positives

- Les données utilisateurs restent simples à comprendre.
- La désactivation conserve l'historique des réservations et des actions.
- Les contrôles de rôle sont cohérents entre PostgreSQL, Prisma et TypeScript.
- Les migrations rendent toute évolution de la liste explicite.
- Le modèle convient aux tests d'autorisation.

## Conséquences et limites

- L'ajout d'un rôle nécessite une migration et une mise à jour du code.
- Un utilisateur ne peut pas recevoir plusieurs rôles indépendants.
- Les permissions ne sont pas administrables dynamiquement depuis l'interface.
- Une évolution vers des rôles ou permissions configurables nécessiterait un
  modèle relationnel dédié.

## Impact sur l'architecture

Le rôle est chargé avec l'utilisateur, puis transmis au contrôle
d'autorisation. Les services ne doivent pas considérer le rôle fourni par
l'interface comme fiable : la session et les droits sont vérifiés côté serveur.
