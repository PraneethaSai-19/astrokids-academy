@echo off
setlocal EnableExtensions
title AstroKids Academy launcher
set "ROOT=%~dp0.."
if not exist "%ROOT%\backend\.venv\Scripts\python.exe" (
  echo [ERROR] Not set up yet. Run scripts\setup_windows.bat first.
  pause
  exit /b 1
)
if not exist "%ROOT%\frontend\node_modules" (
  echo [ERROR] Frontend packages missing. Run scripts\setup_windows.bat first.
  pause
  exit /b 1
)
echo Opening the backend and frontend in two separate windows...
start "AstroKids Backend" cmd /k ""%~dp0start_backend.bat""
start "AstroKids Frontend" cmd /k ""%~dp0start_frontend.bat""
echo.
echo Waiting a few seconds, then opening your browser at http://localhost:5173 ...
timeout /t 8 /nobreak >nul
start "" "http://localhost:5173"
echo.
echo Both servers are running in their own windows. Close those windows (or press Ctrl+C in them) to stop.
echo API docs: http://localhost:8000/docs
pause
