<#
    Sichere-Datenbank.ps1 - holt den Inhalt der Firebase-Datenbank und legt ihn
    als lesbare JSON-Dateien im Backup-Ordner ab.

    WARUM ES DAS GIBT

    Der Ordner des Projekts wird gesichert (..\..\tools\Backup-Projekt.ps1 auf
    Dev-Ebene), der Stand IN der Datenbank bisher nicht. Dort liegen aber die
    Konten, die laufenden Partien, die Chronik und damit die Rangliste - und
    die Datenbank ist offen: Ein einziges DELETE, von aussen oder aus Versehen
    beim Bauen, loescht das alles endgueltig. Das ist der einzige
    unwiederbringliche Posten des Projekts. Nachzulesen in
    docs\pruefung-app-standards.md, Abschnitt 2 ("Die fuenf wichtigsten
    Luecken", Punkt 1).

    Adresse und Ablage-Pfade werden AUS js\konfig.js gelesen und stehen hier
    bewusst nirgends noch einmal - zwei Quellen laufen garantiert irgendwann
    auseinander.

    AUFRUF (im Projektordner)

        powershell -ExecutionPolicy Bypass -File "tools\Sichere-Datenbank.ps1"

    Nur nachsehen, was geholt und wohin geschrieben wuerde (holt die Daten
    read-only, schreibt und loescht aber nichts):

        powershell -ExecutionPolicy Bypass -File "tools\Sichere-Datenbank.ps1" -NurAnzeigen

    Mehr oder weniger alte Staende aufheben (Vorgabe: 20):

        powershell -ExecutionPolicy Bypass -File "tools\Sichere-Datenbank.ps1" -Behalten 50

    ABLAGE

        ..\..\Backup\Blunderluck\datenbank\<JJJJ-MM-TT_HHmm>\spieler.json
                                                            \team-schach.json

    Jeder Lauf bekommt einen eigenen Zeitstempel-Ordner; es wird nie etwas
    ueberschrieben. Aufgeraeumt wird ausschliesslich in "datenbank" und nur bei
    Ordnern, die genau dem Zeitstempel-Muster entsprechen.

    DAS IST KEIN ERSATZ FUER EIN FIREBASE-EIGENES BACKUP.

    Es ist ein Abzug von aussen, ueber die oeffentliche REST-Schnittstelle:
    Er kennt nur die zwei freigegebenen Pfade, laeuft nur, wenn ihn jemand
    startet, und haengt an diesem Rechner und an OneDrive. Wer die Sicherung
    ernst nimmt, plant ihn als Aufgabe (taeglich) UND schaltet spaeter im
    Firebase-Blaze-Plan die eingebaute Sicherung dazu. Bis dahin gilt: lieber
    dieser Abzug als gar keiner.

    Das Skript findet seine Pfade relativ zu sich selbst.
#>

param(
    [switch]$NurAnzeigen,
    [ValidateRange(1, 1000)]
    [int]$Behalten = 20,
    [ValidateRange(5, 300)]
    [int]$ZeitlimitSekunden = 30
)

$ErrorActionPreference = "Stop"

$hier            = Split-Path -Parent $MyInvocation.MyCommand.Path
$projektOrdner   = Split-Path -Parent $hier
$projektName     = Split-Path -Leaf $projektOrdner
$devOrdner       = Split-Path -Parent (Split-Path -Parent $projektOrdner)
$sicherungWurzel = Join-Path (Join-Path (Join-Path $devOrdner "Backup") $projektName) "datenbank"

# Zeitstempel-Muster des Ablage-Ordners. Es steht an EINER Stelle, weil es
# zweierlei tut: den neuen Ordner benennen UND beim Aufraeumen entscheiden, was
# ueberhaupt geloescht werden darf.
$ordnerFormat = "yyyy-MM-dd_HHmm"
$ordnerMuster = "^\d{4}-\d{2}-\d{2}_\d{4}$"

# ---------------------------------------------------------------------
# Einstellungen aus js\konfig.js lesen
#
# Gelesen wird mit Ausdruecken, die am Zeilenanfang verankert sind: "pfad:"
# darf sich nicht an "schachPfad:" festbeissen.
# ---------------------------------------------------------------------

$konfigDatei = Join-Path $projektOrdner "js\konfig.js"

if (-not (Test-Path -LiteralPath $konfigDatei -PathType Leaf)) {
    Write-Host "js\konfig.js nicht gefunden: $konfigDatei" -ForegroundColor Red
    Write-Host "Liegt das Skript noch im tools-Ordner des Projekts?"
    exit 1
}

$konfigText = Get-Content -LiteralPath $konfigDatei -Raw

function Get-KonfigWert {
    param(
        [string]$Ausdruck,
        [string]$Bezeichnung
    )

    if ($konfigText -match $Ausdruck) {
        return $Matches[1]
    }

    Write-Host "In js\konfig.js fehlt: $Bezeichnung" -ForegroundColor Red
    exit 1
}

$version    = "?"
if ($konfigText -match 'APP_VERSION:\s*"([^"]+)"') {
    $version = $Matches[1]
}

$adresse    = Get-KonfigWert -Ausdruck '(?m)^\s*firebaseBasis:\s*"([^"]*)"' -Bezeichnung "speicher.firebaseBasis"
$pfadSpiel  = Get-KonfigWert -Ausdruck '(?m)^\s*pfad:\s*"([^"]+)"'          -Bezeichnung "speicher.pfad"
$pfadSchach = Get-KonfigWert -Ausdruck '(?m)^\s*schachPfad:\s*"([^"]+)"'    -Bezeichnung "speicher.schachPfad"

$adresse = $adresse.TrimEnd("/")

if ($adresse -eq "") {
    Write-Host "In js\konfig.js steht keine Datenbank-Adresse (firebaseBasis ist leer)." -ForegroundColor Red
    Write-Host "Ohne Adresse speichert die App nur lokal im Browser - dann gibt es nichts zu sichern."
    Write-Host "Einrichtung: docs\DEPLOYMENT.md, Abschnitt 2."
    exit 1
}

# Was gesichert wird. Die beiden Staende haben unterschiedliche Form, deshalb
# steht je Stand dabei, WAS gezaehlt wird:
#   spieler     -> { geaendertAm, spieler: [ ... ] }            (Liste)
#   team-schach -> { geaendertAm, partien: { ... }, chronik: [] } (Sammlung + Liste)
$staende = @(
    [pscustomobject]@{
        Titel         = "Spielerliste"
        Pfad          = $pfadSpiel
        Zaehlfeld     = "spieler"
        Einheit       = "Spieler"
        Zusatzfeld    = ""
        ZusatzEinheit = ""
    },
    [pscustomobject]@{
        Titel         = "Team Schach"
        Pfad          = $pfadSchach
        Zaehlfeld     = "partien"
        Einheit       = "Partien"
        Zusatzfeld    = "chronik"
        ZusatzEinheit = "Chronik-Eintraege"
    }
)

# ---------------------------------------------------------------------
# Hilfsfunktionen
# ---------------------------------------------------------------------

<#
    Rueckt rohen JSON-Text ein, OHNE ihn umzuwandeln.

    Bewusst kein ConvertFrom-Json | ConvertTo-Json: Dieser Umweg formt den
    Inhalt um (Zahlenformate, leere Sammlungen, Reihenfolge) und wuerde aus
    einer Sicherung eine Interpretation machen. Hier werden ausschliesslich
    Zeilenumbrueche und Leerzeichen eingefuegt - jedes Zeichen der Antwort
    bleibt erhalten.
#>
function Format-JsonText {
    param([string]$Text)

    $roh = $Text.Trim()
    if ($roh -eq "") {
        return ""
    }

    $einzug = "    "
    $bauer  = New-Object System.Text.StringBuilder
    $tiefe  = 0
    $inText = $false
    $flucht = $false

    for ($i = 0; $i -lt $roh.Length; $i++) {

        $z = $roh[$i]

        # Innerhalb einer Zeichenkette wird NICHTS veraendert - dort duerfen
        # Klammern, Doppelpunkte und Kommas frei vorkommen.
        if ($inText) {
            [void]$bauer.Append($z)
            if ($flucht) {
                $flucht = $false
            } elseif ($z -eq '\') {
                $flucht = $true
            } elseif ($z -eq '"') {
                $inText = $false
            }
            continue
        }

        if ([char]::IsWhiteSpace($z)) {
            continue
        }

        if ($z -eq '"') {
            $inText = $true
            [void]$bauer.Append($z)
            continue
        }

        if ($z -eq '{' -or $z -eq '[') {

            if ($z -eq '{') { $zu = '}' } else { $zu = ']' }

            # Leere Sammlung bleibt in EINER Zeile ({} statt zwei Zeilen).
            $j = $i + 1
            while ($j -lt $roh.Length -and [char]::IsWhiteSpace($roh[$j])) { $j++ }
            if ($j -lt $roh.Length -and $roh[$j] -eq $zu) {
                [void]$bauer.Append($z).Append($zu)
                $i = $j
                continue
            }

            $tiefe++
            [void]$bauer.Append($z).Append("`r`n").Append($einzug * $tiefe)
            continue
        }

        if ($z -eq '}' -or $z -eq ']') {
            $tiefe--
            if ($tiefe -lt 0) { $tiefe = 0 }
            [void]$bauer.Append("`r`n").Append($einzug * $tiefe).Append($z)
            continue
        }

        if ($z -eq ',') {
            [void]$bauer.Append(',').Append("`r`n").Append($einzug * $tiefe)
            continue
        }

        if ($z -eq ':') {
            [void]$bauer.Append(': ')
            continue
        }

        [void]$bauer.Append($z)
    }

    return $bauer.ToString()
}

# Holt einen Pfad der Datenbank als rohen Text. Wirft bei jedem Fehler.
function Get-DatenbankStand {
    param([string]$Pfad)

    $ziel = "$adresse/$Pfad.json"

    $antwort = Invoke-WebRequest -Uri $ziel -Method Get -UseBasicParsing `
                                 -TimeoutSec $ZeitlimitSekunden

    # Bewusst ueber die rohen Bytes: Wenn Firebase keinen Zeichensatz meldet,
    # raet PowerShell - und aus einem Namen mit Umlaut wird Zeichensalat.
    $bytes = $null
    if ($antwort.RawContentStream) {
        $bytes = $antwort.RawContentStream.ToArray()
    }

    if ($bytes -and $bytes.Length -gt 0) {
        return [System.Text.Encoding]::UTF8.GetString($bytes)
    }

    return [string]$antwort.Content
}

# Zaehlt die Eintraege eines Feldes - egal ob Liste (spieler, chronik) oder
# Sammlung mit Kennungen als Namen (partien). $null heisst "nicht zaehlbar".
function Get-Anzahl {
    param($Wert)

    if ($null -eq $Wert) {
        return 0
    }

    if ($Wert -is [System.Array]) {
        return $Wert.Count
    }

    if ($Wert -is [System.Management.Automation.PSCustomObject]) {
        return @($Wert.PSObject.Properties).Count
    }

    return $null
}

# ---------------------------------------------------------------------
# Holen
#
# ERST beide Staende holen, DANN schreiben. Bricht der zweite Abruf ab,
# entsteht gar kein Ordner - eine halbe Sicherung waere gefaehrlicher als
# keine, weil sie im Backup-Ordner wie eine ganze aussieht.
# ---------------------------------------------------------------------

Write-Host ""
Write-Host "$projektName v$version - Sicherung der Datenbank" -ForegroundColor Cyan
Write-Host "Quelle: $adresse"

# Firebase spricht nur TLS 1.2; PowerShell 5.1 bietet von sich aus teils noch
# das alte TLS 1.0 an und laeuft dann in einen unverstaendlichen Verbindungsfehler.
try {
    [System.Net.ServicePointManager]::SecurityProtocol =
        [System.Net.ServicePointManager]::SecurityProtocol -bor [System.Net.SecurityProtocolType]::Tls12
} catch {
    # Aeltere .NET-Fassungen kennen den Wert nicht - dann bleibt es beim Standard.
}

$ergebnisse = New-Object System.Collections.Generic.List[object]

foreach ($stand in $staende) {

    try {
        $rohText = Get-DatenbankStand -Pfad $stand.Pfad
    } catch {
        Write-Host ""
        Write-Host "Der Pfad '$($stand.Pfad)' liess sich nicht holen: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "Moegliche Ursachen:"
        Write-Host "   - keine Internet-Verbindung oder Zeitlimit ($ZeitlimitSekunden s) ueberschritten"
        Write-Host "   - die Adresse in js\konfig.js stimmt nicht mehr"
        Write-Host "   - 'Permission denied': die Firebase-Regeln geben diesen Pfad nicht zum Lesen frei"
        Write-Host "     (docs\DEPLOYMENT.md, Abschnitt 2 - jeder Pfad braucht dort seinen eigenen Eintrag)"
        Write-Host "Es wurde nichts geschrieben." -ForegroundColor Yellow
        exit 1
    }

    $schoen = Format-JsonText -Text $rohText
    $bytes  = [System.Text.Encoding]::UTF8.GetByteCount($schoen)

    # Zaehlen ist nur fuer die Ausgabe. Scheitert es, wird trotzdem gesichert -
    # die Datei ist das Wichtige, die Zahl nur die Beruhigung.
    $anzahl = $null
    $zusatz = $null
    $leer   = ($rohText.Trim() -eq "null" -or $rohText.Trim() -eq "")

    if (-not $leer) {
        try {
            $objekt = $rohText | ConvertFrom-Json
            $anzahl = Get-Anzahl -Wert $objekt.($stand.Zaehlfeld)
            if ($stand.Zusatzfeld -ne "") {
                $zusatz = Get-Anzahl -Wert $objekt.($stand.Zusatzfeld)
            }
        } catch {
            $anzahl = $null
        }
    }

    # Der Dateiname folgt dem Pfad aus konfig.js. Schraegstriche eines
    # verschachtelten Pfades wuerden sonst als Unterordner gelesen.
    $dateiName = ($stand.Pfad -replace "[\\/]", "-") + ".json"

    $ergebnisse.Add([pscustomobject]@{
        Titel     = $stand.Titel
        Pfad      = $stand.Pfad
        DateiName = $dateiName
        Inhalt    = $schoen
        Bytes     = $bytes
        Anzahl    = $anzahl
        Zusatz    = $zusatz
        Einheit   = $stand.Einheit
        ZusatzEinheit = $stand.ZusatzEinheit
        Leer      = $leer
    })
}

# ---------------------------------------------------------------------
# Bericht
# ---------------------------------------------------------------------

$zeitstempel = Get-Date -Format $ordnerFormat
$zielOrdner  = Join-Path $sicherungWurzel $zeitstempel

Write-Host "Ziel:   $zielOrdner"
Write-Host ""

$etwasLeer = $false

foreach ($e in $ergebnisse) {

    $groesse = "{0:N1} KB" -f ($e.Bytes / 1KB)

    if ($e.Leer) {
        $menge = "LEER"
    } elseif ($null -eq $e.Anzahl) {
        $menge = "Anzahl unbekannt"
    } else {
        $menge = "$($e.Anzahl) $($e.Einheit)"
        if ($null -ne $e.Zusatz -and $e.ZusatzEinheit -ne "") {
            $menge += ", $($e.Zusatz) $($e.ZusatzEinheit)"
        }
    }

    Write-Host ("   {0,-14} {1,-12} {2,10}  {3}" -f $e.Pfad, $e.DateiName, $groesse, $menge)

    if ($e.Leer) {
        $etwasLeer = $true
    }
}

if ($etwasLeer) {
    Write-Host ""
    Write-Host "ACHTUNG: Mindestens ein Pfad hat 'null' geliefert - dort steht NICHTS." -ForegroundColor Red
    Write-Host "Das heisst entweder: die Datenbank ist an dieser Stelle wirklich leer,"
    Write-Host "oder der Pfad in js\konfig.js zeigt ins Nichts (Tippfehler, umbenannt)."
    Write-Host "Eine leere Sicherung ist wertlos - bitte nachsehen, BEVOR man sich auf sie verlaesst:"
    foreach ($e in $ergebnisse) {
        if ($e.Leer) {
            Write-Host "   $adresse/$($e.Pfad).json"
        }
    }
}

# ---------------------------------------------------------------------
# Aufraeumen vorbereiten (gilt fuer Anzeige und echten Lauf gleich)
# ---------------------------------------------------------------------

function Get-AlteStaende {
    if (-not (Test-Path -LiteralPath $sicherungWurzel -PathType Container)) {
        return @()
    }

    # Nur Ordner direkt in "datenbank" und nur mit Zeitstempel-Namen. Alles
    # andere - eigene Notizen, fremde Ordner - wird nie angefasst.
    return @(Get-ChildItem -LiteralPath $sicherungWurzel -Directory |
             Where-Object { $_.Name -match $ordnerMuster } |
             Sort-Object -Property Name -Descending)
}

if ($NurAnzeigen) {
    Write-Host ""

    # Die Klammern @( ) sind Absicht: PowerShell macht aus einer leeren
    # Rueckgabe sonst $null, und dann gibt es keine .Count.
    $vorhanden = @(Get-AlteStaende)
    Write-Host "Vorhandene Staende: $($vorhanden.Count) (behalten wuerden: $Behalten)"
    if ($vorhanden.Count + 1 -gt $Behalten) {
        $wuerdenWeg = @($vorhanden | Select-Object -Skip ($Behalten - 1))
        foreach ($alt in $wuerdenWeg) {
            Write-Host "   wuerde geloescht: $($alt.Name)" -ForegroundColor Yellow
        }
    }

    Write-Host ""
    Write-Host "Nur angezeigt - es wurde nichts geschrieben und nichts geloescht." -ForegroundColor Yellow
    exit 0
}

# ---------------------------------------------------------------------
# Schreiben
# ---------------------------------------------------------------------

if (Test-Path -LiteralPath $zielOrdner) {
    Write-Host ""
    Write-Host "Es gibt schon einen Ordner fuer diese Minute: $zielOrdner" -ForegroundColor Yellow
    Write-Host "Nichts ueberschrieben. Eine Minute warten und erneut starten."
    exit 1
}

New-Item -ItemType Directory -Path $zielOrdner -Force | Out-Null

foreach ($e in $ergebnisse) {
    $datei = Join-Path $zielOrdner $e.DateiName
    [System.IO.File]::WriteAllText($datei, $e.Inhalt, [System.Text.UTF8Encoding]::new($false))
}

Write-Host ""
Write-Host "Gesichert nach: $zielOrdner" -ForegroundColor Green

# ---------------------------------------------------------------------
# Aufraeumen
# ---------------------------------------------------------------------

$alle = @(Get-AlteStaende)

if ($alle.Count -gt $Behalten) {

    $weg      = @($alle | Select-Object -Skip $Behalten)
    $entfernt = 0

    foreach ($alt in $weg) {

        # Doppelt geprueft, weil hier geloescht wird: richtiger Elternordner
        # UND richtiger Name. Lieber einmal zu viel nachsehen.
        if ($alt.Parent.FullName -ne $sicherungWurzel -or $alt.Name -notmatch $ordnerMuster) {
            continue
        }

        Remove-Item -LiteralPath $alt.FullName -Recurse -Force
        $entfernt++
        Write-Host "   entfernt: $($alt.Name)"
    }

    Write-Host "Aufgeraeumt: $entfernt alte Staende entfernt, $Behalten bleiben."
} else {
    Write-Host "Aufgeraeumt: nichts zu tun ($($alle.Count) von hoechstens $Behalten Staenden)."
}

exit 0
