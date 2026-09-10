import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Stepper, StudentShell } from '../components/StudentLayout.jsx';
import { useStudent } from '../context/StudentContext.jsx';
import { formatMoney, subjectFee } from '../utils.js';

export default function ApplicationConfirmation() {
  const { draft, dispatch } = useStudent();
  const navigate = useNavigate();
  const fee = subjectFee(draft.grade);
  const total = draft.subjects.length * fee;
  return (
    <StudentShell>
      <section className="student-page-title">
        <h1>Examination Application</h1>
        <p>Confirm your candidate information before secure payment.</p>
      </section>
      <section className="application-layout student-shell">
        <Stepper step={3} />
        <article className="application-card confirmation-card">
          <h2>Application Confirmation</h2>
          <div className="review-grid">
            <p><span>Candidate</span>{draft.candidateName}</p>
            <p><span>Date of Birth</span>{draft.dob}</p>
            <p><span>Age</span>{draft.age || '-'}</p>
            <p><span>Exam Level</span>{draft.grade}</p>
            <p><span>Registered Teacher</span>{draft.teacher}</p>
            {draft.signature && <img src={draft.signature} alt="Applicant signature preview" />}
          </div>
          <div className="fee-list">
            {draft.subjects.map((subject) => (
              <div key={subject}><span>{subject} - {draft.grade}</span><strong>{formatMoney(fee)}</strong></div>
            ))}
            <div><span>Subtotal</span><strong>{formatMoney(total)}</strong></div>
            <div className="total"><span>Total</span><strong>{formatMoney(total)}</strong></div>
          </div>
          <p>Bundled payment will pay all selected subjects together.</p>
          <div className="application-buttons">
            <button className="student-outline-btn" type="button" onClick={() => navigate('/student/application/selection')}><ArrowLeft size={18} /> Back to Selection</button>
            <button className="student-gold-btn" type="button" onClick={() => { dispatch({ type: 'CREATE_APPLICATION' }); navigate('/student/payment'); }}>Proceed to Payment <ArrowRight size={18} /></button>
          </div>
        </article>
      </section>
    </StudentShell>
  );
}
