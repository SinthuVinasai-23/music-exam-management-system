import { createContext, useContext, useEffect, useReducer, useState } from 'react';
import { examinerReducer, initialExaminerState, STORAGE_KEY } from './examinerState.js';

const ExaminerContext = createContext(null);
function restore() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (stored?.version === 1 && Array.isArray(stored.sessions) && stored.profile && Array.isArray(stored.tasks) && Array.isArray(stored.notifications)) return stored;
  } catch { /* A damaged saved preview should not prevent the portal from opening. */ }
  return initialExaminerState();
}
export function ExaminerProvider({ children }) {
  const [state, dispatch] = useReducer(examinerReducer, undefined, restore);
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState('');
  const [storageError, setStorageError] = useState('');
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
      const sessions = state.sessions.map(s => {
        const moderated = stored?.sessions?.find(item => item.id === s.id && item.moderatedAt);
        return s.status === 'Submitted for Admin Review' && moderated ? moderated : s;
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, sessions })); setStorageError('');
    }
    catch { setStorageError('Changes could not be saved in this browser. Free browser storage before refreshing.'); }
  }, [state]);
  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(''), 4500);
    return () => clearTimeout(timer);
  }, [notice]);
  return <ExaminerContext.Provider value={{ state, dispatch, search, setSearch, notice, setNotice, storageError }}>{children}</ExaminerContext.Provider>;
}
export const useExaminer = () => useContext(ExaminerContext);
