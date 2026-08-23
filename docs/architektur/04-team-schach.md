# Quizz — Architektur / Team Schach: Regeln, Spielarten, Faehigkeiten, Bildschirm

## Team Schach

Das zweite Spiel liegt in fünf Schichten, streng getrennt. Jede weiß nur, was
sie wissen muss:

| Datei | Aufgabe | Weiß nichts über |
|---|---|---|
| `schach-varianten.js` — Spielarten | Maße und Sonderregeln als reine Tabelle | alles Übrige |
| `schach.js` — Regeln | Brett, Züge, Schach, Matt | Teams, Spieler, Speicher, Bildschirm |
| `schach-runde.js` — eine Partie | Teams, Zugrecht, Verlauf, Fähigkeiten | Sammlung, Speicher, Bildschirm |
| `schach-tafel.js` — alle Partien | anlegen, einsetzen, entfernen, sortieren | Regeln, Bildschirm |
| `team-schach.js` — Bildschirm | Übersicht, Brett, Bedienung | Regeln (fragt immer `SCHACH`) |

**Eigener Pfad in der Datenbank** (`KONFIG.speicher.schachPfad`), eigener
Abgleich, eigener Stand. Die beiden Spiele wissen nichts voneinander;
gemeinsam ist ihnen nur `ich.js` — wer an diesem Gerät sitzt. Angemeldet wird
im Würfel-Quizz, weil dort Namen und PINs liegen; das Schach liest den Namen
über `WUERFEL_QUIZZ.abgleich.daten` nur zur Anzeige.

### Mehrere Partien nebeneinander (seit v1.4)

Unter dem Schach-Pfad liegt nicht mehr eine Partie, sondern eine **Tafel**:

    {
        "datenVersion": 2,
        "geaendertAm": 1750000000000,
        "partien": {
            "start":  { … eine Partie … },
            "p-l3k9": { … }
        }
    }

Die Partien sind ein **Objekt mit Kennungen als Schlüssel**, keine Liste:
Firebase macht aus einer Liste mit Lücken ohnehin ein Objekt, und das Einsetzen
einer einzelnen Partie ist so eine einzige Zuweisung.

**Der Umstieg ist die wichtigste Eigenschaft dieser Schicht.** Ein Stand von
früher sieht aus wie eine Partie (er hat `stand` und `teams` an der Wurzel, aber
kein `partien`). `SCHACH_TAFEL.normalisieren()` erkennt das und macht daraus die
Partie mit der Kennung `start` und dem Titel *Erste Partie*. Eine angefangene
Partie läuft damit ohne Bruch weiter. `tests\test-schach-tafel.js` prüft das
Feld für Feld — wer daran etwas ändert, bricht laufende Partien.


**Jede Partie merkt sich ihre Geburtsversion** (`angelegtMit`, seit v0.77) —
die App-Version, mit der sie angelegt wurde. Sie ändert an keiner Rechnung
etwas; die Übersicht zeigt sie nur dann, wenn sie von der laufenden Version
abweicht. Damit ist bei einer Meldung sofort klar, worauf sie sich bezieht.
Sie ist ausdrücklich KEIN Einfrieren: Warum laufende Partien nicht auf ihrer
Startversion festgehalten werden und warum der additive Datenvertrag das
eigentliche Problem schon löst, steht in `entscheidungen\entschieden.md`.

### Die Hausregel: keine Reihenfolge im Team

Jeder aus dem Team, das am Zug ist, darf ziehen (`SCHACH_RUNDE.darfZiehen`).
Damit bei zwei gleichzeitigen Zügen keiner verloren geht, trägt jede Partie
einen **Zugzähler**:

0. **Der Zug wird sofort angezeigt** (seit v3.8) — vor allem Netzverkehr. Er ist
   zu diesem Zeitpunkt bereits fertig gerechnet (`SCHACH_RUNDE.ziehen`), also
   kein Wunschbild. Gleichzeitig meldet sich der Bildschirm beim Abgleich an
   (`eigenerVorgangBeginnt`), damit dessen Abfrage nicht mit dem Stand von VOR
   dem Zug dazwischenfunkt.
1. `TEAM_SCHACH._sendenMitPruefung` lädt vor dem Schreiben den Stand vom Server.
2. Stimmt der `zugZaehler` **dieser Partie** nicht mehr mit dem erwarteten
   überein, hat jemand anders gezogen. Der eigene Zug wird **verworfen**, der
   fremde übernommen, und der Spieler bekommt eine Meldung.
3. Sonst wird die eigene Partie in den Stand vom Server eingesetzt
   (`SCHACH_TAFEL.partieEinsetzen`) und geschrieben.
4. Scheitert das Schreiben, wird der Stand von vorher wiederhergestellt und
   gesagt, warum. Auf einem Brett weiterzuspielen, das sonst niemand sieht,
   wäre schlimmer als ein Rücksprung.

Schritt 3 ist die zweite Hälfte derselben Regel: **Geschrieben wird nie die
eigene Tafel als Ganzes.** Sonst verschwänden Partien, die inzwischen woanders
angelegt oder gezogen wurden — genau der Fehler, der im Würfel-Quizz einmal
Mitspieler gelöscht hat (siehe DECISIONS.md).

**Die Anmeldung in Schritt 0 allein reicht nicht** (seit v0.76). Sie hält die
regelmässige Abfrage nur an, solange sie noch nicht losgelaufen ist:
`Abgleich.fremdenStandHolen` prüft seine Sperren VOR dem Netzaufruf, und der
dauert über mobile Daten ein bis zwei Sekunden. Kommt die Antwort danach, trägt
sie womöglich den Stand von vor dem eigenen Zug — und der nächste Zug scheitert
dann an Schritt 2, obwohl niemand sonst gezogen hat. Deshalb prüft
`fremdenStandHolen` **nach** dem Aufruf ein zweites Mal, und zusätzlich an einem
Zähler (`vorgangsZaehler`), ob dazwischen ein eigener Vorgang lief. Sichtbar
wurde das als „Doppelzug-Fehler": Nur dort folgen zwei eigene Züge unmittelbar
aufeinander (siehe `entscheidungen\erkenntnisse.md`).

Deshalb bekommt der Schach-Abgleich **kein** `zusammenfuehren`: Er schreibt gar
nicht. Alles Schreiben läuft über `TEAM_SCHACH._sendenMitPruefung`.

**Schritt 0 ändert an den Schritten 1 bis 3 nichts.** Wer zuerst drückt, hat
weiterhin gezogen — nur wird das Ergebnis früher gezeigt. Die Begründung steht
in `DECISIONS.md`, „Erst anzeigen, dann senden".

### Brett und Felder

Das Brett ist eine Zeichenkette aus `breite * hoehe` Zeichen, Feld 0 ist die
linke obere Ecke. Grossbuchstabe = weiss, Kleinbuchstabe = schwarz, Punkt =
leer; die Buchstaben sind die deutschen Anfangsbuchstaben (B, T, S, L, D, K).
Eine Zeichenkette statt einer Liste, weil Firebase sie unverändert speichert und
der Vergleich zweier Stände damit ein einziger Zeichenkettenvergleich ist.

**Die Maße stehen im Stand** (`breite`, `hoehe`), abgeleitet aus der Spielart.
Fehlen sie, gilt 8 mal 8 — deshalb rechnen alte Stände unverändert weiter. Die
Umrechnungen `feldNummer`, `feldName`, `spalteVon` und `reiheVon` nehmen die
Maße als **wahlfreie** Parameter mit Vorgabe 8; jeder Aufruf aus der Zeit vor
den Spielarten bleibt damit gültig.

Die Zugerzeugung ist zweistufig: `_rohzuege` liefert, was die Gangart erlaubt,
`zuege` filtert davon alles weg, wonach der eigene König im Schach stünde. Damit
sind Fesselungen automatisch abgedeckt, ohne Sonderfall.

`_feldBedroht` denkt bewusst rückwärts (von einem Feld aus suchen, wer es
angreift) statt alle gegnerischen Züge zu erzeugen — sonst entstünde über die
Rochade-Prüfung eine Endlosschleife.

### Ein eigenes Zielfeld ist kein Schlagfeld (seit v0.44)

Der rote Schlagring gilt nur für Zielfelder mit einer **gegnerischen** Figur.
Vorher hing er an „da steht irgendetwas" — und bei der Rochade steht dort die
eigene: Auf einem sechs Felder breiten Brett landet der König genau auf dem
Turm. Das Feld sah aus, als schlüge man ihn.

**Den zweiten Weg über das Turmfeld gibt es nicht mehr** (v1.8 bis v0.43,
ausgebaut auf Nutzer-Entscheidung). Die Bedienung ist damit überall dieselbe:
**König antippen, Zugpunkt antippen.** Der Rochadezug steht als ganz normaler
Königszug in `SCHACH.zuege`; auf einem sechs Felder breiten Brett liegt sein
Zugpunkt genau auf dem Turm. Der Bildschirm hat dafür keinen Sonderfall mehr —
`rochadeZiele` ist weg.

### Warum die Rochade sich erklären kann

`SCHACH.rochadeLage(stand, farbe)` liefert für beide Seiten, ob rochiert werden
darf — und wenn nicht, **warum nicht** (Recht verfallen, Figuren im Weg, König
im Schach, bedrohtes Feld auf dem Weg). Der Bildschirm zeigt diesen Satz an,
wenn der König angetippt ist.

Warum das ins Regelwerk gehört: Die Frage „warum darf ich gerade nicht
rochieren" ist eine **Regelfrage**. Beantwortete der Bildschirm sie selbst,
stünden die Bedingungen zweimal im Programm, und die zweite Fassung liefe der
ersten früher oder später hinterher. Ein Test prüft deshalb ausdrücklich, dass
`rochadeLage` und `zuege` dasselbe sagen.

Anlass war eine Meldung aus der Praxis, die Rochade sei kaputt. Sie war es
nicht: In der gemeldeten Stellung hatte Weiß längst rochiert, und bei Schwarz
standen noch Figuren im Weg. Eine korrekt gesperrte Rochade, die niemand
erklärt, sieht aber genauso aus wie ein Fehler — deshalb erklärt sie sich jetzt.
Die Stellung liegt als Test in `tests\test-schach.js`.

### Spielarten

Eine Spielart ist ein Eintrag in `SCHACH_VARIANTEN.liste` mit vier Schaltern,
die die Regeln lesen:

| Feld | Wirkung in `schach.js` |
|---|---|
| `breite`, `hoehe` | Maße des Bretts; alle Umrechnungen hängen daran. |
| `aufstellung` | Startbrett. |
| `rochade` | `false` schaltet die Rochade ganz ab (sie hängt an den festen Plätzen von König und Turm). |
| `koenigSchlagbar` | `true` heißt: kein Schach, kein Matt, kein Zugfilter. Der König ist eine Figur wie jede andere, und wer keinen mehr hat, verliert. Nötig für Bretter mit **zwei Königen je Seite** (Doppelbrett). |
| `koenigeAlsLeben` | `true` heißt: **zwei Könige sind zwei Leben** (seit v0.49). Solange eine Seite mehr als einen König hat, gilt für SIE dasselbe wie bei `koenigSchlagbar`; beim letzten kippt es zurück zu Schach und Matt. **Seit v0.51 auch ein Feld im STAND** — siehe unten. |
| `zufallsArmee` | `true` heißt: Die Aufstellung wird je Partie gerechnet (`SCHACH_RUNDE._armeeStand`). **Seit v0.51 ein Haken der Partie**; an der Spielart steht es nur noch für die versteckte Alt-Spielart `zufallsarmee`. |
| `bonusFelder` | Felder, auf denen Fähigkeiten liegen. |

**Eine neue Spielart kommt ans ENDE der Liste.** Die Partie-Kennungen in
`test-bildschirm.js` entstehen aus der Reihenfolge dieser Liste, und die
gerechneten Würfel hängen an der Kennung — ein Eintrag in der Mitte verschiebt
alles dahinter und lässt fremde Tests scheitern (beim Bau von v0.49 passiert).

Die Spielart steht in der Partie **und** im Brett-Stand. Die Partie ist die
Wahrheit; `SCHACH_RUNDE.normalisieren()` schreibt sie in den Stand, damit die
Regeln allein aus dem Stand arbeiten können.

#### Schlagbarer König: zwei Wege, eine Antwort

`SCHACH.koenigSchlagbarFuer(stand, farbe)` beantwortet die Frage „zählt der
König dieser Farbe gerade als gewöhnliche Figur?" — **je Farbe**, nicht je
Brett. Weiss kann zwei Könige haben und Schwarz einen; dann kennt Weiss kein
Schach und Schwarz schon, gleichzeitig.

Drei Stellen fragen sie, und alle drei mit der jeweils gemeinten Farbe:

| Stelle | Frage |
|---|---|
| `imSchach(stand, farbe)` | Kann DIESE Farbe überhaupt im Schach stehen? |
| `zuege` — Schlagfilter | Darf der König des GEGNERS geschlagen werden? |
| `zuege` — Selbstschach-Filter | Muss ich meinen EIGENEN König aus dem Schach halten? |

Wer stattdessen `variante.koenigSchlagbar` direkt abfragt, übersieht die zwei
Leben. `lage()` fragt beide Schalter: „kein König mehr" beendet die Partie in
beiden Fällen, danach trennen sich die Wege.

#### Die gerechnete Aufstellung

`SCHACH_RUNDE._armeeStand(stand, id, getrennt)` baut das Brett aus der
Partie-Kennung — gerechnet über `_zufallsWert`, nie gewürfelt (eiserne Regel).
Danach steht es als ganz gewöhnliches Brett im Stand; wer die Partie lädt, liest
es ab und rechnet nichts nach. Chancen je Figur, Chance auf zwei Könige und die
Damen-Grenze stehen in `SCHACH_VARIANTEN.ARMEE`.

**Aufgerufen wird an drei Stellen**, alle über `SCHACH_RUNDE.armeeAufstellen`:
`leereRunde` (deckt nur die Alt-Spielart ab — die Regeln sind dort noch nicht
gesetzt), `SCHACH_TAFEL.partieAnlegen` (dort steht der Haken fest) und
`neuePartie` (mit einem Saat-Zusatz, damit die zweite Partie anders aussieht).
`armeeAufstellen` darf **nicht** `armeeAn` fragen: Das normalisiert, und
`normalisieren` baut sich eine leere Runde — das wäre eine Endlosschleife.

**Wie viele Figuren? Der BLOCK entscheidet, nicht eine Zahl.**
`SCHACH_VARIANTEN.armeeFelderBlock(variante, seite, staerke)` ist seit v0.104
die eine Quelle: Sie liefert die Felder einer Seite samt ihrer TIEFE (0 =
äusserste Reihe), und alles andere liest dort — `armeeAnzahl` ist schlicht ihre
Länge, `_armeeFelder` und `_armeeFelderKreuz` sind Übersetzer (Farbe bzw. Seite
hinein, Feldnummern heraus). **Keine Spielart nennt eine Zahl.**

Der Block hat zwei Masse:

- **Breite** (`armeeSpalten`): entweder der mittlere Block mit zwei freien
  Spalten je Seite — das ist die 2-mal-2-Ecke, die seit v0.52 fest steht — oder
  die ganze nutzbare Reihe.
- **Tiefe** (`armeeTiefe`): zwei Reihen, drei Reihen oder „bis zur Mitte".

**Die vier Stufen (`regeln.armeeStaerke`) setzen beides**, seit v0.104 in dieser
Leiter (Nutzer-Ansage 20.08., die Leiter ist gegenüber v0.103 um zwei Stufen
verschoben):

| Klassisches Brett | wenig | normal | viel | voll |
|---|---|---|---|---|
| Breite | mittlerer Block | ganze Reihe | ganze Reihe | ganze Reihe |
| Reihen | 2 | 2 | 3 | bis zur Mitte |
| Figuren je Seite | 8 | 16 | 24 | 30 |
| bis v0.103 hiess das | — | wenig | (Zwischenstufe) | normal |

**Was in den zusätzlichen Reihen steht, sagt die Tiefe** (`_aufstellungArt`):
Tiefe 0 ist die Grundreihe der Spielart, die innerste Reihe sind Bauern, und
dazwischen liegt **eine** Offiziersreihe — die Grundreihe ohne Krone, König und
Dame werden zum Springer. Damit sieht jede Spielart in der zweiten Reihe aus wie
in ihrer ersten, und es entsteht nie ein zweiter König.

**Wem ein Feld gehört, wenn sich zwei Fronten treffen** (`armeeNaechsteSeite`):
der nächstgelegenen Kante; bei Gleichstand der im **Uhrzeigersinn** folgenden
Seite, damit jede der vier Kreuz-Seiten genau eine ihrer beiden Diagonalen
gewinnt. Beim Kreuz-DUELL bieten nur die zwei gegenüberliegenden Seiten mit
(`armeeSeitenVon`) — sonst gewännen die leeren Flügel Felder, und beiden Armeen
fehlte ein Bauer in der vordersten Reihe. **Das 2-mal-2-Feld in der Brettmitte
bleibt immer frei** (`armeeMitteFrei`).

**Auf dem Kreuz zählt die MITTE, nicht die Brettbreite** (seit v0.76): Ein
Streifen ist nur so breit wie `breite - 2 * KREUZ.rand`, die toten Ecken
gehören nicht dazu. `armeeSpalten` rechnet deshalb mit der Mitte und gibt in
`rand` den Abstand vom BRETTRAND zurück — erst die tote Ecke, dann der freie
Rand. `armeeAnzahl` ist damit die Zahl **je Startseite**: kleines Kreuz 4 bei
„wenig", 12 bei „normal".

**Und ein Kreuz stellt je STARTSEITE auf** (`_armeeStandKreuz`, seit v0.76).
`_armeeStand` kannte bis dahin nur oben und unten und liess die Flügel leer.
Die Seiten kommen aus `SCHACH.startSeitenVon` (also aus `startSeiten` im Stand,
nie aus den Figuren abgelesen), die Risse der toten Ecken bleiben stehen, und
**`bauernSeiten` wird neu gebaut** — nach dem Würfeln steht dort, wo die Vorlage
einen Bauern hatte, vielleicht ein Turm. Ein Team mit zwei Streifen hat damit
doppelt so viele Figuren wie eines im Kreuz-Duell.

**Dieselbe Armee für beide?** Steckt die Farbe in der Saat, zieht jede Seite für
sich; ohne sie fällt für beide dieselbe Ziehung. Weil `_armeeFelder` die Felder
spiegelbildlich liefert (gleicher Spaltenindex, gespiegelte Reihe), ergibt das
eine symmetrische Stellung. Entschieden wird es über `regeln.armeeGetrennt` —
**aus** ist die Vorgabe, also gerecht.

**Warum `koenigeAlsLeben` im STAND steht:** Seit die Zufallsarmee ein Haken ist,
kann sie auf jeder Spielart liegen. `schach.js` sieht aber nur den Stand, nie
die `regeln` der Partie — also schreibt `_armeeStand` den Schalter dort hinein,
und `koenigSchlagbarFuer` liest Spielart ODER Stand.

### Fähigkeiten

Nur in der Spielart `faehigkeiten` (Schalter `faehigkeiten: true`). Seit v2.0
gibt es fünf Seltenheitsstufen und zehn Fähigkeiten.

**Vier Arten tragen alle zehn.** Jede Fähigkeit in `SCHACH_VARIANTEN` nennt ihre
`art`; daran hängt alles Weitere, und deshalb kostet eine elfte Fähigkeit weder
im Bildschirm noch im Ablauf eine Zeile:

| Art | Was passiert | Beispiele |
|---|---|---|
| `zugmuster` | Der nächste eigene Zug darf zusätzlich nach diesem Muster gehen. Keine Auswahl nötig. | Sprung, Ausweichen, Teleport |
| `ablauf` | Greift in die Zugfolge ein. | Doppelzug |
| `sofort` | Wirkt beim Einsetzen sofort aufs Brett. | Bauernschub |
| `ziel` | Verlangt EIN angetipptes Feld; `zielArt` sagt, welches. | Verstärkung, Schutzschild, Fessel, Erdbeben, Wiedergeburt, Mauer, Wiederbelebung, Friedhof |
| `handel` | Zeigt ein Angebot und wirkt erst nach Zustimmung (seit v3.5). | Händler |

Dazu zwei Schalter, die für jede Art gelten:

| Schalter | Bedeutung | Zeichen am Vorrat |
|---|---|---|
| `beendetZug: true` | Nach dem Einsetzen ist der Gegner dran. | kein `+` |
| `imGegenzug: true` | Geht auch, während der Gegner am Zug ist (seit v3.6). | Blitz |

**Das Pluszeichen ist seit v0.41 eine Frage an den Spielstand, keine
Eigenschaft der Fähigkeit:** `SCHACH_RUNDE.behaeltZug(runde, farbe, art)` sagt,
ob DIESE Seite JETZT danach noch ziehen kann. Es hängt an zwei Dingen, die
`beendetZug` allein nicht kennt — ob man überhaupt am Zug ist (im Gegenzug
nicht) und ob ein offener Doppelzug den Zug rettet. Der Bildschirm fragt nur
noch; die Rechnung steht neben der, die beim Einsetzen wirklich läuft.

Ohne `beendetZug` bleibt man am Zug und muss noch ziehen — so war es bis v3.3
bei allen Fähigkeiten.

**Seit v0.47 gibt es eine Regel dafür, und sie hängt nicht an der Stufe:**

> Wer Material oder einen Angriff geschenkt bekommt, gibt den Zug ab.
> Wer nur die Stellung verändert, behält ihn.

| Gruppe | Fähigkeiten | Schalter |
|---|---|---|
| Material dazu | Wiedergeburt, Wiederbelebung, Spiegel, Verstärkung, Friedhof, Händler | `beendetZug` |
| Andere Gangart, sofort ausgeführt | Sprung, Teleport | `istDerZug` (seit v0.48) |
| Nur die Stellung | Nudelholz, Mauer, Schutzschild, Fessel, Frost | — |
| Schlägt gar nicht | Ausweichen | — |
| Ausnahme: das Plus IST die Wirkung | Doppelzug | — |
| Zu stark geworden | Bauernschub | `beendetZug` (seit v0.56) |

**Der Bauernschub ist die Ausnahme, die die Regel erklärt.** Er ändert nur die
Stellung und gehörte damit in Gruppe 3 — aber er verschiebt bis zu acht Figuren
auf einmal, und mit dem Zug obendrauf konnte man erst die ganze Reihe vorrücken
und dann mit einem der geschobenen Bauern schlagen. Nach der Regel von v0.47
nimmt man einer zu starken Fähigkeit das Pluszeichen, statt ihre Stufe zu
verschieben; genau das ist in v0.56 passiert. Als Ausgleich wandeln geschobene
Bauern auf der letzten Reihe jetzt in eine **gewählte** Figur um statt
stillschweigend in eine Dame — `SCHACH.bauernschub(stand, farbe, umwandlung)`,
und `SCHACH_RUNDE.schubWandeltUm` sagt dem Bildschirm, ob die Frage überhaupt
lohnt.

Die Stufe sagt, wie SELTEN eine Fähigkeit ist; die Schalter sagen, was sie
KOSTET. Wird eine zu stark, nimmt man ihr das Pluszeichen — man verschiebt sie
nicht auf eine andere Stufe. Ein Test (`test-schach-runde.js`) hält die
Einteilung fest, damit eine neue Fähigkeit nicht ohne Einordnung durchrutscht.

`istDerZug` und `beendetZug` kosten dasselbe (den eigenen Zug), nur zu
verschiedenen Zeitpunkten: `beendetZug` gibt ihn ab, die Wirkung kommt eine
Runde später; `istDerZug` lässt einen am Zug und schränkt ihn auf das Muster
ein (`stand.zusatzNurDieses`). Wer dabei gar keinen Zug mehr hätte, darf die
Fähigkeit nicht einsetzen — sonst stünde die Partie.

**Ein laufendes `istDerZug` lässt sich abbrechen** (seit v0.76). Welche
Fähigkeit gerade läuft, beantwortet `SCHACH_RUNDE.laufendesZugmuster` aus der
Tabelle (Muster + `istDerZug`); `zugmusterZuruecknehmen` räumt Muster und Marke
aus dem Stand und legt die Fähigkeit zurück in den Vorrat. Die Stellung bleibt
unberührt und kein Halbzug wird verbraucht — also erscheint auch keine Lootbox.
Der Zugzähler steigt trotzdem: An ihm hängt die Sicherung gegen zwei
gleichzeitige Züge aus einem Team. Bei Fähigkeiten mit ZIELFELD braucht es das
nicht, dort ist bis zum Drücken von „Einsetzen" noch gar nichts eingesetzt
(v0.57).

**Das Pluszeichen zeigt `!beendetZug && !istDerZug`** — eine Eigenschaft der
Fähigkeit, seit v0.48 wieder unabhängig vom Spielstand. Von v0.41 bis v0.47
fragte es `SCHACH_RUNDE.behaeltZug`; das gibt es weiterhin, versorgt aber nur
noch den Satz im Einsetzen-Dialog. Begründung in
`docs\entscheidungen\entschieden.md`.

**Ein Zusatzmuster überlebt das Abgeben des Zuges** (seit v0.47): Es gilt bis
zum eigenen ZUG, nicht bis zum Ende des Zugrechts. Verbraucht wird es in
`_ausfuehren`, sobald die Farbe zieht, der es gehört. Betroffen ist seit v0.48
nur noch das Ausweichen — die Regel bleibt trotzdem, sie gilt für jedes Muster.

`imGegenzug` hat bisher genau eine Fähigkeit (Ausweichen). Was dabei zu beachten
war — das Rennen um den Zugzähler und die entfallende Abstimmung — steht in
`DECISIONS.md`. Geprüft wird beides in `SCHACH_RUNDE.darfEinsetzen`; wer eine
Fähigkeit einsetzt, fragt nie mehr `darfZiehen`.

**Was eine Fähigkeit anrichten darf, steht in `SCHACH_RUNDE._wirkungVerboten`**
(seit v0.95; der Kern, der eigene König, seit v3.6). Drei Fälle sind verboten:

1. Der **eigene** König stünde im Schach — sich selbst hineinstellen, oder im
   Schach mit einer `beendetZug`-Fähigkeit den Zug abgeben. Was den Zug nicht
   beendet, bleibt erlaubt (man muss danach ohnehin herausziehen).
2. Der **gegnerische** König stünde im Schach, und die Fähigkeit hat es
   verursacht.
3. Wer als **Nächster zieht**, hätte keinen einzigen Zug — das deckt Matt und
   Patt zugleich ab und trifft beide Seiten.

2 und 3 kommen aus der Nutzer-Entscheidung vom 20.08.2026 („items sollen nie
direkt zu schach oder matt führen"); sie nehmen das Recht des Frostes aus v0.80
zurück. 1 und 2 entfallen auf Brettern mit `koenigSchlagbar`, 3 gilt überall.

Gefragt wird die Funktion an ZWEI Stellen: beim Einsetzen
(`faehigkeitEinsetzen` weist ab, die Fähigkeit bleibt im Vorrat) und beim
Anbieten (`zielFelder` markiert solche Felder gar nicht erst). Bis v0.93 kannte
nur die erste sie — das Brett markierte deshalb Felder, die es hinterher
ablehnte. **Wer eine Bedingung ergänzt, ergänzt sie dort und nirgends sonst.**

**Beenden kann eine Fähigkeit die Partie trotzdem** — aber nur mittelbar:
`faehigkeitEinsetzen` fragt am Ende `SCHACH.lage` und setzt `ergebnis` und
`laeuft`, dieselben Zeilen wie in `ziehen`. Erreichbar ist das seit v0.95 nur
noch über ein UNGLÜCK, das die Fähigkeit beim Einsetzen aufsammelt — dafür
steht die Abweisung oben VOR dem Einsammeln und diese Prüfung dahinter. Bis
v0.93 fehlte sie ganz, und eine mattsetzende Wirkung hielt die Partie an.

Die Wirkung liegt in Feldern des Standes und ist damit gespeichert und für alle
sichtbar:

| Feld | Wirkung |
|---|---|
| `zusatzFarbe` / `zusatzMuster` | Zusätzliches Zugmuster für einen Zug. Löst `sprungAktiv` ab, das als Altbestand mitgeführt wird. `_feldBedroht` rechnet den **Sprung** mit — sonst könnte der König in ein bedrohtes Feld ziehen. Ausweichen dagegen nicht: Es zieht seit v3.5 nur auf freie Felder und kann deshalb nichts bedrohen (bis v0.40 stand hier eine Prüfung auf den alten Namen `koenig` — sie hätte ein falsches Schachmatt erzeugen können). |

**Die Liste erlaubter Muster in `SCHACH.standNormalisieren` muss jeden Namen
enthalten, den `_musterzuege` kennt.** Fehlt einer, wird er beim Speichern
stillschweigend weggeworfen: Die Fähigkeit ist verbraucht, die Wirkung nie da.
Genau das ist „ausweichen" von v3.6 bis v0.40 passiert — die Ursache steht in
`docs\entscheidungen\erkenntnisse.md`, und ein Test geht diesen Weg jetzt für
jedes Muster.

| Feld | Wirkung |
|---|---|
| `zusatzNurDieses` | Seit v0.48, gilt nur zusammen mit `zusatzMuster`: `_rohzuege` verwirft die gewohnte Gangart der Figur und bietet **ausschliesslich** das Muster an. Gesetzt wird es von Fähigkeiten mit `istDerZug` (Sprung, Teleport) — sie sind der Zug, kein Zusatz dazu. Verfällt mit dem Muster, also beim eigenen Zug. `faehigkeitEinsetzen` weist das Einsetzen ab, wenn danach kein Zug mehr übrig bliebe. |
| `extraZug` | `_ausfuehren` lässt `amZug` stehen, statt zu wechseln. |
| `schildFeld` / `schildFarbe` | `zuege()` filtert alle gegnerischen Züge auf dieses Feld weg. Verfällt nach dem nächsten gegnerischen Zug oder wenn die geschützte Figur selbst zieht. |
| `fesselFeld` / `fesselFarbe` / `fesselBis` | `zuege()` liefert für dieses Feld nichts. Verfällt nach `SCHACH.FESSEL_HALBZUEGE` Halbzügen, gemessen am **Takt** (seit v0.56 — vorher nach dem nächsten Zug der gefesselten Seite). Gefragt wird `SCHACH.gefesselt`. |
| `frostFelder` / `frostFeld` / `frostFarbe` | Die Felder eines 2×2-Blocks (seit v0.56). Was darin steht, zieht nicht und ist unantastbar — **farblos**, also auch die eigenen Figuren. Gefragt wird `SCHACH.eingefroren`. |

#### Frost und Fessel: zwei Fähigkeiten, zwei Fragen (seit v0.56)

Bis v0.55 taten beide fast dasselbe — eine Figur steht still. Der Unterschied
lag allein in „unantastbar ja/nein", und das war zu wenig für zwei epische
Fähigkeiten. Seither trennen sie sich in **beiden** Achsen:

| | Fläche | Dauer | Schlagbar? | Farbe |
|---|---|---|---|---|
| Frost | 2×2-Block | ein Zug | nein | trifft **jeden** im Block |
| Fessel | ein Feld | mehrere Züge (`fesselBis`) | ja | trifft nur den Gegner |

Drei Dinge daran sind leicht zu übersehen:

- **`frostFeld` bleibt stehen** (linke obere Ecke). Der Datenvertrag ist
  additiv; ein Stand von vor v0.56 kennt nur dieses Feld, und
  `standNormalisieren` macht daraus einen Block aus einem Feld.
- **`frostFarbe` sagt nicht mehr, WER einfriert**, sondern nur noch, wann es
  vorbei ist: an ihrem nächsten Zug läuft der Block ab.
- **Ein LEERES Feld im Block sperrt nichts.** Der Frost hält Figuren fest, er
  riegelt keine Fläche ab — sonst wäre er eine Mauer, die man auch noch über
  den Gegner legen kann. Genau das war er einen halben Bau-Nachmittag lang, bis
  ein Test es zeigte.

#### Die Aufwertungskette (Verstärkung, seit v0.56)

`SCHACH.AUFWERTUNG` ist eine reine Tabelle: Bauer → Springer, Springer → Läufer
oder Turm, Läufer und Turm → Dame, Dame → König, König → zwei Damen. Die Wahl
bei mehreren Möglichkeiten trifft `SCHACH.aufwertungVon(art, wert)` — der Wert
kommt **gerechnet** aus `SCHACH_RUNDE._zufallsWert`, mit dem Feld am ANFANG der
Saat (siehe „Der gerechnete Zufall"). Mit `Math.random()` sähe jedes Gerät eine
andere Figur, und der erste Schreibvorgang gewönne.

Am oberen Ende hängt eine Regelfrage: **Ein zweiter König sind zwei Leben.**
`verstaerkung` setzt dafür `koenigeAlsLeben` im Stand — dieselbe Maschinerie
wie bei der Zufallsarmee, und deshalb war dafür keine neue Regel nötig:
`koenigSchlagbarFuer` zählt ohnehin je Farbe nach, wie viele Könige stehen.
Zwei Sperren halten „Schachmatt" eindeutig:

- Der **letzte** König lässt sich nicht in Damen eintauschen (sonst hätte die
  Seite ohne Zug verloren).
- Der Tausch braucht ein freies Nachbarfeld für die zweite Dame
  (`_aufwertungsPlaetze`, dieselbe feste Reihenfolge wie beim Spiegel), sonst
  wird das Einsetzen abgewiesen.

Der Schalter bleibt gesetzt, auch wenn später ein König fällt. Das ist Absicht:
Sonst kippten die Regeln mitten in der Partie hin und her.

**Warum König und Matt geschützt sind:** Das Schild wirkt nicht auf den König,
der König wird nicht gefesselt, das Erdbeben lässt Könige stehen, und der
Friedhof lässt keinen König aufstehen. Andernfalls wäre „Schachmatt" nicht mehr
eindeutig — dieselbe Überlegung, die beim Doppelbrett zum schlagbaren König
geführt hat. Diese Ausnahmen sind keine Bequemlichkeit, sondern die Bedingung
dafür, dass die Spielart noch Schach ist.

### Die Bildanleitung (seit v0.41)

`schach-vorschau.js` liefert zu **jeder** Fähigkeit und jedem Unglückswürfel
zwei Bilder: vorher und nachher, auf einem 6-mal-6-Beispielbrett.

**Das Nachher-Bild wird gerechnet, nicht gezeichnet.** Die Datei beschreibt nur
die Ausgangsstellung und den einen Handgriff (welches Feld angetippt wird,
welcher Zug folgt); was daraus wird, rechnet `SCHACH_RUNDE.faehigkeitEinsetzen`
beziehungsweise `SCHACH_RUNDE.ziehen` — dieselben Funktionen wie im Spiel. Beim
Unglückswürfel wird er im Beispiel wirklich eingesammelt. Damit kann die
Anleitung nicht von der Regel abweichen; es ist dieselbe Überlegung wie bei den
Vorschaubildern der Spielarten.

| Art der Fähigkeit | Was das Nachher-Bild markiert |
|---|---|
| `zugmuster` | die Felder, die NEU erreichbar sind (das Brett ändert sich ja nicht) |
| `ablauf` (Doppelzug) | nach dem Beispielzug: wohin dieselbe Figur gleich noch einmal darf |
| alle übrigen | die Felder aus dem Verlaufseintrag — genau die, die auch am echten Brett aufleuchten |

**Gezeigt wird ein ABLAUF** (`SCHACH_VORSCHAU.schritte`, seit v0.42): zwei bis
vier Schritte, die der Bildschirm nacheinander abspielt und dann von vorn
beginnt. Jeder Schritt beantwortet eine Frage:

| Schritt | Frage | Wann |
|---|---|---|
| Vorspiel | Was war vorher? | mit `todeszug` (Wiedergeburt, seit v0.58) |
| Ausgangsstellung | Worum geht es? | immer |
| Griff an den Vorrat | Welche Fähigkeit drücke ich? | jede Fähigkeit (seit v0.50) |
| Angebot | Was bietet er? | Händler (seit v0.58) |
| Handgriff | WO tippst du hin? (Fingerabdruck) | Fähigkeit mit Zielfeld |
| Figur, dann Ziel | Welche Figur, und wohin? (zwei Fingerabdrücke) | wo gezogen wird (Doppelzug, Unglückswürfel) |
| Wirkung | Was ist daraus geworden? | immer |
| Nachspiel | Was bringt der Zug, der mir bleibt? | mit `nachspiel` (seit v0.58) |

**Die Zahl der Schritte steht nicht fest.** Bis v0.57 waren es je nach Art
genau drei oder vier, und Tests griffen über feste Stellen zu. Seit v0.58 kann
vorne ein Bild dazukommen (`todeszug`) und hinten auch (`nachspiel`) — wer
einen bestimmten Schritt braucht, SUCHT ihn (etwa über `tipp >= 0`), statt zu
zählen.

**Die Marke im Vorrat steht in JEDEM Bild** (seit v0.58); `knopfTipp` sagt, in
welchem sie gedrückt wird — nur dort liegt der Fingerabdruck darauf. Vorher
kam die ganze Leiste mit einem Bild und verschwand wieder, und die Anleitung
sprang bei jedem Takt in der Höhe.

**Zwei Fallen beim Stellen einer Szene**, beide beim Bau von v0.58 aufgelaufen
(Einzelheiten in `entscheidungen\erkenntnisse.md`):

- **Jede Seite braucht eine Figur, die ziehen kann.** Die Bilder werden mit den
  echten Regeln gerechnet — also gelten auch die echten Abbruchbedingungen.
  Wer die letzte Figur einer Seite schlagen lässt, beendet die Partie durch
  Patt, und danach lässt sich keine Fähigkeit mehr einsetzen.
- **Was gestreut wird, hängt an der Partie-Kennung.** An welcher Seite die
  Ausdehnung wächst, wohin das Erdbeben reisst — all das rechnet sich aus
  `id` und Zugzähler. Eine Szene, die eine bestimmte Wirkung zeigen soll,
  bekommt deshalb über `saat` ihre eigene Kennung. Das ist keine Ausnahme von
  „gerechnet, nicht gewürfelt", sondern deren Anwendung.

Ein Schritt trägt `marken` (worum es geht), `wahl` (die übrigen möglichen
Felder), `ziele` (Zugpunkte wie im Spiel), `tipp` (Fingerabdruck) und `wege`
(Bewegungspfeile). Nichts davon wird aufgezählt: Die Auswahlfelder kommen aus
`SCHACH_RUNDE.zielFelder`, die Zugpunkte aus `SCHACH.zuege`, die Wege aus dem
Verlaufseintrag — dieselben Angaben, aus denen das echte Brett seine Spur färbt.

**Die Pfeile sind nicht der alte Zugpfeil** (v1.9 bis v3.5, siehe
`entscheidungen\entschieden.md`, „Warum der Zugpfeil verschwunden ist"): Der
sollte JEDE Gangart darstellen und konnte es nicht. Im Beispiel steht dagegen
fest, welche Figur wohin geht — und das zeigt eine gerade Linie richtig.

Ein Test (`tests\test-schach-vorschau.js`) prüft für JEDE Fähigkeit, dass es
ein Beispiel gibt und dass sich Vorher und Nachher sichtbar unterscheiden. Wer
eine Fähigkeit hinzufügt oder ändert und das Beispiel vergisst, merkt es dort.

### Dieselbe Machart für die Schachregeln (seit v0.96)

`schach-grundlagen.js` ist die zweite Anleitung — nicht zu den Fähigkeiten,
sondern zum normalen Schach: wie jede Figur zieht, wann Schach, Matt und Patt
gilt, was eine Figur wert ist, und die drei Sonderzüge. Sie ist genauso gebaut
und aus demselben Grund: **Die Bilder werden gerechnet, nie gezeichnet.** Die
Punkte einer Gangart kommen aus `SCHACH.zuege`, das Urteil „Matt" aus
`SCHACH.lage`, die Werte aus `SCHACH_RUNDE.FIGUR_WERT`. `bilder(id)` liefert
dieselbe Form wie die Fähigkeits-Anleitung (`{ runde, marken, ziele, tipp,
wege, text }`) — deshalb zeichnet beides derselbe `_beispielBrettBauen`.

Zwei Unterschiede zur Fähigkeits-Anleitung, beide bewusst:

- **Das Brett ist das normale**, 8 mal 8 und Spielart `standard` (seit v0.97).
  Dort ist das Brett die Sache selbst und nicht der Rahmen für eine Wirkung —
  und nur so ist die Rochade die echte (e1 nach g1).
- **`bonus: []` steht ausdrücklich im Stand.** Ohne eigene Liste füllt
  `normalisieren` sie aus `variante.bonusFelder`; die alte, versteckte Spielart
  `faehigkeiten` trägt dort vier Umstiegs-Felder, und die lagen bis v0.96 in
  jedem Bild der Anleitung.

Gezeichnet wird in `team-schach-grundlagen.js` (`_grundlagenZeichnen`), der
Einstieg steht als Knopf oben in der Partie-Übersicht — vor dem Beitreten,
nicht erst in einer laufenden Partie.

Gezeichnet wird in `team-schach-auswertung.js` (`_anleitungBauen`,
`_beispielBrettBauen`) — im Einsetzen-Dialog und in der Bibliothek hinter dem i.
**Dort ist der Eintrag selbst der Knopf:** Jede Fähigkeit ist ein `details`.
Zugeklappt steht nur ihre Überschrift da (seit v0.43); Beschreibung und
Anleitung entstehen erst beim Aufklappen — 23 Einträge auf einmal wären über
zweitausend Elemente und ebenso viele Takte.

Drei Dinge hängen daran und dürfen nicht wegfallen:

- **Die Takte werden vor jedem Neuzeichnen beendet** (`_anleitungTakteBeenden`),
  und ein Takt beendet sich selbst, sobald sein Bild nicht mehr im Bildschirm
  steht (`isConnected === false`, für den geschlossenen Dialog).
- **Es ist höchstens ein Eintrag aufgeklappt** (`infoOffenerEintrag`, seit
  v0.44). Wer den nächsten öffnet, schliesst den vorigen — und dessen Inhalt
  wird weggenommen, damit sein Takt aufhört, statt unsichtbar weiterzulaufen.
- **Die Bibliothek wird nur einmal gebaut** (`TEAM_SCHACH.infoGezeichnet`). Sie
  hängt an keinem Spielstand; würde die regelmässige Abfrage sie alle drei
  Sekunden neu zeichnen, klappte jeder Eintrag wieder zu und jede Anleitung
  finge von vorn an.

### Der Takt — die Uhr für ablaufende Wirkungen (seit v3.5)

`stand.takt` zählt JEDEN Halbzug und wird nie zurückgesetzt. Er ist die
Grundlage für alles, was nach einer Weile von selbst verschwindet: Mauern und
geliehene Figuren.

**Warum nicht `halbzuege`:** Das ist der Zähler der Fünfzig-Züge-Regel — er
springt bei jedem Bauernzug und jedem Schlagen auf 0 zurück. Eine Mauer mit
`bis = halbzuege + 6` wäre nach einem einzigen Bauernzug unsterblich gewesen.
Wer eine neue Wirkung mit Ablaufzeit baut, nimmt `takt`; ein Test hält den
Unterschied fest.

### Mauern (seit v3.5)

`stand.mauern` ist eine Liste `[{ felder, bis }]`. Eine Mauer sperrt Felder,
ohne dass dort eine Figur steht, und sie gehört **keiner Seite** — sie behindert
beide gleichermassen, auch den, der sie gelegt hat.

Die Regel steckt an drei Stellen, und alle drei sind nötig:

1. **`_strahlzuege`** bricht vor einer Mauer ab — Turm, Läufer und Dame kommen
   nicht hindurch.
2. **`zuege()`** filtert jedes Zielfeld weg, auf dem eine Mauer liegt. Das ist
   die eine Regel für ALLE Figuren; dass ein Springer trotzdem darüber
   hinwegkommt, ergibt sich von selbst, weil er nie nach den Feldern dazwischen
   fragt.
3. **`_bauernzuege` und `_rochadeWege`** prüfen zusätzlich die Felder, über die
   hinweg gezogen wird. Ohne sie übersprang ein Bauer beim Doppelschritt die
   Mauer, und die Rochade zog hindurch — beide Lücken sind beim Bauen
   aufgefallen und durch Tests festgenagelt.

**Das angetippte Feld ist die MITTE** (seit v0.46): Die Mauer legt sich um es
herum, je ein Feld links und rechts. Bis v0.45 war es das linke Ende — man
tippte ein Feld an und bekam die Sperre daneben. Am Rand geht es deshalb nicht
mehr: Ohne Platz für beide Nachbarn liefert `mauerLegen` null, und `zielFelder`
bietet das Feld gar nicht erst an.

Am Bildschirm ist die Mauer **ein** Riegel über drei Felder, kein Stapel
Steine: Der helle Rand liegt nur aussen (oben und unten überall, links und
rechts nur an den Enden `mauer-anfang`/`mauer-ende`), und jedes Stück reicht ein
Pixel in seinen Nachbarn hinein. Bis v0.40 zog der Rand um jedes Feld herum —
gemeldet als „die Mauer ist nicht in sich geschlossen".


**Die Mauer frisst Lootboxen unter sich** (seit v0.77, **kehrt v0.66 um**).
Bis v0.76 wurde ein Feld mit einer Lootbox als Ziel gar nicht angeboten: Unter
der Mauer war die Box gesperrt, unsichtbar und unerreichbar. Jetzt darf die
Mauer überall hin, wo drei freie Felder nebeneinander liegen — und was darunter
liegt, wird beim Legen aus `runde.bonus` entfernt und im Verlauf genannt
(`_zielWirkung`, Fall `mauer`). Der Bildschirm blendet die Lootboxen während
des Platzierens aus, wie beim Friedhof (`wuerfelAusblenden`). Umgekehrt gilt
weiter: Eine NEUE Lootbox fällt nie unter eine stehende Mauer, das prüft
`_bonusNachziehen` über `SCHACH.gesperrt`. Begründung in
`entscheidungen\entschieden.md`.

### Platzieren mit Vorschau-Kasten (seit v0.57)

Eine Fähigkeit mit Zielfeld wirkt nicht mehr beim ersten Tipp. Der Bildschirm
führt durch zwei Schritte:

1. **Tipp auf ein gültiges Feld** → `TEAM_SCHACH.zielVorschau` merkt es sich,
   `zielUmriss` bekommt die Felder, die die Wirkung berühren würde.
2. **„Einsetzen"** unter dem Brett (`_platzierenBauen`) führt aus. Ein Tipp auf
   ein anderes gültiges Feld verschiebt den Kasten; ein zweiter Tipp auf
   DASSELBE Feld gilt als Bestätigung, damit der gewohnte Doppeltipp weiter
   durchgeht.

**Der Umriss wird gefragt, nicht gerechnet.** `SCHACH_RUNDE.zielUmriss` ruft
`_zielWirkung` auf — dieselbe Rechnung, die hinterher wirklich läuft, und
liefert deren `felder`. Eine zweite Liste von „was passiert wo" wäre eine
zweite Wahrheit; dieselbe Überlegung wie bei `zielFelder`.

Gezeichnet wird der Kasten wie der Frost-Block: `_umrissKanten` setzt
`kante-oben` bis `kante-rechts` auf die Aussenseiten der Gruppe, und die
Stildatei macht daraus einen durchgehenden Rahmen. Beide teilen sich diese
Funktion — der Vorschau-Kasten soll ja genau so aussehen wie das, was danach
dasteht.

**Warum antippen und nicht ziehen** (Nutzer-Entscheidung 08.08.): Echtes Ziehen
kämpft auf dem Handy mit dem Scrollen der Seite, und der Finger verdeckt genau
das Feld, das man treffen will.

### Geliehene Figuren (Friedhof, seit v3.5)

`stand.geliehen` ist eine Liste `[{ feld, bis }]`. Die Figuren stehen in der
Farbe dessen auf dem Brett, der sie geholt hat, und ziehen wie seine eigenen.

**Wie lange, hängt seit v0.57 an der FIGURENART** (`SCHACH.LEIHDAUER`): Bauer
8, Springer und Läufer 6, Turm 4, Dame 2 Halbzüge. Je stärker, desto kürzer —
sonst war der Friedhof ausgerechnet dort am stärksten, wo ohnehin viel
Schweres gefallen ist.

**Dazu kommt ein Vorlauf von 2** (`SCHACH.LEIHGABE_VORLAUF`), und der ist kein
Zierat: Der Friedhof hat `beendetZug`. Zwischen dem Aufstehen und dem ersten
Zug, den man mit den Figuren machen kann, liegen deshalb immer zwei Halbzüge —
der abgegebene und die Antwort des Gegners. Die Tabelle zählt ab dem Zeitpunkt,
zu dem man wieder am Zug ist; `leihdauerVon` addiert den Vorlauf. Ohne ihn wäre
die Dame zerfallen, **bevor** man sie ein einziges Mal ziehen kann — beim
Nachmessen von v0.57 genau so aufgefallen. Wer eine weitere Fähigkeit mit
Leihgabe baut und den Zug NICHT abgibt, denkt daran, dass der Vorlauf dann
falsch wäre.

**Verfolgt wird das FELD, nicht die Figur.** Deshalb muss jede Stelle, die etwas
bewegt, den Eintrag nachführen (`_geliehenNachfuehren`): Zieht eine geliehene
Figur, wandert ihr Eintrag mit; wird sie geschlagen, verfällt er. Der Zerfall
(`_zerfallAnwenden`) läuft NACH dem Hochzählen des Takts, sonst bliebe eine
Figur einen Halbzug länger als versprochen.

### Unglückswürfel

Ein Bonus-Eintrag mit `pech: true` trägt statt einer Fähigkeit einen Eintrag aus
`SCHACH_VARIANTEN.PECH` — je Stufe genau einen. Er kommt **nicht in den
Vorrat**, sondern wirkt beim Einsammeln sofort (`SCHACH_RUNDE._pechAusloesen`),
und zwar gegen die Seite, die ihn eingesammelt hat.

Die vier Wirkungen liegen wie die Fähigkeiten in `schach.js` und liefern
dieselbe Form (`{ stand, felder, wege, text }`). Auch hier gilt: **Könige bleiben
verschont** — sie stolpern nicht, meutern nicht und rutschen nicht.

**Beim Unglückswürfel sagt die Stufe, wie schlimm es wird** — die schlimmste
Wirkung liegt deshalb auf der seltensten Stufe. Seit v0.41 ist die Meuterei
legendär und der Erdrutsch episch: Eine übergelaufene Figur verschiebt das
Material doppelt, ein Erdrutsch kostet nur Stellung.

**Die Ausdehnung ist der einzige Eingriff, der die Brettgröße ändert.** Damit
das geht, sind `breite`/`hoehe` seit v2.7 eigenständige Angaben im Stand: Die
Spielart gibt sie vor, aber ein gespeicherter Stand mit passender Brettlänge
gewinnt. Beim Wachsen verschieben sich **alle Feldnummern**; deshalb rechnet
`SCHACH.ausdehnung` auch die gemerkten Felder um (Rochaderechte, Schild, Fessel,
Frost). Wer das vergisst, hat ein Schild auf dem falschen Feld — ein Test hält
es fest.


**Wie oft ein Unglück kommt, hängt seit v0.77 am Füllstand**
(`SCHACH_VARIANTEN.pechChance`). Bis v0.76 war es eine feste Zahl
(`PECH_CHANCE`, 12 Prozent). Jetzt gilt dieselbe Mechanik wie für die MENGE
seit v0.71: auf der Stufe „wenig" flach beim Grundwert, auf den drei
Füllstands-Stufen steigend bis `PECH_CHANCE_HOCH` (40), entlang derselben
Kurventabelle (`REGEN.STUFEN`, `chanceKurve`) und mit derselben `Math.max`-
Klammer gegen den Grundwert. **Welches** Unglück es wird, hat sich nicht
geändert (`pechZiehen`, Stufen-Chancen 52 / 33 / 12 / 3).


**Die toten Ecken wachsen mit** (seit v0.77.1). Bis v0.77.0 baute die
Ausdehnung die neue Linie immer vollständig bespielbar an — auf einem Kreuz
bekam die Ecke dadurch ein Loch nach aussen. Zusammen mit der Schrumpfung, die
eine Linie samt Rissen wegwirft, frass sich die Form über eine lange Partie von
den Rändern her auf: Grösse zurück, Form weg. Jetzt setzt `_eckenFortsetzen`
die Ecken der angrenzenden Randlinie fort — **nur die Löcher, nie die Figuren,
und nur die zusammenhängenden Läufe von den ENDEN der Linie.** Ein einzelnes
Loch mitten am Rand stammt von einem Erdbeben, gehört dem Spielverlauf statt der
Brettform und wächst deshalb nicht mit.

**Nebenbefund, nicht geändert:** `ausdehnung` sperrt „oben" und „unten" ab einer
Höhe von 9. Jedes Kreuz ist mindestens 10 hoch — es kann also nur seitlich
wachsen, aber in alle vier Richtungen schrumpfen.

### Der Zug, der unterwegs endet (seit v0.58)

Ein Erdbeben reisst den Boden auf, **sobald der Würfel eingesammelt wird** —
und eingesammelt wird er seit v0.53 auch im Vorbeiziehen. Wer mit dem Turm
über ihn hinweggleitet, öffnet die Löcher also mitten in seinem eigenen Weg.
Liegt eines davon noch vor ihm, endet der Zug auf dem letzten freien Feld
davor (`SCHACH_RUNDE._zugAmRissAbbrechen`).

**`SCHACH.zuege` bleibt davon unberührt**, und das ist der Kern: Als der Zug
gewählt wurde, war der Weg frei. Die Sperre entsteht erst währenddessen. Eine
Zugerzeugung, die das vorhersehen müsste, müsste den Inhalt jedes Würfels
kennen — und der entscheidet sich erst beim Einsammeln.

Vier Dinge hängen daran:

| | |
|---|---|
| **Ab wo eine Sperre zählt** | Erst ab dem Feld des Würfels. Was HINTER der Figur aufreisst, hat sie längst passiert. Beim Bauen zuerst falsch gemacht: Der Turm blieb auf dem Startfeld stehen, weil ein Riss zufällig hinter ihm lag. |
| **Der Schlag fällt aus** | Wer sein Ziel nicht erreicht, schlägt dort nichts. Die geschlagene Figur kommt zurück aufs Brett und aus `verloren`/`gefallen` heraus (`_verlustZuruecknehmen`). |
| **Die Figur endet nie AUF einem Riss** | Gesucht wird rückwärts das letzte freie Feld; findet sich keines, bleibt der Zug, wie er war. |
| **Der Verlauf wird nachgeführt** | `nach` und `wege` des Zug-Eintrags zeigen auf das Haltefeld — sonst wandert die Figur am Bildschirm auf ein Feld, auf dem sie nicht steht. Deshalb merkt sich `ziehen` den Eintrag als OBJEKT, nicht über seine Stelle im Verlauf. |

Ausgenommen sind Sprünge und Ein-Feld-Züge (kein Weg zum Abbrechen), die
Rochade (zwei Figuren) und Würfel, die die Brettgrösse geändert haben (danach
zeigen alle gemerkten Feldnummern woanders hin).

### Was der Verlauf verrät

Beim Erscheinen steht im Verlauf nur, **wo** ein Würfel liegt, nie was darin
ist — sonst könnte man den Inhalt vorher lesen, und die Überraschung wäre weg.
Dass ein Würfel ein Unglückswürfel ist, sieht man dagegen immer (umgedrehtes
Fragezeichen): Das ist keine Überraschung, sondern die Entscheidung, ob man
hinzieht.

### Der gerechnete Zufall

Nach JEDEM Halbzug erscheint mit `BONUS_CHANCE` Prozent ein Würfel auf einem
freien Feld (meist einer, selten zwei, sehr selten drei — `BONUS_ANZAHL`). Eine
Höchstzahl gibt es seit v3.3 nicht mehr; die einzige Grenze ist das Brett
selbst. **Gewürfelt wird dabei nicht:** `SCHACH_RUNDE._zufallsWert()` streut
Partie-Kennung und Zugzähler (FNV-1a) zu einer Zahl zwischen 0 und 1.

Das ist die wichtigste Festlegung der ganzen Spielart. Mit `Math.random()` sähe
jedes Gerät ein anderes Brett, und der erste Schreibvorgang gewönne — dieselbe
Falle wie beim gegenseitigen Überschreiben in v0.8. So rechnet jeder dasselbe
aus, ohne sich abzustimmen, und die Tests bleiben aussagekräftig, weil das
Ergebnis vorhersagbar ist. **`Math.random()` hat im Modell nichts zu suchen.**

### Zwei Zeitpunkte: Stufe beim Erscheinen, Fähigkeit beim Einsammeln

Seit v3.6 fällt die Entscheidung in zwei Schritten — und an jedem Schritt hängt
seine **eigene** Rechnung. Sie dürfen nicht verwechselt werden:

1. **Beim Erscheinen** wird nur die **Stufe** gezogen (`stufeZiehen`). Mehr darf
   die Oberfläche ohnehin nie verraten. Seit v0.41 zählt dabei die
   **Abklingzeit** mit (`SCHACH_VARIANTEN.stufenGewichte`): Eine Stufe mit
   `abklingen` zählt direkt nach einem Würfel dieser Stufe nur noch mit
   `gewicht` und steigt über `halbzuege` gleichmässig wieder auf 1. Nur Grün hat
   eine — die anderen Stufen behalten ihre feste Chance und sind in dieser Zeit
   häufiger dran. Gemessen wird im **Takt**; gemerkt wird er je Stufe in
   `partie.stufeZuletzt`.
2. **Beim Einsammeln** wird die Fähigkeit gezogen (`faehigkeitAusStufe`), und
   zwar **gegen den Vorrat dessen, der sie einsammelt**: Jedes Exemplar, das er
   schon hat, drückt ihr Gewicht auf `stufe.wiederholung` (0,15 bei Gewöhnlich
   bis 0,75 bei Legendär).

Warum nicht beides beim Erscheinen: Da weiss noch niemand, wer den Würfel
bekommt. Die Begründung samt Staffelung steht in `entscheidungen\entschieden.md`
(„Warum sich der Würfel-Inhalt erst beim Einsammeln entscheidet", „Warum Grün
eine Abklingzeit bekommen hat").

### Gespeichert wird, was liegt

`partie.bonus` ist die Liste der Würfel auf dem Brett, dazu `bonusFassung: 2`.
Ein Eintrag trägt **entweder** `stufe` (seit v3.6, Inhalt noch offen) **oder**
`art` (Würfel von vorher und alle Unglückswürfel). `SCHACH_RUNDE.bonusStufe()`
beantwortet die Farbfrage für beide Fälle an einer Stelle — der Bildschirm
unterscheidet nicht selbst.

Eine Partie **ohne** `bonusFassung` stammt aus der Zeit der vier festen Felder;
für sie wird die Liste einmalig aus `variante.bonusFelder` minus
`bonusGesammelt` gebaut. Angefangene Partien laufen dadurch unverändert weiter.

`verloren` sammelt geschlagene Figuren je Farbe — die Wiedergeburt holt daraus
die zuletzt verlorene zurück.

### Die vier Lagen des Brettes (seit v0.72)

Bis v0.71 gab es zwei Ansichten: Weiss sah das Brett, wie es steht, Schwarz um
180 Grad gedreht (eine Zeile: `feld = felder - 1 - anzeige`). Seit v0.65 stehen
auf dem Kreuz Armeen auch **links und rechts** — wer dort spielt, sah seine
eigene Armee quer.

`TEAM_SCHACH._drehungVon(partie, farbe)` liefert deshalb **0 bis 3
Vierteldrehungen im Uhrzeigersinn**, und die Zahl sagt zugleich, welche Seite
des Brettes unten landet: `0 unten, 1 rechts, 2 oben, 3 links`
(`DREHUNG_JE_SEITE`). Hat eine Farbe zwei Seiten, entscheidet
`SEITEN_VORZUG` — „unten" zuerst, damit das gewohnte Brett gewohnt bleibt.

Drei Stellen rechnen damit, und alle fragen dieselben zwei Funktionen:

| Funktion | Beantwortet |
|---|---|
| `_feldZuAnzeige(stand, drehung, zeigeReihe, zeigeSpalte)` | Welches FELD liegt in der Ansicht an dieser Stelle? (Brett und Randbeschriftung) |
| `_wegZuAnzeige(drehung, dReihe, dSpalte)` | Wie sieht ein Weg auf dem Brett in der Ansicht aus? (die gleitende Bewegung) |

Bei einer Vierteldrehung **tauschen Breite und Höhe der Ansicht** — die
Stil-Variablen `--brett-spalten` und `--brett-reihen` bekommen deshalb die
Masse der ANSICHT, nicht die des Brettes. Und die Randbeschriftung dreht mit:
Unten stehen dann die Zahlen, links die Buchstaben.

**Gedreht wird einmal zu Beginn** (Nutzer-Ansage 13.08.), nicht laufend. Die
Lage hängt an `SCHACH.startSeitenVon(stand, farbe)`, und die Antwort steht im
Stand (`startSeiten`, gesetzt beim Aufstellen) — nicht in den Bauern: Sonst
drehte sich die Ansicht in dem Moment, in dem der letzte Bauer einer Seite
fällt. Gespeichert wird nichts davon im gemeinsamen Stand: Jedes Gerät zeichnet
sein eigenes Brett.

### Was „vorn" heisst — das Nudelholz (seit v0.46, umgebaut v0.117)

Das Brett wird für Schwarz **gedreht** gezeichnet. Eine Fähigkeit, deren
Richtung sich nach oben oder unten am Brett richtet, bedeutet damit für beide
Seiten etwas anderes — und genau das war beim Nudelholz der Fehler: Bis v0.45
bestimmte der angetippte Rand die Richtung, für Schwarz stand alles auf dem
Kopf.

**Seit v0.117 rollt genau EINE Bahn (Spalte oder Reihe), und der Rand ist
wählbar** (Nutzer-Entscheidung 22.08.): Ein Knopf am Brett zählt reihum durch
die vier Ränder (`TEAM_SCHACH.nudelholzKante`, Reihe wie bei Mauer und
Platztausch); die Wahl reist als Zusatzwahl `wahl` durch
`faehigkeitEinsetzen`, und der Verlaufs-Eintrag merkt sie sich als
`richtung` — daraus rollt die Anzeige ihr Schauspiel richtig herum, und die
geschobenen Figuren rücken erst, wenn die Walze sie erreicht
(`_nudelholzRollen`). **Ohne Wahl gilt die eigene Seite** (Weiss unten,
Schwarz oben) — es rollt dann wie seit v0.46 „nach vorn". Wer eine Fähigkeit
mit Richtungs-VORGABE baut, rechnet sie weiterhin aus der FARBE, nie aus der
Reihe am Brett.


**Es rollt wirklich alles — auch Könige** (seit v0.77). Bis v0.76 blieben sie
stehen, und weil ihr Feld besetzt blieb, hielten sie auch alles auf, was hinter
ihnen stand. Den EIGENEN König ins Schach schieben kann man damit trotzdem
nicht: Das verhindert die Prüfung in `faehigkeitEinsetzen` (seit v3.6), die für
jede Fähigkeit gilt — sie steht dort und nicht in `SCHACH.nudelholz`, weil die
Rechnung den Zugzusammenhang nicht kennt. Erdbeben und Bauernschub verschonen
ihre Könige weiterhin.

### Welche Felder ein Ziel sein können

`SCHACH_RUNDE.zielFelder()` probiert für jedes Feld die Wirkung auf einer Kopie
durch und meldet die, bei denen etwas herauskommt. Damit kann die Anzeige nicht
von der Regel abweichen: Es gibt keine zweite Liste von Bedingungen, die
veralten könnte. Der Preis sind ein paar Dutzend Probeläufe je Klick — das
fällt nicht auf.

### Die Zugbewegung

Jeder Verlaufseintrag trägt seit v1.3 zusätzlich `von` und `nach` (Feldnummern).
Daraus lässt `TEAM_SCHACH._zugAnimieren` die zuletzt gezogene Figur von ihrem
alten Feld herüberwandern — **auf jedem Gerät**, nicht nur bei dem, der gezogen
hat. Zwei Dinge sind dabei wichtig:

- Der Merker `animiertBis` (je Partie der zuletzt animierte Zugzähler)
  verhindert, dass dieselbe Bewegung bei jedem Neuzeichnen erneut läuft.
  Gezeichnet wird oft (alle drei Sekunden), gezogen selten.
- Die Verschiebung wird gesetzt, und erst **zwei Bilder später** wird der
  Übergang eingeschaltet und die Verschiebung zurückgenommen. Ohne diese Pause
  fasst der Browser beides zu einem Sprung zusammen.

Wer im Betriebssystem weniger Bewegung eingestellt hat
(`prefers-reduced-motion`), bekommt keine.

Aus denselben Angaben entsteht die **Spur des letzten Zuges** (`_letzteSpur`).
Unterschied zur Bewegung: Die Bewegung läuft einmal, die Spur bleibt stehen, bis
der nächste Zug kommt. Gefärbt wird der Weg — beim Springer das L, beim Läufer
die Diagonale, beim Turm die Linie; Start und Ziel etwas kräftiger
(`feld-spur-ende`). Wirkungen ohne Bewegung bekommen einen Ring
(`feld-spur-wirkung`), neu erschienene Würfel bewusst nichts.

Von v1.9 bis v3.5 war das ein gezeichneter **Pfeil**. Warum er weg ist, steht in
`DECISIONS.md` („Warum der Zugpfeil verschwunden ist"): Er konnte eine Bewegung
um ein einziges Feld gar nicht darstellen, und das waren drei der gemeldeten
Fehler.

### Die stillen Animationen (seit v0.77)

Vier kleine Bewegungen am Brett, auf Nutzer-Wunsch **ohne Farbe und sehr
einfach**: eine erscheinende Lootbox wächst auf, eine verschwundene hinterlässt
einen kurzen Ring, eine neu erschienene Figur wächst auf, und wo geschlagen
wurde, geht derselbe Ring auf.

**Ausgelöst werden sie durch VERGLEICH, nicht durch Lesen des Verlaufs**
(`TEAM_SCHACH._veraenderungen`). Der Verlauf sagt, was jemand GETAN hat; die
Animation soll zeigen, was auf dem Brett ANDERS ist — das ist nicht dasselbe.
Eine Lootbox verschwindet auch, wenn eine Mauer sie frisst (v0.77) oder ein Riss
sie verschluckt (v0.60); für jeden dieser Wege einen Verlaufseintrag zu deuten
hiesse, die Liste bei jeder neuen Regel nachzupflegen. Der Vergleich kennt sie
alle, ohne einen davon zu kennen.

Drei Feinheiten, an denen alles hängt:

1. **ERSCHIENEN ist nicht HINGEZOGEN.** Ein freies Feld, auf dem plötzlich eine
   Figur steht, ist meistens nur ein Zugziel. Wirklich neu ist sie nur, wenn
   ihre FARBE insgesamt mehr Figuren hat als vorher — so entstehen Nachschub,
   Spiegel, Wiedergeburt, Wiederbelebung und Friedhof, und so entsteht kein Zug.
2. **Ein Schlag ist ein Farbwechsel auf einem Feld.** Das Schlagen im
   Vorbeigehen fällt bewusst nicht darunter (der Bauer fällt auf einem anderen
   Feld als dem Zielfeld) — dafür bräuchte es eine zweite Quelle.
3. **Der erste Anblick animiert nie**, ebensowenig der erste nach einem
   Partiewechsel oder nach einer Änderung des Brettmasses (Ausdehnung,
   Einsturz — dieselben Feldnummern zeigen dann woanders hin). Sonst poppte
   beim Öffnen die ganze Stellung auf einmal auf.

Gezeichnet wird in der Stildatei mit `scale` und `opacity`, **nicht** mit
`transform: scale(…)`: Der Würfel schwebt schon über `transform` und die
ziehende Figur gleitet darüber. `scale` ist eine eigenständige Eigenschaft und
rechnet sich mit einem vorhandenen `transform` zusammen. `prefers-reduced-motion`
schaltet alles ab.

### Zwei Fragen an einen Weg

`schach.js` beantwortet sie getrennt, und das ist wichtig:

| Funktion | Frage | Beim Springer |
|---|---|---|
| `SCHACH.wegFelder` | Welche Felder ZEICHNET man? | das ganze L |
| `SCHACH.betreteneFelder` | Welche betritt die Figur WIRKLICH? | nur das Ziel |

**Beide nehmen seit v0.98 einen wahlfreien letzten Parameter `ohneWeg`**
(Wunsch #35). Er sagt: Zwischen Start und Ziel liegt gar kein Weg — es bleiben
die beiden Enden. Gesetzt wird er von den Teleport-Zügen selbst
(`SCHACH._umkreiszuege` gibt jedem `ohneWeg: true` mit), gefragt von
`_bonusEinsammeln`, `_zugAmRissAbbrechen` und der Zugspur am Brett.

**Warum die Geometrie dafür nicht reicht:** Ein Teleport zwei Felder GERADEAUS
sieht aus wie ein gewöhnlicher Zwei-Felder-Zug. Bis v0.97 zeichnete das Brett
deshalb eine Linie durch das Feld dazwischen, und die Figur sammelte dort auch
noch eine Lootbox ein — obwohl sie in Wahrheit darüber hinweggesetzt ist. Wer
eine weitere Bewegung ohne Weg baut, SETZT die Angabe, statt sie zu raten.

**Die Umwandlung hängt am ZUG, nicht an der Gangart** (seit v0.41):
`SCHACH._mitUmwandlung` macht aus einem Zug vier, sobald ein Bauer damit die
letzte Reihe erreicht — egal, ob er dorthin gelaufen ist oder über ein
Zusatzmuster gesprungen. Vorher steckte die Regel allein in `_bauernzuege`, und
ein gesprungener Bauer blieb ein Bauer (gemeldet als Wunsch #4).

An der zweiten hängt eine Regel: Seit v3.6 wird ein Würfel auch dann
eingesammelt, wenn man nur über sein Feld hinwegzieht. Wer springt (Springer,
Fähigkeit „Sprung", Teleport), sammelt unterwegs deshalb nichts ein. Beide
Funktionen stehen im Regelwerk, damit Anzeige und Regel nicht auseinanderlaufen
können.

### Die Größe der Figuren wird gemessen

`--figur-groesse` setzt `TEAM_SCHACH._figurGroesseSetzen` aus der gemessenen
Feldbreite, nachdem das Brett im Bildschirm steht. Die Rechnung in der Stildatei
ist nur der Rückfall. Warum das nötig war, steht in `DECISIONS.md` („Warum die
Figurengröße gemessen und nicht gerechnet wird"): `88vw` ist die Breite des
Fensters, nicht die des Bretts.

### Zwei Farben für jede Markierung

Das Brett hat helle **und** dunkle Felder. Jede einfarbige Markierung
verschwindet deshalb zwangsläufig auf einer der beiden — genau das ist in v1.5
passiert: Der Punkt auf einem möglichen Zielfeld war blau und lag damit
unsichtbar auf den blauen Feldern.

Seither gilt für alles, was auf dem Brett liegt, dieselbe Regel wie schon für
die Figuren: **heller Rand, dunkler Kern.** Zielfelder, Schlagfelder und die
Pfeile der Bildanleitung sind so gebaut. Wer eine neue Markierung ergänzt,
hält sich daran — eine einzelne Farbe reicht auf diesem Brett nie.

### Rot heisst gegen dich, Blau für dich (seit v0.41)

`TEAM_SCHACH._wirkungAnimieren` lässt die betroffenen Felder des letzten
Verlaufseintrags aufleuchten — rot bei `wirkung === "pech"`, sonst blau
(`.feld-wirkung-pech` / `.feld-wirkung`). Die **Figur** auf dem Feld glüht mit
(`.figur`, per `drop-shadow`): Bei Erdrutsch oder Erdbeben leuchten mehrere
Felder gleichzeitig, und die Frage ist, welche Figur es erwischt hat.

Es pulst zweimal; die Dauer steht an **zwei** Stellen, die zusammenpassen
müssen: `--wirkung-dauer` in der Stildatei und `TEAM_SCHACH.WIRKUNG_MS` im
Bildschirm-Code, der die Klasse danach wieder entfernt.

### Versteckte Spielarten

Eine Variante mit `versteckt: true` steht nicht mehr zur Auswahl
(`SCHACH_VARIANTEN.zurAuswahl()`), bleibt aber im Katalog. Das ist der Weg,
eine Spielart aus dem Angebot zu nehmen, **ohne laufende Partien zu beschädigen**:
Sie tragen die Kennung im Stand, und `holen()` findet sie weiterhin.

So ist „Fähigkeiten sammeln" in v2.9 verschwunden — sie war seit v2.5 dasselbe
wie „Klassisch" mit gesetztem Würfel-Haken. **Gelöscht wird eine Spielart nie.**

### Einstellungen je Partie

`partie.regeln` hält, was beim Anlegen gewählt wurde: `faehigkeiten` (Würfel an
oder aus, `null` = die Spielart entscheidet), `seltenheitZeigen`, `pechZeigen`
und `einigkeit`. Die Vorgaben im MODELL entsprechen dem Verhalten von vor v2.5 —
eine Partie ohne dieses Feld verhält sich also unverändert.

**JEDE ERKLÄRUNG STEHT HINTER EINEM i (seit v0.105, Nutzer-Ansage 21.08.:
„generell zu viel Texte überall").** Am Bildschirm steht nur noch der Titel
einer Einstellung; der Satz dazu kommt über `_infoZeichenBauen` als Dialog.
Bei den drei Knopfreihen (Lootbox-Menge, Item-Vorrat, Figurenzahl) baut
`_leistenKopfBauen` das i und setzt die `hinweis`-Texte ALLER Stufen
hintereinander — wer sie liest, will vergleichen. Die Texte selbst stehen
weiterhin im Modell, der Bildschirm denkt sich keine Regeln aus.

**Der Item-Vorrat: drei Mengen in einer Reihe, die eigene Wahl darunter.**
`_vorratLeisteBauen` überspringt die Stufe mit `eigeneWahl` und zeigt sie als
eigenen Knopf (`_eigeneWahlKnopfBauen`), der den STAND trägt („Selbst gewählt:
12 von 19"). Die Ankreuzliste öffnet seit v0.105 ein Popup
(`_itemAuswahlOeffnen`, `DIALOG.hinweis` mit der Liste als `zusatz`-Element);
die Kästchen zeichnen nur sich selbst neu (`_itemAuswahlFuellen`), weil ein
`TEAM_SCHACH.zeichnen` den Bildschirm hinter dem offenen Dialog neu aufbauen
würde. Ein Test hält fest, dass die Reihe genau drei Knöpfe trägt: Sie bricht
im CSS nicht mehr um, eine vierte Menge würde sie quetschen.

**`einigkeit` ist seit v0.76 am Bildschirm umgedreht.** Der Haken beim Anlegen
heisst „Wer zuerst zieht, hat gezogen" und ist aus; Abstimmung ist damit die
Vorgabe. Umgedreht sind nur zwei Dinge: `TEAM_SCHACH.neueRegeln.einigkeit`
startet auf `true`, und der Listeneintrag trägt `umgekehrt: true` (der Haken
zeigt und schreibt das Gegenteil). **Im Stand ändert sich nichts** — dort
bedeutet `einigkeit` weiter „das Team stimmt ab", und die Modell-Vorgabe bleibt
`false`, damit eine Partie ohne Regeln-Block weiterrechnet wie bisher.

**Wie ein Würfel aussieht, sind ZWEI Fragen** (seit v0.49), und sie hängen an
zwei Haken:

| Haken | Antwortet auf | Aus heisst |
|---|---|---|
| `seltenheitZeigen` | Welche FARBE hat er? | einheitliches Grau (`STUFE_UNBEKANNT`) |
| `pechZeigen` | Steht sein Fragezeichen auf dem KOPF? | kein Unterschied zu einem guten Würfel |

**Wie VIELE Lootboxen erscheinen, ist seit v0.71 eine Frage mit vier
Antworten:** `regeln.lootboxMenge` — `wenig`, `normal`, `viele`, `regen`. Die
Tabelle dazu steht in `SCHACH_VARIANTEN.LOOTBOX_MENGEN`, gefragt wird sie über
`SCHACH_RUNDE.lootboxMenge`, gerechnet in `SCHACH_VARIANTEN.mengenChance` und
`mengenAnzahl`. Zwei Angaben je Stufe:

| Angabe | Bedeutung |
|---|---|
| `jederHalbzug` | `false` (nur `wenig`) heisst: nur nach einem VOLLEN Zug wird überhaupt geworfen |
| `stufe` | `0` = gleichmässiges Grundrauschen (`BONUS_CHANCE`), sonst die Kurve aus `REGEN.STUFEN` — je höher, desto früher und mehr |

Die drei Füllstands-Stufen nehmen immer das **Grössere** von Grundrauschen und
Kurve; ohne das läge „normal" früh in der Partie unter „wenig", weil die Kurve
auf vollem Brett fast bei null steht. Dass der Füllstand als ANTEIL zählt und
nicht als Anzahl, kommt aus v0.50: sonst regnete es auf dem Doppelbrett (128
Felder) von Beginn an und auf dem kleinen Brett (36) nie.

**WO eine Lootbox erscheinen darf, entscheidet `_bonusNachziehen`** — und seit
v0.76 fragt es `SCHACH.gesperrt` mit. Ein leeres Feld genügt nicht: Auf einem
RISS wäre die Box für immer unerreichbar (auf dem Kreuz sind die vier toten
Ecken genau das), unter einer MAUER unsichtbar. Gemeldet wurde es als
„Lootboxen spawnen im Nichts". **Und ein Riss zählt seit v0.76 auch nicht mehr
als Brett:** Der Massstab „wie leer ist es gerade" lässt ihn aus — sonst
standen auf dem Kreuz 16 Felder für immer als besetzt in der Rechnung, und es
regnete dort spürbar weniger als auf einem gleich grossen Quadrat.

**Die zwei Vorgänger stehen noch in jeder Partie** (`regeln.regen` seit v0.50,
`regenStufe` seit v0.60) und bleiben es — additiver Datenvertrag. Fehlt die
Stufe, wird sie beim Normalisieren aus ihnen abgeleitet
(`SCHACH_VARIANTEN.mengeAusAltem`), und beim Anlegen werden sie umgekehrt aus
der Stufe mitgeschrieben, damit ein Gerät mit einer älteren Fassung im
Zwischenspeicher nicht nach ganz anderen Zahlen spielt. `SCHACH_RUNDE.regenAn`
gibt es weiter; es beantwortet jetzt „Stufe über `wenig`?".

Bis v0.48 hing beides am ersten Haken, und das Unglück war zusätzlich eine
eiserne Regel (immer sichtbar). Getrennt lässt sich einstellen, was gemeint war:
Farbe ja, Warnung nein. `pechZeigen` liest **`=== true`**, ist ohne Angabe also
AUS — auch in Partien von vor v0.49. Das ist reine Anzeige und rührt an keine
Regel.

`SCHACH_RUNDE.faehigkeitenAn()` ist die einzige Stelle, die die Frage
beantwortet, ob Würfel erscheinen. Der Schalter der Partie geht der Spielart vor.
**Auch der Bildschirm fragt sie** — wer stattdessen die Spielart abfragt, baut
den Fehler aus v3.3 nach (Fähigkeiten-Karte fehlte bei zugeschalteten Würfeln,
siehe `docs\DECISIONS.md`).

### Abstimmung im Team

Mit `regeln.einigkeit` wird ein Zug erst **vorgeschlagen**
(`SCHACH_RUNDE.zugVorschlagen`) und ausgeführt, sobald alle aus dem Team am Zug
zugestimmt haben (`zugMittragen`). Wer allein im Team ist, zieht sofort —
Einigkeit mit sich selbst ist keine Abstimmung wert.

Der Vorschlag steht **im gemeinsamen Stand**: Das eigene Team muss ihn sehen.
Dass der Gegner mitlesen kann, ist der Preis dieser Einstellung und steht als
Hinweis daneben. Ein Vorschlag verfällt, sobald der Zugzähler nicht mehr passt.

### Vorzüge — und warum sie NICHT im gemeinsamen Stand stehen

Ein Vorzug (`TEAM_SCHACH.vorzug`) ist ein Zug, den man einträgt, während der
Gegner am Zug ist. Er liegt **nur auf dem Gerät** und wird ausgeführt, sobald
das eigene Team dran ist — geprüft nach jedem Zeichnen, denn der Stand kommt von
aussen.

Der Unterschied zum Vorschlag ist der Zweck: Ein Vorschlag ist eine Nachricht
ans eigene Team, ein Vorzug ist eine Absicht, die niemand kennen soll. Stünde er
in der Datenbank, wüsste der Gegner den nächsten Zug, bevor er passiert —
dieselbe Überlegung, die beim Würfel-Siegel dazu geführt hat, den echten Wurf
gar nicht erst zu veröffentlichen. Der Preis: Beim Neuladen ist er weg. Das ist
die richtige Seite des Irrtums.

Ist der Vorzug nicht mehr regelkonform (die Figur wurde geschlagen, das Feld ist
besetzt), wird er verworfen und gemeldet. **Ersatzweise wird nie etwas anderes
gezogen** — ein ungewollter Zug wäre schlimmer als gar keiner.

### Die Chronik — warum die Rangliste nichts verlieren kann

`tafel.chronik` hält je beendeter Partie EINEN Eintrag fest: Kennung, Titel,
Spielart, Ergebnis und die Teams, wie sie am Ende waren. Geschrieben wird er in
`SCHACH_TAFEL.partieEinsetzen` — der einzigen Stelle, durch die jede Änderung an
einer Partie läuft — und danach nie wieder angefasst.

Bis v2.3 rechnete `RANGLISTE.schachPunkte` aus den Partien selbst. Wer eine
beendete Partie löschte, nahm damit allen Beteiligten ihre Punkte wieder weg.
Seit v2.4 rechnet die Rangliste aus der Chronik; `partieEntfernen` lässt sie
bewusst stehen.

Partien, die schon beendet waren, bevor es die Chronik gab, tragen sich beim
ersten `normalisieren()` selbst ein. Auch das Doppelschreiben derselben Partie
(zwei Geräte senden denselben Stand) erzeugt nur einen Eintrag — geprüft wird
über die Kennung.

### Der Abschluss einer Partie

Zwei Schritte, die den ganzen Tab einnehmen (`TEAM_SCHACH.abschluss`):
Sieg/Niederlage, dann Punktestand, dann zurück in die Übersicht.

Er erscheint von selbst, wenn die geöffnete Partie ein Ergebnis hat und dieses
Gerät ihn noch nicht gesehen hat (`gesehen`, nur im Arbeitsspeicher) — und nur
für Leute, die in einem der Teams standen. Zuschauer bekommen ihn nicht.

Beendete Partien verschwinden aus der aktiven Liste in einen zugeklappten
Kasten. Gelöscht wird nichts: Die Punkte stehen ohnehin in der Chronik, und wer
nachsehen will, klappt auf.

### Die Auswahl der Spielart

Beim Anlegen einer Partie erscheint eine **eigene Ansicht** im Tab (nicht
`DIALOG.liste`), mit einer Kachel je Spielart. Jede Kachel trägt ein
**Vorschaubild**: ein Miniaturbrett, gezeichnet aus derselben `aufstellung`, aus
der auch das echte Brett entsteht — inklusive der Bonusfelder.

Das ist der Grund für diese Bauweise: Ein gezeichnetes Bild je Spielart wäre
eine zweite Wahrheit, die irgendwann von der ersten abweicht. So ändert sich das
Bild automatisch mit, wenn jemand eine Aufstellung anpasst, und eine neue
Spielart bringt ihr Bild von selbst mit.

Umgeschaltet wird über `TEAM_SCHACH.auswahlOffen`; die Ansicht liegt vor der
Übersicht. Mehr Zustand braucht es nicht, weil jede Ansicht bei jeder Änderung
vollständig neu entsteht.
