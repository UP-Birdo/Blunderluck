<#
    Tests-Ausfuehren.ps1 - fuehrt alle Regressionstests des Blunderluck-Projekts aus.

    Auf diesem Rechner ist kein Node installiert. Stattdessen springt die
    Node-Laufzeit ein, die in Visual Studio Code steckt: Code.exe laeuft mit
    gesetzter Umgebungsvariable ELECTRON_RUN_AS_NODE wie ein normales Node.

    Das Skript findet seine Pfade relativ zu sich selbst - es darf mit dem
    Projekt verschoben werden.

    Aufruf (aus einem beliebigen Verzeichnis):
        powershell -ExecutionPolicy Bypass -File "<Pfad>\tests\Tests-Ausfuehren.ps1"

    Rueckgabe: Exit 0, wenn alle Testdateien "0 Fehler" melden, sonst 1.
#>

$ErrorActionPreference = "Stop"

$hier = Split-Path -Parent $MyInvocation.MyCommand.Path

# ---------------------------------------------------------------------
# Node-Laufzeit finden (VS Codes Electron)
# ---------------------------------------------------------------------

# ZWEI ANMELDUNGEN AN EINEM RECHNER (seit 2026-08-08): Dieser PC wird sowohl
# als Domaenen- als auch als lokaler Benutzer benutzt, und VS Code installiert
# sich je Profil in einen EIGENEN Ordner. Ein fester Pfad ueber
# $env:LOCALAPPDATA findet es deshalb nur unter einer der beiden Anmeldungen -
# unter der anderen brach der Testlauf mit "Code.exe wurde nicht gefunden" ab.
# Gesucht wird darum in dieser Reihenfolge: eigenes Profil, systemweite
# Installation, dann JEDES andere Benutzerprofil auf diesem Rechner.
$kandidaten = @(
    (Join-Path $env:LOCALAPPDATA "Programs\Microsoft VS Code\Code.exe"),
    "C:\Program Files\Microsoft VS Code\Code.exe",
    "C:\Program Files (x86)\Microsoft VS Code\Code.exe"
)

$kandidaten += (Get-ChildItem -LiteralPath "C:\Users" -Directory -ErrorAction SilentlyContinue |
    ForEach-Object { Join-Path $_.FullName "AppData\Local\Programs\Microsoft VS Code\Code.exe" })

$codeExe = $null
foreach ($kandidat in $kandidaten) {
    if (Test-Path -LiteralPath $kandidat) {
        $codeExe = $kandidat
        break
    }
}

if (-not $codeExe) {
    Write-Host "Code.exe wurde nicht gefunden. Gesuchte Orte:" -ForegroundColor Red
    $kandidaten | ForEach-Object { Write-Host "  $_" }
    exit 1
}

# ---------------------------------------------------------------------
# Testdateien ausfuehren
# ---------------------------------------------------------------------

$env:ELECTRON_RUN_AS_NODE = "1"

$testDateien = Get-ChildItem -LiteralPath $hier -Filter "test-*.js" | Sort-Object Name

if ($testDateien.Count -eq 0) {
    Write-Host "Keine Testdateien gefunden." -ForegroundColor Yellow
    exit 1
}

$fehlerhaft = 0

foreach ($testDatei in $testDateien) {
    Write-Host ""
    Write-Host "--- $($testDatei.Name) ---" -ForegroundColor Cyan

    # Jeder Pfad wird einzeln gequotet uebergeben: der OneDrive-Pfad enthaelt
    # Leerzeichen und wuerde sonst zerlegt werden.
    $argument = '"{0}"' -f $testDatei.FullName

    $lauf = Start-Process -FilePath $codeExe `
                          -ArgumentList $argument `
                          -Wait -NoNewWindow -PassThru

    if ($lauf.ExitCode -ne 0) {
        $fehlerhaft++
        Write-Host "$($testDatei.Name): FEHLGESCHLAGEN (Exit $($lauf.ExitCode))" -ForegroundColor Red
    }
}

Write-Host ""
if ($fehlerhaft -eq 0) {
    Write-Host "Alle Testdateien in Ordnung." -ForegroundColor Green
    exit 0
}

Write-Host "$fehlerhaft Testdatei(en) fehlgeschlagen." -ForegroundColor Red
exit 1
