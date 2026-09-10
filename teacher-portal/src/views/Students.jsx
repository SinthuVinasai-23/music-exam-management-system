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
import { exportPDF } from '../utils/export';
export default function Students({ open }) {
  const { state } = usePortal();
  const [search, setSearch] = useState(''),
    [filter, setFilter] = useState('All'),
    [showFilter, setShowFilter] = useState(false),
    [page, setPage] = useState(1);
  const filtered = state.students.filter(
    (s) =>
      `${s.name} ${s.id} ${s.discipline}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (filter === 'All' || s.status === filter),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 4)),
    currentPage = Math.min(page, pages),
    rows = filtered.slice((currentPage - 1) * 4, currentPage * 4),
    assigned = state.students.filter((s) => s.sessionId).length;
  const download = () =>
    exportPDF(
      'Candidate Roster',
      filtered.flatMap((s) => {
        const session = state.sessions.find((x) => x.id === s.sessionId);
        return [
          `${s.name} | #${s.id}`,
          `${s.discipline} | ${s.status}`,
          session
            ? `${dateLabel(session.date)} ${timeLabel(session.start)} | ${session.venue}`
            : 'To be scheduled',
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
              <option>Slot Assigned</option>
              <option>Pending</option>
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
            new Set(state.students.map((s) => s.candidateId)).size,
          ],
          ['Slots Assigned', assigned],
          ['Pending Review', state.students.length - assigned],
          [
            'Avg. Level',
            (
              state.students.reduce((n, s) => n + s.level, 0) /
              state.students.length
            ).toFixed(1),
          ],
        ].map(([label, value], i) => (
          <div className="compact-stat" key={label}>
            <small>{label}</small>
            <div>
              <strong>{value}</strong>
              {i === 1 ? (
                <progress max={state.students.length} value={assigned} />
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
      <div className="table-wrap roster-table">
        <table>
          <thead>
            <tr>
              <th>CANDIDATE</th>
              <th>ID</th>
              <th>DISCIPLINE &amp; GRADE</th>
              <th>EXAMINATION SLOT</th>
              <th>STATUS</th>
              <th>ACTIONS</th>
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
                        <strong>{s.name}</strong>
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
                    {session ? (
                      <div className="slot-cell">
                        {dateLabel(session.date)}
                        <br />• {timeLabel(session.start)}
                        <small>
                          <Icon name="MapPin" size={13} />
                          {session.venue}
                        </small>
                      </div>
                    ) : (
                      <span className="muted">
                        To be
                        <br />
                        scheduled...
                      </span>
                    )}
                  </td>
                  <td>
                    <span
                      className={`status ${session ? 'assigned' : 'pending'}`}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td>
                    <IconButton
                      name="MoreVertical"
                      label={`Assign slot for ${s.name} ${s.id}`}
                      onClick={() => open({ type: 'assign', candidate: s })}
                    />
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
            'Slot Assignment',
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
