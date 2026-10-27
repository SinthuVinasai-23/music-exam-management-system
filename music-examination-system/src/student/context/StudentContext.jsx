import { portalRequest } from "../../auth/api.js";
import { validateSelection, portalConfig } from "../rules.js";
import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  useState,
  useEffect,
} from "react";
import {
  assignedSubjectTeachers,
  admissions,
  applicantProfile,
  seededApplications,
} from "../data/studentData.js";
import { subjectFee, todayLabel } from "../utils.js";

const StudentContext = createContext(null);
const storageKey = "musicExamStudentPortal";

function profileWithDisplayName(profile) {
  const name = profile?.name || applicantProfile.name;
  return {
    ...applicantProfile,
    ...profile,
    name,
    displayName: profile?.displayName || name.split(/\s+/)[0].toUpperCase(),
  };
}

function makeInitialDraft(profile = applicantProfile) {
  return {
    candidateName: profile.name,
    studentId: profile.candidateId || "",
    subjectSelections: {},
    dob: profile.dateOfBirth
      ? profile.dateOfBirth.split("-").reverse().join("/")
      : "",
    preferredMedium: "English",
    age: null,
    grade: "",
    teacher: "",
    photo: "",
    signature: "",
    signatureType: "",
    subjects: [],
  };
}

export function saveVerifiedStudentProfile(profile) {
  const safeProfile = profileWithDisplayName({
    ...profile,
    name: profile.name.trim(),
    email: profile.email.trim(),
    dateOfBirth: profile.dateOfBirth,
  });
  let existing = {};
  try {
    existing = JSON.parse(localStorage.getItem(storageKey)) || {};
  } catch {
    existing = {};
  }
  const sameAccount = existing.profile?.candidateId === profile.student_id;
  safeProfile.candidateId =
    profile.student_id ||
    (sameAccount && existing.profile?.candidateId
      ? existing.profile.candidateId
      : `${new Date().getFullYear()}/0000`);
  const savedAccount = JSON.parse(
    localStorage.getItem(`musicStudentPortal:${safeProfile.candidateId}`) ||
      "null",
  );
  if (!sameAccount && savedAccount) existing = savedAccount;
  const keepAccount = sameAccount || Boolean(savedAccount);
  const next = {
    profile: {
      ...safeProfile,
      results: safeProfile.results || [],
      subjectProgress: safeProfile.subjectProgress || {},
    },
    applications: [],
    draft: {
      ...makeInitialDraft(safeProfile),
      ...(keepAccount ? existing.draft || {} : {}),
      candidateName: keepAccount
        ? existing.draft?.candidateName || safeProfile.name
        : safeProfile.name,
    },
    activePaymentId: keepAccount ? existing.activePaymentId || null : null,
    lastPayment: keepAccount ? existing.lastPayment || null : null,
  };
  localStorage.setItem(storageKey, JSON.stringify(next));
  localStorage.setItem(
    `musicStudentPortal:${safeProfile.candidateId}`,
    JSON.stringify(next),
  );
  return next;
}

function loadState() {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey));
    if (stored) {
      const profile = profileWithDisplayName(stored.profile);
      return {
        ...stored,
        profile,
        draft: { ...makeInitialDraft(profile), ...stored.draft },
      };
    }
  } catch {
    localStorage.removeItem(storageKey);
  }
  return {
    profile: applicantProfile,
    applications: seededApplications,
    draft: makeInitialDraft(applicantProfile),
    activePaymentId: null,
    lastPayment: null,
  };
}

function persist(state) {
  localStorage.setItem(storageKey, JSON.stringify(state));
  localStorage.setItem(
    `musicStudentPortal:${state.profile.candidateId}`,
    JSON.stringify(state),
  );
  return state;
}

function reducer(state, action) {
  if (action.type === 'SYNC_SUBJECT_TEACHERS') {
    const selections = { ...state.draft.subjectSelections };
    let changed = false;
    for (const name of state.draft.subjects) {
      const subject = action.subjects.find(s => s.name === name);
      const assigned = assignedSubjectTeachers[subject?.id];
      const teacher = assigned && action.teachers.find(t => t.id === assigned.id);
      const choice = selections[name];
      if (teacher && choice && (choice.teacherId !== teacher.id || choice.teacher !== teacher.name || choice.teacherSchool !== teacher.school)) {
        selections[name] = { ...choice, teacherId: teacher.id, teacher: teacher.name, teacherSchool: teacher.school };
        changed = true;
      }
    }
    return changed ? persist({ ...state, draft: { ...state.draft, subjectSelections: selections } }) : state;
  }

  if (action.type === "RESET_DRAFT") {
    return persist({
      ...state,
      draft: makeInitialDraft(state.profile),
      activePaymentId: null,
    });
  }
  if (action.type === "UPDATE_DRAFT") {
    return persist({ ...state, draft: { ...state.draft, ...action.patch } });
  }
  if (action.type === "TOGGLE_SUBJECT") {
    const exists = state.draft.subjects.includes(action.subject);
    const subjects = exists
      ? state.draft.subjects.filter((item) => item !== action.subject)
      : [...state.draft.subjects, action.subject];
    return persist({ ...state, draft: { ...state.draft, subjects } });
  }
  if (action.type === "SERVER_STATE")
    return persist({ ...state, ...action.patch });
  if (action.type === "SET_ACTIVE_PAYMENT") {
    return persist({ ...state, activePaymentId: action.id });
  }
  if (action.type === "PAY_SUCCESS") {
    const applications = state.applications.map((item) =>
      item.id === action.id
        ? {
            ...item,
            paymentStatus: "Paid",
            applicationStatus: "In Review",
            admissionAvailable: true,
            payment: action.payment,
          }
        : item,
    );
    return persist({
      ...state,
      applications,
      lastPayment: { ...action.payment, applicationId: action.id },
    });
  }
  return state;
}

export function StudentProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);
  const [toast, setToast] = useState(null);
  const [learningData, setLearningData] = useState(null);
  const [catalog, setCatalog] = useState(null),
    [serverError, setServerError] = useState("");
  async function refresh() {
    try {
      const id = encodeURIComponent(state.profile.candidateId);
      const [catalogData, records, learning] = await Promise.all([
        portalRequest("catalog?studentId=" + id),
        portalRequest("applications?studentId=" + id),
        portalRequest("learning?studentId=" + id),
      ]);
      setCatalog(catalogData);
      dispatch({ type: 'SYNC_SUBJECT_TEACHERS', subjects: catalogData.subjects, teachers: catalogData.teachers });
      setLearningData(learning);
      localStorage.setItem(
        "musicExamConfig",
        JSON.stringify(catalogData.config),
      );
      dispatch({
        type: "SERVER_STATE",
        patch: {
          applications: records.applications,
          profile: profileWithDisplayName({
            ...catalogData.student,
            candidateId: catalogData.student.student_id,
          }),
        },
      });
      setServerError("");
    } catch (e) {
      setServerError(e.message);
    }
  }
  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 10000);
    const focus = () => refresh();
    window.addEventListener("focus", focus);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", focus);
    };
  }, [state.profile.candidateId]);
  async function submitApplication() {
    const entries = state.draft.subjects.flatMap((subject) =>
      state.draft.subjectSelections[subject].grades.map((grade) => ({
        subjectId: catalog.subjects.find((s) => s.name === subject).id,
        grade,
        teacherId: state.draft.subjectSelections[subject].teacherId,
      })),
    );
    const result = await portalRequest("applications", {
      studentId: state.profile.candidateId,
      preferredMedium: state.draft.preferredMedium,
      preferredLocation: state.draft.preferredLocation,
      entries,
    });
    dispatch({
      type: "SERVER_STATE",
      patch: {
        applications: [result.application, ...state.applications],
        activePaymentId: result.application.id,
      },
    });
    return result.application;
  }

  const activeApplication =
    state.applications.find((item) => item.id === state.activePaymentId) ||
    state.applications[0];
  function showToast(message, type = "success") {
    setToast({ message, type, id: Date.now() });
    window.setTimeout(() => setToast(null), 2800);
  }
  const value = useMemo(
    () => ({
      ...state,
      activeApplication,
      admissions,
      dispatch,
      todayLabel,
      toast,
      showToast,
      catalog,
      learningData,
      serverError,
      refresh,
      submitApplication,
    }),
    [state, activeApplication, toast, catalog, serverError, learningData],
  );
  return (
    <StudentContext.Provider value={value}>{children}</StudentContext.Provider>
  );
}

export function useStudent() {
  const value = useContext(StudentContext);
  if (!value) throw new Error("useStudent must be used inside StudentProvider");
  return value;
}
