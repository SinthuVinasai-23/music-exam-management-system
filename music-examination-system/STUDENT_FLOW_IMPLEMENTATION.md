# Student flow implementation report

Current registration behavior is documented in [REGISTRATION_PARENT_UPDATE.md](REGISTRATION_PARENT_UPDATE.md). The follow-up requires explicit Student/Parent registration and code verification; it supersedes automatic registration verification described below.

Implemented in the existing React application. Existing student styling, main navigation and staff portals are retained. Student registration and application approvals default to approved in the demo; pending and rejected fields remain supported.

## Verification

- `node tests/student-flow.mjs`: passed the full browser scenario in installed Edge. Includes year-based minimum age, guardian fields, siblings sharing email, duplicate prevention, permanent IDs, returning login, mock recovery, multi-exam selection/chip removal, teacher schools, English/Tamil cumulative practice, independent sequential progression, automatic approvals, deadline closure, admission, PDF, print-content invocation, mobile width, About Us and teacher/admin routing.
- `node --test tests/teacher.test.mjs tests/supervisor.test.js tests/scanner.test.js tests/examiner-state.test.mjs`: 27 passed.
- Production Vite build passed. Existing large-bundle warning remains.
- `npm run dev`: successfully started auth service and Vite using AUTH_PORT=5018 and VITE_PORT=5186 to avoid already-used ports. Defaults remain unchanged.
- PDF required fields checked with pypdf and rendered with pypdfium2; visually reviewed with no clipping. Print test mocks the native print dialog and validates the generated print document and invocation.

## File changes

| File | Change |
| --- | --- |
| `src/App.jsx` | Recovery/About/admin routes, legacy student redirect, payment redirect. |
| `src/auth/api.js` | Persistent demo accounts, duplicate child matching, yearly serial IDs, returning login and mock recovery. Real auth API branch retained. |
| `src/auth/ApplicantGate.jsx` | Registration approval access gate. |
| `src/pages/Register.jsx` | Direct candidate registration, separate child/guardian details and validation. |
| `src/pages/Login.jsx` | Email or permanent ID login and Forgot Password link. |
| `src/pages/Recover.jsx` | Child identity matching and automatically verified password reset. |
| `src/pages/About.jsx` | About Us from editable local configuration. |
| `src/pages/DemoAdmin.jsx` | Demo deadline/session/About configuration, independent subject progress and routing overview. |
| `src/components/Navbar.jsx` | Existing organization logo and About Us link. |
| `src/student/rules.js` | Exact official sequence, minimum year-age, guardian age, eligibility, cumulative practice, approval and deadline/selection checks. |
| `src/student/data/studentData.js` | Official grade export, structured teachers/schools, Piano and subject introduction/image records; removed Diploma grades from demo data. |
| `src/student/data/practiceQuestions.js` | Subject/grade question records with English and Tamil content. Sample questions are demonstration data. |
| `src/student/context/StudentContext.jsx` | Per-account portal persistence, stable student identity, application entries and idempotent routing, automatic approval and admission. |
| `src/student/components/StudentLayout.jsx` | Logo and About Us navigation; removed Payment link. |
| `src/student/components/SubjectStudy.jsx` | All-subject dashboard cards, introductions, independent progress and cumulative bilingual practice. |
| `src/student/pages/StudentDashboard.jsx` | Integrated all-subject study section into existing dashboard. |
| `src/student/pages/ApplicationStep1.jsx` | Permanent Student ID read-only; registered DOB prefilled through context. |
| `src/student/pages/ApplicationSelection.jsx` | Multiple subjects/early exams, eligibility checkboxes, removable chips, teacher schools and medium; removed fee presentation. |
| `src/student/pages/ApplicationConfirmation.jsx` | Application review and submission without checkout. |
| `src/student/pages/RegistryPage.jsx` | Approved application history, Save PDF, Print and Exam Access. |
| `src/student/pages/AdmissionPage.jsx` | Approved entries determine exam access; school scheduling remains to be assigned. |
| `src/student/pages/PaymentPage.jsx` | Redirect to applications; online checkout removed. |
| `src/student/applicationDocument.js` | Reusable application PDF/print data with child names, ID and all subject/grade entries. |
| `src/student/utils.js` | Year-based minimum age and paginated, byte-offset-correct PDF generation. |
| `src/teacher/store.jsx` | Imports submitted demo applications into teacher state. |
| `src/teacher/views/Applications.jsx` | Existing application-line screen includes teacher-specific submitted entries and schools. |
| `src/teacher/data/seed.js` | Replaced invalid Level 5–8 demo values with official grades. |
| `public/subjects/piano.svg` | Piano introduction visual. |
| `public/subjects/violin.svg` | Violin introduction visual. |
| `public/subjects/veena.svg` | Veena introduction visual. |
| `public/subjects/mridangam.svg` | Mridangam introduction visual. |
| `public/subjects/flute.svg` | Flute introduction visual. |
| `public/subjects/bharatanatyam.svg` | Bharatanatyam introduction visual. |
| `public/subjects/carnatic-vocal.svg` | Vocal introduction visual. |
| `public/subjects/theory.svg` | Theory introduction visual. |
| `tests/student-flow.mjs` | Domain assertions and full browser regression suite. |
| `package.json` | Added test:student script; no new dependency needed. |
| `scripts/dev.mjs` | Optional VITE_PORT override while keeping default 5173. |
| `STUDENT_FLOW_IMPLEMENTATION.md` | This change and verification report. |

Build regenerated `dist/`. Test evidence is in `test-results/student-application.pdf`, `student-application.png`, and `student-mobile.png`.

## Demo use and backend boundaries

- Register at `/register`; retain the assigned `YEAR/NNNN` Student ID. Shared guardian email is supported; use each child's ID when shared credentials are ambiguous.
- Demo administration is at `/dashboard/admin`; teacher routed entries are at `/teacher/application-line`.
- `musicDemoAccounts`, `musicStudentPortal:<Student ID>`, `musicRoutedApplications` and `musicExamConfig` are browser-local repositories. Clearing site storage loses demo accounts. This is a development frontend, not a production account/security or database service. Passwords are demo-only browser values; production must replace this adapter with backend authentication.
- Backend integration should provide authoritative serial allocation, authenticated teacher/admin identities, application persistence, syllabus eligibility, translations and approval services. The teacher dropdown is a demo view selector; admin editing is deliberately local demo tooling.
- Early-stage eligibility defaults to all uncompleted examinations through Grade 3. A subject's `eligibleGrades` can narrow this for syllabus requirements. After Grade 3 only the next sequential grade is offered.
- PDF uses Helvetica for the English application document; native-script names require an embedded Unicode-font PDF implementation later. Tamil practice content is supported. Browser Print supports native script through installed fonts.
