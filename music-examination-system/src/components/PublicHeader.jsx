import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import '../styles/home-reference.css';

const sections = [['Home', 'home'], ['Subjects', 'subjects'], ['About Us', 'about'], ['FAQ', 'faq'], ['Contact Us', 'contact']];

export default function PublicHeader() {
  const [menu, setMenu] = useState(false);
  const [active, setActive] = useState('home');
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setMenu(false);
    setActive(location.state?.scrollTo || 'home');
  }, [location.key]);

  function goToSection(event, section) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    setMenu(false);
    setActive(section);
    if (location.pathname !== '/') {
      navigate('/', { state: { scrollTo: section } });
      return;
    }
    // Scroll the actual section directly, including when the same item is clicked again.
    requestAnimationFrame(() => {
      const target = document.getElementById(section);
      const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
      if (section === 'home') window.scrollTo({ top: 0, behavior });
      else target?.scrollIntoView({ behavior, block: 'start' });
    });
  }

  return <header className="ensemble-home eh-header"><div className="eh-wrap eh-nav">
    <Link to="/" className="eh-brand" onClick={event => goToSection(event, 'home')}><img src="/icfa-official-logo.png" alt="ICFA logo"/><span>ICFA<small>MUSIC EXAMINATIONS</small></span></Link>
    <button className="eh-menu-toggle" aria-label={menu ? 'Close navigation' : 'Open navigation'} aria-expanded={menu} onClick={() => setMenu(!menu)}>{menu ? <X/> : <Menu/>}</button>
    <nav className={menu ? 'eh-links open' : 'eh-links'} aria-label="Primary navigation">
      {sections.map(([name, section]) => <Link to="/" state={{ scrollTo: section }} key={section} onClick={event => goToSection(event, section)} aria-current={location.pathname === '/' && active === section ? 'location' : undefined}>{name}</Link>)}
    </nav>
    <div className="eh-nav-actions"><Link className="eh-login" to="/login">Login</Link><Link className="eh-register" to="/staff-login">Staff Login</Link></div>
  </div></header>;
}
