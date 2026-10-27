import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GraduationCap, Plus, Menu, X, UserRound, CalendarDays, ShieldCheck, ArrowRight } from 'lucide-react';
import { authRequest, authSession } from '../auth/api.js';
import '../styles/parent-dashboard.css';

export default function ParentPreview() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [parent, setParent] = useState(null);
  const [children, setChildren] = useState([]);
  useEffect(() => {
    let active = true;
    authSession().then(({ user, children }) => { if (active) { setParent(user); setChildren(children || []); } });
    return () => { active = false; };
  }, []);
  const parentName = [parent?.firstName, parent?.lastName].filter(Boolean).join(' ');
  return <div className="parent-dashboard">
    <div className="parent-account-strip"><nav aria-label="Parent portal navigation"><Link to="/parent/dashboard">Dashboard</Link><Link to="/parent/add-candidate">Add Student</Link></nav><span><UserRound size={20}/><strong>{parentName}</strong> · Parent account</span><button onClick={async()=>{await authRequest('logout');navigate('/', {replace:true})}}>Log out</button></div>
    <main aria-label="Parent dashboard" className="parent-main">
      <section className="parent-welcome"><div><h1>Welcome back, {parent?.firstName}</h1><p>Manage your children’s musical journeys and examination applications.</p></div>
        <Link className="parent-gold-btn" to="/parent/add-candidate"><Plus size={23} /> Add New Candidate</Link>
      </section>
      <section className="parent-candidates"><h2>My Children / Candidates</h2>
        <div className="parent-candidate-grid">{children.map(child => <article className="parent-candidate-card" key={child.student_id}>
          <span className="parent-candidate-icon"><GraduationCap size={42} /></span><div className="parent-candidate-info"><h3>{child.firstName} {child.lastName}</h3>
          <p><UserRound/> Student ID: <strong>{child.student_id}</strong></p><p><CalendarDays/> Date of Birth: <strong>{child.dateOfBirth}</strong></p>
          <p><ShieldCheck/> Registration: <span className={`parent-registration ${child.registrationStatus === 'approved' ? 'approved' : 'pending'}`}>{child.registrationStatus}</span></p></div>
          <div className="parent-candidate-action"><Link className="parent-gold-btn" to={`/parent/student/${encodeURIComponent(child.student_id)}/dashboard`}>View Student Dashboard <ArrowRight size={22}/></Link></div>
        </article>)}</div>
        {!children.length && <div className="parent-empty"><GraduationCap size={38}/><h3>No candidates registered yet</h3><p>Add your first candidate to get started.</p><Link className="parent-gold-btn" to="/parent/add-candidate"><Plus size={20}/> Add New Candidate</Link></div>}
      </section>
    </main>
  </div>;
}
