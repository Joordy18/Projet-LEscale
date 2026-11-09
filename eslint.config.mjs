import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

// Architecture en couches (docs/conception/architecture.md) :
// présentation → contrôleurs → services métier → repositories.
const forbidden = {
  controllers: { regex: '(^|/)controllers(/|$)', message: 'Couche contrôleurs interdite ici.' },
  services: {
    regex: '(^|/)services(/|$)',
    message: 'La présentation passe par un contrôleur, pas par un service.',
  },
  repositories: {
    regex: '(^|/)repositories(/|$)',
    message: 'Seuls les services métier appellent les repositories.',
  },
  database: {
    regex: '^(@prisma/client|mongodb|mongoose|pg|drizzle-orm)(/|$)',
    message: 'Seuls les repositories accèdent aux bases de données.',
  },
  app: { regex: '^@/app(/|$)', message: 'La couche présentation ne peut pas être importée.' },
  framework: {
    regex: '^(next|react|react-dom)(/|$)',
    message: 'Les services métier et les repositories ne dépendent pas de Next.js ni de React.',
  },
};

const restrict = (...keys) => ({
  'no-restricted-imports': ['error', { patterns: keys.map((key) => forbidden[key]) }],
});

const controllerFiles = ['app/**/route.ts', 'app/**/actions.ts', 'lib/controllers/**'];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ['app/**', 'components/**'],
    ignores: controllerFiles,
    rules: restrict('services', 'repositories', 'database'),
  },
  {
    files: controllerFiles,
    rules: restrict('repositories', 'database', 'app'),
  },
  {
    files: ['lib/services/**'],
    rules: restrict('controllers', 'database', 'app', 'framework'),
  },
  {
    files: ['lib/repositories/**'],
    rules: restrict('services', 'controllers', 'app', 'framework'),
  },
  {
    files: ['lib/domain/**', 'lib/validations/**'],
    rules: restrict('services', 'repositories', 'controllers', 'database', 'app', 'framework'),
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
  ]),
]);

export default eslintConfig;
