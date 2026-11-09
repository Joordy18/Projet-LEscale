import { ObjectId, type Db } from 'mongodb';
import type { NewNotification, Notification, NotificationType } from '@/lib/domain/notification';
import type { NotificationRepository } from '../notification-repository';

type NotificationDocument = {
  _id: ObjectId;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  readAt: Date | null;
  createdAt: Date;
};

function toNotification(document: NotificationDocument): Notification {
  const { _id, ...rest } = document;

  return { id: _id.toHexString(), ...rest };
}

/** Repository des notifications stockées dans MongoDB (collection `notifications`). */
export class MongoNotificationRepository implements NotificationRepository {
  /**
   * @param getDb Fournisseur de la base MongoDB, appelé à chaque opération.
   */
  constructor(private readonly getDb: () => Promise<Db>) {}

  async create(input: NewNotification): Promise<void> {
    await this.createMany([input]);
  }

  async createMany(inputs: NewNotification[]): Promise<void> {
    const createdAt = new Date();

    await (
      await this.collection()
    ).insertMany(inputs.map((input) => ({ ...input, readAt: null, createdAt })) as never[]);
  }

  async findByUser(userId: string, limit: number): Promise<Notification[]> {
    const documents = await (
      await this.collection()
    )
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    return documents.map(toNotification);
  }

  async countUnread(userId: string): Promise<number> {
    return (await this.collection()).countDocuments({ userId, readAt: null });
  }

  async markRead(userId: string, notificationId: string, readAt: Date): Promise<void> {
    if (!ObjectId.isValid(notificationId)) {
      return;
    }

    // Le filtre sur `userId` empêche de marquer la notification d'un autre utilisateur.
    await (
      await this.collection()
    ).updateOne({ _id: new ObjectId(notificationId), userId, readAt: null }, { $set: { readAt } });
  }

  async markAllRead(userId: string, readAt: Date): Promise<void> {
    await (await this.collection()).updateMany({ userId, readAt: null }, { $set: { readAt } });
  }

  async deleteByUser(userId: string): Promise<void> {
    await (await this.collection()).deleteMany({ userId });
  }

  private async collection() {
    return (await this.getDb()).collection<NotificationDocument>('notifications');
  }
}
