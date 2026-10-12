import { randomUUID } from 'node:crypto';
import { conflictError, ruleViolationError } from '@/lib/domain/errors';
import type { MaintenancePeriod, NewMaintenancePeriod } from '@/lib/domain/maintenance';
import type {
  ActivityEntry,
  NewActivityEntry,
  NewNotification,
  Notification,
} from '@/lib/domain/notification';
import {
  activeStatuses,
  type NewReservation,
  type Reservation,
  type ReservationDetails,
} from '@/lib/domain/reservation';
import { slotsConflict } from '@/lib/domain/reservation-rules';
import type { Resource, ResourceCategory, ResourceInput } from '@/lib/domain/resource';
import type { Role, User, UserCredentials } from '@/lib/domain/user';
import type { ActivityLogRepository } from '@/lib/repositories/activity-log-repository';
import type { MaintenanceRepository } from '@/lib/repositories/maintenance-repository';
import type { NotificationRepository } from '@/lib/repositories/notification-repository';
import type { PhotoMimeType, PhotoStorage } from '@/lib/repositories/photo-storage';
import type {
  QuotaGuard,
  ReservationRepository,
  ResourceUsage,
  StatusChange,
} from '@/lib/repositories/reservation-repository';
import type { ResourceFilters, ResourceRepository } from '@/lib/repositories/resource-repository';
import type { NewUser, UserRepository } from '@/lib/repositories/user-repository';

/** Repository des ressources en mémoire, pour les tests unitaires. */
export class MemoryResourceRepository implements ResourceRepository {
  constructor(readonly items: Resource[] = []) {}

  async findAll(filters: ResourceFilters = {}): Promise<Resource[]> {
    const query = filters.query?.trim().toLocaleLowerCase('fr-FR');

    return this.items
      .filter(
        (resource) =>
          (!filters.category || resource.category === filters.category) &&
          (filters.isActive === undefined || resource.isActive === filters.isActive) &&
          (!filters.minCapacity || (resource.capacity ?? 0) >= filters.minCapacity) &&
          (!query ||
            `${resource.name} ${resource.description}`.toLocaleLowerCase('fr-FR').includes(query)),
      )
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
      .map((resource) => ({ ...resource }));
  }

  // Les lectures retournent des copies, comme une base de données : un résultat déjà lu ne change pas.
  async findBySlug(slug: string) {
    const found = this.items.find((resource) => resource.slug === slug);

    return found ? { ...found } : null;
  }

  async findById(id: string) {
    const found = this.items.find((resource) => resource.id === id);

    return found ? { ...found } : null;
  }

  async slugExists(slug: string) {
    return this.items.some((resource) => resource.slug === slug);
  }

  async create(slug: string, input: ResourceInput) {
    const resource: Resource = { ...input, id: randomUUID(), slug, isActive: true };

    this.items.push(resource);

    return { ...resource };
  }

  async update(id: string, input: ResourceInput) {
    const resource = this.items.find((item) => item.id === id)!;

    Object.assign(resource, input);

    return { ...resource };
  }

  async setActive(id: string, isActive: boolean) {
    const resource = this.items.find((item) => item.id === id)!;

    resource.isActive = isActive;

    return { ...resource };
  }
}

/** Repository des comptes en mémoire, pour les tests unitaires. */
export class MemoryUserRepository implements UserRepository {
  constructor(readonly items: UserCredentials[] = []) {}

  private static strip({ passwordHash: _hash, ...user }: UserCredentials): User {
    void _hash;

    return user;
  }

  async findById(id: string) {
    const found = this.items.find((user) => user.id === id);

    return found ? MemoryUserRepository.strip(found) : null;
  }

  async findCredentialsByEmail(email: string) {
    return this.items.find((user) => user.email === email) ?? null;
  }

  async findByIds(ids: readonly string[]) {
    return this.items.filter((user) => ids.includes(user.id)).map(MemoryUserRepository.strip);
  }

  async findAll() {
    return this.items.map(MemoryUserRepository.strip);
  }

  async findActiveByRoles(roles: readonly Role[]) {
    return this.items
      .filter((user) => user.isActive && roles.includes(user.role))
      .map(MemoryUserRepository.strip);
  }

  async countActiveAdmins() {
    return this.items.filter((user) => user.role === 'ADMIN' && user.isActive).length;
  }

  async create(input: NewUser) {
    const user: UserCredentials = { ...input, id: randomUUID(), isActive: true };

    this.items.push(user);

    return MemoryUserRepository.strip(user);
  }

  async updateRole(id: string, role: Role) {
    const user = this.items.find((item) => item.id === id)!;

    user.role = role;

    return MemoryUserRepository.strip(user);
  }

  async setActive(id: string, isActive: boolean) {
    const user = this.items.find((item) => item.id === id)!;

    user.isActive = isActive;

    return MemoryUserRepository.strip(user);
  }

  async updatePasswordHash(id: string, passwordHash: string) {
    this.items.find((item) => item.id === id)!.passwordHash = passwordHash;
  }

  async delete(id: string) {
    this.items.splice(
      this.items.findIndex((item) => item.id === id),
      1,
    );
  }
}

/**
 * Repository des réservations en mémoire. Il reproduit les garanties de la
 * base : refus des chevauchements et quota vérifiés à la création.
 */
export class MemoryReservationRepository implements ReservationRepository {
  readonly items: Reservation[] = [];

  constructor(
    private readonly resources: MemoryResourceRepository,
    private readonly users: MemoryUserRepository,
  ) {}

  private details(reservation: Reservation): ReservationDetails {
    const resource = this.resources.items.find((item) => item.id === reservation.resourceId)!;
    const requester = this.users.items.find((user) => user.id === reservation.userId);

    return {
      ...reservation,
      resource: {
        id: resource.id,
        slug: resource.slug,
        name: resource.name,
        category: resource.category,
        photoUrl: resource.photoUrl,
      },
      requester: requester
        ? {
            id: requester.id,
            firstName: requester.firstName,
            lastName: requester.lastName,
            email: requester.email,
          }
        : null,
    };
  }

  private categoryOf(resourceId: string): ResourceCategory {
    return this.resources.items.find((item) => item.id === resourceId)!.category;
  }

  private isActive(reservation: Reservation) {
    return activeStatuses.includes(reservation.status);
  }

  async createWithQuota(input: NewReservation, quota: QuotaGuard) {
    const held = this.items.filter(
      (item) =>
        item.userId === input.userId &&
        this.isActive(item) &&
        item.endsAt > quota.now &&
        this.categoryOf(item.resourceId) === quota.category,
    ).length;

    if (held >= quota.limit) {
      throw ruleViolationError('Quota atteint.');
    }

    if (
      this.items.some(
        (item) =>
          item.resourceId === input.resourceId && this.isActive(item) && slotsConflict(item, input),
      )
    ) {
      throw conflictError('Ce créneau n’est plus disponible.');
    }

    const reservation: Reservation = {
      ...input,
      id: randomUUID(),
      decisionReason: null,
      decidedAt: null,
      createdAt: new Date(),
    };

    this.items.push(reservation);

    return reservation;
  }

  async findById(id: string) {
    const found = this.items.find((item) => item.id === id);

    return found ? this.details(found) : null;
  }

  async findByUser(userId: string) {
    return this.items
      .filter((item) => item.userId === userId)
      .sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime())
      .map((item) => this.details(item));
  }

  async findPending() {
    return this.items
      .filter((item) => item.status === 'PENDING')
      .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
      .map((item) => this.details(item));
  }

  async countUpcomingByUser(userId: string, category: ResourceCategory, now: Date) {
    return this.items.filter(
      (item) =>
        item.userId === userId &&
        this.isActive(item) &&
        item.endsAt > now &&
        this.categoryOf(item.resourceId) === category,
    ).length;
  }

  async findActiveInRange(resourceId: string, from: Date, to: Date) {
    return this.items
      .filter(
        (item) =>
          item.resourceId === resourceId &&
          this.isActive(item) &&
          item.startsAt < to &&
          item.endsAt > from,
      )
      .map((item) => this.details(item));
  }

  async findUpcomingActiveByUser(userId: string, now: Date) {
    return this.items
      .filter((item) => item.userId === userId && this.isActive(item) && item.endsAt > now)
      .map((item) => this.details(item));
  }

  async findPendingStartedBefore(now: Date) {
    return this.items
      .filter((item) => item.status === 'PENDING' && item.startsAt <= now)
      .map((item) => this.details(item));
  }

  async findAllActiveInRange(from: Date, to: Date) {
    return this.items
      .filter((item) => this.isActive(item) && item.startsAt < to && item.endsAt > from)
      .map((item) => this.details(item));
  }

  async findBusyResourceIds(from: Date, to: Date) {
    return [
      ...new Set(
        this.items
          .filter((item) => this.isActive(item) && item.startsAt < to && item.endsAt > from)
          .map((item) => item.resourceId),
      ),
    ];
  }

  async updateStatus(id: string, change: StatusChange) {
    const reservation = this.items.find((item) => item.id === id)!;

    reservation.status = change.status;
    reservation.decisionReason = change.decisionReason ?? null;
    reservation.decidedAt = change.decidedAt;

    return reservation;
  }

  async topResources(since: Date, limit: number): Promise<ResourceUsage[]> {
    const counts = new Map<string, number>();

    for (const item of this.items) {
      if (item.status === 'CONFIRMED' && item.startsAt >= since) {
        counts.set(item.resourceId, (counts.get(item.resourceId) ?? 0) + 1);
      }
    }

    return [...counts]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([resourceId, count]) => ({
        resourceId,
        name: this.resources.items.find((item) => item.id === resourceId)!.name,
        count,
      }));
  }
}

/** Repository des maintenances en mémoire, pour les tests unitaires. */
export class MemoryMaintenanceRepository implements MaintenanceRepository {
  readonly items: MaintenancePeriod[] = [];

  async create(input: NewMaintenancePeriod) {
    const period: MaintenancePeriod = { ...input, id: randomUUID(), createdAt: new Date() };

    this.items.push(period);

    return period;
  }

  async findById(id: string) {
    return this.items.find((item) => item.id === id) ?? null;
  }

  async findUpcomingByResource(resourceId: string, now: Date) {
    return this.items.filter((item) => item.resourceId === resourceId && item.endsAt > now);
  }

  async findOverlapping(resourceId: string, from: Date, to: Date) {
    return this.items.filter(
      (item) => item.resourceId === resourceId && item.startsAt < to && item.endsAt > from,
    );
  }

  async findBusyResourceIds(from: Date, to: Date) {
    return [
      ...new Set(
        this.items
          .filter((item) => item.startsAt < to && item.endsAt > from)
          .map((i) => i.resourceId),
      ),
    ];
  }

  async delete(id: string) {
    this.items.splice(
      this.items.findIndex((item) => item.id === id),
      1,
    );
  }
}

/** Repository des notifications en mémoire, pour les tests unitaires. */
export class MemoryNotificationRepository implements NotificationRepository {
  readonly items: Notification[] = [];

  async create(input: NewNotification) {
    await this.createMany([input]);
  }

  async createMany(inputs: NewNotification[]) {
    for (const input of inputs) {
      this.items.push({ ...input, id: randomUUID(), readAt: null, createdAt: new Date() });
    }
  }

  async findByUser(userId: string, limit: number) {
    return this.items.filter((item) => item.userId === userId).slice(0, limit);
  }

  async countUnread(userId: string) {
    return this.items.filter((item) => item.userId === userId && !item.readAt).length;
  }

  async markRead(userId: string, notificationId: string, readAt: Date) {
    const item = this.items.find((entry) => entry.id === notificationId && entry.userId === userId);

    if (item) {
      item.readAt = readAt;
    }
  }

  async markAllRead(userId: string, readAt: Date) {
    for (const item of this.items.filter((entry) => entry.userId === userId)) {
      item.readAt = readAt;
    }
  }

  async deleteByUser(userId: string) {
    for (let index = this.items.length - 1; index >= 0; index -= 1) {
      if (this.items[index].userId === userId) {
        this.items.splice(index, 1);
      }
    }
  }
}

/** Repository du journal d'activité en mémoire, pour les tests unitaires. */
export class MemoryActivityLogRepository implements ActivityLogRepository {
  readonly items: ActivityEntry[] = [];

  async append(input: NewActivityEntry) {
    this.items.push({ ...input, id: randomUUID(), createdAt: new Date() });
  }

  async findRecent(limit: number, skip: number) {
    return [...this.items].reverse().slice(skip, skip + limit);
  }

  async count() {
    return this.items.length;
  }
}

/** Stockage de photos en mémoire, pour les tests unitaires. */
export class MemoryPhotoStorage implements PhotoStorage {
  readonly files = new Map<string, PhotoMimeType>();

  async save(_content: Uint8Array, mimeType: PhotoMimeType) {
    const url = `/media/${randomUUID()}`;

    this.files.set(url, mimeType);

    return url;
  }

  async remove(url: string) {
    this.files.delete(url);
  }
}
