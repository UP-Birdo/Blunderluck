# Blunderluck — Architektur / Startbildschirm, Leiste, Fussleiste, Zugang

Wie man in die App hinein, in eine Runde hinein und wieder heraus kommt — und
wo die Knöpfe dafür sitzen. Diese Datei ist am 24.08.2026 aus der `CLAUDE.md`
hierher gezogen worden: Sie beschreibt den gebauten Stand eines Bereichs, nicht
eine Regel, die jede Arbeit betrifft. Wer an Start, Leiste, Fussleiste oder
Zugang baut, liest sie; wer am Schachmodell baut, braucht sie nicht.

## Die Leiste — Fähigkeiten / Start / Rangliste (seit v0.9.0)

Drei Tabs hängen in der unteren Leiste: `js\faehigkeiten.js` (die Bibliothek
als Seite), `js\start.js` (der Startbildschirm) und `js\rangliste.js`.

Team Schach und Einstellungen sind Tabs **ohne** Leisten-Knopf
(`inLeiste: false`) — betreten werden sie über den Spielen-Knopf bzw. das
Zahnrad.

Zwei Regeln hängen daran:

- **Während der eigenen laufenden Partie zeigt die App nur das Brett** (F10) —
  keine Leiste, kein Ausgang.
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
- **Die Vorschau ist ein Knopf** und führt zur Brettform, das **Pfeil-Quadrat**
  zu den Grundeinstellungen — ein geteilter Bildschirm, gesteuert über
  `TEAM_SCHACH.auswahlTeil` („brett" / „regeln"). Einstiege sind
  `brettformOeffnen` (Vorschau) und `partieAnlegen` (Pfeil);
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

## Das Menüband oben rechts (seit v0.103.0)

Nutzer-Ansage 27.08.2026: „statt den ganzen icons ein menü band … was von
aussen 3 balken sind und dahinter verstecken sich alle weiteren punkte".
Oben rechts steht seither **genau ein Knopf** mit drei Balken; ein Tipp
klappt darunter ein Feld mit fünf Punkten auf, jeder mit seinem Zeichen
links und der Beschriftung rechts:

| Punkt | Führt zu | Zeichen |
|---|---|---|
| Profil | `ANMELDUNG.profilOeffnen()` (Name/Passwort) | `_profilZeichenBauen` (neu) |
| Einstellungen | Tab `einstellungen` | `_zahnradBauen` |
| Freunde | `START.freundeOeffnen()` | `_freundeZeichenBauen` |
| Verlauf | `START.verlaufOeffnen()` | `_verlaufZeichenBauen` |
| Schach lernen | `TEAM_SCHACH.grundlagenOeffnen()` | `_lernenZeichenBauen` (neu) |

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

## Die Seite wird zugelost — und der Wahl-Bildschirm entfällt (seit v0.66.0)

**Die Regel `seiteZufaellig` ist ab Werk AN.** Dann gibt es den
Seitenwahl-Bildschirm nicht: `TEAM_SCHACH._seiteZulosenWennNoetig` teilt beim
Öffnen zu (`SCHACH_RUNDE.seiteZulosen`), und **die Zuteilung IST die erste
Bereitschaft** — es bleibt nur noch die zweite, die anpfeift.

- **Zugeteilt wird nur, wenn eine Seite LEER ist.** Wer bei einer vollen
  Runde hereinschaut, bleibt Zuschauer.
- **Gelost wird gerechnet, nicht gewürfelt** (`_zufallsWert` aus Partie-Kennung
  und Person) — eiserne Regel, sonst sähe jedes Gerät etwas anderes.
- **Wer wartet, wartet am BRETT:** `inAufstellung(runde, spielerId)` ist mit
  dem Haken schon wahr, sobald die eigene Seite steht. Der
  Aufstellungs-Bildschirm trägt dann Code und Einladen, und statt „Bereit"
  einen Satz — ein Knopf, der nichts bewirken kann, wäre eine Lüge.
- **Das „Zurück" führt dort aus der Runde**, nicht eine Stufe zurück: Es gibt
  keinen Bildschirm mehr davor. Ohne diese Ausnahme räumte sich eine
  angelegte Runde nie wieder weg (ein Test hat es gefangen).
- **Alte Partien gelten als AUS** (`=== true` beim Normalisieren) und behalten
  ihren Ablauf.

## Vor dem Anpfiff: der Seitenwahl-Bildschirm (seit v0.61.0, nur ohne den Haken)

**Eine wartende Partie zeigt kein Brett.** `_partieZeichnen` verzweigt bei
`!laeuft && !ergebnis` sofort nach `_seitenwahlZeichnen` — dem ersten von zwei
Start-Bildschirmen der Nutzer-Skizze; der zweite (Brett plus Neu-Aufstellen)
ist seit v0.62.0 gebaut und steht im nächsten Abschnitt.

**SEIT PUNKT 49 (v0.113.0) STEHT ER ZWEISPALTIG.** Was dort steht, von oben
nach unten: der Kopf mit „Zurück" links (der einzige Ausgang) und dem
Beitritts-Code rechts (`seitenwahl-code` — ein Knopf, der „Freunde einladen"
öffnet); der Computer-Hinweis; der Zufall-Knopf über die volle Breite; und
darunter zwei Spalten zu je der Hälfte — links Weiss, rechts Schwarz, jede mit
ihrem Auswahl-Knopf oben und einer Liste darunter, die leer bleibt, bis sich
jemand einträgt.

- **Wer was wählen darf, entscheidet `_beitrittsWahlErmitteln`** — eine Stelle
  für drei Fälle: laufende oder beendete Partie gar nichts, wer schon bereit
  ist nichts mehr (v0.44.0), wer schon in einem Team sitzt nur noch seine
  eigene Seite und keinen Zufall (Punkt 8). Gebaut werden die Knöpfe an drei
  Orten, entschieden wird an einem.
- **Die Seite, die man nicht wählen kann, trägt ihren Kopf als Schild** statt
  als Knopf (`team-knopf-schild`) — sonst wäre nicht mehr erkennbar, welche
  Spalte welche ist.
- **Die zwei Spielerzeilen stehen hier nicht mehr** (bis v0.112.0 taten sie
  es): Wer auf welcher Seite sitzt, sagt jetzt die Liste ihrer Spalte. Am
  Brett und in der Aufstellung sind sie unverändert.
- **„Zurück" ist „Runde verlassen"** (`_seitenwahlVerlassen`) — mit Rückfrage
  über `DIALOG.frage`, nicht über `DIALOG.zweiSchritt`: Der zweite Schritt
  schreibt seine Frage IN den Knopf, und ein Knopf, der „Zurück" heisst, darf
  seine Beschriftung nicht unter dem Finger ändern. Ohne eigenes Team führt er
  ohne Rückfrage zur Übersicht.
- **Der Einladen-Knopf gilt auch im Match** (`_einladenKnopfBauen`, F19:
  Nachzügler dürfen herein) und ist deshalb ein eigener Baustein; er liefert
  `null`, wenn es weder einzuladende Freunde noch Wartende gibt.
- **„Neu aufstellen" steht nicht hier, sondern auf dem zweiten Bildschirm**
  (Nutzer-Entscheidung 25.08.2026).

## Vor dem Anpfiff, zweiter Schritt: die Aufstellung (seit v0.62.0)

Sobald beide Seiten besetzt und mit ihrer Seite einverstanden sind
(`SCHACH_RUNDE.inAufstellung`), zeichnet `_aufstellungZeichnen` das BRETT
zwischen den zwei Spielerzeilen, darunter den Würfel und die zweite Zusage.

- **Es gibt ZWEI Bereitschaften je Seite.** `bereit` heisst „ich bin mit
  meiner Seite einverstanden" und führt in die Aufstellung; `aufstellungBereit`
  heisst „ich bin auch mit dem Brett einverstanden" und pfeift an
  (`aufstellungBereitSetzen` → `kannAnpfeifen`). **`bereitSetzen` startet seit
  v0.62.0 keine Partie mehr** — wer das übersieht, sucht den Anpfiff an der
  falschen Stelle.
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
  zum Brett keine Meinung.
- **Das „Zurück" führt hier eine Stufe zurück**, nicht aus der Runde: Es
  nimmt die erste Zusage zurück. Hinaus kommt man auf dem Bildschirm davor.

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

## In eine Runde kommt man nur über Code oder Einladung (v0.10.0/v0.13.0)

- **Der Beitritts-Code wird aus der Partie-Kennung GERECHNET**
  (`SCHACH_RUNDE.beitrittsCode`) und nie gespeichert.
- **Einladungen liegen additiv in der Partie** (`eingeladen`,
  `SCHACH_RUNDE.istEingeladen`).
- **Die Freundesliste wird GELESEN, nie in fremde Einträge geschrieben**
  (`js\freunde.js`, Modell in `spieler.js`: `freunde` / `abgelehnt`). Anfragen
  entstehen aus dem Vergleich beider Sichten (`SPIELER.freundschaft`) — das ist
  dieselbe Denkweise wie beim Zusammenführen der Spielerliste: Jeder ist Herr
  über seinen eigenen Eintrag.

## Der 3D-Look ist dauerhaft an (seit v0.17.0)

`EINSTELLUNGEN.laden` setzt die Klasse `design-3d` einmal an den `body`, einen
Schalter gibt es nicht mehr. Figuren UND Lootboxen kommen als gerenderte PNGs
aus zwei Blender-Skripten in `tools\`; sie teilen Licht und Kamera. Vertrag und
Prüfliste stehen in [../FIGUREN-BLENDER.md](../FIGUREN-BLENDER.md).

**Folge fürs Aufräumen:** Die rund dreissig Regeln unter `body.design-3d`
(seit der Stil-Aufteilung v0.93.0 vor allem in `css\stil-effekte.css`) sind
seit v0.17.0 immer aktiv — die Klasse zu prüfen ist
sinnlos geworden. Der Aufräum-Punkt steht in der `ROADMAP.md`.
