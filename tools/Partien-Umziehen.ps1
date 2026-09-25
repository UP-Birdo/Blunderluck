<#
    Partien-Umziehen.ps1 - zieht die Schach-Partien aus der ALTEN
    Blunderluck-Datenbank in den Blunderluck-Bereich der UPCrew-Datenbank.

    WARUM ES DAS GIBT

    Seit v0.138.0 liegt alles in der UPCrew-Datenbank (Nutzer-Entscheidung
    25.09.2026: "nur noch EINE Datenbank"). Die KONTEN ziehen von selbst um:
    Wer sich anmeldet, bekommt sein UPCrew-Konto (js\anmeldung.js). Die
    PARTIEN, die Uebersicht und die Chronik (Rangliste!) zieht dieses Werkzeug
    um - einmal, bevor die neue Fassung ausgeliefert wird. Danach wird es
    nicht mehr gebraucht; es darf aber jederzeit noch einmal laufen.

    WAS ES TUT

      1. liest beide Staende (nur lesen) und zeigt, was fehlt;
      2. sichert beide Staende als Datei (..\..\Backup\Blunderluck\umzug\<Zeit>\);
      3. fragt: Erst wer UMZIEHEN eintippt, loest das Schreiben aus;
      4. kopiert NUR, was im neuen Bereich fehlt oder dort aelter ist -
         mehrfach lauffaehig, nichts doppelt, nichts Neueres ueberschrieben.

    Der Inhalt wird als ROHER TEXT uebertragen, nie umgewandelt
    (ConvertFrom-Json | ConvertTo-Json formte Zahlen, leere Listen und
    einzelne Listen-Eintraege um). Umgewandelt wird nur, um zu ENTSCHEIDEN,
    was fehlt.

    DIE ANMELDUNG: Solange die Uebergangs-Regeln gelten (SICHERHEIT.md, 2b),
    darf das Werkzeug ohne Anmeldung schreiben. Gelten die endgueltigen
    Regeln schon, antwortet die Datenbank "Permission denied" - dann fragt
    das Werkzeug nach Name und Passwort eines UPCrew-Kontos und versucht es
    angemeldet noch einmal. Das Passwort geht nur an Firebase.

    AUFRUF (im Projektordner)

        powershell -ExecutionPolicy Bypass -File "tools\Partien-Umziehen.ps1"

    Nur ansehen, nichts schreiben:

        powershell -ExecutionPolicy Bypass -File "tools\Partien-Umziehen.ps1" -NurAnzeigen
#>

param(
    [switch]$NurAnzeigen,
    [ValidateRange(5, 300)]
    [int]$ZeitlimitSekunden = 30
)

$ErrorActionPreference = "Stop"

$hier          = Split-Path -Parent $MyInvocation.MyCommand.Path
$projektOrdner = Split-Path -Parent $hier
$projektName   = Split-Path -Leaf $projektOrdner
$devOrdner     = Split-Path -Parent (Split-Path -Parent $projektOrdner)
$ablageWurzel  = Join-Path (Join-Path (Join-Path $devOrdner "Backup") $projektName) "umzug"

# Der alte Schach-Pfad. Er steht nicht mehr in konfig.js (dort steht seit
# v0.138.0 der neue) - in der alten Datenbank hiess er immer so.
$altSchachPfad = "team-schach"

# ---------------------------------------------------------------------
# Einstellungen aus js\konfig.js
# ---------------------------------------------------------------------

$konfigText = Get-Content -LiteralPath (Join-Path $projektOrdner "js\konfig.js") -Raw -Encoding UTF8

function Get-KonfigWert {
    param([string]$Ausdruck, [string]$Bezeichnung)
    if ($konfigText -match $Ausdruck) {
        return $Matches[1]
    }
    Write-Host "In js\konfig.js fehlt: $Bezeichnung" -ForegroundColor Red
    exit 1
}

$neuBasis   = (Get-KonfigWert '(?m)^\s*firebaseBasis:\s*"([^"]+)"' "speicher.firebaseBasis").TrimEnd("/")
$neuPfad    = Get-KonfigWert '(?m)^\s*schachPfad:\s*"([^"]+)"' "speicher.schachPfad"
$altBasis   = (Get-KonfigWert '(?m)^\s*altBasis:\s*"([^"]*)"' "konto.altBasis").TrimEnd("/")
$apiKey     = Get-KonfigWert '(?m)^\s*apiKey:\s*"([^"]+)"' "konto.apiKey"
$domain     = Get-KonfigWert '(?m)^\s*domain:\s*"([^"]+)"' "konto.domain"

if ($altBasis -eq "") {
    Write-Host "konto.altBasis ist leer - die alte Datenbank ist schon abgemeldet. Nichts zu tun." -ForegroundColor Yellow
    exit 0
}
if ($altBasis -eq $neuBasis) {
    Write-Host "Alte und neue Datenbank sind dieselbe - konfig.js pruefen." -ForegroundColor Red
    exit 1
}

try {
    [System.Net.ServicePointManager]::SecurityProtocol =
        [System.Net.ServicePointManager]::SecurityProtocol -bor [System.Net.SecurityProtocolType]::Tls12
} catch {
}

# ---------------------------------------------------------------------
# Netz
# ---------------------------------------------------------------------

$script:idToken = ""

function Get-RohText {
    param([string]$Adresse)
    $antwort = Invoke-WebRequest -Uri $Adresse -Method Get -UseBasicParsing -TimeoutSec $ZeitlimitSekunden
    $bytes = $antwort.RawContentStream.ToArray()
    return [System.Text.Encoding]::UTF8.GetString($bytes)
}

function Get-Knoten {
    param([string]$Basis, [string]$Pfad, [switch]$Flach)
    $ziel = "$Basis/$Pfad.json"
    if ($Flach) {
        $ziel += "?shallow=true"
    }
    return Get-RohText -Adresse $ziel
}

function Send-Aenderungen {
    param([string]$KoerperText)
    $ziel = "$neuBasis/$neuPfad.json"
    if ($script:idToken -ne "") {
        $ziel += "?auth=" + [uri]::EscapeDataString($script:idToken)
    }
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($KoerperText)
    Invoke-WebRequest -Uri $ziel -Method Patch -Body $bytes `
        -ContentType "application/json; charset=utf-8" -UseBasicParsing `
        -TimeoutSec $ZeitlimitSekunden | Out-Null
}

# Anmelden mit einem UPCrew-Konto (nur, wenn die Regeln es verlangen).
function Connect-UpcrewKonto {
    Write-Host ""
    Write-Host "Die Datenbank verlangt eine Anmeldung (endgueltige Regeln gelten schon)." -ForegroundColor Yellow
    $eingabe = Read-Host "Dein UPCrew-Konto (Name#Nummer, z. B. Jonas#0001)"
    $sicher = Read-Host "Passwort" -AsSecureString
    $zeiger = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sicher)
    try {
        $passwort = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($zeiger)
    } finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($zeiger)
    }

    # Name#Nummer wie in der App (js\konto.js, KONTO.suchen).
    $teile = $eingabe.Trim().Split("#")
    $name = $teile[0]
    $tag = if ($teile.Count -gt 1) { $teile[1] } else { "" }
    $konten = (Get-Knoten -Basis $neuBasis -Pfad "spieler/konten") | ConvertFrom-Json
    $treffer = @()
    if ($konten) {
        foreach ($eintrag in $konten.PSObject.Properties) {
            $v = $eintrag.Value
            if ([string]$v.name -ieq $name -and ($tag -eq "" -or [string]$v.tag -ieq $tag)) {
                $treffer += $v
            }
        }
    }
    if ($treffer.Count -ne 1) {
        Write-Host "Kein eindeutiges UPCrew-Konto dazu. Mit Nummer eingeben, z. B. Jonas#0001." -ForegroundColor Red
        exit 1
    }
    $kennung = if ($treffer[0].kennung) { [string]$treffer[0].kennung } else { [string]$treffer[0].id }

    # Seit v0.138.0 ohne Zutat vor dem Passwort. Der API-Schluessel ist auf die
    # UPCrew-Seiten beschraenkt - deshalb die Seiten-Angabe (Referer).
    $koerper = @{
        email = ($kennung.ToLower() + "@" + $domain)
        password = $passwort
        returnSecureToken = $true
    } | ConvertTo-Json
    try {
        $antwort = Invoke-RestMethod -Method Post `
            -Uri ("https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=" + $apiKey) `
            -Headers @{ Referer = "https://up-birdo.github.io/" } `
            -ContentType "application/json" -Body ([Text.Encoding]::UTF8.GetBytes($koerper)) `
            -TimeoutSec $ZeitlimitSekunden
    } catch {
        Write-Host "Anmeldung abgelehnt (Passwort falsch?)." -ForegroundColor Red
        exit 1
    }
    $script:idToken = [string]$antwort.idToken
    Write-Host "Angemeldet." -ForegroundColor Green
}

# ---------------------------------------------------------------------
# 1. Lesen und vergleichen
# ---------------------------------------------------------------------

Write-Host ""
Write-Host "$projektName - Partien in die UPCrew-Datenbank umziehen" -ForegroundColor Cyan
Write-Host "Von:  $altBasis/$altSchachPfad"
Write-Host "Nach: $neuBasis/$neuPfad"

$altRoh = Get-Knoten -Basis $altBasis -Pfad $altSchachPfad
$neuRoh = Get-Knoten -Basis $neuBasis -Pfad $neuPfad

if ($altRoh.Trim() -eq "null" -or $altRoh.Trim() -eq "") {
    Write-Host "In der alten Datenbank liegen keine Partien. Nichts zu tun." -ForegroundColor Yellow
    exit 0
}

$alt = $altRoh | ConvertFrom-Json
$neu = if ($neuRoh.Trim() -eq "null") { $null } else { $neuRoh | ConvertFrom-Json }

function Get-Eintraege {
    param($Objekt, [string]$Feld)
    $ergebnis = @{}
    if ($Objekt -and $Objekt.$Feld) {
        foreach ($eigenschaft in $Objekt.$Feld.PSObject.Properties) {
            $ergebnis[$eigenschaft.Name] = $eigenschaft.Value
        }
    }
    return $ergebnis
}

$altPartien = Get-Eintraege -Objekt $alt -Feld "partien"
$neuPartien = Get-Eintraege -Objekt $neu -Feld "partien"

$fehlend = @()
$aelter  = @()
foreach ($id in ($altPartien.Keys | Sort-Object)) {
    if (-not $neuPartien.ContainsKey($id)) {
        $fehlend += $id
    } elseif ([double]$altPartien[$id].geaendertAm -gt [double]$neuPartien[$id].geaendertAm) {
        $aelter += $id
    }
}

# Die Chronik ist eine Liste; verglichen wird ueber die Partie-Kennung.
$altChronik = @($alt.chronik)
$neuChronik = if ($neu) { @($neu.chronik) } else { @() }
$neuChronik = @($neuChronik | Where-Object { $_ -ne $null })
$bekannt = @{}
foreach ($eintrag in $neuChronik) {
    $bekannt[[string]$eintrag.id] = $true
}
$chronikFehlend = @()
for ($i = 0; $i -lt $altChronik.Count; $i++) {
    $eintrag = $altChronik[$i]
    if ($eintrag -ne $null -and -not $bekannt.ContainsKey([string]$eintrag.id)) {
        $chronikFehlend += $i
    }
}

Write-Host ""
Write-Host ("   Partien alt: {0,4}   neu: {1,4}" -f $altPartien.Count, $neuPartien.Count)
Write-Host ("   fehlen neu:  {0,4}   dort aelter: {1,4}" -f $fehlend.Count, $aelter.Count)
Write-Host ("   Chronik alt: {0,4}   neu: {1,4}   fehlen: {2,4}" -f $altChronik.Count, $neuChronik.Count, $chronikFehlend.Count)

# Nur zur Auskunft: Welche Konten sind schon umgezogen?
try {
    $altSpieler = (Get-Knoten -Basis $altBasis -Pfad "spieler") | ConvertFrom-Json
    $neuKonten  = (Get-Knoten -Basis $neuBasis -Pfad "spieler/konten") | ConvertFrom-Json
    $umgezogen = @{}
    if ($neuKonten) {
        foreach ($e in $neuKonten.PSObject.Properties) { $umgezogen[[string]$e.Value.id] = $true }
    }
    Write-Host ""
    Write-Host "   Konten (ziehen beim ersten Anmelden von selbst um):"
    foreach ($s in @($altSpieler.spieler)) {
        if ($s) {
            $stand = if ($umgezogen.ContainsKey([string]$s.id)) { "umgezogen" } else { "wartet" }
            Write-Host ("      {0,-20} {1}" -f $s.name, $stand)
        }
    }
} catch {
    Write-Host "   (Konten nicht lesbar: $($_.Exception.Message))" -ForegroundColor Yellow
}

if ($fehlend.Count -eq 0 -and $aelter.Count -eq 0 -and $chronikFehlend.Count -eq 0) {
    Write-Host ""
    Write-Host "Alles schon umgezogen. Nichts zu tun." -ForegroundColor Green
    exit 0
}

if ($NurAnzeigen) {
    Write-Host ""
    Write-Host "Nur angezeigt - nichts gesichert, nichts geschrieben." -ForegroundColor Yellow
    exit 0
}

# ---------------------------------------------------------------------
# 2. Sichern
# ---------------------------------------------------------------------

$zielOrdner = Join-Path $ablageWurzel (Get-Date -Format "yyyy-MM-dd_HHmmss")
New-Item -ItemType Directory -Path $zielOrdner -Force | Out-Null
$ohneBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText((Join-Path $zielOrdner "alt-team-schach.json"), $altRoh, $ohneBom)
[System.IO.File]::WriteAllText((Join-Path $zielOrdner "neu-team-schach.json"), $neuRoh, $ohneBom)
Write-Host ""
Write-Host "Beide Staende gesichert: $zielOrdner" -ForegroundColor Green

# ---------------------------------------------------------------------
# 3. Fragen
# ---------------------------------------------------------------------

Write-Host ""
$antwort = Read-Host "Zum Umziehen UMZIEHEN eintippen (alles andere bricht ab)"
if ($antwort -cne "UMZIEHEN") {
    Write-Host "Abgebrochen - nichts geschrieben." -ForegroundColor Yellow
    exit 0
}

# ---------------------------------------------------------------------
# 4. Schreiben - je Partie ein Schritt (Partie + Uebersicht zusammen)
# ---------------------------------------------------------------------

function Send-MitAnmeldung {
    param([string]$KoerperText)
    try {
        Send-Aenderungen -KoerperText $KoerperText
    } catch {
        $status = 0
        if ($_.Exception.Response) { $status = [int]$_.Exception.Response.StatusCode }
        if ($status -eq 401 -and $script:idToken -eq "") {
            Connect-UpcrewKonto
            Send-Aenderungen -KoerperText $KoerperText
        } else {
            throw
        }
    }
}

function ConvertTo-JsonText {
    param([string]$Text)
    return '"' + ($Text -replace '\\', '\\' -replace '"', '\"') + '"'
}

$geschrieben = 0
foreach ($id in ($fehlend + $aelter)) {
    $partie = Get-Knoten -Basis $altBasis -Pfad "$altSchachPfad/partien/$id"
    $uebersicht = Get-Knoten -Basis $altBasis -Pfad "$altSchachPfad/uebersicht/$id"
    $koerper = "{" + (ConvertTo-JsonText "partien/$id") + ":" + $partie
    if ($uebersicht.Trim() -ne "null") {
        $koerper += "," + (ConvertTo-JsonText "uebersicht/$id") + ":" + $uebersicht
    }
    $koerper += "}"
    Send-MitAnmeldung -KoerperText $koerper
    $geschrieben++
    Write-Host "   Partie $id"
}

# Die Chronik haengt hinten an (Firebase fuehrt Listen als Knoten 0, 1, 2 ...).
$stelle = $neuChronik.Count
foreach ($i in $chronikFehlend) {
    $eintrag = Get-Knoten -Basis $altBasis -Pfad "$altSchachPfad/chronik/$i"
    Send-MitAnmeldung -KoerperText ("{" + (ConvertTo-JsonText "chronik/$stelle") + ":" + $eintrag + "}")
    $stelle++
}

# Zum Schluss Fassung und Marke - erst jetzt holen die Geraete den neuen Stand.
$datenVersion = if ($alt.datenVersion) { [int]$alt.datenVersion } else { 2 }
$marke = [long](([DateTimeOffset]::UtcNow).ToUnixTimeMilliseconds())
Send-MitAnmeldung -KoerperText ('{"datenVersion":' + $datenVersion + ',"geaendertAm":' + $marke + '}')

Write-Host ""
Write-Host "Fertig: $geschrieben Partien, $($chronikFehlend.Count) Chronik-Eintraege umgezogen." -ForegroundColor Green
Write-Host "Nochmal starten schadet nicht - es kopiert nur, was fehlt."
exit 0
