import { NavLink } from 'react-router-dom';

export default function Navbar() {
  return (
    <header className="site-header">
      <nav className="navbar" aria-label="Primary navigation">
        <NavLink className="brand" to="/">
          Examination system
        </NavLink>
        <div className="nav-center">
          <NavLink to="/">Home</NavLink>
          <NavLink to="/faq">FAQ</NavLink>
        </div>
        <NavLink className="nav-cta" to="/contact">
          Contact Us
        </NavLink>
      </nav>
    </header>
  );
}
