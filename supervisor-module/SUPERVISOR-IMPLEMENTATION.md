# Supervisor module

The working project is in this folder. It was created by copying the React/Vite application from `../music-examination-systemV1/music-examination-system`, because the requested workspace was empty and the follow-up instruction authorized creating the project here. The source application has no backend, production authentication, or existing Supervisor implementation.

## Run

Requires Node.js 20.19+ or 22.12+ and npm.

```sh
npm ci
npm run dev -- --open /supervisor
```

Open `/`, then choose **Staff Login** to enter the protected staff flow.

The completed entry flow now starts on the main landing page. Choose **Staff Login**, enter any correctly formatted staff email address and a password of at least eight characters, submit the form, and select **Supervisor** from the role dialog. The password is validated in memory and is never stored. Logging out clears the staff session and returns directly to the main landing page.

Teacher, Examiner, Admin, and Super Admin remain visible in the role dialog to match the supplied design, but show an explicit “dashboard is not included” message because those modules are absent from this project.

```sh
npm test
npm run build
npm run preview
```

For production static hosting, configure all application routes to serve `index.html`. Vite's development and preview servers already support direct routes.

## Implemented

- Assigned-session dashboard with calculated counts, attendance progress, schedule navigation, notifications, and activity history.
- Dashboard session cards open the corresponding attendance roster. Venue **View Roster** links enter that session's verification flow, as requested; the verification screen includes a link back to the attendance roster.
- Persistent selected session, candidate deep links, registration/admission-code search, case normalization, QR camera scanning with jsQR, explicit camera failure messages, and cleanup when scanning stops or the user navigates away.
- Session-scoped profile access and verification; used, expired, unknown, and ineligible admission-code rejection. The same validation functions serve manual and scan/search workflows.
- Manual-verification dialog with candidate/session data, required ID/admission document checks, document record previews, confirmation, cancellation, and the supplied success-toast treatment.
- Attendance search and status filters; candidate action menus; present/verified and absent attendance; submission validation; session closure; duplicate submission protection; verification audit records.
- Persistent profile editing with name/email/phone validation, specialization selection, JPG/PNG upload with a 2MB limit, cancel, save confirmation, and a security tab explaining the missing authentication integration.
- Logout confirmation; focus containment and Escape dismissal for dialogs; nested document-dialog dismissal; empty/error/loading/recovery states; unknown-route handling.
- Responsive Staff Portal credential form, password visibility control, validation feedback, role-selection dialog, Supervisor session guard, and home-page logout routing.
- Scoped styles with the supplied cream, gold, charcoal, serif headings, fixed desktop sidebar, card layouts, dialogs, and responsive mobile navigation.

## Demo data

| Session | Candidate | Registration code | Admission code | Initial status |
|---|---|---|---|---|
| Mozart Hall | Ananya Nair | 772-ART-24 | MUS-7K9P-2X4Q | Pending |
| Mozart Hall | Sanjay Krishnan | 819-MUS-24 | MUS-3H8R-6N2V | Pending |
| Mozart Hall | Shruti Iyer | 902-ART-24 | MUS-5J1W-9T7B | Verified / used |
| Mozart Hall | Siddharth Rajan | 441-MUS-24 | MUS-8D4L-3F6C | Pending |
| Mozart Hall | Ashwin Pillai | 552-ART-24 | MUS-2R7N-5P9K | Verified / used |
| Thillana Studio | Meera Kumar | 630-DAN-24 | MUS-6A2E-8Y3U | Pending |

Search for Meera's code while Mozart Hall is selected to exercise unauthorized-session rejection. Search for Shruti's code to exercise the used-code dialog. Kriti Gallery and Tanjavur Annex demonstrate empty rosters.

To complete Mozart attendance, verify pending candidates or choose **Mark absent** from their action menus, then submit. The session remains closed across refresh and logout. Tests intentionally change only local demonstration records. For a fresh demonstration, remove only the `mems-supervisor-v1` entry from this origin's browser local storage. Existing public-page storage is independent.

## Requirements and design decisions

Reviewed all 22 SRS pages and all ten supplied Supervisor screenshots. The SRS calls this role **Invigilator**; the requested interface calls it **Supervisor**. FR-016, FR-017, FR-025 and US-7.2/8.1/8.2/8.3 drive verification and access restrictions.

The screenshots contain inconsistent sample candidate IDs, instruments, venue names, counts, and dates. Connected pages use a single consistent record instead of changing a candidate's identity between screens. Totals and progress reflect the actual demo records, and the dashboard uses today's date. The success notification names the candidate actually verified. Attendance confirmation reports local saving instead of falsely claiming synchronization with an examination-board backend.

The ID/admission check controls retain the document-pill appearance. Candidate action menus provide explicit absence marking so a no-show does not need to be falsely admitted to complete attendance. No pagination was added because the supplied roster has no pagination and the demo roster has five entries.

The supplied venue and profile screenshots are reused as CSS image sprites for the venue photographs and sample account portrait. The existing project provides the logo, fonts, and background artwork. Layouts were visually inspected, but pixel-identical reproduction is not claimed: source references contain conflicting content and the existing background/logo assets differ slightly from the screenshots.

## Verification performed

Automated: **10 tests passed, 0 failed** using Node's built-in test runner.

- Verified-role and assigned-session guards.
- Registration/admission lookup, normalization, blank/unknown input.
- Cross-session rejection without mutation.
- Required document validation, admission, audit data, and single-use enforcement.
- Expired, ineligible, and used code rejection.
- Incomplete/empty attendance rejection, valid submission, closed-session mutation rejection, duplicate prevention, and serialization round-trip.
- Absence/pending transitions and immutable verified attendance.
- Missing/corrupt stored-data handling.
- Real QR matrix decoding with jsQR and blank-frame rejection.

Browser checks performed in the Codex browser:

| Check | Result |
|---|---|
| Dashboard session card -> selected roster | Passed |
| Venue View Roster -> selected verification session | Passed |
| Verification sidebar and retained session selection | Passed |
| Manual route, correct candidate, direct URL and refresh | Passed |
| Missing ID check -> validation; checked documents -> success toast | Passed |
| Code lookup -> candidate -> Verify & Admit -> roster update | Passed |
| Cross-session denial and used-code dialog | Passed |
| Unknown code rejection | Passed |
| Search no-match state, pending filter and absence action | Passed |
| Incomplete attendance rejected | Passed |
| Completed attendance -> confirmation -> closed dashboard card | Passed |
| Duplicate submission control disabled before and after refresh | Passed |
| Manual cancel/close and nested document Escape dismissal | Passed |
| Profile validation, cancel, save, reload, and security tab | Passed |
| Empty-session submission, unauthorized URL, unknown route | Passed |
| Notifications, record refresh, logout cancel/confirm | Passed |
| Mobile account and verification at 390 x 844, no page overflow | Passed |
| Desktop dashboard, venues and verification visual inspection | Passed with differences documented above |
| Existing /, /faq, /contact, /register, /login, /staff-login page rendering | Passed smoke checks; no captured console errors/warnings |

The production build passed. QR decoding is tested independently; an actual camera scanning a physical admission card was not tested. The initial native-scanner fallback message was checked before jsQR was added. The final camera path needs hardware/browser acceptance testing. Photo-upload file limits are implemented but file-picker upload was not exercised in browser testing. Loading is a transient initialization state; corrupt storage is covered by automated tests rather than browser storage tampering. Existing non-Supervisor routes were smoke-tested, not exhaustively re-tested.

## Remaining integrations and limitations

This is a working frontend demonstration, not a production security boundary. The base application has no API or identity provider to integrate. Local role checks and browser storage can be modified by the browser user. Production must replace the demo sign-in and persistence with verified server sessions, assigned-session authorization on every read/write, atomic code consumption and attendance submission, audit storage, and protected document endpoints. Browser storage does not provide distributed transactions or multi-device synchronization.

Original candidate ID/admission/certificate files were not provided; previews explicitly show sample document records. Password changes, real email verification, board synchronization, and production encryption cannot be truthfully implemented against nonexistent backend services. Performance under 500 concurrent users, production availability, and the latest two versions of all four SRS browsers require deployment and additional test environments.

No student, parent, teacher, examiner, or administrator modules existed in the copied base. Their absence is not represented as completed work. Existing public and registration pages were retained.

## Files

Modified relative to the copied base:

- `src/App.jsx`: Supervisor route.
- `src/pages/Login.jsx`: Staff Login link to the module.
- `package.json` and `package-lock.json`: test script, jsQR, and development formatter.

Created for this module:

- `src/supervisor/Supervisor.jsx`
- `src/supervisor/store.js`
- `src/supervisor/scanner.js`
- `src/supervisor/supervisor.css`
- `public/supervisor/logo.png`
- `public/supervisor/venues-reference.png`
- `public/supervisor/account-reference.png`
- `tests/supervisor.test.js`
- `tests/scanner.test.js`
- `tests/qr-fixture.json`
- `SUPERVISOR-IMPLEMENTATION.md`
- `PROJECT-FILES.txt`

The full copied/generated file inventory is in `PROJECT-FILES.txt`. The ZIP includes source, assets, tests, lockfile, documentation, and the production `dist` output. Installed `node_modules` is excluded; reproduce dependencies with `npm ci`.
