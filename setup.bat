@echo off
echo ========================================
echo IICS Conversational Agent - Chrome Extension Setup
echo ========================================
echo.

echo 1. Checking extension files...
if not exist "manifest.json" (
    echo ERROR: manifest.json not found!
    pause
    exit /b 1
)

if not exist "popup\popup.html" (
    echo ERROR: popup files not found!
    pause
    exit /b 1
)

if not exist "content\content.js" (
    echo ERROR: content script not found!
    pause
    exit /b 1
)

echo ✓ All required files found

echo.
echo 2. Creating icon placeholders (if needed)...
if not exist "icons" mkdir icons

if not exist "icons\icon16.png" (
    echo Creating placeholder icons...
    echo. > "icons\icon16.png"
    echo. > "icons\icon32.png"
    echo. > "icons\icon48.png"
    echo. > "icons\icon128.png"
    echo ⚠ Warning: Using placeholder icons. Replace with actual PNG files.
)

echo.
echo 3. Extension is ready for installation!
echo.
echo Next steps:
echo 1. Open Chrome and go to chrome://extensions/
echo 2. Enable "Developer mode" (toggle in top-right)
echo 3. Click "Load unpacked" and select this folder
echo 4. The extension should appear in your toolbar
echo.
echo 4. Starting backend server...
cd ..\backend
if exist "app.py" (
    echo Starting Flask backend...
    python app.py
) else (
    echo Backend not found. Please start it manually:
    echo cd backend
    echo python app.py
)

pause
