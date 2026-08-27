# Prüfung: Was fehlt gegenüber heutigem App-Standard?

Geprüft am 27.08.2026 gegen den echten Code von **v0.104.0**, nicht gegen die
Doku (ROADMAP Gruppe K, Punkt 42). Wo nichts gemessen wurde, steht „nicht
geprüft".

**Nichts davon ist sofort gefährlich.** Die schärfsten Punkte (offene
Datenbank, schwache Passwörter) sind bereits bewusst entschieden — siehe
`docs\entscheidungen\offen-und-abgelehnt.md` und `docs\VISION.md`. Wirklich
neu sind drei Funde: der fehlende Service Worker, das fehlende
Datenbank-Backup und der fehlende globale Fehlerfang.

---

## 1. Offline und Installierbarkeit

**Befund.** Es gibt **keinen Service Worker** — weder eine Datei dafür noch
irgendwo ein `navigator.serviceWorker` (Suche über alle JS-, CSS- und
HTML-Dateien: null Treffer). Vorhanden ist nur `manifest.webmanifest`
(`display: standalone`, drei Zeichen, alle `purpose: "any"`, keines
`maskable`). In `index.html` fehlt `apple-mobile-web-app-capable`.

**Bewertung: stört.** Die App ist **nicht offline nutzbar** — auch beim
zweiten Aufruf zeigt der Browser ohne Netz seine Fehlerseite. Spielen ginge
ohne Netz ohnehin nur begrenzt (der Stand liegt in Firebase), aber „Seite lädt
gar nicht" und „Seite lädt und meldet die fehlende Verbindung" sind zwei
verschiedene Erlebnisse; die Haus-Philosophie (`Apps\CLAUDE.md`) verlangt das
Zweite. Ausserdem **bietet Chrome die Installation nicht von selbst an** —
dafür ist ein Service Worker Voraussetzung. Über das Browser-Menü lässt sich
die Seite trotzdem ablegen (am Gerät **nicht geprüft**).

**Vorschlag (klein, Risiko mittel).** Ein Service Worker nach dem Muster von
Fly High: feste Liste der eigenen Dateien im Zwischenspeicher,
Firebase-Aufrufe **nie** zwischenspeichern, Schalter „auf localhost Netz
zuerst". Etwa hundert Zeilen.

**Die Gefahr dabei ist bekannt und teuer:** Die Zwischenspeicher-Version muss
im selben Schritt mit `APP_VERSION` mitziehen (Hausregel). Bleibt sie stehen,
kleben alle Geräte tagelang auf dem alten Stand — der häufigste
Auslieferungsfehler im Haus. Dazu gehört deshalb zwingend eine Prüfung in
`tests\test-syntax.js`, die auch die Service-Worker-Version vergleicht. Ohne
diesen Test sollte er nicht gebaut werden.

---

## 2. Sicherheit der offenen Datenbank

**Befund.** Die Regeln (`docs\DEPLOYMENT.md`, Abschnitt 2) setzen auf
`spieler` und `team-schach` je `".read": true` und `".write": true`. Die
Adresse steht offen in `js\konfig.js` (Zeile 34) und damit im Quelltext jeder
ausgelieferten Seite. Keine Anmeldung, keine Struktur-Prüfung (`.validate`),
kein Export. Wer die Adresse kennt, braucht nur einen Browser oder ein
einzeiliges Kommando, um

- **alles zu lesen** — Namen, Passwort-Prüfsummen samt Salz, alle Partien;
- **eine fremde Partie kaputtzuschreiben** — Brett, Zugrecht, Ergebnis;
- **ein fremdes Konto zu übernehmen** — Prüfsumme und Salz durch eigene
  ersetzen; der Name bleibt, das Passwort ist ab dann das eigene;
- **die Rangliste zu fälschen** — sie rechnet aus den beendeten Partien
  (`js\rangliste.js`), und die stehen offen;
- **alles zu löschen** — ein `DELETE` auf `spieler.json` bzw.
  `team-schach.json` räumt den jeweiligen Stand leer.

**Bewertung: bewusst so, aber mit einer echten Lücke.** Die offene Datenbank
ist entschieden („Türschloss unter Freunden", mit Ablaufdatum, sobald Fremde
mitspielen). Die Lücke liegt woanders: **Es gibt keine Sicherung der
Datenbank.** `tools\Backup-Projekt.ps1` sichert den Projektordner, nicht den
Stand in Firebase. Ein Löschen ist heute endgültig — alle Konten, alle
laufenden Partien, die ganze Rangliste. Das ist unabhängig von jedem
Angreifer unangenehm: Auch ein eigener Fehler beim Bauen richtet denselben
Schaden an.

**Vorschläge, nach Aufwand geordnet.**

1. **Täglicher Abzug der Datenbank (klein, höchster Nutzen).** Ein
   `tools\Sichere-Datenbank.ps1`, das `spieler.json` und `team-schach.json`
   abruft und mit Datum ablegt; als geplante Aufgabe oder vor jeder
   Auslieferung. Bricht die Philosophie nicht, halbe Stunde Arbeit. **Das
   würde ich zuerst bauen.**
2. **Struktur-Regeln in Firebase (klein bis mittel).** `.validate` (erwartete
   Felder, Höchstlängen) und vor allem `".write": "newData.exists()"`, was das
   komplette Leerlöschen verbietet. Wirkt gegen Unfälle und gegen jemanden,
   der herumprobiert — **nicht** gegen jemanden, der die App gelesen hat.
   Einschränkung: Die App schreibt jeweils den ganzen Stand auf einmal;
   feinere Regeln je Spieler oder Partie setzen einen Umbau von
   `js\speicher.js` auf einzelne Pfade voraus (mittel).
3. **Echte Anmeldung (gross, nur MIT Firebase Auth).** Erst damit lässt sich
   „nur der eigene Eintrag ist beschreibbar" formulieren
   (`auth.uid === $spielerId`). Auth allein braucht keinen eigenen Server,
   passt also zur Philosophie. Der zweite Teil — Züge als *Absicht* senden und
   serverseitig prüfen — braucht Cloud Functions und damit den
   kostenpflichtigen Blaze-Plan. Das ist der „grundsätzliche Umbau" aus
   `docs\VISION.md`; neu zu entscheiden ist nur das Wann.

---

## 3. Konto und Datenschutz

**Befund.**

- **Konto löschen gibt es**: Einstellungen, Karte „Account"
  (`js\einstellungen.js`, `_accountKarteBauen`) → `ANMELDUNG.austreten()`
  (`js\anmeldung.js`, Zeile 850). Zwei-Schritt-Knopf, rot, mit Erklärtext.
- **Was danach übrig bleibt:** Der Eintrag verschwindet aus Spielerliste und
  Rangliste. In den Partien stehen die Teams nur als **Kennungen**, nicht als
  Namen (`js\schach-runde.js`, Zeilen 161 und 1652) — der Name ist damit auch
  aus alten Partien weg, die Partie selbst bleibt stehen. Das deckt sich mit
  dem Text in der App und ist sauber.
- **Kein Datenschutz-Hinweis in der App.** Die Karte „Über die App"
  (`_ueberKarteBauen`) enthält nur Version und Wunsch-Knopf. Ein Absatz dazu
  steht nur in der `README.md` — die sieht auf GitHub, wer sie sucht, aber
  kein Spieler in der App. Dort steht auch nicht, **wo** die Daten liegen
  (Firebase, Belgien) und **dass** sie für jeden lesbar sind.

**Bewertung: harmlos im Freundeskreis, blockierend für jeden Store.** Beide
Stores verlangen dasselbe Paar: einen Weg, das Konto **in der App** zu löschen
(ist da), und eine **erreichbare Datenschutz-Erklärung** als eigene Adresse
samt Angabe der erhobenen Daten (fehlt beides). Das ist eine
Store-Anforderung, keine Rechtsberatung.

**Vorschlag (klein).** Eine Karte „Deine Daten" in den Einstellungen, drei
Sätze in Nutzersprache: was gespeichert wird (Name, Passwort-Prüfsumme,
Partien), wo es liegt, dass jeder Mitspieler es lesen kann, was „Konto
löschen" tut. Denselben Text als eigene Seite im Repository, damit später eine
Adresse für den Store existiert. Nebenbei: Die `README.md` spricht noch von
„PIN" und vom Wunsch-Knopf „oben in der App" — beides stimmt nicht mehr.

---

## 4. Passwörter

**Befund** (`js\spieler.js` 183–199, `js\versiegelung.js`, `js\anmeldung.js`
267–338, `js\konfig.js` 84):

- **Regel: 4 bis 8 Zeichen, kein Leerraum**, sonst alles erlaubt. Die 8 ist
  eine **Ober**grenze und im Eingabefeld hart gesetzt (`feld.maxLength`).
  „1234" ist gültig.
- **Verfahren: ein einzelner Durchlauf SHA-256** über
  `"blunderluck-pin|<passwort>|<salz>"`; Salz 16 Byte, offen in der Datenbank.
- **Fehlversuchs-Sperre: drei Versuche**, danach zurück zur Auswahl. Der
  Zähler ist eine Variable im Anmelde-Dialog — neu laden setzt ihn zurück.
- **„Passwort vergessen" gibt es nicht.** Der Text sagt ehrlich: jemand mit
  Verwaltungs-Zugang muss den Spieler entfernen; das Konto ist dann weg.

**Bewertung: gefährlich, sobald Fremde mitspielen; heute hinnehmbar.** Salz
und Prüfsumme stehen offen in der Datenbank, und SHA-256 ist absichtlich
schnell: Vier bis acht Zeichen sind auf einem normalen Rechner in kurzer Zeit
durchprobiert — ohne dass die Sperre etwas davon mitbekommt, denn sie schützt
nur die Eingabemaske, nicht die Prüfsumme. Die Obergrenze von acht Zeichen ist
der ärgerlichste Teil: Sie verhindert gerade das, was hilft. Ein sicheres
Passwort ist heute *lang*, nicht kompliziert. Heutiger Standard wäre ein
absichtlich *langsames* Verfahren — und **PBKDF2 steckt im Browser selbst**
(`crypto.subtle.deriveBits`), also kein Server, keine Bibliothek, passend zur
Bordmittel-Regel. Mit etwa 200.000 Runden kostet eine Anmeldung
Sekundenbruchteile, das Durchprobieren das Hunderttausendfache von heute.

**Vorschlag (mittel), drei additive Schritte.**

1. **Obergrenze weg** (auf z. B. 64), Untergrenze auf 8 für **neue**
   Passwörter. Das allein ist klein und bringt am meisten.
2. **PBKDF2 daneben stellen, nicht ersetzen.** Ein neues Feld `pinVerfahren`
   im Spieler-Eintrag (additiver Datenvertrag, `SPIELER.normalisieren`):
   fehlt es, gilt das alte SHA-256; steht dort `pbkdf2`, wird neu gerechnet.
   Bei der nächsten **erfolgreichen** Anmeldung wird der Eintrag still
   gehoben. So wird kein bestehendes Passwort entwertet — genau die Falle,
   vor der der Kopf von `js\versiegelung.js` warnt.
3. „Passwort vergessen" bleibt bewusst offen; ohne E-Mail-Adresse gibt es
   keinen ehrlichen Weg zurück. Das gehört in den Text aus Punkt 3.

**Zum Verwaltungs-Passwort, ohne Alarm:** sechs Ziffern, SHA-256 **ohne**
Salz, Prüfsumme öffentlich in `js\konfig.js` — in Sekunden durchprobiert. Das
klingt schlimmer, als es ist: Der Zugang darf Spieler entfernen und fremde
Partien löschen, und beides kann bei offener Datenbank ohnehin jeder direkt.
Es ist **keine** zusätzliche Tür, sondern dieselbe. Vor Punkt 2 der offenen
Datenbank lohnt hier kein Aufwand.

---

## 5. Barrierefreiheit

**Was gut ist** (Stichproben, **nicht** mit einem Vorleseprogramm getestet):

- **Knöpfe ohne Text haben ein `aria-label`** — durchgängig, rund 40 Stellen.
- **Die Brettfelder sind echte `<button>`** (`js\team-schach-brett.js`, ab
  Zeile 493) mit Feldnamen im `aria-label`, ergänzt um Lootbox, Mauer, Riss,
  Grab, geliehene Figur. Tastaturbedienbar und vorlesbar.
- **Farbe ist fast nie die einzige Information:** Zielfelder haben Ring *und*
  Punkt, Schlagfelder einen Ring um die Figur (`css\stil-effekte.css`).
- **`prefers-reduced-motion`** wirkt an vier Stellen im CSS und fünf im
  JavaScript; die Animationen werden wirklich abgeschaltet.
- **Dialoge:** `role="dialog"`, `aria-modal`, Escape schliesst, Fokus wird
  gesetzt (`js\dialog.js`).
- **Kontraste** der Grundfarben (`css\stil.css`, `:root`) liegen hell wie
  dunkel klar über dem Geforderten. Brett- und Markierungsfarben: **nicht
  gemessen**.

**Die drei Lücken.**

1. **Mögliche Züge sind für Vorleseprogramme unsichtbar.** `feld-ziel` und
   `feld-schlag` setzen nur eine CSS-Klasse (`team-schach-brett.js`, Zeile
   874), das `aria-label` wird nicht ergänzt. Wer nicht sieht, erfährt nicht,
   wohin die gewählte Figur ziehen darf — die Kernfunktion des Spiels.
2. **Die Tab-Leiste ist halb ausgezeichnet.** `js\tabs.js` (Zeile 59) setzt
   `role="tab"`, aber nie `aria-selected`; die Inhaltsfläche ist kein
   `tabpanel`. Vorgelesen wird „Reiter", nicht welcher offen ist.
3. **Schach und Matt unterscheiden sich nur in der Farbe** (orange gegen rot,
   `.feld-schach` / `.feld-matt`) und stehen in keinem `aria-label`.

**Bewertung: stört.** Für sehende Spieler ist alles bedienbar, das Fundament
ist überdurchschnittlich gut; die drei Punkte sind Ergänzungen, keine Umbauten.

**Vorschlag (klein).** Beim Zeichnen das `aria-label` um „Zielfeld" /
„Schlagfeld" / „Schach" / „Matt" ergänzen — dieselbe Stelle, an der schon
Mauer und Riss angehängt werden; in `TABS.wechseln` `aria-selected` mitziehen.
Für die vielen Brett-Knöpfe lohnt zusätzlich eine Pfeiltasten-Bedienung
(mittel), weil sonst bis zu 64 Tabulator-Schritte nötig sind.

---

## 6. Fehler und Meldewege

**Befund.**

- **Speicherfehler sind gut behandelt.** Schlägt ein Zug fehl, wird der Stand
  zurückgesetzt und der Grund im Dialog genannt („Nicht gespeichert … Dein Zug
  wurde deshalb zurückgenommen", `js\team-schach.js`, `_sendenMitPruefung`).
  Vorbildlich.
- **Verbindungsfehler sieht man kaum.** `Abgleich` meldet „Laden
  fehlgeschlagen" / „Keine Verbindung" an `APP.statusZeigen` (`js\app.js`,
  Zeile 186) — und das schreibt den Text ausschliesslich in die Karte
  „Verbindung" in den **Einstellungen**. Wer auf dem Brett sitzt, sieht bei
  Netzausfall nichts; die Partie wirkt eingefroren.
- **Es gibt keinen globalen Fehlerfang.** Weder `window.onerror` noch ein
  Empfänger für `error` / `unhandledrejection` existiert (Suche über alle
  Dateien: null Treffer). Ein Programmierfehler beim Zeichnen führt zu einer
  halb gezeichneten oder — trifft er `APP.starten` — **völlig leeren weissen
  Seite**: keine Meldung, kein Hinweis auf Neuladen, kein Meldeweg.
- **Der Melde-Weg hängt am Falschen.** Der Wunsch-Knopf (`js\wunsch.js`) sitzt
  in der Karte „Über die App" in den Einstellungen. Zum Melden muss die App
  also noch funktionieren — genau dann nicht, wenn es darauf ankommt. Und ohne
  JavaScript ist die Seite leer, ohne einen Satz dazu (kein `<noscript>`).

**Bewertung: stört, mit einer scharfen Kante.** Die tote weisse Seite ist der
schlechteste denkbare Ausgang: Der Nutzer weiss nicht, ob es an ihm, am Netz
oder an der App liegt, und kann es nicht melden.

**Vorschlag (klein, etwa 25 Zeilen).** Der Hinweis-Balken existiert bereits
(`index.html`, `<p id="hinweis">`). Ein globaler Empfänger für `error` und
`unhandledrejection` füllt ihn mit Version und Kurzfassung des Fehlers und
blendet einen Knopf „Fehler melden" ein (`WUNSCH.oeffnen()`, vorbefüllt).
Denselben Balken für „Keine Verbindung" nutzen, statt die Meldung in den
Einstellungen zu verstecken.

---

## 7. Was sonst auffiel

- **Kein `innerHTML` mit fremdem Inhalt.** Alle 15 Fundstellen setzen
  `innerHTML = ""`, jeder Text geht über `textContent`. Das ist bei offener
  Datenbank wichtig, denn Spielernamen kommen von aussen: Ein eingeschleustes
  `<script>` im Namen hätte sonst bei jedem Mitspieler laufen können. **Diese
  Tür ist zu** — kein Handlungsbedarf, aber beim Weiterbauen so zu halten.
- **Keine Inhalts-Sicherheitsrichtlinie (CSP).** `index.html` hat kein
  entsprechendes `<meta>` — ein zweites Schloss hinter dem ersten. Nützlich,
  nicht dringend, vor der Auslieferung zu erproben, weil ein Fehler darin die
  Seite ganz lahmlegt (mittel).
- **Der Benutzername ist unbegrenzt** (kein `maxLength`, nur Doppelnamen
  werden abgewiesen, `js\anmeldung.js` Zeile 383). Kosmetisch (klein).
- **Manifest ohne `maskable`-Zeichen und ohne `id`.** Auf Android landet das
  Zeichen in einem weissen Kreis statt formatfüllend. Klein, gehört zum
  Service-Worker-Schritt.

---

## Die fünf wichtigsten Lücken

1. **Kein Backup der Datenbank.** Ein falsches Kommando — von aussen oder beim
   Bauen — löscht alle Konten und Partien endgültig.
2. **Kein globaler Fehlerfang.** Ein Programmierfehler hinterlässt eine tote
   weisse Seite ohne Erklärung und ohne Meldeweg.
3. **Kein Service Worker.** Nicht offline nutzbar und nicht sauber
   installierbar — als einzige öffentliche Haus-App und entgegen der
   Haus-Philosophie.
4. **Passwörter: höchstens acht Zeichen, einfaches SHA-256.** Die Obergrenze
   verhindert das einzige wirksame Gegenmittel; PBKDF2 gäbe es im Browser
   umsonst.
5. **Kein Datenschutz-Hinweis in der App.** Niemand erfährt beim Spielen, dass
   sein Name für alle lesbar in Belgien liegt — und ohne diesen Text ist kein
   Store erreichbar.

---

## Bewusst so, kein Mangel

Diese Punkte fehlen gegenüber „was heute in jeder App steckt" — und sind hier
jedes Mal ein Vorzug, keine Lücke:

- **Kein Konto bei Dritten**, kein Google- oder Apple-Login.
- **Keine Werbung, keine Zählpixel, kein Einwilligungs-Banner** — es wird
  nichts gemessen, also gibt es auch nichts zu erlauben.
- **Keine E-Mail-Adresse, keine Telefonnummer.** Genau deshalb gibt es kein
  „Passwort vergessen": Der Rückweg würde die Daten voraussetzen, die
  absichtlich nicht erhoben werden. Der teurere, aber saubere Weg.
- **Keine fremde Bibliothek, kein Bauschritt, kein eigener Server.** Kein
  Lieferketten-Risiko, keine Maschine, die gewartet und bezahlt werden muss.
- **Keine Kosten möglich.** Der Spark-Plan hat kein Zahlungsmittel; ein
  erschöpftes Kontingent stoppt den Dienst, statt eine Rechnung zu erzeugen.
- **Die offene Datenbank selbst** ist eine bewusste
  Freundeskreis-Entscheidung mit bekanntem Ablaufdatum
  (`docs\entscheidungen\offen-und-abgelehnt.md`); neu zu entscheiden ist
  daran nichts ausser dem Wann.
