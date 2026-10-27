# Ensemble Music Examination System

## Install and run

Use Node.js **22.13 or newer** (tested with Node 24 and Microsoft Edge). Extract the complete folder, then open a terminal in `music-examination-system`, beside `package.json`:

```sh
npm install
npm run dev
```

Open **http://127.0.0.1:5173/**. One command starts React/Vite and the existing Node/SQLite backend. Keep the terminal running. Ports 5173 and 5001 must be free. To change ports, set `VITE_PORT` and `AUTH_PORT`; the dev command derives `APP_URL` unless explicitly configured. Use the exact configured host and port.

## Applicant accounts and exam applications

Register as Student (16 or older on the actual birthday) or Parent. The retained development verification code is **123456**; registration approval is automatic in this development account adapter. **Exam application approval is never automatic.** Parent accounts can add children, switch between their dashboards and submit on behalf of the selected child. Student IDs remain permanent in registration-year/serial format.

Accounts, hashed passwords, parent associations, sessions, deadlines, syllabus/progression records, exam applications, separate examination items, initial PDF documents and review audit entries now persist in `auth-server/data/accounts.sqlite`. Browser storage retains only display/draft caches and unrelated legacy portal prototypes. Clear browser storage to reset a draft; this does not erase server records. Preserve the database when restarting or updating the application. Earlier browser-only account records are not automatically trusted or imported into this database.

1. For now, subject and early-grade selection is available by default without prior teacher/Admin syllabus clearance. Set `REQUIRE_SYLLABUS_CLEARANCE=true` to restore strict clearance. Age, progression, result and duplicate checks still apply.
2. Student selects a required Tamil/English medium and uses **Add Subject** to choose eligible grades and a teacher. Every teacher includes the school name.
3. Review and submit. Each subject/grade becomes its own database item, assigned to its selected teacher, initially **Pending Teacher Approval**.
4. Teachers independently approve, reject or return assigned items with a reason. Student status refreshes every ten seconds and when the window regains focus.
5. Examination access remains blocked until all items are approved; the server also protects the examination-access PDF endpoint.

Multiple eligible early examinations are allowed through Grade 3. Grade 4 requires a recorded Grade 3 pass, then only one next examination at a time per subject. Pending/withheld results, age, duplicates and teacher assignment are validated by the server. Syllabus clearance is optional in the temporary default development mode and mandatory in strict mode. No school fee or online payment appears in selection or submission. The retained `/student/payment` URL redirects to applications.

## Admin and teacher access

These default credentials are for local development only. They authorize the new database exam workflow; selecting a role in the older staff prototype does not grant these permissions.

| Portal | URL | Email | Password |
| --- | --- | --- | --- |
| Admin | `/dashboard/admin` | `admin@ensemble.local` | `EnsembleAdmin2026` |
| Teacher 1 – Dr. Karthik Iyer | `/teacher/exam-applications` | `teacher-1@ensemble.local` | `EnsembleTeacher2026` |
| Teacher 2 – Meera Ramanathan | `/teacher/exam-applications` | `teacher-2@ensemble.local` | `EnsembleTeacher2026` |

Teachers 3–7 use `teacher-3@ensemble.local` through `teacher-7@ensemble.local` and the same development teacher password. Their names and schools are the existing teacher directory. Teachers see only their assigned items; they cannot switch identity with a dropdown or read another teacher's whole application PDF.

Admin can update opening/deadline dates, view and filter applications by student, ID, subject, grade, teacher, school, medium and status, record eligibility/results and reassign items. Reassignment resets the item's approval. The deadline is inclusive at the configured instant: submission is allowed at the exact deadline, and rejected after it. Closing Soon means seven days or fewer remain. Dates are entered/displayed in the browser's local timezone and stored as UTC instants.

## PDFs

Submission generates and stores an actual A4 PDF. View, download and print controls use an authorized PDF endpoint; current copies include the latest review status. PDFKit embeds openly licensed Noto fonts, including Tamil name support. PDFs include first/last names, Student ID and each subject/grade, teacher and school; they contain no payment information. Printing uses the browser's PDF print function. A physical printer is not required to run the app.

## Tests and build

```sh
npm run build
npm run test:exam
npm run test:auth
npm run test:registration
npm run test:teacher
npm run test:supervisor
```

With `npm run dev` active and Microsoft Edge installed:

```powershell
$env:BASE_URL='http://127.0.0.1:5173'
$env:TEST_URL='http://127.0.0.1:5173'
npm run test:exam:browser
npm run test:registration:browser
npm run test:registration:design
npm run test:teacher:browser
npm run test:supervisor:browser
```

`test:student` runs the current exam workflow browser suite. Tests create clearly named test applicants; API tests use an isolated temporary database. Browser screenshots and test-only accounts are excluded from the downloadable project. See `EXAM_APPLICATION_IMPLEMENTATION.md` for verification and implementation details.

## Retained integrations and deployment limits

Existing React routes and the teacher, supervisor, examiner and public portals remain available. Unrelated legacy staff modules retain their existing browser-based prototype services. The original SMTP `/api/auth/*` endpoints, email sender, CSRF/session checks and SMTP tests remain intact. `.env.example` documents SMTP settings. These older SMTP endpoints do not yet implement the full parent/candidate model required by the new database portal; setting `VITE_AUTH_PREVIEW=false` selects that older adapter, not the complete new exam workflow.

The supplied complete workflow is a local development application, with the existing development applicant-verification behavior preserved. The portal account adapter deliberately refuses development registration/login/verification in `NODE_ENV=production`. Production deployment requires integrating real applicant verification and recovery into the new account model and provisioning staff credentials; no production-readiness claim is made. Production does not seed the development teacher passwords. `PORTAL_ADMIN_EMAIL` and `PORTAL_ADMIN_PASSWORD` can provision the initial administrator; the existing production server also requires HTTPS `APP_URL` and a 32+ character `AUTH_SECRET`.

The ZIP includes all source, assets, server code, manifests/lockfile, tests and the built frontend. Run `npm install` after extraction. Installed dependencies, runtime databases, private keys, `.env`, browser test output and temporary files are excluded. Historical completion reports remain as reference documents; this README describes the current behavior.

## Learning dashboard and content management

The official order is **Level 1 → Level 2 → Grade 1 → Level 3 → Grade 2 → Level 4 → Grade 3 → Grade 4 → Grade 5 → Grade 6**. The shared rule drives grade navigation, question-bank ordering and server validation. All active database subjects appear on the student dashboard, including subjects the student has not applied for. Each opens its own introduction, progression and practice page. Earlier stages remain available through the current permitted stage; future question requests are rejected by the backend.

Accounts and Student IDs do not expire with a year or session. Practice answers, learning preferences, stages, published results, subject content and About Us content persist in the same SQLite database. Session expiry only requires another login. Preserve `auth-server/data/accounts.sqlite` when updating the project; never replace an existing database with an empty database.

Use **Forgot Password?** on the applicant login page: enter the registered email or permanent Student ID, verify the development code **123456**, set and confirm a new password, then log in. Parent-managed children recover through the parent's email/account. Recovery challenges expire after 15 minutes, are bound to the requesting session, allow at most five code guesses and are consumed after reset. Reset preserves account ID, applications, results and practice history and revokes existing account sessions. The obsolete direct-reset endpoint is disabled. Fixed-code recovery is development-only; production requires real delivery integration.

In **Examination Administration**, use **Learning & Content Management** to:

- Edit/add subjects, introductions, image paths/HTTPS URLs and active status.
- Edit English and Tamil question text, instructions, options and explanations separately. A missing language is flagged and never silently replaced by the other language.
- Set the student's current learning stage and record draft/published results. Published results update the existing examination progression records.
- Edit the About Us title, main text, image and sections; preview before saving. Saved content appears on the public About Us page.

The initial question bank contains **160 starter questions**: two subject-specific bilingual fundamentals for each subject/stage. These are demonstration practice content, not a complete graded syllabus. Admins should replace/extend them with their approved curriculum. The active subject database is the source for learning cards and examination catalogs; local SVG images can be replaced in the editor.

A saved account language preference controls practice automatically. When no manual preference exists, the subject's latest examination application's medium is used. Change the saved preference at `/student/account`.

Development registration is automatically approved. To enable future manual registration approval, set `REGISTRATION_APPROVAL_REQUIRED=true`; new student records retain a pending status and backend access is gated until the authorized Admin approval endpoint (`PATCH /api/portal/students/{encodedStudentId}/approval`) sets `status: "approved"`. Existing examination-item teacher approval remains required independently. `REQUIRE_SYLLABUS_CLEARANCE=false` continues to permit early examination subject selection without prior teacher requests.

### Additional verification

```sh
npm run test:learning
npm run test:learning:browser
```

Browser tests use installed Microsoft Edge and the running development URL, configurable through `BASE_URL`. They exercise dashboard/subject access, saved Tamil preference, bilingual question editing, About Us preview/save, verified recovery and widths 1920, 1440, 1366, 1024, 768, 390 and 375. Test screenshots/reports are local diagnostics and excluded from the distribution ZIP.
