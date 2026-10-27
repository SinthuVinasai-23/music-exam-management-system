import {useSearchParams} from 'react-router-dom';
import React, { useState } from 'react';
import { usePortal } from '../store';
import { queue } from '../services/portal';
import { Icon, Button, dateLabel } from '../components/ui';
export default function Applications({ open }) {
  const { state } = usePortal();
  const [params]=useSearchParams();
  const pending = queue(state),
    current = params.get('applicationId') ? state.applications.find(a=>a.id===params.get('applicationId')) : pending[0];
  return (
    <div className="applications-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">OPERATIONS</span>
          <h1>Application Line</h1>
        </div>
        <div className="pending-total">
          <strong>{pending.length}</strong>
          <small>PENDING REVIEWS</small>
        </div>
      </div>
      {current ? (
        <>
          <section className="application-card fifo-review-card">
            <div className="application-top">
              <div className="candidate-portrait">
                <Icon name="UserRound" size={140} />
              </div>
              <div className="application-docs">
                <h4>PRE-REQUISITE CLEARANCE</h4>
                <button
                  className="document-row"
                  onClick={() => open({ type: 'document', candidate: current })}
                >
                  <span className="document-icon">
                    <Icon name="Award" />
                  </span>
                  <span>
                    <strong>Level 4 Certificate</strong>
                    <small>Sample document · preview</small>
                  </span>
                  <Icon name="Eye" />
                </button>
                <h4>SELECTED EXAMINATIONS</h4>
                {current.exams.map((exam, i) => (
                  <div className="exam-clearance" key={exam}>
                    <Icon
                      name={i === 0 ? 'CircleCheck' : 'Calendar'}
                      size={18}
                    />
                    <span>{exam}</span>
                    <span className={`badge ${i === 0 ? 'green' : 'rose'}`}>
                      SUBJECT SELECTED
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <h2 className="candidate-name">{current.name}</h2>
            <dl className="candidate-details">
              <dt>CANDIDATE AGE</dt>
              <dd>{current.age} Years</dd>
              <dt>REGISTRATION ID</dt>
              <dd>#{current.id}</dd>
              <dt>APPLICATIONS</dt>
              <dd>
                {current.exams.map((exam) => (
                  <div key={exam}>• {exam}</div>
                ))}
              </dd>
              <dt>STATUS</dt>
              <dd>
                <span
                  className={`badge ${current.status === 'awaiting-correction' ? 'rose' : 'gold-badge'}`}
                >
                  {current.status === 'awaiting-correction'
                    ? 'AWAITING CORRECTION'
                    : 'AWAITING REVIEW'}
                </span>
              </dd>
            </dl>
            {current.status === 'awaiting-correction' && (
              <div className="notice">
                <Icon name="Info" />
                <div>
                  <strong>Waiting for the applicant’s response</strong>
                  <p>{current.query.details}</p>
                  <small>
                    This application remains first in line. Further review is
                    paused.
                  </small>
                </div>
              </div>
            )}
            {current.paymentVerification && <div className="payment-record notice" role="status"><div><strong>{current.paymentVerification.status === 'collected' ? 'Payment Collected' : 'Payment Not Collected — Application Pending'}</strong>{current.paymentVerification.reason && <p>{current.paymentVerification.reason}</p>}<small>Recorded by {current.paymentVerification.teacherName} · {new Date(current.paymentVerification.confirmedAt).toLocaleString()}</small></div></div>}
            <div className="application-actions">
              <Button
                variant="outline"
                disabled={['awaiting-correction','approved','rejected'].includes(current.status)}
                onClick={() => open({ type: 'query', candidate: current })}
              >
                Query Application
              </Button>
              <Button
                variant="danger"
                disabled={['awaiting-correction','approved','rejected'].includes(current.status)}
                onClick={() => open({ type: 'reject', candidate: current })}
              >
                Reject
              </Button>
              <Button
                disabled={['awaiting-correction','approved','rejected'].includes(current.status)}
                onClick={() => open({ type: 'approve', candidate: current })}
              >
                Approve & E-Sign <Icon name="Pencil" />
              </Button>
            </div>
          </section>
          <div className="section-heading next-heading">
            <h2>Next In Line</h2>
            <span className="eyebrow muted">UPCOMING REVIEWS</span>
          </div>
          <div className="table-wrap">
            <table className="queue-table">
              <thead>
                <tr>
                  <th>Candidate Name</th>
                  <th>Application Type</th>
                  <th>Submitted</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {pending.slice(1, 4).map((a) => (
                  <tr key={a.id}>
                    <td>{a.name}</td>
                    <td>{a.discipline}</td>
                    <td>
                      {dateLabel(a.submittedAt.slice(0, 10))},{' '}
                      {a.submittedAt.slice(11, 16)}
                    </td>
                    <td>
                      <span className="waiting">WAITING</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {pending.length === 1 && (
              <p className="empty">No further applications in line.</p>
            )}
          </div>
          <div className="notice fifo-note">
            <Icon name="Info" />
            <div>
              <strong>Application Review</strong>
              <p>
                Please verify all
                documents against original records before e-signing the
                approval.
              </p>
            </div>
          </div>
        </>
      ) : (
        <section className="empty panel">
          <Icon name="CircleCheck" size={48} />
          <h2>All caught up</h2>
          <p>There are no applications awaiting your review.</p>
        </section>
      )}
    </div>
  );
}
