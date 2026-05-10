@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

cd /d "%~dp0"

set "PROJECT_NAME=VostokAvtoImport"
set "CF=-f docker-compose.prod.yml"

title %PROJECT_NAME% - Docker Control
set "DOCKER_BUILDKIT=1"
set "COMPOSE_DOCKER_CLI_BUILD=1"

:menu
cls
echo ==========================================
echo   %PROJECT_NAME% - Docker Menu
echo ==========================================
echo.
echo 1^) Zapusk proekta
echo 2^) Ostanovka proekta
echo 3^) Perezapusk proekta
echo 4^) Peresborka proekta
echo 5^) Logi
echo 6^) Ochistka proekta
echo 7^) Vyhod
echo.
choice /c 1234567 /n /m "Vybor [1-7]: "
set "SEL=%errorlevel%"

if "%SEL%"=="1" goto do_start
if "%SEL%"=="2" goto do_stop
if "%SEL%"=="3" goto do_restart
if "%SEL%"=="4" goto do_rebuild
if "%SEL%"=="5" goto do_logs
if "%SEL%"=="6" goto do_cleanup
if "%SEL%"=="7" goto end

:do_start
echo.
echo Starting...
docker compose %CF% up -d
echo.
goto end

:do_stop
echo.
echo Stopping...
docker compose %CF% down --remove-orphans
echo.
goto end

:do_restart
echo.
echo Restarting...
docker compose %CF% down --remove-orphans
docker compose %CF% up -d
echo.
goto end

:do_rebuild
echo.
echo Rebuilding...
docker compose %CF% down --remove-orphans
docker compose %CF% build
if errorlevel 1 (
    echo Build failed.
    goto end
)
docker compose %CF% up -d
echo.
echo Waiting for backend...
:wait_healthy
docker compose %CF% exec backend curl -sf http://localhost:8000/health >nul 2>&1
if errorlevel 1 (
    timeout /t 3 /nobreak >nul
    goto wait_healthy
)
echo Backend ready.
goto end

:do_logs
cls
echo ==========================================
echo   Logs  ^(Ctrl+C to stop^)
echo ==========================================
echo.
echo 1^) All services
echo 2^) Backend
echo 3^) Frontend
echo 4^) DB
echo 5^) Redis
echo 6^) Back
echo.
choice /c 123456 /n /m "Vybor [1-6]: "
set "L=%errorlevel%"

if "%L%"=="1" docker compose %CF% logs -f
if "%L%"=="2" docker compose %CF% logs -f backend
if "%L%"=="3" docker compose %CF% logs -f frontend
if "%L%"=="4" docker compose %CF% logs -f db
if "%L%"=="5" docker compose %CF% logs -f redis
if "%L%"=="6" goto menu
goto end

:do_cleanup
cls
echo ==========================================
echo   CLEANUP PROJECT
echo ==========================================
echo.
echo  Removes: containers, volumes, images.
echo  ALL DATABASE DATA WILL BE LOST.
echo.
choice /c YN /n /m "Continue? [Y/N]: "
if errorlevel 2 goto menu

echo.
echo [1/3] Removing containers, volumes, images...
docker compose %CF% down --remove-orphans -v --rmi local

echo.
echo [2/3] Removing dangling images...
for /f "tokens=*" %%i in ('docker images -f "dangling=true" -q') do docker rmi %%i 2>nul

echo.
echo [3/3] Pruning unused volumes...
docker volume prune -f

echo.
echo Done. All project data removed.
goto end

:end
endlocal
exit /b 0
