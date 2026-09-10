import { KeyRound, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../components/Button.jsx';
import Footer from '../components/Footer.jsx';
import Navbar from '../components/Navbar.jsx';

export default function Login({ type }) {
  const isStaff = type === 'staff';

  return (
    <div>
      <Navbar />
      <main className="login-page page-shell">
        <section className="login-placeholder">
          <div className="round-icon">
            {isStaff ? <KeyRound size={28} /> : <UserRound size={28} />}
          </div>
          <span className="eyebrow">{isStaff ? 'Faculty & Staff' : 'Candidates'}</span>
          <h1>{isStaff ? 'Staff Login' : 'Candidate Login'}</h1>
          <p>
            This frontend-only preview keeps authentication as a placeholder. The full system will connect this entry point to secure role-based access after backend services are introduced.
          </p>
          <div className="button-row center">
            {isStaff && <Button to="/examiner/dashboard">Examiner Portal</Button>}
            <Button to="/register">{isStaff ? 'Candidate Registration' : 'Register'}</Button>
            <Link className="text-link" to="/">Return Home</Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
