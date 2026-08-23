/*
 * schach-runde.js — EINE Partie mit ihren beiden Teams.
 *
 * schach.js kennt nur die Regeln; hier kommt dazu, WER ziehen darf und wie der
 * gemeinsame Stand aussieht. Auch diese Datei ist ohne Browser testbar.
 *
 * Seit v1.4 laufen mehrere Partien nebeneinander. Die Sammlung aller Partien
 * liegt in schach-tafel.js — diese Datei kennt immer nur eine einzelne.
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
                einigkeit: false
            },

            /*
             * Der Vorschlag, über den gerade abgestimmt wird (nur bei
             * `einigkeit`). Er trägt entweder einen Zug oder eine Fähigkeit:
             *
             *   { art: "zug", von, nach, umwandlung, wer, name, zugZaehler,
             *     stimmen: [ids], frist: <Zeitpunkt in ms> }
             *   { art: "faehigkeit", faehigkeit, zielFeld, … }
             */
            vorschlag: null,

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
            runde.regeln.armeeStaerke);

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

    /* Ein Brett-Stand mit gewürfelten Armeen auf beiden Seiten. */
    _armeeStand(stand, id, getrennt, staerke) {
        const variante = SCHACH.varianteVon(stand);
        const breite = SCHACH.breiteVon(stand);
        const hoehe = SCHACH.hoeheVon(stand);

        if (variante.kreuz) {
            return SCHACH_RUNDE._armeeStandKreuz(stand, id, getrennt, staerke);
        }

        const zeichen = [];
        for (let feld = 0; feld < breite * hoehe; feld++) {
            zeichen.push(".");
        }

        for (const farbe of [SCHACH.WEISS, SCHACH.SCHWARZ]) {
            const felder = SCHACH_RUNDE._armeeFelder(variante, farbe, staerke);
            const arten = SCHACH_RUNDE._armeeFiguren(
                id, farbe, variante, getrennt, undefined, staerke, felder.length);
            const anzahl = Math.min(felder.length, arten.length);

            for (let stelle = 0; stelle < anzahl; stelle++) {
                zeichen[felder[stelle]] = (farbe === SCHACH.WEISS)
                    ? arten[stelle] : arten[stelle].toLowerCase();
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
    _armeeStandKreuz(stand, id, getrennt, staerke) {
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
                    id, farbe, variante, getrennt, seite, staerke, felder.length);
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
     * Bonusfelder und Fähigkeiten
     * ---------------------------------------------------------------- */

    /*
     * Was eine Figurenart wert ist — für die Bilanz unter dem Brett.
     * Die üblichen Schachwerte; der König zählt nicht mit, er kann nicht
     * verloren gehen (ausser auf dem Doppelbrett, wo die Partie dann ohnehin
     * vorbei ist).
     */
    FIGUR_WERT: { B: 1, S: 3, L: 3, T: 5, D: 9, K: 0 },

    /*
     * Bilanz einer Seite: was sie erbeutet hat, was sie verloren hat, und die
     * Differenz nach Figurenwert.
     */
    bilanz(runde, farbe) {
        const stand = SCHACH_RUNDE.normalisieren(runde);
        const gegner = SCHACH.gegner(farbe);

        /* Was der Gegner verloren hat, hat diese Seite geschlagen. */
        const geschlagen = stand.verloren[gegner] || [];
        const verloren = stand.verloren[farbe] || [];

        const wert = (liste) => liste.reduce(
            (summe, art) => summe + (SCHACH_RUNDE.FIGUR_WERT[art] || 0), 0);

        return {
            geschlagen: geschlagen.slice(),
            verloren: verloren.slice(),
            punkte: wert(geschlagen) - wert(verloren)
        };
    },

    /*
     * WAS EINE SEITE GERADE AUF DEM BRETT STEHEN HAT, nach Figurenwert
     * (seit v0.76).
     *
     * Gemeldet als „der Figurenzähler plus/minus ist nicht richtig, bitte von
     * bekannten Schach-Apps abschauen". Genau das ist der Unterschied: Die
     * bekannten Apps zählen die Figuren, die DA SIND, nicht die geschlagenen.
     *
     * Bis v0.75 rechnete der Zähler unter dem Brett `bilanz.punkte` — Beute
     * minus eigene Verluste. In gewöhnlichem Schach ist das dasselbe; hier
     * nicht, denn hier entsteht und verschwindet Material, ohne dass jemand
     * schlägt:
     *
     *     Umwandlung        aus einem Bauern wird eine Dame (+8)
     *     Verstärkung       eine Aufwertungskette bis zum König
     *     Wiedergeburt,     eine gefallene Figur kommt zurück
     *     Wiederbelebung,
     *     Friedhof
     *     Nachschub         ein Bauer aus dem Nichts
     *     Spiegel, Handel   Material wechselt die Seite oder die Art
     *     Einsturz          eine ganze Brettseite bricht weg
     *
     * Nach jedem dieser Vorgänge stimmte die Zahl unter dem Brett nicht mehr
     * mit dem überein, was man sah. Aus der STELLUNG gerechnet stimmt sie
     * immer — und zwar ohne dass irgendeine Fähigkeit etwas nachtragen muss.
     *
     * Der König zählt mit 0 (`FIGUR_WERT`), wie in jeder Schach-App: Ein
     * zweiter König ist ein Leben, kein Materialvorteil.
     */
    materialWert(runde, farbe) {
        const stand = SCHACH_RUNDE.normalisieren(runde).stand;
        let summe = 0;

        for (let feld = 0; feld < SCHACH.felderVon(stand); feld++) {
            const figur = SCHACH.figurAuf(stand, feld);

            if (figur !== "." && SCHACH.farbeVon(figur) === farbe) {
                summe += (SCHACH_RUNDE.FIGUR_WERT[SCHACH.artVon(figur)] || 0);
            }
        }

        return summe;
    },

    /* Um wie viel Figurenwert diese Seite gerade vorn liegt. Negativ heisst
       hinten — der Bildschirm zeigt wie in den bekannten Apps nur die
       führende Seite an. */
    materialVorsprung(runde, farbe) {
        const stand = SCHACH_RUNDE.normalisieren(runde);

        return SCHACH_RUNDE.materialWert(stand, farbe)
            - SCHACH_RUNDE.materialWert(stand, SCHACH.gegner(farbe));
    },

    /* Wie viele Wendepunkte die Rückschau höchstens zeigt (seit v0.61). */
    RUECKSCHAU_HOECHSTENS: 6,

    /*
     * DIE RÜCKSCHAU (seit v0.61, Wunsch #7: „Recap einbauen vor dem Gewinnen
     * oder Verlieren, dass man sieht, warum man verloren hat").
     *
     * Sie beantwortet drei Fragen, und zwar HIER im Modell — der Bildschirm
     * zeigt nur an. Wer entscheidet, was ein Wendepunkt war, entscheidet über
     * die Erzählung der Partie, und das ist eine Regel wie jede andere.
     *
     *   1. WIE ging es aus? Nicht aus einem gemerkten Vermerk, sondern aus der
     *      Schlussstellung: `SCHACH.lage` sagt Matt oder Patt. Sagt sie nichts
     *      davon, obwohl ein Ergebnis feststeht, hat jemand aufgegeben.
     *   2. WAS hat es gekostet? Der Figurenwert dessen, was jede Seite verloren
     *      hat — dieselbe Rechnung wie bei der Beute (`FIGUR_WERT`).
     *   3. WAS gab den Ausschlag? Die Einträge des Verlaufs, die etwas
     *      Aussergewöhnliches waren: eingesetzte Fähigkeiten und
     *      Unglückswürfel. Gewöhnliche Züge stehen nicht darin — sie sind der
     *      Verlauf, nicht die Wendung.
     *
     * Warum nur die LETZTEN paar: Der Verlauf ist ohnehin gekürzt
     * (`VERLAUF_LAENGE`), und was am Ende passierte, hat die Partie
     * entschieden. Ausgegeben wird trotzdem in der Reihenfolge, in der es
     * geschah — eine Rückschau, die rückwärts erzählt, versteht niemand.
     */
    rueckschau(runde, farbe) {
        const stand = SCHACH_RUNDE.normalisieren(runde);
        const lage = SCHACH.lage(stand.stand);

        const ausgang = (!stand.ergebnis)
            ? "offen"
            : ((stand.ergebnis === "remis")
                ? "remis"
                : ((stand.ergebnis === farbe) ? "sieg" : "niederlage"));

        let ende = "Die Partie läuft noch.";
        if (lage.art === "matt") {
            ende = "Schachmatt — der König konnte dem Angriff nicht mehr entkommen.";
        } else if (lage.art === "patt") {
            ende = "Patt — die Seite am Zug hatte keinen einzigen erlaubten Zug mehr.";
        } else if (lage.art === "remis") {
            ende = lage.text || "Unentschieden.";
        } else if (stand.ergebnis) {
            ende = "Aufgegeben — die Partie wurde vorzeitig beendet.";
        }

        const wendepunkte = stand.verlauf
            .filter((eintrag) => eintrag.wirkung && eintrag.wirkung !== "eingesammelt")
            .slice(-SCHACH_RUNDE.RUECKSCHAU_HOECHSTENS)
            .map((eintrag) => ({
                farbe: eintrag.farbe,
                eigen: (eintrag.farbe === farbe),
                unglueck: (eintrag.wirkung === "pech"),
                text: eintrag.text
            }));

        return {
            ausgang: ausgang,
            ende: ende,
            verloren: {
                eigen: (stand.verloren[farbe] || []).slice(),
                gegner: (stand.verloren[SCHACH.gegner(farbe)] || []).slice()
            },
            wert: {
                /* Was die eigene Seite an Material eingebüsst hat — und was
                   der Gegner. `beuteWert` zählt aus der Sicht dessen, der
                   geschlagen HAT, deshalb hier über Kreuz. */
                eigen: SCHACH_RUNDE.beuteWert(stand, SCHACH.gegner(farbe)),
                gegner: SCHACH_RUNDE.beuteWert(stand, farbe)
            },

            /*
             * WAS AM ENDE NOCH STAND (seit v0.76).
             *
             * `wert` sagt, was die Partie GEKOSTET hat; das ist die Antwort auf
             * „warum habe ich verloren". Wer besser dastand, ist eine andere
             * Frage — und sie lässt sich nur aus der Stellung beantworten, weil
             * Fähigkeiten Material erschaffen und zurückholen (siehe
             * `materialWert`). Bis v0.75 wurde der Satz „beim Material lagt ihr
             * vorn/hinten" aus den Verlusten gerechnet und stimmte deshalb in
             * jeder Partie mit Wiedergeburt oder Umwandlung nicht.
             */
            stellung: {
                eigen: SCHACH_RUNDE.materialWert(stand, farbe),
                gegner: SCHACH_RUNDE.materialWert(stand, SCHACH.gegner(farbe))
            },
            wendepunkte: wendepunkte
        };
    },

    /*
     * DIE GEMESSENE SPIELZEIT EINER PARTIE (seit v0.93, Wunsch W10).
     *
     * `partie.spielzeit` sind die Sekunden, die insgesamt an dieser Partie
     * gespielt wurde — aufaddiert von allen Geräten, die sie offen hatten.
     * Sie dient EINEM Zweck: der Dauer-Schätzung unter den Spielart-Kacheln.
     * Angezeigt wird sie nirgends.
     */
    spielzeitErgaenzen(runde, sekunden) {
        if (!Number.isFinite(sekunden) || sekunden <= 0) {
            return runde;
        }

        const neu = SCHACH_RUNDE.kopieren(runde);
        neu.spielzeit = (neu.spielzeit || 0) + Math.floor(sekunden);
        return neu;
    },

    /*
     * WIE LANGE DAUERT EINE RUNDE MIT DIESEN EINSTELLUNGEN? (seit v0.93)
     *
     * Gerechnet aus zwei Teilen:
     *
     *   1. WIE VIELE HALBZÜGE zu erwarten sind — das hängt am Material und an
     *      der Brettgrösse: Mehr Figuren und mehr Platz heissen mehr Züge, bis
     *      eine Seite matt ist. Diese Zahl wird geschätzt, nicht gemessen.
     *   2. WIE LANGE EIN HALBZUG DAUERT — das wird GEMESSEN, aus echten
     *      Partien (`sekundenJeHalbzug`). Genau dafür läuft die stille
     *      Zeitmessung.
     *
     * Warum diese Zweiteilung: Die Zahl der Züge folgt den Regeln und ist
     * rechenbar; wie schnell Menschen ziehen, ist es nicht. Nur der zweite
     * Teil braucht Beobachtung — und er ist auch der, der sich zwischen
     * Runden am stärksten unterscheidet.
     *
     * Das Ergebnis ist ausdrücklich ein GROBER Indikator und nie als Zusage
     * formuliert.
     */
    SEKUNDEN_JE_HALBZUG_VORGABE: 20,

    /*
     * WIE SCHNELL DIE MESSUNG DIE VORGABE ABLÖST (seit v0.100).
     *
     * Die Zahl ist der „Anlauf" in der Mischung `gezaehlt / (gezaehlt + ANLAUF)`
     * — siehe `sekundenJeHalbzug`. Bei 3 zählt die erste gemessene Partie ein
     * Viertel, die dritte die Hälfte, die zwölfte vier Fünftel.
     *
     * WARUM MISCHEN STATT SCHWELLE: Bis v0.99 stand hier `MESSUNG_AB_PARTIEN: 5`
     * — vier Partien zählten gar nicht, die fünfte alles. Eine Schätzung, die
     * an einer festen Zahl springt, wirkt kaputt; eine, die sich mit jeder
     * Partie ein Stück bewegt, wirkt lernend. Sie IST auch lernend.
     */
    MESSUNG_ANLAUF: 3,

    sekundenJeHalbzug(partien) {
        const liste = Array.isArray(partien) ? partien : [];

        let sekunden = 0;
        let halbzuege = 0;
        let gezaehlt = 0;

        for (const partie of liste) {
            const zeit = partie && partie.spielzeit;
            const takt = partie && partie.stand && partie.stand.takt;

            /* Nur Partien, die wirklich gespielt wurden: Ohne Züge oder ohne
               gemessene Zeit sagt ein Eintrag nichts. */
            if (!Number.isFinite(zeit) || zeit <= 0
                || !Number.isFinite(takt) || takt < 5) {
                continue;
            }

            sekunden += zeit;
            halbzuege += takt;
            gezaehlt++;
        }

        if (gezaehlt <= 0 || halbzuege <= 0) {
            return SCHACH_RUNDE.SEKUNDEN_JE_HALBZUG_VORGABE;
        }

        /*
         * SEIT v0.100 GIBT ES KEINE SCHWELLE MEHR, SONDERN EIN GEWICHT
         * (Nutzer-Ansage: „die geschätzte Zeit soll sich immer besser anhand
         * gespielter Runden anpassen").
         *
         * Bis v0.99 galt: unter fünf gemessenen Partien die Vorgabe, ab der
         * fünften ausschliesslich die Messung. Das ist an beiden Enden falsch —
         * die vierte Partie sagte gar nichts, die fünfte plötzlich alles, und
         * die Zahl sprang.
         *
         * Jetzt mischen sich beide, und die Messung bekommt mit jeder Partie
         * mehr Gewicht: `gezaehlt / (gezaehlt + ANLAUF)`. Bei einer gemessenen
         * Partie zählt sie ein Viertel, bei drei die Hälfte, bei zwölf vier
         * Fünftel — sie nähert sich der reinen Messung, ohne sie je ganz zu
         * erreichen. Genau das ist gemeint mit „immer besser": Die Schätzung
         * bewegt sich ab der ERSTEN gemessenen Partie und wird ruhiger, je
         * mehr dazukommen.
         */
        const gemessen = sekunden / halbzuege;
        const gewicht = gezaehlt / (gezaehlt + SCHACH_RUNDE.MESSUNG_ANLAUF);

        return SCHACH_RUNDE.SEKUNDEN_JE_HALBZUG_VORGABE * (1 - gewicht)
            + gemessen * gewicht;
    },

    /*
     * Die erwartete Zahl der Halbzüge für ein Brett mit dieser Besetzung.
     *
     * Die Formel ist eine Faustregel, keine Wissenschaft: Jede Figur, die
     * geschlagen werden muss, kostet Züge, und auf einem grösseren Brett
     * laufen die Figuren länger, bis sie sich treffen. Beides steckt drin,
     * beides linear — mehr Genauigkeit würde eine Schätzung vortäuschen, die
     * es nicht gibt.
     */
    erwarteteHalbzuege(figurenJeSeite, felder) {
        const figuren = Math.max(2, figurenJeSeite || 2);
        const flaeche = Math.max(16, felder || 64);

        return Math.round(figuren * 3.5 + flaeche / 8);
    },

    /*
     * Die Schätzung in SEKUNDEN. `partien` sind die bereits gespielten
     * Partien der Tafel, aus denen die Messung kommt.
     */
    dauerSchaetzung(figurenJeSeite, felder, regeln, partien) {
        const halbzuege = SCHACH_RUNDE.erwarteteHalbzuege(figurenJeSeite, felder);
        let sekunden = halbzuege * SCHACH_RUNDE.sekundenJeHalbzug(partien);

        /*
         * Fähigkeiten verlängern eine Partie spürbar: Es gibt mehr zu
         * überlegen, Figuren kommen zurück, und Mauern halten auf. Der
         * Zuschlag steigt mit der Lootbox-Menge — ohne Fähigkeiten gibt es
         * ihn gar nicht.
         */
        if (regeln && regeln.faehigkeiten) {
            const menge = SCHACH_VARIANTEN.mengeVon(regeln.lootboxMenge);
            sekunden *= (1.2 + 0.1 * (menge.stufe || 0));
        }

        return Math.round(sekunden);
    },

    /*
     * Derselbe Wert als Satz, wie er unter der Kachel steht. Gerundet auf
     * fünf Minuten und mit „etwa" davor — es ist ein Anhaltspunkt.
     */
    dauerText(figurenJeSeite, felder, regeln, partien) {
        const minuten = SCHACH_RUNDE.dauerSchaetzung(
            figurenJeSeite, felder, regeln, partien) / 60;

        /*
         * DREI STUFEN DER GENAUIGKEIT (seit v0.100, Nutzer-Ansage: die Zahl
         * soll sich „bei jeder kleinen Änderung oben an den Auswahlfeldern"
         * verändern).
         *
         * Bis v0.99 wurde IMMER auf fünf Minuten gerundet, und alles unter
         * acht Minuten hiess pauschal „etwa 5 Minuten". Damit verschluckte die
         * Anzeige genau das, was der Nutzer sehen will: Ein Knopfdruck, der
         * vier Figuren mehr aufs Brett stellt, bewegte die Zahl oft gar nicht.
         *
         * Kurze Partien werden deshalb auf die MINUTE gerundet — dort fällt
         * jede Änderung ins Gewicht. Erst ab einer halben Stunde wird gröber
         * gerundet, denn dort ist die Minute ohnehin nicht mehr zu halten.
         */
        if (minuten < 30) {
            const knapp = Math.max(1, Math.round(minuten));
            return "etwa " + knapp + ((knapp === 1) ? " Minute" : " Minuten");
        }

        const gerundet = Math.round(minuten / 5) * 5;

        if (gerundet >= 60) {
            const stunden = Math.round(gerundet / 30) / 2;

            /* GENAU EINE STUNDE HEISST „Stunde" (seit v0.94). Bis v0.93 stand
               dort „etwa 1 Stunden" — der Fall trat bei jeder gut gefüllten
               Partie auf (klassisches Brett, 31 Figuren, viele Lootboxen). */
            if (stunden === 1) {
                return "etwa 1 Stunde";
            }
            return "etwa " + String(stunden).replace(".", ",") + " Stunden";
        }

        return "etwa " + gerundet + " Minuten";
    },

    /* Der Figurenwert dessen, was eine Seite geschlagen hat. */
    beuteWert(runde, farbe) {
        const stand = SCHACH_RUNDE.normalisieren(runde);
        const geschlagen = stand.verloren[SCHACH.gegner(farbe)] || [];

        return geschlagen.reduce(
            (summe, art) => summe + (SCHACH_RUNDE.FIGUR_WERT[art] || 0), 0);
    },

    /* Welche Würfel liegen gerade auf dem Brett? */
    offeneBonusFelder(runde) {
        return SCHACH_RUNDE.normalisieren(runde).bonus;
    },

    /*
     * Ein Zufallswert zwischen 0 und 1, GERECHNET statt gewürfelt.
     *
     * Das ist die wichtigste Festlegung an den Fähigkeiten: Alle Geräte sehen
     * denselben Stand und müssen deshalb dieselben Würfel sehen. Mit
     * `Math.random()` bekäme jedes Gerät ein anderes Brett, und der erste
     * Schreibvorgang gewönne — dieselbe Falle wie beim gegenseitigen
     * Überschreiben in v0.8. Aus Partie-Kennung und Zugzähler rechnet dagegen
     * jeder dasselbe aus, ohne sich abzustimmen, und die Tests bleiben
     * aussagekräftig, weil das Ergebnis vorhersagbar ist.
     *
     * Verfahren: FNV-1a, eine gängige einfache Streufunktion.
     *
     * ------------------------------------------------------------------
     * WAS SICH UNTERSCHEIDET, GEHÖRT AN DEN ANFANG DER SAAT (seit v0.49.1).
     *
     * FNV-1a verodert jedes Zeichen und multipliziert dann mit einer Primzahl.
     * Ein Unterschied im LETZTEN Zeichen erlebt danach genau eine
     * Multiplikation — er verschiebt das Ergebnis um rund 0,4 Prozent und
     * sonst nichts. Zwei Saaten, die sich nur am Ende unterscheiden, liefern
     * damit praktisch DENSELBEN Wert.
     *
     * Wer also über etwas zählt (Feldnummer, laufende Nummer), schreibt die
     * Zahl nach VORNE: `feld + "|glas|" + id`, nicht `id + "|glas|" + feld`.
     * Dann laufen alle übrigen Zeichen als Mischschritte hinterher.
     *
     * Zweimal ist genau das schiefgegangen, beide gefunden am 2026-08-08:
     * Unter dem vollen Glas trugen die Felder 0 bis 9 dasselbe Trugbild, und
     * die Zufallsarmee stellte siebenmal fast dieselbe Figur auf. Die Funktion
     * hier ist in Ordnung — die Saat war es nicht.
     * ------------------------------------------------------------------
     */
    _zufallsWert(text) {
        let wert = 2166136261;

        for (let stelle = 0; stelle < text.length; stelle++) {
            wert ^= text.charCodeAt(stelle);
            wert = Math.imul(wert, 16777619);
        }

        return (wert >>> 0) / 4294967296;
    },

    /*
     * Lässt bei Bedarf einen neuen Würfel erscheinen. Wird nach jedem Zug
     * gerufen und ändert die übergebene Runde.
     */
    /*
     * Erscheinen in dieser Partie Würfel? Der Schalter der Partie geht vor;
     * ohne Angabe entscheidet die Spielart wie vor v2.5.
     */
    faehigkeitenAn(runde) {
        const stand = SCHACH_RUNDE.normalisieren(runde);

        if (stand.regeln.faehigkeiten === true || stand.regeln.faehigkeiten === false) {
            return stand.regeln.faehigkeiten;
        }
        return !!SCHACH_RUNDE.varianteVon(stand).faehigkeiten;
    },

    /*
     * Regnet es in dieser Partie Glücksboxen? (seit v0.50)
     *
     * Nur mit Würfeln überhaupt — ein Regen ohne Würfel wäre keiner. Deshalb
     * wird hier BEIDES gefragt und nicht nur der eigene Haken; im Bildschirm
     * hängt er sichtbar unter dem Würfel-Haken.
     */
    regenAn(runde) {
        const stand = SCHACH_RUNDE.normalisieren(runde);
        return SCHACH_RUNDE.lootboxMenge(stand) !== "wenig"
            && SCHACH_RUNDE.faehigkeitenAn(stand);
    },

    /* Wie steil der Regen in dieser Partie ansteigt (1 bis 5, seit v0.59). */
    regenStufe(runde) {
        return SCHACH_RUNDE.normalisieren(runde).regeln.regenStufe;
    },

    /*
     * WIE VIELE LOOTBOXEN DIESE PARTIE AUSWIRFT (seit v0.71): eine der vier
     * Stufen aus `SCHACH_VARIANTEN.LOOTBOX_MENGEN`. Sie steht in der Partie und
     * wird für Partien von früher aus `regen`/`regenStufe` abgeleitet (siehe
     * `normalisieren`) — hier ist sie deshalb immer eine gültige Stufe.
     */
    lootboxMenge(runde) {
        return SCHACH_RUNDE.normalisieren(runde).regeln.lootboxMenge;
    },

    /*
     * Wie schwer jede Stufe im Moment wiegt — die Abklingzeit in Zahlen.
     *
     * Gemessen wird im TAKT: Er zählt jeden Halbzug und wird nie
     * zurückgesetzt (`halbzuege` springt bei jedem Bauernzug auf 0, siehe
     * `docs\entscheidungen\entschieden.md`, „Warum `halbzuege` keine Uhr ist").
     * Die Regel selbst steht in SCHACH_VARIANTEN — hier wird nur gemessen.
     */
    _stufenGewichte(runde) {
        const abstaende = {};

        for (const stufe of SCHACH_VARIANTEN.STUFEN) {
            const zuletzt = runde.stufeZuletzt[stufe.id];
            if (Number.isInteger(zuletzt)) {
                abstaende[stufe.id] = Math.max(runde.stand.takt - zuletzt, 0);
            }
        }

        const gewichte = SCHACH_VARIANTEN.stufenGewichte(abstaende);

        /*
         * EINE STUFE OHNE ITEMS BEKOMMT GEWICHT 0 (seit v0.87).
         *
         * Mit begrenztem Vorrat kann eine ganze Seltenheitsstufe leer bleiben —
         * das ist ausdrücklich erlaubt (Nutzer-Entscheidung 18.08.). Ohne diese
         * Zeilen zöge `stufeZiehen` sie trotzdem, und die Lootbox wäre beim
         * Einsammeln leer. Es ist dieselbe Rechnung wie bei den Unglücken seit
         * v0.84: Die Chance verteilt sich auf die übrigen Stufen.
         */
        const erlaubt = SCHACH_RUNDE.erlaubteFaehigkeiten(runde);

        if (erlaubt) {
            for (const stufe of SCHACH_VARIANTEN.STUFEN) {
                if (SCHACH_VARIANTEN.faehigkeitenDerStufe(stufe.id, erlaubt).length === 0) {
                    gewichte[stufe.id] = 0;
                }
            }
        }

        return gewichte;
    },

    /*
     * DER ITEM-VORRAT DIESER PARTIE (seit v0.87, Wunsch R5/V3).
     *
     * Gibt die Liste der Arten zurück, die es in dieser Partie gibt — oder
     * `null` für „alle", und dann filtert nichts.
     *
     * Der Vorrat steht in den REGELN und wird beim Anlegen EINMAL gerechnet
     * (`itemVorratAuslosen`), nicht bei jedem Aufruf: Er gehört zur Partie wie
     * die Spielart, und jedes Gerät muss dieselbe Liste sehen.
     */
    itemVorrat(runde) {
        const regeln = (runde && runde.regeln) ? runde.regeln : {};

        if (!Array.isArray(regeln.itemPool) || regeln.itemPool.length === 0) {
            return null;
        }

        return regeln.itemPool;
    },

    /*
     * PASST DIESE FÄHIGKEIT ZU DEN REGELN DIESER PARTIE? (seit v0.88, R4)
     *
     * Bisher hing die Existenz einer Fähigkeit nur an der Tabelle. Enttarnen
     * ist die erste, die von einer EINSTELLUNG abhängt: Sie gibt es nur, wo
     * die Seltenheit verborgen ist — sonst zeigte sie etwas, das ohnehin zu
     * sehen ist.
     *
     * Absichtlich EINE Funktion mit Schaltern statt einer Sonderabfrage je
     * Fähigkeit: Die zweite dieser Art (Verstecken, das Gegenstück) braucht
     * dann nur noch ihren Schalter, keine neue Mechanik.
     */
    bedingungPasst(art, runde) {
        const eintrag = SCHACH_VARIANTEN.FAEHIGKEITEN[art];
        if (!eintrag) {
            return false;
        }

        const regeln = (runde && runde.regeln) ? runde.regeln : {};
        const seltenheitAn = (regeln.seltenheitZeigen !== false);

        if (eintrag.nurOhneSeltenheit && seltenheitAn) {
            return false;
        }
        if (eintrag.nurMitSeltenheit && !seltenheitAn) {
            return false;
        }

        return true;
    },

    /*
     * WAS ES IN DIESER PARTIE ÜBERHAUPT GIBT (seit v0.88).
     *
     * Führt beides zusammen: den ausgelosten Item-Vorrat (v0.87) und die
     * Bedingungen an den Regeln (v0.88). Das Ergebnis geht als `erlaubt` in
     * `faehigkeitenDerStufe` — und damit in einem Zug in Ziehung,
     * Prozentrechnung und Erklärtext.
     *
     * `null` heisst „keine Einschränkung" und lässt jeden Aufruf von früher
     * unverändert. Das ist der Normalfall, solange nichts eingestellt ist und
     * keine bedingte Fähigkeit betroffen wäre.
     */
    erlaubteFaehigkeiten(runde) {
        const pool = SCHACH_RUNDE.itemVorrat(runde);

        const grundliste = pool || Object.keys(SCHACH_VARIANTEN.FAEHIGKEITEN)
            .filter((art) => !SCHACH_VARIANTEN.FAEHIGKEITEN[art].versteckt);

        const erlaubt = grundliste.filter(
            (art) => SCHACH_RUNDE.bedingungPasst(art, runde));

        /* Nichts ausgeschlossen und kein Vorrat gesetzt: gar nicht filtern. */
        if (!pool && erlaubt.length === grundliste.length) {
            return null;
        }

        return erlaubt;
    },

    /*
     * LOST DEN VORRAT AUS — einmalig beim Anlegen.
     *
     * Gezogen wird MIT DENSELBEN CHANCEN wie im Spiel („es soll zufällig mit
     * denselben Chancen aus dem Fähigkeiten-Pool ausgewählt werden"): erst
     * eine Stufe nach ihrer Chance, dann eine Art daraus. Wer schon drin ist,
     * wird übersprungen.
     *
     * GERECHNET, NICHT GEWÜRFELT (eiserne Regel): Die Saat hängt an der
     * Partie-Kennung, jedes Gerät kommt also auf dieselbe Liste, ohne dass
     * jemand sie schreiben müsste.
     *
     * Der König unter den Sonderfällen ist die Abbruchbedingung: Sind alle
     * verfügbaren Arten gezogen, hört es auf — auch wenn die Wunschzahl
     * grösser ist als das Angebot.
     */
    itemVorratAuslosen(runde) {
        const groesse = SCHACH_VARIANTEN.itemVorratVon(
            runde.regeln ? runde.regeln.itemVorrat : "");

        /*
         * SELBST GEWÄHLT (seit v0.100): Dann wird gar nicht gezogen, sondern
         * übernommen. Gefiltert wird trotzdem — die Wahl ist beim Anlegen
         * getroffen worden, die Bedingungen der Partie gelten aber weiter
         * (Enttarnen gibt es nur ohne, Verstecken nur mit sichtbarer
         * Seltenheit).
         *
         * BLEIBT NICHTS ÜBRIG, GILT WIEDER ALLES. Eine leere Liste heisst im
         * ganzen Projekt „keine Einschränkung" (`itemVorrat`), und das ist hier
         * die richtige Antwort: Eine Partie ganz ohne Items wäre eine Partie
         * ohne Lootboxen, und dafür gibt es den Haken. Der Anlege-Bildschirm
         * lässt die Liste ohnehin nicht leer werden.
         */
        if (groesse.eigeneWahl) {
            const gewaehlt = Array.isArray(runde.regeln.itemAuswahl)
                ? runde.regeln.itemAuswahl : [];

            runde.regeln.itemPool = gewaehlt
                .filter((art) => !!SCHACH_VARIANTEN.FAEHIGKEITEN[art])
                .filter((art) => !SCHACH_VARIANTEN.FAEHIGKEITEN[art].versteckt)
                .filter((art) => SCHACH_RUNDE.bedingungPasst(art, runde))
                .filter((art, stelle, alle) => alle.indexOf(art) === stelle);

            return runde;
        }

        if (!groesse.anzahl) {
            runde.regeln.itemPool = [];
            return runde;
        }

        /*
         * Gezogen wird nur aus dem, was in DIESER Partie überhaupt vorkommen
         * kann (seit v0.88): Eine Fähigkeit mit Bedingung — Enttarnen — darf
         * gar nicht erst in den Vorrat geraten, sonst belegte sie dort einen
         * Platz und käme trotzdem nie.
         */
        const alle = [];
        for (const stufe of SCHACH_VARIANTEN.STUFEN) {
            for (const art of SCHACH_VARIANTEN.faehigkeitenDerStufe(stufe.id)) {
                if (SCHACH_RUNDE.bedingungPasst(art, runde)) {
                    alle.push(art);
                }
            }
        }

        const ziel = Math.min(groesse.anzahl, alle.length);
        const gezogen = [];
        const basis = (runde.id || "partie") + "|vorrat";

        /*
         * Die Obergrenze ist eine Sicherung gegen eine Endlosschleife, nicht
         * Teil der Regel: Je voller die Liste, desto öfter kommt eine schon
         * gezogene Art. Wird sie erreicht, füllen die restlichen Arten der
         * Reihe nach auf — das Ergebnis bleibt vollständig und gerechnet.
         */
        for (let schritt = 0; gezogen.length < ziel && schritt < 500; schritt++) {
            const wahl = SCHACH_VARIANTEN.stufeZiehen(
                SCHACH_RUNDE._zufallsWert(basis + "|stufe|" + schritt));

            const art = SCHACH_VARIANTEN.faehigkeitAusStufe(
                wahl.stufe.id,
                SCHACH_RUNDE._zufallsWert(basis + "|art|" + schritt),
                [],
                alle);

            if (art && gezogen.indexOf(art) === -1) {
                gezogen.push(art);
            }
        }

        for (const art of alle) {
            if (gezogen.length >= ziel) {
                break;
            }
            if (gezogen.indexOf(art) === -1) {
                gezogen.push(art);
            }
        }

        runde.regeln.itemPool = gezogen.sort();
        return runde;
    },

    _bonusNachziehen(runde) {
        if (!SCHACH_RUNDE.faehigkeitenAn(runde)) {
            return;
        }
        /*
         * Fähigkeiten erscheinen nur auf leeren Feldern, und nie dort, wo schon
         * eine liegt. Gezählt wird ZUERST: Im Glücksboxen-Regen hängen Chance
         * und Anzahl davon ab, wie leer das Brett gerade ist.
         *
         * KEINE LOOTBOX AUF EINEM GESPERRTEN FELD (seit v0.76).
         *
         * Gemeldet als „bei Kreuz-Karten sollen nicht Lootboxen im Nichts
         * spawnen". Die vier toten Ecken eines Kreuz-Bretts sind gewöhnliche
         * RISSE (seit v0.63) — leer, aber niemand zieht dorthin. Eine Lootbox
         * dort war für immer unerreichbar und lag am Bildschirm mitten im
         * Schwarzen. Dasselbe gilt für ein Loch aus einem Erdbeben und für
         * eine Mauer: Unter ihr wäre die Box unsichtbar.
         *
         * Hier geht es um NEU erscheinende Boxen — die dürfen nicht unter eine
         * schon stehende Mauer fallen. Wird umgekehrt eine Mauer über eine
         * liegende Box gelegt, frisst sie diese seit v0.77 (`_zielWirkung`,
         * Fall `mauer`); bis v0.66 war jenes Feld dafür gesperrt.
         *
         * Gefragt wird `SCHACH.gesperrt` — die eine Stelle, die beide Ursachen
         * kennt (eiserne Regel).
         *
         * DIE TOTEN ECKEN ZÄHLEN AUCH NICHT MEHR ALS BRETT. `alleFelder` ist
         * der Massstab dafür, wie leer das Brett ist; die Ecken stünden sonst
         * für immer als „besetzt" darin, und auf dem Kreuz regnete es deutlich
         * weniger als auf jedem anderen Brett derselben Grösse.
         */
        const belegt = runde.bonus.map((eintrag) => eintrag.feld);
        const felderGesamt = SCHACH.felderVon(runde.stand);
        const freie = [];
        let alleFelder = 0;

        for (let feld = 0; feld < felderGesamt; feld++) {
            if (SCHACH.rissAuf(runde.stand, feld)) {
                continue;
            }
            alleFelder++;

            if (SCHACH.figurAuf(runde.stand, feld) === "."
                && !SCHACH.gesperrt(runde.stand, feld)
                && belegt.indexOf(feld) === -1) {
                freie.push(feld);
            }
        }

        if (freie.length === 0) {
            return;
        }

        const menge = SCHACH_RUNDE.lootboxMenge(runde);

        /*
         * DIE UNTERSTE STUFE WIRFT NUR NACH EINEM VOLLEN ZUG AUS (seit v0.71).
         *
         * Massgeblich ist der TAKT — die ehrliche Uhr, die nur bei echten
         * Zügen steigt und hier schon auf dem Wert NACH dem Zug steht; jeder
         * zweite schliesst einen vollen Zug ab. Bis v0.83 hing die Sperre am
         * `zugZaehler`, doch den erhöht auch jede Fähigkeit (das ist die
         * Sicherung gegen gleichzeitige Züge) — eine Mauer mit Pluszeichen
         * verschob damit den Lootbox-Fahrplan um einen Halbzug, und der
         * eigene Folgezug warf Boxen, die ohne sie nicht gekommen wären
         * (Meldung T1, siehe erkenntnisse.md „Zwei Uhren").
         */
        if (!SCHACH_VARIANTEN.mengeVon(menge).jederHalbzug
            && (runde.stand.takt % 2) !== 0) {
            return;
        }

        /*
         * Nach jedem Halbzug neu gewürfelt — kein fester Takt mehr, und seit
         * v3.3 auch keine Höchstzahl (siehe SCHACH_VARIANTEN.BONUS_CHANCE).
         * In der Saat stehen BEIDE Zähler: der Takt als Fahrplan, der
         * `zugZaehler` als Eindeutigkeit — ein Zug und eine direkt folgende
         * Zug-beendende Fähigkeit ziehen beim SELBEN Takt und dürfen nicht
         * dieselbe Saat teilen (sonst fielen ihre Ziehungen immer gleich aus).
         */
        const wuerfelt = SCHACH_RUNDE._zufallsWert(
            (runde.id || "partie") + "|" + runde.stand.takt + "|"
            + runde.zugZaehler + "|ob") * 100;

        if (wuerfelt >= SCHACH_VARIANTEN.mengenChance(menge, freie.length, alleFelder)) {
            return;
        }

        const basis = (runde.id || "partie") + "|" + runde.stand.takt + "|"
            + runde.zugZaehler;

        /*
         * Meist einer, manchmal zwei, sehr selten drei — und auf den drei
         * Füllstands-Stufen zusätzlich, was der Füllstand hergibt (das Grössere
         * von beidem, siehe `SCHACH_VARIANTEN.LOOTBOX_MENGEN`). Nie mehr, als
         * freie Felder da sind; das ist seit v3.3 die einzige harte Grenze.
         */
        const gewuenscht = SCHACH_VARIANTEN.mengenAnzahl(menge, freie.length, alleFelder,
            SCHACH_RUNDE._zufallsWert(basis + "|anzahl"));
        const moeglich = Math.min(gewuenscht, freie.length);

        /*
         * EINMAL VOR DER SCHLEIFE GERECHNET, nicht darin: `freie` schrumpft mit
         * jedem gesetzten Würfel (`splice` unten), und der Füllstand ist der
         * Stand VOR diesem Halbzug — sonst wäre der zweite Würfel eines
         * Durchgangs ein Stück gefährlicher als der erste, ohne dass sich auf
         * dem Brett etwas geändert hätte. Chance und Anzahl oben nehmen ihn aus
         * demselben Grund vorher.
         */
        const pechChance = SCHACH_VARIANTEN.pechChance(menge, freie.length, alleFelder);

        const neue = [];

        for (let nummer = 0; nummer < moeglich; nummer++) {
            const marke = basis + "|" + nummer;
            const stelle = Math.floor(SCHACH_RUNDE._zufallsWert(marke + "|feld") * freie.length);
            const feld = freie[stelle];

            /*
             * Ist es ein Unglückswürfel? Deutlich seltener als ein normaler —
             * und seit v0.77 umso häufiger, je leerer das Brett ist. Gerechnet
             * wird das in `SCHACH_VARIANTEN.pechChance`, mit denselben Kurven
             * wie die Menge; auf der Stufe „wenig" bleibt es beim festen
             * Grundwert.
             */
            const istPech = (SCHACH_RUNDE._zufallsWert(marke + "|pech") * 100)
                < pechChance;

            /*
             * BEIM ERSCHEINEN STEHT NUR DIE STUFE FEST (seit v3.6).
             *
             * Was in einem Würfel steckt, entscheidet sich erst beim
             * Einsammeln — und zwar gegen den Vorrat DESSEN, der ihn
             * einsammelt. Anders ginge die Dämpfung von Wiederholungen nicht:
             * Beim Erscheinen weiss noch niemand, wer den Würfel bekommt.
             *
             * Der Unglückswürfel behält seine feste Art. Er kommt nicht in den
             * Vorrat und wiederholt sich deshalb auch nicht.
             */
            const eintrag = { feld: feld };

            if (istPech) {
                eintrag.art = SCHACH_VARIANTEN.pechZiehen(
                    SCHACH_RUNDE._zufallsWert(marke + "|pechart"));
                eintrag.pech = true;

                if (!eintrag.art) {
                    continue;
                }
            } else {
                /*
                 * DIE STUFE MIT ABKLINGZEIT (seit v0.41). Die Gewichte werden
                 * für JEDEN Würfel neu geholt: Erscheinen zwei auf einmal,
                 * drückt der erste schon die Stufe des zweiten.
                 */
                eintrag.art = "";
                eintrag.stufe = SCHACH_VARIANTEN.stufeZiehen(
                    SCHACH_RUNDE._zufallsWert(marke + "|art"),
                    SCHACH_RUNDE._stufenGewichte(runde)).stufe.id;

                runde.stufeZuletzt[eintrag.stufe] = runde.stand.takt;
            }

            freie.splice(stelle, 1);
            runde.bonus.push(eintrag);
            neue.push(eintrag);
        }

        if (neue.length === 0) {
            return;
        }

        /*
         * Im Verlauf steht NUR, wo etwas liegt — nicht was. Weder die
         * Fähigkeit noch die Tatsache, dass es ein Unglückswürfel ist: Das ist
         * die Überraschung, um die es geht.
         */
        const namen = neue.map((eintrag) => SCHACH.feldName(eintrag.feld,
            SCHACH.breiteVon(runde.stand), SCHACH.hoeheVon(runde.stand)));

        runde.verlauf.push({
            text: (neue.length === 1 ? "Eine Lootbox erscheint auf " : "Lootboxen erscheinen auf ")
                + namen.join(", "),
            wer: "",
            farbe: runde.stand.amZug,
            von: -1,
            nach: -1,
            wirkung: "erscheint",
            felder: neue.map((eintrag) => eintrag.feld)
        });
        SCHACH_RUNDE._verlaufKuerzen(runde);
    },

    /*
     * Setzt eine Fähigkeit ein. Wirkt auf den Brett-Stand und verbraucht sie.
     * Der Zugzähler steigt mit, damit zwei Geräte sich nicht gegenseitig
     * überschreiben — genau wie bei einem Zug.
     *
     * `zielFeld` wird nur von Fähigkeiten der Art "ziel" gebraucht; die
     * übrigen bekommen -1 oder gar nichts.
     *
     * `umwandlung` (seit v0.56) braucht bisher nur der Bauernschub: Erreichen
     * Bauern durch ihn die letzte Reihe, sagt sie, was aus ihnen wird. Sie
     * steht als LETZTER Parameter und ist wahlfrei — jeder Aufruf von vorher
     * bleibt damit gültig und bekommt wie bisher Damen.
     */
    faehigkeitEinsetzen(runde, spielerId, art, zielFeld, wer, zeitpunkt, umwandlung, wahl) {
        const alt = SCHACH_RUNDE.normalisieren(runde);
        const beschreibung = SCHACH_VARIANTEN.FAEHIGKEITEN[art];

        if (!beschreibung) {
            return null;
        }
        if (!SCHACH_RUNDE.darfEinsetzen(alt, spielerId, art)) {
            return null;
        }

        const farbe = SCHACH_RUNDE.teamVon(alt, spielerId);
        const stelle = alt.faehigkeiten[farbe].indexOf(art);
        if (stelle === -1) {
            return null;
        }

        const neu = SCHACH_RUNDE.kopieren(alt);
        const ziel = Number.isInteger(zielFeld) ? zielFeld : -1;
        let betroffen = [];
        let wege = [];
        let zusatzText = "";

        /* Von welchem Rand eine Bahn-Wirkung rollte (nur Nudelholz, seit
           v0.117) — die Anzeige spielt daraus ihr Schauspiel richtig herum. */
        let richtung = "";

        if (beschreibung.art === "zugmuster") {
            neu.stand.zusatzFarbe = farbe;
            neu.stand.zusatzMuster = beschreibung.muster;

            /* `istDerZug` (Sprung, Teleport): Man bleibt am Zug, darf aber nur
               noch nach diesem Muster ziehen — die Fähigkeit ist der Zug. */
            neu.stand.zusatzNurDieses = !!beschreibung.istDerZug;
            neu.stand.sprungAktiv = (beschreibung.muster === "springer") ? farbe : "";

        } else if (beschreibung.art === "ablauf") {
            neu.stand.extraZug = farbe;

        } else if (beschreibung.art === "sicht") {
            /*
             * Ändert nichts am Brett — nur daran, wie EINE Seite es sieht.
             * Dasselbe Muster wie die Halluzination, nur mit umgekehrtem
             * Vorzeichen: Die zeigt weniger, diese zeigt mehr.
             *
             * ZWEI RICHTUNGEN seit v0.98: Enttarnen zeigt EINEM SELBST mehr,
             * Verstecken zeigt dem GEGNER weniger. Welche von beiden gemeint
             * ist, sagt `sichtWirkung` am Eintrag — nie der Name der
             * Fähigkeit, sonst müsste diese Stelle jede neue kennen.
             */
            if (beschreibung.sichtWirkung === "verbergen") {
                neu.stand.verstecktFarbe = SCHACH.gegner(farbe);
                neu.stand.verstecktBis = neu.zugZaehler + SCHACH_RUNDE.VERSTECKT_HALBZUEGE;
            } else {
                neu.stand.enttarntFarbe = farbe;
                neu.stand.enttarntBis = neu.zugZaehler + SCHACH_RUNDE.ENTTARNT_HALBZUEGE;
            }

        } else if (beschreibung.art === "sofort") {
            const wirkung = SCHACH.bauernschub(neu.stand, farbe, umwandlung);
            if (!wirkung) {
                return null;
            }
            neu.stand = wirkung.stand;
            betroffen = wirkung.felder;
            wege = wirkung.wege || [];

            /* Umgewandelte Bauern gehören in den Verlaufstext: Sie sind das,
               was man an der Stellung am wenigsten erwartet. */
            if (wirkung.umgewandelt && wirkung.umgewandelt.length > 0) {
                zusatzText = ": " + wirkung.umgewandelt.length + " mal umgewandelt";
            }

        } else if (beschreibung.art === "ziel") {
            const wirkung = SCHACH_RUNDE._zielWirkung(neu, art, farbe, ziel, wahl);
            if (!wirkung) {
                return null;
            }
            neu.stand = wirkung.stand;
            betroffen = wirkung.felder;
            wege = wirkung.wege || [];
            richtung = wirkung.richtung || "";
            zusatzText = wirkung.text ? (": " + wirkung.text) : "";

        } else if (beschreibung.art === "handel") {
            /*
             * Das Angebot wird HIER neu gerechnet, nicht vom Bildschirm
             * übergeben: Sonst könnte ein Gerät mit veraltetem Stand einen
             * Tausch durchsetzen, den es so gar nicht mehr gibt. Der Bildschirm
             * fragt dasselbe ab, um es zu zeigen — die Wahrheit steht hier.
             */
            const wirkung = SCHACH_RUNDE._handelAusfuehren(neu, farbe);
            if (!wirkung) {
                return null;
            }
            neu.stand = wirkung.stand;
            betroffen = wirkung.felder;
            zusatzText = wirkung.text ? (": " + wirkung.text) : "";

        } else if (beschreibung.art === "diebstahl") {
            /*
             * Auch hier wird die Beute NEU gerechnet und nicht vom Bildschirm
             * übernommen — derselbe Grund wie beim Handel eine Zeile höher.
             * `_diebstahlAusfuehren` ändert die Vorräte in `neu` unmittelbar;
             * der Stand bleibt, wie er ist.
             */
            const wirkung = SCHACH_RUNDE._diebstahlAusfuehren(neu, farbe);
            if (!wirkung) {
                return null;
            }
            neu.stand = wirkung.stand;
            betroffen = wirkung.felder;
            zusatzText = wirkung.text ? (": " + wirkung.text) : "";

        } else {
            return null;
        }

        /*
         * GESCHOBENE BAUERN NEHMEN IHRE STARTSEITE MIT (seit v0.65).
         *
         * Mehrere Fähigkeiten bewegen Figuren, ohne dass ein Zug stattfindet:
         * Nudelholz, Bauernschub, Erdbeben, Spiegel. Ihr `wege` sagt, was von
         * wo nach wo ging — genau daran wandern die Einträge entlang. Ohne das
         * bliebe der Eintrag auf dem alten Feld liegen, und der geschobene
         * Bauer fiele auf die Farbregel zurück: Auf dem Kreuz liefe er danach
         * in die falsche Richtung.
         *
         * Für jedes andere Brett ist der Aufruf wirkungslos — dort ist die
         * Liste leer.
         */
        neu.stand = SCHACH.figurMarkenVerschieben(neu.stand, wege);

        neu.faehigkeiten[farbe].splice(stelle, 1);
        neu.zugZaehler = alt.zugZaehler + 1;

        /*
         * Manche Fähigkeiten kosten den ganzen Zug (`beendetZug`): Danach ist
         * der Gegner dran. Der Doppelzug geht vor — wer ihn eingesetzt hat,
         * behält sein Recht auf einen weiteren Zug, sonst wäre die eine
         * Fähigkeit die andere wert.
         */
        if (beschreibung.beendetZug) {
            neu.stand = SCHACH_RUNDE._zugAbgebenNachFaehigkeit(neu.stand, farbe);
        }

        /*
         * DER EIGENE KÖNIG DARF DABEI NICHT IM SCHACH BLEIBEN (seit v3.6).
         *
         * Für einen Zug gilt das seit jeher (`SCHACH.zuege` filtert es weg),
         * für Fähigkeiten galt es nicht — dabei verschieben mehrere von ihnen
         * ganze Reihen (Erdbeben, Nudelholz, Bauernschub) oder tauschen
         * Figuren aus (Händler). Zwei Fälle sind verboten:
         *
         *   1. Man stellt sich selbst ins Schach. Das darf man mit einem Zug
         *      auch nicht, und eine Fähigkeit ist kein Freibrief.
         *   2. Man steht im Schach und gibt den Zug ab, ohne es aufzulösen.
         *      Dann wäre der König beim nächsten Zug einfach weg — die Partie
         *      endete, ohne dass Schachmatt gesagt wurde.
         *
         * Wer im Schach steht, darf dagegen weiter eine Fähigkeit einsetzen,
         * die den Zug NICHT beendet: Er muss danach ja ohnehin noch aus dem
         * Schach ziehen, und genau dabei kann sie helfen.
         *
         * Auf Brettern ohne Schachbegriff (Doppelbrett) entfällt das alles.
         */
        if (SCHACH_RUNDE._wirkungVerboten(alt.stand, neu.stand, farbe,
            !!beschreibung.beendetZug)) {

            return null;
        }

        /*
         * WER NUR NOCH SPRINGEN DARF, MUSS AUCH SPRINGEN KÖNNEN (seit v0.48).
         *
         * `istDerZug` nimmt der Seite für diesen einen Zug ihre gewohnte
         * Gangart. Bleibt dabei kein einziger Zug übrig — alle Sprungfelder
         * besetzt, oder der König steht im Schach und kein Muster löst es auf —
         * dann stünde die Partie: Der Spieler wäre am Zug, könnte aber nichts
         * tun, und `SCHACH.alleZuege` läse das als Matt. Deshalb wird das
         * Einsetzen abgewiesen; die Fähigkeit bleibt im Vorrat.
         */
        if (beschreibung.istDerZug && SCHACH.alleZuege(neu.stand).length === 0) {
            return null;
        }

        /*
         * BERÜHREN HEISST EINSAMMELN (seit v0.53).
         *
         * Bis v0.52 zählte nur der eigene ZUG: Wer mit dem Nudelholz eine Figur
         * über einen Würfel schob, sie mit dem Spiegel neben einen setzte oder
         * sie per Wiedergeburt auf einem erscheinen liess, ging leer aus — der
         * Würfel blieb unter der Figur liegen und war für immer unerreichbar,
         * weil man ihn nur durch Betreten einsammelt.
         *
         * Eingesammelt wird deshalb auf JEDEM Feld, das die Fähigkeit berührt
         * hat und auf dem jetzt eine eigene Figur steht. `betroffen` sind genau
         * diese Felder — dieselbe Liste, die auch das Aufleuchten am Brett
         * steuert.
         */
        const felderVorEinsammeln = SCHACH.felderVon(neu.stand);
        SCHACH_RUNDE._bonusEinsammelnAufFeldern(neu, betroffen, farbe, wer);

        /*
         * AUCH EINE GESCHOBENE GEGNERISCHE FIGUR SAMMELT EIN (seit v0.59,
         * Wunsch #6).
         *
         * Bis v0.58 zählten nur Felder, auf denen danach eine EIGENE Figur
         * stand. Wer mit dem Nudelholz eine gegnerische Figur über einen Würfel
         * schob, liess ihn also für immer unter ihr liegen — genau der Fall,
         * den „Berühren heisst Einsammeln" (v0.53) eigentlich abschaffen
         * sollte.
         *
         * ER GEHT AN DIE SEITE DER GESCHOBENEN FIGUR, nicht an den Einsetzer.
         * Die Figur betritt das Feld, also gehört ihr der Fund — dieselbe
         * Regel wie beim Zug. Damit bekommt das Nudelholz einen Preis: Wer
         * damit gegnerische Figuren schiebt, kann dem Gegner etwas schenken.
         *
         * `wer` bleibt leer: Im Verlauf stünde sonst der Name des Einsetzers
         * neben der Farbe des Gegners, und es sähe aus, als hätte der Gegner
         * gehandelt.
         *
         * HAT DER ERSTE DURCHGANG DAS BRETT VERÄNDERT, entfällt der zweite:
         * Nach einer Ausdehnung oder einem Einsturz zeigen die gemerkten
         * Feldnummern in `betroffen` woanders hin. Lieber ein Würfel, der
         * liegen bleibt, als einer, der auf einem falsch gerechneten Feld
         * wirkt — dieselbe Überlegung wie beim zweiten Unglückswürfel in
         * `_bonusEinsammelnAufFeldern`.
         */
        if (SCHACH.felderVon(neu.stand) === felderVorEinsammeln) {
            SCHACH_RUNDE._bonusEinsammelnAufFeldern(neu, betroffen, SCHACH.gegner(farbe), "");
        }

        /*
         * AUCH EIN ABGEGEBENER ZUG IST EIN HALBZUG (seit v0.52).
         *
         * Würfel erscheinen nach jedem Halbzug — aber `_bonusNachziehen` lief
         * nur in `ziehen`. Wer seinen Zug für eine Fähigkeit hergab (Friedhof,
         * Wiedergeburt, Händler …), bekam deshalb keinen neuen Würfel aufs
         * Brett, und in einer Partie mit vielen Fähigkeiten wurde es dadurch
         * spürbar still. Gemeldet als „Würfel sollen nicht nur in ganzen Zügen
         * spawnen, sondern nach jeder Bewegung".
         *
         * Nur bei `beendetZug`: Wer am Zug bleibt, hat noch keinen Halbzug
         * verbraucht — der Würfel kommt dann nach seinem Zug.
         */
        if (beschreibung.beendetZug) {
            SCHACH_RUNDE._bonusNachziehen(neu);
        }

        neu.verlauf.push({
            text: "Fähigkeit " + SCHACH_VARIANTEN.faehigkeitTitel(art) + " eingesetzt"
                + zusatzText,
            wer: wer || "",
            farbe: farbe,
            von: -1,
            nach: -1,
            wirkung: art,
            felder: betroffen,
            wege: wege,
            richtung: richtung
        });
        SCHACH_RUNDE._verlaufKuerzen(neu);

        /*
         * IST DIE PARTIE DAMIT VORBEI? (seit v0.94, gefunden im Spieltest)
         *
         * Bis v0.93 wurde Matt und Patt AUSSCHLIESSLICH in `ziehen` geprüft.
         * Eine Fähigkeit konnte deshalb mattsetzen, ohne dass die Partie
         * endete: Der Gegner war am Zug, hatte keinen einzigen erlaubten Zug,
         * und die Leiste sagte trotzdem „am Zug" — die Partie stand still.
         *
         * SEIT v0.95 KANN DIE FÄHIGKEIT SELBST DAS NICHT MEHR: `_wirkungVerboten`
         * oben weist sie ab, bevor es dazu kommt (Nutzer-Entscheidung 20.08.).
         * Diese Prüfung hier ist trotzdem kein toter Code — sie steht NACH dem
         * Einsammeln, und dort liegt der eine Weg, der weiterhin erlaubt ist:
         * Eine Fähigkeit, die eine Lootbox berührt, löst deren Unglück aus, und
         * ein Unglück DARF die Partie beenden (Entscheidung 09.08.: „eine
         * Fähigkeit wählt man, ein Unglück trifft einen"). Wer eine Figur mit
         * dem Nudelholz über einen Riss schiebt, kann so mattgesetzt werden.
         *
         * Gefragt wird dieselbe Funktion und in derselben Reihenfolge wie in
         * `ziehen` — erst nachziehen lassen, dann `SCHACH.lage`. Zwei Wege zu
         * demselben Urteil würden auseinanderlaufen.
         */
        const lage = SCHACH.lage(neu.stand);
        if (lage.art === "matt") {
            neu.ergebnis = lage.sieger;
            neu.laeuft = false;
        } else if (lage.art === "patt" || lage.art === "remis") {
            neu.ergebnis = "remis";
            neu.laeuft = false;
        }

        neu.geaendertAm = (zeitpunkt === undefined) ? Date.now() : zeitpunkt;
        return neu;
    },

    /*
     * DARF DER KÖNIG DAS? — die eine Stelle, die es beantwortet (seit v0.94).
     *
     * Zwei Fälle sind verboten, und beide stehen seit v3.6 im Regelwerk:
     *
     *   1. Man stellt sich mit der Fähigkeit selbst ins Schach. Das darf man
     *      mit einem Zug auch nicht, und eine Fähigkeit ist kein Freibrief.
     *   2. Man steht im Schach und gibt den Zug ab, ohne es aufzulösen. Dann
     *      wäre der König beim nächsten Zug einfach weg — die Partie endete,
     *      ohne dass Schachmatt gesagt wurde.
     *
     * Wer im Schach steht, darf dagegen weiter eine Fähigkeit einsetzen, die
     * den Zug NICHT beendet: Er muss danach ohnehin noch aus dem Schach
     * ziehen, und genau dabei kann sie helfen.
     *
     * WARUM DAS SEIT v0.94 EINE EIGENE FUNKTION IST: Bis dahin stand die
     * Prüfung nur in `faehigkeitEinsetzen`. `zielFelder` — die Liste, aus der
     * das Brett seine Markierungen macht — kannte sie nicht und bot deshalb
     * Felder an, die das Einsetzen hinterher ablehnte. Man tippte ein
     * markiertes Feld an und bekam „Geht gerade nicht". Im Spieltest über
     * 111.000 Halbzüge war das mit Abstand der häufigste Fund. Jetzt fragen
     * beide dieselbe Funktion; das Brett kann gar nichts mehr anbieten, was
     * das Modell danach verweigert.
     *
     * Auf Brettern ohne Schachbegriff (Doppelbrett) entfällt das alles.
     */
    _koenigVerbietet(altStand, neuStand, farbe, beendetZug) {
        if (SCHACH.varianteVon(neuStand).koenigSchlagbar) {
            return false;
        }
        if (!SCHACH.imSchach(neuStand, farbe)) {
            return false;
        }

        return beendetZug || !SCHACH.imSchach(altStand, farbe);
    },

    /*
     * WER GIBT NACH EINER FÄHIGKEIT DEN ZUG AB — und wie (seit v0.95).
     *
     * Zwei Zeilen, die aber an zwei Stellen gebraucht werden: beim Einsetzen
     * selbst und beim Anbieten der Zielfelder (`zielFelder` muss wissen, WER
     * danach am Zug ist, sonst kann es die Regel unten nicht prüfen).
     *
     * Der Doppelzug geht vor: Wer ihn offen hat, behält sein Recht auf einen
     * weiteren Zug, sonst wäre die eine Fähigkeit die andere wert.
     */
    _zugAbgebenNachFaehigkeit(stand, farbe) {
        if (stand.extraZug === farbe) {
            const ohne = Object.assign({}, stand);
            ohne.extraZug = "";
            return ohne;
        }
        return SCHACH.zugAbgeben(stand);
    },

    /*
     * DARF DIESE WIRKUNG SO STEHEN BLEIBEN? (seit v0.95)
     *
     * ------------------------------------------------------------------
     * NUTZER-ENTSCHEIDUNG VOM 20.08.2026, im Wortlaut:
     *
     *   „items sollen nie direkt zu schach oder matt führen … da mauer und so
     *    soll durch cleveres platzieren schon große bis massive auswirkungen
     *    haben, also soll denken belohnt werden. ganz beheben kann man es ja
     *    nie mit items im schach"
     *
     * Sie hebt zwei frühere Entscheidungen auf: das Recht des Frostes,
     * mattzusetzen (18.08., v0.80), und die Folge daraus, dass eine Fähigkeit
     * die Partie beenden kann (v0.94). Die Abwägung dahinter ist DIREKT gegen
     * INDIREKT: Ein Item soll die Stellung vorbereiten, den Angriff führt der
     * ZUG. Wer mit der Mauer clever sperrt, gewinnt weiterhin — nur eben einen
     * Halbzug später und aus eigener Hand.
     *
     * Auf Nachfrage ausdrücklich bestätigt: **auch kein Patt** (sonst liesse
     * sich eine verlorene Partie per Item zum Unentschieden machen), und
     * **Unglücks-Lootboxen bleiben ausgenommen** — für die gilt weiter die
     * Entscheidung vom 09.08. („eine Fähigkeit wählt man, ein Unglück trifft
     * einen"). Deshalb steht diese Prüfung VOR dem Einsammeln in
     * `faehigkeitEinsetzen` und die Ende-Prüfung dahinter: Was die Fähigkeit
     * selbst anrichtet, wird abgewiesen; was ein dabei aufgesammeltes Unglück
     * anrichtet, zählt.
     * ------------------------------------------------------------------
     *
     * Drei Fälle sind verboten. `neuStand` ist die Lage NACH dem Einsetzen,
     * einschliesslich der Zugabgabe — nur so steht fest, wer als Nächster
     * zieht.
     *
     *   1. Der EIGENE König stünde im Schach (seit v3.6, `_koenigVerbietet`).
     *   2. Der GEGNERISCHE König stünde im Schach, und die Fähigkeit hat es
     *      verursacht. Stand er schon vorher darin, liegt es nicht am Item.
     *   3. Wer als Nächster zieht, hätte keinen einzigen Zug. Das ist Matt
     *      oder Patt, je nach Schach — beides ist untersagt, und der Fall
     *      trifft BEIDE Seiten: Wer den Zug behält und sich selbst die letzte
     *      Möglichkeit nimmt (Mauer vor den eigenen König), stünde sonst fest.
     *      Bis v0.93 blieb die Partie dabei einfach stehen.
     *
     * ------------------------------------------------------------------
     * FALL 2 GILT NUR, WENN SICH AUF DEM BRETT WIRKLICH ETWAS BEWEGT HAT —
     * und das ist keine Feinheit, sondern die Stelle, an der die Regel beim
     * Bauen zuerst falsch war (gemessen am 20.08.):
     *
     * `SCHACH.imSchach` rechnet ein aktives ZUSATZMUSTER mit. Sobald der
     * Sprung an ist, gilt der gegnerische König als angegriffen, weil jetzt
     * jede eigene Figur wie ein Springer ziehen könnte — obwohl auf dem Brett
     * keine Figur ihren Platz verlassen hat. Ohne die Einschränkung unten
     * verbot die Regel den Sprung in fast jeder zweiten Stellung (278 von 579
     * Versuchen im Spieltest).
     *
     * Das ist auch sachlich richtig so: Sprung, Teleport und Doppelzug geben
     * nur ein Zugmuster oder ein Zugrecht aus. Was danach passiert, ist ein
     * ZUG — und ein Zug darf Schach geben, matt setzen und alles andere. Der
     * Vergleich der Brett-Zeichenketten trennt beides sauber: Wer keine Figur
     * versetzt, kann auch kein Schach geben.
     *
     * Mauer, Frost, Fessel und Schild versetzen ebenfalls nichts; sie können
     * eine Angriffslinie nur SPERREN, also Schach wegnehmen statt geben.
     * ------------------------------------------------------------------
     *
     * Auf Brettern ohne Schachbegriff (Doppelbrett) entfallen 1 und 2; Fall 3
     * gilt auch dort, denn ein Brett ohne Zug steht auch dort still.
     */
    _wirkungVerboten(altStand, neuStand, farbe, beendetZug) {
        if (SCHACH_RUNDE._koenigVerbietet(altStand, neuStand, farbe, beendetZug)) {
            return true;
        }

        const gegner = SCHACH.gegner(farbe);

        if (altStand.brett !== neuStand.brett
            && !SCHACH.varianteVon(neuStand).koenigSchlagbar
            && SCHACH.imSchach(neuStand, gegner)
            && !SCHACH.imSchach(altStand, gegner)) {

            return true;
        }

        return SCHACH.alleZuege(neuStand).length === 0;
    },

    /*
     * WELCHE FÄHIGKEIT WARTET GERADE AUF IHREN ZUG? (seit v0.76)
     *
     * `istDerZug` (Sprung, Teleport) setzt ein Zugmuster in den Stand und ist
     * damit verbraucht — danach ist die Seite zwar am Zug, darf aber NUR noch
     * nach diesem Muster ziehen. Der Stand merkt sich das Muster, nicht die
     * Fähigkeit; hier steht der Rückweg. Gesucht wird in der Tabelle, damit
     * eine neue Fähigkeit mit eigenem Muster von selbst mitkommt.
     */
    laufendesZugmuster(runde, farbe) {
        const stand = SCHACH_RUNDE.normalisieren(runde);

        if (stand.stand.zusatzFarbe !== farbe || !stand.stand.zusatzNurDieses) {
            return "";
        }

        const namen = Object.keys(SCHACH_VARIANTEN.FAEHIGKEITEN);
        const gefunden = namen.find((art) => {
            const eintrag = SCHACH_VARIANTEN.FAEHIGKEITEN[art];
            return eintrag.art === "zugmuster" && eintrag.istDerZug
                && eintrag.muster === stand.stand.zusatzMuster;
        });

        return gefunden || "";
    },

    /*
     * EIN AKTIVES ITEM ABBRECHEN — UND ZURÜCKBEKOMMEN (seit v0.76).
     *
     * Gemeldet als: „Wenn man ein Item aktiv hat, also gerade dabei ist eine
     * Figur auszuwählen, soll man mit einem Abbrechen-Knopf das Item abbrechen
     * können, und das Item muss zurückgegeben werden."
     *
     * Für Fähigkeiten mit ZIELFELD gab es das seit v0.57 (der Kasten wird
     * platziert, „Abbrechen" verwirft ihn, eingesetzt ist noch gar nichts).
     * Sprung und Teleport waren der blinde Fleck: Sie sind mit dem Antippen
     * SOFORT verbraucht, und danach steht man vor einem Brett, auf dem nur noch
     * das Muster zählt. Wer sich vertippt hatte, musste springen.
     *
     * Zurückgenommen wird deshalb genau das, was `faehigkeitEinsetzen` gesetzt
     * hat: das Muster aus dem Stand und die Fähigkeit zurück in den Vorrat.
     * ES IST KEIN GESCHENK — die Stellung ist danach dieselbe wie vorher, kein
     * Halbzug ist verbraucht, und deshalb erscheint auch keine neue Lootbox
     * (`_bonusNachziehen` läuft hier nicht, genau wie beim Einsetzen selbst).
     * Der Zugzähler steigt trotzdem: Er zählt Änderungen am Stand, und daran
     * hängt die Sicherung gegen zwei gleichzeitige Züge aus einem Team.
     */
    zugmusterZuruecknehmen(runde, spielerId, zeitpunkt) {
        const alt = SCHACH_RUNDE.normalisieren(runde);

        if (!SCHACH_RUNDE.darfZiehen(alt, spielerId)) {
            return null;
        }

        const farbe = SCHACH_RUNDE.teamVon(alt, spielerId);
        const art = SCHACH_RUNDE.laufendesZugmuster(alt, farbe);

        if (!art) {
            return null;
        }

        const neu = SCHACH_RUNDE.kopieren(alt);

        neu.stand = Object.assign({}, neu.stand, {
            zusatzFarbe: "",
            zusatzMuster: "",
            zusatzNurDieses: false,
            sprungAktiv: ""
        });

        neu.faehigkeiten[farbe].push(art);
        neu.zugZaehler = alt.zugZaehler + 1;

        neu.verlauf.push({
            text: "Fähigkeit " + SCHACH_VARIANTEN.faehigkeitTitel(art)
                + " abgebrochen — sie bleibt im Vorrat",
            wer: "",
            farbe: farbe,
            von: -1,
            nach: -1
        });
        SCHACH_RUNDE._verlaufKuerzen(neu);

        neu.geaendertAm = (zeitpunkt === undefined) ? Date.now() : zeitpunkt;
        return neu;
    },

    /*
     * Sammelt alle Würfel ein, über die dieser Zug geführt hat. Ändert die
     * übergebene Runde.
     *
     * BIS v3.5 ZÄHLTE NUR DAS ZIELFELD. Wer mit dem Turm über einen Würfel
     * hinwegzog, liess ihn liegen — was am Brett aussah wie ein Fehler, denn
     * die Figur war ja sichtbar darüber gelaufen. Jetzt zählt jedes betretene
     * Feld. Wer springt (Springer, Fähigkeit „Sprung", Teleport), betritt nur
     * sein Zielfeld und sammelt unterwegs deshalb nichts ein — genau so, wie
     * es `SCHACH.betreteneFelder` festlegt.
     *
     * `altStand` ist der Stand VOR dem Zug: Die Felder gehören zu seiner
     * Nummerierung, und ein Unglückswürfel kann das Brett vergrössern.
     */
    _bonusEinsammeln(runde, altStand, von, nach, farbe, wer, bericht, ohneWeg) {
        return SCHACH_RUNDE._bonusEinsammelnAufFeldern(runde,
            SCHACH.betreteneFelder(altStand, von, nach, ohneWeg), farbe, wer,
            { vonZug: true, von: von, nach: nach, altStand: altStand,
                bericht: bericht });
    },

    /*
     * Sammelt die Würfel auf diesen Feldern ein. Ändert die übergebene Runde.
     *
     * Zwei Wege führen hierher (seit v0.53): ein ZUG (dann sind es die
     * betretenen Felder, siehe oben) und eine FÄHIGKEIT, die Figuren bewegt
     * oder erscheinen lässt (dann sind es ihre betroffenen Felder). Vorher
     * konnte nur ein Zug einsammeln — ein Würfel unter einer per Nudelholz
     * geschobenen Figur blieb für immer liegen.
     *
     * `herkunft` trägt, was der Verlauf braucht (`von`, `nach`, `altStand`) und
     * unterscheidet die beiden Wege: Ein ZUG betritt sein Feld auf jeden Fall,
     * eine FÄHIGKEIT berührt auch Felder, auf denen danach gar nichts oder eine
     * gegnerische Figur steht (Erdbeben verschiebt beide Seiten). Dort wird
     * nichts eingesammelt — sonst bekäme man Würfel für Felder, die man nie
     * betreten hat.
     */
    _bonusEinsammelnAufFeldern(runde, felder, farbe, wer, herkunft) {
        const woher = herkunft || {};
        const von = Number.isInteger(woher.von) ? woher.von : -1;
        const nach = Number.isInteger(woher.nach) ? woher.nach : -1;
        const altStand = woher.altStand || runde.stand;

        const betreten = (felder || []).filter((feld) => {
            if (woher.vonZug) {
                return true;
            }
            return SCHACH.farbeVon(SCHACH.figurAuf(runde.stand, feld)) === farbe;
        });

        const eingesammelt = [];

        for (const feld of betreten) {
            const stelle = runde.bonus.findIndex((eintrag) => eintrag.feld === feld);
            if (stelle === -1) {
                continue;
            }
            eingesammelt.push(runde.bonus[stelle]);
            runde.bonus.splice(stelle, 1);
            runde.bonusGesammelt.push(feld);
        }

        /*
         * Erst alle Fähigkeiten gutschreiben, dann die Unglückswürfel wirken
         * lassen. Die Reihenfolge ist Absicht: Ein Unglückswürfel kann das
         * Brett verändern („Ausdehnung" vergrössert es), und danach zeigen die
         * gemerkten Feldnummern woanders hin.
         */
        for (const bonus of eingesammelt) {
            if (bonus.pech) {
                continue;
            }

            /*
             * WAS DRIN IST, ENTSCHEIDET SICH HIER (seit v3.6) — gegen den
             * Vorrat dessen, der ihn einsammelt. Ein Würfel von vor v3.6 trägt
             * seine Art schon; dann bleibt sie stehen.
             */
            /* Die Feldnummer steht VORNE — sonst liefern zwei Würfel, die im
               selben Zug auf benachbarten Feldern eingesammelt werden, fast
               denselben Wert und damit fast immer dieselbe Fähigkeit (siehe
               `_armeeSaat`). */
            const art = bonus.art || SCHACH_VARIANTEN.faehigkeitAusStufe(
                bonus.stufe,
                SCHACH_RUNDE._zufallsWert(bonus.feld + "|inhalt|"
                    + runde.zugZaehler + "|" + (runde.id || "partie")),
                runde.faehigkeiten[farbe],
                /* Nur, was es in dieser Partie gibt (seit v0.87). */
                SCHACH_RUNDE.erlaubteFaehigkeiten(runde));

            if (!art) {
                continue;
            }
            runde.faehigkeiten[farbe].push(art);

            /* Derselbe Weg wie beim Zug davor: Dieser Eintrag beschreibt
               denselben Zug. So findet der Bildschirm die Bewegung auch dann
               am Ende des Verlaufs, wenn dabei etwas eingesammelt wurde. */
            runde.verlauf.push({
                text: SCHACH_VARIANTEN.faehigkeitTitel(art) + " ("
                    + SCHACH_VARIANTEN.stufeVon(art).titel + ") eingesammelt",
                wer: wer || "",
                farbe: farbe,
                von: von,
                nach: nach,
                wirkung: "eingesammelt",
                felder: [bonus.feld]
            });
            SCHACH_RUNDE._verlaufKuerzen(runde);
        }

        /* Die Felder, auf denen ein UNGLÜCKSwürfel lag — der Aufrufer braucht
           sie, um den Zug am Riss abbrechen zu können (seit v0.58). */
        const pechFelder = [];

        for (const bonus of eingesammelt) {
            if (!bonus.pech) {
                continue;
            }
            pechFelder.push(bonus.feld);

            /*
             * Hat ein früherer Unglückswürfel das Brett schon verändert, sind
             * alle weiteren Felder verschoben. Dann wirkt keiner mehr — er
             * wird nur weggeräumt und im Verlauf vermerkt. Das ist selten
             * (zwei Unglückswürfel auf einem Weg) und allemal besser, als auf
             * ein falsch gerechnetes Feld zu wirken.
             */
            if (SCHACH.felderVon(runde.stand) !== SCHACH.felderVon(altStand)) {
                runde.verlauf.push({
                    text: "Eine zweite Unglücks-Lootbox verpufft — das Brett hat sich "
                        + "gerade verändert",
                    wer: wer || "",
                    farbe: farbe,
                    von: -1,
                    nach: -1,
                    wirkung: "pech",
                    felder: []
                });
                SCHACH_RUNDE._verlaufKuerzen(runde);
                continue;
            }

            /*
             * WO STEHT DIE FIGUR, DIE IHN EINGESAMMELT HAT? (seit v0.58)
             *
             * Bis v0.57 bekam `_pechAusloesen` immer das Feld des WÜRFELS —
             * mit der Begründung „dort steht jetzt die einsammelnde Figur".
             * Das stimmte bis v0.52. Seit „Berühren heisst Einsammeln" (v0.53)
             * sammelt ein Turm auch im Vorbeiziehen ein und steht danach ganz
             * woanders. Der Stolperstein suchte dann auf einem leeren Feld
             * nach einer Figur und verpuffte still — jedes Mal, wenn man über
             * ihn hinwegzog statt auf ihm zu landen.
             *
             * Bei einem Zug ist der Träger das ZIELFELD, sonst weiterhin das
             * Würfelfeld (dort hat eine Fähigkeit die Figur hingestellt).
             */
            const traeger = (woher.vonZug && Number.isInteger(nach) && nach >= 0)
                ? nach
                : bonus.feld;

            SCHACH_RUNDE._pechAusloesen(runde, bonus.art, farbe, bonus.feld, wer,
                von, traeger, woher.bericht);
        }

        return pechFelder;
    },

    /*
     * Lässt einen Unglückswürfel sofort wirken. Ändert die übergebene Runde.
     *
     * `feld` ist das Feld, auf dem er LAG, `farbe` die Seite, die ihn erwischt
     * hat. `traeger` ist das Feld, auf dem die einsammelnde Figur jetzt steht
     * (seit v0.58) — beim Vorbeiziehen ist das nicht dasselbe. Fehlt es, gilt
     * wie früher das Würfelfeld.
     */
    _pechAusloesen(runde, art, farbe, feld, wer, herkunft, traeger, bericht) {
        const basis = (runde.id || "partie") + "|" + runde.zugZaehler + "|pech";
        const wo = Number.isInteger(traeger) ? traeger : feld;
        let wirkung = null;

        if (art === "stolperstein") {
            wirkung = SCHACH.stolperstein(runde.stand, farbe, wo, herkunft, feld);

            /*
             * Wo die Figur hängen bleibt, muss der ZUG erfahren: Er bricht
             * dort ab, und ein Schlag am Zielfeld fällt damit aus (seit
             * v0.73, Meldung I8). Gemeldet wird es über `bericht`, weil das
             * Zurücknehmen nur `ziehen` kann — dort liegen die geschlagene
             * Figur und der Verlaufseintrag.
             */
            if (wirkung && bericht) {
                bericht.stolperHalt = wirkung.halt;
            }

        } else if (art === "ausdehnung") {
            /*
             * ALLE VIER SEITEN, JEDE MIT EINEM VIERTEL — und wenn die gezogene
             * nicht mehr kann, kommt die nächste dran (seit v0.50).
             *
             * `SCHACH.ausdehnung` weist eine Seite ab, sobald das Brett dort an
             * seine Grenze stösst (8 Spalten, 9 Reihen). Bis v0.49 verpuffte der
             * Würfel dann ganz: Wer ihn einsammelte, las „ohne Wirkung" und
             * hatte Glück gehabt — obwohl drei andere Seiten noch Platz hatten.
             * Gezogen wird deshalb weiterhin gleichverteilt, aber die übrigen
             * Seiten werden der Reihe nach durchprobiert.
             */
            const seiten = ["oben", "unten", "links", "rechts"];
            const wahl = SCHACH_RUNDE._zufallsWert(basis + "|seite");
            const erste = Math.floor(wahl * seiten.length) % seiten.length;

            for (let schritt = 0; schritt < seiten.length && !wirkung; schritt++) {
                wirkung = SCHACH.ausdehnung(runde.stand,
                    seiten[(erste + schritt) % seiten.length]);
            }

        } else if (art === "schrumpfung") {
            /* Wie die Ausdehnung: gleichverteilt gezogen, und wenn die
               gezogene Seite nicht kann (König darauf, Brett zu klein), kommt
               die nächste dran. */
            const seiten = ["oben", "unten", "links", "rechts"];
            const wahl = SCHACH_RUNDE._zufallsWert(basis + "|seite");
            const erste = Math.floor(wahl * seiten.length) % seiten.length;

            for (let schritt = 0; schritt < seiten.length && !wirkung; schritt++) {
                wirkung = SCHACH.schrumpfung(runde.stand,
                    seiten[(erste + schritt) % seiten.length]);
            }

        } else if (art === "erdbeben") {
            wirkung = SCHACH.erdbebenRisse(runde.stand,
                SCHACH_RUNDE._zufallsWert(basis + "|risse"));

        } else if (art === "meuterei") {
            wirkung = SCHACH.meuterei(runde.stand, farbe,
                SCHACH_RUNDE._zufallsWert(basis + "|figur"));

        } else if (art === "erdrutsch") {
            wirkung = SCHACH.erdrutsch(runde.stand, farbe);

        } else if (art === "vollesGlas") {
            /* Ändert nichts am Brett — nur daran, wie EINE Seite es sieht. */
            wirkung = {
                stand: Object.assign({}, runde.stand, {
                    glasFarbe: farbe,
                    glasBis: runde.zugZaehler + SCHACH_RUNDE.GLAS_HALBZUEGE
                }),
                felder: [],
                wege: [],
                text: "die Sicht verschwimmt für "
                    + ((farbe === "weiss") ? "Weiss" : "Schwarz")
            };
        }

        const stufe = SCHACH_VARIANTEN.pechStufeVon(art);
        let text = "Unglücks-Lootbox: " + SCHACH_VARIANTEN.pechTitel(art)
            + " (" + stufe.titel + ")";

        if (wirkung) {
            runde.stand = wirkung.stand;
            text += " — " + wirkung.text;

            /*
             * GESCHOBENE BAUERN NEHMEN AUCH HIER IHRE EINTRÄGE MIT (seit
             * v0.98). Bis dahin galt das nur für die FÄHIGKEITEN — ein
             * Unglück (Erdbeben, Erdrutsch, Meuterei) schob Bauern, ohne die
             * Einträge nachzuführen. Das ist dieselbe Lücke wie beim
             * Erdrutsch in v0.81, nur eine Ebene höher: Wer eine Bewegung
             * baut, muss sie an EINER Stelle melden.
             *
             * Zwei Dinge hängen daran: die Startseite des Bauern (auf dem
             * Kreuz läuft er sonst in die falsche Richtung) und sein Recht
             * auf den ersten Doppelschritt.
             *
             * NICHT bei einer Brettgrössen-Änderung: Dort tragen die Wege noch
             * die ALTEN Feldnummern, während der Stand schon die neuen führt —
             * `SCHACH._feldnummernUmrechnen` hat beide Listen dann bereits
             * selbst umgerechnet. Erkennbar an `wirkung.umrechnen`.
             */
            if (typeof wirkung.umrechnen !== "function") {
                runde.stand = SCHACH.figurMarkenVerschieben(
                    runde.stand, wirkung.wege);
            }

            /*
             * ÄNDERT SICH DIE BRETTGRÖSSE, WANDERN DIE LIEGENDEN WÜRFEL MIT
             * (seit v0.54).
             *
             * Der Stand rechnet seine gemerkten Felder selbst um; die Würfel
             * liegen aber in der RUNDE, davon weiss `schach.js` nichts. Bis
             * v0.53 blieben sie nach einer Ausdehnung auf ihren alten Nummern
             * stehen und lagen damit plötzlich woanders — bei der Schrumpfung
             * wären sie sogar ausserhalb des Bretts gelandet.
             *
             * Was auf einer weggebrochenen Linie lag, fällt mit weg: Genau das
             * ist beim Einsturz gewollt.
             */
            if (typeof wirkung.umrechnen === "function") {
                runde.bonus = runde.bonus
                    .map((eintrag) => Object.assign({}, eintrag, {
                        feld: wirkung.umrechnen(eintrag.feld)
                    }))
                    .filter((eintrag) => eintrag.feld >= 0);
            }

            /*
             * WAS AUF EINEM RISS LAG, FÄLLT HINEIN (seit v0.59, Wunsch #20).
             *
             * Ein Erdbeben reisst Felder auf, ohne zu fragen, ob dort ein
             * Würfel liegt — und auf ein gesperrtes Feld kann danach niemand
             * mehr ziehen. Der Würfel lag damit für den Rest der Partie
             * unerreichbar im Loch. Jetzt fällt er mit hinein.
             *
             * Gefragt wird `rissAuf`, nicht `gesperrt`: Eine MAUER läuft ab,
             * der Würfel darunter wird danach wieder erreichbar und soll
             * liegen bleiben. Ein Riss bleibt die ganze Partie.
             */
            runde.bonus = runde.bonus.filter(
                (eintrag) => !SCHACH.rissAuf(runde.stand, eintrag.feld));
        } else {
            /* Auch ein wirkungsloser Unglückswürfel wird festgehalten: Sonst
               stünde im Verlauf ein Einsammeln ohne Folge, und niemand wüsste,
               warum nichts passiert ist. */
            text += " — ohne Wirkung";
        }

        /*
         * DER UNGLÜCKS-EINTRAG IST KEINE BEWEGUNG (seit v0.76).
         *
         * Bis v0.75 stand hier `von` = Startfeld des Zuges und `nach` = Feld
         * der Lootbox. Beides zusammen sah für den Bildschirm aus wie ein Weg —
         * und er zeichnete ihn: die Spur lief vom Startfeld zur LOOTBOX und
         * hörte dort auf, in Gelb, während die Figur ganz woanders stand. Die
         * grüne Spur des eigenen Zuges war damit weg, und die Bewegung suchte
         * ihre Figur auf dem Lootbox-Feld (gemeldet am 18.08.: „wenn ich eine
         * Unglücksbox einsammle, verhält sich die grüne Farbe meiner Bewegung
         * nicht richtig").
         *
         * Was das Unglück wirklich bewegt hat, steht in `wege` — dort und
         * nirgendwo sonst. `felder` sagt, worauf es gewirkt hat. Ein Weg vom
         * Start des Zuges zur Lootbox hat nie stattgefunden.
         */
        runde.verlauf.push({
            text: text,
            wer: wer || "",
            farbe: farbe,
            von: -1,
            nach: -1,
            wirkung: "pech",
            felder: wirkung ? wirkung.felder : [feld],
            wege: wirkung ? (wirkung.wege || []) : []
        });
        SCHACH_RUNDE._verlaufKuerzen(runde);
    },

    /*
     * Welche Felder kommen für eine Fähigkeit als Ziel in Frage?
     *
     * Ermittelt durch Ausprobieren: Ein Feld ist ein gültiges Ziel, wenn die
     * Wirkung dort etwas ergibt. Damit kann die Anzeige nicht von der Regel
     * abweichen — es gibt keine zweite Liste von Bedingungen, die veralten
     * könnte. Geprüft wird auf Kopien, damit nichts hängen bleibt.
     */
    zielFelder(runde, spielerId, art, wahl) {
        const alt = SCHACH_RUNDE.normalisieren(runde);
        const farbe = SCHACH_RUNDE.teamVon(alt, spielerId);
        const beschreibung = SCHACH_VARIANTEN.FAEHIGKEITEN[art];

        if (!farbe || !beschreibung || beschreibung.art !== "ziel") {
            return [];
        }

        /*
         * NUR FELDER, DIE DAS EINSETZEN AUCH ANNIMMT (seit v0.94).
         *
         * Dass die Wirkung zustande kommt, ist nur die halbe Frage. Die andere
         * stellt `_wirkungVerboten` — dieselbe Funktion, die auch
         * `faehigkeitEinsetzen` fragt. Bis v0.93 kannte sie nur das Einsetzen;
         * das Brett markierte deshalb Felder, die es hinterher ablehnte.
         *
         * Seit v0.95 wiegt das doppelt: Die Regel ist strenger geworden (kein
         * Schach, kein Matt, kein Patt durch ein Item), also fielen ohne diese
         * Zeile umso mehr Felder erst beim Antippen durch. Die Zugabgabe wird
         * dafür mitgerechnet — sonst wüsste die Regel nicht, wer als Nächster
         * zieht.
         */
        const liste = [];
        for (let feld = 0; feld < SCHACH.felderVon(alt.stand); feld++) {
            const wirkung = SCHACH_RUNDE._zielWirkung(
                SCHACH_RUNDE.kopieren(alt), art, farbe, feld, wahl);

            if (!wirkung) {
                continue;
            }

            const danach = beschreibung.beendetZug
                ? SCHACH_RUNDE._zugAbgebenNachFaehigkeit(wirkung.stand, farbe)
                : wirkung.stand;

            if (SCHACH_RUNDE._wirkungVerboten(alt.stand, danach, farbe,
                !!beschreibung.beendetZug)) {

                continue;
            }
            liste.push(feld);
        }

        return liste;
    },

    /*
     * WELCHE FELDER DIE WIRKUNG BERÜHREN WÜRDE (seit v0.57).
     *
     * Das ist die Auskunft für den Vorschau-Kasten: Der Bildschirm zeigt den
     * Umriss der echten Wirkung, BEVOR man sie einsetzt — drei Felder bei der
     * Mauer, ein 2×2 beim Frost und beim Friedhof, eine Spalte beim Nudelholz.
     *
     * Gefragt wird `_zielWirkung`, also genau die Rechnung, die hinterher auch
     * läuft. Eine zweite Liste von „was passiert wo" wäre eine zweite
     * Wahrheit, und sie veraltete beim ersten Umbau einer Fähigkeit — dieselbe
     * Überlegung wie bei `zielFelder`.
     *
     * Liefert eine leere Liste, wenn die Wirkung dort nicht zustande kommt.
     */
    zielUmriss(runde, spielerId, art, feld, wahl) {
        const alt = SCHACH_RUNDE.normalisieren(runde);
        const farbe = SCHACH_RUNDE.teamVon(alt, spielerId);
        const beschreibung = SCHACH_VARIANTEN.FAEHIGKEITEN[art];

        if (!farbe || !beschreibung || beschreibung.art !== "ziel") {
            return [];
        }

        const wirkung = SCHACH_RUNDE._zielWirkung(
            SCHACH_RUNDE.kopieren(alt), art, farbe, feld, wahl);

        return (wirkung && Array.isArray(wirkung.felder)) ? wirkung.felder.slice() : [];
    },

    /*
     * WIE VIELE BAUERN DER SCHUB UMWANDELN WÜRDE (seit v0.56).
     *
     * Der Bildschirm fragt danach, bevor er den Bauernschub einsetzt: Nur wenn
     * die Antwort grösser als 0 ist, lohnt die Rückfrage nach der Figur.
     *
     * Warum das hier steht und nicht im Bildschirm: Welche Bauern vorrücken
     * und welche dabei die letzte Reihe erreichen, ist eine Regelfrage — sie
     * hängt an freien Feldern, an der Zugrichtung und am Brettmass. Gerechnet
     * wird sie deshalb mit derselben Funktion, die es hinterher wirklich tut.
     */
    schubWandeltUm(runde, spielerId) {
        const alt = SCHACH_RUNDE.normalisieren(runde);
        const farbe = SCHACH_RUNDE.teamVon(alt, spielerId);

        if (!farbe) {
            return 0;
        }

        const wirkung = SCHACH.bauernschub(alt.stand, farbe);
        return (wirkung && wirkung.umgewandelt) ? wirkung.umgewandelt.length : 0;
    },

    /* Die Fähigkeiten, die ein angetipptes Feld brauchen. */
    _zielWirkung(runde, art, farbe, feld, wahl) {
        if (feld < 0 || feld >= SCHACH.felderVon(runde.stand)) {
            return null;
        }

        /*
         * DIE AUFWERTUNG WÜRFELT NICHT, SIE RECHNET (seit v0.56).
         *
         * Beim Springer gibt es zwei Ergebnisse (Läufer oder Turm), und die
         * Entscheidung muss auf jedem Gerät gleich ausfallen — sonst sieht
         * einer einen Läufer und der andere einen Turm, und der erste
         * Schreibvorgang gewinnt. Dieselbe Falle wie in v0.8.
         *
         * Das FELD steht vorn in der Saat: `_zufallsWert` ist FNV-1a, und ein
         * Unterschied im letzten Zeichen verschiebt das Ergebnis nur um
         * Bruchteile. Stünde das Feld hinten, bekämen ganze Feldblöcke
         * dieselbe Figur (siehe die Merksätze in `CLAUDE.md`).
         */
        if (art === "verstaerkung") {
            const saat = feld + "|aufwertung|" + (runde.id || "partie")
                + "|" + runde.zugZaehler;

            return SCHACH.verstaerkung(runde.stand, farbe, feld,
                SCHACH_RUNDE._zufallsWert(saat));
        }

        /* Das Erdbeben ist seit v0.54 ein Unglückswürfel und braucht kein
           Zielfeld mehr — es steht in `_pechAusloesen`. */

        if (art === "mauer") {
            const wirkung = SCHACH.mauerLegen(runde.stand, feld, wahl === "senkrecht");

            if (!wirkung) {
                return null;
            }

            /*
             * DIE MAUER FRISST DIE LOOTBOX (seit v0.77, Nutzer-Ansage 18.08.)
             * — KEHRT DIE REGEL AUS v0.66 UM.
             *
             * v0.66 (Wunsch #32) hat ein Feld mit Lootbox gar nicht erst als
             * Ziel angeboten. Die Begründung damals: Unter der Mauer ist die
             * Box unsichtbar und unerreichbar, „von aussen dasselbe wie weg" —
             * also lieber die Mauer woanders hin.
             *
             * Der Nutzer will es andersherum: „Die Mauer soll man auf alle
             * Felder platzieren können, wo es von den Figuren und vom Brettrand
             * her geht. Sobald man die Mauer dahin platziert, wo davor eine
             * Lootbox stand, verschwindet diese — sie wird gefressen."
             *
             * Damit wird aus dem „dasselbe wie weg" ein ehrliches Weg. Die
             * beiden Nachteile von v0.66 fallen mit: Man muss beim Platzieren
             * nicht mehr raten, warum ein Feld nicht geht, und die Mauer ist
             * wieder überall dort legbar, wo sie hingehört. Dass man dabei
             * etwas zerstört, ist die Gegenleistung — beim RISS ist es seit
             * v0.60 genauso, nur ungewollt.
             *
             * Der Bildschirm blendet die Lootboxen aus, solange man eine Mauer
             * platziert (`team-schach-brett.js`) — dieselbe Hilfe wie beim
             * Friedhof seit v0.57: Was in diesem Moment nicht zur Wahl gehört,
             * lenkt nur ab.
             */
            const gefressen = runde.bonus.filter(
                (eintrag) => wirkung.felder.indexOf(eintrag.feld) !== -1);

            if (gefressen.length > 0) {
                runde.bonus = runde.bonus.filter(
                    (eintrag) => wirkung.felder.indexOf(eintrag.feld) === -1);

                wirkung.text += ", frisst " + gefressen.length
                    + (gefressen.length === 1 ? " Lootbox" : " Lootboxen");
            }

            return wirkung;
        }

        /*
         * DER FRIEDHOF WECKT, WER GENAU DORT GEFALLEN IST (seit v0.54).
         *
         * Die Geweckten werden aus der Grabliste verbraucht; `verloren` bleibt
         * unangetastet, damit die Bilanz weiter zählt, was wirklich geschlagen
         * wurde.
         *
         * Bis v0.53 nahm er die vier ZULETZT gefallenen Gegner und stellte sie
         * auf ein beliebiges freies 2×2-Feld. Auf Nutzer-Ansage ist daraus eine
         * andere Regel geworden: Man sieht auf dem Brett, WO die Gefallenen
         * liegen, wählt ein 2×2-Feld — und genau die, die dort fielen, stehen
         * dort wieder auf, jeder auf seinem eigenen Feld.
         *
         * Das macht die Fähigkeit ortsgebunden statt beliebig: Sie ist stark,
         * wo viel gestorben ist, und nutzlos auf einem leeren Flügel.
         */
        if (art === "friedhof") {
            const gegner = SCHACH.gegner(farbe);
            const gefallene = runde.gefallen[gegner] || [];

            if (gefallene.length === 0) {
                return null;
            }

            const block = SCHACH.friedhofsFelder(runde.stand, feld);
            if (!block) {
                return null;
            }

            /* Wer liegt in diesem Block? Je Feld höchstens einer — fielen dort
               mehrere, steht der zuletzt gefallene auf. */
            const dort = [];
            const benutzt = [];

            for (let stelle = gefallene.length - 1; stelle >= 0; stelle--) {
                const eintrag = gefallene[stelle];

                if (block.indexOf(eintrag.feld) === -1
                    || benutzt.indexOf(eintrag.feld) !== -1) {
                    continue;
                }
                benutzt.push(eintrag.feld);
                dort.push({ stelle: stelle, art: eintrag.art, feld: eintrag.feld });
            }

            if (dort.length === 0) {
                return null;
            }

            const wirkung = SCHACH.friedhof(runde.stand, farbe, feld,
                dort.map((eintrag) => ({ art: eintrag.art, feld: eintrag.feld })));

            if (!wirkung) {
                return null;
            }

            /* Nur die verbraucht, die wirklich aufgestanden sind. */
            const geweckt = dort
                .filter((eintrag) => wirkung.felder.indexOf(eintrag.feld) !== -1)
                .map((eintrag) => eintrag.stelle);

            runde.gefallen[gegner] = gefallene.filter(
                (eintrag, stelle) => geweckt.indexOf(stelle) === -1);

            return wirkung;
        }

        if (art === "schutzschild") {
            const figur = SCHACH.figurAuf(runde.stand, feld);
            /* Auf den König wirkt das Schild nicht — sonst wäre "Schachmatt"
               nicht mehr eindeutig. Dieselbe Überlegung wie beim Doppelbrett. */
            if (SCHACH.farbeVon(figur) !== farbe || SCHACH.artVon(figur) === "K") {
                return null;
            }
            const stand = Object.assign({}, runde.stand, {
                schildFeld: feld,
                schildFarbe: farbe
            });
            return { stand: stand, felder: [feld], text: SCHACH.artName(SCHACH.artVon(figur)) };
        }

        if (art === "fessel") {
            const figur = SCHACH.figurAuf(runde.stand, feld);
            const gegner = SCHACH.gegner(farbe);
            /* Der König wird nicht gefesselt: Wer im Schach steht und nicht
               ziehen darf, wäre ohne eigenen Fehler matt. */
            if (SCHACH.farbeVon(figur) !== gegner || SCHACH.artVon(figur) === "K") {
                return null;
            }
            const stand = Object.assign({}, runde.stand, {
                fesselFeld: feld,
                fesselFarbe: gegner,

                /* Seit v0.56 hält sie mehrere Züge — gemessen am Takt, der
                   einzigen Uhr, die nicht zurückspringt. */
                fesselBis: runde.stand.takt + SCHACH.FESSEL_HALBZUEGE
            });
            return { stand: stand, felder: [feld], text: SCHACH.artName(SCHACH.artVon(figur)) };
        }

        /*
         * DER FROST SPERRT SEIT v0.56 EINEN 2×2-BLOCK.
         *
         * Angetippt wird die linke obere Ecke — dieselbe Lesart wie beim
         * Friedhof.
         *
         * WO ER SICH SETZEN LÄSST (seit v0.73, Meldung I10, Nutzer-Entscheidung
         * 09.08.: „eigenen helfen oder Gegner blockieren"). Bis v0.72 musste
         * wenigstens eine GEGNERISCHE Figur im Block stehen. Jetzt zählt jede
         * Figur, gleich welcher Farbe: Eingefroren heisst auch unantastbar, und
         * genau das kann man für die eigenen Leute wollen.
         *
         * Ein LEERER Block bleibt trotzdem draussen. Er friert nichts ein und
         * wäre ein verschenkter Würfel; ausserdem stünden auf einem leeren Brett
         * sonst hunderte gültiger Ziele.
         *
         * Eingefroren wird alles im Block, auch eigene Figuren
         * (Nutzer-Entscheidung 08.08.) und seit v0.80 auch Könige. WAS das für
         * eine Figur bedeutet, entscheidet `SCHACH.eingefroren` und nicht die
         * Auswahl hier: nicht heraus, aber im Block beweglich.
         */
        if (art === "frost") {
            const gegner = SCHACH.gegner(farbe);
            const block = SCHACH.frostBlock(runde.stand, feld);

            if (!block) {
                return null;
            }

            /*
             * SEIT v0.80 ZÄHLT AUCH EIN KÖNIG ALS TREFFER.
             *
             * Bis v0.79 stand hier `artVon(figur) !== "K"` — Könige konnten
             * nicht einfrieren, ein Block mit nur einem König war deshalb kein
             * gültiges Ziel. Genau diesen Fall hat der Nutzer verlangt: „Wenn
             * im Frostbereich nur ein König ist, kann er nicht raus." Ohne
             * diese Zeile wäre die Regel in `SCHACH.eingefroren` gebaut und
             * hier trotzdem nicht anwählbar gewesen.
             *
             * Ein LEERER Block bleibt draussen: Er friert nichts ein und wäre
             * eine verschenkte Lootbox — dafür gibt es die Mauer.
             */
            const trifft = block.filter(
                (platz) => SCHACH.figurAuf(runde.stand, platz) !== ".");

            if (trifft.length === 0) {
                return null;
            }

            const stand = Object.assign({}, runde.stand, {
                frostFeld: block[0],
                frostFelder: block.slice(),
                frostFarbe: gegner
            });

            return { stand: stand, felder: block.slice(), wege: [],
                text: trifft.length + (trifft.length === 1 ? " Figur" : " Figuren") };
        }

        if (art === "spiegel") {
            return SCHACH.spiegel(runde.stand, farbe, feld);
        }

        /* Die zwei gewöhnlichen von v0.79 — die Regel steht bei ihnen selbst
           in `schach.js`, hier wird nur durchgereicht. */
        if (art === "schubs") {
            return SCHACH.schubs(runde.stand, farbe, feld);
        }

        if (art === "platztausch") {
            /* `wahl` ist hier die RICHTUNG (seit v0.101) — dasselbe Muster wie
               die Lage der Mauer, nur mit vier Möglichkeiten statt zwei. */
            return SCHACH.platztausch(runde.stand, farbe, feld, wahl);
        }

        if (art === "nudelholz") {
            /*
             * EINE BAHN, RICHTUNG FREI (seit v0.117, Nutzer-Entscheidung
             * 22.08. — vorher: zwei Spalten, immer von der eigenen Seite
             * weg). Die Richtung reist wie bei der Mauer als Zusatzwahl
             * `wahl` herein: der Rand, VON dem gerollt wird ("unten",
             * "oben", "links", "rechts", Brett-Koordinaten). Ohne Wahl gilt
             * die eigene Seite — für Weiss unten, für Schwarz oben; so
             * rollt es wie früher von einem weg.
             *
             * Antippbar sind die Felder des gewählten RANDES — dort setzt
             * das Holz an und bestimmt so die Spalte oder Reihe.
             */
            const kante = SCHACH.NUDELHOLZ_KANTEN[wahl]
                ? wahl
                : ((farbe === SCHACH.WEISS) ? "unten" : "oben");

            const breite = SCHACH.breiteVon(runde.stand);
            const hoehe = SCHACH.hoeheVon(runde.stand);
            const reihe = SCHACH.reiheVon(feld, breite);
            const spalte = SCHACH.spalteVon(feld, breite);

            const amRand = (kante === "unten" && reihe === hoehe - 1)
                || (kante === "oben" && reihe === 0)
                || (kante === "links" && spalte === 0)
                || (kante === "rechts" && spalte === breite - 1);

            if (!amRand) {
                return null;
            }
            return SCHACH.nudelholz(runde.stand, feld, kante);
        }

        /*
         * Wiederbelebung: Die Figur kehrt an ihr Grab zurück.
         *
         * Gesucht wird der ZULETZT auf diesem Feld gefallene eigene Stein —
         * fielen dort mehrere nacheinander, kommt der jüngste zuerst wieder.
         * Der Eintrag wird verbraucht, sonst liesse sich dieselbe Figur mit
         * einer zweiten Wiederbelebung noch einmal holen.
         */
        if (art === "wiederbelebung") {
            const gefallene = runde.gefallen[farbe];
            if (!gefallene || gefallene.length === 0) {
                return null;
            }

            let stelle = -1;
            for (let nummer = gefallene.length - 1; nummer >= 0; nummer--) {
                if (gefallene[nummer].feld === feld) {
                    stelle = nummer;
                    break;
                }
            }
            if (stelle === -1) {
                return null;
            }

            const wirkung = SCHACH.wiedergeburt(
                runde.stand, farbe, feld, gefallene[stelle].art);

            if (!wirkung) {
                return null;
            }

            gefallene.splice(stelle, 1);
            return wirkung;
        }

        /*
         * Nachschub (seit v0.61): ein NEUER Bauer auf der eigenen Grundreihe.
         * Kein Vorrat dahinter — anders als Wiedergeburt und Wiederbelebung
         * verbraucht er nichts, er erschafft. Deshalb steht er auch nicht in
         * `_gefalleneVorhanden`.
         */
        if (art === "nachschub") {
            /* Dieselbe Rechnung wie bei der Wiedergeburt darunter: die eigene
               Grundreihe, unten für Weiss und oben für Schwarz. */
            const grundreihe = (farbe === "weiss") ? SCHACH.hoeheVon(runde.stand) - 1 : 0;
            if (SCHACH.reiheVon(feld, SCHACH.breiteVon(runde.stand)) !== grundreihe) {
                return null;
            }
            return SCHACH.wiedergeburt(runde.stand, farbe, feld, "B");
        }

        if (art === "wiedergeburt") {
            const verloren = runde.verloren[farbe];
            if (!verloren || verloren.length === 0) {
                return null;
            }
            const grundreihe = (farbe === "weiss") ? SCHACH.hoeheVon(runde.stand) - 1 : 0;
            if (SCHACH.reiheVon(feld, SCHACH.breiteVon(runde.stand)) !== grundreihe) {
                return null;
            }

            const figurArt = verloren[verloren.length - 1];
            const wirkung = SCHACH.wiedergeburt(runde.stand, farbe, feld, figurArt);
            if (!wirkung) {
                return null;
            }
            verloren.pop();
            return wirkung;
        }

        return null;
    },

    /* ---------------------------------------------------------------- *
     * Der Händler (seit v3.3)
     *
     * Er unterscheidet sich von jeder anderen Fähigkeit darin, dass man ihn
     * ANSEHEN kann, bevor man ihn benutzt: Das Angebot steht fest, sobald die
     * Fähigkeit im Vorrat liegt, und ändert sich erst mit dem nächsten Zug.
     * Deshalb kostet ein Ablehnen nichts — man kann nicht so lange neu würfeln,
     * bis das Angebot passt, denn dazwischen liegt immer ein Zug.
     * ---------------------------------------------------------------- */

    /*
     * Das Angebot für diese Farbe, oder null, wenn gerade keines möglich ist.
     * Liefert:
     *
     *     {
     *         gibt:     { art, anzahl },
     *         bekommt:  { art, anzahl },
     *         gibtFelder:    [Felder, die geräumt werden],
     *         bekommtFelder: [Felder, auf denen Neues erscheint],
     *         text: "3 Bauern gegen 1 Springer"
     *     }
     *
     * Gerechnet, nicht gewürfelt: Alle Geräte sehen dasselbe Angebot.
     */
    handelsAngebot(runde, farbe) {
        const stand = SCHACH_RUNDE.normalisieren(runde);

        if (farbe !== "weiss" && farbe !== "schwarz") {
            return null;
        }

        const marke = (stand.id || "partie") + "|handel|" + stand.zugZaehler + "|" + farbe;
        const angebot = SCHACH_VARIANTEN.handelZiehen(SCHACH_RUNDE._zufallsWert(marke));

        /*
         * WELCHE Figuren weggehen, entscheidet nicht der Spieler: Er tippt
         * sonst fünf Felder nacheinander an, und bei jedem Fehlgriff wäre der
         * Handel dahin. Genommen werden die HINTERSTEN — die, die am weitesten
         * von der gegnerischen Grundreihe entfernt stehen. Das ist die Wahl,
         * die man ohnehin fast immer treffen würde, und sie ist vorhersagbar.
         */
        /*
         * Seit v0.58 kann eine Seite MEHRERE Figurenarten tragen („Dame und
         * Bauer gegen einen König"). Gesammelt wird je Art getrennt; fehlt an
         * einer Stelle etwas, kommt der Handel nicht zustande.
         */
        const gibtTeile = SCHACH_VARIANTEN.handelSeite(angebot.gibt);
        const gibtAnzahl = SCHACH_VARIANTEN.handelAnzahl(angebot.gibt);
        const gibtFelder = [];

        for (const teil of gibtTeile) {
            const felder = SCHACH_RUNDE._hintersteFiguren(
                stand, farbe, teil.art, teil.anzahl);

            if (felder.length < teil.anzahl) {
                return null;
            }
            for (const feld of felder) {
                gibtFelder.push(feld);
            }
        }

        if (gibtFelder.length < gibtAnzahl) {
            return null;
        }

        /*
         * Die neuen Figuren erscheinen auf den frei werdenden Feldern; reichen
         * die nicht, kommen freie Felder der eigenen Grundreihe dazu. So bleibt
         * der Handel dort, wo die abgegebenen Figuren standen — und nicht
         * plötzlich in der gegnerischen Hälfte.
         */
        const bekommtAnzahl = SCHACH_VARIANTEN.handelAnzahl(angebot.bekommt);
        const bekommtFelder = SCHACH_RUNDE._handelsPlaetze(
            stand, farbe, gibtFelder, bekommtAnzahl);

        if (bekommtFelder.length < bekommtAnzahl) {
            return null;
        }

        return {
            gibt: angebot.gibt,
            bekommt: angebot.bekommt,
            gibtFelder: gibtFelder,
            bekommtFelder: bekommtFelder,
            text: SCHACH_RUNDE._handelsText(angebot.gibt)
                + " gegen " + SCHACH_RUNDE._handelsText(angebot.bekommt)
        };
    },

    /* Die Mehrzahl der Figurennamen — im Deutschen nicht ableitbar. */
    FIGUR_MEHRZAHL: {
        B: "Bauern", S: "Springer", L: "Läufer",
        T: "Türme", D: "Damen", K: "Könige"
    },

    /* „3 Bauern" — und seit v0.58 auch „1 Dame und 1 Bauer". */
    _handelsText(seite) {
        return SCHACH_VARIANTEN.handelSeite(seite)
            .map((teil) => teil.anzahl + " " + ((teil.anzahl === 1)
                ? SCHACH.artName(teil.art)
                : (SCHACH_RUNDE.FIGUR_MEHRZAHL[teil.art] || SCHACH.artName(teil.art))))
            .join(" und ");
    },

    /*
     * Die `anzahl` eigenen Figuren dieser Art, die am weitesten hinten stehen.
     * „Hinten" heisst: nah an der eigenen Grundreihe.
     */
    _hintersteFiguren(runde, farbe, art, anzahl) {
        const stand = runde.stand;
        const breite = SCHACH.breiteVon(stand);
        const eigene = [];

        for (let feld = 0; feld < SCHACH.felderVon(stand); feld++) {
            const figur = SCHACH.figurAuf(stand, feld);

            if (SCHACH.farbeVon(figur) === farbe && SCHACH.artVon(figur) === art) {
                eigene.push(feld);
            }
        }

        /* Weiss steht unten (grosse Reihennummern), Schwarz oben. */
        eigene.sort((einer, anderer) => {
            const reiheEiner = SCHACH.reiheVon(einer, breite);
            const reiheAnderer = SCHACH.reiheVon(anderer, breite);

            return (farbe === "weiss")
                ? (reiheAnderer - reiheEiner) || (einer - anderer)
                : (reiheEiner - reiheAnderer) || (einer - anderer);
        });

        return eigene.slice(0, anzahl);
    },

    /*
     * Den Handel wirklich durchführen: erst alle abgegebenen Felder räumen,
     * dann die neuen Figuren setzen.
     *
     * Die Reihenfolge ist Absicht — Räumen und Setzen können sich dieselben
     * Felder teilen (die neue Figur erscheint da, wo die alte stand). Würde man
     * abwechselnd räumen und setzen, löschte das Räumen eine gerade gesetzte
     * Figur wieder weg. Dieselbe Falle wie bei der Rochade auf schmalen
     * Brettern (siehe docs\DECISIONS.md).
     */
    /* Wie viele Fähigkeiten der Dieb höchstens mitnimmt (seit v0.85). */
    DIEB_BEUTE: 2,

    /*
     * WAS DER DIEB DIESMAL ERWISCHT — gerechnet, nicht gewürfelt.
     *
     * Dieselbe Vorsichtsmassnahme wie beim Händler: Der Bildschirm fragt das
     * hier ab, um die Beute ZU ZEIGEN, und das Modell rechnet sie beim
     * Einsetzen NEU. Sonst könnte ein Gerät mit veraltetem Stand eine Beute
     * durchsetzen, die es so nicht mehr gibt.
     *
     * Die Saat hängt am Zugzähler — nach dem nächsten Zug greift der Dieb also
     * woanders zu. Wer ablehnt, kann damit nicht so lange neu fragen, bis ihm
     * die Auswahl passt.
     *
     * Rückgabe: `{ opfer, stellen, arten }` oder `null`, wenn nichts zu holen
     * ist. `stellen` steht ABSTEIGEND — nur so bleiben die Positionen gültig,
     * während sie der Reihe nach aus dem Vorrat entfernt werden.
     */
    diebesBeute(runde, farbe) {
        const voll = SCHACH_RUNDE.normalisieren(runde);

        if (farbe !== "weiss" && farbe !== "schwarz") {
            return null;
        }

        const opfer = SCHACH.gegner(farbe);
        const vorrat = Array.isArray(voll.faehigkeiten[opfer])
            ? voll.faehigkeiten[opfer] : [];

        if (vorrat.length === 0) {
            return null;
        }

        const marke = (voll.id || "partie") + "|dieb|" + voll.zugZaehler + "|" + farbe;
        const wieViele = Math.min(SCHACH_RUNDE.DIEB_BEUTE, vorrat.length);

        /* Aus den noch nicht gegriffenen Plätzen wird gezogen — so kommt
           dieselbe Stelle nie zweimal, auch wenn zwei gleiche Fähigkeiten
           nebeneinander liegen. */
        const uebrig = vorrat.map((art, stelle) => stelle);
        const stellen = [];

        for (let nummer = 0; nummer < wieViele; nummer++) {
            const wert = SCHACH_RUNDE._zufallsWert(marke + "|" + nummer);
            const wahl = Math.min(Math.floor(wert * uebrig.length), uebrig.length - 1);

            stellen.push(uebrig[wahl]);
            uebrig.splice(wahl, 1);
        }

        stellen.sort((eine, andere) => andere - eine);

        return {
            opfer: opfer,
            stellen: stellen,
            arten: stellen.map((stelle) => vorrat[stelle])
        };
    },

    /*
     * Der Diebstahl selbst. Er fasst als einzige Wirkung NICHT das Brett an,
     * sondern die beiden Vorräte — deshalb gibt er den Stand unverändert
     * zurück und meldet keine betroffenen Felder.
     */
    _diebstahlAusfuehren(runde, farbe) {
        const beute = SCHACH_RUNDE.diebesBeute(runde, farbe);
        if (!beute) {
            return null;
        }

        /* Erst wegnehmen (von hinten nach vorn, sonst verrutschen die
           Positionen), dann gutschreiben. Angehängt wird hinten — die Stelle,
           an der der Dieb selbst liegt, muss gültig bleiben: Der Aufrufer
           entfernt ihn gleich über genau diesen Index. */
        for (const stelle of beute.stellen) {
            runde.faehigkeiten[beute.opfer].splice(stelle, 1);
        }

        for (const art of beute.arten) {
            runde.faehigkeiten[farbe].push(art);
        }

        return {
            stand: runde.stand,
            felder: [],
            text: beute.arten
                .map((art) => SCHACH_VARIANTEN.faehigkeitTitel(art))
                .join(" und ")
        };
    },

    _handelAusfuehren(runde, farbe) {
        const angebot = SCHACH_RUNDE.handelsAngebot(runde, farbe);
        if (!angebot) {
            return null;
        }

        let brett = runde.stand.brett;

        for (const feld of angebot.gibtFelder) {
            brett = SCHACH._brettMit(brett, feld, ".");
        }

        /* Die Plätze werden der Reihe nach vergeben — erst die erste
           Figurenart, dann die nächste (seit v0.58 können es mehrere sein). */
        let stelle = 0;
        let bringtKoenig = false;

        for (const teil of SCHACH_VARIANTEN.handelSeite(angebot.bekommt)) {
            const figur = (farbe === "weiss") ? teil.art : teil.art.toLowerCase();

            if (teil.art === "K") {
                bringtKoenig = true;
            }

            for (let nummer = 0; nummer < teil.anzahl; nummer++) {
                brett = SCHACH._brettMit(brett, angebot.bekommtFelder[stelle], figur);
                stelle++;
            }
        }

        const stand = Object.assign({}, runde.stand, { brett: brett, enPassant: "" });

        /*
         * Ein erhandelter König ist ein zweites LEBEN, kein unschlagbarer
         * Klotz — derselbe Schalter wie bei der Verstärkung (siehe
         * `SCHACH.koenigSchlagbarFuer`). Ohne ihn wäre „Schachmatt" nicht mehr
         * eindeutig.
         */
        if (bringtKoenig) {
            stand.koenigeAlsLeben = true;
        }

        return {
            stand: stand,
            felder: angebot.gibtFelder.concat(angebot.bekommtFelder)
                .filter((feld, stelle2, alle) => alle.indexOf(feld) === stelle2),
            text: angebot.text
        };
    },

    /* Wohin die eingetauschten Figuren kommen: erst die frei werdenden Felder,
       dann freie Felder der eigenen Grundreihe. */
    _handelsPlaetze(runde, farbe, gibtFelder, anzahl) {
        const stand = runde.stand;
        const breite = SCHACH.breiteVon(stand);
        const hoehe = SCHACH.hoeheVon(stand);
        const plaetze = gibtFelder.slice(0, anzahl);

        if (plaetze.length >= anzahl) {
            return plaetze;
        }

        const grundreihe = (farbe === "weiss") ? hoehe - 1 : 0;

        for (let spalte = 0; spalte < breite && plaetze.length < anzahl; spalte++) {
            const feld = SCHACH._feld(stand, grundreihe, spalte);

            if (SCHACH.figurAuf(stand, feld) === "."
                && !SCHACH.mauerAuf(stand, feld)
                && plaetze.indexOf(feld) === -1) {
                plaetze.push(feld);
            }
        }

        return plaetze;
    },

    _verlaufKuerzen(runde) {
        while (runde.verlauf.length > SCHACH_RUNDE.VERLAUF_LAENGE) {
            runde.verlauf.shift();
        }
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

    bereitSetzen(runde, farbe, bereit, zeitpunkt) {
        const neu = SCHACH_RUNDE.kopieren(runde);

        if (farbe !== "weiss" && farbe !== "schwarz") {
            return neu;
        }
        neu.bereit[farbe] = (bereit === true);

        /* Sobald beide Seiten bereit sind und in jedem Team jemand steht,
           beginnt die Partie von selbst. */
        if (SCHACH_RUNDE.kannStarten(neu)) {
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

    kannStarten(runde) {
        const stand = SCHACH_RUNDE.normalisieren(runde);
        return stand.teams.weiss.length > 0
            && stand.teams.schwarz.length > 0
            && stand.bereit.weiss
            && stand.bereit.schwarz;
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
     * Partie mit Einigkeit angelegt hat, will genau das nicht — dann wird ein
     * Zug erst vorgeschlagen und ausgeführt, sobald ALLE aus dem Team am Zug
     * zugestimmt haben. Der Vorschlagende stimmt automatisch mit zu.
     *
     * Der Vorschlag steht im gemeinsamen Stand: Anders als ein Vorzug ist er
     * kein Geheimnis — das eigene Team muss ihn ja sehen, und dass der Gegner
     * mitliest, ist der Preis dieser Einstellung. Sie steht deshalb in der
     * Auswahl mit diesem Hinweis.
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
     * Schlägt einen Zug vor. Ist man allein im Team, wird er sofort ausgeführt —
     * Einigkeit mit sich selbst ist keine Abstimmung wert.
     * Liefert die neue Runde oder null.
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

        /* Der Zug muss regelkonform sein — sonst stimmt das Team über etwas ab,
           das gar nicht geht. */
        if (!SCHACH.ziehen(alt.stand, von, nach, umwandlung)) {
            return null;
        }

        const wann = (zeitpunkt === undefined) ? Date.now() : zeitpunkt;
        const neu = SCHACH_RUNDE.kopieren(alt);

        neu.vorschlag = {
            art: "zug",
            faehigkeit: "",
            zielFeld: -1,
            von: von,
            nach: nach,
            umwandlung: umwandlung || "D",
            wer: spielerId,
            name: wer || "",
            zugZaehler: alt.zugZaehler,
            frist: wann + SCHACH_RUNDE.fristFuer(alt, farbe),
            stimmen: [spielerId]
        };

        neu.geaendertAm = wann;
        return neu;
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

        neu.vorschlag = {
            art: "faehigkeit",
            faehigkeit: art,
            zielFeld: Number.isInteger(zielFeld) ? zielFeld : -1,
            von: -1,
            nach: -1,

            /* Auch die Wahl beim Bauernschub gehört in den Vorschlag: Das Team
               stimmt über die fertige Handlung ab, nicht über die halbe. */
            umwandlung: (SCHACH.UMWANDLUNGEN.indexOf(umwandlung) !== -1)
                ? umwandlung : "D",

            /*
             * Und die zweite Zusatzwahl (seit v0.80): heute nur die Lage der
             * Mauer („senkrecht"), sonst leer. Sie gehoert aus demselben Grund
             * in den Vorschlag wie die Umwandlung — sonst stimmt das Team ueber
             * eine waagerechte Mauer ab und bekommt eine senkrechte.
             */
            wahl: (typeof wahl === "string") ? wahl : "",

            wer: spielerId,
            name: wer || "",
            zugZaehler: alt.zugZaehler,
            frist: wann + SCHACH_RUNDE.fristFuer(alt, farbe),
            stimmen: [spielerId]
        };

        neu.geaendertAm = wann;
        return neu;
    },

    /*
     * Stimmt dem offenen Vorschlag zu. Sobald ALLE aus dem Team am Zug
     * zugestimmt haben, wird gezogen.
     */
    zugMittragen(runde, spielerId, zeitpunkt) {
        const alt = SCHACH_RUNDE.normalisieren(runde);

        if (!alt.vorschlag || !SCHACH_RUNDE.darfZiehen(alt, spielerId)) {
            return null;
        }
        /* Ein Vorschlag von vor dem letzten Zug ist überholt. */
        if (alt.vorschlag.zugZaehler !== alt.zugZaehler) {
            return null;
        }

        const farbe = SCHACH_RUNDE.teamVon(alt, spielerId);
        const neu = SCHACH_RUNDE.kopieren(alt);

        if (neu.vorschlag.stimmen.indexOf(spielerId) === -1) {
            neu.vorschlag.stimmen.push(spielerId);
        }

        /* Wer mitstimmt, ist wieder dabei: Sein Säumnis-Zähler beginnt von
           vorn, und damit auch die volle Frist. */
        delete neu.versaeumt[spielerId];

        const fehlen = neu.teams[farbe]
            .filter((id) => neu.vorschlag.stimmen.indexOf(id) === -1);

        if (fehlen.length > 0) {
            neu.geaendertAm = (zeitpunkt === undefined) ? Date.now() : zeitpunkt;
            return neu;
        }

        return SCHACH_RUNDE._vorschlagAusfuehren(neu, zeitpunkt);
    },

    /*
     * Die Frist ist abgelaufen: Der Vorschlag geht durch, auch ohne alle
     * Stimmen. Wer nicht abgestimmt hat, bekommt einen Strich — beim nächsten
     * Mal ist die Frist dadurch kürzer.
     *
     * Ausgelöst wird das vom ERSTEN Gerät, das den Ablauf bemerkt; die Prüfung
     * über den Zugzähler beim Schreiben sorgt dafür, dass es trotzdem nur
     * einmal passiert.
     */
    fristAbgelaufen(runde, jetzt) {
        const alt = SCHACH_RUNDE.normalisieren(runde);

        if (!alt.vorschlag || alt.vorschlag.zugZaehler !== alt.zugZaehler) {
            return null;
        }
        if (!alt.vorschlag.frist || jetzt < alt.vorschlag.frist) {
            return null;
        }

        const farbe = alt.stand.amZug;
        const neu = SCHACH_RUNDE.kopieren(alt);

        for (const id of neu.teams[farbe]) {
            if (neu.vorschlag.stimmen.indexOf(id) === -1) {
                neu.versaeumt[id] = (neu.versaeumt[id] || 0) + 1;
            }
        }

        return SCHACH_RUNDE._vorschlagAusfuehren(neu, jetzt);
    },

    /* Führt den offenen Vorschlag aus — Zug oder Fähigkeit. */
    _vorschlagAusfuehren(runde, zeitpunkt) {
        const vorschlag = runde.vorschlag;
        runde.vorschlag = null;

        const ergebnis = (vorschlag.art === "faehigkeit")
            ? SCHACH_RUNDE.faehigkeitEinsetzen(runde, vorschlag.wer, vorschlag.faehigkeit,
                vorschlag.zielFeld, vorschlag.name, zeitpunkt, vorschlag.umwandlung,
                vorschlag.wahl)
            : SCHACH_RUNDE.ziehen(runde, vorschlag.wer, vorschlag.von, vorschlag.nach,
                vorschlag.umwandlung, vorschlag.name, zeitpunkt);

        if (!ergebnis) {
            /* Inzwischen nicht mehr möglich — der Vorschlag fällt weg. */
            runde.geaendertAm = (zeitpunkt === undefined) ? Date.now() : zeitpunkt;
            return runde;
        }

        /* Die Säumnis-Zähler aus der Abstimmung müssen mitgenommen werden:
           `ziehen` und `faehigkeitEinsetzen` arbeiten auf einer Kopie. */
        ergebnis.versaeumt = runde.versaeumt;
        return ergebnis;
    },

    /* Verwirft den offenen Vorschlag. */
    vorschlagVerwerfen(runde, spielerId, zeitpunkt) {
        const alt = SCHACH_RUNDE.normalisieren(runde);

        if (!alt.vorschlag || !SCHACH_RUNDE.darfZiehen(alt, spielerId)) {
            return null;
        }

        const neu = SCHACH_RUNDE.kopieren(alt);
        neu.vorschlag = null;
        neu.geaendertAm = (zeitpunkt === undefined) ? Date.now() : zeitpunkt;
        return neu;
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

    /* Der offene Vorschlag als Zeichenkette — ändert er sich, wird neu gezeichnet. */
    _vorschlagText(runde) {
        if (!runde.vorschlag) {
            return "";
        }
        return runde.vorschlag.von + ">" + runde.vorschlag.nach
            + "@" + runde.vorschlag.zugZaehler
            + ":" + runde.vorschlag.stimmen.slice().sort().join(",");
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
