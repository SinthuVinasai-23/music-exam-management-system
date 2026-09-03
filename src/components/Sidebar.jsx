import React from 'react'
import Icon from './Icon.jsx'
import logo from '../assets/mems-logo.png'

const items = [
  ['dashboard', 'Dashboard', '#/dashboard'],
  ['applications', 'Applications', '#/applications'],
  ['config', 'Configurations', '#/configurations'],
  ['users', 'Users', '#/users'],
  ['results', 'Results', '#/results'],
  ['ceremony', 'Ceremony', '#/ceremony'],
  ['mail', 'Email Logs', '#/email-logs']
]

export default function Sidebar({ route, onNavigate }) {
  return (
    <aside className="sidebar">
      <div className="brand-wrap"><img src={logo} alt="Music Examination Management System" /></div>
      <nav className="side-nav" aria-label="Admin navigation">
        {items.map(([icon, label, href]) => {
          const active = href.slice(1) === route
          return (
            <button key={label} className={`side-item ${active ? 'active' : ''}`} onClick={() => onNavigate(href.slice(1))}>
              <Icon name={icon} size={20} />
              <span>{label}</span>
            </button>
          )
        })}
      </nav>
      <button className="logout"><Icon name="logout" size={18}/><span>Logout</span></button>
    </aside>
  )
}
