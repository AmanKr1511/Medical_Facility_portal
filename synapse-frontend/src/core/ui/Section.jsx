import './ui.css';

/** Titled block of a page. `action` renders on the right of the title (e.g. a "View All" link). */
export default function Section({ title, action, children, className = '' }) {
  return (
    <section className={`section ${className}`}>
      {(title || action) && (
        <div className="section__head">
          <h2 className="section__title">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
