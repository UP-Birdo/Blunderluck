# Blunderluck — Was ist neu?

Neueste Version oben. Jede ausgelieferte Version bekommt hier ihren Eintrag —
in Nutzersprache: Was habe ich davon?

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
