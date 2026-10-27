@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Please install Node.js 22.13 or newer, then run this file again.
  pause
  exit /b 1
)
node -e "const [a,b]=process.versions.node.split('.').map(Number);if(a<22||(a===22&&b<13)){console.error('Node.js 22.13 or newer is required.');process.exit(1)}"
if errorlevel 1 (
  pause
  exit /b 1
)
if not exist "node_modules\vite\bin\vite.js" (
  call npm install
  if errorlevel 1 (
    pause
    exit /b 1
  )
)
if not exist "dist\index.html" (
  call npm run build
  if errorlevel 1 (
    pause
    exit /b 1
  )
)
set APP_URL=http://127.0.0.1:5174
set NODE_ENV=development
echo Open http://127.0.0.1:5174/ in your browser.
echo Keep this window open while using the website.
call npm run preview:logo
pause
