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
globalThis.SCHACH_RUNDE = require(pfad.join(__dirname, "..", "js", "schach-runde.js"));
/* Ergänzt SCHACH_RUNDE (Fähigkeiten, Lootboxen, Händler) — NACH schach-runde.js. */
require(pfad.join(__dirname, "..", "js", "schach-runde-faehigkeiten.js"));
const SCHACH_RUNDE = globalThis.SCHACH_RUNDE;
const SCHACH = globalThis.SCHACH;
const SCHACH_VARIANTEN = globalThis.SCHACH_VARIANTEN;

let anzahlOk = 0;
let anzahlFehler = 0;


/*
 * BEIDE BEREITSCHAFTEN AUF EINMAL (seit v0.62.0).
 *
 * Seit dem zweiten Start-Bildschirm braucht der Anpfiff ZWEI Zusagen je
 * Seite: die zur eigenen Seite (`bereitSetzen`) und die zur Aufstellung
 * (`aufstellungBereitSetzen`). Fast jede Testpartie will einfach eine
 * LAUFENDE Partie herstellen — dafuer steht dieser Helfer, damit nicht in
 * jeder Vorbereitung zwei Aufrufe stehen.
 *
 * Wer die Stufen EINZELN pruefen will, ruft das Modell weiterhin direkt.
 */
function bereitUndAufgestellt(runde, farbe, zeitpunkt) {
    return SCHACH_RUNDE.aufstellungBereitSetzen(
        SCHACH_RUNDE.bereitSetzen(runde, farbe, true, zeitpunkt),
        farbe, true, zeitpunkt);
}
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
    runde = bereitUndAufgestellt(runde, "weiss", 1000);
    runde = bereitUndAufgestellt(runde, "schwarz", 1000);
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
    runde = bereitUndAufgestellt(runde, "weiss", 1000);
    gleich(runde.laeuft, false, "eine Seite reicht nicht");

    runde = SCHACH_RUNDE.teamBeitreten(runde, "id-bert", "schwarz", 1000);
    gleich(runde.laeuft, false, "Bereitschaft von Schwarz fehlt");

    runde = bereitUndAufgestellt(runde, "schwarz", 1000);
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

/*
 * Drei Helfer, die auch die Fähigkeiten-Prüfungen benutzen — ihre
 * Haupt-Abnehmer sind nach test-schach-runde-faehigkeiten.js umgezogen
 * (08/2026, Naht wie im App-Code seit v0.92.0). Hier stehen sie weiter,
 * weil die Kreuz-Brett- und Abstimmungs-Prüfungen unten sie brauchen.
 */

/* Eine laufende Partie in der Spielart mit den Fähigkeiten. */
function faehigkeitenPartie() {
    let runde = SCHACH_RUNDE.leereRunde(1000, "faehigkeiten", "p-f", "Mit Faehigkeiten");
    runde = SCHACH_RUNDE.teamBeitreten(runde, "id-anna", "weiss", 1000);
    runde = SCHACH_RUNDE.teamBeitreten(runde, "id-bert", "schwarz", 1000);
    runde = bereitUndAufgestellt(runde, "weiss", 1000);
    runde = bereitUndAufgestellt(runde, "schwarz", 1000);
    return runde;
}

/* Legt eine Fähigkeit direkt ins Team und setzt sie ein. */
function einsetzen(runde, art, zielFeld, spieler, umwandlung) {
    const wer = spieler || "id-anna";
    const farbe = SCHACH_RUNDE.teamVon(runde, wer);
    const vorbereitet = SCHACH_RUNDE.kopieren(runde);

    vorbereitet.faehigkeiten[farbe].push(art);
    return SCHACH_RUNDE.faehigkeitEinsetzen(vorbereitet, wer, art, zielFeld, wer,
        3000, umwandlung);
}

/* Legt einen Unglückswürfel auf ein Feld und zieht mit einer Figur darauf. */
function pechEinsammeln(runde, art, von, nach) {
    const vorbereitet = SCHACH_RUNDE.kopieren(runde);
    vorbereitet.bonus.push({ feld: SCHACH.feldNummer(nach), art: art, pech: true });

    return SCHACH_RUNDE.ziehen(vorbereitet, "id-anna",
        SCHACH.feldNummer(von), SCHACH.feldNummer(nach), "D", "Anna", 4000);
}

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
     * Sonst meint einer die waagerechte Mauer und bekommt eine senkrechte.
     * Der Vorschlag speichert die Wahl deshalb mit — genau wie die Umwandlung
     * beim Bauernschub. Seit v0.83.0 stimmt man zu, indem man DASSELBE
     * einsetzt (samt Wahl), nicht mehr per Knopf.
     */
    let runde = faehigkeitenPartie();
    runde.teams.weiss.push("id-clara");
    runde.regeln.einigkeit = true;
    runde.faehigkeiten.weiss.push("mauer");

    const platz = SCHACH_RUNDE.zielFelder(runde, "id-anna", "mauer", "senkrecht")[0];

    const vorgeschlagen = SCHACH_RUNDE.faehigkeitVorschlagen(runde, "id-anna", "mauer",
        platz, "Anna", 3000, undefined, "senkrecht");

    wahr(vorgeschlagen !== null, "vorgeschlagen");
    gleich(vorgeschlagen.zugZaehler, runde.zugZaehler, "noch nicht eingesetzt");
    gleich(vorgeschlagen.vorschlaege["id-anna"].wahl, "senkrecht",
        "die Lage steht im Vorschlag");

    /* Nach dem Speichern und Laden ist sie noch da. */
    const geladen = SCHACH_RUNDE.normalisieren(
        JSON.parse(JSON.stringify(vorgeschlagen)));
    gleich(geladen.vorschlaege["id-anna"].wahl, "senkrecht", "und ueberlebt das Laden");

    /* Setzt die zweite DASSELBE ein, entsteht die SENKRECHTE Mauer. */
    const fertig = SCHACH_RUNDE.faehigkeitVorschlagen(geladen, "id-clara", "mauer",
        platz, "Clara", 3100, undefined, "senkrecht");
    wahr(fertig !== null, "auch Clara hat eingesetzt");
    gleich(Object.keys(fertig.vorschlaege).length, 0, "die Vorschlaege sind abgearbeitet");

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
 * Einstellungen und Abstimmung
 * ------------------------------------------------------------------ */

/* Eine Partie mit zwei Leuten im weissen Team und Einigkeitspflicht. */
function einigkeitsPartie() {
    let runde = SCHACH_RUNDE.leereRunde(1000, "standard", "p-e", "Mit Einigkeit");
    runde.regeln.einigkeit = true;

    runde = SCHACH_RUNDE.teamBeitreten(runde, "id-anna", "weiss", 1000);
    runde = SCHACH_RUNDE.teamBeitreten(runde, "id-cem", "weiss", 1000);
    runde = SCHACH_RUNDE.teamBeitreten(runde, "id-bert", "schwarz", 1000);
    runde = bereitUndAufgestellt(runde, "weiss", 1000);
    runde = bereitUndAufgestellt(runde, "schwarz", 1000);
    return runde;
}

pruefe("Ohne Einigkeitspflicht zieht ein Vorschlag sofort", () => {
    const runde = SCHACH_RUNDE.zugVorschlagen(laufendePartie(), "id-anna",
        SCHACH.feldNummer("e2"), SCHACH.feldNummer("e4"), "D", "Anna", 2000);

    gleich(runde.zugZaehler, 1, "gezogen");
    gleich(Object.keys(runde.vorschlaege).length, 0, "kein Vorschlag offen");
});

pruefe("Allein im Team braucht es keine Abstimmung", () => {
    let runde = SCHACH_RUNDE.leereRunde(1000, "standard", "p-a", "Allein");
    runde.regeln.einigkeit = true;
    runde = SCHACH_RUNDE.teamBeitreten(runde, "id-anna", "weiss", 1000);
    runde = SCHACH_RUNDE.teamBeitreten(runde, "id-bert", "schwarz", 1000);
    runde = bereitUndAufgestellt(runde, "weiss", 1000);
    runde = bereitUndAufgestellt(runde, "schwarz", 1000);

    const danach = SCHACH_RUNDE.zugVorschlagen(runde, "id-anna",
        SCHACH.feldNummer("e2"), SCHACH.feldNummer("e4"), "D", "Anna", 2000);

    gleich(danach.zugZaehler, 1, "sofort gezogen");
});

pruefe("Mit Einigkeitspflicht wird erst vorgeschlagen, dann gezogen", () => {
    let runde = SCHACH_RUNDE.zugVorschlagen(einigkeitsPartie(), "id-anna",
        SCHACH.feldNummer("e2"), SCHACH.feldNummer("e4"), "D", "Anna", 2000);

    gleich(runde.zugZaehler, 0, "noch nicht gezogen");
    wahr(!!runde.vorschlaege["id-anna"], "Annas Vorschlag steht");
    gleich(SCHACH.figurAuf(runde.stand, SCHACH.feldNummer("e4")), ".", "Brett unveraendert");

    /* Cem macht DENSELBEN Zug — das ist die Zustimmung (v0.83.0). */
    runde = SCHACH_RUNDE.zugVorschlagen(runde, "id-cem",
        SCHACH.feldNummer("e2"), SCHACH.feldNummer("e4"), "D", "Cem", 2100);
    gleich(runde.zugZaehler, 1, "jetzt gezogen");
    gleich(SCHACH.figurAuf(runde.stand, SCHACH.feldNummer("e4")), "B", "Bauer steht auf e4");
    gleich(Object.keys(runde.vorschlaege).length, 0, "Vorschlaege sind erledigt");
});

pruefe("Uneinigkeit zieht nicht — erst wenn alle dasselbe tun (v0.83.0)", () => {
    /* Anna will e2-e4, Cem will d2-d4: nichts passiert, beide Vorschlaege
       stehen nebeneinander. */
    let runde = SCHACH_RUNDE.zugVorschlagen(einigkeitsPartie(), "id-anna",
        SCHACH.feldNummer("e2"), SCHACH.feldNummer("e4"), "D", "Anna", 2000);
    runde = SCHACH_RUNDE.zugVorschlagen(runde, "id-cem",
        SCHACH.feldNummer("d2"), SCHACH.feldNummer("d4"), "D", "Cem", 2100);

    gleich(runde.zugZaehler, 0, "nichts gezogen");
    gleich(Object.keys(runde.vorschlaege).length, 2, "beide Vorschlaege stehen");

    /* Anna schwenkt um: Ihr neuer Zug ERSETZT ihren alten Vorschlag — und
       weil jetzt alle dasselbe wollen, wird gezogen. */
    runde = SCHACH_RUNDE.zugVorschlagen(runde, "id-anna",
        SCHACH.feldNummer("d2"), SCHACH.feldNummer("d4"), "D", "Anna", 2200);
    gleich(runde.zugZaehler, 1, "jetzt gezogen");
    gleich(SCHACH.figurAuf(runde.stand, SCHACH.feldNummer("d4")), "B", "Bauer steht auf d4");
});

pruefe("Der Gegner kann keinen Vorschlag abgeben", () => {
    const runde = SCHACH_RUNDE.zugVorschlagen(einigkeitsPartie(), "id-anna",
        SCHACH.feldNummer("e2"), SCHACH.feldNummer("e4"), "D", "Anna", 2000);

    gleich(SCHACH_RUNDE.zugVorschlagen(runde, "id-bert",
        SCHACH.feldNummer("e7"), SCHACH.feldNummer("e5"), "D", "Bert", 2100), null,
        "Schwarz ist nicht am Zug und schlaegt nichts vor");
});

pruefe("Auch Faehigkeiten werden abgestimmt", () => {
    let runde = einigkeitsPartie();
    runde.faehigkeiten.weiss.push("bauernschub");

    runde = SCHACH_RUNDE.faehigkeitVorschlagen(runde, "id-anna", "bauernschub", -1,
        "Anna", 2000);

    wahr(runde !== null, "vorgeschlagen");
    gleich(runde.vorschlaege["id-anna"].art, "faehigkeit", "als Faehigkeit vermerkt");
    gleich(runde.vorschlaege["id-anna"].faehigkeit, "bauernschub", "die richtige");
    gleich(runde.faehigkeiten.weiss.length, 1, "noch nicht verbraucht");
    gleich(SCHACH.figurAuf(runde.stand, SCHACH.feldNummer("a3")), ".", "Brett unveraendert");

    /* Cem setzt DIESELBE Faehigkeit ein — die Zustimmung von v0.83.0. */
    runde = SCHACH_RUNDE.faehigkeitVorschlagen(runde, "id-cem", "bauernschub", -1,
        "Cem", 2100);
    gleich(runde.faehigkeiten.weiss.length, 0, "jetzt verbraucht");
    gleich(SCHACH.figurAuf(runde.stand, SCHACH.feldNummer("a3")), "B", "die Bauern sind vor");
    gleich(Object.keys(runde.vorschlaege).length, 0, "Abstimmung erledigt");
});

pruefe("Zug gegen Faehigkeit ist Uneinigkeit (v0.83.0)", () => {
    let runde = einigkeitsPartie();
    runde.faehigkeiten.weiss.push("bauernschub");

    runde = SCHACH_RUNDE.faehigkeitVorschlagen(runde, "id-anna", "bauernschub", -1,
        "Anna", 2000);
    runde = SCHACH_RUNDE.zugVorschlagen(runde, "id-cem",
        SCHACH.feldNummer("e2"), SCHACH.feldNummer("e4"), "D", "Cem", 2100);

    gleich(runde.zugZaehler, 0, "nichts ausgefuehrt");
    gleich(runde.faehigkeiten.weiss.length, 1, "nichts verbraucht");
    gleich(Object.keys(runde.vorschlaege).length, 2, "beide Vorschlaege stehen");
});

pruefe("Die Frist steht im Vorschlag und uebergeht die Saeumigen", () => {
    const runde = SCHACH_RUNDE.zugVorschlagen(einigkeitsPartie(), "id-anna",
        SCHACH.feldNummer("e2"), SCHACH.feldNummer("e4"), "D", "Anna", 10000);

    gleich(runde.vorschlaege["id-anna"].frist,
        10000 + SCHACH_RUNDE.FRIST_SEKUNDEN[0] * 1000,
        "zehn Sekunden ab dem Vorschlag");

    /* Vorher passiert nichts. */
    gleich(SCHACH_RUNDE.fristAbgelaufen(runde, 12000), null, "vor Ablauf nichts");

    /* Danach geht der Zug durch, auch ohne Cems Zug. */
    const danach = SCHACH_RUNDE.fristAbgelaufen(runde, 20001);
    wahr(danach !== null, "nach Ablauf ausgefuehrt");
    gleich(danach.zugZaehler, 1, "gezogen");
    gleich(danach.versaeumt["id-cem"], 1, "Cem hat einen Strich");
    gleich(danach.versaeumt["id-anna"], undefined, "Anna nicht");
});

pruefe("Die Uhr uebergeht keine Uneinigkeit unter Anwesenden (v0.83.0)", () => {
    /* Beide haben etwas VERSCHIEDENES vorgeschlagen: Der Fristablauf tut
       nichts — nur das Einigwerden zieht. Und niemand bekommt einen Strich,
       denn saeumig ist hier keiner. */
    let runde = SCHACH_RUNDE.zugVorschlagen(einigkeitsPartie(), "id-anna",
        SCHACH.feldNummer("e2"), SCHACH.feldNummer("e4"), "D", "Anna", 10000);
    runde = SCHACH_RUNDE.zugVorschlagen(runde, "id-cem",
        SCHACH.feldNummer("d2"), SCHACH.feldNummer("d4"), "D", "Cem", 10100);

    gleich(SCHACH_RUNDE.fristAbgelaufen(runde, 99999), null,
        "die Uhr entscheidet keinen Streit");
    gleich(runde.zugZaehler, 0, "nichts gezogen");
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

    /* Macht er wieder mit (denselben Zug wie Anna), faengt es von vorn an. */
    let mit = SCHACH_RUNDE.zugVorschlagen(runde, "id-anna",
        SCHACH.feldNummer("e2"), SCHACH.feldNummer("e4"), "D", "Anna", 10000);
    mit = SCHACH_RUNDE.zugVorschlagen(mit, "id-cem",
        SCHACH.feldNummer("e2"), SCHACH.feldNummer("e4"), "D", "Cem", 10100);

    gleich(mit.zugZaehler, 1, "alle einig, gezogen");
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

pruefe("Bei gleicher Zufallsarmee ist Schwarz das Spiegelbild von Weiss (v0.60.0)", () => {
    /*
     * NUTZER-ANSAGE 25.08.2026: „Zufallsarmee, wenn beide dieselbe haben,
     * soll die schwarze Armee spiegelverkehrt aufgebaut werden wie die
     * weisse." Gebaut ist das als 180-Grad-Drehung: die schwarze Figur steht
     * auf dem Gegenfeld `gesamt - 1 - feld` der weissen. Damit sieht jeder
     * Spieler von SEINER Seite dieselbe Aufstellung.
     *
     * Geprueft wird das ganze Brett: Jedes belegte Feld traegt auf seinem
     * Gegenfeld dieselbe Art in der Gegenfarbe, jedes leere ein leeres.
     */
    const runde = armeePartie("standard", "p-spiegel", false);
    const brett = runde.stand.brett;
    const gesamt = brett.length;

    let weisse = 0;
    for (let feld = 0; feld < gesamt; feld++) {
        const hier = brett[feld];
        const dort = brett[gesamt - 1 - feld];

        if (hier === ".") {
            gleich(dort, ".", "Feld " + feld + " ist leer, sein Gegenfeld auch");
            continue;
        }

        gleich(hier.toLowerCase(), dort.toLowerCase(),
            "Feld " + feld + " und sein Gegenfeld tragen dieselbe Art");
        wahr(hier !== dort,
            "Feld " + feld + " und sein Gegenfeld tragen entgegengesetzte Farben");

        if (hier === hier.toUpperCase()) {
            weisse++;
        }
    }

    wahr(weisse > 0, "es steht ueberhaupt eine weisse Armee da");
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
 * Die zwei Bereitschaften und das Neu-Würfeln (v0.62.0)
 * ------------------------------------------------------------------ */

pruefe("Der Anpfiff braucht BEIDE Bereitschaften je Seite (v0.62.0)", () => {
    /*
     * Nutzer-Ansage 25.08.2026: „Sobald beide Seiten einen Spieler haben und
     * beide bereit sind, gehts ein Screen weiter … wenn beide nochmal auf
     * Bereit klicken, kommen sie ins Spiel."
     *
     * Bis v0.61.0 pfiff die erste Bereitschaft an. Jetzt fuehrt sie in die
     * AUFSTELLUNG, und erst die zweite startet — geprueft wird jede Stufe
     * einzeln, damit nicht eine von beiden still verschwinden kann.
     *
     * SEIT Punkt 8 (27.08.2026) GILT DER ZWEI-STUFEN-WEG NUR NOCH MIT
     * ZUFALLSARMEE — ohne sie pfeift die zweite ERSTE Zusage an (eigener
     * Test darunter). Diese Runde wuerfelt deshalb, damit die zwei Stufen
     * weiter einzeln geprueft bleiben; sie ist zugleich der Beleg, dass mit
     * Zufallsarmee ALLES beim Alten ist.
     */
    let runde = SCHACH_RUNDE.leereRunde(1000, "standard", "p-zwei", "Zwei Stufen");
    runde.regeln.zufallsArmee = true;
    runde = SCHACH_RUNDE.teamBeitreten(runde, "id-anna", "weiss", 1000);
    runde = SCHACH_RUNDE.teamBeitreten(runde, "id-bert", "schwarz", 1000);

    runde = SCHACH_RUNDE.bereitSetzen(runde, "weiss", true, 1010);
    wahr(!SCHACH_RUNDE.kannStarten(runde), "eine Seite allein reicht nicht");
    wahr(!SCHACH_RUNDE.inAufstellung(runde), "und die Aufstellung steht noch nicht an");

    runde = SCHACH_RUNDE.bereitSetzen(runde, "schwarz", true, 1020);
    wahr(SCHACH_RUNDE.kannStarten(runde), "beide Seiten haben ihre Seite bestaetigt");
    wahr(SCHACH_RUNDE.inAufstellung(runde), "jetzt steht die Aufstellung an");
    gleich(runde.laeuft, false, "aber angepfiffen ist noch nicht");

    runde = SCHACH_RUNDE.aufstellungBereitSetzen(runde, "weiss", true, 1030);
    gleich(runde.laeuft, false, "eine Zusage zur Aufstellung reicht nicht");

    runde = SCHACH_RUNDE.aufstellungBereitSetzen(runde, "schwarz", true, 1040);
    gleich(runde.laeuft, true, "mit der zweiten geht es los");
    gleich(runde.gestartetAm, 1040, "und die Spieldauer laeuft ab jetzt");
    wahr(!SCHACH_RUNDE.inAufstellung(runde), "die Aufstellung ist vorbei");
});

pruefe("Ohne Zufallsarmee pfeift die zweite ERSTE Zusage an (Punkt 8)", () => {
    /*
     * NUTZER-ANSAGE 27.08.2026: „man muss ja das Feld nicht davor sehen,
     * wenn man eh nichts mehr aendern kann." Ohne Zufallsarmee ist die
     * Aufstellung fest — es gibt keinen Aufstellungs-Bildschirm und keine
     * zweite Zusage mehr; die letzte erste Zusage startet die Partie
     * (`bereitSetzen` → `kannAnpfeifen`).
     */
    let runde = SCHACH_RUNDE.leereRunde(1000, "standard", "p-fix", "Fester Start");
    runde.regeln.zufallsArmee = false;
    runde = SCHACH_RUNDE.teamBeitreten(runde, "id-anna", "weiss", 1000);
    runde = SCHACH_RUNDE.teamBeitreten(runde, "id-bert", "schwarz", 1000);

    runde = SCHACH_RUNDE.bereitSetzen(runde, "weiss", true, 1010);
    gleich(runde.laeuft, false, "eine Zusage allein startet nichts");
    wahr(!SCHACH_RUNDE.inAufstellung(runde, "id-anna"),
        "einen Aufstellungs-Bildschirm gibt es ohne Zufallsarmee nicht");

    runde = SCHACH_RUNDE.bereitSetzen(runde, "schwarz", true, 1020);
    gleich(runde.laeuft, true, "mit der zweiten ersten Zusage geht es los");
    gleich(runde.gestartetAm, 1020, "und die Spieldauer laeuft ab jetzt");

    /*
     * DER DATENVERTRAG: Eine ALTE wartende Runde ohne Zufallsarmee, in der
     * beide erste Zusagen schon liegen (angelegt vor Punkt 8), gilt ab
     * sofort als anpfeifbar — sie startet beim naechsten Schreiben. Gewollt:
     * festes Brett, es war nichts mehr zu entscheiden.
     */
    let alt = SCHACH_RUNDE.leereRunde(1000, "standard", "p-alt3", "Alte Wartende");
    alt = SCHACH_RUNDE.teamBeitreten(alt, "id-anna", "weiss", 1000);
    alt = SCHACH_RUNDE.teamBeitreten(alt, "id-bert", "schwarz", 1000);
    alt.bereit = { weiss: true, schwarz: true };
    wahr(SCHACH_RUNDE.kannAnpfeifen(alt),
        "die alte wartende Runde startet beim naechsten Schreiben");
});

pruefe("Wer seine Seite zurueckzieht, streicht BEIDEN die Aufstellung (v0.62.0)", () => {
    /*
     * Der Fall, den diese Regel verhindert: Weiss geht zurueck zur
     * Seitenwahl, wuerfelt spaeter neu und drueckt wieder bereit — und die
     * alte Zusage von Schwarz pfiffe sofort an, zu einem Brett, das die
     * schwarze Seite nie gesehen hat.
     *
     * MIT ZUFALLSARMEE, seit Punkt 8 (27.08.2026): Die Regel schuetzt die
     * BRETT-Zusage, und die gibt es nur noch, wo gewuerfelt wird — ohne
     * Zufallsarmee pfiffe hier schon die zweite erste Zusage an.
     */
    let runde = SCHACH_RUNDE.leereRunde(1000, "standard", "p-rueck", "Rueckzug");
    runde.regeln.zufallsArmee = true;
    runde = SCHACH_RUNDE.teamBeitreten(runde, "id-anna", "weiss", 1000);
    runde = SCHACH_RUNDE.teamBeitreten(runde, "id-bert", "schwarz", 1000);
    runde = SCHACH_RUNDE.bereitSetzen(runde, "weiss", true, 1010);
    runde = SCHACH_RUNDE.bereitSetzen(runde, "schwarz", true, 1020);
    runde = SCHACH_RUNDE.aufstellungBereitSetzen(runde, "schwarz", true, 1030);

    gleich(runde.aufstellungBereit.schwarz, true, "Schwarz hat zugesagt");

    runde = SCHACH_RUNDE.bereitSetzen(runde, "weiss", false, 1040);

    gleich(runde.aufstellungBereit.schwarz, false, "die Zusage von Schwarz ist mit weg");
    gleich(runde.aufstellungBereit.weiss, false, "die eigene ohnehin");
    gleich(runde.laeuft, false, "und angepfiffen wird nichts");
});

pruefe("Neu wuerfeln trifft die richtige Seite (v0.62.0)", () => {
    /*
     * Nutzer-Ansage 25.08.2026: „Wenn beide dieselbe haben, koennen beide
     * Spieler separat auf den Knopf druecken und es aendern sich beide
     * Armeen; wenn beide unterschiedliche haben, aendert sich nur die
     * eigene."
     *
     * Geprueft wird am BRETT, nicht am Zaehler: Der Zaehler ist nur das
     * Mittel, das Brett ist die Aussage.
     */
    const bauen = (getrennt) => {
        const runde = SCHACH_RUNDE.leereRunde(1000, "standard", "p-wurf", "Wuerfeln");
        runde.regeln.zufallsArmee = true;
        runde.regeln.armeeUnterschiedlich = getrennt;
        SCHACH_RUNDE.armeeAufstellen(runde);
        return runde;
    };

    /* Die Grundreihen der beiden Seiten aus dem Brett-String. */
    const reihen = (runde) => {
        const breite = SCHACH.breiteVon(runde.stand);
        const felder = runde.stand.brett;
        return {
            weiss: felder.slice(felder.length - breite),
            schwarz: felder.slice(0, breite)
        };
    };

    /* Getrennt: nur die eigene Seite bekommt neue Figuren. */
    const getrennt = bauen(true);
    const vorher = reihen(getrennt);
    const danach = reihen(SCHACH_RUNDE.armeeNeuWuerfeln(getrennt, "weiss", 2000));

    wahr(danach.weiss !== vorher.weiss, "getrennt: Weiss steht anders");
    gleich(danach.schwarz, vorher.schwarz, "getrennt: Schwarz bleibt unberuehrt");

    /* Gemeinsam: beide Seiten aendern sich, denn es ist DIESELBE Armee. */
    const gemeinsam = bauen(false);
    const vorherB = reihen(gemeinsam);
    const danachB = reihen(SCHACH_RUNDE.armeeNeuWuerfeln(gemeinsam, "weiss", 2000));

    wahr(danachB.weiss !== vorherB.weiss, "gemeinsam: Weiss steht anders");
    wahr(danachB.schwarz !== vorherB.schwarz, "gemeinsam: Schwarz auch");
});

pruefe("Neu wuerfeln nimmt beiden die Zusage, laesst die Seiten stehen (v0.62.0)", () => {
    /*
     * Der Unterschied zu `neuePartie` (der Revanche): Dort faellt alles
     * zurueck, hier NUR das Brett und die Zusage dazu. Wer eine Aufstellung
     * bestaetigt hat, hat diese bestaetigt und nicht die naechste.
     */
    let runde = SCHACH_RUNDE.leereRunde(1000, "standard", "p-wurf2", "Zusage");
    runde.regeln.zufallsArmee = true;
    runde = SCHACH_RUNDE.teamBeitreten(runde, "id-anna", "weiss", 1000);
    runde = SCHACH_RUNDE.teamBeitreten(runde, "id-bert", "schwarz", 1000);
    runde = SCHACH_RUNDE.bereitSetzen(runde, "weiss", true, 1010);
    runde = SCHACH_RUNDE.bereitSetzen(runde, "schwarz", true, 1020);
    runde = SCHACH_RUNDE.aufstellungBereitSetzen(runde, "schwarz", true, 1030);

    const danach = SCHACH_RUNDE.armeeNeuWuerfeln(runde, "weiss", 2000);

    gleich(danach.aufstellungBereit.schwarz, false, "die Zusage zum alten Brett faellt");
    gleich(danach.bereit.weiss, true, "die Seite bleibt bestaetigt");
    gleich(danach.bereit.schwarz, true, "auf beiden Seiten");
    gleich(danach.teams.weiss.join(","), "id-anna", "die Teams bleiben stehen");
    wahr(SCHACH_RUNDE.inAufstellung(danach), "man steht weiter in der Aufstellung");
});

pruefe("Ohne Zufallsarmee gibt es nichts zu wuerfeln (v0.62.0)", () => {
    let runde = SCHACH_RUNDE.leereRunde(1000, "standard", "p-fest", "Feste Armee");
    runde.regeln.zufallsArmee = false;
    runde = SCHACH_RUNDE.teamBeitreten(runde, "id-anna", "weiss", 1000);
    runde = SCHACH_RUNDE.teamBeitreten(runde, "id-bert", "schwarz", 1000);
    runde = SCHACH_RUNDE.bereitSetzen(runde, "weiss", true, 1010);
    runde = SCHACH_RUNDE.bereitSetzen(runde, "schwarz", true, 1020);
    runde = SCHACH_RUNDE.aufstellungBereitSetzen(runde, "schwarz", true, 1030);

    const danach = SCHACH_RUNDE.armeeNeuWuerfeln(runde, "weiss", 2000);

    gleich(danach.stand.brett, runde.stand.brett, "das Brett bleibt, wie es war");
    gleich(danach.aufstellungBereit.schwarz, true, "und niemandes Zusage faellt");
});

pruefe("Ein Stand von vor v0.62.0 behaelt seine Aufstellung genau (v0.62.0)", () => {
    /*
     * DER DATENVERTRAG. `armeeWurf` ist neu; stuende der Zaehler auch bei 0
     * in der Saat („|wurf0"), wuerfelte JEDE Partie von frueher beim naechsten
     * Laden anders. Deshalb kommt bei 0 nichts dazu — und genau das prueft
     * dieser Test, indem er den Zaehler wegnimmt.
     */
    const runde = SCHACH_RUNDE.leereRunde(1000, "standard", "p-alt", "Alter Stand");
    runde.regeln.zufallsArmee = true;
    SCHACH_RUNDE.armeeAufstellen(runde);
    const mitZaehler = runde.stand.brett;

    const ohne = SCHACH_RUNDE.leereRunde(1000, "standard", "p-alt", "Alter Stand");
    ohne.regeln.zufallsArmee = true;
    delete ohne.armeeWurf;
    SCHACH_RUNDE.armeeAufstellen(ohne);

    gleich(ohne.stand.brett, mitZaehler,
        "ohne Zaehler dasselbe Brett wie mit Zaehler 0");

    /* Und nach dem Normalisieren ist der Zaehler wieder da. */
    const geheilt = SCHACH_RUNDE.normalisieren(ohne);
    gleich(geheilt.armeeWurf.weiss, 0, "nachgeruestet auf 0");
    gleich(geheilt.aufstellungBereit.weiss, false, "und die Zusage auf nein");
});
pruefe("Zugeloste Seite: zuteilen, sofort bereit, kein Seitenwahl-Schirm (v0.66.0)", () => {
    /*
     * NUTZER-ANSAGE 25.08.2026: „Der Haken soll aussagen, ob es zufaellig
     * entschieden wird, in welches Team man kommt, oder halt die Auswahl.
     * Standardmaessig soll zufaellig sein, und somit faellt der erste Screen
     * komplett raus."
     *
     * NUTZER-ENTSCHEIDUNG dazu: Die Zuteilung ZAEHLT als erste Bereitschaft
     * — es gibt dann nur noch das zweite Bereit, das die Partie startet.
     */
    const runde = SCHACH_RUNDE.leereRunde(1000, "standard", "p-los", "Zulosen");
    if (runde.regeln.seiteZufaellig !== true) {
        throw new Error("die Vorgabe ist nicht das Zulosen");
    }

    const zugeteilt = SCHACH_RUNDE.seiteZulosen(runde, "id-anna", 2000);
    const farbe = SCHACH_RUNDE.teamVon(zugeteilt, "id-anna");

    if (!farbe) {
        throw new Error("es wurde keine Seite zugeteilt");
    }
    if (zugeteilt.bereit[farbe] !== true) {
        throw new Error("die Zuteilung gilt nicht als bereit");
    }

    /* Zweimal zuteilen aendert nichts — wer drin sitzt, sitzt drin. */
    const nochmal = SCHACH_RUNDE.seiteZulosen(zugeteilt, "id-anna", 2100);
    if (SCHACH_RUNDE.teamVon(nochmal, "id-anna") !== farbe) {
        throw new Error("die zweite Zuteilung hat die Seite gewechselt");
    }

    /* Der Zweite bekommt die andere Seite — nicht die volle. */
    const zuZweit = SCHACH_RUNDE.seiteZulosen(zugeteilt, "id-bert", 2200);
    const zweite = SCHACH_RUNDE.teamVon(zuZweit, "id-bert");
    if (!zweite || zweite === farbe) {
        throw new Error("der Zweite landete nicht auf der freien Seite: " + zweite);
    }

    /*
     * Jetzt sind beide da und bereit — und weil die Standard-Runde KEINE
     * Zufallsarmee hat, ist damit schon angepfiffen (Punkt 8, 27.08.2026):
     * Es gibt nichts anzusehen und nichts zu wuerfeln, der
     * Aufstellungs-Bildschirm existiert ohne Zufallsarmee nicht mehr.
     */
    if (zuZweit.laeuft !== true) {
        throw new Error("die Partie startet nicht, obwohl beide zugelost sind");
    }

    /* Ein Dritter wird NICHT einsortiert — beide Seiten sind besetzt. */
    const dritter = SCHACH_RUNDE.seiteZulosen(zuZweit, "id-cem", 2300);
    if (SCHACH_RUNDE.teamVon(dritter, "id-cem")) {
        throw new Error("ein Dritter wurde in eine volle Runde gesteckt");
    }
});

pruefe("Ohne den Haken bleibt die Seitenwahl, wie sie war (v0.66.0)", () => {
    const runde = SCHACH_RUNDE.leereRunde(1000, "standard", "p-wahl", "Wahl");
    runde.regeln.seiteZufaellig = false;

    const unveraendert = SCHACH_RUNDE.seiteZulosen(runde, "id-anna", 2000);
    if (SCHACH_RUNDE.teamVon(unveraendert, "id-anna")) {
        throw new Error("ohne Haken wurde trotzdem zugeteilt");
    }

    /* Und ohne Team steht auch die Aufstellung nicht an — es kommt die
       Seitenwahl. */
    if (SCHACH_RUNDE.inAufstellung(runde, "id-anna")) {
        throw new Error("die Aufstellung steht an, obwohl niemand gewaehlt hat");
    }
});

pruefe("Eine Partie von vor v0.66.0 behaelt ihre Seitenwahl (v0.66.0)", () => {
    /*
     * DER DATENVERTRAG: Das Feld ist neu. Eine Runde von frueher hat es
     * nicht — sie muss als AUS gelten, sonst aendert sich mitten in einer
     * wartenden Runde der Ablauf unter den Spielern.
     */
    const alt = SCHACH_RUNDE.leereRunde(1000, "standard", "p-alt2", "Alt");
    delete alt.regeln.seiteZufaellig;

    const geheilt = SCHACH_RUNDE.normalisieren(alt);
    if (geheilt.regeln.seiteZufaellig !== false) {
        throw new Error("eine alte Partie loste die Seite ploetzlich zu");
    }
});

console.log(anzahlOk + " ok, " + anzahlFehler + " Fehler");
process.exit(anzahlFehler === 0 ? 0 : 1);
