import { ChevronDown, MoveRight } from 'lucide-react';
import { useState } from 'react';
import Footer from '../components/Footer.jsx';
import Navbar from '../components/Navbar.jsx';
import { faqs } from '../data/faqs.js';

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <div>
      <Navbar />
      <main className="faq-page page-shell">
        <section className="faq-intro">
          <span className="eyebrow">FAQ</span>
          <h1>Excellence Defined.</h1>
          <p>Navigating the journey to mastery requires clarity. Explore the most frequent inquiries from our global community of educators and performers.</p>
          <a className="text-link" href="#guidelines">
            View Guidelines <MoveRight size={20} />
          </a>
        </section>
        <section className="accordion-list" aria-label="Frequently asked questions">
          {faqs.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <article className={`accordion-item ${isOpen ? 'open' : ''}`} key={item.question}>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`faq-panel-${index}`}
                  id={`faq-button-${index}`}
                  onClick={() => setOpenIndex(isOpen ? -1 : index)}
                >
                  <span>{item.question}</span>
                  <ChevronDown size={20} />
                </button>
                <div
                  id={`faq-panel-${index}`}
                  role="region"
                  aria-labelledby={`faq-button-${index}`}
                  hidden={!isOpen}
                >
                  <p>{item.answer}</p>
                </div>
              </article>
            );
          })}
        </section>
      </main>
      <Footer />
    </div>
  );
}
