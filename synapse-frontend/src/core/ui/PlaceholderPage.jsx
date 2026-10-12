import './ui.css';

/** Stand-in for screens that are intentionally not built yet. */
export default function PlaceholderPage({ title, note }) {
  return (
    <>
      <h1 className="page-title">{title}</h1>
      <div className="card" style={{ marginTop: 'var(--space-5)' }}>
        <p className="page-subtitle" style={{ margin: 0 }}>
          {note ?? 'This screen has not been built yet.'}
        </p>
      </div>
    </>
  );
}
