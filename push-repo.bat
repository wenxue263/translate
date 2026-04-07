@echo off
setlocal
chcp 936 >nul

set "SCRIPT_DIR=%~dp0"
set "PS1=%SCRIPT_DIR%push-repo.ps1"

if not exist "%PS1%" (
  echo Script not found: %PS1%
  pause
  exit /b 1
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PS1%"
set "CODE=%ERRORLEVEL%"

if not "%CODE%"=="0" (
  echo.
  echo Push failed, exit code: %CODE%
  pause
  exit /b %CODE%
)

echo.
echo Push done.
pause
