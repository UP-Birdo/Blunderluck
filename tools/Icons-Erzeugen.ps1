<#
    Icons-Erzeugen.ps1 - zeichnet die App-Zeichen als PNG.

    Warum ueberhaupt PNG, wenn es icon.svg gibt? Browser koennen SVG als
    Lesezeichen-Zeichen anzeigen, aber der Startbildschirm von iPhone und iPad
    nimmt ausschliesslich PNG. Damit beides aus derselben Quelle stammt, sind
    hier dieselben Koordinaten wie im SVG hinterlegt - wer das Zeichen aendert,
    aendert beide Dateien.

    Erzeugt werden:
        icons\icon-512.png    Startbildschirm und Vorschau
        icons\icon-192.png    Startbildschirm (Android)
        icons\icon-180.png    Startbildschirm (Apple)
        icons\icon-32.png     Lesezeichen im Browser

    Aufruf:
        powershell -ExecutionPolicy Bypass -File "<Pfad>\tools\Icons-Erzeugen.ps1"

    Das Skript findet seine Pfade relativ zu sich selbst.
#>

$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$hier          = Split-Path -Parent $MyInvocation.MyCommand.Path
$projektOrdner = Split-Path -Parent $hier
$zielOrdner    = Join-Path $projektOrdner "icons"

if (-not (Test-Path -LiteralPath $zielOrdner)) {
    New-Item -ItemType Directory -Path $zielOrdner | Out-Null
}

# ---------------------------------------------------------------------
# Das Zeichen, in Koordinaten eines 512er-Quadrats (wie in icon.svg)
# ---------------------------------------------------------------------

$grundfarbe = [System.Drawing.ColorTranslator]::FromHtml("#1f5fa8")
$hell       = [System.Drawing.Color]::White

# Augen weit aussen, Stern klein: bei 32 Pixeln verschmelzen die Formen sonst
# zu einem Fleck. Die Werte sind mit icon.svg gleichzuhalten.
$augen = @(
    @{ x = 142; y = 142 },
    @{ x = 370; y = 142 },
    @{ x = 142; y = 370 },
    @{ x = 370; y = 370 }
)
$augenRadius = 38

$stern = @(
    @(256, 185), @(274, 234), @(326, 237), @(286, 269), @(299, 319),
    @(256, 290), @(213, 319), @(226, 269), @(186, 237), @(238, 234)
)

# Abgerundetes Quadrat als Zeichenpfad.
function New-AbgerundetesQuadrat {
    param([single]$Groesse, [single]$Radius, [single]$Rand)

    $pfad = New-Object System.Drawing.Drawing2D.GraphicsPath
    $seite = $Groesse - 2 * $Rand
    $d = 2 * $Radius

    $pfad.AddArc($Rand, $Rand, $d, $d, 180, 90)
    $pfad.AddArc($Rand + $seite - $d, $Rand, $d, $d, 270, 90)
    $pfad.AddArc($Rand + $seite - $d, $Rand + $seite - $d, $d, $d, 0, 90)
    $pfad.AddArc($Rand, $Rand + $seite - $d, $d, $d, 90, 90)
    $pfad.CloseFigure()

    return $pfad
}

function New-Icon {
    param([int]$Kantenlaenge, [string]$Datei)

    $mass = $Kantenlaenge / 512.0

    $bild = New-Object System.Drawing.Bitmap($Kantenlaenge, $Kantenlaenge)
    $zeichnung = [System.Drawing.Graphics]::FromImage($bild)
    $zeichnung.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $zeichnung.Clear([System.Drawing.Color]::Transparent)

    # Grundflaeche.
    $flaeche = New-AbgerundetesQuadrat -Groesse $Kantenlaenge -Radius (96 * $mass) -Rand 0
    $pinsel = New-Object System.Drawing.SolidBrush($grundfarbe)
    $zeichnung.FillPath($pinsel, $flaeche)
    $pinsel.Dispose()

    # Innenlinie - bei sehr kleinen Zeichen weglassen, sie wuerde nur schmieren.
    if ($Kantenlaenge -ge 96) {
        $linie = New-AbgerundetesQuadrat -Groesse $Kantenlaenge -Radius (74 * $mass) -Rand (26 * $mass)
        $stift = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(72, 255, 255, 255), (10 * $mass))
        $zeichnung.DrawPath($stift, $linie)
        $stift.Dispose()
        $linie.Dispose()
    }

    $weiss = New-Object System.Drawing.SolidBrush($hell)

    # Die vier Augen.
    foreach ($auge in $augen) {
        $r = $augenRadius * $mass
        $zeichnung.FillEllipse($weiss,
            ($auge.x * $mass - $r), ($auge.y * $mass - $r), (2 * $r), (2 * $r))
    }

    # Der Stern.
    $punkte = @()
    foreach ($punkt in $stern) {
        $punkte += New-Object System.Drawing.PointF(($punkt[0] * $mass), ($punkt[1] * $mass))
    }
    $zeichnung.FillPolygon($weiss, [System.Drawing.PointF[]]$punkte)

    $weiss.Dispose()
    $flaeche.Dispose()
    $zeichnung.Dispose()

    $ziel = Join-Path $zielOrdner $Datei
    $bild.Save($ziel, [System.Drawing.Imaging.ImageFormat]::Png)
    $bild.Dispose()

    $groesse = [math]::Round((Get-Item -LiteralPath $ziel).Length / 1KB, 1)
    Write-Host ("  {0,-16} {1}x{1}  {2} KB" -f $Datei, $Kantenlaenge, $groesse)
}

Write-Host ""
Write-Host "App-Zeichen werden gezeichnet:" -ForegroundColor Cyan

New-Icon -Kantenlaenge 512 -Datei "icon-512.png"
New-Icon -Kantenlaenge 192 -Datei "icon-192.png"
New-Icon -Kantenlaenge 180 -Datei "icon-180.png"
New-Icon -Kantenlaenge 32  -Datei "icon-32.png"

Write-Host ""
Write-Host "Fertig: $zielOrdner" -ForegroundColor Green
