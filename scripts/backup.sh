#!/bin/sh
# Sauvegarde PostgreSQL (format custom pg_dump) et MongoDB (archive compressée) dans ./backups.
#
#   sh scripts/backup.sh                                   # environnement de développement
#   COMPOSE="docker compose -f docker-compose.recette.yml --env-file .env.recette" \
#     POSTGRES_USER=lescale POSTGRES_DB=lescale sh scripts/backup.sh
set -eu

COMPOSE="${COMPOSE:-docker compose}"
POSTGRES_USER="${POSTGRES_USER:-lescale}"
POSTGRES_DB="${POSTGRES_DB:-lescale}"
MONGO_DB="${MONGO_DB:-$POSTGRES_DB}"
OUT="${BACKUP_DIR:-backups}"
STAMP="$(date +%Y%m%d-%H%M%S)"

mkdir -p "$OUT"
$COMPOSE exec -T postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc > "$OUT/postgres-$STAMP.dump"
$COMPOSE exec -T mongodb mongodump --db "$MONGO_DB" --archive --gzip > "$OUT/mongodb-$STAMP.archive.gz"

echo "Sauvegardes créées :"
ls -l "$OUT/postgres-$STAMP.dump" "$OUT/mongodb-$STAMP.archive.gz"
