import Image from 'next/image';
import Link from 'next/link';
import { ResourceCard } from '@/components/resource-card';
import { getCatalogue } from '@/lib/controllers/catalogue-controller';
import { toURLSearchParams } from '@/lib/controllers/search-params';
import { resourceCategories, resourceCategoryLabels } from '@/lib/domain/resource';

const capacities = [2, 4, 8, 12, 20];

/** Catalogue public : recherche par mot-clé, catégorie, capacité et période (EF-04, EF-05). */
export default async function CataloguePage(props: PageProps<'/'>) {
  const searchParams = toURLSearchParams(await props.searchParams);
  const result = await getCatalogue(searchParams);
  const resources = result.success ? result.data : [];
  const featured = resources.find((resource) => resource.photoUrl);
  const hasFilters = ['q', 'category', 'minCapacity', 'from', 'to'].some((name) =>
    searchParams.has(name),
  );

  return (
    <div className="container">
      {searchParams.get('compte') === 'supprime' ? (
        <div className="alert alert-success" role="status" style={{ marginTop: 24 }}>
          Votre compte a été supprimé. Vos réservations passées ont été anonymisées.
        </div>
      ) : null}

      <section className="catalogue-hero" aria-labelledby="titre-catalogue">
        <div>
          <p className="eyebrow">DES LIEUX ET DU MATÉRIEL À PARTAGER</p>
          <h1 id="titre-catalogue">
            Les bons espaces
            <br />
            pour vos projets.
          </h1>
          <p className="catalogue-intro">
            Réunir votre équipe, organiser un atelier, donner vie à une idée : trouvez la ressource
            adaptée et réservez votre créneau.
          </p>
          <p className="account-note">
            Réservation avec un compte attribué par votre administrateur.{' '}
            <Link href="/connexion">Se connecter</Link>
          </p>
        </div>
        {featured?.photoUrl ? (
          <div className="featured-resource">
            <Image
              src={featured.photoUrl}
              alt=""
              fill
              sizes="360px"
              priority
              unoptimized={featured.photoUrl.startsWith('/media/')}
            />
            <Link href={`/ressources/${featured.slug}`}>
              {featured.name} <span aria-hidden="true">↗</span>
            </Link>
          </div>
        ) : null}
      </section>

      <div className="catalogue-content">
        <aside className="filters" aria-label="Recherche et filtres">
          <h2>Filtres</h2>
          {/* `key` : le formulaire est recréé quand l'URL change, pour que « Réinitialiser » vide bien les champs. */}
          <form action="/" method="get" key={searchParams.toString()}>
            <div className="field">
              <label htmlFor="q">Mot-clé</label>
              <input
                id="q"
                name="q"
                type="search"
                className="input"
                defaultValue={searchParams.get('q') ?? ''}
                placeholder="Salle, caméra, enceinte…"
                maxLength={100}
              />
            </div>
            <div className="field">
              <label htmlFor="category">Catégorie</label>
              <select
                id="category"
                name="category"
                className="input"
                defaultValue={searchParams.get('category') ?? ''}
              >
                <option value="">Toutes les catégories</option>
                {resourceCategories.map((category) => (
                  <option key={category} value={category}>
                    {resourceCategoryLabels[category]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="minCapacity">Capacité minimale</label>
              <select
                id="minCapacity"
                name="minCapacity"
                className="input"
                defaultValue={searchParams.get('minCapacity') ?? ''}
              >
                <option value="">Indifférente</option>
                {capacities.map((capacity) => (
                  <option key={capacity} value={capacity}>
                    {capacity} personnes ou plus
                  </option>
                ))}
              </select>
            </div>
            <fieldset>
              <legend>Disponible sur la période</legend>
              <div className="field">
                <label htmlFor="from">Du</label>
                <input
                  id="from"
                  name="from"
                  type="datetime-local"
                  className="input"
                  defaultValue={searchParams.get('from') ?? ''}
                />
              </div>
              <div className="field">
                <label htmlFor="to">Au</label>
                <input
                  id="to"
                  name="to"
                  type="datetime-local"
                  className="input"
                  defaultValue={searchParams.get('to') ?? ''}
                />
              </div>
            </fieldset>
            <button type="submit" className="button button-primary">
              Rechercher
            </button>
            {hasFilters ? (
              <Link href="/" className="reset-link">
                Réinitialiser les filtres
              </Link>
            ) : null}
          </form>
        </aside>

        <section className="results" aria-labelledby="titre-resultats">
          <div className="results-heading">
            <h2 id="titre-resultats" aria-live="polite">
              {resources.length} ressource{resources.length > 1 ? 's' : ''} proposée
              {resources.length > 1 ? 's' : ''}
            </h2>
          </div>
          {!result.success ? (
            <p className="alert alert-error" role="alert">
              {result.error}
            </p>
          ) : resources.length === 0 ? (
            <p className="empty">
              Aucune ressource ne correspond à votre recherche. Modifiez les filtres ou la période.
            </p>
          ) : (
            <ul className="resource-grid">
              {resources.map((resource) => (
                <li key={resource.id}>
                  <ResourceCard resource={resource} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
