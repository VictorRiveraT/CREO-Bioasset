@echo off
title CREO-Bioasset - Servicios Locales y Tunel Permanente
color 0b

echo =======================================================
echo          CREO+ BIOASSET - INICIANDO SISTEMA
echo =======================================================
echo.

cd /d "%~dp0"

echo [1/2] Iniciando contenedores de Docker...
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

ngrok http 8080 --url https://interspheral-ireland-nonspecially.ngrok-free.dev
pause
