@echo off
title Push Onboarding Portal to GitHub

echo ================================================
echo BVC / BN Corp Onboarding Portal - GitHub Push
echo ================================================
echo.

REM Go to the folder where this BAT file is placed
cd /d "%~dp0"

echo Checking Git status...
git status

echo.
set /p msg="Enter commit message: "

if "%msg%"=="" (
  set msg=Updated onboarding portal
)

echo.
echo Adding files...
git add .

echo.
echo Committing changes...
git commit -m "%msg%"

echo.
echo Pushing to GitHub...
git push

echo.
echo Done. If Cloudflare Pages is connected to this GitHub repo, deployment will start automatically.
pause
