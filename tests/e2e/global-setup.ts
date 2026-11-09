import { execSync } from 'node:child_process';
import { MongoClient } from 'mongodb';
import { Client } from 'pg';

const DATABASE_URL =
  process.env.DATABASE_URL_TEST ?? 'postgresql://lescale:lescale_dev@localhost:5432/lescale_test';
const MONGODB_URI = process.env.MONGODB_URI_TEST ?? 'mongodb://localhost:27017/lescale_test';

/** Prépare les bases de test : migrations, tables et collections remises à zéro, puis jeu d'essai. */
export default async function globalSetup() {
  const env = { ...process.env, DATABASE_URL, SEED_PASSWORD: 'Escale-demo-2026!' };

  execSync('npx prisma migrate deploy', { stdio: 'inherit', env });

  const postgres = new Client({ connectionString: DATABASE_URL });

  await postgres.connect();
  // Repart d'une base vide pour que les réservations de démonstration soient recréées.
  await postgres.query(
    'TRUNCATE reservations, maintenance_periods, resources, users RESTART IDENTITY CASCADE',
  );
  await postgres.end();

  execSync('npx prisma db seed', { stdio: 'inherit', env });

  const mongo = new MongoClient(MONGODB_URI);

  try {
    const db = mongo.db();

    await db.collection('notifications').deleteMany({});
    await db.collection('activity_logs').deleteMany({});
  } finally {
    await mongo.close();
  }
}
