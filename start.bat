@echo off
echo Starting NoteMind AI...

start "Backend" cmd /k "cd /d c:\Users\sanka\OneDrive\Documents\NOTEMINDAI\backend && venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000"

timeout /t 5 /nobreak >nul

start "Frontend" cmd /k "cd /d c:\Users\sanka\OneDrive\Documents\NOTEMINDAI\frontend && npm run dev"

timeout /t 10 /nobreak >nul

start http://localhost:3001

echo Done! NoteMind AI is starting...
