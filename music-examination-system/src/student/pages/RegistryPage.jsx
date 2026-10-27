import {BookOpen, FileText, CircleHelp} from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { StudentShell } from "../components/StudentLayout.jsx";
import { useStudent } from "../context/StudentContext.jsx";
import {
  applicationPdfUrl,
  saveApplication,
  printApplication,
} from "../applicationDocument.js";
import "../../styles/exam-applications.css";
export const statusLabel = (status) =>
  ({
    pending: "Pending Teacher Approval",
    approved: "Approved",
    rejected: "Rejected",
    "changes-required": "Changes Required",
  })[status] || status;
export function ApplicationCards({ applications }) {
  return <div className="exam-selected-list registry-simple-list">{applications.map(app=><article className="registry-simple-row" key={app.id}>
    <div className="registry-student"><strong>{app.candidateName}</strong><small>Student ID: {app.studentId}</small><small>{app.id}</small></div>
    <div className="registry-subjects">{app.entries.map((entry,i)=><p key={entry.id||i}><strong>{entry.subject}</strong><span>{entry.grade}</span></p>)}</div>
    <span className={`exam-badge ${app.applicationStatus}`}>{statusLabel(app.applicationStatus)}</span>
    {app.admissionAvailable?<a className="student-gold-btn compact" href={`/api/portal/applications/${encodeURIComponent(app.id)}/admission?download=1`}>Download Admission Card</a>:<button className="student-outline-btn compact" disabled>Admission Card Awaiting Approval</button>}
  </article>)}{!applications.length&&<p className="exam-empty">No examination applications yet.</p>}</div>;
}
export default function RegistryPage() {
  const { applications, serverError } = useStudent(),
    navigate = useNavigate(),
    [params] = useSearchParams();
  const submitted = applications.find((a) => a.id === params.get("submitted"));
  return (
    <StudentShell>

      <section className="student-shell exam-workflow">
        {serverError && <p role="alert">{serverError}</p>}
        {submitted && (
          <article className="application-card exam-success">
            <h2>{submitted.id}</h2>
            <span className={`exam-badge ${submitted.applicationStatus}`}>
              {statusLabel(submitted.applicationStatus)}
            </span>
            <div className="exam-actions">
              <a
                className="student-gold-btn"
                href={applicationPdfUrl(submitted)}
                target="_blank"
                rel="noreferrer"
              >
                View / Download Application PDF
              </a>
              <button
                className="student-outline-btn"
                onClick={() => printApplication(submitted)}
              >
                Print Application
              </button>
              <button
                className="student-outline-btn"
                onClick={() => navigate("/student/dashboard")}
              >
                Return to Dashboard
              </button>
            </div>
          </article>
        )}
        <ApplicationCards applications={applications} />
      </section>
    </StudentShell>
  );
}
