import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ExternalLink, Info, SlidersHorizontal } from 'lucide-react';
import { useAdmin } from './AdminContext.jsx';
import { allApplications, resolvedApplication } from './adminState.js';
import { ApplicationDetailsModal } from './AdminDialogs.jsx';

const PILL = { 'Urgent Review': ['urgent', 'red'], 'Pending Review': ['pending', 'gray'], Approved: ['approved', 'green'], Queried: ['queried', 'amber'] };
const PAGE_SIZE = 4;

export default function AdminApplications() {
  const APPLICATIONS = allApplications();
  const { state, dispatch, setNotice } = useAdmin();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [instrument, setInstrument] = useState('All Disciplines');
  const [grade, setGrade] = useState('Grades 1-8, Diploma');
  const [workflow, setWorkflow] = useState('Processing Only');
  const [applied, setApplied] = useState({ instrument: 'All Disciplines', grade: 'Grades 1-8, Diploma', workflow: 'Processing Only' });
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState(null);

  const q = params.get('q');

  const filtered = useMemo(() => {
    let list = APPLICATIONS.map(a => resolvedApplication(state, a.id));
    if (q) list = list.filter(a => a.id === q || a.candidateName.toLowerCase().includes(q.toLowerCase()));
    if (applied.instrument !== 'All Disciplines') list = list.filter(a => a.instrument === applied.instrument);
    if (applied.grade !== 'Grades 1-8, Diploma') list = list.filter(a => a.grade === applied.grade);
    if (applied.workflow === 'Processing Only') list = list.filter(a => a.status !== 'Approved');
    else if (applied.workflow !== 'All Statuses') list = list.filter(a => a.status === applied.workflow);
    return list; // FIFO: preserve submitted ordering, never reorder
  }, [state, applied, q]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const open = openId ? resolvedApplication(state, openId) : null;
  const instruments = [...new Set(APPLICATIONS.map(a => a.instrument))];
  const gradesList = [...new Set(APPLICATIONS.map(a => a.grade))];

  function applyFilters() { setApplied({ instrument, grade, workflow }); setPage(1); }
  function approve(app) {
    dispatch({ type: 'SET_APPLICATION_STATUS', id: app.id, status: 'Approved' });
    setOpenId(null);
    navigate(`/admin/workflow/${app.id}`);
  }
  function exportList() { setNotice('Downloading document'); }

  return <div>
    <span className="admin-kicker">OPERATIONS</span>
    <h1>Application Registry</h1>

    <div className="admin-toolbar">
      <div className="admin-toolbar-select"><label>Instrument</label><select value={instrument} onChange={e => setInstrument(e.target.value)}><option>All Disciplines</option>{instruments.map(i => <option key={i}>{i}</option>)}</select></div>
      <div className="admin-toolbar-select"><label>Examination Grade</label><select value={grade} onChange={e => setGrade(e.target.value)}><option>Grades 1-8, Diploma</option>{gradesList.map(g => <option key={g}>{g}</option>)}</select></div>
      <div className="admin-toolbar-select"><label>Workflow Status</label><select value={workflow} onChange={e => setWorkflow(e.target.value)}><option>Processing Only</option><option>All Statuses</option><option>Urgent Review</option><option>Pending Review</option><option>Approved</option><option>Queried</option></select></div>
      <button className="admin-solid-btn" style={{ marginLeft: 'auto', alignSelf: 'flex-end' }} onClick={applyFilters}><SlidersHorizontal size={15} />Apply Filters</button>
    </div>

    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead><tr><th>Applicant Details</th><th>Teacher / Mentor</th><th>Program Level</th><th>Submission</th><th>Current Status</th><th>Actions</th></tr></thead>
        <tbody>
          {pageItems.length === 0 && <tr><td colSpan={6} className="admin-empty">No applications match the selected filters.</td></tr>}
          {pageItems.map(a => {
            const [pillClass, dot] = PILL[a.status] || ['pending', 'gray'];
            return <tr key={a.id}>
              <td><div className="admin-cell-name"><span className="admin-avatar" style={{ width: 34, height: 34 }} /><div><strong>{a.candidateName}</strong><small>{a.regId}</small></div></div></td>
              <td>{a.teacher}<br /><small style={{ color: '#9c9b93' }}>{a.institution}</small></td>
              <td><span className={`admin-dot ${dot}`} />{a.programLabel}</td>
              <td>{a.submission}</td>
              <td><span className={`admin-pill ${pillClass}`}>{a.status.toUpperCase()}</span></td>
              <td>{a.status === 'Approved' ? <button className="admin-row-btn" onClick={() => setOpenId(a.id)}>View Details</button> : <button className="admin-row-btn" onClick={() => setOpenId(a.id)}>Manage</button>}</td>
            </tr>;
          })}
        </tbody>
      </table>
    </div>

    <div className="admin-pagination">
      <span className="admin-pagination-info">Showing {filtered.length ? (page - 1) * PAGE_SIZE + 1 : 0} - {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} entries</span>
      <button disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>‹</button>
      {Array.from({ length: Math.min(totalPages, 3) }, (_, i) => i + 1).map(n => <button key={n} className={n === page ? 'active' : ''} onClick={() => setPage(n)}>{n}</button>)}
      {totalPages > 3 && <span style={{ color: '#9c9b93' }}>…</span>}
      {totalPages > 3 && <button className={page === totalPages ? 'active' : ''} onClick={() => setPage(totalPages)}>{totalPages}</button>}
      <button disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>›</button>
    </div>

    <div className="admin-bottom-grid">
      <div className="admin-info-card">
        <span><Info size={20} /></span>
        <div><h3>FIFO Review Protocol</h3><p>Applications are flagged for prioritized review based on submission timestamp and examination window proximity. Ensure all prerequisite documentation is verified before e-signing approval status.</p></div>
      </div>
      <div className="admin-progress-card">
        <div style={{ display: 'flex', justifyContent: 'space-between' }}><h3 style={{ fontSize: 15 }}>Active Session Statistics</h3><small style={{ color: '#9c9b93' }}>Today's Progress</small></div>
        <div className="admin-progress-bar"><span style={{ width: '68%' }} /></div>
        <div className="admin-progress-nums">
          <div><strong>42</strong><small>REVIEWED</small></div>
          <div><strong>12</strong><small>QUERIED</small></div>
        </div>
        <button className="admin-link-btn" style={{ marginTop: 14 }} onClick={exportList}><ExternalLink size={13} style={{ verticalAlign: -2, marginRight: 4 }} />View Analytics</button>
      </div>
    </div>

    {open && <ApplicationDetailsModal application={open} onClose={() => setOpenId(null)} onApprove={approve} />}
  </div>;
}
