import { beforeEach, describe, expect, it } from 'vitest';
import { createHarness, at, type Harness } from '../../support/harness';
import { expectDomainError } from '../../support/expect-domain-error';

let h: Harness;

beforeEach(async () => {
  h = createHarness();

  const hash = await h.hasher.hash('mot-de-passe-valide-1');

  for (const user of h.repositories.users.items) {
    user.passwordHash = hash;
  }
});

const newAccount = {
  firstName: 'Camille',
  lastName: 'Martin',
  email: '  Camille.Martin@Escale.test ',
  password: 'un-mot-de-passe-solide',
  role: 'MEMBER' as const,
};

describe('UserService.create (EF-02)', () => {
  it('crée un compte avec un mot de passe haché et une adresse normalisée', async () => {
    const user = await h.services.users.create(h.actors.admin, newAccount);
    const stored = h.repositories.users.items.find((item) => item.id === user.id)!;

    expect(user.email).toBe('camille.martin@escale.test');
    expect(stored.passwordHash).not.toContain('un-mot-de-passe-solide');
    await expect(h.hasher.verify('un-mot-de-passe-solide', stored.passwordHash)).resolves.toBe(
      true,
    );
  });

  it('refuse un gestionnaire ou un adhérent (sécurité)', async () => {
    await expectDomainError(h.services.users.create(h.actors.manager, newAccount), 'FORBIDDEN');
    await expectDomainError(h.services.users.create(h.actors.alice, newAccount), 'FORBIDDEN');
    await expectDomainError(h.services.users.create(null, newAccount), 'UNAUTHENTICATED');
  });

  it('refuse une adresse déjà utilisée et un mot de passe trop court', async () => {
    await h.services.users.create(h.actors.admin, newAccount);

    await expectDomainError(h.services.users.create(h.actors.admin, newAccount), 'CONFLICT');
    await expectDomainError(
      h.services.users.create(h.actors.admin, {
        ...newAccount,
        email: 'autre@escale.test',
        password: 'court',
      }),
      'VALIDATION',
    );
  });
});

describe('UserService.changeRole (EF-02)', () => {
  it('attribue et retire le rôle de gestionnaire', async () => {
    await expect(
      h.services.users.changeRole(h.actors.admin, 'alice', 'MANAGER'),
    ).resolves.toMatchObject({ role: 'MANAGER' });
    await expect(
      h.services.users.changeRole(h.actors.admin, 'alice', 'MEMBER'),
    ).resolves.toMatchObject({ role: 'MEMBER' });
  });

  it('refuse à un gestionnaire de changer un rôle (sécurité)', async () => {
    await expectDomainError(
      h.services.users.changeRole(h.actors.manager, 'alice', 'ADMIN'),
      'FORBIDDEN',
    );
  });

  it('conserve toujours un administrateur actif', async () => {
    await expectDomainError(
      h.services.users.changeRole(h.actors.admin, 'admin', 'MEMBER'),
      'CONFLICT',
    );
  });
});

describe('UserService.setActive (R7)', () => {
  it('désactive un compte et annule ses réservations à venir', async () => {
    const reservation = await h.services.reservations.reserve(h.actors.alice, {
      resourceId: 'room',
      startsAt: at('2026-10-14T09:00'),
      endsAt: at('2026-10-14T11:00'),
    });

    await h.services.users.setActive(h.actors.admin, 'alice', false);

    expect(h.repositories.users.items.find((user) => user.id === 'alice')?.isActive).toBe(false);
    expect(
      h.repositories.reservations.items.find((item) => item.id === reservation.id)?.status,
    ).toBe('CANCELLED');
  });

  it('un compte désactivé ne peut plus se connecter', async () => {
    await expect(
      h.services.auth.authenticate('alice@escale.test', 'mot-de-passe-valide-1'),
    ).resolves.toMatchObject({ id: 'alice' });

    await h.services.users.setActive(h.actors.admin, 'alice', false);

    await expect(
      h.services.auth.authenticate('alice@escale.test', 'mot-de-passe-valide-1'),
    ).resolves.toBeNull();
    await expect(h.services.auth.resolveActiveUser('alice')).resolves.toBeNull();
  });

  it('peut être annulée par une réactivation', async () => {
    await h.services.users.setActive(h.actors.admin, 'alice', false);
    await h.services.users.setActive(h.actors.admin, 'alice', true);

    await expect(h.services.auth.resolveActiveUser('alice')).resolves.toMatchObject({
      id: 'alice',
    });
  });

  it('interdit à l’administrateur de se désactiver lui-même', async () => {
    await expectDomainError(
      h.services.users.setActive(h.actors.admin, 'admin', false),
      'FORBIDDEN',
    );
  });
});

describe('UserService : droits de la personne connectée (EF-03, RGPD)', () => {
  it('retourne uniquement les données de la personne connectée', async () => {
    await h.services.reservations.reserve(h.actors.alice, {
      resourceId: 'room',
      startsAt: at('2026-10-14T09:00'),
      endsAt: at('2026-10-14T11:00'),
    });
    await h.services.reservations.reserve(h.actors.bob, {
      resourceId: 'room2',
      startsAt: at('2026-10-14T09:00'),
      endsAt: at('2026-10-14T11:00'),
    });

    const data = await h.services.users.getMyData(h.actors.alice);

    expect(data.profile.id).toBe('alice');
    expect(data.reservations).toHaveLength(1);
    expect(data.reservations[0].userId).toBe('alice');
    expect(JSON.stringify(data)).not.toContain('passwordHash');
  });

  it('supprime le compte après confirmation du mot de passe', async () => {
    const reservation = await h.services.reservations.reserve(h.actors.alice, {
      resourceId: 'room',
      startsAt: at('2026-10-14T09:00'),
      endsAt: at('2026-10-14T11:00'),
    });

    await expectDomainError(h.services.users.deleteMyAccount(h.actors.alice, 'faux'), 'FORBIDDEN');
    await h.services.users.deleteMyAccount(h.actors.alice, 'mot-de-passe-valide-1');

    expect(h.repositories.users.items.some((user) => user.id === 'alice')).toBe(false);
    expect(
      h.repositories.reservations.items.find((item) => item.id === reservation.id)?.status,
    ).toBe('CANCELLED');
    expect(
      h.repositories.notificationRepository.items.filter((item) => item.userId === 'alice'),
    ).toEqual([]);
  });

  it('refuse la suppression du dernier administrateur', async () => {
    await expectDomainError(
      h.services.users.deleteMyAccount(h.actors.admin, 'mot-de-passe-valide-1'),
      'CONFLICT',
    );
  });

  it('change le mot de passe après vérification de l’ancien', async () => {
    await expectDomainError(
      h.services.users.changeMyPassword(h.actors.alice, 'faux', 'nouveau-mot-de-passe-1'),
      'FORBIDDEN',
    );
    await expectDomainError(
      h.services.users.changeMyPassword(h.actors.alice, 'mot-de-passe-valide-1', 'court'),
      'VALIDATION',
    );
    await h.services.users.changeMyPassword(
      h.actors.alice,
      'mot-de-passe-valide-1',
      'nouveau-mot-de-passe-1',
    );

    await expect(
      h.services.auth.authenticate('alice@escale.test', 'nouveau-mot-de-passe-1'),
    ).resolves.toMatchObject({ id: 'alice' });
  });
});
