import test from 'node:test';
import assert from 'node:assert/strict';
import { examinerReducer, initialExaminerState, resultFor, validMark, submissionError, SUBMITTED } from '../src/examiner/examinerState.js';

test('marks share the existing grade thresholds and reject invalid entries', () => {
  for (const value of ['0', '59', '60', '75', '90', '100', '89.5']) assert.equal(validMark(value), true);
  for (const value of ['', '-1', '101', 'abc', '1e2', ' ', 'Infinity']) assert.equal(validMark(value), false);
  assert.deepEqual(resultFor('59'), { grade: 'Fail', outcome: 'Fail' });
  assert.equal(resultFor('60').grade, 'Pass');
  assert.equal(resultFor('75').grade, 'Merit');
  assert.equal(resultFor('90').grade, 'Distinction');
});
test('session boundaries and finalized records reject writes', () => {
  const state = initialExaminerState();
  assert.equal(examinerReducer(state, { type: 'MARK', sessionId: 'outside', candidateId: 'x', value: '95' }), state);
  const archived = state.sessions.find(s => s.status === SUBMITTED);
  assert.equal(examinerReducer(state, { type: 'MARK', sessionId: archived.id, candidateId: archived.candidates[0].id, value: '99' }), state);
  const foreign = { ...state, sessions: [...state.sessions, { ...state.sessions[0], id: 'foreign', examinerId: 'someone-else' }] };
  assert.equal(examinerReducer(foreign, { type: 'SELECT', sessionId: 'foreign' }), foreign);
});
test('draft, page, feedback, submission and administrator-only publication', () => {
  let state = initialExaminerState();
  const id = state.sessions[0].id;
  assert.match(submissionError(state.sessions[0]), /need marks/);
  assert.equal(examinerReducer(state, { type: 'SUBMIT', sessionId: id }), state);
  state = examinerReducer(state, { type: 'MARK', sessionId: id, candidateId: state.sessions[0].candidates[3].id, value: '86' });
  state = examinerReducer(state, { type: 'FEEDBACK', sessionId: id, candidateId: state.sessions[0].candidates[0].id, feedback: { technical: 'Accurate', artistic: 'Expressive', overall: 'Strong performance' } });
  state = examinerReducer(state, { type: 'SAVE', sessionId: id, at: '2026-09-08T10:00:00Z' });
  assert.equal(state.sessions[0].lastSaved, '2026-09-08T10:00:00Z');
  assert.equal(state.sessions[0].candidates[0].feedback.technical, 'Accurate');
  state = examinerReducer(state, { type: 'SUBMIT', sessionId: id, at: '2026-09-08T10:01:00Z' });
  assert.equal(state.sessions[0].status, SUBMITTED);
  assert.equal(state.sessions[0].published, false);
  assert.equal(state.sessions[0].submittedAt, '2026-09-08T10:01:00Z');
  assert.equal(examinerReducer(state, { type: 'SUBMIT', sessionId: id }), state);
});
