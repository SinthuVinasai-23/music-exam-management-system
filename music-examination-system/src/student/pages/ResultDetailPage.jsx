import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Award, Download, UserRound, FileText, CalendarDays, GraduationCap } from "lucide-react";
import { StudentShell } from "../components/StudentLayout.jsx";
import { useStudent } from "../context/StudentContext.jsx";
import { makePdfDownload } from "../utils.js";
export default function ResultDetailPage() {
  const { resultId } = useParams(),
    navigate = useNavigate(),
    { profile } = useStudent();
  const result = profile.results?.find((r) => r.id === resultId);
  return (
    <StudentShell className="result-detail-reference-page">
      <main className="student-shell learning-content">
        <button
          className="student-outline-btn compact"
          onClick={() => navigate("/student/results")}
        >
          <ArrowLeft size={17} />
          Back to Results
        </button>
        {!result ? (
          <section className="learning-account-card">
            <h1>Result unavailable</h1>
            <p>This result is not available for the selected student.</p>
          </section>
        ) : (
          <section className="learning-account-card student-result-detail">
            <div className="result-detail-heading"><span className="result-record-label">PUBLISHED ACADEMIC RECORD</span><h1>Examination Results</h1><p>Your published examination assessment and examiner feedback.</p></div>
            <div className="result-candidate-strip"><span className="result-avatar"><UserRound size={42}/></span><div><h2>{profile.name}</h2><p><GraduationCap size={17}/>{result.subject} · {result.grade} <CalendarDays size={16}/>{result.date}</p><small>Student ID: {profile.candidateId}</small></div><div className="student-final-score"><small>FINAL GRADE</small><strong>{result.score}</strong><span>{result.classification}</span></div></div>
            <div className="result-breakdown-layout"><div className="result-breakdown-left"><section className="result-assessment-panel"><h2>Technical</h2><span className="learning-eyebrow">TECHNICAL ASSESSMENT</span><p>{result.technicalFeedback || "A separate technical breakdown was not recorded for this result."}</p></section><section className="result-assessment-panel"><h2>Supporting Tests</h2><span className="learning-eyebrow">AURAL & SIGHT READING</span><p>{result.supportingFeedback || "Supporting test marks were not recorded separately."}</p></section></div><div className="result-breakdown-right"><section className="result-assessment-panel"><h2>Performance Repertoire</h2><span className="learning-eyebrow">CORE ASSESSMENT</span><dl className="exam-review-details"><div><dt>Final Score</dt><dd>{result.score}/100</dd></div><div><dt>Classification</dt><dd>{result.classification}</dd></div><div><dt>Published</dt><dd>{result.date}</dd></div></dl></section><section className="student-examiner-feedback"><h2><FileText size={22}/>Examiner’s Narrative</h2><p>{result.feedback || "No additional feedback was recorded."}</p></section></div></div>
            <button
              className="student-gold-btn compact"
              onClick={() =>
                makePdfDownload(result.id + "-result.pdf", [
                  "Examination Result",
                  profile.name,
                  "Student ID: " + profile.candidateId,
                  result.subject + " - " + result.grade,
                  "Score: " + result.score + "/100",
                  result.classification,
                  result.date,
                  result.feedback || "",
                ])
              }
            >
              <Download size={16} />
              Download Result PDF
            </button>
          </section>
        )}
      </main>
    </StudentShell>
  );
}
