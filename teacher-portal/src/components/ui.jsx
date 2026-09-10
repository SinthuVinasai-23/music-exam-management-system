import React, { useEffect, useRef } from 'react';
import Image from 'next/image';
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Armchair,
  Settings,
  Bell,
  History,
  Search,
  LogOut,
  User,
  UserPlus,
  Calendar,
  GraduationCap,
  FileText,
  Music,
  MapPin,
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  Check,
  CircleCheck,
  PlusCircle,
  MoreVertical,
  SlidersHorizontal,
  Download,
  Eye,
  ShieldCheck,
  Trash2,
  Menu,
  Pencil,
  Monitor,
  ArrowLeft,
  Award,
  Info,
} from 'lucide-react';
const icons = {
  LayoutDashboard,
  ClipboardList,
  Users,
  Armchair,
  Settings,
  Bell,
  History,
  Search,
  LogOut,
  User,
  UserPlus,
  Calendar,
  GraduationCap,
  FileText,
  Music,
  MapPin,
  Clock,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  Check,
  CircleCheck,
  PlusCircle,
  MoreVertical,
  SlidersHorizontal,
  Download,
  Eye,
  ShieldCheck,
  Trash2,
  Menu,
  Pencil,
  Monitor,
  ArrowLeft,
  Award,
  Info,
};
export function Icon({ name, size = 20, ...props }) {
  const Component = icons[name] || Music;
  return (
    <Component size={size} strokeWidth={1.7} aria-hidden="true" {...props} />
  );
}
export function Avatar({ photo, large = false }) {
  return (
    <span className={`avatar ${large ? 'large' : ''}`}>
      {photo ? (
        <Image
          unoptimized
          width={large ? 120 : 48}
          height={large ? 120 : 48}
          src={photo}
          alt="Teacher profile"
        />
      ) : (
        <Icon name="User" size={large ? 70 : 27} />
      )}
    </span>
  );
}
export function Button({
  children,
  variant = 'primary',
  className = '',
  ...props
}) {
  return (
    <button className={`button ${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}
export function IconButton({ name, label, ...props }) {
  return (
    <button className="icon-button" aria-label={label} title={label} {...props}>
      <Icon name={name} />
    </button>
  );
}
export function Field({ label, children, ...props }) {
  return (
    <label className={`field ${props.className || ''}`}>
      <span>{label}</span>
      {children || <input {...props} className="" />}
    </label>
  );
}
export function CandidateChip({ candidate }) {
  return (
    <div className="candidate-chip">
      <Avatar />
      <div>
        <strong>{candidate.name}</strong>
        <small>
          {candidate.id ? `#${candidate.id} · ` : ''}
          {candidate.discipline}
        </small>
      </div>
    </div>
  );
}
export function Modal({ title, children, onClose, className = '' }) {
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const scroll = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.showModal();
    ref.current?.focus();
    const handle = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
      if (e.key === 'Tab') {
        const els = [
          ...ref.current.querySelectorAll(
            'button:not(:disabled), input, select, textarea, a[href], [tabindex="0"]',
          ),
        ].filter((el) => el.offsetParent !== null);
        const first = els[0],
          last = els[els.length - 1];
        if (!first) {
          e.preventDefault();
          return;
        }
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === ref.current)
        ) {
          e.preventDefault();
          last.focus();
        } else if (
          !e.shiftKey &&
          (document.activeElement === last ||
            document.activeElement === ref.current)
        ) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', handle);
    return () => {
      document.body.style.overflow = scroll;
      document.removeEventListener('keydown', handle);
      previous?.focus();
    };
  }, [onClose]);
  return (
    <dialog
      className={`modal ${className}`}
      aria-label={title}
      tabIndex={-1}
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className="modal-heading">
        <h2>{title}</h2>
        <IconButton name="X" label="Close dialog" onClick={onClose} />
      </div>
      {children}
    </dialog>
  );
}
export function ErrorMessage({ children }) {
  return children ? (
    <p className="error" role="alert">
      {children}
    </p>
  ) : null;
}
export const dateLabel = (value) =>
  new Date(`${value}T12:00:00`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
export const timeLabel = (value) =>
  new Date(`2026-01-01T${value}:00`).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
