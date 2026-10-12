/**
 * Jeu d'essai de L'Escale : comptes des trois rôles, les ressources décrites par
 * le client (4 salles, 1 studio, 1 véhicule, une trentaine d'équipements) et
 * quelques réservations pour la démonstration.
 *
 * Le script est rejouable : les comptes et les ressources sont mis à jour, les
 * réservations de démonstration ne sont créées que si la table est vide.
 *
 * Mot de passe des comptes de démonstration : variable SEED_PASSWORD, ou
 * « Escale-demo-2026! » par défaut. À ne jamais utiliser en production.
 */
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import { config } from 'dotenv';
import { DAY_MS, parseLocalDateTime, toLocalInputValue } from '../lib/domain/time';
import { PrismaClient } from '../lib/repositories/postgres/generated/client';
import type { ResourceCategory, Role } from '../lib/repositories/postgres/generated/client';

config({ path: ['.env.local', '.env'], quiet: true });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('La variable d’environnement DATABASE_URL est absente.');
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const demoPassword = process.env.SEED_PASSWORD ?? 'Escale-demo-2026!';

const users: { firstName: string; lastName: string; email: string; role: Role }[] = [
  { firstName: 'Alice', lastName: 'Moreau', email: 'admin@lescale.test', role: 'ADMIN' },
  { firstName: 'Hugo', lastName: 'Petit', email: 'gestionnaire@lescale.test', role: 'MANAGER' },
  {
    firstName: 'Camille',
    lastName: 'Martin',
    email: 'camille.martin@lescale.test',
    role: 'MEMBER',
  },
  { firstName: 'Lucas', lastName: 'Bernard', email: 'lucas.bernard@lescale.test', role: 'MEMBER' },
  { firstName: 'Inès', lastName: 'Garcia', email: 'ines.garcia@lescale.test', role: 'MEMBER' },
];

type SeedResource = {
  slug: string;
  name: string;
  category: ResourceCategory;
  description: string;
  usageConditions: string;
  capacity: number | null;
  photoUrl?: string;
  inventoryCode?: string;
};

const rooms: SeedResource[] = [
  {
    slug: 'salle-des-tilleuls',
    name: 'Salle des Tilleuls',
    category: 'ROOM',
    description: 'Un espace lumineux pour vos réunions et ateliers en petit groupe.',
    usageConditions: 'Usage associatif',
    capacity: 12,
    photoUrl: '/resources/salle-tilleuls.jpeg',
  },
  {
    slug: 'atelier-des-possibles',
    name: 'Atelier des possibles',
    category: 'ROOM',
    description: 'Un lieu modulable pour créer, partager et préparer vos événements.',
    usageConditions: 'Remise en état après usage',
    capacity: 24,
    photoUrl: '/resources/atelier.jpeg',
  },
  {
    slug: 'salle-des-erables',
    name: 'Salle des Érables',
    category: 'ROOM',
    description: 'Une salle calme et équipée d’un écran, idéale pour les réunions d’équipe.',
    usageConditions: 'Capacité limitée à 8 personnes',
    capacity: 8,
  },
  {
    slug: 'salle-des-charmilles',
    name: 'Salle des Charmilles',
    category: 'ROOM',
    description: 'Une petite salle pour les rendez-vous et les entretiens.',
    usageConditions: 'Réservée aux rendez-vous de petit groupe',
    capacity: 6,
  },
];

const otherSpaces: SeedResource[] = [
  {
    slug: 'studio-des-voix',
    name: 'Studio des voix',
    category: 'STUDIO',
    description: 'Un espace calme pour enregistrer un podcast ou une interview.',
    usageConditions: 'Initiation requise',
    capacity: 4,
    photoUrl: '/resources/studio.jpeg',
  },
  {
    slug: 'vehicule-utilitaire',
    name: 'Véhicule utilitaire',
    category: 'VEHICLE',
    description: 'Un utilitaire pour transporter du matériel ou préparer un événement.',
    usageConditions: 'Permis B requis',
    capacity: 3,
  },
];

const equipmentNames: [string, string, string, string?][] = [
  [
    'Vidéoprojecteur mobile',
    'Projetez vos présentations avec un équipement facile à installer.',
    'Retrait et retour au comptoir',
    '/resources/projecteur.jpeg',
  ],
  [
    'Vidéoprojecteur compact',
    'Un modèle léger pour les présentations en salle.',
    'Retrait et retour au comptoir',
    '/resources/projecteur.jpeg',
  ],
  [
    'Kit de sonorisation',
    'Une solution compacte pour sonoriser vos petites rencontres.',
    'Formation requise',
    '/resources/sonorisation.jpeg',
  ],
  [
    'Enceinte portable',
    'Une enceinte sans fil pour vos événements en plein air.',
    'Retour avec le chargeur',
  ],
  [
    'Enceinte de monitoring',
    'Une enceinte de retour pour les répétitions.',
    'Retour avec les câbles',
  ],
  ['Microphone sans fil', 'Un micro main avec son récepteur.', 'Piles fournies'],
  ['Micro-cravate', 'Un micro discret pour les interviews.', 'Retour avec la pochette'],
  ['Appareil photo reflex', 'Un reflex avec objectif standard.', 'Carte mémoire à fournir'],
  ['Appareil photo hybride', 'Un hybride léger avec deux objectifs.', 'Carte mémoire à fournir'],
  ['Caméscope', 'Une caméra vidéo pour vos tournages.', 'Batterie chargée au retour'],
  ['Trépied photo', 'Un trépied stable jusqu’à 5 kg.', 'Retour dans sa housse'],
  ['Kit d’éclairage', 'Deux projecteurs LED avec pieds.', 'Manipuler avec précaution'],
  [
    'Perceuse-visseuse',
    'Une perceuse sans fil avec coffret d’embouts.',
    'Équipements de protection requis',
  ],
  ['Ponceuse orbitale', 'Pour les travaux de finition.', 'Équipements de protection requis'],
  ['Scie sauteuse', 'Pour découper bois et panneaux.', 'Initiation requise'],
  ['Caisse à outils', 'Les outils de base pour petites réparations.', 'Retour complet'],
  ['Escabeau', 'Un escabeau de 5 marches.', 'Usage sur sol plat uniquement'],
  ['Échelle télescopique', 'Une échelle jusqu’à 3,8 m.', 'Initiation requise'],
  ['Table pliante', 'Une table de réception de 180 cm.', 'Retrait au comptoir'],
  ['Lot de 10 chaises pliantes', 'Pour aménager un espace temporaire.', 'Retour par lot complet'],
  ['Barnum 3 x 3 m', 'Un abri pour vos événements extérieurs.', 'Montage à deux personnes'],
  ['Rallonge électrique 25 m', 'Une rallonge avec enrouleur.', 'Usage en extérieur autorisé'],
  ['Multiprise 6 prises', 'Une multiprise avec parafoudre.', 'Retour avec son câble'],
  [
    'Ordinateur portable',
    'Un ordinateur à usage sur place ou en prêt.',
    'Pièce d’identité déposée',
  ],
  ['Tablette graphique', 'Pour le dessin et la retouche d’images.', 'Retour avec le stylet'],
  ['Imprimante photo portable', 'Impression de photos au format 10 x 15.', 'Papier fourni'],
  ['Paperboard', 'Un paperboard avec bloc de feuilles.', 'Retour avec les marqueurs'],
  ['Écran de projection mobile', 'Un écran sur pied de 2 mètres.', 'Retour dans sa housse'],
  ['Valise de jeux de société', 'Une sélection de jeux pour vos animations.', 'Retour complet'],
  [
    'Lot de 4 talkies-walkies',
    'Pour coordonner vos équipes sur un événement.',
    'Retour avec les chargeurs',
  ],
];

const equipment: SeedResource[] = equipmentNames.map(
  ([name, description, usageConditions, photoUrl], index) => ({
    slug: name
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, ''),
    name,
    category: 'EQUIPMENT',
    description,
    usageConditions,
    capacity: null,
    photoUrl,
    inventoryCode: `EQ${String(index + 1).padStart(4, '0')}`,
  }),
);

/** Prochain jour ouvré (lundi à samedi) à partir de `offset` jours, à l'heure donnée. */
function slot(offsetDays: number, from: string, to: string): { startsAt: Date; endsAt: Date } {
  let day = new Date(Date.now() + offsetDays * DAY_MS);

  // Évite le dimanche, jour de fermeture.
  while (
    new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Paris', weekday: 'short' }).format(day) ===
    'Sun'
  ) {
    day = new Date(day.getTime() + DAY_MS);
  }

  const date = toLocalInputValue(day).slice(0, 10);
  const startsAt = parseLocalDateTime(`${date}T${from}`);
  const endsAt = parseLocalDateTime(`${date}T${to}`);

  if (!startsAt || !endsAt) {
    throw new Error('Créneau de démonstration invalide.');
  }

  return { startsAt, endsAt };
}

async function main() {
  // Utilisé au démarrage Docker : ne recharge pas le jeu d'essai sur une base déjà utilisée.
  if (process.env.SEED_ONLY_IF_EMPTY === 'true' && (await prisma.user.count()) > 0) {
    console.log('La base contient déjà des comptes : jeu d’essai ignoré.');
    return;
  }

  const passwordHash = await bcrypt.hash(demoPassword, 12);

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: true,
      },
      create: { ...user, passwordHash },
    });
  }

  for (const resource of [...rooms, ...otherSpaces, ...equipment]) {
    const { slug, ...data } = resource;
    const fields = {
      ...data,
      photoUrl: data.photoUrl ?? null,
      inventoryCode: data.inventoryCode ?? null,
    };

    await prisma.resource.upsert({
      where: { slug },
      update: fields,
      create: { slug, ...fields },
    });
  }

  if ((await prisma.reservation.count()) > 0) {
    console.log('Des réservations existent déjà : réservations de démonstration ignorées.');
    return;
  }

  const [camille, lucas, ines] = await Promise.all(
    ['camille.martin@lescale.test', 'lucas.bernard@lescale.test', 'ines.garcia@lescale.test'].map(
      (email) => prisma.user.findUniqueOrThrow({ where: { email } }),
    ),
  );
  const bySlug = async (slug: string) => prisma.resource.findUniqueOrThrow({ where: { slug } });
  const tilleuls = await bySlug('salle-des-tilleuls');
  const atelier = await bySlug('atelier-des-possibles');
  const studio = await bySlug('studio-des-voix');
  const vehicule = await bySlug('vehicule-utilitaire');
  const projecteur = await bySlug('videoprojecteur-mobile');

  const past = slot(-9, '09:00', '11:00');
  const demo = [
    {
      resourceId: tilleuls.id,
      userId: camille.id,
      ...slot(3, '09:00', '11:00'),
      status: 'CONFIRMED' as const,
    },
    {
      resourceId: tilleuls.id,
      userId: lucas.id,
      ...slot(3, '14:00', '16:00'),
      status: 'CONFIRMED' as const,
    },
    {
      resourceId: atelier.id,
      userId: ines.id,
      ...slot(5, '10:00', '12:00'),
      status: 'CONFIRMED' as const,
    },
    {
      resourceId: studio.id,
      userId: camille.id,
      ...slot(6, '14:00', '17:00'),
      status: 'PENDING' as const,
    },
    {
      resourceId: vehicule.id,
      userId: lucas.id,
      ...slot(8, '08:00', '18:00'),
      status: 'PENDING' as const,
    },
    {
      resourceId: projecteur.id,
      userId: ines.id,
      ...slot(4, '08:00', '18:00'),
      status: 'CONFIRMED' as const,
    },
    { resourceId: tilleuls.id, userId: camille.id, ...past, status: 'CONFIRMED' as const },
  ];

  await prisma.reservation.createMany({ data: demo });
  console.log(
    `${users.length} comptes, ${rooms.length + otherSpaces.length + equipment.length} ressources et ${demo.length} réservations de démonstration.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
