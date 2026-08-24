@echo off
rem Rendert die fuenf Lootbox-Bilder mit Blender, ohne Blender-Fenster.
rem Doppelklick genuegt; das Fenster bleibt am Ende offen.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Lootbox-Rendern.ps1"
pause
