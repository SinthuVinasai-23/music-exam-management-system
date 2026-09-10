import { Building2, Check, CreditCard } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatusPill, StudentShell } from '../components/StudentLayout.jsx';
import { useStudent } from '../context/StudentContext.jsx';
import { formatMoney, subjectFee, todayLabel, validateCardNumber, validateExpiry, validateName } from '../utils.js';

export default function PaymentPage() {
  const { activeApplication, dispatch, lastPayment, profile } = useStudent();
  const navigate = useNavigate();
  const app = activeApplication;
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({ name: '', card: '', expiry: '', cvv: '' });
  const [errors, setErrors] = useState({});
  const fee = subjectFee(app?.grade);
  const total = app?.subjects?.length ? app.subjects.length * fee : app?.total || fee;
  const paid = app?.paymentStatus === 'Paid';

  function update(field, value) {
    const next = field === 'card' ? value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim() : value;
    setForm({ ...form, [field]: next });
  }

  function pay() {
    const next = {};
    const name = validateName(form.name);
    if (name) next.name = name;
    const card = validateCardNumber(form.card);
    if (card) next.card = card;
    const expiry = validateExpiry(form.expiry);
    if (expiry) next.expiry = expiry;
    if (!/^\d{3,4}$/.test(form.cvv)) next.cvv = 'CVV must be 3 or 4 digits.';
    setErrors(next);
    if (Object.keys(next).length || !app) return;
    const digits = form.card.replace(/\D/g, '');
    const payment = {
      invoiceId: `GMEB-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      paymentId: `PAY-${Date.now().toString().slice(-8)}`,
      date: todayLabel(),
      amount: total,
      currency: 'CAD',
      last4: digits.slice(-4),
      status: 'Paid',
    };
    dispatch({ type: 'PAY_SUCCESS', id: app.id, payment });
    setSuccess(true);
    setForm({ name: '', card: '', expiry: '', cvv: '' });
  }

  const payment = lastPayment?.applicationId === app?.id ? lastPayment : app?.payment;

  return (
    <StudentShell>
      <section className="student-page-title gateway-title">
        <h1>Secure Gateway</h1>
        <p>Complete your institutional accreditation and examination fees via our encrypted academic portal.</p>
      </section>
      <section className="student-shell payment-grid">
        <article className="payment-summary">
          <h2>Order Summary</h2>
          <div className="bundle-toggle"><span>Individual</span><i /><strong>Bundled</strong></div>
          {(app?.subjects || ['Mridangam']).map((subject) => (
            <div className="summary-line" key={subject}>
              <span>{app?.grade || 'Grade 2'} {subject} Performance Fee<small>Candidate: {app?.candidateName || profile.name}</small></span>
              <strong>{formatMoney(fee || 150)}</strong>
            </div>
          ))}
          <div className="summary-total"><h3>Total Amount</h3><strong>{formatMoney(total || 150)}</strong></div>
          <div className="guarantee"><Check size={20} /><p><strong>Institutional Guarantee</strong>Your payment is processed through this frontend simulation. No card details are stored.</p></div>
          {paid && <StatusPill status="Paid" />}
        </article>
        <article className="card-details">
          <div className="card-head"><h2>Card Details</h2><span><CreditCard size={22} /><Building2 size={20} /></span></div>
          <label>Cardholder Name<input value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="Julian Sterling" autoComplete="cc-name" />{errors.name && <span className="student-error">{errors.name}</span>}</label>
          <label>Card Number<input value={form.card} onChange={(event) => update('card', event.target.value)} placeholder="••••  ••••  ••••  4421" maxLength="23" inputMode="numeric" autoComplete="cc-number" />{errors.card && <span className="student-error">{errors.card}</span>}</label>
          <div className="card-row">
            <label>Expiry Date<input value={form.expiry} onChange={(event) => update('expiry', event.target.value)} placeholder="MM / YY" maxLength="7" />{errors.expiry && <span className="student-error">{errors.expiry}</span>}</label>
            <label>CVV<input value={form.cvv} onChange={(event) => update('cvv', event.target.value.replace(/\D/g, ''))} placeholder="•••" maxLength="4" inputMode="numeric" autoComplete="cc-csc" />{errors.cvv && <span className="student-error">{errors.cvv}</span>}</label>
          </div>
          <button className="student-gold-btn pay-button" type="button" onClick={pay}>Confirm & Pay</button>
          <p>Encrypted by 256-bit SSL Architecture</p>
        </article>
      </section>
      {success && payment && (
        <div className="success-overlay" role="dialog" aria-modal="true" onClick={() => { setSuccess(false); navigate('/student/applications'); }}>
          <article onClick={(event) => event.stopPropagation()}>
            <div className="success-check"><Check size={42} /></div>
            <h2>Payment Successful</h2>
            <p>Hello <strong>{profile.institution}</strong>, Thank you for your payment. We have successfully received and processed your transaction. Your institutional standing remains in high regard.</p>
            <div className="receipt-meta"><span><small>Invoice</small>#{payment.invoiceId}</span><span><small>Date</small>{payment.date}</span></div>
            <hr />
            <small>Description</small>
            <h3>{app.grade} {app.subjects.join(', ')} Examination Fee</h3>
            <div className="receipt-total"><span><small>Method</small>Card ending {payment.last4}</span><strong>{formatMoney(payment.amount)} <em>{payment.currency}</em></strong></div>
            <button type="button" onClick={() => { setSuccess(false); navigate('/student/applications'); }}>Continue</button>
            <footer>Privacy Policy&nbsp;&nbsp;&nbsp; Contact Support&nbsp;&nbsp;&nbsp; Terms of Service<br />© 2026 International Music Examination Board. All rights reserved.</footer>
          </article>
        </div>
      )}
    </StudentShell>
  );
}
