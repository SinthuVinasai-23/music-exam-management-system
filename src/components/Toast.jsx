import React, { useEffect } from 'react'
import Icon from './Icon.jsx'

export default function Toast({ message, onClose }) {
  useEffect(() => {
    const id = window.setTimeout(onClose, 3300)
    return () => window.clearTimeout(id)
  }, [onClose])
  return (
    <div className="toast" role="status">
      <span className="toast-icon"><Icon name="check" size={15}/></span>
      <span>{message}</span>
    </div>
  )
}
