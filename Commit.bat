@echo off
setlocal EnableExtensions EnableDelayedExpansion
mode con: cols=150
title Commit a new change
timeout /t 1 >nul

set "NewCommitsFile=%~dp0\New commits.txt"

echo Enter a message for this commit.
echo Note: Do not use quotation marks^^!
set /p "CommitMessage=Message: "

if "!CommitMessage!"=="" (
 echo An empty string is not a valid message.
 pause
 exit /b 1
)

(echo * !CommitMessage!) >>"%NewCommitsFile%"

git add .
git commit -m "!CommitMessage!"

echo Done^^!
pause
