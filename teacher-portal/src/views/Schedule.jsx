import React, { useState } from 'react';
import { usePortal } from '../store';
import {
  Icon,
  IconButton,
  Button,
  dateLabel,
  timeLabel,
} from '../components/ui';
import { exportPDF } from '../utils/export';
export default function Schedule({ open }) {
  const { state } = usePortal();
  const [selected, setSelected] = useState('2026-12-11'),
    [month, setMonth] = useState(new Date(2026, 11, 1)),
    [filter, setFilter] = useState('All'),
    [showFilter, setShowFilter] = useState(false);
  const key = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
  const monthly = state.sessions.filter((s) => s.date.startsWith(key));
  const sessions = state.sessions
    .filter(
      (s) => s.date === selected && (filter === 'All' || s.venue === filter),
    )
    .sort((a, b) => a.start.localeCompare(b.start));
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate(),
    offset = (month.getDay() + 6) % 7;
  const registered = state.students.filter((s) =>
      monthly.some((x) => x.id === s.sessionId),
    ).length,
    capacity = monthly.reduce((n, s) => n + s.capacity, 0);
  const changeMonth = (delta) => {
    const next = new Date(month.getFullYear(), month.getMonth() + delta, 1);
    setMonth(next);
    setSelected(
      `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-01`,
    );
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Examination Schedule</h1>
          <span className="eyebrow muted">
            ACADEMY YEAR {month.getFullYear()} /{' '}
            <span className="gold">WINTER TERM</span>
          </span>
        </div>
        <div className="toolbar">
          <Button variant="outline" onClick={() => setShowFilter(!showFilter)}>
            <Icon name="SlidersHorizontal" size={15} />
            FILTER
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              exportPDF(
                'Examination Schedule',
                sessions.map(
                  (s) =>
                    `${dateLabel(s.date)} | ${timeLabel(s.start)}-${timeLabel(s.end)} | ${s.venue} | ${s.type} | ${state.students.filter((x) => x.sessionId === s.id).length}/${s.capacity} candidates`,
                ),
              )
            }
          >
            <Icon name="Download" size={15} />
            EXPORT PDF
          </Button>
        </div>
      </div>
      {showFilter && (
        <div className="filter-bar">
          <label>
            Venue{' '}
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option>All</option>
              {[...new Set(state.sessions.map((s) => s.venue))].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
        </div>
      )}
      <div className="schedule-layout">
        <aside>
          <section className="calendar panel">
            <div className="section-heading">
              <h2>
                {month.toLocaleDateString('en-GB', {
                  month: 'long',
                  year: 'numeric',
                })}
              </h2>
              <span className="calendar-arrows">
                <IconButton
                  name="ChevronLeft"
                  label="Previous month"
                  onClick={() => changeMonth(-1)}
                />
                <IconButton
                  name="ChevronRight"
                  label="Next month"
                  onClick={() => changeMonth(1)}
                />
              </span>
            </div>
            <div className="calendar-grid">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                <small key={day}>{day}</small>
              ))}
              {Array.from({ length: offset }, (_, i) => (
                <span key={`blank-${i}`} />
              ))}
              {Array.from({ length: days }, (_, i) => {
                const value = `${key}-${String(i + 1).padStart(2, '0')}`;
                return (
                  <button
                    key={value}
                    aria-label={`Select ${dateLabel(value)}`}
                    aria-pressed={selected === value}
                    className={selected === value ? 'selected' : ''}
                    onClick={() => setSelected(value)}
                  >
                    {i + 1}
                    {monthly.some((s) => s.date === value) && <i />}
                  </button>
                );
              })}
            </div>
          </section>
          <section className="monthly-overview">
            <h3>Monthly Overview</h3>
            <p>
              Total Sessions <strong>{monthly.length}</strong>
            </p>
            <p>
              Registered Students <strong>{registered}</strong>
            </p>
            <progress value={registered} max={capacity || 1} />
            <small>
              {capacity ? Math.round((registered / capacity) * 100) : 0}%
              Capacity reached
            </small>
          </section>
        </aside>
        <section className="sessions">
          <h3>
            {new Date(selected + 'T12:00:00').toLocaleDateString('en-GB', {
              weekday: 'long',
              day: 'numeric',
              month: 'short',
            })}
          </h3>
          {sessions.map((s) => (
            <article key={s.id} className="session-card">
              <div className="session-time">
                <strong>{s.start}</strong>
                <small>
                  {Number(s.start.slice(0, 2)) < 12 ? 'AM' : 'PM'} BLOCK
                </small>
              </div>
              <div className="session-details">
                <h3>{s.venue}</h3>
                <p>
                  <Icon name="User" size={15} />
                  {
                    state.students.filter((x) => x.sessionId === s.id).length
                  }{' '}
                  Students <Icon name="Music" size={15} />
                  {s.type}
                </p>
              </div>
              <button
                className="text-button"
                onClick={() => open({ type: 'candidates', session: s })}
              >
                VIEW
                <br />
                CANDIDATES
              </button>
            </article>
          ))}
          {!sessions.length && (
            <div className="empty panel">
              No examination sessions for this date
              {filter !== 'All' ? ' and venue' : ''}.
            </div>
          )}
          <button
            className="add-session"
            onClick={() =>
              open({
                type: 'session',
                date: selected,
                onScheduled: (date) => {
                  setSelected(date);
                  setMonth(new Date(date + 'T12:00:00'));
                },
              })
            }
          >
            <Icon name="PlusCircle" size={30} />
            <span>ADD SESSION FOR {dateLabel(selected).toUpperCase()}</span>
          </button>
        </section>
      </div>
    </>
  );
}
