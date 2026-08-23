# Blunderluck — Was ist neu?

Neueste Version oben. Jede ausgelieferte Version bekommt hier ihren Eintrag —
in Nutzersprache: Was habe ich davon?

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
