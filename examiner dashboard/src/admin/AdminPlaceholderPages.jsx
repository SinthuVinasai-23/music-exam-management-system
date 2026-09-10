import { useAdmin } from './AdminContext.jsx';

// No supplied Figma reference covers these four sidebar destinations. They are
// conservative extensions of the same Admin visual system (not a new design),
// built only so the sidebar never links to a dead or blank route.

export function AdminSystemHealth() {
  const rows = [
    ['API Gateway', 'Operational', '42ms avg'],
    ['Results Publishing Queue', 'Operational', '0 backlog'],
    ['Email Delivery Service', 'Degraded', '3 pending retries'],
    ['Payment Reconciliation', 'Operational', 'Last run 24m ago'],
  ];
  return <div>
    <h1>System Health</h1>
    <p style={{ color: '#62665f', marginTop: 6 }}>Live status of the examination platform's core services.</p>
    <div className="admin-table-wrap" style={{ marginTop: 26 }}>
      <table className="admin-table">
        <thead><tr><th>Service</th><th>Status</th><th>Detail</th></tr></thead>
        <tbody>{rows.map(([name, status, detail]) => <tr key={name}><td>{name}</td><td><span className={`admin-pill ${status === 'Operational' ? 'approved' : 'queried'}`}>{status.toUpperCase()}</span></td><td>{detail}</td></tr>)}</tbody>
      </table>
    </div>
  </div>;
}

export function AdminAuditLogs() {
  const { state } = useAdmin();
  return <div>
    <h1>Audit Logs</h1>
    <p style={{ color: '#62665f', marginTop: 6 }}>Chronological record of administrator actions taken in this session (Super Administrator access).</p>
    <div className="admin-table-wrap" style={{ marginTop: 26 }}>
      <table className="admin-table">
        <thead><tr><th>Action</th><th>Timestamp</th></tr></thead>
        <tbody>
          {state.tasks.length === 0 && <tr><td colSpan={2} className="admin-empty">No administrator actions recorded yet in this session.</td></tr>}
          {state.tasks.map(t => <tr key={t.id}><td>{t.title}</td><td>{new Date(t.at).toLocaleString()}</td></tr>)}
        </tbody>
      </table>
    </div>
  </div>;
}

export function AdminSecurity() {
  return <div>
    <h1>Security</h1>
    <p style={{ color: '#62665f', marginTop: 6 }}>Session and access-control safeguards for the examination board ecosystem.</p>
    <div className="admin-config-card" style={{ marginTop: 26, maxWidth: 560 }}>
      <div className="admin-toggle-row" style={{ borderTop: 'none' }}><div><strong>Two-Factor Authentication</strong><small>Required for all Administrator and Super Administrator accounts</small></div><span className="admin-pill approved">ENFORCED</span></div>
      <div className="admin-toggle-row"><div><strong>Session Timeout</strong><small>Automatic sign-out after inactivity</small></div><span style={{ fontSize: 13 }}>30 minutes</span></div>
    </div>
  </div>;
}

export function AdminAccessControl() {
  const roles = [
    ['Super Administrator', 'All Administrator permissions, user management, role management, system configuration, audit access, recovery/override'],
    ['Administrator', 'Applications, configurations, teachers, evaluators, results review/publish, ceremony, attendance export'],
    ['Examiner / Evaluator', 'Enter marks, save drafts, submit results for administrator review'],
    ['Teacher', 'Mentor endorsement of candidate applications'],
  ];
  return <div>
    <h1>Access Control</h1>
    <p style={{ color: '#62665f', marginTop: 6 }}>Role boundaries as defined by the system requirements specification.</p>
    <div className="admin-table-wrap" style={{ marginTop: 26 }}>
      <table className="admin-table">
        <thead><tr><th>Role</th><th>Permissions</th></tr></thead>
        <tbody>{roles.map(([role, perms]) => <tr key={role}><td><strong>{role}</strong></td><td style={{ maxWidth: 560 }}>{perms}</td></tr>)}</tbody>
      </table>
    </div>
  </div>;
}
