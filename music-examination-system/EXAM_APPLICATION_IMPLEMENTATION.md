# Exam Application implementation and verification

Updated inside the existing React project on 6 October 2026. No separate application was created.

## Current workflow

- Existing candidate details, photo/signature capture and permanent student account flow remain in place.
- Compact Add Subject dialog replaces the repetitive subject/teacher/grade table. Eligible grades are enabled; every unavailable grade has an explanation. Selected subject cards and individual grade chips can be removed.
- Tamil/English medium, teacher name and school appear in selection, review, application records and PDFs.
- Admin-controlled opening and deadline are read from SQLite. The client refreshes configuration and application status every ten seconds and on window focus. The API enforces the opening/deadline independently of the browser; exact deadline is inclusive.
- Submission validates authoritative student ownership and verification, minimum examination age of six in the examination year, subject, medium, teacher directory, syllabus, results, progression and duplicates.
- Multiple eligible early examinations through Grade 3 are allowed. Grade 4 requires Grade 3 passed. Later examinations require the previous examination passed, with one next examination per subject. Different subjects retain independent progress.
- Initial status is pending teacher approval. Teachers see and review only assigned examination items. Rejected and changes-required decisions need a note. Overall approval requires every item approved. Reassignment by Admin resets the assigned item's review.
- No online payment step, checkout or fee appears in the current student selection/submission workflow. The retained payment route redirects to application records.
- Real A4 PDFs are generated at submission and stored. View/download/current-status PDF and print controls are provided. The server blocks examination-access PDFs until all approvals are complete.

## Persistent model and permissions

The existing Node server and SQLite database are extended by `auth-server/portal.mjs`, retaining the original SMTP endpoints.

| Table | Purpose |
| --- | --- |
| `exam_applications` | Student ID/names, medium, session, overall status, creation/update times |
| `exam_items` | Individual subject/grade, assigned teacher/school, item status, review note/date |
| `exam_progress` | Per-student, subject and grade syllabus clearance, pass and result status |
| `exam_documents` | Submission PDF binary and generation timestamp |
| `exam_audit` | Submission, review, routing, progress and deadline changes with actor/time |
| `exam_staff` | Staff identity and scrypt password hash; server-authorized role |
| `portal_sessions` | Server-side session state, HttpOnly cookie token, CSRF token, expiry |
| `portal_values` | Persistent development applicant/parent records and deadline configuration |

Application items are normalized records, not one unstructured multi-subject text field. Parent/child ownership is checked server-side. Teacher requests filter actual assigned items and reject attempts to review another teacher's item. Teachers cannot download an unfiltered combined application PDF. Admin configuration and reassignment require an Admin account. Passwords are scrypt-hashed; mutations use same-origin checks and CSRF protection. Login and registration attempts are rate-limited.

The existing development applicant verification adapter is retained and moved from browser storage to the database. It is not real email verification. Production use of this development adapter is blocked; complete production applicant verification/recovery integration remains outside this delivery. See README for precise setup and credentials.

## Executed verification

- Production frontend build passed with Vite. Existing bundle-size advisory remains; there were no compilation failures.
- **53 automated API/domain tests passed**, including 15 exam suite tests and the existing authentication/SMTP, registration, teacher, supervisor and QR tests.
- Exam API tests covered single/multiple grades, multiple subjects, both media, syllabus denial, withheld results, duplicate protection, invalid teacher/subject/medium, age denial, Grade 4 prerequisite, next Grade 5 eligibility, teacher isolation, status updates, Admin filters/rerouting, inclusive deadline boundaries and database restart persistence.
- Exam browser workflow passed: actual student registration/verification, photo/signature capture, Add Subject dialog, grade and subject removal, teacher name/school, Tamil selection, review/submission/success, real PDF download, print command wiring, independent teacher approvals, Admin configuration and deadline closure. The obsolete payment route redirects correctly. No browser page or console errors were observed in this workflow.
- Parent browser regression passed: under-16 handoff, password confirmation, registration, invalid verification/resend, duplicate child denial, sibling IDs, add candidate, child dashboard switching/isolation, returning login and mobile layout.
- Existing Teacher browser suite passed its 16 checks, including approvals, FIFO queue, roster, scheduling, settings, navigation and mobile.
- Existing Supervisor browser suite passed its 16 checks, including identity verification, admission, attendance, settings, direct routes and mobile.
- Registration design checks passed **21 viewport/state combinations**.
- Exam selection/dialog tested at widths **1440, 1024, 768 and 390**; Admin at 1440, 768 and 390. No horizontal page overflow in these checks. The subject dialog supports keyboard focus trapping, Escape and focus restoration.
- PDF content checked with pypdf and pages rendered with Poppler for visual review. Verified names, ID, subjects, grades, teacher/school and absence of payment content. A stress PDF with Tamil names and 56 examination items rendered correctly across **six A4 pages**, retaining all items, headers and page numbers.
- Printing verified through the actual PDF request and browser print-command callback. A physical printer/paper output was not tested.

## Complete archive

The ZIP includes the complete source, existing portals, public assets, backend, install manifests/lockfile, build, tests and instructions. Dependencies are installed using `npm install`. Runtime SQLite data, keys, private `.env`, `node_modules`, browser screenshots, QA PDFs and temporary files are excluded. Browser-only records from older versions are not automatically imported as trusted server accounts.
