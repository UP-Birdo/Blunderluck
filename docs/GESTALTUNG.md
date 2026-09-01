# Blunderluck — Gestaltung

**Wozu diese Datei:** Wer etwas Sichtbares baut, soll nachschlagen können, mit
welchen Mitteln gestaltet wird — statt eine Farbe zu erfinden oder einen
Abstand zu schätzen. Sie ist der Ersatz für die Anweisung „mach es schön":
gebaut wird mit dem, was hier steht.

**Sie ist KEINE zweite Wahrheit.** Die Werte selbst — jede Farbe, jeder
Abstand, jede Ebene — stehen ausschliesslich als Variablen in
[../css/stil.css](../css/stil.css). Hier steht, was sie BEDEUTEN und wann man
welche nimmt. Wer einen Wert ändert, ändert ihn dort; diese Datei wird nur
dann angefasst, wenn eine Variable dazukommt oder ihre Bedeutung sich ändert.
Deshalb nennt sie bewusst keine Farbcodes: Zwei Listen von Hex-Werten laufen
garantiert auseinander.

Angelegt am 01.09.2026. Anlass: der Punkt „Design-Vorgaben konkret machen"
aus `..\..\Wissen\Erkenntnisse-Reels-2026-08-30.md` — beim Nachsehen fiel auf,
dass keine einzige Doku-Datei des Projekts Farben oder Abstände nennt.

## Wo was wohnt

Fünf Stildateien, in dieser Reihenfolge geladen (`index.html`, **die
Reihenfolge ist die Kaskade — nicht umstellen**):

| Datei | Was darin gehört |
|---|---|
| `css\stil.css` | **Die Grundlagen:** alle Variablen, Grundschrift, Karten, Knöpfe, Dialoge, Leisten |
| `css\stil-brett.css` | Brett, Felder, Figuren, Seitenwahl, Spielerzeilen |
| `css\stil-effekte.css` | Der 3D-Look (`body.design-3d`), Schauspiele, Bewegung |
| `css\stil-auswertung.css` | Abschluss, Bilanz, Partie-Kopf, „Schach lernen" |
| `css\stil-start.css` | Startbildschirm, Menüband, Freunde, Einladung, kleine Bildschirme |

## Die Farben

Alle in `:root`; **jede ist zweimal da** — hell im ersten Block, dunkel im
`@media (prefers-color-scheme: dark)`. Wer eine Farbe ergänzt, ergänzt sie an
beiden Stellen, sonst fehlt sie im dunklen Modus. `color-scheme: light dark`
sorgt dafür, dass auch Bildlaufleisten und Auswahlfelder mitziehen.

| Variable | Wofür sie da ist |
|---|---|
| `--flaeche` | Der Grund der Seite hinter allem |
| `--karte` | Die Fläche eines Kastens, der auf dem Grund liegt |
| `--karte-leise` | Dieselbe Fläche, wenn sie sich zurücknehmen soll (Listen, Felder) |
| `--rahmen` | Jede Trennlinie und jeder Rand, der nichts bedeutet |
| `--schrift` | Text, den man liest |
| `--schrift-leise` | Text, den man nur bei Bedarf liest (Zusätze, Hinweise) |
| `--haupt` | **Die eine Akzentfarbe.** Hauptaktion, ausgewählter Zustand, eigene Seite |
| `--haupt-schrift` | Text AUF `--haupt` |
| `--gefahr` | Nur für Zerstörendes (Aufgeben, Löschen) |
| `--gut` / `--gut-flaeche` | Erfolg, Zusage, Gewinn |
| `--warnung` / `--warnung-flaeche` | Etwas stimmt nicht, ist aber nicht kaputt |
| `--fehler-flaeche` | Der Grund hinter einer Fehlermeldung |

**Zwei Regeln zur Akzentfarbe:**

- **`--haupt` ist die EINZIGE starke Farbe.** Sie gehört auf das, was der
  Spieler als Nächstes tun soll — nicht auf Dekor. Stehen auf einem
  Bildschirm zwei blaue Knöpfe, ist einer davon zu viel.
- **`--gefahr` ist keine Akzentfarbe, sondern eine Warnung.** Rot heisst: Das
  hier nimmt etwas weg. Ein roter Knopf, der nichts zerstört, verbraucht die
  Wirkung für den Fall, in dem sie gebraucht wird.

## Abstände, Rundungen, Ränder

| Variable | Bedeutung |
|---|---|
| `--abstand` | Der Standard-Abstand zwischen zwei Dingen, die zusammengehören |
| `--radius` | Die Rundung einer Karte |
| `--inhalt-rand` | Der Seitenrand des Inhalts — **eigene Variable, weil er am Handy abweicht** |

`--inhalt-rand` existiert wegen eines gemessenen Fehlers (26.08.2026): Der
Inhalt stand am Handy auf 12 px, ein überstehender Kasten rechnete aber mit
`--abstand` und stand vier Pixel zu weit. Wer den Seitenrand ändert, ändert
ihn an dieser einen Stelle.

Kleinere Abstände (4, 6, 8, 10, 12 px) stehen direkt in der jeweiligen Regel.
Das ist Absicht: Sie gehören zu einem bestimmten Bauteil und nicht ins
Grundgerüst.

## Schrift

- **Grundschrift:** die Systemschrift (`"Segoe UI", system-ui, …`), 16 px,
  Zeilenhöhe 1,45. Keine geladene Schriftart — die App soll ohne Netz
  vollständig aussehen.
- **Schreibmaschinenschrift** (`ui-monospace, "Cascadia Mono", Consolas`) nur
  dort, wo Zeichen einzeln abgelesen oder abgetippt werden: Beitritts-Code,
  technische Zeilen.
- **Georgia kursiv** trägt genau ein Zeichen: das `i` hinter Überschriften
  (`.info-knopf`). Es ist absichtlich das einzige serife Zeichen der App —
  daran erkennt man es wieder.
- Grössen werden in `rem` angegeben, nicht in Pixeln, damit die Systemschrift
  des Nutzers durchschlägt.

## Knöpfe

| Klasse | Wann |
|---|---|
| `knopf` | Die Grundform — trägt jeder Knopf, immer zusätzlich zu einer der folgenden |
| `knopf-haupt` | **Die eine Hauptaktion des Bildschirms**, blau gefüllt |
| `knopf-still` | Alles Übrige: Umriss, leise Schrift |
| `knopf-gefahr` | Nur Zerstörendes, roter Umriss |
| `knopf-klein` | Zusatz für Knöpfe in Kopfzeilen und Leisten |

**Eine Hauptaktion je Bildschirm** (Haus-Regel, `CLAUDE.md`). Kleine
zerstörende Aktionen laufen über `DIALOG.zweiSchritt(knopf, aktion)`, grosse
über eine Rückfrage — nie über `confirm()`.

## Ebenen

Sieben Stufen, alle als Variablen ganz oben in `css\stil.css`:
`--ebene-feldmarke` (alles IM Brettfeld), `--ebene-schauspiel`,
`--ebene-leiste` (klebende Leisten), `--ebene-schwebend`, `--ebene-vollbild`,
`--ebene-dialog`, `--ebene-fehler` (der globale Fehlerstreifen, ganz oben).

**Wer sich eine Zahl selbst ausdenkt, baut den Fehler von v0.94 nach:** Eine
Schachfigur lag über dem Knopf „Abbrechen", weil die klebende Knopfleiste
keine Nummer hatte. Die Regel steht auch in
[regeln/30-anzeige.md](regeln/30-anzeige.md).

## Zwei Dinge, die hier bewusst NICHT stehen

- **Brett, Felder und Figuren** haben ihre eigenen Variablen in
  `css\stil-brett.css` (Spaltenzahl, Höchstbreite, Figurengrösse). Sie hängen
  von der Spielart ab und werden zur Laufzeit von `team-schach.js` gesetzt.
- **Der 3D-Look** (`body.design-3d`) steht in `css\stil-effekte.css` und ist
  seit v0.17.0 dauerhaft an. Sein Vertrag — Stil, Namen, Licht der
  Blender-Bilder — steht in [FIGUREN-BLENDER.md](FIGUREN-BLENDER.md).

## Offen

- **`--karte` ist im hellen Modus reines Weiss**, während alles ringsum leicht
  getönt ist. Der Gestaltungs-Punkt aus der Reel-Sammlung („nie reines
  Schwarz/Weiss, immer leicht getönt") würde hier greifen; der dunkle Modus
  ist bereits sauber. **Nicht geändert** — Optik wird angesehen, nicht
  gerechnet, und dafür fehlt bislang der Blick im Browser.
