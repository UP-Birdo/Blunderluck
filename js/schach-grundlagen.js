/*
 * schach-grundlagen.js — die Schachregeln zum Nachlesen (seit v0.96,
 * auf dem normalen 8-mal-8-Brett seit v0.97).
 *
 * Wozu: Team Schach wird von Leuten gespielt, die Schach nicht unbedingt
 * können. Die Fähigkeiten haben seit v0.41 ihre Bildanleitung; die GRUNDLAGEN
 * — wie eine Figur zieht, wann Schach, Matt und Patt gilt — standen nirgends.
 *
 * DIESELBE EISERNE REGEL WIE BEI DER BILDANLEITUNG: Die Bilder werden mit den
 * echten Regeln GERECHNET, nie gezeichnet. Wo dieses Kapitel „so zieht der
 * Springer" sagt, hat `SCHACH.zuege` die Felder geliefert; wo es „das ist Matt"
 * sagt, hat `SCHACH.lage` es gesagt. Eine Anleitung, die ihre Bilder selbst
 * malt, veraltet beim ersten Regel-Umbau und behauptet danach etwas Falsches.
 * Ein Test hält für jedes Kapitel fest, dass sein Bild wirklich aufgeht.
 *
 * Aufbau: `KAPITEL` ist eine reine Tabelle. Jeder Eintrag nennt seine
 * Stellung, das Feld, um das es geht, und den Text. `bilder(id)` macht daraus
 * die fertigen Schritte für den Bildschirm — in derselben Form, die
 * `TEAM_SCHACH._beispielBrettBauen` schon von der Fähigkeiten-Anleitung kennt
 * (`{ runde, marken, ziele, tipp, wege, text }`). Der Bildschirm baut damit
 * nichts Eigenes.
 *
 * DAS BRETT IST DAS NORMALE (seit v0.97): 8 mal 8 Felder, die Spielart
 * `standard`. Die Bildanleitung der Fähigkeiten nimmt ein kleineres 6-mal-6,
 * weil dort eine WIRKUNG gezeigt wird und das Brett nur der Rahmen ist. Hier
 * ist das Brett die Sache selbst: Wer Schach lernt, soll es auf dem Brett
 * lernen, das er nachher vor sich hat — mit acht Reihen, den echten Feldnamen
 * und den Startfeldern, an denen Rochade und Umwandlung wirklich hängen.
 */

const SCHACH_GRUNDLAGEN = {

    BREITE: 8,
    HOEHE: 8,

    /* Feldnummer aus Reihe und Spalte, beide von 0 an — nur zum Schreiben der
       Stellungen unten. Im Spiel rechnet `SCHACH` selbst. */
    _feld(reihe, spalte) {
        return reihe * SCHACH_GRUNDLAGEN.BREITE + spalte;
    },

    /*
     * Die Figuren in der Reihenfolge ihres Wertes — die Antwort auf „was ist
     * mehr wert". Die Zahlen kommen aus `SCHACH_RUNDE.FIGUR_WERT`, also aus
     * derselben Tabelle, mit der die Bilanz am Ende der Partie rechnet. Zwei
     * Listen von Figurenwerten würden auseinanderlaufen.
     *
     * DER KÖNIG STEHT OBEN UND ZEIGT SEIT PUNKT 50 EINE 15. Im Modell trägt
     * er weiterhin 0 — die Zahl fürs Auge steht daneben in `ANZEIGE_WERT`
     * und wird nirgends verrechnet.
     */
    FIGUREN: ["K", "D", "T", "L", "S", "B"],

    /*
     * Die Kapitel. `art` sagt, WIE das Bild entsteht:
     *
     *   "gangart"   Eine Figur steht allein auf dem Brett; ihre möglichen
     *               Felder werden markiert (`SCHACH.zuege`).
     *   "lage"      Eine Stellung, deren Ausgang `SCHACH.lage` beurteilt —
     *               Schach, Matt oder Patt. Der Text nennt, was erwartet wird;
     *               ein Test prüft, dass die Regel dasselbe sagt.
     *   "zug"       Ein Zug wird wirklich ausgeführt (`SCHACH.ziehen`), das
     *               Bild zeigt vorher und nachher. Für die Sonderzüge.
     */
    KAPITEL: [
        /* ---- Die Figuren und ihre Gangart ---- */
        {
            id: "bauer",
            gruppe: "figuren",
            titel: "Der Bauer",
            art: "gangart",
            figur: "B",
            /*
             * EIN GEGNER DAVOR, EINER SCHRÄG DAVOR — und beides zusammen ist
             * die Aussage des Bildes: Das Feld geradeaus fällt weg (dort steht
             * jemand, und geradeaus schlägt er nicht), das schräge kommt dazu.
             * Ein Test prüft genau diese zwei Punkte; wer die Stellung beim
             * Aufräumen glattzieht, nimmt dem Bild seinen Sinn.
             */
            brett: [
                "........",
                "........",
                "........",
                "...ss...",
                "...B....",
                "........",
                "........",
                "........"
            ],
            text: "Er geht ein Feld nach vorn und nie zurück. Schlagen kann er "
                + "nur SCHRÄG nach vorn — das Feld direkt vor ihm ist hier "
                + "deshalb kein Zug. Vom Startfeld darf er zwei Felder auf "
                + "einmal. In der letzten Reihe wird er zu einer Figur deiner "
                + "Wahl, fast immer zur Dame."
        },
        {
            id: "springer",
            gruppe: "figuren",
            titel: "Der Springer",
            art: "gangart",
            figur: "S",
            brett: [
                "........",
                "........",
                "........",
                "........",
                "...S....",
                "........",
                "........",
                "........"
            ],
            text: "Zwei Felder gerade, eines zur Seite — ein L. Er ist der "
                + "einzige, der über andere Figuren HINWEGSETZT. Dafür trifft "
                + "er nie zwei Felder, die nebeneinanderliegen."
        },
        {
            id: "laeufer",
            gruppe: "figuren",
            titel: "Der Läufer",
            art: "gangart",
            figur: "L",
            brett: [
                "........",
                "........",
                "........",
                "........",
                "...L....",
                "........",
                "........",
                "........"
            ],
            text: "Schräg, so weit er will. Er bleibt sein Leben lang auf "
                + "seiner Farbe: Ein Läufer, der auf einem hellen Feld "
                    + "startet, "
                + "erreicht nie ein dunkles."
        },
        {
            id: "turm",
            gruppe: "figuren",
            titel: "Der Turm",
            art: "gangart",
            figur: "T",
            brett: [
                "........",
                "........",
                "........",
                "........",
                "...T....",
                "........",
                "........",
                "........"
            ],
            text: "Gerade, so weit er will — quer und längs. Er kommt an jedes "
                + "Feld des Bretts, braucht dafür aber freie Bahn."
        },
        {
            id: "dame",
            gruppe: "figuren",
            titel: "Die Dame",
            art: "gangart",
            figur: "D",
            brett: [
                "........",
                "........",
                "........",
                "........",
                "...D....",
                "........",
                "........",
                "........"
            ],
            text: "Turm und Läufer in einer Figur: gerade UND schräg, so weit "
                + "sie will. Die stärkste Figur — und deshalb die, deren "
                + "Verlust am meisten wehtut."
        },
        {
            id: "koenig",
            gruppe: "figuren",
            titel: "Der König",
            art: "gangart",
            figur: "K",
            brett: [
                "........",
                "........",
                "........",
                "........",
                "...K....",
                "........",
                "........",
                "........"
            ],
            text: "Ein Feld in jede Richtung. Er zieht am wenigsten und "
                + "entscheidet alles: Geht er verloren, ist die Partie vorbei. "
                + "Er darf nie auf ein bedrohtes Feld ziehen."
        },

        /* ---- Wie eine Partie ausgeht ---- */
        {
            id: "schach",
            gruppe: "ausgang",
            titel: "Schach",
            art: "lage",
            /* Der Turm auf e1 deckt die ganze e-Linie und greift den König auf
               e8 an. Der hat noch Felder — also Schach und nicht Matt. */
            brett: [
                "....k...",
                "........",
                "........",
                "........",
                "........",
                "........",
                "........",
                "K...T..."
            ],
            amZug: "schwarz",
            erwartet: "laeuft",
            imSchach: true,
            text: "Der König wird angegriffen — hier vom Turm, der die ganze "
                + "Spalte deckt. Schach ist noch kein Ende, aber du musst es "
                    + "sofort auflösen: weglaufen, den Angreifer schlagen oder "
                    + "etwas dazwischenstellen. Züge, die das Schach stehen "
                    + "lassen, bietet das Brett gar nicht erst an."
        },
        {
            id: "matt",
            gruppe: "ausgang",
            titel: "Schachmatt",
            art: "lage",
            /*
             * Das Turm-Matt an der Kante — das erste, das man lernt: Der Turm
             * hält die oberste Reihe, der eigene König nimmt die drei Felder
             * darunter. Zusammen bleibt nichts übrig.
             */
            brett: [
                "T...k...",
                "........",
                "....K...",
                "........",
                "........",
                "........",
                "........",
                "........"
            ],
            amZug: "schwarz",
            erwartet: "matt",
            text: "Schach — und keiner der drei Wege geht mehr. Weglaufen kann "
                + "er nicht: Der gegnerische König deckt die Felder vor ihm, "
                + "die oberste Reihe hält der Turm. Das ist das Ende. Der König "
                + "wird nie geschlagen — die Partie endet einen Schritt vorher."
        },
        {
            id: "patt",
            gruppe: "ausgang",
            titel: "Patt — unentschieden",
            art: "lage",
            /*
             * Die Standard-Pattstellung: Der König steht in der Ecke h8, die
             * Dame auf g6 nimmt ihm g8, g7 und h7 — sein eigenes Feld greift
             * sie aber NICHT an. Kein Schach, kein Zug.
             */
            brett: [
                ".......k",
                "........",
                "......D.",
                "........",
                "........",
                "........",
                "........",
                "K......."
            ],
            amZug: "schwarz",
            erwartet: "patt",
            text: "Der König steht NICHT im Schach — und trotzdem geht kein "
                + "einziger Zug mehr. Das ist Patt: unentschieden. Wer weit "
                    + "vorn liegt, verschenkt so den Sieg — lass dem Gegner ein "
                    + "Feld."
        },

        /* ---- Züge, die man kennen muss ---- */
        {
            id: "umwandlung",
            gruppe: "sonderzuege",
            titel: "Umwandlung",
            art: "zug",
            /* Ein Bauer auf b7 — ein Feld vor der letzten Reihe. */
            brett: [
                "........",
                ".B......",
                "........",
                "........",
                "........",
                "........",
                "........",
                "........"
            ],
            von: [1, 1],
            nach: [0, 1],
            umwandlung: "D",
            text: "Erreicht ein Bauer die letzte Reihe, wird er zu einer Figur "
                + "deiner Wahl — fast immer der Dame. Deshalb sind Bauern im "
                + "Endspiel viel mehr wert, als sie aussehen."
        },
        {
            id: "rochade",
            gruppe: "sonderzuege",
            titel: "Rochade",
            art: "zug",
            /*
             * König und Turm mit ihren Rechten, dazwischen frei.
             *
             * Die Rechte stehen hier AUSDRÜCKLICH (`rochadeFelder`,
             * `rochadeKoenige`) und werden nicht aus der Spielart gelesen.
             * Seit v0.97 wäre beides möglich — die Spielart ist `standard`,
             * und dort stehen König und Türme auf ihren gewohnten Feldern.
             * Ausdrücklich ist trotzdem besser: Das Bild zeigt nur zwei
             * Figuren, nicht die ganze Grundstellung, und aus einer LEEREN
             * Reihe liest keine Tabelle ein Recht heraus. Das Regelwerk nimmt
             * die Rechte ohnehin aus dem Stand — siehe `SCHACH._rochadeTuerme`.
             */
            /* Die echten Felder: König e1, Turm h1, dazwischen frei. Auf dem
               normalen Brett ist das die kurze Rochade, wie man sie kennt. */
            brett: [
                "........",
                "........",
                "........",
                "........",
                "........",
                "........",
                "........",
                "....K..T"
            ],
            rochadeKoenige: [[7, 4]],
            rochadeFelder: [[7, 7]],
            von: [7, 4],
            nach: [7, 6],
            text: "Der einzige Zug mit ZWEI eigenen Figuren: Der König geht "
                + "zwei Felder auf den Turm zu, der Turm springt auf die andere "
                + "Seite. Sie geht nur, wenn beide noch nie gezogen haben, "
                + "dazwischen alles frei ist und der König weder im Schach "
                + "steht noch über ein bedrohtes Feld läuft."
        },
        {
            id: "enpassant",
            gruppe: "sonderzuege",
            titel: "Im Vorbeigehen schlagen",
            art: "zug",
            /*
             * Schwarz zieht mit dem Doppelschritt NEBEN den weissen Bauern —
             * erst dadurch gibt es den Sonderzug überhaupt. Deshalb ist
             * Schwarz hier am Zug: Der Doppelschritt wird wirklich gezogen
             * (`vorzug`), nicht behauptet.
             */
            /* Weisser Bauer auf e5, schwarzer auf d7: Der Doppelschritt d7-d5
               stellt ihn direkt daneben — und genau dann geht der Sonderzug. */
            brett: [
                "........",
                "...b....",
                "........",
                "....B...",
                "........",
                "........",
                "........",
                "........"
            ],
            amZug: "schwarz",
            vorzug: { von: [1, 3], nach: [3, 3] },
            von: [3, 4],
            nach: [2, 3],
            text: "Zieht ein gegnerischer Bauer mit dem Doppelschritt an "
                + "deinem vorbei, darfst du ihn schlagen, als wäre er nur ein "
                + "Feld gegangen — aber nur SOFORT im nächsten Zug."
        }
    ],

    /*
     * Die Gruppen in der Reihenfolge, in der sie am Bildschirm stehen.
     *
     * SEIT PUNKT 50 SIND ES DREI STATT VIER. „Die Figuren und wie sie
     * ziehen" und „Was ist wie viel wert?" waren zwei Listen mit denselben
     * sechs Figuren; die zweite sagte nichts, was nicht in die erste
     * gepasst hätte. Nutzer-Ansage 28.08.2026: „schach lernen die ersten
     * punkt wo die basis züge funktionieren dieses hinter mneü soll auch bei
     * dem tab drunter angezeigt werden wo vorschau bilder der figutrn und
     * derren wert gezeigt werden … über den vorschau bilder kann ja dann
     * weg", bestätigt am 01.09.2026 („dinge bei schach lernen
     * zusammenführen").
     */
    GRUPPEN: [
        {
            id: "figuren",
            titel: "Die Figuren, ihr Wert und ihre Gangart",
            text: "Von der wertvollsten Figur zur kleinsten. Die Zahl ist die "
                + "Faustregel, mit der auch die Auswertung rechnet; hinter "
                + "jeder Figur steht, wohin sie ziehen kann."
        },
        {
            id: "ausgang",
            titel: "Schach, Matt und Patt",
            text: "Die drei Wörter, die über die Partie entscheiden — und der "
                + "Unterschied, der am häufigsten missverstanden wird."
        },
        {
            id: "sonderzuege",
            titel: "Drei Züge, die anders sind",
            text: "Sie sehen aus wie Ausnahmen und sind welche. Wer sie nicht "
                + "kennt, wundert sich, wenn das Brett sie plötzlich anbietet."
        }
    ],

    /* Alle Kapitel einer Gruppe. */
    kapitelDerGruppe(gruppeId) {
        return SCHACH_GRUNDLAGEN.KAPITEL.filter(
            (eintrag) => eintrag.gruppe === gruppeId);
    },

    kapitel(id) {
        return SCHACH_GRUNDLAGEN.KAPITEL.find((eintrag) => eintrag.id === id) || null;
    },

    /*
     * DER ANZEIGE-WERT DES KÖNIGS (Punkt 50, Nutzer-Ansage 01.09.2026:
     * „könig = 15 punkte").
     *
     * ER GEHÖRT HIERHER UND NIEMALS IN `SCHACH_RUNDE.FIGUR_WERT`. Dort
     * trägt der König 0, und mit dieser 0 rechnen Material-Bilanz, Beute
     * und der Computer-Gegner. Eine 15 in jener Tabelle würde jede Bilanz um
     * 15 verschieben und alle Punktestände mitziehen — sie steht deshalb
     * hier daneben und wird ausschliesslich angezeigt. Ein Test hält beides
     * fest: die 0 im Modell und die 15 am Bildschirm.
     *
     * Warum überhaupt eine Zahl: Bis Punkt 50 stand beim König ein „—".
     * Das beantwortete die Frage nicht, die man an dieser Liste stellt —
     * „was ist mehr wert" —, sondern wich ihr aus. 15 ist mehr als Dame
     * plus Läufer und sagt damit dasselbe wie das Wort „unersetzlich", nur
     * in der Sprache der Liste.
     */
    ANZEIGE_WERT: { K: 15 },

    /*
     * Die Figurenwerte als fertige Liste für den Bildschirm — Zeichen, Name,
     * Wert, Satz und das Gangart-Kapitel.
     *
     * ZWEI ZAHLEN JE FIGUR: `wert` ist die des Modells
     * (`SCHACH_RUNDE.FIGUR_WERT`), mit der gerechnet wird; `anzeigeWert` die,
     * die dasteht. Bei fünf der sechs Figuren sind sie gleich, beim König
     * gehen sie auseinander.
     */
    WERT_SATZ: {
        K: "Mehr als jede andere Figur — und trotzdem nicht zu ersetzen: "
            + "Geht er verloren, ist die Partie aus.",
        D: "Die stärkste Figur. Sie allein wiegt zwei Türme fast auf.",
        T: "Stark auf freien Linien. Zwei Türme sind mehr wert als eine Dame.",
        L: "So viel wie ein Springer — aber nur auf seiner Farbe.",
        S: "So viel wie ein Läufer. Im Gedränge oft besser, weil er springt.",
        B: "Der kleinste Wert — bis er die letzte Reihe erreicht."
    },

    werte() {
        return SCHACH_GRUNDLAGEN.FIGUREN.map((art) => ({
            art: art,
            name: SCHACH.artName(art),
            wert: SCHACH_RUNDE.FIGUR_WERT[art],
            anzeigeWert: (SCHACH_GRUNDLAGEN.ANZEIGE_WERT[art] !== undefined)
                ? SCHACH_GRUNDLAGEN.ANZEIGE_WERT[art]
                : SCHACH_RUNDE.FIGUR_WERT[art],
            satz: SCHACH_GRUNDLAGEN.WERT_SATZ[art] || "",
            kapitel: SCHACH_GRUNDLAGEN.kapitelZuFigur(art)
        }));
    },

    /*
     * Das Gangart-Kapitel einer Figur — die Verbindung, aus der seit Punkt 50
     * die EINE gemeinsame Liste entsteht. Jede der sechs Figuren hat eines;
     * ein Test hält das fest, damit der Bildschirm sich darauf verlassen darf.
     */
    kapitelZuFigur(art) {
        return SCHACH_GRUNDLAGEN.KAPITEL.find((eintrag) =>
            eintrag.gruppe === "figuren" && eintrag.figur === art) || null;
    },

    /*
     * Eine Runde aus einer geschriebenen Stellung — dieselbe Form, die auch
     * die Fähigkeiten-Anleitung benutzt, damit der Bildschirm nur EINEN
     * Brett-Zeichner braucht.
     *
     * Die Rochade-Rechte werden NUR gesetzt, wo ein Kapitel sie braucht.
     * `standNormalisieren` liest sie sonst aus der Stellung, und ein König auf
     * seinem Startfeld hätte sie ungewollt.
     */
    _runde(kapitel) {
        const felder = (liste) => (liste || []).map(
            (paar) => SCHACH_GRUNDLAGEN._feld(paar[0], paar[1]));

        return SCHACH_RUNDE.normalisieren({
            id: "grundlagen-" + kapitel.id,
            variante: "standard",
            regeln: { faehigkeiten: false },

            /*
             * KEINE LOOTBOXEN — und die leere Liste ist Absicht, kein Beiwerk.
             *
             * `normalisieren` legt die Startwürfel der Spielart auf das Brett,
             * WENN die Runde gar keine Liste mitbringt. Die alte, versteckte
             * Spielart `faehigkeiten` trägt aus Umstiegs-Gründen vier solche
             * Felder — und genau die lagen bis v0.96 in jedem Bild dieser
             * Anleitung, obwohl mit Schachregeln keine Lootbox etwas zu tun
             * hat. Gemeldet vom Nutzer.
             *
             * Mit `standard` gäbe es sie ohnehin nicht; die leere Liste steht
             * trotzdem hier, damit ein Wechsel der Spielart sie nicht
             * zurückholt.
             */
            bonus: [],
            stand: {
                brett: kapitel.brett.join(""),
                breite: SCHACH_GRUNDLAGEN.BREITE,
                hoehe: SCHACH_GRUNDLAGEN.HOEHE,
                amZug: kapitel.amZug || "weiss",
                rochade: "",
                rochadeFelder: felder(kapitel.rochadeFelder),
                rochadeKoenige: felder(kapitel.rochadeKoenige)
            }
        });
    },

    /*
     * DIE BILDER EINES KAPITELS — gerechnet, nicht gezeichnet.
     *
     * Liefert eine Liste aus `{ runde, marken, ziele, tipp, wege, text }`.
     * Ein Kapitel der Art "gangart" und "lage" hat EIN Bild, eines der Art
     * "zug" hat zwei (vorher und nachher).
     *
     * Liefert eine leere Liste, wenn die Stellung nicht aufgeht — dann sagt
     * der Test es, nicht der Nutzer.
     */
    bilder(id) {
        const kapitel = SCHACH_GRUNDLAGEN.kapitel(id);
        if (!kapitel) {
            return [];
        }

        const runde = SCHACH_GRUNDLAGEN._runde(kapitel);

        if (kapitel.art === "gangart") {
            return SCHACH_GRUNDLAGEN._gangartBilder(kapitel, runde);
        }
        if (kapitel.art === "lage") {
            return SCHACH_GRUNDLAGEN._lageBilder(kapitel, runde);
        }
        return SCHACH_GRUNDLAGEN._zugBilder(kapitel, runde);
    },

    /* Wo steht die Figur, um die es geht? Gesucht wird sie im Brett — so muss
       kein Kapitel eine Feldnummer von Hand nennen, die beim Verschieben der
       Stellung falsch würde. */
    _figurFeld(runde, figur) {
        return runde.stand.brett.indexOf(figur);
    },

    _gangartBilder(kapitel, runde) {
        const feld = SCHACH_GRUNDLAGEN._figurFeld(runde, kapitel.figur);
        if (feld === -1) {
            return [];
        }

        /* HIER kommen die Punkte her: aus dem Regelwerk, nicht aus einer
           Liste im Text. Wer eine Gangart ändert, ändert damit das Bild. */
        const zuege = SCHACH.zuege(runde.stand, feld);

        return [{
            runde: runde,
            marken: [feld],
            ziele: zuege.map((zug) => zug.nach),
            tipp: -1,
            wege: [],
            text: kapitel.text
        }];
    },

    _lageBilder(kapitel, runde) {
        return [{
            runde: runde,
            marken: [SCHACH.koenigFeld(runde.stand, runde.stand.amZug)],
            ziele: SCHACH.alleZuege(runde.stand).map((zug) => zug.nach),
            tipp: -1,
            wege: [],
            text: kapitel.text
        }];
    },

    _zugBilder(kapitel, runde) {
        let vorher = runde;

        /*
         * Manche Sonderzüge brauchen einen Zug DAVOR, damit es sie überhaupt
         * gibt — beim Schlagen im Vorbeigehen den Doppelschritt des Gegners.
         * Der wird wirklich gezogen, nicht behauptet.
         */
        if (kapitel.vorzug) {
            const zwischen = SCHACH.ziehen(vorher.stand,
                SCHACH_GRUNDLAGEN._feld(kapitel.vorzug.von[0], kapitel.vorzug.von[1]),
                SCHACH_GRUNDLAGEN._feld(kapitel.vorzug.nach[0], kapitel.vorzug.nach[1]));

            if (!zwischen) {
                return [];
            }
            vorher = SCHACH_RUNDE.kopieren(vorher);
            vorher.stand = zwischen.stand;
        }

        const von = SCHACH_GRUNDLAGEN._feld(kapitel.von[0], kapitel.von[1]);
        const nach = SCHACH_GRUNDLAGEN._feld(kapitel.nach[0], kapitel.nach[1]);

        const ergebnis = SCHACH.ziehen(vorher.stand, von, nach, kapitel.umwandlung);
        if (!ergebnis) {
            return [];
        }

        const nachher = SCHACH_RUNDE.kopieren(vorher);
        nachher.stand = ergebnis.stand;

        return [
            {
                runde: vorher,
                marken: [von],
                ziele: [nach],
                tipp: von,
                wege: [],
                text: kapitel.text
            },
            {
                runde: nachher,
                marken: [nach],
                ziele: [],
                tipp: -1,
                wege: [[von, nach]],
                text: "So sieht es danach aus."
            }
        ];
    }
};

/* Für die Tests ausserhalb des Browsers. SCHACH, SCHACH_VARIANTEN und
   SCHACH_RUNDE müssen dort vorher als globale Größen bereitstehen. */
if (typeof module !== "undefined" && module.exports) {
    module.exports = SCHACH_GRUNDLAGEN;
}
