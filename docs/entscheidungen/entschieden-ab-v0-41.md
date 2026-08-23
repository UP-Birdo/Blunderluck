# Entschieden — Team Schach seit v0.41 (SemVer-Zeit)

Herausgelöst aus `entschieden.md` (19.08.2026); dort steht der Wegweiser.

## Warum Grün eine Abklingzeit bekommen hat (v0.41)

Gemeldet war: „Die Item-Spawnrate ist komisch, es kommen fast nur grüne."

**Das war kein Fehler, sondern ein Missverständnis über die Dämpfung von
v3.6.** Die wirkt INNERHALB einer Stufe: Sie entscheidet, WELCHE Fähigkeit man
aus einer Stufe zieht, gemessen am eigenen Vorrat. Wie oft eine Stufe überhaupt
an der Reihe ist, hat sie nie berührt — und Grün stand bei 52 Prozent. Wer also
schon drei verschiedene grüne Fähigkeiten hatte, bekam weiter grüne Würfel, nur
eben abwechselnde.

Seit v0.41 gibt es deshalb **zwei getrennte Rechnungen**, und das ist genau der
Wunsch:

| Rechnung | Frage | Wo |
|---|---|---|
| `abklingen` (neu) | Welche STUFE erscheint? | beim Erscheinen des Würfels |
| `wiederholung` (v3.6) | Welche FÄHIGKEIT aus der Stufe? | beim Einsammeln |

**Nur Grün hat eine Abklingzeit** (`{ halbzuege: 8, gewicht: 0.2 }`): Direkt
nach einem grünen Würfel zählt Grün nur noch mit einem Fünftel und steigt über
acht Halbzüge gleichmässig wieder auf sein volles Gewicht. Blau, Lila und Gelb
behalten ihre feste Chance — sonst würde man das Problem nur verschieben.

**Was Grün verliert, fällt nicht weg, sondern geht an die anderen Stufen.** Die
Alternative wäre gewesen, in diesem Fall gar keinen Würfel erscheinen zu lassen;
dann bliebe die Chance der anderen Stufen absolut unverändert. Dagegen sprach,
dass damit rund ein Viertel aller Würfel verschwunden wäre — die Dichte auf dem
Brett ist eine eigene Einstellung (`BONUS_CHANCE`) und soll sich nicht als
Nebenwirkung einer Farbfrage ändern. Der Wunsch war „nicht immer Grün", nicht
„weniger Würfel".

Gemessen wird im **Takt**, nicht in `halbzuege` — aus demselben Grund wie bei
den Mauern (siehe „Warum `halbzuege` keine Uhr ist"). Gemerkt wird er je Stufe
in `partie.stufeZuletzt`; eine Partie ohne dieses Feld zieht wie vorher.

## Warum Rot und Blau und nicht Grün und Gelb (v0.41)

Bis v0.40 leuchtete ein Feld grün auf, wenn eine Fähigkeit gewirkt hatte, und
gelb, wenn ein Unglückswürfel zugeschlagen hatte. Beide Farben liegen in
derselben Richtung: Sie sagen „hier ist etwas passiert", aber nicht, ob es für
oder gegen einen war. Rot und Blau sind im Haus-Stil ohnehin die beiden
Richtungen (Gefahr und Hauptsache) — und auf einem blau-weissen Brett hebt sich
Rot am deutlichsten ab.

Dazu glüht die betroffene **Figur** mit, nicht nur ihr Feld. Der Anlass steht
im Wunsch selbst: Bei Erdrutsch oder Erdbeben verschieben sich ein halbes
Dutzend Figuren, und die Frage ist immer „welche hat es erwischt". Ein Feldrand
allein beantwortet sie nicht, wenn sechs Felder gleichzeitig leuchten.

**Und es pulst zweimal statt einmal aufzublitzen.** 900 Millisekunden sind auf
dem Handy vorbei, bevor man hinsieht — zumal die Wirkung auf den anderen
Geräten erst mit der nächsten Abfrage ankommt.

## Warum die Bildanleitung gerechnet und nicht gezeichnet wird (v0.41)

Gewünscht waren zwei Vorschaubilder je Fähigkeit — beim Einsetzen und in der
Bibliothek. Der naheliegende Weg wäre gewesen, sie zu malen: zwei Bilder je
Fähigkeit, 18 Fähigkeiten plus fünf Unglückswürfel, also 46 Bilder.

**Genau das wäre die zweite Wahrheit.** Ändert jemand eine Fähigkeit, zeigt das
Bild weiter das alte Verhalten — und niemand merkt es, weil ein Bild nicht
mitkompiliert wird. Dieselbe Überlegung hat schon bei den Spielarten dazu
geführt, das Vorschaubrett aus der echten Aufstellung zu zeichnen.

Deshalb beschreibt `schach-vorschau.js` nur die AUSGANGSSTELLUNG und den EINEN
Handgriff (welches Feld angetippt wird, welcher Zug folgt). Das Nachher-Bild
entsteht, indem die Fähigkeit im Beispiel wirklich eingesetzt wird — durch
`SCHACH_RUNDE.faehigkeitEinsetzen`, dieselbe Funktion wie im Spiel. Ein
Unglückswürfel wird im Beispiel sogar wirklich eingesammelt.

Der Preis ist ein Test, der bei jeder Änderung mitreden will: Er prüft für jede
Fähigkeit, dass das Beispiel noch aufgeht (Zielfeld gültig, Zug erlaubt,
Wirkung sichtbar). Das ist beabsichtigt — er ist die Stelle, an der ein
vergessenes Beispiel auffällt, bevor es jemand am Handy sieht.

**Warum in der Bibliothek eingeklappt:** 23 Einträge mal drei Bretter wären
eine sehr lange Seite. Wer wissen will, wie eine Fähigkeit wirkt, klappt sie
auf; wer die Liste überfliegt, wird nicht aufgehalten. Seit v0.42 ist der
Eintrag selbst der Knopf — eine zweite Zeile „Wie das aussieht" darunter hiess
auf dem Handy zweimal zielen für eine Sache.

**Seit v0.43 steht zugeklappt nur die Überschrift.** Auch die Beschreibungen
sind zusammen lang genug, dass man scrollen musste, bevor man wusste, welche
Fähigkeiten es überhaupt gibt — und genau das ist die erste Frage, die die
Bibliothek beantworten soll. Die Beschreibung gehört zur Antwort auf die
zweite Frage („was macht diese hier?") und steht deshalb zusammen mit der
Anleitung im aufgeklappten Teil.

**Warum die Bilder abgespielt werden (v0.42):** Zwei Bretter nebeneinander muss
man vergleichen — man sucht selbst, was sich geändert hat. Eine Bewegung sieht
man. Auf dem Handy kommt dazu, dass ein grosses Bild lesbarer ist als zwei
kleine nebeneinander. Der Wunsch lautete „ein GIF oder mehrere Beispielbilder";
gebaut ist es als Folge gerechneter Bretter, die der Bildschirm durchläuft —
eine echte Bilddatei wäre wieder die zweite Wahrheit, und ausserdem müsste
jemand sie bei jeder Regeländerung neu aufnehmen.

Wer im Betriebssystem weniger Bewegung eingestellt hat
(`prefers-reduced-motion`), bekommt alle Schritte nebeneinander. Das ist keine
Notlösung, sondern dieselbe Information ohne Bewegung.

**Warum die Pfeile zurückkommen dürfen (v0.44):** In v3.6 ist der Zugpfeil aus
dem Spiel geflogen, und die Begründung gilt weiter — er sollte JEDE Gangart
darstellen, und dafür ist eine gerade Linie das falsche Werkzeug (Bauernschlag,
Springer, Bewegung um ein Feld). In der Anleitung ist die Aufgabe eine andere:
Dort steht fest, welche Figur wohin geht, es ist genau ein Beispiel, und die
Linie muss nichts verallgemeinern. Deshalb sind Pfeile hier richtig und dort
falsch — dieselbe Form, zwei verschiedene Fragen.

**Warum nur ein Eintrag gleichzeitig offen ist:** Zwei laufende Anleitungen
untereinander sind zwei Dinge, die sich bewegen — man sieht keine davon zu
Ende. Dazu kommt ein handfester Grund: Jede Anleitung hat ihren eigenen Takt,
und ein zugeklappter Eintrag, der weiterläuft, arbeitet für niemanden.

## Wie eine Fähigkeit eingepreist wird (v0.47)

Bis v0.46 stand `beendetZug` da, wo es beim Bauen gerade nötig schien. Beim
Durchsehen aller siebzehn Fähigkeiten fiel auf, dass drei von ihnen
(Verstärkung, Spiegel, Wiedergeburt) Material einbringen und den Zug trotzdem
behielten — während Wiederbelebung, Friedhof und Händler für dasselbe seit v3.3
den Zug kosten. Das war keine Entscheidung, das war eine Lücke.

**Die Regel lautet seither: Wer Material oder einen Angriff geschenkt bekommt,
gibt den Zug ab.** Nur wer die Stellung verändert, behält ihn.

Zwei Dinge waren dabei zu entscheiden:

- **Sprung und Teleport kosten jetzt auch den Zug.** Sie sind gewöhnlich, also
  die häufigsten Würfel überhaupt. Mit dem Sprung darf man SCHLAGEN, mit dem
  Teleport über alles hinwegsetzen — beides zusätzlich zum normalen Zug war zu
  viel für etwas, das jede Partie mehrfach kommt. Ausweichen bleibt gratis: Es
  zieht nur auf FREIE Felder, schlägt nie und ist als Notbremse gedacht.
- **Die Stufe bleibt, wo sie ist.** Sie beantwortet eine andere Frage — wie oft
  kommt eine Fähigkeit —, und wer sie verschiebt, ändert das Spielgefühl an
  einer Stelle, an der niemand ein Problem gemeldet hat. Der Preis gehört an
  den Schalter, nicht an die Häufigkeit.

**Warum die Zeichen jetzt auch in der Bibliothek stehen:** Am Vorrat sagt das
Pluszeichen, was JETZT gilt (`behaeltZug`, seit v0.41). Wer es dort zum ersten
Mal sieht, weiss aber nicht, was es heisst. In der Bibliothek steht deshalb
dasselbe Zeichen samt Erklärung an jedem Eintrag — nicht nur einmal in einer
Legende ganz oben, denn wer dort nachschlägt, sucht genau diese eine Fähigkeit.
Der Unterschied bleibt erhalten: Die Bibliothek zeigt die EIGENSCHAFT, der
Vorrat die LAGE.

**Nachtrag v0.48: Dieser letzte Absatz ist zurückgenommen.** Der Unterschied
zwischen Bibliothek und Vorrat war der Fehler, nicht die Lösung — siehe unten.

## Die Zeichen gehören der Fähigkeit, nicht der Lage (v0.48)

Vom Nutzer, wörtlich: *„Das Plus und der Blitz sollen für jeden Spieler immer
und überall ein Indikator sein … man soll in seinem Fähigkeiten-Inventar immer
das Zeichen sehen, auch bei gegnerischen Items."*

Das kehrt die Entscheidung von v0.41 um, das Pluszeichen an `behaeltZug` zu
hängen. Sie war für sich genommen richtig — im Gegnerzug versprach ein festes
Zeichen einen Zug, den es nicht gab. Nur war der Preis höher als der Gewinn:

- Bei den Fähigkeiten des Gegners stand nie ein Zeichen. Wer wissen wollte, was
  auf ihn zukommt, sah nichts.
- Am eigenen Vorrat kam und ging es im Takt der Züge. Ein Merkmal, an dem man
  eine Fähigkeit wiedererkennt, darf nicht flackern.

**Ein Zeichen sagt jetzt, was die Fähigkeit IST. Was gerade geht, sagt der
Satz** — im Einsetzen-Dialog, wo Platz für „du bist gerade nicht dran" ist.
`SCHACH_RUNDE.behaeltZug` bleibt dafür bestehen und wird weiter geprüft; es hat
nur seinen Platz gewechselt, vom Zeichen zum Text.

Daraus folgt der zweite Teil: **Jede Marke ist ein Knopf.** Eine Fähigkeit, die
man nicht einsetzen darf, zeigt beim Antippen Beschreibung, Kosten und die
abgespielte Anleitung — dieselbe wie beim Einsetzen. Vorher war sie ein totes
Schildchen, und die einzige Auskunft stand in der Bibliothek.

## Sprung und Teleport SIND der Zug (v0.48)

Vom Nutzer: *„Einsetzen bedeutet, dass man Einsetzen drückt, dann den besonderen
Move macht, und dann soll der Zug vorbei sein — bei der Fähigkeit soll kein Plus
stehen."*

Damit ist auch der zweite Teil von v0.47 korrigiert. Der Preis war richtig
angesetzt (ein Springerzug obendrauf ist zu viel), der Weg dorthin nicht:
`beendetZug` gibt den Zug ab, die Wirkung kommt erst eine Runde später. Aus
„Sprung" wurde dadurch „Sprung, aber erst nachdem der Gegner gezogen hat" — und
der Gegner sah es kommen.

Gebaut ist es als dritter Schalter `istDerZug` neben `beendetZug` und
`imGegenzug`. Er tut zwei Dinge auf einmal:

1. **Man bleibt am Zug** und macht ihn sofort.
2. **Nur das Muster zählt** (`stand.zusatzNurDieses`). Ohne diesen zweiten Teil
   wäre die Fähigkeit ein Geschenk: Man könnte sie einsetzen und trotzdem ganz
   normal ziehen.

Der Preis ist also derselbe wie mit `beendetZug` — der eigene Zug —, er wird nur
sofort bezahlt statt auf Kredit.

**Was dabei herauskam:** Eine Fähigkeit, die den Zug an sich zieht, kann
scheitern. Wer nur noch springen darf und kein Sprungfeld frei hat, wäre am Zug,
ohne einen zu haben — `SCHACH.alleZuege` läse das als Schachmatt. Das Einsetzen
wird deshalb abgewiesen, die Fähigkeit bleibt im Vorrat. Dieselbe Falle wie
schon zweimal zuvor (v0.41 und v0.47): Eine Fähigkeit, die sich verbraucht,
ohne zu wirken.

## Warum die Wiedergeburt nur noch episch ist (v0.48)

Auf Ansage des Nutzers, und sie fügt sich in die Regel von v0.47: Die Stufe sagt,
wie oft etwas kommt. Legendär waren fünf Fähigkeiten, und die Wiedergeburt war
unter ihnen die schwächste — sie setzt eine Figur auf die eigene GRUNDREIHE,
also weit weg vom Geschehen, während die Wiederbelebung sie dorthin
zurückbringt, wo sie fiel, und der Friedhof gleich vier auf einmal holt. Eine
legendäre Ziehung, die sich wie eine epische anfühlt, entwertet die Stufe.

## Wie lange eine Wirkung hält, steht jetzt dabei (v0.48)

Vom Nutzer: *„Überall, wo ein paar Runden steht, sollst du dir überlegen, was am
fairsten ist … und lege eine Zahl fest und schreibe sie mit dazu."*

Nachgerechnet wurde jede zeitlich begrenzte Wirkung; **verändert wurde keine**.
Die eingestellten Werte sind ausgewogen — sie standen nur nirgends:

| Wirkung | Dauer | Warum sie passt |
|---|---|---|
| Mauer | 6 Halbzüge | Je drei eigene Züge für beide Seiten. Lang genug, um einen Angriff zu stoppen, kurz genug, dass man nicht einfach dahinter wartet. |
| Friedhof | 8 Halbzüge | Vier eigene Züge, um vier geliehene Figuren zu nutzen — einer je Figur. Weniger wäre geschenkt, mehr wäre die Partie. |
| Volles Glas | 8 Halbzüge | Reine Sicht, keine Regel. Vier eigene Züge sind lästig, aber nicht ruinös. |

## Der Unglückswürfel ist kein Gesetz mehr, sondern ein Haken (v0.49)

Bis v0.48 stand in `CLAUDE.md`: *„Dass es ein UNGLÜCKSwürfel ist, wird dagegen
immer gezeigt (umgedrehtes Fragezeichen)."* Vom Nutzer, auf Rückfrage: *„Es soll
keine eiserne Regel sein, das ist nur noch so, wenn man den Haken drückt; wenn
man ihn grau lässt, werden die Unglücksboxen nicht unterscheidbar."*

Damit ist die Regel zur Vorgabe geworden: Der Haken heisst **Unglückswürfel
anzeigen** und ist wie alle Haken standardmässig aus. Auch Partien von vor v0.49
zeigen das Unglück ab jetzt nicht mehr (`pechZeigen` liest `=== true`, nicht
`!== false`) — es ist reine Anzeige und rührt an keine Regel.

**Was beim Bauen herauskam: Es waren nie zwei Fragen, sondern eine.** Die
Sichtbarkeit des Unglücks hing am Haken „Seltenheit anzeigen" mit dran:

    zeigen ? stufe : STUFE_UNBEKANNT      // die Farbe
    zeigen && bonusHier.pech              // das umgedrehte Fragezeichen

Wer die Farben sehen, aber nicht vorgewarnt werden wollte, hatte keine
Einstellung dafür. Jetzt sind es zwei: `seltenheitZeigen` beantwortet „welche
FARBE", `pechZeigen` „steht das Fragezeichen auf dem KOPF". Alle vier
Kombinationen ergeben Sinn.

Unangetastet bleibt die eiserne Regel darüber: **WELCHE Fähigkeit in einem
Würfel steckt, verrät die Oberfläche nie** — auch nicht im Titel beim
Darüberfahren.

## Zwei Könige sind zwei Leben (v0.49, Spielart „Zufallsarmee")

Vom Nutzer: *„Baue es so um, dass egal welcher König zuerst geschlagen wird, der
zweite ins Schachmatt gestellt werden muss — also so wie zwei Leben."*

Das war die offene Frage aus der Triage. Zwei Könige je Seite gab es bisher nur
im Doppelbrett, und dort über `koenigSchlagbar`: **kein Schach und kein Matt,
für das ganze Brett, die ganze Partie.** Wer keinen König mehr hat, verliert. Das
ist eine andere Regel als „zwei Leben" — sie kennt das Schachmatt gar nicht.

Gebaut ist es deshalb als **Frage an die Stellung, je Farbe**:

    SCHACH.koenigSchlagbarFuer(stand, farbe)

Sie hat zwei Quellen. `koenigSchlagbar` ist eine Eigenschaft des BRETTS und
antwortet immer gleich. `koenigeAlsLeben` ist eine Eigenschaft der STELLUNG:
Solange die Farbe mehr als einen König hat, ist ihr König eine Figur wie jede
andere — er wird geschlagen, sie kann nicht ins Schach kommen und nicht mattgesetzt
werden. Beim letzten kippt es zurück, und zwar mitten in der Partie.

**Warum je Farbe und nicht je Brett:** Weiss kann zwei Könige haben und Schwarz
einen. Dann muss beides gleichzeitig gelten — Weiss kennt kein Schach, Schwarz
schon. Eine Antwort fürs ganze Brett könnte das nicht abbilden. Betroffen sind
genau drei Stellen (`imSchach`, der Schlagfilter in `zuege`, der Selbstschach-Filter
in `zuege`), und alle drei fragen jetzt nach der jeweils gemeinten Farbe.

**Warum acht Figuren:** Das ist keine gewählte Zahl. Der Nutzer wollte „König +
7 weitere" und „links und rechts jeweils 2×2 Felder frei". Auf dem 8er-Brett
bleiben bei zwei freien Spalten je Seite genau vier Spalten mal zwei Grundreihen
— acht Felder. Ein Feld, eine Figur; die Vorgaben passen exakt zusammen.

**Warum höchstens eine Dame:** Beide Seiten ziehen unabhängig. Ohne Grenze zieht
eine Seite gelegentlich zwei oder drei Damen, und gegen sieben Bauern ist das
keine Partie mehr, sondern ein Ergebnis. Was darüber hinaus gezogen wird, wird
zum Turm. Die Schwankung an sich bleibt — sie ist der Sinn der Spielart.

**Warum keine Rochade:** Sie wird aus der Stellung gelesen (König auf seinem
Startfeld, Turm auf derselben Grundreihe). Bei einer gewürfelten Aufstellung ist
„das Startfeld des Königs" nur noch Zufall, und mit zwei Königen wäre nicht
einmal klar, wessen Recht gemeint ist.

## Frost und Fessel mussten sich unterscheiden (v0.56)

Bis v0.55 taten beide fast dasselbe: Eine Figur steht einen Zug lang still. Der
ganze Unterschied war „unantastbar ja/nein" — zu wenig, um zwei Plätze auf der
epischen Stufe zu rechtfertigen. Wer beide im Vorrat hatte, hatte faktisch
zweimal dieselbe Karte.

Seither trennen sie sich in **beiden** Achsen, und zwar über Kreuz:

| | Fläche | Dauer | Opfer schlagbar? |
|---|---|---|---|
| Frost | 2×2-Block | ein Zug | nein |
| Fessel | ein Feld | vier Halbzüge | ja |

Damit beantworten sie zwei verschiedene Fragen. Der Frost ist die **Notbremse**:
Er hält kurz eine ganze Ecke des Bretts an, kostet dafür aber auch die eigenen
Figuren darin. Die Fessel ist die **Vorbereitung**: Sie nagelt eine Figur fest,
lange genug, um sie in Ruhe anzugreifen.

**Warum der Frost auch die eigenen Figuren trifft** (Nutzer-Entscheidung
08.08.): Vier Felder sind viel. Ohne diesen Preis wäre er auf einem vollen
Brett fast immer der beste Zug — man legt ihn über die dichteste Stelle und
nimmt mit, was darin steht. Dass die eigenen mit einfrieren, macht aus der
Fähigkeit eine Zielübung.

**Warum ein leeres Feld im Block trotzdem nichts sperrt.** Beim Bauen war es
zuerst andersherum, weil die Prüfung nur „liegt das Feld im Block?" fragte. Das
Ergebnis war eine Mauer, die man zusätzlich über den Gegner legen kann — eine
zweite Fähigkeit im Bauch der ersten. Der Frost hält FIGUREN fest; Flächen
sperrt die Mauer, und die gehört bewusst keiner Seite.

**Warum die Fessel eine Uhr braucht und der Frost nicht.** „Ein Zug" lässt sich
an der Farbe ablesen (`frostFarbe` zieht, also ist es vorbei). „Mehrere Züge"
geht nur mit einem Zähler, und der einzige brauchbare ist `takt` — `halbzuege`
springt bei jedem Bauernzug auf 0 zurück und hätte die Fessel unsterblich
gemacht. Dieselbe Falle wie bei den Mauern in v3.5.

## Warum aus der Verstärkung eine Kette wurde (v0.56)

Die alte Verstärkung machte aus einem Bauern einen Springer: plus zwei Punkte
Material, immer derselbe Handgriff, und in der Endphase ohne Bauern wertlos.
Für eine epische Fähigkeit war das wenig, und interessant war sie nie.

Als Kette (Bauer → Springer → Läufer oder Turm → Dame → König) hat sie eine
Eigenschaft, die keine andere hat: **Sie ist überall einsetzbar, aber der
Gewinn hängt davon ab, worauf man sie legt.** Auf einen Bauern gibt sie zwei
Punkte, auf einen Turm vier. Das ist eine Entscheidung, kein Handgriff.

**Warum der König das obere Ende ist und was das kostet.** Ein zweiter König
wäre normalerweise ein unschlagbarer Klotz, und „Schachmatt" wäre nicht mehr
eindeutig. Deshalb setzt die Aufwertung `koenigeAlsLeben` im Stand — die
Maschinerie aus v0.49, die für die Zufallsarmee gebaut wurde: Solange eine
Seite mehr als einen König hat, kennt SIE kein Schach und kein Matt, und ihre
Könige sind gewöhnliche Figuren. Es war keine neue Regel nötig, nur ein
Schalter an der richtigen Stelle.

**Warum es zurück geht.** Zwei Leben sind nicht immer das Richtige — wer
angreifen muss, braucht Material, keinen zweiten König. Deshalb tauscht man
einen von zweien gegen zwei Damen ein. Der Rücktausch ist zugleich die Sperre,
die den letzten König schützt: Er verlangt, dass **zwei** dastehen.

**Was zu beobachten ist:** Die Kette ist ein deutlicher Machtzuwachs. Wenn sie
zu stark wird, gilt die Regel von v0.47 — man kürzt die Kette oder nimmt der
Fähigkeit etwas weg, aber man verschiebt nicht ihre Stufe.

## Warum der Bauernschub sein Pluszeichen verloren hat (v0.56)

Gemeldet vom Nutzer: „zu stark". Der Grund ist die Kombination, nicht die
Fähigkeit selbst — erst alle acht Bauern vorschieben, dann mit einem davon
schlagen. Das sind zwei Züge für eine Fähigkeit, und keine andere kann das.

Nach Gruppe 3 der Einpreisungs-Regel (v0.47) hätte er das Plus behalten
müssen: Er ändert ja nur die Stellung. Der zweite Satz derselben Regel gewinnt
aber: **Wird eine Fähigkeit zu stark, nimmt man ihr das Pluszeichen — nicht
ihre Stufe.** Er ist damit der erste dokumentierte Anwendungsfall dieses
Satzes, und deshalb steht er in der Tabelle als eigene Zeile statt in Gruppe 1.

**Der Ausgleich ist die Umwandlung.** Bis v0.55 wurden geschobene Bauern auf
der letzten Reihe stillschweigend zu Damen — ein verstecktes Geschenk, das
niemand angefordert hatte. Jetzt fragt die App einmal für alle, welche Figur
es sein soll. Einmal, nicht je Bauer: Fünf Rückfragen hintereinander wären
Bedienlast ohne Entscheidungswert, denn man wählt ohnehin fast immer dasselbe.

## Warum der Vorschau-Kasten angetippt und nicht gezogen wird (v0.57)

Der Wunsch lautete wörtlich: ein grüner Kasten, den man auf die Fläche ZIEHT,
dann bestätigen. Gebaut ist er zum Antippen. Der Grund liegt am Gerät, auf dem
gespielt wird:

- **Ziehen kämpft mit dem Scrollen.** Ein Fingerzug über das Brett ist für den
  Browser erst einmal eine Wischgeste. Um daraus ein Verschieben zu machen,
  muss man das Scrollen während der Berührung abschalten — und wer dann
  daneben greift, hat eine Seite, die sich nicht mehr bewegt.
- **Der Finger verdeckt das Ziel.** Genau das Feld, das man treffen will, liegt
  unter der Fingerkuppe. Beim Loslassen sitzt der Kasten oft ein Feld daneben,
  und man merkt es erst danach.

Antippen löst dasselbe Problem — man sieht vor dem Bestätigen, wohin die
Wirkung geht — und ist auf jedem Gerät gleich zuverlässig. Der ursprüngliche
Zweck bleibt also erfüllt; nur der Weg dorthin ist ein anderer.

Der gewohnte Doppeltipp geht weiterhin durch: Zweimal auf dasselbe Feld setzt
sofort ein. Wer die Fähigkeit kennt, wird dadurch nicht ausgebremst.

## Warum eine Leihgabe erst zählt, wenn man wieder am Zug ist (v0.57)

Beim Bau der Staffel „je stärker, desto kürzer" (Dame 2 Halbzüge) kam beim
Nachmessen heraus, dass die Dame **nie zum Zug kam**: Der Friedhof gibt den Zug
ab, danach zieht der Gegner — und beim Hochzählen des Takts war sie schon
zerfallen. Sie hätte ein Feld blockiert, mehr nicht.

Die Tabelle war richtig, der Nullpunkt nicht. Deshalb steht neben
`SCHACH.LEIHDAUER` jetzt `LEIHGABE_VORLAUF: 2` — die zwei Halbzüge, die
zwischen dem Aufstehen und dem ersten eigenen Zug immer liegen. Die Zahlen in
der Tabelle bedeuten damit das, was sie versprechen: *so viele Halbzüge,
nachdem du wieder dran bist.*

Wer eine weitere Fähigkeit mit Leihgabe baut, prüft zuerst, ob sie den Zug
abgibt. Tut sie es nicht, ist der Vorlauf falsch.

## Warum ein Zug unterwegs enden kann (v0.58)

Beim Stellen der Erdbeben-Anleitung stand hier zuerst das Gegenteil: Die Regeln
brechen einen Zug nicht ab, der Würfel wirkt danach — die Szene wurde
entsprechend umgeschrieben. Der Nutzer hat widersprochen, und zu Recht:

> Ein Zug soll durch so einen Einsatz abgebrochen werden. Der Würfel erschafft
> das Loch, sobald er eingesammelt wird, und wenn auf dem weiteren Weg dieses
> Loch ihm den Weg versperrt, soll der Zug davor abgebrochen werden.

Das ist die konsequente Fortschreibung von **„Berühren heisst Einsammeln"**
(v0.53): Wenn ein Würfel schon im Vorbeiziehen wirkt, dann wirkt er eben
mitten im Zug — und ein Loch, das dabei vor der Figur aufgeht, ist ein Loch,
kein Schönheitsfehler. Ein Turm, der ungerührt darüber hinweggleitet, weil die
Engine den Zug lieber am Stück abrechnet, ist die schlechtere Regel.

**Was dabei NICHT angefasst wurde: `SCHACH.zuege`.** Als der Zug gewählt wurde,
war der Weg frei; die Sperre entsteht erst währenddessen. Eine Zugerzeugung,
die das vorhersagen müsste, müsste den Inhalt jedes Würfels kennen — und der
entscheidet sich absichtlich erst beim Einsammeln (siehe „Warum sich der
Würfel-Inhalt erst beim Einsammeln entscheidet"). Der Abbruch ist deshalb eine
Nachwirkung des Zuges, kein Filter davor.

**Drei Festlegungen halten die Regel zusammen:**

- **Ein Riss zählt erst ab dem Feld des Würfels.** Was hinter der Figur
  aufgeht, hat sie längst passiert. Ohne diese Einschränkung blieb der Turm im
  ersten Bauversuch auf seinem Startfeld stehen — das Erdbeben hatte zufällig
  auch ein Feld hinter ihm erwischt.
- **Der Schlag fällt mit aus.** Sonst wäre der Abbruch ein Angriff aus der
  Ferne: Die Figur bliebe unterwegs stehen, und der Gegner hätte trotzdem eine
  Figur verloren.
- **Die Figur endet nie AUF einem Riss.** Gesucht wird rückwärts das letzte
  freie Feld; findet sich keines, bleibt der Zug lieber, wie er war. Eine Figur
  ohne Feld wäre schlimmer als ein Zug zu viel.

## Warum eine Unglücks-Lootbox eine Partie beenden darf (v0.73)

Bis v0.72 galt als eiserne Regel: Keine Wirkung lässt den eigenen König im
Schach zurück, und keine beendet eine Partie. Der Nutzer hat das am 09.08. für
Unglücks-Lootboxen aufgehoben (Meldung I9), mit einer Begründung, die trägt:
*„weil es eine Unglücksbox ist — diese können zum Schachmatt führen."*

**Der Unterschied ist die Absicht.** Eine Fähigkeit wählt man; sie darf einen
nicht in eine Lage bringen, die man nicht wollte. Ein Unglück trifft einen —
das ist sein ganzer Zweck, und eine Strafe, die nie ernst wird, ist keine.

Beim Bauen zu beachten (steht auch als eiserne Regel in der `CLAUDE.md`):

- **Geprüft wird NACH dem Rückwurf**, in `SCHACH_RUNDE.ziehen`. `lage()` genügt
  nicht: Sie kennt Matt und Patt, und hier ist es weder das eine noch das
  andere — der Gegner ist am Zug, und der eigene König steht im Schach.
- Der Fall trifft **jede** zurückgeworfene Figur, nicht nur den König: Wer den
  Block vor dem eigenen König verliert, verliert genauso.
- Damit kann ein Würfel eine Partie entscheiden, ohne dass jemand etwas dafür
  konnte. Genau das war der Grund für die alte Regel — der Nutzer will es
  trotzdem.

## Warum der Stolperstein rückwärts wirft und nicht abwärts (v0.73)

Bis v0.72 warf er die Figur ein Feld in Richtung der eigenen Grundreihe. Das
war einfach zu rechnen und für einen Turm auf einer Spalte auch richtig — für
alles andere nicht: Ein Läufer, der eine Diagonale hinaufzog, machte plötzlich
einen Schritt senkrecht nach unten und stand auf einer ganz anderen Linie.

Seit v0.73 (Meldung I8) ist es die Richtung des ZUGES, rückwärts. Drei
Entscheidungen stecken darin:

- **Gezählt wird ab dem Feld der Lootbox**, nicht ab dem Zielfeld: Man stolpert
  dort, wo der Stein liegt. Wer im Vorbeiziehen einsammelt, kommt also gar
  nicht erst an — und der Zug bricht ab.
- **Der Springer kehrt an seinen Ausgangsort zurück.** Zwischen Absprung und
  Landung gibt es keine Richtung, an der man sich ausrichten könnte.
- **Der Schlag fällt mit aus** — dieselbe Regel wie beim Zugabbruch am Riss
  (v0.58). Beide Abbrüche teilen sich seither eine Funktion
  (`SCHACH_RUNDE._zugZurueckSetzen`); nur WO die Figur stehen bleibt, rechnet
  jeder für sich aus.

Ist das Feld hinter dem Stein besetzt oder gesperrt, wird weiter zurück gesucht
— bis zum Ausgangsfeld. Findet sich nichts, passiert nichts: Eine Figur ohne
Feld wäre schlimmer als ein Unglück, das einmal verpufft.

## Warum die Ansicht sich nur EINMAL dreht (v0.72)

Mit vier Armeen auf dem Kreuz brauchte die Ansicht vier Lagen statt zwei. Die
naheliegende Umsetzung wäre gewesen, sie laufend nachzuführen — immer so, dass
die Armee unten steht, die gerade wichtig ist. Der Nutzer hat es am 13.08.
anders entschieden: **einmal zu Beginn, dann nie wieder.** Es reicht, dass EINE
der eigenen Armeen unten steht; wo die zweite landet, ergibt sich daraus (bei
vier Armeen gegenüber).

Der Grund ist Orientierung: Ein Brett, das sich während der Partie dreht, macht
jede gemerkte Stellung wertlos. „Meine Dame steht links unten" muss den ganzen
Abend gelten.

**Damit gehört die Lage dem GERÄT, nicht der Partie.** Sie hängt allein an der
Farbe, in der man spielt, und wird nirgends gespeichert — zwei Spieler
desselben Teams sehen dasselbe, ein Zuschauer sieht das Brett wie Weiss.

**Warum die Startseite trotzdem im Stand steht.** Die Lage liesse sich aus den
Bauern ablesen (`bauernSeiten`, seit v0.65). Nur: Wer keine Bauern mehr hat,
fiele auf die Farbregel zurück — die Ansicht drehte sich mitten in der Partie,
sobald der letzte Bauer fällt. Deshalb schreibt `kreuzAufstellen` die Seiten je
Farbe einmalig in den Stand (`startSeiten`). Für Partien, die davor angelegt
wurden, bleibt der Rückfall über die Bauern.

## Warum das Kreuz-Duell die Startseite auslost (v0.72)

Beim Kreuz mit vier Armeen wird gezogen, welches Team das senkrechte Paar
bekommt. Mit nur einer Armee je Team (K3) wäre die naheliegende Wahl gewesen,
Weiss wie gewohnt unten zu lassen. Dagegen sprach der Zweck dieser Bretter: Die
beiden leeren Streifen sind der Umweg, der sie von einem gewöhnlichen Brett
unterscheidet — und der ist nur interessant, wenn nicht jede Partie gleich
aussieht.

Ausgelost wird deshalb die eine Startseite von Weiss; **Schwarz bekommt immer
die gegenüberliegende.** Zwei Armeen über Eck (etwa oben und links) wären kein
Schach mehr: Die Bauern liefen aneinander vorbei, und die Umwandlungsreihe der
einen Seite wäre die Startreihe der anderen.

Ein König je Team heisst dabei: **kein `koenigeAlsLeben`.** Schach und Matt
gelten von der ersten Sekunde an — anders als beim Kreuz mit vier Armeen, wo
zwei Könige zwei Leben sind.

## Warum aus zwei Schaltern vier Stufen wurden (v0.71)

Bis v0.70 beantworteten zwei Einstellungen dieselbe Frage: der Haken
**Lootbox-Regen** (v0.50) und der Schieberegler **Wie früh es regnet** 1 bis 5
(v0.60). Wer wissen wollte, wie viele Lootboxen kommen, musste beide
zusammendenken — und ohne den Haken tat der Regler ohnehin nichts. Der Wunsch
vom 13.08. macht daraus eine Frage mit vier Antworten: **wenig / normal /
viele / Regen**.

**Drei Dinge waren dabei zu entscheiden:**

- **Was „wenig" heisst.** Der Wunsch beschreibt es als „so viel wie heute ohne
  Regen-Haken (höchstens drei je vollem Zug)". Das war eine Beschreibung des
  IST-Zustands — nur stimmte sie nicht: Seit v0.52 kommt Nachschub nach jedem
  HALBZUG. Gebaut ist die Stufe so, wie der Nutzer sie beschrieben hat (nach
  jedem vollen Zug), nicht so, wie der Code sie hatte. Sonst wäre der
  Unterschied zur nächsten Stufe („auch nach Halbzügen") gar keiner gewesen —
  und die Leiter hätte unten keine Sprosse. Der Preis steht im `CHANGELOG.md`:
  Eine neue Partie mit „wenig" bekommt etwa halb so oft Nachschub wie bisher
  ohne Regen-Haken; wer die gewohnte Menge will, nimmt „normal".
- **Dass keine Stufe die darunter unterbietet.** Die drei oberen Stufen hängen
  am Füllstand, und auf vollem Brett steht ihre Kurve fast bei null — früh in
  der Partie hätte „normal" also WENIGER geliefert als „wenig". Deshalb nehmen
  `mengenChance` und `mengenAnzahl` immer das Grössere von Grundrauschen und
  Kurve. Nebeneffekt: Die offene Frage aus v0.60 („ist die flachste Stufe
  überhaupt spürbar?") ist damit beantwortet.
- **Dass die alten Felder stehen bleiben.** `regen` und `regenStufe` stecken in
  jeder laufenden Partie. Sie werden weiter geschrieben (aus der Stufe
  abgeleitet) und beim Lesen umgekehrt zur Stufe verrechnet, wenn eine Partie
  sie noch nicht kennt. So spielt jede laufende Partie unverändert weiter, und
  ein Gerät, das noch eine ältere Fassung im Zwischenspeicher hat, spielt nicht
  nach ganz anderen Zahlen.

## Warum die Mauer die Lootbox jetzt frisst (v0.77) — **kehrt v0.66 um**

v0.66 (Wunsch #32, „die Items unter der Mauer verschwinden und kommen nicht
wieder") hat ein Feld mit Lootbox als Mauer-Ziel gar nicht erst angeboten. Die
Begründung war ehrlich und stimmt weiter: Unter der Mauer ist das Feld
gesperrt, niemand zieht dorthin, die Box ist unsichtbar und unerreichbar — „von
aussen dasselbe wie weg". Damals wurden drei Wege erwogen und zwei verworfen:
die Box wegräumen (dann wäre sie wirklich weg) und sie dem Mauerbauer schenken
(neue Regel, und eine starke).

Der Nutzer hat am 18.08. den ersten der beiden verworfenen Wege ausdrücklich
verlangt: „Die Mauer soll man auf alle Felder platzieren können, wo es von den
Figuren und vom Schachbrettrand her geht … und sobald man die Mauer dann wohin
platziert, wo davor eine Lootbox stand, verschwindet diese — also wird sie
gefressen."

**Was den Ausschlag gibt, ist nicht der Geschmack, sondern die Bedienung.** Die
Sperre von v0.66 war unsichtbar: Man tippt ein Feld an, und es passiert nichts.
Warum, sagt niemand — die Lootbox liegt drei Felder weiter, und dass sie das
Ziel blockiert, muss man wissen. Eine Regel, die man nur aus dem Ausbleiben
einer Wirkung erschliessen kann, ist am Brett keine Regel, sondern ein Fehler.
Aus dem „dasselbe wie weg" wird jetzt ein ehrliches Weg: Man sieht beim
Platzieren, was man zerstört, und der Verlauf schreibt es hin.

Damit fällt auch die Sonderstellung des Risses weg, die v0.66 noch begründen
musste: Er frisst die Box seit v0.60, weil er niemanden fragt. Jetzt frisst
auch die Mauer — der Unterschied ist nur, dass man es bei ihr will.

**Ausgeblendet wird beim Platzieren** (`team-schach-brett.js`,
`wuerfelAusblenden`) — dieselbe Hilfe, die der Friedhof seit v0.57 bekommt. In
dem Moment sucht man drei freie Felder in einer Reihe; eine Lootbox, die gleich
verschwindet, soll dabei nicht so aussehen, als sei sie noch zu holen.

## Warum laufende Partien NICHT auf ihrer Startversion eingefroren werden (v0.77)

Die Frage kam am 18.08. wörtlich so: „Laufende Matches sollen immer in der zu
Start verfügbaren Version bleiben — sprich, auch wenn während der Runde eine
neue Version kommt, lass das Spiel in der Version weiterspielen, sonst kann es
zu Problemen kommen. Oder gibt es andere Lösungen?"

**Die Sorge trifft nur die Hälfte des Problems, und diese Hälfte ist längst
gelöst.** Regeln ändern sich in einer laufenden Partie nie: Jede neue Regel
kommt seit jeher als eigenes Feld in `regeln`, und eine Partie ohne dieses Feld
rechnet weiter wie vorher. So gebaut bei `pechZeigen` (v0.49), `regen` (v0.50),
`regenStufe` (v0.59), `lootboxMenge` (v0.71) und zuletzt `einigkeit` (v0.76) —
und dort jedes Mal ausdrücklich begründet. Der Datenvertrag ist additiv; das IST
der Schutz, nach dem gefragt wurde.

Was durchschlägt, sind **Fehlerbehebungen**. Und die sollen durchschlagen: Der
Doppelzug-Fehler aus v0.76 war in einer laufenden Partie zu beheben, weil der
Code sofort für alle gilt. Mit einem Einfrieren hätte die betroffene Partie ihn
bis zum Ende behalten.

Zwei Alternativen wurden geprüft und verworfen:

- **Regel-Schnappschuss beim Anlegen** — nicht nur die Haken, sondern alle
  ZAHLEN (Chancen, Kurven, Mauer-Dauer, Pech-Anteil) wandern in die Partie. Das
  deckt Zahlen ab, aber keine geänderte Programmlogik; genau die machte in v0.76
  den Unterschied. Dafür wächst jeder gespeicherte Stand um einen Block, der
  bei fast jeder Partie derselbe ist.
- **Voll-Freeze über die Versionsnummer** — die Partie merkt sich die Version,
  und der Code hält für jede alte Version ihren Zweig vor. Das friert wirklich
  alles ein, wächst aber unbegrenzt: Nach zwanzig Versionen stünden zwanzig
  Rechnungen nebeneinander, jede mit eigenen Tests, und kein Fehler liesse sich
  mehr in einer laufenden Partie beheben. Für eine App mit drei Spielern ist
  das der Preis eines Problems, das es nicht gibt.

**Gebaut wurde stattdessen das Billige und Nützliche:** `angelegtMit` hält beim
Anlegen die App-Version fest, und die Übersicht zeigt sie — aber nur, wenn sie
von der laufenden abweicht. Eine Angabe, die immer gleich ist, liest nach zwei
Tagen niemand mehr; interessant ist sie genau dann, wenn die Partie älter ist
als die Seite. Sie beantwortet damit die erste Rückfrage bei jeder Meldung
(„welcher Stand war das?") — dieselbe Frage, die bei „Ausweichen funktioniert
eh nicht" offengeblieben ist.

## Warum der Unglücks-Anteil am Füllstand hängt (v0.77)

Gewünscht war „bei Lootbox-Regen soll die Wahrscheinlichkeit gesteigert werden,
dass Unglücksboxen erscheinen". Auf die Rückfrage nach der Staffelung — feste
Zahlen je Mengenstufe oder etwas anderes — kam die Antwort: **„so wie bei den
normalen Lootboxen, anhand der freien Felder."**

Das ist die bessere Regel, und zwar nicht nur, weil sie gewünscht ist: Es gibt
dann **eine** Mechanik statt zweier. Wie viele Lootboxen kommen, hängt seit
v0.71 am Füllstand; wie gefährlich sie sind, hängt jetzt am selben Füllstand,
mit derselben Kurventabelle (`REGEN.STUFEN`, `chanceKurve`) und denselben zwei
Klammern:

- **„wenig" bleibt flach.** Diese Stufe hängt grundsätzlich nicht am Füllstand
  (`stufe: 0`). Eine Ausnahme nur fürs Unglück wäre genau der Knick, den die
  Leiter der vier Stufen ausdrücklich vermeidet (siehe „Warum aus zwei
  Schaltern vier Stufen wurden").
- **Der Grundwert wird nie unterschritten** (`Math.max`). Auf vollem Brett steht
  die Kurve fast bei null; ohne die Klammer käme bei „Regen" früh in der Partie
  WENIGER Unglück als bei „wenig".

Der Höchstwert ist 40 Prozent und nicht mehr. Ab der Hälfte kippt der Charakter
der Lootbox von „Belohnung mit Risiko" zu „Falle mit Chance" — der Wunsch war
„mehr als derzeit", nicht „umgedreht".

**Was IN einem Unglück steckt, blieb unangetastet.** Der zweite Teil des
Wunsches („grüne häufiger als blaue und immer so weiter") war schon erfüllt:
`pechZiehen` verteilt über dieselben Stufen-Chancen wie die Fähigkeiten, also
52 / 33 / 12 / 3.

## Warum das Nudelholz jetzt auch Könige rollt (v0.77)

„Nudelholz soll alle Figuren bewegen" — nachgemessen bewegte es schon alle
Figuren **beider Farben**, nur Könige nicht (so seit v0.46). Die Rückfrage, was
denn gemeint sei, hat der Nutzer mit „Könige sollen mitrollen" beantwortet.

**Die Ausnahme wog schwerer, als sie aussah.** Ein König blieb nicht nur selbst
stehen — sein Feld blieb besetzt, und damit hielt er alles auf, was hinter ihm
stand. In einer Stellung mit zwei Figuren hinter einem König bewegte sich gar
nichts, und das Nudelholz wirkte wie kaputt. Genau das dürfte hinter der
Meldung stecken.

**Der Selbstschutz musste dafür nicht angefasst werden.** Seit v3.6 weist
`faehigkeitEinsetzen` jede Fähigkeit ab, die den eigenen König im Schach
zurücklässt — die Prüfung steht dort und nicht in `SCHACH.nudelholz`, weil die
Rechnung den Zugzusammenhang gar nicht kennt. Sie deckt das Erdbeben und den
Bauernschub gleich mit ab und greift für den rollenden König von allein.

**Erdbeben und Bauernschub behalten ihre Könige.** Der Wunsch galt dem
Nudelholz; beim Bauernschub wäre ein rollender König ohnehin sinnwidrig, er
schiebt Bauern.

## Warum Ausweichen versteckt wurde, obwohl es funktioniert (v0.78)

Der Nutzer wollte es rauswerfen: „werfe Ausweichen raus, funktioniert eh nicht"
(18.08.). Der Verdacht war naheliegend — die Fähigkeit war in v0.66 repariert
und in v0.74 neu bebildert worden, die Meldung hätte also einen alten Stand
meinen können.

**Nachgemessen am Stand v0.76, die ganze Kette:** Einsetzen ist nur im Gegenzug
erlaubt und wird dem am Zug befindlichen Spieler verweigert; das Muster
überlebt den gegnerischen Zug; beim eigenen Zug hat die Figur wirklich alle
freien Nachbarfelder zur Auswahl; nach dem Zug ist es verbraucht. **Sie
funktionierte vollständig.**

**Und trotzdem war die Meldung berechtigt.** Was sie unbrauchbar macht, ist
`nurImGegenzug` (v0.58): Sie ist gesperrt, solange man selbst am Zug ist — also
genau in dem Moment, in dem man auf seine Fähigkeiten schaut. Wer sie benutzen
will, muss sich merken, dass er sie hat, und daran denken, WÄHREND der Gegner
überlegt. Das ist als Regel richtig (sie war als Notbremse gedacht und wurde
bis v0.57 als Gratis-Zug missbraucht), aber in der Hand tot.

Der Nutzer hat nach dem Befund entschieden: „kann raus." Das ist eine
Geschmacksfrage, keine Fehlerbehebung — und deshalb seine.

**Verstecken, nicht löschen.** `versteckt: true` an der Fähigkeit; gefiltert
wird an EINER Stelle, in `faehigkeitenDerStufe`. Damit fällt sie zugleich aus
der Ziehung, aus der Prozentrechnung (`chanceVon`), aus den Erklärtexten und
aus der Bibliothek — vier Fragen, die alle dasselbe meinen: „was kann man
bekommen".

Der Grund gegen das Löschen ist derselbe wie bei den Spielarten:
`SCHACH_RUNDE.normalisieren` wirft jede Fähigkeit aus dem Vorrat, die es in
`FAEHIGKEITEN` nicht mehr gibt. Beim Erdbeben war das v0.54 gewollt (es war
keine Fähigkeit mehr, sondern ein Unglückswürfel — eine, die sich nicht mehr
einsetzen lässt, wäre schlimmer gewesen). Hier ist es nicht gewollt: Wer
Ausweichen im Vorrat hat, soll es aufbrauchen können, statt es beim nächsten
Laden zu verlieren.

**Die Nebenwirkung ist beabsichtigt und nicht klein:** In der gewöhnlichen
Stufe stehen jetzt zwei Fähigkeiten statt dreien. Sprung und Teleport kommen
dadurch je 50 statt 33 Prozent — die Zahlen hinter dem i-Knopf rechnen es
mit, weil sie aus derselben Liste kommen. Wer eine dritte gewöhnliche Fähigkeit
ergänzt, stellt das Verhältnis von selbst wieder her.

## Zwei neue gewöhnliche Fähigkeiten — und warum genau diese zwei (v0.79)

Nach dem Verstecken von Ausweichen (v0.78) war die gewöhnliche Stufe kaputt,
und zwar auf zwei Arten gleichzeitig:

- **Sie war ein Münzwurf.** Zwei Fähigkeiten bei 52 Prozent Stufenchance heisst
  je 26 Prozent. Jede zweite Lootbox trug eine von zweien — und Sprung und
  Teleport machen im Kern dasselbe: Eine Figur bewegt sich anders als sonst.
- **Sie hatte kein Pluszeichen mehr.** Beide sind `istDerZug`. Grün hiess damit
  ausschliesslich „dein Zug wird ein anderer", nie „du bekommst etwas
  obendrauf". Ausweichen war das einzige grüne Plus gewesen. Der Übergang nach
  Blau (Mauer, Nudelholz, Schutzschild — alle drei zusätzlich zum Zug) war
  dadurch kein Schritt mehr, sondern eine Stufe.

Der Nutzer hat am 18.08. beides benannt („damit es wieder ein Ausgleich gibt …
dass es spürbar stärker wird mit jeder Farbe, aber alle fair bleiben") und die
Wahl zwischen neuen Fähigkeiten und einer Verschiebung offengelassen.

**Verschoben wurde nichts.** Alle vier Stufen sind durchgesehen worden. Der
naheliegende Kandidat für eine Verschiebung nach unten wäre das Schutzschild
gewesen — es kostet keinen Zug und verändert kein Material. Aber es rettet in
der Praxis oft eine Dame, und das IST Material. Nach der Hausregel von v0.47
gehört es nicht nach Grün. Frost und Fessel sind die stärksten Gratis-
Fähigkeiten im Spiel, sitzen mit Lila aber richtig: Sie sperren den Gegner über
mehrere Züge, und genau das trennt Lila von Blau.

**Gebaut wurden stattdessen zwei neue, und die Anforderung an sie stand vorher
fest:** beide mit Pluszeichen (das war die Lücke), beide rein positionell (nur
so dürfen sie den Zug behalten), beide auf EIN Feld begrenzt (das ist die
Grösse, die Grün von Blau trennt).

- **Schubs** ist die Ein-Feld-Fassung des Nudelholzes. Eine gegnerische Figur
  neben einer eigenen weicht ein Feld zurück. Kein Schlag — sonst wäre es
  Material und müsste den Zug kosten.
- **Platztausch** bewegt ausschliesslich eigene Figuren und verändert die
  Materiallage überhaupt nicht. Er löst ein Problem, das jeder kennt: Der
  Läufer steht hinter dem eigenen Bauern und sieht nichts.

### Warum der Schubs keine Könige schiebt, das Nudelholz aber schon

Das sieht nach einem Widerspruch aus — das Nudelholz rollt seit v0.78
ausdrücklich auch Könige. Der Unterschied ist die ZIELWAHL: Das Nudelholz rollt
eine ganze Spalte und trifft den König nebenbei; wer es einsetzt, nimmt in
Kauf, was in der Spalte steht. Der Schubs sucht sich sein Ziel aus. Einen König
gezielt aus einem Mattnetz oder in ein Schach zu schieben, und das auch noch,
ohne den Zug herzugeben, wäre für die häufigste Stufe im Spiel viel zu stark.

### Warum die Reihenfolge beim Schubs nicht gewürfelt wird

Stehen mehrere eigene Figuren neben dem Ziel, ist nicht von vornherein klar,
welche schiebt. Entschieden wird das über eine feste Richtungsliste
(`SCHACH.NACHBARN`) — dieselbe Bauweise wie beim Spiegel, der sein freies
Nachbarfeld ebenso der Reihe nach sucht. `Math.random()` wäre hier der bekannte
Fehler aus v0.8: Jedes Gerät sähe ein anderes Brett.

Dass man die Liste nicht im Kopf haben muss, liegt am Vorschau-Kasten (v0.57):
Er zeigt vor dem Einsetzen genau die Felder, die sich ändern — und der Schubs
markiert dabei absichtlich auch die schiebende eigene Figur, sonst sähe man
nicht, WARUM es in diese Richtung geht.

## Warum die Halluzination halb so lang dauert (v0.79)

Acht Halbzüge hiessen VIER eigene Züge blind. Für das häufigste Unglück auf der
harmlosesten Stufe war das die härteste Wirkung im ganzen Spiel — härter als
manches Epische. Der Nutzer hat es am 18.08. so benannt: „verschwommene Sicht
kürzer, ist ja schon stark."

Jetzt sind es vier Halbzüge, also zwei eigene Züge. Spürbar unangenehm, aber
man verliert die Partie nicht daran — das ist die Rolle, die ein grünes Unglück
haben soll.

**Die Zahl steht an zwei Stellen** (`SCHACH_RUNDE.GLAS_HALBZUEGE` und im
Beschreibungstext, den der Nutzer liest). Das ist genau die Art Dopplung, die
auseinanderläuft; ein Test hält beide zusammen.

## Der Frost darf matt setzen (v0.80) — **am 20.08. wieder zurückgenommen**

> **ÜBERHOLT SEIT v0.95.** Der Nutzer hat die Aufhebung am 20.08.2026 wieder
> kassiert: „items sollen nie direkt zu schach oder matt führen." Der Abschnitt
> bleibt stehen, weil die Abwägung darin erklärt, WAS zurückgenommen wurde —
> die geltende Regel steht im Abschnitt „Kein Item führt direkt zu Schach, Matt
> oder Patt" weiter unten. **Was vom Frost bleibt:** Der König zählt weiterhin
> im Block mit und kann sich darin bewegen (die zwei Halbheiten unten). Nur das
> Ergebnis „damit ist er matt" gibt es nicht mehr — eine solche Wirkung wird
> abgewiesen.

Bis v0.79 galt ohne Ausnahme: „König und Matt bleiben unangetastet — von
FÄHIGKEITEN." Der Frost verschonte den König deshalb komplett
(`SCHACH.eingefroren` lieferte für `K` immer `false`), und ein Block, in dem nur
ein König stand, war gar kein gültiges Ziel.

Der Nutzer hat die Aufhebung am 18.08. verlangt und die Folge selbst
ausgesprochen: „Wenn im Frostbereich nur ein König ist, kann er nicht raus, aber
sich darin noch bewegen … kann bei richtigem Nutzen zu Schach führen." Auf die
Rückfrage, ob das wirklich so gemeint sei, kam „todos einbauen".

**Die Abwägung, offen benannt.** Es gibt einen Präzedenzfall für so eine
Aufhebung — seit v0.73 darf eine Unglücks-Lootbox eine Partie beenden. Der
Unterschied wurde damals ausdrücklich als das Entscheidende festgehalten: *Ein
Unglück trifft einen, eine Fähigkeit wählt man.* Genau diese Trennlinie fällt
hier. Wer den Frost gezielt um einen eingeengten König legt, gewinnt durch eine
Lootbox statt durch Schach.

Dagegen steht, dass die Regel spielerisch schlüssig ist: Der Frost war die
einzige Sperre, die eine willkürliche Ausnahme kannte. „Alles im Block ausser
dem König" ist schwerer zu erklären als „was im Block steht, kommt nicht
heraus". Und der Preis ist hoch — ein 2×2-Block muss genau dort liegen, wo dem
König ohnehin fast nichts mehr bleibt.

### Zwei Halbheiten, die zusammengehören

Der Wunsch besteht aus zwei Teilen, und nur beide zusammen ergeben ihn:

1. **Im Block darf man sich bewegen** (`SCHACH.zuege`). Bis v0.79 stand dort
   `return []` — eingefroren hiess bewegungslos. Jetzt bleiben die Züge übrig,
   die innerhalb des Blocks enden. Der Frost ist damit eine Mauer aussen herum,
   kein Anker.
2. **Der König zählt mit** (`SCHACH.eingefroren` UND `_zielWirkung`, Fall
   `frost`). Die zweite Stelle ist leicht zu übersehen: Dort wurde geprüft, ob
   der Block überhaupt etwas trifft, und Könige zählten dabei nicht. Ohne diese
   Änderung wäre die Regel gebaut, aber der Fall des Nutzers — ein Block mit nur
   einem König — nicht anwählbar gewesen.

### Warum das überhaupt funktioniert — die Feinheit, die den Wunsch trägt

„Eingefroren heisst auch unantastbar" (v0.56) bleibt. Ein eingefrorener König
kann also gar nicht geschlagen werden. Man könnte meinen, damit sei Matt
unmöglich geworden — das Gegenteil des Gewünschten.

Es geht auf, weil **`imSchach` über `_feldBedroht` rein geometrisch rechnet und
den Frost nicht fragt**. Der eingefrorene König steht also weiterhin im Schach;
matt ist er, wenn ihm im Block kein Feld mehr bleibt. Diese zwei Stellen hängen
zusammen — wer an einer schraubt, prüft die andere mit. Ein Test hält den Fall
fest.

**Nicht angetastet** wurde die Fessel: Sie nagelt eine Figur wirklich fest und
lässt Könige weiterhin aus. Sie ist damit das Gegenstück zum Frost, und der
Unterschied zwischen beiden (v0.56 mühsam erarbeitet) bleibt erhalten.

## Warum das Nudelholz sein Pluszeichen verloren hat (v0.80)

Nutzer-Ansage vom 18.08.: „Nudelholz soll kein Plus mehr haben, also als ein Zug
gelten."

Das ist der zweite Anwendungsfall der Regel von v0.47 — **wird eine Fähigkeit zu
stark, nimmt man ihr das Pluszeichen; die Stufe bleibt, wo sie ist.** Der erste
war der Bauernschub (v0.56), und die Begründung ist wörtlich dieselbe: Er
verschiebt bis zu acht Figuren, und mit dem Zug obendrauf sind das zwei Züge für
eine Fähigkeit. Das Nudelholz rollt eine ganze Doppelspalte.

**Überfällig war es ausserdem.** In v0.78 hat es Zuwachs bekommen: Es rollt
seither auch Könige, und vorher hielt ein König alles auf, was hinter ihm stand.
Der Preis zog damals nicht mit — das war beim Bau als Beobachtung vermerkt
worden und wird hier nachgeholt.

**Eine Folge, die leicht zu übersehen war:** Die Bildanleitung zeigte ein drittes
Bild mit dem Zug, den man „noch übrig" hatte. Das ist jetzt eine Lüge und wurde
entfernt. Dass es auffiel, lag an einem Test, der die Liste der Fähigkeiten mit
Pluszeichen bis dahin als feste Namen führte — er rechnet sie seither aus
`zeigtPlus` aus. Beim Umstellen kam heraus, dass Schubs und Platztausch (v0.79)
dieses dritte Bild von Anfang an gefehlt hatte; sie haben es jetzt.

## Warum die Lage der Mauer nirgends gespeichert wird (v0.81)

Die Mauer darf seit v0.81 auch senkrecht liegen (Nutzer-Wunsch 18.08.). Der
naheliegende Weg wäre gewesen, die Richtung zur Mauer in den Stand zu schreiben
— `{ felder, bis, senkrecht }`. Das ist nicht nötig und wäre schlechter.

**`stand.mauern` ist eine FELDLISTE.** Ob die drei Felder neben- oder
übereinander liegen, sieht man ihnen an. Eine senkrechte Mauer passt damit ohne
jede Änderung am Datenvertrag hinein, und jede laufende Partie versteht sie
sofort. Ein zusätzliches Feld hätte nur eine zweite Wahrheit geschaffen, die
irgendwann von der Liste abweicht.

Gebraucht wird die Richtung **nur, solange man platziert** — und dort ist sie
Bildschirm-Zustand (`TEAM_SCHACH.mauerRichtung`), der beim Abbrechen zurück auf
waagerecht fällt.

### Sie muss trotzdem bis ins Modell durchgereicht werden

Das ist der Teil, der beim Einordnen unterschätzt wurde. `zielFelder` probiert
JEDES Feld gegen `_zielWirkung` durch — das ist die Hausregel, damit Anzeige und
Regel nicht auseinanderlaufen können. Kennt diese Rechnung die Lage nicht, bietet
sie die waagerechten Plätze an, während der Vorschau-Kasten die senkrechte Mauer
zeigt. Man tippt dann auf ein Feld, das gar nicht gemeint war.

Die Lage reist deshalb als **zweite Zusatzwahl neben `umwandlung`** durch
dieselbe Kette: `zielFelder`, `zielUmriss`, `_zielWirkung`,
`faehigkeitEinsetzen`, `faehigkeitVorschlagen` — und in den **Vorschlag** im
Stand. Ohne den letzten Schritt stimmt ein Team über eine waagerechte Mauer ab
und bekommt eine senkrechte.

**Warum eine zweite Angabe und nicht `umwandlung` mitbenutzt:** Die trägt beim
Bauernschub die gewählte Figur. Zwei Bedeutungen in einem Feld sind der Anfang
jedes Datenvertrags-Bruchs; die zusätzliche Angabe ist additiv und kostet nichts.

### Der Schönheitsfehler, der dabei auffiel

Die Zeichnung der Mauer rechnete mit den LOGISCHEN Spalten (`spalte - 1`,
`spalte + 1`), um die runden Enden zu setzen. Das Brett wird aber seit v0.72 in
vier Lagen gezeichnet: Auf einer Vierteldrehung erscheint eine waagerechte Mauer
senkrecht — und die Enden sassen an den falschen Seiten. Jetzt werden die
Nachbarn über `_feldZuAnzeige` geholt, also über dieselbe Umrechnung, mit der
das Feld überhaupt an seinen Platz kommt. **Merksatz: Was der Spieler SIEHT,
wird in der Ansicht gerechnet, nicht im Stand.**

## Warum eine leere Seltenheitsstufe nicht neu gewürfelt wird (v0.83, entschieden)

Der Nutzer hat am 18.08. die offene Frage zum begrenzten Item-Vorrat
beantwortet: „Es kann eine Seltenheitsstufe leer bleiben. Baue es so, dass
diese nicht gewählt werden kann und die Chancen bei allen anderen gleich
bleiben. Wenn halt die leere gewählt wird, soll erneut gewürfelt werden, so
lange bis eine vorhandene Seltenheit kommt — oder wie würdest du das aus
Programmierer-Sicht bauen?"

**Die Antwort: Neu-Würfeln und Gewichte-Neu-Normieren sind dasselbe Ergebnis.**
Wer so lange würfelt, bis er eine nicht-leere Stufe trifft, erhält exakt die
bedingte Verteilung — jede verbliebene Stufe behält ihr Verhältnis zu den
anderen, und die Wahrscheinlichkeitsmasse der leeren verteilt sich anteilig auf
sie. Genau das rechnet eine Normierung in einem Schritt aus.

**Gebaut wird deshalb die Normierung**, und zwar aus zwei Gründen:

1. **Im Modell wird nicht gewürfelt, sondern gerechnet** (eiserne Regel seit
   v0.8). `_zufallsWert` ist eine Streufunktion über Partie-Kennung und
   Zugzähler; alle Geräte müssen dasselbe Ergebnis bekommen. Eine Schleife
   „würfle noch einmal" bräuchte für jeden Versuch eine eigene Saat und wäre
   im Grenzfall unbeschränkt.
2. **Die Maschinerie steht schon.** `SCHACH_VARIANTEN.stufeZiehen(wert,
   gewichte)` nimmt seit v0.41 (Abklingzeit für Grün) Gewichte entgegen und
   teilt am Ende durch deren Summe. Eine leere Stufe bekommt schlicht das
   Gewicht 0 — der Rest passiert von allein, ohne eine Zeile neuer
   Verteilungslogik.

Zu bauen bleibt damit nur: `_stufenGewichte` liefert 0 für eine Stufe, aus der
im Vorrat der Partie keine Fähigkeit mehr übrig ist.

**Die Formulierung „die Chancen bei allen anderen bleiben gleich" ist dabei
präzisiert worden:** Ihre VERHÄLTNISSE bleiben gleich, ihre absoluten Chancen
steigen. Anders ginge es nicht — die Prozente müssen zusammen 100 ergeben. Beim
Neu-Würfeln wäre es genauso.


## Ausdehnung und Einsturz aus dem Spiel genommen (v0.84) — **auf Zeit, nicht endgültig**

**Nutzer-Ansage 19.08.2026:** „Nimm aus dem Spiel das Vergrössern und das
Verkleinern, das führt zu riesigen Bugs — das müssen wir erst überarbeiten."

**Warum versteckt statt gelöscht.** Beide Einträge bleiben in `PECH` stehen und
tragen nur `versteckt: true`. Gelöscht wäre billiger zu lesen, aber teurer:
Der Zugverlauf einer alten Partie löst „Ausdehnung" dann nicht mehr auf, die
Bildanleitungen fielen weg, und die Überarbeitung müsste alles neu schreiben.
So ist die Rückkehr ein einziger Schalter. Es ist derselbe Weg wie bei den
Fähigkeiten seit v0.78 (Ausweichen) — gefiltert wird an EINER Stelle,
`pechDerStufe`, und damit zugleich in Ziehung und Bibliothek.

**Der Unterschied zur versteckten FÄHIGKEIT.** Dort gilt: Wer eine hat, darf
sie aufbrauchen. Für ein liegendes Unglück gilt das ausdrücklich NICHT — es
ist keine Habe, sondern eine Gefahr. `normalisieren` räumt deshalb liegende
Boxen einer versteckten Art vom Brett; sonst hiesse „aus dem Spiel genommen"
nicht, dass laufende Partien aufhören, den Fehler zu treffen.

**Die leere Stufe.** Beide waren die einzigen Unglücke der Stufe Blau, die
damit leer ist. `pechZiehen` gab in dieser Lage bisher eine leere Kennung
zurück — der Würfel wäre wirkungslos liegen geblieben. Jetzt bekommt eine leere
Stufe **Gewicht 0** und ihre Chance verteilt sich auf die übrigen: dieselbe
Rechnung, die der Nutzer am 18.08. für die leere Seltenheitsstufe entschieden
hat, und dieselbe, die `stufeZiehen` seit v0.41 macht. Ein Unglück kommt also
genauso oft wie vorher.

**Was die Überarbeitung angehen muss** (bevor der Schalter zurückgeht): Die
Brettgrösse mitten in der Partie zu ändern berührt jede gespeicherte
Feldnummer — Rochade, Schild, Fessel, Frost, Mauern, Leihgaben, Risse und die
liegenden Würfel. `SCHACH._feldnummernUmrechnen` bedient das an einer Stelle,
und v0.77.1 hat gezeigt, dass zusätzlich die FORM mitgeführt werden muss
(`_eckenFortsetzen`), sonst frisst sich ein Kreuz von den Rändern auf. Wer die
beiden zurückholt, prüft sie als PAAR: Hin und zurück muss dasselbe Brett
ergeben.

## Der begrenzte Item-Vorrat (v0.87)

**Wunsch R5+R6, vom Nutzer am 20.08. als V3 bestätigt:** Nicht alle Items
sollen in jeder Partie vorkommen — am Anfang wird ausgelost, welche es gibt,
und am Matchbeginn wird gezeigt, welche das sind.

**Warum der Vorrat in die PARTIE gehört und nicht ins Gerät.** Beide Seiten
müssen dasselbe Angebot haben, sonst zieht eine Lootbox bei dir etwas, das es
beim Gegner nicht gibt. Der Vorrat steht deshalb in `regeln.itemPool`, neben
der Spielart — und wie sie steht er mit dem Anlegen fest.

**Warum gerechnet und nicht gewürfelt.** `itemVorratAuslosen` zieht aus der
Partie-Kennung (`_zufallsWert`), nicht aus `Math.random()`. Damit kommt jedes
Gerät auf dieselbe Liste, ohne dass jemand sie schreiben müsste — dieselbe
eiserne Regel wie bei der Zufallsarmee und beim Kreuz. Gezogen wird mit
denselben Stufen-Chancen wie im Spiel: Seltenes bleibt selten, auch im Vorrat.

**Warum an EINER Stelle gefiltert wird.** `faehigkeitenDerStufe` hat einen
wahlfreien zweiten Parameter `erlaubt` bekommen. An dieser einen Funktion
hängen Ziehung, Prozentrechnung, Erklärtext und Bibliothek; wer eine fünfte
Verwendung baut, erbt den Filter mit. Vier getrennte Filter wären vier
Gelegenheiten, einen zu vergessen. Der Parameter ist wahlfrei, damit jeder
Aufruf von früher unverändert dasselbe liefert (additiver Vertrag).

**Warum eine leere Stufe Gewicht 0 bekommt.** Mit begrenztem Vorrat kann eine
ganze Seltenheitsstufe leer bleiben. Ohne Gegenmassnahme zöge `stufeZiehen`
sie trotzdem, und beim Einsammeln käme nichts heraus — eine Lootbox, die nichts
tut. `_stufenGewichte` setzt solche Stufen deshalb auf 0; die Chance verteilt
sich auf die übrigen. Es ist dieselbe Rechnung wie bei den Unglücken seit v0.84
und dieselbe Nutzer-Entscheidung vom 18.08.

**Warum die Bibliothek weiterhin ALLES zeigt.** Sie ist auch ausserhalb einer
Partie erreichbar und ist das allgemeine Nachschlagewerk — „was es im Spiel
gibt", nicht „was diese Partie hat". Was die laufende Partie hat, steht im
Partie-Kopf hinter „Diese Items gibt es". Die Bibliothek zu filtern hiesse, die
Partie bis in einen Bildschirm durchzureichen, der sie nicht kennt.

**Ein Fund am Rande:** Es gibt nur **19 sichtbare** Fähigkeiten (20 minus die
versteckte „Ausweichen"). Die Stufe „viele" stand zuerst auf 20 und wäre damit
stillschweigend dasselbe wie „alle" gewesen — ein Knopf ohne Wirkung. Sie steht
jetzt auf 15, und ein Test besteht darauf, dass jede Stufe wirklich mehr
liefert als die darunter. Wer Fähigkeiten ergänzt, darf die Zahlen anheben; der
Test sagt, wann es nötig wird.

## Die Schreibweise „Quizz" bleibt (v0.89 umbenannt, v0.90 zurueckgebaut)

**Nutzer-Frage vom 20.08.:** „Kann es sein, dass überall Quizz falsch
geschrieben ist?" — Ja. Richtig ist **Quiz** mit einem z; „Quizz" war von
Anfang an durchgängig falsch geschrieben.

**Entschieden: Nur der sichtbare Name wird geändert.** Seit v0.89 heisst die
App überall dort „Quiz", wo ein Mensch sie liest — Seitentitel, Kopfzeile,
Name auf dem Startbildschirm, Tab-Beschriftung, Ranglisten-Spalte. Alle
technischen Kennungen behalten „quizz".

**Warum nicht durchgängig? Drei Gründe, jeder für sich ausreichend:**

1. **„quizz" ist an drei Stellen eine ZUTAT einer Prüfsumme**, kein Name:
   `quizz-pin|…` (jede Spieler-PIN), `quizz-admin|…` (das
   Verwaltungs-Passwort, dessen Prüfwert in `konfig.js` damit gerechnet wurde)
   und `wuerfel-quizz|…` (jedes Siegel). Ein gestrichenes z macht sie alle
   ungültig — und zwar still: Es fällt erst auf, wenn sich jemand nicht mehr
   anmelden kann oder eine laufende Runde sich nicht auflösen lässt.
2. **Die Speicherpfade** (`wuerfel-quizz`, `quizz.team-schach`,
   `quizz.imposter` und die lokalen Schlüssel) sind die Adresse aller
   gespeicherten Daten. Neue Pfade hiessen: Alles Bisherige liegt weiter in
   der Datenbank, die App schaut nur nicht mehr hin — plus neue Regeln von
   Hand in der Firebase-Konsole.
3. **Die Firebase-Projektkennung `quizz-215bd` lässt sich gar nicht ändern.**
   Sie ist bei Firebase dauerhaft. „Überall" wäre also selbst dann unmöglich,
   wenn man die ersten beiden Punkte in Kauf nähme.

**Was das für künftige Arbeit heisst:** Der Unterschied zwischen „Quiz" im
Text und „quizz" im Code ist **Absicht, kein Flüchtigkeitsfehler.** Wer ihn
„aufräumt", zerstört Daten. Im Code steht an der empfindlichsten Stelle
(`versiegelung.js`) ein Warnblock; der Ordner heisst weiter `Apps\Quizz`, das
Repo `up-birdo/Quizz`, und die Werkzeuge heissen weiter `Deploy-Quizz.ps1` und
`Test-Quizz.ps1`.

**Was der Nutzer tun müsste, wenn er es doch ganz will:** das Repo auf GitHub
selbst umbenennen (dann ändert sich die Adresse der Seite und alte Lesezeichen
gehen ins Leere) und in der Firebase-Konsole neue Regeln anlegen. Beides wurde
am 20.08. bewusst NICHT gemacht.

### Nachtrag: mit v0.90.0 vollständig zurückgebaut

**Ansage des Nutzers am 20.08., nach Rücksprache mit den Mitspielern:** „Es
soll doch überall Quizz weiter heissen, alles zurückbauen."

Damit ist die Umbenennung aus v0.89.0 hinfällig. Der sichtbare Name ist wieder
**Quizz** — Seitentitel, Kopfzeile, Startbildschirm, Tab, Rangliste, README.
Die App heisst jetzt wieder in beiden Welten gleich, sichtbar wie technisch.

**Warum das die bessere Entscheidung ist, obwohl die Schreibweise falsch
bleibt:** Ein Name ist kein Rechtschreibfall, sondern eine Vereinbarung. Die
Runde kennt die App seit Monaten als „Quizz", spricht so über sie und findet
sie so auf dem Handy. Sprachliche Richtigkeit hätte nur dann gezählt, wenn
niemand den alten Namen schon benutzte — und genau das war nicht der Fall.
Der Nutzer hat vor der Entscheidung mit den Mitspielern gesprochen; das ist
die richtige Instanz für eine Namensfrage.

**Was von v0.89 stehen bleibt und WARUM es wertvoll ist:** die Warnung über
den drei Prüfsummen-Zutaten (`quizz-pin|`, `quizz-admin|`, `wuerfel-quizz|`)
und den Speicherpfaden. Sie hing nie an der Umbenennung: Diese Zeichenketten
dürfen unter keinen Umständen angefasst werden, egal wie die App heisst. Der
Warnblock in `versiegelung.js` und der Test in `test-syntax.js` bleiben
deshalb erhalten.

**Was der Vorgang gekostet hat:** eine Version hin, eine zurück — und die
Erkenntnis, dass eine Namensfrage vor dem Bauen in die Runde gehört, nicht
danach. Nicht rückgängig gemacht wurde nichts: v0.89.0 bleibt als
ausgelieferte Nummer stehen (eine ausgelieferte Version wird nie mit anderem
Inhalt erneut veröffentlicht), der Rückbau ist v0.90.0.

## Kein Item führt direkt zu Schach, Matt oder Patt (v0.95) — **hebt zwei frühere Entscheidungen auf**

Nutzer-Entscheidung vom 20.08.2026, im Wortlaut:

> „naja items sollen nie direkt zu schach oder mat führen das soll nicht mehr
> so richtig sein da mauer und so soll durch cleveres plazieren schon große bis
> massive auswirkungen haben also soll denken belohnt werden ganz es beheben
> kann man es ja nie mit items im schach"

**Was damit fällt.** Zwei Dinge, beide vom Nutzer selbst zwei Tage vorher
beschlossen:

1. **Das Recht des Frostes, mattzusetzen** (18.08., v0.80) — siehe den
   Abschnitt „Der Frost darf matt setzen" weiter oben.
2. **Die Folge daraus in v0.94**, dass eine Fähigkeit die Partie beenden kann.
   Der Fehler, den v0.94 behoben hat, war ein anderer und bleibt behoben: dass
   eine mattsetzende Wirkung die Partie ANHIELT, statt sie zu beenden. Nur die
   Antwort darauf ist jetzt eine andere — nicht „beenden", sondern „gar nicht
   erst zulassen".

**Die Abwägung, in den Worten des Nutzers.** Die Trennlinie ist DIREKT gegen
INDIREKT. Ein Item soll die Stellung vorbereiten; den Angriff führt der ZUG.
Genau deshalb bleibt die Mauer so mächtig, wie sie war: Sie gibt nie Schach,
sie sperrt Felder — „durch cleveres platzieren schon große bis massive
auswirkungen". Was der Nutzer verhindern will, ist nicht die Wirkung, sondern
der geschenkte Abschluss: Wer gewinnt, soll den letzten Schritt selbst tun.
Der Halbsatz „ganz es beheben kann man es ja nie mit items im schach" sagt
zugleich, dass ihm die Grenze bewusst ist — ein Item, das dem Gegner den
letzten Fluchtweg nimmt, macht den Zug danach trivial. Das ist gewollt.

**Zwei Punkte auf Rückfrage entschieden (20.08.):**

- **Auch kein PATT.** Sonst liesse sich eine verlorene Partie per Item zum
  Unentschieden machen — dasselbe Geschenk, nur in Grün.
- **Unglücks-Lootboxen bleiben ausgenommen.** Für sie gilt weiter die
  Entscheidung vom 09.08.: „Eine Fähigkeit wählt man, ein Unglück trifft
  einen." Damit ist die Trennlinie von v0.73 wiederhergestellt, die v0.80
  aufgeweicht hatte — die Regel ist nach dieser Runde also **wieder
  geradliniger als vorher**, nicht verwickelter.

**Wie es gebaut ist.** Eine Funktion, `SCHACH_RUNDE._wirkungVerboten`, und
zwei Aufrufer: `faehigkeitEinsetzen` (weist ab, die Fähigkeit bleibt im Vorrat)
und `zielFelder` (markiert solche Felder gar nicht erst). Drei Fälle sind
verboten — eigener König im Schach, gegnerischer König im Schach, und die
Seite am Zug hat danach keinen Zug mehr. Der dritte Fall deckt Matt und Patt
zugleich ab und gilt für BEIDE Seiten: Wer sich mit einer Mauer selbst
einsperrt, wird ebenso abgewiesen.

**Wo die Ausnahme sitzt.** Die Abweisung steht in `faehigkeitEinsetzen` VOR dem
Einsammeln der berührten Lootboxen, die Ende-Prüfung (`SCHACH.lage`) dahinter.
Damit gilt: Was die Fähigkeit selbst anrichtet, wird verhindert; was ein dabei
aufgesammeltes Unglück anrichtet, zählt. Wer die Reihenfolge umdreht, macht
mit der einen Entscheidung die andere kaputt.

**Was es im Spiel kostet.** Auf leeren Endspiel-Brettern werden Verstärkung,
Nekromant, Wiederbelebung, Nachschub und Spiegel spürbar öfter abgewiesen — eine
neue starke Figur neben einem freistehenden König gibt fast immer Schach. Drei
bestehende Tests mussten ihre Stellungen ändern, weil sie genau solche kahlen
Bretter benutzten. Im vollen Spiel fällt es kaum auf; gemessen im Spieltest
über 528 Partien.
