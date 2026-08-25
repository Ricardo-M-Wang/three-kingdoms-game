@echo off
cd /d "C:\Users\20373\three-kingdoms-game"
echo 正在启动三国志...
start "" http://localhost:5200
start "" /min cmd /c "timeout /t 4 /nobreak >nul && start http://localhost:5200"
npm run dev -- --port 5200 --host 0.0.0.0
pause
