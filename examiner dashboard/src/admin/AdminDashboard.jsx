import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Award, CalendarClock, Download, FileText, ShieldCheck, SlidersHorizontal, Users } from 'lucide-react';
import { useAdmin } from './AdminContext.jsx';
import { allApplications } from './adminState.js';

const ACTIVITY = [
  { icon: '★', text: 'Mridangam – Grade 2 results for London North district have been published successfully.', time: '10:45 AM', who: 'Automatic System' },
  { icon: '➕', text: 'New examiner Meenakshi Iyer Finch assigned to London Central district.', time: '09:12 AM', who: 'Assigned by Sarah K.' },
  { icon: '↻', text: 'Syllabus configuration updated for 2025 Contemporary Woodwind modules.', time: 'Yesterday', who: 'Registry Desk' },
  { icon: '💷', text: 'Financial reconciliation completed for May examination cycle.', time: 'Yesterday', who: 'Finance Dept' },
];

export default function AdminDashboard() {
  const { setNotice, dispatch } = useAdmin();
  const navigate = useNavigate();
  const totalApplications = allApplications().length + 1120;
  const pendingResults = 84;

  function download(label) {
    setNotice('Downloading document');
    dispatch({ type: 'TASK', title: label });
  }

  return <div>
    <div className="admin-page-head">
      <div><span className="admin-kicker">ADMINISTRATOR</span><h1>Institutional Overview</h1><p>Administrative insights for the 2024 Academic Period.</p></div>
      <button className="admin-outline-btn" onClick={() => download('Downloaded institutional report')}><Download size={16} />Reports</button>
    </div>

    <div className="admin-stats">
      <button className="admin-stat-card" style={{ textAlign: 'left', border: '1px solid #f5f3f1' }} onClick={() => navigate('/admin/applications')} aria-label="Open Application Registry">
        <div className="admin-stat-top"><span className="admin-stat-icon"><FileText size={19} /></span><span className="admin-stat-badge">+12%</span></div>
        <label>TOTAL APPLICATIONS</label><strong>{totalApplications.toLocaleString()}</strong><small>Updated 24m ago</small>
      </button>
      <div className="admin-stat-card">
        <div className="admin-stat-top"><span className="admin-stat-icon red"><AlertTriangle size={19} /></span></div>
        <label>PENDING RESULTS</label><strong>{pendingResults}</strong><small className="warn">Action Required</small>
      </div>
      <div className="admin-stat-card">
        <div className="admin-stat-top"><span className="admin-stat-icon"><CalendarClock size={19} /></span></div>
        <label>UPCOMING EXAMS</label><strong>312</strong><small>Next 14 days</small>
      </div>
      <div className="admin-stat-card">
        <div className="admin-stat-top"><span className="admin-stat-icon"><Award size={19} /></span>
          <span className="admin-ring-wrap"><svg width="40" height="40"><circle cx="20" cy="20" r="16" fill="none" stroke="#efece3" strokeWidth="4" /><circle cx="20" cy="20" r="16" fill="none" stroke="#cfad38" strokeWidth="4" strokeDasharray={2 * Math.PI * 16} strokeDashoffset={2 * Math.PI * 16 * .15} transform="rotate(-90 20 20)" /></svg></span>
        </div>
        <label>CEREMONY SEATS</label><strong>450</strong><small>85%</small>
      </div>
    </div>

    <div className="admin-body-grid">
      <div className="admin-panel">
        <div className="admin-panel-head"><h2>Recent Activity</h2><button className="admin-text-link" onClick={() => navigate('/admin/audit-logs')}>View Audit Log</button></div>
        {ACTIVITY.map((a, i) => <div className="admin-activity-item" key={i}>
          <span className="admin-activity-icon">{a.icon}</span>
          <div><p>{a.text}</p><small>{a.time} <b>·</b> {a.who}</small></div>
        </div>)}
        <button className="admin-load-more" onClick={() => setNotice('No further events to load')}>Load More Events</button>
      </div>
      <div>
        <div className="admin-panel admin-quick-actions">
          <h2>Quick Actions</h2>
          <button className="admin-quick-card" onClick={() => navigate('/admin/configurations')}><span><SlidersHorizontal size={18} /></span><div><strong>Configure Workflow</strong><small>Adjust automation rules</small></div></button>
          <button className="admin-quick-card" onClick={() => navigate('/admin/users')}><span><Users size={18} /></span><div><strong>Manage Users</strong><small>Permissions &amp; roles</small></div></button>
          <button className="admin-quick-card" onClick={() => download('Exported reports (CSV, PDF, XLSX)')}><span><FileText size={18} /></span><div><strong>Export Reports</strong><small>CSV, PDF, or XLSX</small></div></button>
          <button className="admin-quick-card" onClick={() => navigate('/admin/audit-logs')}><span><ShieldCheck size={18} /></span><div><strong>System Audit</strong><small>View security logs</small></div></button>
        </div>
        <div className="admin-achievement">
          <small>INSTITUTIONAL ACHIEVEMENT</small>
          <h3>Excellence in Arts 2024</h3>
          <p>Ceremony Scheduled for Oct 12th</p>
        </div>
      </div>
    </div>
  </div>;
}
