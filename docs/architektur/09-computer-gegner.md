# Blunderluck — Architektur / Der Computer-Gegner

Der gebaute Stand des Bots (`js\schach-bot.js`, seit v0.27.0, vier Stufen seit
v0.28.0, Seitenwahl seit v0.29.0). Diese Datei ist am 24.08.2026 aus der
`CLAUDE.md` hierher gezogen worden — sie betrifft nur, wer am Bot arbeitet.

**Drei Orte, drei Aufgaben — nicht verwechseln:**

| Wo | Was dort steht |
|---|---|
| Kopf von `js\schach-bot.js` | das Suchverfahren, erklärt am Code |
| diese Datei | wie der Bot in die App eingehängt ist, und was nie aufgeweicht wird |
| [../entwurf-bot.md](../entwurf-bot.md) | die Herleitung: alle Messwerte, die verworfenen Entwürfe, die Anleitung „WIE nachgemessen wird", Ausbau 2 und 3 |

## Wie er eingehängt ist

- **Der Bot ist ein Team-Mitglied** mit der festen Kennung `bot` und KEINEM
  Eintrag in der Spielerliste.
- **Er enthält keine Schachregel.** Er wählt nur aus `SCHACH.alleZuege` aus —
  gerechnet wird auf dem Gerät eines Mitspielers.
- **Angestossen wird er in `TEAM_SCHACH._botAnstossen`**, am Ende jedes
  Zeichnens einer offenen Partie.
- **Gesucht wird mit Negamax und Alpha-Beta.** Die vier Stufen unterscheiden
  sich in Suchtiefe, Ruhesuche und Stellungsbewertung (`SCHACH_BOT.STUFEN`);
  die Stufe der Partie steht in `regeln.botStufe`.
- **`regeln.botStufe` ist ein additiver Vertragsteil:** Leer heisst „aus
  v0.27.0" und spielt weiter wie bisher, neue Runden starten auf „Mittel".
  Gedeutet wird der Text NUR in `SCHACH_BOT` — `schach-runde.js` lädt vorher
  und darf dessen Tabelle nicht kennen.

## Er steigt erst beim „Bereit" ein (seit v0.29.0)

`rundeStarten` legt eine Bot-Runde LEER an, der Mensch wählt seine Seite, und
`SCHACH_BOT.beiBereitDazuholen` setzt den Computer gegenüber. Grund: Ein
Teamwechsel ist im Modell verboten — säße der Computer schon da, könnte der
Mensch seine Seite nicht mehr wählen.

**Deshalb gibt es zwei Fragen, die NICHT dieselbe sind:**

- `botVorgesehen` — die Runde will einen Computer (erkannt an `regeln.botStufe`)
- `istBotPartie` — es sitzt einer drin

Wer sie verwechselt, lässt den Bot zu früh oder gar nicht einsteigen. Zwischen
„Spielen" und „Bereit" gibt es eine Computer-Runde ohne Computer.

## Vier Dinge nie aufweichen

- **Der Bot liest von einer Lootbox nur die Feldnummer** — er spickt nicht.
- **Seine Wahl wird gerechnet, nie gewürfelt.** Auch die Zugsortierung ist
  stabil, damit dasselbe Brett denselben Zug ergibt.
- **Haupt- und Ruhesuche haben GETRENNTE Arbeitsbudgets.** Mit einem
  gemeinsamen spielte „Meister" schwächer als „Schwer"
  (`../entscheidungen/erkenntnisse.md`).
- **Eine Stufe wird ganz gerechnet oder gar nicht** (iterative Vertiefung). Ein
  abgebrochener Durchgang vergleicht tief gerechnete mit überschlagenen Zügen
  und ist schlechter als keiner.

## Wer eine Zahl dreht, spielt sie aus

„Stärker" ist eine Behauptung, die ein Turnier belegen muss, kein Einzelspiel.
Die vier Stufen sind ausgespielt, nicht geschätzt (je 16 Partien: 16:0, 14:1,
14:2). Das Messen übernimmt der Subagent `nachmesser`; die Wegwerf-Skripte
dafür gehören NICHT ins Projekt.

**Punkte gibt es gegen den Computer nicht** — für niemanden, festgenagelt durch
drei Prüfungen in `tests\test-rangliste.js`.

**Was noch offen ist:** Der Bot setzt bis heute KEINE Fähigkeiten ein (Ausbau 3
in `../entwurf-bot.md`). Die Bedenkzeit `SCHACH_BOT.BEDENKZEIT_MS` (1000 ms seit v0.77.0, davor 700) und
die Stufen-Budgets sind am Bürorechner gemessen — ein Handy ist ein Mehrfaches
langsamer.
