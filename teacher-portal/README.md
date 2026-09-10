# Music Examination — Teacher Portal

Complete React frontend based on the supplied Teacher Portal screen references and the teacher workflow in the Music Examination System SRS.

## Run locally

Requires Node.js 22.13 or newer and npm.

```sh
npm ci
npm run dev
```

Open `http://localhost:3000/teacher/dashboard` (or the URL printed by the server).

```sh
npm run build   # production build
npm start       # serve the production Worker locally
npm test        # 11 business-rule tests
npm run lint    # application, route and test source
```

The project uses React 19, Vite through Vinext, Next-compatible file routing, plain CSS, and Lucide icons. The generated Sites scaffold also includes optional shadcn primitives. Portal screens use the purpose-built components under `src/components`.

## Pages and routes

| Route                        | Screen                                                              |
| ---------------------------- | ------------------------------------------------------------------- |
| `/teacher/dashboard`         | Welcome, review metrics, application preview, upcoming sessions     |
| `/teacher/application-line`  | Strict FIFO review and next-in-line preview                         |
| `/teacher/students`          | Candidate roster, search, status filters, pagination, PDF, progress |
| `/teacher/exam-slots`        | Calendar, session list, venue filter, candidates, session creation  |
| `/teacher/settings`          | Editable profile and JPG/PNG photo upload                           |
| `/teacher/settings/security` | Password-form validation, demo 2FA preference, logout               |
| `/teacher/notifications`     | Read/unread notifications and load more                             |
| `/login`                     | Explicit entry into the frontend demonstration                      |

The root route redirects to the teacher dashboard. Unknown teacher paths have an in-app fallback. The sidebar and all header actions work across the principal pages.

## Implemented dialogs

- Approve & Finalize Application: mouse/touch canvas and typed signatures, clear, blank validation.
- Approval success: generated reference, timestamp, queue return, downloadable PDF receipt.
- Rejection reason: mandatory written reason and rejection result.
- Query / Request Correction: category, details, standard/urgent, query success.
- Assign Examination Slot: compatible dates, times and venues, capacity and conflict checks.
- Add New Examination Session: date, time, venue, discipline and capacity validation.
- Changes Saved Successfully.
- Recent Activity dropdown with outside-click, Escape, toggle and route-change dismissal.
- Supporting certificate preview, session candidates and examination progress details.

Dialogs use native modal semantics, keyboard focus management, Escape, explicit close/cancel controls, and viewport-constrained scrolling. Narrow screens have a collapsible sidebar and horizontally scrollable tables.

## Source map

```text
app/                       File routes, document metadata and CSS entry
src/App.jsx                Client entry, routing and demo session guard
src/store.jsx              Shared React context and browser persistence
src/data/seed.js            Demonstration applications, students and sessions
src/services/portal.js      Pure state transitions and business-rule validation
src/components/Layout.jsx  Sidebar, header, search and activity
src/components/ui.jsx      Buttons, fields, icons, avatars and native dialogs
src/components/Dialogs.jsx  Review, signature, scheduling and result flows
src/views/                 Dashboard, applications, roster, schedule, settings, notifications
src/utils/export.js        Downloadable multi-page text PDF generator
src/*.css                  Reference-based styling and responsive layouts
public/assets/             Supplied reference images used as CSS artwork sprites
tests/                     Business-rule and browser interaction tests
```

The artwork is clipped from the supplied screenshots using CSS. No separate original logo, font, portrait or illustration assets were provided. Typography uses local serif/sans-serif stacks, and the brand mark is a treble-clef approximation. Replace these with original design assets for pixel-exact production fidelity.

## State and workflow

`PortalProvider` shares applications, students, sessions, profile, security preferences, notifications, activity and simulated email events across every screen. `transact()` validates an action and returns a new state without mutating the old state. This is the integration boundary for future API calls.

- Applications are ordered by `submittedAt`. Review actions reject attempts to skip the first application.
- Approval requires a signature, stores its method/content with a unique reference and timestamp, advances the queue, and adds the candidate's examinations to the roster.
- Rejection requires at least ten characters, records the reason and simulated refund initiation, and advances the queue.
- Queries require at least ten characters, record category and urgency, and notify the applicant in the mock event log. The queried application remains at the head, with approval/rejection disabled until an applicant response is supplied by the future backend. This deliberately enforces strict FIFO rather than silently skipping it.
- Slot assignment requires a matching discipline/level and available capacity. Multiple examinations for one candidate cannot overlap, including a 30-minute buffer. Duplicate assignments are rejected.
- Session creation prevents overlapping bookings in the same venue.
- Counts derive from actual demo records rather than copying inconsistent reference totals.
- Profile save validates fields and opens Security. Security save validates optional password changes and shows success. Password values are not stored.
- Notifications and activity update after actions. Simulated recipient events are stored in `emailEvents` with `status: 'simulated'`.

State is stored under `music-teacher-portal-v1` in localStorage. Demo sign-out is stored separately in sessionStorage. To reset demo records, clear this site's browser storage. A storage failure displays a warning while keeping the current in-memory state usable.

## Browser tests

The browser runner expects Playwright and an installed Microsoft Edge browser:

```sh
npm install --no-save playwright
node tests/browser.mjs
```

Alternatively set `PLAYWRIGHT_MODULE` to an existing Playwright module directory. `BROWSER_CHANNEL` defaults to `msedge`; set it to an installed supported browser channel if needed. `TEST_URL` defaults to `http://localhost:3000`. Run the development server before the tests. The tests use a fresh browser context and create reports and sample exports under `test-results/`.

See `TEST_REPORT.md` for executed checks and their limits.

## Backend integration still required

This deliverable is a frontend demonstration, not a secured production examination service. It does not send actual messages or initiate financial operations.

- Authentication, verified-email access, authorization, password verification and real 2FA enrollment.
- Database persistence and authoritative server-side FIFO and scheduling validation.
- Applicant query responses and resume events.
- Email delivery, delivery logs and retries.
- Actual refunds/payment-provider integration.
- Secure e-signature and document storage, prerequisite verification, admission codes/cards.
- Official receipt generation and server-side audit records.

The certificate preview and exported receipts are explicitly marked as demonstration documents. Do not use browser storage for real candidate data or production credentials.
