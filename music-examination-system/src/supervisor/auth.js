import { readState, STORAGE_KEY, demoUser } from './store.js';
const KEY = 'supervisor-demo-auth';
export function beginSupervisorSession() {
  const state = readState();
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, user: { ...demoUser } }));
  sessionStorage.setItem(KEY, 'active');
}
export const readStaffSession = () => sessionStorage.getItem(KEY) === 'active' ? { role: 'supervisor' } : null;
export const clearStaffSession = () => sessionStorage.removeItem(KEY);
