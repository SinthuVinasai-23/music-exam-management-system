import {useNavigate} from 'react-router-dom';
import React, { useState } from 'react';
import { usePortal } from '../store';
import {
  Avatar,
  Icon,
  IconButton,
  Button,
  dateLabel,
  timeLabel,
} from '../components/ui';
import { studentApprovalRows } from '../services/portal';
import { exportPDF } from '../utils/export';
export default function Students({ open }) {
  const { state,run } = usePortal();
  const navigate=useNavigate();
  const [search, setSearch] = useState(''),
    [filter, setFilter] = useState('All'),
    [showFilter, setShowFilter] = useState(false),
    [page, setPage] = useState(1);
  const students = studentApprovalRows(state);
  const filtered = students.filter(
    (s) =>
      `${s.name} ${s.id} ${s.discipline}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (filter === 'All' || s.approvalStatus === filter),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 4)),
    currentPage = Math.min(page, pages),
    rows = filtered.slice((currentPage - 1) * 4, currentPage * 4),
    assigned = students.filter((s) => s.approvalStatus === 'Approved').length;
  const download = () =>
    exportPDF(
      'Candidate Roster',
      filtered.flatMap((s) => {
        const session = state.sessions.find((x) => x.id === s.sessionId);
        return [
          `${s.name} | #${s.id}`,
          `${s.discipline} | ${s.approvalStatus}`,
          session
            ? `${dateLabel(session.date)} ${timeLabel(session.start)} | ${session.venue}`
            : 'Admin will assign the examination slot',
          '',
        ];
      }),
    );
  return (
    <>
      <div className="page-heading roster-heading">
        <div>
          <h1>Candidate Roster</h1>
          <p>
            Managing enrollment for the 2026 International Winter
            <br className="desktop-break" /> Conservatoire Session.
          </p>
        </div>
        <div className="toolbar">
          <label className="search-field">
            <Icon name="Search" size={17} />
            <input
              aria-label="Search candidates"
              placeholder="Search candidates..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <Button variant="outline" onClick={() => setShowFilter(!showFilter)}>
            <Icon name="SlidersHorizontal" size={16} />
            Filter
          </Button>
          <Button variant="outline" onClick={download}>
            <Icon name="Download" size={16} />
            Export PDF
          </Button>
        </div>
      </div>
      {showFilter && (
        <div className="filter-bar">
          <label>
            Status{' '}
            <select
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                setPage(1);
              }}
            >
              <option>All</option>
              <option>Approved</option>
              <option>Not Approved</option>
              <option>Rejected</option>
            </select>
          </label>
          <button
            className="text-button"
            onClick={() => {
              setFilter('All');
              setSearch('');
            }}
          >
            Clear filters
          </button>
        </div>
      )}
      <div className="roster-stats">
        {[
          [
            'Total Candidates',
            new Set(students.map((s) => s.candidateId)).size,
          ],
          ['Approved', assigned],
          ['Not Approved', students.filter(s => s.approvalStatus !== 'Approved').length],
          [
            'Avg. Level',
            (
              students.reduce((n, s) => n + s.level, 0) /
              students.length
            ).toFixed(1),
          ],
        ].map(([label, value], i) => (
          <div className="compact-stat" key={label}>
            <small>{label}</small>
            <div>
              <strong>{value}</strong>
              {i === 1 ? (
                <progress max={students.length} value={assigned} />
              ) : i === 2 ? (
                <Icon name="ClipboardList" />
              ) : i === 3 ? (
                <span>Advanced</span>
              ) : (
                <span className="badge green">Winter term</span>
              )}
            </div>
          </div>
        ))}
      </div>
      <p className="notice">Students can be approved only after payment is received and confirmed. Examination slots are assigned by the admin.</p>
      <div className="table-wrap roster-table">
        <table>
          <thead>
            <tr>
              <th>CANDIDATE</th>
              <th>ID</th>
              <th>DISCIPLINE &amp; GRADE</th>
              <th>PAYMENT</th>
              <th>APPROVAL STATUS</th>

            </tr>
          </thead>
          <tbody>
            {rows.map((s) => {
              const session = state.sessions.find((x) => x.id === s.sessionId);
              return (
                <tr key={s.id}>
                  <td>
                    <div className="student-cell">
                      <Avatar />
                      <span>
                        <button className="text-button student-application-link" onClick={()=>{let app=state.applications.find(a=>s.id.startsWith(a.id+'-')||a.candidateId===s.candidateId||a.name===s.name);if(!app){const next=run({type:'student-application',studentId:s.id});app=next.applications.find(a=>a.id==='APP-'+s.id);}if(app)navigate('/teacher/application-line?applicationId='+encodeURIComponent(app.id));}}>{s.name}</button>
                        <small>{s.email}</small>
                      </span>
                    </div>
                  </td>
                  <td className="id-cell">#{s.id}</td>
                  <td>
                    <div className="discipline-cell">
                      <Icon name="Music" size={14} />
                      <div>
                        <strong>{s.discipline}</strong>
                        <small>{s.track}</small>
                      </div>
                    </div>
                  </td>
                  <td>
                    {s.paymentVerification?.status === 'not-collected' ? <><strong>Not Received</strong><p>{s.paymentVerification.reason}</p></> : s.paymentVerification?.status === 'collected' ? 'Received' : 'Not recorded'}
                  </td>
                  <td>
                    <span
                      className={`status ${s.approvalStatus === 'Approved' ? 'assigned' : 'pending'}`}
                    >
                      {s.approvalStatus}
                    </span>
                  </td>

                </tr>
              );
            })}
          </tbody>
        </table>
        {!filtered.length && (
          <div className="empty">No candidates match your search.</div>
        )}
        <div className="pagination">
          <span>
            Showing {filtered.length ? (currentPage - 1) * 4 + 1 : 0}–
            {Math.min(currentPage * 4, filtered.length)} of {filtered.length}{' '}
            examinations
          </span>
          <div>
            <IconButton
              name="ChevronLeft"
              label="Previous page"
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
            />
            {Array.from({ length: pages }, (_, i) => (
              <button
                key={i}
                className={currentPage === i + 1 ? 'selected' : ''}
                onClick={() => setPage(i + 1)}
              >
                {i + 1}
              </button>
            ))}
            <IconButton
              name="ChevronRight"
              label="Next page"
              disabled={currentPage === pages}
              onClick={() => setPage(currentPage + 1)}
            />
          </div>
        </div>
      </div>
      <section className="progress-section">
        <div className="section-heading">
          <h2>Examination Progress</h2>
          <button
            className="text-button"
            onClick={() => open({ type: 'analytics' })}
          >
            Detailed Analytics →
          </button>
        </div>
        <div className="progress-track">
          {[
            'Registration',
            'Teacher Approval',
            'Examination Period',
            'Final Review',
          ].map((step, i) => (
            <div key={step} className={i < 2 ? 'done' : ''}>
              <span>◆</span>
              <small>{step}</small>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
