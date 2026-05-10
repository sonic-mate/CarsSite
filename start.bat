@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

cd /d "%~dp0"

set "PROJECT_NAME=VostokAvtoImport"
set "COMPOSE=docker compose -f docker-compose.prod.yml"
set "HEALTH_CHECK_URL=http://localhost:8000/health"

title %PROJECT_NAME% - Docker Control
set "DOCKER_BUILDKIT=1"
set "COMPOSE_DOCKER_CLI_BUILD=1"

:menu
cls
echo ==========================================
echo   %PROJECT_NAME% - Docker Menu
echo ==========================================
echo.
echo 1^) Запуск проекта
echo 2^) Остановка проекта
echo 3^) Перезапуск проекта
echo 4^) Пересборка проекта
echo 5^) Логи
echo 6^) Очистка проекта
echo 7^) Выход
echo.
choice /c 1234567 /n /m "Выбор [1-7]: "
set "choice=%errorlevel%"

if "%choice%"=="1" goto start_project
if "%choice%"=="2" goto stop_project
if "%choice%"=="3" goto restart_project
if "%choice%"=="4" goto rebuild_project
if "%choice%"=="5" goto logs_menu
if "%choice%"=="6" goto cleanup_project
if "%choice%"=="7" goto end

:start_project
echo.
echo Запуск проекта...
%COMPOSE% up -d
echo.
goto end

:stop_project
echo.
echo Остановка проекта...
%COMPOSE% down --remove-orphans
echo.
goto end

:restart_project
echo.
echo Перезапуск проекта...
%COMPOSE% down --remove-orphans
%COMPOSE% up -d
echo.
goto end

:rebuild_project
echo.
echo Пересборка образов...
%COMPOSE% down --remove-orphans
%COMPOSE% build
if errorlevel 1 (
    echo.
    echo Сборка завершилась с ошибкой. Исправь и попробуй снова.
    goto end
)
echo.
%COMPOSE% up -d
echo.
echo Ожидание запуска backend...
:wait_healthy
%COMPOSE% exec backend curl -sf %HEALTH_CHECK_URL% >nul 2>&1
if errorlevel 1 (
    timeout /t 3 /nobreak >nul
    goto wait_healthy
)
echo Backend готов.
echo.
goto end

:logs_menu
cls
echo ==========================================
echo   Логи  ^(Ctrl+C для остановки^)
echo ==========================================
echo.
echo 1^) Все сервисы
echo 2^) Backend
echo 3^) Frontend
echo 4^) DB
echo 5^) Redis
echo 6^) Назад
echo.
choice /c 123456 /n /m "Выбор [1-6]: "
set "log_choice=%errorlevel%"

if "%log_choice%"=="1" %COMPOSE% logs -f
if "%log_choice%"=="2" %COMPOSE% logs -f backend
if "%log_choice%"=="3" %COMPOSE% logs -f frontend
if "%log_choice%"=="4" %COMPOSE% logs -f db
if "%log_choice%"=="5" %COMPOSE% logs -f redis
if "%log_choice%"=="6" goto menu
goto end

:cleanup_project
cls
echo ==========================================
echo   ОЧИСТКА ПРОЕКТА
echo ==========================================
echo.
echo  Удаляет: контейнеры, тома, сети,
echo  образы проекта и все dangling-образы.
echo  ВСЕ ДАННЫЕ БАЗЫ БУДУТ УДАЛЕНЫ.
echo.
choice /c YN /n /m "Продолжить? [Y/N]: "
if errorlevel 2 goto menu

echo.
echo [1/3] Удаление контейнеров, томов, сетей, образов...
%COMPOSE% down --remove-orphans -v --rmi local

echo.
echo [2/3] Удаление dangling-образов...
for /f "tokens=*" %%i in ('docker images -f "dangling=true" -q') do docker rmi %%i 2>nul

echo.
echo [3/3] Удаление неиспользуемых томов...
docker volume prune -f

echo.
echo Готово. Все данные проекта удалены.
goto end

:end
endlocal
exit /b 0
