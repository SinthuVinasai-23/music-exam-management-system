import { frontendDemo, demoApi } from './demoVerification';
let csrf;
export async function api(path, method = 'GET', data) {
  if (frontendDemo) return demoApi(path, method);
  if (!csrf && method !== 'GET') await sessionInfo();
  const response = await fetch(`/api${path}`, { method, credentials: 'same-origin', headers: { ...(data instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...(method !== 'GET' ? { 'X-CSRF-Token': csrf } : {}) }, ...(data !== undefined ? { body: data instanceof FormData ? data : JSON.stringify(data) } : {}) });
  const value = await response.json();
  if (!response.ok) throw new Error(value.error || 'Request failed');
  if (value.csrf) csrf = value.csrf;
  return value;
}
export async function sessionInfo() { const value = await api('/session'); csrf = value.csrf; return value; }
export const money = cents => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format((cents || 0) / 100);
export function candidateAge(dob) {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dob || '')) return null;
  const [day, month, year] = dob.split('/').map(Number); const d = new Date(year, month - 1, day); const t = new Date();
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day || d > t) return null;
  return t.getFullYear() - year - (t.getMonth() < month - 1 || (t.getMonth() === month - 1 && t.getDate() < day) ? 1 : 0);
}
