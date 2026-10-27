import { useState } from 'react';
import Modal from './Modal.jsx';

export default function PreviewVerification({ open, onClose, onVerified, email }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  function verify() {
    if (code.trim() !== '2673') { setError('Incorrect verification code. Please try again.'); return; }
    setCode(''); setError(''); onVerified();
  }
  return <Modal open={open} title={<>Verification<br />Required</>} actionLabel="Verify Account" onClose={onClose} onAction={verify}>
    <p>Verification sent to your email{email ? `: ${email}` : '.'}</p>
    <form className="register-form" onSubmit={e => { e.preventDefault(); verify(); }}>
      <label>Verification code<input aria-label="Verification code" inputMode="numeric" autoComplete="one-time-code" maxLength={4} value={code} onChange={e => { setCode(e.target.value); setError(''); }} /></label>
      {error && <span className="field-error" role="alert">{error}</span>}
    </form>
  </Modal>;
}
