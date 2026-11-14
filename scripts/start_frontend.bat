@echo off
setlocal EnableExtensions
title AstroKids Frontend (React)
set "ROOT=%~dp0.."
cd /d "%ROOT%\frontend"
where npm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] npm was not found. Install Node.js LTS from https://nodejs.org/
  pause
  exit /b 1
)
if not exist "node_modules" (
  echo [ERROR] Frontend packages are not installed yet. Run scripts\setup_windows.bat first.
  pause
  exit /b 1
)
echo Starting the AstroKids app on http://localhost:5173
echo Press Ctrl+C to stop.
echo.
call npm run dev -- --port 5173
if errorlevel 1 (
  echo.
  echo [ERROR] The frontend stopped with an error. Is port 5173 already in use? See README.md - Troubleshooting.
  pause
  exit /b 1
)
