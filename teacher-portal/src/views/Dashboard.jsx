import React from 'react';
import { usePortal } from '../store';
import { queue } from '../services/portal';
import { Avatar, Icon, dateLabel, timeLabel } from '../components/ui';
export default function Dashboard({ navigate }) {
  const { state } = usePortal();
  const pending = queue(state);
  const sessions = [...state.sessions]
    .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))
    .slice(0, 3);
  return (
    <>
      <section className="welcome">
        <div className="welcome-art" aria-hidden="true" />
        <h1>
          Welcome back, {state.profile.firstName.startsWith('Dr.') ? 'Dr.' : ''}
          <br />
          {state.profile.firstName.replace(/^Dr\.\s*/, '')}{' '}
          {state.profile.lastName}
        </h1>
        <p>
          “Music is the divine way to tell beautiful, poetic things to the
          heart.”
        </p>
        <span className="gold-rule" />
      </section>
      <div className="dashboard-stats">
        {[
          [
            'ClipboardList',
            pending.length,
            'Awaiting Review',
            'application-line',
          ],
          [
            'Users',
            new Set(state.students.map((s) => s.candidateId)).size,
            'Active Students',
            'students',
          ],
          ['Calendar', sessions.length, 'Upcoming Sessions', 'exam-slots'],
        ].map(([icon, value, label, route], i) => (
          <button
            className="stat-card"
            key={label}
            onClick={() => navigate(route)}
          >
            <div className="stat-top">
              <span className="stat-icon">
                <Icon name={icon} />
              </span>
              {i === 0 && <span className="tag">PRIORITY</span>}
            </div>
            <strong>{value}</strong>
            <span>{label}</span>
          </button>
        ))}
      </div>
      <div className="dashboard-bottom">
        <section>
          <div className="section-heading">
            <h2>Application Line</h2>
            <button
              className="text-button"
              onClick={() => navigate('application-line')}
            >
              VIEW ALL LINES
            </button>
          </div>
          <div className="review-list">
            {pending.slice(0, 3).map((a, i) => (
              <article className="review-card" key={a.id}>
                <Avatar />
                <div className="review-info">
                  <strong>{a.name}</strong>
                  <small>{a.discipline}</small>
                </div>
                <div className="submitted">
                  <small>SUBMITTED</small>
                  {i === 0
                    ? 'First in line'
                    : dateLabel(a.submittedAt.slice(0, 10))}
                </div>
                <button
                  className="review-button"
                  onClick={() => navigate('application-line')}
                >
                  REVIEW NOW
                </button>
              </article>
            ))}
            {!pending.length && (
              <div className="empty">All applications have been reviewed.</div>
            )}
          </div>
        </section>
        <section>
          <div className="section-heading">
            <h2>Schedule</h2>
            <Icon name="Calendar" />
          </div>
          <div className="schedule-preview">
            {sessions.map((s, i) => (
              <div key={s.id} className="timeline-item">
                <small className={i === 0 ? 'gold' : ''}>
                  {dateLabel(s.date)}
                </small>
                <div className="timeline-detail">
                  <small>
                    {timeLabel(s.start)} — {timeLabel(s.end)}
                  </small>
                  <strong>{s.type}</strong>
                  <span>
                    <Icon name="MapPin" size={14} />
                    {s.venue}
                  </span>
                </div>
              </div>
            ))}
            <button
              className="calendar-link"
              onClick={() => navigate('exam-slots')}
            >
              VIEW FULL CALENDAR <Icon name="ChevronRight" size={14} />
            </button>
          </div>
        </section>
      </div>
    </>
  );
}
