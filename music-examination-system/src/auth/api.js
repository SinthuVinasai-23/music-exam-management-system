export const authPreview = import.meta.env.VITE_AUTH_PREVIEW !== "false";
let csrf;
const root = () => (authPreview ? "/api/portal" : "/api/auth");
export async function authSession() {
  const response = await fetch(root() + "/session", {
    credentials: "same-origin",
  });
  if (!response.ok)
    throw new Error(
      "Unable to connect to the account server. Start npm run dev.",
    );
  const data = await response.json();
  csrf = data.csrf;
  return data;
}
export async function portalRequest(
  path,
  values,
  method = values === undefined ? "GET" : "POST",
) {
  if (!csrf) await authSession();
  const response = await fetch("/api/portal/" + path, {
    method,
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
    body: values === undefined ? undefined : JSON.stringify(values),
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || "Unable to complete the request.");
  return data;
}
export async function authRequest(action, values = {}) {
  if (authPreview) return portalRequest(action, values);
  if (!csrf) await authSession();
  const response = await fetch(root() + "/" + action, {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },
    body: JSON.stringify(values),
  });
  const data = await response.json();
  if (data.csrf) csrf = data.csrf;
  if (!response.ok) {
    const error = new Error(data.error || "Unable to complete the request.");
    Object.assign(error, data);
    throw error;
  }
  return data;
}
export const dashboardFor = (user) =>
  user.role === "admin"
    ? "/dashboard/admin"
    : user.role === "teacher"
      ? "/teacher/exam-applications"
      : `/${user.role}/dashboard`;
export const selectParentChild = (studentId) =>
  portalRequest("select-child", { studentId });
