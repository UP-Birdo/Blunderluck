# Quizz - Entscheidungen / Teuer erkaufte Erkenntnisse

## Teuer erkaufte Erkenntnisse

### Mitspieler verschwanden wieder aus der Runde (v0.8)

**Was zu sehen war:** Beim Betreten der Seite kam der Anmelde-Dialog mehrfach
hintereinander — es sah aus, als lade die Seite zwei- bis dreimal neu. In der
Datenbank tauchte derselbe Name mit wechselnden Kennungen auf.

**Die Ursache lag woanders als das Symptom.** Geschrieben wird immer der GANZE
Stand, und der zuletzt geschriebene gewinnt. Meldete sich jemand an, während ein
zweites Gerät noch den alten Stand im Speicher hatte, löschte dessen nächster
Schreibvorgang den neuen Spieler wieder. Auf dem betroffenen Gerät fand
`zeichnen()` den eigenen Spieler nicht mehr, meldete ab und startete die
Anmeldung neu — bei mehreren Geräten reihum, also mehrfach.

**Die Lehre:** „Letzter gewinnt" ist für ein Feld harmlos, für eine Liste von
Teilnehmern nicht. Sobald mehrere Geräte denselben Datensatz schreiben, braucht
es eine Regel, wem welcher Teil gehört. Hier: **Jeder ist Herr über seinen
eigenen Eintrag, alles andere kommt vom Server** (`MODELL.zusammenfuehren`,
angewandt in `abgleich.js` unmittelbar vor dem Schreiben). Das passt, weil jeder
ohnehin nur sich selbst ändert — auch die eigenen Vermutungen stehen im eigenen
Eintrag. Ausgenommen sind Aktionen, die absichtlich fremde Einträge ändern
(neue Runde, Spieler entfernen); die schreiben mit `global = true`.

**Zweite Lehre aus demselben Fehler:** Ein Symptom wie „lädt dreimal neu" muss
man erst in eine überprüfbare Beobachtung übersetzen (hier: dieselbe Person mit
wechselnden Kennungen in der Datenbank), bevor man am Code sucht. Der Blick in
die Datenbank hat die Ursache gezeigt, nicht das Lesen des Startcodes.

### Der Tab Team Schach blieb leer (v1.2)

**Was zu sehen war:** Der neue Tab zeigte gar nichts — kein Brett, keine Teams,
keine Meldung. Die Datenbank war korrekt freigegeben, die Dateien wurden
ausgeliefert, die Tests grün.

**Die Ursache liegt im Zusammenspiel zweier für sich richtiger Regeln:**

1. `tabs.js` baut das Gerüst eines Tabs erst auf, wenn er zum ersten Mal
   geöffnet wird (spart Arbeit für nie geöffnete Tabs).
2. `abgleich.js` zeichnet nur, wenn sich Daten ändern (spart Neuaufbauten).

Beim Start lädt der Schach-Abgleich seinen Stand und ruft `zeichnen` — zu einem
Zeitpunkt, an dem `wurzelEl` noch `null` ist, weil der Tab nie geöffnet wurde.
Der Aufruf verpufft folgenlos. Klickt man den Tab später an, entsteht zwar das
Gerüst, aber niemand zeichnet mehr hinein: Es ändert sich ja nichts.

**Die Lehre:** Wo ein Bereich verzögert entsteht, braucht er einen eigenen
Anlass zum Zeichnen — es reicht nicht, sich auf Datenänderungen zu verlassen.
Dafür gibt es jetzt `beimOeffnen()`; `tabs.js` ruft es bei **jedem** Wechsel,
nicht nur beim ersten. Beim Würfel-Quizz fiel das nie auf, weil er der erste Tab
ist und deshalb schon aufgebaut war, bevor die Daten kamen.

**Zweite Lehre:** Automatische Tests hätten das nicht gefunden — sie decken
Regeln und Daten ab, nicht die Reihenfolge, in der Bildschirmteile entstehen.
Genau dafür gibt es die Prüfliste in `docs\DEPLOYMENT.md`; ein neuer Tab gehört
dort mit einem eigenen Punkt hinein.

### Die Fähigkeiten-Karte fehlte bei zugeschalteten Würfeln (v3.3, gefunden v3.4)

**Was zu sehen war:** In einer klassischen Partie mit gesetztem Haken
„Zufalls-Würfel" erschienen die Würfel auf dem Brett, das Einsammeln
funktionierte — aber die Karte unter dem Brett, in der die eingesammelten
Fähigkeiten stehen und eingesetzt werden, kam nie. In der Spielart „Fähigkeiten
sammeln" war alles da.

**Die Ursache:** `TEAM_SCHACH._faehigkeitenBauen` fragte
`SCHACH_RUNDE.varianteVon(partie).faehigkeiten` — also die **Spielart**. Seit
v2.5 entscheidet aber der Schalter der **Partie** (`regeln.faehigkeiten`), und
die einzige Stelle, die beide Fälle kennt, ist `SCHACH_RUNDE.faehigkeitenAn`.
Das Modell benutzte sie überall (`_bonusNachziehen`, Einsammeln, Einsetzen),
nur der eine Bildschirm-Zweig war beim Einbau des Schalters nicht mitgezogen
worden. Deshalb war das Bild so widersprüchlich: Alles Gerechnete lief richtig,
nur das Anzeigen fiel weg.

**Die Lehre:** Wird eine Eigenschaft der Spielart durch einen Schalter der
Partie überschreibbar gemacht, ist jeder direkte Zugriff auf die Spielart ein
Fehler — auch im Bildschirm-Code. Die Frage gehört an genau eine Stelle
(`faehigkeitenAn`), und beim Einbau eines solchen Schalters wird nach allen
alten Zugriffen gesucht, nicht nur nach denen im Modell.

**Zweite Lehre:** Die Bildschirm-Tests legten ihre Partien alle über
`SCHACH_TAFEL.partieAnlegen` ohne `regeln` an — damit gab es die Kombination
„klassisch mit Würfeln" im Test gar nicht. Ein Schalter braucht einen Test in
**beiden** Stellungen; `tests\test-bildschirm.js` prüft jetzt genau das.

### Die Zielpunkte blieben nach dem Zug stehen (v4.0)

Belegt durch ein Bildschirmfoto: ein Brett voller Zielpunkte und roter
Schlagringe — und darunter der Satz „Warte, bis dein Team wieder am Zug ist".

**Die Auswahl lebt im Bildschirm, nicht im Spielstand.** `gewaehltesFeld`,
`moeglicheZiele`, `rochadeZiele` und `zielFelder` sind Felder von
`TEAM_SCHACH`. Der Bildschirm wird bei jeder Änderung vollständig neu gebaut —
aus dem neuen Stand, aber mit dem ALTEN Auswahl-Zustand. Zeichnete das Brett
danach die Marken, gehörten sie zu einer Stellung, die es nicht mehr gab.

Aufgehoben wurde die Auswahl nur an den Stellen, an denen der Bildschirm selbst
etwas tat (`zugAusfuehren`, `partieOeffnen`, ein Tipp daneben). Kam die Änderung
dagegen von aussen — der Gegner zieht, jemand aus dem eigenen Team zieht —,
merkte es niemand. Und `feldAngetippt` steigt oben aus, wenn man nicht ziehen
darf: Die Marken waren also nicht nur falsch, sondern auch tot.

Seit v4.0 trägt die Auswahl den Zugzähler, zu dem sie gehört
(`auswahlZaehler`), und `_auswahlPruefen` wirft sie beim Zeichnen weg, sobald
er nicht mehr passt oder man nicht ziehen darf.

**Die allgemeine Lehre:** Jeder Zustand, der im Bildschirm liegt und sich auf
den Spielstand bezieht, braucht eine Angabe, auf WELCHEN Stand er sich bezieht.
Sonst überlebt er dessen Änderung. Dasselbe Muster steckt schon in
`animiertBis` und `wirkungBis` — dort war es von Anfang an richtig gemacht, hier
fehlte es.

### Die Seite fror ein, bis der Gegner zog (v3.9)

Gemeldet als: „Beim Gegner zeigt es den Zug oft nicht direkt an; wenn er öfter
drückt, wird es rot oder er zeigt dauerhaft die Punkte an, und alles hängt, bis
ich meinen Zug gemacht habe."

Vier Beobachtungen, und sie gehörten zu **zwei** verschiedenen Fehlern.

**Ursache 1: `fetch` hat kein Zeitlimit.**

Das ist die eigentliche Falle, und sie steht so in keiner Anleitung: `fetch`
gibt von sich aus niemals auf. Antwortet der Server nicht — Funkloch, Tunnel,
schlechter Empfang —, bleibt das Versprechen offen, bis der Browser selbst
abbricht. Das dauert je nach Gerät weit über eine Minute.

Die Folgen ketteten sich:

| Was hing | Warum |
|---|---|
| Das Brett nahm keine Tipps an | `TEAM_SCHACH.ziehtGerade` bleibt bis zum `finally` gesetzt |
| Die Abfrage holte nichts nach | Sie wartet auf offene eigene Vorgänge (seit v3.8) |
| Die alte Zugauswahl blieb stehen | vor v3.8: gezeichnet wurde erst nach dem Netz |
| Der Statuspunkt wurde rot | richtig — die Verbindung stand wirklich |

Und die Erlösung „bis ich meinen Zug gemacht habe" erklärt sich von selbst:
Irgendwann brach der Aufruf doch ab oder ging durch, und alles holte auf einen
Schlag nach — was zeitlich mit dem Zug des Gegners zusammenfiel.

Seit v3.9 haben alle Aufrufe ein Zeitlimit (`AbortController`, Laden 8,
Speichern 12 Sekunden). Damit wird aus dem Einfrieren ein normaler Fehler: Er
wird gemeldet, der Zug zurückgenommen, und man kann es sofort erneut versuchen.

**Merksatz: Jeder Netzaufruf braucht ein Zeitlimit.** Ein Aufruf ohne Zeitlimit
ist kein „langsamer Aufruf", sondern ein möglicher Totalausfall der Bedienung.

**Ursache 2: Ein alter Abschluss verdrängte die laufende Partie.**

`TEAM_SCHACH.zeichnen` suchte bei JEDEM Durchgang nach einer beendeten Partie,
deren Abschluss dieses Gerät noch nicht weggeklickt hatte — und zeigte sie
statt allem anderen. Lag so eine Partie herum, kam sie alle drei Sekunden
wieder; wer vorher auf „Punktestand ansehen" gedrückt hatte, sah dauerhaft den
Punktestand. **Das war das „er zeigt dauerhaft die Punkte an".**

Gemerkt wird der Abschluss nämlich erst beim Schliessen (`ICH.abschlussMerken`
in `abschlussSchliessen`). Wer ihn anders verlässt — Tab wechseln, Seite neu
laden —, bekommt ihn beim nächsten Zeichnen erneut.

Die Regel lautet seit v3.9: **Der Abschluss drängt sich nicht in eine andere
laufende Partie.** Er wartet, bis man sie verlässt. Geht die OFFENE Partie
selbst zu Ende, kommt er sofort — das ist der Moment, für den er gebaut wurde
(siehe „Der Gewinner-Bildschirm, den niemand fand").

**Was diese Runde lehrt:** Vier Symptome sahen nach einem Fehler aus und waren
zwei. Hätte man nur das Zeitlimit gebaut, wäre der Punktestand-Hänger geblieben
— und umgekehrt.

### Die Fähigkeit war verbraucht, ihre Wirkung nie da (v0.41)

**Was zu sehen war:** „Ausweichen geht verschwindet und man kann es noch nicht
im Gegnerzug einsetzen." Beides stimmte, und beides war derselbe Fehler.

`SCHACH_RUNDE.faehigkeitEinsetzen` arbeitete richtig: Es setzte
`zusatzMuster = "ausweichen"`, nahm die Fähigkeit aus dem Vorrat und gab die
neue Runde zurück. **Weggeworfen wurde die Wirkung erst beim nächsten Lesen.**
`SCHACH.standNormalisieren` prüft das Muster gegen eine Liste erlaubter Namen,
und in der stand `"koenig"` — der Name aus der Zeit vor v3.6 — aber nicht
`"ausweichen"`, der Name, den `SCHACH_VARIANTEN` seitdem vergibt. Da jeder
Zugriff über `normalisieren` läuft (auch `kopieren`), war das Muster schon vor
dem ersten Zeichnen wieder weg.

**Warum die Tests das nicht gefunden haben:** Sie prüften das Ergebnis von
`faehigkeitEinsetzen` unmittelbar — und da stimmte es. Der Fehler lag auf dem
Weg *danach*: speichern, laden, weiterspielen. Seit v0.41 geht der Test genau
diesen Weg (`JSON.parse(JSON.stringify(...))` und zurück durch
`normalisieren`), und zwar für JEDES Muster, das `_musterzuege` kennt.

**Die Lehre — zweimal dieselbe:**

1. **Eine Prüfliste erlaubter Werte ist eine zweite Wahrheit.** Wer einen Wert
   an einer Stelle vergibt und an einer anderen gegen eine Aufzählung prüft,
   muss beide zusammen ändern. Beim additiven Datenvertrag fällt das nicht auf:
   Ein unbekannter Wert wird stillschweigend verworfen, statt zu krachen. Das
   ist gewollt (alte Stände sollen nicht kaputtgehen) — und genau deshalb muss
   ein Test den Weg durch den Speicher gehen.
2. **Was nicht schlagen kann, bedroht nichts.** Beim Nachlesen fiel auf, dass
   `_feldBedroht` das Ausweich-Muster als Bedrohung mitzählte. Seit v3.5 zieht
   Ausweichen nur auf FREIE Felder; die Prüfung stammte aus der Zeit davor und
   hätte ein Schachmatt erzeugen können, das keines ist. Wer einer Fähigkeit
   etwas wegnimmt, sucht danach jede Stelle, die es noch voraussetzt.

### Der gerechnete Zufall streute nicht (v0.49.1)

**Was zu sehen war:** Nichts — bis jemand nachgemessen hat. Der Nutzer fragte
nur, wie hoch die Chance auf einen zweiten König in der Zufallsarmee ist. Die
Antwort stimmte (12 Prozent), aber beim Nachzählen der übrigen Figuren kam
heraus: Die Dame erschien in 2 Prozent der Ziehungen statt in 12, der Turm in 28
statt in 18. Und ein Blick auf die erzeugten Bretter zeigte, warum:

    p-1:  ..ksss.. / ..ssss..
    p-2:  ..tttt.. / ..tdtk..
    p-3:  ..kkll.. / ..llll..

Jede Seite bekam **siebenmal fast dieselbe Figur**. Die Spielart, deren ganzer
Sinn der Zufall ist, hatte keinen.

**Die Ursache lag in der SAAT, nicht in der Streufunktion.**
`SCHACH_RUNDE._zufallsWert` ist FNV-1a: Jedes Zeichen wird verodert und dann
mit 16777619 multipliziert. Unterscheiden sich zwei Saaten nur im **letzten**
Zeichen, ist der Zustand davor identisch, und der Unterschied erlebt genau eine
Multiplikation. Ein Abstand von 1 im letzten Byte ergibt einen Abstand von
16777619 / 2³² — also **0,4 Prozent**. Die sieben Ziehungen hiessen
`…|figur|1` bis `…|figur|7`:

    p-1: 0.7833  0.7794  0.7755  0.8029  0.7989  0.7950  0.7911

Sieben Zahlen, die alle dasselbe sagen. Mit der Zahl VORNE
(`1|figur|p-1|armee|weiss`) laufen alle übrigen Zeichen als Mischschritte
hinterher, und es sieht aus wie Zufall:

    p-1: 0.4380  0.6372  0.8740  0.9583  0.7508  0.1387  0.4440

**Dieselbe Falle steckte schon zweimal im Bestand**, gefunden beim Absuchen
aller Aufrufe:

- **Volles Glas** (`partie.id + "|glas|" + feld`, seit v0.41): Die Felder 0 bis
  9 trugen alle dasselbe Trugbild, 10 bis 15 ebenfalls. Läufer und Dame kamen
  als Trugbild überhaupt nie vor. Statt einer Täuschung war es ein Muster —
  fiel nie auf, weil niemand nachgezählt hat.
- **Würfelinhalt** (`… + "|inhalt|" + zugZaehler + "|" + feld`): Zwei Würfel,
  im selben Zug auf benachbarten Feldern eingesammelt, lagen 0,004 auseinander
  und ergaben damit fast immer dieselbe Fähigkeit. Selten genug, um unbemerkt
  zu bleiben.

**Die Lehren:**

1. **Was sich unterscheidet, gehört an den Anfang der Saat.** Steht es am Ende,
   mischt es nicht mehr mit. Der Merksatz steht jetzt über `_zufallsWert`, wo
   ihn jeder liest, der die Funktion benutzt.
2. **Gerechneter Zufall braucht einen Test auf die STREUUNG, nicht nur auf die
   Wiederholbarkeit.** Die vorhandenen Tests prüften genau das Richtige — dass
   dieselbe Kennung dasselbe Brett ergibt, und dass acht Figuren aufgestellt
   werden. Beides war die ganze Zeit erfüllt. Dass die acht Figuren fast immer
   dieselbe waren, prüfte niemand. Ein Test misst jetzt den Abstand
   aufeinanderfolgender Ziehungen, ein zweiter die Vielfalt der Armeen.
3. **Eine Schwelle für Zufälliges wird gemessen, nicht geschätzt.** Der erste
   Versuch verbot sechs gleiche Figuren auf einer Seite — und schlug fehl,
   obwohl der Code richtig war: Bei sieben unabhängigen Ziehungen kommt das in
   0,4 Prozent der Fälle vor. Geprüft wird deshalb der Schnitt (4,8 Arten je
   Seite statt 1,4 beim Fehler) und dass Ausreisser selten BLEIBEN.

### Die neue Partie war da — und verschwand wieder (v0.52)

**Was zu sehen war:** „Wenn ich einen Raum erstelle, springe ich nicht direkt
rein — ich bleibe in dem Menü, wo man auf die Größe tippt, und erkenne nicht,
dass eine Partie schon begonnen hat."

Wortgleich zur Meldung von v0.44 — und trotzdem eine andere Ursache. Die von
damals (`partieOeffnen` schloss die Spielart-Auswahl nicht) ist weiterhin
behoben; der Test dazu läuft grün. Es gab eine zweite.

**Die Ursache war ein Rennen mit der regelmässigen Abfrage.** `spielartGewaehlt`
wartet zweimal: auf den Namensdialog und auf das Speichern. Der Abgleich fragt
in dieser Zeit weiter alle paar Sekunden den Server. Landet seine Antwort NACH
dem Schreiben, ersetzt sie `abgleich.daten` durch den Stand vom Server — und der
kennt die eben angelegte Partie noch nicht. Das frisch gesetzte `offeneId` zeigt
dann ins Leere, und der Bildschirm fällt zurück.

Genau dagegen gibt es seit v3.8 `eigenerVorgangBeginnt()`, und die eiserne Regel
sagt es auch: **Wer am Abgleich vorbei schreibt, meldet sich an.** Züge halten
sich daran, der Imposter auch — beim Schach fehlte es an **zwei** Stellen:
`spielartGewaehlt` und `partieLoeschen`. Beim Löschen wäre der Effekt umgekehrt
gewesen: Die Abfrage holt die gelöschte Partie zurück.

**Die Lehren:**

1. **Dieselbe Beschreibung heisst nicht dieselbe Ursache.** Der naheliegende
   Schritt wäre gewesen, den v0.44-Fix zu prüfen und ihn für heil zu erklären —
   er IST heil. Wer dort aufhört, schliesst die Meldung als „geht doch".
2. **Eine Regel, die für einen Schreibweg gilt, gilt für alle.** Beim Suchen
   wurde deshalb nicht die eine Stelle geprüft, sondern jeder Aufruf von
   `speicher.speichern` im Projekt. Zwei von vier waren nicht angemeldet.
3. **Ein Rennen lässt sich schwer nachstellen, eine Anmeldung leicht prüfen.**
   Der Test greift deshalb nicht das Timing an, sondern hält fest, dass beide
   Funktionen sich an- und wieder abmelden.

### Die neue Partie war da — man stand nur davor (v0.44)

**Was zu sehen war:** „Wenn man eine Runde erstellt, nach dem Haken setzen und
dem Antippen der Spielart, kommt die Frage nach dem Namen — und danach soll man
automatisch im Raum landen." Man landete nicht dort: Nach dem Bestätigen standen
wieder die Spielart-Kacheln da.

**Die Ursache war eine Ansicht zu viel.** `spielartGewaehlt` legt die Partie an
und ruft `partieOeffnen` — das setzt `offeneId` und zeichnet neu. `zeichnen`
fragt die Ansichten aber der Reihe nach ab, und die **Spielart-Auswahl steht
davor**: Sie stand noch auf offen, also gewann sie. Die Partie war korrekt
angelegt, gespeichert und geöffnet; sie war nur verdeckt.

**Die Lehre:** Wer eine Ansicht öffnet, schliesst die anderen — an EINER Stelle.
`partieOeffnen` räumt jetzt auch `auswahlOffen` weg, genau wie `IMPOSTER.raumOeffnen`
es seit jeher tut. Beim Vergleich der beiden Spiele fällt so etwas sofort auf:
Dasselbe Muster, eine Zeile weniger.

**Zweite Lehre:** Ein Fehler, der „nichts passiert" heisst, muss nicht im
Ablauf stecken, der scheinbar nichts tut. Hier war jeder Schritt richtig — nur
die Anzeige zeigte etwas anderes.

### Die Bildanleitung hat zwei Regeln entlarvt (v0.46)

Die Anleitung zeigt seit v0.41, wo man hintippt und was daraus wird — gerechnet
mit den echten Regeln. Beim Durchsehen fielen dabei zwei Fähigkeiten auf, deren
Bedienung **nicht** zu dem passte, was man erwartet:

- **Die Mauer** erschien neben dem Feld, das man antippte (das Feld war ihr
  linkes Ende). Auf einem Bild nebeneinander sieht man das sofort; im Spiel
  hält man es für einen Fehlgriff.
- **Das Nudelholz** richtete sich nach dem Rand des BRETTS statt nach der
  Seite des SPIELERS. Für Weiss stimmte es, für Schwarz stand es auf dem Kopf
  — das Brett wird für ihn gedreht.

**Die Lehre:** Eine Anleitung, die aus den echten Regeln entsteht, ist auch ein
Prüfstand für die Regeln. Was sich in drei Bildern nicht erklären lässt, ist
meistens nicht schwer zu erklären, sondern falsch herum gebaut.

**Zweite Lehre — Richtungen gehören zur Farbe, nicht zum Brett:** Alles, was
„oben" oder „unten" heisst, muss aus der Farbe gerechnet werden, solange das
Brett für eine Seite gedreht wird. Die Bauern machen es seit jeher richtig
(`richtung` aus der Farbe); das Nudelholz war die Ausnahme.

### Der hinterlegte Zugriffsschlüssel ließ sich nicht mehr lesen (v0.8)

Beim ersten scharfen Lauf von `Deploy-Quizz.ps1` kam
`The input string ' ' was not in a correct format`. Der Schlüssel war korrekt
abgelegt (812 Hex-Zeichen), aber `Set-Content` hängt beim Schreiben einen
Zeilenumbruch an — und `ConvertTo-SecureString` kann damit beim Lesen nichts
anfangen.

**Lehre:** Für Werte, die zeichengenau zurückgelesen werden müssen, nie
`Set-Content` verwenden, sondern `[System.IO.File]::WriteAllText(...)`. Beim
Lesen zusätzlich `.Trim()`, damit ältere oder von Hand erzeugte Ablagen weiter
funktionieren. Dieselbe Falle ist im Haus schon einmal beim Schreiben von
LF-Dateien aufgetreten.

## Der Stolperstein verpuffte im Vorbeiziehen (v0.53, gefunden v0.58)

**Der Fehler:** Wer mit dem Turm über einen Stolperstein hinwegzog, sammelte
ihn ein — und nichts passierte. Landete man dagegen genau auf ihm, wirkte er.
Von aussen sah das nach Zufall aus.

**Die Ursache** ist eine Annahme, die drei Versionen lang stimmte und dann
nicht mehr. `_bonusEinsammelnAufFeldern` rief `_pechAusloesen` immer mit dem
Feld des WÜRFELS auf, und im Kommentar stand die Begründung dazu: „dort steht
jetzt die einsammelnde Figur". Bis v0.52 war das wahr — man sammelte nur ein,
indem man das Zielfeld betrat. Seit **v0.53 gilt „Berühren heisst
Einsammeln"**: Ein Turm nimmt einen Würfel auch im Vorbeiziehen mit und steht
danach zwei Felder weiter. `SCHACH.stolperstein` suchte auf dem Würfelfeld nach
einer Figur, fand nichts und lieferte `null` — die Wirkung wurde als „ohne
Wirkung" verbucht.

**Warum kein Test es fand:** Alle Stolperstein-Tests liessen die Figur auf dem
Würfel LANDEN. Kein einziger zog über einen hinweg. Der eine Fall, den v0.53
neu geschaffen hatte, war genau der ungeprüfte.

**Die Lehre:** Wer eine Regel verallgemeinert („nicht nur das Zielfeld, jedes
betretene Feld"), sucht alle Stellen, die sich auf den alten Spezialfall
verlassen — und besonders die, in deren KOMMENTAR die alte Annahme steht. Ein
Kommentar, der eine Voraussetzung nennt, ist eine Fundstelle. Gefunden wurde es
übrigens nicht im Spiel, sondern beim Stellen einer Beispielszene, die genau
diesen Ablauf zeigen sollte.

## Eine Beispielszene ohne Figuren beendet die Partie (v0.58)

**Der Fehler:** Die neue Anleitung zur Wiedergeburt lieferte gar keine Bilder.

**Die Ursache:** Die Szene beginnt damit, dass der Gegner die eigene Dame
schlägt — und sie war die einzige weisse Figur. `SCHACH_RUNDE.ziehen` rechnet
nach jedem Zug die Lage nach, erkennt Patt und setzt ein Ergebnis. Danach
weist `darfEinsetzen` jede Fähigkeit ab, und `bilder()` liefert `null`.

**Die Lehre:** Beispielstellungen werden mit den echten Regeln gerechnet — also
gelten für sie auch die echten Abbruchbedingungen. Auf jedem Beispielbrett
braucht jede Seite mindestens eine Figur, die ziehen kann. Ein Test in
`tests\test-schach-vorschau.js` hält das jetzt fest.

## Ein Angreifer hinter einer Sperre gab trotzdem Schach (v3.3, gefunden v0.60)

**Der Fehler:** Ein Turm oder Läufer, zwischen dem und dem König eine Mauer
oder ein Loch lag, setzte Schach — obwohl er dort gar nicht hinziehen konnte.
Im schlimmsten Fall endete die Partie durch ein Schachmatt, aus dem der König
in Wahrheit gar nicht hätte fliehen müssen.

**Die Ursache: zwei Strahlen, nur einer kannte die Sperre.** `schach.js` läuft
an zwei Stellen eine Linie entlang:

- `_strahl` erzeugt die ZÜGE. Als die Mauer in v3.3 dazukam, bekam sie dort
  ihr `if (SCHACH.gesperrt(...)) break;`.
- `_feldBedroht` beantwortet, ob ein Feld ANGEGRIFFEN ist. Diese Schleife blieb
  unverändert und brach nur an Figuren ab.

Zugerzeugung und Bedrohungsprüfung sagten damit zwei verschiedene Dinge über
dieselbe Linie. Beim Riss (v0.54) fiel es nicht auf, weil er dieselbe schon
falsche Stelle benutzte.

**Warum kein Test es fand:** Alle Mauer- und Riss-Tests prüften Züge — ob eine
Figur durchkommt. Kein einziger fragte, ob sie durch die Sperre hindurch DROHT.
Gefunden wurde es erst, weil zu Wunsch #20 ein Test geschrieben wurde, der
belegen sollte, dass die Regel längst gilt. Sie galt nicht.

**Die Lehre:** Wo zwei Funktionen dieselbe geometrische Frage beantworten
(„was liegt auf dieser Linie"), muss jede neue Sperre in BEIDE. Der sicherste
Test dafür ist nicht der Zug, sondern die Drohung: Ein Zug, der nicht
stattfindet, fällt auf; eine Drohung, die es nicht gibt, wirkt still.

## Der gewürfelte Seitentausch hob sich selbst auf (v0.63)

**Der Fehler:** Auf dem Kreuz-Brett sollte sich je Partie entscheiden, welches
Team den linken und welches den rechten Flügel bekommt. Über vierzig gerechnete
Partien kam immer dieselbe Verteilung heraus — obwohl der gerechnete Zufallswert
nachweislich sauber zwischen 0 und 1 streute.

**Die Ursache** war keine im Zufall, sondern in der Geometrie. Der Tausch war
als „Platztausch samt Farbwechsel" gebaut: Was links stand, kam nach rechts und
wechselte dabei die Seite. Beide Flügel tragen aber **dieselbe Figurenfolge** —
`kreuzFluegelFigur` kennt nur die Stelle im Streifen, nicht die Seite. Links
stand also ein weisser Turm, rechts ein schwarzer, und beide Schritte zusammen
ergaben wieder genau das: Turm nach Turm, Farbe zurückgedreht. Die Rechnung
lief, das Ergebnis war jedes Mal die Ausgangsstellung.

**Warum kein Test es zuerst fand:** Der erste Test prüfte nur, ob die beiden
Flügel *verschiedenen* Seiten gehören — das stimmte immer. Erst der zweite,
der über viele Partie-Kennungen zählte, wie viele **verschiedene** Verteilungen
vorkommen, machte es sichtbar.

**Die Lehre:** Bei einer symmetrischen Aufstellung ist ein Platztausch keine
Änderung. Was die Frage „wem gehört diese Seite" wirklich beantwortet, ist der
Farbwechsel an Ort und Stelle. Und: Ein Test auf „es gibt einen Unterschied"
muss über VIELE Saaten zählen, nicht eine einzelne Aufstellung prüfen — sonst
bestätigt er eine Streuung, die es nicht gibt (dieselbe Lehre wie in v0.49.1).

## Das Beispiel im Erklärtext verschluckte einen echten Wunsch (v0.63)

**Der Fehler:** Der GitHub-Eintrag **#12** lag drei Tage unbemerkt da.
`Wuensche-Abholen.ps1` meldete brav „nichts Neues", obwohl er offen war — und
zwar bei JEDEM Lauf, auch bei dem, mit dem am 13.08. die ganze Staffel #5 bis
#22 abgeholt wurde. Aufgefallen ist es erst, als nach dem Schliessen aller
siebzehn Wünsche noch genau einer offen blieb.

**Die Ursache:** Die Doppelten-Prüfung suchte die Marke `[#12]` IRGENDWO in der
`TODO.md`:

    if ($todoText.Contains($marke)) { continue }

In der `TODO.md` steht aber seit jeher der erklärende Satz „erkennbar an
`[#12]`" — als Beispiel. Solange es auf GitHub keinen Eintrag mit der Nummer 12
gab, fiel das nicht auf. Der erste echte #12 galt damit als längst eingetragen.

**Die Lehre:** Eine Marke, die als Beispiel im Fliesstext steht, ist irgendwann
auch eine echte. Gesucht wird deshalb nur noch am ANFANG einer Listenzeile —
also genau in der Form, in der das Skript seine Einträge selbst schreibt
(`^\s*-\s*\[#12\]`). Allgemeiner: Wer Vorhandenes an einer Zeichenkette
erkennt, muss die STELLE mitprüfen, an der sie stehen darf. Das ist im Haus
schon die zweite stille Falle in genau diesem Skript — die erste war die
Pipeline, die ein JSON-Array als ein einziges Objekt weiterreichte (siehe den
Kommentar dort).

## Die Sicherung gegen gleichzeitige Züge verschluckte das Ausweichen (v0.66)

**Der Fehler:** „Wenn ich Ausweichen einsetze, passiert nichts." Die Fähigkeit
blieb im Vorrat, das Brett unverändert — mal so, mal nicht.

**Die Ursache:** `_sendenMitPruefung` schreibt nur, wenn der Zugzähler auf dem
Server noch der erwartete ist. Diese Prüfung ist richtig und soll bleiben — sie
verhindert, dass zwei Leute aus demselben Team gleichzeitig ziehen. Für eine
Fähigkeit mit **Blitz** ist sie aber genau verkehrt: Die wird absichtlich
eingesetzt, WÄHREND der Gegner am Zug ist. Zieht er in derselben Sekunde, ist
der Zähler weitergelaufen, und das Einsetzen gilt als „jemand war schneller".
Das Ausweichen ist die einzige Fähigkeit, die man NUR im Gegenzug einsetzen
kann — es traf also fast immer sie.

**Die Lehre:** Wer eine Aktion baut, die absichtlich GLEICHZEITIG mit der des
Gegners läuft, darf sie nicht mit einer Sperre gegen Gleichzeitigkeit
absichern. Der richtige Weg ist derselbe wie im Würfel-Quizz: **zusammenführen
statt abweisen** — frischen Stand holen, die eigene Änderung darauf anwenden,
schreiben. Die Zugzähler-Prüfung bleibt für Züge, wo sie hingehört.

**Zweite Lehre daraus:** Eine Fähigkeit gilt erst als verbraucht, wenn sie
gewirkt hat. Das war vorher nicht getrennt — Einsetzen und Verbrauchen hingen
an derselben Rechnung, und ein abgewiesener Schreibvorgang nahm beides zurück
oder keines.

## „Fenster blockiert", obwohl das Fenster aufging (v0.66)

**Der Fehler:** Der Wunsch-Knopf meldete JEDES MAL „Der Browser hat das
GitHub-Formular nicht geöffnet" — und der Wunsch landete trotzdem sauber auf
GitHub.

**Die Ursache** steht so im Web-Standard: `window.open(adresse, "_blank",
"noopener")` liefert **immer `null`** zurück, auch bei Erfolg. Das ist kein
Fehlerzeichen, sondern der Sinn des Schalters — das neue Fenster soll keinerlei
Verbindung zurück haben, also gibt es auch keine Kennung. Die Prüfung
`if (!fenster)` konnte „geöffnet" und „blockiert" damit gar nicht
unterscheiden.

**Die Lehre:** Ein Rückgabewert `null` heisst nicht automatisch „fehlgeschlagen"
— manchmal heisst er „diese Auskunft gibt es bewusst nicht". Der übliche Weg
liefert beides: ohne den Schalter öffnen und dem Fenster sofort danach die
Rückverbindung nehmen (`fenster.opener = null`).

## Die neue Lootbox verdeckte den Zug, der gerade passiert war (v0.69)

**Der Fehler:** „Manche Züge, gerade mit dem Pferd, wurden nicht gezeigt." Mal
lief die Bewegung und die Spur lag auf dem Brett, mal passierte gar nichts —
ohne erkennbares Muster.

**Die Ursache:** Sowohl `_letzteSpur` als auch `_zugAnimieren` (und
`_wirkungAnimieren`) lasen den **letzten** Eintrag des Verlaufs. Nach einem Zug
ist der aber sehr oft gar nicht der Zug: `_bonusNachziehen` hängt „Eine Lootbox
erscheint auf …" hinten an, sobald eine neue erscheint — und dieser Eintrag
trägt `von: -1, nach: -1`. Damit fiel die Bewegungsanimation sofort heraus und
die Spur blieb leer.

Das Muster war also sehr wohl da, nur nicht am Zug: Es hing daran, ob in
diesem Halbzug eine Lootbox erschienen ist. Beim **Springer** fiel es am
meisten auf, weil sein L ohne Spur am schwersten nachzuvollziehen ist — deshalb
kam die Meldung über ihn.

**Die Lehre:** „Der letzte Eintrag" ist nicht dasselbe wie „das, was gerade
passiert ist". Sobald ein Verlauf NEBENHER entstandene Einträge kennt
(Erscheinen, Einsammeln), muss man den letzten Eintrag suchen, der die
gemeinte ART von Ereignis trägt — hier `_letzterBewegungsEintrag`. Und: Wer
einen neuen Eintragstyp erfindet, prüft, wer alles „den letzten" liest.

## Eine Liste im Behandler, die niemand mitpflegt (v0.60, gefunden v0.71)

**Der Fehler:** „Hakt man Lootboxen an, erscheinen die Unterpunkte erst, wenn
man einmal auf eine andere Brettform und zurück tippt."

**Der erste Verdacht war falsch.** Vermutet wurde, `TEAM_SCHACH.zeichnen`
zeichne nur bei geänderten DATEN neu — `neueRegeln` steht ja in keiner Partie.
Nachgemessen am 14.08. in einem echten Browser (Edge headless, ein Testblatt,
das die echten Dateien lädt und einen Klick auslöst): Der Lootbox-Haken zeichnet
sehr wohl sofort neu, seine drei Unterpunkte standen sofort da. Der
**Regen-Haken** tat es nicht.

**Die Ursache:** Im Behandler des Hakens stand eine Liste mit genau zwei
Schlüsseln — nur „Lootboxen" und „Zufallsarmee" lösten ein Neuzeichnen aus,
weil nur sie Unterpunkte hatten. Als der Regen-Haken in v0.60 seinen
Schieberegler bekam, wurde er zum dritten Fall, und niemand ergänzte die Liste.
Der Regler erschien deshalb erst, wenn irgendetwas anderes ein Neuzeichnen
auslöste — etwa ein Tipp auf eine andere Brettform.

**Dabei gleich mitgefunden:** `SCHACH_TAFEL.partieAnlegen` übernahm
`regenStufe` gar nicht in die Partie. Der Schieberegler aus v0.60 hat also nie
etwas bewirkt; jede Partie spielte mit der Vorgabe 5. Zwei Fehler, dieselbe
Wurzel: eine Aufzählung, die beim nächsten Feld hätte mitwachsen müssen.

**Die Lehre:** Eine Liste von Sonderfällen im Bildschirm-Code ist eine Falle,
sobald sie beim Einbau des nächsten Falls mitgepflegt werden muss. Der Haken
zeichnet jetzt IMMER neu (`neueRegeln` ist reiner Bildschirm-Zustand, das
kostet nichts), und beim Anlegen wird jedes Feld der Einstellungen übernommen.
Und: Was der Bildschirm tut, misst man am besten im Bildschirm — ein Testblatt
mit den echten Dateien und einem echten Klick hat die Frage in zwei Minuten
beantwortet, die durch Lesen nicht zu beantworten war.

## Die Gegenseite eines PAARES ist nicht die gespiegelte Seite (v0.72)

**Der Fehler:** Beim Bau der Brettdrehung (K4) sollten die Startseiten je Farbe
in den Stand geschrieben werden. Weiss bekommt beim Kreuz ein PAAR — etwa
oben+unten —, und für Schwarz stand da: „die Gegenseite jeder weissen Seite".

Das ergibt für oben+unten wieder unten+oben. **Beide Teams standen damit
senkrecht**, und die Ansicht drehte sich für niemanden. Die Rechnung ist für
EINE Seite richtig und für ein Paar falsch: Das Gegenstück eines Paares ist das
ANDERE Paar.

**Gefunden wurde es am Bild, nicht im Test.** Alle Tests waren grün — sie
prüften die Aufstellung, und die entsteht aus `weisseSeiten`, wo der Fehler
nicht sass. Sichtbar wurde er erst auf einem Bildschirmfoto: Schwarz sah das
Kreuz unverdreht, obwohl es auf den Flügeln stand.

**Die Lehre:** Wo zwei Angaben dasselbe beschreiben sollen (hier: die
Aufstellung und die gemerkten Startseiten), muss ein Test sie
GEGENEINANDER prüfen — nicht jede für sich. Der Test dazu steht jetzt in
`test-bildschirm.js` („Jeder sieht seine eigene Armee unten"): Die Seiten
beider Farben dürfen sich nicht überschneiden, und eine der beiden muss unten
sein.

### Der Doppelzug nahm seinen zweiten Zug zurück (v0.76)

**Was zu sehen war:** „Doppelzug-Bug — der zweite Zug wird nur angezeigt." Man
setzt den Doppelzug ein, zieht, zieht gleich noch einmal — und der zweite Zug
kommt mit „Jemand war schneller" zurück, obwohl niemand sonst im Team ist.

**Die Ursache lag nicht beim Doppelzug**, sondern in `abgleich.js`. Die
regelmässige Abfrage (`fremdenStandHolen`) prüft VOR dem Netzaufruf, ob gerade
ein eigener Schreibvorgang läuft. Der Aufruf dauert über mobile Daten ein bis
zwei Sekunden — und in dieser Zeit kann ein eigener Zug gesendet UND fertig
geschrieben worden sein. Die Antwort trug dann den Stand von VOR dem Zug, wurde
trotzdem übernommen, und der Bildschirm baute seine Knöpfe mit einem veralteten
Zugzähler. Der nächste Zug meldete diesen Zähler an
`TEAM_SCHACH._sendenMitPruefung`; dort passte er nicht mehr zum Server, und der
Zug wurde zurückgenommen — genau so, wie es bei zwei Leuten aus einem Team
gedacht ist.

**Warum es AUSGERECHNET beim Doppelzug auffiel:** Sonst ist nach dem eigenen
Zug der Gegner dran. Bis man wieder tippen darf, vergehen Sekunden, und die
nächste Abfrage hat den Stand längst geradegerückt. Der Doppelzug ist der
einzige Fall, in dem zwei eigene Züge unmittelbar aufeinander folgen — er machte
aus einem seltenen Rennen einen reproduzierbaren Fehler.

**Die Lehre:** **Eine Sperre, die vor einem `await` geprüft wird, gilt danach
nicht mehr.** Wer nach einem Netzaufruf etwas übernimmt, prüft die Bedingung
ERNEUT — und zusätzlich an einem Zähler, ob dazwischen etwas passiert ist
(`vorgangsZaehler`). Ein Schalter beantwortet nur „läuft gerade etwas", nie
„ist zwischendurch etwas gelaufen". Die zwei Tests dazu stehen am Ende von
`test-bildschirm.js`, bei den Prüfungen, die warten können.

**Zweite Lehre:** Die Meldung nannte den Doppelzug, und im Doppelzug war nichts
kaputt — das Modell rechnet ihn seit v2.1 richtig. Ein Symptom, das nur unter
einer bestimmten Fähigkeit auftritt, heisst nicht, dass die Fähigkeit die
Ursache ist; sie kann auch bloss die einzige Gelegenheit sein, bei der ein
allgemeines Rennen eng genug wird.

### Ein Eintrag, der sich als Bewegung ausgab (v0.76)

**Was zu sehen war:** „Kann es sein, dass sich die grüne Farbe meiner Bewegung
nicht richtig verhält, wenn ich eine Unglücksbox einsammle?" — Ja: Die ganze
Zugspur wurde gelb, lief vom Startfeld bis zum Feld der Lootbox und hörte dort
auf, obwohl die Figur zwei oder drei Felder weiter stand. Die gleitende
Bewegung suchte ihre Figur ebenfalls auf dem Lootbox-Feld und lief deshalb gar
nicht — oder auf der falschen Figur.

**Die Ursache:** Der Verlaufseintrag des Unglücks trug `von` = Startfeld des
Zuges und `nach` = Feld der Lootbox. Beides zusammen sieht für den Bildschirm
aus wie ein Weg, also zeichnete er ihn — einen Weg, den nie jemand gegangen
ist. Was das Unglück wirklich bewegt hat, stand daneben in `wege`.

**Die Lehre, und es ist dieselbe wie in v0.69** („die neu erschienene Lootbox
verdeckte den Zug"): **Der Bildschirm nimmt EINEN Verlaufseintrag und hält ihn
für das Ganze.** Ein Halbzug besteht aber aus mehreren Einträgen — Zug,
Einsammeln, Unglück, neue Lootboxen —, und zwei davon können gleichzeitig
sehenswert sein. Zwei Regeln folgen daraus:

1. **Ein Eintrag trägt `von`/`nach` nur, wenn er WIRKLICH eine Bewegung
   beschreibt.** Sonst `-1`. Wer stattdessen „irgendwelche zwei Felder, die
   dazu passen" hineinschreibt, damit die Anzeige etwas hat, bekommt eine
   Anzeige, die etwas Falsches zeigt.
2. **Gehören zwei Ereignisse zu EINEM Halbzug, werden sie auch beide
   gezeichnet** (`_zugZumUnglueck` sucht den Zug zum Unglück; die Spur führt
   Grün und Gelb je Feld statt als einen Schalter für alles).

### Ein Zähler, der die Brettbreite meint, aber die Mitte braucht (v0.76)

**Was zu sehen war:** Auf einem Kreuz-Brett mit Zufallsarmee standen beide
Armeen quer über der Mitte, die beiden Flügel blieben leer — und die Ansicht
drehte sich (seit v0.72) auf eine Startseite, auf der gar nichts stand.

**Die Ursache:** `_armeeStand` kannte nur „oben" und „unten"; das Kreuz kam
2 Versionen später und niemand hat die beiden zusammengedacht. Dazu rechnete
`armeeSpalten` mit `variante.breite` — auf dem Kreuz ist ein Streifen aber nur
so breit wie die MITTE, die zwei toten Ecken gehören gar nicht dazu.

**Die Lehre:** Wenn eine neue Brettform dazukommt, ist jede Funktion verdächtig,
die aus `breite`/`hoehe` eine POSITION rechnet — nicht nur die, die Figuren
zieht. Beim Kreuz sind das drei: die Aufstellung, die Zufallsarmee und die
Lootbox-Verteilung (die zählte die toten Ecken als „Brett" mit und liess es
dort deshalb spürbar weniger regnen). Zwei davon sind erst in v0.76
aufgefallen, dreizehn Versionen nach dem Kreuz.

### Ein Kettenschub sieht aus wie ein Schlag (v0.77, nachgemessen — kein Fehler)

**Was gemeldet wurde:** „Anscheinend ist es vorgekommen, dass meine Figur auf
die Figur eines Gegners gezogen ist durch Nudelholz und hat sie damit
geschlagen. Bitte überprüfen."

**Was nachgemessen wurde:** `SCHACH.nudelholz` schiebt ausschliesslich auf
Felder, die LEER und nicht gesperrt sind; steht dort etwas, bleibt die Figur
stehen. Über mehrere Stellungen gezählt ist die Zahl der Figuren auf dem Brett
vorher und nachher gleich. Ein Schlag ist dort nicht möglich, und es gab keinen.

**Was der Nutzer wirklich gesehen hat:** Die Spalten werden in Laufrichtung von
VORN abgearbeitet — das muss so sein, damit eine Figur Platz macht, bevor die
nächste nachrückt. Steht eine gegnerische Figur direkt vor der eigenen, wird
also zuerst SIE ein Feld vorgeschoben, und die eigene rückt anschliessend auf
deren altes Feld nach. Am Brett steht die eigene Figur danach genau dort, wo
eben noch die gegnerische stand. Der Gegner ist nicht weg, sondern ein Feld
weiter — aber wer auf das eine Feld schaut, sieht einen Schlag.

**Die Lehre — und sie gilt über das Nudelholz hinaus:** Eine Meldung beschreibt,
was jemand GESEHEN hat, nicht was passiert ist. Bevor man die Rechnung
verdächtigt, lohnt die Frage, welche korrekte Rechnung genau diesen Anblick
erzeugt. Beim Nudelholz war die Antwort in der Stellung zu finden, sobald man
statt des einen Feldes die ganze Spalte ausgab — der erste Messversuch druckte
nur zwei Felder und sah selbst wie ein Beweis für den Schlag aus.

Beim ZWEITEN Nachmessen derselben Runde („Ausweichen funktioniert eh nicht")
kam dasselbe Muster heraus: Die Fähigkeit funktioniert vollständig, sie ist nur
gesperrt, solange man am Zug ist (`nurImGegenzug` seit v0.58) — also genau in
dem Moment, in dem man auf seine Fähigkeiten schaut. „Funktioniert nicht" hiess
beide Male „verhält sich anders, als ich dachte".

### Zwei richtige Regeln, die sich gegenseitig auffrassen (v0.77.1)

**Was zu sehen war:** Auf einem Kreuz-Brett waren die vier toten Ecken
unsymmetrisch zerfranst — links unten alles bespielbar, rechts unten und links
oben mit Lücken, und Lootboxen lagen auf Feldern, die eigentlich ein Loch sein
müssten. Gemeldet als „gerade ist etwas ganz Komisches passiert".

**Die Ursache lag in KEINER der beiden beteiligten Funktionen.** Beide waren
für sich genommen richtig:

- Die **Schrumpfung** (v0.54) wirft die wegfallende Linie samt allem darauf weg,
  Risse eingeschlossen. Richtig — die Felder gibt es nicht mehr.
- Die **Ausdehnung** (v2.7) baut die neue Linie vollständig bespielbar an.
  Richtig — auf einem gewöhnlichen Brett soll dort gespielt werden.

Zusammen ergeben sie eine Einbahnstrasse: Jedes Paar aus Schrumpfen und Wachsen
gibt dem Brett seine Grösse zurück, aber nicht seine FORM. Über eine lange
Partie mit vielen Unglückswürfeln frisst sich das Kreuz von den Rändern her auf.
Der Effekt ist kumulativ und deshalb erst spät sichtbar — bei zwei, drei
Ereignissen fällt er nicht auf, bei zehn ist das Brett unkenntlich.

Verstärkt wurde er dadurch, dass **`ausdehnung` „oben" und „unten" ab einer Höhe
von 9 sperrt**. Jedes Kreuz ist mindestens 10 hoch; es kann also ausschliesslich
seitlich wachsen, während es in alle vier Richtungen schrumpfen kann. Die
Erosion trifft damit bevorzugt die senkrechten Ränder.

**Die Lehre:** Wenn zwei Eingriffe dieselbe Grösse verändern, muss man sie als
PAAR prüfen, nicht einzeln. Die Frage lautet nicht „ist jede für sich richtig",
sondern „führt Hin und Zurück wieder auf denselben Stand". Hier tat es das für
die Masse (10 mal 10 blieb 10 mal 10), aber nicht für die Form — und die Form
stand in einer zweiten Liste (`risse`), an die beim Wachsen niemand dachte.
Dieselbe Familie von Fehlern wie „`_feldnummernUmrechnen` vergass drei der
sieben gemerkten Listen" (v0.54): Was das Brett über sich selbst weiss, steht
nicht nur im Brett-Text.

### Die eine Funktion, die man beim Aufräumen vergisst (v0.82)

**Was gemeldet wurde:** „Kontrolliere Erdrutsch, ob es beim Kreuz-Spielfeld
auch noch funktioniert." Eine Vermutung, kein Befund — der Nutzer hatte nur
bemerkt, dass um das Kreuz herum schon mehrfach etwas schieflag.

**Was gefunden wurde: zwei Fehler, und der schwerere hatte mit dem Kreuz
nichts zu tun.**

Der Erdrutsch prüfte beim Zielfeld nur `brett[ziel] !== "."` — also „steht da
eine Figur". Nicht geprüft wurde `SCHACH.gesperrt`. Er schob Figuren damit auf
Mauern und in Risse, wo sie danach auf einem Feld standen, das es für die
Regeln nicht mehr gibt. **Auf jedem Brett, seit es ihn gibt.**

Das Bittere daran: Genau dieser Fehler ist im Haus schon einmal behoben worden.
Das Nudelholz hatte ihn bis v0.59, und im Kommentar dort steht seither:
*„Das Erdbeben fragt an derselben Stelle seit v0.54 richtig; das Nudelholz war
übersehen worden."* Beim Aufräumen wurden Bauernschub, Nudelholz, Erdbeben und
später der Schubs erfasst — der Erdrutsch nicht. Er ist ein Unglückswürfel und
stand in einer anderen Ecke der Datei.

**Die Lehre:** Wenn eine Regel an mehreren Stellen dieselbe Frage stellt
(„darf hier etwas hin?"), reicht es nicht, die bekannten Stellen zu reparieren.
Man muss die Liste vollständig machen — hier hätte ein `grep` nach
`brett[ziel] !== "."` genügt, um den Ausreisser zu finden. Heute sind es fünf
Funktionen, die schieben oder setzen; alle fünf fragen jetzt `gesperrt`.

**Der zweite Fehler war der vermutete.** Die Rutschrichtung hing an der FARBE
(`farbe === WEISS ? 1 : -1`) und war immer senkrecht. Auf dem Kreuz hat eine
Farbe seit v0.65 ZWEI Startseiten — die obere Armee rutschte damit nach vorn
statt zurück, die untere gar nicht. Das ist dieselbe Familie wie „Ein Zähler,
der die Brettbreite meint, aber die Mitte braucht" (v0.76) und „Die Gegenseite
eines PAARES ist nicht die gespiegelte Seite" (v0.72): **Wer eine Richtung aus
der Farbe ableitet, rechnet auf dem Kreuz falsch.** Die dritte Wiederholung
desselben Musters — inzwischen sollte jede neue Funktion mit einer Richtung
zuerst gegen das Kreuz geprüft werden.

Jede weitere nicht offensichtliche Bug-Ursache gehört hierher, bevor die
Sitzung endet.

Diese Fallen aus anderen Projekten des Hauses gelten hier von Anfang an:

- **Typografische Anführungszeichen in JavaScript-Zeichenketten sind eine
  Fehlerquelle.** Ein falsch gewähltes schließendes Zeichen beendet die
  Zeichenkette nicht wie gedacht und zerlegt die Datei. Deshalb: in
  JavaScript-Texten keine typografischen Anführungszeichen — Sätze werden
  umformuliert. `tests\test-syntax.js` fängt den Fall inzwischen ab.
- **PowerShell-Skripte nur mit ASCII-Anführungszeichen.** Nach jeder Änderung
  parse-checken: `[System.Management.Automation.Language.Parser]::ParseFile()`
  muss null Fehler liefern.
- **OneDrive synchronisiert im Hintergrund.** Größere Dateien vor dem Editieren
  sichern und den geänderten Bereich danach erneut lesen.

## Zwei Uhren, und die eine Funktion nahm die falsche (v0.83, behoben v0.83.1)

**Symptom (Meldung T1):** Nach dem Einsetzen der Mauer — ein Item mit
Pluszeichen, der Zug bleibt einem — erschienen Lootboxen; das Item wirkte wie
ein Teilzug.

**Ursache:** Die Partie führt zwei Zähler, die man leicht verwechselt:

- `zugZaehler` ist die SPERR-SICHERUNG gegen gleichzeitige Züge. Er steigt
  bei JEDER Änderung am Spielgeschehen — auch bei jeder Fähigkeit, ausdrücklich
  auch bei denen mit Pluszeichen (`faehigkeitEinsetzen`).
- `stand.takt` ist die EHRLICHE UHR (seit v3.3): Er steigt nur bei echten
  Zügen. Mauern, Fessel und Leihgaben laufen an ihm ab.

`_bonusNachziehen` hängte Kadenz und Saat der Lootbox-Ziehung an den
`zugZaehler`. Ein Plus-Item verschob damit den Fahrplan um einen Halbzug: Auf
der Stufe „wenig" (wirft nur nach vollen Zügen) rutschte der eigene Folgezug
auf „voller Zug abgeschlossen" und warf aus, und die Saat aller folgenden
Ziehungen verschob sich.

**Fix (v0.83.1):** Kadenz am `takt`; in der Saat stehen BEIDE Zähler — der
`zugZaehler` bleibt als Eindeutigkeit drin, weil ein Zug und eine direkt
folgende Zug-beendende Fähigkeit beim SELBEN Takt ziehen und nicht dieselbe
Saat teilen dürfen.

**Merksatz:** Wer irgendetwas am SPIELVERLAUF taktet (Fristen, Kadenzen,
Erscheinen), nimmt `stand.takt`. Der `zugZaehler` ist nur für die
Schreib-Sicherung und für Eindeutigkeit da.

**Nebenbefund, bewusst NICHT mitgefixt:** Das volle Glas ist die letzte
Frist am `zugZaehler` (`glasBis`) — jedes eingesetzte Item verkürzt es um
einen Halbzug. Der Umbau auf `takt` braucht eine Umstiegsregel für laufende
Partien (gespeicherte `glasBis`-Werte sind in zugZaehler-Einheiten) und steht
in der ROADMAP, Bündel T.

## Eine gemischte Liste darf man nicht hinten abschneiden (v0.86)

**Symptom:** Beim Bauen der Knopfreihe für die Figurenzahl (Bündel V, V1) fiel
auf, dass eine Zufallsarmee auf der Stufe „viel" gelegentlich ohne König
startete — ein Zustand, den es laut Regelwerk nie geben darf.

**Ursache:** `_armeeFiguren` würfelt die Figurenliste einer Seite und MISCHT
sie danach — der König steht also an einer zufälligen Stelle in der Liste,
nicht mehr an einer festen. Wurde diese Liste anschließend auf die Zahl der
verfügbaren Startfelder gekürzt (einfaches Abschneiden am Ende), flog der
König mit heraus, sobald er hinter die Schnittstelle gerutscht war. **Vor
v0.86 fiel das nie auf**, weil die Grundzahl der Figuren nie über die Zahl der
Startfelder hinausging — es wurde also nie gekürzt. Die neue Stufe „viel"
liefert erstmals mehr Figuren, als Startfelder da sind, und traf den Fehler
sofort.

**Fix:** Die Feldzahl wirkt jetzt schon beim BAUEN der Liste als Obergrenze,
nicht erst beim Kürzen danach — der König bleibt dadurch in jedem Fall Teil
der Liste, weil er nie über die Grenze hinaus mitgewürfelt wird.

**Merksatz:** Wer eine gerechnete Liste kürzt, kürzt sie beim BAUEN, nicht
nach dem Mischen — sonst hängt ein Pflicht-Element (hier: der König) vom
Zufall der Mischung ab, ob es die Kürzung übersteht.

## Dieselbe Falle, zweite Wiederholung: eine Einstellung, die nichts tut (v0.86/v0.87, gefunden v0.91)

**Symptom:** Die Knopfreihen „Wie viele Figuren je Seite?" (v0.86) und „Welche
Items kommen vor?" (v0.87) liessen sich bedienen und bewirkten **nichts**.
Jede Partie startete mit „normal" und „alle".

**Ursache:** `SCHACH_TAFEL.partieAnlegen` kopiert die Einstellungen EINZELN
aus dem übergebenen Regel-Objekt in die Partie. Für `armeeStaerke` und
`itemVorrat` wurde diese Zeile beide Male vergessen.

**Warum es niemandem auffiel — der eigentliche Lehrsatz:** Die
Spielart-Kachel zeigte trotzdem das Richtige. Sie liest
`TEAM_SCHACH.neueRegeln` direkt, nicht die angelegte Partie. **Das Bild
stimmte, das Spiel nicht.** Eine Vorschau, die aus einer anderen Quelle
rechnet als das Ergebnis, bestätigt einen Fehler, statt ihn zu zeigen.

**Das ist die ZWEITE Wiederholung.** Genau dasselbe passierte in v0.60/v0.71
mit `regenStufe` (siehe den Abschnitt darüber). Dort stand die Lehre schon:
„beim Anlegen wird jedes Feld der Einstellungen übernommen". Sie stand nur in
Prosa — **abgesichert war sie nicht**, und deshalb griff sie beim nächsten
Feld nicht.

**Was jetzt anders ist:** Ein Test in `test-schach-tafel.js` geht die
ÜBERGEBENEN Regeln durch und vergleicht jede mit der angelegten Partie. Er
nennt keine Feldnamen und muss deshalb nie mitgepflegt werden — wer eine neue
Einstellung ergänzt und die Zeile in `partieAnlegen` vergisst, fällt von
selbst auf.

**Merksatz:** Eine Lehre, die nur als Satz in der Doku steht, hält genau bis
zum nächsten Mal. Wer eine Aufzählung als Falle erkennt, baut denselben Tag
den Test dazu — sonst schreibt man denselben Abschnitt zweimal.

**Und zur Methode:** Gefunden wurde es nicht durch Lesen, sondern durch ein
Wegwerf-Skript gegen die echten Dateien: Einstellungen hineingeben,
`partieAnlegen` aufrufen, herausschreiben, was in der Partie ankommt. Zwei
Minuten Arbeit für eine Frage, die durch Code-Lesen unbeantwortet blieb —
dieselbe Methode hatte schon v0.71 geholfen.

## Ein Stand, der als Literal gebaut wird, verliert jedes vergessene Feld (Meldung #36, gefunden v0.98)

**Meldung:** „Dieb und Enttarnen sind sofort verschwunden nach dem Einsammeln
und Zugwechsel, funktioniert nicht wie ein Item."

**Die Ursache — für die Enttarnen-Hälfte gefunden und behoben:**
`SCHACH._ausfuehren` baut den neuen Stand als **Objekt-Literal**, nicht als
Kopie des alten. Jedes Feld, das dort nicht ausdrücklich aufgeführt ist,
existiert nach dem Zug schlicht nicht mehr — und `standNormalisieren` kann es
nicht zurückholen, denn der Wert ist weg. `enttarntFarbe` und `enttarntBis`
(v0.88) standen nie darin. Die Fähigkeit versprach sechs Halbzüge und hielt
**keinen einzigen**: Der nächste Zug löschte ihre Wirkung.

**Beim Nachmessen fiel ein zweiter Verlust derselben Art auf**, älter und
stiller: `startSeiten` (v0.72). Der Eintrag soll für die ganze Partie
feststehen — genau dafür wurde er gebaut, damit sich die Ansicht auf dem Kreuz
nicht dreht, sobald die letzten Bauern einer Seite fallen. Tatsächlich war er
nach dem ERSTEN Zug weg, und `SCHACH.startSeitenVon` fiel still auf seinen
zweiten Weg zurück: die Bauern. Die Zusage von v0.72 galt also nie länger als
einen Halbzug. Dass niemand es merkte, liegt am Rückfall — er liefert meistens
dieselbe Antwort, nur eben nicht, wenn die Bauern fehlen.

**Warum das keine Nachlässigkeit war, sondern eine Bauform:** Ein Literal ist
an dieser Stelle die richtige Wahl — fast jedes Feld muss beim Ziehen ohnehin
neu entschieden werden (was läuft ab, was bleibt, was wandert mit). Nur trägt
diese Bauform ihren Fehler in sich: Sie schweigt, wenn man etwas vergisst.
`Object.assign({}, stand, {…})` hätte den Fehler nicht zugelassen, aber jede
ablaufende Wirkung zum Sonderfall gemacht.

**Was jetzt anders ist — der Test, den niemand pflegen muss:**
`tests\test-schach.js` vergleicht die SCHLÜSSEL eines frischen Standes mit denen
nach einem Zug. Er nennt kein Feld beim Namen; wer eines ergänzt und die Zeile
in `_ausfuehren` vergisst, fällt sofort auf. Genau dasselbe Muster wie der Test
zu `partieAnlegen` aus v0.91 — und aus demselben Grund: **Eine Aufzählung, die
man beim Erweitern mitpflegen muss, wird eines Tages nicht mitgepflegt.**

**Die Lehre:** Wo ein Datensatz aus einzelnen Feldern NEU aufgebaut wird statt
kopiert, ist die Liste dieser Felder eine Schnittstelle — und sie gehört
abgesichert, nicht kommentiert. Dieselbe Falle steckt an drei weiteren Stellen
dieses Projekts, die alle Feld für Feld aufbauen: `SCHACH.standNormalisieren`,
`SCHACH_RUNDE.normalisieren` (dort auch die Verlaufseinträge) und
`SCHACH_TAFEL.partieAnlegen`. Die letzte hat ihren Test seit v0.91, die erste
seit v0.98.

**Offen bleibt die DIEB-Hälfte der Meldung.** Sie ist im Modell weiterhin nicht
nachstellbar; was dazu bereits ausgeschlossen wurde, steht unverändert unten.
Zwei Dinge sind vor einer weiteren Suche zu klären: ob sie nach v0.98.0
überhaupt noch auftritt, und ob nicht die graue Dieb-Marke aus v0.94 gemeint
war (sie sieht seitdem absichtlich anders aus, wenn der Gegner nichts im Vorrat
hat).

## Was zur Meldung #36 schon gemessen wurde (Stand 20.08.2026)

**Damit die nächste Sitzung nicht dieselbe Strecke noch einmal läuft — das
ist bereits AUSGESCHLOSSEN**, gemessen mit einem Wegwerf-Skript gegen die
echten Dateien:

- `normalisieren` wirft sie NICHT weg. Beide überleben Speichern und Laden,
  in Partien mit sichtbarer wie mit verborgener Seltenheit.
- `darfEinsetzen` liefert für beide `true`.
- Das Einsammeln legt sie richtig in den Vorrat, und sie bleiben dort auch
  nach dem Laden.
- `faehigkeitEinsetzen` funktioniert für beide: Enttarnen verbraucht sich und
  lässt den Zug, der Dieb verbraucht sich und legt die Beute in den Vorrat.
- `_gefalleneVorhanden` betrifft nur Nekromant, Wiederbelebung und
  Wiedergeburt und gibt für alles andere `true` zurück.
- Der Bildschirm filtert den Vorrat nicht nach `art`; die Fähigkeiten-Karte
  zeigt jede Fähigkeit im Vorrat.

**Was dabei gefunden wurde, war ein ANDERER Fehler** (die verworfenen
Einstellungen, siehe den Abschnitt darüber). Gut möglich, dass die Meldung
eine Folge davon war — das ist die erste Frage an den Nutzer, bevor hier
weiter gesucht wird.

**Wo noch nicht gemessen wurde:** im echten Zusammenspiel zweier Geräte über
die Datenbank. Der nächste Schritt wäre, den Zugwechsel mit zwei Anmeldungen
nachzustellen und dabei zu beobachten, ob der Vorrat über den Abgleich
zurückgesetzt wird.

**NACHTRAG v0.98:** Die Suche lief damals im VORRAT — dort, wo die Meldung
hinzeigte. Gefunden wurde der Fehler eine Ebene tiefer, in der WIRKUNG (siehe
den Abschnitt darüber). Auch das ist eine Lehre: Ein Nutzer beschreibt, was er
sieht, nicht wo es herkommt. „Die Fähigkeit ist weg" und „die Fähigkeit tut
nichts mehr" sehen am Brett gleich aus — die zweite Lesart war nie geprüft
worden.

**NACHTRAG v0.99 — DAMIT IST #36 GANZ BEANTWORTET.** Die Dieb-Hälfte war kein
Fehler, sondern eine **Regel, die sich wie einer anfühlte**: die graue Marke
aus v0.94. Nachgemessen mit einem Wegwerf-Skript über den ganzen Weg
(Einsammeln → eigener Zug → Gegnerzug → Speichern → Laden) blieben Dieb,
Enttarnen und Verstecken jedes Mal vollständig im Vorrat; einzig
`darfEinsetzen("dieb")` lieferte `false`, sobald der Gegner nichts hatte. Der
Nutzer hat daraufhin die Regel zurückgenommen („sollen … wann man will genutzt
werden").

**Und das ist die eigentliche Lehre dieser Meldung:** Eine Sperre, die einen
nutzlosen Griff spart, kostet den Eindruck, das Item gehöre einem. Der
Spieltest hatte recht mit der Zahl (861 Griffe ins Leere) und unrecht mit dem
Schluss — er konnte nicht messen, wie sich eine graue Marke anfühlt. **Wer eine
Bequemlichkeit einbaut, die etwas WEGNIMMT, fragt vorher nach.** Der Bericht
lautete deshalb auch nicht „der Dieb ist grau", sondern „der Dieb ist
verschwunden": Was man nicht anfassen darf, ist für den Spieler nicht da.

## Die Pflichtlektüre wuchs schneller, als sie genutzt wurde (gemessen v0.103)

**Was zu sehen war:** In EINER Sitzung — sechs Auslieferungen von v0.98 bis
v0.103 — wuchs die Datei, die jede Schach-Sitzung als Erstes vollständig liest,
von 29 auf 36 KB. Die `STATUS.md` von 27,6 auf 29,7 KB. Zusammen mit der
`CLAUDE.md` waren das 72 KB, bevor die erste Frage überhaupt gelesen war.

**Die Ursache ist kein Fehler, sondern eine Gewohnheit:** Nach jeder Runde kam
eine Regel dazu — und zwar zu Recht, jede einzelne war teuer erkauft. Nur wurde
nie etwas kürzer. Die Regel-Doku war ausserdem als EIN Stück Pflichtlektüre
angelegt, also wurde sie ganz gelesen, auch die neun Zehntel, die das jeweilige
Vorhaben nichts angingen.

**Und sie enthielt zwei verschiedene Textsorten.** Neben der Regel („kein Item
führt zu Matt") stand jedes Mal die Fallgeschichte („bis v0.94 war das anders,
dann fiel im Spieltest auf …"). Die Geschichte ist wertvoll — aber sie gehört
hierher, nicht in etwas, das jede Sitzung ganz liest.

**Was jetzt anders ist:** Die Regeln stehen in `docs\regeln\` mit einem Index,
der die vier immer geltenden Sätze und den Wegweiser trägt; die drei
Themendateien werden einzeln geöffnet. Die `STATUS.md` ist wieder ein Stand und
kein Archiv (Richtwert unter 12 KB). Pflichtlektüre beim Sitzungsbeginn: **27
statt 72 KB, also 62 Prozent weniger** — bei unverändertem Inhalt.

**Die Lehre, und sie gilt über dieses Projekt hinaus:** Was bei JEDEM Anfang
gelesen wird, ist die teuerste Zeile im Projekt. Wer dort etwas ergänzt, kürzt
an derselben Stelle etwas anderes — oder verschiebt es dorthin, wo es nur bei
Bedarf gelesen wird. Doku, die nur wächst, wird irgendwann nicht mehr gelesen,
und dann nützt die beste Regel nichts mehr.

**Beim Eindampfen wäre fast etwas verlorengegangen** — die Spielgefühl-Fragen
(„fühlt sich der Frost fair an?") standen NUR in der `STATUS.md`. Sie sind aus
`Backup\Quizz\v0.100.0` wiederhergestellt und nach `offen-und-abgelehnt.md`
umgezogen. **Zweite Lehre:** Vor dem Kürzen prüfen, ob der Inhalt anderswo
wirklich steht — und genau dafür ist der Meilenstein-Abzug da.

## Eine aufgehobene Regel lebt in ihrem Erklärtext weiter (v0.95, gefunden v0.100)

**Was zu sehen war:** Der Beschreibungstext des Frostes versprach: „Er gilt auch
für Könige: Wer einen König so einsperrt, dass ihm kein Feld mehr bleibt, setzt
ihn matt." Das Recht, mit einer Fähigkeit mattzusetzen, ist mit **v0.95**
zurückgenommen worden — `_wirkungVerboten` weist genau das seither ab. Der Text
stand trotzdem fünf Versionen lang weiter da und erklärte etwas, das die App
nicht mehr tut.

**Warum es niemandem auffiel:** Die Regeländerung von v0.95 war eine Arbeit am
MODELL. Geprüft wurde, was `faehigkeitEinsetzen` und `zielFelder` tun; die Tests
wurden nachgezogen, die Doku auch. Nur der Erklärtext ist weder Code noch Doku —
er ist eine Zeichenkette mitten in der Fähigkeiten-Tabelle und läuft in keiner
Prüfung mit.

**Gefunden wurde er beim KÜRZEN**, nicht beim Suchen: Der Nutzer hatte gemeldet,
die Texte seien zu lang. Wer einen Text zusammenstreicht, muss ihn Satz für Satz
lesen — und dabei fällt auf, was nicht mehr stimmt.

**Die Lehre — Erweiterung der Lehre aus v0.94:** Dort hiess es „Wer eine Regel
aufhebt, sucht die STELLEN, die sich auf sie verlassen haben". Das ist zu eng.
Es sind auch die SÄTZE, die sie erklären: Beschreibungen, Hinweise unter
Knopfreihen, Info-Texte. Sie sind die einzige Stelle, an der ein Nutzer die
Regel je liest, und sie sind die einzige, die kein Test bewacht.

**Was jetzt anders ist:** Ein Test hält seit v0.100 jede Beschreibung kurz
(unter 400 Zeichen, Kurztext unter 150). Das fängt die WAHRE Ursache nicht ab —
gegen einen falschen Satz hilft keine Längengrenze —, aber es erzwingt, dass
jemand den Text anfasst, sobald er wächst. Lange Texte sind der Ort, an dem
aufgehobene Regeln überwintern.

## Eine Einstellung, die eine Zahl verspricht, die das Brett nicht halten kann (v0.86, gefunden v0.99)

**Symptom:** Die Knopfreihe „Wie viele Figuren je Seite?" hatte vier Stufen,
aber nur zwei Wirkungen. „viel" und „voll" stellten auf JEDEM Brett dieselbe
Armee auf wie „normal" — gemeldet als „die Vorschau bei den Maps ändert sich
nicht, wenn man die Figurenzahl ändert".

**Die Ursache — zwei Rechnungen für dieselbe Sache.**
`SCHACH_VARIANTEN.armeeAnzahl` multiplizierte eine Grundzahl mit dem Anteil der
Stärke (1,5 bzw. 2). Die STARTFELDER dagegen kamen aus `armeeSpalten` und waren
von der Stärke unabhängig — genau so viele, wie „normal" braucht. Beim
Aufstellen gewann die kleinere Zahl (`Math.min(felder.length, arten.length)`).
Jede Stufe über „normal" lief also gegen eine Wand, die niemand sah.

**Warum es v0.86 nicht auffiel:** Damals fiel derselben Sache schon einmal
etwas zum Opfer — der König rutschte beim Kürzen aus der Liste (siehe oben,
„Wer eine gerechnete Liste kürzt"). Behoben wurde der KÖNIG. Dass überhaupt
gekürzt werden musste, blieb stehen und galt als normal. **Ein Symptom, das
man behebt, ohne zu fragen, warum es entstehen konnte, lässt die Ursache
liegen.**

**Der Fix:** Die Stärke wirkt jetzt in `armeeSpalten` — sie verbreitert den
Block, statt eine Zahl zu vergrössern, die nirgends hinpasst. Weil ein Faktor
über den Brettrand hinauszeigen kann, spannen die Stufen zwischen zwei Punkten,
die es wirklich gibt: der gewohnten Breite (`anteil`) und der ganzen Reihe
(`zurVollenBreite`). `armeeAnzahl` liest dieselbe Funktion, damit die Zahl unter
der Kachel nie wieder etwas anderes sagt als das Brett.

*(Nachtrag v0.104: Die beiden Felder `anteil` und `zurVollenBreite` gibt es
nicht mehr — seit die Stufen auch in die TIEFE wachsen, beschreibt jede Stufe
ihre Form selbst (`volleBreite`, `tiefe`), und die eine Quelle heisst
`armeeFelderBlock`. Der Merksatz unten gilt unverändert und wurde beim Umbau
genau so angewandt.)*

**Merksatz:** Wer eine Einstellung baut, die eine ZAHL verspricht, prüft, ob
der Platz sie hält — und lässt Versprechen und Wirklichkeit aus DERSELBEN
Funktion kommen. Ein `Math.min` gegen eine Obergrenze ist kein Schutz, sondern
eine stille Absage.

## Zwei Wege zum Partieende, aber nur einer wurde geprüft (v3.6, gefunden v0.94)

**Was zu sehen war:** Eine Partie stand still. Der Gegner war am Zug, die
Leiste sagte „am Zug", und kein einziges Feld liess sich antippen. Herauskommen
konnte man nur über Aufgeben oder Neu aufstellen; der Sieger bekam weder den
Abschluss-Bildschirm noch seine Ranglistenpunkte.

**Die Ursache:** `SCHACH.lage` — die Funktion, die Matt und Patt erkennt —
wurde ausschliesslich in `SCHACH_RUNDE.ziehen` gefragt. Eine Partie kann aber
auf ZWEI Wegen weitergehen: durch einen Zug und durch eine Fähigkeit, die den
Zug abgibt. Der zweite Weg prüfte nichts. Wer mit dem Spiegel eine zweite Dame
bekam und damit mattsetzte, beendete die Partie deshalb nicht — er stellte sie
ab.

**Warum es so lange unbemerkt blieb:** Bis v0.80 durfte gar keine Fähigkeit
mattsetzen („König und Matt bleiben unangetastet"), und solange stimmte die
Annahme, dass nur ein Zug eine Partie beenden kann. Mit dem Frost (v0.80) fiel
die Regel, mit ihr die Annahme — nur hat niemand die Stelle nachgezogen, die
auf ihr stand. Eine aufgehobene Regel hinterlässt Code, der sie noch glaubt.

**Die Lehre:** Wenn ein Zustand auf mehreren Wegen erreichbar ist, gehört die
Abschlussprüfung an jeden davon — oder in eine Funktion, die alle aufrufen.
`faehigkeitEinsetzen` fragt jetzt dieselbe `SCHACH.lage` in derselben
Reihenfolge wie `ziehen`. Und: Wer eine Regel aufhebt, sucht die Stellen, die
sich auf sie verlassen haben; die stehen selten dort, wo die Regel stand.

**NACHTRAG VOM SELBEN TAG (v0.95):** Der Nutzer hat auf den Befund hin die
REGEL geändert statt nur den Fehler zu nehmen — „items sollen nie direkt zu
schach oder matt führen". Damit ist die Frage „was tun, wenn eine Fähigkeit
mattsetzt" gegenstandslos: Sie darf es nicht mehr, und `_wirkungVerboten` weist
sie vorher ab. Die Prüfung mit `SCHACH.lage` bleibt trotzdem stehen, denn ein
Unglück, das die Fähigkeit beim Einsetzen aufsammelt, darf weiterhin beenden.
**Auch das ist eine Lehre:** Ein Fehlerbericht kann die Antwort „so soll es
nicht sein" bekommen — dann ist der Fix nicht der Fix, sondern die Vorlage für
eine Entscheidung. Erst fragen, welche der beiden Antworten gemeint ist.

**Zweiter Fund derselben Runde — dieselbe Sorte Fehler in der Anzeige:**
`zielFelder` beantwortete die Frage „welche Felder gehen" mit der halben
Bedingung. Dass die Wirkung zustande kommt, prüfte sie; dass der eigene König
danach nicht im Schach steht, prüfte nur `faehigkeitEinsetzen`. Das Brett
markierte deshalb Felder, die es hinterher ablehnte — 624 mal im Spieltest.
Beide fragen jetzt `_koenigVerbietet`. **Merksatz:** Eine Liste möglicher
Aktionen und die Prüfung beim Ausführen müssen aus derselben Funktion kommen;
sonst lügt die Anzeige, und zwar genau in den Fällen, die selten genug sind,
um beim Ausprobieren nicht aufzufallen.

**Und zur Methode:** Gefunden wurde beides nicht durch Lesen, sondern durch
einen Testspieler gegen die echten Dateien — 528 Partien über alle Spielarten
und Regel-Sätze, 111.000 Halbzüge, nach jedem Schritt dieselben Invarianten
geprüft (Brettmass, Zugrecht, Könige vorhanden, Lootbox-Felder, stabiles
Normalisieren). Er fand keinen einzigen Absturz — aber sechs Partien, die
stillstanden, und die 624 markierten Felder, die keine waren. Beides hätte
kein Regressionstest gefunden, weil beides erst in Stellungen auftritt, die
niemand von Hand aufbaut.

## Ein Hintergrund macht keine Ebene (v0.67, gefunden v0.94)

**Was zu sehen war:** Im Fenster „Mauer einsetzen?" lag eine Schachfigur des
Anleitungsbretts quer über dem Knopf „Abbrechen" — mitten im Wort.

**Die Ursache:** Die Knopfleiste des Dialogs klebt seit v0.67 unten fest
(`position: sticky`) und hat einen eigenen Hintergrund, damit der Inhalt hinter
ihr durchscrollt. Sie hatte aber keine Ebenen-Nummer. Der Browser zeichnet erst
alles ohne eigene Nummer und DANACH alles mit positiver Nummer — und die Figur
trägt `z-index: 1`. Sie wurde also nach der Leiste gezeichnet, quer über sie
hinweg. **Ein Hintergrund verdeckt nur, was VOR ihm gezeichnet wird.**

**Dieselbe Ursache lag an zwei weiteren Stellen** und war dort noch nicht
gemeldet: Die Restzeit-Marke eines Feldes (`z-index: 5`) schob sich über die
klebende Standleiste (`3`), und der schwebende Zurück-Knopf der Bibliothek
(`40`) lag über dem Dialog-Hintergrund (`10`) — er liess sich anklicken,
während ein Fenster offen war, und schloss die Ansicht dahinter.

**Die Lehre:** Ebenen-Nummern sind kein Bauteil-Detail, sondern eine
Eigenschaft der ganzen Seite. Wer sie je Bauteil vergibt, vergibt sie gegen
niemanden — und merkt es erst, wenn zwei Bauteile aufeinandertreffen, die
vorher nie gleichzeitig sichtbar waren. Sie stehen seit v0.94 als vier
Variablen an einer Stelle in `css\stil.css` (`--ebene-feldmarke`,
`--ebene-leiste`, `--ebene-schwebend`, `--ebene-dialog`), mit Abstand
dazwischen; wer eine neue braucht, trägt sie dort ein.

## Ein aktives Zugmuster sieht aus wie ein frisches Schach (v0.95, beim Bauen gefunden)

**Was zu sehen war:** Die neue Regel „kein Item führt direkt zu Schach" wies
den **Sprung** in fast jeder zweiten Stellung ab — 278 von 579 Versuchen im
Spieltest. Dabei bewegt der Sprung gar keine Figur.

**Die Ursache:** `SCHACH.imSchach` rechnet ein aktives **Zusatzmuster** mit.
Sobald `zusatzMuster: "springer"` im Stand steht, kann jede eigene Figur wie
ein Springer ziehen — also gilt der gegnerische König als angegriffen, sobald
irgendeine eigene Figur ihn im Springer-Abstand hat. Die Regel verglich
`imSchach` vorher und nachher, sah einen Unterschied und schloss daraus: „Das
Item hat Schach gegeben." Auf dem Brett hatte sich aber nichts bewegt.

**Die Lehre:** `imSchach` beantwortet nicht die Frage „steht der König im
Schach", sondern „ist sein Feld nach den GERADE geltenden Gangarten
erreichbar". Wer zwei Stände damit vergleicht, muss sicher sein, dass beide
dieselben Gangarten kennen — sonst misst er die Regeländerung statt der
Stellungsänderung. Die Prüfung hängt jetzt zusätzlich daran, dass sich die
Brett-Zeichenkette überhaupt geändert hat: **Wer keine Figur versetzt, kann
kein Schach geben.** Sprung, Teleport und Doppelzug fallen damit von selbst
heraus, ohne dass sie namentlich als Ausnahme dastehen müssten.

**Und zur Methode:** Aufgefallen ist es nicht im Test, sondern an einer Zahl,
die nicht passte — dieselbe Auswertung wie vorher, ein Wert von 4 auf 1146
gesprungen. Ein Wegwerf-Skript, das je Abweisung nachrechnet, WELCHE der drei
Regeln greift, hat die Ursache in zwei Minuten gezeigt. Eine Auswertung, die
man vor und nach einer Änderung nebeneinanderlegen kann, ist mehr wert als ein
weiterer Test.

## Ein tieferer Block sperrt sich selbst ein (v0.104, beim Bauen gemessen)

**Was zu sehen war:** Die neue Stufe „voll" füllt jedes Brett bis auf ein
2-mal-2-Feld in der Mitte. Mit der festen Aufstellung war alles in Ordnung — mit
dem Haken **Zufallsarmee** startete je nach Brett jede fünfte bis jede dritte
Seite ohne einen einzigen gültigen Zug, und bis zu 36 Prozent der Seiten standen
schon beim Anpfiff im Schach. Auf den Kreuz-Duellen war die Partie damit vorbei,
bevor sie anfing.

**Die Ursache ist die Tiefe, nicht die Menge.** Bis v0.103 war ein Block immer
zwei Reihen tief; die Armeen standen weit auseinander, und die gemischte
Reihenfolge (seit v0.49) war harmlos. Ab drei Reihen berühren sich die Fronten.
Ein gemischter Block sperrt sich dann selbst ein: Türme und Läufer stehen vor
der eigenen Mauer statt dahinter, die Bauern dahinter statt davor, und der König
steht mitten in der vordersten Reihe — direkt vor den gegnerischen Figuren.

**Die Lösung liegt in der Reihenfolge, nicht in der Ziehung.** Ab drei Reihen
sortiert `_armeeFiguren` die fertig gemischte Liste in zwei Gruppen: Offiziere
zuerst (sie landen in den äusseren Reihen), Bauern zuletzt. WELCHE Figuren eine
Seite bekommt, bleibt vollständig gewürfelt; WO sie stehen, folgt der gewohnten
Ordnung. Nachgemessen sank „Seite ohne Zug" damit auf 3 von 2244 Partien
(0,13 Prozent) — und einer der drei Fälle stand auf einer Stufe, die es vorher
schon gab, ist also kein neuer Fehler, sondern der alte Bodensatz der
Zufallsarmee.

**Die Lehre:** Eine Einstellung, die nur eine Zahl grösser macht, kann trotzdem
eine Regel brechen, die an einer ganz anderen Stelle steht. Die gemischte
Aufstellung war jahrelang richtig — sie war es nur, solange zwischen den Armeen
Platz lag. **Wer eine Grenze verschiebt, prüft nicht die Grenze, sondern das
Spiel dahinter:** Ein Wegwerf-Skript, das für jedes Brett und jede Stufe die
Zahl der gültigen Züge zählt, hat es in einem Lauf gezeigt. Kein Test hätte
danach gefragt, weil niemand auf die Idee kam, dass ein volleres Brett ein
totes sein könnte.

**Was als Bodensatz bleibt** (bewusst nicht behoben): Rund eine von 750 Partien
mit Zufallsarmee beginnt weiterhin mit einer Seite ohne Zug — das gab es vor
v0.104 auch schon. Eine Reparaturschleife dafür wäre teurer als der Knopf
„Neu aufstellen".

## Die naheliegende Liste war keine Uhr (v0.104, beim Bauen gefunden)

**Was zu sehen war:** Auf dem kleinen Kreuz bekam Weiss 35 Felder und Schwarz
33 — bei einer Aufstellung, die von Bauart her symmetrisch sein muss.

**Die Ursache:** Wenn sich ab der Stufe „viel" zwei Fronten berühren, entscheidet
der Abstand, wem ein Feld gehört; auf der Diagonale steht es unentschieden. Die
Regel dafür lautet „bei Gleichstand gewinnt die im Uhrzeigersinn folgende
Seite" — dann bekommt jede der vier Seiten genau eine ihrer beiden Diagonalen.
Als Uhr benutzt wurde `SCHACH_VARIANTEN.KREUZ.seiten`, und die Liste ist nach
**Gegenüber** sortiert (oben, unten, links, rechts). Der „Nachfolger" von oben
war damit unten — die gegenüberliegende Seite, die nie im Gleichstand steht. Die
senkrechten Seiten gewannen beide Diagonalen, die Flügel keine.

**Die Lehre:** Eine vorhandene Liste ist noch keine Ordnung. Wer eine
Reihenfolge braucht, die eine BEDEUTUNG trägt (hier: die Drehung des Bretts),
schreibt sie dort hin, wo sie gebraucht wird, statt eine Liste
weiterzuverwenden, die für einen anderen Zweck sortiert ist. Ein Test zählt
jetzt die Felder aller vier Kreuz-Seiten und vergleicht sie miteinander.

## Verzögerte Bewegung: Animation mit backwards, nie Übergang plus Delay (v0.117.1)

**Gemeldet:** Beim Nudelholz-Schub hüpften die geschobenen Figuren für ein
Einzelbild an ihre Endposition und wieder zurück, bevor die Walze sie
erreichte.

**Ursache:** Der Schub war als ÜBERGANG gebaut (Muster von `_zugAnimieren`,
plus `transitionDelay`): Figur per `transform` aufs alte Feld zurücksetzen,
zwei `requestAnimationFrame` später die Klasse mit dem Übergang anhängen und
den `transform` löschen. Zwischen dem Aufbau des Bretts (Figuren stehen im
DOM bereits am ZIEL) und dem Wirksamwerden der Rücksetzung kann der Browser
ein Einzelbild mit der Endlage zeichnen — bei einer einzelnen, sofort
startenden Bewegung fällt das nicht auf, mit Verzögerung sieht man es.

**Die Lehre:** Wer eine Bewegung mit WARTEZEIT baut, nimmt eine CSS-ANIMATION
mit `backwards`-Füllung (`nudelholz-schub`, Startlage in `--schub-von`):
Startbild, Verzögerung und Gleiten stecken in EINEM Stück, das synchron beim
Aufbau gesetzt wird — es gibt schlicht keinen Zustand, in dem die Figur schon
am Ziel steht. `_zugAnimieren` darf bei seinem Übergang bleiben: Es startet
ohne Verzögerung im übernächsten Bild.

## Ein Bild statt eines Zeichens macht drei Kästen kaputt (v0.121, beim Bauen gemessen)

**Was zu sehen war:** Die gerenderten Figuren erschienen zwar, aber deutlich
kleiner als die Schriftzeichen vorher. Beim Vergrössern des Kastens wurde
plötzlich das ganze Brett breiter und lief aus dem Bild. Und beim Blick auf
die Sendeliste des Deploys fehlten alle zwölf Bilder — sie wären auf der
veröffentlichten Seite gar nicht angekommen.

**Drei getrennte Ursachen, alle aus derselben Wurzel:** Ein Schriftzeichen ist
Text und passt sich seinem Kasten an; ein Hintergrundbild braucht einen Kasten
mit Maßen, und dieser Kasten mischt plötzlich in Layout-Rechnungen mit, die
vorher niemanden störten.

1. **`.feld` ist ein Flex-Kasten.** Ein Flex-Kind mit `width: 1.6em` in einem
   1.47em breiten Feld wird stillschweigend zusammengedrückt (`flex-shrink`
   steht von sich aus auf 1). Die Figur war also kleiner als angegeben, ohne
   dass irgendwo etwas Falsches stand. Heilmittel: `flex: 0 0 auto`.
2. **`.feld` ist zugleich ein Raster-Kind.** Ein Raster-Kind ist von sich aus
   mindestens so breit wie sein Inhalt (`min-width: auto`), und die
   `1fr`-Spalten des Bretts wachsen mit. Sobald die Figur breiter war als ihr
   Feld, zog sie das ganze Brett über sein `max-width` hinaus. Heilmittel:
   `min-width: 0` am Feld — nur im 3D-Look, wo der Überstand vorkommt.
3. **`tools\Deploy-Quizz.ps1` lädt nur freigegebene ORDNER hoch.** `img` stand
   nicht in der Liste. Das wäre besonders bitter geworden: Weil das
   Schriftzeichen unter dem Bild durchsichtig geschaltet ist, wären die
   Figuren nicht schmuckloser, sondern UNSICHTBAR gewesen — und der Fehler
   erst auf der öffentlichen Seite aufgefallen, nicht lokal.

**Die Lehre:** Wer Text durch ein Bild ersetzt, prüft drei Dinge getrennt —
ob der Kasten seine Maße behält (Flex), ob er die Umgebung verschiebt
(Raster), und ob die Datei überhaupt mit ausgeliefert wird. Die ersten beiden
findet man nur durch MESSEN im Browser, nicht durch Hinsehen: Die Zahlen im
Stylesheet stimmten die ganze Zeit. Gemessen wurde mit einer Wegwerf-Seite und
Edge im Kopflos-Betrieb (`--headless=new --screenshot`), die Feld-, Kasten-
und Seitenbreiten ausgibt — dasselbe Vorgehen wie bei v0.86/v0.94.
