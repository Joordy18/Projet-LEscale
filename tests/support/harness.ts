import type { Resource } from '@/lib/domain/resource';
import { parseLocalDateTime } from '@/lib/domain/time';
import type { Actor, UserCredentials } from '@/lib/domain/user';
import { ActivityService } from '@/lib/services/activity-service';
import { AuthService } from '@/lib/services/auth-service';
import { DashboardService } from '@/lib/services/dashboard-service';
import { MaintenanceService } from '@/lib/services/maintenance-service';
import { NotificationService } from '@/lib/services/notification-service';
import { BcryptPasswordHasher } from '@/lib/services/password-hasher';
import { ReservationService } from '@/lib/services/reservation-service';
import { ResourceService } from '@/lib/services/resource-service';
import { UserService } from '@/lib/services/user-service';
import {
  MemoryActivityLogRepository,
  MemoryMaintenanceRepository,
  MemoryNotificationRepository,
  MemoryPhotoStorage,
  MemoryReservationRepository,
  MemoryResourceRepository,
  MemoryUserRepository,
} from './memory-repositories';

/** Convertit une date locale (Europe/Paris) `YYYY-MM-DDTHH:mm` en instant UTC. */
export function at(value: string): Date {
  const date = parseLocalDateTime(value);

  if (!date) {
    throw new Error(`Date invalide : ${value}`);
  }

  return date;
}

function user(id: string, role: UserCredentials['role'], isActive = true): UserCredentials {
  return {
    id,
    firstName: id,
    lastName: 'Test',
    email: `${id}@escale.test`,
    passwordHash: 'unused',
    role,
    isActive,
  };
}

function resource(id: string, category: Resource['category'], capacity: number | null): Resource {
  return {
    id,
    slug: id,
    name: `Ressource ${id}`,
    category,
    description: 'Description',
    usageConditions: 'Conditions',
    photoUrl: null,
    capacity,
    inventoryCode: null,
    isActive: true,
  };
}

/**
 * Assemble tous les services avec des repositories en mémoire et une horloge
 * réglable. « Maintenant » est le lundi 12 octobre 2026 à 10 h (heure de Paris).
 */
export function createHarness() {
  const clock = { now: at('2026-10-12T10:00') };
  const now = () => clock.now;

  const users = new MemoryUserRepository([
    user('admin', 'ADMIN'),
    user('manager', 'MANAGER'),
    user('alice', 'MEMBER'),
    user('bob', 'MEMBER'),
  ]);
  const resources = new MemoryResourceRepository([
    resource('room', 'ROOM', 12),
    resource('room2', 'ROOM', 8),
    resource('studio', 'STUDIO', 4),
    resource('vehicle', 'VEHICLE', 3),
    resource('equipment', 'EQUIPMENT', null),
    resource('equipment2', 'EQUIPMENT', null),
  ]);
  const reservations = new MemoryReservationRepository(resources, users);
  const maintenances = new MemoryMaintenanceRepository();
  const notificationRepository = new MemoryNotificationRepository();
  const activityRepository = new MemoryActivityLogRepository();
  const photos = new MemoryPhotoStorage();
  const hasher = new BcryptPasswordHasher(4);

  const activity = new ActivityService(activityRepository, users);
  const notifications = new NotificationService(notificationRepository, now);

  return {
    clock,
    repositories: { users, resources, reservations, maintenances, notificationRepository, photos },
    activityRepository,
    hasher,
    actors: {
      admin: { id: 'admin', role: 'ADMIN' } satisfies Actor,
      manager: { id: 'manager', role: 'MANAGER' } satisfies Actor,
      alice: { id: 'alice', role: 'MEMBER' } satisfies Actor,
      bob: { id: 'bob', role: 'MEMBER' } satisfies Actor,
    },
    services: {
      activity,
      notifications,
      auth: new AuthService(users, hasher),
      resources: new ResourceService(resources, reservations, maintenances, photos, activity, now),
      reservations: new ReservationService(
        reservations,
        resources,
        maintenances,
        users,
        notifications,
        activity,
        now,
      ),
      maintenances: new MaintenanceService(
        maintenances,
        reservations,
        resources,
        notifications,
        activity,
        now,
      ),
      users: new UserService(users, reservations, notificationRepository, hasher, activity, now),
      dashboard: new DashboardService(reservations, now),
    },
  };
}

export type Harness = ReturnType<typeof createHarness>;
