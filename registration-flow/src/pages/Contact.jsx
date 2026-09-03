import { Mail, MapPin, MoveRight, Phone } from 'lucide-react';
import { useState } from 'react';
import Footer from '../components/Footer.jsx';
import Modal from '../components/Modal.jsx';
import Navbar from '../components/Navbar.jsx';

const initialValues = { name: '', email: '', message: '' };

function validate(values) {
  const errors = {};
  if (!values.name.trim()) errors.name = 'Full name is required.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) errors.email = 'Enter a valid email address.';
  if (values.message.trim().length < 12) errors.message = 'Please enter a message of at least 12 characters.';
  return errors;
}

export default function Contact() {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [sent, setSent] = useState(false);

  function update(event) {
    setValues({ ...values, [event.target.name]: event.target.value });
  }

  function submit(event) {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) setSent(true);
  }

  return (
    <div>
      <Navbar />
      <main className="contact-page page-shell">
        <section className="contact-info">
          <span className="eyebrow">Contact Global Support</span>
          <h1>Begin your artistic journey.</h1>
          <div className="contact-methods">
            <div>
              <span className="round-icon small"><MapPin size={20} /></span>
              <p><strong>Mailing Address</strong>273 Bloor St West, Toronto, ON M5S 1W2, Canada</p>
            </div>
            <div>
              <span className="round-icon small"><Mail size={20} /></span>
              <p><strong>Admissions Office</strong>admissions@royalconservatory.music</p>
            </div>
            <div>
              <span className="round-icon small"><Phone size={20} /></span>
              <p><strong>Examination Inquiries</strong>+1 (416) 408-2824</p>
            </div>
          </div>
        </section>
        <section className="form-card contact-form-card">
          <h2>Send a Message</h2>
          <p>Our academic advisors are available globally to assist with your examinations and registration.</p>
          <form onSubmit={submit} noValidate>
            <label>
              Full Name
              <input name="name" value={values.name} onChange={update} placeholder="Maestro Student" autoComplete="name" />
              {errors.name && <span className="field-error">{errors.name}</span>}
            </label>
            <label>
              Email Address
              <input name="email" type="email" value={values.email} onChange={update} placeholder="maestro@academy.com" autoComplete="email" />
              {errors.email && <span className="field-error">{errors.email}</span>}
            </label>
            <label>
              Inquiry Message
              <textarea name="message" value={values.message} onChange={update} placeholder="How may we guide your musical pursuit today?" rows="5" />
              {errors.message && <span className="field-error">{errors.message}</span>}
            </label>
            <button className="btn btn-primary wide" type="submit">
              Submit Inquiry <MoveRight size={18} />
            </button>
          </form>
        </section>
      </main>
      <Footer />
      <Modal open={sent} type="success" title="Message Sent" actionLabel="Continue" onAction={() => setSent(false)}>
        <p>Your inquiry has been gracefully received. Our academic advisors will review your message and reach out to you shortly to assist with your journey.</p>
      </Modal>
    </div>
  );
}
