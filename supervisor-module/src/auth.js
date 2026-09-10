export const STAFF_SESSION_KEY = "mems-staff-session-v1";

export const staffRoles = [
  { id: "teacher", label: "Teacher", available: false },
  { id: "supervisor", label: "Supervisor", available: true },
  { id: "examiner", label: "Examiner", available: false },
  { id: "admin", label: "Admin", available: false },
  { id: "super-admin", label: "Super Admin", available: false },
];

export function validateStaffCredentials(email, password) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail))
    return { error: "Enter a valid staff email address." };
  if (password.length < 8)
    return { error: "Password must contain at least 8 characters." };
  return { email: normalizedEmail };
}

export function createStaffSession(email, role) {
  if (!staffRoles.some((item) => item.id === role && item.available))
    throw new Error(
      "The selected staff portal is not available in this project.",
    );
  return { version: 1, email, role, authenticatedAt: new Date().toISOString() };
}

export function saveStaffSession(session, storage = sessionStorage) {
  storage.setItem(STAFF_SESSION_KEY, JSON.stringify(session));
}

export function readStaffSession(storage = sessionStorage) {
  try {
    const raw = storage.getItem(STAFF_SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (
      session?.version !== 1 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(session.email) ||
      !staffRoles.some((item) => item.id === session.role && item.available) ||
      !Number.isFinite(Date.parse(session.authenticatedAt))
    )
      return null;
    return session;
  } catch {
    return null;
  }
}

export function clearStaffSession(storage = sessionStorage) {
  storage.removeItem(STAFF_SESSION_KEY);
}
