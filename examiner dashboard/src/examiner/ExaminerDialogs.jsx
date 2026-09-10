import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Award, Check, CheckCircle2, Music2, RefreshCw, X } from 'lucide-react';
import { resultFor } from './examinerState.js';

export function ExaminerDialog({ children, title, className = '', onClose }) {
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
  return createPortal(<div className="examiner-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose?.(); }}><section ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className={`examiner-dialog ${className}`}>{children}</section></div>, document.body);
}
export function ConfirmSubmitModal({ onClose, onConfirm, error }) {
  return <ExaminerDialog title="Submit Final Results?" className="examiner-confirm" onClose={onClose}><span className="examiner-confirm-icon"><RefreshCw size={26} /></span><h2>Submit Final Results?</h2><p>You are about to submit the finalized evaluations for the Spring 2024 Conservatory cycle. Please note that once transmitted to the administration, these results cannot be edited or reversed.</p>{error && <p className="examiner-error" role="alert">{error}</p>}<div className="examiner-dialog-actions"><button className="examiner-button secondary" onClick={onClose}>Return to Edit</button><button className="examiner-button luminous" onClick={onConfirm}>Confirm &amp; Submit</button></div></ExaminerDialog>;
}
export function EvaluationSuccessModal({ session, onReturn }) {
  return <ExaminerDialog title="Evaluation Finalized Successfully" className="examiner-success" onClose={onReturn}><span className="examiner-success-icon"><CheckCircle2 size={32} /></span><h2>Evaluation Finalized<br />Successfully</h2><p>The evaluation for <strong>{session.subject} - {session.level}</strong> has been submitted for administrator review. You can now view the record in your submission history.</p><button className="examiner-button luminous" onClick={onReturn}>RETURN TO DASHBOARD</button></ExaminerDialog>;
}
export function CandidateResultModal({ candidate, session, readOnly, onClose, onSave }) {
  const [feedback, setFeedback] = useState(candidate.feedback);
  const id = useId();
  function close() { if (!readOnly) onSave(feedback); onClose(); }
  const { grade, outcome } = resultFor(candidate.marks);
  const field = (name, label, placeholder) => <label htmlFor={`${id}-${name}`} className={`examiner-feedback-${name}`}>{label}<textarea id={`${id}-${name}`} value={feedback[name]} placeholder={readOnly ? 'No feedback recorded.' : placeholder} readOnly={readOnly} onChange={e => setFeedback({ ...feedback, [name]: e.target.value })} /></label>;
  return <ExaminerDialog title={`Examination evaluation for ${candidate.name}`} className="examiner-candidate-dialog" onClose={close}><header><span className="examiner-kicker">EXAMINATION EVALUATION</span><button className="examiner-icon examiner-dialog-close" aria-label="Close evaluation" onClick={close}><X size={21} /></button><h2>{candidate.name}</h2><p><Music2 size={15} />{session.subject}<span className="examiner-meta-dot">·</span><Award size={15} />{session.level} {grade && `${grade} Track`}</p></header><div className="examiner-feedback-body"><h3><span>◆</span> PERFORMANCE FEEDBACK</h3><div className="examiner-feedback-grid">{field('technical', 'Technical Proficiency', 'Discuss fingering, intonation, and physical execution...')}{field('artistic', 'Artistic Interpretation', 'Comment on phrasing, dynamics, and stylistic maturity...')}{field('overall', 'Overall Impression', "Final summary of the candidate's presence and delivery...")}</div><details className="examiner-criteria"><summary><span>◆</span> CRITERIA SCORING</summary><dl><div><dt>Marks</dt><dd>{candidate.marks || 'Pending'} / 100</dd></div><div><dt>Grade</dt><dd>{grade || 'Pending'}</dd></div><div><dt>Outcome</dt><dd>{outcome}</dd></div></dl></details>{!readOnly && <div className="examiner-feedback-save"><button className="examiner-button" onClick={close}><Check size={16} />Save Feedback</button></div>}</div></ExaminerDialog>;
}
