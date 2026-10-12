import { expect, test } from '@playwright/test';
import { accounts, login, logout, PASSWORD } from './support';

// Tests de sécurité automatisés (CDC 6.1) : contrôle des droits côté serveur, redirections, en-têtes.
test.describe('accès aux pages protégées', () => {
  test('un visiteur est renvoyé vers la connexion', async ({ page }) => {
    for (const path of [
      '/reservations',
      '/gestion/demandes',
      '/gestion',
      '/admin/comptes',
      '/mon-compte',
    ]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/connexion\?next=/);
    }
  });

  test('un adhérent n’accède ni à la gestion ni à l’administration', async ({ page }) => {
    await login(page, accounts.camille);

    for (const path of [
      '/gestion',
      '/gestion/demandes',
      '/gestion/ressources',
      '/gestion/ressources/nouveau',
      '/gestion/journal',
      '/admin/comptes',
    ]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/acces-refuse/);
    }

    await expect(page.getByRole('link', { name: 'Demandes' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Comptes' })).toHaveCount(0);
  });

  test('un gestionnaire n’accède pas à l’administration des comptes', async ({ page }) => {
    await login(page, accounts.manager);
    await page.goto('/admin/comptes');
    await expect(page).toHaveURL(/\/acces-refuse/);
    await page.goto('/gestion/journal');
    await expect(page.getByRole('heading', { name: 'Journal d’activité' })).toBeVisible();
  });

  test('un adhérent ne voit que ses propres réservations', async ({ page }) => {
    await login(page, accounts.ines);
    await page.goto('/reservations');

    // Ines n'a qu'une réservation de démonstration (Atelier des possibles).
    await expect(page.getByRole('heading', { name: 'Atelier des possibles' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Studio des voix' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Véhicule utilitaire' })).toHaveCount(0);
  });

  test('un adhérent ne peut pas ouvrir le détail d’une demande de quelqu’un d’autre', async ({
    page,
    request,
  }) => {
    await login(page, accounts.manager);
    await page.goto('/gestion/demandes');
    await page
      .getByRole('link', { name: /Traiter/ })
      .first()
      .click();

    const detailUrl = page.url();

    await logout(page);
    await login(page, accounts.ines);
    await page.goto(detailUrl);
    await expect(page).toHaveURL(/\/acces-refuse/);
    void request;
  });
});

test.describe('connexion', () => {
  test('la page de retour ne peut pas rediriger vers un autre site (redirection ouverte)', async ({
    page,
  }) => {
    await login(page, accounts.camille, PASSWORD, '//evil.example/phishing');
    await expect(page).not.toHaveURL(/evil\.example/);
    await expect(new URL(page.url()).host).toBe('localhost:3100');
  });

  test('un mauvais mot de passe et un compte inconnu reçoivent le même message', async ({
    page,
  }) => {
    await login(page, accounts.camille, 'mauvais-mot-de-passe-1');
    await expect(page.locator('.alert-error')).toContainText(
      'Adresse e-mail ou mot de passe incorrect',
    );

    await login(page, 'inconnu@lescale.test', 'mauvais-mot-de-passe-1');
    await expect(page.locator('.alert-error')).toContainText(
      'Adresse e-mail ou mot de passe incorrect',
    );
  });

  test('les tentatives répétées sont bloquées temporairement', async ({ browser }) => {
    const context = await browser.newContext({
      baseURL: 'http://localhost:3100',
      extraHTTPHeaders: { 'x-forwarded-for': '203.0.113.50' },
    });
    const page = await context.newPage();

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await login(page, 'bourrage@lescale.test', `essai-numero-${attempt}-xx`);
      await expect(page.locator('.alert-error')).toBeVisible();
    }

    await login(page, 'bourrage@lescale.test', 'essai-numero-6-xx');
    await expect(page.locator('.alert-error')).toContainText('Trop de tentatives');
    await context.close();
  });
});

test.describe('API et en-têtes', () => {
  test('la tâche d’expiration exige son secret', async ({ request }) => {
    expect((await request.post('/api/jobs/expire-requests')).status()).toBe(401);
    expect(
      (
        await request.post('/api/jobs/expire-requests', {
          headers: { Authorization: 'Bearer mauvais-secret' },
        })
      ).status(),
    ).toBe(401);

    const ok = await request.post('/api/jobs/expire-requests', {
      headers: { Authorization: 'Bearer cron-secret-de-test' },
    });

    expect(ok.status()).toBe(200);
    expect(await ok.json()).toHaveProperty('expired');
  });

  test('le service de photos refuse de sortir de son dossier', async ({ request }) => {
    for (const file of ['..%2F..%2Fpackage.json', '..%5C..%5Cpackage.json', 'inconnu.png']) {
      expect((await request.get(`/media/${file}`)).status()).toBe(404);
    }
  });

  test('chaque page envoie une Content Security Policy avec un nonce différent', async ({
    request,
  }) => {
    const first = await request.get('/connexion');
    const second = await request.get('/connexion');
    const policy = first.headers()['content-security-policy'] ?? '';

    expect(policy).toContain("default-src 'self'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).not.toContain("script-src 'self' 'unsafe-inline'");
    expect(policy.match(/nonce-([\w=+/]+)/)?.[1]).not.toBe(
      second.headers()['content-security-policy']?.match(/nonce-([\w=+/]+)/)?.[1],
    );
    expect(first.headers()['x-content-type-options']).toBe('nosniff');
    expect(first.headers()['x-frame-options']).toBe('DENY');
    expect(first.headers()['x-powered-by']).toBeUndefined();
  });

  test('l’API du catalogue valide ses paramètres', async ({ request }) => {
    expect((await request.get('/api/resources?category=JARDIN')).status()).toBe(400);
    expect((await request.get(`/api/resources?q=${'a'.repeat(101)}`)).status()).toBe(400);

    const ok = await request.get('/api/resources?category=STUDIO');

    expect(ok.status()).toBe(200);
    expect((await ok.json()).count).toBe(1);
  });
});
