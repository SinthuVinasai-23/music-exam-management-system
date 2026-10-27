# Supervisor portal completion report

The completed Teacher project now includes the Supervisor portal. The existing Supervisor implementation was reused, preserving its sidebar, header, typography, venue imagery, candidate cards and roster layout. All 22 SRS pages and supplied references were reviewed. Values such as counts, names, dates and status now come from state rather than unrelated screenshot totals.

## Run and access

Use Node.js 22.13 or newer. Run `npm install` and `npm run dev`, then open http://127.0.0.1:5173. Main website → Staff Login → enter a valid email and nonempty demo password → LOGIN → Supervisor. Teacher and other existing staff options remain available. Staff selection remains explicitly labelled as a prototype.

Demo lookup examples: Mozart Hall / Ananya Nair `MUS-7K9P-2X4Q` or `772-ART-24`; Sanjay Krishnan `819-MUS-24`; Siddharth Rajan `441-MUS-24`. Thillana Studio / Meera Kumar `630-DAN-24`. Shruti and Ashwin start verified. Tanjavur and Kriti intentionally demonstrate empty rosters.

## Files

Added `src/supervisor/Supervisor.jsx`, `Extras.jsx`, `store.js`, `scanner.js`, `auth.js`, `supervisor.css`; `public/supervisor/{logo,venues-reference,account-reference}.png`; supervisor/scanner unit tests, QR fixture, two browser suites, screenshot and JSON test evidence; this report.

Modified `src/App.jsx`, `src/pages/StaffLogin.jsx`, `package.json`, `package-lock.json`, `README.md`. Production `dist` rebuilt. Existing Teacher, applicant, examiner and public source modules were not replaced. Added only the existing scanner's `jsqr` dependency.

## Routes and interactions

| Route | Behavior |
| --- | --- |
| `/supervisor` | Assigned-session dashboard; session cards open their rosters |
| `/supervisor/dashboard`, `/dashboard/supervisor` | Dashboard aliases |
| `/supervisor/attendance` | Assigned venue selection |
| `/supervisor/attendance/:sessionId` | Scoped roster, search, filters, candidate actions, absence and submission |
| `/supervisor/attendance/:sessionId/manual/:candidateId` | Correct candidate's manual verification dialog and document review |
| `/supervisor/verification/:sessionId` | QR camera/manual-code lookup, profile, prerequisite preview, verification and admission |
| `/supervisor/verification` | Last selected assigned session |
| `/supervisor/account` | Profile → Security → Changes Saved Successfully |
| `/supervisor/notifications` | Notifications, individual/all read state, pagination |

The clock opens recent activity in a header dropdown; toggle, outside click and Escape close it. Gear opens Profile Information even when Security is already open. Bell opens the notifications page from all primary screens. Profile supports JPG/PNG upload (2 MB limit), validation, cancel and persisted edits. Security validates complete password fields, minimum length, confirmation and unchanged passwords; preferences persist without storing passwords. Logout preserves records and blocks direct re-entry until staff role selection.

Verification consumes a code once and sets Verified. Admission is a separate guarded transition to Admitted; re-scanning a consumed code is denied. Direct candidate URLs cannot admit pending candidates. Both verification and admission check session access and candidate eligibility. Attendance can close only when every candidate is verified/admitted or explicitly absent, with consistent verification records. Closed sessions cannot be changed. Selected session, candidate and saved records survive navigation and refresh.

Dialogs use the supplied white/gold design, focus trapping, Escape/close actions and scroll locking. They render above the sidebar on mobile. No browser alerts are used. The supplied attendance success heading is retained: “Attendance Submitted Successfully”. No separate supervisor denial/security/activity screenshots were supplied, so the existing supervisor denial presentation and earlier shared account/activity references were reused.

## SRS mapping

- FR-016, US-7.2, US-8.1: dedicated supervisor/invigilator dashboard, manual or QR admission lookup, candidate profiles, single-use consumption, expired/used rejection and attendance.
- FR-017 and supervisor side of FR-025 / US-8.2–8.3: only assigned sessions and their candidates are accessible; cross-session lookup is blocked. Administrator assignment controls remain outside this role.
- Audit activity: verification, admission, profile/security updates and attendance submission record timestamps and candidate/session details.
- NFR security: demo role/email-verification checks and validation exist, but browser-side checks are not production authorization. Production security requirements require server enforcement.

## Executed validation

- `npm run build`: PASS; Vite reports a non-failing bundle-size warning.
- Supervisor/scanner unit suites: 12 PASS, covering access scope, normalization, missing/used/expired/ineligible codes, document requirements, distinct admission, duplicate operations, immutable closed sessions, corrupt storage, invalid attendance and real QR-image decoding.
- `node tests/supervisor-browser.mjs`: 17 PASS groups covering the requested primary flows, four settings/bell origins, success/failure, multiple candidates/sessions, state persistence, direct routes, back/forward, read states, dropdown behavior and responsive layout.
- `node tests/supervisor-additional.mjs`: 8 PASS groups covering expiry/ineligibility/document failures, simulated camera denial, photo validation/upload, nested mobile dialogs, global search, empty attendance, notification pagination and logout.
- Teacher unit suite: 12 PASS. Teacher browser regression: 16 PASS groups.
- `npm run test:auth`: 7 PASS, including applicant roles, verification, SMTP delivery/failure, expiry, validation and CSRF.
- No supervisor browser runtime or significant console errors in the main suite. Desktop and 390 px mobile screenshots inspected; no horizontal page overflow. Evidence is under `test-results/supervisor`.

The requested test cases 1–26 are covered across the browser groups above. Camera decoding was tested with a real QR fixture and camera denial with a controlled browser stub; physical webcam capture was not tested. Browser automation ran in installed Microsoft Edge, not every browser/version in the SRS. Production load, encryption and uptime targets were not tested.

## Integration limits

This is the authorized functional frontend/mock implementation. Supervisor records use `mems-supervisor-v1` in localStorage and a tab-scoped demo login flag. They are not synchronized with a live exam-board service or other users' browsers. The pre-existing Teacher and Supervisor mock datasets are independent; no live teacher-to-supervisor data feed is claimed.

Staff authentication, actual password updates/current-password verification, MFA enrollment/challenges, server-side authorization and cross-device atomic code consumption need a staff identity/database API that is not supplied. Security controls validate and save demo preferences only, with this limitation visible in the UI. Original candidate document files were not supplied; document previews explicitly identify sample records. Supervisor notifications are local records; exam-event SMTP delivery/retries are not wired to these mock actions. The existing applicant email backend remains included and its tests pass. These backend limits prevent claiming production-wide SRS compliance.

The ZIP contains complete source, assets, lockfile, reports, test evidence and production build. Dependencies, caches, credentials and runtime applicant databases are excluded; `npm install` restores dependencies.
