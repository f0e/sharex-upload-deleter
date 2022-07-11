@echo off
echo installing dependencies
call yarn

echo.

echo running
call yarn start
pause