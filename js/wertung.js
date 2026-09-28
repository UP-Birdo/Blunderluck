/*
 * wertung.js — die Wertung einer Turm-Partie (seit v0.148.0, Runde 5;
 * FORTSCHRITT.md: „wie Chess.com: jeder Zug Brillant !! · Stark ! · Gut ·
 * Ungenau ?! · Fehler ? · Blunder ?? → Genauigkeit %; Glück getrennt").
 *
 * WIE GERECHNET WIRD
 *
 *   1. Vor jedem EIGENEN Zug in einer Turm-Partie rechnet eine kleine
 *      Suche zweimal: Was ist die Stellung mit dem BESTEN Zug wert, und was
 *      mit dem GESPIELTEN? (Negamax mit Alpha-Beta, Tiefe 2, danach
 *      Schlagzüge bis zur Ruhe — dieselben Bausteine wie Bob: die Zuglisten
 *      aus `SCHACH.alleZuege`, die Bewertung `SCHACH_BOT._bewerten` der
 *      Stufe „Meister". Anders als bei Bob erkennt diese Suche Matt.)
 *   2. SEIT v0.151.0 IN BAUERN STATT GEWINNCHANCE: Der VERLUST des Zugs
 *      ist bester minus gespielter Wert in Hundertstel-Bauern (beide auf
 *      ±DECKEL begrenzt). Bis v0.150.0 stand hier die Lichess-Kurve über
 *      Gewinnchancen — die wird nahe 0 und 100 % flach, und gemessen
 *      kamen reine Zufallszüge auf 82–89 %.
 *   3. Genauigkeit des Zugs: 100·e^(−Verlust/MASSSTAB); die der PARTIE ist
 *      der Durchschnitt. Ist die Partie schon entschieden (beide Werte
 *      jenseits des Deckels, `entschieden`), wird der Zug nicht gewertet.
 *   4. Klasse nach dem Verlust (KLASSEN_GRENZEN): bis 15 Stark, bis 40
 *      Gut, bis 90 Ungenau, bis 200 Fehler, darüber Blunder. Brillant ist
 *      ein Stark-Zug, der eine Figur (ab Springer) dorthin stellt, wo sie
 *      geschlagen werden kann — ein Opfer, das trotzdem der beste Zug ist.
 *   5. SEIT v0.151.0 RECHNET EIN WEB WORKER (js\wertung-rechner.js,
 *      `zugMerkenImHintergrund`) — der Bildschirm steht dabei nie still.
 *
 * WAS NICHT GEWERTET WIRD (Nutzer 27.09.2026, Frage 1: „nur normale
 * Schachzüge"): Züge, die eine Lootbox einsammeln (sie zählen als GLÜCK,
 * getrennt angezeigt, zählen nicht), Fähigkeiten (sie sind gar kein Zug),
 * erzwungene Züge (nur einer möglich) und Züge, deren Suche keinen Wert
 * findet. Unter MINDEST_ZUEGE gewerteten Zügen gibt es keine Genauigkeit —
 * dann bleibt es beim Bauern für den Sieg.
 *
 * WO ES LIEGT: nur auf diesem Gerät (`blunderluck.wertung`), die letzten
 * paar Partien. Kein zusätzliches Schreiben in die Datenbank je Zug. Wer
 * eine Turm-Partie auf einem anderen Gerät zu Ende spielt, bekommt die
 * Wertung aus den Zügen, die dort gewertet wurden.
 *
 * EHRLICH GESAGT: Tiefe 2 ist eine Näherung (Frage 1: „reicht eine
 * Näherung"). Sie erkennt hängende Figuren, Gabeln im nächsten Zug und
 * Matt in eins sicher, tiefe Pläne nicht. Die Schwellen der Orte sind auf
 * DIESE Rechnung abgestimmt (docs\entscheidungen\entschieden.md).
 */

const WERTUNG = {

    SCHLUESSEL: "blunderluck.wertung",
    MAX_PARTIEN: 6,

    TIEFE: 2,
    RUHE: 4,

    /* Arbeitsgrenze je Suche in angesehenen Feldern (wie Bobs `budget`). */
    BUDGET: 1500000,

    /* Ein Matt ist mehr wert als jedes Material. */
    MATT: 100000,

    /* Seit v0.151.0: Verlust in Hundertstel-Bauern statt Gewinnchance.
       MASSSTAB = so viel Verlust drückt einen Zug auf 37 %; DECKEL begrenzt
       jeden Wert; KLASSEN_GRENZEN = höchster Verlust für Stark, Gut,
       Ungenau, Fehler. Werte gemessen, docs\entscheidungen\entschieden.md. */
    MASSSTAB: 80,
    DECKEL: 1500,
    KLASSEN_GRENZEN: [15, 40, 90, 200],

    MINDEST_ZUEGE: 4,

    KLASSEN: [
        { id: "brillant", zeichen: "!!", name: "Brillant" },
        { id: "stark", zeichen: "!", name: "Stark" },
        { id: "gut", zeichen: "✓", name: "Gut" },
        { id: "ungenau", zeichen: "?!", name: "Ungenau" },
        { id: "fehler", zeichen: "?", name: "Fehler" },
        { id: "blunder", zeichen: "??", name: "Blunder" }
    ],

    /* ---------------------------------------------------------------- *
     * Die Formeln
     * ---------------------------------------------------------------- */

    /* Der Verlust eines Zugs in Hundertstel-Bauern: bester minus
       gespielter Wert, beide vorher auf ±DECKEL begrenzt (ein Matt zählt
       so wie „weit vorn", sonst verschluckte es jede andere Zahl). */
    verlustAus(bester, gespielt) {
        const deckel = (wert) => Math.max(-WERTUNG.DECKEL, Math.min(WERTUNG.DECKEL, wert));
        return Math.max(0, Math.round(deckel(bester) - deckel(gespielt)));
    },

    /* KEINE ECHTE WAHL (seit v0.151.0): Stehen der beste und der
       gespielte Zug beide jenseits des Deckels auf derselben Seite, ist die
       Partie schon entschieden — jeder Zug „verliert" dann nichts, und
       wer längst verloren hat, sammelte hier lauter 100-%-Züge (gemessen:
       das hob Zufallszüge von 34 auf 71 %). Solche Züge werden nicht
       gewertet. Ausnahme: Steht für die Seite am Zug ein MATT auf dem
       Brett, ist das eine echte Aufgabe — sie wird gewertet. */
    entschieden(bester, gespielt) {
        if (bester >= WERTUNG.MATT / 2) {
            return false;
        }
        return Math.abs(bester) >= WERTUNG.DECKEL && Math.abs(gespielt) >= WERTUNG.DECKEL
            && Math.sign(bester) === Math.sign(gespielt);
    },

    /* Genauigkeit eines Zugs: 100 · e^(−Verlust / MASSSTAB). */
    genauigkeitAus(verlust) {
        const wert = 100 * Math.exp(-Math.max(0, verlust) / WERTUNG.MASSSTAB);
        return Math.max(0, Math.min(100, wert));
    },

    /* Klasse nach dem Verlust (Hundertstel-Bauern). */
    klasseAus(verlust, opfer) {
        if (verlust <= WERTUNG.KLASSEN_GRENZEN[0]) {
            return opfer ? "brillant" : "stark";
        }
        if (verlust <= WERTUNG.KLASSEN_GRENZEN[1]) {
            return "gut";
        }
        if (verlust <= WERTUNG.KLASSEN_GRENZEN[2]) {
            return "ungenau";
        }
        if (verlust <= WERTUNG.KLASSEN_GRENZEN[3]) {
            return "fehler";
        }
        return "blunder";
    },

    /* ---------------------------------------------------------------- *
     * Die Suche
     * ---------------------------------------------------------------- */

    _rest: 0,

    _stufe() {
        return SCHACH_BOT.stufe("meister");
    },

    _suchen(brett, tiefe, alpha, beta, ply) {
        WERTUNG._rest -= SCHACH.felderVon(brett);
        const zuege = SCHACH.alleZuege(brett);
        if (zuege.length === 0) {
            return SCHACH.imSchach(brett, brett.amZug) ? -(WERTUNG.MATT - ply) : 0;
        }
        if (tiefe <= 0 || WERTUNG._rest <= 0) {
            return WERTUNG._ruhe(brett, alpha, beta, WERTUNG.RUHE, zuege);
        }
        let beste = -Infinity;
        for (const zug of SCHACH_BOT._sortieren(brett, zuege)) {
            const wert = -WERTUNG._suchen(SCHACH._ausfuehren(brett, zug),
                tiefe - 1, -beta, -alpha, ply + 1);
            if (wert > beste) {
                beste = wert;
            }
            if (beste > alpha) {
                alpha = beste;
            }
            if (alpha >= beta) {
                break;
            }
        }
        return beste;
    },

    /* Nur noch Schlagzüge, bis es ruhig ist — sonst hört die Suche mitten
       im Abtausch auf. `zuege` ist die schon gerechnete Liste. */
    _ruhe(brett, alpha, beta, rest, zuege) {
        const stehen = SCHACH_BOT._bewerten(brett, WERTUNG._stufe());
        if (rest <= 0 || WERTUNG._rest <= 0 || stehen >= beta) {
            return stehen;
        }
        if (stehen > alpha) {
            alpha = stehen;
        }
        const schlaege = zuege.filter((zug) => !!SCHACH.figurAuf(brett, zug.nach));
        for (const zug of SCHACH_BOT._sortieren(brett, schlaege)) {
            const danach = SCHACH._ausfuehren(brett, zug);
            WERTUNG._rest -= SCHACH.felderVon(danach);
            const wert = -WERTUNG._ruhe(danach, -beta, -alpha, rest - 1, SCHACH.alleZuege(danach));
            if (wert >= beta) {
                return beta;
            }
            if (wert > alpha) {
                alpha = wert;
            }
        }
        return alpha;
    },

    /*
     * EINEN ZUG WERTEN: { klasse, genauigkeit, verlust } — oder null, wenn
     * er nicht gewertet wird (erzwungen, unbekannt). `zug` ist der Eintrag
     * aus `SCHACH.alleZuege` (von, nach, umwandlung).
     */
    zugWerten(brett, zug) {
        const werte = WERTUNG._werte(brett, zug);
        if (!werte || WERTUNG.entschieden(werte.bester, werte.gespielt)) {
            return null;
        }
        const verlust = WERTUNG.verlustAus(werte.bester, werte.gespielt);
        const opfer = WERTUNG._istOpfer(brett, zug, werte.danach);
        return {
            klasse: WERTUNG.klasseAus(verlust, opfer),
            genauigkeit: Math.round(WERTUNG.genauigkeitAus(verlust)),
            verlust: verlust
        };
    },

    /*
     * Die zwei Zahlen hinter einer Wertung (Hundertstel-Bauern aus Sicht
     * der Seite am Zug): { bester, gespielt, danach } — oder null, wenn der
     * Zug nicht gewertet wird (erzwungen, unbekannt).
     *
     * Erst der GESPIELTE Zug mit vollem Fenster, dann nur noch die Frage
     * „gibt es etwas Besseres?" (Alpha = gespielt). Das schneidet weit mehr
     * ab als zwei getrennte Suchen und liefert dieselbe Zahl.
     */
    _werte(brett, zug) {
        const zuege = SCHACH.alleZuege(brett);
        if (zuege.length <= 1 || !zug) {
            return null;
        }
        const danach = SCHACH._ausfuehren(brett, zug);
        WERTUNG._rest = WERTUNG.BUDGET;
        const gespielt = -WERTUNG._suchen(danach, WERTUNG.TIEFE - 1, -Infinity, Infinity, 1);
        let bester = gespielt;
        for (const anderer of SCHACH_BOT._sortieren(brett, zuege)) {
            if (anderer.von === zug.von && anderer.nach === zug.nach
                    && (anderer.umwandlung || "") === (zug.umwandlung || "")) {
                continue;
            }
            const wert = -WERTUNG._suchen(SCHACH._ausfuehren(brett, anderer),
                WERTUNG.TIEFE - 1, -Infinity, -bester, 1);
            if (wert > bester) {
                bester = wert;
            }
        }
        if (!isFinite(bester) || !isFinite(gespielt)) {
            return null;
        }
        return { bester: bester, gespielt: gespielt, danach: danach };
    },

    /* Ein Opfer: Eine Figur ab Springer steht danach dort, wo der Gegner
       sie schlagen kann, und hat dabei nicht mindestens so viel genommen. */
    _istOpfer(brett, zug, danach) {
        const art = SCHACH.artVon(SCHACH.figurAuf(brett, zug.von));
        const wert = SCHACH_BOT.WERT[art] || 0;
        if (wert < 300 || art === "K") {
            return false;
        }
        const beute = SCHACH_BOT.WERT[SCHACH.artVon(SCHACH.figurAuf(brett, zug.nach))] || 0;
        if (beute >= wert) {
            return false;
        }
        return SCHACH.alleZuege(danach).some((antwort) => antwort.nach === zug.nach);
    },

    /* ---------------------------------------------------------------- *
     * Ein Zug in einer Partie
     * ---------------------------------------------------------------- */

    /*
     * Gerufen VOR dem Senden eines eigenen Zugs (js\team-schach.js
     * `zugAusfuehren`), nur in Turm-Partien gegen Bob. Sammelt der Zug eine
     * Lootbox ein, zählt er als Glück; sonst wird er gewertet. Gemerkt je
     * Partie und Zugzähler — ein wiederholter Versuch überschreibt nur.
     */
    zugMerken(partie, farbe, von, nach, umwandlung) {
        const auftrag = WERTUNG._auftrag(partie, von, nach, umwandlung);
        if (!auftrag) {
            return null;
        }
        if (auftrag.glueck) {
            return WERTUNG._eintragSpeichern(partie.id, partie.zugZaehler, farbe, { glueck: auftrag.glueck });
        }
        return WERTUNG._ergebnisSpeichern(partie.id, partie.zugZaehler, farbe,
            WERTUNG.zugWerten(auftrag.brett, auftrag.zug));
    },

    /*
     * Was an einem eigenen Zug zu tun ist: { glueck } (eine Lootbox
     * eingesammelt — sofort bekannt) oder { brett, zug } (zu rechnen) —
     * oder null (keine Turm-Partie, unbekannter Zug).
     */
    _auftrag(partie, von, nach, umwandlung) {
        if (!partie || !partie.regeln || !partie.regeln.turm || !partie.stand) {
            return null;
        }
        const brett = partie.stand;
        const zug = SCHACH.alleZuege(brett).find((kandidat) => kandidat.von === von
            && kandidat.nach === nach
            && (!kandidat.umwandlung || kandidat.umwandlung === umwandlung));
        if (!zug) {
            return null;
        }
        const boxen = Array.isArray(partie.bonus) ? partie.bonus.map((eintrag) => eintrag.feld) : [];
        const weg = SCHACH.wegFelder(brett, zug.von, zug.nach, !!zug.ohneWeg);
        const gesammelt = weg.filter((feld) => feld !== zug.von && boxen.indexOf(feld) !== -1).length;
        return gesammelt > 0 ? { glueck: gesammelt } : { brett: brett, zug: zug };
    },

    _ergebnisSpeichern(partieId, zugZaehler, farbe, wert) {
        if (!wert) {
            return null;
        }
        return WERTUNG._eintragSpeichern(partieId, zugZaehler, farbe, { k: wert.klasse, g: wert.genauigkeit });
    },

    _eintragSpeichern(partieId, zugZaehler, farbe, eintrag) {
        const alle = WERTUNG._lesen();
        const eigene = alle[partieId] || { farbe: farbe, zuege: {} };
        eigene.farbe = farbe;
        eigene.zuege[String(zugZaehler)] = eintrag;
        delete alle[partieId];
        alle[partieId] = eigene;
        WERTUNG._schreiben(alle);
        return eintrag;
    },

    /* ---------------------------------------------------------------- *
     * Im Hintergrund (seit v0.151.0): ein Web Worker rechnet
     * ---------------------------------------------------------------- */

    /* Adresse des Rechners (js\wertung-rechner.js), relativ zur Seite. */
    RECHNER: "js/wertung-rechner.js",

    _rechner: null,
    _rechnerKaputt: false,
    _naechsteNr: 1,
    _warten: {},
    _offen: {},
    _fertigHorcher: [],

    /* Rechnet für diese Partie noch etwas? Dann wartet der Abschluss mit
       dem Zählen der Figuren (js\team-schach.js `zeichnen`). */
    rechnetNoch(partieId) {
        return (WERTUNG._offen[partieId] || 0) > 0;
    },

    /* Wer wissen will, wann für eine Partie alles gerechnet ist. */
    beiFertig(horcher) {
        WERTUNG._fertigHorcher.push(horcher);
    },

    _rechnerHolen() {
        if (WERTUNG._rechner || WERTUNG._rechnerKaputt) {
            return WERTUNG._rechner;
        }
        if (typeof Worker === "undefined") {
            WERTUNG._rechnerKaputt = true;
            return null;
        }
        try {
            const rechner = new Worker(WERTUNG.RECHNER);
            rechner.onmessage = (nachricht) => WERTUNG._antwort(nachricht.data || {});
            rechner.onerror = (fehler) => {
                /* Rechner lädt nicht (z. B. file://): alles Offene auf dem
                   Hauptstrang nachholen, ab jetzt ohne Worker. */
                console.error("Wertung: Rechner nicht verfügbar, rechne direkt.", fehler && fehler.message);
                WERTUNG._rechnerKaputt = true;
                WERTUNG._rechner = null;
                const offen = Object.keys(WERTUNG._warten);
                for (const nr of offen) {
                    const auftrag = WERTUNG._warten[nr];
                    WERTUNG._direktRechnen(auftrag, Number(nr));
                }
            };
            WERTUNG._rechner = rechner;
        } catch (fehler) {
            WERTUNG._rechnerKaputt = true;
        }
        return WERTUNG._rechner;
    },

    /*
     * Wie `zugMerken`, aber ohne den Bildschirm anzuhalten: Glück wird
     * sofort gemerkt, alles andere rechnet der Worker; ohne Worker rechnet
     * es der Hauptstrang kurz danach (Rückfall, wie bis v0.150.0).
     */
    zugMerkenImHintergrund(partie, farbe, von, nach, umwandlung) {
        const auftrag = WERTUNG._auftrag(partie, von, nach, umwandlung);
        if (!auftrag) {
            return;
        }
        if (auftrag.glueck) {
            WERTUNG._eintragSpeichern(partie.id, partie.zugZaehler, farbe, { glueck: auftrag.glueck });
            return;
        }
        const nr = WERTUNG._naechsteNr++;
        const eintrag = { partieId: partie.id, zugZaehler: partie.zugZaehler, farbe: farbe,
            brett: JSON.parse(JSON.stringify(auftrag.brett)), zug: Object.assign({}, auftrag.zug) };
        WERTUNG._warten[nr] = eintrag;
        WERTUNG._offen[partie.id] = (WERTUNG._offen[partie.id] || 0) + 1;
        const rechner = WERTUNG._rechnerHolen();
        if (rechner) {
            rechner.postMessage({ nr: nr, brett: eintrag.brett, zug: eintrag.zug });
        } else {
            setTimeout(() => WERTUNG._direktRechnen(eintrag, nr), 50);
        }
    },

    _direktRechnen(eintrag, nr) {
        let ergebnis = null;
        try {
            ergebnis = WERTUNG.zugWerten(eintrag.brett, eintrag.zug);
        } catch (fehler) {
            console.error("Wertung nicht möglich:", fehler);
        }
        WERTUNG._antwort({ nr: nr, ergebnis: ergebnis });
    },

    _antwort(daten) {
        const eintrag = WERTUNG._warten[daten.nr];
        if (!eintrag) {
            return;
        }
        delete WERTUNG._warten[daten.nr];
        WERTUNG._ergebnisSpeichern(eintrag.partieId, eintrag.zugZaehler, eintrag.farbe, daten.ergebnis);
        WERTUNG._offen[eintrag.partieId] = Math.max(0, (WERTUNG._offen[eintrag.partieId] || 0) - 1);
        if (!WERTUNG._offen[eintrag.partieId]) {
            delete WERTUNG._offen[eintrag.partieId];
            for (const horcher of WERTUNG._fertigHorcher) {
                try {
                    horcher(eintrag.partieId);
                } catch (fehler) {
                    console.error("Wertung-Horcher:", fehler);
                }
            }
        }
    },

    /*
     * Die Zusammenfassung einer Partie: { gewertet, genauigkeit, klassen,
     * glueck } — `genauigkeit` undefined unter MINDEST_ZUEGE.
     */
    zusammenfassung(partieId, farbe) {
        const eigene = WERTUNG._lesen()[partieId];
        const klassen = {};
        for (const klasse of WERTUNG.KLASSEN) {
            klassen[klasse.id] = 0;
        }
        const ergebnis = { gewertet: 0, genauigkeit: undefined, klassen: klassen, glueck: 0 };
        if (!eigene || (farbe && eigene.farbe !== farbe)) {
            return ergebnis;
        }
        let summe = 0;
        for (const eintrag of Object.values(eigene.zuege || {})) {
            if (eintrag && typeof eintrag.glueck === "number") {
                ergebnis.glueck += eintrag.glueck;
            } else if (eintrag && typeof eintrag.g === "number" && klassen[eintrag.k] !== undefined) {
                klassen[eintrag.k] += 1;
                summe += eintrag.g;
                ergebnis.gewertet += 1;
            }
        }
        if (ergebnis.gewertet >= WERTUNG.MINDEST_ZUEGE) {
            ergebnis.genauigkeit = Math.round(summe / ergebnis.gewertet);
        }
        return ergebnis;
    },

    /* Die Genauigkeit einer beendeten Partie für eine Seite (Fortschritt,
       js\fortschritt-konto.js) — oder undefined. */
    genauigkeitVon(partie, farbe) {
        return partie && partie.id ? WERTUNG.zusammenfassung(partie.id, farbe).genauigkeit : undefined;
    },

    /* ---------------------------------------------------------------- *
     * Gerätespeicher
     * ---------------------------------------------------------------- */

    /*
     * ZEIT ZURÜCK (seit v0.152.2): Die Partie springt auf Zugzähler
     * `abZaehler` zurück — die Züge ab dort gibt es nicht mehr und zählen
     * nicht zur Genauigkeit. Die neuen Züge schreiben ihre Einträge danach
     * wieder unter denselben Zählern.
     */
    abZugVerwerfen(partieId, abZaehler) {
        const alle = WERTUNG._lesen();
        const eigene = alle[partieId];
        if (!eigene || !eigene.zuege || !Number.isInteger(abZaehler)) {
            return;
        }
        for (const schluessel of Object.keys(eigene.zuege)) {
            if (Number(schluessel) >= abZaehler) {
                delete eigene.zuege[schluessel];
            }
        }
        WERTUNG._schreiben(alle);
    },

    _lesen() {
        try {
            const roh = JSON.parse(localStorage.getItem(WERTUNG.SCHLUESSEL) || "{}");
            return (roh && typeof roh === "object" && !Array.isArray(roh)) ? roh : {};
        } catch (fehler) {
            return {};
        }
    },

    /* Nur die jüngsten Partien bleiben (die Reihenfolge der Schlüssel ist
       die des Hinzufügens — `zugMerken` hängt die eben gespielte hinten an). */
    _schreiben(alle) {
        const schluessel = Object.keys(alle);
        const behalten = {};
        for (const id of schluessel.slice(-WERTUNG.MAX_PARTIEN)) {
            behalten[id] = alle[id];
        }
        try {
            localStorage.setItem(WERTUNG.SCHLUESSEL, JSON.stringify(behalten));
        } catch (fehler) {
            /* privates Fenster: dann gibt es für diese Partie keine Wertung */
        }
    }
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = WERTUNG;
}
