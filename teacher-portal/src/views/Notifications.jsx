import React, { useState } from 'react';
import { usePortal } from '../store';
import { Icon } from '../components/ui';
export default function Notifications({ back }) {
  const { state, run } = usePortal();
  const [limit, setLimit] = useState(4);
  return (
    <>
      <button className="back-button" onClick={back}>
        <Icon name="ArrowLeft" />
        Back
      </button>
      <div className="page-heading">
        <h1 className="sans-title">Notifications</h1>
        <button className="blue-link" onClick={() => run({ type: 'read' })}>
          Mark all as read
        </button>
      </div>
      <section className="notification-list">
        {state.notifications.slice(0, limit).map((n) => (
          <article key={n.id} className="notification-row">
            <span className={`unread-dot ${n.read ? 'read' : ''}`} />
            <span className="round-icon">
              <Icon name={n.icon} />
            </span>
            <div>
              <strong>{n.title}</strong>
              <p>{n.message}</p>
            </div>
            <time>{n.time}</time>
          </article>
        ))}
      </section>
      <div className="load-more">
        {limit < state.notifications.length ? (
          <button className="blue-link" onClick={() => setLimit(limit + 4)}>
            Load More Notifications
          </button>
        ) : (
          <span className="muted">You’re all caught up.</span>
        )}
      </div>
    </>
  );
}
