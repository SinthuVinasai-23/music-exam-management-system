import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Bell, CalendarDays, History, LayoutDashboard, ListChecks, LogOut, Menu, Music2, Search, Settings, UserRound, X } from 'lucide-react';
import { useExaminer } from './ExaminerContext.jsx';
import './examiner.css';

export function Avatar({ src, size = 28 }) {
  return <span className="examiner-avatar">{src ? <img src={src} alt="Examiner profile" /> : <UserRound size={size} aria-hidden="true" />}</span>;
}
export function ExaminerSidebar({ open, close }) {
  return <aside className={`examiner-sidebar ${open ? 'is-open' : ''}`}>
    <NavLink to="/examiner/dashboard" className="examiner-brand" onClick={close}><Music2 size={40} strokeWidth={1.1} /><span>Music Examination<small>MANAGEMENT SYSTEM</small></span></NavLink>
    <nav aria-label="Examiner navigation">{[['dashboard', LayoutDashboard, 'Dashboard'], ['examinations', CalendarDays, 'Examinations'], ['evaluations', ListChecks, 'Evaluations']].map(([path, Icon, label]) => <NavLink key={path} to={`/examiner/${path}`} onClick={close}><Icon size={21} />{label}</NavLink>)}</nav>
    <NavLink className="examiner-logout" to="/staff-login"><LogOut size={20} />Logout</NavLink>
  </aside>;
}
export function ExaminerHeader({ toggleMenu, menuOpen }) {
  const { state, search, setSearch } = useExaminer();
  const navigate = useNavigate();
  const location = useLocation();
  const [recentOpen, setRecentOpen] = useState(false);
  const recent = useRef(null);
  const clock = useRef(null);
  useEffect(() => { setRecentOpen(false); }, [location.pathname]);
  useEffect(() => {
    if (!recentOpen) return undefined;
    const outside = e => { if (!recent.current?.contains(e.target)) setRecentOpen(false); };
    const escape = e => { if (e.key === 'Escape') { setRecentOpen(false); clock.current?.focus(); } };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [recentOpen]);
  return <header className="examiner-header">
    <button className="examiner-icon examiner-menu-toggle" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} onClick={toggleMenu}>{menuOpen ? <X /> : <Menu />}</button>
    <label className="examiner-search"><Search size={20} /><input aria-label="Search assigned applications" placeholder="Search applications..." value={search} onChange={e => setSearch(e.target.value)} />{search && <button type="button" className="examiner-icon" aria-label="Clear search" onClick={() => setSearch('')}><X size={15} /></button>}</label>
    <div className="examiner-portal-title">Examiner Portal</div>
    <div className="examiner-header-actions">
      <button className="examiner-icon" title="Account settings" aria-label="Account settings" onClick={() => navigate('/examiner/settings?tab=profile')}><Settings size={21} /></button>
      <button className="examiner-icon examiner-bell" title="Notifications" aria-label="Notifications" onClick={() => navigate('/examiner/notifications')}><Bell size={21} />{state.notifications.some(n => !n.read) && <i />}</button>
      <div className="examiner-recent-anchor" ref={recent}><button ref={clock} className="examiner-icon" title="Recent tasks" aria-label="Recent tasks" aria-expanded={recentOpen} aria-controls="examiner-recent" onClick={() => setRecentOpen(!recentOpen)}><History size={21} /></button>
        {recentOpen && <section className="examiner-recent" id="examiner-recent" aria-label="Recent tasks"><h3>Recent Tasks</h3>{state.tasks.length ? <ul>{state.tasks.map(t => <li key={t.id}>{t.title}<time>{new Date(t.at).toLocaleString()}</time></li>)}</ul> : <p>No recent tasks yet.</p>}</section>}
      </div>
      <div className="examiner-identity"><strong>{state.profile.firstName}</strong><small>Senior Examiner</small></div><Avatar src={state.profile.avatar} />
    </div>
  </header>;
}
export default function ExaminerLayout() {
  const { notice, storageError, setSearch } = useExaminer();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  useEffect(() => { setSearch(''); setMenuOpen(false); }, [location.pathname, setSearch]);
  return <div className="examiner-shell"><ExaminerSidebar open={menuOpen} close={() => setMenuOpen(false)} /><div className="examiner-workspace"><ExaminerHeader toggleMenu={() => setMenuOpen(!menuOpen)} menuOpen={menuOpen} /><main className="examiner-main"><Outlet /></main></div>{notice && <div className="examiner-toast" role="status">{notice}</div>}{storageError && <div className="examiner-storage-error" role="alert">{storageError}</div>}</div>;
}
