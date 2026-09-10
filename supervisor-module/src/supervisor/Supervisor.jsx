import React, { useEffect, useRef, useState } from "react";
import {
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
  useSearchParams,
  useLocation,
} from "react-router-dom";
import {
  LayoutDashboard,
  ScanLine,
  Users,
  GraduationCap,
  LogOut,
  Search,
  Settings,
  Bell,
  History,
  UserRound,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  X,
  Eye,
  Fingerprint,
  Clock,
  Music2,
  Calendar,
  ShieldCheck,
  Info,
  MoreHorizontal,
  Pencil,
  Award,
} from "lucide-react";
import {
  STORAGE_KEY,
  initialState,
  readState,
  lookup,
  verify,
  markAbsent,
  submitAttendance,
  assertAccess,
} from "./store.js";
import { clearStaffSession, readStaffSession } from "../auth.js";
import "./supervisor.css";
import { startScanner } from "./scanner.js";

function Modal({ children, onClose, className = "" }) {
  const ref = useRef(null);
  useEffect(() => {
    const old = document.activeElement;
    ref.current?.focus();
    const handle = (e) => {
      if (
        [...document.querySelectorAll("[role=dialog]")].at(-1) !== ref.current
      )
        return;
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const items = ref.current.querySelectorAll("button,input,a,select");
        const first = items[0],
          last = items[items.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === ref.current)
        ) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handle);
    return () => {
      document.removeEventListener("keydown", handle);
      old?.focus();
    };
  }, []);
  return (
    <div
      className="sv-overlay"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Supervisor dialog"
        tabIndex={-1}
        ref={ref}
        className={`sv-modal ${className}`}
      >
        {children}
      </section>
    </div>
  );
}
function Avatar({ photo, large = false }) {
  return (
    <span className={`sv-avatar ${large ? "large" : ""}`}>
      {photo ? <img src={photo} alt="Profile" /> : <UserRound />}
    </span>
  );
}
const tally = (state, id) => state.candidates.filter((c) => c.sessionId === id);
function Progress({ value, total }) {
  return (
    <div className="sv-progress">
      <span style={{ width: `${total ? (value / total) * 100 : 0}%` }} />
    </div>
  );
}

export default function Supervisor() {
  const [state, setState] = useState(null),
    [error, setError] = useState(""),
    [toast, setToast] = useState(""),
    [dialog, setDialog] = useState(null);
  const navigate = useNavigate(),
    location = useLocation();
  useEffect(() => {
    try {
      setState(readState());
    } catch (e) {
      setError(e.message);
    }
    const sync = (e) => {
      if (e.key === STORAGE_KEY) {
        try {
          setState(readState());
        } catch (err) {
          setError(err.message);
        }
      }
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  const commit = (action) => {
    const current = readState();
    const next = typeof action === "function" ? action(current) : action;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setState(next);
    return next;
  };
  useEffect(() => {
    const id = location.pathname.split("/")[3];
    if (
      state?.user?.assignedSessions?.includes(id) &&
      state.selectedSessionId !== id
    ) {
      try {
        commit((s) => ({ ...s, selectedSessionId: id }));
      } catch (e) {
        setDialog({
          type: "error",
          message: "Unable to save the selected session.",
        });
      }
    }
  }, [location.pathname, state?.user, state?.selectedSessionId]);
  const fail = (e) =>
    setDialog({
      type:
        e.message === "unauthorized" || e.message === "used"
          ? e.message
          : "error",
      message: e.message,
    });
  const notify = (message) => setToast(message);
  if (error)
    return (
      <div className="sv-app sv-recovery">
        <h1>Unable to load Supervisor data</h1>
        <p role="alert">{error}</p>
        <button
          onClick={() => {
            try {
              const fresh = initialState();
              localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
              setState(fresh);
              setError("");
            } catch (e) {
              setError(e.message);
            }
          }}
        >
          Restore demo data
        </button>
      </div>
    );
  if (!state)
    return (
      <div className="sv-app sv-recovery" role="status">
        Loading Supervisor workspace…
      </div>
    );
  const staffSession = readStaffSession();
  const loggedIn =
    staffSession?.role === "supervisor" &&
    Array.isArray(state.user?.assignedSessions) &&
    state.user?.role === "supervisor" &&
    state.user?.emailVerified;
  if (!loggedIn) return <Navigate replace to="/staff-login" />;
  const shared = { state, commit, fail, notify, setDialog };
  const assigned = state.sessions.filter((s) =>
    state.user.assignedSessions.includes(s.id),
  );
  const selectedSession =
    assigned.find((s) => s.id === location.pathname.split("/")[3]) ||
    assigned.find((s) => s.id === state.selectedSessionId) ||
    assigned[0];
  return (
    <div className="sv-app">
      <aside className="sv-sidebar">
        <Link className="sv-brand" to="/supervisor">
          <img
            src="/supervisor/logo.png"
            alt="Music Examination Management System"
          />
        </Link>
        <nav aria-label="Supervisor navigation">
          <NavLink end to="/supervisor">
            <LayoutDashboard />
            Dashboard
          </NavLink>
          <NavLink
            to={`/supervisor/verification/${selectedSession?.id || "none"}`}
          >
            <ScanLine />
            Verification
          </NavLink>
          <NavLink to="/supervisor/attendance">
            <Users />
            Attendance
          </NavLink>
        </nav>
        <div className="sv-board">
          <GraduationCap />
          <span>
            <b>EXAM BOARD</b>
            <br />
            London
          </span>
        </div>
        <button
          className="sv-logout"
          onClick={() => setDialog({ type: "logout" })}
        >
          <LogOut />
          Logout
        </button>
      </aside>
      <header className="sv-topbar">
        <form
          className="sv-global-search"
          onSubmit={(e) => {
            e.preventDefault();
            const q = new FormData(e.currentTarget).get("query");
            navigate(
              `/supervisor/attendance/${selectedSession?.id || "none"}?q=${encodeURIComponent(q)}`,
            );
          }}
        >
          <Search size={19} />
          <input
            name="query"
            aria-label="Search applications"
            placeholder="Search applications..."
          />
        </form>
        <div className="sv-title">Exam Supervisor</div>
        <div className="sv-tools">
          <Link aria-label="Account settings" to="/supervisor/account">
            <Settings />
          </Link>
          <button
            aria-label="Notifications"
            onClick={() => setDialog({ type: "notifications" })}
          >
            <Bell />
          </button>
          <button
            aria-label="Activity history and sync"
            onClick={() => setDialog({ type: "history" })}
          >
            <History />
          </button>
          <Link className="sv-user" to="/supervisor/account">
            <span>
              <strong>
                {state.profile.firstName} {state.profile.lastName}
              </strong>
              <small>Supervisor</small>
            </span>
            <Avatar photo={state.profile.photo} />
          </Link>
        </div>
      </header>
      <main className="sv-main">
        <Routes>
          <Route
            index
            element={<Dashboard {...shared} assigned={assigned} />}
          />
          <Route
            path="attendance"
            element={<Venues {...shared} assigned={assigned} />}
          />
          <Route
            path="attendance/:sessionId"
            element={<Roster {...shared} />}
          />
          <Route
            path="attendance/:sessionId/manual/:candidateId"
            element={<Roster {...shared} manual />}
          />
          <Route
            path="verification/:sessionId"
            element={<Verification {...shared} />}
          />
          <Route
            path="verification"
            element={
              <Navigate
                replace
                to={`/supervisor/verification/${selectedSession?.id || "none"}`}
              />
            }
          />
          <Route path="account" element={<Account {...shared} />} />
          <Route
            path="*"
            element={
              <div>
                <h1>Page not found</h1>
                <Link to="/supervisor">Return to Dashboard</Link>
              </div>
            }
          />
        </Routes>
      </main>
      {toast && (
        <div role="status" className="sv-toast">
          <span className="sv-success-icon">
            <CheckCircle2 />
          </span>
          <div>
            <b>Candidate Verified Successfully</b>
            <p>{toast}</p>
          </div>
          <button
            aria-label="Close success notification"
            onClick={() => setToast("")}
          >
            <X size={18} />
          </button>
        </div>
      )}
      {dialog && (
        <Modal
          className={dialog.type === "unauthorized" ? "sv-denied" : ""}
          onClose={() => setDialog(null)}
        >
          {["unauthorized", "used", "error"].includes(dialog.type) ? (
            <>
              <div className="sv-danger-icon">
                <AlertTriangle />
              </div>
              <h2>
                {dialog.type === "unauthorized"
                  ? "Access Denied: Unauthorized Session"
                  : dialog.type === "used"
                    ? "Access Denied: Code Already Used"
                    : "Unable to complete action"}
              </h2>
              <p role="alert">
                {dialog.type === "unauthorized"
                  ? "This candidate is not assigned to your currently selected examination session. Cross-session candidate access is strictly restricted."
                  : dialog.type === "used"
                    ? "This admission code has already been scanned and verified for this session. Single-use policy enforced."
                    : dialog.message}
              </p>
              <button className="sv-dark" onClick={() => setDialog(null)}>
                {dialog.type === "unauthorized" ? "Scan Again" : "Check Again"}
              </button>
              {dialog.type === "unauthorized" && (
                <button
                  className="sv-text"
                  onClick={() => {
                    setDialog(null);
                    navigate("/supervisor/attendance");
                  }}
                >
                  Switch Session
                </button>
              )}
            </>
          ) : dialog.type === "submitted" ? (
            <>
              <div className="sv-gold-icon">
                <CheckCircle2 />
              </div>
              <h2>Attendance Submitted Successfully</h2>
              <p>
                The session for {dialog.venue} has been closed.
                <br />
                The attendance log has been saved in this demonstration
                workspace.
              </p>
              <button
                className="sv-gradient"
                onClick={() => {
                  setDialog(null);
                  navigate("/supervisor");
                }}
              >
                Return to Dashboard
              </button>
            </>
          ) : dialog.type === "logout" ? (
            <>
              <h2>Log out?</h2>
              <p>Your saved attendance will be preserved.</p>
              <button
                className="sv-gold"
                onClick={() => {
                  try {
                    const signedOutState = { ...readState(), user: null };
                    localStorage.setItem(
                      STORAGE_KEY,
                      JSON.stringify(signedOutState),
                    );
                    clearStaffSession();
                    navigate("/", { replace: true });
                  } catch (e) {
                    fail(e);
                  }
                }}
              >
                Logout
              </button>
              <button className="sv-text" onClick={() => setDialog(null)}>
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                className="sv-close"
                aria-label="Close dialog"
                onClick={() => setDialog(null)}
              >
                <X />
              </button>
              <h2>
                {dialog.type === "notifications"
                  ? "Notifications"
                  : "Activity History"}
              </h2>
              <div className="sv-event-list">
                {state.events.length ? (
                  state.events.map((e) => (
                    <p key={e.id}>
                      {e.message}
                      <small>{new Date(e.at).toLocaleString()}</small>
                    </p>
                  ))
                ) : (
                  <p>
                    No activity yet. Verification and attendance updates will
                    appear here.
                  </p>
                )}
              </div>
              <button
                className="sv-gold"
                onClick={() => {
                  try {
                    setState(readState());
                    setDialog(null);
                  } catch (e) {
                    fail(e);
                  }
                }}
              >
                Refresh saved records
              </button>
            </>
          )}
        </Modal>
      )}
    </div>
  );
}

function Dashboard({ state, assigned, setDialog }) {
  const navigate = useNavigate(),
    candidates = state.candidates.filter((c) =>
      assigned.some((s) => s.id === c.sessionId),
    ),
    verified = candidates.filter((c) => c.status === "verified").length;
  return (
    <>
      <h1>Examination Center</h1>
      <p className="sv-date">
        <Calendar size={19} />
        Today is{" "}
        {new Date().toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
        })}
      </p>
      <div className="sv-stat-grid">
        <article className="sv-stat">
          <span>EXPECTED CANDIDATES</span>
          <div className="sv-stat-icon">
            <Users />
          </div>
          <strong>{candidates.length}</strong>
          <Progress value={candidates.length} total={candidates.length} />
          <p>Confirmed across {assigned.length} venues today</p>
        </article>
        <article className="sv-stat">
          <span>VERIFIED CANDIDATES</span>
          <div className="sv-stat-icon gold">
            <CheckCircle2 />
          </div>
          <strong className="sv-gold-text">{verified}</strong>
          <Progress value={verified} total={candidates.length} />
          <p>
            {candidates.length
              ? Math.round((verified / candidates.length) * 100)
              : 0}
            % Attendance achieved for assigned sessions
          </p>
        </article>
      </div>
      <div className="sv-section-heading">
        <div>
          <p>SESSION OVERVIEW</p>
          <h1>Today's Assigned Sessions</h1>
        </div>
        <Link to="/supervisor/attendance">
          View Complete Schedule <ArrowRight size={20} />
        </Link>
      </div>
      <div className="sv-session-grid">
        {assigned.slice(0, 3).map((s) => {
          const roster = tally(state, s.id),
            count = roster.filter((c) => c.status === "verified").length;
          return (
            <button
              key={s.id}
              className={`sv-session-card ${s.status === "active" ? "active" : ""}`}
              onClick={() => navigate(`/supervisor/attendance/${s.id}`)}
            >
              <span className="sv-badge">
                {s.status === "active"
                  ? "LIVE SESSION"
                  : s.status.toUpperCase()}
              </span>
              <Music2 className="sv-session-music" />
              <h2>{s.time}</h2>
              <h3>{s.venue}</h3>
              <p>{s.title}</p>
              <div className="sv-count">
                <span>Attendance Tracking</span>
                <b>
                  {count} / {roster.length}
                </b>
              </div>
              <Progress value={count} total={roster.length} />
            </button>
          );
        })}
      </div>
      <div className="sv-notice-grid">
        <article>
          <Info />
          <div>
            System Notice
            <p>
              Attendance is saved locally in this demo. Use the same browser to
              retain your records.
            </p>
          </div>
        </article>
        <article>
          <ShieldCheck />
          <div>
            Secure Check-in
            <p>
              Identity verification for {verified} candidates successful.
              Session restrictions active.
            </p>
          </div>
        </article>
        <button onClick={() => setDialog({ type: "history" })}>
          <Clock />
          <div>
            Saved Records
            <p>Review activity and refresh the latest saved attendance.</p>
          </div>
        </button>
      </div>
    </>
  );
}
function Venues({ state, assigned }) {
  return (
    <div className="sv-venues">
      <h1>Select Venue</h1>
      <p>
        Please choose your assigned examination hall to begin candidate
        check-in.
      </p>
      <div className="sv-venue-grid">
        {assigned.map((s) => (
          <article key={s.id} className="sv-venue">
            <div className={`sv-venue-image image-${s.image}`}>
              <span className="sv-badge">
                {s.status === "active"
                  ? "ACTIVE"
                  : s.status === "upcoming"
                    ? "NEXT SESSION"
                    : s.status.toUpperCase()}
              </span>
            </div>
            <h2>{s.venue}</h2>
            <p>
              <Music2 />
              {s.title}
            </p>
            <p>
              <Clock />
              {s.time} - {s.end}
            </p>
            <p>
              <Users />
              {tally(state, s.id).length} Candidates Registered
            </p>
            <Link
              className="sv-outline"
              to={`/supervisor/verification/${s.id}`}
            >
              View Roster
            </Link>
          </article>
        ))}
      </div>
      {!assigned.length && (
        <p>No examination sessions have been assigned to you.</p>
      )}
    </div>
  );
}
function useSession(state) {
  const { sessionId } = useParams();
  let error;
  try {
    assertAccess(state, sessionId);
  } catch (e) {
    error = e.message;
  }
  return {
    session: state.sessions.find((s) => s.id === sessionId),
    sessionId,
    error,
  };
}
function AccessError() {
  return (
    <div className="sv-empty">
      <AlertTriangle />
      <h2>Access Denied: Unauthorized Session</h2>
      <p>You can only access your assigned examination sessions.</p>
      <Link to="/supervisor/attendance">Select an assigned session</Link>
    </div>
  );
}
function Roster({ state, commit, fail, notify, setDialog, manual = false }) {
  const { session, sessionId, error } = useSession(state),
    { candidateId } = useParams(),
    navigate = useNavigate(),
    [params, setParams] = useSearchParams(),
    [filter, setFilter] = useState("all"),
    [menu, setMenu] = useState(null),
    [submitting, setSubmitting] = useState(false);
  if (error) return <AccessError />;
  const query = params.get("q") || "",
    roster = tally(state, sessionId),
    filtered = roster.filter(
      (c) =>
        (filter === "all" ||
          c.status === filter ||
          (filter === "pending" && c.status === "absent")) &&
        `${c.name} ${c.id}`.toLowerCase().includes(query.toLowerCase()),
    );
  const candidate = roster.find((c) => c.id === candidateId);
  const submit = () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      commit((s) => submitAttendance(s, sessionId));
      setDialog({ type: "submitted", venue: session.venue });
    } catch (e) {
      fail(e);
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <>
      <div className="sv-roster-heading">
        <Link aria-label="Back to venues" to="/supervisor/attendance">
          <ArrowLeft />
        </Link>
        <h2>
          Attendance Roster: {session.venue} - Grade {session.level}{" "}
          {session.instrument}
        </h2>
      </div>
      <div className="sv-roster-controls">
        <label className="sv-search">
          <Search />
          <input
            aria-label="Search candidates"
            placeholder="Search candidate by name or registration ID..."
            value={query}
            onChange={(e) =>
              setParams(e.target.value ? { q: e.target.value } : {}, {
                replace: true,
              })
            }
          />
        </label>
        <div className="sv-filters" aria-label="Attendance filters">
          {["all", "pending", "verified"].map((f) => (
            <button
              key={f}
              aria-pressed={filter === f}
              className={filter === f ? "active" : ""}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      <div className="sv-table-wrap">
        <table className="sv-roster">
          <thead>
            <tr>
              <th>Candidate</th>
              <th>Registration ID</th>
              <th>Instrument</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id}>
                <td>
                  <div className="sv-candidate-name">
                    <Avatar />
                    <Link
                      to={`/supervisor/verification/${sessionId}?candidate=${c.id}`}
                    >
                      {c.name}
                    </Link>
                  </div>
                </td>
                <td>#{c.id}</td>
                <td>
                  {session.instrument} -<br />
                  Level {session.level}
                </td>
                <td>
                  <span className={`sv-status ${c.status}`}>
                    <CheckCircle2 size={12} />
                    {c.status}
                  </span>
                </td>
                <td>
                  <div className="sv-row-actions">
                    {c.status === "pending" && session.status !== "closed" && (
                      <Link
                        className="sv-manual-button"
                        to={`/supervisor/attendance/${sessionId}/manual/${c.id}`}
                      >
                        Manual Verify
                      </Link>
                    )}
                    <button
                      aria-label={`Actions for ${c.name}`}
                      onClick={() => setMenu(menu === c.id ? null : c.id)}
                    >
                      <MoreHorizontal size={20} />
                    </button>
                    {menu === c.id && (
                      <div className="sv-action-menu">
                        <Link
                          to={`/supervisor/verification/${sessionId}?candidate=${c.id}`}
                        >
                          View candidate
                        </Link>
                        {c.status !== "verified" &&
                          session.status !== "closed" && (
                            <button
                              onClick={() => {
                                try {
                                  commit((s) => markAbsent(s, sessionId, c.id));
                                  setMenu(null);
                                } catch (e) {
                                  fail(e);
                                }
                              }}
                            >
                              {c.status === "absent"
                                ? "Mark pending"
                                : "Mark absent"}
                            </button>
                          )}
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!filtered.length && (
        <div className="sv-empty">
          {roster.length
            ? "No candidates match your search or filter."
            : "No candidates assigned to this session."}
        </div>
      )}
      <div className="sv-submit">
        <button
          className="sv-gold"
          onClick={submit}
          disabled={submitting || session.status === "closed"}
        >
          {session.status === "closed"
            ? "Attendance Submitted · Session Closed"
            : "Submit Attendance & End Session"}
          <ArrowRight />
        </button>
      </div>
      {manual &&
        (candidate ? (
          <Manual
            candidate={candidate}
            session={session}
            onClose={() => navigate(`/supervisor/attendance/${sessionId}`)}
            onVerify={(docs) => {
              try {
                commit((s) => verify(s, sessionId, candidate.id, docs));
                notify(`${candidate.name} has been admitted to the session.`);
                navigate(`/supervisor/attendance/${sessionId}`);
              } catch (e) {
                fail(e);
              }
            }}
          />
        ) : (
          <Modal
            onClose={() => navigate(`/supervisor/attendance/${sessionId}`)}
          >
            <h2>Candidate not found</h2>
            <p>This candidate is not in the selected session.</p>
            <button
              onClick={() => navigate(`/supervisor/attendance/${sessionId}`)}
            >
              Back to roster
            </button>
          </Modal>
        ))}
    </>
  );
}
function DocumentPreview({ candidate, title, session, onClose }) {
  return (
    <Modal onClose={onClose}>
      <button
        className="sv-close"
        aria-label="Close document"
        onClick={onClose}
      >
        <X />
      </button>
      <Award className="sv-gold-text" size={40} />
      <h2>{title}</h2>
      <p>
        {candidate.name}
        <br />#{candidate.id}
      </p>
      <p>
        {session.venue}
        <br />
        {session.instrument} · Level {session.level}
        <br />
        {session.time}
      </p>
      <p>
        This is a sample document record. Original uploaded documents are not
        included in the source project.
      </p>
      <button className="sv-gold" onClick={onClose}>
        Close preview
      </button>
    </Modal>
  );
}
function Manual({ candidate, session, onClose, onVerify }) {
  const [docs, setDocs] = useState({
      idPresented: candidate.idPresented,
      admissionPresented: candidate.admissionPresented,
    }),
    [preview, setPreview] = useState("");
  return (
    <>
      <Modal onClose={onClose} className="sv-manual">
        <button
          className="sv-close"
          aria-label="Close manual verification"
          onClick={onClose}
        >
          <X />
        </button>
        <header>
          <h2>Manual Verification</h2>
          <p>CANDIDATE ID: #{candidate.id}</p>
        </header>
        <div className="sv-manual-content">
          <div className="sv-photo">
            <Avatar large />
          </div>
          <div className="sv-manual-details">
            <div className="sv-details-grid">
              <div>
                <label>FULL NAME</label>
                <b>{candidate.name}</b>
              </div>
              <div>
                <label>INSTRUMENT</label>
                <b>
                  {session.instrument} • Level {session.level}
                </b>
              </div>
              <div>
                <label>SESSION TIME</label>
                <span>{session.time}</span>
              </div>
              <div>
                <label>VENUE</label>
                <span>{session.venue}</span>
              </div>
            </div>
            <label>DOCUMENT REVIEW</label>
            {[
              ["idPresented", "ID Card"],
              ["admissionPresented", "Admission Slip"],
            ].map(([key, title]) => (
              <div className="sv-document-row" key={key}>
                <label className="sv-document-check">
                  <input
                    type="checkbox"
                    checked={docs[key]}
                    onChange={(e) =>
                      setDocs({ ...docs, [key]: e.target.checked })
                    }
                  />
                  {title}: {docs[key] ? "Presented" : "Not presented"}
                </label>
                <button
                  aria-label={`View ${title}`}
                  onClick={() => setPreview(title)}
                >
                  <Eye />
                </button>
              </div>
            ))}
          </div>
        </div>
        <footer>
          <button className="sv-gradient" onClick={() => onVerify(docs)}>
            <Fingerprint />
            Confirm Identity & Verify
          </button>
          <button className="sv-outline" onClick={onClose}>
            Cancel
          </button>
        </footer>
      </Modal>
      {preview && (
        <DocumentPreview
          candidate={candidate}
          session={session}
          title={preview}
          onClose={() => setPreview("")}
        />
      )}
    </>
  );
}

function Verification({ state, commit, fail, notify }) {
  const { session, sessionId, error } = useSession(state),
    [params, setParams] = useSearchParams(),
    [code, setCode] = useState(""),
    [candidate, setCandidate] = useState(null),
    [preview, setPreview] = useState(false),
    [scanning, setScanning] = useState(false),
    [cameraError, setCameraError] = useState("");
  const video = useRef(null),
    scanController = useRef(null);
  const stop = () => {
    scanController.current?.abort();
    scanController.current = null;
    setScanning(false);
  };
  useEffect(() => {
    setCandidate(null);
    setCode("");
    setScanning(false);
    setCameraError("");
    const id = params.get("candidate");
    if (id && !error) {
      try {
        const found = state.candidates.find(
          (c) => c.id === id && c.sessionId === sessionId,
        );
        if (!found) throw new Error("unauthorized");
        setCandidate(found);
        setCode(found.id);
      } catch (e) {
        fail(e);
      }
    }
    return () => {
      scanController.current?.abort();
      scanController.current = null;
    };
  }, [sessionId, params.get("candidate")]);
  if (error) return <AccessError />;
  const search = (value) => {
    setCandidate(null);
    try {
      const found = lookup(readState(), sessionId, value);
      setCandidate(found);
      setParams({ candidate: found.id }, { replace: true });
    } catch (e) {
      fail(e);
    }
  };
  const scan = async () => {
    if (scanning) {
      stop();
      return;
    }
    setCameraError("");
    setScanning(true);
    const controller = new AbortController();
    scanController.current = controller;
    try {
      await startScanner(video.current, {
        signal: controller.signal,
        onCode: (value) => {
          stop();
          setCode(value);
          search(value);
        },
        onError: () => {
          stop();
          setCameraError(
            "Could not read the QR code. Please enter the code manually.",
          );
        },
      });
    } catch (e) {
      if (!controller.signal.aborted) {
        stop();
        setCameraError(
          e.name === "NotAllowedError"
            ? "Camera access was denied. Enter the admission code manually."
            : e.name === "NotFoundError"
              ? "No camera is available. Enter the admission code manually."
              : e.message,
        );
      }
    }
  };
  const current =
    candidate &&
    state.candidates.find(
      (c) => c.id === candidate.id && c.sessionId === sessionId,
    );
  return (
    <>
      <div className="sv-verification-heading">
        <div>
          <p>
            {session.status === "active"
              ? "LIVE SESSION"
              : session.status.toUpperCase() + " SESSION"}{" "}
            • ROOM {session.room}
          </p>
          <h1>Candidate Verification</h1>
          <Link
            className="sv-small-link"
            to={`/supervisor/attendance/${sessionId}`}
          >
            {session.venue} · View attendance roster
          </Link>
        </div>
        <div>
          <strong>
            {
              tally(state, sessionId).filter((c) => c.status === "pending")
                .length
            }
          </strong>
          <label>CANDIDATES REMAINING</label>
        </div>
      </div>
      <div className="sv-verification-grid">
        <section>
          <div className="sv-camera">
            <video
              ref={video}
              muted
              playsInline
              style={{ display: scanning ? "block" : "none" }}
            />
            <div className="sv-scan-frame">
              <ScanLine size={44} />
              <span>
                {scanning
                  ? "CAMERA ACTIVE: ALIGN QR CODE"
                  : "CAMERA READY: CLICK SCAN CANDIDATE"}
              </span>
            </div>
          </div>
          <button className="sv-dark sv-scan-button" onClick={scan}>
            {scanning ? "Stop Camera" : "Scan Candidate"}
          </button>
          {cameraError && (
            <p role="alert" className="sv-inline-error">
              {cameraError}
            </p>
          )}
          <form
            className="sv-code-form"
            onSubmit={(e) => {
              e.preventDefault();
              search(code);
            }}
          >
            <label htmlFor="admission-code">
              OR ENTER REGISTRATION CODE MANUALLY
            </label>
            <div>
              <input
                id="admission-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="#772-ART-24"
              />
              <button className="sv-dark" type="submit">
                Search <ArrowRight size={20} />
              </button>
            </div>
          </form>
        </section>
        <section className="sv-profile-card">
          {current ? (
            <>
              <Avatar large />
              <h1>{current.name}</h1>
              <p className="sv-instrument">
                {session.instrument} - Level {session.level} Examination
              </p>
              <div className="sv-profile-pills">
                <span>
                  <small>STATUS</small>
                  <b>{current.status.toUpperCase()}</b>
                </span>
                <span>
                  <small>AGE</small>
                  <b>{current.age} Years</b>
                </span>
              </div>
              <label>EXAMINATION TIMELINE</label>
              <div className="sv-timeline">
                <span>
                  <i />
                  APPLICATION<small>{current.applicationDate}</small>
                </span>
                <span>
                  <i />
                  REVIEW<small>{current.reviewDate}</small>
                </span>
                <span>
                  <i />
                  SLOTTING<small>Assigned</small>
                </span>
              </div>
              <div className="sv-prerequisite">
                <label>PRE-REQUISITE CLEARANCE</label>
                <div>
                  <Award />
                  <span>
                    <b>Level {Math.max(1, session.level - 1)} Certificate</b>
                    <small>Sample document record</small>
                  </span>
                  <button
                    aria-label="View prerequisite certificate"
                    onClick={() => setPreview(true)}
                  >
                    <Eye size={20} />
                  </button>
                </div>
              </div>
              <button
                className="sv-gold"
                onClick={() => {
                  try {
                    commit((s) =>
                      verify(s, sessionId, current.id, {
                        idPresented: current.idPresented,
                        admissionPresented: current.admissionPresented,
                      }),
                    );
                    notify(`${current.name} has been admitted to the session.`);
                  } catch (e) {
                    fail(e);
                  }
                }}
              >
                Verify & Admit Candidate <ShieldCheck size={20} />
              </button>
            </>
          ) : (
            <div className="sv-empty">
              <Avatar large />
              <h2>Ready to verify</h2>
              <p>
                Scan an admission code or enter a registration code to securely
                view the candidate profile.
              </p>
              <p>Selected session: {session.venue}</p>
            </div>
          )}
        </section>
      </div>
      {preview && current && (
        <DocumentPreview
          candidate={current}
          session={session}
          title="Prerequisite Certificate"
          onClose={() => setPreview(false)}
        />
      )}
    </>
  );
}

function Account({ state, commit }) {
  const [tab, setTab] = useState("profile"),
    [profile, setProfile] = useState({ ...state.profile }),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const save = (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    if (
      !profile.firstName.trim() ||
      !profile.lastName.trim() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email) ||
      !/^\+?[\d\s()-]{7,20}$/.test(profile.phone)
    ) {
      setError("Enter your name, a valid email address and phone number.");
      return;
    }
    try {
      commit((s) => ({
        ...s,
        profile: {
          ...profile,
          firstName: profile.firstName.trim(),
          lastName: profile.lastName.trim(),
        },
      }));
      setMessage("Profile changes saved successfully.");
    } catch {
      setError("Profile could not be saved. Browser storage may be full.");
    }
  };
  const photo = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (
      !["image/jpeg", "image/png"].includes(file.type) ||
      file.size > 2 * 1024 * 1024
    ) {
      setError("Choose a JPG or PNG image no larger than 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setProfile((p) => ({ ...p, photo: reader.result }));
      setError("");
    };
    reader.onerror = () => setError("Unable to read the selected image.");
    reader.readAsDataURL(file);
  };
  return (
    <div className="sv-account">
      <Link className="sv-back" to="/supervisor">
        <ArrowLeft />
        Back
      </Link>
      <h1>Account Settings</h1>
      <p>Manage your personal information and preferences.</p>
      <section className="sv-account-panel">
        <div className="sv-tabs">
          <button
            className={tab === "profile" ? "active" : ""}
            onClick={() => setTab("profile")}
          >
            Profile Information
          </button>
          <button
            className={tab === "security" ? "active" : ""}
            onClick={() => setTab("security")}
          >
            Security
          </button>
        </div>
        {tab === "profile" ? (
          <form onSubmit={save}>
            <div className="sv-account-body">
              <div className="sv-fields">
                <div className="sv-name-fields">
                  {[
                    ["firstName", "FIRST NAME"],
                    ["lastName", "LAST NAME"],
                  ].map(([key, label]) => (
                    <label key={key}>
                      {label}
                      <input
                        required
                        value={profile[key]}
                        onChange={(e) =>
                          setProfile({ ...profile, [key]: e.target.value })
                        }
                      />
                    </label>
                  ))}
                </div>
                <label>
                  EMAIL ADDRESS
                  <input
                    required
                    type="email"
                    value={profile.email}
                    onChange={(e) =>
                      setProfile({ ...profile, email: e.target.value })
                    }
                  />
                </label>
                <label>
                  PHONE NUMBER
                  <input
                    required
                    type="tel"
                    value={profile.phone}
                    onChange={(e) =>
                      setProfile({ ...profile, phone: e.target.value })
                    }
                  />
                </label>
                <label>
                  SYLLABUS SPECIALIZATION
                  <select
                    value={profile.specialization}
                    onChange={(e) =>
                      setProfile({ ...profile, specialization: e.target.value })
                    }
                  >
                    <option>Carnatic Music</option>
                    <option>Western Music</option>
                    <option>Bharatanatyam</option>
                  </select>
                </label>
              </div>
              <div className="sv-upload">
                <Avatar photo={profile.photo} large />
                <label
                  className="sv-upload-label"
                  aria-label="Change profile photo"
                >
                  <Pencil size={15} />
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    aria-label="Upload profile photo"
                    onChange={photo}
                  />
                </label>
                <p>
                  Allowed formats: JPG, PNG.
                  <br />
                  Max size: 2MB.
                </p>
              </div>
            </div>
            {error && (
              <p role="alert" className="sv-inline-error">
                {error}
              </p>
            )}
            {message && (
              <p role="status" className="sv-inline-success">
                {message}
              </p>
            )}
            <footer>
              <button
                type="button"
                className="sv-outline"
                onClick={() => {
                  setProfile({ ...state.profile });
                  setError("");
                  setMessage("Changes cancelled.");
                }}
              >
                Cancel
              </button>
              <button className="sv-gold" type="submit">
                Save Changes
              </button>
            </footer>
          </form>
        ) : (
          <div className="sv-security">
            <ShieldCheck size={32} />
            <h2>Account Security</h2>
            <p>Role: Supervisor · Email verified in the demo account</p>
            <p>
              This project has no authentication backend. Password changes and
              identity verification must be connected to the production identity
              provider.
            </p>
            <p>Your attendance records remain saved when you log out.</p>
            <Link className="sv-outline" to="/staff-login">
              Open Staff Login
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
