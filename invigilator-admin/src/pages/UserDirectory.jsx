import React, { useEffect, useMemo, useState } from 'react'
import Icon from '../components/Icon.jsx'
import ActionMenu from '../components/ActionMenu.jsx'
import AssignmentModal from '../components/AssignmentModal.jsx'
import Toast from '../components/Toast.jsx'
import { usersByRole } from '../data/users.js'

const tabs = ['Teachers', 'Examiners', 'Invigilators']
const PAGE_SIZE = 4
const TOTAL_MEMBERS = {
  Teachers: 48,
  Examiners: 36,
  Invigilators: 48
}

export default function UserDirectory() {
  const [tab, setTab] = useState('Teachers')
  const [query, setQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [openMenuId, setOpenMenuId] = useState(null)
  const [assigningUser, setAssigningUser] = useState(null)
  const [toast, setToast] = useState('')
  const [users, setUsers] = useState(() => {
    // v2 avoids an older browser cache that only contained the original four rows.
    const saved = localStorage.getItem('mems-user-directory-v2')
    if (!saved) return usersByRole
    try { return JSON.parse(saved) } catch { return usersByRole }
  })

  useEffect(() => {
    const close = () => setOpenMenuId(null)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return users[tab].filter((u) => !q || `${u.name} ${u.email} ${u.role} ${u.status}`.toLowerCase().includes(q))
  }, [users, tab, query])

  const totalDemoPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const maxPage = query.trim() ? totalDemoPages : Math.min(3, totalDemoPages)

  useEffect(() => {
    if (currentPage > maxPage) setCurrentPage(maxPage)
  }, [currentPage, maxPage])

  const visible = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, currentPage])

  const rangeStart = filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1
  const rangeEnd = filtered.length === 0 ? 0 : rangeStart + visible.length - 1
  const displayedTotal = query.trim() ? filtered.length : TOTAL_MEMBERS[tab]

  function persist(next) {
    setUsers(next)
    localStorage.setItem('mems-user-directory-v2', JSON.stringify(next))
  }

  function changePage(page) {
    const safePage = Math.min(Math.max(page, 1), maxPage)
    setCurrentPage(safePage)
    setOpenMenuId(null)
  }

  function changeTab(nextTab) {
    setTab(nextTab)
    setCurrentPage(1)
    setOpenMenuId(null)
  }

  function handleQuery(event) {
    setQuery(event.target.value)
    setCurrentPage(1)
    setOpenMenuId(null)
  }

  function saveAssignment(userId, selectedIds) {
    const next = {
      ...users,
      Invigilators: users.Invigilators.map((u) => u.id === userId ? { ...u, assignedSessionIds: selectedIds } : u)
    }
    persist(next)
    setAssigningUser(null)
    setOpenMenuId(null)
    setToast(`Supervision scope saved: ${selectedIds.length} exam session${selectedIds.length === 1 ? '' : 's'} assigned.`)
  }

  function handleAction(action, user) {
    setOpenMenuId(null)
    if (action === 'Deactivate Account') {
      const roleKey = tab
      const next = { ...users, [roleKey]: users[roleKey].map((u) => u.id === user.id ? { ...u, status: 'INACTIVE' } : u) }
      persist(next)
      setToast(`${user.name} has been marked inactive in this frontend demo.`)
      return
    }
    if (action === 'Send Password Reset') {
      setToast(`Password reset request prepared for ${user.name}. Email delivery would be handled by the backend.`)
      return
    }
    setToast(`${action} is shown in Figma but is outside the invigilator-session assignment flow.`)
  }

  return (
    <div className="page users-page">
      <div className="directory-top">
        <div><h1>User Directory</h1><p>Manage access and roles for the examination board ecosystem.</p></div>
        <div className="directory-actions">
          <label className="directory-search">
            <Icon name="search" size={18}/>
            <input value={query} onChange={handleQuery} placeholder="Search for Name / Role" />
          </label>
          <button className="add-user"><Icon name="addUser" size={20}/> Add New User</button>
        </div>
      </div>

      <div className="tabs" role="tablist">
        {tabs.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            className={tab === t ? 'active' : ''}
            onClick={() => changeTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      <section className="directory-card">
        <div className="table-head">
          <span>Candidate / Name</span>
          <span>Contact Details</span>
          <span>Assigned Role</span>
          <span>Status</span>
          <span>Actions</span>
        </div>

        <div className="table-body">
          {visible.map((user) => (
            <div className={`user-row ${user.status === 'INACTIVE' ? 'inactive' : ''}`} key={user.id}>
              <div className="name-cell">
                <span className="row-avatar"><Icon name="avatar" size={24}/></span>
                <strong>{user.name}</strong>
              </div>

              <span className="email-cell">{user.email}</span>

              <div className="role-cell">
                <span>{user.role}</span>
                {tab === 'Invigilators' && (
                  <small>
                    {(user.assignedSessionIds || []).length} assigned session
                    {(user.assignedSessionIds || []).length === 1 ? '' : 's'}
                  </small>
                )}
              </div>

              <span>
                <b className={`status ${user.status === 'ACTIVE' ? 'active' : 'inactive'}`}>{user.status}</b>
              </span>

              <div className="action-cell">
                <button
                  className="more-button"
                  aria-label={`Actions for ${user.name}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    setOpenMenuId(openMenuId === user.id ? null : user.id)
                  }}
                >
                  <Icon name="more"/>
                </button>

                {openMenuId === user.id && (
                  <ActionMenu
                    user={user}
                    onAssign={(u) => {
                      setAssigningUser(u)
                      setOpenMenuId(null)
                    }}
                    onAction={handleAction}
                    onClose={() => setOpenMenuId(null)}
                  />
                )}
              </div>
            </div>
          ))}

          {visible.length === 0 && <div className="empty-state">No users match your search.</div>}
        </div>

        <div className="table-footer">
          <span>
            Showing {rangeStart} to {rangeEnd} of {displayedTotal} member{displayedTotal === 1 ? '' : 's'}
          </span>

          <div className="pagination" aria-label="User directory pagination">
            <button
              aria-label="Previous page"
              disabled={currentPage === 1}
              onClick={() => changePage(currentPage - 1)}
            >
              <Icon name="chevronLeft" size={16}/>
            </button>

            {Array.from({ length: maxPage }, (_, index) => index + 1).map((page) => (
              <button
                key={page}
                aria-label={`Page ${page}`}
                aria-current={currentPage === page ? 'page' : undefined}
                className={currentPage === page ? 'page-active' : ''}
                onClick={() => changePage(page)}
              >
                {page}
              </button>
            ))}

            <button
              aria-label="Next page"
              disabled={currentPage === maxPage}
              onClick={() => changePage(currentPage + 1)}
            >
              <Icon name="chevronRight" size={16}/>
            </button>
          </div>
        </div>
      </section>

      <div className="directory-stats">
        <div>
          <span>Active {tab}</span>
          <strong>{tab === 'Teachers' ? '1,204' : tab === 'Examiners' ? '182' : '64'}</strong>
          <b>+12%</b>
        </div>
        <div>
          <span>Pending Approvals</span>
          <strong>{tab === 'Invigilators' ? '6' : '28'}</strong>
          <i>⌛</i>
        </div>
        <div>
          <span>{tab === 'Invigilators' ? 'Assigned Sessions' : 'Total Exams Scored'}</span>
          <strong>
            {tab === 'Invigilators'
              ? users.Invigilators.reduce((n, u) => n + (u.assignedSessionIds || []).length, 0)
              : '8,492'}
          </strong>
          <i>↗</i>
        </div>
      </div>

      {assigningUser && (
        <AssignmentModal
          user={users.Invigilators.find((u) => u.id === assigningUser.id) || assigningUser}
          onClose={() => setAssigningUser(null)}
          onSave={saveAssignment}
        />
      )}

      {toast && <Toast message={toast} onClose={() => setToast('')}/>}
    </div>
  )
}
