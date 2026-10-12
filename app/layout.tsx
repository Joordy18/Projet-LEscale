import type { Metadata } from 'next';
import { connection } from 'next/server';
import { Geist, Geist_Mono } from 'next/font/google';
import { Suspense } from 'react';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader, SiteHeaderFallback } from '@/components/site-header';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: "L'Escale",
    template: "%s | L'Escale",
  },
  description: 'Réservez les ressources partagées de L’Escale.',
};

/**
 * Toutes les pages sont rendues à chaque requête : la Content Security Policy
 * exige un nonce différent par requête (proxy.ts), ce qui est impossible dans
 * une page prérendue au moment de la construction du site.
 */
export default async function RootLayout({ children }: LayoutProps<'/'>) {
  await connection();

  return (
    <html lang="fr" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <a className="skip-link" href="#contenu">
          Aller au contenu
        </a>
        <Suspense fallback={<SiteHeaderFallback />}>
          <SiteHeader />
        </Suspense>
        <main id="contenu" tabIndex={-1}>
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
