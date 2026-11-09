import type { Metadata } from 'next';
import Link from 'next/link';
import { ResourceForm } from '@/components/resource-form';
import { createResourceAction } from '@/lib/controllers/resource-actions';
import { requireUser } from '@/lib/controllers/session';

export const metadata: Metadata = { title: 'Nouvelle ressource' };

/** Création d'une ressource (EF-09). */
export default async function NewResourcePage() {
  await requireUser('catalogue:manage', '/gestion/ressources/nouveau');

  return (
    <div className="page-narrow">
      <nav className="breadcrumb" aria-label="Fil d’Ariane">
        <ol>
          <li>
            <Link href="/gestion/ressources">Ressources</Link>
          </li>
          <li aria-current="page">Nouvelle ressource</li>
        </ol>
      </nav>
      <h1 className="page-title">Ajouter une ressource</h1>
      <section className="panel">
        <ResourceForm action={createResourceAction} submitLabel="Créer la ressource" />
      </section>
    </div>
  );
}
