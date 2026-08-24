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
- **Oben rechts Freunde-Zeichen und Zahnrad**; die Freundesliste ist eine Seite
  innerhalb des Starts (`START.freundeOffen`).
- **Der stille Knopf „Runde beitreten"** führt zum Zwischenbildschirm — er ist
  seither NUR noch der Weg hinein in fremde Runden.
- **Es gibt keinen Kopfbalken mehr** (seit v0.25.0): Der Stand des Abgleichs,
  die Version und der Wunsch-Knopf sind der Reihe nach in die Einstellungen
  gezogen; die `h1` steht unsichtbar im `body`.

## Die Fussleiste sammelt alle Runden-Aktionen (seit v0.26.0)

`_fussleisteBauen` baut sie je nach Lage: Aufgeben, Neu aufstellen, Runde
verlassen, Zur Übersicht.

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

**Folge fürs Aufräumen:** Die rund dreissig Regeln unter `body.design-3d` in
`css\stil.css` sind seit v0.17.0 immer aktiv — die Klasse zu prüfen ist
sinnlos geworden. Der Aufräum-Punkt steht in der `ROADMAP.md`.
