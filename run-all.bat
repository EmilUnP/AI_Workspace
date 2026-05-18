@echo off
title Eduator - Launcher
cd /d "%~dp0"

echo Starting Eduator: API and Web in 2 terminals...
echo.

REM Terminal 1: API Server
start "Eduator - API" cmd /k "cd /d ""%~dp0apps\backend"" && npm run dev"

REM Terminal 2: Web App
start "Eduator - Web" cmd /k "cd /d ""%~dp0apps\web-app"" && npm run dev"

echo Both terminals started. Close each window to stop that app.
echo.
echo Local URLs:
echo - Web:       http://localhost:3000
echo - API:       http://localhost:4000
