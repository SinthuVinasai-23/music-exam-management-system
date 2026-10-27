ICFA COMPLETE WEBSITE - 27 October 2026

WINDOWS QUICK START
1. Right-click the ZIP and choose Extract All. Do not run inside the ZIP.
2. Install Node.js 22.13 or newer if it is not installed.
3. Open the extracted music-examination-system folder.
4. Double-click START-PREVIEW.cmd.
5. Open http://127.0.0.1:5174/ in your browser.

VS CODE
Choose File > Open Folder and select music-examination-system
(the folder containing package.json).
Open Terminal > New Terminal and run:
  npm run preview:logo
Then open http://127.0.0.1:5174/
To edit with automatic updates, run npm run dev and use port 5173.
To rebuild the packaged preview after edits, run npm run build.

This Windows package includes source, public assets, built dist files,
package-lock.json and the installed node_modules dependencies.
No Python backend, VS Code Live Server extension or SMTP setup is needed
for this preview. Opening index.html directly will not run the application.
If dependencies are damaged, run npm ci to restore them.
If a port is already in use, close the previous preview terminal first.

Admin: /staff-login, select Admin and enter any email and password
in the local preview. Verification code for registration: 123456.
The preview automatically approves applications. Emails are queued locally.
Personal account databases and secrets are excluded; a fresh local database
is created automatically. Temporary public QR tunnels are not included.
QR links on other phones require a public deployment or a new tunnel.
