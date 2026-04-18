@echo off
echo Launching Google Chrome in Remote Debugging Mode on port 9222...
echo Please ensure all existing Chrome windows are closed before running this script for the first time.
echo.
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222
echo Chrome started. Now you can use the agent with the -c or --cdp flag.
