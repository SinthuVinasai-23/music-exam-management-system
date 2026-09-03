# MEMS Admin → Invigilator Assignment UI

React + Vite frontend demo recreated from the supplied Figma screenshots and aligned to the uploaded Music Examination Management System SRS.

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:5173/`.

## Demo flow

1. Admin Dashboard
2. Click **Users** in the sidebar (or **Manage Users** in Quick Actions)
3. User Directory opens on **Teachers**
4. Open **Invigilators** tab
5. Click the three-dot action button for **Dr. Karthik Natarajan**
6. Choose **Assign to Sessions**
7. Select one or more exam sessions in **Assign Venue & Supervision Scope**
8. Click **Assign Venue Scope**
9. The assignment is persisted to `localStorage`, the assigned-session count updates, and a success toast appears

## SRS-aligned behavior included

- Administrator can assign an invigilator to **one or more exam instances** (FR-025 / US-8.3).
- Existing assignments are preselected when the modal is reopened.
- Session choices include the venue/session plus exam/date/candidate metadata so the selected scope represents an exam instance, not merely a venue.
- UI explains that candidate access is restricted to the selected session scope (FR-017 / FR-025). Actual authorization must be enforced by the backend.
- Inactive invigilators cannot be assigned sessions in the demo.
- User search, role tabs, action menu, success feedback, and local persistence are included.
- The interface is responsive for desktop/mobile web usage.

## Important backend note

This is a frontend demo. In production, the Node.js backend must verify the logged-in invigilator's assigned exam-session IDs for every candidate search/verification request. A hidden/disabled frontend control is not a security boundary.

## No icon package dependency

The project uses local inline SVG icons, avoiding runtime failures caused by icon-package export/version mismatches.


## Pagination update

The User Directory now has working page navigation.

- Page **1** shows rows 1–4.
- Page **2** shows rows 5–8.
- Page **3** shows rows 9–12.
- Previous and next arrows also work.
- Changing tabs or searching resets pagination to page 1.
- The current page gets the same gold active state as the Figma design.
