import React, { useEffect, useState } from 'react'
import Layout from './components/Layout.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import UserDirectory from './pages/UserDirectory.jsx'

function normalize(hash) {
  const value = (hash || '#/dashboard').replace(/^#/, '')
  return value.startsWith('/') ? value : `/${value}`
}

export default function App() {
  const [route, setRoute] = useState(() => normalize(window.location.hash))
  useEffect(() => {
    if (!window.location.hash) window.location.hash = '/dashboard'
    const handler = () => setRoute(normalize(window.location.hash))
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [])

  function navigate(next) {
    window.location.hash = next
  }

  let content
  if (route === '/users') content = <UserDirectory/>
  else if (route === '/dashboard') content = <AdminDashboard onNavigate={navigate}/>
  else content = <div className="page placeholder"><h1>{route.replace('/', '').replace('-', ' ') || 'Page'}</h1><p>This screen is outside the invigilator assignment frontend demo.</p><button className="gold-button" onClick={() => navigate('/dashboard')}>Back to Dashboard</button></div>

  return <Layout route={route} onNavigate={navigate}>{content}</Layout>
}
