import React from 'react'
import Icon from './Icon.jsx'

export default function Topbar() {
  return (
    <header className="topbar">
      <div className="top-search"><Icon name="search" size={17}/><span>Search applications...</span></div>
      <div className="portal-title">Admin Portal</div>
      <div className="top-actions">
        <button aria-label="Settings"><Icon name="settings" size={20}/></button>
        <button aria-label="Notifications" className="bell-button"><Icon name="bell" size={20}/><span className="notify-dot"/></button>
        <button aria-label="History"><Icon name="history" size={20}/></button>
        <div className="admin-user">
          <div className="admin-copy"><strong>Mr. Rajesh Kumar</strong><span>Admin</span></div>
          <div className="admin-avatar"><Icon name="avatar" size={26}/></div>
        </div>
      </div>
    </header>
  )
}
