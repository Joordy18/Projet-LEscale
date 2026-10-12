import type { NextConfig } from 'next';

/** En-têtes de sécurité envoyés sur toutes les réponses (OWASP A05). La CSP est ajoutée par `proxy.ts`. */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  ...(process.env.NODE_ENV === 'production'
    ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' }]
    : []),
];

const nextConfig: NextConfig = {
  // Pas de Cache Components : la CSP à nonce (proxy.ts) impose un rendu à chaque requête, sans coquille prérendue.
  // Image Docker de production minimale (voir Dockerfile).
  output: 'standalone',
  poweredByHeader: false,
  // Photo de ressource : 2 Mo au maximum (MAX_PHOTO_BYTES) ; marge pour les autres champs du formulaire.
  experimental: { serverActions: { bodySizeLimit: '3mb' } },
  // Le bouton de l'outil de dev (coin bas-gauche) chevauche le logo et s'affiche sans style sous notre CSP.
  devIndicators: false,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
};

export default nextConfig;
