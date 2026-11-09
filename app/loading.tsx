/** Affiché pendant le chargement d'une page. */
export default function Loading() {
  return (
    <div className="page container" role="status" aria-live="polite">
      <p className="muted">Chargement…</p>
    </div>
  );
}
