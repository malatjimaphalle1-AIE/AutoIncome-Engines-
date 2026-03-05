@echo off
echo Starting AutoIncome Engines...
echo 1. Starting Backend Server (Port 3001)...
start "Backend Server" cmd /k ""npm run start:server
timeout /t 5
echo 2. Starting Frontend App (Port 5173)...
start "Frontend App" cmd /k "npm run dev"
echo Done! Please wait for the browser to open.
pause

