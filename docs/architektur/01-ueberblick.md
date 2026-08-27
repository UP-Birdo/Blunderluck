# Blunderluck — Architektur / Leitgedanke, Dateien

## Die App in einem Absatz

Team Schach für die Runde: Partien in verschiedenen Spielarten, Teams ohne
Zugreihenfolge, Fähigkeiten, Abstimmung über Vorschläge — dazu eine Rangliste
über alle beendeten Partien mit Profil je Spieler. Angemeldet wird mit Name
und PIN, ohne Konto. Hervorgegangen 08/2026 aus dem Quizz (v0.122.0).

## Leitgedanke

Schichten mit je einer Aufgabe. Keine Schicht greift an einer anderen vorbei:

    konfig.js        Einstellungen (die einzige Datei, die von Hand angepasst wird)
        |
    spieler.js       Datenlogik der Spielerliste: Namen, PIN-Prüfsummen,
        |            Zusammenführen (kennt weder Bildschirm noch Speicher)
        |
    versiegelung.js  Prüfsummen bilden und prüfen (SHA-256: PIN, Verwaltung)
    ich.js           was nur auf DIESEM Gerät liegt: Kennung, Name, Verwaltung
        |
    speicher.js      gemeinsame Ablage: lokal oder Firebase
    abgleich.js      Vermittlung: laden, verzögert schreiben, fremde Änderungen holen
        |
    anmeldung.js     Ablauf: anmelden (Dialoge beim Start), Profil, Verwaltung
    team-schach.js   Bildschirm: Übersicht und Brett des Schachs
    rangliste.js     Bildschirm: Punkte aus den Partien (liest nur)
    einstellungen.js Bildschirm: Darstellung + Spieler-Karte (Profil/Verwaltung)
    tabs.js          Bildschirm: Tab-Leiste
    dialog.js        Bildschirm: eigene Rückfragen und Eingaben
        |
    app.js           Startpunkt: verdrahtet alles in fester Reihenfolge

Das Schach hängt als eigener Turm daneben, nach demselben Muster:

    schach-varianten.js  Spielarten als reine Tabelle (Maße, Sonderregeln)
        |
    schach.js            Regeln: Brett beliebiger Größe, Züge, Matt
        |
    schach-runde.js      eine Partie: Teams, Zugrecht, Verlauf, Fähigkeiten
        |
    schach-tafel.js      alle Partien nebeneinander

Der Gewinn: Spiellogik und Spielerliste sind ohne Browser testbar, und ein
anderer Speicher-Dienst kostet genau eine neue Klasse in `speicher.js`.

## Dateien

| Datei | Zweck |
|---|---|
| `index.html` | Gerüst: Kopf mit Version und Status, Tab-Leiste, Inhaltsbereich, Dialog-Ebene. Lädt die Skripte in fester Reihenfolge. |
| `css/stil*.css` | Gesamtes Aussehen — seit v0.93.0 fünf Dateien in fester Ladereihenfolge (stil, -brett, -effekte, -auswertung, -start; die Reihenfolge ist kaskaden-relevant, siehe Kopf von `stil.css`). Geerbt aus dem Quizz, trägt noch tote Würfel-/Imposter-Stile — Aufräum-Punkt in der ROADMAP. |
| `js/konfig.js` | `APP_VERSION` und alle Speicher-Einstellungen (Modus, Firebase-Adresse, Pfade, Zeitabstände), Verwaltungs-Prüfwert. |
| `js/spieler.js` | Reine Datenlogik der Spielerliste: `normalisieren()`, Suchen, Hinzufügen/Entfernen, PIN, `zusammenfuehren()`, `inhaltGleich()`. |
| `js/versiegelung.js` | Prüfsummen: Salz erzeugen, PIN- und Verwaltungs-Prüfwert bilden und prüfen. |
| `js/ich.js` | Der Gerätespeicher: wer ich bin (Kennung, Name), Verwaltungs-Schalter, gesehene Partie-Abschlüsse. Verlässt das Gerät nie. |
| `js/speicher.js` | Zwei Rückwände (`SpeicherLokal`, `SpeicherGemeinsam`) mit gleicher Schnittstelle plus `speicherErzeugen()`. |
| `js/abgleich.js` | Klasse `Abgleich`: erstes Laden, verzögertes Schreiben, regelmäßiges Nachfragen im gemeinsamen Modus. |
| `js/anmeldung.js` | Anmelde-Ablauf (drei Wege: bekanntes Gerät, Liste + PIN, neu), Profil (Name/PIN ändern), Verwaltung umschalten, Spieler entfernen. |
| `js/dialog.js` | `DIALOG.frage()`, `DIALOG.hinweis()`, `DIALOG.eingabe()`, `DIALOG.zahlen()`, `DIALOG.liste()`, `DIALOG.zweiSchritt()`. |
| `js/tabs.js` | Offenes Tab-Register; ein Tab meldet sich mit `id`, `titel` und `aufbauen(behaelter)` an. |
| `js/verwaltung.js` | Die eine Stelle für „darf der das?": `VERWALTUNG.verlangen(titel, grund)` fragt das Passwort ab, wenn die Verwaltung nicht ohnehin offen ist. |
| `js/schach-varianten.js` | Datentabelle der Spielarten: Brettmaße, Startaufstellung, Sonderregeln, Bonusfelder. Keine Logik. |
| `js/schach.js` | Reine Schachregeln: Brett **beliebiger Größe**, Zugerzeugung, Bedrohung, Matt und Patt, Wirkung der Fähigkeiten. Ohne Browser testbar. |
| `js/schach-runde.js` | EINE Partie mit ihren Teams: beitreten, bereit, Zugrecht, Verlauf, Fähigkeiten, Ergebnis. Ohne Browser testbar. |
| `js/schach-tafel.js` | Die Sammlung aller Partien samt Chronik: anlegen, einsetzen, entfernen, sortieren. Ohne Browser testbar. |
| `js/schach-vorschau.js` | Die Bildanleitung der Fähigkeiten — rechnet mit den echten Regeln. |
| `js/schach-grundlagen.js` | „Schach lernen": die Grundregeln, mit den echten Regeln gerechnet. |
| `js/team-schach.js` | Der Tab **Team Schach**, Kern: Zustand, Zeichnen, Partie-Kopf, Teams, Bedienung, Zugversand mit Zugzähler-Prüfung. |
| `js/team-schach-uebersicht.js` | Ergänzt `TEAM_SCHACH`: Liste aller Partien, Auswahl der Spielart, Einstellungen einer neuen Partie. |
| `js/team-schach-brett.js` | Ergänzt `TEAM_SCHACH`: Brett, Randbeschriftung, Zugspur, Würfel, Abstimmung, Bewegungen, Figuren-Klassen. |
| `js/team-schach-auswertung.js` | Ergänzt `TEAM_SCHACH`: Abschluss-Bildschirm mit Punktestand, Fähigkeiten-Übersicht, Bilanz und Zugverlauf. |
| `js/team-schach-grundlagen.js` | Ergänzt `TEAM_SCHACH`: der Bildschirm von „Schach lernen". |
| `js/rangliste.js` | Der Tab **Rangliste**: Punkte aller beendeten Partien plus **Spielerprofil** (`verlauf()`). Rechnender Teil ohne Browser testbar. |
| `js/einstellungen.js` | Der Tab **Einstellungen**: Darstellung (3D-Look) und die Karte **Spieler** (Profil, Verwaltung, Spieler entfernen). |
| `js/wunsch.js` | Der Wunsch-Knopf im Kopf: vorbefülltes GitHub-Formular, kein Token in der App. |
| `js/app.js` | Startpunkt (`DOMContentLoaded`), Statusanzeige, Hinweisbalken; erzeugt beide Speicher und Abgleiche, startet die Anmeldung. |
| `img/figuren/` | Die zwölf Figuren-Bilder des 3D-Looks (aus `tools/Figuren-Blender.py`). |
| `tests/` | Regressionstests, siehe `tests\README.md`. |
| `tools/` | Lokaler Test-Server, Deploy, Wunsch-Abholer, Icon- und Figuren-Erzeugung, Testkette. |
| `icon.svg`, `icons/` | Das Zeichen der App (noch das geerbte Quizz-Würfel-Motiv — eigenes Schach-Icon ist ROADMAP-Punkt). |
| `manifest.webmanifest` | Macht die Seite auf dem Startbildschirm zur App (Name, Farben, Zeichen). |
| `docs/` | Diese Dokumentation. |
