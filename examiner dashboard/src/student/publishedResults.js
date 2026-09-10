import { useEffect, useState } from 'react';
import { results as demoResults } from './data/studentData.js';
import { useStudent } from './context/StudentContext.jsx';
import { resultFor, validMark, SUBMITTED } from '../examiner/examinerState.js';

export function publishedResults(profile, applications, storage = localStorage) {
  let examiner = {}, admin = {};
  try { examiner = JSON.parse(storage.getItem('music-examiner-v1')) || {}; } catch { /* Missing preview data. */ }
  try { admin = JSON.parse(storage.getItem('music-admin-v1')) || {}; } catch { /* Missing preview data. */ }
  const demoSessions = { 'veena-diploma': 'rs4', 'bharatanatyam-grade-5': 'rs2' };
  const seeds = demoResults.filter(r => !demoSessions[r.id] || (admin.resultOverrides?.[demoSessions[r.id]]?.status || 'Published') === 'Published');
  const normalize = value => String(value || '').trim().toLowerCase();
  const live = (examiner.sessions || []).filter(s => s.status === SUBMITTED && s.published === true).flatMap(s =>
    s.candidates.filter(c => validMark(c.marks) && applications.some(a => {
      if (a.accountId ? a.accountId !== (profile.email || 'local-demo') : normalize(a.candidateName) !== normalize(profile.name)) return false;
      if (c.applicationId) return c.applicationId === a.id;
      // Older examiner records have no account ID: require an existing matching application.
      return normalize(c.name) === normalize(a.candidateName) && a.grade === s.level && a.subjects?.includes(s.subject);
    })).map(c => ({
      id: `published-${s.id}-${c.id}`, live: true, candidateName: c.name,
      subject: s.subject, grade: s.level, score: Number(c.marks), classification: resultFor(c.marks).grade,
      date: s.date, registration: c.registration, feedback: c.feedback,
    })));
  return [...live, ...seeds];
}

export function usePublishedResults() {
  const { profile, applications } = useStudent();
  const [, refresh] = useState(0);
  useEffect(() => {
    const update = () => refresh(n => n + 1);
    window.addEventListener('storage', update);
    window.addEventListener('portal-results-changed', update);
    window.addEventListener('focus', update);
    return () => {
      window.removeEventListener('storage', update);
      window.removeEventListener('portal-results-changed', update);
      window.removeEventListener('focus', update);
    };
  }, []);
  return publishedResults(profile, applications);
}
