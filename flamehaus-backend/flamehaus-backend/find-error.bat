@echo off
REM Run this from the backend folder (the one containing pom.xml).
REM It starts the backend, saves the full log, and extracts the lines that name the real error.

echo Starting backend... wait until it stops (about 15-30 seconds).
call mvn spring-boot:run > startup-log.txt 2>&1

echo.
echo ===== EXTRACTING ERROR LINES =====
findstr /i /c:"Caused by" /c:"APPLICATION FAILED" /c:"Description:" /c:"Action:" /c:"No property" /c:"Error creating bean" /c:"Unsatisfied" /c:"Table '" /c:"Unknown column" /c:"Access denied" /c:"Communications link" startup-log.txt > error-summary.txt

type error-summary.txt
echo.
echo Saved to error-summary.txt  (and the full log to startup-log.txt)
echo Send me the contents of error-summary.txt.
notepad error-summary.txt
pause
