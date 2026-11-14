@echo off
rem Finds a Python 3.10+ interpreter and stores the command in PYCMD (used by the other scripts).
set "PYCMD="
for %%V in (3.13 3.12 3.11 3.10) do (
  if not defined PYCMD (
    py -%%V -c "import sys" >nul 2>nul
    if not errorlevel 1 set "PYCMD=py -%%V"
  )
)
if not defined PYCMD (
  python -c "import sys; sys.exit(0 if sys.version_info >= (3,10) else 1)" >nul 2>nul
  if not errorlevel 1 set "PYCMD=python"
)
exit /b 0
