export const resourceCategories = [
  'SALLE DE RÉUNION',
  'SALLE POLYVALENTE',
  'MATÉRIEL',
  'ESPACE EXTÉRIEUR',
  'SALLE SPÉCIALISÉE',
] as const;

export type ResourceCategory = (typeof resourceCategories)[number];

export type Resource = {
  slug: string;
  name: string;
  category: ResourceCategory;
  description: string;
  image: string;
  meta: string;
  availability: string;
  limited?: boolean;
};
