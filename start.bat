@echo off
cd /d "%~dp0"

:: Start the Node.js server in a new window
start "" cmd /k "node main.js"

:: Wait a few seconds for the server to start
timeout /t 3 /nobreak > nul

:: Open the default browser to localhost:3000
start "" "http://localhost:3000"
