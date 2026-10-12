import Button from './Button';
import './ui.css';

/** Wraps data-dependent UI: spinner while loading, message + retry on error, children when ready. */
export default function AsyncView({ loading, error, onRetry, children }) {
  if (loading) {
    return (
      <div className="state-msg" role="status" aria-live="polite">
        <span className="spinner" />
        <span className="visually-hidden">Loading</span>
      </div>
    );
  }
  if (error) {
    return (
      <div className="state-msg state-msg--error" role="alert">
        <p>Something went wrong loading this section.</p>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry} style={{ marginTop: 12 }}>
            Try again
          </Button>
        )}
      </div>
    );
  }
  return children;
}
