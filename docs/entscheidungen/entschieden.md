# Blunderluck - Entscheidungen / Entschieden - und warum

## Die Ausgliederung aus dem Quizz (23.08.2026)

Nutzer-Entscheidung: Das Team Schach zieht als eigene App **Blunderluck**
aus dem Quizz aus; das Quizz bleibt auf v0.122.0 eingefroren und wird nicht
mehr weiterentwickelt — neue Schach-Wünsche werden hier gebaut. Erwogen und
verworfen: das Quizz umzubenennen und Würfel/Imposter zu löschen (hätte zwei
live gespielte Spiele zerstört und die Prüfsummen-Zutaten entwertet, siehe
Quizz-Regel „Die Schreibweise Quizz bleibt").

Die wichtigsten Bau-Entscheidungen der Ausgliederung:

- **Der Imposter wurde entfernt** (Dateien, app.js-Verdrahtung, Rangliste,
  Tests).
- **Die Würfel-Schicht kam zunächst mit, flog aber sofort wieder raus**
  (v0.1.0 → v0.2.0): In v0.1.0 blieben `modell.js`/`wuerfel-quizz.js` als
  geerbte Anmeldung stehen (im Quizz seit v0.61 ohne eigenen Tab). Auf
  Nutzer-Ansage „Blunderluck soll NUR den Schach-Part beinhalten" wurde die
  Schicht in v0.2.0 durch eine schlanke Eigenentwicklung ersetzt:
  `spieler.js` (Datenvertrag nur noch id/name/pinPruefwert/pinSalz,
  Zusammenführen nach der Quizz-v0.8-Lehre) und `anmeldung.js` (derselbe
  erprobte Anmelde-Ablauf, Profil, Verwaltung). Der Anmelde-Ablauf wurde
  bewusst 1:1 aus dem Quizz übernommen, nur ohne Würfel-Felder; Profil und
  Verwaltung sind jetzt im Tab Einstellungen erreichbar (im Quizz hingen
  sie im unsichtbaren Würfel-Tab und waren faktisch unerreichbar).
- **Eigene Identität von Anfang an:** Prüfsummen-Zutaten `blunderluck-pin|`
  und `blunderluck-admin|` (das Wurf-Siegel entfiel mit den Würfeln in
  v0.2.0); Speicherpfade `spieler` und `team-schach`; Browser-Schlüssel
  `blunderluck.*`. Die einmalige Umbenennung war erlaubt, weil die App mit
  leerer Datenbank startet; ab der ersten echten Runde sind diese
  Zeichenketten unantastbar (`test-syntax.js` wacht).
- **Eigene Firebase-Datenbank statt Mitnutzung der Quizz-Datenbank** — sonst
  hingen beide Apps dauerhaft am selben Dienst und dieselben PINs/Salze
  müssten stimmen.
- **Version neu bei 0.1.0**, die Quizz-Zählung wurde nicht fortgeführt.
- **Bewusst NICHT aufgeräumt:** tote Würfel-/Imposter-Stile in
  `css\stil.css`, Quizz-Begriffe in `docs\WORTLISTE.md` und Teilen der
  geerbten Doku — Aufräumen steht in der ROADMAP, Funktionsfähigkeit ging vor.

## Nutzer-Entscheidungen (geerbt aus dem Quizz)

### Beim Anlegen (2026-07-31)

| Frage | Entscheidung |
|---|---|
| Wo liegen die Daten? | **Gemeinsam für alle Besucher** — nicht je Gerät getrennt. Die Folgen (Fremddienst, öffentlich schreibbar) wurden ausdrücklich in Kauf genommen. |
| Wohin auf GitHub? | **Eigenes Repository** mit eigener Pages-Adresse. |
| Zeilen | Name als **Freitext**, Zeilen **frei erweiterbar**. |
| Spalten | **Fest**: Name, danach fünf Würfel-Spalten. |

### Der eigentliche Zweck (2026-07-31, kurz nach v0.1)

Die Seite ist kein Formular, sondern ein **Ratespiel**: Alle würfeln fünf
Würfel, halten sie geheim, stellen sich über den Tag Fragen und tragen ihre
Vermutungen über die anderen ein. Am Ende wird aufgelöst. Vorgabe war
ausdrücklich, es **so einfach wie möglich** zu halten und die Ausgestaltung zu
entscheiden. Daraus folgten die Entscheidungen unten.

### Aufdecken und Verstecken (2026-07-31, zu v0.3)

| Wunsch | Umsetzung |
|---|---|
| Auflösen soll jeder nur für sich selbst | Der gemeinsame Auflösen-Knopf entfällt. Jeder hat **Meine Würfel aufdecken** in seiner eigenen Karte; die anderen raten weiter. |
| Augen-Knopf, der die eigenen Zahlen versteckt, standardmäßig an | Auge in der eigenen Karte, Grundzustand verdeckt, Zustand wird nicht gespeichert. |


## Wo die Begründungen liegen

Diese Datei war bis 19.08.2026 eine einzige Sammlung mit 126 KB — jedes
„liest vorher entschieden.md" kostete damit ein Drittel eines Chat-Kontexts.
Seitdem stehen hier nur noch die Nutzer-Entscheidungen (oben); alle
Begründungs-Abschnitte liegen **unverändert** in drei Themendateien:

| Datei | Inhalt |
|---|---|
| [entschieden-grundlagen.md](entschieden-grundlagen.md) | Würfel Quizz, PIN/Siegel, Firebase/Technik, Tabs |
| [entschieden-bis-v3.md](entschieden-bis-v3.md) | Team Schach und Imposter bis v3.8 (08/2026) |
| [entschieden-ab-v0-41.md](entschieden-ab-v0-41.md) | Team Schach seit v0.41 (SemVer-Zeit) |

**Das Abschnitts-Verzeichnis mit Anmerkungen führt allein der
[00-INDEX.md](00-INDEX.md)** — dort nachschlagen, dann in der Themendatei den
Abschnitt über seine Überschrift ansteuern, nie eine ganze Datei lesen.
Neue Abschnitte: in die passende Themendatei schreiben UND im Index eintragen.

## Timer-Modus: Zeitablauf kostet den Zug, nicht die Partie (Ansage 2026-08-20)

**Nutzer-Ansage:** „Wenn beide Spieler 2 mal hintereinander nicht gezogen
haben in der Zeit, soll das Spiel geschlossen werden, und der gewinnt mit der
höheren Punktzahl."

Das beantwortet die Frage, an der der Timer-Modus (S8/V2) seit dem Einordnen
hing: Wer gibt den Zug ab, wenn niemand die Seite offen hat?

**Die Antwort ist gut, weil sie das eigentliche Problem umgeht.** Ein Timer,
der bei Ablauf die Partie verliert, verlangt eine verlässliche Uhr — und die
gibt es hier nicht: Niemand ist verpflichtet, die Seite offen zu halten, und
ein Gerät im Hintergrund fragt die Datenbank nicht. Wer unter dieser Bedingung
„Zeit abgelaufen heisst verloren" baut, verschenkt Partien an Funklöcher.

Hier verliert der Zeitablauf **nur den Zug**. Beide Seiten dürfen versäumen,
ohne dass etwas kaputtgeht; erst wenn VIER Versäumnisse in Folge zeigen, dass
niemand mehr davor sitzt, schliesst die Partie — und dann entscheidet der
Stand auf dem Brett, nicht der Zufall, wer zuletzt online war. Ein einziger
echter Zug setzt den Zähler zurück.

**Folge für den Bau:** Die Uhr muss nicht laufen, sie muss nur nachrechenbar
sein. Es genügt ein Zeitstempel am letzten Zug; jedes Gerät rechnet beim
Zeichnen, wie viele Fristen seither verstrichen sind. Damit bleibt die
eiserne Regel „im Modell wird gerechnet, nicht gewürfelt" unangetastet, und
es braucht keinen neuen Schreibweg.

**Offen bleibt** (beim Bauen zu entscheiden, siehe ROADMAP V2): welche
„Punktzahl" zählt. Vorschlag ist die Material-Bilanz — sie ist im Spiel
sichtbar und braucht keine neue Regel; bei Gleichstand endet die Partie
unentschieden.

## Der Timer entscheidet nach dem FRIEDHOF, nicht nach dem Brett (Ansage 2026-08-20)

**Nutzer-Ansage, im Anschluss an die Timer-Regel:** „Mach das Gewinnen anhand
der vorliegenden Zahl abhängig aus dem Friedhof — das ist der Ablagestapel,
die Figuren die du wiederholen kannst. Daran soll dann entschieden werden, ob
gewonnen wird oder nicht."

Damit ist mein Vorschlag (Material-Bilanz auf dem Brett) **überholt**. Es
zählt der Friedhof.

**Warum das nicht dasselbe ist.** Die Bilanz zählt, was noch STEHT; der
Friedhof zählt, was GEFALLEN ist. In einem normalen Schachspiel wäre das
dieselbe Aussage von zwei Seiten — hier nicht: Es gibt Wiederbelebung,
Wiedergeburt, Beschwörung und geliehene Figuren. Eine Seite kann Figuren
verloren und wiederbelebt haben; auf dem Brett sieht sie dann heil aus,
im Friedhof nicht. Der Nutzer wählt also ausdrücklich die Sicht auf den
VERLAUF der Partie, nicht auf ihren Augenblick.

**KEINE Rückfrage nötig — der Code beantwortet es.** Kurz sah es nach einem
Widerspruch aus („höhere Punktzahl" gegen „voller eigener Friedhof heisst viel
verloren"). Am Code nachgemessen löst er sich auf: Der FRIEDHOF zeigt einer
Seite die Gräber des GEGNERS — `_grabAuf` nimmt `gefallen[gegner(meinTeam)]`,
nur die Wiederbelebung greift auf die eigenen zu. „Die Figuren, die du
wiederholen kannst" sind also die, die du dem Gegner ABGENOMMEN hast. Eine
grosse Zahl heisst „ich habe viel geschlagen", und die höhere Zahl gewinnt —
genau wie in der ersten Ansage.

**Gebaut wird es mit `SCHACH_RUNDE.beuteWert(runde, farbe)`**, das es seit
langem gibt: Figurenwert dessen, was eine Seite geschlagen hat. Bei
Gleichstand endet die Partie unentschieden.
