@echo off
setlocal EnableExtensions EnableDelayedExpansion
mode con: cols=150
title Publish a new release
timeout /t 1 >nul

set "devDir=%~dp0"
set "pubDir=%devDir%..\Miriani Soundpack for VIP Mud\Proxiani\"

if not exist "%pubDir%" (
 echo Public directory not found.
 pause
 exit /b 1
)

echo Enter new version string or which part of the version string to bump.
echo Example: patch
echo Empty input defaults to patch.
set /p "InputString=Version: "
if "!InputString!"=="" (
 set "NewRelease=patch"
) else (
 set "NewRelease=%InputString%"
)
echo New release: !NewRelease!

xcopy "!devDir!middleware" "!pubDir!middleware" /D /E /Q /V /M /Y>nul
xcopy "!devDir!src" "!pubDir!src" /D /E /Q /V /M /Y>nul
xcopy "!devDir!package.json" "!pubDir!package.json" /D /Q /V /M /Y>nul
pause
