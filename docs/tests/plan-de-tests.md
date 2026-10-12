# Plan de tests

## 1. Objectifs

Vérifier automatiquement, à chaque pull request, que :

- chaque règle de gestion R1 à R8 est appliquée côté serveur ;
- les droits de chaque rôle sont respectés, y compris en cas de tentative
  d'accès à une page ou à une donnée qui ne concerne pas la personne ;
- les contraintes de la base (chevauchements, quota, anonymisation) tiennent
  face à des demandes simultanées ;
- les parcours principaux fonctionnent dans un vrai navigateur, sur ordinateur
  et sur mobile, et restent accessibles.

La stratégie est décrite dans l'[ADR 006](../adr/006-strategie-de-tests.md).

## 2. Niveaux de test

| Niveau        | Outil                 | Dossier                   | Environnement                                      | Commande                   |
| ------------- | --------------------- | ------------------------- | -------------------------------------------------- | -------------------------- |
| Unitaire      | Vitest                | `tests/unit/`             | Aucune base : repositories en mémoire              | `npm test`                 |
| Intégration   | Vitest                | `tests/integration/`      | PostgreSQL et MongoDB réels (bases `lescale_test`) | `npm run test:integration` |
| Bout en bout  | Playwright (Chromium) | `tests/e2e/`              | Version de production + bases `lescale_test`       | `npm run test:e2e`         |
| Sécurité      | Vitest et Playwright  | `unit/`, `e2e/securite`   | idem selon le test                                 | inclus dans les trois      |
| Accessibilité | Playwright + axe-core | `tests/e2e/accessibilite` | idem e2e                                           | inclus dans `test:e2e`     |

Environnement de test dédié : les bases `lescale_test` (PostgreSQL) et
`lescale_test` (MongoDB) sont distinctes de celles du développement. Les tests
d'intégration vident les tables avant chaque test ; les tests de bout en bout
rechargent le jeu d'essai au démarrage (`tests/e2e/global-setup.ts`).

Préparation locale :

```bash
docker compose up -d postgres mongodb
docker exec lescale-postgres psql -U lescale -d postgres -c "create database lescale_test"
npm run build            # les tests e2e testent la version de production
npm test && npm run test:integration && npm run test:e2e
```

Dans la CI (`.github/workflows/ci.yml`), les deux bases sont des services du
job ; les trois suites sont exécutées à chaque pull request.

## 3. Traçabilité des règles de gestion

| Règle                  | Tests unitaires                                                                                    | Tests d'intégration                             | Test de bout en bout                         |
| ---------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------- | -------------------------------------------- |
| R1 Quota               | `reservation-rules` (limite), `reservation-service` (en attente, par catégorie, annulation libère) | quota atomique sous 6 demandes simultanées      | —                                            |
| R2 Durée               | `reservation-rules` (4 h, 3 jours), `reservation-service`                                          | —                                               | `parcours` (message « 4 heures au maximum ») |
| R3 Délai               | `reservation-rules` (30 jours), `reservation-service`                                              | —                                               | `parcours` (message « 30 jours »)            |
| R4 Annulation          | `reservation-rules` (24 h, gestionnaire), `reservation-service` (propriétaire)                     | —                                               | `parcours` (annulation > 24 h)               |
| R5 Maintenance         | `maintenance-service`, `reservation-service`                                                       | `maintenance-repository` (chevauchement)        | `gestion` (réservations annulées, refus)     |
| R6 Refus motivé        | `reservation-service` (motif obligatoire, visible)                                                 | contrainte SQL `rejection_reason_check`         | `validation-demandes`                        |
| R7 Compte désactivé    | `user-service`, `auth-service` (connexion refusée, réservations annulées)                          | —                                               | `comptes` (connexion refusée)                |
| R8 Demande non traitée | `reservation-service` (`expireStale`), `decide` (créneau commencé)                                 | `findPendingStartedBefore`                      | route `/api/jobs/expire-requests` (sécurité) |
| B04 Chevauchement      | `reservation-service` (2 demandes simultanées)                                                     | contrainte d'exclusion, 10 demandes simultanées | `parcours` (message de conflit)              |
| RC-01 Horaires         | `reservation-rules` (dimanche, 8 h–20 h, matériel exempté)                                         | —                                               | `parcours` (message « entre 8 h et 20 h »)   |

## 4. Tests de sécurité

| Menace (OWASP)                         | Test                                                                                                                                                                      |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A01 Contrôle d'accès : pages réservées | `securite` : visiteur → connexion ; adhérent → accès refusé sur 6 pages de gestion ; gestionnaire sans accès aux comptes                                                  |
| A01 Accès aux données d'autrui (IDOR)  | `reservation-service` : annuler/consulter la réservation d'un autre → introuvable ; `securite` : un adhérent ne voit que ses réservations, ne peut pas ouvrir une demande |
| A01 Droits par rôle côté serveur       | `misc-services` (matrice des permissions), `user-service`, `resource-service`, `maintenance-service` : adhérent refusé                                                    |
| A01 Rôle périmé après changement       | `comptes` : le rôle retiré prend effet immédiatement ; `auth-service` : rôle relu en base                                                                                 |
| A03 Injection / fichiers               | `resource-service` : photo falsifiée refusée (signature du fichier) ; `securite` : traversée de chemin sur `/media`                                                       |
| A05 En-têtes de sécurité, CSP          | `securite` : CSP avec nonce différent à chaque réponse, `nosniff`, `X-Frame-Options`                                                                                      |
| A07 Authentification                   | `securite` : message identique (mot de passe faux / compte inconnu), blocage après 5 échecs ; `rate-limiter`                                                              |
| A07 Redirection ouverte                | `securite` : `next=//evil.example` ignoré                                                                                                                                 |
| A08 Tâche planifiée                    | `securite` : `/api/jobs/expire-requests` exige le secret                                                                                                                  |
| Validation des entrées (Zod)           | `resource-query` (API) ; `securite` : paramètres invalides → 400                                                                                                          |

## 5. Jeu d'essai de la fonctionnalité la plus représentative

Fonctionnalité : **création d'une réservation** (`ReservationService.reserve`),
qui combine règles de gestion, contrôle de disponibilité, droits, validation
de statut et notification.

Contexte commun : « maintenant » = lundi 12 octobre 2026, 10 h (heure de Paris) ;
adhérente Alice, ressources `Salle des Tilleuls` (salle) et `Studio des voix`
(soumis à validation).

| N°  | Entrées                                             | Résultat attendu                          | Résultat obtenu                             | Test                                             |
| --- | --------------------------------------------------- | ----------------------------------------- | ------------------------------------------- | ------------------------------------------------ |
| 1   | Salle, mardi 13 octobre 9 h → 11 h                  | Réservation `CONFIRMED`                   | conforme                                    | `reservation-service` « confirme immédiatement » |
| 2   | Studio, mercredi 14 octobre 9 h → 11 h              | Demande `PENDING`, gestionnaires notifiés | conforme                                    | « B05 : … demandes en attente »                  |
| 3   | Visiteur non connecté                               | Erreur `UNAUTHENTICATED`                  | conforme                                    | « refuse un visiteur »                           |
| 4   | Salle, 9 h → 14 h le même jour                      | Refus R2 : « 4 heures au maximum »        | conforme                                    | « R2 : refuse une salle … »                      |
| 5   | Salle, 20 novembre (39 jours)                       | Refus R3 : « 30 jours à l'avance »        | conforme                                    | « R3 : refuse … »                                |
| 6   | Salle, dimanche 18 octobre                          | Refus RC-01 : « entre 8 h et 20 h »       | conforme                                    | « RC-01 : refuse une salle le dimanche »         |
| 7   | 4e salle à venir pour Alice                         | Refus R1                                  | conforme                                    | « R1 : refuse la quatrième … »                   |
| 8   | Créneau qui chevauche celui de Bob                  | Erreur `CONFLICT`                         | conforme                                    | « refuse un créneau qui chevauche … »            |
| 9   | Créneau qui commence à la fin de celui de Bob       | Réservation acceptée                      | conforme                                    | « accepte deux créneaux qui se suivent »         |
| 10  | Même créneau demandé en même temps par Alice et Bob | Une réservation, un refus                 | conforme (mémoire, PostgreSQL, 10 demandes) | « B04 : deux demandes simultanées », intégration |
| 11  | Salle en maintenance sur le créneau                 | Refus R5 : « en maintenance »             | conforme                                    | « R5 : refuse une ressource en maintenance »     |
| 12  | Ressource archivée ou inconnue                      | Erreur `NOT_FOUND`                        | conforme                                    | « refuse une ressource archivée … »              |

Les résultats « obtenus » sont ceux de la dernière exécution : tous les tests
passent (voir section 6).

## 6. Résultats de la dernière exécution (12 octobre 2026)

| Suite                  | Résultat                                    |
| ---------------------- | ------------------------------------------- |
| Unitaires (Vitest)     | 123 tests passés, 10 fichiers               |
| Intégration (Vitest)   | 28 tests passés, 2 fichiers                 |
| Bout en bout (desktop) | 37 tests passés                             |
| Bout en bout (mobile)  | 11 tests passés (parcours et accessibilité) |

## 7. Analyse des écarts

Les tests de bout en bout ont révélé, avant livraison, des écarts corrigés :

| Écart                                                                                   | Cause                                                       | Correction                                      |
| --------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------- |
| Aucun formulaire ne réagissait en production                                            | CSP à nonce incompatible avec les pages prérendues          | Rendu à la requête, ADR 007                     |
| « Réinitialiser les filtres » gardait l'ancienne catégorie                              | Champs non contrôlés non recréés après navigation           | `key` sur le formulaire de recherche            |
| Lien « Mon compte » sans nom accessible sur mobile (axe-core : `link-name`)             | Texte masqué par `display: none`                            | Texte conservé pour les lecteurs d'écran        |
| Tableau défilable non atteignable au clavier (axe-core : `scrollable-region-focusable`) | Conteneur `overflow-x: auto` sans `tabindex`                | `role="region"`, `aria-label` et `tabIndex={0}` |
| Message « réservation annulée » perdu                                                   | Le formulaire disparaissait avec la réservation de la liste | Message affiché par la page après redirection   |
| Blocage de toutes les connexions depuis une adresse inconnue                            | Clé de limitation par IP même sans IP connue                | Clé IP appliquée seulement si une IP est connue |

## 8. Limites connues

- L'accessibilité est contrôlée automatiquement (axe-core, WCAG 2.2 AA) ; ce
  contrôle ne couvre pas tout. Une vérification manuelle (lecteur d'écran,
  navigation clavier complète) reste à faire avant la soutenance (RGAA).
- Les tests de bout en bout s'exécutent avec Chromium uniquement.
- La limitation des tentatives de connexion est en mémoire : elle est propre à
  chaque instance du serveur.
