import React, { useEffect, useRef, useState } from 'react';
import { usePortal } from '../store';
import { Avatar, Icon, IconButton } from './ui';
const nav = [
  ['dashboard', 'LayoutDashboard', 'Dashboard'],
  ['application-line', 'ClipboardList', 'Application Line'],
  ['students', 'Users', 'My Student List'],
  ['exam-slots', 'Armchair', 'Exam Slots'],
];
export default function Layout({ page, navigate, logout, children }) {
  const { state, storageError } = usePortal();
  const [history, setHistory] = useState(false),
    [search, setSearch] = useState(''),
    [mobile, setMobile] = useState(false);
  const historyRef = useRef();
  useEffect(() => {
    const close = (e) => {
      if (e.type === 'keydown' && e.key === 'Escape') {
        setHistory(false);
        setSearch('');
        setMobile(false);
      } else if (
        e.type === 'pointerdown' &&
        !historyRef.current?.contains(e.target)
      )
        setHistory(false);
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', close);
    };
  }, []);
  const results = search.trim()
    ? state.applications
        .filter((a) =>
          `${a.name} ${a.id} ${a.discipline}`
            .toLowerCase()
            .includes(search.toLowerCase()),
        )
        .slice(0, 5)
    : [];
  return (
    <div className="portal-shell">
      <aside className={`sidebar ${mobile ? 'open' : ''}`}>
        <div className="brand">
          <span className="brand-mark">𝄞</span>
          <div>
            Music Examination<small>MANAGEMENT SYSTEM</small>
          </div>
        </div>
        <nav>
          {nav.map(([key, icon, label]) => (
            <button
              key={key}
              className={page === key ? 'active' : ''}
              onClick={() => navigate(key)}
            >
              <Icon name={icon} />
              {label}
            </button>
          ))}
        </nav>
        <button className="logout" onClick={logout}>
          <Icon name="LogOut" />
          Logout
        </button>
      </aside>
      {mobile && (
        <button
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <header className="header">
        <span className="mobile-toggle">
          <IconButton
            name="Menu"
            label="Open navigation"
            onClick={() => setMobile(!mobile)}
          />
        </span>
        <div className="global-search">
          <Icon name="Search" />
          <input
            aria-label="Search applications"
            placeholder="Search applications..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <div className="search-results">
              <small>APPLICATIONS · FIFO REVIEW ORDER</small>
              {results.length ? (
                results.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => {
                      setSearch('');
                      navigate('application-line');
                    }}
                  >
                    <strong>{a.name}</strong>
                    <small>
                      #{a.id} · {a.discipline}
                    </small>
                    <span>{a.status}</span>
                  </button>
                ))
              ) : (
                <p>No applications match your search.</p>
              )}
            </div>
          )}
        </div>
        <span className="portal-title">Teacher Portal</span>
        <div className="header-actions">
          <IconButton
            name="Settings"
            label="Account settings"
            onClick={() => navigate('settings')}
          />
          <span className="notification-bell">
            <IconButton
              name="Bell"
              label="Notifications"
              onClick={() => navigate('notifications')}
            />
            {state.notifications.some((n) => !n.read) && <i />}
          </span>
          <div className="history-anchor" ref={historyRef}>
            <IconButton
              name="History"
              label="Recent activity"
              onClick={() => setHistory(!history)}
            />
            {history && (
              <div className="activity-dropdown">
                <div className="activity-heading">
                  <strong>Recent Activity</strong>
                  <span>{Math.min(state.activity.length, 5)} Actions</span>
                </div>
                {state.activity.slice(0, 5).map((a) => (
                  <div className="activity-row" key={a.id}>
                    <span className="round-icon">
                      <Icon name="CircleCheck" size={16} />
                    </span>
                    <div>
                      {a.text}
                      <small>{a.time}</small>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button
            className="profile-button"
            onClick={() => navigate('settings')}
          >
            <span>
              <strong>
                {state.profile.firstName} {state.profile.lastName}
              </strong>
              <small>Teacher</small>
            </span>
            <Avatar photo={state.profile.photo} />
          </button>
        </div>
      </header>
      <main className={`main ${page === 'dashboard' ? 'dashboard-main' : ''}`}>
        <div className="background-art" aria-hidden="true" />
        {storageError && (
          <div role="alert" className="error">
            {storageError}
          </div>
        )}
        <div className="page-content">{children}</div>
      </main>
    </div>
  );
}
