import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Activity, Bell, ClipboardList, History, LayoutDashboard, LogOut, Menu, Music2, Search, Settings, ShieldCheck, SlidersHorizontal, Star, UserRound, Users, Mail, GraduationCap, X, ScrollText, KeyRound } from 'lucide-react';
import { useAdmin } from './AdminContext.jsx';
import { allApplications } from './adminState.js';
import './admin.css';

const NAV = [
  ['dashboard', LayoutDashboard, 'Dashboard'],
  ['applications', ClipboardList, 'Applications'],
  ['configurations', SlidersHorizontal, 'Configurations'],
  ['users', Users, 'Users'],
  ['results', Star, 'Results'],
  ['ceremony', GraduationCap, 'Ceremony'],
  ['email-logs', Mail, 'Email Logs'],
  ['system-health', Activity, 'System Health'],
  ['audit-logs', ScrollText, 'Audit Logs'],
  ['security', ShieldCheck, 'Security'],
  ['access-control', KeyRound, 'Access Control'],
];

export function AdminAvatar({ src, size = 22 }) {
  return <span className="admin-avatar">{src ? <img src={src} alt="Administrator profile" /> : <UserRound size={size} aria-hidden="true" />}</span>;
}

export function AdminSidebar({ open, close }) {
  return <aside className={`admin-sidebar ${open ? 'is-open' : ''}`}>
    <NavLink to="/admin/dashboard" className="admin-brand" onClick={close}><Music2 size={38} strokeWidth={1.1} /><span>Music Examination<small>MANAGEMENT SYSTEM</small></span></NavLink>
    <nav aria-label="Admin navigation">{NAV.map(([path, Icon, label]) => <NavLink key={path} to={`/admin/${path}`} onClick={close}><Icon size={19} />{label}</NavLink>)}</nav>
    <NavLink className="admin-logout" to="/staff-login"><LogOut size={19} />Logout</NavLink>
  </aside>;
}

export function AdminHeader({ toggleMenu, menuOpen }) {
  const APPLICATIONS = allApplications();
  const { state, search, setSearch } = useAdmin();
  const location = useLocation();
  const [openMenu, setOpenMenu] = useState(null); // null | 'settings' | 'bell' | 'recent'
  const [searchOpen, setSearchOpen] = useState(false);
  const settings = useRef(null);
  const recent = useRef(null);
  const bell = useRef(null);
  const searchWrap = useRef(null);
  const refFor = { settings, bell, recent };

  useEffect(() => { setOpenMenu(null); setSearchOpen(false); }, [location.pathname]);
  useEffect(() => {
    if (!openMenu && !searchOpen) return undefined;
    const outside = e => {
      if (openMenu && !refFor[openMenu]?.current?.contains(e.target)) setOpenMenu(null);
      if (searchOpen && !searchWrap.current?.contains(e.target)) setSearchOpen(false);
    };
    const escape = e => { if (e.key === 'Escape') { setOpenMenu(null); setSearchOpen(false); } };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [openMenu, searchOpen]);

  const matches = search.trim().length ? APPLICATIONS.filter(a => a.candidateName.toLowerCase().includes(search.toLowerCase()) || a.id.toLowerCase().includes(search.toLowerCase())).slice(0, 6) : [];

  return <header className="admin-header">
    <button className="admin-icon admin-menu-toggle" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} onClick={toggleMenu}>{menuOpen ? <X /> : <Menu />}</button>
    <div className="admin-anchor" ref={searchWrap}>
      <label className="admin-search"><Search size={19} /><input aria-label="Search applications" placeholder="Search applications..." value={search} onChange={e => { setSearch(e.target.value); setSearchOpen(true); }} onFocus={() => setSearchOpen(true)} />{search && <button type="button" className="admin-icon" aria-label="Clear search" onClick={() => setSearch('')}><X size={14} /></button>}</label>
      {searchOpen && matches.length > 0 && <div className="admin-flyout" style={{ width: 300 }}>
        <h3 style={{ fontSize: 15 }}>Applications</h3>
        <ul className="admin-search-results">{matches.map(a => <li key={a.id}><NavLink to={`/admin/applications?q=${encodeURIComponent(a.id)}`} onClick={() => setSearchOpen(false)}><strong>{a.candidateName}</strong> — {a.id}</NavLink></li>)}</ul>
      </div>}
    </div>
    <div className="admin-portal-title">Admin Portal</div>
    <div className="admin-header-actions">
      <div className="admin-anchor" ref={settings}>
        <button className="admin-icon" title="Settings" aria-label="Account settings" aria-expanded={openMenu === 'settings'} onClick={() => setOpenMenu(openMenu === 'settings' ? null : 'settings')}><Settings size={20} /></button>
        {openMenu === 'settings' && <section className="admin-flyout" aria-label="Account settings" style={{ width: 240 }}>
          <h3 style={{ fontSize: 16 }}>{state.admin.name}</h3>
          <p style={{ fontSize: 12, color: '#8f8f88', margin: '4px 0 14px' }}>{state.admin.role} · Superadmin permissions</p>
          <NavLink to="/staff-login" style={{ fontSize: 13, color: '#786000', fontWeight: 600 }}>Sign out</NavLink>
        </section>}
      </div>
      <div className="admin-anchor" ref={bell}>
        <button className="admin-icon admin-bell" title="Notifications" aria-label="Notifications" aria-expanded={openMenu === 'bell'} onClick={() => setOpenMenu(openMenu === 'bell' ? null : 'bell')}><Bell size={20} /><i /></button>
        {openMenu === 'bell' && <section className="admin-flyout" aria-label="Notifications">
          <h3>Notifications</h3>
          <ul><li><strong>Discrepancy flagged</strong><br />Carnatic Vocal Performance – L2 has an unresolved score discrepancy.<time>Today</time></li>
            <li><strong>Application queried</strong><br />Sanjay Krishnan's Carnatic Vocal application requires follow-up.<time>Today</time></li></ul>
        </section>}
      </div>
      <div className="admin-anchor" ref={recent}>
        <button className="admin-icon" title="Recent activity" aria-label="Recent activity" aria-expanded={openMenu === 'recent'} onClick={() => setOpenMenu(openMenu === 'recent' ? null : 'recent')}><History size={20} /></button>
        {openMenu === 'recent' && <section className="admin-flyout" aria-label="Recent activity">
          <h3>Recent Activity</h3>
          {state.tasks.length ? <ul>{state.tasks.map(t => <li key={t.id}>{t.title}<time>{new Date(t.at).toLocaleString()}</time></li>)}</ul> : <p style={{ fontSize: 13, color: '#8f8f88' }}>No recent activity yet.</p>}
        </section>}
      </div>
      <div className="admin-identity"><strong>{state.admin.name}</strong><small>{state.admin.role}</small></div>
      <AdminAvatar src={state.admin.avatar} />
    </div>
  </header>;
}

export default function AdminLayout() {
  const { notice, storageError, setSearch } = useAdmin();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);
  return <div className="admin-shell">
    <AdminSidebar open={menuOpen} close={() => setMenuOpen(false)} />
    <div className="admin-workspace">
      <AdminHeader toggleMenu={() => setMenuOpen(!menuOpen)} menuOpen={menuOpen} />
      <main className="admin-main"><Outlet /></main>
    </div>
    {notice && <div className="admin-toast" role="status">{notice}</div>}
    {storageError && <div className="admin-toast" role="alert" style={{ background: '#c23b3b' }}>{storageError}</div>}
  </div>;
}
