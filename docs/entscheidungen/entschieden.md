# Blunderluck - Entscheidungen / Entschieden - und warum

## Münzen, Shop, Serie ab Rundenstart (27.09.2026, v0.152.0)

Nutzer: „wir brauchen eine In-Game-Währung, die über beide Spiele geht …
Extra-Leben, Tipps und Schild für Flammen … in einem Shop" · „Shop auf dem
Platz von Bald" · „Name → Münzen" · „Serie soll einfach: einmal eine Runde
starten, egal welches Game" · „ja über 60".

- **Alles in `zaehler`, keine neue Regel:** Münzen, Käufe, Verbrauch und
  die Serie sind Zahlen mit Buchstaben-Namen am eigenen Zweig — genau, was
  §11b in `zaehler` schon erlaubt (0 … 1 Mrd.). Das Datum der Serie steht
  als Zahl JJJJMMTT (`serieBis`). Eine eigene Regel wäre mehr Risiko (ein
  Formfehler → der GANZE Konto-Eintrag abgelehnt) ohne Gewinn.
- **Summe statt gemeinsamer Stand:** Jedes Spiel zählt nur in SEINEM Zweig
  verdient/ausgegeben und gekauft/benutzt; Kontostand und Vorrat werden
  über alle Zweige summiert. So kann kein Spiel das Geld des anderen
  überschreiben. Zwei Geräte desselben Spiels: je Zähler gilt der größere
  Wert (`_zaehlerZusammen`), die Zähler wachsen nur.
- **Nie unter 0 — ehrlich gerechnet:** Kaufen nur mit genug Guthaben.
  Kaufen zwei Geräte gleichzeitig vom selben Geld, bleiben beide Käufe
  (nichts wird überschrieben), die Summe kann kurz negativ sein; angezeigt
  wird 0, kaufen geht erst wieder, wenn neu Verdientes das Minus deckt.
  Eine Sperre über das Netz (Transaktion) wäre ohne Server nicht zu haben.
- **Serie über 60:** Die Tagesliste bleibt kurz (60), die Länge trägt der
  Zähler. Gerechnet wird ab dem Zähler mit dem neuesten `serieBis` aller
  Zweige, danach die Tage vorwärts; ohne Zähler ergibt das genau die alte
  Rechnung. Ein fehlender Tag wird überbrückt (erst Level-Schutz je Serie,
  dann gekaufte Schilde, die dabei verbraucht werden), zwei fehlende
  beginnen neu.
- **Was zählt:** der Anpfiff jeder eigenen Partie (Turm, Frei, Freunde,
  Tagesbrett) — beim ersten Zeichnen einer laufenden Partie, einmal je Tag
  wirksam. Die Tagesaufgabe zählt ihre eigenen Abzeichen jetzt in
  `zaehler.tagesaufgaben` (Umzug aus den alten Tagen beim ersten Anlegen).
- **Tipp:** Bob hat keine eigene Matt-Bewertung (seine Suche bewertet ein
  Matt wie die Stellung). Der Tipp nimmt deshalb zuerst ein Matt in einem
  Zug, beim Tagesbrett den ersten Zug der geprüften Lösung, sonst Bobs Zug
  auf „Meister".
- **Leben:** In Blunderluck kostet eine verlorene Turm-Partie heute nichts
  (Stufe beliebig oft, Bot-Partien zählen nicht für die Rangliste). Das
  Leben ist deshalb vorerst „gleich nochmal dieselbe Stufe" aus dem
  Abschluss — offen beim Nutzer, ob es einen echten Einsatz braucht
  (z. B. Weiterspielen vor dem letzten Zug). Beim Tagesbrett gibt es kein
  Leben: Nochmal geht dort ohnehin beliebig oft.

## Wertung repariert, Tages-XP nach Schwierigkeit, Rahmen ab 10 (27.09.2026, v0.151.0)

Auftrag: `Design\3D-Schrift\docs\AUFTRAEGE-RUNDE-6.md`, D0 Nachtrag
(„erst reparieren, dann BEIDE zusammen ausliefern"). Die Schwellen-Tabelle
im Eintrag v0.149.1 darunter ist damit ÜBERHOLT.

- **Worker statt Hauptstrang:** `js\wertung-rechner.js` lädt per
  `importScripts` dieselben Dateien wie die Seite und ruft
  `WERTUNG.zugWerten`. Ohne Worker (Node, `file://`, Ladefehler) rechnet
  `zugMerkenImHintergrund` auf dem Hauptstrang. Weil das Ergebnis jetzt
  später kommt, zählt der Abschluss die Figuren erst, wenn
  `WERTUNG.rechnetNoch(partie)` falsch ist; `WERTUNG.beiFertig` zählt dann
  nach und zeichnet neu. Im Browser gemessen: Hauptstrang 1 ms, Ergebnis
  nach ~1,5 s (mit Worker-Start, unter Last).
- **Formel:** Verlust = bester − gespielter Wert in Hundertstel-Bauern
  (beide auf ±1500 begrenzt), Genauigkeit 100·e^(−Verlust/80). Die
  Lichess-Kurve über Gewinnchancen wurde verworfen: Sie wird nahe 0/100 %
  flach, wer klar verliert, verliert mit jedem Zug „nichts".
- **Keine echte Wahl = nicht werten:** Liegen bester und gespielter Wert
  beide jenseits ±1500 auf derselben Seite (entschieden), zählt der Zug
  nicht — ausser für die Seite am Zug steht ein Matt auf dem Brett.
  An rohen Verlusten gemessen: dieser eine Schritt senkte Zufallszüge von
  71 auf 34 %. Maßstab 60/80/100/150 verglichen, 80 trennt am klarsten.
- **Schneller:** erst der gespielte Zug, dann die anderen nur gegen
  „besser als der gespielte?" (Alpha = gespielt). Dauer je Zug am
  Bürorechner (Node): **Mittel 464 ms, höchstens 1,9 s** (vorher 1,3 s /
  2,7 s) — im Worker, also ohne Stillstand.
- **Gemessen** (4 Partien je Paarung, reine Schachpartien bis 90
  Halbzüge, Genauigkeit je Partie: Mittel, Spanne):

  | Spieler \ Bob | leicht | mittel | schwer | meister |
  |---|---|---|---|---|
  | zufällig | 26 (0–38) | 39 (24–63) | 40 (34–52) | 26 (15–37) |
  | leicht | 63 (48–80) | 39 (11–57) | 29 (1–49) | 62 (44–74) |
  | mittel | 92 (83–100) | 79 (69–84) | 77 (72–85) | 72 (49–87) |
  | schwer | 78 (63–88) | 81 (77–89) | 63 (52–75) | 71 (62–82) |
  | meister | 84 (78–98) | 85 (73–96) | 92 (81–98) | 88 (85–93) |

  Zufall und leicht liegen klar unter mittel/schwer/Meister, Meister klar
  oben. **Mittel und schwer trennt die Wertung NICHT:** Sie rechnet selbst
  nur zwei Züge tief wie Bob „mittel"; was „schwer" tiefer sieht, kann sie
  nicht belohnen.
- **Schwellen neu: 60/80 · 63/82 · 66/84 · 69/86 · 72/88 · 75/90**
  (Springer/König, Werkbank … Meisterliga). Springer = ordentlich gespielt
  (über Zufall/leicht), König = nahe Meister-Niveau.
- **Tages-XP nach Schwierigkeit** (in Typoluck gleich): Grund 15/20/30 für
  Matt in 1/2/3 (`FORTSCHRITT.TAGES_GRUND`, `TAGESBRETT.schwierigkeit`),
  ×1,5 nur auf den Grund, +10 je Figur, Serie wie bisher. Die Karte zeigt
  1–3 Punkte.
- **Rahmen:** EINE Regel mit Typoluck 0.14.0 — Silber 10, Gold 15, Platin
  20, ab 25 alle 5 Level „Glanz". Kupfer ab 5 entfällt. Ein Test prüft
  Level 1–60: Rahmen genau bei 10, 15, 20 …
- **Ans Konto nur, was §11b erlaubt:** `FORTSCHRITT.fuerKonto` filtert
  beide Zweige (`umzug`, flache 0.10.0-Felder, fremde Spiele fallen weg,
  Zahlen begrenzt). Abgeglichen mit dem Zweig-Kopf von Typolucks
  `js\fortschritt.js` (gelesen, nicht geändert).

## Tagesbrett-Aufgaben und Turm-Schwellen gemessen (27.09.2026, v0.149.1)

**Die 40 Aufgaben in `TAGESBRETT.AUFGABEN`** (10× Matt in 1, 18× Matt in 2,
12× Matt in 3) stammen aus Partien Bob gegen Bob (Stufen leicht/mittel/
schwer gemischt, die ersten 4 Halbzüge zufällig). Geprüft wurden die
Stellungen 1, 3 und 5 Halbzüge vor einem Matt mit einem VOLLSTÄNDIGEN
Löser (alle Züge, alle Antworten, kein Budget; Rochade und en passant
gelöscht wie im Spiel): Matt in genau N, kein kürzeres; bei N = 2 und 3
genau EIN erster Zug (Feldpaar), der es erzwingt; keine Umwandlung als
Lösung; höchstens zwei Damen je Seite. Laufzeit rund 25 Minuten. Die
Reihenfolge mischt die Längen (2, 1, 3, 2, 2, 1, 3, 2 …). Das erste
Verfahren (alle Stellungen jeder Partie, teure Prüfung nur bei höchstens
16 Zügen) fand in 40 Partien kein einziges Matt in 2 — verworfen.

**Die Schwellen der Orte** (Genauigkeit für Springer/König): Der Entwurf
nannte 60/75 … 78/90. Gemessen mit `WERTUNG.zugWerten`, 6 Partien je
Paarung, reine Schachpartien bis 100 Halbzüge (Mittel je Partie, Spanne):

| Spieler \ Bob | leicht | mittel | schwer | meister |
|---|---|---|---|---|
| zufällig | 88 (81–91) | 89 (71–98) | 85 (71–96) | 82 (59–98) |
| leicht | 88 (79–98) | 91 (77–99) | 87 (83–92) | 90 (75–99) |
| mittel | 98 (95–100) | 98 (95–100) | 94 (90–97) | 96 (93–99) |
| schwer | 92 (85–96) | 94 (89–100) | 96 (93–99) | 95 (90–100) |
| meister | 97 (94–100) | 98 (96–100) | 97 (91–100) | 98 (95–100) |

Schon zufälliges Ziehen liegt über allen Entwurfs-Schwellen — jeder Sieg
hätte den König gebracht. Die Rechnung (Mittel der Zug-Genauigkeiten,
Lichess-Formel) drängt die Werte nach oben, weil viele ruhige Züge nichts
verlieren. **Neu: 88/93 · 89/94 · 90/95 · 91/96 · 92/97 · 93/98.** Grund:
Unter 88 liegen Zufall und schwache Spieler; Springer verlangt „ordentlich",
König verlangt Bob-Niveau, oben fast fehlerfrei. Menschen sind nicht
gemessen — nach den ersten echten Turm-Partien nachsehen.

**Befund Rechenzeit (offen, an den Nutzer):** `zugWerten` dauert am
Bürorechner im Mittel 1,3 s, höchstens 2,7 s je Zug (ohne Last gemessen;
Budget 1,5 Mio. je Suche, zwei Suchen je Zug) — und läuft im
Hauptstrang nach dem Senden. Am Handy steht die Seite damit nach jedem
eigenen Turm-Zug einige Sekunden. Vorschlag: Budget deutlich senken oder
in einen Worker; das ändert die Werte, danach die Schwellen neu messen.

## Runde 6 Teil A: gemeinsamer Datenvertrag mit Typoluck (27.09.2026, v0.150.0)

Auftrag: `Design\3D-Schrift\docs\AUFTRAEGE-RUNDE-6.md`, Teil A (dort
entschieden: Zweig-Modell, Schlüssel `upcrew.fortschritt`). Beim Bau
entschieden:

- **Schlüssel je Person = Spieler-`id` des eigenen Konto-Eintrags, sonst
  „gast".** Beide Spiele lesen denselben Konto-Eintrag, die `id` ist also
  gleich; die uid wäre es auch, steht aber nicht in `ICH`. Gäste beider
  Spiele teilen sich „gast" — nur so gibt es ×1,5 auch ohne Konto.
- **Umzug beim ersten SCHREIBEN, nicht beim Lesen.** Der Altstand
  `blunderluck.fortschritt` wird beim Lesen eingerechnet und erst beim
  ersten Speichern in den Eintrag der dann angemeldeten Person übernommen
  (danach Schlüssel weg). Sonst landete er bei „gast", wenn die Anmeldung
  beim ersten Lesen noch nicht fertig war.
- **Frisch lesen, nur den eigenen Zweig ersetzen.** Beim Schreiben wird der
  gemeinsame Schlüssel neu gelesen; oben im Eintrag gewinnt der gelesene
  Stand (Typolucks flache 0.10.0-Felder bleiben), in `spiele` je Zweig der
  neuere `stand`. Andere Personen bleiben unberührt.
- **Ans Konto erst mit Regel** (`AM_KONTO = false`, Vertrag: „bis dahin
  Gerät-only"). Grund: Kommt die Regel mit `$anderes: false`, lehnt die
  Datenbank bei einem Formfehler den GANZEN Konto-Eintrag ab (Freunde,
  Abzeichen). Regel §11b und Schalter gehen deshalb zusammen. Ans Konto
  gehen dann nur `version` und `spiele`, nie die flachen Gerätefelder.
- **Kein Lesen von Typolucks flachem 0.10.0-Stand** (kein Rückfall für
  `heute.wort`): Typoluck zieht mit 0.11.0 selbst um; ein Rückfall hier wäre
  Code auf Vorrat, der nach einer Version tot ist.

## Runde 5 gebaut: Level, Turm, Wertung, Heute (27.09.2026, v0.146.0–v0.149.0)

Auftrag: `Design\3D-Schrift\docs\AUFTRAEGE-RUNDE-5.md`; Regeln und Zahlen:
`Apps\UPCrew\docs\FORTSCHRITT.md` („GÜLTIGER STAND"); die sechs Antworten
stehen im Eintrag darunter. Beim Bau entschieden:

- **Vier Versionen statt einer** (Level, Turm, Wertung, Heute) — jede für
  sich lauffähig und getestet, damit ein Fehler in einem Teil nicht den
  Rest aufhält.
- **Fortschritt am Konto je Spiel ein Zweig** (`fortschritt.spiele.<app>`),
  zusammengeführt je Zweig nach dem neueren `stand`. Eine gemeinsame Summe
  hätten Blunderluck und Typoluck sich gegenseitig überschrieben. Level =
  Summe aller Zweige. Gäste: nur Gerät. Datenvertrag im Kopf von
  `js\fortschritt.js`; `Apps\UPCrew\docs\PROFIL.md` und Typoluck müssen ihn
  übernehmen (Meldung an Design/UPCrew und Typoluck).
- **Der Turm-Stand wird gerechnet, nicht gespeichert:** nur die Figuren je
  Stufe liegen im Fortschritt; der erreichte Ort ergibt sich daraus (erste
  geschlossene Tür). So können Ort und Figuren nie auseinanderlaufen.
- **Eine Turm-Stufe ist eine gewöhnliche Partie gegen Bob** mit Einstellungen
  aus `js\turm.js` und `regeln.turm` an der Partie — keine eigene
  Spiel-Mechanik. Die Seite ist fest (Mensch und Bob sitzen schon beim
  Anlegen); Turm-Runden sind privat.
- **Die Eigenheit eines Gegners ist die Regel seiner Partie** (Schwarz,
  viele Lootboxen, Kreuz …), nicht ein Verhalten wie im Entwurf („zieht fast
  nur Bauern") — Bob kann das nicht, und ein Versprechen, das nicht
  eintritt, wäre eine Falschaussage.
- **3D-Sperre scharf** (`SPERRE_3D = true`, 3D ab Holzhalle), kein
  Bestandsschutz (Nutzer 26.09.2026). Themen/Figuren je Stück über den Ort
  (`FREISCHALTUNG.brettStueckFrei`).
- **Die Wertung rechnet auf dem Gerät, vor dem Senden nur beim letzten Zug**
  (sonst danach), mit eigener kleiner Suche (Tiefe 2 + Schlagzüge, erkennt
  Matt), Formeln von Lichess. Gespeichert nur auf dem Gerät — kein
  zusätzliches Schreiben je Zug in die Datenbank.
- **Das Tagesbrett ist eine Partie aus fester Stellung gegen Bob (Meister)**
  — derselbe Partie-Bildschirm, kein zweiter. Nach N eigenen Zügen ohne Matt
  gibt die Partie für den Spieler auf (verfehlt). Die Stellungen stammen aus
  Partien Bob gegen Bob, herausgesucht und geprüft von einem Löser (Matt in
  genau N, kein kürzeres, eindeutiger erster Zug); `tests\test-heute.js`
  rechnet sie bei jedem Lauf nach (Matt in 3 nur teilweise, sonst zu
  langsam).
- **Serie über alle Spiele, Schutz nur für die laufende Serie** (Vereinfachung
  in `FORTSCHRITT.serie`). ×1,5 rechnet jedes Spiel auf seine eigene
  Tagesaufgabe, wenn das andere heute schon fertig ist.
- **Nicht gebaut (bewusst, für später):** Schwur-Halle über dem letzten Ort,
  Album-Taten (Frage 5: Bestandsschutz — es gibt noch keine neuen Stücke,
  die Taten bräuchten), Abzeichen im Profil nach FORTSCHRITT.md, Rahmen und
  Titel als sichtbare Profil-Deko ausser am Ring.

## Runde 4: Leiste als Baustein, Tab „Sammlung" (27.09.2026, v0.145.0)

Auftrag: `Design\3D-Schrift\docs\AUFTRAEGE-RUNDE-4.md`, Block Gemeinsam +
Blunderluck. Vorgegeben war das WAS; beim Bau entschieden wurde das WIE:

- **Die Leiste sitzt über zwei Klassen fest unten** (`.tab-leiste.up-leiste`
  in `stil.css`). Der Baustein lädt nach dem eigenen Stil und setzt
  `position: relative`; mit einer Klasse hätte er gewonnen. Die Höhe ist
  64 px PLUS iPhone-Streifen — der Baustein rechnet den Streifen in die
  64 px hinein (gemeldet an die Design-Sitzung, STATUS c(6)).
- **Die gleitende Pille und ihr Nachmessen beim Drehen sind entfallen**
  (samt Test von v0.74.0): Die Kachel des Bausteins hängt an
  `aria-current` und misst nichts — es gibt nichts mehr, was beim Drehen
  auf alten Massen stehen bleiben kann.
- **Alte Tab-Kennungen leiten weiter** (`TABS.UMLEITUNGEN`: faehigkeiten,
  anpassen → sammlung) statt jede Aufrufstelle zu suchen — ein gemerkter
  Rückweg (Profil) oder ein übersehener Aufruf landet so nicht im Nichts.
- **Regal-Bilder sind die kopierten Werkstatt-Aufnahmen**
  (`img\sammlung\`, 9 PNG, ~160 KB), nicht live gerechnet. Der Auftrag
  nannte „live" als besser; verworfen, weil live jedes Öffnen neun
  3D-Bilder bräuchte, ohne WebGL leer bliebe und das 3D-Modul in Tests
  fehlt. Die VORSCHAU dagegen ist live (`BRETT_3D.standbildMit`) — dort
  zählt die echte Stellung.
- **`standbildMit` setzt die Wahl nur für ein Bild** und stellt danach
  Thema, Figuren und die Figuren-Materialien des grossen Bretts zurück;
  gespeichert wird nichts. So zeigt die Vorschau Gesperrtes, ohne dass sich
  das echte Brett ändert (Auftrag: „das ändert erst Übernehmen").
- **Thema und Figuren sind frei mit Admin-Freigabe ODER in der Werkstatt**
  (`aussehenFrei`), und das 3D-Brett liest gespeicherte Werte unter
  derselben Bedingung. Vorher zählte nur die Admin-Freigabe — in der
  Werkstatt wäre eine Wahl nach dem Neuladen verloren gewesen.
- **Das Schloss am 3D-Brett nennt „Holzhalle"** statt „Arena 2" (Runde 5:
  3D ab Holzhalle). Solange `SPERRE_3D` aus ist, sieht man es nicht.
- **„Fähigkeiten n/m" zählt Fähigkeiten UND Unglücke** — die Bibliothek
  darunter zeigt beide (Umschalter), eine Zahl nur für eine Hälfte wäre
  falsch. **„NN %" zählt** eigene Regale, Farbwelt/Schrift/Knöpfe und die
  reine Sammlung; nicht Darstellung (eine Einstellung) und nicht Sets
  (eigene Merkplätze).
- **Die reine Sammlung wird einmal gebaut** und bei jedem Öffnen wieder
  eingehängt (der Baustein wird dagegen jedes Mal neu gebaut). Sonst
  meldete sich die Bibliothek bei jedem Öffnen erneut bei
  `TEAM_SCHACH._kartenWurzeln` an.

## Runde 5 (Turm, Heute, Level): die sechs offenen Fragen beantwortet (27.09.2026, noch nicht gebaut)

Auftrag: `Design\3D-Schrift\docs\AUFTRAEGE-RUNDE-5.md`, Abschnitt „Offene
Fragen". Claude hat je Frage einen Vorschlag gemacht, der Nutzer hat am
27.09.2026 geantwortet: „ja alles so machen wie deine vorschläge". Gebaut
wird Runde 5 erst nach Runde 4 und auf eigenes Go.

1. **Wertung (Genauigkeit):** Gewertet werden NUR normale Schachzüge. Züge
   mit einer Fähigkeit und Züge, die eine Lootbox verändert hat, zählen
   weder für noch gegen den Spieler. Grund: Bei Fähigkeiten und
   Sonderbrettern ist der „beste Zug" unscharf; so bleibt die Zahl ehrlich
   und nachprüfbar.
2. **Stufen je Ort und Schwellen:** so übernehmen wie im Entwurf (4–6
   Stufen, Werkbank 60/75 … Meisterliga 78/90) — aber vor dem Bau einmal
   gegen den Bot durchrechnen (viele Partien), ob die Schwellen erreichbar
   sind; erst dann festschreiben.
3. **Tagesbrett:** eine handgeprüfte Liste fester Stellungen; welche dran
   ist, ergibt sich aus dem Datum (für alle gleich). Aufgaben selbst
   erzeugen wäre ein eigenes Vorhaben.
4. **Typoluck-Turm:** jetzt NICHT festlegen. Typoluck bekommt zuerst nur
   „Heute" und Level — das baut die Typoluck-Sitzung.
5. **Album-Taten:** Bestandsschutz. Was heute frei ist, bleibt frei; nur
   NEUE Stücke laufen über Taten. Sonst verlören Spieler, was sie haben.
6. **Level nach 10:** Rahmen alle 5 Level plus Serien-Schutz — so
   übernehmen.

Achtung für den Bau: Führend für Regeln und Zahlen ist laut Auftrag
`Apps\UPCrew\docs\FORTSCHRITT.md` („GÜLTIGER STAND"). Die Antworten oben
wurden gegeben, ohne dass diese Datei gelesen war — vor dem Bau
abgleichen; steht dort etwas anderes, beim Nutzer nachfragen.

## Runde 3: ein Aussehen, Knöpfe über einen Wächter, Knopf-Familie in einer eigenen Ebene, 3D als Freischaltung (26.09.2026, v0.144.0)

Auftrag: `Design\3D-Schrift\docs\AUFTRAEGE-RUNDE-3.md`, Block Blunderluck.
Vorgegeben war dort das WAS (Bausteine kopieren, ein Aussehen, Schrift,
Knöpfe, Tab „Anpassen", Regal „Brett", Konto-Abgleich). Beim Bau
entschieden wurde das WIE:

- **Knöpfe über einen Wächter (`js\knoepfe.js`) statt 130 Einzelstellen.**
  Knöpfe entstehen an rund 130 Stellen in 17 Dateien, über ein halbes
  Dutzend eigener `_knopf`-Helfer, und viele ändern später Text oder Klasse
  (Zwei-Schritt-Knopf, „Übernommen"). Ein `MutationObserver` am body hängt
  jedem Haus-Knopf die UPCrew-Klassen und das `up-led` an — beim Einhängen
  und nach jeder solchen Änderung. Verworfen: jede Stelle von Hand — hätte
  jeden künftigen Knopf zur Fehlerquelle gemacht. Die Ausnahmen (Karten,
  Armee-Wahl, Vorrats-Haken, Friedhofleiste, Segment-Reihen) stehen als zwei
  Listen in der Datei; `tests\test-aussehen.js` prüft Zuordnung und
  Ausnahmen.
- **Die Knopf-Familie lädt in eine eigene CSS-Ebene** (`css\upcrew-schicht.css`,
  `@import … layer(upcrew)`). Ohne Ebene hätte `.up-kn` (lädt nach dem
  eigenen Stil) rund dreißig eigene Größenregeln geschlagen — kleine Knöpfe,
  Eck-Knopf, Steuer-Knöpfe wären 44 px hoch geworden. Mit Ebene gewinnt
  jede eigene Regel; deshalb durfte keine eigene Form-Regel (Rundung, Kante,
  Schatten, Rahmen, Fläche) für Haus-Knöpfe übrig bleiben — der Wächter in
  `test-aussehen.js` zählt sie (gegengeprüft: schlägt bei den alten Regeln
  an). Der Baustein selbst ist unverändert; Typoluck darf ihn anders laden.
- **`darstellung.js` bleibt als Anpasser** und ist der „frühe Aufruf"
  (eingebettete Skripte verbietet die Sperre im Kopf von `index.html`). Die
  Schnittstelle `DARSTELLUNG.*` blieb gleich, damit Einstellungen und
  3D-Brett nichts merken.
- **Das Aussehen am Konto geht über den Spieler-Abgleich**, als Feld
  `aussehen` am eigenen Eintrag (`SPIELER.aussehenSetzen`) — kein zweiter
  Schreibweg auf `konten/<uid>/aussehen`. Grund: Der Abgleich schreibt den
  eigenen Eintrag immer als Ganzes; ein getrennter Schreibvorgang wäre beim
  nächsten Speichern (Freunde, Abzeichen) wieder überschrieben worden.
  `inhaltGleich` vergleicht `aussehen` mit, sonst käme eine Umstellung von
  einem anderen Gerät nicht an.
- **3D ist eine Freischaltung, aber `SPERRE_3D` steht AUS**
  (`js\freischaltung.js`). Die Arena-Leiter gibt es noch nicht — scharf
  geschaltet hätte niemand 3D. Was sich trotzdem sofort ändert (Nutzer:
  „kein Bestandsschutz"): 2D ist die Vorgabe (`VORGABE.an = false`), die
  Wahl 2D/3D gilt jetzt für jeden (vorher las das 3D-Brett ohne
  Admin-Freigabe gar nichts aus dem Speicher und stand immer auf 3D).
- **Werkstatt-Modus = `?werkstatt` NUR auf localhost** — im Netz könnte
  sich sonst jeder alles freischalten.
- **Leisten-Wörter schrumpfen auf schmalen Handys** (`min(0.75rem,
  2.85vw)`, 1 px Seitenrand): gemessen passte „Fähigkeiten" schon mit der
  alten Schrift nicht (70 statt 65 px bei 390 px), mit den breiten
  Crew-Schriften auch „Aufgaben", „Rangliste", „Anpassen" nicht. Jetzt
  passt alles, alle sechs Schriften, 390 und 360 px.

## UP#Plus ist in allen UPCrew-Spielen nur Rollen-Verteiler (25.09.2026, v0.139.0)

Nutzer: „UP soll nicht in der Rangliste erscheinen, auch keine Freunde
annehmen können, auch nicht wenn man sucht angezeigt werden, reiner Admin-
Rollen-Verteiler-Account" — und: „in allen UPCrew-Games soll das so sein".
Umgesetzt in der Datenschicht (`SPIELER.istVerteiler`, `SPIELER.mitspieler`,
`freundschaft` immer „keine", `freundHinzufuegen` tut nichts), nicht nur in
der Oberfläche — so kann kein Bildschirm es vergessen. Erkannt an der Nummer
„Plus", die laut Datenbank-Regeln nur UP#Plus haben kann. Gleich in Typoluck
0.2.1; jedes neue UPCrew-Spiel übernimmt es.

## Echtes 3D statt Bildfolgen — und das 3D-Brett liest das 2D-Brett (24.09.2026, v0.122.0)

**Entschieden vom Nutzer:** die offene VISION-Frage „Bildfolgen oder echtes
3D“ — echtes 3D („am Schluss sollen es keine Fähigkeiten, Items oder alles
keine 2D-Dinge mehr geben, sondern das Spiel soll mit Animationen und
Bewegungen alles 3D zu sehen sein“).

**Entschieden beim Bau:**

- **three.js als Datei im Projekt** (r170, MIT, `js\lib\three\`), kein CDN:
  offline-fähig über den Service Worker, keine fremde Herkunft, kein
  Bauschritt. Die Regel „ohne Bibliothek“ gilt weiter für alles andere.
- **Das 3D-Brett liest die Feld-Knöpfe des 2D-Bretts**, statt Modell und
  Bedienzustand selbst auszuwerten. Verworfen: eine eigene Beschreibung aus
  dem Modell — sie hätte Drehung, Glas, Gräber, Vorschläge, verborgene
  Boxen usw. ein zweites Mal gerechnet. So bleibt „eine Regel steht genau
  einmal“ wahr, und jeder Tipp geht denselben Weg wie vorher.
- **Formen aus der Werkstatt als glTF ohne Material**; Farbe und Oberfläche
  setzt die App, damit sie einstellbar sind.
- **Mulde statt Punkt, gehobener Stein mit Rand statt aufgemalter Marke**
  (Nutzer-Idee; deckt sich mit GitHub-Meldung #1).
- **Vorgabe 3D an**, 2D bleibt als Schalter auf dem Gerät.

## Neue Runde: ein Bildschirm, drei Reiter, Bilder statt Haken (24.09.2026, v0.121.0)

**Nutzer-Ansage:** „Kannst du nochmal das Grundeinstellungen-Menü
überarbeiten — weniger Texte, mehr Bilder, einfachere Navigation und co."
Zur Wahl standen: ein Bildschirm mit drei Reitern (Empfehlung), eine lange
Seite, oder die zwei Bildschirme lassen. Gewählt: die Empfehlung, „aber
mach davor eine Kopie, so dass ich es simpel zurück machen kann".

**Entschieden:**

- **Wunsch 8 (v0.21.0, zwei Bildschirme hinter Vorschau und Pfeil) ist
  zurückgenommen** — mit Zustimmung des Nutzers. Beide Einstiege bleiben,
  führen aber in denselben Bildschirm, nur in einen anderen Reiter.
- **„Spielen" steht auf dem Bildschirm selbst.** Der häufigste Weg („ich
  stelle ein und will los") brauchte vorher Zurück + Spielen.
- **Die Brett-Kachel bleibt stehen** statt zum Start zu springen (Wunsch 1
  gilt weiter: sie legt nichts an, sie merkt nur).
- **Bilder statt Haken, auch dort, wo das Bild ein Zeichen ist.** Das hebt
  die Festlegung „keine erfundenen Zeichen" (STATUS, „Bewusst NICHT
  gebaut") auf — tragbar, weil unter jedem Zeichen sein Wort steht.
- **Gegen den Computer entfällt „Wer sieht die Runde?"** — dort kommt
  niemand dazu. Der Wert bleibt gespeichert, wie er war.

**Angenommen** (24.09.2026: „ne lass es so passt, kannst die Kopie raus
nehmen"). Die Sicherheitskopie `Backup\Blunderluck\v0.120.1` ist deshalb
gelöscht; wer den alten Aufbau je nachsehen will, findet ihn im
Meilenstein-Abzug `Backup\Blunderluck\v0.120.0` (Auswahl-Code dort
unverändert zu v0.120.1).

## Profil kompakt: Kopfkarte, drei Reiter, Popups (24.09.2026, v0.119.1)

**Nutzer-Ansage:** „Das Profil ist zu überladen, mache es schöner, kompakter
— kannst ruhig Untermenüs benutzen oder Popups, nimm dir Beispiel an anderen
Spiele-Apps."

**Was vorher war (v0.119.0, auf 390 px gemessen):** vier Karten
untereinander — Visitenkarte, elf Statistik-Kacheln, alle 14 Abzeichen mit
Bedingungssatz, jede Partie mit drei Zeilen. Bei 14 Partien fast drei
Bildschirmhöhen; Siege und Remis standen doppelt (Kachel und Satz).

**Entschieden:** das Muster der Profilseiten in Spiele-Apps (chess.com,
Clash Royale): oben EINE Kopfkarte mit allem für den ersten Blick
(Spielerbild, Name, Platz, Punkte, vier Kurzwerte, Bilanz-Balken mit Form,
die drei Abzeichen), darunter ein Segment-Schalter mit drei Reitern, von
denen immer nur einer offen ist. Was man nur manchmal wissen will — die
Bedingung eines Abzeichens, Dauer und Beute einer Partie — steht im Popup
statt daneben. Name, Passwort und Abzeichen-Wahl liegen hinter
„Bearbeiten", weil man sie selten braucht.

**Bewusst so:** Gerechnet wird unverändert (`statistik`, `verlauf`,
`abzeichenVon`); nur die Anordnung ist neu — deshalb eine PATCH. Die
Klasse `karte visitenkarte` und der Knopf „Freund anfragen" bleiben, der
Test von v0.119.0 hängt daran. Der Reiter beginnt bei jedem neu geöffneten
Profil bei der Statistik, damit ein fremdes Profil nicht mitten in der
Partienliste aufgeht.

## Sichtbarkeit: neue Runden öffentlich, alte privat; Abzeichen gerechnet, nicht vergeben (18.09.2026, v0.118.0 / v0.119.0)

**Nutzer-Ansage:** „Standard soll öffentlich sein" (Sichtbarkeit) und
„drei Abzeichen, die man bekommen kann" (Profil).

**Zwei Vorgaben für ein Feld — mit Absicht.** `regeln.sichtbarkeit` hat im
Modell die Vorgabe `privat`, auf dem Bildschirm `oeffentlich`. Grund: Eine
Runde von vor v0.118.0 trägt das Feld nicht. Bekäme sie die Vorgabe
„öffentlich", stünde jede alte wartende Runde plötzlich in der Liste
„Offene Runden" — angelegt zu einer Zeit, als es die Liste nicht gab und
nur der Code hineinführte. Das wäre eine Änderung am Verhalten unter den
Spielern, ohne dass jemand sie eingestellt hat. Neue Runden bekommen die
Bildschirm-Vorgabe ausdrücklich mitgeschrieben; der Datenvertrag bleibt
additiv.

**Abzeichen werden gerechnet, nie vergeben.** Gespeichert wird nur, welche
drei der Spieler auf seiner Karte zeigt (`spieler.abzeichen`). Verdient
oder nicht entscheidet jedes Mal die Chronik (`RANGLISTE.abzeichenVon`).
Grund: Ein gespeichertes „verdient" ist ein zweiter Datenstand, der beim
nächsten Umbau der Regeln oder beim Entfernen eines Spielers von der
Chronik abweicht; eine gerechnete Wahrheit kann nicht lügen. Der Preis —
die Rechnung läuft bei jedem Öffnen des Profils — ist bei höchstens 60
Chronik-Einträgen je Spieler nicht messbar. `gezeigteAbzeichen` zeigt
deshalb nur, was gewählt UND verdient ist.

**Der Rückweg ist ein Tab, kein Verlauf.** `profilOeffnen(id, rueckweg)`
merkt sich den Tab, aus dem man kam; „Zurück" führt dorthin. Kein
Browser-Verlauf, keine Kette — ein Profil führt nie zu einem weiteren
Profil, deshalb reicht eine Stufe.

## Farbe und Unglückszeichen an EINEM Haken (18.09.2026, v0.115.3)

**Nutzer-Ansage (zweimal am selben Tag):** „Seltenheit anzeigen ja/nein
sollen keine zwei Punkte sein, das eine grenzt das andere ja aus" — und
nach einer ersten, falsch verstandenen Runde: „ich kann beides an- und
ausschalten, obwohl das eine das andere ausschliesst; mach aus zwei Knöpfen
einen, mit einer Vorschau vom Würfel, die sich ändert, am besten durch alle
Würfelfarben."

**Was vorher galt (v0.49):** Zwei Haken, zwei Fragen — „Seltenheit
anzeigen" (die Farbe der Stufe) und „Unglücks-Lootboxen anzeigen" (das
Fragezeichen der schlechten). Der Grund damals: „Farbe ja, Warnung nein"
sollte einstellbar sein — jeder Würfel ein Wagnis, aber nach Stufe gefärbt.

**Warum das gekippt ist:** Der zweite Haken trug als Bild die graue Box mit
Fragezeichen, und die sieht aus wie die VERBORGENE Box — also wie das „Nein"
zum ersten Haken. Zwei Bilder, die wie Ja und Nein wirken, aber beide
anschaltbar sind, ergeben für den Spieler keinen Sinn; die Kombination
„Farbe ja, Warnung nein" hat in einem Monat niemand vermisst.

**Was gilt:** EIN Haken „Seltenheit anzeigen". An heisst Farbe UND
Fragezeichen, aus heisst alle gleich. Sein Bild zeigt den Zustand: an →
ein Streifen, der durch alle Stufenfarben und eine Unglücks-Box läuft
(reine CSS-Animation, `steps(n, jump-none)` mit n = Bilderzahl); aus → die
graue Box. **Der Datenvertrag bleibt:** `seltenheitZeigen` und `pechZeigen`
sind weiter zwei Felder; der Haken schreibt beide (`zusammen` in
`_regelSchalterBauen`), das Brett liest weiter jedes für sich — eine ältere
Partie mit „Farbe ja, Warnung nein" sieht aus wie damals. Wer die Trennung
je wieder braucht, hängt einen zweiten Haken an dasselbe Feld und nimmt
`zusammen` heraus.

## Brett zuerst, der Rest ordnet sich unter (27.08.2026, v0.88.0)

**Nutzer-Frage:** „Was muss noch gemacht werden, dass das Schachbrett immer
eine fixe Position auf dem Bildschirm hat?" **Zur Wahl standen drei Wege;
gewählt wurde der erste** (27.08.2026).

**Die Ursache, die dahinter steckte:** Das Brett bekam bis v0.87.0 den Platz,
der nach allen Nachbarn ÜBRIG blieb (`_brettEinpassen` rechnete die Breite aus
der Resthöhe des Halters, bei jedem Zeichnen neu). Damit war seine Grösse eine
FOLGE seiner Nachbarn — jede Marke, Meldung oder Karte, die kam oder ging,
verschob sie. Das hat seit v0.52.0 fünf einzelne Funde gekostet
(Wird-gesendet-Marke v0.79.1, Unglücksmeldung A2-1, Abstimmung A2-3,
Chip-Umbruch A2-2, Erklärtexte v0.54.0), und jeder davon war nur ein Symptom.

**Was jetzt gilt:**

- **Die Grösse wird eingefroren.** Gerechnet wird nur, wenn sich die
  Bedingungen ändern, unter denen die Zahl entstand: Fenstergrösse,
  Brettmasse der Spielart, offene Partie (`_brettLage`).
- **Flüchtige Kinder zählen beim Rechnen nicht mit** (Platzier-Leiste,
  laufendes Zugmuster) — sonst hinge die eingefrorene Zahl davon ab, ob beim
  Rechnen gerade platziert wurde.
- **Das Brett klebt oben im Halter** (`justify-content: flex-start` statt
  `center`). Die Grösse allein hätte die LAGE nicht fixiert: Bei zentriertem
  Inhalt rutscht das Brett nach oben, sobald unter ihm etwas erscheint.
- **Der Rollbalken bekommt festen Platz** (`scrollbar-gutter: stable` an
  `.schach`). Ohne ihn nahm er beim Erscheinen 10 px Breite weg — im Browser
  gemessen, siehe `erkenntnisse.md`.
- **Die Kehrseite ist gewollt:** Wird der Inhalt höher als das Fenster, rollt
  der Spielbereich, statt dass das Brett schrumpft.

**Gemessen nach dem Umbau** (Edge kopflos, zwei Fensterbreiten): Breite UND
obere Kante des Bretts sind in allen drei Zuständen — ohne Einblendung, mit,
wieder ohne — bit-genau gleich. Kosten der Rollbalken-Reservierung: 0 px am
Rechner (dort deckelt ohnehin die Obergrenze), 10 px am schmalen Fenster.

## Der Vorschau-Kasten wird gezogen — UND weiter getippt (27.08.2026, v0.84.0)

**Nutzer-Wunsch (26.08.2026, Gruppe C der ROADMAP):** „Beim Frost und den
anderen Gebiets-Fähigkeiten konnte man bisher nicht sehen, wohin die Felder
fallen. Künftig zieht man den Bereich mit Finger oder Maus frei über das
Brett — nichts passiert, bis man bestätigt."

**Das steht gegen eine frühere Entscheidung (08.08.2026, Quizz-Zeit):** Damals
wurde das Ziehen ausdrücklich VERWORFEN, mit zwei Begründungen — „echtes
Ziehen kämpft auf dem Handy mit dem Scrollen der Seite" und „der Finger
verdeckt genau das Feld, das man treffen will". Beide Sätze stimmen weiterhin.

**Aufgelöst wird das nicht durch Umkehren, sondern durch NEBENEINANDER:**

- **Der Tipp bleibt unverändert der erste Weg** (seit v0.57: antippen, dann
  „Einsetzen"). Damit läuft der Einwand „der Finger verdeckt das Feld" ins
  Leere — niemand MUSS ziehen, und wer tippt, merkt von v0.84.0 nichts.
- **Das Scrollen ist eine Zeile:** `touch-action: none` am Brett, aber NUR
  solange platziert wird (Klasse `brett-platzieren`). Ausserhalb dieses
  Zustands muss man am Handy über das Brett hinweg rollen können, sonst ist
  der Verlauf darunter nicht mehr erreichbar.
- **Beide Wege rechnen dasselbe:** `TEAM_SCHACH.vorschauSetzen` ist die eine
  Stelle, die den Kasten versetzt; den Umriss liefert weiterhin
  `SCHACH_RUNDE.zielUmriss` — dieselbe Rechnung, die hinterher wirklich
  läuft. Zwei Wege mit zwei Rechnungen wären zwei Wahrheiten.

**Zwei Fallen, die im Code stehen und hier nur genannt werden:** Beim Ziehen
wird NICHT neu gezeichnet (ein Neubau mitten in der Bewegung nimmt dem Zeiger
das Element unter dem Finger weg — deshalb `_vorschauUmsetzen`, das nur
Klassen tauscht), und der Klick, den der Browser nach dem Loslassen noch
schickt, wird verschluckt, wenn der Kasten dabei gewandert ist
(`ziehenVerbrauchtKlick`) — sonst gilt er als zweiter Tipp auf dasselbe Feld,
und der setzt ein.

## Zustimmen heisst denselben Zug machen (26.08.2026, v0.83.0)

**Nutzer-Ansage:** „Das Abstimmen geht anders: Jeder im Team kann einen Move
machen, die anderen sehen diesen Move — die Figur ist transparent wie beim
Nekromanten, und es wird mit Grün gezeigt, wie sie läuft. Wenn alle denselben
Move auch ziehen, wird das umgesetzt. Kein Feld, kein Extra, nur das. Wenn man
eine Fähigkeit nutzen will, soll die Karte markiert werden, und alle aus dem
Team können dies auch auswählen; wenn andere Sachen gedrückt werden, geht es
erst weiter, bis sich alle einig sind und dasselbe drücken. Der Gegner sieht
von alledem nichts."

Das ist die Gestalt-Entscheidung zu Fund A2-3 (die Abstimmungs-Karte drückte
das Brett auf die Mindestbreite, ausgelöst vom MITSPIELER) — und sie ersetzt
das Verfahren, nicht nur die Optik:

- **Kein EIN Vorschlag mit Stimmen mehr, sondern je Spieler SEINER** (Feld
  `vorschlaege`, additiv; das alte Feld `vorschlag` bleibt als Altbestand im
  Vertrag wie `phase` im Würfel Quizz). Gleichheit heisst gleiche HANDLUNG:
  von/nach/Umwandlung beim Zug, Art/Ziel/Wahl bei der Fähigkeit
  (`_vorschlagGleich`). Ausgeführt wird unter dem Namen des FRÜHESTEN
  Vorschlagenden.
- **Die Optik ist geliehen, nicht erfunden:** Der Schemen auf dem Zielfeld
  ist `figur-schemen` (die Grab-Optik des Nekromanten — ausdrücklich so
  gewünscht), der Laufweg kommt aus `SCHACH.wegFelder` (beim Springer das L)
  und ist dünner grün gerahmt als die eigenen Zugpunkte, damit sich
  Vorschlag und eigene Auswahl nicht verwechseln. Die vorgeschlagene
  Fähigkeits-Karte trägt einen blauen Aussenring.
- **„Der Gegner sieht nichts" ist eine ANZEIGE-Regel:** `_teamVorschlaege`
  liefert nur dem Team am Zug etwas. Die Daten selbst stehen wie bisher im
  gemeinsamen Stand — dass der Gegner sie lesen KÖNNTE, war schon beim alten
  Verfahren der dokumentierte Preis der Einstellung.
- **DIE FRIST BLEIBT ALS RÜCKFALL** (Rückfrage 26.08.2026, Antwort:
  „Frist als Rückfall behalten"): Die Ansage regelt die Uneinigkeit, nicht
  die Abwesenheit — ohne Frist stünde das Team still, sobald einer aufhört
  (der dokumentierte Normalfall, siehe `offen-und-abgelehnt.md`). Neu ist:
  Nach Ablauf zählen nur die ABGEGEBENEN Vorschläge, und die Uhr entscheidet
  NIE einen Streit unter Anwesenden — Uneinigkeit löst nur das Einigwerden.
  Die Staffelung 10/5/3 Sekunden und `versaeumt` gelten unverändert;
  Vorschlagen zählt jetzt als Mitmachen (setzt den Zähler zurück).

## Das Unglück ist eine Karte in der Hand, kein Streifen (26.08.2026, v0.82.0)

**Nutzer-Ansage:** „Die Unglücksmeldung soll eine Karte werden, die in der
Hand liegt [dessen], der aufs Feld gezogen ist und sie abbekommen hat — ein
eigener Stapel an Karten. Die Karte geht weg, wenn es zeitlich begrenzt ist;
wenn nicht, bleibt sie in der Hand."

Das ist die Gestalt-Entscheidung zu Fund A2-1 (Mess-Runde 26.08.2026: der
rote Streifen drückte das Brett um ~50 px) — und sie geht ueber die drei
angebotenen Antworten hinaus: kein Schweben, kein Chip, kein reservierter
Platz, sondern die Kartenreihe.

- **Sie ersetzt den Streifen aus v0.59 (Wunsch #13) ersatzlos.** Dessen
  Zweck — „man muss erfahren, WAS einen getroffen hat, ohne den Zugverlauf
  zu suchen" — erfuellt jetzt die Karte; sie ist sogar dauerhaft statt einen
  Zug lang. Der Gegner sieht sie ebenfalls (die Reihe jeder Seite ist offen).
- **Die Liste haengt an der Partie (`unglueckskarten`), nicht am Verlauf** —
  der wird gekuerzt (`_verlaufKuerzen`), eine dauerhafte Karte waere nach ein
  paar Zuegen verschwunden. Additiv nachgeruestet; alte Partien zeigen
  schlicht keine Karten.
- **Was die Hand ZEIGT, entscheidet das Modell** (`unglueckskartenVon`):
  die Halluzination nur, solange sie wirkt (`glasWirkt`, seit v0.82.0 im
  Modell statt im Bildschirm); die vier dauerhaften immer. Ein verpufftes
  Unglueck (zweite Box auf einem Weg) bekommt KEINE Karte — es hat niemanden
  getroffen.
- **Die Karte sieht aus wie ihre Bibliotheks-Kachel:** gestrichelter Rahmen
  in Stufenfarbe, dazu roter Grund (`--fehler-flaeche`), damit sie sich auch
  in der Gegner-Reihe (dort sind alle Karten gestrichelt) als Unglueck zu
  erkennen gibt. Antippen oeffnet Beschreibung + Bildanleitung
  (`unglueckAnsehen`, gemeinsam mit der Bibliothek).

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
  **Eingeschränkt seit v0.114.1:** Das gilt nur noch OHNE den Haken „Seite
  zulosen". Mit ihm wird auch der Anleger zugelost (`seiteZulosen` vor dem
  ersten Schreiben) und ist damit bereit — das Setzen nach Weiss ohne
  Zusage liess Partien zu zweit nie beginnen (`erkenntnisse.md`).
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
