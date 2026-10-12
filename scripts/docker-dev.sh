#!/bin/sh
# Démarrage de l'application dans Docker Compose : client Prisma, migrations, jeu d'essai, serveur.
set -e

npx prisma generate
npx prisma migrate deploy

# Le jeu d'essai n'est chargé que sur une base vide, pour ne pas écraser les modifications faites ensuite.
SEED_ONLY_IF_EMPTY=true npx prisma db seed

exec npm run dev -- --hostname 0.0.0.0
