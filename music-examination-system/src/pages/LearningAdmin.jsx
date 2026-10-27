import { useEffect, useState } from "react";
import { portalRequest } from "../auth/api.js";
import { gradeOrder } from "../student/rules.js";
import "../styles/learning.css";
const blankQuestion = () => ({
  subjectId: "piano",
  grade: "Level 1",
  english: {
    question: "",
    instructions: "Choose the best answer.",
    options: ["", ""],
    explanation: "",
  },
  tamil: {
    question: "",
    instructions: "சிறந்த விடையைத் தேர்ந்தெடுக்கவும்.",
    options: ["", ""],
    explanation: "",
  },
  answerIndex: 0,
  active: true,
});
export default function LearningAdmin() {
  const [subjects, setSubjects] = useState([]),
    [students, setStudents] = useState([]),
    [subject, setSubject] = useState(null),
    [about, setAbout] = useState(null),
    [preview, setPreview] = useState(false),
    [questions, setQuestions] = useState([]),
    [question, setQuestion] = useState(blankQuestion),
    [bankSubject, setBankSubject] = useState("piano"),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [stage, setStage] = useState({
      studentId: "",
      subjectId: "piano",
      grade: "Level 1",
    }),
    [result, setResult] = useState({
      studentId: "",
      subjectId: "piano",
      grade: "Level 1",
      score: 0,
      status: "published",
      feedback: "",
    });
  async function load() {
    const [catalog, content, directory] = await Promise.all([
      portalRequest("subjects?all=1"),
      portalRequest("about"),
      portalRequest("students"),
    ]);
    setSubjects(catalog.subjects);
    setAbout((current) => current || content);
    setStudents(directory.students);
    setSubject((s) => s || catalog.subjects[0]);
  }
  async function bank() {
    const result = await portalRequest("questions?subjectId=" + bankSubject);
    setQuestions(result.questions);
  }
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    bank().catch((e) => setError(e.message));
  }, [bankSubject]);
  async function save(task, after) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await task();
      if (after) await after();
      setMessage("Content saved successfully.");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const options = (key, choices) =>
    choices.map(([id, label]) => (
      <option key={id} value={id}>
        {label}
      </option>
    ));
  const subjectOptions = () =>
    options(
      "subjects",
      subjects.map((s) => [s.id, s.name]),
    );
  const studentOptions = () => [
    <option value="" key="empty">
      Select student
    </option>,
    ...students.map((s) => (
      <option key={s.student_id} value={s.student_id}>
        {s.student_id} — {s.name}
      </option>
    )),
  ];
  function editQuestion(q) {
    setQuestion({
      ...q,
      subjectId: q.subject_id || q.subjectId,
      answerIndex: q.answer_index ?? q.answerIndex,
      english: q.english || blankQuestion().english,
      tamil: q.tamil || blankQuestion().tamil,
    });
  }
  function updateTranslation(language, field, value) {
    setQuestion((q) => ({
      ...q,
      [language]: { ...q[language], [field]: value },
    }));
  }
  return (
    <section className="learning-admin">
      <div className="learning-heading">
        <div>
          <span className="learning-eyebrow">CURRICULUM &amp; WEBSITE</span>
          <h2>Learning &amp; Content Management</h2>
          <p>
            Changes are stored in the database and appear on student and public
            pages.
          </p>
        </div>
      </div>
      {message && <p role="status">{message}</p>}
      {error && (
        <p className="student-error" role="alert">
          {error}
        </p>
      )}
      <details className="learning-admin-panel" open>
        <summary>Subject Content</summary>
        {subject && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save(async () => {
                await portalRequest(
                  subject._new ? "subjects" : "subjects/" + subject.id,
                  subject,
                  subject._new ? "POST" : "PUT",
                );
                setSubject(null);
              }, load);
            }}
          >
            <div className="learning-admin-toolbar">
              <label>
                Edit Subject
                <select
                  aria-label="Edit Subject"
                  value={subject._new ? "" : subject.id}
                  onChange={(e) =>
                    setSubject(subjects.find((s) => s.id === e.target.value))
                  }
                >
                  <option value="" disabled>
                    New subject
                  </option>
                  {subjectOptions()}
                </select>
              </label>
              <button
                type="button"
                className="student-outline-btn compact"
                onClick={() =>
                  setSubject({
                    _new: true,
                    id: "",
                    name: "",
                    introduction: "",
                    image: "/subjects/piano.svg",
                    active: true,
                  })
                }
              >
                Add Subject Content
              </button>
            </div>
            {subject._new && (
              <label>
                Subject ID
                <input
                  required
                  pattern="[a-z0-9-]+"
                  value={subject.id}
                  onChange={(e) =>
                    setSubject({ ...subject, id: e.target.value })
                  }
                />
              </label>
            )}
            <label>
              Subject Name
              <input
                required
                value={subject.name}
                onChange={(e) =>
                  setSubject({ ...subject, name: e.target.value })
                }
              />
            </label>
            <label>
              Subject Introduction
              <textarea
                required
                value={subject.introduction}
                onChange={(e) =>
                  setSubject({ ...subject, introduction: e.target.value })
                }
              />
            </label>
            <label>
              Subject Image URL
              <input
                required
                value={subject.image}
                onChange={(e) =>
                  setSubject({ ...subject, image: e.target.value })
                }
              />
            </label>
            <label className="learning-checkbox">
              <input
                type="checkbox"
                checked={subject.active}
                onChange={(e) =>
                  setSubject({ ...subject, active: e.target.checked })
                }
              />
              Active subject
            </label>
            <div className="learning-subject-preview">
              <img
                src={subject.image}
                alt={`${subject.name || "Subject"} preview`}
              />
              <div>
                <h3>{subject.name || "Subject preview"}</h3>
                <p>{subject.introduction}</p>
              </div>
            </div>
            <button disabled={busy} className="student-gold-btn compact">
              Save Subject
            </button>
          </form>
        )}
      </details>
      <details className="learning-admin-panel">
        <summary>About Us Editor</summary>
        {about && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save(() => portalRequest("about", about, "PUT"));
            }}
          >
            <label>
              About Title
              <input
                required
                value={about.title}
                onChange={(e) => setAbout({ ...about, title: e.target.value })}
              />
            </label>
            <label>
              About Main Content
              <textarea
                required
                value={about.content}
                onChange={(e) =>
                  setAbout({ ...about, content: e.target.value })
                }
              />
            </label>
            <label>
              About Image URL
              <input
                required
                value={about.image}
                onChange={(e) => setAbout({ ...about, image: e.target.value })}
              />
            </label>
            {about.sections.map((s, i) => (
              <div key={i} className="learning-admin-section">
                <label>
                  Section {i + 1} Title
                  <input
                    value={s.title}
                    onChange={(e) =>
                      setAbout({
                        ...about,
                        sections: about.sections.map((section, index) =>
                          index === i
                            ? { ...section, title: e.target.value }
                            : section,
                        ),
                      })
                    }
                  />
                </label>
                <label>
                  Section {i + 1} Content
                  <textarea
                    value={s.content}
                    onChange={(e) =>
                      setAbout({
                        ...about,
                        sections: about.sections.map((section, index) =>
                          index === i
                            ? { ...section, content: e.target.value }
                            : section,
                        ),
                      })
                    }
                  />
                </label>
                <button
                  type="button"
                  className="student-outline-btn compact"
                  onClick={() =>
                    setAbout({
                      ...about,
                      sections: about.sections.filter(
                        (_, index) => index !== i,
                      ),
                    })
                  }
                >
                  Remove Section {i + 1}
                </button>
              </div>
            ))}
            <div className="exam-actions">
              <button
                type="button"
                disabled={about.sections.length >= 8}
                className="student-outline-btn compact"
                onClick={() =>
                  setAbout({
                    ...about,
                    sections: [...about.sections, { title: "", content: "" }],
                  })
                }
              >
                Add About Section
              </button>
              <button
                type="button"
                className="student-outline-btn compact"
                onClick={() => setPreview(!preview)}
              >
                Preview About Us
              </button>
              <button disabled={busy} className="student-gold-btn compact">
                Save About Us
              </button>
            </div>
            {preview && (
              <article className="learning-about-preview">
                <img src={about.image} alt="About Us preview" />
                <h2>{about.title}</h2>
                <p>{about.content}</p>
                {about.sections.map((s, i) => (
                  <section key={i}>
                    <h3>{s.title}</h3>
                    <p>{s.content}</p>
                  </section>
                ))}
              </article>
            )}
          </form>
        )}
      </details>
      <details className="learning-admin-panel">
        <summary>Bilingual Question Bank</summary>
        <label>
          Question Bank Subject
          <select
            aria-label="Question Bank Subject"
            value={bankSubject}
            onChange={(e) => setBankSubject(e.target.value)}
          >
            {subjectOptions()}
          </select>
        </label>
        <div className="learning-bank-list">
          {questions.map((q) => (
            <button type="button" key={q.id} onClick={() => editQuestion(q)}>
              <strong>{q.grade}</strong>
              <span>{q.english?.question || q.tamil?.question}</span>
              <small>
                {!q.tamil
                  ? "Tamil translation missing"
                  : !q.english
                    ? "English translation missing"
                    : "English + Tamil"}{" "}
                · {q.active ? "Active" : "Inactive"}
              </small>
            </button>
          ))}
        </div>
        <button
          className="student-outline-btn compact"
          type="button"
          onClick={() =>
            setQuestion({ ...blankQuestion(), subjectId: bankSubject })
          }
        >
          New Question
        </button>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save(async () => {
              await portalRequest(
                question.id ? "questions/" + question.id : "questions",
                {
                  ...question,
                  english: question.english.question.trim()
                    ? question.english
                    : null,
                  tamil: question.tamil.question.trim() ? question.tamil : null,
                },
                question.id ? "PUT" : "POST",
              );
              setQuestion({ ...blankQuestion(), subjectId: bankSubject });
            }, bank);
          }}
        >
          <div className="learning-editor-grid">
            <label>
              Question Subject
              <select
                aria-label="Question Subject"
                value={question.subjectId}
                onChange={(e) =>
                  setQuestion({ ...question, subjectId: e.target.value })
                }
              >
                {subjectOptions()}
              </select>
            </label>
            <label>
              Question Grade
              <select
                aria-label="Question Grade"
                value={question.grade}
                onChange={(e) =>
                  setQuestion({ ...question, grade: e.target.value })
                }
              >
                {gradeOrder.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="learning-editor-grid">
            {["english", "tamil"].map((language) => (
              <fieldset key={language}>
                <legend>
                  {language === "english" ? "English Content" : "Tamil Content"}
                </legend>
                {!question[language].question.trim() && (
                  <p className="learning-translation-warning">
                    {language === "tamil"
                      ? "Tamil translation missing"
                      : "English translation missing"}
                  </p>
                )}
                <label>
                  {language === "english"
                    ? "English Question"
                    : "Tamil Question"}
                  <textarea
                    value={question[language].question}
                    onChange={(e) =>
                      updateTranslation(language, "question", e.target.value)
                    }
                  />
                </label>
                <label>
                  {language === "english"
                    ? "English Instructions"
                    : "Tamil Instructions"}
                  <input
                    value={question[language].instructions}
                    onChange={(e) =>
                      updateTranslation(
                        language,
                        "instructions",
                        e.target.value,
                      )
                    }
                  />
                </label>
                <label>
                  {language === "english"
                    ? "English Options (one per line)"
                    : "Tamil Options (one per line)"}
                  <textarea
                    value={question[language].options.join("\n")}
                    onChange={(e) =>
                      updateTranslation(
                        language,
                        "options",
                        e.target.value.split("\n"),
                      )
                    }
                  />
                </label>
                <label>
                  {language === "english"
                    ? "English Explanation"
                    : "Tamil Explanation"}
                  <textarea
                    value={question[language].explanation}
                    onChange={(e) =>
                      updateTranslation(language, "explanation", e.target.value)
                    }
                  />
                </label>
              </fieldset>
            ))}
          </div>
          <label>
            Correct Answer
            <select
              aria-label="Correct Answer"
              value={question.answerIndex}
              onChange={(e) =>
                setQuestion({
                  ...question,
                  answerIndex: Number(e.target.value),
                })
              }
            >
              {(question.english.question
                ? question.english.options
                : question.tamil.options
              ).map((o, i) => (
                <option value={i} key={i}>
                  {i + 1}. {o || "Option " + (i + 1)}
                </option>
              ))}
            </select>
          </label>
          <label className="learning-checkbox">
            <input
              type="checkbox"
              checked={question.active}
              onChange={(e) =>
                setQuestion({ ...question, active: e.target.checked })
              }
            />
            Active question
          </label>
          <button disabled={busy} className="student-gold-btn compact">
            Save Question
          </button>
        </form>
      </details>
      <details className="learning-admin-panel">
        <summary>Current Learning Stages &amp; Results</summary>
        <div className="learning-editor-grid">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save(() => portalRequest("learning-stage", stage, "PUT"));
            }}
          >
            <h3>Set Current Learning Stage</h3>
            <p>
              This controls practice access. Examination progression remains
              independently validated.
            </p>
            <label>
              Learning Student
              <select
                aria-label="Learning Student"
                required
                value={stage.studentId}
                onChange={(e) =>
                  setStage({ ...stage, studentId: e.target.value })
                }
              >
                {studentOptions()}
              </select>
            </label>
            <label>
              Learning Subject
              <select
                aria-label="Learning Subject"
                value={stage.subjectId}
                onChange={(e) =>
                  setStage({ ...stage, subjectId: e.target.value })
                }
              >
                {subjectOptions()}
              </select>
            </label>
            <label>
              Current Learning Grade
              <select
                aria-label="Current Learning Grade"
                value={stage.grade}
                onChange={(e) => setStage({ ...stage, grade: e.target.value })}
              >
                {gradeOrder.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
            </label>
            <button disabled={busy} className="student-gold-btn compact">
              Save Learning Stage
            </button>
          </form>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save(() => portalRequest("results", result), load);
            }}
          >
            <h3>Record Examination Result</h3>
            <label>
              Result Student
              <select
                aria-label="Result Student"
                required
                value={result.studentId}
                onChange={(e) =>
                  setResult({ ...result, studentId: e.target.value })
                }
              >
                {studentOptions()}
              </select>
            </label>
            <label>
              Result Subject
              <select
                aria-label="Result Subject"
                value={result.subjectId}
                onChange={(e) =>
                  setResult({ ...result, subjectId: e.target.value })
                }
              >
                {subjectOptions()}
              </select>
            </label>
            <label>
              Result Grade
              <select
                aria-label="Result Grade"
                value={result.grade}
                onChange={(e) =>
                  setResult({ ...result, grade: e.target.value })
                }
              >
                {gradeOrder.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
            </label>
            <label>
              Result Score
              <input
                required
                type="number"
                min="0"
                max="100"
                value={result.score}
                onChange={(e) =>
                  setResult({ ...result, score: Number(e.target.value) })
                }
              />
            </label>
            <label>
              Result Publication
              <select
                aria-label="Result Publication"
                value={result.status}
                onChange={(e) =>
                  setResult({ ...result, status: e.target.value })
                }
              >
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
            </label>
            <label>
              Result Feedback
              <textarea
                value={result.feedback}
                onChange={(e) =>
                  setResult({ ...result, feedback: e.target.value })
                }
              />
            </label>
            <button disabled={busy} className="student-gold-btn compact">
              Save Result
            </button>
          </form>
        </div>
      </details>
    </section>
  );
}
