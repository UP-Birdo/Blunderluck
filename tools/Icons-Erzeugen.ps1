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
$gold       = [System.Drawing.ColorTranslator]::FromHtml("#ffc83d")

# Springer und Funke - dieselben Koordinaten wie in icon.svg. Nur zwei Formen,
# damit das Zeichen bei 32 Pixeln nicht zu einem Fleck verschmilzt; wer sie
# aendert, aendert beide Dateien und sieht sich das Ergebnis in 32 Pixeln an.
$springer = @(
    @(140, 424), @(140, 396), @(158, 396), @(158, 372), @(176, 372),
    @(186, 340), @(196, 306), @(206, 282), @(196, 264), @(166, 258),
    @(130, 252), @(108, 240), @(104, 222), @(120, 208), @(152, 202),
    @(184, 194), @(206, 178), @(228, 156), @(250, 132), @(264, 112),
    @(280, 140), @(306, 108), @(322, 150), @(334, 186), @(352, 214),
    @(338, 232), @(356, 258), @(342, 278), @(358, 304), @(346, 330),
    @(352, 354), @(354, 372), @(354, 396), @(372, 396), @(372, 424)
)

$funke = @(
    @(124, 84), @(134, 116), @(166, 126), @(134, 136),
    @(124, 168), @(114, 136), @(82, 126), @(114, 116)
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

    # Umrechnung einer Punktliste aus dem 512er-Raster in diese Bildgroesse.
    function ConvertTo-Punkte {
        param($Liste, [single]$Mass)

        $punkte = @()
        foreach ($punkt in $Liste) {
            $punkte += New-Object System.Drawing.PointF(
                ($punkt[0] * $Mass), ($punkt[1] * $Mass))
        }
        return [System.Drawing.PointF[]]$punkte
    }

    # Der Springer.
    $weiss = New-Object System.Drawing.SolidBrush($hell)
    $zeichnung.FillPolygon($weiss, (ConvertTo-Punkte -Liste $springer -Mass $mass))
    $weiss.Dispose()

    # Der Funke.
    $goldPinsel = New-Object System.Drawing.SolidBrush($gold)
    $zeichnung.FillPolygon($goldPinsel, (ConvertTo-Punkte -Liste $funke -Mass $mass))
    $goldPinsel.Dispose()

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
