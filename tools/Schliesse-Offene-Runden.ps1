<#
    Schliesse-Offene-Runden.ps1 - entfernt alle NICHT BEENDETEN Runden aus der
    Firebase-Datenbank (wartende und laufende), nach einem frischen Abzug.

    WARUM ES DAS GIBT

    Runden, die nie zu Ende gespielt wurden, bleiben sonst fuer immer in der
    Tafel liegen: Eine wartende Runde ohne zweiten Spieler, eine begonnene
    Partie, die beide vergessen haben, eine leere Computer-Runde aus einer
    alten Version. Jede davon wird bei jedem Laden mitgeladen. Der Nutzer
    hat am 18.09.2026 angesagt: "du kannst alle offenen spiele schliessen".

    WAS ES TUT

      1. Zieht ueber tools\Sichere-Datenbank.ps1 einen frischen Abzug - es
         wird NIE etwas geloescht, das nicht vorher gesichert ist.
      2. Holt die Partien und zeigt jede an, die kein Ergebnis hat.
      3. Entfernt sie in EINER Mehrpfad-Aenderung (PATCH): je Runde die
         Partie (partien/<id>) und ihren Uebersichts-Eintrag (uebersicht/<id>,
         seit v0.114.3) - kein Ueberschreiben der ganzen Tafel (Hausregel
         "nie den ganzen Stand blind ueberschreiben") - und zieht im selben
         Schritt den Zeitstempel geaendertAm der Tafel hoch, damit die
         Geraete die Aenderung sehen (die Marke aus v0.111.0).

    Beendete Partien (mit Ergebnis) und die Chronik werden NIE angefasst -
    an ihnen haengt die Rangliste.

    AUFRUF (im Projektordner)

        powershell -ExecutionPolicy Bypass -File "tools\Schliesse-Offene-Runden.ps1" -NurAnzeigen
        powershell -ExecutionPolicy Bypass -File "tools\Schliesse-Offene-Runden.ps1"

    -NurAnzeigen zeigt, was entfernt wuerde, und aendert nichts (zieht auch
    keinen Abzug). Adresse und Pfad kommen AUS js\konfig.js.
#>

param(
    [switch]$NurAnzeigen,
    [ValidateRange(5, 300)]
    [int]$ZeitlimitSekunden = 30
)

$ErrorActionPreference = "Stop"

$hier          = Split-Path -Parent $MyInvocation.MyCommand.Path
$projektOrdner = Split-Path -Parent $hier
$konfigDatei   = Join-Path $projektOrdner "js\konfig.js"
$sicherung     = Join-Path $hier "Sichere-Datenbank.ps1"

if (-not (Test-Path -LiteralPath $konfigDatei -PathType Leaf)) {
    Write-Host "js\konfig.js nicht gefunden: $konfigDatei" -ForegroundColor Red
    exit 1
}

$konfigText = Get-Content -LiteralPath $konfigDatei -Raw

function Get-KonfigWert {
    param([string]$Ausdruck, [string]$Bezeichnung)
    if ($konfigText -match $Ausdruck) {
        return $Matches[1]
    }
    Write-Host "In js\konfig.js fehlt: $Bezeichnung" -ForegroundColor Red
    exit 1
}

$adresse    = (Get-KonfigWert -Ausdruck '(?m)^\s*firebaseBasis:\s*"([^"]*)"' -Bezeichnung "speicher.firebaseBasis").TrimEnd("/")
$pfadSchach = Get-KonfigWert -Ausdruck '(?m)^\s*schachPfad:\s*"([^"]+)"' -Bezeichnung "speicher.schachPfad"

if ($adresse -eq "") {
    Write-Host "In js\konfig.js steht keine Datenbank-Adresse." -ForegroundColor Red
    exit 1
}

# ---------------------------------------------------------------------
# Offene Runden finden
# ---------------------------------------------------------------------

$partienAdresse = "$adresse/$pfadSchach/partien.json"
$antwort = Invoke-WebRequest -Uri $partienAdresse -Method Get -UseBasicParsing -TimeoutSec $ZeitlimitSekunden
$partien = $antwort.Content | ConvertFrom-Json

$offene = @()
foreach ($eintrag in $partien.PSObject.Properties) {
    $p = $eintrag.Value
    $ergebnis = [string]$p.ergebnis
    if ($ergebnis -eq "") {
        # @($null).Count ist 1 - deshalb erst die leeren Eintraege aussieben.
        $weiss   = @($p.teams.weiss   | Where-Object { $_ }).Count
        $schwarz = @($p.teams.schwarz | Where-Object { $_ }).Count
        $offene += [pscustomobject]@{
            Id       = $eintrag.Name
            Titel    = [string]$p.titel
            Laeuft   = ($p.laeuft -eq $true)
            Weiss    = $weiss
            Schwarz  = $schwarz
            Erstellt = [DateTimeOffset]::FromUnixTimeMilliseconds([long]$p.erstelltAm).LocalDateTime.ToString("dd.MM.yyyy HH:mm")
            Version  = [string]$p.angelegtMit
        }
    }
}

$gesamt = @($partien.PSObject.Properties).Count
Write-Host ""
Write-Host "Partien in der Datenbank: $gesamt, davon nicht beendet: $($offene.Count)"

if ($offene.Count -eq 0) {
    Write-Host "Nichts zu schliessen." -ForegroundColor Green
    exit 0
}

$offene | Format-Table -AutoSize | Out-String -Width 160 | Write-Host

if ($NurAnzeigen) {
    Write-Host "Nur angezeigt - es wurde nichts geaendert."
    exit 0
}

# ---------------------------------------------------------------------
# Erst sichern, dann entfernen
# ---------------------------------------------------------------------

Write-Host "Frischer Abzug vor dem Entfernen ..."
& powershell -ExecutionPolicy Bypass -File $sicherung
if ($LASTEXITCODE -ne 0) {
    Write-Host "Der Abzug ist fehlgeschlagen - es wird nichts entfernt." -ForegroundColor Red
    exit 1
}

# Alles in EINEM Schritt: je Runde Partie und Uebersichts-Eintrag auf null
# (= loeschen), dazu die Marke. Ohne neues geaendertAm merkt kein Geraet,
# dass sich die Tafel geaendert hat (die regelmaessige Abfrage fragt nur die
# Marke). PowerShell 5.1 kennt kein JSON-null aus $null in ConvertTo-Json
# verlaesslich - deshalb wird der Text von Hand gebaut.
$jetzt  = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$teile  = @()
foreach ($runde in $offene) {
    $teile += ('"partien/{0}": null' -f $runde.Id)
    $teile += ('"uebersicht/{0}": null' -f $runde.Id)
    Write-Host "   entfernt  $($runde.Id)  $($runde.Titel)  ($($runde.Erstellt))"
}
$teile += ('"geaendertAm": {0}' -f $jetzt)
$body = "{" + ($teile -join ", ") + "}"

[void](Invoke-WebRequest -Uri "$adresse/$pfadSchach.json" -Method Patch -UseBasicParsing `
    -ContentType "application/json" -Body $body -TimeoutSec $ZeitlimitSekunden)

Write-Host ""
Write-Host "Fertig: $($offene.Count) Runde(n) geschlossen, Marke gesetzt ($jetzt)." -ForegroundColor Green
exit 0
