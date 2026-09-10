import { X } from 'lucide-react';

const PORTALS = [
  { id: 'teacher', label: 'Teacher' },
  { id: 'invigilator', label: 'Invigilator' },
  { id: 'examiner', label: 'Examiner' },
  { id: 'admin', label: 'Admin' },
  { id: 'super-admin', label: 'Super Admin' },
];

export default function PortalSelector({ open, onClose, onSelect }) {
  if (!open) return null;

  return (
    <div className="portal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="portal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="portal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="portal-close" type="button" aria-label="Close portal selection" onClick={onClose}>
          <X size={28} />
        </button>
        <header className="portal-card-header">
          <h2 id="portal-title">Select Portal</h2>
          <p>PROTOTYPE: CHOOSE A ROLE TO CONTINUE</p>
        </header>
        <div className="portal-options">
          {PORTALS.map((portal) => (
            <button key={portal.id} type="button" onClick={() => onSelect(portal.id)}>
              {portal.label}
            </button>
          ))}
        </div>
        <footer>Please ensure you select the correct role for your current tasks.</footer>
      </section>
    </div>
  );
}
