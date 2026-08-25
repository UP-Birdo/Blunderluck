# Blunderluck - Entscheidungen / Entschieden - und warum

## Acht Festlegungen zum Rundenablauf und zum Spiel-Bildschirm (v0.34.0 bis v0.70.0)

> **Hierher gezogen am 26.08.2026 aus der `STATUS.md`.** Sie standen dort im
> Uebergabe-Block und waren damit an EINER Stelle gesichert, die sich selbst
> als "darf weg" bezeichnet — beim Aufraeumen waeren sie verloren gegangen.
> Eine Entscheidung gehoert nicht in einen Stand, sondern hierher.

- **Die Seite wird ZUGELOST** (v0.66.0, Vorgabe): Wer die Runde betritt,
  bekommt seine Farbe und gilt damit als bereit; der Seitenwahl-Bildschirm
  erscheint nur mit abgeschaltetem Haken. Wer wartet, wartet am Brett.
- **Faehigkeiten sind Symbol-Karten, gestapelt UND ueberlappend** (v0.67.0),
  **in der Form einer Spielkarte** — hochkant, nicht quadratisch (v0.70.0,
  Masse an die Team-Karte gekoppelt in v0.71.0/v0.72.0). Der Team-Kasten
  traegt die Farbe gross, den ersten Namen klein darunter; weitere Spieler
  stehen hinter einem Tipp (v0.68.0).
- **Das "Zurueck" auf dem Seitenwahl-Bildschirm verlaesst die Runde**
  (v0.61.0, mit Rueckfrage ueber `DIALOG.frage`). Und: **"Neu aufstellen"
  fiel dort sofort weg**, statt uebergangsweise stehen zu bleiben — beides
  ausdruecklich so entschieden am 25.08.2026.
- **Die Spieler stehen als zwei Zeilen am Brett** (v0.53.0), Gegner oben.
  Zur Wahl standen: alles in die Leiste oben, oder hinter ein drittes Fach.
- **Nur die Nebensachen werden Icons — fertig.** Die IN-MATCH-Steuerung ist
  mit v0.59.0 zu Knoepfen am Spieler geworden (Zahnrad und Zugverlauf),
  "Einladen" mit v0.61.0 zum Zeichen-Knopf, der Wuerfel mit v0.62.0; "Runde
  verlassen" und "Zur Uebersicht" sind im "Zurueck" aufgegangen. "Bereit"
  und die drei Seitenwahl-Knoepfe behalten ihr Wort.
- **Sechs Kaestchen fuers Code-Feld** (v0.51.0). Der Wunsch war in sich
  widerspruechlich; wer das Feld anfasst, liest zuerst die Rechnung bei
  `.code-feld` in der Stildatei.
- **"Deine offenen Partien" ist weg**, dafuer fuehrt der Startbildschirm
  zurueck in die eigene Runde (v0.34.0/v0.35.0).
- **"Neu aufstellen" ist ein Wuerfel-Knopf**, kein Zuruecksetzen — nur bei
  Zufallsarmee (v0.42.0). Der gleichnamige Knopf an der BEENDETEN Partie
  startet dagegen die Revanche und ist unberuehrt. **Genau deshalb bekommt
  nur der erste das Wuerfel-Zeichen.**

## Die Seitenwahl gegen den Computer (24.08.2026, v0.29.0)

Nutzer-Ansage: „Wenn ich bot ja mach und die Schwierigkeit einstelle und dann
nach auf Start soll ich mir meine seite auswählen können und sobald ich auf
bereit klicke soll der Bot in die andere Gruppe joinen."

- **Bei Computer-Runden trägt `rundeStarten` NIEMANDEN mehr ein** — weder
  den Menschen noch den Computer. Der naheliegende Weg (den Menschen wie
  bisher nach Weiss setzen und ihn dann wechseln lassen) ist versperrt:
  `SCHACH_RUNDE.teamBeitreten` verbietet den Teamwechsel, und zwar aus einem
  guten Grund — bei Partien über mehrere Tage hiesse er, erst für die eine
  und dann für die andere Seite zu ziehen. **Wer die Wahl haben soll, darf
  gar nicht erst gesetzt werden.**
- **Daraus folgt eine neue Unterscheidung im Modell:** `botVorgesehen` (die
  Runde WILL einen Computer) gegen `istBotPartie` (es sitzt einer drin).
  Zwischen „Spielen" und „Bereit" gibt es eine Computer-Runde ohne Computer.
  Erkannt wird die Absicht an `regeln.botStufe` — ein eigenes Feld daneben
  wäre eine zweite Quelle für dieselbe Aussage.
- **Partien unter Menschen bleiben unverändert:** Wer anlegt, kommt gleich
  ins weisse Team. Dort gibt es nichts zu wählen — die Seite ist frei, bis
  jemand sie nimmt, und der Anlegende soll sich um nichts kümmern müssen.
- **Eine angelegte, nie betretene Runde räumt sich beim Verlassen weg**
  (`TEAM_SCHACH.selbstAngelegt`). Diese Lücke ist mit der Seitenwahl erst
  entstanden: Ohne Team gibt es nichts zu verlassen, also griff der
  Aufräum-Weg von v0.26.0 nicht. Drei Bedingungen müssen zusammenkommen —
  DIESES Gerät hat sie angelegt, es sitzt kein Mensch darin, sie hat nie
  begonnen —, sonst löschte ein Besucher die frische Runde eines anderen.

## Vier Schwierigkeitsstufen für den Computer (24.08.2026, v0.28.0)

Nutzer-Ansage: „recherchire wie ein schach bot funktioniert und baue
verschiedene schwirigkeits grade ein … und auch vier schwirichkeitsstufen wo
man umstellen kann." Dazu bekräftigt: keine Punkte gegen den Bot, auch nicht
für den Bot. Verfahren, Messwerte und die verworfenen Entwürfe stehen
vollständig in [../entwurf-bot.md](../entwurf-bot.md); hier nur, was
entschieden wurde.

- **Die Stufen unterscheiden sich in drei Stellschrauben** — Suchtiefe,
  Ruhesuche, Stellungsbewertung —, nicht über eine künstliche Fehlerquote.
  In der Literatur ist eine „Blunder-Rate" üblich (der Bot spielt mit einer
  gewissen Wahrscheinlichkeit absichtlich einen zufälligen Zug). Hier
  abgelehnt: Ein Bot, der ohne Grund etwas Sinnloses tut, wirkt kaputt, nicht
  schwach. „Leicht" ist stattdessen ein Bot, der EHRLICH nur einen Halbzug
  weit sieht — er verschenkt Figuren, aber jeder seiner Züge hat einen Grund.
- **Umgestellt wird VOR der Runde**, nicht mittendrin. Die Stufe gehört zur
  Partie (`regeln.botStufe`), wie jede andere Einstellung auch; die Reihe
  steht unter dem Computer-Haken in den Grundeinstellungen. Ein Umschalten in
  der laufenden Partie wäre ein Schreibvorgang in den gemeinsamen Stand und
  ein Knopf mehr in der ohnehin vollen Fussleiste — falls es gewünscht ist,
  ist es ein eigener Punkt.
- **Zwei verschiedene Vorgaben, mit Absicht.** Neue Runden starten auf
  „Mittel" (`STUFE_VORGABE`); eine Runde OHNE Angabe — also aus v0.27.0 —
  spielt auf „Leicht" (`STUFE_ALTBESTAND`). Die eiserne Regel „laufende
  Partien müssen laufen bleiben" verlangt das: In v0.27.0 gab es nur eine
  Spielstärke, und das war die von „Leicht".
- **Die Stufe steht im Datenvertrag, das OB nicht.** Ob ein Computer
  mitspielt, steht in den Teams; wie stark er spielt, hat keine zweite Quelle
  und muss dem rechnenden Gerät bekannt sein. GEDEUTET wird der Text nur in
  `SCHACH_BOT` — `schach-runde.js` lädt vorher und darf dessen Tabelle nicht
  abfragen.
- **Ein Arbeitsbudget je Stufe statt einer Zeitmessung.** Eine Grenze über
  `Date.now()` wäre einfacher, machte den Bot aber von der Geschwindigkeit
  des Geräts abhängig — dasselbe Brett ergäbe auf zwei Geräten verschiedene
  Züge, und die Tests könnten nichts mehr nachrechnen. Gezählt werden
  deshalb ANGESEHENE FELDER: eine Zahl, die nur von der Stellung abhängt.
- **Keine Punkte gegen den Computer — bestätigt und jetzt festgenagelt.** Die
  Regel galt schon seit v0.27.0; der Nutzer hat sie am 24.08. ausdrücklich
  bekräftigt („auch der bot soll keine punkte bekommen"). Seither prüfen
  drei Tests in `test-rangliste.js` beide Hälften: Der Mensch bekommt nichts,
  der Computer taucht gar nicht erst als Zeile auf, und Partien unter
  Menschen zählen unverändert weiter.

## Der Computer-Gegner, Stufe 1 (24.08.2026, v0.27.0)

Auftrag des Nutzers: den Bot einordnen und bauen. Die Bauvorlage mit allen
Stufen steht in [../entwurf-bot.md](../entwurf-bot.md); hier nur, was
entschieden wurde und warum.

**Vier Entscheidungen, die den Umbau klein gehalten haben:**

- **Der Bot ist ein Team-Mitglied, keine neue Art von Spieler.** Seine
  Kennung `bot` steht in `teams.schwarz` wie jede andere. Damit gilt für ihn
  ohne eine Zeile Sonderfall alles, was schon da war: Zugrecht, Zugzähler,
  Verlauf, Bilanz, Beute.
- **Kein neues Feld im Datenvertrag.** Ob ein Computer mitspielt, steht
  schon in den Teams (`SCHACH_BOT.istBotPartie`). Ein zusätzliches
  `regeln.gegenComputer` wäre eine zweite Quelle für dieselbe Aussage — und
  zwei Quellen laufen auseinander (dieselbe Lehre wie „eine Regel steht
  genau einmal"). Der Haken lebt nur in der Geräte-Erinnerung des Starts.
- **`istBotPartie` liest die Teams DIREKT, ohne `normalisieren`.** Die Frage
  wird auch an Chronik-Einträge gestellt (Rangliste), und die haben keinen
  Spielstand. Über `normalisieren` würde für jede beendete Partie ein Brett
  aufgebaut — bei jedem Zeichnen, also alle drei Sekunden.
- **Abstimmung aus in Bot-Runden.** `einigkeit` wird beim Anlegen still auf
  `false` gesetzt: Man ist allein in seinem Team, und der Computer stimmt
  über nichts ab. Die Geräte-Erinnerung bleibt unberührt — für die nächste
  Runde gegen Menschen gilt der Haken wieder.

**Zwei Entscheidungen OHNE Rückfrage getroffen** (beide sind
Spielgefühl-Fragen; wenn der Nutzer sie anders will, ist es je eine Zeile):

- **Partien gegen den Computer zählen nicht für die Rangliste.** Die
  gemeinsame Tabelle vergleicht Menschen. Ein Bot der Stufe 1 schaut nicht
  voraus und ist leichte Beute; wer gegen ihn spielt, sammelte Punkte, für
  die niemand etwas riskiert hat. Die Partie bleibt vollständig in der
  Chronik stehen, nur `RANGLISTE.schachPunkte` und `RANGLISTE.verlauf`
  lassen sie aus. **Zurücknehmen:** die beiden `istBotPartie`-Prüfungen in
  `rangliste.js` entfernen. Der Bot selbst taucht in der Tabelle auch dann
  nicht auf — sie baut ihre Zeilen aus der Spielerliste, und dort hat er
  keinen Eintrag.
- **Der Bot spickt nicht.** Von einer liegenden Lootbox liest er nur, DASS
  sie daliegt — nie `art`, `stufe` oder `pech`. Technisch käme er heran, der
  Stand liegt offen in der Datenbank. Genau deshalb steht die Regel im Kopf
  von `schach-bot.js` und wird geprüft: Dieselbe Stellung mit einer guten
  und mit einer Unglücks-Box muss denselben Zug ergeben. Ein Bot, der
  Unglückskisten meidet, während der Mensch sie nicht sieht, gewinnt mit
  Wissen, das im Spiel gar nicht vorgesehen ist.

**Was Stufe 1 bewusst NICHT kann:** vorausschauen (Stufe 2) und Fähigkeiten
einsetzen (Stufe 3). Beides steht mit Vorgehen und Kostenfalle in der
Bauvorlage und ist in der `ROADMAP.md` eingeordnet.

## Bündel A: Konto, Startbildschirm, Code, Freunde, Einladungen (23./24.08.2026)

Nutzer-Vorgabe, in mehreren Gesprächsrunden entstanden und in **acht
Auslieferungen** gebaut (v0.6.0 bis v0.13.0). Die vollständige Bauvorlage
samt aller 19 Fragen UND ihrer Antworten ist
[../entwurf-konto-und-startbildschirm.md](../entwurf-konto-und-startbildschirm.md)
— sie bleibt das Nachschlagewerk für jedes Warum dieses Umbaus. Kurzfassung
der Nutzer-Entscheidungen:

- **Anmeldung als Vollbild** mit Benutzername und Passwort (4–8 Zeichen,
  alte 4-stellige PINs gelten weiter); wer angemeldet ist, fliegt nie raus.
- **Drei Seiten** (Fähigkeiten / Start / Rangliste), Einstellungen als
  Zahnrad oben rechts; das Vorschaubild zeigt die eingestellte Spielart.
- **Die Anmeldung führt direkt in die eigene laufende Partie** — und
  während sie läuft, zeigt die App NUR das Brett (bewusst gegen den
  offenen Zurück-Weg entschieden). **Eine laufende Partie je Person.**
- **Keine öffentliche Partienliste mehr:** Hinein kommt man über den
  gerechneten **Beitritts-Code** (gilt bis Partie-Ende, Nachzügler
  erlaubt) oder — unter Freunden — über **Einladungen** (Banner in der
  offenen App, verschwindet nach 10 s; kein Push, F15).
- **Freundes-System „gross gedacht"**: jeder schreibt nur die eigene
  Sicht, die Beziehung wird gelesen; niemand wird blossgestellt.

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
