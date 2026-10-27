import { useId, useState } from 'react';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
export const emptyCandidate = () => ({ firstName: '', lastName: '', dateOfBirth: '', phone: '', email: '' });
export function ValidationMessage({ children, id }) {
  return <p id={id} className="registration-error" role="alert"><AlertCircle size={16} aria-hidden="true" /><span>{children}</span></p>;
}
export function TextField({ name, label, value, onChange, type = 'text', required = true, autoComplete, error }) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const password = type === 'password';
  return <div className={`registration-field field-${name} ${error ? 'has-error' : ''}`}>
    <label htmlFor={id}>{label}</label>
    <div className={`registration-input-wrap ${password ? 'has-password' : ''}`}><input id={id} name={name} type={password && visible ? 'text' : type} value={value || ''} required={required} autoComplete={autoComplete} aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-error` : undefined} onChange={event => onChange(event.target.value)} />
      {password && <button className="password-visibility" type="button" aria-label={`${visible ? 'Hide' : 'Show'} ${label}`} aria-pressed={visible} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button>}
    </div>
    {error && <ValidationMessage id={`${id}-error`}>{error}</ValidationMessage>}
  </div>;
}
export default function CandidateFields({ value, onChange, child = false, errors = {} }) {
  const fields = [
    ['firstName', child ? 'Student First Name' : 'First Name', 'text', true],
    ['lastName', child ? 'Student Last Name' : 'Last Name', 'text', true],
    ['dateOfBirth', 'Date of Birth', 'date', true],
    ['phone', child ? 'Student Phone Number (optional)' : 'Phone Number', 'tel', !child],
    ['email', child ? 'Student Email Address (optional)' : 'Email Address', 'email', !child],
  ];
  return fields.map(([name, label, type, required]) => <TextField key={name} name={name} label={label} type={type} required={required} value={value[name]} error={errors[name]} onChange={next => onChange({ ...value, [name]: next })} />);
}
