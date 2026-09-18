# Blunderluck — Architektur / Datenmodell, Siegel, Auge, Speicher-Schicht, Abgleich

## Datenmodell

Ein einziger Datenstand hält die ganze Runde:

    {
        "datenVersion": 2,
        "geaendertAm": 1750000000000,
        "phase": "raten",
        "spieler": [
            {
                "id": "3f2c…",
                "name": "Anna",
                "pruefwert": "9ab3…",
                "festgelegtAm": 1750000000000,
                "festlegungen": 1,
                "wuerfel": [],
                "aufgedeckt": false,
                "bestaetigt": false,
                "tipps": { "<id des Ziels>": ["1", "", "STERN", "", ""] }
            }
        ]
    }

| Feld | Bedeutung |
|---|---|
| `datenVersion` | Fassung des Datenvertrags; steuert die Nachrüstung. |
| `geaendertAm` | Zeitpunkt der letzten Änderung. Nur informativ — der Vergleich zweier Stände ignoriert ihn bewusst. |
| `phase` | **Ohne Wirkung seit v0.3.** Stammt aus der gemeinsamen Auflösung; seither deckt jeder für sich auf. Das Feld bleibt im Vertrag und wird durchgereicht, ausgewertet wird es nirgends. |
| `spieler[].id` | Unveränderliche Kennung. Sie verbindet Gerät, Tipps und Bildschirm. |
| `spieler[].name` | Frei gewählter Anzeigename. |
| `spieler[].pinPruefwert` | Prüfsumme der PIN, `""` wenn keine hinterlegt ist. Die PIN selbst steht nirgends. |
| `spieler[].pinSalz` | Zufallssalz zur PIN. Steht offen — jedes fremde Gerät muss die PIN prüfen können. |
| `spieler[].pruefwert` | Das Siegel des eigenen Wurfs, `""` solange nicht festgelegt. |
| `spieler[].festgelegtAm`, `festlegungen` | Wann und wie oft festgelegt wurde — Transparenz gegen heimliches Nachbessern. |
| `spieler[].wuerfel` | **Leer, bis aufgedeckt wird.** Danach genau fünf Werte. |
| `spieler[].aufgedeckt` | Hat das Gerät dieses Spielers seinen Wurf freigegeben? |
| `spieler[].bestaetigt` | Passte der freigegebene Wurf zum Siegel? |
| `spieler[].tipps` | Eigene Vermutungen, je Ziel-Kennung fünf Werte. |

Erlaubte Würfelwerte: `"1"` bis `"5"`, `"STERN"` und `""` (nichts gewählt).

### Der wichtigste Satz zum Datenmodell

**Vor dem Aufdecken stehen die echten Würfel nirgendwo im gemeinsamen Stand.**
`normalisieren()` verwirft Würfel bei Spielern, die nicht aufgedeckt haben —
selbst wenn jemand sie von Hand in die Datenbank schriebe, würde die App sie
nicht anzeigen.

### Aufdecken je Person, und was daraus folgt

Seit v0.3 gibt es keine gemeinsame Auflösung: Jeder gibt seinen eigenen Wurf
frei, wann er will (`MODELL.aufdecken`, ausgelöst nur vom eigenen Gerät). Daraus
folgt zwingend eine zweite Regel, ohne die das Spiel kaputt wäre:

**Sobald ein Spieler aufgedeckt hat, weist `MODELL.tippSetzen` jede weitere
Vermutung auf ihn ab.** Sonst könnte man nach dem Aufdecken in Ruhe die
richtigen Werte eintragen. Die Sperre sitzt im Modell, nicht im Bildschirm-Code —
die Oberfläche zeigt für aufgedeckte Spieler schlicht keine Eingabefelder mehr.

Die Bestenliste ist damit immer ein Zwischenstand: `MODELL.ergebnis()` zählt nur
gegen Spieler, die bereits aufgedeckt haben.

### Additiver Datenvertrag — die Nachrüst-Regel

1. Felder werden **nur ergänzt**, nie umbenannt und nie gelöscht.
2. Jeder geladene Stand läuft durch `MODELL.normalisieren()`: fehlende Felder
   werden ergänzt, Würfellisten auf fünf gültige Werte gebracht, ungültige Werte
   verworfen, fehlende Kennungen vergeben.
3. Fassung 1 kannte statt `spieler` noch `zeilen` mit offen sichtbaren Würfeln.
   Solche Stände werden übernommen: Namen bleiben, die Würfel gelten als nicht
   festgelegt.
4. Jede Erweiterung bekommt dort ihren Fall **und** einen Test in
   `tests\test-modell.js`.

## Siegel — warum niemand spicken kann

Die gemeinsame Ablage ist öffentlich lesbar. Stünden die echten Würfel darin,
könnte jeder Mitspieler sie nachschlagen. Deshalb:

1. **Festlegen:** Das Gerät erzeugt ein Zufallssalz (16 Byte) und berechnet
   `SHA-256("wuerfel-quizz|" + sortierte Würfel + "|" + Salz)`. Veröffentlicht
   wird nur diese Prüfsumme.
2. **Geheim bleibt:** Würfel und Salz liegen allein im Browser-Speicher des
   Besitzers (`ich.js`).
3. **Aufdecken:** Das Gerät des Besitzers veröffentlicht Würfel und Ergebnis der
   eigenen Prüfung; `bestaetigt` sagt, ob beides zusammenpasst.

Sortiert wird vor dem Rechnen, weil die Reihenfolge im Spiel bedeutungslos ist.
Ohne Salz könnte man alle 252 möglichen Würfe durchprobieren — mit Salz nicht.

Grenzen, bewusst so:

- Nur das Gerät des Besitzers kann aufdecken. Wer das Gerät wechselt, trägt
  seinen Wurf dort neu ein; das zählt als erneutes Festlegen und ist für alle
  sichtbar.
- Ein neues Festlegen ist erlaubt, wird aber mit Anzahl und Uhrzeit angezeigt.
- Die Krypto-Funktion des Browsers gibt es nur in sicherem Zusammenhang (HTTPS
  oder localhost). Fehlt sie, läuft die Runde ohne Siegel weiter, und die App
  sagt das.

## Das Auge — eigene Zahlen verstecken

Ein Schalter in der eigenen Karte (`WUERFEL_QUIZZ.wuerfelSichtbar`) blendet die
eigenen Würfel aus und ersetzt sie durch fünf Platzhalter. Drei Festlegungen
dazu:

- **Standard ist verdeckt.** Wer die Seite öffnet, während jemand daneben sitzt,
  verrät nichts.
- **Der Zustand wird absichtlich nirgends gespeichert** — weder im Gerät noch im
  gemeinsamen Stand. Nach jedem Laden ist wieder alles zu; das ist die sichere
  Voreinstellung und spart eine Einstellung, die niemand pflegen muss.
- **Er wirkt auch auf die Eingabe.** Solange zu, erscheinen statt der
  Auswahlfelder Platzhalter mit dem Hinweis, das Auge anzutippen. Ein
  `select`-Feld lässt sich nicht sinnvoll maskieren, also wird es weggelassen.

Das Symbol ist ein gezeichnetes SVG (offenes Auge mit Pupille, geschlossenes Lid
mit Wimpern) — kein Emoji, wie es die Haus-Regel verlangt.

## Speicher-Schicht

Beide Rückwände bieten dieselbe Schnittstelle:

| Feld/Methode | Bedeutung |
|---|---|
| `art` | `"lokal"` oder `"gemeinsam"` |
| `beschreibung` | Satz für die Statusanzeige im Kopf |
| `laden()` | Versprechen auf einen bereits normalisierten Stand |
| `speichern(daten)` | Versprechen; wirft bei Fehler |

**`SpeicherLokal`** legt den Stand im Browser-Speicher ab — sinnvoll nur zum
Ausprobieren, weil dann niemand mitspielt.

**`SpeicherGemeinsam`** spricht eine Firebase Realtime Database über deren
REST-Schnittstelle an: `GET …/<pfad>.json` zum Laden, `PUT` zum Schreiben. Kein
SDK, keine fremde Bibliothek, kein Bauschritt.

### Jeder Aufruf hat ein Zeitlimit (seit v3.9)

`ZEITLIMIT_LADEN_MS` (8 s) und `ZEITLIMIT_SPEICHERN_MS` (12 s), umgesetzt mit
`AbortController`. Laden darf kürzer sein — es wird ohnehin alle paar Sekunden
wiederholt; Speichern bekommt mehr Zeit, dahinter steht ein Zug, den jemand
wirklich machen wollte.

**Das ist keine Feinheit, sondern die Bedingung dafür, dass die Bedienung nicht
einfriert.** `fetch` gibt von sich aus NIE auf; ein hängender Aufruf blockierte
das ganze Brett (`ziehtGerade`) und die Abfrage gleich mit. Die ganze
Fehlerkette steht in `entscheidungen\00-INDEX.md`, „Die Seite fror ein, bis der Gegner zog".

**Wer eine dritte Rückwand baut, gibt ihr ebenfalls ein Zeitlimit.**

### In Teilen statt als Ganzes (seit v0.114.3)

**Gemessen am 18.09.2026:** Der ganze Schach-Stand war 192 Kilobyte, eine
einzelne Partie 8, die Chronik 9, die Marke 13 Byte. Bis v0.114.2 lud und
schrieb jeder Zug die ganze Tafel — zweimal 192 Kilobyte je Zug, ein
„Bereit" mit Nachkontrolle das Doppelte, und die regelmässige Abfrage holte
bei jeder fremden Änderung alles. Die Tafel wächst mit jeder beendeten
Partie; 34 der 37 waren beendet und wurden trotzdem jedes Mal mitgeladen.

`SpeicherGemeinsam` hat dafür zwei weitere Leitungen, die nichts über den
Inhalt wissen:

| Methode | Bedeutung |
|---|---|
| `teilLaden(unterpfad, flach)` | `GET …/<pfad>/<unterpfad>.json`; mit `flach` nur die Schlüssel (`?shallow=true`) |
| `teilSchreiben(aenderungen)` | `PATCH …/<pfad>.json` mit Pfad → Wert; mehrere Knoten in EINEM Schritt, atomar; `null` löscht |

**WAS geholt und geschrieben wird, entscheidet `SCHACH_SPEICHER`**
(`js\schach-speicher.js`). Der Stand liegt unter denselben Pfaden wie
vorher — additiv kommt ein Knoten dazu:

    <pfad>/geaendertAm         die Marke (13 Byte), wie seit v0.111.0
    <pfad>/partien/<id>        eine Partie (~8 KB), wie bisher
    <pfad>/chronik/<n>         die Chronik-Einträge, wie bisher
    <pfad>/uebersicht/<id>     NEU: Ergebnis, läuft, Zeitstempel, Teams (~150 Byte)

Der Übersichts-Eintrag (`SCHACH_TAFEL.uebersichtEintrag`) wird bei jedem
Schreiben der Partie im selben Schritt gesetzt; sein Zeitstempel ist der
des SCHREIBENS (die Marke der Tafel), nicht der der Partie. Er ist ein
Abbild, keine zweite Wahrheit: Fehlt er (Altbestand), wird die Partie
geholt und der Eintrag nachgetragen.

**Die Wege:**

- **Start und immer ohne offene Partie** (`tafelLaden`): drei kleine
  Abfragen auf einmal — Übersicht (5 KB bei 34 Partien), Schlüssel der
  Partien, Schlüssel der Chronik. Daraus: fremde beendete Partien NIE
  holen (niemand sieht sie an); eigene beendete EINMAL holen und im
  Gerätespeicher merken („Vorrat", `blunderluck.partien-vorrat`, höchstens
  `VORRAT_HOECHSTENS` = 60, die jüngsten); offene nur, wenn der
  Zeitstempel ihres Eintrags nicht der zuletzt gesehene ist; die Chronik
  nur bei geänderter Anzahl.
- **In einer offenen Partie** (`partieAuffrischen`): bei jeder
  Marken-Änderung erst der eigene Übersichts-Eintrag (150 Byte); die
  Partie (8 KB) nur, wenn er neuer ist. Eine fremde Partie, in der jemand
  zieht, kostet einen also 150 Byte, nicht 192 Kilobyte.
- **Schreiben** (`schreiben`): je genannter Partie `partien/<id>` (oder
  `null` = löschen) und `uebersicht/<id>`, dazu `geaendertAm` — eine
  Mehrpfad-Änderung. Ist die Partie beendet, kommt ihr Chronik-Eintrag ans
  Ende der Server-Chronik, nachdem nachgesehen wurde, dass er dort fehlt
  (ein Ergebnis zählt nie zweimal). Die Stelle ist die nächste freie
  Nummer; zwei Partien, die in derselben Sekunde auf zwei Geräten enden,
  könnten sie sich streitig machen — der eine Rest ohne Transaktion, so
  selten wie zwei gleichzeitige Matts.

**Der Abgleich weiss davon nur eines:** Er bekommt vom Schach einen eigenen
Ladeweg (`rueckrufe.laden(alles)`, `rueckrufe.brauchtAlles()`) und führt
ZWEI gesehene Marken: `markeGesehen` für den zuletzt geholten Teil,
`markeGanzGesehen` für den letzten vollen Stand. Wer aus der Partie auf
den Start zurückkommt, vergleicht mit der ganzen Marke und holt einmal
nach, was er in der Partie verpasst hat (nur die geänderten Partien, dank
der Übersicht). Nach der Anmeldung stösst `vollNachladen()` einen vollen
Blick an — erst dann steht fest, wessen beendete Partien dazugehören.

**Warum nicht nur die letzte Bewegung laden?** Ein Zug ist rund 100 Byte,
die Partie 8 Kilobyte. Dann müsste aber jedes Gerät das Brett aus den
Zügen SELBST nachrechnen — und zwei Geräte, die einen Zug verschieden
verstehen (Fähigkeit, Lootbox, Zufallswert), hätten zwei Bretter. Die
Hausregel, dass der Stand IN der Partie steht und das Modell ihn schreibt,
ist mehr wert als die letzten sieben Kilobyte.

**Server-Filter (`orderBy`) gibt es nicht:** Die Datenbank lehnt sie ohne
Index-Regel mit HTTP 400 ab (gemessen 18.09.2026). Sollten sie je nötig
werden, braucht es in den Firebase-Regeln `".indexOn": ["ergebnis"]` unter
`team-schach/partien` — eine Nutzer-Aufgabe, siehe `docs\DEPLOYMENT.md`.

**Übergang:** Ein Gerät mit einer ÄLTEREN App-Fassung (vor v0.114.3)
schreibt weiterhin die ganze Tafel per PUT und nimmt dabei den
Übersichts-Knoten weg; die nächste neue Fassung holt dann einmal alle
Partien und baut ihn wieder auf. Mit `tools\Uebersicht-Nachruesten.ps1`
lässt er sich auch von Hand anlegen (etwa nach dem Zurückspielen eines
älteren Abzugs).

`speicherErzeugen(KONFIG)` wählt die Rückwand. Ist der gemeinsame Modus
eingestellt, aber keine Adresse hinterlegt, fällt die App auf `SpeicherLokal`
zurück und zeigt oben einen Hinweisbalken.

## Abgleich und gleichzeitiges Arbeiten

- Eingaben werden **verzögert** geschrieben (`schreibVerzoegerungMs`, 500 ms).
- Im gemeinsamen Modus fragt die App alle `abfrageIntervallMs` (3 s) nach dem
  aktuellen Stand — **aber nur, solange die Seite sichtbar ist**. Im Hintergrund
  ruht die Abfrage (`document.hidden`), beim Zurückkommen holt der Anschluss auf
  `visibilitychange` den Stand sofort nach. Gespielt wird über mobile Daten;
  eine Dauerabfrage über einen ganzen Tag wäre pure Verschwendung.
- **Solange eine eigene Änderung aussteht, wird kein fremder Stand übernommen.**
- Ein geholter Stand wird nur gezeichnet, wenn `MODELL.inhaltGleich()` einen
  echten Unterschied meldet.
- **Vor jedem Schreiben wird zusammengeführt.** `abgleich.js` holt den Stand vom
  Server und setzt mit `MODELL.zusammenfuehren()` nur den eigenen Eintrag
  hinein. Regel: **Jeder ist Herr über seinen eigenen Eintrag, alles andere
  kommt vom Server.** Ohne das löschte ein Gerät mit veraltetem Stand die
  Mitspieler weg, die sich inzwischen angemeldet hatten — der Fehler aus v0.8,
  nachzulesen in [entscheidungen\00-INDEX.md](../entscheidungen/00-INDEX.md).
- Ausgenommen sind Aktionen, die absichtlich fremde Einträge ändern (neue Runde,
  Spieler entfernen). Sie rufen `aendern(daten, neuZeichnen, true)` und
  schreiben den Stand unverändert.
- Schlägt das Schreiben fehl, bleibt die Änderung offen und wird erneut
  versucht; der Kopf zeigt den Fehler an.
