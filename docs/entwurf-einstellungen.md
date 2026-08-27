# Entwurf: Einstellungen neu (ROADMAP Gruppe D, Punkt 9)

> **STATUS: ENTWURF — noch nichts gebaut.** Der Nutzer entscheidet zuerst
> die Fragen in Abschnitt 6.

---

## ANNAHME — bitte zuerst lesen

**Dieser Entwurf nimmt an, dass mit „die Einstellungen" die
RUNDEN-Einstellungen gemeint sind** — also das, was man vor dem Spielen
über die Vorschau (Brettform) und den Pfeil neben „Spielen"
(Grundeinstellungen) erreicht. Der Beschwerde-Wortlaut („Menüführung
schrecklich") passt auf diese zwei getrennten Bildschirme; das Zahnrad
oben rechts ist dagegen eine einzige flache Seite fast ohne Menüführung.

**Falls das Zahnrad (Account, Profil, Verbindung) gemeint ist: ein Satz
genügt, dann wird der Entwurf dafür neu geschrieben.** Für das Zahnrad
steht unten trotzdem ein kleiner Aufräum-Vorschlag (Abschnitt 4).

---

## 1. Ist-Zustand in Zahlen

### Kandidat A — Runden-Einstellungen (`team-schach-uebersicht.js`)

Zwei getrennte Bildschirme mit zwei getrennten Einstiegen vom Start:

| Bildschirm | Einstieg | Inhalt |
|---|---|---|
| **Brettform** | Tipp auf die Vorschau | 3 Form-Knöpfe, darunter bis zu 3 Spielart-Kacheln (7 Spielarten gesamt), 1 i-Knopf |
| **Grundeinstellungen** | Tipp auf den Pfeil | siehe unten |

Der Bildschirm „Grundeinstellungen", voll aufgeklappt:

- **8 Haken** (Computer, Lootboxen, Seltenheit, Unglücks-Lootboxen,
  Zufallsarmee, unterschiedliche Armeen, Seite zulosen, „Wer zuerst
  zieht…") — zwei davon erscheinen erst, wenn ihr Oberpunkt gesetzt ist,
  der Bildschirm **springt** also beim Anhaken.
- **4 Knopfreihen** mit je 4 bzw. 3 Stufen (Figurenzahl, Computer-Stärke,
  Lootbox-Menge, Item-Vorrat) plus der Knopf „Selbst wählen", der ein
  **Popup mit 19 Ankreuz-Einträgen** öffnet.
- **13 i-Knöpfe**, jeder öffnet ein eigenes Hinweis-Fenster; dahinter
  liegen zusammen rund **45 Zeilen Erklärtext**.
- Macht voll aufgeklappt **über 40 Bedienelemente auf einem Bildschirm.**

Der eigentliche Menüführungs-Schmerz: **„Spielen" gibt es nur auf dem
Startbildschirm.** Wer eine Regel ändern will, tippt Pfeil → ändern →
Zurück → Spielen; wer dabei auch das Brett wechseln will, muss zusätzlich
über die Vorschau in den ZWEITEN Bildschirm. Brett und Regeln gehören
zusammen, wohnen aber getrennt.

### Kandidat B — das Zahnrad (`js\einstellungen.js`)

- **1 Bildschirm, 4 Karten** (Account, Spieler, Verbindung, Über die App).
- **0 echte Einstellungen** — seit der 3D-Look fest an ist, gibt es dort
  nichts mehr zu wählen, nur **6 Knöpfe** (Abmelden, Konto löschen,
  Profil, Verwaltung, Wunsch, Zurück).
- Dafür rund **13 Zeilen immer sichtbarer Erklärtext** („Abmelden:
  Dieses Gerät vergisst…", „Grün heisst…") — hier steht der Text OFFEN
  auf der Seite, nicht hinter i-Knöpfen.

---

## 2. Vorschlag 1 — „Eine Seite": alles auf einem Bildschirm

Beide Einstiege (Vorschau UND Pfeil) führen auf **dieselbe eine Seite**;
die Haken-Liste wird durch **benannte Gruppen-Karten** ersetzt, und ganz
unten steht **Spielen direkt** — kein Umweg mehr über den Start.

    [Zurück]        Neue Runde
    +----------------------------------+
    | GEGNER      [ Mensch ][Computer] |
    |   Stärke:  1  2  3  4        (i) |   <- nur wenn Computer
    +----------------------------------+
    | BRETT   [Quadr.][Rechteck][Kreuz]|
    |   [Kachel]  [Kachel]  [Kachel]   |
    |   Figuren: wenig normal viel voll|
    +----------------------------------+
    | LOOTBOXEN                 (an)   |
    |   Menge:  wenig normal viele ... |
    |   Items:  wenig viele alle selbst|
    |   Seltenheit zeigen [ ]  Pech [ ]|
    +----------------------------------+
    | SPIELREGELN                  (i) |
    |   Zufallsarmee [ ]  Zulosen [x]  |
    |   Sofort ziehen [ ]              |
    +----------------------------------+
    |          [  SPIELEN  ]           |
    +----------------------------------+

- Alle Erklärtexte bleiben hinter i-Knöpfen — aber **ein i je Karte**
  statt dreizehn einzelner (der Hinweis erklärt die ganze Gruppe).
- Die Gruppen-Überschriften (GEGNER, BRETT, LOOTBOXEN, SPIELREGELN)
  beantworten die Frage „wo finde ich was" — heute muss man die flache
  Liste absuchen.
- Die Kacheln, Knopfreihen und der Gruppen-Kasten existieren als
  Bausteine schon; das ist ein Umsortieren, kein Neubau.

**Preis:** Die Seite ist lang (einmal rollen). Und die Trennung
Vorschau/Pfeil vom 24.08. (Wunsch 8) wird zurückgenommen — das war eine
ausdrückliche Nutzer-Entscheidung, siehe Frage 2.

## 3. Vorschlag 2 — „Geführter Zwei-Schritt"

Ein Weg statt zwei Einstiege: **Schritt 1 wählt, WAS gespielt wird,
Schritt 2 zeigt NUR die dazu passenden Regler.**

    Schritt 1: Was spielen?            Schritt 2: Feinheiten
    +--------------------------+       +--------------------------+
    | [Zurück]  Neue Runde     |       | [Zurück]  Fast fertig    |
    |  Gegner: [Mensch][Comp.] |       |  Lootboxen        (an)   |
    |  [Quadr.][Rechteck][Kreuz]  -->  |    Menge / Items         |
    |  [Kachel] [Kachel]       |       |  Weitere Regeln...  (v)  |   <- eingeklappt
    |  Figuren: wenig...voll   |       |                          |
    |        [ WEITER ]        |       |      [  SPIELEN  ]       |
    +--------------------------+       +--------------------------+

- Schritt 2 zeigt offen nur, was zur Wahl aus Schritt 1 passt (mit
  Computer: die Stärke; mit Lootboxen: Menge und Items); alles Übrige
  liegt eingeklappt hinter „Weitere Regeln".
- Wer nichts ändern will, tippt zweimal Weiter/Spielen und ist drin.

**Preis:** Der zweite Schritt ist ein ZWANGS-Schritt — auch für den, der
nur schnell dieselbe Runde wie gestern will. Da das Gerät die Regler
ohnehin merkt (`reglerMerken`), ist der häufigste Fall „nichts ändern" —
und genau der wird um einen Bildschirm teurer.

---

## 4. Das Zahnrad — kleiner Beifang (unabhängig von A/B)

Egal wie Frage 1 ausgeht: Im Zahnrad lässt sich „zu viel Text" billig
beheben, nach demselben Muster wie überall — **je Karte bleibt eine
Zeile stehen, der Rest wandert hinter ein i.** Aus 13 Zeilen werden 4.
Das ist eine kleine eigene Auslieferung, kein Umbau.

---

## 5. EMPFEHLUNG

**Vorschlag 1 („Eine Seite").** Begründung:

1. Das Gerät merkt sich die Regler — der häufigste Fall ist „gleiche
   Runde nochmal", und der braucht auf der einen Seite **null** Umwege
   (Spielen steht direkt darunter). Der Zwei-Schritt macht genau diesen
   Fall teurer.
2. Er behebt beide Beschwerden an der Wurzel: EIN Ort statt zwei
   Bildschirme (Menüführung), benannte Gruppen mit einem i je Karte
   statt 13 einzelner Info-Punkte (Text).
3. Er ist der hausinterne bewährte Weg: Die Ansage vom 21.08. („generell
   zu viel Texte überall — verstecke sie, aber lass sie nicht
   verschwinden") hat die Erklärtexte schon hinter i-Knöpfe gebracht,
   und die Fähigkeiten-Bibliothek zeigt seit Bündel A, dass Bild plus
   i-Knopf besser trägt als Fliesstext. Dieser Entwurf führt dieselbe
   Linie zu Ende, statt eine neue zu beginnen.

**Was in beiden Vorschlägen GLEICH bleibt** (kein Bruch, keine Wanderung):

- Alle Werte und Stufen (Figurenzahl, Bot-Stärke, Lootbox-Mengen,
  Item-Vorräte) — nur die Anordnung ändert sich.
- Der Datenvertrag: `regeln.*` in der Partie bleibt Feld für Feld
  unverändert; laufende und alte Partien merken nichts.
- Die Geräte-Erinnerung (`reglerMerken` / `START.regelnMerken`) und die
  eine Vorgaben-Quelle `_regelnVorgabe`.
- Die Erklärtexte kommen weiter aus dem Modell, der Bildschirm zeigt nur
  an (eiserne Regel).

---

## 6. Fragen an den Nutzer — bitte der Reihe nach

1. **Sind die RUNDEN-Einstellungen gemeint** (Annahme dieses Entwurfs)
   **oder das Zahnrad** — oder beides?
2. **Dürfen Vorschau und Pfeil auf DIESELBE Seite führen?** Das nimmt
   deine Trennung vom 24.08. (Wunsch 8: zwei Bildschirme) zurück — ohne
   dein Ja bleibt sie.
3. **Vorschlag 1 (eine Seite) oder Vorschlag 2 (Zwei-Schritt)?** Die
   Empfehlung ist 1; Skizzen in Abschnitt 2 und 3.
4. **Soll der Zahnrad-Text nebenbei gekürzt werden** (Abschnitt 4, eigene
   kleine Auslieferung) — ja oder später?
