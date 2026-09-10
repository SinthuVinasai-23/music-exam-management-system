import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Eye, Printer, User, X } from 'lucide-react';

export function AdminDialog({ children, title, className = '', wide, onClose }) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    function keydown(e) {
      if (e.key === 'Escape') { e.preventDefault(); closeRef.current?.(); }
      if (e.key !== 'Tab') return;
      const focusable = [...ref.current.querySelectorAll('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href]')];
      const first = focusable[0], last = focusable.at(-1);
      if (!first) { e.preventDefault(); return; }
      if (e.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (document.activeElement === last || document.activeElement === ref.current)) { e.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', keydown);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', keydown); previous?.focus(); };
  }, []);
  return createPortal(
    <div className="admin-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose?.(); }}>
      <section ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className={`admin-dialog ${wide ? 'wide' : ''} ${className}`}>{children}</section>
    </div>, document.body);
}

export function ConfirmDialog({ title, body, confirmLabel = 'Confirm', danger, onConfirm, onClose }) {
  return <AdminDialog title={title} onClose={onClose}>
    <button className="admin-icon admin-dialog-close" aria-label="Close" onClick={onClose}><X size={20} /></button>
    <span className="admin-dialog-kicker"><AlertTriangle size={14} style={{ verticalAlign: -2, marginRight: 6 }} />CONFIRMATION REQUIRED</span>
    <h2 style={{ marginTop: 10 }}>{title}</h2>
    <p style={{ color: '#62665f', fontSize: 14, lineHeight: 1.6, marginTop: 10 }}>{body}</p>
    <div className="admin-dialog-actions">
      <button className="admin-ghost-btn" onClick={onClose}>Cancel</button>
      <button className="admin-solid-btn" style={danger ? { background: '#c23b3b' } : undefined} onClick={onConfirm}>{confirmLabel}</button>
    </div>
  </AdminDialog>;
}

export function DocumentPreviewDialog({ doc, onClose }) {
  return <AdminDialog title="Document preview" onClose={onClose}>
    <button className="admin-icon admin-dialog-close" aria-label="Close" onClick={onClose}><X size={20} /></button>
    <span className="admin-dialog-kicker">SUBMISSION DOCUMENT</span>
    <h2 style={{ marginTop: 10 }}>{doc.label}</h2>
    <p style={{ color: '#62665f', fontSize: 13, marginTop: 6 }}>{doc.file}</p>
    <div style={{ marginTop: 18, border: '1px dashed #d8cf9a', borderRadius: 10, padding: 40, textAlign: 'center', color: '#8a6f0f', background: '#fffdf6' }}>
      {doc.src ? <img src={doc.src} alt="Applicant signature" style={{ maxWidth: '100%', maxHeight: 300 }} /> : 'No document file is attached to this demonstration record.'}
    </div>
  </AdminDialog>;
}

export function ApplicationDetailsModal({ application, onClose, onApprove }) {
  const [doc, setDoc] = useState(null);
  if (!application) return null;
  function printRecord() { window.print(); }
  return <>
    <AdminDialog title={`Application details for ${application.candidateName}`} className="admin-app-modal" wide onClose={onClose}>
      <button className="admin-icon admin-dialog-close" aria-label="Close application details" onClick={onClose}><X size={20} /></button>
      <div className="admin-app-modal-head">
        <div>
          <span className="admin-dialog-kicker">APPLICATION ID: {application.id}</span>
          <h2>Application Details</h2>
        </div>
        <button className="admin-outline-btn" onClick={printRecord}><Printer size={15} />Print Record</button>
      </div>
      <div className="admin-app-body">
        <div className="admin-app-photo"><User size={40} /></div>
        <div>
          <h3 className="admin-app-name">{application.candidateName}</h3>
          <p className="admin-app-descriptor">{application.descriptor}</p>
          <p className="admin-app-bio">{application.bio}</p>
          <div className="admin-app-fields">
            <div><label>Instrument</label><strong>{application.instrument}</strong></div>
            <div><label>Applied Grade</label><strong>{application.grade}</strong></div>
            <div><label>Age</label><strong>{application.age} Years</strong></div>
          </div>
        </div>
      </div>
      <div className="admin-app-lower">
        <div>
          <h4>Submission Documents</h4>
          <div className="admin-doc-card">
            <span>📄</span>
            <div><strong>{application.document.label}</strong><small>{application.document.file}</small></div>
            <button className="admin-icon" aria-label={`Preview ${application.document.label}`} onClick={() => setDoc(application.document)}><Eye size={17} /></button>
          </div>
        </div>
        <div className="admin-timeline-panel">
          <h4>Application Timeline</h4>
          {application.timeline.map((t, i) => <div className="admin-timeline-item" key={i} style={{ marginTop: i ? 14 : 0 }}>
            <span className="admin-timeline-dot" />
            <div><time>{t.at}</time><strong>{t.label}</strong><p>{t.note}</p></div>
          </div>)}
        </div>
      </div>
      <div className="admin-dialog-actions">
        <button className="admin-ghost-btn" onClick={onClose}>Close</button>
        <button className="admin-solid-btn" onClick={() => onApprove(application)}>Approve and Assign</button>
      </div>
    </AdminDialog>
    {doc && <DocumentPreviewDialog doc={doc} onClose={() => setDoc(null)} />}
  </>;
}
