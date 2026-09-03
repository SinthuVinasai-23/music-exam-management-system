import React from 'react'
import Sidebar from './Sidebar.jsx'
import Topbar from './Topbar.jsx'

export default function Layout({ route, onNavigate, children }) {
  return (
    <div className="app-shell">
      <Sidebar route={route} onNavigate={onNavigate}/>
      <Topbar/>
      <main className="main-content">{children}</main>
    </div>
  )
}
