# Wortliste — die Begriffe dieses Projekts

Wozu diese Datei: Damit Nutzer und Claude über dieselben Dinge mit denselben
Wörtern reden — wer einen Wunsch oder Fehler meldet, trifft damit die Stelle
im Code.

**Drei Spalten:** Was der NUTZER liest, wie es im CODE heisst (danach wird
gegrept), und WO es wohnt (Datei + Objekt-/Funktionsname, keine Zeilennummern
— Namen veralten kaum). Stile: `css\stil.css` plus vier `css\stil-*.css`.
Versionsangaben „seit v…" aus der Quizz-Zeit sind entfernt — sie kollidieren
mit Blunderlucks eigener Zählung.

## Die Partie und ihre Teile

| Wort | Im Code | Wohnt in | Was gemeint ist |
|---|---|---|---|
| **Stand** | `stand` | `js\schach.js`, `SCHACH` | Das Brett samt Stellung: Figuren, wer am Zug ist, Mauern, Risse, Fesseln. Kennt keine Spieler. |
| **Runde / Partie** | `runde` | `js\schach-runde.js`, `SCHACH_RUNDE` | Eine Partie mit Teams, Verlauf, Lootboxen, Fähigkeiten. Liegt über dem Stand. Die Fähigkeiten-/Lootbox-Hälfte wohnt getrennt in `js\schach-runde-faehigkeiten.js`. |
| **Tafel** | `tafel` | `js\schach-tafel.js`, `SCHACH_TAFEL` | Alle Partien nebeneinander, plus die **Chronik**. |
| **Chronik** | `tafel.chronik` | `js\schach-tafel.js` | Je beendeter Partie EIN festgeschriebener Eintrag mit dem Ergebnis. Die Rangliste rechnet nur daraus — Partie löschen kostet niemandem Punkte. |
| **Spielart / Variante** | `variante` | `js\schach-varianten.js`, `SCHACH_VARIANTEN` | Brettgrösse, Aufstellung, Sonderregeln. Steht nach dem Anlegen fest. |
| **Brettform** | `variante.form` | `js\schach-varianten.js` | Quadratisch, Rechteckig oder Kreuz — die Auswahl VOR der Spielart. |
| **Verlauf** | `runde.verlauf` | `js\schach-runde.js` | Was passiert ist. Achtung: Der LETZTE Eintrag ist nicht immer der letzte Zug — Erscheinen und Einsammeln hängen sich hinten an. |
| **Zugzähler / Takt** | `runde.zugZaehler`, `stand.takt` | `js\schach-runde.js` bzw. `js\schach.js` | Zählen Halbzüge. Daran hängen alle Fristen und die Überhol-Sicherung im Team. |
| **Halbzug** | — | — | Ein Zug einer Seite. Zwei Halbzüge sind ein Zug. |
| **Bildschirm** | `TEAM_SCHACH` | `js\team-schach.js` | Alles Sichtbare. Teil-Dateien: `team-schach-uebersicht` / `-brett` / `-auswertung` / `-grundlagen.js`. |
| **Bob (der Bot)** | `SCHACH_BOT` | `js\schach-bot.js` | Der Computer-Mitspieler („Bob der Bot"). Sagt zu jeder Aufstellung Ja, zieht sobald ein Mensch dran war. |
| **Abgleich** | `Abgleich` | `js\abgleich.js` | Der Firebase-Abgleich zwischen den Geräten. |
| **Rangliste** | `RANGLISTE` | `js\rangliste.js` | Rechnet die Punkte — ausschliesslich aus der Chronik. |

## Die Lootboxen

| Wort | Im Code | Wohnt in | Was gemeint ist |
|---|---|---|---|
| **Lootbox** | `runde.bonus`, Kennung `wuerfel` | Feld: `js\schach-runde.js`; Logik: `js\schach-runde-faehigkeiten.js` (`_bonusNachziehen`, `_bonusEinsammeln`) | Die Box auf freien Feldern. Für den Nutzer überall „Lootbox" — `wuerfel`/`bonus` bleiben, weil sie in Partien und Firebase-Daten stecken. |
| **Fähigkeit** | `SCHACH_VARIANTEN.FAEHIGKEITEN` | Tabelle: `js\schach-varianten.js`; Einsetzen: `js\schach-runde-faehigkeiten.js`, `faehigkeitEinsetzen` | Was Gutes in einer Lootbox stecken kann. Nicht verwechseln: das globale `FAEHIGKEITEN` in `js\faehigkeiten.js` ist der Bibliotheks-TAB. |
| **Unglücks-Lootbox** | `SCHACH_VARIANTEN.PECH`, `pech: true` | `js\schach-varianten.js` | Was Schlechtes darin stecken kann. Wirkt sofort beim Einsammeln — darf eine Partie beenden. |
| **Halluzination** | Kennung `vollesGlas` | `js\schach-varianten.js` (in `PECH`) | Lässt gegnerische Figuren falsch aussehen. Hiess früher „Volles Glas"; die Kennung bleibt. |
| **Stufe / Seltenheit** | `SCHACH_VARIANTEN.STUFEN` | `js\schach-varianten.js` | Gewöhnlich, Ungewöhnlich, Episch, Legendär — sichtbar an der Farbe, wenn der Haken es zulässt. |
| **Versteckte Fähigkeit** | `versteckt: true` | `js\schach-varianten.js`, gefiltert in `faehigkeitenDerStufe` | Kommt in keine neue Lootbox und keine Liste mehr, bleibt im Vorrat einsetzbar (**Ausweichen**, **Wiedergeburt**). Gelöschtes fliegt dagegen aus jedem Vorrat. |
| **Schubs** | `SCHACH.schubs` | `js\schach.js` | Eine gegnerische Figur neben einer eigenen weicht ein Feld zurück. Kein Schlag, keine Könige, der Zug bleibt. |
| **Platztausch** | `SCHACH.platztausch` | `js\schach.js` | Zwei eigene Figuren tauschen die Plätze — die angetippte mit der davor. Kein König, der Zug bleibt. |
| **Vorrat** | `runde.faehigkeiten[farbe]` | `js\schach-runde.js` | Die gesammelten Fähigkeiten eines Teams, die Marken unter dem Brett. |
| **Stufe der Menge** | `regeln.lootboxMenge`, Tabelle `LOOTBOX_MENGEN` | `js\schach-varianten.js` | Wie viele Lootboxen erscheinen: **wenig / normal / viele / Regen**. |
| **Lootbox-Regen** | `regeln.regen`, `regenStufe` | `js\schach-runde.js` (nur Lese-Rückfall) | Die zwei alten Einstellungen vor der Stufe. Stehen noch in alten Partien: Fehlt die Stufe, wird sie daraus gerechnet. Sichtbar nicht mehr. |
| **Item-Vorrat** | `regeln.itemVorrat`, `regeln.itemPool`, Tabelle `ITEM_VORRAETE` | `js\schach-varianten.js` | Welche Fähigkeiten es in DIESER Partie gibt: **wenig / viele / alle / selbst wählen**. Die Stufe ist die Einstellung, `itemPool` die Liste daraus; leer heisst „keine Einschränkung". |
| **Selbst gewählte Items** | `regeln.itemAuswahl` | Popup: `js\team-schach-uebersicht.js` | Die angehakte Liste aus „selbst wählen" — die EINGABE zu `itemPool`. Mindestens ein Item; beim Auslosen noch gegen die Partie-Bedingungen gefiltert. |
| **Figurenzahl / Regler** | `regeln.armeeStaerke`, `armeeFassung` | `js\schach-runde.js` | Figuren je Seite: **wenig / normal / viel / voll**, gilt in JEDER Partie; „normal" ist die gewohnte Aufstellung. `armeeFassung: 1` heisst, die Partie rechnet schon so. |
| **Block / Tiefe** | `armeeFelderBlock`, `armeeTiefe` | `js\schach-varianten.js` | Die Felder EINER Startseite samt Tiefe: 0 Grundreihe, dann Offiziersreihe, davor Bauern. Die eine Quelle für Zufallsarmee, feste Aufstellung und angekündigte Zahl. |
| **Offiziersreihe** | `SCHACH_RUNDE._aufstellungArt` | `js\schach-runde.js` | Die Reihe ab „viel" zwischen Grundreihe und Bauern: die Grundreihe ohne Krone — König und Dame werden zum Springer. |

## Regeln und Wirkungen

| Wort | Im Code | Wohnt in | Was gemeint ist |
|---|---|---|---|
| **Sperre** | `SCHACH.gesperrt` | `js\schach.js` | Ein Feld, das niemand betritt. Ursachen: **Mauer** (läuft ab) und **Riss / Loch** (bleibt, `SCHACH.risse`). |
| **Sichtlinie / Strahl** | `_strahlzuege`, `_feldBedroht` | `js\schach.js` | Die Linie von Turm, Läufer, Dame. Eine Sperre bricht sie ab — beim Ziehen UND beim Drohen. |
| **Lage der Ansicht** | `_drehungVon`, `_feldZuAnzeige` | `js\team-schach-brett.js` | Wie herum dieses Gerät das Brett zeigt (0–3 Vierteldrehungen, eigene Armee unten). Steht in keinem Spielstand. |
| **Startseite eines Teams** | `stand.startSeiten` | `js\schach.js` | Von welcher Seite eine FARBE gestartet ist (beim Kreuz zwei). Daran hängt die Lage der Ansicht. |
| **Kreuz-Duell** | `variante.kreuzEinzeln` | `js\schach-varianten.js` | Ein Kreuz mit nur einer Armee je Team, Startseite ausgelost. |
| **Startseite (Bauer)** | `stand.bauernSeiten` | `js\schach.js` | Woher ein Bauer kommt; er läuft zur gegenüberliegenden Seite und wandelt dort um. Ohne Eintrag gilt die Farbregel. |
| **Gefallen** | `runde.gefallen` | `js\schach-runde.js` | Merkt sich **wo** eine Figur starb (`{art, feld}`). Dafür der Nekromant (Kennung `friedhof`). |
| **Verloren** | `runde.verloren` | `js\schach-runde.js` | Merkt sich nur **was** verloren ging. Dafür Wiedergeburt (ausgeblendet) und Bilanz. |
| **Zwei Leben** | `koenigeAlsLeben` | Wirkung: `js\schach.js`; gesetzt: `js\schach-runde.js` | Bei mehreren Königen sind sie gewöhnliche Figuren; beim letzten gelten wieder Schach und Matt. |
| **Saat** | `SCHACH_RUNDE._zufallsWert(saat)` | `js\schach-runde-faehigkeiten.js` | Der Text für den gerechneten Zufall statt `Math.random()` — sonst sähe jedes Gerät ein anderes Brett. Was sich unterscheidet, gehört an den ANFANG der Saat. |
| **Enttarnen** | `enttarnen`, `sichtWirkung: "zeigen"` | `js\schach-varianten.js` (in `FAEHIGKEITEN`) | Nur in Partien, die die Seltenheit VERBERGEN (`nurOhneSeltenheit`) — zeigt sie dir selbst für 6 Halbzüge. |
| **Verstecken** | `verstecken`, `sichtWirkung: "verbergen"` | `js\schach-varianten.js` (in `FAEHIGKEITEN`) | Das Gegenstück, nur in Partien, die sie ZEIGEN (`nurMitSeltenheit`) — nimmt sie dem GEGNER für 6 Halbzüge. Je Partie gibt es genau eine von beiden. |
| **Bereitschaft** | `bereitSetzen`, `aufstellungBereitSetzen` | `js\schach-runde.js` | ZWEI Zusagen vor dem Start: zur Seite und zur AUFSTELLUNG. Erst wenn beide Seiten beides gegeben haben, läuft die Partie. |
| **Zulosung** | `SCHACH_RUNDE.seiteZulosen` | `js\schach-runde.js` | Die Seite wird zugelost statt ausgesucht (Haken beim Anlegen, Vorgabe AN). |
| **Abstimmung** | `runde.vorschlaege` | `js\schach-runde.js` | Zug-Vorschläge im Team, wenn `regeln.einigkeit` gesetzt ist; wer abstimmt, verkürzt die Frist. |
| **Beitritts-Code** | `SCHACH_RUNDE.beitrittsCode` | `js\schach-runde.js` | Aus der Partie-Kennung GERECHNET, nie gespeichert; Zeichensatz ohne 0/O und 1/I/L, weil er vorgelesen wird. |
| **Freundschaft** | `SPIELER.freundschaft` | Daten: `js\spieler.js`; Karte: `js\freunde.js` | Suchen, Anfrage, Annehmen, Ablehnen, Entfernen. Die Karte hängt am Freunde-Zeichen des Starts (`START.freundeOeffnen`, `js\start.js`). |

## Am Bildschirm

| Wort | Im Code | Wohnt in | Was gemeint ist |
|---|---|---|---|
| **Spur** | `_letzteSpur` | `js\team-schach-brett.js` | Die eingefärbten Felder des letzten Zuges. |
| **Anleitung / Vorschau** | `SCHACH_VORSCHAU` | `js\schach-vorschau.js` | Die Bilderfolge zu jeder Fähigkeit. Mit den echten Regeln **gerechnet**, nie gezeichnet. |
| **Bibliothek** | `faehigkeitenOeffnen` | `js\team-schach-auswertung.js`; Tab: `js\faehigkeiten.js` | Die Übersicht aller Fähigkeiten hinter dem i-Knopf — und als eigene Seite in der Tab-Leiste. |
| **Rückschau** | `SCHACH_RUNDE.rueckschau` | Rechnung: `js\schach-runde-faehigkeiten.js`; Anzeige: `js\team-schach-auswertung.js` | „Wie es dazu kam" — der Bildschirm vor Sieg oder Niederlage. |
| **Vorschau-Kasten** | `zielVorschau`, `zielUmriss` | Zustand: `js\team-schach.js`; Umriss gerechnet: `js\schach-runde-faehigkeiten.js` | Der grüne Rahmen beim Platzieren einer Fähigkeit mit Zielfeld. |
| **Laufendes Item** | `SCHACH_RUNDE.laufendesZugmuster` | `js\schach-runde-faehigkeiten.js` | Eine Fähigkeit, die IHR Zug ist (Sprung, Teleport) und auf ihre Figur wartet. Abbrechen legt sie zurück in den Vorrat. |
| **Figurenzähler** | `SCHACH_RUNDE.materialVorsprung` | `js\schach-runde-faehigkeiten.js` | Das `+N` unter dem Brett. Aus der STELLUNG gerechnet, nicht aus den Verlusten; nur die führende Seite trägt eine Zahl. |
| **Wer zuerst zieht, hat gezogen** | `regeln.einigkeit` (umgekehrt) | `js\schach-runde.js` | Der Haken beim Anlegen. **Aus** heisst: Das Team stimmt ab — die Vorgabe. |
| **Abschluss** | `TEAM_SCHACH.abschluss` | Zustand: `js\team-schach.js`; Bildschirm: `js\team-schach-auswertung.js`, `abschlussZeigen` | Das Ende einer Partie in drei Schritten: Rückschau, Ergebnis, Punktestand. |
| **Nachkontrolle** | `TEAM_SCHACH._nachkontrolle` | `js\team-schach.js` | Nach dem Senden den Stand erneut holen und die eigene Änderung prüfen — gegen den Wettlauf „bereit geht manchmal noch verloren". |

## Umbenannte Fähigkeiten — Anzeigename gegen Kennung

Die KENNUNG bleibt immer unverändert: Sie steht in gespeicherten Partien;
Umbenennen würde die Fähigkeit aus jedem Vorrat entfernen. Beide Tabellen:
`js\schach-varianten.js`.

| Der Nutzer liest | Im Code |
|---|---|
| **Nekromant** | `friedhof` (in `FAEHIGKEITEN`) |
| **Spalt** (Unglücks-Lootbox) | `erdbeben` (in `PECH`) |

**Spalt und Riss sind zwei verschiedene Dinge:** Der **Spalt** ist die
Unglücks-Lootbox, die **Risse** sind die gesperrten Felder, die sie
hinterlässt (`SCHACH.risse`). In der Quizz-Zeit hiess beides „Riss" — der
Anlass für die Umbenennung.

## Geerbt, hier ohne Bedeutung (Archiv)

Aus dem Quizz mitgekommen; hier benennt das nichts Lebendes mehr. Bleibt als
Begründungs-Archiv, damit alte Stände und Doku lesbar bleiben.

- **Würfel** — alter Nutzer-Name der Lootbox; nur noch Kennung `wuerfel`.
- **Volles Glas** — alter Name der Halluzination; nur noch Kennung `vollesGlas`.
- **Erdbeben** — alter Name des Spalts; nur noch Kennung `erdbeben`.
- **Ausdehnung** — Unglückswürfel, ganz aus dem Spiel (auch aus laufenden Partien); Kennung nur beim Lesen alter Stände.
- **Einsturz** — wie Ausdehnung: ganz entfernt, Kennung nur für alte Stände.
- **Team Schach** — alter Tab-Name im Quizz; das Spiel heisst hier Blunderluck, der Modulname `TEAM_SCHACH` bleibt.
