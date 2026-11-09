#!/bin/sh
# Restaure une sauvegarde PostgreSQL et/ou MongoDB. ATTENTION : remplace le contenu de la base ciblée.
#
#   sh scripts/restore.sh backups/postgres-AAAAMMJJ-HHMMSS.dump backups/mongodb-AAAAMMJJ-HHMMSS.archive.gz
#
# Variables : COMPOSE, POSTGRES_USER, POSTGRES_DB (base cible), MONGO_DB (base cible), MONGO_SOURCE_DB (base d'origine).
set -eu

if [ "$#" -ne 2 ]; then
  echo "Usage : sh scripts/restore.sh <postgres.dump> <mongodb.archive.gz>" >&2
  exit 1
fi

COMPOSE="${COMPOSE:-docker compose}"
POSTGRES_USER="${POSTGRES_USER:-lescale}"
POSTGRES_DB="${POSTGRES_DB:-lescale}"
MONGO_DB="${MONGO_DB:-$POSTGRES_DB}"
MONGO_SOURCE_DB="${MONGO_SOURCE_DB:-$MONGO_DB}"

$COMPOSE exec -T postgres pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner < "$1"
$COMPOSE exec -T mongodb mongorestore --archive --gzip --drop \
  --nsFrom "$MONGO_SOURCE_DB.*" --nsTo "$MONGO_DB.*" < "$2"

echo "Restauration terminée."
