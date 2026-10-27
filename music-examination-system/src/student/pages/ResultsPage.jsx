import { ArrowRight, CalendarDays } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StudentShell } from '../components/StudentLayout.jsx';
import { useStudent } from '../context/StudentContext.jsx';

export default function ResultsPage() {
  const navigate = useNavigate();
  const { profile } = useStudent();
  const results = profile.results || [];
  return (
    <StudentShell className="results-reference-page">
      <section className="student-page-title results-title">
        
        <span className="result-record-label">PUBLISHED ACADEMIC RECORD</span><h1>Examination Results</h1>
        <p>Official results for completed examinations.</p>
      </section>
      <section className="student-shell results-grid">
        {!results.length && <p>No results have been published for this student.</p>}
        {results.map((result) => (
          <article className="result-card" key={result.id}>
            <div><strong>{result.score}</strong><span>{result.classification}</span></div>
            <h2>{result.subject} -<br />{result.grade}</h2>
            <p><CalendarDays size={16} /> {result.date}</p>
            <button type="button" onClick={() => navigate(`/student/results/${result.id}`)}>View Detailed<br />Breakdown <ArrowRight size={18} /></button>
          </article>
        ))}
      </section>
    </StudentShell>
  );
}
