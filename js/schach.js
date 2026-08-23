/*
 * schach.js — die reinen Schachregeln.
 *
 * Kein Bildschirm-Code, kein Speicher-Code, keine Teams: nur Brett, Züge und
 * Regeln. Genau deshalb ist diese Datei ohne Browser testbar
 * (tests\test-schach.js).
 *
 * BRETT
 * Das Brett ist eine Zeichenkette aus breite * hoehe Zeichen, Feld 0 ist die
 * linke obere Ecke (a8 auf dem klassischen Brett), das letzte Zeichen die
 * rechte untere. Damit liest sich die Kette wie das Brett von oben nach unten.
 *
 *     GROSSBUCHSTABE = weiss, kleinbuchstabe = schwarz, Punkt = leeres Feld
 *
 *     B/b  Bauer      T/t  Turm       S/s  Springer
 *     L/l  Läufer     D/d  Dame       K/k  König
 *
 * Die Buchstaben sind die deutschen Anfangsbuchstaben — im ganzen Projekt wird
 * deutsch benannt, auch hier.
 *
 * SPIELARTEN
 * Wie groß das Brett ist und welche Sonderregeln gelten, steht NICHT hier,
 * sondern in schach-varianten.js. Jeder Stand trägt seine Spielart mit sich
 * (`variante`), damit die Regeln aus dem Stand allein arbeiten können. Ohne
 * Angabe gilt das klassische Brett — so laufen alle Partien aus der Zeit vor
 * den Spielarten unverändert weiter.
 *
 * STAND (das, was gespeichert wird)
 *
 *     {
 *         "variante": "standard",      // Kennung aus schach-varianten.js
 *         "breite": 8,                 // aus der Variante abgeleitet
 *         "hoehe": 8,
 *         "brett": "tsldklst...",      // breite * hoehe Zeichen
 *         "amZug": "weiss",            // "weiss" | "schwarz"
 *         "rochade": "KDkd",           // welche Rochaden noch erlaubt sind
 *         "enPassant": "",             // Zielfeld wie "e3", sonst ""
 *         "halbzuege": 0,              // seit letztem Schlag oder Bauernzug
 *         "zugNummer": 1,
 *         "extraZug": "",              // Fähigkeit: diese Farbe zieht gleich
 *                                      // noch einmal
 *         "sprungAktiv": ""            // Fähigkeit: diese Farbe darf mit einer
 *                                      // Figur zusätzlich wie ein Springer
 *     }
 */

const SCHACH = {

    WEISS: "weiss",
    SCHWARZ: "schwarz",

    /* Spaltenbuchstaben — reicht bis zu einem Brett mit 16 Spalten. */
    SPALTEN: "abcdefghijklmnop",

    /* Die klassische Grundstellung, Zeile für Zeile von a8 bis h1. */
    GRUNDSTELLUNG:
        "tsldklst"
        + "bbbbbbbb"
        + "........"
        + "........"
        + "........"
        + "........"
        + "BBBBBBBB"
        + "TSLDKLST",

    /* Springer-Sprünge, an mehreren Stellen gebraucht. */
    SPRUENGE: [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]],

    /* ---------------------------------------------------------------- *
     * Maße eines Standes
     *
     * Die Maße stehen im Stand; fehlen sie (alter Stand), gilt 8 mal 8.
     * ---------------------------------------------------------------- */

    breiteVon(stand) {
        return (stand && stand.breite) ? stand.breite : 8;
    },

    hoeheVon(stand) {
        return (stand && stand.hoehe) ? stand.hoehe : 8;
    },

    /* Anzahl der Felder eines Standes. */
    felderVon(stand) {
        return SCHACH.breiteVon(stand) * SCHACH.hoeheVon(stand);
    },

    /* Die Spielart eines Standes, immer eine gültige. */
    varianteVon(stand) {
        return SCHACH_VARIANTEN.holen(stand ? stand.variante : "");
    },

    /* ---------------------------------------------------------------- *
     * Felder und Figuren
     *
     * `breite` und `hoehe` sind wahlfrei; ohne Angabe gilt das klassische
     * Brett. So bleiben alle Aufrufe aus der Zeit vor den Spielarten gültig.
     * ---------------------------------------------------------------- */

    /* "e4" -> Feldnummer. Ungültige Angaben ergeben -1. */
    feldNummer(name, breite, hoehe) {
        const b = breite || 8;
        const h = hoehe || 8;

        if (typeof name !== "string" || name.length !== 2) {
            return -1;
        }
        const spalte = SCHACH.SPALTEN.indexOf(name[0]);
        const ziffer = "123456789".indexOf(name[1]) + 1;

        if (spalte === -1 || spalte >= b || ziffer < 1 || ziffer > h) {
            return -1;
        }
        /* Ziffer 1 ist die unterste Reihe, Reihe 0 ist die oberste. */
        return (h - ziffer) * b + spalte;
    },

    /* Feldnummer -> "e4". */
    feldName(nummer, breite, hoehe) {
        const b = breite || 8;
        const h = hoehe || 8;

        if (!Number.isInteger(nummer) || nummer < 0 || nummer >= b * h) {
            return "";
        }
        return SCHACH.SPALTEN[nummer % b] + String(h - Math.floor(nummer / b));
    },

    spalteVon(feld, breite) {
        return feld % (breite || 8);
    },

    reiheVon(feld, breite) {
        return Math.floor(feld / (breite || 8));
    },

    /* Farbe der Figur auf einem Feld, oder "" wenn leer. */
    farbeVon(figur) {
        if (!figur || figur === ".") {
            return "";
        }
        return (figur === figur.toUpperCase()) ? SCHACH.WEISS : SCHACH.SCHWARZ;
    },

    /* Figurenart ohne Farbe, immer als Grossbuchstabe. */
    artVon(figur) {
        if (!figur || figur === ".") {
            return "";
        }
        return figur.toUpperCase();
    },

    gegner(farbe) {
        return (farbe === SCHACH.WEISS) ? SCHACH.SCHWARZ : SCHACH.WEISS;
    },

    /* Ausgeschriebener Name einer Figurenart, für Meldungen. */
    artName(art) {
        const namen = {
            "B": "Bauer", "T": "Turm", "S": "Springer",
            "L": "Läufer", "D": "Dame", "K": "König"
        };
        return namen[art] || "";
    },

    /* ---------------------------------------------------------------- *
     * Stand
     * ---------------------------------------------------------------- */

    /*
     * Alle Türme, die in der Startaufstellung auf einer Grundreihe stehen.
     * Aus der Aufstellung gelesen, damit eine neue Spielart nichts weiter
     * angeben muss als ihr Brett.
     */
    _turmStartfelder(variante) {
        if (!variante.rochade) {
            return [];
        }

        const felder = [];
        const letzte = variante.hoehe - 1;

        for (let spalte = 0; spalte < variante.breite; spalte++) {
            const oben = spalte;
            const unten = letzte * variante.breite + spalte;

            if (variante.aufstellung[oben] === "t") {
                felder.push(oben);
            }
            if (variante.aufstellung[unten] === "T") {
                felder.push(unten);
            }
        }

        return felder;
    },

    /* Alle Könige, die in der Startaufstellung auf einer Grundreihe stehen. */
    _koenigStartfelder(variante) {
        if (!variante.rochade) {
            return [];
        }

        const felder = [];
        const letzte = variante.hoehe - 1;

        for (let spalte = 0; spalte < variante.breite; spalte++) {
            const oben = spalte;
            const unten = letzte * variante.breite + spalte;

            if (variante.aufstellung[oben] === "k") {
                felder.push(oben);
            }
            if (variante.aufstellung[unten] === "K") {
                felder.push(unten);
            }
        }

        return felder;
    },

    /* Neuer Stand in der gewünschten Spielart (ohne Angabe: klassisch). */
    neuerStand(varianteId) {
        const variante = SCHACH_VARIANTEN.holen(varianteId);

        return {
            variante: variante.id,
            breite: variante.breite,
            hoehe: variante.hoehe,
            brett: variante.aufstellung,
            amZug: SCHACH.WEISS,
            rochade: variante.rochade ? "KDkd" : "",

            /*
             * Die Turmfelder, die ihr Rochaderecht noch haben. Seit v2.1 die
             * Wahrheit — `rochade` (KDkd) bleibt als Altbestand daneben stehen
             * und wird daraus abgeleitet, damit der Vertrag additiv bleibt.
             * Nötig, weil die Rochade jetzt auf jedem Brett gilt: Auf dem
             * Doppelbrett gibt es vier Türme je Seite, für die vier Buchstaben
             * nicht reichen.
             */
            rochadeFelder: SCHACH._turmStartfelder(variante),

            /* Die Könige, die ihr Rochaderecht noch haben. Getrennt von den
               Türmen, weil ein König, der einmal gezogen hat, ALLE seine
               Rechte verliert — auch die zu einem Turm, dem er dabei näher
               gekommen ist. */
            rochadeKoenige: SCHACH._koenigStartfelder(variante),
            enPassant: "",

            /* Wo der Bauer steht, der den Doppelschritt gemacht hat (seit
               v0.65). Bis dahin liess sich das aus dem Zielfeld zurückrechnen —
               das ging nur, solange alle Bauern senkrecht ziehen. */
            enPassantOpfer: -1,
            halbzuege: 0,

            /*
             * Der Takt (seit v3.3): zählt JEDEN Halbzug und wird nie
             * zurückgesetzt.
             *
             * Warum nicht `halbzuege`: Das ist der Zähler der
             * Fünfzig-Züge-Regel — er springt bei jedem Bauernzug und jedem
             * Schlagen auf 0 zurück. Als Uhr für „diese Mauer steht noch sechs
             * Halbzüge" ist er damit unbrauchbar: Ein einziger Bauernzug würde
             * die Mauer verewigen. Der Takt ist die ehrliche Uhr.
             */
            takt: 0,

            zugNummer: 1,
            extraZug: "",
            sprungAktiv: "",

            /* Wirkung der Fähigkeiten, siehe schach-varianten.js.
               `zusatzMuster` löst `sprungAktiv` ab: Es kann jetzt auch etwas
               anderes als ein Springerzug sein. `sprungAktiv` bleibt im
               Vertrag stehen und wird mitgeführt — Felder werden nie
               gelöscht, nur ergänzt. */
            zusatzFarbe: "",
            zusatzMuster: "",

            /*
             * NUR NOCH DIESES MUSTER (seit v0.48).
             *
             * Sprung und Teleport sind seitdem der Zug selbst: Wer sie
             * einsetzt, bleibt am Zug, darf aber ausschliesslich nach dem
             * Muster ziehen. Ohne diesen Schalter wäre die Fähigkeit ein
             * geschenkter Zusatzzug — man könnte auch einfach normal ziehen
             * und den Sprung liegen lassen. Er gilt zusammen mit
             * `zusatzMuster` und verfällt mit ihm.
             */
            zusatzNurDieses: false,

            /*
             * Zwei Könige sind zwei Leben (seit v0.51 auch als Haken auf jeder
             * Spielart, siehe `SCHACH.koenigSchlagbarFuer`). Der Schalter steht
             * im STAND, weil `schach.js` die Regeln der Partie nicht kennt —
             * `SCHACH_RUNDE` setzt ihn beim Anlegen.
             */
            koenigeAlsLeben: false,

            schildFeld: -1,
            schildFarbe: "",
            fesselFeld: -1,
            fesselFarbe: "",

            /*
             * Wie lange die Fessel noch hält, als Wert von `takt` (seit v0.56).
             *
             * Bis v0.55 galt sie für genau einen Zug der gefesselten Seite und
             * brauchte deshalb keine Uhr — sie verfiel, sobald diese Farbe zog.
             * Jetzt hält sie mehrere Züge, und dafür gibt es nur eine
             * brauchbare Uhr: den Takt. `halbzuege` springt bei jedem Bauernzug
             * auf 0 zurück und machte die Fessel unsterblich (dieselbe Falle
             * wie bei den Mauern, siehe dort).
             *
             * 0 heisst „keine Frist gesetzt": Ein Stand von vor v0.56 bekommt
             * beim Normalisieren die alte Frist von einem Halbzug.
             */
            fesselBis: 0,

            /*
             * Frost: eingefroren zieht nichts und wird nichts geschlagen.
             *
             * SEIT v0.56 IST DAS EINE FLÄCHE, KEINE FIGUR. `frostFelder` sind
             * die Felder eines 2×2-Blocks, und was darin steht, friert ein —
             * egal, wem es gehört. `frostFeld` bleibt als linke obere Ecke
             * daneben stehen, damit der Datenvertrag additiv bleibt und ein
             * Stand von vorher weiterläuft.
             *
             * `frostFarbe` ist weiterhin die Seite, GEGEN die er gerichtet ist
             * — an ihrem nächsten Zug läuft er ab. Sie sagt also nicht mehr,
             * wer einfriert (das tun alle im Block), sondern nur noch, wann es
             * vorbei ist.
             */
            frostFeld: -1,
            frostFelder: [],
            frostFarbe: "",

            /*
             * Volles Glas: WER die gegnerischen Figuren falsch sieht, und bis zu
             * welchem Zugzähler. Das ist der einzige Eintrag im Stand, der die
             * Regeln überhaupt nicht berührt — er ändert nur, was EIN Team auf
             * dem Bildschirm sieht. Er steht trotzdem hier und nicht im
             * Bildschirm-Code, weil er zum Spielstand gehört: Er überlebt das
             * Neuladen und gilt auf jedem Gerät dieses Teams.
             */
            glasFarbe: "",
            glasBis: 0,

            /*
             * ENTTARNT (seit v0.88): Wer die Seltenheit der liegenden
             * Lootboxen gerade sehen darf, obwohl die Partie sie verbirgt —
             * und bis wann. Dasselbe Muster wie das volle Glas: seitenbezogen
             * und befristet, und es ändert NICHTS am Brett, nur daran, wie
             * eine Seite es sieht.
             */
            enttarntFarbe: "",
            enttarntBis: 0,

            /*
             * VERSTECKT (seit v0.98): Wer die Seltenheit der liegenden
             * Lootboxen gerade NICHT sehen darf, obwohl die Partie sie zeigt —
             * und bis wann. Das Gegenstück zum Enttarnen, aufgebaut wie das
             * volle Glas: Hier steht das OPFER, also die Seite, die weniger
             * sieht, nicht die Seite, die die Fähigkeit eingesetzt hat.
             */
            verstecktFarbe: "",
            verstecktBis: 0,

            /*
             * Mauern auf dem Brett (seit v3.3): [{ felder: [a, b, c], bis }].
             *
             * `bis` ist ein Wert von `halbzuege` — die Mauer gilt, solange
             * `halbzuege < bis`. Sie ist der erste Eintrag, der ein Feld sperrt,
             * ohne dass dort eine Figur steht: Niemand betritt sie, niemand
             * gleitet hindurch, aber ein Springer setzt darüber hinweg.
             */
            mauern: [],

            /*
             * Risse im Boden (seit v0.54, Unglückswürfel „Erdbeben"): einfach
             * eine Liste von Feldnummern. Sie sperren wie eine Mauer, laufen
             * aber NICHT ab — deshalb brauchen sie auch kein `bis`.
             */
            risse: [],

            /*
             * Geliehene Figuren (seit v3.3, Fähigkeit „Friedhof"):
             * [{ feld, bis }]. Sie stehen in der Farbe dessen auf dem Brett,
             * der sie geholt hat, und ziehen wie seine eigenen — aber nur bis
             * `bis` (ein Wert von `halbzuege`), dann zerfallen sie.
             *
             * Verfolgt wird das FELD, nicht die Figur: Zieht eine geliehene
             * Figur, wandert ihr Eintrag mit (siehe `_geliehenNachfuehren`).
             */
            geliehen: [],

            /*
             * DIE STARTSEITE EINZELNER BAUERN (seit v0.65): [{ feld, seite }],
             * `seite` ist "oben", "unten", "links" oder "rechts".
             *
             * WOZU. Ein Bauer zieht von seiner Startseite geradewegs zur
             * gegenüberliegenden — dort wandelt er um. Bis v0.64 folgte diese
             * Richtung der FARBE (Weiss hoch, Schwarz runter), und damit
             * konnte eine Armee nur oben oder unten stehen. Auf dem Kreuz
             * stehen Armeen auch links und rechts.
             *
             * ADDITIV UND RÜCKFALLSICHER: Steht ein Bauer nicht in dieser
             * Liste, gilt weiter die Farbregel (`SCHACH.bauernSeite`). Jedes
             * Brett von vorher und jede laufende Partie rechnet deshalb
             * unverändert weiter — die Liste ist auf allen bisherigen Brettern
             * schlicht leer.
             *
             * Verfolgt wird auch hier das FELD: Zieht der Bauer, wandert sein
             * Eintrag mit (`_bauernSeitenNachfuehren`). Wandelt er um, fällt
             * der Eintrag weg — er ist dann kein Bauer mehr.
             */
            bauernSeiten: [],

            /*
             * VON WELCHER SEITE JEDE FARBE GESTARTET IST (seit v0.72):
             * { weiss: ["unten"], schwarz: ["oben"] } — beim Kreuz je zwei.
             *
             * WOZU. Der Bildschirm dreht die Ansicht so, dass eine der eigenen
             * Armeen unten steht. Er könnte die Seiten aus `bauernSeiten`
             * ablesen — aber nur, solange die Farbe noch Bauern hat. Die Lage
             * der Ansicht darf sich mitten in der Partie nicht drehen, bloss
             * weil der letzte Bauer gefallen ist. Deshalb steht die Antwort
             * EINMAL beim Aufstellen im Stand und ändert sich nie wieder.
             *
             * ADDITIV: Fehlt der Eintrag (jede Partie vor v0.72), fällt
             * `SCHACH.startSeitenVon` auf die Bauern und danach auf die
             * Farbregel zurück — Weiss unten, Schwarz oben, also genau die
             * Ansicht von früher.
             */
            startSeiten: {},

            /*
             * WELCHE BAUERN IHREN ERSTEN EIGENEN ZUG SCHON GEMACHT HABEN
             * (seit v0.98, Wünsche #37 und #38) — Feldnummern.
             *
             * WARUM ES DIESE LISTE BRAUCHT. Bis v0.97 hing der Doppelschritt
             * allein an der REIHE: Wer auf einer der beiden Startreihen stand,
             * durfte zwei Felder. Das ist falsch, sobald eine Fähigkeit Bauern
             * schiebt, ohne dass ein Zug stattfindet:
             *
             *   - Ein Bauer, den das Nudelholz oder der Bauernschub nach vorne
             *     schiebt, verlor seinen Doppelschritt, obwohl er nie selbst
             *     gezogen war (#38).
             *   - Ein Bauer, den etwas auf seine Startreihe ZURÜCK schiebt,
             *     bekam ihn ein zweites Mal (#37).
             *
             * Jetzt zählt allein: Hat dieser Bauer schon selbst gezogen? Die
             * Liste verfolgt das FELD und wird überall dort nachgeführt, wo
             * auch `bauernSeiten` nachgeführt wird — Zug, Schub, Brettgrösse.
             *
             * ADDITIV, ÜBER DIE FASSUNG: `bauernZugFassung` sagt, ob dieser
             * Stand nach der neuen Rechnung geht. Fehlt sie (jede Partie vor
             * v0.98), baut `standNormalisieren` die Liste EINMAL aus der alten
             * Reihen-Regel nach und setzt die Fassung — dasselbe Muster wie
             * `bonusFassung` bei den Lootboxen. Eine laufende Partie rechnet
             * dadurch im Moment des Umstiegs genau wie vorher weiter.
             */
            bauernZog: [],
            bauernZugFassung: 0
        };
    },

    /* Bringt einen beliebigen Stand auf eine gültige Form. */
    standNormalisieren(roh) {
        const varianteId = (roh && typeof roh.variante === "string")
            ? roh.variante
            : SCHACH_VARIANTEN.STANDARD;
        const variante = SCHACH_VARIANTEN.holen(varianteId);
        const stand = SCHACH.neuerStand(variante.id);

        if (!roh || typeof roh !== "object") {
            return stand;
        }

        /*
         * Die Maße kommen aus der Spielart — es sei denn, der Stand trägt
         * eigene und das Brett passt dazu. Das braucht die Unglückskiste
         * „Ausdehnung“, die das Feld während der Partie wachsen lässt: Danach
         * stimmen Brett und Variante nicht mehr überein, und der Stand selbst
         * ist die Wahrheit.
         */
        if (Number.isInteger(roh.breite) && Number.isInteger(roh.hoehe)
            && roh.breite >= 2 && roh.breite <= SCHACH.SPALTEN.length
            && roh.hoehe >= 2 && roh.hoehe <= 9
            && typeof roh.brett === "string"
            && roh.brett.length === roh.breite * roh.hoehe) {
            stand.breite = roh.breite;
            stand.hoehe = roh.hoehe;
        }

        const felder = stand.breite * stand.hoehe;
        const muster = new RegExp("^[BTSLDKbtsldk.]{" + felder + "}$");

        if (typeof roh.brett === "string" && roh.brett.length === felder
            && muster.test(roh.brett)) {
            stand.brett = roh.brett;
        }
        if (roh.amZug === SCHACH.SCHWARZ) {
            stand.amZug = SCHACH.SCHWARZ;
        }
        if (typeof roh.rochade === "string" && /^[KDkd]*$/.test(roh.rochade)) {
            stand.rochade = variante.rochade ? roh.rochade : "";
        }

        /*
         * Rochaderechte. Steht die Feldliste im Stand, gilt sie. Fehlt sie,
         * stammt der Stand aus der Zeit vor v2.1: Dann werden die vier
         * Buchstaben in Felder übersetzt, damit angefangene Partien ihre
         * Rechte behalten.
         */
        if (Array.isArray(roh.rochadeFelder)) {
            stand.rochadeFelder = roh.rochadeFelder
                .filter((feld) => Number.isInteger(feld) && feld >= 0 && feld < felder)
                .filter((feld, stelle, alle) => alle.indexOf(feld) === stelle);
        } else if (variante.rochade && stand.rochade === "KDkd") {
            /* Unangetastete Rechte: alle Türme der Startaufstellung. Die vier
               Buchstaben können nur vier Türme beschreiben — auf dem
               Doppelbrett sind es acht. */
            stand.rochadeFelder = SCHACH._turmStartfelder(variante);
        } else if (variante.rochade) {
            const unten = (variante.hoehe - 1) * variante.breite;
            const alt = [];

            if (stand.rochade.indexOf("D") !== -1) { alt.push(unten); }
            if (stand.rochade.indexOf("K") !== -1) { alt.push(unten + variante.breite - 1); }
            if (stand.rochade.indexOf("d") !== -1) { alt.push(0); }
            if (stand.rochade.indexOf("k") !== -1) { alt.push(variante.breite - 1); }

            stand.rochadeFelder = alt;
        } else {
            stand.rochadeFelder = [];
        }

        /* Dasselbe für die Könige. */
        if (Array.isArray(roh.rochadeKoenige)) {
            stand.rochadeKoenige = roh.rochadeKoenige
                .filter((feld) => Number.isInteger(feld) && feld >= 0 && feld < felder)
                .filter((feld, stelle, alle) => alle.indexOf(feld) === stelle);
        } else if (variante.rochade) {
            /* Ohne Angabe: Ein König hat sein Recht, solange auf seiner Seite
               noch irgendein Turmrecht steht. Genauer geht es aus den vier
               alten Buchstaben nicht — sie kannten keine Königsfelder. */
            const unten = (variante.hoehe - 1) * variante.breite;

            stand.rochadeKoenige = SCHACH._koenigStartfelder(variante).filter((feld) => {
                const istWeiss = (feld >= unten);
                return stand.rochadeFelder.some((turm) => (turm >= unten) === istWeiss);
            });
        } else {
            stand.rochadeKoenige = [];
        }
        if (typeof roh.enPassant === "string"
            && SCHACH.feldNummer(roh.enPassant, variante.breite, variante.hoehe) !== -1) {
            stand.enPassant = roh.enPassant;
        }
        if (typeof roh.takt === "number" && isFinite(roh.takt) && roh.takt >= 0) {
            stand.takt = Math.floor(roh.takt);
        }
        if (typeof roh.halbzuege === "number" && isFinite(roh.halbzuege) && roh.halbzuege >= 0) {
            stand.halbzuege = Math.floor(roh.halbzuege);
        }
        if (typeof roh.zugNummer === "number" && isFinite(roh.zugNummer) && roh.zugNummer >= 1) {
            stand.zugNummer = Math.floor(roh.zugNummer);
        }
        if (roh.extraZug === SCHACH.WEISS || roh.extraZug === SCHACH.SCHWARZ) {
            stand.extraZug = roh.extraZug;
        }

        /*
         * Zusätzliches Zugmuster (Sprung, Ausweichen, Teleport).
         *
         * DIE LISTE MUSS JEDEN NAMEN AUS `_musterzuege` ENTHALTEN. Fehlte
         * einer, würde er hier stillschweigend weggeworfen: Die Fähigkeit wäre
         * aus dem Vorrat verbraucht, das Muster aber schon beim nächsten
         * Zeichnen wieder weg. Genau das ist „ausweichen" von v3.6 bis v0.40
         * passiert (siehe `docs\entscheidungen\erkenntnisse.md`). „koenig" ist
         * der alte Name desselben Musters und bleibt gültig.
         */
        const farben = [SCHACH.WEISS, SCHACH.SCHWARZ];

        if (farben.indexOf(roh.zusatzFarbe) !== -1 && typeof roh.zusatzMuster === "string"
            && ["springer", "ausweichen", "koenig", "umkreis2"].indexOf(roh.zusatzMuster) !== -1) {
            stand.zusatzFarbe = roh.zusatzFarbe;
            stand.zusatzMuster = roh.zusatzMuster;
        } else if (farben.indexOf(roh.sprungAktiv) !== -1) {
            /* Stände aus der Zeit, als es nur den Sprung gab. */
            stand.zusatzFarbe = roh.sprungAktiv;
            stand.zusatzMuster = "springer";
        }

        /* Der Schalter gilt nur zusammen mit einem Muster — ohne Muster gibt es
           nichts, worauf er einschränken könnte. */
        stand.zusatzNurDieses = !!roh.zusatzNurDieses && !!stand.zusatzMuster;

        /* Zwei Leben: aus dem Stand gelesen, ergänzt um die alte Spielart. */
        stand.koenigeAlsLeben = !!roh.koenigeAlsLeben || !!variante.koenigeAlsLeben;

        /* Das alte Feld wird mitgeführt, damit der Vertrag additiv bleibt. */
        stand.sprungAktiv = (stand.zusatzMuster === "springer") ? stand.zusatzFarbe : "";

        if (Number.isInteger(roh.schildFeld) && roh.schildFeld >= 0
            && roh.schildFeld < felder && farben.indexOf(roh.schildFarbe) !== -1) {
            stand.schildFeld = roh.schildFeld;
            stand.schildFarbe = roh.schildFarbe;
        }
        if (Number.isInteger(roh.fesselFeld) && roh.fesselFeld >= 0
            && roh.fesselFeld < felder && farben.indexOf(roh.fesselFarbe) !== -1) {
            stand.fesselFeld = roh.fesselFeld;
            stand.fesselFarbe = roh.fesselFarbe;

            /*
             * Ohne Frist stammt der Stand aus der Zeit vor v0.56: Damals galt
             * die Fessel für genau einen Halbzug. Genau das wird hier
             * nachgetragen, damit eine angefangene Partie nicht plötzlich
             * länger fesselt, als beim Einsetzen versprochen war.
             */
            stand.fesselBis = (Number.isInteger(roh.fesselBis) && roh.fesselBis > stand.takt)
                ? roh.fesselBis
                : stand.takt + 1;
        }

        /*
         * Frost: die Liste gewinnt, das Einzelfeld ist der Rückfall. Ein Stand
         * von vor v0.56 kennt nur `frostFeld` — daraus wird ein Block aus
         * einem Feld, und die Partie läuft unverändert weiter.
         */
        if (farben.indexOf(roh.frostFarbe) !== -1) {
            const ausListe = Array.isArray(roh.frostFelder)
                ? roh.frostFelder.filter((feld) => Number.isInteger(feld)
                    && feld >= 0 && feld < felder)
                : [];

            const block = (ausListe.length > 0)
                ? ausListe
                : ((Number.isInteger(roh.frostFeld) && roh.frostFeld >= 0
                    && roh.frostFeld < felder) ? [roh.frostFeld] : []);

            if (block.length > 0) {
                stand.frostFelder = block.filter(
                    (feld, stelle, alle) => alle.indexOf(feld) === stelle);
                stand.frostFeld = stand.frostFelder[0];
                stand.frostFarbe = roh.frostFarbe;
            }
        }
        if (farben.indexOf(roh.glasFarbe) !== -1 && Number.isInteger(roh.glasBis)
            && roh.glasBis > 0) {
            stand.glasFarbe = roh.glasFarbe;
            stand.glasBis = roh.glasBis;
        }

        /* Enttarnt (seit v0.88) — wie das Glas, nur mit umgekehrter Wirkung. */
        if (farben.indexOf(roh.enttarntFarbe) !== -1
            && Number.isInteger(roh.enttarntBis) && roh.enttarntBis > 0) {
            stand.enttarntFarbe = roh.enttarntFarbe;
            stand.enttarntBis = roh.enttarntBis;
        }

        /* Versteckt (seit v0.98) — dasselbe Muster, gegenläufige Wirkung. */
        if (farben.indexOf(roh.verstecktFarbe) !== -1
            && Number.isInteger(roh.verstecktBis) && roh.verstecktBis > 0) {
            stand.verstecktFarbe = roh.verstecktFarbe;
            stand.verstecktBis = roh.verstecktBis;
        }

        if (Array.isArray(roh.mauern)) {
            stand.mauern = roh.mauern
                .filter((eintrag) => eintrag && Array.isArray(eintrag.felder)
                    && Number.isInteger(eintrag.bis) && eintrag.bis > 0)
                .map((eintrag) => ({
                    felder: eintrag.felder
                        .filter((feld) => Number.isInteger(feld) && feld >= 0 && feld < felder),
                    bis: eintrag.bis
                }))
                .filter((eintrag) => eintrag.felder.length > 0);
        }

        /* Risse: nur Feldnummern, jede höchstens einmal, keine mit Ablauf. */
        if (Array.isArray(roh.risse)) {
            stand.risse = roh.risse
                .filter((feld) => Number.isInteger(feld) && feld >= 0 && feld < felder)
                .filter((feld, stelle, alle) => alle.indexOf(feld) === stelle);
        }

        if (Array.isArray(roh.geliehen)) {
            stand.geliehen = roh.geliehen
                .filter((eintrag) => eintrag
                    && Number.isInteger(eintrag.feld) && eintrag.feld >= 0
                    && eintrag.feld < felder
                    && Number.isInteger(eintrag.bis) && eintrag.bis > 0)
                .map((eintrag) => ({ feld: eintrag.feld, bis: eintrag.bis }));
        }

        /* Die Startseiten einzelner Bauern (seit v0.65). Unbekannte Seiten
           fallen weg — dann gilt für den Bauern wieder die Farbregel. */
        if (Array.isArray(roh.bauernSeiten)) {
            stand.bauernSeiten = roh.bauernSeiten
                .filter((eintrag) => eintrag
                    && Number.isInteger(eintrag.feld) && eintrag.feld >= 0
                    && eintrag.feld < felder
                    && SCHACH.SEITEN[eintrag.seite])
                .map((eintrag) => ({ feld: eintrag.feld, seite: eintrag.seite }))
                .filter((eintrag, stelle, alle) =>
                    alle.findIndex((anderer) => anderer.feld === eintrag.feld) === stelle);
        }

        /* Die Startseiten der beiden Farben (seit v0.72). Unbekannte Seiten
           fallen weg; bleibt für eine Farbe nichts übrig, entscheidet später
           der Rückfall in `startSeitenVon`. */
        if (roh.startSeiten && typeof roh.startSeiten === "object") {
            for (const farbe of [SCHACH.WEISS, SCHACH.SCHWARZ]) {
                const liste = Array.isArray(roh.startSeiten[farbe])
                    ? roh.startSeiten[farbe]
                    : [];

                const sauber = liste
                    .filter((seite) => !!SCHACH.SEITEN[seite])
                    .filter((seite, stelle, alle) => alle.indexOf(seite) === stelle);

                if (sauber.length > 0) {
                    stand.startSeiten[farbe] = sauber;
                }
            }
        }

        /* Das Opfer eines Doppelschritts (seit v0.65) — siehe `_ausfuehren`. */
        if (Number.isInteger(roh.enPassantOpfer) && roh.enPassantOpfer >= 0
            && roh.enPassantOpfer < felder) {
            stand.enPassantOpfer = roh.enPassantOpfer;
        }

        /*
         * WER SEINEN ERSTEN ZUG SCHON GEMACHT HAT (seit v0.98).
         *
         * Zwei Fälle, und der zweite ist der Umstieg:
         *
         *   Fassung 1  Der Stand rechnet schon nach der Liste — sie wird nur
         *              gesäubert. „Wo kein Bauer steht, braucht es keinen
         *              Eintrag" hält sie von selbst sauber: Fällt ein Bauer
         *              und stellt sich später ein anderer auf sein Feld, erbt
         *              der nicht dessen Vorgeschichte.
         *   sonst      Eine Partie von vor v0.98. Die Liste wird EINMAL aus
         *              der alten Reihen-Regel nachgebaut: Jeder Bauer, dem sie
         *              den Doppelschritt verwehrt hätte, gilt als gezogen.
         *              Im Moment des Umstiegs rechnet die Partie damit genau
         *              wie vorher weiter; erst der nächste Schub macht den
         *              Unterschied.
         *
         * Der Umstieg läuft nur EINMAL, weil er die Fassung setzt — sonst
         * fiele ein geschobener Bauer beim nächsten Normalisieren wieder auf
         * die Reihen-Regel zurück, und der Fix wäre keiner.
         */
        const istBauer = (feld) => SCHACH.artVon(SCHACH.figurAuf(stand, feld)) === "B";

        if (roh.bauernZugFassung === 1) {
            stand.bauernZugFassung = 1;
            stand.bauernZog = (Array.isArray(roh.bauernZog) ? roh.bauernZog : [])
                .filter((feld) => Number.isInteger(feld) && feld >= 0 && feld < felder)
                .filter((feld, stelle, alle) => alle.indexOf(feld) === stelle)
                .filter(istBauer);
        } else {
            stand.bauernZugFassung = 1;
            stand.bauernZog = [];

            for (let feld = 0; feld < felder; feld++) {
                if (!istBauer(feld)) {
                    continue;
                }
                const farbe = SCHACH.farbeVon(SCHACH.figurAuf(stand, feld));
                if (!SCHACH._darfDoppeltNachReihe(stand, feld, farbe)) {
                    stand.bauernZog.push(feld);
                }
            }
        }

        return stand;
    },

    /* ---------------------------------------------------------------- *
     * WOHIN EIN BAUER ZIEHT (seit v0.65)
     *
     * Die Regel in einem Satz, so wie der Nutzer sie beschrieben hat: Ein
     * Bauer schaut, welche Seite seine STARTSEITE ist, und läuft von dort
     * geradewegs auf die gegenüberliegende zu — die ist sein Ziel, dort
     * wandelt er um. Geschlagen wird schräg nach vorn: Läuft er von rechts
     * nach links, schlägt er vor sich oben und unten.
     *
     * Bis v0.64 hing das an der FARBE (Weiss hoch, Schwarz runter). Das war
     * dieselbe Regel — nur konnte eine Armee damit ausschliesslich oben oder
     * unten stehen. Auf dem Kreuz stehen Armeen auch links und rechts.
     *
     * ALLES AN EINER STELLE: Zugerzeugung, Bedrohungsprüfung, Doppelschritt
     * und Umwandlung fragen nur noch die vier Funktionen hier. Wer eine
     * fünfte Richtung erfände, änderte genau diese Tabelle.
     * ---------------------------------------------------------------- */

    /*
     * Die vier Startseiten und was aus ihnen folgt:
     *   dr, ds   Laufrichtung (Reihe, Spalte)
     *   gegen    die gegenüberliegende Seite — dort wandelt der Bauer um
     */
    SEITEN: {
        unten:  { dr: -1, ds: 0, gegen: "oben" },
        oben:   { dr: 1, ds: 0, gegen: "unten" },
        links:  { dr: 0, ds: 1, gegen: "rechts" },
        rechts: { dr: 0, ds: -1, gegen: "links" }
    },

    /*
     * Von welcher Seite kam dieser Bauer?
     *
     * Steht er nicht in `bauernSeiten`, gilt die Farbregel von früher: Weiss
     * startet unten, Schwarz oben. Genau dieser Rückfall hält jedes bisherige
     * Brett und jede laufende Partie unverändert am Laufen.
     */
    bauernSeite(stand, feld, farbe) {
        const liste = Array.isArray(stand.bauernSeiten) ? stand.bauernSeiten : [];
        const eintrag = liste.find((einer) => einer.feld === feld);

        if (eintrag && SCHACH.SEITEN[eintrag.seite]) {
            return eintrag.seite;
        }
        return (farbe === SCHACH.WEISS) ? "unten" : "oben";
    },

    /*
     * VON WELCHEN SEITEN SPIELT DIESE FARBE? (seit v0.72)
     *
     * Auf jedem gewohnten Brett ist es eine (Weiss unten, Schwarz oben), auf
     * dem Kreuz mit vier Armeen sind es zwei. Der Bildschirm dreht danach die
     * Ansicht; die Regeln fragen die Seite weiterhin je Bauer.
     *
     * DREI QUELLEN, IN DIESER REIHENFOLGE — jede spätere ist nur der Rückfall
     * für Stände, die die frühere nicht kennen:
     *
     *   1. `stand.startSeiten` (seit v0.72, beim Aufstellen gesetzt). Steht
     *      fest und ändert sich nie — auch nicht, wenn die letzte Figur einer
     *      Seite fällt.
     *   2. Die Bauern (`bauernSeiten`, seit v0.65). Deckt die Kreuz-Partien
     *      ab, die vor v0.72 angelegt wurden, solange sie Bauern haben.
     *   3. Die Farbregel. Sie gilt für jedes gewohnte Brett und ist die
     *      Ansicht von früher.
     */
    startSeitenVon(stand, farbe) {
        const gemerkt = (stand && stand.startSeiten) ? stand.startSeiten[farbe] : null;

        if (Array.isArray(gemerkt) && gemerkt.length > 0) {
            return gemerkt.slice();
        }

        const seiten = [];
        const liste = (stand && Array.isArray(stand.bauernSeiten)) ? stand.bauernSeiten : [];

        for (const eintrag of liste) {
            const figur = SCHACH.figurAuf(stand, eintrag.feld);

            if (figur !== "." && SCHACH.farbeVon(figur) === farbe
                && SCHACH.SEITEN[eintrag.seite]
                && seiten.indexOf(eintrag.seite) === -1) {
                seiten.push(eintrag.seite);
            }
        }

        if (seiten.length > 0) {
            return seiten;
        }
        return [(farbe === SCHACH.WEISS) ? "unten" : "oben"];
    },

    /* Die Laufrichtung dieses Bauern als { dr, ds }. */
    bauernRichtung(stand, feld, farbe) {
        const seite = SCHACH.bauernSeite(stand, feld, farbe);
        return { dr: SCHACH.SEITEN[seite].dr, ds: SCHACH.SEITEN[seite].ds };
    },

    /*
     * Die beiden Felder, die ein Bauer von hier aus SCHLAGEN kann — schräg
     * nach vorn. Senkrechte Läufer schlagen links und rechts vor sich,
     * waagerechte oben und unten vor sich. Gerechnet wird es aus der
     * Laufrichtung, nicht aufgezählt: Der Seitwärtsschritt steht immer quer
     * dazu (`{ dr: ds, ds: dr }`).
     */
    bauernSchlagfelder(stand, feld, farbe) {
        const breite = SCHACH.breiteVon(stand);
        const reihe = SCHACH.reiheVon(feld, breite);
        const spalte = SCHACH.spalteVon(feld, breite);
        const richtung = SCHACH.bauernRichtung(stand, feld, farbe);

        const felder = [];
        for (const quer of [1, -1]) {
            const r = reihe + richtung.dr + quer * richtung.ds;
            const s = spalte + richtung.ds + quer * richtung.dr;

            if (SCHACH._imBrett(stand, r, s)) {
                felder.push(SCHACH._feld(stand, r, s));
            }
        }
        return felder;
    },

    /*
     * Ist dieses Feld das ZIEL des Bauern — also der Brettrand auf der
     * gegenüberliegenden Seite? Dann wandelt er dort um.
     */
    bauernAmZiel(stand, feld, farbe, vonFeld) {
        const breite = SCHACH.breiteVon(stand);
        const hoehe = SCHACH.hoeheVon(stand);

        /* Gefragt wird nach der Seite, von der der Bauer LOSGEZOGEN ist —
           auf dem Zielfeld steht sein Eintrag ja noch nicht. */
        const seite = SCHACH.bauernSeite(stand,
            Number.isInteger(vonFeld) ? vonFeld : feld, farbe);

        const reihe = SCHACH.reiheVon(feld, breite);
        const spalte = SCHACH.spalteVon(feld, breite);

        if (seite === "unten") {
            return reihe === 0;
        }
        if (seite === "oben") {
            return reihe === hoehe - 1;
        }
        if (seite === "links") {
            return spalte === breite - 1;
        }
        return spalte === 0;
    },

    /*
     * Die zwei Reihen (oder Spalten) an der Startseite, aus denen ein Bauer
     * den Doppelschritt hat. Geliefert wird eine Prüfung auf ein Feld.
     */
    /*
     * SEIT v0.98 ENTSCHEIDET DER BAUER, NICHT DIE REIHE (Wünsche #37/#38).
     *
     * Der Doppelschritt gehört zum ERSTEN eigenen Zug eines Bauern — „nur beim
     * ersten Mal Bewegen, wenn es möglich ist". Wer geschoben wurde, hat sich
     * nicht selbst bewegt und behält ihn deshalb; wer schon gezogen ist,
     * bekommt ihn auch dann nicht zurück, wenn ihn etwas auf seine Startreihe
     * zurückschiebt.
     *
     * Die Reihen-Regel von früher bleibt als `_darfDoppeltNachReihe` bestehen:
     * Sie ist der Rückfall für Stände ohne Fassung (und die Vorlage, aus der
     * `standNormalisieren` die Liste beim Umstieg einmalig baut).
     */
    bauernDarfDoppelt(stand, feld, farbe) {
        if (stand && stand.bauernZugFassung === 1) {
            const liste = Array.isArray(stand.bauernZog) ? stand.bauernZog : [];
            return liste.indexOf(feld) === -1;
        }
        return SCHACH._darfDoppeltNachReihe(stand, feld, farbe);
    },

    /* Die Rechnung bis v0.97: Steht der Bauer auf einer der beiden Reihen an
       seiner Startseite? Siehe `bauernDarfDoppelt`. */
    _darfDoppeltNachReihe(stand, feld, farbe) {
        const breite = SCHACH.breiteVon(stand);
        const hoehe = SCHACH.hoeheVon(stand);
        const seite = SCHACH.bauernSeite(stand, feld, farbe);
        const reihe = SCHACH.reiheVon(feld, breite);
        const spalte = SCHACH.spalteVon(feld, breite);

        if (seite === "unten") {
            return reihe === hoehe - 1 || reihe === hoehe - 2;
        }
        if (seite === "oben") {
            return reihe === 0 || reihe === 1;
        }
        if (seite === "links") {
            return spalte === 0 || spalte === 1;
        }
        return spalte === breite - 1 || spalte === breite - 2;
    },

    /*
     * Führt die Startseiten über einen Zug nach: Der Eintrag wandert mit der
     * Figur, ein geschlagener verschwindet. Dasselbe Muster wie bei den
     * geliehenen Figuren.
     *
     * `entfernen` nimmt zusätzliche Felder heraus — gebraucht für das Opfer
     * eines En-passant-Schlags, das nicht auf dem Zielfeld steht.
     */
    _bauernSeitenNachfuehren(stand, von, nach, wandeltUm, entfernen) {
        const liste = Array.isArray(stand.bauernSeiten) ? stand.bauernSeiten : [];
        const weg = Array.isArray(entfernen) ? entfernen : [];

        const neu = [];
        for (const eintrag of liste) {
            if (eintrag.feld === nach || weg.indexOf(eintrag.feld) !== -1) {
                /* Dort stand jemand, der gerade geschlagen wurde. */
                continue;
            }
            if (eintrag.feld === von) {
                /* Wer umwandelt, ist kein Bauer mehr und braucht keine
                   Richtung. */
                if (!wandeltUm) {
                    neu.push({ feld: nach, seite: eintrag.seite });
                }
                continue;
            }
            neu.push(eintrag);
        }
        return neu;
    },

    /*
     * Führt `bauernZog` über einen Zug nach (seit v0.98) — das Gegenstück zu
     * `_bauernSeitenNachfuehren`, nur dass hier keine Seite mitreist, sondern
     * bloss die Feldnummer.
     *
     * Drei Fälle, und alle drei sind nötig:
     *
     *   1. Wer auf `nach` stand, wurde geschlagen — sein Eintrag fällt weg.
     *      Ohne das erbte die ziehende Figur die Vorgeschichte ihres Opfers.
     *      Dasselbe gilt für das En-passant-Opfer, das woanders steht.
     *   2. Der Eintrag des ziehenden Bauern wandert von `von` auf `nach`.
     *   3. ZIEHT EIN BAUER, hat er seinen ersten Zug hinter sich und kommt neu
     *      in die Liste — es sei denn, er wandelt um; dann ist er keiner mehr.
     *
     * Eine Rochade braucht nichts Eigenes: Türme stehen nie in dieser Liste,
     * und auf den Rochadefeldern steht kein Bauer.
     */
    _bauernZogNachfuehren(stand, zug, art) {
        const liste = Array.isArray(stand.bauernZog) ? stand.bauernZog : [];
        const weg = zug.enPassant ? [zug.enPassantFeld] : [];

        const neu = liste.filter((feld) => feld !== zug.von
            && feld !== zug.nach && weg.indexOf(feld) === -1);

        if (art === "B" && !zug.umwandlung) {
            neu.push(zug.nach);
        }
        return neu;
    },

    /*
     * ALLES, WAS AN EINER FIGUR HÄNGT, ZIEHT MIT IHR MIT (seit v0.102).
     *
     * Diese eine Funktion führt jede figurgebundene Angabe entlang beliebiger
     * Wege nach — für die Fähigkeiten und Unglücke, die Figuren bewegen, OHNE
     * dass ein Zug stattfindet (Nudelholz, Bauernschub, Erdbeben, Erdrutsch,
     * Spiegel, Platztausch). Nachgeführt werden inzwischen vier Dinge:
     *
     *     bauernSeiten   die Startseite je Bauer (seit v0.65)
     *     bauernZog      wer seinen ersten Zug schon gemacht hat (seit v0.98)
     *     schildFeld     das Schutzschild (seit v0.102)
     *     fesselFeld     die Fessel (seit v0.102)
     *
     * SIE HIESS BIS v0.101 `bauernSeitenVerschieben`. Der Name stimmte schon
     * seit v0.98 nicht mehr, und genau daran wäre die nächste Erweiterung
     * vorbeigelaufen: Wer „Schild an die Figur binden" bauen will, sucht keine
     * Funktion, die nach Bauern klingt. **Wer eine fünfte figurgebundene
     * Angabe erfindet, trägt sie hier ein** — es gibt keinen zweiten Ort dafür.
     *
     * DER GEMEINSAME NENNER: Geschoben zu werden ist KEIN Zug. Was eine Figur
     * bei sich trägt, verliert sie durch einen eigenen Zug (das Schild) oder
     * behält sie über ihn hinweg (die Startseite) — aber ein Schub ändert
     * nichts als den Platz.
     */
    figurMarkenVerschieben(stand, wege) {
        const liste = Array.isArray(stand.bauernSeiten) ? stand.bauernSeiten : [];
        const gezogen = Array.isArray(stand.bauernZog) ? stand.bauernZog : [];

        if (!Array.isArray(wege) || wege.length === 0) {
            return stand;
        }

        /* Erst alle Umzüge sammeln, dann anwenden: Zwei Figuren können in
           einem Zug die Plätze tauschen. */
        const umzug = {};
        for (const weg of wege) {
            if (weg && Number.isInteger(weg.von) && Number.isInteger(weg.nach)) {
                umzug[weg.von] = weg.nach;
            }
        }

        /* Wo jetzt kein Bauer mehr steht, braucht es keinen Eintrag. */
        const istBauer = (feld) => SCHACH.artVon(SCHACH.figurAuf(stand, feld)) === "B";

        const neu = liste
            .map((eintrag) => (Number.isInteger(umzug[eintrag.feld])
                ? { feld: umzug[eintrag.feld], seite: eintrag.seite }
                : eintrag))
            .filter((eintrag) => istBauer(eintrag.feld));

        const neuGezogen = gezogen
            .map((feld) => (Number.isInteger(umzug[feld]) ? umzug[feld] : feld))
            .filter((feld, stelle, alle) => alle.indexOf(feld) === stelle)
            .filter(istBauer);

        /*
         * SCHILD UND FESSEL HÄNGEN AN DER FIGUR, NICHT AM FELD (seit v0.102,
         * Nutzer-Ansage 20.08.: „alle Status-Items sind an die Figur gebunden,
         * also Fessel und Schild — wenn die Figur durch Nudelholz oder
         * Bauernschub bewegt wird, soll es auf der Figur bleiben").
         *
         * Bis v0.101 stand im Stand nur eine Feldnummer, und die blieb liegen,
         * wo sie war. Wer eine geschützte Figur schob, liess ihr Schild auf dem
         * leeren Feld zurück; wer eine gefesselte schob, machte sie damit frei
         * und fesselte stattdessen das, was danach auf dem alten Feld stand.
         *
         * WARUM DAS HIER STEHT UND NICHT IN `_ausfuehren`: Ein eigener ZUG ist
         * etwas anderes als ein Schub. Zieht die geschützte Figur selbst,
         * verfällt das Schild weiterhin (Regel seit v3.3) — geschoben zu werden
         * ist kein Zug, genau wie beim Doppelschritt-Recht der Bauern (v0.98).
         *
         * WO KEINE FIGUR MEHR STEHT, gibt es nichts mehr zu schützen oder zu
         * fesseln: Die Marke fällt weg. Sonst zeichnete das Brett einen Ring um
         * ein leeres Feld, und die nächste Figur, die dort hinzieht, erbte ihn.
         */
        const marke = (feld) => (Number.isInteger(umzug[feld]) ? umzug[feld] : feld);
        const besetzt = (feld) => SCHACH.figurAuf(stand, feld) !== ".";

        const schildNeu = (stand.schildFeld >= 0) ? marke(stand.schildFeld) : -1;
        const fesselNeu = (stand.fesselFeld >= 0) ? marke(stand.fesselFeld) : -1;

        const schildBleibt = (schildNeu >= 0) && besetzt(schildNeu);
        const fesselBleibt = (fesselNeu >= 0) && besetzt(fesselNeu);

        return Object.assign({}, stand, {
            bauernSeiten: neu,
            bauernZog: neuGezogen,

            schildFeld: schildBleibt ? schildNeu : -1,
            schildFarbe: schildBleibt ? stand.schildFarbe : "",

            fesselFeld: fesselBleibt ? fesselNeu : -1,
            fesselFarbe: fesselBleibt ? stand.fesselFarbe : "",
            fesselBis: fesselBleibt ? stand.fesselBis : 0
        });
    },

    /* ---------------------------------------------------------------- *
     * Mauern (seit v3.3)
     *
     * Eine Mauer sperrt Felder, ohne dass dort eine Figur steht. Sie gehört
     * keiner Seite: Sie behindert beide gleichermassen — auch den, der sie
     * gelegt hat. Das ist Absicht, sonst wäre sie eine Waffe statt eines
     * Hindernisses.
     * ---------------------------------------------------------------- */

    /* Wie lange eine Mauer steht, gerechnet in Halbzügen. */
    MAUER_HALBZUEGE: 6,

    /* Wie viele Felder eine Mauer breit ist. */
    MAUER_LAENGE: 3,

    /* Die Mauern, die JETZT noch stehen. Abgelaufene zählen nicht mehr mit. */
    mauern(stand) {
        if (!Array.isArray(stand.mauern)) {
            return [];
        }
        return stand.mauern.filter((eintrag) => eintrag.bis > stand.takt);
    },

    /*
     * Liegt auf diesem Feld eine Mauer?
     *
     * SEIT v0.54 IST DAS NUR DIE HÄLFTE DER FRAGE. Ein Feld kann auch durch
     * einen RISS gesperrt sein (Unglückswürfel „Erdbeben"). Wer wissen will,
     * ob man hier durchkommt, fragt `SCHACH.gesperrt` — diese Funktion hier
     * beantwortet nur, ob es eine MAUER ist, und dafür gibt es genau einen
     * Grund: Der Bildschirm zeichnet beide verschieden.
     */
    mauerAuf(stand, feld) {
        return SCHACH.mauern(stand)
            .some((eintrag) => eintrag.felder.indexOf(feld) !== -1);
    },

    /*
     * DIE RISSE IM BODEN (seit v0.54, Unglückswürfel „Erdbeben").
     *
     * Anders als eine Mauer laufen sie NICHT ab: Ein Riss bleibt die ganze
     * Partie. Eine Gegen-Fähigkeit, die ihn wieder schliesst, gibt es noch
     * nicht — sie ist ausdrücklich vorgesehen (siehe `ROADMAP.md`). Wer sie
     * baut, nimmt hier Felder aus der Liste heraus.
     */
    risse(stand) {
        if (!Array.isArray(stand.risse)) {
            return [];
        }
        return stand.risse;
    },

    rissAuf(stand, feld) {
        return SCHACH.risse(stand).indexOf(feld) !== -1;
    },

    /*
     * Ist dieses Feld gesperrt — durch eine Mauer oder einen Riss?
     *
     * Das ist die Frage, die die REGELN stellen; alle Stellen, die früher
     * `mauerAuf` fragten, fragen jetzt hier. Springer setzen über beides
     * hinweg — das ergibt sich von selbst, weil sie nie nach den Feldern
     * dazwischen fragen.
     */
    gesperrt(stand, feld) {
        return SCHACH.mauerAuf(stand, feld) || SCHACH.rissAuf(stand, feld);
    },

    /* ---------------------------------------------------------------- *
     * Frost und Fessel (Frost als Fläche seit v0.56)
     *
     * Beide halten eine Figur fest, und trotzdem sind es zwei verschiedene
     * Dinge — deshalb stehen sie hier nebeneinander:
     *
     *     Frost    sperrt eine FLÄCHE (2×2) für EINEN Zug. Was darin steht,
     *              zieht nicht und lässt sich auch nicht schlagen. Es gilt für
     *              beide Seiten, auch für die, die ihn gelegt hat.
     *     Fessel   hält EINE Figur über MEHRERE Züge fest. Sie bleibt dabei
     *              ganz normal schlagbar — das ist ihr Sinn.
     *
     * Könige sind von beidem ausgenommen. Ein König, der nicht ziehen darf,
     * wäre ohne eigenen Fehler matt, und ein unantastbarer König machte
     * „Schachmatt" mehrdeutig.
     * ---------------------------------------------------------------- */

    /* Kantenlänge des Frost-Blocks. */
    FROST_KANTE: 2,

    /* Wie viele Halbzüge eine Fessel hält. Vier heisst: zwei Züge des
       Gegners — genug, um etwas daraus zu machen, zu wenig, um die Partie
       damit einzufrieren. */
    FESSEL_HALBZUEGE: 4,

    /* Die eingefrorenen Felder. Ein Stand von vor v0.56 kennt nur `frostFeld`;
       `standNormalisieren` hat daraus längst eine Liste gemacht. */
    frostFelder(stand) {
        if (Array.isArray(stand.frostFelder) && stand.frostFelder.length > 0) {
            return stand.frostFelder;
        }
        return (stand.frostFeld >= 0) ? [stand.frostFeld] : [];
    },

    /*
     * Steht auf diesem Feld etwas Eingefrorenes?
     *
     * Die Frage ist bewusst FARBLOS: Der Block friert ein, was darin steht,
     * gleich wem es gehört (Nutzer-Entscheidung 08.08.). Der König bleibt
     * verschont — er steht im Block, zieht aber und ist schlagbar wie sonst.
     *
     * EIN LEERES FELD IM BLOCK IST NICHT GESPERRT. Der Frost hält FIGUREN
     * fest, er riegelt keine Fläche ab — dafür gibt es die Mauer. Ohne diese
     * Zeile wäre er beides gewesen: eine Mauer, die man auch noch über den
     * Gegner legen kann.
     */
    /*
     * SEIT v0.80 GILT DER FROST AUCH FÜR KÖNIGE (Nutzer-Ansage 18.08.).
     *
     * Bis v0.79 war der König ausgenommen — genau damit „Schachmatt" eindeutig
     * blieb (eiserne Regel: „König und Matt bleiben unangetastet von
     * Fähigkeiten"). Der Nutzer hat die Aufhebung verlangt und die Folge selbst
     * genannt: „kann bei richtigem Nutzen zu Schach führen." Die Begründung
     * steht in `docs\entscheidungen\entschieden.md`.
     *
     * DASS DAS ÜBERHAUPT AUFGEHT, hängt an einer Feinheit: `imSchach` rechnet
     * über `_feldBedroht` rein geometrisch und fragt den Frost nicht. Ein
     * eingefrorener König steht also weiterhin im Schach — sonst wäre er durch
     * „eingefroren heisst unantastbar" unangreifbar geworden, und der Wunsch
     * hätte genau das Gegenteil bewirkt.
     */
    eingefroren(stand, feld) {
        if (SCHACH.frostFelder(stand).indexOf(feld) === -1) {
            return false;
        }

        return SCHACH.artVon(SCHACH.figurAuf(stand, feld)) !== "";
    },

    /* Ist diese Figur gefesselt? Anders als der Frost hängt das an der FARBE:
       Gefesselt wird immer nur eine Seite. */
    gefesselt(stand, feld) {
        return stand.fesselFeld === feld
            && !!stand.fesselFarbe
            && SCHACH.farbeVon(SCHACH.figurAuf(stand, feld)) === stand.fesselFarbe;
    },

    /*
     * Die Felder eines Frost-Blocks, oder null. `feld` ist die linke obere
     * Ecke — dieselbe Lesart wie beim Friedhof, damit man nicht zwei
     * Bedienungen für zwei 2×2-Fähigkeiten lernen muss.
     *
     * Anders als der Friedhof verlangt der Frost KEINE freien Felder: Er
     * friert ja gerade das ein, was dort steht. Nur im Brett liegen muss der
     * Block.
     */
    frostBlock(stand, feld) {
        const breite = SCHACH.breiteVon(stand);
        const hoehe = SCHACH.hoeheVon(stand);
        const reihe = SCHACH.reiheVon(feld, breite);
        const spalte = SCHACH.spalteVon(feld, breite);
        const kante = SCHACH.FROST_KANTE;

        if (feld < 0 || reihe + kante > hoehe || spalte + kante > breite) {
            return null;
        }

        const block = [];
        for (let dr = 0; dr < kante; dr++) {
            for (let ds = 0; ds < kante; ds++) {
                block.push(SCHACH._feld(stand, reihe + dr, spalte + ds));
            }
        }

        return block;
    },

    /*
     * Eine Mauer legen: `MAUER_LAENGE` Felder in einer Linie, das angetippte
     * Feld ist die MITTE.
     *
     * DAS ANGETIPPTE FELD IST DIE MITTE (seit v0.46). Bis v0.45 war es das
     * LINKE ENDE, und die Mauer wuchs von dort nach rechts. Am Bildschirm sah
     * das aus wie ein Fehler: Man tippt ein Feld an, und die Sperre erscheint
     * daneben. Wer eine Mauer legt, meint das Feld, das er anfasst — links und
     * rechts davon ist Zugabe.
     *
     * SEIT v0.80 GEHT SIE AUCH SENKRECHT (Nutzer-Wunsch 18.08.: „ein
     * Dreh-Knopf bei der Mauer, dass man sie auch vertikal platzieren kann").
     * `senkrecht` ist wahlfrei — ohne Angabe liegt sie waagerecht wie bisher,
     * und damit rechnet jeder alte Aufruf unverändert weiter.
     *
     * Die RICHTUNG steht nirgends im gespeicherten Stand, und das ist Absicht:
     * `stand.mauern` ist eine Feldliste (`[{felder, bis}]`). Eine senkrechte
     * Mauer passt dort ohne jede Änderung am Datenvertrag hinein — sie ist
     * einfach eine andere Liste. Gebraucht wird die Richtung nur, solange man
     * platziert.
     */
    mauerLegen(stand, feld, senkrecht) {
        const breite = SCHACH.breiteVon(stand);
        const hoehe = SCHACH.hoeheVon(stand);
        const reihe = SCHACH.reiheVon(feld, breite);
        const spalte = SCHACH.spalteVon(feld, breite);

        if (feld < 0 || feld >= SCHACH.felderVon(stand)) {
            return null;
        }

        /* Ein Schritt entlang der Mauer: senkrecht eine Reihe, sonst eine
           Spalte. Damit ist die Rechnung darunter für beide Lagen dieselbe. */
        const dr = senkrecht ? 1 : 0;
        const ds = senkrecht ? 0 : 1;
        const halb = Math.floor((SCHACH.MAUER_LAENGE - 1) / 2);

        const startReihe = reihe - halb * dr;
        const startSpalte = spalte - halb * ds;
        const endReihe = startReihe + (SCHACH.MAUER_LAENGE - 1) * dr;
        const endSpalte = startSpalte + (SCHACH.MAUER_LAENGE - 1) * ds;

        /* Am äussersten Rand geht sie nicht: Dort fehlt der Nachbar, den sie
           auf einer Seite braucht. Gilt jetzt für beide Achsen. */
        if (startReihe < 0 || startSpalte < 0 || endReihe >= hoehe || endSpalte >= breite) {
            return null;
        }

        const felder = [];
        for (let schritt = 0; schritt < SCHACH.MAUER_LAENGE; schritt++) {
            const ziel = SCHACH._feld(stand,
                startReihe + schritt * dr, startSpalte + schritt * ds);

            /*
             * Frei heisst: keine Figur und kein Riss.
             *
             * EINE MAUER DARF SEIT v0.85 AUF EINER MAUER LIEGEN (Wunsch T4).
             * Vorher stand hier `gesperrt`, und das schliesst Mauern mit ein —
             * genau deshalb ging es bisher nicht. Ein Riss bleibt verboten:
             * Dort ist der Boden weg, da lässt sich nichts aufstellen.
             * Wem die alte Mauer gehört, spielt keine Rolle — Mauern haben
             * keinen Besitzer, sie stehen einfach.
             */
            if (SCHACH.figurAuf(stand, ziel) !== "." || SCHACH.rissAuf(stand, ziel)) {
                return null;
            }
            felder.push(ziel);
        }

        /*
         * DIE FRIST GILT JE FELD, NICHT JE MAUER (seit v0.85).
         *
         * Liegt auf einem Zielfeld schon eine Mauer, ADDIERT sich ihre
         * Restzeit auf die neuen sechs Halbzüge; die übrigen Felder bekommen
         * die einfache Dauer. Genau so war der Wunsch: „auch wenn nur zwei
         * Felder mit der alten Mauer übereinstimmen, soll sich die Zeit nur
         * bei den zwei erhöhen, und das einzelne Feld hat die einfache Zeit."
         *
         * Am Datenvertrag ändert das nichts: `stand.mauern` bleibt
         * `[{felder, bis}]` — es stehen nur mehr Einträge darin, jeder mit
         * genau EINEM Feld. Eine ältere Fassung der App liest das unverändert
         * richtig (`felder` ist weiterhin eine Liste, `bis` weiterhin eine
         * Zahl); sie sieht lediglich drei kurze Mauern statt einer langen.
         */
        const bestand = SCHACH.mauern(stand);
        const fristen = {};

        for (const ziel of felder) {
            let rest = 0;
            for (const eintrag of bestand) {
                if (eintrag.felder.indexOf(ziel) !== -1) {
                    rest = Math.max(rest, eintrag.bis - stand.takt);
                }
            }
            fristen[ziel] = stand.takt + rest + SCHACH.MAUER_HALBZUEGE;
        }

        /*
         * Die Zielfelder aus dem Bestand herausschneiden — sie bekommen gleich
         * ihren eigenen Eintrag. Was von einer überbauten Mauer daneben noch
         * steht, behält seine alte Frist. Nur die noch stehenden übernehmen,
         * so räumt sich die Liste beim Legen von selbst auf.
         */
        const mauern = bestand
            .map((eintrag) => ({
                felder: eintrag.felder.filter((wo) => felder.indexOf(wo) === -1),
                bis: eintrag.bis
            }))
            .filter((eintrag) => eintrag.felder.length > 0)
            .concat(felder.map((ziel) => ({ felder: [ziel], bis: fristen[ziel] })));

        const verstaerkt = felder.some((ziel) =>
            fristen[ziel] > stand.takt + SCHACH.MAUER_HALBZUEGE);

        return {
            stand: Object.assign({}, stand, { mauern: mauern }),
            felder: felder,
            text: "Mauer auf " + SCHACH.feldName(felder[0], breite, SCHACH.hoeheVon(stand))
                + " bis " + SCHACH.feldName(felder[felder.length - 1], breite,
                    SCHACH.hoeheVon(stand))
                + (verstaerkt ? " (verstärkt)" : "")
        };
    },

    figurAuf(stand, feld) {
        if (feld < 0 || feld >= SCHACH.felderVon(stand)) {
            return "";
        }
        return stand.brett[feld];
    },

    /* Liefert eine Kopie des Bretts mit einem geänderten Feld. */
    _brettMit(brett, feld, figur) {
        return brett.substring(0, feld) + figur + brett.substring(feld + 1);
    },

    /* Feld des Königs einer Farbe, oder -1. Bei mehreren Königen das erste. */
    koenigFeld(stand, farbe) {
        const gesucht = (farbe === SCHACH.WEISS) ? "K" : "k";
        return stand.brett.indexOf(gesucht);
    },

    /* ---------------------------------------------------------------- *
     * Wege über das Brett (seit v3.6)
     *
     * Zwei Fragen, die sich ähneln und trotzdem verschieden beantwortet
     * werden müssen:
     *
     *   wegFelder        Welche Felder ZEICHNET man, um diese Bewegung zu
     *                    zeigen? Beim Springer das L — auch wenn er die
     *                    Felder dazwischen nie betreten hat.
     *   betreteneFelder  Welche Felder hat die Figur WIRKLICH betreten?
     *                    Beim Springer nur das Zielfeld. Daran hängt, was
     *                    unterwegs eingesammelt wird.
     *
     * Beides steht hier und nicht im Bildschirm-Code: Das Einsammeln ist eine
     * Regel, und die Anzeige soll dieselbe Rechnung benutzen wie die Regel —
     * sonst zeigt sie einen Weg, auf dem etwas anderes passiert.
     * ---------------------------------------------------------------- */

    /*
     * Verläuft der Weg gerade — waagerecht, senkrecht oder diagonal? Nur dann
     * gibt es überhaupt Felder dazwischen, die betreten werden.
     */
    istGeradeStrecke(stand, von, nach) {
        const breite = SCHACH.breiteVon(stand);
        const dReihe = SCHACH.reiheVon(nach, breite) - SCHACH.reiheVon(von, breite);
        const dSpalte = SCHACH.spalteVon(nach, breite) - SCHACH.spalteVon(von, breite);

        if (dReihe === 0 && dSpalte === 0) {
            return false;
        }
        return (dReihe === 0) || (dSpalte === 0)
            || (Math.abs(dReihe) === Math.abs(dSpalte));
    },

    /* Ist das ein Springersprung (ein Feld in der einen, zwei in der anderen
       Richtung)? Gemessen wird die BEWEGUNG, nicht die Figur — damit gilt es
       auch für die Fähigkeit „Sprung“. */
    istSprungWeg(stand, von, nach) {
        const breite = SCHACH.breiteVon(stand);
        const dReihe = Math.abs(SCHACH.reiheVon(nach, breite) - SCHACH.reiheVon(von, breite));
        const dSpalte = Math.abs(SCHACH.spalteVon(nach, breite) - SCHACH.spalteVon(von, breite));

        return (dReihe === 1 && dSpalte === 2) || (dReihe === 2 && dSpalte === 1);
    },

    /*
     * Die Felder, über die diese Bewegung führt — Start und Ziel eingeschlossen.
     *
     *   Springersprung  das L: erst die lange Achse, dann die kurze.
     *   Gerade Strecke  jedes Feld dazwischen.
     *   Alles andere    nur die beiden Enden (Teleport, Wiedergeburt,
     *                   Friedhof, Handel — dazwischen liegt kein Weg).
     *
     * `ohneWeg` (wahlfrei, seit v0.98) schaltet die Rechnung ab: Dann sind es
     * IMMER nur die beiden Enden. Gebraucht wird das vom Teleport, der auch
     * geradeaus über alles hinweg setzt — der Geometrie allein ist das nicht
     * anzusehen. Der Parameter steht hinten und hat eine Vorgabe, damit jeder
     * Aufruf von früher unverändert gilt.
     */
    wegFelder(stand, von, nach, ohneWeg) {
        if (von === nach) {
            return [von];
        }
        if (ohneWeg) {
            return [von, nach];
        }

        const breite = SCHACH.breiteVon(stand);
        const vonReihe = SCHACH.reiheVon(von, breite);
        const vonSpalte = SCHACH.spalteVon(von, breite);
        const dReihe = SCHACH.reiheVon(nach, breite) - vonReihe;
        const dSpalte = SCHACH.spalteVon(nach, breite) - vonSpalte;

        if (SCHACH.istSprungWeg(stand, von, nach)) {
            /* Der Knick liegt am Ende der langen Achse. Beide Teilstücke sind
               danach gerade, die Rekursion endet also sofort. */
            const knick = (Math.abs(dSpalte) > Math.abs(dReihe))
                ? SCHACH._feld(stand, vonReihe, vonSpalte + dSpalte)
                : SCHACH._feld(stand, vonReihe + dReihe, vonSpalte);

            return SCHACH.wegFelder(stand, von, knick)
                .concat(SCHACH.wegFelder(stand, knick, nach).slice(1));
        }

        if (!SCHACH.istGeradeStrecke(stand, von, nach)) {
            return [von, nach];
        }

        const schritte = Math.max(Math.abs(dReihe), Math.abs(dSpalte));
        const schrittReihe = Math.sign(dReihe);
        const schrittSpalte = Math.sign(dSpalte);
        const felder = [];

        for (let nummer = 0; nummer <= schritte; nummer++) {
            felder.push(SCHACH._feld(stand,
                vonReihe + schrittReihe * nummer,
                vonSpalte + schrittSpalte * nummer));
        }

        return felder;
    },

    /*
     * Die Felder, die die Figur auf diesem Weg WIRKLICH betritt — ohne das
     * Startfeld, auf dem sie schon stand.
     *
     * Wer springt, betritt nur sein Zielfeld: der Springer, die Fähigkeit
     * „Sprung“ (dieselbe Bewegung) und der Teleport (der über alles hinweg
     * geht). Alle anderen laufen über jedes Feld dazwischen — und sammeln
     * dabei ein, was dort liegt.
     *
     * BIS v0.97 GALT DAS FÜR DEN TELEPORT NUR ZUFÄLLIG: Erkannt wurde er an
     * der krummen Strecke. Ein Teleport zwei Felder GERADEAUS lief deshalb wie
     * ein gewöhnlicher Zug und sammelte unterwegs ein. `ohneWeg` sagt es jetzt
     * ausdrücklich (siehe `wegFelder`).
     */
    betreteneFelder(stand, von, nach, ohneWeg) {
        if (von === nach) {
            return [];
        }
        if (ohneWeg || !SCHACH.istGeradeStrecke(stand, von, nach)) {
            return [nach];
        }
        return SCHACH.wegFelder(stand, von, nach).slice(1);
    },

    /* Alle Königsfelder einer Farbe — auf dem Doppelbrett sind es zwei. */
    koenigFelder(stand, farbe) {
        const gesucht = (farbe === SCHACH.WEISS) ? "K" : "k";
        const liste = [];

        for (let feld = 0; feld < SCHACH.felderVon(stand); feld++) {
            if (stand.brett[feld] === gesucht) {
                liste.push(feld);
            }
        }
        return liste;
    },

    /* ---------------------------------------------------------------- *
     * Zugerzeugung
     *
     * Zweistufig, wie üblich:
     *   _rohzuege  — was die Figur ihrer Gangart nach dürfte
     *   zuege      — davon nur die, nach denen der eigene König nicht im
     *                Schach steht
     *
     * Auf Brettern ohne Schach-Begriff (koenigSchlagbar, siehe
     * schach-varianten.js) entfällt der zweite Schritt: Dort ist der König
     * eine Figur wie jede andere.
     * ---------------------------------------------------------------- */

    /*
     * Alle erlaubten Züge einer Figur. Liefert eine Liste aus
     * { von, nach, art, schlaegt, rochade, enPassant, umwandlung }.
     */
    zuege(stand, von) {
        const figur = SCHACH.figurAuf(stand, von);
        const farbe = SCHACH.farbeVon(figur);

        if (!farbe || farbe !== stand.amZug) {
            return [];
        }

        /*
         * Die Fessel: Diese Figur darf gerade gar nicht ziehen. Sie trifft eine
         * FARBE und lässt Könige stehen — anders als der Frost, der seit v0.56
         * eine FLÄCHE trifft und seit v0.80 auch Könige (siehe unten).
         */
        if (SCHACH.gefesselt(stand, von)) {
            return [];
        }

        let roh = SCHACH._rohzuege(stand, von);

        /*
         * DER FROST IST SEIT v0.80 EINE MAUER UM DEN BLOCK, KEIN ANKER
         * (Nutzer-Ansage 18.08.: „sie können sich dennoch in dem Frostbereich
         * bewegen … also wie eine Mauer wie am Rand").
         *
         * Bis v0.79 stand hier `return []` — wer eingefroren war, zog gar
         * nicht. Jetzt bleiben die Züge übrig, die INNERHALB des Blocks enden.
         *
         * Daraus fällt das, was der Nutzer wollte: Ein König allein im Block
         * kann nicht heraus, sich darin aber noch bewegen. Sind alle Felder
         * des Blocks besetzt oder bedroht, bleibt ihm nichts — und das ist
         * dann Matt oder Patt, gerechnet von `alleZuege` wie immer.
         *
         * Der Filter steht VOR den anderen: Was danach kommt (Sperren,
         * Schild, „eingefroren heisst unantastbar"), gilt genauso. Insbesondere
         * schlägt im Block niemanden, wer dort steht — die Zielfelder mit
         * Figuren fallen unten wieder heraus.
         */
        if (SCHACH.eingefroren(stand, von)) {
            const block = SCHACH.frostFelder(stand);
            roh = roh.filter((zug) => block.indexOf(zug.nach) !== -1);
        }

        /*
         * Auf eine Mauer zieht niemand — auch kein Springer.
         *
         * Dass ein Springer trotzdem DARÜBER hinwegkommt, ergibt sich von
         * selbst: Er fragt nie nach den Feldern dazwischen. Umgekehrt bleiben
         * Turm, Läufer und Dame schon im `_strahlzuege` davor stehen. Hier ist
         * deshalb nur noch das Zielfeld zu sperren — eine einzige Regel für
         * alle Figuren statt einer Sonderbehandlung je Gangart.
         */
        roh = roh.filter((zug) => !SCHACH.gesperrt(stand, zug.nach));

        /* Fähigkeit Schutzschild: Die geschützte Figur lässt sich nicht
           schlagen — der Gegner kann es gar nicht erst versuchen. */
        if (stand.schildFeld >= 0 && stand.schildFarbe !== farbe) {
            roh = roh.filter((zug) => zug.nach !== stand.schildFeld);
        }

        /*
         * Eingefroren heißt auch: unantastbar. Sonst wäre Frost nur eine
         * teurere Fessel — und eine Figur, die sich nicht wehren kann, einfach
         * nur ein Geschenk an den Gegner.
         *
         * Seit v0.56 gilt das für JEDEN, der den Block angreifen will, auch
         * für den, der ihn gelegt hat: Der Frost sperrt eine Fläche, er wählt
         * keine Seite. Das ist der Preis dafür, dass er gleich vier Felder
         * erfasst — man kann sich damit die eigene Beute wegfrieren.
         */
        roh = roh.filter((zug) => !SCHACH.eingefroren(stand, zug.nach));

        /*
         * Der König wird NIE geschlagen — auch nicht durch eine Fähigkeit.
         *
         * Im normalen Schach kann das gar nicht vorkommen, weil der Gegner
         * immer zuerst aus dem Schach ziehen muss. Mit dem Doppelzug schon:
         * Man setzt Schach und ist sofort wieder am Zug, ohne dass der Gegner
         * reagieren durfte. Ohne diese Sperre endete die Partie damit, dass
         * ein König vom Brett verschwindet, statt durch Schachmatt.
         *
         * GEFRAGT WIRD NACH DEM BESITZER (seit v0.49): Wer noch zwei Könige
         * hat, hat zwei Leben — sein König ist dann eine Figur wie jede andere
         * und darf geschlagen werden. Der letzte ist wieder unantastbar.
         */
        if (!SCHACH.koenigSchlagbarFuer(stand, SCHACH.gegner(farbe))) {
            roh = roh.filter((zug) => SCHACH.artVon(SCHACH.figurAuf(stand, zug.nach)) !== "K");
        }

        /* Und wer selbst kein Schach kennt, muss auch keines auflösen. */
        if (SCHACH.koenigSchlagbarFuer(stand, farbe)) {
            return roh;
        }

        return roh.filter((zug) => {
            const danach = SCHACH._ausfuehren(stand, zug);
            return !SCHACH.imSchach(danach, farbe);
        });
    },

    /* Alle erlaubten Züge der Seite, die am Zug ist. */
    alleZuege(stand) {
        const liste = [];
        for (let feld = 0; feld < SCHACH.felderVon(stand); feld++) {
            if (SCHACH.farbeVon(SCHACH.figurAuf(stand, feld)) === stand.amZug) {
                for (const zug of SCHACH.zuege(stand, feld)) {
                    liste.push(zug);
                }
            }
        }
        return liste;
    },

    _rohzuege(stand, von) {
        const figur = SCHACH.figurAuf(stand, von);
        const farbe = SCHACH.farbeVon(figur);
        const art = SCHACH.artVon(figur);

        if (!farbe) {
            return [];
        }

        let liste;
        switch (art) {
            case "B": liste = SCHACH._bauernzuege(stand, von, farbe); break;
            case "S": liste = SCHACH._springerzuege(stand, von, farbe); break;
            case "L": liste = SCHACH._strahlzuege(stand, von, farbe,
                [[-1, -1], [-1, 1], [1, -1], [1, 1]]); break;
            case "T": liste = SCHACH._strahlzuege(stand, von, farbe,
                [[-1, 0], [1, 0], [0, -1], [0, 1]]); break;
            case "D": liste = SCHACH._strahlzuege(stand, von, farbe,
                [[-1, -1], [-1, 1], [1, -1], [1, 1], [-1, 0], [1, 0], [0, -1], [0, 1]]); break;
            case "K": liste = SCHACH._koenigszuege(stand, von, farbe); break;
            default: return [];
        }

        /*
         * Fähigkeiten mit zusätzlichem Zugmuster (Sprung, Ausweichen,
         * Teleport): Solange sie wirken, darf jede eigene Figur zusätzlich so
         * ziehen. Doppelte Ziele werden nicht zweimal angeboten.
         *
         * Auch hier gilt die Umwandlung: Ein Bauer, der so auf die letzte
         * Reihe kommt, wird zur Dame (oder was man wählt) — siehe
         * `_mitUmwandlung`.
         */
        if (stand.zusatzFarbe === farbe && stand.zusatzMuster) {
            /*
             * `zusatzNurDieses` (Sprung, Teleport seit v0.48): Die Fähigkeit
             * IST der Zug — die gewohnte Gangart der Figur zählt in diesem
             * einen Zug nicht. Deshalb wird die bisherige Liste verworfen,
             * statt das Muster nur dazuzulegen.
             */
            if (stand.zusatzNurDieses) {
                liste = [];
            }

            for (const zug of SCHACH._musterzuege(stand, von, farbe, stand.zusatzMuster)) {
                if (!liste.some((vorhanden) => vorhanden.nach === zug.nach)) {
                    for (const einzeln of SCHACH._mitUmwandlung(stand, zug, farbe)) {
                        liste.push(einzeln);
                    }
                }
            }
        }

        return liste;
    },

    /*
     * Die Zusatzmuster der Fähigkeiten.
     *
     * „koenig“ ist der alte Name des Ausweich-Musters (Stände vor v3.6). Er
     * wird weiter verstanden, damit eine laufende Partie mit gesetztem
     * Zusatzmuster nicht plötzlich gar nichts mehr kann — additiver Vertrag.
     */
    _musterzuege(stand, von, farbe, muster) {
        if (muster === "springer") {
            return SCHACH._springerzuege(stand, von, farbe);
        }
        if (muster === "ausweichen" || muster === "koenig") {
            return SCHACH._nachbarzuege(stand, von, farbe);
        }
        if (muster === "umkreis2") {
            return SCHACH._umkreiszuege(stand, von, farbe, 2);
        }
        return [];
    },

    /*
     * Ausweichen: ein Feld in jede Richtung, aber NUR auf ein freies.
     *
     * Bis v3.5 durfte man damit auch schlagen — dann war Ausweichen keine
     * Notbremse mehr, sondern ein zusätzlicher Angriff mit jeder Figur. Und
     * am Bildschirm sah man rote Schlagfelder, auf die der Tipp dann doch
     * nichts tat. Ausweichen heisst jetzt, was es sagt: sich in Sicherheit
     * bringen.
     */
    _nachbarzuege(stand, von, farbe) {
        const liste = [];
        const breite = SCHACH.breiteVon(stand);
        const reihe = SCHACH.reiheVon(von, breite);
        const spalte = SCHACH.spalteVon(von, breite);

        for (let dr = -1; dr <= 1; dr++) {
            for (let ds = -1; ds <= 1; ds++) {
                if (dr === 0 && ds === 0) {
                    continue;
                }
                const r = reihe + dr;
                const s = spalte + ds;
                if (!SCHACH._imBrett(stand, r, s)) {
                    continue;
                }
                const ziel = SCHACH._feld(stand, r, s);
                if (SCHACH.figurAuf(stand, ziel) === ".") {
                    liste.push(SCHACH._zug(stand, von, ziel));
                }
            }
        }

        return liste;
    },

    /*
     * Teleport: auf ein FREIES Feld im Umkreis springen, über alles hinweg.
     * Bewusst ohne Schlagen — sonst wäre die Fähigkeit auf engem Raum eine
     * Allzweckwaffe gegen jede Figur in Reichweite.
     *
     * JEDER DIESER ZÜGE TRÄGT `ohneWeg` (seit v0.98, Wunsch #35). „Über alles
     * hinweg" heisst: Zwischen Start und Ziel liegt kein Weg — weder einer,
     * den man zeichnet, noch einer, auf dem man etwas einsammelt.
     *
     * DAS WAR NICHT NUR EINE FRAGE DER ANZEIGE. Ein Teleport über zwei Felder
     * GERADEAUS sah für `wegFelder` und `betreteneFelder` aus wie ein
     * gewöhnlicher Zwei-Felder-Zug: Das Brett zog eine Linie durch das Feld
     * dazwischen, und die Figur sammelte dort auch noch eine Lootbox ein.
     * Beides ist jetzt weg, und zwar aus DERSELBEN Angabe — Anzeige und Regel
     * dürfen bei einem Weg nie auseinanderlaufen.
     */
    _umkreiszuege(stand, von, farbe, weite) {
        const liste = [];
        const breite = SCHACH.breiteVon(stand);
        const reihe = SCHACH.reiheVon(von, breite);
        const spalte = SCHACH.spalteVon(von, breite);

        for (let dr = -weite; dr <= weite; dr++) {
            for (let ds = -weite; ds <= weite; ds++) {
                if (dr === 0 && ds === 0) {
                    continue;
                }
                const r = reihe + dr;
                const s = spalte + ds;
                if (!SCHACH._imBrett(stand, r, s)) {
                    continue;
                }
                const ziel = SCHACH._feld(stand, r, s);
                if (SCHACH.figurAuf(stand, ziel) === ".") {
                    liste.push(SCHACH._zug(stand, von, ziel, { ohneWeg: true }));
                }
            }
        }

        return liste;
    },

    /* Baut einen Zug-Eintrag. */
    _zug(stand, von, nach, zusatz) {
        const eintrag = {
            von: von,
            nach: nach,
            art: SCHACH.artVon(SCHACH.figurAuf(stand, von)),
            schlaegt: SCHACH.figurAuf(stand, nach) !== ".",
            rochade: "",
            enPassant: false,
            umwandlung: "",

            /* Setzt dieser Zug über alles hinweg? Nur der Teleport tut das
               (seit v0.98) — siehe `_umkreiszuege` und `wegFelder`. */
            ohneWeg: false
        };
        return Object.assign(eintrag, zusatz || {});
    },

    _imBrett(stand, reihe, spalte) {
        return reihe >= 0 && reihe < SCHACH.hoeheVon(stand)
            && spalte >= 0 && spalte < SCHACH.breiteVon(stand);
    },

    /* Reihe und Spalte zu einer Feldnummer im Brett dieses Standes. */
    _feld(stand, reihe, spalte) {
        return reihe * SCHACH.breiteVon(stand) + spalte;
    },

    _strahlzuege(stand, von, farbe, richtungen) {
        const liste = [];
        const breite = SCHACH.breiteVon(stand);
        const reihe = SCHACH.reiheVon(von, breite);
        const spalte = SCHACH.spalteVon(von, breite);

        for (const richtung of richtungen) {
            let r = reihe + richtung[0];
            let s = spalte + richtung[1];

            while (SCHACH._imBrett(stand, r, s)) {
                const ziel = SCHACH._feld(stand, r, s);
                const dort = SCHACH.figurAuf(stand, ziel);

                /* Eine Mauer stoppt den Strahl wie eine Figur — nur lässt sie
                   sich nicht schlagen, der Zug endet also davor. */
                if (SCHACH.gesperrt(stand, ziel)) {
                    break;
                }

                if (dort === ".") {
                    liste.push(SCHACH._zug(stand, von, ziel));
                } else {
                    if (SCHACH.farbeVon(dort) !== farbe) {
                        liste.push(SCHACH._zug(stand, von, ziel));
                    }
                    break;
                }

                r += richtung[0];
                s += richtung[1];
            }
        }

        return liste;
    },

    _springerzuege(stand, von, farbe) {
        const liste = [];
        const breite = SCHACH.breiteVon(stand);
        const reihe = SCHACH.reiheVon(von, breite);
        const spalte = SCHACH.spalteVon(von, breite);

        for (const sprung of SCHACH.SPRUENGE) {
            const r = reihe + sprung[0];
            const s = spalte + sprung[1];
            if (!SCHACH._imBrett(stand, r, s)) {
                continue;
            }
            const ziel = SCHACH._feld(stand, r, s);
            if (SCHACH.farbeVon(SCHACH.figurAuf(stand, ziel)) !== farbe) {
                liste.push(SCHACH._zug(stand, von, ziel));
            }
        }

        return liste;
    },

    /* ---------------------------------------------------------------- *
     * Rochade, für jede Spielart
     *
     * Bis v2.0 hing sie an den Standardplätzen des 8-mal-8-Bretts (König auf
     * e, Türme auf a und h) und war deshalb nur dort erlaubt. Seit v2.1 wird
     * sie aus der Stellung gelesen: König auf seinem Startfeld, ein Turm mit
     * Recht auf derselben Grundreihe, dazwischen frei. Damit funktioniert sie
     * auch auf dem 6er-Brett (König auf d), dem 10er (König auf f) und dem
     * Doppelbrett, wo jede Seite ZWEI Könige mit je zwei Türmen hat.
     * ---------------------------------------------------------------- */

    /*
     * Die Türme, mit denen DIESER König rochieren könnte: je Richtung der
     * nächstgelegene mit Recht.
     *
     * „Der nächstgelegene" ist die entscheidende Einschränkung. Auf dem
     * Doppelbrett stehen vier Türme je Seite; ohne sie gehörte der mittlere
     * Turm beiden Königen, und beim Zug des einen verlöre der andere sein
     * Recht.
     */
    _rochadeTuerme(stand, koenigFeld, farbe) {
        const breite = SCHACH.breiteVon(stand);
        const reihe = SCHACH.reiheVon(koenigFeld, breite);
        const spalte = SCHACH.spalteVon(koenigFeld, breite);
        const turm = (farbe === SCHACH.WEISS) ? "T" : "t";

        const gefunden = {};

        for (const feld of stand.rochadeFelder) {
            if (SCHACH.reiheVon(feld, breite) !== reihe
                || SCHACH.figurAuf(stand, feld) !== turm) {
                continue;
            }

            const turmSpalte = SCHACH.spalteVon(feld, breite);
            if (turmSpalte === spalte) {
                continue;
            }

            const richtung = (turmSpalte > spalte) ? "rechts" : "links";
            const abstand = Math.abs(turmSpalte - spalte);

            if (!gefunden[richtung] || abstand < gefunden[richtung].abstand) {
                gefunden[richtung] = { feld: feld, abstand: abstand };
            }
        }

        return Object.keys(gefunden).map((richtung) => gefunden[richtung].feld);
    },

    /*
     * Alle Rochaden, die dieser König machen könnte — mit Angabe, ob sie
     * erlaubt sind und warum nicht. EINE Stelle für Zugerzeugung und
     * Begründung; sonst liefen beide auseinander.
     */
    _rochadeWege(stand, koenigFeld, farbe) {
        const wege = [];
        const variante = SCHACH.varianteVon(stand);
        const breite = SCHACH.breiteVon(stand);
        const reihe = SCHACH.reiheVon(koenigFeld, breite);
        const spalte = SCHACH.spalteVon(koenigFeld, breite);
        const koenig = (farbe === SCHACH.WEISS) ? "K" : "k";

        /* Hat dieser König sein Recht schon verspielt, gibt es nichts zu prüfen. */
        if (stand.rochadeKoenige.indexOf(koenigFeld) === -1) {
            return [{
                seite: "kurz",
                turmFeld: -1,
                zielFeld: -1,
                turmZiel: -1,
                moeglich: false,
                grund: "Das Recht ist verfallen: König oder Turm haben sich schon bewegt."
            }];
        }

        for (const turmFeld of SCHACH._rochadeTuerme(stand, koenigFeld, farbe)) {
            const turmSpalte = SCHACH.spalteVon(turmFeld, breite);
            const richtung = (turmSpalte > spalte) ? 1 : -1;
            const zielSpalte = spalte + 2 * richtung;

            const weg = {
                seite: (richtung === 1) ? "kurz" : "lang",
                turmFeld: turmFeld,
                zielFeld: SCHACH._feld(stand, reihe, zielSpalte),
                turmZiel: SCHACH._feld(stand, reihe, zielSpalte - richtung),
                moeglich: false,
                grund: ""
            };

            if (!SCHACH._imBrett(stand, reihe, zielSpalte)) {
                weg.grund = "Der König hätte keine zwei Felder Platz.";
                wege.push(weg);
                continue;
            }
            if (SCHACH.figurAuf(stand, koenigFeld) !== koenig) {
                weg.grund = "Der König steht nicht mehr auf seinem Startfeld.";
                wege.push(weg);
                continue;
            }

            /* Alles zwischen König und Turm muss frei sein. */
            let frei = true;
            for (let lauf = spalte + richtung; lauf !== turmSpalte; lauf += richtung) {
                if (SCHACH.figurAuf(stand, SCHACH._feld(stand, reihe, lauf)) !== ".") {
                    frei = false;
                    break;
                }
            }
            if (!frei) {
                weg.grund = "Zwischen König und Turm steht noch eine Figur.";
                wege.push(weg);
                continue;
            }

            /*
             * Eine Mauer im Weg zählt wie eine Figur — auch hier gilt: Nur der
             * Springer setzt darüber hinweg, und der rochiert nicht. Geprüft
             * werden die Felder ZWISCHEN beiden und die beiden Zielfelder.
             */
            let mauerImWeg = false;
            for (let lauf = spalte + richtung; lauf !== turmSpalte; lauf += richtung) {
                if (SCHACH.gesperrt(stand, SCHACH._feld(stand, reihe, lauf))) {
                    mauerImWeg = true;
                    break;
                }
            }
            if (mauerImWeg || SCHACH.gesperrt(stand, weg.zielFeld)
                || SCHACH.gesperrt(stand, weg.turmZiel)) {
                weg.grund = "Eine Mauer steht im Weg.";
                wege.push(weg);
                continue;
            }

            /* Auf Brettern ohne Schach entfällt die Bedrohungsprüfung. */
            if (!variante.koenigSchlagbar) {
                if (SCHACH.imSchach(stand, farbe)) {
                    weg.grund = "Der König steht im Schach.";
                    wege.push(weg);
                    continue;
                }
                const gegner = SCHACH.gegner(farbe);
                const ueber = SCHACH._feld(stand, reihe, spalte + richtung);

                if (SCHACH._feldBedroht(stand, ueber, gegner)) {
                    weg.grund = "Der König müsste über ein bedrohtes Feld ziehen.";
                    wege.push(weg);
                    continue;
                }
                if (SCHACH._feldBedroht(stand, weg.zielFeld, gegner)) {
                    weg.grund = "Der König stünde danach im Schach.";
                    wege.push(weg);
                    continue;
                }
            }

            weg.moeglich = true;
            wege.push(weg);
        }

        return wege;
    },

    _koenigszuege(stand, von, farbe) {
        const liste = [];
        const breite = SCHACH.breiteVon(stand);
        const reihe = SCHACH.reiheVon(von, breite);
        const spalte = SCHACH.spalteVon(von, breite);

        for (let dr = -1; dr <= 1; dr++) {
            for (let ds = -1; ds <= 1; ds++) {
                if (dr === 0 && ds === 0) {
                    continue;
                }
                const r = reihe + dr;
                const s = spalte + ds;
                if (!SCHACH._imBrett(stand, r, s)) {
                    continue;
                }
                const ziel = SCHACH._feld(stand, r, s);
                if (SCHACH.farbeVon(SCHACH.figurAuf(stand, ziel)) !== farbe) {
                    liste.push(SCHACH._zug(stand, von, ziel));
                }
            }
        }

        /* Rochade — in jeder Spielart, aus der Stellung gelesen. */
        for (const weg of SCHACH._rochadeWege(stand, von, farbe)) {
            if (weg.moeglich) {
                liste.push(SCHACH._zug(stand, von, weg.zielFeld, {
                    rochade: weg.seite,
                    turmVon: weg.turmFeld,
                    turmNach: weg.turmZiel
                }));
            }
        }

        return liste;
    },

    /*
     * Die letzte Reihe für diese Farbe — dort wandelt ein Bauer um.
     *
     * Gilt für senkrecht ziehende Bauern, also für jedes Brett ausser dem
     * Kreuz. Wer wissen will, ob ein bestimmter Bauer am Ziel ist, fragt seit
     * v0.65 `SCHACH.bauernAmZiel` — das kennt auch die waagerechten.
     */
    letzteReiheVon(stand, farbe) {
        return (farbe === SCHACH.WEISS) ? 0 : SCHACH.hoeheVon(stand) - 1;
    },

    /*
     * Aus EINEM Zug werden vier, wenn ein Bauer damit die letzte Reihe
     * erreicht — je einer für Dame, Turm, Läufer und Springer. Sonst bleibt es
     * der eine Zug.
     *
     * WARUM DAS EINE EIGENE FUNKTION IST (seit v0.41): Die Umwandlung hing bis
     * dahin allein an `_bauernzuege`. Ein Bauer, der über ein Zusatzmuster
     * (Sprung, Ausweichen, Teleport) auf die letzte Reihe kam, blieb deshalb
     * ein Bauer und stand dort für immer fest — gemeldet als „Sprung muss zur
     * Dame werden". Die Regel gehört an den ZUG, nicht an die Gangart.
     */
    _mitUmwandlung(stand, zug, farbe) {
        if (SCHACH.artVon(SCHACH.figurAuf(stand, zug.von)) !== "B") {
            return [zug];
        }
        /* Am Ziel ist der Bauer auf der Seite GEGENÜBER seiner Startseite —
           seit v0.65 auch dann, wenn er waagerecht zieht. */
        if (!SCHACH.bauernAmZiel(stand, zug.nach, farbe, zug.von)) {
            return [zug];
        }

        return ["D", "T", "L", "S"].map(
            (art) => Object.assign({}, zug, { umwandlung: art }));
    },

    _bauernzuege(stand, von, farbe) {
        const liste = [];
        const breite = SCHACH.breiteVon(stand);
        const hoehe = SCHACH.hoeheVon(stand);
        const reihe = SCHACH.reiheVon(von, breite);
        const spalte = SCHACH.spalteVon(von, breite);

        /* SEIT v0.65 FRAGT DER BAUER SEINE STARTSEITE, nicht seine Farbe —
           siehe „Wohin ein Bauer zieht". Für jedes Brett von früher liefert
           das exakt dasselbe wie die alte Farbregel. */
        const richtung = SCHACH.bauernRichtung(stand, von, farbe);
        /*
         * VON WO DARF EIN BAUER ZWEI FELDER? (seit v0.52)
         *
         * Bis v0.51 war es genau EINE Reihe — `hoehe - 2` für Weiss. Das
         * stimmte, solange Bauern nur dort starten können. Mit der Zufallsarmee
         * stehen sie irgendwo auf den beiden Grundreihen, auch ganz hinten, und
         * hatten dort keinen Doppelschritt: ihr erster Zug war ein einzelner.
         *
         * Erlaubt sind jetzt BEIDE Grundreihen. Für jede andere Spielart ändert
         * das nichts — hinter der eigenen Bauernreihe steht die Grundreihe voll,
         * und ein weisser Bauer kann sie nie erreichen (er zieht ja nach vorn).
         * Die Regel bleibt für den Spieler also überall dieselbe: Beim ersten
         * Zug zwei Felder, danach eines.
         */
        /* Seit v0.65 sind es die beiden Reihen (oder Spalten) an der
           STARTSEITE — für Weiss unten und Schwarz oben ist das genau die
           Regel von vorher. */
        const darfDoppelt = SCHACH.bauernDarfDoppelt(stand, von, farbe);

        const anhaengen = (zug) => {
            for (const einzeln of SCHACH._mitUmwandlung(stand, zug, farbe)) {
                liste.push(einzeln);
            }
        };

        /*
         * Ein Feld vor.
         *
         * Die Mauer muss hier ausdrücklich geprüft werden: Der Filter in
         * `zuege()` sperrt nur das ZIELFELD, und beim Doppelschritt liegt das
         * dahinter. Ohne diese Prüfung setzte ein Bauer über eine Mauer hinweg
         * — das darf nur der Springer.
         */
        if (SCHACH._imBrett(stand, reihe + richtung.dr, spalte + richtung.ds)) {
            const einsVor = SCHACH._feld(stand, reihe + richtung.dr, spalte + richtung.ds);

            if (SCHACH.figurAuf(stand, einsVor) === "." && !SCHACH.gesperrt(stand, einsVor)) {
                anhaengen(SCHACH._zug(stand, von, einsVor));

                /* Zwei Felder aus der Grundstellung. */
                if (darfDoppelt && SCHACH._imBrett(stand,
                    reihe + 2 * richtung.dr, spalte + 2 * richtung.ds)) {

                    const zweiVor = SCHACH._feld(stand,
                        reihe + 2 * richtung.dr, spalte + 2 * richtung.ds);

                    if (SCHACH.figurAuf(stand, zweiVor) === ".") {
                        liste.push(SCHACH._zug(stand, von, zweiVor));
                    }
                }
            }
        }

        /* Schlagen, schräg nach vorn — welche zwei Felder das sind, rechnet
           `bauernSchlagfelder` aus der Laufrichtung. */
        for (const ziel of SCHACH.bauernSchlagfelder(stand, von, farbe)) {
            const dort = SCHACH.figurAuf(stand, ziel);

            if (dort !== "." && SCHACH.farbeVon(dort) !== farbe) {
                anhaengen(SCHACH._zug(stand, von, ziel));

            } else if (dort === "." && stand.enPassant
                && SCHACH.feldNummer(stand.enPassant, breite, hoehe) === ziel) {
                /*
                 * En passant: schlägt den Bauern, der gerade zwei Felder zog.
                 * `enPassantFeld` ist das Feld, auf dem er WIRKLICH steht — es
                 * ist nicht das Zielfeld. Wer sich merken will, wo eine Figur
                 * fiel (Fähigkeit „Wiederbelebung"), braucht genau dieses.
                 *
                 * SEIT v0.65 STEHT ES IM STAND (`enPassantOpfer`). Bis dahin
                 * wurde es aus dem Zielfeld zurückgerechnet — das ging nur,
                 * solange BEIDE Bauern senkrecht ziehen. Auf dem Kreuz kann
                 * der Doppelschritt waagerecht gewesen sein, und dann liegt
                 * das Opfer woanders. Fehlt der Eintrag (Partien von früher),
                 * gilt die alte Rechnung.
                 */
                const opfer = Number.isInteger(stand.enPassantOpfer)
                    && stand.enPassantOpfer >= 0
                    ? stand.enPassantOpfer
                    : SCHACH._feld(stand,
                        SCHACH.reiheVon(ziel, breite) - richtung.dr,
                        SCHACH.spalteVon(ziel, breite) - richtung.ds);

                liste.push(SCHACH._zug(stand, von, ziel, {
                    enPassant: true,
                    schlaegt: true,
                    enPassantFeld: opfer
                }));
            }
        }

        return liste;
    },

    /* ---------------------------------------------------------------- *
     * Bedrohung und Schach
     * ---------------------------------------------------------------- */

    /*
     * Wird das Feld von der angegebenen Farbe angegriffen?
     * Bewusst ohne _rohzuege, um keine Endlosschleife über die Rochade zu
     * bauen: Hier wird von jedem Feld aus rückwärts gedacht.
     */
    _feldBedroht(stand, feld, farbe) {
        const breite = SCHACH.breiteVon(stand);
        const reihe = SCHACH.reiheVon(feld, breite);
        const spalte = SCHACH.spalteVon(feld, breite);

        /*
         * BAUERN — SEIT v0.65 WIRD JEDER EINZELN GEFRAGT.
         *
         * Bis v0.64 stand hier die Umkehrung der Farbregel: Ein weisser Bauer
         * greift von schräg unten an, ein schwarzer von schräg oben. Mit
         * waagerecht ziehenden Bauern (Kreuz) stimmt das nicht mehr.
         *
         * Ein angreifender Bauer steht in jedem Fall auf einem der vier
         * DIAGONALEN Nachbarfelder — gleich, in welche Richtung er zieht.
         * Also werden die vier durchgegangen, und für jeden Bauern dort wird
         * seine EIGENE Schlagreichweite gefragt. Das ist exakt statt geraten
         * und kostet dieselben vier Prüfungen wie vorher zwei.
         */
        for (const dr of [-1, 1]) {
            for (const ds of [-1, 1]) {
                const r = reihe + dr;
                const s = spalte + ds;
                if (!SCHACH._imBrett(stand, r, s)) {
                    continue;
                }

                const nachbar = SCHACH._feld(stand, r, s);
                const dort = SCHACH.figurAuf(stand, nachbar);

                if (SCHACH.artVon(dort) !== "B" || SCHACH.farbeVon(dort) !== farbe) {
                    continue;
                }
                if (SCHACH.bauernSchlagfelder(stand, nachbar, farbe).indexOf(feld) !== -1) {
                    return true;
                }
            }
        }

        /* Springer — und jede andere Figur, solange die Fähigkeit Sprung der
           angreifenden Seite aktiv ist. */
        const sprungFuerAlle = (stand.zusatzFarbe === farbe && stand.zusatzMuster === "springer");
        for (const sprung of SCHACH.SPRUENGE) {
            const r = reihe + sprung[0];
            const s = spalte + sprung[1];
            if (SCHACH._imBrett(stand, r, s)) {
                const dort = SCHACH.figurAuf(stand, SCHACH._feld(stand, r, s));
                if (SCHACH.farbeVon(dort) === farbe
                    && (SCHACH.artVon(dort) === "S" || sprungFuerAlle)) {
                    return true;
                }
            }
        }

        /*
         * König (Nachbarfelder).
         *
         * AUSWEICHEN ZÄHLT HIER NICHT MIT, und das ist Absicht: Seit v3.5 zieht
         * es nur noch auf FREIE Felder (`_nachbarzuege`). Wer nicht schlagen
         * kann, bedroht auch nichts — eine Figur mit Ausweichen daneben ist
         * kein Schach. Bis v0.40 stand hier eine Prüfung auf den alten
         * Musternamen „koenig"; sie stammte aus der Zeit, als Ausweichen noch
         * schlagen durfte, und hätte ein falsches Schachmatt erzeugen können.
         * Der Sprung bleibt dagegen drin: Er schlägt sehr wohl.
         */
        for (let dr = -1; dr <= 1; dr++) {
            for (let ds = -1; ds <= 1; ds++) {
                if (dr === 0 && ds === 0) {
                    continue;
                }
                const r = reihe + dr;
                const s = spalte + ds;
                if (SCHACH._imBrett(stand, r, s)) {
                    const dort = SCHACH.figurAuf(stand, SCHACH._feld(stand, r, s));
                    if (SCHACH.farbeVon(dort) === farbe && SCHACH.artVon(dort) === "K") {
                        return true;
                    }
                }
            }
        }

        /* Turm und Dame gerade, Läufer und Dame schräg. */
        const strahlen = [
            { richtungen: [[-1, 0], [1, 0], [0, -1], [0, 1]], arten: ["T", "D"] },
            { richtungen: [[-1, -1], [-1, 1], [1, -1], [1, 1]], arten: ["L", "D"] }
        ];

        for (const strahl of strahlen) {
            for (const richtung of strahl.richtungen) {
                let r = reihe + richtung[0];
                let s = spalte + richtung[1];

                while (SCHACH._imBrett(stand, r, s)) {
                    /*
                     * EINE SPERRE HÄLT DEN STRAHL AUF (seit v0.60, Wunsch #20).
                     *
                     * Bis v0.59 fragte diese Schleife nur nach Figuren — eine
                     * Mauer oder ein Loch stand ihr nicht im Weg. Ein Turm gab
                     * dadurch quer durch ein Loch hindurch Schach, obwohl er
                     * dort gar nicht hinziehen kann: `_strahl` (die
                     * Zugerzeugung) bricht an derselben Stelle seit v3.3 ab.
                     * Anzeige und Regel liefen also auseinander, und im
                     * schlimmsten Fall stand ein Schachmatt auf dem Brett, das
                     * keines war.
                     *
                     * Nur die STRAHLEN betrifft es: Springer springen ohnehin
                     * darüber hinweg, und Bauern wie Könige greifen ein
                     * Nachbarfeld an — auf einem gesperrten Feld steht nie eine
                     * Figur, also gibt es dort nichts zu prüfen.
                     */
                    if (SCHACH.gesperrt(stand, SCHACH._feld(stand, r, s))) {
                        break;
                    }

                    const dort = SCHACH.figurAuf(stand, SCHACH._feld(stand, r, s));
                    if (dort !== ".") {
                        if (SCHACH.farbeVon(dort) === farbe
                            && strahl.arten.indexOf(SCHACH.artVon(dort)) !== -1) {
                            return true;
                        }
                        break;
                    }
                    r += richtung[0];
                    s += richtung[1];
                }
            }
        }

        return false;
    },

    /* ---------------------------------------------------------------- *
     * Rochade: warum sie geht oder nicht geht
     * ---------------------------------------------------------------- */

    /*
     * Liefert für beide Seiten, ob die Rochade möglich ist — und wenn nicht,
     * warum nicht:
     *
     *     [ { seite: "kurz", turmFeld: 63, zielFeld: 62,
     *         moeglich: false, grund: "Zwischen König und Turm steht noch eine Figur." } ]
     *
     * Warum das ins Regelwerk gehört und nicht in den Bildschirm: Die Frage
     * „warum darf ich gerade nicht rochieren" ist eine REGELFRAGE. Würde der
     * Bildschirm sie selbst beantworten, gäbe es die Bedingungen zweimal — und
     * die zweite Fassung liefe irgendwann der ersten hinterher. Der Bildschirm
     * zeigt nur an, was hier steht.
     */
    rochadeLage(stand, farbe) {
        const variante = SCHACH.varianteVon(stand);

        if (!variante.rochade) {
            return [
                { seite: "kurz", turmFeld: -1, zielFeld: -1, moeglich: false,
                    grund: "In dieser Spielart gibt es keine Rochade." },
                { seite: "lang", turmFeld: -1, zielFeld: -1, moeglich: false,
                    grund: "In dieser Spielart gibt es keine Rochade." }
            ];
        }

        /* Auf dem Doppelbrett hat jede Seite zwei Könige — jeder bekommt seine
           eigenen Einträge. */
        const antworten = [];

        for (const koenigFeld of SCHACH.koenigFelder(stand, farbe)) {
            for (const weg of SCHACH._rochadeWege(stand, koenigFeld, farbe)) {
                antworten.push({
                    seite: weg.seite,
                    koenigFeld: koenigFeld,
                    turmFeld: weg.turmFeld,
                    zielFeld: weg.zielFeld,
                    moeglich: weg.moeglich,
                    grund: weg.grund
                });
            }
        }

        /* Damit der Bildschirm sich auf zwei Einträge verlassen kann, gibt es
           auch dann je einen für kurz und lang, wenn gar kein Turm mehr steht. */
        for (const seite of ["kurz", "lang"]) {
            if (!antworten.some((eintrag) => eintrag.seite === seite)) {
                antworten.push({
                    seite: seite,
                    koenigFeld: -1,
                    turmFeld: -1,
                    zielFeld: -1,
                    moeglich: false,
                    grund: "Das Recht ist verfallen: König oder Turm haben sich schon bewegt."
                });
            }
        }

        antworten.sort((einer, anderer) => (einer.seite === "kurz") ? -1 : 1);
        return antworten;
    },

    /*
     * ZÄHLT DER KÖNIG DIESER FARBE GERADE ALS GEWÖHNLICHE FIGUR? (seit v0.49)
     *
     * Zwei Wege führen dorthin, und sie sind verschieden:
     *
     *   `koenigSchlagbar`   Eigenschaft der SPIELART: Auf diesem Brett gibt es
     *                       nie Schach und nie Matt (Doppelbrett). Die Antwort
     *                       hängt nicht von der Stellung ab.
     *
     *   `koenigeAlsLeben`   Eigenschaft der STELLUNG: Solange eine Seite mehr
     *                       als einen König hat, sind ihre Könige gewöhnliche
     *                       Figuren — man schlägt sie einfach. Beim LETZTEN
     *                       kippt es: Er ist ein richtiger König, mit Schach und
     *                       Matt. Das sind die zwei Leben der Spielart
     *                       „Zufallsarmee".
     *
     * Die Frage wird JE FARBE gestellt, nicht für das Brett. Weiss kann zwei
     * Könige haben und Schwarz einen — dann kann Weiss nicht ins Schach kommen,
     * Schwarz schon, und beides gilt gleichzeitig.
     */
    koenigSchlagbarFuer(stand, farbe) {
        const variante = SCHACH.varianteVon(stand);

        if (variante.koenigSchlagbar) {
            return true;
        }

        /*
         * `koenigeAlsLeben` kommt aus zwei Quellen (seit v0.51): aus der
         * SPIELART (die alte Spielart „Zufallsarmee", jetzt versteckt) oder aus
         * dem STAND. Der Stand ist der neue Weg: Seit die Zufallsarmee ein
         * Haken ist, kann sie auf jeder Spielart liegen — und `schach.js` sieht
         * nur den Stand, nie die Regeln der Partie. Also schreibt
         * `SCHACH_RUNDE` sie beim Anlegen in den Stand hinein.
         */
        if (!variante.koenigeAlsLeben && !stand.koenigeAlsLeben) {
            return false;
        }
        return SCHACH.koenigFelder(stand, farbe).length > 1;
    },

    /*
     * Steht der König dieser Farbe im Schach?
     * Wo der König als gewöhnliche Figur zählt, gibt es kein Schach.
     */
    imSchach(stand, farbe) {
        if (SCHACH.koenigSchlagbarFuer(stand, farbe)) {
            return false;
        }
        const koenig = SCHACH.koenigFeld(stand, farbe);
        if (koenig === -1) {
            return false;
        }
        return SCHACH._feldBedroht(stand, koenig, SCHACH.gegner(farbe));
    },

    /* ---------------------------------------------------------------- *
     * Ziehen
     * ---------------------------------------------------------------- */

    /* Führt einen Zug aus, OHNE Prüfung auf Schach — nur intern. */
    _ausfuehren(stand, zug) {
        const breite = SCHACH.breiteVon(stand);

        /* Fähigkeit Doppelzug: Die Farbe bleibt am Zug, die Fähigkeit ist
           damit verbraucht. */
        const nochmal = (stand.extraZug === stand.amZug);

        const neu = {
            variante: stand.variante,
            breite: stand.breite,
            hoehe: stand.hoehe,
            brett: stand.brett,
            amZug: nochmal ? stand.amZug : SCHACH.gegner(stand.amZug),
            rochade: stand.rochade,
            rochadeFelder: stand.rochadeFelder.slice(),
            rochadeKoenige: stand.rochadeKoenige.slice(),
            enPassant: "",
            halbzuege: stand.halbzuege + 1,
            takt: stand.takt + 1,
            zugNummer: stand.zugNummer + ((stand.amZug === SCHACH.SCHWARZ && !nochmal) ? 1 : 0),
            extraZug: nochmal ? "" : stand.extraZug,

            /* Ein zusätzliches Zugmuster gilt für genau einen Zug. */
            zusatzFarbe: (stand.zusatzFarbe === stand.amZug) ? "" : stand.zusatzFarbe,
            zusatzMuster: (stand.zusatzFarbe === stand.amZug) ? "" : stand.zusatzMuster,
            zusatzNurDieses: (stand.zusatzFarbe === stand.amZug)
                ? false : stand.zusatzNurDieses,

            /* Gilt für die ganze Partie und wandert deshalb unverändert mit. */
            koenigeAlsLeben: stand.koenigeAlsLeben,

            sprungAktiv: "",

            /*
             * Das Schild hält den nächsten gegnerischen Zug aus; danach ist es
             * verbraucht. Zieht die geschützte Figur selbst, wandert es nicht
             * mit — sie ist dann ja woanders.
             */
            schildFeld: -1,
            schildFarbe: "",

            /*
             * DER FROST gilt für den nächsten Zug der betroffenen Seite — ein
             * Halbzug, wie bisher. Nur die Fläche ist grösser geworden.
             */
            frostFeld: (stand.frostFarbe === stand.amZug) ? -1 : stand.frostFeld,
            frostFelder: (stand.frostFarbe === stand.amZug)
                ? [] : SCHACH.frostFelder(stand).slice(),
            frostFarbe: (stand.frostFarbe === stand.amZug) ? "" : stand.frostFarbe,

            /*
             * DIE FESSEL LÄUFT SEIT v0.56 NACH DER UHR AB, nicht mehr nach dem
             * ersten Zug der gefesselten Seite. Verglichen wird gegen den NEUEN
             * Takt (`stand.takt + 1`) — dieser Halbzug ist ja gerade vorbei.
             *
             * Warum `takt` und nicht `halbzuege`: Der Zähler der
             * Fünfzig-Züge-Regel springt bei jedem Bauernzug auf 0 zurück, und
             * eine Fessel mit `bis = halbzuege + 4` wäre nach einem einzigen
             * Bauernzug unsterblich. Dieselbe Falle wie bei den Mauern.
             */
            fesselFeld: (stand.fesselBis > stand.takt + 1) ? stand.fesselFeld : -1,
            fesselFarbe: (stand.fesselBis > stand.takt + 1) ? stand.fesselFarbe : "",
            fesselBis: (stand.fesselBis > stand.takt + 1) ? stand.fesselBis : 0,

            /* Das volle Glas läuft nach Zugzähler ab, nicht nach Farbe. */
            glasFarbe: stand.glasFarbe,
            glasBis: stand.glasBis,

            /*
             * ENTTARNEN UND VERSTECKEN laufen genau wie das Glas nach dem
             * Zugzähler ab und wandern deshalb unverändert mit.
             *
             * BIS v0.98 STANDEN SIE HIER NICHT — und dieser Stand wird als
             * Objekt-Literal gebaut, nicht aus dem alten kopiert. Ein Feld,
             * das hier fehlt, ist nach dem nächsten Zug einfach weg. Genau
             * das war die Meldung #36: „Enttarnen ist sofort verschwunden
             * nach dem Einsammeln und Zugwechsel." Die Fähigkeit versprach
             * sechs Halbzüge und hielt keinen einzigen.
             */
            enttarntFarbe: stand.enttarntFarbe,
            enttarntBis: stand.enttarntBis,
            verstecktFarbe: stand.verstecktFarbe,
            verstecktBis: stand.verstecktBis,

            /* Abgelaufene Mauern verschwinden hier — sonst wüchse die Liste
               über die ganze Partie, obwohl längst nichts mehr steht. */
            mauern: SCHACH.mauern(stand),

            /* Risse laufen nicht ab: Sie wandern unverändert mit. */
            risse: SCHACH.risse(stand),

            /* Geliehene Figuren wandern mit ihrem Zug mit; eine geschlagene
               verliert ihren Eintrag. */
            geliehen: SCHACH._geliehenNachfuehren(stand, zug.von, zug.nach),

            /* Wird weiter unten nachgeführt, sobald feststeht, ob der Bauer
               umgewandelt oder en passant geschlagen hat. */
            bauernSeiten: [],

            /*
             * WEM WELCHE STARTSEITE GEHÖRT, steht für die ganze Partie fest
             * (seit v0.72) — es wandert deshalb unverändert mit.
             *
             * BIS v0.98 FEHLTE ES HIER, und damit galt die Zusage nicht: Nach
             * dem ersten Zug war der Eintrag weg, und `startSeitenVon` fiel
             * still auf seinen zweiten Weg zurück (die Bauern). Auf dem Kreuz
             * heisst das genau den Fehler, den v0.72 verhindern sollte — die
             * Ansicht dreht sich, sobald der letzte Bauer einer Seite fällt.
             * Die Listen darin werden nie an Ort und Stelle geändert, eine
             * flache Kopie genügt.
             */
            startSeiten: Object.assign({}, stand.startSeiten),

            /*
             * Welcher Bauer seinen ersten eigenen Zug schon gemacht hat (seit
             * v0.98). Wird weiter unten nachgeführt, sobald der Zug feststeht.
             */
            bauernZog: [],
            bauernZugFassung: stand.bauernZugFassung,

            /* En passant gilt genau einen Halbzug — beides wird unten neu
               gesetzt, wenn dieser Zug ein Doppelschritt war. */
            enPassantOpfer: -1
        };

        if (stand.schildFeld >= 0 && stand.schildFarbe === stand.amZug
            && stand.schildFeld !== zug.von) {
            /* Die eigene Seite zieht mit einer ANDEREN Figur: Das Schild bleibt. */
            neu.schildFeld = stand.schildFeld;
            neu.schildFarbe = stand.schildFarbe;
        }

        neu.sprungAktiv = (neu.zusatzMuster === "springer") ? neu.zusatzFarbe : "";

        const figur = SCHACH.figurAuf(stand, zug.von);
        const farbe = SCHACH.farbeVon(figur);
        const art = SCHACH.artVon(figur);

        let brett = neu.brett;

        /* Grundbewegung. */
        brett = SCHACH._brettMit(brett, zug.von, ".");

        /*
         * Bei der Rochade wird der Turm ZUERST vom Brett genommen. Auf schmalen
         * Brettern (6 Spalten) landet der König auf dem Feld, auf dem der Turm
         * steht — würde der Turm später geräumt, verschwände dabei der König.
         */
        if (zug.rochade && Number.isInteger(zug.turmVon)) {
            brett = SCHACH._brettMit(brett, zug.turmVon, ".");
        }
        const zielFigur = zug.umwandlung
            ? ((farbe === SCHACH.WEISS) ? zug.umwandlung : zug.umwandlung.toLowerCase())
            : figur;
        brett = SCHACH._brettMit(brett, zug.nach, zielFigur);

        /* En passant: der geschlagene Bauer steht nicht auf dem Zielfeld. */
        if (zug.enPassant) {
            const opferReihe = SCHACH.reiheVon(zug.von, breite);
            const opfer = opferReihe * breite + SCHACH.spalteVon(zug.nach, breite);
            brett = SCHACH._brettMit(brett, opfer, ".");
        }

        /* Rochade: der Turm zieht mit. Wohin, steht im Zug selbst — auf einem
           16 Felder breiten Brett gibt es keine festen Plätze. */
        if (zug.rochade && Number.isInteger(zug.turmNach)) {
            brett = SCHACH._brettMit(brett, zug.turmNach, (farbe === SCHACH.WEISS) ? "T" : "t");
        }

        neu.brett = brett;

        /*
         * Rochaderechte verfallen, sobald König oder Turm bewegt wurden — oder
         * ein Turm geschlagen wird. Beim König verfallen alle Rechte seiner
         * Grundreihe; auf dem Doppelbrett behält der zweite König seine.
         */
        if (neu.rochadeFelder.length > 0) {
            let felderRecht = neu.rochadeFelder
                .filter((feld) => feld !== zug.von && feld !== zug.nach);

            if (art === "K") {
                /* Genau die Türme, mit denen dieser König hätte rochieren
                   können — dieselbe Auswahl wie bei der Zugerzeugung. Auf dem
                   Doppelbrett behält der zweite König dadurch seine Rechte. */
                const seine = SCHACH._rochadeTuerme(stand, zug.von, farbe);
                felderRecht = felderRecht.filter((feld) => seine.indexOf(feld) === -1);

                /* Und der König selbst ist für immer raus. */
                neu.rochadeKoenige = neu.rochadeKoenige.filter((feld) => feld !== zug.von);
            }

            neu.rochadeFelder = felderRecht;
        }

        /* Die alten vier Buchstaben mitführen, damit der Vertrag additiv
           bleibt und ältere Stände lesbar sind. */
        if (neu.rochade) {
            const unten = (SCHACH.hoeheVon(stand) - 1) * breite;
            let rechte = "";

            if (neu.rochadeFelder.indexOf(unten + breite - 1) !== -1) { rechte += "K"; }
            if (neu.rochadeFelder.indexOf(unten) !== -1) { rechte += "D"; }
            if (neu.rochadeFelder.indexOf(breite - 1) !== -1) { rechte += "k"; }
            if (neu.rochadeFelder.indexOf(0) !== -1) { rechte += "d"; }
            neu.rochade = rechte;
        }

        /*
         * Doppelschritt eines Bauern eröffnet en passant.
         *
         * SEIT v0.65 GILT DAS IN BEIDEN ACHSEN: Auf dem Kreuz zieht ein Bauer
         * auch waagerecht, und dann liegt das übersprungene Feld eine SPALTE
         * daneben statt eine Reihe. Gerechnet wird deshalb aus der Mitte
         * zwischen Start und Ziel — das stimmt für beide Achsen. Dazu wird
         * gemerkt, WO der Bauer danach steht (`enPassantOpfer`): Der Schlagende
         * kann aus einer anderen Richtung kommen und es sonst nicht ausrechnen.
         */
        const dReihe = SCHACH.reiheVon(zug.nach, breite) - SCHACH.reiheVon(zug.von, breite);
        const dSpalte = SCHACH.spalteVon(zug.nach, breite) - SCHACH.spalteVon(zug.von, breite);

        if (art === "B" && (Math.abs(dReihe) === 2 || Math.abs(dSpalte) === 2)) {
            const zwischen = SCHACH._feld(stand,
                SCHACH.reiheVon(zug.von, breite) + dReihe / 2,
                SCHACH.spalteVon(zug.von, breite) + dSpalte / 2);

            neu.enPassant = SCHACH.feldName(zwischen, breite, SCHACH.hoeheVon(stand));
            neu.enPassantOpfer = zug.nach;
        }

        /*
         * Die Startseiten wandern mit (seit v0.65): Der Eintrag des ziehenden
         * Bauern zieht auf sein Zielfeld, der eines geschlagenen fällt weg, und
         * wer umwandelt, braucht keinen mehr — er ist kein Bauer mehr.
         */
        neu.bauernSeiten = SCHACH._bauernSeitenNachfuehren(
            stand, zug.von, zug.nach, !!zug.umwandlung,
            zug.enPassant ? [zug.enPassantFeld] : []);

        /*
         * DAS ERSTZUG-RECHT (seit v0.98): Genau hier verliert es der Bauer,
         * der ZIEHT — und nur der. Dieselbe Nachführung wie bei den
         * Startseiten: Der Eintrag eines Geschlagenen fällt weg, und wer
         * umwandelt, braucht keinen mehr.
         */
        neu.bauernZog = SCHACH._bauernZogNachfuehren(stand, zug, art);

        /*
         * Zähler für die Fünfzig-Züge-Regel. ACHTUNG: Er springt hier auf 0
         * zurück und taugt deshalb NICHT als Uhr für ablaufende Wirkungen —
         * dafür gibt es `takt`.
         */
        if (art === "B" || zug.schlaegt) {
            neu.halbzuege = 0;
        }

        /* Zerfallene Leihgaben verschwinden vom Brett (Fähigkeit „Friedhof"). */
        const zerfall = SCHACH._zerfallAnwenden(neu);
        neu.brett = zerfall.brett;
        neu.geliehen = SCHACH.geliehene(neu);

        return neu;
    },

    /*
     * Zieht, wenn der Zug erlaubt ist. Liefert { stand, zug, text } oder null.
     * `umwandlung` ist "D", "T", "L" oder "S" und wird nur bei einem
     * Bauernzug auf die letzte Reihe beachtet.
     */
    ziehen(stand, von, nach, umwandlung) {
        const moeglich = SCHACH.zuege(stand, von);

        const passende = moeglich.filter((zug) => zug.nach === nach);
        if (passende.length === 0) {
            return null;
        }

        let zug = passende[0];
        if (passende.length > 1) {
            /* Mehrere Züge auf dasselbe Feld gibt es nur bei der Umwandlung. */
            const gewaehlt = passende.find((eintrag) => eintrag.umwandlung === (umwandlung || "D"));
            zug = gewaehlt || passende[0];
        }

        return {
            stand: SCHACH._ausfuehren(stand, zug),
            zug: zug,
            text: SCHACH.zugText(stand, zug)
        };
    },

    /* Kurzbeschreibung eines Zuges in Worten, für den Verlauf. */
    zugText(stand, zug) {
        if (zug.rochade === "kurz") {
            return "Rochade kurz";
        }
        if (zug.rochade === "lang") {
            return "Rochade lang";
        }

        const breite = SCHACH.breiteVon(stand);
        const hoehe = SCHACH.hoeheVon(stand);
        const art = SCHACH.artName(zug.art);
        const trennung = zug.schlaegt ? " schlägt auf " : " nach ";
        let text = art + " " + SCHACH.feldName(zug.von, breite, hoehe)
            + trennung + SCHACH.feldName(zug.nach, breite, hoehe);

        if (zug.umwandlung) {
            text += ", wird " + SCHACH.artName(zug.umwandlung);
        }
        return text;
    },

    /* ---------------------------------------------------------------- *
     * Wirkung der Fähigkeiten auf das Brett
     *
     * Diese vier ändern das Brett SOFORT, statt einen Zug zu erlauben. Sie
     * liegen hier und nicht in schach-runde.js, weil sie reine Brettarbeit
     * sind — wer sie einsetzen darf, entscheidet die Runde.
     *
     * Jede liefert { stand, felder, text } oder null, wenn sie nicht wirken
     * kann. `felder` sind die betroffenen Felder; der Bildschirm zeigt daran
     * die Animation.
     * ---------------------------------------------------------------- */

    /*
     * Alle eigenen Bauern ein Feld vor, soweit frei. Geschlagen wird nicht.
     *
     * `umwandlung` (seit v0.56) sagt, zu WAS die Bauern werden, die dabei die
     * letzte Reihe erreichen — "D", "T", "L" oder "S", Vorgabe "D". Bis v0.55
     * wurden sie stillschweigend zu Damen; jetzt fragt der Bildschirm einmal
     * für alle. Der Aufruf ohne den Parameter verhält sich unverändert, damit
     * jede alte Stelle gültig bleibt.
     *
     * Zurück kommt zusätzlich `umgewandelt`: die Felder, auf denen ein Bauer
     * eine neue Figur geworden ist. Daran hängt die Frage des Bildschirms.
     */
    UMWANDLUNGEN: ["D", "T", "L", "S"],

    bauernschub(stand, farbe, umwandlung) {
        const breite = SCHACH.breiteVon(stand);
        const hoehe = SCHACH.hoeheVon(stand);
        const richtung = (farbe === SCHACH.WEISS) ? -1 : 1;
        const letzteReihe = (farbe === SCHACH.WEISS) ? 0 : hoehe - 1;
        const bauer = (farbe === SCHACH.WEISS) ? "B" : "b";

        const gewaehlt = (SCHACH.UMWANDLUNGEN.indexOf(umwandlung) !== -1)
            ? umwandlung : "D";
        const neueFigur = (farbe === SCHACH.WEISS) ? gewaehlt : gewaehlt.toLowerCase();

        let brett = stand.brett;
        const felder = [];
        const wege = [];
        const umgewandelt = [];

        /*
         * Von vorn nach hinten durchgehen (in Zugrichtung), damit ein Bauer
         * das Feld freimacht, bevor der dahinter nachrückt. Sonst blockierten
         * sich zwei Bauern in derselben Spalte gegenseitig.
         */
        const reihen = [];
        for (let reihe = 0; reihe < hoehe; reihe++) {
            reihen.push(reihe);
        }
        if (richtung === 1) {
            reihen.reverse();
        }

        for (const reihe of reihen) {
            for (let spalte = 0; spalte < breite; spalte++) {
                const feld = reihe * breite + spalte;
                if (brett[feld] !== bauer) {
                    continue;
                }
                if (!SCHACH._imBrett(stand, reihe + richtung, spalte)) {
                    continue;
                }
                const ziel = SCHACH._feld(stand, reihe + richtung, spalte);
                if (brett[ziel] !== ".") {
                    continue;
                }

                const wandelt = (SCHACH.reiheVon(ziel, breite) === letzteReihe);

                brett = SCHACH._brettMit(brett, feld, ".");
                brett = SCHACH._brettMit(brett, ziel, wandelt ? neueFigur : bauer);
                felder.push(feld, ziel);
                wege.push({ von: feld, nach: ziel });

                if (wandelt) {
                    umgewandelt.push(ziel);
                }
            }
        }

        if (felder.length === 0) {
            return null;
        }

        const neu = Object.assign({}, stand, { brett: brett, enPassant: "" });
        return {
            stand: neu,
            felder: felder,
            wege: wege,
            umgewandelt: umgewandelt,
            text: (umgewandelt.length === 0)
                ? "Bauernschub"
                : ("Bauernschub, " + umgewandelt.length + " mal "
                    + SCHACH.artName(gewaehlt))
        };
    },

    /* ---------------------------------------------------------------- *
     * Die Aufwertungskette (Verstärkung, seit v0.56)
     *
     * Bis v0.55 machte die Verstärkung aus einem Bauern einen Springer, und
     * das war alles. Jetzt steigt JEDE eigene Figur eine Stufe. Die Kette
     * steht hier als reine Tabelle, damit man sie an einer Stelle liest:
     *
     *     Bauer            → Springer
     *     Springer         → Läufer ODER Turm (je zur Hälfte)
     *     Läufer, Turm     → Dame
     *     Dame             → König        (und damit: ein zweites Leben)
     *     König            → zwei Damen   (nur, wenn man zwei Könige hat)
     *
     * WARUM DER KÖNIG DAS OBERE ENDE IST: Ein zweiter König sind zwei Leben —
     * `koenigeAlsLeben` im Stand, dieselbe Maschinerie wie bei der
     * Zufallsarmee (siehe `SCHACH.koenigSchlagbarFuer`). Solange zwei stehen,
     * kennt diese Seite kein Schach und kein Matt; beim letzten kippt es
     * zurück. Ohne diesen Schalter wäre ein zweiter König ein unschlagbarer
     * Klotz und „Schachmatt" nicht mehr eindeutig.
     *
     * UND WARUM ES ZURÜCK GEHT: Zwei Leben sind nicht immer das Richtige —
     * wer angreifen will, braucht Material. Deshalb tauscht man einen von
     * zwei Königen gegen zwei Damen ein. Dass es zwei Könige BRAUCHT, ist die
     * Sperre, die den letzten König schützt: Er lässt sich nicht wegtauschen.
     *
     * Mehrere Ergebnisse werden vom ANGETIPPTEN Feld aus verteilt: das erste
     * kommt dorthin, jedes weitere auf das nächste freie Nachbarfeld in
     * derselben festen Reihenfolge wie beim Spiegel. Fest, damit alle Geräte
     * dasselbe Brett rechnen.
     * ---------------------------------------------------------------- */

    AUFWERTUNG: {
        B: [["S"]],
        S: [["L"], ["T"]],
        L: [["D"]],
        T: [["D"]],
        D: [["K"]],
        K: [["D", "D"]]
    },

    /*
     * Was wird aus dieser Figurenart? Liefert eine Liste von Arten (meist
     * eine, beim König zwei) oder null, wenn es keine Aufwertung gibt.
     *
     * `wert` ist eine Zahl von 0 bis 1 und entscheidet dort, wo es mehrere
     * Möglichkeiten gibt (Springer → Läufer oder Turm). Sie wird GERECHNET
     * übergeben, nie gewürfelt — `Math.random()` hat im Modell nichts zu
     * suchen, sonst sähe jedes Gerät ein anderes Brett.
     */
    aufwertungVon(art, wert) {
        const moeglich = SCHACH.AUFWERTUNG[art];
        if (!moeglich || moeglich.length === 0) {
            return null;
        }

        const sauber = Math.min(Math.max(Number(wert) || 0, 0), 0.999999);
        return moeglich[Math.floor(sauber * moeglich.length)] || moeglich[0];
    },

    /*
     * Eine eigene Figur steigt eine Stufe auf. `wert` steuert die Auswahl bei
     * mehreren Möglichkeiten (siehe `aufwertungVon`).
     */
    verstaerkung(stand, farbe, feld, wert) {
        const figur = SCHACH.figurAuf(stand, feld);
        if (SCHACH.farbeVon(figur) !== farbe) {
            return null;
        }

        const art = SCHACH.artVon(figur);
        const neueArten = SCHACH.aufwertungVon(art, wert);
        if (!neueArten) {
            return null;
        }

        /* Der LETZTE König bleibt stehen. Ohne ihn hätte die Seite verloren,
           und eine Fähigkeit darf keine Partie beenden. */
        if (art === "K" && SCHACH.koenigFelder(stand, farbe).length < 2) {
            return null;
        }

        const plaetze = SCHACH._aufwertungsPlaetze(stand, feld, neueArten.length);
        if (plaetze.length < neueArten.length) {
            return null;
        }

        let brett = SCHACH._brettMit(stand.brett, feld, ".");

        for (let stelle = 0; stelle < neueArten.length; stelle++) {
            const zeichen = (farbe === SCHACH.WEISS)
                ? neueArten[stelle]
                : neueArten[stelle].toLowerCase();

            brett = SCHACH._brettMit(brett, plaetze[stelle], zeichen);
        }

        const neu = Object.assign({}, stand, { brett: brett, enPassant: "" });

        /*
         * Ein zweiter König schaltet die zwei Leben ein — für BEIDE Seiten im
         * Stand, aber wirksam nur dort, wo wirklich zwei stehen:
         * `koenigSchlagbarFuer` zählt je Farbe nach. Einmal gesetzt, bleibt
         * der Schalter; das ist gewollt, sonst kippten die Regeln mitten in
         * der Partie hin und her, sobald jemand einen König verliert.
         */
        if (neueArten.indexOf("K") !== -1) {
            neu.koenigeAlsLeben = true;
        }

        /* Ein König, der sich in Damen verwandelt, verliert sein Rochaderecht
           — er steht ja nicht mehr da. */
        if (art === "K" && Array.isArray(neu.rochadeKoenige)) {
            neu.rochadeKoenige = neu.rochadeKoenige.filter((platz) => platz !== feld);
        }

        return {
            stand: neu,
            felder: plaetze.slice(),
            text: SCHACH.artName(art) + " wird "
                + neueArten.map((neueArt) => SCHACH.artName(neueArt)).join(" und ")
        };
    },

    /*
     * Wohin die aufgewerteten Figuren kommen: zuerst das angetippte Feld,
     * dann die freien Nachbarfelder in derselben festen Reihenfolge wie beim
     * Spiegel — gerade Richtungen vor schrägen.
     */
    _aufwertungsPlaetze(stand, feld, anzahl) {
        const plaetze = [feld];
        if (anzahl <= 1) {
            return plaetze;
        }

        const breite = SCHACH.breiteVon(stand);
        const reihe = SCHACH.reiheVon(feld, breite);
        const spalte = SCHACH.spalteVon(feld, breite);

        for (const richtung of [[0, 1], [0, -1], [1, 0], [-1, 0],
            [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
            if (plaetze.length >= anzahl) {
                break;
            }

            const r = reihe + richtung[0];
            const s = spalte + richtung[1];

            if (!SCHACH._imBrett(stand, r, s)) {
                continue;
            }

            const ziel = SCHACH._feld(stand, r, s);
            if (SCHACH.figurAuf(stand, ziel) !== "." || SCHACH.gesperrt(stand, ziel)) {
                continue;
            }

            plaetze.push(ziel);
        }

        return plaetze;
    },

    /*
     * Erdbeben: Alle Figuren rund um das gewählte Feld werden ein Feld nach
     * aussen geschoben, soweit dort Platz ist. Könige bleiben stehen — sonst
     * liesse sich ein König aus einem Matt herausschieben oder umgekehrt
     * hineinschieben, und die Partie endete durch eine Fähigkeit statt durch
     * einen Zug.
     */
    /* Wie viele Reihen ein Erdbeben erfasst. */
    ERDBEBEN_REIHEN: 3,

    /*
     * Erdbeben (seit v3.3 umgebaut): Es schiebt DREI ganze Reihen um ein Feld
     * zur Seite.
     *
     * Das angetippte Feld sagt beides:
     *   - seine Reihe ist die MITTLERE der drei (am Rand entsprechend weniger),
     *   - seine Spalte sagt die RICHTUNG: linke Bretthälfte nach links, rechte
     *     nach rechts. Dasselbe Muster wie beim Nudelholz, wo oben und unten
     *     die Richtung bestimmen — ein Tipp beantwortet beide Fragen.
     *
     * DIE REIHENFOLGE IST DIE GANZE ARBEIT.
     * Verschiebt man nach rechts, muss die Figur GANZ RECHTS zuerst gehen: Erst
     * dann wird das Feld frei, in das ihr Nachbar nachrückt. Läuft man
     * andersherum, überschreibt die erste Figur ihren Nachbarn — dieselbe
     * Falle wie bei der Rochade auf dem 6er-Brett (siehe DECISIONS).
     *
     * Wer nicht kann, bleibt stehen: die Figur am Rand, und jede, hinter der
     * sich ein voller Block bis zum Rand staut. Die anderen rücken auf wie eine
     * Schlange, eine nach der anderen.
     *
     * Könige bleiben stehen — sonst liesse sich ein König aus dem Schach oder
     * in ein Schach hinein schieben, ohne dass jemand einen Zug macht.
     */
    erdbeben(stand, feld) {
        const breite = SCHACH.breiteVon(stand);
        const hoehe = SCHACH.hoeheVon(stand);
        const reihe = SCHACH.reiheVon(feld, breite);
        const spalte = SCHACH.spalteVon(feld, breite);

        /* Linke Hälfte schiebt nach links, rechte nach rechts. */
        const richtung = (spalte < breite / 2) ? -1 : 1;

        /* Die mittlere Reihe ist die angetippte; oben und unten je eine dazu,
           soweit das Brett reicht. */
        const halb = Math.floor(SCHACH.ERDBEBEN_REIHEN / 2);
        let brett = stand.brett;
        const felder = [];
        const wege = [];

        for (let r = reihe - halb; r <= reihe + halb; r++) {
            if (r < 0 || r >= hoehe) {
                continue;
            }

            /*
             * Gegen die Schubrichtung durchlaufen: nach rechts geschoben
             * beginnt es bei der rechten Spalte.
             */
            const start = (richtung === 1) ? breite - 1 : 0;
            const ende = (richtung === 1) ? -1 : breite;

            for (let s = start; s !== ende; s -= richtung) {
                const von = SCHACH._feld(stand, r, s);
                const figur = brett[von];

                if (figur === "." || SCHACH.artVon(figur) === "K") {
                    continue;
                }

                const zielS = s + richtung;
                if (zielS < 0 || zielS >= breite) {
                    continue;
                }

                const ziel = SCHACH._feld(stand, r, zielS);

                /* Besetzt oder vermauert: Diese Figur bleibt, wo sie ist. */
                if (brett[ziel] !== "." || SCHACH.gesperrt(stand, ziel)) {
                    continue;
                }

                brett = SCHACH._brettMit(brett, von, ".");
                brett = SCHACH._brettMit(brett, ziel, figur);
                felder.push(von, ziel);
                wege.push({ von: von, nach: ziel });
            }
        }

        if (felder.length === 0) {
            return null;
        }

        const neu = Object.assign({}, stand, { brett: brett, enPassant: "" });
        return {
            stand: neu,
            felder: felder,
            wege: wege,
            text: "Erdbeben nach " + ((richtung === 1) ? "rechts" : "links")
        };
    },

    /*
     * Nudelholz: EINE Bahn — eine Spalte oder eine Reihe — wird um ein Feld
     * verschoben. `kante` sagt, von welchem Rand das Holz rollt ("unten",
     * "oben", "links", "rechts" — Brett-Koordinaten, Reihe 0 ist oben);
     * `feld` ist das angetippte Randfeld und bestimmt die Bahn. Wo kein
     * Platz ist, bleibt die Figur stehen.
     *
     * SEIT v0.117 EINE BAHN MIT FREIER RICHTUNG (Nutzer-Entscheidung 22.08.,
     * vorher: zwei Spalten, immer von der eigenen Seite weg). Die Richtung
     * reist als Zusatzwahl `wahl` durch `faehigkeitEinsetzen` — derselbe Weg
     * wie die Mauer-Richtung.
     *
     * SEIT v0.77 ROLLEN AUCH KÖNIGE MIT (Nutzer-Entscheidung 18.08.).
     * Sich selbst ins Schach schieben kann trotzdem niemand: Seit v3.6
     * weist `SCHACH_RUNDE.faehigkeitEinsetzen` jede Fähigkeit ab, die den
     * eigenen König im Schach zurücklässt. Die Prüfung steht dort, weil
     * `nudelholz` nur die Stellung rechnet.
     */
    NUDELHOLZ_KANTEN: {
        unten: { dr: -1, ds: 0 },
        oben: { dr: 1, ds: 0 },
        links: { dr: 0, ds: 1 },
        rechts: { dr: 0, ds: -1 }
    },

    nudelholz(stand, feld, kante) {
        const zug = SCHACH.NUDELHOLZ_KANTEN[kante];
        if (!zug) {
            return null;
        }

        const breite = SCHACH.breiteVon(stand);
        const hoehe = SCHACH.hoeheVon(stand);
        const senkrecht = (zug.dr !== 0);
        const spalte = SCHACH.spalteVon(feld, breite);
        const reihe = SCHACH.reiheVon(feld, breite);

        let brett = stand.brett;
        const felder = [];
        const wege = [];

        /* In Laufrichtung von vorn abarbeiten, damit eine Figur Platz macht,
           bevor die nächste nachrückt: Begonnen wird am Rand, ZU dem die
           Figuren rollen. */
        const laenge = senkrecht ? hoehe : breite;
        const stellen = [];
        for (let lauf = 0; lauf < laenge; lauf++) {
            stellen.push(lauf);
        }
        if ((senkrecht ? zug.dr : zug.ds) === 1) {
            stellen.reverse();
        }

        for (const lauf of stellen) {
            const r = senkrecht ? lauf : reihe;
            const s = senkrecht ? spalte : lauf;

            if (!SCHACH._imBrett(stand, r, s)) {
                continue;
            }

            const von = SCHACH._feld(stand, r, s);
            const figur = brett[von];

            /* Seit v0.77 ohne Königs-Ausnahme — siehe oben. */
            if (figur === ".") {
                continue;
            }
            if (!SCHACH._imBrett(stand, r + zug.dr, s + zug.ds)) {
                continue;
            }

            /*
             * Frei heisst LEER UND NICHT GESPERRT (seit v0.59 auch das
             * Zweite) — sonst schöbe das Holz Figuren auf Mauern und in
             * Risse, wo sie auf einem Feld stünden, das es für die Regeln
             * gar nicht mehr gibt.
             */
            const ziel = SCHACH._feld(stand, r + zug.dr, s + zug.ds);
            if (brett[ziel] !== "." || SCHACH.gesperrt(stand, ziel)) {
                continue;
            }

            brett = SCHACH._brettMit(brett, von, ".");
            brett = SCHACH._brettMit(brett, ziel, figur);
            felder.push(von, ziel);
            wege.push({ von: von, nach: ziel });
        }

        if (felder.length === 0) {
            return null;
        }

        const neu = Object.assign({}, stand, { brett: brett, enPassant: "" });
        return {
            stand: neu,
            felder: felder,
            wege: wege,

            /* Von welchem Rand gerollt wurde — die Anzeige spielt daraus
               ihr Schauspiel in der richtigen Richtung. */
            richtung: kante,

            text: (senkrecht
                ? ("Spalte " + SCHACH.SPALTEN[spalte])
                : ("Reihe " + (hoehe - reihe)))
                + " von " + kante
        };
    },

    /* Spiegel: Eine Figur wird auf ein freies Nachbarfeld verdoppelt. */
    spiegel(stand, farbe, feld) {
        const figur = SCHACH.figurAuf(stand, feld);

        if (SCHACH.farbeVon(figur) !== farbe || SCHACH.artVon(figur) === "K") {
            return null;
        }

        const breite = SCHACH.breiteVon(stand);
        const reihe = SCHACH.reiheVon(feld, breite);
        const spalte = SCHACH.spalteVon(feld, breite);

        /* Das erste freie Nachbarfeld — feste Reihenfolge, damit alle Geräte
           dasselbe Ergebnis bekommen. */
        for (const richtung of [[0, 1], [0, -1], [1, 0], [-1, 0],
            [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
            const r = reihe + richtung[0];
            const s = spalte + richtung[1];

            if (!SCHACH._imBrett(stand, r, s)) {
                continue;
            }
            const ziel = SCHACH._feld(stand, r, s);
            if (SCHACH.figurAuf(stand, ziel) !== ".") {
                continue;
            }

            const neu = Object.assign({}, stand, {
                brett: SCHACH._brettMit(stand.brett, ziel, figur)
            });

            return {
                stand: neu,
                felder: [feld, ziel],
                wege: [],
                text: SCHACH.artName(SCHACH.artVon(figur)) + " verdoppelt"
            };
        }

        return null;
    },

    /*
     * DIE ACHT NACHBARRICHTUNGEN, in fester Reihenfolge (seit v0.79).
     *
     * Feste Reihenfolge heisst: Jedes Gerät rechnet dasselbe aus. Dieselbe
     * Überlegung wie beim Spiegel, der sein Nachbarfeld ebenso der Reihe nach
     * sucht — mit `Math.random()` sähe jede Seite ein anderes Brett.
     */
    NACHBARN: [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]],

    /*
     * SCHUBS (seit v0.79): Eine gegnerische Figur, die neben einer eigenen
     * steht, wird ein Feld von dieser weggeschoben.
     *
     * Der kleine Bruder des Nudelholzes — eine Figur, ein Feld, statt zweier
     * ganzer Spalten. Das ist der Grund, warum er gewöhnlich (grün) ist und
     * das Nudelholz ungewöhnlich (blau).
     *
     * GESCHLAGEN WIRD NICHT. Geschoben wird nur auf ein Feld, das LEER und
     * nicht gesperrt ist — dieselbe Bedingung wie beim Nudelholz seit v0.59.
     * Eine Fähigkeit, die Material bringt, müsste den Zug kosten (Hausregel
     * v0.47); so bleibt sie rein positionell und darf den Zug behalten.
     *
     * KÖNIGE WERDEN NICHT GESCHOBEN — anders als beim Nudelholz seit v0.78.
     * Der Unterschied ist Absicht: Das Nudelholz rollt eine ganze Spalte und
     * trifft den König nebenbei; der Schubs sucht sich sein Ziel aus. Einen
     * König gezielt aus einem Mattnetz oder in ein Schach zu schieben, und das
     * auch noch, ohne den Zug herzugeben, wäre für die häufigste Stufe viel zu
     * stark.
     *
     * WELCHE EIGENE FIGUR SCHIEBT, wenn mehrere danebenstehen: die erste in
     * `NACHBARN`. Das ist auf jedem Gerät dieselbe, und man muss es nicht im
     * Kopf haben — der Vorschau-Kasten zeigt vor dem Einsetzen genau die
     * Felder, die sich ändern (seit v0.57). Kommt die erste nicht durch, weil
     * das Feld dahinter besetzt oder gesperrt ist, wird die nächste probiert.
     */
    schubs(stand, farbe, feld) {
        const figur = SCHACH.figurAuf(stand, feld);

        if (SCHACH.farbeVon(figur) !== SCHACH.gegner(farbe)
            || SCHACH.artVon(figur) === "K") {
            return null;
        }

        const breite = SCHACH.breiteVon(stand);
        const reihe = SCHACH.reiheVon(feld, breite);
        const spalte = SCHACH.spalteVon(feld, breite);

        for (const richtung of SCHACH.NACHBARN) {
            const schieberReihe = reihe + richtung[0];
            const schieberSpalte = spalte + richtung[1];

            if (!SCHACH._imBrett(stand, schieberReihe, schieberSpalte)) {
                continue;
            }
            const schieber = SCHACH._feld(stand, schieberReihe, schieberSpalte);
            if (SCHACH.farbeVon(SCHACH.figurAuf(stand, schieber)) !== farbe) {
                continue;
            }

            /* Genau gegenüber dem Schieber — von ihm weg. */
            const zielReihe = reihe - richtung[0];
            const zielSpalte = spalte - richtung[1];

            if (!SCHACH._imBrett(stand, zielReihe, zielSpalte)) {
                continue;
            }
            const ziel = SCHACH._feld(stand, zielReihe, zielSpalte);
            if (SCHACH.figurAuf(stand, ziel) !== "." || SCHACH.gesperrt(stand, ziel)) {
                continue;
            }

            let brett = SCHACH._brettMit(stand.brett, feld, ".");
            brett = SCHACH._brettMit(brett, ziel, figur);

            return {
                stand: Object.assign({}, stand, { brett: brett, enPassant: "" }),
                /* Der Schieber gehört ins Bild: Sonst sieht man am Umriss
                   nicht, WARUM die Figur in diese Richtung geht. */
                felder: [schieber, feld, ziel],
                wege: [{ von: feld, nach: ziel }],
                text: SCHACH.artName(SCHACH.artVon(figur)) + " geschoben"
            };
        }

        return null;
    },

    /*
     * PLATZTAUSCH (seit v0.79, umgebaut in v0.101): Eine eigene Figur tauscht
     * den Platz mit der Figur auf EINEM der vier Nachbarfelder — waagerecht
     * oder senkrecht, eigene wie gegnerische.
     *
     * Bis v0.100 ging nur die eigene Figur direkt VOR ihr, und die Fähigkeit
     * behielt den Zug. Beides hat der Nutzer am 20.08. geändert (W7: „soll in
     * jede Richtung gehen, auch mit gegnerischen Figuren, kein Plus mehr, und
     * nur die vier Seiten drum herum"). Mit einer gegnerischen Figur ist sie
     * kein reines Aufräumen mehr, sondern ein Eingriff in die fremde Stellung
     * — deshalb kostet sie jetzt den Zug (`beendetZug`, Hausregel v0.47: „zu
     * stark heisst Plus weg, nicht Stufe verschieben").
     *
     * „VOR" IST DIE LAUFRICHTUNG DER EIGENEN BAUERN (`bauernRichtung`). Damit
     * stimmt es auch auf dem Kreuz für jede Armee, die von einer anderen Seite
     * kommt: Steht auf dem angetippten Feld ein Bauer, liefert
     * `SCHACH.bauernSeite` seine echte Startseite; steht dort etwas anderes,
     * fällt die Rechnung auf die Farbregel zurück (Weiss unten, Schwarz oben).
     * Dieselbe Vereinfachung macht das Nudelholz seit v0.46 — für die Flügel
     * einer Kreuz-Armee ist „vorn" damit die Richtung der Hauptarmee.
     *
     * KÖNIGE TAUSCHEN NICHT, in keiner der beiden Rollen. Ein König, der sich
     * gratis aus dem Schach tauscht und dabei seinen Zug behält, wäre ein
     * Freifahrtschein — und „Schachmatt" wäre nicht mehr eindeutig. Dieselbe
     * Linie wie beim Schild, bei der Fessel und beim Spiegel.
     */
    /*
     * DIE VIER RICHTUNGEN DES PLATZTAUSCHS (seit v0.101, Wunsch W7).
     *
     * Sie stehen RELATIV ZUR EIGENEN ARMEE, nicht zum Brett: „vor" ist die
     * Richtung, in die die eigenen Bauern marschieren (`bauernRichtung`), die
     * übrigen drei folgen daraus. Das ist kein Schmuck, sondern die einzige
     * Schreibweise, die auf dem Kreuz stimmt: Die Ansicht dreht sich so, dass
     * die eigene Armee unten steht (`_drehungVon`, seit v0.72) — „oben" auf
     * dem Brett und „oben" auf dem Bildschirm sind dort zwei verschiedene
     * Dinge, „vor" dagegen ist auf jedem Gerät dasselbe.
     *
     * `vor` ist die Vorgabe und damit genau der Tausch, den es bis v0.100 als
     * einzigen gab — jeder Aufruf von früher bleibt gültig.
     */
    TAUSCH_RICHTUNGEN: ["vor", "rechts", "zurueck", "links"],

    /* Der Schritt (dr, ds) einer dieser Richtungen, gemessen an der
       Laufrichtung der eigenen Bauern. */
    tauschSchritt(stand, feld, farbe, richtungId) {
        const vor = SCHACH.bauernRichtung(stand, feld, farbe);

        if (richtungId === "zurueck") {
            return { dr: -vor.dr, ds: -vor.ds };
        }
        if (richtungId === "links") {
            return { dr: -vor.ds, ds: vor.dr };
        }
        if (richtungId === "rechts") {
            return { dr: vor.ds, ds: -vor.dr };
        }
        return { dr: vor.dr, ds: vor.ds };
    },

    platztausch(stand, farbe, feld, richtungId) {
        const figur = SCHACH.figurAuf(stand, feld);

        if (SCHACH.farbeVon(figur) !== farbe || SCHACH.artVon(figur) === "K") {
            return null;
        }

        const breite = SCHACH.breiteVon(stand);
        const richtung = SCHACH.tauschSchritt(stand, feld, farbe, richtungId);
        const reihe = SCHACH.reiheVon(feld, breite) + richtung.dr;
        const spalte = SCHACH.spalteVon(feld, breite) + richtung.ds;

        if (!SCHACH._imBrett(stand, reihe, spalte)) {
            return null;
        }

        const davor = SCHACH._feld(stand, reihe, spalte);
        const andere = SCHACH.figurAuf(stand, davor);

        /*
         * SEIT v0.101 TAUSCHT ER AUCH MIT GEGNERISCHEN FIGUREN (Wunsch W7).
         * Verlangt wird nur noch, dass dort überhaupt eine Figur steht und
         * dass es kein König ist — in keiner der beiden Rollen.
         *
         * Der König bleibt aussen vor wie bisher: Wer sich gratis aus dem
         * Schach tauscht, macht „Schachmatt" mehrdeutig. Dass der Tausch
         * darüber hinaus keinen König ins Schach setzen und keinen aus dem
         * Matt holen darf, ist seit v0.95 KEINE Sonderregel dieser Fähigkeit
         * mehr, sondern gilt für jede — `SCHACH_RUNDE._wirkungVerboten` prüft
         * es an einer Stelle für alle.
         */
        if (andere === "." || SCHACH.artVon(andere) === "K") {
            return null;
        }

        /* Auf einem gesperrten Feld steht ohnehin niemand — die Abfrage ist
           die Zusicherung, dass der Tausch keins von beiden dorthin bringt. */
        if (SCHACH.gesperrt(stand, feld) || SCHACH.gesperrt(stand, davor)) {
            return null;
        }

        let brett = SCHACH._brettMit(stand.brett, feld, andere);
        brett = SCHACH._brettMit(brett, davor, figur);

        return {
            stand: Object.assign({}, stand, { brett: brett, enPassant: "" }),
            felder: [feld, davor],
            /* Beide Wege, damit `figurMarkenVerschieben` die Startseite jedes
               getauschten Bauern mitnimmt und der Bildschirm beide zeichnet. */
            wege: [{ von: feld, nach: davor }, { von: davor, nach: feld }],
            text: SCHACH.artName(SCHACH.artVon(figur)) + " tauscht mit "
                + SCHACH.artName(SCHACH.artVon(andere))
        };
    },

    /*
     * Den Zug abgeben, ohne zu ziehen (seit v3.3).
     *
     * Gebraucht für Fähigkeiten mit `beendetZug`: Sie wirken aufs Brett und
     * beenden damit den Zug, es bewegt sich aber keine Figur. Was hier alles
     * passiert, muss zu `_ausfuehren` passen — deshalb steht es HIER in den
     * Regeln und nicht in schach-runde.js:
     *
     *   - die andere Seite kommt an den Zug,
     *   - die Zugnummer wächst, wenn Schwarz fertig ist,
     *   - `enPassant` verfällt (das Recht gilt nur unmittelbar danach),
     *   - ein zusätzliches Zugmuster verfällt, weil der Zug vorbei ist, ohne
     *     dass es benutzt wurde.
     *
     * NICHT angefasst werden Schild, Fessel und Frost: Sie laufen nach dem Zug
     * der BETROFFENEN Seite ab, und die war hier nicht dran.
     */
    zugAbgeben(stand) {
        const nachher = SCHACH.gegner(stand.amZug);

        /*
         * DAS ZUSATZMUSTER BLEIBT (seit v0.47).
         *
         * Es gilt „für deinen nächsten ZUG" — und den hat man noch vor sich,
         * wenn man den Zug abgibt, statt zu ziehen. Bis v0.46 wurde es hier
         * gelöscht; damit war ein Muster, das man vor dem Abgeben gesetzt hat,
         * verbraucht, aber nie zu gebrauchen. Denselben Fehler gab es schon
         * einmal (v0.41, siehe `docs\entscheidungen\erkenntnisse.md`).
         *
         * Betroffen ist seit v0.48 nur noch das Ausweichen (Sprung und Teleport
         * geben den Zug nicht mehr ab, sie SIND er) — die Regel bleibt
         * trotzdem, denn sie gilt für jedes Muster.
         *
         * Verbraucht wird das Muster weiterhin durch den eigenen Zug —
         * `_ausfuehren` löscht es, sobald die Farbe zieht, der es gehört.
         */
        const weiter = Object.assign({}, stand, {
            amZug: nachher,
            enPassant: "",
            halbzuege: stand.halbzuege + 1,
            takt: stand.takt + 1,
            zugNummer: stand.zugNummer
                + ((stand.amZug === SCHACH.SCHWARZ) ? 1 : 0),
            sprungAktiv: (stand.zusatzMuster === "springer") ? stand.zusatzFarbe : "",
            mauern: SCHACH.mauern(stand),
            geliehen: SCHACH.geliehene(stand)
        });

        /* Erst zählen, dann zerfallen lassen — sonst bliebe eine Leihgabe
           einen Halbzug länger, als versprochen. */
        const zerfall = SCHACH._zerfallAnwenden(weiter);
        weiter.brett = zerfall.brett;
        weiter.geliehen = SCHACH.geliehene(weiter);

        return weiter;
    },

    /* ---------------------------------------------------------------- *
     * Friedhof (seit v3.3)
     *
     * Gefallene GEGNER stehen auf einem 2×2-Feld wieder auf — in DEINER Farbe,
     * für ein paar Züge. Danach zerfallen sie.
     *
     * Die eigentliche Schwierigkeit ist nicht das Aufstellen, sondern das
     * Mitführen: Eine geliehene Figur zieht wie jede andere, also muss ihr
     * Eintrag ihr über das Brett folgen. Deshalb steht hier `_geliehenNachfuehren`
     * und wird von JEDER Stelle gerufen, die eine Figur bewegt.
     * ---------------------------------------------------------------- */

    /*
     * Wie lange geliehene Figuren bleiben, in Halbzügen — JE FIGURENART
     * (seit v0.57). Bis v0.56 blieben alle gleich lang (8).
     *
     * JE STÄRKER, DESTO KÜRZER. Der Friedhof ist die stärkste Fähigkeit im
     * Spiel: Er bringt bis zu vier gefallene GEGNER auf die eigene Seite. Mit
     * einer pauschalen Frist war er umso besser, je schwerer die Figuren
     * waren, die dort gefallen sind — also genau dort am stärksten, wo man
     * ohnehin gewinnt. Die Staffel dreht das um: Eine geliehene Dame darf
     * einmal ziehen, ein geliehener Bauer bleibt eine ganze Weile.
     *
     * Die Zahlen sind Halbzüge, also halbe Runden: Die Dame mit 2 zieht genau
     * einmal, bevor sie zerfällt. Der Bauer behält den alten Wert.
     */
    LEIHDAUER: { B: 8, S: 6, L: 6, T: 4, D: 2 },

    /*
     * DER VORLAUF — nachgemessen und korrigiert beim Bau von v0.57.
     *
     * Die Zahlen oben zählen ab dem Zeitpunkt, zu dem man WIEDER AM ZUG IST,
     * nicht ab dem Einsetzen. Der Grund steckt im Friedhof selbst: Er hat
     * `beendetZug`. Zwischen dem Aufstehen der Figuren und dem ersten Zug, den
     * man mit ihnen machen kann, liegen also immer zwei Halbzüge — der eigene,
     * den man hergibt, und die Antwort des Gegners.
     *
     * Ohne diesen Vorlauf wäre die Dame mit ihren 2 Halbzügen schon zerfallen,
     * BEVOR man sie ein einziges Mal ziehen könnte: Sie hätte nur ein Feld
     * blockiert. Genau das kam beim Nachmessen heraus — die Tabelle war
     * richtig, der Nullpunkt nicht.
     */
    LEIHGABE_VORLAUF: 2,

    /*
     * Für Fälle ohne bekannte Art — und als Rückfall, falls je eine Figurenart
     * dazukommt, die in der Tabelle fehlt. Der alte Wert, damit ein Vergessen
     * nicht heimlich etwas verkürzt.
     */
    FRIEDHOF_HALBZUEGE: 8,

    /*
     * Wie lange eine geliehene Figur dieser Art bleibt, in Halbzügen ab dem
     * Einsetzen — also die Tabelle plus den Vorlauf. Eine Dame kommt damit auf
     * 4 und zieht genau einmal.
     */
    leihdauerVon(art) {
        const dauer = SCHACH.LEIHDAUER[art];

        return SCHACH.LEIHGABE_VORLAUF
            + (Number.isInteger(dauer) ? dauer : SCHACH.FRIEDHOF_HALBZUEGE);
    },

    /* Kantenlänge des Feldes, auf dem sie erscheinen. */
    FRIEDHOF_KANTE: 2,

    /* Die geliehenen Figuren, die JETZT noch stehen. */
    geliehene(stand) {
        if (!Array.isArray(stand.geliehen)) {
            return [];
        }
        return stand.geliehen.filter((eintrag) => eintrag.bis > stand.takt);
    },

    /* Ist die Figur auf diesem Feld geliehen? */
    istGeliehen(stand, feld) {
        return SCHACH.geliehene(stand).some((eintrag) => eintrag.feld === feld);
    },

    /*
     * Führt die Einträge über einen Zug hinweg nach:
     *   - zieht eine geliehene Figur, wandert ihr Eintrag mit,
     *   - wird eine geliehene Figur geschlagen, verfällt ihr Eintrag,
     *   - abgelaufene verschwinden.
     *
     * `nach` darf -1 sein — dann wurde nur geräumt (Handel, Zerfall).
     */
    _geliehenNachfuehren(stand, von, nach) {
        return SCHACH.geliehene(stand)
            /* Was auf dem Zielfeld stand, ist geschlagen worden. */
            .filter((eintrag) => eintrag.feld !== nach || eintrag.feld === von)
            .map((eintrag) => (eintrag.feld === von && nach >= 0)
                ? { feld: nach, bis: eintrag.bis }
                : eintrag);
    },

    /*
     * Nimmt zerfallene Leihgaben vom Brett. Liefert { brett, felder } —
     * `felder` sind die Stellen, an denen etwas verschwunden ist.
     *
     * Gerufen wird das NACH dem Hochzählen von `halbzuege`, damit eine Figur
     * genau so viele Züge bleibt, wie versprochen.
     */
    _zerfallAnwenden(stand) {
        const felder = [];
        let brett = stand.brett;

        for (const eintrag of (stand.geliehen || [])) {
            if (eintrag.bis <= stand.takt && SCHACH.figurAuf(stand, eintrag.feld) !== ".") {
                brett = SCHACH._brettMit(brett, eintrag.feld, ".");
                felder.push(eintrag.feld);
            }
        }

        return { brett: brett, felder: felder };
    },

    /*
     * Die vier Felder eines Friedhofs-Blocks, oder null.
     *
     * `feld` ist die obere linke Ecke. Alle vier müssen im Brett liegen, frei
     * und ungesperrt sein — auch wenn weniger Figuren aufstehen. Das ist
     * Absicht: So sieht man am angebotenen Zielfeld sofort, wo überhaupt Platz
     * ist, ohne die Zahl der Gefallenen im Kopf zu haben.
     */
    friedhofsFelder(stand, feld) {
        const breite = SCHACH.breiteVon(stand);
        const hoehe = SCHACH.hoeheVon(stand);
        const reihe = SCHACH.reiheVon(feld, breite);
        const spalte = SCHACH.spalteVon(feld, breite);
        const kante = SCHACH.FRIEDHOF_KANTE;

        if (feld < 0 || reihe + kante > hoehe || spalte + kante > breite) {
            return null;
        }

        const plaetze = [];

        for (let dr = 0; dr < kante; dr++) {
            for (let ds = 0; ds < kante; ds++) {
                const ziel = SCHACH._feld(stand, reihe + dr, spalte + ds);

                if (SCHACH.figurAuf(stand, ziel) !== "." || SCHACH.gesperrt(stand, ziel)) {
                    return null;
                }
                plaetze.push(ziel);
            }
        }

        return plaetze;
    },

    /*
     * Den Friedhof öffnen: `gefallene` sind [{ art, feld }] — WELCHE Figur an
     * WELCHER Stelle wieder aufsteht. `feld` ist die obere linke Ecke des
     * 2×2-Blocks.
     *
     * SEIT v0.54 STEHT JEDE AUF IHREM EIGENEN FELD AUF (vorher wurden sie der
     * Reihe nach auf die vier Plätze verteilt). Damit zeigt das Brett vorher
     * genau das, was nachher passiert — man sieht die Gefallenen liegen und
     * wählt den Block, in dem sie liegen.
     */
    friedhof(stand, farbe, feld, gefallene) {
        const plaetze = SCHACH.friedhofsFelder(stand, feld);

        if (!plaetze || !gefallene || gefallene.length === 0) {
            return null;
        }

        let brett = stand.brett;
        const geliehen = SCHACH.geliehene(stand).slice();
        const felder = [];

        for (const eintrag of gefallene) {
            const art = eintrag.art;
            const platz = eintrag.feld;

            /* Könige stehen nie auf — sonst gäbe es zwei auf einer Seite, und
               „Schachmatt" wäre nicht mehr eindeutig. */
            if (art === "K" || SCHACH.artName(art) === "") {
                continue;
            }
            if (plaetze.indexOf(platz) === -1 || felder.indexOf(platz) !== -1) {
                continue;
            }

            /* Jede Figur bringt ihre eigene Frist mit (seit v0.57): je
               stärker, desto kürzer. Siehe `SCHACH.LEIHDAUER`. */
            const figur = (farbe === SCHACH.WEISS) ? art : art.toLowerCase();
            brett = SCHACH._brettMit(brett, platz, figur);
            geliehen.push({ feld: platz, bis: stand.takt + SCHACH.leihdauerVon(art) });
            felder.push(platz);
        }

        if (felder.length === 0) {
            return null;
        }

        return {
            stand: Object.assign({}, stand, { brett: brett, geliehen: geliehen }),
            felder: felder,
            text: felder.length + ((felder.length === 1)
                ? " Figur steht auf" : " Figuren stehen auf")
        };
    },

    /*
     * Eine verlorene Figur kehrt auf ein freies Feld zurück — und seit v0.61
     * auch der neue Bauer der Fähigkeit „Nachschub".
     *
     * FREI HEISST LEER UND NICHT GESPERRT. Bis v0.60 fragte diese Stelle nur
     * nach einer Figur; eine zurückkehrende Figur konnte deshalb in einem Riss
     * oder auf einer Mauer landen, also auf einem Feld, das es für die Regeln
     * gar nicht gibt. Der Friedhof prüft es seit jeher mit
     * (`friedhofsFelder`) — Wiederbelebung und Wiedergeburt nicht.
     */
    wiedergeburt(stand, farbe, feld, figurArt) {
        if (SCHACH.figurAuf(stand, feld) !== "." || SCHACH.gesperrt(stand, feld)) {
            return null;
        }
        if (!figurArt || SCHACH.artName(figurArt) === "") {
            return null;
        }

        const figur = (farbe === SCHACH.WEISS) ? figurArt : figurArt.toLowerCase();
        const neu = Object.assign({}, stand, {
            brett: SCHACH._brettMit(stand.brett, feld, figur)
        });

        return {
            stand: neu,
            felder: [feld],
            text: SCHACH.artName(figurArt) + " kehrt zurück"
        };
    },

    /* ---------------------------------------------------------------- *
     * Wirkung der Unglückswürfel
     *
     * Sie treffen die Seite, die den Würfel eingesammelt hat. Alle vier
     * liefern dasselbe wie die Fähigkeiten: { stand, felder, wege, text } oder
     * null, wenn nichts passieren kann.
     * ---------------------------------------------------------------- */

    /*
     * Der Schritt von einem Feld zum anderen, auf eins gekürzt — oder `null`,
     * wenn dazwischen keine gerade Linie liegt (Springer). Gebraucht überall
     * dort, wo die RICHTUNG eines Zuges zählt und nicht seine Länge.
     */
    _schrittZwischen(stand, von, nach) {
        const breite = SCHACH.breiteVon(stand);
        const dr = SCHACH.reiheVon(nach, breite) - SCHACH.reiheVon(von, breite);
        const ds = SCHACH.spalteVon(nach, breite) - SCHACH.spalteVon(von, breite);

        if (dr === 0 && ds === 0) {
            return null;
        }
        if (dr !== 0 && ds !== 0 && Math.abs(dr) !== Math.abs(ds)) {
            return null;
        }

        const schritte = Math.max(Math.abs(dr), Math.abs(ds));
        return { dr: dr / schritte, ds: ds / schritte };
    },

    /*
     * STOLPERSTEIN: DIE FIGUR FLIEGT DORTHIN ZURÜCK, WO SIE HERKAM
     * (seit v0.73, Meldung I8 — vorher: ein Feld Richtung eigener Grundreihe).
     *
     * Drei Dinge stecken darin:
     *
     *   - **Die Richtung ist die des ZUGES, rückwärts.** Ein diagonal
     *     ziehender Läufer fliegt diagonal zurück, nicht senkrecht. Ohne
     *     gerade Linie dazwischen (Springer) gibt es keine Richtung — dann
     *     kehrt die Figur an ihren AUSGANGSORT zurück.
     *   - **Gezählt wird ab dem Feld der LOOTBOX**, nicht ab dem Zielfeld:
     *     Man stolpert dort, wo der Stein liegt. Wer im Vorbeiziehen
     *     einsammelt, kommt also gar nicht erst an.
     *   - Ist das Feld dahinter besetzt oder gesperrt, wird weiter zurück
     *     gesucht — bis zum Ausgangsfeld. Findet sich nichts, passiert
     *     nichts.
     *
     * `wo` ist das Feld, auf dem die Figur JETZT steht, `von` ihr Ausgangsfeld
     * (oder -1, wenn sie nicht gezogen ist, sondern eine Fähigkeit sie gesetzt
     * hat), `bonusFeld` das Feld der Lootbox. Ohne Zug-Angaben gilt die Regel
     * von früher — dann gibt es keine Zugrichtung, an der man sich ausrichten
     * könnte.
     */
    stolperstein(stand, farbe, wo, von, bonusFeld) {
        const breite = SCHACH.breiteVon(stand);
        const figur = SCHACH.figurAuf(stand, wo);

        if (SCHACH.farbeVon(figur) !== farbe) {
            return null;
        }

        const hatZug = Number.isInteger(von) && von >= 0 && von !== wo;
        const schritt = hatZug ? SCHACH._schrittZwischen(stand, von, wo) : null;
        const ziele = [];

        if (schritt) {
            const start = (Number.isInteger(bonusFeld) && bonusFeld >= 0)
                ? bonusFeld
                : wo;

            let reihe = SCHACH.reiheVon(start, breite) - schritt.dr;
            let spalte = SCHACH.spalteVon(start, breite) - schritt.ds;

            while (SCHACH._imBrett(stand, reihe, spalte)) {
                const platz = SCHACH._feld(stand, reihe, spalte);
                ziele.push(platz);

                if (platz === von) {
                    break;
                }
                reihe -= schritt.dr;
                spalte -= schritt.ds;
            }

        } else if (hatZug) {
            /* Springer: dazwischen gibt es keine Richtung, also zurück an den
               Ausgangsort. */
            ziele.push(von);
        }

        if (ziele.length === 0) {
            /* Die Regel von früher, für alles, was nicht aus einem Zug kommt:
               ein Feld in Richtung der eigenen Grundreihe. */
            const zurueck = (farbe === SCHACH.WEISS) ? 1 : -1;
            const reihe = SCHACH.reiheVon(wo, breite) + zurueck;
            const spalte = SCHACH.spalteVon(wo, breite);

            if (SCHACH._imBrett(stand, reihe, spalte)) {
                ziele.push(SCHACH._feld(stand, reihe, spalte));
            }
        }

        const ziel = ziele.find((platz) => platz !== wo
            && SCHACH.figurAuf(stand, platz) === "."
            && !SCHACH.gesperrt(stand, platz));

        if (ziel === undefined) {
            return null;
        }

        let brett = SCHACH._brettMit(stand.brett, wo, ".");
        brett = SCHACH._brettMit(brett, ziel, figur);

        return {
            stand: Object.assign({}, stand, { brett: brett, enPassant: "" }),
            felder: [wo, ziel],
            wege: [{ von: wo, nach: ziel }],
            halt: ziel,
            text: SCHACH.artName(SCHACH.artVon(figur)) + " stolpert zurück"
        };
    },

    /*
     * Ausdehnung: Das Brett wächst an einer Seite um eine Reihe oder Spalte.
     * `seite` ist "oben", "unten", "links" oder "rechts".
     *
     * Die neuen Felder sind leer. Alle Feldnummern verschieben sich dabei —
     * deshalb werden auch die gemerkten Felder (Rochade, Schild, Fessel, Frost)
     * mit umgerechnet. Wer das vergisst, hat ein Schild auf dem falschen Feld.
     */
    ausdehnung(stand, seite) {
        const breite = SCHACH.breiteVon(stand);
        const hoehe = SCHACH.hoeheVon(stand);

        if ((seite === "links" || seite === "rechts") && breite >= SCHACH.SPALTEN.length) {
            return null;
        }
        if ((seite === "oben" || seite === "unten") && hoehe >= 9) {
            return null;
        }

        const neuBreite = (seite === "links" || seite === "rechts") ? breite + 1 : breite;
        const neuHoehe = (seite === "oben" || seite === "unten") ? hoehe + 1 : hoehe;

        /* Wohin rutscht das alte Brett? */
        const dSpalte = (seite === "links") ? 1 : 0;
        const dReihe = (seite === "oben") ? 1 : 0;

        const felder = new Array(neuBreite * neuHoehe).fill(".");
        const umrechnen = (feld) => {
            if (!Number.isInteger(feld) || feld < 0) {
                return -1;
            }
            const reihe = Math.floor(feld / breite) + dReihe;
            const spalte = (feld % breite) + dSpalte;
            return reihe * neuBreite + spalte;
        };

        for (let feld = 0; feld < breite * hoehe; feld++) {
            felder[umrechnen(feld)] = stand.brett[feld];
        }

        const neu = SCHACH._feldnummernUmrechnen(stand, {
            breite: neuBreite,
            hoehe: neuHoehe,
            brett: felder.join("")
        }, umrechnen);

        /* Die toten Ecken wachsen mit (seit v0.77.1) — siehe `_eckenFortsetzen`. */
        neu.risse = neu.risse
            .concat(SCHACH._eckenFortsetzen(stand, seite, neuBreite))
            .filter((feld, stelle, alle) => alle.indexOf(feld) === stelle)
            .sort((einer, anderer) => einer - anderer);

        const namen = { oben: "oben", unten: "unten", links: "links", rechts: "rechts" };

        return {
            stand: neu,
            felder: [],
            wege: [],
            umrechnen: umrechnen,
            text: "Das Feld wächst " + (namen[seite] || seite)
        };
    },

    /*
     * DIE TOTEN ECKEN WACHSEN MIT (seit v0.77.1).
     *
     * GEMELDET AM 18.08. mit Bildschirmfoto: „Gerade ist etwas ganz Komisches
     * passiert." Auf einem Kreuz-Brett waren die vier toten Ecken zerfranst —
     * links unten war alles bespielbar, rechts unten und links oben fehlten
     * Felder, und Lootboxen lagen dort, wo eigentlich ein Loch sein müsste.
     *
     * DIE URSACHE: Die Ausdehnung setzte die neue Zeile oder Spalte VOLLSTÄNDIG
     * frei. Auf einem gewöhnlichen Brett ist das richtig — auf einem Kreuz
     * bekommt die Ecke dadurch ein Loch nach aussen, und das Kreuz ist keins
     * mehr. Zusammen mit der Schrumpfung, die eine Linie samt ihren Rissen
     * WEGWIRFT (v0.54, richtig so), frisst sich die Form über eine lange Partie
     * von den Rändern her auf: Jedes Paar aus Schrumpfen und Wachsen kostet
     * eine Ecke, ohne dass jemand etwas dafür kann.
     *
     * DIE REGEL, in den Worten des Nutzers: „Wenn das Spielfeld erweitert wird,
     * soll davor die Spalte oder Zeile angeschaut werden und diese dann kopiert
     * — sprich bei Kreuz-Map sollen die Ecken, wenn sie noch da sind, mit
     * erweitert werden."
     *
     * KOPIERT WERDEN NUR DIE LÖCHER, NICHT DIE FIGUREN. Sonst stünde nach einer
     * Ausdehnung eine zweite Armee auf dem Brett.
     *
     * UND NUR DIE LÖCHER AN DEN ENDEN, zusammenhängend von dort gezählt. Genau
     * das sind die Ecken. Ein einzelnes Loch mitten in der Randlinie stammt
     * dagegen von einem ERDBEBEN — es gehört dem Spielverlauf, nicht der
     * Brettform, und würde sich sonst mit jeder Ausdehnung verbreitern.
     *
     * Auf einem Brett ohne Risse liefert die Rechnung eine leere Liste; für das
     * klassische Brett ändert sich also nichts.
     *
     * Liefert die Feldnummern IM NEUEN Brett.
     */
    _eckenFortsetzen(stand, seite, neuBreite) {
        const breite = SCHACH.breiteVon(stand);
        const hoehe = SCHACH.hoeheVon(stand);
        const senkrecht = (seite === "links" || seite === "rechts");

        /* Wie lang die angebaute Linie ist, welches Feld ihr im ALTEN Brett
           gegenüberliegt, und wo sie im NEUEN Brett zu liegen kommt. */
        const laenge = senkrecht ? hoehe : breite;

        const altFeld = (stelle) => senkrecht
            ? stelle * breite + ((seite === "links") ? 0 : breite - 1)
            : ((seite === "oben") ? 0 : hoehe - 1) * breite + stelle;

        const neuFeld = (stelle) => senkrecht
            ? stelle * neuBreite + ((seite === "links") ? 0 : neuBreite - 1)
            : ((seite === "oben") ? 0 : hoehe) * neuBreite + stelle;

        const istRiss = (stelle) => SCHACH.rissAuf(stand, altFeld(stelle));
        const neue = [];

        for (let stelle = 0; stelle < laenge && istRiss(stelle); stelle++) {
            neue.push(neuFeld(stelle));
        }
        for (let stelle = laenge - 1; stelle >= 0 && istRiss(stelle); stelle--) {
            neue.push(neuFeld(stelle));
        }

        /* Ist die ganze Linie ein Loch, treffen sich die beiden Läufe. */
        return neue.filter((feld, stelle, alle) => alle.indexOf(feld) === stelle);
    },

    /*
     * RECHNET ALLE GEMERKTEN FELDNUMMERN EINES STANDES UM (seit v0.54).
     *
     * Ändert sich die Brettgrösse, verschiebt sich JEDE Feldnummer — und der
     * Stand merkt sich an sieben Stellen welche. Wer eine vergisst, hat ein
     * Schild auf dem falschen Feld oder eine Mauer, die plötzlich woanders
     * steht. Bis v0.53 rechnete die Ausdehnung nur vier davon um; `mauern`,
     * `geliehen` und die Risse fehlten. Deshalb steht das jetzt an EINER Stelle,
     * die beide Richtungen bedient — Wachsen wie Schrumpfen.
     *
     * `umrechnen` liefert -1 für ein Feld, das es danach nicht mehr gibt; was
     * darauf lag, fällt weg.
     */
    _feldnummernUmrechnen(stand, masse, umrechnen) {
        const gueltig = (feld) => Number.isInteger(feld) && feld >= 0;
        const liste = (felder) => (felder || []).map(umrechnen).filter(gueltig);

        return Object.assign({}, stand, masse, {
            enPassant: "",
            rochadeFelder: liste(stand.rochadeFelder),
            rochadeKoenige: liste(stand.rochadeKoenige),

            schildFeld: (stand.schildFeld >= 0) ? umrechnen(stand.schildFeld) : -1,
            fesselFeld: (stand.fesselFeld >= 0) ? umrechnen(stand.fesselFeld) : -1,

            /* Der Frost ist seit v0.56 eine Liste — umgerechnet wird jedes
               Feld, und was vom Brett fällt, fällt aus dem Block. */
            frostFelder: liste(SCHACH.frostFelder(stand)),
            frostFeld: (stand.frostFeld >= 0) ? umrechnen(stand.frostFeld) : -1,

            /* Eine Mauer, von der nichts mehr übrig ist, verschwindet ganz. */
            mauern: SCHACH.mauern(stand)
                .map((eintrag) => ({ felder: liste(eintrag.felder), bis: eintrag.bis }))
                .filter((eintrag) => eintrag.felder.length > 0),

            geliehen: SCHACH.geliehene(stand)
                .map((eintrag) => ({ feld: umrechnen(eintrag.feld), bis: eintrag.bis }))
                .filter((eintrag) => gueltig(eintrag.feld)),

            /* Die achte Stelle (seit v0.65): die Startseiten der Bauern. Wer
               vom Brett fällt, verliert seinen Eintrag mit. */
            bauernSeiten: (Array.isArray(stand.bauernSeiten) ? stand.bauernSeiten : [])
                .map((eintrag) => ({ feld: umrechnen(eintrag.feld), seite: eintrag.seite }))
                .filter((eintrag) => gueltig(eintrag.feld)),

            /* Die neunte Stelle (seit v0.98): wer schon selbst gezogen hat.
               Dieselbe Rechnung, dieselbe Bedingung. */
            bauernZog: (Array.isArray(stand.bauernZog) ? stand.bauernZog : [])
                .map((feld) => umrechnen(feld))
                .filter((feld) => gueltig(feld)),

            risse: liste(SCHACH.risse(stand))
        });
    },

    /*
     * SCHRUMPFUNG: Das Brett verliert eine Reihe oder Spalte (seit v0.54).
     *
     * Das Gegenstück zur Ausdehnung, und die härtere Hälfte: Was auf der
     * wegfallenden Linie steht, ist weg — Figuren wie Würfel.
     *
     * EINE SEITE MIT KÖNIG FÄLLT NIE WEG. Das ist die Entscheidung des Nutzers
     * und zugleich das, was die Regel zusammenhält: Ohne sie könnte ein Würfel
     * einen König vom Brett nehmen und die Partie beenden, ohne dass jemand
     * etwas dafür konnte. Steht ein König unten rechts, sind also „unten" und
     * „rechts" gesperrt — die anderen beiden gehen, solange dort keiner steht.
     */
    schrumpfung(stand, seite) {
        const breite = SCHACH.breiteVon(stand);
        const hoehe = SCHACH.hoeheVon(stand);
        const senkrecht = (seite === "links" || seite === "rechts");

        /* Unter diese Maße geht es nicht — ein Brett braucht Platz für zwei
           Könige und einen Zug dazwischen. */
        if (senkrecht && breite <= 4) {
            return null;
        }
        if (!senkrecht && hoehe <= 4) {
            return null;
        }

        /* Welche Linie fällt weg? */
        const istBetroffen = (reihe, spalte) => {
            if (seite === "links") { return spalte === 0; }
            if (seite === "rechts") { return spalte === breite - 1; }
            if (seite === "oben") { return reihe === 0; }
            return reihe === hoehe - 1;
        };

        for (let feld = 0; feld < breite * hoehe; feld++) {
            if (!istBetroffen(Math.floor(feld / breite), feld % breite)) {
                continue;
            }
            if (SCHACH.artVon(SCHACH.figurAuf(stand, feld)) === "K") {
                return null;
            }
        }

        const neuBreite = senkrecht ? breite - 1 : breite;
        const neuHoehe = senkrecht ? hoehe : hoehe - 1;

        /* Rutscht der Rest zusammen? Nur, wenn vorne etwas wegfällt. */
        const dSpalte = (seite === "links") ? -1 : 0;
        const dReihe = (seite === "oben") ? -1 : 0;

        const umrechnen = (feld) => {
            if (!Number.isInteger(feld) || feld < 0) {
                return -1;
            }
            const reihe = Math.floor(feld / breite);
            const spalte = feld % breite;

            if (istBetroffen(reihe, spalte)) {
                return -1;
            }
            return (reihe + dReihe) * neuBreite + (spalte + dSpalte);
        };

        const felder = new Array(neuBreite * neuHoehe).fill(".");
        const verloren = [];

        for (let feld = 0; feld < breite * hoehe; feld++) {
            const ziel = umrechnen(feld);

            if (ziel < 0) {
                if (SCHACH.figurAuf(stand, feld) !== ".") {
                    verloren.push(feld);
                }
                continue;
            }
            felder[ziel] = stand.brett[feld];
        }

        const namen = { oben: "oben", unten: "unten", links: "links", rechts: "rechts" };

        return {
            stand: SCHACH._feldnummernUmrechnen(stand, {
                breite: neuBreite,
                hoehe: neuHoehe,
                brett: felder.join("")
            }, umrechnen),
            felder: [],
            wege: [],
            umrechnen: umrechnen,
            text: "Das Feld bricht " + (namen[seite] || seite) + " weg"
                + (verloren.length > 0
                    ? " — " + verloren.length + " Figur"
                        + (verloren.length === 1 ? "" : "en") + " stürzen mit"
                    : "")
        };
    },

    /*
     * ERDBEBEN: Risse reissen den Boden auf (seit v0.54).
     *
     * Bis v0.53 war das eine FÄHIGKEIT, die drei Reihen zur Seite schob. Auf
     * Nutzer-Ansage ist daraus ein Unglückswürfel mit anderer Wirkung geworden:
     * Es werden keine Figuren mehr verschoben, sondern einzelne Felder brechen
     * weg. Sie sind danach unpassierbar — nur ein Springer setzt darüber
     * hinweg —, und anders als eine Mauer bleiben sie die ganze Partie.
     *
     * Aufgerissen wird nur, wo NICHTS steht: Ein Riss unter einer Figur würde
     * sie entweder töten (dann wäre es eine Meuterei) oder auf einem gesperrten
     * Feld stehen lassen (dann käme sie nie wieder weg).
     */
    ERDBEBEN_RISSE: 3,

    erdbebenRisse(stand, wert) {
        const frei = [];

        for (let feld = 0; feld < SCHACH.felderVon(stand); feld++) {
            if (SCHACH.figurAuf(stand, feld) === "." && !SCHACH.gesperrt(stand, feld)) {
                frei.push(feld);
            }
        }

        if (frei.length === 0) {
            return null;
        }

        const neue = [];
        const anzahl = Math.min(SCHACH.ERDBEBEN_RISSE, frei.length);

        /*
         * Gestreut wird aus EINEM Wert: Jeder Riss verschiebt die Stelle um
         * einen ungeraden Schritt durch die Liste, damit die drei nicht
         * nebeneinander landen und trotzdem alles gerechnet bleibt.
         */
        const start = Math.floor(Math.min(Math.max(wert, 0), 0.999999) * frei.length);
        const schritt = 1 + Math.floor(frei.length / (anzahl + 1));

        for (let nummer = 0; nummer < anzahl; nummer++) {
            const feld = frei[(start + nummer * schritt) % frei.length];
            if (neue.indexOf(feld) === -1) {
                neue.push(feld);
            }
        }

        return {
            stand: Object.assign({}, stand, {
                risse: SCHACH.risse(stand).concat(neue)
            }),
            felder: neue,
            wege: [],
            text: neue.length + " Feld" + (neue.length === 1 ? "" : "er")
                + " bricht auf und bleibt gesperrt"
        };
    },

    /* Meuterei: Eine eigene Figur wechselt die Seite. */
    meuterei(stand, farbe, wahl) {
        const eigene = [];

        for (let feld = 0; feld < SCHACH.felderVon(stand); feld++) {
            const figur = SCHACH.figurAuf(stand, feld);
            if (SCHACH.farbeVon(figur) === farbe && SCHACH.artVon(figur) !== "K") {
                eigene.push(feld);
            }
        }

        if (eigene.length === 0) {
            return null;
        }

        const feld = eigene[Math.floor(wahl * eigene.length) % eigene.length];
        const figur = SCHACH.figurAuf(stand, feld);
        const gewendet = (farbe === SCHACH.WEISS)
            ? figur.toLowerCase()
            : figur.toUpperCase();

        return {
            stand: Object.assign({}, stand, {
                brett: SCHACH._brettMit(stand.brett, feld, gewendet)
            }),
            felder: [feld],
            wege: [],
            text: SCHACH.artName(SCHACH.artVon(figur)) + " läuft über"
        };
    },

    /* Erdrutsch: Alle eigenen Figuren ein Feld zurück. */
    erdrutsch(stand, farbe) {
        const breite = SCHACH.breiteVon(stand);
        const hoehe = SCHACH.hoeheVon(stand);

        /*
         * „ZURÜCK" IST JE FIGUR VERSCHIEDEN (seit v0.82).
         *
         * Bis v0.81 stand hier `zurueck = (farbe === WEISS) ? 1 : -1` — eine
         * einzige Richtung für die ganze Farbe, immer senkrecht. Auf dem KREUZ
         * hat eine Farbe aber ZWEI Startseiten (v0.65), und nachgemessen kam
         * dabei Unsinn heraus: Die obere weisse Armee rutschte nach UNTEN,
         * also nach VORN — aus der Strafe wurde ein Geschenk —, und die untere
         * bewegte sich gar nicht, weil hinter ihr das Brett zu Ende war.
         * Gemeldet als „kontrolliere Erdrutsch, ob es beim Kreuz-Spielfeld
         * noch funktioniert" (18.08.).
         *
         * Jetzt bekommt jede Figur die Richtung zu DER eigenen Startseite, die
         * ihr am nächsten liegt — dorthin gehört sie zurück. Auf jedem
         * gewohnten Brett gibt es nur eine Startseite, dort ändert sich also
         * nichts.
         */
        const seiten = SCHACH.startSeitenVon(stand, farbe)
            .filter((seite) => SCHACH.SEITEN[seite]);

        /* Wie weit ist dieses Feld von einer Seite entfernt? */
        const abstand = (seite, reihe, spalte) => {
            if (seite === "oben") { return reihe; }
            if (seite === "unten") { return hoehe - 1 - reihe; }
            if (seite === "links") { return spalte; }
            return breite - 1 - spalte;
        };

        const rutschVon = (reihe, spalte) => {
            let naechste = seiten[0];

            for (const seite of seiten) {
                if (abstand(seite, reihe, spalte) < abstand(naechste, reihe, spalte)) {
                    naechste = seite;
                }
            }
            /* Zur Seite hin, nicht von ihr weg: die Gegenrichtung der
               Laufrichtung, die `SEITEN` für diese Startseite nennt. */
            return { dr: -SCHACH.SEITEN[naechste].dr, ds: -SCHACH.SEITEN[naechste].ds };
        };

        let brett = stand.brett;
        const felder = [];
        const wege = [];

        /*
         * IN RUTSCHRICHTUNG VON VORN ABARBEITEN, damit vorn Platz entsteht.
         *
         * Bei EINER Richtung genügte dafür die passende Reihenfolge der
         * Reihen. Mit vier Startseiten auf einem Brett gibt es die nicht mehr:
         * Was für die obere Armee „von vorn" ist, ist für die untere „von
         * hinten".
         *
         * Gelöst über WIEDERHOLUNG: Es wird so lange durchgegangen, wie sich
         * noch etwas bewegt. Wer im ersten Durchgang blockiert war, kommt im
         * zweiten nach. Das endet sicher — jede Figur rutscht höchstens EIN
         * Feld (`schonGerutscht`), also gibt es höchstens so viele Durchgänge,
         * wie Figuren dieser Farbe auf dem Brett stehen.
         */
        const schonGerutscht = {};
        let nochmal = true;

        while (nochmal) {
            nochmal = false;

            for (let reihe = 0; reihe < hoehe; reihe++) {
                for (let spalte = 0; spalte < breite; spalte++) {
                    const von = reihe * breite + spalte;
                    const figur = brett[von];

                    if (SCHACH.farbeVon(figur) !== farbe || SCHACH.artVon(figur) === "K") {
                        continue;
                    }
                    if (schonGerutscht[von]) {
                        continue;
                    }

                    const richtung = rutschVon(reihe, spalte);
                    const zielReihe = reihe + richtung.dr;
                    const zielSpalte = spalte + richtung.ds;

                    if (!SCHACH._imBrett(stand, zielReihe, zielSpalte)) {
                        continue;
                    }

                    const ziel = SCHACH._feld(stand, zielReihe, zielSpalte);

                    /*
                     * FREI HEISST LEER UND NICHT GESPERRT (seit v0.82).
                     *
                     * Bis v0.81 fragte der Erdrutsch als EINZIGE dieser
                     * Funktionen nur „steht da eine Figur" — er schob Figuren
                     * damit auf Mauern und in Risse hinein, wo sie danach auf
                     * einem Feld standen, das es für die Regeln gar nicht mehr
                     * gibt. Nachgemessen am 18.08. an einer Mauer und an einem
                     * Riss; beides trat wirklich ein. Bauernschub, Nudelholz,
                     * Erdbeben und Schubs fragen hier seit jeher richtig — der
                     * Erdrutsch war übersehen worden, genau wie das Nudelholz
                     * bis v0.59.
                     */
                    if (brett[ziel] !== "." || SCHACH.gesperrt(stand, ziel)) {
                        continue;
                    }

                    brett = SCHACH._brettMit(brett, von, ".");
                    brett = SCHACH._brettMit(brett, ziel, figur);
                    felder.push(von, ziel);
                    wege.push({ von: von, nach: ziel });

                    /* Jede Figur rutscht höchstens EIN Feld — sonst schöbe der
                       zweite Durchgang dieselbe noch einmal weiter. */
                    schonGerutscht[ziel] = true;
                    nochmal = true;
                }
            }
        }

        if (felder.length === 0) {
            return null;
        }

        return {
            stand: Object.assign({}, stand, { brett: brett, enPassant: "" }),
            felder: felder,
            wege: wege,
            text: "Alles rutscht zurück"
        };
    },

    /*
     * WIE LANGE GILT AUF DIESEM FELD NOCH ETWAS? (seit v0.53)
     *
     * Liefert die Zahl der Halbzüge, die eine zeitlich begrenzte Wirkung hier
     * noch hat — 0, wenn nichts abläuft. Der Bildschirm zeichnet daraus die
     * kleine Zahl an der Ecke des Feldes.
     *
     * Warum im REGELWERK und nicht im Bildschirm: Die Fristen stehen hier
     * (`bis` gegen `takt`, Schild und Fessel gegen den nächsten Zug). Wer sie
     * im Bildschirm nachrechnet, hat sie zweimal — und beim nächsten Umbau
     * stimmt eine von beiden nicht mehr.
     *
     * Liegt mehreres auf einem Feld, zählt das, was ZUERST abläuft: Danach
     * ändert sich dort etwas, und genau darauf will man sich einstellen.
     */
    restzeitAuf(stand, feld) {
        const reste = [];

        for (const leihe of SCHACH.geliehene(stand)) {
            if (leihe.feld === feld) {
                reste.push(leihe.bis - stand.takt);
            }
        }

        for (const mauer of SCHACH.mauern(stand)) {
            if (mauer.felder.indexOf(feld) !== -1) {
                reste.push(mauer.bis - stand.takt);
            }
        }

        /*
         * Schild und Frost hängen an keiner Uhr, sondern am nächsten Zug der
         * betroffenen Seite. Das ist genau ein Halbzug — ist die Seite gerade
         * am Zug, läuft er JETZT ab, sonst nach dem Zug des Gegners.
         */
        if (stand.schildFeld === feld && stand.schildFarbe) {
            reste.push((stand.amZug === stand.schildFarbe) ? 2 : 1);
        }
        if (stand.frostFarbe && SCHACH.frostFelder(stand).indexOf(feld) !== -1) {
            reste.push((stand.amZug === stand.frostFarbe) ? 1 : 2);
        }

        /* Die Fessel läuft seit v0.56 nach der Uhr — sie wird gerechnet wie
           eine Mauer, nicht wie das Schild. */
        if (stand.fesselFeld === feld && stand.fesselFarbe) {
            reste.push(stand.fesselBis - stand.takt);
        }

        const gueltig = reste.filter((rest) => rest > 0);
        if (gueltig.length === 0) {
            return 0;
        }

        return Math.min.apply(null, gueltig);
    },

    /* ---------------------------------------------------------------- *
     * Spielende
     * ---------------------------------------------------------------- */

    /*
     * Liefert den Zustand der Partie:
     *   { art: "laeuft" | "matt" | "patt" | "remis", sieger, text }
     */
    lage(stand) {
        const amZugName = (stand.amZug === SCHACH.WEISS) ? "Weiss" : "Schwarz";

        const variante = SCHACH.varianteVon(stand);

        /*
         * Wo Könige überhaupt geschlagen werden können, zählt zuerst: Wer
         * keinen mehr hat, hat verloren. Das gilt für beide Wege dorthin — für
         * das Doppelbrett (`koenigSchlagbar`, nie Schach) und für die zwei
         * Leben der Zufallsarmee (`koenigeAlsLeben`). Bei letzterer greift
         * dieser Fall aber erst, wenn AUCH der letzte König weg ist, und der
         * ist unantastbar: Die Partie endet dort durch Matt, nicht hier.
         */
        if (variante.koenigSchlagbar || variante.koenigeAlsLeben) {
            for (const farbe of [SCHACH.WEISS, SCHACH.SCHWARZ]) {
                if (SCHACH.koenigFelder(stand, farbe).length === 0) {
                    const sieger = SCHACH.gegner(farbe);
                    return {
                        art: "matt",
                        sieger: sieger,
                        text: "Kein König mehr — "
                            + ((sieger === SCHACH.WEISS) ? "Weiss" : "Schwarz") + " gewinnt."
                    };
                }
            }
        }

        /* Bretter ohne Schach-Begriff sind damit fertig. */
        if (variante.koenigSchlagbar) {
            if (SCHACH.alleZuege(stand).length === 0) {
                return { art: "patt", sieger: "", text: "Patt — unentschieden." };
            }
            return { art: "laeuft", sieger: "", text: amZugName + " ist am Zug." };
        }

        const hatZuege = SCHACH.alleZuege(stand).length > 0;
        const schach = SCHACH.imSchach(stand, stand.amZug);

        if (!hatZuege && schach) {
            const sieger = SCHACH.gegner(stand.amZug);
            return {
                art: "matt",
                sieger: sieger,
                text: "Schachmatt — " + ((sieger === SCHACH.WEISS) ? "Weiss" : "Schwarz") + " gewinnt."
            };
        }

        if (!hatZuege) {
            return { art: "patt", sieger: "", text: "Patt — unentschieden." };
        }

        if (stand.halbzuege >= 100) {
            return {
                art: "remis",
                sieger: "",
                text: "Unentschieden nach der Fünfzig-Züge-Regel."
            };
        }

        if (schach) {
            return { art: "laeuft", sieger: "", text: amZugName + " steht im Schach." };
        }

        return { art: "laeuft", sieger: "", text: amZugName + " ist am Zug." };
    }
};

/* Damit die Regressionstests die Datei außerhalb des Browsers laden können.
   SCHACH_VARIANTEN muss dort vorher als globale Größe bereitstehen — genau wie
   im Browser, wo die Datei davor eingebunden ist. */
if (typeof module !== "undefined" && module.exports) {
    module.exports = SCHACH;
}
