import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState } from '../src/teacher/data/seed.js';
import {
  queue,
  transact,
  validateAssignment,
  validateSession,
} from '../src/teacher/services/portal.js';
const fresh = () => structuredClone(initialState);
test('submission order remains sorted and an individually selected student can be approved', () => {
 const s=fresh();s.applications.reverse();assert.equal(queue(s)[0].name,'Ananya Nair');const selected=queue(s)[1];
 const result=transact(s,{type:'approve',id:selected.id,paymentStatus:'collected',signature:{method:'type',value:'Teacher'}});
 assert.equal(result.applications.find(a=>a.id===selected.id).status,'approved');
 assert.throws(()=>transact(s,{type:'approve',id:'unknown'}),/awaiting review/);
});
test('Blank signatures are rejected', () => {
  assert.throws(
    () =>
      transact(fresh(), {
        type: 'approve',
        id: initialState.applications[0].id,
        signature: { method: 'type', value: '  ' },
      }),
    /signature/,
  );
});
test('Approval records endorsement, advances FIFO, adds roster entries and notification', () => {
  const s = fresh(),
    a = queue(s)[0],
    next = transact(s, {
      type: 'approve',
      id: a.id,
      signature: { method: 'type', value: 'Dr. Ramesh Iyer' },
      paymentStatus: 'collected',
    });
  assert.equal(next.applications[0].status, 'approved');
  assert.equal(next.applications[0].signature.value, 'Dr. Ramesh Iyer');
  assert.equal(queue(next)[0].name, 'Ashwin Pillai');
  assert.equal(next.students.length, s.students.length + 3);
  assert.equal(next.emailEvents[0].recipient, a.email);
  assert.equal(s.applications[0].status, 'awaiting-review');
});
test('Rejection requires reason and records refund initiation', () => {
  const s = fresh(),
    id = queue(s)[0].id;
  assert.throws(
    () => transact(s, { type: 'reject', id, reason: '' }),
    /reason/,
  );
  const next = transact(s, {
    type: 'reject',
    id,
    reason: 'Prerequisite certificate is not valid.',
  });
  assert.equal(next.applications[0].refund, 'initiated-demo');
  assert.equal(next.applications[0].status, 'rejected');
  assert.equal(queue(next).length, 11);
});
test('Query validates details, notifies applicant, and pauses FIFO', () => {
  const s = fresh(),
    id = queue(s)[0].id;
  assert.throws(
    () => transact(s, { type: 'query', id, details: '' }),
    /correction/,
  );
  const next = transact(s, {
    type: 'query',
    id,
    details: 'Please upload a legible certificate.',
    category: 'Documentation',
    urgency: 'Urgent',
  });
  assert.equal(queue(next)[0].id, id);
  assert.equal(next.applications[0].status, 'awaiting-correction');
  assert.equal(next.emailEvents[0].recipient, s.applications[0].email);
  assert.throws(
    () =>
      transact(next, {
        type: 'approve',
        id,
        signature: { method: 'type', value: 'Teacher' },
      }),
    /paused/,
  );
});
test('Session rejects invalid capacity and venue overlap', () => {
  const s = fresh(),
    session = { ...s.sessions[0] };
  assert.throws(
    () => validateSession(s, { ...session, capacity: 0 }),
    /whole number/,
  );
  assert.throws(
    () => validateSession(s, { ...session, capacity: 1.5 }),
    /whole number/,
  );
  assert.throws(() => validateSession(s, session), /overlapping/);
  assert.throws(
    () => validateSession(s, { ...session, start: '15:00', end: '14:00' }),
    /end after/,
  );
});
test('Session creates new record and activity', () => {
  const s = fresh();
  const next = transact(s, {
    type: 'session',
    session: { ...s.sessions[0], date: '2026-12-25' },
  });
  assert.equal(next.sessions.length, s.sessions.length + 1);
  assert.match(next.activity[0].text, /Scheduled/);
});
test('Slot assignment is reflected in roster and applicant events', () => {
  const s = fresh(),
    student = s.students[1],
    session = s.sessions.find((x) => x.type === student.discipline);
  const next = transact(s, {
    type: 'assign',
    studentId: student.id,
    sessionId: session.id,
  });
  assert.equal(next.students[1].status, 'Slot Assigned');
  assert.equal(next.students[1].sessionId, session.id);
  assert.equal(next.emailEvents[0].recipient, student.email);
  assert.throws(
    () => validateAssignment(next, student.id, session.id),
    /already assigned/,
  );
});
test('Slot assignment rejects full sessions and discipline mismatch', () => {
  const s = fresh(),
    student = s.students[1],
    session = s.sessions.find((x) => x.type === student.discipline);
  session.capacity = 0;
  assert.throws(() => validateAssignment(s, student.id, session.id), /full/);
  assert.throws(
    () => validateAssignment(s, student.id, s.sessions[0].id),
    /matching/,
  );
});
test('Multi-instrument candidate cannot overlap exams including 30-minute buffer', () => {
  const s = fresh(),
    student = s.students[3],
    other = s.students[2],
    prior = s.sessions.find((x) => x.id === other.sessionId);
  s.sessions.push({
    ...prior,
    id: 'collision',
    type: student.discipline,
    start: '13:10',
    end: '14:10',
  });
  assert.throws(
    () => validateAssignment(s, student.id, 'collision'),
    /30-minute/,
  );
});
test('Profile, security, read state persist through serialization without passwords', () => {
  let s = transact(fresh(), {
    type: 'profile',
    profile: { ...initialState.profile, firstName: 'Dr. Maya' },
  });
  s = transact(s, { type: 'security', security: { twoFactor: true } });
  s = transact(s, { type: 'read' });
  s = JSON.parse(JSON.stringify(s));
  assert.equal(s.profile.firstName, 'Dr. Maya');
  assert.equal(s.security.twoFactor, true);
  assert.ok(s.notifications.every((n) => n.read));
  assert.equal(s.security.password, undefined);
});
test('Session validates missing fields, invalid calendar dates, and invalid time values', () => {
 const s=fresh(), session={...s.sessions[0],date:'2026-12-25'};
 for (const field of ['date','start','end','venue','type']) assert.throws(()=>validateSession(s,{...session,[field]:''}),/Complete all/);
 assert.throws(()=>validateSession(s,{...session,date:'2026-02-30'}),/valid examination date/);
 assert.throws(()=>validateSession(s,{...session,start:'25:00'}),/valid start/);
 assert.throws(()=>validateSession(s,{...session,date:'2020-01-01'}),/future/);
});

test('payment selection is mandatory before approval',()=>{
 const s=fresh(),id=queue(s)[0].id,signature={method:'type',value:'Teacher'};
 assert.throws(()=>transact(s,{type:'approve',id,signature}),/Payment Collected/);
 assert.throws(()=>transact(s,{type:'approve',id,signature,paymentStatus:'not-collected'}),/Payment Collected/);
});
test('uncollected payment requires a reason and keeps the same application pending',()=>{
 const s=fresh(),id=queue(s)[0].id;
 assert.throws(()=>transact(s,{type:'payment',id,paymentStatus:'not-collected',paymentReason:'  '}),/reason/);
 const pending=transact(s,{type:'payment',id,paymentStatus:'not-collected',paymentReason:'School payment has not arrived.'});
 assert.equal(queue(pending)[0].id,id);assert.equal(pending.applications[0].status,'awaiting-review');assert.equal(pending.students.length,s.students.length);
 assert.equal(pending.applications[0].paymentVerification.reason,'School payment has not arrived.');assert.equal(pending.applications[0].paymentVerification.teacherName,'Dr. Ramesh Iyer');assert.ok(Date.parse(pending.applications[0].paymentVerification.confirmedAt));
 const saved=JSON.parse(JSON.stringify(pending));
 assert.throws(()=>transact(saved,{type:'approve',id,paymentStatus:'collected',signature:{method:'type',value:''}}),/signature/);
 const approved=transact(saved,{type:'approve',id,paymentStatus:'collected',signature:{method:'type',value:'Dr. Ramesh Iyer'}});
 assert.equal(approved.applications[0].status,'approved');assert.equal(approved.applications[0].paymentVerification.status,'collected');assert.equal(approved.applications[0].paymentHistory.length,2);assert.equal(approved.applications[0].paymentVerification.reason,'');assert.notEqual(queue(approved)[0].id,id);
});
