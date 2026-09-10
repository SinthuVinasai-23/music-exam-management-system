import { ArrowRight, CalendarDays } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StudentShell } from '../components/StudentLayout.jsx';
import { usePublishedResults } from '../publishedResults.js';

export default function ResultsPage() {
  const navigate = useNavigate();
  const results = usePublishedResults();
  return (
    <StudentShell>
      <section className="student-page-title results-title">
        <span>Academic Record • 2024</span>
        <h1>Examination Results</h1>
        <p>A celebration of artistic achievement and technical mastery at the Highest Grade Performance level.</p>
      </section>
      <section className="student-shell results-grid">
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
