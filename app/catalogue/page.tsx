import { redirect } from 'next/navigation';

/** L'ancienne adresse du catalogue renvoie vers la page d'accueil. */
export default function CatalogueRedirect() {
  redirect('/');
}
