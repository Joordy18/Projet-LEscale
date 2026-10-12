import { beforeEach, describe, expect, it } from 'vitest';
import type { ResourceInput } from '@/lib/domain/resource';
import { createHarness, at, type Harness } from '../../support/harness';
import { expectDomainError } from '../../support/expect-domain-error';

let h: Harness;

beforeEach(() => {
  h = createHarness();
});

const jpeg = {
  content: new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]),
  declaredType: 'image/jpeg',
};

const input: ResourceInput = {
  name: 'Salle du Cèdre',
  description: 'Une salle calme.',
  category: 'ROOM',
  usageConditions: 'Rangement après usage',
  photoUrl: null,
  capacity: 10,
  inventoryCode: null,
};

describe('ResourceService : catalogue public (EF-04, EF-05)', () => {
  it('exclut les ressources archivées', async () => {
    await h.services.resources.setActive(h.actors.manager, 'room2', false);

    const slugs = (await h.services.resources.listCatalogue()).map((resource) => resource.slug);

    expect(slugs).not.toContain('room2');
    expect(slugs).toContain('room');
  });

  it('filtre par catégorie, mot-clé et capacité', async () => {
    const studios = await h.services.resources.listCatalogue({ category: 'STUDIO' });
    const keyword = await h.services.resources.listCatalogue({ query: '  RESSOURCE ROOM2 ' });
    const large = await h.services.resources.listCatalogue({ category: 'ROOM', minCapacity: 10 });

    expect(studios.map((resource) => resource.slug)).toEqual(['studio']);
    expect(keyword.map((resource) => resource.slug)).toEqual(['room2']);
    expect(large.map((resource) => resource.slug)).toEqual(['room']);
  });

  it('EF-05 : n’affiche que les ressources libres sur une période', async () => {
    await h.services.reservations.reserve(h.actors.alice, {
      resourceId: 'room',
      startsAt: at('2026-10-14T09:00'),
      endsAt: at('2026-10-14T11:00'),
    });
    await h.services.maintenances.schedule(h.actors.manager, {
      resourceId: 'room2',
      startsAt: at('2026-10-14T00:00'),
      endsAt: at('2026-10-15T00:00'),
      reason: 'Nettoyage',
    });

    const free = await h.services.resources.listCatalogue({
      category: 'ROOM',
      availableFrom: at('2026-10-14T10:00'),
      availableTo: at('2026-10-14T12:00'),
    });

    expect(free).toEqual([]);

    const otherDay = await h.services.resources.listCatalogue({
      category: 'ROOM',
      availableFrom: at('2026-10-16T10:00'),
      availableTo: at('2026-10-16T12:00'),
    });

    expect(otherDay).toHaveLength(2);
  });

  it('retourne la fiche d’une ressource active seulement', async () => {
    await expect(h.services.resources.getCatalogueResource('room')).resolves.toMatchObject({
      id: 'room',
    });

    await h.services.resources.setActive(h.actors.manager, 'room', false);

    await expect(h.services.resources.getCatalogueResource('room')).resolves.toBeNull();
    await expect(h.services.resources.getCatalogueResource('inconnue')).resolves.toBeNull();
  });
});

describe('ResourceService : gestion du catalogue (EF-09)', () => {
  it('crée une ressource avec un identifiant lisible unique', async () => {
    const first = await h.services.resources.create(h.actors.manager, input);
    const second = await h.services.resources.create(h.actors.manager, input);

    expect(first.slug).toBe('salle-du-cedre');
    expect(second.slug).toBe('salle-du-cedre-2');
    expect(first.isActive).toBe(true);
  });

  it('refuse un adhérent et un visiteur (sécurité)', async () => {
    await expectDomainError(h.services.resources.create(h.actors.alice, input), 'FORBIDDEN');
    await expectDomainError(h.services.resources.create(null, input), 'UNAUTHENTICATED');
    await expectDomainError(
      h.services.resources.update(h.actors.alice, 'room', input),
      'FORBIDDEN',
    );
    await expectDomainError(
      h.services.resources.setActive(h.actors.alice, 'room', false),
      'FORBIDDEN',
    );
  });

  it('valide les champs obligatoires et la capacité', async () => {
    await expectDomainError(
      h.services.resources.create(h.actors.manager, { ...input, name: '  ' }),
      'VALIDATION',
    );
    await expectDomainError(
      h.services.resources.create(h.actors.manager, { ...input, capacity: null }),
      'VALIDATION',
      /capacité/,
    );
  });

  it('RC-12 : génère un code d’inventaire à 6 caractères pour un équipement', async () => {
    const equipment = await h.services.resources.create(h.actors.manager, {
      ...input,
      name: 'Perceuse',
      category: 'EQUIPMENT',
      capacity: null,
    });

    expect(equipment.inventoryCode).toMatch(/^[A-Z0-9]{6}$/);
  });

  it('conserve le numéro de série saisi (en majuscules) et refuse un format invalide', async () => {
    const equipment = { ...input, name: 'Caméra', category: 'EQUIPMENT' as const, capacity: null };

    await expect(
      h.services.resources.create(h.actors.manager, { ...equipment, inventoryCode: 'sn0042' }),
    ).resolves.toMatchObject({ inventoryCode: 'SN0042' });
    await expectDomainError(
      h.services.resources.create(h.actors.manager, { ...equipment, inventoryCode: 'sn-0042' }),
      'VALIDATION',
      /numéro de série/,
    );
  });

  it('enregistre la photo après avoir vérifié son contenu', async () => {
    const resource = await h.services.resources.create(h.actors.manager, input, jpeg);

    expect(resource.photoUrl).toMatch(/^\/media\//);
    expect(h.repositories.photos.files.size).toBe(1);
  });

  it('refuse une photo falsifiée, vide ou trop lourde', async () => {
    const fake = {
      content: new TextEncoder().encode('<script>alert(1)</script>'),
      declaredType: 'image/png',
    };
    const huge = {
      content: new Uint8Array(2 * 1024 * 1024 + 1).fill(0xff),
      declaredType: 'image/jpeg',
    };

    await expectDomainError(
      h.services.resources.create(h.actors.manager, input, fake),
      'VALIDATION',
    );
    await expectDomainError(
      h.services.resources.create(h.actors.manager, input, { ...jpeg, content: new Uint8Array() }),
      'VALIDATION',
    );
    await expectDomainError(
      h.services.resources.create(h.actors.manager, input, huge),
      'VALIDATION',
    );
    expect(h.repositories.photos.files.size).toBe(0);
  });

  it('remplace l’ancienne photo lors d’une modification', async () => {
    const created = await h.services.resources.create(h.actors.manager, input, jpeg);
    const updated = await h.services.resources.update(
      h.actors.manager,
      created.id,
      { ...input, name: 'Salle du Cèdre bleu' },
      jpeg,
    );

    expect(updated.photoUrl).not.toBe(created.photoUrl);
    expect(h.repositories.photos.files.has(created.photoUrl!)).toBe(false);
    expect(h.repositories.photos.files.has(updated.photoUrl!)).toBe(true);
  });

  it('conserve la photo quand aucune nouvelle photo n’est envoyée', async () => {
    const created = await h.services.resources.create(h.actors.manager, input, jpeg);
    const updated = await h.services.resources.update(h.actors.manager, created.id, input);

    expect(updated.photoUrl).toBe(created.photoUrl);
  });

  it('RC-11 : archive une ressource sans réservation à venir, puis la rétablit', async () => {
    await h.services.resources.setActive(h.actors.manager, 'room2', false);

    await expect(
      h.services.resources.getForManagement(h.actors.manager, 'room2'),
    ).resolves.toMatchObject({
      isActive: false,
    });
    await expect(
      h.services.resources.setActive(h.actors.manager, 'room2', true),
    ).resolves.toMatchObject({ isActive: true });
  });

  it('refuse d’archiver une ressource qui a des réservations à venir', async () => {
    await h.services.reservations.reserve(h.actors.alice, {
      resourceId: 'room',
      startsAt: at('2026-10-14T09:00'),
      endsAt: at('2026-10-14T11:00'),
    });

    await expectDomainError(
      h.services.resources.setActive(h.actors.manager, 'room', false),
      'CONFLICT',
      /réservations à venir/,
    );
  });

  it('journalise les actions du gestionnaire (B08)', async () => {
    await h.services.resources.create(h.actors.manager, input);

    expect(h.activityRepository.items).toContainEqual(
      expect.objectContaining({ authorId: 'manager', action: 'RESOURCE_CREATED' }),
    );
  });
});
