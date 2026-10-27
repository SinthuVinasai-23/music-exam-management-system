import { Deadline } from './ApplicationSelection.jsx';
import { deadlineError } from '../rules.js';
import { ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stepper } from '../components/StudentLayout.jsx';
import PracticeDashboardShell from '../components/PracticeDashboardShell.jsx';
import '../../styles/practice-dashboard.css';
import '../../styles/carnatic-dashboard.css';
import '../../styles/application-elegant.css';
import StudentPhoto from '../components/StudentPhoto.jsx';
import SignatureCanvas from '../components/SignatureCanvas.jsx';
import '../../styles/applicant-flow.css';
import { useStudent } from '../context/StudentContext.jsx';
import { formatDobInput, parseDob, validateName } from '../utils.js';

export default function ApplicationStep1() {
  const { draft, profile, dispatch, catalog, serverError } = useStudent();
  const navigate = useNavigate();
  const [errors, setErrors] = useState({});

  function validate() {
    const next = {};
    const nameError = !profile.name?.trim() ? 'Registered student name is required.' : '';
    if (nameError) next.candidateName = nameError;
    const dob = parseDob(draft.dob);
    if (dob.error) next.dob = dob.error;
    if (!(draft.studentId ?? profile.candidateId)?.trim()) next.studentId = 'Enter your Student ID.';
    if (!draft.preferredLocation) next.preferredLocation = 'Choose your preferred examination location.';
    if (!draft.photo) next.photo = 'Upload the student photo.';
    if (!draft.signature) next.signature = 'Please draw or upload your signature.';
    setErrors(next);
    if (!Object.keys(next).length) dispatch({ type: 'UPDATE_DRAFT', patch: { age: dob.age, studentId: draft.studentId ?? profile.candidateId, candidateName: draft.candidateName.trim() } });
    return !Object.keys(next).length;
  }

  return (
    <PracticeDashboardShell>
      <div className="elegant-application">
      <section className="application-layout student-shell">
        <Stepper step={1} />
        <form className="application-card" onSubmit={(event) => { event.preventDefault(); if (validate()) navigate('/student/application/selection'); }}>
          <div className="application-intro"><h1>Examination Application</h1><p>Complete your application details to register for the music examination.</p></div>{serverError&&<p role="alert">{serverError}</p>}<fieldset disabled={!catalog || !!deadlineError(catalog.config.session)} style={{border:0,padding:0,minWidth:0}}>
          <div className="form-grid selection-details">
            <label>Name
              <input readOnly value={profile.name} onChange={(event) => dispatch({ type: 'UPDATE_DRAFT', patch: { candidateName: event.target.value } })} />
              {errors.candidateName && <span className="student-error">{errors.candidateName}</span>}
            </label>
            <label>Date of Birth (DD/MM/YYYY)
              <input
                inputMode="numeric"
                maxLength="10"
                placeholder="DD/MM/YYYY"
                value={draft.dob}
                onChange={(event) => dispatch({ type: 'UPDATE_DRAFT', patch: { dob: formatDobInput(event.target.value) } })}
                onPaste={(event) => {
                  event.preventDefault();
                  dispatch({ type: 'UPDATE_DRAFT', patch: { dob: formatDobInput(event.clipboardData.getData('text')) } });
                }}
              />
              {errors.dob && <span className="student-error">{errors.dob}</span>}
            </label>
            <label>Student ID
              <input readOnly value={profile.candidateId} />
              {errors.studentId && <span className="student-error">{errors.studentId}</span>}
            </label>
          </div>
          <label className="exam-location-field">Preferred Examination Location
            <select aria-label="Preferred Examination Location" value={draft.preferredLocation || ''} onChange={e => dispatch({type:'UPDATE_DRAFT',patch:{preferredLocation:e.target.value}})} required>
              <option value="">Select a location</option>
              {(catalog?.config.locations || []).map(location => <option key={location}>{location}</option>)}
            </select>
            <small>Admin will confirm your final examination venue.</small>
            {errors.preferredLocation && <span className="student-error">{errors.preferredLocation}</span>}
          </label>
          <StudentPhoto value={draft.photo} onChange={photo => { dispatch({ type: 'UPDATE_DRAFT', patch: { photo } }); setErrors(current => ({ ...current, photo: '' })); }} />
          {errors.photo && <span className="student-error">{errors.photo}</span>}
          <div className="signature-heading">
            <div><h3>Applicant Signature</h3><p>Draw or upload your signature.</p></div>
          </div>
          <SignatureCanvas value={draft.signature} onChange={(signature, type) => dispatch({ type: 'UPDATE_DRAFT', patch: { signature, signatureType: type } })} />
          {errors.signature && <span className="student-error">{errors.signature}</span>}
          <button className="student-gold-btn next-btn" type="submit">Next Page <ArrowRight size={22} /></button>
          </fieldset>
        </form>
      </section>
    </div>
    </PracticeDashboardShell>
  );
}
