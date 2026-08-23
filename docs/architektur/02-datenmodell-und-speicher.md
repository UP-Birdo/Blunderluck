# Quizz — Architektur / Datenmodell, Siegel, Auge, Speicher-Schicht, Abgleich

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
Fehlerkette steht in `DECISIONS.md`, „Die Seite fror ein, bis der Gegner zog".

**Wer eine dritte Rückwand baut, gibt ihr ebenfalls ein Zeitlimit.**

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
  nachzulesen in [DECISIONS.md](DECISIONS.md).
- Ausgenommen sind Aktionen, die absichtlich fremde Einträge ändern (neue Runde,
  Spieler entfernen). Sie rufen `aendern(daten, neuZeichnen, true)` und
  schreiben den Stand unverändert.
- Schlägt das Schreiben fehl, bleibt die Änderung offen und wird erneut
  versucht; der Kopf zeigt den Fehler an.
