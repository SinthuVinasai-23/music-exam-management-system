import React, { useRef, useState } from 'react';
import { usePortal } from '../store';
import { venues, disciplines } from '../data/seed';
import { validateAssignment } from '../services/portal';
import {
  Modal,
  Button,
  Icon,
  Field,
  CandidateChip,
  ErrorMessage,
  dateLabel,
  timeLabel,
} from './ui';
import { exportPDF } from '../utils/export';
function Signature({ onChange }) {
  const [method, setMethod] = useState('draw'),
    [typed, setTyped] = useState('');
  const canvas = useRef(),
    drawing = useRef(false),
    ink = useRef('');
  const point = (e) => {
    const b = canvas.current.getBoundingClientRect();
    return [
      ((e.clientX - b.left) * canvas.current.width) / b.width,
      ((e.clientY - b.top) * canvas.current.height) / b.height,
    ];
  };
  const start = (e) => {
    e.preventDefault();
    drawing.current = true;
    canvas.current.setPointerCapture(e.pointerId);
    const c = canvas.current.getContext('2d');
    c.beginPath();
    c.moveTo(...point(e));
  };
  const move = (e) => {
    if (!drawing.current) return;
    const c = canvas.current.getContext('2d');
    c.strokeStyle = '#25334a';
    c.lineWidth = 2.5;
    c.lineCap = 'round';
    c.lineTo(...point(e));
    c.stroke();
    ink.current = canvas.current.toDataURL('image/png');
    onChange({ method: 'draw', value: ink.current });
  };
  return (
    <div className="signature-section">
      <div className="signature-heading">
        <span>DIGITAL ENDORSEMENT</span>
        <div className="signature-tabs">
          {['draw', 'type'].map((value) => (
            <button
              type="button"
              key={value}
              className={method === value ? 'active' : ''}
              onClick={() => {
                setMethod(value);
                onChange({
                  method: value,
                  value: value === 'type' ? typed : ink.current,
                });
              }}
            >
              {value.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      <div
        className="signature-pad"
        style={{ display: method === 'draw' ? 'block' : 'none' }}
      >
        <canvas
          ref={canvas}
          width={900}
          height={300}
          aria-label="Draw signature"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={() => (drawing.current = false)}
          onPointerCancel={() => (drawing.current = false)}
        />
        <span>Sign within the dotted area</span>
        <button
          type="button"
          className="clear-signature"
          aria-label="Clear signature"
          onClick={() => {
            canvas.current.getContext('2d').clearRect(0, 0, 900, 300);
            ink.current = '';
            onChange({ method: 'draw', value: '' });
          }}
        >
          <Icon name="Trash2" size={16} />
        </button>
      </div>
      {method === 'type' && (
        <div className="typed-signature">
          <Field label="Type your full name">
            <input
              placeholder="Your signature"
              value={typed}
              onChange={(e) => {
                setTyped(e.target.value);
                onChange({ method: 'type', value: e.target.value });
              }}
            />
          </Field>
        </div>
      )}
    </div>
  );
}
function ReviewDialog({ modal, close, replace }) {
  const { state, run } = usePortal();
  const { candidate, type } = modal;
  const [signature, setSignature] = useState({ method: 'draw', value: '' }),
    [details, setDetails] = useState(''),
    [category, setCategory] = useState('Documentation'),
    [urgency, setUrgency] = useState('Standard'),
    [error, setError] = useState('');
  const submit = (e) => {
    e.preventDefault();
    try {
      const next = run({
        type,
        id: candidate.id,
        signature,
        reason: details,
        details,
        category,
        urgency,
      });
      replace({
        type: type === 'query' ? 'query-success' : 'result',
        result: type,
        candidate: next.applications.find((a) => a.id === candidate.id),
        teacher: `${state.profile.firstName} ${state.profile.lastName}`,
      });
    } catch (err) {
      setError(err.message);
    }
  };
  return (
    <Modal
      title={
        type === 'approve'
          ? 'Approve & Finalize Application'
          : type === 'query'
            ? 'Raise Query / Request Correction'
            : 'Reject Application'
      }
      onClose={close}
      className={type === 'approve' ? 'approval-modal' : 'query-modal'}
    >
      <form onSubmit={submit}>
        <div className="modal-body">
          <CandidateChip candidate={candidate} />
          {type === 'approve' ? (
            <>
              <p className="endorsement-copy">
                By providing your electronic signature below, you confirm that
                you have reviewed the applicant’s credentials and approve this
                examination application.
              </p>
              <Signature onChange={setSignature} />
            </>
          ) : (
            <>
              {type === 'query' && (
                <Field label="Correction Category">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    {[
                      'Documentation',
                      'Personal Information',
                      'Eligibility',
                      'Examination Details',
                      'Payment Information',
                    ].map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </Field>
              )}
              <Field
                label={
                  type === 'query' ? 'Specific Details' : 'Rejection Reason *'
                }
              >
                <textarea
                  rows={5}
                  placeholder={
                    type === 'query'
                      ? 'Describe the correction or additional information required...'
                      : 'Explain why this application is being rejected...'
                  }
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                />
              </Field>
              {type === 'query' && (
                <div className="urgency-row">
                  <div>
                    <strong>Urgency Level</strong>
                    <small>Standard queries are processed in 48h</small>
                  </div>
                  <div className="segmented">
                    {['Standard', 'Urgent'].map((x) => (
                      <button
                        type="button"
                        key={x}
                        className={urgency === x ? 'active' : ''}
                        onClick={() => setUrgency(x)}
                      >
                        {x}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {type === 'reject' && (
                <p className="muted">
                  The reason will be included in the applicant notification.
                  Refund processing will be recorded in the demo state.
                </p>
              )}
            </>
          )}
          <ErrorMessage>{error}</ErrorMessage>
        </div>
        <div className="modal-actions">
          <Button type="button" variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button type="submit">
            {type === 'approve' ? (
              <>
                <Icon name="ShieldCheck" />
                Confirm & E-Sign
              </>
            ) : type === 'query' ? (
              'Send Query'
            ) : (
              'Confirm Rejection'
            )}
          </Button>
        </div>
        <div className="modal-footnote">
          <Icon name="ShieldCheck" size={14} />
          {type === 'query'
            ? 'Your query will be sent to the applicant account for correction.'
            : type === 'approve'
              ? 'Electronic endorsement · Stored locally in this frontend demo'
              : 'A written reason is required for every rejection.'}
        </div>
      </form>
    </Modal>
  );
}
function AssignmentDialog({ candidate, close }) {
  const { state, run } = usePortal();
  const available = state.sessions
    .filter((s) => {
      try {
        validateAssignment(state, candidate.id, s.id);
        return true;
      } catch {
        return false;
      }
    })
    .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
  const dates = [...new Set(available.map((s) => s.date))];
  const [date, setDate] = useState(dates[0] || ''),
    [sessionId, setSessionId] = useState(''),
    [error, setError] = useState('');
  const times = available.filter((s) => s.date === date);
  const selected = times.find((s) => s.id === sessionId);
  return (
    <Modal
      title="Assign Examination Slot"
      onClose={close}
      className="assignment-modal"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          try {
            run({ type: 'assign', studentId: candidate.id, sessionId });
            close();
          } catch (err) {
            setError(err.message);
          }
        }}
      >
        <div className="modal-body">
          <CandidateChip candidate={candidate} />
          {available.length ? (
            <>
              <Field label="SELECT DATE">
                <div className="choice-grid">
                  {dates.map((d) => (
                    <button
                      type="button"
                      className={date === d ? 'selected' : ''}
                      key={d}
                      onClick={() => {
                        setDate(d);
                        setSessionId('');
                      }}
                    >
                      {dateLabel(d)}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="AVAILABLE TIMES">
                <div className="choice-grid">
                  {times.map((s) => (
                    <button
                      type="button"
                      key={s.id}
                      className={s.id === sessionId ? 'selected' : ''}
                      onClick={() => setSessionId(s.id)}
                    >
                      {timeLabel(s.start)}
                      <small>{s.venue}</small>
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="EXAMINATION VENUE">
                <select
                  aria-label="Examination venue"
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                >
                  <option value="">Select an available venue and time</option>
                  {times.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.venue} · {timeLabel(s.start)}
                    </option>
                  ))}
                </select>
              </Field>
              {selected && (
                <small className="muted">
                  {selected.type} · {timeLabel(selected.start)}–
                  {timeLabel(selected.end)}
                </small>
              )}
            </>
          ) : (
            <div className="notice">
              <Icon name="Info" />
              <p>
                No compatible slots are available. Create a session for{' '}
                <strong>{candidate.discipline}</strong> in Exam Slots. Existing
                assignments and the 30-minute exam buffer are excluded.
              </p>
            </div>
          )}
          <ErrorMessage>{error}</ErrorMessage>
        </div>
        <div className="modal-actions">
          <Button type="button" variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" disabled={!available.length}>
            Confirm Assignment
          </Button>
        </div>
      </form>
    </Modal>
  );
}
function SessionDialog({ modal, close }) {
  const { state, run } = usePortal();
  const [data, setData] = useState({
      date: modal.date || '',
      start: '09:00',
      end: '12:00',
      venue: venues[0],
      type: disciplines[4],
      capacity: 12,
    }),
    [error, setError] = useState('');
  const set = (key, value) => setData({ ...data, [key]: value });
  return (
    <Modal
      title="Add New Examination Session"
      onClose={close}
      className="session-modal"
    >
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          try {
            run({ type: 'session', session: data });
            modal.onScheduled?.(data.date);
            close();
          } catch (err) {
            setError(err.message);
          }
        }}
      >
        <div className="modal-body form-grid">
          <Field
            label="Examination Date"
            type="date"
            value={data.date}
            onChange={(e) => set('date', e.target.value)}
          />
          <Field label="Time Slot">
            <select
              value={`${data.start}-${data.end}`}
              onChange={(e) => {
                const [start, end] = e.target.value.split('-');
                setData({ ...data, start, end });
              }}
            >
              <option value="09:00-12:00">09:00 AM - 12:00 PM</option>
              <option value="12:30-15:30">12:30 PM - 03:30 PM</option>
              <option value="16:00-18:00">04:00 PM - 06:00 PM</option>
            </select>
          </Field>
          <Field label="Venue" className="full">
            <select
              value={data.venue}
              onChange={(e) => set('venue', e.target.value)}
            >
              {venues.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </Field>
          <Field label="Examination Type">
            <select
              value={data.type}
              onChange={(e) => set('type', e.target.value)}
            >
              {[
                ...new Set([
                  ...disciplines,
                  ...state.students.map((s) => s.discipline),
                ]),
              ].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </Field>
          <Field
            label="Max Candidates"
            type="number"
            min="1"
            max="100"
            value={data.capacity}
            onChange={(e) => set('capacity', e.target.value)}
          />
          <div className="full">
            <ErrorMessage>{error}</ErrorMessage>
          </div>
        </div>
        <div className="modal-actions">
          <Button type="button" variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button type="submit">
            <Icon name="CircleCheck" size={16} />
            Schedule Session
          </Button>
        </div>
      </form>
    </Modal>
  );
}
export default function Dialogs({ modal, close, replace }) {
  const { state } = usePortal();
  if (!modal) return null;
  if (['approve', 'reject', 'query'].includes(modal.type))
    return (
      <ReviewDialog
        key={`${modal.type}-${modal.candidate.id}`}
        modal={modal}
        close={close}
        replace={replace}
      />
    );
  if (modal.type === 'assign')
    return <AssignmentDialog candidate={modal.candidate} close={close} />;
  if (modal.type === 'session')
    return <SessionDialog modal={modal} close={close} />;
  if (modal.type === 'saved' || modal.type === 'query-success')
    return (
      <Modal
        title={
          modal.type === 'saved'
            ? 'Changes Saved Successfully'
            : 'Query Sent Successfully'
        }
        onClose={close}
        className="success-modal small-success"
      >
        <div className="success-icon neutral">
          <Icon name="CircleCheck" size={30} />
        </div>
        <h2>
          {modal.type === 'saved'
            ? 'Changes Saved Successfully'
            : 'Query Sent Successfully'}
        </h2>
        <p>
          {modal.type === 'saved'
            ? 'Your account settings have been updated and saved in this demo.'
            : 'Your query has been recorded for the applicant. The application is paused until a response is received.'}
        </p>
        <Button onClick={close}>Continue</Button>
      </Modal>
    );
  if (modal.type === 'result') {
    const a = modal.candidate,
      approved = modal.result === 'approve';
    return (
      <Modal
        title={
          approved
            ? 'Application Successfully Approved'
            : 'Application Rejected'
        }
        onClose={close}
        className="success-modal result-modal"
      >
        <div className={`success-icon ${approved ? 'approved' : 'rejected'}`}>
          <Icon name={approved ? 'Check' : 'X'} size={43} />
        </div>
        <h2>
          {approved
            ? 'Application Successfully Approved'
            : 'Application Rejected'}
        </h2>
        <p>
          {approved
            ? 'Your digital endorsement has been recorded and the candidate, '
            : 'The application for '}
          <em>{a.name}</em>
          {approved
            ? ', can now advance to the slotting phase.'
            : ' has been rejected. An applicant notification and refund request have been recorded in the demo.'}
        </p>
        <dl className="receipt-details">
          <dt>{approved ? 'APPROVAL' : 'REJECTED'} REFERENCE ID</dt>
          <dd>#{a.reference}</dd>
          <dt>TIMESTAMP</dt>
          <dd>{new Date(a.updatedAt).toLocaleString()}</dd>
        </dl>
        <div className="diamond-divider">◆</div>
        <div className="success-buttons">
          <Button onClick={close}>Return to Queue</Button>
          {approved && (
            <Button
              variant="outline"
              onClick={() =>
                exportPDF('Approval Receipt', [
                  `Reference: #${a.reference}`,
                  `Candidate: ${a.name}`,
                  `Registration: ${a.id}`,
                  `Teacher: ${modal.teacher}`,
                  `Timestamp: ${a.updatedAt}`,
                  `Status: Approved`,
                  `Signature method: ${a.signature.method}`,
                  `Electronic endorsement stored in the application record.`,
                  `Frontend demonstration receipt - not an official admission card.`,
                ])
              }
            >
              View Receipt
            </Button>
          )}
        </div>
      </Modal>
    );
  }
  if (modal.type === 'candidates') {
    const candidates = state.students.filter(
      (s) => s.sessionId === modal.session.id,
    );
    return (
      <Modal title="Session Candidates" onClose={close}>
        <div className="modal-body">
          <h3>{modal.session.type}</h3>
          <p>
            {dateLabel(modal.session.date)} · {timeLabel(modal.session.start)}
            <br />
            {modal.session.venue}
          </p>
          {candidates.length ? (
            candidates.map((s) => <CandidateChip key={s.id} candidate={s} />)
          ) : (
            <p className="empty">
              No candidates are assigned to this session yet.
            </p>
          )}
        </div>
      </Modal>
    );
  }
  if (modal.type === 'document')
    return (
      <Modal title="Pre-requisite Certificate" onClose={close}>
        <div className="modal-body">
          <div className="certificate">
            <Icon name="Award" size={55} />
            <span className="eyebrow">CONSERVATOIRE OF MUSIC</span>
            <h2>Certificate of Achievement</h2>
            <p>
              This sample certificate represents the prerequisite document for
            </p>
            <h2>{modal.candidate.name}</h2>
            <p>Level 4 Examination</p>
            <span className="gold-rule" />
            <small>DEMO DOCUMENT · NOT AN OFFICIAL CERTIFICATE</small>
          </div>
        </div>
      </Modal>
    );
  if (modal.type === 'analytics')
    return (
      <Modal title="Examination Progress" onClose={close}>
        <div className="modal-body">
          {['Slot Assigned', 'Pending'].map((status) => (
            <div className="analytics-row" key={status}>
              <strong>{status}</strong>
              <progress
                value={state.students.filter((s) => s.status === status).length}
                max={state.students.length}
              />
              <span>
                {state.students.filter((s) => s.status === status).length}
              </span>
            </div>
          ))}
          <p>
            {state.sessions.length} examination sessions ·{' '}
            {new Set(state.students.map((s) => s.candidateId)).size} candidates
          </p>
        </div>
      </Modal>
    );
  return null;
}
