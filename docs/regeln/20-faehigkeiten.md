# Team Schach — Fähigkeiten, Lootboxen und Beispiele

Eine der drei Themendateien der eisernen Regeln. Wegweiser und die Regeln,
die IMMER gelten: [00-INDEX.md](00-INDEX.md).

Hier drin: was eine Fähigkeit kosten darf, was sie mit König und Matt tun
darf, Zielfelder und Zusatzwahl, der gerechnete Zufall, die Bildanleitungen.
## Fähigkeiten, Lootboxen und Beispiele

- **Was sich unterscheidet, gehört an den ANFANG der Saat** (seit v0.49.1).
  `_zufallsWert` ist FNV-1a: Ein Unterschied im LETZTEN Zeichen erlebt nur noch
  eine Multiplikation und verschiebt das Ergebnis um rund 0,4 Prozent. Wer über
  etwas zählt, schreibt die Zahl nach vorne — `feld + "|glas|" + id`, nicht
  `id + "|glas|" + feld`. Zweimal ist genau das schiefgegangen: Ganze
  Feldblöcke trugen unter dem vollen Glas dasselbe Trugbild, und die
  Zufallsarmee stellte siebenmal fast dieselbe Figur auf. Die Funktion ist in
  Ordnung; die Saat war es nicht.
- **König und Matt bleiben unangetastet — von FÄHIGKEITEN.** Schild wirkt nicht
  auf den König, der König wird nicht gefesselt, Erdbeben lässt Könige stehen,
  und **kein Zug darf einen König schlagen** (`zuege()` filtert das) — sonst
  verschwände er beim Doppelzug vom Brett, statt dass die Partie durch Matt
  endet. Wer eine neue Fähigkeit baut, beantwortet zuerst: Was macht sie mit
  Schachmatt?
  **Für UNGLÜCKS-Lootboxen gilt das seit v0.73 nicht mehr** (Meldung I9,
  Nutzer-Entscheidung 09.08.: „weil es eine Unglücksbox ist — diese können zum
  Schachmatt führen"). Wer vom Stolperstein so zurückgeworfen wird, dass der
  eigene König danach im Schach steht, hat die Partie verloren; geprüft wird in
  `SCHACH_RUNDE.ziehen` NACH dem Rückwurf, nicht über `lage()` — die kennt nur
  Matt und Patt. Der Unterschied ist der Kern: Eine Fähigkeit wählt man, ein
  Unglück trifft einen.
  **ZWISCHEN v0.80 UND v0.94 DURFTE DER FROST MATTSETZEN** (Nutzer-Ansage
  18.08.). **Seit v0.95 nicht mehr** — und keine andere Fähigkeit auch:

  > **KEIN ITEM FÜHRT DIREKT ZU SCHACH, MATT ODER PATT** (Nutzer-Entscheidung
  > 20.08.2026: „items sollen nie direkt zu schach oder matt führen … da mauer
  > und so soll durch cleveres platzieren schon große bis massive auswirkungen
  > haben, also soll denken belohnt werden").

  Gemeint ist DIREKT gegen INDIREKT: Ein Item bereitet die Stellung vor, den
  Angriff führt der ZUG. Wer mit der Mauer clever sperrt, gewinnt weiterhin —
  nur einen Halbzug später und aus eigener Hand. Geprüft wird in
  **`SCHACH_RUNDE._wirkungVerboten`**, und `zielFelder` fragt dieselbe
  Funktion: Was zu Schach, Matt oder Patt führen würde, wird am Brett gar nicht
  erst markiert und beim Einsetzen abgewiesen; die Fähigkeit bleibt im Vorrat.
  Verboten sind drei Fälle — eigener König im Schach (seit v3.6), gegnerischer
  König im Schach (neu), und die Seite, die als Nächste zieht, hat keinen Zug
  (neu, das deckt Matt und Patt ab und trifft beide Seiten).
  **Die Ausnahme bleibt das Unglück:** Sammelt eine Fähigkeit dabei eine
  Lootbox ein und darin steckt ein Unglück, darf DAS weiterhin die Partie
  beenden (Entscheidung 09.08.). Deshalb steht die Abweisung in
  `faehigkeitEinsetzen` VOR dem Einsammeln und die Ende-Prüfung dahinter.
  **Sprung, Teleport und Doppelzug brauchen keine Ausnahme:** Sie rühren das
  Brett nicht an, sondern setzen nur ein Muster oder ein Zugrecht — was danach
  passiert, ist ein Zug und darf alles. **Erkannt wird das an der
  Brett-Zeichenkette, nicht am Namen:** Wer keine Figur versetzt, kann kein
  Schach geben. Das ist wichtiger, als es aussieht — `imSchach` rechnet ein
  aktives Zusatzmuster MIT, ein laufender Sprung sähe sonst wie ein frisches
  Schach aus und wäre in jeder zweiten Stellung verboten
  (`erkenntnisse.md`, „Ein aktives Zugmuster sieht aus wie ein frisches Schach").
  **Eine Feinheit aus der Frost-Zeit gilt weiter:** `imSchach` rechnet über
  `_feldBedroht` rein geometrisch und fragt den Frost nicht. Sonst wäre ein
  eingefrorener König durch „eingefroren heisst unantastbar" unangreifbar. Wer
  an einer der beiden Stellen etwas ändert, prüft die andere mit.
- **Die Rochade wird aus der Stellung gelesen**, nicht aus festen Plätzen:
  `rochadeFelder` (Türme) und `rochadeKoenige` (Könige) tragen die Rechte,
  `rochade` (KDkd) läuft als Altbestand mit. Je Richtung zählt der
  nächstgelegene Turm — sonst gehört der mittlere Turm des Doppelbretts beiden
  Königen.
- **Eine neue Fähigkeit nennt eine der vier Arten** (`zugmuster`, `ablauf`,
  `sofort`, `ziel`) — dann ist am Bildschirm nichts anzupassen. Dazu drei
  Schalter: `beendetZug` (danach ist der Gegner dran), `istDerZug` (man bleibt
  am Zug, darf aber NUR noch nach dem Muster ziehen — die Fähigkeit ist der
  Zug) und `imGegenzug` (geht auch während des gegnerischen Zuges).
- **Was eine Fähigkeit KOSTET, folgt einer Regel** (seit v0.47): Wer Material
  oder einen Angriff geschenkt bekommt, gibt den Zug ab (`beendetZug`); wer nur
  die Stellung verändert, behält ihn. Wird eine Fähigkeit zu stark, nimmt man
  ihr das Pluszeichen — **die Stufe bleibt, wo sie ist** (sie sagt nur, wie oft
  etwas kommt). Ein Test in `test-schach-runde.js` hält die Einteilung fest.
  Der **Bauernschub** ist seit v0.56 der Beleg für den zweiten Satz: Er ändert
  nur die Stellung, verschiebt dabei aber acht Figuren — er hat das Plus
  verloren, nicht die Stufe gewechselt.
- **Die Zeichen am Vorrat gehören der FÄHIGKEIT, nicht dem Spielstand** (seit
  v0.48). Pluszeichen (`!beendetZug && !istDerZug`) und Blitz (`imGegenzug`)
  stehen immer und überall — auch bei den Fähigkeiten des Gegners, auch während
  der Gegner am Zug ist. Von v0.41 bis v0.47 fragte das Pluszeichen
  `SCHACH_RUNDE.behaeltZug` und flackerte deshalb; als Merkmal, an dem man eine
  Fähigkeit wiedererkennt, war es damit unbrauchbar. `behaeltZug` gibt es
  weiterhin, aber nur noch für den SATZ im Einsetzen-Dialog („dein normaler Zug
  bleibt dir"). Und: **jede Marke ist ein Knopf** — wer nicht einsetzen darf,
  bekommt beim Antippen Beschreibung und Anleitung.
- **Eine Fähigkeit, die den Zug an sich zieht, kann scheitern.** `istDerZug`
  nimmt der Seite ihre gewohnte Gangart; bleibt dabei kein einziger Zug übrig,
  stünde die Partie (und `alleZuege` läse es als Matt). `faehigkeitEinsetzen`
  weist das Einsetzen deshalb ab, statt den Fall entstehen zu lassen.
- **EINE RICHTUNG, DIE DER NUTZER WÄHLT, ZÄHLT VON SEINER ARMEE AUS — nie vom
  Brett** (seit v0.101, Platztausch). „vor" ist die Marschrichtung der eigenen
  Bauern (`SCHACH.tauschSchritt` aus `bauernRichtung`), die drei übrigen folgen
  daraus. Der Grund steht in der Ansicht: Sie dreht sich so, dass die eigene
  Armee unten steht (`_drehungVon`, seit v0.72) — „oben auf dem Brett" und
  „oben auf dem Bildschirm" sind auf dem Kreuz zwei verschiedene Dinge, „vor"
  dagegen ist auf jedem Gerät dasselbe. Wer eine Fähigkeit mit Richtungswahl
  baut, rechnet genauso.
- **Eine zweite Angabe neben dem Zielfeld reist als `wahl`** — die LAGE der
  Mauer (v0.80) und die RICHTUNG des Platztauschs (v0.101). Der Bildschirm
  holt sie an EINER Stelle (`TEAM_SCHACH._zusatzWahl`), das Modell nimmt sie
  als letzten Parameter von `zielFelder`, `zielUmriss` und `_zielWirkung`
  entgegen. Wer eine dritte solche Fähigkeit baut, trägt sie dort ein statt
  einen zweiten Weg zu öffnen.
- **Eine Fähigkeit mit Zielfeld wird erst platziert, dann eingesetzt** (seit
  v0.57). Der Tipp setzt den Vorschau-Kasten (`TEAM_SCHACH.zielVorschau`,
  `zielUmriss`), ausgeführt wird über „Einsetzen". Den Umriss liefert
  `SCHACH_RUNDE.zielUmriss` aus `_zielWirkung` — nie eine zweite Liste, sonst
  zeigt der Kasten etwas anderes als das, was passiert.
- **Jedes aktive Item lässt sich abbrechen, und dann kommt es zurück** (seit
  v0.76). Bei `ziel`-Fähigkeiten ist noch gar nichts eingesetzt — dort räumt
  `zielVerwerfen` nur den Bildschirm auf. Bei `istDerZug` (Sprung, Teleport)
  ist die Fähigkeit schon verbraucht und ihr Muster steht im gemeinsamen Stand;
  zurückgenommen wird deshalb im Modell (`SCHACH_RUNDE.zugmusterZuruecknehmen`)
  und über denselben Schreibweg wie ein Zug. Welche Fähigkeit gerade läuft,
  beantwortet `laufendesZugmuster` aus der Tabelle — der Bildschirm liest nie
  selbst ein Muster. Kein Halbzug wird dabei verbraucht, also erscheint auch
  keine Lootbox.
- **Eine Leihgabe zählt ab dem Zeitpunkt, zu dem man wieder am Zug ist.**
  `SCHACH.LEIHDAUER` nennt die Halbzüge je Figurenart, `LEIHGABE_VORLAUF`
  addiert die zwei, die der abgegebene Zug und die Antwort des Gegners kosten.
  Ohne den Vorlauf zerfällt eine geliehene Dame, bevor sie ein einziges Mal
  ziehen kann. Wer eine Leihgabe baut, die den Zug NICHT abgibt, braucht dort
  keinen Vorlauf.
- **Jede Fähigkeit braucht ein Beispiel in `schach-vorschau.js`** — daraus
  entsteht der abgespielte Ablauf (Ausgangsstellung, Griff an den Vorrat,
  Handgriff am Brett, Wirkung) im Einsetzen-Dialog und in der Bibliothek. Die
  Bilder werden mit den echten Regeln GERECHNET, nie gezeichnet;
  `tests\test-schach-vorschau.js` prüft für jede Fähigkeit, dass ihr Beispiel
  aufgeht.
- **Eine Ausgangsstellung erklärt, WOZU die Fähigkeit gut ist** (seit v0.50):
  ein Angreifer, eine Sperre, eine Lücke. Ein Brett mit nur zwei Königen und
  der einen Figur zeigt das Was, aber nicht das Warum. Und: Ein Test darf kein
  Feld der Stellung als feste Zahl kennen, sonst blockiert er jede neue Szene;
  er fragt das Beispiel.
- **Ein Beispielbrett braucht KEINE Könige** (seit v0.58 steht auch keiner mehr
  darin). In v0.50 stand hier das Gegenteil, mit der Begründung, `SCHACH.zuege`
  prüfe für jeden Zug den eigenen König. Am 08.08. nachgemessen: Eine Stellung
  ganz ohne Könige läuft durch alle Bilder, Züge und Marken — `imSchach`
  liefert ohne König schlicht `false`. Könige gehören nur dort ins Bild, wo
  Schach zur Sache gehört.
- **Auf jedem Beispielbrett braucht JEDE Seite eine ziehfähige Figur.** Die
  Bilder werden mit den echten Regeln gerechnet, also gelten auch die echten
  Abbruchbedingungen: Wer die letzte Figur einer Seite schlagen lässt, beendet
  die Partie durch Patt, und danach liefert `bilder()` gar nichts mehr. Ein
  Test in `tests\test-schach-vorschau.js` hält es fest.
- **Die Zahl der Schritte einer Anleitung steht NICHT fest** (seit v0.58).
  Vorne kann ein Bild dazukommen (`todeszug`), hinten auch (`nachspiel`). Wer
  einen bestimmten Schritt braucht, sucht ihn (etwa über `tipp >= 0`), statt
  über einen festen Index zuzugreifen.
- **Was eine Szene gestreut bekommt, hängt an der Partie-Kennung.** Eine
  Beispielstellung, die eine bestimmte Wirkung zeigen soll (Ausdehnung nach
  oben, Risse in der richtigen Spalte), setzt dafür `saat` — ihre eigene
  Kennung. Nie die Regel anfassen, damit ein Bild passt.
- **Die Fähigkeiten-Bibliothek wird nur EINMAL gezeichnet**
  (`TEAM_SCHACH.infoGezeichnet`) — sie hängt an keinem Spielstand. Sonst
  klappte bei jeder Abfrage jeder Eintrag wieder zu. Wer dort etwas ändert,
  denkt an die laufenden Takte der Anleitungen (`_anleitungTakteBeenden`).
- **Alle Bedingungen fürs Einsetzen stehen in `SCHACH_RUNDE._wirkungVerboten`**
  (seit v0.95; der Kern davon, der eigene König, seit v3.6 als
  `_koenigVerbietet`) — **und `zielFelder` fragt dieselbe Funktion**. Bis v0.93
  kannte nur `faehigkeitEinsetzen` sie; das Brett markierte deshalb Felder, die
  es hinterher ablehnte (`erkenntnisse.md`, „Zwei Wege zum Partieende"). Wer
  eine Bedingung ergänzt, ergänzt sie in dieser einen Funktion — nie am Ende
  von `faehigkeitEinsetzen`, sonst weiss die Anzeige nichts davon.
- **Die Partie kann während einer Fähigkeit trotzdem enden** — aber nur durch
  ein Unglück, das sie dabei einsammelt. `faehigkeitEinsetzen` fragt am Ende
  dieselbe `SCHACH.lage` wie `ziehen` und setzt Ergebnis und `laeuft`. Bis
  v0.93 fehlte diese Zeile ganz, und eine mattsetzende Wirkung hielt die Partie
  an, statt sie zu beenden.
- **Was am Brett nicht zu sehen ist, prüft `darfEinsetzen` vorher — aber nicht
  um jeden Preis.** Drei Fähigkeiten hängen an gefallenen Figuren
  (`_gefalleneVorhanden`, seit v0.59), eine am eigenen Material
  (`_etwasZuHolen`: der Händler). Ist dort nichts, bleibt die Marke grau und
  nennt beim Antippen den Grund.
  **DER DIEB GEHÖRT SEIT v0.99 NICHT MEHR DAZU** (Nutzer-Entscheidung 20.08.:
  „Dieb und die neuen Items sollen so wie alle anderen auch eingesammelt werden
  und dann, wann man will, genutzt werden"). Von v0.94 bis v0.98 wurde seine
  Marke grau, sobald der Gegner nichts im Vorrat hatte — im Spieltest sparte
  das 861 Griffe ins Leere, am Tisch fühlte es sich an wie ein kaputtes Item.
  **Die Lehre gilt allgemein:** Eine Sperre, die einen Griff ins Leere spart,
  kostet den Eindruck, das Item gehöre einem. Wo die Fähigkeit dabei nicht
  verbraucht wird — und beim Dieb wird sie es nicht, `diebstahlAnbieten` sagt
  ab und lässt sie liegen —, ist die Auskunft im Fenster die bessere Antwort
  als die graue Marke.
- **Zwei Fragen an einen Weg, zwei Funktionen.** `SCHACH.wegFelder` sagt, welche
  Felder man ZEICHNET (beim Springer das L), `SCHACH.betreteneFelder`, welche
  die Figur wirklich BETRITT (beim Springer nur das Ziel). An der zweiten hängt,
  was unterwegs eingesammelt wird. Beide stehen im Regelwerk, damit Anzeige und
  Regel nicht auseinanderlaufen.
- **Was in einem Würfel steckt, entscheidet sich beim EINSAMMELN**, nicht beim
  Erscheinen — nur so kann der Vorrat des Sammlers Wiederholungen dämpfen. Beim
  Erscheinen steht nur die Stufe fest.

