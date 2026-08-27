# Tests

Regressionstests der Spiellogik. Sie laden die **echten** Dateien aus `js\` und
enthalten keine Kopien von Funktionen — Kopien driften und testen dann etwas,
das es so nicht mehr gibt.

| Datei | Prüft |
|---|---|
| `test-spieler.js` | Spielerliste: Datenvertrag, PIN, Zusammenführen |
| `test-versiegelung.js` | PIN- und Verwaltungs-Prüfsummen |
| `test-schach.js` | Schachregeln, auch auf den anderen Brettgrößen |
| `test-schach-runde.js` | eine Partie: Teams, Zugrecht, Spielarten, Abstimmung, Zufallsarmee |
| `test-schach-runde-faehigkeiten.js` | Fähigkeiten, Lootboxen, Unglückswürfel und Händler einer Partie |
| `test-schach-tafel.js` | Sammlung der Partien und der **Umstieg** von früher |
| `test-schach-bot.js` | Computer-Gegner: wann er zieht, was er wählt, dass er nicht spickt |
| `test-schach-vorschau.js` | Bildanleitung: jede Fähigkeit hat ein Beispiel, und es geht auf |
| `test-schach-grundlagen.js` | Schachregel-Anleitung: jedes Kapitel ist mit den echten Regeln gerechnet |
| `test-rangliste.js` | Wertung und Spielerprofil |
| `test-bildschirm.js` | Bildschirm-Code gegen ein nachgebautes DOM: Übersicht, Brett, Partie-Fenster |
| `test-bildschirm-anzeigen.js` | Anzeigen am Bildschirm: die drei Punkte aus v0.76, Rangliste, Zugweg, Vorrat-Zeichen |
| `test-bildschirm-ablaeufe.js` | Abläufe am Bildschirm: Start, Abgleich, Fenster, Tabs — samt der asynchronen Prüfungen |
| `test-syntax.js` | Übersetzbarkeit, Einbindung, Aufrufe, Version |

Dazu kommt **`bildschirm-umgebung.js`** — die gemeinsame Testumgebung der drei
Bildschirm-Testdateien (nachgebautes DOM, echte `js\`-Dateien im vm-Kontext,
Ausgangslage). Sie ist bewusst **keine** Testdatei: Sie beginnt nicht mit
`test-`, wird vom Läufer also nicht gestartet, und erzeugt selbst keine
Prüfungen. Jede der drei Testdateien lädt sie per `require()` und bekommt so
ihre eigene, frische Umgebung.

## Aufruf

Alle Testdateien auf einmal:

    powershell -ExecutionPolicy Bypass -File "tests\Tests-Ausfuehren.ps1"

Das Skript findet seine Pfade relativ zu sich selbst und darf mit dem Projekt
verschoben werden.

**Erwartung:** je Testdatei eine Zeile `N ok, 0 Fehler`, am Ende
`Alle Testdateien in Ordnung.` und Exit-Code 0.

## Warum kein Node?

Auf diesem Rechner ist Node.js nicht installiert. Visual Studio Code bringt
aber eine Node-Laufzeit mit: `Code.exe` verhält sich wie Node, sobald die
Umgebungsvariable `ELECTRON_RUN_AS_NODE` gesetzt ist. Genau das macht
`Tests-Ausfuehren.ps1`. Es sucht `Code.exe` an den üblichen Orten
(`%LOCALAPPDATA%\Programs\Microsoft VS Code`, `C:\Program Files\…`).

Einzeln geht es auch von Hand:

    $env:ELECTRON_RUN_AS_NODE = "1"
    & "$env:LOCALAPPDATA\Programs\Microsoft VS Code\Code.exe" "tests\test-schach.js"

Ein einzelnes Mess- oder Wegwerf-Skript (nicht im Projekt!) läuft über das
Haus-Werkzeug, das dieselbe Suche macht:

    powershell -ExecutionPolicy Bypass -File "..\..\..\tools\Node-Ausfuehren.ps1" -Skript "<Pfad zur .js>"

## Was wird geprüft (`test-schach.js`)

Die Schachregeln — der Bereich, in dem sich Fehler am leichtesten verstecken.

| Bereich | Inhalt |
|---|---|
| Felder | Namen und Nummern, Grundstellung |
| Gangarten | Bauer (ein/zwei Felder, schräg schlagen), Springer springt, Turm/Läufer/Dame bis zum Hindernis, König ein Feld |
| Schach | Erkennung, gefesselte Figuren bleiben stehen, König darf nicht ins Schach, im Schach zählen nur rettende Züge |
| Rochade | kurz und lang; verboten im Schach, über ein bedrohtes Feld, ohne Recht, durch besetzte Felder; Königszug nimmt beide Rechte |
| Sonderzüge | en passant nur unmittelbar danach, Umwandlung in jede Figur |
| Partieende | Schachmatt mit Sieger, Patt ohne |

## Was wird geprüft (`test-schach-runde.js` und `test-schach-runde-faehigkeiten.js`)

Teams und Ablauf einer Partie. Seit 08/2026 sind es zwei Dateien, geteilt
entlang derselben Naht wie der App-Code seit v0.92.0: Die **Rundenverwaltung**
(Teams, Start, Zugrecht, Ziehen, Ende, Spielarten samt Kreuz-Brett,
Abstimmung, Zufallsarmee, Vergleich) prüft `test-schach-runde.js`; alles zu
**Fähigkeiten, Lootboxen, Unglückswürfeln und Händler** prüft
`test-schach-runde-faehigkeiten.js`. Beide laden dieselbe echte Dateikette
(`schach-varianten.js`, `schach.js`, `schach-runde.js`,
`schach-runde-faehigkeiten.js`).

| Bereich | Inhalt |
|---|---|
| Teams | beitreten, wechseln, verlassen, niemand doppelt, Beitritt auch während des Spiels |
| Start | erst wenn beide Seiten besetzt UND bereit sind |
| Zugrecht | nur das Team am Zug; **innerhalb des Teams jeder** — nach dem Zug eines Teammitglieds ist das ganze Team nicht mehr dran |
| Ziehen | Zugzähler und Verlauf, abgewiesene Züge, begrenzter Verlauf |
| Ende | Narrenmatt beendet die Partie mit Sieger, Aufgeben, neue Partie behält die Teams |
| Fähigkeiten (eigene Datei) | jede einzelne Fähigkeit, Item-Vorrat, Abklingzeit, Einsammeln und Restzeit, Regen und Lootbox-Menge, Dieb und Händler, Unglückswürfel, „ein Item führt nie direkt zu Schach, Matt oder Patt" |

## Was wird geprüft (`test-schach-vorschau.js`)

Die Bildanleitung zu den Fähigkeiten (seit v0.41). Sie ist der einzige Test,
der etwas über die ANZEIGE aussagt, ohne den Bildschirm zu brauchen: Die Bilder
entstehen aus den echten Regeln, also lässt sich prüfen, ob sie etwas zeigen.

| Bereich | Inhalt |
|---|---|
| Vollständigkeit | zu JEDER Fähigkeit und jedem Unglückswürfel gibt es zwei Bilder mit Text |
| Aussagekraft | Vorher und Nachher unterscheiden sich sichtbar (Brett, Wirkung im Stand oder markierte Felder) |
| Ablauf | jeder Schritt hat Brett, Marken und Satz; Fähigkeiten mit Zielfeld haben drei Schritte, wo gezogen wird vier, die übrigen zwei; die Auswahl im mittleren Schritt kommt aus `zielFelder` |
| Handgriff | jeder Schritt, in dem getippt wird, trägt einen Fingerabdruck — und nur der; Ausgangsstellung und Wirkung nie |
| **Probe aufs Exempel** | für JEDE Fähigkeit: Der Fingerabdruck liegt auf einem Feld, das die Regel wirklich annimmt (`zielFelder`), und markiert ist genau das Mögliche — keines zu viel, keines zu wenig |
| Pfeile | wo sich etwas bewegt, hat der Schritt Wege mit zwei verschiedenen Enden |
| Einzelfälle | Sprung markiert Springerziele, aus dem Bauern wird ein Springer, die Mauer sperrt drei Felder, das Brett wächst, nach dem Doppelzug ist dieselbe Seite dran |
| Beispielbretter | genau 6 mal 6 Felder, beide Könige stehen darauf |

**Wer eine Fähigkeit ändert und ihr Beispiel vergisst, sieht es hier** — das
Zielfeld ist dann kein gültiges mehr, und das Bild kommt gar nicht zustande.

## Was wird geprüft (`test-schach-grundlagen.js`)

Die Anleitung „Schach lernen" (seit v0.96). Nach demselben Gedanken wie oben:
Ihre Bilder sind mit den echten Regeln GERECHNET, also lässt sich nachrechnen,
ob sie stimmen.

| Bereich | Inhalt |
|---|---|
| Vollständigkeit | jede Gruppe hat Kapitel, jedes Kapitel Titel, Text und mindestens ein Bild; jede Figur hat ihr eigenes Kapitel |
| **Probe aufs Exempel** | die markierten Felder sind genau die aus `SCHACH.zuege` — keines zu viel, keines zu wenig |
| Der Bauer | das Feld geradeaus ist besetzt und deshalb KEIN Zug, das schräge Schlagfeld dagegen markiert |
| Schach, Matt, Patt | was das Kapitel behauptet, bestätigt `SCHACH.lage`; beim Patt zusätzlich: kein Schach UND kein Zug |
| Sonderzüge | Umwandlung, Rochade und en passant werden wirklich gezogen; vorher und nachher unterscheiden sich, bei der Rochade auf VIER Feldern |
| Brett | 8 mal 8, Spielart `standard`, Rochade auf den echten Feldern e1/h1 |
| **Keine Lootbox** | auf keinem Bild liegt eine — der Fehler aus v0.96, der aus `variante.bonusFelder` kam |
| Figurenwerte | dieselben Zahlen wie `SCHACH_RUNDE.FIGUR_WERT`, Reihenfolge absteigend |

**Wer eine Gangart ändert, sieht das Bild mitgehen; wer sie kaputt macht, sieht
es hier.** Vier der Stellungen sind beim Schreiben nicht aufgegangen — der Test
hat es gesagt, bevor es ein Anfänger geglaubt hätte.

## Was wird geprüft (`test-syntax.js`)

Die Bildschirm- und Speicherdateien laufen nur im Browser, lassen sich hier
aber **übersetzen**, ohne sie zu starten. Das fängt Tippfehler, vergessene
Klammern und typografische Anführungszeichen sofort ab.

| Bereich | Inhalt |
|---|---|
| Übersetzbarkeit | jede Datei in `js\` wird kompiliert |
| Einbindung | jede Datei aus `js\` und jede Stildatei aus `css\` ist in `index.html` verlinkt; `stil.css` (Grundlagen) lädt als erster Teil — die Reihenfolge der fünf Stildateien ist die Kaskade |
| Aufrufe | jedes `SPIELER.xyz`, `SCHACH.xyz`, `SCHACH_RUNDE.xyz` und `VERSIEGELUNG.xyz` im gesamten Programm gibt es wirklich — fängt umbenannte Funktionen, die anderswo unter dem alten Namen weiterleben. Das Suchmuster braucht eine Wortgrenze, sonst trifft `SCHACH` auch mitten in `TEAM_SCHACH`. |
| Version | `APP_VERSION` aus `js\konfig.js` kommt in `CHANGELOG.md` UND in der Versionszeile der `STATUS.md` vor |

## Was wird geprüft (`test-versiegelung.js`)

Das Siegel ist der Kern des Spiels — ohne es könnte jeder Mitspieler die Würfel
der anderen in der Datenbank nachschlagen.

| Bereich | Inhalt |
|---|---|
| Salz | lang genug, jedes Mal anders |
| Prüfwert | gleiche Eingabe ergibt gleichen Wert, Reihenfolge der Würfel egal, anderer Wurf oder anderes Salz ergibt anderen Wert |
| Prüfung | erkennt den richtigen Wurf (auch umsortiert), weist geänderten Wurf, falsches Salz und fehlendes Siegel ab |
| Geheimhaltung | der veröffentlichte Wert enthält keinen Klartext |
| Spieler-PIN | richtige PIN wird erkannt, falsche nicht; gleiche PIN bei zwei Spielern ergibt dank Salz verschiedene Prüfwerte; der Prüfwert enthält die Ziffern nicht |
| Verwaltung | die Prüfsumme in `js\konfig.js` passt zum vereinbarten Passwort — schlägt der Test fehl, käme niemand mehr in die Verwaltung |

## Was wird geprüft (`test-schach-tafel.js`)

Die Sammlung aller Partien — und vor allem der Umstieg.

| Bereich | Inhalt |
|---|---|
| **Umstieg** | Ein Stand aus der Zeit der einzelnen Partie wird zur Partie `start`; Brett, Zugzähler, Teams, Bereitschaft und Verlauf bleiben Feld für Feld erhalten. Ein zweiter Durchlauf darf nicht erneut umstellen. |
| Anlegen | Kennung, Titel und Spielart; zwei Partien im selben Moment bekommen verschiedene Kennungen |
| Einsetzen | ändert nur die eine Partie — der Schutz gegen das Überschreiben fremder Partien |
| Reihenfolge | laufende oben, noch nicht gestartete danach, beendete unten |
| Vergleich | erkennt neue, geänderte und gelöschte Partien |

## Was wird geprüft (`test-rangliste.js`)

| Bereich | Inhalt |
|---|---|
| Schachpunkte | nur beendete Partien zählen; Sieg, Unentschieden und Teilnahme; mehrere Partien werden summiert |
| Gesamtwertung | Würfel- und Schachpunkte addiert, Reihenfolge, jeder Mitspieler steht drin (auch ohne Punkte) |
| Grenzen | wer aus der Anmeldungs-Schicht entfernt wurde, verschwindet aus der Wertung |
| Erklärung | der angezeigte Text nennt dieselben Zahlen, mit denen gerechnet wird |

## Was wird geprüft (die drei Bildschirm-Testdateien)

Sie bauen ein winziges DOM nach und lassen den Bildschirm-Code einmal
durchlaufen. Das fängt, was `test-syntax.js` nicht sieht: Aufrufe, die es zwar
gibt, die aber mit den falschen Daten arbeiten, und Bereiche, die gar nicht
entstehen — der Fehler aus v1.2, bei dem ein ganzer Tab leer blieb.

Seit 08/2026 sind es drei Dateien mit gemeinsamer Umgebung
(`bildschirm-umgebung.js`, siehe oben): `test-bildschirm.js` (Übersicht,
Brett mit seinen vier Lagen, Partie-Fenster, Fähigkeiten am Brett,
Bibliothek, Anleitung), `test-bildschirm-anzeigen.js` (Rangliste, Weg einer
Bewegung, Zeichen am Fähigkeiten-Vorrat) und `test-bildschirm-ablaeufe.js`
(Start, Beitritt, Abgleich, Fenster und Tabs — **samt der asynchronen
Prüfungen**: deren Fazit steht am Ende von `zeitlimitPruefen()`, damit jede
Prüfung VOR dem Zählen läuft).

| Bereich | Inhalt |
|---|---|
| Übersicht | zeichnet mit und ohne Partien |
| Jede Spielart | die Partie zeichnet vollständig, und das Brett hat genau `breite * hoehe` Felder |
| Bedienung | eine Figur antippen liefert ihre Zielfelder |
| Zugbewegung | läuft nach einem Zug — und beim nächsten Zeichnen **nicht** erneut |
| Sonderfälle | eingesammelte Fähigkeit, beendete Partie, gelöschte offene Partie, nicht angemeldet |
| Rangliste | zeichnet mit Mitspielern, ohne Mitspieler und bevor Daten da sind |

**Was sie nicht können:** Sie sagen nichts über das Aussehen — keine Stildatei,
keine echten Größen, keine Farben. Sie beantworten nur die Frage, ob der Code
durchläuft, ohne zu stolpern. Die Prüfliste in `docs\DEPLOYMENT.md` ersetzen sie
nicht.

## Eine neue Testdatei anlegen

Datei `tests\test-<thema>.js` — sie wird automatisch mitgelaufen (Muster
`test-*.js`). Aufbau wie `test-spieler.js`: `pruefe(...)`-Aufrufe, am Ende
`console.log(anzahlOk + " ok, " + anzahlFehler + " Fehler")` und
`process.exit(anzahlFehler === 0 ? 0 : 1)`. **Jede Prüfung steht VOR dem
Fazit** — was hinter `process.exit` steht, läuft nie. Gemeinsame Hilfsdateien
ohne eigene Prüfungen (wie `bildschirm-umgebung.js`) bekommen bewusst
**keinen** `test-`-Namen, damit der Läufer sie nicht als Test startet.

## Was die Tests NICHT prüfen

Wie die Seite AUSSIEHT und wie sie sich anfühlt: Stildatei, echte Größen,
Farben, Fokus, Dialoge und das Zusammenspiel mit der echten Datenbank. Seit v1.5
läuft der Bildschirm-Code immerhin einmal durch (`test-bildschirm.js`) — aber
gegen ein nachgebautes DOM, nicht gegen einen Browser.

Das Übrige wird von Hand geprüft; die Prüfliste steht in
[../docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md), Abschnitt 1.
