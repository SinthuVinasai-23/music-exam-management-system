# Learning update verification

Implemented in the existing React and Node/SQLite project. The default development account registration remains automatically approved, and early subject selection requires no prior teacher request. Teacher review of submitted examination items remains enforced.

Validated on 6 October 2026 with Node 24.21 and Microsoft Edge:

- Production build passed. Vite retains the existing bundle-size advisory.
- 64 automated API/unit checks passed: authentication/SMTP, registration, teacher, supervisor, scanner, examination workflow and learning/recovery.
- Learning browser flow passed: all eight subject cards, Grade 3 cumulative access, future-grade disabled navigation/API denial, persisted practice, saved Tamil preference, actual Tamil questions/options/instructions, Admin About preview/save/public update, bilingual question creation, recovery/login with the same ID and history.
- 21 learning responsive checks passed across dashboard, subject and About pages at widths 1920, 1440, 1366, 1024, 768, 390 and 375; no runtime or console errors in the completed flow.
- Examination browser workflow passed: registration, upload/signature, multiple subjects/grades, Tamil, teacher schools, submission/review, PDF download/print, teacher isolation, Admin filters/routing and deadlines.
- Parent registration browser workflow passed; registration design passed all 21 viewport/state checks.
- Teacher browser checks passed, including review signatures/FIFO, rejection/query, roster, sessions, profile/security, notifications, persistence and mobile navigation.
- Supervisor main and additional browser checks passed, including verification/admission, roster isolation, document validation, attendance closure, profile/security, camera fallback, notifications and responsive layouts.

Persistence checks used a temporary SQLite database, restarted the server and advanced the test clock to 2029. They verified unchanged original IDs, applications, results, practice attempts and medium. Recovery checks covered wrong/unverified/expired challenges, session binding, five-attempt limit, single use, changed password and parent-child ownership. Future manual registration approval was enabled and validated independently.

An initial Admin editor race overwrote unsaved About fields when duplicate development loads completed. The editor now preserves loaded/draft content; the complete saved/public browser check passed after this fix. Final browser validation used the built site to avoid HMR reloads.

Distribution excludes dependencies, local databases/account data, diagnostic screenshots, private environment files and output archives. Install using npm install; run using npm run dev. Preserve an existing accounts.sqlite when updating an existing installation.

The included 160 bilingual starter questions demonstrate the workflow; they do not constitute a complete graded curriculum. Real production verification/recovery delivery still needs integration into the full account model. See README.md and .env.example.
