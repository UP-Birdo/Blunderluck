# Team Schach — Anzeige und Bedienung

Eine der drei Themendateien der eisernen Regeln. Wegweiser und die Regeln,
die IMMER gelten: [00-INDEX.md](00-INDEX.md).

Hier drin: Ebenen und Markierungen, Zugspur und Verlaufseinträge, wie ein
Zug bedient wird, die Wortwahl am Bildschirm.
## Anzeige und Bedienung

- **Der Figurenzähler kommt aus der STELLUNG, nicht aus den Verlustlisten**
  (`SCHACH_RUNDE.materialWert` / `materialVorsprung`, seit v0.76). Hier
  entsteht und verschwindet Material, ohne dass jemand schlägt (Umwandlung,
  Wiedergeburt, Verstärkung, Nachschub, Einsturz) — Beute minus Verluste ist
  deshalb die falsche Rechnung. `bilanz.punkte` bleibt daneben bestehen: Daran
  hängt die Beute-Wertung der Rangliste, und die ist festgeschrieben.
- **Der Abschluss-Bildschirm drängt sich nie in eine laufende Partie.** Sonst
  verdrängt eine alte, nie weggeklickte Partie alle drei Sekunden das Brett.
- **Ein Verlaufseintrag trägt `von`/`nach` nur, wenn er WIRKLICH eine Bewegung
  beschreibt** (seit v0.76) — sonst `-1`. Daran hängen Zugspur und die
  gleitende Bewegung: Der Unglücks-Eintrag trug bis v0.75 das Feld der Lootbox
  als Ziel, und beide zeichneten einen Weg, den nie jemand gegangen ist. Was
  eine Wirkung bewegt hat, steht ausschliesslich in `wege`. **Und ein Halbzug
  besteht aus MEHREREN Einträgen** (Zug, Einsammeln, Unglück, neue Lootboxen);
  wo zwei davon sehenswert sind, werden auch beide gezeichnet — `_letzteSpur`
  zeigt den Zug grün und das Unglück gelb, je Feld statt als ein Schalter für
  alles (`erkenntnisse.md`, „Ein Eintrag, der sich als Bewegung ausgab").
- **Zustand im Bildschirm, der sich auf den Spielstand bezieht, trägt den
  Zugzähler dazu** (`auswahlZaehler`, `animiertBis`, `wirkungBis`). Ohne ihn
  überlebt er die nächste Änderung: Die Zielpunkte blieben so nach einem Zug auf
  dem Brett stehen, obwohl man gar nicht mehr am Zug war.
- **Ebenen kommen aus der Stildatei, nie aus dem Bauteil** (seit v0.94). Die
  vier Stufen stehen als Variablen ganz oben in `css\stil.css`:
  `--ebene-feldmarke` (1 bis 5, alles IM Brettfeld), `--ebene-leiste` (10,
  klebende Leisten), `--ebene-schwebend` (50) und `--ebene-dialog` (100). Wer
  sich eine Zahl selbst ausdenkt, baut den Fehler von v0.94 nach: Eine
  Schachfigur lag über dem Knopf „Abbrechen", weil die klebende Knopfleiste
  keine Nummer hatte. **Ein Hintergrund verdeckt nur, was VOR ihm gezeichnet
  wird** — Elemente mit positiver Nummer kommen danach.
- **Jede Markierung auf dem Brett ist zweifarbig** — heller Rand, dunkler Kern.
  Das Brett hat helle UND dunkle Felder; eine einzelne Farbe verschwindet immer
  auf einer der beiden. Genau so ging in v1.5 die Zugvorhersage verloren (blauer
  Punkt auf blauem Feld). Gilt für Zielfelder, Schlagfelder und die Pfeile der
  Bildanleitung.
- **Ein Zug wird immer gleich bedient:** Figur antippen, Zugpunkt antippen —
  auch die Rochade (König antippen, Zugpunkt antippen). Der zweite Weg über das
  Turmfeld ist in v0.44 auf Nutzer-Entscheidung ausgebaut worden; wer ihn
  wiederhaben will, liest vorher `entscheidungen\entschieden.md`.
- **Warum eine Regel nicht greift, erklärt das Regelwerk** — nicht der
  Bildschirm. `SCHACH.rochadeLage` liefert den Grund, `team-schach.js` zeigt ihn
  nur an. Sonst stünden die Bedingungen zweimal im Programm.
- **Die Box im Team Schach heisst für den Nutzer „Lootbox"** (seit v0.68,
  Wunsch #25) — im Singular weiblich: *die* Lootbox. Wer einen sichtbaren Text
  schreibt, benutzt dieses Wort; die schlechten heissen **Unglücks-Lootbox**,
  der Haken **Lootbox-Regen**. **Die Bezeichner im Code bleiben, wie sie sind**
  (`bonus`, `wuerfel`, `_wuerfelBauen`, `.wuerfel`, `pechZeigen`): Sie stecken
  in jeder laufenden Partie und in den Firebase-Daten, und ein Umbenennen wäre
  ein Bruch des additiven Datenvertrags ohne jeden Gewinn. **Im Würfel Quizz
  bleiben Würfel Würfel** — das sind welche.
