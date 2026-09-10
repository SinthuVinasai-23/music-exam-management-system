import { Award, QrCode } from 'lucide-react';
import { StudentShell } from '../components/StudentLayout.jsx';
import { results } from '../data/studentData.js';

export default function CeremonyPage() {
  const passing = results.filter((result) => result.score >= 60).slice(1, 3);
  return (
    <StudentShell>
      <section className="student-page-title ceremony-title">
        <span>Official Statement</span>
        <h1>Examination Outcomes</h1>
      </section>
      <section className="student-shell ceremony-grid">
        {passing.map((result, index) => (
          <article className="ticket-card" key={result.id}>
            <span>Invitation to Ceremony</span>
            <div className="award-mark"><Award size={40} /></div>
            <h2>Award Ceremony</h2>
            <p>Class of 2024 Conferment</p>
            <div className="ticket-meta"><p><small>Date</small>Dec 20, 2024</p><p><small>Time</small>18:30 PM</p></div>
            <h3><small>Venue</small>The Royal Grand Conservatory</h3>
            <em>Main Hall • Grand Tier</em>
            <QrCode size={138} />
            <code>Ticket ID: AB-2024-JS-{index + 8}</code>
          </article>
        ))}
      </section>
    </StudentShell>
  );
}
