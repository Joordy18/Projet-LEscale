import { MongoClient, type Db } from 'mongodb';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ACTIVITY_RETENTION_SECONDS } from '@/lib/repositories/mongo/client';
import { MongoActivityLogRepository } from '@/lib/repositories/mongo/mongo-activity-log-repository';
import { MongoNotificationRepository } from '@/lib/repositories/mongo/mongo-notification-repository';
import { TEST_MONGODB_URI } from './global-setup';

let client: MongoClient;
let db: Db;
let notifications: MongoNotificationRepository;
let activity: MongoActivityLogRepository;

beforeAll(async () => {
  client = new MongoClient(TEST_MONGODB_URI);
  db = client.db();
  notifications = new MongoNotificationRepository(async () => db);
  activity = new MongoActivityLogRepository(async () => db);
});

afterAll(async () => {
  await client.close();
});

beforeEach(async () => {
  await db.collection('notifications').deleteMany({});
  await db.collection('activity_logs').deleteMany({});
});

const notification = (userId: string, title = 'Titre') => ({
  userId,
  type: 'REQUEST_APPROVED' as const,
  title,
  message: 'Message',
  link: '/reservations',
});

describe('MongoNotificationRepository (B07)', () => {
  it('enregistre, liste et compte les notifications d’un utilisateur', async () => {
    await notifications.createMany([
      notification('u1', 'A'),
      notification('u1', 'B'),
      notification('u2'),
    ]);

    const mine = await notifications.findByUser('u1', 10);

    expect(mine).toHaveLength(2);
    expect(mine[0]).toMatchObject({ userId: 'u1', readAt: null });
    expect(typeof mine[0].id).toBe('string');
    await expect(notifications.countUnread('u1')).resolves.toBe(2);
    await expect(notifications.countUnread('u2')).resolves.toBe(1);
  });

  it('marque comme lue seulement la notification de son propriétaire', async () => {
    await notifications.create(notification('u1'));

    const [item] = await notifications.findByUser('u1', 10);

    await notifications.markRead('u2', item.id, new Date());
    await expect(notifications.countUnread('u1')).resolves.toBe(1);

    await notifications.markRead('u1', item.id, new Date());
    await expect(notifications.countUnread('u1')).resolves.toBe(0);
  });

  it('ignore un identifiant de notification invalide', async () => {
    await expect(
      notifications.markRead('u1', 'pas-un-objectid', new Date()),
    ).resolves.toBeUndefined();
  });

  it('marque tout comme lu et supprime les notifications d’un utilisateur', async () => {
    await notifications.createMany([notification('u1'), notification('u1')]);
    await notifications.markAllRead('u1', new Date());
    await expect(notifications.countUnread('u1')).resolves.toBe(0);

    await notifications.deleteByUser('u1');
    await expect(notifications.findByUser('u1', 10)).resolves.toEqual([]);
  });
});

describe('MongoActivityLogRepository (B08)', () => {
  it('conserve auteur, action, cible et date, du plus récent au plus ancien', async () => {
    await activity.append({
      authorId: 'manager',
      action: 'RESOURCE_CREATED',
      targetType: 'Resource',
      targetId: 'r1',
      metadata: { name: 'Salle' },
    });
    await new Promise((resolve) => setTimeout(resolve, 10));
    await activity.append({
      authorId: 'manager',
      action: 'RESERVATION_CANCELLED',
      targetType: 'Reservation',
      targetId: 'b1',
      metadata: {},
    });

    const entries = await activity.findRecent(10, 0);

    expect(entries.map((entry) => entry.action)).toEqual([
      'RESERVATION_CANCELLED',
      'RESOURCE_CREATED',
    ]);
    expect(entries[1]).toMatchObject({
      authorId: 'manager',
      targetId: 'r1',
      metadata: { name: 'Salle' },
    });
    expect(entries[0].createdAt).toBeInstanceOf(Date);
    await expect(activity.count()).resolves.toBe(2);
    await expect(activity.findRecent(1, 1)).resolves.toHaveLength(1);
  });

  it('configure la conservation d’un an par un index TTL', async () => {
    await db
      .collection('activity_logs')
      .createIndex({ createdAt: 1 }, { expireAfterSeconds: ACTIVITY_RETENTION_SECONDS });

    const indexes = await db.collection('activity_logs').indexes();
    const ttl = indexes.find((index) => index.expireAfterSeconds !== undefined);

    expect(ttl?.expireAfterSeconds).toBe(365 * 24 * 60 * 60);
  });
});
