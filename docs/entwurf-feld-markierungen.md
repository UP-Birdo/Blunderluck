# Entwurf: Feld-Markierungen neu (ROADMAP Gruppe K, Punkt 39)

> **STATUS: ENTWURF — es ist nichts gebaut und nichts geändert.** Am
> Aussehen wird erst etwas angefasst, wenn die Fragen in Abschnitt 7
> beantwortet sind.

Deine Ansage vom 27.08.2026: Zugspur, Schach-Orange und Matt-Rot gefallen;
die weissen Kreise und die roten Ringe sollen raus, „und co"; die Variablen
bleiben; neue Gestaltung soll **auf dem Feld selbst** sitzen statt als
aufgesetztes Zeichen darauf.

---

## 1. Was heute auf einem Brettfeld liegt — die drei Gruppen

### Gruppe 1: bleibt (du hast es ausdrücklich behalten)

| Klasse | Was man sieht | Mittel |
|---|---|---|
| `feld-spur`, `-ende`, `-pech` | grüne bzw. gelbe Kachel: der letzte Zug | ganze Kachel, Fläche + Kante |
| `feld-schach` | orange Kachel unter jedem König im Schach | ganze Kachel, Fläche + Kante |
| `feld-matt` | rote Kachel unter dem matten König | ganze Kachel, Fläche + Kante |
| `feld-gewaehlt` | gelbe Kachel: die angetippte Figur | Fläche + dunkler Rahmen |

**Das ist schon genau die Sprache, die du willst** — alle vier färben die
Kachel selbst um, keiner legt etwas darauf. Deshalb gefallen sie dir.

### Gruppe 2: soll weg — aufgesetzte Zeichen

| Klasse | Was man sieht | Aufgabe |
|---|---|---|
| `feld-ziel` | Rahmen + **weisser Kreis mit dunklem Kern** in der Mitte | „dorthin darf ich ziehen" |
| `feld-schlag` | Rahmen + **roter Ring** um die Figur | „die schlage ich" |
| `feld-wahl` | grüner Ring | „hierhin darf die Fähigkeit" |
| `feld-vorschlag-weg`, `-ziel` | dünne grüne Ringe | Vorschlag eines Team-Mitglieds |
| `feld-spur-wirkung` | grüner Kreisring | Wirkung ohne Bewegung (Schild, Fessel) |

Die ersten beiden hast du benannt. Die drei darunter sind **dieselbe
Bauart** (Ring auf der Kachel) und damit Kandidaten für „und co" — ob sie
mitziehen sollen, ist Frage 2.

**Eine Ausnahme, die du selbst bestellt hast:** `feld-vorschau`, der grüne
Umriss beim Platzieren von Mauer und Frost. Der ist am 26.08. auf deinen
Wunsch entstanden („ein grüner Rand um die Felder, die möglich sind") und
bleibt in jedem Fall stehen.

### Gruppe 3: unantastbar — das sind Spielzustände, keine Bedienhilfen

`feld-mauer`, `feld-frost`, `feld-schild`, `feld-fessel`, `feld-riss`,
`feld-ausserhalb`, `feld-geliehen`, `feld-bonus` (Lootbox),
`feld-restzeit`, `feld-wirkung` / `-pech` (das Aufleuchten).

Die sagen keinem, wie er bedient — sie sagen, wie der Spielstand ist:
welche Figur geschützt ist, wo eine Mauer steht, wie lange noch. Sie
bleiben unverändert.

---

## 2. Warum es einen Ersatz braucht

Wenn Kreis und Ring ersatzlos verschwinden, sieht man nach dem Antippen
einer Figur **nur noch das gelbe Feld der Figur selbst**. Zwei Dinge gingen
dabei still verloren:

- **Die Rochade wäre nicht mehr findbar.** Seit v0.44 gibt es keinen
  eigenen Rochade-Weg mehr; sie ist ein ganz normaler Zugpunkt neben dem
  König. Ohne Zugpunkt weiss niemand, dass sie geht.
- **Die Bildanleitungen und die Rückschau würden leer.** Beide zeichnen
  „wohin man hätte ziehen können" mit genau denselben Klassen.

---

## 3. Vorschlag A — „Die Kachel färbt sich um"

Dieselbe Bauweise wie die Zugspur, die dir gefällt: Die Kachel bekommt
eine eigene Farbe statt ihrer Feldfarbe, im 3D-Look zieht die Kante mit,
sodass der ganze Klotz umgefärbt wirkt. **Kein Kreis, kein Ring, kein
Rahmen mehr — nichts liegt mehr auf dem Feld.**

- **Zugziel:** helle Türkis-Kachel. Türkis, weil jede andere Farbe schon
  vergeben ist (grün = Zugspur, gelb = angetippt, orange = Schach, rot =
  Matt) und weil es zum Blau des Bretts passt, ohne darin zu verschwinden.
- **Schlagziel:** dunkelrote Kachel — die gegnerische Figur steht auf
  rotem Grund.
- **Der Unterschied** läuft über zwei Kanäle: Farbton **und** Helligkeit.
  Das ist wichtig, siehe Abschnitt 5.

```
  a  b  c  d          .  = normales Feld
+-----------+         TT = Zugziel (helles Türkis)
| .  TT .  .|         RR = Schlagziel (dunkles Rot)
| TT[G] TT RR|        [G] = angetippte Figur (gelb, bleibt)
| .  TT .  .|
+-----------+
```

**Im 3D-Look:** genau wie Zugspur und Schach-Feld — Oberseite und Kante
in derselben Familie, die Kachel wirkt aus einem Stück gegossen.

**Wenn zwei Zustände zusammentreffen:** Eine Fläche kann nur EINE Farbe
haben. Liegt ein Schlagziel auf einem Feld der grünen Zugspur, gewinnt das
Rot, und die Erinnerung an den letzten Zug ist auf diesem Feld weg. Das ist
verkraftbar — das Brett folgt schon heute der Regel „was JETZT möglich ist,
zählt mehr als die Erinnerung" —, aber es ist ein echter Verlust. Neben dem
orangen Schach-Feld gibt es kein Problem: Türkis und Orange stehen weit
auseinander.

**Was dagegen spricht:** Das Brett hat dann sieben Kachelfarben. Das ist
viel Farbe für ein Schachbrett.

---

## 4. Vorschlag B — „Stufen-Landschaft": Höhe statt Farbe

Nutzt das, was den 3D-Look ausmacht: Die Kachel-Dicke steht schon heute als
eine Variable da (`--kachel-schatten`) und lässt sich je Feld ändern.

- **Zugziel:** die Kachel **steigt** — Kante von 5 auf etwa 9 Pixel, der
  Schatten darunter wird weiter. Die möglichen Felder stehen als
  Trittsteine aus dem Brett heraus. Farbe: unverändert, nur ein Hauch
  heller.
- **Schlagziel:** die Kachel **sinkt** — Kante weg, Schatten von oben
  hinein, dazu ein roter Schimmer. Die gegnerische Figur steht in einer
  Grube; genau die Bauweise, die heute schon einen Riss zeichnet.

```
  Seitenansicht einer Reihe:

      ___                      ___ = Zugziel, angehoben
  ___|   |___     ___          ___ = normale Kachel
 |   |   |   |___|   |          v  = Schlagziel, abgesenkt
 |___|___|___| v |___|
```

**Im 3D-Look:** das ist seine eigene Sprache — Vorschlag B sieht nur im
3D-Look überhaupt nach etwas aus.

**Wenn zwei Zustände zusammentreffen:** Der grosse Vorteil. Höhe und Farbe
sind **verschiedene Kanäle** und stören einander nicht: Ein Feld kann
gleichzeitig grün (Zugspur) und angehoben (Zugziel) sein, ein Schlagziel
kann gleichzeitig abgesenkt und orange (Schach) sein. Nichts überschreibt
etwas anderes — das kann Vorschlag A nicht.

**Was dagegen spricht:** Drei Dinge, ehrlich benannt.

1. Ein abgesenktes Feld sieht einem **Riss** ähnlich. Auf einem Riss steht
   nie eine Figur, also nie ein Schlagziel — verwechseln kann man es
   trotzdem.
2. Auf dem Handy ist ein Feld etwa 45 Pixel breit. Ob 4 Pixel mehr Kante
   dort auffallen, muss im Browser gemessen werden, bevor gebaut wird.
3. **ROADMAP-Punkt 13 heisst „flachere Ansicht".** Wenn du den irgendwann
   umsetzt, verliert Vorschlag B seine ganze Sprache und muss neu gebaut
   werden. Vorschlag A überlebt das.

---

## 5. Was das für Farbenblinde kostet

Heute unterscheiden sich Zugziel und Schlagziel durch **Form UND Farbe**:
voller Kreis in der Mitte gegen hohlen Ring um die Figur. Wer Rot und Grün
nicht trennen kann, sieht immer noch Kreis gegen Ring.

- **Vorschlag A** gibt die Form auf. Was ihn rettet, ist der
  **Helligkeitsunterschied**: helles Türkis gegen dunkles Rot bleibt auch
  in Graustufen hell gegen dunkel. Bedingung ist also, dass die Töne sich
  nicht nur im Farbton unterscheiden — das lässt sich vor dem Bau messen.
- **Vorschlag B** ist hier klar besser: oben gegen unten braucht keine Farbe.
- **Für beide, und billig:** Jedes Feld ist ein Knopf mit vorgelesener
  Beschriftung („e4"), die heute nicht sagt, ob es ein Zugziel ist. Zwei
  Zeilen mehr („e4, Zugziel" / „e5, schlagbar") würde ich in jedem Fall
  mitnehmen.

---

## 6. Was gebaut würde

- **`css\stil-effekte.css`:** Die Regeln `.feld-ziel`, `.feld-ziel::after`,
  `.feld-schlag`, `.feld-schlag::after` werden ersetzt; die beiden
  `::after`-Regeln (das sind Kreis und Ring) entfallen ganz. Dazu die
  passenden Regeln im 3D-Block.
- **`css\stil-brett.css`:** Bei Vorschlag A kommen zwei Farbpaare für hell
  und dunkel dazu. **Alle vorhandenen Variablen bleiben stehen** — sie
  arbeiten ohnehin weiter für das gelbe Auswahlfeld, den Fesselring, das
  Fähigkeiten-Ziel und die Anleitungsbilder.
- **Kein Eingriff im Programmcode.** Die Klassennamen bleiben,
  `team-schach-brett.js` vergibt sie unverändert.
- **Automatisch mit dabei:** das Rückschau-Brett der Auswertung und die
  Beispielbretter der Bildanleitungen. Sie benutzen dieselben Klassen und
  erben die 3D-Kachel-Regeln — sie laufen also **nicht** auseinander.
- **Nicht automatisch dabei:** `.vorschau-marke` in `stil-auswertung.css`
  („worauf es in diesem Bild ankommt"). Das ist eine **Handkopie der alten
  Zugziel-Optik**. Bleibt sie stehen, zeigt die Anleitung ein Zeichen, das
  es im Spiel nicht mehr gibt. Siehe Frage 3.
- **Tests:** bleiben grün. Sie prüfen Klassennamen, nicht Aussehen. Der
  Syntax-Test prüft nur, dass jede *benutzte* Variable auch definiert ist —
  ungenutzte Variablen stehen zu lassen macht ihn nicht rot.
- **Doku:** `docs\regeln\30-anzeige.md` sagt heute „Jede Markierung auf dem
  Brett ist zweifarbig — heller Rand, dunkler Kern … Gilt für Zielfelder,
  Schlagfelder". Werden es Flächen, gilt für sie ab dann die Kachel-Regel
  (Fläche plus dunklere Kante) wie bei Zugspur und Schach. Der Satz muss im
  selben Zug angepasst werden, sonst widerspricht die eiserne Regel dem Code.

---

## 7. Empfehlung und Fragen

> **NACHGETRAGEN am 27.08.2026 abends — die Vorschläge sind gerendert und
> angesehen worden** (Edge kopflos, echte Stildateien, echte Figuren, vier
> Brett-Ausschnitte nebeneinander: heute / A / B / Empfehlung). Das
> Ergebnis ändert die Gewichtung:
>
> - **Vorschlag A trägt.** Türkis (Zugziel) und Dunkelrot (Schlagziel)
>   sind auch ohne Kreis und Ring sofort unterscheidbar und verwechseln
>   sich weder mit dem gelben „gewählt"-Feld noch mit der grünen Zugspur.
>   Trotz fünf gleichzeitiger Farben wirkt das Brett nicht überladen.
> - **Vorschlag B fällt praktisch aus.** Das angehobene Zugziel ist am
>   Bildschirm kaum von einem normalen Feld zu unterscheiden (gemessen
>   nur 3 bis 8 Helligkeitspunkte Unterschied — die 1,08-fache
>   Aufhellung aus Abschnitt 4), das abgesenkte Schlagziel wirkt eher wie
>   ein angeschmutztes helles Feld als wie eine Markierung. Die Warnung
>   in Abschnitt 4 hat sich damit bestätigt.
> - **Die Absenkung in der Empfehlung ist kaum sichtbar** — sie schadet
>   nicht, trägt aber auch weniger bei als erhofft. Wer die
>   Form-Unterscheidung für Farbenblinde wirklich will, braucht ein
>   stärkeres Mittel als 1,08.
> - Die grüne Zugspur bleibt in allen Varianten gleich gut sichtbar.
>
> **Damit spitzt sich Frage 1 zu: A oder A mit Absenkung — B ist keine
> ernsthafte Option mehr.**

**Empfehlung: Vorschlag A, ergänzt um die Absenkung des Schlagziels aus
Vorschlag B.** A spricht dieselbe Sprache wie die vier Markierungen, die du
behalten willst — das Brett bekommt damit eine Regel statt zwei —, und er
überlebt eine spätere flachere Ansicht. Die abgesenkte Kachel beim
Schlagziel kostet fast nichts und gibt die Form-Unterscheidung zurück, die
Farbenblinde sonst verlieren würden.

**Fragen:**

1. **Vorschlag A, Vorschlag B, oder die empfohlene Mischung** (Flächen wie
   in A, Schlagziel zusätzlich abgesenkt wie in B)?
2. Fallen die **anderen Ringe** unter „und co" — der grüne Ring „Fähigkeit
   sucht ihr Ziel", die dünnen grünen Ringe eines Team-Vorschlags, der
   Kreisring für Schild und Fessel? Sie mitzuziehen ist billig; sie als
   Ringe zu belassen hätte den Vorteil, dass ein Ring ab dann **immer**
   „das schlägt jemand anderes vor" heisst. (Der grüne Umriss beim
   Platzieren bleibt in jedem Fall — den hast du am 26.08. so bestellt.)
3. Das markierte Feld in den **Bildanleitungen** trägt heute genau die alte
   Zugziel-Optik. Mitziehen, damit Anleitung und Spiel gleich aussehen —
   oder als eigenes Zeichen belassen?
