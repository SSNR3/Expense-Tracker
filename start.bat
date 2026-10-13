@echo off
echo.
echo   FinFlow - Personal Finance Intelligence
echo   -----------------------------------------
echo.

:: Setup backend
echo Setting up backend...
cd backend
if not exist venv (
    python -m venv venv
)
call venv\Scripts\activate.bat
pip install -q -r requirements.txt
cd ..

:: Setup frontend
echo Setting up frontend...
cd frontend
if not exist node_modules (
    npm install --silent
)
cd ..

:: Create data dir
if not exist data mkdir data

echo.
echo Starting servers...
echo   Backend  - http://localhost:8000
echo   Frontend - http://localhost:5173
echo.

:: Start backend in new window
start "FinFlow Backend" cmd /c "cd backend && venv\Scripts\activate && uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

:: Wait a moment
timeout /t 2 /nobreak >nul

:: Start frontend
cd frontend
npm run dev
