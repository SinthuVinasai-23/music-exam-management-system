import { Link } from "react-router-dom";
import { useStudent } from "../context/StudentContext.jsx";
import { ArrowUpRight, Music2 } from "lucide-react";
export default function SubjectStudy() {
  const { learningData, serverError } = useStudent();
  return (
    <section className="learning-explore" id="subjects">
      <div className="learning-heading">
        <div>
          <span className="learning-eyebrow">YOUR MUSICAL JOURNEY</span>
          <h2>Explore Subjects</h2>
          <p>
            Discover every available subject and continue at your own stage.
          </p>
        </div>
        <Music2 size={28} />
      </div>
      {serverError && <p role="alert">{serverError}</p>}
      <div className="learning-subject-grid">
        {learningData?.subjects.map(
          ({ subject, currentGrade, completedGrades, stats }) => (
            <article className="learning-subject-card" key={subject.id}>
              <Link
                to={"/student/subjects/" + subject.id}
                tabIndex={-1}
                aria-hidden="true"
              >
                <img
                  src={subject.image}
                  alt={`${subject.name} learning illustration`}
                  loading="lazy"
                />
              </Link>
              <div>
                <small>
                  {currentGrade} · {completedGrades.length} completed
                </small>
                <h3>{subject.name}</h3>
                <p>{subject.introduction}</p>
                <span className="learning-progress-label">
                  {stats.attempts
                    ? `${stats.attempts} practice answers saved`
                    : "Ready to explore"}
                </span>
                <Link
                  className="learning-card-link"
                  to={"/student/subjects/" + subject.id}
                >
                  Explore Subject <ArrowUpRight size={17} />
                </Link>
              </div>
            </article>
          ),
        )}
      </div>
      {!learningData && !serverError && (
        <p role="status">Loading your subjects…</p>
      )}
      {learningData?.subjects.length === 0 && (
        <p>No active subjects are currently available.</p>
      )}
    </section>
  );
}
