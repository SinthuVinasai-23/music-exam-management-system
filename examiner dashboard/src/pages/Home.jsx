import { Award, Building2, ChartColumn, CircleDollarSign, Globe2, GraduationCap, Landmark, Network, ShieldCheck } from 'lucide-react';
import dancerDrum from '../assets/dancer-drum-neutral.png';
import Button from '../components/Button.jsx';
import Footer from '../components/Footer.jsx';
import Navbar from '../components/Navbar.jsx';

const highlights = [
  ['Global Standards', 'ISO-Certified Pedagogy', Globe2],
  ['Unified Certification', 'Universal Recognition', Award],
  ['Academy Partnerships', '420+ Certified Institutions', CircleDollarSign],
];

const pillars = [
  ['Artistic Rigor', 'Our examinations are designed by a board of world-renowned pedagogues to test not just technical proficiency, but the soul of performance.'],
  ['Modern Portals', 'Seamless digital integration for global results, ensuring that administrative processes never hinder the creative flow of our students.'],
  ['Global Reach', 'Spanning over 40 countries, our certifications are recognized as the platinum standard for institutional musical qualification.'],
];

const architecture = [
  ['Multi-Academy Integration', 'Seamlessly synchronize curricula across satellite campuses while maintaining centralized oversight and brand consistency.', Network],
  ['Secure Examination Proctoring', 'Advanced biometric verification and encrypted streaming ensure the sanctity of every performance, regardless of location.', ShieldCheck],
  ['Real-time Result Grading', 'Instantaneous calibration against global datasets to ensure grading uniformity and eliminate regional examiner bias.', ChartColumn],
];

export default function Home() {
  return (
    <div className="home-page">
      <Navbar />
      <main>
        <section className="home-hero page-shell">
          <div className="hero-art">
            <img src={dancerDrum} alt="Classical dancer performing beside a traditional drum" />
            <div className="hero-tagline">
              <Landmark size={18} />
              <span>Empowering Global Music Institutions with Standardized, Ethical Exam Management.</span>
            </div>
            <div className="hero-badges">
              {highlights.map(([title, sub, Icon]) => (
                <div className="mini-badge" key={title}>
                  <Icon size={15} />
                  <span>
                    <strong>{title}</strong>
                    {sub}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="hero-copy hero-title-group">
            <span className="eyebrow pill">A Legacy of Mastery</span>
            <h1 className="hero-title">
              <span className="hero-title-line">The Global</span>
              <span className="hero-title-line">Benchmark for</span>
              <span className="hero-title-line hero-title-accent">Musical Excellence</span>
            </h1>
          </div>
          <div className="access-panel staff-card">
            <div className="round-icon">
              <Building2 size={24} />
            </div>
            <h2>Faculty &amp; Staff</h2>
            <p>Secure portal for accredited examiners and academic administrators to manage schedules, results, and curriculum standards.</p>
            <Button to="/staff-login">Staff Login</Button>
          </div>
          <div className="access-panel candidate-card">
            <div className="round-icon">
              <GraduationCap size={24} />
            </div>
            <h2>Candidates</h2>
            <p>Begin your journey toward international recognition. Track your grades, access study materials, and book your next examination.</p>
            <div className="button-row">
              <Button to="/register">Register</Button>
              <Button to="/login" variant="ghost">Login</Button>
            </div>
          </div>
        </section>

        <section className="benchmark-section">
          <div className="page-shell">
            <span className="eyebrow">The Global Benchmark</span>
            <h2>Curated by Masters for Future Virtuosos</h2>
            <div className="pillar-grid">
              {pillars.map(([title, copy]) => (
                <article key={title}>
                  <span className="gold-rule" />
                  <h3>{title}</h3>
                  <p>{copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="architecture-section page-shell">
          <h2>Integrated Institutional Architecture</h2>
          <p className="section-lede">Our platform provides the technological infrastructure required to scale high-stakes examinations across borders without compromising artistic integrity.</p>
          <div className="architecture-grid">
            {architecture.map(([title, copy, Icon]) => (
              <article className="feature-card" key={title}>
                <div className="round-icon small">
                  <Icon size={20} />
                </div>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
          <div className="institutional-cta">
            <h2>Elevate Your Institution's Prestige</h2>
            <p>Join an elite consortium of music academies worldwide. Gain access to the International Music Examination Board's proprietary assessment tools and curriculum standards.</p>
            <div className="button-row">
              <Button to="/contact">Partner With Us</Button>
              <Button to="/contact" variant="ghost">Institutional Inquiry</Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
