import { expect, test } from '@playwright/test';
import { accounts, login, logout, slotInDays } from './support';

// Parcours exigé par le cahier des charges : un adhérent réserve puis annule (B02, B03, B04, R4).
test('un visiteur recherche, se connecte, réserve puis annule sa réservation', async ({ page }) => {
  // 1. Recherche sans compte (EF-04, EF-05)
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /ressources proposées/ })).toContainText(
    /^\d{2,} ressources proposées/,
  );

  await page.getByLabel('Catégorie').selectOption('STUDIO');
  await page.getByRole('button', { name: 'Rechercher' }).click();
  await expect(page.getByRole('heading', { name: /1 ressource proposée/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Studio des voix' })).toBeVisible();

  await page.getByRole('link', { name: 'Réinitialiser les filtres' }).click();
  await expect(page.getByRole('heading', { name: /^\d{2,} ressources proposées/ })).toBeVisible();
  await page.getByLabel('Mot-clé').fill('charmilles');
  await page.getByRole('button', { name: 'Rechercher' }).click();
  await expect(page.getByRole('heading', { name: 'Salle des Charmilles' })).toBeVisible();

  // 2. Fiche de la ressource, sans compte
  await page.getByRole('link', { name: /Voir le détail/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Salle des Charmilles' })).toBeVisible();
  await expect(page.getByText('Réservation directe')).toBeVisible();

  // 3. Connexion demandée, puis retour sur le formulaire de réservation
  await page.getByRole('link', { name: 'Se connecter pour réserver' }).click();
  await page.getByLabel('Adresse e-mail').fill(accounts.camille);
  await page.getByLabel('Mot de passe').fill('Escale-demo-2026!');
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page).toHaveURL(/\/ressources\/salle-des-charmilles\/reserver/);

  // 4. Réservation d'un créneau libre (confirmée immédiatement)
  const slot = slotInDays(10, '09:00', '11:00');

  await page.getByLabel(/^Début/).fill(slot.startsAt);
  await page.getByLabel(/^Fin/).fill(slot.endsAt);
  await page.getByRole('button', { name: 'Confirmer la réservation' }).click();

  await expect(page).toHaveURL(/\/reservations\?confirmation=/);
  await expect(page.locator('.alert-success')).toContainText('C’est réservé');
  await expect(page.getByRole('heading', { name: 'Salle des Charmilles' }).first()).toBeVisible();

  const reservations = page.getByRole('listitem').filter({ hasText: 'Salle des Charmilles' });
  const confirmed = reservations.filter({ hasText: 'Confirmée' });

  await expect(confirmed).toHaveCount(1);

  // 5. Annulation (plus de 24 h avant le début)
  await page
    .getByRole('button', { name: /Annuler la réservation de Salle des Charmilles/ })
    .click();
  await expect(page.getByText('La réservation a été annulée.')).toBeVisible();
  await expect(confirmed).toHaveCount(0);
  await expect(reservations.filter({ hasText: 'Annulée' }).first()).toBeVisible();
});

test('une réservation qui chevauche une réservation existante est refusée avec une explication', async ({
  page,
}) => {
  await login(page, accounts.lucas);

  const slot = slotInDays(12, '14:00', '16:00');

  await page.goto('/ressources/salle-des-erables/reserver');
  await page.getByLabel(/^Début/).fill(slot.startsAt);
  await page.getByLabel(/^Fin/).fill(slot.endsAt);
  await page.getByRole('button', { name: 'Confirmer la réservation' }).click();
  await expect(page).toHaveURL(/\/reservations\?confirmation=/);

  // Camille tente le même créneau.
  await logout(page);
  await login(page, accounts.camille);
  await page.goto('/ressources/salle-des-erables/reserver');
  await page.getByLabel(/^Début/).fill(slot.startsAt);
  await page.getByLabel(/^Fin/).fill(slot.endsAt);
  await page.getByRole('button', { name: 'Confirmer la réservation' }).click();

  await expect(page.locator('.alert-error')).toContainText('Ce créneau n’est plus disponible');
  // Les valeurs saisies sont conservées pour corriger l'horaire.
  await expect(page.getByLabel(/^Début/)).toHaveValue(slot.startsAt);
});

test('les règles de gestion sont expliquées à l’adhérent (R2, R3, RC-01)', async ({ page }) => {
  await login(page, accounts.ines);
  await page.goto('/ressources/atelier-des-possibles/reserver');

  const tooLong = slotInDays(8, '09:00', '15:00');

  await page.getByLabel(/^Début/).fill(tooLong.startsAt);
  await page.getByLabel(/^Fin/).fill(tooLong.endsAt);
  await page.getByRole('button', { name: 'Confirmer la réservation' }).click();
  await expect(page.locator('.alert-error')).toContainText('4 heures au maximum');

  const tooFar = slotInDays(45, '09:00', '10:00');

  await page.getByLabel(/^Début/).fill(tooFar.startsAt);
  await page.getByLabel(/^Fin/).fill(tooFar.endsAt);
  await page.getByRole('button', { name: 'Confirmer la réservation' }).click();
  await expect(page.locator('.alert-error')).toContainText('30 jours');

  const night = slotInDays(8, '21:00', '22:00');

  await page.getByLabel(/^Début/).fill(night.startsAt);
  await page.getByLabel(/^Fin/).fill(night.endsAt);
  await page.getByRole('button', { name: 'Confirmer la réservation' }).click();
  await expect(page.locator('.alert-error')).toContainText('entre 8 h et 20 h');
});
