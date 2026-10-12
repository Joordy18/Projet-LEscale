import { MongoClient, type Db } from 'mongodb';

/** Durée de conservation du journal d'activité : un an (expression de besoin, section 7). */
export const ACTIVITY_RETENTION_SECONDS = 365 * 24 * 60 * 60;

const globalForMongo = globalThis as unknown as { mongoDb?: Promise<Db> };

async function connect(): Promise<Db> {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error('La variable d’environnement MONGODB_URI est absente.');
  }

  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 3000 });
  const db = client.db();

  await Promise.all([
    db.collection('notifications').createIndex({ userId: 1, createdAt: -1 }),
    db.collection('notifications').createIndex({ userId: 1, readAt: 1 }),
    db.collection('activity_logs').createIndex({ createdAt: -1 }),
    // Index TTL : MongoDB supprime lui-même les entrées de plus d'un an.
    db
      .collection('activity_logs')
      .createIndex({ createdAt: 1 }, { expireAfterSeconds: ACTIVITY_RETENTION_SECONDS }),
  ]);

  return db;
}

/**
 * Retourne la base MongoDB partagée. La connexion est ouverte à la première
 * utilisation, puis conservée sur `globalThis` pour survivre au rechargement
 * à chaud du mode développement. En cas d'échec, la prochaine demande retente.
 */
export function getMongoDb(): Promise<Db> {
  if (!globalForMongo.mongoDb) {
    globalForMongo.mongoDb = connect().catch((error: unknown) => {
      globalForMongo.mongoDb = undefined;
      throw error;
    });
  }

  return globalForMongo.mongoDb;
}
