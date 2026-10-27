import { Fragment, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  LockKeyhole,
  GraduationCap,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import { StudentShell } from "../components/StudentLayout.jsx";
import SubjectStudy from "../components/SubjectStudy.jsx";
import { useStudent } from "../context/StudentContext.jsx";
import { portalRequest } from "../../auth/api.js";
import "../../styles/learning.css";
export function LearningHome() {
  return (
    <StudentShell>
      <main className="student-shell learning-content">
        <div className="learning-heading">
          <div>
            <span className="learning-eyebrow">LEARN &amp; PRACTISE</span>
            <h1>Your Learning Library</h1>
            <p>Choose a subject to open a focused question session.</p>
          </div>
        </div>
        <SubjectStudy />
      </main>
    </StudentShell>
  );
}
export default function SubjectPage({ embedded = false, practiceSubjectId, onProgress } = {}) {
  const Shell = embedded ? Fragment : StudentShell;
  const { subjectId: routeSubjectId } = useParams(),
    { profile, refresh } = useStudent();
  const subjectId = practiceSubjectId || routeSubjectId;
  const [context, setContext] = useState(null),
    [grade, setGrade] = useState(""),
    [session, setSession] = useState(null),
    [index, setIndex] = useState(0),
    [selected, setSelected] = useState(null),
    [feedback, setFeedback] = useState(null),
    [lastFeedback, setLastFeedback] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const id = encodeURIComponent(profile.candidateId);
  useEffect(() => {
    let active = true;
    setContext(null);
    setGrade("");
    setSession(null);
    portalRequest(`learning/${subjectId}?studentId=${id}`)
      .then((data) => {
        if (active) {
          setContext(data);
          setGrade(data.currentGrade);
          setError("");
        }
      })
      .catch((e) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, [subjectId, id]);
  useEffect(() => {
    if (!grade) return;
    let active = true;
    setSession(null);
    setIndex(0);
    setSelected(null);
    setFeedback(null);
    setLastFeedback(null);
    portalRequest(
      `practice/${subjectId}?studentId=${id}&grade=${encodeURIComponent(grade)}`,
    )
      .then((data) => {
        if (active) {
          setSession(data);
          setError("");
        }
      })
      .catch((e) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, [subjectId, id, grade]);
  const tamil = session?.medium === "Tamil" || context?.medium === "Tamil",
    question = session?.questions[index];
  useEffect(()=>{if(!onProgress)return;const attempts=session?.attempts||[];const answered=new Set(attempts.map(a=>a.question_id)).size;const correct=attempts.filter(a=>a.correct>0).length;onProgress({total:session?.questions.length||0,answered,correct,incorrect:Math.max(0,answered-correct)});},[session,onProgress]);
  async function answer() {
    if (selected === null) return;
    setBusy(true);
    setError("");
    try {
      const response = await portalRequest("practice-attempts", {
        studentId: profile.candidateId,
        questionId: question.id,
        selectedIndex: selected,
      });
      setSession(current=>({...current,attempts:[...(current.attempts||[]).filter(a=>a.question_id!==question.id),{question_id:question.id,correct:response.correct?1:0,attempts:1}]}));
      setFeedback(response);
      setLastFeedback({...response,question:question.question,selectedAnswer:question.options[selected]});
      setContext((c) => ({ ...c, stats: response.stats }));
      refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Shell>
      <div className={embedded ? "dashboard-practice-content" : "student-shell learning-content"}>
        {!embedded && <Link className="learning-back" to="/student/dashboard">
          <ArrowLeft size={17} />
          Back to Dashboard
        </Link>}
        {error && <p role="alert">{error}</p>}
        {!context && !error && <p role="status">Loading subject…</p>}
        {context && (
          <>
            {!embedded && <section className="learning-subject-hero">
              <img
                src={context.subject.image}
                alt={`${context.subject.name} illustration`}
              />
              <div>
                <span className="learning-eyebrow">EXPLORE &amp; LEARN</span>
                <h1>{context.subject.name}</h1>
                <p>{context.subject.introduction}</p>
                <div className="learning-stage">
                  <GraduationCap size={24} />
                  <div>
                    <small>Your Current Stage</small>
                    <strong>{context.currentGrade}</strong>
                  </div>
                  <span>
                    {context.completedGrades.length} completed ·{" "}
                    {context.stats.attempts} practice answers
                  </span>
                </div>
              </div>
            </section>}
            <section className="learning-practice">
              <div className="learning-heading">
                <div>
                  <h2>{tamil ? "பயிற்சி வினாக்கள்" : "Practice Questions"}</h2>
                  <p>
                    {tamil
                      ? "உங்கள் தற்போதைய நிலை மற்றும் முந்தைய நிலைகளில் பயிற்சி செய்யவும்."
                      : "Practise your current stage and revisit earlier learning."}
                  </p>
                </div>
                <span className="exam-badge">{context.medium}</span>
              </div>
              <div
                className="learning-grade-navigation"
                role="group"
                aria-label="Practice grades"
              >
                {context.grades.map((g) => (
                  <button
                    key={g.grade}
                    disabled={g.availability === "locked"}
                    aria-pressed={grade === g.grade}
                    onClick={() => setGrade(g.grade)}
                  >
                    <strong>
                      {g.availability === "locked" && <LockKeyhole size={12} />}{" "}
                      {g.grade}
                    </strong>
                    <small>
                      {tamil
                        ? {
                            locked: "இன்னும் கிடைக்கவில்லை",
                            current: "தற்போதைய நிலை",
                            previous: g.completed
                              ? "நிறைவு பெற்றது"
                              : "முந்தைய நிலை",
                          }[g.availability]
                        : g.availability === "locked"
                          ? "Not yet available"
                          : g.availability === "current"
                            ? "Current"
                            : g.completed
                              ? "Completed / Previous"
                              : "Previous"}
                    </small>
                  </button>
                ))}
              </div>
              {!session && !error && (
                <p role="status">
                  {tamil ? "வினாக்கள் ஏற்றப்படுகின்றன…" : "Loading questions…"}
                </p>
              )}
              {session && (
                <><article className="learning-question-card">
                  <div className="learning-question-top">
                    <span>
                      {grade} · {context.subject.name}
                    </span>
                    <small>
                      {question
                        ? `Question ${index + 1} of ${session.questions.length}`
                        : ""}
                    </small>
                  </div>
                  {embedded && question && <div className="pd-question-progress"><span style={{width:((index+1)/session.questions.length*100)+"%"}}/></div>}
                  {question ? (
                    <>
                      <p className="learning-instructions">
                        {question.instructions}
                      </p>
                      <h3>{question.question}</h3>
                      <div className="learning-options">
                        {question.options.map((option, i) => (
                          <button
                            key={i}
                            className={selected === i ? "selected" : ""}
                            aria-pressed={selected === i}
                            disabled={!!feedback || busy}
                            onClick={() => setSelected(i)}
                          >
                            <span>{String.fromCharCode(65 + i)}</span>
                            {option}
                          </button>
                        ))}
                      </div>
                      {feedback && !embedded && (
                        <div
                          className={`learning-feedback ${feedback.correct ? "correct" : "retry"}`}
                          role="status"
                        >
                          <strong>
                            <CheckCircle2 size={18} />
                            {tamil
                              ? feedback.correct
                                ? "சரியான விடை"
                                : "மீண்டும் முயற்சிக்கவும்"
                              : feedback.correct
                                ? "Correct"
                                : "Review and try again"}
                          </strong>
                          <p>
                            {tamil ? "சரியான விடை: " : "Correct answer: "}
                            {feedback.correctAnswer}
                          </p>
                          <p>{feedback.explanation}</p>
                        </div>
                      )}
                      <div className="learning-question-actions">
                        <button
                          className="student-outline-btn compact"
                          disabled={index === 0 || busy}
                          onClick={() => {
                            setIndex(index - 1);
                            setSelected(null);
                            setFeedback(null);
                          }}
                        >
                          {tamil ? "முந்தைய வினா" : "Previous Question"}
                        </button>
                        {!feedback ? (
                          <button
                            className="student-gold-btn compact"
                            disabled={selected === null || busy}
                            onClick={answer}
                          >
                            {tamil ? "விடையைச் சரிபார்க்கவும்" : "Check Answer"}
                          </button>
                        ) : (
                          <button
                            className="student-gold-btn compact"
                            disabled={busy}
                            onClick={() => {
                              setIndex((index + 1) % session.questions.length);
                              setSelected(null);
                              setFeedback(null);
                            }}
                          >
                            {tamil ? "அடுத்த வினா" : "Next Question"}
                          </button>
                        )}
                      </div>
                    </>
                  ) : (
                    <p>
                      {tamil
                        ? "இந்த நிலையில் உங்கள் மொழிக்கான வினாக்கள் இன்னும் தயாராகவில்லை. வேறு கிடைக்கக்கூடிய நிலையைத் தேர்ந்தெடுக்கவும்."
                        : "Questions in your selected medium are being prepared for this stage. Please choose another available stage."}
                    </p>
                  )}
                  {session.unavailableCount > 0 && question && (
                    <p className="learning-instructions">
                      {tamil
                        ? "சில மொழிபெயர்ப்புகள் தயாராகி வருகின்றன. கிடைக்கக்கூடிய வினாக்கள் மட்டும் காட்டப்படுகின்றன."
                        : "Some translations are being prepared. Only available questions are shown."}
                    </p>
                  )}
                </article>
                {embedded && <aside className={'sd-practice-feedback '+(lastFeedback?(lastFeedback.correct?'correct':'retry'):'')} aria-live="polite"><span className="learning-eyebrow">YOUR PRACTICE REVIEW</span><h3>{lastFeedback?(tamil?(lastFeedback.correct?'சரியான விடை':'மீண்டும் முயற்சிக்கவும்'):(lastFeedback.correct?'Correct Answer':'Review Your Answer')):'Learn with every answer'}</h3>{lastFeedback?<><p>{lastFeedback.question}</p><div className="sd-answer-review"><small>{tamil?'உங்கள் விடை':'YOUR ANSWER'}</small><strong>{lastFeedback.selectedAnswer}</strong></div><div className="sd-answer-review"><small>{tamil?'சரியான விடை':'CORRECT ANSWER'}</small><strong>{lastFeedback.correctAnswer}</strong></div><h4>{tamil?'விளக்கம்':'Explanation'}</h4><p>{lastFeedback.explanation}</p><small>Your answer has been saved.</small></>:<p>Choose an option and check your answer. Your feedback and explanation will appear here, and your progress will be saved.</p>}</aside>}
                </>
              )}
            </section>
          </>
        )}
      </div>
    </Shell>
  );
}
