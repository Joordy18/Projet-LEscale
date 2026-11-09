import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { accounts, login } from './support';

// Accessibilité WCAG 2.2 AA sur les parcours principaux (CDC 6.3) : contrôle automatique avec axe-core,
// à compléter par une vérification manuelle (clavier, lecteur d'écran) selon le RGAA.
const tags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function expectNoViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(tags).analyze();

  expect(
    results.violations.map((violation) => `${violation.id} : ${violation.nodes.length} élément(s)`),
  ).toEqual([]);
}

test.describe('pages publiques', () => {
  for (const path of [
    '/',
    '/?category=ROOM',
    '/connexion',
    '/aide',
    '/accessibilite',
    '/confidentialite',
  ]) {
    test(`${path} n’a pas de violation détectable`, async ({ page }) => {
      await page.goto(path);
      await expectNoViolations(page);
    });
  }

  test('la fiche d’une ressource n’a pas de violation détectable', async ({ page }) => {
    await page.goto('/ressources/salle-des-tilleuls');
    await expectNoViolations(page);
  });
});

test.describe('parcours connecté', () => {
  test('réservation et liste des réservations', async ({ page }) => {
    await login(page, accounts.camille);
    await page.goto('/ressources/salle-des-erables/reserver');
    await expectNoViolations(page);
    await page.goto('/reservations');
    await expectNoViolations(page);
    await page.goto('/notifications');
    await expectNoViolations(page);
    await page.goto('/mon-compte');
    await expectNoViolations(page);
  });

  test('pages de gestion', async ({ page }) => {
    await login(page, accounts.manager);

    for (const path of [
      '/gestion',
      '/gestion/demandes',
      '/gestion/ressources',
      '/gestion/ressources/nouveau',
      '/gestion/journal',
    ]) {
      await page.goto(path);
      await expectNoViolations(page);
    }
  });
});

test('le formulaire de connexion est utilisable au clavier seul', async ({ page }) => {
  await page.goto('/connexion');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Aller au contenu' })).toBeFocused();

  await page.getByLabel('Adresse e-mail').focus();
  await page.keyboard.type(accounts.camille);
  await page.keyboard.press('Tab');
  await page.keyboard.type('Escale-demo-2026!');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL('/');
});

test('les erreurs de formulaire sont annoncées et reliées à leur champ', async ({ page }) => {
  await page.goto('/connexion');
  // La validation native du navigateur est désactivée pour tester les messages du serveur.
  await page.locator('main form').evaluate((form) => ((form as HTMLFormElement).noValidate = true));
  await page.getByLabel('Adresse e-mail').fill('pas-une-adresse');
  await page.getByLabel('Mot de passe').fill('x');
  await page.getByRole('button', { name: 'Se connecter' }).click();

  await expect(page.locator('.alert-error')).toBeFocused();
  await expect(page.getByLabel('Adresse e-mail')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByLabel('Adresse e-mail')).toHaveAccessibleDescription(
    /adresse e-mail valide/,
  );
});
