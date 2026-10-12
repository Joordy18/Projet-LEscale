import { expect, test } from '@playwright/test';
import { accounts, login, logout, reserve, slotInDays } from './support';

/** Image PNG de 1 pixel : suffisante pour tester le téléversement. */
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

// Gestion du catalogue (EF-09) et des maintenances (EF-10, R5).
test.describe('catalogue', () => {
  test('un gestionnaire crée, modifie puis retire une ressource avec sa photo', async ({
    page,
  }) => {
    await login(page, accounts.manager);
    await page.goto('/gestion/ressources/nouveau');

    await page.getByLabel(/^Nom \(/).fill('Salle du Cèdre');
    await page.getByLabel(/^Catégorie/).selectOption('ROOM');
    await page.getByLabel(/^Description/).fill('Une salle calme au rez-de-chaussée.');
    await page.getByLabel(/^Conditions d’utilisation/).fill('Rangement après usage');
    await page.getByLabel(/^Capacité/).fill('10');
    await page
      .getByLabel(/^Photo/)
      .setInputFiles({ name: 'cedre.png', mimeType: 'image/png', buffer: PNG });
    await page.getByRole('button', { name: 'Créer la ressource' }).click();

    await expect(page).toHaveURL(/\/gestion\/ressources\/[0-9a-f-]{36}\?creation=1/);
    await expect(page.locator('.alert-success')).toContainText('La ressource a été créée.');

    // Visible dans le catalogue public, photo servie depuis /media.
    await page.goto('/?q=cèdre');
    const photo = page.locator('.resource-card img').first();

    await expect(page.getByRole('heading', { name: 'Salle du Cèdre' })).toBeVisible();
    const src = await photo.getAttribute('src');

    expect(src).toContain('/media/');

    const media = await page.request.get(src!);

    expect(media.status()).toBe(200);
    expect(media.headers()['content-type']).toBe('image/png');
    expect(media.headers()['x-content-type-options']).toBe('nosniff');

    // Modification.
    await page.goto('/gestion/ressources');
    await page.getByRole('link', { name: /Gérer Salle du Cèdre/ }).click();
    await page.getByLabel(/^Nom \(/).fill('Salle du Grand Cèdre');
    await page.getByRole('button', { name: 'Enregistrer les modifications' }).click();
    await expect(page.getByText('La ressource a été enregistrée.')).toBeVisible();

    // Retrait : disparaît du catalogue public mais reste gérable.
    await page.getByRole('button', { name: 'Retirer du catalogue' }).click();
    await expect(page.getByText('La ressource a été retirée du catalogue.')).toBeVisible();
    await logout(page);

    await page.goto('/?q=cèdre');
    await expect(page.getByText('Aucune ressource ne correspond')).toBeVisible();
  });

  test('un équipement reçoit un code d’inventaire à 6 caractères (RC-12)', async ({ page }) => {
    await login(page, accounts.manager);
    await page.goto('/gestion/ressources/nouveau');
    await page.getByLabel(/^Nom \(/).fill('Perceuse à percussion');
    await page.getByLabel(/^Catégorie/).selectOption('EQUIPMENT');
    await page.getByLabel(/^Description/).fill('Une perceuse à percussion.');
    await page.getByLabel(/^Conditions d’utilisation/).fill('Lunettes de protection');
    await page.getByRole('button', { name: 'Créer la ressource' }).click();
    await expect(page.locator('.alert-success')).toContainText('La ressource a été créée.');

    await page.goto('/ressources/perceuse-a-percussion');
    await expect(page.getByText(/Numéro d’inventaire/)).toBeVisible();
    await expect(page.locator('dd').filter({ hasText: /^[A-Z0-9]{6}$/ })).toBeVisible();
  });

  test('un fichier qui n’est pas une image est refusé', async ({ page }) => {
    await login(page, accounts.manager);
    await page.goto('/gestion/ressources/nouveau');
    await page.getByLabel(/^Nom \(/).fill('Salle piégée');
    await page.getByLabel(/^Catégorie/).selectOption('ROOM');
    await page.getByLabel(/^Description/).fill('Description');
    await page.getByLabel(/^Conditions d’utilisation/).fill('Conditions');
    await page.getByLabel(/^Capacité/).fill('4');
    await page.getByLabel(/^Photo/).setInputFiles({
      name: 'faux.png',
      mimeType: 'image/png',
      buffer: Buffer.from('<script>alert(1)</script>'),
    });
    await page.getByRole('button', { name: 'Créer la ressource' }).click();
    await expect(page.locator('.alert-error')).toContainText('JPEG, PNG ou WebP');
  });

  test('une capacité manquante est signalée sous le champ', async ({ page }) => {
    await login(page, accounts.manager);
    await page.goto('/gestion/ressources/nouveau');
    await page.getByLabel(/^Nom \(/).fill('Salle sans capacité');
    await page.getByLabel(/^Catégorie/).selectOption('ROOM');
    await page.getByLabel(/^Description/).fill('Description');
    await page.getByLabel(/^Conditions d’utilisation/).fill('Conditions');
    await page.getByRole('button', { name: 'Créer la ressource' }).click();
    await expect(page.locator('.alert-error')).toContainText('capacité');
  });
});

test.describe('maintenance (R5, RC-06)', () => {
  test('une maintenance annule les réservations concernées et prévient les adhérents', async ({
    page,
  }) => {
    // La Salle des Tilleuls est réservée par Camille dans 3 jours (jeu d'essai).
    await login(page, accounts.manager);
    await page.goto('/gestion/ressources');
    await page.getByRole('link', { name: /Gérer Salle des Tilleuls/ }).click();

    const from = slotInDays(3, '00:00', '23:00');

    await page.getByLabel(/^Début/).fill(from.startsAt);
    await page.getByLabel(/^Fin/).fill(from.endsAt);
    await page.getByLabel(/^Motif/).fill('Remplacement des fenêtres');
    await page.getByRole('button', { name: 'Planifier la maintenance' }).click();
    await expect(
      page.getByText(/Maintenance planifiée\. 2 réservations ont été annulées/),
    ).toBeVisible();
    await expect(page.getByText('Remplacement des fenêtres')).toBeVisible();
    await logout(page);

    // La salle n'est plus réservable sur la période.
    await login(page, accounts.ines);
    await page.goto('/ressources/salle-des-tilleuls/reserver');
    await page.getByLabel(/^Début/).fill(from.startsAt.replace('T00:00', 'T16:00'));
    await page.getByLabel(/^Fin/).fill(from.startsAt.replace('T00:00', 'T17:00'));
    await page.getByRole('button', { name: 'Confirmer la réservation' }).click();
    await expect(page.locator('.alert-error')).toContainText('maintenance');
    await logout(page);

    // Camille est prévenue.
    await login(page, accounts.camille);
    await page.goto('/notifications');
    await expect(
      page.getByRole('heading', { name: 'Réservation annulée pour maintenance' }).first(),
    ).toBeVisible();
    await expect(page.getByText(/Remplacement des fenêtres/).first()).toBeVisible();
  });
});

test('un gestionnaire annule la réservation d’un adhérent et l’adhérent en est prévenu (R4)', async ({
  page,
}) => {
  await login(page, accounts.lucas);
  await reserve(page, 'salle-des-charmilles', slotInDays(4, '14:00', '15:00'));
  await expect(page).toHaveURL(/\/reservations\?confirmation=/);
  await logout(page);

  await login(page, accounts.manager);
  await page.getByRole('link', { name: 'Toutes les réservations' }).click();
  await page
    .getByRole('row', { name: /Salle des Charmilles.*Lucas/ })
    .getByRole('button', { name: /Annuler/ })
    .click();
  await expect(
    page.getByText('La réservation a été annulée et l’adhérent a été prévenu.'),
  ).toBeVisible();
  await logout(page);

  await login(page, accounts.lucas);
  await page.goto('/notifications');
  await expect(
    page.getByRole('heading', { name: 'Réservation annulée par un gestionnaire' }),
  ).toBeVisible();
});

test('le journal d’activité trace les actions des gestionnaires (B08)', async ({ page }) => {
  await login(page, accounts.manager);
  await page.goto('/gestion/journal');
  await expect(page.getByRole('heading', { name: 'Journal d’activité' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Hugo Petit' }).first()).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Ressource créée' }).first()).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Maintenance planifiée' }).first()).toBeVisible();
});

test('le tableau de bord présente demandes, réservations du jour et ressources utilisées (EF-13)', async ({
  page,
}) => {
  await login(page, accounts.manager);
  await page.goto('/gestion');
  await expect(page.getByRole('heading', { name: 'Demandes en attente' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Réservations du jour' })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Ressources les plus utilisées/ })).toBeVisible();
});
