import { Bell, CheckCircle2, CircleUserRound, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useStudent } from '../context/StudentContext.jsx';

const navItems = [
  ['Dashboard', '/student/dashboard'],
  ['Application', '/student/application'],
  ['Payment', '/student/payment'],
  ['Logs', '/student/applications'],
  ['Results', '/student/results'],
  ['Status', '/student/status'],
  ['Ceremony', '/student/ceremony'],
];

export function StudentNavbar() {
  const { profile } = useStudent();
  const [open, setOpen] = useState(false);
  return (
    <header className="student-header">
      <nav className="student-nav" aria-label="Student portal navigation">
        <NavLink className="student-brand" to="/student/dashboard">Examination system</NavLink>
        <button className="student-menu" type="button" onClick={() => setOpen(!open)} aria-label="Toggle student navigation">
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
        <div className={`student-nav-links ${open ? 'open' : ''}`}>
          {navItems.map(([label, to]) => (
            <NavLink key={to} to={to} onClick={() => setOpen(false)}>
              {label}
            </NavLink>
          ))}
        </div>
        <div className="student-nav-user">
          <button type="button" aria-label="Notifications"><Bell size={20} /></button>
          <button type="button" aria-label="Profile"><CircleUserRound size={22} /></button>
          <strong>{profile.displayName}</strong>
          <NavLink className="student-contact" to="/contact">Contact Us</NavLink>
        </div>
      </nav>
    </header>
  );
}

export function StudentFooter() {
  return (
    <footer className="student-footer">
      <h2>Examination system</h2>
      <nav aria-label="Student footer navigation">
        <NavLink to="/faq">Privacy Policy</NavLink>
        <NavLink to="/faq">Terms of Service</NavLink>
        <NavLink to="/faq">Accessibility</NavLink>
        <NavLink to="/faq">Global Standards</NavLink>
      </nav>
      <p>© 2026 International Music Examination Board. All rights reserved.</p>
    </footer>
  );
}

export function StudentShell({ children, className = '' }) {
  const { toast } = useStudent();
  return (
    <div className={`student-portal ${className}`}>
      {toast && (
        <div className={`download-toast ${toast.type}`} role="status" aria-live="polite">
          <CheckCircle2 size={18} />
          {toast.message}
        </div>
      )}
      <StudentNavbar />
      <main>{children}</main>
      <StudentFooter />
    </div>
  );
}

export function Stepper({ step }) {
  const steps = ['Candidate Info', 'Selection', 'Confirmation'];
  return (
    <aside className="application-stepper" aria-label="Application steps">
      {steps.map((label, index) => (
        <div className={`stepper-row ${step === index + 1 ? 'active' : ''}`} key={label}>
          <span>{index + 1}</span>
          <strong>{String(index + 1).padStart(2, '0')} {label}</strong>
        </div>
      ))}
    </aside>
  );
}

export function StatusPill({ status }) {
  const key = status.toLowerCase().replaceAll(' ', '-');
  return <span className={`status-pill ${key}`}>{status}</span>;
}
