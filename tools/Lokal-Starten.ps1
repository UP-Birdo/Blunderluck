<#
    Lokal-Starten.ps1 - liefert den Projektordner auf dem eigenen Rechner aus,
    damit die Seite vor dem Hochladen richtig geprueft werden kann.

    Warum ueberhaupt ein Server? Per Doppelklick geoeffnet laeuft die Seite
    unter "file://". Browser behandeln diese Herkunft besonders streng: der
    Browser-Speicher verhaelt sich anders und Abfragen an die Datenbank koennen
    blockiert werden. Unter "http://localhost:8080" verhaelt sich alles wie
    spaeter auf GitHub Pages.

    Das Skript findet seine Pfade relativ zu sich selbst und beendet sich mit
    Strg+C.

    Aufruf:
        powershell -ExecutionPolicy Bypass -File "<Pfad>\tools\Lokal-Starten.ps1"
    oder bequemer: "tools\Blunderluck lokal starten.cmd" doppelklicken.
#>

param(
    [int]$Port = 8080
)

$ErrorActionPreference = "Stop"

$hier         = Split-Path -Parent $MyInvocation.MyCommand.Path
$projektOrdner = Split-Path -Parent $hier

# Zuordnung Dateiendung -> Inhaltstyp. Fehlt eine Endung, wird sie als
# unbekannter Binaerinhalt ausgeliefert.
$inhaltstypen = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".svg"  = "image/svg+xml"
    ".png"  = "image/png"
    ".ico"  = "image/x-icon"
    ".md"   = "text/plain; charset=utf-8"
}

$zuhoerer = New-Object System.Net.HttpListener
$zuhoerer.Prefixes.Add("http://localhost:$Port/")

try {
    $zuhoerer.Start()
} catch {
    Write-Host "Der Port $Port ist belegt oder gesperrt: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Blunderluck laeuft unter http://localhost:$Port/" -ForegroundColor Green
Write-Host "Ordner: $projektOrdner"
Write-Host "Beenden mit Strg+C."
Write-Host ""

try {
    Start-Process "http://localhost:$Port/"
} catch {
    # Kein Browser gestartet - kein Grund abzubrechen.
}

while ($zuhoerer.IsListening) {

    $zusammenhang = $zuhoerer.GetContext()
    $anfrage      = $zusammenhang.Request
    $antwort      = $zusammenhang.Response

    $relativerPfad = [System.Uri]::UnescapeDataString($anfrage.Url.AbsolutePath).TrimStart("/")
    if ($relativerPfad -eq "") {
        $relativerPfad = "index.html"
    }

    $datei = Join-Path $projektOrdner ($relativerPfad -replace "/", "\")

    # Ausbruch aus dem Projektordner verhindern. Der Vergleich braucht das
    # Trennzeichen am Ende, sonst gaelte auch ein Nachbarordner mit gleichem
    # Namensanfang als "innerhalb".
    $vollerPfad = [System.IO.Path]::GetFullPath($datei)
    $wurzel     = [System.IO.Path]::GetFullPath($projektOrdner)
    if (-not $wurzel.EndsWith([System.IO.Path]::DirectorySeparatorChar)) {
        $wurzel += [System.IO.Path]::DirectorySeparatorChar
    }

    if (-not $vollerPfad.StartsWith($wurzel, [System.StringComparison]::OrdinalIgnoreCase)) {
        $antwort.StatusCode = 403
        $antwort.Close()
        continue
    }

    if (Test-Path -LiteralPath $vollerPfad -PathType Leaf) {
        $endung = [System.IO.Path]::GetExtension($vollerPfad).ToLowerInvariant()
        $typ    = $inhaltstypen[$endung]
        if (-not $typ) {
            $typ = "application/octet-stream"
        }

        $inhalt = [System.IO.File]::ReadAllBytes($vollerPfad)
        $antwort.ContentType = $typ
        $antwort.ContentLength64 = $inhalt.Length
        # Kein Zwischenspeicher: beim Bauen soll jede Aktualisierung sofort wirken.
        $antwort.Headers.Add("Cache-Control", "no-store")
        $antwort.OutputStream.Write($inhalt, 0, $inhalt.Length)
        Write-Host "200  $relativerPfad"
    } else {
        $antwort.StatusCode = 404
        $text = [System.Text.Encoding]::UTF8.GetBytes("Nicht gefunden: $relativerPfad")
        $antwort.ContentType = "text/plain; charset=utf-8"
        $antwort.OutputStream.Write($text, 0, $text.Length)
        Write-Host "404  $relativerPfad" -ForegroundColor Yellow
    }

    $antwort.Close()
}
