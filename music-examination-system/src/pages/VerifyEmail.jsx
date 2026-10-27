import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authRequest, authSession, dashboardFor, authPreview } from '../auth/api.js';
import '../styles/verification.css';

export default function VerifyEmail() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  const adopt = data => {
    if (data.user) navigate(dashboardFor(data.user), { replace: true });
    else setSession(data);
  };
  useEffect(() => {
    let active = true;
    authSession().then(data => { if (active) adopt(data); }).catch(e => active && setError(e.message));
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => { active = false; clearInterval(interval); };
  }, []);
  const pending = session?.pending;
  const cooldown = Math.max(0, Math.ceil(((pending?.resendAt || 0) - now) / 1000));
  const expired = pending?.delivery === 'sent' && pending.expiresAt <= now;
  async function submit(event) {
    event.preventDefault(); setError(''); setMessage('');
    if (!/^\d{6}$/.test(code)) { setError('Invalid verification code'); return; }
    setBusy(true);
    try { adopt(await authRequest('verify', { code })); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  async function resend() {
    setBusy(true); setError(''); setMessage('');
    try {
      const data = await authRequest('resend'); adopt(data); setCode('');
      setMessage(data.message);
    } catch (e) {
      setError(e.message);
      try { adopt(await authSession()); } catch { /* Keep delivery error visible. */ }
    } finally { setBusy(false); }
  }
  return <main className="verification-page">
    <section className="verification-card" aria-label={`${pending?.role === 'parent' ? 'Parent' : 'Student'} email verification`}>
      <span className="verification-note" aria-hidden="true">♪</span>
      <h1>Welcome to Your<br />Musical Journey</h1>
      <div className="verification-rule" />
      <p className="verification-intro">{authPreview ? "Registration approved. Enter your account verification code." : "Admin approved your registration. A verification code has been sent to your registered email address."}</p>
      {pending && <p className="verification-recipient">Verify your account: <strong>{pending.email}</strong></p>}
      {pending ? <>
        <form onSubmit={submit} noValidate>
          <label className="verification-code-box">Verification Code
            <input aria-label="Verification Code" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} placeholder="••••••" />
          </label>
          <button className="verification-button" type="submit" disabled={busy || (!authPreview && (pending.delivery !== 'sent' || expired))}>{busy ? 'PLEASE WAIT…' : 'VERIFY'}</button>
        </form>
        {error && <p className="verification-error" role="alert">{error}</p>}
        {expired && <p className="verification-error" role="alert">Your verification code has expired. Please use Resend Code.</p>}
        {pending.delivery === 'failed' && !error && <p className="verification-error" role="alert">We could not send your verification email. Please use Resend Code or contact support.</p>}
        {message && <p role="status">{message}</p>}
        <button className="verification-resend" type="button" onClick={resend} disabled={busy || cooldown > 0}>Resend Code{cooldown > 0 ? ` (${cooldown}s)` : ''}</button>
      </> : <p role={error ? 'alert' : 'status'}>{error || (session ? <>Please <Link to="/login">log in</Link> or <Link to="/register">register</Link> to verify your email.</> : 'Loading verification…')}</p>}
      <p className="verification-validity">Enter the six-digit code to complete verification. If you did not request this verification, please contact support.</p>
      <footer className="verification-footer">
        <nav><a href={import.meta.env.VITE_PRIVACY_URL || '/faq'}>Privacy Policy</a><Link to="/contact">Contact Support</Link><a href={import.meta.env.VITE_TERMS_URL || '/faq'}>Terms of Service</a></nav>
        <p>© {new Date().getFullYear()} International Music Examination Board. All rights reserved.</p>
      </footer>
    </section>
  </main>;
}
