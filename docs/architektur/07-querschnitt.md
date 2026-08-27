# Blunderluck — Architektur / Wunsch-Weg, Wortbibliothek, Tab-Register, Konventionen, Sicherheit/Datenschutz

## Der Weg eines Wunsches

    App (Wunsch-Knopf)  ->  vorbefülltes GitHub-Formular  ->  Eintrag im Repo
        ->  tools\Wuensche-Abholen.ps1  ->  TODO.md "## Anfragen"
        ->  Nutzer schreibt "bestätigt"  ->  ROADMAP.md

Dasselbe Muster wie im Lernheft. **Warum über ein Formular und nicht über die
GitHub-Schnittstelle:** Ein Schreib-Token müsste dafür in der öffentlichen Seite
stehen — jeder Besucher könnte damit ins Repo schreiben. Der Umweg kostet einen
Klick und braucht kein Geheimnis.

Die Anfragen landen **über** dem Abschnitt „Neu", weil sie noch nicht angenommen
sind. Doppelte Einträge verhindert die Nummer `[#12]` in jeder Zeile.

## Die Wortbibliothek

Hinter dem Verwaltungs-Passwort (`ICH.verwaltungAktiv`). **Seit v3.7 erscheint
der Knopf gar nicht erst ohne Zugang** — vorher stand er für alle da und fragte
beim Drücken nach dem Passwort, was jedem verriet, dass es hier etwas zu holen
gibt.

Ergänzte Wörter stehen in `tafel.eigeneWoerter` — also im **gemeinsamen Stand**,
damit alle Geräte aus derselben Liste ziehen; läge die Ergänzung lokal, zöge
jedes Gerät ein anderes Wort. Dazu die Wortart in `tafel.wortarten` (siehe
Abschnitt Imposter).

Neue Wörter kommen **hinten** an die Gruppe. Das ist kein Schönheitsdetail: Die
Ziehung rechnet mit der Länge der Liste, und vorne eingefügte Wörter würden
alle folgenden verschieben — eine laufende Runde bekäme mitten im Spiel ein
anderes Wort.

*Warum hinter dem Passwort:* Wer die Wortliste kennt, hat als Imposter einen
Vorteil. Der feste Katalog steht zwar im Quelltext und ist nicht geheim, aber es
macht einen Unterschied, ob man ihn in der Konsole sucht oder auf Knopfdruck
bekommt.

**Wörter beisteuern ist NICHT die Bibliothek.** Das darf jeder, vor jeder Runde,
und es geht immer nur um ein einzelnes Wort — man bekommt dabei die Liste nicht
zu sehen und hat deshalb auch keinen Vorteil.

## Tab-Register

Ein Tab ist ein Objekt mit `id`, `titel` und `aufbauen(behaelter)`. `app.js`
registriert ihn, `TABS.starten(...)` zeichnet die Leiste und baut den Inhalt
beim ersten Öffnen einmalig auf. Ein weiterer Tab kostet eine neue Datei und eine
Zeile in `app.js`. Heute sind es drei: Würfel Quizz, Team Schach, Rangliste.

## Bewegung (seit v0.107)

Alles Gleiten und Blenden steht in EINEM Block am Ende der Stil-Kette (seit
v0.93.0: am Ende von `stil-start.css`, dem letzten der fünf Teile), hinter
`@media (prefers-reduced-motion: no-preference)` — wer weniger Bewegung
wünscht, bekommt die App ohne. Drei Mechanismen:

- **CSS-Übergänge und -Animationen** für Knöpfe, Dialoge (`dialog-geht` beim
  Schliessen, 100 ms über `DIALOG.schliessen`) und den Tab-Inhalt.
- **Der Tab-Strich ist ein eigenes Element** (`TABS.markerEl`), das `tabs.js`
  unter den aktiven Knopf misst — nur so kann er GLEITEN.
- **`TEAM_SCHACH.weichZeichnen`** hüllt das Neuzeichnen des Anlege-Bildschirms
  in `document.startViewTransition` (eingebaute Browser-Schnittstelle, keine
  Bibliothek). Die aktiven Knöpfe der vier Reihen tragen je einen
  `view-transition-name` — die Markierung wandert dadurch sichtbar. **Nur für
  Nutzer-Aktionen**; die regelmässige Abfrage zeichnet hart, sonst blendete
  jeder fremde Zug und zwei Übergänge brächen einander ab.

Seit v0.108 dazu: Die Einstellungs-Haken sind **Kipp-Schalter** (reines CSS
auf dem unveränderten `<input type="checkbox">`), der Fokus-Ring erscheint
nur bei Tastatur (`:focus-visible`), und ein offener Dialog **hält die Seite
fest** (`body.dialog-offen` setzt `dialog.js`, dazu `overscroll-behavior:
contain` am Kasten und `scrollbar-gutter: stable` gegen das Seitwärts-Rucken
am Rechner). Animationen beim Aufklappen gibt es nur in STATISCHEN Ansichten
(`stufen-eintrag` — Bibliothek und Anleitung): Was die regelmässige Abfrage
neu baut, darf keine Eintritts-Animation tragen, sonst flackert es bei jedem
fremden Zug.

## Code-Konventionen

- **Deutsch**, durchgehend: Bezeichner, Kommentare, sichtbare Texte.
- **Bezeichner ohne Umlaute** (`wuerfel`, `aendern`, `geaendertAm`),
  **Kommentare und Oberflächentexte mit** korrekten Umlauten.
- Interne Hilfsfunktionen beginnen mit `_` (`_ichKarteBauen`, `_fokusMerken`).
- Einzug 4 Leerzeichen, doppelte Anführungszeichen in JavaScript.
- **Keine typografischen Anführungszeichen in JavaScript-Zeichenketten** — sie
  sind eine bekannte Fehlerquelle (siehe [entscheidungen\00-INDEX.md](../entscheidungen/00-INDEX.md)).
- Keine Emojis, nirgends.

## Sicherheit und Datenschutz

Die Runde liegt in einer öffentlich erreichbaren Datenbank, und jeder Besucher
der Seite darf schreiben. Das ist die Folge des Wunsches, dass alle ohne
Anmeldung mitspielen können. Daraus folgt:

- **Nur Vor- oder Spitznamen eintragen**, nichts Vertrauliches.
- Geschützt sind allein die eigenen Würfel vor der Auflösung — durch das Siegel,
  nicht durch Zugriffsrechte.
- Vermutungen liegen im Klartext in der Datenbank. Die App zeigt sie erst bei
  der Auflösung; wer die Datenbank-Adresse aus dem JavaScript liest, könnte sie
  vorher sehen. Für das Spiel ist das unschädlich — Spicken bei den echten
  Würfeln wäre es nicht, und genau das verhindert das Siegel.

## Was an ZWEI Stellen steht (Stand 24.08.2026)

Am 24.08.2026 aus der `STATUS.md` hierher gezogen: Diese Punkte gelten
dauerhaft und gehören deshalb in die Architektur-Doku, nicht in einen Stand.

**Drei Sachen stehen an zwei Stellen — wer eine ändert, ändert beide:**

- **Die Stufenfarben:** `STUFEN` in `js\schach-varianten.js` UND in
  `tools\Lootbox-Blender.py` — danach die Lootboxen neu rendern.
- **Das App-Zeichen:** `icon.svg` und dieselben Koordinaten in
  `tools\Icons-Erzeugen.ps1` — danach in 32 Pixeln ansehen.
- **Licht und Kamera der beiden Blender-Werkstätten:**
  `tools\Figuren-Blender.py` und `tools\Lootbox-Blender.py`. Laufen sie
  auseinander, sehen Figur und Würfel nach zwei Welten aus. Vertrag:
  [../FIGUREN-BLENDER.md](../FIGUREN-BLENDER.md), letzter Abschnitt.

**Beide Blender-Skripte tragen einen FESTEN absoluten Pfad**
(`AUSGABE_ORDNER`). Sie laufen nur an genau diesem Ort unter genau dieser
Anmeldung — ein verschobener Ordner, ein zweites Windows-Konto oder ein
neuer Rechner macht sie unbrauchbar, und zwar LAUTLOS: Blender legt den
Pfad einfach an. Aufräum-Punkt in der `ROADMAP.md`; dringend erst beim
Umzug.

**Aufräum-Reste, alle in der `ROADMAP.md` eingeordnet:** tote
Würfel-/Imposter-Stile in den Stil-Teilen `css\stil*.css` samt der rund
dreissig Regeln unter
`body.design-3d` (die Klasse ist seit v0.17.0 immer gesetzt), dazu
Quizz-Begriffe in `..\WORTLISTE.md`. Die Datei
[03-wuerfel-quizz.md](03-wuerfel-quizz.md) bleibt bewusst stehen — der dort
beschriebene Anmelde-Ablauf gilt weiter.
