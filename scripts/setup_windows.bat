@echo off
setlocal EnableExtensions
title AstroKids Academy - Setup
set "ROOT=%~dp0.."
cd /d "%ROOT%"
echo.
echo ===== AstroKids Academy: one-time setup =====
echo.

call "%~dp0_find_python.bat"
if not defined PYCMD (
  echo [ERROR] Python 3.10 or newer was not found.
  echo         Install Python 3.12 from https://www.python.org/downloads/windows/
  echo         and tick "Add python.exe to PATH" in the installer. Then run this script again.
  goto :fail
)
echo [OK] Python: %PYCMD%
%PYCMD% --version

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js was not found. Install the LTS version from https://nodejs.org/ and run this script again.
  goto :fail
)
where npm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] npm was not found. Re-install Node.js LTS from https://nodejs.org/
  goto :fail
)
for /f "delims=" %%v in ('node --version') do echo [OK] Node.js %%v

echo.
echo --- Backend: virtual environment ---
if not exist "backend\.venv\Scripts\python.exe" (
  %PYCMD% -m venv backend\.venv
  if errorlevel 1 ( echo [ERROR] Could not create the Python virtual environment. & goto :fail )
)
echo --- Backend: installing packages (this can take a few minutes) ---
"backend\.venv\Scripts\python.exe" -m pip install --upgrade pip
if errorlevel 1 ( echo [ERROR] Could not upgrade pip. Check your internet connection. & goto :fail )
"backend\.venv\Scripts\python.exe" -m pip install -r backend\requirements.txt
if errorlevel 1 ( echo [ERROR] Installing backend packages failed. See the message above. & goto :fail )

"backend\.venv\Scripts\python.exe" scripts\make_env.py
if errorlevel 1 ( echo [ERROR] Could not create backend\.env & goto :fail )

echo.
echo --- Database: creating tables, seed data and a demo account ---
pushd backend
".venv\Scripts\python.exe" -m app.db_setup --demo
set "DBERR=%errorlevel%"
popd
if not "%DBERR%"=="0" (
  echo [ERROR] Database setup failed. If you switched to MySQL, check DATABASE_URL in backend\.env.
  echo         To use the built-in SQLite database instead, remove or comment out the DATABASE_URL line.
  goto :fail
)

echo.
echo --- Frontend: installing packages (this can take a few minutes) ---
pushd frontend
call npm install --no-audit --no-fund
set "NPMERR=%errorlevel%"
popd
if not "%NPMERR%"=="0" ( echo [ERROR] npm install failed. See the message above. & goto :fail )

echo.
echo =====================================================
echo  Setup complete!  Next: double-click scripts\start_all.bat
echo  Demo login:  demo@example.com   /   Rocket2024
echo =====================================================
echo.
pause
exit /b 0

:fail
echo.
echo Setup did not finish. Fix the problem above and run setup_windows.bat again.
pause
exit /b 1
