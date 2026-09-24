# Entwurf: Platzieren ohne Textleiste und Anleitungen in 3D

> **Abschnitt 2 ist GEBAUT als v0.130.0** (Nutzer: „kannst neue Funktionen
> einbauen und alles wie du willst"): kein Rückfrage-Dialog, Karte +
> ✓/✕/⟳/? in der Karten-Leiste, Anleitung hinter „?". Noch offen aus 2:
> die aufsteigenden Geister als 3D-Vorschau. **Abschnitt 3 ist GEBAUT als
> v0.134.0 + v0.135.0** (`BRETT_3D.buehne`, eigene Szene statt mehrfachem `Z`,
> gemeinsamer kleiner Renderer). Offen: „Schach lernen" auf der Bühne.
>
> Stand 24.09.2026 (nach v0.129.0). Auftrag im Wortlaut: „die Fähigkeit
> Friedhof — die Leiste musst du dir noch was Besseres überlegen" und „die
> Anleitungen mit Animationen komplett neu machen — schau dir alles an und
> schreibe einen Plan". **Noch nichts davon gebaut.** Die Fragen am Ende
> entscheidet der Nutzer.

## 1. Was heute passiert

### Die Fähigkeit „Friedhof" (im Spiel: **Nekromant**, legendär)

Sie holt gefallene **gegnerische** Figuren zurück, die in einem 2×2-Feld
gestorben sind, als geliehene eigene Figuren auf Zeit (Bauer 8 Halbzüge …
Dame 2). Der Weg heute:

1. Karte antippen → **Dialog** „Nekromant einsetzen?" mit Kurztext, Hinweis
   „verbraucht, kostet den ganzen Zug" und Bildanleitung → „Einsetzen".
2. Das Brett geht in den Platzier-Modus: Gefallene erscheinen blass auf
   ihren Feldern, gültige Ecken sind hell umrandet.
3. **Unter dem Brett erscheint eine Text-Karte** („Nekromant platzieren",
   zwei Sätze Erklärung, „Abbrechen").
4. Feld antippen → grüner 2×2-Rahmen, der Text wechselt, Knopf „Einsetzen".
5. „Einsetzen" oder dasselbe Feld noch einmal antippen.

**Das Problem:** Drei Schritte mit Text (Dialog, Leiste, geänderter Text),
die Leiste schiebt sich unter das Brett — seit v0.128.0 genau dorthin, wo
jetzt die Karten-Leiste steht. Dieselbe Leiste benutzen Wiederbelebung,
Wiedergeburt, Mauer, Frost, Platztausch und Nudelholz.

### Die Anleitungen

- 22 Fähigkeiten + 7 Unglücke (`js\schach-vorschau.js`, `BEISPIELE` /
  `PECH_BEISPIELE`), dazu 12 Lektionen „Schach lernen"
  (`js\schach-grundlagen.js`).
- Die Bilder werden **mit den echten Regeln gerechnet** (gut, bleibt).
- Gezeigt als 6×6-Gitter, darüber ein 3D-**Standbild** je Bild; alle 1,6 s
  springt das Bild um (`ANLEITUNG_MS`), daneben eine nummerierte Liste mit
  Text je Bild. Hand und Pfeile sind flache SVG-Zeichnungen.
- Es **bewegt sich nichts** — es wird nur umgeblättert. Figuren springen
  nicht, Wirkungen haben keinen Auftritt, die Lootbox öffnet sich nicht:
  genau das, was das Spiel seit v0.122.0 kann.

## 2. Vorschlag: Platzieren in der Karten-Leiste, ohne Text

**Leitidee:** Die Karte, die man einsetzt, bleibt in der Hand-Leiste und
wird selbst zum Bedienfeld. Keine Text-Karte unter dem Brett, kein
Bestätigungs-Dialog vorher.

1. **Karte antippen** → sie hebt sich aus der Reihe (größer, leuchtet), die
   übrigen Karten treten zurück. Kein Dialog mehr; wer die Anleitung sehen
   will, hält die Karte gedrückt (langes Drücken = „Was macht die?").
2. **In der Leiste rechts neben der Karte zwei große runde Knöpfe:**
   ✓ (grün, erst aktiv, wenn ein Ziel gewählt ist) und ✕ (Abbrechen).
   Bei Mauer/Nudelholz/Frost ein dritter: ⟳ Drehen. Kein Satz.
3. **Auf dem 3D-Brett:**
   - Gültige Ecken bekommen eine leuchtende Mulde (wie die Zugziele).
   - Die Gefallenen stehen als **Geister** auf ihren Feldern: halb
     durchsichtig, leicht schwebend, in der eigenen Farbe eingefärbt — man
     sieht sofort, was man zurückbekäme.
   - Tippt/zieht man auf eine Ecke, legt sich ein 3D-Rahmen um das
     2×2-Feld; die Geister darin **steigen schon ein Stück auf** (Vorschau),
     die außerhalb verblassen.
4. **✓ oder zweiter Tipp** → die Geister steigen ganz auf und werden
   Figuren (Auftritt wie „Erscheinen", mit Restzeit-Zahl darüber); die
   Karte fliegt aus der Hand.

Dasselbe Muster für alle Platzier-Fähigkeiten — die Leiste
(`_platzierenBauen`) fällt im 3D-Brett weg. Im flachen 2D-Brett bleibt sie
als Rückfall.

**Aufwand:** mittel (eine Runde). Regeln bleiben unberührt; es ändern sich
`_platzierenBauen` / `_handLeisteBauen` (Bildschirm) und `brett-3d.js`
(Geister, Rahmen, Aufsteigen). Tests: `test-bildschirm-anzeigen.js` prüft
die Leiste heute und wird umgeschrieben.

## 3. Vorschlag: Anleitungen neu, als abgespielte 3D-Szene

**Leitidee:** Eine Anleitung ist ein **kleines echtes Spiel, das sich selbst
vorspielt** — mit denselben Figuren, Sprüngen, Wirkungen und Lootbox-
Animationen wie im Match. Die Daten (gerechnete Bilder aus
`schach-vorschau.js`) bleiben; neu ist, **wie** sie gezeigt werden.

### So sieht es aus

- Oben im Fenster eine **lebende 3D-Bühne** (6×6-Brett, fester Blick), keine
  Standbilder mehr. Zwischen zwei Bildern wird **animiert**, nicht
  umgeblättert: Die Figur hüpft ihren Weg, die Box springt auf, die Mauer
  schichtet sich auf, der Nekromant holt die Geister hoch.
- **Die Hand ist 3D:** ein Finger, der zum Feld schwebt, antippt (kleine
  Welle auf dem Stein) und weiterzieht; statt Pfeilen fährt eine leuchtende
  Spur den Weg nach.
- **Text nur als eine kurze Zeile** unter der Bühne, die mit dem Bild
  wechselt (heute: nummerierte Liste mit ganzen Sätzen). Wo es geht, ein
  Zeichen statt eines Worts (Plättchen, Uhr mit Halbzügen).
- **Bedienung:** läuft von selbst in Schleife; Tippen auf die Bühne =
  Pause/Weiter; darunter Punkte je Bild zum Springen. „Weniger Bewegung"
  am Gerät → Bilder nebeneinander wie heute.
- **Überall dieselbe Bühne:** Fähigkeit ansehen, Unglück ansehen, lange
  Drücken auf eine Karte (siehe 2.), Bibliothek, „Schach lernen" (dort heute
  gar keine Animation).

### Wie es gebaut wird

1. **Bühne statt Einzelstück.** `js\brett-3d.js` hält heute genau EIN Brett
   (Zustand `Z`). Schritt 1 ist, den Zustand zu einer Bühne zu machen, die
   es zweimal geben kann (großes Brett + Anleitung), ohne das Verhalten zu
   ändern. Größter Brocken, danach ist der Rest Zusammenstecken.
2. **Abspieler:** nimmt die gerechneten Schritte (`schritte()`), baut je
   Schritt dieselbe Beschreibung, die das große Brett aus den 2D-Knöpfen
   liest, und lässt den Abgleich animieren (bekannter Zug, Wirkung,
   Lootbox). Die Regeln rechnen weiter nur `schach.js` & Co.
3. **Hand und Spur in 3D** (ersetzt `_fingerBauen` / `_pfeileBauen`).
4. **Texte kürzen:** je Bild eine Zeile, in `schach-vorschau.js` neben den
   heutigen Texten (additiv, alte bleiben für 2D und Vorleser).
5. **Schach lernen** auf dieselbe Bühne.
6. **Alte Standbild-Anleitung bleibt** als Rückfall ohne WebGL und in den
   Tests.

**Leistung:** Nur die gerade sichtbare Bühne rendert; das große Brett
pausiert, solange die Anleitung offen ist. Keine Einbuße beim Ziehen.

**Tests:** Die Daten-Tests (`test-schach-vorschau.js`, 27 Prüfungen,
`test-schach-grundlagen.js`, 23) bleiben gültig — sie prüfen, dass jede
Anleitung richtig rechnet. Die Bühne selbst läuft nicht unter Node; sie wird
in der Werkstatt angesehen (Hausregel „Sehen geht vor Rechnen").

**Aufwand:** groß — etwa drei Runden: (1) Bühne umbauen, (2) Abspieler +
3D-Hand für die 29 Fähigkeiten/Unglücke, (3) Texte kürzen + Schach lernen.

## 4. Empfohlene Reihenfolge

1. Platzieren in der Karten-Leiste (Abschnitt 2): schnell spürbar, klein.
2. Bühne umbauen (3, Schritt 1) — ohne sichtbare Änderung, mit Blick in
   der Werkstatt, dass das große Brett gleich bleibt.
3. Anleitungen als Bühne (3, Schritte 2–6).

## 5. Fragen an den Nutzer

1. **Bestätigungs-Dialog vor dem Einsetzen weglassen?** (Vorschlag: ja —
   ✕ in der Leiste bricht ohnehin ab; die Anleitung per langem Drücken.)
2. **Anleitung: läuft von selbst in Schleife, oder Bild für Bild per Tipp?**
   (Vorschlag: von selbst, Tipp = Pause.)
3. **Wie viel Text soll bleiben?** Eine Zeile je Bild (Vorschlag) — oder gar
   keiner?
4. **Brett-Anpassung (v0.129.0):** Das Aussehen, das der Admin einstellt,
   gilt heute nur auf SEINEM Gerät; alle anderen sehen die Vorgabe. Soll
   seine Wahl für ALLE gelten? (Dann muss sie in die Datenbank — ein neues
   Feld, eine kleine Runde.)
