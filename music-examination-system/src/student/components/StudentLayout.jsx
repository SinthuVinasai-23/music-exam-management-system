import PracticeDashboardShell from "./PracticeDashboardShell.jsx";
import "../../styles/practice-dashboard.css";
import "../../styles/carnatic-dashboard.css";
import "../../styles/ensemble-five-pages.css";
import "../../styles/student-pages-theme.css";
import { authRequest } from "../../auth/api.js";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCircle2, CircleUserRound, Menu, X } from "lucide-react";
import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useStudent } from "../context/StudentContext.jsx";

const navItems = [
  ["Dashboard", "/student/dashboard"],
  ["Application", "/student/application"],
  ["Results", "/student/results"],
  ["Status", "/student/status"],
  ["Ceremony", "/student/ceremony"],
];

export function StudentNavbar() {
  const { profile } = useStudent();
  const navigate = useNavigate();
  const parentSession = Boolean(profile.parentId);
  const [open, setOpen] = useState(false);
  return (
    <header className="student-header">
      <nav className="student-nav" aria-label="Student portal navigation">
        
        <button
          className="student-menu"
          type="button"
          onClick={() => setOpen(!open)}
          aria-label="Toggle student navigation"
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
        <div className={`student-nav-links ${open ? "open" : ""}`}>
          {parentSession && (
            <NavLink to="/parent/dashboard">Parent Dashboard</NavLink>
          )}
          {navItems.map(([label, to]) => (
            <NavLink key={to} to={to} end={to === "/student/dashboard" || to === "/student/application"} onClick={() => setOpen(false)}>
              {label}
            </NavLink>
          ))}
        </div>
        <div className="student-nav-user">
          <NavLink to="/student/status" aria-label="Application updates"><Bell size={20}/></NavLink>
          <NavLink to="/student/account" aria-label="Account Settings"><CircleUserRound size={22}/></NavLink>
          <strong>{profile.displayName}</strong>
          <button
            type="button"
            onClick={async () => {
              await authRequest("logout");
              navigate("/", {replace:true});
            }}
          >
            Log out
          </button>
          <NavLink className="student-contact" to="/contact">
            Contact Us
          </NavLink>
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

export function StudentShell({ children, className = "" }) {
  return <PracticeDashboardShell><div className={`ensemble-page ${className}`}>{children}</div></PracticeDashboardShell>;
}

export function Stepper({ step }) {
  const steps = ["Information", "Selection", "Confirmation"];
  return (
    <aside className="application-stepper" aria-label="Application steps">
      {steps.map((label, index) => (
        <div
          className={`stepper-row ${step === index + 1 ? "active" : ""}`}
          key={label}
        >
          <span>{index + 1}</span>
          <strong>
            {label}
          </strong>
        </div>
      ))}
    </aside>
  );
}

export function StatusPill({ status }) {
  const key = status.toLowerCase().replaceAll(" ", "-");
  return <span className={`status-pill ${key}`}>{status}</span>;
}

