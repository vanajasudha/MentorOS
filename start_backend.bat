@echo off
echo ===============================================
echo   AI Mentor - Starting Backend Server
echo ===============================================
echo.

REM Check if venv exists
if not exist "venv\Scripts\activate.bat" (
    echo ERROR: Virtual environment not found!
    echo Please run: python -m venv venv
    echo Then install dependencies: pip install -r backend\requirements.txt
    pause
    exit /b 1
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Note: No API keys needed - using local models!

REM Start backend
echo.
echo Starting FastAPI server...
echo Backend will be available at: http://localhost:8000
echo API Documentation: http://localhost:8000/docs
echo.
echo Press Ctrl+C to stop the server
echo.

uvicorn backend.app:app --reload

pause

