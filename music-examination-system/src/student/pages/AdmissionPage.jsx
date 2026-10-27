import { Calendar, Clock, Download, MapPin, QrCode } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { StudentShell } from '../components/StudentLayout.jsx';
import { useStudent } from '../context/StudentContext.jsx';
import { makePdfDownload } from '../utils.js';

export default function AdmissionPage() {
  const { admissions: seeded, applications, profile, showToast } = useStudent();
  const [params] = useSearchParams();
  const focusId = params.get('applicationId');
  const cards = applications.filter(app => app.teacherApprovalStatus === 'approved' && app.adminApprovalStatus === 'approved').flatMap(app => (app.entries || []).map((entry,index) => ({ applicationId:app.id, studentName:app.candidateName, subject:entry.subject, grade:entry.grade, assessment:'Approved Examination Access', id:`ADM-${app.id}-${index}`, date:'To be scheduled by school', time:'To be confirmed', venue:entry.teacherSchool })));
  return (
    <StudentShell className="admission-reference-page">
      <section className="student-page-title">
        <h1>My Admission Cards</h1>
        <p>Please download and present these credentials upon arrival at the examination conservatory. Electronic presentation via this portal is also accepted.</p>
      </section>
      <section className="student-shell admission-grid">
        {!cards.length && <p className="student-empty-state">No admission cards are available yet. Approved examination entry permits will appear here.</p>}
        {cards.map((card) => (
          <article className={"ensemble-admission-row "+(focusId === card.applicationId ? 'focused' : '')} key={card.id}>
            <span className="assessment-pill">{card.assessment}</span>
            <h2>{card.subject} - {card.grade}</h2>
            <p><strong>{card.studentName}</strong></p>
            <code>ID: {card.id}</code>
            <p><Calendar size={19} /><span><small>Date</small>{card.date}</span></p>
            <p><Clock size={19} /><span><small>Reporting Time</small>{card.time}</span></p>
            <p><MapPin size={19} /><span><small>Venue</small>{card.venue}</span></p>
            <div className="admission-card-bottom">
              <span>Scannable QR code included in PDF</span>
              <button
                className="student-gold-btn compact"
                type="button"
                onClick={() => {
                  const link=document.createElement('a');link.href='/api/portal/applications/'+encodeURIComponent(card.applicationId)+'/admission?download=1';link.click();const ok=true;
                  showToast(ok ? 'Download successful' : 'Download failed', ok ? 'success' : 'error');
                }}
              >
                <Download size={16} /> Download Admission Card
              </button>
            </div>
          </article>
        ))}
      </section>
    </StudentShell>
  );
}
