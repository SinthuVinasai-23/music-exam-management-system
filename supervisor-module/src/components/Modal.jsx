import { Check, Mail, X } from 'lucide-react';
import { useEffect, useRef } from 'react';

export default function Modal({ open, type = 'mail', title, children, actionLabel, onAction, onClose }) {
  const cardRef = useRef(null);
  const dismiss = onClose ?? onAction;

  useEffect(() => {
    if (!open) return;
    cardRef.current?.focus();

    function handleKeyDown(event) {
      if (event.key === 'Escape') dismiss?.();
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, dismiss]);

  if (!open) return null;

  const Icon = type === 'success' ? Check : Mail;

  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className={`modal-card modal-${type}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        ref={cardRef}
      >
        {onClose && (
          <button className="modal-close" type="button" aria-label="Close dialog" onClick={onClose}>
            <X size={22} />
          </button>
        )}
        <div className="modal-icon" aria-hidden="true">
          <Icon size={26} strokeWidth={2.4} />
        </div>
        <h2 id="modal-title">{title}</h2>
        <div className="modal-copy">{children}</div>
        {actionLabel && (
          <button className="btn btn-primary modal-action" type="button" onClick={onAction}>
            {actionLabel}
          </button>
        )}
      </section>
    </div>
  );
}
