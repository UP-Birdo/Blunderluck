# Team Schach — die eisernen Regeln, Wegweiser

**Diese Datei ist die Pflichtlektüre vor jeder Arbeit am Team Schach.** Sie ist
kurz, und das ist ihr Zweck: Was hier steht, gilt immer; alles Übrige steht in
der Themendatei, die das Vorhaben berührt — **und nur die wird gelesen.**

Bis v0.103 war die Pflichtlektüre EINE Datei von 36 KB. Sie wurde am Stück
gelesen, auch die neun Zehntel, die das jeweilige Vorhaben nichts angingen, und
sie wuchs mit jeder Runde weiter. Dieselbe Aufteilung hat die Architektur-Doku
schon (`docs\architektur\`) und aus demselben Grund.

**Wer eine Regel ergänzt, tut es in der Themendatei — nicht hier.** Diese Datei
wächst nur, wenn wirklich eine Regel dazukommt, die JEDE Arbeit am Schach
betrifft. Und: Fallgeschichten („bis v0.98 war das so, dann fiel auf …") gehören
in `..\entscheidungen\erkenntnisse.md`, nicht in eine Regel. Die Regel sagt, was
gilt; die Erkenntnis sagt, warum wir es gelernt haben.

Die spielübergreifenden Regeln (Stand/Abgleich, Geheimnisse, Datenvertrag,
Stil) stehen in der [CLAUDE.md](../../CLAUDE.md) — sie gelten zusätzlich.

## Die vier Sätze, die immer gelten

Wer nur diese vier kennt, baut nichts kaputt, was sich nicht reparieren liesse:

1. **Laufende Partien müssen laufen bleiben.** Datenfelder werden nur ERGÄNZT,
   nie umbenannt oder gelöscht; wo eine Rechnung sich ändert, entscheidet eine
   **Fassung**, ob die Partie schon nach der neuen rechnet (`bonusFassung`,
   `bauernZugFassung`, `armeeFassung`). Eine Partie ohne Fassung rechnet weiter
   wie vorher.
2. **Eine Regel steht genau einmal, und zwar im Modell.** Der Bildschirm fragt
   `SCHACH` bzw. `SCHACH_RUNDE` und zeigt an — er rechnet nie selbst. Wo eine
   Liste möglicher Aktionen und die Prüfung beim Ausführen auseinanderlaufen,
   lügt die Anzeige.
3. **`Math.random()` hat im Modell nichts zu suchen.** Wo gewürfelt wird, wird
   aus der Partie-Kennung gerechnet (`SCHACH_RUNDE._zufallsWert`) — sonst sieht
   jedes Gerät ein anderes Brett.
4. **König und Matt bleiben unangetastet — von Fähigkeiten.** Kein Item führt
   direkt zu Schach, Matt oder Patt (`SCHACH_RUNDE._wirkungVerboten`, seit
   v0.95). Die einzige Ausnahme ist das Unglück, das eine Fähigkeit beim
   Einsetzen aufsammelt.

## Die drei Themendateien

Nur die öffnen, die das Vorhaben berührt.

| Datei | Wann sie zu lesen ist |
|---|---|
| [10-brett-und-stand.md](10-brett-und-stand.md) | Brettmasse, Spielarten, Kreuz-Bretter, Bauern und Startseiten, Zufallsarmee und Figurenzahl, Risse und Mauern, Zugwege, was im Stand steht |
| [20-faehigkeiten.md](20-faehigkeiten.md) | Fähigkeiten und Lootboxen: was sie kosten dürfen, was sie mit König und Matt dürfen, Zielfelder und Zusatzwahl, die Bildanleitungen |
| [30-anzeige.md](30-anzeige.md) | Bildschirm: Ebenen, Markierungen, Zugspur, Bedienung eines Zuges, Wortwahl |

## Zwei Stellen, an denen fast jeder Umbau vorbeikommt

Sie stehen hier, weil sie sich nicht einem Thema zuordnen lassen — und weil das
Übersehen jedes Mal teuer war:

- **`SCHACH._ausfuehren` baut den neuen Stand als LITERAL, nicht als Kopie.**
  Jedes Feld, das dort nicht aufgezählt ist, ist nach dem nächsten Zug weg. Wer
  ein Feld im Stand ergänzt, trägt es DORT ein; ein Test in `test-schach.js`
  vergleicht die Schlüssel vorher und nachher und fängt das Vergessen ab.
- **`SCHACH.figurMarkenVerschieben` ist die eine Stelle für alles, was an einer
  FIGUR hängt** — Startseite, Erstzug-Recht, Schild, Fessel. Wer eine fünfte
  solche Angabe erfindet, trägt sie dort ein. Der gemeinsame Nenner: Geschoben
  zu werden ist kein Zug.
