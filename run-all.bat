@echo off
title Eduator - Launcher
cd /d "%~dp0"

echo Starting Eduator: API, ERP, and Marketing in 3 terminals...
echo.

REM Terminal 1: API Server
start "Eduator - API" cmd /k "npm run dev:api"

REM Terminal 2: ERP App
start "Eduator - ERP" cmd /k "npm run dev:erp"

REM Terminal 3: Marketing Site
start "Eduator - Marketing" cmd /k "npm run dev:marketing"

echo All 3 terminals started. Close each window to stop that app.
echo.
echo Local URLs:
echo - Marketing: http://localhost:3000
echo - ERP:       http://localhost:3001
echo - API:       http://localhost:4000
timeout /t 2 /nobreak >nul
