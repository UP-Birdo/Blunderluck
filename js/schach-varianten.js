/*
 * schach-varianten.js — die Spielarten des Team-Schachs.
 *
 * Eine reine Datentabelle, keine Logik: Jede Variante beschreibt nur, WIE das
 * Brett aussieht und welche Sonderregeln gelten. Wer eine neue Spielart
 * hinzufügen will, ergänzt hier einen Eintrag und muss sonst nichts anfassen —
 * schach.js liest die Maße und Schalter, schach-runde.js den Rest.
 *
 * Warum die Tabelle VOR schach.js steht: Die Regeln brauchen die Maße des
 * Bretts, sobald ein Stand entsteht. Die Abhängigkeit geht also nur in eine
 * Richtung (schach.js liest hier, hier wird nichts über Regeln gewusst).
 *
 * Felder einer Variante:
 *
 *     id             Kennung im gespeicherten Stand — NIE ändern, sonst
 *                    verlieren laufende Partien ihre Spielart.
 *     titel          Beschriftung auf dem Bildschirm.
 *     beschreibung   Ein Satz für die Auswahl beim Anlegen einer Partie.
 *     breite, hoehe  Anzahl der Spalten und Reihen.
 *     aufstellung    Startbrett, Zeile für Zeile von oben (Reihe der schwarzen
 *                    Figuren) nach unten. Länge = breite * hoehe.
 *     rochade        Ist die Rochade erlaubt? Seit v2.1 in JEDER Spielart, weil
 *                    sie aus der Stellung gelesen wird (König auf seinem
 *                    Startfeld, Turm mit Recht auf derselben Grundreihe) statt
 *                    an festen Plätzen zu hängen.
 *     koenigSchlagbar  true = es gibt kein Schach und kein Matt; Könige werden
 *                    geschlagen wie jede andere Figur, und wer keinen König
 *                    mehr hat, verliert. Nötig für Bretter mit mehreren
 *                    Königen je Seite (Doppelbrett).
 *     koenigeAlsLeben  true = zwei Könige sind zwei Leben (seit v0.49). Solange
 *                    eine Seite mehr als einen König hat, ist ihr König eine
 *                    Figur wie jede andere; beim LETZTEN gelten wieder Schach
 *                    und Matt. Der Unterschied zu `koenigSchlagbar`: Der hängt
 *                    am BRETT und gilt immer, dieser hier an der STELLUNG und
 *                    je Farbe getrennt. Beantwortet wird beides an einer Stelle,
 *                    `SCHACH.koenigSchlagbarFuer`.
 *     zufallsArmee   true = die Aufstellung wird je Partie GERECHNET, nicht aus
 *                    `aufstellung` gelesen (seit v0.49, siehe
 *                    `SCHACH_RUNDE._armeeStand`). Das Feld `aufstellung` bleibt
 *                    trotzdem gefüllt: Es ist das BEISPIEL für die Kachel in der
 *                    Auswahl und der Rückfall, falls ein Stand ohne Brett kommt.
 *     bonusFelder    Fähigkeiten, die auf dem Brett liegen:
 *                    [ { feld: <Nummer>, art: "sprung" } ]. Leer = keine.
 */

const SCHACH_VARIANTEN = {

    /* Kennung der Spielart, die gilt, wenn nichts anderes gespeichert ist.
       Alle Partien aus der Zeit vor den Spielarten sind klassisch. */
    STANDARD: "standard",

    /*
     * Die Seltenheitsstufen. Die Summe der Chancen ergibt 100.
     *
     * Innerhalb einer Stufe sind alle Fähigkeiten zunächst gleich
     * wahrscheinlich — die Chance einer einzelnen ist also
     * `chance / Anzahl in der Stufe`.
     *
     * WIEDERHOLUNG (seit v3.6): Was man schon im Vorrat hat, kommt seltener
     * nach. Jedes Exemplar drückt das Gewicht dieser Fähigkeit auf den hier
     * genannten Bruchteil — bei zwei Stück also auf `wiederholung` mal
     * `wiederholung`. Die Zahl steigt mit der Seltenheit, und zwar aus einem
     * praktischen Grund: In der gewöhnlichen Stufe stehen drei Fähigkeiten
     * zur Auswahl, da lässt sich eine leicht meiden. Bei den legendären wäre
     * eine harte Dämpfung dasselbe wie „du bekommst die restlichen vier
     * garantiert zuerst" — und damit wäre der Zufall weg.
     */
    STUFEN: [
        { id: "gruen", titel: "Gewöhnlich", chance: 52, farbe: "#2e9e52",
            wiederholung: 0.15, abklingen: { halbzuege: 8, gewicht: 0.2 } },
        { id: "blau", titel: "Ungewöhnlich", chance: 33, farbe: "#2f7fd0",
            wiederholung: 0.3 },
        { id: "lila", titel: "Episch", chance: 12, farbe: "#8b46c8",
            wiederholung: 0.5 },
        { id: "gelb", titel: "Legendär", chance: 3, farbe: "#e0a800",
            wiederholung: 0.75 }
    ],

    /*
     * ABKLINGZEIT — die ZWEITE Rechnung, und sie betrifft die STUFE (v0.41).
     *
     * Nicht zu verwechseln mit `wiederholung` oben: Die dämpft, WELCHE
     * Fähigkeit man aus einer Stufe zieht, und zwar gegen den eigenen Vorrat.
     * Das ändert nichts daran, wie oft eine Stufe überhaupt an der Reihe ist —
     * und genau das war die Meldung aus der Praxis: „es kommen fast nur grüne".
     * Mit 52 Prozent war das kein Fehler, sondern die eingestellte Zahl.
     *
     * Deshalb hat eine Stufe seit v0.41 wahlweise ein `abklingen`:
     *
     *     halbzuege   So lange braucht sie, um wieder voll zu zählen.
     *     gewicht     So wenig zählt sie unmittelbar danach.
     *
     * Dazwischen steigt das Gewicht gleichmässig an. Nur Grün hat eine
     * Abklingzeit — die anderen Stufen behalten ihre feste Chance, damit Blau
     * und Lila nicht ihrerseits seltener werden. Was Grün verliert, fällt nicht
     * weg, sondern verteilt sich auf die übrigen Stufen: Es erscheint weiter
     * gleich oft ein Würfel, nur eben nicht schon wieder ein grüner.
     */
    stufenGewichte(abstaende) {
        const gewichte = {};

        for (const stufe of SCHACH_VARIANTEN.STUFEN) {
            const abstand = (abstaende && Number.isInteger(abstaende[stufe.id]))
                ? abstaende[stufe.id] : -1;

            if (!stufe.abklingen || abstand < 0 || abstand >= stufe.abklingen.halbzuege) {
                gewichte[stufe.id] = 1;
                continue;
            }

            const anteil = abstand / stufe.abklingen.halbzuege;
            gewichte[stufe.id] = stufe.abklingen.gewicht
                + (1 - stufe.abklingen.gewicht) * anteil;
        }

        return gewichte;
    },

    /*
     * Unglückswürfel: Wie oft ein erscheinender Würfel ein schlechter ist.
     * Deutlich seltener als ein normaler — sonst wäre jeder Würfel eine
     * Zitterpartie statt einer Belohnung.
     *
     * Das ist seit v0.77 der GRUNDWERT auf vollem Brett; wie er mit dem
     * Füllstand steigt, steht bei `pechChance`.
     */
    PECH_CHANCE: 12,

    /*
     * Der Höchstwert, auf den der Unglücks-Anteil steigen kann: bei einem
     * leergefegten Brett gut jede dritte Box. Er wird nur auf den drei
     * Füllstands-Stufen erreicht und auch dort erst ganz zum Schluss.
     *
     * Warum 40 und nicht mehr: Ab der Hälfte kippt der Charakter der Lootbox
     * von „Belohnung mit Risiko" zu „Falle mit Chance". Der Wunsch war „mehr
     * als derzeit", nicht „umgedreht".
     */
    PECH_CHANCE_HOCH: 40,

    /*
     * WIE OFT EINE ERSCHEINENDE BOX EIN UNGLÜCK IST (seit v0.77).
     *
     * Bis v0.76 war das eine feste Zahl — 12 Prozent, immer und überall. Der
     * Nutzer wollte beim Lootbox-Regen mehr Unglück und hat auf die Rückfrage
     * geantwortet: „so wie bei den normalen Lootboxen, anhand der freien
     * Felder." Also dieselbe Mechanik wie bei der MENGE seit v0.71 — je leerer
     * das Brett, desto mehr, und je höher die Mengenstufe, desto früher.
     *
     * Gerechnet wird mit derselben Kurventabelle (`REGEN.STUFEN`,
     * `chanceKurve`), die auch `regenChance` benutzt. Zwei Punkte gelten dabei
     * genau wie bei `mengenChance`:
     *
     *   - Die Stufe „wenig" (`stufe: 0`) hängt grundsätzlich nicht am
     *     Füllstand. Sie behält die 12 Prozent. Eine Ausnahme nur fürs Unglück
     *     wäre der Knick, den die Leiter der Mengen ausdrücklich vermeidet.
     *   - Der Grundwert wird nie unterschritten (`Math.max`). Auf vollem Brett
     *     steht die Kurve fast bei null; ohne diese Klammer käme bei „Regen"
     *     früh in der Partie WENIGER Unglück als bei „wenig".
     *
     * Was in einem Unglückswürfel steckt, ändert sich dadurch nicht: Die
     * Verteilung über die Stufen bleibt bei `pechZiehen` (52 / 33 / 12 / 3),
     * grün also weiterhin klar am häufigsten.
     */
    pechChance(id, freieFelder, alleFelder) {
        const menge = SCHACH_VARIANTEN.mengeVon(id);

        if (!menge.stufe) {
            return SCHACH_VARIANTEN.PECH_CHANCE;
        }

        const anteil = SCHACH_VARIANTEN.regenAnteil(freieFelder, alleFelder);
        const spanne = SCHACH_VARIANTEN.PECH_CHANCE_HOCH - SCHACH_VARIANTEN.PECH_CHANCE;
        const kurve = SCHACH_VARIANTEN.regenKurve(menge.stufe).chanceKurve;

        return Math.max(SCHACH_VARIANTEN.PECH_CHANCE,
            SCHACH_VARIANTEN.PECH_CHANCE + spanne * Math.pow(anteil, kurve));
    },

    /*
     * Die Unglückswürfel, je Stufe einer. Sie kommen NICHT in den Vorrat,
     * sondern wirken sofort beim Einsammeln — und zwar gegen den, der sie
     * eingesammelt hat. Je höher die Stufe, desto schlimmer.
     */
    PECH: {
        stolperstein: {
            titel: "Stolperstein",
            stufe: "gruen",
            beschreibung: "Die Figur, die die Lootbox eingesammelt hat, wird ein Feld "
                + "zurückgeworfen — Richtung eigener Grundreihe."
        },
        /*
         * AUSDEHNUNG UND EINSTURZ SIND SEIT v0.84 AUS DEM SPIEL GENOMMEN
         * (Nutzer-Ansage 19.08.: „das führt zu riesigen Bugs, das müssen wir
         * erst überarbeiten").
         *
         * Sie bleiben mit `versteckt: true` stehen statt gelöscht zu werden —
         * genau wie eine versteckte Fähigkeit: So behalten laufende Partien
         * ihren Verlauf lesbar („Ausdehnung" im Zugverlauf löst weiter auf),
         * die Bildanleitungen bleiben gültig, und die Überarbeitung braucht
         * später nur diesen einen Schalter zurückzunehmen.
         *
         * Beide sind die EINZIGEN Unglücke der Stufe „blau" — die Stufe ist
         * damit leer. Das ist erlaubt und bekommt Gewicht 0 (`pechZiehen`
         * normiert von selbst), genau nach der Nutzer-Entscheidung vom 18.08.
         * zur leeren Seltenheitsstufe.
         */
        ausdehnung: {
            titel: "Ausdehnung",
            stufe: "blau",
            versteckt: true,
            beschreibung: "Das Spielfeld wächst um eine Reihe oder Spalte — jede der vier "
                + "Seiten mit derselben Chance. Alle Wege werden länger."
        },

        /*
         * Das Gegenstück zur Ausdehnung (seit v0.54). Eine Seite mit König
         * fällt nie weg — sonst nähme der Würfel einen König vom Brett und
         * beendete die Partie, ohne dass jemand etwas dafür konnte.
         */
        schrumpfung: {
            titel: "Einsturz",
            stufe: "blau",
            versteckt: true,
            beschreibung: "Eine ganze Reihe oder Spalte bricht weg — zufällig eine der "
                + "vier Seiten, aber nie eine, auf der ein König steht. Was dort "
                + "steht, stürzt mit."
        },

        /*
         * Das Erdbeben — seit v0.54 hier statt bei den Fähigkeiten, und mit
         * neuer Wirkung. Vorher schob es drei Reihen zur Seite; jetzt bricht
         * der Boden auf.
         */
        /*
         * „SPALT" HEISST SIE SEIT v0.103 (Nutzer-Ansage 20.08.: „Erdbeben soll
         * es doch nicht mehr heissen, sondern Spalt oder Riss oder so").
         *
         * ZWEI UMBENENNUNGEN, EIN GRUND. In v0.92 hiess sie schon einmal um:
         * von „Erdbeben" auf „Riss". Damit trugen aber ZWEI Dinge denselben
         * Namen — die Lootbox und das gesperrte Feld, das sie hinterlässt
         * (`SCHACH.risse`, seit v0.54). „Der Riss reisst Risse" ist keine
         * Erklärung, sondern ein Rätsel.
         *
         * Jetzt sind es zwei Wörter für zwei Dinge: **Der Spalt** ist die
         * Lootbox, **die Risse** sind die Löcher, die sie hinterlässt. Genau
         * so steht es auch in der Beschreibung.
         *
         * DIE KENNUNG BLEIBT `erdbeben` — sie steckt in jeder laufenden Partie
         * und in den Firebase-Daten; ein Umbenennen wäre ein Bruch des
         * additiven Datenvertrags ohne jeden Gewinn (dieselbe Regel wie bei
         * „Lootbox" und bei der Halluzination).
         */
        erdbeben: {
            titel: "Spalt",
            stufe: "lila",
            beschreibung: "Drei freie Felder brechen weg und bleiben die ganze Partie "
                + "gesperrt — nur Springer setzen darüber. Sie reissen SOFORT "
                + "auf: Wer die Lootbox im Vorbeiziehen mitnimmt und dann vor "
                + "einem Loch steht, bleibt davor stehen."
        },
        /*
         * „HALLUZINATION" HEISST SIE SEIT v0.73 (Meldung I11) — die KENNUNG
         * bleibt `vollesGlas`. Sie steckt in jeder laufenden Partie und in den
         * Firebase-Daten; ein Umbenennen wäre ein Bruch des additiven
         * Datenvertrags ohne jeden Gewinn (dieselbe Regel wie bei „Lootbox").
         */
        vollesGlas: {
            titel: "Halluzination",
            stufe: "gruen",
            /* Die Zahl muss zu `SCHACH_RUNDE.GLAS_HALBZUEGE` passen (seit
               v0.79 vier statt acht) — ein Test hält beide zusammen. */
            beschreibung: "Wer sie einsammelt, sieht die gegnerischen Figuren 4 Halbzüge "
                + "lang falsch: Sie ziehen wie immer, sehen aber aus wie etwas "
                + "anderes. Der Gegner merkt nichts."
        },
        /*
         * MEUTEREI UND ERDRUTSCH HABEN v0.41 IHRE STUFEN GETAUSCHT.
         *
         * Vorher war die Meuterei episch (lila) und der Erdrutsch legendär
         * (gelb) — dabei ist die Meuterei die schwerere Strafe: Der Gegner
         * bekommt eine Figur GESCHENKT, der Materialunterschied ist doppelt so
         * gross wie der Verlust. Ein Erdrutsch kostet nur Stellung, keine
         * Figur. Die Stufe sagt beim Unglückswürfel, wie schlimm es wird; die
         * schlimmste gehört auf die seltenste Stufe.
         */
        meuterei: {
            titel: "Meuterei",
            stufe: "gelb",
            beschreibung: "Eine eigene Figur läuft zum Gegner über und kämpft ab sofort "
                + "für die andere Seite. Könige meutern nicht."
        },
        erdrutsch: {
            titel: "Erdrutsch",
            stufe: "lila",
            beschreibung: "Alle eigenen Figuren rutschen ein Feld zurück Richtung eigener "
                + "Grundreihe, soweit dort Platz ist. Der Angriff fällt in sich "
                + "zusammen."
        }
    },

    /* Titel und Stufe eines Unglückswürfels. */
    pechTitel(art) {
        const eintrag = SCHACH_VARIANTEN.PECH[art];
        return eintrag ? eintrag.titel : "";
    },

    pechBeschreibung(art) {
        const eintrag = SCHACH_VARIANTEN.PECH[art];
        return eintrag ? eintrag.beschreibung : "";
    },

    pechStufeVon(art) {
        const eintrag = SCHACH_VARIANTEN.PECH[art];
        if (!eintrag) {
            return SCHACH_VARIANTEN.STUFE_UNBEKANNT;
        }
        return SCHACH_VARIANTEN.STUFEN.find((stufe) => stufe.id === eintrag.stufe)
            || SCHACH_VARIANTEN.STUFEN[0];
    },

    /*
     * Alle Unglückswürfel einer Stufe, in fester Reihenfolge — VERSTECKTE
     * ausgenommen (seit v0.84, wie bei `faehigkeitenDerStufe`). Das ist die
     * EINE Stelle, die filtert: Damit fällt ein verstecktes Unglück zugleich
     * aus der Ziehung und aus der Bibliothek.
     */
    pechDerStufe(stufeId) {
        return Object.keys(SCHACH_VARIANTEN.PECH)
            .filter((art) => SCHACH_VARIANTEN.PECH[art].stufe === stufeId
                && !SCHACH_VARIANTEN.PECH[art].versteckt)
            .sort();
    },

    /*
     * Zieht einen Unglückswürfel — dieselbe Rechnung wie bei den Fähigkeiten:
     * erst die Stufe nach ihrer Chance, dann innerhalb der Stufe gleichverteilt.
     *
     * EINE LEERE STUFE BEKOMMT GEWICHT 0 (seit v0.84, Nutzer-Entscheidung vom
     * 18.08. zur leeren Seltenheitsstufe). Seit „Ausdehnung" und „Einsturz"
     * versteckt sind, ist Blau leer — vorher gab dieselbe Lage eine leere
     * Kennung zurück, und der Würfel wäre wirkungslos liegen geblieben. Jetzt
     * verteilt sich ihre Chance auf die übrigen Stufen, genau wie beim
     * Neuwürfeln, aber in einem Schritt.
     */
    pechZiehen(wert) {
        const chancen = SCHACH_VARIANTEN.STUFEN.map((stufe) =>
            (SCHACH_VARIANTEN.pechDerStufe(stufe.id).length > 0 ? stufe.chance : 0));

        const summe = chancen.reduce((teil, einzeln) => teil + einzeln, 0);
        if (summe <= 0) {
            return "";
        }

        let rest = Math.min(Math.max(wert, 0), 0.999999) * summe;

        for (let stelle = 0; stelle < SCHACH_VARIANTEN.STUFEN.length; stelle++) {
            if (rest < chancen[stelle]) {
                const arten = SCHACH_VARIANTEN.pechDerStufe(
                    SCHACH_VARIANTEN.STUFEN[stelle].id);
                const anteil = rest / chancen[stelle];
                return arten[Math.min(Math.floor(anteil * arten.length), arten.length - 1)];
            }
            rest -= chancen[stelle];
        }

        return "stolperstein";
    },

    /*
     * Mit welcher Chance (in Prozent) nach JEDEM Halbzug ein neuer Würfel
     * erscheint.
     *
     * Bis v2.7 kam alle sechs Halbzüge einer — feste Takte, die man mitzählen
     * konnte. Jetzt wird jede Runde neu gewürfelt (im Schnitt weiterhin einer
     * je sechs Halbzüge).
     *
     * SEIT v3.3 GIBT ES KEINE HÖCHSTZAHL MEHR.
     * Vorher durften nur drei gleichzeitig liegen; wer nicht einsammelte, bekam
     * ab dem dritten gar nichts mehr — die Partie hörte mitten im Spiel auf,
     * Würfel auszuwerfen, und das wirkte wie ein Fehler. Jetzt erscheint
     * durchgehend nach Chance einer, solange überhaupt ein Feld frei ist.
     *
     * Die einzige verbliebene Grenze ist das Brett selbst: Ein Würfel braucht
     * ein leeres Feld, und auf ein Feld passt nur einer. Sie steht nicht als
     * Zahl im Code, sondern ergibt sich aus der Stellung — deshalb kann sie
     * auch nicht veralten, wenn ein Unglückswürfel das Feld vergrössert.
     */
    BONUS_CHANCE: 18,

    /*
     * Wie viele Würfel auf einmal erscheinen. Meist einer; zwei sind selten,
     * drei sehr selten. Dieselbe Rechnung wie bei den Stufen: Der Zufallswert
     * wandert von oben durch die Liste.
     */
    BONUS_ANZAHL: [
        { anzahl: 1, chance: 80 },
        { anzahl: 2, chance: 17 },
        { anzahl: 3, chance: 3 }
    ],

    /* ---------------------------------------------------------------- *
     * Glücksboxen-Regen (seit v0.50)
     *
     * Ein Haken beim Anlegen: Je mehr Felder frei sind, desto mehr Würfel
     * erscheinen. Gedacht für den späten Teil einer Partie, wenn das Brett
     * leergefegt ist und sonst kaum noch etwas passiert.
     *
     * Beide Zahlen hängen am ANTEIL der freien Felder, nicht an ihrer Anzahl —
     * sonst regnete es auf dem Doppelbrett (128 Felder) von Beginn an, und auf
     * dem kleinen Brett (36) nie.
     * ---------------------------------------------------------------- */

    REGEN: {
        /*
         * DER REGEN WÄCHST EXPONENTIELL (seit v0.53).
         *
         * Bis v0.52 stieg er gerade mit dem Anteil freier Felder — zu Beginn
         * also spürbar, gegen Ende kaum stärker. Gewünscht war das Gegenteil:
         * lange wenig, und je leerer das Brett, desto heftiger, bis es im
         * Grenzfall auf JEDEM freien Feld einen Würfel gibt.
         *
         * Beide Zahlen sind Exponenten auf den Füllstand. Höher heisst: später,
         * dafür steiler.
         */
        kurve: 3,
        chanceKurve: 2,

        /*
         * WOGEGEN DER FÜLLSTAND GEMESSEN WIRD.
         *
         * Nicht gegen alle Felder, sondern gegen die, die überhaupt frei werden
         * KÖNNEN — zwei Könige bleiben immer stehen. Nur so erreicht der Anteil
         * wirklich 1, und nur dann greift die Zusage: „Wenn nur noch die beiden
         * Könige da sind, bekommt jedes freie Feld einen Würfel."
         */
        bleibenStehen: 2,

        /* ------------------------------------------------------------ *
         * FÜNF STUFEN STATT EINER KURVE (seit v0.59, Wunsch #11)
         *
         * Der Nutzer stellt beim Anlegen ein, WIE SPÄT der Regen einsetzt:
         *
         *   Stufe 5   der Verlauf von v0.53 — unverändert die Vorgabe
         *   Stufe 1   viel steiler: lange fast nichts, dann schlagartig
         *
         * DAS ENDE IST BEI JEDER STUFE DASSELBE. Beide Zahlen sind Exponenten
         * auf einen Anteil zwischen 0 und 1, und `Math.pow(1, n)` ist immer 1
         * — stehen nur noch die beiden Könige, bekommt also weiterhin jedes
         * freie Feld einen Würfel, egal welche Stufe. Nur der Weg dorthin ist
         * unterschiedlich steil. Genau so war es gewünscht: „das Ende soll
         * gleich sein, nur davor die Kurve viel steiler."
         *
         * Warum eine Tabelle und keine Rechnung aus der Stufennummer: Man
         * sieht so auf einen Blick, was jede Stellung bedeutet, und kann eine
         * einzelne nachjustieren, ohne die anderen zu verschieben.
         * ------------------------------------------------------------ */
        /*
         * DIE OBERSTE STUFE IST SEIT v0.82 ETWAS FLACHER (Nutzer-Ansage
         * 18.08.: „Regen ein kleines wenig schwächer, also nur ein wenig
         * weniger — aber schon so, dass sich bei 2 Figuren jeden Halbzug alles
         * füllt").
         *
         * Genau dafür ist `kurve` da, und beides zusammen geht nur so: Der
         * Exponent steuert, WIE FRÜH es losgeht; das ENDE ist bei jedem
         * Exponenten dasselbe, weil `Math.pow(1, n)` immer 1 ist. Stehen nur
         * noch die beiden Könige, bekommt also weiterhin JEDES freie Feld eine
         * Lootbox — davor kommt spürbar weniger.
         *
         * Von 3 auf 4 gemessen (Brett mit 64 Feldern, je Halbzug):
         *
         *     freie Felder    vorher     jetzt
         *          24          2 Stk     1 Stk
         *          32          5 Stk     3 Stk
         *          40         11 Stk     7 Stk
         *          48         23 Stk    18 Stk
         *          56         42 Stk    38 Stk
         *          62         62 Stk    62 Stk   (unverändert: alles)
         *
         * `chanceKurve` bleibt bei 2 — sie sagt, wie oft es überhaupt regnet,
         * und danach war nicht gefragt.
         */
        STUFEN: {
            1: { kurve: 9, chanceKurve: 6 },
            2: { kurve: 7, chanceKurve: 5 },
            3: { kurve: 5, chanceKurve: 4 },
            4: { kurve: 4, chanceKurve: 3 },
            5: { kurve: 4, chanceKurve: 2 }
        },

        /* Die Vorgabe, wenn eine Partie keine Stufe nennt (alle Partien vor
           v0.59) — dieselbe Kurve wie seit v0.53. */
        STUFE_VORGABE: 5
    },

    /*
     * Die Exponenten zu einer Stufe. Unbekanntes fällt auf die Vorgabe zurück:
     * Eine Partie aus der Zeit vor v0.59 spielt damit genau weiter wie bisher.
     */
    regenKurve(stufe) {
        return SCHACH_VARIANTEN.REGEN.STUFEN[stufe]
            || SCHACH_VARIANTEN.REGEN.STUFEN[SCHACH_VARIANTEN.REGEN.STUFE_VORGABE];
    },

    /*
     * Wie voll das Brett ist, als Zahl von 0 (voll) bis 1 (nur noch die beiden
     * Könige). Grundlage für Chance UND Anzahl des Regens.
     */
    regenAnteil(freieFelder, alleFelder) {
        const moeglich = Math.max(1, alleFelder - SCHACH_VARIANTEN.REGEN.bleibenStehen);
        return Math.min(1, Math.max(0, freieFelder / moeglich));
    },

    /* Wie viele Würfel der Regen auswirft. Bei ganz leerem Brett: alle.
       `stufe` ist wahlfrei — ohne Angabe gilt die Vorgabe (siehe regenKurve). */
    regenAnzahl(freieFelder, alleFelder, stufe) {
        const anteil = SCHACH_VARIANTEN.regenAnteil(freieFelder, alleFelder);
        const gewuenscht = freieFelder
            * Math.pow(anteil, SCHACH_VARIANTEN.regenKurve(stufe).kurve);

        return Math.max(1, Math.min(freieFelder, Math.ceil(gewuenscht)));
    },

    /* Mit welcher Chance (Prozent) der Regen bei diesem Füllstand einsetzt. */
    regenChance(freieFelder, alleFelder, stufe) {
        const anteil = SCHACH_VARIANTEN.regenAnteil(freieFelder, alleFelder);
        return 100 * Math.pow(anteil, SCHACH_VARIANTEN.regenKurve(stufe).chanceKurve);
    },

    /* ---------------------------------------------------------------- *
     * VIER STUFEN FÜR DIE LOOTBOX-MENGE (seit v0.71)
     *
     * Bis v0.70 waren es ZWEI Einstellungen für dieselbe Frage: der Haken
     * `regen` (seit v0.50) und der Schieberegler `regenStufe` 1 bis 5 (seit
     * v0.60). Wer wissen wollte, wie viel kommt, musste beide zusammendenken
     * — und ohne den Haken tat der Regler gar nichts. Jetzt ist es EINE Frage
     * mit vier Antworten.
     *
     * Eine Stufe unterscheidet sich von der nächsten in genau zwei Dingen:
     *
     *   `jederHalbzug`   „wenig" wirft nur nach einem VOLLEN Zug aus (beide
     *                    Seiten sind gezogen), die drei anderen nach jedem
     *                    Halbzug;
     *   `stufe`          0 heisst „hängt nicht am Füllstand" — das
     *                    gleichmässige Grundrauschen mit `BONUS_CHANCE`.
     *                    Sonst ist es die Kurve aus `REGEN.STUFEN`: je höher
     *                    die Zahl, desto früher und desto mehr.
     *
     * DIE DREI FÜLLSTANDS-STUFEN LIEFERN NIE WENIGER ALS DAS GRUNDRAUSCHEN.
     * Chance und Anzahl werden gegen den Grundwert genommen (`Math.max`) —
     * ohne das käme früh in der Partie bei „normal" WENIGER als bei „wenig",
     * weil die Kurve auf vollem Brett fast bei null steht. Eine Leiter mit
     * einem Knick in der Mitte ist keine Leiter. Nebenbei beantwortet das die
     * offene Frage aus v0.60 („ist die flachste Stufe überhaupt spürbar?").
     * ---------------------------------------------------------------- */

    LOOTBOX_MENGEN: [
        {
            id: "wenig",
            titel: "wenig",
            jederHalbzug: false,
            stufe: 0,
            hinweis: "Nach jedem vollen Zug kann eine Lootbox erscheinen, "
                + "selten mehrere — unabhängig davon, wie voll das Brett ist."
        },
        {
            id: "normal",
            titel: "normal",
            jederHalbzug: true,
            stufe: 1,
            hinweis: "Nach jedem Halbzug, und je leerer das Brett wird, desto mehr."
        },
        {
            id: "viele",
            titel: "viele",
            jederHalbzug: true,
            stufe: 3,
            hinweis: "Dasselbe, nur früher und reichlicher."
        },
        {
            id: "regen",
            titel: "Regen",
            jederHalbzug: true,
            stufe: 5,
            hinweis: "Es regnet: Stehen am Ende nur noch die beiden Könige, "
                + "bekommt jedes freie Feld eine Lootbox."
        }
    ],

    /* Ohne Angabe die unterste Stufe — eine neue Partie ist erst einmal ein
       normales Schachspiel, und was dazukommt, stellt man ausdrücklich ein. */
    MENGE_VORGABE: "wenig",

    /* Der Eintrag zu einer Stufe; Unbekanntes fällt auf die Vorgabe zurück.
       Heisst `mengeVon` und nicht `lootboxMenge`, weil DIE Frage an die Partie
       geht (`SCHACH_RUNDE.lootboxMenge`) — hier wird nur nachgeschlagen. */
    mengeVon(id) {
        return SCHACH_VARIANTEN.LOOTBOX_MENGEN.find((eintrag) => eintrag.id === id)
            || SCHACH_VARIANTEN.LOOTBOX_MENGEN.find(
                (eintrag) => eintrag.id === SCHACH_VARIANTEN.MENGE_VORGABE);
    },

    /*
     * Die Stufe einer Partie aus der Zeit der zwei alten Schalter (vor v0.71).
     * Kein Regen heisst „wenig"; mit Regen entscheidet die alte Reglerstellung,
     * denn genau sie war die Kurve. So spielt jede laufende Partie weiter, wie
     * sie angelegt wurde.
     */
    mengeAusAltem(regen, stufe) {
        if (regen !== true) {
            return "wenig";
        }

        /* Ohne brauchbare Reglerstellung gilt dessen Vorgabe — nicht die
           unterste Stufe: Ein Haken ohne Regler war der Regen von v0.53. */
        const wert = (Number.isInteger(stufe) && stufe >= 1 && stufe <= 5)
            ? stufe
            : SCHACH_VARIANTEN.REGEN.STUFE_VORGABE;

        if (wert >= 5) {
            return "regen";
        }
        return (wert >= 3) ? "viele" : "normal";
    },

    /* Mit welcher Chance (Prozent) auf dieser Stufe überhaupt etwas erscheint. */
    mengenChance(id, freieFelder, alleFelder) {
        const menge = SCHACH_VARIANTEN.mengeVon(id);

        if (!menge.stufe) {
            return SCHACH_VARIANTEN.BONUS_CHANCE;
        }
        return Math.max(SCHACH_VARIANTEN.BONUS_CHANCE,
            SCHACH_VARIANTEN.regenChance(freieFelder, alleFelder, menge.stufe));
    },

    /*
     * Wie viele auf einmal. `wert` ist der gewürfelte Zufallswert (0 bis 1)
     * für das Grundrauschen — er zählt auf jeder Stufe mit, damit auch die
     * Füllstands-Stufen früh in der Partie ihre gelegentlichen zwei und drei
     * behalten.
     */
    mengenAnzahl(id, freieFelder, alleFelder, wert) {
        const menge = SCHACH_VARIANTEN.mengeVon(id);
        const grund = SCHACH_VARIANTEN.anzahlZiehen(wert);

        if (!menge.stufe) {
            return grund;
        }
        return Math.max(grund,
            SCHACH_VARIANTEN.regenAnzahl(freieFelder, alleFelder, menge.stufe));
    },

    /* Wie viele Würfel erscheinen bei diesem Zufallswert? */
    anzahlZiehen(wert) {
        let rest = Math.min(Math.max(wert, 0), 0.999999) * 100;

        for (const eintrag of SCHACH_VARIANTEN.BONUS_ANZAHL) {
            if (rest < eintrag.chance) {
                return eintrag.anzahl;
            }
            rest -= eintrag.chance;
        }

        return 1;
    },

    /*
     * Die Fähigkeiten. Jede hat eine Stufe und eine ART, die sagt, WIE sie
     * wirkt — davon gibt es nur vier, und alle zehn Fähigkeiten kommen damit
     * aus:
     *
     *   "zugmuster"  Der nächste eigene Zug darf zusätzlich nach diesem Muster
     *                gehen. Keine Auswahl nötig; man zieht einfach.
     *   "ablauf"     Greift in die Zugfolge ein (Doppelzug).
     *   "sofort"     Wirkt beim Einsetzen sofort aufs Brett, ohne Auswahl.
     *   "ziel"       Verlangt EIN angetipptes Feld; `zielArt` sagt, welches.
     *
     * Wirkung: siehe schach.js. Wer eine Fähigkeit ergänzt, wählt eine dieser
     * vier Arten — dann muss am Bildschirm nichts angepasst werden.
     *
     * Dazu zwei Schalter, die für jede Art gelten:
     *
     *   `beendetZug: true`   Nach dem Einsetzen ist der Gegner dran. Ohne den
     *                        Schalter bleibt man am Zug und muss noch ziehen —
     *                        so war es bis v3.3 bei allen Fähigkeiten. Für
     *                        solche, die eine Figur ZURÜCKBRINGEN, wäre das zu
     *                        stark: Man bekäme Material geschenkt und dürfte im
     *                        selben Atemzug damit angreifen.
     *
     *   `istDerZug: true`    Die Fähigkeit IST der Zug (seit v0.48). Man bleibt
     *                        am Zug und muss ihn sofort machen — aber nur nach
     *                        dem Muster der Fähigkeit, nichts anderes
     *                        (`stand.zusatzNurDieses`). Kein Pluszeichen: Ein
     *                        normaler Zug bleibt eben NICHT.
     *
     *                        Der Unterschied zu `beendetZug`: Dort zieht erst
     *                        der Gegner, und die Wirkung kommt eine Runde
     *                        später. Sprung und Teleport wirken sofort — so
     *                        hatte der Nutzer sie gemeint, und so sind sie seit
     *                        v0.48 gebaut (v0.47 hatte ihnen `beendetZug`
     *                        gegeben).
     *
     *   `imGegenzug: true`   Darf auch eingesetzt werden, während der Gegner am
     *                        Zug ist (seit v3.6). Das ist ein echtes Rennen:
     *                        Wer zuerst drückt, war zuerst — abgesichert über
     *                        denselben Zugzähler wie ein Zug. Nur für
     *                        Fähigkeiten, die nichts kosten und niemandem
     *                        etwas wegnehmen.
     *
     * BEIDE SCHALTER SIND SICHTBAR. Am Vorrat trägt eine Fähigkeit ohne
     * `beendetZug` ein Pluszeichen (danach bleibt der normale Zug) und eine
     * mit `imGegenzug` einen Blitz. Was eine Fähigkeit kostet, muss man sehen
     * können, bevor man sie einsetzt — nicht danach.
     *
     * ----------------------------------------------------------------------
     * WER MATERIAL ODER EINEN ANGRIFF BEKOMMT, GIBT DEN ZUG AB (seit v0.47).
     *
     * Das ist die Regel, nach der `beendetZug` gesetzt wird — nicht die Stufe.
     * Die Stufe sagt nur, wie SELTEN eine Fähigkeit ist; wie teuer sie ist,
     * sagt dieser Schalter. Drei Gruppen:
     *
     *   1. Material dazu (Wiedergeburt, Wiederbelebung, Spiegel, Verstärkung,
     *      Friedhof, Händler) → `beendetZug`. Sonst bekäme man Figuren
     *      geschenkt und dürfte im selben Atemzug damit angreifen.
     *   2. Eine andere Gangart für genau diesen Zug (Sprung, Teleport) →
     *      `istDerZug`. Sie sind gewöhnlich, kommen also ständig; ein
     *      geschenkter Springerzug obendrauf wäre zu viel. Bezahlt wird er
     *      deshalb mit dem eigenen Zug — nur eben sofort, nicht erst nach dem
     *      Gegner (bis v0.47 hatten sie `beendetZug`).
     *   3. Nur die Stellung verändert (Nudelholz, Mauer, Schutzschild, Fessel,
     *      Frost) oder gar keine Figur berührt (Ausweichen: zieht nur auf
     *      FREIE Felder und schlägt nie) → das Pluszeichen bleibt.
     *
     * DER BAUERNSCHUB STAND BIS v0.55 IN GRUPPE 3 und hat seither trotzdem
     * `beendetZug`. Das ist kein Bruch der Regel, sondern ihr zweiter Teil:
     * Wird eine Fähigkeit zu stark, nimmt man ihr das Pluszeichen. Er
     * verschiebt bis zu acht Figuren, und mit dem Zug obendrauf waren das zwei
     * Züge für eine Fähigkeit. Die Begründung steht bei ihm selbst.
     *
     * Der Doppelzug ist die eine Ausnahme: Sein Pluszeichen IST seine Wirkung,
     * nicht sein Preis.
     *
     * Wird eine Fähigkeit zu stark, wird ihr das Pluszeichen genommen — nicht
     * ihre Stufe geändert. Eine verschobene Stufe ändert nur, wie oft sie
     * kommt; der Schalter ändert, was sie kostet.
     * ----------------------------------------------------------------------
     */
    FAEHIGKEITEN: {

        /* ---- Gewöhnlich: mehr Beweglichkeit für genau einen Zug ----
           Sie helfen situativ, gewinnen aber für sich genommen nichts. */

        sprung: {
            titel: "Sprung",
            stufe: "gruen",
            art: "zugmuster",
            muster: "springer",
            istDerZug: true,
            beschreibung: "Einsetzen, dann sofort springen: Eine Figur deiner Wahl geht "
                + "jetzt wie ein Springer — und darf dabei schlagen."
        },
        /*
         * AUSWEICHEN GEHT SEIT v0.58 NUR NOCH IM GEGENZUG.
         *
         * Es ist die Notbremse: Eine Figur weicht aus, WÄHREND der Gegner
         * zuschlägt. Bis v0.57 durfte man es auch im eigenen Zug einsetzen und
         * behielt dabei seinen Zug — damit war es ein geschenktes Extra-Feld
         * für jede Figur, jederzeit. Als Notbremse gedacht, als Gratis-Zug
         * benutzt (Nutzer-Meldung 08.08.).
         *
         * Das Pluszeichen fällt dadurch von selbst weg: Wer am Zug ist, darf
         * sie gar nicht erst einsetzen — es gibt also keinen Zug zu behalten.
         * Der Blitz bleibt und ist jetzt das EINZIGE Zeichen an ihr.
         */
        /*
         * AUSWEICHEN IST SEIT v0.78 VERSTECKT — auf Nutzer-Entscheidung
         * (18.08.: „werfe Ausweichen raus, funktioniert eh nicht" → nach der
         * Nachmessung „kann raus").
         *
         * NACHGEMESSEN AM 18.08. AM STAND v0.76: Sie funktionierte
         * vollständig. Einsetzen nur im Gegenzug, das Muster überlebt den
         * gegnerischen Zug, die Figur hat danach wirklich alle freien
         * Nachbarfelder zur Wahl, danach ist es verbraucht. Der Befund steht in
         * `docs\entscheidungen\erkenntnisse.md`.
         *
         * WARUM SIE TROTZDEM GEHT: `nurImGegenzug` (v0.58) sperrt sie, solange
         * man am Zug ist — also genau in dem Moment, in dem man auf seine
         * Fähigkeiten schaut. Wer sie sehen will, muss sie sich merken, während
         * der Gegner denkt. Als Regel richtig, in der Hand unbrauchbar.
         *
         * VERSTECKT, NICHT GELÖSCHT — dieselbe Regel wie bei den Spielarten:
         * Laufende Partien tragen sie im Vorrat, und ein Eintrag, der aus
         * `FAEHIGKEITEN` verschwindet, wird von `SCHACH_RUNDE.normalisieren`
         * beim nächsten Laden weggeworfen (so beim Erdbeben in v0.54, dort
         * gewollt). Hier ist es nicht gewollt: Wer sie hat, soll sie noch
         * einsetzen können.
         *
         * Was `versteckt` bewirkt, steht bei `faehigkeitenDerStufe` — kurz: Sie
         * erscheint in keiner neuen Lootbox mehr und in keiner Liste, aber alles
         * andere an ihr funktioniert weiter. Ihr Beispiel in
         * `schach-vorschau.js` bleibt deshalb ebenfalls stehen.
         */
        ausweichen: {
            titel: "Ausweichen",
            stufe: "gruen",
            versteckt: true,
            art: "zugmuster",
            muster: "ausweichen",
            imGegenzug: true,
            nurImGegenzug: true,
            beschreibung: "Die Notbremse: Du setzt sie ein, WÄHREND der Gegner am Zug "
                + "ist. Danach darf eine Figur deiner Wahl bei deinem nächsten "
                + "Zug auch ein Feld in jede Richtung gehen, auf ein FREIES Feld."
        },
        teleport: {
            titel: "Teleport",
            stufe: "gruen",
            art: "zugmuster",
            muster: "umkreis2",
            istDerZug: true,
            /* Der erste Satz ist zugleich der Kurztext (`faehigkeitKurz`) und
               muss unter 150 Zeichen bleiben — ein Test hält es fest. */
            beschreibung: "Figur antippen und Zielfeld wählen: Sie setzt auf ein FREIES "
                + "Feld im Umkreis von zwei, über alles hinweg — geschlagen wird "
                + "nicht."
        },

        /* ------------------------------------------------------------ *
         * ZWEI NEUE GEWÖHNLICHE (seit v0.79)
         *
         * ANLASS: Nachdem Ausweichen in v0.78 versteckt wurde, standen in der
         * gewöhnlichen Stufe nur noch Sprung und Teleport — beide `istDerZug`,
         * beide „eine Figur bewegt sich anders als sonst", und bei 52 Prozent
         * Stufenchance je 26 Prozent. Jede zweite Lootbox war damit ein
         * Münzwurf zwischen zwei sehr ähnlichen Dingen, und Grün hatte KEIN
         * Pluszeichen mehr: Es hiess nur noch „dein Zug wird ein anderer", nie
         * „du bekommst etwas obendrauf". Der Sprung nach Blau (Mauer,
         * Nudelholz, Schutzschild — alle drei zusätzlich zum Zug) war dadurch
         * kein Schritt mehr, sondern eine Stufe.
         *
         * DIE ANTWORT: zwei Fähigkeiten MIT Pluszeichen, beide rein
         * positionell. Kein Material, keine geschlagene Figur — genau die
         * Bedingung, unter der eine Fähigkeit den Zug behalten darf (v0.47).
         *
         * DIE LEITER BLEIBT, und daran wurden sie gemessen: Grün wirkt auf EIN
         * Feld, Blau auf drei Felder oder zwei Spalten, Lila sperrt den Gegner
         * über mehrere Züge, Gelb schenkt Material. Der Schubs ist die
         * Ein-Feld-Fassung des Nudelholzes, der Platztausch die
         * Ein-Feld-Fassung von gar nichts — er bewegt nur eigene Figuren und
         * verändert die Materiallage überhaupt nicht.
         * ------------------------------------------------------------ */

        schubs: {
            titel: "Schubs",
            stufe: "gruen",
            art: "ziel",
            zielArt: "gegnerFigurSchubsbar",
            beschreibung: "Eine gegnerische Figur neben einer deiner Figuren wird ein "
                + "Feld weggeschoben. Nur auf ein freies Feld, kein Schlag, keine "
                + "Könige. Stehen mehrere deiner Figuren daneben, zeigt der "
                + "Vorschau-Kasten, wohin es geht."
        },

        platztausch: {
            titel: "Platztausch",
            stufe: "gruen",
            art: "ziel",
            zielArt: "eigeneFigurTauschbar",
            beendetZug: true,
            beschreibung: "Eine eigene Figur tauscht den Platz mit dem Nachbarfeld "
                + "— vor, zurück, links oder rechts. Auch mit einer gegnerischen "
                + "Figur; Könige tauschen nicht."
        },

        /* ---- Ungewöhnlich: verändert die Stellung ----
           Spürbar, aber zweischneidig: Sie kosten den Gegner kein Material. */

        /*
         * DER BAUERNSCHUB HAT SEIT v0.56 KEIN PLUSZEICHEN MEHR.
         *
         * Er verschiebt zwar nur die Stellung und fiele damit unter Gruppe 3 —
         * aber er verschiebt bis zu acht Figuren auf einmal, und mit dem Zug
         * obendrauf konnte man erst die ganze Reihe vorrücken und dann mit
         * einem der geschobenen Bauern schlagen. Das sind zwei Züge für eine
         * Fähigkeit; gemeldet als „zu stark". Nach der Regel von v0.47 nimmt
         * man einer zu starken Fähigkeit das Pluszeichen, statt ihre Stufe zu
         * verschieben — genau das ist hier passiert.
         *
         * Der Ausgleich steht im zweiten Satz: Erreichen Bauern durch den
         * Schub die letzte Reihe, wandeln sie ALLE um, und man wählt die Figur.
         * Bis v0.55 wurden sie stillschweigend zu Damen.
         */
        bauernschub: {
            titel: "Bauernschub",
            stufe: "blau",
            art: "sofort",
            beendetZug: true,
            beschreibung: "Alle eigenen Bauern rücken ein Feld vor, soweit das Feld davor "
                + "frei ist; geschlagen wird nicht. Erreicht dabei einer die "
                + "letzte Reihe, wandelt er um."
        },
        schutzschild: {
            titel: "Schutzschild",
            stufe: "blau",
            art: "ziel",
            zielArt: "eigeneFigur",
            /* Der zweite Satz seit v0.69 (Wunsch #31): Dass die geschützte
               Figur stehen bleiben muss, ergab sich bisher nur aus dem
               Spielverlauf — man hat es gemerkt, nachdem es passiert war. */
            beschreibung: "Eine eigene Figur überlebt den nächsten Angriff: Der Schlag "
                + "verpufft, der Angreifer bleibt stehen. Das Schild hängt an der "
                + "FIGUR — ziehst du mit ihr, ist es weg. Auf den König wirkt es "
                + "nicht."
        },
        /*
         * DAS ERDBEBEN IST SEIT v0.54 KEINE FÄHIGKEIT MEHR.
         *
         * Es steht jetzt bei den Unglückswürfeln (`PECH`) und reisst Risse in
         * den Boden, statt Reihen zu verschieben — auf Nutzer-Ansage. Wer es
         * noch im Vorrat hatte, verliert es beim nächsten Laden:
         * `SCHACH_RUNDE.normalisieren` wirft Fähigkeiten weg, die es nicht mehr
         * gibt. Das ist gewollt — eine Fähigkeit, die sich nicht mehr einsetzen
         * lässt, wäre schlimmer.
         */

        /*
         * DAS NUDELHOLZ HAT SEIT v0.80 KEIN PLUSZEICHEN MEHR (Nutzer-Ansage
         * 18.08.: „Nudelholz soll kein Plus mehr haben, also als ein Zug
         * gelten").
         *
         * Das ist der zweite Anwendungsfall der Regel von v0.47: Wird eine
         * Fähigkeit zu stark, nimmt man ihr das PLUSZEICHEN — die Stufe bleibt,
         * wo sie ist. Der erste war der Bauernschub (v0.56), und die Begründung
         * ist hier dieselbe: Das Nudelholz verschiebt eine ganze Doppelspalte,
         * und mit dem Zug obendrauf waren das zwei Züge für eine Fähigkeit.
         *
         * ÜBERFÄLLIG WAR ES AUSSERDEM: In v0.78 hat es Zuwachs bekommen — es
         * rollt seither auch Könige, und vorher hielt ein König alles auf, was
         * hinter ihm stand. Der Preis zog damals nicht mit; das wurde als
         * Beobachtung vermerkt und wird hier nachgeholt.
         */
        nudelholz: {
            titel: "Nudelholz",
            stufe: "blau",
            art: "ziel",
            zielArt: "rand",
            beendetZug: true,
            beschreibung: "Rollt über EINE Spalte oder Reihe und schiebt alle "
                + "Figuren darin ein Feld weiter — eigene wie fremde, Könige "
                + "eingeschlossen. Den Rand, von dem es rollt, drehst du mit "
                + "einem Knopf; wo kein Platz ist, bleibt die Figur stehen."
        },

        /*
         * NACHSCHUB (seit v0.61, Wunsch #15) — „ein blaues Item, das einen
         * Bauern erschafft; danach soll man nicht ziehen können, und der Bauer
         * muss in der untersten Linie erscheinen."
         *
         * Zwei Entscheidungen dazu:
         *
         * `beendetZug` folgt der Hausregel seit v0.47: Wer MATERIAL geschenkt
         * bekommt, gibt den Zug ab. Der Nutzer hat es ohnehin so gewünscht;
         * hier fällt beides zusammen.
         *
         * DAS FELD WIRD GEWÄHLT, NICHT GEWÜRFELT (die Wahl war freigestellt).
         * Seit v0.57 wird jede Fähigkeit mit Zielfeld platziert — ein
         * gewürfeltes Feld wäre der einzige Ausreisser, und man müsste den
         * Vorschau-Kasten für genau diese eine Fähigkeit abschalten. Fair ist
         * es trotzdem: Die Grundreihe ist die eigene, und je voller sie steht,
         * desto weniger Auswahl bleibt.
         */
        nachschub: {
            titel: "Nachschub",
            stufe: "blau",
            art: "ziel",
            zielArt: "eigeneGrundreihe",
            beendetZug: true,
            beschreibung: "Ein neuer Bauer tritt an: Du setzt ihn auf ein freies Feld "
                + "deiner eigenen Grundreihe. Ist dort nichts frei, geht es "
                + "nicht."
        },

        /* ---- Episch: kostet den Gegner wirklich etwas ----
           Sie verschieben das Kräfteverhältnis, ohne die Partie zu entscheiden. */

        /*
         * FROST SPERRT SEIT v0.56 EINE FLÄCHE, KEINE FIGUR.
         *
         * Angetippt wird die linke obere Ecke eines 2×2-Blocks; alles darin
         * friert ein — auch eigene Figuren. Das ist die Entscheidung des
         * Nutzers vom 08.08. und zugleich das, was die Fähigkeit interessant
         * macht: Sie ist stark, aber man muss den Block sauber setzen.
         *
         * Damit trennen sich Frost und Fessel endlich sauber: Frost sperrt
         * eine FLÄCHE für einen Zug und macht unantastbar, die Fessel hält
         * EINE Figur über mehrere Züge fest und lässt sie schlagbar. Vorher
         * taten beide fast dasselbe.
         */
        frost: {
            titel: "Frost",
            stufe: "lila",
            art: "ziel",
            zielArt: "frostblock",
            /*
             * DER LETZTE SATZ VON v0.80 IST HIER BIS v0.99 STEHEN GEBLIEBEN:
             * „Wer einen König so einsperrt, dass ihm kein Feld mehr bleibt,
             * setzt ihn matt." Das Recht des Frostes, mattzusetzen, ist mit
             * v0.95 zurückgenommen worden (`_wirkungVerboten`) — der Text
             * versprach also seit fünf Versionen etwas, das die Regel abweist.
             *
             * Aufgefallen ist es beim Kürzen, nicht beim Regeln-Ändern. Wer
             * eine Regel aufhebt, sucht auch die TEXTE, die sie erklären —
             * dieselbe Lehre wie in v0.94, nur eine Ebene weiter aussen.
             */
            beschreibung: "Friert ein 2-mal-2-Feld einen Zug lang ein. Was darin steht, "
                + "kommt nicht heraus und ist so lange auch nicht schlagbar — "
                + "eigene Figuren eingeschlossen. Innen darf sich alles bewegen. "
                + "Angetippt wird die linke obere Ecke."
        },
        /*
         * VERSTÄRKUNG IST SEIT v0.56 EINE AUFWERTUNGSKETTE.
         *
         * Bis v0.55 machte sie aus einem Bauern einen Springer, sonst nichts.
         * Jetzt steigt JEDE eigene Figur eine Stufe (`SCHACH.AUFWERTUNG`).
         * Deshalb ist `zielArt` von `eigenerBauer` auf `eigeneFigur` gewechselt.
         *
         * Am oberen Ende steht der König, und der ist keine Zierde: Ein
         * zweiter König sind ZWEI LEBEN — dieselbe Regel wie bei der
         * Zufallsarmee, `koenigeAlsLeben` im Stand. Und weil zwei Leben nicht
         * für jeden das Richtige sind, geht der Weg zurück: Wer zwei Könige
         * hat, tippt einen an und bekommt zwei Damen.
         */
        verstaerkung: {
            titel: "Verstärkung",
            stufe: "lila",
            art: "ziel",
            zielArt: "eigeneFigur",
            beendetZug: true,
            /* Der erste Satz ist der Kurztext und bleibt unter 150 Zeichen —
               die Kette selbst steht im zweiten. */
            beschreibung: "Eine eigene Figur steigt eine Stufe auf. Bauer wird Springer, "
                + "Springer wird Läufer oder Turm, Läufer und Turm werden Dame, "
                + "Dame wird König — ein zweiter König sind zwei Leben."
        },
        fessel: {
            titel: "Fessel",
            stufe: "lila",
            art: "ziel",
            zielArt: "gegnerFigur",
            beschreibung: "Eine gegnerische Figur bleibt mehrere Züge lang stehen — sie "
                + "darf nicht ziehen, ist aber ganz normal zu schlagen. Wie "
                + "lange, steht als Zahl an ihrem Feld."
        },

        /* ---- Legendär: entscheidet Partien ----
           Zwei Züge hintereinander gewinnen fast immer Material, und eine
           zurückgeholte Dame ersetzt eine ganze Schlacht. Deshalb selten. */

        doppelzug: {
            titel: "Doppelzug",
            stufe: "gelb",
            art: "ablauf",
            beschreibung: "Nach dem nächsten Zug ist dein Team sofort noch einmal am Zug. "
                + "Der König des Gegners bleibt dabei unantastbar."
        },
        /*
         * Wiedergeburt ist seit v0.48 EPISCH, nicht mehr legendär.
         *
         * Sie holt eine Figur auf die eigene GRUNDREIHE zurück — weit weg vom
         * Geschehen, und der Gegner sieht sie kommen. Damit ist sie deutlich
         * schwächer als ihre legendären Nachbarn (Wiederbelebung setzt an den
         * Ort des Geschehens, der Friedhof bringt gleich vier). Auf der
         * legendären Stufe war sie die Enttäuschung unter fünf.
         */
        /*
         * WIEDERGEBURT IST SEIT v0.92 AUSGEBLENDET (Nutzer-Wunsch W5).
         *
         * `versteckt: true` — derselbe Weg wie beim Ausweichen (v0.78): Sie
         * wird nicht mehr gezogen und steht nicht mehr in der Bibliothek, wer
         * sie aber im Vorrat hat, darf sie aufbrauchen. Anders als bei einem
         * Unglück ist das hier richtig: Eine Fähigkeit im Vorrat ist Besitz,
         * keine Gefahr (siehe die Entscheidung zu Ausdehnung und Einsturz).
         *
         * Der Eintrag bleibt vollständig stehen, damit der Zugverlauf alter
         * Partien lesbar bleibt und die Rückkehr ein einziger Schalter ist.
         */
        wiedergeburt: {
            titel: "Wiedergeburt",
            stufe: "lila",
            versteckt: true,
            art: "ziel",
            zielArt: "eigeneGrundreihe",
            beendetZug: true,
            beschreibung: "Die zuletzt verlorene eigene Figur kehrt auf ein freies Feld "
                + "der eigenen Grundreihe zurück."
        },
        spiegel: {
            titel: "Spiegel",
            stufe: "lila",
            art: "ziel",
            zielArt: "eigeneFigurKopierbar",
            beendetZug: true,
            beschreibung: "Verdoppelt eine eigene Figur: Die Kopie erscheint auf einem "
                + "freien Feld daneben. Könige lassen sich nicht spiegeln."
        },

        /*
         * Wiederbelebung (seit v3.3) — der grosse Bruder der Wiedergeburt.
         *
         * Der Unterschied ist der ORT: Die Wiedergeburt setzt auf die eigene
         * Grundreihe, also weit hinten; die Wiederbelebung holt die Figur genau
         * dorthin zurück, wo sie fiel — oft mitten im Geschehen. Deshalb kostet
         * sie den ganzen Zug, und deshalb ist sie legendär.
         */
        wiederbelebung: {
            titel: "Wiederbelebung",
            stufe: "gelb",
            art: "ziel",
            zielArt: "eigenesGrab",
            beendetZug: true,
            beschreibung: "Eine eigene geschlagene Figur steht genau dort wieder auf, wo "
                + "sie fiel — wenn das Feld frei ist."
        },

        /*
         * Mauer (seit v3.3) — ungewöhnlich, nicht selten.
         *
         * Sie nimmt niemandem Material und gehört keiner Seite: Sie steht
         * einfach im Weg, für beide. Stark ist sie nur, wenn man sie zur
         * rechten Zeit legt — und das macht sie zu einer Fähigkeit der
         * mittleren Stufe, nicht zu einer legendären.
         */
        mauer: {
            titel: "Mauer",
            stufe: "blau",
            art: "ziel",
            zielArt: "mauerplatz",
            /*
             * KURZ GEHALTEN (seit v0.100, zweite Nutzer-Ansage dazu). Der Text
             * nannte jede Bedingung in einem eigenen Satz und war damit der
             * längste im Spiel — im Einsetzen-Fenster liest ihn dann niemand.
             *
             * Geblieben ist, was man VOR dem Antippen wissen muss; die
             * Feinheiten (Rand, Riss) zeigt das Brett ohnehin, indem es dort
             * kein Zielfeld markiert.
             */
            beschreibung: "Legt eine Mauer über drei freie Felder — das angetippte und je "
                + "eines daneben. Niemand zieht hindurch, nur Springer setzen "
                + "darüber. Nach 6 Halbzügen zerfällt sie; Lootboxen darunter "
                + "sind weg."
        },

        /*
         * Händler (seit v3.3) — die erste Fähigkeit mit einer Rückfrage.
         *
         * Sie tauscht Material gegen Material, ungefähr gleichwertig. Genau
         * darin liegt ihr Reiz: Sie macht einen nicht stärker, sondern ANDERS
         * stark — fünf Bauern sind so viel wert wie ein Turm, spielen sich aber
         * völlig verschieden. Wer das Angebot nicht mag, lehnt ab.
         */
        haendler: {
            titel: "Händler",
            stufe: "lila",
            art: "handel",
            beendetZug: true,
            beschreibung: "Ein Angebot: Figuren gegen andere, ungefähr gleich viel wert. "
                + "Du darfst ablehnen — dann bleibt die Fähigkeit dir."
        },

        /*
         * Dieb (seit v0.85, Wunsch T4 vom 18.08.) — die zweite Fähigkeit mit
         * einer Rückfrage, nach dem Muster des Händlers.
         *
         * Sie nimmt dem Gegner bis zu zwei Fähigkeiten weg und legt sie in den
         * eigenen Vorrat. Damit ist sie die einzige, die den Gegner ÄRMER
         * macht, statt einen selbst reicher — der Unterschied zählt: Wer
         * nichts hat, dem kann sie nichts nehmen, und dann lässt sie sich
         * nicht einsetzen.
         *
         * WARUM SIE LILA IST und nicht legendär: Sie verschiebt Material,
         * erschafft aber keins. Was sie bringt, hängt davon ab, was der
         * Gegner gerade hat — im Schnitt also eine gewöhnliche Fähigkeit,
         * gelegentlich eine gute. Der Friedhof (gelb) bringt dagegen
         * verlässlich vier Figuren zurück.
         *
         * WER WAS VERLIERT, WIRD GERECHNET, nicht gewürfelt (`_zufallsWert`
         * aus Partie-Kennung und Zugzähler) — sonst sähe jedes Gerät eine
         * andere Beute, und der erste Schreibvorgang würde die anderen
         * überstimmen.
         */
        /*
         * ENTTARNEN (seit v0.88, Wunsch R4) — die erste Fähigkeit, die es nur
         * unter einer bestimmten EINSTELLUNG gibt.
         *
         * `nurOhneSeltenheit: true` heisst: Sie kommt ausschliesslich in
         * Partien vor, die die Seltenheit der Lootboxen verbergen
         * (`regeln.seltenheitZeigen === false`). Wo die Farbe ohnehin zu sehen
         * ist, wäre sie wirkungslos — eine Fähigkeit, die nichts tut, ist
         * schlimmer als keine.
         *
         * Gefiltert wird an EINER Stelle: `SCHACH_RUNDE.erlaubteFaehigkeiten`
         * baut die Liste für die Partie, `faehigkeitenDerStufe` nimmt sie
         * entgegen. Sie greift damit in Ziehung, Prozentrechnung und
         * Erklärtext gleichzeitig.
         *
         * KEIN BRUCH DER EISERNEN REGEL „die Oberfläche verrät nie, was in
         * einer Lootbox steckt": Gezeigt wird die FARBE (wie selten?), nicht
         * der Inhalt. Das ist dieselbe Auskunft, die eine Partie mit
         * `seltenheitZeigen` dauerhaft gibt — hier eben auf Zeit und nur für
         * eine Seite.
         */
        enttarnen: {
            titel: "Enttarnen",
            stufe: "blau",
            art: "sicht",
            sichtWirkung: "zeigen",
            nurOhneSeltenheit: true,
            beschreibung: "Du allein siehst 6 Halbzüge lang an der Farbe, wie selten die "
                + "liegenden Lootboxen sind — was drin steckt, verrät sie nicht. "
                + "Gibt es nur in Partien, welche die Seltenheit verbergen."
        },

        /*
         * VERSTECKEN (seit v0.98, Wunsch R4) — das Gegenstück zum Enttarnen
         * und die zweite Fähigkeit, deren Existenz an einer EINSTELLUNG hängt.
         *
         * `nurMitSeltenheit: true` ist die Umkehrung: Sie kommt ausschliesslich
         * in Partien vor, die die Seltenheit ZEIGEN
         * (`regeln.seltenheitZeigen !== false`). Wo die Farbe ohnehin verborgen
         * ist, gäbe es nichts mehr zu verbergen — und eine Fähigkeit, die
         * nichts tut, ist schlimmer als keine.
         *
         * DIE BEIDEN SCHLIESSEN EINANDER AUS, und das ist Absicht: In jeder
         * Partie gibt es genau eine der zwei. Deshalb tragen sie dieselbe Stufe
         * und dieselbe Dauer — welche von beiden man bekommt, entscheidet die
         * Partie, nicht das Glück.
         *
         * SIE WIRKT AUF DEN GEGNER, nicht auf einen selbst — als einzige der
         * Art „sicht". Damit der Wirkungs-Zweig das nicht am Namen ablesen
         * muss, sagt `sichtWirkung` es ausdrücklich: "zeigen" oder "verbergen".
         *
         * KEIN BRUCH DER EISERNEN REGEL „die Oberfläche verrät nie, was in
         * einer Lootbox steckt": Verborgen wird die FARBE (wie selten?), nicht
         * der Inhalt — dieselbe Auskunft, die eine Partie ohne
         * `seltenheitZeigen` dauerhaft verweigert, hier eben auf Zeit und nur
         * für eine Seite.
         */
        verstecken: {
            titel: "Verstecken",
            stufe: "blau",
            art: "sicht",
            sichtWirkung: "verbergen",
            nurMitSeltenheit: true,
            beschreibung: "Dein Gegner sieht 6 Halbzüge lang nicht mehr, wie selten die "
                + "liegenden Lootboxen sind; du selbst schon. Gibt es nur in "
                + "Partien, welche die Seltenheit zeigen."
        },

        dieb: {
            titel: "Dieb",
            stufe: "lila",
            art: "diebstahl",
            beendetZug: true,
            beschreibung: "Du nimmst dem Gegner bis zu zwei Fähigkeiten weg. Vorher "
                + "siehst du, was du bekommst, und darfst ablehnen — dann "
                + "behältst du den Dieb und greifst später woanders zu. Hat der "
                + "Gegner nichts, geht es nicht."
        },

        /*
         * Friedhof (seit v3.3) — legendär, und zwar mit Abstand die stärkste.
         *
         * Sie bringt Material, das eigentlich weg war, zurück auf DEINE Seite:
         * bis zu vier gefallene GEGNER auf einmal. Dass sie nach ein paar Zügen
         * zerfallen, ist der Preis — und der Grund, warum sie das Spiel nicht
         * einfach entscheidet: Man muss etwas mit ihnen anfangen, solange sie
         * da sind.
         */
        friedhof: {
            titel: "Nekromant",
            stufe: "gelb",
            art: "ziel",
            zielArt: "friedhofsplatz",
            beendetZug: true,
            beschreibung: "Bis zu vier gefallene GEGNER stehen auf einem freien "
                + "2-mal-2-Feld wieder auf — in deiner Farbe, du ziehst mit ihnen "
                + "wie mit eigenen. Je stärker die Figur, desto kürzer bleibt "
                + "sie: Bauer 8 Halbzüge, Dame 2. Die Restzeit steht an ihrem "
                + "Feld."
        }
    },

    /* ---------------------------------------------------------------- *
     * Die Angebote des Händlers
     *
     * Jede Zeile ist ein Tausch: `gibt` verschwindet vom Brett, `bekommt`
     * erscheint dafür. Gezogen wird gerechnet (nicht gewürfelt), damit alle
     * Geräte dasselbe Angebot sehen.
     *
     * ZUM GLEICHGEWICHT: Gerechnet wird mit den üblichen Figurenwerten
     * (Bauer 1, Springer und Läufer 3, Turm 5, Dame 9). Kein Angebot bringt
     * mehr als einen Punkt Vorsprung — sonst wäre der Händler keine Wahl,
     * sondern ein Geschenk, und man würde immer annehmen.
     *
     * Beide Richtungen stehen als eigene Zeilen da, statt eine Zeile zu drehen:
     * So sieht man beim Lesen sofort, was möglich ist, und kann einzelne
     * Richtungen weglassen, die sich nicht gut spielen.
     * ---------------------------------------------------------------- */

    /*
     * EINE SEITE DARF MEHRERE FIGURENARTEN TRAGEN (seit v0.58).
     *
     * Bis v0.57 war `gibt` und `bekommt` je EIN Eintrag — für „drei Bauern
     * gegen einen Springer" reicht das. Für „Dame und Bauer gegen einen
     * König" nicht: Dort stehen links zwei verschiedene Arten. Deshalb darf
     * eine Seite jetzt auch eine LISTE sein.
     *
     * Die alten Zeilen bleiben unverändert stehen — `handelSeite` macht aus
     * beidem eine Liste. Das ist billiger und lesbarer, als zehn Zeilen in
     * Klammern zu setzen, nur damit die elfte hineinpasst.
     *
     * `gewicht` (wahlfrei, Vorgabe 1) sagt, wie oft ein Angebot gezogen wird.
     * Gebraucht wird es genau einmal: Der König ist ein zweites LEBEN und
     * gehört damit nicht in die normale Rotation.
     */
    HANDEL: [
        { gibt: { art: "B", anzahl: 3 }, bekommt: { art: "S", anzahl: 1 } },
        { gibt: { art: "B", anzahl: 3 }, bekommt: { art: "L", anzahl: 1 } },
        { gibt: { art: "S", anzahl: 1 }, bekommt: { art: "B", anzahl: 3 } },
        { gibt: { art: "L", anzahl: 1 }, bekommt: { art: "B", anzahl: 3 } },
        { gibt: { art: "B", anzahl: 5 }, bekommt: { art: "T", anzahl: 1 } },
        { gibt: { art: "T", anzahl: 1 }, bekommt: { art: "B", anzahl: 5 } },
        { gibt: { art: "S", anzahl: 1 }, bekommt: { art: "L", anzahl: 1 } },
        { gibt: { art: "L", anzahl: 1 }, bekommt: { art: "S", anzahl: 1 } },
        { gibt: { art: "T", anzahl: 2 }, bekommt: { art: "D", anzahl: 1 } },
        { gibt: { art: "D", anzahl: 1 }, bekommt: { art: "T", anzahl: 2 } },

        /*
         * DAS SELTENE ANGEBOT: ein zweites Leben.
         *
         * Zehn Punkte Material gegen einen zweiten König — nach den üblichen
         * Figurenwerten ein schlechtes Geschäft, nach der Regel „zwei Könige
         * sind zwei Leben" (siehe `SCHACH.koenigSchlagbarFuer`) ein sehr
         * gutes: Solange zwei stehen, kennt diese Seite kein Matt. Deshalb
         * kostet es die Dame UND einen Bauern, und deshalb kommt es mit
         * einem Zehntel des Gewichts der übrigen.
         */
        {
            gibt: [{ art: "D", anzahl: 1 }, { art: "B", anzahl: 1 }],
            bekommt: { art: "K", anzahl: 1 },
            gewicht: 0.1
        }
    ],

    /* Eine Seite eines Angebots als Liste — einzelner Eintrag oder mehrere. */
    handelSeite(seite) {
        return Array.isArray(seite) ? seite : [seite];
    },

    /* Wie viele Figuren eine Seite umfasst. */
    handelAnzahl(seite) {
        return SCHACH_VARIANTEN.handelSeite(seite)
            .reduce((summe, teil) => summe + teil.anzahl, 0);
    },

    /*
     * Zieht ein Angebot aus der Tabelle. `wert` ist eine Zahl von 0 bis 1.
     * Gewichtet, damit ein einzelnes Angebot selten sein kann.
     */
    handelZiehen(wert) {
        const gewichte = SCHACH_VARIANTEN.HANDEL.map(
            (eintrag) => (typeof eintrag.gewicht === "number") ? eintrag.gewicht : 1);
        const summe = gewichte.reduce((teil, einzeln) => teil + einzeln, 0);

        let rest = Math.min(Math.max(wert, 0), 0.999999) * summe;

        for (let stelle = 0; stelle < SCHACH_VARIANTEN.HANDEL.length; stelle++) {
            if (rest < gewichte[stelle]) {
                return SCHACH_VARIANTEN.HANDEL[stelle];
            }
            rest -= gewichte[stelle];
        }

        return SCHACH_VARIANTEN.HANDEL[0];
    },

    /* ---------------------------------------------------------------- *
     * DIE BRETTFORM (seit v0.63, Wunsch #22)
     *
     * Bis v0.62 war die Liste der Spielarten flach und mischte zwei Fragen:
     * WELCHE FORM hat das Brett, und WIE GROSS ist es. Mit dem Kreuz kamen
     * drei weitere Grössen dazu — als eine Liste wären das neun Kacheln
     * nebeneinander gewesen, ohne erkennbare Ordnung.
     *
     * Seither wählt man erst die Form, dann darunter die Grösse. Die Form ist
     * ein MERKMAL am Eintrag, keine Umsortierung: Die Reihenfolge in `liste`
     * bleibt unangetastet (eiserne Regel — die Partie-Kennungen der Tests
     * entstehen aus ihr).
     * ---------------------------------------------------------------- */

    FORMEN: [
        {
            id: "klassisch",
            titel: "Quadratisch",
            beschreibung: "Gleich breit wie hoch — das gewohnte Schachbrett in "
                + "drei Grössen."
        },
        {
            id: "rechteckig",
            titel: "Rechteckig",
            beschreibung: "Breiter als hoch. Mehr Platz zur Seite, längere "
                + "Diagonalen, mehr Figuren."
        },
        {
            id: "kreuz",
            titel: "Kreuz",
            beschreibung: "Ein Feld in der Mitte, an allen vier Seiten ein "
                + "Streifen mit einer Armee. Die Ecken gehören nicht zum Brett."
        }
    ],

    /* Die Form einer Spielart; ohne Angabe gilt „quadratisch". */
    formVon(variante) {
        return (variante && variante.form) ? variante.form : "klassisch";
    },

    /* Die Spielarten einer Form, in der Reihenfolge der Liste. */
    zurAuswahlNachForm(formId) {
        return SCHACH_VARIANTEN.zurAuswahl().filter(
            (eintrag) => SCHACH_VARIANTEN.formVon(eintrag) === formId);
    },

    /* ---------------------------------------------------------------- *
     * DAS KREUZ-BRETT (seit v0.63)
     *
     * Aufbau bei `mitte` = 8 und `rand` = 2 (also 12 mal 12):
     *
     *       ..TTTTTTTT..      Die vier 2-mal-2-Ecken sind KEIN Brett — sie
     *       ..pppppppp..      liegen als Risse im Stand und sind damit für
     *       T...........T     die Regeln gesperrt (dieselbe Sperre, die das
     *       S...........S     Erdbeben seit v0.54 erzeugt).
     *       L...........L
     *       D...........D     Oben und unten steht die FRONT-Armee mit
     *       L...........L     Bauern, links und rechts die FLÜGEL-Armee aus
     *       S...........S     Offizieren.
     *       T...........T
     *       ..PPPPPPPP..
     *       ..TTTTTTTT..
     *
     * WARUM DIE FLÜGEL KEINE BAUERN HABEN. Ein Bauer zieht in Richtung seiner
     * FARBE — Weiss nach oben, Schwarz nach unten. Das steckt tief im
     * Regelwerk und hängt nicht daran, wo die Figur steht. Ein weisser Bauer
     * am linken Rand marschierte also nicht zur Mitte, sondern den Streifen
     * hinauf und stünde nach sechs Zügen als Dame in der gegnerischen Ecke.
     * Offiziere haben dieses Problem nicht: Sie ziehen in jede Richtung
     * gleich.
     *
     * WARUM WEISS TROTZDEM IMMER UNTEN STEHT. Aus demselben Grund. Gewürfelt
     * wird deshalb das, wo es wirklich etwas zu entscheiden gibt: WELCHES
     * TEAM DEN LINKEN UND WELCHES DEN RECHTEN FLÜGEL BEKOMMT
     * (`SCHACH_RUNDE.kreuzAufstellen`).
     * ---------------------------------------------------------------- */

    KREUZ: {
        /* Wie breit die Streifen an den vier Seiten sind. Zwei — dieselbe Zahl
           wie der freie Rand der Zufallsarmee, und damit dieselbe 2-mal-2-Ecke,
           die diese Bretter erkennbar macht. */
        rand: 2,

        /*
         * VIER VOLLE ARMEEN (seit v0.65, Ansage vom 13.08.).
         *
         * Bis v0.64 hatten die seitlichen Streifen nur Offiziere in der
         * äusseren Spalte — weil ein Bauer damals in Richtung seiner FARBE zog
         * und am Rand deshalb falsch gelaufen wäre. Seit v0.65 merkt sich
         * jeder Bauer seine STARTSEITE (das Feld `bauernSeiten` im Stand,
         * gefragt wird es über `SCHACH.bauernSeite`), und damit
         * bekommt jede der vier Seiten dieselbe volle Armee:
         *
         *     aussen   die Grundreihe (Türme, Springer, Läufer, Dame, König)
         *     innen    eine ganze Reihe Bauern
         *
         * Beim 12-mal-12-Kreuz ist der Streifen 2 mal 8 Felder gross — das
         * sind genau die 16 Einheiten einer gewohnten Armee. Die anderen
         * Grössen skalieren mit: 12 beim kleinen, 20 beim grossen Kreuz.
         */
        seiten: ["oben", "unten", "links", "rechts"]
    },

    /*
     * Die Aufstellung eines Kreuz-Bretts als Zeichenkette — dieselbe Form, in
     * der auch jede andere Spielart ihre `aufstellung` trägt.
     *
     * Sie ist die VORLAGE: Das echte Brett entsteht daraus in
     * `SCHACH_RUNDE.kreuzAufstellen`, das nur noch die Flügelfarben tauschen
     * kann. Hier steht Weiss links — welche Seite es in einer Partie wirklich
     * ist, entscheidet die Partie-Kennung.
     */
    kreuzAufstellung(mitte, nurSeiten) {
        const felder = SCHACH_VARIANTEN.kreuzFelder(mitte);
        const kante = mitte + 2 * SCHACH_VARIANTEN.KREUZ.rand;
        const zeichen = [];

        for (let feld = 0; feld < kante * kante; feld++) {
            zeichen.push(".");
        }

        /* Die Vorlage: oben und links Schwarz, unten und rechts Weiss. Welche
           Seiten eine Partie wirklich bekommt, entscheidet
           `SCHACH_RUNDE.kreuzAufstellen` — hier steht nur EIN gültiger Fall,
           an dem sich alles Weitere ausrichtet. */
        const weiss = ["unten", "rechts"];

        for (const eintrag of felder) {
            /* Mit nur EINER Armee je Team (seit v0.72) bleiben zwei Seiten
               leer — welche zwei, entscheidet auch hier erst die Partie. */
            if (nurSeiten && nurSeiten.indexOf(eintrag.seite) === -1) {
                continue;
            }

            zeichen[eintrag.feld] = (weiss.indexOf(eintrag.seite) !== -1)
                ? eintrag.figur
                : eintrag.figur.toLowerCase();
        }

        return zeichen.join("");
    },

    /*
     * WO AUF DEM KREUZ WELCHE FIGUR STEHT — als Liste, nicht als Zeichenkette.
     *
     * Jeder Eintrag sagt: { feld, seite, figur, istBauer }. `seite` ist die
     * Startseite dieser Armee; genau daraus entstehen später die Einträge in
     * `bauernSeiten` im Stand, und daran hängt, wohin die Bauern laufen.
     *
     * Die Liste ist die EINE Wahrheit über den Aufbau: Sowohl die Aufstellung
     * als Zeichenkette als auch die Startseiten werden daraus gebaut. Zwei
     * getrennte Rechnungen liefen früher oder später auseinander.
     */
    kreuzFelder(mitte) {
        const rand = SCHACH_VARIANTEN.KREUZ.rand;
        const kante = mitte + 2 * rand;
        const grundreihe = SCHACH_VARIANTEN._grundreiheFuer(mitte);
        const liste = [];

        const eintragen = (reihe, spalte, seite, figur) => {
            liste.push({
                feld: reihe * kante + spalte,
                seite: seite,
                figur: figur,
                istBauer: (figur === "B")
            });
        };

        for (let stelle = 0; stelle < mitte; stelle++) {
            const quer = rand + stelle;
            const offizier = grundreihe[stelle];

            /* Oben und unten: die Grundreihe ganz aussen, die Bauern davor. */
            eintragen(0, quer, "oben", offizier);
            eintragen(1, quer, "oben", "B");
            eintragen(kante - 2, quer, "unten", "B");
            eintragen(kante - 1, quer, "unten", offizier);

            /* Links und rechts: dasselbe um eine Vierteldrehung gekippt —
               die Grundreihe steht in der äusseren SPALTE. */
            eintragen(quer, 0, "links", offizier);
            eintragen(quer, 1, "links", "B");
            eintragen(quer, kante - 2, "rechts", "B");
            eintragen(quer, kante - 1, "rechts", offizier);
        }

        return liste;
    },

    /*
     * Die Grundreihe für eine Front dieser Breite: von aussen nach innen
     * T S L … und in der Mitte D K. Bei geraden Breiten geht das genau auf.
     */
    _grundreiheFuer(breite) {
        const halb = Math.floor(breite / 2);
        const links = [];

        for (let stelle = 0; stelle < halb - 1; stelle++) {
            links.push(["T", "S", "L"][Math.min(stelle, 2)]);
        }

        const rechts = links.slice().reverse();
        return links.concat(["D", "K"]).concat(rechts).join("").substring(0, breite);
    },

    /* Die Feldnummern der vier toten Ecken eines Kreuz-Bretts. */
    kreuzEcken(variante) {
        const rand = SCHACH_VARIANTEN.KREUZ.rand;
        const kante = variante.breite;
        const felder = [];

        for (let reihe = 0; reihe < rand; reihe++) {
            for (let spalte = 0; spalte < rand; spalte++) {
                felder.push(reihe * kante + spalte);
                felder.push(reihe * kante + (kante - 1 - spalte));
                felder.push((kante - 1 - reihe) * kante + spalte);
                felder.push((kante - 1 - reihe) * kante + (kante - 1 - spalte));
            }
        }

        return felder.sort((einer, anderer) => einer - anderer);
    },

    liste: [
        {
            id: "standard",
            titel: "Klassisch",
            form: "klassisch",
            beschreibung: "Das gewohnte Brett mit allen Regeln.",
            breite: 8,
            hoehe: 8,
            aufstellung:
                "tsldklst"
                + "bbbbbbbb"
                + "........"
                + "........"
                + "........"
                + "........"
                + "BBBBBBBB"
                + "TSLDKLST",
            rochade: true,
            koenigSchlagbar: false,
            bonusFelder: []
        },
        {
            id: "klein",
            titel: "Kleines Brett",
            form: "klassisch",
            beschreibung: "Ohne Läufer — kurze, scharfe Partien.",
            breite: 6,
            hoehe: 6,
            aufstellung:
                "tsdkst"
                + "bbbbbb"
                + "......"
                + "......"
                + "BBBBBB"
                + "TSDKST",
            rochade: true,
            koenigSchlagbar: false,
            bonusFelder: []
        },
        {
            id: "gross",
            titel: "Großes Brett",
            form: "rechteckig",
            beschreibung: "Je zwei Läuferpaare, mehr Platz zur Seite, lange Diagonalen.",
            breite: 10,
            hoehe: 8,
            aufstellung:
                "tslldkllst"
                + "bbbbbbbbbb"
                + ".........."
                + ".........."
                + ".........."
                + ".........."
                + "BBBBBBBBBB"
                + "TSLLDKLLST",
            rochade: true,
            koenigSchlagbar: false,
            bonusFelder: []
        },
        {
            id: "doppelbrett",
            titel: "Doppelbrett",
            form: "rechteckig",
            beschreibung: "Zwei Bretter nebeneinander, zwei Armeen je Seite. Zwei Könige "
                + "heissen zwei Leben — erst der letzte kann mattgesetzt werden.",
            breite: 16,
            hoehe: 8,
            aufstellung:
                "tsldklsttsldklst"
                + "bbbbbbbbbbbbbbbb"
                + "................"
                + "................"
                + "................"
                + "................"
                + "BBBBBBBBBBBBBBBB"
                + "TSLDKLSTTSLDKLST",
            rochade: true,

            /*
             * ZWEI LEBEN STATT „GAR KEIN SCHACH" (seit v0.59, Wunsch #17).
             *
             * Bis v0.58 stand hier `koenigSchlagbar: true`: Auf dem
             * Doppelbrett gab es überhaupt kein Schach und kein Matt, auch
             * dann nicht, wenn nur noch ein König stand. Gemeldet wurde genau
             * das — der erste König soll normal fallen, danach soll wieder die
             * gewohnte Regel gelten, „so wie bei der Zufallsarmee".
             *
             * Genau das ist `koenigeAlsLeben` (seit v0.49): Solange eine Seite
             * mehr als einen König hat, sind ihre Könige gewöhnliche Figuren;
             * beim letzten kippt es zurück zu Schach und Matt. Die Maschinerie
             * war also schon da — das Doppelbrett benutzte sie nur nicht.
             *
             * Es gilt JE FARBE: Wer seinen ersten König verloren hat, kann ins
             * Schach kommen, während der Gegner mit zwei Königen noch keines
             * kennt.
             */
            koenigSchlagbar: false,
            koenigeAlsLeben: true,
            bonusFelder: []
        },
        {
            id: "faehigkeiten",
            titel: "Fähigkeiten sammeln",
            beschreibung: "Klassisches Brett mit Lootboxen. Gibt es seit v2.9 nicht "
                + "mehr zur Auswahl — dasselbe erreicht man mit „Klassisch“ und "
                + "eingeschaltetem Lootbox-Haken.",

            /*
             * NICHT MEHR ZUR AUSWAHL, aber weiterhin im Katalog.
             *
             * Seit v2.5 lassen sich Würfel in JEDER Spielart zuschalten; damit
             * war diese hier dasselbe wie „Klassisch mit Haken" und stand nur
             * doppelt in der Liste. Gelöscht wird sie trotzdem nicht: Partien,
             * die noch laufen, tragen diese Kennung im Stand und würden sonst
             * ihre Spielart verlieren.
             */
            versteckt: true,

            /* Diese Spielart lässt Fähigkeiten über die Partie hinweg
               erscheinen. Ohne diesen Schalter passiert nichts. */
            faehigkeiten: true,
            breite: 8,
            hoehe: 8,
            aufstellung:
                "tsldklst"
                + "bbbbbbbb"
                + "........"
                + "........"
                + "........"
                + "........"
                + "BBBBBBBB"
                + "TSLDKLST",
            rochade: true,
            koenigSchlagbar: false,
            /*
             * Zwei Aufgaben, deshalb bleibt die Liste stehen:
             *  1. Vorschaubild — sie deutet an, wo Würfel auftauchen.
             *  2. Umstieg — Partien, die vor dem Erscheinen-über-die-Zeit
             *     angefangen wurden, hatten genau diese vier Felder von Beginn
             *     an liegen (siehe SCHACH_RUNDE.BONUS_FASSUNG).
             * Für NEUE Partien werden sie nicht mehr gelegt.
             */
            bonusFelder: [
                { feld: 26, art: "sprung" },
                { feld: 29, art: "doppelzug" },
                { feld: 34, art: "doppelzug" },
                { feld: 37, art: "sprung" }
            ]
        },

        /*
         * NEUE SPIELARTEN KOMMEN ANS ENDE DER LISTE.
         *
         * Nicht aus Bequemlichkeit: Die Partie-Kennungen der Tests entstehen
         * aus der Reihenfolge dieser Liste, und die gerechneten Würfel hängen
         * an der Kennung. Ein Eintrag in der Mitte verschiebt alles dahinter
         * und lässt Tests scheitern, die mit der neuen Spielart nichts zu tun
         * haben (genau so beim Bau von v0.49 passiert).
         */
        {
            id: "zufallsarmee",
            titel: "Zufallsarmee",
            beschreibung: "Gibt es seit v0.51 nicht mehr zur Auswahl — dasselbe "
                + "erreicht man mit jeder Spielart und dem Haken Zufallsarmee.",

            /*
             * NICHT MEHR ZUR AUSWAHL, aber weiterhin im Katalog — dieselbe
             * Geschichte wie bei „Fähigkeiten sammeln" (v2.9).
             *
             * In v0.49 war die Zufallsarmee eine eigene Spielart und damit an
             * das 8-mal-8-Brett gefesselt. Seit v0.51 ist sie ein HAKEN
             * (`regeln.zufallsArmee`) und gilt für jedes Brett; die Spielart
             * wäre nur noch „Klassisch mit Haken" und stünde doppelt in der
             * Liste. Gelöscht wird sie trotzdem nicht: Laufende Partien tragen
             * diese Kennung im Stand und verlören sonst ihre Spielart.
             */
            versteckt: true,

            breite: 8,
            hoehe: 8,

            /*
             * Die KLASSISCHE Aufstellung, obwohl sie hier nie gespielt wird:
             * Aus ihr zählt `armeeAnzahl` die gewohnte Armee (16 → 8 Figuren) —
             * genau die Zahl, die diese Spielart in v0.49 und v0.50 hatte. Sie
             * ist ausserdem der Rückfall, falls ein Stand ohne Brett kommt. Das
             * echte Brett rechnet `SCHACH_RUNDE._armeeStand`.
             */
            aufstellung:
                "tsldklst"
                + "bbbbbbbb"
                + "........"
                + "........"
                + "........"
                + "........"
                + "BBBBBBBB"
                + "TSLDKLST",

            /*
             * Keine Rochade: Sie wird aus der STELLUNG gelesen (König auf
             * seinem Startfeld, Turm auf derselben Grundreihe) — bei einer
             * gewürfelten Aufstellung ist das Startfeld des Königs nur noch
             * Zufall, und mit zwei Königen wäre nicht einmal klar, wessen Recht
             * gemeint ist.
             */
            rochade: false,
            koenigSchlagbar: false,

            /* Für Partien, die noch mit dieser Spielart laufen. Neue Partien
               bekommen beides über den Haken, siehe `SCHACH_RUNDE.armeeAn`. */
            koenigeAlsLeben: true,
            zufallsArmee: true,

            bonusFelder: []
        },

        /*
         * DIE DREI KREUZ-BRETTER (seit v0.63, Wunsch #22).
         *
         * Ihre `aufstellung` wird gerechnet statt getippt — bei 14 mal 14 wären
         * das 196 Zeichen von Hand, und der erste Tippfehler fiele erst im
         * Spiel auf. Wie sie aufgebaut sind, steht bei `kreuzAufstellung`.
         *
         * `kreuz: true` ist der Schalter, an dem `SCHACH_RUNDE.kreuzAufstellen`
         * erkennt, dass es die toten Ecken setzen und die Flügel verteilen
         * muss — dieselbe Bauart wie `zufallsArmee`.
         */
        /*
         * DAS GROSSE QUADRATISCHE BRETT (seit v0.70, Wunsch #24).
         *
         * Unter „Quadratisch" standen nur zwei Grössen — das „Große Brett" ist
         * 10 mal 8 und liegt deshalb bei den rechteckigen. Hier ist die dritte:
         * dieselbe Grundreihe wie das grosse, aber quadratisch, mit vier leeren
         * Reihen dazwischen statt vier.
         */
        {
            id: "grossQuadrat",
            titel: "Großes Brett (quadratisch)",
            form: "klassisch",
            beschreibung: "Je zwei Läuferpaare, dazu vier Reihen Anlauf.",
            breite: 10,
            hoehe: 10,
            aufstellung:
                "tslldkllst"
                + "bbbbbbbbbb"
                + ".........."
                + ".........."
                + ".........."
                + ".........."
                + ".........."
                + ".........."
                + "BBBBBBBBBB"
                + "TSLLDKLLST",
            rochade: true,
            koenigSchlagbar: false,
            bonusFelder: []
        },
        {
            id: "kreuzKlein",
            titel: "Kleines Kreuz",
            form: "kreuz",
            beschreibung: "Vier Armeen auf engem Raum — die Flügel sind sofort im Spiel.",
            breite: 10,
            hoehe: 10,
            kreuz: true,
            aufstellung: null,
            rochade: true,
            koenigSchlagbar: false,
            bonusFelder: []
        },
        {
            id: "kreuz",
            titel: "Kreuz",
            form: "kreuz",
            beschreibung: "An jeder der vier Seiten eine volle Armee, in der Mitte das "
                + "gewohnte Feld.",
            breite: 12,
            hoehe: 12,
            kreuz: true,
            aufstellung: null,
            rochade: true,
            koenigSchlagbar: false,
            bonusFelder: []
        },
        {
            id: "kreuzGross",
            titel: "Großes Kreuz",
            form: "kreuz",
            beschreibung: "Das grösste Brett im Spiel — lange Wege, lange Partien.",
            breite: 14,
            hoehe: 14,
            kreuz: true,
            aufstellung: null,
            rochade: true,
            koenigSchlagbar: false,
            bonusFelder: []
        },

        /* ------------------------------------------------------------ *
         * DIESELBEN DREI KREUZE MIT NUR EINER ARMEE JE TEAM (seit v0.72)
         *
         * `kreuzEinzeln` heisst: Von den vier Streifen sind nur ZWEI
         * besetzt, und welche zwei, wird gezogen — gegenüberliegend, damit
         * die Teams sich ansehen. Zwei leere Flügel bleiben als Umweg
         * stehen; das ist der Reiz gegenüber einem gewöhnlichen Brett.
         *
         * Ein König je Team heisst: KEIN `koenigeAlsLeben` — Schach und
         * Matt gelten von der ersten Sekunde an, anders als beim Kreuz mit
         * vier Armeen. Und: Sie stehen am ENDE der Liste (eiserne Regel).
         * ------------------------------------------------------------ */
        {
            id: "kreuzKleinEinzeln",
            titel: "Kleines Kreuz-Duell",
            form: "kreuz",
            beschreibung: "Nur eine Armee je Team; die beiden anderen Streifen bleiben "
                + "leer. Die Startseite wird gezogen.",
            breite: 10,
            hoehe: 10,
            kreuz: true,
            kreuzEinzeln: true,
            aufstellung: null,
            rochade: true,
            koenigSchlagbar: false,
            bonusFelder: []
        },
        {
            id: "kreuzEinzeln",
            titel: "Kreuz-Duell",
            form: "kreuz",
            beschreibung: "12 mal 12 mit einer Armee je Team — das gewohnte "
                + "Kräfteverhältnis auf einem Brett mit zwei leeren Flügeln. Auf "
                + "welcher Seite ihr startet, wird gezogen.",
            breite: 12,
            hoehe: 12,
            kreuz: true,
            kreuzEinzeln: true,
            aufstellung: null,
            rochade: true,
            koenigSchlagbar: false,
            bonusFelder: []
        },
        {
            id: "kreuzGrossEinzeln",
            titel: "Großes Kreuz-Duell",
            form: "kreuz",
            beschreibung: "Weite Wege und zwei leere Flügel, über die man den Gegner "
                + "umgehen kann. Die Startseite wird gezogen.",
            breite: 14,
            hoehe: 14,
            kreuz: true,
            kreuzEinzeln: true,
            aufstellung: null,
            rochade: true,
            koenigSchlagbar: false,
            bonusFelder: []
        }
    ],

    /* ---------------------------------------------------------------- *
     * Die Zufallsarmee (seit v0.49)
     *
     * Nur Zahlen — WIE daraus ein Brett wird, steht in
     * `SCHACH_RUNDE._armeeStand`; hier steht, WAS gezogen wird.
     * ---------------------------------------------------------------- */

    ARMEE: {
        /*
         * WIE VIELE SPALTEN LINKS UND RECHTS FREI BLEIBEN — und damit indirekt,
         * wie viele Figuren eine Seite bekommt (siehe `armeeAnzahl`).
         *
         * Zwei, auf jeder Karte. Auf dem klassischen Brett sind das die
         * 2-mal-2-Ecken aus dem ursprünglichen Wunsch; auf dem kleinen bleibt
         * dadurch genau ein 2-mal-2-Feld in der Mitte, auf dem Doppelbrett ein
         * breiter Streifen. Die Ecke ist das, was die Aufstellung erkennbar
         * macht — deshalb ist SIE fest und die Menge folgt.
         */
        randBreite: 2,

        /*
         * Wie oft eine Seite mit ZWEI Königen startet, in Prozent.
         *
         * Zwei Könige sind zwei Leben und damit der grösste Vorteil, den es
         * hier gibt — dafür fehlt eine Figur, denn die Gesamtzahl bleibt.
         * Selten genug, dass es eine Überraschung ist (etwa jede achte Seite),
         * aber nicht so selten, dass man es nie erlebt.
         */
        zweiKoenige: 12,

        /*
         * Woraus die übrigen Figuren gezogen werden. Summe 100.
         *
         * Die Verteilung folgt dem gewohnten Schach, nur gestaucht: Bauern
         * bleiben das Rückgrat, die Dame ist die Ausnahme. Ohne den hohen
         * Bauernanteil stünden acht Offiziere auf dem Brett, und die Partie
         * wäre nach vier Zügen entschieden.
         */
        figuren: [
            { art: "B", chance: 34 },
            { art: "S", chance: 18 },
            { art: "L", chance: 18 },
            { art: "T", chance: 18 },
            { art: "D", chance: 12 }
        ],

        /*
         * Höchstens so viele Damen je Seite. Ohne diese Grenze zieht eine Seite
         * gelegentlich zwei oder drei — gegen sieben Bauern ist das keine
         * Partie mehr, sondern ein Ergebnis. Was darüber hinaus gezogen wird,
         * wird zum Turm.
         */
        hoechstensDamen: 1
    },

    /*
     * Wie viele Spalten die Armee einnimmt, und wie breit der freie Rand links
     * und rechts ist.
     *
     * DER RAND IST FEST (seit v0.52): bei der Stufe „wenig" bleiben immer zwei
     * Spalten je Seite frei, auf JEDER Karte — auf dem klassischen Brett sind
     * das die 2-mal-2-Ecken, die der Aufstellung ihr Gesicht geben. Die Ecke
     * ist fest, die Menge folgt ihr (nicht umgekehrt: `erkenntnisse.md`).
     *
     * AUF DEM KREUZ ZÄHLT NUR DIE MITTE (seit v0.76).
     *
     * Ein Kreuz-Streifen ist nicht so breit wie das Brett, sondern so breit wie
     * die MITTE (`breite - 2 * KREUZ.rand`) — die vier toten Ecken gehören gar
     * nicht dazu. Rechnete man mit der vollen Breite, stünde die Armee bis in
     * die tote Ecke hinein und der freie Rand wäre weg. Gerechnet wird deshalb
     * mit der Mitte, und `rand` ist danach der Abstand vom BRETTRAND: erst die
     * tote Ecke, dann der freie Rand.
     *
     *     Kleines Kreuz (10)  Mitte 6 → bei „wenig" 2 Spalten, Rand 4
     *     Kreuz (12)          Mitte 8 → bei „wenig" 4 Spalten, Rand 4
     *     Großes Kreuz (14)   Mitte 10 → bei „wenig" 6 Spalten, Rand 4
     *
     * SEIT v0.104 IST DIE BREITE NUR NOCH DIE HALBE ANTWORT.
     *
     * Bis v0.103 unterschieden sich alle vier Stufen ausschliesslich in der
     * BREITE des Blocks; tief war er immer zwei Reihen. „voll" hiess damit
     * „beide Grundreihen ganz gefüllt" — also genau die gewohnte Aufstellung,
     * mehr ging nicht. Der Nutzer hat die Leiter am 20.08. neu gesetzt: Was
     * früher „normal" war, ist jetzt „wenig", was früher „voll" war, ist jetzt
     * „normal", und darüber wächst der Block in die TIEFE.
     *
     * Diese Funktion beantwortet deshalb nur noch die Frage nach der Breite
     * (quer zur Blickrichtung); wie tief es geht, sagt `armeeTiefe`, und
     * zusammengesetzt wird beides in `armeeFelderBlock` — der einen Stelle,
     * aus der auch `armeeAnzahl` ihre Zahl zieht.
     *
     * Zwei Breiten genügen dafür:
     *
     *     `volleBreite: false`   der mittlere Block mit freiem Rand (v0.103
     *                            hiess das „normal", heute „wenig")
     *     `volleBreite: true`    die ganze nutzbare Reihe
     */
    armeeSpalten(variante, staerkeId) {
        const rand = SCHACH_VARIANTEN.ARMEE.randBreite;
        const ecke = variante.kreuz ? SCHACH_VARIANTEN.KREUZ.rand : 0;
        const nutzbar = variante.breite - 2 * ecke;

        /* Mindestens eine Spalte, sonst stünde auf einem sehr schmalen Brett
           gar nichts — dann schrumpft eben der Rand. */
        const grund = Math.max(1, nutzbar - 2 * rand);
        const staerke = SCHACH_VARIANTEN.armeeStaerkeVon(staerkeId);
        const spalten = staerke.volleBreite ? nutzbar : grund;

        return {
            spalten: spalten,
            rand: ecke + Math.floor((nutzbar - spalten) / 2)
        };
    },

    /*
     * WIE VIELE REIHEN TIEF DER BLOCK STEHT (seit v0.104).
     *
     * Zwei Reihen sind die gewohnte Aufstellung (Grundreihe plus Bauern), drei
     * die Stufe „viel". Bei „voll" gibt es keine feste Zahl: Dort füllt jede
     * Seite bis zur Mitte, und wo die Mitte liegt, entscheidet `naechsteSeite`.
     * Die Kante des Bretts ist dabei die einzige Grenze, die es braucht.
     */
    armeeTiefe(variante, staerkeId) {
        const staerke = SCHACH_VARIANTEN.armeeStaerkeVon(staerkeId);

        if (staerke.tiefe === "bisMitte") {
            return Math.max(variante.breite, variante.hoehe);
        }

        return staerke.tiefe;
    },

    /*
     * MIT WELCHEN SEITEN SICH DER BLOCK EINER SEITE DIE FELDER TEILT.
     *
     * Auf jedem gewöhnlichen Brett sind das oben und unten, auf dem vollen
     * Kreuz alle vier Fronten. Beim KREUZ-DUELL (`kreuzEinzeln`, seit v0.72)
     * stehen nur zwei Armeen auf dem Brett, und zwar einander gegenüber — dann
     * konkurrieren auch nur diese beiden. Zählte man dort die leeren Flügel
     * mit, gewönnen sie die Eckfelder der Diagonalen, und beiden Armeen fehlte
     * mitten in der vordersten Reihe ein Bauer.
     *
     * Welche zwei Seiten eine Duell-Partie wirklich benutzt, entscheidet erst
     * die Partie-Kennung (`SCHACH_RUNDE.kreuzAufstellen`). Für die FORM des
     * Blocks ist das gleichgültig: Jedes gegenüberliegende Paar ergibt
     * dieselbe Aufstellung, nur gedreht.
     */
    armeeSeitenVon(variante, seite) {
        if (!variante.kreuz) {
            return ["oben", "unten"];
        }

        if (variante.kreuzEinzeln) {
            const gegen = {
                oben: "unten", unten: "oben", links: "rechts", rechts: "links"
            };
            const eine = gegen[seite] ? seite : "unten";

            return [eine, gegen[eine]];
        }

        return SCHACH_VARIANTEN.KREUZ.seiten.slice();
    },

    /*
     * DAS 2-MAL-2-FELD IN DER MITTE BLEIBT IMMER FREI (seit v0.104).
     *
     * Nutzer-Ansage zur Stufe „voll": „In der Mitte soll nur noch ein 2x2-Feld
     * frei bleiben, der Rest wird mit Truppen gefüllt." Die Aussparung gilt
     * nicht nur dort, sondern für JEDEN Block — bei „wenig" und „normal" ist
     * sie ohnehin weit weg, auf dem kleinen Brett verhindert sie bei „viel",
     * dass sich die beiden Bauernreihen lückenlos berühren und gar nichts mehr
     * geht.
     *
     * Gerechnet mit `floor`/`ceil`, damit auch ein Brett mit ungerader Kante
     * eine Antwort bekäme: Dort ist es dann eine einzelne Reihe oder Spalte.
     */
    armeeMitteFrei(variante, reihe, spalte) {
        const mitteReihe = [Math.floor((variante.hoehe - 1) / 2),
            Math.ceil((variante.hoehe - 1) / 2)];
        const mitteSpalte = [Math.floor((variante.breite - 1) / 2),
            Math.ceil((variante.breite - 1) / 2)];

        return mitteReihe.indexOf(reihe) !== -1
            && mitteSpalte.indexOf(spalte) !== -1;
    },

    /*
     * WEM EIN FELD GEHÖRT: der Seite, die ihm am nächsten liegt (seit v0.104).
     *
     * Solange ein Block zwei Reihen tief ist, stellt sich die Frage nicht —
     * die Fronten sind weit auseinander. Ab „viel" berühren sie sich: Auf dem
     * Kreuz greifen der obere und der linke Arm nach demselben Feld, auf jedem
     * Brett laufen bei „voll" beide Seiten in der Mitte zusammen. Ohne eine
     * eindeutige Antwort stünden dort zwei Figuren auf einem Feld, und wer
     * zuletzt schreibt, gewinnt — genau die Sorte Fehler, die das Projekt
     * schon zweimal hatte.
     *
     * BEI GLEICHSTAND GEWINNT DIE IM UHRZEIGERSINN FOLGENDE SEITE. Das ist
     * nicht Geschmack, sondern Gerechtigkeit: Die Regel dreht sich mit dem
     * Brett, also bekommt jede der vier Seiten genau eine ihrer beiden
     * Diagonalen. Jede andere Wahl (immer „oben", immer die erste in der
     * Liste) gäbe einer Seite mehr Figuren als der anderen — beim ersten
     * Versuch stand es deshalb 35 zu 33 auf dem kleinen Kreuz.
     *
     * DIE REIHENFOLGE STEHT HIER UND NICHT IN `KREUZ.seiten`: Jene Liste ist
     * nach Gegenüber sortiert (oben, unten, links, rechts) und taugt als Uhr
     * nicht. Wer sie hier einsetzt, bekommt genau die schiefe Verteilung, die
     * dieser Absatz verhindern soll.
     *
     * WELCHE SEITEN ÜBERHAUPT MITBIETEN, sagt `armeeSeitenVon` — beim
     * Kreuz-Duell sind es nur zwei.
     */
    armeeNaechsteSeite(variante, reihe, spalte, seiten) {
        const uhr = ["oben", "rechts", "unten", "links"];
        const abstand = {
            oben: reihe,
            unten: variante.hoehe - 1 - reihe,
            links: spalte,
            rechts: variante.breite - 1 - spalte
        };

        let beste = null;

        for (const seite of seiten) {
            if (beste === null || abstand[seite] < abstand[beste]) {
                beste = seite;
                continue;
            }

            if (abstand[seite] === abstand[beste]
                && (uhr.indexOf(beste) + 1) % uhr.length === uhr.indexOf(seite)) {

                beste = seite;
            }
        }

        return beste;
    },

    /*
     * DIE FELDER EINER SEITE — mit ihrer TIEFE, äussere Reihe zuerst.
     *
     * Die EINE Stelle, an der eine Aufstellung entsteht: Sowohl die
     * Zufallsarmee (`SCHACH_RUNDE._armeeStand`) als auch die feste Aufstellung
     * (`SCHACH_RUNDE.aufstellungAnpassen`) und die angekündigte Zahl
     * (`armeeAnzahl`) lesen hier. Zwei getrennte Rechnungen für dieselbe Sache
     * liefen im Projekt schon zweimal auseinander (v0.86 und v0.99).
     *
     * Die TIEFE je Feld steht mit im Ergebnis, weil sie sagt, WAS dort steht:
     * 0 ist die Grundreihe, danach kommt die Offiziersreihe, davor die Bauern.
     * Wer sie nachrechnen müsste, rechnete die zweite Wahrheit.
     *
     * Die äussere Reihe steht zuerst — daran hängt die Zufallsarmee, die ihre
     * zuerst gezogenen Figuren nach hinten stellt.
     */
    armeeFelderBlock(variante, seite, staerkeId) {
        const felder = [];
        const seiten = SCHACH_VARIANTEN.armeeSeitenVon(variante, seite);

        if (seiten.indexOf(seite) === -1) {
            return felder;
        }

        const platz = SCHACH_VARIANTEN.armeeSpalten(variante, staerkeId);
        const grenze = SCHACH_VARIANTEN.armeeTiefe(variante, staerkeId);
        const senkrecht = (seite === "oben" || seite === "unten");

        for (let tiefe = 0; tiefe < grenze; tiefe++) {
            for (let schritt = 0; schritt < platz.spalten; schritt++) {
                const quer = platz.rand + schritt;

                const reihe = senkrecht
                    ? ((seite === "oben") ? tiefe : variante.hoehe - 1 - tiefe)
                    : quer;
                const spalte = senkrecht
                    ? quer
                    : ((seite === "links") ? tiefe : variante.breite - 1 - tiefe);

                if (reihe < 0 || reihe >= variante.hoehe) {
                    continue;
                }
                if (spalte < 0 || spalte >= variante.breite) {
                    continue;
                }
                if (SCHACH_VARIANTEN.armeeMitteFrei(variante, reihe, spalte)) {
                    continue;
                }
                if (SCHACH_VARIANTEN.armeeNaechsteSeite(
                    variante, reihe, spalte, seiten) !== seite) {

                    continue;
                }

                felder.push({
                    feld: reihe * variante.breite + spalte,
                    tiefe: tiefe
                });
            }
        }

        return felder;
    },

    /*
     * WIE VIELE FIGUREN EINE SEITE BEKOMMT.
     *
     * Ein Feld, eine Figur — die Zahl ist nicht gewählt, sie fällt aus dem
     * Block (`armeeFelderBlock`). Auf dem klassischen Brett sind das 8, 16, 24
     * und 30 Figuren, von „wenig" bis „voll". Die Stärke ist WAHLFREI und ohne
     * Angabe „normal".
     *
     * Nie unter 2: Eine Seite braucht ihren König und wenigstens eine Figur
     * daneben. Die Zahl wirkt VOR dem Bauen der Figurenliste, nie danach —
     * `_armeeFiguren` mischt, ein nachträgliches Abschneiden könnte also den
     * König treffen.
     */
    /*
     * SEIT v0.99 IST DAS DIESELBE RECHNUNG WIE DIE FELDER — und das ist der
     * ganze Punkt: Vorher rechnete diese Funktion mit dem Anteil weiter,
     * während die Feldzahl fest blieb; was nicht hinpasste, fiel beim
     * Aufstellen weg, und die Zahl unter der Kachel log.
     *
     * Seit v0.104 wird nicht einmal mehr nachgerechnet, sondern GEZÄHLT: Die
     * Zahl ist die Länge der Feldliste. Zwei Zahlen für dieselbe Sache laufen
     * auseinander — hier taten sie es ab dem ersten Knopfdruck über „normal".
     *
     * Auf dem Kreuz ist das die Zahl je STARTSEITE (seit v0.76), nicht je
     * Team: Wer zwei Streifen bekommt, hat am Ende doppelt so viele Figuren.
     * Alle vier Seiten sind gleich gross, deshalb genügt eine.
     */
    armeeAnzahl(variante, staerkeId) {
        return Math.max(2,
            SCHACH_VARIANTEN.armeeFelderBlock(variante, "unten", staerkeId).length);
    },

    /*
     * DIE VIER STÄRKEN DER ARMEE (seit v0.86, neu gesetzt in v0.104).
     *
     * Aufgebaut wie `LOOTBOX_MENGEN` — dieselbe Knopfreihe, dieselbe Bedienung.
     * Genannt wird keine feste Zahl, sondern eine Form: Die Bretter sind
     * unterschiedlich gross, eine „8" wäre auf dem kleinen Brett unmöglich und
     * auf dem Doppelbrett mickrig. Was am Ende herauskommt, steht als echte
     * Zahl unter jeder Spielart-Kachel.
     *
     * DIE LEITER IST AM 20.08.2026 UM ZWEI STUFEN VERSCHOBEN WORDEN
     * (Nutzer-Ansage). Was bis v0.103 „normal" hiess, heisst jetzt „wenig";
     * was „voll" hiess — die gewohnte Aufstellung mit beiden Grundreihen —,
     * heisst jetzt „normal". Darüber wächst der Block nicht mehr in die
     * Breite (dort ist der Rand erreicht), sondern in die TIEFE:
     *
     *     wenig    2 Reihen, mittlerer Block      (bis v0.103: „normal")
     *     normal   2 Reihen, ganze Breite         (bis v0.103: „voll")
     *     viel     3 Reihen: Bauern eine vor, dazwischen die Offiziersreihe
     *     voll     bis zur Mitte — frei bleibt nur das 2-mal-2-Feld
     *
     * Laufende Partien merken davon nichts: Ihr Brett steht im Stand und wird
     * nie neu gerechnet. Wer eine solche Partie NEU AUFSTELLT, bekommt die
     * neue Bedeutung ihrer Stufe — das ist eine bewusste Handlung.
     */
    ARMEE_STAERKEN: [
        {
            id: "wenig",
            titel: "wenig",
            volleBreite: false,
            tiefe: 2,
            hinweis: "Nur der mittlere Block der beiden Grundreihen — kurze, "
                + "offene Partien."
        },
        {
            id: "normal",
            titel: "normal",
            volleBreite: true,
            tiefe: 2,
            hinweis: "Die gewohnte Aufstellung: Grundreihe und Bauernreihe "
                + "ganz gefüllt."
        },
        {
            id: "viel",
            titel: "viel",
            volleBreite: true,
            tiefe: 3,
            hinweis: "Eine Reihe mehr: Die Bauern rücken vor, dahinter kommt "
                + "eine Reihe Springer, Läufer und Türme dazu."
        },
        {
            id: "voll",
            titel: "voll",
            volleBreite: true,
            tiefe: "bisMitte",
            hinweis: "Alles voll bis zur Mitte — frei bleibt nur ein "
                + "2-mal-2-Feld in der Brettmitte."
        }
    ],

    /* Ohne Angabe „normal" — die Zahl, die vor v0.86 galt. */
    armeeStaerkeVon(id) {
        return SCHACH_VARIANTEN.ARMEE_STAERKEN.find((eintrag) => eintrag.id === id)
            || SCHACH_VARIANTEN.ARMEE_STAERKEN.find((eintrag) => eintrag.id === "normal");
    },

    /* Zieht eine Figur der Zufallsarmee. `wert` ist eine Zahl von 0 bis 1. */
    armeeFigurZiehen(wert) {
        let rest = Math.min(Math.max(wert, 0), 0.999999) * 100;

        for (const eintrag of SCHACH_VARIANTEN.ARMEE.figuren) {
            if (rest < eintrag.chance) {
                return eintrag.art;
            }
            rest -= eintrag.chance;
        }

        return "B";
    },

    /* Die Variante zu einer Kennung; unbekannte Kennungen ergeben die klassische. */
    holen(id) {
        const gefunden = SCHACH_VARIANTEN.liste.find((eintrag) => eintrag.id === id);
        return gefunden || SCHACH_VARIANTEN.liste[0];
    },

    /*
     * Die Spielarten, die beim Anlegen zur Auswahl stehen. Versteckte sind
     * weiterhin gültig (laufende Partien!), tauchen hier aber nicht auf.
     */
    zurAuswahl() {
        return SCHACH_VARIANTEN.liste.filter((eintrag) => !eintrag.versteckt);
    },

    /* Gibt es diese Kennung? */
    gibtEs(id) {
        return SCHACH_VARIANTEN.liste.some((eintrag) => eintrag.id === id);
    },

    /* Titel einer Fähigkeit, für den Bildschirm. */
    faehigkeitTitel(art) {
        const eintrag = SCHACH_VARIANTEN.FAEHIGKEITEN[art];
        return eintrag ? eintrag.titel : "";
    },

    faehigkeitBeschreibung(art) {
        const eintrag = SCHACH_VARIANTEN.FAEHIGKEITEN[art];
        return eintrag ? eintrag.beschreibung : "";
    },

    /*
     * DERSELBE TEXT IN EINEM SATZ (seit v0.94).
     *
     * Gebraucht überall dort, wo kein Platz für die ganze Beschreibung ist:
     * im Kurzhinweis der Maus (dem `title`-Attribut) und als Einstieg im
     * Einsetzen-Fenster, über den Bildern.
     *
     * WARUM GERECHNET UND NICHT ZWEITER TEXT JE FÄHIGKEIT: Zwei Texte laufen
     * auseinander — der kurze wird beim Ändern einer Regel vergessen, und dann
     * sagt die Maus etwas anderes als das Fenster. Der erste Satz einer
     * Beschreibung sagt ohnehin, WAS die Fähigkeit tut; alles danach sind
     * Bedingungen und Feinheiten. Nachgemessen über alle 21 Fähigkeiten: 62
     * bis 179 Zeichen, im Mittel 110 — bei der Mauer 113 statt 668.
     *
     * Der Punkt zählt nur als Satzende, wenn ein Leerzeichen oder das
     * Textende folgt; sonst zerschnitte „2×2-Feld" oder eine Abkürzung den
     * Satz mittendrin.
     */
    faehigkeitKurz(art) {
        const voll = SCHACH_VARIANTEN.faehigkeitBeschreibung(art);
        const treffer = voll.match(/^[\s\S]*?[.!?](\s|$)/);

        return (treffer ? treffer[0] : voll).trim();
    },

    /*
     * TRÄGT DIESE FÄHIGKEIT DAS PLUSZEICHEN? (seit v0.58 an einer Stelle)
     *
     * Das Zeichen sagt: „Danach bleibt dir dein normaler Zug." Drei Schalter
     * nehmen es weg, und alle drei aus demselben Grund — es bliebe kein Zug:
     *
     *     beendetZug      danach ist der Gegner dran
     *     istDerZug       die Fähigkeit IST der Zug (Sprung, Teleport)
     *     nurImGegenzug   man ist gar nicht am Zug (Ausweichen, seit v0.58)
     *
     * Gefragt wird die FÄHIGKEIT, nicht der Spielstand (seit v0.48) — das
     * Zeichen soll ein Merkmal sein, an dem man sie wiedererkennt, und nichts,
     * was flackert. Was gerade wirklich geht, sagt `SCHACH_RUNDE.behaeltZug`.
     *
     * Die Frage stand bis v0.57 an zwei Stellen im Bildschirm-Code (Vorrat und
     * Bibliothek) und wäre beim nächsten Schalter an einer davon vergessen
     * worden.
     */
    zeigtPlus(art) {
        const eintrag = SCHACH_VARIANTEN.FAEHIGKEITEN[art];

        return !!eintrag && !eintrag.beendetZug && !eintrag.istDerZug
            && !eintrag.nurImGegenzug;
    },

    /*
     * Die Stufe einer Fähigkeit, oder eine neutrale als Rückfall.
     *
     * Der Rückfall trägt auch die Partien, in denen die Seltenheit verborgen
     * bleibt: Dort wird ohne Kennung gefragt, und der Würfel bekommt ein
     * unauffälliges Grau, das zu keiner Stufe gehört.
     */
    /*
     * `regenbogen` seit v0.69 (Wunsch #26): Eine Lootbox, deren Seltenheit
     * verborgen bleibt, war grau und sah damit nach nichts aus. Jetzt schillert
     * sie — auf Ansage „wie aus Mario Kart".
     *
     * WICHTIG: Es ist für JEDE verborgene Lootbox derselbe Verlauf. Ein Zufall
     * je Box oder gar eine Farbe je Stufe würde genau das verraten, was der
     * Haken verbergen soll. Das Grau bleibt als Rückfall stehen, falls jemand
     * die Farbe ohne den Verlauf braucht.
     */
    STUFE_UNBEKANNT: {
        id: "unbekannt",
        titel: "Unbekannt",
        chance: 0,
        farbe: "#8a919b",
        regenbogen: ["#e04b4b", "#e0a800", "#2e9e52", "#2f7fd0", "#8b46c8"]
    },

    stufeVon(art) {
        const eintrag = SCHACH_VARIANTEN.FAEHIGKEITEN[art];
        if (!eintrag) {
            return SCHACH_VARIANTEN.STUFE_UNBEKANNT;
        }
        return SCHACH_VARIANTEN.STUFEN.find((stufe) => stufe.id === eintrag.stufe)
            || SCHACH_VARIANTEN.STUFEN[0];
    },

    /*
     * Die ERREICHBAREN Fähigkeiten einer Stufe, in fester Reihenfolge.
     *
     * VERSTECKTE ZÄHLEN NICHT MIT (seit v0.78, `versteckt: true` — bisher nur
     * Ausweichen). Diese eine Liste beantwortet vier Fragen auf einmal, und
     * alle vier meinen dasselbe „was kann man bekommen":
     *
     *   `faehigkeitAusStufe`      was eine Lootbox auswerfen darf
     *   `chanceVon`               wie wahrscheinlich eine einzelne ist
     *   `stufenErklaerung`        was hinter dem i steht
     *   die Fähigkeiten-Bibliothek (`team-schach-auswertung.js`)
     *
     * Deshalb wird hier gefiltert und nicht an vier Stellen: Eine versteckte
     * Fähigkeit, die in der Bibliothek steht oder in die Prozentrechnung
     * eingeht, ist ein Versprechen, das die Lootbox nicht mehr einlöst.
     *
     * `SCHACH_VARIANTEN.FAEHIGKEITEN` bleibt daneben die VOLLSTÄNDIGE Tabelle.
     * Wer eine versteckte Fähigkeit im Vorrat hat, kann sie unverändert
     * einsetzen — `normalisieren` behält sie, `darfEinsetzen` erlaubt sie, ihre
     * Marke am Bildschirm zeigt Beschreibung und Anleitung wie immer. Dieselbe
     * Aufteilung wie bei den Spielarten: `liste` ist vollständig,
     * `zurAuswahl()` filtert, `holen()` findet weiterhin alles.
     */
    /*
     * DIE FÄHIGKEITEN EINER STUFE — die EINE Stelle, die filtert.
     *
     * `erlaubt` ist wahlfrei (seit v0.87, Wunsch V3/R5): die Liste der Arten,
     * die es IN DIESER PARTIE überhaupt gibt. Ohne Angabe zählen alle — damit
     * liefert jeder Aufruf von früher unverändert dasselbe, und wer keine
     * Partie zur Hand hat (Bibliothek ohne Partie, Tests), sieht das volle
     * Angebot.
     *
     * Dass hier gefiltert wird und nicht an vier Stellen, ist Absicht: Ziehung,
     * Prozentrechnung, Erklärtext und Bibliothek hängen alle an dieser
     * Funktion. Wer eine fünfte Verwendung baut, erbt den Filter mit.
     */
    faehigkeitenDerStufe(stufeId, erlaubt) {
        const nurDiese = Array.isArray(erlaubt) ? erlaubt : null;

        return Object.keys(SCHACH_VARIANTEN.FAEHIGKEITEN)
            .filter((art) => SCHACH_VARIANTEN.FAEHIGKEITEN[art].stufe === stufeId
                && !SCHACH_VARIANTEN.FAEHIGKEITEN[art].versteckt
                && (nurDiese === null || nurDiese.indexOf(art) !== -1))
            .sort();
    },

    /*
     * DIE VIER GRÖSSEN DES ITEM-VORRATS (seit v0.87, Wunsch R5/V3).
     *
     * „Ein Unter-Spielmodus, wo am Anfang zufällig gewählt wird, welche Items
     * es gibt — nicht alle, sondern nur eine Handvoll."
     *
     * `anzahl: 0` heisst „alle" — die Vorgabe, also das Spiel wie vor v0.87.
     * Die Zahlen sind Wünsche, keine Zusagen: Gibt es weniger Fähigkeiten als
     * verlangt, kommen eben alle vor.
     */
    ITEM_VORRAETE: [
        {
            id: "wenig",
            titel: "wenig",
            anzahl: 5,
            hinweis: "Fünf Items — man lernt sie schnell."
        },
        /*
         * ES GAB EINE STUFE „10" (v0.87 bis v0.104). Sie ist auf Nutzer-Ansage
         * vom 21.08.2026 raus: Zwischen „wenig" (5) und „viele" (15) war sie
         * eine Zahl ohne eigenen Charakter, und vier Knöpfe passten nicht
         * nebeneinander. Laufende Partien merken davon nichts — ihr Vorrat
         * steht als fertige Liste in `regeln.itemPool`, gezogen wird er nur
         * einmal beim Anlegen. Ein gespeichertes „zehn" liest
         * `itemVorratVon` als „alle"; das ändert an ihrem Brett nichts.
         */
        {
            id: "viele",
            titel: "viele",
            /*
             * FÜNFZEHN, NICHT ZWANZIG. Es gibt derzeit 19 sichtbare
             * Fähigkeiten — mit 20 wäre diese Stufe stillschweigend dasselbe
             * wie „alle" gewesen, also ein Knopf ohne Wirkung. Wer Fähigkeiten
             * ergänzt, darf die Zahl mit anheben; ein Test besteht nur darauf,
             * dass jede Stufe weniger liefert als die darüber.
             */
            anzahl: 15,
            hinweis: "Fünfzehn Items — Abwechslung, aber nicht alles."
        },
        /*
         * SELBST WÄHLEN (seit v0.100, Nutzer-Wunsch: „und selbst auswählen,
         * dann kommt die Liste der Items, welche man anhaken kann —
         * mindestens ein Item").
         *
         * Die einzige Stufe, die keine ZAHL ist: Der Vorrat wird nicht
         * gezogen, sondern übernommen (`regeln.itemAuswahl`). `anzahl: 0`
         * heisst deshalb hier nicht „alle", sondern „wird nicht gelost" —
         * darüber entscheidet allein `eigeneWahl`.
         *
         * Sie steht ANS ENDE der Liste, hinter „alle": Die Reihe ist von wenig
         * nach viel sortiert, und die eigene Wahl ist keine Menge.
         */
        {
            id: "alle",
            titel: "alle",
            anzahl: 0,
            hinweis: "Alles, was es gibt — nichts wird ausgelost."
        },
        {
            id: "auswahl",
            titel: "selbst wählen",
            anzahl: 0,
            eigeneWahl: true,
            hinweis: "Du stellst die Liste selbst zusammen — mindestens ein Item."
        }
    ],

    /* Ohne Angabe „alle" — der Zustand vor v0.87. */
    itemVorratVon(id) {
        return SCHACH_VARIANTEN.ITEM_VORRAETE.find((eintrag) => eintrag.id === id)
            || SCHACH_VARIANTEN.ITEM_VORRAETE.find((eintrag) => eintrag.id === "alle");
    },

    /*
     * Welche STUFE zieht dieser Wert? Der Rest, der nach dem Abzug der
     * durchlaufenen Stufen bleibt, wird als Anteil von 0 bis 1 mitgeliefert —
     * damit genügt EIN Zufallswert für beide Ziehungen, und die Rechnung
     * bleibt nachrechenbar.
     */
    stufeZiehen(wert, gewichte) {
        /*
         * `gewichte` ist wahlfrei (siehe `stufenGewichte`). Ohne Angabe zählt
         * jede Stufe mit ihrer festen Chance — genau wie vor v0.41, damit ein
         * Aufruf von aussen unverändert dasselbe liefert.
         */
        const chancen = SCHACH_VARIANTEN.STUFEN.map((stufe) => {
            const gewicht = (gewichte && typeof gewichte[stufe.id] === "number")
                ? Math.max(gewichte[stufe.id], 0) : 1;
            return stufe.chance * gewicht;
        });

        const summe = chancen.reduce((teil, einzeln) => teil + einzeln, 0);
        if (summe <= 0) {
            return { stufe: SCHACH_VARIANTEN.STUFEN[0], anteil: 0 };
        }

        let rest = Math.min(Math.max(wert, 0), 0.999999) * summe;

        for (let stelle = 0; stelle < SCHACH_VARIANTEN.STUFEN.length; stelle++) {
            if (rest < chancen[stelle]) {
                return {
                    stufe: SCHACH_VARIANTEN.STUFEN[stelle],
                    anteil: rest / chancen[stelle]
                };
            }
            rest -= chancen[stelle];
        }

        /* Kann nur passieren, wenn die Summe durch Rundung knapp verfehlt wird. */
        return { stufe: SCHACH_VARIANTEN.STUFEN[0], anteil: 0 };
    },

    /*
     * Zieht eine Fähigkeit AUS EINER STUFE — und zwar so, dass Wiederholungen
     * seltener werden.
     *
     * `vorrat` ist die Liste der Fähigkeiten, die diese Seite schon hat. Jedes
     * Exemplar drückt das Gewicht seiner Fähigkeit auf `stufe.wiederholung`
     * (siehe STUFEN). Beispiel Gewöhnlich mit drei Fähigkeiten: Wer „Sprung"
     * schon zweimal hat, zieht ihn mit 0,15 mal 0,15 = 0,0225 gegen 1 und 1 —
     * also mit gut einem Prozent statt mit einem Drittel.
     *
     * Ohne Vorrat ist das Ergebnis dasselbe wie vorher: Alle Gewichte sind 1,
     * die Verteilung damit gleichmässig.
     */
    faehigkeitAusStufe(stufeId, wert, vorrat, erlaubt) {
        const arten = SCHACH_VARIANTEN.faehigkeitenDerStufe(stufeId, erlaubt);
        if (arten.length === 0) {
            return "";
        }

        const stufe = SCHACH_VARIANTEN.STUFEN.find((eintrag) => eintrag.id === stufeId);
        const daempfung = (stufe && typeof stufe.wiederholung === "number")
            ? stufe.wiederholung : 1;
        const schon = Array.isArray(vorrat) ? vorrat : [];

        const gewichte = arten.map((art) => Math.pow(daempfung,
            schon.filter((eintrag) => eintrag === art).length));
        const summe = gewichte.reduce((teil, einzeln) => teil + einzeln, 0);

        if (summe <= 0) {
            return arten[0];
        }

        let rest = Math.min(Math.max(wert, 0), 0.999999) * summe;

        for (let stelle = 0; stelle < arten.length; stelle++) {
            if (rest < gewichte[stelle]) {
                return arten[stelle];
            }
            rest -= gewichte[stelle];
        }

        return arten[arten.length - 1];
    },

    /*
     * Zieht eine Fähigkeit aus einem Wert zwischen 0 und 1: erst die Stufe
     * nach ihrer Chance, dann innerhalb der Stufe.
     *
     * Wird seit v3.6 nur noch dort gebraucht, wo kein Vorrat bekannt ist. Beim
     * Einsammeln geht das Spiel den Weg über `stufeZiehen` und
     * `faehigkeitAusStufe`, damit die Dämpfung greifen kann.
     */
    faehigkeitZiehen(wert, vorrat) {
        const gezogen = SCHACH_VARIANTEN.stufeZiehen(wert);
        return SCHACH_VARIANTEN.faehigkeitAusStufe(
            gezogen.stufe.id, gezogen.anteil, vorrat);
    },

    /*
     * Die Chance einer einzelnen Fähigkeit in Prozent.
     *
     * Eine VERSTECKTE erscheint nicht mehr — ihre Chance ist deshalb 0 und
     * nicht etwa der Anteil, den sie hätte. Ohne diese Zeile käme für sie der
     * Wert der noch erreichbaren heraus, weil sie im Nenner gar nicht mehr
     * steht: eine Zahl, die niemandem gehört.
     */
    chanceVon(art, erlaubt) {
        const eintrag = SCHACH_VARIANTEN.FAEHIGKEITEN[art];
        if (eintrag && eintrag.versteckt) {
            return 0;
        }

        /* Was es in dieser Partie nicht gibt, hat auch keine Chance (v0.87). */
        if (Array.isArray(erlaubt) && erlaubt.indexOf(art) === -1) {
            return 0;
        }

        const stufe = SCHACH_VARIANTEN.stufeVon(art);
        const anzahl = SCHACH_VARIANTEN.faehigkeitenDerStufe(stufe.id, erlaubt).length;
        return anzahl > 0 ? (stufe.chance / anzahl) : 0;
    },

    /*
     * Alle Fähigkeiten im Wortlaut, für den i-Knopf.
     *
     * Erzeugt aus denselben Angaben, mit denen gerechnet wird — die angezeigte
     * Chance kann deshalb nicht von der gezogenen abweichen. Dieselbe Regel wie
     * bei den Punkten im Würfel-Quizz.
     */
    /*
     * Der Satz zur Abklingzeit einer Stufe — leer, wenn sie keine hat.
     *
     * Er steht hier und nicht im Bildschirm-Code, weil er dieselben Zahlen
     * nennt, mit denen `stufenGewichte` rechnet. Haus-Regel: Eine Regel steht
     * genau einmal, und der Erklärtext gehört dazu.
     */
    abklingenErklaerung(stufeId) {
        const stufe = SCHACH_VARIANTEN.STUFEN.find((eintrag) => eintrag.id === stufeId);
        if (!stufe || !stufe.abklingen) {
            return "";
        }

        const anteil = Math.round(stufe.abklingen.gewicht * 100);

        return "Abklingzeit: Direkt nach einer Lootbox dieser Stufe zählt sie "
            + "nur noch " + anteil + " Prozent und braucht "
            + stufe.abklingen.halbzuege + " Halbzüge bis zurück auf voll — so "
            + "kommen nicht mehrere gleiche hintereinander.\n\n";
    },

    /* Die Zahlen zu einer Stufe — hinter dem i an ihrer Überschrift. */
    stufenErklaerung(stufeId) {
        const stufe = SCHACH_VARIANTEN.STUFEN.find((eintrag) => eintrag.id === stufeId);
        if (!stufe) {
            return "";
        }

        const arten = SCHACH_VARIANTEN.faehigkeitenDerStufe(stufe.id);
        const einzeln = SCHACH_VARIANTEN.chanceVon(arten[0] || "").toFixed(1).replace(".", ",");

        return stufe.chance + " Prozent aller Lootboxen tragen diese Stufe, "
            + "innerhalb der Stufe jede Fähigkeit gleich oft — bei "
            + arten.length + " also je " + einzeln + " Prozent.\n\n"
            + SCHACH_VARIANTEN.abklingenErklaerung(stufe.id)
            + "Jede achte ist eine Unglücks-Lootbox ("
            + SCHACH_VARIANTEN.PECH_CHANCE + " Prozent); sie wirkt sofort gegen "
            + "den, der sie einsammelt.\n\n"
            + "Gewürfelt wird nicht: Feld und Inhalt werden aus dem Spielstand "
            + "gerechnet, damit alle dasselbe Brett sehen.";
    },

    faehigkeitenErklaerung() {
        const anzahl = SCHACH_VARIANTEN.BONUS_ANZAHL
            .map((eintrag) => eintrag.anzahl + " mit " + eintrag.chance + " Prozent")
            .join(", ");

        const stufen = SCHACH_VARIANTEN.LOOTBOX_MENGEN
            .map((menge) => menge.titel)
            .join(" / ");

        let text = "Auf freien Feldern erscheinen Lootboxen — meist eine, manchmal "
            + "mehr (" + anzahl + "). Wie oft, sagt die beim Anlegen gewählte "
            + "Stufe (" + stufen + "). Wer mit einer Figur darauf zieht, sammelt "
            + "die Fähigkeit für sein Team ein; liegen gelassene bleiben liegen.\n\n"
            + "Welche es wird, hängt von der Stufe ab:\n";

        for (const stufe of SCHACH_VARIANTEN.STUFEN) {
            const arten = SCHACH_VARIANTEN.faehigkeitenDerStufe(stufe.id);
            text += "\n" + stufe.titel.toUpperCase() + " — " + stufe.chance + " Prozent"
                + (stufe.abklingen ? ", mit Abklingzeit" : "") + "\n";

            for (const art of arten) {
                const eintrag = SCHACH_VARIANTEN.FAEHIGKEITEN[art];
                text += "  " + eintrag.titel + " ("
                    + SCHACH_VARIANTEN.chanceVon(art).toFixed(1).replace(".", ",")
                    + " Prozent): " + eintrag.beschreibung + "\n";
            }
        }

        text += "\nInnerhalb einer Stufe sind alle gleich wahrscheinlich, und "
            + "gewürfelt wird nicht: Feld und Fähigkeit werden aus dem Spielstand "
            + "gerechnet, damit alle dasselbe Brett sehen. Eine Stufe mit "
            + "Abklingzeit kommt direkt nach einer Lootbox dieser Stufe eine "
            + "Weile seltener.";

        return text;
    }
};

/*
 * DIE AUFSTELLUNG DER KREUZ-BRETTER WIRD HIER NACHGETRAGEN (seit v0.63).
 *
 * Sie steht in der Tabelle oben als `null`, weil eine Methode desselben
 * Objekts sie rechnet — innerhalb der geschweiften Klammern gibt es
 * `SCHACH_VARIANTEN` noch nicht. Von aussen ist es ein Zweizeiler, und die
 * Tabelle bleibt lesbar: 196 Zeichen von Hand getippt hätte niemand geprüft.
 *
 * Nach dieser Zeile trägt jede Spielart eine `aufstellung` wie eh und je —
 * alles, was sie liest (Vorschaubild, `armeeAnzahl`, `SCHACH.neuerStand`),
 * merkt keinen Unterschied.
 */
for (const variante of SCHACH_VARIANTEN.liste) {
    if (variante.kreuz && !variante.aufstellung) {
        variante.aufstellung = SCHACH_VARIANTEN.kreuzAufstellung(
            variante.breite - 2 * SCHACH_VARIANTEN.KREUZ.rand,

            /* Mit nur einer Armee je Team steht in der VORLAGE ein Paar —
               welches die Partie zieht, entscheidet `kreuzAufstellen`. */
            variante.kreuzEinzeln ? ["oben", "unten"] : null);
    }
}

/* Damit die Regressionstests die Datei außerhalb des Browsers laden können. */
if (typeof module !== "undefined" && module.exports) {
    module.exports = SCHACH_VARIANTEN;
}
