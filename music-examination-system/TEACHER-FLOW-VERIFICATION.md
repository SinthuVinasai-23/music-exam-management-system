# Teacher flow verification - 12 October 2026

The supplied visual designs have been retained. The teacher sidebar contains Dashboard, Application Line, My Student List and Exam Slots. All dashboard cards, Review Now and View Full Calendar navigate to their respective pages. Student three-dot actions open slot assignment directly.

Verified: typed and drawn signatures, clearing and required-signature validation; approval receipt download and FIFO advancement; written rejection reason and rejection confirmation; query validation, urgency, success confirmation and paused queue; roster search/filter/pagination/PDF; assignment and shared state; session creation/capacity/conflict validation; profile validation and Profile -> Security -> Saved confirmation; profile photo validation; notifications/read/load-more; activity toggle/outside-click/Escape; direct URLs/refresh persistence; mobile navigation; staff teacher selection/logout. Shared settings, bell and activity actions were tested on all four main pages. All 64 rule/service tests and the comprehensive teacher browser suite passed.

The uploaded SRS requires a written rejection reason (FR-011), so Reject opens the reason dialog before the Application Rejected confirmation. Return to Queue closes the confirmation on the existing application-line page. FIFO cannot skip another candidate; a query pauses the head until corrected (FR-009/010).

## Implementation boundaries

The four-page designed teacher portal remains the existing browser-local prototype, using music-teacher-portal-v1 in localStorage. Its email events/refunds are simulated; its security preferences and signature receipts are demonstration records. Session scheduling and candidate assignment are saved in that browser. Real backend authentication, applicant records and separately assigned examination-item review remain available at /teacher/exam-applications using the development teacher credentials documented in README.md. This route remains available directly even though the designed sidebar has four entries.

This package does not claim complete production SRS compliance. Payment gateway/refund integration, automated cohort slot allocation, official signed admission generation from this prototype, production 2FA, real workflow email retry integration and infrastructure/performance targets remain outside the existing four-page prototype. Requirements and prior development exceptions are documented in README.md. The PDF is included in references/Music Exam System SRS.pdf. Supplied screenshots/assets were used as design references; no editable Figma file or Figma URL was provided in this task.

## Run

Install Node.js 22.13 or newer. Inside music-examination-system run npm install, then npm run dev. Open http://127.0.0.1:5173. Teacher preview: /teacher/dashboard. Tests: npm run test:teacher; TEST_URL points the browser suite to your running app (default http://127.0.0.1:5173). The ZIP includes dist for production and a consistent SQLite backup. node_modules and machine-specific secrets are excluded; development session keys are regenerated on startup. Browser-local teacher state is not part of the ZIP.
