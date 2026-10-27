# Requirements traceability — pre-implementation baseline

Reviewed all 22 pages of the supplied SRS v1.0 and the complete pasted change request before implementation. Original source archives remain in `original-main` and `original-student` outside this working project. Existing React views are retained in source; production routes will use authenticated persistent workflows instead of simulated data.

## Reconciliation decisions

- Student/parent dashboard access requires BOTH email verification (FR-001) and admin approval (new request).
- Permanent Student ID belongs to the candidate, never to an account or exam. Transfer attaches a login to the same row and keeps the family relationship.
- One yearly application per student. One subject row per level; repeated subject entries are permitted ONLY for the prerequisite bundle explicitly required by FR-004/026. Each subject-level exam receives a distinct index.
- Confirmation queues a notification per subject immediately; teacher decisions remain blocked until full payment confirmation (FR-007). Allocated/unverified funds are not settled funds.
- Admin candidate identification card displays only photo/name/QR. Detailed admission cards remain separate to preserve FR-015 and teacher signatures.
- SRS names no payment provider. A provider interface must fail closed until configured. No browser-driven payment success.
- The newly approved replacement image has not been identified. Retain existing asset pending identification, document as blocked.
- Numeric operational targets require deployment/load/usability/browser verification; do not claim these from unit tests.

## Original SRS coverage plan

| Requirement | Scope | Implementation target | Verification target |
|---|---|---|---|
| FR-001, US-1.1/1.2 | Secure expiring email verification and activation status | server/app.py accounts, email outbox; Portal.jsx auth/admin | account/verification tests |
| FR-002, US-2.1/2.2 | Multiple candidates, independent draft/application editing | students, yearly applications, parent UI | ownership and draft tests |
| FR-003, US-3.1 | Minimum submission age six | submission validation | boundary tests |
| FR-004/026, US-3.2 | Missing prerequisite bundle | subject-level validation, bundle UI | prerequisite tests |
| FR-005, US-2.3 | Registered teacher assignment | eligibility relation, subject requests | eligibility tests |
| FR-006 | Candidate signature | protected uploads/application snapshot | upload/submission tests |
| FR-007/008, US-4.1/4.2 | Confirmed payment gate and retry | allocations/provider service | balance/payment gate tests |
| FR-009, US-5.1 | Strict FIFO | teacher decision transaction | queue order tests |
| FR-010, US-5.2 | Queries, pause, response | teacher review and applicant response | query tests |
| FR-011 | Reasoned rejection/refund | refund jobs, email outbox | rejection tests |
| FR-012 | Teacher approval signature | protected approval upload | signature tests |
| FR-013, US-6.1/6.2 | Teacher grouping/conflict buffer | allocator and configurable slots | overlap/capacity tests |
| FR-014, US-7.1/7.2 | Non-guessable slot-linked admission | admissions | uniqueness tests |
| FR-015 | Detailed downloadable emailed admission card | PDF endpoint/email attachment | PDF tests |
| FR-016/017/025, US-8.1/8.2/8.3 | Scoped single-use verification | session assignments, invigilator UI | scope/reuse tests |
| FR-018, US-9.1 | Scoped evaluator draft/submit | results and examiner UI | scope/workflow tests |
| FR-019/020, US-9.2 | Admin correction/publication/official PDF | results UI/PDF | unpublished isolation tests |
| FR-021/022, US-10.1/10.2 | Passing family grouping/notification | ceremony allocator | hard-family constraint tests |
| FR-023/024/027, US-11.1/11.2 | Branded email, logs, three retries | outbox worker, EMAILS.md | retry tests |
| Roles §1.3, US-3.3 | Admin configuration, superadmin roles/audit/recovery | administration endpoints/UI | authorization tests |
| NFR-001/003 | <2s at 500 users; 10k users/2k submissions | deployment/load plan | external load validation required |
| NFR-002 | Passwords, verification, AES-256/TLS | hashing, encrypted media, production config | security tests + deployment verification |
| NFR-004/007 | 95% under 15min; latest two browsers | responsive UI | usability/browser acceptance required |
| NFR-005 | 99.5% uptime | backup/monitoring deployment instructions | operational measurement required |
| NFR-006 | Admin configuration without code | catalog/session/ceremony UI | config tests |

## Change request and mandatory test mapping

| Test IDs | Requirement | Implementation target |
|---|---|---|
| 1–3 | Three-field registration, approval gating | auth forms, users.approval |
| 4–7,26 | Permanent identity, unique indexes, no phantom exams | students/public_id, application_subjects/index_number, yearly query |
| 8 | Strict DOB dd/mm/yyyy | candidate form, server date parser |
| 9–12 | Multiple children, age >14 transfer, same ID, approval | parent_students, transfer endpoint |
| 13 | Per-subject level/eligible teacher | catalog, application validation |
| 14–16 | Complete confirmation/edit signature/back persistence | application wizard, server draft |
| 17–18 | Independent requests and teacher scope | notifications, review authorization |
| 19–20 | Protected admin print, real QR payload | candidate-card endpoint |
| 21–24 | Three methods, teacher allocations, split/overpayment | payment transactions, balance summaries |
| 25 | Required encryption wording | Confirm and Pay panel |
| Security | Role scope, protected validated uploads, CSRF/session | middleware, media service, authorization tests |
| Image | Approved responsive Mridangam image | pending user identification |

The tables above were created before implementation. They are not a completion certificate. Final evidence and remaining external acceptance conditions are recorded in STATUS.md.

## Implemented anchors and verification evidence

All backend anchors below are functions in `server/app.py` unless otherwise specified. UI anchors are components in `src/portal/Portal.jsx`. `server/tests/test_portal.py` contains the named backend tests; `tests/portal-browser.mjs` contains the end-to-end checks.

| Scope / mandatory check | Backend / database | UI | Verified test evidence |
|---|---|---|---|
| 1,2: three-field registration | `new_account`, `register`, `users` | `AuthPage` | parameterized registration backend test; browser registration field check |
| 3: approval and email gate | `user`, `login`, `verify`, `approval` | `AuthPage`, `VerifyPage`, `Approvals` | `test_registration_minimal_and_approval_gate` |
| 4,5: unique permanent ID | `students.public_id`, `new_account`, `transfer` | `Applicant`, `Wizard` | `test_identity_indexes_and_no_phantom_exams` |
| 6: three subject indexes | `submit`, `application_subjects.index_number` unique | `ApplicationList`, `Teacher` | identity test, three-subject browser workflow |
| 7,26: no current-year phantom exams | `applications` scoped year query; only `submit` creates exam entries | `Applicant` | identity test moves application to previous year; empty-dashboard browser check |
| 8: DOB format/calendar validation | `dob_date`, `age`, `submit` | `Wizard`, `candidateAge` in api.js | six invalid-date cases; confirmation/browser DOB check |
| 9: multiple children | `add_child`, `parent_students` | `Applicant` | `test_parent_multiple_transfer_and_ownership` |
| 10: age >14 transfer | `transfer` | `Applicant` | parent transfer test plus `test_exact_fourteen_transfer_blocked` |
| 11,12: transfer identity and approval | `transfer`, `new_account(student_id)` | transfer form | parent transfer test, family-after-transfer test |
| 13: valid level/teacher for each subject | `submit`, `subject_levels`, `teacher_subjects` | `Wizard` | invalid-teacher/level test; prerequisite test |
| 14: full confirmation | submitted fee snapshot and protected upload IDs | `Wizard` step 3 | browser complete-confirmation check |
| 15,16: signature edit / preserved Back | saved server draft | `Wizard`, `Upload` | browser signature-edit/Back check; draft persistence backend assertion |
| 17: separate teacher requests | `submit`, `notify`, durable outbox | `Teacher` | teacher request count per teacher |
| 18: teacher ownership | `review`, `teacher_requests` | `Teacher` | cross-teacher approval rejection test |
| 19,20: real QR print / payload | `candidate_card`, qrcode + ReportLab | Admin print link | QR decoded from rendered PDF using ZXing; browser authenticated PDF fetch |
| 21: three methods | `PaymentService`, `allocate` | `PaymentPanel` | browser method options; failed-card retry test |
| 22: receiving teacher | required FK and balance lookup | `PaymentPanel` | allocation/receipt ownership tests |
| 23,24: split balances / overpayment | `money`, `allocate`, `BEGIN IMMEDIATE`, request key | balance tables | split test, idempotency test, eight simultaneous requests test |
| 25: encryption wording | production TLS boundary documented | `Wizard`, `PaymentPanel` | browser exact-text assertion |
| FR-001 recovery | `resend_verification`, token expiry | `ResendVerification` | single-use verification backend assertions |
| FR-004/026 bundles | lower-level published-pass or co-registration checks | Add prerequisite bundle | `test_selection_prerequisites_duplicates_age_and_draft` |
| FR-009/010/012 teacher workflow | FIFO, query pause/response, protected signature | `Teacher`, `AmendCandidate` | FIFO, teacher signature and amendment tests |
| FR-011 refunds | `refund_jobs`, `refund_allocations`, `refund_complete` | `Refunds` | manual refund completion/replay test |
| FR-013/014/015 scheduling/cards | `allocate_slots`, `admissions`, `admission_pdf`, `reschedule` | `Admissions`, `Reschedule` | scoped lifecycle and rescheduling-code-revocation tests |
| FR-016/017/025 invigilator | `session_staff`, `consume` | `Admissions` code input supporting hardware scanner | scoped lifecycle test, used-code rejection |
| FR-018/019/020 results | `save_result`, `result_list`, `result_pdf`, feedback | `Results` | examiner scope, hidden unpublished records and PDF publication test |
| FR-021/022 ceremony | `ceremonies_allocate`, stable `family_id` | `Ceremonies` + CSV export | indivisible family capacity/transfer test |
| FR-023/024/027 email | `notify`, `server/worker.py`, EMAILS.md | delivery logs/retry | initial attempt + exactly three failed retries; no secrets in exception logs |
| §1.3 teacher invitation | `invite_teacher`, `invitation_decide`, setup flag | `InviteTeacher`, `TeacherInvitations` | invitation remains ineligible until verified and Admin-approved |
| §1.3 superadmin/account controls | approval, staff creation, role mutation, `audit_logs`, `account_update` | `Approvals`, `AccountSettings`, audit table | role/scope tests and password session-revocation test |
| Security | `auth`, `student_access`, `media`, `csrf`, session version | API-backed routes | unauthorized media, malformed uploads, CSRF and copied-session tests |
| Migrations | 001 core, 002 account/refund operations, 003 amendments/invitations/feedback | n/a | repeated migration preserves user record |

Original NFR-001/003/004/005/007 and production portions of NFR-002 require the external measurements/configuration described in STATUS.md and README. The approved image replacement remains blocked on asset identification. No silent waiver is implied.
