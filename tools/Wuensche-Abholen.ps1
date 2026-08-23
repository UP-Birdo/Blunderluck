#requires -Version 7.0
<#
.SYNOPSIS
    Holt offene Wuensche von GitHub und traegt sie in TODO.md ein.

.DESCRIPTION
    Gegenstueck zum Wunsch-Knopf in der App. Der Weg eines Wunsches:

        App  ->  vorbefuelltes GitHub-Formular  ->  Eintrag im Repo
             ->  DIESES SKRIPT  ->  TODO.md "## Anfragen"
             ->  Nutzer schreibt "bestaetigt" dahinter  ->  ROADMAP.md

    Die Anfragen landen bewusst UEBER dem Abschnitt "Neu": Sie sind noch nicht
    angenommen. Erst wenn hinter einer Zeile das Wort "bestaetigt" steht, wird
    sie beim naechsten Triagieren eingeordnet und priorisiert.

    Lesen braucht KEINEN Zugangsschluessel, solange das Repo oeffentlich ist
    (GitHub erlaubt 60 anonyme Abfragen je Stunde). Nur das Schliessen eines
    erledigten Eintrags braucht einen Token — dafuer wird derselbe benutzt wie
    beim Deploy (tools\Deploy-Blunderluck.ps1 -SetToken).

    Doppelte Eintraege sind ausgeschlossen: Jede Zeile traegt die Nummer des
    GitHub-Eintrags als [#12]. Was in TODO.md schon steht, wird uebersprungen —
    auch dann, wenn der Punkt bereits unter "## Erledigt" liegt.

    Pfade relativ zu diesem Skript (Haus-Regel).

.PARAMETER Zeigen
    Nur anzeigen, was uebernommen wuerde. Schreibt nichts.

.PARAMETER Schliessen
    Nummern der Eintraege, die auf GitHub geschlossen werden sollen.

.EXAMPLE
    .\tools\Wuensche-Abholen.ps1 -Zeigen
    .\tools\Wuensche-Abholen.ps1
    .\tools\Wuensche-Abholen.ps1 -Schliessen 12,14
#>
[CmdletBinding()]
param(
    [switch] $Zeigen,
    [int[]]  $Schliessen
)

$ErrorActionPreference = "Stop"

$hier          = Split-Path -Parent $MyInvocation.MyCommand.Path
$projektOrdner = Split-Path -Parent $hier
$todoDatei     = Join-Path $projektOrdner "TODO.md"
$tokenDatei    = Join-Path $hier "github-token.dat"

$Besitzer   = "up-birdo"
$Repository = "Blunderluck"

# ---------------------------------------------------------------------
# Hilfsmittel
# ---------------------------------------------------------------------

function Token-Lesen {
    if (-not (Test-Path -LiteralPath $tokenDatei)) {
        throw "Kein Token hinterlegt. Einmalig anlegen mit: tools\Deploy-Blunderluck.ps1 -SetToken"
    }

    $verschluesselt = [System.IO.File]::ReadAllText($tokenDatei).Trim()
    $sicher = ConvertTo-SecureString -String $verschluesselt
    return [System.Net.NetworkCredential]::new("", $sicher).Password
}

function Anfragen-Holen {
    $adresse = "https://api.github.com/repos/$Besitzer/$Repository/issues?state=open&per_page=100"
    $kopf = @{ "Accept" = "application/vnd.github+json"; "User-Agent" = "Blunderluck-Wuensche" }

    try {
        return Invoke-RestMethod -Uri $adresse -Headers $kopf -TimeoutSec 30
    } catch {
        throw "GitHub nicht erreichbar: $($_.Exception.Message)"
    }
}

# Zieht aus dem Formular-Text die eigentliche Idee heraus.
function Idee-Auslesen {
    param([string] $Rumpf)

    if (-not $Rumpf) { return "" }

    # Das Formular liefert Abschnitte als "### Ueberschrift" gefolgt vom Text.
    $zeilen = $Rumpf -split "`r?`n"
    $sammeln = $false
    $text = @()

    foreach ($zeile in $zeilen) {
        if ($zeile -match "^###\s") {
            $sammeln = ($zeile -match "wünschst|wunschst|Was")
            continue
        }
        if ($sammeln -and $zeile.Trim() -ne "" -and $zeile.Trim() -ne "_No response_") {
            $text += $zeile.Trim()
        }
    }

    if ($text.Count -eq 0) {
        # Kein Formular — dann der ganze Rumpf, auf eine Zeile gebracht.
        return ($Rumpf -replace "`r?`n", " ").Trim()
    }
    return ($text -join " ")
}

# ---------------------------------------------------------------------
# Schliessen (eigener Weg, schreibt nichts in TODO.md)
# ---------------------------------------------------------------------

if ($Schliessen) {
    $token = Token-Lesen
    $kopf = @{
        "Accept"        = "application/vnd.github+json"
        "Authorization" = "Bearer $token"
        "User-Agent"    = "Blunderluck-Wuensche"
    }

    foreach ($nummer in $Schliessen) {
        $adresse = "https://api.github.com/repos/$Besitzer/$Repository/issues/$nummer"
        $koerper = @{ state = "closed" } | ConvertTo-Json

        try {
            Invoke-RestMethod -Uri $adresse -Method Patch -Headers $kopf -Body $koerper `
                              -ContentType "application/json" | Out-Null
            Write-Host "Eintrag #$nummer geschlossen." -ForegroundColor Green
        } catch {
            # 403 heisst hier fast immer: Der Token darf Dateien schreiben
            # (dafuer wurde er angelegt), aber keine Eintraege aendern. Das ist
            # kein Fehler im Skript, sondern eine Einstellung auf GitHub.
            if ($_.Exception.Response -and $_.Exception.Response.StatusCode.value__ -eq 403) {
                Write-Host "Eintrag #$nummer NICHT geschlossen: Der Token darf keine Eintraege aendern." -ForegroundColor Yellow
                Write-Host "  Abhilfe: auf github.com im Token die Berechtigung 'Issues: Read and write' ergaenzen," -ForegroundColor Yellow
                Write-Host "  danach 'tools\Deploy-Blunderluck.ps1 -SetToken' erneut ausfuehren. Oder den Eintrag von Hand schliessen." -ForegroundColor Yellow
                Write-Host "  Das Abholen ist davon nicht betroffen - es braucht keinen Token." -ForegroundColor Yellow
            } else {
                Write-Host "Eintrag #$nummer NICHT geschlossen: $($_.Exception.Message)" -ForegroundColor Red
            }
        }
    }
    exit 0
}

# ---------------------------------------------------------------------
# Holen und eintragen
# ---------------------------------------------------------------------

# ACHTUNG, stille Falle (gefunden am 2026-08-03, drei Wuensche lagen unbemerkt
# auf GitHub):
#
#     Anfragen-Holen | Where-Object { -not $_.pull_request }      # FALSCH
#
# Invoke-RestMethod gibt eine JSON-Liste als EIN Objekt aus, nicht als drei.
# Direkt in eine Pipeline geschickt kommt deshalb genau ein Wert an: das ganze
# Array. $_.pull_request laeuft dann als Member-Zugriff ueber alle Elemente und
# liefert @($null, $null, $null) - ein nicht leeres Array und damit "wahr",
# also filtert -not alles weg. Das Ergebnis ist $null, und das Skript meldet
# seelenruhig "Keine offenen Wuensche".
#
# Der Umweg ueber die Variable loest es: Eine Variable wird in der Pipeline
# immer entrollt. Das @(...) haelt Count auch bei null und einem Treffer richtig.
$roh = Anfragen-Holen
$anfragen = @($roh | Where-Object { -not $_.pull_request })

if ($anfragen.Count -eq 0) {
    Write-Host "Keine offenen Wuensche." -ForegroundColor Green
    exit 0
}

$todoText = [System.IO.File]::ReadAllText($todoDatei)
$neue = @()

# STILLE FALLE NUMMER ZWEI (gefunden am 2026-08-13, Eintrag #12 lag drei Tage
# unbemerkt auf GitHub):
#
#     if ($todoText.Contains($marke)) { continue }      # FALSCH
#
# Die Marke wurde IRGENDWO in der Datei gesucht - auch im Erklaertext. In der
# TODO.md steht aber seit jeher der Satz "erkennbar an [#12]" als BEISPIEL.
# Sobald es auf GitHub wirklich einen Eintrag #12 gab, hielt das Skript ihn
# fuer laengst eingetragen und uebersprang ihn stillschweigend.
#
# Gesucht wird deshalb nur noch am ANFANG einer Listenzeile - also genau in der
# Form, in der dieses Skript seine Eintraege selbst schreibt ("- [#12] ...").
# Ein Beispiel im Fliesstext kann damit nie wieder einen echten Wunsch
# verschlucken.
function Steht-Schon-Drin {
    param([string] $Text, [int] $Nummer)

    return $Text -match ("(?m)^\s*-\s*\[#" + $Nummer + "\]")
}

foreach ($anfrage in $anfragen) {
    $marke = "[#$($anfrage.number)]"

    if (Steht-Schon-Drin -Text $todoText -Nummer $anfrage.number) {
        continue
    }

    $idee = Idee-Auslesen -Rumpf $anfrage.body
    if (-not $idee) { $idee = $anfrage.title }

    $neue += [PSCustomObject]@{
        Nummer = $anfrage.number
        Text   = $idee
        Von    = $anfrage.user.login
        Marke  = $marke
    }
}

if ($neue.Count -eq 0) {
    Write-Host "Nichts Neues — alle $($anfragen.Count) offenen Wuensche stehen schon in TODO.md." -ForegroundColor Green
    exit 0
}

Write-Host "$($neue.Count) neue(r) Wunsch/Wuensche:" -ForegroundColor Cyan
foreach ($eintrag in $neue) {
    Write-Host "   $($eintrag.Marke) $($eintrag.Text)"
}

if ($Zeigen) {
    Write-Host ""
    Write-Host "Nur angezeigt - es wurde nichts geschrieben." -ForegroundColor Yellow
    exit 0
}

# Zeilen bauen und ueber "## Neu" einsetzen.
$zeilen = foreach ($eintrag in $neue) {
    "- $($eintrag.Marke) $($eintrag.Text) — von $($eintrag.Von)"
}

$abschnitt = "## Anfragen"

if ($todoText.Contains($abschnitt)) {
    # ANS ENDE des Abschnitts, nicht direkt unter die Ueberschrift: Darunter
    # steht der erklaerende Absatz ("erst mit dem Wort bestaetigt ..."), und
    # den wuerde ein Eintrag davor zerreissen. Gesucht wird deshalb die
    # naechste Ueberschrift danach.
    $start  = $todoText.IndexOf($abschnitt) + $abschnitt.Length
    $naechste = $todoText.IndexOf("`n## ", $start)
    if ($naechste -lt 0) { $naechste = $todoText.Length }

    $bisher = $todoText.Substring($start, $naechste - $start)

    # Der Platzhalter verschwindet, sobald etwas Echtes dasteht.
    $bisher = $bisher -replace "(?m)^-\s*\(noch nichts\)\s*$", ""
    $bisher = $bisher.TrimEnd()

    # Nach Fliesstext braucht die Liste eine Leerzeile, hinter einem
    # vorhandenen Listenpunkt nicht - sonst reisst der Absatz auseinander.
    $letzte = ($bisher -split "`r?`n")[-1]
    $trenner = if ($letzte -match "^\s*-\s") { "`n" } else { "`n`n" }

    $bisher = $bisher + $trenner + ($zeilen -join "`n") + "`n"

    $todoText = $todoText.Remove($start, $naechste - $start).Insert($start, $bisher)
} else {
    # Abschnitt anlegen, direkt ueber "## Neu".
    $vorNeu = $todoText.IndexOf("## Neu")
    if ($vorNeu -lt 0) {
        throw "In TODO.md fehlt der Abschnitt '## Neu' — bitte pruefen."
    }

    $kopfzeilen = @(
        $abschnitt
        ""
        "Kommt vom Wunsch-Knopf in der App (ueber GitHub). Noch nicht angenommen:"
        "Erst wenn hinter einer Zeile **bestaetigt** steht, wird sie eingeordnet"
        "und priorisiert."
        ""
    ) -join "`n"

    $todoText = $todoText.Insert($vorNeu, $kopfzeilen + ($zeilen -join "`n") + "`n`n")
}

$ohneBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($todoDatei, $todoText, $ohneBom)

Write-Host ""
Write-Host "In TODO.md unter '## Anfragen' eingetragen." -ForegroundColor Green
Write-Host "Schreib 'bestaetigt' hinter die Zeilen, die umgesetzt werden sollen." -ForegroundColor Green
