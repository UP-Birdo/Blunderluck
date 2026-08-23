# Quizz - Entscheidungen / Versions-Historie (Warum je Version)

## Versions-Historie

### v2.0 — 2026-08-02

Die Fähigkeiten-Spielart, ausgebaut von zwei festen auf zehn erscheinende
Fähigkeiten in fünf Stufen. Der größte Eingriff ins Regelwerk seit v1.4.

Getragen hat ihn die Aufteilung in vier Arten: Zehn Fähigkeiten, aber nur vier
Mechaniken, und der Bildschirm kennt nur die vier. Die Regelarbeit steckte
weniger im Bauen als im Ausschließen — jede der drei Ausnahmen für den König
ist eine Antwort auf die Frage „was passiert damit mit Schachmatt".

Meilenstein: Voll-Backup unter `Backup\Quizz\v2.0\`.

### v1.6 bis v1.9 — 2026-08-02

Vier kleine Bauten an der Bedienung des Brettes, alle aus der Praxis gemeldet:
sichtbare Zugvorhersage (v1.6), Vorschaubilder der Spielarten (v1.7), Rochade
über den Turm samt Begründung (v1.8), Pfeil für den letzten Zug (v1.9).

Bemerkenswert daran ist, wie wenig neuer Code nötig war: Die Vorschaubilder
entstehen aus der vorhandenen Aufstellung, der Pfeil aus den vorhandenen
Verlaufsangaben. Beides sind Sachen, die es nur deshalb fast umsonst gab, weil
die Daten schon an der richtigen Stelle lagen — die Spielarten als Tabelle,
der Zugweg im Verlauf.

Einziger echter Regeleingriff: `SCHACH.rochadeLage`. Und der war nötig, weil
eine korrekte Regel als Fehler gemeldet wurde.

### v1.5 — 2026-08-01

Fähigkeiten und die Rangliste. Die Fähigkeiten waren der Teil mit den meisten
Fallen: Sie greifen mitten in die Zugerzeugung ein, und der Sprung musste auch
in `_feldBedroht` nachgetragen werden — sonst hätte der König in ein Feld ziehen
dürfen, das eine gesprungene Figur bedroht. Genau dafür gibt es dort einen Test.

Die Rangliste war dagegen klein, weil beide Spiele ihre Punkte schon selbst
rechnen konnten. Sie musste nur addieren und sortieren.

**Neu ist eine Art Test, die es hier vorher nicht gab:** `test-bildschirm.js`
baut ein winziges DOM nach und zeichnet jeden Bildschirm einmal. Anlass war der
Umfang — fünf Spielarten, zwei Ansichten, eine neue Tabelle —, den von Hand
durchzuklicken bei jeder Änderung zu viel ist. Er hat sich beim Bauen sofort
bezahlt gemacht.

Seine Grenze steht ausdrücklich in seinem Kopf: Er sagt nichts über das
Aussehen. Ein Test, dessen Grenzen nicht dabeistehen, verleitet dazu, sich mehr
auf ihn zu verlassen, als er trägt.

Meilenstein: Voll-Backup unter `Backup\Quizz\v1.5\`.

### v1.4 — 2026-08-01

Mehrere Partien nebeneinander und die Spielarten — der größte Umbau seit v1.0.

Zwei Dinge haben ihn getragen: Erstens die Trennung der Schichten aus v1.0. Die
Regeln mussten nur lernen, mit anderen Maßen zu rechnen; von Partien, Teams und
Tafel wissen sie weiterhin nichts. Zweitens die Vorgabe, dass laufende Partien
weiterlaufen — sie hat den Entwurf auf den einzig richtigen Weg gezwungen:
denselben Pfad behalten und den alten Stand erkennen, statt daneben etwas Neues
aufzumachen.

Die Umrechnungen `feldNummer`, `feldName`, `spalteVon`, `reiheVon` haben die
Maße als wahlfreie Parameter mit Vorgabe 8 bekommen. Dadurch blieb jeder
bestehende Aufruf gültig, und die 25 Regeltests aus v1.0 liefen unverändert
weiter — sie sind der Beweis, dass das klassische Schach unangetastet blieb.

### v1.3 — 2026-08-01

Aussehen und Bedienung: blaues Brett, gleitende Züge, Handy-Ansicht. Klein im
Umfang, aber mit einer Erkenntnis, die bleibt: Eine Bewegung, die nur der
Auslöser sieht, ist keine halbe Lösung, sondern eine falsche. Erst weil der Weg
im gespeicherten Verlauf steht, sehen alle dasselbe.

### v1.0 — 2026-07-31

Team Schach als zweiter Tab. Der Umbau, den es dafür brauchte, war kleiner als
erwartet: Speicher- und Abgleich-Schicht mussten nur ihre Datenfunktionen von
aussen bekommen (`leereDaten`, `inhaltGleich`, optional `zusammenfuehren`),
statt fest auf `MODELL` zu zeigen. Danach war das zweite Spiel ein Zusatz und
kein Eingriff.

Die Schachregeln liegen bewusst in einer eigenen Datei ohne jede Kenntnis von
Teams, Speicher oder Bildschirm — 25 Tests decken sie ab, die Partie mit ihren
Teams weitere 17.

Beim Aufbau ist eine Falle im eigenen Werkzeug aufgefallen: Die Aufruf-Prüfung
in `test-syntax.js` fand `SCHACH.` auch mitten in `TEAM_SCHACH.` und meldete
fünfzehn Fehler, die keine waren. Behoben mit einem Rückblick im Suchmuster.
Lehre: Ein Prüfmuster auf Bezeichner braucht immer eine Wortgrenze.

### v0.9 — 2026-07-31

Zwei Absicherungen: Die neue Runde verlangt das Verwaltungs-Passwort, und jeder
Spieler muss eine PIN haben. Beides schließt Wege, auf denen jemand ohne
Berechtigung etwas Unumkehrbares auslösen konnte.

### v0.8 — 2026-07-31

Drei Dinge auf einmal: Punktesystem mit Teilpunkten samt Erklärung unter dem
i-Knopf, die Behebung des Überschreib-Fehlers (siehe „Teuer erkaufte
Erkenntnisse") und ein Auslieferungs-Skript.

Das Punktesystem und der Fehler hängen enger zusammen, als es scheint: Beide
drehen sich darum, dass mehrere Leute gleichzeitig an einem Datensatz arbeiten.
Beim Punktestand ist das gewollt (jeder sieht denselben Stand), beim Schreiben
war es der Fehler.

Das Deploy-Skript folgt dem Haus-Muster (PowerShell, GitHub-Schnittstelle,
Token per DPAPI) und schreibt bewusst **einen einzigen Commit** für alle
Dateien: GitHub Pages baut nach jedem Commit neu und erlaubt nur wenige
Bauvorgänge je Stunde.

### v0.7 — 2026-07-31

Profil-Knopf für Name und PIN. Klein, aber er schließt eine Lücke aus v0.6: Wer
sich vertippt hatte oder anders heißen wollte, musste bis dahin von der
Verwaltung entfernt werden.

Wiederverwendet wurde `DIALOG.liste` aus der Anmeldung — dieselbe Bauform für
„wähle eines von mehreren", statt eines zweiten Menü-Musters.

### v0.6 — 2026-07-31

Beide TODO-Punkte des Nutzers umgesetzt: PIN je Spieler mit Anmeldung über eine
Mitspieler-Liste, dazu ein Verwaltungs-Zugang, der Spieler entfernen darf.

Technisch war der Kniff, dass sich das Verfahren des Würfel-Siegels
wiederverwenden ließ — dieselbe Prüfsummen-Idee, anderer Zweck. Neu ist nur,
dass das Salz hier offen liegen MUSS: Beim Siegel bleibt es geheim, weil nur der
Besitzer prüft; bei der PIN muss jedes fremde Gerät prüfen können.

Die Grenzen sind oben unter „Was die PIN leistet" ehrlich festgehalten, damit
sich niemand — auch kein späterer Claude — darauf verlässt, was sie nicht kann.

### v0.5 — 2026-07-31

Keine Regeländerung, sondern eine Korrektur der Beschriftung: Die Nummern an den
Eingabefeldern widersprachen der Zählregel. Merksatz für später — wenn der
Nutzer nachfragt, ob eine Regel wirklich so gilt, liegt der Fehler meist nicht
in der Regel, sondern in ihrer Darstellung.

Meilenstein: Voll-Backup unter `Backup\Quizz\v0.5\`.

### v0.4 — 2026-07-31

Der Nutzer wies darauf hin, dass die Mitspieler nicht im selben Netz sind,
sondern über mobile Daten spielen. An der Erreichbarkeit ändert das nichts
(GitHub Pages und Firebase liegen beide im Internet), wohl aber an der
Sparsamkeit: Die Abfrage ruht jetzt, solange die Seite im Hintergrund liegt.

### v0.3 — 2026-07-31

Zwei Wünsche des Nutzers: jeder deckt nur für sich auf, und die eigenen Zahlen
sollen sich verstecken lassen (Grundzustand verdeckt).

Der erste Wunsch klingt nach einer Vereinfachung, zieht aber eine neue Regel
nach sich: Ohne Sperre könnte man auf jemanden tippen, der schon aufgedeckt hat.
Diese Sperre sitzt jetzt im Modell. Der gemeinsame Zustand `phase` wurde damit
überflüssig — er bleibt als Altbestand im Datenvertrag stehen, wird aber nicht
mehr ausgewertet.

Der zweite Wunsch führte zu einem gezeichneten Augen-Symbol (kein Emoji) und zu
der Festlegung, den Zustand NICHT zu speichern: Nach jedem Laden ist wieder
verdeckt, sonst würde der Knopf seinen Zweck verfehlen.

### v0.2 — 2026-07-31

Aus der Tabelle wird das Spiel. Der Nutzer beschrieb den eigentlichen Zweck:
gemeinsames Raten über die Würfel der anderen mit Auflösung am Ende.

Kern der Fassung ist das Siegel — ohne es wäre das Spiel auf einer öffentlichen
Datenbank nicht spielbar, weil jeder Mitspieler die Würfel der anderen
nachschlagen könnte. Der Datenvertrag wurde auf Fassung 2 gehoben
(`zeilen` → `spieler` mit Tipps, Phase und Siegel); alte Stände werden von
`normalisieren()` übernommen. Die Oberfläche wurde von einer Tabelle auf Karten
umgestellt, weil das Spiel auf dem Handy stattfindet.

### v0.1 — 2026-07-31

Erstes Gerüst nach dem ursprünglichen Wunsch: Tabelle mit Freitext-Namen und
fünf Auswahlfeldern, Zeilen frei erweiterbar, ein Tab **Würfel Quizz**.
Aufgeteilt in Schichten, damit die Datenlogik ohne Browser testbar bleibt und
der Speicher austauschbar ist.
