# Blunderluck — Was ist neu?

Neueste Version oben. Jede ausgelieferte Version bekommt hier ihren Eintrag —
in Nutzersprache: Was habe ich davon?

## v0.162.0 — 04.10.2026

**Die Sammlung ist neu geordnet: Kacheln statt Reihen — und beim Wischen zieht die Leiste früher nach.**

- **Sammlung als Kacheln:** Statt der Reihen, die du seitlich rollen musstest, steht jetzt je Kategorie eine Kachel
  (Brett, Brett-Design, Figuren, Farbwelten, Schriften, Knöpfe …) mit ihrem angelegten Stück und „wie viele habe ich".
  Ein Tipp öffnet ein Blatt mit allen Stücken der Kategorie — antippen zum Anprobieren, unten „Zurück · Würfel ·
  Übernehmen". Die Vorschau bleibt oben stehen, auch im Blatt.
- **Nichts rollt mehr seitlich:** Ein Wisch nach links oder rechts wechselt in der Sammlung jetzt überall die Seite —
  egal, wo du ansetzt.
- **Abzeichen, Fähigkeiten und Brettformen** sind ebenfalls Kacheln und öffnen sich im Blatt; darin ist alles wie bisher.
- **Mehr zu sehen:** Die Sammlung zeigt jetzt auch, was noch kommt (Materialien, Sieg-Effekte, Flammen-Farben …) — mit
  „bald" markiert, noch nicht wählbar. Darum ist die Prozentzahl oben kleiner als vorher: Es wird mehr mitgezählt,
  weggenommen wurde dir nichts.
- **Kein „Lv" mehr an den Stücken:** Was du noch nicht hast, trägt den Ort im Turm oder „wird erspielt".
  Frei ist genau das, was vorher frei war.
- **Die Leiste unten zieht früher nach:** Nach einem Wisch springt die Kapsel schon um, sobald feststeht, wohin die
  Seite rollt — nicht erst, wenn sie eingerastet ist.
- Der Shop ist unverändert; der neue Shop mit Designs kommt in einer eigenen Version.

## v0.161.0 — 04.10.2026

**Tabs wechseln wie Blättern: Ein kleiner Wisch reicht, und die nächste Seite ist schon beim Wischen zu sehen.**

- **Die Seiten hängen aneinander:** Shop, Sammlung, Start, Aufgaben und Rangliste liegen jetzt nebeneinander wie auf
  einem Band. Wischst du zur Seite, rollt die Nachbarseite sofort mit herein und rastet ein — du musst nicht mehr weit
  ziehen. Höchstens eine Seite je Wisch.
- **Rechts und links ist weiter Stopp:** Vor dem Shop und hinter der Rangliste geht es nicht weiter, kein Rundlauf.
- **Die Leiste unten bleibt, wie sie ist:** Ein Tipp rollt das Band zur Seite; nach einem Wisch zieht die Kapsel nach,
  sobald die Seite eingerastet ist.
- **In der Partie wird nicht gewischt** — auch nicht, solange ein Blatt (Profil, Einstellungen) oder ein Dialog offen ist.
- **In der Sammlung** rollen die Regal-Reihen weiter für sich: Wischst du auf einer Reihe, rollt die Reihe; daneben
  wechselst du die Seite.
- Sonst ist alles gleich: dieselben fünf Tabs in derselben Reihenfolge, derselbe Inhalt, dasselbe Aussehen. Jede Seite
  rollt jetzt für sich und beginnt oben, wenn du zu ihr wechselst.

## v0.160.1 — 03.10.2026

**Dein Level stimmt jetzt ohne Neustart — auch wenn du es in einem anderen UPCrew-Spiel verdient hast.**

- **Level aus Typoluck kommt von selbst an:** Hast du in einem anderen UPCrew-Spiel mit demselben Konto XP
  gesammelt, zeigt Blunderluck das neue Level, sobald du zurück in die App wechselst. Bisher brauchte es dafür
  einen echten Neustart.
- **Der Kopf am Start zieht nach:** Kommt dein Stand vom Konto erst kurz nach dem Start an, springen Level-Ring
  und Zahl oben links sofort um. Bisher zog nur die Flamme nach.
- **Als Gast siehst du, warum dein Level niedrig ist:** Im Profil steht unter dem Level-Balken eine Zeile
  „Gast · Level nur auf diesem Gerät“ mit dem Knopf „Anmelden“ (führt zur Konto-Karte in den Einstellungen).
- Sonst merkst du nichts: Unter der Haube sind zwei Teile (Konten-Speicher, gemeinsamer Fortschritt) in Bausteine
  umgezogen, die Blunderluck und Typoluck sich jetzt teilen. Am Spiel ändert das nichts.

## Ohne neue Version — 03.10.2026 (nur Tests und Doku, nichts ausgeliefert)

- Für dich ändert sich nichts. Die gemeinsamen Bausteine aller UPCrew-Spiele haben ab jetzt eine einzige Quelle
  (`Apps\UPCrew\bausteine`); der Test, der darüber wacht, vergleicht jetzt dorthin — auch das Konto.
- Untersucht, noch nicht behoben: „Level in Blunderluck 1, in Typoluck 6“. Befund in `UEBERGABE.md` (oben).

## v0.160.0 — 30.09.2026

**Neu: der Turm als echter Turm · mehrere Wege · viel weniger Partien bis zum Boss · Elite, Rast, Truhe, Händler und Fund.**

- **Ein echter Turm:** Steine, Stockwerke, Fenster (hell, wo du schon warst), flackernde Fackeln, oben Zinnen,
  Fahne und die Tür zum nächsten Ort. Dein weißer Bauer hüpft von Station zu Station.
- **Vorschau am Start, groß per Tipp:** Antippen öffnet den Turm im Vollbild. Die Kamera fährt vom Tor bis zu dir,
  ziehen oder Mausrad zum Umsehen. Unten „Verlassen“ und „Spielen“.
- **Mehrere Wege:** An Kreuzungen wählst du „links“, „Mitte“ oder „rechts“. Nach einer Partie an einer Kreuzung
  geht der Turm von selbst auf und fragt „Wo lang?“. Gegangene Wege bleiben gegangen, es geht nur vorwärts.
- **Viel weniger Partien bis zum Boss:** je Ort nur 2 bis 5 Partien (vorher 4 bis 6), dazwischen ruhige Stationen.
- **Neue Stationen:** Elite (stärker, mit einer Verschärfung; Sieg füllt die Herzen), Rast (Heilen oder Zeit zurück),
  Truhe (Münzen und ein Tipp oder Zeit zurück), Händler (billiger als im Shop), Fund (ein Tausch).
- **Herzen ab der Holzhalle:** 5 Herzen, nur eine Niederlage kostet (Gegner 1, Elite 2, Boss 3). Bei 0 geht es zurück
  zur letzten Rast oder besiegten Elite, Figuren und Münzen bleiben.
- **Jede Partie geht nach der kurzen Vorstellung sofort los**, deine Farbe steht vorher fest.
- **Jeder hat seinen eigenen Turm:** Wege und Stationen kommen aus einem Seed (Spieler + Ort + Durchgang). Wie stark es
  wird, bestimmt der Ort, gleich für alle.
- **Dein Fortschritt bleibt:** Geschaffte Orte bleiben geschafft, alle Figuren zählen weiter. Wer im alten Turm vor dem
  Boss stand, steht im neuen wieder davor. 3D-Brett ab Holzhalle, 3D-Figuren ab Marmorsaal wie bisher.
- **Grau wird jetzt auch am Konto gemerkt** (die neue Datenbank-Regel ist live), nicht nur auf dem Gerät.
## v0.159.0 — 29.09.2026

**Neu: Alles beginnt in Grau und 2D · erst das 3D-Brett, dann die 3D-Figuren · 2D-Figuren als Scheiben auf dem 3D-Brett · Brett-Designs in der Sammlung.**

- **Grau zum Start:** Neue Spieler beginnen in der Farbwelt „Grau“ (Schwarz · Weiss · Grau).
  Alle bisherigen Spieler werden einmal auf Grau umgestellt; die anderen Farbwelten
  schaltest du über das Level frei (Werkstatt Lv 2, Studio 3, Feld 11, Tiefsee 21, Gold 40).
- **Würfel in der Sammlung:** wählt nur noch, was du schon freigeschaltet hast. Ohne Wahl ist er aus.
- **Blunderluck beginnt ganz in 2D:** 2D-Brett, 2D-Figuren, flache Fläche.
- **Neue Reihenfolge:** das 3D-Brett gibt es ab der Holzhalle, die 3D-Figuren ab dem Marmorsaal.
- **Neu — 3D-Brett mit 2D-Figuren:** Die Figuren liegen als flache Scheiben auf den Feldern,
  leicht schräg von oben gesehen, damit sie gut lesbar sind.
- **2D-Brett wirklich flach:** schlichte Felder ohne Schatten und ohne Kante.
- **Neu — Brett-Designs:** Regal „Brett-Design · 2D“ (Grau, Farbwelt ab Lv 2, Holz, Marmor,
  Nacht, Turnier ab ihrem Turm-Ort) und „Brett-Design · 3D“ (die bekannten 3D-Themen).
- **Nachgebessert vor der Auslieferung:** Das Bild „Farbwelt“ im Regal Brett-Design · 3D zeigt jetzt Grau
  statt Braun. Beim 3D-Brett mit Scheiben schwebt unter dem Brett kein dunkler Balken mehr (die Ablage
  der geschlagenen Figuren hat dort keine Schale). Tasten „falsch“ (Farbwelten-Baustein) besser lesbar.
  Die 2D-Figuren auf dem flachen 2D-Brett sind wieder so gross wie in v0.158.0 (sie waren mit den breiteren Feldern mitgewachsen).
- **Zweite Nachbesserung:** In Grau ist die Turm-Karte neutral grau (keine Orts-Farbe mehr für Tönung,
  Orts-Zahl und Symbole; der Boss bleibt rot). Beim vollen 3D-Brett schliesst die Ablage der geschlagenen
  Figuren jetzt direkt vorn ans Brett an, statt abgesetzt darunter zu schweben. Die Regal-Bilder
  „Matt“, „Porzellan“ und „Metall“ zeigen das graue Brett. In der Sammlungs-Vorschau stehen 2D-Figuren
  genau mittig im Feld. Vorbereitet (noch nicht aktiv): die neue Datenbank-Regel §13.

## v0.158.0 — 29.09.2026

**Neu: 3D-Figuren auf dem flachen Brett · Brett und Figuren getrennt in der Sammlung · Profil schlanker · Start mit grösserer Vorschau.**

> Gebaut in drei Zwischenständen, die nie ausgeliefert wurden und im Code
> noch als „v0.157.2“, „v0.157.3“ und „v0.157.4“ genannt werden. Weil
> „3D-Figuren auf dem flachen Brett“ eine neue Funktion ist, geht das Paket
> nach der Haus-Regel als MINOR hinaus (Nutzer-Entscheid 29.09.2026).

- **Neu — Sammlung:** Brett und Figuren sind jetzt zwei eigene Stücke. Brett: 2D
  (Standard) oder 3D — das 3D-Brett gibt es ab dem Marmorsaal. Figuren: 2D
  (Standard) oder 3D — ab der Holzhalle. Das 3D-Brett bringt die 3D-Figuren
  mit; wer 2D-Figuren nimmt, spielt auf dem 2D-Brett.
- **Blickwinkel:** Mit 3D-Figuren auf dem 2D-Brett schaust du leicht schräg
  auf die Figuren — ihre Form ist gut zu erkennen, das Brett bleibt flach.
  Mit 2D-Figuren wie bisher von oben. In der Partie gibt es keinen
  Umschalt-Knopf mehr.
- **Frei:** Unten zwei Knöpfe nebeneinander — links „Runde starten“, rechts
  „Runde beitreten“. Ist deine Runde noch offen, steht links „Zurück zur
  Runde“. Das Zahnrad an der Vorschau öffnet die Grund-Regeln; „Speichern“
  merkt sie, und „Runde starten“ legt sofort damit los.
- **Turm und Frei:** Der Knopf-Bereich unten ist immer gleich hoch; die
  Vorschau bekommt den Rest.
- **Start:** „Runde beitreten“ steht nur noch bei „Frei“, nicht mehr im
  Turm. Den gewonnenen Platz bekommt die Vorschau — Turm-Weg und Brett
  sind grösser, alles passt ohne Scrollen.
- **Profil, Abzeichen:** Der Knopf „Wählen“ ist weg. Du siehst deine drei Plätze —
  freie mit „+“. Tippe auf einen Platz (auch einen belegten), um ein Abzeichen
  auszusuchen. Die Liste aller Abzeichen erscheint nur noch dort.
- **Oben rechts im Profil** steht jetzt die Flamme mit deiner Serie (antippen
  zeigt die Serien-Karte). Darunter dein Level als Balken — antippen klappt
  den Level-Weg direkt im Profil auf, noch mal antippen klappt ihn zu.
- **Kürzer:** „seit Sep 2026“ statt eines ganzen Datums. Die Spielzeit zeigt
  nur noch dieses Spiel; antippen zeigt die Rechnung mit den anderen Spielen
  und der Summe.
- Deine Partien stehen nicht mehr im Profil, sondern nur unter
  Menü → Verlauf.

## v0.157.1 — 29.09.2026

**Profil direkt, ohne Zwischen-Karte · Flamme und Level am Bild · Menü zurück.**

- Dein Bild oben auf dem Start und jeder Name (Rangliste, Freunde, Partie)
  öffnen jetzt sofort das ganze Profil — die kleine Profil-Karte davor
  entfällt. Die Zurück-Taste schliesst das Profil wieder.
- **Dein Bild oben hat jetzt zwei kleine Knöpfe:** oben links die Flamme mit
  deiner Serie (antippen zeigt die Serien-Karte), unten rechts dein Level
  (antippen zeigt den Level-Weg). Das Bild selbst öffnet dein Profil. Der
  eigene Flammen-Kreis rechts oben ist weg.
- **Rechts oben sind die drei Striche zurück:** Freunde, Verlauf und
  Einstellungen — ein Tipp springt direkt dorthin. Tipp daneben oder die
  Zurück-Taste schliesst das Menü wieder.

## v0.157.0 — 29.09.2026

**Ein Profil in zwei Stufen, Level-Weg zum Antippen, Serie ohne Schild.**

- **Profil:** Oben auf dem Start steht eine schmale Zeile: dein Bild mit dem
  Level als Ring, Name und deine drei Abzeichen als Zeichen, rechts die
  Flamme mit deiner Serie. Der Start passt so ohne Rollen auf den Bildschirm.
  Bild antippen zeigt deine Profil-Karte (Name, Titel, Level, Serie,
  Abzeichen), die Karte antippen das ganze Profil mit Statistik, deinen
  Partien, allen Abzeichen — und ganz unten dem Level. Ein Name in der
  Rangliste oder im Spiel zeigt dieselbe Karte für andere Spieler, mit ihren
  drei Abzeichen aus jedem Spiel.
- **Zurück-Taste / Wischen zurück** schliesst die oberste Karte oder das
  oberste Fenster (Profil, Level-Weg, Serie, Abzeichen-Wahl), statt die App
  zu verlassen.
- Fenster beginnen genau unter der Kopfzeile, nichts schaut mehr halb heraus.
- **Level antippen** (auf der Karte, im Profil unten oder nach einer Partie):
  Der Level-Weg zeigt, was du schon hast, wo du stehst und was noch kommt.
- **Serien-Schild und Serien-Schutz sind weg.** Ein verpasster Tag beendet
  die Serie. Wer noch Flammen-Schilde gekauft hatte, bekommt einmal 50 Münzen
  je Stück zurück.
- **Einstellungen:** echtes Zahnrad, beim Speicher eine Lampe (grün
  gespeichert, gelb wartet, rot keine Verbindung), der Schalter
  „Standard-Schrift" ist weg, weniger Text.
- Die alte Freunde-Seite am Start ist ganz weg — Freunde findest du im
  Reiter „Freunde" der Rangliste.

## v0.156.1 — 29.09.2026

**Shop, Sammlung, Aufgaben und Rangliste sind wieder ganze Seiten.**

- Die vier Bereiche der Leiste öffnen wieder als eigene Seite, Wischen
  wechselt zwischen ihnen wie früher. Als Blatt über dem Start öffnen nur
  noch Profil, Einstellungen, Verwaltung, Serie und Verlauf.
- **Behoben:** Beim Rollen hinter einem offenen Blatt schienen oben die
  Menüs durch. Jetzt steht die Seite still, solange ein Blatt offen ist.
- **Das Menü oben rechts ist weg.** Profil: dein Bild oben links. Einstellungen:
  das Zahnrad im Profil. Freunde: eigener Reiter in der Rangliste. Verlauf:
  im Profil unter „Statistik und Partien". Schach lernen: in den
  Einstellungen unter „Nur in Blunderluck".
- „Statistik und Partien" im Profil führt auf die Rangliste-Seite, „Schild
  kaufen" in der Serie auf die Shop-Seite.
- Die sechs Abzeichen aus Typoluck stehen jetzt mit in der gemeinsamen
  Abzeichen-Liste (`js\upcrew-abzeichen-spiele.js`, = final).

## v0.156.0 — 29.09.2026

**Keine Vollbild-Menüs mehr: alles öffnet über dem Start.**

- **Shop, Sammlung, Aufgaben, Rangliste, Profil, Einstellungen und
  Verwaltung** öffnen als Blatt über dem Start — der Start bleibt dahinter
  sichtbar, etwas zurückgesetzt. Schliessen mit ✕, mit einem Tipp daneben
  oder mit Esc; mehrere Blätter liegen übereinander (Profil →
  Einstellungen → Verwaltung) und gehen mit dem Pfeil einzeln zurück. Die
  Partie bleibt ein eigener Bildschirm.
- **Neue Reihenfolge unten:** Shop · Sammlung · Start · Aufgaben ·
  Rangliste. Wischen folgt derselben Reihenfolge, auch auf den Blättern.
- **Serie oben hinter der Flamme:** die letzten sieben Tage und deine
  beiden Schilde (Flammen-Schild aus dem Shop, Serien-Schutz vom Level). Ein
  Tipp erklärt beides und führt mit „Schild kaufen" in den Shop. In den
  Aufgaben steht die Serie nicht mehr.
- **Neues Profil:** Name mit klein #Nummer, Level-Ring und XP, drei
  ausgerüstete Abzeichen aus allen UPCrew-Spielen, Spielzeit, „dabei seit"
  und wo du im Turm stehst. Das Zahnrad oben führt in die Einstellungen,
  „Statistik und Partien" zum ausführlichen Profil. Verdiente Abzeichen
  bleiben fest im Profil.
- **Einstellungen und Verwaltung neu geordnet**, gleich wie in Typoluck:
  Konto · Aussehen · Privatsphäre · Nur in Blunderluck · Hilfe · Admin ·
  Über · Konto löschen.
- **Sammlung:** Der Würfel für Zufall sitzt jetzt unten neben Zurück und
  Übernehmen.
- Auf schmalen Handys (unter 380 px) zeigt der Kopf nur noch den Ring.

## v0.155.2 — 28.09.2026

**Spielzeit-Haken am Konto, höchstens drei je Team.**

- **„Spielzeit öffentlich"** gilt jetzt für dein Konto — auf jedem Gerät und
  in jedem UPCrew-Spiel gleich (bisher je Gerät). Zu finden in den
  Einstellungen, Karte „UPCrew-Konto". Standard bleibt privat.
- **Höchstens 3 Spieler je Team:** Ein volles Team ist im Vorraum als
  „voll · 3/3" markiert und lässt sich nicht wählen; auch der Zufall, ein
  Code oder ein Nachzügler kommen nicht mehr hinein. Laufende ältere Runden
  mit mehr Spielern laufen weiter.

## v0.155.1 — 28.09.2026

**Kein altes Ergebnis mehr beim Rundenstart, und gegen Bob geht es sofort los.**

- **Fehler behoben:** Wer eine neue Runde startete, bekam das Ergebnis der
  letzten Runde über die neue gelegt (wenn man es vorher weggewischt statt
  geschlossen hatte). Jetzt zeigt nur die Runde, in der du gerade warst, ihr
  Ergebnis — und zwar, wenn sie endet. Ältere Ergebnisse werden still
  gebucht (XP, Münzen, Turm zählen genau einmal) und stehen weiter in der
  Übersicht unter „Ergebnis ansehen".
- **Gegen Bob direkt ins Spiel:** kein Vorraum, kein „Bereit". Deine Farbe
  wird beim Anlegen zufällig bestimmt und bleibt auch nach dem Neuladen.
  Wer die Seite selbst wählen will (Zufall aus), wählt wie bisher; Runden
  mit Menschen bleiben, wie sie sind.

## v0.155.0 — 28.09.2026

**Nummer sichtbar, Spielzeit, keine Streifen mehr beim Intro.**

- **Name und klein #Nummer** bei allen Spielern — in der Rangliste, im
  Profil und bei den Freunden. Das „Level N" bei gleichen Namen fällt weg.
- **Spielzeit:** Die App zählt, wie lange sie offen und sichtbar ist — je
  Spiel. Du siehst sie in deinem Profil (je Spiel, gesamt und „dabei
  seit"), auch als Gast; beim Sichern des Gast-Spielstands zieht sie mit.
  Unter einer Stunde steht „N min", danach „1h+", „2h+" … Sie ist
  **privat**; in den Einstellungen kannst du sie öffentlich schalten.
  Admins sehen sie in der Verwaltung.
- **Intro am PC:** Die dünnen Streifen links und rechts sind weg; das
  Brett bleibt mittig.
- Vorbereitet für die Datenbank-Regel §12: Partien löschen nur noch
  Mitspieler oder Admins, die Nummer und (wenn öffentlich) die Spielzeit im
  öffentlichen Profil.

## v0.154.0 — 28.09.2026

**Bereit für den Datenschutz (Regel §12) — heute ändert sich fast nichts.**

- Die App erkennt selbst, welche Datenbank-Regel gilt. Unter der heutigen
  läuft alles wie bisher; sobald du die neue Regel §12 einspielst, liest
  niemand mehr die Konten anderer: Andere sehen nur Name, Freunde, Abzeichen
  und Level (ein öffentlicher Auszug), angemeldet wird über ein Verzeichnis
  je Name.
- **Die Nummer anderer siehst du nirgends mehr** — sie ist ihr Freundescode.
  Bei gleichen Namen steht „Level N" dahinter. Deine eigene Nummer siehst und
  änderst du im Profil.
- **Freunde suchen nur noch mit Name#Nummer** (z. B. „Anna#4242").
- Fremdes Level und fremde Abzeichen im Profil kommen aus dem Auszug —
  dieselben Zahlen wie bisher.
- Für UP#Plus: in der Verwaltung „§12 nachziehen" (erscheint erst, wenn die
  neue Regel gilt).

## v0.153.0 — 28.09.2026

**Deine Antworten zu Schild, Hand und Shop.**

- **Das Schild sperrt:** Eine Figur mit Schutzschild kann nicht ziehen,
  solange das Schild hält (bisher durfte sie ziehen und verlor es dabei).
  Wäre sie deine einzige Figur mit einem Zug, lässt sich das Schild auf ihr
  gar nicht erst einsetzen. Die Warnung an der Karte sagt es.
- **Hand max: Vorgabe ohne Grenze.** Neue Runden starten ohne Grenze; der
  Schalter 2/3/4/5/Alle bleibt. Wer selbst eine Zahl wählt, behält sie;
  laufende Runden behalten ihre Einstellung.
- **Shop:** „Zeit zurück" zeigt eine Uhr statt des Herzens.

## v0.152.5 — 28.09.2026

**Weniger Datenverbrauch, und dein Aussehen folgt dir auf jedes Gerät.**

- **Dein Aussehen je Spiel am Konto:** Farbwelt, Hell/Dunkel, Schrift und
  Knöpfe, die du für Blunderluck wählst, kommen jetzt auch auf deinen
  anderen Geräten an (die Datenbank-Regel dafür ist eingespielt).
- **Deutlich weniger Download:** Auf dem Start holt das Spiel keine fremden
  laufenden Partien mehr (niemand zeigt sie an) und fragt nur noch alle 15
  Sekunden nach — gemessen rund 80 Prozent weniger je Stunde. Gegen Bob
  ebenfalls alle 15 Sekunden (rund die Hälfte weniger). In einer Partie mit
  Menschen und im Vorraum bleibt es bei 3 Sekunden. Kommst du zurück in die
  App, wird sofort nachgesehen.
- **Die Chronik kommt stückweise:** Nur neue Einträge werden geholt, der
  Rest liegt auf dem Gerät.
- **Alte Partien werden aufgeräumt:** Eine beendete Partie verschwindet eine
  Woche nach ihrem Ende vom Server. Wer die App in dieser Woche nicht
  öffnet, bekommt XP und Münzen dieser Partie nicht mehr. Deine Rangliste
  bleibt, und im Verlauf deines Geräts bleiben deine Partien stehen.
- Einladungen und der Beitritt über den Code in eine laufende Runde gehen
  weiter wie bisher.

## v0.152.4 — 28.09.2026

**Deine Wünsche für Brett und Karten.**

- **Denk-Blase:** Wer am Zug ist — auch Bob —, hat neben dem Profil eine
  kleine Comic-Blase mit laufendem Kreis.
- **2D-Mauer:** Im 2D-Modus ist die Mauer ein flaches Ziegelband mit
  dunkler Kontur wie die Figuren; die Restzeit steht nur noch einmal, hell,
  am Ende der Mauer statt als dunkler Kreis auf jedem Stück.
- **2D-Würfel:** Im 2D-Modus liegen flache Würfel in der Stufenfarbe mit
  Fragezeichen auf dem Brett statt der 3D-Würfel.
- **2D-Karten:** Die Fähigkeiten-Karten sind im 2D-Modus flach.
- **Schild-Warnung:** Die gewählte Schild-Karte sagt „Achtung · Figur
  stehen lassen, sonst ist das Schild weg".
- **Wie viele auf der Hand?** Neue Rundenregel: höchstens 2, 3, 4 (Standard)
  oder 5 Items auf der Hand, oder „Alle". Was darüber eingesammelt wird,
  verpufft — mit Rauch auf dem Feld und „Hand voll · verpufft". Gilt auch
  für Bob; am Schildchen der Runde steht „Hand max N".
- **Intro in deiner Farbwelt:** Das UPCrew-Intro erscheint in der Farbwelt
  und hell/dunkel, die du für Blunderluck gewählt hast.

## v0.152.3 — 28.09.2026

**Fehler aus deinen Bildern behoben.**

- **Karten einsetzen:** Die runden Knöpfe unter einer gewählten Karte
  (✓ Einsetzen, ✕ Abbrechen, ? Anleitung) zeigten seit v0.144.0 nur einen
  leeren Kreis — jetzt stehen Haken, Kreuz und Fragezeichen wieder da, und
  die gewählte Karte und dein runder Menü-Knopf haben ihre richtige Größe.
- **Warum eine Karte nicht geht**, sagt das Spiel jetzt genau: „König im
  Schach · erst schützen", „Gäbe Schach · Items dürfen das nicht", „Eigener
  König käme ins Schach" … — schon beim Antippen der Karte, nicht erst nach
  dem ✓. Das Zeichen ist ein Achtung-Dreieck statt des durchgestrichenen
  Netzes, der Text gut lesbar.
- **Zeit zurück** gibt es nur noch im Turm und spricht von einem Zug:
  „Einen Zug zurück · nur im Turm".
- **Nichts mehr markieren:** Ein Wisch mit der Maus färbte Figuren blau ein
  (so sah ein König auf deinem Bild „angewählt" aus). Markieren und Ziehen
  geht nur noch in Eingabefeldern und bei den Beitritts-Codes.
- **Brett mittig am PC:** Der Platz des Rollbalkens schob das Brett um ein
  paar Pixel nach links — jetzt steht es genau in der Mitte (2D und 3D).
- **Partie-Einstellungen** während der Partie ohne die Leiste unten.
- **Anleitungen spielen immer ab** — auch wenn am Gerät „weniger Bewegung"
  eingestellt ist und auch im 2D-Modus. Die Bilder mit Text nebeneinander
  gibt es nicht mehr.
- **Gast → Konto:** Wer als Gast eine Weile gespielt hat, konnte kein
  Konto daraus machen („Anmeldung abgelaufen"). Jetzt klappt es; alles vom
  Gast bleibt.
- **Konto erstellen:** Jedes Feld sagt, was nicht stimmt — Name zu kurz,
  falsche Zeichen, was dem Passwort fehlt, Passwörter ungleich, Name mit
  diesem Passwort schon vergeben, keine Verbindung. Der Knopf ist immer
  drückbar und zeigt dann alle Meldungen.
- **Das UPCrew-Intro** kommt bei jedem Laden der Seite, auch nach F5 —
  nur nicht direkt nach dem automatischen Neuladen einer neuen Version.

## v0.152.2 — 28.09.2026

**„Zeit zurück" statt Extra-Leben.**

- Die Ware aus dem Shop heißt jetzt **Zeit zurück**: Ein Einsatz nimmt
  deinen letzten Zug und Bobs Antwort zurück — du bist wieder am Zug.
  Stellung, Karten, Lootboxen, geschlagene Figuren und der Zugverlauf
  springen mit. Nur gegen Bob (Turm, Frei, Heute), nie gegen Menschen.
- **In der Partie:** im Spiel-Menü (runder Knopf unten links) neben dem
  Tipp, hinter einem feinen Strich, mit deinem Vorrat als Zahl. Erscheint
  erst, wenn du einen Zug zurücknehmen kannst. Ohne Rückfrage; eine
  kurze Einblendung sagt „Zeit zurück · noch N".
- **Nach einer Niederlage** gegen Bob (Matt, ins Schach gestolpert,
  Tagesbrett verfehlt — nicht nach „Aufgeben"): Hauptknopf „Zeit zurück ·
  noch N" — dieselbe Partie geht vor deinem letzten Zug weiter (bisher:
  die Turm-Stufe neu). Die Niederlage wird erst gebucht, wenn du den
  Abschluss schließt — nichts wird doppelt gezählt.
- **Wertung:** Mit Tipp oder Zeit zurück gibt es im Turm und beim
  Tagesbrett höchstens einen Bauern.
- Kauf-Zähler am Konto bleiben gültig (die Ware heißt intern weiter
  `leben`).

## v0.152.1 — 27.09.2026

**Spielerliste für Admins.**

- In der Verwaltung steht neben der Konten-Tabelle eine Spielerliste mit
  Level, Serie, Münzen, Partien, zuletzt aktiv und Abzeichen — suchen,
  sortieren, Gäste ein/aus; antippen zeigt die Zahlen je Spiel. Nur lesen,
  nur für Admins, gleich wie in Typoluck.
- Im Shop stehen die Texte der Waren jetzt in Blunderluck selbst (das
  Extra-Leben heißt hier „Eine verlorene Turm-Stufe gleich nochmal").

## v0.152.0 — 27.09.2026

**Münzen, Shop und eine Serie, die ab dem ersten Zug zählt.**

- **Serie:** Ein Tag zählt, sobald du in Blunderluck oder Typoluck eine
  Runde startest — gewinnen musst du dafür nicht. Die Serie geht jetzt auch
  über 60 Tage hinaus (bis „1k+" an der Flamme).
- **Münzen** — gemeinsam für beide Spiele: Tagesaufgabe +10, gewonnene
  Runde +3, neue Figur im Turm +5, Boss besiegt +25, 7 Tage Serie +20,
  Level-Aufstieg +10. Eine kurze Einblendung zeigt, was du bekommen hast.
- **Shop** auf dem fünften Platz der Leiste (statt „Bald"): Flammen-Schild
  50 (höchstens 2), Extra-Leben 30, Tipp 15. Kaufen mit kurzer Rückfrage.
- **Einsetzen:** Der Tipp steht in der Partie im Menü am eigenen Namen
  (zeigt einen guten Zug; beim Tagesbrett danach höchstens ein Bauer). Das
  Extra-Leben startet nach einer verlorenen Turm-Partie dieselbe Stufe
  gleich wieder. Gekaufte Schilde retten die Flamme über einen verpassten
  Tag.

## v0.151.18 — 27.09.2026

**Die Flamme oben neben deinem Profil.**

- Ein Kreis mit einer Flamme, darin deine Serie (bis 999 als Zahl, darüber
  „1k+"). Grau, solange keine Serie läuft; gedämpft und leise pulsierend,
  wenn heute noch nichts geschafft ist; leuchtend, wenn heute geschafft.
  Ein kleines Schild zeigt einen Serien-Schutz.
- Die Serie zählt über beide Spiele und hängt an deinem Konto — sie stimmt
  auch auf einem neuen Gerät, sobald du angemeldet bist.
- Antippen führt zu „Aufgaben" (Woche, Schutz, Tagesaufgaben).

## v0.151.17 — 27.09.2026

**Jedes Spiel hat sein eigenes Aussehen.**

- „Übernehmen" in der Sammlung ändert nur noch Blunderluck — Typoluck
  behält seine Farbwelt, Schrift, Knöpfe und Darstellung. Deine bisherige
  Wahl bleibt als Start erhalten.
- In der Vorschau der Sammlung entfällt dafür der Umschalter
  „Typoluck / Blunderluck".
- Für später gibt es einen Schalter, mit dem beide Spiele wieder ein
  gemeinsames Aussehen bekommen.

## v0.151.16 — 27.09.2026

**Die Leiste unten gleitet.**

- Beim Tab-Wechsel fährt die orange Kapsel gefedert zum neuen Tab, und das
  Symbol hüpft kurz — beim Tippen wie beim Wischen. Mit „Bewegung
  reduzieren" ohne Bewegung.

## v0.151.15 — 27.09.2026

**Rechts und links ist Stopp.**

- Am ersten und am letzten Tab bewegt sich beim Wischen nichts mehr — es
  geht nicht im Kreis (vom letzten Tab nicht zurück zum ersten).
- Die ganze Seite lässt sich nicht mehr seitlich verschieben: Am Start
  ragte das Quadrat neben „Spielen" 7 px über den Rand; es hat jetzt eine
  feste Größe. Seitliches Überrollen ist abgeschaltet.
- Behoben: Nach einem Besuch der Sammlung stand ihr Kopf („Sammlung 66 %")
  auf den anderen Tabs unten im Bild.

## v0.151.14 — 27.09.2026

**Wischen wechselt die Tabs.**

- Waagrecht über den Inhalt wischen wechselt zum Nachbar-Tab der Leiste:
  nach links zum nächsten, nach rechts zum vorherigen („Bald" wird
  übersprungen). Der Inhalt folgt dem Finger leicht und gleitet hinüber.
- Senkrechtes Rollen bleibt, wie es ist. Nicht gewischt wird während einer
  Runde, in offenen Fenstern und Dialogen, auf Regal-Reihen, Umschaltern,
  Brettern und Eingabefeldern und vom Bildschirmrand aus (iPhone-Zurück).
- Am iPhone beginnt der Inhalt oben jetzt immer unter der Statusleiste —
  auch auf schmalen Bildschirmen (dort rutschte der Anfang der Sammlung
  unter ihren klebenden Kopf).

## v0.151.13 — 27.09.2026

**Kleinigkeiten nach dem Baustein-Umzug.**

- „Wie viele?" beim Anlegen einer Runde: „normal" und „Regen" brechen am
  Handy nicht mehr mitten im Wort um (die Kacheln hatten zu viel Innenrand).
- Der Anpassen-Baustein kommt in der berichtigten Fassung aus der
  gemeinsamen Quelle: Die Vorschau wächst mit, wenn ein Spiel mehr Platz
  braucht (Typoluck-Tastatur). Die Blunderluck-Vorschau bleibt gleich hoch.

## v0.151.12 — 27.09.2026

**Die fünf Abzeichen aus Typoluck — jetzt auch in Blunderluck.**

- Viel gespielt, Serie, Beide Spiele, Figuren, Tagesaufgaben: im Profil
  (Karte „Abzeichen · beide Spiele" unter dem Level) und in der Sammlung
  als erste Gruppe. Je Stufe ein Punkt, erreichte golden, nach oben offen;
  antippen zeigt Wert und Stufen.
- Gezählt wird über beide Spiele zusammen — Blunderluck und Typoluck zeigen
  dieselben Zahlen.

## v0.151.11 — 27.09.2026

**Die Sammlung ist ein gemeinsamer Baustein — in Blunderluck und Typoluck gleich.**

- Das Gerüst der Sammlung (Kopf mit „NN %", Umschalter der Spiele,
  klebende Vorschau mit Abschluss, Regale, reine Sammlung, Balken
  „Zurück · Übernehmen" über der Leiste) kommt jetzt aus einem gemeinsamen
  Baustein. Typoluck übernimmt ihn 1:1, damit beide Sammlungen gleich
  aussehen und gleich bleiben. In Blunderluck sieht alles aus wie vorher.
- Auf sehr niedrigen Bildschirmen (bis 600 px hoch) rollt die Vorschau mit,
  damit für die Regale Platz bleibt.

## v0.151.10 — 27.09.2026

**Items selbst wählen: echte Kacheln. Wunsch melden: nur Text.**

- „Neue Runde" → „Welche Items?" → „selbst wählen …": Statt „[x] Platztausch"
  als Text in orangen Blöcken gibt es jetzt An/Aus-Kacheln mit dem Zeichen
  der Fähigkeit und einem runden Haken. Angehakt: kräftig mit Rahmen in der
  Hauptfarbe; abgewählt: leise. Die letzte Reihe verschwindet nicht mehr
  unter dem Fuß, und der Knopf heißt „Fertig" statt „Verstanden".
  Dieselben Kacheln bei der Abzeichen-Wahl im Profil.
- „Welche Items?" zeigt statt der Lootbox-Würfel je Seltenheit eine kleine
  Item-Karte dieser Seltenheit (wenig: gewöhnlich; viele: bis episch; alle:
  alle vier). Die Würfel bleiben bei „Wie viele?".
- „Wunsch oder Fehler": Es geht nur noch Text durch — Buchstaben (mit
  Umlauten und ß), Ziffern, Leerzeichen, Zeilen und . , ! ? - ( ) : ;.
  Alles andere verschwindet schon beim Tippen. Höchstens 500 Zeichen,
  doppelte Leerzeichen werden eins. Auch das Abhol-Werkzeug für die
  Wünsche prüft das noch einmal.
- iPhone-App vom Home-Bildschirm: Oben deckt eine Fläche in der
  Grundfarbe die Statusleiste ab, damit beim Rollen nichts unter Uhr und
  Akku durchläuft (wie in Typoluck gemeldet).

## v0.151.9 — 27.09.2026

**Gleicher Name, gleiches Passwort: du wählst dein Konto.**

- Zwei Konten dürfen denselben Namen UND dasselbe Passwort haben — das
  neue bekommt einfach eine andere Nummer.
- Passt dein Passwort beim Anmelden zu mehreren Konten mit deinem Namen,
  fragt die App kurz „Welches Konto?". Jede Zeile zeigt den Namen, klein
  die Nummer und — wenn vorhanden — Level und den letzten Spieltag. Tippen
  meldet dich in genau dieses Konto an.
- Passt es nur zu einem, bist du wie bisher sofort angemeldet.

## v0.151.8 — 27.09.2026

**Anmelden nur mit Name und Passwort — um die Nummer musst du dich nicht kümmern.**

- Beim Anmelden gibst du nur deinen Namen und dein Passwort ein. Gibt es
  den Namen mehrmals, findet die App dein Konto selbst. Stimmt es nicht,
  heißt es „Name oder Passwort falsch".
- Beim neuen Konto (und beim Sichern als Gast) gibst du nur Name und
  Passwort ein. Danach steht kurz „Angemeldet · Name" — ohne Nummer.
- Namen erscheinen überall ohne Nummer. Nur bei Freunden und in der
  Freundessuche steht sie klein und blass dahinter, wenn es denselben
  Namen zweimal gibt.
- Deine Nummer siehst und änderst du in den Einstellungen (Konto) oder
  im Profil: würfeln oder selbst eine freie wählen. Freunde, Partien und
  Fortschritt bleiben.
- In den Beispieltexten steht kein echter Name mehr.

## v0.151.7 — 27.09.2026

**Einladungslink: sofort mitspielen, ohne Anmeldung.**

- Wer einen geteilten Link zum ersten Mal öffnet, landet direkt in der
  Runde — kein Anmelde-Fenster. Die App legt dafür still einen Gast an
  („Gast#1234"). Wer schon angemeldet ist, tritt wie bisher direkt bei.
- Klappt das wegen des Netzes nicht, kommt „Nochmal" — der Code bleibt.
- Nach dem Ende dieser Runde fragt die App den Gast einmal kurz: „Konto
  erstellen?" — mit Konto bleiben Partie, Fortschritt und Freunde. Nach
  „Später" erst wieder nach der nächsten Einladung.

## v0.151.6 — 27.09.2026

**Geteilte Einladungen mit Vorschaubild.**

- „Teilen" im Code-Bildschirm gibt jetzt Text UND Link getrennt weiter.
  Dadurch zeigt das Teilen-Blatt am iPhone bzw. WhatsApp ein Bild von
  Blunderluck (König, „Schach mit Lootboxen") statt eines leeren
  Text-Symbols.
- Wer den Link öffnet, landet wie bisher direkt beim Beitreten mit dem
  Code. „Kopieren" kopiert weiter Text und Link.

## v0.151.5 — 27.09.2026

**Schutz gegen die weisse Seite nach einem Update.**

- In Typoluck blieb am iPhone nach einem Update einmal nur eine weisse
  Seite. Blunderluck hat denselben Aufbau und ist jetzt genauso geschützt:
  Die App holt ihre Dateien beim Update nur noch aus ihrem EIGENEN
  Zwischenspeicher (nie aus dem von Typoluck oder einer alten Fassung) und
  legt neue Dateien garantiert frisch ab.
- **Notfall-Weg:** Kommt die App 10 Sekunden nach dem Öffnen nicht hoch,
  räumt sie ihren Zwischenspeicher auf und lädt einmal neu. Klappt auch
  das nicht, steht dort nur „Neu laden" — keine Endlosschleife.

## v0.151.4 — 27.09.2026

**Sammlung aufgeräumt, Anmeldung in deinen Farben.**

- **Kein orangefarbener Bogen mehr oben links in der Sammlung:** Beim
  Rollen schaute neben „Sammlung" der Rand einer gewählten Kachel vorbei.
  Die Kopfzeile deckt jetzt die ganze Breite.
- **Klarer Abschluss unter der Vorschau:** Eine deutliche Kante trennt die
  klebende Vorschau von den Regalen, die darunter verschwinden.
- **Weniger Höhe unten:** Der Balken „Zurück · Übernehmen" ist etwas
  flacher und sitzt bündig auf der neuen Leiste.
- **Anmeldung nicht mehr violett:** Das Anmelde-Fenster folgt jetzt deiner
  Farbwelt und Hell/Dunkel — ab Werk Orange. Violett gibt es nur noch als
  Farbwelt „Studio".

## v0.151.3 — 27.09.2026

**Echtes 2D, keine Gäste in der Rangliste, und beim Spielen ist die Leiste
unten weg.**

- **Echtes 2D:** Im 2D-Brett stehen jetzt flache Figuren — im Stil der
  kleinen Figuren im Turm (Bauer, Springer, König), hell mit dunkler Kante
  bzw. dunkel mit heller Kante, mitten auf dem Feld. Bisher zeigte auch das
  2D-Brett die gerenderten Bilder der 3D-Figuren. Gilt für Brett, Vorschau
  auf dem Start und das Bild „2D" in der Sammlung. 3D bleibt 3D.
- **Gäste nicht in der Rangliste:** Wer „Als Gast" spielt, steht in keiner
  Rangliste und taucht in keiner Suche auf. Der Gast selbst sieht seinen
  Platz weiter.
- **Leiste weg beim Spielen:** Sobald eine Partie offen ist — schon ab
  „Bereit" —, ist die Leiste unten weg und der Platz frei. Nach dem Ende
  ist sie wieder da.
- **Neue Leiste unten:** Der aktive Tab ist jetzt eine breite Kapsel in der
  Hauptfarbe, Symbol und Name nebeneinander — passt auch auf schmale
  Handys („Sammlung" bei 320 px). Gleich wie in Typoluck.

## v0.151.2 — 27.09.2026

**Neue Versionen kommen jetzt auch an.**

- Bisher blieb eine geöffnete App (vor allem vom Home-Bildschirm) nach
  einer Auslieferung auf der alten Version stehen — die neue kam erst nach
  mehrmaligem Neustart. Jetzt fragt die App beim Öffnen und beim
  Zurückholen nach und lädt die neue Version einmal von selbst.
- Nie mitten im Spiel: In einer laufenden Partie, einem offenen Dialog oder
  beim Tippen erscheint oben nur „Neue Version · antippen"; geladen wird,
  sobald es passt, oder sofort beim Antippen.

## v0.151.1 — 27.09.2026

**Level, Serie und Turm-Figuren folgen dir jetzt auf jedes Gerät.**

- Mit Konto wird dein Fortschritt jetzt auch am Konto gespeichert (die
  Datenbank-Regel dafür ist eingespielt). Meldest du dich auf einem anderen
  Handy an, sind Level, Serie und Figuren schon da. Gäste: weiter nur auf
  diesem Gerät.
- Sicherer beim Speichern: Was ans Konto geht, wird vorher auf genau die
  erlaubten Felder beschränkt — ein falscher Wert kann nicht mehr den ganzen
  Konto-Eintrag (mit Freunden) blockieren.

## v0.151.0 — 27.09.2026

> **Live seit 27.09.2026** — zusammen mit v0.146.0 bis v0.150.0 als ein
> Paket und gleichzeitig mit Typoluck ausgeliefert (vom Nutzer selbst).
> **Achtung: Das 3D-Brett ist jetzt eine Belohnung** (siehe v0.147.0) —
> wer bisher 3D gespielt hat, spielt 2D, bis er im Turm die Holzhalle
> erreicht.

**Die Wertung im Turm ist repariert, die Tagesaufgabe zählt nach
Schwierigkeit** (Runde 6, Nachtrag).

- **Kein Stillstand mehr nach deinem Zug:** Die Wertung rechnet jetzt im
  Hintergrund. Bisher stand die Seite nach jedem eigenen Turm-Zug ein bis
  drei Sekunden. Im Abschluss steht „…", bis sie fertig ist.
- **Die Wertung ist ehrlicher:** Bisher bekamen selbst zufällige Züge
  über 80 %. Jetzt zählt, wie viel ein Zug gegenüber dem besten kostet
  (in Bauern), und Züge in längst entschiedenen Stellungen zählen nicht
  mit. Gemessen: Zufall 26–40 %, gutes Spiel 70–90 %.
- **Springer und König neu eingestellt:** Werkbank ab 60 % / 80 % bis
  Meisterliga ab 75 % / 90 %.
- **Tagesaufgabe nach Schwierigkeit:** Matt in 1 bringt 15 XP, Matt in 2
  20, Matt in 3 30 — dazu 10 XP je Figur, ×1,5 und Serie wie bisher. Die
  Schwierigkeit steht als 1–3 Punkte auf der Karte „Tagesbrett". In
  Typoluck gilt dieselbe Rechnung.
- **Rahmen erst ab Level 10**, dann alle 5 Level (Silber 10, Gold 15,
  Platin 20, danach Glanz) — gleich wie in Typoluck.

## v0.150.0 — 27.09.2026

**Neu: ein Fortschritt für Blunderluck UND Typoluck** (Runde 6, Teil A).

- **Level, Serie und „Heute" teilen sich jetzt einen Speicher mit
  Typoluck.** Spielst du beide im selben Browser, zählen die XP beider
  Spiele zu EINEM Level, und das Tageswort aus Typoluck zeigt sich auf der
  Karte „Tageswort" im Tab Aufgaben — samt ×1,5, wenn du beides schaffst.
  (Wirkt, sobald Typoluck 0.11.0 dasselbe Format schreibt.)
- **Nichts geht verloren:** Wer schon Level oder Turm-Figuren hatte, dem
  wird der alte Stand einmalig übernommen.
- **Am Konto** wird der Fortschritt erst gespeichert, wenn die neue
  Datenbank-Regel eingespielt ist (`SICHERHEIT.md` §11b) — bis dahin gilt
  er je Gerät.

## v0.149.1 — 27.09.2026

**Das Tagesbrett hat jetzt seine Aufgaben** (Nachtrag zu v0.149.0).

- **40 Stellungen** (10× Matt in 1, 18× Matt in 2, 12× Matt in 3) aus
  Partien Bob gegen Bob, jede mit einem Löser geprüft: Matt in genau N
  Zügen, kein kürzeres, bei Matt in 2 und 3 genau EIN erster Zug, der
  dorthin führt. Jeden Tag ist die nächste dran, für alle gleich.
- **Springer und König im Turm sind schwerer geworden:** gegen Bob
  nachgerechnet, lagen die alten Schwellen so tief, dass jeder Sieg den
  König gebracht hätte. Jetzt Werkbank 88 % / 93 % bis Meisterliga
  93 % / 98 %.

## v0.149.0 — 27.09.2026

**Neu: Heute** (Runde 5, vierter Teil) — der Tab „Aufgaben" ganz links.

- **Das Tagesbrett:** jeden Tag eine Schach-Aufgabe („Matt in 2" …), für
  alle gleich. „Lösen" startet sie gegen Bob; nach N Zügen ohne Matt ist
  sie verfehlt, „Nochmal" geht immer. Im ersten Versuch gibt es drei
  Figuren, im zweiten zwei, danach eine.
- **XP:** Tagesaufgabe +20, dazu die Serie (+5 je Tag am Stück, höchstens
  +35). Schaffst du am selben Tag auch das Tageswort in Typoluck, gibt es
  ×1,5.
- **Die Serie:** sieben Flammen für die letzten sieben Tage, darunter die
  Tage am Stück. Ab Level 11 bringt jedes Level einen **Serien-Schutz**, der
  einen verpassten Tag überbrückt.
- Die Karte **Tageswort** zeigt, ob du es in Typoluck heute geschafft hast,
  und führt mit „Zu Typoluck" hinüber.

## v0.148.0 — 27.09.2026

**Neu: die Wertung im Turm** (Runde 5, dritter Teil) — wie bei Chess.com.

- **Jeder deiner Züge in einer Turm-Partie wird bewertet:** Brillant !! ·
  Stark ! · Gut ✓ · Ungenau ?! · Fehler ? · Blunder ??. Daraus ergibt sich
  deine **Genauigkeit** in Prozent — sie steht nach der Partie im Abschluss,
  mit den Zügen je Klasse.
- **Springer und König:** Ein Sieg bringt den Bauern; mit genug Genauigkeit
  dazu den Springer, mit sehr hoher den König. Jeder Ort verlangt etwas mehr
  (Werkbank ab 60 % bzw. 75 %).
- **Glück zählt nicht:** Züge, mit denen du eine Lootbox einsammelst,
  werden nicht bewertet — sie stehen getrennt als „Glück". Fähigkeiten und
  Züge ohne Wahl ebenso.
- Die Rechnung ist eine Näherung (sie schaut zwei Züge weit plus alle
  Schlagabtausche) und läuft nur auf deinem Gerät.

## v0.147.0 — 27.09.2026

> **Achtung: Das 3D-Brett ist jetzt eine Belohnung.** Wer bisher in 3D
> gespielt hat, spielt ab jetzt 2D, bis er im Turm die **Holzhalle**
> erreicht (Werkbank schaffen). So war es entschieden (kein Bestandsschutz).

**Neu: der Turm** (Runde 5, zweiter Teil).

- **Der Start hat zwei Arten: Turm und Frei.** Gewählt wird am Quadrat
  rechts neben „Spielen". Frei ist der Start wie bisher (Brett antippen =
  Spielart und Grundeinstellungen).
- **Im Turm steht oben der Weg durch dein Stockwerk:** ein Punkt je Stufe,
  oben die Tür. Mit ▲▼ blätterst du durch die sechs Orte — Werkbank,
  Holzhalle, Marmorsaal, Nachtclub, Turniersaal, Meisterliga.
- **Jede Stufe ist ein eigener Gegner** mit einer eigenen Regel (Schwarz,
  viele Lootboxen, Kreuzbrett, Fallen unsichtbar …). Wer es ist, siehst du
  erst beim Start. Die letzte Stufe ist der **Boss** — erst spielbar, wenn
  alle davor geschafft sind. Ist der Boss besiegt, geht die Tür auf und der
  nächste Ort ist frei („Neuer Ort").
- **Figuren als Wertung:** Ein Sieg bringt den Bauern. Springer und König
  (für genaues Spielen) kommen mit der nächsten Version. Jede neue Figur
  gibt +10 XP.
- **Die Orte schalten frei:** 3D-Brett, Brett Holz und Figuren Matt ab der
  Holzhalle, Marmor und Porzellan ab dem Marmorsaal, Nacht und Metall ab dem
  Nachtclub, Turnier ab dem Turniersaal.

## v0.146.0 — 27.09.2026

**Neu: Level** (Runde 5, erster Teil — Turm, Wertung und „Heute" folgen).

- **Jede beendete Partie bringt +10 XP** — auch verloren, auch gegen Bob.
  Nach der Partie steht „+10 XP", bei einem Aufstieg „Level N".
- **Ring ums Profilbild** oben links auf dem Start: Er füllt sich mit den
  XP bis zum nächsten Level, die Zahl ist dein Level. Ab Level 5 trägt der
  Ring einen Rahmen (Kupfer, Silber, Gold, Platin).
- **Im Profil eine Level-Karte:** Level, Titel, XP-Balken und die nächsten
  drei Level mit dem, was sie freischalten.
- **Das Level schaltet Aussehen frei:** Farbwelten, Schriften und Knöpfe in
  der Sammlung werden mit dem Level frei (Schloss mit der Level-Zahl).
- Mit Konto gilt das Level auf allen Geräten und zählt später auch die XP
  aus Typoluck mit; als Gast bleibt es auf diesem Gerät.

## v0.145.0 — 27.09.2026

**Neue Leiste unten und der Tab „Sammlung“** (UPCrew-Angleichung, Runde 4 —
in Typoluck gleich).

- **Die Leiste unten zeigt nur noch Symbole.** Der Name steht nur beim Tab,
  auf dem du gerade bist — der sitzt auf einer farbigen Kachel, die sich
  nach oben hebt. Reihenfolge wie in Typoluck: Aufgaben · Sammlung · Start
  · Rangliste · Bald.
- **Neu: Tab „Sammlung“** statt der Tabs „Fähigkeiten“ und „Anpassen“ —
  alles auf einer Fläche, ohne extra Knopf. Oben die Vorschau, darunter die
  Regale zum Anpassen, darunter deine Sammlung: alle Fähigkeiten und
  Unglücke (wie bisher antippen für Erklärung und Anleitung) und alle
  Brettformen. Oben rechts steht, wie viel Prozent du schon gesammelt hast.
- **Die Vorschau zeigt jetzt dein echtes Brett** — dieselbe Spielart wie
  auf dem Start, in 2D oder 3D.
- **Neue Regale „Brett-Thema · 3D“ und „Figuren · 3D“:** Holz, Marmor,
  Nacht, Turnier bzw. Matt, Porzellan, Metall. Vorerst mit Schloss — sie
  werden später über die Orte im Turm freigeschaltet (das Schloss nennt
  den Ort). Frei sind die Farbwelt und die Emaille-Figuren.
- In den Einstellungen springt die Zeile **„Anpassen“** jetzt in die
  Sammlung.

## v0.144.1 — 26.09.2026

- **Neues App-Zeichen:** der weisse König vor einem leuchtenden weissen
  Streifen — gleiche Machart wie die Zeichen von Typoluck und Trainer
  (zusammen ergeben die Streifen am Handy ein Plus). Vorerst eine
  vorläufige Fassung; die endgültige in voller Schärfe folgt. Auch im
  Browser-Tab steht jetzt das neue Zeichen statt des alten Springers.
- **Eine Aussehen-Wahl aus Typoluck geht nicht mehr verloren.** Hast du in
  Typoluck umgestellt und Blunderluck hat kurz danach etwas an deinem Konto
  gespeichert (etwa eine Freundschaft), konnte es die ältere Wahl
  zurückschreiben. Jetzt gilt beim Aussehen immer die neuere.

## v0.144.0 — 26.09.2026

**Ein Aussehen für alle UPCrew-Spiele, eigene Schrift, eigene Knöpfe und
der neue Tab „Anpassen“** (UPCrew-Angleichung, Runde 3).

- **Neu: Tab „Anpassen“ ganz rechts** (statt „Bald“). Oben eine Vorschau,
  die jede Wahl sofort zeigt — umschaltbar zwischen Blunderluck und
  Typoluck, mit Zufalls-Würfel. Darunter die Regale Brett, Farbwelt,
  Schrift, Knöpfe, Darstellung und drei Sets zum Merken von
  Lieblings-Kombinationen. „Übernehmen“ gilt sofort in der ganzen App.
- **Ein Aussehen für beide Spiele:** Hell/Dunkel, Farbwelt, Schrift und
  Knöpfe stellst du einmal ein — Typoluck zieht mit. Angemeldet (nicht als
  Gast) kommt die Wahl auch auf deine anderen Geräte.
- **Eigene Schrift:** sechs Crew-Schriften zur Wahl, auch offline. In den
  Einstellungen neu: **„Standard-Schrift“** — dann gilt immer die gut
  lesbare Grundschrift, egal was gewählt ist. Und eine Zeile
  **„Anpassen“**, die direkt in den neuen Tab springt.
- **Eigene Knöpfe:** alle Knöpfe der App gehören jetzt zu einer von sechs
  Knopf-Familien (Stufe, Kissen, Taste, Stempel, Kapsel, Ecke). Karten,
  Brettfelder und Auswahl-Reihen bleiben, wie sie sind.
- **Freischalten:** Vorerst ist nur der Standard frei (Werkstatt, Crew 1,
  Stufe); alles andere zeigt die Vorschau mit Schloss. Die Stufen kommen
  mit dem Herausforderungs-Pfad.
- **Das 3D-Brett ist jetzt eine Wahl:** Ab Werk spielst du auf dem flachen
  2D-Brett; 3D stellst du im Tab „Anpassen“ (Regal „Brett“) oder mit dem
  kleinen „3D“ am Brett ein. Später wird 3D ab Arena 2 freigeschaltet —
  bis die Arena-Leiter da ist, ist es für alle frei.

## v0.143.1 — 26.09.2026

- **In der laufenden Partie ist die Tab-Leiste wieder weg** — dort zählt nur
  das Brett, und ein versehentlicher Tipp unten verlässt die Partie nicht
  mehr. Vor dem Anpfiff und nach dem Ende steht die Leiste wie überall.
- **Das Brett steht mittig** — beim Spielen (flach und in 3D) und in der
  Schlussstellung. Bisher zählten die Zahlen am linken Rand mit, das Brett
  sass deshalb etwas rechts; am Handy stand das Schlussbrett ganz links.

## v0.143.0 — 26.09.2026

**Die Einstellungen wie in Typoluck** (UPCrew-Angleichung, Runde 2,
dritter Teil).

- **Drei Karten statt fünf:** „Dieses Gerät“, „UPCrew-Konto · alle
  Spiele“ und „Über Blunderluck“.
- **Dieses Gerät:** je Zeile ein Symbol mit Namen und daneben der
  Umschalter — Darstellung Auto / Hell / Dunkel, Vibration An / Aus.
- **UPCrew-Konto:** wer angemeldet ist, darunter alle Konto-Knöpfe
  untereinander (Profil, Verwaltung, Abmelden, UPCrew-Konto löschen).
- **Keine i-Erklärungen mehr** — Stichworte und Knöpfe sagen, was sie tun.
- **Über Blunderluck:** Ein Spiel von UPCrew, Version, Verbindung (der
  farbige Punkt), dazu „Wunsch“.
- **Kurzmeldungen** („Anfrage gesendet“, „Passwort geändert“ …) erscheinen
  jetzt oben statt unten.

## v0.142.0 — 26.09.2026

**Die Tab-Leiste wie in Typoluck** (UPCrew-Angleichung, Runde 2, zweiter
Teil).

- **Fünf Plätze unten, Start in der Mitte:** Aufgaben · Fähigkeiten ·
  Start · Rangliste · Bald. Jeder mit Symbol über dem Wort; der aktive
  leuchtet in Orange und trägt oben einen kurzen Strich.
- **Neu: „Aufgaben“** — dahinter kommen später die Herausforderungen durch
  beide Spiele. Bis dahin steht dort, dass sie bald kommen. „Bald“ ganz
  rechts hält einen Platz frei (ausgegraut).
- **Die Leiste bleibt immer stehen** — auch in der Partie, in den
  Einstellungen, im Profil und in den übrigen Fenstern, und am Rechner
  jetzt ebenfalls unten statt oben.
- **Zurück ist ein Pfeil** oben links in der Kopfzeile, statt des Worts
  „Zurück“.

## v0.141.0 — 26.09.2026

**Hell, Dunkel oder Auto — und die Werkstatt-Farben** (UPCrew-Angleichung,
Runde 2, erster Teil).

- **Neu in den Einstellungen, Karte „Gerät“:** Darstellung Auto / Hell /
  Dunkel. Auto folgt dem Gerät wie bisher; Hell oder Dunkel gilt fest, nur
  auf diesem Gerät.
- **Die Werkstatt-Farben wie im Intro:** Hintergrund, Karten, Schrift und
  Hauptknöpfe tragen jetzt die Farbwelt „Werkstatt“ (Orange auf warmem Grau
  bzw. Beige) — dieselbe wie Typoluck. Das Brett ist Beige/Braun statt
  Blau/Weiss, im 2D- wie im 3D-Brett (Thema „Blunderluck“; Holz, Turnier,
  Marmor und Nacht bleiben, wie sie sind).
- Rot, Grün und Gelb als Signal (Fehler, Gewinn, Warnung), die Farben der
  Fähigkeiten und das violette Anmelde-Fenster bleiben unverändert.
- Das Intro richtet sich nach deiner Wahl, nicht mehr nur nach dem Gerät.

## v0.140.3 — 25.09.2026

**Das neue UPCrew-Studio-Intro** — dasselbe wie in Typoluck.

- Beim Start kommt jetzt das neue Studio-Intro — bei **jedem** Start, nicht
  nur einmal je Besuch.
- Jeder Start zeigt die nächste von sechs Arten; der Zähler ist mit den
  anderen UPCrew-Spielen gemeinsam.
- Hell und dunkel: Das Intro folgt dem Gerät, wie die App selbst.
  Standardfarbe ist Werkstatt-Orange statt Violett.
- Antippen oder eine Taste überspringt es weiter sofort; die App lädt
  darunter.

## v0.140.2 — 25.09.2026

**Blunderluck sieht jetzt aus wie Typoluck: runde Formen, feste Kanten**
(UPCrew-Standard, zweiter Teil).

- **Drei Rundungen statt zwanzig:** Knöpfe, Karten, Menüs und Fenster sind
  gleich rund wie in Typoluck, kleine Felder und Marken etwas weniger,
  Pillen und Kreise ganz. Das Brett selbst bleibt, wie es ist.
- **Knöpfe zum Anfassen:** Jeder Knopf steht auf einer festen Kante und
  sinkt beim Drücken hinein. Karten, Menü, Kurzmeldungen und Fenster
  stehen ebenfalls auf einer Kante statt auf einem verschwommenen Schatten.
- Das Leuchten auf dem Brett (Schild, Falle, „du bist am Zug") bleibt —
  es ist ein Signal, kein Schatten.
- **Weniger Text:** Rund 180 Stellen, an denen die App einen ganzen Satz
  sagte, sind jetzt Stichworte — zum Beispiel „Code teilen · einladen",
  „Angemeldet · Anna", „Gegen Computer", „Schachmatt · Weiss gewinnt".
  Regeln erklären weiterhin in ganzen Sätzen: hinter den i-Knöpfen, in
  „Schach lernen", bei den Fähigkeiten und Abzeichen.
- Noch offen: die eigene runde Schrift (wählst du nach Bild, gemeinsam für
  alle UPCrew-Spiele).

## v0.140.1 — 25.09.2026

**Die App startet wieder.** Mit v0.140.0 blieb Blunderluck beim Öffnen
hängen: Oben stand nur „Da ist etwas schiefgegangen … Neu laden", und neu
laden half nicht. Die Startseite verwies auf eine Datei, die es nicht gab.
Behoben — und eine Prüfung wacht jetzt darüber, dass jede eingebundene
Datei auch wirklich da ist.

## v0.140.0 — 25.09.2026

**Blunderluck fühlt sich an wie ein UPCrew-Spiel: Vibration, klare Zustände,
weniger Text** (UPCrew-Standard, erster Teil).

- **Vibration:** Jeder Knopf gibt beim Drücken einen kurzen Stups, ein Sieg
  und ein Fehler fühlen sich verschieden an. Abschaltbar in den
  Einstellungen, neue Karte „Gerät". Auf dem iPhone vibrieren Web-Apps
  grundsätzlich nicht — dort bleibt es still.
- **Wenn etwas schiefgeht, gibt es „Nochmal":** Ein Zug, eine Fähigkeit,
  eine neue Runde oder das Löschen, das nicht beim Server ankam, lässt sich
  mit einem Druck wiederholen. Statt eines langen Satzes mit technischer
  Meldung stehen ein Zeichen und zwei Wörter da.
- **Leere Listen helfen weiter:** Keine Freunde, keine Partie, keine offene
  Runde — jeweils ein Zeichen, zwei Wörter und ein Knopf, der dorthin
  führt, wo es weitergeht („Suchen", „Spielen", „Selbst starten").
- **Laden sieht man:** Solange Rangliste oder vergangene Matches noch nicht
  da sind, stehen graue Platzhalter statt „noch niemand dabei". Nach zehn
  Sekunden ohne Antwort wird daraus „Keine Antwort" mit „Nochmal".
- **Keine Begrüßungen mehr:** Die Anmeldung beginnt mit „Blunderluck · Ein
  Konto · alle UPCrew-Spiele", nach dem Anmelden steht kurz „Angemeldet ·
  Name". Das Ende einer Partie sagt „Gewonnen" oder „Verloren" ohne
  Zusatzsatz.
- Noch nicht dabei (kommt, sobald Typoluck es festgelegt hat): die neue
  runde Schrift und die einheitlichen Rundungen.

## v0.139.0 — 25.09.2026

**UP#Plus ist nur noch der Rollen-Verteiler.**

- Das Konto UP#Plus steht in keiner Rangliste mehr und taucht in keiner
  Suche auf.
- UP#Plus hat keine Freunde: Niemand kann ihm eine Anfrage schicken, und es
  kann keine annehmen. Unter „Freunde" steht bei UP#Plus nur ein Hinweis.
- Im Profil eines anderen Spielers zeigt UP#Plus keinen Freundschafts-Knopf.

## v0.138.0 — 25.09.2026

**Ein UPCrew-Konto für alle Spiele — mit Nummer, Gast-Zugang und sicherem Passwort.**

- **Der UPCrew-Anfang:** Beim Öffnen erscheint kurz das UPCrew-Zeichen
  („präsentiert"), die Anmeldung hat denselben schlichten Look wie in
  Typoluck — beide Spiele beginnen gleich.
- **Alles bei UPCrew:** Konten, Partien und Rangliste liegen jetzt in der
  UPCrew-Datenbank. Dasselbe Konto gilt in Typoluck und allen weiteren
  Spielen.
- **Name mit Nummer:** Namen dürfen mehrfach vorkommen, jeder bekommt seine
  eigene Nummer, zum Beispiel **Jonas#0001**. Angemeldet wird mit
  Name#Nummer (oder nur dem Namen, wenn es ihn nur einmal gibt).
- **Saubere Namen:** nur Buchstaben und Ziffern, 3 bis 16 Zeichen. Symbole
  und Leerzeichen verschwinden beim Tippen sofort.
- **Umzug:** Alle alten Konten ziehen um. Beim ersten Start meldest du dich
  einmal mit deinem bisherigen Passwort an und legst ein neues fest. Partien,
  Freunde und Abzeichen ziehen mit, alte Konten bekommen #0001.
- **Sicheres Passwort:** 8 bis 12 Zeichen, mit Gross- und Kleinbuchstaben,
  Ziffer und Sonderzeichen. Das Passwort prüft jetzt Firebase (Google); in der
  Datenbank steht es nicht mehr. Keine E-Mail, kein Google-Konto.
  Passwort-Manager dürfen helfen.
- **Als Gast spielen:** ohne Konto, an dein Gerät gebunden. Hin und wieder
  fragt Blunderluck, ob du deinen Spielstand sichern willst. Beim Sichern
  wird aus dem Gast ein richtiges Konto, und alles bleibt.
- **Admins statt Verwaltungs-Passwort:** Die Verwaltung öffnet sich nur für
  Konten mit der Rolle Admin. Die Rolle vergibt das Studio-Konto UP#Plus,
  das selbst nicht spielt.
- **Passwort vergessen?** Ein Admin gibt dein Konto zum Neu-Verbinden frei.
  Du meldest dich mit Name#Nummer an, legst ein neues Passwort fest und
  behältst alles.
- **Konto löschen** fragt noch einmal nach dem Passwort und löscht das Konto
  in allen Spielen von UPCrew.

## v0.137.0 — 25.09.2026

**Sicherer im Browser.**

- Die Seite lädt und verbindet sich nur noch mit sich selbst und der
  Datenbank — fremde Skripte, eingeschleuster Code oder fremde Adressen
  werden vom Browser blockiert (Content-Security-Policy). Beim Spielen
  ändert sich nichts.

## v0.136.0 — 24.09.2026

**Fallen sieht man jetzt, der Händler funktioniert, und „Bereit" bleibt im Bild.**

- **Fallen als Szene:** Tritt eine Figur in eine Falle, springt die Box auf,
  die Unglücks-Karte steht gross und rot leuchtend über dem Brett — bei
  BEIDEN Spielern — und erst dann passiert die Folge: Figuren rutschen oder
  laufen über, die getroffenen Felder leuchten rot.
- **Keine erledigten Fallen mehr in der Hand.** Stattdessen steht die letzte
  Falle kurz als rotes Zeichen neben deinem Menü-Knopf — antippen zeigt die
  Szene noch einmal. Nur was gerade wirkt (Halluzination), bleibt als Karte.
- **Der Händler neu:** Statt eines gewürfelten Angebots, das oft nicht ging,
  zeigt er bis zu drei Tausche, die gerade gehen — als Figurenbilder. Eins
  antippen zeigt es auf dem Brett (was weggeht, wird blass mit rotem Ring,
  das Neue steht als Geist da), ✓ tauscht, ✕ lässt es.
- **Vorraum:** Der Knopf „Bereit" klebt am Handy unten im Bild, die
  Regel-Schildchen stehen in einer Zeile.
- **Vorbereitung für UPCrew:** Die Spielerliste verliert beim Speichern
  keine Angaben mehr, die sie nicht kennt (wichtig, sobald sich mehrere
  Spiele die Konten teilen).

## v0.135.0 — 24.09.2026

**Anleitungen als kleines 3D-Video — ohne Text.**

- **Die Anleitung spielt sich selbst vor:** dasselbe 3D-Brett wie im Spiel,
  ein 3D-Finger schwebt zur Karte, zum Feld und zu ✓ und tippt (kleine
  Welle), die Figuren hüpfen wirklich, Geschlagene vergehen, eine leuchtende
  Spur zeigt den Weg. Karte und ✓ liegen vor dem Brett — wie deine Leiste.
- **Kein Text mehr** unter dem Bild, nur Punkte für die Bilder. Tippen aufs
  Video hält an und lässt weiterlaufen.
- Wer lesen will: „Die ganze Beschreibung" steht weiter darunter; bei
  „weniger Bewegung" bleiben die Bilder nebeneinander mit Text.

## v0.134.0 — 24.09.2026

**Anleitungen: kaum noch Text, und sie zeigen die Bedienung von heute.**

- **Ein Stichwort statt ganzer Sätze:** Unter dem Bild steht nur noch
  „Karte antippen", „Feld antippen" oder „✓ einsetzen" — oft gar nichts.
  Punkte zeigen, bei welchem Bild man ist.
- **Wie im Spiel:** Unter dem Brett liegt die Karte mit ✓ daneben, der
  Finger tippt erst auf die Karte, dann (falls nötig) aufs Feld, dann auf ✓.
  Das alte Fenster mit „Einsetzen" kommt nicht mehr vor.
- Wer alles lesen will: „Die ganze Beschreibung" steht weiter darunter.

## v0.133.0 — 24.09.2026

**Das Brett wird nicht mehr mit jedem Zug langsamer.**

- **Behoben: Das Spiel wurde mit jeder Animation langsamer.** Jede Wirkung
  (Funken, Box öffnet, Landung) konnte die Bildschleife verdoppeln, und
  weil die Lootboxen immer schweben, hörte keine davon je auf. Mit vielen
  Boxen und vielen Zügen rechnete das Handy dasselbe Bild mehrfach. Jetzt
  gibt es immer genau eine.
- **Weniger Arbeit im Stillstand:** Schweben nur die Boxen, zeichnet das
  Brett halb so oft — man sieht keinen Unterschied, der Akku schon.
- **Schwache Handys:** Kommt das Gerät nicht mit, rechnet das Brett von
  selbst mit etwas weniger Bildpunkten.
- **Schneller da:** Das grosse Brett erscheint zuerst; Figurenbilder und
  kleine Bretter folgen danach.

## v0.132.0 — 24.09.2026

**Keine Figur steckt mehr in einer anderen — weder im Bild noch im Sprung.**

- **Kein Verdecken mehr:** Das Brett wird steiler von oben gezeigt, die
  Figuren sind etwas kleiner. Keine Figur schiebt sich mehr vor die auf dem
  Feld dahinter (nachgemessen für jedes Feld, schlimmster Fall König vor
  König).
- **Springer springen hoch genug:** Jeder Zug wird vorher durchgerechnet;
  steht etwas im Weg, springt die Figur darüber.
- **Schlagen ohne Hineinfahren:** Die geschlagene Figur hebt ab und
  zerfällt, bevor der Angreifer sie berührt — statt durch die Figuren
  dahinter zu schlittern.
- **Rochade und Platztausch:** Die zwei Figuren springen übereinander weg
  statt durcheinander.
- **Lootbox:** Wer sie einsammelt, fährt nicht mehr in sie hinein — sie
  steigt sofort nach oben.

## v0.131.0 — 24.09.2026

**Die Figuren sind wieder matt, und die kleinen Bretter sehen aus wie das grosse.**

- **Kein Glanz mehr:** Die Figuren haben wieder das matte Material der
  alten gerenderten Bilder — auf dem Brett, in den Anleitungen und überall,
  wo eine Figur als Bild steht.
- **Anleitungen und kleine Bretter** blicken jetzt im selben Winkel auf das
  Brett wie das Spiel, und die Figuren werden nicht mehr gestaucht.

## v0.130.0 — 24.09.2026

**Fähigkeiten einsetzen ohne Lesen: Karte antippen, Feld, fertig.**

- **Kein Fragefenster mehr vor dem Einsetzen.** Tippst du eine Karte mit
  Zielfeld an (Mauer, Frost, Nekromant …), zeigt das Brett sofort die
  möglichen Felder. Unten steht die Karte gross, daneben runde Knöpfe:
  **✓** Einsetzen, **✕** Abbrechen, **⟳** Drehen (Mauer, Platztausch,
  Nudelholz) und **?** für die Anleitung. Nochmal auf die Karte tippen
  bricht ab.
- **Karten ohne Zielfeld** (Doppelzug, Schub …): Der erste Tipp wählt sie,
  der zweite Tipp oder ✓ setzt sie ein — ein Tipp aus Versehen kostet
  nichts.
- **Was es kostet, steht als kleines Schild an der Karte:** „Zug bleibt",
  „kostet den Zug", „ist dein Zug".
- **Sprung und Teleport:** Die Leiste zeigt „Figur, dann Ziel" und ✕ zum
  Zurücknehmen.
- **Die Text-Karte unter dem Brett ist weg.** Gibt es gerade kein Feld,
  erscheint kurz „Gerade kein Feld frei" über der Leiste.
- Die Mauer bleibt nach dem Drehen auf ihrem Feld, wenn sie dort noch
  passt.

## v0.129.0 — 24.09.2026

**Schnelleres Tippen, festes Brett, eingravierte Karten.**

- **Das Brett reagiert sofort:** Ein Feld zählt, sobald dein Finger
  aufsetzt. Vorher wurde ein Tipp verworfen, wenn der Finger dabei ein
  kleines Stück rutschte — das Brett hielt ihn fürs Drehen.
- **Das Brett lässt sich nicht mehr drehen oder zoomen**, der Knopf „Blick
  zurücksetzen" ist weg.
- **Farben und Aussehen des Bretts stellt nur noch der Admin um:** In der
  Verwaltung gibt es dafür den Schalter „Brett-Anpassung". Alle anderen
  sehen das Standard-Aussehen.
- **Die Zeichen auf den Fähigkeitskarten sind eingraviert** — wie in eine
  Schablone geschnitten, statt erhaben. Bei Unglücken leuchten die
  Schnitte in der Stufenfarbe.

## v0.128.0 — 24.09.2026

**Die Karten-Leiste unten — wie in Kartenspielen.**

- **Deine Fähigkeiten stehen unten als grosse Karten**, vier nebeneinander
  über die ganze Breite. Hast du mehr, wischst du sie durch — oder ziehst
  am Balken darunter, der zeigt, welchen Teil deiner Hand du gerade siehst.
  Leere Plätze stehen als gestrichelte Umrisse da.
- **Dein eigener Namens-Kasten unten ist weg.** Oben steht nur noch der
  Gegner. Einstellungen und Zugverlauf liegen hinter dem runden Knopf
  links in der Leiste (deine Initiale, im Ring deiner Farbe).
- **Wer am Zug ist:** Bist du dran, leuchtet der Rand der Leiste.
- Oben entfällt der Totenkopf-Streifen — der Friedhof steht als
  Grabsteine vor dem Brett.

## v0.127.0 — 24.09.2026

**Fähigkeiten als 3D-Plättchen, die Lootbox springt auf, der Friedhof
wird zu Grabsteinen vor dem Brett.**

- **3D-Plättchen:** Jede Fähigkeit und jedes Unglück ist jetzt eine kleine
  Karte aus Emaille — in der Hand und in der Bibliothek. Fähigkeiten in
  ihrer Stufenfarbe mit hellem, erhabenem Zeichen, Unglücke dunkel mit
  leuchtendem Zeichen. Die Karten in der Hand liegen übereinander wie
  echte Plättchen; eine Karte, die du gerade nicht einsetzen darfst, ist
  matter.
- **Lootbox öffnen:** Sammelst du eine Box ein, springt sie hoch, ihre
  Wände fliegen auseinander, die Karte steigt heraus, dreht sich und
  fliegt zu deiner Hand (beim Gegner nach hinten).
- **Friedhof als Grabsteine:** Vor dem Brett steht für jede geschlagene
  Figur ein kleiner Grabstein, in den ihr Profil eingraviert ist. Weiss
  auf hellem, Schwarz auf dunklem Stein; links die des Gegners, rechts
  deine, die wertvollste jeweils aussen und auf einem grösseren Stein.
  Eine geschlagene Figur fliegt erst vom Brett, dann fällt ihr Stein auf
  die Ablage. Die aufklappbare Friedhof-Leiste gibt es im 3D-Brett nicht
  mehr — Totenkopf und Zahl bleiben. Das Brett bleibt so gross wie
  vorher.
- **Kein Aufblitzen mehr:** Beim Öffnen einer Partie ist bis zum 3D-Brett
  nicht mehr kurz das flache Brett zu sehen.

## v0.126.0 — 24.09.2026

**Turm und König nachgebessert: nur ein wenig runder.**

- **Turm:** wieder der gedrechselte Turm mit Zinnen — nur die Zinnen oben
  sind leicht gerundet. Nebenbei sind die dunklen Keile in den Zinnen weg,
  die beim Verkleinern der Form entstanden waren.
- **König:** wieder mit dem Kelch, der nach unten spitz zuläuft, und dem
  bisherigen Kreuz. Die runde Fassung von v0.125.0 ist zurückgenommen.

## v0.125.0 — 24.09.2026

**Runder Turm und runder König — und eine ruhigere Beschriftung.**

- **Turm:** vier Kugeln auf einem weichen, runden Kronenrand statt eckiger
  Zinnen — wie beim früheren Turm, aber auf dem gedrechselten Körper.
- **König:** runde Krone als Knospe mit dickem Rundwulst und Kuppel, das
  Kreuz aus runden Stäben mit Kugelenden auf einem Kugelknauf.
- **Beschriftung zurückhaltend:** kleiner, dicht am Brett, halb
  durchsichtig, ohne Leuchten und Schatten, nur noch ein ganz ruhiges
  Wiegen — und sie steht immer genau zu deinem Blickwinkel.

## v0.124.0 — 24.09.2026

**Nur noch die Felder — und die Beschriftung fliegt.**

- **Kein Rand mehr:** Das Brett hat weder Rahmen noch Sockel; die Steine
  stehen frei, auch auf den kleinen Bildern.
- **3D-Buchstaben und -Zahlen:** a–h und 1–8 (auf grossen Brettern mehr)
  schweben als echte 3D-Schrift links und unten neben dem Brett, heben und
  senken sich in einer Welle und drehen sich immer zu dir — auch wenn du
  das Brett drehst. Im dunklen Modus hell, im hellen Modus in der dunklen
  Brettfarbe.
- Das Brett füllt die Breite dadurch besser aus.

## v0.123.0 — 24.09.2026

**Auch die kleinen Bretter sind jetzt 3D — und die Fähigkeiten wirken
sichtbarer.**

- **Kleine Bretter in 3D:** Die Vorschau auf dem Start, die Brettform-Kacheln
  in „Neue Runde“, die Bildanleitungen der Fähigkeiten und Unglücke, „Schach
  lernen“ und die Rückschau zeigen dasselbe 3D-Brett wie das Spiel —
  schräg von oben, mit Mulden, gehobenen Steinen, Mauer, Reif, Schild und
  Kette. Hand und Pfeile der Anleitungen liegen genau auf ihrem Feld.
- **Figurenbilder aus denselben Formen:** Wo eine Figur als Bild steht (Hand,
  Beute-Bilanz, „Schach lernen“), rechnet die App sie jetzt selbst aus den
  3D-Formen — im Figurenstil, den du beim Brett gewählt hast.
- **Wirkungen mit Auftritt:** Die Mauer schichtet sich Stein für Stein auf,
  Reif wächst von der Mitte aus und lässt Eiszapfen schiessen, die
  Schild-Glocke senkt sich und blitzt auf, die Kette schnappt zu und rüttelt
  die Figur, beim Riss zerspringt der Stein. Teleport ist ein Wirbel statt
  eines Sprungs, Meuterei und Verstärkung verwandeln die Figur an Ort und
  Stelle (Drehung, Funken) statt sie verschwinden und neu erscheinen zu
  lassen.

## v0.122.0 — 24.09.2026

**Das Brett ist jetzt echtes 3D: dieselben Figuren wie in der 3D-Werkstatt,
Lootboxen als schwebende Würfel, Mulden statt Punkte — und man kann es
drehen und selbst gestalten.**

- **Echte 3D-Figuren.** Die sechs Figuren kommen als Formen aus der
  3D-Werkstatt (Design\Blunderluck-3D): gedrechselte Staunton-Figuren, der
  Springer als der neue, geglättete Pferdekopf auf der gemeinsamen Platte.
  Sie werfen Schatten und stehen auf dicken, abgerundeten Steinen.
- **Lootboxen schweben als echte Würfel** über ihrem Feld, drehen sich
  langsam, tragen die Stufenfarbe und das eingravierte Fragezeichen
  (umgedreht beim Unglück, bunt verlaufend, wenn die Seltenheit verborgen
  ist). Eingesammelt wirbeln sie hoch und zerplatzen in Funken ihrer Farbe.
- **Mulden statt Punkte.** Wohin eine Figur ziehen kann, sinkt eine runde
  Fassung in den Stein. Wo geschlagen würde, liegt ein roter Ring um die
  Fassung.
- **Ziehen mit Schwung.** Die Figur springt im Bogen (der Springer höher),
  landet mit einer kleinen Staubwolke; eine geschlagene Figur fliegt
  drehend vom Brett — ohne Blut. Umwandlung zeigt Funken bei der Landung.
- **Wirkungen in 3D:** Mauern aus Ziegeln, Reif mit Eiszapfen beim Frost,
  eine Glocke über der geschützten Figur, eine Kette um die gefesselte, eine
  Grube, wo der Boden aufgerissen ist; das Nudelholz rollt als Holzwalze
  über die Bahn, und jede Figur hüpft darüber. Fähigkeitsziele heben ihren
  Stein und tragen einen grünen Rand (statt aufgemalter Markierung).
- **Spur und Farben wie gewohnt:** letzter Zug grün, Schach orange, Matt rot
  (pulsierend), die gewählte Figur schwebt über gelbem Stein.
- **Drehen und neu einstellen.** Mit dem Finger lässt sich das Brett drehen
  und heranzoomen; der Pfeil-Knopf oben rechts setzt den Blick zurück. Der
  Farbpaletten-Knopf öffnet unten eine Leiste: Blick (Oben / Schräg / Tief),
  Brett (Blunderluck, Holz, Turnier, Marmor, Nacht), Figuren (Emaille,
  Porzellan, Matt, Metall), Steine (rund / kantig), Tempo (flott / normal),
  Schatten an/aus — alles wirkt sofort und bleibt auf dem Gerät gespeichert.
  Wer lieber flach spielt, schaltet dort aufs 2D-Brett zurück (ein Knopf
  „3D“ bringt es wieder).
- **Genauso schnell wie vorher.** Ein Tipp geht denselben Weg wie auf dem
  flachen Brett; das 3D-Brett kostet je Neuzeichnen unter einer
  Millisekunde. Ohne WebGL bleibt es automatisch beim flachen Brett.

## v0.121.0 — 24.09.2026

**Die Einstellungen für eine neue Runde sind neu: ein Bildschirm mit drei
Reitern, Bilder statt Schalter mit Text — und „Spielen“ direkt darunter.**

- **Ein Bildschirm statt zwei.** Die Vorschau auf dem Start und der Pfeil
  daneben führen jetzt beide auf denselben Bildschirm „Neue Runde“, nur in
  einen anderen Reiter: **Brett** (Form, Grösse, Figurenzahl, Aufstellung),
  **Gegner** (Menschen oder Computer, wie stark, wer die Runde sieht, wer
  Weiss spielt, Ziehen im Team) und **Lootboxen** (mit oder ohne, wie
  viele, welche Items, sieht man, was drin ist).
- **Bilder statt Schalter.** Jede Wahl ist eine Reihe mit Bildern: die
  3D-Figuren und Lootboxen aus dem Spiel oder ein schlichtes Zeichen
  (Roboter für den Computer, Globus für öffentlich, Schloss für privat,
  Würfel für Zufall …), darunter ein Wort. Die blaue Fläche gleitet zum
  gewählten Feld.
- **Weniger Text.** Je Frage ein i statt eines je Zeile; die Brett-Kacheln
  zeigen nur noch Bild, Namen, Masse und Figurenzahl — die Dauer steht
  oben im Kopf und rechnet beim Antippen einer Kachel mit.
- **„Spielen“ steht unten auf dem Bildschirm** und legt die Runde gleich an —
  kein Umweg mehr über den Start. Eine Brett-Kachel wählt nur aus und
  bleibt stehen (vorher sprang sie sofort zurück zum Start).
- Gegen den Computer entfällt die Frage „Wer sieht die Runde?“ — dort kommt
  ohnehin niemand dazu.

Gespeichert wird genau wie vorher; laufende und alte Runden merken nichts.

## v0.120.1 — 24.09.2026

**Die Einstellungen stehen im Menü jetzt ganz unten.**

- Im Menü hinter den drei Balken oben rechts ist die Reihenfolge jetzt
  Profil, Freunde, Verlauf, Schach lernen — und zuletzt Einstellungen,
  wie in den meisten Apps.

## v0.120.0 — 24.09.2026

**Dein Profil steht jetzt oben links auf der Startseite — mit Platz und
Punkten auf einen Blick.**

- **Oben links auf dem Start** sitzt ein kompaktes Spielerfeld: ganz links
  gross der Kreis mit deinem Anfangsbuchstaben, daneben dein Name und
  darunter „Platz 1“ und „522 Punkte“. Ein Tipp darauf öffnet dein
  Profil, „Zurück“ führt wieder zum Start. Das Menü oben rechts bleibt,
  wo es war.
- **Die Zeile unter dem Bilanz-Balken erklärt sich jetzt selbst:** statt
  „Form“ steht dort „Letzte 5“, und statt „12 S · 1 R · 1 N“ ausgeschrieben
  „12 Siege · 1 Remis · 1 Niederlage“. Die Kästchen behalten ihren
  Buchstaben (S = Sieg, R = Remis, N = Niederlage); mit der Maus darauf
  steht das ganze Wort da.

## v0.119.1 — 24.09.2026

**Das Profil ist aufgeräumt: alles Wichtige auf einer Karte, der Rest in
drei Reitern und Popups — statt fast drei Bildschirmhöhen untereinander.**

- **Oben eine Kopfkarte** wie in Spiele-Apps: Kreis mit deinem
  Anfangsbuchstaben, Name, Platz und Punkte; darunter in einer Zeile
  Partien, Siege, Quote und aktuelle Serie; ein farbiger Bilanz-Balken
  (Siege grün, Remis grau, Niederlagen rot) mit deiner **Form** — die
  letzten fünf Ergebnisse als Kästchen; und die drei Abzeichen-Plätze.
  Beim eigenen Profil führt ein Tipp auf einen Platz direkt zu „Abzeichen
  wählen".
- **Drei Reiter darunter**, immer nur einer offen: **Statistik** (eine
  schlanke Liste statt elf Kacheln), **Abzeichen** (ein Raster, vier je
  Zeile; antippen zeigt, wie man es bekommt) und **Partien** (je Partie
  eine Zeile; antippen zeigt Dauer, Züge, Beute und Mitspieler). Lange
  Partienlisten zeigen erst die jüngsten acht.
- **Name ändern, Passwort ändern und Abzeichen wählen** liegen jetzt
  gesammelt hinter „Bearbeiten" oben rechts.

Gerechnet wird genau wie vorher — nur die Anordnung ist neu.

## v0.119.0 — 18.09.2026

**Die Profilseite: Visitenkarte, Abzeichen, Statistik — und jeder Name in
der App führt hin. Freunde anfragen geht direkt vom Profil.**

- „Profil" im Menüband (und in den Einstellungen) öffnet kein Popup mehr,
  sondern eine ganze Seite: oben die **Visitenkarte** mit Name, Punkten,
  Platz in der Rangliste, „dabei seit" und drei Abzeichen-Plätzen; darunter
  die **Statistik** (Partien, Siege, Siegquote, Remis, längste Serie, Siege
  in Folge, schnellster Sieg, längste Partie, Züge gesamt, Zeit am Brett,
  Beute-Punkte, Lieblings-Brett, häufigster Gegner); dann alle
  **Abzeichen** mit dem Satz, wie man sie bekommt; und wie bisher die
  Partien, aus denen die Punkte kommen.
- **14 Abzeichen** gibt es zu verdienen — Erster Sieg, Veteran, Beidhändig,
  Serienheld, Comeback, Blitzmatt, Marathon, Nachteule, Sammler,
  Allrounder, Hunderter, Unaufhaltsam, Dauerbrenner, Legende. Sie werden
  aus deinen beendeten Partien gerechnet; drei davon wählst du für deine
  Visitenkarte („Abzeichen wählen").
- **Auf jeden Namen tippen:** im Vorraum, im Abschluss, auf den
  Partie-Karten, in der Freundesliste, bei den offenen Runden und in der
  Rangliste — überall öffnet der Name das Profil. „Zurück" führt dorthin,
  wo du herkamst.
- **Freundschaft vom Profil aus:** „Freund anfragen", und die andere Seite
  sieht die Anfrage unter Freunde und auf deinem Profil („Annehmen"/
  „Ablehnen"). Sobald sie annimmt, seid ihr Freunde — und seht
  gegenseitig eure „Freunde"-Runden.
- Name und Passwort änderst du jetzt auf deiner Visitenkarte.

## v0.118.0 — 18.09.2026

**Wer sieht deine Runde? Öffentlich, nur Freunde oder privat — und unter
„Runde beitreten" stehen jetzt die offenen Runden, die du sehen darfst.**

- In den Grundeinstellungen gibt es eine neue Karte „Wer sieht die Runde?"
  mit drei Stufen: **Öffentlich** (Vorgabe) — jeder sieht sie unter „Runde
  beitreten"; **Freunde** — nur deine Freunde sehen sie dort; **Privat** —
  niemand, hinein kommt nur, wer den Code hat. Den Code gibt es in jeder
  Stufe weiterhin.
- Unter „Runde beitreten" steht eine neue Karte „Offene Runden": alle
  wartenden Runden, die für dich sichtbar sind — wer schon darin sitzt,
  welche Spielart, ein Schildchen „Freund" oder „Öffentlich", und
  „Beitreten". Du siehst also, wenn ein Freund gerade eine Runde offen
  hat, und bist mit einem Tipp drin.
- Der Vorraum zeigt die Stufe als Schildchen bei den Regeln.
- Runden von vor dieser Version gelten als privat — genau so, wie sie
  bisher waren: nur per Code erreichbar.

## v0.117.0 — 18.09.2026

**Einladen per Link: Wer ihn antippt, landet direkt in deiner Runde.**

- „Teilen" und „Kopieren" im Vorraum geben jetzt einen Link mit, an dem
  der Code schon hängt (`…/Blunderluck/?code=ABCDEF`). Per WhatsApp,
  Nachricht oder Mail verschickt, öffnet er die App und führt nach der
  Anmeldung ohne Umweg in die Runde — kein Abtippen mehr.
- Der Code steht weiterhin auch als Wort im Text, für alle, die die App
  schon offen haben.
- Wer noch kein Konto hat, legt es wie gewohnt an und ist danach trotzdem
  in der Runde. Ist der Code inzwischen ungültig (Runde vorbei), kommt der
  bekannte Hinweis „Kein Treffer".

## v0.116.0 — 18.09.2026

**Die Grundeinstellungen sagen oben, wie lange die Runde etwa dauert — und
die Zeile bleibt beim Scrollen stehen.**

- Der Kopf der Grundeinstellungen (Zurück, Titel) klebt jetzt oben und
  rollt mit. Darunter steht „Dauer: etwa 26 Minuten" — die Schätzung für
  genau die Einstellungen, die du gerade siehst. Jeder Knopfdruck zieht die
  Zahl sofort mit: mehr Figuren, ein grösseres Brett, mehr Lootboxen.
- Die Schätzung gab es seit v0.93 nur unter den Spielart-Kacheln; sie ist
  dieselbe Rechnung: die erwartete Zahl der Züge für Brett und Figuren, mal
  die Zeit je Zug, die die App in deinen bisherigen Partien wirklich
  gemessen hat. Je mehr du spielst, desto mehr zählt die Messung und desto
  weniger der Richtwert — die Zahl gleicht sich an.
- Darunter steht, worauf sie fusst: „geschätzt aus 12 gespielten Partien"
  — oder „Richtwert — noch keine gespielte Partie gemessen".
- Das i im Kopf erklärt die Rechnung in zwei Sätzen.
- **Dabei behoben:** Die Schätzung hatte seit v0.93 in Wahrheit nie aus
  gespielten Partien gelernt — der Bildschirm reichte dem Modell immer eine
  leere Liste, weil er die Partien in einer anderen Form erwartete, als sie
  gespeichert sind. Deshalb stand unter den Spielart-Kacheln stets der
  Richtwert (20 Sekunden je Zug). Jetzt fliessen deine beendeten Partien
  wirklich ein — auf der Kachel wie in der neuen Zeile.

## v0.115.3 — 18.09.2026

**Ein Haken statt zwei: „Seltenheit anzeigen" — mit einer Vorschau, die
durch alle Würfelfarben läuft.**

- Unter „Lootboxen" gab es zwei Haken, „Seltenheit anzeigen" und
  „Unglücks-Lootboxen anzeigen", beide unabhängig schaltbar. Das Bild des
  zweiten war die graue Box mit Fragezeichen — und die sah aus wie die
  verborgene Box, also wie das „Nein" zum ersten Haken. Zwei Bilder, die wie
  Ja und Nein aussehen und trotzdem beide an sein können, waren ein Rätsel.
- Jetzt gibt es einen Haken „Seltenheit anzeigen". An heisst: Jede Lootbox
  trägt auf dem Brett die Farbe ihrer Stufe, und eine schlechte ihr
  Fragezeichen. Aus heisst: Alle sehen gleich aus.
- Das Bild neben dem Haken zeigt, was du bekommst: Ist er an, wechselt die
  Box im Takt durch Grün, Blau, Lila, Gelb und eine Unglücks-Box. Ist er
  aus, steht die graue Box da.
- Laufende und alte Partien ändern sich nicht — gespeichert wird weiterhin
  beides, nur eingestellt wird es zusammen.

## v0.115.2 — 18.09.2026

**Enttarnen und Verstecken sind in der Item-Auswahl EIN Eintrag.**

- Im Fenster „Welche Items kommen vor?" standen Enttarnen und Verstecken
  als zwei Kästchen. Dabei gibt es je Partie nur eins von beiden: Ist der
  Haken „Seltenheit anzeigen" aus, gibt es Enttarnen; ist er an, gibt es
  Verstecken. Zwei Kästchen taten so, als könne man beides wählen.
- Jetzt gibt es einen Eintrag „Enttarnen / Verstecken", der beide zusammen
  an- und abhakt; welches von beiden in der Partie auftaucht, entscheidet
  weiterhin der Haken. Der Knopf zählt entsprechend „von 19" statt
  „von 20".
- Eine gespeicherte Auswahl von früher, in der nur eins von beiden stand,
  gilt als angehakt und wird beim nächsten Tipp vervollständigt.

## v0.115.1 — 18.09.2026

**„Wie viele Figuren je Seite?" zeigt jetzt die Zahl — und ein Muster, das
man auf dem Handy erkennt.**

- Die vier Knöpfe unter der Frage trugen bisher je ein komplettes
  Mini-Schachbrett. Auf dem Handy war jeder Knopf rund 75 Pixel breit, ein
  Feld also 9 Pixel und eine Figur 6: Das Brett wurde zu einem Strichcode,
  die Figuren zu Flecken, und ob 16 oder 24 Figuren aufgestellt sind, sah
  man nicht — alle vier sahen gleich aus.
- Jetzt steht auf jedem Knopf groß die **Zahl** (8, 16, 24, 30 Figuren je
  Seite), darunter die eigene Bretthälfte als flaches Muster aus belegten
  und freien Feldern — ein Block, zwei Reihen, drei Reihen, fast alles.
  Das Wort (wenig, normal, viel, voll) bleibt klein darunter.
- Zahl und Muster werden aus derselben Aufstellung gerechnet, die die
  Partie hinterher wirklich anlegt — es kann also nichts Falsches
  versprechen.

## v0.115.0 — 18.09.2026

**Der Vorraum: ein Bildschirm vor dem Match statt zwei — und du siehst,
worauf du wartest.**

- **Ein Vorraum für alle Runden.** Seitenwahl und Aufstellung sind zu EINEM
  Bildschirm geworden, der immer gleich aufgebaut ist: oben ein Satz, der
  sagt, was gerade passiert („Warte auf einen Mitspieler …", „fr3ddy ist da
  — bereit?", „Warte auf fr3ddy …"), darunter die Einladung, die zwei
  Plätze Weiss und Schwarz, das Brett so, wie es beim Anpfiff steht, die
  Regeln dieser Runde als Schildchen, und unten genau ein Knopf.
- **Einladen ist jetzt die Hauptsache, solange jemand fehlt:** Der Code
  steht gross in der Mitte, daneben **Teilen** (öffnet das Teilen-Menü des
  Handys — WhatsApp, Nachrichten), **Kopieren** und **Freund einladen**.
  Vorher war der Code ein unauffälliger Text oben rechts.
- **Beide drücken „Bereit"** — auch ohne Zufallsarmee. Bis jetzt startete
  die Partie ohne Zufallsarmee in der Sekunde, in der der Zweite beitrat;
  wer eingeladen war, stand ohne einen Blick auf die Regeln vor dem Brett.
  Jetzt sieht jeder vorher, was gespielt wird, und drückt dann „Bereit".
  Das ist ein Tipp mehr als bisher — dafür fühlt sich jede Runde gleich an.
  Gegen den Computer gilt dasselbe: Seite antippen, „Bereit", los.
- **Niemand da? Gegen den Computer spielen.** Wer allein wartet, hat unten
  einen Ausweg: Die wartende Runde wird durch eine Computer-Runde mit
  denselben Reglern ersetzt.
- **Die Plätze sagen „frei"**, wenn dort niemand sitzt, und tragen bei
  zugeloster Seite keine Köpfe mehr, die wie Knöpfe aussehen und keine
  sind. Das grüne „bereit" meint jetzt das „Bereit" des Vorraums.
- Grundlage: der Testlauf und der Entwurf vom 18.09.2026
  (`docs\entwurf-vorraum.md`), Ist-Bilder in `docs\bilder\`.

## v0.114.3 — 18.09.2026

**Schneller und sparsamer: Die App holt und schreibt nur noch, was gerade
gebraucht wird — nicht mehr den ganzen Spielstand.**

- Bis jetzt lud jeder Zug den kompletten Spielstand aller Partien (rund
  190 KB) vom Server und schrieb ihn komplett zurück — auch die 34 längst
  beendeten Partien reisten jedes Mal mit. Ein „Bereit" kostete mit
  Nachkontrolle rund 800 KB. Und der Stand wächst mit jeder gespielten
  Partie, es wurde also von selbst immer langsamer.
- Jetzt holt ein Zug nur die eigene Partie (rund 8 KB) und schreibt nur sie
  zurück. Zieht jemand in einer ANDEREN Partie, kostet dich das 150 Byte
  statt 190 KB. Beendete Partien anderer Leute werden gar nicht mehr
  geladen; deine eigenen beendeten Partien (Verlauf, Ergebnis ansehen)
  einmal — danach hat sie dein Gerät im Speicher. Der Verlauf zeigt die
  letzten 60 deiner beendeten Partien.
- Beim Start lädt die App statt 190 KB nur noch eine kleine Übersicht (5 KB)
  plus die offenen Partien und das, was ihr auf diesem Gerät noch fehlt.
- Am Spiel selbst ändert sich nichts, an den gespeicherten Partien auch
  nicht — es kommt lediglich ein kleiner Übersichts-Eintrag je Partie in
  die Datenbank. Für den Altbestand ist er schon angelegt.
- Nach der Anmeldung und nach dem Verlassen einer Partie holt die App
  einmal nach, was sie zwischendurch nicht mitverfolgt hat — du siehst also
  weiterhin alles, nur ohne den Ballast.
- **Beim ersten Öffnen nach dem Update** kann es einen Moment länger dauern:
  Die App merkt sich deine beendeten Partien einmalig. Danach ist jeder
  weitere Start kleiner als früher.

## v0.114.2 — 18.09.2026

**Behoben: Mehrmals auf „Spielen" gedrückt — und die App stand still.**

- Jeder Druck auf „Spielen" holte den ganzen Spielstand vom Server, legte
  eine Runde hinein und schrieb alles zurück — rund 190 KB je Richtung
  (Korrektur vom 18.09., nachmittags: zuerst stand hier 600 KB — das war
  die eingerückte Sicherungsdatei, nicht die Leitung).
  Weil sich dabei ein paar Sekunden lang nichts rührte, drückte man noch
  einmal, und noch einmal: Fünf Drücke waren fünf Ladevorgänge und fünf
  Schreibvorgänge gleichzeitig, das Brett wurde fünfmal aufgebaut, und am
  Ende lagen zwei Runden desselben Spielers auf dem Server.
- Jetzt nimmt „Spielen" nur EINEN Druck an: Der Knopf ist sofort gesperrt
  und sagt **„Wird angelegt …"**, bis die Runde steht. Weitere Drücke
  verpuffen.
- **Eine eigene wartende Runde wird nicht mehr verdoppelt.** Wer eine Runde
  anlegte, „Zurück" drückte und später wieder „Spielen", bekam bisher eine
  zweite Runde — die alte blieb für immer liegen (so lagen am 18.09. zwei
  Runden vom 14.09. und 17.09. in der Datenbank). Jetzt gilt: Sitzt in der
  alten Runde nur man selbst, wird sie durch die neue ersetzt; wartet dort
  schon jemand, geht es in DIESE Runde statt in eine neue.
- Die zwei liegengebliebenen Runden räumen sich damit beim nächsten
  „Spielen" von selbst auf.

## v0.114.1 — 15.09.2026

**Behoben: Zu zweit begann die Partie nicht, obwohl beide „Bereit" gedrückt
hatten.**

- Betroffen war jede Runde unter Menschen mit dem Haken „Seite zulosen" — und
  der ist ab Werk gesetzt. Wer die Runde anlegte, sass zwar sofort in Weiss,
  galt aber nie als bereit; und weil mit zugeloster Seite kein Bildschirm zum
  Antippen der eigenen Seite kommt, konnte er das auch nicht nachholen. Der
  Mitspieler wurde zugelost und war bereit, beide drückten „Bereit" auf dem
  Aufstellungs-Bildschirm — und es passierte nichts.
- Jetzt wird auch der Anleger **zugelost** wie jeder andere: Er bekommt seine
  Seite beim Anlegen (mit zwei leeren Seiten entscheidet der Zufall, nicht
  mehr immer Weiss) und gilt damit sofort als bereit. Sobald der zweite
  Spieler da ist, geht es los — ohne Zufallsarmee sofort, mit Zufallsarmee
  nach dem „Bereit" beider Seiten.
- Ohne den Haken ändert sich nichts: Wer anlegt, kommt nach Weiss und tippt
  seine Seite an, wie bisher.
- Eine Runde, die vor dieser Version hängen geblieben ist, startet auch jetzt
  nicht von selbst — beide verlassen sie über „Zurück" und legen eine neue an.

## v0.114.0 — 01.09.2026

**„Schach lernen": Die Figuren stehen nur noch einmal da — mit ihrem Wert
und ihrer Gangart.**

- Bisher kamen dieselben sechs Figuren zweimal untereinander vor: oben „Die
  Figuren und wie sie ziehen", darunter noch einmal „Was ist wie viel wert?".
  Jetzt ist es **eine Liste**: Bild, Name und Zahl in einer Zeile, und wer sie
  antippt, sieht die Gangart der Figur wie bisher.
- **Der König hat jetzt einen Wert: 15.** Vorher stand dort ein Strich, weil
  er nie geschlagen wird — das beantwortete die Frage nicht, die man an so
  eine Liste stellt. 15 ist mehr als Dame plus Läufer und sagt damit dasselbe
  wie „unersetzlich", nur in der Sprache der Liste.
- **An den Punkteständen ändert sich dadurch nichts.** Die 15 ist eine reine
  Anzeige; Material-Bilanz, Beute und der Computer-Gegner rechnen unverändert
  weiter.
- Die Liste steht vom Wertvollsten zum Kleinsten — mit der 15 stimmt diese
  Reihenfolge jetzt durchgehend, der König steht oben, weil er oben hingehört.

## v0.113.0 — 01.09.2026

**Die Seitenwahl vor dem Spiel steht jetzt in zwei Spalten.**

- **Links Weiss, rechts Schwarz** — jede Seite mit ihrem Knopf oben und
  darunter einer grossen Liste, in der steht, wer schon auf dieser Seite
  mitspielt. Die Liste bleibt leer, bis sich jemand einträgt.
- **„Zufall" steht allein über den beiden Spalten**, über die volle Breite:
  Er gehört zu keiner der beiden Seiten, sondern entscheidet gerade, welche
  es wird.
  Seine weiss-schwarze Teilung läuft dabei fast senkrecht statt diagonal —
  über die volle Breite gezogen hätte die alte Diagonale nur noch eine
  kleine Ecke abgeschnitten, und der Knopf wäre weiss mit einem schwarzen
  Zipfel gewesen. Im Browser nachgesehen.
- **Schwarze Knöpfe haben im dunklen Modus jetzt eine sichtbare Kante.**
  Vorher lag die schwarze Fläche auf fast ebenso dunklem Grund — die rechte
  Hälfte des Zufall-Knopfes verschwand im Hintergrund, und der Knopf schien
  in der Mitte zu enden. Gilt überall, wo ein schwarzer Knopf steht; im
  hellen Modus ändert sich nichts.
- **Der Raum-Code steht oben rechts neben dem Zurück-Knopf** — dieselbe Ecke
  wie in der laufenden Partie. Er bleibt gross genug zum Vorlesen und öffnet
  weiterhin mit einem Tipp das Fenster „Freunde einladen".
- Die zwei Spielerzeilen über der Wahl entfallen hier. Was sie sagten — wer
  auf welcher Seite sitzt —, sagt jetzt die Liste der jeweiligen Spalte. Am
  Brett und auf dem Aufstellungs-Bildschirm bleiben sie unverändert.
- Wer schon eine Seite hat oder schon zugesagt hat, sieht die andere Spalte
  weiterhin, dann ohne Knopf und nur mit ihrem Namen — sonst wüsste man
  nicht mehr, welche Spalte welche ist.

## v0.112.0 — 31.08.2026

**„noch keine" steht nicht mehr am Brett.**

- Wer noch keine Fähigkeiten gesammelt hat, sieht an der Stelle jetzt
  einfach nichts — vorher stand dort „noch keine", und zwar bei jeder
  Partie am Anfang, also genau dann, wenn man aufs Brett schaut.


## v0.111.0 — 30.08.2026

**Die App verbraucht jetzt einen Bruchteil an Datenvolumen — und du merkst
sonst nichts davon.**

- Bisher hat jedes offene Gerät alle drei Sekunden den kompletten Spielstand
  geholt: **190 Kilobyte, rund 233 Megabyte pro Stunde** — auch dann, wenn
  überhaupt niemand gezogen hatte. Jetzt fragt die App zuerst nur nach, ob
  sich etwas geändert hat (**13 Bytes**), und holt den vollen Stand nur,
  wenn wirklich jemand gezogen hat.
- **Für dich ändert sich nichts am Spiel.** Ein fremder Zug kommt weiterhin
  in derselben Abfrage an, nur eine Zehntelsekunde später — der Rückweg für
  die Nachfrage. Auf mobilen Daten dafür deutlich sparsamer.
- Wenn die Nachfrage aus irgendeinem Grund nicht klappt (schlechte
  Verbindung, Zeitüberschreitung), holt die App den vollen Stand wie vorher.
  Sie spart nur, wenn sie sich sicher ist.


## v0.110.0 — 28.08.2026

**Die Lootbox-Schalter zeigen ihre Lootbox.**

- Beim Anlegen einer Runde steht vor „Lootboxen", „Seltenheit anzeigen"
  und „Unglücks-Lootboxen anzeigen" jetzt genau die Box, die der Schalter
  bewirkt: die verborgene, die farbige und die mit dem umgedrehten
  Fragezeichen. Es ist dasselbe Bild, das auch auf dem Brett liegt.
- Die übrigen Schalter bekommen bewusst kein Zeichen. Für „Unterschiedliche
  Armeen" oder „Wer zuerst zieht" müsste man eines erfinden, und ein
  erfundenes Bild neben einem klaren Wort ist ein Rätsel, keine Hilfe. Ihre
  Titel stehen trotzdem in derselben Flucht.


## v0.109.0 — 28.08.2026

**Bilder statt Wörter: Die Figurenzahl zeigt jetzt vier Mini-Bretter, und
in „Schach lernen" steht jede Figur vor ihrem Namen.**

- **Beim Anlegen einer Runde** siehst du bei „Wie viele Figuren je Seite?"
  vier kleine Bretter statt der Wörter wenig, normal, viel und voll. Jedes
  zeigt genau die Aufstellung, die dabei herauskommt — gerechnet mit
  denselben Regeln, die die Partie hinterher aufstellt, also nie gemalt und
  nie veraltet. Das Wort steht klein darunter.
- **In „Schach lernen"** trägt jedes der sechs Figuren-Kapitel sein
  Figurenbild vor dem Namen — dasselbe Bild wie auf dem Brett. Vorher war
  die Liste eine reine Wortliste.


## v0.108.0 — 28.08.2026

**Weniger Text: Die Erklärungen stehen jetzt hinter dem i, nicht mehr
mitten auf dem Bildschirm.**

- **Einstellungen:** Statt sieben Erklärabsätzen steht je Karte eine Zeile
  und rechts oben ein i. Alle vier Karten passen jetzt ohne Scrollen auf
  ein Handy-Bild (vorher 104 Wörter, jetzt 22). Die beiden Knöpfe
  „Abmelden" und „Konto löschen" stehen nebeneinander; der Unterschied
  zwischen ihnen steht vollständig hinter dem i.
- **Schach lernen:** Die Einleitung und die vier Gruppen-Einleitungen sind
  hinter i gewandert — die Kapitel selbst beginnen sofort (vorher 260
  Wörter, jetzt 145).
- **Rangliste:** Der Absatz unter der Tabelle ist weg. Er verwies auf das
  i, das direkt darüber sitzt.

*Verloren geht nichts: Jeder Text steht weiterhin da, wo man ihn sucht —
hinter dem i der jeweiligen Karte. Nur zwei Sätze sind ganz entfallen,
weil sie einen sichtbaren Knopf beschrieben haben.*


## v0.107.0 — 28.08.2026

**Die Fähigkeiten sind jetzt überall Spielkarten — und Glück und Unglück
stehen nicht mehr durcheinander.**

- Im Tab „Fähigkeiten" stehen **vier Karten je Reihe** statt sechs oder
  sieben, und jede hat das Format einer echten Spielkarte (dasselbe
  Verhältnis wie die Karten in der Hand während der Partie). Die Karte ist
  damit rund doppelt so gross wie die alte quadratische Kachel, das
  Zeichen darauf entsprechend grösser.
- **Oben ein Umschalter zwischen „Fähigkeiten" und „Unglücke".** Bis
  jetzt lagen beide gemischt im selben Raster und waren nur am
  gestrichelten Rahmen zu unterscheiden. Der Umschalter sieht aus und
  bedient sich wie die Knopfreihen beim Anlegen einer Runde.
- Am Laptop bleiben die Karten so gross wie am Handy und stehen mittig —
  vier Spalten auf voller Bildschirmbreite wären Plakate geworden.

*In der laufenden Partie war das Kartenformat schon da (seit v0.81.0) —
dort ändert sich nichts.*


## v0.106.0 — 27.08.2026

**Blunderluck läuft jetzt auch ohne Netz — und lässt sich als App
installieren.**

- Beim ersten Besuch legt die Seite sich selbst auf dem Gerät ab (Brett,
  Figuren, Lootbox-Bilder, alles). Danach startet sie auch ohne
  Verbindung. Was zwingend frisch sein muss — die gemeinsame Partie —
  wird weiterhin immer aus der Datenbank geholt, nie aus dem Speicher.
- **Auf dem Handy bietet der Browser jetzt an, die Seite zum
  Startbildschirm hinzuzufügen** — sie verhält sich dann wie eine
  installierte App.
- Eine neue Fassung kommt weiterhin sofort an: Beim Ausliefern zieht der
  Speichername mit der Versionsnummer mit, und ein Test wacht darüber,
  dass das nie vergessen wird.

## v0.105.0 — 27.08.2026

**Wenn etwas schiefgeht, siehst du das jetzt — statt einer weissen Seite.**

- Bisher konnte ein Programmfehler die Seite leer lassen: kein Hinweis,
  keine Erklärung, kein Weg, es zu melden. Jetzt erscheint oben ein
  ruhiger Streifen mit einem verständlichen Satz und drei Knöpfen: **Neu
  laden**, **Fehler melden** und **Schliessen**.
- **„Fehler melden" nimmt die technische Meldung mit** — sie steht im
  Formular schon drin, du musst nichts abtippen.
- Der Streifen erscheint höchstens einmal; passiert mehr, zählt er still
  mit („und 3 weitere Fehler"). Weggeklickt bleibt er weg, und das Spiel
  läuft normal weiter.

## v0.104.0 — 27.08.2026

**Hinter dem Code-Knopf: Freunde suchen und die letzten drei Mitspieler.**

- Das Fenster, das sich beim Tippen auf den Beitritts-Code öffnet, hat
  jetzt ein **Suchfeld** — tippst du einen Namen an, bleibt nur übrig, wer
  dazu passt. Bei leerer Suche ist alles wie vorher.
- **Ganz oben stehen die letzten drei Personen, mit denen du gespielt
  hast**, gekennzeichnet mit „Zuletzt gespielt" — jeweils mit
  Einladen-Knopf. Sie werden aus deinen beendeten Partien errechnet, es
  wird nichts zusätzlich gespeichert.
- Wer schon mitspielt oder schon eingeladen ist, taucht wie bisher nicht
  auf. Auch weiter gilt: Einladen setzt eine Freundschaft voraus — wer
  noch kein Freund ist, kommt über den Code herein, der gross im selben
  Fenster steht.

## v0.103.0 — 27.08.2026

**Oben rechts steht jetzt ein Menüband statt drei Icons.**

- Statt Uhr, Freunde-Zeichen und Zahnrad nebeneinander gibt es einen Knopf
  mit drei Balken. Dahinter liegen fünf Punkte, jeder mit Zeichen und
  Beschriftung: **Profil**, **Einstellungen**, **Freunde**, **Verlauf**
  und **Schach lernen**.
- **Profil ist ein eigener Punkt geworden** — bisher war es nur über die
  Einstellungen erreichbar. Dort bleibt es zusätzlich stehen.
- **„Schach lernen" ist umgezogen:** Es stand beim Beitreten einer Runde
  und wohnt jetzt im Menüband, wo man es sucht. Der Lern-Bildschirm
  selbst ist unverändert.
- Das Menü schliesst sich, sobald du woanders hintippst — wie das
  Spieler-Menü im Match seit v0.96.0.

## v0.102.0 — 27.08.2026

**Das Einstellungs-Symbol ist jetzt ein Zahnrad — vorher war es eine
Sonne.**

- Das alte Zeichen war ein dünner Ring mit acht abstehenden runden
  Strichen. Genau so zeichnet man eine Sonne: Die Striche standen neben
  dem Ring statt an ihm, die Fläche war leer, und das Loch fehlte.
- Das neue Zeichen ist eine gefüllte Scheibe mit acht Zähnen, die am
  Körper sitzen und gerade Flanken haben, plus dem ausgestanzten Loch in
  der Mitte. Es erscheint überall dort, wo bisher das alte stand — auf
  dem Startbildschirm und am Spieler-Kasten im Match.

## v0.101.0 — 27.08.2026

**Alle 22 Item-Anleitungen sagen jetzt, was du wirklich anklicken musst.**

- Die Bildanleitungen der Fähigkeiten waren teils hinter der Bedienung
  zurück: Sie verschwiegen das Einsetzen-Fenster, den „Einsetzen"-Knopf
  unter dem Brett und dass sich der grüne Ziel-Rahmen seit v0.84.0 auch
  mit dem Finger ziehen lässt.
- Die gröbsten Richtigstellungen: Händler und Dieb behaupteten „wirkt
  sofort" — tatsächlich öffnen beide ein Fenster, das du erst annehmen
  musst. Sprung und Teleport verschwiegen, dass die Fähigkeit dein Zug
  IST (nach dem Einsetzen musst du Figur und Ziel antippen). Mauer,
  Platztausch und Nudelholz nennen jetzt ihre Zusatz-Knöpfe (Lage,
  Richtung, Drehen), der Bauernschub die Figuren-Wahl bei der Umwandlung.
- An den Regeln und der Bedienung selbst ändert sich nichts — nur die
  Anleitungen sagen jetzt die Wahrheit.

## v0.100.0 — 27.08.2026

**Die Spieler-Verwaltung ist ein eigener Bildschirm mit Tabelle.**

- Bisher hingen alle Mitspieler untereinander in den Einstellungen. Jetzt
  öffnet der Knopf „Verwaltung" (nach der gewohnten Passwort-Abfrage)
  einen eigenen Bildschirm mit einer Tabelle: eine Zeile je Spieler mit
  Name, Kennung, ob ein Passwort gesetzt ist und der Freunde-Anzahl —
  dazu je Zeile der Entfernen-Knopf mit der gewohnten
  „Wirklich?"-Absicherung.
- Auf schmalen Bildschirmen lässt sich die Tabelle seitlich rollen.
  „Verwaltung beenden" wohnt jetzt ebenfalls auf diesem Bildschirm.
- Am Passwort und an der Absicherung ändert sich nichts.

## v0.99.0 — 27.08.2026

**Die Halluzinations-Karte zählt ihre Restzeit jetzt selbst herunter.**

- Auf der Unglücks-Karte in deiner Hand läuft jetzt eine kleine Zahl mit:
  wie viele Halbzüge der Effekt noch wirkt. Bisher stand diese Angabe nur
  im Hinweis-Chip der Leiste — der bleibt zusätzlich bestehen.
- Läuft die Zeit ab, verschwindet die Karte wie bisher von selbst; die
  Zahl und das Verschwinden rechnen jetzt über dieselbe Uhr im Modell,
  sie können also nie auseinanderlaufen.
- Die Effekte auf dem Brett (Mauer, Leihgabe, Fessel und Co.) zeigen ihre
  abzählende Zahl schon lange direkt am Feld — daran ändert sich nichts.
  Dauerhafte Unglücke bekommen keine Zahl.

## v0.98.0 — 27.08.2026

**Bei Schachmatt wird das Königsfeld rot.**

- Steht ein König im Schach, ist sein Feld seit v0.97.0 orange — ist es
  Schachmatt, wird es jetzt rot. Das Rot bleibt auch auf dem End-Brett
  nach der Partie stehen und erscheint im kleinen „So stand es am
  Ende"-Brett der Auswertung.
- Rot gibt es nur beim echten Matt: Endet eine Partie, weil kein König
  mehr da ist (Doppelbrett, Zufallsarmee-Leben), färbt sich nichts —
  dort gab es keinen bedrohten König.

## v0.97.0 — 27.08.2026

**Steht ein König im Schach, leuchtet sein Feld orange.**

- Das Feld unter einem bedrohten König färbt sich orange — bei jedem
  König, egal welcher Seite. So siehst du auf einen Blick, wer gerade in
  Gefahr ist. Beim Antippen des Königs gewinnt weiterhin die
  Auswahl-Markierung.
- Der fette „Schach"-Schriftzug im Spieler-Kasten unten ist dafür raus —
  er hat dieselbe Information schlechter transportiert.
- Bei Doppelbrett und Zufallsarmee-Leben zählt der König wie bisher als
  gewöhnliche Figur — dort gibt es regelkonform kein Schach und darum
  auch keine Färbung.

## v0.96.0 — 27.08.2026

**Das aufgeklappte Spieler-Menü schliesst sich von selbst.**

- Tippst du im Match auf deinen Namens-Kasten, klappen die Knöpfe
  (Einstellungen, Zugverlauf) auf. Bisher blieben sie offen stehen, bis
  man den Kasten erneut antippte. Jetzt schliessen sie sich auch, wenn du
  einfach woanders hintippst — aufs Brett, ins Leere, egal wohin.
- Ein Tipp auf einen der Knöpfe selbst funktioniert unverändert.

## v0.95.0 — 27.08.2026

**Schneller ins Spiel: weniger Bildschirme vor dem Match, und der Code ist
überall ein Knopf zum Freunde-Einladen.**

- **Eine Seite antippen genügt.** Auf der Seitenwahl war das Antippen der
  Seite bisher nur der erste Schritt, danach kam noch ein eigener
  „Bereit"-Knopf. Jetzt ist das Antippen zugleich die Zusage — ein
  Bildschirm, ein Tipp.
- **Ohne Zufallsarmee startet das Spiel direkt**, sobald beide Seiten
  gewählt haben. Den Zwischen-Bildschirm mit dem Brett und dem zweiten
  „Bereit" gibt es nur noch MIT Zufallsarmee — dort hat er einen Zweck
  (Armee ansehen, neu würfeln). Bei der festen Aufstellung gibt es nichts
  zu entscheiden, also auch nichts zu bestätigen.
- **Der Beitritts-Code ist jetzt überall ein Knopf** — auf der Seitenwahl,
  auf dem Aufstellungs-Bildschirm und oben rechts im laufenden Match.
  Antippen öffnet ein Fenster mit dem Code in gross und deiner
  Freundesliste zum direkten Einladen, ohne das Match zu verlassen.

## v0.94.0 — 27.08.2026

**Nachgebessert: Auch exakt gleichzeitige Bereit-Klicks starten das Spiel
jetzt zuverlässig.**

- **Was noch offen war:** Seit v0.89.1 trägt jeder Bereit-Klick seine
  Zusage in den frisch geholten Stand ein. Ein winziges Fenster blieb:
  Holten BEIDE Geräte den Stand, bevor der jeweils andere geschrieben
  hatte, löschten sie sich weiterhin gegenseitig die Zusage — „manchmal
  geht es noch nicht" (gemeldet 27.08.2026).
- **Jetzt:** Nach jedem Bereit-artigen Klick sieht die App zweimal kurz
  nach (sofort und nach zwei Sekunden), ob die eigene Zusage noch da ist
  und ob inzwischen die der Gegenseite dazukam. Fehlt etwas, trägt sie es
  einmal nach — kamen so beide Zusagen zusammen, startet das Spiel von
  selbst. Das gilt auch für Beitreten, Einladen und Verlassen.
- Eine Nachkontrolle macht nie eine neuere eigene Aktion rückgängig: Wer
  „Doch nicht bereit" drückt, bleibt es.

## v0.93.0 — 27.08.2026

**Innerer Umbau, Teil 2: Auch die grosse Stil-Datei ist aufgeteilt — die
App sieht exakt gleich aus.**

- `css\stil.css` (198 KB) ist jetzt fünf Dateien: Grundlagen (`stil.css`),
  Brett (`stil-brett.css`), Effekte (`stil-effekte.css`), Auswertung
  (`stil-auswertung.css`) und Start/Dialoge (`stil-start.css`).
- Geschnitten wurde nur an Abschnittsgrenzen, keine Regel wurde
  umsortiert — die Verkettung der fünf Teile ist Byte für Byte dieselbe
  Datei wie vorher (per Prüfsumme belegt). Die Ladereihenfolge in
  `index.html` ist fest und darf nicht geändert werden.
- Zweiter Schritt des Datei-Umbaus aus ROADMAP-Gruppe J (Punkt 33).

## v0.92.0 — 27.08.2026

**Innerer Umbau: Die grösste Code-Datei ist in zwei Hälften geteilt — am
Spiel ändert sich nichts.**

- Die Spielregeln-Datei (`schach-runde.js`, 237 KB) war die grösste des
  Projekts und wurde bei jeder Pflege teurer. Sie ist jetzt entlang ihrer
  natürlichen Naht geteilt: Rundenverwaltung (Anlegen, Teams, Ziehen,
  Abstimmung) bleibt, alles zu Fähigkeiten, Lootboxen und dem Händler
  wohnt neu in `schach-runde-faehigkeiten.js` (109 KB).
- Es ist ein reiner Umzug: Beide Hälften zusammen sind Byte für Byte
  derselbe Code wie vorher, alle Prüfungen laufen unverändert grün.
  Erster Schritt des Datei-Umbaus aus ROADMAP-Gruppe J (Punkt 32).

## v0.91.0 — 27.08.2026

**Ein neues Konto ist sofort gesichert — auch wenn du die Seite gleich
wieder schliesst.**

- **Was dahintersteckt:** Die App sammelt Änderungen kurz (eine halbe
  Sekunde), bevor sie speichert — das schont die Verbindung. Für ein
  frisch angelegtes Konto war diese halbe Sekunde aber ein Risiko: Wer
  die Seite im selben Augenblick schloss, verlor das Konto.
- **Jetzt:** Ein neues Konto wird ohne Wartezeit gespeichert. Zusätzlich
  speichert die App alles noch Offene, sobald die Seite in den Hintergrund
  geht oder geschlossen wird — auf dem Handy also auch dann, wenn du nur
  kurz in eine andere App wechselst.

## v0.90.0 — 27.08.2026

**Robuster vor dem Spielstart: Gleichzeitige Klicks löschen einander nichts
mehr weg.**

- **Was dahintersteckt:** Der Bereit-Fehler aus v0.89.1 hatte Verwandte.
  Auch Beitreten, Einladen, das Zulosen der Seite, „Neu würfeln" und die
  Revanche schrieben bisher den Stand, den das eigene Gerät gerade kannte —
  klickten zwei Leute kurz nacheinander, konnte der zweite Klick die
  Änderung des ersten überschreiben (etwa eine eben gegebene
  Bereit-Zusage oder einen Beitritt).
- **Jetzt:** Alle diese Aktionen holen zuerst den aktuellen Stand und
  tragen ihre Änderung dort ein — wie seit v0.89.1 schon die beiden
  Bereit-Knöpfe. Was andere in der Zwischenzeit gemacht haben, bleibt
  stehen.
- Für dich ändert sich an der Bedienung nichts; es gehen nur keine
  Aktionen mehr verloren, wenn mehrere Leute gleichzeitig klicken.

## v0.89.1 — 27.08.2026

**Behoben: Das Spiel startete nicht, obwohl beide Seiten bereit gedrückt
hatten.**

- **Was passiert ist:** Drückten beide Seiten kurz nacheinander auf
  „Bereit", löschte die zweite Zusage die erste wieder aus. Das Gerät des
  zweiten Spielers wusste in dem Moment noch nichts von der Zusage der
  Gegenseite und schrieb seinen — veralteten — Stand darüber. Beide sassen
  dann vor einem Spiel, das nie anfing; wer erneut drückte, löschte damit
  oft wieder die Zusage des anderen.
- **Jetzt:** Beim Bereit-Drücken holt die App zuerst den aktuellen Stand
  und trägt die eigene Zusage DORT ein. Die Zusage der Gegenseite bleibt
  stehen, und sobald die letzte fehlende dazukommt, startet das Spiel —
  egal, in welcher Reihenfolge und wie schnell hintereinander gedrückt
  wird. Das gilt für beide Bereit-Knöpfe: den bei der Seitenwahl und den
  vor dem Brett.

## v0.89.0 — 27.08.2026

**Behoben: Man kam nach dem Schliessen nicht mehr in sein Konto.**

- **Was passiert ist:** Hakt beim Öffnen der Seite die Verbindung auch nur
  kurz, war die Spielerliste noch leer — und die App fragte trotzdem schon
  nach dem Konto. Weil in einer leeren Liste niemand steht, erschien das
  Anmeldebild, als gäbe es das Konto nicht. Kam die Liste Sekunden später
  doch noch an, blieb das Bild trotzdem stehen. Wer dann „Neues Konto"
  drückte, bekam ein zweites — sein altes lag unberührt in der Datenbank,
  nur nicht mehr auffindbar.
- **Jetzt:** Die App fragt erst nach dem Konto, wenn die Liste wirklich da
  ist. Und falls das Anmeldebild doch einmal erscheint, verschwindet es von
  selbst wieder, sobald die Liste nachkommt — man ist dann ohne Zutun in
  seinem Konto.
- **Dein altes Konto ist nicht verloren.** Wer bereits versehentlich ein
  zweites angelegt hat, kommt über „Vorhandenes Konto" mit Name und
  Passwort wieder an das alte heran.

## v0.88.0 — 27.08.2026

**Das Brett hat jetzt eine feste Grösse und einen festen Platz.**

- **Es springt nicht mehr.** Bisher bekam das Brett den Platz, der nach
  allen Nachbarn übrig blieb — jede Marke, jede Meldung, jede Karte, die
  kam oder ging, veränderte damit seine Grösse. Jetzt wird die Grösse
  einmal bestimmt und nur noch dann neu gerechnet, wenn du das Gerät
  drehst, das Fenster änderst oder eine andere Partie öffnest.
- **Und es bleibt, wo es ist:** Was während des Spiels unter dem Brett
  erscheint (die Platzier-Leiste, das laufende Zugmuster), wächst nach
  unten, statt das Brett nach oben zu schieben.
- **Der Grund für die Umstellung:** Bisher wurde jeder einzelne Störer
  gesucht und abgestellt — fünf waren es seit v0.52.0. Die Reihenfolge ist
  jetzt umgedreht: Erst steht das Brett, dann ordnet sich alles andere
  darunter. Wird es doch einmal zu eng, lässt sich der Spielbereich
  rollen.

## v0.87.0 — 27.08.2026

**Die Figuren in den Bildanleitungen haben jetzt die richtige Grösse.**

- In den kleinen Brettern hinter jeder Fähigkeit waren die Figuren **zu
  gross für ihre Felder** — am Rechner rund ein Viertel, auf schmalen
  Bildschirmen bis zur Hälfte. Jetzt füllen sie ihr Feld genau so wie am
  echten Brett.
- **Der Grund:** Die Anleitung rechnete ihre Figuren gegen eine
  angenommene Brettbreite, statt gegen die, die sie im Fenster wirklich
  bekommt. Deshalb wuchs der Fehler mit, je schmaler der Bildschirm war.
- **Nebenbei behoben:** Im schmalen Fenster wurden die Figuren der obersten
  Reihe oben angeschnitten — der reservierte Platz war zu knapp berechnet.

## v0.86.0 — 27.08.2026

**Der Fähigkeiten-Tab zeigt nur noch die Zeichen — alles Textliche liegt
hinter dem i.**

- **Die beiden Erklär-Absätze über dem Raster sind weg**, ebenso die Karte
  „Die Zeichen am Vorrat" und die Stufen-Skala darunter. Übrig bleibt das
  Raster selbst: jede Kachel öffnet wie bisher Beschreibung und abgespielte
  Anleitung.
- **Ein i oben rechts** zeigt auf Wunsch alles Weggeräumte — wie die
  Lootboxen wirken, was Pluszeichen und Blitz bedeuten, und welche Farbe
  welche Seltenheitsstufe ist.
- **Gilt auch für die Bibliothek im Spiel** (das i in der Fussleiste einer
  Partie): Sie zeigt denselben Inhalt und ist damit genauso aufgeräumt.

## v0.85.0 — 27.08.2026

**Die Item-Karten stehen wieder vollständig da.**

- Seit v0.81.0 verschwand das untere Viertel der eigenen und der
  gegnerischen Kartenreihe absichtlich im Bildschirmrand. **Auf Ansage
  zurückgenommen** — die Karten sind wieder ganz zu sehen.
- **Platz kostet das nichts:** Die Verschiebung war reine Darstellung, die
  Zeile war schon vorher so hoch wie Namens-Kasten und Pfeil-Streifen
  zusammen. Das Brett bleibt also genauso gross wie bisher.

## v0.84.0 — 27.08.2026

**Den Wirkungs-Bereich kannst du jetzt frei über das Brett ziehen.**

- **Mauer, Frost, Friedhof und die anderen Gebiets-Fähigkeiten:** Fass den
  grünen Rahmen an und zieh ihn mit dem Finger (oder der Maus) dorthin, wo
  er hin soll. Er wandert mit, solange er auf ein erlaubtes Feld passt — über
  einem verbotenen bleibt er einfach stehen, statt zu verschwinden.
- **Passieren tut dabei nichts.** Wie bisher wirkt die Fähigkeit erst mit
  „Einsetzen"; „Abbrechen" legt sie zurück in den Vorrat. Auch ein Ziehen,
  das wieder auf dem Ausgangsfeld endet, setzt nichts ein.
- **Antippen geht weiter genau wie vorher** — das Ziehen kommt dazu, es
  ersetzt nichts. Wer lieber tippt, merkt von der Änderung nichts.
- **Am Handy schiebt der Finger dabei den Rahmen, nicht die Seite.** Solange
  platziert wird, rollt das Brett nicht mit; danach wieder wie gewohnt.

## v0.83.2 — 27.08.2026

**Nachzügler zu v0.83.1: dieselbe Reihenfolge auch im Spielart-Vorschaubild.**

- Das kleine Vorschaubild einer Spielart legte seine angedeuteten Lootboxen
  noch vor die Figuren. **Heute ohne sichtbare Wirkung** — dort treffen die
  beiden nie aufeinander —, aber die Regel gilt jetzt an allen drei Stellen
  gleich, statt an einer zu fehlen.

## v0.83.1 — 27.08.2026

**Zwei Anzeigefehler am Brett behoben.**

- **Ein weggebrochenes Feld ist jetzt wirklich ein Loch.** Unter dem Riss
  blieb der erhabene untere Rand der Kachel stehen — die Fläche war weg, der
  Sockel nicht. Jetzt verschwindet beides.
- **Die Lootbox liegt hinter der Figur, nicht davor.** Steht eine Figur auf
  einem Feld mit Lootbox — das passiert, wenn sie dorthin geschoben oder
  gestellt wurde und dabei nichts einsammelt —, war die Box vor ihr zu
  sehen. Jetzt liegt sie darunter, wo sie hingehört.

## v0.83.0 — 26.08.2026

**Die Team-Abstimmung läuft jetzt über das Brett: Alle machen denselben Zug,
dann zieht er — die Abstimmungs-Karte mit ihren Knöpfen ist weg.**

- **Zustimmen heisst: denselben Zug selbst machen.** Wer im Einigkeits-Modus
  zieht, schlägt damit vor; die Mitspieler sehen die Figur durchsichtig auf
  ihrem Ziel (wie die Grab-Schemen des Nekromanten) und den Laufweg grün.
  Machen alle aus dem Team denselben Zug, wird er ausgeführt. Wer etwas
  anderes will, macht einfach seinen eigenen Zug — weiter geht es erst, wenn
  alle dasselbe tun.
- **Fähigkeiten genauso:** Wer eine einsetzen will, wählt sie samt Ziel; die
  Karte trägt für das ganze Team eine blaue Marke, das Zielfeld ist grün
  umrandet. Eingesetzt wird erst, wenn alle dieselbe Fähigkeit mit demselben
  Ziel gewählt haben.
- **Der Gegner sieht von alledem nichts** — keine Schemen, keine Wege, keine
  Marken.
- **Die Frist bleibt als Rückfall:** Wer gar nicht mitzieht, wird nach zehn
  Sekunden übergangen (bei wiederholtem Fernbleiben schneller, wie bisher).
  Uneinigkeit unter Anwesenden entscheidet die Uhr dagegen nie — da hilft
  nur Einigwerden.
- **Das Brett springt dabei nicht mehr:** Die alte Abstimmungs-Karte (206
  Pixel hoch) erschien mitten im Spielfeld-Bereich und drückte das Brett auf
  die Mindestbreite — ausgelöst vom Mitspieler, nicht von einem selbst (Fund
  der Mess-Runde vom 26.08.). Sie ist ersatzlos weg.

## v0.82.0 — 26.08.2026

**Ein Unglück liegt jetzt als Karte in der Hand — der rote Streifen über dem
Brett ist weg.**

- **Wer eine Unglücks-Lootbox abbekommt, trägt sie ab sofort als Karte** in
  seiner Kartenreihe, als eigener Stapel hinter den Fähigkeiten: gestrichelt
  gerahmt, auf rotem Grund, mit dem Zeichen des Unglücks. Antippen zeigt
  Beschreibung und Bildanleitung — genau wie in der Bibliothek.
- **Dauerhafte Unglücke (Stolperstein, Spalt, Meuterei, Erdrutsch) bleiben
  die ganze Partie in der Hand** — man sieht jederzeit, was einen schon
  getroffen hat, auch beim Gegner. **Die Halluzination verschwindet von
  selbst**, sobald ihre vier Halbzüge um sind.
- **Der rote Melde-Streifen zwischen Leiste und Brett ist weg.** Er drückte
  das Brett bei jedem Unglück um rund 50 Pixel zusammen und sprang mit dem
  nächsten Zug wieder zurück (Fund der Mess-Runde vom 26.08.). Jetzt bleibt
  das Brett ruhig — die Karte übernimmt die Ansage.

## v0.81.0 — 26.08.2026

**Feinschliff der Eck-Kästen nach der ersten Nutzer-Runde: offener
Friedhof, Menü im Kasten, grössere Karten.**

- **Der Friedhof ist jetzt standardmässig aufgeklappt**, sobald die erste
  Figur fällt — ein flacher Streifen ohne Text: ganz links der
  Material-Stand als Zahl (**+2 grün** = vorn, **-2 rot** = hinten),
  rechts die gefallenen Figuren, **gruppiert mit „2x" unter der Figur**
  und von rechts nach links gelesen (die wertvollste ganz rechts).
  Solange niemand gefallen ist, gibt es nichts aufzuklappen — der Pfeil
  ist dann kein Knopf.
- **Die Menü-Knöpfe erscheinen IM Team-Kasten:** Ein Tipp auf den eigenen
  Kasten blendet Zahnrad und Zugverlaufs-Zeichen dort ein, wo bisher
  „am Zug" stand — keine eigene Zeile mehr darunter.
- **„am Zug" steht nirgends mehr als Wort** — die blaue Färbung des
  Kastens sagt allein, wer dran ist.
- **Die Marke „Wird gesendet …" ist weg** („nimmt zu viel Platz") — die
  Leiste ist dadurch 5 Pixel flacher. Damit kein anderer Hinweis-Chip die
  Leiste wieder wachsen lässt, sind alle Chips jetzt so flach wie die
  Textzeile daneben.
- **Die Item-Karten sind so hoch wie Kasten + Pfeil-Streifen zusammen**
  (am Handy 69 × 98 statt 37 × 52, weiterhin Pokerkarten-Form, das
  Zeichen wächst mit) — und **das untere Viertel der eigenen Karten
  verschwindet im Bildschirmrand**, so bleibt trotz der Grösse Platz.

## v0.80.0 — 26.08.2026

**Die neue Knopf-Anordnung im Match (dritte Skizze): Jede Seite hat jetzt
einen Eck-Kasten mit Pfeil — die schmalen Knopfspalten am Rand sind weg.**

- **Unter bzw. über dem Team-Namen sitzt ein breiter Pfeil-Streifen** mit
  Totenkopf und der Zahl der Gefallenen. Ein Tipp klappt den Friedhof
  direkt am Brett auf (Figuren + Material-Stand), ein zweiter Tipp
  schliesst ihn — kein Fenster mehr.
- **Der eigene Team-Kasten ist jetzt selbst ein Knopf:** Dahinter liegen
  „Einstellungen" und „Zugverlauf" (und „Team", sobald mehrere auf der
  Seite spielen). Beim Gegner öffnet der Kasten wie bisher die Team-Liste.
- **Das Brett ist dadurch spürbar grösser** — am Handy rund 40 Pixel
  breiter, weil die Randspalten ihre Höhe zurückgeben.
- Die Karten sind weiterhin genau so hoch wie der Team-Kasten, und der
  Streifen ist genau so breit wie er — beides im Browser nachgemessen.

## v0.79.2 — 26.08.2026

**Drei Anzeigefehler im Match behoben, gefunden bei einer gezielten
Mess-Runde im Browser.**

- **Die Zeichen in den Knöpfen neben dem Brett (Zahnrad, Zugverlauf,
  Friedhof) sitzen jetzt mittig.** Bisher klebten sie am linken Rand des
  Knopfes — rechts blieben 13 Pixel Luft, links einer. Das war seit dem
  Umbau zur Knopfspalte so und fiel nie einem Test auf, weil die Testkette
  nicht zeichnet.
- **Der Team-Kasten wird nicht mehr zusammengedrückt, wenn viele Karten
  gesammelt sind.** Bisher quetschte ein voller Kartenstreifen den Kasten
  unter seine Inhaltsbreite: Der Name ragte über den Rand hinaus, und am
  Rechner erschien darunter eine Bildlaufleiste, die dem Brett 10 Pixel
  Höhe nahm. Jetzt weicht der Kartenstreifen (er kann rollen), der Kasten
  behält seine Breite.
- **Die Karten schrumpfen am Rechner nicht mehr, sobald die Sammlung
  breiter wird als der Streifen.** Der Rollbalken des Streifens nahm seine
  rund 10 Pixel von den Karten selbst — sie waren dann niedriger als die
  Team-Karte daneben. Der Balken ist jetzt unsichtbar; gerollt wird
  weiter mit Finger, Rad oder Tastatur.

## v0.79.1 — 26.08.2026

**Das Brett hängt nicht mehr: Es springt beim eigenen Zug nicht mehr kurz
hoch und wieder zurück.**

- Sobald man gezogen hatte, erschien oben in der Leiste kurz die Marke
  „Wird gesendet …" — und verschwand wieder, sobald der Server geantwortet
  hatte. Diese Marke ist ein paar Pixel höher als der übrige Inhalt der
  Leiste, und weil das Brett immer genau den Platz bekommt, der übrig
  bleibt, wurde es dabei jedes Mal kurz kleiner und gleich wieder grösser.
  Von aussen sah das aus, als hänge das Brett.
- **Jetzt bleibt der Platz der Marke immer frei** — sie wird nur unsichtbar,
  statt zu verschwinden. Die Leiste ist damit immer gleich hoch, und das
  Brett behält seine Grösse, egal was gerade unterwegs ist.
- Das Brett ist dadurch dauerhaft rund fünf Pixel kleiner als vorher im
  Ruhezustand. Das ist der Preis dafür, dass es sich nie wieder bewegt.

## v0.79.0 — 26.08.2026

**Die Vormarkierung beim Einsetzen einer Fähigkeit ist jetzt ein grüner
Rand — die grüne Fläche ist weg.**

- Bisher lag über den betroffenen Feldern ein grünes Rechteck, das Kacheln
  und Figuren verdeckte. Auf einem Brett, das wie gebaute 3D-Platten
  aussieht, wirkte das wie aufgeklebt.
- Jetzt sieht man **den Umriss** — man erkennt weiterhin genau, welche Felder
  die Wirkung trifft, aber man sieht auch, was darauf steht.
- **Eine schwache Resttönung gibt es bewusst nicht.** Sie wäre beides halb:
  Sie stört den Stil und hilft dem Auge kaum.

## v0.78.0 — 26.08.2026

**Der Wunsch-Knopf steht jetzt auch in den Einstellungen der laufenden
Partie — man muss das Match nicht mehr verlassen.**

- Bisher hing er nur unter dem Zahnrad auf dem Startbildschirm. Wem mitten im
  Spiel etwas auffiel, der musste die Partie verlassen, um es zu melden — und
  bis dahin hatte man es oft vergessen.
- Ein Tipp öffnet wie gewohnt das Schreibfeld **über** der Partie; das Spiel
  bleibt stehen.
- Der Knopf auf dem Startbildschirm bleibt, wo er ist.

## v0.77.0 — 26.08.2026

**Bob der Bot lässt sich etwas mehr Zeit.**

- Sein Zug erscheint jetzt nach **einer Sekunde** statt nach 0,7 — man sieht
  besser, was er getan hat.
- Es ist eine Mindestpause, keine Obergrenze: Rechnet er auf der höchsten
  Stufe länger, dauert es weiterhin länger.
- **Auf dem Rechner ist die Pause der bestimmende Wert** (gemessen: der
  schlechteste Zug rechnet 0,5 Sekunden), sein Zug kommt also verlässlich
  nach einer Sekunde. **Am Handy könnte das Rechnen der Pause davonlaufen** —
  das ist die Messung, die noch aussteht.

## v0.76.0 — 26.08.2026

**Der Computer heisst jetzt „Bob der Bot".**

- Der Name steht an der Team-Karte und im Zugverlauf — überall dort, wo sonst
  der Name eines Mitspielers steht.
- **Die Spielart heisst weiterhin „Gegen den Computer".** Dort ist die
  Spielweise gemeint, nicht der Mitspieler; „gegen Bob den Bot" wäre an der
  Stelle eine Ansage über eine Person statt über einen Modus.

## v0.75.0 — 26.08.2026

**In den Bildanleitungen der Fähigkeiten war die oberste Figurenreihe
abgeschnitten.**

- Die Anleitungsbilder reservieren oben Platz für die Figuren, die über die
  erste Reihe hinausragen. Dieser Platz war **fest auf 30 Pixel** eingestellt,
  während die Figuren mit der Bildgrösse mitwachsen — bei sechs Spalten sind
  sie rund doppelt so hoch. Der Überstand wurde gekappt.
- Jetzt wächst der Platz mit der Figur mit, wie beim echten Spielbrett auch.
- **Der Inhalt der Anleitungen war nie falsch:** Nachgemessen haben alle 22
  Fähigkeiten ihr Bild, alle rechnen mit den echten Spielregeln durch, und
  keines zeigt eine Wirkung, die es nicht mehr gibt. Falsch war allein die
  Darstellung.

> **Was noch offen ist:** Ob die Anleitungen auch jeden Handgriff zeigen, den
> man im Match wirklich anklicken muss — das ist ein eigener Punkt und kommt
> später.

## v0.74.0 — 26.08.2026

**Die blaue Pille im Hauptmenü zappelt beim Drehen nicht mehr.**

- Beim Drehen des Bildschirms rutschte die Markierung hinter dem aktiven Tab
  hin und her, statt einfach an ihrem Platz zu bleiben.
- **Grund:** Die App hat ihre Lage gemessen, bevor der Browser das neue
  Bild überhaupt gerechnet hatte — sie bekam also die alten Werte. Und weil
  beim Drehen mehrere solche Meldungen kommen, sprang sie mehrfach.
- Jetzt wird erst gemessen, wenn das neue Bild steht, und mehrere Meldungen
  kurz hintereinander lösen nur noch **eine** Messung aus.
- Auf älteren iPhones wird die Drehung jetzt auch dann bemerkt, wenn der
  Browser nur die Drehmeldung schickt und keine Grössenänderung.

> **Derselbe Fehler steckte bis v0.88 im Spielbrett** („schwarze Streifen
> beim Drehen"). Die Pille stammt aus einer anderen Runde und hatte den dort
> gebauten Schutz nie mitbekommen.

## v0.73.0 — 26.08.2026

**Das Nudelholz sagt endlich die Wahrheit.** Wer Schwarz spielt, bekam bei
allen vier Richtungen die falsche Auskunft.

- **Der Knopf nennt die Richtung jetzt so, wie DU auf das Brett schaust.**
  Bisher stand dort die Richtung des Bretts — und weil Schwarz das Brett
  gedreht sieht, hiess „von unten" in Wirklichkeit „von oben". Wer als
  Schwarz erwartete, dass die Figuren von ihm wegrollen, bekam sie auf sich
  zugerollt.
- **Die Fähigkeit selbst war nie kaputt.** Nachgemessen: Sie hat immer
  richtig gerechnet — nur ihre Beschriftung log. Deshalb ändert sich am
  Ergebnis eines Zuges nichts, nur daran, was vorher draufsteht.
- Ein Test prüft ab jetzt beide Seiten: Für Weiss darf sich nichts ändern,
  für Schwarz muss sich jede der vier Richtungen umkehren.

> **Noch nicht dabei:** die Vormarkierung („der grüne Kasten"). Sie wird
> ohnehin komplett umgebaut — grüner Rand um die möglichen Felder statt
> grüner Fläche —, und das kommt als eigene Auslieferung.

## v0.72.0 — 26.08.2026

**Die störende Bildlaufleiste unter dem Spielfeld ist weg, und die Karten
haben endlich das richtige Verhältnis.** Alles in dieser Runde ist am Rechner
im Browser nachgemessen, nicht gerechnet.

- **Die waagerechte Bildlaufleiste unter dem Brett ist verschwunden.** Sie
  entstand, weil der Team-Kasten und die Zug-Leiste absichtlich ein Stück
  über den Rand hinausragen — der Spielbereich hielt das für etwas, das man
  wegrollen können muss.
- **Das Brett ist dadurch etwas grösser geworden** (rund 10 Pixel), weil der
  Platz jetzt dem Brett gehört statt der Leiste.
- **Am Handy standen Zug-Leiste und Team-Kasten vier Pixel zu weit über dem
  Rand.** Der Rand ist dort schmaler als am Rechner, die beiden rechneten
  aber weiter mit dem breiten Wert.
- **Die Karten sind breiter** (44 statt 38 Pixel, am Handy 37 statt 36). Die
  Team-Karte ist 62 Pixel hoch, nicht 54 wie in v0.71.0 angenommen — die
  Karten waren dadurch zu schmal für ihre Höhe. Jetzt stimmt das Verhältnis
  einer Spielkarte auf allen Geräten.
- **„noch keine" steht jetzt beim Team-Kasten**, wenn eine Seite noch nichts
  gesammelt hat. Vorher stand der Satz am gegenüberliegenden Bildschirmrand,
  weit weg von dem, worauf er sich bezieht.

## v0.71.0 — 25.08.2026

**Die Item-Karten sind jetzt genau so hoch wie die Team-Karte daneben — und
das Zeichen darauf ist endlich so gross, wie es immer sein sollte.**

- **Gleiche Höhe, auf jedem Gerät.** Die Karten nehmen die Höhe der
  Team-Karte an, statt eine eigene zu haben. Das gilt am Laptop, am Tablet,
  am Handy und auch dann, wenn im Team-Modus ein „+2" die Team-Karte höher
  macht.
- **Das Brett bekommt seinen Platz zurück.** Die höheren Karten aus v0.70.0
  hatten ihm rund 18 Pixel Höhe genommen; jetzt ist die Zeile wieder genau so
  hoch wie die Team-Karte, und das Brett ist so gross wie vor der
  Formänderung.
- **Behoben: Das Zeichen auf der Karte war viel zu klein.** Seit v0.67.0
  sollte es 26 Pixel gross sein — tatsächlich waren es rund 16, weil eine
  ältere Regel in der Stildatei die neuere überstimmt hat. Genau deshalb
  wirkte die Karte so leer. Jetzt gilt die gemeinte Grösse.
- Die **Zahl an gestapelten Karten** (2, 3, …) steht jetzt innerhalb der
  Karte in der oberen rechten Ecke, wie der Wert auf einer Spielkarte, statt
  über den Rand hinauszuragen.
- Am Handy sind die Karten etwas schmaler als am Laptop (36 statt 38 Pixel),
  damit das Kartenverhältnis dort stimmt, wo auch die Team-Karte etwas
  niedriger ist.

## v0.70.0 — 25.08.2026

**Die eingesammelten Fähigkeiten sehen jetzt aus wie Spielkarten.**

- Statt des Quadrats von v0.67.0 ist jede Fähigkeit ein **hochkantes
  Rechteck** im Seitenverhältnis einer echten Spielkarte, mit ruhigeren
  Ecken.
- **Das Zeichen darin bleibt gleich gross** — die Karte ist gewachsen, nicht
  das Bild geschrumpft.
- Die zwei kleinen Kosten-Zeichen (**+** und **Blitz**) stehen jetzt
  **innerhalb** der Karte am Fuss, statt halb über ihrem Rand zu hängen.
  Auf dem Quadrat war dafür kein Platz, auf der Karte schon.
- Was gleich bleibt: gleiche Fähigkeiten liegen weiter als **ein Stapel mit
  Zahl** übereinander, und der Name steht weiter im Kurzhinweis und in dem
  Fenster, das ein Tipp öffnet.
- **Zu beachten:** Die höheren Karten nehmen dem Brett rund 24 Pixel Höhe.
  Auf dem Handy heisst das ein leicht kleineres Brett — das ist gerechnet,
  aber noch nicht am Gerät beurteilt.

## v0.69.0 — 25.08.2026

**Wer eine Runde verlässt, landet jetzt auf dem Startbildschirm.**

- Bisher stand man danach vor „Runde beitreten" — einem leeren Code-Feld für
  FREMDE Runden. Jetzt führt der Weg dorthin, wo man eine neue Runde startet.
- Das galt seit v0.36.0 schon für „Zur Übersicht"; der Weg über „Runde
  verlassen" war dabei übersehen worden.

## v0.68.0 — 25.08.2026

**Aus der Spielerzeile ist ein Team-Kasten in der Bildschirmecke geworden.**

- **Die Farbe steht gross**, der Name klein darunter — nicht mehr beides
  gleich gross nebeneinander.
- Der Kasten **geht bis an den Rand**: oben rechts und unten links schliesst
  er bündig ab, statt mit Abstand in der Mitte zu schweben.
- **Nur der erste Spieler steht da.** Sind mehrere auf einer Seite, sagt ein
  kleines **+2** daneben, wie viele noch — ein Tipp auf den Kasten zeigt alle
  in der Reihenfolge ihres Beitritts.
- Bei nur einem Spieler bleibt der Kasten stumm: Ein Fenster mit einer
  einzigen Zeile wäre eine Enttäuschung.

## v0.67.0 — 25.08.2026

**Die Fähigkeiten am Brett sind jetzt Symbol-Karten, und gleiche liegen auf
einem Stapel.**

- Statt des breiten Rechtecks mit Namen steht dort nur noch das **Symbol in
  seiner Umrandung** — ein Quadrat in der Farbe seiner Seltenheitsstufe.
- **Gleiche Fähigkeiten werden zusammengelegt:** Hast du dreimal denselben
  Sprung, siehst du eine Karte mit einer kleinen **3** in der Ecke statt drei
  gleicher nebeneinander.
- Die Karten **schieben sich halb übereinander** wie in der Hand gehaltene
  Spielkarten. Die angetippte hebt sich heraus, damit du siehst, was du
  triffst.
- Der Name steht weiter im Kurzhinweis und im Fenster, das ein Tipp öffnet —
  und für Vorleseprogramme unverändert an der Karte.
- Die beiden kleinen Zeichen bleiben: das **+** (dein Zug bleibt dir) und der
  **Blitz** (geht auch, während der Gegner dran ist) — jetzt in den Ecken der
  Karte.

## v0.66.0 — 25.08.2026

**Die Seite wird jetzt zugelost — der Bildschirm zum Aussuchen entfällt.**

- **Neuer Haken in den Grundeinstellungen: „Seite zulosen"**, von Anfang an
  gesetzt. Wer die Runde betritt, bekommt seine Farbe sofort zugeteilt und
  steht gleich vor dem Brett.
- Damit **fällt der erste Bildschirm weg**: kein Weiß/Schwarz/Zufall mehr,
  kein erstes „Bereit". Es bleibt das eine „Bereit", das die Partie startet.
- Solange der zweite Spieler fehlt, wartest du am Brett — **Beitritts-Code
  und Freunde-einladen stehen dort**, und „Bereit" erscheint erst, wenn
  jemand gegenübersitzt.
- **Haken aus:** Alles wie bisher — du suchst dir deine Seite selbst aus,
  und der Bildschirm dafür kommt zurück.
- Bereits laufende oder wartende Runden behalten ihren Ablauf; der Haken
  gilt für neu angelegte.

## v0.65.0 — 25.08.2026

**Aus „F" und „Z" am Brett sind Zeichen geworden.**

- Der **Friedhof** trägt jetzt einen **Totenkopf** statt des Buchstabens F —
  freundlich gezeichnet, wie auf einer Piratenflagge.
- Der **Zugverlauf** trägt ein **Verlaufs-Zeichen** statt des Z: drei Zeilen
  mit ihrem Punkt davor, so wie die Liste dahinter aussieht.
- Damit sind alle Knöpfe am Brett Zeichen: Zahnrad, Verlauf, Totenkopf.

## v0.64.1 — 25.08.2026

**Behoben: Gegen den Computer begann die Partie manchmal nicht.**

- Wer einmal „Doch nicht bereit" gedrückt hatte — oder vom
  Aufstellungs-Bildschirm mit „Zurück" eine Stufe zurückging —, wartete
  danach vergeblich: Der Computer sagte zur Aufstellung nie wieder zu, und
  das Spiel startete nicht mehr.
- Ursache war die zweite Bereitschaft aus v0.62.0: Sie wird bei jeder
  Rücknahme absichtlich für beide Seiten gestrichen, aber der Computer
  erneuerte seine nur beim Einsteigen. Jetzt bestätigt er nach jedem
  Bereit-Druck neu.

## v0.64.0 — 25.08.2026

**Der Spiel-Bildschirm ist neu angeordnet — nach deiner zweiten Skizze.**

- **Name und Karten stehen jetzt nebeneinander** statt untereinander: oben
  die Karten des Gegners und rechts daneben sein Name, unten dein Name links
  und deine Karten rechts. Das spart je Seite eine ganze Zeile.
- **Die kleinen Knöpfe sind aus der Namenszeile heraus** und stehen als
  Spalte am Rand: beim Gegner sein Friedhof rechts oben, bei dir Zahnrad,
  Zugverlauf und Friedhof untereinander links unten.
- Damit hat jede Seite ihre eigene Ecke, und die des Gegners liegt deiner
  gegenüber — so wie ihr am Tisch sitzen würdet.
- **Das Brett passt sich an:** Es wird so gross, wie der übrige Platz es
  zulässt, statt dass die Seite zu rollen anfängt.

## v0.63.0 — 25.08.2026

**Jede Fähigkeit und jedes Unglück hat jetzt ihr eigenes Zeichen.**

- In der Bibliothek stand bisher nur der Anfangsbuchstabe im Kästchen. Jetzt
  siehst du dort **29 gezeichnete Zeichen** — ein querliegendes Nudelholz,
  eine Schneeflocke beim Frost, einen Handspiegel beim Spiegel, eine
  Bärenfalle bei der Fessel, ein Schild beim Schutzschild und so weiter.
- **Auch am Brett** steht das Zeichen jetzt vor dem Namen jeder Fähigkeit, die
  du gesammelt hast. Die Reihe ist damit auf einen Blick zu unterscheiden,
  ohne dass du jedes Wort lesen musst.
- Die Zeichen nehmen die **Farbe ihrer Seltenheitsstufe** an — grün, blau,
  lila, gelb — und sind gezeichnet statt gemalt: Sie bleiben auf jedem
  Bildschirm gestochen scharf.
- **Nichts Blutiges, nichts Gruseliges** (deine Entscheidung vom 25.08.2026):
  Der Nekromant zeigt ein Aufstehen aus dem Boden statt eines Grabsteins, der
  Dieb eine Augenbinde.

## v0.62.0 — 25.08.2026

**Vor dem Anpfiff siehst du jetzt deine Aufstellung — und darfst sie neu
würfeln, bevor es losgeht.**

- Sobald auf beiden Seiten jemand sitzt und beide „Bereit" gedrückt haben,
  kommt ein **zweiter Bildschirm mit dem Brett**. Dort siehst du, wie deine
  Figuren stehen.
- Ist eine **Zufallsarmee** eingestellt, steht daneben ein **Würfel-Knopf**:
  einmal drücken, und die Aufstellung wird neu gezogen. Haben beide Seiten
  dieselbe Armee, ändert sich beides; würfelt jede Seite für sich, ändert
  sich nur deine.
- **Erst das zweite „Bereit" startet die Partie** — und zwar von beiden
  Seiten. Würfelt jemand zwischendurch neu, muss auch neu zugesagt werden:
  Niemand soll in eine Aufstellung starten, die er nicht gesehen hat.
- **Oben links „Zurück"** führt eine Stufe zurück zur Seitenwahl.
- Gegen den Computer geht alles wie gewohnt: Er sagt sofort zu, du
  entscheidest allein, wann es losgeht.

## v0.61.0 — 25.08.2026

**Eine neue Runde beginnt jetzt mit einem eigenen Bildschirm: nur noch die
Seitenwahl, gross und aufgeräumt.**

- Wer eine Runde startet oder beitritt, sieht **kein Brett mehr**, bevor es
  losgeht — sondern **Weiß, Schwarz und Zufall gross nebeneinander**, darunter
  „Bereit". Vorher stand das alles unter einem Brett, auf dem ohnehin niemand
  ziehen konnte.
- **Oben links steht „Zurück"**, wie überall in der App. Er ersetzt den Knopf
  „Runde verlassen" und fragt vorher nach: Bist du der Letzte, wird die Runde
  geschlossen.
- **Der Beitritts-Code steht gross am Fuß** — vorlesbar und abtippbar, statt
  blass in der Ecke.
- **Freunde einladen ist ein Knopf** mit dem Freunde-Zeichen; die Namen stehen
  in seinem Fenster. Bisher war es eine Liste mit einer Zeile je Freund.
- **Vorübergehend nicht möglich: die Zufallsarmee neu würfeln.** Der Würfel
  gehört auf den zweiten Start-Bildschirm (Brett ansehen und neu aufstellen),
  und der wird als Nächstes gebaut.


## v0.60.0 — 25.08.2026

**Bei gleicher Zufallsarmee steht Schwarz jetzt spiegelverkehrt zu Weiß — beide
sehen dieselbe Aufstellung.**

- Bisher bekam Schwarz dieselbe Figurenfolge auf denselben Linien (Turm auf
  der a-Linie bei beiden). Weil sich das Brett aber zu jeder Seite dreht, sahen
  die zwei Spieler ihre Aufstellungen **links-rechts vertauscht** — es fühlte
  sich schief an.
- Jetzt ist die schwarze Armee das **Punktspiegelbild** der weißen: Jede Figur
  steht auf dem gegenüberliegenden Feld. Damit sieht jeder Spieler von seiner
  Seite dieselbe Aufstellung, wie im echten Schach.
- Gilt nur, wenn beide Seiten dieselbe Zufallsarmee bekommen. Würfelt jede
  Seite für sich (Haken „unterschiedliche Armeen"), bleibt alles wie gehabt —
  da gibt es nichts zu spiegeln.
## v0.59.0 — 25.08.2026

**Zugverlauf und Einstellungen sind jetzt Knöpfe direkt bei dir — neben dem
Friedhof.**

- Der Zugverlauf steckt nicht mehr in einem Fach unter dem Brett, sondern in
  einem **„Z"-Knopf** in deiner Zeile; ein Tipp öffnet ihn in einem Fenster.
- Das **Zahnrad** (Einstellungen dieser Partie, mit dem Aufgeben dahinter)
  ist aus der unteren Leiste zu dir gezogen — es steht jetzt neben „Z" und „F".
- Damit tragen du und der Gegner am Brett dieselben kleinen Knöpfe: jede Seite
  ihr „F" (Friedhof), und bei dir zusätzlich „Z" und das Zahnrad. Unter dem
  Brett ist nichts mehr — mehr Platz fürs Spielfeld.
- Am Ablauf ändert sich nichts: Der Verlauf sieht auf beiden Seiten gleich
  aus, und aufgeben (samt der Rückfrage) kann nur, wer mitspielt.
## v0.58.0 — 25.08.2026

**Jede Seite hat jetzt ihren eigenen Friedhof — ein „F" beim Spieler, das die
eigenen gefallenen Figuren zeigt.**

- Bisher lag der Friedhof als ein gemeinsames Fach unter dem Brett und zeigte,
  was jede Seite geschlagen hat. Jetzt trägt jeder Spieler sein eigenes „F":
  ein Tipp öffnet ein Fenster mit den **verlorenen** Figuren dieser Seite.
- Dazu steht dort, ob die Seite nach Material vorn liegt oder zurück.
- Das „F" sitzt direkt in der Zeile des Spielers und erscheint erst, wenn die
  Partie läuft — vorher ist ja niemand gefallen.
- Der Zugverlauf bleibt vorerst der bekannte „Züge"-Knopf unter dem Brett; er
  zieht mit dem nächsten Schritt ebenfalls zu den Spielern.
## v0.57.0 — 25.08.2026

**Die Fähigkeiten stehen jetzt als Kartenreihe am Brett — die des Gegners
oben, deine unten.**

- Bisher lagen beide Seiten zusammen in einer Karte unter dem Brett. Jetzt
  hat jede Seite ihre eigene Reihe an ihrem Platz: der Gegner über seinem
  Namen, du unter deinem.
- Die Karten des Gegners stehen **offen** — du siehst, welche Fähigkeiten er
  hat. (Das war schon vorher so, jetzt steht es an der richtigen Stelle.)
- Deine Fähigkeiten setzt du wie gewohnt mit einem Tipp ein; die des Gegners
  zeigen beim Antippen nur, was sie tun. Stufenfarbe und die Zeichen für
  „Zug bleibt" (+) und „geht auch beim Gegner" (Blitz) bleiben.
- Bei vielen Fähigkeiten wischt die Reihe seitlich, statt eine zweite Zeile
  aufzumachen — so bleibt das Brett groß.
## v0.56.0 — 25.08.2026

**Bei der Brettform-Wahl steht kein Erklärabsatz mehr — die Knöpfe und Bilder
sagen es selbst.**

- Unter den drei Knöpfen (Quadratisch, Rechteckig, Kreuz) stand ein Satz, der
  die gewählte Form beschrieb. Er wiederholte nur, was die Knöpfe und die
  Brettbilder auf den Kacheln ohnehin zeigen — und schob die Kacheln nach
  unten, also genau das, was man dort antippen will.
## v0.55.0 — 25.08.2026

**Beim Aussuchen der Seite rollt die Runde wieder — und Weiss, Schwarz und
Zufall stehen wieder beisammen.**

- **Die feste Seite gilt erst, wenn das Match läuft.** Vorher ist sie eher im
  Weg: Beim Aussuchen der Seite ist nicht das Brett die Hauptsache, sondern
  die Wahl — und die wurde von einem möglichst grossen Brett an den Rand
  gedrückt. Solange gewählt wird, rollt die Seite wie jede andere.
- **Die drei Knöpfe stehen wieder nebeneinander**, gleich breit, und
  unterscheiden sich nur in der Farbe. Seit v0.53.0 sassen Weiss und Schwarz
  je in der Zeile ihrer Seite — und dazwischen lag das Brett.
- Sie heissen jetzt schlicht **Weiss**, **Schwarz** und **Zufall**. „Mitspielen"
  ergab Sinn, solange der Knopf in einer Karte mit der Überschrift „Weiss"
  sass; nebeneinander stünde dreimal fast dasselbe Wort.
- Wer schon in einem Team ist, sieht nur noch die andere Seite — den Wechsel.
  Wer bereit gedrückt hat, sieht wie bisher gar keine Wahl mehr.
## v0.54.0 — 25.08.2026

**Unter dem Brett steht kein Erklärtext mehr — das Brett bleibt beim Spielen
stehen, wo es ist.**

- Bisher wechselten sich dort vier Sätze ab, und drei davon **mitten im
  Spiel**: „Warte, bis dein Team wieder am Zug ist" wurde zu „Figur antippen,
  dann ein Feld mit Punkt …", sobald der Gegenzug ankam — und die beiden sind
  unterschiedlich hoch. Beim Antippen des Königs kam noch ein Rochade-Hinweis
  dazu. Das Brett rutschte dabei jedes Mal.
- Verloren geht nichts Wichtiges: **Wer dran ist**, sagt seit v0.53.0 die
  leuchtende Spielerzeile. **Wie man zieht**, zeigt das Brett selbst mit den
  Punkten auf den möglichen Feldern. Die **Halluzination** stand ohnehin
  zweimal da — die Marke oben zählt weiter mit.
- Stehen bleibt nur, was einen Knopf hat: die Platzier-Leiste und das
  laufende Zugmuster. Die erscheinen, weil **du** etwas angetippt hast, nicht
  weil der Gegner gezogen hat.
- **Was ersatzlos entfällt:** die Begründung, warum eine Rochade gerade nicht
  geht. Die möglichen Ziele zeigt das Brett weiter als Punkte.
## v0.53.0 — 25.08.2026

**Die Spieler stehen jetzt am Brett, nicht mehr in zwei grossen Kästen.**

- Der Gegner steht in einer schmalen Zeile **über** dem Brett, du in einer
  **darunter** — wie am echten Tisch. Die zwei grossen Karten sind weg; das
  spart rund 170 Pixel, und die gehören jetzt dem Brett.
- **Wer am Zug ist, leuchtet.** Dafür braucht es kein Wort mehr: Oben in der
  Leiste stand bisher „Weiss ist am Zug", jetzt sagt es die Zeile selbst.
- **„Schach" steht bei dem, den es trifft** — vorher stand es oben in der
  Leiste, und man musste selbst zuordnen, wer gemeint war.
- In jeder Zeile steht, mit welcher Farbe diese Seite spielt, wer mitspielt
  und ob sie bereit ist. „Bereit" und „Mitspielen" sitzen dort, wo sie
  hingehören — an der Seite, um die es geht.
## v0.52.0 — 25.08.2026

**Das Match passt jetzt auf eine Seite — es rollt nicht mehr.**

- Der ganze Partie-Bildschirm — Standleiste, Teams, Brett, Friedhof und
  Züge, Fussleiste — steht **gleichzeitig da**. Kein Wischen mehr, um zu
  sehen, wer am Zug ist oder wo das Zahnrad sitzt.
- Das **Brett passt sich an**: Es nimmt genau die Höhe, die übrig bleibt, und
  ist auf jedem Gerät so gross, wie es dort sein kann. Auf einem hohen Handy
  wird es grösser als vorher, auf einem flachen Fenster kleiner.
- Gemessen statt geschätzt: Die App rechnet die Brettgrösse aus dem, was
  wirklich auf dem Schirm steht — beim Öffnen und jedes Mal, wenn du das
  Gerät drehst oder das Fenster ziehst.
- **Nur wenn es beim besten Willen nicht passt** (ein sehr flaches Fenster,
  etwa ein quer gehaltenes Handy), bleibt das Brett benutzbar gross und die
  Seite rollt doch — ein winziges Brett wäre die schlechtere Antwort.
## v0.51.0 — 25.08.2026

**Das Code-Feld bei „Runde beitreten" sind jetzt sechs Kästchen — und der
lange Erklärsatz ist weg.**

- Statt eines breiten Textfelds stehen dort **sechs Kästchen**, eines je
  Zeichen. Man sieht auf einen Blick, wie lang der Code ist, und wie weit
  man beim Tippen ist.
- Darüber stand bisher ein dreizeiliger Satz („Gib den Beitritts-Code ein,
  den dir der Ersteller … 6 Zeichen, ohne 0, O, 1, I und L"). Er ist ersetzt
  durch eine kurze Zeile **unter** dem Feld: „Rechts oben in einer Runde
  steht der Code."
- Die Länge muss nicht mehr danebenstehen — das sagen die Kästchen. Und die
  verwechselbaren Zeichen nimmt das Feld ohnehin nicht an.
## v0.50.0 — 25.08.2026

**Auch die Züge stecken jetzt in einem Knopf — und beide stehen
nebeneinander in einer Zeile.**

- Der Zugverlauf sieht aus wie der Friedhof und fährt genauso aus: ein
  kleiner Knopf **„Züge (N)"**.
- Zugeklappt stehen **Friedhof und Züge nebeneinander**. Unter dem Brett
  bleibt damit eine einzige Zeile übrig statt der bisherigen fünf bis acht.
- Tippst du eines der beiden an, nimmt es die volle Breite — die Zugliste
  bleibt so lesbar wie vorher.
## v0.49.0 — 25.08.2026

**Der Friedhof fährt jetzt aus einem Knopf aus, statt dauerhaft dazustehen.**

- Unter dem Brett steht nur noch ein kleiner Knopf **„Friedhof (N)"** — die
  Zahl sagt sofort, wie viele Figuren insgesamt gefallen sind.
- Ein Tipp darauf fährt die gewohnte Bilanz aus: welche Figuren jede Seite
  geschlagen hat und wer nach Figurenwert vorn liegt. Gerechnet wird
  unverändert.
- Was du davon hast: Auf dem Handy waren das bisher vier bis fünf Zeilen,
  die immer dastanden. Der Platz gehört jetzt dem Brett.
## v0.48.0 — 25.08.2026

**Aufgeben sitzt jetzt hinter einem Zahnrad — den Einstellungen dieser
Partie.**

- Unten in der laufenden Partie steht statt „Aufgeben" ein Zahnrad. Dahinter
  liegen die Einstellungen, die **nur für diese Partie** gelten.
- Darin steht heute genau eine Sache: **Aufgeben, ganz unten, gross und
  rot** — mit Rückfrage wie bisher.
- Der Platz ist bewusst schon da: Lautstärke und was sonst nur im Match
  zählt, kommt später dorthin. Alles, was dein Gerät betrifft, bleibt beim
  Zahnrad auf dem Startbildschirm.

## v0.47.0 — 24.08.2026

**Der Beitritts-Code steht jetzt neben der Zugnummer — und läuft beim
Rollen mit.**

- Er sass bisher ganz oben im Kopf der Partie und rollte weg, sobald man
  zum Brett hinunterschaute. Jetzt steht er rechts in der Leiste mit
  „Zug N", und die klebt oben fest.
- Ist die Partie vorbei, steht er nicht mehr da: Ihr Code führt nirgends
  mehr hin.
- Der Kopf darüber verschwindet ganz, wenn er nichts mehr zu zeigen hat.

## v0.46.0 — 24.08.2026

**Die Rückschau sagt jetzt gleich oben, wie es ausging.**

- Statt „Wie es dazu kam" steht dort **Schachmatt** — grün, wenn du
  gewonnen hast, rot, wenn du verloren hast.
- **Patt** steht in grau; niemand hat gewonnen.
- Wer aufgibt, liest **Aufgegeben** in der Verlierer-Farbe.

## v0.45.0 — 24.08.2026

**Der Abschluss einer Partie ist jetzt ein eigenes Fenster.**

- Rückschau („wie es dazu kam"), Ergebnis und Punktestand sind drei
  Schritte eines Weges. Die Leiste unten verschwindet dabei — wer
  zwischendurch auf einen Tab tippt, verliert sonst die Stelle, an der er
  gerade war.
- Hinaus geht es über den Knopf am Ende des jeweiligen Schritts; er bringt
  dich auf den Startbildschirm, und dort ist die Leiste wieder da.

## v0.44.0 — 24.08.2026

**Wenn du bereit bist, wird es ruhig auf dem Bildschirm.**

- Die andere Seite wird dir nicht mehr als „Mitspielen" angeboten — du
  bist ja schon beigetreten. Nimmst du deine Bereitschaft zurück
  („Doch nicht bereit"), ist die Wahl wieder da.
- **„Doch nicht bereit" bleibt** — sonst könntest du nicht mehr heraus,
  solange der zweite Spieler auf sich warten lässt.
- **„Zur Übersicht" ist weg**, solange du in einem Team sitzt: „Runde
  verlassen" sagt ehrlicher, was passiert. Für Zuschauer ohne Team und für
  beendete Partien bleibt er — dort ist er der einzige Ausgang.

## v0.43.0 — 24.08.2026

**Läuft das Match, steht unten nur noch „Aufgeben".**

- „Neu aufstellen" und „Runde verlassen" sind aus der laufenden Partie
  verschwunden. Das eine war ein Rückgängig mitten im Spiel, das andere tat
  dasselbe wie Aufgeben, ohne es so zu nennen.
- **Aufgeben beendet das Match, und du verlierst** — mit Rückfrage, damit
  es niemand aus Versehen tut.
- Vor dem Start ändert sich nichts: Dort stehen weiterhin die Knöpfe, die
  du zum Einrichten brauchst.

## v0.42.0 — 24.08.2026

**„Neu aufstellen" gibt es nur noch, wenn die Zufallsarmee an ist.**

- Der Knopf ist zum Neu-Würfeln da. Ohne Zufallsarmee stellte er nur
  dieselbe feste Aufstellung wieder hin — dafür braucht es keinen Knopf.
- Bekommen **beide Seiten dieselbe** gewürfelte Armee, kannst du auch
  schon vor der Team-Wahl neu würfeln.
- Würfelt **jede Seite für sich**, geht es erst, wenn du in einem Team
  bist — vorher wäre nicht klar, wessen Armee neu gewürfelt wird.
- **Nach einer beendeten Partie bleibt alles wie bisher:** Dort startet
  derselbe Knopf die Revanche.

## v0.41.0 — 24.08.2026

**Die drei Knöpfe zum Beitreten sehen jetzt gleich aus — und tragen ihre
Farbe.**

- „Mitspielen" bei Weiss ist weiss, bei Schwarz ist es schwarz. Beide sind
  gleich gross und gleich geformt.
- Der dritte heisst nur noch **„Zufall"** und ist diagonal geteilt: von
  unten links nach oben rechts, oben links weiss, unten rechts schwarz.
- Die Farben sind die der Figuren, nicht die der Felder — der Knopf sagt,
  mit welchen Steinen du spielst.

## v0.40.1 — 24.08.2026

**Nachbesserung zu v0.40.0:** Der Beitritts-Code stand zweimal auf dem
Bildschirm — blass oben in der Ecke und darunter noch einmal bei den Teams,
mit Beschriftung und Erklärsatz. Die untere Zeile ist weg; oben bleibt er,
wie gewünscht ohne Zusatztext.

## v0.40.0 — 24.08.2026

**Über dem Brett steht nichts mehr ausser dem Beitritts-Code.**

- Der „Zurück"-Knopf oben ist weg, ebenso der Name der Runde und der
  Spielart-Chip daneben. Beide sagten dasselbe wie das Brett darunter.
- Stattdessen steht rechts oben blass der **Beitritts-Code** — sechs
  Zeichen, ohne Beschriftung. Zum Weitergeben markieren und kopieren.
- Beendete Partien zeigen ihn nicht: Ihr Code führt nirgends mehr hin.
- Hinaus kommst du wie bisher über die Knöpfe unten.

## v0.39.0 — 24.08.2026

**Die Grundeinstellungen sind jetzt ein eigenes Fenster.**

- Die Leiste unten (Fähigkeiten / Start / Rangliste) verschwindet, solange
  du dort bist. Hinaus geht es über den „Zurück"-Knopf oben links — und der
  bringt dich auf den Startbildschirm.
- Dasselbe Verhalten haben die laufende Partie, die Einstellungen und die
  Freundesliste schon länger.

## v0.38.0 — 24.08.2026

**Unter dem Brett auf dem Startbildschirm steht kein Name mehr.**

- Das Vorschaubild zeigt ohnehin, welche Spielart eingestellt ist — die
  Zeile darunter hat es nur wiederholt und den Spielen-Knopf nach unten
  geschoben.
- Für Vorleseprogramme ist der Name weiterhin da: Er steht in der
  Beschriftung des Vorschau-Knopfes.

## v0.37.0 — 24.08.2026

**Deine vergangenen Matches haben jetzt ein eigenes Zeichen oben auf dem
Startbildschirm.**

- Eine kleine Uhr, links neben den Freunden und dem Zahnrad. Ein Tipp
  darauf öffnet die Liste deiner beendeten Partien — mit „Ergebnis
  ansehen" wie gehabt.
- Im Beitritts-Bildschirm stehen sie dafür nicht mehr. Der ist damit
  endgültig nur noch das, was sein Name sagt.
- Hast du noch nichts gespielt, sagt die Seite das, statt leer zu sein.

## v0.36.0 — 24.08.2026

**Nach einer Runde landest du wieder auf dem Startbildschirm.**

- Bisher führte „Zurück zur Übersicht" — und auch das Schliessen des
  Ergebnisses — in den Beitritts-Bildschirm. Dort steht seit v0.35.0 nur
  noch das Code-Feld für FREMDE Runden; man stand also vor einem leeren
  Formular.
- Jetzt geht es dorthin zurück, wo es losging: zum Start, mit Vorschau,
  „Spielen" und deinen Einstellungen.

## v0.35.0 — 24.08.2026

**„Runde beitreten" ist jetzt nur noch das: der Weg in fremde Runden.**

- Die Liste „Deine offenen Partien" ist dort verschwunden. Sie war seit der
  Ein-Runden-Regel höchstens einen Eintrag lang und beantwortete nur die
  Frage, wie du zurück in deine Runde kommst.
- Diese Frage beantwortet seit v0.34.0 der Startbildschirm — dort, wo du
  ohnehin stehst.
- **Für die Verwaltung ändert sich nichts:** Die Liste aller offenen Runden
  bleibt, sonst liessen sich stehengebliebene Runden nicht mehr aufräumen.

## v0.34.0 — 24.08.2026

**Der Startbildschirm bringt dich zurück in deine Runde.**

- Steckst du in einer Runde, steht auf dem Start jetzt „Zurück in deine
  Runde" — mit der Spielart und dem Hinweis, ob sie läuft oder noch auf
  einen Mitspieler wartet. Ein Tipp darauf, und du bist drin.
- **Das schliesst eine Lücke:** Der automatische Wiedereinstieg nach dem
  Anmelden fand nur Runden, die schon laufen. Eine Runde, die noch auf
  jemanden wartet, war nur über die Liste im Zwischenbildschirm erreichbar —
  oder über den Beitritts-Code.
- Der Knopf erscheint nur, wenn es wirklich etwas zu betreten gibt.

## v0.33.0 — 24.08.2026

**Deine Einstellungen bleiben jetzt wirklich stehen — egal, wie du den
Bildschirm verlässt.**

- Bisher wurden Bot-Stufe, Lootbox-Menge, Item-Vorrat und die Haken nur dann
  gemerkt, wenn du „Zurück" gedrückt oder eine Brettform gewählt hast. Wer
  über die Leiste oder das Zahnrad hinausging, fand beim nächsten Öffnen
  wieder die alten Werte vor.
- Jetzt wird jede Änderung sofort gemerkt. Sie gilt so lange, bis du sie
  selbst änderst — auch nach dem Schliessen der Seite.
- Gespeichert wird weiterhin nur auf **diesem Gerät**; ein anderes Handy hat
  seine eigenen Einstellungen.

## v0.32.0 — 24.08.2026

**Nach einer Partie gegen den Computer kommt kein Punkte-Schirm mehr.**

- Gegen den Computer gibt es keine Punkte — trotzdem stand am Ende bisher
  eine grosse „+0", eine Aufschlüsselung, aus der nichts folgt, und ein
  Knopf in die Rangliste, in der sich nichts geändert hatte.
- Jetzt endet die Bot-Partie nach dem Ergebnis: Gewonnen oder Verloren, ein
  Satz dazu, warum es keine Punkte gibt, und zurück zur Übersicht.
- **Die Rückschau davor bleibt** — sie zeigt den Verlauf, nicht die Punkte.
- Die Rangliste selbst erreichst du weiterhin jederzeit über ihren Tab.

## v0.31.0 — 24.08.2026

**Auf den Kreuz-Brettern sind die vier Ecken jetzt wirklich leer.**

- Die Ecken gehören nicht zum Brett — dort kann keine Figur hin. Trotzdem
  sah man dort bisher noch die Ränder und Kanten der 3D-Platten, als läge
  da eine Kachel.
- Jetzt ist dort nichts mehr: kein Rand, keine Kante, kein Schatten. Das
  Brett hat damit auch im Kleinen die Kreuzform, die es haben soll — auch
  im Vorschaubild bei der Brettwahl.
- **Echte Risse im Boden sehen unverändert aus.** Sie sind eine kaputte
  Kachel und sollen als solche zu erkennen bleiben; die Ecke dagegen ist
  gar keine Kachel.

## v0.30.0 — 24.08.2026

**Die Zugspur färbt jetzt die ganze Kachel, nicht nur ihre Oberseite.**

- Nach einem Zug leuchten die beiden beteiligten Felder grün. Bisher galt
  das nur für die Oberfläche — die schräge Kante darunter blieb grau stehen,
  und das Feld sah aus wie ein grünes Blatt auf einem grauen Klotz.
- Jetzt färbt sich die **ganze Platte**: Oberseite und Kante. Dasselbe gilt
  für das Zielfeld des letzten Zuges (etwas kräftiger) und für die Spur
  eines Unglückswürfels (gelb statt grün).
- Rein optisch — an den Regeln ändert sich nichts.

## v0.29.0 — 24.08.2026

**Gegen den Computer suchst du dir jetzt selbst aus, ob du Weiss oder
Schwarz spielst.**

- Bisher warst du in einer Computer-Runde immer Weiss, und der Computer sass
  schon da, bevor du überhaupt hingesehen hattest. Jetzt öffnet „Spielen"
  eine **leere Runde mit beiden Team-Karten** — du tippst auf „Mitspielen"
  bei der Seite, die du willst.
- **Der Computer steigt erst ein, wenn du auf „Bereit" drückst**, und zwar
  auf der Seite gegenüber. Danach geht es sofort los. Wählst du Schwarz,
  macht er den ersten Zug.
- Ein Satz über den Karten sagt dir, was zu tun ist, solange du noch keine
  Seite hast.
- **Aufräumen nebenbei:** Wer „Spielen" drückt und ohne Seitenwahl zurück
  zur Übersicht geht, lässt keine leere Runde mehr stehen — sie schliesst
  sich von selbst.
- An Partien unter Menschen ändert sich nichts: Wer anlegt, kommt wie bisher
  gleich ins weisse Team.

## v0.28.0 — 24.08.2026

**Vier Schwierigkeitsstufen für den Computer — und er denkt jetzt wirklich
nach.**

- Unter dem Haken „Gegen den Computer" (Pfeil neben „Spielen") steht eine
  neue Reihe: **Leicht — Mittel — Schwer — Meister.** Umgestellt wird sie
  vor der Runde; eine laufende Partie behält die Stufe, mit der sie
  angelegt wurde. Was jede Stufe kann, sagt das **i** daneben.
- **Leicht** ist der Computer von v0.27.0: Er sieht nur den eigenen Zug und
  verschenkt Figuren.
- **Mittel** rechnet deine Antwort mit. Geschenke gibt es damit keine mehr —
  was du zurückholen könntest, lässt er stehen.
- **Schwer** schaut drei Halbzüge weit und stellt dir selbst Fallen.
- **Meister** rechnet zusätzlich jeden Abtausch zu Ende (ein gedeckter Bauer
  lockt ihn nicht mehr) und achtet darauf, WO seine Figuren stehen, nicht
  nur wie viele es sind.
- **Die Stufen sind gegeneinander ausgespielt worden**, nicht geschätzt: Je
  16 Partien, und jede Stufe schlägt die darunter deutlich (16:0, 14:1,
  14:2). Ein Entwurf, bei dem „Meister" schwächer war als „Schwer", wurde
  dabei gefunden und verworfen.
- **Auf grossen Brettern rechnet er etwas flacher.** Das Kreuzbrett hat
  dreimal so viele Felder wie das Standardbrett; ohne Bremse stünde die App
  sekundenlang still. Der Computer bricht dann lieber eine Stufe früher ab —
  spürbar wird das nur bei „Meister".
- **An den Punkten ändert sich nichts:** Partien gegen den Computer zählen
  weiterhin für niemanden — weder für dich noch für ihn.

## v0.27.0 — 24.08.2026

**Du kannst jetzt allein spielen: gegen den Computer.**

- Unter dem Pfeil neben „Spielen" steht ganz oben der neue Haken **„Gegen
  den Computer"**. Ist er gesetzt, legt „Spielen" eine Runde an, in der der
  Computer Schwarz spielt — du brauchst niemanden dazu und musst auf
  niemanden warten.
- Du spielst Weiss und hast den ersten Zug. Sobald du auf „Bereit" drückst,
  geht es los; der Computer ist immer schon bereit. Nach jedem deiner Züge
  überlegt er kurz und zieht dann.
- **Wie gut ist er?** Er schlägt, was er kriegen kann — immer die
  wertvollste Figur —, sammelt Lootboxen ein, wenn nichts zu holen ist, und
  wandelt seine Bauern zur Dame um. Was er noch NICHT kann: vorausdenken.
  Er stellt Figuren ein und übersieht Drohungen. Das ist der nächste
  Ausbauschritt.
- Fähigkeiten aus den Lootboxen setzt er noch nicht ein — sie liegen bei
  ihm im Vorrat. Auch das kommt später.
- **Solche Runden zählen nicht für die Rangliste.** Die Tabelle vergleicht
  Menschen miteinander; gegen einen Computer, der nicht vorausdenkt, wären
  die Punkte geschenkt. In deinem Profil taucht die Partie aus demselben
  Grund nicht auf.
- Verlässt du eine Runde gegen den Computer, schliesst sie sich — es bleibt
  keine leere Runde mit einem einsamen Computer stehen.

## v0.26.0 — 24.08.2026

**Alle Knöpfe einer Runde an einer Stelle — und leere Runden räumen sich
selbst weg.**

- Die Aktionen einer Runde lagen an drei Orten verteilt: „Zurück" oben,
  „Team verlassen" an der Team-Karte, unten Aufgeben, Umbenennen, Neu
  aufstellen und Zur Übersicht. Jetzt stehen sie **alle unten in einer
  Leiste** — und dort nur das, was gerade überhaupt geht.
- **„Umbenennen" ist weg:** Runden haben seit v0.14.0 keinen eigenen Namen
  mehr, der Knopf änderte etwas, das es nicht gibt.
- **„Runde verlassen" schliesst die Runde**, wenn danach niemand mehr drin
  ist. Bisher blieb für jede angelegte und wieder verlassene Runde eine
  leere Partie stehen. Sitzt noch jemand drin, bleibt sie natürlich — und
  beendete Runden bleiben immer, an ihnen hängen die Punkte.
- In der eigenen **laufenden** Runde gibt es weiterhin keinen Ausgang:
  Wer raus will, gibt auf oder verlässt sie.

## v0.25.0 — 24.08.2026

**Der Balken oben ist ganz weg — mehr Platz fürs Spiel.**

- Versionsnummer und Wunsch-Knopf, die letzten zwei Bewohner der Kopfzeile,
  sind in die Einstellungen gezogen: neue Karte **„Über die App"** ganz
  unten, mit der Version und dem Knopf zum Wünschen und Fehlermelden.
- Damit fällt der Balken selbst weg. Auf dem Handy gewinnt jeder Bildschirm
  rund vierzig Bildpunkte Höhe.
- Am Wunsch-Weg ändert sich nichts: Knopf drücken, schreiben, absenden.

## v0.24.0 — 24.08.2026

**Die Lootbox ist jetzt ein Würfel — mit eingraviertem Fragezeichen.**

- Die Truhe aus v0.23.0 passte nicht zu den Figuren. An ihrer Stelle steht
  ein **weicher Würfel mit stark abgerundeten Ecken**, leicht gedreht, damit
  man ihm ansieht, dass er ein Körper ist — und das **Fragezeichen ist in
  den Deckel graviert** statt daraufgemalt.
- Beim Unglückswürfel steht die Gravur wie bisher auf dem Kopf. Weil sie
  jetzt zum Bild gehört, gibt es je Seltenheitsstufe zwei Bilder statt
  einem — zusammen rund 400 KB.
- `tools\Lootboxen rendern.cmd` baut sie neu; alle Zahlen (Rundung,
  Drehung, Gravurtiefe) stehen oben in `tools\Lootbox-Blender.py`.

## v0.23.0 — 24.08.2026

**Die Lootboxen sind jetzt echte 3D-Truhen.**

- Auf dem Brett schwebt keine gezeichnete Würfel-Skizze mehr, sondern eine
  **gerenderte Truhe** — Korpus, Deckel, zwei Bänder und ein Schloss, im
  selben weichen Stil wie die Figuren und mit demselben Licht. Es gibt sie
  in allen vier Seltenheitsfarben; die verborgene Box schillert weiter im
  Regenbogen.
- Das Fragezeichen sitzt jetzt oben auf dem Deckel und hat einen dunklen
  Rand bekommen — auf der gelben Truhe war es vorher kaum zu sehen. Beim
  Unglückswürfel steht es weiterhin auf dem Kopf.
- **Neues Werkzeug:** `tools\Lootboxen rendern.cmd` (Doppelklick) baut die
  fünf Bilder in Blender neu — dasselbe Muster wie „Figuren rendern.cmd".
  Wer an Form oder Farbe schrauben will, findet alle Zahlen oben in
  `tools\Lootbox-Blender.py`.

## v0.22.0 — 24.08.2026

**Die Figuren passen jetzt auf ihre Platten.**

- Die 3D-Figuren waren rund ein Fünftel zu gross für die Kacheln, auf
  denen sie stehen — sie deckten die Felder dahinter zu weit ab. Sie sind
  jetzt kleiner, und der Rand über dem Brett ist entsprechend
  mitgeschrumpft.
- Zum Nachjustieren gibt es nur noch EINE Zahl in der Stildatei
  (`--figur-3d-groesse`); vorher stand dieselbe Grösse an drei Stellen.

## v0.21.0 — 24.08.2026

**Zwei Bildschirme statt einem langen: Brett hier, Regler dort.**

- **Der Pfeil neben „Spielen"** zeigt jetzt nur noch die
  **Grundeinstellungen** der nächsten Runde: Figurenzahl, die Haken,
  Lootbox-Menge und Item-Vorrat. Brettform und Grössen-Kacheln sind dort
  verschwunden.
- **Ein Tipp auf die Vorschau** führt zur **Brettform** — Quadratisch,
  Rechteckig oder Kreuz, und darunter die Grössen. Nichts sonst.
- Beide merken sich, was du einstellst: Auch wer nur die Figurenzahl
  ändert und zurückgeht, findet sie beim nächsten Mal wieder.
- Der lange Bildschirm mit allem untereinander ist damit weg. Was du
  einstellst, gilt weiterhin erst mit „Spielen".

## v0.20.0 — 24.08.2026

**Das Brett über „Spielen" ist drückbar.**

- Ein Tipp auf die Vorschau führt direkt zur Wahl der Brettform und der
  Grösse. Bisher ging das nur über den Pfeil daneben — und der ist auf
  dem Handy deutlich kleiner zu treffen als das halbe Brett.
- Der Pfeil bleibt vorerst, wie er ist; er führt auf denselben
  Bildschirm.

## v0.19.0 — 24.08.2026

**Die Freunde haben jetzt ihr eigenes Zeichen auf dem Start.**

- Oben rechts steht neben dem Zahnrad ein zweites Zeichen: **zwei
  Personen**. Es öffnet die Freundesliste als eigene Seite — Anfragen an
  dich, deine Freunde, deine offenen Anfragen und die Suche nach Namen.
- Die Karte hing bisher auf dem Bildschirm „Spielen". Da man dorthin seit
  v0.14.0 nur noch zum Beitreten kommt, wäre sie dort kaum noch
  aufgefallen.
- Am Einladen in eine laufende Runde ändert sich nichts: Das bleibt bei
  der Liste an den Teams der Partie.

## v0.18.0 — 24.08.2026

**Die Fähigkeiten-Seite ist jetzt kurz: nur noch das Raster.**

- Unter dem Icon-Raster standen bisher vier lange Karten mit allen 23
  Einträgen zum Aufklappen. Sie sind weg — die Seite passt jetzt fast auf
  einen Bildschirm.
- **Verloren geht nichts:** Ein Tipp auf eine Kachel zeigt weiterhin die
  Beschreibung und die abgespielte Anleitung, genau wie vorher der
  aufgeklappte Eintrag.
- Neu darunter die kurze Liste **„Die Stufen"**: welche Rahmenfarbe zu
  welcher Seltenheit gehört, und hinter dem i wie oft sie vorkommt. Das
  war bisher die einzige Auskunft, die nur in den langen Karten stand.
- Dieselbe Ansicht gilt auch für die Bibliothek im Spiel (das i neben dem
  Fähigkeiten-Haken) — es ist dieselbe Seite.

## v0.17.0 — 24.08.2026

**Der 3D-Look ist jetzt einfach an.**

- Der Schalter „3D-Look (Vorschau)" in den Einstellungen ist weg, und mit
  ihm die ganze Karte „Darstellung": Die App zeigt das Brett dauerhaft im
  3D-Look. Wer bisher auf dem klassischen Brett stand, bekommt beim
  nächsten Öffnen den neuen Look — umstellen muss man nichts.
- In den Einstellungen bleiben Account, Spieler und Verbindung.

## v0.16.0 — 24.08.2026

**Der Schriftzug oben ist weg.**

- „Blunderluck" stand auf jedem Bildschirm gross im Kopf. Er ist jetzt
  unsichtbar — der Balken oben trägt nur noch die Versionsnummer und den
  Wunsch-Knopf und ist entsprechend schmaler geworden. Mehr Platz fürs
  Spiel, besonders auf dem Handy.
- Auf dem Anmelde-Bildschirm bleibt der Name stehen: Dort ist er die
  Begrüssung, nicht die Kopfzeile.
- Für Vorleseprogramme steht die Überschrift technisch weiter da, sie ist
  nur nicht mehr zu sehen.

## v0.15.0 — 24.08.2026

**Der Kopf der Seite wird leerer: Der grüne Punkt zieht in die
Einstellungen.**

- Die Zeile „Gemeinsame Tabelle …" mit dem farbigen Punkt stand bisher
  dauerhaft oben rechts und nahm auf dem Handy die halbe Kopfzeile weg.
  Sie steht jetzt als eigene Karte **„Verbindung" ganz unten in den
  Einstellungen** (Zahnrad auf dem Start) — samt einer Zeile, die die
  Farben erklärt: grün heisst da und aktuell, gelb heisst laden oder
  senden, rot heisst nicht erreichbar.
- Am Verhalten ändert sich nichts: Die App merkt sich den Stand
  weiterhin durchgehend, du siehst ihn nur noch, wenn du nachsiehst.

## v0.14.0 — 24.08.2026

**Eine Runde starten geht jetzt vom Startbildschirm aus — ohne Namensfrage.**

- **„Spielen" legt die Runde an.** Bisher führte der Knopf nur weiter, und
  angelegt wurde erst zwei Bildschirme später mit einem Tipp auf die
  Spielart-Kachel. Jetzt ist es umgekehrt: Der Pfeil neben „Spielen" führt
  in die Einstellungen, die Kachel **merkt** sich deine Wahl und bringt
  dich zurück — und der grosse Knopf startet.
- **Runden haben keinen Namen mehr.** Der Dialog „Name der Partie" ist
  weg; auf den Karten steht die Spielart. Eine Frage weniger vor jedem
  Spiel.
- **Deine Einstellungen bleiben stehen.** Brettform, Figurenzahl,
  Lootbox-Menge, Item-Vorrat und die Haken merkt sich dein Gerät. Beim
  nächsten Öffnen der Einstellungen steht alles noch so da — und die
  Vorschau auf dem Start zeigt genau das Brett, mit dem „Spielen" beginnt.
- **Neu unter „Spielen": „Runde beitreten".** Dort liegen wie bisher die
  Einladungen, das Feld für den Beitritts-Code und deine offenen und
  beendeten Partien. Die Karte „Runde erstellen" ist dort verschwunden —
  erstellt wird jetzt auf dem Start.

## v0.13.0 — 24.08.2026

**Freunde einladen — und Bündel A ist damit komplett.** (Schritt 7, der
letzte)

- **In einer Runde kannst du jetzt deine Freunde einladen:** Bei den Teams
  steht „Freunde einladen" mit allen Freunden, die frei sind — wer gerade
  selbst in einer laufenden Partie steckt, taucht dort nicht auf. Wer
  schon eingeladen ist, steht unter „Eingeladen", damit niemand doppelt
  fragt.
- **Der Eingeladene bekommt ein Banner von oben**, sobald seine App die
  Einladung sieht — mit „Ansehen" direkt in die Runde. Das Banner
  verschwindet nach zehn Sekunden von selbst; die Einladung bleibt unter
  „Runde beitreten" liegen, bis die Runde vorbei ist.
- Einladungen brauchen keine neue Datenbank-Regel: Sie stehen in der
  Partie selbst. Erneut einladen ist erlaubt; wer die App geschlossen
  hatte, findet die Einladung beim nächsten Öffnen.

## v0.12.0 — 24.08.2026

**Die Fähigkeiten auf einen Blick: das Icon-Raster.** (Bündel A, Schritt 8)

- Die Fähigkeiten-Bibliothek beginnt jetzt mit einem **Raster aus
  Kacheln** — jede Fähigkeit und jedes Unglück eine Kachel, der **Rahmen
  in der Farbe der Seltenheitsstufe** (Unglücke gestrichelt). Ein Tipp
  öffnet die Beschreibung mit der abgespielten Bild-Anleitung.
- Die echten Icon-Bilder kommen später: Bis dahin trägt jede Kachel den
  **Anfangsbuchstaben** ihrer Fähigkeit als Lückenfüller, damit das Raster
  von Anfang an vollständig ist.
- Die ausführlichen Stufen-Listen darunter bleiben, bis die echten Bilder
  da sind.

## v0.11.0 — 24.08.2026

**Die Freundesliste ist da.** (Bündel A, Schritt 6)

- **Neue Karte „Freunde" auf dem Spielen-Bildschirm:** Namen suchen,
  Anfrage stellen, Anfragen annehmen oder ablehnen, eigene Anfragen
  zurückziehen und Freunde wieder entfernen (mit Zwei-Schritt-Sicherung).
- **Niemand wird blossgestellt:** Lehnt jemand deine Anfrage ab, siehst du
  weiter nur „gesendet" — bei ihm verschwindet sie einfach. Entfernst du
  einen Freund, taucht seine alte Eintragung bei dir nicht als neue
  Anfrage auf.
- Die Freundschaft entsteht, sobald BEIDE einander eingetragen haben —
  gespeichert wird immer nur die eigene Sicht, deshalb kann kein Gerät
  einem anderen etwas überschreiben.
- Sie ist die Grundlage fürs Einladen (kommt als Nächstes): erst
  befreunden, dann einladen — für alle anderen gibt es den Beitritts-Code.

## v0.10.0 — 24.08.2026

**Der Beitritts-Code: Runden teilen ohne Freundesliste.** (Bündel A,
Schritt 5)

- **Spielen führt jetzt auf „Runde beitreten / Runde erstellen".** Die
  öffentliche Liste aller offenen Partien ist weg — in eine fremde Runde
  kommt man nur noch mit deren Code.
- **Jede Runde hat einen 6-stelligen Beitritts-Code.** Er steht bei den
  Teams der Partie und wird einfach weitergesagt; wer ihn unter „Runde
  beitreten" eintippt, landet in der Runde und wählt dort sein Team.
  Gross-/Kleinschreibung ist egal, und verwechselbare Zeichen (0/O, 1/I/L)
  kommen im Code nie vor.
- **Der Code gilt, solange die Runde nicht beendet ist** — auch Nachzügler
  können also mitten in eine laufende Partie noch einsteigen (wer selbst
  schon woanders spielt, bleibt gesperrt).
- Deine eigenen offenen und beendeten Partien siehst du weiterhin auf dem
  Spielen-Bildschirm; die Verwaltung sieht zum Aufräumen alle.

## v0.9.0 — 24.08.2026

**Der neue Startbildschirm — drei Seiten, und die Anmeldung führt direkt
ins Spiel.** (Bündel A, Schritt 4)

- **Die Leiste hat jetzt drei Seiten: Fähigkeiten / Start / Rangliste.**
  Der Start ist die Mitte und das Erste, was du siehst: oben das
  Vorschaubild der eingestellten Spielart (es ändert sich mit deinen
  Match-Einstellungen), unten der grosse **Spielen-Knopf** — daneben ein
  Quadrat mit Pfeil für die Match-Einstellungen (Spielart, Brettform,
  Lootboxen, Armee, wie bisher).
- **Die Einstellungen sind kein Tab mehr:** Sie öffnen sich über das
  Zahnrad oben rechts auf dem Start und haben einen Zurück-Knopf.
- **Die Fähigkeiten-Bibliothek ist eine eigene Seite** links vom Start —
  dieselben Einträge samt Bildanleitungen wie bisher hinter dem i.
- **Wer in einer laufenden Partie steckt, landet beim Öffnen der App
  direkt darin** — auf jedem Gerät, ohne Suchen. Und: **Während der
  eigenen laufenden Partie zeigt die App nur das Brett** — heraus kommt
  man durch Zu-Ende-Spielen, Aufgeben oder Team verlassen.
- **Eine laufende Partie je Person:** Wer schon spielt, kann keine zweite
  Partie anlegen und keiner beitreten. Steckst du (etwa von früher) doch
  in mehreren, bietet die App beim Anmelden an, alle bis auf die jüngste
  zu verlassen.

## v0.8.0 — 23.08.2026

**Die Anmeldung ist jetzt ein eigener Bildschirm.** (Bündel A, Schritt 3)

- Statt der Dialog-Kette beim Start gibt es ein **vollflächiges
  Anmelde-Bild**: Solange auf dem Gerät niemand angemeldet ist, sieht man
  nur dieses Bild — mit zwei grossen Knöpfen: **Vorhandenes Konto** und
  **Neues Konto erstellen**.
- **Vorhandenes Konto:** Benutzernamen eintippen (Gross-/Kleinschreibung
  egal), Passwort dazu, fertig. Es gibt keine öffentliche Namensliste mehr
  zum Durchblättern. Nach dreimal falsch geht es mit Hinweis zurück zur
  Auswahl.
- **Neues Konto:** Name, Passwort und Wiederholung auf einem Bild. Jede
  Regel meldet sich sofort unter dem Feld (Name vergeben, Passwort zu kurz,
  Wiederholung ungleich) — nicht erst nach dem Absenden. Der
  Erstellen-Knopf wird erst frei, wenn alles passt.
- **Wer angemeldet ist, sieht das Bild nie** — beim Öffnen der Seite geht es
  direkt in die App, bis man sich abmeldet (Einstellungen → Account) oder
  der eigene Eintrag über die Verwaltung entfernt wird.

## v0.7.0 — 23.08.2026

**Aus der PIN wird ein Passwort.** (Bündel A, Schritt 2)

- Beim Anmelden und im Profil gilt jetzt ein **Passwort mit 4 bis 8
  Zeichen** statt der 4-stelligen Ziffern-PIN. Erlaubt sind Buchstaben
  (Gross- und Kleinschreibung zählt!), Ziffern und Sonderzeichen — nur
  Leerzeichen nicht.
- Das Eingabefeld ist **verdeckt**, mit einem Zeigen-Knopf daneben zum
  kurzen Aufdecken gegen Vertipper. Weiter geht es erst, wenn die Eingabe
  den Regeln entspricht; beim Festlegen wird wie bisher zweimal eingegeben.
- **Wer schon eine 4-stellige PIN hat, muss nichts tun:** Sie gilt weiter
  (vier Ziffern sind ein erlaubtes Passwort). Wer möchte, hebt sie unter
  Profil → „Passwort ändern" auf ein richtiges Passwort.
- Das 6-stellige Verwaltungs-Passwort bleibt unverändert.

## v0.6.0 — 23.08.2026

**Neuer Abschnitt „Account" in den Einstellungen — Abmelden und Konto
löschen, sauber getrennt.** (Bündel A, Schritt 1)

- **Abmelden (neu):** Dieses Gerät vergisst die Anmeldung, dein Konto bleibt
  samt Punkten und Partien bestehen. Du meldest dich jederzeit wieder an —
  auch von einem anderen Handy.
- **Konto löschen** (hiess bisher „Ich bin raus"): entfernt dich aus
  Spielerliste und Rangliste. Wie bisher mit Zwei-Schritt-Sicherung — erst
  der zweite Druck löscht wirklich.
- Beide Aktionen stehen jetzt in einer eigenen Karte „Account" mit
  Erklärtext, damit niemand das eine tut und das andere meint. Die Karte
  „Spieler" behält Profil und Verwaltung.

## v0.5.0 — 23.08.2026

**Jetzt könnt ihr gemeinsam spielen.**

- Die gemeinsame Datenbank ist angelegt und eingetragen. Ab sofort sehen
  alle dieselben Partien: Wer eine Partie anlegt, den sehen die anderen;
  wer zieht, dessen Zug erscheint bei allen innerhalb weniger Sekunden.
  Bisher war jeder Browser eine Insel für sich.
- Der Hinweisbalken oben verschwindet, im Kopf steht jetzt
  „Gemeinsame Tabelle für alle Besucher" mit grünem Punkt.
- **Alte Partien aus dem Lokal-Modus wandern nicht mit.** Was du zum
  Ausprobieren gespielt hast, bleibt in deinem Browser liegen und taucht in
  der gemeinsamen Runde nicht auf. Einfach neu anfangen.
- **Die Verwaltung ist freigeschaltet:** Mit dem Passwort lassen sich
  Mitspieler aus der Runde entfernen und fremde Partien löschen — zu finden
  im Tab Einstellungen unter „Spieler".

## v0.4.0 — 23.08.2026

**Ein eigenes Zeichen: Springer und Funke.**

- Blunderluck hat sein eigenes App-Zeichen — ein weisser Springer auf blauem
  Grund, dazu ein goldener Funke für das Glück. Bisher stand dort noch der
  geerbte Würfel des Quizz.
- Zu sehen im Lesezeichen des Browsers und auf dem Startbildschirm, wenn du
  die Seite dort ablegst. **Wer sie schon abgelegt hat, muss sie einmal
  entfernen und neu hinzufügen** — Handys merken sich das alte Bild.

## v0.3.0 — 23.08.2026

**„Ich bin raus" — den eigenen Eintrag selbst löschen.**

- Neuer Knopf in der Karte „Spieler" im Tab Einstellungen: Wer nicht mehr
  mitspielen will, entfernt sich selbst aus der Runde — ohne das
  Verwaltungs-Passwort bemühen zu müssen. Zur Sicherheit fragt der Knopf
  beim ersten Druck nach und löscht erst beim zweiten.
- Beendete Partien bleiben in der Chronik stehen; nur der Name verschwindet
  aus Spielerliste und Rangliste. Wer später wiederkommt, fängt neu an.
- Hintergrund: Das gehört zu den Weichen für einen möglichen späteren
  Play-Store-Weg (dort ist Konto-Selbstlöschung Pflicht) — eingeordnet in
  der ROADMAP unter „Fernziele / Play Store".

## v0.2.0 — 23.08.2026

**Blunderluck ist jetzt zu 100 Prozent Schach — der letzte Würfel-Rest ist
raus.**

- Die aus dem Quizz geerbte Würfel-Schicht (die unsichtbar die Anmeldung
  erledigte) ist durch eine eigene, schlanke Spielerverwaltung ersetzt:
  `spieler.js` (Namen und PIN-Prüfsummen) und `anmeldung.js` (Anmelde-Dialoge,
  Profil, Verwaltung). Kein Würfel-Code mehr im Projekt.
- **Neu im Tab Einstellungen:** die Karte „Spieler" — Profil öffnen (Name
  oder PIN ändern) und die Verwaltung ein- und ausschalten. Mit aktiver
  Verwaltung lassen sich Mitspieler dort entfernen. (Im Quizz waren diese
  Knöpfe seit dem Ausbau des Würfel-Tabs gar nicht mehr erreichbar.)
- Am Anmelde-Ablauf selbst ändert sich nichts: Name beim ersten Öffnen,
  PIN-Pflicht, Wiedereinstieg von jedem Gerät über die Namensliste.
- Die Rangliste zählt unverändert nur Schachpartien.
- **Die App beschreibt sich jetzt richtig:** „Schach mit Lootboxen" statt
  „Team Schach für die Runde" — im Namen auf dem Startbildschirm, im README
  und in der Projekt-Doku. Der Team-Modus ist eine Einstellung unter anderen,
  nicht das, was das Spiel ausmacht.

## v0.1.0 — 23.08.2026

**Blunderluck ist da: das Team Schach aus dem Quizz als eigene App.**

- Das komplette Team Schach ist aus dem Quizz-Projekt herausgelöst und
  eigenständig: alle Spielarten, Fähigkeiten, die Bildanleitung, „Schach
  lernen", der 3D-Look mit den Spielzeug-Figuren — alles wie gewohnt.
- Würfel Quizz und Imposter sind nicht mit umgezogen; sie bleiben im Quizz.
  Die Rangliste zählt hier deshalb nur noch Schachpartien.
- Anmeldung wie gehabt: Name beim ersten Öffnen, optional eine PIN.
- Die App startet im Lokal-Modus (jeder Browser für sich). Die gemeinsame
  Datenbank, die Web-Adresse und das Verwaltungs-Passwort werden mit der
  Erstveröffentlichung eingerichtet — bis dahin ist Blunderluck eine
  Baustelle ohne Mitspieler.
- Das Quizz selbst bleibt unverändert auf seinem Stand (v0.122.0) und läuft
  weiter; dort wird nicht mehr weitergebaut, neue Schach-Wünsche landen hier.
