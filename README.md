# L'Escale

Application web de réservation de ressources partagées pour le tiers-lieu
L'Escale.

## Technologies

- Next.js avec App Router
- TypeScript strict
- PostgreSQL et MongoDB
- Docker Compose
- Zod
- GitHub Actions

## Architecture

Le projet est organisé en quatre couches :

1. Présentation : pages, layouts et composants d'interface ;
2. Contrôleurs : Server Actions et Route Handlers ;
3. Services métier : règles de gestion indépendantes de Next.js ;
4. Accès aux données : repositories PostgreSQL et MongoDB.

Les composants d'interface n'accèdent jamais directement aux bases de données.

Le premier vertical slice du socle est en place pour le catalogue :

- `lib/catalogue/types.ts` définit le contrat typé d'une ressource ;
- `lib/catalogue/resource-repository.ts` expose le contrat de repository et son
  implémentation mémoire temporaire ;
- `lib/catalogue/resource-service.ts` fournit le service consommé par les pages ;
- `app/api/resources/route.ts` expose `GET /api/resources` avec validation Zod ;
- `/catalogue` reprend l'écran catalogue de la maquette desktop.

Le repository mémoire sert uniquement de donnée de démonstration. Il sera
remplacé par le repository PostgreSQL après la mise en place du schéma Prisma
et des migrations.

## Prérequis

- Node.js 22 ou supérieur
- npm
- Docker Desktop
- Git

## Installation locale avec Docker

Cloner le dépôt puis se placer à sa racine :

```powershell
Copy-Item .env.example .env.local
docker compose up --build
```

Cette commande démarre l'application, PostgreSQL et MongoDB. L'application est
disponible à l'adresse http://localhost:3000.

Pour lancer seulement les bases et l'application directement avec Node.js :

```powershell
npm install
docker compose up -d postgres mongodb
npm run dev
```

## Variables d'environnement

Les variables nécessaires sont documentées dans `.env.example`. Les secrets et
les fichiers `.env.local` ne doivent jamais être commités.

## Vérifications

```powershell
npm run lint
npm run format:check
npm run build
```

Pour vérifier le contrôleur du catalogue en développement :

```powershell
Invoke-RestMethod "http://localhost:3000/api/resources?q=salle"
```

## Intégration continue

GitHub Actions exécute automatiquement sur les pull requests :

- ESLint ;
- la vérification Prettier ;
- le build Next.js.

Les tests automatisés seront ajoutés à la CI avec la mise en place de Vitest
et Playwright.

## Arrêter les bases

```powershell
docker compose down
```

Pour arrêter tous les services :

```powershell
docker compose down
```

Ne pas utiliser `docker compose down -v` sans vouloir supprimer les données
locales.
