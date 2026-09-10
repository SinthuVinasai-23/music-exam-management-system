import { classify } from '../student/utils.js';

export const EXAMINER_ID = 'examiner-subramaniam';
export const STORAGE_KEY = 'music-examiner-v1';
export const SUBMITTED = 'Submitted for Admin Review';
export function validMark(value) {
  return /^(?:\d{1,3})(?:\.\d{1,2})?$/.test(String(value)) && Number(value) >= 0 && Number(value) <= 100;
}
export function resultFor(value) {
  if (!validMark(value)) return { grade: '', outcome: 'Pending' };
  const grade = classify(Number(value));
  return { grade: grade === 'Review' ? 'Fail' : grade, outcome: grade === 'Review' ? 'Fail' : 'Pass' };
}
const names = ['Sanjay Krishnan', 'Shruti Iyer', 'Siddharth Rajan', 'Ashwin Pillai', 'Ananya Raman', 'Kavya Shankar', 'Arjun Kumar', 'Meera Nair', 'Rohan Menon', 'Divya Chandran', 'Vikram Iyer', 'Nithya Rao', 'Aditya Prasad', 'Lakshmi Anand', 'Hari Krishnan', 'Priya Mohan'];
function candidates(prefix, count, filled) {
  return Array.from({ length: count }, (_, i) => ({
    id: `${prefix}-${i + 1}`, name: names[i % names.length], registration: `${prefix}-${[9821, 9844, 9901, 9915][i] || 9920 + i}`,
    marks: i < filled ? String([88, 94, 42, 72][i % 4]) : '',
    feedback: { technical: '', artistic: '', overall: '' },
  }));
}
export function initialExaminerState() {
  return {
    version: 1,
    profile: { firstName: 'Dr. Subramaniam', lastName: 'rahul', email: 'subramaniam@aria-academy.edu', phone: '+94 77 123 4567', specialization: 'Carnatic Music', avatar: '' },
    activeSessionId: 'EX-2024-0019',
    sessions: [
      { id: 'EX-2024-0017', examinerId: EXAMINER_ID, venue: 'Raga Hall', subject: 'Bharatanatyam', level: 'Grade 5', cardTitle: 'Raga Hall - Bharatanatyam Grade 5', date: '2024-11-24', time: '09:00 AM', status: 'Draft', candidates: candidates('BHA-5', 4, 3), page: 1 },
      { id: 'EX-2024-0018', examinerId: EXAMINER_ID, venue: 'Thillana Studio', subject: 'Carnatic Vocal', level: 'Diploma', cardTitle: 'Thillana Studio - Diploma Carnatic', date: '2024-11-25', time: '02:30 PM', status: 'Not Started', candidates: candidates('VOC-D', 5, 0), page: 1 },
      { id: 'EX-2024-0020', examinerId: EXAMINER_ID, venue: 'Kriti Gallery', subject: 'Veena', level: 'Grade 7', cardTitle: 'Kriti Gallery - Grade 7 Veena', date: '2024-11-26', time: '11:00 AM', status: 'Draft', candidates: candidates('VEE-7', 5, 2), page: 1 },
      { id: 'EX-2024-0019', examinerId: EXAMINER_ID, venue: 'Main Hall', subject: 'Carnatic Vocal', level: 'Grade 3', cardTitle: 'Main Hall - Carnatic Vocal Grade 3', date: '2024-11-23', time: '09:00 AM', status: 'Draft', candidates: candidates('PNO-3', 20, 13), page: 1, supplementary: true },
      { id: 'EX-2024-0016', examinerId: EXAMINER_ID, venue: 'Conservatory Hall', subject: 'Carnatic Music', level: 'Grade 4', cardTitle: 'Conservatory Hall - Carnatic Music Grade 4', date: '2024-11-20', time: '10:00 AM', status: SUBMITTED, submittedAt: '2024-11-20T15:00:00.000Z', published: false, candidates: candidates('CAR-4', 14, 14), page: 1, supplementary: true },
    ],
    tasks: [],
    notifications: [
      { id: 'assignment', title: 'New examination assignment', body: 'Thillana Studio - Diploma Carnatic is ready to start.', sessionId: 'EX-2024-0018', read: false },
      { id: 'draft', title: 'Draft evaluation reminder', body: 'Continue your saved evaluation for Raga Hall - Bharatanatyam Grade 5.', sessionId: 'EX-2024-0017', read: false },
      { id: 'review', title: 'Submission received', body: 'Conservatory Hall results are awaiting administrator review.', read: true },
    ],
  };
}
export const assignedSessions = state => state.sessions.filter(s => s.examinerId === EXAMINER_ID);
export const progress = session => Math.round(session.candidates.filter(c => validMark(c.marks)).length / session.candidates.length * 100);
export function submissionError(session) {
  if (!session || session.examinerId !== EXAMINER_ID) return 'This examination is not assigned to you.';
  if (session.status === SUBMITTED) return 'This examination has already been submitted.';
  const missing = session.candidates.filter(c => !validMark(c.marks));
  return missing.length ? `Enter valid marks (0-100) for all candidates. ${missing.length} candidate${missing.length === 1 ? '' : 's'} still need marks: ${missing.map(c => c.name).join(', ')}.` : '';
}
function task(state, title, at) {
  return [{ id: `${at}-${state.tasks.length}`, title, at }, ...state.tasks].slice(0, 20);
}
export function examinerReducer(state, action) {
  const at = action.at || new Date().toISOString();
  if (action.type === 'PROFILE') return { ...state, profile: action.profile, tasks: task(state, 'Updated account profile', at) };
  if (action.type === 'TASK') return { ...state, tasks: task(state, action.title, at) };
  if (action.type === 'READ') return { ...state, notifications: state.notifications.map(n => action.id === 'all' || n.id === action.id ? { ...n, read: true } : n) };
  if (action.type === 'REQUEST') return { ...state, requested: true, tasks: task(state, 'Requested an additional examination session', at), notifications: [{ id: at, title: 'Session request recorded', body: 'Your additional-session request is awaiting administrator review.', read: false }, ...state.notifications] };
  const session = assignedSessions(state).find(s => s.id === action.sessionId);
  if (!session) return state;
  if (action.type === 'SELECT') return { ...state, activeSessionId: session.id, sessions: state.sessions.map(s => s.id === session.id && s.status === 'Not Started' ? { ...s, status: 'Draft' } : s), tasks: task(state, `Continued ${session.subject} ${session.level} evaluation`, at) };
  if (action.type === 'PAGE') return { ...state, sessions: state.sessions.map(s => s.id === session.id ? { ...s, page: Math.max(1, Math.min(action.page, Math.ceil(s.candidates.length / 4))) } : s) };
  if (session.status === SUBMITTED) return state;
  if (action.type === 'MARK' && action.value !== '' && !validMark(action.value)) return state;
  if (action.type === 'MARK' || action.type === 'FEEDBACK') return { ...state, sessions: state.sessions.map(s => s.id === session.id ? { ...s, status: 'Draft', candidates: s.candidates.map(c => c.id !== action.candidateId ? c : action.type === 'MARK' ? { ...c, marks: action.value } : { ...c, feedback: action.feedback }) } : s) };
  if (action.type === 'SAVE') return { ...state, sessions: state.sessions.map(s => s.id === session.id ? { ...s, status: 'Draft', lastSaved: at } : s), tasks: task(state, `Draft saved for ${session.subject} ${session.level}`, at) };
  if (action.type === 'SUBMIT' && !submissionError(session)) return { ...state, sessions: state.sessions.map(s => s.id === session.id ? { ...s, status: SUBMITTED, submittedAt: at, published: false, lastSaved: at } : s), tasks: task(state, `${session.subject} ${session.level} submitted for administrator review`, at), notifications: [{ id: at, title: 'Evaluation submitted for administrator review', body: `${session.subject} ${session.level} is now in your submission history.`, read: false }, ...state.notifications] };
  return state;
}
