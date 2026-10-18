@echo off
setlocal
cd /d "%~dp0"
where py >nul 2>nul
if errorlevel 1 goto use_python
py -3 tools\build-unity-slice.py %*
exit /b %errorlevel%
:use_python
python tools\build-unity-slice.py %*
exit /b %errorlevel%
