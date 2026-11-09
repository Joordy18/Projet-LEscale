# Planning du projet L'Escale

## 1. Objet du document

Ce document présente l'organisation prévisionnelle du projet L'Escale, une
application web de réservation de ressources partagées. Il reprend les étapes,
les jalons et les livrables définis dans le cahier des charges.

Le projet est suivi avec une méthode Kanban dans GitHub Projects. Les tâches
sont organisées dans quatre colonnes :

- À faire ;
- En cours ;
- En revue ;
- Terminé.

Pour limiter la dispersion, le nombre de tâches en cours ne doit pas dépasser
deux simultanément.

Ce planning est prévisionnel. Il sera mis à jour au fur et à mesure de
l'avancement afin de comparer le travail prévu au travail réellement réalisé.

## 2. Planning global

| Période          | Étape                 | Objectif                                        | Travail prévu                                                                                     | Résultat attendu                                       |
| ---------------- | --------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| J1-J2            | Tutoriel Next.js      | Prendre en main l'environnement technique       | Étudier Next.js, l'App Router, les composants et les bases du framework                           | Environnement fonctionnel et bases techniques acquises |
| J2-J3            | Analyse et conception | Comprendre et formaliser le besoin              | Rédiger les user stories, identifier les acteurs, concevoir les données et l'architecture         | Dossier d'analyse et dossier de conception             |
| J3-J5            | Socle applicatif      | Obtenir une première application fonctionnelle  | Mettre en place l'authentification, les rôles, le catalogue et l'architecture en couches          | Première démonstration fonctionnelle                   |
| J5 à mi-décembre | Réservations          | Implémenter le cœur métier                      | Développer les réservations, les règles métier, l'annulation et la validation par un gestionnaire | Réservations fonctionnelles et tests unitaires         |
| J6-J7            | Suivi de l'activité   | Tracer les actions et informer les utilisateurs | Ajouter les notifications, le journal d'activité et les tests de sécurité                         | Suivi d'activité fonctionnel                           |
| J7-J8            | Déploiement           | Préparer la mise en recette                     | Déployer l'application, documenter le déploiement et finaliser la sécurité                        | Version de recette et documentation                    |
| J9               | Évaluation            | Finaliser et présenter le projet                | Créer le tag `v1.0`, préparer la soutenance et présenter le bilan                                 | Version évaluée et soutenance                          |

## 3. Étapes et jalons GitHub

Dans GitHub, les milestones servent à regrouper les issues qui appartiennent à
une même période de travail. Ils peuvent représenter une étape du planning ou
un jalon d'évaluation. Les jalons d'évaluation officiels sont signalés dans la
colonne « Nature ».

| Milestone GitHub             | Période          | Contenu                                                                                             | Nature                                      | État                 |
| ---------------------------- | ---------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------- | -------------------- |
| J1-J2 Tutoriel Next.js       | J1-J2            | Cours d'introduction et tutoriel officiel Next.js                                                   | Étape de travail                            | En cours             |
| J2-J3 Analyse et conception  | J2-J3            | Analyse des besoins, user stories, maquettes, modèle de données, architecture, Docker Compose et CI | Remise de livrables au J3                   | En cours             |
| J3-J5 Démonstration du socle | J3-J5            | Authentification, rôles, catalogue et mise en place des couches                                     | Jalon officiel 1 : démonstration au J5      | Prêt                 |
| Mi-décembre Étape 3          | J5 à mi-décembre | Réservations, règles métier, validation gestionnaire et tests unitaires                             | Jalon officiel 2 : pull request « Étape 3 » | Réalisé (à intégrer) |
| J8 Préparation finale        | J7-J8            | Déploiement, documentation, tests finaux et préparation de la soutenance                            | Étape de finalisation                       | À faire              |
| J9 Version v1.0              | J9               | Gel du code, tag `v1.0` et soutenance                                                               | Jalon officiel 3 : évaluation finale        | À faire              |

## 4. Livrables et échéances

| Livrable                     | Contenu attendu                                                                                              | Échéance                                | État     |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------- | -------- |
| Dossier d'analyse            | User stories, critères d'acceptation, cas d'utilisation, questions client, hypothèses, maquettes et parcours | J3 puis mise à jour continue            | En cours |
| Dossier de conception        | Modèles de données, diagrammes, architecture, ADR et éco-conception                                          | J3 puis mise à jour continue            | En cours |
| Code source                  | Application, migrations, seed, Docker Compose et variables d'environnement                                   | J9                                      | À faire  |
| Plan de tests                | Tests unitaires, d'intégration, de sécurité et de bout en bout                                               | Tests unitaires au jalon 2, final au J9 | À faire  |
| Pipeline CI/CD               | Lint, tests, build puis déploiement automatique en recette                                                   | CI au J3, CD au J8                      | En cours |
| README                       | Présentation, installation et lancement local                                                                | À jour au jalon 1, final au J9          | En cours |
| Documentation de déploiement | Variables d'environnement, déploiement, rollback, tests et sauvegarde/restauration                           | J9                                      | À faire  |
| Dossier sécurité             | Checklist OWASP Top 10 et journal de veille                                                                  | J9                                      | À faire  |
| Support de soutenance        | Présentation, démonstration, choix techniques et bilan                                                       | J9                                      | À faire  |

## 5. Travail intersession

Entre les deux périodes de cours, le travail prévu est d'environ quatorze
heures. Il porte principalement sur :

- la finalisation des réservations ;
- l'application des règles métier ;
- le workflow de validation par un gestionnaire ;
- les tests unitaires des services métier ;
- les diagrammes de cas d'utilisation et de séquence ;
- la procédure de sauvegarde et de restauration de la base ;
- la mise à jour de la documentation ;
- la veille sur les vulnérabilités.

Une pull request doit être intégrée au moins toutes les deux semaines afin de
maintenir un avancement régulier et traçable.

## 6. Règles de suivi

Chaque tâche du projet doit :

- avoir un objectif clairement défini ;
- être associée à une priorité ;
- comporter des critères d'acceptation ;
- être reliée à un livrable ou à un jalon ;
- être développée sur une branche dédiée lorsqu'elle concerne le code ;
- être intégrée par une pull request ;
- passer en revue avant d'être déplacée dans `Terminé`.

Les priorités sont les suivantes :

- **Haute** : exigence indispensable ou blocage pour un jalon ;
- **Moyenne** : exigence importante ;
- **Basse** : exigence souhaitable ou bonus.

Les bonus ne doivent être développés qu'après les exigences indispensables et
importantes.

## 7. Bilan prévu et réalisé

Cette section est complétée progressivement. État au 12 octobre 2026 (brouillon à relire avant la soutenance).

| Étape                           | Objectif prévu                                                                   | Réalisation                                                                                                     | Écart                                                                                                 | Difficultés                                                                                      | Réussites                                         | Actions correctives                                                         |
| ------------------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------- | --------------------------------------------------------------------------- |
| Étape 1 : socle technique       | Mettre en place Next.js, TypeScript, Docker Compose, le README et la CI initiale | À compléter                                                                                                     | À compléter                                                                                           | À compléter                                                                                      | À compléter                                       | À compléter                                                                 |
| Étape 2 : analyse et conception | Produire les dossiers d'analyse et de conception                                 | À compléter                                                                                                     | À compléter                                                                                           | À compléter                                                                                      | À compléter                                       | À compléter                                                                 |
| Étape 3 : réservations          | Développer les réservations, les règles métier et les tests                      | Réservation, annulation, validation/refus motivé, expiration, maintenance, règles R1 à R8, 123 tests unitaires  | Réalisée avant le J5, en avance sur le planning                                                       | Concurrence (résolue par la base, ADR 004) ; règles du client encore floues (RC-xx, H-05 à H-11) | Chaque règle est testée à trois niveaux           | Faire valider les hypothèses par le client dès réception du compte rendu    |
| Étape 4 : suivi de l'activité   | Ajouter les notifications, le journal et les tests de sécurité                   | Notifications et journal (MongoDB), tableau de bord, tests de sécurité, 37 + 11 tests de bout en bout, axe-core | Réalisée en avance                                                                                    | CSP à nonce incompatible avec les Cache Components (ADR 007)                                     | Les tests e2e ont trouvé 6 écarts avant livraison | Vérification manuelle de l'accessibilité (clavier, lecteur d'écran) à faire |
| Étape 5 : déploiement           | Déployer en recette et finaliser la documentation                                | Dockerfile multi-cibles, Compose de recette, workflows CI et CD, sauvegarde/restauration testée, documentation  | Partielle : image de production non construite en local (proxy HTTPS du poste) ; recette non déployée | Interception TLS sur le poste de développement                                                   | Restauration vérifiée sur les deux bases          | Valider la plateforme avec le formateur, déployer, vérifier le rollback     |
