# ADR 007 — Rendu à la requête et Content Security Policy

## Contexte

Le cahier des charges impose une Content Security Policy (CSP) et la protection
contre le XSS. La CSP la plus efficace n'autorise l'exécution que des scripts
portant un **nonce** (jeton aléatoire différent à chaque réponse), généré dans
`proxy.ts`.

Le projet avait activé les Cache Components de Next.js (`cacheComponents`,
`partialPrefetching`), qui prérendent une « coquille statique » de chaque page
au moment de la construction du site.

## Problème constaté

Un nonce par requête est incompatible avec une page prérendue : la coquille est
générée une fois, sans nonce. En production, le navigateur refusait donc tous
les scripts de la coquille (`Loading the script … violates the following
Content Security Policy directive`) et l'application ne répondait plus aux
clics (formulaires inertes). Le problème n'apparaissait pas en développement,
où les pages ne sont pas prérendues. Il a été détecté par les tests de bout en
bout Playwright sur la version de production.

## Décision

- **Désactiver les Cache Components** et rendre toutes les pages **à chaque
  requête** : le layout racine appelle `await connection()`.
- Conserver la **CSP à nonce** de `proxy.ts` : `script-src 'self' 'nonce-…'
'strict-dynamic'`, `object-src 'none'`, `frame-ancestors 'none'`,
  `form-action 'self'`, `base-uri 'self'`.
- Écart assumé : `style-src-attr 'unsafe-inline'` autorise les attributs
  `style` générés par `next/image` ; il n'autorise aucune exécution de script.
- En-têtes complémentaires dans `next.config.ts` : `X-Content-Type-Options`,
  `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`,
  `Cross-Origin-Opener-Policy`, `Strict-Transport-Security` (production).

## Raisons du choix

- Presque toutes les pages dépendent de la session (en-tête personnalisé, droits
  par rôle) : le prérendu n'apporterait presque aucun gain.
- La protection contre l'injection de script prime sur un gain de performance
  marginal pour ~400 adhérents.
- Une CSP à base de `'unsafe-inline'` aurait supprimé l'essentiel de la
  protection.

## Alternatives écartées

- **`script-src 'self' 'unsafe-inline'`** : fonctionne avec le prérendu mais
  n'arrête plus le XSS.
- **CSP par hachages (`sha256-…`)** : les hachages des scripts de Next.js
  changent à chaque construction ; non maintenable.

## Conséquences

- Chaque page est rendue côté serveur à chaque requête : le serveur doit être
  correctement dimensionné (charge attendue très faible).
- Plus de navigation « instantanée » par préchargement de coquille ; le
  préchargement de `next/link` des pages reste actif.
- Un test de sécurité vérifie que chaque réponse porte une CSP avec un nonce
  différent (`tests/e2e/securite.spec.ts`).
- Si le prérendu redevient nécessaire, il faudra une autre stratégie (CSP par
  hachages générés à la construction).
