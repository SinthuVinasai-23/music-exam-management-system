import React from 'react'
import Icon from '../components/Icon.jsx'
import achievement from '../assets/achievement-card.png'

const stats = [
  { icon: 'applications', label: 'TOTAL APPLICATIONS', value: '1,248', sub: 'Updated 24m ago', badge: '+12%' },
  { icon: 'calendar', label: 'PENDING RESULTS', value: '84', sub: 'Action Required', red: true },
  { icon: 'applications', label: 'UPCOMING EXAMS', value: '312', sub: 'Next 14 days' },
  { icon: 'ceremony', label: 'CEREMONY SEATS', value: '450', progress: true }
]

const activity = [
  ['star', 'Mridangam – Grade 2 results for London North district have been published successfully.', '10:45 AM', 'Automatic System'],
  ['users', 'New examiner Dr. Alistair Finch assigned to London Central district.', '09:12 AM', 'Assigned by Sarah K.'],
  ['config', 'Syllabus configuration updated for 2025 Contemporary Woodwind modules.', 'Yesterday', 'Registry Desk'],
  ['report', 'Financial reconciliation completed for May examination cycle.', 'Yesterday', 'Finance Dept']
]

export default function AdminDashboard({ onNavigate }) {
  return (
    <div className="page dashboard-page">
      <div className="page-heading dashboard-heading">
        <div><h1>Institutional Overview</h1><p>Administrative insights for the 2024 Academic Period.</p></div>
        <button className="outline-button"><span>⌄</span> Reports</button>
      </div>
      <div className="stat-grid">
        {stats.map((s) => <div className="stat-card" key={s.label}>
          <div className="stat-top"><span className={`stat-icon ${s.red ? 'red' : ''}`}><Icon name={s.icon} size={18}/></span>{s.badge && <span className="stat-badge">{s.badge}</span>}{s.progress && <strong className="percent">85%</strong>}</div>
          <div className="stat-label">{s.label}</div>
          <div className="stat-value">{s.value}</div>
          {s.progress ? <div className="progress-line"><span/><i/></div> : <div className={`stat-sub ${s.red ? 'red-copy' : ''}`}>{s.sub}</div>}
        </div>)}
      </div>
      <div className="dashboard-lower">
        <section>
          <div className="section-head"><h2>Recent Activity</h2><button>View Audit Log</button></div>
          <div className="activity-card">
            {activity.map(([icon, text, time, source]) => <div className="activity-row" key={text}>
              <span className="activity-icon"><Icon name={icon} size={18}/></span>
              <div><strong>{text}</strong><p>{time}<span>•</span><b>{source}</b></p></div>
            </div>)}
            <button className="load-more">Load More Events</button>
          </div>
        </section>
        <aside className="quick-column">
          <h2>Quick Actions</h2>
          <button className="quick-card"><span><Icon name="sliders"/></span><div><strong>Configure Workflow</strong><p>Adjust automation rules</p></div></button>
          <button className="quick-card" onClick={() => onNavigate('/users')}><span><Icon name="users"/></span><div><strong>Manage Users</strong><p>Permissions &amp; roles</p></div></button>
          <button className="quick-card"><span><Icon name="report"/></span><div><strong>Export Reports</strong><p>CSV, PDF, or XLSX</p></div></button>
          <button className="quick-card"><span><Icon name="shield"/></span><div><strong>System Audit</strong><p>View security logs</p></div></button>
          <img className="achievement-card" src={achievement} alt="Institutional achievement: Excellence in Arts 2024" />
        </aside>
      </div>
    </div>
  )
}
