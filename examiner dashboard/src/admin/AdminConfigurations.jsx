import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Info, MapPin, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useAdmin } from './AdminContext.jsx';
import { AdminDialog, ConfirmDialog } from './AdminDialogs.jsx';

const TABS = [['fees', 'Exam Levels & Fees'], ['venues', 'Venues'], ['slots', 'Time Slots']];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function AdminConfigurations() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'fees';
  function setTab(t) { setParams({ tab: t }); }

  return <div>
    <h1>Configurations</h1>
    <div className="admin-tabs">{TABS.map(([key, label]) => <button key={key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>{label}</button>)}</div>
    {tab === 'fees' && <FeesTab />}
    {tab === 'venues' && <VenuesTab />}
    {tab === 'slots' && <SlotsTab />}
  </div>;
}

function FeesTab() {
  const { state, dispatch } = useAdmin();
  const [name, setName] = useState(''); const [rank, setRank] = useState('Level 1 (Beginner)'); const [overview, setOverview] = useState('');
  const [error, setError] = useState('');

  function setFee(id, value) {
    const n = Number(value);
    if (value === '' || (Number.isFinite(n) && n >= 0 && n <= 5000)) dispatch({ type: 'SET_FEE', id, fee: value === '' ? 0 : n });
  }
  function addLevel() {
    if (!name.trim() || !overview.trim()) { setError('Display name and curriculum overview are required.'); return; }
    dispatch({ type: 'ADD_LEVEL', level: { name: name.trim(), rank, overview: overview.trim() } });
    setName(''); setOverview(''); setError('');
  }

  return <div className="admin-config-grid">
    <div>
      <div className="admin-config-card">
        <h2>Fee Structure</h2>
        <p>Configure standard pricing across all academic grades.</p>
        {state.feeLevels.map(f => <div className="admin-fee-row" key={f.id}>
          <strong>{f.name}</strong>
          <span className="admin-fee-input">£<input type="number" min={0} max={5000} value={f.fee} onChange={e => setFee(f.id, e.target.value)} aria-label={`Fee for ${f.name}`} /></span>
        </div>)}
        <button className="admin-solid-btn" style={{ marginTop: 18, width: '100%', justifyContent: 'center' }} disabled>Add</button>
      </div>
      <div className="admin-config-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><h2>Level Definitions</h2><span style={{ color: '#786000', fontSize: 12 }}><Plus size={13} style={{ verticalAlign: -2 }} /> Add New Level</span></div>
        <div className="admin-form-grid">
          <label>Display Name<input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Professional Diploma" /></label>
          <label>Difficulty Rank<select value={rank} onChange={e => setRank(e.target.value)}>{Array.from({ length: 9 }, (_, i) => `Level ${i + 1} (${['Beginner', 'Beginner', 'Foundation', 'Foundation', 'Intermediate', 'Intermediate', 'Advanced', 'Advanced', 'Expert'][i]})`).map(r => <option key={r}>{r}</option>)}</select></label>
          <label className="admin-form-grid full" style={{ gridColumn: '1 / -1' }}>Curriculum Overview<textarea rows={3} value={overview} onChange={e => setOverview(e.target.value)} placeholder="Describe the curriculum scope..." /></label>
        </div>
        {error && <p className="admin-error">{error}</p>}
        <button className="admin-solid-btn" style={{ marginTop: 14, width: '100%', justifyContent: 'center' }} onClick={addLevel}>Add</button>
        {state.levelDefinitions.map(l => <div className="admin-level-item" key={l.id}>
          <div><strong>{l.name}</strong><p>{l.overview}</p></div>
          <span>{l.rank}</span>
        </div>)}
      </div>
    </div>
    <div>
      <div className="admin-config-card">
        <h2 style={{ fontSize: 18 }}>Automation &amp; Logic</h2>
        <div className="admin-toggle-row">
          <div><strong>Auto-Publish Results</strong><small>Release marks immediately after moderator approval</small></div>
          <button className={`admin-switch ${state.automation.autoPublishResults ? 'on' : ''}`} role="switch" aria-checked={state.automation.autoPublishResults} aria-label="Auto-publish results" onClick={() => dispatch({ type: 'SET_AUTOMATION', patch: { autoPublishResults: !state.automation.autoPublishResults } })} />
        </div>
        <div className="admin-toggle-row">
          <div><strong>Candidate Early Access</strong><small>Allow students to view slot availability before booking</small></div>
          <button className={`admin-switch ${state.automation.candidateEarlyAccess ? 'on' : ''}`} role="switch" aria-checked={state.automation.candidateEarlyAccess} aria-label="Candidate early access" onClick={() => dispatch({ type: 'SET_AUTOMATION', patch: { candidateEarlyAccess: !state.automation.candidateEarlyAccess } })} />
        </div>
      </div>
      <div className="admin-config-card">
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><h2 style={{ fontSize: 16 }}>Buffer Durations</h2><span className="admin-template-badge">{state.automation.bufferDuration} MIN</span></div>
        <p>Set the mandatory rest period between scheduled examination performances.</p>
        <div className="admin-slider-row">
          <input type="range" min={5} max={60} step={5} value={state.automation.bufferDuration} onChange={e => dispatch({ type: 'SET_AUTOMATION', patch: { bufferDuration: Number(e.target.value) } })} aria-label="Buffer duration in minutes" />
          <div className="admin-slider-ticks"><span>5M</span><span>15M</span><span>30M</span><span>45M</span><span>60M</span></div>
        </div>
      </div>
      <div className="admin-info-card"><span><Info size={18} /></span><p style={{ fontSize: 12.5 }}>Buffers are calculated automatically within the <strong>Time Slots</strong> engine to prevent examiner fatigue.</p></div>
    </div>
  </div>;
}

function VenuesTab() {
  const { state, dispatch, setNotice } = useAdmin();
  const [q, setQ] = useState(''); const [status, setStatus] = useState('All Statuses');
  const [modal, setModal] = useState(null); // 'add' | venue object for edit/schedule

  const list = state.venues.filter(v => (status === 'All Statuses' || v.status === status) && (v.name.toLowerCase().includes(q.toLowerCase()) || v.location.toLowerCase().includes(q.toLowerCase())));

  return <div>
    <div className="admin-toolbar" style={{ marginTop: 24 }}>
      <div className="admin-filter-input" style={{ flex: 1 }}><Search size={16} /><input placeholder="Search venues by name or location..." value={q} onChange={e => setQ(e.target.value)} /></div>
      <select value={status} onChange={e => setStatus(e.target.value)} style={{ border: '1px solid #e2ded2', borderRadius: 10, padding: '11px 14px' }}><option>All Statuses</option><option>Active</option><option>Maintenance</option></select>
      <button className="admin-solid-btn" onClick={() => setModal('add')}><Plus size={15} />Add New Venue</button>
    </div>
    <div className="admin-venue-grid">
      {list.length === 0 && <p className="admin-empty">No venues match your search.</p>}
      {list.map(v => <div className="admin-venue-card" key={v.id}>
        <div className="admin-venue-card-head"><h3>{v.name}</h3><span className={`admin-pill ${v.status === 'Active' ? 'approved' : 'queried'}`}>{v.status.toUpperCase()}</span></div>
        <div className="admin-location"><MapPin size={13} />{v.location}</div>
        <div className="admin-venue-stats">
          <div><label>Capacity</label><strong>{v.capacity} Seats</strong></div>
          <div><label>{v.extraLabel}</label><strong>{v.extra}</strong></div>
        </div>
        <div className="admin-venue-card-actions">
          <button className="admin-ghost-btn" onClick={() => setModal(v)}>Edit</button>
          <button className="admin-row-btn" onClick={() => setNotice(`Viewing schedule for ${v.name}`)}>View Schedule</button>
        </div>
      </div>)}
    </div>
    {modal === 'add' && <VenueDialog onClose={() => setModal(null)} onSave={venue => { dispatch({ type: 'ADD_VENUE', venue }); setModal(null); }} />}
    {modal && modal !== 'add' && <VenueDialog venue={modal} onClose={() => setModal(null)} onSave={patch => { dispatch({ type: 'EDIT_VENUE', id: modal.id, patch }); setModal(null); }} />}
  </div>;
}

function VenueDialog({ venue, onClose, onSave }) {
  const [name, setName] = useState(venue?.name || '');
  const [location, setLocation] = useState(venue?.location || '');
  const [capacity, setCapacity] = useState(venue?.capacity || '');
  const [status, setStatus] = useState(venue?.status || 'Active');
  const [error, setError] = useState('');
  function save() {
    const cap = Number(capacity);
    if (!name.trim() || !location.trim()) { setError('Venue name and location are required.'); return; }
    if (!Number.isInteger(cap) || cap <= 0) { setError('Capacity must be a positive whole number.'); return; }
    onSave({ name: name.trim(), location: location.trim(), capacity: cap, status, extra: venue?.extra || 'Standard', extraLabel: venue?.extraLabel || 'Type' });
  }
  return <AdminDialog title={venue ? `Edit ${venue.name}` : 'Add New Venue'} onClose={onClose}>
    <h2>{venue ? 'Edit Venue' : 'Add New Venue'}</h2>
    <div className="admin-form-grid" style={{ marginTop: 16 }}>
      <label style={{ gridColumn: '1 / -1' }}>Venue Name<input value={name} onChange={e => setName(e.target.value)} /></label>
      <label style={{ gridColumn: '1 / -1' }}>Location<input value={location} onChange={e => setLocation(e.target.value)} /></label>
      <label>Capacity<input type="number" min={1} value={capacity} onChange={e => setCapacity(e.target.value)} /></label>
      <label>Status<select value={status} onChange={e => setStatus(e.target.value)}><option>Active</option><option>Maintenance</option></select></label>
    </div>
    {error && <p className="admin-error">{error}</p>}
    <div className="admin-dialog-actions"><button className="admin-ghost-btn" onClick={onClose}>Cancel</button><button className="admin-solid-btn" onClick={save}>Save Venue</button></div>
  </AdminDialog>;
}

function SlotsTab() {
  const { state, dispatch } = useAdmin();
  const [visible, setVisible] = useState(4);
  const [modal, setModal] = useState(null); // 'add' | template
  const [deleteId, setDeleteId] = useState(null);
  const { schedulingWindow, bufferLogic } = state;

  function toggleDay(d) {
    const days = schedulingWindow.days.includes(d) ? schedulingWindow.days.filter(x => x !== d) : [...schedulingWindow.days, d];
    dispatch({ type: 'SET_SCHEDULING_WINDOW', patch: { days } });
  }

  return <div>
    <div className="admin-page-head" style={{ marginTop: 30 }}>
      <div><h2>Scheduling Framework</h2><p>Configure the institutional temporal boundaries and session templates for the upcoming examination cycle.</p></div>
      <button className="admin-outline-btn" onClick={() => setModal('add')}><Plus size={15} />Add New Template</button>
    </div>
    <div className="admin-config-grid">
      <div>
        <div className="admin-config-card">
          <h2 style={{ fontSize: 17 }}>Standard Exam Window</h2>
          <div className="admin-form-grid">
            <label>Start Time<input type="time" value={to24(schedulingWindow.start)} onChange={e => dispatch({ type: 'SET_SCHEDULING_WINDOW', patch: { start: to12(e.target.value) } })} /></label>
            <label>End Time<input type="time" value={to24(schedulingWindow.end)} onChange={e => dispatch({ type: 'SET_SCHEDULING_WINDOW', patch: { end: to12(e.target.value) } })} /></label>
          </div>
          <label style={{ marginTop: 16, display: 'block' }}>Days of Operation</label>
          <div className="admin-day-pills">{DAYS.map(d => <button key={d} type="button" className={`admin-day-pill ${schedulingWindow.days.includes(d) ? 'active' : ''}`} onClick={() => toggleDay(d)}>{d}</button>)}</div>
        </div>
        <div className="admin-config-card">
          <h2 style={{ fontSize: 17 }}>Buffer &amp; Interval Logic</h2>
          <div className="admin-toggle-row"><div><strong>Inter-Exam Buffer</strong><small>Cooldown time between sessions</small></div><span className="admin-fee-input">{bufferLogic.interExamBuffer}<span style={{ marginLeft: 4, color: '#9c9b93' }}>min</span></span></div>
          <div className="admin-toggle-row"><div><strong>Examiner Break Interval</strong><small>Auto-insert break after X sessions</small></div><span className="admin-fee-input">{bufferLogic.examinerBreakInterval}<span style={{ marginLeft: 4, color: '#9c9b93' }}>slots</span></span></div>
          <div className="admin-toggle-row">
            <div><strong>Overtime Protection</strong><small>Restrict slots exceeding end time</small></div>
            <button className={`admin-switch ${bufferLogic.overtimeProtection ? 'on' : ''}`} role="switch" aria-checked={bufferLogic.overtimeProtection} aria-label="Overtime protection" onClick={() => dispatch({ type: 'SET_BUFFER_LOGIC', patch: { overtimeProtection: !bufferLogic.overtimeProtection } })} />
          </div>
        </div>
      </div>
      <div className="admin-config-card">
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><h2 style={{ fontSize: 17 }}>Template Registry</h2><span className="admin-template-badge">{state.timeTemplates.length} ACTIVE TEMPLATES</span></div>
        {state.timeTemplates.slice(0, visible).map(t => <div className="admin-template-item" key={t.id}>
          <div><strong>{t.name}</strong><p>{t.desc}</p><div className="admin-template-meta"><span>◆ {t.start} — {t.end}</span><span>⏱ {t.duration} min duration</span><span>{t.venue}</span></div></div>
          <div className="admin-template-actions">
            <button className="admin-icon-btn" aria-label={`Edit ${t.name}`} onClick={() => setModal(t)}><Pencil size={16} /></button>
            <button className="admin-icon-btn danger" aria-label={`Delete ${t.name}`} onClick={() => setDeleteId(t.id)}><Trash2 size={16} /></button>
          </div>
        </div>)}
        {visible < state.timeTemplates.length && <button className="admin-load-more" onClick={() => setVisible(v => v + 4)}>Load More Templates ⌄</button>}
      </div>
    </div>
    {modal === 'add' && <TemplateDialog onClose={() => setModal(null)} onSave={t => { dispatch({ type: 'ADD_TEMPLATE', template: t }); setModal(null); }} />}
    {modal && modal !== 'add' && <TemplateDialog template={modal} onClose={() => setModal(null)} onSave={patch => { dispatch({ type: 'EDIT_TEMPLATE', id: modal.id, patch }); setModal(null); }} />}
    {deleteId && <ConfirmDialog title="Delete this template?" body="This time-slot template will be permanently removed from the registry." confirmLabel="Delete" danger onClose={() => setDeleteId(null)} onConfirm={() => { dispatch({ type: 'DELETE_TEMPLATE', id: deleteId }); setDeleteId(null); }} />}
  </div>;
}

function to24(label) {
  const [time, mer] = label.split(' ');
  let [h, m] = time.split(':').map(Number);
  if (mer === 'PM' && h !== 12) h += 12;
  if (mer === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
function to12(value) {
  let [h, m] = value.split(':').map(Number);
  const mer = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} ${mer}`;
}

function TemplateDialog({ template, onClose, onSave }) {
  const [name, setName] = useState(template?.name || '');
  const [desc, setDesc] = useState(template?.desc || '');
  const [start, setStart] = useState(template?.start || '09:00');
  const [end, setEnd] = useState(template?.end || '10:00');
  const [venue, setVenue] = useState(template?.venue || '');
  const [error, setError] = useState('');
  function save() {
    if (!name.trim()) { setError('Template name is required.'); return; }
    if (start >= end) { setError('Start time must be before end time.'); return; }
    const [sh, sm] = start.split(':').map(Number); const [eh, em] = end.split(':').map(Number);
    const duration = (eh * 60 + em) - (sh * 60 + sm);
    if (duration <= 0) { setError('Duration must be greater than zero.'); return; }
    onSave({ name: name.trim(), desc: desc.trim(), start, end, duration, venue: venue.trim() || 'Unassigned' });
  }
  return <AdminDialog title={template ? `Edit ${template.name}` : 'Add New Template'} onClose={onClose}>
    <h2>{template ? 'Edit Template' : 'Add New Template'}</h2>
    <div className="admin-form-grid" style={{ marginTop: 16 }}>
      <label style={{ gridColumn: '1 / -1' }}>Template Name<input value={name} onChange={e => setName(e.target.value)} /></label>
      <label style={{ gridColumn: '1 / -1' }}>Description<input value={desc} onChange={e => setDesc(e.target.value)} /></label>
      <label>Start Time<input type="time" value={start} onChange={e => setStart(e.target.value)} /></label>
      <label>End Time<input type="time" value={end} onChange={e => setEnd(e.target.value)} /></label>
      <label style={{ gridColumn: '1 / -1' }}>Venue<input value={venue} onChange={e => setVenue(e.target.value)} /></label>
    </div>
    {error && <p className="admin-error">{error}</p>}
    <div className="admin-dialog-actions"><button className="admin-ghost-btn" onClick={onClose}>Cancel</button><button className="admin-solid-btn" onClick={save}>Save Template</button></div>
  </AdminDialog>;
}
