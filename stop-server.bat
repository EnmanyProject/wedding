@echo off
echo ========================================
echo Wedding 서버 종료 스크립트
echo ========================================
echo.

REM 포트 3002 사용 중인 프로세스 종료
echo 서버 종료 중...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3002"') do (
    echo PID %%a 종료 중...
    taskkill /F /PID %%a
)

echo.
echo ✅ 서버가 종료되었습니다
echo.
pause
