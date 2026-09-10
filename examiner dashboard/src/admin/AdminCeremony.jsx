import { useState } from 'react';
import { MoreHorizontal, Plus, Search } from 'lucide-react';
import { useAdmin } from './AdminContext.jsx';
import { AdminDialog } from './AdminDialogs.jsx';
import { downloadCsv } from './downloadCsv.js';

const RSVP_CLASS = { Attending: 'attending', 'Not Attending': 'notattending', Pending: 'pendingrsvp' };

export default function AdminCeremony() {
  const { state, dispatch, setNotice } = useAdmin();
  const [q, setQ] = useState('');
  const [editRow, setEditRow] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);

  const rows = state.ceremonyAttendance.filter(a => a.candidate.toLowerCase().includes(q.toLowerCase()));

  function groupSize(accountId) { return state.ceremonyAttendance.filter(a => a.accountId === accountId).length; }

  function saveEdit(row, patch) {
    const groupIds = state.ceremonyAttendance.filter(a => a.accountId === row.accountId).map(a => a.id);
    if (patch.sessionId && patch.sessionId !== row.sessionId && groupIds.length > 1) {
      dispatch({ type: 'UPDATE_ATTENDANCE', ids: groupIds, patch: { sessionId: patch.sessionId }, taskTitle: `Moved ${row.candidate}'s account group to a new ceremony session` });
      setNotice(`${groupIds.length} candidates on this account were moved together to keep the required same-slot grouping.`);
      const { sessionId, ...rest } = patch;
      if (Object.keys(rest).length) dispatch({ type: 'UPDATE_ATTENDANCE', ids: [row.id], patch: rest });
    } else {
      dispatch({ type: 'UPDATE_ATTENDANCE', ids: [row.id], patch, taskTitle: `Updated attendance for ${row.candidate}` });
    }
    setEditRow(null);
  }

  function exportList() { downloadCsv('ceremony-attendance.csv', rows); setNotice('Downloading document'); }

  return <div>
    <h1>Ceremony &amp; Attendance Management</h1>
    <p style={{ color: '#62665f', marginTop: 6, maxWidth: 720 }}>Coordinate examination award sessions, manage seat capacities across multiple venues, and finalize attendance lists for the 2024 Conservatory Convocation.</p>

    <div className="admin-panel-head" style={{ marginTop: 34 }}><h2>Active Sessions</h2></div>
    <div className="admin-session-grid">
      {state.ceremonySessions.map(s => <div className="admin-session-card" key={s.id}>
        <div className="admin-session-card-head"><span className="admin-session-tag">{s.label.toUpperCase()}</span><span style={{ color: '#8a6f0f', fontWeight: 700, fontSize: 13 }}>{Math.round(s.booked / s.capacity * 100)}%</span></div>
        <h3>{s.name}</h3>
        <div className="admin-session-loc">📍 {s.venue}</div>
        <div className="admin-session-meta-row">
          <div><label>TIME SLOT</label><strong>{s.time}</strong></div>
          <div style={{ textAlign: 'right' }}><label>SEAT CAPACITY</label><strong>{s.booked} / {s.capacity} Seats</strong></div>
        </div>
      </div>)}
      <button className="admin-create-session" onClick={() => setCreateOpen(true)}>
        <span><Plus size={22} /></span>
        <strong>Create New Session</strong>
        Initialize a new ceremony block and assign venues and times.
      </button>
    </div>

    <div className="admin-panel" style={{ marginTop: 34 }}>
      <div className="admin-panel-head">
        <div><h2>Ceremony Attendance List</h2><p style={{ color: '#83867f', fontSize: 13, marginTop: 4 }}>Detailed candidate breakdown for current session selection.</p></div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div className="admin-filter-input"><Search size={15} /><input placeholder="Filter by name..." value={q} onChange={e => setQ(e.target.value)} /></div>
          <button className="admin-ghost-btn" onClick={exportList}>Export List ⌄</button>
        </div>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>Candidate Name</th><th>Instrument &amp; Level</th><th>Award Type</th><th>RSVP Status</th><th>Seat Number</th><th>Actions</th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={6} className="admin-empty">No candidates match this filter.</td></tr>}
            {rows.map(r => <tr key={r.id}>
              <td><div className="admin-cell-name"><span className="admin-avatar" style={{ width: 34, height: 34 }} /><div><strong>{r.candidate}</strong><small>ID: {r.regId}</small>{groupSize(r.accountId) > 1 && <small style={{ color: '#8a6f0f' }}> · linked account</small>}</div></div></td>
              <td>{r.instrument}<br /><small style={{ color: '#9c9b93' }}>{r.level}</small></td>
              <td><span className="admin-pill active">{r.award}</span></td>
              <td><span className={`admin-pill ${RSVP_CLASS[r.rsvp]}`}><span className={`admin-dot ${r.rsvp === 'Attending' ? 'green' : r.rsvp === 'Not Attending' ? 'red' : 'gray'}`} />{r.rsvp}</span></td>
              <td>{r.seat || '—'}</td>
              <td><button className="admin-icon" aria-label={`Edit ${r.candidate}`} onClick={() => setEditRow(r)}><MoreHorizontal size={17} /></button></td>
            </tr>)}
          </tbody>
        </table>
      </div>
      <div className="admin-pagination"><span className="admin-pagination-info">Showing 1 to {rows.length} of {state.ceremonyAttendance.length + 276} candidates</span><button className="active">1</button><button>2</button><button>3</button><button>›</button></div>
    </div>

    {editRow && <EditAttendanceDialog row={editRow} sessions={state.ceremonySessions} rows={state.ceremonyAttendance} onClose={() => setEditRow(null)} onSave={saveEdit} />}
    {createOpen && <CreateSessionDialog venues={state.venues} onClose={() => setCreateOpen(false)} onSave={session => { dispatch({ type: 'ADD_CEREMONY_SESSION', session }); setCreateOpen(false); }} />}
  </div>;
}

function EditAttendanceDialog({ row, sessions, rows, onClose, onSave }) {
  const [rsvp, setRsvp] = useState(row.rsvp);
  const [seat, setSeat] = useState(row.seat);
  const [sessionId, setSessionId] = useState(row.sessionId);
  const [error, setError] = useState('');
  const grouped = rows.filter(r => r.accountId === row.accountId && r.id !== row.id);
  function save() {
    if (seat && rows.some(r => r.id !== row.id && r.sessionId === sessionId && r.seat === seat)) { setError('That seat is already assigned within this session.'); return; }
    if ((!row.passed || grouped.some(g => !g.passed)) && sessionId) { setError('Only passing candidates may be allocated to a ceremony session.'); return; }
    onSave(row, { rsvp, seat, sessionId });
  }
  return <AdminDialog title={`Edit attendance for ${row.candidate}`} onClose={onClose}>
    <h2>Edit Attendance</h2>
    {grouped.length > 0 && <p style={{ fontSize: 12.5, color: '#8a6f0f', background: '#fbf6e3', border: '1px solid #f0e3ae', borderRadius: 8, padding: '10px 12px', marginTop: 12 }}>
      This account also includes {grouped.map(g => g.candidate).join(', ')}. Changing the ceremony session will move the whole account group together — they cannot be split into different slots.
    </p>}
    <div className="admin-form-grid" style={{ marginTop: 16 }}>
      <label>RSVP Status<select value={rsvp} onChange={e => setRsvp(e.target.value)}><option>Attending</option><option>Not Attending</option><option>Pending</option></select></label>
      <label>Seat Number<input value={seat} onChange={e => setSeat(e.target.value)} placeholder="e.g. A-12" /></label>
      <label style={{ gridColumn: '1 / -1' }}>Ceremony Session<select value={sessionId} onChange={e => setSessionId(e.target.value)}>{sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
    </div>
    {error && <p className="admin-error">{error}</p>}
    <div className="admin-dialog-actions"><button className="admin-ghost-btn" onClick={onClose}>Cancel</button><button className="admin-solid-btn" onClick={save}>Save Changes</button></div>
  </AdminDialog>;
}

function CreateSessionDialog({ venues, onClose, onSave }) {
  const [name, setName] = useState(''); const [venue, setVenue] = useState(venues.find(v => v.status !== 'Maintenance')?.name || '');
  const [start, setStart] = useState('09:00'); const [end, setEnd] = useState('11:00'); const [capacity, setCapacity] = useState('');
  const [error, setError] = useState('');
  function save() {
    if (!name.trim()) { setError('Session name is required.'); return; }
    if (start >= end) { setError('End time must be after start time.'); return; }
    const cap = Number(capacity);
    if (!Number.isInteger(cap) || cap <= 0) { setError('Capacity must be a positive whole number.'); return; }
    const chosen = venues.find(v => v.name === venue);
    if (chosen?.status === 'Maintenance') { setError('This venue is under maintenance and cannot be scheduled.'); return; }
    onSave({ label: 'New Session', name: name.trim(), venue, time: `${start} - ${end}`, booked: 0, capacity: cap });
  }
  return <AdminDialog title="Create new ceremony session" onClose={onClose}>
    <h2>Create New Session</h2>
    <div className="admin-form-grid" style={{ marginTop: 16 }}>
      <label style={{ gridColumn: '1 / -1' }}>Session Name<input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Evening Block - Percussion" /></label>
      <label style={{ gridColumn: '1 / -1' }}>Venue<select value={venue} onChange={e => setVenue(e.target.value)}>{venues.map(v => <option key={v.id} disabled={v.status === 'Maintenance'}>{v.name}{v.status === 'Maintenance' ? ' (Maintenance)' : ''}</option>)}</select></label>
      <label>Start Time<input type="time" value={start} onChange={e => setStart(e.target.value)} /></label>
      <label>End Time<input type="time" value={end} onChange={e => setEnd(e.target.value)} /></label>
      <label style={{ gridColumn: '1 / -1' }}>Seat Capacity<input type="number" min={1} value={capacity} onChange={e => setCapacity(e.target.value)} /></label>
    </div>
    {error && <p className="admin-error">{error}</p>}
    <div className="admin-dialog-actions"><button className="admin-ghost-btn" onClick={onClose}>Cancel</button><button className="admin-solid-btn" onClick={save}>Create Session</button></div>
  </AdminDialog>;
}
