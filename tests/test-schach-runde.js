/*
 * test-schach-runde.js — Regressionstests der Partie mit ihren Teams.
 *
 * Geladen werden die ECHTEN Dateien js\schach.js und js\schach-runde.js.
 * schach-runde.js benutzt SCHACH als globale Größe, genau wie im Browser —
 * deshalb wird es hier vorher bereitgestellt.
 */

const pfad = require("path");

globalThis.SCHACH_VARIANTEN = require(pfad.join(__dirname, "..", "js", "schach-varianten.js"));
globalThis.SCHACH = require(pfad.join(__dirname, "..", "js", "schach.js"));
const SCHACH_RUNDE = require(pfad.join(__dirname, "..", "js", "schach-runde.js"));
const SCHACH = globalThis.SCHACH;
const SCHACH_VARIANTEN = globalThis.SCHACH_VARIANTEN;

let anzahlOk = 0;
let anzahlFehler = 0;

function pruefe(bezeichnung, funktion) {
    try {
        funktion();
        anzahlOk++;
    } catch (fehler) {
        anzahlFehler++;
        console.error("FEHLER: " + bezeichnung);
        console.error("        " + fehler.message);
    }
}

function gleich(ist, soll, was) {
    if (ist !== soll) {
        throw new Error((was || "Wert") + ": erwartet <" + soll + ">, war <" + ist + ">");
    }
}

function wahr(bedingung, was) {
    if (!bedingung) {
        throw new Error((was || "Bedingung") + " war nicht erfüllt");
    }
}

/* Eine laufende Partie mit Anna (Weiss) und Bert (Schwarz). */
function laufendePartie() {
    let runde = SCHACH_RUNDE.leereRunde(1000);
    runde = SCHACH_RUNDE.teamBeitreten(runde, "id-anna", "weiss", 1000);
    runde = SCHACH_RUNDE.teamBeitreten(runde, "id-bert", "schwarz", 1000);
    runde = SCHACH_RUNDE.bereitSetzen(runde, "weiss", true, 1000);
    runde = SCHACH_RUNDE.bereitSetzen(runde, "schwarz", true, 1000);
    return runde;
}

/* ------------------------------------------------------------------ *
 * Grundstrukturen
 * ------------------------------------------------------------------ */

pruefe("Eine leere Runde steht auf der Grundstellung und laeuft nicht", () => {
    const runde = SCHACH_RUNDE.leereRunde();
    gleich(runde.stand.brett, SCHACH.GRUNDSTELLUNG, "Grundstellung");
    gleich(runde.laeuft, false, "laeuft nicht");
    gleich(runde.zugZaehler, 0, "Zugzaehler");
    gleich(runde.teams.weiss.length, 0, "kein weisses Team");
});

pruefe("Unsinn wird zu einer gueltigen Runde", () => {
    gleich(SCHACH_RUNDE.normalisieren(null).laeuft, false, "null");
    gleich(SCHACH_RUNDE.normalisieren("kaputt").stand.brett, SCHACH.GRUNDSTELLUNG, "Text");
    gleich(SCHACH_RUNDE.normalisieren({ teams: "keine Liste" }).teams.weiss.length, 0, "Teams");
    gleich(SCHACH_RUNDE.normalisieren({ ergebnis: "gelb" }).ergebnis, "", "unbekanntes Ergebnis");
});

/* ------------------------------------------------------------------ *
 * Teams
 * ------------------------------------------------------------------ */

pruefe("Wer einem Team beigetreten ist, kann nicht mehr wechseln", () => {
    let runde = SCHACH_RUNDE.teamBeitreten(SCHACH_RUNDE.leereRunde(), "id-anna", "weiss", 1000);
    gleich(SCHACH_RUNDE.teamVon(runde, "id-anna"), "weiss", "im weissen Team");

    /* Der Beitritt zur Gegenseite prallt ab — sonst könnte man in einer Partie,
       die über Tage läuft, für beide Seiten ziehen. */
    runde = SCHACH_RUNDE.teamBeitreten(runde, "id-anna", "schwarz", 2000);
    gleich(SCHACH_RUNDE.teamVon(runde, "id-anna"), "weiss", "bleibt bei Weiss");
    gleich(runde.teams.schwarz.length, 0, "nicht bei Schwarz gelandet");

    /* Erst nach dem ausdrücklichen Verlassen geht es. */
    runde = SCHACH_RUNDE.teamVerlassen(runde, "id-anna", 3000);
    runde = SCHACH_RUNDE.teamBeitreten(runde, "id-anna", "schwarz", 3100);
    gleich(SCHACH_RUNDE.teamVon(runde, "id-anna"), "schwarz", "jetzt bei Schwarz");
});

pruefe("Ein Team nimmt mehrere Leute auf, aber niemanden doppelt", () => {
    let runde = SCHACH_RUNDE.teamBeitreten(SCHACH_RUNDE.leereRunde(), "id-anna", "weiss", 1000);
    runde = SCHACH_RUNDE.teamBeitreten(runde, "id-cem", "weiss", 1000);
    runde = SCHACH_RUNDE.teamBeitreten(runde, "id-anna", "weiss", 1000);

    gleich(runde.teams.weiss.length, 2, "zwei Leute");
});

pruefe("Verlassen entfernt aus beiden Teams", () => {
    let runde = SCHACH_RUNDE.teamBeitreten(SCHACH_RUNDE.leereRunde(), "id-anna", "weiss", 1000);
    runde = SCHACH_RUNDE.teamVerlassen(runde, "id-anna", 2000);
    gleich(SCHACH_RUNDE.teamVon(runde, "id-anna"), "", "in keinem Team");
});

pruefe("Beitreten geht auch waehrend das Spiel laeuft", () => {
    let runde = laufendePartie();
    gleich(runde.laeuft, true, "laeuft");

    runde = SCHACH_RUNDE.teamBeitreten(runde, "id-cem", "weiss", 3000);
    gleich(SCHACH_RUNDE.teamVon(runde, "id-cem"), "weiss", "mitten im Spiel dazu");
    gleich(runde.laeuft, true, "laeuft weiter");
});

/* ------------------------------------------------------------------ *
 * Starten
 * ------------------------------------------------------------------ */

pruefe("Die Partie startet erst, wenn beide Seiten besetzt und bereit sind", () => {
    let runde = SCHACH_RUNDE.leereRunde();

    runde = SCHACH_RUNDE.teamBeitreten(runde, "id-anna", "weiss", 1000);
    runde = SCHACH_RUNDE.bereitSetzen(runde, "weiss", true, 1000);
    gleich(runde.laeuft, false, "eine Seite reicht nicht");

    runde = SCHACH_RUNDE.teamBeitreten(runde, "id-bert", "schwarz", 1000);
    gleich(runde.laeuft, false, "Bereitschaft von Schwarz fehlt");

    runde = SCHACH_RUNDE.bereitSetzen(runde, "schwarz", true, 1000);
    gleich(runde.laeuft, true, "jetzt laeuft es");
});

/* ------------------------------------------------------------------ *
 * Zugrecht — die Hausregel dieser Partie
 * ------------------------------------------------------------------ */

pruefe("Nur wer im Team am Zug ist, darf ziehen", () => {
    const runde = laufendePartie();

    wahr(SCHACH_RUNDE.darfZiehen(runde, "id-anna"), "Weiss ist dran");
    wahr(!SCHACH_RUNDE.darfZiehen(runde, "id-bert"), "Schwarz nicht");
    wahr(!SCHACH_RUNDE.darfZiehen(runde, "id-fremd"), "Aussenstehende nie");
});

pruefe("Innerhalb des Teams darf JEDER ziehen, ohne Reihenfolge", () => {
    /* Das ist die ausdrückliche Regel: wer zuerst zieht, hat gezogen. */
    let runde = laufendePartie();
    runde = SCHACH_RUNDE.teamBeitreten(runde, "id-cem", "weiss", 2000);

    wahr(SCHACH_RUNDE.darfZiehen(runde, "id-anna"), "Anna darf");
    wahr(SCHACH_RUNDE.darfZiehen(runde, "id-cem"), "Cem darf genauso");

    /* Cem zieht zuerst — danach ist das ganze Team nicht mehr dran. */
    const gezogen = SCHACH_RUNDE.ziehen(runde, "id-cem",
        SCHACH.feldNummer("e2"), SCHACH.feldNummer("e4"), "D", "Cem", 3000);

    wahr(gezogen !== null, "Zug ging durch");
    wahr(!SCHACH_RUNDE.darfZiehen(gezogen, "id-anna"), "Anna ist nicht mehr dran");
    wahr(!SCHACH_RUNDE.darfZiehen(gezogen, "id-cem"), "Cem auch nicht");
    wahr(SCHACH_RUNDE.darfZiehen(gezogen, "id-bert"), "jetzt Schwarz");
});

pruefe("Vor dem Start und nach dem Ende darf niemand ziehen", () => {
    const vorStart = SCHACH_RUNDE.teamBeitreten(SCHACH_RUNDE.leereRunde(), "id-anna", "weiss", 1000);
    wahr(!SCHACH_RUNDE.darfZiehen(vorStart, "id-anna"), "vor dem Start");

    const beendet = SCHACH_RUNDE.aufgeben(laufendePartie(), "weiss", 2000);
    wahr(!SCHACH_RUNDE.darfZiehen(beendet, "id-anna"), "nach dem Ende");
});

/* ------------------------------------------------------------------ *
 * Ziehen
 * ------------------------------------------------------------------ */

pruefe("Ein Zug erhoeht den Zugzaehler und schreibt den Verlauf", () => {
    const runde = laufendePartie();
    const neu = SCHACH_RUNDE.ziehen(runde, "id-anna",
        SCHACH.feldNummer("e2"), SCHACH.feldNummer("e4"), "D", "Anna", 2000);

    gleich(neu.zugZaehler, 1, "Zaehler");
    gleich(neu.verlauf.length, 1, "ein Eintrag");
    gleich(neu.verlauf[0].wer, "Anna", "wer gezogen hat");
    gleich(neu.verlauf[0].farbe, "weiss", "Farbe");
    gleich(neu.stand.amZug, "schwarz", "Schwarz ist dran");
    gleich(runde.zugZaehler, 0, "Ausgangsstand unveraendert");
});

pruefe("Unerlaubte Zuege werden abgewiesen", () => {
    const runde = laufendePartie();

    gleich(SCHACH_RUNDE.ziehen(runde, "id-bert",
        SCHACH.feldNummer("e7"), SCHACH.feldNummer("e5"), "D", "Bert", 2000),
        null, "falsches Team");
    gleich(SCHACH_RUNDE.ziehen(runde, "id-anna",
        SCHACH.feldNummer("e2"), SCHACH.feldNummer("e5"), "D", "Anna", 2000),
        null, "Regelverstoss");
    gleich(SCHACH_RUNDE.ziehen(runde, "id-fremd",
        SCHACH.feldNummer("e2"), SCHACH.feldNummer("e4"), "D", "Fremd", 2000),
        null, "kein Team");
});

pruefe("Der Verlauf bleibt kurz", () => {
    let runde = laufendePartie();
    /* Springer hin und her, bis der Verlauf überläuft. */
    const hin = [["g1", "f3"], ["g8", "f6"], ["f3", "g1"], ["f6", "g8"]];

    for (let i = 0; i < 12; i++) {
        const zug = hin[i % 4];
        const wer = (i % 2 === 0) ? "id-anna" : "id-bert";
        const neu = SCHACH_RUNDE.ziehen(runde, wer,
            SCHACH.feldNummer(zug[0]), SCHACH.feldNummer(zug[1]), "D", wer, 2000 + i);
        if (neu) {
            runde = neu;
        }
    }

    wahr(runde.verlauf.length <= SCHACH_RUNDE.VERLAUF_LAENGE, "Verlauf begrenzt");
    wahr(runde.verlauf.length > 0, "aber nicht leer");
});

/* ------------------------------------------------------------------ *
 * Spielende
 * ------------------------------------------------------------------ */

pruefe("Ein Matt beendet die Partie und benennt den Sieger", () => {
    /* Narrenmatt: f2-f3, e7-e5, g2-g4, Dd8-h4 matt. */
    let runde = laufendePartie();
    const zuege = [
        ["id-anna", "f2", "f3"],
        ["id-bert", "e7", "e5"],
        ["id-anna", "g2", "g4"],
        ["id-bert", "d8", "h4"]
    ];

    for (const zug of zuege) {
        const neu = SCHACH_RUNDE.ziehen(runde, zug[0],
            SCHACH.feldNummer(zug[1]), SCHACH.feldNummer(zug[2]), "D", zug[0], 2000);
        wahr(neu !== null, "Zug " + zug[1] + "-" + zug[2] + " ging durch");
        runde = neu;
    }

    gleich(runde.ergebnis, "schwarz", "Schwarz gewinnt");
    gleich(runde.laeuft, false, "Partie ist vorbei");
    wahr(!SCHACH_RUNDE.darfZiehen(runde, "id-anna"), "niemand zieht mehr");
});

pruefe("Aufgeben laesst die andere Seite gewinnen", () => {
    const runde = SCHACH_RUNDE.aufgeben(laufendePartie(), "weiss", 2000);
    gleich(runde.ergebnis, "schwarz", "Schwarz gewinnt");
    gleich(runde.laeuft, false, "vorbei");
});

pruefe("Eine neue Partie behaelt die Teams und verlangt neue Bereitschaft", () => {
    let runde = SCHACH_RUNDE.ziehen(laufendePartie(), "id-anna",
        SCHACH.feldNummer("e2"), SCHACH.feldNummer("e4"), "D", "Anna", 2000);
    runde = SCHACH_RUNDE.neuePartie(runde, 3000);

    gleich(runde.stand.brett, SCHACH.GRUNDSTELLUNG, "Brett zurueckgesetzt");
    gleich(runde.zugZaehler, 0, "Zaehler zurueck");
    gleich(runde.laeuft, false, "laeuft nicht");
    gleich(runde.bereit.weiss, false, "Bereitschaft weg");
    gleich(SCHACH_RUNDE.teamVon(runde, "id-anna"), "weiss", "Team bleibt");
});

/* ------------------------------------------------------------------ *
 * Spielarten
 * ------------------------------------------------------------------ */

pruefe("Eine Partie merkt sich ihre Spielart und bekommt deren Brett", () => {
    const runde = SCHACH_RUNDE.leereRunde(1000, "klein", "p-1", "Kleines");

    gleich(runde.variante, "klein", "Spielart");
    gleich(runde.stand.breite, 6, "Breite");
    gleich(runde.stand.brett.length, 36, "Feldanzahl");
    gleich(runde.id, "p-1", "Kennung");
    gleich(runde.titel, "Kleines", "Titel");
});

pruefe("Die Spielart ueberlebt das Normalisieren", () => {
    const runde = SCHACH_RUNDE.normalisieren(
        SCHACH_RUNDE.leereRunde(1000, "doppelbrett", "p-2", "Doppelt"));

    gleich(runde.variante, "doppelbrett", "Spielart");
    gleich(runde.stand.breite, 16, "Breite");
    gleich(runde.stand.brett.length, 128, "Feldanzahl");
});

pruefe("Eine unbekannte Spielart wird zur klassischen", () => {
    const runde = SCHACH_RUNDE.normalisieren({ variante: "raumschiff" });
    gleich(runde.variante, "standard", "Rueckfall");
    gleich(runde.stand.brett, SCHACH.GRUNDSTELLUNG, "Grundstellung");
});

pruefe("Eine Partie ohne Angabe der Spielart ist klassisch", () => {
    /* Genau so sehen die Partien aus, die vor den Spielarten angefangen wurden. */
    const runde = SCHACH_RUNDE.normalisieren({
        stand: { brett: SCHACH.GRUNDSTELLUNG, amZug: "weiss" },
        teams: { weiss: ["id-anna"], schwarz: ["id-bert"] },
        laeuft: true,
        zugZaehler: 7
    });

    gleich(runde.variante, "standard", "klassisch");
    gleich(runde.zugZaehler, 7, "Zugzaehler bleibt");
    gleich(runde.teams.weiss.join(","), "id-anna", "Team bleibt");
    gleich(runde.laeuft, true, "laeuft weiter");
});

pruefe("Neu aufstellen behaelt die Spielart", () => {
    const runde = SCHACH_RUNDE.neuePartie(
        SCHACH_RUNDE.leereRunde(1000, "gross", "p-3", "Gross"), 2000);

    gleich(runde.variante, "gross", "Spielart");
    gleich(runde.stand.breite, 10, "Breite");
});

/* ------------------------------------------------------------------ *
 * Fähigkeiten
 * ------------------------------------------------------------------ */

/* Eine laufende Partie in der Spielart mit den Fähigkeiten. */
function faehigkeitenPartie() {
    let runde = SCHACH_RUNDE.leereRunde(1000, "faehigkeiten", "p-f", "Mit Faehigkeiten");
    runde = SCHACH_RUNDE.teamBeitreten(runde, "id-anna", "weiss", 1000);
    runde = SCHACH_RUNDE.teamBeitreten(runde, "id-bert", "schwarz", 1000);
    runde = SCHACH_RUNDE.bereitSetzen(runde, "weiss", true, 1000);
    runde = SCHACH_RUNDE.bereitSetzen(runde, "schwarz", true, 1000);
    return runde;
}

/* ------------------------------------------------------------------ *
 * Der begrenzte Item-Vorrat (seit v0.87, Wunsch R5/R6 alias V3)
 * ------------------------------------------------------------------ */

/* Eine Faehigkeiten-Partie mit ausgelostem Vorrat. */
function vorratPartie(groesse, kennung) {
    const runde = SCHACH_RUNDE.leereRunde(1000, "faehigkeiten",
        kennung || ("p-v-" + groesse), "Vorrat");

    runde.regeln.faehigkeiten = true;
    runde.regeln.itemVorrat = groesse;

    return SCHACH_RUNDE.itemVorratAuslosen(runde);
}

pruefe("Der Vorrat hat die verlangte Groesse und wird GERECHNET (v0.87)", () => {
    for (const groesse of SCHACH_VARIANTEN.ITEM_VORRAETE) {
        const runde = vorratPartie(groesse.id);
        const pool = runde.regeln.itemPool;

        if (!groesse.anzahl) {
            gleich(pool.length, 0, "alle: kein ausgeloster Vorrat");
            gleich(SCHACH_RUNDE.itemVorrat(runde), null, "alle: kein Filter");
            continue;
        }

        /*
         * Die Zahl ist ein WUNSCH, keine Zusage: Gibt es weniger Faehigkeiten
         * als verlangt, kommen eben alle vor. Geprueft wird deshalb gegen das
         * Angebot, nicht gegen die Wunschzahl.
         */
        let verfuegbar = 0;
        for (const stufe of SCHACH_VARIANTEN.STUFEN) {
            verfuegbar += SCHACH_VARIANTEN.faehigkeitenDerStufe(stufe.id).length;
        }

        gleich(pool.length, Math.min(groesse.anzahl, verfuegbar),
            groesse.id + ": so viele wie verlangt (oder alle, wenn es weniger gibt)");

        /* Jede Art gibt es wirklich und nur einmal. */
        for (const art of pool) {
            wahr(!!SCHACH_VARIANTEN.FAEHIGKEITEN[art], groesse.id + ": " + art + " gibt es");
            gleich(pool.filter((anderer) => anderer === art).length, 1,
                groesse.id + ": " + art + " steht nur einmal drin");
        }

        /* GERECHNET, NICHT GEWUERFELT: zweimal dieselbe Kennung, dasselbe
           Ergebnis — sonst saehe jedes Geraet einen anderen Vorrat. */
        const nochmal = vorratPartie(groesse.id);
        gleich(nochmal.regeln.itemPool.join(","), pool.join(","),
            groesse.id + ": dieselbe Kennung, derselbe Vorrat");
    }

    /* Verschiedene Partien bekommen verschiedene Vorraete. Genommen wird eine
       Stufe, die wirklich ZIEHT (seit v0.105 ist das „wenig" oder „viele" —
       die Stufe „10" gibt es nicht mehr). */
    const eine = vorratPartie("viele", "p-v-eins").regeln.itemPool.join(",");
    const andere = vorratPartie("viele", "p-v-zwei").regeln.itemPool.join(",");
    wahr(eine !== andere, "zwei Partien, zwei Vorraete");
});

pruefe("Der Item-Vorrat hat drei Mengen und eine eigene Wahl (v0.105)", () => {
    /*
     * NUTZER-ANSAGE 21.08.: „Bei „welche Items kommen vor" die 10 rausnehmen
     * und die drei uebrigen Punkte nebeneinander."
     *
     * Die DREI ist keine Geschmacksfrage, sondern die Bedingung der Anzeige:
     * Die Reihe im Anlege-Bildschirm bricht seit v0.105 nicht mehr um
     * (`.vorrat-leiste { flex-wrap: nowrap }`). Eine vierte Menge wuerde die
     * Knoepfe quetschen, statt sich unter sie zu setzen. Wer eine ergaenzen
     * will, aendert also beides — Modell und Stil — und faellt hier darueber.
     */
    const mengen = SCHACH_VARIANTEN.ITEM_VORRAETE.filter(
        (eintrag) => !eintrag.eigeneWahl);
    const eigene = SCHACH_VARIANTEN.ITEM_VORRAETE.filter(
        (eintrag) => eintrag.eigeneWahl);

    gleich(mengen.length, 3, "drei Mengen nebeneinander");
    gleich(eigene.length, 1, "genau eine eigene Wahl, und sie steht darunter");

    /*
     * UMSTIEG: Eine Partie von frueher kann „zehn" gespeichert haben. Sie muss
     * eine gueltige Stufe zurueckbekommen — ihr Vorrat selbst steht ohnehin
     * fertig in `itemPool` und wird nie neu gezogen.
     */
    gleich(SCHACH_VARIANTEN.itemVorratVon("zehn").id, "alle",
        "eine entfallene Stufe faellt auf alle zurueck");

    const alt = vorratPartie("wenig", "p-v-alt");
    alt.regeln.itemVorrat = "zehn";

    const geladen = SCHACH_RUNDE.normalisieren(JSON.parse(JSON.stringify(alt)));

    gleich(geladen.regeln.itemPool.join(","), alt.regeln.itemPool.join(","),
        "der ausgeloste Vorrat bleibt unangetastet");
});

pruefe("Die Dauer-Schaetzung lernt aus echten Partien (v0.93)", () => {
    /*
     * WOZU DAS GANZE: Der Nutzer soll unter jeder Spielart-Kachel einen
     * groben Anhaltspunkt sehen, wie lange eine Runde mit SEINEN
     * Einstellungen dauert. Die stille Zeitmessung ist nur das Mittel dazu —
     * angezeigt wird sie nirgends.
     */

    /* Ohne Messwerte gilt die Vorgabe. */
    gleich(SCHACH_RUNDE.sekundenJeHalbzug([]),
        SCHACH_RUNDE.SEKUNDEN_JE_HALBZUG_VORGABE, "ohne Partien die Vorgabe");

    /*
     * SEIT v0.100 GIBT ES KEINE SCHWELLE MEHR (Nutzer-Ansage: „soll sich immer
     * besser anhand gespielter Runden anpassen"). Vorgabe und Messung mischen
     * sich, und die Messung bekommt mit jeder Partie mehr Gewicht. Geprueft
     * wird deshalb die RICHTUNG, nicht mehr ein Sprung an einer festen Zahl.
     */
    const machen = (anzahl) => {
        const liste = [];
        for (let n = 0; n < anzahl; n++) {
            liste.push({ spielzeit: 600, stand: { takt: 20 } });
        }
        return liste;
    };

    /* 600 s auf 20 Halbzuege = 30 s je Halbzug, die Vorgabe ist 20. */
    const eine = SCHACH_RUNDE.sekundenJeHalbzug(machen(1));
    const drei = SCHACH_RUNDE.sekundenJeHalbzug(machen(3));
    const viele = SCHACH_RUNDE.sekundenJeHalbzug(machen(30));

    wahr(eine > SCHACH_RUNDE.SEKUNDEN_JE_HALBZUG_VORGABE,
        "schon die erste gemessene Partie bewegt die Schaetzung");
    wahr(drei > eine, "drei Partien wiegen schwerer als eine");
    wahr(viele > drei, "und dreissig schwerer als drei");
    wahr(viele < 30, "die reine Messung wird nie ganz erreicht");
    wahr(viele > 29, "aber fast");

    /* Bei genau `MESSUNG_ANLAUF` Partien wiegen Vorgabe und Messung gleich. */
    gleich(Math.round(drei), 25, "drei Partien: genau die Mitte aus 20 und 30");

    /* Angefangene oder leere Partien verfaelschen nichts. */
    const genug = machen(5);
    const gemischt = genug.concat([
        { spielzeit: 0, stand: { takt: 40 } },
        { spielzeit: 900, stand: { takt: 0 } },
        { stand: { takt: 30 } }
    ]);
    gleich(SCHACH_RUNDE.sekundenJeHalbzug(gemischt),
        SCHACH_RUNDE.sekundenJeHalbzug(genug),
        "Partien ohne Zeit oder ohne Zuege zaehlen nicht mit");

    /* Mehr Figuren und mehr Platz heissen mehr Zuege. */
    wahr(SCHACH_RUNDE.erwarteteHalbzuege(16, 64)
        > SCHACH_RUNDE.erwarteteHalbzuege(4, 64), "mehr Figuren, mehr Zuege");
    wahr(SCHACH_RUNDE.erwarteteHalbzuege(8, 128)
        > SCHACH_RUNDE.erwarteteHalbzuege(8, 36), "groesseres Brett, mehr Zuege");

    /* Faehigkeiten verlaengern, und mehr Lootboxen verlaengern staerker. */
    const ohne = SCHACH_RUNDE.dauerSchaetzung(8, 64, { faehigkeiten: false }, genug);
    const mit = SCHACH_RUNDE.dauerSchaetzung(8, 64,
        { faehigkeiten: true, lootboxMenge: "wenig" }, genug);
    const viel = SCHACH_RUNDE.dauerSchaetzung(8, 64,
        { faehigkeiten: true, lootboxMenge: "regen" }, genug);

    wahr(mit > ohne, "mit Faehigkeiten dauert es laenger");
    wahr(viel > mit, "mit mehr Lootboxen noch laenger");

    /* Der Satz ist ein Anhaltspunkt, kein Versprechen. */
    const satz = SCHACH_RUNDE.dauerText(8, 64, { faehigkeiten: false }, genug);
    wahr(satz.indexOf("etwa") === 0, "der Satz beginnt mit \"etwa\": " + satz);
});

pruefe("Kein Satz unter der Kachel sagt \"1 Stunden\" (v0.94)", () => {
    /*
     * DER GRAMMATIKFEHLER AUS v0.93. Genau bei 60 Minuten rundete die Rechnung
     * auf 1 und haengte trotzdem "Stunden" an — getroffen hat es das
     * klassische Brett mit 31 Figuren und vielen Lootboxen, also keinen
     * Sonderfall. Geprueft wird nicht die eine Stelle, sondern ALLE Saetze,
     * die dort ueberhaupt stehen koennen.
     */
    const saetze = new Set();

    for (const felder of [36, 64, 100, 128, 196]) {
        for (const menge of ["wenig", "normal", "viele", "regen"]) {
            for (const mitFaehigkeiten of [false, true]) {
                for (let figuren = 1; figuren <= 32; figuren++) {
                    saetze.add(SCHACH_RUNDE.dauerText(figuren, felder,
                        { faehigkeiten: mitFaehigkeiten, lootboxMenge: menge }, []));
                }
            }
        }
    }

    wahr(saetze.size > 5, "es kommen mehrere Saetze zusammen: " + saetze.size);

    for (const satz of saetze) {
        wahr(satz !== "etwa 1 Stunden", "kein \"etwa 1 Stunden\"");
        wahr(!/\b1 (Minuten|Stunden)\b/.test(satz), "keine Eins mit Mehrzahl: " + satz);
        wahr(satz.indexOf("etwa") === 0, "jeder Satz beginnt mit \"etwa\": " + satz);
    }

    /* Und die eine Stunde heisst wirklich so. */
    let eineStunde = false;
    for (const satz of saetze) {
        if (satz === "etwa 1 Stunde") {
            eineStunde = true;
        }
    }
    wahr(eineStunde, "der Fall \"etwa 1 Stunde\" kommt vor und ist richtig geschrieben");
});

pruefe("Die Spielzeit wird still ergaenzt und ueberlebt das Laden (v0.93)", () => {
    const runde = faehigkeitenPartie();
    gleich(runde.spielzeit, 0, "eine neue Partie startet bei 0");

    const nach = SCHACH_RUNDE.spielzeitErgaenzen(
        SCHACH_RUNDE.spielzeitErgaenzen(runde, 90), 30);
    gleich(nach.spielzeit, 120, "die Sekunden addieren sich");

    /* Unsinn aendert nichts. */
    gleich(SCHACH_RUNDE.spielzeitErgaenzen(nach, 0).spielzeit, 120, "0 aendert nichts");
    gleich(SCHACH_RUNDE.spielzeitErgaenzen(nach, -5).spielzeit, 120, "negativ auch nicht");

    /* Additiver Datenvertrag: Eine Partie von frueher kennt das Feld nicht. */
    const roh = JSON.parse(JSON.stringify(nach));
    delete roh.spielzeit;
    gleich(SCHACH_RUNDE.normalisieren(roh).spielzeit, 0, "ohne Angabe 0");
    gleich(SCHACH_RUNDE.normalisieren(JSON.parse(JSON.stringify(nach))).spielzeit,
        120, "mit Angabe bleibt sie stehen");
});

pruefe("Die Umbenennungen aus v0.92 stehen fest", () => {
    /*
     * VIER NUTZER-ENTSCHEIDUNGEN VOM 20.08. Der Test haelt sie fest, damit
     * niemand sie beilaeufig zurueckdreht — und er haelt vor allem fest, dass
     * nur der TITEL sich aendert: Die KENNUNG steht in jeder gespeicherten
     * Partie, ein Umbenennen wuerde die Faehigkeit aus jedem Vorrat werfen
     * (`normalisieren` behaelt nur, was es in der Tabelle gibt).
     */
    gleich(SCHACH_VARIANTEN.FAEHIGKEITEN.friedhof.titel, "Nekromant",
        "friedhof heisst sichtbar Nekromant");
    /*
     * SEIT v0.103 „Spalt", nicht mehr „Riss" (Nutzer-Ansage 20.08.). In v0.92
     * war „Riss" der Ersatz fuer „Erdbeben" — damit hiessen aber die Lootbox
     * UND das gesperrte Feld, das sie hinterlaesst, gleich. Jetzt sind es zwei
     * Woerter fuer zwei Dinge: der SPALT ist die Lootbox, die RISSE sind die
     * Loecher.
     */
    gleich(SCHACH_VARIANTEN.PECH.erdbeben.titel, "Spalt",
        "erdbeben heisst sichtbar Spalt");
    wahr(SCHACH_VARIANTEN.PECH.erdbeben.beschreibung.indexOf("Erdbeben") === -1,
        "und der alte Name steht auch nicht mehr im Text");
    gleich(SCHACH_VARIANTEN.FAEHIGKEITEN.spiegel.stufe, "lila",
        "der Spiegel ist lila");
    gleich(SCHACH_VARIANTEN.FAEHIGKEITEN.wiedergeburt.versteckt, true,
        "die Wiedergeburt ist ausgeblendet");

    /* Die Kennungen selbst bleiben — sonst verlieren laufende Partien ihren
       Vorrat. */
    for (const art of ["friedhof", "spiegel", "wiedergeburt"]) {
        wahr(!!SCHACH_VARIANTEN.FAEHIGKEITEN[art], art + ": Kennung steht noch");
    }
    wahr(!!SCHACH_VARIANTEN.PECH.erdbeben, "erdbeben: Kennung steht noch");

    /* Ausgeblendet heisst: nicht mehr ziehbar, aber aufbrauchbar. */
    wahr(SCHACH_VARIANTEN.faehigkeitenDerStufe("lila").indexOf("wiedergeburt") === -1,
        "die Wiedergeburt wird nicht mehr gezogen");

    const runde = faehigkeitenPartie();
    runde.faehigkeiten.weiss.push("wiedergeburt");
    const wieder = SCHACH_RUNDE.normalisieren(JSON.parse(JSON.stringify(runde)));
    wahr(wieder.faehigkeiten.weiss.indexOf("wiedergeburt") !== -1,
        "wer sie im Vorrat hat, behaelt sie");

    /* Und keine Stufe ist durch den Umbau leer geworden. */
    for (const stufe of SCHACH_VARIANTEN.STUFEN) {
        wahr(SCHACH_VARIANTEN.faehigkeitenDerStufe(stufe.id).length > 0,
            "Stufe " + stufe.id + " hat noch Faehigkeiten");
    }
});

pruefe("Enttarnen gibt es nur, wenn die Seltenheit verborgen ist (v0.88)", () => {
    /*
     * R4, die erste Faehigkeit mit einer BEDINGUNG. Sie darf in einer Partie
     * mit sichtbarer Seltenheit nirgends auftauchen: nicht in der Ziehung,
     * nicht in der Prozentrechnung, nicht im ausgelosten Vorrat.
     */
    const verborgen = SCHACH_RUNDE.leereRunde(1000, "faehigkeiten", "p-e1", "Verborgen");
    verborgen.regeln.faehigkeiten = true;
    verborgen.regeln.seltenheitZeigen = false;

    const offen = SCHACH_RUNDE.leereRunde(1000, "faehigkeiten", "p-e2", "Offen");
    offen.regeln.faehigkeiten = true;
    offen.regeln.seltenheitZeigen = true;

    wahr(SCHACH_RUNDE.bedingungPasst("enttarnen", verborgen), "verborgen: gibt es");
    wahr(!SCHACH_RUNDE.bedingungPasst("enttarnen", offen), "offen: gibt es nicht");

    /* In der Liste der Partie taucht sie entsprechend auf oder nicht. */
    const inVerborgen = SCHACH_RUNDE.erlaubteFaehigkeiten(verborgen);
    const inOffen = SCHACH_RUNDE.erlaubteFaehigkeiten(offen);

    wahr(inOffen !== null && inOffen.indexOf("enttarnen") === -1,
        "offen: nicht in der erlaubten Liste");
    wahr(inVerborgen === null || inVerborgen.indexOf("enttarnen") !== -1,
        "verborgen: in der erlaubten Liste");

    /* Und die Ziehung liefert sie in einer offenen Partie nie. */
    const stufe = SCHACH_VARIANTEN.stufeVon("enttarnen").id;
    for (let schritt = 0; schritt < 300; schritt++) {
        const art = SCHACH_VARIANTEN.faehigkeitAusStufe(
            stufe, schritt / 300, [], inOffen);
        wahr(art !== "enttarnen", "offen: wird nicht gezogen");
    }

    /* Auch nicht ueber den ausgelosten Vorrat. */
    offen.regeln.itemVorrat = "viele";
    const mitVorrat = SCHACH_RUNDE.itemVorratAuslosen(offen);
    wahr(mitVorrat.regeln.itemPool.indexOf("enttarnen") === -1,
        "offen: kommt auch nicht in den ausgelosten Vorrat");
});

pruefe("Enttarnen wirkt seitenbezogen und befristet (v0.88)", () => {
    /*
     * Wie das volle Glas: Es aendert NICHTS am Brett, nur den Blick EINER
     * Seite, und es laeuft ab. Die Zahl im Beschreibungstext muss zur
     * Konstanten passen — sonst verspricht die App etwas anderes, als sie tut.
     */
    wahr(SCHACH_VARIANTEN.FAEHIGKEITEN.enttarnen.beschreibung
        .indexOf(String(SCHACH_RUNDE.ENTTARNT_HALBZUEGE) + " Halbzüge") !== -1,
        "Text und Konstante nennen dieselbe Zahl");

    const runde = faehigkeitenPartie();
    runde.regeln.seltenheitZeigen = false;
    runde.faehigkeiten.weiss.push("enttarnen");

    const vorher = runde.stand.brett;
    const nachher = SCHACH_RUNDE.faehigkeitEinsetzen(runde, "id-anna", "enttarnen", -1);

    wahr(nachher !== null, "laesst sich einsetzen");
    gleich(nachher.stand.brett, vorher, "das Brett bleibt unberuehrt");
    gleich(nachher.stand.enttarntFarbe, "weiss", "wirkt fuer Weiss");
    wahr(nachher.stand.enttarntBis > nachher.zugZaehler, "und laeuft noch");

    /* Der Datenvertrag: Ein Stand von frueher kennt die Felder nicht. */
    const roh = JSON.parse(JSON.stringify(nachher));
    delete roh.stand.enttarntFarbe;
    delete roh.stand.enttarntBis;

    const wieder = SCHACH_RUNDE.normalisieren(roh);
    gleich(wieder.stand.enttarntFarbe, "", "ohne Angabe wirkt nichts");
    gleich(wieder.stand.enttarntBis, 0, "und die Frist ist leer");
});

pruefe("Verstecken gibt es nur, wenn die Seltenheit gezeigt wird (v0.98)", () => {
    /*
     * DAS GEGENSTUECK ZUM ENTTARNEN, R4-Rest. Derselbe Mechanismus mit
     * umgekehrtem Vorzeichen: Wo die Farbe ohnehin verborgen ist, gaebe es
     * nichts mehr zu verstecken — die Faehigkeit darf dort nirgends auftauchen.
     */
    const verborgen = SCHACH_RUNDE.leereRunde(1000, "faehigkeiten", "p-v1", "Verborgen");
    verborgen.regeln.faehigkeiten = true;
    verborgen.regeln.seltenheitZeigen = false;

    const offen = SCHACH_RUNDE.leereRunde(1000, "faehigkeiten", "p-v2", "Offen");
    offen.regeln.faehigkeiten = true;
    offen.regeln.seltenheitZeigen = true;

    wahr(SCHACH_RUNDE.bedingungPasst("verstecken", offen), "offen: gibt es");
    wahr(!SCHACH_RUNDE.bedingungPasst("verstecken", verborgen), "verborgen: gibt es nicht");

    /*
     * UND DIE ZWEI SCHLIESSEN EINANDER AUS: In jeder Partie gibt es genau
     * eine von beiden, nie beide und nie keine. Faellt das eines Tages
     * auseinander, ist entweder ein Schalter falsch gesetzt oder die Bedingung
     * anders gemeint als hier.
     */
    for (const runde of [verborgen, offen]) {
        const beide = SCHACH_RUNDE.bedingungPasst("verstecken", runde)
            !== SCHACH_RUNDE.bedingungPasst("enttarnen", runde);
        wahr(beide, "genau eine der beiden passt");
    }

    /* In der Liste der Partie taucht sie entsprechend auf oder nicht. */
    const inVerborgen = SCHACH_RUNDE.erlaubteFaehigkeiten(verborgen);
    const inOffen = SCHACH_RUNDE.erlaubteFaehigkeiten(offen);

    wahr(inVerborgen !== null && inVerborgen.indexOf("verstecken") === -1,
        "verborgen: nicht in der erlaubten Liste");
    wahr(inOffen === null || inOffen.indexOf("verstecken") !== -1,
        "offen: in der erlaubten Liste");

    /* Und die Ziehung liefert sie in einer verborgenen Partie nie. */
    const stufe = SCHACH_VARIANTEN.stufeVon("verstecken").id;
    for (let schritt = 0; schritt < 300; schritt++) {
        const art = SCHACH_VARIANTEN.faehigkeitAusStufe(
            stufe, schritt / 300, [], inVerborgen);
        wahr(art !== "verstecken", "verborgen: wird nicht gezogen");
    }

    /* Auch nicht ueber den ausgelosten Vorrat. */
    verborgen.regeln.itemVorrat = "viele";
    const mitVorrat = SCHACH_RUNDE.itemVorratAuslosen(verborgen);
    wahr(mitVorrat.regeln.itemPool.indexOf("verstecken") === -1,
        "verborgen: kommt auch nicht in den ausgelosten Vorrat");
});

pruefe("Verstecken trifft den GEGNER und ist befristet (v0.98)", () => {
    /*
     * DER EINE UNTERSCHIED ZUM ENTTARNEN: Im Stand landet nicht die eigene
     * Farbe, sondern die des Gegners — dort steht das OPFER, wie beim vollen
     * Glas. Wer das eines Tages umdreht, nimmt sich selbst die Sicht.
     */
    wahr(SCHACH_VARIANTEN.FAEHIGKEITEN.verstecken.beschreibung
        .indexOf(String(SCHACH_RUNDE.VERSTECKT_HALBZUEGE) + " Halbzüge") !== -1,
        "Text und Konstante nennen dieselbe Zahl");

    const runde = faehigkeitenPartie();
    runde.regeln.seltenheitZeigen = true;
    runde.faehigkeiten.weiss.push("verstecken");

    const vorher = runde.stand.brett;
    const nachher = SCHACH_RUNDE.faehigkeitEinsetzen(runde, "id-anna", "verstecken", -1);

    wahr(nachher !== null, "laesst sich einsetzen");
    gleich(nachher.stand.brett, vorher, "das Brett bleibt unberuehrt");
    gleich(nachher.stand.verstecktFarbe, "schwarz", "wirkt gegen Schwarz");
    wahr(nachher.stand.verstecktBis > nachher.zugZaehler, "und laeuft noch");
    gleich(nachher.stand.enttarntFarbe, "", "das Enttarnen bleibt unberuehrt");

    /* Der Datenvertrag: Ein Stand von frueher kennt die Felder nicht. */
    const roh = JSON.parse(JSON.stringify(nachher));
    delete roh.stand.verstecktFarbe;
    delete roh.stand.verstecktBis;

    const wieder = SCHACH_RUNDE.normalisieren(roh);
    gleich(wieder.stand.verstecktFarbe, "", "ohne Angabe wirkt nichts");
    gleich(wieder.stand.verstecktBis, 0, "und die Frist ist leer");
});

pruefe("Jede Vorrat-Stufe liefert WENIGER als die darueber (v0.87)", () => {
    /*
     * SONST IST EIN KNOPF WIRKUNGSLOS. Genau das war beim Bauen der Fall:
     * „viele" stand auf 20, es gibt aber nur 19 sichtbare Faehigkeiten — die
     * Stufe war stillschweigend dasselbe wie „alle". Wer kuenftig
     * Faehigkeiten ergaenzt oder versteckt, faellt hier auf, bevor es jemand
     * im Spiel merkt.
     */
    let verfuegbar = 0;
    for (const stufe of SCHACH_VARIANTEN.STUFEN) {
        verfuegbar += SCHACH_VARIANTEN.faehigkeitenDerStufe(stufe.id).length;
    }

    /*
     * „selbst wählen" (seit v0.100) bleibt aussen vor: Sie ist keine MENGE,
     * sondern eine Liste, die der Nutzer zusammenstellt — sie kann alles
     * enthalten oder ein einziges Item. Erkennbar an `eigeneWahl`, nicht am
     * Namen; wer eine zweite solche Stufe baut, faellt damit nicht herein.
     */
    const stufen = SCHACH_VARIANTEN.ITEM_VORRAETE.filter(
        (groesse) => !groesse.eigeneWahl);

    let vorher = 0;

    for (const groesse of stufen) {
        const wirklich = groesse.anzahl
            ? Math.min(groesse.anzahl, verfuegbar) : verfuegbar;

        wahr(wirklich > vorher, groesse.id + " liefert mehr als die Stufe davor ("
            + wirklich + " gegen " + vorher + ")");
        vorher = wirklich;
    }

    gleich(vorher, verfuegbar, "die oberste Stufe ist wirklich alles");
});

pruefe("Selbst gewaehlt: genau diese Items, sonst nichts (v0.100)", () => {
    /*
     * NUTZER-WUNSCH 20.08.: „und selbst auswaehlen, dann kommt die Liste der
     * Items, welche man anhaken kann — mindestens ein Item. Die Chancen teilen
     * sich unter den Items auf, die gerade in der Runde sind."
     *
     * Der zweite Satz ist der wichtigere: Es genuegt nicht, die Liste zu
     * merken — aus einer Lootbox darf danach NICHTS anderes kommen, und die
     * Stufen, in denen nichts uebrig bleibt, duerfen gar nicht mehr gezogen
     * werden. Beides faellt hier zusammen.
     */
    const runde = SCHACH_RUNDE.leereRunde(1000, "faehigkeiten", "p-wahl", "Wahl");
    runde.regeln.faehigkeiten = true;
    runde.regeln.itemVorrat = "auswahl";
    runde.regeln.itemAuswahl = ["mauer", "fessel", "schubs"];

    const fertig = SCHACH_RUNDE.itemVorratAuslosen(runde);

    gleich(fertig.regeln.itemPool.slice().sort().join(","), "fessel,mauer,schubs",
        "genau die angehakten Items, nichts dazu und nichts weg");

    /* Aus jeder Stufe kommt nur, was drin steht — oder gar nichts. */
    const pool = SCHACH_RUNDE.itemVorrat(fertig);
    wahr(pool !== null, "der Vorrat ist begrenzt");

    for (const stufe of SCHACH_VARIANTEN.STUFEN) {
        for (let schritt = 0; schritt < 100; schritt++) {
            const art = SCHACH_VARIANTEN.faehigkeitAusStufe(
                stufe.id, schritt / 100, [], pool);

            if (art === "") {
                continue;
            }
            wahr(pool.indexOf(art) !== -1, stufe.id + ": " + art + " ist angehakt");
        }
    }

    /* Und leere Stufen bekommen Gewicht 0, werden also nicht mehr gezogen. */
    const gewichte = SCHACH_RUNDE._stufenGewichte(fertig);
    for (const stufe of SCHACH_VARIANTEN.STUFEN) {
        if (SCHACH_VARIANTEN.faehigkeitenDerStufe(stufe.id, pool).length === 0) {
            gleich(gewichte[stufe.id], 0, stufe.id + ": ohne Item kein Gewicht");
        }
    }
});

pruefe("Die eigene Auswahl haelt sich an die Bedingungen der Partie (v0.100)", () => {
    /*
     * Man kann beim Anlegen etwas anhaken, das es in DIESER Partie gar nicht
     * geben kann: Enttarnen gibt es nur ohne sichtbare Seltenheit, Verstecken
     * nur mit. Die Wahl wird deshalb beim Auslosen noch einmal gefiltert —
     * sonst belegte so ein Item einen Platz und kaeme nie.
     */
    const offen = SCHACH_RUNDE.leereRunde(1000, "faehigkeiten", "p-wahl2", "Offen");
    offen.regeln.faehigkeiten = true;
    offen.regeln.seltenheitZeigen = true;
    offen.regeln.itemVorrat = "auswahl";
    offen.regeln.itemAuswahl = ["mauer", "enttarnen", "verstecken"];

    const fertig = SCHACH_RUNDE.itemVorratAuslosen(offen);

    wahr(fertig.regeln.itemPool.indexOf("enttarnen") === -1,
        "Enttarnen gibt es hier nicht und steht deshalb nicht im Vorrat");
    wahr(fertig.regeln.itemPool.indexOf("verstecken") !== -1,
        "Verstecken dagegen schon");
    wahr(fertig.regeln.itemPool.indexOf("mauer") !== -1, "und die Mauer sowieso");
});

pruefe("Die eigene Auswahl uebersteht Speichern und Laden (v0.100)", () => {
    /*
     * Die Liste ist die EINGABE, `itemPool` das Ergebnis. Beide reisen mit —
     * sonst stuende beim „Neu aufstellen" wieder alles zur Verfuegung, obwohl
     * jemand die Partie ausdruecklich auf drei Items festgelegt hat.
     *
     * Dass die Liste ueberhaupt in der angelegten Partie ankommt, prueft der
     * Test in `test-schach-tafel.js`, der seit v0.91 ALLE uebergebenen Regeln
     * durchgeht — dort gehoert die Falle hin, nicht hierher.
     */
    const runde = SCHACH_RUNDE.leereRunde(1000, "faehigkeiten", "p-wahl3", "Wahl");
    runde.regeln.faehigkeiten = true;
    runde.regeln.itemVorrat = "auswahl";
    runde.regeln.itemAuswahl = ["mauer", "fessel"];

    const fertig = SCHACH_RUNDE.itemVorratAuslosen(runde);
    const geladen = SCHACH_RUNDE.normalisieren(JSON.parse(JSON.stringify(fertig)));

    gleich(geladen.regeln.itemAuswahl.slice().sort().join(","), "fessel,mauer",
        "die Wahl uebersteht Speichern und Laden");
    gleich(geladen.regeln.itemPool.slice().sort().join(","), "fessel,mauer",
        "der Vorrat ebenso");
    gleich(geladen.regeln.itemVorrat, "auswahl", "und die Stufe auch");

    /* Ein Stand von frueher kennt das Feld nicht — dann ist die Liste leer,
       und „leer" heisst im ganzen Projekt „keine Einschraenkung". */
    const roh = JSON.parse(JSON.stringify(geladen));
    delete roh.regeln.itemAuswahl;

    const alt = SCHACH_RUNDE.normalisieren(roh);
    gleich(alt.regeln.itemAuswahl.length, 0, "ohne Angabe eine leere Liste");
});

pruefe("Aus einer Lootbox kommt nur, was im Vorrat steht (v0.87)", () => {
    /*
     * DER KERN DES WUNSCHES: Ist der Vorrat begrenzt, darf beim Einsammeln
     * NICHTS anderes herauskommen. Geprueft wird ueber die Ziehung selbst,
     * ueber die ganze Breite der Zufallswerte und jede Stufe.
     */
    const runde = vorratPartie("wenig");
    const pool = runde.regeln.itemPool;

    for (const stufe of SCHACH_VARIANTEN.STUFEN) {
        for (let schritt = 0; schritt < 200; schritt++) {
            const art = SCHACH_VARIANTEN.faehigkeitAusStufe(
                stufe.id, schritt / 200, [], pool);

            if (art === "") {
                /* Erlaubt: Diese Stufe hat im Vorrat nichts. */
                gleich(SCHACH_VARIANTEN.faehigkeitenDerStufe(stufe.id, pool).length, 0,
                    stufe.id + ": leer, also darf nichts kommen");
                continue;
            }

            wahr(pool.indexOf(art) !== -1, stufe.id + ": " + art + " steht im Vorrat");
        }
    }
});

pruefe("Eine Stufe ohne Items im Vorrat wird nicht mehr gezogen (v0.87)", () => {
    /*
     * Sonst erschiene eine Lootbox, aus der beim Einsammeln nichts kommt.
     * Dieselbe Rechnung wie bei den Ungluecken seit v0.84: Gewicht 0, die
     * Chance verteilt sich auf die uebrigen Stufen.
     */
    const runde = vorratPartie("wenig");
    const pool = runde.regeln.itemPool;
    const gewichte = SCHACH_RUNDE._stufenGewichte(runde);

    let leere = 0;
    for (const stufe of SCHACH_VARIANTEN.STUFEN) {
        if (SCHACH_VARIANTEN.faehigkeitenDerStufe(stufe.id, pool).length === 0) {
            leere++;
            gleich(gewichte[stufe.id], 0, stufe.id + ": leere Stufe hat Gewicht 0");
        }
    }

    /* Und mindestens eine Stufe traegt noch etwas — sonst gaebe es gar
       nichts mehr zu ziehen. */
    let belegte = 0;
    for (const stufe of SCHACH_VARIANTEN.STUFEN) {
        if (SCHACH_VARIANTEN.faehigkeitenDerStufe(stufe.id, pool).length > 0) {
            belegte++;
        }
    }
    wahr(belegte > 0, "es bleibt etwas zu ziehen (" + leere + " leer)");
});

pruefe("Ohne Vorrat-Angabe spielt eine Partie wie vor v0.87", () => {
    /*
     * ADDITIVER DATENVERTRAG. Und die zweite Haelfte: Ein gespeicherter Pool
     * darf keine Fähigkeit zurueckholen, die es nicht mehr gibt oder die
     * versteckt ist.
     */
    const runde = faehigkeitenPartie();
    const roh = JSON.parse(JSON.stringify(runde));
    delete roh.regeln.itemVorrat;
    delete roh.regeln.itemPool;

    const wieder = SCHACH_RUNDE.normalisieren(roh);
    gleich(wieder.regeln.itemVorrat, "alle", "fehlende Angabe wird alle");
    gleich(SCHACH_RUNDE.itemVorrat(wieder), null, "und filtert nichts");

    const erfunden = JSON.parse(JSON.stringify(runde));
    erfunden.regeln.itemVorrat = "zehn";
    erfunden.regeln.itemPool = ["sprung", "gibtesnicht", "ausweichen"];

    const geputzt = SCHACH_RUNDE.normalisieren(erfunden).regeln.itemPool;
    wahr(geputzt.indexOf("gibtesnicht") === -1, "erfundene Art faellt raus");
    wahr(geputzt.indexOf("ausweichen") === -1, "versteckte Art faellt raus");
    wahr(geputzt.indexOf("sprung") !== -1, "echte Art bleibt");
});

/* Zieht die Springer hin und her — so lassen sich beliebig viele Halbzuege
   machen, ohne die Stellung zu veraendern. */
function springerZuege(runde, anzahl) {
    const wege = [
        ["id-anna", "b1", "c3"], ["id-bert", "b8", "c6"],
        ["id-anna", "c3", "b1"], ["id-bert", "c6", "b8"]
    ];

    for (let nummer = 0; nummer < anzahl; nummer++) {
        const weg = wege[nummer % wege.length];
        const neu = SCHACH_RUNDE.ziehen(runde, weg[0], SCHACH.feldNummer(weg[1]),
            SCHACH.feldNummer(weg[2]), "D", weg[0], 2000 + nummer);
        wahr(neu !== null, "Zug " + nummer + " (" + weg[1] + "-" + weg[2] + ") erlaubt");
        runde = neu;
    }
    return runde;
}

pruefe("Die Chancen der Stufen ergeben zusammen 100 Prozent", () => {
    const summe = SCHACH_VARIANTEN.STUFEN.reduce((wert, stufe) => wert + stufe.chance, 0);
    gleich(summe, 100, "Summe");
});

pruefe("Jede Stufe hat mindestens eine Faehigkeit, jede Faehigkeit eine Stufe", () => {
    for (const stufe of SCHACH_VARIANTEN.STUFEN) {
        wahr(SCHACH_VARIANTEN.faehigkeitenDerStufe(stufe.id).length > 0,
            "Stufe " + stufe.id + " ist besetzt");
    }
    for (const art of Object.keys(SCHACH_VARIANTEN.FAEHIGKEITEN)) {
        const stufe = SCHACH_VARIANTEN.stufeVon(art);
        wahr(!!stufe, "Stufe von " + art);

        /* Eine VERSTECKTE erscheint nicht mehr — ihre Chance ist 0, und das
           ist richtig so (seit v0.78). */
        if (SCHACH_VARIANTEN.FAEHIGKEITEN[art].versteckt) {
            gleich(SCHACH_VARIANTEN.chanceVon(art), 0, "Chance von " + art + " (versteckt)");
            continue;
        }
        wahr(SCHACH_VARIANTEN.chanceVon(art) > 0, "Chance von " + art);
    }
});

pruefe("Die Ziehung trifft jede Stufe in ihrem Bereich", () => {
    /* 0 liegt in der ersten Stufe, 99,9 in der letzten. */
    gleich(SCHACH_VARIANTEN.stufeVon(SCHACH_VARIANTEN.faehigkeitZiehen(0)).id, "gruen", "unten");
    gleich(SCHACH_VARIANTEN.stufeVon(SCHACH_VARIANTEN.faehigkeitZiehen(0.999)).id, "gelb", "oben");

    /* Die Verteilung ueber viele Werte muss zu den Chancen passen. */
    const gezaehlt = {};
    const schritte = 10000;

    for (let nummer = 0; nummer < schritte; nummer++) {
        const stufe = SCHACH_VARIANTEN.stufeVon(SCHACH_VARIANTEN.faehigkeitZiehen(nummer / schritte));
        gezaehlt[stufe.id] = (gezaehlt[stufe.id] || 0) + 1;
    }

    for (const stufe of SCHACH_VARIANTEN.STUFEN) {
        const anteil = (gezaehlt[stufe.id] || 0) / schritte * 100;
        wahr(Math.abs(anteil - stufe.chance) < 0.5,
            "Anteil " + stufe.id + " (" + anteil.toFixed(1) + " statt " + stufe.chance + ")");
    }
});

pruefe("Zu Beginn liegt kein Wuerfel auf dem Brett", () => {
    gleich(SCHACH_RUNDE.offeneBonusFelder(faehigkeitenPartie()).length, 0, "leer");
    gleich(SCHACH_RUNDE.offeneBonusFelder(laufendePartie()).length, 0, "klassisch: nie");
});

pruefe("Wuerfel erscheinen ueber die Zeit, ohne festen Takt", () => {
    /* Seit v2.8 wird nach JEDEM Halbzug neu gewuerfelt. Ueber viele Zuege
       muessen deshalb welche auftauchen — wann genau, ist Sache der Ziehung. */
    const runde = springerZuege(faehigkeitenPartie(), 24);

    wahr(runde.bonus.length >= 1, "nach 24 Halbzuegen liegt mindestens einer");

    for (const eintrag of runde.bonus) {
        wahr(SCHACH.figurAuf(runde.stand, eintrag.feld) === ".", "liegt auf einem leeren Feld");

        /* Seit v3.6 traegt ein Faehigkeitswuerfel nur seine STUFE — was drin
           ist, entscheidet sich erst beim Einsammeln. Ein Unglueckswuerfel
           traegt weiterhin seine Art. */
        if (eintrag.pech) {
            wahr(!!SCHACH_VARIANTEN.PECH[eintrag.art], "Unglueck mit bekannter Art");
        } else {
            wahr(SCHACH_VARIANTEN.STUFEN.some((stufe) => stufe.id === eintrag.stufe),
                "traegt eine bekannte Stufe");
        }
    }

    /* Kein Feld doppelt belegt. */
    const felder = runde.bonus.map((eintrag) => eintrag.feld);
    gleich(new Set(felder).size, felder.length, "jedes Feld nur einmal");
});

pruefe("Die Erscheinungsrate trifft ihren Wert", () => {
    /* Ueber viele Zugzaehler gemittelt muss die Chance stimmen. */
    let treffer = 0;
    const schritte = 4000;

    for (let nummer = 0; nummer < schritte; nummer++) {
        const wert = SCHACH_RUNDE._zufallsWert("p-messung|" + nummer + "|ob") * 100;
        if (wert < SCHACH_VARIANTEN.BONUS_CHANCE) {
            treffer++;
        }
    }

    const anteil = treffer / schritte * 100;
    wahr(Math.abs(anteil - SCHACH_VARIANTEN.BONUS_CHANCE) < 3,
        "Anteil " + anteil.toFixed(1) + " statt " + SCHACH_VARIANTEN.BONUS_CHANCE);
});

pruefe("Die Anzahl der Wuerfel folgt ihren Chancen", () => {
    const summe = SCHACH_VARIANTEN.BONUS_ANZAHL
        .reduce((wert, eintrag) => wert + eintrag.chance, 0);
    gleich(summe, 100, "Summe der Chancen");

    const gezaehlt = {};
    const schritte = 10000;

    for (let nummer = 0; nummer < schritte; nummer++) {
        const anzahl = SCHACH_VARIANTEN.anzahlZiehen(nummer / schritte);
        gezaehlt[anzahl] = (gezaehlt[anzahl] || 0) + 1;
    }

    for (const eintrag of SCHACH_VARIANTEN.BONUS_ANZAHL) {
        const anteil = (gezaehlt[eintrag.anzahl] || 0) / schritte * 100;
        wahr(Math.abs(anteil - eintrag.chance) < 0.5,
            eintrag.anzahl + " Wuerfel: " + anteil.toFixed(1) + " statt " + eintrag.chance);
    }
});

pruefe("Die Ziehung ist auf jedem Geraet dieselbe", () => {
    /* Der Kern der Sache: gerechnet statt gewuerfelt. Zwei getrennte Laeufe
       muessen Feld UND Inhalt gleich ergeben — sonst saehe jedes Geraet ein
       anderes Brett. */
    const einmal = springerZuege(faehigkeitenPartie(), 24);
    const zweimal = springerZuege(faehigkeitenPartie(), 24);

    gleich(SCHACH_RUNDE._bonusText(einmal), SCHACH_RUNDE._bonusText(zweimal),
        "dieselben Wuerfel");
});

pruefe("Zwei Partien ziehen verschiedene Wuerfel", () => {
    /* Die Kennung geht in die Rechnung ein, damit nicht in jeder Partie
       dasselbe passiert. */
    let andere = SCHACH_RUNDE.leereRunde(1000, "faehigkeiten", "p-andere", "Andere");
    andere = SCHACH_RUNDE.teamBeitreten(andere, "id-anna", "weiss", 1000);
    andere = SCHACH_RUNDE.teamBeitreten(andere, "id-bert", "schwarz", 1000);
    andere = SCHACH_RUNDE.bereitSetzen(andere, "weiss", true, 1000);
    andere = SCHACH_RUNDE.bereitSetzen(andere, "schwarz", true, 1000);

    const eine = springerZuege(faehigkeitenPartie(), 24);
    const zwei = springerZuege(andere, 24);

    wahr(SCHACH_RUNDE._bonusText(eine) !== SCHACH_RUNDE._bonusText(zwei), "nicht identisch");
});

/*
 * Seit v3.3 gibt es keine Hoechstzahl mehr (Wunsch [#3]): Der Nachschub darf
 * nicht mitten in der Partie aufhoeren. Geprueft wird deshalb das Gegenteil von
 * frueher - dass es ueber viele Zuege WEITERGEHT - und die einzige verbliebene
 * Grenze: das Brett selbst.
 */
pruefe("Der Nachschub hoert nicht auf", () => {
    const kurz = springerZuege(faehigkeitenPartie(), 24);
    const lang = springerZuege(faehigkeitenPartie(), 80);

    wahr(lang.bonus.length > kurz.bonus.length,
        "nach 80 Halbzuegen liegen mehr als nach 24 ("
        + lang.bonus.length + " gegen " + kurz.bonus.length + ")");
    wahr(lang.bonus.length > 3, "und mehr als die frueheren drei");
});

pruefe("Wuerfel liegen nur auf freien Feldern, jedes hoechstens einmal", () => {
    const runde = springerZuege(faehigkeitenPartie(), 80);

    for (const eintrag of runde.bonus) {
        wahr(SCHACH.figurAuf(runde.stand, eintrag.feld) === ".",
            "Feld " + eintrag.feld + " ist frei");
    }

    const felder = runde.bonus.map((eintrag) => eintrag.feld);
    gleich(new Set(felder).size, felder.length, "kein Feld doppelt belegt");
    wahr(runde.bonus.length <= SCHACH.felderVon(runde.stand),
        "nie mehr Wuerfel als Felder");
});

pruefe("Wer auf einen Wuerfel zieht, sammelt ihn ein", () => {
    let runde = faehigkeitenPartie();

    /* Der Wuerfel wird von Hand auf e4 gelegt — wo er sonst erscheint, ist
       Sache der Ziehung und oben schon geprueft. */
    runde.bonus.push({ feld: SCHACH.feldNummer("e4"), art: "doppelzug" });

    runde = SCHACH_RUNDE.ziehen(runde, "id-anna",
        SCHACH.feldNummer("e2"), SCHACH.feldNummer("e4"), "D", "Anna", 2000);

    wahr(runde !== null, "Zug erlaubt");
    gleich(runde.faehigkeiten.weiss.join(","), "doppelzug", "eingesammelt");
    gleich(runde.bonus.length, 0, "vom Brett verschwunden");
});

pruefe("Ein eingesammelter Wuerfel bleibt weg, auch nach dem Neuladen", () => {
    let runde = faehigkeitenPartie();
    runde.bonus.push({ feld: SCHACH.feldNummer("e4"), art: "doppelzug" });
    runde = SCHACH_RUNDE.ziehen(runde, "id-anna",
        SCHACH.feldNummer("e2"), SCHACH.feldNummer("e4"), "D", "Anna", 2000);

    const wieder = SCHACH_RUNDE.normalisieren(JSON.parse(JSON.stringify(runde)));
    gleich(wieder.bonus.length, 0, "kein Wuerfel zurueck");
    gleich(wieder.faehigkeiten.weiss.join(","), "doppelzug", "Faehigkeit bleibt");
});

/* ------------------------------------------------------------------ *
 * Die Abklingzeit der Stufen (seit v0.41)
 *
 * Gemeldet war: „es kommen fast nur gruene". Das war kein Fehler, sondern die
 * eingestellte Chance von 52 Prozent — die Daempfung von v3.6 wirkt nur
 * INNERHALB einer Stufe. Seit v0.41 hat Gruen zusaetzlich eine Abklingzeit;
 * die anderen Stufen behalten ihre feste Chance.
 * ------------------------------------------------------------------ */

pruefe("Ohne Abstand zaehlt jede Stufe voll", () => {
    const gewichte = SCHACH_VARIANTEN.stufenGewichte({});

    for (const stufe of SCHACH_VARIANTEN.STUFEN) {
        gleich(gewichte[stufe.id], 1, "Stufe " + stufe.id + " zaehlt voll");
    }
});

pruefe("Gruen klingt ab und erholt sich gleichmaessig", () => {
    const stufe = SCHACH_VARIANTEN.STUFEN.find((eintrag) => eintrag.id === "gruen");
    wahr(!!stufe.abklingen, "Gruen hat eine Abklingzeit");

    const frisch = SCHACH_VARIANTEN.stufenGewichte({ gruen: 0 });
    gleich(frisch.gruen, stufe.abklingen.gewicht, "direkt danach am niedrigsten");
    gleich(frisch.blau, 1, "Blau bleibt unberuehrt");

    const halb = SCHACH_VARIANTEN.stufenGewichte(
        { gruen: stufe.abklingen.halbzuege / 2 });
    wahr(halb.gruen > frisch.gruen && halb.gruen < 1, "dazwischen steigt es");

    const spaeter = SCHACH_VARIANTEN.stufenGewichte(
        { gruen: stufe.abklingen.halbzuege });
    gleich(spaeter.gruen, 1, "nach der Abklingzeit wieder voll");
});

pruefe("Ohne Gewichte zieht stufeZiehen wie vor v0.41", () => {
    gleich(SCHACH_VARIANTEN.stufeZiehen(0).stufe.id, "gruen", "0 ist gruen");
    gleich(SCHACH_VARIANTEN.stufeZiehen(0.9).stufe.id, "lila", "0,9 ist lila");
    gleich(SCHACH_VARIANTEN.stufeZiehen(0.99).stufe.id, "gelb", "0,99 ist gelb");
});

pruefe("Ein Gewicht von 0 nimmt eine Stufe ganz aus dem Rennen", () => {
    const gewichte = { gruen: 0, blau: 1, lila: 1, gelb: 1 };

    for (let schritt = 0; schritt <= 20; schritt++) {
        const gezogen = SCHACH_VARIANTEN.stufeZiehen(schritt / 20, gewichte);
        wahr(gezogen.stufe.id !== "gruen", "bei " + schritt + " kein Gruen");
        wahr(gezogen.anteil >= 0 && gezogen.anteil < 1, "Anteil bleibt im Rahmen");
    }
});

pruefe("Wann eine Stufe zuletzt kam, ueberlebt das Speichern", () => {
    const runde = faehigkeitenPartie();
    runde.stufeZuletzt.gruen = 4;

    const wieder = SCHACH_RUNDE.normalisieren(JSON.parse(JSON.stringify(runde)));
    gleich(wieder.stufeZuletzt.gruen, 4, "Takt gemerkt");

    /* Eine Partie von vorher kennt das Feld nicht — dann ist es fuer jede
       Stufe „lange her", und es wird gezogen wie bisher. */
    const alt = JSON.parse(JSON.stringify(runde));
    delete alt.stufeZuletzt;
    const ohne = SCHACH_RUNDE.normalisieren(alt);
    gleich(Object.keys(ohne.stufeZuletzt).length, 0, "kein Eintrag, kein Fehler");
});

pruefe("Ein erschienener Wuerfel merkt sich seine Stufe", () => {
    const runde = faehigkeitenPartie();
    runde.bonus = [];

    /* Die Ziehung haengt am gerechneten Zufall: WANN ein Wuerfel kommt, ist
       nicht Sache dieses Tests — also wird so lange nachgezogen, bis einer
       da ist. */
    for (let schritt = 0; schritt < 60 && runde.bonus.length === 0; schritt++) {
        runde.zugZaehler = schritt;
        runde.stand.takt = schritt;
        SCHACH_RUNDE._bonusNachziehen(runde);
    }

    wahr(runde.bonus.length > 0, "in 60 Halbzuegen kam wenigstens ein Wuerfel");

    for (const eintrag of runde.bonus) {
        if (!eintrag.pech) {
            wahr(Number.isInteger(runde.stufeZuletzt[eintrag.stufe]),
                "die Stufe " + eintrag.stufe + " ist mit ihrem Takt vermerkt");
        }
    }
});

pruefe("Eine Partie aus der Zeit der festen Felder behaelt sie", () => {
    /* Fassung 1: vier feste Felder, davon eines schon eingesammelt. */
    const alt = {
        variante: "faehigkeiten",
        stand: { brett: SCHACH.GRUNDSTELLUNG, amZug: "weiss" },
        teams: { weiss: ["id-anna"], schwarz: ["id-bert"] },
        laeuft: true,
        zugZaehler: 3,
        bonusGesammelt: [26]
    };

    const runde = SCHACH_RUNDE.normalisieren(alt);
    gleich(runde.bonus.length, 3, "drei Felder liegen noch");
    wahr(!runde.bonus.some((eintrag) => eintrag.feld === 26), "das eingesammelte fehlt");
});

/* ------------------------------------------------------------------ *
 * Die einzelnen Fähigkeiten
 * ------------------------------------------------------------------ */

/* Legt eine Fähigkeit direkt ins Team und setzt sie ein. */
function einsetzen(runde, art, zielFeld, spieler, umwandlung) {
    const wer = spieler || "id-anna";
    const farbe = SCHACH_RUNDE.teamVon(runde, wer);
    const vorbereitet = SCHACH_RUNDE.kopieren(runde);

    vorbereitet.faehigkeiten[farbe].push(art);
    return SCHACH_RUNDE.faehigkeitEinsetzen(vorbereitet, wer, art, zielFeld, wer,
        3000, umwandlung);
}

/* Laesst Schwarz einen belanglosen Zug machen. */
function gegnerZiehtEinmal(runde, zeitpunkt) {
    const neu = SCHACH_RUNDE.ziehen(runde, "id-bert",
        SCHACH.feldNummer("e7"), SCHACH.feldNummer("e6"), "D", "Bert",
        zeitpunkt || 3050);

    wahr(neu !== null, "Schwarz zieht");
    return neu;
}

pruefe("Sprung: eine beliebige Figur zieht wie ein Springer", () => {
    let runde = einsetzen(faehigkeitenPartie(), "sprung", -1);
    wahr(runde !== null, "eingesetzt");

    gleich(runde.stand.zusatzMuster, "springer", "Muster gesetzt");
    gleich(runde.stand.amZug, "weiss", "seit v0.48 bleibt Weiss am Zug");

    const ziele = SCHACH.zuege(runde.stand, SCHACH.feldNummer("a1"))
        .map((zug) => SCHACH.feldName(zug.nach)).sort().join(",");
    gleich(ziele, "b3", "der Turm springt");
});

/*
 * AUSWEICHEN GEHT SEIT v0.58 NUR IM GEGENZUG.
 *
 * Die Tests unten setzen es deshalb ein, waehrend SCHWARZ am Zug ist, und
 * lassen Schwarz danach ziehen — genau der Ablauf, den es im Spiel hat. Bis
 * v0.57 durfte man es im eigenen Zug einsetzen; das war der Fehler, der es zum
 * geschenkten Extra-Feld machte.
 */
function ausweichenImGegenzug(runde) {
    const vorbereitet = SCHACH_RUNDE.kopieren(runde);
    vorbereitet.stand.amZug = "schwarz";
    vorbereitet.faehigkeiten.weiss.push("ausweichen");

    const gesetzt = SCHACH_RUNDE.faehigkeitEinsetzen(
        vorbereitet, "id-anna", "ausweichen", -1, "Anna", 3000);

    if (!gesetzt) {
        return null;
    }

    /* Schwarz macht seinen Zug — danach ist Weiss dran und darf das Muster
       benutzen. Der belanglose Bauernzug e7-e6 steht in jeder Stellung der
       Tests unten zur Verfuegung. */
    return SCHACH_RUNDE.ziehen(gesetzt, "id-bert",
        SCHACH.feldNummer("e7"), SCHACH.feldNummer("e6"), "D", "Bert", 3050);
}

pruefe("Ausweichen: eine beliebige Figur zieht ein Feld weit", () => {
    let runde = faehigkeitenPartie();

    /* Turm a1, daneben und darueber frei — b2 ist nur schraeg zu erreichen. */
    runde.stand = SCHACH.standNormalisieren({
        variante: "faehigkeiten",
        brett: "....k..."
            + "....b..."
            + "........"
            + "........"
            + "........"
            + "........"
            + "........"
            + "T...K...",
        amZug: "weiss",
        rochade: ""
    });

    const ohne = SCHACH.zuege(runde.stand, SCHACH.feldNummer("a1"))
        .map((zug) => SCHACH.feldName(zug.nach));
    wahr(ohne.indexOf("b2") === -1, "ohne Faehigkeit kein Schraegzug");

    const mit = ausweichenImGegenzug(runde);
    wahr(mit !== null, "im Gegenzug eingesetzt");
    gleich(mit.stand.zusatzMuster, "ausweichen", "Muster gesetzt");
    gleich(mit.stand.amZug, "weiss", "und jetzt ist Weiss dran");

    const ziele = SCHACH.zuege(mit.stand, SCHACH.feldNummer("a1"))
        .map((zug) => SCHACH.feldName(zug.nach));
    wahr(ziele.indexOf("b2") !== -1, "jetzt auch ein Feld schraeg");
    wahr(ziele.indexOf("a2") !== -1, "und weiterhin gerade");
});

pruefe("Ausweichen laesst sich im EIGENEN Zug nicht einsetzen (v0.58)", () => {
    /*
     * Die Notbremse ist eine Notbremse: Sie geht, WÄHREND der Gegner
     * zuschlaegt. Bis v0.57 durfte man sie auch im eigenen Zug druecken und
     * behielt den Zug — ein geschenktes Extra-Feld fuer jede Figur, jederzeit.
     */
    const runde = faehigkeitenPartie();

    gleich(SCHACH_RUNDE.darfEinsetzen(runde, "id-anna", "ausweichen"), false,
        "am eigenen Zug nicht");
    gleich(einsetzen(runde, "ausweichen", -1), null, "und einsetzen geht auch nicht");

    const imGegenzug = SCHACH_RUNDE.kopieren(runde);
    imGegenzug.stand.amZug = "schwarz";
    gleich(SCHACH_RUNDE.darfEinsetzen(imGegenzug, "id-anna", "ausweichen"), true,
        "im Gegenzug schon");

    /* Und das Pluszeichen faellt dadurch von selbst weg. */
    gleich(SCHACH_RUNDE.behaeltZug(runde, "weiss", "ausweichen"), false,
        "kein Pluszeichen mehr");
    gleich(SCHACH_VARIANTEN.zeigtPlus("ausweichen"), false,
        "auch nicht als Eigenschaft der Faehigkeit");
});

pruefe("Ausweichen schlaegt nicht", () => {
    let runde = faehigkeitenPartie();

    /* Weisser Turm a1, schwarzer Bauer schraeg daneben auf b2. */
    runde.stand = SCHACH.standNormalisieren({
        variante: "faehigkeiten",
        brett: "....k..."
            + "....b..."
            + "........"
            + "........"
            + "........"
            + "........"
            + ".b......"
            + "T...K...",
        amZug: "weiss",
        rochade: ""
    });

    const mit = ausweichenImGegenzug(runde);
    wahr(mit !== null, "im Gegenzug eingesetzt");

    const ziele = SCHACH.zuege(mit.stand, SCHACH.feldNummer("a1"))
        .map((zug) => SCHACH.feldName(zug.nach));

    wahr(ziele.indexOf("b2") === -1, "der besetzte Nachbar ist kein Ziel");
    wahr(ziele.indexOf("a2") !== -1, "das freie Feld schon");
});

pruefe("Ausweichen geht auch, waehrend der Gegner am Zug ist", () => {
    let runde = faehigkeitenPartie();
    runde.stand.amZug = "schwarz";

    /* Anna ist im weissen Team; Schwarz ist am Zug. */
    runde.faehigkeiten.weiss.push("ausweichen");

    const neu = SCHACH_RUNDE.faehigkeitEinsetzen(
        runde, "id-anna", "ausweichen", -1, "Anna", 3000);

    wahr(neu !== null, "eingesetzt, obwohl Schwarz am Zug ist");
    gleich(neu.stand.amZug, "schwarz", "Schwarz bleibt am Zug");
    gleich(neu.stand.zusatzFarbe, "weiss", "das Muster gehoert Weiss");
    gleich(neu.faehigkeiten.weiss.indexOf("ausweichen"), -1, "verbraucht");
});

pruefe("Ausweichen ueberlebt den Gegnerzug UND das Speichern", () => {
    /*
     * DER GEMELDETE FEHLER (v0.41): „Ausweichen geht verschwindet."
     *
     * Eingesetzt war es richtig - nur warf `SCHACH.standNormalisieren` das
     * Muster beim naechsten Lesen wieder weg, weil es den Namen nicht kannte.
     * Die Faehigkeit war damit weg und wirkte nie. Genau diesen Weg geht der
     * Test: einsetzen, speichern, laden, ziehen lassen, wieder laden.
     */
    let runde = faehigkeitenPartie();
    runde.stand.amZug = "schwarz";
    runde.faehigkeiten.weiss.push("ausweichen");

    const eingesetzt = SCHACH_RUNDE.faehigkeitEinsetzen(
        runde, "id-anna", "ausweichen", -1, "Anna", 3000);

    /* Der Weg durch die Datenbank: alles einmal durch Text und zurueck. */
    const geladen = SCHACH_RUNDE.normalisieren(
        JSON.parse(JSON.stringify(eingesetzt)));
    gleich(geladen.stand.zusatzMuster, "ausweichen", "Muster ueberlebt das Speichern");

    /* Jetzt zieht Schwarz - das darf das Muster von Weiss nicht loeschen. */
    const gezogen = SCHACH_RUNDE.ziehen(geladen, "id-bert",
        SCHACH.feldNummer("e7"), SCHACH.feldNummer("e6"), "D", "Bert", 4000);
    wahr(gezogen !== null, "Schwarz zieht");

    const danach = SCHACH_RUNDE.normalisieren(JSON.parse(JSON.stringify(gezogen)));
    gleich(danach.stand.zusatzMuster, "ausweichen", "Muster steht noch");
    gleich(danach.stand.zusatzFarbe, "weiss", "und gehoert weiter Weiss");
});

pruefe("Das Pluszeichen sagt die Wahrheit ueber den naechsten Zug", () => {
    /*
     * v0.41: `behaeltZug` beantwortet die Frage, die das Pluszeichen stellt.
     * Drei Faelle, und alle drei standen bis v0.40 falsch am Bildschirm.
     */
    const runde = faehigkeitenPartie();

    gleich(SCHACH_RUNDE.behaeltZug(runde, "weiss", "mauer"), true,
        "die Mauer beendet den Zug nicht");
    gleich(SCHACH_RUNDE.behaeltZug(runde, "weiss", "friedhof"), false,
        "der Friedhof kostet den Zug");
    gleich(SCHACH_RUNDE.behaeltZug(runde, "weiss", "sprung"), false,
        "der Sprung ist der Zug selbst");
    gleich(SCHACH_RUNDE.behaeltZug(runde, "weiss", "bauernschub"), false,
        "der Bauernschub kostet den Zug seit v0.56");
    gleich(SCHACH_RUNDE.behaeltZug(runde, "schwarz", "mauer"), false,
        "Schwarz ist gar nicht am Zug");

    /* Wer den Doppelzug offen hat, behaelt den Zug sogar bei einer
       Faehigkeit, die ihn sonst beendet. */
    const mitDoppelzug = SCHACH_RUNDE.kopieren(runde);
    mitDoppelzug.stand.extraZug = "weiss";
    gleich(SCHACH_RUNDE.behaeltZug(mitDoppelzug, "weiss", "friedhof"), true,
        "der Doppelzug geht vor");
});

pruefe("Die schlimmsten Unglueckswuerfel sind die seltensten", () => {
    /*
     * v0.41: Meuterei (der Gegner bekommt eine Figur geschenkt) und Erdrutsch
     * (nur Stellung) haben die Stufen getauscht.
     */
    gleich(SCHACH_VARIANTEN.pechStufeVon("meuterei").id, "gelb",
        "Meuterei ist legendaer");
    gleich(SCHACH_VARIANTEN.pechStufeVon("erdrutsch").id, "lila",
        "der Erdrutsch ist episch");

    const gelb = SCHACH_VARIANTEN.STUFEN.find((stufe) => stufe.id === "gelb");
    const lila = SCHACH_VARIANTEN.STUFEN.find((stufe) => stufe.id === "lila");
    wahr(gelb.chance < lila.chance, "und legendaer ist seltener als episch");
});

pruefe("Andere Faehigkeiten gehen NICHT waehrend des Gegnerzugs", () => {
    let runde = faehigkeitenPartie();
    runde.stand.amZug = "schwarz";
    runde.faehigkeiten.weiss.push("sprung");

    const neu = SCHACH_RUNDE.faehigkeitEinsetzen(
        runde, "id-anna", "sprung", -1, "Anna", 3000);

    gleich(neu, null, "abgewiesen");
});

/* ------------------------------------------------------------------ *
 * Faehigkeiten und das Schach (seit v3.6)
 * ------------------------------------------------------------------ */

/*
 * Weiss steht im Schach: schwarze Dame auf e8, weisser Koenig auf e1, die
 * e-Linie ist frei. Der weisse Turm auf a1 kann nichts dagegen tun.
 */
function partieImSchach() {
    const runde = faehigkeitenPartie();

    runde.stand = SCHACH.standNormalisieren({
        variante: "faehigkeiten",
        brett: "....d..."
            + "........"
            + "........"
            + "........"
            + "........"
            + "........"
            + "B......."
            + "T...K..k",
        amZug: "weiss",
        rochade: ""
    });
    return runde;
}

pruefe("Die Lage im Test ist wirklich Schach", () => {
    wahr(SCHACH.imSchach(partieImSchach().stand, "weiss"), "Weiss steht im Schach");
});

pruefe("Im Schach ist keine Faehigkeit erlaubt, die den Zug beendet", () => {
    /* Wiederbelebung beendet den Zug — danach waere der Koenig einfach weg. */
    const runde = partieImSchach();
    runde.gefallen.weiss.push({ art: "S", feld: SCHACH.feldNummer("b4") });

    const neu = einsetzen(runde, "wiederbelebung", SCHACH.feldNummer("b4"));
    gleich(neu, null, "abgewiesen");
});

pruefe("Im Schach bleibt erlaubt, was den Zug NICHT beendet", () => {
    /*
     * Die Mauer kostet keinen Zug — man muss danach ohnehin aus dem Schach
     * ziehen, und genau dabei kann sie helfen. (Bis v0.57 stand hier das
     * Ausweichen; seit v0.58 geht das nur noch im Gegenzug und taugt als
     * Beispiel nicht mehr.)
     */
    const runde = partieImSchach();
    const felder = SCHACH_RUNDE.zielFelder(runde, "id-anna", "mauer");
    wahr(felder.length > 0, "es gibt einen Platz fuer die Mauer");

    const neu = einsetzen(runde, "mauer", felder[0]);

    wahr(neu !== null, "eingesetzt");
    gleich(neu.stand.amZug, "weiss", "Weiss bleibt am Zug");
});

pruefe("Keine Faehigkeit darf den eigenen Koenig ins Schach stellen", () => {
    /*
     * Weisser Koenig e1, schwarzer Turm auf e3, dazwischen ein weisser Bauer
     * auf e2. Der Bauernschub schiebt ihn weg — und legt den Koenig frei.
     */
    const runde = faehigkeitenPartie();
    runde.stand = SCHACH.standNormalisieren({
        variante: "faehigkeiten",
        brett: "....k..."
            + "........"
            + "........"
            + "........"
            + "........"
            + "....t..."
            + "....B..."
            + "....K...",
        amZug: "weiss",
        rochade: ""
    });

    wahr(!SCHACH.imSchach(runde.stand, "weiss"), "vorher steht Weiss nicht im Schach");
    gleich(einsetzen(runde, "bauernschub", -1), null, "der Bauernschub ist abgewiesen");
});

/* ------------------------------------------------------------------ *
 * Wuerfel einsammeln und ihr Inhalt (seit v3.6)
 * ------------------------------------------------------------------ */

pruefe("Ein Turm sammelt auch unterwegs ein", () => {
    const runde = faehigkeitenPartie();

    runde.stand = SCHACH.standNormalisieren({
        variante: "faehigkeiten",
        brett: "....k..."
            + "........"
            + "........"
            + "........"
            + "........"
            + "........"
            + "........"
            + "T...K...",
        amZug: "weiss",
        rochade: ""
    });
    /* Ein Wuerfel auf a3 — der Turm zieht von a1 nach a5, also darueber. */
    runde.bonus = [{ feld: SCHACH.feldNummer("a3"), art: "", stufe: "gruen" }];

    const neu = SCHACH_RUNDE.ziehen(runde, "id-anna",
        SCHACH.feldNummer("a1"), SCHACH.feldNummer("a5"), "D", "Anna", 4000);

    wahr(neu !== null, "gezogen");
    gleich(neu.bonus.filter((eintrag) => eintrag.feld === SCHACH.feldNummer("a3")).length,
        0, "der Wuerfel ist weg");
    gleich(neu.faehigkeiten.weiss.length, 1, "eine Faehigkeit im Vorrat");
});

pruefe("Ein Springer sammelt unterwegs NICHT ein", () => {
    const runde = faehigkeitenPartie();

    runde.stand = SCHACH.standNormalisieren({
        variante: "faehigkeiten",
        brett: "....k..."
            + "........"
            + "........"
            + "........"
            + "........"
            + "........"
            + "........"
            + ".S..K...",
        amZug: "weiss",
        rochade: ""
    });
    /* b2 und b3 liegen auf dem gezeichneten L von b1 nach c3 — betreten wird
       aber nur c3. */
    runde.bonus = [
        { feld: SCHACH.feldNummer("b3"), art: "", stufe: "gruen" },
        { feld: SCHACH.feldNummer("b2"), art: "", stufe: "gruen" }
    ];

    const neu = SCHACH_RUNDE.ziehen(runde, "id-anna",
        SCHACH.feldNummer("b1"), SCHACH.feldNummer("c3"), "D", "Anna", 4000);

    wahr(neu !== null, "gezogen");
    gleich(neu.bonus.length, 2, "beide Wuerfel liegen noch");
    gleich(neu.faehigkeiten.weiss.length, 0, "nichts eingesammelt");
});

pruefe("Was man schon hat, kommt seltener nach", () => {
    /*
     * Ueber viele Ziehungen gemessen: Mit zwei Stueck „Sprung" im Vorrat muss
     * er deutlich unter der Gleichverteilung liegen.
     *
     * DIE GLEICHVERTEILUNG WIRD GERECHNET, NICHT HINGESCHRIEBEN (seit v0.78).
     * Bis dahin stand hier ein Drittel als feste Zahl — die stimmte, solange
     * die gewoehnliche Stufe genau drei erreichbare Faehigkeiten hatte. Als
     * Ausweichen versteckt wurde, waren es zwei, und der Test schlug fehl,
     * obwohl an der Daempfung nichts kaputt war.
     */
    const erreichbar = SCHACH_VARIANTEN.faehigkeitenDerStufe("gruen").length;
    const gleichverteilt = 100 / erreichbar;

    /*
     * Auch die ERWARTUNG MIT VORRAT wird gerechnet. Zwei Stueck druecken das
     * Gewicht auf `wiederholung` hoch zwei, die uebrigen zaehlen mit 1 —
     * daraus faellt der Anteil. Auch diese Zahl hing frueher an drei
     * Faehigkeiten (dort 1,1 Prozent, bei zweien sind es 2,2).
     */
    const daempfung = SCHACH_VARIANTEN.STUFEN
        .find((stufe) => stufe.id === "gruen").wiederholung;
    const gewicht = Math.pow(daempfung, 2);
    const erwartetMit = 100 * gewicht / (gewicht + (erreichbar - 1));

    const schritte = 3000;
    let mitVorrat = 0;
    let ohneVorrat = 0;

    for (let nummer = 0; nummer < schritte; nummer++) {
        const wert = nummer / schritte;

        if (SCHACH_VARIANTEN.faehigkeitAusStufe("gruen", wert, []) === "sprung") {
            ohneVorrat++;
        }
        if (SCHACH_VARIANTEN.faehigkeitAusStufe("gruen", wert,
            ["sprung", "sprung"]) === "sprung") {
            mitVorrat++;
        }
    }

    const ohne = ohneVorrat / schritte * 100;
    const mit = mitVorrat / schritte * 100;

    wahr(Math.abs(ohne - gleichverteilt) < 1, "ohne Vorrat gleichverteilt ("
        + ohne.toFixed(1) + " gegen erwartete " + gleichverteilt.toFixed(1) + ")");
    wahr(Math.abs(mit - erwartetMit) < 1, "mit zwei Stueck wie gerechnet ("
        + mit.toFixed(1) + " gegen erwartete " + erwartetMit.toFixed(1) + ")");

    /* Und der Punkt, um den es geht: deutlich seltener als ohne Vorrat. */
    wahr(mit < gleichverteilt / 5, "mit zwei Stueck fast nie ("
        + mit.toFixed(1) + " gegen " + gleichverteilt.toFixed(1) + ")");
});

pruefe("Eine versteckte Faehigkeit kommt nicht mehr — bleibt aber benutzbar (v0.78)", () => {
    /*
     * NUTZER-ENTSCHEIDUNG 18.08.: „Ausweichen kann raus." Nachgemessen hatte
     * es vorher vollstaendig funktioniert; unbrauchbar machte es die Regel
     * `nurImGegenzug` (v0.58), die es genau dann sperrt, wenn man auf seine
     * Faehigkeiten schaut.
     *
     * VERSTECKT HEISST NICHT GELOESCHT. Ein Eintrag, der aus `FAEHIGKEITEN`
     * verschwindet, wird von `normalisieren` beim naechsten Laden aus jedem
     * Vorrat geworfen — laufende Partien verloeren ihn mitten im Spiel.
     */
    const versteckte = Object.keys(SCHACH_VARIANTEN.FAEHIGKEITEN)
        .filter((art) => SCHACH_VARIANTEN.FAEHIGKEITEN[art].versteckt);

    wahr(versteckte.indexOf("ausweichen") !== -1, "Ausweichen ist versteckt");

    for (const art of versteckte) {
        const stufe = SCHACH_VARIANTEN.stufeVon(art).id;

        /* 1. Keine Lootbox wirft sie mehr aus — ueber die ganze Breite der
           Ziehung geprueft, nicht nur an einem Wert. */
        gleich(SCHACH_VARIANTEN.faehigkeitenDerStufe(stufe).indexOf(art), -1,
            art + " steht nicht mehr in der Ziehungsliste");

        for (let schritt = 0; schritt < 500; schritt++) {
            gleich(SCHACH_VARIANTEN.faehigkeitAusStufe(stufe, schritt / 500, []) === art,
                false, art + " wird bei " + (schritt / 500) + " nicht gezogen");
        }

        /* 2. Sie taucht in keinem Erklaertext mehr auf — sonst verspricht die
           Bibliothek etwas, das keine Lootbox einloest. */
        const eintrag = SCHACH_VARIANTEN.FAEHIGKEITEN[art];
        gleich(SCHACH_VARIANTEN.faehigkeitenErklaerung().indexOf(eintrag.titel), -1,
            art + " steht nicht mehr im Erklaertext");

        /* 3. Ihre Tabelle bleibt vollstaendig — daran haengt alles Uebrige. */
        wahr(!!eintrag.titel && !!eintrag.beschreibung,
            art + " hat weiterhin Titel und Beschreibung");
    }

    /* 4. Wer sie im Vorrat hat, behaelt sie ueber das Laden hinweg UND darf
       sie einsetzen. Das ist der eigentliche Grund fuer „verstecken statt
       loeschen". */
    let runde = faehigkeitenPartie();
    runde.faehigkeiten.weiss.push("ausweichen");

    const geladen = SCHACH_RUNDE.normalisieren(
        JSON.parse(JSON.stringify(runde)));
    wahr(geladen.faehigkeiten.weiss.indexOf("ausweichen") !== -1,
        "Ausweichen ueberlebt das Laden");

    /* Einsetzen geht nur im Gegenzug — also erst Weiss ziehen lassen. */
    const nachZug = SCHACH_RUNDE.ziehen(geladen, "id-anna",
        SCHACH.feldNummer("e2"), SCHACH.feldNummer("e4"), "D", "Anna", 2000);
    wahr(nachZug !== null, "Weiss hat gezogen, Schwarz ist dran");

    gleich(SCHACH_RUNDE.darfEinsetzen(nachZug, "id-anna", "ausweichen"), true,
        "und einsetzen darf man sie weiterhin");
});

pruefe("Bei Legendaer ist die Daempfung viel schwaecher", () => {
    /*
     * Der Grund steht in schach-varianten.js: Bei wenigen Faehigkeiten waere
     * eine harte Daempfung dasselbe wie „du bekommst die anderen garantiert
     * zuerst" — dann waere der Zufall weg.
     */
    const schritte = 3000;
    let gruen = 0;
    let gelb = 0;

    const gruenArt = SCHACH_VARIANTEN.faehigkeitenDerStufe("gruen")[0];
    const gelbArt = SCHACH_VARIANTEN.faehigkeitenDerStufe("gelb")[0];

    for (let nummer = 0; nummer < schritte; nummer++) {
        const wert = nummer / schritte;

        if (SCHACH_VARIANTEN.faehigkeitAusStufe("gruen", wert, [gruenArt]) === gruenArt) {
            gruen++;
        }
        if (SCHACH_VARIANTEN.faehigkeitAusStufe("gelb", wert, [gelbArt]) === gelbArt) {
            gelb++;
        }
    }

    wahr(gelb > gruen, "legendaer wiederholt sich eher als gewoehnlich ("
        + gelb + " gegen " + gruen + ")");
});

pruefe("Teleport: eine Figur springt auf ein freies Feld im Umkreis", () => {
    let runde = einsetzen(faehigkeitenPartie(), "teleport", -1);
    wahr(runde !== null, "eingesetzt");

    /* Seit v0.48 teleportiert man SOFORT — Weiss ist noch am Zug. */
    gleich(runde.stand.amZug, "weiss", "Weiss bleibt am Zug");

    const ziele = SCHACH.zuege(runde.stand, SCHACH.feldNummer("a1"))
        .map((zug) => SCHACH.feldName(zug.nach)).sort().join(",");
    /* Aus der Grundstellung heraus sind a3, b3 und c3 frei — c1 und c2 sind
       besetzt, geschlagen wird beim Teleport nicht. */
    gleich(ziele, "a3,b3,c3", "nur freie Felder im Umkreis 2");
});

pruefe("Bauernschub: alle eigenen Bauern ruecken ein Feld vor", () => {
    const runde = einsetzen(faehigkeitenPartie(), "bauernschub", -1);
    wahr(runde !== null, "eingesetzt");

    for (const spalte of "abcdefgh") {
        gleich(SCHACH.figurAuf(runde.stand, SCHACH.feldNummer(spalte + "3")), "B",
            "Bauer auf " + spalte + "3");
        gleich(SCHACH.figurAuf(runde.stand, SCHACH.feldNummer(spalte + "2")), ".",
            spalte + "2 ist frei");
    }
    gleich(SCHACH.figurAuf(runde.stand, SCHACH.feldNummer("a7")), "b",
        "schwarze Bauern bleiben stehen");

    /* Seit v0.56 kostet er den Zug. */
    gleich(runde.stand.amZug, "schwarz", "danach ist der Gegner dran");
});

pruefe("Bauernschub: geschobene Bauern auf der letzten Reihe wandeln um (v0.56)", () => {
    /*
     * DER AUSGLEICH FUER DAS VERLORENE PLUSZEICHEN (v0.56). Bis v0.55 wurden
     * sie stillschweigend zu Damen; jetzt sagt der Aufrufer, was sie werden,
     * und zwar EINMAL fuer alle.
     */
    /*
     * DER SCHWARZE KOENIG STEHT SEIT v0.95 AUF h4, nicht mehr auf e8. Grund:
     * Die beiden Bauern wandeln auf a8 und c8 zu Damen um, und die Dame auf c8
     * gaebe dem Koenig auf e8 Schach — seit der Nutzer-Entscheidung vom 20.08.
     * weist das Modell die Faehigkeit dann ab. Geprueft werden soll hier die
     * UMWANDLUNG, nicht die Abweisung; auf h4 steht der Koenig ausserhalb
     * beider Damen und hat weiter Zuege.
     */
    let runde = faehigkeitenPartie();
    runde.stand = SCHACH.standNormalisieren({
        variante: "faehigkeiten",
        brett: "........"
            + "B.B....."
            + "........"
            + "........"
            + ".......k"
            + "........"
            + "........"
            + "....K...",
        amZug: "weiss",
        rochade: ""
    });

    /* Ohne Angabe wie frueher: Damen. */
    const damen = einsetzen(runde, "bauernschub", -1);
    wahr(damen !== null, "eingesetzt");
    gleich(SCHACH.figurAuf(damen.stand, SCHACH.feldNummer("a8")), "D", "a8 wird Dame");
    gleich(SCHACH.figurAuf(damen.stand, SCHACH.feldNummer("c8")), "D", "c8 auch");

    /* Und mit Angabe: beide dieselbe Figur. */
    const springer = einsetzen(runde, "bauernschub", -1, "id-anna", "S");
    wahr(springer !== null, "mit Wahl eingesetzt");
    gleich(SCHACH.figurAuf(springer.stand, SCHACH.feldNummer("a8")), "S", "a8 wird Springer");
    gleich(SCHACH.figurAuf(springer.stand, SCHACH.feldNummer("c8")), "S", "c8 auch");

    /* Unsinn faellt auf die Vorgabe zurueck — nie auf eine ungueltige Figur. */
    const unsinn = einsetzen(runde, "bauernschub", -1, "id-anna", "K");
    gleich(SCHACH.figurAuf(unsinn.stand, SCHACH.feldNummer("a8")), "D",
        "eine unbekannte Wahl ergibt die Dame");
});

pruefe("Der Bildschirm erfaehrt vom Modell, ob der Schub umwandelt (v0.56)", () => {
    /*
     * `schubWandeltUm` ist die Frage, die vor der Rueckfrage steht: Lohnt es
     * ueberhaupt, nach der Figur zu fragen? Sie gehoert ins Modell, weil sie
     * an freien Feldern und an der Zugrichtung haengt.
     */
    gleich(SCHACH_RUNDE.schubWandeltUm(faehigkeitenPartie(), "id-anna"), 0,
        "in der Grundstellung wandelt keiner um");

    let runde = faehigkeitenPartie();
    runde.stand = SCHACH.standNormalisieren({
        variante: "faehigkeiten",
        brett: "....k..."
            + "B.B....."
            + "........"
            + "........"
            + "........"
            + "........"
            + "........"
            + "....K...",
        amZug: "weiss",
        rochade: ""
    });

    gleich(SCHACH_RUNDE.schubWandeltUm(runde, "id-anna"), 2, "hier sind es zwei");
    gleich(SCHACH_RUNDE.schubWandeltUm(runde, "id-niemand"), 0,
        "wer in keinem Team ist, bekommt 0");
});

pruefe("Verstaerkung: jede Figur steigt eine Stufe (v0.56)", () => {
    /*
     * DIE AUFWERTUNGSKETTE (v0.56). Bis v0.55 machte sie aus einem Bauern
     * einen Springer und sonst nichts. Geprueft wird hier die ganze Kette an
     * der Grundstellung — je Figurenart ein Feld.
     */
    const bauer = einsetzen(faehigkeitenPartie(), "verstaerkung", SCHACH.feldNummer("e2"));
    gleich(SCHACH.figurAuf(bauer.stand, SCHACH.feldNummer("e2")), "S",
        "aus dem Bauern wird ein Springer");

    const springer = einsetzen(faehigkeitenPartie(), "verstaerkung", SCHACH.feldNummer("b1"));
    wahr("LT".indexOf(SCHACH.figurAuf(springer.stand, SCHACH.feldNummer("b1"))) !== -1,
        "aus dem Springer wird ein Laeufer oder ein Turm");

    const laeufer = einsetzen(faehigkeitenPartie(), "verstaerkung", SCHACH.feldNummer("c1"));
    gleich(SCHACH.figurAuf(laeufer.stand, SCHACH.feldNummer("c1")), "D",
        "aus dem Laeufer wird eine Dame");

    const turm = einsetzen(faehigkeitenPartie(), "verstaerkung", SCHACH.feldNummer("a1"));
    gleich(SCHACH.figurAuf(turm.stand, SCHACH.feldNummer("a1")), "D",
        "aus dem Turm auch");

    gleich(einsetzen(faehigkeitenPartie(), "verstaerkung", SCHACH.feldNummer("e7")),
        null, "nicht auf eine gegnerische Figur");
    gleich(einsetzen(faehigkeitenPartie(), "verstaerkung", SCHACH.feldNummer("e1")),
        null, "und nicht auf den letzten Koenig");
});

pruefe("Die Aufwertung wird gerechnet, nicht gewuerfelt (v0.56)", () => {
    /*
     * Beim Springer gibt es zwei Ergebnisse. Alle Geraete muessen dasselbe
     * rechnen, sonst gewinnt der erste Schreibvorgang — dieselbe Falle wie in
     * v0.8. Also: zweimal dieselbe Lage, zweimal dasselbe Ergebnis.
     */
    const einmal = einsetzen(faehigkeitenPartie(), "verstaerkung", SCHACH.feldNummer("b1"));
    const nochmal = einsetzen(faehigkeitenPartie(), "verstaerkung", SCHACH.feldNummer("b1"));

    gleich(SCHACH.figurAuf(nochmal.stand, SCHACH.feldNummer("b1")),
        SCHACH.figurAuf(einmal.stand, SCHACH.feldNummer("b1")),
        "zweimal dasselbe Ergebnis");

    /* Und die Tabelle selbst: beide Ergebnisse sind erreichbar. */
    gleich(SCHACH.aufwertungVon("S", 0.1).join(""), "L", "unten der Laeufer");
    gleich(SCHACH.aufwertungVon("S", 0.9).join(""), "T", "oben der Turm");
    gleich(SCHACH.aufwertungVon("D", 0).join(""), "K", "die Dame wird Koenig");
    gleich(SCHACH.aufwertungVon("K", 0).join(""), "DD", "der Koenig zwei Damen");
});

pruefe("Dame zu Koenig heisst zwei Leben, und der Weg geht zurueck (v0.56)", () => {
    /*
     * DAS OBERE ENDE DER KETTE. Ein zweiter Koenig ist kein unschlagbarer
     * Klotz, sondern ein zweites Leben — `koenigeAlsLeben` im Stand, dieselbe
     * Maschinerie wie bei der Zufallsarmee. Ohne diesen Schalter waere
     * "Schachmatt" nicht mehr eindeutig.
     */
    /*
     * DER SCHWARZE KOENIG SITZT SEIT v0.95 HINTER ZWEI EIGENEN BAUERN. Grund:
     * Beim Rueckweg (Koenig zurueck zu zwei Damen) erscheint die zweite Dame
     * auf einem Nachbarfeld von d5, und mehrere davon gaeben einem freien
     * Koenig Schach — seit dem 20.08. weist das Modell die Faehigkeit dann ab.
     * Hier geht es um die AUFWERTUNGSKETTE, nicht um die Abweisung: Hinter g7
     * und h7 ist der Koenig gedeckt und hat trotzdem Zuege.
     */
    let runde = faehigkeitenPartie();
    runde.stand = SCHACH.standNormalisieren({
        variante: "faehigkeiten",
        brett: ".......k"
            + "......bb"
            + "........"
            + "...D...."
            + "........"
            + "........"
            + "........"
            + "....K...",
        amZug: "weiss",
        rochade: ""
    });

    gleich(runde.stand.koenigeAlsLeben, false, "vorher gilt gewoehnliches Schach");

    const zweiKoenige = einsetzen(runde, "verstaerkung", SCHACH.feldNummer("d5"));
    wahr(zweiKoenige !== null, "die Dame laesst sich aufwerten");
    gleich(SCHACH.figurAuf(zweiKoenige.stand, SCHACH.feldNummer("d5")), "K",
        "auf d5 steht ein zweiter Koenig");
    gleich(zweiKoenige.stand.koenigeAlsLeben, true, "die zwei Leben sind an");
    gleich(SCHACH.koenigSchlagbarFuer(zweiKoenige.stand, "weiss"), true,
        "Weiss kennt jetzt kein Schach");
    gleich(SCHACH.koenigSchlagbarFuer(zweiKoenige.stand, "schwarz"), false,
        "Schwarz hat weiter nur einen und damit Schach und Matt");

    /*
     * Und zurueck: Wer zwei hat, tauscht einen gegen zwei Damen. Weiss muss
     * dafuer wieder am Zug sein — die Verstaerkung hat ihn ja gerade
     * abgegeben (`beendetZug`).
     */
    const nochmal = SCHACH_RUNDE.kopieren(zweiKoenige);
    nochmal.stand.amZug = "weiss";

    const zurueck = einsetzen(nochmal, "verstaerkung", SCHACH.feldNummer("d5"),
        "id-anna");
    wahr(zurueck !== null, "der zweite Koenig laesst sich eintauschen");
    gleich(SCHACH.figurAuf(zurueck.stand, SCHACH.feldNummer("d5")), "D",
        "auf seinem Feld steht eine Dame");
    gleich(SCHACH.koenigFelder(zurueck.stand, "weiss").length, 1,
        "es bleibt genau ein Koenig");
    gleich(SCHACH.koenigSchlagbarFuer(zurueck.stand, "weiss"), false,
        "und damit gelten wieder Schach und Matt");

    /* Die zweite Dame steht auf dem naechsten freien Nachbarfeld. */
    const damen = [];
    for (let feld = 0; feld < SCHACH.felderVon(zurueck.stand); feld++) {
        if (SCHACH.figurAuf(zurueck.stand, feld) === "D") {
            damen.push(feld);
        }
    }
    gleich(damen.length, 2, "zwei Damen sind es geworden");
});

pruefe("Schutzschild: die geschuetzte Figur laesst sich nicht schlagen", () => {
    /* Weisser Turm auf d5, schwarze Dame auf d8 — sie koennte schlagen. */
    let runde = faehigkeitenPartie();
    runde.stand = SCHACH.standNormalisieren({
        variante: "faehigkeiten",
        brett: "...dk..."
            + "........"
            + "........"
            + "...T...."
            + "........"
            + "........"
            + "........"
            + "....K...",
        amZug: "weiss",
        rochade: ""
    });

    let geschuetzt = einsetzen(runde, "schutzschild", SCHACH.feldNummer("d5"));
    wahr(geschuetzt !== null, "eingesetzt");
    gleich(geschuetzt.stand.schildFeld, SCHACH.feldNummer("d5"), "Schild liegt auf d5");

    /* Weiss zieht mit dem Koenig — das Schild bleibt, weil eine ANDERE Figur
       gezogen hat. Danach ist Schwarz am Zug. */
    geschuetzt = SCHACH_RUNDE.ziehen(geschuetzt, "id-anna",
        SCHACH.feldNummer("e1"), SCHACH.feldNummer("f1"), "D", "Anna", 3100);
    wahr(geschuetzt !== null, "Koenigszug erlaubt");
    gleich(geschuetzt.stand.schildFeld, SCHACH.feldNummer("d5"), "Schild haelt noch");

    /* Die Dame darf d5 nicht schlagen. */
    const ziele = SCHACH.zuege(geschuetzt.stand, SCHACH.feldNummer("d8"))
        .map((zug) => SCHACH.feldName(zug.nach));
    wahr(ziele.indexOf("d5") === -1, "d5 ist kein Ziel mehr");
    wahr(ziele.indexOf("d6") !== -1, "die Dame darf aber davor ziehen");

    gleich(einsetzen(runde, "schutzschild", SCHACH.feldNummer("e1")), null,
        "auf den Koenig wirkt es nicht");
});

pruefe("Fessel: die gefesselte Figur haelt mehrere Zuege still (v0.56)", () => {
    /*
     * BIS v0.55 GALT SIE FUER GENAU EINEN ZUG der gefesselten Seite. Seit
     * v0.56 laeuft sie nach dem TAKT ab (`SCHACH.FESSEL_HALBZUEGE`) — damit
     * unterscheidet sie sich vom Frost, der eine Flaeche fuer einen Zug
     * sperrt. Gezaehlt wird hier Halbzug fuer Halbzug nach.
     */
    let runde = einsetzen(faehigkeitenPartie(), "fessel", SCHACH.feldNummer("b8"));
    wahr(runde !== null, "eingesetzt");
    gleich(runde.stand.fesselFeld, SCHACH.feldNummer("b8"), "Fessel liegt");
    gleich(runde.stand.fesselFarbe, "schwarz", "auf Schwarz");
    gleich(runde.stand.fesselBis, runde.stand.takt + SCHACH.FESSEL_HALBZUEGE,
        "mit Frist am Takt");

    /* Weiss zieht, damit Schwarz an der Reihe ist. */
    runde = SCHACH_RUNDE.ziehen(runde, "id-anna",
        SCHACH.feldNummer("e2"), SCHACH.feldNummer("e4"), "D", "Anna", 3050);
    gleich(runde.stand.fesselFeld, SCHACH.feldNummer("b8"), "Fessel haelt noch");

    gleich(SCHACH.zuege(runde.stand, SCHACH.feldNummer("b8")).length, 0,
        "der Springer steht fest");
    wahr(SCHACH.zuege(runde.stand, SCHACH.feldNummer("g8")).length > 0,
        "der andere Springer darf");

    /* Ein Zug der gefesselten Seite loest sie NICHT mehr auf. */
    runde = SCHACH_RUNDE.ziehen(runde, "id-bert",
        SCHACH.feldNummer("g8"), SCHACH.feldNummer("f6"), "D", "Bert", 3100);
    gleich(runde.stand.fesselFeld, SCHACH.feldNummer("b8"),
        "nach einem Zug haelt sie weiter");

    /* Weiss zieht (Halbzug 3), Schwarz zieht (Halbzug 4) — dann ist sie um. */
    runde = SCHACH_RUNDE.ziehen(runde, "id-anna",
        SCHACH.feldNummer("d2"), SCHACH.feldNummer("d4"), "D", "Anna", 3150);
    gleich(runde.stand.fesselFeld, SCHACH.feldNummer("b8"), "auch nach dem dritten");
    gleich(SCHACH.zuege(runde.stand, SCHACH.feldNummer("b8")).length, 0,
        "der Springer steht immer noch fest");

    runde = SCHACH_RUNDE.ziehen(runde, "id-bert",
        SCHACH.feldNummer("f6"), SCHACH.feldNummer("g8"), "D", "Bert", 3200);
    gleich(runde.stand.fesselFeld, -1, "nach vier Halbzuegen verfallen");
    gleich(runde.stand.fesselBis, 0, "und die Frist ist weg");

    gleich(einsetzen(faehigkeitenPartie(), "fessel", SCHACH.feldNummer("e8")), null,
        "der Koenig wird nicht gefesselt");
    gleich(einsetzen(faehigkeitenPartie(), "fessel", SCHACH.feldNummer("b1")), null,
        "und keine eigene Figur");
});

pruefe("Fessel: eine gefesselte Figur bleibt schlagbar (v0.56)", () => {
    /*
     * DER UNTERSCHIED ZUM FROST, und der Grund, warum es beide gibt: Der
     * Frost macht unantastbar, die Fessel nicht. Wer festgehalten wird, kann
     * sich nicht wehren — genau darin liegt ihr Wert.
     */
    let runde = faehigkeitenPartie();
    runde.stand = SCHACH.standNormalisieren({
        variante: "faehigkeiten",
        brett: "....k..."
            + "........"
            + "...s...."
            + "........"
            + "...T...."
            + "........"
            + "........"
            + "....K...",
        amZug: "weiss",
        rochade: ""
    });

    const gefesselt = einsetzen(runde, "fessel", SCHACH.feldNummer("d6"));
    wahr(gefesselt !== null, "eingesetzt");

    const ziele = SCHACH.zuege(gefesselt.stand, SCHACH.feldNummer("d4"))
        .map((zug) => SCHACH.feldName(zug.nach));
    wahr(ziele.indexOf("d6") !== -1, "der Turm darf den gefesselten Springer schlagen");
});

pruefe("Ein Stand von vor v0.56 bekommt die alte Fessel-Frist", () => {
    /*
     * Eine angefangene Partie kennt `fesselBis` nicht. Sie darf dadurch nicht
     * laenger fesseln, als beim Einsetzen versprochen war — also traegt
     * `standNormalisieren` die alte Frist von einem Halbzug nach.
     */
    const stand = SCHACH.standNormalisieren({
        variante: "faehigkeiten",
        takt: 7,
        fesselFeld: SCHACH.feldNummer("b8"),
        fesselFarbe: "schwarz"
    });

    gleich(stand.fesselBis, 8, "eine Frist von einem Halbzug");
});

pruefe("Erdbeben reisst Risse in den Boden (v0.54)", () => {
    /*
     * BIS v0.53 WAR DAS EINE FAEHIGKEIT, die drei Reihen zur Seite schob. Auf
     * Nutzer-Ansage ist es ein Unglueckswuerfel mit anderer Wirkung geworden.
     */
    const runde = faehigkeitenPartie();
    const wirkung = SCHACH.erdbebenRisse(runde.stand, 0.42);

    wahr(wirkung !== null, "es reisst auf");
    gleich(wirkung.felder.length, SCHACH.ERDBEBEN_RISSE, "drei Felder");

    for (const feld of wirkung.felder) {
        gleich(SCHACH.figurAuf(runde.stand, feld), ".",
            "aufgerissen wird nur, wo nichts steht");
        gleich(SCHACH.rissAuf(wirkung.stand, feld), true, "und danach ist es ein Riss");
        gleich(SCHACH.gesperrt(wirkung.stand, feld), true, "also gesperrt");
    }
});

pruefe("Ein Riss bleibt die ganze Partie", () => {
    /*
     * Der Unterschied zur Mauer: Sie laeuft nach `MAUER_HALBZUEGE` ab, ein Riss
     * nie. Eine Gegen-Faehigkeit, die ihn schliesst, gibt es noch nicht.
     */
    let runde = faehigkeitenPartie();
    const wirkung = SCHACH.erdbebenRisse(runde.stand, 0.42);
    runde.stand = wirkung.stand;

    const feld = wirkung.felder[0];
    runde = springerZuege(runde, 12);

    gleich(SCHACH.rissAuf(runde.stand, feld), true,
        "nach zwoelf Halbzuegen ist er immer noch da");
    gleich(SCHACH.restzeitAuf(runde.stand, feld), 0,
        "und traegt keine Restzeit, weil er nicht ablaeuft");
});

pruefe("Durch einen Riss zieht niemand, ausser dem Springer", () => {
    let runde = faehigkeitenPartie();

    runde.stand = SCHACH.standNormalisieren({
        variante: "faehigkeiten",
        brett: "....k..."
            + "........"
            + "........"
            + "........"
            + "........"
            + "........"
            + "........"
            + "T...K..S",
        amZug: "weiss",
        rochade: "",
        risse: [SCHACH.feldNummer("c1")]
    });

    const turm = SCHACH.zuege(runde.stand, SCHACH.feldNummer("a1"))
        .map((zug) => SCHACH.feldName(zug.nach));

    wahr(turm.indexOf("b1") !== -1, "bis an den Riss geht es");
    wahr(turm.indexOf("c1") === -1, "auf den Riss nicht");
    wahr(turm.indexOf("d1") === -1, "und dahinter auch nicht");

    /* Der Springer auf h1 setzt darueber hinweg — er fragt nie nach dem Weg. */
    const springer = SCHACH.zuege(runde.stand, SCHACH.feldNummer("h1"))
        .map((zug) => SCHACH.feldName(zug.nach));
    wahr(springer.length > 0, "der Springer zieht weiterhin");
});

pruefe("Der Einsturz nimmt keine Seite mit einem Koenig (v0.54)", () => {
    /*
     * DIE ENTSCHEIDUNG DES NUTZERS: „nur zwischen den Seiten, wo kein Koenig
     * steht — steht ein Koenig unten rechts, koennen die zwei Seiten nicht
     * wegfallen, aber die anderen beiden."
     */
    const runde = faehigkeitenPartie();

    runde.stand = SCHACH.standNormalisieren({
        variante: "faehigkeiten",
        brett: "........"
            + "........"
            + "........"
            + "........"
            + "........"
            + "........"
            + "......b."
            + "......K.",
        amZug: "weiss",
        rochade: ""
    });

    /* Der weisse Koenig steht unten (Reihe 7) — „unten" faellt also aus. */
    gleich(SCHACH.schrumpfung(runde.stand, "unten"), null, "unten geht nicht");

    /* Oben steht niemand: Das geht. */
    const oben = SCHACH.schrumpfung(runde.stand, "oben");
    wahr(oben !== null, "oben geht");
    gleich(SCHACH.hoeheVon(oben.stand), 7, "eine Reihe weniger");
    gleich(SCHACH.breiteVon(oben.stand), 8, "die Breite bleibt");

    /* Und die Figuren rutschen richtig mit. */
    gleich(SCHACH.figurAuf(oben.stand, SCHACH.feldNummer("g1", 8, 7)), "K",
        "der Koenig steht weiterhin unten");
});

pruefe("Was auf der weggebrochenen Linie steht, stuerzt mit", () => {
    const runde = faehigkeitenPartie();

    runde.stand = SCHACH.standNormalisieren({
        variante: "faehigkeiten",
        brett: "b......."
            + "........"
            + "........"
            + "........"
            + "........"
            + "........"
            + "........"
            + "....K..k",
        amZug: "weiss",
        rochade: ""
    });

    /* Links steht nur der schwarze Bauer auf a8 — kein Koenig, also faellt es. */
    const links = SCHACH.schrumpfung(runde.stand, "links");
    wahr(links !== null, "links faellt weg");
    gleich(SCHACH.breiteVon(links.stand), 7, "eine Spalte weniger");

    let bauern = 0;
    for (let feld = 0; feld < SCHACH.felderVon(links.stand); feld++) {
        if (SCHACH.figurAuf(links.stand, feld) === "b") {
            bauern++;
        }
    }
    gleich(bauern, 0, "der Bauer ist mit abgestuerzt");
    wahr(links.text.indexOf("stürzen") !== -1 || links.text.indexOf("stuerzen") !== -1
        || links.text.indexOf("Figur") !== -1, "und der Verlauf sagt es");
});

pruefe("Bei einem Einsturz wandern die liegenden Wuerfel mit", () => {
    /*
     * Der Stand rechnet seine gemerkten Felder selbst um — die Wuerfel liegen
     * aber in der RUNDE. Bis v0.53 blieben sie auf ihren alten Nummern stehen
     * und lagen damit nach einer Ausdehnung woanders.
     */
    let runde = faehigkeitenPartie();

    runde.stand = SCHACH.standNormalisieren({
        variante: "faehigkeiten",
        brett: "........"
            + "........"
            + "........"
            + "........"
            + "........"
            + "........"
            + "........"
            + "....K..k",
        amZug: "weiss",
        rochade: ""
    });

    /* Ein Wuerfel auf d4 und einer ganz oben, wo es einstuerzt. */
    runde.bonus = [
        { feld: SCHACH.feldNummer("d4"), art: "", stufe: "gruen" },
        { feld: SCHACH.feldNummer("a8"), art: "", stufe: "gruen" }
    ];

    SCHACH_RUNDE._pechAusloesen(runde, "schrumpfung", "weiss", -1, "", -1);

    wahr(runde.bonus.length <= 2, "hoechstens so viele wie vorher");
    for (const eintrag of runde.bonus) {
        wahr(eintrag.feld >= 0 && eintrag.feld < SCHACH.felderVon(runde.stand),
            "jeder verbliebene Wuerfel liegt im Brett");
    }
});

pruefe("Der Friedhof weckt, wer GENAU DORT gefallen ist (v0.54)", () => {
    /*
     * DIE NEUE REGEL: Bis v0.53 nahm er die vier zuletzt gefallenen Gegner und
     * stellte sie auf ein beliebiges freies 2x2-Feld. Jetzt stehen genau die
     * auf, die in dem gewaehlten Block fielen — jeder auf seinem eigenen Feld.
     */
    let runde = faehigkeitenPartie();

    /* Zwei fielen im Block a5/b5/a4/b4, einer weit weg auf h5. */
    runde.gefallen.schwarz.push({ art: "T", feld: SCHACH.feldNummer("a5") });
    runde.gefallen.schwarz.push({ art: "S", feld: SCHACH.feldNummer("b4") });
    runde.gefallen.schwarz.push({ art: "D", feld: SCHACH.feldNummer("h5") });

    const nachher = einsetzen(runde, "friedhof", SCHACH.feldNummer("a5"));
    wahr(nachher !== null, "eingesetzt");

    gleich(SCHACH.figurAuf(nachher.stand, SCHACH.feldNummer("a5")), "T",
        "der Turm steht dort wieder, wo er fiel");
    gleich(SCHACH.figurAuf(nachher.stand, SCHACH.feldNummer("b4")), "S",
        "und der Springer auf seinem Feld");
    gleich(SCHACH.figurAuf(nachher.stand, SCHACH.feldNummer("b5")), ".",
        "auf den uebrigen Feldern des Blocks steht nichts");

    /* Die Dame lag ausserhalb — sie bleibt liegen. */
    gleich(nachher.gefallen.schwarz.length, 1, "nur die beiden sind verbraucht");
    gleich(nachher.gefallen.schwarz[0].art, "D", "die Dame liegt weiter");

    /* Und beide sind geliehen, laufen also ab. */
    gleich(SCHACH.istGeliehen(nachher.stand, SCHACH.feldNummer("a5")), true, "geliehen");
    wahr(SCHACH.restzeitAuf(nachher.stand, SCHACH.feldNummer("a5")) > 0,
        "und traegt eine Restzeit");
});

/* ------------------------------------------------------------------ *
 * Das Kreuz-Brett (seit v0.63, Wunsch #22)
 * ------------------------------------------------------------------ */

/* Eine Partie auf einem Kreuz-Brett, mit fester Kennung fuers Nachrechnen. */
function kreuzPartie(varianteId, kennung) {
    const runde = SCHACH_RUNDE.leereRunde(1000, varianteId || "kreuz",
        kennung || "p-kreuz", "Kreuz");

    return SCHACH_RUNDE.kreuzAufstellen(runde);
}

pruefe("Die vier Ecken des Kreuzes sind von Anfang an gesperrt (v0.63)", () => {
    for (const id of ["kreuzKlein", "kreuz", "kreuzGross"]) {
        const variante = SCHACH_VARIANTEN.holen(id);
        const runde = kreuzPartie(id, "p-" + id);
        const rand = SCHACH_VARIANTEN.KREUZ.rand;
        const kante = variante.breite;

        gleich(variante.breite, variante.hoehe, id + ": quadratisch");
        gleich(SCHACH.risse(runde.stand).length, 4 * rand * rand,
            id + ": vier 2-mal-2-Ecken");

        /* Die Ecken selbst — und nur sie. */
        for (const feld of SCHACH_VARIANTEN.kreuzEcken(variante)) {
            wahr(SCHACH.gesperrt(runde.stand, feld), id + ": Ecke " + feld + " gesperrt");
            gleich(SCHACH.figurAuf(runde.stand, feld), ".",
                id + ": auf der Ecke steht nichts");
        }

        /* Die Mitte ist frei begehbar. */
        const mitte = rand * kante + rand;
        wahr(!SCHACH.gesperrt(runde.stand, mitte), id + ": die Mitte ist offen");
    }
});

pruefe("Alle vier Seiten tragen eine volle Armee (v0.65)", () => {
    for (const id of ["kreuzKlein", "kreuz", "kreuzGross"]) {
        const runde = kreuzPartie(id, "p-voll-" + id);
        const kante = SCHACH.breiteVon(runde.stand);
        const rand = SCHACH_VARIANTEN.KREUZ.rand;
        const mitte = kante - 2 * rand;

        /* Zwei Armeen je Team, also zwei Koenige je Farbe — und damit zwei
           Leben, wie bei der Zufallsarmee. */
        gleich(SCHACH.koenigFelder(runde.stand, SCHACH.WEISS).length, 2,
            id + ": zwei weisse Koenige");
        gleich(SCHACH.koenigFelder(runde.stand, SCHACH.SCHWARZ).length, 2,
            id + ": zwei schwarze Koenige");
        gleich(runde.stand.koenigeAlsLeben, true, id + ": zwei Leben je Seite");

        /* Je Seite eine Grundreihe und eine Bauernreihe: 2 mal `mitte`. */
        let figuren = 0;
        let bauern = 0;
        for (let feld = 0; feld < kante * kante; feld++) {
            const figur = SCHACH.figurAuf(runde.stand, feld);
            if (figur === ".") {
                continue;
            }
            figuren++;
            if (SCHACH.artVon(figur) === "B") {
                bauern++;
            }
        }

        gleich(figuren, 4 * 2 * mitte, id + ": vier volle Armeen");
        gleich(bauern, 4 * mitte, id + ": je Armee eine Reihe Bauern");

        /* Und jeder Bauer weiss, von welcher Seite er kommt. */
        gleich(runde.stand.bauernSeiten.length, bauern,
            id + ": jeder Bauer hat seine Startseite");

        wahr(SCHACH.alleZuege(runde.stand).length > 0, id + ": es laesst sich ziehen");
    }
});

pruefe("Die Teams stehen sich gegenueber, das Paar wird gerechnet (v0.65)", () => {
    /*
     * Ein Team bekommt oben+unten, das andere links+rechts. Gewuerfelt wird
     * nicht — gerechnet, aus der Partie-Kennung.
     */
    const seitenFarben = (runde) => {
        const kante = SCHACH.breiteVon(runde.stand);
        const rand = SCHACH_VARIANTEN.KREUZ.rand;
        const quer = rand;

        return {
            oben: SCHACH.farbeVon(SCHACH.figurAuf(runde.stand, quer)),
            unten: SCHACH.farbeVon(
                SCHACH.figurAuf(runde.stand, (kante - 1) * kante + quer)),
            links: SCHACH.farbeVon(SCHACH.figurAuf(runde.stand, quer * kante)),
            rechts: SCHACH.farbeVon(
                SCHACH.figurAuf(runde.stand, quer * kante + kante - 1))
        };
    };

    /* Dieselbe Kennung ergibt dasselbe Brett. */
    gleich(JSON.stringify(seitenFarben(kreuzPartie("kreuz", "p-gleich"))),
        JSON.stringify(seitenFarben(kreuzPartie("kreuz", "p-gleich"))),
        "dieselbe Kennung, dasselbe Brett");

    const verteilungen = new Set();

    for (let nummer = 0; nummer < 40; nummer++) {
        const farben = seitenFarben(kreuzPartie("kreuz", "p-kreuz-" + nummer));

        /* Gegenueberliegende Seiten gehoeren IMMER demselben Team. */
        gleich(farben.oben, farben.unten, "oben und unten sind ein Team");
        gleich(farben.links, farben.rechts, "links und rechts sind ein Team");
        wahr(farben.oben !== farben.links, "die beiden Paare sind Gegner");

        verteilungen.add(farben.oben);
    }

    gleich(verteilungen.size, 2, "ueber viele Partien kommen beide Verteilungen vor");
});

pruefe("Das Kreuz-Duell hat eine Armee je Team, gegenueber (v0.72)", () => {
    /*
     * K3: Dieselben drei Groessen mit nur EINER Armee je Team. Die Startseite
     * wird gezogen (gerechnet aus der Kennung), Schwarz bekommt die
     * gegenueberliegende — und die beiden uebrigen Streifen bleiben leer.
     */
    for (const id of ["kreuzKleinEinzeln", "kreuzEinzeln", "kreuzGrossEinzeln"]) {
        const runde = kreuzPartie(id, "p-duell-" + id);
        const kante = SCHACH.breiteVon(runde.stand);
        const rand = SCHACH_VARIANTEN.KREUZ.rand;
        const mitte = kante - 2 * rand;

        /* Ein Koenig je Team heisst: Schach und Matt gelten von Anfang an. */
        gleich(SCHACH.koenigFelder(runde.stand, SCHACH.WEISS).length, 1,
            id + ": ein weisser Koenig");
        gleich(SCHACH.koenigFelder(runde.stand, SCHACH.SCHWARZ).length, 1,
            id + ": ein schwarzer Koenig");
        gleich(runde.stand.koenigeAlsLeben, false, id + ": keine zwei Leben");

        /* Zwei volle Armeen statt vier. */
        let figuren = 0;
        for (let feld = 0; feld < kante * kante; feld++) {
            if (SCHACH.figurAuf(runde.stand, feld) !== ".") {
                figuren++;
            }
        }
        gleich(figuren, 2 * 2 * mitte, id + ": zwei volle Armeen");

        /* Und sie stehen sich gegenueber. */
        const weiss = SCHACH.startSeitenVon(runde.stand, SCHACH.WEISS);
        const schwarz = SCHACH.startSeitenVon(runde.stand, SCHACH.SCHWARZ);

        gleich(weiss.length, 1, id + ": Weiss hat eine Seite");
        gleich(schwarz.length, 1, id + ": Schwarz hat eine Seite");
        gleich(SCHACH.SEITEN[weiss[0]].gegen, schwarz[0],
            id + ": sie stehen sich gegenueber");

        wahr(SCHACH.alleZuege(runde.stand).length > 0, id + ": es laesst sich ziehen");
    }
});

pruefe("Die gezogene Startseite ist gerechnet und streut (v0.72)", () => {
    /* Dieselbe Kennung ergibt dasselbe Brett — und ueber viele Partien kommen
       mehrere Seiten vor, sonst waere das Ziehen eine Behauptung. */
    const seiteVon = (kennung) => SCHACH.startSeitenVon(
        kreuzPartie("kreuzEinzeln", kennung).stand, SCHACH.WEISS)[0];

    gleich(seiteVon("p-gleich-duell"), seiteVon("p-gleich-duell"),
        "dieselbe Kennung, dieselbe Seite");

    const gesehen = new Set();
    for (let nummer = 0; nummer < 60; nummer++) {
        gesehen.add(seiteVon("p-duell-" + nummer));
    }

    wahr(gesehen.size >= 3, "es kommen mehrere Startseiten vor (waren "
        + gesehen.size + ")");
});

pruefe("Ein Bauer laeuft von seiner Startseite zur gegenueberliegenden (v0.65)", () => {
    const runde = kreuzPartie("kreuz", "p-lauf");
    const kante = SCHACH.breiteVon(runde.stand);
    const rand = SCHACH_VARIANTEN.KREUZ.rand;

    /* Der Bauer des LINKEN Fluegels steht in Spalte 1 und muss nach RECHTS
       ziehen — nicht nach oben, wie es die Farbregel von frueher sagen wuerde. */
    const linkerBauer = rand * kante + 1;
    gleich(SCHACH.artVon(SCHACH.figurAuf(runde.stand, linkerBauer)), "B",
        "auf Spalte 1 steht ein Bauer");
    gleich(SCHACH.bauernSeite(runde.stand, linkerBauer,
        SCHACH.farbeVon(SCHACH.figurAuf(runde.stand, linkerBauer))), "links",
    "und er kommt von links");

    const richtung = SCHACH.bauernRichtung(runde.stand, linkerBauer,
        SCHACH.farbeVon(SCHACH.figurAuf(runde.stand, linkerBauer)));
    gleich(richtung.dr + "," + richtung.ds, "0,1", "er laeuft nach rechts");

    /* Geschlagen wird schraeg nach vorn — bei einem Rechtslaeufer also oben
       und unten vor ihm, genau wie der Nutzer es beschrieben hat. */
    const schlag = SCHACH.bauernSchlagfelder(runde.stand, linkerBauer,
        SCHACH.farbeVon(SCHACH.figurAuf(runde.stand, linkerBauer)))
        .map((feld) => SCHACH.reiheVon(feld, kante) - rand).sort();

    gleich(schlag.join(","), "-1,1", "er schlaegt vor sich oben und unten");

    /* Und die Farbregel gilt weiter, wo nichts eingetragen ist. */
    const klassisch = laufendePartie();
    const weisserBauer = SCHACH.feldNummer("e2");
    gleich(SCHACH.bauernSeite(klassisch.stand, weisserBauer, "weiss"), "unten",
        "auf dem gewohnten Brett startet Weiss unten");
    gleich(SCHACH.bauernSeite(klassisch.stand, SCHACH.feldNummer("e7"), "schwarz"), "oben",
        "und Schwarz oben");
});

pruefe("Auf dem Kreuz laesst sich ziehen, ohne durch die Ecken zu kommen (v0.63)", () => {
    const runde = kreuzPartie();
    const kante = SCHACH.breiteVon(runde.stand);
    const rand = SCHACH_VARIANTEN.KREUZ.rand;

    /* Kein einziger erlaubter Zug endet in einer Ecke. */
    const ecken = SCHACH_VARIANTEN.kreuzEcken(SCHACH_VARIANTEN.holen("kreuz"));

    for (const zug of SCHACH.alleZuege(runde.stand)) {
        wahr(ecken.indexOf(zug.nach) === -1,
            "kein Zug fuehrt auf Feld " + zug.nach);
    }

    /* Der aeussere Turm des Fluegels kommt in die Mitte hinein. */
    const turmFeld = rand * kante;
    wahr(SCHACH.figurAuf(runde.stand, turmFeld) !== ".", "auf dem Fluegel steht etwas");
});

pruefe("Die Rueckschau erzaehlt, wie es ausging (v0.62, Wunsch #7)", () => {
    /*
     * Sie liest die Schlussstellung, nicht einen gemerkten Vermerk: `lage`
     * sagt Matt oder Patt, und sagt sie nichts davon, obwohl ein Ergebnis
     * feststeht, hat jemand aufgegeben.
     */
    const laufend = laufendePartie();
    gleich(SCHACH_RUNDE.rueckschau(laufend, "weiss").ausgang, "offen",
        "eine laufende Partie hat keinen Ausgang");

    /* Aufgeben: kein Matt auf dem Brett, trotzdem ein Ergebnis. */
    const aufgegeben = SCHACH_RUNDE.aufgeben(laufend, "weiss", 4000);
    const ausSichtWeiss = SCHACH_RUNDE.rueckschau(aufgegeben, "weiss");

    gleich(ausSichtWeiss.ausgang, "niederlage", "wer aufgibt, verliert");
    wahr(ausSichtWeiss.ende.indexOf("Aufgegeben") === 0, "und die Rueckschau sagt es");
    gleich(SCHACH_RUNDE.rueckschau(aufgegeben, "schwarz").ausgang, "sieg",
        "aus der anderen Sicht ein Sieg");

    /* Wendepunkte sind Faehigkeiten und Unglueckswuerfel — keine gewoehnlichen
       Zuege. */
    let mitWirkung = einsetzen(faehigkeitenPartie(), "mauer", SCHACH.feldNummer("d4"));
    wahr(mitWirkung !== null, "Mauer eingesetzt");
    mitWirkung = SCHACH_RUNDE.ziehen(mitWirkung, "id-anna",
        SCHACH.feldNummer("a2"), SCHACH.feldNummer("a3"), "D", "Anna", 4100);

    const schau = SCHACH_RUNDE.rueckschau(mitWirkung, "weiss");
    gleich(schau.wendepunkte.length, 1, "genau ein Wendepunkt");
    wahr(schau.wendepunkte[0].text.indexOf("Mauer") !== -1, "und zwar die Mauer");
    gleich(schau.wendepunkte[0].eigen, true, "sie war die eigene");
    gleich(schau.wendepunkte[0].unglueck, false, "und kein Unglueck");

    /* Ein Unglueckswuerfel wird als solcher gekennzeichnet. */
    const mitPech = pechEinsammeln(faehigkeitenPartie(), "erdrutsch", "e2", "e4");
    const pechSchau = SCHACH_RUNDE.rueckschau(mitPech, "weiss");
    wahr(pechSchau.wendepunkte.some((punkt) => punkt.unglueck),
        "der Unglueckswuerfel steht drin");

    /* Und nie mehr als die Hoechstzahl. */
    let viele = faehigkeitenPartie();
    for (let nummer = 0; nummer < SCHACH_RUNDE.RUECKSCHAU_HOECHSTENS + 3; nummer++) {
        viele.verlauf.push({
            text: "Faehigkeit " + nummer, wer: "", farbe: "weiss",
            von: -1, nach: -1, wirkung: "mauer", felder: [], wege: []
        });
    }
    gleich(SCHACH_RUNDE.rueckschau(viele, "weiss").wendepunkte.length,
        SCHACH_RUNDE.RUECKSCHAU_HOECHSTENS, "hoechstens die vorgesehene Zahl");
});

pruefe("Die Rueckschau zaehlt das Material beider Seiten (v0.62)", () => {
    let runde = faehigkeitenPartie();

    /* Schwarz schlaegt nichts, Weiss verliert einen Springer. */
    runde = SCHACH_RUNDE.kopieren(runde);
    runde.verloren.weiss.push("S");

    const schau = SCHACH_RUNDE.rueckschau(runde, "weiss");

    gleich(schau.verloren.eigen.join(","), "S", "der eigene Verlust steht da");
    gleich(schau.wert.eigen, SCHACH_RUNDE.FIGUR_WERT.S, "mit seinem Figurenwert");
    gleich(schau.wert.gegner, 0, "der Gegner hat nichts gelassen");
});

pruefe("Nachschub setzt einen Bauern auf die eigene Grundreihe (v0.61, Wunsch #15)", () => {
    const runde = faehigkeitenPartie();

    /* Die Grundstellung ist voll — ohne freies Feld gibt es kein Ziel. */
    gleich(SCHACH_RUNDE.zielFelder(runde, "id-anna", "nachschub").length, 0,
        "auf einer vollen Grundreihe geht es nicht");

    /* b1 raeumen: genau dieses eine Feld steht dann zur Wahl. */
    const b1 = SCHACH.feldNummer("b1");
    const frei = SCHACH_RUNDE.kopieren(runde);
    frei.stand.brett = SCHACH._brettMit(frei.stand.brett, b1, ".");

    const felder = SCHACH_RUNDE.zielFelder(frei, "id-anna", "nachschub");
    gleich(felder.join(","), String(b1), "nur das freie Feld der eigenen Grundreihe");

    /* Ein freies Feld MITTEN auf dem Brett zaehlt nicht — es geht um die
       Grundreihe, nicht um irgendein leeres Feld. */
    const mitte = SCHACH_RUNDE.kopieren(frei);
    mitte.stand.brett = SCHACH._brettMit(mitte.stand.brett, SCHACH.feldNummer("d4"), ".");
    gleich(SCHACH_RUNDE.zielFelder(mitte, "id-anna", "nachschub").join(","), String(b1),
        "die Brettmitte steht nicht zur Wahl");

    const nachher = einsetzen(frei, "nachschub", b1);
    wahr(nachher !== null, "eingesetzt");
    gleich(SCHACH.figurAuf(nachher.stand, b1), "B", "ein weisser Bauer steht dort");
    gleich(nachher.stand.amZug, "schwarz", "und der Zug ist abgegeben");

    /* Fuer Schwarz ist die eigene Grundreihe die OBERE. */
    const schwarzDran = SCHACH_RUNDE.kopieren(runde);
    schwarzDran.stand.amZug = "schwarz";
    schwarzDran.stand.brett = SCHACH._brettMit(schwarzDran.stand.brett,
        SCHACH.feldNummer("b8"), ".");

    gleich(SCHACH_RUNDE.zielFelder(schwarzDran, "id-bert", "nachschub").join(","),
        String(SCHACH.feldNummer("b8")), "Schwarz bekommt seine eigene Grundreihe");
});

pruefe("Die Mauer frisst die Lootbox darunter (v0.77) — kehrt v0.66 um", () => {
    /*
     * BIS v0.76 (Wunsch #32) war ein Feld mit Lootbox als Mauer-Ziel GESPERRT:
     * Unter der Mauer waere die Box unerreichbar und unsichtbar gewesen, „von
     * aussen dasselbe wie weg".
     *
     * SEIT v0.77 ist es umgekehrt (Nutzer-Ansage 18.08.): Die Mauer darf
     * ueberall hin, wo es von den Figuren und vom Brettrand her geht, und eine
     * Lootbox darunter wird gefressen — sie ist danach wirklich weg. Aus dem
     * „dasselbe wie weg" ist ein ehrliches Weg geworden.
     */
    const runde = faehigkeitenPartie();
    const mitte = SCHACH.feldNummer("d4");
    const wuerfelFeld = SCHACH.feldNummer("c4");

    const ohneWuerfel = SCHACH_RUNDE.zielFelder(runde, "id-anna", "mauer");
    wahr(ohneWuerfel.indexOf(mitte) !== -1, "ohne Lootbox steht d4 zur Wahl");

    /* Eine Lootbox auf c4 — sie liegt im Riegel um d4 (c4, d4, e4). */
    const mitWuerfel = SCHACH_RUNDE.kopieren(runde);
    mitWuerfel.bonus.push({ feld: wuerfelFeld, art: "sprung" });

    const felder = SCHACH_RUNDE.zielFelder(mitWuerfel, "id-anna", "mauer");
    wahr(felder.indexOf(mitte) !== -1, "mit Lootbox im Riegel steht d4 WEITER zur Wahl");

    /* Das Ausprobieren in `zielFelder` laeuft auf Kopien: Die echte Partie
       darf dabei keine Box verlieren. */
    gleich(mitWuerfel.bonus.length, 1, "beim blossen Anbieten wird nichts gefressen");

    /* Und jetzt wirklich legen. */
    const gelegt = einsetzen(mitWuerfel, "mauer", mitte);

    wahr(gelegt !== null, "die Mauer laesst sich legen");
    gleich(gelegt.bonus.length, 0, "die Lootbox darunter ist gefressen");
    wahr(SCHACH.mauerAuf(gelegt.stand, wuerfelFeld), "und die Mauer steht auf ihrem Feld");

    /* Im Verlauf steht, dass etwas gefressen wurde — sonst verschwindet eine
       Box wortlos, und genau das war die Meldung von v0.66. */
    const letzter = gelegt.verlauf[gelegt.verlauf.length - 1];
    wahr(letzter.text.indexOf("frisst") !== -1,
        "der Verlauf nennt es: " + letzter.text);
});

pruefe("Eine Mauer ohne Lootbox darunter frisst nichts (v0.77)", () => {
    /*
     * Die Gegenprobe zum Test darueber: Der Verlaufstext bekommt seinen Zusatz
     * nur, wenn wirklich etwas gefressen wurde. Sonst stuende bei jeder Mauer
     * „frisst 0 Lootboxen".
     */
    const gelegt = einsetzen(faehigkeitenPartie(), "mauer", SCHACH.feldNummer("d4"));

    wahr(gelegt !== null, "gelegt");
    const letzter = gelegt.verlauf[gelegt.verlauf.length - 1];
    gleich(letzter.text.indexOf("frisst"), -1,
        "kein Zusatz im Verlauf: " + letzter.text);
});

pruefe("Die Mauer laesst sich senkrecht legen (v0.80)", () => {
    /*
     * NUTZER-WUNSCH 18.08.: „Ein Dreh-Knopf bei der Mauer, dass man sie auch
     * vertikal platzieren kann."
     *
     * Die Richtung steht NICHT im gespeicherten Stand: `stand.mauern` ist eine
     * Feldliste, und ob die drei Felder neben- oder uebereinander liegen, sieht
     * man ihnen an. Gebraucht wird sie nur beim Platzieren — und muss deshalb
     * durch die ganze Kette gereicht werden.
     */
    const runde = faehigkeitenPartie();
    const mitte = SCHACH.feldNummer("d4");
    const breite = SCHACH.breiteVon(runde.stand);

    /* Waagerecht: c4, d4, e4 — eine Reihe. */
    const quer = SCHACH.mauerLegen(runde.stand, mitte);
    wahr(quer !== null, "waagerecht geht");
    gleich(quer.felder.map((f) => SCHACH.feldName(f)).sort().join(","), "c4,d4,e4",
        "drei Felder nebeneinander");

    /* Senkrecht: d3, d4, d5 — eine Spalte. */
    const hoch = SCHACH.mauerLegen(runde.stand, mitte, true);
    wahr(hoch !== null, "senkrecht geht auch");
    gleich(hoch.felder.map((f) => SCHACH.feldName(f)).sort().join(","), "d3,d4,d5",
        "drei Felder uebereinander");

    /* Die Felder liegen wirklich in EINER Spalte. */
    const spalten = hoch.felder
        .map((f) => SCHACH.spalteVon(f, breite))
        .filter((s, stelle, alle) => alle.indexOf(s) === stelle);
    gleich(spalten.length, 1, "alle in derselben Spalte");
});

pruefe("Senkrecht gilt der Rand fuer die andere Achse (v0.80)", () => {
    /*
     * Waagerecht geht die Mauer am linken und rechten Rand nicht — dort fehlt
     * der Nachbar, den sie auf einer Seite braucht. Senkrecht muss dasselbe
     * fuer OBEN und UNTEN gelten, sonst ragt sie aus dem Brett.
     */
    const runde = faehigkeitenPartie();
    const breite = SCHACH.breiteVon(runde.stand);
    const hoehe = SCHACH.hoeheVon(runde.stand);

    /* Ein leeres Brett, damit nur der Rand entscheidet und keine Figur. */
    const leer = SCHACH.standNormalisieren({
        variante: "faehigkeiten",
        brett: runde.stand.brett.split("").map(() => ".").join(""),
        amZug: "weiss",
        rochade: ""
    });

    const feld = (reihe, spalte) => reihe * breite + spalte;

    /* Oberste und unterste Reihe: senkrecht unmoeglich, waagerecht moeglich. */
    gleich(SCHACH.mauerLegen(leer, feld(0, 3), true), null, "in der obersten Reihe nicht");
    gleich(SCHACH.mauerLegen(leer, feld(hoehe - 1, 3), true), null,
        "in der untersten auch nicht");
    wahr(SCHACH.mauerLegen(leer, feld(0, 3)) !== null, "waagerecht geht dort sehr wohl");

    /* Und umgekehrt: ganz links geht waagerecht nicht, senkrecht schon. */
    gleich(SCHACH.mauerLegen(leer, feld(3, 0)), null, "ganz links waagerecht nicht");
    wahr(SCHACH.mauerLegen(leer, feld(3, 0), true) !== null,
        "senkrecht am linken Rand aber schon");
});

pruefe("Die Lage reicht bis in die Zielfelder und in den Einsatz (v0.80)", () => {
    /*
     * DER PUNKT, AN DEM ES SONST AUSEINANDERLAEUFT: `zielFelder` probiert jedes
     * Feld gegen `_zielWirkung` durch. Kennt es die Lage nicht, bietet es die
     * waagerechten Plaetze an, waehrend der Vorschau-Kasten die senkrechte
     * Mauer zeigt — man tippt dann auf ein Feld, das gar nicht gemeint war.
     */
    const runde = faehigkeitenPartie();
    const hoehe = SCHACH.hoeheVon(runde.stand);
    const breite = SCHACH.breiteVon(runde.stand);

    const querFelder = SCHACH_RUNDE.zielFelder(runde, "id-anna", "mauer");
    const hochFelder = SCHACH_RUNDE.zielFelder(runde, "id-anna", "mauer", "senkrecht");

    wahr(querFelder.length > 0, "waagerecht gibt es Plaetze");
    wahr(hochFelder.length > 0, "senkrecht auch");
    wahr(querFelder.join(",") !== hochFelder.join(","),
        "und es sind nicht dieselben");

    /* In der Grundstellung sind die Reihen 3 bis 6 frei. Senkrecht braucht es
       drei freie Reihen uebereinander — die Randreihen fallen weg. */
    for (const feld of hochFelder) {
        const reihe = SCHACH.reiheVon(feld, breite);
        wahr(reihe > 0 && reihe < hoehe - 1,
            "kein senkrechter Platz in der aeussersten Reihe");
    }

    /* Der Umriss zeigt dasselbe, was danach passiert — beide Male. */
    const platz = hochFelder[0];
    const umriss = SCHACH_RUNDE.zielUmriss(runde, "id-anna", "mauer", platz, "senkrecht");
    gleich(umriss.length, SCHACH.MAUER_LAENGE, "der Umriss ist so lang wie die Mauer");

    const spalten = umriss
        .map((f) => SCHACH.spalteVon(f, breite))
        .filter((s, stelle, alle) => alle.indexOf(s) === stelle);
    gleich(spalten.length, 1, "und er steht senkrecht");

    /* Und eingesetzt kommt genau diese Mauer heraus. */
    const vorbereitet = SCHACH_RUNDE.kopieren(runde);
    vorbereitet.faehigkeiten.weiss.push("mauer");

    const gelegt = SCHACH_RUNDE.faehigkeitEinsetzen(vorbereitet, "id-anna", "mauer",
        platz, "Anna", 3000, undefined, "senkrecht");

    wahr(gelegt !== null, "senkrecht eingesetzt");
    for (const f of umriss) {
        wahr(SCHACH.mauerAuf(gelegt.stand, f),
            "die Mauer steht auf " + SCHACH.feldName(f));
    }
});

pruefe("Auch die Abstimmung traegt die Lage der Mauer (v0.80)", () => {
    /*
     * Sonst stimmt das Team ueber eine waagerechte Mauer ab und bekommt eine
     * senkrechte. Der Vorschlag speichert die Wahl deshalb mit — genau wie die
     * Umwandlung beim Bauernschub.
     */
    let runde = faehigkeitenPartie();
    runde.teams.weiss.push("id-clara");
    runde.regeln.einigkeit = true;
    runde.faehigkeiten.weiss.push("mauer");

    const platz = SCHACH_RUNDE.zielFelder(runde, "id-anna", "mauer", "senkrecht")[0];

    const vorgeschlagen = SCHACH_RUNDE.faehigkeitVorschlagen(runde, "id-anna", "mauer",
        platz, "Anna", 3000, undefined, "senkrecht");

    wahr(vorgeschlagen !== null, "vorgeschlagen");
    wahr(vorgeschlagen.vorschlag !== null, "es wird wirklich abgestimmt");
    gleich(vorgeschlagen.vorschlag.wahl, "senkrecht", "die Lage steht im Vorschlag");

    /* Nach dem Speichern und Laden ist sie noch da. */
    const geladen = SCHACH_RUNDE.normalisieren(
        JSON.parse(JSON.stringify(vorgeschlagen)));
    gleich(geladen.vorschlag.wahl, "senkrecht", "und ueberlebt das Laden");

    /* Und wenn der zweite zustimmt, entsteht die SENKRECHTE Mauer. */
    const fertig = SCHACH_RUNDE.zugMittragen(geladen, "id-clara", 3100);
    wahr(fertig !== null, "mitgetragen");
    gleich(fertig.vorschlag, null, "der Vorschlag ist abgearbeitet");

    /* Seit v0.85 traegt jedes Mauerfeld seinen eigenen Eintrag (Frist je
       Feld) — gezaehlt werden deshalb die Felder. */
    const gelegt = SCHACH.mauern(fertig.stand)
        .reduce((alle, eintrag) => alle.concat(eintrag.felder), []);
    gleich(gelegt.length, SCHACH.MAUER_LAENGE, "eine Mauer steht");

    const breite = SCHACH.breiteVon(fertig.stand);
    const spalten = gelegt
        .map((f) => SCHACH.spalteVon(f, breite))
        .filter((s, stelle, alle) => alle.indexOf(s) === stelle);
    gleich(spalten.length, 1, "und sie steht senkrecht");
});

pruefe("Ohne Gefallene laesst sich gar nicht erst einsetzen (v0.59, Wunsch #19)", () => {
    /*
     * Drei Faehigkeiten holen Gefallene zurueck und VERBRAUCHEN dabei ihren
     * Eintrag. Ist die Liste leer, kommt nichts mehr — bis v0.58 liess sich
     * die Faehigkeit trotzdem antippen, das Brett zeigte kein einziges
     * Zielfeld, und man stand ohne Erklaerung da.
     */
    const leer = faehigkeitenPartie();
    leer.faehigkeiten.weiss.push("friedhof", "wiederbelebung", "wiedergeburt");

    gleich(SCHACH_RUNDE.darfEinsetzen(leer, "id-anna", "friedhof"), false,
        "Friedhof: kein gefallener Gegner");
    gleich(SCHACH_RUNDE.darfEinsetzen(leer, "id-anna", "wiederbelebung"), false,
        "Wiederbelebung: keine eigenen Gefallenen");
    gleich(SCHACH_RUNDE.darfEinsetzen(leer, "id-anna", "wiedergeburt"), false,
        "Wiedergeburt: nichts verloren");

    /* Alle anderen haengen an keinem Vorrat und bleiben unberuehrt. */
    gleich(SCHACH_RUNDE.darfEinsetzen(leer, "id-anna", "mauer"), true,
        "die Mauer geht weiterhin");

    /* Sobald etwas faellt, geht es wieder — und nur die passende Faehigkeit. */
    const mitGefallenem = SCHACH_RUNDE.kopieren(leer);
    mitGefallenem.gefallen.schwarz.push({ art: "T", feld: SCHACH.feldNummer("a5") });

    gleich(SCHACH_RUNDE.darfEinsetzen(mitGefallenem, "id-anna", "friedhof"), true,
        "jetzt gibt der Friedhof etwas her");
    gleich(SCHACH_RUNDE.darfEinsetzen(mitGefallenem, "id-anna", "wiederbelebung"), false,
        "die eigenen Gefallenen sind davon unberuehrt");
});

pruefe("Ein Block ohne Gefallene steht nicht zur Wahl", () => {
    /*
     * Weil `zielFelder` jedes Feld durchprobiert, folgt das von selbst aus der
     * Regel — genau deshalb steht die Regel an EINER Stelle.
     */
    let runde = faehigkeitenPartie();
    runde.faehigkeiten.weiss.push("friedhof");
    runde.gefallen.schwarz.push({ art: "T", feld: SCHACH.feldNummer("a5") });

    const moeglich = SCHACH_RUNDE.zielFelder(runde, "id-anna", "friedhof");

    wahr(moeglich.length > 0, "es gibt eine Wahl");
    wahr(moeglich.indexOf(SCHACH.feldNummer("a5")) !== -1,
        "der Block um den Gefallenen steht zur Wahl");

    /* Ein leerer Winkel des Bretts dagegen nicht. */
    wahr(moeglich.indexOf(SCHACH.feldNummer("g5")) === -1,
        "ein Block ohne Gefallene nicht");
});

pruefe("Wiedergeburt: die zuletzt verlorene Figur kehrt zurueck", () => {
    let runde = faehigkeitenPartie();

    /* Schwarz schlaegt einen weissen Bauern: 1. e4 d5 2. exd5? Nein —
       einfacher von Hand. */
    runde.verloren.weiss.push("T");

    const zurueck = einsetzen(runde, "wiedergeburt", SCHACH.feldNummer("b1"));
    gleich(zurueck, null, "nicht auf ein besetztes Feld");

    /* Platz auf der Grundreihe schaffen. */
    let frei = SCHACH_RUNDE.kopieren(runde);
    frei.stand.brett = SCHACH._brettMit(frei.stand.brett, SCHACH.feldNummer("b1"), ".");
    frei.verloren.weiss.push("T");

    const gelungen = einsetzen(frei, "wiedergeburt", SCHACH.feldNummer("b1"));
    wahr(gelungen !== null, "eingesetzt");
    gleich(SCHACH.figurAuf(gelungen.stand, SCHACH.feldNummer("b1")), "T", "Turm steht wieder da");
    gleich(gelungen.verloren.weiss.length, 1, "einer weniger im Verlust");
});

pruefe("Wiedergeburt geht nur auf der eigenen Grundreihe und nur mit Verlust", () => {
    let runde = faehigkeitenPartie();
    runde.stand = SCHACH._brettMit ? runde.stand : runde.stand;

    gleich(einsetzen(runde, "wiedergeburt", SCHACH.feldNummer("e4")), null,
        "ohne verlorene Figur geht nichts");

    let mitVerlust = SCHACH_RUNDE.kopieren(runde);
    mitVerlust.verloren.weiss.push("D");
    gleich(einsetzen(mitVerlust, "wiedergeburt", SCHACH.feldNummer("e4")), null,
        "nicht mitten auf dem Brett");
});

/* ------------------------------------------------------------------ *
 * Wiederbelebung (seit v3.3): zurueck an den Ort des Falls
 * ------------------------------------------------------------------ */

pruefe("Wiederbelebung holt die Figur genau an ihr Grab", () => {
    let runde = faehigkeitenPartie();

    /* Ein weisser Springer ist auf e4 gefallen. */
    const grab = SCHACH.feldNummer("e4");
    runde.gefallen.weiss.push({ art: "S", feld: grab });

    const gelungen = einsetzen(runde, "wiederbelebung", grab);

    wahr(gelungen !== null, "eingesetzt");
    gleich(SCHACH.figurAuf(gelungen.stand, grab), "S", "der Springer steht wieder da");
    gleich(gelungen.gefallen.weiss.length, 0, "der Eintrag ist verbraucht");
});

pruefe("Wiederbelebung geht nur auf das eigene Grab", () => {
    let runde = faehigkeitenPartie();
    const grab = SCHACH.feldNummer("e4");

    gleich(einsetzen(runde, "wiederbelebung", grab), null,
        "ohne gefallene Figur geht nichts");

    /* Ein Feld, auf dem NICHTS gefallen ist. */
    let mitGrab = SCHACH_RUNDE.kopieren(runde);
    mitGrab.gefallen.weiss.push({ art: "D", feld: grab });
    gleich(einsetzen(mitGrab, "wiederbelebung", SCHACH.feldNummer("d4")), null,
        "nicht auf ein beliebiges Feld");

    /* Das Grab eines GEGNERS zaehlt nicht. */
    let fremdesGrab = SCHACH_RUNDE.kopieren(runde);
    fremdesGrab.gefallen.schwarz.push({ art: "D", feld: grab });
    gleich(einsetzen(fremdesGrab, "wiederbelebung", grab), null,
        "kein fremdes Grab");
});

pruefe("Wiederbelebung geht nicht auf ein besetztes Grab", () => {
    let runde = faehigkeitenPartie();

    /* b1 ist besetzt (Springer in der Grundstellung). */
    const besetzt = SCHACH.feldNummer("b1");
    runde.gefallen.weiss.push({ art: "T", feld: besetzt });

    gleich(einsetzen(runde, "wiederbelebung", besetzt), null,
        "dort steht schon jemand");
});

pruefe("Wiederbelebung kostet den ganzen Zug", () => {
    let runde = faehigkeitenPartie();
    const grab = SCHACH.feldNummer("e4");
    runde.gefallen.weiss.push({ art: "S", feld: grab });

    const nachher = einsetzen(runde, "wiederbelebung", grab);
    gleich(nachher.stand.amZug, "schwarz", "der Gegner ist dran");

    /* Zum Vergleich: Was nur die Stellung aendert, laesst einen am Zug. */
    let andere = faehigkeitenPartie();
    gleich(einsetzen(andere, "mauer", SCHACH.feldNummer("d4")).stand.amZug, "weiss",
        "die Mauer nicht");
});

pruefe("Wer Material oder einen Angriff bekommt, gibt den Zug ab", () => {
    /*
     * DIE REGEL VON v0.47 (siehe Kopf von SCHACH_VARIANTEN.FAEHIGKEITEN):
     * `beendetZug` haengt nicht an der Stufe, sondern daran, WAS die
     * Faehigkeit einbringt. Dieser Test haelt die Einteilung fest — kommt eine
     * neue Faehigkeit dazu, muss jemand sie hier einordnen.
     */
    /*
     * DER BAUERNSCHUB STEHT SEIT v0.56 HIER, obwohl er nur die Stellung
     * aendert. Das ist der zweite Teil derselben Regel: Wird eine Faehigkeit
     * zu stark, nimmt man ihr das Pluszeichen. Er schiebt bis zu acht Figuren,
     * und mit dem Zug obendrauf konnte man erst schieben und dann mit einem
     * der geschobenen Bauern schlagen.
     */
    /* `nachschub` (v0.61) steht hier, weil er MATERIAL schenkt — einen neuen
       Bauern. Der Nutzer hat es ohnehin so gewuenscht; hier faellt beides
       zusammen. */
    /* `dieb` (v0.85) gehoert hierher, weil er MATERIAL nimmt — Faehigkeiten
       sind Material. Dieselbe Einordnung wie beim Haendler, der Material
       tauscht. */
    const kostetDenZug = ["bauernschub", "verstaerkung", "spiegel",
        "wiedergeburt", "wiederbelebung", "friedhof", "haendler", "nachschub",
        "dieb",
        /* `platztausch` seit v0.101 (Wunsch W7): Er versetzt jetzt auch
           GEGNERISCHE Figuren - damit greift er in die fremde Stellung ein und
           kostet den Zug. Dritter Fall der Regel „zu stark heisst Plus weg". */
        "platztausch",
        /* Seit v0.80: zweiter Anwendungsfall von „zu stark heisst Plus weg,
           nicht Stufe verschieben" (v0.47), nach dem Bauernschub in v0.56. */
        "nudelholz"];
    /* Das Erdbeben steht seit v0.54 bei den Unglueckswuerfeln. */
    const behaeltDenZug = ["ausweichen", "schutzschild",
        "mauer", "fessel", "frost", "doppelzug",
        /* Die zwei gewoehnlichen von v0.79: rein positionell, kein Material
           und keine geschlagene Figur - genau die Bedingung dieser Gruppe. */
        "schubs",
        /* `enttarnen` (v0.88) nimmt kein Material und bewegt nichts — es
           aendert nur, was EINE Seite sieht. Dieselbe Einordnung wie die
           Halluzination, waere sie eine Faehigkeit. */
        "enttarnen",
        /* `verstecken` (v0.98) ist sein Gegenstueck und aendert genauso wenig
           am Brett — nur eben den Blick der ANDEREN Seite. */
        "verstecken"];

    /* Die dritte Gruppe seit v0.48: Die Faehigkeit IST der Zug. Man bleibt am
       Zug, macht ihn sofort — und kann sonst nichts mehr. */
    const istDerZug = ["sprung", "teleport"];

    for (const art of kostetDenZug) {
        gleich(SCHACH_VARIANTEN.FAEHIGKEITEN[art].beendetZug, true,
            art + " kostet den Zug");
    }
    for (const art of behaeltDenZug) {
        wahr(!SCHACH_VARIANTEN.FAEHIGKEITEN[art].beendetZug
            && !SCHACH_VARIANTEN.FAEHIGKEITEN[art].istDerZug,
            art + " behaelt den Zug");
    }
    for (const art of istDerZug) {
        gleich(SCHACH_VARIANTEN.FAEHIGKEITEN[art].istDerZug, true,
            art + " ist der Zug");
        wahr(!SCHACH_VARIANTEN.FAEHIGKEITEN[art].beendetZug,
            art + " gibt den Zug NICHT ab");
    }

    /* Und keine ist vergessen worden. */
    gleich(kostetDenZug.length + behaeltDenZug.length + istDerZug.length,
        Object.keys(SCHACH_VARIANTEN.FAEHIGKEITEN).length,
        "jede Faehigkeit ist eingeordnet");
});

pruefe("Sprung und Teleport sind der Zug selbst (v0.48)", () => {
    /*
     * DER PUNKT AUS DEM EINGANGSKORB: „einsetzen bedeutet, dass man einsetzen
     * drueckt, dann den besonderen Move macht, und dann ist der Zug vorbei."
     *
     * Also: Man bleibt am Zug (v0.47 gab ihn ab), darf aber NUR noch nach dem
     * Muster ziehen — ein normaler Zug waere ein geschenkter.
     */
    for (const art of ["sprung", "teleport"]) {
        const runde = einsetzen(faehigkeitenPartie(), art, -1);

        wahr(runde !== null, art + " laesst sich einsetzen");
        gleich(runde.stand.amZug, "weiss", art + ": Weiss bleibt am Zug");
        gleich(runde.stand.zusatzNurDieses, true, art + ": nur noch dieses Muster");
        gleich(SCHACH_RUNDE.behaeltZug(runde, "weiss", art), false,
            art + ": kein Pluszeichen");
    }
});

pruefe("Wer nur noch springen darf, zieht auch nur so", () => {
    const runde = einsetzen(faehigkeitenPartie(), "sprung", -1);

    /* Der Bauer vor dem Koenig kann normal zwei Felder — jetzt nicht mehr. */
    const zuege = SCHACH.zuege(runde.stand, SCHACH.feldNummer("e2"));
    for (const zug of zuege) {
        wahr(SCHACH.feldName(zug.nach) !== "e3" && SCHACH.feldName(zug.nach) !== "e4",
            "kein gewoehnlicher Bauernzug mehr (" + SCHACH.feldName(zug.nach) + ")");
    }

    /* Der Turm in der Ecke dagegen springt jetzt wie ein Springer. */
    const turm = SCHACH.zuege(runde.stand, SCHACH.feldNummer("a1"))
        .map((zug) => SCHACH.feldName(zug.nach));
    wahr(turm.indexOf("b3") !== -1, "der Turm darf nach b3 springen");

    /* Und der Sprung ist danach verbraucht. */
    const danach = SCHACH_RUNDE.ziehen(runde, "id-anna",
        SCHACH.feldNummer("a1"), SCHACH.feldNummer("b3"), "D", "Anna", 3100);
    gleich(danach.stand.amZug, "schwarz", "danach ist der Gegner dran");
    gleich(danach.stand.zusatzMuster, "", "Muster verbraucht");
    gleich(danach.stand.zusatzNurDieses, false, "und die Einschraenkung mit ihm");
});

pruefe("Der Doppelzug geht der Wiederbelebung vor", () => {
    let runde = faehigkeitenPartie();
    const grab = SCHACH.feldNummer("e4");
    runde.gefallen.weiss.push({ art: "S", feld: grab });
    runde.stand.extraZug = "weiss";

    const nachher = einsetzen(runde, "wiederbelebung", grab);

    gleich(nachher.stand.amZug, "weiss", "Weiss bleibt am Zug");
    gleich(nachher.stand.extraZug, "", "dafuer ist der Doppelzug aufgebraucht");
});

pruefe("Wer geschlagen wird, kommt mit seinem Feld in die Grabliste", () => {
    let runde = faehigkeitenPartie();

    /* 1. e4 d5 2. exd5 - Weiss schlaegt auf d5. */
    runde = SCHACH_RUNDE.ziehen(runde, "id-anna",
        SCHACH.feldNummer("e2"), SCHACH.feldNummer("e4"), "", "Anna");
    runde = SCHACH_RUNDE.ziehen(runde, "id-bert",
        SCHACH.feldNummer("d7"), SCHACH.feldNummer("d5"), "", "Bert");
    runde = SCHACH_RUNDE.ziehen(runde, "id-anna",
        SCHACH.feldNummer("e4"), SCHACH.feldNummer("d5"), "", "Anna");

    gleich(runde.gefallen.schwarz.length, 1, "ein schwarzer Stein ist gefallen");
    gleich(runde.gefallen.schwarz[0].art, "B", "ein Bauer");
    gleich(runde.gefallen.schwarz[0].feld, SCHACH.feldNummer("d5"), "auf d5");

    /* Die alte Liste bleibt unveraendert - sie traegt weiter nur die Art. */
    gleich(runde.verloren.schwarz.join(","), "B", "verloren unveraendert");
});

pruefe("Die Grabliste ueberlebt das Speichern", () => {
    let runde = faehigkeitenPartie();
    runde.gefallen.weiss.push({ art: "T", feld: SCHACH.feldNummer("h5") });

    const zurueck = SCHACH_RUNDE.normalisieren(JSON.parse(JSON.stringify(runde)));

    gleich(zurueck.gefallen.weiss.length, 1, "ein Eintrag");
    gleich(zurueck.gefallen.weiss[0].feld, SCHACH.feldNummer("h5"), "mit seinem Feld");
});

/* ------------------------------------------------------------------ *
 * Haendler (seit v3.3)
 * ------------------------------------------------------------------ */

pruefe("Jedes Angebot des Haendlers ist ungefaehr gleichwertig", () => {
    /*
     * Seit v0.58 kann eine Seite MEHRERE Figurenarten tragen, deshalb wird
     * ueber die Liste summiert.
     *
     * DAS KOENIGS-ANGEBOT IST DIE AUSNAHME und steht deshalb ausdruecklich
     * hier: Ein zweiter Koenig hat keinen Materialwert (FIGUR_WERT K = 0),
     * sondern ist ein zweites LEBEN. Nach Figurenwerten waere der Tausch ein
     * reines Verlustgeschaeft; er wird trotzdem angenommen, wenn man die
     * Sicherheit braucht. Dafuer kommt er mit einem Zehntel des Gewichts.
     */
    const wert = (seite) => SCHACH_VARIANTEN.handelSeite(seite)
        .reduce((summe, teil) =>
            summe + (SCHACH_RUNDE.FIGUR_WERT[teil.art] || 0) * teil.anzahl, 0);

    const namen = (seite) => SCHACH_VARIANTEN.handelSeite(seite)
        .map((teil) => teil.anzahl + " " + teil.art).join(" und ");

    let koenigsAngebote = 0;

    for (const angebot of SCHACH_VARIANTEN.HANDEL) {
        const bringtKoenig = SCHACH_VARIANTEN.handelSeite(angebot.bekommt)
            .some((teil) => teil.art === "K");

        if (bringtKoenig) {
            koenigsAngebote++;
            wahr(typeof angebot.gewicht === "number" && angebot.gewicht < 1,
                "das Koenigs-Angebot ist selten");
            continue;
        }

        const abstand = Math.abs(wert(angebot.gibt) - wert(angebot.bekommt));

        wahr(abstand <= 1, "Abstand hoechstens 1 bei " + namen(angebot.gibt)
            + " gegen " + namen(angebot.bekommt) + " (war " + abstand + ")");
    }

    gleich(koenigsAngebote, 1, "genau ein Angebot bringt einen Koenig");
});

pruefe("Ein erhandelter Koenig ist ein zweites Leben (v0.58)", () => {
    /*
     * Dieselbe Regel wie bei der Verstaerkung: Ohne `koenigeAlsLeben` waere
     * der zweite Koenig ein unschlagbarer Klotz und "Schachmatt" nicht mehr
     * eindeutig.
     */
    const angebot = SCHACH_VARIANTEN.HANDEL.find((eintrag) =>
        SCHACH_VARIANTEN.handelSeite(eintrag.bekommt).some((teil) => teil.art === "K"));

    wahr(!!angebot, "es gibt das Angebot");
    gleich(SCHACH_VARIANTEN.handelAnzahl(angebot.gibt), 2, "zwei Figuren dafuer");
    gleich(SCHACH_RUNDE._handelsText(angebot.gibt), "1 Dame und 1 Bauer",
        "und der Text nennt beide");
});

pruefe("Alle Geraete sehen dasselbe Angebot", () => {
    const runde = faehigkeitenPartie();

    const einer = SCHACH_RUNDE.handelsAngebot(runde, "weiss");
    const anderer = SCHACH_RUNDE.handelsAngebot(SCHACH_RUNDE.kopieren(runde), "weiss");

    gleich(JSON.stringify(einer), JSON.stringify(anderer), "gerechnet, nicht gewuerfelt");
});

/* ------------------------------------------------------------------ *
 * Der Dieb (seit v0.85, Wunsch T3)
 * ------------------------------------------------------------------ */

pruefe("Der Dieb nimmt bis zu zwei Faehigkeiten des Gegners", () => {
    const runde = faehigkeitenPartie();
    runde.faehigkeiten.schwarz = ["sprung", "mauer", "fessel"];

    const neu = einsetzen(runde, "dieb");
    wahr(neu !== null, "eingesetzt");

    gleich(neu.faehigkeiten.schwarz.length, 1, "dem Gegner fehlen zwei");
    gleich(neu.faehigkeiten.weiss.length, 2, "und zwei sind dazugekommen");

    /* Was weg ist, ist genau das, was angekommen ist. */
    const weg = ["sprung", "mauer", "fessel"]
        .filter((art) => neu.faehigkeiten.schwarz.indexOf(art) === -1);
    for (const art of weg) {
        wahr(neu.faehigkeiten.weiss.indexOf(art) !== -1, art + " ist herueber");
    }
});

pruefe("Der Dieb nimmt auch nur eine, wenn mehr nicht da ist", () => {
    const runde = faehigkeitenPartie();
    runde.faehigkeiten.schwarz = ["frost"];

    const neu = einsetzen(runde, "dieb");
    wahr(neu !== null, "eingesetzt");

    gleich(neu.faehigkeiten.schwarz.length, 0, "der Gegner ist leer");
    gleich(neu.faehigkeiten.weiss.indexOf("frost") !== -1, true, "der Frost ist da");
});

pruefe("Beim leeren Gegner laesst sich der Dieb nicht einsetzen", () => {
    const runde = faehigkeitenPartie();
    runde.faehigkeiten.schwarz = [];

    gleich(SCHACH_RUNDE.diebesBeute(runde, "weiss"), null, "nichts zu holen");
    gleich(einsetzen(runde, "dieb"), null, "und damit kein Einsatz");
});

pruefe("Alle Geraete sehen dieselbe Beute", () => {
    const runde = faehigkeitenPartie();
    runde.faehigkeiten.schwarz = ["sprung", "mauer", "fessel", "frost"];

    const einer = SCHACH_RUNDE.diebesBeute(runde, "weiss");
    const anderer = SCHACH_RUNDE.diebesBeute(SCHACH_RUNDE.kopieren(runde), "weiss");

    gleich(JSON.stringify(einer), JSON.stringify(anderer), "gerechnet, nicht gewuerfelt");
});

pruefe("Der Dieb greift zweimal verschiedene Stellen ab", () => {
    /*
     * Zwei gleiche Faehigkeiten nebeneinander sind die Falle: Wenn die
     * Ziehung zweimal dieselbe STELLE waehlt, verschwindet nur eine und der
     * Vorrat stimmt nicht mehr.
     */
    const runde = faehigkeitenPartie();
    runde.faehigkeiten.schwarz = ["sprung", "sprung"];

    const beute = SCHACH_RUNDE.diebesBeute(runde, "weiss");
    gleich(beute.stellen.length, 2, "zwei Stellen");
    wahr(beute.stellen[0] !== beute.stellen[1], "und zwar verschiedene");

    const neu = einsetzen(runde, "dieb");
    gleich(neu.faehigkeiten.schwarz.length, 0, "beide sind weg");
});

pruefe("Der Diebstahl steht im Verlauf", () => {
    const runde = faehigkeitenPartie();
    runde.faehigkeiten.schwarz = ["frost"];

    const neu = einsetzen(runde, "dieb");
    const letzter = neu.verlauf[neu.verlauf.length - 1];

    wahr(letzter.text.indexOf("Dieb") !== -1, "die Faehigkeit steht drin");
    wahr(letzter.text.indexOf("Frost") !== -1,
        "und was genommen wurde — der Bestohlene soll es sehen");
});

pruefe("Der Dieb laesst das Brett in Ruhe", () => {
    const runde = faehigkeitenPartie();
    runde.faehigkeiten.schwarz = ["sprung", "mauer"];

    const neu = einsetzen(runde, "dieb");
    gleich(neu.stand.brett, runde.stand.brett, "kein Feld hat sich geaendert");
    gleich(neu.stand.amZug, "schwarz", "aber der Zug ist abgegeben");
});

pruefe("Der Haendler nimmt die hintersten Figuren", () => {
    const runde = faehigkeitenPartie();
    const angebot = SCHACH_RUNDE.handelsAngebot(runde, "weiss");

    if (!angebot) {
        return;
    }

    /* Alles, was weggeht, gehoert mir und ist von einer der verlangten Arten
       (seit v0.58 koennen es mehrere sein). */
    const arten = SCHACH_VARIANTEN.handelSeite(angebot.gibt).map((teil) => teil.art);

    for (const feld of angebot.gibtFelder) {
        const figur = SCHACH.figurAuf(runde.stand, feld);
        gleich(SCHACH.farbeVon(figur), "weiss", "eigene Figur");
        wahr(arten.indexOf(SCHACH.artVon(figur)) !== -1, "richtige Art");
    }
    gleich(angebot.gibtFelder.length, SCHACH_VARIANTEN.handelAnzahl(angebot.gibt),
        "genau so viele");
});

pruefe("Ein angenommener Handel tauscht wirklich", () => {
    let runde = faehigkeitenPartie();
    const angebot = SCHACH_RUNDE.handelsAngebot(runde, "weiss");
    wahr(angebot !== null, "es gibt ein Angebot");

    const vorher = angebot.gibtFelder.slice();
    const nachher = einsetzen(runde, "haendler", -1);

    wahr(nachher !== null, "eingesetzt");

    /* Die abgegebenen Felder tragen jetzt entweder nichts oder das Neue. */
    const neueArt = angebot.bekommt.art;
    for (const feld of angebot.bekommtFelder) {
        gleich(SCHACH.artVon(SCHACH.figurAuf(nachher.stand, feld)), neueArt,
            "das Eingetauschte steht da");
    }

    const weg = vorher.filter((feld) => angebot.bekommtFelder.indexOf(feld) === -1);
    for (const feld of weg) {
        gleich(SCHACH.figurAuf(nachher.stand, feld), ".", "abgegeben und leer");
    }
});

pruefe("Der Handel kostet den ganzen Zug", () => {
    const runde = faehigkeitenPartie();
    const nachher = einsetzen(runde, "haendler", -1);

    gleich(nachher.stand.amZug, "schwarz", "der Gegner ist dran");
});

pruefe("Ohne passende Figuren gibt es kein Angebot", () => {
    let runde = faehigkeitenPartie();

    /* Ein leeres Brett bis auf die Koenige: Da ist nichts zu handeln. */
    runde.stand = SCHACH.standNormalisieren({
        variante: "faehigkeiten",
        brett: "....k..."
            + "........"
            + "........"
            + "........"
            + "........"
            + "........"
            + "........"
            + "....K...",
        amZug: "weiss",
        rochade: ""
    });

    gleich(SCHACH_RUNDE.handelsAngebot(runde, "weiss"), null, "kein Angebot");
    gleich(einsetzen(runde, "haendler", -1), null, "und nicht einsetzbar");
});

pruefe("Geschlagene Figuren landen im Verlust", () => {
    let runde = faehigkeitenPartie();
    runde = SCHACH_RUNDE.ziehen(runde, "id-anna",
        SCHACH.feldNummer("e2"), SCHACH.feldNummer("e4"), "D", "Anna", 2000);
    runde = SCHACH_RUNDE.ziehen(runde, "id-bert",
        SCHACH.feldNummer("d7"), SCHACH.feldNummer("d5"), "D", "Bert", 2100);
    runde = SCHACH_RUNDE.ziehen(runde, "id-anna",
        SCHACH.feldNummer("e4"), SCHACH.feldNummer("d5"), "D", "Anna", 2200);

    gleich(runde.verloren.schwarz.join(","), "B", "Schwarz hat einen Bauern verloren");
    gleich(runde.verloren.weiss.length, 0, "Weiss noch nichts");
});

pruefe("Der Doppelzug laesst dieselbe Seite noch einmal ziehen", () => {
    let runde = einsetzen(faehigkeitenPartie(), "doppelzug", -1);
    wahr(runde !== null, "eingesetzt");
    gleich(runde.stand.extraZug, "weiss", "Doppelzug vorgemerkt");

    runde = SCHACH_RUNDE.ziehen(runde, "id-anna",
        SCHACH.feldNummer("d2"), SCHACH.feldNummer("d4"), "D", "Anna", 3100);
    gleich(runde.stand.amZug, "weiss", "Weiss ist gleich noch einmal dran");
    gleich(runde.stand.extraZug, "", "und die Faehigkeit ist weg");

    runde = SCHACH_RUNDE.ziehen(runde, "id-anna",
        SCHACH.feldNummer("e2"), SCHACH.feldNummer("e4"), "D", "Anna", 3200);
    gleich(runde.stand.amZug, "schwarz", "danach wieder normal");
});

pruefe("Ein Zusatzmuster gilt bis zum eigenen Zug", () => {
    /*
     * Verbraucht wird ein Muster durch den EIGENEN Zug, und nur dadurch. Der
     * Gegenzug darf es nicht loeschen — sonst waere eine Faehigkeit, die man
     * waehrend des gegnerischen Zuges einsetzt (Ausweichen, Blitz), verbraucht
     * und wirkungslos. Genau dieser Fehler ist schon zweimal passiert (v0.41
     * und v0.47, siehe `docs\entscheidungen\erkenntnisse.md`).
     */
    let runde = faehigkeitenPartie();
    runde.stand.amZug = "schwarz";
    runde.faehigkeiten.weiss.push("ausweichen");

    runde = SCHACH_RUNDE.faehigkeitEinsetzen(
        runde, "id-anna", "ausweichen", -1, "Anna", 3000);
    gleich(runde.stand.zusatzMuster, "ausweichen", "das Muster steht bereit");

    runde = SCHACH_RUNDE.ziehen(runde, "id-bert",
        SCHACH.feldNummer("e7"), SCHACH.feldNummer("e6"), "D", "Bert", 3050);
    gleich(runde.stand.zusatzMuster, "ausweichen", "der Gegenzug loescht es nicht");

    runde = SCHACH_RUNDE.ziehen(runde, "id-anna",
        SCHACH.feldNummer("e2"), SCHACH.feldNummer("e3"), "D", "Anna", 3100);

    gleich(runde.stand.zusatzMuster, "", "verbraucht");
    gleich(runde.stand.zusatzFarbe, "", "und keine Farbe mehr");
});

pruefe("Faehigkeiten kann nur einsetzen, wer am Zug ist und sie hat", () => {
    const runde = faehigkeitenPartie();

    gleich(SCHACH_RUNDE.faehigkeitEinsetzen(runde, "id-anna", "sprung", -1, "Anna", 2000),
        null, "ohne Faehigkeit geht nichts");

    const mit = SCHACH_RUNDE.kopieren(runde);
    mit.faehigkeiten.schwarz.push("sprung");
    gleich(SCHACH_RUNDE.faehigkeitEinsetzen(mit, "id-bert", "sprung", -1, "Bert", 2000),
        null, "Schwarz ist nicht am Zug");
});

/* ------------------------------------------------------------------ *
 * Einstellungen und Abstimmung
 * ------------------------------------------------------------------ */

/* Eine Partie mit zwei Leuten im weissen Team und Einigkeitspflicht. */
function einigkeitsPartie() {
    let runde = SCHACH_RUNDE.leereRunde(1000, "standard", "p-e", "Mit Einigkeit");
    runde.regeln.einigkeit = true;

    runde = SCHACH_RUNDE.teamBeitreten(runde, "id-anna", "weiss", 1000);
    runde = SCHACH_RUNDE.teamBeitreten(runde, "id-cem", "weiss", 1000);
    runde = SCHACH_RUNDE.teamBeitreten(runde, "id-bert", "schwarz", 1000);
    runde = SCHACH_RUNDE.bereitSetzen(runde, "weiss", true, 1000);
    runde = SCHACH_RUNDE.bereitSetzen(runde, "schwarz", true, 1000);
    return runde;
}

pruefe("Ohne Einigkeitspflicht zieht ein Vorschlag sofort", () => {
    const runde = SCHACH_RUNDE.zugVorschlagen(laufendePartie(), "id-anna",
        SCHACH.feldNummer("e2"), SCHACH.feldNummer("e4"), "D", "Anna", 2000);

    gleich(runde.zugZaehler, 1, "gezogen");
    gleich(runde.vorschlag, null, "kein Vorschlag offen");
});

pruefe("Allein im Team braucht es keine Abstimmung", () => {
    let runde = SCHACH_RUNDE.leereRunde(1000, "standard", "p-a", "Allein");
    runde.regeln.einigkeit = true;
    runde = SCHACH_RUNDE.teamBeitreten(runde, "id-anna", "weiss", 1000);
    runde = SCHACH_RUNDE.teamBeitreten(runde, "id-bert", "schwarz", 1000);
    runde = SCHACH_RUNDE.bereitSetzen(runde, "weiss", true, 1000);
    runde = SCHACH_RUNDE.bereitSetzen(runde, "schwarz", true, 1000);

    const danach = SCHACH_RUNDE.zugVorschlagen(runde, "id-anna",
        SCHACH.feldNummer("e2"), SCHACH.feldNummer("e4"), "D", "Anna", 2000);

    gleich(danach.zugZaehler, 1, "sofort gezogen");
});

pruefe("Mit Einigkeitspflicht wird erst vorgeschlagen, dann gezogen", () => {
    let runde = SCHACH_RUNDE.zugVorschlagen(einigkeitsPartie(), "id-anna",
        SCHACH.feldNummer("e2"), SCHACH.feldNummer("e4"), "D", "Anna", 2000);

    gleich(runde.zugZaehler, 0, "noch nicht gezogen");
    wahr(runde.vorschlag !== null, "ein Vorschlag steht");
    gleich(runde.vorschlag.stimmen.join(","), "id-anna", "der Vorschlagende ist dafuer");
    gleich(SCHACH.figurAuf(runde.stand, SCHACH.feldNummer("e4")), ".", "Brett unveraendert");

    /* Cem stimmt zu — jetzt sind alle dafuer. */
    runde = SCHACH_RUNDE.zugMittragen(runde, "id-cem", 2100);
    gleich(runde.zugZaehler, 1, "jetzt gezogen");
    gleich(SCHACH.figurAuf(runde.stand, SCHACH.feldNummer("e4")), "B", "Bauer steht auf e4");
    gleich(runde.vorschlag, null, "Vorschlag ist erledigt");
});

pruefe("Der Gegner kann nicht mitstimmen, und ein Vorschlag laesst sich verwerfen", () => {
    let runde = SCHACH_RUNDE.zugVorschlagen(einigkeitsPartie(), "id-anna",
        SCHACH.feldNummer("e2"), SCHACH.feldNummer("e4"), "D", "Anna", 2000);

    gleich(SCHACH_RUNDE.zugMittragen(runde, "id-bert", 2100), null,
        "Schwarz stimmt nicht mit ab");

    runde = SCHACH_RUNDE.vorschlagVerwerfen(runde, "id-cem", 2200);
    gleich(runde.vorschlag, null, "verworfen");
    gleich(runde.zugZaehler, 0, "und nichts gezogen");
});

pruefe("Auch Faehigkeiten werden abgestimmt", () => {
    let runde = einigkeitsPartie();
    runde.faehigkeiten.weiss.push("bauernschub");

    runde = SCHACH_RUNDE.faehigkeitVorschlagen(runde, "id-anna", "bauernschub", -1,
        "Anna", 2000);

    wahr(runde !== null, "vorgeschlagen");
    gleich(runde.vorschlag.art, "faehigkeit", "als Faehigkeit vermerkt");
    gleich(runde.vorschlag.faehigkeit, "bauernschub", "die richtige");
    gleich(runde.faehigkeiten.weiss.length, 1, "noch nicht verbraucht");
    gleich(SCHACH.figurAuf(runde.stand, SCHACH.feldNummer("a3")), ".", "Brett unveraendert");

    runde = SCHACH_RUNDE.zugMittragen(runde, "id-cem", 2100);
    gleich(runde.faehigkeiten.weiss.length, 0, "jetzt verbraucht");
    gleich(SCHACH.figurAuf(runde.stand, SCHACH.feldNummer("a3")), "B", "die Bauern sind vor");
    gleich(runde.vorschlag, null, "Abstimmung erledigt");
});

pruefe("Die Frist steht im Vorschlag und laeuft ab", () => {
    let runde = SCHACH_RUNDE.zugVorschlagen(einigkeitsPartie(), "id-anna",
        SCHACH.feldNummer("e2"), SCHACH.feldNummer("e4"), "D", "Anna", 10000);

    gleich(runde.vorschlag.frist, 10000 + SCHACH_RUNDE.FRIST_SEKUNDEN[0] * 1000,
        "zehn Sekunden ab dem Vorschlag");

    /* Vorher passiert nichts. */
    gleich(SCHACH_RUNDE.fristAbgelaufen(runde, 12000), null, "vor Ablauf nichts");

    /* Danach geht der Zug durch, auch ohne Cems Stimme. */
    const danach = SCHACH_RUNDE.fristAbgelaufen(runde, 20001);
    wahr(danach !== null, "nach Ablauf ausgefuehrt");
    gleich(danach.zugZaehler, 1, "gezogen");
    gleich(danach.versaeumt["id-cem"], 1, "Cem hat einen Strich");
    gleich(danach.versaeumt["id-anna"], undefined, "Anna nicht");
});

pruefe("Wer zweimal nicht abstimmt, verkuerzt die Frist — bis er wieder mitmacht", () => {
    let runde = einigkeitsPartie();
    gleich(SCHACH_RUNDE.fristFuer(runde, "weiss"), SCHACH_RUNDE.FRIST_SEKUNDEN[0] * 1000,
        "am Anfang die volle Frist");

    runde.versaeumt["id-cem"] = 1;
    gleich(SCHACH_RUNDE.fristFuer(runde, "weiss"), SCHACH_RUNDE.FRIST_SEKUNDEN[0] * 1000,
        "nach einem Mal noch nicht");

    runde.versaeumt["id-cem"] = 2;
    gleich(SCHACH_RUNDE.fristFuer(runde, "weiss"), SCHACH_RUNDE.FRIST_SEKUNDEN[1] * 1000,
        "nach zweimal kuerzer");

    runde.versaeumt["id-cem"] = 4;
    gleich(SCHACH_RUNDE.fristFuer(runde, "weiss"), SCHACH_RUNDE.FRIST_SEKUNDEN[2] * 1000,
        "nach viermal noch kuerzer");

    runde.versaeumt["id-cem"] = 20;
    gleich(SCHACH_RUNDE.fristFuer(runde, "weiss"),
        SCHACH_RUNDE.FRIST_SEKUNDEN[SCHACH_RUNDE.FRIST_SEKUNDEN.length - 1] * 1000,
        "aber nie unter die letzte Stufe");

    /* Stimmt er wieder mit, faengt es von vorn an. */
    let mit = SCHACH_RUNDE.zugVorschlagen(runde, "id-anna",
        SCHACH.feldNummer("e2"), SCHACH.feldNummer("e4"), "D", "Anna", 10000);
    mit = SCHACH_RUNDE.zugMittragen(mit, "id-cem", 10100);

    gleich(mit.versaeumt["id-cem"], undefined, "Zaehler zurueckgesetzt");
    gleich(SCHACH_RUNDE.fristFuer(mit, "weiss"), SCHACH_RUNDE.FRIST_SEKUNDEN[0] * 1000,
        "und wieder die volle Frist");
});

pruefe("Ein Vorschlag muss regelkonform sein", () => {
    gleich(SCHACH_RUNDE.zugVorschlagen(einigkeitsPartie(), "id-anna",
        SCHACH.feldNummer("e2"), SCHACH.feldNummer("e5"), "D", "Anna", 2000),
        null, "drei Felder gehen nicht");
});

pruefe("Versteckte Spielarten bleiben gueltig, stehen aber nicht zur Auswahl", () => {
    /*
     * „Fähigkeiten sammeln" ist seit v2.9 versteckt: Dasselbe erreicht man mit
     * „Klassisch" und dem Würfel-Haken. Laufende Partien tragen die Kennung
     * aber weiter im Stand und müssen ihre Spielart behalten.
     */
    const versteckte = SCHACH_VARIANTEN.liste.filter((eintrag) => eintrag.versteckt);
    wahr(versteckte.length > 0, "mindestens eine versteckt");

    for (const variante of versteckte) {
        wahr(SCHACH_VARIANTEN.gibtEs(variante.id), "gilt weiterhin: " + variante.id);
        gleich(SCHACH_VARIANTEN.holen(variante.id).id, variante.id,
            "wird gefunden: " + variante.id);
        wahr(SCHACH_VARIANTEN.zurAuswahl().indexOf(variante) === -1,
            "nicht zur Auswahl: " + variante.id);
    }

    /* Eine laufende Partie in dieser Spielart behaelt alles. */
    const runde = SCHACH_RUNDE.normalisieren({
        variante: "faehigkeiten",
        stand: { brett: SCHACH.GRUNDSTELLUNG, amZug: "weiss" },
        teams: { weiss: ["id-anna"], schwarz: ["id-bert"] },
        laeuft: true
    });

    gleich(runde.variante, "faehigkeiten", "Spielart bleibt");
    gleich(SCHACH_RUNDE.faehigkeitenAn(runde), true, "und die Wuerfel auch");
});

pruefe("Der Schalter fuer Faehigkeiten geht der Spielart vor", () => {
    /* Klassisch, aber mit Würfeln. */
    let runde = SCHACH_RUNDE.leereRunde(1000, "standard", "p-w", "Mit Wuerfeln");
    gleich(SCHACH_RUNDE.faehigkeitenAn(runde), false, "klassisch: ohne");

    runde.regeln.faehigkeiten = true;
    gleich(SCHACH_RUNDE.faehigkeitenAn(runde), true, "eingeschaltet");

    /* Und umgekehrt: Fähigkeiten-Spielart ohne Würfel. */
    const ohne = SCHACH_RUNDE.leereRunde(1000, "faehigkeiten", "p-o", "Ohne");
    gleich(SCHACH_RUNDE.faehigkeitenAn(ohne), true, "Spielart: mit");

    ohne.regeln.faehigkeiten = false;
    gleich(SCHACH_RUNDE.faehigkeitenAn(ohne), false, "abgeschaltet");
});

pruefe("Partien von frueher behalten ihr Verhalten", () => {
    /* Kein `regeln` im Stand: Dann entscheidet die Spielart wie vor v2.5. */
    const alt = SCHACH_RUNDE.normalisieren({
        variante: "faehigkeiten",
        stand: { brett: SCHACH.GRUNDSTELLUNG, amZug: "weiss" },
        teams: { weiss: ["id-anna"], schwarz: ["id-bert"] },
        laeuft: true
    });

    gleich(alt.regeln.faehigkeiten, null, "keine Angabe");
    gleich(SCHACH_RUNDE.faehigkeitenAn(alt), true, "trotzdem mit Wuerfeln");
    gleich(alt.regeln.einigkeit, false, "und ohne Abstimmung");
    gleich(alt.regeln.seltenheitZeigen, true, "Seltenheit sichtbar");
});

pruefe("Jede Bewegung hinterlaesst ihren Weg im Verlauf", () => {
    /* Daraus zeichnet der Bildschirm die Pfeile — auch für Fähigkeiten, die
       mehrere Figuren auf einmal bewegen. */
    let runde = faehigkeitenPartie();

    runde = SCHACH_RUNDE.ziehen(runde, "id-anna",
        SCHACH.feldNummer("e2"), SCHACH.feldNummer("e4"), "D", "Anna", 2000);

    let letzter = runde.verlauf[runde.verlauf.length - 1];
    gleich(letzter.wege.length, 1, "ein Zug, ein Weg");
    gleich(letzter.wege[0].von, SCHACH.feldNummer("e2"), "von e2");

    /* Der Bauernschub bewegt bis zu acht Bauern auf einmal. */
    const geschoben = einsetzen(faehigkeitenPartie(), "bauernschub", -1);
    letzter = geschoben.verlauf[geschoben.verlauf.length - 1];
    gleich(letzter.wege.length, 8, "acht Wege");

    for (const weg of letzter.wege) {
        gleich(SCHACH.reiheVon(weg.von) - SCHACH.reiheVon(weg.nach), 1, "je ein Feld vor");
    }
});

pruefe("Die Rochade zeichnet zwei Wege — Koenig und Turm", () => {
    let runde = laufendePartie();
    runde.stand = SCHACH.standNormalisieren({
        brett: "....k..."
            + "........"
            + "........"
            + "........"
            + "........"
            + "........"
            + "........"
            + "T...K..T",
        amZug: "weiss"
    });

    const lage = SCHACH.rochadeLage(runde.stand, "weiss");
    const kurz = lage.find((eintrag) => eintrag.seite === "kurz");

    const danach = SCHACH_RUNDE.ziehen(runde, "id-anna",
        SCHACH.feldNummer("e1"), kurz.zielFeld, "D", "Anna", 2000);

    const letzter = danach.verlauf[danach.verlauf.length - 1];
    gleich(letzter.wege.length, 2, "zwei Wege");
    gleich(letzter.wege[1].von, SCHACH.feldNummer("h1"), "der Turm kommt von h1");
});

/* ------------------------------------------------------------------ *
 * Die Zufallsarmee (seit v0.49)
 * ------------------------------------------------------------------ */

/* Zaehlt, wie oft jede Figurenart auf dem Brett steht, je Farbe. */
function figurenZaehlen(stand, farbe) {
    const gezaehlt = {};

    for (let feld = 0; feld < SCHACH.felderVon(stand); feld++) {
        const figur = SCHACH.figurAuf(stand, feld);
        if (SCHACH.farbeVon(figur) !== farbe) {
            continue;
        }
        const art = SCHACH.artVon(figur);
        gezaehlt[art] = (gezaehlt[art] || 0) + 1;
    }

    return gezaehlt;
}

/*
 * Eine Partie mit dem Zufallsarmee-HAKEN auf einer beliebigen Spielart.
 *
 * Nachgebaut wird genau der Weg von `SCHACH_TAFEL.partieAnlegen`: leere Runde,
 * dann die Regeln setzen, dann aufstellen. (Die Tafel selbst wird hier nicht
 * geladen — diese Datei prueft die RUNDE.)
 */
function armeePartie(varianteId, kennung, getrennt, staerke) {
    const runde = SCHACH_RUNDE.leereRunde(1000, varianteId, kennung, "Zufall");

    runde.regeln.zufallsArmee = true;
    runde.regeln.armeeUnterschiedlich = (getrennt === true);
    if (staerke) {
        runde.regeln.armeeStaerke = staerke;
    }

    return SCHACH_RUNDE.armeeAufstellen(runde);
}

/* Zaehlt die Figuren einer Farbe auf einem Brett. */
function figurenAufBrett(brett, weiss) {
    let anzahl = 0;
    for (const zeichen of brett) {
        if (zeichen === ".") {
            continue;
        }
        if ((zeichen === zeichen.toUpperCase()) === !!weiss) {
            anzahl++;
        }
    }
    return anzahl;
}

pruefe("Die Staerke steuert die Figurenzahl, und der Koenig bleibt IMMER (v0.86)", () => {
    /*
     * WUNSCH V1 (20.08.): „Die Anzahl der Figuren auch eine Knopf-Funktion."
     *
     * DIE GEFAHR DABEI: `_armeeFiguren` MISCHT die Figurenliste, der Koenig
     * steht also an zufaelliger Stelle. Wer die Zahl durch Abschneiden der
     * fertigen Liste kuerzt, loescht ihn frueher oder spaeter weg — und eine
     * Partie ohne Koenig ist keine. Die Staerke wirkt deshalb VOR dem Bauen
     * der Liste (`armeeAnzahl`). Genau das prueft dieser Test, ueber viele
     * Kennungen und auf mehreren Brettern.
     */
    for (const varianteId of ["standard", "klein", "kreuz"]) {
        for (const staerke of ["wenig", "normal", "viel", "voll"]) {
            for (let nummer = 0; nummer < 12; nummer++) {
                const runde = armeePartie(varianteId, "p-st-" + staerke + nummer,
                    false, staerke);
                const brett = runde.stand.brett;

                wahr(brett.indexOf("K") !== -1,
                    varianteId + "/" + staerke + ": Weiss hat einen Koenig");
                wahr(brett.indexOf("k") !== -1,
                    varianteId + "/" + staerke + ": Schwarz hat einen Koenig");
            }
        }
    }
});

pruefe("Mehr Staerke heisst nie weniger Figuren (v0.86)", () => {
    /*
     * Dieselbe Leiter wie bei den Lootbox-Mengen: Keine Stufe stellt weniger
     * auf als die darunter. Gemessen wird ueber mehrere Kennungen, damit nicht
     * eine einzelne Ziehung das Ergebnis traegt — und auf dem klassischen
     * Brett, wo Platz fuer alle Stufen ist.
     */
    const reihe = SCHACH_VARIANTEN.ARMEE_STAERKEN.map((eintrag) => eintrag.id);

    const zaehlen = (staerke) => {
        let gesamt = 0;
        for (let nummer = 0; nummer < 20; nummer++) {
            const runde = armeePartie("standard", "p-leiter" + nummer, false, staerke);
            gesamt += figurenAufBrett(runde.stand.brett, true);
        }
        return gesamt;
    };

    let vorher = 0;
    for (const staerke of reihe) {
        const jetzt = zaehlen(staerke);
        wahr(jetzt >= vorher, staerke + " stellt nicht weniger auf als die Stufe davor ("
            + jetzt + " gegen " + vorher + ")");
        vorher = jetzt;
    }

    /* Und die Aussenstufen unterscheiden sich wirklich — sonst waere die
       ganze Knopfreihe eine Behauptung. */
    wahr(zaehlen("voll") > zaehlen("wenig"), "voll stellt mehr auf als wenig");
});

pruefe("Eine Partie ohne Staerke-Angabe spielt weiter wie vor v0.86", () => {
    /*
     * ADDITIVER DATENVERTRAG: Ein gespeicherter Stand von frueher kennt
     * `armeeStaerke` nicht. Er muss exakt dasselbe Brett ergeben wie „normal" —
     * sonst stellte sich eine angefangene Partie beim naechsten Laden um.
     */
    const alt = armeePartie("standard", "p-alt", false);
    const roh = JSON.parse(JSON.stringify(alt));
    delete roh.regeln.armeeStaerke;

    const wieder = SCHACH_RUNDE.normalisieren(roh);
    gleich(wieder.regeln.armeeStaerke, "normal", "fehlende Angabe wird normal");

    const gleichStark = armeePartie("standard", "p-alt", false, "normal");
    gleich(alt.stand.brett, gleichStark.stand.brett, "dasselbe Brett wie normal");

    /* Auch eine unbekannte Stufe darf nichts kaputt machen. */
    const kaputt = JSON.parse(JSON.stringify(alt));
    kaputt.regeln.armeeStaerke = "riesig";
    gleich(SCHACH_RUNDE.normalisieren(kaputt).regeln.armeeStaerke, "normal",
        "unbekannte Stufe wird normal");
});

pruefe("Jede Armee-Staerke stellt MEHR auf als die darunter (v0.99)", () => {
    /*
     * SONST IST EIN KNOPF WIRKUNGSLOS — dieselbe Pruefung wie beim Item-Vorrat
     * (v0.87), und aus demselben Anlass. Bis v0.98 war genau das der Fall:
     * `armeeAnzahl` multiplizierte den Anteil, waehrend die Zahl der
     * STARTFELDER fest blieb. Alles ueber „normal" wurde deshalb abgeschnitten
     * — „viel" und „voll" stellten auf jedem Brett dieselbe Armee auf wie
     * „normal". Gemeldet am 20.08. als „die Vorschau bei den Maps aendert sich
     * nicht, wenn man die Figurenzahl aendert".
     *
     * Geprueft wird ueber JEDE waehlbare Spielart und am WIRKLICH aufgestellten
     * Brett, nicht an der angekuendigten Zahl: Genau zwischen diesen beiden
     * lief der Fehler.
     */
    for (const variante of SCHACH_VARIANTEN.zurAuswahl()) {
        let vorher = 0;
        let erste = 0;

        /*
         * EINE AUSNAHME, UND ZWAR EINE GERECHNETE (seit v0.104): Auf einem
         * Brett mit nur sechs Reihen ist die dritte Reihe schon die Mitte —
         * dort stellen „viel" und „voll" zwangslaeufig dasselbe auf, weil kein
         * Platz mehr da ist. Das ist kein wirkungsloser Knopf, sondern ein
         * volles Brett. Auf jedem groesseren Brett bleibt die Leiter streng.
         */
        const engesBrett = (variante.hoehe <= 6 || variante.breite <= 6);

        for (const staerke of SCHACH_VARIANTEN.ARMEE_STAERKEN) {
            let runde = SCHACH_RUNDE.leereRunde(1000, variante.id,
                "p-staerke-" + variante.id, "Staerke");

            runde.regeln.zufallsArmee = true;
            runde.regeln.armeeStaerke = staerke.id;
            runde = SCHACH_RUNDE.kreuzAufstellen(runde, "");
            runde = SCHACH_RUNDE.armeeAufstellen(runde, "");

            const gezaehlt = figurenZaehlen(runde.stand, "weiss");
            const summe = Object.keys(gezaehlt)
                .reduce((wert, art) => wert + gezaehlt[art], 0);

            if (staerke.id === "wenig") {
                erste = summe;
            } else if (engesBrett) {
                wahr(summe >= vorher, variante.id + "/" + staerke.id
                    + ": nie weniger als die Stufe davor (" + summe
                    + " gegen " + vorher + ")");
            } else {
                wahr(summe > vorher, variante.id + "/" + staerke.id
                    + ": mehr als die Stufe davor (" + summe + " gegen " + vorher + ")");
            }
            vorher = summe;
        }

        /* Auch auf dem engsten Brett muessen die Aussenstufen sich
           unterscheiden — sonst waere die ganze Knopfreihe eine Behauptung. */
        wahr(vorher > erste, variante.id + ": voll stellt mehr auf als wenig ("
            + vorher + " gegen " + erste + ")");
    }
});

pruefe("Die angekuendigte Zahl stimmt mit den Startfeldern ueberein (v0.99)", () => {
    /*
     * `armeeAnzahl` und `_armeeFelder` muessen dieselbe Rechnung sein — sonst
     * verspricht die Kachel eine Zahl, die das Brett nicht haelt. Seit v0.99
     * kommen beide aus `armeeSpalten`; dieser Test haelt sie zusammen.
     *
     * Auf dem KREUZ ist die Zahl die je STARTSEITE (seit v0.76), deshalb wird
     * dort gegen die Felder EINER Seite verglichen.
     */
    for (const variante of SCHACH_VARIANTEN.zurAuswahl()) {
        for (const staerke of SCHACH_VARIANTEN.ARMEE_STAERKEN) {
            const gesagt = SCHACH_VARIANTEN.armeeAnzahl(variante, staerke.id);

            const felder = variante.kreuz
                ? SCHACH_RUNDE._armeeFelderKreuz(variante, "unten", staerke.id)
                : SCHACH_RUNDE._armeeFelder(variante, "weiss", staerke.id);

            gleich(felder.length, gesagt, variante.id + "/" + staerke.id
                + ": angekuendigte Zahl gleich Zahl der Startfelder");
        }
    }
});

/*
 * Die feste Aufstellung so, wie die Partie sie anlegt: leere Runde, Regeln
 * setzen, Kreuz herrichten, auf den Regler bringen. Genau die Reihenfolge aus
 * `SCHACH_TAFEL.partieAnlegen` — eine eigene Nachbildung waere die zweite
 * Wahrheit.
 */
function festeAufstellung(varianteId, staerke) {
    let runde = SCHACH_RUNDE.leereRunde(1000, varianteId, "p-fest-" + varianteId, "F");

    runde.regeln.armeeStaerke = staerke;
    runde.regeln.armeeFassung = 1;
    runde = SCHACH_RUNDE.kreuzAufstellen(runde, "");

    return SCHACH_RUNDE.aufstellungAnpassen(runde);
}

pruefe("Die vier Stufen stellen genau das auf, was sie versprechen (v0.104)", () => {
    /*
     * NUTZER-ANSAGE VOM 20.08.2026, die Leiter neu gesetzt:
     *
     *   „Die Anzahl und Aufstellung, die derzeit hinter „normal" steht, soll
     *   bei „wenig" stehen, und die hinter „voll" soll zu „normal" werden.
     *   „viel" soll die Bauernreihe eins nach vorne ruecken auf allen Seiten,
     *   und zwischen Bauern und der Dame/Koenig-Reihe soll eine Reihe mit
     *   Pferden und so dazwischen gebaut werden. Bei „voll" soll bei jedem
     *   Brett in der Mitte nur noch ein 2x2-Feld frei bleiben, der Rest wird
     *   mit Truppen gefuellt."
     *
     * Diese Pruefung haelt alle vier Bretter im Wortlaut fest — sie ist der
     * Anker, an dem jede kuenftige Aenderung der Rechnung auffliegt.
     */
    const variante = SCHACH_VARIANTEN.holen("standard");

    const erwartet = {
        wenig:
            "..ldkl.."
            + "..bbbb.."
            + "........"
            + "........"
            + "........"
            + "........"
            + "..BBBB.."
            + "..LDKL..",
        normal: variante.aufstellung,
        viel:
            "tsldklst"
            + "tslsslst"
            + "bbbbbbbb"
            + "........"
            + "........"
            + "BBBBBBBB"
            + "TSLSSLST"
            + "TSLDKLST",
        voll:
            "tsldklst"
            + "tslsslst"
            + "bbbbbbbb"
            + "bbb..bbb"
            + "BBB..BBB"
            + "BBBBBBBB"
            + "TSLSSLST"
            + "TSLDKLST"
    };

    for (const staerke of Object.keys(erwartet)) {
        gleich(festeAufstellung("standard", staerke).stand.brett, erwartet[staerke],
            "standard/" + staerke + ": das versprochene Brett");
    }

    /* „normal" ist wirklich die gewohnte Aufstellung — daran haengt, dass eine
       neue Partie mit der Vorgabe aussieht wie eh und je. */
    gleich(erwartet.normal, variante.aufstellung, "normal ist die Vorlage selbst");
});

pruefe("Auf voll bleibt genau das 2x2 in der Mitte frei (v0.104)", () => {
    /*
     * Der woertliche Teil der Ansage, und zwar auf JEDEM viereckigen Brett.
     * Die Kreuz-Bretter stehen nicht in dieser Liste: Dort gehoeren die vier
     * toten Ecken nicht zum Brett, und beim Duell bleiben zwei Arme leer —
     * geprueft wird das eine Feld weiter unten ueber die Ueberschneidung.
     */
    for (const id of ["standard", "klein", "gross", "doppelbrett", "grossQuadrat"]) {
        const variante = SCHACH_VARIANTEN.holen(id);
        const brett = festeAufstellung(id, "voll").stand.brett;

        let frei = 0;

        for (let feld = 0; feld < brett.length; feld++) {
            const reihe = Math.floor(feld / variante.breite);
            const spalte = feld % variante.breite;
            const mitte = SCHACH_VARIANTEN.armeeMitteFrei(variante, reihe, spalte);

            if (mitte) {
                frei++;
                gleich(brett[feld], ".", id + ": die Mitte bleibt frei");
            } else {
                wahr(brett[feld] !== ".", id + ": alles andere ist besetzt (Feld "
                    + feld + ")");
            }
        }

        gleich(frei, 4, id + ": genau vier Felder in der Mitte");
    }
});

pruefe("Kein Feld gehoert zwei Seiten (v0.104)", () => {
    /*
     * DIE GEFAHR DER TIEFEN BLOECKE: Ab „viel" beruehren sich die Fronten — auf
     * dem Kreuz greifen der obere und der linke Arm nach demselben Feld, auf
     * jedem Brett laufen sie bei „voll" in der Mitte zusammen. Gehoerte ein
     * Feld zwei Seiten, stuende dort am Ende die Figur dessen, der zuletzt
     * geschrieben hat.
     *
     * GEPRUEFT WIRD JE AUFSTELLUNG, NICHT JE BRETT: Beim Kreuz-Duell stehen nie
     * vier Armeen, sondern ein gegenueberliegendes PAAR — welches, entscheidet
     * die Partie-Kennung. Die beiden moeglichen Paare duerfen sich sehr wohl
     * ueberlappen, denn sie kommen nie zusammen vor. Genau das hat diese
     * Pruefung beim Bauen zuerst gemeldet.
     */
    for (const variante of SCHACH_VARIANTEN.zurAuswahl()) {
        const gruppen = (variante.kreuz && !variante.kreuzEinzeln)
            ? [["oben", "unten", "links", "rechts"]]
            : [["oben", "unten"], ["links", "rechts"]];

        for (const staerke of SCHACH_VARIANTEN.ARMEE_STAERKEN) {
            for (const gruppe of gruppen) {
                const belegt = {};

                for (const seite of gruppe) {
                    for (const eintrag of SCHACH_VARIANTEN.armeeFelderBlock(
                        variante, seite, staerke.id)) {

                        wahr(!belegt[eintrag.feld], variante.id + "/" + staerke.id
                            + ": Feld " + eintrag.feld + " gehoert nur einer Seite (schon "
                            + belegt[eintrag.feld] + ", jetzt " + seite + ")");

                        belegt[eintrag.feld] = seite;
                    }
                }
            }
        }
    }
});

pruefe("Alle vier Kreuz-Seiten bekommen gleich viele Felder (v0.104)", () => {
    /*
     * Der Gleichstand auf der Diagonale wird im Uhrzeigersinn aufgeloest, damit
     * jede Seite genau eine ihrer beiden Diagonalen gewinnt. Beim ersten
     * Versuch stand es 35 zu 33, weil dafuer `KREUZ.seiten` benutzt wurde —
     * jene Liste ist nach Gegenueber sortiert und taugt als Uhr nicht.
     */
    for (const id of ["kreuzKlein", "kreuz", "kreuzGross"]) {
        const variante = SCHACH_VARIANTEN.holen(id);

        for (const staerke of SCHACH_VARIANTEN.ARMEE_STAERKEN) {
            const zahlen = ["oben", "unten", "links", "rechts"].map((seite) =>
                SCHACH_VARIANTEN.armeeFelderBlock(variante, seite, staerke.id).length);

            for (const zahl of zahlen) {
                gleich(zahl, zahlen[0], id + "/" + staerke.id
                    + ": jede Seite gleich viele Felder (" + zahlen.join("/") + ")");
            }
        }
    }
});

pruefe("Die zusaetzlichen Reihen bringen keine zweite Krone (v0.104)", () => {
    /*
     * Die Offiziersreihe wird aus der Grundreihe abgeleitet — Koenig und Dame
     * werden dabei zum Springer. Ohne diese Regel haette eine Partie ab „viel"
     * zwei Koenige je Seite, und damit haetten Schach und Matt ihre Bedeutung
     * verloren (eiserne Regel: Koenig und Matt bleiben unangetastet).
     */
    for (const id of ["standard", "klein", "gross", "doppelbrett", "grossQuadrat"]) {
        const koenige = (id === "doppelbrett") ? 2 : 1;

        for (const staerke of ["viel", "voll"]) {
            const brett = festeAufstellung(id, staerke).stand.brett;
            const zaehlen = (zeichen) =>
                brett.split("").filter((eines) => eines === zeichen).length;

            gleich(zaehlen("K"), koenige, id + "/" + staerke + ": Weiss behaelt "
                + koenige + " Koenig(e)");
            gleich(zaehlen("k"), koenige, id + "/" + staerke + ": Schwarz ebenso");
            gleich(zaehlen("D"), koenige, id + "/" + staerke + ": keine zweite Dame");
        }
    }
});

pruefe("Jeder Bauer der festen Kreuz-Aufstellung kennt seine Seite (v0.104)", () => {
    /*
     * Ohne Eintrag faellt ein Bauer auf die FARBREGEL zurueck (Weiss nach oben)
     * und liefe auf einem Fluegel quer statt zur Mitte. Bis v0.103 legte
     * `kreuzAufstellen` die Liste an und niemand ruehrte sie mehr an; seit
     * v0.104 stellt `aufstellungAnpassen` zusaetzliche Bauernreihen auf und
     * baut die Liste deshalb neu.
     */
    for (const id of ["kreuzKlein", "kreuz", "kreuzGross", "kreuzKleinEinzeln"]) {
        for (const staerke of ["wenig", "normal", "viel", "voll"]) {
            const runde = festeAufstellung(id, staerke);
            const brett = runde.stand.brett;
            const bekannt = {};

            for (const eintrag of runde.stand.bauernSeiten) {
                bekannt[eintrag.feld] = eintrag.seite;
            }

            for (let feld = 0; feld < brett.length; feld++) {
                if (SCHACH.artVon(brett[feld]) !== "B") {
                    continue;
                }
                wahr(!!bekannt[feld], id + "/" + staerke + ": Bauer auf "
                    + SCHACH.feldName(feld) + " kennt seine Startseite");
            }

            /* Und umgekehrt: kein Eintrag zeigt auf ein Feld ohne Bauer —
               sonst wanderte eine tote Marke mit einer fremden Figur mit. */
            for (const eintrag of runde.stand.bauernSeiten) {
                gleich(SCHACH.artVon(brett[eintrag.feld]), "B", id + "/" + staerke
                    + ": Eintrag " + eintrag.feld + " zeigt auf einen Bauern");
            }
        }
    }
});

pruefe("Die Zufallsarmee stellt die halbe Armee mittig auf", () => {
    /*
     * DIESE PRUEFUNG HAENGT SEIT v0.104 AN DER STUFE „wenig". Die halbe Armee
     * mit freiem Rand ist genau das, was bis v0.103 „normal" hiess; die Leiter
     * ist am 20.08. um zwei Stufen verschoben worden (Nutzer-Ansage). Der
     * gepruefte Aufbau ist unveraendert, nur sein Knopf heisst anders.
     */
    const regel = SCHACH_VARIANTEN.ARMEE;

    /* Mehrere Kennungen, damit nicht eine einzelne Ziehung geprueft wird. */
    for (const kennung of ["p-a", "p-b", "p-c", "p-d", "p-e"]) {
        const runde = armeePartie("standard", kennung, true, "wenig");
        const variante = SCHACH_VARIANTEN.holen("standard");
        const soll = SCHACH_VARIANTEN.armeeAnzahl(variante, "wenig");
        const platz = SCHACH_VARIANTEN.armeeSpalten(variante, "wenig");
        const breite = SCHACH.breiteVon(runde.stand);

        gleich(soll, 8, "auf dem klassischen Brett acht Figuren (wie vor v0.51)");

        for (const farbe of ["weiss", "schwarz"]) {
            const gezaehlt = figurenZaehlen(runde.stand, farbe);
            const summe = Object.keys(gezaehlt)
                .reduce((wert, art) => wert + gezaehlt[art], 0);

            gleich(summe, soll, kennung + "/" + farbe + ": die halbe Armee");
            wahr(gezaehlt.K >= 1, kennung + "/" + farbe + ": mindestens ein Koenig");
            wahr(gezaehlt.K <= 2, kennung + "/" + farbe + ": hoechstens zwei Koenige");
            wahr(!gezaehlt.D || gezaehlt.D <= regel.hoechstensDamen,
                kennung + "/" + farbe + ": hoechstens eine Dame");
        }

        /* Der Rand bleibt frei — auf dem 8er-Brett je zwei Spalten. */
        gleich(platz.rand, 2, "zwei freie Spalten je Seite");

        for (let feld = 0; feld < SCHACH.felderVon(runde.stand); feld++) {
            const spalte = SCHACH.spalteVon(feld, breite);
            if (spalte >= platz.rand && spalte < platz.rand + platz.spalten) {
                continue;
            }
            gleich(SCHACH.figurAuf(runde.stand, feld), ".",
                kennung + ": Rand frei auf " + SCHACH.feldName(feld));
        }
    }
});

pruefe("Jeder Bauer bekommt beim ersten Zug den Doppelschritt (v0.52)", () => {
    /*
     * DER PUNKT AUS DEM EINGANGSKORB: In der Zufallsarmee kann ein Bauer ganz
     * HINTEN stehen — dort hatte er bis v0.51 keinen Doppelschritt, weil die
     * Startreihe fest auf `hoehe - 2` stand. Erlaubt sind jetzt beide
     * Grundreihen.
     */
    const runde = SCHACH_RUNDE.leereRunde(1000, "standard", "p-doppel", "D");

    runde.stand = SCHACH.standNormalisieren({
        variante: "standard",
        brett: "....k..."
            + "........"
            + "........"
            + "........"
            + "........"
            + "........"
            + "...B...."
            + "B...K...",
        amZug: "weiss",
        rochade: ""
    });

    /* Der Bauer auf der hintersten Reihe (a1) darf zwei Felder. */
    const hinten = SCHACH.zuege(runde.stand, SCHACH.feldNummer("a1"))
        .map((zug) => SCHACH.feldName(zug.nach));
    wahr(hinten.indexOf("a2") !== -1, "ein Feld vor");
    wahr(hinten.indexOf("a3") !== -1, "und zwei — das ist neu");

    /* Der auf der gewohnten Reihe (d2) natuerlich weiterhin auch. */
    const gewohnt = SCHACH.zuege(runde.stand, SCHACH.feldNummer("d2"))
        .map((zug) => SCHACH.feldName(zug.nach));
    wahr(gewohnt.indexOf("d4") !== -1, "der gewohnte Doppelschritt bleibt");
});

pruefe("Weiter vorn gibt es keinen Doppelschritt", () => {
    /* Die Regel darf sich nur auf den GRUNDREIHEN aendern, sonst zoege ein
       Bauer mitten im Spiel ploetzlich wieder zwei Felder. */
    const runde = SCHACH_RUNDE.leereRunde(1000, "standard", "p-doppel2", "D");

    runde.stand = SCHACH.standNormalisieren({
        variante: "standard",
        brett: "....k..."
            + "........"
            + "........"
            + "........"
            + "...B...."
            + "........"
            + "........"
            + "....K...",
        amZug: "weiss",
        rochade: ""
    });

    const ziele = SCHACH.zuege(runde.stand, SCHACH.feldNummer("d4"))
        .map((zug) => SCHACH.feldName(zug.nach));

    wahr(ziele.indexOf("d5") !== -1, "ein Feld vor");
    wahr(ziele.indexOf("d6") === -1, "aber keine zwei");
});

pruefe("Der Rand bleibt auf jeder Karte zwei Spalten (v0.52)", () => {
    /*
     * „Bei der kleinsten Map sollen es weiterhin 2x2 Felder rechts und links
     * frei bleiben, bei der grossen und Doppel-Map nach dem Muster anpassen."
     *
     * Damit faellt die Menge anders aus als in v0.51: nicht die halbe Armee,
     * sondern zwei Grundreihen mal die freien Spalten in der Mitte.
     *
     * SEIT v0.104 IST DAS DIE STUFE „wenig" (vorher „normal") — der freie Rand
     * gehoert zu ihr. Ueber ihr steht die Aufstellung in voller Breite.
     */
    const erwartet = { standard: 8, klein: 4, gross: 12, doppelbrett: 24 };

    for (const id of Object.keys(erwartet)) {
        const variante = SCHACH_VARIANTEN.holen(id);
        const platz = SCHACH_VARIANTEN.armeeSpalten(variante, "wenig");

        gleich(platz.rand, 2, id + ": zwei freie Spalten je Seite");
        gleich(SCHACH_VARIANTEN.armeeAnzahl(variante, "wenig"), erwartet[id],
            id + ": passende Anzahl");
        gleich(platz.spalten * 2, erwartet[id], id + ": zwei Reihen voll");
    }
});

pruefe("Die Menge passt sich jedem Brett an (v0.51)", () => {
    /*
     * DER PUNKT AUS DEM EINGANGSKORB: „beim Standard-Spielfeld waren es 8
     * Figuren wie derzeit, dann skaliere es bei den anderen Karten auch so,
     * dass es von der Menge her passt."
     *
     * Gerechnet wird die HAELFTE der gewohnten Armee. Die 8 des klassischen
     * Bretts bleiben damit, wo sie waren; alle anderen folgen von selbst.
     *
     * Seit v0.104 heisst diese Stufe „wenig" (siehe oben).
     */
    const erwartet = { standard: 8, klein: 4, gross: 12, doppelbrett: 24 };

    for (const id of Object.keys(erwartet)) {
        const runde = armeePartie(id, "p-menge-" + id, true, "wenig");
        for (const farbe of ["weiss", "schwarz"]) {
            const gezaehlt = figurenZaehlen(runde.stand, farbe);
            const summe = Object.keys(gezaehlt)
                .reduce((wert, art) => wert + gezaehlt[art], 0);
            gleich(summe, erwartet[id], id + "/" + farbe + ": so viele stehen da");
        }
    }
});

pruefe("Ohne den Unter-Haken bekommen beide dieselbe Armee (v0.51)", () => {
    /*
     * „Wenn man es nicht anhakt, sollen beide Teams die identischen Einheiten
     * haben — nur zu Beginn wird einmal entschieden, welche Figuren."
     *
     * Geprueft wird nicht die Ziehung, sondern die SYMMETRIE: Die Figurenliste
     * von Weiss muss der von Schwarz gleichen.
     */
    const zaehlenGleich = (runde) => {
        const weiss = figurenZaehlen(runde.stand, "weiss");
        const schwarz = figurenZaehlen(runde.stand, "schwarz");
        const arten = Object.keys(weiss).concat(Object.keys(schwarz));

        for (const art of arten) {
            if ((weiss[art] || 0) !== (schwarz[art] || 0)) {
                return false;
            }
        }
        return true;
    };

    let gleiche = 0;
    let verschiedene = 0;

    for (let nummer = 0; nummer < 30; nummer++) {
        if (zaehlenGleich(armeePartie("standard", "p-sym" + nummer, false))) {
            gleiche++;
        }
        if (!zaehlenGleich(armeePartie("standard", "p-sym" + nummer, true))) {
            verschiedene++;
        }
    }

    gleich(gleiche, 30, "ohne Haken sind beide Armeen immer gleich");
    wahr(verschiedene > 20, "mit Haken sind sie meist verschieden ("
        + verschiedene + " von 30)");
});

pruefe("Der Haken gilt auf jeder Spielart, und die zwei Leben mit ihm", () => {
    /*
     * Bis v0.50 hing beides an der SPIELART „zufallsarmee" und damit am
     * 8-mal-8-Brett. `schach.js` kennt die Regeln der Partie nicht — deshalb
     * wandert `koenigeAlsLeben` beim Aufstellen in den STAND.
     */
    const runde = armeePartie("gross", "p-haken", true);

    gleich(runde.variante, "gross", "die Spielart bleibt, was sie ist");
    gleich(runde.stand.koenigeAlsLeben, true, "die zwei Leben stehen im Stand");
    gleich(SCHACH_RUNDE.armeeAn(runde), true, "und der Haken wird erkannt");

    /* Ohne Haken bleibt die gewohnte Aufstellung stehen. */
    const ohne = SCHACH_RUNDE.leereRunde(1000, "gross", "p-normal", "Normal");

    gleich(ohne.stand.brett, SCHACH.neuerStand("gross").brett, "unveraendert");
    gleich(ohne.stand.koenigeAlsLeben, false, "und nur ein Leben");
    gleich(SCHACH_RUNDE.armeeAn(ohne), false, "kein Haken, keine Zufallsarmee");
});

pruefe("Die alte Spielart Zufallsarmee laeuft weiter", () => {
    /*
     * Sie ist seit v0.51 versteckt, aber laufende Partien tragen ihre Kennung
     * im Stand — sie muessen sich weiter genauso verhalten wie in v0.49.
     */
    const alt = SCHACH_VARIANTEN.holen("zufallsarmee");

    gleich(alt.versteckt, true, "nicht mehr zur Auswahl");
    wahr(SCHACH_VARIANTEN.zurAuswahl().every((eintrag) => eintrag.id !== "zufallsarmee"),
        "und wirklich nicht in der Auswahl");

    const runde = SCHACH_RUNDE.leereRunde(1000, "zufallsarmee", "p-alt", "Alt");
    const gezaehlt = figurenZaehlen(runde.stand, "weiss");
    const summe = Object.keys(gezaehlt).reduce((wert, art) => wert + gezaehlt[art], 0);

    /*
     * WIE VIELE FIGUREN, SAGT DIE STUFE — und die Vorgabe ist „normal". Bis
     * v0.103 waren das acht (die halbe Armee), seit der neuen Leiter in v0.104
     * sind es sechzehn. Verglichen wird deshalb gegen die angekuendigte Zahl
     * und nicht mehr gegen eine getippte: Die Spielart soll weiterlaufen, nicht
     * eine bestimmte Menge festhalten.
     */
    gleich(summe, SCHACH_VARIANTEN.armeeAnzahl(alt), "so viele wie angekuendigt");
    gleich(SCHACH_RUNDE.armeeAn(runde), true, "auch ohne Haken");
    gleich(SCHACH.koenigSchlagbarFuer(runde.stand, "weiss"),
        SCHACH.koenigFelder(runde.stand, "weiss").length > 1,
        "und die zwei Leben gelten");
});

pruefe("Dieselbe Kennung ergibt dieselbe Armee", () => {
    /*
     * DIE EISERNE REGEL: `Math.random()` hat im Modell nichts zu suchen. Sonst
     * saehe jedes Geraet ein anderes Brett, und der erste Schreibvorgang
     * gewaenne — dieselbe Falle wie v0.8.
     */
    const eine = SCHACH_RUNDE.leereRunde(1000, "zufallsarmee", "p-gleich", "A");
    const andere = SCHACH_RUNDE.leereRunde(9999, "zufallsarmee", "p-gleich", "B");

    gleich(andere.stand.brett, eine.stand.brett, "gerechnet, nicht gewuerfelt");

    const fremde = SCHACH_RUNDE.leereRunde(1000, "zufallsarmee", "p-anders", "C");
    wahr(fremde.stand.brett !== eine.stand.brett,
        "eine andere Partie bekommt eine andere Armee");
});

pruefe("Eine Armee ist wirklich gemischt, nicht siebenmal dieselbe Figur", () => {
    /*
     * DER FEHLER AUS v0.49 (gefunden beim Nachmessen, behoben in v0.49.1):
     *
     * Die sieben Ziehungen einer Seite hiessen `…|figur|1` bis `…|figur|7` und
     * unterschieden sich damit nur im LETZTEN Zeichen der Saat. `_zufallsWert`
     * ist FNV-1a; ein Unterschied ganz am Ende erlebt nur noch eine einzige
     * Multiplikation und verschiebt das Ergebnis um rund 0,4 Prozent. Alle
     * sieben Werte lagen also praktisch aufeinander, und jede Seite bekam
     * siebenmal fast dieselbe Figur (…ksss / ssss…).
     *
     * Geprueft wird deshalb nicht die Verteilung, sondern die VIELFALT: Wie
     * viele VERSCHIEDENE Figurenarten eine Seite im Schnitt hat. Gemessen sind
     * es 4,8; beim Fehler waren es 1,4. Die Schwelle liegt mit 3,5 weit von
     * beidem entfernt.
     *
     * NICHT geprueft wird, dass es NIE sechs gleiche gibt: Bei sieben echt
     * unabhaengigen Ziehungen kommt das vor (gemessen 0,4 Prozent der Seiten),
     * und eine Schwelle darauf war der erste Versuch — sie schlug fehl, obwohl
     * der Code richtig war. Ein seltener Ausreisser ist Zufall, kein Fehler;
     * geprueft wird stattdessen, dass er selten BLEIBT.
     */
    let summeArten = 0;
    let fastEinfarbig = 0;
    const versuche = 500;

    for (let nummer = 0; nummer < versuche; nummer++) {
        const runde = SCHACH_RUNDE.leereRunde(
            1000, "zufallsarmee", "p-vielfalt-" + nummer, "V");

        /*
         * AUF ACHT FIGUREN GEEICHT (seit v0.104). Die Zahlen oben — 4,8 Arten
         * im Schnitt, 0,4 Prozent Ausreisser — sind an einer Armee von ACHT
         * gemessen. Seit die Vorgabe „normal" sechzehn Figuren aufstellt, waeren
         * sechs gleiche voellig gewoehnlich, und die Schwelle traefe den Zufall
         * statt des Fehlers. Also ausdruecklich „wenig", dieselbe Ziehung wie
         * frueher.
         */
        runde.regeln.armeeStaerke = "wenig";
        SCHACH_RUNDE.armeeAufstellen(runde);

        const gezaehlt = figurenZaehlen(runde.stand, "weiss");
        const arten = Object.keys(gezaehlt);

        summeArten += arten.length;

        /* Der Koenig zaehlt nicht mit — er wird gesetzt, nicht gezogen. */
        for (const art of arten) {
            if (art !== "K" && gezaehlt[art] >= 6) {
                fastEinfarbig++;
            }
        }
    }

    const schnitt = summeArten / versuche;
    wahr(schnitt > 3.5, "im Schnitt mehr als dreieinhalb Arten je Seite (waren "
        + schnitt.toFixed(2) + ")");

    const anteil = fastEinfarbig / versuche * 100;
    wahr(anteil < 5, "fast einfarbige Armeen bleiben die Ausnahme ("
        + anteil.toFixed(1) + " Prozent)");
});

pruefe("Die gezaehlten Ziehungen einer Armee streuen wirklich", () => {
    /*
     * Dasselbe eine Ebene tiefer, an der Saat selbst: Die Werte zweier
     * benachbarter Stellen duerfen nicht dicht beieinander liegen. Das ist der
     * Test, der den Fehler von v0.49 sofort gefunden haette.
     */
    const basis = "p-streuung|armee|weiss";
    const werte = [];

    for (let stelle = 0; stelle < 8; stelle++) {
        werte.push(SCHACH_RUNDE._zufallsWert(
            SCHACH_RUNDE._armeeSaat(stelle, "figur", basis)));
    }

    let groessterAbstand = 0;
    for (let stelle = 1; stelle < werte.length; stelle++) {
        groessterAbstand = Math.max(groessterAbstand,
            Math.abs(werte[stelle] - werte[stelle - 1]));
    }

    wahr(groessterAbstand > 0.2, "aufeinanderfolgende Ziehungen liegen auseinander "
        + "(groesster Abstand " + groessterAbstand.toFixed(3) + ")");
});

pruefe("Zwei Koenige kommen vor, aber selten", () => {
    let mitZweien = 0;
    const versuche = 200;

    for (let nummer = 0; nummer < versuche; nummer++) {
        const runde = SCHACH_RUNDE.leereRunde(1000, "zufallsarmee", "p-" + nummer, "Z");
        if (figurenZaehlen(runde.stand, "weiss").K === 2) {
            mitZweien++;
        }
    }

    const anteil = mitZweien / versuche * 100;
    wahr(mitZweien > 0, "es kommt vor (" + mitZweien + " von " + versuche + ")");
    wahr(anteil < SCHACH_VARIANTEN.ARMEE.zweiKoenige * 2,
        "und bleibt selten (" + anteil.toFixed(1) + " Prozent)");
});

/*
 * Ein Brett der Zufallsarmee, von Hand gestellt: Weiss hat zwei Koenige
 * (e1, a1), Schwarz einen (e8). Ein schwarzer Turm steht auf h1 und kann den
 * Koenig auf a1 nicht erreichen — die Reihe ist frei bis a1.
 */
function zweiLebenPartie(brett) {
    const runde = SCHACH_RUNDE.leereRunde(1000, "zufallsarmee", "p-leben", "Leben");

    runde.stand = SCHACH.standNormalisieren({
        variante: "zufallsarmee",
        brett: brett,
        amZug: "schwarz",
        rochade: ""
    });

    return runde;
}

pruefe("Mit zwei Koenigen gibt es kein Schach", () => {
    /* Schwarzer Turm auf e5 greift die e-Linie an, weisser Koenig auf e1. */
    const runde = zweiLebenPartie(
        "....k..."
        + "........"
        + "........"
        + "....t..."
        + "........"
        + "........"
        + "........"
        + "K...K...");

    gleich(SCHACH.imSchach(runde.stand, "weiss"), false,
        "wer zwei Koenige hat, steht nie im Schach");
    gleich(SCHACH.koenigSchlagbarFuer(runde.stand, "weiss"), true,
        "sein Koenig ist eine Figur wie jede andere");
    gleich(SCHACH.koenigSchlagbarFuer(runde.stand, "schwarz"), false,
        "der einzelne schwarze Koenig dagegen nicht");

    /* Und der Turm darf ihn wirklich schlagen. */
    const ziele = SCHACH.zuege(runde.stand, SCHACH.feldNummer("e5"))
        .map((zug) => SCHACH.feldName(zug.nach));
    wahr(ziele.indexOf("e1") !== -1, "der Turm schlaegt den einen Koenig");
});

pruefe("Nach dem ersten Koenig gelten wieder Schach und Matt", () => {
    let runde = zweiLebenPartie(
        "....k..."
        + "........"
        + "........"
        + "....t..."
        + "........"
        + "........"
        + "........"
        + "K...K...");

    runde.laeuft = true;
    runde = SCHACH_RUNDE.teamBeitreten(runde, "id-anna", "weiss", 1000);
    runde = SCHACH_RUNDE.teamBeitreten(runde, "id-bert", "schwarz", 1000);

    /* Schwarz schlaegt den Koenig auf e1 — Weiss hat noch einen. */
    runde = SCHACH_RUNDE.ziehen(runde, "id-bert",
        SCHACH.feldNummer("e5"), SCHACH.feldNummer("e1"), "D", "Bert", 2000);

    wahr(runde !== null, "der Koenig laesst sich schlagen");
    gleich(SCHACH.koenigFelder(runde.stand, "weiss").length, 1, "einer steht noch");
    gleich(SCHACH.koenigSchlagbarFuer(runde.stand, "weiss"), false,
        "und der letzte ist wieder unantastbar");

    /* Der Turm auf e1 steht jetzt in derselben Reihe wie der Koenig auf a1. */
    gleich(SCHACH.imSchach(runde.stand, "weiss"), true, "Weiss steht im Schach");

    /* Und schlagen laesst er sich nicht mehr. */
    const ziele = SCHACH.zuege(runde.stand, SCHACH.feldNummer("e1"))
        .map((zug) => SCHACH.feldName(zug.nach));
    wahr(ziele.indexOf("a1") === -1, "den letzten Koenig schlaegt niemand");
});

pruefe("Wer gar keinen Koenig mehr hat, verliert", () => {
    const runde = zweiLebenPartie(
        "....k..."
        + "........"
        + "........"
        + "........"
        + "........"
        + "........"
        + "........"
        + "....t...");

    const lage = SCHACH.lage(runde.stand);
    gleich(lage.art, "matt", "die Partie ist entschieden");
    gleich(lage.sieger, "schwarz", "Schwarz gewinnt");
});

/* ------------------------------------------------------------------ *
 * Gluecksboxen-Regen (seit v0.50)
 * ------------------------------------------------------------------ */

pruefe("Der Regen haengt am ANTEIL der freien Felder", () => {
    /*
     * Nicht an ihrer Anzahl: Sonst regnete es auf dem Doppelbrett (128 Felder)
     * von Beginn an und auf dem kleinen Brett (36) nie.
     */
    const voll = SCHACH_VARIANTEN.regenChance(0, 64);
    const halb = SCHACH_VARIANTEN.regenChance(31, 64);
    const leer = SCHACH_VARIANTEN.regenChance(62, 64);

    gleich(voll, 0, "auf vollem Brett regnet es nicht");
    gleich(leer, 100, "wenn nur die zwei Koenige stehen, regnet es sicher");
    wahr(halb > voll && halb < leer, "dazwischen steigt es an");

    /* Derselbe Fuellstand, anderes Brett: dieselbe Chance. */
    gleich(SCHACH_VARIANTEN.regenChance(17, 36).toFixed(4),
        SCHACH_VARIANTEN.regenChance(34, 70).toFixed(4),
        "der Anteil zaehlt, nicht die Zahl");
});

pruefe("Der Regen steigert sich exponentiell (v0.53)", () => {
    /*
     * DER PUNKT AUS DEM EINGANGSKORB: „steigert sich waehrend der Runde
     * exponentiell … so dass, wenn alle Felder frei sind bis auf die zwei
     * Koenige, jedes freie Feld einen Wuerfel bekommt."
     *
     * Geprueft wird beides: der Grenzfall und die KRUEMMUNG — bei doppelt so
     * viel Platz muss deutlich MEHR als das Doppelte kommen, sonst waere es
     * wieder die gerade Linie von v0.52.
     */
    gleich(SCHACH_VARIANTEN.regenAnzahl(62, 64), 62,
        "nur noch die Koenige: jedes freie Feld bekommt einen");

    const wenig = SCHACH_VARIANTEN.regenAnzahl(16, 64);
    const doppelt = SCHACH_VARIANTEN.regenAnzahl(32, 64);

    wahr(doppelt > wenig * 2, "doppelt so viel Platz, mehr als doppelt so viele ("
        + wenig + " gegen " + doppelt + ")");
    wahr(SCHACH_VARIANTEN.regenAnzahl(1, 64) >= 1, "aber immer mindestens einer");
    wahr(SCHACH_VARIANTEN.regenAnzahl(10, 64) <= 10, "und nie mehr als freie Felder");
});

pruefe("Fuenf Stufen aendern die Kurve, nicht ihr Ende (v0.59, Wunsch #11)", () => {
    /*
     * DER PUNKT AUS DEM EINGANGSKORB: „das Ende soll gleich sein, nur davor
     * die Kurve viel steiler." Stufe 5 ist der Verlauf von v0.53 und die
     * Vorgabe; 1 laesst es lange fast gar nicht regnen.
     */
    const stufen = [1, 2, 3, 4, 5];

    /* Der Grenzfall ist bei JEDER Stufe derselbe. */
    for (const stufe of stufen) {
        gleich(SCHACH_VARIANTEN.regenAnzahl(62, 64, stufe), 62,
            "Stufe " + stufe + ": nur noch die Koenige, jedes Feld bekommt einen");
        gleich(SCHACH_VARIANTEN.regenChance(62, 64, stufe), 100,
            "Stufe " + stufe + ": und es regnet sicher");
        gleich(SCHACH_VARIANTEN.regenChance(0, 64, stufe), 0,
            "Stufe " + stufe + ": auf vollem Brett gar nicht");
    }

    /* Davor liegt Stufe 1 unter jeder hoeheren — sie steigt spaeter an. */
    for (let stufe = 1; stufe < 5; stufe++) {
        wahr(SCHACH_VARIANTEN.regenChance(32, 64, stufe)
            < SCHACH_VARIANTEN.regenChance(32, 64, stufe + 1),
        "Stufe " + stufe + " regnet auf halbem Brett seltener als Stufe " + (stufe + 1));
    }

    /* Ohne Angabe gilt die Vorgabe — jede Partie von vor v0.59 rechnet
       damit genau weiter wie bisher. */
    gleich(SCHACH_VARIANTEN.regenChance(32, 64),
        SCHACH_VARIANTEN.regenChance(32, 64, SCHACH_VARIANTEN.REGEN.STUFE_VORGABE),
        "ohne Stufe gilt die Vorgabe");
    gleich(SCHACH_VARIANTEN.regenChance(32, 64, 99),
        SCHACH_VARIANTEN.regenChance(32, 64, SCHACH_VARIANTEN.REGEN.STUFE_VORGABE),
        "und eine unbekannte Stufe faellt darauf zurueck");
});

pruefe("Die Stufe gehoert zur Partie und ueberlebt das Normalisieren (v0.59)", () => {
    const runde = SCHACH_RUNDE.leereRunde(1000, "standard", "p-stufe", "R");
    gleich(runde.regeln.regenStufe, SCHACH_VARIANTEN.REGEN.STUFE_VORGABE,
        "eine neue Partie faengt mit der Vorgabe an");

    const gesetzt = SCHACH_RUNDE.kopieren(runde);
    gesetzt.regeln.regenStufe = 2;
    gleich(SCHACH_RUNDE.regenStufe(SCHACH_RUNDE.kopieren(gesetzt)), 2,
        "eine gesetzte Stufe bleibt stehen");

    const unsinn = SCHACH_RUNDE.kopieren(runde);
    unsinn.regeln.regenStufe = 42;
    gleich(SCHACH_RUNDE.regenStufe(SCHACH_RUNDE.kopieren(unsinn)),
        SCHACH_VARIANTEN.REGEN.STUFE_VORGABE,
        "Unsinn faellt auf die Vorgabe zurueck");
});

pruefe("Der Regen braucht den Wuerfel-Haken", () => {
    /* Ein Regen ohne Wuerfel waere keiner — deshalb fragt `regenAn` beides.
       Seit v0.71 steht die Menge als STUFE in der Partie, nicht als Haken. */
    const ohne = SCHACH_RUNDE.leereRunde(1000, "standard", "p-regen", "R");
    ohne.regeln.lootboxMenge = "regen";
    ohne.regeln.faehigkeiten = false;
    gleich(SCHACH_RUNDE.regenAn(ohne), false, "ohne Wuerfel kein Regen");

    const mit = SCHACH_RUNDE.kopieren(ohne);
    mit.regeln.faehigkeiten = true;
    gleich(SCHACH_RUNDE.regenAn(mit), true, "mit Wuerfeln schon");

    const aus = SCHACH_RUNDE.kopieren(mit);
    aus.regeln.lootboxMenge = "wenig";
    gleich(SCHACH_RUNDE.regenAn(aus), false, "und nur oberhalb der untersten Stufe");
});

pruefe("Im Regen erscheinen mehr Wuerfel als auf der untersten Stufe", () => {
    /*
     * Gemessen wird ueber viele Halbzuege auf demselben Brett: Der Regen muss
     * SPUERBAR mehr auswerfen, sonst ist die Stufe eine Behauptung.
     */
    const zaehlen = (menge) => {
        let gesamt = 0;

        for (let nummer = 0; nummer < 120; nummer++) {
            const runde = SCHACH_RUNDE.leereRunde(1000, "standard", "p-r" + nummer, "R");
            runde.regeln.faehigkeiten = true;
            runde.regeln.lootboxMenge = menge;
            runde.zugZaehler = nummer;
            /* Im Spiel laufen Takt und Zugzähler bei echten Zügen gemeinsam —
               der Takt steuert seit T1 die Kadenz, also führt ihn der Test mit. */
            runde.stand.takt = nummer;

            SCHACH_RUNDE._bonusNachziehen(runde);
            gesamt += runde.bonus.length;
        }

        return gesamt;
    };

    const wenig = zaehlen("wenig");
    const viel = zaehlen("regen");

    wahr(viel > wenig * 2, "der Regen wirft deutlich mehr aus ("
        + viel + " gegen " + wenig + ")");
});

pruefe("Ein Plus-Item verschiebt den Lootbox-Fahrplan nicht (T1, v0.83.1)", () => {
    /*
     * DIE MELDUNG VOM 18.08.: Nach dem Einsetzen der Mauer (Pluszeichen, der
     * Zug bleibt einem) kamen Items, die ohne sie nicht gekommen waeren.
     * Ursache: Die Kadenz der untersten Stufe hing am zugZaehler, den auch
     * jede Faehigkeit erhoeht (Sperr-Sicherung). Massgeblich ist der TAKT —
     * er steigt nur bei echten Zuegen.
     */
    const gerade = SCHACH_RUNDE.leereRunde(1000, "standard", "p-t1", "R");
    gerade.regeln.faehigkeiten = true;
    gerade.regeln.lootboxMenge = "wenig";

    /* Takt ungerade (kein voller Zug abgeschlossen), zugZaehler durch eine
       eingesetzte Faehigkeit gerade — die alte, falsche Uhr wuerde werfen. */
    gerade.stand.takt = 3;
    gerade.zugZaehler = 4;
    SCHACH_RUNDE._bonusNachziehen(gerade);
    gleich(gerade.bonus.length, 0, "bei ungeradem Takt kommt nichts");

    /* Umgekehrt (Takt gerade, zugZaehler ungerade) darf die Sperre nicht
       greifen: Ueber genug Versuche muss wenigstens eine Box erscheinen —
       WANN genau, ist Sache des gerechneten Zufalls, nicht dieses Tests. */
    let gekommen = 0;
    for (let schritt = 0; schritt < 60 && gekommen === 0; schritt++) {
        const runde = SCHACH_RUNDE.leereRunde(1000, "standard", "p-t1-" + schritt, "R");
        runde.regeln.faehigkeiten = true;
        runde.regeln.lootboxMenge = "wenig";
        runde.stand.takt = 2 * schritt;
        runde.zugZaehler = 2 * schritt + 1;
        SCHACH_RUNDE._bonusNachziehen(runde);
        gekommen = runde.bonus.length;
    }
    wahr(gekommen > 0, "bei geradem Takt sperrt der zugZaehler nicht");
});

/* ------------------------------------------------------------------ *
 * Die vier Stufen fuer die Lootbox-Menge (seit v0.71)
 * ------------------------------------------------------------------ */

pruefe("Eine Partie von frueher behaelt ihre Menge (v0.71)", () => {
    /*
     * DER KERN DES ADDITIVEN DATENVERTRAGS: `lootboxMenge` gibt es erst seit
     * v0.71. Jede laufende Partie kennt nur `regen` und `regenStufe` — daraus
     * muss dieselbe Menge herauskommen, mit der sie angelegt wurde.
     */
    const alte = (regen, stufe) => {
        const runde = SCHACH_RUNDE.leereRunde(1000, "standard", "p-alt", "R");
        runde.regeln.faehigkeiten = true;
        runde.regeln.regen = regen;
        runde.regeln.regenStufe = stufe;
        delete runde.regeln.lootboxMenge;

        return SCHACH_RUNDE.lootboxMenge(SCHACH_RUNDE.kopieren(runde));
    };

    gleich(alte(false, 5), "wenig", "ohne Regen ist es die unterste Stufe");
    gleich(alte(true, 5), "regen", "der Regen von v0.53 bleibt der Regen");
    gleich(alte(true, 3), "viele", "eine mittlere Reglerstellung wird viele");
    gleich(alte(true, 1), "normal", "die flachste Stellung wird normal");
    gleich(alte(true, undefined), "regen",
        "ein Haken ohne Reglerstellung ist der Regen von v0.53");

    /* Und eine Partie, die die Stufe kennt, laesst sie sich nicht wegrechnen. */
    const neue = SCHACH_RUNDE.leereRunde(1000, "standard", "p-neu", "R");
    neue.regeln.lootboxMenge = "viele";
    neue.regeln.regen = false;
    gleich(SCHACH_RUNDE.lootboxMenge(SCHACH_RUNDE.kopieren(neue)), "viele",
        "die Stufe geht vor den beiden alten Schaltern");

    /* Unsinn faellt auf die Vorgabe zurueck. */
    const kaputt = SCHACH_RUNDE.leereRunde(1000, "standard", "p-kaputt", "R");
    kaputt.regeln.lootboxMenge = "sintflut";
    gleich(SCHACH_RUNDE.lootboxMenge(SCHACH_RUNDE.kopieren(kaputt)), "wenig",
        "eine unbekannte Stufe faellt auf die Vorgabe zurueck");
});

pruefe("Die vier Stufen sind eine Leiter ohne Knick (v0.71)", () => {
    /*
     * Jede Stufe muss bei JEDEM Fuellstand mindestens so viel liefern wie die
     * darunter — sonst waere die Reihenfolge der Kaestchen eine Luege. Genau
     * dafuer nehmen `mengenChance` und `mengenAnzahl` das Groessere von
     * Grundrauschen und Fuellstands-Kurve.
     */
    const reihe = SCHACH_VARIANTEN.LOOTBOX_MENGEN.map((menge) => menge.id);

    gleich(reihe.join(","), "wenig,normal,viele,regen", "die Reihenfolge steht fest");

    for (const freie of [4, 16, 32, 48, 62]) {
        for (let stelle = 1; stelle < reihe.length; stelle++) {
            const drunter = SCHACH_VARIANTEN.mengenChance(reihe[stelle - 1], freie, 64);
            const drueber = SCHACH_VARIANTEN.mengenChance(reihe[stelle], freie, 64);

            wahr(drueber >= drunter, reihe[stelle] + " ist bei " + freie
                + " freien Feldern nicht seltener als " + reihe[stelle - 1]
                + " (" + drueber.toFixed(2) + " gegen " + drunter.toFixed(2) + ")");

            /* Dasselbe fuer die Anzahl, bei ein und demselben Zufallswert. */
            const anzahlDrunter =
                SCHACH_VARIANTEN.mengenAnzahl(reihe[stelle - 1], freie, 64, 0.5);
            const anzahlDrueber =
                SCHACH_VARIANTEN.mengenAnzahl(reihe[stelle], freie, 64, 0.5);

            wahr(anzahlDrueber >= anzahlDrunter, reihe[stelle]
                + " wirft nicht weniger aus als " + reihe[stelle - 1]);
        }
    }

    /* Am Ende bekommt jedes freie Feld eine Lootbox — auf der obersten Stufe. */
    gleich(SCHACH_VARIANTEN.mengenAnzahl("regen", 62, 64, 0), 62,
        "stehen nur noch die Koenige, ist jedes freie Feld dran");
});

pruefe("Der Ungluecks-Anteil haengt am Fuellstand (v0.77)", () => {
    /*
     * NUTZER-ANSAGE 18.08.: „Bei Lootbox-Regen soll die Wahrscheinlichkeit
     * gesteigert werden, dass Ungluecksboxen erscheinen" — auf Rueckfrage
     * praezisiert zu „so wie bei den normalen Lootboxen, anhand der freien
     * Felder".
     *
     * Bis v0.76 war es eine feste Zahl (`PECH_CHANCE`, 12). Jetzt gilt
     * dieselbe Mechanik wie bei der MENGE seit v0.71 — mit denselben Kurven
     * und denselben zwei Klammern.
     */
    const grund = SCHACH_VARIANTEN.PECH_CHANCE;
    const hoch = SCHACH_VARIANTEN.PECH_CHANCE_HOCH;

    wahr(hoch > grund, "der Hoechstwert liegt ueber dem Grundwert");

    /* 1. „wenig" haengt grundsaetzlich nicht am Fuellstand — auch hier nicht. */
    for (const freie of [4, 32, 62]) {
        gleich(SCHACH_VARIANTEN.pechChance("wenig", freie, 64), grund,
            "wenig bleibt bei " + freie + " freien Feldern beim Grundwert");
    }

    /* 2. Auf vollem Brett faellt keine Stufe unter den Grundwert. */
    for (const menge of SCHACH_VARIANTEN.LOOTBOX_MENGEN) {
        wahr(SCHACH_VARIANTEN.pechChance(menge.id, 0, 64) >= grund,
            menge.id + " unterschreitet den Grundwert nicht");
    }

    /* 3. Je leerer das Brett, desto mehr Unglueck — und nie mehr als der
       Hoechstwert. */
    let vorher = 0;
    for (const freie of [0, 16, 32, 48, 62]) {
        const wert = SCHACH_VARIANTEN.pechChance("regen", freie, 64);

        wahr(wert >= vorher, "bei " + freie + " freien Feldern nicht weniger als davor ("
            + wert.toFixed(2) + " gegen " + vorher.toFixed(2) + ")");
        wahr(wert <= hoch, "und nie ueber dem Hoechstwert");
        vorher = wert;
    }

    /* 4. Steht nur noch das, was stehen bleibt, ist der Hoechstwert erreicht:
       `Math.pow(1, n)` ist 1, bei jeder Kurve. */
    gleich(SCHACH_VARIANTEN.pechChance("regen", 62, 64), hoch,
        "auf dem leeren Brett der Hoechstwert");

    /* 5. Dieselbe Leiter wie bei der Menge: keine Stufe ist harmloser als die
       darunter. */
    const reihe = SCHACH_VARIANTEN.LOOTBOX_MENGEN.map((menge) => menge.id);
    for (const freie of [4, 16, 32, 48, 62]) {
        for (let stelle = 1; stelle < reihe.length; stelle++) {
            wahr(SCHACH_VARIANTEN.pechChance(reihe[stelle], freie, 64)
                >= SCHACH_VARIANTEN.pechChance(reihe[stelle - 1], freie, 64),
                reihe[stelle] + " bringt bei " + freie
                + " freien Feldern nicht weniger Unglueck als " + reihe[stelle - 1]);
        }
    }

    /* 6. Was IN einem Unglueck steckt, hat sich nicht geaendert: die Leiter
       der Stufen bleibt, gruen am haeufigsten. Das war der zweite Teil des
       Wunsches. Seit v0.84 wird sie unter den BELEGTEN Stufen geprueft — eine
       leere Stufe (Blau, seit Ausdehnung und Einsturz aus dem Spiel sind) kommt
       gar nicht mehr vor, und ihre Chance verteilt sich auf die uebrigen. */
    const gezogen = {};
    for (let schritt = 0; schritt < 1000; schritt++) {
        const art = SCHACH_VARIANTEN.pechZiehen(schritt / 1000);
        const stufe = SCHACH_VARIANTEN.pechStufeVon(art).id;
        gezogen[stufe] = (gezogen[stufe] || 0) + 1;
    }

    const wieOft = (id) => gezogen[id] || 0;
    const belegt = SCHACH_VARIANTEN.STUFEN
        .filter((stufe) => SCHACH_VARIANTEN.pechDerStufe(stufe.id).length > 0);

    wahr(belegt.length > 1, "es gibt mehr als eine belegte Stufe");
    for (let stelle = 1; stelle < belegt.length; stelle++) {
        wahr(wieOft(belegt[stelle - 1].id) > wieOft(belegt[stelle].id),
            belegt[stelle - 1].id + " kommt oefter als " + belegt[stelle].id);
    }

    for (const stufe of SCHACH_VARIANTEN.STUFEN) {
        if (SCHACH_VARIANTEN.pechDerStufe(stufe.id).length === 0) {
            gleich(wieOft(stufe.id), 0, "die leere Stufe " + stufe.id + " kommt nie");
        }
    }
});

pruefe("Eine Partie merkt sich, mit welcher Version sie angelegt wurde (v0.77)", () => {
    /*
     * Aus der Frage „laufende Matches sollen in der zu Start verfuegbaren
     * Version bleiben — oder gibt es andere Loesungen?" (18.08.). Gebaut wurde
     * nicht das Einfrieren, sondern der Stempel; die Begruendung steht in
     * ROADMAP.md, Buendel O3.
     *
     * In den Tests ist konfig.js nicht geladen, `KONFIG` also unbekannt. Genau
     * das muss der Stempel aushalten, ohne zu werfen — im Browser steht dort
     * die Nummer.
     */
    const frisch = SCHACH_RUNDE.leereRunde(1000, "standard", "p-stempel", "R");
    gleich(typeof frisch.angelegtMit, "string", "der Stempel ist immer ein Text");

    /* Er ueberlebt das Normalisieren — sonst waere er beim ersten Laden weg. */
    const geladen = SCHACH_RUNDE.normalisieren(
        Object.assign({}, frisch, { angelegtMit: "0.76.0" }));
    gleich(geladen.angelegtMit, "0.76.0", "und kommt aus dem Gespeicherten zurueck");

    /* Eine Partie von vor v0.77 hat ihn nicht — dann bleibt er leer, statt
       etwas zu behaupten. */
    const alt = Object.assign({}, frisch);
    delete alt.angelegtMit;
    gleich(SCHACH_RUNDE.normalisieren(alt).angelegtMit, "",
        "eine Partie von frueher bekommt keinen erfundenen Stempel");
});

pruefe("Die unterste Stufe wirft nur nach vollen Zuegen aus (v0.71)", () => {
    /*
     * „wenig" heisst: hoechstens einmal je vollem Zug. Gezaehlt wird in
     * echten Halbzuegen — dem TAKT: Seit v0.83.1 (T1) haengt die Kadenz
     * nicht mehr am zugZaehler, den auch jede Faehigkeit erhoeht.
     */
    const werfen = (menge, zaehler) => {
        const runde = SCHACH_RUNDE.leereRunde(1000, "standard", "p-halb", "R");
        runde.regeln.faehigkeiten = true;
        runde.regeln.lootboxMenge = menge;
        runde.stand.takt = zaehler;
        runde.zugZaehler = zaehler;

        SCHACH_RUNDE._bonusNachziehen(runde);
        return runde.bonus.length;
    };

    let ungeradeWenig = 0;
    let ungeradeNormal = 0;

    for (let zaehler = 1; zaehler < 80; zaehler += 2) {
        ungeradeWenig += werfen("wenig", zaehler);
        ungeradeNormal += werfen("normal", zaehler);
    }

    gleich(ungeradeWenig, 0, "auf der untersten Stufe kommt nach einem halben Zug nichts");
    wahr(ungeradeNormal > 0, "auf normal schon");
});

/* ------------------------------------------------------------------ *
 * Beruehren heisst Einsammeln, und die Restzeit (seit v0.53)
 * ------------------------------------------------------------------ */

pruefe("Eine Faehigkeit sammelt Wuerfel ein, die sie beruehrt (v0.53)", () => {
    /*
     * DER PUNKT AUS DEM EINGANGSKORB: „wenn Figuren auf Feldern spawnen oder
     * mit Faehigkeiten dieses Feld erreichen, soll direkt das Item eingesammelt
     * werden — sprich bei Nudelholz oder sonstigen Bewegungen."
     *
     * Vorher konnte nur ein ZUG einsammeln. Ein Wuerfel unter einer per
     * Bauernschub vorgerueckten Figur blieb fuer immer liegen: Man sammelt ihn
     * nur durch Betreten ein, und betreten wurde er nie.
     */
    let runde = faehigkeitenPartie();

    /* Auf a3 liegt ein Wuerfel; der Bauer auf a2 rueckt mit dem Bauernschub
       genau dorthin vor. */
    runde.bonus = [{ feld: SCHACH.feldNummer("a3"), art: "", stufe: "gruen" }];

    const vorher = runde.faehigkeiten.weiss.length;
    runde = einsetzen(runde, "bauernschub", -1);

    wahr(runde !== null, "eingesetzt");
    gleich(SCHACH.figurAuf(runde.stand, SCHACH.feldNummer("a3")), "B",
        "der Bauer steht jetzt dort");
    gleich(runde.bonus.length, 0, "der Wuerfel ist weg");
    gleich(runde.faehigkeiten.weiss.length, vorher + 1,
        "und die Faehigkeit ist gutgeschrieben");
});

pruefe("Der Wuerfel geht an die Seite der geschobenen Figur (v0.59, Wunsch #6)", () => {
    /*
     * BIS v0.58 ZAEHLTEN NUR EIGENE FIGUREN. Schob eine Faehigkeit eine
     * GEGNERISCHE Figur ueber einen Wuerfel, bekam ihn niemand — er lag unter
     * ihr und war fuer immer unerreichbar, genau der Fall, den „Beruehren
     * heisst Einsammeln" (v0.53) abschaffen sollte.
     *
     * Seit v0.59 sammelt die Seite ein, DEREN Figur auf dem Feld landet. Wer
     * mit dem Nudelholz gegnerische Figuren schiebt, kann dem Gegner also
     * etwas schenken — das ist der Preis der Faehigkeit, nicht ein Fehler.
     */
    let runde = faehigkeitenPartie();

    /* Ein Wuerfel mitten im Nichts, den das Erdbeben beruehrt. */
    const feld = SCHACH.feldNummer("d7");
    runde.bonus = [{ feld: feld, art: "", stufe: "gruen" }];

    const vorherWeiss = runde.faehigkeiten.weiss.length;
    const vorherSchwarz = runde.faehigkeiten.schwarz.length;
    const nachher = einsetzen(runde, "erdbeben", feld);

    if (nachher) {
        const farbe = SCHACH.farbeVon(SCHACH.figurAuf(nachher.stand, feld));

        if (farbe === "schwarz") {
            gleich(nachher.bonus.length, 0, "der Wuerfel bleibt nicht liegen");
            gleich(nachher.faehigkeiten.schwarz.length, vorherSchwarz + 1,
                "die geschobene gegnerische Figur sammelt ihn fuer SCHWARZ ein");
            gleich(nachher.faehigkeiten.weiss.length, vorherWeiss,
                "und Weiss bekommt nichts dafuer");

        } else if (farbe === "weiss") {
            gleich(nachher.faehigkeiten.weiss.length, vorherWeiss + 1,
                "die eigene Figur sammelt fuer Weiss ein");

        } else {
            gleich(nachher.faehigkeiten.weiss.length, vorherWeiss,
                "auf einem leeren Feld sammelt niemand ein");
            gleich(nachher.faehigkeiten.schwarz.length, vorherSchwarz,
                "auch der Gegner nicht");
        }
    }
});

pruefe("Die Restzeit sagt, wie lange etwas noch gilt (v0.53)", () => {
    let runde = faehigkeitenPartie();

    /* Ohne Wirkung ist die Restzeit ueberall null. */
    gleich(SCHACH.restzeitAuf(runde.stand, SCHACH.feldNummer("d4")), 0,
        "auf einem leeren Feld laeuft nichts ab");

    /* Eine Mauer laeuft nach MAUER_HALBZUEGE ab. */
    const mitMauer = einsetzen(runde, "mauer", SCHACH.feldNummer("d4"));
    wahr(mitMauer !== null, "Mauer eingesetzt");

    const rest = SCHACH.restzeitAuf(mitMauer.stand, SCHACH.feldNummer("d4"));
    gleich(rest, SCHACH.MAUER_HALBZUEGE, "die volle Dauer der Mauer");

    /* Und sie zaehlt herunter. */
    const gezogen = SCHACH_RUNDE.ziehen(mitMauer, "id-anna",
        SCHACH.feldNummer("a2"), SCHACH.feldNummer("a3"), "D", "Anna", 4000);
    wahr(gezogen !== null, "Weiss zieht");
    gleich(SCHACH.restzeitAuf(gezogen.stand, SCHACH.feldNummer("d4")), rest - 1,
        "nach einem Halbzug einer weniger");
});

pruefe("Auch Fessel und Frost tragen eine Restzeit", () => {
    let runde = faehigkeitenPartie();

    const ziel = SCHACH.feldNummer("e7");
    const gefesselt = einsetzen(runde, "fessel", ziel);

    wahr(gefesselt !== null, "Fessel eingesetzt");
    wahr(SCHACH.restzeitAuf(gefesselt.stand, ziel) > 0,
        "die gefesselte Figur zeigt eine Restzeit");
});

pruefe("Die Bilanz zaehlt Beute und Verlust nach Figurenwert", () => {
    let runde = laufendePartie();

    const leer = SCHACH_RUNDE.bilanz(runde, "weiss");
    gleich(leer.punkte, 0, "am Anfang ausgeglichen");
    gleich(leer.geschlagen.length, 0, "nichts geschlagen");

    /* 1. e4 d5 2. exd5 — Weiss gewinnt einen Bauern. */
    runde = SCHACH_RUNDE.ziehen(runde, "id-anna",
        SCHACH.feldNummer("e2"), SCHACH.feldNummer("e4"), "D", "Anna", 2000);
    runde = SCHACH_RUNDE.ziehen(runde, "id-bert",
        SCHACH.feldNummer("d7"), SCHACH.feldNummer("d5"), "D", "Bert", 2100);
    runde = SCHACH_RUNDE.ziehen(runde, "id-anna",
        SCHACH.feldNummer("e4"), SCHACH.feldNummer("d5"), "D", "Anna", 2200);

    const weiss = SCHACH_RUNDE.bilanz(runde, "weiss");
    gleich(weiss.geschlagen.join(","), "B", "ein Bauer erbeutet");
    gleich(weiss.punkte, 1, "ein Punkt Vorsprung");

    const schwarz = SCHACH_RUNDE.bilanz(runde, "schwarz");
    gleich(schwarz.verloren.join(","), "B", "und Schwarz hat ihn verloren");
    gleich(schwarz.punkte, -1, "ein Punkt Rueckstand");
});

pruefe("Frost: eingefroren zieht nicht und wird nicht geschlagen", () => {
    let runde = faehigkeitenPartie();
    runde.stand = SCHACH.standNormalisieren({
        variante: "faehigkeiten",
        brett: "....k..."
            + "........"
            + "...s...."
            + "........"
            + "...T...."
            + "........"
            + "........"
            + "....K...",
        amZug: "weiss",
        rochade: ""
    });

    const eingefroren = einsetzen(runde, "frost", SCHACH.feldNummer("d6"));
    wahr(eingefroren !== null, "eingesetzt");
    gleich(eingefroren.stand.frostFeld, SCHACH.feldNummer("d6"), "Frost liegt auf d6");

    /* Der weisse Turm darf den Springer nicht schlagen. */
    const ziele = SCHACH.zuege(eingefroren.stand, SCHACH.feldNummer("d4"))
        .map((zug) => SCHACH.feldName(zug.nach));
    wahr(ziele.indexOf("d6") === -1, "d6 ist unantastbar");
    wahr(ziele.indexOf("d5") !== -1, "davor darf der Turm ziehen");

    /*
     * Und die eingefrorene Figur kommt nicht heraus. Der SPRINGER kommt hier
     * ueberhaupt nicht vom Fleck, und das liegt an ihm: Seit v0.80 darf eine
     * eingefrorene Figur INNERHALB des Blocks ziehen — nur reicht kein
     * Springerzug von einem Feld eines 2x2-Blocks auf ein anderes.
     */
    const danach = SCHACH_RUNDE.ziehen(eingefroren, "id-anna",
        SCHACH.feldNummer("d4"), SCHACH.feldNummer("d5"), "D", "Anna", 3100);
    gleich(SCHACH.zuege(danach.stand, SCHACH.feldNummer("d6")).length, 0,
        "der Springer steht fest — im Block liegt kein Springerzug");

    /*
     * SEIT v0.80 IST EIN BLOCK MIT NUR DEM KOENIG EIN GUELTIGES ZIEL. Bis
     * v0.79 wurde er abgewiesen, weil Koenige nicht einfrieren konnten — und
     * genau diesen Fall hat der Nutzer verlangt.
     */
    wahr(einsetzen(runde, "frost", SCHACH.feldNummer("e8")) !== null,
        "auf einen Block mit nur dem Koenig wirkt er jetzt");
});

pruefe("Frost sperrt einen 2x2-Block, auch die eigenen Figuren (v0.56)", () => {
    /*
     * NUTZER-ENTSCHEIDUNG VOM 08.08.: Der Block friert ein, was darin steht —
     * gleich wem es gehoert. Das macht ihn stark und zweischneidig zugleich;
     * man muss ihn sauber setzen.
     *
     * Die Stellung: schwarzer Springer auf c6 und schwarzer Laeufer auf d6,
     * darunter ein EIGENER Turm auf c5. Der Block mit der Ecke c6 erfasst
     * c6, d6, c5 und d5.
     */
    let runde = faehigkeitenPartie();
    runde.stand = SCHACH.standNormalisieren({
        variante: "faehigkeiten",
        brett: "....k..."
            + "........"
            + "..sl...."
            + "..T....."
            + "........"
            + "........"
            + "........"
            + "....K...",
        amZug: "weiss",
        rochade: ""
    });

    const kalt = einsetzen(runde, "frost", SCHACH.feldNummer("c6"));
    wahr(kalt !== null, "eingesetzt");

    const block = SCHACH.frostFelder(kalt.stand).slice().sort((a, b) => a - b);
    const erwartet = ["c6", "d6", "c5", "d5"]
        .map((name) => SCHACH.feldNummer(name)).sort((a, b) => a - b);
    gleich(block.join(","), erwartet.join(","), "vier Felder im Block");

    gleich(SCHACH.figurAuf(kalt.stand, SCHACH.feldNummer("c5")), "T",
        "der eigene Turm steht mit im Block");

    /*
     * SEIT v0.80 IST DER FROST EINE MAUER UM DEN BLOCK, KEIN ANKER: Wer
     * drinsteht, darf sich DARIN bewegen — nur nicht hinaus. Bis v0.79 zog
     * eine eingefrorene Figur gar nicht.
     */
    const raus = (feld) => SCHACH.zuege(kalt.stand, SCHACH.feldNummer(feld))
        .filter((zug) => SCHACH.frostFelder(kalt.stand).indexOf(zug.nach) === -1);

    gleich(raus("c5").length, 0, "der eigene Turm kommt nicht aus dem Block heraus");

    /* Aber INNERHALB geht es: d5 ist frei und gehoert zum Block. */
    const turmZiele = SCHACH.zuege(kalt.stand, SCHACH.feldNummer("c5"))
        .map((zug) => zug.nach);
    gleich(turmZiele.join(","), String(SCHACH.feldNummer("d5")),
        "er zieht nur noch auf das freie Feld im Block");

    /* Der Gegner kommt aus dem Block ebenfalls nicht heraus. */
    const schwarzAmZug = Object.assign({}, kalt.stand, { amZug: "schwarz" });
    const rausSchwarz = (feld) => SCHACH.zuege(schwarzAmZug, SCHACH.feldNummer(feld))
        .filter((zug) => SCHACH.frostFelder(schwarzAmZug).indexOf(zug.nach) === -1);

    gleich(rausSchwarz("c6").length, 0, "der Springer kommt nicht heraus");
    gleich(rausSchwarz("d6").length, 0, "der Laeufer auch nicht");

    /* Und geschlagen wird im Block weiterhin nicht — eingefroren heisst
       unantastbar (v0.56), daran hat v0.80 nichts geaendert. */
    for (const feld of ["c6", "d6", "c5"]) {
        wahr(SCHACH.zuege(schwarzAmZug, SCHACH.feldNummer("d6"))
            .every((zug) => zug.nach !== SCHACH.feldNummer(feld)),
            "niemand schlaegt " + feld + " im Block");
    }

    /* Ein leeres Feld im Block ist KEINE Sperre — dafuer gibt es die Mauer. */
    gleich(SCHACH.eingefroren(kalt.stand, SCHACH.feldNummer("d5")), false,
        "das leere Feld im Block ist frei");

    /* Und ohne gegnerische Figur im Block gibt es kein Ziel. */
    gleich(einsetzen(runde, "frost", SCHACH.feldNummer("a2")), null,
        "ein Block ohne Gegner wird nicht angeboten");
});

pruefe("Der Koenig friert seit v0.80 MIT — kommt aber im Block noch vom Fleck", () => {
    /*
     * DIE AUFHEBUNG EINER EISERNEN REGEL, auf Nutzer-Ansage vom 18.08.: „Wenn
     * im Frostbereich nur ein Koenig ist, kann er nicht raus, aber sich darin
     * noch bewegen … kann bei richtigem Nutzen zu Schach fuehren."
     *
     * Bis v0.79 war der Koenig ganz ausgenommen (v0.56), damit „Schachmatt"
     * eindeutig blieb. Begruendung der Aufhebung: `entschieden.md`.
     */
    let runde = faehigkeitenPartie();
    runde.stand = SCHACH.standNormalisieren({
        variante: "faehigkeiten",
        brett: "........"
            + "........"
            + "..sk...."
            + "........"
            + "........"
            + "........"
            + "........"
            + "....K...",
        amZug: "weiss",
        rochade: ""
    });

    const kalt = einsetzen(runde, "frost", SCHACH.feldNummer("c6"));
    wahr(kalt !== null, "eingesetzt");

    gleich(SCHACH.eingefroren(kalt.stand, SCHACH.feldNummer("c6")), true,
        "der Springer friert ein");
    gleich(SCHACH.eingefroren(kalt.stand, SCHACH.feldNummer("d6")), true,
        "und der Koenig jetzt auch");

    const schwarzAmZug = Object.assign({}, kalt.stand, { amZug: "schwarz" });
    const block = SCHACH.frostFelder(schwarzAmZug);
    const zuege = SCHACH.zuege(schwarzAmZug, SCHACH.feldNummer("d6"));

    wahr(zuege.length > 0, "er ist nicht bewegungslos");
    wahr(zuege.every((zug) => block.indexOf(zug.nach) !== -1),
        "aber jeder seiner Zuege endet IM Block");

    /* Der Block ist c6/d6/c5/d5; c6 traegt den Springer und ist unantastbar,
       bleiben c5 und d5. */
    gleich(zuege.map((zug) => zug.nach).sort((a, b) => a - b).join(","),
        [SCHACH.feldNummer("c5"), SCHACH.feldNummer("d5")]
            .sort((a, b) => a - b).join(","),
        "genau die zwei freien Felder des Blocks");
});

pruefe("Ein Koenig im Frost kann matt gesetzt werden (v0.80)", () => {
    /*
     * Die Folge, die der Nutzer selbst genannt hat. Damit sie ueberhaupt
     * eintreten kann, muss zweierlei zusammenkommen:
     *
     *   - Der Koenig kommt aus dem Block nicht heraus (seit v0.80).
     *   - Er steht trotzdem im Schach. Das haengt daran, dass `imSchach` ueber
     *     `_feldBedroht` rein geometrisch rechnet und den Frost NICHT fragt —
     *     sonst waere ein eingefrorener Koenig durch „unantastbar" unangreifbar
     *     geworden, und der Wunsch haette das Gegenteil bewirkt.
     */
    let runde = faehigkeitenPartie();

    /*
     * Schwarzer Koenig auf b7. Der Turm auf h7 gibt Schach und deckt a7 und
     * c7, der Turm auf h8 deckt die ganze achte Reihe. Fliehen kann der Koenig
     * deshalb nur nach UNTEN — a6, b6, c6 sind frei.
     *
     * Genau diese drei Felder liegen AUSSERHALB des Frost-Blocks a8/b8/a7/b7.
     * Der Frost nimmt sie ihm also, ohne selbst ein einziges Feld zu decken.
     */
    runde.stand = SCHACH.standNormalisieren({
        variante: "faehigkeiten",
        brett: ".......T"
            + ".k.....T"
            + "........"
            + "........"
            + "........"
            + "........"
            + "........"
            + "....K...",
        amZug: "weiss",
        rochade: ""
    });

    const schwarzVorher = Object.assign({}, runde.stand, { amZug: "schwarz" });
    wahr(SCHACH.alleZuege(schwarzVorher).length > 0,
        "ohne Frost hat Schwarz noch Zuege");

    /* Der Frost auf den Block a8/b8/a7/b7 sperrt genau seinen Fluchtraum. */
    const kalt = einsetzen(runde, "frost", SCHACH.feldNummer("a8"));
    wahr(kalt !== null, "der Frost laesst sich setzen");

    const schwarzNachher = Object.assign({}, kalt.stand, { amZug: "schwarz" });
    const zuege = SCHACH.zuege(schwarzNachher, SCHACH.feldNummer("b7"));

    /* Alle Felder des Blocks sind von der Dame gedeckt — es bleibt nichts. */
    gleich(zuege.length, 0, "im Block ist kein Feld mehr sicher");
    wahr(SCHACH.imSchach(schwarzNachher, "schwarz"),
        "und im Schach steht er auch — der Frost verdeckt das nicht");
    gleich(SCHACH.alleZuege(schwarzNachher).length, 0, "kein Zug mehr uebrig");
});

pruefe("Ein Stand von vor v0.56 kennt den Frost noch als Einzelfeld", () => {
    /* Additiver Vertrag: `frostFeld` bleibt gueltig und wird zum Block aus
       einem Feld — eine angefangene Partie laeuft unveraendert weiter. */
    const stand = SCHACH.standNormalisieren({
        variante: "faehigkeiten",
        frostFeld: SCHACH.feldNummer("e7"),
        frostFarbe: "schwarz"
    });

    gleich(stand.frostFelder.join(","), String(SCHACH.feldNummer("e7")),
        "ein Feld im Block");
    gleich(stand.frostFeld, SCHACH.feldNummer("e7"), "und die Ecke steht daneben");
});

pruefe("Friedhof: je staerker die Figur, desto kuerzer bleibt sie (v0.57)", () => {
    /*
     * Bis v0.56 blieben alle geliehenen Figuren gleich lang (8 Halbzuege).
     * Damit war der Friedhof umso staerker, je schwerer die Figuren waren,
     * die dort gefallen sind — also genau dort am staerksten, wo man ohnehin
     * gewinnt. Die Staffel dreht das um.
     */
    let runde = faehigkeitenPartie();
    runde.stand = SCHACH.standNormalisieren({
        variante: "faehigkeiten",
        brett: "....k..."
            + "........"
            + "........"
            + "........"
            + "........"
            + "........"
            + "........"
            + "....K...",
        amZug: "weiss",
        rochade: ""
    });

    const ecke = SCHACH.feldNummer("c6");
    runde.gefallen.schwarz = [
        { art: "B", feld: SCHACH.feldNummer("c6") },
        { art: "D", feld: SCHACH.feldNummer("d6") },
        { art: "T", feld: SCHACH.feldNummer("c5") },
        { art: "S", feld: SCHACH.feldNummer("d5") }
    ];

    const nachher = einsetzen(runde, "friedhof", ecke);
    wahr(nachher !== null, "eingesetzt");

    const bisAuf = (name) => {
        const feld = SCHACH.feldNummer(name);
        const eintrag = nachher.stand.geliehen.find((wert) => wert.feld === feld);
        return eintrag ? eintrag.bis : -1;
    };

    /* Gerechnet wird ab Takt 0 (Einsetzen), plus dem Vorlauf. */
    gleich(bisAuf("c6"), SCHACH.leihdauerVon("B"), "der Bauer bleibt am laengsten");
    gleich(bisAuf("d5"), SCHACH.leihdauerVon("S"), "der Springer mittel");
    gleich(bisAuf("c5"), SCHACH.leihdauerVon("T"), "der Turm kuerzer");
    gleich(bisAuf("d6"), SCHACH.leihdauerVon("D"), "die Dame am kuerzesten");

    wahr(bisAuf("c6") > bisAuf("d5"), "Bauer laenger als Springer");
    wahr(bisAuf("d5") > bisAuf("c5"), "Springer laenger als Turm");
    wahr(bisAuf("c5") > bisAuf("d6"), "Turm laenger als Dame");
});

pruefe("Die geliehene Dame zieht genau einmal, bevor sie zerfaellt (v0.57)", () => {
    /*
     * DAS IST DER GRUND FUER DEN VORLAUF (`SCHACH.LEIHGABE_VORLAUF`).
     *
     * Der Friedhof beendet den Zug. Zwischen dem Aufstehen und dem ersten
     * eigenen Zug liegen deshalb IMMER zwei Halbzuege — der abgegebene und die
     * Antwort des Gegners. Ohne Vorlauf waere die Dame mit ihren zwei
     * Halbzuegen zerfallen, bevor man sie ein einziges Mal ziehen kann; sie
     * haette nur ein Feld blockiert. Beim Nachmessen genau so aufgefallen.
     */
    /*
     * Der schwarze Koenig steht auf h8 und die geweckte Dame auf c4: Von dort
     * bedroht sie ihn NICHT. Stuende er wie ueblich auf e8, gaebe die Dame
     * ueber die Diagonale c6-d7-e8 Schach, und Schwarz koennte den harmlosen
     * Bauernzug gar nicht machen — beim Schreiben des Tests genau so passiert.
     */
    let runde = faehigkeitenPartie();
    runde.stand = SCHACH.standNormalisieren({
        variante: "faehigkeiten",
        brett: ".......k"
            + "b......."
            + "........"
            + "........"
            + "........"
            + "........"
            + "........"
            + "....K...",
        amZug: "weiss",
        rochade: ""
    });

    const ecke = SCHACH.feldNummer("c4");
    runde.gefallen.schwarz = [{ art: "D", feld: ecke }];

    let nach = einsetzen(runde, "friedhof", ecke);
    wahr(nach !== null, "eingesetzt");
    gleich(SCHACH.figurAuf(nach.stand, ecke), "D", "die Dame steht auf");
    gleich(nach.stand.amZug, "schwarz", "und der Gegner ist dran");

    /* Schwarz antwortet — die Dame muss das ueberleben. */
    nach = SCHACH_RUNDE.ziehen(nach, "id-bert",
        SCHACH.feldNummer("a7"), SCHACH.feldNummer("a6"), "D", "Bert", 3100);
    wahr(nach !== null, "Schwarz zieht");
    gleich(SCHACH.figurAuf(nach.stand, ecke), "D", "die Dame steht noch");

    /* Jetzt darf sie ziehen — genau einmal. */
    const gezogen = SCHACH_RUNDE.ziehen(nach, "id-anna",
        ecke, SCHACH.feldNummer("c5"), "D", "Anna", 3150);
    wahr(gezogen !== null, "die geliehene Dame zieht");
    gleich(SCHACH.figurAuf(gezogen.stand, SCHACH.feldNummer("c5")), "D",
        "und steht auf ihrem neuen Feld");

    /* Und danach ist sie weg: Der naechste Zug des Gegners raeumt sie ab. */
    const danach = SCHACH_RUNDE.ziehen(gezogen, "id-bert",
        SCHACH.feldNummer("a6"), SCHACH.feldNummer("a5"), "D", "Bert", 3200);
    wahr(danach !== null, "Schwarz zieht noch einmal");
    gleich(SCHACH.figurAuf(danach.stand, SCHACH.feldNummer("c5")), ".",
        "die geliehene Dame ist zerfallen");
});

pruefe("Der Umriss sagt vorher, was die Wirkung beruehrt (v0.57)", () => {
    /*
     * Grundlage des Vorschau-Kastens. Gefragt wird `_zielWirkung`, also die
     * echte Rechnung — eine zweite Liste von "was passiert wo" waere eine
     * zweite Wahrheit.
     */
    const runde = faehigkeitenPartie();

    const mauer = SCHACH_RUNDE.zielUmriss(runde, "id-anna", "mauer",
        SCHACH.feldNummer("d4"));
    gleich(mauer.length, SCHACH.MAUER_LAENGE, "die Mauer ist drei Felder breit");
    wahr(mauer.indexOf(SCHACH.feldNummer("d4")) !== -1, "das angetippte Feld ist dabei");
    wahr(mauer.indexOf(SCHACH.feldNummer("c4")) !== -1, "und der linke Nachbar");
    wahr(mauer.indexOf(SCHACH.feldNummer("e4")) !== -1, "und der rechte");

    const schild = SCHACH_RUNDE.zielUmriss(runde, "id-anna", "schutzschild",
        SCHACH.feldNummer("e2"));
    gleich(schild.join(","), String(SCHACH.feldNummer("e2")),
        "das Schild beruehrt genau ein Feld");

    /* Wo die Wirkung nicht zustande kommt, gibt es auch keinen Umriss. */
    gleich(SCHACH_RUNDE.zielUmriss(runde, "id-anna", "schutzschild",
        SCHACH.feldNummer("e7")).length, 0, "nicht auf eine gegnerische Figur");
    gleich(SCHACH_RUNDE.zielUmriss(runde, "id-anna", "sprung", 0).length, 0,
        "und nicht bei einer Faehigkeit ohne Ziel");
});

pruefe("Nur der ZULETZT Gefallene laesst sich holen (nachgemessen v0.57)", () => {
    /*
     * Behauptung aus dem Eingangskorb, am 08.08. nachgemessen: Liegen auf
     * einem Feld mehrere Gefallene, zaehlt der letzte — und zwar bei BEIDEN
     * Faehigkeiten. Das galt schon seit v0.54; dieser Test haelt es fest.
     */
    /*
     * Der schwarze Koenig sitzt seit v0.95 gedeckt in der Ecke: Eine Figur,
     * die per Friedhof oder Wiederbelebung erscheint, darf ihm kein Schach
     * geben, sonst weist das Modell die Faehigkeit ab (Entscheidung 20.08.).
     * Geprueft wird hier, WELCHER Gefallene geholt wird.
     */
    const leer = ".......k" + "......bb" + "........" + "........"
        + "........" + "........" + "........" + "....K...";

    const bauen = () => {
        const runde = faehigkeitenPartie();
        runde.stand = SCHACH.standNormalisieren({
            variante: "faehigkeiten", brett: leer, amZug: "weiss", rochade: ""
        });
        return runde;
    };

    const ecke = SCHACH.feldNummer("c6");
    const friedhof = bauen();
    friedhof.gefallen.schwarz = [
        { art: "B", feld: ecke },
        { art: "D", feld: ecke }
    ];

    const nachFriedhof = einsetzen(friedhof, "friedhof", ecke);
    gleich(SCHACH.figurAuf(nachFriedhof.stand, ecke), "D",
        "der Friedhof weckt die zuletzt Gefallene");
    gleich(nachFriedhof.gefallen.schwarz.length, 1,
        "der aeltere Eintrag bleibt liegen");

    const grab = SCHACH.feldNummer("d4");
    const belebung = bauen();
    belebung.gefallen.weiss = [
        { art: "B", feld: grab },
        { art: "T", feld: grab }
    ];

    const nachBelebung = einsetzen(belebung, "wiederbelebung", grab);
    gleich(SCHACH.figurAuf(nachBelebung.stand, grab), "T",
        "die Wiederbelebung genauso");
});

pruefe("Der Stolperstein trifft die einsammelnde Figur, auch im Vorbeiziehen (v0.58)", () => {
    /*
     * DER FEHLER, DEN v0.53 EINGEBAUT HAT.
     *
     * `_pechAusloesen` bekam immer das Feld des WÜRFELS — mit der Begruendung
     * "dort steht jetzt die einsammelnde Figur". Das stimmte, solange man
     * Wuerfel nur durch Betreten des Zielfelds einsammelte. Seit "Beruehren
     * heisst Einsammeln" (v0.53) nimmt ein Turm sie auch im Vorbeiziehen mit
     * und steht danach woanders — der Stolperstein suchte auf einem leeren
     * Feld nach einer Figur und verpuffte still.
     *
     * Gefunden beim Stellen der Anleitung fuer v0.58, nicht im Spiel: Kein
     * Test hatte je ueber einen Stolperstein hinweggezogen.
     */
    let runde = faehigkeitenPartie();
    runde.stand = SCHACH.standNormalisieren({
        variante: "faehigkeiten",
        brett: "....k..."
            + "........"
            + "........"
            + "........"
            + "........"
            + "........"
            + "........"
            + "T...K...",
        amZug: "weiss",
        rochade: ""
    });

    /* Der Wuerfel liegt MITTEN auf dem Weg, nicht am Ziel. */
    runde.bonusFassung = 2;
    runde.bonus = [{ feld: SCHACH.feldNummer("a4"), art: "stolperstein", pech: true }];

    const gezogen = SCHACH_RUNDE.ziehen(runde, "id-anna",
        SCHACH.feldNummer("a1"), SCHACH.feldNummer("a7"), "D", "Anna", 3000);

    wahr(gezogen !== null, "der Turm zieht die Spalte hinauf");
    gleich(gezogen.bonus.length, 0, "den Wuerfel hat er unterwegs mitgenommen");

    /*
     * ZURUECKGEWORFEN WIRD AB DEM FELD DER LOOTBOX (seit v0.73, Meldung I8) —
     * nicht mehr vom Zielfeld aus. Der Stein liegt auf a4, der Turm kam von
     * unten: also ein Feld dahinter, auf a3. Bis v0.72 landete er auf a6.
     */
    gleich(SCHACH.figurAuf(gezogen.stand, SCHACH.feldNummer("a7")), ".",
        "auf a7 steht er nicht mehr");
    gleich(SCHACH.figurAuf(gezogen.stand, SCHACH.feldNummer("a3")), "T",
        "sondern ein Feld vor dem Stein, auf a3");

    const letzter = gezogen.verlauf[gezogen.verlauf.length - 1];
    gleich(letzter.wirkung, "pech", "und der Verlauf haelt es fest");
});

pruefe("Der Stolperstein wirft in die Richtung zurueck, aus der man kam (v0.73)", () => {
    /*
     * I8: Ein diagonal ziehender Laeufer fliegt diagonal zurueck — nicht
     * senkrecht Richtung Grundreihe wie bis v0.72.
     */
    let runde = faehigkeitenPartie();
    runde.stand = SCHACH.standNormalisieren({
        variante: "faehigkeiten",
        brett: "....k..."
            + "........"
            + "........"
            + "........"
            + "........"
            + "........"
            + "........"
            + "L...K...",
        amZug: "weiss",
        rochade: ""
    });

    runde.bonusFassung = 2;
    runde.bonus = [{ feld: SCHACH.feldNummer("c3"), art: "stolperstein", pech: true }];

    const gezogen = SCHACH_RUNDE.ziehen(runde, "id-anna",
        SCHACH.feldNummer("a1"), SCHACH.feldNummer("e5"), "D", "Anna", 3000);

    wahr(gezogen !== null, "der Laeufer zieht die Diagonale hinauf");
    gleich(SCHACH.figurAuf(gezogen.stand, SCHACH.feldNummer("b2")), "L",
        "und liegt diagonal hinter dem Stein auf b2");
});

pruefe("Der Springer kehrt an seinen Ausgangsort zurueck (v0.73)", () => {
    /* I8: Zwischen Start und Ziel gibt es beim Springer keine Richtung —
       also zurueck an den Anfang. */
    let runde = faehigkeitenPartie();
    runde.stand = SCHACH.standNormalisieren({
        variante: "faehigkeiten",
        brett: "....k..."
            + "........"
            + "........"
            + "........"
            + "........"
            + "........"
            + "........"
            + "S...K...",
        amZug: "weiss",
        rochade: ""
    });

    runde.bonusFassung = 2;
    runde.bonus = [{ feld: SCHACH.feldNummer("b3"), art: "stolperstein", pech: true }];

    const gezogen = SCHACH_RUNDE.ziehen(runde, "id-anna",
        SCHACH.feldNummer("a1"), SCHACH.feldNummer("b3"), "D", "Anna", 3000);

    wahr(gezogen !== null, "der Springer springt");
    gleich(SCHACH.figurAuf(gezogen.stand, SCHACH.feldNummer("a1")), "S",
        "und steht wieder auf seinem Ausgangsfeld");
});

pruefe("Ein abgebrochener Angriff schlaegt nichts (v0.73)", () => {
    /*
     * I8, zweiter Teil: Wer sein Ziel nicht erreicht, schlaegt dort auch
     * nichts — dieselbe Regel wie beim Zugabbruch am Riss (v0.58).
     */
    let runde = faehigkeitenPartie();
    runde.stand = SCHACH.standNormalisieren({
        variante: "faehigkeiten",
        brett: "....k..."
            + "t......."
            + "........"
            + "........"
            + "........"
            + "........"
            + "........"
            + "T...K...",
        amZug: "weiss",
        rochade: ""
    });

    runde.bonusFassung = 2;
    runde.bonus = [{ feld: SCHACH.feldNummer("a4"), art: "stolperstein", pech: true }];

    const gezogen = SCHACH_RUNDE.ziehen(runde, "id-anna",
        SCHACH.feldNummer("a1"), SCHACH.feldNummer("a7"), "D", "Anna", 3000);

    wahr(gezogen !== null, "der Turm zieht los");
    gleich(SCHACH.figurAuf(gezogen.stand, SCHACH.feldNummer("a7")), "t",
        "der schwarze Turm steht noch");
    gleich(gezogen.verloren.schwarz.length, 0, "und zaehlt nicht als verloren");
    gleich(SCHACH.figurAuf(gezogen.stand, SCHACH.feldNummer("a3")), "T",
        "der eigene Turm liegt vor dem Stein");
});

pruefe("Zurueckgestolpert ins Schach heisst verloren (v0.73)", () => {
    /*
     * I9 (Nutzer-Entscheidung 09.08.): Eine Ungluecks-Lootbox DARF eine Partie
     * beenden. Geprueft wird NACH dem Rueckwurf — `lage()` kennt diesen Fall
     * nicht, denn es ist weder Matt noch Patt.
     *
     * Die Stellung: Der schwarze Turm auf h1 gibt Schach ueber die Grundreihe.
     * Weiss schlaegt ihn mit dem Turm von h5 — ein voellig gueltiger Zug, er
     * beendet das Schach. Unterwegs liegt auf h3 ein Stolperstein: Der Turm
     * kommt nicht an, der Schlag faellt damit aus, der schwarze Turm steht
     * wieder auf h1 — und der weisse Koenig im Schach.
     */
    let runde = faehigkeitenPartie();
    runde.stand = SCHACH.standNormalisieren({
        variante: "faehigkeiten",
        brett: "....k..."
            + "........"
            + "........"
            + ".......T"
            + "........"
            + "........"
            + "........"
            + "K......t",
        amZug: "weiss",
        rochade: ""
    });

    runde.bonusFassung = 2;
    runde.bonus = [{ feld: SCHACH.feldNummer("h3"), art: "stolperstein", pech: true }];

    gleich(SCHACH.imSchach(runde.stand, "weiss"), true,
        "vorher steht Weiss schon im Schach");

    const gezogen = SCHACH_RUNDE.ziehen(runde, "id-anna",
        SCHACH.feldNummer("h5"), SCHACH.feldNummer("h1"), "D", "Anna", 3000);

    wahr(gezogen !== null, "der Turm schlaegt den Angreifer");
    gleich(SCHACH.figurAuf(gezogen.stand, SCHACH.feldNummer("h1")), "t",
        "der geschlagene Turm steht wieder da");
    gleich(SCHACH.imSchach(gezogen.stand, "weiss"), true,
        "der weisse Koenig steht danach im Schach");
    gleich(gezogen.ergebnis, "schwarz", "und Weiss hat verloren");
    gleich(gezogen.laeuft, false, "die Partie ist zu Ende");
});

/*
 * DER ZUG BRICHT AM RISS AB (v0.58)
 *
 * Ein Erdbeben reisst den Boden auf, SOBALD der Wuerfel eingesammelt wird —
 * und eingesammelt wird er seit v0.53 auch im Vorbeiziehen. Liegt danach ein
 * Loch vor der Figur, kommt sie nicht mehr daran vorbei.
 *
 * Die Stellung ist absichtlich dicht: `erdbebenRisse` trifft freie Felder, und
 * frei ist hier fast nur die Spalte des Turms. Wo genau die Risse landen,
 * rechnet der Spielstand aus — die Tests pruefen deshalb die REGEL, nicht
 * bestimmte Feldnummern.
 */
function rissPartie(zielFigur) {
    const runde = faehigkeitenPartie();
    const oben = zielFigur || ".";

    runde.stand = SCHACH.standNormalisieren({
        variante: "faehigkeiten",
        brett: ("bb" + oben + "bbbbb")
            + "bb.bbbbb"
            + "bb.bbbbb"
            + "bb.bbbbb"
            + "BB.BBBBB"
            + "BB.BBBBB"
            + "BB.BBBBB"
            + "BBTBBBBB",
        amZug: "weiss",
        rochade: ""
    });

    /* Der Wuerfel liegt auf dem ERSTEN Feld des Weges, nicht am Ziel. */
    runde.bonusFassung = 2;
    runde.bonus = [{ feld: SCHACH.feldNummer("c2"), art: "erdbeben", pech: true }];

    return runde;
}

pruefe("Ein Riss vor der Figur bricht den Zug ab (v0.58)", () => {
    const runde = rissPartie();
    const weg = SCHACH.betreteneFelder(runde.stand,
        SCHACH.feldNummer("c1"), SCHACH.feldNummer("c8"));

    const gezogen = SCHACH_RUNDE.ziehen(runde, "id-anna",
        SCHACH.feldNummer("c1"), SCHACH.feldNummer("c8"), "D", "Anna", 3000);

    wahr(gezogen !== null, "der Zug ist erlaubt");
    gleich(gezogen.bonus.length, 0, "den Wuerfel hat er unterwegs mitgenommen");
    wahr(SCHACH.risse(gezogen.stand).length > 0, "und es sind Risse entstanden");

    /* Oben angekommen ist er nicht. */
    gleich(SCHACH.figurAuf(gezogen.stand, SCHACH.feldNummer("c8")), ".",
        "auf dem Zielfeld steht er nicht");

    /* Sondern irgendwo auf seinem Weg — und zwar auf einem FREIEN Feld. */
    let steht = -1;
    for (const feld of weg) {
        if (SCHACH.figurAuf(gezogen.stand, feld) === "T") {
            steht = feld;
        }
    }
    wahr(steht !== -1, "er steht auf einem Feld seines Weges");
    wahr(!SCHACH.gesperrt(gezogen.stand, steht), "und niemals auf einem Riss");

    /* Direkt vor ihm liegt der Grund: ein gesperrtes Feld. */
    const naechstes = weg[weg.indexOf(steht) + 1];
    wahr(Number.isInteger(naechstes) && SCHACH.gesperrt(gezogen.stand, naechstes),
        "vor ihm liegt das Loch, das ihn aufgehalten hat");

    /* Und der Verlauf sagt es: Der Zug endet woanders als geplant. */
    const zugEintrag = gezogen.verlauf.find((zeile) => zeile.von === SCHACH.feldNummer("c1"));
    gleich(zugEintrag.nach, steht, "der Verlauf nennt das Haltefeld");
    gleich(zugEintrag.wege[0].nach, steht, "und der Pfeil endet dort");
});

pruefe("Wer sein Ziel nicht erreicht, schlaegt dort auch nichts (v0.58)", () => {
    /*
     * Sonst waere der Abbruch ein Angriff aus der Ferne: Die Figur bliebe
     * unterwegs stehen, und der Gegner haette trotzdem eine Figur verloren.
     */
    const runde = rissPartie("t");
    const ziel = SCHACH.feldNummer("c8");

    const gezogen = SCHACH_RUNDE.ziehen(runde, "id-anna",
        SCHACH.feldNummer("c1"), ziel, "D", "Anna", 3000);

    wahr(gezogen !== null, "der Zug ist erlaubt");
    gleich(SCHACH.figurAuf(gezogen.stand, ziel), "t",
        "der schwarze Turm steht noch da");
    gleich(gezogen.verloren.schwarz.indexOf("T"), -1,
        "und zaehlt nicht als verloren");
    wahr(!gezogen.gefallen.schwarz.some((eintrag) => eintrag.feld === ziel),
        "auch nicht als gefallen");
});

pruefe("Ein Wuerfel, der in einen Riss faellt, ist weg (v0.59, Wunsch #20)", () => {
    /*
     * Auf ein gesperrtes Feld kann niemand mehr ziehen — ein Würfel, der
     * darunter liegen bliebe, wäre für den Rest der Partie unerreichbar.
     * Gebaut wird der Fall über ein Erdbeben, das drei Felder aufreisst,
     * während auf dem Brett noch weitere Würfel liegen.
     */
    const runde = rissPartie();

    /* Zusätzliche Würfel auf jedes noch freie Feld der Spalte c — eines davon
       trifft das Erdbeben mit Sicherheit. */
    for (const name of ["c3", "c4", "c5", "c6", "c7", "c8"]) {
        runde.bonus.push({ feld: SCHACH.feldNummer(name), art: "sprung" });
    }

    const gezogen = SCHACH_RUNDE.ziehen(runde, "id-anna",
        SCHACH.feldNummer("c1"), SCHACH.feldNummer("c2"), "D", "Anna", 3000);

    wahr(gezogen !== null, "der Zug ist erlaubt");
    wahr(SCHACH.risse(gezogen.stand).length > 0, "es sind Risse entstanden");

    for (const eintrag of gezogen.bonus) {
        wahr(!SCHACH.rissAuf(gezogen.stand, eintrag.feld),
            "kein Wuerfel liegt auf einem Riss (Feld " + eintrag.feld + ")");
    }
});

pruefe("Ohne Riss auf dem weiteren Weg bleibt der Zug, wie er war (v0.58)", () => {
    /*
     * DIE GRENZE DER REGEL. Ein Riss HINTER der Figur haelt sie nicht auf —
     * dort war sie schon vorbei. Geprueft an einem Springer: Er betritt nur
     * sein Zielfeld, hat also gar keinen Weg, auf dem etwas aufreissen
     * koennte.
     */
    const runde = faehigkeitenPartie();
    runde.stand = SCHACH.standNormalisieren({
        variante: "faehigkeiten",
        brett: "....k..."
            + "........"
            + "........"
            + "........"
            + "........"
            + "........"
            + "........"
            + ".S..K...",
        amZug: "weiss",
        rochade: ""
    });

    runde.bonusFassung = 2;
    runde.bonus = [{ feld: SCHACH.feldNummer("c3"), art: "erdbeben", pech: true }];

    const gezogen = SCHACH_RUNDE.ziehen(runde, "id-anna",
        SCHACH.feldNummer("b1"), SCHACH.feldNummer("c3"), "D", "Anna", 3000);

    wahr(gezogen !== null, "der Springer zieht");
    gleich(SCHACH.figurAuf(gezogen.stand, SCHACH.feldNummer("c3")), "S",
        "und steht auf seinem Zielfeld");
});

pruefe("Nudelholz schiebt niemanden auf ein gesperrtes Feld (v0.59)", () => {
    /*
     * GEFUNDEN AM 13.08. beim Einordnen von Wunsch #16: `SCHACH.nudelholz`
     * fragte nur, ob das Zielfeld LEER ist — nicht, ob es gesperrt ist. Eine
     * Figur landete dadurch auf einer Mauer oder in einem Riss, also auf einem
     * Feld, das es fuer die Regeln gar nicht mehr gibt. Das Erdbeben fragt an
     * derselben Stelle seit v0.54 richtig.
     */
    const runde = faehigkeitenPartie();
    runde.stand = SCHACH.standNormalisieren({
        variante: "faehigkeiten",
        brett: "....k..."
            + "........"
            + "........"
            + "........"
            + "........"
            + "........"
            + "B......."
            + "....K...",
        amZug: "weiss",
        rochade: "",
        /* Genau vor dem Bauern auf a2 klafft ein Loch. */
        risse: [SCHACH.feldNummer("a3")]
    });

    const wirkung = SCHACH.nudelholz(runde.stand, SCHACH.feldNummer("a1"), "unten");
    const bauerSteht = (stand, name) =>
        SCHACH.figurAuf(stand, SCHACH.feldNummer(name));

    if (wirkung) {
        gleich(bauerSteht(wirkung.stand, "a3"), ".", "im Riss steht niemand");
        gleich(bauerSteht(wirkung.stand, "a2"), "B", "der Bauer bleibt davor stehen");
    } else {
        gleich(bauerSteht(runde.stand, "a2"), "B", "der Bauer bleibt davor stehen");
    }
});

pruefe("Nudelholz: EINE Bahn, auch am aeussersten Rand (v0.117)", () => {
    /*
     * SEIT v0.117 ROLLT GENAU EINE SPALTE ODER REIHE (Nutzer-Entscheidung
     * 22.08., vorher zwei Spalten). Angeboten werden die Felder des
     * gewaehlten Randes — ohne Wahl die eigene Seite.
     */
    const runde = faehigkeitenPartie();
    const breite = SCHACH.breiteVon(runde.stand);
    const hoehe = SCHACH.hoeheVon(runde.stand);
    const felder = SCHACH_RUNDE.zielFelder(runde, "id-anna", "nudelholz");

    const rechts = SCHACH._feld(runde.stand, hoehe - 1, breite - 1);
    const links = SCHACH._feld(runde.stand, hoehe - 1, 0);

    wahr(felder.indexOf(rechts) !== -1, "das Feld ganz rechts wird angeboten");
    wahr(felder.indexOf(links) !== -1, "das Feld ganz links auch");

    /* Gezaehlt werden die beruehrten SPALTEN: Es ist immer genau eine. */
    const spaltenVon = (wirkung) => wirkung.felder
        .map((feld) => SCHACH.spalteVon(feld, breite))
        .filter((spalte, stelle, alle) => alle.indexOf(spalte) === stelle)
        .sort((a, b) => a - b);

    const amRand = SCHACH.nudelholz(runde.stand, rechts, "unten");
    wahr(amRand !== null, "am Rand passiert etwas");
    gleich(spaltenVon(amRand).join(","), String(breite - 1),
        "ganz aussen rollt genau die letzte Spalte");

    const innen = SCHACH.nudelholz(runde.stand,
        SCHACH._feld(runde.stand, hoehe - 1, breite - 3), "unten");
    gleich(spaltenVon(innen).join(","), String(breite - 3),
        "auch weiter innen bleibt es EINE Spalte");

    /* Und die Wirkung merkt sich ihren Rand — daraus rollt die Anzeige. */
    gleich(amRand.richtung, "unten", "die Wirkung nennt ihren Rand");
});

pruefe("Spiegel: eine Figur wird auf ein freies Nachbarfeld verdoppelt", () => {
    const runde = einsetzen(faehigkeitenPartie(), "spiegel", SCHACH.feldNummer("a2"));
    wahr(runde !== null, "eingesetzt");

    gleich(SCHACH.figurAuf(runde.stand, SCHACH.feldNummer("a2")), "B", "das Original bleibt");
    gleich(SCHACH.figurAuf(runde.stand, SCHACH.feldNummer("a3")), "B", "die Kopie daneben");

    gleich(einsetzen(faehigkeitenPartie(), "spiegel", SCHACH.feldNummer("e1")), null,
        "der Koenig wird nicht gespiegelt");
    gleich(einsetzen(faehigkeitenPartie(), "spiegel", SCHACH.feldNummer("e7")), null,
        "und keine gegnerische Figur");
    gleich(einsetzen(faehigkeitenPartie(), "spiegel", SCHACH.feldNummer("b1")), null,
        "ohne freies Nachbarfeld geht es nicht");
});

pruefe("Nudelholz: EINE Spalte rollt, der Rand ist waehlbar (v0.117)", () => {
    let runde = faehigkeitenPartie();
    runde.stand = SCHACH.standNormalisieren({
        variante: "faehigkeiten",
        brett: "....k..."
            + "........"
            + "........"
            + "bb......"
            + "........"
            + "........"
            + "........"
            + "....K...",
        amZug: "weiss",
        rochade: ""
    });

    /*
     * OHNE WAHL ROLLT ES VON DER EIGENEN SEITE (seit v0.117; vorher rollten
     * zwei Spalten): Weiss tippt ein Feld seines unteren Randes an, und nur
     * DIESE Spalte rollt von ihm weg.
     */
    const hoch = einsetzen(runde, "nudelholz", SCHACH.feldNummer("a1"));
    wahr(hoch !== null, "eingesetzt");
    gleich(SCHACH.figurAuf(hoch.stand, SCHACH.feldNummer("a6")), "b", "a5 nach a6");
    gleich(SCHACH.figurAuf(hoch.stand, SCHACH.feldNummer("b5")), "b",
        "die Nachbarspalte bleibt stehen — es rollt nur EINE");
    gleich(SCHACH.figurAuf(hoch.stand, SCHACH.feldNummer("a5")), ".", "a5 ist leer");
    gleich(hoch.verlauf[hoch.verlauf.length - 1].wege.length, 1, "ein Weg im Verlauf");
    gleich(hoch.verlauf[hoch.verlauf.length - 1].richtung, "unten",
        "der Verlauf kennt den Rand");

    /* Der gegnerische Rand gehoert ohne Wahl nicht dazu. */
    gleich(einsetzen(runde, "nudelholz", SCHACH.feldNummer("a8")), null,
        "ohne Wahl nur der eigene Rand");

    /* Mitten auf dem Brett schon gar nicht. */
    gleich(einsetzen(runde, "nudelholz", SCHACH.feldNummer("d4")), null,
        "nur am Rand");

    /* Schwarz tippt ohne Wahl seinen oberen Rand an — und schiebt in die
       andere Richtung, aus SEINER Sicht ebenfalls von sich weg. */
    let fuerSchwarz = SCHACH_RUNDE.kopieren(runde);
    fuerSchwarz.stand.amZug = "schwarz";
    fuerSchwarz.faehigkeiten.schwarz.push("nudelholz");

    const runter = SCHACH_RUNDE.faehigkeitEinsetzen(fuerSchwarz, "id-bert",
        "nudelholz", SCHACH.feldNummer("a8"), "Bert", 3000);

    wahr(runter !== null, "Schwarz kann es einsetzen");
    gleich(SCHACH.figurAuf(runter.stand, SCHACH.feldNummer("a4")), "b", "a5 nach a4");

    /*
     * MIT WAHL ROLLT ES VON JEDEM RAND (v0.117): "links" heisst, das Holz
     * setzt am linken Rand an und schiebt die REIHE nach rechts — zuerst
     * macht der vordere Bauer Platz, dann rueckt der hintere nach.
     */
    let mitWahl = SCHACH_RUNDE.kopieren(runde);
    mitWahl.faehigkeiten.weiss.push("nudelholz");
    const quer = SCHACH_RUNDE.faehigkeitEinsetzen(mitWahl, "id-anna",
        "nudelholz", SCHACH.feldNummer("a5"), "Anna", 3000, undefined, "links");

    wahr(quer !== null, "mit Richtungswahl eingesetzt");
    gleich(SCHACH.figurAuf(quer.stand, SCHACH.feldNummer("c5")), "b", "b5 nach c5");
    gleich(SCHACH.figurAuf(quer.stand, SCHACH.feldNummer("b5")), "b", "a5 nach b5");
    gleich(SCHACH.figurAuf(quer.stand, SCHACH.feldNummer("a5")), ".", "a5 ist leer");
    gleich(quer.verlauf[quer.verlauf.length - 1].richtung, "links",
        "der Verlauf kennt auch diesen Rand");

    /* Mit Wahl "links" zaehlt nur der LINKE Rand als Ansatz. */
    gleich(SCHACH_RUNDE.faehigkeitEinsetzen(mitWahl, "id-anna",
        "nudelholz", SCHACH.feldNummer("b5"), "Anna", 3000, undefined, "links"),
        null, "mitten in der Reihe setzt nichts an");

    /* Der Koenig auf e8 liegt nicht in der gerollten Spalte a —
       er steht also weiterhin da. Dass Koenige seit v0.77 SEHR WOHL
       mitrollen, wenn sie in der Bahn stehen, pruefen die Tests unten. */
    gleich(SCHACH.figurAuf(hoch.stand, SCHACH.feldNummer("e8")), "k",
        "der Koenig ausserhalb der Spalte blieb");
});

pruefe("Nudelholz: Koenige rollen mit (v0.77)", () => {
    /*
     * NUTZER-ANSAGE 18.08.: „Nudelholz soll alle Figuren bewegen."
     *
     * Nachgemessen war: Es bewegte schon alle Figuren beider Farben — ausser
     * Koenigen. Und diese Ausnahme wog schwerer, als sie aussah: Der Koenig
     * blieb stehen, sein Feld blieb besetzt, und damit hielt er auch alles
     * auf, was hinter ihm stand. Genau das steht in diesem Test.
     */
    const runde = faehigkeitenPartie();
    runde.stand = SCHACH.standNormalisieren({
        variante: "faehigkeiten",
        brett: "........"
            + "........"
            + "........"
            + "........"
            + "k......."
            + "B......."
            + "B......."
            + "....K...",
        amZug: "weiss",
        rochade: ""
    });

    const wirkung = SCHACH.nudelholz(runde.stand, SCHACH.feldNummer("a1"), "unten");
    wahr(wirkung !== null, "es passiert etwas — bis v0.76 blockierte der Koenig alles");

    const auf = (name) => SCHACH.figurAuf(wirkung.stand, SCHACH.feldNummer(name));

    gleich(auf("a5"), "k", "der gegnerische Koenig ist mitgerollt");
    gleich(auf("a4"), "B", "der Bauer dahinter ruecken nach");
    gleich(auf("a3"), "B", "und der dahinter auch");
    gleich(auf("a2"), ".", "hinten bleibt es leer");
});

pruefe("Nudelholz: den EIGENEN Koenig schiebt man nicht ins Schach (v0.77)", () => {
    /*
     * Die Gegenprobe zum Test darueber. Koenige rollen mit — aber die Regel
     * von v3.6 bleibt: Wer eine Faehigkeit einsetzt, darf seinen eigenen Koenig
     * dabei nicht im Schach zuruecklassen. Sie steht in
     * `faehigkeitEinsetzen`, nicht in `SCHACH.nudelholz`, und deckt damit auch
     * das Erdbeben und den Bauernschub ab.
     *
     * Die Stellung: Der weisse Koenig steht auf a2 und ist dort SICHER — der
     * schwarze Turm auf h3 beherrscht die dritte Reihe, nicht die zweite.
     * Gerollt wuerde der Koenig genau dorthin, nach a3. Der Turm steht
     * ausserhalb der gerollten Spalten a und b und bleibt, wo er ist.
     *
     * Dass er VORHER sicher steht, ist der Kern des Tests: Wer schon im Schach
     * steht, darf weiter Faehigkeiten einsetzen, die den Zug nicht beenden —
     * er muss danach ja ohnehin herausziehen (v3.6).
     */
    const runde = faehigkeitenPartie();
    runde.stand = SCHACH.standNormalisieren({
        variante: "faehigkeiten",
        brett: "....k..."
            + "........"
            + "........"
            + "........"
            + "........"
            + ".......t"
            + "K......."
            + "........",
        amZug: "weiss",
        rochade: ""
    });

    wahr(!SCHACH.imSchach(runde.stand, "weiss"), "auf a2 steht der Koenig sicher");

    /* Die reine Rechnung schiebt ihn sehr wohl — sie kennt den Zugzusammenhang
       nicht. */
    const roh = SCHACH.nudelholz(runde.stand, SCHACH.feldNummer("a1"), "unten");
    wahr(roh !== null, "die Rechnung selbst schiebt");
    gleich(SCHACH.figurAuf(roh.stand, SCHACH.feldNummer("a3")), "K",
        "der Koenig stuende auf a3");
    wahr(SCHACH.imSchach(roh.stand, "weiss"), "und stuende dort im Schach");

    /* Der Einsatz wird deshalb abgewiesen. */
    gleich(einsetzen(runde, "nudelholz", SCHACH.feldNummer("a1")), null,
        "eingesetzt werden kann es so nicht");
});

pruefe("Nudelholz schlaegt nicht — es schiebt nur (v0.77)", () => {
    /*
     * NACHGEMESSEN AM 18.08. zur Meldung: „Anscheinend ist meine Figur durch
     * das Nudelholz auf die Figur eines Gegners gezogen und hat sie damit
     * geschlagen."
     *
     * Das kann nicht passieren: Geschoben wird nur auf Felder, die LEER und
     * nicht gesperrt sind. Was der Nutzer gesehen hat, ist etwas anderes und
     * sieht nur genauso aus — die Spalten werden in Laufrichtung von VORN
     * abgearbeitet, damit eine Figur Platz macht, bevor die naechste nachrueckt.
     * Steht eine gegnerische Figur direkt vor der eigenen, wird also zuerst SIE
     * vorgeschoben, und die eigene rueckt auf deren altes Feld nach. Am Brett
     * steht die eigene Figur danach dort, wo eben noch die gegnerische stand —
     * die ist aber nicht weg, sondern ein Feld weiter.
     *
     * Der Test misst beides: die Stellung und die Zahl der Figuren.
     */
    const stand = SCHACH.standNormalisieren({
        variante: "faehigkeiten",
        brett: "....k..."
            + "........"
            + "........"
            + "........"
            + "........"
            + "b......."
            + "B......."
            + "....K...",
        amZug: "weiss",
        rochade: ""
    });

    const zaehlen = (brett) => brett.split("").filter((zeichen) => zeichen !== ".").length;
    const wirkung = SCHACH.nudelholz(stand, SCHACH.feldNummer("a1"), "unten");

    wahr(wirkung !== null, "es passiert etwas");
    gleich(zaehlen(wirkung.stand.brett), zaehlen(stand.brett),
        "keine einzige Figur ist verschwunden");

    const auf = (name) => SCHACH.figurAuf(wirkung.stand, SCHACH.feldNummer(name));
    gleich(auf("a4"), "b", "der gegnerische Bauer ist ein Feld weiter");
    gleich(auf("a3"), "B", "der eigene steht auf dessen altem Feld — das sieht aus wie ein Schlag");
    gleich(auf("a2"), ".", "und sein eigenes altes Feld ist leer");

    /* Und wenn davor WIRKLICH kein Platz ist, bleibt alles stehen. */
    const dicht = SCHACH.standNormalisieren({
        variante: "faehigkeiten",
        brett: "b...k..."
            + "b......."
            + "B......."
            + "B......."
            + "........"
            + "........"
            + "........"
            + "....K...",
        amZug: "weiss",
        rochade: ""
    });
    gleich(SCHACH.nudelholz(dicht, SCHACH.feldNummer("a1"), "unten"), null,
        "bis zum Rand zugestellt bewegt sich nichts — geschlagen wird erst recht nicht");
});


/* ------------------------------------------------------------------ *
 * Die zwei neuen gewöhnlichen Fähigkeiten (v0.79)
 * ------------------------------------------------------------------ */

pruefe("Schubs: eine gegnerische Figur weicht ein Feld zurueck (v0.79)", () => {
    /*
     * ANLASS: Nach dem Verstecken von Ausweichen (v0.78) standen in der
     * gewoehnlichen Stufe nur noch Sprung und Teleport — beide `istDerZug`,
     * beide „eine Figur bewegt sich anders". Gruen hatte kein Pluszeichen mehr.
     * Der Schubs ist die Ein-Feld-Fassung des Nudelholzes und behaelt den Zug.
     */
    const runde = faehigkeitenPartie();

    /* Ein schwarzer Bauer auf a3, direkt vor dem eigenen auf a2. */
    runde.stand.brett = SCHACH._brettMit(runde.stand.brett,
        SCHACH.feldNummer("a3"), "b");

    const nachher = einsetzen(runde, "schubs", SCHACH.feldNummer("a3"));
    wahr(nachher !== null, "eingesetzt");

    gleich(SCHACH.figurAuf(nachher.stand, SCHACH.feldNummer("a3")), ".",
        "a3 ist frei geworden");
    gleich(SCHACH.figurAuf(nachher.stand, SCHACH.feldNummer("a4")), "b",
        "der Bauer steht ein Feld weiter zurueck");
    gleich(SCHACH.figurAuf(nachher.stand, SCHACH.feldNummer("a2")), "B",
        "der eigene Bauer steht unveraendert");

    /* DER ZUG BLEIBT — das ist der Kern: Gruen hat wieder ein Pluszeichen. */
    gleich(nachher.stand.amZug, "weiss", "Weiss ist weiterhin am Zug");
});

pruefe("Schubs schlaegt nicht und schiebt keine Koenige (v0.79)", () => {
    const zaehlen = (brett) => brett.split("").filter((z) => z !== ".").length;

    /* 1. Ist das Feld dahinter besetzt, geht es gar nicht. */
    const zu = SCHACH.standNormalisieren({
        variante: "faehigkeiten",
        brett: "....k..."
            + "........"
            + "........"
            + "t......."
            + "b......."
            + "B......."
            + "........"
            + "....K...",
        amZug: "weiss",
        rochade: ""
    });

    gleich(SCHACH.schubs(zu, "weiss", SCHACH.feldNummer("a4")), null,
        "hinter dem Bauern steht der Turm — nichts geht");

    /* 2. Geht es doch, verschwindet trotzdem keine Figur. */
    const frei = SCHACH.standNormalisieren({
        variante: "faehigkeiten",
        brett: "....k..."
            + "........"
            + "........"
            + "........"
            + "b......."
            + "B......."
            + "........"
            + "....K...",
        amZug: "weiss",
        rochade: ""
    });

    const wirkung = SCHACH.schubs(frei, "weiss", SCHACH.feldNummer("a4"));
    wahr(wirkung !== null, "hier geht es");
    gleich(zaehlen(wirkung.stand.brett), zaehlen(frei.brett),
        "keine Figur ist verschwunden — geschlagen wird nicht");
    gleich(SCHACH.figurAuf(wirkung.stand, SCHACH.feldNummer("a5")), "b",
        "der Bauer steht ein Feld weiter weg");

    /*
     * 3. Koenige bleiben stehen. Anders als beim Nudelholz (v0.78, rollt
     * Koenige mit): Das Nudelholz trifft eine ganze Spalte und den Koenig
     * nebenbei, der Schubs sucht sich sein Ziel aus. Einen Koenig gezielt und
     * ohne Zugverlust zu verschieben waere fuer Gruen zu stark.
     */
    const mitKoenig = SCHACH.standNormalisieren({
        variante: "faehigkeiten",
        brett: "........"
            + "........"
            + "........"
            + "........"
            + "k......."
            + "B......."
            + "........"
            + "....K...",
        amZug: "weiss",
        rochade: ""
    });

    gleich(SCHACH.schubs(mitKoenig, "weiss", SCHACH.feldNummer("a4")), null,
        "der gegnerische Koenig wird nicht geschoben");
});

pruefe("Platztausch: der Springer kommt hinter dem Bauern hervor (v0.79)", () => {
    const runde = faehigkeitenPartie();

    /* Grundstellung: Springer b1, eigener Bauer b2 direkt davor. */
    const springer = SCHACH.feldNummer("b1");
    const bauer = SCHACH.feldNummer("b2");

    gleich(SCHACH.figurAuf(runde.stand, springer), "S", "der Springer steht auf b1");
    gleich(SCHACH.figurAuf(runde.stand, bauer), "B", "der Bauer auf b2");

    const nachher = einsetzen(runde, "platztausch", springer);
    wahr(nachher !== null, "eingesetzt");

    gleich(SCHACH.figurAuf(nachher.stand, bauer), "S", "der Springer steht jetzt vorn");
    gleich(SCHACH.figurAuf(nachher.stand, springer), "B", "der Bauer dahinter");

    /* SEIT v0.101 KOSTET ER DEN ZUG (Nutzer-Ansage W7: „kein Plus mehr") —
       bis v0.100 blieb Weiss hier am Zug. */
    gleich(nachher.stand.amZug, "schwarz", "und danach ist der Gegner am Zug");
});

pruefe("Platztausch: alle vier Richtungen, auch mit dem Gegner (v0.101)", () => {
    /*
     * WUNSCH W7: „Soll in jede Richtung gehen, auch mit gegnerischen Figuren,
     * kein Plus mehr, und nur die vier Seiten drum herum — horizontal und
     * vertikal."
     *
     * Die Richtungen stehen RELATIV ZUR EIGENEN ARMEE („vor" ist die
     * Marschrichtung der eigenen Bauern), damit sie auf dem gedrehten
     * Kreuz-Brett dasselbe bedeuten wie auf dem geraden.
     */
    const stand = SCHACH.standNormalisieren({
        variante: "faehigkeiten",
        brett: "....k..."
            + "........"
            + "........"
            + "........"
            + "...T...."
            + "..lDs..."
            + "...B...."
            + "....K...",
        amZug: "weiss",
        rochade: ""
    });

    const dame = SCHACH.feldNummer("d3");

    /* Weiss steht unten, „vor" ist also nach oben — dort steht der Turm. */
    const vor = SCHACH.platztausch(stand, "weiss", dame, "vor");
    wahr(vor !== null, "vor: der Turm ist der Partner");
    gleich(SCHACH.figurAuf(vor.stand, SCHACH.feldNummer("d4")), "D", "die Dame rueckt vor");
    gleich(SCHACH.figurAuf(vor.stand, dame), "T", "der Turm kommt zurueck");

    /* Zurueck steht der eigene Bauer. */
    const zurueck = SCHACH.platztausch(stand, "weiss", dame, "zurueck");
    wahr(zurueck !== null, "zurueck: der eigene Bauer");
    gleich(SCHACH.figurAuf(zurueck.stand, SCHACH.feldNummer("d2")), "D", "die Dame geht zurueck");

    /*
     * UND ZUR SEITE STEHEN GEGNER — das ist die eigentliche Neuerung. Links
     * der schwarze Laeufer, rechts der schwarze Springer.
     */
    const links = SCHACH.platztausch(stand, "weiss", dame, "links");
    wahr(links !== null, "links: auch ein gegnerischer Laeufer geht");
    gleich(SCHACH.figurAuf(links.stand, SCHACH.feldNummer("c3")), "D",
        "die Dame steht jetzt links");
    gleich(SCHACH.figurAuf(links.stand, dame), "l", "und der Gegner auf ihrem Platz");

    const rechts = SCHACH.platztausch(stand, "weiss", dame, "rechts");
    wahr(rechts !== null, "rechts: der gegnerische Springer ebenso");
    gleich(SCHACH.figurAuf(rechts.stand, SCHACH.feldNummer("e3")), "D",
        "die Dame steht jetzt rechts");

    /* Ohne Angabe gilt „vor" — jeder Aufruf von frueher bleibt gueltig. */
    const ohne = SCHACH.platztausch(stand, "weiss", dame);
    gleich(ohne.stand.brett, vor.stand.brett, "ohne Angabe wird nach vorn getauscht");

    /* Und es bleiben WIRKLICH nur die vier Seiten: schraeg geht nichts. */
    gleich(SCHACH.TAUSCH_RICHTUNGEN.length, 4, "genau vier Richtungen");
});

pruefe("Platztausch: nur eigene Figuren, nie der Koenig (v0.79)", () => {
    const runde = faehigkeitenPartie();

    /* 1. Vor dem Turm auf a1 steht der eigene Bauer — das geht. */
    wahr(SCHACH.platztausch(runde.stand, "weiss", SCHACH.feldNummer("a1")) !== null,
        "Turm und Bauer tauschen");

    /* 2. Der Koenig tauscht nicht — weder als Angetippter … */
    gleich(SCHACH.platztausch(runde.stand, "weiss", SCHACH.feldNummer("e1")), null,
        "der eigene Koenig tauscht nicht");

    /* … noch als der, mit dem getauscht wird. */
    const koenigDavor = SCHACH.standNormalisieren({
        variante: "faehigkeiten",
        brett: "....k..."
            + "........"
            + "........"
            + "........"
            + "........"
            + "K......."
            + "T......."
            + "........",
        amZug: "weiss",
        rochade: ""
    });
    gleich(SCHACH.platztausch(koenigDavor, "weiss", SCHACH.feldNummer("a2")), null,
        "und auch nicht als Vordermann");

    /*
     * 3. EINE GEGNERISCHE FIGUR DAVOR GEHT SEIT v0.101 (Wunsch W7) — bis
     * v0.100 war sie kein Tauschpartner. Der Test steht auf dem Kopf, weil
     * die Regel es tut.
     */
    const gegnerDavor = SCHACH.standNormalisieren({
        variante: "faehigkeiten",
        brett: "....k..."
            + "........"
            + "........"
            + "........"
            + "........"
            + "t......."
            + "T......."
            + "....K...",
        amZug: "weiss",
        rochade: ""
    });
    wahr(SCHACH.platztausch(gegnerDavor, "weiss", SCHACH.feldNummer("a2")) !== null,
        "mit dem Gegner wird jetzt getauscht");

    /* 4. Ohne Vordermann ebenfalls nicht. */
    const allein = SCHACH.standNormalisieren({
        variante: "faehigkeiten",
        brett: "....k..."
            + "........"
            + "........"
            + "........"
            + "........"
            + "........"
            + "T......."
            + "....K...",
        amZug: "weiss",
        rochade: ""
    });
    gleich(SCHACH.platztausch(allein, "weiss", SCHACH.feldNummer("a2")), null,
        "vor dem Turm steht niemand");
});

pruefe("Gruen hat wieder eine Auswahl UND ein Pluszeichen (v0.79)", () => {
    /*
     * Der eigentliche Grund fuer die zwei neuen: Nach v0.78 war jede zweite
     * Lootbox (52 Prozent Stufenchance) ein Muenzwurf zwischen zwei sehr
     * aehnlichen Faehigkeiten, und keine davon kam zum Zug DAZU.
     */
    const gruen = SCHACH_VARIANTEN.faehigkeitenDerStufe("gruen");

    wahr(gruen.length >= 4, "mindestens vier erreichbare (sind " + gruen.length + ")");

    const mitPlus = gruen.filter((art) => {
        const eintrag = SCHACH_VARIANTEN.FAEHIGKEITEN[art];
        return !eintrag.beendetZug && !eintrag.istDerZug;
    });

    /*
     * SEIT v0.101 GENUEGT EINE (vorher zwei). Der Platztausch hat sein
     * Pluszeichen auf Nutzer-Ansage verloren (W7: „kein Plus mehr"), weil er
     * jetzt auch gegnerische Figuren versetzt — dritter Anwendungsfall der
     * Regel „zu stark heisst Plus weg, nicht Stufe verschieben".
     *
     * Die Sorge von v0.79 bleibt trotzdem richtig und die Pruefung deshalb
     * stehen: Gruen darf nicht wieder auf „dein Zug wird ein anderer"
     * zusammenschrumpfen. Faellt auch der Schubs eines Tages weg, faellt es
     * hier auf, und dann braucht die Stufe Ersatz.
     */
    wahr(mitPlus.length >= 1, "davon mindestens eine mit Pluszeichen (sind "
        + mitPlus.length + ": " + mitPlus.join(", ") + ")");

    /*
     * UND DIE LEITER STIMMT NOCH: Keine einzelne gewoehnliche Faehigkeit darf
     * haeufiger sein als eine ungewoehnliche — sonst waere die Stufe keine
     * Aussage mehr.
     */
    for (const art of gruen) {
        for (const blau of SCHACH_VARIANTEN.faehigkeitenDerStufe("blau")) {
            wahr(SCHACH_VARIANTEN.chanceVon(art) > SCHACH_VARIANTEN.chanceVon(blau),
                art + " ist haeufiger als " + blau);
        }
    }
});

pruefe("Die Halluzination dauert so lange, wie sie sagt (v0.79)", () => {
    /*
     * ZWEI QUELLEN FUER DIESELBE ZAHL: die Konstante und der Beschreibungstext,
     * den der Nutzer liest. Als sie am 18.08. von 8 auf 4 Halbzuege gekuerzt
     * wurde, war genau das die Gefahr — der Text haette stehenbleiben koennen.
     */
    const dauer = SCHACH_RUNDE.GLAS_HALBZUEGE;

    gleich(dauer, 4, "vier Halbzuege, also zwei eigene Zuege blind");

    const text = SCHACH_VARIANTEN.pechBeschreibung("vollesGlas");
    wahr(text.indexOf(String(dauer) + " Halbzüge") !== -1,
        "der Beschreibungstext nennt dieselbe Zahl: " + text);
});
/* ------------------------------------------------------------------ *
 * Unglückswürfel
 * ------------------------------------------------------------------ */

/* Legt einen Unglückswürfel auf ein Feld und zieht mit einer Figur darauf. */
function pechEinsammeln(runde, art, von, nach) {
    const vorbereitet = SCHACH_RUNDE.kopieren(runde);
    vorbereitet.bonus.push({ feld: SCHACH.feldNummer(nach), art: art, pech: true });

    return SCHACH_RUNDE.ziehen(vorbereitet, "id-anna",
        SCHACH.feldNummer(von), SCHACH.feldNummer(nach), "D", "Anna", 4000);
}

pruefe("Die Ziehung erreicht jeden sichtbaren Unglueckswuerfel", () => {
    /*
     * Bis v0.83 stand hier „jede Stufe hat mindestens einen" — seit v0.84
     * DARF eine Stufe leer sein (Blau ist es, seit Ausdehnung und Einsturz
     * versteckt sind). Verlangt ist stattdessen: Es gibt ueberhaupt etwas zu
     * ziehen, und jeder sichtbare Eintrag wird auch wirklich erreicht.
     */
    const sichtbar = Object.keys(SCHACH_VARIANTEN.PECH)
        .filter((art) => !SCHACH_VARIANTEN.PECH[art].versteckt);
    wahr(sichtbar.length > 0, "es gibt sichtbare Unglueckswuerfel");

    const gezogen = new Set();
    for (let schritt = 0; schritt < 1000; schritt++) {
        gezogen.add(SCHACH_VARIANTEN.pechZiehen(schritt / 1000));
    }

    for (const art of sichtbar) {
        wahr(gezogen.has(art), "wird gezogen: " + art);
    }
});

pruefe("Ausdehnung und Einsturz sind aus dem Spiel (v0.84)", () => {
    /*
     * NUTZER-ANSAGE 19.08.: „nimm aus dem Spiel das Vergroessern und das
     * Verkleinern, das fuehrt zu riesigen Bugs". Beide bleiben als Eintrag
     * stehen (Verlauf und Bildanleitung sollen lesbar bleiben), duerfen aber
     * weder gezogen werden noch in der Bibliothek auftauchen.
     */
    for (const art of ["ausdehnung", "schrumpfung"]) {
        wahr(!!SCHACH_VARIANTEN.PECH[art], art + ": Eintrag steht noch da");
        wahr(SCHACH_VARIANTEN.PECH[art].versteckt === true, art + ": versteckt");
        wahr(SCHACH_VARIANTEN.pechDerStufe("blau").indexOf(art) === -1,
            art + ": nicht in der Stufenliste");
    }

    /* Ueber die ganze Breite der Ziehung kommt keines von beiden. */
    for (let schritt = 0; schritt < 2000; schritt++) {
        const gezogen = SCHACH_VARIANTEN.pechZiehen(schritt / 2000);
        wahr(gezogen !== "", "die Ziehung liefert immer eine Art");
        wahr(gezogen !== "ausdehnung" && gezogen !== "schrumpfung",
            "gezogen wurde " + gezogen);
    }

    /* Die leere Stufe Blau darf keine Ziehung verschlucken. */
    gleich(SCHACH_VARIANTEN.pechDerStufe("blau").length, 0, "Blau ist leer");
});

pruefe("Eine liegende Ausdehnung fliegt beim Laden vom Brett (v0.84)", () => {
    /*
     * Laufende Partien sollen den Fehler nicht weiter treffen: Was schon auf
     * dem Brett liegt, wird beim Normalisieren entfernt — gerechnet, also auf
     * jedem Geraet dieselbe Box.
     */
    const runde = faehigkeitenPartie();
    runde.bonus = [
        { feld: 20, art: "ausdehnung", pech: true },
        { feld: 21, art: "stolperstein", pech: true }
    ];

    const wieder = SCHACH_RUNDE.normalisieren(JSON.parse(JSON.stringify(runde)));
    const arten = wieder.bonus.map((eintrag) => eintrag.art);

    wahr(arten.indexOf("ausdehnung") === -1, "die Ausdehnung ist weg");
    wahr(arten.indexOf("stolperstein") !== -1, "der Stolperstein bleibt liegen");
});

pruefe("Volles Glas truebt die Sicht, ohne das Brett zu aendern", () => {
    let runde = faehigkeitenPartie();
    const vorher = runde.stand.brett;

    runde = pechEinsammeln(runde, "vollesGlas", "e2", "e4");
    wahr(runde !== null, "eingesammelt");

    /* Das Brett ist nur um den eigenen Zug veraendert — keine Figur wurde
       verschoben oder getauscht. */
    gleich(runde.stand.glasFarbe, "weiss", "Weiss sieht falsch");
    gleich(runde.stand.glasBis, SCHACH_RUNDE.GLAS_HALBZUEGE + 1, "und zwar begrenzt");
    gleich(SCHACH.figurAuf(runde.stand, SCHACH.feldNummer("e4")), "B", "der Bauer steht auf e4");
    gleich(SCHACH.figurAuf(runde.stand, SCHACH.feldNummer("e7")), "b",
        "die gegnerischen Figuren stehen unveraendert");

    /* Und die Regeln bleiben unberuehrt: Schwarz zieht ganz normal. */
    const danach = SCHACH_RUNDE.ziehen(runde, "id-bert",
        SCHACH.feldNummer("e7"), SCHACH.feldNummer("e5"), "D", "Bert", 4100);
    wahr(danach !== null, "Schwarz kann ziehen");
    gleich(danach.stand.glasFarbe, "weiss", "das Glas bleibt bis zum Ablauf");
});

pruefe("Ein Unglueckswuerfel kommt nicht in den Vorrat, sondern wirkt sofort", () => {
    const runde = pechEinsammeln(faehigkeitenPartie(), "stolperstein", "e2", "e4");

    wahr(runde !== null, "Zug erlaubt");
    gleich(runde.faehigkeiten.weiss.length, 0, "nichts im Vorrat");
    gleich(runde.bonus.length, 0, "vom Brett verschwunden");

    const letzter = runde.verlauf[runde.verlauf.length - 1];
    gleich(letzter.wirkung, "pech", "als Unglueck festgehalten");
    wahr(letzter.text.indexOf("Stolperstein") !== -1, "mit Namen im Verlauf");
});

pruefe("Stolperstein wirft die einsammelnde Figur zurueck", () => {
    const runde = pechEinsammeln(faehigkeitenPartie(), "stolperstein", "e2", "e4");

    /* Der Bauer zieht nach e4 und rutscht sofort auf e3 zurueck. */
    gleich(SCHACH.figurAuf(runde.stand, SCHACH.feldNummer("e4")), ".", "e4 ist wieder leer");
    gleich(SCHACH.figurAuf(runde.stand, SCHACH.feldNummer("e3")), "B", "der Bauer steht auf e3");

    const letzter = runde.verlauf[runde.verlauf.length - 1];
    gleich(letzter.wege.length, 1, "ein Weg fuer den Pfeil");
});

pruefe("Ausdehnung laesst das Brett wachsen und rechnet alle Felder um", () => {
    /* Links anbauen ist der harte Fall: Jede Feldnummer verschiebt sich. */
    const stand = SCHACH.standNormalisieren({ variante: "standard" });
    const gewachsen = SCHACH.ausdehnung(stand, "links");

    wahr(gewachsen !== null, "gewachsen");
    gleich(SCHACH.breiteVon(gewachsen.stand), 9, "eine Spalte mehr");
    gleich(SCHACH.hoeheVon(gewachsen.stand), 8, "gleich hoch");
    gleich(gewachsen.stand.brett.length, 72, "72 Felder");

    /* Die neue Spalte ist leer, die Figuren sind mitgewandert. */
    for (let reihe = 0; reihe < 8; reihe++) {
        gleich(gewachsen.stand.brett[reihe * 9], ".", "neue Spalte leer in Reihe " + reihe);
    }
    gleich(SCHACH.figurAuf(gewachsen.stand, SCHACH.feldNummer("b8", 9, 8)), "t",
        "der Turm steht jetzt auf b8");

    /* Und die gemerkten Felder stimmen weiterhin: Der Koenig behaelt sein Recht. */
    const lage = SCHACH.rochadeLage(gewachsen.stand, SCHACH.WEISS);
    gleich(lage.length, 2, "zwei Eintraege");
    wahr(lage[0].grund.indexOf("Figur") !== -1, "gesperrt, weil Figuren im Weg stehen");

    /* Nach dem Speichern und Laden bleiben die neuen Masse erhalten. */
    const geladen = SCHACH.standNormalisieren(JSON.parse(JSON.stringify(gewachsen.stand)));
    gleich(SCHACH.breiteVon(geladen), 9, "Breite ueberlebt das Laden");
    gleich(geladen.brett, gewachsen.stand.brett, "und das Brett auch");
});

pruefe("Ausdehnung schiebt auch Schild, Fessel und Frost mit", () => {
    let stand = SCHACH.standNormalisieren({ variante: "standard" });
    stand = Object.assign({}, stand, {
        schildFeld: SCHACH.feldNummer("e2"),
        schildFarbe: "weiss",
        frostFeld: SCHACH.feldNummer("e7"),
        frostFarbe: "schwarz"
    });

    const gewachsen = SCHACH.ausdehnung(stand, "oben");
    wahr(gewachsen !== null, "gewachsen");

    /* Oben angebaut: Jede Reihe rutscht um eine nach unten. */
    gleich(gewachsen.stand.schildFeld, stand.schildFeld + 8, "Schild mitgewandert");
    gleich(gewachsen.stand.frostFeld, stand.frostFeld + 8, "Frost mitgewandert");
    gleich(SCHACH.figurAuf(gewachsen.stand, gewachsen.stand.schildFeld), "B",
        "und da steht auch die geschuetzte Figur");
});

pruefe("Die toten Ecken wachsen mit — das Kreuz bleibt ein Kreuz (v0.77.1)", () => {
    /*
     * GEMELDET AM 18.08. mit Bildschirmfoto: Auf einem Kreuz-Brett waren die
     * vier toten Ecken zerfranst, und Lootboxen lagen dort, wo ein Loch sein
     * muesste. Ursache: Die Ausdehnung setzte die neue Spalte VOLLSTAENDIG
     * frei, die Ecke bekam dadurch ein Loch nach aussen. Zusammen mit der
     * Schrumpfung (die eine Linie samt Rissen wegwirft) frass sich die Form
     * ueber die Partie von den Raendern her auf.
     */
    const runde = SCHACH_RUNDE.leereRunde(1000, "kreuzKlein", "p-kreuz", "Kreuz");
    const stand = runde.stand;

    const rand = SCHACH_VARIANTEN.KREUZ.rand;
    gleich(SCHACH.risse(stand).length, 4 * rand * rand, "frisch: vier volle Ecken");

    for (const seite of ["links", "rechts"]) {
        const gewachsen = SCHACH.ausdehnung(stand, seite);
        wahr(gewachsen !== null, seite + ": gewachsen");

        const neuBreite = SCHACH.breiteVon(gewachsen.stand);
        const hoehe = SCHACH.hoeheVon(gewachsen.stand);
        const spalte = (seite === "links") ? 0 : neuBreite - 1;

        gleich(neuBreite, SCHACH.breiteVon(stand) + 1, seite + ": eine Spalte mehr");

        /* Die neue Spalte traegt oben und unten je `rand` Loecher — die
           fortgesetzte Ecke — und ist dazwischen frei. */
        for (let reihe = 0; reihe < hoehe; reihe++) {
            const feld = reihe * neuBreite + spalte;
            const sollLoch = (reihe < rand) || (reihe >= hoehe - rand);

            gleich(SCHACH.rissAuf(gewachsen.stand, feld), sollLoch,
                seite + ": Reihe " + reihe + " der neuen Spalte "
                + (sollLoch ? "ist ein Loch" : "ist frei"));
        }

        /* Und nichts steht darin — kopiert werden Loecher, keine Figuren. */
        for (let reihe = 0; reihe < hoehe; reihe++) {
            gleich(SCHACH.figurAuf(gewachsen.stand, reihe * neuBreite + spalte), ".",
                seite + ": die neue Spalte ist leer in Reihe " + reihe);
        }
    }
});

pruefe("Ein Erdbeben-Loch am Rand waechst NICHT mit (v0.77.1)", () => {
    /*
     * Die Gegenprobe: Fortgesetzt werden nur die Loecher an den ENDEN der
     * Randlinie, zusammenhaengend von dort gezaehlt — das sind die Ecken. Ein
     * einzelnes Loch mittendrin stammt von einem Erdbeben, gehoert dem
     * Spielverlauf und nicht der Brettform. Ohne diese Unterscheidung wuerde
     * es sich mit jeder Ausdehnung verbreitern.
     */
    const stand = SCHACH.standNormalisieren({
        variante: "standard",
        /* Ein Loch mitten in der linken Randspalte (a5) und eins in der
           obersten Ecke derselben Spalte (a8). */
        risse: [SCHACH.feldNummer("a8"), SCHACH.feldNummer("a5")]
    });

    const gewachsen = SCHACH.ausdehnung(stand, "links");
    wahr(gewachsen !== null, "gewachsen");

    const neuBreite = SCHACH.breiteVon(gewachsen.stand);
    gleich(neuBreite, 9, "eine Spalte mehr");

    /* a8 ist die obere Ecke der Randspalte — sie setzt sich fort. */
    gleich(SCHACH.rissAuf(gewachsen.stand, 0 * neuBreite), true,
        "die Ecke oben setzt sich fort");

    /* a5 liegt mittendrin (Reihe 3 von oben) — sie bleibt allein. */
    gleich(SCHACH.rissAuf(gewachsen.stand, 3 * neuBreite), false,
        "das Erdbeben-Loch waechst nicht mit");

    /* Das alte Loch selbst bleibt natuerlich, nur eine Spalte weiter rechts. */
    gleich(SCHACH.rissAuf(gewachsen.stand, 3 * neuBreite + 1), true,
        "es liegt weiterhin da, wo es war");
});

pruefe("Auf einem Brett ohne Loecher aendert die Ausdehnung nichts (v0.77.1)", () => {
    /* Kein Rueckschritt fuer das klassische Brett: keine Risse, keine neuen. */
    const stand = SCHACH.standNormalisieren({ variante: "standard" });

    for (const seite of ["links", "rechts", "oben", "unten"]) {
        const gewachsen = SCHACH.ausdehnung(stand, seite);
        wahr(gewachsen !== null, seite + ": gewachsen");
        gleich(SCHACH.risse(gewachsen.stand).length, 0, seite + ": weiterhin keine Loecher");
    }
});

pruefe("Auch oben und unten setzen die Ecken fort (v0.77.1)", () => {
    /*
     * Auf einem Kreuz kommt dieser Fall nie vor — `ausdehnung` sperrt „oben"
     * und „unten" ab einer Hoehe von 9, und jedes Kreuz ist mindestens 10 hoch.
     * Die Rechnung muss trotzdem in beide Richtungen stimmen, sonst ist sie
     * beim naechsten Brett falsch.
     */
    const stand = SCHACH.standNormalisieren({
        variante: "standard",
        /* Die oberste Reihe traegt links und rechts je zwei Loecher. */
        risse: [0, 1, 6, 7]
    });

    const gewachsen = SCHACH.ausdehnung(stand, "oben");
    wahr(gewachsen !== null, "gewachsen");
    gleich(SCHACH.hoeheVon(gewachsen.stand), 9, "eine Reihe mehr");

    for (const spalte of [0, 1, 6, 7]) {
        gleich(SCHACH.rissAuf(gewachsen.stand, spalte), true,
            "Spalte " + spalte + " der neuen obersten Reihe ist ein Loch");
    }
    for (const spalte of [2, 3, 4, 5]) {
        gleich(SCHACH.rissAuf(gewachsen.stand, spalte), false,
            "Spalte " + spalte + " bleibt frei");
    }
});

pruefe("Meuterei laesst eine eigene Figur ueberlaufen, nie den Koenig", () => {
    const stand = SCHACH.standNormalisieren({ variante: "standard" });

    /* Ueber alle Wahlwerte: Es trifft nie den Koenig. */
    for (let schritt = 0; schritt < 20; schritt++) {
        const wirkung = SCHACH.meuterei(stand, "weiss", schritt / 20);
        wahr(wirkung !== null, "eine Figur gefunden");

        const feld = wirkung.felder[0];
        gleich(SCHACH.farbeVon(SCHACH.figurAuf(wirkung.stand, feld)), "schwarz",
            "gehoert jetzt Schwarz");
        wahr(SCHACH.artVon(SCHACH.figurAuf(stand, feld)) !== "K", "war kein Koenig");
    }

    /* Der weisse Koenig steht noch. */
    gleich(SCHACH.figurAuf(SCHACH.meuterei(stand, "weiss", 0.5).stand,
        SCHACH.feldNummer("e1")), "K", "Koenig unveraendert");
});

pruefe("Erdrutsch schiebt alle eigenen Figuren zurueck", () => {
    const stand = SCHACH.standNormalisieren({
        brett: "....k..."
            + "........"
            + "........"
            + "...B.B.."
            + "........"
            + "..B....."
            + "........"
            + "....K...",
        amZug: "weiss",
        rochade: ""
    });

    const wirkung = SCHACH.erdrutsch(stand, "weiss");
    wahr(wirkung !== null, "gerutscht");

    /* Zurueck heisst fuer Weiss: nach unten (Richtung Reihe 8). */
    gleich(SCHACH.figurAuf(wirkung.stand, SCHACH.feldNummer("d4")), "B", "d5 nach d4");
    gleich(SCHACH.figurAuf(wirkung.stand, SCHACH.feldNummer("f4")), "B", "f5 nach f4");
    gleich(SCHACH.figurAuf(wirkung.stand, SCHACH.feldNummer("c2")), "B", "c3 nach c2");
    gleich(SCHACH.figurAuf(wirkung.stand, SCHACH.feldNummer("e1")), "K", "der Koenig bleibt");
    gleich(wirkung.wege.length, 3, "drei Wege fuer die Pfeile");
});

pruefe("Erdrutsch schiebt niemanden auf ein gesperrtes Feld (v0.82)", () => {
    /*
     * GEFUNDEN AM 18.08. auf die Frage „kontrolliere Erdrutsch, ob es beim
     * Kreuz-Spielfeld noch funktioniert": Der Erdrutsch fragte als EINZIGE
     * dieser Funktionen nur „steht da eine Figur" — nicht, ob das Feld
     * gesperrt ist. Er schob Figuren damit auf Mauern und in Risse hinein.
     * Bauernschub, Nudelholz, Erdbeben und Schubs fragen hier seit jeher
     * richtig; derselbe Fehler hatte das Nudelholz bis v0.59.
     */
    const grund = "....k..."
        + "........"
        + "........"
        + "........"
        + "........"
        + "........"
        + "T......."
        + "....K...";

    /* 1. Eine Mauer hinter dem Turm. */
    const mitMauer = SCHACH.standNormalisieren({
        variante: "faehigkeiten",
        brett: grund,
        amZug: "weiss",
        rochade: "",
        mauern: [{ felder: [SCHACH.feldNummer("a1"), SCHACH.feldNummer("b1"),
            SCHACH.feldNummer("c1")], bis: 99 }]
    });

    wahr(SCHACH.mauerAuf(mitMauer, SCHACH.feldNummer("a1")), "die Mauer steht");

    const anMauer = SCHACH.erdrutsch(mitMauer, "weiss");
    if (anMauer) {
        gleich(SCHACH.figurAuf(anMauer.stand, SCHACH.feldNummer("a1")), ".",
            "auf der Mauer steht niemand");
        gleich(SCHACH.figurAuf(anMauer.stand, SCHACH.feldNummer("a2")), "T",
            "der Turm bleibt davor stehen");
    }

    /* 2. Ein Riss hinter dem Turm. */
    const mitRiss = SCHACH.standNormalisieren({
        variante: "faehigkeiten",
        brett: grund,
        amZug: "weiss",
        rochade: "",
        risse: [SCHACH.feldNummer("a1")]
    });

    const amRiss = SCHACH.erdrutsch(mitRiss, "weiss");
    if (amRiss) {
        gleich(SCHACH.figurAuf(amRiss.stand, SCHACH.feldNummer("a1")), ".",
            "im Riss steht niemand");
        gleich(SCHACH.figurAuf(amRiss.stand, SCHACH.feldNummer("a2")), "T",
            "der Turm bleibt auch hier stehen");
    }

    /* 3. Ohne Sperre rutscht er sehr wohl — sonst prueft der Test nichts. */
    const frei = SCHACH.standNormalisieren({
        variante: "faehigkeiten",
        brett: grund,
        amZug: "weiss",
        rochade: ""
    });

    const gerutscht = SCHACH.erdrutsch(frei, "weiss");
    wahr(gerutscht !== null, "ohne Sperre passiert etwas");
    gleich(SCHACH.figurAuf(gerutscht.stand, SCHACH.feldNummer("a1")), "T",
        "der Turm rutscht auf a1 zurueck");
});

pruefe("Erdrutsch: auf dem Kreuz rutscht jede Armee zu IHRER Seite (v0.82)", () => {
    /*
     * DER GEMELDETE VERDACHT, und er stimmte. Bis v0.81 hatte der Erdrutsch
     * EINE Richtung je Farbe (`farbe === WEISS ? 1 : -1`), immer senkrecht.
     * Auf dem Kreuz hat eine Farbe aber ZWEI Startseiten (v0.65). Gemessen kam
     * heraus: Die obere weisse Armee rutschte nach UNTEN, also nach VORN — aus
     * der Strafe wurde ein Geschenk —, und die untere bewegte sich gar nicht.
     */
    /*
     * DIE STELLUNG WIRD VON HAND GEBAUT, nicht aus einer Kreuz-Partie geholt:
     * Welche Startseiten eine Farbe bekommt, wird aus der Partie-Kennung
     * gerechnet (v0.72) — ein Test, der „oben und unten" erwartet, haengt dann
     * an der Kennung und faellt beim naechsten Umbau um. Gebraucht wird hier
     * nur der Fall ZWEI GEGENUEBERLIEGENDE STARTSEITEN, und den schreibt man
     * direkt hin.
     */
    const stand = SCHACH.standNormalisieren({
        variante: "faehigkeiten",
        brett: "....k..."
            + "........"
            + "BBB....."      /* obere weisse Armee, zwei Reihen vorgerueckt */
            + "........"
            + "........"
            + "BBB....."      /* untere weisse Armee, ebenfalls vorgerueckt */
            + "........"
            + "....K...",
        amZug: "weiss",
        rochade: "",
        startSeiten: { weiss: ["oben", "unten"], schwarz: ["links", "rechts"] }
    });

    const breite = SCHACH.breiteVon(stand);
    gleich(SCHACH.startSeitenVon(stand, "weiss").slice().sort().join(","),
        "oben,unten", "Weiss startet oben UND unten");

    const gerutscht = SCHACH.erdrutsch(stand, "weiss");
    wahr(gerutscht !== null, "es passiert etwas");

    const auf = (r, s) => SCHACH.figurAuf(gerutscht.stand, r * breite + s);

    for (let spalte = 0; spalte < 3; spalte++) {
        /* Die OBERE Armee rutscht nach OBEN — zu ihrer eigenen Seite. */
        gleich(auf(1, spalte), "B", "oben: Spalte " + spalte + " ist zurueckgerutscht");
        gleich(auf(2, spalte), ".", "oben: das alte Feld ist frei");

        /* Die UNTERE nach UNTEN — in die ANDERE Richtung, gleiche Farbe. */
        gleich(auf(6, spalte), "B", "unten: Spalte " + spalte + " ist zurueckgerutscht");
        gleich(auf(5, spalte), ".", "unten: das alte Feld ist frei");
    }

    /*
     * DAS IST DER KERN: Bis v0.81 rutschten BEIDE nach unten, weil die
     * Richtung nur an der Farbe hing. Die obere Armee waere damit nach VORN
     * gerutscht — aus der Strafe waere ein Geschenk geworden.
     */
    gleich(auf(3, 0), ".", "die obere Armee ist NICHT nach unten gerutscht");
});

pruefe("Der Regen ist etwas schwaecher geworden — aber nicht am Ende (v0.82)", () => {
    /*
     * NUTZER-ANSAGE 18.08.: „Regen ein kleines wenig schwaecher, also nur ein
     * wenig weniger — aber schon so, dass sich bei 2 Figuren jeden Halbzug
     * alles fuellt."
     *
     * Beides zusammen geht nur ueber den Exponenten: Er steuert, wie frueh es
     * losgeht; das Ende ist bei jedem Exponenten dasselbe, weil `Math.pow(1, n)`
     * immer 1 ist.
     */
    const ALLE = 64;
    const voll = ALLE - SCHACH_VARIANTEN.REGEN.bleibenStehen;

    /* DAS ENDE IST UNANGETASTET: Stehen nur noch die Koenige, bekommt jedes
       freie Feld eine Lootbox. Das ist die Zusage aus v0.59. */
    gleich(SCHACH_VARIANTEN.mengenAnzahl("regen", voll, ALLE, 0), voll,
        "am Ende weiterhin jedes freie Feld");
    gleich(SCHACH_VARIANTEN.mengenChance("regen", voll, ALLE), 100,
        "und es regnet dann auch sicher");

    /* DAVOR IST ES WENIGER als mit der alten Kurve 3. */
    const alt = (freie) => Math.max(1, Math.min(freie,
        Math.ceil(freie * Math.pow(SCHACH_VARIANTEN.regenAnteil(freie, ALLE), 3))));

    let irgendwoWeniger = false;
    for (const freie of [24, 32, 40, 48, 56]) {
        const jetzt = SCHACH_VARIANTEN.mengenAnzahl("regen", freie, ALLE, 0);

        wahr(jetzt <= alt(freie), "bei " + freie + " freien Feldern nicht mehr als vorher ("
            + jetzt + " gegen " + alt(freie) + ")");
        if (jetzt < alt(freie)) {
            irgendwoWeniger = true;
        }
    }
    wahr(irgendwoWeniger, "und irgendwo wirklich weniger — sonst haette sich nichts getan");

    /* DIE LEITER BLEIBT: Keine Stufe liefert weniger als die darunter. */
    const reihe = SCHACH_VARIANTEN.LOOTBOX_MENGEN.map((menge) => menge.id);
    for (const freie of [8, 24, 40, 56, voll]) {
        for (let stelle = 1; stelle < reihe.length; stelle++) {
            wahr(SCHACH_VARIANTEN.mengenAnzahl(reihe[stelle], freie, ALLE, 0.5)
                >= SCHACH_VARIANTEN.mengenAnzahl(reihe[stelle - 1], freie, ALLE, 0.5),
                reihe[stelle] + " wirft bei " + freie
                + " freien Feldern nicht weniger aus als " + reihe[stelle - 1]);
        }
    }
});

pruefe("Der Verlauf verraet nicht, was in einem Wuerfel steckt", () => {
    const runde = springerZuege(faehigkeitenPartie(), 24);
    const eintrag = runde.verlauf.find((zeile) => zeile.wirkung === "erscheint");

    wahr(!!eintrag, "ein Erscheinen im Verlauf");

    for (const art of Object.keys(SCHACH_VARIANTEN.FAEHIGKEITEN)) {
        wahr(eintrag.text.indexOf(SCHACH_VARIANTEN.faehigkeitTitel(art)) === -1,
            "verraet nicht " + art);
    }
    for (const art of Object.keys(SCHACH_VARIANTEN.PECH)) {
        wahr(eintrag.text.indexOf(SCHACH_VARIANTEN.pechTitel(art)) === -1,
            "verraet nicht " + art);
    }
});

pruefe("Die Zielfelder passen zu dem, was die Wirkung wirklich zulaesst", () => {
    const runde = faehigkeitenPartie();

    /* Seit v0.56 wertet die Verstaerkung JEDE eigene Figur auf, nicht nur
       Bauern — nur der einzelne Koenig bleibt aussen vor. */
    const aufwertbar = SCHACH_RUNDE.zielFelder(runde, "id-anna", "verstaerkung");
    gleich(aufwertbar.length, 15, "alle eigenen Figuren ausser dem einen Koenig");
    wahr(aufwertbar.indexOf(SCHACH.feldNummer("e1")) === -1,
        "der letzte Koenig laesst sich nicht eintauschen");
    wahr(aufwertbar.indexOf(SCHACH.feldNummer("a1")) !== -1, "der Turm ist dabei");

    const schild = SCHACH_RUNDE.zielFelder(runde, "id-anna", "schutzschild");
    gleich(schild.length, 15, "alle eigenen Figuren ausser dem Koenig");
    wahr(schild.indexOf(SCHACH.feldNummer("e1")) === -1, "der Koenig ist nicht dabei");

    const fessel = SCHACH_RUNDE.zielFelder(runde, "id-anna", "fessel");
    gleich(fessel.length, 15, "alle gegnerischen Figuren ausser dem Koenig");
    wahr(fessel.indexOf(SCHACH.feldNummer("e8")) === -1, "der gegnerische Koenig auch nicht");

    gleich(SCHACH_RUNDE.zielFelder(runde, "id-anna", "wiedergeburt").length, 0,
        "ohne verlorene Figur kein Ziel");

    /* Fähigkeiten ohne Ziel liefern keine Felder. */
    gleich(SCHACH_RUNDE.zielFelder(runde, "id-anna", "sprung").length, 0, "Sprung braucht keins");
});

pruefe("Jede Faehigkeit laesst sich einsetzen und wird dabei verbraucht", () => {
    /* Sicherheitsnetz: Kommt eine neue Faehigkeit dazu, ohne dass jemand ihre
       Wirkung baut, faellt es hier auf. */
    const ziele = {
        verstaerkung: "e2",
        schutzschild: "d1",
        fessel: "b8",
        frost: "b8",
        wiedergeburt: "b1",
        /* Das Grab liegt dort, wo die Figur fiel — hier von Hand gesetzt. */
        wiederbelebung: "e4",
        /* Angetippt wird die MITTE: a4 bis c4 ist in der Grundstellung frei. */
        mauer: "b4",
        /* Das 2x2-Feld a5/b5/a4/b4 ist frei; Gefallene setzt der Test. */
        friedhof: "a5",
        /* Ein Bauer hat als Einziger ein freies Nachbarfeld. */
        spiegel: "a2",
        /* Angetippt wird die EIGENE Grundreihe; gerollt wird von dort weg. */
        nudelholz: "a1",
        /* Der neue Bauer braucht ein FREIES Feld der eigenen Grundreihe —
           in der Grundstellung ist keines frei, der Test raeumt b1. */
        nachschub: "b1",

        /* Geschubst wird eine GEGNERISCHE Figur neben einer eigenen. In der
           Grundstellung beruehren sich die Armeen nicht, der Test setzt eine
           auf a3 — der eigene Bauer auf a2 schiebt sie nach a4. */
        schubs: "a3",

        /* Getauscht wird mit der eigenen Figur DAVOR: Springer b1 mit dem
           Bauern b2. In der Grundstellung steht das schon so. */
        platztausch: "b1"
    };

    for (const art of Object.keys(SCHACH_VARIANTEN.FAEHIGKEITEN)) {
        let runde = faehigkeitenPartie();
        let feld = -1;

        if (ziele[art]) {
            feld = SCHACH.feldNummer(ziele[art]);
        }
        if (art === "wiedergeburt" || art === "nachschub") {
            runde.stand.brett = SCHACH._brettMit(runde.stand.brett, feld, ".");
        }
        if (art === "wiedergeburt") {
            runde.verloren.weiss.push("S");
        }
        if (art === "wiederbelebung") {
            runde.gefallen.weiss.push({ art: "S", feld: feld });
        }
        if (art === "friedhof") {
            /*
             * Gefallene GEGNER - sie stehen fuer Weiss wieder auf. SEIT v0.54
             * muessen sie IM gewaehlten 2x2-Block liegen: Die Faehigkeit weckt,
             * wer genau dort fiel.
             */
            runde.gefallen.schwarz.push({ art: "T", feld: SCHACH.feldNummer("a5") });
            runde.gefallen.schwarz.push({ art: "S", feld: SCHACH.feldNummer("b4") });
        }
        if (art === "nudelholz") {
            /* In den Spalten a und b muss etwas stehen, das Platz nach oben
               hat. */
            runde.stand.brett = SCHACH._brettMit(runde.stand.brett,
                SCHACH.feldNummer("a5"), "b");
        }
        if (art === "schubs") {
            /* Der gegnerische Bauer, der geschoben werden soll. */
            runde.stand.brett = SCHACH._brettMit(runde.stand.brett, feld, "b");
        }
        if (art === "dieb") {
            /* Er greift als Einziger in den VORRAT des Gegners — ist der leer,
               laesst er sich zu Recht nicht einsetzen (v0.85). */
            runde.faehigkeiten.schwarz.push("frost");
        }

        /* Ausweichen geht seit v0.58 NUR im Gegenzug — sonst waere es hier
           zu Recht abgewiesen. */
        if (SCHACH_VARIANTEN.FAEHIGKEITEN[art].nurImGegenzug) {
            runde.stand.amZug = "schwarz";
        }

        const nachher = einsetzen(runde, art, feld);
        wahr(nachher !== null, "einsetzbar: " + art);

        /* Der Dieb ist verbraucht wie jede andere — nur liegt danach seine
           BEUTE im eigenen Vorrat, und die zaehlt hier mit. */
        const uebrig = (art === "dieb") ? 1 : 0;
        gleich(nachher.faehigkeiten.weiss.length, uebrig, "verbraucht: " + art);
        gleich(nachher.zugZaehler, runde.zugZaehler + 1, "Zugzaehler steigt: " + art);

        const letzter = nachher.verlauf[nachher.verlauf.length - 1];
        gleich(letzter.wirkung, art, "Wirkung im Verlauf: " + art);
    }
});


/* ------------------------------------------------------------------ *
 * Die Zufallsarmee auf dem Kreuz (v0.76)
 * ------------------------------------------------------------------ */

pruefe("Auf dem Kreuz zaehlt die MITTE, nicht die Brettbreite (v0.76)", () => {
    /*
     * DER GEMELDETE PUNKT: „Statt bei kleinem Quadrat 4 Figuren jeder hat man
     * halt 8 beim Kreuz, weil die Armee gesplittet ist."
     *
     * Ein Kreuz-Streifen ist so breit wie die MITTE (Brettbreite minus die zwei
     * toten Ecken je Seite), nicht wie das Brett. Beim kleinen Kreuz sind das
     * dieselben 6 wie beim kleinen Quadrat — und damit dieselben 4 Figuren je
     * Startseite.
     */
    const erwartet = { kreuzKlein: 4, kreuz: 8, kreuzGross: 12 };

    /* Der freie Rand gehoert zur Stufe „wenig" — bis v0.103 hiess sie
       „normal" (siehe die Leiter in `ARMEE_STAERKEN`). */
    for (const id of Object.keys(erwartet)) {
        const variante = SCHACH_VARIANTEN.holen(id);
        const platz = SCHACH_VARIANTEN.armeeSpalten(variante, "wenig");

        gleich(SCHACH_VARIANTEN.armeeAnzahl(variante, "wenig"), erwartet[id],
            id + ": Figuren je Startseite");

        /* Zwei tote Ecken plus zwei freie Spalten — auf jeder Kreuz-Groesse. */
        gleich(platz.rand, 4, id + ": zwei tote Ecken und zwei freie Spalten");
        gleich(platz.rand + platz.spalten, variante.breite - 4,
            id + ": auf der anderen Seite genauso");
    }

    /* Die viereckigen Bretter rechnen unveraendert weiter. */
    for (const id of ["standard", "klein", "gross", "doppelbrett"]) {
        gleich(SCHACH_VARIANTEN.armeeSpalten(
            SCHACH_VARIANTEN.holen(id), "wenig").rand, 2,
            id + ": weiterhin zwei freie Spalten");
    }
});

pruefe("Die Zufallsarmee steht auf beiden Startseiten des Kreuzes (v0.76)", () => {
    /*
     * Bis v0.75 kannte `_armeeStand` nur oben und unten: Auf dem Kreuz standen
     * beide Armeen quer ueber der Mitte, die Fluegel blieben leer — und die
     * Ansicht drehte sich auf eine Startseite ohne Figuren.
     */
    for (const kennung of ["k-a", "k-b", "k-c"]) {
        const runde = armeePartie("kreuzKlein", kennung, false);
        const soll = SCHACH_VARIANTEN.armeeAnzahl(SCHACH_VARIANTEN.holen("kreuzKlein"));

        for (const farbe of ["weiss", "schwarz"]) {
            const seiten = SCHACH.startSeitenVon(runde.stand, farbe);
            gleich(seiten.length, 2, kennung + "/" + farbe + ": zwei Startseiten");

            const gezaehlt = figurenZaehlen(runde.stand, farbe);
            const summe = Object.keys(gezaehlt)
                .reduce((wert, art) => wert + gezaehlt[art], 0);

            gleich(summe, soll * 2,
                kennung + "/" + farbe + ": je Startseite eine Armee");

            /* Auf JEDER Startseite muss auch wirklich etwas stehen. */
            for (const seite of seiten) {
                const felder = SCHACH_RUNDE._armeeFelderKreuz(
                    SCHACH_VARIANTEN.holen("kreuzKlein"), seite);
                const besetzt = felder.filter((feld) =>
                    SCHACH.farbeVon(SCHACH.figurAuf(runde.stand, feld)) === farbe);

                gleich(besetzt.length, soll,
                    kennung + "/" + farbe + "/" + seite + ": voll besetzt");
            }
        }

        /* Nichts steht in einer toten Ecke — die Risse bleiben, was sie sind. */
        for (const feld of SCHACH.risse(runde.stand)) {
            gleich(SCHACH.figurAuf(runde.stand, feld), ".",
                kennung + ": tote Ecke bleibt leer (" + feld + ")");
        }
    }
});

pruefe("Beim Kreuz-Duell steht je EINE Armee gegenueber (v0.76)", () => {
    /* „Bei kleinem Kreuz-Duell sollen es wieder gegenueber je 4 Figuren sein." */
    const runde = armeePartie("kreuzKleinEinzeln", "k-duell", false, "wenig");
    const soll = SCHACH_VARIANTEN.armeeAnzahl(
        SCHACH_VARIANTEN.holen("kreuzKleinEinzeln"), "wenig");

    gleich(soll, 4, "vier Figuren je Team");

    const weisse = SCHACH.startSeitenVon(runde.stand, "weiss");
    const schwarze = SCHACH.startSeitenVon(runde.stand, "schwarz");

    gleich(weisse.length, 1, "Weiss hat eine Startseite");
    gleich(schwarze.length, 1, "Schwarz hat eine Startseite");
    gleich(SCHACH.SEITEN[weisse[0]].gegen, schwarze[0], "und sie liegen sich gegenueber");

    for (const farbe of ["weiss", "schwarz"]) {
        const gezaehlt = figurenZaehlen(runde.stand, farbe);
        const summe = Object.keys(gezaehlt)
            .reduce((wert, art) => wert + gezaehlt[art], 0);
        gleich(summe, soll, farbe + ": genau die eine Armee");
    }
});

pruefe("Jeder gewuerfelte Bauer auf dem Kreuz kennt seine Startseite (v0.76)", () => {
    /*
     * Ohne Eintrag faellt ein Bauer auf die FARBREGEL zurueck (Weiss nach oben)
     * — auf einem Fluegel liefe er damit quer statt zur Mitte. Die Eintraege der
     * Vorlage helfen nicht: Dort, wo vorher ein Bauer stand, steht jetzt
     * vielleicht ein Turm.
     */
    for (const kennung of ["k-bauer-1", "k-bauer-2", "k-bauer-3"]) {
        const runde = armeePartie("kreuzKlein", kennung, true);

        for (let feld = 0; feld < SCHACH.felderVon(runde.stand); feld++) {
            const figur = SCHACH.figurAuf(runde.stand, feld);
            if (SCHACH.artVon(figur) !== "B") {
                continue;
            }

            const seite = SCHACH.bauernSeite(runde.stand, feld);
            const eigene = SCHACH.startSeitenVon(runde.stand, SCHACH.farbeVon(figur));

            wahr(eigene.indexOf(seite) !== -1,
                kennung + ": Bauer auf " + feld + " kennt seine Seite (" + seite + ")");
        }

        /* Und kein Eintrag zeigt auf ein Feld ohne Bauern. */
        for (const eintrag of runde.stand.bauernSeiten) {
            gleich(SCHACH.artVon(SCHACH.figurAuf(runde.stand, eintrag.feld)), "B",
                kennung + ": Eintrag " + eintrag.feld + " gehoert zu einem Bauern");
        }
    }
});

/* ------------------------------------------------------------------ *
 * Lootboxen erscheinen nie im Nichts (v0.76)
 * ------------------------------------------------------------------ */

pruefe("Keine Lootbox auf einem Riss oder unter einer Mauer (v0.76)", () => {
    /*
     * DER GEMELDETE FEHLER: „Bei Kreuz-Karten sollen nicht Lootboxen im Nichts
     * spawnen." Die vier toten Ecken sind gewoehnliche Risse — leer, aber
     * unerreichbar. Bis v0.75 zaehlte `_bonusNachziehen` nur „steht da eine
     * Figur", und die Box lag danach mitten im Schwarzen.
     *
     * Geprueft wird ueber viele Zuege, nicht ueber einen: Wo eine Box
     * erscheint, ist gerechnet und haengt am Zugzaehler.
     */
    let runde = armeePartie("kreuzKlein", "k-loot", false);
    runde.regeln.faehigkeiten = true;
    runde.regeln.lootboxMenge = "regen";
    runde.laeuft = true;
    runde.teams.weiss = ["id-anna"];
    runde.teams.schwarz = ["id-bert"];

    /* Dazu ein paar Risse mitten im Brett — ein Erdbeben macht genau das. */
    runde.stand = Object.assign({}, runde.stand, {
        risse: SCHACH.risse(runde.stand).concat([44, 45, 54, 55])
    });

    let gesehen = 0;

    for (let takt = 0; takt < 60; takt++) {
        runde.zugZaehler = takt;
        SCHACH_RUNDE._bonusNachziehen(runde);

        for (const eintrag of runde.bonus) {
            gleich(SCHACH.gesperrt(runde.stand, eintrag.feld), false,
                "Lootbox auf " + eintrag.feld + " liegt auf freiem Grund");
            gleich(SCHACH.figurAuf(runde.stand, eintrag.feld), ".",
                "Lootbox auf " + eintrag.feld + " liegt auf einem leeren Feld");
        }

        gesehen = Math.max(gesehen, runde.bonus.length);
    }

    wahr(gesehen > 0, "es sind ueberhaupt Lootboxen erschienen (" + gesehen + ")");
});

/* ------------------------------------------------------------------ *
 * Der Figurenzaehler (v0.76)
 * ------------------------------------------------------------------ */

pruefe("Der Materialzaehler rechnet aus der STELLUNG (v0.76)", () => {
    /*
     * DER GEMELDETE FEHLER: „Der Figurenzaehler plus/minus ist nicht richtig,
     * bitte von bekannten Schach-Apps abschauen." Die zaehlen, was auf dem
     * Brett steht — und genau darin unterschied sich der alte Zaehler: Er
     * rechnete Beute minus eigene Verluste und sah damit keine Umwandlung,
     * keine Wiedergeburt und keine Verstaerkung.
     */
    const runde = laufendePartie();

    gleich(SCHACH_RUNDE.materialWert(runde, "weiss"), 39, "Grundstellung: 39");
    gleich(SCHACH_RUNDE.materialVorsprung(runde, "weiss"), 0, "und ausgeglichen");

    /* Eine Dame gegen nichts — ohne dass jemals etwas geschlagen wurde. */
    const dame = SCHACH_RUNDE.kopieren(runde);
    dame.stand = SCHACH.standNormalisieren({
        variante: "standard",
        brett: "....k..."
            + "........"
            + "........"
            + "........"
            + "........"
            + "........"
            + "........"
            + "D...K...",
        amZug: "weiss",
        rochade: ""
    });

    gleich(SCHACH_RUNDE.materialVorsprung(dame, "weiss"), 9, "neun voraus");
    gleich(SCHACH_RUNDE.materialVorsprung(dame, "schwarz"), -9, "und von der anderen Seite");
    gleich(SCHACH_RUNDE.bilanz(dame, "weiss").punkte, 0,
        "die alte Rechnung sieht davon nichts — deshalb die neue");

    /* Der Koenig zaehlt nicht mit: Ein zweiter Koenig ist ein Leben, kein
       Materialvorteil. */
    const koenige = SCHACH_RUNDE.kopieren(runde);
    koenige.stand = SCHACH.standNormalisieren({
        variante: "standard",
        brett: "....k..."
            + "........"
            + "........"
            + "........"
            + "........"
            + "........"
            + "........"
            + "K...K...",
        amZug: "weiss",
        rochade: ""
    });

    gleich(SCHACH_RUNDE.materialVorsprung(koenige, "weiss"), 0, "Koenige zaehlen nicht");
});

/* ------------------------------------------------------------------ *
 * Ein aktives Item abbrechen (v0.76)
 * ------------------------------------------------------------------ */

pruefe("Sprung und Teleport lassen sich abbrechen und kommen zurueck (v0.76)", () => {
    /*
     * DER GEMELDETE PUNKT: „Wenn man ein Item aktiv hat, also gerade dabei ist
     * eine Figur auszuwaehlen, soll man mit einem Abbrechen-Knopf das Item
     * abbrechen koennen, und das Item muss zurueckgegeben werden."
     *
     * Fuer Faehigkeiten mit Zielfeld gibt es das seit v0.57 — dort ist noch gar
     * nichts eingesetzt. Sprung und Teleport (`istDerZug`) sind dagegen sofort
     * verbraucht; hier wird wirklich zurueckgenommen.
     */
    for (const art of ["sprung", "teleport"]) {
        let runde = laufendePartie();
        runde.faehigkeiten.weiss.push(art);

        const vorher = runde.stand.brett;

        runde = SCHACH_RUNDE.faehigkeitEinsetzen(runde, "id-anna", art, -1, "Anna", 2000);
        wahr(runde !== null, art + ": eingesetzt");
        gleich(runde.faehigkeiten.weiss.length, 0, art + ": verbraucht");
        gleich(SCHACH_RUNDE.laufendesZugmuster(runde, "weiss"), art,
            art + ": das Modell weiss, welche laeuft");

        const zurueck = SCHACH_RUNDE.zugmusterZuruecknehmen(runde, "id-anna", 2500);

        wahr(zurueck !== null, art + ": abgebrochen");
        gleich(zurueck.faehigkeiten.weiss.join(","), art, art + ": wieder im Vorrat");
        gleich(zurueck.stand.zusatzMuster, "", art + ": kein Muster mehr");
        gleich(zurueck.stand.zusatzNurDieses, false, art + ": und keine Fessel daran");
        gleich(zurueck.stand.sprungAktiv, "", art + ": auch die Marke ist weg");
        gleich(zurueck.stand.brett, vorher, art + ": die Stellung ist unberuehrt");
        gleich(zurueck.stand.amZug, "weiss", art + ": man ist weiter am Zug");
        gleich(zurueck.zugZaehler, runde.zugZaehler + 1, art + ": der Zugzaehler steigt");

        /* Kein Geschenk: Ein zweites Abbrechen geht ins Leere, und der Gegner
           darf es ohnehin nicht. */
        gleich(SCHACH_RUNDE.zugmusterZuruecknehmen(zurueck, "id-anna", 2600), null,
            art + ": nichts mehr abzubrechen");
        gleich(SCHACH_RUNDE.zugmusterZuruecknehmen(runde, "id-bert", 2600), null,
            art + ": der Gegner nimmt nichts zurueck");
    }
});

pruefe("Ausweichen laeuft nicht als abbrechbares Zugmuster (v0.76)", () => {
    /*
     * Es setzt zwar ein Zugmuster, ist aber KEIN `istDerZug`: Man bekommt ein
     * zusaetzliches Feld fuer den naechsten eigenen Zug und bleibt sonst frei.
     * Da gibt es nichts abzubrechen — und `zusatzNurDieses` steht deshalb auch
     * nicht.
     */
    let runde = laufendePartie();
    runde.faehigkeiten.schwarz.push("ausweichen");

    runde = SCHACH_RUNDE.faehigkeitEinsetzen(runde, "id-bert", "ausweichen", -1, "Bert", 2000);

    wahr(runde !== null, "im Gegenzug eingesetzt");
    gleich(SCHACH_RUNDE.laufendesZugmuster(runde, "schwarz"), "", "kein laufendes Item");
});

/* ------------------------------------------------------------------ *
 * Doppelzug: ein Item statt einer Bewegung (v0.76)
 * ------------------------------------------------------------------ */

pruefe("Beim Doppelzug darf man je Zug auch ein Item einsetzen (v0.76)", () => {
    /*
     * DER GEMELDETE PUNKT: „Bei Doppelzug soll man auch pro Zug ein Item
     * einsetzen koennen, also statt sich zu bewegen."
     *
     * Die Regel dahinter gibt es seit v0.41: Wer den Doppelzug offen hat,
     * BEHAELT den Zug sogar bei einer Faehigkeit mit `beendetZug` — sie
     * verbraucht dann den Doppelzug statt den Zug abzugeben. Dieser Test haelt
     * das fest, damit es nicht unbemerkt wegoptimiert wird.
     */
    let runde = laufendePartie();
    runde.faehigkeiten.weiss.push("doppelzug");
    runde.faehigkeiten.weiss.push("bauernschub");

    runde = SCHACH_RUNDE.faehigkeitEinsetzen(runde, "id-anna", "doppelzug", -1, "Anna", 2000);
    gleich(runde.stand.extraZug, "weiss", "der Doppelzug steht offen");
    gleich(SCHACH_RUNDE.behaeltZug(runde, "weiss", "bauernschub"), true,
        "und deshalb kostet auch eine teure Faehigkeit den Zug nicht");

    /* Erster der beiden Zuege: ein Item statt einer Bewegung. */
    const nachItem = SCHACH_RUNDE.faehigkeitEinsetzen(
        runde, "id-anna", "bauernschub", -1, "Anna", 3000);

    wahr(nachItem !== null, "das Item ging durch");
    gleich(nachItem.stand.amZug, "weiss", "man ist weiter am Zug");
    gleich(nachItem.stand.extraZug, "", "der Doppelzug ist dafuer verbraucht");
    gleich(SCHACH_RUNDE.darfZiehen(nachItem, "id-anna"), true, "und darf wirklich ziehen");

    /* Zweiter Zug: die gewohnte Bewegung — danach ist der Gegner dran. */
    const gezogen = SCHACH_RUNDE.ziehen(nachItem, "id-anna",
        SCHACH.feldNummer("e3"), SCHACH.feldNummer("e4"), "D", "Anna", 4000);

    wahr(gezogen !== null, "der zweite Zug geht");
    gleich(gezogen.stand.amZug, "schwarz", "und danach ist der Gegner dran");
});

/* ------------------------------------------------------------------ *
 * Vergleich
 * ------------------------------------------------------------------ */

pruefe("Der Vergleich erkennt Zuege, Teams und Bereitschaft", () => {
    const runde = laufendePartie();
    const gezogen = SCHACH_RUNDE.ziehen(runde, "id-anna",
        SCHACH.feldNummer("e2"), SCHACH.feldNummer("e4"), "D", "Anna", 2000);

    wahr(SCHACH_RUNDE.inhaltGleich(runde, SCHACH_RUNDE.kopieren(runde)), "gleich");
    wahr(!SCHACH_RUNDE.inhaltGleich(runde, gezogen), "Zug erkannt");
    wahr(!SCHACH_RUNDE.inhaltGleich(runde,
        SCHACH_RUNDE.teamBeitreten(runde, "id-cem", "weiss", 2000)), "Team erkannt");
});

/* ------------------------------------------------------------------ *
 * Ein Item fuehrt nie direkt zu Schach, Matt oder Patt (seit v0.95)
 *
 * NUTZER-ENTSCHEIDUNG 20.08.2026. Sie hebt das Recht des Frostes auf,
 * mattzusetzen (18.08.), und damit auch die Folge aus v0.94, dass eine
 * Faehigkeit die Partie beenden kann. Die Abwaegung ist DIREKT gegen INDIREKT:
 * Ein Item bereitet die Stellung vor, den Angriff fuehrt der ZUG.
 *
 * Ungluecks-Lootboxen bleiben ausgenommen (Entscheidung 09.08.) — sie duerfen
 * weiterhin eine Partie beenden, auch wenn eine Faehigkeit sie einsammelt.
 * ------------------------------------------------------------------ */

/* Ein 6x6-Brett, auf dem Schwarz genau einen Zug hat und Weiss den Spiegel. */
function fastMattPartie() {
    const runde = SCHACH_RUNDE.leereRunde(1000, "klein", "p-matt", "Fast matt");

    runde.regeln.faehigkeiten = true;

    const gestartet = SCHACH_RUNDE.bereitSetzen(
        SCHACH_RUNDE.bereitSetzen(
            SCHACH_RUNDE.teamBeitreten(
                SCHACH_RUNDE.teamBeitreten(runde, "id-anna", "weiss", 1000),
                "id-bert", "schwarz", 1000),
            "weiss", true, 1000),
        "schwarz", true, 1000);

    gestartet.stand = SCHACH.standNormalisieren({
        variante: "klein",
        brett: "..B..."
            + "......"
            + ".....k"
            + "...D.."
            + "......"
            + "BK....",
        amZug: "weiss",
        rochade: ""
    });

    return gestartet;
}

pruefe("Die Ausgangslage stimmt: Schwarz hat noch genau einen Zug (v0.94)", () => {
    const runde = fastMattPartie();
    const schwarzAmZug = Object.assign({}, runde.stand, { amZug: "schwarz" });

    gleich(SCHACH.alleZuege(schwarzAmZug).length, 1, "genau ein Zug fuer Schwarz");
    wahr(runde.laeuft, "die Partie laeuft");
    gleich(runde.ergebnis, "", "und hat noch kein Ergebnis");
});

pruefe("Eine Faehigkeit, die mattsetzen wuerde, wird abgewiesen (v0.95)", () => {
    /*
     * NUTZER-ENTSCHEIDUNG 20.08.: „items sollen nie direkt zu schach oder matt
     * fuehren". Der Spiegel wuerde hier die Dame verdoppeln und Schwarz damit
     * mattsetzen — also geht er gar nicht erst.
     *
     * Bis v0.93 lief er durch und die Partie stand still; in v0.94 lief er
     * durch und beendete die Partie. Beides ist jetzt falsch.
     */
    const runde = fastMattPartie();
    const neu = einsetzen(runde, "spiegel", SCHACH.feldNummer("d3", 6, 6));

    gleich(neu, null, "der Spiegel wird abgewiesen");
});

pruefe("Die abgewiesene Faehigkeit bleibt im Vorrat (v0.95)", () => {
    const runde = fastMattPartie();
    const mitVorrat = SCHACH_RUNDE.kopieren(runde);
    mitVorrat.faehigkeiten.weiss.push("spiegel");

    const neu = SCHACH_RUNDE.faehigkeitEinsetzen(mitVorrat, "id-anna", "spiegel",
        SCHACH.feldNummer("d3", 6, 6), "Anna", 3000);

    gleich(neu, null, "abgewiesen");
    gleich(mitVorrat.faehigkeiten.weiss.indexOf("spiegel") !== -1, true,
        "der Spiegel liegt weiter im Vorrat");
    gleich(mitVorrat.laeuft, true, "und die Partie laeuft unveraendert weiter");
});

pruefe("Auch Schach allein reicht schon zur Abweisung (v0.95)", () => {
    /*
     * Nicht erst Matt: Schon ein Schach darf nicht vom Item kommen. Geprueft
     * mit dem Nachschub — er setzt einen Bauern auf die eigene Grundreihe und
     * gibt den Zug ab.
     */
    const runde = SCHACH_RUNDE.leereRunde(1000, "klein", "p-schach", "Schach durchs Item");
    runde.regeln.faehigkeiten = true;

    let gestartet = SCHACH_RUNDE.teamBeitreten(runde, "id-anna", "weiss", 1000);
    gestartet = SCHACH_RUNDE.teamBeitreten(gestartet, "id-bert", "schwarz", 1000);
    gestartet = SCHACH_RUNDE.bereitSetzen(gestartet, "weiss", true, 1000);
    gestartet = SCHACH_RUNDE.bereitSetzen(gestartet, "schwarz", true, 1000);

    /* Der schwarze Koenig steht auf f6 (oben rechts), die weisse Grundreihe
       ist unten. Ein Bauer auf f1 gibt kein Schach — ein Turm schon, aber der
       Nachschub setzt nur Bauern. Also wird hier der Spiegel genommen: Die
       weisse Dame steht so, dass ihre Kopie den Koenig angreift. */
    gestartet.stand = SCHACH.standNormalisieren({
        variante: "klein",
        brett: ".....k"
            + "......"
            + "......"
            + "...D.."
            + "......"
            + "K.....",
        amZug: "weiss",
        rochade: ""
    });

    const felder = [];
    const mitVorrat = SCHACH_RUNDE.kopieren(gestartet);
    mitVorrat.faehigkeiten.weiss.push("spiegel");

    for (const feld of SCHACH_RUNDE.zielFelder(mitVorrat, "id-anna", "spiegel")) {
        felder.push(feld);
    }

    /* Jedes angebotene Feld muss durchgehen — und keines darf Schach geben. */
    for (const feld of felder) {
        const neu = SCHACH_RUNDE.faehigkeitEinsetzen(mitVorrat, "id-anna", "spiegel",
            feld, "Anna", 3000);

        wahr(!!neu, "Feld " + feld + " wird angeboten und angenommen");
        wahr(!SCHACH.imSchach(neu.stand, "schwarz"),
            "Feld " + feld + " gibt dem Gegner kein Schach");
    }
});

pruefe("Der Sprung bleibt erlaubt, auch wenn er den Koenig bedroht (v0.95)", () => {
    /*
     * DIE FALLE, IN DIE DIE REGEL BEIM BAUEN ZUERST GETAPPT IST.
     *
     * `SCHACH.imSchach` rechnet ein aktives Zusatzmuster MIT: Sobald der
     * Sprung an ist, gilt der gegnerische Koenig als angegriffen, weil jede
     * eigene Figur wie ein Springer ziehen koennte — obwohl keine Figur ihren
     * Platz verlassen hat. Eine Regel, die nur `imSchach` vergleicht, verbietet
     * den Sprung deshalb in fast jeder zweiten Stellung (278 von 579 Versuchen,
     * gemessen am 20.08.).
     *
     * Sprung, Teleport und Doppelzug geben nur ein Muster oder ein Zugrecht
     * aus; was danach kommt, ist ein ZUG und darf alles. Erkannt wird das am
     * unveraenderten Brett.
     */
    const runde = faehigkeitenPartie();
    const mitVorrat = SCHACH_RUNDE.kopieren(runde);

    /* Ein weisser Turm auf d5 — als Springer erreicht er von dort e7 und c7,
       aber eben nur, weil das Muster laeuft. */
    mitVorrat.stand = SCHACH.standNormalisieren({
        variante: "faehigkeiten",
        brett: "....k..."
            + "........"
            + "......T."
            + "........"
            + "........"
            + "........"
            + "........"
            + "....K...",
        amZug: "weiss",
        rochade: ""
    });
    mitVorrat.faehigkeiten.weiss.push("sprung");

    /* Ohne Muster gibt der Turm auf g6 kein Schach. */
    gleich(SCHACH.imSchach(mitVorrat.stand, "schwarz"), false, "vorher kein Schach");

    const neu = SCHACH_RUNDE.faehigkeitEinsetzen(mitVorrat, "id-anna", "sprung",
        -1, "Anna", 3000);

    wahr(!!neu, "der Sprung laesst sich einsetzen");
    gleich(neu.stand.brett, mitVorrat.stand.brett, "und hat keine Figur bewegt");
    gleich(neu.stand.sprungAktiv, "weiss", "das Muster laeuft");
});

pruefe("Ein Item darf den Gegner auch nicht patt setzen (v0.95)", () => {
    /*
     * Auf Nachfrage ausdruecklich mitentschieden: Sonst liesse sich eine
     * verlorene Partie per Item zum Unentschieden machen. Geprueft wird die
     * Regel selbst — sie ist die eine Stelle, an der beides haengt.
     */
    const runde = fastMattPartie();
    const nachSpiegel = SCHACH.spiegel(runde.stand, "weiss",
        SCHACH.feldNummer("d3", 6, 6));

    wahr(!!nachSpiegel, "die Wirkung selbst kaeme zustande");

    const danach = SCHACH_RUNDE._zugAbgebenNachFaehigkeit(nachSpiegel.stand, "weiss");
    gleich(SCHACH.alleZuege(danach).length, 0, "der Gegner haette keinen Zug");
    gleich(SCHACH_RUNDE._wirkungVerboten(runde.stand, danach, "weiss", true), true,
        "und genau das verbietet die Regel");
});

pruefe("Wer den Zug behaelt, darf sich auch selbst nicht festsetzen (v0.95)", () => {
    /*
     * Der Fall trifft BEIDE Seiten. Wer mit einer Faehigkeit ohne Zugabgabe
     * die eigene letzte Zugmoeglichkeit nimmt, stuende sonst fest — bis v0.93
     * blieb die Partie dabei einfach stehen, in v0.94 verlor er.
     *
     * Nachgestellt mit der Mauer: Der weisse Koenig steht in der Ecke, sein
     * einziges freies Feld ist b1. Eine Mauer darueber nimmt es ihm — und
     * genau deshalb wird sie abgewiesen.
     */
    const runde = SCHACH_RUNDE.leereRunde(1000, "klein", "p-selbst", "Selbst festgesetzt");
    runde.regeln.faehigkeiten = true;

    let gestartet = SCHACH_RUNDE.teamBeitreten(runde, "id-anna", "weiss", 1000);
    gestartet = SCHACH_RUNDE.teamBeitreten(gestartet, "id-bert", "schwarz", 1000);
    gestartet = SCHACH_RUNDE.bereitSetzen(gestartet, "weiss", true, 1000);
    gestartet = SCHACH_RUNDE.bereitSetzen(gestartet, "schwarz", true, 1000);

    /* 6x6: Der weisse Koenig steht in der Ecke, Schwarz weit weg. */
    gestartet.stand = SCHACH.standNormalisieren({
        variante: "klein",
        brett: ".....k"
            + "......"
            + "......"
            + "......"
            + "......"
            + "K.....",
        amZug: "weiss",
        rochade: ""
    });

    wahr(SCHACH.alleZuege(gestartet.stand).length > 0, "so hat Weiss noch Zuege");

    /*
     * Dieselbe Ecke, aber die schwarze Dame auf c2 nimmt dem Koenig alle drei
     * Nachbarfelder — Weiss steht dann ohne einen einzigen Zug da, ohne im
     * Schach zu sein. Genau diese Lage darf eine Faehigkeit nicht herbeifuehren,
     * gleich ob sie den Zug abgibt oder behaelt.
     */
    const festgesetzt = SCHACH.standNormalisieren({
        variante: "klein",
        brett: ".....k"
            + "......"
            + "......"
            + "......"
            + "..d..."
            + "K.....",
        amZug: "weiss",
        rochade: ""
    });

    gleich(SCHACH.alleZuege(festgesetzt).length, 0, "kein einziger Zug fuer Weiss");
    gleich(SCHACH.imSchach(festgesetzt, "weiss"), false, "und trotzdem kein Schach");

    gleich(SCHACH_RUNDE._wirkungVerboten(gestartet.stand, festgesetzt, "weiss", false),
        true, "eine Faehigkeit, die dorthin fuehrt, ist verboten");
    gleich(SCHACH_RUNDE._wirkungVerboten(gestartet.stand, festgesetzt, "schwarz", true),
        true, "und aus der anderen Richtung genauso");
});

pruefe("Ohne Matt beendet dieselbe Faehigkeit gar nichts (v0.94)", () => {
    const runde = fastMattPartie();

    /* Dieselbe Faehigkeit, aber ein Feld, das Schwarz nicht einsperrt: der
       Bauer unten links. Das Feld kommt aus dem Modell, damit der Test keine
       Stellung auswendig kennt. */
    const mitVorrat = SCHACH_RUNDE.kopieren(runde);
    mitVorrat.faehigkeiten.weiss.push("spiegel");

    const bauer = SCHACH.feldNummer("a1", 6, 6);
    const felder = SCHACH_RUNDE.zielFelder(mitVorrat, "id-anna", "spiegel");
    wahr(felder.indexOf(bauer) !== -1, "der Bauer steht zur Auswahl");

    const neu = einsetzen(runde, "spiegel", bauer);

    wahr(!!neu, "der Spiegel laesst sich einsetzen");
    gleich(neu.ergebnis, "", "kein Matt, also kein Ergebnis");
    gleich(neu.laeuft, true, "die Partie laeuft weiter");
});

/* ------------------------------------------------------------------ *
 * Das Brett bietet nur an, was auch geht (seit v0.94)
 * ------------------------------------------------------------------ */

pruefe("Jedes Feld aus zielFelder laesst sich auch wirklich einsetzen (v0.94)", () => {
    /*
     * Bis v0.93 pruefte `zielFelder` nur, ob die Wirkung zustande kommt — die
     * zweite Bedingung ("der eigene Koenig darf danach nicht im Schach
     * stehen") kannte allein `faehigkeitEinsetzen`. Das Brett markierte
     * deshalb Felder, die es hinterher ablehnte: 624 Faelle im Spieltest.
     *
     * Geprueft wird die Zusage selbst: Was `zielFelder` nennt, MUSS
     * `faehigkeitEinsetzen` annehmen — auf einem Brett, auf dem der eigene
     * Koenig im Schach steht, und auf einem gewoehnlichen.
     */
    const bretter = [faehigkeitenPartie(), partieImSchach()];
    let geprueft = 0;

    for (const runde of bretter) {
        for (const art of Object.keys(SCHACH_VARIANTEN.FAEHIGKEITEN)) {
            if (SCHACH_VARIANTEN.FAEHIGKEITEN[art].art !== "ziel") {
                continue;
            }

            const mitVorrat = SCHACH_RUNDE.kopieren(runde);
            mitVorrat.faehigkeiten.weiss.push(art);

            for (const feld of SCHACH_RUNDE.zielFelder(mitVorrat, "id-anna", art)) {
                const neu = SCHACH_RUNDE.faehigkeitEinsetzen(
                    mitVorrat, "id-anna", art, feld, "Anna", 3000, "D");

                wahr(!!neu, art + " auf Feld " + feld
                    + " steht in zielFelder, wird aber abgelehnt");
                geprueft++;
            }
        }
    }

    wahr(geprueft > 50, "es wurden genug Felder geprueft: " + geprueft);
});

pruefe("Ein Feld, das den eigenen Koenig im Schach liesse, wird nicht angeboten (v0.94)", () => {
    /*
     * Der Nachschub setzt einen Bauern auf die eigene Grundreihe und gibt den
     * Zug ab. Steht der eigene Koenig im Schach, ist das verboten — und darf
     * deshalb auch nicht markiert werden.
     */
    const runde = partieImSchach();
    const mitVorrat = SCHACH_RUNDE.kopieren(runde);
    mitVorrat.faehigkeiten.weiss.push("nachschub");

    wahr(SCHACH.imSchach(mitVorrat.stand, "weiss"), "Weiss steht im Schach");
    gleich(SCHACH_RUNDE.zielFelder(mitVorrat, "id-anna", "nachschub").length, 0,
        "kein einziges Feld wird angeboten");
});

pruefe("Ohne Schach bietet dieselbe Faehigkeit ihre Felder an (v0.94)", () => {
    const runde = faehigkeitenPartie();
    const mitVorrat = SCHACH_RUNDE.kopieren(runde);

    /* Platz auf der Grundreihe schaffen — sonst gibt es dort nichts zu setzen. */
    mitVorrat.stand = SCHACH.standNormalisieren({
        variante: "faehigkeiten",
        brett: "tlsdkslt"
            + "bbbbbbbb"
            + "........"
            + "........"
            + "........"
            + "........"
            + "BBBBBBBB"
            + "....K...",
        amZug: "weiss",
        rochade: ""
    });
    mitVorrat.faehigkeiten.weiss.push("nachschub");

    wahr(!SCHACH.imSchach(mitVorrat.stand, "weiss"), "Weiss steht nicht im Schach");
    wahr(SCHACH_RUNDE.zielFelder(mitVorrat, "id-anna", "nachschub").length > 0,
        "es gibt Felder");
});

/* ------------------------------------------------------------------ *
 * Dieb und Haendler sagen vorher ab (seit v0.94)
 * ------------------------------------------------------------------ */

pruefe("Der Dieb bleibt einsetzbar, auch wenn der Gegner nichts hat (v0.99)", () => {
    /*
     * DIESER TEST STAND BIS v0.98 AUF DEM KOPF: Damals (v0.94) sollte die
     * Marke GRAU werden, sobald beim Gegner nichts zu holen war — gedacht als
     * Ersparnis, denn im Spieltest gab es 861 Griffe ins Leere.
     *
     * NUTZER-ENTSCHEIDUNG 20.08.2026: „Dieb und die neuen Items sollen so wie
     * alle anderen auch eingesammelt werden und dann, wann man will, genutzt
     * werden." Ein Item, das man nicht anfassen darf, fuehlt sich kaputt an —
     * das wog schwerer als der gesparte Tipp. Verloren geht nichts: Das
     * Fenster sagt „beim Gegner ist nichts zu holen" und laesst die Faehigkeit
     * im Vorrat.
     *
     * Der HAENDLER bleibt bei der alten Regel (siehe der Test weiter unten) —
     * bei ihm haengt die Absage an den EIGENEN Figuren, und er wurde nicht
     * gemeldet.
     */
    const runde = faehigkeitenPartie();
    const mitVorrat = SCHACH_RUNDE.kopieren(runde);

    mitVorrat.faehigkeiten.weiss.push("dieb");
    mitVorrat.faehigkeiten.schwarz = [];

    gleich(SCHACH_RUNDE.darfEinsetzen(mitVorrat, "id-anna", "dieb"), true,
        "leerer gegnerischer Vorrat: die Marke bleibt trotzdem bedienbar");
    gleich(SCHACH_RUNDE._etwasZuHolen(mitVorrat, "id-anna", "dieb"), true,
        "das Modell haelt ihn nicht mehr zurueck");

    /* Und die Beute ist ehrlich leer — daran haengt der Text im Fenster. */
    gleich(SCHACH_RUNDE.diebesBeute(mitVorrat, "weiss"), null,
        "zu holen gibt es aber wirklich nichts");
});

pruefe("Mit gegnerischem Vorrat holt der Dieb etwas (v0.94)", () => {
    const runde = faehigkeitenPartie();
    const mitVorrat = SCHACH_RUNDE.kopieren(runde);

    mitVorrat.faehigkeiten.weiss.push("dieb");
    mitVorrat.faehigkeiten.schwarz = ["sprung"];

    gleich(SCHACH_RUNDE.darfEinsetzen(mitVorrat, "id-anna", "dieb"), true,
        "jetzt gibt es etwas zu holen");
    wahr(SCHACH_RUNDE.diebesBeute(mitVorrat, "weiss") !== null,
        "und die Beute steht fest");
});

pruefe("Der Haendler laesst sich nicht einsetzen, wenn der Tausch nicht aufgeht (v0.94)", () => {
    const runde = faehigkeitenPartie();
    const leer = SCHACH_RUNDE.kopieren(runde);

    /* Nur die beiden Koenige: Es gibt nichts zu tauschen. */
    leer.stand = SCHACH.standNormalisieren({
        variante: "faehigkeiten",
        brett: "....k..."
            + "........"
            + "........"
            + "........"
            + "........"
            + "........"
            + "........"
            + "....K...",
        amZug: "weiss",
        rochade: ""
    });
    leer.faehigkeiten.weiss.push("haendler");

    gleich(SCHACH_RUNDE.handelsAngebot(leer, "weiss"), null, "es gibt kein Angebot");
    gleich(SCHACH_RUNDE.darfEinsetzen(leer, "id-anna", "haendler"), false,
        "also bleibt die Marke grau");
});

pruefe("Alle anderen Faehigkeiten beruehrt die neue Pruefung nicht (v0.94)", () => {
    const runde = faehigkeitenPartie();

    for (const art of Object.keys(SCHACH_VARIANTEN.FAEHIGKEITEN)) {
        if (art === "dieb" || art === "haendler") {
            continue;
        }
        gleich(SCHACH_RUNDE._etwasZuHolen(runde, "id-anna", art), true,
            art + " haengt an keinem fremden Vorrat");
    }
});

/* ------------------------------------------------------------------ *
 * Der Kurztext einer Faehigkeit (seit v0.94)
 * ------------------------------------------------------------------ */

pruefe("Jede Faehigkeit hat einen kurzen Satz, und er passt zur Beschreibung (v0.94)", () => {
    /*
     * Der Kurztext steht im Maus-Hinweis (`title`) und als Einstieg im
     * Einsetzen-Fenster. Er wird GERECHNET statt zweitgeschrieben — zwei Texte
     * laufen auseinander. Geprueft wird deshalb, dass die Rechnung fuer jede
     * Faehigkeit etwas Brauchbares liefert.
     */
    for (const art of Object.keys(SCHACH_VARIANTEN.FAEHIGKEITEN)) {
        const voll = SCHACH_VARIANTEN.faehigkeitBeschreibung(art);
        const kurz = SCHACH_VARIANTEN.faehigkeitKurz(art);

        wahr(kurz.length > 0, art + ": der Kurztext ist nicht leer");
        wahr(kurz.length <= voll.length, art + ": nicht laenger als das Ganze");
        wahr(voll.indexOf(kurz) === 0, art + ": er steht am Anfang der Beschreibung");
        wahr(kurz.length <= 200, art + ": hoechstens 200 Zeichen, war " + kurz.length);
        wahr(/[.!?]$/.test(kurz), art + ": er endet mit einem Satzzeichen: " + kurz);
    }
});

pruefe("Keine Beschreibung wird wieder zu lang (v0.94, verschaerft v0.100)", () => {
    /*
     * DIE MAUER WAR ZWEIMAL DER ANLASS. In v0.94 bekam sie den Kurztext
     * (`faehigkeitKurz`, erster Satz) — der lange Text blieb daneben stehen.
     * Am 20.08. hat der Nutzer erneut gemeldet, er sei „immer noch viel zu
     * lang": Auch im Aufklapper liest niemand zwoelf Zeilen.
     *
     * Statt nur die Mauer zu kuerzen, haelt dieser Test jetzt ALLE
     * Faehigkeiten kurz. Sonst waechst die naechste unbemerkt nach — die Mauer
     * ist nicht lang geworden, weil jemand es wollte, sondern weil bei jeder
     * Regelaenderung ein Satz dazukam.
     *
     * SEIT v0.106 IST DIE GRENZE 250 (vorher 400): „generell zu viel Texte
     * ueberall" (Nutzer-Ansage 21.08.). In derselben Runde ist jede
     * Beschreibung ueberarbeitet worden, die laengste liegt jetzt bei 239.
     * Der Satz „Danach ist der Gegner am Zug" steht nirgends mehr — das sagt
     * schon das fehlende Pluszeichen an der Marke.
     */
    const grenze = 250;

    for (const art of Object.keys(SCHACH_VARIANTEN.FAEHIGKEITEN)) {
        const voll = SCHACH_VARIANTEN.faehigkeitBeschreibung(art);
        const kurz = SCHACH_VARIANTEN.faehigkeitKurz(art);

        wahr(voll.length <= grenze,
            art + ": Beschreibung hoechstens " + grenze + " Zeichen (" + voll.length + ")");
        wahr(kurz.length < 150, art + ": Kurztext unter 150 (" + kurz.length + ")");
        wahr(kurz.length > 0, art + ": es gibt einen Kurztext");
    }
});

console.log(anzahlOk + " ok, " + anzahlFehler + " Fehler");
process.exit(anzahlFehler === 0 ? 0 : 1);
