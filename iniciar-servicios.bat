@echo off
title CREO-Bioasset - Servicios Locales y Tunel Permanente
color 0b

echo =======================================================
echo          CREO+ BIOASSET - INICIANDO SISTEMA
echo =======================================================
echo.

cd /d "c:\Users\vicrt\OneDrive\Escritorio\BioAssets\Creo-Bioasset"

echo [1/2] Verificando e iniciando Docker Compose...
docker-compose up -d

echo.
echo [2/2] Iniciando Tunel Permanente Ngrok...
echo URL Fija: https://interspheral-ireland-nonspecially.ngrok-free.dev
echo.
echo =======================================================
echo   SISTEMA ACTIVO CONECTADO A VERCEL
echo   Web: https://creo-bioasset-one.vercel.app
echo =======================================================
echo * Manten esta ventana abierta mientras uses el sistema.
echo.

set "NGROK_PATH=%LOCALAPPDATA%\Microsoft\WinGet\Packages\Ngrok.Ngrok_Microsoft.Winget.Source_8wekyb3d8bbwe\ngrok.exe"

if exist "%NGROK_PATH%" (
    "%NGROK_PATH%" http 8080 --url https://interspheral-ireland-nonspecially.ngrok-free.dev
) else (
    ngrok http 8080 --url https://interspheral-ireland-nonspecially.ngrok-free.dev
)
pause
