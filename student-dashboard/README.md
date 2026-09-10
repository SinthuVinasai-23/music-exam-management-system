# Music Examination System — Frontend Preview

A React frontend recreation of the Music Examination System's public-facing screens plus a Phase 2 student/applicant portal.

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
