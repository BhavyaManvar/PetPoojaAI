@echo off
REM ── PetPooja AI Backend — Start Script ──────────────────────────
REM Usage: start.bat
REM   Starts the FastAPI dev server with hot reload on port 8000.

cd /d "%~dp0"

echo.
echo  ====================================
echo   PetPooja AI — Backend Server
echo  ====================================
echo.

REM Check for Python
where py >nul 2>&1
if %ERRORLEVEL% equ 0 (
    set PYTHON=py
    goto :found
)
where python >nul 2>&1
if %ERRORLEVEL% equ 0 (
    set PYTHON=python
    goto :found
)
echo [ERROR] Python not found. Install Python 3.11+ and add to PATH.
pause
exit /b 1

:found
echo [INFO] Using: %PYTHON%
%PYTHON% --version
echo.

REM Install dependencies if needed
if not exist ".venv" (
    echo [INFO] Creating virtual environment...
    %PYTHON% -m venv .venv
)

REM Activate venv
call .venv\Scripts\activate.bat 2>nul

echo [INFO] Installing dependencies...
pip install -q -r requirements.txt

echo.
echo [INFO] Starting server at http://127.0.0.1:8000
echo [INFO] API docs at http://127.0.0.1:8000/docs (DEBUG mode only)
echo [INFO] Press Ctrl+C to stop
echo.

%PYTHON% -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
