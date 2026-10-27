import { Fragment, useEffect, useState } from "react";
import { Navigate, useLocation, useParams } from "react-router-dom";
import { authSession, dashboardFor } from "./api.js";
import { selectParentChild } from "./api.js";
import { saveVerifiedStudentProfile } from "../student/context/StudentContext.jsx";
export default function ApplicantGate({ role, children }) {
  const [resolved, setResolved] = useState(null);
  const location = useLocation();
  const { studentSlug } = useParams();
  useEffect(() => {
    let active = true;
    authSession()
      .then(async (data) => {
        if (!active) return;
        let selected;
        if (data.user?.role === "student") selected = data.user;
        if (data.user?.role === "parent" && (studentSlug || role === "student"))
          selected = studentSlug
            ? await selectParentChild(studentSlug)
            : data.selectedStudent;
        if (
          selected &&
          selected.registrationStatus === "approved" &&
          selected.verificationStatus === "approved"
        )
          saveVerifiedStudentProfile(selected);
        setResolved({ path: location.pathname, data, selected });
      })
      .catch(
        (error) =>
          active &&
          setResolved({ path: location.pathname, error: error.message }),
      );
    return () => {
      active = false;
    };
  }, [location.pathname, role, studentSlug]);
  if (resolved?.path !== location.pathname)
    return (
      <main className="page-shell" role="status">
        Loading your account…
      </main>
    );
  if (resolved.error)
    return (
      <main className="page-shell">
        <p role="alert">{resolved.error}</p>
        <a href="/parent/dashboard">Back to Parent Dashboard</a>
      </main>
    );
  const { data: session, selected } = resolved;
  if (!session.user)
    return (
      <Navigate to={session.pending ? "/verify-email" : "/login"} replace />
    );
  if (session.user.registrationStatus !== "approved")
    return (
      <main className="page-shell">
        Registration approval: {session.user.registrationStatus || "pending"}
      </main>
    );
  if (session.user.verificationStatus !== "approved")
    return <Navigate to="/verify-email" replace />;
  const parentManagingStudent =
    role === "student" && session.user.role === "parent" && selected;
  if (!role || (role !== session.user.role && !parentManagingStudent))
    return <Navigate to={dashboardFor(session.user)} replace />;
  if (studentSlug && !selected)
    return <Navigate to="/parent/dashboard" replace />;
  if (
    selected &&
    (selected.registrationStatus !== "approved" ||
      selected.verificationStatus !== "approved")
  )
    return (
      <main className="page-shell">
        Student approval and verification are required.
      </main>
    );
  return (
    <Fragment key={selected?.student_id || session.user.id}>
      {children}
    </Fragment>
  );
}
