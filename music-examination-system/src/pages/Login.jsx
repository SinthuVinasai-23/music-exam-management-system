const loginImage = '/home-subjects/login-golden-tabla.png';
import { Eye, EyeOff, Music2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import StaffLogin from "./StaffLogin.jsx";
import { authRequest, dashboardFor, authPreview } from "../auth/api.js";
import "../styles/login-redesign.css";
export default function Login({ type }) {
  return type === "staff" ? <StaffLogin /> : <ApplicantLogin />;
}
function ApplicantLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  function chooseRole(nextRole) {
    setRole(nextRole);
    setEmail("");
    setPassword("");
    setError("");
    setShow(false);
  }
  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const data = await authRequest("login", { email, password, role });
      navigate(data.user ? dashboardFor(data.user) : "/verify-email");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="candidate-login candidate-login-split">
      <aside className="candidate-login-art" aria-label="Music photography"><img src={loginImage} alt="Hands playing a drum in warm golden light"/></aside>
      <div className="candidate-login-panel">
      <section className="candidate-card">
        
        <span className="candidate-kicker">SECURE CANDIDATE PORTAL</span>
        <h1>Welcome back</h1>
        <p>
          Sign in to manage examination registrations, admission cards and
          results.
        </p>
        <div className="candidate-role">
          <button
            className={role === "student" ? "active" : ""}
            onClick={() => chooseRole("student")}
          >
            Student
          </button>
          <button
            className={role === "parent" ? "active" : ""}
            onClick={() => chooseRole("parent")}
          >
            Parent
          </button>
        </div>
        <form autoComplete="off" onSubmit={submit} noValidate={authPreview}>
          <label>
            Email or Student ID
            <input
              type="text"
              required
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            Password
            <div className="candidate-password">
              <input
                type={show ? "text" : "password"}
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button type="button" aria-label={show ? "Hide password" : "Show password"} onClick={() => setShow(!show)}>
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>
          {error && <p className="login-error">{error}</p>}
          <button className="candidate-submit" disabled={busy}>
            {busy ? "Signing in…" : "Sign in securely →"}
          </button>
        </form>
        <div className="candidate-links">
          <span>
            New candidate? <Link to="/register">Create an account</Link>
          </span>
          <Link to="/forgot-password">Forgot Password?</Link>
          <Link to="/">Return to home</Link>
        </div>
      </section>
      </div>
    </main>
  );
}

