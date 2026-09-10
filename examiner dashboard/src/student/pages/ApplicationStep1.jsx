import { ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stepper, StudentShell } from '../components/StudentLayout.jsx';
import SignatureCanvas from '../components/SignatureCanvas.jsx';
import { gradeOrder, teachers } from '../data/studentData.js';
import { useStudent } from '../context/StudentContext.jsx';
import { formatDobInput, parseDob, validateName } from '../utils.js';

export default function ApplicationStep1() {
  const { draft, dispatch } = useStudent();
  const navigate = useNavigate();
  const [errors, setErrors] = useState({});

  function validate() {
    const next = {};
    const nameError = validateName(draft.candidateName);
    if (nameError) next.candidateName = nameError;
    const dob = parseDob(draft.dob);
    if (dob.error) next.dob = dob.error;
    if (!draft.grade) next.grade = 'Choose Grade 1 to 5 or Diploma.';
    if (!draft.teacher) next.teacher = 'Choose a registered teacher.';
    if (!draft.signature) next.signature = 'Please draw or upload your signature.';
    const highestCompleted = 2;
    const requested = gradeOrder.indexOf(draft.grade) + 1;
    if (draft.grade && draft.grade !== 'Diploma' && requested > highestCompleted + 1) next.grade = 'This candidate can apply up to Grade 3 unless prerequisites are bundled.';
    if (draft.grade === 'Diploma') next.grade = 'Diploma requires completed Grade 5 history in this frontend check.';
    setErrors(next);
    if (!Object.keys(next).length) dispatch({ type: 'UPDATE_DRAFT', patch: { age: dob.age, candidateName: draft.candidateName.trim() } });
    return !Object.keys(next).length;
  }

  return (
    <StudentShell>
      <section className="student-page-title">
        <h1>Examination Application</h1>
        <p>Crafting the future of musical excellence, one performance at a time.</p>
      </section>
      <section className="application-layout student-shell">
        <Stepper step={1} />
        <form className="application-card" onSubmit={(event) => { event.preventDefault(); if (validate()) navigate('/student/application/selection'); }}>
          <div className="form-grid">
            <label>Candidate Full Name
              <input value={draft.candidateName} onChange={(event) => dispatch({ type: 'UPDATE_DRAFT', patch: { candidateName: event.target.value } })} />
              {errors.candidateName && <span className="student-error">{errors.candidateName}</span>}
            </label>
            <label>Date of Birth
              <input
                inputMode="numeric"
                maxLength="10"
                placeholder="MM/DD/YYYY"
                value={draft.dob}
                onChange={(event) => dispatch({ type: 'UPDATE_DRAFT', patch: { dob: formatDobInput(event.target.value) } })}
                onPaste={(event) => {
                  event.preventDefault();
                  dispatch({ type: 'UPDATE_DRAFT', patch: { dob: formatDobInput(event.clipboardData.getData('text')) } });
                }}
              />
              {errors.dob && <span className="student-error">{errors.dob}</span>}
            </label>
            <label>Exam Level
              <select value={draft.grade} onChange={(event) => dispatch({ type: 'UPDATE_DRAFT', patch: { grade: event.target.value } })}>
                <option value="">Select Grade</option>
                {gradeOrder.map((grade) => <option key={grade}>{grade}</option>)}
              </select>
              {errors.grade && <span className="student-error">{errors.grade}</span>}
            </label>
            <label>Select Registered Teacher
              <select value={draft.teacher} onChange={(event) => dispatch({ type: 'UPDATE_DRAFT', patch: { teacher: event.target.value } })}>
                <option value="">Choose Instructor</option>
                {teachers.map((teacher) => <option key={teacher}>{teacher}</option>)}
              </select>
              {errors.teacher && <span className="student-error">{errors.teacher}</span>}
            </label>
          </div>
          <div className="signature-heading">
            <div><h3>Applicant E-Signature Canvas</h3><p>Please sign within the frame using a stylus or mouse.</p></div>
          </div>
          <SignatureCanvas value={draft.signature} onChange={(signature, type) => dispatch({ type: 'UPDATE_DRAFT', patch: { signature, signatureType: type } })} />
          {errors.signature && <span className="student-error">{errors.signature}</span>}
          <button className="student-gold-btn next-btn" type="submit">Next Page <ArrowRight size={22} /></button>
          <p className="terms-note">By proceeding, you agree to the Terms of Excellence and Academic Integrity standards.</p>
        </form>
      </section>
    </StudentShell>
  );
}
