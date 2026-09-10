import React, { useState } from 'react';
import { usePortal } from '../store';
import { Avatar, Icon, Button, Field, ErrorMessage } from '../components/ui';
export default function Settings({ security, navigate, open, back, logout }) {
  const { state, run } = usePortal();
  const [profile, setProfile] = useState({ ...state.profile }),
    [twoFactor, setTwoFactor] = useState(state.security.twoFactor),
    [password, setPassword] = useState({ current: '', next: '', confirm: '' }),
    [error, setError] = useState('');
  const change = (key, value) => setProfile({ ...profile, [key]: value });
  const save = (e) => {
    e.preventDefault();
    setError('');
    try {
      if (!security) {
        if (!profile.firstName.trim() || !profile.lastName.trim())
          throw new Error('Enter your first and last name.');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email))
          throw new Error('Enter a valid email address.');
        if (profile.phone.replace(/\D/g, '').length < 9)
          throw new Error('Enter a valid phone number.');
        run({ type: 'profile', profile });
        navigate('settings/security');
      } else {
        if (password.current || password.next || password.confirm) {
          if (!password.current)
            throw new Error('Enter your current password.');
          if (password.next.length < 12)
            throw new Error('Use a new password with at least 12 characters.');
          if (password.next !== password.confirm)
            throw new Error('New passwords do not match.');
        }
        run({
          type: 'security',
          security: {
            twoFactor,
            passwordUpdatedAt: password.next
              ? new Date().toISOString()
              : state.security.passwordUpdatedAt,
          },
        });
        setPassword({ current: '', next: '', confirm: '' });
        open({ type: 'saved' });
      }
    } catch (err) {
      setError(err.message);
    }
  };
  const upload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setError('Choose a JPG or PNG image.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Profile photos must be 2 MB or smaller.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      change('photo', reader.result);
      setError('');
    };
    reader.readAsDataURL(file);
  };
  return (
    <>
      <button className="back-button" onClick={back}>
        <Icon name="ArrowLeft" />
        Back
      </button>
      <div className="page-heading settings-heading">
        <div>
          <h1>Account Settings</h1>
          <p>Manage your personal information and preferences.</p>
        </div>
      </div>
      <section className="settings-panel panel">
        <div className="tabs">
          <button
            className={!security ? 'active' : ''}
            onClick={() => {
              setError('');
              navigate('settings');
            }}
          >
            Profile Information
          </button>
          <button
            className={security ? 'active' : ''}
            onClick={() => {
              setError('');
              navigate('settings/security');
            }}
          >
            Security
          </button>
        </div>
        <form onSubmit={save} noValidate>
          <div className="settings-body">
            {!security ? (
              <div className="profile-layout">
                <div className="form-grid">
                  <Field
                    label="FIRST NAME"
                    value={profile.firstName}
                    onChange={(e) => change('firstName', e.target.value)}
                  />
                  <Field
                    label="LAST NAME"
                    value={profile.lastName}
                    onChange={(e) => change('lastName', e.target.value)}
                  />
                  <Field
                    className="full"
                    label="EMAIL ADDRESS"
                    type="email"
                    value={profile.email}
                    onChange={(e) => change('email', e.target.value)}
                  />
                  <Field
                    className="full"
                    label="PHONE NUMBER"
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => change('phone', e.target.value)}
                  />
                  <Field className="full" label="SYLLABUS SPECIALIZATION">
                    <select
                      value={profile.specialization}
                      onChange={(e) => change('specialization', e.target.value)}
                    >
                      {[
                        'Carnatic Music',
                        'Western Classical',
                        'Bharatanatyam',
                        'Theory',
                      ].map((x) => (
                        <option key={x}>{x}</option>
                      ))}
                    </select>
                  </Field>
                </div>
                <div className="photo-editor">
                  <Avatar large photo={profile.photo} />
                  <label className="edit-photo">
                    <Icon name="Pencil" size={16} />
                    <input
                      type="file"
                      accept="image/jpeg,image/png"
                      aria-label="Upload profile photo"
                      onChange={upload}
                    />
                  </label>
                  <p>
                    Allowed formats: JPG, PNG.
                    <br />
                    Max size: 2MB.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <h2>Change Password</h2>
                <div className="password-fields">
                  {[
                    ['current', 'CURRENT PASSWORD'],
                    ['next', 'NEW PASSWORD'],
                    ['confirm', 'CONFIRM NEW PASSWORD'],
                  ].map(([key, label]) => (
                    <Field
                      key={key}
                      label={label}
                      type="password"
                      autoComplete={
                        key === 'current' ? 'current-password' : 'new-password'
                      }
                      placeholder="••••••••"
                      value={password[key]}
                      onChange={(e) =>
                        setPassword({ ...password, [key]: e.target.value })
                      }
                    />
                  ))}
                </div>
                <div className="two-factor">
                  <div>
                    <strong>Two-Factor Authentication (2FA)</strong>
                    <p>
                      Add an extra layer of security to your account by
                      requiring a verification code
                      <br className="desktop-break" /> in addition to your
                      password.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={twoFactor}
                    aria-label="Two-factor authentication"
                    className={`switch ${twoFactor ? 'on' : ''}`}
                    onClick={() => setTwoFactor(!twoFactor)}
                  >
                    <span />
                  </button>
                </div>
                <div className="login-history">
                  <strong>Login History</strong>
                  <div>
                    <Icon name="Monitor" />
                    <span>
                      Current browser session
                      <small>Colombo, Sri Lanka • Last active: Just now</small>
                    </span>
                    <Button type="button" variant="red" onClick={logout}>
                      LOGOUT
                    </Button>
                  </div>
                  <small className="demo-security">
                    Demo settings only. Password verification and 2FA activation
                    require the authentication API.
                  </small>
                </div>
              </>
            )}
            <ErrorMessage>{error}</ErrorMessage>
          </div>
          <footer className="form-footer">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setProfile({ ...state.profile });
                setTwoFactor(state.security.twoFactor);
                setPassword({ current: '', next: '', confirm: '' });
                setError('');
                back();
              }}
            >
              Cancel
            </Button>
            <Button type="submit">Save Changes</Button>
          </footer>
        </form>
      </section>
    </>
  );
}
