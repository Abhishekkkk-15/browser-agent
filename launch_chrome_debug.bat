@echo off
echo.
echo ========================================================
echo   Browser Agent: Chrome Debug Launcher
echo ========================================================
echo.
echo IMPORTANT: Close ALL Chrome windows before continuing.
echo If any window is left open, the debug port will NOT start.
echo.
tasklist /fi "ImageName eq chrome.exe" /nh | findstr /i "chrome.exe" > nul
if %errorlevel% equ 0 (
    echo [!] WARNING: Chrome processes are still detected.
    echo Please close them and then press any key.
    echo.
)
pause
echo.
echo Launching Google Chrome in Remote Debugging Mode on port 9222...
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --remote-allow-origins=* --user-data-dir="%CD%\.chrome_debug_profile"
echo.
echo ✅ Chrome started! 
echo Now you can run: pnpm run agent doctor
echo.
