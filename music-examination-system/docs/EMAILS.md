# Email templates and delivery

All workflow communication is email. Dashboard notifications mirror the durable email outbox; no SMS, chat or push channel is used. No live emails were sent during development tests.

Sender name: **Music Examination Board**. Address: configured `SMTP_FROM`. Every subject starts `Music Examinations — `. Plain-text branding is `MUSIC EXAMINATION BOARD`; each message ends with portal sign-in and examination-office assistance instructions. User content remains plain text, never HTML. SMTP requires verified TLS via STARTTLS.

| Event | Required content / action |
|---|---|
| Verify your email | Account name, unique single-use 24-hour link, approval requirement; link redacted from outbox body after delivery |
| Account approved/rejected | Decision and email-verification requirement |
| Application submitted | Exam year, saved status, payment next step |
| Teacher confirmation request | Candidate name, Student ID, year, level, unique exam index, payment gate, Teacher Dashboard action |
| Payment allocated | CAD amount, receiving teacher, method, pending-receipt distinction |
| Payment confirmed | CAD amount and verified receipt reference |
| Teacher queried/rejected/confirmed | Subject index, decision and written reason/query |
| Query response | Applicant response, linked application |
| Exam slot allocated | Session name, ISO time with offset, venue, attached detailed admission PDF |
| Result published | Authenticated results page and PDF download action |
| Ceremony invitation | Ceremony block, time, venue and family-group confirmation |
| Refund completed | CAD refund amount and verified repayment receipt |
| Contact inquiry | Sender name/email and inquiry text, addressed to approved administrators |

`server/worker.py` claims each outbox row for ten minutes and recovers expired claims after a crash. An initial failure is retried after 60, 300 and 1,800 seconds. Four failed attempts total produce `undeliverable`; Admin can review and retry. Interval constants are deployment configuration in `RETRY_DELAYS`. Delivery is at-least-once: SMTP does not offer exactly-once semantics; stable Message-ID assists mail-system deduplication. SMTP credentials and exception bodies are never written to delivery logs.

The SRS does not supply institutional logos, legally approved official-signature text, exact admission-code formatting, or exact PDF field templates. The implementation uses the supplied portal branding, cryptographically random URL-safe admission codes, and explicit configurable result signature blocks. Obtain institutional approval before production distribution.
