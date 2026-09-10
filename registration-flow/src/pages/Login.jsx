import { Eye, EyeOff, KeyRound, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import mridangamHands from '../assets/mridangam-hands.png';
import PortalSelector from '../components/PortalSelector.jsx';

function validate(email, password) {
  const errors = {};
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email address.';
  if (!password.trim()) errors.password = 'Password is required.';
  return errors;
}

export default function Login({ type }) {
  const isStaff = type === 'staff';
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [portalOpen, setPortalOpen] = useState(false);
  const [candidateRole] = useState(location.state?.candidateRole ?? 'student');
  const [unlockEmail, setUnlockEmail] = useState(!isStaff);
  const [unlockPassword, setUnlockPassword] = useState(!isStaff);

  useEffect(() => {
    if (!isStaff) return;
    setEmail('');
    setPassword('');
    const timer = window.setTimeout(() => {
      setEmail('');
      setPassword('');
    }, 80);
    return () => window.clearTimeout(timer);
  }, [isStaff]);

  function submit(event) {
    event.preventDefault();
    const nextErrors = validate(email, password);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    if (isStaff) {
      setPortalOpen(true);
    } else {
      navigate(`/dashboard/${candidateRole}`);
    }
  }

  function selectPortal(role) {
    setPortalOpen(false);
    navigate(`/dashboard/${role}`);
  }

  return (
    <main className={`auth-login-page ${isStaff ? 'staff-auth' : 'candidate-auth'}`}>
      <section className="auth-login-visual">
        <img src={mridangamHands} alt="Traditional music instrument" />
        <div className="auth-login-visual-copy">
          <span>INSTITUTIONAL PORTAL</span>
          <h2>{isStaff ? 'Harmonizing Academic Excellence.' : 'Your Musical Journey Continues.'}</h2>
        </div>
      </section>

      <section className="auth-login-panel">
        <div className="auth-login-inner">
          <div className="auth-login-icon">{isStaff ? <KeyRound size={24} /> : <UserRound size={24} />}</div>
          <h1>{isStaff ? 'Staff Portal Access' : 'Candidate Login'}</h1>
          <p>
            {isStaff
              ? 'Please verify your credentials to manage the academic curriculum and examination boards.'
              : 'Enter your account details to continue to your examination portal.'}
          </p>

          <form className="auth-login-form" onSubmit={submit} noValidate autoComplete="off">
            {isStaff && (
              <div className="sr-only autofill-trap" aria-hidden="true">
                <input type="text" tabIndex={-1} autoComplete="username" defaultValue="" />
                <input type="password" tabIndex={-1} autoComplete="current-password" defaultValue="" />
              </div>
            )}
            <label>
              EMAIL ADDRESS
              <input
                type="text"
                inputMode="email"
                name={isStaff ? 'staff_portal_email' : 'candidate_email'}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email address"
                autoComplete="off"
                readOnly={isStaff && !unlockEmail}
                onFocus={() => setUnlockEmail(true)}
              />
              {errors.email && <span className="field-error">{errors.email}</span>}
            </label>

            <label>
              <span className="password-label"><span>PASSWORD</span><button type="button" onClick={() => {}}>Forgot?</button></span>
              <span className="password-input-wrap">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name={isStaff ? 'staff_portal_passcode' : 'candidate_password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Password"
                  autoComplete={isStaff ? 'new-password' : 'current-password'}
                  readOnly={isStaff && !unlockPassword}
                  onFocus={() => setUnlockPassword(true)}
                />
                <button type="button" className="password-visibility" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((value) => !value)}>
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </span>
              {errors.password && <span className="field-error">{errors.password}</span>}
            </label>

            <button className="auth-login-submit" type="submit">LOGIN <span>→</span></button>
          </form>

          <Link className="auth-return-home" to="/">← Return to Home</Link>
          <small>SYSTEM STATUS: OPTIMAL &nbsp; V2.4.1</small>
        </div>
      </section>

      <PortalSelector open={portalOpen} onClose={() => setPortalOpen(false)} onSelect={selectPortal} />
    </main>
  );
}
