@echo off
setlocal EnableExtensions EnableDelayedExpansion

rem devDir MUST end with trailing backslash!
set "devDir=%~dp0"

rem If specified, pubDir MUST NOT end with trailing backslash!
set "pubDir="

if not exist "%devDir%Publish.bat" (
 echo Creating a new Publish.bat file.
 copy %0 "%devDir%Publish.bat" >nul
 pause
 exit /b 1
)
if not %0=="%devDir%Publish.bat" (
 echo Please run the file named Publish.bat instead.
 pause
 exit /b 1
)

mode con: cols=120
title Publish a new release
timeout /t 1 >nul

set "ChangelogFile=%devDir%CHANGELOG.txt"
set "NewCommitsFile=%devDir%New commits.txt"

echo What's the new version?
echo Example: patch
echo Empty input defaults to patch.
set /p "InputString=Version: "
if "!InputString!"=="" (
 set "NewRelease=patch"
) else (
 set "NewRelease=%InputString%"
)

for /f "tokens=* USEBACKQ" %%a in (`npm version !NewRelease!`) do set tag=%%a

if exist "%NewCommitsFile%" (
 echo Version %tag:~1%, released %date%:>"%ChangelogFile%.tmp"
 type "%NewCommitsFile%" >>"%ChangelogFile%.tmp"
 del /q "%NewCommitsFile%" >nul
) else (
 echo Version %tag:~1%, released %date%.>"%ChangelogFile%.tmp"
)
echo.>>"%ChangelogFile%.tmp"
type "%ChangelogFile%" >>"%ChangelogFile%.tmp"
move /y "%ChangelogFile%.tmp" "%ChangelogFile%" >nul

if not "%pubDir%"=="" (
 robocopy "%devDir%\" "%pubDir%" /E /PURGE /R:1 /W:10 /NJH /COPY:D /DCOPY:D /XJ /XF .gitignore .npmignore Commit.bat desktop.ini "New commits.txt" Publish.bat Publish.default.bat /XD .git node_modules
)

git add .
git commit -m "Update CHANGELOG"
git push --follow-tags
pause
