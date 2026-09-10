import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stepper, StudentShell } from '../components/StudentLayout.jsx';
import { subjects } from '../data/studentData.js';
import { useStudent } from '../context/StudentContext.jsx';
import { formatMoney, subjectFee } from '../utils.js';

export default function ApplicationSelection() {
  const { draft, dispatch } = useStudent();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  return (
    <StudentShell>
      <section className="student-page-title">
        <h1>Examination Application</h1>
        <p>Select the disciplines you will present for assessment.</p>
      </section>
      <section className="application-layout student-shell">
        <Stepper step={2} />
        <article className="application-card">
          <h2>Select Examination Subjects</h2>
          <p>Choose one or more subjects for the {draft.grade || 'selected'} examination level.</p>
          <div className="subject-grid">
            {subjects.map((subject) => {
              const selected = draft.subjects.includes(subject.name);
              return (
                <label className={selected ? 'subject-option selected' : 'subject-option'} key={subject.id}>
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => { dispatch({ type: 'TOGGLE_SUBJECT', subject: subject.name }); setError(''); }}
                  />
                  <span>{selected && <Check size={18} />}</span>
                  <strong>{subject.name}</strong>
                  <small>{subject.type}</small>
                  <em>{formatMoney(subjectFee(draft.grade))}</em>
                </label>
              );
            })}
          </div>
          {error && <span className="student-error">{error}</span>}
          <div className="application-buttons">
            <button className="student-outline-btn" type="button" onClick={() => navigate('/student/application')}><ArrowLeft size={18} /> Back</button>
            <button className="student-gold-btn" type="button" onClick={() => draft.subjects.length ? navigate('/student/application/confirmation') : setError('Select at least one subject.')}>Continue <ArrowRight size={18} /></button>
          </div>
        </article>
      </section>
    </StudentShell>
  );
}
