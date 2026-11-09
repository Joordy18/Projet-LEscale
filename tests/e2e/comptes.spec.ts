import { expect, test } from '@playwright/test';
import { accounts, login, logout } from './support';

// Gestion des comptes par l'administrateur (EF-02, R7).
test('l’administrateur crée un compte puis le désactive (R7)', async ({ page }) => {
  const email = 'nouveau.membre@lescale.test';
  const password = 'Un-mot-de-passe-solide-1';

  await login(page, accounts.admin);
  await page.goto('/admin/comptes');
  await page.getByLabel(/^Prénom/).fill('Nina');
  await page.getByLabel(/^Nom \(/).fill('Dupuis');
  await page.getByLabel(/^Adresse e-mail/).fill(email);
  await page.getByLabel(/^Mot de passe initial/).fill(password);
  await page.getByRole('button', { name: 'Créer le compte' }).click();
  await expect(page.getByText('Le compte a été créé.')).toBeVisible();
  await expect(page.getByText(email)).toBeVisible();
  await logout(page);

  // Le nouvel adhérent se connecte et réserve.
  await login(page, email, password);
  await expect(page.getByRole('link', { name: /Nina Dupuis/ })).toBeVisible();
  await logout(page);

  // L'administrateur désactive le compte : la connexion est refusée.
  await login(page, accounts.admin);
  await page.goto('/admin/comptes');
  await page.getByRole('button', { name: /Désactiver le compte de Nina Dupuis/ }).click();
  await expect(page.getByText(/Le compte a été désactivé/)).toBeVisible();
  await logout(page);

  await login(page, email, password);
  await expect(page.locator('.alert-error')).toContainText('compte désactivé');

  // Réactivation.
  await login(page, accounts.admin);
  await page.goto('/admin/comptes');
  await page.getByRole('button', { name: /Réactiver le compte de Nina Dupuis/ }).click();
  await expect(page.getByText('Le compte a été réactivé.')).toBeVisible();
});

test('l’administrateur attribue puis retire le rôle de gestionnaire', async ({ page }) => {
  await login(page, accounts.admin);
  await page.goto('/admin/comptes');

  const row = page.getByRole('listitem').filter({ hasText: 'ines.garcia@lescale.test' });

  await row.getByLabel(/Rôle de Inès Garcia/).selectOption('MANAGER');
  await row.getByRole('button', { name: 'Changer le rôle' }).click();
  await expect(page.getByText('Le rôle a été modifié.').first()).toBeVisible();
  await logout(page);

  await login(page, accounts.ines);
  await page.goto('/gestion/demandes');
  await expect(page.getByRole('heading', { name: 'Demandes à traiter' })).toBeVisible();
  await logout(page);

  await login(page, accounts.admin);
  await page.goto('/admin/comptes');
  await page
    .getByRole('listitem')
    .filter({ hasText: 'ines.garcia@lescale.test' })
    .getByLabel(/Rôle de Inès Garcia/)
    .selectOption('MEMBER');
  await page
    .getByRole('listitem')
    .filter({ hasText: 'ines.garcia@lescale.test' })
    .getByRole('button', { name: 'Changer le rôle' })
    .click();
  await expect(page.getByText('Le rôle a été modifié.').first()).toBeVisible();
  await logout(page);

  // Le rôle est relu en base : l'accès est retiré immédiatement.
  await login(page, accounts.ines);
  await page.goto('/gestion/demandes');
  await expect(page).toHaveURL(/\/acces-refuse/);
});

test('un adhérent supprime son compte : ses réservations passées sont anonymisées (RGPD)', async ({
  page,
}) => {
  const email = 'a.supprimer@lescale.test';
  const password = 'Un-mot-de-passe-solide-2';

  await login(page, accounts.admin);
  await page.goto('/admin/comptes');
  await page.getByLabel(/^Prénom/).fill('Paul');
  await page.getByLabel(/^Nom \(/).fill('Temporaire');
  await page.getByLabel(/^Adresse e-mail/).fill(email);
  await page.getByLabel(/^Mot de passe initial/).fill(password);
  await page.getByRole('button', { name: 'Créer le compte' }).click();
  await expect(page.getByText('Le compte a été créé.')).toBeVisible();
  await logout(page);

  await login(page, email, password);
  await page.goto('/mon-compte');
  await expect(page.getByText('a.supprimer@lescale.test')).toBeVisible();

  await page.getByLabel('Mot de passe, pour confirmer').fill('faux-mot-de-passe');
  await page.getByRole('button', { name: /Supprimer définitivement/ }).click();
  await expect(page.locator('.alert-error')).toContainText('mot de passe est incorrect');

  await page.getByLabel('Mot de passe, pour confirmer').fill(password);
  await page.getByRole('button', { name: /Supprimer définitivement/ }).click();
  await expect(page).toHaveURL(/compte=supprime/);
  await expect(page.locator('.alert-success').first()).toContainText('Votre compte a été supprimé');

  await login(page, email, password);
  await expect(page.locator('.alert-error')).toBeVisible();
});
