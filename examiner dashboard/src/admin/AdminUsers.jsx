import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MoreVertical, Plus, Search } from 'lucide-react';
import { useAdmin } from './AdminContext.jsx';
import { AdminDialog, ConfirmDialog } from './AdminDialogs.jsx';

const TABS = ['Teachers', 'Examiners', 'Invigilators'];

export default function AdminUsers() {
  const { state, dispatch } = useAdmin();
  const [params, setParams] = useSearchParams();
  const tab = TABS.includes(params.get('tab')) ? params.get('tab') : 'Teachers';
  const [q, setQ] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [menuFor, setMenuFor] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [editing, setEditing] = useState(null);

  const list = state.users[tab].filter(u => u.name.toLowerCase().includes(q.toLowerCase()) || u.role.toLowerCase().includes(q.toLowerCase()) || u.contact.toLowerCase().includes(q.toLowerCase()));
  const activeTeachers = state.users.Teachers.filter(u => u.status === 'Active').length;

  return <div>
    <div className="admin-page-head">
      <div><h1>User Directory</h1><p>Manage access and roles for the examination board ecosystem.</p></div>
      <div style={{ display: 'flex', gap: 14 }}>
        <div className="admin-filter-input"><Search size={16} /><input placeholder="Search for Name / Role" value={q} onChange={e => setQ(e.target.value)} /></div>
        <button className="admin-solid-btn" onClick={() => setAddOpen(true)}><Plus size={15} />Add New User</button>
      </div>
    </div>

    <div className="admin-tabs">{TABS.map(t => <button key={t} className={tab === t ? 'active' : ''} onClick={() => setParams({ tab: t })}>{t}</button>)}</div>

    <div className="admin-table-wrap" style={{ marginTop: 24 }}>
      <table className="admin-table">
        <thead><tr><th>Candidate / Name</th><th>Contact Details</th><th>Assigned Role</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          {list.length === 0 && <tr><td colSpan={5} className="admin-empty">No users match your search.</td></tr>}
          {list.map(u => <UserRow key={u.id} user={u} tab={tab} open={menuFor === u.id} onEdit={() => { setEditing(u); setMenuFor(null); }} onToggle={() => setMenuFor(menuFor === u.id ? null : u.id)} onClose={() => setMenuFor(null)} onToggleStatus={() => setConfirm({ user: u, tab })} />)}
        </tbody>
      </table>
    </div>

    <div className="admin-pagination"><span className="admin-pagination-info">Showing 1 to {list.length} of {state.users[tab].length + 44} members</span><button className="active">1</button><button>2</button><button>3</button><button>›</button></div>

    <div className="admin-stats" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', marginTop: 30 }}>
      <div className="admin-stat-card" style={{ borderColor: '#e9dfbf' }}><label>ACTIVE TEACHERS</label><strong>{(activeTeachers + 1201).toLocaleString()}</strong><span className="admin-stat-badge" style={{ marginTop: 8, width: 'fit-content' }}>+12%</span></div>
      <div className="admin-stat-card" style={{ borderColor: '#e9dfbf' }}><label>PENDING APPROVALS</label><strong>28</strong></div>
      <div className="admin-stat-card" style={{ borderColor: '#e9dfbf' }}><label>TOTAL EXAMS SCORED</label><strong>8,492</strong></div>
    </div>

    {addOpen && <AddUserDialog tab={tab} onClose={() => setAddOpen(false)} onSave={user => { dispatch({ type: 'ADD_USER', tab, user }); setAddOpen(false); }} />}
    {editing && <AddUserDialog tab={tab} user={editing} onClose={() => setEditing(null)} onSave={user => { dispatch({ type: 'EDIT_USER', id: editing.id, tab, user }); setEditing(null); }} />}
    {confirm && <ConfirmDialog title={`${confirm.user.status === 'Active' ? 'Deactivate' : 'Activate'} ${confirm.user.name}?`} body={confirm.user.status === 'Active' ? 'This user will lose portal access until reactivated.' : 'This user will regain portal access.'} confirmLabel={confirm.user.status === 'Active' ? 'Deactivate' : 'Activate'} danger={confirm.user.status === 'Active'} onClose={() => setConfirm(null)} onConfirm={() => { dispatch({ type: 'TOGGLE_USER_STATUS', tab: confirm.tab, id: confirm.user.id }); setConfirm(null); }} />}
  </div>;
}

function UserRow({ user, open, onToggle, onClose, onToggleStatus, onEdit }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const outside = e => { if (!ref.current?.contains(e.target)) onClose(); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open, onClose]);
  return <tr>
    <td><div className="admin-cell-name"><span className="admin-avatar" style={{ width: 34, height: 34 }} /><strong>{user.name}</strong></div></td>
    <td>{user.contact}</td>
    <td>{user.role}</td>
    <td><span className={`admin-pill ${user.status === 'Active' ? 'active' : 'inactive'}`}>{user.status.toUpperCase()}</span></td>
    <td>
      <div className="admin-action-menu-wrap" ref={ref}>
        <button className="admin-icon" aria-label={`Actions for ${user.name}`} aria-expanded={open} onClick={onToggle}><MoreVertical size={17} /></button>
        {open && <div className="admin-action-menu">
          <button onClick={onEdit}>View / Edit</button>
          <button className={user.status === 'Active' ? 'danger' : ''} onClick={() => { onToggleStatus(); onClose(); }}>{user.status === 'Active' ? 'Deactivate' : 'Activate'}</button>
        </div>}
      </div>
    </td>
  </tr>;
}

function AddUserDialog({ tab, onClose, onSave, user }) {
  const [name, setName] = useState(user?.name || ''); const [contact, setContact] = useState(user?.contact || ''); const [role, setRole] = useState(user?.role || '');
  const [error, setError] = useState('');
  function save() {
    if (!name.trim() || !role.trim()) { setError('Name and role are required.'); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contact)) { setError('Enter a valid email address.'); return; }
    onSave({ name: name.trim(), contact: contact.trim(), role: role.trim(), status: user?.status || 'Active' });
  }
  return <AdminDialog title={`Add ${tab.slice(0, -1)}`} onClose={onClose}>
    <h2>{user ? 'Edit' : 'Add New'} {tab.slice(0, -1)}</h2>
    <div className="admin-form-grid" style={{ marginTop: 16 }}>
      <label style={{ gridColumn: '1 / -1' }}>Full Name<input value={name} onChange={e => setName(e.target.value)} /></label>
      <label style={{ gridColumn: '1 / -1' }}>Email<input type="email" value={contact} onChange={e => setContact(e.target.value)} /></label>
      <label style={{ gridColumn: '1 / -1' }}>Assigned Role<input value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. Senior Examiner" /></label>
    </div>
    {error && <p className="admin-error">{error}</p>}
    <div className="admin-dialog-actions"><button className="admin-ghost-btn" onClick={onClose}>Cancel</button><button className="admin-solid-btn" onClick={save}>{user ? 'Save Changes' : 'Add User'}</button></div>
  </AdminDialog>;
}
