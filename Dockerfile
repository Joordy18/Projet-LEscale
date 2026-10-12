# syntax=docker/dockerfile:1
# Image unique à plusieurs cibles :
#   dev     : serveur de développement (docker compose up)
#   migrate : applique les migrations Prisma (déploiement)
#   runner  : application de production, image minimale

FROM node:22-bookworm-slim AS base
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM deps AS dev
COPY . .
EXPOSE 3000
CMD ["sh", "scripts/docker-dev.sh"]

FROM deps AS builder
COPY . .
# Le client Prisma est généré sans connexion à la base : l'URL n'est qu'un paramètre de forme.
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build npx prisma generate \
  && npm run build

FROM builder AS migrate
CMD ["npx", "prisma", "migrate", "deploy"]

FROM base AS runner
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 UPLOAD_DIR=/data/uploads
RUN mkdir -p /data/uploads && chown -R node:node /data /app
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
USER node
EXPOSE 3000
VOLUME ["/data/uploads"]
CMD ["node", "server.js"]
