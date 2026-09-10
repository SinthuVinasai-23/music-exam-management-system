import { createContext, useContext, useMemo, useReducer, useState } from 'react';
import { admissions, applicantProfile, seededApplications } from '../data/studentData.js';
import { subjectFee, todayLabel } from '../utils.js';

const StudentContext = createContext(null);
const storageKey = 'musicExamStudentPortal';

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
    dob: '',
    age: null,
    grade: '',
    teacher: '',
    signature: '',
    signatureType: '',
    subjects: [],
  };
}

export function saveVerifiedStudentProfile(profile) {
  const safeProfile = profileWithDisplayName({
    name: profile.name.trim(),
    email: profile.email.trim(),
    dateOfBirth: profile.dateOfBirth,
    verified: true,
  });
  let existing = {};
  try {
    existing = JSON.parse(localStorage.getItem(storageKey)) || {};
  } catch {
    existing = {};
  }
  const next = {
    profile: safeProfile,
    applications: existing.applications || seededApplications,
    draft: { ...makeInitialDraft(safeProfile), ...(existing.draft || {}), candidateName: safeProfile.name, dob: '' },
    activePaymentId: existing.activePaymentId || null,
    lastPayment: existing.lastPayment || null,
  };
  localStorage.setItem(storageKey, JSON.stringify(next));
  return next;
}

function loadState() {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey));
    if (stored) {
      const profile = profileWithDisplayName(stored.profile);
      return { ...stored, profile, draft: { ...makeInitialDraft(profile), ...stored.draft } };
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
  return state;
}

function reducer(state, action) {
  if (action.type === 'RESET_DRAFT') {
    return persist({ ...state, draft: makeInitialDraft(state.profile), activePaymentId: null });
  }
  if (action.type === 'UPDATE_DRAFT') {
    return persist({ ...state, draft: { ...state.draft, ...action.patch } });
  }
  if (action.type === 'TOGGLE_SUBJECT') {
    const exists = state.draft.subjects.includes(action.subject);
    const subjects = exists ? state.draft.subjects.filter((item) => item !== action.subject) : [...state.draft.subjects, action.subject];
    return persist({ ...state, draft: { ...state.draft, subjects } });
  }
  if (action.type === 'CREATE_APPLICATION') {
    const existing = state.activePaymentId && state.applications.find((item) => item.id === state.activePaymentId);
    const total = state.draft.subjects.length * subjectFee(state.draft.grade);
    const next = {
      id: existing?.id || `APP-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      title: `${state.draft.subjects[0] || 'Music'} - ${state.draft.grade}${state.draft.subjects.length > 1 ? ' Bundle' : ''}`,
      candidateName: state.draft.candidateName.trim(),
      dob: state.draft.dob,
      age: state.draft.age,
      grade: state.draft.grade,
      teacher: state.draft.teacher,
      subjects: state.draft.subjects,
      signature: state.draft.signature,
      session: 'Winter Session 2026',
      applicationStatus: 'Approved for Payment',
      paymentStatus: 'Required',
      admissionAvailable: false,
      total,
      payment: null,
    };
    const applications = existing ? state.applications.map((item) => (item.id === next.id ? next : item)) : [next, ...state.applications];
    return persist({ ...state, applications, activePaymentId: next.id });
  }
  if (action.type === 'SET_ACTIVE_PAYMENT') {
    return persist({ ...state, activePaymentId: action.id });
  }
  if (action.type === 'PAY_SUCCESS') {
    const applications = state.applications.map((item) => (
      item.id === action.id
        ? { ...item, paymentStatus: 'Paid', applicationStatus: 'In Review', admissionAvailable: true, payment: action.payment }
        : item
    ));
    return persist({ ...state, applications, lastPayment: { ...action.payment, applicationId: action.id } });
  }
  return state;
}

export function StudentProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);
  const [toast, setToast] = useState(null);
  const activeApplication = state.applications.find((item) => item.id === state.activePaymentId) || state.applications[0];
  function showToast(message, type = 'success') {
    setToast({ message, type, id: Date.now() });
    window.setTimeout(() => setToast(null), 2800);
  }
  const value = useMemo(() => ({ ...state, activeApplication, admissions, dispatch, todayLabel, toast, showToast }), [state, activeApplication, toast]);
  return <StudentContext.Provider value={value}>{children}</StudentContext.Provider>;
}

export function useStudent() {
  const value = useContext(StudentContext);
  if (!value) throw new Error('useStudent must be used inside StudentProvider');
  return value;
}
