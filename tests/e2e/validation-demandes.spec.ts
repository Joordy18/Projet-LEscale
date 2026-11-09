import { expect, test } from '@playwright/test';
import { accounts, login, logout, reserve, slotInDays } from './support';

// Workflow de validation par un gestionnaire (B05, R6, B07).
test.describe('validation des demandes de studio', () => {
  test('refus motivé puis validation, avec notifications', async ({ page }) => {
    // Lucas demande le studio deux fois.
    await login(page, accounts.lucas);

    const first = slotInDays(14, '10:00', '12:00');
    const second = slotInDays(15, '10:00', '12:00');

    await reserve(page, 'studio-des-voix', first);
    await expect(page.locator('.alert-success')).toContainText('Votre demande');
    await expect(page.getByText('En attente').first()).toBeVisible();
    await reserve(page, 'studio-des-voix', second);
    await expect(page.locator('.alert-success')).toContainText('Votre demande');
    await logout(page);

    // Le gestionnaire est prévenu et traite les demandes.
    await login(page, accounts.manager);
    await page.goto('/notifications');
    await expect(page.getByText('Nouvelle demande à traiter').first()).toBeVisible();

    await page.goto('/gestion/demandes');
    await expect(page.getByRole('heading', { name: 'Demandes à traiter' })).toBeVisible();
    await page
      .getByRole('row', { name: /Studio des voix.*Lucas Bernard/ })
      .first()
      .getByRole('link', { name: /Traiter/ })
      .click();

    // R6 : un refus exige un motif.
    await page.getByRole('button', { name: 'Refuser la demande' }).click();
    await expect(page.getByText('Un refus doit être accompagné d’un motif.').first()).toBeVisible();

    await page
      .getByLabel(/Motif du refus/)
      .fill('Le studio est réservé à une session interne ce jour-là.');
    await page.getByRole('button', { name: 'Refuser la demande' }).click();
    await expect(page).toHaveURL(/decision=refusee/);
    await expect(page.locator('.alert-success')).toContainText('refusée');

    // Valide l'autre demande de Lucas.
    await page
      .getByRole('row', { name: /Studio des voix.*Lucas Bernard/ })
      .first()
      .getByRole('link', { name: /Traiter/ })
      .click();
    await page.getByRole('button', { name: 'Valider la demande' }).click();
    await expect(page).toHaveURL(/decision=validee/);
    await logout(page);

    // Lucas voit les décisions, le motif du refus et ses notifications (EF-11).
    await login(page, accounts.lucas);
    await expect(page.getByRole('link', { name: /Notifications, \d+ non lues?/ })).toBeVisible();
    await page.goto('/notifications');
    await expect(page.getByRole('heading', { name: 'Demande refusée' })).toBeVisible();
    await expect(page.getByText(/session interne/)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Demande validée' })).toBeVisible();

    await page.getByRole('button', { name: 'Tout marquer comme lu' }).click();
    await expect(page.getByRole('link', { name: /^Notifications$/ })).toBeVisible();

    await page.goto('/reservations');
    await expect(page.getByText('Refusée')).toBeVisible();
    await expect(page.getByText('Confirmée').first()).toBeVisible();
    await expect(page.getByText(/Motif : Le studio est réservé/)).toBeVisible();
  });
});
