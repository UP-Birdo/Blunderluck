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
| `test-schach-speicher.js` | Teil-Laden und Teil-Schreiben gegen einen Datenbank-Nachbau: WAS geholt wird (fremde beendete nie, eigene beendete einmal, offene nur bei neuer Marke), Vorrat, Übersicht, Chronik-Anhang |
| `test-weniger-download.js` | v0.152.5: fremde laufende Partien nicht geholt (Einladung, Verwaltung, Code-Beitritt schon), Chronik stückweise, Vorrat behält gelöschte eigene, Aufräumen (7 Tage hart, gebucht-Regel für längere Grenzen, nur eigene, 10 je Lauf, 1× je Stunde), Takt je Bildschirm, **Messung** Bytes je Spieler-Stunde gegen v0.152.4 (Mess-Werkzeug `messung-download.js`, kein eigener Test) |
| `test-schach-bot.js` | Computer-Gegner: wann er zieht, was er wählt, dass er nicht spickt |
| `test-schach-vorschau.js` | Bildanleitung: jede Fähigkeit hat ein Beispiel, und es geht auf |
| `test-schach-grundlagen.js` | Schachregel-Anleitung: jedes Kapitel ist mit den echten Regeln gerechnet |
| `test-rangliste.js` | Wertung und Spielerprofil |
| `test-bildschirm.js` | Bildschirm-Code gegen ein nachgebautes DOM: Übersicht, Brett, Partie-Fenster |
| `test-bildschirm-anzeigen.js` | Anzeigen am Bildschirm: die drei Punkte aus v0.76, Rangliste, Zugweg, Vorrat-Zeichen |
| `test-bildschirm-ablaeufe.js` | Abläufe am Bildschirm: Start, Abgleich, Fenster, Tabs, globaler Fehlerfang — samt der asynchronen Prüfungen |
| `test-syntax.js` | Übersetzbarkeit, Einbindung, Aufrufe, Version, Service Worker; seit v0.140.0 auch die Wächter des UPCrew-Standards (keine Floskeln in Zeichenketten, Ladereihenfolge, Vibration nur über `FUEHLEN`) |
| `test-aussehen.js` | UPCrew-Angleichung Runde 3 (v0.144.0): Knopf-Zuordnung und Ausnahmen (`KNOEPFE`), 2D/3D-Freischaltung mit und ohne `SPERRE_3D` (`FREISCHALTUNG`), keine eigene Form-Regel für Haus-Knöpfe, keine feste Schrift ausser Festbreite, Ladereihenfolge des Aussehens, fünf Plätze der Leiste, zwölf Schriften offline. Seit Runde 4 (v0.145.0): Leisten-Baustein `upcrew-leiste.css` eingebunden und offline, Symbole Aufgaben/Sammlung/Bald, Tab „Sammlung“ (`SAMMLUNG`: Themen/Figuren = die des 3D-Bretts, Schlösser mit Ort, Reihenfolge der Regale, Anteil „NN %“), Sammlung-Schnittstelle von `brett-3d.js` |
| `test-zeit-zurueck.js` | Zeit zurück (v0.152.2): Merken/Einlösen des Rückblicks im Modell (zwei Halbzüge, Karten, Verluste, Verlauf, auch ohne leere Listen), nicht gegen Menschen, nicht nach Aufgeben, Tagesbrett verfehlt; Bildschirm (lädt `bildschirm-umgebung.js`): Knopf im Spiel-Menü hinter dem Trennstrich, Abschluss-Weg ohne Doppelbuchung; Turm-Wertung mit Hilfe höchstens 1 Figur; Name nur aus `SHOP.TEXTE` |
| `test-turm.js` | Turm (seit v0.160.0 neu): gleicher Seed = gleicher Turm, Stärke je Stockwerk für jeden Seed gleich, mind. zwei Wege, Boss-Abstand = Stockwerke, Partien je Weg im Rahmen des Orts (±1, weniger als der alte Turm), feste Reihen, Elite +2, jede Kampf-Station spielbar, Schlüssel passen in Regel §13, Lauf/Kreuzung/nur vorwärts, Herzen und Rückfall, Übernahme alter Stände (Tür-Zähler, vor dem Boss), Freischaltung Holzhalle/Marmorsaal |
| `test-zufall.js` | Baustein `upcrew-zufall.js` (v0.160.0): gleich bei gleicher Eingabe, andere Eingabe → anderer Seed, Version (v1-Folge festgenagelt), Tages-Seed, Verteilung (10 Fächer, Würfel, Gewichte), Zweige, kein Math.random, lädt vor dem Turm |
| `test-bausteine-quelle.js` | Gemeinsame Bausteine byte-gleich mit der Quelle `..\UPCrew\bausteine\` (seit 03.10.2026; bis dahin `test-bausteine-final.js` gegen `Design\3D-Schrift\final`): jede `css\upcrew-*.css` und `js\upcrew-*.js` per SHA-256 gegen `<css|js>\` dort (ausser der eigenen `upcrew-schicht.css`), `js\konto.js` gegen `kern\konto.js` mit eingesetztem Schlüssel `blunderluck.konto`, seit v0.160.1 dazu `js\speicher-konten.js` und `js\fortschritt-kern.js` gegen `kern\` (ohne Platzhalter); ein Vorschlag in `docs\bausteine\` wird hingenommen; fehlt der Ordner, wird übersprungen |
| `test-fortschritt.js` | XP und Level: Rechnung (`FORTSCHRITT`), Gerät und Konto (`FORTSCHRITT_KONTO`), Fortschritt am Spieler-Eintrag. Seit v0.160.1 der Kern-Baustein: Blunderluck liefert jedes Glied aus `FORTSCHRITT_KERN_ERWARTET`, `js\fortschritt.js` definiert kein Glied des Kerns noch einmal (kein stilles Überschreiben), `index.html` und `sw.js` nennen `fortschritt-kern.js` direkt VOR `fortschritt.js` und `speicher-konten.js` direkt NACH `speicher.js` |
| `test-level-luecken.js` | Die drei Level-Lücken (v0.160.1, Befund 03.10.2026): **Rückkehr in den Vordergrund** holt den eigenen Konto-Eintrag auch bei unveränderter Marke (echte Dateien gegen `regel-nachbau.js` mit Regel §13: nur `konten/<uid>`, einmal je Rückkehr, nicht als Gast, beide Sperren des Abgleichs, überholte Antwort verworfen); **Start-Kopf** zeichnet neu, wenn Level, XP oder Serie vom Konto anders eintreffen, der Rest des Starts bleibt stehen; **Gast-Hinweis** im Profil (eine Zeile, Knopf → Einstellungen, nie mit Konto, nie am fremden Profil) — die beiden letzten in `bildschirm-umgebung.js` |
| `test-wischen.js` | Tabs wechseln als Seiten-Band (v0.161.0, Baustein `upcrew-wischen.js` mit neuem Vertrag; bis v0.160 die Zeiger-Fassung): echte `tabs.js` + Baustein + die aus `app.js` herausgeschnittene Verdrahtung an einem nachgestellten Dokument — Tab-Reihenfolge = Band, Platzhalter-Tab fehlt im Band, kein Bereich einer Leisten-Seite ist `hidden`, `wechseln` ruft `zu` (Tipp: ein Wechsel, kein Kreis), Tab erst nach dem Einrasten, Enden, Seite beginnt oben ohne `window.scrollTo`, Bauen sofort/im Leerlauf/bei `kommt` (`vorzeichnen`), Sammlung ohne Abbau, Sperre in Partie/Fenster/Anmeldung sofort, Band ↔ Partie, ohne Band-Element wie bis v0.160, der Start zeichnet nur eingerastet (`START._ruht`), Einbindung und Stile. Seit v0.162.0 dazu `frueh: true` (die Leiste zieht früher nach): Finger hält = Tab bleibt; losgelassen oder ohne Finger über der Hälfte = EIN Wechsel vor dem Einrasten, beim Einrasten kein zweiter, bedienbar wird die neue Seite erst beim Einrasten; `beimOeffnen` erst im Bild nach dem Einrasten (`band.ort()`), nie doppelt, verfällt bei einem neueren Wechsel, wartet höchstens 3 s; zurückgezogen wechselt die Leiste zurück; ein Tipp läuft nicht voraus; gesperrt (Fenster, Partie) läuft nichts voraus |
| `test-sammlung-a.js` | Sammlung „Variante A“ (v0.162.0): echtes `js\sammlung.js` + echte Bausteine (`upcrew-anpassen`, `-sammlung`, `-katalog`, `-platz`, `-blatt`, `-aussehen` …) am kleinen Dokument `kleines-dom.js` — Katalog `brett2d`/`brett3d`/`figurstil` = `BRETT_DESIGN.DESIGNS`/`SAMMLUNG.THEMEN`/`SAMMLUNG.FIGUREN` (ohne `glas`); Kacheln statt Regal-Reihen (Reihenfolge, Zahlen, reine Sammlung als Kacheln), Stück-Knöpfe nur im Blatt; kein „Lv“ in Ort und Blättern, ohne Shop „wird erspielt“; `anteil()` = `tab.zaehlen()` + Fähigkeiten + Brettformen; im Blatt ein freies Stück wählen und übernehmen (eigenes Regal und Katalog-Art), ein gesperrtes nicht, „bald“ nicht antippbar; Abschnitt der reinen Sammlung wandert ins Blatt und zurück, Neuzeichnen schliesst das Blatt ohne doppelte Kacheln; Vorschau auch kompakt im Blatt; Einbindung (`index.html`, `sw.js`, `shop: false`, kein `besitz`), kein `overflow-x: auto/scroll` in den Bausteinen der Sammlung |
| `test-knopf-innenrand.js` | Knöpfe mit eigenem Innenrand 0 (Karten-Leiste: ✓ ✕ ?, Karte, Menü) haben eine `.knopf.<klasse>`-Regel, die `.knopf:not(.up-kn)` schlägt (v0.152.3, „Verstärken kann man nicht einsetzen") |
| `test-faehigkeit-absage.js` | Warum eine Fähigkeit nicht geht (v0.152.3, `SCHACH_RUNDE.faehigkeitAbsage`): mehrere Könige = kein Schach, König im Schach sperrt nur solange, „gäbe Schach", ohne Zielfeld; Absage passt immer zum Einsetzen |
| `test-intro.js` | Wann das UPCrew-Intro kommt (v0.152.3, `INTRO.entscheiden`, gleich Typoluck 0.18.2; seit v0.152.4 in der eigenen Farbwelt, `INTRO.welt`, wie 0.18.3) |
| `test-wuensche-v0-152-4.js` | Wünsche A–E (v0.152.4): Denk-Blase nur am Zug, 2D-Mauer flach mit einer hellen Restzeit, flacher Würfel und flache Karten im 2D, Schild-Warnung |
| `test-item-max.js` | Rundenregel „Wie viele auf der Hand?“ (v0.152.4, `regeln.itemMax`): Überschuss verpufft, Dieb kappt, gilt für Bob, Schildchen |
| `test-bilder-v0-152-3.js` | Fehler aus den Nutzer-Bildern (v0.152.3): Anleitung immer abgespielt, Bühne auch in 2D, Brett mittig (Rollbalken beidseitig), kein Markieren, Leiste in Partie-Einstellungen weg, Achtung-Zeichen |
| `test-zustand-fuehlen.js` | Die Bausteine des UPCrew-Standards (v0.140.0): Laden/Leer/Fehler (`ZUSTAND`, samt 10-Sekunden-Grenze), Vibration (`FUEHLEN`: Muster, Aus-Schalter, iPhone ohne Vibration, gesperrte Knöpfe und das 3D-Brett vibrieren nicht) |
| `test-hand-max-vorgabe.js` | Hand max (v0.153.0): Vorgabe ohne Grenze, eine ungefragt gemerkte 4 aus v0.152.4 fällt zurück, eine selbst gewählte Grenze bleibt, laufende Partien behalten ihren Wert (lädt `bildschirm-umgebung.js`) |
| `test-regel-12.js` | Regel §12 Phase A (v0.154.0): die echten Konto-Dateien gegen eine Firebase, die die ECHTE Regel auswertet (`regel-nachbau.js`) — Regeltext (JSON, byte-gleich Konzept, §11c-Zeilen), Nummern-Codes, Lese-Kaskade, Umstieg alt → §12 samt „§12 nachziehen" (zweimal = dasselbe), Aussenmessung, Lesewege ohne `spieler` ganz, Anmelden (Name, Name#Nummer, Auswahl, Gast, unbekannt, freigegeben), Freund suchen nur Name#Nummer, Nummer ändern (ein Schritt, Wettlauf), Anlegen mit neuem Würfeln, Gast/Gast sichern, Neu verbinden, Entfernen, Marke nur bei öffentlichen Änderungen, `stufe` durchgereicht, Auszug = voller Fortschritt, Gegenproben, 401 mitten im Lauf |
| `test-name-tag.js` | Name und klein #Nummer bei allen (v0.155.0; bis v0.154.0 `test-keine-nummer.js`): Freunde-Karte und Rangliste im nachgebauten DOM |
| `test-rundenstart.js` | Rundenstart (v0.155.1): Partie beenden → Abschluss wegwischen → neue Runde zeigt kein altes Ergebnis, die alte ist genau einmal gebucht und abgehakt; ungesehene alte Partie still gebucht; gegen Bob sofort `laeuft`, Seite zugelost in der ersten Fassung, fest beim Neuladen, mal Weiss, mal Schwarz; Seite selbst wählen und Menschen-Runden unverändert |
| `test-team-max.js` | Höchstens 3 je Team (v0.155.2): Modell (`teamBeitreten`, `teamVoll`, auch Bot und Nachzügler), alte Partien mit mehr Spielern, Bildschirm (nicht wählbar, „voll · 3/3", Zufall nie ins volle Team) |
| `test-spielzeit.js` | Spielzeit und „dabei seit" (v0.155.0): Rechnung in `fortschritt.js` (Grenze je Schritt, seit = früheres Datum, Anzeige „N min"/„Nh+", Haken Standard privat, Auszug nur mit Haken), Zählen nur bei sichtbarer Seite, Gast→Konto-Umzug, Einbindung; Auszug- und Spielzeit-Teil stehen im Kern-Baustein (bis v0.160.0: Vergleich mit Typolucks `fortschritt.js` — den ersetzt der Byte-Vergleich in `test-bausteine-quelle.js`); Intro-Streifen (`INTRO._raenderDecken`, `html.intro-offen`) |

Dazu kommt **`bildschirm-umgebung.js`** — die gemeinsame Testumgebung der drei
Bildschirm-Testdateien (nachgebautes DOM, echte `js\`-Dateien im vm-Kontext,
Ausgangslage). Sie ist bewusst **keine** Testdatei: Sie beginnt nicht mit
`test-`, wird vom Läufer also nicht gestartet, und erzeugt selbst keine
Prüfungen. Jede der drei Testdateien lädt sie per `require()` und bekommt so
ihre eigene, frische Umgebung.

Ebenso keine Testdatei: **`regel-nachbau.js`** (seit v0.154.0) — wertet die
Firebase-Regel-Ausdrücke wirklich aus (`.read`-Kaskade, `.write` je Pfad,
`.validate` samt `$anderes`, `newData.parent()`, `auth.provider`) und stellt
eine ganze Firebase (Anmeldung + Datenbank über REST) nach. Nachbau ist nicht
Firebase: Die Gegenprobe gegen den Emulator steht aus (SICHERHEIT.md §14).

Und **`kleines-dom.js`** (seit v0.162.0) — ein kleines Dokument für Tests, die
echte Bausteine fahren, die ihr Markup als Text setzen (`innerHTML` setzen und
lesen, `outerHTML`, `querySelector(All)`/`closest`/`matches` für einfache
Auswahlen, `dataset`, `classList`, `click()` mit Aufsteigen). Gemessen und
gezeichnet wird nichts. Heute nutzt es nur `test-sammlung-a.js`.

Und **`fortschritt-laden.js`** (seit v0.160.1) — lädt den Fortschritt wie der
Browser: erst den Kern-Baustein `js\fortschritt-kern.js` als
`FORTSCHRITT_KERN`, dann `js\fortschritt.js`, und stellt das Ergebnis als
`FORTSCHRITT` bereit (der Kern ruft seine Glieder über diesen Namen). Jede
Testdatei, die `FORTSCHRITT` per `require` braucht, lädt diese Datei; wer in
einem eigenen vm-Kontext arbeitet, setzt `fortschritt-kern.js` vor
`fortschritt.js` (und `speicher-konten.js` nach `speicher.js`) in seine
Dateiliste.

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
| Service Worker (v0.106.0) | sieben Wächter über `sw.js`: übersetzbar; der Speichername nennt GENAU EINMAL dieselbe Nummer wie `konfig.js` und `CHANGELOG.md`; die Liste `DATEIEN` deckt sich **in beide Richtungen** mit dem, was in `js\`, `css\`, `icons\` und `img\` wirklich liegt; Nicht-GET und fremde Herkunft steigen VOR dem `respondWith` aus (Firebase darf nie aus dem Speicher kommen) und die Datenbank-Adresse steht nicht in `sw.js`; `BEIM_BAUEN` erkennt `localhost`/`127.0.0.1`; aufgeräumt werden nur Speicher, die mit `blunderluck-` beginnen; `js\app.js` meldet den Worker an, abgesichert gegen alte Browser und `file://` |

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
| Zuletzt gespielt | `letzteMitspieler` liest die Chronik: die richtigen Personen, neueste Partie zuerst, ohne mich selbst, ohne die ausgeschlossenen Kennungen (der Computer), ohne Doppelte, höchstens `ZULETZT_ANZAHL`; überlebt das Löschen der Partie und Einträge ohne Zeitpunkt |

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
| Einladen-Fenster | die zuletzt Bespielten stehen oben und tragen ihren Zusatz, ein Nicht-Freund taucht nicht auf (F17), schon Eingeladene fallen weg, der Code steht weiter im Fenster, ein Suchfeld wird angefordert |
| Suche im Dialog | gegen das ECHTE `dialog.js` in eigenem Kontext: Tippen blendet aus, was nicht passt (Gross-/Kleinschreibung egal), ohne Treffer sagt es die Liste, das leere Feld bringt alle zurück — und ohne Suchtext bleibt der Dialog genau der von vorher |
| Globaler Fehlerfang (v0.105.0) | gegen das ECHTE `app.js` samt `wunsch.js` in eigenem Kontext: beide Horcher (`error`, `unhandledrejection`) sind angemeldet, ein Fehler baut GENAU EINEN Streifen mit Neu-laden, Melde-Weg und Schliessen, weitere Fehler erhöhen nur die kleine Zahl, `console.error` bekommt trotzdem jeden — und der Melde-Knopf öffnet das Wunsch-Formular mit der technischen Meldung schon darin |

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
