# Quizz — Architektur / Wuerfel Quizz: Punkte, Bildschirm-Regeln, PIN-Anmeldung, Verwaltung

## Punkte

Die Regeln stehen ausschließlich in `modell.js` — als Konstanten
(`PUNKTE_EXAKT`, `PUNKTE_NAH`, `PUNKTE_BONUS`), als Rechnung (`punkte()`,
`ergebnis()`) und als Text (`punkteErklaerung()`, angezeigt hinter dem i-Knopf).
Wer eine Zahl ändert, ändert Rechnung und Erklärung in einem Zug.

`punkte(echteWuerfel, tipp)` arbeitet in drei Schritten:

1. Exakte Übereinstimmungen als Multimenge herausrechnen — die Reihenfolge
   spielt nie eine Rolle.
2. Die Reste beider Seiten sortieren und Stelle für Stelle paaren. Bei
   sortierten Listen ist das die Paarung mit dem kleinsten Gesamtabstand, also
   die für den Rater beste.
3. Jedes Paar nach seinem Abstand bewerten. Der Stern ist keine Zahl und hat zu
   nichts einen Abstand; er zählt nur exakt.

`ergebnis(daten)` summiert das über alle **aufgedeckten** Personen und vergibt
je Person den Bonus an den besten Tipp (bei Gleichstand an alle, bei null
Punkten an niemanden). Solange nicht alle aufgedeckt haben, ist der Stand ein
Zwischenstand — `moeglich` wächst mit jeder aufgedeckten Person um
`punkteMaximum()`.

## Bildschirm-Regeln

- Der Tab-Inhalt wird bei jeder Änderung **vollständig** neu gezeichnet. Damit
  dabei keine Eingabe verloren geht, merkt `_fokusMerken()` das gerade
  bearbeitete Feld über `data-schluessel` und setzt den Fokus danach zurück.
- Beim Umstellen eines Auswahlfeldes wird **nicht** neu gezeichnet
  (`abgleich.aendern(daten, false)`) — das Feld zeigt den Wert ja bereits selbst.
  Ausnahme: der eigene Wurf, sobald er vollständig ist (dann wird der Knopf
  **Würfel festlegen** freigegeben).
- Die eigene Karte hat drei Zustände, je eine Bau-Funktion: `_ichKarteEingabe`
  (noch nicht festgelegt), `_ichKarteFestgelegt` (Siegel steht, Aufdecken
  möglich), `_ichKarteAufgedeckt` (fertig).
- Die Karten der anderen ebenso: `_tippKarteBauen` solange verdeckt,
  `_ergebnisKarteBauen` sobald aufgedeckt.
- **Eine Hauptaktion je Bildschirm, und sie wandert mit dem Spielstand:** erst
  **Würfel festlegen**, dann **Meine Würfel aufdecken** (beide in der eigenen
  Karte), danach **Neue Runde** in der Fußleiste. Nie zwei blaue Knöpfe
  gleichzeitig.

## Anmeldung mit PIN, ohne Konto

Es gibt keine Anmeldung im üblichen Sinn — kein Server, keine Sitzung, kein
Passwortspeicher. Stattdessen drei Wege in `WUERFEL_QUIZZ.anmelden()`:

1. **Bekanntes Gerät.** Im Gerätespeicher steht eine Spieler-Kennung
   (`ICH.person()`); gibt es den Spieler noch, ist man sofort drin.
2. **Aus der Liste wählen** (`_alsBestehenderAnmelden`). Die App zeigt alle
   Mitspieler; nach der Wahl wird die PIN abgefragt und gegen
   `pinPruefwert`/`pinSalz` geprüft. Drei Versuche, dann zurück zur Frage.
   **Das ist der Weg, der Gerätewechsel überhaupt möglich macht.**
3. **Neu anmelden** (`_neuAnmelden`). Name (darf nicht vergeben sein) und PIN,
   letztere zweimal eingegeben, damit ein Vertipper nicht dauerhaft aussperrt.

Die PIN wird wie das Würfel-Siegel behandelt: `VERSIEGELUNG.pinPruefwertBilden`
rechnet `SHA-256("quizz-pin|" + PIN + "|" + Salz)`, gespeichert werden nur
Prüfsumme und Salz. Das Salz muss offen in der Datenbank stehen — sonst könnte
ein fremdes Gerät die PIN gar nicht prüfen. Es sorgt dafür, dass zwei Spieler
mit derselben PIN unterschiedliche Prüfwerte haben.

Was die PIN NICHT leistet, steht in [DECISIONS.md](DECISIONS.md).

### Profil

Der Knopf **Profil** im Kopf der eigenen Karte (`profilOeffnen`) bündelt beide
Änderungen am eigenen Zugang — Name und PIN. Er nutzt dieselbe Auswahlliste wie
die Anmeldung (`DIALOG.liste`), damit es nur eine Bauform für „wähle eines von
mehreren" gibt.

- `namenAendern` weist einen bereits vergebenen Namen ab. Der Name ist die
  Wiedererkennung beim Anmelden; doppelte Namen würden die Liste unbrauchbar
  machen.
- `pinAendern` verlangt zuerst die bisherige PIN, sofern eine hinterlegt ist.
  Ohne diese Rückfrage könnte jemand an einem kurz unbeaufsichtigten Gerät die
  PIN austauschen und damit den Zugang übernehmen. Die neue PIN bekommt ein
  **neues Salz** — sonst bliebe der alte Prüfwert weiter vergleichbar.

## Verwaltung

Ein Zugang für denjenigen, der die Runde betreut. Zwei Befugnisse:

- **Spieler aus der Runde entfernen** — bei doppelter Anmeldung oder
  vergessener PIN.
- **Neue Runde starten** (seit v0.9). Der Knopf steht bei jedem, verlangt aber
  das Passwort, solange die Verwaltung nicht offen ist. Grund: Eine neue Runde
  löscht bei ALLEN Würfel und Vermutungen und ist nicht rückgängig zu machen.

Fremde Würfel sieht auch die Verwaltung nicht; die liegen auf fremden Geräten
und nicht in der Datenbank.

- Passwort-Prüfung: `VERSIEGELUNG.verwaltungPruefen` gegen
  `KONFIG.verwaltung.pruefwert` (`SHA-256("quizz-admin|" + Passwort)`). Das
  Passwort selbst steht in keiner Datei — die Seite ist öffentlich.
- Der Zustand liegt im Gerätespeicher (`ICH.verwaltungAktiv()`), nicht im
  gemeinsamen Stand: Verwaltung ist eine Eigenschaft des Geräts, nicht der Runde.
- Sichtbar wird sie durch die Marke *Verwaltung aktiv* im Kopf und die roten
  Knöpfe an den Spielerkarten.
- Passwort ändern: neue Prüfsumme rechnen (Anleitung steht in `js/konfig.js`)
  und dort eintragen. `tests\test-versiegelung.js` prüft, dass Prüfsumme und
  vereinbartes Passwort zusammenpassen — beim Ändern also auch den Test
  anpassen.
