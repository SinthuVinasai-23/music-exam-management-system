import LearningAdmin from "./LearningAdmin.jsx";
import { useEffect, useState } from "react";
import { authSession, portalRequest } from "../auth/api.js";
import { statusLabel } from "../student/pages/RegistryPage.jsx";
import { gradeOrder } from "../student/rules.js";
import "../styles/exam-applications.css";
export default function ExamManagement({ admin = false }) {
  const [user, setUser] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [records, setRecords] = useState([]),
    [config, setConfig] = useState(null),
    [directory, setDirectory] = useState({
      students: [],
      subjects: [],
      teachers: [],
    }),
    [filters, setFilters] = useState({}),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [notes, setNotes] = useState({}),
    [assignments, setAssignments] = useState({});
  const [progress, setProgress] = useState({
    studentId: "",
    subjectId: "piano",
    grade: "Grade 1",
    passed: false,
    syllabusCompleted: false,
    resultStatus: "",
  });
  const allowed = user?.role === (admin ? "admin" : "teacher");
  async function load() {
    try {
      const query = new URLSearchParams(filters);
      const result = await portalRequest("applications?" + query);
      setRecords(result.applications);
      setError("");
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    authSession()
      .then((s) => setUser(s.user))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    if (!allowed) return;
    load();
    portalRequest("students")
      .then(setDirectory)
      .catch((e) => setError(e.message));
    if (admin)
      portalRequest("config")
        .then(setConfig)
        .catch((e) => setError(e.message));
    const timer = setInterval(load, 10000);
    return () => clearInterval(timer);
  }, [allowed, JSON.stringify(filters)]);
  useEffect(() => {
    const student = directory.students.find(
        (s) => s.student_id === progress.studentId,
      ),
      subject = directory.subjects.find((s) => s.id === progress.subjectId),
      row = student?.subjectProgress?.[subject?.name]?.records?.find(
        (r) => r.grade === progress.grade,
      );
    setProgress((p) => ({
      ...p,
      passed: !!row?.passed,
      syllabusCompleted: !!row?.syllabus,
      resultStatus: row?.result_status || "",
    }));
  }, [progress.studentId, progress.subjectId, progress.grade, directory]);
  async function act(task) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await task();
      setMessage("Saved successfully.");
      await load();
      if (allowed) setDirectory(await portalRequest("students"));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const localTime = (value) => {
    if (!value || !Number.isFinite(Date.parse(value))) return "";
    const date = new Date(value);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  };
  if (loading) return <p role="status">Loading staff accountâ€¦</p>;
  if (!allowed)
    return (
      <section className="exam-workflow exam-staff-login">
        <h2>{admin ? "Admin" : "Teacher"} Exam Applications</h2>
        <p>Sign in with your assigned staff account.</p>
        {user && (
          <p>
            Currently signed in as {user.name}. Use the appropriate staff
            credentials to continue.
          </p>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            act(async () => {
              const session = await portalRequest("staff-login", {
                email,
                password,
              });
              if (session.user.role !== (admin ? "admin" : "teacher"))
                throw new Error(
                  "This account does not have the required role.",
                );
              setUser(session.user);
              if (session.user.role === "teacher")
                sessionStorage.setItem("teacher-demo-auth", "active");
            });
          }}
        >
          <label>
            Email
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            Password
            <input
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error && <p role="alert">{error}</p>}
          <button className="student-gold-btn" disabled={busy}>
            Sign in
          </button>
        </form>
      </section>
    );
  return (
    <div className="exam-workflow">
      <div className="exam-staff-header">
        
        <div>
          <h1>{admin ? "Examination Administration" : "Exam Applications"}</h1>
          <p>
            {user.name} Â·{" "}
            {admin
              ? "Manage deadlines, eligibility and routing."
              : "Review only the examinations assigned to your account."}
          </p>
        </div>
        <button
          className="student-outline-btn compact"
          onClick={() =>
            act(async () => {
              await portalRequest("logout", {});
              setUser(null);
            })
          }
        >
          Sign out
        </button>
      </div>
      {error && (
        <p className="student-error" role="alert">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      {admin && (
        <div className="exam-admin-grid">
          {config && (
            <form
              className="application-card exam-admin-form"
              onSubmit={(e) => {
                e.preventDefault();
                act(() => portalRequest("config", config, "PUT"));
              }}
            >
              <h2>Application Window</h2>
              <label>
                Session Name
                <input
                  required
                  value={config.session.name}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      session: { ...config.session, name: e.target.value },
                    })
                  }
                />
              </label>
              <label>
                Opening Date
                <input
                  required
                  type="datetime-local"
                  value={localTime(config.session.openingDate)}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      session: {
                        ...config.session,
                        openingDate: e.target.value
                          ? new Date(e.target.value).toISOString()
                          : "",
                      },
                    })
                  }
                />
              </label>
              <label>
                Application Deadline
                <input
                  required
                  type="datetime-local"
                  value={localTime(config.session.deadline)}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      session: {
                        ...config.session,
                        deadline: e.target.value
                          ? new Date(e.target.value).toISOString()
                          : "",
                      },
                    })
                  }
                />
              </label>
              <button disabled={busy} className="student-gold-btn compact">
                Save Configuration
              </button>
            </form>
          )}
          <form
            className="application-card exam-admin-form"
            onSubmit={(e) => {
              e.preventDefault();
              act(() => portalRequest("progress", progress, "PUT"));
            }}
          >
            <h2>Student Eligibility</h2>
            <p className="exam-muted">
              Record each examination independently. Successful results
              establish progression; confirmed syllabus completion enables
              selection.
            </p>
            <label>
              Student
              <select
                required
                value={progress.studentId}
                onChange={(e) =>
                  setProgress({ ...progress, studentId: e.target.value })
                }
              >
                <option value="">Select student</option>
                {directory.students.map((s) => (
                  <option key={s.id} value={s.student_id}>
                    {s.student_id} â€” {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Subject
              <select
                value={progress.subjectId}
                onChange={(e) =>
                  setProgress({ ...progress, subjectId: e.target.value })
                }
              >
                {directory.subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Grade / Level
              <select
                value={progress.grade}
                onChange={(e) =>
                  setProgress({ ...progress, grade: e.target.value })
                }
              >
                {gradeOrder.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
            </label>
            <label>
              <input
                type="checkbox"
                checked={progress.syllabusCompleted}
                onChange={(e) =>
                  setProgress({
                    ...progress,
                    syllabusCompleted: e.target.checked,
                  })
                }
              />{" "}
              Syllabus completed
            </label>
            <label>
              <input
                type="checkbox"
                checked={progress.passed}
                onChange={(e) =>
                  setProgress({ ...progress, passed: e.target.checked })
                }
              />{" "}
              Successfully completed / passed
            </label>
            <label>
              Result Status
              <select
                value={progress.resultStatus}
                onChange={(e) =>
                  setProgress({ ...progress, resultStatus: e.target.value })
                }
              >
                <option value="">No pending result</option>
                <option value="pending">Pending</option>
                <option value="withheld">Withheld</option>
                <option value="passed">Passed</option>
                <option value="failed">Failed</option>
              </select>
            </label>
            <button disabled={busy} className="student-gold-btn compact">
              Save Eligibility
            </button>
          </form>
        </div>
      )}
      {admin && <section className="application-card"><h2>Student Name Change Requests</h2>
        {!directory.students.some(s=>s.nameChangeRequest?.status==='pending') && <p>No pending name changes.</p>}
        {directory.students.filter(s=>s.nameChangeRequest?.status==='pending').map(s=><article key={s.student_id} className="exam-item-row"><div><strong>{s.name} · {s.student_id}</strong><p>Requested: {s.nameChangeRequest.firstName} {s.nameChangeRequest.lastName}</p></div><div className="exam-actions">{['approved','rejected'].map(status=><button key={status} disabled={busy} className="student-outline-btn compact" onClick={()=>act(()=>portalRequest('name-change',{studentId:s.student_id,status},'PATCH'))}>{status==='approved'?'Approve Name Change':'Reject Name Change'}</button>)}</div></article>)}
      </section>}
      {admin && <LearningAdmin />}
      <h2>Examination Applications</h2>
      {admin && (
        <div className="exam-filters">
          {[
            "student",
            "studentId",
            "subject",
            "grade",
            "teacher",
            "school",
            "medium",
            "status",
          ].map((key) => (
            <label key={key}>
              {{ studentId: "Student ID", medium: "Preferred Medium" }[key] ||
                key[0].toUpperCase() + key.slice(1)}
              <input
                placeholder="Filterâ€¦"
                value={filters[key] || ""}
                onChange={(e) =>
                  setFilters({ ...filters, [key]: e.target.value })
                }
              />
            </label>
          ))}
        </div>
      )}
      <div className="exam-selected-list">
        {records.map((app) => (
          <article className="application-card exam-record" key={app.id}>
            <div className="exam-section-heading">
              <div>
                <h3>
                  {app.id} Â· {app.candidateName}
                </h3>
                <small>
                  {app.studentId} Â· {app.preferredMedium} Â·{" "}
                  {new Date(app.applicationDate).toLocaleString()}
                </small>
              </div>
              <span className={`exam-badge ${app.applicationStatus}`}>
                {statusLabel(app.applicationStatus)}
              </span>
            </div>
            {app.entries.map((item) => (
              <section key={item.id}>
                <div className="exam-item-row">
                  <div>
                    <strong>
                      {item.subject} Â· {item.grade}
                    </strong>
                    <small>{item.teacher}</small>
                    <small>{item.teacherSchool}</small>
                  </div>
                  <div>
                    <span className={`exam-badge ${item.approvalStatus}`}>
                      {statusLabel(item.approvalStatus)}
                    </span>
                    {item.reviewNote && <p>{item.reviewNote}</p>}
                  </div>
                  <div>
                    {admin ? (
                      <>
                        <label>
                          Reassign Teacher
                          <select
                            value={assignments[item.id] || item.teacherId}
                            onChange={(e) =>
                              setAssignments({
                                ...assignments,
                                [item.id]: e.target.value,
                              })
                            }
                          >
                            {directory.teachers.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name} â€” {t.school}
                              </option>
                            ))}
                          </select>
                        </label>
                        <button
                          disabled={busy}
                          className="student-outline-btn compact"
                          onClick={() =>
                            act(() =>
                              portalRequest(
                                "items/" + item.id,
                                {
                                  teacherId:
                                    assignments[item.id] || item.teacherId,
                                },
                                "PATCH",
                              ),
                            )
                          }
                        >
                          Save Routing
                        </button>
                      </>
                    ) : (
                      <>
                        <label>
                          Review note
                          <textarea
                            aria-label={`Review note for ${item.subject} ${item.grade}`}
                            value={notes[item.id] || ""}
                            onChange={(e) =>
                              setNotes({ ...notes, [item.id]: e.target.value })
                            }
                          />
                        </label>
                        <div className="exam-review-controls">
                          {["approved", "changes-required", "rejected"].map(
                            (status) => (
                              <button
                                disabled={busy}
                                className={
                                  status === "approved"
                                    ? "student-gold-btn compact"
                                    : "student-outline-btn compact"
                                }
                                key={status}
                                onClick={() =>
                                  act(() =>
                                    portalRequest(
                                      "items/" + item.id,
                                      { status, note: notes[item.id] || "" },
                                      "PATCH",
                                    ),
                                  )
                                }
                              >
                                {statusLabel(status)}
                              </button>
                            ),
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </section>
            ))}
          </article>
        ))}
        {!records.length && (
          <p className="exam-empty">No applications match this view.</p>
        )}
      </div>
    </div>
  );
}
