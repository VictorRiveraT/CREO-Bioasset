@echo off
title CREO-Bioasset - Servicios Locales y Tunel Permanente
color 0b

echo =======================================================
echo          CREO+ BIOASSET - INICIANDO SISTEMA
echo =======================================================
echo.

cd /d "c:\Users\vicrt\OneDrive\Escritorio\BioAssets\Creo-Bioasset"

echo [1/3] Verificando Docker Desktop...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo Docker no esta activo. Iniciando Docker Desktop automaticamente...
    if exist "C:\Users\vicrt\AppData\Local\Programs\DockerDesktop\Docker Desktop.exe" (
        start "" "C:\Users\vicrt\AppData\Local\Programs\DockerDesktop\Docker Desktop.exe"
    )
    echo Esperando a que el motor de Docker responda...
    :wait_docker
    timeout /t 3 /nobreak >nul
    docker info >nul 2>&1
    if %errorlevel% neq 0 (
        echo   ...esperando a Docker Desktop...
        goto wait_docker
    )
    echo Docker esta listo!
) else (
    echo Docker ya se encuentra en ejecucion.
)

echo.
echo [2/3] Levantando contenedores con Docker Compose...
docker-compose up -d

echo.
echo [3/3] Iniciando Tunel Permanente Ngrok...
echo URL Fija Backend: https://interspheral-ireland-nonspecially.ngrok-free.dev
echo.
echo =======================================================
echo   SISTEMA ACTIVO Y CONECTADO
echo   Web Produccion: https://creo-bioasset-one.vercel.app
echo   Local Gateway:  http://localhost:8080
echo =======================================================
echo * Manten esta ventana abierta durante toda tu presentacion.
echo.

start https://creo-bioasset-one.vercel.app

set "NGROK_PATH=%LOCALAPPDATA%\Microsoft\WinGet\Packages\Ngrok.Ngrok_Microsoft.Winget.Source_8wekyb3d8bbwe\ngrok.exe"

if exist "%NGROK_PATH%" (
    "%NGROK_PATH%" http 8080 --url https://interspheral-ireland-nonspecially.ngrok-free.dev
) else (
    ngrok http 8080 --url https://interspheral-ireland-nonspecially.ngrok-free.dev
)
pause
