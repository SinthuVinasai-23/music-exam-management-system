# Teacher Portal verification

Executed on Windows with Node.js 22 and headless Microsoft Edge, using the actual local application.

## Business-rule tests — 11 PASS

| Check                                                                   | Result |
| ----------------------------------------------------------------------- | ------ |
| FIFO sorting and rejection of skipped applications                      | PASS   |
| Blank signature validation                                              | PASS   |
| Approval signature storage, queue progression, roster and event updates | PASS   |
| Rejection reason and simulated refund initiation                        | PASS   |
| Query validation, applicant event and paused FIFO                       | PASS   |
| Invalid capacity, reversed time and venue overlap                       | PASS   |
| Session creation and activity                                           | PASS   |
| Slot assignment, status update and duplicate prevention                 | PASS   |
| Full sessions and discipline mismatch                                   | PASS   |
| Candidate overlap and 30-minute buffer                                  | PASS   |
| Profile, security, read state and serialization                         | PASS   |

## Browser checks — 16 PASS

| Check                                                                | Result |
| -------------------------------------------------------------------- | ------ |
| Dashboard navigation, cards and review links                         | PASS   |
| Approval: blank validation, typed signature, PDF receipt, FIFO       | PASS   |
| Approval: drawn signature, clear, redraw and submit                  | PASS   |
| Rejection validation and queue advancement                           | PASS   |
| Query validation, urgency, success and blocked paused review         | PASS   |
| Roster search, status filter, pagination and PDF download            | PASS   |
| Candidate slot assignment and shared state update                    | PASS   |
| Calendar, session validation, creation, conflicts and candidate view | PASS   |
| Profile email validation and Profile → Security → success            | PASS   |
| Invalid photo format and 2 MB limit                                  | PASS   |
| Notification read state and unique load-more                         | PASS   |
| Activity toggle, outside click, Escape and route dismissal           | PASS   |
| All seven routes opened directly; refresh retained state             | PASS   |
| Mobile navigation and no document overflow at 390px                  | PASS   |
| Logout guard and explicit demo re-entry                              | PASS   |
| No uncaught runtime or console errors                                | PASS   |

Production build: PASS. Application-scoped lint: PASS.

PDF structure/content validation: PASS. An independent pypdf parser verified a three-page export, the final candidate record, and escaped parentheses/backslashes. This check found and resolved a missing PDF operator separator after the browser download tests.

The starter's unused shadcn components are outside the application lint scope; its generated accessibility rules flag several untouched template primitives. The portal's own source and routes pass the same lint configuration.

## Scope limits

The report does not claim Firefox/Safari testing, real email/refund/authentication validation, load tests, security certification, or pixel-perfect visual equivalence. Desktop dashboard artwork/layout was inspected, and mobile overflow was measured. Live backend behaviors are integration dependencies, not completed frontend tests.
