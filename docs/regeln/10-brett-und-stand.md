# Team Schach — Brett, Stand und Spielarten

Eine der drei Themendateien der eisernen Regeln. Wegweiser und die Regeln,
die IMMER gelten: [00-INDEX.md](00-INDEX.md).

Hier drin: Brettmasse und Spielarten, Kreuz-Bretter, Bauern und ihre
Startseiten, Zufallsarmee und Figurenzahl, Risse und Mauern, Zugwege.
## Brett, Stand und Spielarten

- **Laufende Partien müssen laufen bleiben.** `SCHACH_TAFEL.normalisieren()`
  erkennt einen Stand aus der Zeit der einzelnen Partie und macht daraus die
  Partie `start`. Wer daran etwas ändert, bricht angefangene Partien;
  `tests\test-schach-tafel.js` prüft es Feld für Feld.
- **Kein `8` mehr in den Regeln.** `schach.js` rechnet mit `stand.breite` und
  `stand.hoehe`; die öffentlichen Umrechnungen (`feldNummer`, `feldName`,
  `spalteVon`, `reiheVon`) nehmen die Maße als **wahlfreie** Parameter mit
  Vorgabe 8. Diese Vorgabe ist der Grund, warum alle Aufrufe von früher gültig
  blieben — nicht wegnehmen.
- **Die Spielart gehört zur Partie und steht nach dem Anlegen fest.** Sie
  wechseln hieße das Brett umrechnen; bei anderer Größe ist das unmöglich.
- **Die Oberfläche verrät nie, was in einem Würfel steckt** — weder im
  Titel-Text beim Darüberfahren noch im Zugverlauf. Gezeigt wird höchstens, wie
  er AUSSIEHT, und darüber entscheiden zwei getrennte Haken der Partie:
  `regeln.seltenheitZeigen` die Farbe (wie selten?) und `regeln.pechZeigen` das
  umgedrehte Fragezeichen (ist er schlecht?). Bis v0.48 war „Unglück wird immer
  gezeigt" eine eiserne Regel; seit v0.49 ist es eine Einstellung, und sie ist
  **standardmässig aus** — dann sieht ein Unglückswürfel aus wie jeder andere.
- **Die BRETTFORM ist ein Merkmal der Spielart, keine Sortierung** (`form`,
  seit v0.63): `klassisch`, `rechteckig` oder `kreuz`. Der Anlege-Bildschirm
  fragt sie VOR der Spielart und zeigt darunter nur deren Grössen. Wer eine
  Spielart ergänzt, gibt ihr eine Form — sonst taucht sie in keiner Liste auf
  (ein Test in `test-bildschirm.js` fängt das ab).
- **Ein Bauer zieht von seiner STARTSEITE zur gegenüberliegenden** (seit
  v0.65). Die Seite steht je Bauer im Stand (`bauernSeiten`), gefragt wird sie
  über `SCHACH.bauernSeite`; Laufrichtung, Schlagfelder, Doppelschritt und
  Umwandlungsziel fallen daraus (`bauernRichtung`, `bauernSchlagfelder`,
  `bauernDarfDoppelt`, `bauernAmZiel`). **Wer keinen Eintrag hat, folgt der
  alten Farbregel** — Weiss unten, Schwarz oben; deshalb rechnet jedes Brett
  von früher und jede laufende Partie unverändert weiter. Wer einen Bauern
  bewegt, ohne dass ein Zug stattfindet (Nudelholz, Bauernschub, Erdbeben),
  führt die Einträge mit `SCHACH.figurMarkenVerschieben` nach — sonst läuft
  der geschobene Bauer danach in die falsche Richtung. **Seit v0.98 gilt das
  auch für die Unglücks-Lootboxen:** `_pechAusloesen` reicht sein `wege`
  dorthin weiter; bis dahin tat es das nicht, und ein vom Erdbeben geschobener
  Bauer lief auf dem Kreuz danach falsch herum.
- **DER DOPPELSCHRITT GEHÖRT DEM BAUERN, NICHT DER REIHE** (seit v0.98,
  Wünsche #37 und #38). Gefragt wird nicht mehr „steht er auf einer
  Startreihe", sondern **„hat dieser Bauer schon selbst gezogen"**. Wer
  geschoben wurde, hat sich nicht selbst bewegt und behält seinen
  Doppelschritt; wer gezogen ist, bekommt ihn auch dann nicht zurück, wenn ihn
  etwas auf seine Startreihe zurückschiebt. Die Antwort steht als
  `stand.bauernZog` (Feldnummern) im Stand und wird überall dort nachgeführt,
  wo auch `bauernSeiten` nachgeführt wird — Zug, Schub, Brettgrösse.
  **`bauernZugFassung` ist der Umstieg** (Muster von `bonusFassung`): Fehlt
  sie, baut `standNormalisieren` die Liste EINMAL aus der alten Reihen-Regel
  (`SCHACH._darfDoppeltNachReihe`, die es weiterhin gibt) — eine laufende
  Partie rechnet im Moment des Umstiegs deshalb genau wie vorher.
- **Ein Zug, der über alles hinweg setzt, hat KEINEN WEG** (seit v0.98, Wunsch
  #35). Der Teleport trägt dafür `ohneWeg` am Zug-Eintrag, und `wegFelder` wie
  `betreteneFelder` nehmen die Angabe als wahlfreien letzten Parameter. Vorher
  wurde er an der krummen Strecke ERKANNT — ein Teleport zwei Felder geradeaus
  fiel deshalb durch: Das Brett zeichnete eine Linie durch das Feld dazwischen,
  und die Figur sammelte dort eine Lootbox ein. **Wer eine weitere Bewegung
  ohne Weg baut, setzt die Angabe, statt sie aus der Geometrie zu raten.**
- **Ein Kreuz-Brett hat vier tote Ecken, und die stehen im STAND**
  (`kreuz: true` an der Spielart, gesetzt von `SCHACH_RUNDE.kreuzAufstellen`).
  Sie sind gewöhnliche **Risse** — damit muss keine einzige Regel etwas von
  „Kreuz" wissen, `SCHACH.gesperrt` beantwortet es wie immer. **Alle vier
  Seiten tragen eine volle Armee** (seit v0.65); die Teams stehen sich
  gegenüber (oben+unten gegen links+rechts), und welches Paar welche Farbe
  bekommt, wird aus der Partie-Kennung gerechnet. Zwei Armeen je Team heissen
  **zwei Könige und damit zwei Leben** (`koenigeAlsLeben`).
- **Mit `kreuzEinzeln` hat ein Kreuz nur EINE Armee je Team** (seit v0.72,
  K3 — die drei Spielarten „…-Duell"). Dann wird nicht das Paar gezogen,
  sondern die eine Startseite von Weiss; Schwarz bekommt die gegenüberliegende,
  die zwei übrigen Streifen bleiben leer. Ein König je Team heisst: **kein**
  `koenigeAlsLeben` — Schach und Matt gelten von Anfang an.
- **Die ANSICHT dreht sich in vier Lagen, der STAND nie** (seit v0.72, K4).
  `TEAM_SCHACH._drehungVon` liefert 0 bis 3 (Vierteldrehungen im
  Uhrzeigersinn) aus der Startseite der eigenen Armee; `_feldZuAnzeige` ist die
  EINZIGE Stelle, die daraus eine Feldnummer macht — Brett, Randbeschriftung
  und die gleitende Bewegung (`_wegZuAnzeige`) fragen sie. Gedreht wird einmal
  zu Beginn, nichts davon wird gespeichert: Jeder sieht sein eigenes Brett.
  **Woher die Startseite kommt, steht im STAND** (`startSeiten`, gesetzt beim
  Aufstellen) — nicht aus den Bauern abgelesen, sonst drehte sich die Ansicht,
  sobald der letzte Bauer fällt. Gefragt wird `SCHACH.startSeitenVon`.
- **Eine Spielart wird nie gelöscht, nur versteckt** (`versteckt: true`).
  Laufende Partien tragen ihre Kennung im Stand und verlören sonst ihre
  Spielart. `zurAuswahl()` filtert fürs Anlegen, `holen()` findet weiterhin
  alles.
  **Für FÄHIGKEITEN gilt seit v0.78 dasselbe** (erster Fall: Ausweichen).
  `versteckt: true` am Eintrag, gefiltert wird an EINER Stelle —
  `faehigkeitenDerStufe`. Damit fällt sie zugleich aus der Ziehung, aus
  `chanceVon`, aus den Erklärtexten und aus der Bibliothek; alle vier fragen
  dasselbe („was kann man bekommen"). `FAEHIGKEITEN` bleibt daneben
  vollständig, und das ist der Punkt: `normalisieren` wirft jede Fähigkeit aus
  dem Vorrat, die es dort NICHT mehr gibt — wer eine versteckte hat, darf sie
  aufbrauchen. Wer eine löschen will, muss diesen Verlust ausdrücklich wollen
  (so beim Erdbeben v0.54). **Eine neue kommt ans ENDE von `SCHACH_VARIANTEN.liste`** — die
  Partie-Kennungen der Tests entstehen aus der Reihenfolge, und die gerechneten
  Würfel hängen an der Kennung. Ein Eintrag in der Mitte lässt Tests scheitern,
  die mit der neuen Spielart nichts zu tun haben.
- **„Zählt der König als gewöhnliche Figur?" ist eine Frage JE FARBE**
  (`SCHACH.koenigSchlagbarFuer`, seit v0.49). Zwei Wege führen dorthin:
  `koenigSchlagbar` ist eine Eigenschaft des BRETTS und gilt immer;
  `koenigeAlsLeben` eine der STELLUNG — solange eine Seite mehr als einen
  König hat, sind ihre Könige schlagbar, beim letzten kippt es zurück
  („zwei Leben"). Wer irgendwo `variante.koenigSchlagbar` direkt abfragt,
  übersieht den zweiten Fall. **Seit v0.60 benutzt KEINE Spielart mehr
  `koenigSchlagbar`** — auch das Doppelbrett rechnet mit `koenigeAlsLeben`
  (Wunsch #17: der erste König fällt normal, beim letzten gelten wieder Schach
  und Matt). Der Schalter bleibt trotzdem: Er ist die einzige Möglichkeit, ein
  Brett ganz ohne Schachbegriff zu bauen.
- **DIE STÄRKE GILT FÜR JEDE PARTIE, nicht nur für die Zufallsarmee** (seit
  v0.100, Nutzer-Entscheidung 20.08.: „Zufallsarmee hat keine Auswirkung mehr
  auf die Grösse der Armee, nur der Regler hat es"). Der Haken entscheidet, WELCHE
  Figuren stehen; die Stärke, WIE VIELE. Ohne Haken bringt
  `SCHACH_RUNDE.aufstellungAnpassen` die feste Aufstellung auf denselben
  Feld-Block, den auch die Zufallsarmee benutzt — **Könige bleiben dabei
  immer stehen**, sonst verlöre eine Spielart mit König ausserhalb der Mitte ihn
  beim Anpassen.
  **Sie nimmt weg UND stellt hin** (seit v0.104, vorher hiess sie
  `aufstellungZuschneiden` und konnte nur wegnehmen): Ab der Stufe „viel" steht
  der Block tiefer, als die Spielart Figuren mitbringt. Sie darf deshalb nur auf
  ein FRISCHES Brett laufen und nie zweimal nacheinander — der zweite Aufruf
  rechnete auf dem Ergebnis des ersten. Aufgerufen wird sie an genau drei
  Stellen: `partieAnlegen`, `neuAufstellen`, Vorschau der Kachel. **Auf dem
  Kreuz baut sie `bauernSeiten` neu**, weil sie zusätzliche Bauernreihen
  aufstellt.
  **`regeln.armeeFassung` ist der Umstieg** (Muster von `bonusFassung`): Nur bei
  1 wird zugeschnitten. Sie ist nötig, weil „kein Eintrag" für zwei Altfälle
  gleichzeitig das Richtige tun müsste und sie sich widersprechen — eine Partie
  von früher MIT fester Aufstellung stand voll auf dem Brett, eine MIT
  Zufallsarmee hatte die halbe Armee. Wer am Zuschneiden etwas ändert, prüft
  beide.
- **DIE STÄRKE FORMT EINEN FELD-BLOCK, sie multipliziert keine Zahl** (seit
  v0.99, seit v0.104 auch in die Tiefe). Die eine Quelle ist
  `SCHACH_VARIANTEN.armeeFelderBlock` — sie liefert Felder samt TIEFE;
  `armeeAnzahl` ist ihre Länge, `_armeeFelder` und `_armeeFelderKreuz` sind
  Übersetzer. Wer eine zweite Rechnung für dieselbe Sache aufmacht, holt sich
  den Fehler von v0.98 zurück (`erkenntnisse.md`, „Eine Einstellung, die eine
  Zahl verspricht"). Zwei Tests halten es fest: Jede Stufe stellt mehr auf als
  die darunter, und die angekündigte Zahl gleicht der Zahl der Startfelder.
- **AB DREI REIHEN STEHEN DIE BAUERN VORN — auch bei der Zufallsarmee** (seit
  v0.104, `_armeeFiguren`). Gemischt wird weiter, aber nur innerhalb der beiden
  Gruppen: Offiziere in die äusseren Reihen, Bauern nach vorn. Ohne das sperrt
  sich ein tiefer Block selbst ein — nachgemessen stand bei „voll" je nach
  Brett jede fünfte bis dritte Seite schon beim Anpfiff ohne gültigen Zug da
  (`erkenntnisse.md`). **Bis zwei Reihen bleibt der freie Mix**, dort ist er
  seit v0.49 gewollt.
- **Die Zufallsarmee ist ein HAKEN der Partie** (`regeln.zufallsArmee`, seit
  v0.51 — vorher eine eigene Spielart). Das echte Brett baut
  `SCHACH_RUNDE._armeeStand` aus der Partie-Kennung — gerechnet, nicht
  gewürfelt, und danach steht es als gewöhnliches Brett im Stand; nachgerechnet
  wird es nie wieder. Wie viele Figuren, leitet `SCHACH_VARIANTEN.armeeAnzahl`
  aus der `aufstellung` ab (die Hälfte) — **keine Spielart nennt eine Zahl**.
  Aufgerufen wird immer `armeeAufstellen`, und die Funktion darf **nicht**
  `armeeAn` fragen: Das normalisiert, und `normalisieren` baut sich eine leere
  Runde — Endlosschleife.
- **Auf dem Kreuz steht die Zufallsarmee JE STARTSEITE** (seit v0.76,
  `_armeeStandKreuz`). `_armeeStand` kannte bis dahin nur oben und unten und
  liess die Flügel leer. Drei Dinge gehören zwingend dazu: die Startseiten
  kommen aus dem Stand (`SCHACH.startSeitenVon`, nie aus den Figuren
  abgelesen), die Risse der toten Ecken bleiben unangetastet, und
  **`bauernSeiten` wird NEU gebaut** — die Einträge der Vorlage zeigen nach dem
  Würfeln auf Felder, auf denen kein Bauer mehr steht. Die Menge rechnet
  `armeeSpalten` aus der **Mitte** des Kreuzes, nicht aus der Brettbreite:
  `armeeAnzahl` ist damit die Zahl je Startseite (kleines Kreuz 4), ein Team
  mit zwei Streifen bekommt doppelt so viele.
- **Nichts erscheint auf einem gesperrten Feld** (seit v0.76). Lootboxen fragen
  in `_bonusNachziehen` `SCHACH.gesperrt` mit — auf einem Riss wäre die Box für
  immer unerreichbar, unter einer Mauer unsichtbar. **Und Risse zählen auch
  nicht als Brett:** Der Massstab „wie leer ist es gerade" lässt sie aus, sonst
  regnete es auf dem Kreuz weniger als auf einem gleich grossen Quadrat.
- **`SCHACH._ausfuehren` baut den neuen Stand als LITERAL, nicht als Kopie**
  (Merkposten seit v0.98). Jedes Feld, das dort nicht ausdrücklich steht, ist
  nach dem Zug weg — und kein Normalisieren holt es zurück. Genau so verlor das
  Enttarnen seine Wirkung (Meldung #36) und `startSeiten` seine Zusage, für die
  ganze Partie zu gelten. Wer ein Feld im Stand ergänzt, trägt es DORT ein; ein
  Test in `tests\test-schach.js` vergleicht die Schlüssel vorher und nachher
  und fängt das Vergessen ab, ohne je gepflegt werden zu müssen
  (`erkenntnisse.md`, „Ein Stand, der als Literal gebaut wird").
- **Was `schach.js` wissen muss, steht im STAND, nicht in `regeln`.** Die
  Regeln der Partie gehören `SCHACH_RUNDE`; das Regelwerk sieht nur den Stand.
  Deshalb wandert `koenigeAlsLeben` beim Aufstellen in den Stand (v0.51). Wer
  einen Haken erfindet, den eine Regel braucht, macht es genauso.
- **Die Brettgröße kann sich mitten in der Partie ändern** — größer
  („Ausdehnung") wie kleiner („Einsturz", seit v0.54).
  **SEIT v0.84 SIND BEIDE AUS DEM SPIEL GENOMMEN** (`versteckt: true`,
  Nutzer-Ansage „führt zu riesigen Bugs, erst überarbeiten") — die Regeln
  darunter bleiben trotzdem gültig und sind beim Zurückholen zu erfüllen; was
  die Überarbeitung angehen muss, steht in `entscheidungen\entschieden-ab-v0-41.md`.
  Wer Feldnummern
  speichert, rechnet sie mit um, und zwar **alle**:
  `SCHACH._feldnummernUmrechnen` bedient Rochade, Schild, Fessel, Frost,
  Mauern, geliehene Figuren und Risse an EINER Stelle. Die Würfel liegen in der
  RUNDE, nicht im Stand — `_pechAusloesen` rechnet sie über `wirkung.umrechnen`
  nach. Bis v0.53 fehlten Mauern, Leihgaben und Würfel; sie lagen nach einer
  Ausdehnung woanders.
  **Die Grösse zurückzugeben reicht nicht — die FORM muss mit** (seit v0.77.1).
  Ausdehnung und Schrumpfung sind ein Paar, und Hin-und-Zurück muss wieder
  dasselbe Brett ergeben. Bis v0.77.0 tat es das nur für die Masse: Die
  Schrumpfung warf die Risse der wegfallenden Linie weg (richtig), die
  Ausdehnung baute die neue Linie vollständig frei an (auf einem Kreuz falsch)
  — und so frass sich die Kreuzform über eine lange Partie von den Rändern her
  auf. `SCHACH._eckenFortsetzen` setzt jetzt die Ecken der angrenzenden
  Randlinie fort: nur Löcher, nie Figuren, und nur die zusammenhängenden Läufe
  von den ENDEN her (ein Loch mittendrin ist ein Erdbeben und gehört dem
  Spielverlauf). **Wer einen weiteren Eingriff auf die Brettgrösse baut, prüft
  ihn gegen sein Gegenstück, nicht allein.**
- **Ein gesperrtes Feld hat zwei Ursachen** (seit v0.54): eine **Mauer**
  (läuft ab) oder ein **Riss** (bleibt die ganze Partie, Unglückswürfel
  „Erdbeben"). Die Regeln fragen immer `SCHACH.gesperrt`, nie `mauerAuf` —
  letzteres beantwortet nur, wie der Bildschirm es zeichnen soll. **Wer eine
  Figur bewegt, fragt `gesperrt` mit** (seit v0.60): Das Nudelholz tat es bis
  v0.59 nicht und schob Figuren in Mauern und Löcher hinein.
  **Der ERDRUTSCH tat es bis v0.81 auch nicht** — beim Aufräumen 2026 wurden
  Bauernschub, Nudelholz, Erdbeben und Schubs erfasst, er nicht, weil er als
  Unglückswürfel an anderer Stelle steht. Es sind **fünf** Funktionen, die
  schieben oder setzen; wer eine sechste baut, trägt sie hier ein
  (`erkenntnisse.md`, „Die eine Funktion, die man beim Aufräumen vergisst"). Und **ein Würfel
  auf einem RISS fällt hinein** (`_pechAusloesen` räumt ihn weg) — unter einer
  Mauer bleibt er liegen, die läuft ja ab.
- **Ein Zug kann unterwegs enden** (seit v0.58, `_zugAmRissAbbrechen`). Wer
  einen Erdbeben-Würfel im Vorbeiziehen mitnimmt, reisst die Löcher in seinen
  eigenen Weg; liegt eines davon noch VOR ihm, endet der Zug auf dem letzten
  freien Feld davor. Drei Dinge gehören zwingend dazu:
  **(1)** Eine Sperre zählt erst AB dem Feld des Würfels — was hinter der
  Figur aufreisst, hat sie schon passiert. **(2)** Der Schlag fällt mit aus:
  Wer sein Ziel nicht erreicht, schlägt dort nichts, also kommt die
  geschlagene Figur zurück und aus `verloren`/`gefallen` heraus. **(3)** Der
  Verlaufseintrag des Zuges wird nachgeführt (`nach`, `wege`), sonst wandert
  die Figur am Bildschirm auf ein Feld, auf dem sie nicht steht. Und:
  `SCHACH.zuege` bleibt unangetastet — als der Zug gewählt wurde, war der Weg
  frei.
- **WAS AN EINER FIGUR HÄNGT, ZIEHT MIT IHR MIT — an EINER Stelle**
  (`SCHACH.figurMarkenVerschieben`, seit v0.102; hiess bis v0.101
  `bauernSeitenVerschieben`). Nachgeführt werden vier Angaben: die Startseite
  je Bauer (`bauernSeiten`), das Erstzug-Recht (`bauernZog`), das Schutzschild
  (`schildFeld`) und die Fessel (`fesselFeld`). **Wer eine fünfte
  figurgebundene Angabe erfindet, trägt sie dort ein** — es gibt keinen zweiten
  Ort dafür, und der alte Name war schon seit v0.98 falsch.
  **Der gemeinsame Nenner: Geschoben zu werden ist KEIN Zug.** Deshalb
  verbraucht ein eigener Zug das Schild weiterhin (Regel seit v3.3), ein Schub
  aber nicht — genau wie beim Doppelschritt-Recht der Bauern. Wo nach dem Schub
  keine Figur mehr steht, fällt die Marke weg; sonst erbt sie die nächste
  Figur, die dort hinzieht.
  **DER FROST GEHÖRT NICHT DAZU:** Er sperrt eine FLÄCHE (2×2) und ist eine
  Mauer um den Block, kein Anhängsel einer Figur — er bleibt liegen, wo er ist.
- **Frost und Fessel sind seit v0.56 zwei verschiedene Dinge.** Frost sperrt
  eine FLÄCHE (2×2) für EINEN Zug und macht unantastbar; er trifft **jeden** im
  Block, auch die eigenen Figuren. Die Fessel hält EINE gegnerische Figur über
  MEHRERE Züge fest (`fesselBis` am Takt) und lässt sie schlagbar. Gefragt wird
  `SCHACH.eingefroren` und `SCHACH.gefesselt`, nie das Feld direkt. Und: **ein
  leeres Feld im Frost-Block sperrt nichts** — dafür gibt es die Mauer.
  **Seit v0.80 ist der Frost eine MAUER UM DEN BLOCK, kein Anker** (und er gilt
  auch für Könige, siehe die eiserne Regel weiter unten): Wer drinsteht, zieht
  weiter — aber nur auf Felder INNERHALB des Blocks. Die Fessel bleibt das
  Gegenstück: Sie nagelt wirklich fest und lässt Könige aus.
- **Ein zweiter König ist immer „zwei Leben", nie ein zweiter Klotz.** Wer
  einen König entstehen lässt (seit v0.56 die Verstärkung), setzt
  `koenigeAlsLeben` im Stand — sonst wäre Schachmatt nicht mehr eindeutig.
  Dazu zwei Sperren, die bleiben müssen: Der LETZTE König lässt sich nicht
  eintauschen, und ohne freies Nachbarfeld für die zweite Dame wird das
  Einsetzen abgewiesen.
- **Vorzüge gibt es nicht mehr** (v2.5 gebaut, v2.8 ausgebaut — Begründung in
  `entscheidungen/entschieden.md`). Sollte jemand sie erneut bauen: Ein
  Vorzug darf NIE in den
  gemeinsamen Stand, sonst liest der Gegner ihn mit. Ein Team-*Vorschlag*
  (`regeln.einigkeit`) steht dagegen absichtlich drin.
- **Ein Ergebnis wird festgeschrieben, nicht nachgerechnet.** `tafel.chronik`
  bekommt beim Beenden einen Eintrag; die Rangliste rechnet nur daraus. Deshalb
  darf `partieEntfernen` die Chronik NIE anfassen — sonst verlieren alle
  Beteiligten rückwirkend ihre Punkte.
- **Bonusfelder werden als EINGESAMMELTE gespeichert** (`bonusGesammelt`), nie
  als verbliebene: Firebase wirft leere Listen weg, und „alle eingesammelt" käme
  sonst als „noch keins" zurück. Seit v2.0 steht daneben `bonus` (was gerade
  liegt) mit `bonusFassung`; fehlt die Fassung, stammt die Partie aus der Zeit
  der vier festen Felder und wird daraus aufgebaut.

