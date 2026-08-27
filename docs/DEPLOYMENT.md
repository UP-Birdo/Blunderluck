# Auslieferung

Wie Blunderluck auf GitHub Pages kommt und wie die gemeinsame Datenbank
eingerichtet wird. Reihenfolge: erst lokal prüfen, dann Datenbank, dann
hochladen. **Stand 23.08.2026: Datenbank, Repository und Verwaltungs-Passwort
sind noch NICHT eingerichtet — das sind die drei Nutzer-Aufgaben aus der
`STATUS.md`.**

---

## 1. Lokal prüfen

    tools\Blunderluck lokal starten.cmd

Doppelklick, es öffnet sich `http://localhost:8080/`. Beenden mit Strg+C im
schwarzen Fenster.

Die Seite direkt per Doppelklick auf `index.html` zu öffnen funktioniert
grundsätzlich auch, ist aber kein verlässlicher Test: unter `file://` verhalten
sich Browser-Speicher und Datenbank-Abfragen anders als später auf GitHub Pages.

### Prüfliste von Hand

Die Regressionstests decken Spiellogik und Siegel ab, nicht den Bildschirm.
Vor jeder Auslieferung diese Punkte durchgehen — am besten in zwei Fenstern,
damit zwei Mitspieler entstehen (zweites Fenster im privaten Modus, sonst
teilen sich beide denselben Gerätespeicher):

1. Seite lädt, im Kopf stehen **Blunderluck**, Versionsnummer und ein
   Statuspunkt.
2. Beim ersten Aufruf fragt ein eigener Dialog **Bist du schon dabei?** mit
   der Liste der Mitspieler (leer bei leerer Runde). Über **Ich bin neu
   hier**: Name eingeben, dann zweimal die PIN — bei ungleichen Eingaben
   kommt eine Meldung und die Abfrage von vorn.
3. **Anmeldung von einem fremden Gerät:** Im zweiten Fenster den Namen aus
   der Liste wählen und die PIN eingeben — man ist derselbe Spieler. Mit
   falscher PIN dreimal probieren: es muss abbrechen, ohne hineinzulassen.
4. **Verwaltung** (erst nach gesetztem Prüfwert in `js\konfig.js`): Passwort
   eingeben, danach erscheint **Spieler entfernen**; **Verwaltung beenden**
   schaltet zurück.
5. **Tab Team Schach:** Die **Übersicht der Partien** erscheint **sofort** —
   bei leerer Ablage mit dem Hinweis, dass noch keine Partie läuft.
6. **Neue Partie** anlegen: erst Auswahl der Spielart, dann der Name, dann
   öffnet sich die Partie.
7. In einem Team **Mitspielen**, im zweiten Fenster das andere Team, beide
   **Bereit**: Die Partie startet. Eine Figur antippen zeigt Punkte auf den
   möglichen Feldern.
8. **Ziehen:** Die Figur gleitet vom alten zum neuen Feld — auch im zweiten
   Fenster, das den Zug über die Datenbank mitbekommt. Beim bloßen Warten
   darf sich die Bewegung nicht wiederholen.
9. **Jede Spielart einmal öffnen:** Jedes Brett muss vollständig sichtbar
   sein, ohne dass die Seite seitlich scrollt.
10. **Fähigkeiten** einsammeln und einsetzen; **„Schach lernen"** öffnen —
    seit v0.103.0 über das **Menüband oben rechts auf dem Start**, nicht mehr
    bei „Runde beitreten" (vier Abschnitte, 8-mal-8-Brett, keine Lootbox).
11. **Löschen** einer Partie fragt nach und entfernt sie in beiden Fenstern.
12. **Tab Rangliste:** alle Mitspieler mit Gesamtpunkten; hinter dem **i**
    steht die Rechnung. Nach einer beendeten Partie hat der Sieger dort mehr
    Punkte; ein Tipp auf den Namen öffnet das Profil.
13. **Auf dem Handy** (oder im schmalen Fenster unter 600 Pixeln): Das Brett
    reicht bis an die Ränder, die Teamkarten stehen nebeneinander, der
    Zugverlauf ist eingeklappt.

Zusätzlich mit einer echten Datenbank: Eine Änderung muss innerhalb weniger
Sekunden im anderen Fenster erscheinen.

> **Der lokale Server ist nur für dich.** `http://localhost:8080/` erreicht
> niemand sonst. Mit echten Leuten wird erst getestet, wenn die Seite auf
> GitHub Pages liegt.

### Die entscheidende Prüfung

Mit echter Datenbank die Ablage direkt im Browser öffnen:

    https://<deine-datenbank>.europe-west1.firebasedatabase.app/spieler.json

Dort darf keine PIN als Zahl auftauchen, sondern nur `pinPruefwert` und
`pinSalz`. Steht dort eine lesbare PIN, ist die Anmeldung kaputt und die
Auslieferung muss warten.

---

## 2. Gemeinsame Datenbank einrichten (Firebase, einmalig)

Bis das erledigt ist, zeigt die App oben einen Hinweisbalken und speichert nur
auf dem jeweiligen Gerät.

1. `https://console.firebase.google.com` öffnen und mit einem Google-Konto
   anmelden.
2. **Projekt hinzufügen**, Name z. B. `blunderluck`. Google Analytics wird
   nicht gebraucht — abwählen.
3. Links im Menü **Erstellen (Build) → Realtime Database → Datenbank
   erstellen**.
4. Als Standort **europe-west1** wählen (Daten bleiben in Europa).
5. Bei den Sicherheitsregeln **im gesperrten Modus starten** und die Regeln
   anschließend im Reiter **Regeln** durch genau das hier ersetzen:

       {
           "rules": {
               "spieler": {
                   ".read": true,
                   ".write": true
               },
               "team-schach": {
                   ".read": true,
                   ".write": true
               }
           }
       }

   Damit sind ausschließlich diese zwei Pfade offen (`spieler` ist die
   Anmeldungs-Schicht, `team-schach` die Partien), der Rest der Datenbank
   bleibt gesperrt. **Jeder Stand braucht seinen eigenen Eintrag** — kommt
   später einer dazu, gehört sein Pfad (aus `js/konfig.js`) hier ergänzt.
   **Nicht** den Testmodus verwenden: der macht die ganze Datenbank auf und
   schließt sie nach 30 Tagen wieder.
6. Oben im Reiter **Daten** steht die Adresse der Datenbank, etwa
   `https://blunderluck-12345-default-rtdb.europe-west1.firebasedatabase.app/`.
7. Diese Adresse **ohne den Schrägstrich am Ende** in
   [../js/konfig.js](../js/konfig.js) bei `firebaseBasis` eintragen.
8. Lokal neu laden: Der Hinweisbalken verschwindet, im Kopf steht
   `Gemeinsame Tabelle für alle Besucher` mit grünem Punkt.
## 2c. Kosten — und warum im Spark-Plan keine entstehen können

**Auf dem kostenlosen Spark-Plan ist eine Rechnung strukturell unmöglich:**
Es ist kein Zahlungsmittel hinterlegt. Ist ein Kontingent erschöpft, hört
der Dienst auf zu antworten — abgebucht wird nichts. Kosten können erst
entstehen, wenn jemand aktiv auf **Blaze** wechselt.

Enthalten sind 1 GB Speicher, 10 GB Download im Monat und 100 gleichzeitige
Verbindungen. Speicher und Verbindungen sind hier belanglos (Partien wiegen
Kilobytes; REST hält keine Dauerverbindung). **Die einzige Größe, die zählt,
ist der Download**, und der kommt fast vollständig aus der Abfrage alle drei
Sekunden, die den ganzen Stand neu holt — deshalb ruht sie im Hintergrund.
Stellschrauben, falls es je eng wird, in dieser Reihenfolge:
`abfrageIntervallMs` in `js\konfig.js` hochsetzen (z. B. 10000), und erst
danach über Listener statt Abfrage nachdenken (siehe
`entscheidungen\offen-und-abgelehnt.md`, „Die offene Datenbank").
Den echten Verbrauch zeigt Firebase unter **Nutzung** — messen statt
schätzen.

> **BUDGET-ALARM ERST BEI BLAZE.** Hier stand bis 23.08.2026 der Rat, in der
> Google Cloud Console ein Budget anzulegen. Das läuft im Spark-Plan ins
> Leere: Budgets setzen ein Abrechnungskonto voraus, und ein Spark-Projekt
> hat keines. Wer eines Tages auf Blaze wechselt, legt das Budget als
> ERSTES an — vorher ist nichts zu tun.

**Bewusst in Kauf genommen** (geerbte Quizz-Entscheidung): Wer die Seite
aufruft, kann die Ablage lesen und ändern — ohne Anmeldung. Deshalb: nur Vor-
oder Spitznamen eintragen, nichts Vertrauliches. Siehe
[entscheidungen\00-INDEX.md](entscheidungen/00-INDEX.md).

## 2b. Verwaltungs-Passwort setzen (einmalig)

Sechs Ziffern wählen, Prüfsumme rechnen (Anleitung im Kommentar in
[../js/konfig.js](../js/konfig.js), Zutat `blunderluck-admin|`) und bei
`verwaltung.pruefwert` eintragen. Solange der Wert leer ist, ist die
Verwaltung gesperrt; die App läuft trotzdem.

---

## 3. Repository anlegen (einmalig)

1. Auf `https://github.com` anmelden (Konto `up-birdo`), **New repository**.
2. Name: `Blunderluck` (genau so — `js/wunsch.js` und die Werkzeuge nennen
   ihn). Sichtbarkeit **Public** (Pages braucht das im kostenlosen Konto).
3. **„Add README" auf An stellen.** Das ist keine Geschmacksfrage:

   > Ein frisch angelegtes, LEERES Repository hat noch keinen Zweig `main` —
   > es gibt ja noch keinen einzigen Commit. `Deploy-Blunderluck.ps1` holt als
   > Erstes genau diesen Zweig (`/git/ref/heads/main`) und bricht sonst ab mit
   > „Kein Zugriff auf das Repository … Stimmen Token und Rechte?". Diese
   > Meldung führt in die Irre: Der Token ist in Ordnung, es fehlt nur der
   > erste Commit. Das Häkchen legt ihn an.

   Die von GitHub erzeugte README wird beim ersten Deploy automatisch durch
   die richtige `README.md` des Projekts ersetzt.
4. **Add .gitignore**: `No .gitignore`. Ausgeliefert wird ohne git; was nicht
   ins Repository darf, steht als Sperrliste oben im Deploy-Skript.
5. **Add license**: `No license` — bewusst so. Ohne Lizenzangabe gilt das
   volle Urheberrecht: Jeder darf den Quelltext lesen, aber niemand ihn
   weiterverwenden oder unter eigenem Namen veröffentlichen. Eine offene
   Lizenz liesse sich später jederzeit ergänzen; zurücknehmen liesse sie sich
   für einen veröffentlichten Stand nicht mehr.
6. **Create repository**.

## 4. Erste Auslieferung und Pages

Am einfachsten gleich mit dem Skript (Abschnitt 6): Token hinterlegen, dann
`-NurAnzeigen`, dann senden. Danach einmalig Pages einschalten:

1. Im Repository auf **Settings**, links **Pages**.
2. **Build and deployment → Source**: `Deploy from a branch`.
3. **Branch**: `main`, Ordner `/ (root)`, dann **Save**.
4. Nach ein bis zwei Minuten ist die Seite erreichbar unter
   `https://up-birdo.github.io/Blunderluck/`.

> Schlägt der Pages-Bau mit einer allgemeinen Fehlermeldung fehl, ist das
> erfahrungsgemäß oft vorübergehend: unter **Actions** den Lauf öffnen und
> **Re-run all jobs** drücken.

### Wie die Mitspieler drankommen

Sie öffnen die Adresse — mehr nicht. Keine Installation, kein Konto. Die
Seite fragt alle drei Sekunden nach dem Stand, aber nur solange sie im
Vordergrund ist; eine Runde über einen ganzen Tag bleibt im einstelligen
Megabyte-Bereich und damit im kostenlosen Firebase-Kontingent.

## 6. Neue Version ausliefern — mit dem Skript

`tools\Deploy-Blunderluck.ps1` vergleicht die Dateien mit dem Stand im
Repository und sendet **nur die geänderten, in einem einzigen Commit** (GitHub
Pages baut nach jedem Commit neu und erlaubt nur wenige Bauvorgänge je
Stunde).

### Einmalig: Zugriffsschlüssel hinterlegen

1. Auf `https://github.com/settings/personal-access-tokens/new` einen
   **Fine-grained token** anlegen:
   - **Repository access** → *Only select repositories* → `Blunderluck`
   - **Permissions** → *Repository permissions* → **Contents: Read and
     write** und **Issues: Read and write** (fürs Schließen erledigter
     Wünsche mit `tools\Wuensche-Abholen.ps1 -Schliessen <Nr>`; das ABHOLEN
     geht auch ohne Token).
   - Laufzeit nach Geschmack.

   **`Wuensche-Abholen.ps1` braucht PowerShell 7** (`pwsh`, nicht
   `powershell`); `Deploy-Blunderluck.ps1` läuft unter beiden.
2. Token kopieren und im Projektordner ausführen:

       powershell -ExecutionPolicy Bypass -File "tools\Deploy-Blunderluck.ps1" -SetToken

   Der Schlüssel wird per DPAPI verschlüsselt in `tools\github-token.dat`
   abgelegt und lässt sich nur von **diesem** Windows-Konto auf **diesem**
   Rechner lesen. Er wird nie mit hochgeladen (Sperrliste im Skript).

> **ZWEI ANMELDUNGEN = ZWEI SCHLÜSSEL** (Quizz-Lehre, 2026-08-08). Dieser
> Rechner wird als Domänen- und als lokaler Benutzer benutzt; DPAPI ist an
> das Windows-KONTO gebunden. Unter der jeweils anderen Anmeldung meldet das
> Skript „Der hinterlegte Schluessel laesst sich nicht lesen" — das ist kein
> kaputter Token. Am einfachsten: **immer aus derselben Anmeldung
> ausliefern**; sonst `-SetToken` je Anmeldung.

### Jedes Mal

1. Version in [../js/konfig.js](../js/konfig.js) nach der Haus-Regel erhöhen
   (`0.MINOR.PATCH`, siehe Dev-`CLAUDE.md`).
2. [../CHANGELOG.md](../CHANGELOG.md) ergänzen, `STATUS.md` nachziehen.
3. Tests: `powershell -ExecutionPolicy Bypass -File "tools\Test-Blunderluck.ps1" -NurFazit`
   — erwartet `0 Fehler`.
4. Prüfliste aus Abschnitt 1 durchgehen.
5. Erst ansehen, was gesendet würde:

       powershell -ExecutionPolicy Bypass -File "tools\Deploy-Blunderluck.ps1" -NurAnzeigen

6. Dann senden:

       powershell -ExecutionPolicy Bypass -File "tools\Deploy-Blunderluck.ps1"

7. Bei jeder durch 5 teilbaren MINOR im Dev-Ordner das Voll-Backup ziehen:
   `tools\Backup-Projekt.ps1 -Projekt Blunderluck`.

## Was NICHT ausgeliefert wird

- `TODO.md` und `ROADMAP.md` (interne Planung),
- `CLAUDE.md` und `STATUS.md` (Arbeitsanweisung und Stand),
- `tools\github-token.dat` (der Schlüssel),
- alles, was nicht im Projektordner liegt.
