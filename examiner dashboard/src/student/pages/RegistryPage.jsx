import { ArrowRight, Download, FileText, HelpCircle, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StatusPill, StudentShell } from '../components/StudentLayout.jsx';
import { useStudent } from '../context/StudentContext.jsx';
import { formatMoney, makePdfDownload, subjectFee } from '../utils.js';

export default function RegistryPage() {
  const { applications, dispatch, showToast } = useStudent();
  const navigate = useNavigate();
  function receipt(app) {
    const ok = makePdfDownload(`${app.id}-receipt.pdf`, [
      'Music Examination System - Payment Receipt',
      `Invoice: ${app.payment?.invoiceId || 'Pending'}`,
      `Candidate: ${app.candidateName}`,
      `Application: ${app.id}`,
      `Subjects: ${app.subjects.join(', ')}`,
      `Grade: ${app.grade}`,
      `Total: ${formatMoney(app.payment?.amount || app.subjects.length * subjectFee(app.grade))} CAD`,
      `Payment Method: Card ending ${app.payment?.last4 || 'N/A'}`,
      `Status: ${app.paymentStatus}`,
      `Date: ${app.payment?.date || 'Not paid yet'}`,
    ]);
    showToast(ok ? 'Download successful' : 'Download failed', ok ? 'success' : 'error');
  }
  return (
    <StudentShell>
      <section className="student-page-title">
        <h1>Application Registry</h1>
        <p>Monitor your examination progress and finalize outstanding balances for upcoming sessions.</p>
      </section>
      <section className="student-shell registry-list">
        <div className="registry-head"><span>Application</span><span>Payment</span></div>
        {applications.slice(0, 5).map((app) => (
          <article className="registry-row" key={app.id}>
            <div><h2><FileText size={18} /> {app.title}</h2><p><UserRound size={14} /> {app.candidateName} <span>{app.session}</span></p></div>
            <StatusPill status={app.applicationStatus === 'Approved for Payment' ? 'Approved' : app.applicationStatus} />
            <StatusPill status={app.paymentStatus} />
            {app.paymentStatus === 'Paid' && <button type="button" onClick={() => receipt(app)}><Download size={16} /> Download Receipt</button>}
            {app.paymentStatus !== 'Paid' && <button className="student-gold-btn compact" type="button" onClick={() => { dispatch({ type: 'SET_ACTIVE_PAYMENT', id: app.id }); navigate('/student/payment'); }}>Pay Now <ArrowRight size={16} /></button>}
            {app.applicationStatus === 'Completed' && <button type="button" onClick={() => navigate('/student/results/mridangam-grade-2')}>View Result</button>}
          </article>
        ))}
      </section>
      <aside className="help-card">
        <HelpCircle size={32} />
        <h2>Need assistance with your application?</h2>
        <p>Our registrar office is available to support your artistic journey through technical or administrative hurdles.</p>
        <div><button className="student-gold-btn compact" type="button" onClick={() => navigate('/contact')}>Contact Registrar</button><button className="student-outline-btn compact" type="button" onClick={() => navigate('/faq')}>View FAQ</button></div>
      </aside>
    </StudentShell>
  );
}
