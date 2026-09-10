import { Calendar, Clock, Download, MapPin, QrCode } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { StudentShell } from '../components/StudentLayout.jsx';
import { useStudent } from '../context/StudentContext.jsx';
import { makePdfDownload } from '../utils.js';

export default function AdmissionPage() {
  const { admissions: seeded, applications, profile, showToast } = useStudent();
  const [params] = useSearchParams();
  const focusId = params.get('applicationId');
  const generated = applications.filter((app) => app.admissionAvailable && app.id.startsWith('APP-2026')).map((app, index) => ({
    applicationId: app.id,
    subject: app.subjects[0],
    grade: app.grade,
    assessment: 'Practical Assessment',
    id: `ADM-2026-${String(index + 31).padStart(2, '0')}-${app.id.slice(-4)}`,
    date: 'November 22, 2026',
    time: '10:30 AM',
    venue: 'Conservatory Hall B',
  }));
  const cards = [...generated, ...seeded];
  return (
    <StudentShell>
      <section className="student-page-title">
        <h1>My Admission Cards</h1>
        <p><em>Please download and present these credentials upon arrival at the examination conservatory. Electronic presentation via this portal is also accepted.</em></p>
      </section>
      <section className="student-shell admission-grid">
        {cards.map((card) => (
          <article className={focusId === card.applicationId ? 'focused' : ''} key={card.id}>
            <span className="assessment-pill">{card.assessment}</span>
            <h2>{card.subject} - {card.grade}</h2>
            <code>ID: {card.id}</code>
            <p><Calendar size={19} /><span><small>Date</small>{card.date}</span></p>
            <p><Clock size={19} /><span><small>Reporting Time</small>{card.time}</span></p>
            <p><MapPin size={19} /><span><small>Venue</small>{card.venue}</span></p>
            <div className="admission-card-bottom">
              <QrCode size={48} />
              <button
                className="student-gold-btn compact"
                type="button"
                onClick={() => {
                  const ok = makePdfDownload(`${card.id}.pdf`, ['Admission Card', profile.name, `${card.subject} - ${card.grade}`, card.date, card.time, card.venue, card.id]);
                  showToast(ok ? 'Download successful' : 'Download failed', ok ? 'success' : 'error');
                }}
              >
                <Download size={16} /> Download PDF
              </button>
            </div>
          </article>
        ))}
      </section>
    </StudentShell>
  );
}
