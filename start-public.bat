@echo off
echo ========================================================
echo Starting NoteMind AI & Exposing Public Link...
echo ========================================================

start "Backend API" cmd /k "cd /d %~dp0backend && venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000"
timeout /t 3 /nobreak >nul

start "Frontend App" cmd /k "cd /d %~dp0frontend && npm run dev"
timeout /t 5 /nobreak >nul

echo Exposing frontend on public URL via localtunnel...
npx --yes localtunnel --port 3000 --subdomain notemind-ai
