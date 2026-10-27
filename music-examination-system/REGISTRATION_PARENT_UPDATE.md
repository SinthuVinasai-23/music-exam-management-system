# Registration and parent–student update

The registration follow-up replaces automatic registration verification with an explicit verification step. Admin approval remains automatically approved in this development version. The verification adapter accepts 123456, rejects other codes, and does not show the development code in the normal verification UI. No email is sent by the local demo adapter.

## Resulting flows

- Student registration: explicitly select Student, provide separate names, DOB, phone, email and matching password confirmation. Full-date age must be at least 16. Approval → code entry → own student dashboard.
- Parent registration: explicitly select Parent, provide separate parent credentials and child details. Approval → parent email verification → parent dashboard.
- Add New Candidate: authenticated parent opens the child-only form. Names + DOB are normalized and checked globally; a successful child record receives a unique registration-year serial ID and the existing parent ID.
- Parent dashboard lists only that parent’s children. Child dashboard selection validates ownership and loads that child’s saved profile, progress, results, drafts and applications. Parent access continues through the existing exam application routes.
- Student login still accepts Student ID or email; parent login uses Parent account type and parent email. Existing IDs are retained, including login in future years. Unverified registrations resume the verification screen.
- Full-date age applies to the age-16 self-registration boundary. The existing year-based minimum examination age of six remains unchanged.

## Changed files

| File | Purpose |
| --- | --- |
| `src/auth/demoAccounts.js` | Separate parent/student repositories, relationships, validation, permanent IDs, verification, login, ownership checks and candidate creation. |
| `src/auth/api.js` | Calls the demo account adapter; retains the existing real-auth API branch. |
| `src/auth/ApplicantGate.jsx` | Approval/verification checks, parent ownership checks, selected-child profile loading and keyed remounts to prevent stale child state. |
| `src/components/CandidateFields.jsx` | Reusable child/student fields and input component. |
| `src/pages/Register.jsx` | Restored explicit Student/Parent choices, age message, separate forms and password confirmation. |
| `src/pages/VerifyEmail.jsx` | Approval message and code entry/resend without displaying the development code. |
| `src/pages/ParentPreview.jsx` | Replaces static sample children with logged-in parent’s real local candidate list and responsive menu. |
| `src/pages/AddCandidate.jsx` | Authenticated child-only candidate form. |
| `src/pages/Recover.jsx` | Preserves verification redirect for accounts not yet verified. |
| `src/App.jsx` | Add-candidate route and parent dashboard alias. |
| `src/student/rules.js` | Normalized name comparison; removed obsolete registration validator superseded by the new account adapter. |
| `src/student/context/StudentContext.jsx` | Preserves each student’s stored results independently. |
| `src/student/components/StudentLayout.jsx` | Parent dashboard return link and logout. |
| `src/student/pages/StudentDashboard.jsx` | Uses only selected student’s own results. |
| `src/student/pages/ResultsPage.jsx` | Own-student result list and empty state. |
| `src/student/pages/ResultDetailPage.jsx` | Rejects result IDs outside the selected student’s record. |
| `src/styles/global.css` | Minimal fieldset and responsive candidate-card additions using existing styles. |
| `tests/registration-parent.test.mjs` | Seven domain tests, including a simulated future-year login. |
| `tests/registration-parent-browser.mjs` | Complete parent/student UI, verification, duplicate, ownership, child-isolation and mobile-menu tests. |
| `tests/student-flow.mjs` | Existing exam flow updated for Student/Parent registration and explicit code verification. |
| `package.json` | Adds test:registration and test:registration:browser scripts. |
| `STUDENT_FLOW_IMPLEMENTATION.md` | Points to this follow-up as the current registration behavior. |
| `REGISTRATION_PARENT_UPDATE.md` | This report. |

Build output in `dist/` was regenerated. Browser evidence includes `test-results/registration-options.png`, `parent-registration.png`, `parent-dashboard.png` and `parent-mobile.png`.

## Verification completed

- 34 domain/regression tests passed: registration, teacher, examiner, supervisor and scanner suites.
- Parent/student browser suite passed: full-date under-16 rejection and exact-sixteen acceptance, password mismatch, approval message, correct/wrong code, resend, pending-dashboard blocking, permanent IDs, normalized duplicate rejection, same names with different DOB, same DOB with different names, shared parent email, adding candidates, ownership checks, switching child dashboards and application isolation, returning student/parent login and mobile navigation.
- Existing student exam browser suite passed: multi-subject selection, progression, deadlines, teacher routing, English/Tamil practice, application PDF/print and approved exam access.
- Production build passed. Existing large-bundle warning remains non-blocking.
- Parent dashboard and registration layouts were visually checked using browser screenshots. Existing fonts, palette, rounded controls and student portal styles are retained.

The implementation remains a browser-local development frontend. Parent accounts are stored separately in musicDemoParents; students in musicDemoAccounts; each student uses musicStudentPortal:<Student ID>. Production identity verification, email delivery and database persistence should replace this adapter. The existing real-auth server has not been redesigned to implement these new parent–student endpoints.
