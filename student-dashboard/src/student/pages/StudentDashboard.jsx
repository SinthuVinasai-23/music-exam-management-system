import { BookOpen, CalendarDays, CircleHelp, FileArchive, GraduationCap, Plus, Ticket, Volume2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import mridangamHands from '../../assets/mridangam-hands.png';
import { mcqQuestions, results } from '../data/studentData.js';
import { useStudent } from '../context/StudentContext.jsx';
import { StudentShell } from '../components/StudentLayout.jsx';

export default function StudentDashboard() {
  const { profile, dispatch } = useStudent();
  const navigate = useNavigate();
  const mcqRef = useRef(null);
  const [resource, setResource] = useState('');
  const [questionIndex, setQuestionIndex] = useState(2);
  const [choice, setChoice] = useState(2);
  const [checked, setChecked] = useState(true);
  const question = mcqQuestions[questionIndex];
  const correct = checked && choice === question.answer;

  function startApplication() {
    dispatch({ type: 'RESET_DRAFT' });
    navigate('/student/application');
  }

  return (
    <StudentShell className="dashboard-page">
      <section className="student-shell dashboard-top">
        <div>
          <h1>Welcome back, {profile.displayName}</h1>
          <p>Your musical journey is a narrative of excellence. Continue your path toward distinction.</p>
        </div>
        <div className="dashboard-actions">
          <button className="student-gold-btn" type="button" onClick={startApplication}><Plus size={20} /> New Application</button>
          <button
            className="student-outline-btn"
            type="button"
            onClick={() => {
              const top = (mcqRef.current?.offsetTop || 0) - 32;
              window.scrollTo({ top, behavior: 'smooth' });
              window.setTimeout(() => window.scrollTo(0, top), 750);
            }}
          >
            MCQ Practice
          </button>
        </div>
      </section>

      <section className="student-shell dashboard-grid">
        <button className="active-application-card" type="button" onClick={() => navigate('/student/status')}>
          <img src={mridangamHands} alt="" />
          <span className="active-badge">Active Application</span>
          <span className="active-status">Status</span>
          <h2>Grade 8 Mridangam -<br />Performance</h2>
          <p>Candidate ID: #{profile.candidateId}</p>
          <small>Readiness Score</small>
          <strong>88%</strong>
          <em>View Syllabus Details</em>
        </button>
        <div className="dashboard-side">
          <button className="side-card" type="button" onClick={() => navigate('/student/admission')}>
            <Ticket size={22} />
            <h3>Admission Cards</h3>
            <p>Download your entry permit and venue details for upcoming exams.</p>
          </button>
          <article className="side-card">
            <h3>Latest Results</h3>
            {results.slice(1, 3).map((result) => (
              <button key={result.id} type="button" onClick={() => navigate(`/student/results/${result.id}`)}>
                <span>{result.subject} - {result.grade}<small>{result.date.split(',')[0]}</small></span>
                <mark>{result.detailClassification || result.classification}</mark>
              </button>
            ))}
          </article>
        </div>
      </section>

      <section className="student-shell resource-grid">
        {[
          [BookOpen, 'Syllabus 2024', 'Acoustic Piano'],
          [CalendarDays, 'Session Dates', 'Winter 2024'],
          [FileArchive, 'Past Papers', 'Theory Archive'],
          [CircleHelp, 'Help Desk', '24/7 Support'],
        ].map(([Icon, title, subtitle]) => (
          <button key={title} type="button" onClick={() => (title === 'Help Desk' ? navigate('/contact') : setResource(title))}>
            <span><Icon size={18} /></span><strong>{title}</strong><small>{subtitle}</small>
          </button>
        ))}
      </section>

      <section className="mcq-intro" ref={mcqRef}>
        <h2>MCQ Practice</h2>
        <p>Face your MCQ practice session and get ready for your exams</p>
      </section>
      <section className="student-shell mcq-grid">
        <article className="mcq-card">
          <div className="mcq-card-head">
            <span><Volume2 size={13} /> {question.category}</span>
            <div>
              <button type="button" onClick={() => { setQuestionIndex(Math.max(0, questionIndex - 1)); setChecked(false); }}>‹</button>
              <button type="button" onClick={() => { setQuestionIndex(Math.min(mcqQuestions.length - 1, questionIndex + 1)); setChecked(false); }}>›</button>
            </div>
          </div>
          <small>Question {questionIndex + 1}</small>
          <p>{question.question}</p>
          <div className="theory-diagram">{question.imageLabel}</div>
          <div className="mcq-options">
            {question.options.map((option, index) => (
              <label key={option}>
                <input type="radio" name="mcq" checked={choice === index} onChange={() => { setChoice(index); setChecked(false); }} />
                {option}
              </label>
            ))}
          </div>
          <button className="student-outline-btn compact" type="button" onClick={() => setChecked(true)}>Check Answer</button>
        </article>
        <aside className={`mcq-result ${correct ? 'correct' : checked ? 'incorrect' : ''}`}>
          <h3>Question {questionIndex + 1}: {checked ? (correct ? 'Correct' : 'Try Again') : 'Ready'}</h3>
          <p>{question.question.includes('interval') ? question.question : 'Submit your answer to reveal a guided explanation.'}</p>
          <div><small>Your Answer</small>{question.options[choice]}</div>
          <h4>Explanation</h4>
          <p>{checked ? question.explanation : 'Choose the strongest option, then check your answer.'}</p>
        </aside>
      </section>
      {resource && (
        <div className="student-modal" role="dialog" aria-modal="true" onClick={() => setResource('')}>
          <article onClick={(event) => event.stopPropagation()}>
            <button type="button" onClick={() => setResource('')}>×</button>
            <GraduationCap size={34} />
            <h2>{resource}</h2>
            <p>This frontend preview opens a local study panel for {resource.toLowerCase()} without leaving the student portal.</p>
          </article>
        </div>
      )}
    </StudentShell>
  );
}
