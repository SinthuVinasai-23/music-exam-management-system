import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import RegistrationLayout from '../components/RegistrationLayout.jsx';
import { Info, UserRound, UsersRound, ChevronRight } from 'lucide-react';
import { authRequest } from '../auth/api.js';
import { guardianAge } from '../student/rules.js';
import CandidateFields, { emptyCandidate, TextField } from '../components/CandidateFields.jsx';

export default function Register() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedRole = searchParams.get('type');
  const [role, setRole] = useState(['student', 'parent'].includes(requestedRole) ? requestedRole : '');
  const [student, setStudent] = useState(emptyCandidate);
  const [parent, setParent] = useState({ firstName: '', lastName: '', phone: '', email: '', password: '', confirmPassword: '' });
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const age = student.dateOfBirth ? guardianAge(student.dateOfBirth) : null;
  const under16 = role === 'student' && age !== null && age < 16;
  async function submit(event) {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      await authRequest('register', role === 'parent' ? { role, parent } : { ...student, role, password, confirmPassword });
      navigate('/verify-email');
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  function chooseRole(next) { setRole(next); setSearchParams({ type: next }, { replace: true }); setError(''); }
  // Locate existing service errors without changing any validation rule.
  const errorField = /Passwords do not match/.test(error) ? 'confirmPassword'
    : /Use at least 8/.test(error) ? 'password'
    : /date of birth|at least 6/i.test(error) ? 'dateOfBirth'
    : /phone number/i.test(error) ? 'phone'
    : /email address/i.test(error) ? 'email' : '';
  const credentialsError = role === 'parent' && !/student email|date of birth|at least 6/i.test(error);
  const childErrors = credentialsError ? {} : { [errorField]: error };

  return <RegistrationLayout modern landing={!role} wide={role === 'parent'}>
    <div className="registration-heading">
      <h1>Join ICFA</h1><p>{role === 'parent' ? 'Create your parent account now. Add students later from your parent dashboard.' : 'Register once and keep your permanent Student ID for future examinations.'}</p>
      </div><div className="ensemble-selector" role="group" aria-label="Registration type">
        {['student', 'parent'].map(option => <button key={option} type="button" className={role === option ? 'active' : ''} aria-pressed={role === option} onClick={() => chooseRole(option)}>Register as {option === 'student' ? 'Student' : 'Parent'}{!role && <ChevronRight size={18} aria-hidden="true" />}</button>)}
      </div>
      <p className="registration-notice"><Info size={17} aria-hidden="true"/> Students under 16 must be registered by a parent or guardian.</p>
      {!role ? <p>Select a registration option to continue.</p> : <form className={`ensemble-form ${role}-form`} onSubmit={submit} noValidate>
        <h2>{role === 'parent' ? 'Parent Registration' : 'Student Registration'}</h2>
        {role === 'parent' && <fieldset className="registration-section"><legend><UsersRound size={17} aria-hidden="true" />Parent Details</legend><div className="registration-fields">
          {[
            ['firstName', 'Parent First Name', 'text'], ['lastName', 'Parent Last Name', 'text'],
            ['phone', 'Parent Phone Number', 'tel'], ['email', 'Parent Email Address', 'email'],
            ['password', 'Password', 'password'], ['confirmPassword', 'Confirm Password', 'password'],
          ].map(([name, label, type]) => <TextField key={name} name={`parent-${name}`} label={label} type={type} value={parent[name]} error={credentialsError && errorField === name ? error : undefined} onChange={next => setParent({ ...parent, [name]: next })} />)}
        </div></fieldset>}
        {role === 'student' && <fieldset className="registration-section"><legend><UserRound size={17} aria-hidden="true" />{role === 'parent' ? 'Student / Child Details' : 'Student Details'}</legend><div className="registration-fields">
          <CandidateFields value={student} onChange={setStudent} child={role === 'parent'} errors={{ ...childErrors, dateOfBirth: under16 ? 'Please continue with parent or guardian registration.' : childErrors.dateOfBirth }} />
        </div>{age !== null && <p className="registration-age">Age: {age} years</p>}
        </fieldset>}
        {role === 'student' && <div className="registration-fields registration-passwords">
          <TextField name="password" label="Password" type="password" value={password} error={errorField === 'password' ? error : undefined} onChange={setPassword} autoComplete="new-password" />
          <TextField name="confirmPassword" label="Confirm Password" type="password" value={confirmPassword} error={errorField === 'confirmPassword' ? error : undefined} onChange={setConfirmPassword} autoComplete="new-password" />
        </div>}
        {under16 && <div><button type="button" className="registration-parent-action" onClick={() => chooseRole('parent')}>Continue with Parent Registration</button></div>}
        {error && !errorField && <p className="registration-error" role="alert">{error}</p>}
        <button className="ensemble-submit" type="submit" disabled={busy || under16}>{busy ? 'Registering…' : 'Register'}</button>
      <p className="login-note">Already registered? <Link to="/login">Log in</Link> or <Link to="/forgot-password">recover your account</Link>.</p>
      </form>}
      {!role && <p className="login-note">Already registered? <Link to="/login">Log in</Link> or <Link to="/forgot-password">recover your account</Link>.</p>}
  </RegistrationLayout>;
}

