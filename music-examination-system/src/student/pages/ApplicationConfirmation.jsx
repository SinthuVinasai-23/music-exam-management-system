import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Stepper } from "../components/StudentLayout.jsx";
import { useStudent } from "../context/StudentContext.jsx";
import PracticeDashboardShell from "../components/PracticeDashboardShell.jsx";
import "../../styles/practice-dashboard.css";
import "../../styles/carnatic-dashboard.css";
import "../../styles/application-elegant.css";
import { deadlineError } from "../rules.js";
export default function ApplicationConfirmation() {
  const { draft, profile, submitApplication, catalog, serverError } =
      useStudent(),
    navigate = useNavigate();
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit() {
    setBusy(true);
    setError("");
    try {
      if (!draft.preferredLocation) throw new Error("Select a preferred examination location before submitting.");
      if (!draft.subjects.length)
        throw new Error("Add at least one subject before submitting.");
      const app = await submitApplication();
      navigate("/student/status?submitted=" + encodeURIComponent(app.id));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <PracticeDashboardShell><div className="elegant-application application-confirmation">
      <section className="application-layout student-shell">
        <Stepper step={3} />
        <article className="application-card exam-workflow"><div className="application-intro"><span className="confirmation-kicker">FINAL REVIEW</span><h1>Confirm Your Application</h1><p>Review your details and selected examinations before submitting.</p></div>
          
          <dl className="exam-review-details">
            <div>
              <dt>Student</dt>
              <dd>
                {profile.firstName} {profile.lastName}
              </dd>
            </div>
            <div>
              <dt>Student ID</dt>
              <dd>{profile.candidateId}</dd>
            </div>
            <div>
              <dt>Preferred Medium</dt>
              <dd>{draft.preferredMedium}</dd>
            </div>
            <div><dt>Preferred Examination Location</dt><dd>{draft.preferredLocation || "Not selected"}</dd></div>
          </dl>
          <h2>Selected Subjects and Levels</h2>
          {draft.subjects.map((s) => (
            <article className="exam-selection-card" key={s}>
              <div>
                <span className="confirmation-field-label">Subject</span><h3>{s}</h3>
                <span className="confirmation-field-label">Selected Level(s)</span><p className="confirmation-selected-levels">{draft.subjectSelections[s]?.grades?.join(", ") || "No level selected"}</p>
              </div>
              <div>
                <strong>{draft.subjectSelections[s]?.teacher}</strong>
                <small>{draft.subjectSelections[s]?.teacherSchool}</small>
              </div>
            </article>
          ))}
          <p className="exam-notice">
            Your application will be pending teacher approval. Examination
            access opens only after all required items are approved. Fees are
            handled through your school.
          </p>
          {(error || serverError) && (
            <p className="student-error" role="alert">
              {error || serverError}
            </p>
          )}
          <div className="application-buttons">
            <button
              disabled={busy}
              className="student-outline-btn"
              onClick={() => navigate("/student/application/selection")}
            >
              Edit Application
            </button>
            <button
              disabled={
                busy || !catalog || !!deadlineError(catalog.config.session)
              }
              className="student-gold-btn"
              onClick={submit}
            >
              {busy ? "Submitting…" : "Submit Application"}
            </button>
          </div>
        </article>
      </section>
    </div></PracticeDashboardShell>
  );
}
