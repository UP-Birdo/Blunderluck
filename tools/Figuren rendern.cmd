@echo off
rem Rendert die zwoelf Schachfiguren mit Blender, ohne Blender-Fenster.
rem Doppelklick genuegt; das Fenster bleibt am Ende offen.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Figuren-Rendern.ps1"
pause
