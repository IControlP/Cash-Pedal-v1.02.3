@echo off
REM Quick setup script for CashPedal local development (Windows)

echo.
echo CashPedal Local Development Setup
echo ====================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Python 3 is not installed. Please install Python 3.8+ first.
    exit /b 1
)

echo Python found
python --version
echo.

REM Create virtual environment
echo Creating virtual environment...
python -m venv venv

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Install dependencies
echo Installing dependencies...
python -m pip install --upgrade pip
pip install -r requirements.txt

echo.
echo Setup complete!
echo.
echo To start the app:
echo   1. Activate virtual environment: venv\Scripts\activate
echo   2. Run: streamlit run main.py
echo.
echo The app will open automatically at http://localhost:8501
pause
