# Music Examination Management Portal

A persistent React + Flask portal implementing the merged SRS and change request. Read `docs/STATUS.md` for verified coverage and remaining external acceptance work. This is not yet a production acceptance sign-off.

## What changed

The supplied archives were frontend demonstrations. This update adds a transactional database and authenticated backend, and connects registration, Student/Parent/Teacher/Admin/Invigilator/Examiner/Superadmin workflows. The source archives were preserved separately in the workspace. Old demonstration views remain in `src/student` and `src/examiner` for reference but are not routed as trusted live dashboards. Public home, FAQ and contact views are retained; contact now persists submissions.

- Permanent Student IDs and separate unique subject-level exam indexes.
- Email verification plus Admin approval; three-field Student/Parent registration.
- Multiple children, strict DOB validation and identity-preserving transfer above age 14.
- Protected encrypted photos/signatures, per-subject eligible teachers and levels, prerequisite bundles, saved drafts, complete confirmation and split teacher allocations.
- FIFO teacher decisions, signatures, queries, versioned candidate amendments and teacher invitations requiring Admin eligibility approval.
- Session allocation with conflict/buffer/capacity rules, scoped single-use admissions, safe rescheduling and detailed PDF admission cards.
- Scoped marks/feedback/drafts/submission, Admin result publication/unpublication, official result PDFs and passing-family ceremony grouping.
- Admin candidate-card PDFs containing photo, full name and a real QR; durable email outbox with three retries; manual refund receipts and provider refund boundary.

## Requirements

Python 3.12+, Node.js 22.12+ and npm. Commands below run from the `portal` directory in PowerShell. No default production user or password is included.

## Install and migrate

```powershell
python -m venv .venv
.\.venv\Scripts\python -m pip install -r server\requirements.txt
npm.cmd ci
.\.venv\Scripts\python server\app.py migrate
.\.venv\Scripts\python server\app.py bootstrap --email your-admin@example.org
```

Bootstrap prompts for the Super Administrator password instead of storing it in shell arguments. It is an operator-controlled initial account, already approved and verified; all ordinary registrations require both checks.

Migrations in `server/migrations` run in filename order and record completion in `schema_migrations`. Startup also applies unapplied migrations. They do not drop/recreate the production database. Back up first and apply with only one deployment instance starting. An undisclosed legacy production schema needs a separate reviewed mapping; never point this schema at an unknown existing database.

The development database, generated development keys and encrypted media live under `server/data`, which is excluded from version control. Preserve the media key when restoring data or moving machines.

## Run locally

Terminal 1:

```powershell
.\.venv\Scripts\python server\app.py serve
```

Terminal 2:

```powershell
npm.cmd run dev
```

Open [the local portal](http://127.0.0.1:5173). Vite proxies `/api` to Flask on port 5000. Start a third terminal for delivery after configuring SMTP:

```powershell
.\.venv\Scripts\python server\worker.py
```

Before accepting applications, sign in as Admin and configure subjects, subject-specific levels/fees, approved teachers and teacher eligibility, sessions/venues/buffers, staff session assignments and ceremony blocks. Fees use **whole CAD cents**. Session/ceremony times must include an ISO timezone offset. No fictional candidates, teachers, payments or exams are seeded into the normal database.

## Email configuration

Set these environment variables in the process supervisor or a secret manager. A `.env` file is not automatically loaded.

- `BASE_URL`: public HTTPS site URL in production; local frontend URL for development verification links.
- `SMTP_HOST`, `SMTP_PORT` (default 587), `SMTP_FROM`.
- `SMTP_USER`, `SMTP_PASSWORD` if your server authenticates.

The worker requires STARTTLS with certificate validation. See `docs/EMAILS.md` for templates, retry intervals and delivery semantics. Missing SMTP does not fake successful delivery: jobs remain queued/retrying and eventually flag for Admin review. No live emails were sent during testing.

## Payments

Card Payment, E-transfer and Hand over to Teacher all require a receiving teacher. Pending allocations reserve teacher and overall balance; only verified settled payments open teacher review. Teachers can confirm only their own teacher-handover receipts; Admin can reconcile manual transfers. Applicants can cancel unconfirmed manual allocations. Rejected subjects create refund jobs; Admin records a real manual repayment receipt or invokes the provider refund adapter.

The original SRS names no provider. `server/payments.py` defines the required service interface. The default fails closed with a clear message. Implement a factory and configure `PAYMENT_FACTORY=your_module:create_payment_service` to provide hosted checkout, server-side verification and idempotent refunds. No card numbers/CVV belong in this application.

Provider adapter contract:

1. `create_checkout`: use the allocation ID as an idempotency key and metadata, bind exact CAD cents, teacher ID and merchant account, and return `{url: "https://..."}` for hosted checkout.
2. `verify_payment`: retrieve provider state server-side and check allocation binding, expected amount/currency, teacher metadata, final settled state and your merchant account. Never accept a browser redirect as proof. Return true only after these checks.
3. `refund`: honor the supplied stable idempotency key, verify the original transaction and exact amount, and return true only for a confirmed refund. Reconciliation must handle uncertain responses.
4. Implement authenticated provider webhooks/reconciliation within the adapter integration before going live. The default implementation has no unsafe unauthenticated success endpoint.

Card checkout/live refunds and institutional E-transfer destination instructions require operator/provider configuration. Application data survives unavailable/failed card attempts.

## Tests

```powershell
.\.venv\Scripts\python -m pip install -r server\requirements-test.txt
.\.venv\Scripts\python -m pytest server\tests -q
npm.cmd run build
```

Browser acceptance uses a synthetic isolated database and never sends real email or charges cards. Stop the ordinary server on port 5000 first. Start the fixture in a separate terminal:

```powershell
.\.venv\Scripts\python server\tests\browser_server.py
```

Then, with Google Chrome installed:

```powershell
npm.cmd run test:browser
```

`PLAYWRIGHT_PATH` optionally points to a preinstalled Playwright package; otherwise the local dev dependency is used. Screenshots and test results go to `qa/portal`. The fixture creates temporary-only users and writes test credentials to `qa/portal/fixture.json`; never deploy that folder or run the fixture in production. Restart the fixture before repeating the browser suite.

The backend suite covers authorization, approval/verification, identity, prerequisite rules, age boundaries, encrypted media, overpayment under concurrent requests, provider-unavailable behavior, teacher FIFO/scope, amendments, invitations, QR **decoded from the rendered PDF**, migrations, email retries, results, admission reuse, rescheduling, refunds and family grouping.

The latest-two-browser-version, full concurrency, usability and uptime SRS targets remain separate acceptance tasks. See `docs/STATUS.md` and `docs/TRACEABILITY.md`.

## Production deployment

1. Take a consistent database backup using SQLite's backup API; back up encrypted media and keep keys separately. Test restoring both before rollout. Do not copy a live WAL database as a standalone file.
2. Run `npm.cmd ci` and `npm.cmd run build`. Ship only `dist`, `server`, dependency requirements and reviewed configuration; exclude QA fixtures, legacy demos, development keys and test databases.
3. Install Python requirements in an isolated environment. Set `PORTAL_ENV=production`, a strong random `SECRET_KEY`, a base64-encoded **32-byte** `MEDIA_KEY`, and HTTPS `BASE_URL`. Use a secret manager. Do not replace the media key without re-encrypting existing media.
4. Run migrations with a single deployment process. Configure SMTP/provider services, institutional subjects/fees/teachers and official signature text.
5. Run `server/app.py serve` under a process supervisor. Production uses Waitress on loopback port 5000. Reverse-proxy HTTPS to it, enforcing TLS 1.2+, correct Host handling and request-size/rate limits. The application serves the built React files directly.
6. Run one supervised email worker with the same database/media configuration. Monitor undeliverable jobs, pending refunds, HTTP errors, database lock latency, disk space, backup success and service health. Avoid multiple writers during migration.
7. Encrypt the database/media volume and backups with AES-256. Photos/signatures already use application-level AES-256-GCM; ordinary SQLite records require deployment-level encryption. Secure cookies, HSTS, CSP, HttpOnly and CSRF are enabled by the application; verify them at the public endpoint.
8. Benchmark the SRS's 500-user dashboard and 2,000-concurrent-submission targets. This SQLite implementation is a single-node baseline, not proof of those targets. Adapt the storage layer/migrations to PostgreSQL and shared session/rate-limit infrastructure when measured scale requires it.
9. Complete provider sandbox tests, email deliverability tests, browser/version/accessibility review, institutional PDF/font approval and recovery drills before production approval.

Rollback means restore the reviewed prior release and matching consistent database/media snapshot; never delete production tables to recover. Forward migrations are preferred when data has been written after deployment. Audit records and application amendment snapshots must be retained according to institutional policy.

## Important files

- `docs/TRACEABILITY.md`: original SRS and change-request mapping, written before implementation.
- `docs/STATUS.md`: verified evidence and remaining acceptance/input gaps.
- `docs/SECURITY.md`: authorization, encryption and operational boundaries.
- `server/app.py`: backend routes and domain transactions.
- `server/migrations`: non-destructive schema additions.
- `server/payments.py`, `server/worker.py`: provider boundary and durable email worker.
- `src/portal/Portal.jsx`, `src/portal/api.js`, `src/portal/portal.css`: connected role-based UI.

The approved replacement Mridangam image still needs identification. The current image remains at `src/assets/mridangam-hands.png` with responsive rendering and accessible alt text.

## Temporary frontend verification preview

The current local build uses `VITE_FRONTEND_DEMO=true` in `.env.local`, as requested for frontend review. Registration/login displays an email-verification screen. Code **2673** opens the Student or Parent dashboard; other codes are rejected. This is a browser-only preview session, not real email delivery or backend account approval. Passwords are not persisted in the preview.

Set `VITE_FRONTEND_DEMO=false` and rebuild to restore the connected authentication flow and run the connected browser suite. The temporary code never authenticates the backend. The preview covers verification and dashboard navigation; connected application actions require the connected mode.

Test the temporary flow with `node tests/frontend-verification.mjs` while the local server serves the demo build.

## Current preview: original ZIP layout restored

The latest request restores the original ZIP pages and styling. The active frontend uses the original registration modal with temporary code 2673 and the original student/examiner screens. See the latest UI restoration section in docs/STATUS.md for active changes and remaining integration work. The redesigned portal source and backend remain in the project but the original pages are the active preview. Rebuilding with VITE_FRONTEND_DEMO=false alone does not switch the restored App back to the redesigned portal. Test this version with `node tests/restored-zip-browser.mjs`.
