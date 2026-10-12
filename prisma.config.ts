import { config } from 'dotenv';
import { defineConfig, env } from 'prisma/config';

// Le CLI Prisma ne charge pas les fichiers d'environnement : on réutilise ceux de Next.js.
config({ path: ['.env.local', '.env'], quiet: true });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
