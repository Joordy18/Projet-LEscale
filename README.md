# L'Escale

Application web de réservation de ressources partagées pour le tiers-lieu
L'Escale (organisation fictive, ~400 adhérents) : 4 salles, 1 studio,
1 véhicule utilitaire et une trentaine d'équipements. Projet individuel du
module full stack (titre CDA RNCP37873), La Salle Bourges.

Les adhérents consultent le catalogue, réservent et annulent ; les
gestionnaires valident les demandes de studio et de véhicule, gèrent le
catalogue et les maintenances ; l'administrateur gère les comptes et les rôles.
Les règles d'utilisation (quota, durée, délai, annulation, maintenance, refus
motivé, comptes désactivés, demandes non traitées) sont appliquées côté
serveur.

## Technologies

- Next.js 16 (App Router), React 19, TypeScript strict, Tailwind CSS
- PostgreSQL + Prisma (données métier), MongoDB (notifications, journal d'activité)
- Auth.js (connexion, sessions), bcrypt, Zod (validation de toutes les entrées)
- Vitest (unitaires, intégration), Playwright + axe-core (bout en bout, accessibilité)
- Docker Compose, GitHub Actions (CI et déploiement en recette)

## Démarrage rapide

Prérequis : Node.js 22, Docker Desktop, Git.

```bash
docker compose up --build
```

L'application et ses deux bases démarrent sur http://localhost:3000, avec un jeu
d'essai et les comptes de démonstration affichés sur la page de connexion. Le
mot de passe commun est la valeur de `SEED_PASSWORD` (`.env.example`).

Installation sans conteneur pour l'application, déploiement, sauvegarde et
dépannage : [docs/deploiement/deploiement.md](docs/deploiement/deploiement.md).

## Scripts

| Commande                                         | Rôle                                                         |
| ------------------------------------------------ | ------------------------------------------------------------ |
| `npm run dev`                                    | Serveur de développement                                     |
| `npm run build` / `start`                        | Construction et lancement de la version de production        |
| `npm run lint`                                   | ESLint, dont la règle qui vérifie les couches                |
| `npm run format` / `format:check`                | Prettier                                                     |
| `npm test`                                       | Tests unitaires (Vitest, sans base)                          |
| `npm run test:integration`                       | Tests d'intégration contre PostgreSQL et MongoDB             |
| `npm run test:e2e`                               | Tests de bout en bout Playwright (nécessite `npm run build`) |
| `npm run db:generate` / `db:migrate` / `db:seed` | Client Prisma, migrations, jeu d'essai                       |

## Architecture

Quatre couches ; chacune n'appelle que celle juste en dessous :

1. **Présentation** : pages, layouts et composants (`app/`, `components/`) ;
2. **Contrôleurs** : validation Zod, droits, Server Actions et Route Handlers (`lib/controllers/`, `app/**/route.ts`) ;
3. **Services métier** : règles de gestion, indépendantes de Next.js (`lib/services/`) ;
4. **Accès aux données** : repositories PostgreSQL et MongoDB (`lib/repositories/`).

`lib/domain/` (types et règles pures) et `lib/validations/` (schémas Zod) sont
partagés. La règle ESLint `no-restricted-imports` (`eslint.config.mjs`) interdit
tout import qui franchirait une couche ; elle s'exécute dans `npm run lint` et
dans la CI. Les services reçoivent leurs repositories par injection ;
l'assemblage est dans `lib/services/index.ts`.

Détails : [docs/conception/architecture.md](docs/conception/architecture.md),
[modèle de données](docs/conception/modele-donnees.md), décisions dans
[docs/adr/](docs/adr/).

## Conventions de nommage

| Élément                        | Convention                                      | Exemple                                       |
| ------------------------------ | ----------------------------------------------- | --------------------------------------------- |
| Fichiers et dossiers           | `kebab-case`                                    | `reservation-service.ts`, `resource-form.tsx` |
| Composants React               | `PascalCase` (fichier en kebab-case)            | `SiteHeader` dans `site-header.tsx`           |
| Variables, fonctions, méthodes | `camelCase`                                     | `countUpcomingByUser`                         |
| Types, classes, interfaces     | `PascalCase`                                    | `ReservationService`, `ResourceRepository`    |
| Constantes et valeurs d'enum   | `UPPER_SNAKE_CASE`                              | `MAX_UPCOMING_PER_CATEGORY`, `PENDING`        |
| Tables PostgreSQL              | `snake_case`, pluriel                           | `maintenance_periods`                         |
| Colonnes PostgreSQL            | `snake_case`                                    | `starts_at`, `is_active`                      |
| Types énumérés PostgreSQL      | `snake_case`, singulier                         | `reservation_status`                          |
| Modèles Prisma                 | `PascalCase`, singulier (mappés sur les tables) | `Reservation` → `reservations`                |
| Collections MongoDB            | `snake_case`, pluriel                           | `activity_logs`                               |
| Routes de l'interface          | français, `kebab-case`                          | `/gestion/demandes`, `/mon-compte`            |
| Variables d'environnement      | `UPPER_SNAKE_CASE`                              | `DATABASE_URL`                                |
| Tests                          | `*.test.ts` (Vitest), `*.spec.ts` (Playwright)  | `reservation-service.test.ts`                 |

Les services et les fonctions exportées sont documentés en JSDoc, en français.

## Tests et qualité

Trois niveaux (unitaires, intégration, bout en bout) couvrent les règles de
gestion R1 à R8, les droits, la sécurité et l'accessibilité (axe-core, WCAG
2.2 AA). Voir le [plan de tests](docs/tests/plan-de-tests.md). La CI exécute
lint, formatage, types, audit des dépendances, build et les trois suites à
chaque pull request.

## Sécurité

[Checklist OWASP Top 10](docs/securite/checklist-owasp-top10.md) et
[journal de veille](docs/securite/veille-securite.md). Les secrets ne sont
jamais versionnés (`.env*` ignorés, sauf les fichiers `*.example`).

## Documentation

| Document                                               | Contenu                                                           |
| ------------------------------------------------------ | ----------------------------------------------------------------- |
| [Dossier d'analyse](docs/analyse/dossier-analyse.md)   | Besoins, user stories, questions au client, hypothèses, maquettes |
| [Architecture](docs/conception/architecture.md)        | Couches, services, éco-conception                                 |
| [Modèle de données](docs/conception/modele-donnees.md) | MCD, modèle logique et physique                                   |
| [ADR](docs/adr/README.md)                              | Décisions d'architecture                                          |
| [Plan de tests](docs/tests/plan-de-tests.md)           | Stratégie, traçabilité, jeu d'essai                               |
| [Déploiement](docs/deploiement/deploiement.md)         | Variables, déploiement, rollback, sauvegarde                      |
| [Planning](docs/gestion/planning.md)                   | Étapes, jalons, bilan prévu/réalisé                               |

## Contribution

Une branche par fonctionnalité, intégrée par pull request dont la CI doit être
au vert. Messages de commit en français, préfixés (`feat`, `fix`, `docs`,
`test`, `chore`).
