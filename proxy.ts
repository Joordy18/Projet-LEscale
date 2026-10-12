import { NextResponse, type NextRequest } from 'next/server';

/**
 * Ajoute une Content Security Policy stricte à chaque réponse de page, avec un
 * nonce différent à chaque requête (OWASP A03, A05). Seuls les scripts et
 * styles portant ce nonce s'exécutent : une injection de script (XSS) est donc
 * bloquée par le navigateur.
 *
 * Écart assumé : `style-src-attr 'unsafe-inline'` autorise les attributs
 * `style` générés par `next/image` (images en `fill`). Il ne permet pas
 * d'exécuter de script.
 */
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const isDev = process.env.NODE_ENV === 'development';
  const policy = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    `style-src 'self' 'nonce-${nonce}'`,
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDev ? [] : ['upgrade-insecure-requests']),
  ].join('; ');

  const requestHeaders = new Headers(request.headers);

  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', policy);

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  response.headers.set('Content-Security-Policy', policy);

  return response;
}

export const config = {
  matcher: [
    {
      // Pages uniquement : ni les ressources statiques, ni l'API, ni les préchargements.
      source: '/((?!api|media|_next/static|_next/image|favicon.ico).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
