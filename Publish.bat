@echo off
setlocal EnableExtensions EnableDelayedExpansion
mode con: cols=150
title Publish a new release
timeout /t 1 >nul

set "devDir=%~dp0"
set "pubDir=%devDir%..\Miriani Soundpack for VIP Mud\Proxiani\"
set "ChangelogFile=%~dp0\CHANGELOG.txt"
set "NewCommitsFile=%~dp0\New commits.txt"

if not exist "%pubDir%" (
 echo Public directory not found.
 pause
 exit /b 1
)
if not exist "%NewCommitsFile%" (
 echo No new commits.
 pause
 exit /b 1
)

echo Enter a version bumping keyword.
echo Example: patch
echo Empty input defaults to patch.
set /p "InputString=Version: "
if "!InputString!"=="" (
 set "NewRelease=patch"
) else (
 set "NewRelease=%InputString%"
)

for /f "tokens=* USEBACKQ" %%a in (`npm version !NewRelease!`) do set tag=%%a
echo Version %tag:~1%, released %date%:>"%ChangelogFile%.tmp"
type "%NewCommitsFile%" >>"%ChangelogFile%.tmp"
echo.>>"%ChangelogFile%.tmp"
type "%ChangelogFile%" >>"%ChangelogFile%.tmp"
move /y "%ChangelogFile%.tmp" "%ChangelogFile%" >nul
del /q "%NewCommitsFile%" >nul

xcopy "!devDir!middleware" "!pubDir!middleware" /D /E /Q /V /M /Y>nul
xcopy "!devDir!src" "!pubDir!src" /D /E /Q /V /M /Y>nul
xcopy "!devDir!CHANGELOG.txt" "!pubDir!CHANGELOG.txt" /D /Q /V /M /Y>nul
xcopy "!devDir!package.json" "!pubDir!package.json" /D /Q /V /M /Y>nul

git add .
git commit -m "Update CHANGELOG.txt"
git push --follow-tags

pause
