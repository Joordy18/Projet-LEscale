import { defineConfig, devices } from '@playwright/test';

const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;

/** Bases dédiées aux tests de bout en bout, distinctes de celles du développement. */
const DATABASE_URL =
  process.env.DATABASE_URL_TEST ?? 'postgresql://lescale:lescale_dev@localhost:5432/lescale_test';
const MONGODB_URI = process.env.MONGODB_URI_TEST ?? 'mongodb://localhost:27017/lescale_test';

export default defineConfig({
  testDir: 'tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL, locale: 'fr-FR', timezoneId: 'Europe/Paris', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'] },
      testMatch: /(parcours|accessibilite)\.spec\.ts/,
    },
  ],
  webServer: {
    // Le site doit être construit avant (npm run build) : on teste la version de production.
    command: `npx next start -p ${PORT}`,
    url: `${baseURL}/connexion`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      DATABASE_URL,
      MONGODB_URI,
      AUTH_SECRET: 'secret-de-test-uniquement-pas-pour-la-production',
      AUTH_URL: baseURL,
      SHOW_DEMO_ACCOUNTS: 'false',
      CRON_SECRET: 'cron-secret-de-test',
      UPLOAD_DIR: '.uploads-e2e',
    },
  },
});
