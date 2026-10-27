import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";
import { portalRequest, authSession } from "../auth/api.js";
import "../styles/learning.css";
export default function PublicSubjects() {
  const [subjects, setSubjects] = useState([]),
    [user, setUser] = useState(null),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    Promise.all([portalRequest("subjects"), authSession()])
      .then(([data, session]) => {
        if (active) {
          setSubjects(data.subjects);
          setUser(session.user);
        }
      })
      .catch((e) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, []);
  return (
    <>
      
      <main className="about-page">
        <div className="learning-heading">
          <div>
            <span className="learning-eyebrow">EXPLORE MUSIC</span>
            <h1>Our Subjects</h1>
            <p>Find your path through music, movement and understanding.</p>
          </div>
        </div>
        {error && <p role="alert">{error}</p>}
        <div className="learning-subject-grid">
          {subjects.map((s) => (
            <article className="learning-subject-card" key={s.id}>
              <img src={s.image} alt={`${s.name} illustration`} />
              <div>
                <h2>{s.name}</h2>
                <p>{s.introduction}</p>
                <Link
                  className="learning-card-link"
                  to={
                    user?.role === "student"
                      ? "/student/subjects/" + s.id
                      : user?.role === "parent"
                        ? "/parent/dashboard"
                        : "/login"
                  }
                >
                  {user ? "Explore Subject" : "Sign in to Learn"}
                </Link>
              </div>
            </article>
          ))}
        </div>
      </main>
      
    </>
  );
}
