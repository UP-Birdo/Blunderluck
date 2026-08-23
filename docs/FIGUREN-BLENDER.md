# Die 3D-Figuren für das Quizz-Schach — Vorgabe für den Blender-Bau

Diese Datei ist die **Übergabe an den Chat (oder Menschen), der beim Bauen
der Figuren in Blender hilft.** Sie beschreibt, wie die Figuren AUSSEHEN
sollen und was genau geliefert wird. Der Einbau in die App passiert danach
im Quizz-Projekt (siehe `ROADMAP.md`, Bündel Z3 — dort steht derselbe
Liefervertrag).

## Wofür die Figuren sind

Eine Web-Schach-App bekommt einen schaltbaren „3D-Look": abgerundete
Brett-Kacheln mit Tiefe, Hüpf-Züge, weiche Animationen. Vorbild ist ein
Dribbble-Video mit einem Spielzeug-Schachbrett — knetartige, runde Figuren
auf dicken Kachel-Klötzen. Die Figuren werden als **fertige Bilder (PNG)**
eingebaut, nicht als 3D-Modelle: Die App zeigt je Feld ein Bild.

## Der Stil — Spielzeug, nicht Turnier

- **Weich, rund und GEDRUNGEN wie Knete oder Spielzeug:** überall großzügige
  Rundungen, keine scharfen Kanten, keine feinen Rillen oder Ornamente.
  Lieber zu einfach als zu detailliert.
- **Matte Oberfläche:** wie mattes Plastik oder Ton. KEIN starker Glanz,
  keine Spiegelungen — höchstens ein sehr weiches, breites Glanzlicht.
- **Einfache, kräftige Silhouetten:** Die Figuren werden am Handy auf
  Feldern von teils nur **25 bis 40 Pixeln** Kantenlänge gezeigt. Jede
  Figur muss allein an ihrem UMRISS erkennbar sein. Im Zweifel Details
  weglassen und die Kopfform übertreiben.
- **Standfest:** breite, runde Basis (gemeinsamer Sockel-Look für alle
  sechs Arten), damit sie auf den Kacheln „stehen".

## Die sechs Arten und ihre Erkennungszeichen

| Figur | Erkennungszeichen der Silhouette | Relative Höhe |
|---|---|---|
| Bauer | Kugelkopf auf kurzem Kegel | 0,55 |
| Turm | Zylinder mit 3–4 dicken, runden Zinnen | 0,70 |
| Springer | Stilisierter Pferdekopf mit Mähne-Bogen | 0,75 |
| Läufer | Tropfenform mit runder Kugelspitze und schräger Kerbe | 0,75 |
| Dame | Krone aus kleinen Kugeln (wie im Vorbild-Video) | 0,90 |
| König | Höchste Figur, Krone mit Kreuz oder klarer Einzelzacke | 1,00 |

Relative Höhe = Anteil an der Königshöhe. Alle stehen auf gleich großen
Sockeln.

## Die zwei Farben

- **Weiss:** warmes Creme (Richtwert `#f2ecdf`), nicht klinisch reinweiß.
- **Schwarz:** dunkles Anthrazit (Richtwert `#2b2e35`), NICHT reines
  Schwarz — sonst ersaufen die Formen. Gleiche Materialeinstellungen wie
  Weiss, nur die Farbe wechselt.

Beide müssen auf hellen UND dunklen Kacheln lesbar sein (die App zeigt
weiße und blaue Felder, hell wie dunkel).

## Szene, Kamera, Licht — EINMAL bauen, für alle 12 Bilder

- **Eine einzige Szene** für alle Renderings: Kamera und Licht werden
  eingerichtet und dann NIE mehr angefasst — nur die Figur wird
  ausgetauscht. Sonst passen die Figuren am Brett nicht zusammen.
- **Kamera:** von schräg oben, **50 Grad** gekippt — man schaut deutlich auf
  die Figuren herab und sieht ihren Sockel als Ellipse. **Das ist der
  entscheidende Punkt:** Nur so wirken sie, als STÜNDEN sie auf der Kachel;
  von der Seite kleben sie davor. (Bis v0.121 standen hier 15 bis 25 Grad —
  geändert am 22.08. nach genauem Blick auf das Vorbild-GIF.) **Orthografisch**,
  damit hohe und niedrige Figuren gleich wenig verzerrt sind.
- **Der Preis des steilen Winkels:** Von oben verliert eine Figur ihren
  Umriss. Wer daran dreht, prüft danach IMMER, ob Bauer, Läufer und Dame auf
  32 Pixeln noch verschieden aussehen. Deshalb trägt der Läufer seit v0.122
  eine Spitze statt einer Kugel und der Springer eine kurze, dicke Schnauze.
- **Licht:** ein großes, weiches Hauptlicht von oben links, dazu sanfte
  Umgebungsaufhellung, damit die Schattenseite nicht absäuft. Für alle
  zwölf Bilder identisch.
- **KEIN Bodenschatten im Bild:** Der Schatten auf der Kachel kommt von
  der App (CSS). Also Boden/„Shadow Catcher" ausschalten — die Figur
  schwebt frei auf durchsichtigem Grund.

## Die Lieferung — genau das kommt heraus

1. **12 Dateien**, exakt so benannt (Kleinbuchstaben, ohne Umlaute):
   `figur-bauer-weiss.png`, `figur-bauer-schwarz.png`,
   `figur-springer-weiss.png`, `figur-springer-schwarz.png`,
   `figur-laeufer-weiss.png`, `figur-laeufer-schwarz.png`,
   `figur-turm-weiss.png`, `figur-turm-schwarz.png`,
   `figur-dame-weiss.png`, `figur-dame-schwarz.png`,
   `figur-koenig-weiss.png`, `figur-koenig-schwarz.png`
2. **PNG mit durchsichtigem Hintergrund** (RGBA), quadratisch,
   **384 × 384 px** (bis v0.121: 512 — die steileren Figuren füllen ihr
   Bild stärker aus und rissen bei 512 die 1-MB-Grenze; sichtbar ist der
   Unterschied nicht, siehe `BILD_KANTE` im Skript).
3. **Figur mittig**, Sockel-Unterkante bei allen zwölf auf derselben Höhe
   (etwa 8 % Luft zum unteren Bildrand), oben je nach Figurhöhe mehr oder
   weniger Luft — die Höhenverhältnisse aus der Tabelle müssen IM BILD
   stimmen, weil die App alle Bilder gleich groß anzeigt.
4. **Alle 12 zusammen möglichst unter 1 MB** (bei 384er-PNGs gut machbar —
   Stand v0.122: 723 KB;
   notfalls mit einem PNG-Verkleinerer nachhelfen).
5. **Ablage:** in den Ordner `img\figuren\` des Quizz-Projekts legen und
   dem Quizz-Chat Bescheid geben — er baut sie hinter dem 3D-Schalter ein.

## Prüfliste vor der Abgabe

- [ ] Alle 12 Dateien da, Namen exakt wie oben?
- [ ] Hintergrund wirklich durchsichtig (kein weißes Quadrat)?
- [ ] Auf 40 Pixel verkleinert noch unterscheidbar (Bauer vs. Läufer vs.
      Dame)?
- [ ] König sichtbar am höchsten, Bauer am kleinsten, Sockel gleich groß?
- [ ] Kein Bodenschatten, kein Glanz-Gewitter?
- [ ] Kamera und Licht bei allen 12 identisch?

## Wie sie tatsächlich gebaut wurden (22.08.2026)

Nicht von Hand modelliert, sondern von einem Skript erzeugt:
**`tools\Figuren-Blender.py`**. Es baut in einem Lauf die ganze Szene
(Kamera, Licht, beide Materialien), setzt die sechs Figuren aus
Grundkörpern zusammen und rendert alle zwölf PNGs.

Der Grund für den Skript-Weg steht in den Anforderungen oben: „EINE Szene
für alle 12" und „die Höhenverhältnisse müssen IM BILD stimmen". Beides
von Hand über zwölf Renderings gleich zu halten ist die eigentliche
Schwierigkeit — ein Skript hält es geschenkt. Zwei Punkte daraus sind
festgelegt und sollten so bleiben:

- **Die Kamera ist orthografisch, nicht perspektivisch.** Damit gibt es
  keine Verzerrung, und `kamera_ausrichten()` kann den Bildausschnitt
  aus den echten Figuren ausrechnen: Sockel-Unterkante bei exakt 8 %,
  Königsspitze bei exakt 94 %.
- **`view_transform` steht auf `Standard`.** Blenders Voreinstellung
  (AgX) färbt Farben um; das warme Creme käme als müdes Grau heraus.

Bewusste Abweichung von der Vorgabe: **keine.** Die schräge Kerbe am
Läufer ist gebaut (`LAEUFER_KERBE`), auf 40 Pixeln aber praktisch
unsichtbar — dort trägt die Tropfenform mit Knauf die Erkennung.

Wer eine Figur ändern will, ändert die Zahlen in ihrer `bau_*`-Funktion
und lässt es neu laufen.

### Prüfliste — Stand nach dem Lauf vom 22.08.2026

- [x] Alle 12 Dateien da, Namen exakt wie oben
- [x] Hintergrund durchsichtig (Eckpixel Alpha 0 gemessen)
- [x] Auf 34 px verkleinert unterscheidbar (Bauer / Läufer / Dame geprüft)
- [x] König am höchsten, Bauer am kleinsten, Sockel bei allen gleich
      (Höhen im Lauf gemessen: 0,55 / 0,70 / 0,74 / 0,75 / 0,90 / 1,00)
- [x] Kein Bodenschatten, kein starker Glanz
- [x] Kamera und Licht bei allen 12 identisch (eine Szene, nur die Figur
      wird getauscht)
- [x] Zusammen 951 KB — unter der 1-MB-Grenze, aber knapp: Wer die
      Bilder neu rendert, sieht nach.

### Gestartet wird es NICHT aus dem Blender-Fenster

Zum Rendern: **`tools\Figuren rendern.cmd`** doppelklicken. Es startet
Blender ohne Fenster, zeigt den Fortschritt und ist nach rund 26 Sekunden
fertig.

Der Weg über das Blender-Fenster (`Scripting` → `Run Script`) ist nur zum
Anschauen und Schrauben gedacht, und dann mit **`RENDERN = False`**.
Zwei Gründe:

- Mit `RENDERN = True` blockiert das Rendern die Oberfläche. Blender meldet
  „Keine Rückmeldung", und man sieht bis zum Ende nicht, ob überhaupt noch
  etwas passiert.
- Im Fenster gelten die eigenen Blender-Einstellungen. Steht dort das
  Rendern über die Grafikkarte, bleibt der Lauf auf diesem Rechner hängen —
  beobachtet am 22.08.: Prozess bei 0 % Auslastung, kein Bild geschrieben.
  Das Skript setzt inzwischen `cycles.device = "CPU"` selbst, und der
  Starter ruft Blender zusätzlich mit `--factory-startup` auf.

## Was sich mit v0.122.0 geändert hat (22.08.2026)

Anlass war das Referenz-GIF, das der Nutzer nachgereicht hat. Beim genauen
Hinsehen — und Nachmessen — kamen drei Dinge heraus:

1. **Das Brett im Vorbild ist nicht gekippt.** Die Kacheln sind oben im Bild
   86 Punkte breit und unten 81 — bei einer Perspektive müssten die hinteren
   deutlich schmaler sein. Der ganze 3D-Eindruck kommt aus den Kachel-Klötzen
   und den Figuren. **Damit ist Bündel Z4 (Brett per CSS-Perspektive kippen)
   für diesen Look nicht nötig** — und das war der riskante Teil, weil es
   alles trifft, was flach auf dem Brett liegt.
2. **Der Blickwinkel macht den „steht darauf"-Eindruck**, nicht die Form.
   Deshalb 50 statt 20 Grad (Nutzer-Entscheidung: treu zum Vorbild, obwohl
   es Erkennbarkeit kostet).
3. **Die Figur muss über ihre Kachel hinausragen dürfen.** Im Vorbild
   überlappt jede Figur die Kachel dahinter. In der App macht das die
   `stil.css`: Die Figur wird aus dem Fluss genommen und mit dem Fuss an der
   Kachel festgemacht (Abschnitt „Z3 — DIE GEMALTEN FIGUREN"). Zwei Zeilen
   darin sind Pflicht und nicht Geschmack — `pointer-events: none` (sonst
   fangen überstehende Teile Klicks für ein fremdes Feld ab) und die Mitte
   per `margin-left` statt `transform` (sonst überschreibt der Zug sie).

### Prüfliste — Stand nach dem Lauf vom 22.08.2026, zweite Runde

- [x] Alle 12 Dateien da, Namen unverändert
- [x] Hintergrund durchsichtig
- [x] Auf 32 px unterscheidbar — Läufer hat dafür eine Spitze statt einer
      Kugel bekommen, der Springer eine kürzere Schnauze
- [x] König am höchsten, Bauer am kleinsten, Sockel bei allen gleich
      (gemessen: 0,55 / 0,70 / 0,76 / 0,75 / 0,90 / 1,00)
- [x] Kein Bodenschatten, kein starker Glanz
- [x] Kamera und Licht bei allen 12 identisch
- [x] Zusammen **723 KB** — deutlich unter der 1-MB-Grenze
- [x] Am Brett gemessen: kein waagerechter Überlauf, nichts abgeschnitten,
      klassische Ansicht unverändert
