import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Pencil } from 'lucide-react';
import { useExaminer } from './ExaminerContext.jsx';
import { Avatar } from './ExaminerLayout.jsx';
import { ExaminerDialog } from './ExaminerDialogs.jsx';

export default function ExaminerSettings() {
  const { state, dispatch } = useExaminer();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'security' ? 'security' : 'profile';
  const [profile, setProfile] = useState(state.profile);
  const [errors, setErrors] = useState({});
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [visible, setVisible] = useState({});
  const [saved, setSaved] = useState(false);
  const upload = useRef(null);
  const navigate = useNavigate();
  useEffect(() => { setErrors({}); setPasswords({ current: '', next: '', confirm: '' }); }, [tab]);
  function save(e) {
    e.preventDefault();
    const nextErrors = {};
    if (tab === 'profile') {
      if (!profile.firstName.trim()) nextErrors.firstName = 'First name is required.';
      if (!profile.lastName.trim()) nextErrors.lastName = 'Last name is required.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) nextErrors.email = 'Enter a valid email address.';
      if (!/^[+\d\s()-]{7,22}$/.test(profile.phone) || profile.phone.replace(/\D/g, '').length < 7) nextErrors.phone = 'Enter a valid phone number.';
      if (errors.avatar) nextErrors.avatar = errors.avatar;
      setErrors(nextErrors);
      if (Object.keys(nextErrors).length) return;
      dispatch({ type: 'PROFILE', profile: { ...profile, firstName: profile.firstName.trim(), lastName: profile.lastName.trim() } });
      setParams({ tab: 'security' });
    } else {
      if (!passwords.current) nextErrors.current = 'Enter your current password.';
      if (passwords.next.length < 12 || !/[A-Za-z]/.test(passwords.next) || !/\d/.test(passwords.next)) nextErrors.next = 'Use at least 12 characters with letters and numbers.';
      if (passwords.next === passwords.current) nextErrors.next = 'Choose a different new password.';
      if (!passwords.confirm || passwords.confirm !== passwords.next) nextErrors.confirm = 'Passwords do not match.';
      setErrors(nextErrors);
      if (Object.keys(nextErrors).length) return;
      setPasswords({ current: '', next: '', confirm: '' });
      dispatch({ type: 'TASK', title: 'Saved account security preferences' });
      setSaved(true);
    }
  }
  async function imageUpload(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png'].includes(file.type) || file.size > 2 * 1024 * 1024) { setErrors(v => ({ ...v, avatar: 'Choose a JPG or PNG image no larger than 2MB.' })); return; }
    const reader = new FileReader();
    reader.onerror = () => setErrors(v => ({ ...v, avatar: 'This image could not be read.' }));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => setErrors(v => ({ ...v, avatar: 'Choose a valid JPG or PNG image.' }));
      img.onload = () => { setProfile(v => ({ ...v, avatar: reader.result })); setErrors(v => ({ ...v, avatar: '' })); };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }
  const field = (name, label, type = 'text') => <label className={`examiner-profile-${name}`} htmlFor={`examiner-${name}`}>{label}<input id={`examiner-${name}`} aria-label={label} type={type} value={profile[name]} aria-invalid={!!errors[name]} onChange={e => setProfile({ ...profile, [name]: e.target.value })} />{errors[name] && <small className="examiner-error" role="alert">{errors[name]}</small>}</label>;
  return <div className="examiner-settings"><button className="examiner-back" onClick={() => navigate('/examiner/dashboard')}><ArrowLeft size={20} />Back</button><h1>Account Settings</h1><p>Manage your personal information and preferences.</p><form className="examiner-settings-card" noValidate onSubmit={save}><div className="examiner-tabs" role="tablist" aria-label="Account settings tabs"><button type="button" role="tab" id="examiner-profile-tab" aria-selected={tab === 'profile'} aria-controls="examiner-profile-panel" onClick={() => setParams({ tab: 'profile' })}>Profile Information</button><button type="button" role="tab" id="examiner-security-tab" aria-selected={tab === 'security'} aria-controls="examiner-security-panel" onClick={() => setParams({ tab: 'security' })}>Security</button></div>{tab === 'profile' ? <div id="examiner-profile-panel" aria-labelledby="examiner-profile-tab" role="tabpanel" className="examiner-profile-panel"><div className="examiner-profile-fields">{field('firstName', 'FIRST NAME')}{field('lastName', 'LAST NAME')}{field('email', 'EMAIL ADDRESS', 'email')}{field('phone', 'PHONE NUMBER', 'tel')}<label className="examiner-profile-specialization" htmlFor="examiner-specialization">SYLLABUS SPECIALIZATION<select id="examiner-specialization" value={profile.specialization} onChange={e => setProfile({ ...profile, specialization: e.target.value })}>{['Carnatic Music', 'Bharatanatyam', 'Veena', 'Violin', 'Mridangam', 'Flute', 'Keyboard Studies'].map(s => <option key={s}>{s}</option>)}</select></label></div><div className="examiner-profile-photo"><div><Avatar src={profile.avatar} size={76} /><button type="button" className="examiner-photo-edit examiner-icon" title="Change profile photo" aria-label="Change profile photo" onClick={() => upload.current.click()}><Pencil size={15} /></button></div><input ref={upload} type="file" accept="image/jpeg,image/png" aria-label="Profile image" hidden onChange={imageUpload} /><p>Allowed formats: JPG, PNG.<br />Max size: 2MB.</p>{errors.avatar && <small className="examiner-error" role="alert">{errors.avatar}</small>}</div></div> : <div id="examiner-security-panel" aria-labelledby="examiner-security-tab" role="tabpanel" className="examiner-security-panel">{[['current', 'CURRENT PASSWORD'], ['next', 'NEW PASSWORD'], ['confirm', 'CONFIRM NEW PASSWORD']].map(([name, label]) => <label key={name} htmlFor={`password-${name}`}>{label}<div className="examiner-password-input"><input id={`password-${name}`} type={visible[name] ? 'text' : 'password'} autoComplete={name === 'current' ? 'current-password' : 'new-password'} value={passwords[name]} onChange={e => setPasswords({ ...passwords, [name]: e.target.value })} /><button type="button" className="examiner-icon" aria-label={`${visible[name] ? 'Hide' : 'Show'} ${label.toLowerCase()}`} onClick={() => setVisible({ ...visible, [name]: !visible[name] })}>{visible[name] ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>{errors[name] && <small role="alert" className="examiner-error">{errors[name]}</small>}</label>)}</div>}<footer className="examiner-settings-footer"><button type="button" className="examiner-button secondary" onClick={() => { setProfile(state.profile); setPasswords({ current: '', next: '', confirm: '' }); setErrors({}); setParams({ tab: 'profile' }); }}>Cancel</button><button type="submit" className="examiner-button">Save Changes</button></footer></form>{saved && <ExaminerDialog title="Account Saved" className="examiner-success" onClose={() => setSaved(false)}><span className="examiner-success-icon"><CheckCircle2 size={32} /></span><h2>Account Saved</h2><p>Your account preferences have been saved successfully.</p><button className="examiner-button luminous" onClick={() => setSaved(false)}>Continue</button></ExaminerDialog>}</div>;
}
