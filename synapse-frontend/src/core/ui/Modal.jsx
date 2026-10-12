import { useEffect, useId, useRef } from 'react';
import { Icon } from './icons';
import './ui.css';

/** Accessible dialog: Esc / overlay click / X closes; focus moves in and is restored on close. */
export default function Modal({ title, onClose, children }) {
  const titleId = useId();
  const closeRef = useRef(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    closeRef.current?.focus();

    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <button ref={closeRef} type="button" className="modal__close" onClick={onClose} aria-label="Close">
          <Icon name="close" size={22} />
        </button>
        <h2 id={titleId} className="modal__title">
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}
