@echo off
echo ===============================================
echo   AI Mentor - Starting Frontend
echo ===============================================
echo.

REM Check if node_modules exists
if not exist "frontend\node_modules\" (
    echo ERROR: node_modules not found!
    echo Please run: cd frontend ^&^& npm install
    pause
    exit /b 1
)

REM Navigate to frontend and start
cd frontend

echo Starting Vite development server...
echo Frontend will be available at: http://localhost:3000
echo (Check terminal for actual URL if port is in use)
echo.
echo Press Ctrl+C to stop the server
echo.

npm run dev

pause

