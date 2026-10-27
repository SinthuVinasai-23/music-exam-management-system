import { assignedSubjectTeachers, teachersForSubject } from '../data/studentData.js';
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, X, LockKeyhole, CalendarDays } from "lucide-react";
import { Stepper, StudentShell } from "../components/StudentLayout.jsx";
import { useStudent } from "../context/StudentContext.jsx";
import { deadlineError } from "../rules.js";
import "../../styles/exam-applications.css";
export function Deadline({ config }) {
  const session = config?.session;
  if (!session) return null;
  const closed = deadlineError(session);
  const soon =
    !closed && Date.parse(session.deadline) - Date.now() < 7 * 86400000;
  return (
    <div className="exam-deadline">
      <CalendarDays size={23} />
      <div>
        <small>APPLICATION DEADLINE</small>
        <strong>
          {new Date(session.deadline).toLocaleString(undefined, {
            dateStyle: "long",
            timeStyle: "short",
          })}
        </strong>
        <small>{session.name}</small>
      </div>
      <span
        className={`exam-badge ${closed ? "closed" : soon ? "soon" : "approved"}`}
      >
        {closed ? "Closed" : soon ? "Closing Soon" : "Open"}
      </span>
      {closed && <p role="alert">{closed}</p>}
    </div>
  );
}
export default function ApplicationSelection() {
  const { draft, dispatch, catalog, serverError } = useStudent(),
    navigate = useNavigate();
  const [modal, setModal] = useState(false),
    [subjectId, setSubjectId] = useState(""),
    [teacherId, setTeacherId] = useState(""),
    [grades, setGrades] = useState([]),
    [error, setError] = useState("");
  const addRef = useRef(),
    dialogRef = useRef();
  const subject = catalog?.subjects.find((s) => s.id === subjectId),
    closed = catalog && deadlineError(catalog.config.session);
  const update = (patch) => dispatch({ type: "UPDATE_DRAFT", patch });
  const remove = (name, grade) => {
    const selections = { ...draft.subjectSelections };
    if (grade) {
      selections[name] = {
        ...selections[name],
        grades: selections[name].grades.filter((g) => g !== grade),
      };
      if (selections[name].grades.length) {
        update({ subjectSelections: selections });
        return;
      }
    }
    delete selections[name];
    update({
      subjects: draft.subjects.filter((s) => s !== name),
      subjectSelections: selections,
    });
  };
  useEffect(() => {
    if (!modal) return;
    const previous = document.activeElement;
    dialogRef.current?.querySelector("select")?.focus();
    const key = (e) => {
      if (e.key === "Escape") {
        setModal(false);
        previous?.focus();
      }
      if (e.key === "Tab") {
        const focusable = [
          ...dialogRef.current.querySelectorAll(
            "button:not(:disabled),select,input:not(:disabled)",
          ),
        ];
        const first = focusable[0],
          last = focusable.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [modal]);
  function add() {
    if (!subject || !teacherId || !grades.length) {
      setError(
        "Choose a subject, at least one eligible examination and a teacher.",
      );
      return;
    }
    if (draft.subjects.includes(subject.name)) {
      setError(
        "This subject is already selected. Remove or edit its selection first.",
      );
      return;
    }
    const teacher = catalog.teachers.find((t) => t.id === teacherId);
    update({
      subjects: [...draft.subjects, subject.name],
      subjectSelections: {
        ...draft.subjectSelections,
        [subject.name]: {
          grades,
          teacherId,
          teacher: teacher.name,
          teacherSchool: teacher.school,
        },
      },
    });
    setModal(false);
    setError("");
  }
  return (
    <StudentShell className="elegant-application application-selection">

      <section className="application-layout student-shell">
        <Stepper step={2} />
        <form
          className="application-card exam-workflow"
          onSubmit={(e) => {
            e.preventDefault();
            if (!catalog || closed) {
              setError(closed || "Wait for current eligibility to load.");
              return;
            }
            if (!draft.subjects.length || !draft.preferredMedium) {
              setError(
                "Choose a preferred medium and add at least one subject.",
              );
              return;
            }
            navigate("/student/application/confirmation");
          }}
        >
          
          {serverError && <p role="alert">{serverError}</p>}
          <fieldset disabled={!catalog || !!closed}>
            <legend className="preferred-medium-title">Preferred Medium</legend>
            <p className="exam-muted">
              Your selected medium applies to every examination in this
              submission.
            </p>
            <div className="exam-medium exam-medium-compact">
              {["Tamil", "English"].map((m) => (
                <label
                  key={m}
                  className={draft.preferredMedium === m ? "selected" : ""}
                >
                  <input
                    type="radio"
                    name="medium"
                    value={m}
                    checked={draft.preferredMedium === m}
                    onChange={() => update({ preferredMedium: m })}
                  />
                  {m}
                </label>
              ))}
            </div>

            <div className="exam-section-heading">
              <div>
                <h2>Select Subjects &amp; Grades</h2>
                <p className="exam-muted">
                  Multiple eligible examinations through Grade 3. One next
                  examination per subject after Grade 3.
                </p>
              </div>
              <button
                ref={addRef}
                type="button"
                className="student-gold-btn compact"
                onClick={() => {
                  setSubjectId("");
                  setGrades([]);
                  setTeacherId("");
                  setError("");
                  setModal(true);
                }}
              >
                <Plus size={18} /> Add Subject
              </button>
            </div>
            <h3>
              Selected Applications <small>({draft.subjects.length})</small>
            </h3>
            <div className="exam-selected-list">
              {draft.subjects.map((name) => {
                const choice = draft.subjectSelections[name];
                return (
                  <article className="exam-selection-card" key={name}>
                    <div>
                      <h3>{name}</h3>
                      <div className="exam-grade-chips">
                        {choice.grades.map((g) => (
                          <button
                            type="button"
                            key={g}
                            aria-label={`Remove ${name} ${g}`}
                            onClick={() => remove(name, g)}
                          >
                            {g}
                            <X size={14} />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <strong>{choice.teacher}</strong>
                      <small>{choice.teacherSchool}</small>
                    </div>
                    <button
                      type="button"
                      className="exam-remove"
                      aria-label={`Remove ${name}`}
                      onClick={() => remove(name)}
                    >
                      <X size={18} />
                      <span>Remove</span>
                    </button>
                  </article>
                );
              })}
              {!draft.subjects.length && (
                <div className="exam-empty">
                  <Plus size={26} />
                  <p>
                    Add your first subject to choose eligible examinations and a
                    teacher.
                  </p>
                </div>
              )}
            </div>
          </fieldset>
          {error && !modal && (
            <p className="student-error" role="alert">
              {error}
            </p>
          )}
          <div className="application-buttons">
            <button
              type="button"
              className="student-outline-btn"
              onClick={() => navigate("/student/application")}
            >
              Back
            </button>
            <button
              disabled={!catalog || !!closed}
              className="student-gold-btn"
            >
              Review Application
            </button>
          </div>
        </form>
      </section>
      {modal && (
        <div
          className="exam-dialog-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModal(false);
          }}
        >
          <section
            ref={dialogRef}
            className="exam-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-subject-title"
          >
            <div className="exam-section-heading">
              <h2 id="add-subject-title">Add Subject</h2>
              <button
                type="button"
                className="exam-remove"
                aria-label="Close Add Subject"
                onClick={() => setModal(false)}
              >
                <X />
              </button>
            </div>
            <label htmlFor="exam-subject">Subject</label>
            <select
              id="exam-subject"
              value={subjectId}
              onChange={(e) => {
                setSubjectId(e.target.value);
                setGrades([]);
                setTeacherId(assignedSubjectTeachers[e.target.value]?.id || "");
              }}
            >
              <option value="">Choose a subject</option>
              {catalog.subjects.map((s) => (
                <option
                  key={s.id}
                  value={s.id}
                  disabled={draft.subjects.includes(s.name)}
                >
                  {s.name}
                  {draft.subjects.includes(s.name) ? " — already selected" : ""}
                </option>
              ))}
            </select>
            {subject && (
              <>
                <fieldset className="exam-grade-options">
                  <legend>Grade / Level</legend>
                  {subject.grades.map((g) => (
                    <label
                      className={!g.eligible ? "unavailable" : ""}
                      key={g.grade}
                    >
                      <input
                        type="checkbox"
                        disabled={!g.eligible || !!closed}
                        checked={grades.includes(g.grade)}
                        onChange={() =>
                          setGrades(
                            grades.includes(g.grade)
                              ? grades.filter((x) => x !== g.grade)
                              : [...grades, g.grade],
                          )
                        }
                      />
                      <span>
                        <strong>{g.grade}</strong>
                        {g.reason && (
                          <small>
                            <LockKeyhole size={12} />
                            {g.reason}
                          </small>
                        )}
                      </span>
                    </label>
                  ))}
                </fieldset>
                <label htmlFor="exam-teacher">Teacher</label>
                <select
                  id="exam-teacher"
                  value={teacherId}
                  onChange={(e) => setTeacherId(e.target.value)}
                >
                  <option value="">Choose your teacher and school</option>
                  {teachersForSubject(catalog.teachers, subject.id).map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} — {t.school}
                      </option>
                    ))}
                </select>
                {teacherId && (
                  <p className="exam-teacher">
                    <strong>
                      {catalog.teachers.find((t) => t.id === teacherId).name}
                    </strong>
                    <small>
                      {catalog.teachers.find((t) => t.id === teacherId).school}
                    </small>
                  </p>
                )}
              </>
            )}
            {error && (
              <p className="student-error" role="alert">
                {error}
              </p>
            )}
            <div className="application-buttons">
              <button
                type="button"
                className="student-outline-btn"
                onClick={() => setModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!!closed}
                className="student-gold-btn"
                onClick={add}
              >
                Add to Application
              </button>
            </div>
          </section>
        </div>
      )}
    </StudentShell>
  );
}

