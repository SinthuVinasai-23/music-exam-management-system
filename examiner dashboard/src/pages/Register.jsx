import { Calendar, ChevronLeft } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import mridangamHands from '../assets/mridangam-hands.png';
import Modal from '../components/Modal.jsx';
import { saveVerifiedStudentProfile } from '../student/context/StudentContext.jsx';

const initialValues = { name: '', email: '', dob: '', password: '' };

function validate(values) {
  const errors = {};
  if (!values.name.trim()) errors.name = 'Full legal name is required.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) errors.email = 'Enter a valid email address.';
  if (!values.dob) {
    errors.dob = 'Date of birth is required.';
  } else {
    const dob = new Date(values.dob);
    const now = new Date();
    if (Number.isNaN(dob.getTime()) || dob > now) errors.dob = 'Enter a valid date of birth.';
  }
  if (values.password.length < 8 || !/[A-Za-z]/.test(values.password) || !/\d/.test(values.password)) {
    errors.password = 'Use at least 8 characters with letters and numbers.';
  }
  return errors;
}

export default function Register() {
  const navigate = useNavigate();
  const [role, setRole] = useState('student');
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [verificationOpen, setVerificationOpen] = useState(false);
  const [verified, setVerified] = useState(false);

  function update(event) {
    setValues({ ...values, [event.target.name]: event.target.value });
  }

  function submit(event) {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);
    setVerified(false);
    if (Object.keys(nextErrors).length === 0) setVerificationOpen(true);
  }

  return (
    <main className="register-page">
      <Link className="back-link" to="/">
        <ChevronLeft size={24} /> Back
      </Link>
      <section className="register-visual">
        <img src={mridangamHands} alt="Close-up of hands playing a traditional mridangam drum" />
      </section>
      <section className="register-panel">
        <h1>Join the Ensemble</h1>
        <p>
          Register to access exam schedules and your Student portal. If your child is under 12 years old, a parent or
          guardian can create an account using the student's name.
        </p>
        <div className="role-toggle" role="group" aria-label="Registration type">
          <button
            type="button"
            className={role === 'student' ? 'active' : ''}
            aria-pressed={role === 'student'}
            onClick={() => setRole('student')}
          >
            Register as Student
          </button>
          <button
            type="button"
            className={role === 'parent' ? 'active' : ''}
            aria-pressed={role === 'parent'}
            onClick={() => setRole('parent')}
          >
            Register as Parent
          </button>
        </div>
        <form className="register-form" onSubmit={submit} noValidate>
          <label>
            Name
            <input name="name" value={values.name} onChange={update} placeholder="Full legal name" autoComplete="name" />
            {errors.name && <span className="field-error">{errors.name}</span>}
          </label>
          <label>
            Email Address
            <input name="email" type="email" value={values.email} onChange={update} placeholder="example@aria.edu" autoComplete="email" />
            {errors.email && <span className="field-error">{errors.email}</span>}
          </label>
          <label>
            Date of Birth
            <span className="date-wrap">
              <input name="dob" type="date" value={values.dob} onChange={update} />
              <Calendar size={20} aria-hidden="true" />
            </span>
            {errors.dob && <span className="field-error">{errors.dob}</span>}
          </label>
          <label>
            Password
            <input name="password" type="password" value={values.password} onChange={update} placeholder="••••••••" autoComplete="new-password" />
            {errors.password && <span className="field-error">{errors.password}</span>}
          </label>
          <button className="btn btn-primary register-submit" type="submit">Register</button>
        </form>
        <p className="login-note">Already have an account? <span className="login-note-link">Log in</span></p>
        {verified && <p className="frontend-note" role="status">Frontend simulation complete. Your account is marked verified in this demo.</p>}
      </section>
      <Modal
        open={verificationOpen}
        title={
          <>
            Verification
            <br />
            Required
          </>
        }
        actionLabel="Verify Account"
        onClose={() => setVerificationOpen(false)}
        onAction={() => {
          setVerificationOpen(false);
          if (role === 'student') {
            saveVerifiedStudentProfile({
              name: values.name,
              email: values.email,
              dateOfBirth: values.dob,
            });
            navigate('/student/dashboard');
            requestAnimationFrame(() => window.scrollTo(0, 0));
          } else {
            setVerified(true);
          }
        }}
      >
        <p>A harmony is waiting to be completed. Please verify your email address to finalize your enrollment.</p>
      </Modal>
    </main>
  );
}
