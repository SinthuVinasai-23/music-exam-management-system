import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Menu, X } from "lucide-react";
import mridangamHands from "../assets/mridangam-hands.png";
import "../styles/registration.css";

function EnsembleHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="ensemble-header">
      <nav
        className="ensemble-nav"
        aria-label="Registration website navigation"
      >
        <Link
          className="ensemble-brand"
          to="/"
          aria-label="International Centre for Fine Arts home"
        >
          
          <span>
            ICFA<small>MUSIC EXAMINATIONS</small>
          </span>
        </Link>
        <button
          className="ensemble-menu"
          type="button"
          aria-label="Toggle website navigation"
          aria-expanded={open}
          aria-controls="ensemble-navigation"
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
        <div
          id="ensemble-navigation"
          className={`ensemble-links ${open ? "open" : ""}`}
        >
          {[
            ["Home", "/"],
            ["About", "/about"],
            ["Examinations", "/faq"],
            ["Resources", "/faq"],
            ["Contact", "/contact"],
          ].map(([label, to]) => (
            <Link key={label} to={to} onClick={() => setOpen(false)}>
              {label}
            </Link>
          ))}
        </div>
        <Link className="ensemble-login" to="/login">
          Log In
        </Link>
      </nav>
    </header>
  );
}
function EnsembleFooter() {
  return (
    <footer className="ensemble-footer">
      <div>
        <p>
          © {new Date().getFullYear()} International Centre for Fine Arts. All rights
          reserved.
        </p>
        <nav aria-label="Registration footer navigation">
          <Link to="/faq">Privacy Policy</Link>
          <Link to="/faq">Terms of Use</Link>
          <Link to="/contact">Contact Us</Link>
        </nav>
      </div>
    </footer>
  );
}
export default function RegistrationLayout({
  children,
  landing = false,
  modern = false, wide = false,
  backTo = "/",
  backLabel = "Back",
}) {
  return (
    <div
      className={`ensemble-registration ${landing ? "is-landing" : "has-form"} ${modern ? "registration-modern" : ""} ${wide ? "registration-wide" : ""}`}
    >
      
      <main className="ensemble-main">
        <div className="ensemble-decoration" aria-hidden="true">
          <span>𝄞</span>
          <svg viewBox="0 0 1440 720" preserveAspectRatio="none">
            <g fill="none" stroke="currentColor" strokeWidth="1.2">
              {[0, 18, 36, 54, 72].map((y) => (
                <path
                  key={y}
                  d={`M-80 ${430 + y} C250 ${220 + y},420 ${900 + y},780 ${590 + y} S1140 ${310 + y},1520 ${150 + y}`}
                />
              ))}
            </g>
          </svg>
        </div>
        <div className="ensemble-content">
          <Link className="ensemble-back" to={backTo}>
            <ArrowLeft size={20} /> {backLabel}
          </Link>
          <figure className="ensemble-image">
            <img
              src={modern ? "/home-subjects/login-golden-tabla.png" : mridangamHands}
              alt="Close-up of hands playing a traditional miruthangam drum"
            />
          </figure>
          <section className="ensemble-panel">{children}</section>
        </div>
      </main>
      
    </div>
  );
}
