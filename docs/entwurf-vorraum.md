# Entwurf: Der Vorraum — vom „Spielen" bis zum ersten Zug

> **STATUS: GEBAUT UND AUSGELIEFERT als v0.115.0 (18.09.2026).** Nutzer-
> Ansage: „ja baue alles was du geschrieben hast" — damit gelten alle fünf
> Empfehlungen aus Abschnitt 6 als Antworten: Weg B (immer „Bereit" von
> beiden), Teilen-Knopf, Regeln nur anzeigen, Computer-Ausweg, Plätze
> nebeneinander. Was gebaut wurde, steht in
> `docs\architektur\08-start-leiste-und-oberflaeche.md` („der Vorraum");
> die Bilder nachher liegen als `docs\bilder\vorraum-neu-*.png` neben den
> Ist-Bildern. Der Text darunter ist der Entwurf, wie er vor dem Bau stand.

Deine Ansage vom 18.09.2026: „überlege dir eine bessere mögliche
Aufteilung mit den Vorräumen oder bevor das Match startet, wie man das
besser gestalten kann, dass es nutzerfreundlicher wird."

Grundlage ist kein Gefühl, sondern ein **Testlauf am 18.09.2026 im echten
Browser gegen die echte Datenbank** (v0.114.3): zwei Testkonten, ein
Spieler über die echte Oberfläche, der zweite als simuliertes Gerät —
Anlegen, Beitritt, Zulosung, Aufstellung, sechs Züge, Aufgeben, Abschluss.
Alles hat funktioniert (49 Anfragen, 93 KB für den ganzen Lauf, kein
Fehler). Die drei Bildschirme des Vorraums wurden dabei in Handy-Breite
(390 px) abgelichtet — sie liegen in `docs\bilder\`.

---

## 1. Was heute passiert — der Weg mit den Werkseinstellungen

Werkseinstellungen: Seite zulosen **an**, Zufallsarmee **aus**, Team-
Einigkeit an, Fähigkeiten an.

| Schritt | Bildschirm | Was der Spieler sieht | Bild |
|---|---|---|---|
| 1 | **Start** | Vorschau-Brett, blauer Knopf „Spielen", Pfeil-Quadrat, „Runde beitreten" | `vorraum-ist-1-start.png` |
| 2 | **Seitenwahl** (nach „Spielen") | Zwei Spalten „Weiss" / „Schwarz" mit Listen darunter; der eigene Name steht schon in einer Spalte (zugelost), darunter das grüne Schildchen „bereit"; oben rechts der Code | `vorraum-ist-2-seitenwahl-wartend.png` |
| 3a | **Anpfiff** (ohne Zufallsarmee) | Sobald der Zweite beitritt, steht das Brett — ohne Zwischenschritt | (= Match) |
| 3b | **Aufstellung** (mit Zufallsarmee) | Gegner-Karte, Brett mit gewürfelter Armee, eigene Karte, Würfel-Knopf und „Bereit" | `vorraum-ist-3-aufstellung.png` |

Der Weg ist **kurz** — das ist sein Vorzug, und er bleibt. Was ihm fehlt,
zeigt sich beim Warten und beim Beitreten.

## 2. Was daran nicht nutzerfreundlich ist — sieben Befunde

**B1 — Der Wartende sieht nicht, dass er wartet.** Bild 2: Zwei Spalten,
ein Name, ein Schildchen — und sonst nichts. Kein Satz sagt „Warte auf
einen Mitspieler", nichts bewegt sich, nichts sagt, was als Nächstes
passiert. Genau in diesem Zustand lagen fr3ddys zwei Runden vom 14.09. und
17.09. tagelang in der Datenbank.

**B2 — Der wichtigste Knopf ist der unauffälligste.** Der Weg zum
Mitspieler ist der Code oben rechts (`KG3G7P`) — ein kleiner Text-Knopf
ohne Beschriftung, den man antippen muss, um ein Fenster „Freunde
einladen" zu bekommen. Wer nicht weiss, dass das ein Knopf ist, findet den
Weg nicht. Es gibt kein „Teilen" (WhatsApp) und kein „Kopieren".

**B3 — Die Seitenwahl sieht aus wie eine Wahl, ist aber keine.** Mit
zugeloster Seite (Werkseinstellung) sind „Weiss" und „Schwarz" grosse,
knopfartige Köpfe — antippen tut nichts, denn die Seite ist vergeben. Der
Bildschirm heisst intern „Seitenwahl", zeigt eine Wahl und bietet keine.
Für den Anleger ist er in Wahrheit ein Warteraum.

**B4 — Der Eingeladene weiss nicht, worauf er sich einlässt.** Ohne
Zufallsarmee landet, wer beitritt, in derselben Sekunde im Match (3a).
Ob Fähigkeiten an sind, wie viele Lootboxen, ob Team-Einigkeit gilt — das
sieht er nirgends vorher. Die Regeln der Runde stehen auf keinem der
Vorraum-Bildschirme.

**B5 — Zwei Wege, zwei Gefühle.** Ohne Zufallsarmee: kein „Bereit", es
geht sofort los. Mit Zufallsarmee: ein zweiter Bildschirm mit „Bereit".
Wer beides kennt, wundert sich beim jeweils anderen. Der Testlauf hat den
Wechsel zwischen den beiden Wegen an einer Stelle gemessen: Eine mit
Zufallsarmee angelegte Runde wartet in der Aufstellung — der Anleger
sieht das aber erst, wenn er sie öffnet.

**B6 — Niemand da? Dann steht man.** Der Warteraum bietet keinen Ausweg:
kein „Gegen den Computer spielen, bis jemand kommt", kein Hinweis auf den
Start-Knopf „Zurück in deine Runde". Man verlässt die Runde (sie bleibt
dann liegen — seit v0.114.2 räumt „Spielen" sie beim nächsten Mal weg).

**B7 — Das „bereit"-Schildchen ist die einzige Rückmeldung.** Es steht
unter der Liste, klein, grün, ohne Bezug: bereit WOFÜR, und wer fehlt
noch? Beim Aufstellungs-Bildschirm (Bild 3) tragen beide Karten dasselbe
Schildchen, obwohl es dort um eine andere Zusage geht (Aufstellung, nicht
Seite).

## 3. Was gute Vorräume anders machen

Drei Muster, die sich in Mehrspieler-Spielen am Handy durchgesetzt haben
(Schach-Apps, Party-Spiele mit Raum-Code):

1. **Der Raum zeigt, wer da ist und wer fehlt** — Plätze als Karten, ein
   leerer Platz sagt „frei" und pulsiert leise. Man sieht den Zustand,
   ohne zu lesen.
2. **Einladen ist die Hauptaktion, solange ein Platz frei ist** — Code
   gross in der Mitte, daneben „Teilen" (öffnet das Teilen-Menü des
   Handys: WhatsApp, Nachrichten) und „Kopieren". Der Raum selbst wirbt um
   den zweiten Spieler.
3. **Die Regeln stehen im Raum, nicht in einem Menü** — kurz, als Zeile
   von Schildchen: „Klassisch · Lootboxen normal · Fähigkeiten · Team-
   Einigkeit". Wer beitritt, weiss vorher, was gespielt wird.

Dazu ein Grundsatz aus dem Haus (v0.114.2): **Wer wartet, muss sehen,
dass etwas passiert** — sonst drückt er weiter oder geht.

## 4. Vorschlag: EIN Vorraum statt zwei Bildschirme

Seitenwahl und Aufstellung werden zu **einem** Bildschirm, dem Vorraum.
Er hat drei Zustände, aber immer denselben Aufbau — von oben nach unten:

    +----------------------------------------------+
    | Zurück                          Klassisch    |   Kopf: Zurück, Titel der Spielart
    +----------------------------------------------+
    |   Warte auf einen Mitspieler ...  (pulsiert) |   Zustandszeile (B1, B7)
    +----------------------------------------------+
    |         Code   K G 3 G 7 P                   |   Einladen-Block, nur solange
    |   [ Teilen ]  [ Kopieren ]  [ Freund einladen ] |   ein Platz frei ist (B2)
    +----------------------------------------------+
    |  +------------------+  +------------------+  |   Zwei Plätze (B3):
    |  |  Weiss           |  |  Schwarz         |  |   Name oder „frei",
    |  |  Testlauf A  du  |  |  frei            |  |   bei Zulosung ohne Knopf-Optik,
    |  +------------------+  +------------------+  |   ohne Zulosung antippbar wie heute
    +----------------------------------------------+
    |  [ Brett-Vorschau der Aufstellung ]          |   fest oder gewürfelt (B5)
    |  ( Würfel )   nur mit Zufallsarmee           |
    +----------------------------------------------+
    |  Klassisch · Lootboxen normal · Fähigkeiten  |   Regeln als Schildchen (B4)
    |  · Team-Einigkeit · Seite zugelost           |
    +----------------------------------------------+
    |  [ Bereit ]                 Fuss: EINE Hauptaktion (B5)
    |  Niemand da? [ Gegen den Computer spielen ]  |   nur solange man allein ist (B6)
    +----------------------------------------------+

**Die drei Zustände:**

| Zustand | Zustandszeile | Einladen-Block | Fuss |
|---|---|---|---|
| **Allein** (Anleger wartet) | „Warte auf einen Mitspieler …" mit leise pulsierendem Punkt | sichtbar, gross | „Gegen den Computer spielen" (still) — „Bereit" ist schon gegeben, wird als Häkchen am eigenen Platz gezeigt |
| **Zu zweit, jemand fehlt noch mit Bereit** | „fr3ddy ist da — bereit?" bzw. „Warte auf fr3ddys Bereit" | weg (Platz voll) | „Bereit" (blau) bzw. „Doch nicht bereit" |
| **Beide bereit** | „Beide bereit — es geht los" | weg | — (Anpfiff nach einem kurzen Moment, siehe Frage 1) |

**Was dabei entfällt:** der eigene Aufstellungs-Bildschirm (sein Inhalt —
Brett-Vorschau, Würfel, Bereit — wandert in den Vorraum) und die
knopfartigen „Weiss"/„Schwarz"-Köpfe bei zugeloster Seite. **Was bleibt:**
das Fenster „Freunde einladen" (hinter „Freund einladen"), die Seitenwahl
per Tipp OHNE Zulosung (die Plätze sind dann antippbar), das Modell
(`bereitSetzen`, `aufstellungBereitSetzen`, `kannAnpfeifen`) — der Vorraum
ist ein Bildschirm-Umbau, keine Regeländerung.

**Warum die Brett-Vorschau auch ohne Zufallsarmee:** Sie macht den Vorraum
in beiden Fällen gleich (B5) und zeigt dem Eingeladenen, welches Brett ihn
erwartet (Kreuz, Doppelbrett, Grösse) — heute erfährt er das erst im
Match.

## 5. Zwei Wege zum Anpfiff — die eigentliche Entscheidung

Heute pfeift die Runde OHNE Zufallsarmee sofort an, wenn der Zweite kommt.
Das ist schnell, aber der Eingeladene hat keinen Moment, die Regeln zu
sehen (B4), und der Anleger sieht den Beitritt nur daran, dass plötzlich
ein Brett dasteht.

| | **Weg A — wie heute: sofort** | **Weg B — immer ein „Bereit" von beiden** |
|---|---|---|
| Ohne Zufallsarmee | Anpfiff im Moment des Beitritts | Vorraum zu zweit, beide tippen „Bereit", Anpfiff |
| Mit Zufallsarmee | wie heute (Aufstellung, Bereit) | genauso — EIN Weg für beides |
| Tipps bis zum Brett (Eingeladener) | 1 (Beitritt) | 2 (Beitritt, Bereit) |
| Regeln vorher gesehen | nein | ja |
| Gleiches Gefühl in beiden Fällen | nein | ja |

**Empfehlung: Weg B.** Ein Tipp mehr, dafür ein Vorraum, der immer gleich
aussieht und beiden einen Moment gibt („Beide bereit — es geht los"). Der
Anleger hat sein „Bereit" durch das Anlegen schon gegeben (so ist es seit
v0.114.1), er muss nichts noch einmal tun. Wer es lieber schnell mag:
Weg A bleibt möglich, dann zeigt der Vorraum die Regeln wenigstens im
Wartezustand, und der Eingeladene sieht sie eben nicht.

## 6. Fragen — ohne Antwort wird nicht gebaut

1. **Weg A oder Weg B** (Abschnitt 5)? Empfehlung B.
2. **„Teilen"-Knopf** über das Teilen-Menü des Handys (`navigator.share`,
   auf iPhone und Android verfügbar, am PC fällt er auf „Kopieren"
   zurück)? Der Text wäre etwa: „Spiel mit mir Blunderluck — Code KG3G7P:
   https://up-birdo.github.io/Blunderluck/". Empfehlung ja.
3. **Regeln als Schildchen im Vorraum** — nur anzeigen, oder soll der
   Anleger sie dort noch ändern können, solange er allein ist? Empfehlung:
   nur anzeigen (ändern über das Pfeil-Quadrat wie heute, VOR dem
   Anlegen) — ein Vorraum, in dem sich die Regeln unter dem Eingeladenen
   ändern, ist genau die Unklarheit, die B4 beseitigen soll.
4. **„Niemand da? Gegen den Computer spielen"** im Wartezustand — ja oder
   nein? Technisch: Die wartende Runde wird geschlossen, eine Bot-Runde mit
   denselben Reglern angelegt. Empfehlung ja.
5. **Die Aufstellungs-Karten:** Heute zeigt der Aufstellungs-Bildschirm die
   Gegner-Karte oben und die eigene unten (wie im Match). Im Vorraum
   stünden beide Plätze nebeneinander (Weiss links, Schwarz rechts, wie in
   der heutigen Seitenwahl). Soll die Match-Anordnung (Gegner oben, ich
   unten) auch im Vorraum gelten? Empfehlung: nebeneinander — der Vorraum
   ist kein Brett, und links/rechts ist die Sprache der Seitenwahl seit
   Punkt 49.

## 7. Was gebaut würde (nach den Antworten)

- `team-schach.js`: `_seitenwahlZeichnen` und `_aufstellungZeichnen`
  werden zu `_vorraumZeichnen` mit den drei Zuständen; `_partieZeichnen`
  ruft nur noch ihn. Die Bausteine `_seitenwahlSpalteBauen`,
  `_wuerfelKnopfBauen`, `_codeKnopfBauen`, `_einladenFensterOeffnen`
  bleiben und werden neu angeordnet.
- Neu: Zustandszeile (`vorraum-zustand`, mit leise pulsierendem Punkt —
  `stil-effekte.css`), Einladen-Block mit „Teilen"/„Kopieren"
  (`navigator.share` / `navigator.clipboard`, beides mit Rückfall auf den
  Code-Text), Regel-Schildchen (`_regelSchildchenBauen`, liest
  `partie.regeln` — dieselbe Quelle wie die Match-Einstellungen).
- Bei Weg B: `SCHACH_RUNDE.kannAnpfeifen` bekommt keinen neuen Fall — die
  Aufstellungs-Zusage (`aufstellungBereitSetzen`) gilt dann in JEDER Runde,
  nicht nur mit Zufallsarmee (`inAufstellung` liefert immer ja, sobald
  beide Seiten besetzt sind). Datenvertrag unverändert.
- Bei Frage 4: `rundeStarten` mit `gegenComputer: true` aus dem Vorraum
  heraus, davor `_verwaisteRundeSchliessen` der wartenden Runde.
- Tests: Bildschirm-Tests für die drei Zustände und den Anpfiff-Weg;
  Modell-Test für `inAufstellung` bei Weg B.
- **Vorher rendern und ansehen** (Hausregel „Sehen geht vor Rechnen") —
  der Testlauf-Fahrer vom 18.09.2026 liefert die Bilder in 390 px.
- Eine Auslieferung, MINOR (neue Fähigkeit: Teilen, Computer-Rückfall),
  Version nach Regel.

## 8. Nebenbefunde aus dem Testlauf (keine Vorraum-Themen)

- Das Modell funktioniert über den ganzen Weg: Zulosung, Beitritt,
  Aufstellung, sechs Züge in beide Richtungen, Aufgeben, Chronik-Eintrag —
  ohne Fehler, mit v0.114.3 rund 5 KB je Zug.
- Die App fand beim Start die laufende Testpartie (Wiedereinstieg) und die
  wartende Runde mit Mitspieler („dorthin statt neu", v0.114.2) — beides
  wie vorgesehen; der Testlauf-Fahrer musste sich darauf einstellen, nicht
  die App.
- Beim Start nach einer beendeten Partie kommt der Abschluss von selbst
  („jüngste ungesehene") — auch das wie vorgesehen.
