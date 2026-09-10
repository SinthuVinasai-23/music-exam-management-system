import { Download, Eye, Music, Radio, ScrollText } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatusPill, StudentShell } from '../components/StudentLayout.jsx';
import { useStudent } from '../context/StudentContext.jsx';
import { makePdfDownload } from '../utils.js';

export default function StatusPage() {
  const { applications, showToast } = useStudent();
  const [more, setMore] = useState(false);
  const navigate = useNavigate();
  const rows = more ? applications : applications.slice(0, 4);
  return (
    <StudentShell>
      <section className="student-page-title">
        <h1>Application Status</h1>
        <p>Manage your examination progress and view updates from the International Music Examination Board.</p>
      </section>
      <section className="student-shell status-table">
        <div className="status-head"><span>Candidate & Exam</span><span>Status</span><span>Admission</span></div>
        {rows.map((app, index) => {
          const Icon = index === 2 ? Radio : index === 3 ? ScrollText : Music;
          return (
            <article key={app.id} className="status-row">
              <div><span><Icon size={20} /></span><h2>{app.title}</h2><p>{app.candidateName} • #{app.id}</p></div>
              <StatusPill status={app.applicationStatus === 'Approved for Payment' ? 'Approved' : app.applicationStatus} />
              <div className="row-actions">
                <button type="button" onClick={() => navigate(`/student/admission?applicationId=${app.id}`)} aria-label={`View admission for ${app.title}`}><Eye size={20} /></button>
                <button
                  type="button"
                  disabled={!app.admissionAvailable}
                  onClick={() => {
                    const ok = makePdfDownload(`${app.id}-admission.pdf`, ['Admission Card', app.title, app.candidateName, app.id]);
                    showToast(ok ? 'Download successful' : 'Download failed', ok ? 'success' : 'error');
                  }}
                  aria-label={`Download admission for ${app.title}`}
                >
                  <Download size={18} />
                </button>
              </div>
            </article>
          );
        })}
        <button className="student-outline-btn load-more" type="button" onClick={() => setMore(true)}>Load More Applications⌄</button>
      </section>
    </StudentShell>
  );
}
