# ADR 006 — Stratégie de tests automatisés

## Contexte

Les règles de réservation, les contrôles d'accès et les parcours utilisateur
doivent être vérifiés à plusieurs niveaux. Un seul type de test ne permet pas
de couvrir à la fois les règles métier, les interactions avec les bases et le
fonctionnement visible dans le navigateur.

Le cahier des charges prévoit l'utilisation de Vitest et de Playwright.

## Décision

La validation automatisée est organisée en trois niveaux complémentaires :

- **tests unitaires avec Vitest** pour les services métier, les validations et
  les permissions, avec des repositories simulés lorsque cela est pertinent ;
- **tests d'intégration avec Vitest** pour les repositories, les transactions
  et les contrôles nécessitant PostgreSQL ou MongoDB ;
- **tests end-to-end avec Playwright** pour les parcours principaux dans
  l'application, notamment la connexion, la réservation, l'annulation et le
  traitement d'une demande.
- **tests de sécurité** pour vérifier les refus d'accès, notamment lorsqu'un
  adhérent tente d'annuler la réservation d'un autre utilisateur ou d'accéder
  à une fonctionnalité réservée aux gestionnaires.

Chaque règle métier R1 à R8 doit être couverte par au moins un test
automatisé. Les scénarios de droits doivent inclure les accès autorisés et
refusés.

## Raisons du choix

- séparation claire entre comportement métier, persistance et interface ;
- feedback rapide grâce aux tests unitaires ;
- vérification réelle des contraintes et de la concurrence avec les bases ;
- validation des parcours utilisateurs dans un navigateur ;
- outils cohérents avec les exigences du cahier des charges et TypeScript.

## Conséquences positives

- Les régressions sont détectées à différents niveaux.
- Les services indépendants de Next.js restent faciles à tester.
- Les règles d'autorisation sont testées sans dépendre uniquement de l'interface.
- Les parcours critiques sont vérifiés avant une livraison.

## Conséquences et limites

- Les tests d'intégration et end-to-end nécessitent un environnement de bases
  disponible.
- Les tests Playwright sont plus longs et plus sensibles à l'environnement.
- Les données de test doivent être isolées et réinitialisées de manière fiable.
- La CI devra exécuter les suites avec les services nécessaires.

## Organisation prévue

```text
tests/
  unit/
  integration/
  security/
  e2e/
```

Les tests doivent rester déterministes, ne pas utiliser de données
personnelles réelles et expliciter les conditions nécessaires à leur
exécution.
