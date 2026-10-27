import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CandidateFields, { emptyCandidate } from '../components/CandidateFields.jsx';
import { authRequest } from '../auth/api.js';
import RegistrationLayout from '../components/RegistrationLayout.jsx';
export default function AddCandidate() {
  const navigate = useNavigate();
  const [student, setStudent] = useState(emptyCandidate);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault(); setError(''); setBusy(true);
    try { await authRequest('add-candidate', student); navigate('/parent/dashboard'); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  return <RegistrationLayout backTo="/parent/dashboard" backLabel="Back to Parent Dashboard">
    <div className="registration-heading"><h1>Add New Candidate</h1><p>This child will be associated with your existing parent account and receive a permanent Student ID.</p></div>
    <form className="ensemble-form parent-form" onSubmit={submit} noValidate><fieldset className="registration-section"><legend>Student / Child Details</legend><div className="registration-fields"><CandidateFields value={student} onChange={setStudent} child /></div></fieldset>
      {error && <p role="alert" className="registration-error">{error}</p>}<button className="ensemble-submit" disabled={busy}>{busy ? 'Adding candidate…' : 'Add Candidate'}</button>
    </form>
  </RegistrationLayout>;
}
