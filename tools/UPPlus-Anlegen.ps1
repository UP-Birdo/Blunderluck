<#
    UPPlus-Anlegen.ps1 - legt das oberste UPCrew-Konto "UP#Plus" an
    (Rolle AboveAdmin: vergibt die Rolle Admin, spielt selbst nicht).

    WARUM EIN WERKZEUG UND NICHT DIE APP: Der Name "UP" ist in der App
    reserviert, und die Nummer "Plus" ist keine Ziffernfolge - beides kann
    die App absichtlich NICHT anlegen. Nur dieses Werkzeug tut es, einmal,
    solange die Uebergangs-Regeln (SICHERHEIT.md, 2b) gelten. Danach steht
    die Konto-Nummer in den endgueltigen Regeln, und niemand sonst kann
    diesen Platz je belegen.

    DAS PASSWORT legst DU hier fest. Es wird verdeckt abgefragt, nur an
    Firebase geschickt (verschluesselt) und nirgends gespeichert. Regel:
    8 bis 12 Zeichen, Gross- und Kleinbuchstaben, Ziffer, Sonderzeichen.
    Schreib es dir sicher auf - wer es vergisst, muss es in der
    Firebase-Konsole (Authentication -> Nutzer) zuruecksetzen lassen.

    AUFRUF (im Projektordner)

        powershell -ExecutionPolicy Bypass -File "tools\UPPlus-Anlegen.ps1"

    Am Ende steht die Konto-Nummer (uid). Die braucht Claude fuer die
    endgueltigen Regeln (SICHERHEIT.md, Abschnitt 11: ABOVE_UID).
#>

$ErrorActionPreference = "Stop"

$hier          = Split-Path -Parent $MyInvocation.MyCommand.Path
$projektOrdner = Split-Path -Parent $hier
$konfigText    = Get-Content -LiteralPath (Join-Path $projektOrdner "js\konfig.js") -Raw -Encoding UTF8

function Get-KonfigWert {
    param([string]$Ausdruck, [string]$Bezeichnung)
    if ($konfigText -match $Ausdruck) {
        return $Matches[1]
    }
    Write-Host "In js\konfig.js fehlt: $Bezeichnung" -ForegroundColor Red
    exit 1
}

$basis  = (Get-KonfigWert '(?m)^\s*firebaseBasis:\s*"([^"]+)"' "speicher.firebaseBasis").TrimEnd("/")
$apiKey = Get-KonfigWert '(?m)^\s*apiKey:\s*"([^"]+)"' "konto.apiKey"
$domain = Get-KonfigWert '(?m)^\s*domain:\s*"([^"]+)"' "konto.domain"

try {
    [System.Net.ServicePointManager]::SecurityProtocol =
        [System.Net.ServicePointManager]::SecurityProtocol -bor [System.Net.SecurityProtocolType]::Tls12
} catch {
}

Write-Host ""
Write-Host "UP#Plus anlegen (oberstes UPCrew-Konto)" -ForegroundColor Cyan
Write-Host "Datenbank: $basis"

# ---------------------------------------------------------------------
# Gibt es UP#Plus schon?
# ---------------------------------------------------------------------

# Als ROHER Text: Windows PowerShell 5.1 macht aus der Antwort "null" (gibt es
# nicht) sonst die Zeichenkette "null" - und die galt als vorhanden.
$antwort = Invoke-WebRequest -Uri "$basis/spieler/namen/up/Plus.json" -UseBasicParsing -TimeoutSec 20
$vorhanden = ([Text.Encoding]::UTF8.GetString($antwort.RawContentStream.ToArray())).Trim().Trim('"')
if ($vorhanden -ne "" -and $vorhanden -ne "null") {
    Write-Host ""
    Write-Host "UP#Plus gibt es schon (Konto-Nummer: $vorhanden). Nichts zu tun." -ForegroundColor Yellow
    exit 0
}

# ---------------------------------------------------------------------
# Passwort abfragen (zweimal, verdeckt) und pruefen
# ---------------------------------------------------------------------

function Read-Verdeckt([string]$Frage) {
    $sicher = Read-Host $Frage -AsSecureString
    $zeiger = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sicher)
    try {
        return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($zeiger)
    } finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($zeiger)
    }
}

# Genau die Passwortrichtlinie von Firebase (wie KONTO.passwortPruefen): nur
# a-z/A-Z zaehlen als Buchstaben, nur diese Zeichen als Sonderzeichen.
$sonderzeichen = '^$*.[]{}()?"!@#%&/\,><'':;|_~`-'

function Test-Regel([string]$Pw) {
    if ($Pw -match '\s') { return "Leerzeichen sind nicht erlaubt." }
    if ($Pw.Length -lt 8 -or $Pw.Length -gt 12) { return "8 bis 12 Zeichen." }
    if ($Pw -cnotmatch '[a-z]') { return "Es fehlt ein Kleinbuchstabe (a-z)." }
    if ($Pw -cnotmatch '[A-Z]') { return "Es fehlt ein Grossbuchstabe (A-Z)." }
    if ($Pw -notmatch '[0-9]') { return "Es fehlt eine Ziffer." }
    $hatSonder = $false
    foreach ($z in $Pw.ToCharArray()) { if ($sonderzeichen.IndexOf($z) -ge 0) { $hatSonder = $true } }
    if (-not $hatSonder) { return "Es fehlt ein Sonderzeichen wie ! ? # % & @ - _ . (Zeichen wie § oder + zaehlen bei Firebase nicht)." }
    return ""
}

# Der API-Schluessel ist auf die UPCrew-Seiten beschraenkt (Konsole, 25.09.2026):
# Anfragen ohne Seiten-Angabe weist Google ab. Das Werkzeug gibt sich deshalb
# als die eigene Seite aus.
$seite = @{ Referer = "https://up-birdo.github.io/" }

function Get-Fehlertext($Fehler) {
    try {
        $leser = New-Object IO.StreamReader($Fehler.Exception.Response.GetResponseStream())
        return $leser.ReadToEnd()
    } catch {
        return $Fehler.Exception.Message
    }
}

while ($true) {
    Write-Host ""
    Write-Host "Regel: 8 bis 12 Zeichen, Gross- und Kleinbuchstaben, Ziffer, Sonderzeichen."
    $passwort = Read-Verdeckt "Passwort fuer UP#Plus"
    $regel = Test-Regel $passwort
    if ($regel -ne "") {
        Write-Host $regel -ForegroundColor Red
        continue
    }
    $wiederholung = Read-Verdeckt "Noch einmal"
    if ($wiederholung -cne $passwort) {
        Write-Host "Die beiden stimmen nicht ueberein." -ForegroundColor Red
        continue
    }
    break
}

# ---------------------------------------------------------------------
# Firebase-Konto anlegen und Eintrag + Namens-Platz schreiben
# ---------------------------------------------------------------------

$kennung = [guid]::NewGuid().ToString()
$id      = [guid]::NewGuid().ToString()

$koerper = @{
    email = ($kennung + "@" + $domain)
    password = $passwort
    returnSecureToken = $true
} | ConvertTo-Json
try {
    $konto = Invoke-RestMethod -Method Post -TimeoutSec 20 -ContentType "application/json" `
        -Headers $seite `
        -Uri ("https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=" + $apiKey) `
        -Body ([Text.Encoding]::UTF8.GetBytes($koerper))
} catch {
    Write-Host "Firebase hat das Konto abgelehnt: $(Get-Fehlertext $_)" -ForegroundColor Red
    exit 1
}
$uid = [string]$konto.localId

$eintrag = [ordered]@{
    id = $id; name = "UP"; tag = "Plus"; uid = $uid; kennung = $kennung
}
$aenderungen = [ordered]@{}
$aenderungen["konten/$uid"] = $eintrag
$aenderungen["namen/up/Plus"] = $uid
$aenderungen["geaendertAm"] = [long](([DateTimeOffset]::UtcNow).ToUnixTimeMilliseconds())
$text = $aenderungen | ConvertTo-Json -Depth 5 -Compress

try {
    Invoke-WebRequest -Method Patch -UseBasicParsing -TimeoutSec 20 `
        -Uri ("$basis/spieler.json?auth=" + [uri]::EscapeDataString([string]$konto.idToken)) `
        -ContentType "application/json; charset=utf-8" `
        -Body ([Text.Encoding]::UTF8.GetBytes($text)) | Out-Null
} catch {
    Write-Host "Der Eintrag liess sich nicht schreiben: $(Get-Fehlertext $_)" -ForegroundColor Red
    Write-Host "Gelten schon die endgueltigen Regeln? Dann Claude fragen." -ForegroundColor Yellow
    # Das eben angelegte Firebase-Konto wieder wegraeumen.
    try {
        Invoke-RestMethod -Method Post -TimeoutSec 20 -ContentType "application/json" `
            -Headers $seite `
            -Uri ("https://identitytoolkit.googleapis.com/v1/accounts:delete?key=" + $apiKey) `
            -Body (@{ idToken = [string]$konto.idToken } | ConvertTo-Json) | Out-Null
    } catch {
    }
    exit 1
}

Write-Host ""
Write-Host "UP#Plus ist angelegt." -ForegroundColor Green
Write-Host "Anmelden in der App mit: UP#Plus und deinem Passwort."
Write-Host ""
Write-Host "Konto-Nummer fuer die Regeln (an Claude geben):" -ForegroundColor Cyan
Write-Host "   $uid"
exit 0
