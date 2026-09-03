import React from 'react'
import Icon from './Icon.jsx'

export default function ActionMenu({ user, onAssign, onAction, onClose }) {
  return (
    <div className="action-menu" role="menu" onClick={(e) => e.stopPropagation()}>
      <button role="menuitem" onClick={() => onAction('Edit Details', user)}><Icon name="edit"/> <span>Edit Details</span></button>
      <button role="menuitem" onClick={() => onAssign(user)}><Icon name="calendar"/> <span>Assign to Sessions</span></button>
      <button role="menuitem" onClick={() => onAction('Change Role', user)}><Icon name="badge"/> <span>Change Role</span></button>
      <button role="menuitem" onClick={() => onAction('Send Password Reset', user)}><Icon name="reset"/> <span>Send Password Reset</span></button>
      <div className="action-divider" />
      <button className="danger" role="menuitem" onClick={() => onAction('Deactivate Account', user)}><Icon name="ban"/> <span>Deactivate Account</span></button>
    </div>
  )
}
