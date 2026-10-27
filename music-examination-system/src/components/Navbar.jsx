import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { authSession, dashboardFor } from "../auth/api.js";
export default function Navbar({ landing = false }) {
  const [user, setUser] = useState(null);
  useEffect(() => {
    let active = true;
    authSession()
      .then((s) => active && setUser(s.user))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  return (
    <header className="site-header">
      <nav className="navbar" aria-label="Primary navigation">
        <NavLink className="brand" to="/">
          
          ICFA
        </NavLink>
        <div className="nav-center">
          {landing ? <><NavLink to="/">Home</NavLink><NavLink to="/faq">FAQ</NavLink><NavLink to="/subjects">Subjects</NavLink></> : <>
          <NavLink to="/">Home</NavLink>
          <NavLink to="/about">About Us</NavLink>
          <NavLink to="/subjects">Subjects</NavLink>
          <NavLink to="/faq">Examinations</NavLink>
          {user ? (
            <NavLink to={dashboardFor(user)}>Dashboard</NavLink>
          ) : (
            <NavLink to="/login">Log In</NavLink>
          )}
          </>}
        </div>
        {landing ? <NavLink className="nav-cta" to="/contact">Contact Us</NavLink> : <NavLink className="nav-cta" to="/contact">
          Contact Us
        </NavLink>}
      </nav>
    </header>
  );
}
