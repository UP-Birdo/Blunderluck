# Blunderluck — Architektur / Startbildschirm, Leiste, Fussleiste, Zugang

Wie man in die App hinein, in eine Runde hinein und wieder heraus kommt — und
wo die Knöpfe dafür sitzen. Diese Datei ist am 24.08.2026 aus der `CLAUDE.md`
hierher gezogen worden: Sie beschreibt den gebauten Stand eines Bereichs, nicht
eine Regel, die jede Arbeit betrifft. Wer an Start, Leiste, Fussleiste oder
Zugang baut, liest sie; wer am Schachmodell baut, braucht sie nicht.

## Die Leiste — Aufgaben / Fähigkeiten / Start / Rangliste / Anpassen (seit v0.144.0)

**Seit v0.144.0 steht ganz rechts „Anpassen"** statt des Platzhalters
„Bald" (UPCrew-Angleichung Runde 3): `js\anpassen.js` baut die Kopfzeile
(wie „Fähigkeiten", klebt oben) und übergibt den Rest dem gemeinsamen
Baustein `js\upcrew-anpassen.js` (`UPCREW_ANPASSEN.zeigen`, mit
`app: "blunderluck"`, Stufe und Werkstatt aus `js\freischaltung.js` und dem
eigenen Regal „Brett" 2D/3D). Beim Verlassen baut `TABS` ihn über den neuen
Haken `tab.beimVerlassen()` wieder ab. Seine klebende Knopf-Leiste unten hält
Abstand zur Tab-Leiste (`.anpassen .upa-aktion` in `css\stil.css`). Die
Wörter der Leiste schrumpfen unter 420 px Breite mit (`min(0.75rem,
2.85vw)`), damit sie in jeder Crew-Schrift passen.

Der Abschnitt unten beschreibt den Stand von v0.142.0; nur der fünfte Platz
hat sich seither geändert.

### Stand v0.142.0 — Aufgaben / Fähigkeiten / Start / Rangliste / Bald

**Seit v0.142.0 wie in Typoluck** (UPCrew-Angleichung Runde 2,
`Design\3D-Schrift\docs\AUFTRAEGE-RUNDE-2.md`): fünf Plätze in der unteren
Leiste, Start in der Mitte — `js\herausforderungen.js` („Aufgaben", vorerst
ein Platzhalter-Bildschirm „Herausforderungen"), `js\faehigkeiten.js` (die
Bibliothek als Seite), `js\start.js`, `js\rangliste.js` und der ausgegraute
Platz `BALD`. Je Eintrag Symbol (`tab.zeichen`, Pfad in `ZUSTAND.ZEICHEN`)
über dem Wort, aktiv in `--haupt` mit Strich oben. Die Leiste steht **auf
jeder Breite unten und auf jedem Bildschirm**, auch in den Fenstern
(Partie, Einstellungen, Profil); zurück geht es dort über den Pfeil in der
Kopfzeile (`ZUSTAND.alsZurueck`). Bis v0.141: drei Tabs (Fähigkeiten /
Start / Rangliste, seit v0.9.0), am Rechner oben, in Fenstern ausgeblendet.

Team Schach, Einstellungen und Verwaltung sind Tabs **ohne** Leisten-Knopf
(`inLeiste: false`) — betreten werden sie über den Spielen-Knopf bzw. das
Menü; in der Leiste markieren sie „Start" (`tab.leisteBei`, ohne Angabe
„start").

Zwei Regeln hängen daran:

- **Während der laufenden Partie zeigt die App nur das Brett** (F10) —
  keine Leiste, kein Ausgang. In v0.142.0/v0.143.0 stand die Leiste auch
  dort (Auftrag „immer sichtbar"); seit v0.143.1 ist sie in der laufenden
  Partie wieder weg (Nutzer 26.09.2026: „in Partie ausblenden"). Erkannt an
  `body.partie-fest`, der festen Seite der laufenden Partie.
- **Je Person läuft höchstens eine Partie** (F11,
  `TEAM_SCHACH._zweitePartieVerhindern`).

Der Wiedereinstieg in die eigene laufende Partie läuft über
`SCHACH_TAFEL.eigeneLaufende`.

## Der Start ist die Schaltzentrale (v0.14.0 bis v0.21.0)

Aus dem Umbau-Schwung vom 24.08.2026, je eine Auslieferung pro Nutzer-Ansage
(Ansagen 1 bis 8, Wortlaut in der `TODO.md` unter „Erledigt"):

- **„Spielen" legt die Runde an** (`TEAM_SCHACH.rundeStarten`) — kein
  Namens-Dialog, kein Zwischenschritt. Runden haben KEINEN eigenen Namen mehr,
  nur den Titel ihrer Spielart.
- **Was gespielt wird, hält der Start als Geräte-Erinnerung:**
  `START._spielart()` und `START.regeln()` / `regelnMerken(...)`. Beide
  Einstell-Bildschirme schreiben nur dorthin, keiner legt an. Der Start hält
  also die WAHL, nicht die Runde.
- **Die Vorschau ist ein Knopf** und führt zur Auswahl, das **Pfeil-Quadrat**
  ebenfalls — seit v0.121.0 in DENSELBEN Bildschirm, nur in einen anderen
  Reiter (Abschnitt „Die neue Runde" unten). Von v0.21.0 bis v0.120.1
  waren es zwei Bildschirme (Wunsch 8). Einstiege sind `brettformOeffnen`
  (Vorschau, Reiter „brett") und `partieAnlegen` (Pfeil, Reiter „gegner");
  `auswahlSchliessen` merkt die Regler.
- **Oben rechts stand eine Icon-Reihe** (Verlauf, Freunde, Zahnrad) — sie ist
  seit v0.103.0 durch EINEN Knopf ersetzt, das Menüband (eigener Abschnitt
  weiter unten). Die Freundesliste ist weiterhin eine Seite innerhalb des
  Starts (`START.freundeOffen`), ebenso der Verlauf (`START.verlaufOffen`).
- **Der stille Knopf „Runde beitreten"** führt zum Zwischenbildschirm — er ist
  seither NUR noch der Weg hinein in fremde Runden.
- **Es gibt keinen Kopfbalken mehr** (seit v0.25.0): Der Stand des Abgleichs,
  die Version und der Wunsch-Knopf sind der Reihe nach in die Einstellungen
  gezogen; die `h1` steht unsichtbar im `body`.

## Die neue Runde — ein Bildschirm, drei Reiter (seit v0.121.0)

Nutzer-Ansage 24.09.2026: „das Grundeinstellungen-Menü überarbeiten:
weniger Texte, mehr Bilder, einfachere Navigation" — gewählt hat er „ein
Bildschirm, drei Reiter" und danach angenommen („ne lass es so passt"). Alles in
`js\team-schach-uebersicht.js`, der Stil am Ende von `css\stil-brett.css`.

- **Aufbau** (`_auswahlZeichnen`): klebender Kopf (Zurück, „Neue Runde",
  Dauer-Zeile `_regelnDauerBauen` wie seit v0.116.0), die Reiter-Leiste
  (dieselben Klassen wie im Profil, `profil-reiter`), der Inhalt des
  offenen Reiters und unten klebend „Spielen" (`auswahlSpielen` →
  `START.spielen`, damit Sperre und „Wird angelegt …" an einer Stelle
  bleiben). Der offene Reiter steht in `TEAM_SCHACH.auswahlTeil`
  (`AUSWAHL_REITER`: brett, gegner, lootboxen; der alte Wert „regeln"
  wird zu „gegner").
- **Brett** (`_brettReiterBauen`): Form als Bild-Reihe, darunter die
  Kacheln der Form zu zweit (`_spielartKachelBauen(variante, gewaehlt)` —
  schlank, die gewählte hervorgehoben; ein Tipp merkt nur und bleibt),
  Figurenzahl (`_armeeStaerkeLeisteBauen`, unverändert), Aufstellung
  (Gewohnt / Zufall, bei Zufall Beide gleich / Verschieden).
- **Gegner** (`_gegnerReiterBauen`): Menschen / Computer, bei Computer die
  Stärke, sonst „Wer sieht die Runde?"; „Wer spielt Weiss?" (Zulosen /
  Selbst wählen); „Ziehen im Team" (Alle einig / Wer zuerst zieht —
  gespeichert weiter `einigkeit`).
- **Lootboxen** (`_lootboxReiterBauen`): Ohne / Mit, der Knopf „Alle
  Fähigkeiten ansehen" (Bibliothek, `infoSchliessen` führt in denselben
  Reiter zurück); mit Lootboxen: Menge, Items (drei Mengen + „selbst
  wählen …" wie seit v0.105), „Sieht man, was drin ist?" (Verdeckt /
  Farbig — schreibt `seltenheitZeigen` UND `pechZeigen`, v0.115.3).
- **Jede Wahl ist ein Segment-Schalter mit Bildern** (`_bildReiheBauen`):
  das Muster der Figurenzahl-Reihe — Bild oben, Wort darunter, die blaue
  Pille gleitet. Jede Reihe hat EIGENE Klassen (`<name>-leiste`,
  `<name>-knopf`) und einen eigenen Pillen-Namen
  (`reihen-pille-<name>`): Zwei gleichnamige Pillen bricht der Browser ab.
  Bilder: 3D-Figuren (`_figurBildBauen`, `img\figuren\`), Lootboxen
  (`_wuerfelBauen`) und Linienzeichen (`_zeichen`, `_staerkeZeichen`).
- **Ein i je Frage** (`_abschnittBauen`, Kopf `leisten-kopf`), die Sätze
  darin sind die der früheren Haken-Zeilen.
- **Bewusst anders als vorher:** Bis v0.120.1 galt „keine erfundenen
  Zeichen für die Haken ohne Lootbox" — ein Zeichen allein wäre ein
  Rätsel. Seit v0.121.0 steht unter jedem Zeichen sein Wort; der Nutzer
  hat ausdrücklich „mehr Bilder" verlangt.

## Das Menüband oben rechts (seit v0.103.0)

Nutzer-Ansage 27.08.2026: „statt den ganzen icons ein menü band … was von
aussen 3 balken sind und dahinter verstecken sich alle weiteren punkte".
Oben rechts steht seither **genau ein Knopf** mit drei Balken; ein Tipp
klappt darunter ein Feld mit fünf Punkten auf, jeder mit seinem Zeichen
links und der Beschriftung rechts:

| Punkt | Führt zu | Zeichen |
|---|---|---|
| Profil | `RANGLISTE.eigenesProfilOeffnen("start")` — seit v0.119.0 die Profilseite (Abschnitt unten); bis v0.118.0 das Popup `ANMELDUNG.profilOeffnen()` | `_profilZeichenBauen` (neu) |
| Freunde | `START.freundeOeffnen()` | `_freundeZeichenBauen` |
| Verlauf | `START.verlaufOeffnen()` | `_verlaufZeichenBauen` |
| Schach lernen | `TEAM_SCHACH.grundlagenOeffnen()` | `_lernenZeichenBauen` (neu) |
| Einstellungen | Tab `einstellungen` — seit v0.120.1 ganz unten (Nutzer-Ansage 24.09.2026) | `_zahnradBauen` |

Alles dazu wohnt in `js\start.js` (`_menuePunkte`, `_menuebandBauen`,
`menueUmschalten`), der Stil in `css\stil-start.css` (`.start-menue…`, die
Bewegung im `no-preference`-Block am Dateiende).

- **Profil ist ein eigener Punkt geworden.** Es bleibt zusätzlich in den
  Einstellungen, Karte „Spieler" — dieselbe Funktion, zwei Wege.
- **„Schach lernen" ist vom Beitritts-Bildschirm hierher gezogen** (ROADMAP
  Punkt 36: „soll wo ander hin aber nicht bei runde beitreten"). Im Kopf von
  `team-schach-uebersicht.js` steht an seiner Stelle nur noch der Vermerk;
  der Bildschirm selbst (`team-schach-grundlagen.js`) ist unverändert.
- **Der Aussenklick ist nach dem Muster des Eck-Menüs gebaut** (v0.96.0,
  `TEAM_SCHACH.eckMenueUmschalten` / `_eckMenueAussenklick`): Merker,
  `document`-Horcher nur solange offen, `dataset`-Marke am Halter. Bewusst
  NACHGEBAUT statt geteilt — beide Seiten zeichnen verschieden neu.
  **Ein Unterschied:** Dort liegen die Knöpfe IM Kasten-Knopf und müssen ihr
  Ereignis stoppen; hier sind Balken-Knopf und Liste Geschwister im selben
  markierten Halter, also kein `stopPropagation`.
- **Die Optik ist `ui.watermelon.sh` abgeschaut, nicht eingebunden** (React
  und Tailwind wären ein Technologie-Wechsel): rundes Feld, weicher
  Schatten, ruhiger Hover, kurzes Einblenden — alles aus den vorhandenen
  Variablen.

## Das Kurzprofil oben links (seit v0.120.0)

Nutzer-Ansage 24.09.2026: „Das Profil soll kompakt auf der Startseite oben
links im Eck stehen, wo dein Name steht, mit Platz und Punkte, ganz links
gross." Die oberste Zeile des Starts ist seitdem `.start-oben`: links
`START._kurzprofilBauen()` (ein Knopf `.start-profil`), rechts unverändert
`.start-kopf` mit dem Menüband.

- **Inhalt:** ganz links der grosse Kreis mit dem Anfangsbuchstaben
  (dieselbe Klasse `visitenkarte-bild` wie auf der Profilseite, 48 px),
  daneben Name und darunter „Platz 1" und „522 Punkte" — die Zahlen gross.
  Die Werte liefert `RANGLISTE.kurzprofil(id)` (dieselbe Zählung wie die
  Tabelle über `gesamt` und `_platzVon`). Ohne Anmeldung fehlt das Feld;
  steht man nicht (mehr) in der Spielerliste, bleibt nur der Name.
- **Tipp:** `RANGLISTE.eigenesProfilOeffnen("start")` — „Zurück" führt
  wieder zum Start.
- **Warum neben und nicht in `.start-kopf`:** Der Kopf trägt genau einen
  Knopf, das Menüband; ein Test wacht darüber („oben rechts EIN Knopf").
  Der Menüpunkt „Profil" bleibt trotzdem — zwei Wege zur selben Seite.

## Die Seite wird zugelost — und der Wahl-Bildschirm entfällt (seit v0.66.0)

**Die Regel `seiteZufaellig` ist ab Werk AN.** Dann gibt es den
Seitenwahl-Bildschirm nicht: `TEAM_SCHACH._seiteZulosenWennNoetig` teilt beim
Öffnen zu (`SCHACH_RUNDE.seiteZulosen`), und **die Zuteilung IST die erste
Bereitschaft** — es bleibt nur noch die zweite, die anpfeift.

- **Zugeteilt wird nur, wenn eine Seite LEER ist.** Wer bei einer vollen
  Runde hereinschaut, bleibt Zuschauer.
- **Gelost wird gerechnet, nicht gewürfelt** (`_zufallsWert` aus Partie-Kennung
  und Person) — eiserne Regel, sonst sähe jedes Gerät etwas anderes.
- **Wer wartet, wartet im Vorraum am Brett:** `inAufstellung(runde,
  spielerId)` ist mit dem Haken schon wahr, sobald die eigene Seite steht.
  Der Vorraum zeigt dann Einladen-Block und Brett, und statt „Bereit" den
  Computer-Ausweg — ein „Bereit", das nichts bewirken kann, wäre eine Lüge.
- **Das „Zurück" führt aus der Runde** (seit v0.115.0 in jeder Runde): Es
  gibt keinen Bildschirm mehr davor. Ohne diese Regel räumte sich eine
  angelegte Runde nie wieder weg (ein Test hat es gefangen).
- **Alte Partien gelten als AUS** (`=== true` beim Normalisieren) und behalten
  ihren Ablauf.

## Vor dem Anpfiff: der Vorraum (seit v0.115.0 — ein Bildschirm statt zwei)

**Eine wartende Partie ist der Vorraum.** `_partieZeichnen` verzweigt bei
`!laeuft && !ergebnis` nach `_vorraumZeichnen`. Bis v0.114.3 waren das zwei
Bildschirme — die Seitenwahl (v0.61.0, zweispaltig seit Punkt 49) und die
Aufstellung (v0.62.0, nur mit Zufallsarmee). Der Testlauf vom 18.09.2026
mass sieben Befunde daran (`docs\entwurf-vorraum.md`), der Nutzer liess
alle fünf Empfehlungen bauen. Bilder vorher/nachher: `docs\bilder\`.

**Der Aufbau ist in jedem Zustand derselbe**, von oben nach unten:

1. **Kopf:** „Zurück" links, der Titel der Spielart (`vorraum-titel`), der
   Item-Hinweis wie gehabt.
2. **Zustandszeile** (`_vorraumZustandBauen`, `vorraum-zustand`): ein Satz,
   worauf gewartet wird — „Warte auf einen Mitspieler …", „fr3ddy ist da —
   bereit?", „fr3ddy ist bereit — und du?", „Warte auf fr3ddy …" — mit
   einem leise pulsierenden Punkt, solange gewartet wird
   (`vorraum-punkt`, still bei `prefers-reduced-motion`).
3. **Einladen-Block** (`_vorraumEinladenBauen`, `vorraum-einladen`), NUR
   solange ein Platz frei ist und kein Computer ihn nimmt: Code gross
   (`vorraum-code`, weiter ein Knopf zum Fenster „Freunde einladen"),
   darunter **Teilen** (`navigator.share`, nur wo es das Menü gibt),
   **Kopieren** (`navigator.clipboard`, Rückfall: Kurzmeldung mit dem
   Code) und **Freund einladen** (nur mit eigener Seite, F17; nur wenn
   `_einladenKnopfBauen` etwas anzubieten hätte). Der geteilte Text ist
   `_einladungsText`: Code plus die Adresse, unter der die Seite läuft.
4. **Zwei Plätze** (`_vorraumPlatzBauen`, `vorraum-plaetze`): Weiss links,
   Schwarz rechts. Wählbar (ohne Zulosung, ohne eigene Seite) trägt der
   Platz den Team-Knopf wie bisher, sonst eine Beschriftung mit Farbpunkt
   (`vorraum-platz-kopf`) — kein Kopf, der wie ein Knopf aussieht und
   keiner ist. Leer sagt der Platz „frei" (`vorraum-platz-frei`); das
   Schildchen „bereit" meint die ZWEITE Zusage (`aufstellungBereit`).
   Wer was wählen darf, entscheidet weiter `_beitrittsWahlErmitteln`; der
   Zufall-Knopf steht über den Plätzen, wenn beide wählbar sind.
5. **Brett** (`_brettBauen`): fest oder gewürfelt — man sieht, was einen
   erwartet. Ohne Zufallsarmee war das Brett vor dem Anpfiff bis v0.114.3
   nie zu sehen.
6. **Regel-Schildchen** (`_regelSchildchenBauen`, `vorraum-regeln`):
   Lootboxen und Menge (oder „Ohne Lootboxen"), Items-Auswahl,
   Zufallsarmee/Feste Aufstellung, Armeestärke (wenn nicht normal), Seiten
   zugelost/wählbar, Team-Einigkeit, Computer und Stufe. Nur anzeigen —
   geändert wird VOR dem Anlegen (Pfeil-Quadrat am Start).
7. **Fuss** (`vorraum-fuss`): mit eigener Seite und vollem Raum der Würfel
   (nur bei Zufallsarmee, `_darfNeuWuerfeln`) und **„Bereit"** /
   „Doch nicht bereit" (`aufstellung-bereit`); allein wartend der Würfel und
   **„Niemand da? Gegen den Computer spielen"** (`gegenComputerWechseln`:
   `rundeStarten` mit denselben Reglern und `gegenComputer: true` — die
   eigene wartende Runde räumt `rundeStarten` seit v0.114.2 selbst weg).

**Zwei Zusagen je Seite — in JEDER Runde.** `bereit` heisst „ich bin mit
meiner Seite einverstanden" (mit Zulosung gibt sie die Zuteilung, sonst der
Tipp auf die Seite); `aufstellungBereit` heisst „ich bin auch mit dem Brett
einverstanden" und pfeift an (`aufstellungBereitSetzen` → `kannAnpfeifen`).
**Seit v0.115.0 verlangt `kannAnpfeifen` die zweite Zusage auch ohne
Zufallsarmee** — von Punkt 8 (27.08.2026) bis v0.114.3 pfiff dort die zweite
erste Zusage an, und der Eingeladene stand ohne Blick auf die Regeln vor dem
Brett. `inAufstellung` sagt entsprechend in jeder Runde ja, sobald beide
Seiten besetzt sind (mit Zulosung schon, sobald die eigene steht).

- **Wer die erste Zusage zurücknimmt, streicht BEIDEN die zweite.** Sonst
  pfiffe eine stehengebliebene Zusage später zu einem Brett an, das die
  andere Seite nie gesehen hat.
- **Der Würfel trifft die richtige Seite** (`SCHACH_RUNDE.armeeNeuWuerfeln`):
  Bei getrennten Armeen steigt nur der Zähler `armeeWurf` der drückenden
  Seite, sonst beide — die gemeinsame Armee wird aus Weiss gezogen und für
  Schwarz gespiegelt (v0.60.0), ein einzelner Zähler zerrisse das. **Bei
  Zähler 0 geht nichts in die Saat ein**, damit jede Partie von früher genau
  ihre Aufstellung behält.
- **Jedes Neu-Würfeln streicht beiden die zweite Zusage** — und der Computer
  erneuert seine sofort (`SCHACH_BOT.aufstellungBestaetigen`), denn er hat
  zum Brett keine Meinung. Der Computer bestätigt seine Aufstellung in
  jeder Runde beim Dazukommen — der Mensch drückt danach „Bereit".
- **„Zurück" ist „Runde verlassen"** (`_seitenwahlVerlassen`, Name geblieben)
  — mit Rückfrage über `DIALOG.frage`, nicht über `DIALOG.zweiSchritt`: Der
  zweite Schritt schreibt seine Frage IN den Knopf, und ein Knopf, der
  „Zurück" heisst, darf seine Beschriftung nicht unter dem Finger ändern.
  Ohne eigenes Team führt er ohne Rückfrage zur Übersicht. Eine Stufe
  zurück gibt es nicht mehr — es gibt nur noch einen Bildschirm.
- **Der Einladen-Knopf gilt auch im Match** (`_einladenKnopfBauen`, F19:
  Nachzügler dürfen herein) und ist deshalb ein eigener Baustein; er liefert
  `null`, wenn es weder einzuladende Freunde noch Wartende gibt.
- **Was von der Seitenwahl weiterlebt:** `_beitrittsWahlErmitteln`,
  `_teamKnopfBauen`, `zufaelligBeitreten`, die Listen-Klassen
  `seitenwahl-liste`/`-eintrag`/`-lage` und `seitenwahl-zufall`. Entfallen:
  `_seitenwahlZeichnen`, `_seitenwahlSpalteBauen`, `_aufstellungZeichnen`,
  `_aufstellungVerlassen`, `_einladungBlockBauen`, `team-knopf-schild`,
  `seitenwahl-code`.

## Die Fussleiste — zwei Lagen (v0.26.0, stark gekürzt in v0.61.0)

`_fussleisteBauen` trägt nur noch die beendete Partie (Neu aufstellen als
Revanche, Zur Übersicht) und den Zuschauer einer laufenden (Zur Übersicht). Für
den Mitspielenden im Match ist sie `null` — sein Zahnrad sitzt seit v0.59.0 in
der Spielerzeile. Die wartende Partie ruft sie seit v0.61.0 gar nicht mehr.

- **Wer die eigene laufende Runde offen hat, findet dort KEINEN Ausgang** —
  F10 gilt oben wie unten.
- **„Runde verlassen" schliesst die Runde, wenn danach beide Teams leer sind**
  (`teamVerlassen` → `_istVerwaist` → `_verwaisteRundeSchliessen`).
- **Beendete Runden bleiben immer** — an ihnen hängt die Rangliste.
- Eine angelegte, nie betretene Runde räumt sich beim „Zur Übersicht" weg
  (`TEAM_SCHACH.selbstAngelegt`, v0.29.0); `uebersichtOeffnen` ist dafür
  `async` geworden.

## In eine Runde kommt man über Code, Link, Einladung — oder die Liste der offenen Runden (v0.10.0 bis v0.118.0)

- **Der Beitritts-Code wird aus der Partie-Kennung GERECHNET**
  (`SCHACH_RUNDE.beitrittsCode`) und nie gespeichert.
- **Der Einladungslink (seit v0.117.0)** ist die Adresse der App plus
  `?code=…` (`TEAM_SCHACH.einladungsAdresse`); Teilen und Kopieren im
  Vorraum geben ihn mit. Beim Start liest `einladungsCodeAusAdresse` den
  Code grosszügig (wie das Code-Feld), `einladungAusAdresseAnnehmen` führt
  nach der Anmeldung in die Runde und bereinigt die Adresse — es läuft in
  `ANMELDUNG.beiAngemeldet` (`app.js`) VOR dem Wiedereinstieg. Der
  Service-Worker beantwortet solche Adressen dank `ignoreSearch` offline.
- **Einladungen liegen additiv in der Partie** (`eingeladen`,
  `SCHACH_RUNDE.istEingeladen`).
- **Die Sichtbarkeit einer Runde (seit v0.118.0)** steht in
  `regeln.sichtbarkeit`: `oeffentlich` / `freunde` / `privat`
  (`SCHACH_RUNDE.SICHTBARKEITEN`). Die Vorgabe des MODELLS ist `privat` —
  damit eine Runde von vor v0.118.0, die das Feld nicht hat, bleibt, was sie
  war: nur per Code erreichbar. Die Vorgabe des BILDSCHIRMS
  (`_regelnVorgabe`) ist `oeffentlich` und wird beim Anlegen ausdrücklich
  mitgeschrieben. `sichtbarFuer(runde, personId, istFreund)` entscheidet,
  wer sie sieht; ob jemand ein Freund ist, weiss nur die Spielerliste —
  deshalb bekommt das Modell eine Frage-Funktion und keine Spielerdaten.
  Karte „Wer sieht die Runde?" in den Grundeinstellungen
  (`_sichtbarkeitLeisteBauen`), Schildchen im Vorraum.
- **Die Karte „Offene Runden" unter „Runde beitreten" (seit v0.118.0,
  `_offeneRundenBauen`)** zeigt wartende Runden (nicht gestartet, nicht
  beendet, man sitzt nicht selbst darin), die `sichtbarFuer` freigibt — mit
  Namen, Spielart, Schildchen „Freund"/„Öffentlich" und „Beitreten"
  (`partieOeffnen`, derselbe Weg wie der Code). Geladen sind alle offenen
  Runden ohnehin (Ladeweg seit v0.114.3).
- **Die Freundesliste wird GELESEN, nie in fremde Einträge geschrieben**
  (`js\freunde.js`, Modell in `spieler.js`: `freunde` / `abgelehnt`). Anfragen
  entstehen aus dem Vergleich beider Sichten (`SPIELER.freundschaft`) — das ist
  dieselbe Denkweise wie beim Zusammenführen der Spielerliste: Jeder ist Herr
  über seinen eigenen Eintrag.

## Die Profilseite — Visitenkarte, Abzeichen, Statistik (seit v0.119.0, kompakt seit v0.119.1)

Nutzer-Ansage 18.09.2026: Profil als ganze Seite statt Popup, drei
Abzeichen, „coole" Statistiken, Namen überall anklickbar, Freundanfragen
vom Profil. Gebaut auf der Spieler-Profilseite der Rangliste
(`js\rangliste.js`), die es seit Quizz-v3.3 gab:

- **Einstiege:** `RANGLISTE.profilOeffnen(spielerId, rueckweg)` von überall
  — `rueckweg` ist der Tab, aus dem man kam, und `profilSchliessen` führt
  dorthin zurück (ohne Rückweg in die Wertung). `eigenesProfilOeffnen`
  für Menüband und Einstellungen. `TEAM_SCHACH._nameKnopfBauen(id, klasse)`
  macht jeden Namen zum Knopf (`.name-inline`): Vorraum-Plätze, Abschluss,
  Partie-Karten, Freundesliste (`_zeileBauen` mit `id`), offene Runden.
  Der Computer hat kein Profil und bleibt Text.
- **Aufbau seit v0.119.1** (Nutzer-Ansage 24.09.2026: „zu überladen …
  Untermenüs oder Popups, wie andere Spiele-Apps"): EINE Kopfkarte, darunter
  drei Reiter, Einzelheiten im Popup. `_profilZeichnen` baut klebenden Kopf
  (Zurück, Titel, beim eigenen Profil „Bearbeiten" = `profilBearbeiten`,
  ein `DIALOG.liste` aus `_bearbeitenEintraege`: Abzeichen wählen, Name
  ändern, Passwort ändern), Kopfkarte, Reiter-Leiste und den Inhalt des
  offenen Reiters. Welcher offen ist, merkt `profilReiter` (reines
  Anzeige-Gedächtnis; `profilOeffnen` setzt auf „statistik" zurück).
- **Kopfkarte** (`_visitenkarteBauen`, Klasse bleibt `karte visitenkarte`):
  Kreis mit Anfangsbuchstaben, Name, Platz (`_platzVon`) und „dabei seit"
  (Datum der ersten beendeten Partie — die Spielerliste kennt kein
  Anlegedatum), Punkte; vier Kurzwerte (Partien, Siege, Quote, Serie);
  Bilanz-Balken mit Form der letzten `PROFIL_FORM_LAENGE` Ergebnisse
  (`_bilanzBauen`; seit v0.120.0 beschriftet mit „Letzte N" und
  ausgeschrieben „12 Siege · 1 Remis · 1 Niederlage" über `_ausgangWort` —
  „Form" und „S/R/N" allein verstand der Nutzer nicht); drei Abzeichen-Plätze — eigenes Profil: antippen führt
  zu `abzeichenWaehlen`; fremdes Profil: der Freundschafts-Knopf
  (`_freundschaftBauen`) in den vier Lagen von `SPIELER.freundschaft`,
  geschrieben über `FREUNDE`.
- **Die drei Reiter** (`PROFIL_REITER`): Statistik (`_statistikReiterBauen`,
  Wert-Zeilen `dl.profil-werte`; Siege/Remis/Niederlagen stehen nur im
  Bilanz-Balken), Abzeichen (`_abzeichenReiterBauen`, Raster mit vier
  Spalten, antippen = `_abzeichenZeigen`), Partien (`_partienReiterBauen`,
  je Partie eine Zeile `_verlaufZeileBauen`, antippen = `_partieZeigen` mit
  Dauer, Zügen, Beute und Mitspielern; erst `PROFIL_PARTIEN_ANFANG` = 8,
  dann „Alle N Partien zeigen"). Stil: Block „Die Profilseite" in
  `css\stil.css`.
- **Statistik** (`RANGLISTE.statistik`): aus `verlauf` in Spielreihenfolge
  — Serien, Comebacks, schnellster Sieg, längste Partie, Züge, Zeit,
  Beute, Lieblings-Brett, häufigster Gegner. Nichts wird gespeichert.
- **Abzeichen** (`RANGLISTE.ABZEICHEN`, 14 Stück): jedes eine
  `pruefen(statistik)`-Regel — VERDIENT wird gerechnet, nie vergeben.
  Gespeichert wird nur die Wahl fürs Schaufenster: `spieler.abzeichen`
  (additiv, höchstens `SPIELER.ABZEICHEN_PLAETZE` = 3, `abzeichenSetzen`,
  mit Zusammenführung). `gezeigteAbzeichen` zeigt nur, was gewählt UND
  verdient ist — schrumpft die Chronik, steht nichts Erlogenes da.

## Die Karten-Leiste unten (seit v0.128.0)

**Nutzer-Ansage 24.09.2026** (mit Bildschirmfoto aus Clash Royale): unten kein
eigener Namens-Kasten mehr, oben nur der Gegner; die Fähigkeiten als grosse
Karten wie im Vorbild, statt des pinken Balkens ein Rollbalken, „damit die
Karten durchrotieren".

`TEAM_SCHACH._handLeisteBauen` ersetzt für die EIGENE Seite in einer
laufenden Partie die untere Seiten-Zeile (Zuschauer und beendete Partien
behalten sie). Aufbau: runder Menü-Knopf links (Initiale im Ring der eigenen
Farbe; öffnet über sich `_eckKnoepfeAnhaengen` — Einstellungen, Zugverlauf,
Team-Liste), rechts die Kartenreihe aus `_faehigkeitReiheBauen` als
waagerechter Rollbereich mit Einrasten (vier Karten füllen die Breite,
leere Plätze als `.hand-platz`), darunter `.hand-rollbalken`: Griffbreite =
sichtbarer Anteil, Tippen/Ziehen rollt (`_handRollenAnbinden`). Die Lage
merkt `TEAM_SCHACH._handRollen`, weil der Bildschirm bei jedem Abgleich neu
gebaut wird. Am Zug leuchtet der obere Rand (`hand-leiste-amzug`) — das war
vorher der blaue eigene Kasten. Seitdem füllt der Tab-Bereich im Spiel die
Höhe (`.tab-bereich-zeigt:not([hidden])`), die Leiste steht am Fuss.

## Das Brett in echtem 3D (seit v0.122.0)

**Auftrag (Nutzer, 24.09.2026):** das Brett nachbauen, die Lootboxen als echte
3D-Blöcke darüber schweben lassen, Mulden statt Vorschau-Punkte, am Ende
keine 2D-Dinge mehr — „keine Einbussen, man soll genauso schnell ziehen“.

**Die Bauweise — Leser, nicht Rechner.** `js\brett-3d.js` ist ein ES-Modul
(Importmap in `index.html`, three.js aus `js\lib\three\`). Es wird am Ende von
`_partieZeichnen` und in `_vorraumZeichnen` mit `window.BRETT_3D.anbinden(halter,
partie, person)` gerufen und LIEST die frisch gebauten Feld-Knöpfe des
2D-Bretts: Klassen (`feld-ziel`, `feld-schlag`, `feld-spur*`, `feld-schach`,
`feld-matt`, `feld-wahl`, `feld-vorschau`, `feld-mauer`/`mauer-senkrecht`,
`feld-frost`, `feld-schild`, `feld-fessel`, `feld-geliehen`, `feld-riss`,
`feld-ausserhalb`, `feld-wirkung*`, `feld-vorschlag-*`), die Figur-Spans
(`figur-art-*`, `figur-weiss/schwarz`, `figur-schemen`, `figur-getruebt`), das
Lootbox-Bild (`lootbox-<stufe>[-pech].png`), die Restzeit und die
Randbeschriftung. Ein Tipp auf die Leinwand trifft per Strahl zuerst Figuren
und Boxen, sonst die Kachel-Ebene, und ruft `knopf.click()` auf dem
passenden Knopf — `feldAngetippt` läuft wie immer. Gesperrte Knöpfe
(`disabled`) klicken nicht.

**Daraus folgt:** Wer eine neue Feld-Markierung baut, baut sie im 2D-Brett
wie bisher; im 3D-Brett fehlt sie, bis `felderAbgleichen` ihr einen Auftritt
gibt. Nichts rechnet doppelt. Die 2D-Knöpfe bleiben unsichtbar im Dokument
(`opacity: 0`, `pointer-events: none` — nicht `display: none`, sonst fehlt
`_brettEinpassen` die Grösse).

**Die Leinwand lebt weiter.** Der Bildschirm baut sich bei jedem Abgleich neu
auf; die Leinwand wird nur in den neuen `.brett-rahmen` umgehängt. Bewegt wird
nur, was sich geändert hat: bekannter Zug aus
`TEAM_SCHACH._letzterBewegungsEintrag` (auch `wege`), sonst die nächste
gleiche Figur im Umkreis von drei Feldern; übrig Gebliebenes fliegt vom Brett
(geschlagen) oder vergeht, Neues erscheint. Gezeichnet wird nur, solange
sich etwas bewegt (Tweens, Partikel, schwebende Boxen, Puls).

**Die Formen** kommen aus `modelle\blunderluck-modelle.glb`, gebaut von
`Design\Blunderluck-3D\tools\Modelle-Exportieren.py` (kopflos, ohne
Material). Farben, Oberflächen und Brett entstehen im Modul — darum lassen
sie sich live umstellen (Leiste hinter dem Paletten-Knopf, Gerätespeicher
`blunderluck.brett3d`). „Flaches 2D-Brett“ schaltet ab; ein Knopf „3D“ am
flachen Brett schaltet zurück. Ohne WebGL oder in den Tests (keine Module)
gibt es das 3D-Brett nicht, und alles läuft wie vorher.

**Kein Rand, fliegende Schrift (seit v0.124.0).** Das Brett hat weder
Sockel noch Rahmen, nur Steine. Die Beschriftung kommt aus dem 2D-Rand
(`.brett-rand-reihen/-spalten`) und wird als `TextGeometry` gebaut
(Schrift `js\lib\three\addons\fonts\brett-schrift.typeface.json`, nur die
Zeichen a–p, A–P, 0–9 — wer andere Zeichen braucht, kürzt die Droid-Schrift
neu). Sie schwebt links und unten, wiegt sich in einer Welle und dreht sich
jedes Bild zur Kamera; dafür läuft der Bild-Takt dauerhaft (wie bei den
Lootboxen), ausser bei „weniger Bewegung".

**Keine Durchdringung** (Haus-Regel für 3D): Züge im Bogen, Erscheinen auf
der Oberfläche, Mulde unter der Figur, Frost als Reif statt Block, Schild als
Glocke, Nudelholz-Figuren hüpfen über die Walze.

**Die kleinen Bretter (seit v0.123.0).** Alles, was ein `.vorschau`-Gitter
baut, reicht es an `TEAM_SCHACH._standbild3d(el)`; `BRETT_3D.standbild`
liest es mit derselben `zelleLesen` wie das grosse Brett und hängt ein
`img.vorschau-3d-bild` hinein. Ein zweiter Renderer (unsichtbar,
`preserveDrawingBuffer`) rendert orthografisch 30° geneigt; die Kamera deckt
links/rechts die Brettkanten, unten die Vorderkante der Steinoberseiten,
oben die Hinterkante plus 0,8 Zellen. Weil die Projektion der Ebene linear
ist, liegt nach dem Strecken auf Gittergrösse jeder Stein auf seiner Zelle —
Hand und Pfeile der Anleitung bleiben im Gitter und treffen. Das Bild ragt
oben über das Gitter (`overflow: visible`). Zwischenspeicher nach Inhalt
(Klassen, Figuren, Boxen, Aussehen), höchstens 80 Bilder.

**Die Figurenbilder (seit v0.123.0).** `figurenBilder()` rendert die zwölf
Figuren mit der Kamera des Liefervertrags (50°, Fuss bei 8 %, ein Massstab
für alle) und überschreibt per `<style id="figuren-3d-bilder">` die
Hintergrundbilder aus `css\stil-effekte.css`. Die PNGs in `img\figuren\`
bleiben der Rückfall ohne WebGL.

**Die Fähigkeitskarten als Plättchen (seit v0.127.0).** `plaettchenBilder()`
rastert jedes Linienzeichen (`FAEHIGKEIT_ZEICHEN.flachBauen`) samt Rahmen auf
eine Leinwand, zeichnet es weich (eigenes Kästchen-Weich, Safari kennt
`ctx.filter` nicht) und hebt damit die Punkte eines Netzes auf einer
gerundeten Karte an. Das Bild landet in `FAEHIGKEIT_ZEICHEN.plaettchen`;
`FAEHIGKEIT_ZEICHEN.bauen` liefert von da an ein `svg.faehigkeit-bild-3d`
mit dem Bild, das Linienzeichen bleibt der Rückfall. Die Stildatei nimmt
Rahmen und Grund der Karte per `:has()` zurück.

**Lootbox öffnen (seit v0.127.0).** `handZuwachs` vergleicht die Hände
(Fähigkeiten und Unglückskarten je Farbe) mit dem letzten Bild; eine
verschwundene Box nimmt sich daraus die Karte ihrer Art und Stufe
(`gewinnZuordnen`) und springt auf (`boxOeffnen`: Wände als Partikel, die
Karte als Sprite mit dem Plättchen-Bild, Flug zur Hand der Farbe). Ohne
Treffer zerplatzt sie wie vorher. Nichts wird dafür im Modell gemerkt.

**Der Friedhof als Grabsteine (seit v0.127.0, Nutzer-Wunsch).**
`friedhofAbgleichen` liest `SCHACH_RUNDE.bilanz(partie, farbe).verloren`
und stellt je Gefallenem einen Grabstein auf eine Ablage vor der Schrift:
links die obere Farbe, rechts die untere, wertvollste aussen und grösser;
reicht die Breite nicht, werden alle kleiner. Stein: `ExtrudeGeometry`
mit Bogen, nach hinten gelehnt um die hintere Fusskante (keine
Durchdringung). Die Gravur ist eine Farb- und Normalen-Karte aus dem
Seitenprofil der Figur (`profilMaske`, gerendert mit dem Mini-Renderer).
Im 3D-Brett setzt das Modul `body.brett-3d-aktiv`; die Stildatei blendet
damit die 2D-Friedhof-Klappe aus, Totenkopf und Zahl bleiben.
Nur in laufenden oder beendeten Partien (`Z.mitAblage`), dann rechnet
`blickSetzen` die Ablage in den Bildausschnitt ein. Eine Ablage hinten war
im Schrägblick verdeckt und ist verworfen.

**Kein Aufblitzen (seit v0.127.0).** `TEAM_SCHACH._brett3dAbwarten` setzt
`.brett-3d-wartet` (flaches Brett `visibility: hidden`), solange
`BRETT_3D.laedt()`; das Modul nimmt die Klasse ab, spätestens nach 6 s ein
Zeitgeber.

**Werkstatt:** `python tools\Werkstatt-3D-Server.py` → `http://localhost:8094`.
Der Server leitet `/` und `index.html` IMMER auf `_werkstatt-3d.html` um
(Modus „lokal“, Testkonto „Werkstatt“, wird nicht deployt) — die echte
Startseite kann dort nie mit dem Testkonto laufen.
`BRETT_3D._zustand.zeitlupe = 6` verlangsamt jede Animation zum Ansehen.

## Der 3D-Look ist dauerhaft an (seit v0.17.0)

`EINSTELLUNGEN.laden` setzt die Klasse `design-3d` einmal an den `body`, einen
Schalter gibt es nicht mehr. Figuren UND Lootboxen kommen als gerenderte PNGs
aus zwei Blender-Skripten in `tools\`; sie teilen Licht und Kamera. Vertrag und
Prüfliste stehen in [../FIGUREN-BLENDER.md](../FIGUREN-BLENDER.md).

**Folge fürs Aufräumen:** Die rund dreissig Regeln unter `body.design-3d`
(seit der Stil-Aufteilung v0.93.0 vor allem in `css\stil-effekte.css`) sind
seit v0.17.0 immer aktiv — die Klasse zu prüfen ist
sinnlos geworden. Der Aufräum-Punkt steht in der `ROADMAP.md`.
