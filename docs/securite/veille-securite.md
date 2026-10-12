# Journal de veille sur les vulnérabilités

Journal tenu pendant toute la durée du projet : avis de sécurité, CVE et alertes
sur les dépendances qui concernent les technologies utilisées, avec les
constats et les corrections. Outils : `npm audit`, avis GitHub (GHSA) des
paquets utilisés.

Sources surveillées : GitHub Advisory Database (npm), notes de version de Next.js,
Auth.js, Prisma, MongoDB driver, PostgreSQL, Docker.

| Date       | Source / identifiant                                                                                                                                          | Composant (type)                                           | Concerne l'application ?                                                                     | Décision / correction                                                                                                                                      |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-10-07 | [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) (`braces`)                                                                           | `braces` via `eslint-config-next` (outil de développement) | Non : exécuté uniquement par ESLint sur le code du dépôt, jamais en production               | Constat tracé. `npm audit fix --force` proposé par npm **rejeté** : il rétrograderait vers Next 14. À relire à chaque mise à jour de `eslint-config-next`. |
| 2026-10-12 | [GHSA-ggr8-5vv4-36mx](https://github.com/advisories/GHSA-ggr8-5vv4-36mx) (`deepmerge-ts`)                                                                     | `deepmerge-ts` via `@prisma/config` (CLI Prisma)           | Non : utilisé par le CLI (migrations, génération du client), absent de l'image de production | Constat tracé ; le correctif imposé par npm rétrograde Prisma en 6.x (changement majeur). Attendre la correction côté Prisma 7.                            |
| 2026-10-12 | [GHSA-3f6p-5ww8-9rcr](https://github.com/advisories/GHSA-3f6p-5ww8-9rcr), [GHSA-rgwj-5xj2-c3m3](https://github.com/advisories/GHSA-rgwj-5xj2-c3m3) (`mysql2`) | `mysql2` via `prisma` (CLI)                                | Non : MySQL n'est pas utilisé (PostgreSQL uniquement) ; dépendance du CLI                    | Constat tracé ; même décision que ci-dessus.                                                                                                               |
| 2026-10-12 | Next.js 16 : `middleware` renommé `proxy` ; Cache Components expérimentaux                                                                                    | Next.js (changement de conception)                         | Oui                                                                                          | Convention `proxy.ts` utilisée ; Cache Components désactivés car incompatibles avec une CSP à nonce (ADR 007).                                             |
| 2026-10-12 | Auth.js v5 en version bêta (`next-auth@5.0.0-beta.32`)                                                                                                        | `next-auth` (bêta)                                         | Oui : version non stable                                                                     | Version exacte figée ; sessions JWT ; vérification de chaque montée de version (ADR 002, révision).                                                        |
| 2026-10-12 | Installation Docker : `UNABLE_TO_VERIFY_LEAF_SIGNATURE` pendant `npm ci`                                                                                      | Chaîne d'approvisionnement (poste de développement)        | Poste local : un logiciel interceptait les connexions HTTPS                                  | La vérification TLS **n'a pas été désactivée**. L'image est construite par la CI GitHub. À régler sur le poste (exclusion du proxy HTTPS de l'antivirus).  |

## Règles de suivi

- `npm audit --omit=dev --audit-level=critical` bloque la CI : aucune faille
  critique sur les dépendances de production n'est tolérée.
- Les failles « high » limitées aux outils de développement sont tracées ici
  avec leur justification et réexaminées à chaque mise à jour majeure.
- Aucune correction automatique forcée (`npm audit fix --force`) sans relecture :
  elle peut rétrograder un framework.
- Revue de cette table à chaque jalon (J5, mi-décembre, J8).

## Dernier audit (12 octobre 2026)

`npm audit` : 9 alertes « high », toutes sur des dépendances de développement
(ESLint et CLI Prisma). `npm audit --omit=dev --audit-level=critical` : aucune
alerte critique.
