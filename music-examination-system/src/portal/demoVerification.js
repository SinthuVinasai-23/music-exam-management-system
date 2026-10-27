// Temporary frontend preview only. Never authenticates a backend account.
export const frontendDemo = import.meta.env.VITE_FRONTEND_DEMO === 'true';
const pendingKey = 'music-preview-pending';
const sessionKey = 'music-preview-session';
export function beginDemoVerification({ name, email, role = 'student' }) {
  sessionStorage.removeItem(sessionKey);
  sessionStorage.setItem(pendingKey, JSON.stringify({ name: name || email.split('@')[0], email, role }));
}
export function pendingDemoVerification() {
  try { return JSON.parse(sessionStorage.getItem(pendingKey)); } catch { return null; }
}
export function finishDemoVerification(code) {
  if (code.trim() !== '2673') throw new Error('Incorrect verification code. Please try again.');
  const pending = pendingDemoVerification();
  if (!pending) throw new Error('Please register or log in first.');
  const user = { ...pending, id: 'preview-user', verified: true, approval: 'approved' };
  sessionStorage.setItem(sessionKey, JSON.stringify(user));
  sessionStorage.removeItem(pendingKey);
}
export function demoApi(path, method) {
  let user;
  try { user = JSON.parse(sessionStorage.getItem(sessionKey)); } catch { user = null; }
  if (path === '/session') return { user };
  if (path === '/logout') { sessionStorage.removeItem(sessionKey); return { ok: true }; }
  if (!user) throw new Error('Please verify your email to continue.');
  if (method === 'GET') {
    if (path === '/students') return user.role === 'parent' ? [] : [{ id: 'preview-student', public_id: 'STU-PREVIEW-001', name: user.name, user_id: user.id, dob: null, age: null }];
    if (path === '/catalog') return { subjects: [], levels: [], teachers: [], minimum_age: 6 };
    return [];
  }
  throw new Error('This is the frontend verification preview. This action is available in the connected portal.');
}
