import { useEffect, useState } from "react";
import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";
import { portalRequest } from "../auth/api.js";
import { GraduationCap, Music2 } from "lucide-react";
import "../styles/learning.css";
export default function About() {
  const [content, setContent] = useState(null),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const load = () =>
      portalRequest("about")
        .then((data) => active && setContent(data))
        .catch((e) => active && setError(e.message));
    load();
    const timer = setInterval(load, 10000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);
  return (
    <>
      
      <main className="about-page">
        {error && <p role="alert">{error}</p>}
        {!content && !error && <p role="status">Loading About Us…</p>}
        {content && (
          <>
            <section className="about-hero">
              <div>
                <span className="learning-eyebrow">
                  MUSIC · EDUCATION · ACHIEVEMENT
                </span>
                <h1>{content.title}</h1>
                <p>{content.content}</p>
                <div className="about-identity">
                  <Music2 />
                  <span>A thoughtful path through music.</span>
                  <GraduationCap />
                </div>
              </div>
              <img src={content.image} alt="Music education at Ensemble" />
            </section>
            <section className="about-section-grid">
              {content.sections.map((section, i) => (
                <article key={i}>
                  <span>0{i + 1}</span>
                  <h2>{section.title}</h2>
                  <p>{section.content}</p>
                </article>
              ))}
            </section>
            <p className="about-updated">
              Last updated: {new Date(content.updatedAt).toLocaleDateString()}
            </p>
          </>
        )}
      </main>
      
    </>
  );
}
