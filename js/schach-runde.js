/*
 * schach-runde.js — EINE Partie mit ihren beiden Teams.
 *
 * schach.js kennt nur die Regeln; hier kommt dazu, WER ziehen darf und wie der
 * gemeinsame Stand aussieht. Auch diese Datei ist ohne Browser testbar.
 *
 * Seit v1.4 laufen mehrere Partien nebeneinander. Die Sammlung aller Partien
 * liegt in schach-tafel.js — diese Datei kennt immer nur eine einzelne.
 *
 * Seit v0.92.0 (27.08.2026) ist der Baustein zweigeteilt: Fähigkeiten,
 * Lootboxen und der Händler stehen in schach-runde-faehigkeiten.js. Sie
 * ERGÄNZT dasselbe Objekt (Object.assign) und lädt überall NACH dieser Datei.
 *
 * Die wichtigste Hausregel dieser Partie:
 * **Innerhalb eines Teams gibt es keine Reihenfolge.** Jeder aus dem Team, das
 * am Zug ist, darf ziehen — wer zuerst drückt, hat gezogen. Der Wechsel
 * zwischen Weiss und Schwarz bleibt normales Schach.
 *
 * Datenvertrag (additiv — Felder nur ERGÄNZEN):
 *
 *     {
 *         "datenVersion": 1,
 *         "id": "p-1",                 // Kennung innerhalb der Tafel
 *         "titel": "Partie 1",         // frei wählbarer Name
 *         "variante": "standard",      // Spielart, siehe schach-varianten.js
 *         "erstelltAm": 1750000000000,
 *         "geaendertAm": 1750000000000,
 *         "stand": { … },              // Brett und Zugrecht, siehe schach.js
 *         "zugZaehler": 0,             // steigt mit jedem Zug; die Sperre
 *                                      // gegen zwei gleichzeitige Züge
 *         "laeuft": false,
 *         "ergebnis": "",              // "", "weiss", "schwarz", "remis"
 *         "teams":  { "weiss": ["id"], "schwarz": ["id"] },
 *         "bereit": { "weiss": false, "schwarz": false },
 *         "faehigkeiten": { "weiss": ["sprung"], "schwarz": [] },
 *         "bonusGesammelt": [26],      // schon eingesammelte Bonusfelder
 *         "verlauf": [ { "text": "Bauer e2 nach e4", "wer": "Anna",
 *                        "farbe": "weiss", "von": 52, "nach": 36 } ]
 *     }
 *
 * Warum die EINGESAMMELTEN Bonusfelder gespeichert werden und nicht die
 * verbliebenen: Firebase wirft leere Listen weg. Eine leere Liste
 * „verbliebene Felder" käme als „nicht vorhanden" zurück und würde beim
 * Normalisieren wieder mit allen Feldern gefüllt — die Fähigkeiten lägen
 * plötzlich wieder auf dem Brett. Bei den eingesammelten stimmt „nicht
 * vorhanden" mit „noch keins eingesammelt" überein.
 */

const SCHACH_RUNDE = {

    DATEN_VERSION: 1,

    /* So viele Züge bleiben im Verlauf stehen. */
    VERLAUF_LAENGE: 40,

    /*
     * Wie lange die Halluzination die Sicht trübt (in Halbzügen).
     *
     * SEIT v0.79 VIER STATT ACHT (Nutzer-Ansage 18.08.: „verschwommene Sicht
     * kürzer, ist ja schon stark"). Acht Halbzüge hiessen VIER eigene Züge
     * blind — für das häufigste Unglück auf der harmlosesten Stufe zu viel.
     * Jetzt sind es zwei eigene Züge: spürbar unangenehm, aber man verliert die
     * Partie nicht daran.
     *
     * Die Zahl steht auch im Beschreibungstext der Halluzination
     * (`SCHACH_VARIANTEN.PECH.vollesGlas`). Ein Test hält beide zusammen —
     * zwei Quellen für dieselbe Zahl laufen sonst auseinander.
     */
    GLAS_HALBZUEGE: 4,

    /* Wie lange das Enttarnen wirkt (seit v0.88). Die Zahl muss zum Text in
       `SCHACH_VARIANTEN.FAEHIGKEITEN.enttarnen` passen — ein Test hält beide
       zusammen, wie beim vollen Glas. */
    ENTTARNT_HALBZUEGE: 6,

    /* Wie lange das Verstecken wirkt (seit v0.98). ABSICHTLICH dieselbe Zahl
       wie beim Enttarnen: Die beiden sind ein Paar, in jeder Partie gibt es
       genau eine von ihnen, und zwei verschiedene Dauern wären ein Unterschied
       ohne Grund. Auch diese Zahl steht im Beschreibungstext
       (`SCHACH_VARIANTEN.FAEHIGKEITEN.verstecken`) — ein Test hält beide
       zusammen. */
    VERSTECKT_HALBZUEGE: 6,

    /*
     * Wie lange auf die Zustimmung des Teams gewartet wird (in Sekunden), je
     * nachdem wie oft jemand schon nicht mitgestimmt hat.
     *
     * Der Grund für die Staffelung: Ein Team mit zwei Leuten könnte sonst gar
     * nichts mehr tun, sobald einer aufhört mitzuspielen. Wer zweimal nicht
     * abstimmt, verkürzt die Frist — bis sie bei fünf Sekunden liegt, dann bei
     * drei. Sobald er wieder mitstimmt, fängt sie von vorn an.
     */
    FRIST_SEKUNDEN: [10, 5, 3],

    /* Nach so vielen versäumten Abstimmungen rutscht man eine Stufe tiefer. */
    FRIST_NACH_VERSAEUMNISSEN: 2,

    /*
     * Fassung der Fähigkeiten-Ablage. 1 hieß: vier feste Felder von Beginn an.
     * 2 heißt: Würfel erscheinen über die Partie verteilt. Partien ohne diese
     * Angabe stammen aus Fassung 1 und werden übernommen.
     */
    BONUS_FASSUNG: 2,

    /*
     * Die laufende App-Version, oder "" wenn keine da ist.
     *
     * `typeof` und nicht `globalThis.KONFIG`: Im Browser ist `KONFIG` ein
     * `const` auf oberster Ebene und liegt damit im globalen LEXIKALISCHEN
     * Bereich — als Eigenschaft von `globalThis` findet man es nicht. In den
     * Tests wird konfig.js gar nicht geladen; dann greift dieselbe Abfrage.
     */
    _appVersion() {
        return (typeof KONFIG !== "undefined" && KONFIG && KONFIG.APP_VERSION)
            ? String(KONFIG.APP_VERSION)
            : "";
    },

    leereRunde(zeitpunkt, varianteId, id, titel) {
        const variante = SCHACH_VARIANTEN.holen(varianteId);
        const wann = (zeitpunkt === undefined) ? 0 : zeitpunkt;

        const runde = {
            datenVersion: SCHACH_RUNDE.DATEN_VERSION,
            id: id || "",
            titel: titel || "",
            variante: variante.id,
            erstelltAm: wann,

            /*
             * MIT WELCHER APP-VERSION DIE PARTIE ANGELEGT WURDE (seit v0.77).
             *
             * Entstanden aus der Frage „laufende Matches sollen in der zu
             * Start verfügbaren Version bleiben — oder gibt es andere
             * Lösungen?" (18.08.). Die Antwort war: Für REGELN löst das der
             * additive Datenvertrag schon (jede neue Regel ist ein eigenes
             * Feld in `regeln`, und wer es nicht hat, rechnet wie vorher). Was
             * fehlte, war die Auskunft, WORAUF sich eine Meldung bezieht — die
             * Begründung steht in `ROADMAP.md`, Bündel O3.
             *
             * Der Stempel ändert nichts an der Rechnung; er wird nur
             * mitgeschrieben und angezeigt. Eine Partie von vor v0.77 hat ihn
             * nicht, dann bleibt er leer.
             */
            angelegtMit: SCHACH_RUNDE._appVersion(),

            /*
             * Wann die Partie wirklich losging (beide Seiten bereit) — seit
             * v3.3, für die Spieldauer im Spielerprofil. 0 heisst: noch nicht
             * gestartet, oder eine Partie von vorher. Dann tritt `erstelltAm`
             * an die Stelle; die Zahl ist dann grosszügiger, aber nie falsch
             * herum.
             */
            gestartetAm: 0,

            geaendertAm: wann,
            stand: SCHACH.neuerStand(variante.id),
            zugZaehler: 0,
            laeuft: false,
            ergebnis: "",
            teams: { weiss: [], schwarz: [] },
            bereit: { weiss: false, schwarz: false },

            /*
             * DIE ZWEITE BEREITSCHAFT (seit v0.62.0) — die Zusage zur
             * AUFSTELLUNG.
             *
             * Nutzer-Ansage 25.08.2026: „Sobald beide Seiten einen Spieler
             * haben und beide bereit sind, gehts ein Screen weiter, wo das
             * Spielfeld gezeigt wird … wenn beide nochmal auf Bereit klicken,
             * kommen sie ins Spiel."
             *
             * `bereit` heisst seither: Ich bin mit meiner SEITE einverstanden.
             * `aufstellungBereit` heisst: Ich bin auch mit dem BRETT
             * einverstanden. Erst wenn beide Seiten beides gesagt haben, geht
             * es los (`kannAnpfeifen`). Alte Partien haben das Feld nicht — sie
             * gelten als noch nicht aufstellungsbereit, was nur wartende
             * Runden betrifft: eine laufende trägt `laeuft` bereits.
             */
            aufstellungBereit: { weiss: false, schwarz: false },

            /*
             * WIE OFT JEDE SEITE IHRE ZUFALLSARMEE NEU GEWÜRFELT HAT (seit
             * v0.62.0). Die Zahl geht als Saat-Zusatz in die Ziehung
             * (`_wurfZusatz`) — bei 0 gar nicht, damit jede Partie von früher
             * genau dieselbe Aufstellung behält.
             *
             * Sie steht hier und nicht als fertige Aufstellung, weil das
             * Würfeln GERECHNET wird (eiserne Regel: kein `Math.random()` im
             * Modell). Ein Zähler im gemeinsamen Stand genügt, damit jedes
             * Gerät dasselbe Brett sieht.
             */
            armeeWurf: { weiss: 0, schwarz: 0 },

            /* Wer in diese Runde eingeladen ist (seit v0.13.0, Bündel A
               Schritt 7) — Kennungen aus der Spielerliste. Das Feld liegt
               IN der Partie, damit es keinen neuen Datenbank-Pfad und
               keinen zweiten Abgleich braucht (Entwurf, Abschnitt 3.3);
               alte Partien ohne das Feld gelten als „niemand eingeladen". */
            eingeladen: [],
            faehigkeiten: { weiss: [], schwarz: [] },
            bonusGesammelt: [],

            /* Die Würfel, die gerade auf dem Brett liegen: [{ feld, art }].
               Seit Fassung 2 erscheinen sie über die Partie verteilt, statt von
               Anfang an fest zu liegen. */
            bonus: [],
            bonusFassung: SCHACH_RUNDE.BONUS_FASSUNG,

            /*
             * Sekunden, die an dieser Partie gespielt wurde (seit v0.93).
             * Wird NIE angezeigt — sie ist allein die Grundlage der
             * Dauer-Schätzung unter den Spielart-Kacheln.
             */
            spielzeit: 0,

            /*
             * Bei welchem TAKT zuletzt ein Würfel einer Stufe erschienen ist:
             * { gruen: 12, … }. Daraus rechnet `_bonusNachziehen` die
             * Abklingzeit (seit v0.41, siehe SCHACH_VARIANTEN.stufenGewichte).
             * Eine Partie ohne dieses Feld verhält sich wie vorher — dann ist
             * für jede Stufe „lange her".
             */
            stufeZuletzt: {},

            /* Geschlagene Figuren je Farbe, für die Wiedergeburt. */
            verloren: { weiss: [], schwarz: [] },

            /*
             * Dasselbe noch einmal, aber MIT DEM ORT: [{ art, feld }] je Farbe,
             * das Jüngste hinten. Seit v3.3 für die Fähigkeit „Wiederbelebung",
             * die eine Figur genau dorthin zurückholt, wo sie fiel.
             *
             * Warum eine zweite Liste statt `verloren` umzubauen: `verloren`
             * wird an vier Stellen gelesen (Bilanz, Beutewert, Wiedergeburt,
             * Anzeige) und steht in jeder laufenden Partie. Eine Liste, deren
             * Elemente plötzlich Objekte statt Zeichen sind, hätte jede davon
             * angefasst — für einen Gewinn, den eine zusätzliche Liste genauso
             * bringt. Partien von vor v3.3 haben sie nicht; dann findet die
             * Wiederbelebung eben nichts, bis wieder etwas geschlagen wird.
             */
            gefallen: { weiss: [], schwarz: [] },

            /*
             * WELCHE UNGLÜCKE JEDE SEITE ABBEKOMMEN HAT (seit v0.82.0):
             * [{ art, zugZaehler }] je Farbe, das Jüngste hinten. Daraus baut
             * die Hand ihre Unglücks-Karten (Nutzer-Ansage 26.08.2026: die
             * Meldung wird eine Karte in der Hand dessen, der aufs Feld
             * gezogen ist).
             *
             * Warum nicht aus dem VERLAUF gelesen: Der wird gekürzt
             * (`_verlaufKuerzen`) — eine dauerhafte Karte wäre nach ein paar
             * Zügen wieder weg. Die Liste wächst je Partie um höchstens eine
             * Handvoll Einträge; was die Hand davon ZEIGT, beantwortet
             * `unglueckskartenVon` (zeitlich Begrenztes nur, solange es wirkt).
             */
            unglueckskarten: { weiss: [], schwarz: [] },

            /*
             * Was beim Anlegen eingestellt wurde. Die Vorgaben entsprechen dem
             * Verhalten von vorher, damit angefangene Partien sich nicht
             * ändern — sie haben diese Felder nicht und bekommen genau das,
             * was sie schon hatten.
             */
            regeln: {
                /* Erscheinen Würfel mit Fähigkeiten? Ohne Angabe entscheidet
                   die Spielart, wie bisher. */
                faehigkeiten: null,
                /* Zeigt der Würfel seine Seltenheit schon auf dem Brett? */
                seltenheitZeigen: true,

                /*
                 * Sieht man einem Würfel an, dass er ein UNGLÜCKSwürfel ist?
                 * (seit v0.49)
                 *
                 * Bis v0.48 war das eine eiserne Regel: Das umgedrehte
                 * Fragezeichen stand immer da. Seit v0.49 ist es ein Haken beim
                 * Anlegen — und er ist standardmässig AUS, wie alle Haken. Aus
                 * heisst: Der Unglückswürfel sieht aus wie ein guter, gleiche
                 * Farbe, Fragezeichen richtig herum. Man merkt es erst beim
                 * Einsammeln.
                 *
                 * Die Frage ist unabhängig von `seltenheitZeigen`: Die
                 * Seltenheit ist die FARBE, das Unglück ist das ZEICHEN. Wer
                 * beides koppelt (so war es bis v0.48), kann nicht „Farbe ja,
                 * Warnung nein" einstellen — genau das war der Wunsch.
                 */
                pechZeigen: false,

                /*
                 * WIE VIELE LOOTBOXEN ERSCHEINEN (seit v0.71): eine der vier
                 * Stufen wenig / normal / viele / regen. Was jede bedeutet,
                 * steht in `SCHACH_VARIANTEN.LOOTBOX_MENGEN`.
                 *
                 * Sie ersetzt die zwei Schalter darunter. Die bleiben stehen
                 * (additiver Datenvertrag) und werden beim Anlegen weiter
                 * mitgeschrieben — ein Gerät mit einer älteren Fassung im
                 * Zwischenspeicher spielt sonst nach ganz anderen Zahlen.
                 */
                lootboxMenge: "wenig",

                /*
                 * Glücksboxen-Regen (seit v0.50, abgelöst in v0.71): Je leerer
                 * das Brett, desto mehr Würfel erscheinen. Aus diesem Haken und
                 * der Stufe darunter wird `lootboxMenge` abgeleitet, wenn eine
                 * Partie sie noch nicht kennt.
                 */
                regen: false,

                /*
                 * Wie steil der Regen ansteigt: 1 bis 5 (seit v0.59, abgelöst
                 * in v0.71). 5 ist der Verlauf von v0.53 und die Vorgabe, 1
                 * lässt es lange fast gar nicht regnen und dann umso heftiger.
                 * Zahlen und Begründung in `SCHACH_VARIANTEN.REGEN.STUFEN`.
                 */
                regenStufe: 5,

                /*
                 * Zufallsarmee (seit v0.51 ein Haken, vorher eine eigene
                 * Spielart): Beide Seiten bekommen gewürfelt die halbe Armee,
                 * und selten sind zwei Könige darunter — zwei Leben.
                 */
                zufallsArmee: false,

                /*
                 * Nur mit `zufallsArmee`: Ziehen beide Seiten GETRENNT?
                 *
                 * Aus (Vorgabe) heisst: Es wird EINMAL gewürfelt, und beide
                 * Mannschaften bekommen dieselben Einheiten, spiegelbildlich
                 * aufgestellt — gewürfelt, aber gerecht. An heisst: Jede Seite
                 * zieht für sich, wie in v0.49 und v0.50.
                 */
                armeeUnterschiedlich: false,

                /*
                 * WIRD DIE SEITE ZUFÄLLIG ZUGETEILT? (seit v0.66.0)
                 *
                 * Nutzer-Ansage 25.08.2026: „Der erste Screen soll an einem
                 * Grundeinstellungs-Haken hängen, ob er erscheint oder nicht.
                 * Der Haken soll aussagen, ob es zufällig entschieden wird,
                 * in welches Team man kommt, oder halt die Auswahl.
                 * Standardmässig soll zufällig sein, und somit fällt der
                 * erste Screen komplett raus."
                 *
                 * AN (die Vorgabe): Wer die Runde betritt, wird einer freien
                 * Seite zugelost und gilt damit als bereit — der
                 * Seitenwahl-Bildschirm entfällt, man steht sofort vor dem
                 * Brett. AUS: Man sucht sich seine Seite aus wie seit v0.61.0.
                 *
                 * ALTE PARTIEN GELTEN ALS AUS (`=== true` beim
                 * Normalisieren): Eine Runde, die vor v0.66.0 angelegt wurde,
                 * behält genau das Verhalten, mit dem sie angelegt wurde.
                 */
                seiteZufaellig: true,

                /*
                 * WIE VIELE FIGUREN die Zufallsarmee bekommt (seit v0.86,
                 * Wunsch V1). Eine der vier Stufen aus
                 * `SCHACH_VARIANTEN.ARMEE_STAERKEN`; „normal" ist die Zahl,
                 * die vor v0.86 galt — eine Partie von früher spielt also
                 * unverändert weiter.
                 */
                armeeStaerke: "normal",

                /*
                 * SCHNEIDET DIE STÄRKE AUCH DIE FESTE AUFSTELLUNG ZU?
                 * (seit v0.100, Muster von `bonusFassung`.)
                 *
                 * 1 heisst ja. Fehlt der Eintrag, stammt die Partie aus der
                 * Zeit vor v0.100 und wird nicht angefasst.
                 *
                 * WARUM ES DIESE FASSUNG BRAUCHT und die Stufe allein nicht
                 * genügt: „Kein Eintrag" müsste für zwei Fälle gleichzeitig
                 * das Richtige tun, und sie widersprechen sich.
                 *
                 *   Partie von früher MIT fester Aufstellung — sie stand voll
                 *   auf dem Brett. „normal" würde ihr beim Neu aufstellen die
                 *   halbe Armee wegnehmen.
                 *
                 *   Partie von früher MIT Zufallsarmee — sie bekam die halbe
                 *   Armee. „voll" würde ihr die doppelte geben.
                 *
                 * Eine einzige Vorgabe kann das nicht leisten. Die Fassung
                 * trennt deshalb die FRAGE („gilt die neue Rechnung?") von der
                 * ANTWORT („welche Stufe?") — dann bleibt „normal" für beide
                 * Altfälle richtig.
                 */
                armeeFassung: 0,

                /*
                 * WELCHE ITEMS es in dieser Partie gibt (seit v0.87, R5/V3).
                 * `itemVorrat` ist die Einstellung („alle" ist die Vorgabe und
                 * das Spiel wie vorher), `itemPool` die beim Anlegen einmal
                 * ausgeloste Liste. Leere Liste heisst: alles ist dabei.
                 */
                itemVorrat: "alle",
                itemPool: [],

                /* Die selbst angehakte Liste (seit v0.100) — nur bei
                   `itemVorrat: "auswahl"` von Bedeutung. */
                itemAuswahl: [],

                /* Muss sich das Team über einen Zug einig werden? */
                einigkeit: false,

                /*
                 * AUF WELCHER STUFE SPIELT DER COMPUTER? (seit v0.28.0)
                 *
                 * Leer heisst: keine Angabe. Was daraus wird, entscheidet
                 * ALLEIN `SCHACH_BOT.stufeVon` — hier steht bewusst keine
                 * Liste gültiger Stufen und kein Rückfall.
                 *
                 * WARUM DIE PRÜFUNG NICHT HIER STEHT: `schach-bot.js` lädt
                 * NACH dieser Datei (es rechnet mit SCHACH und SCHACH_RUNDE).
                 * Würde `normalisieren` die Stufen-Tabelle des Bots
                 * abfragen, hinge die untere Schicht an der oberen, und
                 * jeder Test, der nur die Runde lädt, bräuchte plötzlich den
                 * Bot dazu. Der Datenvertrag trägt deshalb nur den Text; die
                 * Bedeutung gehört dem, der sie kennt.
                 *
                 * Ob überhaupt ein Computer mitspielt, steht NICHT hier,
                 * sondern in den Teams (Kennung `bot`) — eine Aussage, eine
                 * Quelle.
                 */
                botStufe: ""
            },

            /*
             * ALTBESTAND (bis v0.82.0): der EINE Vorschlag mit Stimmen-Liste
             * („Einverstanden"-Knopf). Seit v0.83.0 stimmt das Team ab, indem
             * jeder denselben Zug selbst macht (`vorschlaege`, Nutzer-Ansage
             * 26.08.2026). Das Feld bleibt im Datenvertrag und wird
             * durchgereicht, ausgewertet wird es nirgends mehr — wie `phase`
             * im Würfel Quizz.
             */
            vorschlag: null,

            /*
             * Die Zug-Vorschläge der Abstimmung (seit v0.83.0, nur bei
             * `einigkeit`): je Spieler-Kennung höchstens EINER — sein letzter.
             * Ausgeführt wird, sobald alle aus dem Team am Zug DENSELBEN
             * vorgeschlagen haben (oder die Frist die Säumigen übergeht):
             *
             *   { "<spielerId>": { art: "zug", von, nach, umwandlung,
             *     name, zugZaehler, wann, frist },
             *     "<andereId>": { art: "faehigkeit", faehigkeit, zielFeld,
             *     wahl, … } }
             */
            vorschlaege: {},

            /*
             * Wie oft jemand eine Abstimmung hat verstreichen lassen. Daraus
             * folgt die Frist beim nächsten Mal — siehe FRIST_SEKUNDEN.
             */
            versaeumt: {},

            verlauf: []
        };

        /*
         * Die Zufallsarmee hat keine feste Aufstellung — sie wird gerechnet,
         * aus der Partie-Kennung. Hier greift nur die alte SPIELART; der HAKEN
         * steht erst nach `SCHACH_TAFEL.partieAnlegen` fest, das ruft
         * `armeeAufstellen` deshalb noch einmal (seit v0.51).
         */
        return SCHACH_RUNDE.armeeAufstellen(SCHACH_RUNDE.kreuzAufstellen(runde));
    },

    /*
     * Stellt die Zufallsarmee auf, wenn diese Partie sie hat. Sonst bleibt die
     * Runde, wie sie ist. Aufgerufen wird das an drei Stellen — beim Anlegen
     * einer leeren Runde, nach dem Setzen der Regeln und bei einer neuen Partie
     * in derselben Runde.
     *
     * `saatZusatz` unterscheidet die zweite Partie von der ersten; ohne ihn
     * käme dieselbe Aufstellung noch einmal. Zweimal mit demselben Zusatz
     * gerufen ergibt dasselbe Brett — das Rechnen ist absichtlich wiederholbar.
     */
    armeeAufstellen(runde, saatZusatz) {
        /*
         * HIER NICHT `armeeAn` FRAGEN. Die Frage normalisiert, und
         * `normalisieren` baut sich eine leere Runde — die wiederum hier
         * landet. Das wäre eine Endlosschleife. An dieser Stelle liegt die
         * Runde ohnehin schon vollständig vor, also wird direkt gelesen.
         */
        const gehoertDazu = (runde.regeln && runde.regeln.zufallsArmee === true)
            || !!SCHACH_VARIANTEN.holen(runde.variante).zufallsArmee;

        if (!gehoertDazu) {
            return runde;
        }

        runde.stand = SCHACH_RUNDE._armeeStand(
            runde.stand,
            (runde.id || "partie") + (saatZusatz || ""),
            runde.regeln.armeeUnterschiedlich === true,
            runde.regeln.armeeStaerke,
            runde.armeeWurf);

        return runde;
    },

    /*
     * DAS KREUZ-BRETT HERRICHTEN (seit v0.63, Wunsch #22).
     *
     * Zwei Dinge, die keine Zeichenkette ausdrücken kann:
     *
     *   1. DIE TOTEN ECKEN. Vier 2-mal-2-Blöcke gehören nicht zum Brett. Sie
     *      werden als RISSE in den Stand geschrieben — dieselbe Sperre, die
     *      das Erdbeben seit v0.54 erzeugt. Damit gilt sie überall, ohne dass
     *      irgendeine Regel etwas von „Kreuz" wissen muss: `SCHACH.gesperrt`
     *      beantwortet die Frage seit jeher an einer Stelle.
     *
     *   2. WER WELCHEN FLÜGEL BEKOMMT. Gewürfelt wird es nicht — gerechnet,
     *      aus der Partie-Kennung (eiserne Regel: `Math.random()` hat im
     *      Modell nichts zu suchen). Jedes Gerät kommt damit auf dasselbe
     *      Brett, und ein Test kann es nachrechnen.
     *
     * WARUM NUR DIE FLÜGEL GETAUSCHT WERDEN und nicht auch oben und unten:
     * Ein Bauer zieht in Richtung seiner FARBE. Stünde Weiss oben, marschierten
     * seine Bauern vom Gegner weg. Front und Farbe hängen also zusammen; frei
     * ist allein die Frage, wer links und wer rechts steht. Steht sie im
     * Kommentar der Spielart ebenfalls (`SCHACH_VARIANTEN.KREUZ`).
     *
     * Der Aufruf steht neben `armeeAufstellen` und läuft VOR ihm: Ist der
     * Haken Zufallsarmee gesetzt, würfelt sie die Figuren anschliessend neu —
     * auf denselben Feldern, und die Risse bleiben stehen.
     */
    kreuzAufstellen(runde, saatZusatz) {
        const variante = SCHACH_VARIANTEN.holen(runde.variante);

        if (!variante.kreuz) {
            return runde;
        }

        const kante = variante.breite;
        const rand = SCHACH_VARIANTEN.KREUZ.rand;
        const mitte = kante - 2 * rand;
        const saat = (runde.id || "partie") + (saatZusatz || "") + "|kreuz|seiten";

        /*
         * WER BEKOMMT WELCHES PAAR? Die Teams stehen sich gegenüber: ein Team
         * oben und unten, das andere links und rechts. Gewürfelt wird nicht —
         * gerechnet, aus der Partie-Kennung (eiserne Regel: `Math.random()`
         * hat im Modell nichts zu suchen). Jedes Gerät kommt damit auf
         * dasselbe Brett, und ein Test kann es nachrechnen.
         *
         * Die Kennung steht VORNE in der Saat, siehe die Regel zu
         * `_zufallsWert`.
         */
        const senkrechtIstWeiss = SCHACH_RUNDE._zufallsWert(saat) < 0.5;

        /* Die Teams stehen sich GEGENÜBER: ein PAAR je Team, nicht eine Seite.
           Wer senkrecht steht, bekommt oben und unten; das andere Team die
           beiden Flügel. */
        let weisseSeiten = senkrechtIstWeiss
            ? ["oben", "unten"]
            : ["links", "rechts"];

        let schwarzeSeiten = senkrechtIstWeiss
            ? ["links", "rechts"]
            : ["oben", "unten"];

        /*
         * NUR EINE ARMEE JE TEAM (seit v0.72, Wunsch K3).
         *
         * Dann wird nicht das Paar gezogen, sondern die eine STARTSEITE von
         * Weiss; Schwarz bekommt die gegenüberliegende, damit die Teams sich
         * ansehen. Die beiden übrigen Streifen bleiben leer und sind der
         * Umweg, der diese Bretter von einem gewöhnlichen unterscheidet.
         *
         * Gezogen wird auch hier gerechnet, aus derselben Saat mit anderem
         * Zusatz — die Kennung steht vorne (Regel zu `_zufallsWert`).
         */
        if (variante.kreuzEinzeln) {
            const seiten = SCHACH_VARIANTEN.KREUZ.seiten;
            const stelle = Math.floor(
                SCHACH_RUNDE._zufallsWert(saat + "|einzeln") * seiten.length);

            const startWeiss = seiten[Math.min(stelle, seiten.length - 1)];

            weisseSeiten = [startWeiss];
            schwarzeSeiten = [SCHACH.SEITEN[startWeiss].gegen];
        }

        const zeichen = [];
        for (let feld = 0; feld < kante * kante; feld++) {
            zeichen.push(".");
        }

        /*
         * VIER VOLLE ARMEEN (seit v0.65). Jede der vier Seiten bekommt
         * Grundreihe plus Bauernreihe — beim 12er-Kreuz je 16 Einheiten.
         * Jeder Bauer merkt sich dabei, von WELCHER Seite er kommt; daran
         * hängt, wohin er läuft (`SCHACH.bauernSeite`).
         */
        const bauernSeiten = [];

        for (const eintrag of SCHACH_VARIANTEN.kreuzFelder(mitte)) {
            const istWeiss = (weisseSeiten.indexOf(eintrag.seite) !== -1);
            const istSchwarz = (schwarzeSeiten.indexOf(eintrag.seite) !== -1);

            /* Mit nur einer Armee je Team gehören zwei Seiten niemandem —
               sie bleiben leer. */
            if (!istWeiss && !istSchwarz) {
                continue;
            }

            zeichen[eintrag.feld] = istWeiss
                ? eintrag.figur
                : eintrag.figur.toLowerCase();

            if (eintrag.istBauer) {
                bauernSeiten.push({ feld: eintrag.feld, seite: eintrag.seite });
            }
        }

        /*
         * ZWEI ARMEEN JE TEAM HEISST ZWEI KÖNIGE JE TEAM — und damit zwei
         * Leben, dieselbe Regel wie bei der Zufallsarmee und beim Doppelbrett.
         * Den ersten König schlägt der Gegner wie jede Figur, beim letzten
         * gelten wieder Schach und Matt. Ohne diesen Schalter wäre Schachmatt
         * mit zwei Königen gar nicht eindeutig (eiserne Regel).
         *
         * Mit nur EINER Armee je Team (seit v0.72) gibt es auch nur einen
         * König je Team — dann gelten Schach und Matt von Anfang an, und der
         * Schalter bleibt aus.
         */
        runde.stand = Object.assign({}, runde.stand, {
            brett: zeichen.join(""),
            bauernSeiten: bauernSeiten,
            koenigeAlsLeben: !variante.kreuzEinzeln,
            risse: SCHACH_VARIANTEN.kreuzEcken(variante),

            /*
             * WELCHE SEITEN WEM GEHÖREN, WIRD FESTGEHALTEN (seit v0.72).
             *
             * Der Bildschirm dreht die Ansicht danach (K4). Er könnte es aus
             * den Bauern ablesen — aber nur, solange welche stehen, und die
             * Ansicht darf sich nicht drehen, weil der letzte Bauer gefallen
             * ist. Hier ist der eine Ort, an dem die Antwort entsteht.
             */
            startSeiten: {
                weiss: weisseSeiten.slice(),
                schwarz: schwarzeSeiten.slice()
            }
        });

        return runde;
    },

    /* ---------------------------------------------------------------- *
     * Die Zufallsarmee (seit v0.49)
     *
     * Die Zahlen stehen in `SCHACH_VARIANTEN.ARMEE`; hier steht, wie daraus
     * ein Brett wird. Gerechnet, nicht gewürfelt — dieselbe eiserne Regel wie
     * bei den Würfeln: `Math.random()` hat im Modell nichts zu suchen. Aus der
     * Partie-Kennung rechnet jedes Gerät dasselbe Brett aus, und der Test kann
     * es nachrechnen.
     * ---------------------------------------------------------------- */

    /*
     * Gilt in dieser Partie die Zufallsarmee? (seit v0.51)
     *
     * Zwei Quellen: der HAKEN der Partie (der neue Weg, gilt für jede Spielart)
     * und die alte Spielart „Zufallsarmee", die für laufende Partien im Katalog
     * bleibt. Gefragt wird an dieser einen Stelle, damit nicht an drei Orten
     * dieselbe Oder-Verknüpfung steht.
     */
    armeeAn(runde) {
        const stand = SCHACH_RUNDE.normalisieren(runde);
        return stand.regeln.zufallsArmee === true
            || !!SCHACH_RUNDE.varianteVon(stand).zufallsArmee;
    },

    /*
     * Die Felder, auf denen eine Seite aufgestellt wird — äussere Reihe zuerst,
     * dort landen die zuerst gezogenen Figuren.
     *
     * WO DER BLOCK LIEGT, RECHNET DIE SPIELART (`armeeFelderBlock`, seit
     * v0.104). Diese Funktion übersetzt nur die FARBE in eine Seite: Weiss
     * steht unten, Schwarz oben. Bis v0.103 rechnete sie die zwei Reihen selbst
     * — seit die Stufen unterschiedlich TIEF stehen, gäbe das eine zweite
     * Wahrheit neben der Spielart.
     */
    _armeeFelder(variante, farbe, staerke) {
        const seite = (farbe === SCHACH.WEISS) ? "unten" : "oben";

        return SCHACH_VARIANTEN.armeeFelderBlock(variante, seite, staerke)
            .map((eintrag) => eintrag.feld);
    },

    /*
     * DIESELBE FRAGE FÜR EINE KREUZ-SEITE (seit v0.76).
     *
     * Auf dem Kreuz steht eine Armee nicht unten oder oben, sondern auf EINEM
     * der vier Streifen — und ein Team kann zwei davon haben. Deshalb fragt
     * diese Funktion nach der SEITE, nicht nach der Farbe; wer welche Seite
     * bekommt, steht seit v0.72 als `startSeiten` im Stand.
     *
     * Gerechnet wird sie seit v0.104 an derselben Stelle wie jede andere
     * Aufstellung — die Kippung um eine Vierteldrehung steckt dort.
     */
    _armeeFelderKreuz(variante, seite, staerke) {
        return SCHACH_VARIANTEN.armeeFelderBlock(variante, seite, staerke)
            .map((eintrag) => eintrag.feld);
    },

    /*
     * Die Figuren einer Seite, als Liste von Arten in Grossbuchstaben.
     *
     * Erst der König (selten zwei), dann wird aufgefüllt, dann gemischt — das
     * Mischen ist wichtig: Ohne es stünde der König immer auf demselben Feld,
     * und die Bauern immer vorne.
     */
    /*
     * DIE ZÄHLENDE STELLE GEHÖRT AN DEN ANFANG DER SAAT (seit v0.49.1).
     *
     * `_zufallsWert` ist FNV-1a: Jedes Zeichen wird verodert und dann mit einer
     * Primzahl multipliziert. Ein Unterschied im LETZTEN Zeichen erlebt danach
     * genau eine Multiplikation — er verschiebt das Ergebnis um rund 0,4
     * Prozent und sonst nichts. Zwei Saaten, die sich nur in der letzten Ziffer
     * unterscheiden, liefern damit praktisch DENSELBEN Wert.
     *
     * Genau das ist beim Bau von v0.49 passiert: Die sieben Ziehungen einer
     * Seite hiessen `…|figur|1` bis `…|figur|7` und lagen alle innerhalb von
     * zwei Prozent. Jede Seite bekam siebenmal fast dieselbe Figur — sieben
     * Springer, sieben Türme —, und der Zufall der Spielart war keiner.
     *
     * Steht die Zahl vorne, laufen alle übrigen Zeichen als Mischschritte
     * hinterher, und die Werte streuen wie erwartet. Wer hier eine weitere
     * gezählte Ziehung ergänzt, hält sich daran.
     */
    _armeeSaat(stelle, was, basis) {
        return stelle + "|" + was + "|" + basis;
    },

    _armeeFiguren(id, farbe, variante, getrennt, seite, staerke, hoechstens) {
        const regel = SCHACH_VARIANTEN.ARMEE;

        /*
         * `staerke` und `hoechstens` sind wahlfrei (seit v0.86); ohne Angabe
         * liefert der Aufruf die Zahl von früher.
         *
         * `hoechstens` ist die Zahl der STARTFELDER, und sie deckelt die Liste
         * HIER — nicht erst beim Aufstellen. Der Grund ist der Mischschritt
         * unten: Eine fertige, gemischte Liste hinterher abzuschneiden trifft
         * irgendwann den König, und eine Seite ohne König ist keine Partie.
         * Vor v0.86 fiel das nicht auf, weil die Grundzahl nie über die
         * Feldzahl hinausging; mit der Stufe „viel" tut sie es.
         */
        const gewuenscht = SCHACH_VARIANTEN.armeeAnzahl(variante, staerke);
        const anzahl = (typeof hoechstens === "number" && hoechstens > 0)
            ? Math.max(2, Math.min(gewuenscht, hoechstens))
            : gewuenscht;

        /*
         * DIESELBE ARMEE FÜR BEIDE, WENN NICHT ANDERS GEWÜNSCHT (seit v0.51).
         *
         * Steckt die Farbe in der Saat, zieht jede Seite für sich — dann kann
         * eine zwei Damen bekommen und die andere sieben Bauern. Ohne die Farbe
         * fällt für beide dieselbe Ziehung, und weil `_armeeFelder` die Felder
         * spiegelbildlich liefert, steht am Ende eine symmetrische Stellung:
         * gewürfelt, aber gerecht. Das ist die Vorgabe; wer die Schieflage
         * will, hakt „Beide Seiten getrennt würfeln" an.
         *
         * AUF DEM KREUZ ZÄHLT DAZU DIE STARTSEITE (seit v0.76) — ein Team hat
         * dort bis zu zwei Armeen. Auch sie steht nur in der Saat, wenn
         * getrennt gewürfelt wird; sonst bekommen alle vier Streifen dieselben
         * Einheiten, und das Brett ist von jeder Seite aus dasselbe.
         *
         * DIE SEITE STEHT GANZ VORNE (Regel zu `_zufallsWert`): „oben" und
         * „unten" unterscheiden sich am Ende einer Saat zu wenig.
         */
        const basis = ((getrennt && seite) ? (seite + "|") : "")
            + (id || "partie") + "|armee" + (getrennt ? "|" + farbe : "");

        const zweiKoenige = (SCHACH_RUNDE._zufallsWert(basis + "|koenige") * 100)
            < regel.zweiKoenige;

        const arten = zweiKoenige ? ["K", "K"] : ["K"];
        let damen = 0;

        while (arten.length < anzahl) {
            let art = SCHACH_VARIANTEN.armeeFigurZiehen(SCHACH_RUNDE._zufallsWert(
                SCHACH_RUNDE._armeeSaat(arten.length, "figur", basis)));

            /* Über die Höchstzahl hinaus gezogene Damen werden Türme. */
            if (art === "D" && damen >= regel.hoechstensDamen) {
                art = "T";
            }
            if (art === "D") {
                damen++;
            }

            arten.push(art);
        }

        /* Mischen nach Fisher-Yates, mit gerechneten Werten. */
        for (let stelle = arten.length - 1; stelle > 0; stelle--) {
            const ziel = Math.floor(SCHACH_RUNDE._zufallsWert(
                SCHACH_RUNDE._armeeSaat(stelle, "mischen", basis)) * (stelle + 1));
            const merken = arten[stelle];
            arten[stelle] = arten[ziel];
            arten[ziel] = merken;
        }

        /*
         * AB DREI REIHEN STEHEN DIE BAUERN VORN (seit v0.104).
         *
         * NACHGEMESSEN, NICHT VERMUTET: Ohne diese Zeilen stand bei „voll" je
         * nach Brett jede fünfte bis dritte Seite schon beim Anpfiff fest —
         * kein einziger gültiger Zug —, und bis zu 36 Prozent der Seiten
         * standen im Schach. Der Grund liegt an der Tiefe: Ab drei Reihen
         * berühren sich die Armeen, und ein gemischter Block sperrt sich
         * selbst ein. Türme und Läufer stehen dann vor der eigenen Mauer, die
         * Bauern dahinter, und der König steht mitten in der Front.
         *
         * Gemischt wird trotzdem — nur eben INNERHALB der beiden Gruppen. WELCHE
         * Figuren eine Seite bekommt, bleibt vollständig gewürfelt; WO sie
         * stehen, folgt ab dieser Tiefe der gewohnten Ordnung: Offiziere
         * hinten, Bauern vorn. Damit steht auch der König wieder in der
         * äussersten Reihe, wo er hingehört.
         *
         * BIS ZWEI REIHEN BLEIBT ALLES, WIE ES WAR. Dort ist der Block frei
         * genug, und dass ein Bauer auch mal ganz hinten steht, ist seit v0.49
         * gewollt (er behält dort seinen Doppelschritt, siehe v0.52).
         */
        if (SCHACH_VARIANTEN.armeeTiefe(variante, staerke) > 2) {
            return arten.filter((art) => art !== "B")
                .concat(arten.filter((art) => art === "B"));
        }

        return arten;
    },

    /*
     * DIE FESTE AUFSTELLUNG AUF DEN REGLER BRINGEN (seit v0.100).
     *
     * NUTZER-ENTSCHEIDUNG 20.08.2026: „Zufallsarmee hat keine Auswirkung mehr
     * auf die Grösse der Armee, nur der Regler hat es." Bis v0.99 tat der
     * Regler ausschliesslich etwas, wenn der Haken „Zufallsarmee" gesetzt war
     * — und der Haken änderte die Figurenzahl gleich mit. Beides gehörte nicht
     * zusammen: Der Haken entscheidet, WELCHE Figuren stehen, der Regler, WIE
     * VIELE.
     *
     * Gerechnet wird mit demselben Feld-Block, den auch die Zufallsarmee
     * benutzt (`SCHACH_VARIANTEN.armeeFelderBlock`) — dieselbe Rechnung,
     * dasselbe Ergebnis. Was ausserhalb steht, fällt weg.
     *
     * KÖNIGE BLEIBEN IMMER STEHEN, auch ausserhalb des Blocks. Sonst könnte
     * eine Spielart, die ihren König nicht in die Mitte stellt, ihn beim
     * Anpassen verlieren — und eine Partie ohne König ist keine. Die eiserne
     * Regel „König und Matt bleiben unangetastet" gilt hier genauso.
     *
     * MIT HAKEN passiert hier nichts: `_armeeStand` baut den Block ohnehin
     * selbst, und zwar aus derselben Funktion.
     *
     * SEIT v0.104 NIMMT SIE NICHT NUR WEG, SIE FÜLLT AUCH AUF — deshalb heisst
     * sie seit dieser Fassung `aufstellungAnpassen` und nicht mehr
     * `aufstellungZuschneiden`. Die Stufen „viel" und „voll" stehen tiefer als
     * die Spielart Figuren mitbringt: Was die Vorlage nicht hergibt, entsteht
     * hier (siehe `_aufstellungArt`).
     *
     * WICHTIG FÜR AUFRUFER: Sie darf nur auf ein FRISCHES Brett laufen, nie
     * zweimal nacheinander mit verschiedenen Stärken — der zweite Aufruf
     * rechnete sonst auf dem Ergebnis des ersten. Aufgerufen wird sie an den
     * drei Stellen, an denen ein Brett neu entsteht und die Regeln feststehen:
     * `partieAnlegen`, `neuAufstellen` und die Vorschau der Kachel.
     */
    aufstellungAnpassen(runde) {
        const regeln = runde.regeln || {};

        /* Eine Partie von vor v0.100 wird nicht angefasst — siehe
           `armeeFassung` bei den Regel-Vorgaben. */
        if (regeln.armeeFassung !== 1) {
            return runde;
        }
        if (regeln.zufallsArmee === true) {
            return runde;
        }

        const variante = SCHACH_VARIANTEN.holen(runde.variante);
        const staerke = regeln.armeeStaerke;
        const zeichen = runde.stand.brett.split("");
        const gesetzt = {};
        const bauernSeiten = [];

        for (const farbe of [SCHACH.WEISS, SCHACH.SCHWARZ]) {
            const seiten = variante.kreuz
                ? SCHACH.startSeitenVon(runde.stand, farbe)
                : [(farbe === SCHACH.WEISS) ? "unten" : "oben"];

            for (const seite of seiten) {
                const block = SCHACH_VARIANTEN.armeeFelderBlock(
                    variante, seite, staerke);

                /*
                 * ZWEI DINGE VORAB, BEIDE AUS DEM BLOCK SELBST: wie tief er
                 * reicht (danach entscheidet sich, ob Reihe 1 Bauern oder
                 * Offiziere trägt) und was in der Grundreihe steht (daraus
                 * wird die Offiziersreihe abgeleitet).
                 */
                let tiefste = 0;
                const grundreihe = {};

                for (const eintrag of block) {
                    tiefste = Math.max(tiefste, eintrag.tiefe);

                    if (eintrag.tiefe === 0) {
                        grundreihe[SCHACH_RUNDE._querVon(variante, seite, eintrag.feld)]
                            = zeichen[eintrag.feld];
                    }
                }

                for (const eintrag of block) {
                    const quer = SCHACH_RUNDE._querVon(variante, seite, eintrag.feld);
                    const art = SCHACH_RUNDE._aufstellungArt(eintrag.tiefe, tiefste,
                        zeichen[eintrag.feld], grundreihe[quer]);

                    gesetzt[eintrag.feld] = (farbe === SCHACH.WEISS)
                        ? art : art.toLowerCase();

                    /*
                     * JEDER BAUER AUF DEM KREUZ MERKT SICH SEINE SEITE — sonst
                     * fällt er auf die Farbregel zurück und läuft auf dem
                     * Flügel quer (dieselbe Falle wie in `_armeeStandKreuz`).
                     */
                    if (art === "B" && variante.kreuz) {
                        bauernSeiten.push({ feld: eintrag.feld, seite: seite });
                    }
                }
            }
        }

        for (let feld = 0; feld < zeichen.length; feld++) {
            if (Object.prototype.hasOwnProperty.call(gesetzt, feld)) {
                zeichen[feld] = gesetzt[feld];
                continue;
            }

            /* Ausserhalb jedes Blocks bleibt nur der König stehen — eine
               Spielart, die ihn nicht mittig aufstellt, verlöre ihn sonst. */
            if (zeichen[feld] !== "." && SCHACH.artVon(zeichen[feld]) !== "K") {
                zeichen[feld] = ".";
            }
        }

        const stand = Object.assign({}, runde.stand, { brett: zeichen.join("") });

        if (variante.kreuz) {
            stand.bauernSeiten = bauernSeiten;
        }

        runde.stand = stand;
        return runde;
    },

    /* Die Quer-Koordinate eines Feldes aus Sicht einer Seite: die Spalte, wenn
       man von oben oder unten schaut, sonst die Reihe. */
    _querVon(variante, seite, feld) {
        return (seite === "oben" || seite === "unten")
            ? (feld % variante.breite)
            : Math.floor(feld / variante.breite);
    },

    /*
     * WAS AUF EINEM FELD DES BLOCKS STEHT (seit v0.104).
     *
     * Drei Reihen-Rollen, von aussen nach innen — genau so hat der Nutzer die
     * Stufe „viel" beschrieben („die Bauern eine vor, dazwischen eine Reihe
     * mit Pferden und so"):
     *
     *     Tiefe 0            die Grundreihe der Spielart, unverändert
     *     Tiefe 1, 2 tief    Bauern (die gewohnte Aufstellung)
     *     Tiefe 1, tiefer    die Offiziersreihe
     *     Tiefe 2 und mehr   Bauern
     *
     * DIE OFFIZIERSREIHE IST DIE GRUNDREIHE OHNE KRONE: Was in derselben
     * Spalte hinten steht, steht auch hier — nur König und Dame werden zum
     * Springer. So sieht jede Spielart in der zweiten Reihe aus wie in ihrer
     * ersten (das kleine Brett ohne Läufer bekommt also auch hier keine), und
     * es entsteht nie ein zweiter König.
     */
    _aufstellungArt(tiefe, tiefste, vorhanden, grundFigur) {
        if (tiefe === 0) {
            /* Steht dort nichts, füllt ein Springer — keine der heutigen
               Spielarten hat eine Lücke in der Grundreihe, aber „voll" soll
               wörtlich voll heissen. */
            return SCHACH.artVon(vorhanden) || "S";
        }

        if (tiefe === 1 && tiefste >= 2) {
            const art = SCHACH.artVon(grundFigur);
            return (art === "" || art === "K" || art === "D") ? "S" : art;
        }

        return "B";
    },

    /*
     * DER SAAT-ZUSATZ EINER SEITE (seit v0.62.0).
     *
     * Wie oft diese Seite ihre Armee schon neu gewürfelt hat, geht in die
     * Ziehung ein — dadurch ändert sich beim Neu-Würfeln GENAU die Seite, die
     * gedrückt hat, und die andere behält ihre Figuren.
     *
     * ZWEI FESTE PUNKTE, die nicht aufgeweicht werden dürfen:
     *
     *   - **Bei 0 kommt NICHTS dazu.** Jede Partie, die vor v0.62.0 angelegt
     *     wurde, muss exakt dieselbe Aufstellung behalten; ein Zusatz „|wurf0"
     *     würde jede einzelne davon umwürfeln.
     *   - **Ohne getrennte Armeen zählt nur Weiss.** Beide Seiten bekommen
     *     dieselbe Armee (Schwarz gespiegelt, v0.60.0) — sie MÜSSEN also
     *     dieselbe Saat sehen, sonst liefe die Spiegelung auseinander. Beim
     *     Neu-Würfeln werden dort ohnehin beide Zähler zugleich erhöht.
     */
    _wurfZusatz(wurf, farbe, getrennt) {
        if (!wurf) {
            return "";
        }
        const zahl = getrennt ? wurf[farbe] : wurf.weiss;
        return (typeof zahl === "number" && zahl > 0) ? ("|wurf" + zahl) : "";
    },

    /* Ein Brett-Stand mit gewürfelten Armeen auf beiden Seiten. */
    _armeeStand(stand, id, getrennt, staerke, wurf) {
        const variante = SCHACH.varianteVon(stand);
        const breite = SCHACH.breiteVon(stand);
        const hoehe = SCHACH.hoeheVon(stand);

        if (variante.kreuz) {
            return SCHACH_RUNDE._armeeStandKreuz(stand, id, getrennt, staerke, wurf);
        }

        const zeichen = [];
        for (let feld = 0; feld < breite * hoehe; feld++) {
            zeichen.push(".");
        }

        if (!getrennt) {
            /*
             * BEIDE SEITEN DIESELBE ARMEE, SCHWARZ SPIEGELVERKEHRT (seit
             * v0.60.0).
             *
             * Nutzer-Ansage 25.08.2026: „Zufallsarmee, wenn beide dieselbe
             * haben, soll die schwarze Armee spiegelverkehrt aufgebaut werden
             * wie die weisse." Bis dahin bekam Schwarz dieselbe Figurenfolge
             * auf dieselben SPALTEN (Turm auf a-Linie hüben wie drüben) — eine
             * Verschiebung, keine Spiegelung. Weil sich das Brett zur eigenen
             * Seite dreht (`_drehungVon`), sahen die zwei Spieler dadurch
             * LINKS-RECHTS vertauschte Aufstellungen.
             *
             * Jetzt landet jede schwarze Figur auf dem um 180 Grad gedrehten
             * Feld der weissen (`gesamt - 1 - feld`) — dieselbe Figur,
             * punktgespiegelt. Damit sieht jeder Spieler von SEINER Seite
             * dieselbe Aufstellung, wie im echten Schach. Das gilt für jede
             * rechteckige Breite und jede Armeestärke, weil die Drehung
             * feldweise rechnet; ein `arten.reverse()` wäre ab der zweiten
             * Reihe falsch. Das Kreuz hat seinen eigenen Weg
             * (`_armeeStandKreuz`) und ist hier nicht berührt.
             *
             * Die Figurenfolge wird EINMAL für Weiss gewürfelt und gespiegelt;
             * bei `getrennt === false` ignoriert `_armeeFiguren` die Farbe
             * ohnehin, beide bekämen dieselbe Saat.
             */
            const gesamt = breite * hoehe;
            const felder = SCHACH_RUNDE._armeeFelder(variante, SCHACH.WEISS, staerke);
            const arten = SCHACH_RUNDE._armeeFiguren(
                id + SCHACH_RUNDE._wurfZusatz(wurf, SCHACH.WEISS, getrennt),
                SCHACH.WEISS, variante, getrennt, undefined, staerke, felder.length);
            const anzahl = Math.min(felder.length, arten.length);

            for (let stelle = 0; stelle < anzahl; stelle++) {
                const weiss = felder[stelle];
                zeichen[weiss] = arten[stelle];
                zeichen[gesamt - 1 - weiss] = arten[stelle].toLowerCase();
            }
        } else {
            /* Jede Seite würfelt für sich (armeeUnterschiedlich an) — hier
               wird nichts gespiegelt, die Armeen sind ohnehin verschieden. */
            for (const farbe of [SCHACH.WEISS, SCHACH.SCHWARZ]) {
                const felder = SCHACH_RUNDE._armeeFelder(variante, farbe, staerke);
                const arten = SCHACH_RUNDE._armeeFiguren(
                    id + SCHACH_RUNDE._wurfZusatz(wurf, farbe, getrennt),
                    farbe, variante, getrennt, undefined, staerke, felder.length);
                const anzahl = Math.min(felder.length, arten.length);

                for (let stelle = 0; stelle < anzahl; stelle++) {
                    zeichen[felder[stelle]] = (farbe === SCHACH.WEISS)
                        ? arten[stelle] : arten[stelle].toLowerCase();
                }
            }
        }

        /* Die zwei Leben gehören zur Zufallsarmee und damit in den Stand —
           `schach.js` kennt die Regeln der Partie nicht. */
        return Object.assign({}, stand, {
            brett: zeichen.join(""),
            koenigeAlsLeben: true
        });
    },

    /*
     * DIE ZUFALLSARMEE AUF DEM KREUZ (seit v0.76).
     *
     * Gemeldet als: „Wenn man eine Kreuz-Karte startet, soll es genauso sein
     * wie beim viereckigen Brett mit Zufallsarmee — nur dass man seine Armee an
     * ZWEI Seiten hat. Statt 4 Figuren wie beim kleinen Quadrat hat man beim
     * kleinen Kreuz also 8, weil die Armee gesplittet ist. Beim kleinen
     * Kreuz-Duell sollen es wieder gegenüber je 4 sein."
     *
     * Bis v0.75 kannte `_armeeStand` nur oben und unten. Auf dem Kreuz stellte
     * es deshalb beide Armeen quer über die volle Mitte, die Flügel blieben
     * leer — und die Ansicht drehte sich (seit v0.72) auf eine Startseite, auf
     * der gar nichts stand.
     *
     * DREI DINGE MÜSSEN HIER ZUSAMMENKOMMEN, und alle drei stehen schon im
     * Stand: `kreuzAufstellen` ist vorher gelaufen.
     *
     *   1. WELCHE SEITEN WEM GEHÖREN (`startSeiten`). Daran hängt auch die
     *      Drehung der Ansicht; abgelesen wird sie nie aus den Figuren.
     *   2. DIE RISSE der vier toten Ecken. Sie bleiben unangetastet, weil hier
     *      nur `brett` neu geschrieben wird.
     *   3. DIE STARTSEITE JEDES BAUERN (`bauernSeiten`). Sie wird NEU gebaut:
     *      Wo in der Vorlage ein Bauer stand, steht jetzt vielleicht ein Turm —
     *      und ein gewürfelter Bauer zwei Felder weiter fiele ohne Eintrag auf
     *      die Farbregel zurück und liefe auf dem Flügel quer.
     */
    _armeeStandKreuz(stand, id, getrennt, staerke, wurf) {
        const variante = SCHACH.varianteVon(stand);
        const zeichen = [];

        for (let feld = 0; feld < SCHACH.felderVon(stand); feld++) {
            zeichen.push(".");
        }

        const bauernSeiten = [];

        for (const farbe of [SCHACH.WEISS, SCHACH.SCHWARZ]) {
            for (const seite of SCHACH.startSeitenVon(stand, farbe)) {
                const felder = SCHACH_RUNDE._armeeFelderKreuz(variante, seite, staerke);
                const arten = SCHACH_RUNDE._armeeFiguren(
                    id + SCHACH_RUNDE._wurfZusatz(wurf, farbe, getrennt),
                    farbe, variante, getrennt, seite, staerke, felder.length);
                const anzahl = Math.min(felder.length, arten.length);

                for (let stelle = 0; stelle < anzahl; stelle++) {
                    const art = arten[stelle];

                    zeichen[felder[stelle]] = (farbe === SCHACH.WEISS)
                        ? art : art.toLowerCase();

                    if (art === "B") {
                        bauernSeiten.push({ feld: felder[stelle], seite: seite });
                    }
                }
            }
        }

        /*
         * Die zwei Leben gelten hier aus DEMSELBEN Grund wie überall: Die
         * Ziehung kann einer Seite zwei Könige geben, und mit zwei Streifen je
         * Team ist das der Regelfall. Bleibt es bei einem König, ändert der
         * Schalter nichts — dann gelten Schach und Matt wie gewohnt
         * (`SCHACH.koenigSchlagbarFuer`).
         */
        return Object.assign({}, stand, {
            brett: zeichen.join(""),
            bauernSeiten: bauernSeiten,
            koenigeAlsLeben: true
        });
    },

    normalisieren(roh) {
        /* Die Spielart steht an der Partie; ältere Stände tragen sie höchstens
           im Brett-Stand. Ohne Angabe gilt das klassische Brett. */
        let varianteId = SCHACH_VARIANTEN.STANDARD;
        if (roh && typeof roh.variante === "string" && SCHACH_VARIANTEN.gibtEs(roh.variante)) {
            varianteId = roh.variante;
        } else if (roh && roh.stand && typeof roh.stand.variante === "string"
            && SCHACH_VARIANTEN.gibtEs(roh.stand.variante)) {
            varianteId = roh.stand.variante;
        }

        const runde = SCHACH_RUNDE.leereRunde(undefined, varianteId);

        if (!roh || typeof roh !== "object") {
            return runde;
        }

        if (typeof roh.id === "string") {
            runde.id = roh.id;
        }
        if (typeof roh.titel === "string") {
            runde.titel = roh.titel;
        }
        if (typeof roh.erstelltAm === "number" && isFinite(roh.erstelltAm)) {
            runde.erstelltAm = roh.erstelltAm;
        }
        if (typeof roh.gestartetAm === "number" && isFinite(roh.gestartetAm)
            && roh.gestartetAm >= 0) {
            runde.gestartetAm = roh.gestartetAm;
        }
        if (typeof roh.geaendertAm === "number" && isFinite(roh.geaendertAm)) {
            runde.geaendertAm = roh.geaendertAm;
        }
        if (typeof roh.angelegtMit === "string") {
            runde.angelegtMit = roh.angelegtMit;
        }

        /* Der Brett-Stand bekommt die Spielart der Partie mit, damit die Maße
           auch dann stimmen, wenn nur die Partie sie kennt. */
        runde.stand = SCHACH.standNormalisieren(
            Object.assign({}, roh.stand, { variante: varianteId })
        );
        runde.laeuft = (roh.laeuft === true);

        /* Die Einladungen (seit v0.13.0) — additiv nachgerüstet, fremder
           Müll fliegt raus. */
        if (Array.isArray(roh.eingeladen)) {
            runde.eingeladen = roh.eingeladen.filter(
                (eintrag) => typeof eintrag === "string" && eintrag !== "");
        }

        if (["weiss", "schwarz", "remis"].indexOf(roh.ergebnis) !== -1) {
            runde.ergebnis = roh.ergebnis;
        }
        if (typeof roh.zugZaehler === "number" && isFinite(roh.zugZaehler) && roh.zugZaehler >= 0) {
            runde.zugZaehler = Math.floor(roh.zugZaehler);
        }

        /* Die gemessene Spielzeit (seit v0.93). Eine Partie von früher hat
           keine — dann bleibt es bei 0, und sie zählt für die Schätzung
           einfach nicht mit. */
        if (typeof roh.spielzeit === "number" && isFinite(roh.spielzeit)
            && roh.spielzeit > 0) {
            runde.spielzeit = Math.floor(roh.spielzeit);
        }

        for (const farbe of ["weiss", "schwarz"]) {
            const liste = (roh.teams && Array.isArray(roh.teams[farbe])) ? roh.teams[farbe] : [];
            runde.teams[farbe] = liste
                .filter((id) => typeof id === "string" && id !== "")
                .filter((id, stelle, alle) => alle.indexOf(id) === stelle);

            runde.bereit[farbe] = !!(roh.bereit && roh.bereit[farbe] === true);

            /* Die zweite Bereitschaft und der Würfel-Zähler (beide v0.62.0),
               additiv nachgerüstet: fehlen sie, gilt „noch nicht bestätigt"
               und „noch nie neu gewürfelt". */
            runde.aufstellungBereit[farbe] = !!(roh.aufstellungBereit
                && roh.aufstellungBereit[farbe] === true);

            const wuerfe = (roh.armeeWurf && roh.armeeWurf[farbe]);
            if (typeof wuerfe === "number" && isFinite(wuerfe) && wuerfe > 0) {
                runde.armeeWurf[farbe] = Math.floor(wuerfe);
            }

            const koennen = (roh.faehigkeiten && Array.isArray(roh.faehigkeiten[farbe]))
                ? roh.faehigkeiten[farbe]
                : [];
            runde.faehigkeiten[farbe] = koennen
                .filter((art) => typeof art === "string" && SCHACH_VARIANTEN.FAEHIGKEITEN[art]);
        }

        if (Array.isArray(roh.bonusGesammelt)) {
            runde.bonusGesammelt = roh.bonusGesammelt
                .filter((feld) => Number.isInteger(feld) && feld >= 0)
                .filter((feld, stelle, alle) => alle.indexOf(feld) === stelle);
        }

        for (const farbe of ["weiss", "schwarz"]) {
            const liste = (roh.verloren && Array.isArray(roh.verloren[farbe]))
                ? roh.verloren[farbe] : [];
            runde.verloren[farbe] = liste
                .filter((art) => typeof art === "string" && SCHACH.artName(art) !== "");

            const gefallene = (roh.gefallen && Array.isArray(roh.gefallen[farbe]))
                ? roh.gefallen[farbe] : [];
            runde.gefallen[farbe] = gefallene
                .filter((eintrag) => eintrag && typeof eintrag.art === "string"
                    && SCHACH.artName(eintrag.art) !== ""
                    && Number.isInteger(eintrag.feld) && eintrag.feld >= 0)
                .map((eintrag) => ({ art: eintrag.art, feld: eintrag.feld }));

            /* Die Unglücks-Karten der Hand (seit v0.82.0) — additiv
               nachgerüstet: Eine Partie von früher hat keine, dann bleibt die
               Liste leer und die Hand zeigt schlicht nichts. Nur echte
               Unglücks-Arten werden übernommen. */
            const abbekommen = (roh.unglueckskarten
                && Array.isArray(roh.unglueckskarten[farbe]))
                ? roh.unglueckskarten[farbe] : [];
            runde.unglueckskarten[farbe] = abbekommen
                .filter((eintrag) => eintrag && typeof eintrag.art === "string"
                    && SCHACH_VARIANTEN.PECH[eintrag.art]
                    && Number.isInteger(eintrag.zugZaehler)
                    && eintrag.zugZaehler >= 0)
                .map((eintrag) => ({
                    art: eintrag.art,
                    zugZaehler: eintrag.zugZaehler
                }));
        }

        if (roh.regeln && typeof roh.regeln === "object") {
            if (roh.regeln.faehigkeiten === true || roh.regeln.faehigkeiten === false) {
                runde.regeln.faehigkeiten = roh.regeln.faehigkeiten;
            }
            runde.regeln.seltenheitZeigen = (roh.regeln.seltenheitZeigen !== false);

            /* `=== true` und nicht `!== false`: Ohne Angabe ist der Haken AUS.
               Auch Partien von vor v0.49 zeigen das Unglück damit nicht mehr —
               das ist gewollt, es ist reine Anzeige und ändert keine Regel. */
            runde.regeln.pechZeigen = (roh.regeln.pechZeigen === true);
            runde.regeln.regen = (roh.regeln.regen === true);

            /* Wie steil der Regen ansteigt (seit v0.59). Alles ausserhalb von
               1 bis 5 — und jede Partie von vorher — fällt auf die Vorgabe
               zurück und spielt damit genau wie bisher. */
            runde.regeln.regenStufe =
                (Number.isInteger(roh.regeln.regenStufe)
                    && roh.regeln.regenStufe >= 1 && roh.regeln.regenStufe <= 5)
                    ? roh.regeln.regenStufe
                    : SCHACH_VARIANTEN.REGEN.STUFE_VORGABE;

            /*
             * DIE VIER STUFEN (seit v0.71). Fehlt der Eintrag, stammt die
             * Partie aus der Zeit der zwei Schalter darüber — dann wird er
             * daraus abgeleitet, und die Partie spielt weiter wie bisher.
             * Deshalb steht diese Zeile NACH den beiden alten.
             */
            const bekannteMenge = SCHACH_VARIANTEN.LOOTBOX_MENGEN.some(
                (eintrag) => eintrag.id === roh.regeln.lootboxMenge);

            runde.regeln.lootboxMenge = bekannteMenge
                ? roh.regeln.lootboxMenge
                : SCHACH_VARIANTEN.mengeAusAltem(
                    runde.regeln.regen, runde.regeln.regenStufe);

            runde.regeln.zufallsArmee = (roh.regeln.zufallsArmee === true);
            runde.regeln.armeeUnterschiedlich = (roh.regeln.armeeUnterschiedlich === true);
            /* Seit v0.66.0; alte Partien gelten als AUS und behalten damit
               ihre Seitenwahl. */
            runde.regeln.seiteZufaellig = (roh.regeln.seiteZufaellig === true);

            /* Unbekannte oder fehlende Stärke wird „normal" — der Wert von
               vor v0.86, damit angefangene Partien gleich bleiben. */
            runde.regeln.armeeStaerke = SCHACH_VARIANTEN
                .armeeStaerkeVon(roh.regeln.armeeStaerke).id;

            /* Rechnet diese Partie schon nach der neuen Regel? (seit v0.100,
               siehe `armeeFassung` bei den Vorgaben.) */
            runde.regeln.armeeFassung = (roh.regeln.armeeFassung === 1) ? 1 : 0;

            /*
             * Der Item-Vorrat (seit v0.87). Ohne Angabe „alle" — eine Partie
             * von früher spielt mit dem vollen Angebot weiter. Aus dem
             * gespeicherten Pool werden nur Arten übernommen, die es WIRKLICH
             * gibt: Eine versteckte oder entfernte Fähigkeit soll nicht über
             * eine alte Liste zurückkommen.
             */
            runde.regeln.itemVorrat = SCHACH_VARIANTEN
                .itemVorratVon(roh.regeln.itemVorrat).id;

            runde.regeln.itemPool = Array.isArray(roh.regeln.itemPool)
                ? roh.regeln.itemPool.filter((art) =>
                    SCHACH_VARIANTEN.FAEHIGKEITEN[art]
                    && !SCHACH_VARIANTEN.FAEHIGKEITEN[art].versteckt)
                : [];

            /* Die selbst zusammengestellte Liste (seit v0.100). Sie ist die
               EINGABE, `itemPool` das Ergebnis — beide reisen mit, damit man
               beim Neu aufstellen dieselbe Wahl behält. */
            runde.regeln.itemAuswahl = Array.isArray(roh.regeln.itemAuswahl)
                ? roh.regeln.itemAuswahl.filter((art) =>
                    SCHACH_VARIANTEN.FAEHIGKEITEN[art]
                    && !SCHACH_VARIANTEN.FAEHIGKEITEN[art].versteckt)
                : [];

            runde.regeln.einigkeit = (roh.regeln.einigkeit === true);

            /*
             * Die Stufe des Computers (seit v0.28.0) — nur als Text
             * übernommen, gedeutet wird sie in `SCHACH_BOT.stufeVon` (siehe
             * die Begründung bei den Vorgaben). Die Länge ist gedeckelt,
             * damit über den offenen Datenpfad kein Roman in der Partie
             * landet.
             */
            runde.regeln.botStufe = (typeof roh.regeln.botStufe === "string")
                ? roh.regeln.botStufe.slice(0, 20)
                : "";
        }

        if (roh.vorschlag && typeof roh.vorschlag === "object") {
            const roher = roh.vorschlag;
            const stimmen = Array.isArray(roher.stimmen) ? roher.stimmen : [];
            const istFaehigkeit = (roher.art === "faehigkeit")
                && !!SCHACH_VARIANTEN.FAEHIGKEITEN[roher.faehigkeit];

            if (istFaehigkeit || (Number.isInteger(roher.von) && Number.isInteger(roher.nach))) {
                runde.vorschlag = {
                    art: istFaehigkeit ? "faehigkeit" : "zug",
                    faehigkeit: istFaehigkeit ? roher.faehigkeit : "",
                    zielFeld: Number.isInteger(roher.zielFeld) ? roher.zielFeld : -1,
                    von: Number.isInteger(roher.von) ? roher.von : -1,
                    nach: Number.isInteger(roher.nach) ? roher.nach : -1,
                    umwandlung: (typeof roher.umwandlung === "string") ? roher.umwandlung : "D",
                    wahl: (typeof roher.wahl === "string") ? roher.wahl : "",
                    wer: (typeof roher.wer === "string") ? roher.wer : "",
                    name: (typeof roher.name === "string") ? roher.name : "",
                    zugZaehler: Number.isInteger(roher.zugZaehler) ? roher.zugZaehler : 0,
                    frist: (typeof roher.frist === "number" && isFinite(roher.frist))
                        ? roher.frist : 0,
                    stimmen: stimmen
                        .filter((id) => typeof id === "string" && id !== "")
                        .filter((id, stelle, alle) => alle.indexOf(id) === stelle)
                };
            }
        }

        /*
         * Die Zug-Vorschläge der Abstimmung (seit v0.83.0) — additiv
         * nachgerüstet: Eine Partie von früher hat keine, dann bleibt das
         * Objekt leer. Nur brauchbare Einträge werden übernommen; was weder
         * ein Zug noch eine bekannte Fähigkeit ist, fällt weg.
         */
        if (roh.vorschlaege && typeof roh.vorschlaege === "object") {
            for (const id of Object.keys(roh.vorschlaege)) {
                const roher = roh.vorschlaege[id];
                if (id === "" || !roher || typeof roher !== "object") {
                    continue;
                }

                const istFaehigkeit = (roher.art === "faehigkeit")
                    && !!SCHACH_VARIANTEN.FAEHIGKEITEN[roher.faehigkeit];

                if (!istFaehigkeit
                    && !(Number.isInteger(roher.von) && Number.isInteger(roher.nach))) {
                    continue;
                }

                runde.vorschlaege[id] = {
                    art: istFaehigkeit ? "faehigkeit" : "zug",
                    faehigkeit: istFaehigkeit ? roher.faehigkeit : "",
                    zielFeld: Number.isInteger(roher.zielFeld) ? roher.zielFeld : -1,
                    von: Number.isInteger(roher.von) ? roher.von : -1,
                    nach: Number.isInteger(roher.nach) ? roher.nach : -1,
                    umwandlung: (typeof roher.umwandlung === "string")
                        ? roher.umwandlung : "D",
                    wahl: (typeof roher.wahl === "string") ? roher.wahl : "",
                    name: (typeof roher.name === "string") ? roher.name : "",
                    zugZaehler: Number.isInteger(roher.zugZaehler)
                        ? roher.zugZaehler : 0,
                    wann: (typeof roher.wann === "number" && isFinite(roher.wann))
                        ? roher.wann : 0,
                    frist: (typeof roher.frist === "number" && isFinite(roher.frist))
                        ? roher.frist : 0
                };
            }
        }

        /* Wann welche Stufe zuletzt erschienen ist (seit v0.41). Unbekannte
           Stufen und Unsinn fallen weg — der Rest ist ein Takt-Wert. */
        if (roh.stufeZuletzt && typeof roh.stufeZuletzt === "object") {
            for (const stufe of SCHACH_VARIANTEN.STUFEN) {
                const wert = roh.stufeZuletzt[stufe.id];
                if (Number.isInteger(wert) && wert >= 0) {
                    runde.stufeZuletzt[stufe.id] = wert;
                }
            }
        }

        if (roh.versaeumt && typeof roh.versaeumt === "object") {
            for (const id of Object.keys(roh.versaeumt)) {
                const wert = roh.versaeumt[id];
                if (Number.isInteger(wert) && wert > 0) {
                    runde.versaeumt[id] = wert;
                }
            }
        }

        /*
         * Die Würfel auf dem Brett. Eine Partie aus Fassung 1 kennt sie nicht:
         * Dort lagen vier feste Felder, von denen die eingesammelten in
         * `bonusGesammelt` stehen. Daraus wird hier einmalig die neue Liste
         * gebaut — angefangene Partien laufen damit unverändert weiter.
         */
        if (roh.bonusFassung === SCHACH_RUNDE.BONUS_FASSUNG) {
            /*
             * Ein Würfel trägt entweder eine STUFE (seit v3.6: was drin ist,
             * entscheidet sich erst beim Einsammeln — nur so kann der eigene
             * Vorrat die Ziehung dämpfen) oder eine feste ART (Würfel, die
             * schon vor v3.6 auf dem Brett lagen, und alle Unglückswürfel).
             * Beides bleibt gültig; der additive Vertrag verlangt genau das.
             */
            const liste = Array.isArray(roh.bonus) ? roh.bonus : [];
            runde.bonus = liste
                .filter((eintrag) => eintrag && Number.isInteger(eintrag.feld)
                    && eintrag.feld >= 0
                    && (eintrag.pech
                        /*
                         * Ein VERSTECKTES Unglück fliegt vom Brett (seit
                         * v0.84). Anders als eine versteckte Fähigkeit, die
                         * man aufbrauchen darf, ist eine liegende
                         * Unglücks-Lootbox keine Habe, sondern eine Gefahr:
                         * „Aus dem Spiel genommen" hiesse sonst nicht, dass
                         * sie in laufenden Partien aufhört zu treffen.
                         * Gerechnet, nicht gewürfelt — jedes Gerät wirft
                         * dieselbe Box weg.
                         */
                        ? (SCHACH_VARIANTEN.PECH[eintrag.art]
                            && !SCHACH_VARIANTEN.PECH[eintrag.art].versteckt)
                        : (SCHACH_VARIANTEN.FAEHIGKEITEN[eintrag.art]
                            || SCHACH_VARIANTEN.STUFEN.some(
                                (stufe) => stufe.id === eintrag.stufe))))
                .map((eintrag) => {
                    if (eintrag.pech) {
                        return { feld: eintrag.feld, art: eintrag.art, pech: true };
                    }
                    if (SCHACH_VARIANTEN.FAEHIGKEITEN[eintrag.art]) {
                        return { feld: eintrag.feld, art: eintrag.art };
                    }
                    return { feld: eintrag.feld, art: "", stufe: eintrag.stufe };
                })
                .filter((eintrag, stelle, alle) =>
                    alle.findIndex((anderer) => anderer.feld === eintrag.feld) === stelle);
        } else {
            const variante = SCHACH_VARIANTEN.holen(varianteId);
            runde.bonus = variante.bonusFelder
                .filter((eintrag) => runde.bonusGesammelt.indexOf(eintrag.feld) === -1)
                .map((eintrag) => ({ feld: eintrag.feld, art: eintrag.art }));
        }

        if (Array.isArray(roh.verlauf)) {
            for (const eintrag of roh.verlauf) {
                if (eintrag && typeof eintrag.text === "string") {
                    runde.verlauf.push({
                        text: eintrag.text,
                        wer: (typeof eintrag.wer === "string") ? eintrag.wer : "",
                        farbe: (eintrag.farbe === "schwarz") ? "schwarz" : "weiss",
                        von: Number.isInteger(eintrag.von) ? eintrag.von : -1,
                        nach: Number.isInteger(eintrag.nach) ? eintrag.nach : -1,
                        /* Art der Fähigkeit und die betroffenen Felder — daraus
                           zeichnet der Bildschirm die Animation, und zwar auf
                           JEDEM Gerät. */
                        wirkung: (typeof eintrag.wirkung === "string") ? eintrag.wirkung : "",
                        felder: Array.isArray(eintrag.felder)
                            ? eintrag.felder.filter((feld) => Number.isInteger(feld) && feld >= 0)
                            : [],
                        /* Alle Bewegungen dieses Eintrags — daraus zeichnet der
                           Bildschirm die Pfeile. Ein Zug hat einen Weg, ein
                           Erdbeben mehrere. */
                        wege: Array.isArray(eintrag.wege)
                            ? eintrag.wege
                                .filter((weg) => weg && Number.isInteger(weg.von)
                                    && Number.isInteger(weg.nach) && weg.von >= 0 && weg.nach >= 0)
                                .map((weg) => ({ von: weg.von, nach: weg.nach }))
                            : [],
                        /* Ein Teleport setzt über alles hinweg (seit v0.98):
                           Das Brett zeichnet dann keine Linie, sondern nur
                           Start und Ziel. Der Eintrag wird hier Feld für Feld
                           neu gebaut — was hier fehlt, ist nach dem Laden
                           weg. */
                        ohneWeg: !!eintrag.ohneWeg
                    });
                }
            }
        }

        return runde;
    },

    kopieren(runde) {
        return SCHACH_RUNDE.normalisieren(runde);
    },

    /* Die Spielart dieser Partie. */
    varianteVon(runde) {
        return SCHACH_VARIANTEN.holen(runde ? runde.variante : "");
    },

    /* ---------------------------------------------------------------- *
     * Der Beitritts-Code (seit v0.10.0, Bündel A Schritt 5)
     *
     * GERECHNET aus der Partie-Kennung, nie gespeichert: Jedes Gerät kommt
     * auf denselben Code, ohne dass er je geschrieben oder abgeglichen
     * wird (Entwurf, Abschnitt 3.3). Verwechselbare Zeichen fehlen im
     * Zeichensatz (kein 0/O, kein 1/I/L) — der Code wird vorgelesen und
     * abgetippt. Je Stelle eine eigene Saat, die Stellen-Nummer VORN
     * (siehe die Regel bei _zufallsWert).
     * ---------------------------------------------------------------- */

    CODE_ZEICHEN: "ABCDEFGHJKMNPQRSTUVWXYZ23456789",
    CODE_LAENGE: 6,

    beitrittsCode(partieOderId) {
        const id = (partieOderId && typeof partieOderId === "object")
            ? partieOderId.id : partieOderId;
        if (!id) {
            return "";
        }

        let code = "";
        for (let stelle = 0; stelle < SCHACH_RUNDE.CODE_LAENGE; stelle++) {
            const wert = SCHACH_RUNDE._zufallsWert(stelle + "|code|" + id);
            code += SCHACH_RUNDE.CODE_ZEICHEN[Math.floor(
                wert * SCHACH_RUNDE.CODE_ZEICHEN.length)];
        }
        return code;
    },

    /* ---------------------------------------------------------------- *
     * Teams
     * ---------------------------------------------------------------- */

    /* In welchem Team ist der Spieler? "" wenn in keinem. */
    teamVon(runde, spielerId) {
        const stand = SCHACH_RUNDE.normalisieren(runde);
        if (stand.teams.weiss.indexOf(spielerId) !== -1) {
            return "weiss";
        }
        if (stand.teams.schwarz.indexOf(spielerId) !== -1) {
            return "schwarz";
        }
        return "";
    },

    /*
     * Tritt einem Team bei — auch mitten im Spiel, das ist ausdrücklich
     * gewollt. Ein Wechsel entfernt aus dem anderen Team.
     */
    teamBeitreten(runde, spielerId, farbe, zeitpunkt) {
        const neu = SCHACH_RUNDE.kopieren(runde);

        if (!spielerId || (farbe !== "weiss" && farbe !== "schwarz")) {
            return neu;
        }

        /*
         * Wer schon in einem Team ist, bleibt darin. Ein Wechsel mitten in der
         * Partie hiesse: erst für die eine Seite ziehen, dann für die andere —
         * bei einer Partie, die über Tage läuft, ist das keine theoretische
         * Möglichkeit. Wer wirklich raus will, verlässt das Team ausdrücklich.
         */
        const bisher = SCHACH_RUNDE.teamVon(neu, spielerId);
        if (bisher && bisher !== farbe) {
            return neu;
        }

        neu.teams.weiss = neu.teams.weiss.filter((id) => id !== spielerId);
        neu.teams.schwarz = neu.teams.schwarz.filter((id) => id !== spielerId);
        neu.teams[farbe].push(spielerId);

        neu.geaendertAm = (zeitpunkt === undefined) ? Date.now() : zeitpunkt;
        return neu;
    },

    teamVerlassen(runde, spielerId, zeitpunkt) {
        const neu = SCHACH_RUNDE.kopieren(runde);
        neu.teams.weiss = neu.teams.weiss.filter((id) => id !== spielerId);
        neu.teams.schwarz = neu.teams.schwarz.filter((id) => id !== spielerId);
        neu.geaendertAm = (zeitpunkt === undefined) ? Date.now() : zeitpunkt;
        return neu;
    },

    /*
     * Jemanden in diese Runde einladen (seit v0.13.0, Bündel A Schritt 7).
     * Doppelt einladen ist erlaubt und wirkungslos (F16c: Erneut-Einladen
     * bleibt möglich, weil die Einladung nie „verbraucht" wird — sie liegt,
     * bis die Runde vorbei ist, F16a).
     */
    einladen(runde, spielerId, zeitpunkt) {
        const neu = SCHACH_RUNDE.kopieren(runde);
        if (spielerId && neu.eingeladen.indexOf(spielerId) === -1) {
            neu.eingeladen.push(spielerId);
        }
        neu.geaendertAm = (zeitpunkt === undefined) ? Date.now() : zeitpunkt;
        return neu;
    },

    /* Wartet auf diese Person eine Einladung? Nur solange die Runde nicht
       vorbei ist und die Person nicht längst mitspielt. */
    istEingeladen(runde, spielerId) {
        const stand = SCHACH_RUNDE.normalisieren(runde);
        return !stand.ergebnis
            && stand.eingeladen.indexOf(spielerId) !== -1
            && !SCHACH_RUNDE.teamVon(stand, spielerId);
    },

    /*
     * DIE ERSTE BEREITSCHAFT: Ich bin mit meiner SEITE einverstanden.
     *
     * BIS v0.61.0 FING DIE PARTIE HIER AN. Seit v0.62.0 führt sie nur noch in
     * die AUFSTELLUNG (`inAufstellung`) — angepfiffen wird erst, wenn beide
     * Seiten auch das Brett bestätigt haben (`aufstellungBereitSetzen`).
     *
     * WER SEINE ZUSAGE ZURÜCKNIMMT, NIMMT BEIDEN DIE ZWEITE (Zeile unten).
     * Sonst stünde folgender Fall offen: Weiss geht zurück zur Seitenwahl,
     * würfelt später neu, drückt wieder bereit — und Schwarz' Zusage zur
     * ALTEN Aufstellung liegt noch da und pfeift sofort an. Man startete eine
     * Partie mit einem Brett, das man nie gesehen hat.
     */
    bereitSetzen(runde, farbe, bereit, zeitpunkt) {
        const neu = SCHACH_RUNDE.kopieren(runde);

        if (farbe !== "weiss" && farbe !== "schwarz") {
            return neu;
        }
        neu.bereit[farbe] = (bereit === true);

        if (bereit !== true) {
            neu.aufstellungBereit = { weiss: false, schwarz: false };
        }

        neu.geaendertAm = (zeitpunkt === undefined) ? Date.now() : zeitpunkt;
        return neu;
    },

    /*
     * DIE ZWEITE BEREITSCHAFT: Ich bin auch mit dem BRETT einverstanden —
     * und damit geht es los (seit v0.62.0).
     *
     * Der Anpfiff steht hier und nicht mehr in `bereitSetzen`: Er hängt an
     * der letzten Zusage, die fehlt, und das ist seit dem zweiten
     * Start-Bildschirm diese.
     */
    aufstellungBereitSetzen(runde, farbe, bereit, zeitpunkt) {
        const neu = SCHACH_RUNDE.kopieren(runde);

        if (farbe !== "weiss" && farbe !== "schwarz") {
            return neu;
        }
        neu.aufstellungBereit[farbe] = (bereit === true);

        if (SCHACH_RUNDE.kannAnpfeifen(neu)) {
            neu.laeuft = true;

            /* Nur beim ERSTEN Start setzen: „Neu aufstellen" soll die
               Spieldauer nicht zurückdrehen. */
            if (!neu.gestartetAm) {
                neu.gestartetAm = (zeitpunkt === undefined) ? Date.now() : zeitpunkt;
            }
        }

        neu.geaendertAm = (zeitpunkt === undefined) ? Date.now() : zeitpunkt;
        return neu;
    },

    /*
     * Beide Seiten besetzt und beide mit ihrer SEITE einverstanden. Das war
     * bis v0.61.0 die Bedingung für den Anpfiff; seit v0.62.0 ist es die
     * Bedingung für die AUFSTELLUNG. Der Name blieb, weil er weiterhin sagt,
     * was er sagt: Ab hier kann die Runde starten — sie tut es nur in zwei
     * Schritten.
     */
    kannStarten(runde) {
        const stand = SCHACH_RUNDE.normalisieren(runde);
        return stand.teams.weiss.length > 0
            && stand.teams.schwarz.length > 0
            && stand.bereit.weiss
            && stand.bereit.schwarz;
    },

    /*
     * DIE ARMEE NEU WÜRFELN, OHNE DIE RUNDE ZURÜCKZUSETZEN (seit v0.62.0).
     *
     * Nutzer-Ansage 25.08.2026: „Beide haben noch die Möglichkeit, neu
     * aufzustellen. Wenn beide dieselbe haben, können beide Spieler separat
     * auf den Knopf drücken und es ändern sich beide Armeen; wenn beide
     * unterschiedliche haben, ändert sich nur die eigene."
     *
     * GENAU DAS macht der Zähler `armeeWurf`: Bei getrennten Armeen steigt
     * nur der der drückenden Seite, sonst beide zugleich (die gemeinsame
     * Armee wird aus Weiss gezogen und für Schwarz gespiegelt — ein einzelner
     * Zähler würde die Spiegelung zerreissen).
     *
     * DAS IST NICHT `neuePartie`. Jene ist die Revanche: neuer Stand, alle
     * Bereitschaften weg, Verlauf leer. Hier bleibt alles stehen, was
     * ausgesucht wurde — nur das BRETT wird neu gezogen. Was verfällt, ist
     * die zweite Bereitschaft BEIDER Seiten: Wer eine Aufstellung bestätigt
     * hat, hat diese bestätigt und nicht die nächste.
     *
     * Ohne Zufallsarmee gibt es nichts zu würfeln — dann bleibt die Runde
     * unverändert, und der Aufrufer muss nichts prüfen.
     */
    armeeNeuWuerfeln(runde, farbe, zeitpunkt) {
        const neu = SCHACH_RUNDE.kopieren(runde);

        if (!SCHACH_RUNDE.armeeAn(neu) || neu.ergebnis || neu.laeuft) {
            return neu;
        }

        const getrennt = neu.regeln.armeeUnterschiedlich === true;

        if (getrennt && (farbe === "weiss" || farbe === "schwarz")) {
            neu.armeeWurf[farbe] = neu.armeeWurf[farbe] + 1;
        } else {
            neu.armeeWurf.weiss = neu.armeeWurf.weiss + 1;
            neu.armeeWurf.schwarz = neu.armeeWurf.schwarz + 1;
        }

        /* Das Brett von Grund auf neu herrichten — Kreuz-Risse zuerst, dann
           die Figuren, dann der Zuschnitt auf die Armeestärke. Genau die
           Reihenfolge von `neuePartie`, nur ohne deren Rücksetzungen. */
        neu.stand = SCHACH.neuerStand(neu.variante);
        SCHACH_RUNDE.kreuzAufstellen(neu);
        SCHACH_RUNDE.armeeAufstellen(neu);
        SCHACH_RUNDE.aufstellungAnpassen(neu);

        neu.aufstellungBereit = { weiss: false, schwarz: false };
        neu.geaendertAm = (zeitpunkt === undefined) ? Date.now() : zeitpunkt;
        return neu;
    },

    /* Beide haben auch das Brett bestätigt — jetzt wird angepfiffen. */
    kannAnpfeifen(runde) {
        const stand = SCHACH_RUNDE.normalisieren(runde);
        return SCHACH_RUNDE.kannStarten(stand)
            && stand.aufstellungBereit.weiss
            && stand.aufstellungBereit.schwarz;
    },

    /*
     * Steht die Runde gerade auf dem zweiten Start-Bildschirm? Beide Seiten
     * besetzt und mit ihrer Seite einverstanden, das Brett aber noch nicht
     * angepfiffen. Der Bildschirm fragt genau das (`_partieZeichnen`).
     *
     * MIT ZUGELOSTER SEITE GENÜGT DIE EIGENE (seit v0.66.0): Dann gibt es
     * keinen Seitenwahl-Bildschirm, auf den man zurückfallen könnte — wer
     * drin sitzt, steht vor dem Brett und wartet dort auf den zweiten
     * Spieler. `spielerId` sagt, wer fragt; ohne sie gilt die alte Regel
     * (beide Seiten), damit jeder vorhandene Aufrufer unverändert weiterläuft.
     */
    inAufstellung(runde, spielerId) {
        const stand = SCHACH_RUNDE.normalisieren(runde);

        if (stand.laeuft || stand.ergebnis) {
            return false;
        }
        if (SCHACH_RUNDE.kannStarten(stand)) {
            return true;
        }

        return stand.regeln.seiteZufaellig === true
            && !!spielerId
            && !!SCHACH_RUNDE.teamVon(stand, spielerId);
    },

    /*
     * DIE SEITE ZULOSEN, WENN DER HAKEN ES SAGT (seit v0.66.0).
     *
     * Liefert die Runde unverändert zurück, wenn nichts zu tun ist — der
     * Aufrufer muss nichts prüfen. Zugeteilt wird nur, wenn:
     *
     *   - der Haken `seiteZufaellig` an ist,
     *   - die Runde noch nicht läuft und kein Ergebnis hat,
     *   - die Person noch in keinem Team sitzt,
     *   - und mindestens eine Seite LEER ist.
     *
     * DIE LETZTE BEDINGUNG IST DIE WICHTIGE: Sind beide Seiten besetzt,
     * würde ein Dritter sonst ungefragt in ein Team gesteckt, das ihn nicht
     * braucht. Wer bei einer vollen Runde hereinschaut, bleibt Zuschauer —
     * so wie bisher auch.
     *
     * WER ZUGELOST WIRD, IST DAMIT BEREIT (Nutzer-Entscheidung 25.08.2026:
     * „der erste Screen fällt komplett raus"). Die erste Bereitschaft war
     * die Zusage zur eigenen SEITE — wer sie nicht aussuchen kann, hat
     * nichts zuzusagen. Die zweite (die Aufstellung) bleibt und startet.
     */
    seiteZulosen(runde, spielerId, zeitpunkt) {
        const stand = SCHACH_RUNDE.normalisieren(runde);

        if (stand.regeln.seiteZufaellig !== true
                || stand.laeuft || stand.ergebnis
                || !spielerId
                || SCHACH_RUNDE.teamVon(stand, spielerId)) {
            return runde;
        }

        const leere = ["weiss", "schwarz"].filter(
            (farbe) => stand.teams[farbe].length === 0);

        if (leere.length === 0) {
            return runde;
        }

        /*
         * Steht genau eine Seite leer, geht es dorthin — sonst gäbe es kein
         * Gegenüber. Sind beide leer, entscheidet der GERECHNETE Zufall:
         * `Math.random()` hat im Modell nichts zu suchen, und die Kennung
         * plus die Person ergibt für jedes Gerät dieselbe Antwort.
         */
        const farbe = (leere.length === 1)
            ? leere[0]
            : ((SCHACH_RUNDE._zufallsWert(
                (stand.id || "partie") + "|seite|" + spielerId) < 0.5)
                ? "weiss" : "schwarz");

        return SCHACH_RUNDE.bereitSetzen(
            SCHACH_RUNDE.teamBeitreten(runde, spielerId, farbe, zeitpunkt),
            farbe, true, zeitpunkt);
    },

    /*
     * Darf dieser Spieler diese Fähigkeit gerade einsetzen? (seit v3.6)
     *
     * Die Regel war bis dahin dieselbe wie fürs Ziehen: nur, wenn das eigene
     * Team am Zug ist. Seit v3.6 gibt es Fähigkeiten mit `imGegenzug` — sie
     * gehen auch, während der Gegner überlegt. Sie kosten keinen Zug und
     * nehmen niemandem etwas weg; was sie erzeugen, ist ein Rennen: Wer
     * zuerst drückt, war zuerst. Abgesichert ist es über denselben Zugzähler,
     * mit dem sich auch zwei Züge aus einem Team nicht überholen können.
     */
    darfEinsetzen(runde, spielerId, art) {
        const stand = SCHACH_RUNDE.normalisieren(runde);
        const beschreibung = SCHACH_VARIANTEN.FAEHIGKEITEN[art];

        if (!beschreibung) {
            return false;
        }

        /*
         * EIN LEERER FRIEDHOF GIBT NICHTS HER (seit v0.59, Wunsch #19).
         *
         * Drei Fähigkeiten holen Gefallene zurück, und jede verbraucht ihren
         * Eintrag dabei: Friedhof (gegnerische Gefallene), Wiederbelebung
         * (eigene, an ihrem Grab) und Wiedergeburt (eigene, auf der
         * Grundreihe). Ist die Liste leer, kommt nichts mehr — bis v0.58 liess
         * sich die Fähigkeit trotzdem antippen, das Brett zeigte kein einziges
         * Zielfeld, und man stand ohne Erklärung da.
         */
        if (!SCHACH_RUNDE._gefalleneVorhanden(stand, spielerId, art)) {
            return false;
        }

        /*
         * DASSELBE FÜR DIEB UND HÄNDLER (seit v0.94).
         *
         * Beide hängen an einem Vorrat, den man nicht sieht: Der Dieb greift
         * in den Vorrat des GEGNERS, der Händler braucht die Figuren, die er
         * eintauschen will. Ist dort nichts, kommt nichts — bis v0.93 liess
         * sich die Marke trotzdem antippen, und man erfuhr es erst im Fenster
         * danach. Im Spieltest war das der zweithäufigste Griff ins Leere
         * (861 mal Dieb, 386 mal Händler in 440 Partien).
         *
         * Warum es hier steht und nicht im Bildschirm: Es ist eine Regel, und
         * Regeln stehen im Modell. Der Bildschirm fragt dieselbe Funktion und
         * macht die Marke grau, genau wie beim leeren Friedhof.
         */
        if (!SCHACH_RUNDE._etwasZuHolen(stand, spielerId, art)) {
            return false;
        }

        /*
         * NUR IM GEGENZUG (seit v0.58) — bisher nur das Ausweichen.
         *
         * Es ist die Notbremse: eine Figur weicht aus, während der Gegner
         * zuschlägt. Bis v0.57 durfte man es AUCH im eigenen Zug einsetzen und
         * behielt dabei seinen Zug — damit war es ein geschenktes Extra-Feld
         * für jede Figur, jederzeit. Als Notbremse gedacht, als Gratis-Zug
         * benutzt.
         *
         * Der Schalter steht vor der Zug-Prüfung, denn er DREHT sie um: Wer am
         * Zug ist, darf gerade NICHT.
         */
        if (beschreibung.nurImGegenzug) {
            return stand.laeuft && !stand.ergebnis
                && !!SCHACH_RUNDE.teamVon(stand, spielerId)
                && stand.stand.amZug !== SCHACH_RUNDE.teamVon(stand, spielerId);
        }

        if (SCHACH_RUNDE.darfZiehen(stand, spielerId)) {
            return true;
        }
        if (!beschreibung.imGegenzug) {
            return false;
        }

        /* Im Gegenzug genügt: Die Partie läuft und man ist in einem Team. */
        return stand.laeuft && !stand.ergebnis
            && !!SCHACH_RUNDE.teamVon(stand, spielerId);
    },

    /*
     * Hat diese Fähigkeit überhaupt noch jemanden zum Zurückholen? (seit v0.59)
     *
     * Die Frage steht hier im Modell, weil sie eine Regel ist — der Bildschirm
     * fragt nur. Sie ist bewusst BILLIG gerechnet: eine Listenlänge, keine
     * Feld-für-Feld-Probe wie `zielFelder`. `darfEinsetzen` läuft bei jedem
     * Neuzeichnen für jede Fähigkeit im Vorrat; auf dem Doppelbrett wären das
     * sonst mehrere hundert Probeläufe je Bild.
     *
     * Für alle anderen Fähigkeiten liefert sie `true` — sie hängen an keinem
     * Vorrat.
     */
    _gefalleneVorhanden(runde, spielerId, art) {
        if (art !== "friedhof" && art !== "wiederbelebung" && art !== "wiedergeburt") {
            return true;
        }

        /* Erst hier normalisieren: Für alle anderen Fähigkeiten wäre es
           verschenkte Arbeit, und die Frage kommt bei jedem Neuzeichnen. */
        const stand = SCHACH_RUNDE.normalisieren(runde);
        const farbe = SCHACH_RUNDE.teamVon(stand, spielerId);
        if (!farbe) {
            return true;
        }

        if (art === "friedhof") {
            return (stand.gefallen[SCHACH.gegner(farbe)] || []).length > 0;
        }
        if (art === "wiederbelebung") {
            return (stand.gefallen[farbe] || []).length > 0;
        }
        return (stand.verloren[farbe] || []).length > 0;
    },

    /*
     * GIBT ES FÜR DIEB UND HÄNDLER GERADE ÜBERHAUPT ETWAS? (seit v0.94)
     *
     * Dieselbe Frage wie in `_gefalleneVorhanden`, nur für die zwei
     * Fähigkeiten, die weder das Brett verändern noch ein Zielfeld verlangen —
     * sie handeln mit VORRÄTEN, und ein leerer Vorrat ist am Brett nicht zu
     * sehen. Beide behalten ihren eigenen Weg im Bildschirm (Fenster mit
     * Angebot statt Zielfeldern); ohne diese Prüfung war der Weg dorthin eine
     * Sackgasse.
     *
     * Wie die Schwester bleibt sie BILLIG, wo sie es kann: Der Dieb ist eine
     * Listenlänge. Der Händler muss sein Angebot rechnen — das ist der
     * einzige Weg, ehrlich zu antworten, denn ob er zustande kommt, hängt an
     * den Figuren auf dem Brett. `handelsAngebot` liest das Brett wenige Male
     * ab; das ist verkraftbar, weil höchstens ein Händler im Vorrat liegt und
     * die Frage nur beim Neuzeichnen kommt.
     *
     * Für alle anderen Fähigkeiten liefert sie `true`.
     */
    _etwasZuHolen(runde, spielerId, art) {
        /*
         * DER DIEB STEHT SEIT v0.99 NICHT MEHR HIER (Nutzer-Entscheidung
         * 20.08.: „Dieb und die neuen Items sollen so wie alle anderen auch
         * eingesammelt werden und dann, wann man will, genutzt werden").
         *
         * Von v0.94 bis v0.98 wurde seine Marke grau, sobald der Gegner nichts
         * im Vorrat hatte — gedacht als Ersparnis (im Spieltest 861 Griffe ins
         * Leere), erlebt als „das Item funktioniert nicht wie ein Item". Der
         * Nutzer hat den Preis anders gewichtet als der Spieltest: Ein Item,
         * das man nicht anfassen darf, fühlt sich kaputt an; ein Fenster, das
         * „gerade nichts zu holen" sagt, ist nur eine Auskunft.
         *
         * VERLOREN GEHT DABEI NICHTS: `TEAM_SCHACH.diebstahlAnbieten` fängt
         * den leeren Fall seit jeher ab, sagt es und lässt die Fähigkeit im
         * Vorrat. Es ist ein Tipp zu viel, kein verbrauchtes Item.
         *
         * DER HÄNDLER BLEIBT, wo er ist: Bei ihm hängt die Absage nicht am
         * Vorrat des Gegners, sondern daran, ob sich aus den EIGENEN Figuren
         * überhaupt ein Tausch bilden lässt — und er wurde nicht gemeldet.
         */
        if (art !== "haendler") {
            return true;
        }

        const stand = SCHACH_RUNDE.normalisieren(runde);
        const farbe = SCHACH_RUNDE.teamVon(stand, spielerId);
        if (!farbe) {
            return true;
        }

        return !!SCHACH_RUNDE.handelsAngebot(stand, farbe);
    },

    /*
     * Bleibt dieser Seite nach dem Einsetzen ihr normaler Zug? (seit v0.41)
     *
     * Das ist die Frage, die das Pluszeichen am Vorrat beantwortet. Bis v0.40
     * zeigte der Bildschirm es einfach immer, wenn `beendetZug` fehlte — und
     * lag damit in zwei Fällen falsch:
     *
     *   - Wer im GEGNERZUG eine Blitz-Fähigkeit einsetzt (Ausweichen), ist
     *     danach nicht am Zug. Er war es vorher schon nicht. Ein Pluszeichen
     *     versprach dort einen Zug, den es nicht gibt.
     *   - Umgekehrt: Wer den Doppelzug offen hat, BEHÄLT den Zug sogar bei
     *     einer Fähigkeit mit `beendetZug` — `faehigkeitEinsetzen` verbraucht
     *     dann den Doppelzug statt den Zug abzugeben.
     *
     * Die Antwort steht deshalb hier im Modell, mit derselben Rechnung wie
     * beim Einsetzen selbst. Der Bildschirm fragt nur noch.
     */
    behaeltZug(runde, farbe, art) {
        const stand = SCHACH_RUNDE.normalisieren(runde);
        const beschreibung = SCHACH_VARIANTEN.FAEHIGKEITEN[art];

        if (!beschreibung || !stand.laeuft || stand.ergebnis) {
            return false;
        }
        if (stand.stand.amZug !== farbe) {
            return false;
        }

        /*
         * `istDerZug` (Sprung, Teleport seit v0.48): Man bleibt zwar am Zug,
         * aber der Zug gehört der Fähigkeit — NORMAL ziehen kann man danach
         * nicht mehr. Genau das verspricht das Pluszeichen, also darf es hier
         * nicht stehen.
         */
        if (beschreibung.istDerZug) {
            return false;
        }

        /*
         * `nurImGegenzug` (seit v0.58): Wer am Zug ist, darf sie gar nicht
         * einsetzen — dann gibt es auch nichts zu behalten. Deshalb fällt das
         * Pluszeichen von selbst weg, ohne dass jemand es wegnehmen musste.
         */
        if (beschreibung.nurImGegenzug) {
            return false;
        }
        if (!beschreibung.beendetZug) {
            return true;
        }
        return stand.stand.extraZug === farbe;
    },

    /* Darf dieser Spieler gerade ziehen? */
    darfZiehen(runde, spielerId) {
        const stand = SCHACH_RUNDE.normalisieren(runde);

        if (!stand.laeuft || stand.ergebnis) {
            return false;
        }
        const team = SCHACH_RUNDE.teamVon(stand, spielerId);
        if (!team) {
            return false;
        }
        return team === stand.stand.amZug;
    },

    /* ---------------------------------------------------------------- *
     * Ziehen
     * ---------------------------------------------------------------- */

    /*
     * Führt einen Zug aus. Liefert die neue Runde oder null, wenn der Zug
     * nicht erlaubt ist (falsches Team, Partie nicht am Laufen, Regelverstoss).
     *
     * `wer` ist der Anzeigename für den Verlauf — nur Beiwerk, die Regeln
     * hängen nicht daran.
     */
    ziehen(runde, spielerId, von, nach, umwandlung, wer, zeitpunkt) {
        const alt = SCHACH_RUNDE.normalisieren(runde);

        if (!SCHACH_RUNDE.darfZiehen(alt, spielerId)) {
            return null;
        }

        /* Was auf dem Zielfeld steht, muss VOR dem Zug abgelesen werden. */
        const geschlagen = SCHACH.artVon(SCHACH.figurAuf(alt.stand, nach));

        const ergebnis = SCHACH.ziehen(alt.stand, von, nach, umwandlung);
        if (!ergebnis) {
            return null;
        }

        const neu = SCHACH_RUNDE.kopieren(alt);
        const farbe = alt.stand.amZug;

        neu.stand = ergebnis.stand;
        neu.zugZaehler = alt.zugZaehler + 1;

        /* Ein Zug beendet jede offene Abstimmung. */
        neu.vorschlag = null;
        neu.vorschlaege = {};

        /*
         * Verlorene Figuren merken — die Wiedergeburt holt sie zurück.
         *
         * Zweimal, weil zwei Fähigkeiten Verschiedenes brauchen: `verloren` nur
         * die Art (Bilanz, Beute, Grundreihen-Wiedergeburt), `gefallen`
         * zusätzlich das Feld (Wiederbelebung an Ort und Stelle).
         */
        if (geschlagen) {
            neu.verloren[SCHACH.gegner(farbe)].push(geschlagen);
            neu.gefallen[SCHACH.gegner(farbe)].push({ art: geschlagen, feld: nach });
        } else if (ergebnis.zug.enPassant) {
            neu.verloren[SCHACH.gegner(farbe)].push("B");

            /* Beim en passant fällt der Bauer NICHT auf dem Zielfeld, sondern
               auf dem Feld, das er beim Doppelschritt übersprungen hat. */
            const geschlagenesFeld = Number.isInteger(ergebnis.zug.enPassantFeld)
                ? ergebnis.zug.enPassantFeld
                : nach;
            neu.gefallen[SCHACH.gegner(farbe)].push({ art: "B", feld: geschlagenesFeld });
        }

        /* Bei der Rochade bewegen sich zwei Figuren — beide bekommen ihren
           Pfeil. */
        const wege = [{ von: von, nach: nach }];
        if (ergebnis.zug.rochade && Number.isInteger(ergebnis.zug.turmVon)) {
            wege.push({ von: ergebnis.zug.turmVon, nach: ergebnis.zug.turmNach });
        }

        /*
         * Der Eintrag wird als OBJEKT gemerkt, nicht über seine Stelle: Ein
         * Riss kann den Zug gleich noch verkürzen (siehe unten), und dann muss
         * genau dieser Eintrag nachgeführt werden. Die Stelle verschiebt sich
         * beim Kürzen des Verlaufs.
         */
        const zugEintrag = {
            text: ergebnis.text,
            wer: wer || "",
            farbe: farbe,
            von: von,
            nach: nach,
            wege: wege,

            /*
             * Der Teleport setzt über alles hinweg (seit v0.98, Wunsch #35):
             * Das Brett zeichnet dann keine Linie, sondern nur Start und Ziel.
             * Die Angabe kommt aus dem ZUG, nicht aus der Geometrie — siehe
             * `SCHACH.wegFelder`.
             */
            ohneWeg: !!ergebnis.zug.ohneWeg
        };

        neu.verlauf.push(zugEintrag);
        SCHACH_RUNDE._verlaufKuerzen(neu);

        /* Würfel einsammeln — auf dem ganzen Weg, nicht nur auf dem Zielfeld. */
        const bericht = {};
        const pechFelder = SCHACH_RUNDE._bonusEinsammeln(
            neu, alt.stand, von, nach, farbe, wer, bericht,
            !!ergebnis.zug.ohneWeg);

        /*
         * Hat der eingesammelte Würfel den weiteren Weg gesperrt, endet der Zug
         * vor dem Hindernis (seit v0.58).
         */
        const amRiss = SCHACH_RUNDE._zugAmRissAbbrechen(neu, alt.stand, von, nach,
            farbe, geschlagen, ergebnis.zug, zugEintrag, pechFelder);

        /*
         * DERSELBE ABBRUCH NACH EINEM STOLPERSTEIN (seit v0.73, Meldung I8).
         *
         * Der Stein hat die Figur bereits zurückgeworfen; was fehlt, ist der
         * Rest eines abgebrochenen Zuges: die geschlagene Figur kommt zurück,
         * ein Bauer bleibt ein Bauer, und der Verlauf nennt das Feld, auf dem
         * die Figur wirklich steht. Der Riss geht vor — er hat die Figur dann
         * schon woanders hingesetzt.
         */
        if (!amRiss && Number.isInteger(bericht.stolperHalt)
            && bericht.stolperHalt !== nach) {

            SCHACH_RUNDE._zugZurueckSetzen(neu, alt.stand, von, nach, farbe,
                geschlagen, zugEintrag, bericht.stolperHalt,
                " — der Zug bricht dort ab");
        }

        /* Und alle paar Züge erscheint ein neuer Würfel. */
        SCHACH_RUNDE._bonusNachziehen(neu);

        /* Ist die Partie damit vorbei? */
        const lage = SCHACH.lage(neu.stand);
        if (lage.art === "matt") {
            neu.ergebnis = lage.sieger;
            neu.laeuft = false;
        } else if (lage.art === "patt" || lage.art === "remis") {
            neu.ergebnis = "remis";
            neu.laeuft = false;
        }

        /*
         * ZURÜCKGEWORFEN INS SCHACH HEISST VERLOREN (seit v0.73, Meldung I9,
         * Nutzer-Entscheidung 09.08.: „weil es eine Unglücksbox ist — diese
         * können zum Schachmatt führen").
         *
         * Damit fällt für UNGLÜCKS-Lootboxen die alte Regel, dass keine
         * Wirkung eine Partie beenden darf. Für Fähigkeiten gilt sie weiter:
         * Die wählt man, ein Unglück trifft einen.
         *
         * Gefragt wird NACH dem Rückwurf und nicht `lage()`: Die kennt nur
         * Matt und Patt, und hier ist es weder das eine noch das andere — der
         * Gegner ist am Zug, und der eigene König steht im Schach. Der Fall
         * trifft jede zurückgeworfene Figur, nicht nur den König: Wer den
         * Block vor dem eigenen König verliert, verliert genauso.
         */
        if (neu.laeuft && Number.isInteger(bericht.stolperHalt)
            && SCHACH.imSchach(neu.stand, farbe)) {

            neu.ergebnis = SCHACH.gegner(farbe);
            neu.laeuft = false;

            neu.verlauf.push({
                text: "Zurückgestolpert ins Schach — "
                    + ((farbe === SCHACH.WEISS) ? "Weiss" : "Schwarz")
                    + " verliert die Partie",
                wer: "",
                farbe: farbe,
                von: -1,
                nach: -1,
                wirkung: "pech",
                felder: [bericht.stolperHalt]
            });
            SCHACH_RUNDE._verlaufKuerzen(neu);
        }

        neu.geaendertAm = (zeitpunkt === undefined) ? Date.now() : zeitpunkt;
        return neu;
    },

    /*
     * DER ZUG BRICHT AM RISS AB (seit v0.58).
     *
     * Ein Unglückswürfel „Erdbeben" reisst den Boden auf, sobald er
     * eingesammelt wird — und eingesammelt wird er seit v0.53 auch im
     * VORBEIZIEHEN. Wer also mit dem Turm über ihn hinweggleitet, öffnet die
     * Löcher mitten in seinem eigenen Weg. Liegt eines davon noch vor ihm,
     * kommt er nicht mehr daran vorbei: Der Zug endet auf dem letzten freien
     * Feld davor.
     *
     * WARUM DAS HIER STEHT UND NICHT IN `SCHACH.zuege`: Es ist keine Frage der
     * Zugerzeugung. Als der Zug gewählt wurde, war der Weg frei — die Sperre
     * entsteht erst währenddessen. `zuege` bleibt damit unverändert; die
     * Anzeige der möglichen Züge lügt nicht, sie kann es nur nicht wissen.
     *
     * DER SCHLAG FÄLLT MIT AUS. Wer sein Ziel nicht erreicht, schlägt dort auch
     * nichts — die geschlagene Figur kommt zurück aufs Brett und aus den
     * Verlustlisten heraus. Alles andere wäre ein Angriff aus der Ferne.
     *
     * Ausgeschlossen sind drei Fälle:
     *   - Sprünge und Ein-Feld-Züge: Dort gibt es keinen Weg zum Abbrechen.
     *   - die Rochade: Dabei bewegen sich zwei Figuren, und der König geht
     *     nie über einen Würfel (dazwischen darf nichts stehen).
     *   - ein Würfel, der die Brettgrösse geändert hat (Ausdehnung, Einsturz):
     *     Danach zeigen alle gemerkten Feldnummern woanders hin.
     */
    _zugAmRissAbbrechen(runde, altStand, von, nach, farbe, geschlagen, zug,
        zugEintrag, pechFelder) {

        if (zug && zug.rochade) {
            return false;
        }
        if (SCHACH.felderVon(runde.stand) !== SCHACH.felderVon(altStand)) {
            return false;
        }
        if (!Array.isArray(pechFelder) || pechFelder.length === 0) {
            return false;
        }

        /* Ein Teleport hat keinen Weg, auf dem etwas aufreissen könnte — er
           setzt über alles hinweg (seit v0.98). */
        const weg = SCHACH.betreteneFelder(altStand, von, nach,
            !!(zug && zug.ohneWeg));
        if (weg.length < 2) {
            return false;
        }

        /*
         * AB WO ZÄHLT EINE SPERRE? Erst ab dem Feld, auf dem der Würfel lag.
         *
         * Vorher war die Figur schon vorbei — ein Riss, der HINTER ihr
         * aufgeht, hält sie nicht auf. Genau das ist beim Bauen zuerst
         * passiert: Der Turm blieb auf seinem Startfeld stehen, weil das
         * Erdbeben zufällig auch ein Feld hinter ihm erwischt hatte.
         */
        let ab = -1;
        for (const feld of pechFelder) {
            const stelle = weg.indexOf(feld);
            if (stelle !== -1 && (ab === -1 || stelle < ab)) {
                ab = stelle;
            }
        }
        if (ab === -1) {
            return false;
        }

        /* Das erste gesperrte Feld HINTER dem Würfel. */
        let sperre = -1;
        for (let stelle = ab + 1; stelle < weg.length; stelle++) {
            if (SCHACH.gesperrt(runde.stand, weg[stelle])) {
                sperre = stelle;
                break;
            }
        }
        if (sperre === -1) {
            return false;
        }

        /*
         * Wo bleibt die Figur stehen? Auf dem letzten freien Feld davor —
         * notfalls auf ihrem Startfeld. Rückwärts gesucht, weil der Riss auch
         * mehrere Felder hintereinander treffen kann und die Figur nie AUF
         * einem Riss enden darf.
         */
        let halt = -1;
        for (let stelle = sperre - 1; stelle >= 0 && halt === -1; stelle--) {
            if (!SCHACH.gesperrt(runde.stand, weg[stelle])) {
                halt = weg[stelle];
            }
        }
        if (halt === -1 && !SCHACH.gesperrt(runde.stand, von)) {
            halt = von;
        }
        if (halt === -1 || halt === nach) {
            /* Nirgends Platz: Dann bleibt der Zug lieber, wie er war — eine
               Figur ohne Feld wäre schlimmer als ein Zug zu viel. */
            return false;
        }

        SCHACH_RUNDE._zugZurueckSetzen(runde, altStand, von, nach, farbe,
            geschlagen, zugEintrag, halt, " — der Zug bricht davor ab");

        return true;
    },

    /*
     * EIN ZUG, DER SEIN ZIEL NICHT ERREICHT HAT (seit v0.58, seit v0.73
     * gemeinsam genutzt).
     *
     * Zwei Unglückswürfel enden hier: der RISS, der den Weg sperrt, und der
     * STOLPERSTEIN, der die Figur zurückwirft. Wo die Figur stehen bleibt,
     * rechnet jeder für sich aus (`halt`) — was danach zu tun ist, ist bei
     * beiden dasselbe:
     *
     *   - Die URSPRÜNGLICHE Figur steht auf dem Haltefeld: Ein Bauer, der sein
     *     Umwandlungsfeld nicht erreicht, bleibt ein Bauer.
     *   - **Der Schlag fällt mit aus.** Wer sein Ziel nicht erreicht, schlägt
     *     dort nichts — die geschlagene Figur kommt zurück aufs Brett und aus
     *     den Verlustlisten heraus. Alles andere wäre ein Angriff aus der
     *     Ferne.
     *   - Der Verlaufseintrag wird nachgeführt, sonst wandert die Figur am
     *     Bildschirm auf ein Feld, auf dem sie gar nicht steht.
     */
    _zugZurueckSetzen(runde, altStand, von, nach, farbe, geschlagen, zugEintrag,
        halt, grund) {

        const urspruenglich = SCHACH.figurAuf(altStand, von);
        let brett = SCHACH._brettMit(runde.stand.brett, nach, ".");
        brett = SCHACH._brettMit(brett, halt, urspruenglich);

        if (geschlagen) {
            const zurueck = (farbe === SCHACH.WEISS)
                ? geschlagen.toLowerCase()
                : geschlagen;

            brett = SCHACH._brettMit(brett, nach, zurueck);
            SCHACH_RUNDE._verlustZuruecknehmen(runde, SCHACH.gegner(farbe),
                geschlagen, nach);
        }

        runde.stand = Object.assign({}, runde.stand, {
            brett: brett,
            enPassant: "",

            /* Eine geliehene Figur nimmt ihren Eintrag mit — auch auf dem
               verkürzten Weg (siehe `_geliehenNachfuehren`). */
            geliehen: SCHACH.geliehene(runde.stand).map((eintrag) =>
                (eintrag.feld === nach) ? { feld: halt, bis: eintrag.bis } : eintrag)
        });

        const breite = SCHACH.breiteVon(runde.stand);
        const hoehe = SCHACH.hoeheVon(runde.stand);

        zugEintrag.nach = halt;
        zugEintrag.wege = [{ von: von, nach: halt }];
        zugEintrag.text += ", abgebrochen auf " + SCHACH.feldName(halt, breite, hoehe);

        /* Und der Unglückswürfel erklärt, warum: Sein Eintrag steht am Ende
           des Verlaufs und bekommt das Haltefeld dazu. */
        const letzter = runde.verlauf[runde.verlauf.length - 1];
        if (letzter && letzter.wirkung === "pech") {
            letzter.text += grund;

            if (letzter.felder.indexOf(halt) === -1) {
                letzter.felder.push(halt);
            }
        }
    },

    /*
     * Nimmt einen Verlust zurück, wenn der Schlag doch nicht stattgefunden hat
     * (Zugabbruch am Riss). Entfernt je einen Eintrag aus beiden Listen —
     * `gefallen` über das Feld, `verloren` über die Art.
     */
    _verlustZuruecknehmen(runde, farbe, art, feld) {
        const gefallen = runde.gefallen[farbe] || [];

        for (let stelle = gefallen.length - 1; stelle >= 0; stelle--) {
            if (gefallen[stelle].feld === feld && gefallen[stelle].art === art) {
                gefallen.splice(stelle, 1);
                break;
            }
        }

        const verloren = runde.verloren[farbe] || [];
        const stelle = verloren.lastIndexOf(art);

        if (stelle !== -1) {
            verloren.splice(stelle, 1);
        }
    },

    /* ---------------------------------------------------------------- *
     * Abstimmung im Team (nur wenn `regeln.einigkeit` gesetzt ist)
     *
     * Die Hausregel lautet sonst: Wer zuerst zieht, hat gezogen. Wer diese
     * Partie mit Einigkeit angelegt hat, will genau das nicht.
     *
     * SEIT v0.83.0 OHNE KNÖPFE (Nutzer-Ansage 26.08.2026): Jeder aus dem
     * Team macht seinen Zug einfach selbst am Brett. Er wird nicht
     * ausgeführt, sondern als SEIN Vorschlag gemerkt (`vorschlaege`, je
     * Spieler der letzte); die Mitspieler sehen ihn als durchsichtige Figur
     * mit grünem Laufweg. Ausgeführt wird, sobald ALLE aus dem Team am Zug
     * DASSELBE vorgeschlagen haben — wer anderer Meinung ist, macht einfach
     * seinen eigenen Zug, und weiter geht es erst, wenn alle dasselbe tun.
     * Bis v0.82.0 gab es stattdessen EINEN Vorschlag mit
     * „Einverstanden"-Knopf und Stimmen-Liste (`vorschlag`, bleibt als
     * Altbestand im Datenvertrag).
     *
     * DIE FRIST BLEIBT ALS RÜCKFALL (Entscheidung 26.08.2026, Hintergrund:
     * `entscheidungen\offen-und-abgelehnt.md`, „Warum die Abstimmung eine
     * Frist braucht"): Ohne sie stünde das Team still, sobald EINER aufhört
     * mitzuspielen — bei einer Partie über Tage der Normalfall. Nach Ablauf
     * zählen nur die ABGEGEBENEN Vorschläge: Sind die sich einig, wird
     * gezogen, und wer nichts abgegeben hat, bekommt seinen Strich
     * (`versaeumt`, verkürzt die nächste Frist). Sind sich die Abgebenden
     * nicht einig, tut auch die Uhr nichts.
     *
     * Die Vorschläge stehen im gemeinsamen Stand — das eigene Team muss sie
     * ja sehen. DER BILDSCHIRM ZEIGT SIE NUR DEM EIGENEN TEAM; dass der
     * Gegner die Daten lesen KÖNNTE, ist der Preis dieser Einstellung und
     * war es schon beim alten Verfahren.
     * ---------------------------------------------------------------- */

    brauchtEinigkeit(runde) {
        return SCHACH_RUNDE.normalisieren(runde).regeln.einigkeit === true;
    },

    /*
     * Wie lange das Team für diese Abstimmung Zeit hat (in Millisekunden).
     *
     * Maßgeblich ist der Säumigste: Wer wiederholt nicht abstimmt, verkürzt die
     * Frist für alle — sonst könnte ein Team mit zwei Leuten gar nichts mehr
     * tun, sobald einer aufhört mitzuspielen.
     */
    fristFuer(runde, farbe) {
        const stand = SCHACH_RUNDE.normalisieren(runde);
        let hoechste = 0;

        for (const id of stand.teams[farbe]) {
            hoechste = Math.max(hoechste, stand.versaeumt[id] || 0);
        }

        const stufe = Math.min(
            Math.floor(hoechste / SCHACH_RUNDE.FRIST_NACH_VERSAEUMNISSEN),
            SCHACH_RUNDE.FRIST_SEKUNDEN.length - 1);

        return SCHACH_RUNDE.FRIST_SEKUNDEN[stufe] * 1000;
    },

    /*
     * Merkt den Zug eines Spielers als SEINEN Vorschlag — ein weiterer Zug
     * desselben Spielers ersetzt ihn. Ist man allein im Team (oder ohne
     * Einigkeitspflicht), wird sofort gezogen — Einigkeit mit sich selbst
     * ist keine Abstimmung wert.
     * Liefert die neue Runde (oder gleich das Zug-Ergebnis) oder null.
     */
    zugVorschlagen(runde, spielerId, von, nach, umwandlung, wer, zeitpunkt) {
        const alt = SCHACH_RUNDE.normalisieren(runde);

        if (!SCHACH_RUNDE.darfZiehen(alt, spielerId)) {
            return null;
        }
        if (!SCHACH_RUNDE.brauchtEinigkeit(alt)) {
            return SCHACH_RUNDE.ziehen(alt, spielerId, von, nach, umwandlung, wer, zeitpunkt);
        }

        const farbe = SCHACH_RUNDE.teamVon(alt, spielerId);
        if (alt.teams[farbe].length <= 1) {
            return SCHACH_RUNDE.ziehen(alt, spielerId, von, nach, umwandlung, wer, zeitpunkt);
        }

        /* Der Zug muss regelkonform sein — sonst schlägt jemand etwas vor,
           das gar nicht geht. */
        if (!SCHACH.ziehen(alt.stand, von, nach, umwandlung)) {
            return null;
        }

        const wann = (zeitpunkt === undefined) ? Date.now() : zeitpunkt;
        const neu = SCHACH_RUNDE.kopieren(alt);

        neu.vorschlaege[spielerId] = {
            art: "zug",
            faehigkeit: "",
            zielFeld: -1,
            von: von,
            nach: nach,
            umwandlung: umwandlung || "D",
            wahl: "",
            name: wer || "",
            zugZaehler: alt.zugZaehler,
            wann: wann,
            frist: wann + SCHACH_RUNDE.fristFuer(alt, farbe)
        };

        /* Wer selbst zieht, ist dabei: Sein Säumnis-Zähler beginnt von vorn,
           und damit gilt beim nächsten Mal wieder die volle Frist. */
        delete neu.versaeumt[spielerId];

        return SCHACH_RUNDE._vorschlaegePruefen(neu, farbe, wann);
    },

    /*
     * Schlägt den Einsatz einer Fähigkeit vor. Wie beim Zug: allein im Team
     * wird sofort eingesetzt, sonst wird abgestimmt.
     */
    faehigkeitVorschlagen(runde, spielerId, art, zielFeld, wer, zeitpunkt, umwandlung, wahl) {
        const alt = SCHACH_RUNDE.normalisieren(runde);

        if (!SCHACH_RUNDE.darfEinsetzen(alt, spielerId, art)) {
            return null;
        }

        const farbe = SCHACH_RUNDE.teamVon(alt, spielerId);
        const beschreibung = SCHACH_VARIANTEN.FAEHIGKEITEN[art];

        /*
         * Über eine Fähigkeit, die im Gegenzug geht, wird NICHT abgestimmt.
         *
         * Sie lebt davon, schnell zu sein: Bis das Team sich einig ist, hat
         * der Gegner längst gezogen. Und die Abstimmung selbst läuft über den
         * Zugzähler — der wandert beim gegnerischen Zug weiter und macht
         * jeden offenen Vorschlag ungültig.
         */
        if (!SCHACH_RUNDE.brauchtEinigkeit(alt) || alt.teams[farbe].length <= 1
            || beschreibung.imGegenzug) {
            return SCHACH_RUNDE.faehigkeitEinsetzen(
                alt, spielerId, art, zielFeld, wer, zeitpunkt, umwandlung, wahl);
        }

        /* Erst prüfen, ob sie überhaupt einsetzbar wäre. */
        if (!SCHACH_RUNDE.faehigkeitEinsetzen(alt, spielerId, art, zielFeld, wer,
            zeitpunkt, umwandlung, wahl)) {
            return null;
        }

        const wann = (zeitpunkt === undefined) ? Date.now() : zeitpunkt;
        const neu = SCHACH_RUNDE.kopieren(alt);

        neu.vorschlaege[spielerId] = {
            art: "faehigkeit",
            faehigkeit: art,
            zielFeld: Number.isInteger(zielFeld) ? zielFeld : -1,
            von: -1,
            nach: -1,

            /* Auch die Wahl beim Bauernschub gehört in den Vorschlag: Einig
               ist das Team erst über die FERTIGE Handlung, nicht die halbe. */
            umwandlung: (SCHACH.UMWANDLUNGEN.indexOf(umwandlung) !== -1)
                ? umwandlung : "D",

            /*
             * Und die zweite Zusatzwahl (seit v0.80): heute nur die Lage der
             * Mauer („senkrecht"), sonst leer. Sie gehoert aus demselben Grund
             * in den Vorschlag wie die Umwandlung — sonst meint einer die
             * waagerechte Mauer und bekommt eine senkrechte.
             */
            wahl: (typeof wahl === "string") ? wahl : "",

            name: wer || "",
            zugZaehler: alt.zugZaehler,
            wann: wann,
            frist: wann + SCHACH_RUNDE.fristFuer(alt, farbe)
        };

        /* Wie beim Zug: Wer vorschlägt, ist dabei. */
        delete neu.versaeumt[spielerId];

        return SCHACH_RUNDE._vorschlaegePruefen(neu, farbe, wann);
    },

    /*
     * HIER STANDEN BIS v0.82.0 `zugMittragen` und `vorschlagVerwerfen` — die
     * Knöpfe „Einverstanden" und „Verwerfen" der alten Abstimmungs-Karte.
     * Seit v0.83.0 stimmt man zu, indem man denselben Zug selbst macht, und
     * widerspricht, indem man einen anderen vorschlägt (Nutzer-Ansage
     * 26.08.2026).
     */

    /*
     * Die offenen Vorschläge eines Teams — nur die zur aktuellen Zugnummer;
     * was von vor dem letzten Zug übrig ist, zählt nicht. Auch die Anzeige
     * fragt hier, nie `vorschlaege` direkt.
     */
    offeneVorschlaege(runde, farbe) {
        const stand = SCHACH_RUNDE.normalisieren(runde);

        return stand.teams[farbe]
            .filter((id) => stand.vorschlaege[id]
                && stand.vorschlaege[id].zugZaehler === stand.zugZaehler)
            .map((id) => ({ id: id, vorschlag: stand.vorschlaege[id] }));
    },

    /* Sagen zwei Vorschläge dasselbe? Verglichen wird die HANDLUNG —
       Zug: von/nach/Umwandlung, Fähigkeit: Art/Ziel/Wahl/Umwandlung. */
    _vorschlagGleich(a, b) {
        if (a.art !== b.art) {
            return false;
        }
        if (a.art === "faehigkeit") {
            return a.faehigkeit === b.faehigkeit
                && a.zielFeld === b.zielFeld
                && a.wahl === b.wahl
                && a.umwandlung === b.umwandlung;
        }
        return a.von === b.von
            && a.nach === b.nach
            && a.umwandlung === b.umwandlung;
    },

    /*
     * Prüft nach jedem neuen Vorschlag (und beim Fristablauf), ob gezogen
     * wird. Zwei Wege zum Zug:
     *
     *   - ALLE aus dem Team haben denselben Vorschlag abgegeben.
     *   - Die Frist ist um und die ABGEGEBENEN sind sich einig — die
     *     Säumigen werden übergangen und bekommen ihren Strich.
     *
     * Sonst kommt die Runde unverändert (nur mit dem neuen Vorschlag)
     * zurück und das Team sieht, wer was will.
     */
    _vorschlaegePruefen(runde, farbe, jetzt) {
        const offen = SCHACH_RUNDE.offeneVorschlaege(runde, farbe);

        const einig = offen.length > 0 && offen.every(
            (eintrag) => SCHACH_RUNDE._vorschlagGleich(
                eintrag.vorschlag, offen[0].vorschlag));

        if (!einig) {
            runde.geaendertAm = jetzt;
            return runde;
        }

        const alleDa = (offen.length === runde.teams[farbe].length);
        const fristUm = jetzt >= Math.min(
            ...offen.map((eintrag) => eintrag.vorschlag.frist));

        if (!alleDa && !fristUm) {
            runde.geaendertAm = jetzt;
            return runde;
        }

        if (!alleDa) {
            /* Die Frist übergeht die Säumigen — mit Strich. */
            for (const id of runde.teams[farbe]) {
                if (!runde.vorschlaege[id]
                    || runde.vorschlaege[id].zugZaehler !== runde.zugZaehler) {
                    runde.versaeumt[id] = (runde.versaeumt[id] || 0) + 1;
                }
            }
        }

        /* Ausgeführt wird der FRÜHESTE Vorschlag — inhaltlich sind ohnehin
           alle gleich, aber Name und Kennung im Verlauf sollen dem gehören,
           der zuerst gezogen hat. */
        let erster = offen[0];
        for (const eintrag of offen) {
            if (eintrag.vorschlag.wann < erster.vorschlag.wann) {
                erster = eintrag;
            }
        }

        return SCHACH_RUNDE._vorschlaegeAusfuehren(runde, erster, jetzt);
    },

    /*
     * Die Frist ist abgelaufen: Sind die ABGEGEBENEN sich einig, geht der
     * Zug durch — ohne die Säumigen. Sind sich die Abgebenden NICHT einig,
     * tut die Uhr nichts: Uneinigkeit unter Anwesenden löst kein Zeitablauf,
     * nur das Einigwerden.
     *
     * Ausgelöst wird das vom ERSTEN Gerät, das den Ablauf bemerkt; die
     * Prüfung über den Zugzähler beim Schreiben sorgt dafür, dass es
     * trotzdem nur einmal passiert.
     */
    fristAbgelaufen(runde, jetzt) {
        const alt = SCHACH_RUNDE.normalisieren(runde);
        const farbe = alt.stand.amZug;
        const offen = SCHACH_RUNDE.offeneVorschlaege(alt, farbe);

        /* Nichts offen — oder alle da: Dann hat schon der Vorschlag selbst
           entschieden, die Uhr hat nichts zu tun. */
        if (offen.length === 0 || offen.length >= alt.teams[farbe].length) {
            return null;
        }
        if (jetzt < Math.min(...offen.map((eintrag) => eintrag.vorschlag.frist))) {
            return null;
        }
        if (!offen.every((eintrag) => SCHACH_RUNDE._vorschlagGleich(
            eintrag.vorschlag, offen[0].vorschlag))) {
            return null;
        }

        return SCHACH_RUNDE._vorschlaegePruefen(SCHACH_RUNDE.kopieren(alt), farbe, jetzt);
    },

    /* Führt die beschlossene Handlung aus — Zug oder Fähigkeit. */
    _vorschlaegeAusfuehren(runde, eintrag, zeitpunkt) {
        const vorschlag = eintrag.vorschlag;

        /* Erst aufräumen: Im Ergebnis soll kein alter Vorschlag mehr stehen. */
        runde.vorschlaege = {};

        const ergebnis = (vorschlag.art === "faehigkeit")
            ? SCHACH_RUNDE.faehigkeitEinsetzen(runde, eintrag.id,
                vorschlag.faehigkeit, vorschlag.zielFeld, vorschlag.name,
                zeitpunkt, vorschlag.umwandlung, vorschlag.wahl)
            : SCHACH_RUNDE.ziehen(runde, eintrag.id, vorschlag.von,
                vorschlag.nach, vorschlag.umwandlung, vorschlag.name, zeitpunkt);

        if (!ergebnis) {
            /* Inzwischen nicht mehr möglich — die Vorschläge fallen weg. */
            runde.geaendertAm = (zeitpunkt === undefined) ? Date.now() : zeitpunkt;
            return runde;
        }

        /* Die Säumnis-Zähler aus der Abstimmung müssen mitgenommen werden:
           `ziehen` und `faehigkeitEinsetzen` arbeiten auf einer Kopie. */
        ergebnis.versaeumt = runde.versaeumt;
        return ergebnis;
    },

    /* Neue Partie: Brett zurück, Teams bleiben, Bereitschaft muss neu kommen. */
    neuePartie(runde, zeitpunkt) {
        const neu = SCHACH_RUNDE.kopieren(runde);
        const wann = (zeitpunkt === undefined) ? Date.now() : zeitpunkt;

        neu.stand = SCHACH.neuerStand(neu.variante);

        /* Eine zweite Partie in derselben Runde bekommt eine ANDERE Armee —
           sonst spielte man dieselbe Aufstellung noch einmal. Deshalb geht der
           Zeitpunkt in die Rechnung ein. Das Brett steht danach im gemeinsamen
           Stand; nachgerechnet wird es nirgends mehr, es kann also gar nicht
           auseinanderlaufen. */
        SCHACH_RUNDE.kreuzAufstellen(neu, "|neu|" + wann);
        SCHACH_RUNDE.armeeAufstellen(neu, "|neu|" + wann);

        /* Ohne Haken bleibt die feste Aufstellung stehen - der Regler
           schneidet sie auf seine Breite zu (seit v0.100). */
        SCHACH_RUNDE.aufstellungAnpassen(neu);

        neu.zugZaehler = 0;
        neu.laeuft = false;
        neu.ergebnis = "";
        neu.bereit = { weiss: false, schwarz: false };
        /* Auch die Zusage zur Aufstellung (v0.62.0) — die Revanche stellt ein
           neues Brett hin, und dazu hat noch niemand ja gesagt. */
        neu.aufstellungBereit = { weiss: false, schwarz: false };
        neu.faehigkeiten = { weiss: [], schwarz: [] };
        neu.bonusGesammelt = [];
        neu.bonus = [];
        neu.bonusFassung = SCHACH_RUNDE.BONUS_FASSUNG;
        /* Auch die Abklingzeiten fangen von vorn an — der Takt tut es ja
           ebenfalls (neuer Stand). */
        neu.stufeZuletzt = {};
        neu.verloren = { weiss: [], schwarz: [] };
        neu.verlauf = [];

        neu.geaendertAm = wann;
        return neu;
    },

    /* Aufgeben — die andere Seite gewinnt. */
    aufgeben(runde, farbe, zeitpunkt) {
        const neu = SCHACH_RUNDE.kopieren(runde);

        if (farbe !== "weiss" && farbe !== "schwarz") {
            return neu;
        }
        if (!neu.laeuft) {
            return neu;
        }

        neu.ergebnis = (farbe === "weiss") ? "schwarz" : "weiss";
        neu.laeuft = false;
        neu.verlauf.push({
            text: ((farbe === "weiss") ? "Weiss" : "Schwarz") + " gibt auf",
            wer: "",
            farbe: farbe,
            von: -1,
            nach: -1
        });

        neu.geaendertAm = (zeitpunkt === undefined) ? Date.now() : zeitpunkt;
        return neu;
    },

    /* Umbenennen — nur Beiwerk, ändert nichts am Spiel. */
    umbenennen(runde, titel, zeitpunkt) {
        const neu = SCHACH_RUNDE.kopieren(runde);
        neu.titel = String(titel || "").trim().substring(0, 40);
        neu.geaendertAm = (zeitpunkt === undefined) ? Date.now() : zeitpunkt;
        return neu;
    },

    /* Kurzer Satz über den Stand der Partie, für die Übersicht. */
    kurzfassung(runde) {
        const stand = SCHACH_RUNDE.normalisieren(runde);

        if (stand.ergebnis === "remis") {
            return "Unentschieden";
        }
        if (stand.ergebnis) {
            return (stand.ergebnis === "weiss") ? "Weiss hat gewonnen" : "Schwarz hat gewonnen";
        }
        if (stand.laeuft) {
            return ((stand.stand.amZug === "weiss") ? "Weiss" : "Schwarz")
                + " ist am Zug (Zug " + stand.stand.zugNummer + ")";
        }
        if (stand.teams.weiss.length === 0 && stand.teams.schwarz.length === 0) {
            return "Wartet auf Mitspieler";
        }
        return "Noch nicht gestartet";
    },

    /* ---------------------------------------------------------------- *
     * Vergleich (steuert das Neuzeichnen)
     * ---------------------------------------------------------------- */

    inhaltGleich(a, b) {
        const einsA = SCHACH_RUNDE.normalisieren(a);
        const einsB = SCHACH_RUNDE.normalisieren(b);

        return einsA.id === einsB.id
            && einsA.titel === einsB.titel
            && einsA.stand.brett === einsB.stand.brett
            && einsA.stand.amZug === einsB.stand.amZug
            && einsA.stand.sprungAktiv === einsB.stand.sprungAktiv
            && einsA.stand.extraZug === einsB.stand.extraZug
            && einsA.zugZaehler === einsB.zugZaehler
            && einsA.laeuft === einsB.laeuft
            && einsA.ergebnis === einsB.ergebnis
            && einsA.bereit.weiss === einsB.bereit.weiss
            && einsA.bereit.schwarz === einsB.bereit.schwarz
            && einsA.teams.weiss.join(",") === einsB.teams.weiss.join(",")
            && einsA.teams.schwarz.join(",") === einsB.teams.schwarz.join(",")
            && einsA.faehigkeiten.weiss.join(",") === einsB.faehigkeiten.weiss.join(",")
            && einsA.faehigkeiten.schwarz.join(",") === einsB.faehigkeiten.schwarz.join(",")
            && SCHACH_RUNDE._vorschlagText(einsA) === SCHACH_RUNDE._vorschlagText(einsB)
            && SCHACH_RUNDE._bonusText(einsA) === SCHACH_RUNDE._bonusText(einsB)
            && einsA.stand.schildFeld === einsB.stand.schildFeld
            && einsA.stand.fesselFeld === einsB.stand.fesselFeld;
    },

    /* Die offenen Vorschläge als Zeichenkette — ändert sich einer, wird neu
       gezeichnet. Bis v0.82.0 stand hier der EINE Vorschlag samt Stimmen. */
    _vorschlagText(runde) {
        return Object.keys(runde.vorschlaege).sort()
            .map((id) => {
                const dessen = runde.vorschlaege[id];
                return id + ":" + dessen.art + ":" + dessen.faehigkeit
                    + ":" + dessen.zielFeld + ":" + dessen.von + ">" + dessen.nach
                    + ":" + dessen.umwandlung + ":" + dessen.wahl
                    + "@" + dessen.zugZaehler;
            })
            .join(",");
    },

    _bonusText(runde) {
        return runde.bonus
            .map((eintrag) => eintrag.feld + ":" + eintrag.art + ":" + (eintrag.stufe || ""))
            .sort().join(",");
    },

    /*
     * Die Seltenheitsstufe eines Würfels auf dem Brett — für die Farbe, in der
     * er gezeichnet wird.
     *
     * Seit v3.6 trägt ein Fähigkeitswürfel nur noch seine Stufe; ältere und
     * alle Unglückswürfel tragen ihre Art. Beides muss dieselbe Frage
     * beantworten, deshalb steht sie hier an einer Stelle und nicht dreimal
     * im Bildschirm-Code.
     */
    bonusStufe(bonus) {
        if (!bonus) {
            return SCHACH_VARIANTEN.STUFE_UNBEKANNT;
        }
        if (bonus.pech) {
            return SCHACH_VARIANTEN.pechStufeVon(bonus.art);
        }
        if (bonus.art) {
            return SCHACH_VARIANTEN.stufeVon(bonus.art);
        }
        return SCHACH_VARIANTEN.STUFEN.find((stufe) => stufe.id === bonus.stufe)
            || SCHACH_VARIANTEN.STUFE_UNBEKANNT;
    }
};

/* Für die Tests ausserhalb des Browsers. SCHACH und SCHACH_VARIANTEN müssen
   dort vorher als globale Größen bereitstehen — genau wie im Browser. */
if (typeof module !== "undefined" && module.exports) {
    module.exports = SCHACH_RUNDE;
}
