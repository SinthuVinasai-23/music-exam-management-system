# Music Examination System — Frontend Preview

A single React/Vite frontend containing the public website, Student, Examiner, and Admin portals. Start at `/`, `/student/dashboard`, `/examiner/dashboard`, or `/admin/dashboard`.

Examiner submissions enter Admin moderation before publication. Published results are shown for matching student applications; unpublishing removes access without deleting the evaluation. New student applications are available in the Admin registry. All sharing is local to the same browser origin, not a backend or authentication system.

Examiner routes include dashboard, examinations, evaluations, settings, and notifications. Admin routes include dashboard, applications, workflow/:id, configurations, users, results, ceremony, email-logs, system-health, audit-logs, security, and access-control.

## Scope

This is a **frontend-only** implementation built to demonstrate the visual design and interactive workflows shown in the supplied reference screenshots. It intentionally does **not** implement the full system described in the SRS. In particular, there is no backend, no database, and no real network activity:

- **Registration** validates input client-side and shows a "Verification Required" modal on success. No email is actually sent.
- **Contact form** validates input client-side and shows a "Message Sent" confirmation modal. No message is actually transmitted.
- **Login / Staff Login** are visually coherent placeholder pages — there is no authentication.
- **Student portal** is a connected frontend simulation: application drafts, subject choices, payment state, registry/status updates, admissions, results, and ceremony tickets are stored locally in the browser.
- **Payment** is simulated only. Card details are validated in the browser and are not transmitted. Full card numbers and CVV values are not saved; only safe receipt metadata such as invoice ID, amount, status, date, and last four digits are retained.
- **Receipts, admission cards, and certificates** are generated client-side as downloadable PDF files.

All of the above are real React state and interaction (not static mockups): routing, form validation, toggles, and modals all work as you use them.

## Technology Stack

- React 19
- React Router 7
- Vite 7
- lucide-react (icons)
- Plain CSS with custom properties (no CSS framework)

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

Starts the Vite dev server (defaults to `http://localhost:5173`).

## Production Build

```bash
npm run build
```

Outputs a static build to `dist/`. Preview it locally with:

```bash
npm run preview
```

## Routes

| Path           | Description                                   |
| -------------- | ---------------------------------------------- |
| `/`            | Home / landing page                            |
| `/faq`         | Frequently asked questions (accordion)         |
| `/contact`     | Contact form                                   |
| `/register`    | Candidate registration (Student / Parent)      |
| `/login`       | Candidate login (placeholder)                  |
| `/staff-login` | Faculty & staff login (placeholder)            |
| `/student/dashboard` | Applicant dashboard with active application, resources, latest results, and MCQ practice |
| `/student/application` | Candidate info application step with DOB, teacher, grade, and signature validation |
| `/student/application/selection` | Subject selection step |
| `/student/application/confirmation` | Review and fee confirmation step |
| `/student/payment` | Simulated secure payment gateway |
| `/student/applications` | Application Registry / Logs |
| `/student/admission` | Admission cards and downloads |
| `/student/results` | Examination results overview |
| `/student/results/:resultId` | Detailed examination result and certificate download |
| `/student/status` | Application status with admission actions |
| `/student/ceremony` | Ceremony ticket view |

## Notes

- The registration "Verification Required" and contact "Message Sent" states are frontend simulations built for this assignment — they demonstrate the intended user flow without any real email delivery or server-side processing.
- The student portal is frontend-only demo data. Refresh-safe applicant state uses `localStorage`; clearing browser storage resets seeded examples.

## Direct URL Guide

Run the project once with `npm install` and `npm run dev`. All portals use the same Vite origin; change only the path after `http://localhost:5173`.

- Public: `/`
- Student dashboard: `/student/dashboard`
- Student results: `/student/results`
- Examiner dashboard: `/examiner/dashboard`
- Examiner grading: `/examiner/examinations`
- Completed evaluations: `/examiner/evaluations`
- Admin/Super Admin dashboard: `/admin/dashboard`
- Application Registry: `/admin/applications`
- Configurations: `/admin/configurations`
- Users: `/admin/users`
- Results moderation: `/admin/results`
- Ceremony: `/admin/ceremony`
- Email logs: `/admin/email-logs`

For the latest cross-portal result flow, use `/examiner/examinations` -> `/admin/results` -> `/student/results`.

The Home-page **Staff Login** and **Candidate Login** buttons now use React Router to change the URL to `/staff-login` and `/login`. Invalid paths safely return to `/` rather than rendering a blank page.
