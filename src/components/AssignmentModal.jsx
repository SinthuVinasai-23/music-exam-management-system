import React, { useEffect, useMemo, useState } from 'react'
import Icon from './Icon.jsx'
import { examSessions } from '../data/users.js'

export default function AssignmentModal({ user, onClose, onSave }) {
  const initial = useMemo(() => user.assignedSessionIds || [], [user])
  const [selected, setSelected] = useState(initial)
  const [error, setError] = useState('')

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function toggle(id) {
    setError('')
    setSelected((current) => current.includes(id) ? current.filter((x) => x !== id) : [...current, id])
  }

  function submit() {
    if (user.status !== 'ACTIVE') {
      setError('This invigilator is inactive. Activate the account before assigning examination sessions.')
      return
    }
    if (selected.length === 0) {
      setError('Select at least one examination session before saving the supervision scope.')
      return
    }
    onSave(user.id, selected)
  }

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <section className="assignment-modal" role="dialog" aria-modal="true" aria-labelledby="assign-title" onMouseDown={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h2 id="assign-title">Assign Venue &amp; Supervision Scope</h2>
          <button className="modal-close" aria-label="Close" onClick={onClose}><Icon name="close" size={21}/></button>
        </header>
        <div className="modal-body">
          <div className="staff-card">
            <div className="staff-avatar"><Icon name="avatar" size={34}/></div>
            <div><strong>{user.name}</strong><span>Invigilator / Exam Supervisor</span></div>
          </div>
          <div className="session-heading-row">
            <h3>Available Sessions</h3>
            <span>{selected.length} selected</span>
          </div>
          <div className="session-list">
            {examSessions.map((session) => {
              const checked = selected.includes(session.id)
              return (
                <label className={`session-option ${checked ? 'checked' : ''}`} key={session.id}>
                  <input type="checkbox" checked={checked} onChange={() => toggle(session.id)} />
                  <span className="custom-check">{checked && <Icon name="check" size={13}/>}</span>
                  <span className="session-copy">
                    <span className="session-main">{session.venue} — {session.label} ({session.time})</span>
                    <span className="session-meta">{session.examination} · {session.date} · {session.candidates} candidates</span>
                  </span>
                </label>
              )
            })}
          </div>
          <div className="scope-note">
            <Icon name="shield" size={18}/>
            <span>Selected sessions define the invigilator's supervision scope. Candidate access must be limited to these assigned exam instances.</span>
          </div>
          {error && <div className="modal-error">{error}</div>}
        </div>
        <footer className="modal-footer">
          <button className="text-button" onClick={onClose}>Cancel</button>
          <button className="gold-button" onClick={submit}>Assign Venue Scope</button>
        </footer>
      </section>
    </div>
  )
}
