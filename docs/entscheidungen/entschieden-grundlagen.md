# Entschieden — Würfel Quizz, Technik und Grundsätzliches

Herausgelöst aus `entschieden.md` (19.08.2026); dort steht der Wegweiser
über alle Entscheidungs-Dateien.

## Warum das Aufdecken je Person eine Tipp-Sperre erzwingt

Wenn jeder einzeln aufdeckt, sind die echten Würfel einer Person sichtbar,
während andere noch tippen dürfen. Ohne Gegenmaßnahme könnte man abschreiben.
Deshalb weist `MODELL.tippSetzen` jede Vermutung auf einen bereits aufgedeckten
Spieler ab — im Modell, nicht nur in der Oberfläche, damit die Regel auch dann
gilt, wenn zwei Geräte gleichzeitig schreiben.

Nebenwirkung, bewusst angenommen: Wer spät dazukommt, kann auf früh Aufgedeckte
nicht mehr tippen. Das ist richtig so — deren Wurf steht ja schon da.

## Warum das Auge standardmäßig zu ist und nichts speichert

Der Zweck des Knopfes ist, dass ein Blick über die Schulter nichts verrät. Wäre
der Zustand gespeichert, stünde nach dem Öffnen der Seite womöglich der eigene
Wurf offen auf dem Tisch — genau der Fall, den der Knopf verhindern soll. Also:
nach jedem Laden verdeckt, Sichtbarkeit nur für den Moment.

Der Schalter wirkt auch auf die Eingabefelder. Ein `select` lässt sich nicht
maskieren, deshalb werden die Felder bei geschlossenem Auge durch Platzhalter
ersetzt. Zum Eintragen macht man das Auge kurz auf — ein Klick mehr, dafür eine
Regel weniger im Kopf.

## Warum ein gezeichnetes Auge statt eines Emojis

Haus-Regel: keine Emojis. Ein SVG ist eine Zeichnung, kein Emoji — es lässt sich
in der Schriftfarbe darstellen, skaliert sauber und sieht auf jedem Gerät gleich
aus. Zwei Zustände: offenes Auge mit Pupille (Zahlen sichtbar), geschlossenes
Lid mit Wimpern (verdeckt).

### Anmeldung und Verwaltung (2026-07-31, zu v0.6)

| Wunsch | Umsetzung |
|---|---|
| Verwaltungs-Zugang mit Passwort 660932, der Spieler löschen darf | Knopf **Verwaltung** in der Fußleiste; im Quelltext steht nur die Prüfsumme des Passworts. |
| Beim Namen eine vierstellige PIN vergeben | Bei der Neuanmeldung, zweimal einzugeben. |
| Beim ersten Besuch zuerst fragen: Bist du einer dieser Spieler? Liste zeigen, PIN prüfen, dann hinein — von jedem Gerät | Genau so gebaut (`anmelden()` Weg 2). |

## Was die PIN leistet — und was nicht

Das muss man wissen, bevor man sich darauf verlässt:

**Sie leistet:** Anmelden als man selbst von einem beliebigen Gerät, ohne Konto
und ohne Server. Sie hält einen Mitspieler davon ab, sich mal eben als jemand
anders auszugeben.

**Sie leistet nicht:** Schutz gegen jemanden, der es darauf anlegt. Vier Ziffern
sind zehntausend Möglichkeiten; Prüfsumme und Salz stehen öffentlich in der
Datenbank, ein kleines Programm probiert sie in Sekunden durch. Dasselbe gilt
für das sechsstellige Verwaltungs-Passwort — eine Million Möglichkeiten sind für
einen Rechner nichts.

Warum das trotzdem so gebaut ist: Ein echter Schutz bräuchte einen Server, der
Anmeldeversuche zählt und bremst — also genau das, was dieses Projekt bewusst
nicht hat. Für ein Spiel unter Freunden ist ein Türschloss richtig, ein Tresor
wäre falsch investierte Mühe.

**Wichtig ist, was NICHT an der PIN hängt:** Die echten Würfel. Die liegen im
Gerätespeicher ihres Besitzers und stehen zu keinem Zeitpunkt in der Datenbank.
Wer eine PIN knackt, kann sich als jemand ausgeben und dessen Tipps ändern — er
sieht dadurch keinen einzigen fremden Würfel. Das Spiel selbst bleibt heil.

## Warum die PIN im Klartext nirgends steht

Dieselbe Überlegung wie beim Würfel-Siegel: Alles, was in der Datenbank steht,
ist öffentlich lesbar. Gespeichert werden deshalb nur `pinPruefwert` und
`pinSalz`. Das Salz muss offen liegen — sonst könnte ein fremdes Gerät die PIN
nicht prüfen, und genau das ist ja der Zweck. Zwei Spieler mit derselben PIN
bekommen dadurch verschiedene Prüfwerte; ohne Salz sähe man in der Datenbank
sofort, wer dieselbe Zahl benutzt.

Das Verwaltungs-Passwort steht aus demselben Grund nicht in `js/konfig.js` —
nur seine Prüfsumme. Die Datei liegt öffentlich auf GitHub.

## Warum die neue Runde ans Passwort gebunden ist

Der Knopf löscht bei jedem Mitspieler Würfel und Vermutungen — mitten im Spiel
ein Fehlgriff, den nichts zurückholt. Bis v0.8 durfte ihn jeder drücken; das war
eine Einladung zum Versehen, besonders weil er nach dem Aufdecken die blaue
Hauptaktion ist.

Die Alternative wäre gewesen, den Knopf ganz zu verstecken, solange die
Verwaltung nicht offen ist. Dagegen sprach: Dann sucht jemand die Funktion und
findet sie nicht. Jetzt sieht man sie, und die Passwortabfrage erklärt beim
Antippen, warum sie geschützt ist.

## Warum jeder eine PIN haben muss

Bis v0.8 gab es einen Weg ohne Ausweis: Spieler aus der Zeit vor der PIN
(v0.6) ließen sich mit einer bloßen Rückfrage übernehmen. Wer diesen Weg ging,
blieb ohne PIN — die Lücke blieb also offen und wanderte mit. Seit v0.9 wird
unmittelbar nach der Übernahme eine PIN verlangt, ohne Abbruch-Möglichkeit.

Damit gilt ausnahmslos: **Jeder Spieler hat eine PIN.** Das Eingabefeld lässt
sich nicht leer bestätigen, der Knopf bleibt bis zur vollständigen Ziffernfolge
gesperrt (`dialog.js`).

## Warum die Verwaltung nur löschen darf

Naheliegend wären auch: PIN zurücksetzen, Namen ändern, Wurf ansehen. Gebaut ist
nur das Entfernen, weil es alle vorkommenden Fälle löst (doppelte Anmeldung,
vergessene PIN, jemand ist raus) und weil jede weitere Befugnis erklärt und
geprüft werden müsste. Den Wurf ansehen ginge ohnehin nicht — er liegt nicht in
der Datenbank.

Der Zustand steckt im Gerätespeicher, nicht im gemeinsamen Stand: Verwaltung ist
eine Eigenschaft des Geräts, an dem jemand sitzt, nicht der Runde. So sehen die
anderen auch nicht, dass gerade jemand als Verwalter unterwegs ist.

## Warum ein Siegel statt einfacher Geheimhaltung

Das Spiel steht und fällt damit, dass niemand die Würfel der anderen vorher
sieht. Die Daten liegen aber in einer öffentlich lesbaren Datenbank, deren
Adresse zwangsläufig im ausgelieferten JavaScript steht. Abgewogen wurden:

| Weg | Bewertung |
|---|---|
| Würfel in der Datenbank, App zeigt sie nur nicht an | Abgelehnt. Wer die Entwicklerkonsole öffnet, sieht alles. Bei einem Spiel, das einen ganzen Tag läuft, ist das keine Frage des Ob, sondern des Wann. |
| Würfel verschlüsseln | Abgelehnt. Der Schlüssel müsste in der öffentlichen Seite stehen — Scheinsicherheit. |
| **Würfel bleiben auf dem Gerät, veröffentlicht wird nur eine Prüfsumme** | **Gewählt.** Kostet rund fünfzig Zeilen, kommt ohne Fremdtechnik aus (Web Crypto ist im Browser eingebaut) und löst zwei Probleme auf einmal: Spicken ist unmöglich, und nachträgliches Ändern fällt auf. |
| Einen Server bauen, der die Würfel unter Verschluss hält | Abgelehnt. Eigener Server, eigene Anmeldung, eigener Betrieb — für ein Freundesspiel unverhältnismäßig, und die Seite soll ohne Haus-Netz erreichbar sein. |

Der Preis der gewählten Lösung: Die Würfel hängen am Gerät. Wer wechselt, muss
bei der Auflösung von Hand nachtragen; das wird als **ohne Siegel** angezeigt.
Das ist ehrlicher als eine Lösung, die Sicherheit nur vortäuscht.

## Warum Namen und Vermutungen NICHT versiegelt sind

Namen müssen sichtbar sein, sonst weiß niemand, auf wen er tippt. Vermutungen
müssen am Ende auswertbar sein und sind vor der Auflösung nur schwach geschützt
(die App zeigt sie nicht, in der Datenbank stehen sie im Klartext). Das ist
vertretbar: Wer die Tipps der anderen spickt, gewinnt dadurch nichts —
entscheidend sind die echten Würfel, und die sind versiegelt.

## Warum das Ändern einer Festlegung erlaubt bleibt

Ein Verbot wäre technisch leicht, in der Praxis aber lästig: Wer sich vertippt,
sitzt sonst den ganzen Abend auf einem falschen Wurf. Stattdessen ist Ändern
erlaubt und wird **sichtbar gemacht** — mit Anzahl und Uhrzeit, für alle. Die
soziale Kontrolle erledigt den Rest, ganz ohne Regelwerk.

## Warum die Eingabefelder keine Nummern tragen

Bis v0.4 stand über jedem Auswahlfeld **Würfel 1** bis **Würfel 5**. Der Nutzer
fragte daraufhin nach, ob ein umsortierter Tipp überhaupt zählt — die Zählung
war schon immer richtig, aber die Beschriftung erzählte etwas anderes. Eine
Oberfläche, die man erklären muss, ist falsch beschriftet.

Seit v0.5 tragen die Felder keine sichtbare Nummer mehr; darüber steht der Satz
*Reihenfolge egal — es zählt nur, welche Werte vorkommen.* Für Vorleseprogramme
bleibt die Nummer im `aria-label`, sonst wäre nicht unterscheidbar, in welchem
Feld man steht.

## Warum die Punkte so verteilt werden

Gewünscht war ein Punktestand mit Teilpunkten für knappe Tipps. Die Zahlen
stehen in `modell.js` (`PUNKTE_EXAKT`, `PUNKTE_NAH`, `PUNKTE_BONUS`) und
ergeben sich aus drei Überlegungen:

- **Genau richtig muss deutlich mehr wert sein als knapp daneben**, sonst lohnt
  sich das Nachdenken nicht. Verhältnis 10 zu 4: Zweieinhalb knappe Tipps wiegen
  einen genauen auf.
- **Abstand 3 bringt nichts.** Bei Werten von 1 bis 5 wäre sonst fast jeder
  Tipp irgendwie „nah" — dann wäre die Skala wertlos.
- **Der Bonus belohnt den Vergleich mit den Mitspielern**, nicht nur die eigene
  Leistung. Genau das war der Wunsch: Punkte auch dafür, näher dran gewesen zu
  sein als die anderen. Bei null Punkten gibt es keinen Bonus, sonst würde er in
  einer Runde ohne jeden Treffer verlost.

Die Restwerte werden **der Größe nach gepaart** (beide Listen sortiert, dann
Stelle für Stelle). Bei sortierten Listen ist das nachweislich die Paarung mit
dem kleinsten Gesamtabstand — der Rater wird also immer so gut bewertet, wie es
überhaupt möglich ist. Eine schlechtere Paarung wäre schwer zu erklären und
würde als Willkür wahrgenommen.

Die Erklärung im i-Knopf wird aus denselben Konstanten erzeugt
(`MODELL.punkteErklaerung()`). Damit kann die angezeigte Regel nicht von der
gerechneten abweichen — der übliche Weg, wie Spielregeln und Code auseinander
laufen, ist hier baulich versperrt.

## Warum die Reihenfolge der Würfel nicht zählt

Fünf gewürfelte Würfel sind eine Menge, keine Reihenfolge. Deshalb:

- gezählt wird als Multimenge — ein doppelt geratener Wert zählt nur so oft, wie
  er wirklich vorkommt (echt `1,1,3,5,Stern` gegen Tipp `1,3,3,5,5` gibt 3);
- vor dem Bilden der Prüfsumme wird sortiert, sonst wäre derselbe Wurf je nach
  Eingabereihenfolge unterschiedlich versiegelt;
- angezeigt wird immer sortiert, das liest sich schneller.

## Warum Anmeldung über den Namen, ohne Passwort

Ein Passwort wäre eine Hürde für ein Spiel unter Freunden und müsste irgendwo
sicher liegen. Stattdessen merkt sich das Gerät, wer es ist. Gibt jemand einen
schon vorhandenen Namen ein, fragt die App nach, ob es dieselbe Person auf einem
anderen Gerät ist. Das kann man missbrauchen — unter Freunden ist das kein
Bedrohungsmodell, sondern Zusammenarbeit.

## Warum Karten statt einer großen Tabelle

Eine Matrix aus allen Ratern gegen alle Ziele wäre auf dem Handy unbrauchbar.
Stattdessen: je Mitspieler eine Karte mit fünf Feldern. In der Auflösung
dieselbe Karte, ergänzt um die echten Würfel und die Tipps aller anderen. Die
einzige echte Tabelle ist die Bestenliste — sie hat nur drei Spalten.

## Warum Firebase Realtime Database?

Der Wunsch, dass alle dieselbe Runde sehen, verlangt eine Stelle außerhalb der
Besucher-Browser. GitHub Pages liefert nur unveränderliche Dateien aus.

| Weg | Bewertung |
|---|---|
| **Firebase Realtime Database über REST** | **Gewählt.** Konto anlegen, Datenbank erzeugen, Adresse eintragen — fertig. Keine Bibliothek, kein Bauschritt, kein Server im Haus. |
| Supabase | Gleichwertig, aber mehr Begriffe für dieselbe Aufgabe. |
| Eigener PowerShell-Server im Haus (Muster Helpdesk) | Passt zum Haus-Stil, scheitert am Ziel: die Seite soll öffentlich erreichbar sein, nicht nur im Haus-Netz. |
| GitHub als Speicher (Datei per API schreiben) | Verlangt einen Schreib-Token in der öffentlichen Seite. Abgelehnt. |

Die Entscheidung ist umkehrbar: Ein anderer Dienst ist eine weitere Klasse in
`js/speicher.js` mit denselben vier Mitgliedern.

## Warum die Abfrage im Hintergrund ruht

Die Mitspieler sitzen nicht im selben Netz — sie spielen über mobile Daten,
verteilt über einen ganzen Tag. Eine Abfrage alle drei Sekunden bei offenem
Tab in der Hosentasche kostet Datenvolumen und Akku für nichts: Niemand schaut
hin, und beim Zurückkommen wird ohnehin neu geladen.

Deshalb prüft `fremdenStandHolen()` `document.hidden` und überspringt die
Abfrage im Hintergrund. Damit der Stand trotzdem sofort stimmt, hängt an
`visibilitychange` ein Anschluss, der beim Sichtbarwerden einmal holt — das
fühlt sich schneller an als vorher, obwohl weniger übertragen wird.

Nicht gebaut: das Abfrageintervall selbsttätig strecken, wenn lange nichts
passiert. Das wäre eine zweite Zeitsteuerung mit eigenem Verhalten für einen
Gewinn, den die Sichtbarkeits-Regel schon fast vollständig einsammelt. Wer
sparsamer will, erhöht `abfrageIntervallMs` in `js/konfig.js`.

## Warum kein Firebase-SDK?

Das SDK kostet eine fremde Bibliothek, einen weiteren Ladevorgang und mehr
Begriffe. Für einen Stand, der als Ganzes gelesen und geschrieben wird, genügen
zwei REST-Aufrufe. Der Preis: keine echte Ereignis-Verbindung, wir fragen alle
3 Sekunden nach. Bei einer Handvoll Mitspieler ist das unauffällig.

## Warum „letzter gewinnt" beim gleichzeitigen Arbeiten?

Die App schreibt den gesamten Stand, also gewinnt der spätere Schreibvorgang.
Feldweise Zusammenführung wäre für die erwartete Nutzung unverhältnismäßig.
Abgemildert wird es so:

- eine offene eigene Änderung wird nie von einem fremden Stand überschrieben,
- geschrieben wird verzögert, nicht bei jedem Tastendruck,
- der Kopf zeigt jederzeit, ob gespeichert ist.

Praktisch heißt das: Wenn zwei im selben Moment tippen, kann ein Tipp verloren
gehen. Beim Festlegen und Aufdecken ist das unkritisch, weil jeder nur seinen
eigenen Eintrag anfasst.

## Warum das App-Zeichen so aussieht

Vier Augen und ein Stern in der Mitte: Das sind genau die Werte des Würfel
Quizz (1 bis 5 und Stern) in einem Bild, und es funktioniert auch als kleines
Lesezeichen noch. Gezeichnet, kein Emoji — Haus-Regel.

Der erste Entwurf war zu gedrängt: Bei 32 Pixeln verschmolzen Stern und Augen zu
einem Fleck. Deshalb sitzen die Augen weiter aussen und der Stern ist kleiner.
**Wer das Zeichen ändert, prüft es in 32 Pixeln nach** — in 512 sieht fast alles
gut aus.

Zwei Quellen (`icon.svg` und die Koordinaten in `tools\Icons-Erzeugen.ps1`) sind
eine bewusste Doppelung: PowerShell kann ohne Zusatzprogramm kein SVG zeichnen,
und eine Fremdbibliothek nur fürs Icon wäre unverhältnismässig. Beide Dateien
tragen einen Hinweis aufeinander.

## Warum der Wert „Stern" als Wort erscheint

Haus-Regel: keine Emojis. Ein Sternzeichen wäre grenzwertig, das Wort **Stern**
ist eindeutig, wird vorgelesen und funktioniert in jeder Schriftart. Intern
heißt der Wert `"STERN"`.

## Warum es von Anfang an Tabs gibt

Ursprünglicher Wunsch: ein Tab **Würfel Quizz** als „derzeit einziger". Das
Register kostet wenige Zeilen und erspart später den Umbau der Seite.

## Warum das Ändern der PIN die alte verlangt

Ohne diese Rückfrage wäre die PIN wertlos: Wer ein kurz unbeaufsichtigtes Handy
in die Hand bekommt, ist dort ohnehin schon angemeldet — er könnte einfach eine
neue PIN setzen und den Zugang dauerhaft übernehmen. Mit der Rückfrage bleibt
der ursprüngliche Besitzer der Einzige, der sie ändern kann.

Wer seine PIN wirklich vergessen hat, wird von der Verwaltung entfernt und
meldet sich neu an. Das ist der bewusst einzige Weg — ein Zurücksetzen durch die
Verwaltung wäre bequemer, würde aber bedeuten, dass ein Passwort im Umlauf jeden
Zugang öffnet.
