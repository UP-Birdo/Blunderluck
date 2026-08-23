# Test-Blunderluck.ps1 — die ganze Testkette mit EINEM Aufruf (Haus-Standard:
# tools\Test-<App>.ps1 in jedem Projekt gleich). Reicht an die bestehende
# Kette tests\Tests-Ausfuehren.ps1 durch; deren Aufruf bleibt weiter gueltig.
#
# -NurFazit  gibt statt der vollen Ausgabe GENAU EINE Zeile aus:
#
#                Blunderluck: 1234 Pruefungen, 0 Fehler   (Exit 0)
#
#            und im Fehlerfall zusaetzlich jede fehlgeschlagene Pruefung mit
#            ihrer Testdatei. Der Exit-Code bleibt derselbe.
#
#            WOZU: Der Aufruf laeuft in jeder Bau-Runde mehrfach, und im
#            Normalfall ("0 Fehler") ist an der vollen Ausgabe nichts zu lesen.
#            Sie kostete bisher entweder viel Platz im Verlauf oder einen
#            Subagenten, der die Zahlen abschreibt — und dabei zweimal falsch
#            abgeschrieben hat (siehe docs\entscheidungen\erkenntnisse.md).
#            Eine Zeile ist billiger UND genauer als beides.

param(
    [switch]$NurFazit
)

$ErrorActionPreference = 'Stop'
$kette = Join-Path (Split-Path -Parent $PSScriptRoot) 'tests\Tests-Ausfuehren.ps1'

if (-not $NurFazit) {
    & powershell -ExecutionPolicy Bypass -File $kette
    exit $LASTEXITCODE
}

# DIE TESTMELDUNGEN KOMMEN UEBER DEN FEHLERKANAL (`console.error` in den
# Testdateien). Zwei Dinge sind deshalb noetig, und beide sind beim Bauen
# schiefgegangen, bevor sie hier standen:
#
#   1. `$ErrorActionPreference` muss fuer diesen einen Aufruf auf 'Continue'
#      stehen. Auf 'Stop' bricht schon die erste Fehlerzeile das Skript ab —
#      dann gibt es gar kein Fazit mehr, also genau im Fehlerfall nichts.
#   2. Was aus `2>&1` kommt, ist kein Text, sondern ein ErrorRecord. Ohne
#      `.ToString()` steht spaeter „powershell.exe : FEHLER …" samt vier Zeilen
#      PowerShell-Beiwerk da, und kein Muster greift mehr.
$vorher = $ErrorActionPreference
$ErrorActionPreference = 'Continue'

$ausgabe = & powershell -ExecutionPolicy Bypass -File $kette 2>&1 |
    ForEach-Object { $_.ToString() }

$code = $LASTEXITCODE
$ErrorActionPreference = $vorher

# Jede Testdatei meldet ihre Bilanz als "N ok, M Fehler" — daraus die Summe.
$pruefungen = 0
$fehler = 0

foreach ($zeile in $ausgabe) {
    $treffer = [regex]::Match([string]$zeile, '^(\d+) ok, (\d+) Fehler')
    if ($treffer.Success) {
        $pruefungen += [int]$treffer.Groups[1].Value
        $fehler += [int]$treffer.Groups[2].Value
    }
}

# Im Fehlerfall zaehlt der Wortlaut: Welche Pruefung, in welcher Datei, warum.
# Die Testlaeufer nennen die Datei als "--- test-xyz.js ---" davor.
if ($fehler -gt 0 -or $code -ne 0) {
    $datei = ''
    $eingerueckteGehoerenDazu = $false

    foreach ($zeile in $ausgabe) {
        $text = [string]$zeile

        $kopf = [regex]::Match($text, '^--- (.+) ---$')
        if ($kopf.Success) {
            $datei = $kopf.Groups[1].Value
            $eingerueckteGehoerenDazu = $false
            continue
        }

        if ($text -match '^FEHLER: ') {
            Write-Host ("[" + $datei + "] " + $text)
            $eingerueckteGehoerenDazu = $true
            continue
        }

        # Die Begruendung steht eingerueckt DIREKT unter ihrer Meldung. Nur
        # dort gilt sie - sonst faengt das Muster jede eingerueckte Zeile des
        # ganzen Laufs mit ein (Stapelspuren, Syntax-Ausgaben).
        if ($eingerueckteGehoerenDazu -and $text -match '^\s{4,}\S') {
            Write-Host ("             " + $text.Trim())
            continue
        }

        $eingerueckteGehoerenDazu = $false
    }
}

Write-Host ("Blunderluck: $pruefungen Pruefungen, $fehler Fehler   (Exit $code)")
exit $code
