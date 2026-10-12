import { ObjectId, type Db } from 'mongodb';
import type { ActivityAction, ActivityEntry, NewActivityEntry } from '@/lib/domain/notification';
import type { ActivityLogRepository } from '../activity-log-repository';

type ActivityDocument = {
  _id: ObjectId;
  authorId: string;
  action: ActivityAction;
  targetType: ActivityEntry['targetType'];
  targetId: string;
  metadata: ActivityEntry['metadata'];
  createdAt: Date;
};

/** Repository du journal d'activité stocké dans MongoDB (collection `activity_logs`). */
export class MongoActivityLogRepository implements ActivityLogRepository {
  /**
   * @param getDb Fournisseur de la base MongoDB, appelé à chaque opération.
   */
  constructor(private readonly getDb: () => Promise<Db>) {}

  async append(input: NewActivityEntry): Promise<void> {
    await (await this.collection()).insertOne({ ...input, createdAt: new Date() } as never);
  }

  async findRecent(limit: number, skip: number): Promise<ActivityEntry[]> {
    const documents = await (
      await this.collection()
    )
      .find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    return documents.map(({ _id, ...rest }) => ({ id: _id.toHexString(), ...rest }));
  }

  async count(): Promise<number> {
    return (await this.collection()).countDocuments();
  }

  private async collection() {
    return (await this.getDb()).collection<ActivityDocument>('activity_logs');
  }
}
