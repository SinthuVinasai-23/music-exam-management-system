import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import { useAdmin } from './AdminContext.jsx';
import { resolvedApplication } from './adminState.js';

const STAGES = [
  { key: 'submitted', label: 'Application Submitted', desc: 'Candidate submitted the application and supporting documents.' },
  { key: 'payment', label: 'Payment Confirmed', desc: 'Examination fee received and reconciled.' },
  { key: 'review', label: 'Teacher / Mentor Review', desc: 'Mentor endorsement recorded for the applied grade.' },
  { key: 'approved', label: 'Approved by Administrator', desc: 'Application approved and cleared for scheduling.' },
  { key: 'allocation', label: 'Exam Session Allocation', desc: 'Venue, date and time slot assigned to the candidate.' },
  { key: 'assignment', label: 'Examiner / Invigilator Assignment', desc: 'Panel confirmed for the allocated session.' },
];

function stageIndexFor(app) {
  if (app.workflowStage) return STAGES.findIndex(s => s.key === app.workflowStage);
  if (app.status === 'Approved') return 3;
  if (app.status === 'Queried') return 2;
  return 1;
}

export default function AdminWorkflow() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state, dispatch } = useAdmin();
  const app = resolvedApplication(state, id);
  const [venue, setVenue] = useState(state.venues.find(v => v.status === 'Active')?.name || '');
  const [slot, setSlot] = useState(state.timeTemplates[0]?.id || '');

  if (!app) return <div><p>Application not found.</p><button className="admin-ghost-btn" onClick={() => navigate('/admin/applications')}>Back to Registry</button></div>;

  const activeIndex = stageIndexFor(app);

  function advance(toIndex, taskTitle) {
    dispatch({ type: 'WORKFLOW_UPDATE', id: app.id, patch: { workflowStage: STAGES[toIndex].key }, taskTitle });
  }
  function allocate() {
    const template = state.timeTemplates.find(t => t.id === slot);
    dispatch({ type: 'WORKFLOW_UPDATE', id: app.id, patch: { workflowStage: 'allocation', assignedVenue: venue, assignedSlot: template?.name }, taskTitle: `Allocated ${app.candidateName} to ${venue}` });
  }
  function assignPanel() {
    dispatch({ type: 'WORKFLOW_UPDATE', id: app.id, patch: { workflowStage: 'assignment' }, taskTitle: `Confirmed examiner panel for ${app.candidateName}` });
  }

  return <div>
    <button className="admin-ghost-btn" onClick={() => navigate('/admin/applications')} style={{ marginBottom: 18 }}><ArrowLeft size={15} />Back to Registry</button>
    <span className="admin-kicker">MANAGE WORKFLOW · {app.id}</span>
    <h1>{app.candidateName}</h1>
    <p style={{ color: '#62665f', marginTop: 6 }}>{app.programLabel} · {app.teacher} ({app.institution})</p>

    <div className="admin-config-grid" style={{ marginTop: 30 }}>
      <div className="admin-config-card">
        <h2>Workflow Stages</h2>
        <div className="admin-workflow-steps">
          {STAGES.map((s, i) => <div className={`admin-workflow-step ${i < activeIndex ? 'done' : i === activeIndex ? 'current' : ''}`} key={s.key}>
            <span className="admin-workflow-dot">{i < activeIndex ? <Check size={14} /> : i + 1}</span>
            <div><strong>{s.label}</strong><p>{s.desc}</p></div>
          </div>)}
        </div>

        {activeIndex === 3 && <div className="admin-workflow-actions">
          <div className="admin-form-grid" style={{ flex: 1 }}>
            <label style={{ gridColumn: '1 / -1' }}>Venue<select value={venue} onChange={e => setVenue(e.target.value)}>{state.venues.filter(v => v.status !== 'Maintenance').map(v => <option key={v.id}>{v.name}</option>)}</select></label>
            <label style={{ gridColumn: '1 / -1' }}>Time Slot Template<select value={slot} onChange={e => setSlot(e.target.value)}>{state.timeTemplates.map(t => <option key={t.id} value={t.id}>{t.name} ({t.start}–{t.end})</option>)}</select></label>
          </div>
          <button className="admin-solid-btn" onClick={allocate}>Allocate Session</button>
        </div>}
        {activeIndex === 4 && <div className="admin-workflow-actions"><button className="admin-solid-btn" onClick={assignPanel}>Confirm Examiner &amp; Invigilator</button></div>}
        {activeIndex < 3 && <div className="admin-workflow-actions"><button className="admin-solid-btn" onClick={() => advance(3, `Approved ${app.candidateName}`)}>Mark Approved</button></div>}
        {activeIndex >= STAGES.length - 1 && <p style={{ color: '#2f8f4e', fontWeight: 600, marginTop: 16 }}>Workflow complete — candidate is fully scheduled.</p>}
      </div>
      <div className="admin-config-card">
        <h2 style={{ fontSize: 18 }}>Application Summary</h2>
        <div style={{ marginTop: 14, fontSize: 13, lineHeight: 2 }}>
          <div><strong>Instrument:</strong> {app.instrument}</div>
          <div><strong>Grade:</strong> {app.grade}</div>
          <div><strong>Status:</strong> {app.status}</div>
          {app.assignedVenue && <div><strong>Venue:</strong> {app.assignedVenue}</div>}
          {app.assignedSlot && <div><strong>Slot:</strong> {app.assignedSlot}</div>}
        </div>
      </div>
    </div>
  </div>;
}
