# Delivery status

This is a substantial implemented update, **not a certification that every production acceptance criterion is complete**.

## Verified in this workspace

- Complete 22-page original SRS reviewed; pre-implementation mapping in `TRACEABILITY.md`.
- Additive SQLite migrations; repeat migration preserves records.
- Persistent role-based account/candidate/application/payment/examination workflows.
- Backend suite: 30 tests passed, including QR decoding from rendered PDF, concurrent overpayment, family grouping after transfer, session revocation, approvals, teacher scope, results and admission single-use checks.
- Production React build passed during implementation; final rerun recorded in QA outputs.
- Browser checks cover three-field Student/Parent registration, empty current-year dashboard, three subjects, confirmation data, signature editing, preserved Back navigation, split payments, 390px layout, teacher request scope, approval controls and candidate printing.
- Original static home, FAQ and contact layout retained. Contact submissions now persist and queue Admin email. Account-settings functionality has a persistent implementation.

## External inputs / acceptance work still required

1. **Approved Mridangam image:** none of the provided files is identified as the newly approved replacement. A clarification was requested. The existing image remains, responsive with descriptive alt text; do not mark the replacement complete.
2. **Real card provider and credentials:** the SRS specifies none. The requested secure payment-service interface is implemented; live checkout, provider reconciliation, webhooks/refunds and sandbox/provider acceptance require a chosen provider. Card attempts currently return a clear unavailable error without losing application data. No real card charges occurred.
3. **SMTP configuration:** durable delivery/retry logic is tested with injected senders. Live deliverability, sender DNS, branding approval and institutional email addresses require operator configuration. No live emails were sent.
4. **Production data:** neither archive contains a production backend/database. No legacy user or application records were imported from the fictional localStorage demos. If an undisclosed production database exists, supply its schema and a sanitized migration fixture before applying these migrations to it.
5. **NFR acceptance:** 500-user <2s latency, 10,000 accounts/2,000 concurrent submissions, 99.5% uptime, 95% first-use success under 15 minutes and the latest two versions of all four browsers are not proven. SQLite is a single-node baseline; production scale requires measured load validation and likely a PostgreSQL adaptation. No uptime or multi-browser certification is claimed.
6. **At-rest/transit deployment:** photos/signatures are AES-256-GCM encrypted. SQLite records and backups need an encrypted production volume; TLS and production secrets must be configured and independently verified.

## Remaining implementation/acceptance limitations

- Candidate corrections now store immutable prior snapshots, preserve IDs/indexes, revoke unused admissions and require affected teachers to re-endorse. Attended/evaluated records require administrative recovery rather than silent edits.
- Teacher invitations are implemented with secure initial password setup, email verification and explicit Admin subject-eligibility approval. Invited teachers are unavailable for selection until eligible and approved.
- Examiner feedback and persistent account settings are implemented. Synthetic demonstration analytics are replaced by counts from real applications/payments; original source and QA files remain available.
- Default printed PDFs use a basic Latin font. Institutional multilingual typography, approved official templates and signature authority require acceptance before issuing official records.
- Fee/level changes affect future submissions; submitted fee snapshots remain immutable. Admin can reschedule unconsumed, unevaluated admissions with capacity/buffer/conflict checks, revocation of old codes and emailed replacement cards.
- Superadmin may change roles on accounts without candidate ownership. Accounts with candidate history use the dedicated transfer mechanism; arbitrary ownership/role migration is blocked to prevent losing identity/history.
- Real provider refunds are subject to the configured provider adapter's idempotency/reconciliation contract. The default adapter is unavailable; manual refund completion requires a verified receipt and creates an allocation audit trail.

See `README.md` for setup and deployment. These limitations must remain visible until resolved; passing local tests does not waive original requirements.


## Frontend preview override (latest request)

The local build now uses a browser-only verification flow: it displays “Verification sent to your email” and accepts 2673 to open the next dashboard page. Incorrect codes are rejected. No real email is sent and no backend account is approved by this code. Student, Parent and login browser checks passed. Set VITE_FRONTEND_DEMO=false and rebuild to use the connected workflows described above.

## Latest UI restoration

The active frontend now uses the supplied ZIP's original pages, student/examiner layouts, global CSS and assets. The redesigned `src/portal/Portal.jsx` is retained as inactive implementation work, not imported by the active App. The parent screen is the image-based preview provided in the original main ZIP. This restores the requested frontend appearance; the earlier connected-portal browser results are historical and do not certify the restored original screens as integrated with the backend.

Targeted active changes: registration contains Name/Email/Password; the existing ZIP modal displays email-verification text and accepts 2673; login uses that same modal; the original student card shows no current-year exams without an application, uses a persistent local Student ID, and has descriptive image alt text. Other original frontend application/examiner screens remain as supplied, with their original demo behaviors. The broader backend implementation is retained; connecting all merged requirements to these original screens remains separate work and is not claimed complete.

Verified `node tests/restored-zip-browser.mjs`: original CSS matches the ZIP, original layout classes and application navigation render, incorrect code is rejected, 2673 reaches the original dashboard, and no browser errors occur. Production build passed.
