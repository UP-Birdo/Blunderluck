# Quizz — Architektur / Rangliste und Spielerprofil

## Rangliste

Der dritte Tab hat **keinen eigenen Stand**: Er liest die beiden vorhandenen und
zeigt sie zusammen. Das ist die einzige Stelle, an der sich die Spiele berühren,
und sie ist bewusst einseitig — die Rangliste schreibt nichts. Nähme man den Tab
weg, änderte sich an keinem Spiel etwas.

Die Punkte des Würfel-Quizz kommen unverändert aus `MODELL.ergebnis()`. Die
Schachpunkte rechnet `RANGLISTE.schachPunkte()` aus den **beendeten** Partien;
Zahlen, Rechnung und Erklärungstext stehen wie überall im Haus in derselben
Datei, damit die angezeigte Regel nicht von der gerechneten abweichen kann.

Grundlage der Namen ist der Würfel-Quizz — dort steht, wer mitspielt. Wer dort
entfernt wurde, verschwindet auch aus der Rangliste; sonst stünden Kennungen
ohne Namen darin.

### Das Spielerprofil (seit v3.3)

Ein Tipp auf einen Namen öffnet sein Profil: Es beantwortet die Frage „wie ist
der an seine Punkte gekommen?" mit jeder beendeten Partie und jeder aufgelösten
Imposter-Runde einzeln — Zeitpunkt, Dauer, Zugzahl, Gegner, Mitspieler und die
Punkte, die dabei heraussprangen (`RANGLISTE.verlauf()`).

Drei Festlegungen, die man kennen muss:

- **Die Einzelposten und die Summe stammen aus DERSELBEN Rechnung.**
  `schachPunkteJePartie()` wird von beiden benutzt — von der Gesamtsumme und vom
  Profil. Zwei getrennte Rechnungen wären zwei Wahrheiten, und ausgerechnet das
  Profil soll ja die Summe erklären. Ein Test hält fest, dass die Einzelposten
  zusammengezählt die Summe ergeben.
- **Der Würfel-Quizz taucht nicht einzeln auf.** Er kennt nur die laufende
  Runde; eine neue überschreibt die alte, eine Chronik hat er bewusst nicht.
  Statt eine Zeile zu erfinden, sagt das Profil das offen.
- **Was fehlt, wird weggelassen — nicht geschätzt.** Partien von vor v3.3 haben
  keine Startzeit und keine Zugzahl (`begonnenAm`/`zuege` = 0). Dann steht die
  Angabe einfach nicht da. Neu mitgeführt wird `gestartetAm` in der Partie
  (gesetzt, wenn beide Seiten bereit sind — und nur beim ERSTEN Mal, damit „Neu
  aufstellen" die Dauer nicht zurückdreht).

### Wer darf löschen? (seit v3.3)

Eine Partie oder einen Raum zu löschen verlangt das Verwaltungs-Passwort
(`VERWALTUNG.verlangen`). Beim Imposter ist der Grund zwingender als beim
Schach: Ein aufgelöster Raum ist der EINZIGE Ort, an dem seine Punkte stehen —
eine Chronik wie beim Schach gibt es dort nicht. Wer ihn wegwirft, nimmt allen
Mitspielern ihre Punkte.

Die Abfrage stand vorher dreimal fast wortgleich im Code. Sie liegt jetzt in
`js/verwaltung.js`; wer etwas schützen will, ruft sie auf und prüft das
Ergebnis. Was der Schutz leistet und was nicht, steht im Kopf jener Datei.
