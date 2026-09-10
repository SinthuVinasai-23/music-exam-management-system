import { useEffect, useState } from 'react';
import { AlertOctagon, Download, RefreshCw, SlidersHorizontal } from 'lucide-react';
import { useAdmin } from './AdminContext.jsx';
import { AdminDialog } from './AdminDialogs.jsx';
import { downloadCsv } from './downloadCsv.js';

const MAX_ATTEMPTS = 3;
const STATUS_CLASS = { Delivered: 'delivered', Failed: 'failed', Retrying: 'retrying', 'Undeliverable / Admin Review': 'failed' };

export default function AdminEmailLogs() {
  const { state, dispatch, setNotice } = useAdmin();
  const [filter, setFilter] = useState('All');
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Automatic retry cadence: a "Retrying" record advances on its own, up to the
  // 3-attempt cap, after which it is flagged for administrator review.
  useEffect(() => {
    const timer = setInterval(() => {
      state.emailLogs.filter(e => e.status === 'Retrying' && e.attempts < MAX_ATTEMPTS).forEach(e => {
        dispatch({
          type: 'EMAIL_RETRY', id: e.id, next: row => {
            const attempts = row.attempts + 1;
            return attempts >= MAX_ATTEMPTS ? { ...row, attempts, status: 'Undeliverable / Admin Review' } : { ...row, attempts, status: 'Retrying' };
          },
        });
      });
    }, 4000);
    return () => clearInterval(timer);
  }, [state.emailLogs, dispatch]);

  const rows = filter === 'All' ? state.emailLogs : state.emailLogs.filter(e => e.status === filter);
  const failed = state.emailLogs.filter(e => e.status === 'Failed').length;
  const retrying = state.emailLogs.filter(e => e.status === 'Retrying').length;

  function manualRetry(row) {
    if (row.attempts >= MAX_ATTEMPTS) return;
    dispatch({
      type: 'EMAIL_RETRY', id: row.id, next: e => {
        const attempts = e.attempts + 1;
        return attempts >= MAX_ATTEMPTS ? { ...e, attempts, status: 'Undeliverable / Admin Review' } : { ...e, attempts, status: 'Retrying' };
      },
    });
  }
  function exportLogs() { downloadCsv('email-logs.csv', rows); setNotice('Downloading document'); }

  return <div>
    <div className="admin-page-head">
      <div><h1>Email Delivery Logs</h1><p>Monitor system communications and automated retries across the examination network.</p></div>
      <div style={{ display: 'flex', gap: 14 }}>
        <button className="admin-outline-btn" onClick={() => setFiltersOpen(true)}><SlidersHorizontal size={15} />Filter</button>
        <button className="admin-solid-btn" onClick={exportLogs}><Download size={15} />Export</button>
      </div>
    </div>

    <div className="admin-stats" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
      <div className="admin-stat-card"><label>TOTAL SENT</label><strong>12,482</strong></div>
      <div className="admin-stat-card"><span className="admin-stat-icon red"><AlertOctagon size={18} /></span><label>FAILED DELIVERIES</label><strong>{failed + 40}</strong></div>
      <div className="admin-stat-card"><label>PENDING RETRIES</label><strong>{retrying + 13}</strong></div>
    </div>

    <div className="admin-table-wrap" style={{ marginTop: 30 }}>
      <table className="admin-table">
        <thead><tr><th>Timestamp</th><th>Recipient</th><th>Event Type</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={5} className="admin-empty">No log entries match this filter.</td></tr>}
          {rows.map(e => <tr key={e.id}>
            <td>{e.at}</td>
            <td>{e.recipient}</td>
            <td>{e.type}</td>
            <td><span className={`admin-pill ${STATUS_CLASS[e.status]}`}><span className={`admin-dot ${e.status === 'Delivered' ? 'green' : e.status === 'Retrying' ? 'amber' : 'red'}`} />{e.status === 'Retrying' ? `Retrying (${e.attempts}/${MAX_ATTEMPTS})` : e.status}</span></td>
            <td>{e.status === 'Delivered' ? <span style={{ color: '#2f8f4e', fontSize: 12, fontWeight: 600 }}>Sent</span>
              : e.status === 'Retrying' ? <span style={{ color: '#b3811a', fontSize: 12, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}><RefreshCw size={13} />Retrying</span>
                : e.status === 'Undeliverable / Admin Review' ? <span style={{ color: '#c23b3b', fontSize: 12, fontWeight: 600 }}>Admin Review</span>
                  : <button className="admin-row-btn" onClick={() => manualRetry(e)}>Manual Retry</button>}</td>
          </tr>)}
        </tbody>
      </table>
    </div>
    <div className="admin-pagination"><span className="admin-pagination-info">Showing 1 to {rows.length} of 12,482 entries</span><button className="active">1</button><button>2</button><button>3</button><span>…</span><button>15</button><button>›</button></div>

    {filtersOpen && <AdminDialog title="Filter email logs" onClose={() => setFiltersOpen(false)}>
      <h2>Filter</h2>
      <label style={{ display: 'block', marginTop: 16 }}>Status
        <select value={filter} onChange={e => setFilter(e.target.value)} style={{ width: '100%', marginTop: 6, border: '1px solid #e2ded2', borderRadius: 10, padding: '11px 14px' }}>
          <option value="All">All</option><option>Delivered</option><option>Failed</option><option>Retrying</option><option value="Undeliverable / Admin Review">Undeliverable / Admin Review</option>
        </select>
      </label>
      <div className="admin-dialog-actions"><button className="admin-solid-btn" onClick={() => setFiltersOpen(false)}>Apply</button></div>
    </AdminDialog>}
  </div>;
}
