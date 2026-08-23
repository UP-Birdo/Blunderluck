# Blunderluck — Architektur-Index

Wegweiser in die Themendateien dieses Ordners. Regel: NUR die Dateien lesen,
deren Themen das aktuelle Vorhaben beruehrt — nie alles auf Vorrat.
Aenderungen an der Architektur: in der passenden Datei UND hier eintragen.

**Herkunft:** Diese Doku ist bei der Ausgliederung 08/2026 aus dem Quizz
(v0.122.0) uebernommen; Kapitel 01 wurde fuer Blunderluck neu geschrieben.
Den Imposter gibt es in Blunderluck nicht mehr (Kapitel 06 wurde nicht
uebernommen), und seit v0.2.0 gibt es auch keinen Wuerfel-Code mehr — die
Spielerverwaltung heisst jetzt `spieler.js`/`anmeldung.js`.

## 01-ueberblick.md — Spiel-Absatz, Leitgedanke, Dateien

- Das Spiel in einem Absatz
- Leitgedanke
- Dateien

## 02-datenmodell-und-speicher.md — Datenmodell, Siegel, Auge, Speicher-Schicht, Abgleich

- Datenmodell
    - Der wichtigste Satz zum Datenmodell
    - Aufdecken je Person, und was daraus folgt
    - Additiver Datenvertrag — die Nachrüst-Regel
- Siegel — warum niemand spicken kann
- Das Auge — eigene Zahlen verstecken
- Speicher-Schicht
    - Jeder Aufruf hat ein Zeitlimit (seit v3.9)
- Abgleich und gleichzeitiges Arbeiten

## 03-wuerfel-quizz.md — Quizz-Archiv: PIN-Anmeldung, Verwaltung

BESCHREIBT DIE ALTE QUIZZ-FASSUNG. Seit v0.2.0 heisst die Umsetzung
`spieler.js`/`anmeldung.js` (siehe 01-ueberblick.md) — der BESCHRIEBENE
ABLAUF (drei Anmelde-Wege, PIN-Pflicht, was die Verwaltung darf und was
nicht) gilt aber unveraendert und wird hier nachgelesen. Die Punkte- und
Bildschirm-Abschnitte sind Vergangenheit.

- Punkte (Vergangenheit)
- Bildschirm-Regeln (Vergangenheit)
- Anmeldung mit PIN, ohne Konto
    - Profil
- Verwaltung

## 04-team-schach.md — Team Schach: Regeln, Spielarten, Faehigkeiten, Bildschirm

- Team Schach
    - Mehrere Partien nebeneinander (seit v1.4)
    - Die Hausregel: keine Reihenfolge im Team
    - Brett und Felder
    - Ein eigenes Zielfeld ist kein Schlagfeld (seit v0.44)
    - Warum die Rochade sich erklären kann
    - Spielarten
    - Fähigkeiten
    - Die Bildanleitung (seit v0.41)
    - Der Takt — die Uhr für ablaufende Wirkungen (seit v3.5)
    - Mauern (seit v3.5)
    - Geliehene Figuren (Friedhof, seit v3.5)
    - Unglückswürfel
    - Was der Verlauf verrät
    - Der gerechnete Zufall
    - Zwei Zeitpunkte: Stufe beim Erscheinen, Fähigkeit beim Einsammeln
    - Gespeichert wird, was liegt
    - Was „vorn" heisst — das Nudelholz (seit v0.46)
    - Welche Felder ein Ziel sein können
    - Die Zugbewegung
    - Die stillen Animationen (seit v0.77)
    - Zwei Fragen an einen Weg
    - Die Größe der Figuren wird gemessen
    - Zwei Farben für jede Markierung
    - Rot heisst gegen dich, Blau für dich (seit v0.41)
    - Versteckte Spielarten
    - Einstellungen je Partie
    - Abstimmung im Team
    - Vorzüge — und warum sie NICHT im gemeinsamen Stand stehen
    - Die Chronik — warum die Rangliste nichts verlieren kann
    - Der Abschluss einer Partie
    - Die Auswahl der Spielart

## 05-rangliste.md — Rangliste und Spielerprofil

- Rangliste
    - Das Spielerprofil (seit v3.3)
    - Wer darf löschen? (seit v3.3)

## 07-querschnitt.md — Wunsch-Weg, Tab-Register, Konventionen, Sicherheit/Datenschutz

(Der Wortbibliothek-Abschnitt gehoerte zum Imposter und ist Vergangenheit.)

- Der Weg eines Wunsches
- Die Wortbibliothek (nur noch Erbe)
- Tab-Register
- Code-Konventionen
- Sicherheit und Datenschutz
