import { execSync } from 'node:child_process';

export const TEST_DATABASE_URL =
  process.env.DATABASE_URL_TEST ?? 'postgresql://lescale:lescale_dev@localhost:5432/lescale_test';

export const TEST_MONGODB_URI =
  process.env.MONGODB_URI_TEST ?? 'mongodb://localhost:27017/lescale_test';

/** Applique les migrations sur la base de test avant tous les tests d'intégration. */
export default function setup() {
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
  });
}
