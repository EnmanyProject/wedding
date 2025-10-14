@echo off
echo ========================================
echo Wedding 서버 시작 스크립트
echo ========================================
echo.

REM 현재 디렉토리 확인
cd /d "%~dp0"
echo 현재 위치: %CD%
echo.

REM 포트 3002 사용 중인 프로세스 확인
echo [1/3] 기존 서버 확인 중...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3002"') do (
    echo 기존 서버 발견 (PID: %%a). 종료 중...
    taskkill /F /PID %%a >nul 2>&1
)
echo.

REM 환경 설정 확인
echo [2/3] 환경 설정 확인 중...
findstr "GEMINI_API_KEY=" .env >nul
if %ERRORLEVEL% EQU 0 (
    echo ✅ Gemini API 키 설정됨
) else (
    echo ⚠️  경고: GEMINI_API_KEY가 .env에 설정되지 않았습니다
)
echo.

REM 서버 시작
echo [3/3] 서버 시작 중...
echo.
echo ========================================
echo 서버가 시작됩니다!
echo 종료하려면 Ctrl+C를 누르세요
echo ========================================
echo.

npm run dev
