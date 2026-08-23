# Blunderluck - Entscheidungen / Offen, Nutzer-Entscheidungen noetig, bewusst abgelehnt

## Die offene Datenbank - Freundeskreis-Entscheidung mit Ablaufdatum (23.08.2026)

Blunderluck uebernimmt bewusst die Quizz-Bauweise: Die Firebase-Pfade sind
fuer jeden les- und schreibbar, es gibt keine Konten, und der Client schreibt
den Spielstand selbst (abgesichert nur ueber den Zugzaehler). Das ist ein
Tuerschloss unter Freunden, kein Tresor - und fuer den Freundeskreis die
richtige Abwaegung: Seite oeffnen, Namen eintragen, spielen.

**Das Ablaufdatum ist bekannt und dokumentiert** (Beratungs-Zusammenfassung
in `docs\uebergabe-schach-app.md`, eingeordnet 23.08.2026): Sobald FREMDE
mitspielen sollen - Play Store, offener Link, Rangliste mit Ehrgeiz -,
traegt diese Bauweise nicht mehr. Der Umbau dafuer ist GRUNDSAETZLICH, kein
Patch, und wird erst gebaut, wenn die Entscheidung faellt (ROADMAP,
Fernziel "Play Store"): echte Anmeldung (Firebase Auth), Zuege als ABSICHT
statt als fertiger Stand, Pruefung in einer Cloud Function, Regeln zu.

Zwei Weichen sind dafuer schon heute richtig gestellt, ohne dass etwas
gebaut wurde:

- **Dasselbe Firebase-Projekt kann bleiben.** Auth und Functions lassen
  sich im bestehenden Projekt ergaenzen; der Umbau braucht KEIN neues
  Projekt und keine Datenmigration wegen der Plattform.
- **Realtime Database statt Firestore ist bewusst gewaehlt:** Die ganze
  Speicher-Schicht (`speicher.js`, REST ohne SDK) ist darauf gebaut,
  und fuer kleine, ganze Staende mit 3-Sekunden-Abfrage ist die RTDB das
  einfachere und billigere Werkzeug. Die einzige EU-Region der RTDB ist
  `europe-west1` (Belgien) - das `europe-west3`/Frankfurt aus der
  Beratung gilt fuer Firestore und ist hier kein Fehler im Setup. Ein
  spaeterer Wechsel auf Firestore waere Teil des grossen Umbaus, nicht
  dessen Voraussetzung.

**Bekannter Kostenpunkt derselben Entscheidung:** Die App fragt alle drei
Sekunden per REST den GANZEN Stand ab (nur im Vordergrund). Fuer den
Freundeskreis liegt das im Cent-Bereich; bei fremdem Publikum waere die
Abfrage der erste Umbaupunkt (Listener statt Abfrage, ein Pfad je Partie).
Beim Anlegen der Datenbank wird deshalb ein Budget-Alarm gesetzt
(`DEPLOYMENT.md`, Abschnitt 2).

## Warum die Abstimmung eine Frist braucht

Mit „Team muss sich einig sein" konnte ein Team komplett stillstehen: Zwei
Leute, einer hört auf mitzuspielen — und der andere kann nie wieder ziehen. Das
ist kein theoretischer Fall, sondern der Normalfall bei einer Partie über
mehrere Tage.

Deshalb läuft die Abstimmung jetzt gegen die Uhr: zehn Sekunden, dann gilt der
Vorschlag. Wer **zweimal** nicht abstimmt, verkürzt sie auf fünf, dann auf drei
Sekunden — und sobald er wieder mitstimmt, gilt wieder die volle Zeit. Die
Staffelung bestraft also nicht das einmalige Verpassen, sondern nur das
dauerhafte Fernbleiben.

Die Frist steht **im gemeinsamen Stand**, nicht in jedem Browser: Sonst liefe
sie auf jedem Gerät anders, und wer eine langsame Verbindung hat, wäre immer der
Säumige. Ausgelöst wird sie vom ersten Gerät, das den Ablauf bemerkt; die
Zugzähler-Prüfung sorgt dafür, dass sie trotzdem nur einmal greift.

## Bewusst abgelehnt

| Idee | Warum nicht |
|---|---|
| Anmeldung mit Passwort/Konten | Widerspricht dem Zweck: Seite aufrufen, Namen eintragen, dabei sein. |
| Verschlüsselung der ganzen Runde | Der Schlüssel müsste in der öffentlichen Seite stehen — Scheinsicherheit. Für die Würfel löst das Siegel das Problem richtig. |
| Punkte nach Position (richtiger Wert an richtiger Stelle) | Fünf gewürfelte Würfel haben keine Reihenfolge. |
| Gemeinsames Auflösen für alle auf Knopfdruck | Bis v0.2 so gebaut, auf Wunsch ersetzt: Jeder deckt nur sich selbst auf. Das Feld `phase` bleibt als Altbestand im Datenvertrag, ohne Wirkung. |
| Automatisches Auflösen zu einer festen Uhrzeit | Mehr Technik als Nutzen; jeder deckt auf, wann er will. |
| Chat oder Fragenprotokoll in der App | Die Fragen stellt man sich im echten Leben — genau das ist das Spiel. |
| Emojis für die Würfelwerte | Haus-Regel. |
| Das erste Bild einer Anleitung weglassen (Meldung I20, v0.75) | Es zeigt die Ausgangsstellung — und die ist seit v0.50 der Grund, WARUM man die Fähigkeit nimmt (ein Angreifer, eine Sperre, eine Lücke). Bild 2 unterscheidet sich davon nur durch den Fingerabdruck auf der Marke, weil die Marke seit v0.58 in JEDEM Bild steht (sonst sprang die Anleitung in der Höhe). Beim Doppelzug fällt das auf, gilt aber für jede Fähigkeit gleich: Nur dort wegzulassen wäre eine Ausnahme ohne Regel. **Wer es trotzdem will, sagt es — dann fällt es überall weg.** |

## Braucht eine Nutzer-Entscheidung (nicht ungefragt bauen)

- **Firebase-Konto anlegen und Adresse eintragen** — bis dahin läuft die App im
  lokalen Rückfall (Hinweisbalken oben), und Mitspielen ist nicht möglich.
- **Regeln der Datenbank**: offen für alle (heute nötig) oder später einschränken.
- **Lizenz** für das öffentliche Repository.
- Ob es eine **Runden-Historie** geben soll (heute überschreibt eine neue Runde
  die alte).
- **Wie weit „weniger Tokens" gehen soll.** Die Aufteilung grosser Dateien ist
  gemacht (v3.2). Weiter sparen ginge nur an den Kommentaren und damit an den
  Begründungen. Drei Wege stehen in `ROADMAP.md`, Punkt 2; bis zur Entscheidung
  wird nichts gekürzt.

## Was sich nur am Gerät beurteilen lässt (Stand 20.08.2026)

**Hierher umgezogen aus der `STATUS.md` (v0.104).** Diese Beobachtungen standen
dort unter „SPIELEN — was danach zählt" und „Wartet auf den Nutzer" — und zwar
als einzige Kopie. Beim Eindampfen der `STATUS.md` wären sie verlorengegangen;
wiederhergestellt wurden sie aus `Backup\Quizz\v0.100.0`.

**Sie gehören hierher und nicht in den Stand:** Es sind keine Aufgaben und
nichts blockiert etwas — es sind Fragen, die keine Tabelle beantwortet, weil
die Tests sagen, DASS die Regeln greifen, nicht ob sie sich gut anfühlen. Der
Stand wird bei jedem Sitzungsbeginn gelesen, diese Datei nur bei Bedarf.

**Die Nummerierung stammt aus der alten Aufzählung** und ist so stehen
geblieben, damit die Punkte wiedererkennbar bleiben.
2. **SPIELEN — was danach zählt.** Die Punkte darunter sind
   Beobachtungen, die nur am echten Gerät zu machen sind; die Tests sagen, dass
   die Regeln greifen, nicht ob sie sich gut anfühlen. **Der Nutzer startet eine
   neue Partie** (die alte hatte ein zerfranstes Kreuz aus der Zeit vor v0.77.1
   — bewusst nicht repariert, siehe `ROADMAP.md`, Bündel P).

   **Neu aus v0.79 mit anzusehen — hier liegt gerade die grösste Unsicherheit,
   weil keine Tabelle sagt, wie es sich anfühlt:** Sind **Schubs** und
   **Platztausch** in der Praxis nützlich oder nur nett? Fühlt sich die
   gewöhnliche Stufe jetzt zu STARK an, wo zwei ihrer vier Fähigkeiten den Zug
   behalten? **Falls ja, ist der Hebel nicht das Zurücknehmen einer der beiden,
   sondern die Stufenchance** (`SCHACH_VARIANTEN.STUFEN`, heute 52 / 33 / 12 /
   3). Und reicht die verkürzte **Halluzination** mit 4 Halbzügen noch, um
   wehzutun, ohne die Partie zu drehen?

   **Neu aus v0.78 mit anzusehen:** Fehlt Ausweichen im Spiel, oder merkt man es
   gar nicht?

   **Neu aus v0.76 mit anzusehen:** Fühlt sich der **Materialzähler** richtig
   an, jetzt wo nur der Führende ein Plus trägt? Ist der **Abbrechen-Knopf**
   bei Sprung und Teleport dort, wo man ihn sucht? Spielt sich das **Kreuz mit
   Zufallsarmee** (4 Figuren je Startseite beim kleinen) gut? Und sitzt die
   **Zugspur** jetzt richtig, wenn eine Unglücks-Lootbox eingesammelt wird
   (grün der Zug, gelb nur die Wirkung)?
   **Neu aus v0.77 mit anzusehen** — das meiste davon ist Gefühl und lässt sich
   nur am Gerät beurteilen: Sind die **vier Animationen** so zurückhaltend, wie
   sie sein sollen, oder stören sie beim schnellen Spielen (Dauern in
   `css\stil.css`: 360 ms Lootbox, 320 ms Figur, 420 ms Ring)? Ist der
   **Unglücks-Anteil** auf „viele" und „Regen" jetzt zu hart, wenn das Brett
   leer wird — die Kurve geht bis 40 Prozent (`PECH_CHANCE_HOCH`)? Fühlt sich
   das **rollende Königs-Nudelholz** fair an oder zu mächtig? Und stört es,
   dass die **Mauer** eine Lootbox frisst, oder ist es der erwartete Preis?

3. **Beobachtungen aus älteren Runden, die weiter offen sind** (nur am echten
   Gerät zu klären, nichts davon blockiert etwas):
   - **Kreuz-Bretter am Gerät ansehen.** Findet man sich auf einem um 90 Grad
     gedrehten Brett zurecht, oder verwirrt die Randbeschriftung? Sind beim
     **Kreuz-Duell** die zwei leeren Flügel ein spannender Umweg oder nur weite
     Wege? Ist beim **Kreuz mit vier Armeen** die Mitte zu eng, und machen zwei
     Leben je Team die Partien zu lang? Bleibt das **grosse Kreuz** (196 Felder,
     mehr als das Doppelbrett) am Handy flüssig?
   - **Die Regeln aus v0.56 bis v0.60 spielen.** Wie stark ist die
     Aufwertungskette (Bauer bis König)? Ist der Bauernschub ohne Pluszeichen
     noch attraktiv, trifft man den 2×2-Frost sauber, sind vier Halbzüge Fessel
     richtig? Fühlt sich das Platzieren gut an, ist die geliehene Dame mit
     einem Zug zu knapp? Ist Ausweichen nur im Gegenzug praktisch tot?
     Versteht man am Brett, warum ein Zug unterwegs abgebrochen ist?
   - **Die Anleitungen am Handy durchsehen.** Werden sie zu lang? Sind 1,6
     Sekunden je Bild (`TEAM_SCHACH.ANLEITUNG_MS`) bei sechs Bildern angenehm?
   - **Die Zufallsarmee spielen.** Fühlen sich die gewürfelten Figuren gut an
     (`SCHACH_VARIANTEN.ARMEE.figuren`, 12 % auf zwei Könige)?

4. Danach die alten Nutzer-Entscheidungen weiter unten (Token-Sparen) und die
   vorgemerkte Idee: eine **Gegen-Fähigkeit, die Risse wieder schliesst** (beim
   Bau von v0.54 vorgesehen).

## Wartet auf den Nutzer

**Keine offene FRAGE** — alle Nutzer-Entscheidungen bis einschliesslich 20.08.
sind beantwortet und festgehalten (die letzte, „kein Item führt direkt zu
Schach, Matt oder Patt", in `entschieden-ab-v0-41.md`). Was hier steht, sind
Dinge, die nur am echten Gerät zu beurteilen sind.

**Aus den Runden v0.94 bis v0.97 — bitte am Gerät ansehen:**

- **Wie sich die neue Item-Regel spielt.** Sie fällt im ENDSPIEL auf: Steht der
  gegnerische König frei, sind Verstärkung, Nekromant, Wiederbelebung,
  Nachschub und Spiegel oft grau, weil jede neue starke Figur Schach gäbe. Ist
  das fair oder lästig? **Der Hebel wäre der dritte Fall der Regel (Patt)** —
  den könnte man einzeln lockern, ohne dass Schach und Matt zurückkommen.
- **Ob die Mauer sich unverändert mächtig anfühlt.** Sie gibt nie Schach, sie
  sperrt — sie sollte von der Regel gar nicht berührt sein. Wenn doch, ist beim
  Trennen von direkt und indirekt zu grob geschnitten worden.
- **Das Fenster einer Fähigkeit:** Liegt wirklich nichts mehr über den Knöpfen
  (Prüfliste in `docs\DEPLOYMENT.md`, Punkt 17b)?
- **„Schach lernen" am Handy:** Sind die 8-mal-8-Bretter neben dem Text gross
  genug, und stimmt die Reihenfolge der vier Abschnitte?

- Am Handy anschauen, ob der abgespielte Ablauf lesbar ist und ob 1,6 Sekunden
  je Schritt passen (`TEAM_SCHACH.ANLEITUNG_MS`) — die Tests sagen nichts über
  Größen und Zeiten.
- Eine erste echte Runde zu Ende spielen — danach die Punkte-Verhältnisse
  prüfen.
- Entscheidung, wie weit „weniger Tokens" gehen soll (weiter sparen ginge nur
  an den Kommentaren).
- „Weniger Text im Würfel Quizz" ist auf Ansage zurückgestellt.
