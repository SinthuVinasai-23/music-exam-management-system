import { validMark } from '../examiner/examinerState.js';
export const STORAGE_KEY = 'music-admin-v1';
export const EXAMINER_KEY = 'music-examiner-v1';

const instruments = ['Mridangam', 'Bharatanatyam', 'Veena', 'Carnatic Vocal', 'Violin', 'Flute', 'Carnatic Music Theory'];
const grades = ['Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 7', 'Grade 8', 'Diploma'];
const teachers = [
  ['Prof. Julian Vane', 'London Guildhall'],
  ['Dr. Maria Elena', 'Madrid Conservatory'],
  ['Sarah Jenkins', 'Independent Study'],
  ['Viktor Strauss', 'Vienna Academy'],
  ['Dr. Karthik Iyer', 'Chennai School of Music'],
  ['Meera Ramanathan', 'Julianne Conservatory'],
];
const firstNames = ['Sanjay', 'Shruti', 'Siddharth', 'Ashwin', 'Ananya', 'Kavya', 'Arjun', 'Meera', 'Rohan', 'Divya', 'Vikram', 'Nithya', 'Aditya', 'Lakshmi', 'Hari', 'Priya', 'Bala', 'Ravi', 'Anjali', 'Karthik'];
const lastNames = ['Krishnan', 'Iyer', 'Rajan', 'Pillai', 'Raman', 'Shankar', 'Kumar', 'Nair', 'Menon', 'Chandran', 'Subramaniam', 'Rao', 'Prasad', 'Anand'];
const statuses = ['Urgent Review', 'Pending Review', 'Approved', 'Queried'];
const bios = [
  'is a dedicated performer with over eight years of formal training, focusing on classical repertoire under close mentorship.',
  'has earned distinctions in prior examinations and continues to pursue advanced technical mastery of the instrument.',
  'is preparing for their next milestone assessment with a strong emphasis on interpretive nuance and stage presence.',
  'balances rigorous academic study with an evolving commitment to performance excellence.',
];

function pad(n, len) { return String(n).padStart(len, '0'); }
function seedRand(seed) { let s = seed; return () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; }; }

function buildApplication(i) {
  const rand = seedRand(i * 97 + 13);
  const first = firstNames[i % firstNames.length];
  const last = lastNames[Math.floor(rand() * lastNames.length)];
  const name = `${first} ${last}`;
  const [teacher, institution] = teachers[i % teachers.length];
  const instrument = instruments[i % instruments.length];
  const grade = grades[i % grades.length];
  const status = statuses[i % statuses.length];
  const accountId = `ACC-${1000 + Math.floor(i / 7)}`;
  const day = 1 + (i % 27);
  return {
    id: `APP-2024-${pad(i + 1, 3)}`,
    regId: `#${100 + i}-${['ART', 'CEL', 'HRP', 'VIO', 'PNO', 'STR'][i % 6]}-24`,
    accountId,
    candidateName: name,
    teacher, institution,
    instrument, grade,
    programLabel: `${instrument} – ${grade}`,
    submission: `Jan ${day}, 2024`,
    status,
    age: 14 + (i % 12),
    descriptor: i % 3 === 0 ? 'Aspiring Virtuoso • Classical Performance Major' : i % 3 === 1 ? 'Distinguished Candidate • Advanced Performance Track' : 'Emerging Talent • Conservatory Applicant',
    bio: `${first} ${bios[i % bios.length]} Currently under the tutelage of ${teacher}, they focus on the ${instrument} repertoire appropriate to ${grade}.`,
    document: { label: `${grade} Certificate`, file: `${first}${last}_${grade.replace(/\s+/g, '')}.pdf` },
    timeline: [
      { label: 'Application Submitted', at: `${day}/01/2024 • 09:42 AM`, note: 'Portal submission complete by candidate.' },
      ...(status !== 'Pending Review' && status !== 'Urgent Review' ? [{ label: `Application ${status}`, at: `${day + 2}/01/2024 • 11:10 AM`, note: `Reviewed by administration and marked ${status.toLowerCase()}.` }] : []),
    ],
  };
}

export const APPLICATIONS = Array.from({ length: 128 }, (_, i) => buildApplication(i));

export function allApplications() {
  let applications = [];
  try { applications = JSON.parse(localStorage.getItem('musicExamStudentPortal'))?.applications || []; } catch { /* Missing preview state. */ }
  return [...applications.filter(a => a.createdAt).map(a => ({
    ...a, regId: a.id, instrument: a.subjects.join(', '), programLabel: a.title,
    institution: 'Student Portal', submission: a.createdAt.slice(0, 10), status: 'Pending Review',
    descriptor: 'Examination applicant', bio: `${a.candidateName} applied for ${a.title}. Payment: ${a.paymentStatus}.`,
    document: { label: 'Applicant signature', file: 'signature.png', src: a.signature },
    timeline: [{ label: 'Application Submitted', at: a.createdAt, note: a.session }],
  })), ...APPLICATIONS];
}

export const VENUES = [
  { id: 'V1', name: 'Main Concert Hall', status: 'Active', location: 'Central Wing, Level 2', capacity: 450, extra: 'Premium', extraLabel: 'Acoustics' },
  { id: 'V2', name: 'Studio A', status: 'Active', location: 'North Annex, Ground Floor', capacity: 12, extra: 'Practice Room', extraLabel: 'Type' },
  { id: 'V3', name: 'Recital Room 4', status: 'Maintenance', location: 'East Wing, Level 1', capacity: 45, extra: 'Tuning', extraLabel: 'Status' },
];

export const FEE_LEVELS = [
  { id: 'foundation', name: 'Foundation Grade (1-3)', fee: 120 },
  { id: 'intermediate', name: 'Intermediate Grade (4-6)', fee: 185 },
  { id: 'advanced', name: 'Advanced Grade (7-8)', fee: 240 },
  { id: 'diploma', name: 'Diploma (LRSM/FRSM)', fee: 450 },
];

export const LEVEL_DEFINITIONS = [
  { id: 'lvl-diploma-pro', name: 'Professional Diploma', rank: 'Level 9 (Expert)', overview: 'Advanced performance criteria covering specialized repertoire, historical performance practice, and technical mastery of selected instrument.' },
];

export const TIME_TEMPLATES = [
  { id: 't1', name: 'Morning Session A', desc: 'Primary session for Grades 1-4', start: '09:00', end: '10:30', duration: 90, venue: 'Recital Hall Main' },
  { id: 't2', name: 'Mid-Morning Advanced', desc: 'Extended duration for Diploma levels', start: '11:00', end: '13:00', duration: 120, venue: 'Studio B' },
  { id: 't3', name: 'Afternoon Recital', desc: 'Open performance examinations', start: '14:00', end: '15:30', duration: 90, venue: 'Recital Hall Main' },
  { id: 't4', name: 'Sunset Evaluation', desc: 'Theory and composition assessments', start: '16:00', end: '17:30', duration: 90, venue: 'Chamber Room' },
  { id: 't5', name: 'Early Bird Foundations', desc: 'Grade 1-2 gentle-start sessions', start: '08:00', end: '09:00', duration: 60, venue: 'Studio A' },
  { id: 't6', name: 'Evening Ensemble', desc: 'Group and ensemble evaluations', start: '17:45', end: '19:15', duration: 90, venue: 'Recital Hall Main' },
];

const teacherUsers = [
  { id: 'u-t1', name: 'Sanjay Krishnan', contact: 'e.rostropovich@conservatory.edu', role: 'Senior Flute Pedagogue', status: 'Active' },
  { id: 'u-t2', name: 'Shruti Iyer', contact: 'j.thorne@academy.music', role: 'Head of Strings', status: 'Active' },
  { id: 'u-t3', name: 'Siddharth Rajan', contact: 's.montgomery@admin.org', role: 'Junior Accompanist', status: 'Inactive' },
  { id: 'u-t4', name: 'Ashwin Pillai', contact: 'm.vance@board.com', role: 'Chief Examiner', status: 'Active' },
];
const examinerUsers = teacherUsers.map((u, i) => ({ ...u, id: `u-e${i + 1}`, role: ['Senior Examiner', 'Practical Evaluator', 'Theory Examiner', 'Panel Chair'][i] }));
const invigilatorUsers = teacherUsers.map((u, i) => ({ ...u, id: `u-i${i + 1}`, role: ['Hall Invigilator', 'Floor Coordinator', 'Session Marshal', 'Lead Invigilator'][i] }));

export const USERS = { Teachers: teacherUsers, Examiners: examinerUsers, Invigilators: invigilatorUsers };

export const CEREMONY_SESSIONS = [
  { id: 'cs1', label: 'Morning Session', name: 'Morning Block - Veena', venue: 'Main Concert Hall', time: '09:00 AM - 12:30 PM', booked: 360, capacity: 450 },
  { id: 'cs2', label: 'Afternoon Session', name: 'Afternoon Block - Strings', venue: 'Chamber Hall West', time: '02:00 PM - 05:30 PM', booked: 150, capacity: 250 },
];

export const CEREMONY_ATTENDANCE = [
  { id: 'ca1', accountId: 'ACC-1000', candidate: 'Sanjay Krishnan', regId: 'RCM-2024-0492', instrument: 'Mridangam', level: 'Level 10 Performance', award: 'Distinction', rsvp: 'Attending', seat: 'A-12', passed: true, sessionId: 'cs1' },
  { id: 'ca2', accountId: 'ACC-1001', candidate: 'Siddharth Rajan', regId: 'RCM-2024-0211', instrument: 'Mridangam', level: 'ARCT Diploma', award: 'Merit', rsvp: 'Not Attending', seat: '', passed: true, sessionId: 'cs1' },
  { id: 'ca3', accountId: 'ACC-1000', candidate: 'Bala Subramaniam', regId: 'RCM-2024-1055', instrument: 'Veena', level: 'Level 9 Performance', award: 'Distinction', rsvp: 'Attending', seat: 'B-04', passed: true, sessionId: 'cs1' },
  { id: 'ca4', accountId: 'ACC-1002', candidate: 'Kavya Natarajan', regId: 'RCM-2024-0088', instrument: 'Carnatic Vocal', level: 'Level 10 Performance', award: 'First Class Honours', rsvp: 'Pending', seat: 'C-22', passed: true, sessionId: 'cs1' },
];

export const EMAIL_LOGS = [
  { id: 'e1', at: 'Oct 24, 2024 • 10:45 AM', recipient: 'l.henderson@email.com', type: 'Slot Allocation', status: 'Delivered', attempts: 0 },
  { id: 'e2', at: 'Oct 24, 2024 • 09:12 AM', recipient: 'm.valencia@music-inst.org', type: 'Result Published', status: 'Failed', attempts: 0 },
  { id: 'e3', at: 'Oct 24, 2024 • 08:30 AM', recipient: 'a.davis@email.com', type: 'Registration OTP', status: 'Retrying', attempts: 2 },
  { id: 'e4', at: 'Oct 23, 2024 • 16:45 PM', recipient: 's.chen@conservatory.edu', type: 'Instructor Welcome', status: 'Delivered', attempts: 0 },
  { id: 'e5', at: 'Oct 23, 2024 • 14:20 PM', recipient: 'admin@local-orchestra.org', type: 'Billing Invoice', status: 'Failed', attempts: 0 },
  { id: 'e6', at: 'Oct 23, 2024 • 12:05 PM', recipient: 'r.gomez@email.com', type: 'Admission Card', status: 'Delivered', attempts: 0 },
  { id: 'e7', at: 'Oct 22, 2024 • 17:40 PM', recipient: 'p.singh@academy.music', type: 'Session Reminder', status: 'Undeliverable / Admin Review', attempts: 3 },
];

export const RESULT_SESSIONS_SEED = [
  { id: 'rs1', name: 'Mridangam Performance Grade 8', sessionRef: 'PR-2024-001', examiner: 'Prof. Ranganathan Iyer', candidates: 42, avg: 88, status: 'Pending', discrepancy: false },
  { id: 'rs2', name: 'Bharatanatyam – Grade 5', sessionRef: 'VS-2024-042', examiner: 'Dr. Meenakshi Pillai', candidates: 12, avg: 74, status: 'Published', discrepancy: false },
  { id: 'rs3', name: 'Carnatic Vocal Performance – L2', sessionRef: 'VT-2024-019', examiner: 'Mrs. Anjali Menon', candidates: 58, avg: 81, status: 'Pending', discrepancy: true },
  { id: 'rs4', name: 'Veena – Diploma', sessionRef: 'CM-2024-008', examiner: 'Mr. Karthik Natarajan', candidates: 8, avg: 92, status: 'Published', discrepancy: false },
];

export function initialAdminState() {
  return {
    version: 1,
    admin: { name: 'Dr. Srinivasan', role: 'Admin', avatar: '' },
    venues: VENUES,
    feeLevels: FEE_LEVELS,
    levelDefinitions: LEVEL_DEFINITIONS,
    timeTemplates: TIME_TEMPLATES,
    schedulingWindow: { start: '08:00 AM', end: '06:00 PM', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
    bufferLogic: { interExamBuffer: 15, examinerBreakInterval: 4, overtimeProtection: true },
    automation: { autoPublishResults: true, candidateEarlyAccess: false, bufferDuration: 15 },
    users: USERS,
    resultOverrides: {},
    ceremonySessions: CEREMONY_SESSIONS,
    ceremonyAttendance: CEREMONY_ATTENDANCE,
    emailLogs: EMAIL_LOGS,
    applicationOverrides: {},
    tasks: [],
  };
}

export function restoreAdminState() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (stored?.version === 1) return { ...initialAdminState(), ...stored };
  } catch { /* corrupted preview state should not block the portal */ }
  return initialAdminState();
}

function task(state, title, at) {
  return [{ id: `${at}-${state.tasks.length}`, title, at }, ...state.tasks].slice(0, 30);
}

export function adminReducer(state, action) {
  const at = action.at || new Date().toISOString();
  switch (action.type) {
    case 'TASK': return { ...state, tasks: task(state, action.title, at) };
    case 'SET_FEE': return { ...state, feeLevels: state.feeLevels.map(f => f.id === action.id ? { ...f, fee: action.fee } : f), tasks: task(state, `Updated fee for ${action.id}`, at) };
    case 'ADD_LEVEL': return { ...state, levelDefinitions: [...state.levelDefinitions, { id: `lvl-${Date.now()}`, ...action.level }], tasks: task(state, `Added exam level "${action.level.name}"`, at) };
    case 'SET_AUTOMATION': return { ...state, automation: { ...state.automation, ...action.patch } };
    case 'ADD_VENUE': return { ...state, venues: [...state.venues, { id: `V${Date.now()}`, ...action.venue }], tasks: task(state, `Added venue "${action.venue.name}"`, at) };
    case 'EDIT_VENUE': return { ...state, venues: state.venues.map(v => v.id === action.id ? { ...v, ...action.patch } : v), tasks: task(state, `Updated venue ${action.id}`, at) };
    case 'SET_SCHEDULING_WINDOW': return { ...state, schedulingWindow: { ...state.schedulingWindow, ...action.patch } };
    case 'SET_BUFFER_LOGIC': return { ...state, bufferLogic: { ...state.bufferLogic, ...action.patch } };
    case 'ADD_TEMPLATE': return { ...state, timeTemplates: [...state.timeTemplates, { id: `t-${Date.now()}`, ...action.template }], tasks: task(state, `Added time template "${action.template.name}"`, at) };
    case 'EDIT_TEMPLATE': return { ...state, timeTemplates: state.timeTemplates.map(t => t.id === action.id ? { ...t, ...action.patch } : t) };
    case 'DELETE_TEMPLATE': return { ...state, timeTemplates: state.timeTemplates.filter(t => t.id !== action.id), tasks: task(state, 'Deleted a time-slot template', at) };
    case 'ADD_USER': return { ...state, users: { ...state.users, [action.tab]: [...state.users[action.tab], { id: `u-${Date.now()}`, ...action.user }] }, tasks: task(state, `Added ${action.tab.slice(0, -1)} "${action.user.name}"`, at) };
    case 'TOGGLE_USER_STATUS': return { ...state, users: { ...state.users, [action.tab]: state.users[action.tab].map(u => u.id === action.id ? { ...u, status: u.status === 'Active' ? 'Inactive' : 'Active' } : u) } };
    case 'EDIT_USER': return { ...state, users: { ...state.users, [action.tab]: state.users[action.tab].map(u => u.id === action.id ? { ...u, ...action.user } : u) }, tasks: task(state, `Edited user ${action.id}`, at) };
    case 'SET_RESULT_OVERRIDE': return { ...state, resultOverrides: { ...state.resultOverrides, [action.id]: { ...state.resultOverrides[action.id], ...action.patch } }, tasks: task(state, action.taskTitle || `Updated result session ${action.id}`, at) };
    case 'ADD_CEREMONY_SESSION': return { ...state, ceremonySessions: [...state.ceremonySessions, { id: `cs-${Date.now()}`, ...action.session }], tasks: task(state, `Created ceremony session "${action.session.name}"`, at) };
    case 'UPDATE_ATTENDANCE': {
      const accounts = state.ceremonyAttendance.filter(a => action.ids.includes(a.id)).map(a => a.accountId);
      const affected = a => action.ids.includes(a.id) || ('sessionId' in action.patch && accounts.includes(a.accountId));
      if (state.ceremonyAttendance.some(a => affected(a) && !a.passed && (action.patch.sessionId || action.patch.rsvp === 'Attending'))) return state;
      return { ...state, ceremonyAttendance: state.ceremonyAttendance.map(a => action.ids.includes(a.id) ? { ...a, ...action.patch } : affected(a) ? { ...a, sessionId: action.patch.sessionId } : a), tasks: task(state, action.taskTitle || 'Updated ceremony attendance', at) };
    }
    case 'EMAIL_RETRY': return { ...state, emailLogs: state.emailLogs.map(e => {
      if (e.id !== action.id || e.attempts >= 3 || e.status === 'Delivered') return e;
      const next = action.next(e);
      const attempts = Math.min(3, Math.max(e.attempts, next.attempts));
      return { ...next, attempts, status: attempts === 3 ? 'Undeliverable / Admin Review' : next.status };
    }) };
    case 'SET_APPLICATION_STATUS': return { ...state, applicationOverrides: { ...state.applicationOverrides, [action.id]: { ...state.applicationOverrides[action.id], status: action.status } }, tasks: task(state, `Application ${action.id} marked ${action.status}`, at) };
    case 'WORKFLOW_UPDATE': return { ...state, applicationOverrides: { ...state.applicationOverrides, [action.id]: { ...state.applicationOverrides[action.id], ...action.patch } }, tasks: task(state, action.taskTitle || `Updated workflow for ${action.id}`, at) };
    default: return state;
  }
}

export function resolvedApplication(state, id) {
  const base = allApplications().find(a => a.id === id);
  if (!base) return null;
  const override = state.applicationOverrides[id];
  return override ? { ...base, ...override } : base;
}

// --- Cross-portal bridge: read the Examiner portal's submitted sessions so
// Results Moderation reflects genuine examiner submissions, and publishing
// here writes the `published` flag the Student portal already reads from.
export function readExaminerSessions() {
  try {
    const stored = JSON.parse(localStorage.getItem(EXAMINER_KEY));
    if (Array.isArray(stored?.sessions)) return stored.sessions;
  } catch { /* ignore corrupt/missing examiner storage */ }
  return [];
}

export function setExaminerSessionPublished(sessionId, published) {
  try {
    const stored = JSON.parse(localStorage.getItem(EXAMINER_KEY));
    if (!stored || !Array.isArray(stored.sessions)) return false;
    const session = stored.sessions.find(s => s.id === sessionId);
    if (!session || session.status !== 'Submitted for Admin Review' || (published && !session.candidates.every(c => validMark(c.marks)))) return false;
    stored.sessions = stored.sessions.map(s => s.id === sessionId ? { ...s, published, moderatedAt: new Date().toISOString() } : s);
    localStorage.setItem(EXAMINER_KEY, JSON.stringify(stored));
    window.dispatchEvent(new Event('portal-results-changed'));
    return true;
  } catch { return false; }
}
