import { expect, test, type Page } from '@playwright/test';

/** Mot de passe commun des comptes du jeu d'essai (voir prisma/seed.ts). */
export const PASSWORD = 'Escale-demo-2026!';

export const accounts = {
  admin: 'admin@lescale.test',
  manager: 'gestionnaire@lescale.test',
  camille: 'camille.martin@lescale.test',
  lucas: 'lucas.bernard@lescale.test',
  ines: 'ines.garcia@lescale.test',
} as const;

/** Se connecte par le formulaire et attend l'arrivée sur la page de retour. */
export async function login(page: Page, email: string, password = PASSWORD, next?: string) {
  await page.goto(next ? `/connexion?next=${encodeURIComponent(next)}` : '/connexion');
  await page.getByLabel('Adresse e-mail').fill(email);
  await page.getByLabel('Mot de passe').fill(password);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  // Attend le résultat (page de retour ou message d'erreur) avant toute navigation suivante.
  await Promise.race([
    page.waitForURL((url) => !url.pathname.startsWith('/connexion')),
    page.locator('.alert-error').waitFor(),
  ]);
}

export async function logout(page: Page) {
  await page.getByRole('button', { name: 'Se déconnecter' }).click();
  await page.waitForURL((url) => url.pathname === '/');
  await expect(
    page.locator('.site-account').getByRole('link', { name: 'Se connecter' }),
  ).toBeVisible();
}

/** Date locale `YYYY-MM-DDTHH:mm` dans `days` jours (heure de Paris), sans passer par un dimanche. */
export function slotInDays(days: number, from: string, to: string) {
  // Le projet « mobile » rejoue les mêmes parcours sur la même base : il décale ses créneaux pour ne pas entrer en conflit.
  const shift = test.info().project.name === 'mobile' ? 7 : 0;
  const date = new Date(Date.now() + (days + shift) * 24 * 60 * 60 * 1000);

  // Évite le dimanche, jour de fermeture des salles.
  while (
    new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Paris', weekday: 'short' }).format(
      date,
    ) === 'Sun'
  ) {
    date.setTime(date.getTime() + 24 * 60 * 60 * 1000);
  }

  const day = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Paris' }).format(date);

  return { startsAt: `${day}T${from}`, endsAt: `${day}T${to}` };
}

/** Remplit le formulaire de réservation d'une ressource et l'envoie. */
export async function reserve(
  page: Page,
  slug: string,
  slot: { startsAt: string; endsAt: string },
  buttonName: RegExp = /Confirmer la réservation|Envoyer la demande/,
) {
  await page.goto(`/ressources/${slug}/reserver`);
  await page.getByLabel(/^Début/).fill(slot.startsAt);
  await page.getByLabel(/^Fin/).fill(slot.endsAt);
  await page.getByRole('button', { name: buttonName }).click();
}
