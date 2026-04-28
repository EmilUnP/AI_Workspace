@echo off
title Eduator - Launcher
cd /d "%~dp0"

echo Starting Eduator: API and Web in 2 terminals...
echo.

REM Terminal 1: API Server
start "Eduator - API" cmd /k "npm run dev:api"

REM Terminal 2: Web App
start "Eduator - Web" cmd /k "npm run dev:web"

echo Both terminals started. Close each window to stop that app.
echo.
echo Local URLs:
echo - Web:       http://localhost:3001
echo - API:       http://localhost:4000
timeout /t 2 /nobreak >nul
