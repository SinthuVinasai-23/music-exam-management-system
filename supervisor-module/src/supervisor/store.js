export const STORAGE_KEY = "mems-supervisor-v1";
export const demoUser = {
  id: "supervisor-1",
  role: "supervisor",
  emailVerified: true,
  firstName: "Mr. Venkat",
  lastName: "Raman",
  email: "raman@aria-academy.edu",
  phone: "+94 77 123 4567",
  specialization: "Carnatic Music",
  assignedSessions: ["mozart", "thillana", "tanjavur", "kriti"],
};
export function initialState() {
  const sessions = [
    {
      id: "mozart",
      venue: "Mozart Hall",
      title: "Grade 8 Mridangam Performance",
      instrument: "Mridangam",
      level: 8,
      time: "09:00 AM",
      end: "12:00 PM",
      status: "active",
      room: "402B",
      image: 0,
    },
    {
      id: "thillana",
      venue: "Thillana Studio",
      title: "Dance examination",
      instrument: "Dance",
      level: 5,
      time: "01:30 PM",
      end: "04:30 PM",
      status: "upcoming",
      room: "201",
      image: 1,
    },
    {
      id: "tanjavur",
      venue: "Tanjavur Annex",
      title: "Bharatanatyam Grade 5",
      instrument: "Bharatanatyam",
      level: 5,
      time: "09:00 AM",
      end: "11:30 AM",
      status: "pending",
      room: "303",
      image: 2,
    },
    {
      id: "kriti",
      venue: "Kriti Gallery",
      title: "Grade 7 Carnatic Vocal Recital",
      instrument: "Carnatic Vocal",
      level: 7,
      time: "02:00 PM",
      end: "05:00 PM",
      status: "upcoming",
      room: "104",
      image: 3,
    },
  ];
  const names = [
    "Ananya Nair",
    "Sanjay Krishnan",
    "Shruti Iyer",
    "Siddharth Rajan",
    "Ashwin Pillai",
  ];
  const ids = [
    "772-ART-24",
    "819-MUS-24",
    "902-ART-24",
    "441-MUS-24",
    "552-ART-24",
  ];
  const candidates = names.map((name, i) => ({
    id: ids[i],
    name,
    sessionId: "mozart",
    age: 14 + i,
    code: [
      "MUS-7K9P-2X4Q",
      "MUS-3H8R-6N2V",
      "MUS-5J1W-9T7B",
      "MUS-8D4L-3F6C",
      "MUS-2R7N-5P9K",
    ][i],
    status: i === 2 || i === 4 ? "verified" : "pending",
    consumed: i === 2 || i === 4,
    eligible: true,
    idPresented: true,
    admissionPresented: true,
    expiresAt: "2099-12-31T23:59:59Z",
    applicationDate: "Jan 12",
    reviewDate: "Jan 15",
  }));
  candidates.push({
    ...candidates[1],
    id: "630-DAN-24",
    name: "Meera Kumar",
    sessionId: "thillana",
    code: "MUS-6A2E-8Y3U",
    status: "pending",
    consumed: false,
  });
  return {
    version: 1,
    user: null,
    profile: { ...demoUser },
    sessions,
    candidates,
    events: [],
  };
}
export function assertAccess(state, sessionId) {
  if (
    !state.user ||
    state.user.role !== "supervisor" ||
    !state.user.emailVerified ||
    !Array.isArray(state.user.assignedSessions)
  )
    throw new Error("Please sign in with a verified Supervisor account.");
  if (
    !state.user.assignedSessions.includes(sessionId) ||
    !state.sessions.some((s) => s.id === sessionId)
  )
    throw new Error("unauthorized");
}
export function lookup(state, sessionId, code) {
  assertAccess(state, sessionId);
  if (!code.trim()) throw new Error("Enter an admission or registration code.");
  const value = code.trim().replace(/^#/, "").toUpperCase();
  const candidate = state.candidates.find(
    (c) => c.code.toUpperCase() === value || c.id.toUpperCase() === value,
  );
  if (!candidate)
    throw new Error("No candidate found. Check the code and try again.");
  if (candidate.sessionId !== sessionId) throw new Error("unauthorized");
  if (candidate.consumed || candidate.status === "verified")
    throw new Error("used");
  if (new Date(candidate.expiresAt).getTime() <= Date.now())
    throw new Error(
      "This admission code has expired. Contact the examination board.",
    );
  if (!candidate.eligible)
    throw new Error(
      "This candidate has not met the examination eligibility requirements.",
    );
  if (state.sessions.find((s) => s.id === sessionId).status === "closed")
    throw new Error(
      "This session has closed. Attendance can no longer be changed.",
    );
  return candidate;
}
export function verify(state, sessionId, candidateId, documents) {
  const candidate = lookup(state, sessionId, candidateId);
  if (!documents?.idPresented || !documents?.admissionPresented)
    throw new Error(
      "Review and confirm both the ID card and admission slip before verifying.",
    );
  const at = new Date().toISOString();
  return {
    ...state,
    candidates: state.candidates.map((c) =>
      c.id === candidate.id
        ? {
            ...c,
            ...documents,
            status: "verified",
            consumed: true,
            verifiedAt: at,
            verifiedBy: state.user.id,
          }
        : c,
    ),
    events: [
      {
        id: crypto.randomUUID(),
        message: `${candidate.name} verified and admitted`,
        at,
      },
      ...state.events,
    ],
  };
}
export function markAbsent(state, sessionId, candidateId) {
  assertAccess(state, sessionId);
  const session = state.sessions.find((s) => s.id === sessionId);
  const candidate = state.candidates.find(
    (c) => c.id === candidateId && c.sessionId === sessionId,
  );
  if (
    session.status === "closed" ||
    !candidate ||
    candidate.status === "verified"
  )
    throw new Error("This attendance record cannot be changed.");
  return {
    ...state,
    candidates: state.candidates.map((c) =>
      c.id === candidateId
        ? { ...c, status: c.status === "absent" ? "pending" : "absent" }
        : c,
    ),
  };
}
export function submitAttendance(state, sessionId) {
  assertAccess(state, sessionId);
  if (state.sessions.find((s) => s.id === sessionId).status === "closed")
    throw new Error("Attendance has already been submitted for this session.");
  const roster = state.candidates.filter((c) => c.sessionId === sessionId);
  if (!roster.length)
    throw new Error("There are no candidates assigned to this session.");
  if (roster.some((c) => !["verified", "absent"].includes(c.status)))
    throw new Error(
      "Attendance is incomplete. Verify each pending candidate or mark them absent using the candidate actions.",
    );
  const at = new Date().toISOString();
  return {
    ...state,
    sessions: state.sessions.map((s) =>
      s.id === sessionId
        ? {
            ...s,
            status: "closed",
            submittedAt: at,
            submittedBy: state.user.id,
          }
        : s,
    ),
    events: [
      {
        id: crypto.randomUUID(),
        message: `Attendance submitted for ${state.sessions.find((s) => s.id === sessionId).venue}`,
        at,
      },
      ...state.events,
    ],
  };
}
export function readState(storage = localStorage) {
  const saved = storage.getItem(STORAGE_KEY);
  if (!saved) return initialState();
  const state = JSON.parse(saved);
  const isText = (value) =>
    typeof value === "string" && value.trim().length > 0;
  if (
    !state ||
    state.version !== 1 ||
    !Array.isArray(state.sessions) ||
    !Array.isArray(state.candidates) ||
    !Array.isArray(state.events) ||
    !state.profile ||
    !["firstName", "lastName", "email", "phone", "specialization"].every(
      (key) => isText(state.profile[key]),
    ) ||
    (state.user !== null &&
      (!state.user || !Array.isArray(state.user.assignedSessions))) ||
    state.sessions.some(
      (s) =>
        !s ||
        !isText(s.id) ||
        !isText(s.venue) ||
        !isText(s.instrument) ||
        !["active", "upcoming", "pending", "closed"].includes(s.status),
    ) ||
    state.events.some(
      (e) => !e || !isText(e.id) || !isText(e.message) || !isText(e.at),
    ) ||
    state.candidates.some(
      (c) =>
        !c ||
        !isText(c.id) ||
        !isText(c.name) ||
        !isText(c.sessionId) ||
        !isText(c.code) ||
        !Number.isFinite(Date.parse(c.expiresAt)) ||
        typeof c.eligible !== "boolean" ||
        typeof c.consumed !== "boolean" ||
        !["pending", "verified", "absent"].includes(c.status),
    )
  )
    throw new Error(
      "Saved Supervisor data is invalid. Restore the demo data to continue.",
    );
  return state;
}
