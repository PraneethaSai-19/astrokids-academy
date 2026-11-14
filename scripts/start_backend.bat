@echo off
setlocal EnableExtensions
title AstroKids Backend (FastAPI)
set "ROOT=%~dp0.."
cd /d "%ROOT%\backend"
if not exist ".venv\Scripts\python.exe" (
  echo [ERROR] The backend is not set up yet. Run scripts\setup_windows.bat first.
  pause
  exit /b 1
)
if not exist ".env" (
  echo [ERROR] backend\.env is missing. Run scripts\setup_windows.bat first.
  pause
  exit /b 1
)
echo Starting the AstroKids API on http://localhost:8000  (API docs: http://localhost:8000/docs)
echo Press Ctrl+C to stop.
echo.
".venv\Scripts\python.exe" -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
if errorlevel 1 (
  echo.
  echo [ERROR] The backend stopped with an error. Common causes: port 8000 already in use,
  echo         or a wrong DATABASE_URL in backend\.env. See README.md - Troubleshooting.
  pause
  exit /b 1
)
