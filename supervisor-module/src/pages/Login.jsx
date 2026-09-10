import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  UserRound,
  X,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../components/Button.jsx";
import Footer from "../components/Footer.jsx";
import Navbar from "../components/Navbar.jsx";
import {
  createStaffSession,
  saveStaffSession,
  staffRoles,
  validateStaffCredentials,
} from "../auth.js";
import { demoUser, readState, STORAGE_KEY } from "../supervisor/store.js";

function RoleModal({ email, onClose }) {
  const navigate = useNavigate();
  const dialogRef = useRef(null);
  const [error, setError] = useState("");
  useEffect(() => {
    dialogRef.current?.focus();
    const closeOnEscape = (event) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);
  const selectRole = (role) => {
    if (!role.available) {
      setError(`${role.label} dashboard is not included in this project yet.`);
      return;
    }
    try {
      saveStaffSession(createStaffSession(email, role.id));
      const current = readState();
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ ...current, user: { ...demoUser, email } }),
      );
      navigate("/supervisor", { replace: true });
    } catch (caught) {
      setError(caught.message || "Unable to open the selected staff portal.");
    }
  };
  return (
    <div
      className="role-overlay"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        className="role-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="role-title"
        ref={dialogRef}
        tabIndex={-1}
      >
        <button
          className="role-close"
          aria-label="Close role selection"
          onClick={onClose}
        >
          <X />
        </button>
        <header>
          <h2 id="role-title">Select Portal</h2>
          <p>Choose a role to continue</p>
        </header>
        <div className="role-list">
          {staffRoles.map((role) => (
            <button
              key={role.id}
              onClick={() => selectRole(role)}
              aria-describedby={!role.available ? "role-help" : undefined}
            >
              <span>{role.label}</span>
              {!role.available && <small>Coming soon</small>}
            </button>
          ))}
        </div>
        {error && (
          <p className="staff-form-error" role="alert">
            {error}
          </p>
        )}
        <footer id="role-help">
          Select Supervisor to open the completed Supervisor module.
        </footer>
      </section>
    </div>
  );
}

function StaffLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [selectingRole, setSelectingRole] = useState(false);
  const submit = (event) => {
    event.preventDefault();
    const result = validateStaffCredentials(email, password);
    if (result.error) return setError(result.error);
    setEmail(result.email);
    setError("");
    setSelectingRole(true);
  };
  return (
    <div className="staff-login-page">
      <section
        className="staff-login-art"
        aria-label="Institutional music portal"
      >
        <div>
          <span>Institutional Portal</span>
          <h1>
            Harmonizing
            <br />
            Academic
            <br />
            Excellence.
          </h1>
        </div>
      </section>
      <main className="staff-login-panel">
        <form className="staff-login-form" onSubmit={submit} noValidate>
          <div className="staff-login-symbol">
            <KeyRound />
          </div>
          <h1>
            Staff Portal
            <br />
            Access
          </h1>
          <p>
            Please verify your credentials to manage the academic curriculum and
            examination boards.
          </p>
          <label htmlFor="staff-email">Email Address</label>
          <input
            id="staff-email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="staff.name@aria-academy.com"
            required
          />
          <div className="staff-password-heading">
            <label htmlFor="staff-password">Password</label>
            <button
              type="button"
              onClick={() =>
                setError(
                  "Password recovery requires the production identity service.",
                )
              }
            >
              Forgot?
            </button>
          </div>
          <div className="staff-password-field">
            <input
              id="staff-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <button
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((shown) => !shown)}
            >
              {showPassword ? <EyeOff /> : <Eye />}
            </button>
          </div>
          {error && (
            <p className="staff-form-error" role="alert">
              {error}
            </p>
          )}
          <button className="staff-login-submit" type="submit">
            Login <ArrowRight />
          </button>
          <Link className="staff-return-home" to="/">
            <ArrowLeft /> Return to Home
          </Link>
          <small className="staff-system-status">
            System status: Optimal&nbsp;&nbsp; V2.4.1
          </small>
        </form>
      </main>
      {selectingRole && (
        <RoleModal email={email} onClose={() => setSelectingRole(false)} />
      )}
    </div>
  );
}

export default function Login({ type }) {
  if (type === "staff") return <StaffLogin />;
  return (
    <div>
      <Navbar />
      <main className="login-page page-shell">
        <section className="login-placeholder">
          <div className="round-icon">
            <UserRound size={28} />
          </div>
          <span className="eyebrow">Candidates</span>
          <h1>Candidate Login</h1>
          <p>
            Candidate authentication will connect to the production identity
            service.
          </p>
          <div className="button-row center">
            <Button to="/register">Register</Button>
            <Link className="text-link" to="/">
              Return Home
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
