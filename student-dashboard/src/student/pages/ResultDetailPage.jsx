import { ArrowLeft, Award, BadgeCheck, BarChart3, CalendarDays, Download, Share2, UserRound } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { StudentShell } from '../components/StudentLayout.jsx';
import { results } from '../data/studentData.js';
import { useStudent } from '../context/StudentContext.jsx';
import { makePdfDownload } from '../utils.js';

export default function ResultDetailPage() {
  const { resultId } = useParams();
  const navigate = useNavigate();
  const { profile, showToast } = useStudent();
  const [shared, setShared] = useState(false);
  const result = results.find((item) => item.id === resultId) || results[2];
  const score = result.detailScore || result.score;
  const classification = result.detailClassification || result.classification;
  return (
    <StudentShell>
      <button className="detail-back" type="button" onClick={() => navigate('/student/results')}><ArrowLeft size={22} /> Back</button>
      <section className="student-page-title detail-title">
        <span>Academic Record • 2024</span>
        <h1>Examination Results</h1>
        <p>A celebration of artistic achievement and technical mastery at the Highest Grade Performance level.</p>
      </section>
      <section className="student-shell detail-hero">
        <article><span><UserRound size={64} /></span><h2>{profile.name}</h2><p><Award size={18} /> {result.subject} - {result.grade} <CalendarDays size={18} /> Summer Term 2024 <BadgeCheck size={18} /> ID: CN-882910</p></article>
        <aside><small>Final Grade</small><strong>{score}</strong><em>{classification}</em></aside>
      </section>
      <section className="student-shell detail-grid">
        <article className="technical-card"><h2>Technical</h2><h3>Scales & Arpeggios</h3><div>{result.id === 'mridangam-grade-2' ? '18/20' : '17/20'}</div><p><span>Accuracy</span><strong>High</strong></p><p><span>Tempo Control</span><strong>Distinguished</strong></p></article>
        <article className="repertoire-card"><h2>Performance Repertoire <strong>56/60<small>Total Score</small></strong></h2>{['Bach: Prelude & Fugue in C Minor', "Beethoven: Sonata No. 8 'Pathetique'", 'Chopin: Nocturne in E-flat Major'].map((piece, index) => <p key={piece}><span>{index + 1}</span><strong>{piece}<small>{['Baroque Period', 'Classical Period', 'Romantic Period'][index]}</small></strong><i /><em>{index === 1 ? 18 : 19}</em></p>)}</article>
        <article className="support-card"><h2>Supporting Tests</h2><h3>Aural & Sight Reading</h3><p>Sight Reading <strong>10/10</strong></p><p>Aural Skills <strong>10/10</strong></p><div><BadgeCheck size={20} /> Full marks awarded in supporting tests indicate exceptional musicianship and intuitive understanding of theoretical structures.</div></article>
        <article className="narrative-card"><h2>Examiner's Narrative</h2><p>"Julianne demonstrated a sophisticated tonal palette throughout the performance. The Bach was executed with pristine clarity and rhythmic integrity, while the Chopin displayed a mature emotional depth and exquisite rubato. Technically, the candidate is very secure, with scales played at the highest standard. A truly distinguished performance that reflects a high level of preparation and artistic sensitivity."</p><footer><UserRound size={34} /> Dr. Karthik Iyer, FRCM<br />Senior Examiner • Keyboard Studies</footer></article>
      </section>
      <div className="detail-actions">
        <button
          className="student-gold-btn"
          type="button"
          onClick={() => {
            const ok = makePdfDownload(`${result.id}-certificate.pdf`, ['Official Certificate', profile.name, `${result.subject} - ${result.grade}`, `Score: ${score}`, classification, result.date, `CERT-${result.id.toUpperCase()}`]);
            showToast(ok ? 'Download successful' : 'Download failed', ok ? 'success' : 'error');
          }}
        >
          <Download size={18} /> Download Official Certificate
        </button>
        <button className="student-outline-btn" type="button" onClick={() => { setShared(true); setTimeout(() => setShared(false), 1800); }}><Share2 size={18} /> Share to Achievement Board</button>
      </div>
      {shared && <div className="student-toast">Shared to Achievement Board</div>}
    </StudentShell>
  );
}
