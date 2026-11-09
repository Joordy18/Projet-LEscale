import { beforeEach, describe, expect, it } from 'vitest';
import { createHarness, type Harness } from '../../support/harness';

let h: Harness;

beforeEach(async () => {
  h = createHarness();
  h.repositories.users.items.find((user) => user.id === 'alice')!.passwordHash =
    await h.hasher.hash('mot-de-passe-valide-1');
});

describe('AuthService.authenticate (EF-01)', () => {
  it('connecte un compte actif avec le bon mot de passe', async () => {
    const user = await h.services.auth.authenticate('alice@escale.test', 'mot-de-passe-valide-1');

    expect(user).toMatchObject({ id: 'alice', role: 'MEMBER' });
    expect(JSON.stringify(user)).not.toContain('passwordHash');
  });

  it('ignore la casse et les espaces de l’adresse e-mail', async () => {
    await expect(
      h.services.auth.authenticate('  ALICE@escale.test ', 'mot-de-passe-valide-1'),
    ).resolves.toMatchObject({ id: 'alice' });
  });

  it('refuse un mauvais mot de passe et un compte inconnu de la même façon', async () => {
    await expect(h.services.auth.authenticate('alice@escale.test', 'faux')).resolves.toBeNull();
    await expect(
      h.services.auth.authenticate('inconnu@escale.test', 'mot-de-passe-valide-1'),
    ).resolves.toBeNull();
  });
});

describe('AuthService.resolveActiveUser', () => {
  it('relit le rôle en base : une promotion ou une rétrogradation est immédiate', async () => {
    await h.services.users.changeRole(h.actors.admin, 'alice', 'MANAGER');

    await expect(h.services.auth.resolveActiveUser('alice')).resolves.toMatchObject({
      role: 'MANAGER',
    });
  });

  it('refuse un compte supprimé', async () => {
    await expect(h.services.auth.resolveActiveUser('inconnu')).resolves.toBeNull();
  });
});
