# ---------------------------------------------------------------------------
# Figuren-Rendern.ps1 — laesst Figuren-Blender.py ohne Blender-Fenster laufen
#
# WARUM OHNE FENSTER
#   Im Blender-Fenster blockiert das Rendern die Oberflaeche: Blender meldet
#   "Keine Rueckmeldung", und man sieht bis zum Schluss nicht, ob noch etwas
#   passiert. Ohne Fenster laeuft derselbe Bau in gut einer halben Minute und
#   schreibt jeden Schritt in dieses Fenster.
#
# BENUTZUNG
#   Doppelklick auf "Figuren rendern.cmd" — oder direkt:
#       powershell -ExecutionPolicy Bypass -File "tools\Figuren-Rendern.ps1"
# ---------------------------------------------------------------------------

$ErrorActionPreference = "Stop"

$hier = Split-Path -Parent $MyInvocation.MyCommand.Path
$bauplan = Join-Path $hier "Figuren-Blender.py"
if (-not (Test-Path -LiteralPath $bauplan)) {
    Write-Host "Figuren-Blender.py fehlt neben diesem Skript." -ForegroundColor Red
    exit 1
}

# Blender suchen: neueste Fassung unter "Program Files", sonst im Suchpfad.
$kandidaten = @()
foreach ($wurzel in @("$env:ProgramFiles\Blender Foundation",
                      "${env:ProgramFiles(x86)}\Blender Foundation")) {
    if (Test-Path -LiteralPath $wurzel) {
        $kandidaten += (Get-ChildItem -LiteralPath $wurzel -Directory |
            Sort-Object Name -Descending |
            ForEach-Object { Join-Path $_.FullName "blender.exe" })
    }
}
$imPfad = (Get-Command blender.exe -ErrorAction SilentlyContinue).Source
if ($imPfad) { $kandidaten += $imPfad }

$blender = $kandidaten | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (-not $blender) {
    Write-Host "Blender wurde nicht gefunden." -ForegroundColor Red
    Write-Host "Erwartet unter: $env:ProgramFiles\Blender Foundation\Blender <Version>\blender.exe"
    exit 1
}

Write-Host ""
Write-Host "Blender:  $blender" -ForegroundColor Cyan
Write-Host "Bauplan:  $bauplan" -ForegroundColor Cyan
Write-Host ""

# --factory-startup: mit den Werkseinstellungen starten. Damit koennen eigene
# Blender-Einstellungen (etwa Rendern ueber die Grafikkarte) den Lauf nicht
# beeinflussen — genau daran ist der erste Versuch im Fenster haengengeblieben.
#
# Waehrend des Aufrufs muss ErrorActionPreference auf "Continue" stehen:
# Blender schreibt harmlose Hinweise nach stderr, und mit "Stop" wuerde
# PowerShell die erste dieser Zeilen als Abbruchfehler behandeln.
$beginn = Get-Date
$ErrorActionPreference = "Continue"
& $blender --background --factory-startup --python $bauplan 2>&1 |
    ForEach-Object { Write-Host $_ }
$ErrorActionPreference = "Stop"
$dauer = (Get-Date) - $beginn

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Blender hat mit Fehler abgebrochen (Exit $LASTEXITCODE)." -ForegroundColor Red
    exit $LASTEXITCODE
}

$ordner = Join-Path (Split-Path -Parent $hier) "img\figuren"
$bilder = Get-ChildItem -LiteralPath $ordner -Filter "figur-*.png" -ErrorAction SilentlyContinue
Write-Host ""
Write-Host ("Fertig in {0:N0} Sekunden. {1} Bilder in {2}" -f `
    $dauer.TotalSeconds, $bilder.Count, $ordner) -ForegroundColor Green
if ($bilder.Count -ne 12) {
    Write-Host "ACHTUNG: Es sollten 12 Bilder sein." -ForegroundColor Yellow
}
