# Blunderluck - Entscheidungs-Index

Wegweiser in die Themendateien dieses Ordners. Regel: NUR die Dateien lesen,
deren Themen das aktuelle Vorhaben beruehrt - nie alles auf Vorrat.
Neue Erkenntnisse: in die passende Datei schreiben UND hier eintragen.

**Herkunft:** Bei der Ausgliederung 08/2026 vollstaendig aus dem Quizz
(v0.122.0) geerbt — die Versionsnummern in den Eintraegen sind QUIZZ-Nummern.
Alles zu Schach, Anmeldung/PIN, Speicher/Abgleich und Technik gilt hier
weiter; Wuerfel-Quizz-Spiel- und Imposter-Eintraege sind Vergangenheit und
bleiben nur als Begruendungs-Archiv stehen. Der erste eigene Eintrag ist
„Die Ausgliederung aus dem Quizz" in [entschieden.md](entschieden.md).


> **Zwei Zaehlungen in einer Doku.** Was aus dem Quizz geerbt ist, nennt
> QUIZZ-Nummern: `v1.0` bis `v3.8` und, ab der SemVer-Zeit, `v0.41.0` bis
> `v0.122.0`. Blunderluck begann am 23.08.2026 neu bei `v0.1.0`. Faustregel
> bis auf Weiteres: **unter `v0.30.0` ist Blunderluck, ab `v0.41` oder mit
> `v1`/`v2`/`v3` ist Quizz.** Sobald Blunderluck die `v0.41.0` erreicht,
> traegt diese Regel nicht mehr - dann gehoert in geerbte Eintraege das Wort
> Quizz vor die Nummer.

Warum das Projekt so aussieht, wie es aussieht — und was bewusst NICHT gebaut
wird. Die Liste dessen, was noch kommt, steht in [../ROADMAP.md](../ROADMAP.md).

## entschieden.md - Blunderluck-Eintraege

- **Brett zuerst, der Rest ordnet sich unter** (27.08.2026, v0.88.0 —
  **beendet die Familie „das Brett springt" an der Wurzel**: Groesse
  eingefroren (`_brettLage`), fluechtige Kinder zaehlen nicht mit, Brett
  klebt oben, Rollbalken bekommt festen Platz; Kehrseite: bei zu wenig
  Platz rollt der Spielbereich)
- **Der Vorschau-Kasten wird gezogen — UND weiter getippt** (27.08.2026,
  v0.84.0, Gruppe C — **loest den Widerspruch zur Entscheidung vom
  08.08.2026 auf, die das Ziehen verworfen hatte**: nebeneinander statt
  umgekehrt; `touch-action` nur waehrend des Platzierens, eine Setz-Stelle
  fuer beide Wege, kein Neuzeichnen waehrend der Bewegung)
- **Zustimmen heisst denselben Zug machen** (26.08.2026, v0.83.0 —
  Gestalt-Entscheidung zu Fund A2-3: Abstimmungs-Karte und Knoepfe ersatzlos
  weg, je Spieler SEIN Vorschlag (`vorschlaege`), Schemen + gruener Laufweg
  nur fuers eigene Team; Frist bleibt als Rueckfall gegen Abwesende, die Uhr
  entscheidet nie einen Streit — Nachtrag dazu in `offen-und-abgelehnt.md`)
- **Das Unglueck ist eine Karte in der Hand, kein Streifen** (26.08.2026,
  v0.82.0 — Gestalt-Entscheidung zu Fund A2-1, ersetzt den Streifen aus
  v0.59 ersatzlos; Liste `unglueckskarten` an der Partie statt im Verlauf,
  Anzeige-Filter im Modell `unglueckskartenVon`/`glasWirkt`)
- Die Seitenwahl gegen den Computer (24.08.2026, v0.29.0 — Bot-Runden
  starten LEER, weil ein Teamwechsel im Modell verboten ist; daraus die
  Trennung `botVorgesehen` gegen `istBotPartie` und das Wegraeumen einer nie
  betretenen Runde)
- Vier Schwierigkeitsstufen fuer den Computer (24.08.2026, v0.28.0 —
  Stufen ueber Suchtiefe statt ueber eine Fehlerquote, zwei verschiedene
  Vorgaben fuer neue und alte Runden, Arbeitsbudget statt Zeitmessung,
  keine Punkte gegen den Bot bekraeftigt. Verfahren und Messwerte:
  docs\entwurf-bot.md)
- Der Computer-Gegner, Stufe 1 (24.08.2026, v0.27.0 — Bot als
  Team-Mitglied, kein neues Feld im Datenvertrag; ZWEI Entscheidungen ohne
  Rueckfrage: Bot-Partien zaehlen nicht fuer die Rangliste, und der Bot
  liest von einer Lootbox nur die Feldnummer. Bauvorlage aller drei Stufen:
  docs\entwurf-bot.md)
- Buendel A: Konto, Startbildschirm, Code, Freunde, Einladungen
  (23./24.08.2026, v0.6.0 bis v0.13.0 — Bauvorlage und alle 19 Antworten:
  docs\entwurf-konto-und-startbildschirm.md)
- Die Ausgliederung aus dem Quizz (23.08.2026)
- **Acht Festlegungen zum Rundenablauf und zum Spiel-Bildschirm** (v0.34.0
  bis v0.70.0 — zugeloste Seite, Symbol-Karten in Spielkartenform,
  Zurueck-Knopf, Spielerzeilen, Icons nur fuer Nebensachen, Code-Feld,
  Wuerfel-Knopf; am 26.08.2026 aus der STATUS.md hierher gezogen)

## offen-und-abgelehnt.md - Blunderluck-Eintraege

- Die offene Datenbank - Freundeskreis-Entscheidung mit Ablaufdatum
  (23.08.2026; RTDB statt Firestore, Region, Abfrage-Kosten, was ein
  Play-Store-Umbau braeuchte - Referenz: docs\uebergabe-schach-app.md)

## erkenntnisse.md - Teuer erkaufte Erkenntnisse
- **Wer eine Klassenzeile neu setzt, muss die Grundklasse mitschreiben**
  (v0.107.0, beim Bibliotheks-Umschalter gefunden: `classList` fuehrt im
  DOM-Nachbau der Tests eine eigene Liste neben `className`, und `_knopf`
  stellt jedem Knopf `"knopf "` voran. Dazu zwei Wiederholungstaeter:
  `hidden` verliert gegen eigenes `display: flex`, und
  `document.querySelectorAll` gibt es im Test-Nachbau nicht — nur am
  Element)
- **Ein Schutz, der an einem Zaehler haengt, schuetzt nur, was den Zaehler
  bewegt** (v0.89.1, „Bereit gedrueckt, Spiel startet nicht": der zweite
  Bereit-Druck ueberschrieb mit seinem veralteten Lokalstand die Zusage der
  Gegenseite; die Zugzaehler-Pruefung griff nicht, weil Bereit den Zaehler
  nicht bewegt. Seit v0.89.1 landet die Zusage auf dem frisch geladenen
  Stand, seit v0.90.0 alle Vor-Spiel-Schreibwege: `_aufFrischemSenden`;
  Nachtrag v0.94.0: das Rest-Fenster bei exakt gleichzeitigen Druecken
  schliesst die Nachkontrolle `_nachkontrolle` — sofort + nach 2 s, nur
  idempotente Wege, Marke gegen das Rueckgaengigmachen neuerer Aktionen)
- **Ein Fehler, der nur GEMELDET wird, ist fuer den Aufrufer kein Fehler**
  (v0.89.0, dringende Meldung „komme nicht mehr in meinen Account": nicht
  das Zusammenfuehren war schuld, sondern ein Fehlstart, nach dem die
  Anmeldung mit dem LEEREN Stand lief; enthaelt die zweite Regel — ein
  wartender Zustand braucht einen Weg zurueck, wenn die Daten nachkommen —
  der Nebenbefund „Konto wird erst nach 500 ms geschrieben" ist seit
  v0.91.0 erledigt: `Abgleich.sofortSchreiben`)
- **Eine ANGENOMMENE Groesse ist ein Fehler mit Ansage — dritter Anlauf**
  (v0.87.0, Vorschaubretter der Bildanleitungen: Figur 162 bis 199 % statt
  126 % der Feldbreite, weil die Schrift gegen `min(260px, 70vw)` rechnete
  statt gegen den echten Platz; Regel: gemessen ODER relativ, nie geschaetzt)
- **Ein `!important` schuetzt nur SEINE Eigenschaft — und ein z-index sagt
  nichts ohne seine Nachbarn** (v0.83.1, zwei Nutzer-Meldungen vom
  27.08.2026: Riss mit stehengebliebener Kachelkante, Lootbox vor der Figur;
  enthaelt die Stufen-Landschaft im Brettfeld und die Erinnerung, dass die
  Testkette nicht rendert)
- **Wer gemessene PIXEL schreibt, muss nach jeder Groessenaenderung neu
  messen — ZWEIMAL passiert** (Quizz v0.88 Brett, Blunderluck v0.74.0
  Tab-Pille; `resize` PLUS `orientationchange`, messen im naechsten Bild,
  mehrere Ereignisse nur EINE Messung)
- **Eine Flex-Eigenschaft ohne `display: flex` ist stumm** (v0.64.0,
  gefunden v0.79.2 — `justify-content` an einem normalen `button` tat
  lautlos nichts, die Zeichen der Knopfspalte sassen links statt mittig)
- **Wer schrumpfen DARF, wird geschrumpft — und der Rollbalken ist ein
  Bauteil mit Groesse** (gefunden v0.79.2 — `flex: 0 1 auto` staucht
  entgegen dem eigenen Kommentar, und der Rechner-Rollbalken nahm den
  Spielkarten 10 px Hoehe)
- **Auf der festen Seite ist JEDE Marke, die kommt und geht, eine
  Brettgroesse** (v0.79.1, derselbe Fehler zum dritten Mal nach v0.52.0 und
  v0.54.0 — die Marke „Wird gesendet" machte das Brett bei jedem eigenen Zug
  354 → 349 → 354 px; Loesung: Platz freihalten statt weglassen)
- **`overflow-y: auto` macht die WAAGERECHTE Achse gleich mit rollbar**
  (v0.68.0, gefunden v0.72.0 — der buendige Team-Kasten erzeugte dadurch eine
  Bildlaufleiste; enthaelt ausserdem, WIE man so etwas misst: Wegwerf-Seite
  mit den echten Dateien plus Edge im Kopflos-Modus)
- **Bei gleicher Spezifitaet gewinnt die SPAETERE Regel** (v0.67.0, gefunden
  v0.71.0 — das Zeichen auf der Item-Karte war vier Auslieferungen lang 16
  statt 26 Pixel gross, weil eine aeltere Regel weiter unten stand; die
  Testkette rendert nicht und kann so etwas nie fangen)
- **Wer eine Zusage streicht, muss sagen, wer sie erneuert** (v0.62.0,
  gefunden v0.64.1 — der Computer sagte nach einer Ruecknahme nie wieder zu,
  das Spiel begann nie; der Fehler sass in der Naht zwischen Bildschirm und
  Bot, wo kein Test war)
- **Die Projekt-Schranke stolperte über die eigene Netz-Adresse** (v0.61.0 —
  eine grosse Doku-Datei am Stück neu zu schreiben löst den Fehlalarm aus;
  abschnittsweise ändern, nichts umgehen)
- Ein leerer Bereich darf nicht verschwinden (v0.47.0 - die
  Bildschirm-Tests zaehlen die Bereiche der Partie)

- Teuer erkaufte Erkenntnisse
    - **Ein Waechter, der eine handgeschriebene Liste prueft, wacht nicht**
      (v0.28.0) — `partieAnlegen` vergass `botStufe`, die DRITTE Wiederholung
      von „eine Einstellung, die nichts tut". Der Test von v0.91 schwieg, weil
      seine Pruefliste im Test selbst stand. Merksatz: Ein Waechter zieht seine
      Liste aus der Quelle, die sich ohnehin aendert — sonst beruhigt er nur
    - **Die Ruhesuche ass der Hauptsuche die Tiefe weg** (v0.28.0) — ein
      gemeinsames Budget machte die hoechste Bot-Stufe SCHWAECHER als die
      darunter. Merksatz: Zwei Verbraucher an einer Grenze heisst, der zuerst
      laufende bekommt alles; und „staerker" ist eine Behauptung, die ein
      Turnier belegen muss, kein Einzelspiel
    - Mitspieler verschwanden wieder aus der Runde (v0.8)
    - Der Tab Team Schach blieb leer (v1.2)
    - Die Fähigkeiten-Karte fehlte bei zugeschalteten Würfeln (v3.3, gefunden v3.4)
    - Die Zielpunkte blieben nach dem Zug stehen (v4.0)
    - Die Seite fror ein, bis der Gegner zog (v3.9)
    - Die Fähigkeit war verbraucht, ihre Wirkung nie da (v0.41)
    - Der gerechnete Zufall streute nicht (v0.49.1)
    - Die neue Partie war da — man stand nur davor (v0.44)
    - Die neue Partie war da — und verschwand wieder (v0.52)
    - Die Bildanleitung hat zwei Regeln entlarvt (v0.46)
    - Der hinterlegte Zugriffsschlüssel ließ sich nicht mehr lesen (v0.8)
    - Der Stolperstein verpuffte im Vorbeiziehen (v0.53, gefunden v0.58)
    - Eine Beispielszene ohne Figuren beendet die Partie (v0.58)
    - Ein Angreifer hinter einer Sperre gab trotzdem Schach (v3.3, gefunden v0.60)
    - Der gewuerfelte Seitentausch hob sich selbst auf (v0.63)
    - Das Beispiel im Erklaertext verschluckte einen echten Wunsch (v0.63)
    - Die Sicherung gegen gleichzeitige Zuege verschluckte das Ausweichen (v0.66)
    - „Fenster blockiert", obwohl das Fenster aufging (v0.66)
    - Die neue Lootbox verdeckte den Zug, der gerade passiert war (v0.69)
    - Eine Liste im Behandler, die niemand mitpflegt (v0.60, gefunden v0.71)
    - Die Gegenseite eines PAARES ist nicht die gespiegelte Seite (v0.72)
    - Der Doppelzug nahm seinen zweiten Zug zurueck (v0.76)
    - Ein Eintrag, der sich als Bewegung ausgab (v0.76)
    - Ein Zaehler, der die Brettbreite meint, aber die Mitte braucht (v0.76)
    - Ein Kettenschub sieht aus wie ein Schlag (v0.77, kein Fehler)
    - Zwei richtige Regeln, die sich gegenseitig auffrassen (v0.77.1)
    - Die eine Funktion, die man beim Aufraeumen vergisst (v0.82) — dritte
      Wiederholung von „Richtung aus der Farbe rechnet auf dem Kreuz falsch"
    - Zwei Uhren, und die eine Funktion nahm die falsche (v0.83, behoben
      v0.83.1) — zugZaehler ist Sperr-Sicherung, stand.takt die Spiel-Uhr
    - Eine gemischte Liste darf man nicht hinten abschneiden (v0.86) — der
      König konnte aus der gemischten Zufallsarmee herausfallen, wenn die
      Liste erst nach dem Mischen gekürzt wurde
    - **Dieselbe Falle, zweite Wiederholung: eine Einstellung, die nichts
      tut** (v0.86/v0.87, gefunden v0.91) — `partieAnlegen` kopiert Regeln
      EINZELN und übersprang zwei; die Vorschau las eine andere Quelle als
      das Ergebnis und bestätigte den Fehler. Merksatz: Eine Lehre, die nur
      als Satz in der Doku steht, hält bis zum nächsten Mal
    - **Ein Stand, der als Literal gebaut wird, verliert jedes vergessene
      Feld** (Meldung #36, gefunden v0.98) — `SCHACH._ausfuehren` baut den
      neuen Stand Feld für Feld; `enttarntFarbe`/`enttarntBis` und
      `startSeiten` fehlten dort und waren nach jedem Zug weg. Ein Test
      vergleicht jetzt die SCHLÜSSEL vorher/nachher und muss nie gepflegt
      werden. Merksatz: Wo ein Datensatz neu aufgebaut statt kopiert wird,
      ist die Feldliste eine Schnittstelle — und gehört abgesichert
    - **Was zur Meldung #36 schon gemessen wurde** (erledigt mit v0.99) —
      die Liste des Ausgeschlossenen und der Nachtrag, warum die Dieb-Hälfte
      kein Fehler war, sondern eine Regel, die sich wie einer anfühlte.
      Merksatz: Wer eine Bequemlichkeit einbaut, die etwas WEGNIMMT, fragt
      vorher nach
    - **Die Pflichtlektuere wuchs schneller, als sie genutzt wurde**
      (gemessen v0.103) - 72 KB Pflicht beim Sitzungsbeginn, weil nach jeder
      Runde eine Regel dazukam und nie etwas kuerzer wurde. Merksatz: Was bei
      JEDEM Anfang gelesen wird, ist die teuerste Zeile im Projekt - wer dort
      ergaenzt, kuerzt an derselben Stelle. Jetzt 27 KB
    - **Eine aufgehobene Regel lebt in ihrem Erklärtext weiter** (v0.95,
      gefunden v0.100) — der Frost-Text versprach noch fünf Versionen lang das
      Mattsetzen, das v0.95 zurückgenommen hatte. Merksatz: Wer eine Regel
      aufhebt, sucht nicht nur die Stellen, die sich auf sie verlassen, sondern
      auch die SÄTZE, die sie erklären — sie bewacht kein Test
    - **Eine Einstellung, die eine Zahl verspricht, die das Brett nicht halten
      kann** (v0.86, gefunden v0.99) — „viel" und „voll" stellten dieselbe
      Armee auf wie „normal", weil `armeeAnzahl` den Anteil multiplizierte,
      während die Startfelder fest blieben. Merksatz: Versprechen und
      Wirklichkeit kommen aus DERSELBEN Funktion; ein `Math.min` gegen eine
      Obergrenze ist eine stille Absage, kein Schutz
    - **Zwei Wege zum Partieende, aber nur einer wurde geprueft** (v3.6,
      gefunden v0.94) — Matt und Patt wurden nur nach einem ZUG geprueft; eine
      Faehigkeit konnte mattsetzen, ohne die Partie zu beenden. Dazu derselbe
      Fehlertyp in der Anzeige: `zielFelder` markierte Felder, die
      `faehigkeitEinsetzen` ablehnte. Merksatz: Wer eine Regel aufhebt, sucht
      die Stellen, die sich auf sie verlassen haben
    - **Ein aktives Zugmuster sieht aus wie ein frisches Schach** (v0.95) —
      `imSchach` rechnet `zusatzMuster` mit; wer zwei Staende damit vergleicht,
      misst sonst die Regelaenderung statt der Stellungsaenderung. Merksatz:
      Wer keine Figur versetzt, kann kein Schach geben
    - **Ein Hintergrund macht keine Ebene** (v0.67, gefunden v0.94) — die
      klebende Knopfleiste des Dialogs hatte keinen `z-index`; Figuren, Marken
      und der schwebende Zurueck-Knopf lagen darueber. Die Ebenen stehen
      seither als Variablen an einer Stelle in `css\stil.css`
    - **Ein tieferer Block sperrt sich selbst ein** (v0.104) — ab drei
      Reihen berühren sich die Armeen; die seit v0.49 gemischte Zufallsarmee
      stand dann bis zu einem Drittel der Fälle ohne gültigen Zug da.
      Offiziere aussen, Bauern vorn. Merksatz: Wer eine Grenze verschiebt,
      prüft nicht die Grenze, sondern das Spiel dahinter
    - **Die naheliegende Liste war keine Uhr** (v0.104) — `KREUZ.seiten` ist
      nach Gegenüber sortiert und taugt nicht als Uhrzeigersinn; die
      Diagonalen des Kreuzes verteilten sich dadurch 35 zu 33
    - **Verzögerte Bewegung: Animation mit backwards, nie Übergang plus
      Delay** (v0.117.1) — beim Übergangs-Muster blitzt zwischen Aufbau und
      Rücksetzung ein Einzelbild der Endlage durch; die Figuren hüpften
    - **Ein Bild statt eines Zeichens macht drei Kästen kaputt** (v0.121) —
      Flex drückt den Figurenkasten klein (`flex: 0 0 auto`), das Raster-Feld
      zieht am Brett (`min-width: 0`), und der Deploy lud den Ordner `img`
      gar nicht hoch; alles drei nur durch Messen im Browser gefunden
    - **Vier Fallen beim Bau der Lootbox in Blender** (v0.23.0/v0.24.0) —
      Text liegt schon flach (Drehen stellt ihn auf), `shade_smooth`
      verschmiert eine Gravur (`shade_auto_smooth` nehmen), ein zur Seite
      gestelltes Objekt rendert LEER, und eine Gravur verdoppelt die Zahl
      der Bilder, weil sie sich nicht mehr im Code drehen lässt. Merksatz:
      Ein Renderskript kann man nicht lesen, nur ansehen — nach jeder
      Änderung EIN Bild öffnen. Nebenbefund: Der Test-DOM brauchte
      `setAttributeNS`
    - **Ein Test hinter `process.exit` läuft nie** (v0.52.0) — ans Ende von
      `test-syntax.js` gehängte Prüfungen sind toter Text; die Kette meldet
      weiter „0 Fehler". **Nach jedem Ergänzen die ZAHL der Prüfungen
      vergleichen**, nicht nur das Fazit lesen
    - **`letter-spacing` steht auch hinter dem LETZTEN Zeichen** (v0.51.0) —
      ein Feld, das genau N Zellen breit ist, verschiebt beim letzten
      Tastendruck seinen ganzen Inhalt; das Code-Feld ist deshalb um die
      halbe Zellenluft breiter, als die Kästchen zeigen
    - **Zwei CSS-Regeln mit gleichem Gewicht — es entscheidet die
      Reihenfolge** (v0.52.0) — `.schach > *` und `.brett-halter` wiegen
      gleich; wo eine Regel eine andere absichtlich überstimmt, wird sie
      SCHWERER gemacht, nicht tiefer gelegt
    - **Ein Kommentar behauptete, ein Stil sei tot — er war es nicht**
      (v0.50.0) — `.verlauf-kasten` galt seit v0.37.0 als ohne Nutzer und
      war es nie. „Wird das noch benutzt?" beantwortet die Suche, nicht das
      Gedächtnis
    - **Der Zustand einer Seite und die Wahl zwischen den Seiten gehören
      nicht an denselben Ort** (v0.53.0, gemeldet v0.55.0) — beim Umräumen
      ist die erste Frage nicht „wo gehört das hin", sondern **„ist das eine
      Eigenschaft oder eine Wahl"**. Eine Wahl braucht ihre Möglichkeiten
      nebeneinander
    - **Die feste Seite passt nicht zu jedem Zustand desselben Bildschirms**
      (v0.52.0, gemeldet v0.55.0) — wer das Layout an einen Zustand bindet
      (hier: „das Brett bekommt allen Platz"), knüpft die Bindung auch an
      diesen Zustand und nicht an den Bildschirm

## entschieden.md - Entschieden - und warum

Seit 19.08.2026 aufgeteilt: `entschieden.md` selbst enthaelt nur noch die
Nutzer-Entscheidungen und den Wegweiser; die Abschnitte liegen unveraendert in
drei Themendateien (unten je Datei aufgefuehrt). Gezielt lesen: Abschnitt hier
nachschlagen, dann in der Themendatei ueber die Ueberschrift ansteuern.

- Nutzer-Entscheidungen *(stehen weiter in `entschieden.md` selbst)*
    - Beim Anlegen (2026-07-31)
    - Der eigentliche Zweck (2026-07-31, kurz nach v0.1)
    - Aufdecken und Verstecken (2026-07-31, zu v0.3)

### entschieden-grundlagen.md - Wuerfel Quizz, Technik, Grundsaetzliches

- Warum das Aufdecken je Person eine Tipp-Sperre erzwingt
- Warum das Auge standardmäßig zu ist und nichts speichert
- Warum ein gezeichnetes Auge statt eines Emojis
    - Anmeldung und Verwaltung (2026-07-31, zu v0.6)
- Was die PIN leistet — und was nicht
- Warum die PIN im Klartext nirgends steht
- Warum die neue Runde ans Passwort gebunden ist
- Warum jeder eine PIN haben muss
- Warum die Verwaltung nur löschen darf
- Warum ein Siegel statt einfacher Geheimhaltung
- Warum Namen und Vermutungen NICHT versiegelt sind
- Warum das Ändern einer Festlegung erlaubt bleibt
- Warum die Eingabefelder keine Nummern tragen
- Warum die Punkte so verteilt werden
- Warum die Reihenfolge der Würfel nicht zählt
- Warum Anmeldung über den Namen, ohne Passwort
- Warum Karten statt einer großen Tabelle
- Warum Firebase Realtime Database?
- Warum die Abfrage im Hintergrund ruht
- Warum kein Firebase-SDK?
- Warum „letzter gewinnt" beim gleichzeitigen Arbeiten?
- Warum das App-Zeichen so aussieht
- Warum der Wert „Stern" als Wort erscheint
- Warum es von Anfang an Tabs gibt
- Warum das Ändern der PIN die alte verlangt

### entschieden-bis-v3.md - Team Schach und Imposter bis v3.8 (08/2026)

- Team Schach — die Entscheidungen (v1.0)
- Team Schach — der Ausbau (2026-08-01, v1.3 bis v1.5)
    - Warum die laufende Partie nicht umzieht, sondern bleibt
    - Warum das Doppelbrett keine zwei Bretter ist
    - Warum die Spielart fest zur Partie gehört
    - Warum es nur zwei Fähigkeiten gibt
    - Warum die Bewegung im Verlauf steht und nicht im Bildschirm
    - Warum die Rangliste die Spiele nicht vermischt
    - Abgelehnt beim Ausbau
- Bedienung des Brettes (2026-08-02, v1.6 bis v1.9)
    - Der blaue Punkt auf dem blauen Brett — ein selbstgemachter Fehler
    - Warum die Rochade jetzt auch über den Turm geht
    - Warum der Pfeil und die Bewegung beide bleiben
- Die Fähigkeiten-Spielart (2026-08-02, v2.0)
    - Warum der Würfel gezeichnet und nicht eingefügt ist
    - Warum vier Arten statt zehn Sonderfälle
    - Warum die Zielfelder ausprobiert und nicht aufgezählt werden
    - Warum König und Matt ausgenommen sind
    - Warum eine Partie leer startet
- Regeln und Bedienung (2026-08-02, v2.1 bis v2.3)
    - Der König, den der Doppelzug verschluckte
    - Warum die Rochade jetzt aus der Stellung gelesen wird
    - Warum ein Teamwechsel nicht mehr geht
    - Warum die Pfeile nur halbdurchsichtig sind
    - Warum die Stufe Grau verschwunden ist
- Der Gewinner-Bildschirm, der niemand fand (v2.6)
- Warum der Pfeil jetzt eine Maske hat
- Wie die Fähigkeiten eingestuft werden (Stand v2.6)
- Warum der Hover nichts mehr verrät
- Warum die Vorzüge wieder ausgebaut sind (v2.8)
- Warum das volle Glas keine Regel anfasst
- Warum die Würfel keinen festen Takt mehr haben
- Imposter — die Entscheidungen (v3.0)
    - Was die Geheimhaltung leistet und was nicht
    - Warum die Wortliste handgemacht ist
    - Warum die Zahl der Imposter nur ein Höchstwert ist
    - Ein Fehler beim geratenen Wort wird verziehen
    - Warum die Imposter-Punkte nicht festgeschrieben werden
- Warum der Imposter Räume bekommen hat (v3.2)
- Warum team-schach.js in vier Dateien liegt (v3.2)
- Die drei Wünsche vom Wunsch-Knopf (v3.3)
- Warum das Löschen ans Passwort gebunden ist (v3.3)
- Warum die Würfel keine Höchstzahl mehr haben (v3.3)
- Warum der Springerpfeil einen Knick hat (v3.3)
- Die drei neuen Fähigkeiten und der Erdbeben-Umbau (v3.5)
- Warum `halbzuege` keine Uhr ist (v3.5)
- Warum der Zugpfeil verschwunden ist (v3.6)
- Warum die Figurengröße gemessen und nicht gerechnet wird (v3.6)
- Warum sich der Würfel-Inhalt erst beim Einsammeln entscheidet (v3.6)
- Warum Ausweichen im gegnerischen Zug geht (v3.6)
- Warum eine Fähigkeit den König nicht im Schach lassen darf (v3.6)
- Thema und Wortart sind zwei Fragen (v3.7)
- Warum ein gefallenes Wort gedämpft und nicht gesperrt wird (v3.7)
- Warum selbst angelegte Themen auf der Tafel liegen (v3.7)
- Warum der Bibliotheks-Knopf verschwindet statt zu fragen (v3.7)
- Erst anzeigen, dann senden (v3.8)

### entschieden-ab-v0-41.md - Team Schach seit v0.41 (SemVer-Zeit)

- Warum Grün eine Abklingzeit bekommen hat (v0.41)
- Warum Rot und Blau und nicht Grün und Gelb (v0.41)
- Warum die Bildanleitung gerechnet und nicht gezeichnet wird (v0.41)
- Wie eine Fähigkeit eingepreist wird (v0.47)
- Die Zeichen gehören der Fähigkeit, nicht der Lage (v0.48) — **kehrt v0.41 um**
- Sprung und Teleport SIND der Zug (v0.48) — **kehrt einen Teil von v0.47 um**
- Warum die Wiedergeburt nur noch episch ist (v0.48)
- Wie lange eine Wirkung hält, steht jetzt dabei (v0.48)
- Der Unglückswürfel ist kein Gesetz mehr, sondern ein Haken (v0.49) — **hebt
  eine eiserne Regel auf**
- Zwei Könige sind zwei Leben (v0.49, Spielart „Zufallsarmee")
- Frost und Fessel mussten sich unterscheiden (v0.56)
- Warum aus der Verstärkung eine Kette wurde (v0.56) — **zweite Quelle für
  „zwei Könige sind zwei Leben"**
- Warum der Bauernschub sein Pluszeichen verloren hat (v0.56) — **erster
  Anwendungsfall von „zu stark heisst Plus weg, nicht Stufe verschieben"**
- Warum der Vorschau-Kasten angetippt und nicht gezogen wird (v0.57) — **weicht
  bewusst vom Wortlaut des Wunsches ab**
- Warum eine Leihgabe erst zählt, wenn man wieder am Zug ist (v0.57)
- Warum ein Zug unterwegs enden kann (v0.58) — **nimmt eine Aussage aus
  derselben Runde zurück**
- Warum eine Unglücks-Lootbox eine Partie beenden darf (v0.73) — **hebt eine
  eiserne Regel für Unglückswürfel auf**
- Warum der Stolperstein rückwärts wirft und nicht abwärts (v0.73)
- Warum die Ansicht sich nur EINMAL dreht (v0.72)
- Warum das Kreuz-Duell die Startseite auslost (v0.72)
- Warum aus zwei Schaltern vier Stufen wurden (v0.71) — **ersetzt den
  Regen-Haken (v0.50) und den Schieberegler (v0.60)**
- Warum die Mauer die Lootbox jetzt frisst (v0.77) — **kehrt v0.66 um**
- Warum laufende Partien NICHT auf ihrer Startversion eingefroren werden
  (v0.77) — **beantwortet die Architekturfrage vom 18.08.**
- Warum der Unglücks-Anteil am Füllstand hängt (v0.77) — **eine Mechanik
  statt zweier, dieselbe wie bei der Menge seit v0.71**
- Warum das Nudelholz jetzt auch Könige rollt (v0.77)
- Warum Ausweichen versteckt wurde, obwohl es funktioniert (v0.78) —
  **erste versteckte FÄHIGKEIT, nicht nur Spielart**
- Zwei neue gewöhnliche Fähigkeiten — und warum genau diese zwei (v0.79) —
  **Grün hatte nach v0.78 kein Pluszeichen mehr**
- Warum die Halluzination halb so lang dauert (v0.79)
- Der Frost darf matt setzen (v0.80) — **am 20.08. zurückgenommen, siehe den
  Eintrag zu v0.95 ganz unten.** Der Abschnitt erklärt weiter, WAS aufgehoben
  wurde; die geltende Regel steht dort
- Warum das Nudelholz sein Pluszeichen verloren hat (v0.80)
- Warum die Lage der Mauer nirgends gespeichert wird (v0.81)
- Warum eine leere Seltenheitsstufe nicht neu gewürfelt wird (v0.83, entschieden)
- Ausdehnung und Einsturz aus dem Spiel genommen (v0.84) — **auf Zeit**;
  versteckt statt gelöscht, liegende Boxen fliegen vom Brett, Stufe Blau leer
- Die Schreibweise „Quizz" bleibt (v0.89 umbenannt, v0.90 zurueckgebaut) —
  **wichtig vor jedem Umbenennen**: Der Name bleibt ueberall „Quizz" (so
  entschieden nach Ruecksprache mit den Mitspielern), und `quizz-pin|`,
  `quizz-admin|`, `wuerfel-quizz|` sind ohnehin Zutaten von Pruefsummen —
  wer dort ein z streicht, macht PINs, Passwort und Siegel ungueltig
- Der begrenzte Item-Vorrat (v0.87) — Vorrat gehoert zur Partie und wird
  gerechnet; Filter an EINER Stelle (`faehigkeitenDerStufe`), leere Stufe
  bekommt Gewicht 0, Bibliothek bleibt bewusst ungefiltert
- **Kein Item fuehrt direkt zu Schach, Matt oder Patt** (v0.95, Entscheidung
  20.08.) — **hebt zwei fruehere Entscheidungen auf** (Frost v0.80 und die
  Folge daraus in v0.94). Trennlinie DIREKT gegen INDIREKT: Das Item bereitet
  vor, den Angriff fuehrt der ZUG. Geprueft in `_wirkungVerboten`, gefragt von
  `faehigkeitEinsetzen` UND `zielFelder`. **Ungluecks-Lootboxen bleiben
  ausgenommen** (Entscheidung 09.08.) — deshalb steht die Abweisung VOR dem
  Einsammeln und die Ende-Pruefung dahinter

## offen-und-abgelehnt.md - Offen, Nutzer-Entscheidungen noetig, bewusst abgelehnt

- Warum die Abstimmung eine Frist braucht
- Bewusst abgelehnt
- Braucht eine Nutzer-Entscheidung (nicht ungefragt bauen)
- **Was sich nur am Geraet beurteilen laesst** (Stand 20.08.2026) — die
  Spielgefuehl-Fragen, die keine Tabelle beantwortet: Kreuz-Bretter, die
  Regeln aus v0.56 bis v0.60, Anleitungs-Timing, Zufallsarmee, wie sich die
  Item-Regel im Endspiel anfuehlt. Standen bis v0.103 in der `STATUS.md` und
  sind beim Eindampfen hierher umgezogen — **nichts davon blockiert etwas**

## historie.md - Versions-Historie

15 Versions-Eintraege (Warum je Version). NUR auf ausdrueckliche
Frage zur Vergangenheit lesen, nie zur Orientierung fuer neue Arbeit.
