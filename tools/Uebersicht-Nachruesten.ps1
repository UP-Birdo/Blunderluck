<#
    Uebersicht-Nachruesten.ps1 - legt fuer jede Partie in der Datenbank den
    Uebersichts-Eintrag an, der seit v0.114.3 neben ihr liegt (uebersicht/<id>:
    Ergebnis, laeuft, Zeitstempel, Teams - rund 150 Byte).

    WARUM ES DAS GIBT

    Die App liest seit v0.114.3 nicht mehr die ganze Tafel (192 KB), sondern
    zuerst die Uebersicht (5 KB) und holt dann nur die Partien, die sie
    braucht. Partien OHNE Eintrag (aus der Zeit davor) holt sie einmal und
    traegt den Eintrag selbst nach - das hier ist also kein Muss. Es macht
    den ersten Start nach der Umstellung schneller und ist zugleich der
    Nachweis, dass eine Mehrpfad-Aenderung (PATCH) gegen die echte Datenbank
    funktioniert. Auch nach dem Zurueckspielen einer Sicherung (die Sicherung
    enthaelt die Uebersicht mit; ein aelterer Abzug nicht) ist es der Weg.

    WAS ES TUT

      1. Holt alle Partien und die vorhandene Uebersicht.
      2. Baut fuer jede Partie ohne Eintrag den Eintrag - Zeitstempel ist
         geaendertAm der Partie (so wie es SCHACH_TAFEL.uebersichtEintrag
         ohne Angabe tut).
      3. Schreibt alle fehlenden Eintraege in EINER PATCH-Anfrage an den
         Schach-Knoten. Die Marke (geaendertAm der Tafel) wird NICHT
         angefasst: Am Inhalt der Partien aendert sich nichts.

    Vorhandene Eintraege werden nie ueberschrieben (-Erneuern tut es doch).

    AUFRUF (im Projektordner)

        powershell -ExecutionPolicy Bypass -File "tools\Uebersicht-Nachruesten.ps1" -NurAnzeigen
        powershell -ExecutionPolicy Bypass -File "tools\Uebersicht-Nachruesten.ps1"
#>

param(
    [switch]$NurAnzeigen,
    [switch]$Erneuern,
    [ValidateRange(5, 300)]
    [int]$ZeitlimitSekunden = 30
)

$ErrorActionPreference = "Stop"

$hier          = Split-Path -Parent $MyInvocation.MyCommand.Path
$projektOrdner = Split-Path -Parent $hier
$konfigDatei   = Join-Path $projektOrdner "js\konfig.js"

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

function Hole-Knoten {
    param([string]$Unterpfad)
    $antwort = Invoke-WebRequest -Uri "$adresse/$pfadSchach/$Unterpfad.json" -Method Get -UseBasicParsing -TimeoutSec $ZeitlimitSekunden
    if ($antwort.Content -eq "null") {
        return $null
    }
    return ($antwort.Content | ConvertFrom-Json)
}

$partien    = Hole-Knoten "partien"
$uebersicht = Hole-Knoten "uebersicht"

if ($null -eq $partien) {
    Write-Host "Keine Partien in der Datenbank - nichts zu tun."
    exit 0
}

$vorhanden = @{}
if ($null -ne $uebersicht) {
    foreach ($e in $uebersicht.PSObject.Properties) {
        $vorhanden[$e.Name] = $true
    }
}

# Die Eintraege bauen. Teams als Listen, auch wenn ein Team fehlt.
$aenderungen = [ordered]@{}
$uebersprungen = 0

foreach ($eintrag in $partien.PSObject.Properties) {
    $id = $eintrag.Name
    $p  = $eintrag.Value

    if ($vorhanden.ContainsKey($id) -and -not $Erneuern) {
        $uebersprungen++
        continue
    }

    $weiss   = @($p.teams.weiss   | Where-Object { $_ })
    $schwarz = @($p.teams.schwarz | Where-Object { $_ })
    $zeit    = 0
    if ($p.geaendertAm -is [long] -or $p.geaendertAm -is [int] -or $p.geaendertAm -is [double]) {
        $zeit = [long]$p.geaendertAm
    }

    $aenderungen["uebersicht/$id"] = [ordered]@{
        ergebnis    = [string]$p.ergebnis
        laeuft      = ($p.laeuft -eq $true)
        geaendertAm = $zeit
        teams       = [ordered]@{ weiss = $weiss; schwarz = $schwarz }
    }
}

$gesamt = @($partien.PSObject.Properties).Count
Write-Host ""
Write-Host "Partien: $gesamt, mit Eintrag: $uebersprungen, nachzutragen: $($aenderungen.Count)"

if ($aenderungen.Count -eq 0) {
    Write-Host "Nichts nachzutragen." -ForegroundColor Green
    exit 0
}

foreach ($weg in $aenderungen.Keys) {
    $e = $aenderungen[$weg]
    "   {0,-22} ergebnis={1,-8} laeuft={2,-5} weiss={3} schwarz={4}" -f $weg, $e.ergebnis, $e.laeuft, ($e.teams.weiss.Count), ($e.teams.schwarz.Count) | Write-Host
}

if ($NurAnzeigen) {
    Write-Host "Nur angezeigt - es wurde nichts geschrieben."
    exit 0
}

# Leere Listen muessen als [] ankommen - ConvertTo-Json macht aus einem
# leeren Array sonst nichts Brauchbares; Firebase laesst leere Listen ohnehin
# weg, der Lader liest fehlende Teams als leer (SCHACH_SPEICHER._sitztDarin).
$body = $aenderungen | ConvertTo-Json -Depth 6 -Compress

[void](Invoke-WebRequest -Uri "$adresse/$pfadSchach.json" -Method Patch -UseBasicParsing `
    -ContentType "application/json" -Body $body -TimeoutSec $ZeitlimitSekunden)

# Nachkontrolle: Die Uebersicht muss jetzt jede Partie kennen.
$danach = Hole-Knoten "uebersicht"
$fehlend = @()
foreach ($eintrag in $partien.PSObject.Properties) {
    if ($null -eq $danach -or -not ($danach.PSObject.Properties.Name -contains $eintrag.Name)) {
        $fehlend += $eintrag.Name
    }
}

Write-Host ""
if ($fehlend.Count -eq 0) {
    Write-Host "Fertig: $($aenderungen.Count) Eintrag/Eintraege nachgetragen, Nachkontrolle in Ordnung." -ForegroundColor Green
    exit 0
}

Write-Host "Nach dem Schreiben fehlen noch: $($fehlend -join ', ')" -ForegroundColor Red
exit 1
