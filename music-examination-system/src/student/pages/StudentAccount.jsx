import '../../styles/account-settings.css';
import { useState } from "react";
import { StudentShell } from "../components/StudentLayout.jsx";
import { useStudent } from "../context/StudentContext.jsx";
import { portalRequest } from "../../auth/api.js";
export default function StudentAccount() {
  const { profile, refresh } = useStudent(),
    [email, setEmail] = useState(profile.email || ""),
    [firstName, setFirstName] = useState(profile.firstName || ""),
    [lastName, setLastName] = useState(profile.lastName || ""),
    [medium, setMedium] = useState(profile.preferredMedium || "English"),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  return (
    <StudentShell className="account-settings-compact">
      <main className="student-shell learning-content student-account-layout"><aside className="student-account-photo"><img src="/home-subjects/vocal.jpg" alt="Default student profile portrait"/></aside>
        <section className="learning-account-card" id="personal-profile">
          <h2>Personal Profile</h2>
          <div className="ensemble-profile-fields"><label>First Name<input readOnly value={profile.firstName||''}/></label><label>Last Name<input readOnly value={profile.lastName||''}/></label><label>Date of Birth<input readOnly value={profile.dateOfBirth||''}/></label><label>Student ID<input readOnly value={profile.candidateId||''}/></label><label>Registration<input readOnly value={profile.registrationStatus||''}/></label></div>
          <p>Your registered name is locked. Only admin approval can change it. You can edit your email and medium below.</p>
          <details><summary>Request a name change</summary>
            {profile.nameChangeRequest && <p role="status">Name change: {profile.nameChangeRequest.status} — {profile.nameChangeRequest.firstName} {profile.nameChangeRequest.lastName}</p>}
            <form onSubmit={async e => {e.preventDefault();try {await portalRequest('name-change',{studentId:profile.candidateId,firstName,lastName});await refresh();setMessage('Name change sent to admin. Your registered name remains unchanged until approved.');setError('');}catch(e){setError(e.message)}}}>
              <label>Requested First Name<input required maxLength={100} value={firstName} onChange={e=>setFirstName(e.target.value)}/></label>
              <label>Requested Last Name<input required maxLength={100} value={lastName} onChange={e=>setLastName(e.target.value)}/></label>
              <button className="student-outline-btn compact" disabled={profile.nameChangeRequest?.status==='pending'}>Submit Name Change for Admin Approval</button>
            </form>
          </details>
          <form className="account-email-form" onSubmit={async e => {e.preventDefault();try {await portalRequest('student-profile',{studentId:profile.candidateId,email},'PUT');await refresh();setMessage('Email address saved.');setError('');}catch(e){setError(e.message)}}}>
            <h3>Contact Email</h3>
            <label>Email Address<input type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label>
            <button className="student-gold-btn compact">Save Email</button>
          </form>
          <form id="learning-preferences"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await portalRequest(
                  "preferences",
                  { studentId: profile.candidateId, medium },
                  "PUT",
                );
                await refresh();
                setMessage("Learning medium saved to your account.");
                setError("");
              } catch (e) {
                setError(e.message);
              }
            }}
          >
            <h3>Learning Preferences</h3>
            <label>
              Preferred Learning Medium
              <select
                aria-label="Preferred Learning Medium"
                value={medium}
                onChange={(e) => setMedium(e.target.value)}
              >
                <option>English</option>
                <option>Tamil</option>
              </select>
            </label>
            <p>
              This preference is saved. You will not need to choose a language
              for every question.
            </p>
            <button className="student-gold-btn compact">
              Save Preferences
            </button>
          </form>
          {message && <p role="status">{message}</p>}
          {error && <p role="alert">{error}</p>}
        </section>
      </main>
    </StudentShell>
  );
}
