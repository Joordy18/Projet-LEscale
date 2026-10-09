import Image from 'next/image';
import Link from 'next/link';
import { resourceService } from '@/lib/catalogue/resource-service';

const categories = [
  'Toutes les catégories',
  'Salles de réunion',
  'Salles polyvalentes',
  'Salles spécialisées',
  'Matériel',
  'Espaces extérieurs',
];

export default async function Home() {
  const resources = await resourceService.listResources();

  return (
    <div className="catalogue-page">
      <header className="catalogue-header">
        <Link className="brand" href="/" aria-label="L’Escale, accueil">
          <span className="brand-mark" aria-hidden="true">
            ▤
          </span>
          <span>
            <strong>L’Escale</strong>
            <small>RESSOURCES PARTAGÉES</small>
          </span>
        </Link>
        <nav className="catalogue-nav" aria-label="Navigation principale">
          <Link className="active" href="/">
            Catalogue
          </Link>
          <Link href="/reservations">Mes réservations</Link>
          <Link href="/aide">Aide & contact</Link>
        </nav>
        <button className="profile" type="button">
          <span className="avatar">CM</span>
          Camille Martin <span aria-hidden="true">⌄</span>
        </button>
      </header>

      <main>
        <section className="catalogue-hero">
          <div>
            <p className="catalogue-eyebrow">DES LIEUX ET DU MATÉRIEL À PARTAGER</p>
            <h1>
              Les bons espaces
              <br />
              pour vos projets.
            </h1>
            <p className="catalogue-intro">
              Réunir votre équipe, organiser un atelier, donner vie à une idée : trouvez la
              ressource adaptée et réservez votre créneau.
            </p>
            <p className="account-note">
              <span aria-hidden="true">ⓘ</span> Réservation avec un compte attribué par votre
              administrateur.
            </p>
          </div>
          <div className="featured-resource">
            <Image
              src="/resources/salle-tilleuls.jpeg"
              alt="Salle des Tilleuls"
              fill
              sizes="360px"
              priority
            />
            <Link href="/ressources/salle-des-tilleuls">
              Salle des Tilleuls <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </section>

        <section className="catalogue-tools" aria-label="Recherche et disponibilité">
          <label className="search-field">
            <span aria-hidden="true">⌕</span>
            <input type="search" placeholder="Rechercher une salle, du matériel..." />
            <kbd>⌘ K</kbd>
          </label>
          <label className="date-field">
            <span>Disponibilités pour le</span>
            <select defaultValue="15 octobre 2026">
              <option>15 octobre 2026</option>
            </select>
          </label>
        </section>

        <section className="catalogue-content">
          <aside className="filters">
            <div className="filters-title">
              <h2>Filtres</h2>
              <span aria-hidden="true">☷</span>
            </div>
            <fieldset>
              <legend>Catégorie</legend>
              {categories.map((category, index) => (
                <label className="check-row" key={category}>
                  <input type="checkbox" defaultChecked={index === 0} />
                  <span>{category}</span>
                </label>
              ))}
            </fieldset>
            <label className="select-filter">
              <span>Capacité minimale</span>
              <select defaultValue="Indifférente">
                <option>Indifférente</option>
              </select>
            </label>
            <label className="check-row">
              <input type="checkbox" />
              <span>Accès PMR uniquement</span>
            </label>
            <label className="check-row">
              <input type="checkbox" defaultChecked />
              <span>Avec un créneau disponible</span>
            </label>
            <button className="reset-button" type="button">
              Réinitialiser
            </button>
            <p className="filter-help">
              Les conditions propres à chaque ressource figurent sur sa fiche.
            </p>
          </aside>

          <div className="results">
            <div className="results-heading">
              <h2>6 ressources proposées</h2>
              <button type="button">
                Trier par : pertinence <span aria-hidden="true">↓</span>
              </button>
            </div>
            <div className="resource-grid">
              {resources.map((resource) => (
                <article className="resource-card" key={resource.name}>
                  <div className="resource-image">
                    <Image
                      src={resource.image}
                      alt=""
                      fill
                      sizes="(max-width: 800px) 100vw, 30vw"
                    />
                  </div>
                  <div className="resource-body">
                    <p className="resource-category">{resource.category}</p>
                    <h3>{resource.name}</h3>
                    <p className="resource-description">{resource.description}</p>
                    <p className={`availability ${resource.limited ? 'limited' : ''}`}>
                      <span />
                      {resource.availability}
                    </p>
                    <p className="resource-meta">{resource.meta}</p>
                    <Link className="details-button" href="/ressources/salle-des-tilleuls">
                      ↗ <span>Voir le détail</span>
                    </Link>
                  </div>
                </article>
              ))}
            </div>
            <p className="catalogue-disclaimer">
              Disponibilités indicatives de démonstration pour le 15 octobre 2026. Le créneau est
              vérifié lors de la confirmation.
            </p>
          </div>
        </section>
      </main>

      <footer className="catalogue-footer">
        <span>L’Escale · Maquette et contenus de démonstration</span>
        <span>
          <Link href="/accessibilite">Accessibilité</Link> ·{' '}
          <Link href="/confidentialite">Confidentialité</Link> ·{' '}
          <Link href="/contact">Contact</Link>
        </span>
      </footer>
    </div>
  );
}
