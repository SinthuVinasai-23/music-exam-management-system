@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Install Node.js 22.13 or newer, then try again.
  pause
  exit /b 1
)
if not exist "node_modules\pdfkit" (
  call npm install
  if errorlevel 1 exit /b 1
)
echo Preview verification code: 123456. No SMTP setup is required.
call npm run dev
pause
