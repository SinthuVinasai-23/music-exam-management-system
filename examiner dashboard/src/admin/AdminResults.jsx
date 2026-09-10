import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, ClipboardList, SlidersHorizontal, TrendingUp, Upload } from 'lucide-react';
import { useAdmin } from './AdminContext.jsx';
import { RESULT_SESSIONS_SEED, readExaminerSessions, setExaminerSessionPublished } from './adminState.js';
import { AdminDialog, ConfirmDialog } from './AdminDialogs.jsx';
import { validMark, resultFor } from '../examiner/examinerState.js';
import { EXAMINER_KEY } from './adminState.js';

function averageMarks(candidates) {
  const marked = candidates.filter(c => c.marks !== '' && !Number.isNaN(Number(c.marks)));
  if (!marked.length) return 0;
  return Math.round(marked.reduce((s, c) => s + Number(c.marks), 0) / marked.length);
}

export default function AdminResults() {
  const { state, dispatch, setNotice } = useAdmin();
  const navigate = useNavigate();
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const refresh = e => { if (!e.key || e.key === EXAMINER_KEY) setTick(t => t + 1); };
    window.addEventListener('storage', refresh);
    return () => window.removeEventListener('storage', refresh);
  }, []);
  const [statusFilter, setStatusFilter] = useState('All');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [reviewId, setReviewId] = useState(null);
  const [bulkConfirm, setBulkConfirm] = useState(false);

  const rows = useMemo(() => {
    void tick;
    const seed = RESULT_SESSIONS_SEED.map(r => ({ ...r, ...state.resultOverrides[r.id] }));
    const live = readExaminerSessions().filter(s => s.status === 'Submitted for Admin Review').map(s => ({
      id: `ex-${s.id}`, sessionRef: s.id, name: `${s.subject} – ${s.level}`, examiner: 'Dr. Subramaniam',
      candidates: s.candidates.length, avg: averageMarks(s.candidates), status: s.published ? 'Published' : 'Pending',
      discrepancy: false, examinerBacked: true, examinerSessionId: s.id, rawCandidates: s.candidates,
    }));
    return [...live, ...seed];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.resultOverrides, tick]);

  const filtered = statusFilter === 'All' ? rows : rows.filter(r => r.status === statusFilter);
  const awaiting = rows.filter(r => r.status === 'Pending').length;
  const avgScore = rows.length ? Math.round(rows.reduce((s, r) => s + r.avg, 0) / rows.length * 10) / 10 : 0;
  const published = rows.filter(r => r.status === 'Published').length;
  const discrepancies = rows.filter(r => r.discrepancy).length;

  function setPublished(row, next) {
    if (next && row.discrepancy) { setNotice('Resolve the flagged discrepancy before publishing this session.'); return; }
    if (row.examinerBacked) {
      if (!setExaminerSessionPublished(row.examinerSessionId, next)) { setNotice('Unable to publish: check the saved marks and browser storage.'); return; }
      dispatch({ type: 'TASK', title: `${next ? 'Published' : 'Unpublished'} ${row.name}` });
      setTick(t => t + 1);
    }
    else dispatch({ type: 'SET_RESULT_OVERRIDE', id: row.id, patch: { status: next ? 'Published' : 'Pending' }, taskTitle: `${next ? 'Published' : 'Unpublished'} ${row.name}` });
  }

  function bulkPublish() {
    rows.filter(r => r.status === 'Pending' && !r.discrepancy).forEach(r => setPublished(r, true));
    setBulkConfirm(false);
  }

  const review = reviewId ? rows.find(r => r.id === reviewId) : null;

  return <div>
    <div className="admin-page-head">
      <div><h1>Results Moderation &amp; Publishing</h1><p>Oversee, validate, and authorize the final grade distribution for the Summer 2024 Examination Session.</p></div>
      <div style={{ display: 'flex', gap: 14 }}>
        <button className="admin-outline-btn" onClick={() => setFiltersOpen(true)}><SlidersHorizontal size={15} />Advanced Filters</button>
        <button className="admin-solid-btn" onClick={() => setBulkConfirm(true)}><Upload size={15} />Bulk Publish</button>
      </div>
    </div>

    <div className="admin-stats">
      <div className="admin-stat-card"><span className="admin-stat-icon"><ClipboardList size={19} /></span><label>AWAITING REVIEW</label><strong>{awaiting}</strong><small>Sessions</small></div>
      <div className="admin-stat-card"><span className="admin-stat-icon"><TrendingUp size={19} /></span><label>AVG. SCORE</label><strong>{avgScore}%</strong></div>
      <div className="admin-stat-card"><span className="admin-stat-icon"><CheckCircle2 size={19} /></span><label>PUBLISHED</label><strong>{published}</strong></div>
      <div className="admin-stat-card"><span className="admin-stat-icon red"><AlertTriangle size={19} /></span><label>DISCREPANCIES</label><strong>{String(discrepancies).padStart(2, '0')}</strong></div>
    </div>

    <div className="admin-panel" style={{ marginTop: 30 }}>
      <div className="admin-panel-head"><h2>Active Moderation Queue</h2><span style={{ color: '#8f8f88', fontSize: 12 }}>Showing 1-{filtered.length} of {filtered.length} sessions</span></div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>Session Name</th><th>Examiner Name</th><th>Candidates</th><th>Average Score</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={6} className="admin-empty">No sessions match this filter.</td></tr>}
            {filtered.map(r => <tr key={r.id}>
              <td><strong>{r.name}</strong><br /><small style={{ color: '#9c9b93' }}>SESSION_ID: {r.sessionRef}</small></td>
              <td>{r.examiner}</td>
              <td>{r.candidates} Candidates</td>
              <td><div className="admin-progress-bar" style={{ width: 90, display: 'inline-block', marginRight: 8, verticalAlign: -3 }}><span style={{ width: `${r.avg}%` }} /></div>{r.avg}%</td>
              <td><span className={`admin-pill ${r.status === 'Published' ? 'approved' : 'pending'}`}>{r.status.toUpperCase()}</span>{r.discrepancy && <span className="admin-pill urgent" style={{ marginLeft: 6 }}>DISCREPANCY</span>}</td>
              <td style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button className="admin-link-btn" onClick={() => setReviewId(r.id)}>Review &amp; Edit</button>
                <button className={`admin-switch ${r.status === 'Published' ? 'on' : ''}`} role="switch" aria-checked={r.status === 'Published'} aria-label={`Publish ${r.name}`} onClick={() => setPublished(r, r.status !== 'Published')} />
                <span style={{ fontSize: 11, color: '#9c9b93' }}>PUBLISH</span>
              </td>
            </tr>)}
          </tbody>
        </table>
      </div>
      <button className="admin-load-more" onClick={() => navigate('/admin/audit-logs')}>View Complete Audit History</button>
    </div>

    {review && <ReviewDialog row={review} onClose={() => { setReviewId(null); setTick(t => t + 1); }} />}
    {filtersOpen && <AdminDialog title="Advanced filters" onClose={() => setFiltersOpen(false)}>
      <h2>Advanced Filters</h2>
      <label style={{ display: 'block', marginTop: 16 }}>Status
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ width: '100%', marginTop: 6, border: '1px solid #e2ded2', borderRadius: 10, padding: '11px 14px' }}>
          <option value="All">All Statuses</option><option value="Pending">Pending</option><option value="Published">Published</option>
        </select>
      </label>
      <div className="admin-dialog-actions"><button className="admin-solid-btn" onClick={() => setFiltersOpen(false)}>Apply</button></div>
    </AdminDialog>}
    {bulkConfirm && <ConfirmDialog title="Bulk publish eligible results?" body="Only admin-reviewed sessions with no unresolved discrepancies will be published. Incomplete or flagged sessions are skipped." confirmLabel="Publish Eligible" onClose={() => setBulkConfirm(false)} onConfirm={bulkPublish} />}
  </div>;
}

function ReviewDialog({ row, onClose }) {
  const { dispatch } = useAdmin();
  const [candidates, setCandidates] = useState(row.rawCandidates || []);
  const [error, setError] = useState('');
  function save() {
    if (!candidates.every(c => validMark(c.marks))) { setError('Enter valid marks from 0 to 100 for every candidate.'); return; }
    try {
      const stored = JSON.parse(localStorage.getItem(EXAMINER_KEY));
      const session = stored.sessions.find(s => s.id === row.examinerSessionId);
      if (!session || session.published) { setError('Unpublish this session before editing.'); return; }
      session.candidates = candidates;
      session.moderatedAt = new Date().toISOString();
      localStorage.setItem(EXAMINER_KEY, JSON.stringify(stored));
      dispatch({ type: 'TASK', title: `Reviewed ${row.name}` });
      window.dispatchEvent(new Event('portal-results-changed'));
      onClose();
    } catch { setError('Review could not be saved. Check browser storage.'); }
  }
  return <AdminDialog title={`Review ${row.name}`} wide onClose={onClose}>
    <h2>{row.name}</h2>
    <p style={{ color: '#62665f', fontSize: 13, marginTop: 6 }}>Examiner: {row.examiner} · {row.candidates} candidates · Average {row.avg}%</p>
    {row.discrepancy && <p className="admin-error" style={{ marginTop: 10 }}>This session has a flagged score discrepancy and cannot be published until resolved.</p>}
    <div className="admin-table-wrap" style={{ marginTop: 18 }}>
      <table className="admin-table">
        <thead><tr><th>Candidate</th><th>Marks</th><th>Outcome</th></tr></thead>
        <tbody>
          {row.rawCandidates ? candidates.map(c => <tr key={c.id}><td>{c.name}</td><td><input aria-label={`Marks for ${c.name}`} type="number" min="0" max="100" step="0.01" disabled={row.status === 'Published'} value={c.marks} onChange={e => setCandidates(items => items.map(item => item.id === c.id ? { ...item, marks: e.target.value } : item))} /></td><td>{resultFor(c.marks).outcome}</td></tr>)
            : <tr><td colSpan={3} className="admin-empty">No underlying per-candidate data is recorded for this demo session.</td></tr>}
        </tbody>
      </table>
    </div>
    {error && <p role="alert" className="admin-error">{error}</p>}
    <div className="admin-dialog-actions"><button className="admin-solid-btn" onClick={onClose}>Close</button>{row.examinerBacked && row.status !== 'Published' && <button className="admin-solid-btn" onClick={save}>Save Review</button>}</div>
  </AdminDialog>;
}
