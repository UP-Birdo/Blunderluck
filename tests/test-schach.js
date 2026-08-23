/*
 * test-schach.js — Regressionstests der Schachregeln.
 *
 * Geladen wird die ECHTE Datei js\schach.js. Schachregeln sind der Bereich,
 * in dem sich Fehler am leichtesten verstecken (Rochade, en passant, Fesselung),
 * deshalb sind die Sonderfälle hier ausführlich abgedeckt.
 *
 * Aufruf: siehe tests\README.md
 */

const pfad = require("path");

/* schach.js liest die Spielarten (Brettmaße, Sonderregeln) aus dieser Tabelle
   und erwartet sie als globale Größe — genau wie im Browser, wo sie davor
   eingebunden ist. */
globalThis.SCHACH_VARIANTEN = require(pfad.join(__dirname, "..", "js", "schach-varianten.js"));
const SCHACH_VARIANTEN = globalThis.SCHACH_VARIANTEN;
const SCHACH = require(pfad.join(__dirname, "..", "js", "schach.js"));

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

/*
 * Baut ein Brett aus einer Belegung: { "e1": "K", "e8": "k" } — alles andere
 * ist leer. So bleiben die Tests lesbar.
 */
function brettAus(belegung) {
    let brett = "................................................................";
    for (const feldName of Object.keys(belegung)) {
        const feld = SCHACH.feldNummer(feldName);
        brett = brett.substring(0, feld) + belegung[feldName] + brett.substring(feld + 1);
    }
    return brett;
}

function standAus(belegung, amZug, zusatz) {
    return SCHACH.standNormalisieren(Object.assign({
        brett: brettAus(belegung),
        amZug: amZug || SCHACH.WEISS,
        rochade: "",
        enPassant: ""
    }, zusatz || {}));
}

/* Zielfelder eines Zuges als sortierte Liste von Feldnamen. */
function ziele(stand, vonName) {
    return SCHACH.zuege(stand, SCHACH.feldNummer(vonName))
        .map((zug) => SCHACH.feldName(zug.nach))
        .filter((name, stelle, liste) => liste.indexOf(name) === stelle)
        .sort()
        .join(",");
}

/* ------------------------------------------------------------------ *
 * Felder
 * ------------------------------------------------------------------ */

pruefe("Feldnamen und Feldnummern passen zusammen", () => {
    gleich(SCHACH.feldNummer("a8"), 0, "a8");
    gleich(SCHACH.feldNummer("h1"), 63, "h1");
    gleich(SCHACH.feldNummer("e4"), 36, "e4");
    gleich(SCHACH.feldName(0), "a8", "Feld 0");
    gleich(SCHACH.feldName(63), "h1", "Feld 63");
    gleich(SCHACH.feldName(36), "e4", "Feld 36");
    gleich(SCHACH.feldNummer("x9"), -1, "Unsinn");
});

pruefe("Die Grundstellung hat 32 Figuren am richtigen Platz", () => {
    const stand = SCHACH.neuerStand();
    gleich(stand.brett.length, 64, "Brettlänge");
    gleich(stand.brett.split(".").length - 1, 32, "leere Felder");
    gleich(SCHACH.figurAuf(stand, SCHACH.feldNummer("e1")), "K", "weisser König");
    gleich(SCHACH.figurAuf(stand, SCHACH.feldNummer("e8")), "k", "schwarzer König");
    gleich(SCHACH.figurAuf(stand, SCHACH.feldNummer("a1")), "T", "weisser Turm");
    gleich(SCHACH.figurAuf(stand, SCHACH.feldNummer("d8")), "d", "schwarze Dame");
    gleich(stand.amZug, SCHACH.WEISS, "Weiss beginnt");
});

/* ------------------------------------------------------------------ *
 * Gangarten
 * ------------------------------------------------------------------ */

pruefe("Der Bauer zieht eins, aus der Grundstellung zwei", () => {
    const stand = standAus({ "e2": "B", "e1": "K", "e8": "k" });
    gleich(ziele(stand, "e2"), "e3,e4", "Bauer auf e2");

    const gezogen = standAus({ "e3": "B", "e1": "K", "e8": "k" });
    gleich(ziele(gezogen, "e3"), "e4", "Bauer auf e3");
});

pruefe("Der Bauer schlägt schräg, nicht gerade", () => {
    const stand = standAus({ "e4": "B", "d5": "b", "e5": "b", "e1": "K", "e8": "k" });
    gleich(ziele(stand, "e4"), "d5", "nur schräg schlagen, e5 blockiert");
});

pruefe("Der Springer springt über Figuren", () => {
    const stand = standAus({ "g1": "S", "g2": "B", "f2": "B", "e1": "K", "e8": "k" });
    gleich(ziele(stand, "g1"), "e2,f3,h3", "Springer aus der Ecke");
});

/*
 * WER SPRINGT, BETRITT NUR SEIN ZIELFELD (Wunsch #14, festgehalten in v0.59).
 *
 * Daran hängt, was unterwegs eingesammelt wird: Der Turm nimmt jeden Würfel
 * mit, über den er zieht, der Springer nur den auf seinem Zielfeld. Das galt
 * seit v3.6 schon — geprüft wurde es aber nur mittelbar über das Einsammeln.
 * Nach der Meldung steht es hier direkt, damit niemand `betreteneFelder`
 * „vereinfacht" und das Einsammeln damit still verändert.
 */
pruefe("Der Springer betritt nur sein Zielfeld, der Turm jedes Feld dazwischen", () => {
    const stand = standAus({ "g1": "S", "a1": "T", "e1": "K", "e8": "k" });

    const felder = (vonName, nachName) => SCHACH
        .betreteneFelder(stand, SCHACH.feldNummer(vonName), SCHACH.feldNummer(nachName))
        .map((feld) => SCHACH.feldName(feld))
        .join(",");

    gleich(felder("g1", "f3"), "f3", "Springer g1 nach f3");
    gleich(felder("a1", "d1"), "b1,c1,d1", "Turm a1 nach d1");

    /* Der Weg, den man ZEICHNET, ist beim Springer trotzdem das L — sonst
       sähe man eine Bewegung, die es so nicht gibt. */
    gleich(SCHACH.wegFelder(stand, SCHACH.feldNummer("g1"), SCHACH.feldNummer("f3"))
        .map((feld) => SCHACH.feldName(feld)).join(","),
    "g1,g2,g3,f3", "gezeichneter Weg des Springers");
});

pruefe("Turm, Läufer und Dame ziehen bis zum Hindernis", () => {
    const turm = standAus({ "a1": "T", "a4": "B", "e1": "K", "e8": "k" });
    gleich(ziele(turm, "a1"), "a2,a3,b1,c1,d1", "Turm bis vor den eigenen Bauern");

    const laeufer = standAus({ "c1": "L", "e3": "b", "e1": "K", "e8": "k" });
    gleich(ziele(laeufer, "c1"), "a3,b2,d2,e3", "Läufer schlägt auf e3");
});

/*
 * EIN LOCH SPERRT DIE SICHTLINIE WIE EINE MAUER (Wunsch #20, erster Teil).
 *
 * BEIM MESSEN AM 13.08. ALS FEHLER HERAUSGEKOMMEN: Die Zugerzeugung brach am
 * gesperrten Feld ab (seit v3.3), die BEDROHUNGSPRÜFUNG aber nicht. Ein Turm
 * gab dadurch quer durch ein Loch Schach, obwohl er dort nicht hinziehen kann —
 * Anzeige und Regel liefen auseinander. Seit v0.60 fragen beide dasselbe.
 */
pruefe("Hinter einem Loch gibt ein Turm kein Schach", () => {
    /* Ein schwarzer Turm zielt auf den weissen König — einmal frei, einmal
       mit einem Loch dazwischen. */
    const frei = standAus({ "a1": "t", "a5": "K", "h8": "k" }, SCHACH.SCHWARZ);
    wahr(SCHACH.imSchach(frei, SCHACH.WEISS), "ohne Loch steht der Koenig im Schach");

    const mitLoch = standAus({ "a1": "t", "a5": "K", "h8": "k" }, SCHACH.SCHWARZ,
        { risse: [SCHACH.feldNummer("a3")] });
    wahr(!SCHACH.imSchach(mitLoch, SCHACH.WEISS),
        "mit einem Loch dazwischen nicht mehr");

    /* Und der Turm kommt auch nicht daran vorbei. */
    gleich(ziele(mitLoch, "a1"), "a2,b1,c1,d1,e1,f1,g1,h1",
        "der Turm endet vor dem Loch");
});

/*
 * DASSELBE MIT EINER MAUER — genau der gemeldete Fall (Wunsch #12, v0.58):
 * „Durch die Mauer soll man nicht ziehen können. Auch wenn ein Turm auf der
 * anderen Seite steht, soll mein König auf die Linie ziehen können; ohne
 * Mauer stünde er im Schach, mit der Mauer kann das nicht passieren."
 *
 * Behoben mit v0.60 (die Bedrohungsprüfung kannte die Sperre nicht). Der Test
 * hält den Fall in der Sprache der Meldung fest.
 */
pruefe("Der Koenig darf hinter eine Mauer ziehen, obwohl dahinter ein Turm steht", () => {
    const mauerFeld = SCHACH.feldNummer("a3");

    /* Ohne Mauer ist a4 für den König verboten — der Turm auf a1 deckt die
       ganze Spalte. */
    const ohne = standAus({ "a1": "t", "b5": "K", "h8": "k" });
    wahr(ziele(ohne, "b5").indexOf("a4") === -1, "ohne Mauer ist a4 gesperrt");

    /* Mit Mauer auf a3 endet der Strahl davor, und a4 ist frei. */
    const mit = standAus({ "a1": "t", "b5": "K", "h8": "k" }, SCHACH.WEISS,
        { mauern: [{ felder: [mauerFeld], bis: 99 }] });

    wahr(SCHACH.gesperrt(mit, mauerFeld), "die Mauer steht");
    wahr(ziele(mit, "b5").indexOf("a4") !== -1,
        "mit Mauer darf der Koenig auf die Linie");
});

pruefe("Der König zieht ein Feld weit", () => {
    const stand = standAus({ "e4": "K", "e8": "k" });
    gleich(ziele(stand, "e4"), "d3,d4,d5,e3,e5,f3,f4,f5", "König in der Mitte");
});

pruefe("Wer nicht am Zug ist, kann nicht ziehen", () => {
    const stand = standAus({ "e2": "B", "e1": "K", "e8": "k", "e7": "b" }, SCHACH.WEISS);
    gleich(ziele(stand, "e7"), "", "schwarzer Bauer bei Weiss am Zug");
});

/* ------------------------------------------------------------------ *
 * Schach, Fesselung, Matt, Patt
 * ------------------------------------------------------------------ */

pruefe("Ein Schach wird erkannt", () => {
    const stand = standAus({ "e1": "K", "e8": "t", "a1": "k" });
    wahr(SCHACH.imSchach(stand, SCHACH.WEISS), "Weiss steht im Schach");
    wahr(!SCHACH.imSchach(stand, SCHACH.SCHWARZ), "Schwarz nicht");
});

pruefe("Eine gefesselte Figur darf die Fesselung nicht verlassen", () => {
    /* Der Läufer auf e2 steht zwischen König e1 und Turm e8. */
    const stand = standAus({ "e1": "K", "e2": "L", "e8": "t", "a8": "k" });
    gleich(ziele(stand, "e2"), "", "Läufer ist gefesselt");
});

pruefe("Der König darf nicht in ein bedrohtes Feld ziehen", () => {
    const stand = standAus({ "e1": "K", "d8": "t", "a8": "k" });
    /* d-Linie ist bedroht, also kein d1 und kein d2. */
    gleich(ziele(stand, "e1"), "e2,f1,f2", "König weicht aus");
});

pruefe("Schachmatt wird erkannt", () => {
    /* Klassisches Turmmatt: König a8, Türme b1 und a-Linie. */
    const stand = standAus({ "a8": "k", "h8": "T", "g7": "T", "e1": "K" }, SCHACH.SCHWARZ);
    const lage = SCHACH.lage(stand);
    gleich(lage.art, "matt", "Matt");
    gleich(lage.sieger, SCHACH.WEISS, "Weiss gewinnt");
});

pruefe("Patt wird erkannt und ist kein Matt", () => {
    /* Schwarz am Zug, König a8, keine Zugmöglichkeit, aber kein Schach. */
    const stand = standAus({ "a8": "k", "b6": "D", "e1": "K" }, SCHACH.SCHWARZ);
    const lage = SCHACH.lage(stand);
    gleich(lage.art, "patt", "Patt");
    gleich(lage.sieger, "", "kein Sieger");
});

pruefe("Im Schach zaehlen nur Zuege, die es beenden", () => {
    /* Turm gibt Schach auf der e-Linie; der Bauer auf a2 darf nicht ziehen. */
    const stand = standAus({ "e1": "K", "e8": "t", "a2": "B", "h8": "k" });
    gleich(ziele(stand, "a2"), "", "Bauer darf nicht");
    wahr(ziele(stand, "e1").length > 0, "der König schon");
});

/* ------------------------------------------------------------------ *
 * Rochade
 * ------------------------------------------------------------------ */

pruefe("Die kurze Rochade ist moeglich, wenn alles frei ist", () => {
    const stand = standAus({ "e1": "K", "h1": "T", "e8": "k" }, SCHACH.WEISS, { rochade: "KD" });
    wahr(ziele(stand, "e1").indexOf("g1") !== -1, "g1 ist erreichbar");

    const ergebnis = SCHACH.ziehen(stand, SCHACH.feldNummer("e1"), SCHACH.feldNummer("g1"));
    wahr(ergebnis !== null, "Rochade wird ausgefuehrt");
    gleich(SCHACH.figurAuf(ergebnis.stand, SCHACH.feldNummer("g1")), "K", "König auf g1");
    gleich(SCHACH.figurAuf(ergebnis.stand, SCHACH.feldNummer("f1")), "T", "Turm auf f1");
    gleich(SCHACH.figurAuf(ergebnis.stand, SCHACH.feldNummer("h1")), ".", "h1 ist leer");
    gleich(ergebnis.stand.rochade.indexOf("K"), -1, "Recht verbraucht");
});

pruefe("Die lange Rochade zieht den Turm nach d1", () => {
    const stand = standAus({ "e1": "K", "a1": "T", "e8": "k" }, SCHACH.WEISS, { rochade: "KD" });
    const ergebnis = SCHACH.ziehen(stand, SCHACH.feldNummer("e1"), SCHACH.feldNummer("c1"));

    wahr(ergebnis !== null, "Rochade wird ausgefuehrt");
    gleich(SCHACH.figurAuf(ergebnis.stand, SCHACH.feldNummer("c1")), "K", "König auf c1");
    gleich(SCHACH.figurAuf(ergebnis.stand, SCHACH.feldNummer("d1")), "T", "Turm auf d1");
});

pruefe("Rochade ist verboten im Schach, ueber ein bedrohtes Feld und ohne Recht", () => {
    const imSchach = standAus({ "e1": "K", "h1": "T", "e8": "t", "a8": "k" },
        SCHACH.WEISS, { rochade: "K" });
    wahr(ziele(imSchach, "e1").indexOf("g1") === -1, "nicht aus dem Schach heraus");

    const ueberBedroht = standAus({ "e1": "K", "h1": "T", "f8": "t", "a8": "k" },
        SCHACH.WEISS, { rochade: "K" });
    wahr(ziele(ueberBedroht, "e1").indexOf("g1") === -1, "nicht ueber f1");

    const ohneRecht = standAus({ "e1": "K", "h1": "T", "e8": "k" }, SCHACH.WEISS, { rochade: "" });
    wahr(ziele(ohneRecht, "e1").indexOf("g1") === -1, "ohne Recht gar nicht");

    const besetzt = standAus({ "e1": "K", "h1": "T", "f1": "S", "e8": "k" },
        SCHACH.WEISS, { rochade: "K" });
    wahr(ziele(besetzt, "e1").indexOf("g1") === -1, "nicht durch eigene Figuren");
});

pruefe("Ein Koenigszug nimmt beide Rochaderechte", () => {
    const stand = standAus({ "e1": "K", "a1": "T", "h1": "T", "e8": "k" },
        SCHACH.WEISS, { rochade: "KD" });
    const ergebnis = SCHACH.ziehen(stand, SCHACH.feldNummer("e1"), SCHACH.feldNummer("e2"));
    gleich(ergebnis.stand.rochade, "", "beide Rechte weg");
});

/* ------------------------------------------------------------------ *
 * En passant und Umwandlung
 * ------------------------------------------------------------------ */

pruefe("En passant ist genau einen Zug lang moeglich", () => {
    /* Schwarzer Bauer zieht d7-d5, weisser Bauer steht auf e5. */
    const vorher = standAus({ "d7": "b", "e5": "B", "e1": "K", "e8": "k" }, SCHACH.SCHWARZ);
    const doppelschritt = SCHACH.ziehen(vorher, SCHACH.feldNummer("d7"), SCHACH.feldNummer("d5"));

    gleich(doppelschritt.stand.enPassant, "d6", "Feld hinter dem Bauern gemerkt");
    wahr(ziele(doppelschritt.stand, "e5").indexOf("d6") !== -1, "Schlagen moeglich");

    const geschlagen = SCHACH.ziehen(doppelschritt.stand,
        SCHACH.feldNummer("e5"), SCHACH.feldNummer("d6"));
    gleich(SCHACH.figurAuf(geschlagen.stand, SCHACH.feldNummer("d6")), "B", "Bauer steht auf d6");
    gleich(SCHACH.figurAuf(geschlagen.stand, SCHACH.feldNummer("d5")), ".", "geschlagener Bauer ist weg");
});

pruefe("Ein Bauer auf der letzten Reihe wandelt um", () => {
    const stand = standAus({ "a7": "B", "e1": "K", "h8": "k" });

    const zurDame = SCHACH.ziehen(stand, SCHACH.feldNummer("a7"), SCHACH.feldNummer("a8"), "D");
    gleich(SCHACH.figurAuf(zurDame.stand, SCHACH.feldNummer("a8")), "D", "wird Dame");

    const zumSpringer = SCHACH.ziehen(stand, SCHACH.feldNummer("a7"), SCHACH.feldNummer("a8"), "S");
    gleich(SCHACH.figurAuf(zumSpringer.stand, SCHACH.feldNummer("a8")), "S", "wird Springer");
});

/* ------------------------------------------------------------------ *
 * Ziehen allgemein
 * ------------------------------------------------------------------ */

pruefe("Ein unerlaubter Zug wird abgewiesen", () => {
    const stand = SCHACH.neuerStand();
    gleich(SCHACH.ziehen(stand, SCHACH.feldNummer("e2"), SCHACH.feldNummer("e5")), null, "drei Felder");
    gleich(SCHACH.ziehen(stand, SCHACH.feldNummer("e7"), SCHACH.feldNummer("e5")), null, "falsche Farbe");
    gleich(SCHACH.ziehen(stand, SCHACH.feldNummer("e4"), SCHACH.feldNummer("e5")), null, "leeres Feld");
});

pruefe("Nach dem Zug ist die andere Seite dran", () => {
    const stand = SCHACH.neuerStand();
    const ergebnis = SCHACH.ziehen(stand, SCHACH.feldNummer("e2"), SCHACH.feldNummer("e4"));

    gleich(ergebnis.stand.amZug, SCHACH.SCHWARZ, "Schwarz am Zug");
    gleich(ergebnis.stand.zugNummer, 1, "noch Zug 1");
    gleich(SCHACH.figurAuf(ergebnis.stand, SCHACH.feldNummer("e2")), ".", "e2 ist leer");
    gleich(SCHACH.figurAuf(ergebnis.stand, SCHACH.feldNummer("e4")), "B", "Bauer auf e4");
    gleich(stand.brett, SCHACH.GRUNDSTELLUNG, "Ausgangsstand unveraendert");
});

pruefe("Die Zugnummer steigt nach dem Zug von Schwarz", () => {
    let stand = SCHACH.neuerStand();
    stand = SCHACH.ziehen(stand, SCHACH.feldNummer("e2"), SCHACH.feldNummer("e4")).stand;
    stand = SCHACH.ziehen(stand, SCHACH.feldNummer("e7"), SCHACH.feldNummer("e5")).stand;
    gleich(stand.zugNummer, 2, "zweiter Zug");
});

pruefe("Der Zugtext ist lesbar", () => {
    const stand = SCHACH.neuerStand();
    const ergebnis = SCHACH.ziehen(stand, SCHACH.feldNummer("g1"), SCHACH.feldNummer("f3"));
    gleich(ergebnis.text, "Springer g1 nach f3", "Zugtext");
});

pruefe("Ein kaputter Stand wird zu einem gueltigen", () => {
    const stand = SCHACH.standNormalisieren({ brett: "Unsinn", amZug: "gelb" });
    gleich(stand.brett, SCHACH.GRUNDSTELLUNG, "Grundstellung");
    gleich(stand.amZug, SCHACH.WEISS, "Weiss");
    gleich(SCHACH.standNormalisieren(null).brett, SCHACH.GRUNDSTELLUNG, "null");
});

/* ------------------------------------------------------------------ *
 * Rochade: warum sie geht oder nicht geht
 *
 * `rochadeLage` beantwortet dem Bildschirm die Frage, warum gerade nicht
 * rochiert werden kann. Ohne diese Antwort sieht eine regelkonform gesperrte
 * Rochade wie ein Fehler aus.
 * ------------------------------------------------------------------ */

pruefe("In der Grundstellung steht die Rochade noch nicht offen", () => {
    const lage = SCHACH.rochadeLage(SCHACH.neuerStand(), SCHACH.WEISS);

    gleich(lage.length, 2, "zwei Seiten");
    gleich(lage[0].seite, "kurz", "erst kurz");
    gleich(lage[0].moeglich, false, "kurz gesperrt");
    wahr(lage[0].grund.indexOf("steht noch eine Figur") !== -1, "Grund: Figuren im Weg");
    gleich(lage[1].moeglich, false, "lang gesperrt");
});

pruefe("Bei freier Bahn ist die Rochade moeglich und nennt Turm und Zielfeld", () => {
    const stand = standAus({ "e1": "K", "h1": "T", "a1": "T", "e8": "k" },
        SCHACH.WEISS, { rochade: "KD" });
    const lage = SCHACH.rochadeLage(stand, SCHACH.WEISS);

    gleich(lage[0].moeglich, true, "kurz moeglich");
    gleich(lage[0].turmFeld, SCHACH.feldNummer("h1"), "Turmfeld kurz");
    gleich(lage[0].zielFeld, SCHACH.feldNummer("g1"), "Zielfeld kurz");

    gleich(lage[1].moeglich, true, "lang moeglich");
    gleich(lage[1].turmFeld, SCHACH.feldNummer("a1"), "Turmfeld lang");
    gleich(lage[1].zielFeld, SCHACH.feldNummer("c1"), "Zielfeld lang");
});

pruefe("Ohne Recht nennt die Lage den verfallenen Anspruch", () => {
    const stand = standAus({ "e1": "K", "h1": "T", "e8": "k" }, SCHACH.WEISS, { rochade: "" });
    const lage = SCHACH.rochadeLage(stand, SCHACH.WEISS);

    gleich(lage[0].moeglich, false, "gesperrt");
    wahr(lage[0].grund.indexOf("verfallen") !== -1, "Grund: Recht verfallen");
});

pruefe("Im Schach nennt die Lage genau das", () => {
    const stand = standAus({ "e1": "K", "h1": "T", "e8": "k", "e2": "t" },
        SCHACH.WEISS, { rochade: "K" });
    const lage = SCHACH.rochadeLage(stand, SCHACH.WEISS);

    gleich(lage[0].moeglich, false, "gesperrt");
    wahr(lage[0].grund.indexOf("im Schach") !== -1, "Grund: Koenig im Schach");
});

pruefe("Ein bedrohtes Feld auf dem Weg wird als solches benannt", () => {
    const stand = standAus({ "e1": "K", "h1": "T", "e8": "k", "f8": "t" },
        SCHACH.WEISS, { rochade: "K" });
    const lage = SCHACH.rochadeLage(stand, SCHACH.WEISS);

    gleich(lage[0].moeglich, false, "gesperrt");
    wahr(lage[0].grund.indexOf("bedrohtes Feld") !== -1, "Grund: bedrohtes Feld");
});

pruefe("Auch auf dem kleinen Brett steht die Rochade in der Grundstellung nicht offen", () => {
    /* Seit v2.1 gibt es sie in jeder Spielart — hier stehen aber noch Figuren
       zwischen König und Turm. */
    const lage = SCHACH.rochadeLage(SCHACH.neuerStand("klein"), SCHACH.WEISS);

    gleich(lage.length, 2, "zwei Seiten");
    gleich(lage[0].moeglich, false, "gesperrt");
    wahr(lage[0].grund.indexOf("steht noch eine Figur") !== -1, "Grund: Figuren im Weg");
});

pruefe("Die Lage passt zu den Zuegen, die es wirklich gibt", () => {
    /* Beides muss dasselbe sagen — sonst zeigt der Bildschirm etwas an, das
       das Regelwerk gar nicht erlaubt. */
    const stand = standAus({ "e1": "K", "h1": "T", "a1": "T", "e8": "k" },
        SCHACH.WEISS, { rochade: "KD" });

    const lage = SCHACH.rochadeLage(stand, SCHACH.WEISS);
    const zuege = SCHACH.zuege(stand, SCHACH.feldNummer("e1"));

    for (const eintrag of lage) {
        const gibtEs = zuege.some((zug) => zug.rochade === eintrag.seite);
        gleich(gibtEs, eintrag.moeglich, "Rochade " + eintrag.seite);
    }
});

pruefe("Aus einer echten Partie: Weiss hat rochiert, Schwarz kann noch nicht", () => {
    /*
     * Genau diese Stellung stand am 2026-08-02 in der Datenbank, als der Fehler
     * gemeldet wurde, die Rochade funktioniere nicht. Sie funktionierte: Weiss
     * hatte bereits rochiert (Koenig g1, Turm f1), und bei Schwarz standen
     * Laeufer und Dame noch im Weg.
     */
    const stand = SCHACH.standNormalisieren({
        brett: "t.ldkl.t.bb..bbb...b....s...b.......B.B..LSB.S..B.B..BB.T.LD.TK.",
        amZug: "schwarz",
        rochade: "kd"
    });

    gleich(SCHACH.figurAuf(stand, SCHACH.feldNummer("g1")), "K", "weisser Koenig steht auf g1");
    gleich(SCHACH.figurAuf(stand, SCHACH.feldNummer("f1")), "T", "weisser Turm steht auf f1");

    const weiss = SCHACH.rochadeLage(stand, SCHACH.WEISS);
    gleich(weiss[0].moeglich, false, "Weiss kann nicht mehr");
    wahr(weiss[0].grund.indexOf("verfallen") !== -1, "Grund: Recht verfallen");

    const schwarz = SCHACH.rochadeLage(stand, SCHACH.SCHWARZ);
    gleich(schwarz[0].moeglich, false, "Schwarz kurz nicht");
    wahr(schwarz[0].grund.indexOf("steht noch eine Figur") !== -1, "Grund kurz: Figur im Weg");
    gleich(schwarz[1].moeglich, false, "Schwarz lang nicht");
    wahr(schwarz[1].grund.indexOf("steht noch eine Figur") !== -1, "Grund lang: Figur im Weg");
});

/* ------------------------------------------------------------------ *
 * Spielarten: andere Brettmaße
 *
 * Die Regeln müssen mit jedem Brett zurechtkommen. Geprüft wird deshalb
 * jede Größe einmal komplett durch — Umrechnung der Felder, Bauernzüge,
 * Umwandlung und das Ende der Partie.
 * ------------------------------------------------------------------ */

pruefe("Jede Spielart hat ein Brett in der angegebenen Groesse", () => {
    for (const variante of SCHACH_VARIANTEN.liste) {
        gleich(variante.aufstellung.length, variante.breite * variante.hoehe,
            "Feldanzahl von " + variante.id);
        wahr(variante.aufstellung.indexOf("K") !== -1, "weisser Koenig in " + variante.id);
        wahr(variante.aufstellung.indexOf("k") !== -1, "schwarzer Koenig in " + variante.id);
    }
});

pruefe("Feldnamen rechnen auf jedem Brett richtig", () => {
    /* Klassisch bleibt alles wie bisher. */
    gleich(SCHACH.feldNummer("a8"), 0, "a8");
    gleich(SCHACH.feldNummer("h1"), 63, "h1");

    /* Kleines Brett: 6 mal 6. */
    gleich(SCHACH.feldNummer("a6", 6, 6), 0, "a6 klein");
    gleich(SCHACH.feldNummer("f1", 6, 6), 35, "f1 klein");
    gleich(SCHACH.feldName(0, 6, 6), "a6", "Feld 0 klein");
    gleich(SCHACH.feldName(35, 6, 6), "f1", "Feld 35 klein");

    /* Doppelbrett: 16 Spalten, also bis p. */
    gleich(SCHACH.feldName(15, 16, 8), "p8", "Feld 15 doppelt");
    gleich(SCHACH.feldNummer("p1", 16, 8), 127, "p1 doppelt");

    /* Ausserhalb des Brettes gibt es kein Feld. */
    gleich(SCHACH.feldNummer("i1"), -1, "i gibt es auf 8 Spalten nicht");
    gleich(SCHACH.feldNummer("a1", 6, 6), 30, "a1 auf dem kleinen Brett");
    gleich(SCHACH.feldNummer("a7", 6, 6), -1, "a7 gibt es auf 6 Reihen nicht");
    gleich(SCHACH.feldNummer("g1", 6, 6), -1, "g gibt es auf 6 Spalten nicht");
});

pruefe("Auf dem kleinen Brett zieht der Bauer wie erwartet", () => {
    const stand = SCHACH.neuerStand("klein");
    gleich(stand.breite, 6, "Breite");
    gleich(stand.brett.length, 36, "Felder");

    /* c2 auf dem 6er-Brett ist die Bauernreihe. */
    const von = SCHACH.feldNummer("c2", 6, 6);
    const ziele = SCHACH.zuege(stand, von)
        .map((zug) => SCHACH.feldName(zug.nach, 6, 6)).sort().join(",");
    gleich(ziele, "c3,c4", "Einzel- und Doppelschritt");
});

pruefe("Auf dem kleinen Brett laesst sich wirklich rochieren", () => {
    /*
     * Der Kern der Umstellung von v2.1: Der König steht hier auf d1, nicht auf
     * e1 — die Rochade darf nicht mehr an festen Plätzen hängen.
     */
    const stand = SCHACH.standNormalisieren({
        variante: "klein",
        brett: "..dk.."
            + "......"
            + "......"
            + "......"
            + "......"
            + "T..K.T",
        amZug: "weiss"
    });

    gleich(SCHACH.figurAuf(stand, 33), "K", "Koenig steht auf d1");

    const lage = SCHACH.rochadeLage(stand, SCHACH.WEISS);
    const kurz = lage.find((eintrag) => eintrag.seite === "kurz");
    wahr(kurz.moeglich, "kurze Rochade moeglich");

    const ergebnis = SCHACH.ziehen(stand, 33, kurz.zielFeld);
    wahr(ergebnis !== null, "Rochade ausfuehrbar");
    gleich(SCHACH.figurAuf(ergebnis.stand, kurz.zielFeld), "K", "Koenig zwei Felder weiter");
    gleich(SCHACH.figurAuf(ergebnis.stand, kurz.zielFeld - 1), "T", "Turm daneben");
    gleich(SCHACH.figurAuf(ergebnis.stand, 33), ".", "das alte Koenigsfeld ist leer");

    /* Auf diesem schmalen Brett landet der König genau dort, wo der Turm
       stand — beide dürfen sich dabei nicht gegenseitig löschen. */
    gleich(ergebnis.stand.brett.split("T").length - 1, 2, "beide Tuerme stehen noch");
    gleich(ergebnis.stand.brett.split("K").length - 1, 1, "und genau ein Koenig");
});

pruefe("Auf dem Doppelbrett rochiert jeder Koenig fuer sich", () => {
    const stand = SCHACH.standNormalisieren({
        variante: "doppelbrett",
        brett: "k..............."
            + "................"
            + "................"
            + "................"
            + "................"
            + "................"
            + "................"
            + "T...K..TT...K..T",
        amZug: "weiss"
    });

    const lage = SCHACH.rochadeLage(stand, SCHACH.WEISS);
    const moegliche = lage.filter((eintrag) => eintrag.moeglich);

    /* Zwei Könige mit je zwei Türmen: vier Rochaden stehen offen. */
    gleich(moegliche.length, 4, "vier moegliche Rochaden");

    /* Zieht der linke König, verliert nur er seine Rechte. */
    const linker = moegliche.find((eintrag) => eintrag.koenigFeld === 116);
    const danach = SCHACH.ziehen(stand, 116, linker.zielFeld);
    wahr(danach !== null, "Rochade ausfuehrbar");

    const spaeter = SCHACH.rochadeLage(
        Object.assign({}, danach.stand, { amZug: "weiss" }), SCHACH.WEISS);
    gleich(spaeter.filter((eintrag) => eintrag.moeglich).length, 2,
        "der zweite Koenig darf weiterhin");
});

pruefe("Der Koenig wird nie geschlagen, auch nicht beim Doppelzug", () => {
    /*
     * Der Fehler, der das ausgelöst hat: Mit dem Doppelzug setzt man Schach und
     * ist sofort wieder am Zug — der Gegner durfte nie reagieren. Ohne Sperre
     * verschwände sein König vom Brett, statt dass die Partie durch Matt endet.
     */
    const stand = SCHACH.standNormalisieren({
        brett: "....k..."
            + "........"
            + "........"
            + "........"
            + "........"
            + "........"
            + "....D..."
            + "....K...",
        amZug: "weiss",
        rochade: "",
        extraZug: "weiss"
    });

    const ziele = SCHACH.zuege(stand, SCHACH.feldNummer("e2"))
        .map((zug) => SCHACH.feldName(zug.nach));

    wahr(ziele.indexOf("e8") === -1, "die Dame darf den Koenig nicht schlagen");
    wahr(ziele.indexOf("e7") !== -1, "davor darf sie ziehen");

    gleich(SCHACH.ziehen(stand, SCHACH.feldNummer("e2"), SCHACH.feldNummer("e8")),
        null, "der Zug wird abgewiesen");
});

/* Baut ein leeres Brett der Spielart und setzt einzelne Figuren hinein:
   { 11: "B", 70: "K" } — die Zahlen sind Feldnummern. */
function brettDer(varianteId, belegung) {
    const variante = SCHACH_VARIANTEN.holen(varianteId);
    const felder = new Array(variante.breite * variante.hoehe).fill(".");

    for (const feld of Object.keys(belegung)) {
        felder[Number(feld)] = belegung[feld];
    }
    return felder.join("");
}

pruefe("Auf dem grossen Brett wandelt der Bauer auf der letzten Reihe um", () => {
    /* 10 Spalten, 8 Reihen: Feld 11 ist b7, Feld 1 ist b8. */
    const stand = SCHACH.standNormalisieren({
        variante: "gross",
        brett: brettDer("gross", { 11: "B", 70: "K", 9: "k" }),
        amZug: "weiss"
    });

    gleich(stand.breite, 10, "Breite");
    gleich(SCHACH.feldName(11, 10, 8), "b7", "Feld 11 ist b7");

    const zuege = SCHACH.zuege(stand, 11).filter((zug) => zug.umwandlung !== "");
    gleich(zuege.length, 4, "vier Umwandlungen");
    gleich(zuege[0].nach, 1, "auf die letzte Reihe");
});

pruefe("Auf dem Doppelbrett gibt es kein Schach, aber schlagbare Koenige", () => {
    const stand = SCHACH.neuerStand("doppelbrett");

    gleich(stand.breite, 16, "Breite");
    gleich(SCHACH.koenigFelder(stand, SCHACH.WEISS).length, 2, "zwei weisse Koenige");
    gleich(SCHACH.imSchach(stand, SCHACH.WEISS), false, "kein Schach-Begriff");
    gleich(SCHACH.lage(stand).art, "laeuft", "die Partie laeuft");
});

/*
 * DAS DOPPELBRETT HAT SEIT v0.59 ZWEI LEBEN STATT GAR KEINEM SCHACH
 * (Wunsch #17). Vorher galt dort `koenigSchlagbar`: Könige waren IMMER
 * gewöhnliche Figuren, auch der letzte. Jetzt gilt dieselbe Regel wie bei der
 * Zufallsarmee — der erste König fällt wie jede Figur, beim letzten kommen
 * Schach und Matt zurück.
 */
pruefe("Auf dem Doppelbrett faellt der erste Koenig wie jede Figur", () => {
    /* Schwarz hat noch beide Könige (Feld 0 und 1). */
    const stand = SCHACH.standNormalisieren({
        variante: "doppelbrett",
        brett: brettDer("doppelbrett", { 0: "k", 1: "k", 16: "D", 127: "K" }),
        amZug: "weiss"
    });

    wahr(SCHACH.koenigSchlagbarFuer(stand, SCHACH.SCHWARZ),
        "mit zwei Koenigen sind sie gewoehnliche Figuren");

    const ergebnis = SCHACH.ziehen(stand, 16, 0);
    wahr(ergebnis !== null, "die Dame darf den ersten Koenig schlagen");

    /* Danach steht nur noch einer — ab jetzt gilt wieder Schach. */
    wahr(!SCHACH.koenigSchlagbarFuer(ergebnis.stand, SCHACH.SCHWARZ),
        "der letzte Koenig ist wieder unantastbar");
});

pruefe("Auf dem Doppelbrett ist der LETZTE Koenig unantastbar und wird matt gesetzt", () => {
    const stand = SCHACH.standNormalisieren({
        variante: "doppelbrett",
        brett: brettDer("doppelbrett", { 0: "k", 16: "D", 127: "K" }),
        amZug: "weiss"
    });

    gleich(SCHACH.ziehen(stand, 16, 0), null, "die Dame darf ihn NICHT schlagen");

    /* Und so endet die Partie stattdessen: durch Matt. Die Dame auf b8 steht
       am Koenig, der weisse Koenig auf c8 deckt sie — a7 und b7 sind mit
       gedeckt, also bleibt Schwarz kein Feld. */
    const gesetzt = SCHACH.standNormalisieren({
        variante: "doppelbrett",
        brett: brettDer("doppelbrett", { 0: "k", 1: "D", 2: "K" }),
        amZug: "schwarz"
    });

    gleich(SCHACH.lage(gesetzt).art, "matt", "Partie vorbei");
    gleich(SCHACH.lage(gesetzt).sieger, SCHACH.WEISS, "Weiss gewinnt");
});

/* ------------------------------------------------------------------ *
 * Erdbeben (seit v3.3: drei Reihen zur Seite)
 * ------------------------------------------------------------------ */

/* Was steht nach der Wirkung wo? Als lesbare Liste "Feld=Figur". */
function belegungVon(stand, felderNamen) {
    return felderNamen
        .map((name) => name + "=" + SCHACH.figurAuf(stand, SCHACH.feldNummer(name)))
        .join(" ");
}

pruefe("Erdbeben schiebt drei Reihen zur Seite", () => {
    /* Drei Bauern in drei Reihen, alle in Spalte c. Angetippt wird e5 -
       rechte Haelfte, also nach rechts. */
    const stand = standAus({
        "e1": "K", "e8": "k",
        "c6": "B", "c5": "B", "c4": "B"
    });

    const wirkung = SCHACH.erdbeben(stand, SCHACH.feldNummer("e5"));
    wahr(wirkung !== null, "es wirkt");

    gleich(belegungVon(wirkung.stand, ["c6", "d6", "c5", "d5", "c4", "d4"]),
        "c6=. d6=B c5=. d5=B c4=. d4=B",
        "alle drei sind ein Feld nach rechts gerueckt");
});

pruefe("Erdbeben nach links, wenn links angetippt wird", () => {
    const stand = standAus({ "e1": "K", "e8": "k", "c5": "B" });
    const wirkung = SCHACH.erdbeben(stand, SCHACH.feldNummer("b5"));

    gleich(belegungVon(wirkung.stand, ["b5", "c5"]), "b5=B c5=.",
        "nach links");
});

pruefe("Erdbeben laesst eine Reihe von Figuren wie eine Schlange aufruecken", () => {
    /*
     * DIE Probe auf die Reihenfolge: Drei Bauern stehen direkt nebeneinander
     * auf e5, f5, g5, rechts davon (h5) ist frei. Nach rechts geschoben muss
     * ZUERST der auf g5 gehen, dann f5, dann e5 - sonst ueberschreiben sie
     * sich gegenseitig und es bleibt nur einer uebrig.
     */
    const stand = standAus({
        "a1": "K", "a8": "k",
        "e5": "B", "f5": "S", "g5": "T"
    });

    const wirkung = SCHACH.erdbeben(stand, SCHACH.feldNummer("f5"));

    gleich(belegungVon(wirkung.stand, ["e5", "f5", "g5", "h5"]),
        "e5=. f5=B g5=S h5=T",
        "alle drei sind aufgerueckt, keiner verloren");
});

pruefe("Wer am Rand ansteht, bleibt stehen - und blockiert dahinter", () => {
    /* h5 ist besetzt: Der Block g5/h5 kann nicht, f5 auch nicht. */
    const stand = standAus({
        "a1": "K", "a8": "k",
        "f5": "B", "g5": "S", "h5": "T"
    });

    const wirkung = SCHACH.erdbeben(stand, SCHACH.feldNummer("f5"));

    gleich(wirkung, null, "nichts kann sich bewegen");
});

pruefe("Erdbeben laesst Koenige stehen", () => {
    const stand = standAus({ "e5": "K", "e8": "k", "f5": "B" });
    const wirkung = SCHACH.erdbeben(stand, SCHACH.feldNummer("f5"));

    gleich(SCHACH.figurAuf(wirkung.stand, SCHACH.feldNummer("e5")), "K",
        "der Koenig bleibt");
    gleich(SCHACH.figurAuf(wirkung.stand, SCHACH.feldNummer("g5")), "B",
        "der Bauer rueckt");
});

pruefe("Eine Mauer haelt das Erdbeben auf", () => {
    const ohne = standAus({ "a1": "K", "a8": "k", "e5": "B" });
    wahr(SCHACH.erdbeben(ohne, SCHACH.feldNummer("e5")) !== null, "ohne Mauer geht es");

    const mit = SCHACH.standNormalisieren(Object.assign({}, ohne, {
        mauern: [{ felder: [SCHACH.feldNummer("f5")], bis: 6 }]
    }));

    gleich(SCHACH.erdbeben(mit, SCHACH.feldNummer("e5")), null,
        "gegen die Mauer rueckt niemand");
});

/* ------------------------------------------------------------------ *
 * Mauern (seit v3.3)
 * ------------------------------------------------------------------ */

/* Eine Mauer auf den angegebenen Feldern, die noch lange steht. */
function mitMauer(stand, felderNamen) {
    return SCHACH.standNormalisieren(Object.assign({}, stand, {
        mauern: [{
            felder: felderNamen.map((name) => SCHACH.feldNummer(name)),
            bis: stand.halbzuege + SCHACH.MAUER_HALBZUEGE
        }]
    }));
}

pruefe("Eine Mauer stoppt den Turm davor", () => {
    const ohne = standAus({ "e1": "K", "e8": "k", "a1": "T" });
    gleich(ziele(ohne, "a1").indexOf("a8") !== -1, true, "ohne Mauer bis a8");

    const mit = mitMauer(ohne, ["a4", "b4", "c4"]);
    const felder = ziele(mit, "a1").split(",");

    wahr(felder.indexOf("a3") !== -1, "bis vor die Mauer");
    wahr(felder.indexOf("a4") === -1, "nicht auf die Mauer");
    wahr(felder.indexOf("a5") === -1, "und nicht dahinter");
});

pruefe("Ein Springer setzt ueber die Mauer hinweg", () => {
    const stand = mitMauer(
        standAus({ "e1": "K", "e8": "k", "b1": "S" }),
        ["a2", "b2", "c2"]);

    const felder = ziele(stand, "b1").split(",");

    /* a3 und c3 liegen JENSEITS der Mauerreihe - der Springer kommt hin. */
    wahr(felder.indexOf("a3") !== -1, "a3 erreichbar");
    wahr(felder.indexOf("c3") !== -1, "c3 erreichbar");
});

pruefe("Auf eine Mauer zieht auch der Springer nicht", () => {
    const stand = mitMauer(
        standAus({ "e1": "K", "e8": "k", "b1": "S" }),
        ["a3", "b3", "c3"]);

    const felder = ziele(stand, "b1").split(",");

    wahr(felder.indexOf("a3") === -1, "a3 ist Mauer");
    wahr(felder.indexOf("c3") === -1, "c3 ist Mauer");
    wahr(felder.indexOf("d2") !== -1, "d2 geht weiter");
});

pruefe("Ein Bauer laeuft nicht in die Mauer", () => {
    const stand = mitMauer(
        standAus({ "e1": "K", "e8": "k", "d2": "B" }),
        ["c3", "d3", "e3"]);

    gleich(ziele(stand, "d2"), "", "kein Feld frei");
});

pruefe("Ein Bauer setzt nicht ueber die Mauer", () => {
    /* Der Doppelschritt ist die Falle: Sein Zielfeld liegt HINTER der Mauer. */
    const stand = mitMauer(
        standAus({ "e1": "K", "e8": "k", "d2": "B" }),
        ["c3", "d3", "e3"]);

    gleich(ziele(stand, "d2"), "", "weder ein Feld noch zwei");
});

pruefe("Eine Mauer verhindert die Rochade", () => {
    const ohne = SCHACH.standNormalisieren({
        brett: brettAus({ "e1": "K", "h1": "T", "e8": "k" }),
        amZug: SCHACH.WEISS,
        rochade: "K"
    });
    wahr(ziele(ohne, "e1").indexOf("g1") !== -1, "ohne Mauer geht die Rochade");

    const mit = mitMauer(ohne, ["f1", "g1", "h1"]);
    wahr(ziele(mit, "e1").indexOf("g1") === -1, "mit Mauer nicht");

    /* rochadeLage liefert je einen Eintrag fuer kurz und lang. */
    const kurz = SCHACH.rochadeLage(mit, "weiss")
        .find((eintrag) => eintrag.seite === "kurz");

    wahr(String(kurz.grund || "").indexOf("Mauer") !== -1,
        "und die Begruendung nennt sie: " + kurz.grund);
});

pruefe("Die Mauer zerfaellt nach ihrer Zeit", () => {
    const stand = SCHACH.standNormalisieren(Object.assign(
        {}, standAus({ "e1": "K", "e8": "k", "a1": "T" }), {
            mauern: [{ felder: [SCHACH.feldNummer("a4")], bis: 2 }],
            /* Der Takt ist die Uhr, nicht `halbzuege` — siehe schach.js. */
            takt: 5
        }));

    gleich(SCHACH.mauerAuf(stand, SCHACH.feldNummer("a4")), false, "abgelaufen");
    wahr(ziele(stand, "a1").indexOf("a8") !== -1, "der Turm kommt wieder durch");
});

pruefe("Eine Mauer braucht drei freie Felder in einer Reihe", () => {
    /* Das angetippte Feld ist die MITTE (seit v0.46) — die Mauer liegt also
       um es herum, je ein Feld links und rechts. */
    const stand = standAus({ "e1": "K", "e8": "k", "c4": "B" });

    gleich(SCHACH.mauerLegen(stand, SCHACH.feldNummer("b4")), null,
        "c4 ist besetzt und laege rechts daneben");
    wahr(SCHACH.mauerLegen(stand, SCHACH.feldNummer("e4")) !== null,
        "d4 bis f4 ist frei");
    gleich(SCHACH.mauerLegen(stand, SCHACH.feldNummer("a4")), null,
        "am linken Rand fehlt das Feld davor");
    gleich(SCHACH.mauerLegen(stand, SCHACH.feldNummer("h4")), null,
        "am rechten Rand fehlt das Feld dahinter");
});

/* Wie lange steht auf diesem Feld noch eine Mauer? 0 heisst: keine. */
function fristAuf(stand, name) {
    const feld = SCHACH.feldNummer(name);
    const treffer = SCHACH.mauern(stand)
        .filter((eintrag) => eintrag.felder.indexOf(feld) !== -1)
        .map((eintrag) => eintrag.bis);

    return treffer.length > 0 ? Math.max.apply(null, treffer) : 0;
}

pruefe("Eine Mauer darf auf einer anderen liegen (v0.85)", () => {
    /*
     * BIS v0.84 WAR DAS VERBOTEN — `mauerLegen` fragte `gesperrt`, und das
     * schliesst Mauern ein. Der Wunsch T4 dreht das um: Mauer auf Mauer ist
     * erlaubt, auch auf einer gegnerischen (Mauern haben keinen Besitzer).
     */
    const stand = mitMauer(standAus({ "e1": "K", "e8": "k" }), ["c4", "d4", "e4"]);

    wahr(SCHACH.mauerLegen(stand, SCHACH.feldNummer("b4")) !== null,
        "mitten auf die bestehende Mauer geht jetzt");
    wahr(SCHACH.mauerLegen(stand, SCHACH.feldNummer("g4")) !== null,
        "weiter rechts sowieso");
});

pruefe("Die Zeit addiert sich NUR auf den ueberlappenden Feldern (v0.85)", () => {
    /*
     * DER WUNSCH IM WORTLAUT: „auch wenn nur zwei Felder mit der alten Mauer
     * uebereinstimmen, soll sich die Zeit nur bei den zwei erhoehen, und das
     * einzelne Feld soll die einfache Zeit haben."
     *
     * Ausgangslage: c4-d4-e4 stehen bis 6 (Takt 0). Die neue Mauer wird auf
     * f4 getippt und deckt e4-f4-g4 — es ueberlappt genau e4.
     */
    const stand = mitMauer(standAus({ "e1": "K", "e8": "k" }), ["c4", "d4", "e4"]);
    gleich(fristAuf(stand, "e4"), SCHACH.MAUER_HALBZUEGE, "vorher die einfache Zeit");

    const wirkung = SCHACH.mauerLegen(stand, SCHACH.feldNummer("f4"));
    wahr(wirkung !== null, "die Mauer laesst sich legen");
    const neu = wirkung.stand;

    gleich(fristAuf(neu, "e4"), 2 * SCHACH.MAUER_HALBZUEGE,
        "das ueberlappende Feld traegt beide Zeiten");
    gleich(fristAuf(neu, "f4"), SCHACH.MAUER_HALBZUEGE,
        "das neue Feld nur die einfache");
    gleich(fristAuf(neu, "g4"), SCHACH.MAUER_HALBZUEGE,
        "und das zweite neue auch");

    /* Was von der alten Mauer daneben steht, bleibt unveraendert. */
    gleich(fristAuf(neu, "c4"), SCHACH.MAUER_HALBZUEGE, "c4 unberuehrt");
    gleich(fristAuf(neu, "d4"), SCHACH.MAUER_HALBZUEGE, "d4 unberuehrt");

    /* Und jedes Feld traegt genau EINEN Eintrag — sonst zaehlte die Restzeit
       doppelt. */
    for (const name of ["c4", "d4", "e4", "f4", "g4"]) {
        const feld = SCHACH.feldNummer(name);
        const wieOft = SCHACH.mauern(neu)
            .filter((eintrag) => eintrag.felder.indexOf(feld) !== -1).length;
        gleich(wieOft, 1, name + ": genau ein Eintrag");
    }
});

pruefe("Eine abgelaufene Mauer verlaengert nichts (v0.85)", () => {
    /*
     * Addiert wird die RESTZEIT, nicht die urspruengliche Dauer: Eine Mauer,
     * die schon weg ist, darf die neue nicht laenger machen.
     */
    const stand = mitMauer(standAus({ "e1": "K", "e8": "k" }), ["c4", "d4", "e4"]);
    const spaet = Object.assign({}, stand, { takt: SCHACH.MAUER_HALBZUEGE + 3 });

    gleich(fristAuf(spaet, "d4"), 0, "die alte Mauer ist abgelaufen");

    const wirkung = SCHACH.mauerLegen(spaet, SCHACH.feldNummer("d4"));
    gleich(fristAuf(wirkung.stand, "d4"),
        spaet.takt + SCHACH.MAUER_HALBZUEGE, "also die einfache Zeit");
});

pruefe("Auf einen Riss laesst sich keine Mauer legen (v0.85)", () => {
    /*
     * Mauer auf Mauer ja — Mauer auf Riss nein: Dort ist der Boden weg.
     * Diese Grenze musste beim Umbau ausdruecklich bleiben.
     */
    const stand = SCHACH.standNormalisieren(Object.assign(
        {}, standAus({ "e1": "K", "e8": "k" }),
        { risse: [SCHACH.feldNummer("d4")] }));

    gleich(SCHACH.mauerLegen(stand, SCHACH.feldNummer("d4")), null,
        "mitten auf den Riss geht nicht");
    gleich(SCHACH.mauerLegen(stand, SCHACH.feldNummer("c4")), null,
        "und auch nicht mit dem Riss am Rand der Mauer");
});

pruefe("Die gelegte Mauer deckt genau drei Felder", () => {
    const stand = standAus({ "e1": "K", "e8": "k" });
    const wirkung = SCHACH.mauerLegen(stand, SCHACH.feldNummer("d5"));

    gleich(wirkung.felder.length, 3, "drei Felder");
    gleich(wirkung.felder.map((feld) => SCHACH.feldName(feld)).join(","),
        "c5,d5,e5", "von links nach rechts, das angetippte in der Mitte");
});

pruefe("Mauern ueberleben das Speichern", () => {
    const stand = mitMauer(standAus({ "e1": "K", "e8": "k" }), ["c4", "d4", "e4"]);
    const zurueck = SCHACH.standNormalisieren(JSON.parse(JSON.stringify(stand)));

    gleich(SCHACH.mauerAuf(zurueck, SCHACH.feldNummer("d4")), true, "steht noch");
});

/* ------------------------------------------------------------------ *
 * Friedhof und geliehene Figuren (seit v3.3)
 * ------------------------------------------------------------------ */

pruefe("Der Friedhof stellt gefallene Gegner in einem 2x2-Feld auf", () => {
    const stand = standAus({ "a1": "K", "a8": "k" });
    const wirkung = SCHACH.friedhof(stand, "weiss", SCHACH.feldNummer("d5"), [
            { art: "D", feld: SCHACH.feldNummer("d5") },
            { art: "T", feld: SCHACH.feldNummer("e5") },
            { art: "S", feld: SCHACH.feldNummer("d4") },
            { art: "B", feld: SCHACH.feldNummer("e4") }
        ]);

    wahr(wirkung !== null, "es wirkt");
    gleich(wirkung.felder.length, 4, "vier Figuren");

    /* Sie stehen in MEINER Farbe da - Grossbuchstaben sind Weiss. */
    gleich(SCHACH.figurAuf(wirkung.stand, SCHACH.feldNummer("d5")), "D", "d5");
    gleich(SCHACH.figurAuf(wirkung.stand, SCHACH.feldNummer("e5")), "T", "e5");
    gleich(SCHACH.figurAuf(wirkung.stand, SCHACH.feldNummer("d4")), "S", "d4");
    gleich(SCHACH.figurAuf(wirkung.stand, SCHACH.feldNummer("e4")), "B", "e4");
});

pruefe("Der Friedhof braucht vier freie Felder", () => {
    const stand = standAus({ "a1": "K", "a8": "k", "e5": "B" });

    gleich(SCHACH.friedhof(stand, "weiss", SCHACH.feldNummer("d5"), [{ art: "T", feld: SCHACH.feldNummer("d5") }]), null,
        "e5 ist besetzt");
    wahr(SCHACH.friedhof(stand, "weiss", SCHACH.feldNummer("f5"), [{ art: "T", feld: SCHACH.feldNummer("f5") }]) !== null,
        "daneben ist Platz");
});

pruefe("Der Friedhof laesst keinen Koenig aufstehen", () => {
    const stand = standAus({ "a1": "K", "a8": "k" });

    gleich(SCHACH.friedhof(stand, "weiss", SCHACH.feldNummer("d5"), [{ art: "K", feld: SCHACH.feldNummer("d5") }]), null,
        "ein Koenig steht nicht auf");
});

pruefe("Eine geliehene Figur zieht wie eine eigene", () => {
    const stand = standAus({ "a1": "K", "a8": "k" });
    const wirkung = SCHACH.friedhof(stand, "weiss", SCHACH.feldNummer("d5"), [{ art: "T", feld: SCHACH.feldNummer("d5") }]);

    const felder = ziele(wirkung.stand, "d5").split(",");
    wahr(felder.length > 3, "der geliehene Turm hat Zuege: " + felder.length);
});

pruefe("Der Eintrag wandert mit der Figur mit", () => {
    const stand = standAus({ "a1": "K", "a8": "k" });
    const wirkung = SCHACH.friedhof(stand, "weiss", SCHACH.feldNummer("d5"), [{ art: "T", feld: SCHACH.feldNummer("d5") }]);

    gleich(SCHACH.istGeliehen(wirkung.stand, SCHACH.feldNummer("d5")), true, "steht auf d5");

    const nachher = SCHACH.ziehen(wirkung.stand,
        SCHACH.feldNummer("d5"), SCHACH.feldNummer("d7"));

    gleich(SCHACH.istGeliehen(nachher.stand, SCHACH.feldNummer("d7")), true,
        "und jetzt auf d7");
    gleich(SCHACH.istGeliehen(nachher.stand, SCHACH.feldNummer("d5")), false,
        "nicht mehr auf d5");
});

pruefe("Geliehene Figuren zerfallen nach ihrer Zeit", () => {
    /*
     * Ein SPRINGER steht auf - keine Dame: Die haette von d5 aus dem schwarzen
     * Koenig auf a8 Schach geboten, und dann darf Schwarz seinen Turm nicht
     * mehr ziehen. Der Test soll den Zerfall pruefen, nicht die Schachregel.
     */
    let stand = standAus({ "a1": "K", "a8": "k", "h1": "T", "h8": "t" });
    stand = SCHACH.friedhof(stand, "weiss", SCHACH.feldNummer("d5"), [{ art: "S", feld: SCHACH.feldNummer("d5") }]).stand;

    gleich(SCHACH.figurAuf(stand, SCHACH.feldNummer("d5")), "S", "der Springer steht da");

    /* Die Tuerme schieben sich hin und her, bis die Zeit um ist. */
    const wege = [
        ["h1", "h2"], ["h8", "h7"],
        ["h2", "h1"], ["h7", "h8"],
        ["h1", "h2"], ["h8", "h7"],
        ["h2", "h1"], ["h7", "h8"]
    ];

    for (const weg of wege) {
        const zug = SCHACH.ziehen(stand, SCHACH.feldNummer(weg[0]), SCHACH.feldNummer(weg[1]));
        wahr(zug !== null, "Zug " + weg[0] + "-" + weg[1] + " geht");
        stand = zug.stand;
    }

    gleich(SCHACH.figurAuf(stand, SCHACH.feldNummer("d5")), ".",
        "nach " + SCHACH.FRIEDHOF_HALBZUEGE + " Halbzuegen ist sie zerfallen");
});

pruefe("Der Takt laeuft weiter, auch wenn halbzuege zurueckspringt", () => {
    /*
     * DIE Falle: `halbzuege` ist der Zaehler der Fuenfzig-Zuege-Regel und
     * springt bei jedem Bauernzug auf 0. Als Uhr fuer ablaufende Wirkungen
     * taugt er deshalb nicht - der Takt schon.
     */
    const stand = standAus({ "e1": "K", "e8": "k", "d2": "B" });
    const nachher = SCHACH.ziehen(stand,
        SCHACH.feldNummer("d2"), SCHACH.feldNummer("d4"));

    gleich(nachher.stand.halbzuege, 0, "halbzuege springt zurueck");
    gleich(nachher.stand.takt, stand.takt + 1, "der Takt zaehlt weiter");
});

pruefe("Geliehene Figuren ueberleben das Speichern", () => {
    const stand = standAus({ "a1": "K", "a8": "k" });
    const wirkung = SCHACH.friedhof(stand, "weiss", SCHACH.feldNummer("d5"), [{ art: "T", feld: SCHACH.feldNummer("d5") }]);
    const zurueck = SCHACH.standNormalisieren(JSON.parse(JSON.stringify(wirkung.stand)));

    gleich(SCHACH.istGeliehen(zurueck, SCHACH.feldNummer("d5")), true, "noch geliehen");
});

/* ------------------------------------------------------------------ *
 * Zusatzmuster (Sprung, Ausweichen, Teleport)
 * ------------------------------------------------------------------ */

pruefe("Jedes Zusatzmuster ueberlebt das Speichern", () => {
    /*
     * DER FEHLER VON v3.6 BIS v0.40: `standNormalisieren` kannte "ausweichen"
     * nicht und warf es weg. Die Faehigkeit war aus dem Vorrat verbraucht, das
     * Muster beim naechsten Zeichnen aber schon wieder verschwunden. Deshalb
     * wird hier JEDES Muster geprueft, das `_musterzuege` kennt - und nicht
     * nur das eine, das gerade gemeldet wurde.
     */
    for (const muster of ["springer", "ausweichen", "koenig", "umkreis2"]) {
        const stand = standAus({ "e1": "K", "e8": "k", "d4": "T" }, "weiss",
            { zusatzFarbe: "weiss", zusatzMuster: muster });
        const zurueck = SCHACH.standNormalisieren(JSON.parse(JSON.stringify(stand)));

        wahr(zurueck.zusatzMuster !== "", "Muster " + muster + " bleibt erhalten");
        wahr(SCHACH._musterzuege(zurueck, SCHACH.feldNummer("d4"), "weiss",
            zurueck.zusatzMuster).length > 0, "Muster " + muster + " liefert Zuege");
    }
});

pruefe("Ausweichen laesst den Turm ein Feld weit auf ein freies Feld", () => {
    const stand = standAus({ "e1": "K", "e8": "k", "d4": "T" }, "weiss",
        { zusatzFarbe: "weiss", zusatzMuster: "ausweichen" });

    wahr(ziele(stand, "d4").indexOf("c3") !== -1, "das Nachbarfeld ist dabei");
});

pruefe("Ausweichen bedroht nichts - es kann nicht schlagen", () => {
    /*
     * Ausweichen zieht seit v3.5 nur auf FREIE Felder. Eine gegnerische Figur
     * daneben ist deshalb KEIN Schach. Bis v0.40 zaehlte `_feldBedroht` das
     * alte Muster "koenig" trotzdem mit - daraus haette ein falsches
     * Schachmatt werden koennen.
     */
    for (const muster of ["ausweichen", "koenig"]) {
        const stand = standAus({ "e1": "K", "e8": "k", "d2": "t" }, "weiss",
            { zusatzFarbe: "schwarz", zusatzMuster: muster });

        gleich(SCHACH.imSchach(stand, "weiss"), false,
            "Muster " + muster + ": kein Schach durch das Nachbarfeld");
    }
});

pruefe("Ein Bauer wandelt auch per Zusatzmuster um", () => {
    /*
     * GEMELDET ALS „Sprung muss zur Dame werden" (Wunsch #4): Wer mit der
     * Faehigkeit Sprung als Bauer auf die letzte Reihe kommt, blieb ein Bauer
     * und stand dort fuer immer fest. Die Umwandlung hing an `_bauernzuege`
     * statt am Zug.
     */
    const stand = standAus({ "e1": "K", "e8": "k", "b6": "B" }, "weiss",
        { zusatzFarbe: "weiss", zusatzMuster: "springer" });

    /* b6 nach a8: ein Springerzug auf die letzte Reihe. */
    const zuege = SCHACH.zuege(stand, SCHACH.feldNummer("b6"))
        .filter((zug) => zug.nach === SCHACH.feldNummer("a8"));

    gleich(zuege.length, 4, "vier Umwandlungen zur Auswahl");

    const dame = SCHACH.ziehen(stand,
        SCHACH.feldNummer("b6"), SCHACH.feldNummer("a8"), "D");
    gleich(SCHACH.figurAuf(dame.stand, SCHACH.feldNummer("a8")), "D",
        "aus dem Bauern wird eine Dame");

    const springer = SCHACH.ziehen(stand,
        SCHACH.feldNummer("b6"), SCHACH.feldNummer("a8"), "S");
    gleich(SCHACH.figurAuf(springer.stand, SCHACH.feldNummer("a8")), "S",
        "wer will, bekommt einen Springer");
});

pruefe("Nur ein Bauer wandelt um, keine andere Figur", () => {
    const stand = standAus({ "e1": "K", "e8": "k", "b6": "T" }, "weiss",
        { zusatzFarbe: "weiss", zusatzMuster: "springer" });

    const zuege = SCHACH.zuege(stand, SCHACH.feldNummer("b6"))
        .filter((zug) => zug.nach === SCHACH.feldNummer("a8"));

    gleich(zuege.length, 1, "der Turm springt einmal, ohne Auswahl");
    gleich(zuege[0].umwandlung, "", "und wandelt sich nicht");
});

pruefe("Der Sprung bedroht sehr wohl - er schlaegt", () => {
    const stand = standAus({ "e1": "K", "e8": "k", "d3": "t" }, "weiss",
        { zusatzFarbe: "schwarz", zusatzMuster: "springer" });

    gleich(SCHACH.imSchach(stand, "weiss"), true, "Sprung des Turms trifft e1");
});

/* ------------------------------------------------------------------ *
 * Von welchen Seiten eine Farbe startet (seit v0.72)
 * ------------------------------------------------------------------ */

pruefe("Ohne Angabe gilt die Farbregel: Weiss unten, Schwarz oben", () => {
    const stand = standAus({ "e1": "K", "e8": "k" }, "weiss");

    gleich(SCHACH.startSeitenVon(stand, "weiss").join(","), "unten", "Weiss");
    gleich(SCHACH.startSeitenVon(stand, "schwarz").join(","), "oben", "Schwarz");
});

pruefe("Die gemerkten Startseiten gehen der Farbregel vor (v0.72)", () => {
    const stand = SCHACH.standNormalisieren({
        brett: brettAus({ "e1": "K", "e8": "k" }),
        amZug: "weiss",
        startSeiten: { weiss: ["links", "rechts"], schwarz: ["oben", "unten"] }
    });

    gleich(SCHACH.startSeitenVon(stand, "weiss").join(","), "links,rechts", "Weiss");
    gleich(SCHACH.startSeitenVon(stand, "schwarz").join(","), "oben,unten", "Schwarz");

    /* Und sie halten, auch wenn keine Figur der Farbe mehr steht — genau
       dafuer stehen sie im Stand und werden nicht abgelesen. */
    const leer = SCHACH.standNormalisieren(Object.assign({}, stand, {
        brett: brettAus({ "e1": "K" })
    }));
    gleich(SCHACH.startSeitenVon(leer, "schwarz").join(","), "oben,unten",
        "auch ohne Figuren");

    /* Unsinn faellt weg und damit auf den Rueckfall zurueck. */
    const kaputt = SCHACH.standNormalisieren(Object.assign({}, stand, {
        startSeiten: { weiss: ["quer"], schwarz: [] }
    }));
    gleich(SCHACH.startSeitenVon(kaputt, "weiss").join(","), "unten",
        "eine unbekannte Seite zaehlt nicht");
});

pruefe("Ohne gemerkte Seiten antworten die Bauern (v0.72)", () => {
    /*
     * Der Rueckfall fuer Kreuz-Partien aus v0.65 bis v0.71: Dort steht die
     * Startseite je BAUER im Stand, aber noch nicht je Farbe.
     */
    const stand = SCHACH.standNormalisieren({
        brett: brettAus({ "e1": "K", "e8": "k", "b2": "B", "g7": "b" }),
        amZug: "weiss",
        bauernSeiten: [
            { feld: SCHACH.feldNummer("b2"), seite: "links" },
            { feld: SCHACH.feldNummer("g7"), seite: "rechts" }
        ]
    });

    gleich(SCHACH.startSeitenVon(stand, "weiss").join(","), "links", "Weiss vom Bauern");
    gleich(SCHACH.startSeitenVon(stand, "schwarz").join(","), "rechts", "Schwarz vom Bauern");
});

/* ------------------------------------------------------------------ *
 * Ein Zug darf kein Feld des Standes verlieren (seit v0.98)
 * ------------------------------------------------------------------ */

pruefe("Ein Zug verliert KEIN Feld des Standes (v0.98)", () => {
    /*
     * DER TEST, DER SICH NIE PFLEGEN LAESST — und genau das ist der Punkt.
     *
     * `SCHACH._ausfuehren` baut den neuen Stand als Objekt-LITERAL, nicht als
     * Kopie des alten. Wer dort ein Feld vergisst, verliert es bei jedem Zug
     * still. Genau das war jahrelang der Fall: `enttarntFarbe`/`enttarntBis`
     * (die Faehigkeit hielt keinen einzigen Halbzug statt sechs — Meldung #36)
     * und `startSeiten` (die Ansicht auf dem Kreuz fiel auf die Bauern
     * zurueck, obwohl v0.72 genau das verhindern sollte).
     *
     * Dieser Test nennt kein einziges Feld beim Namen: Er vergleicht die
     * Schluessel eines frischen Standes mit denen nach einem Zug. Wer ein
     * neues Feld ergaenzt und die Zeile in `_ausfuehren` vergisst, faellt hier
     * auf — ohne dass jemand den Test nachziehen muesste.
     */
    const stand = standAus({ "e1": "K", "e8": "k", "e2": "B" }, "weiss");
    const ergebnis = SCHACH.ziehen(stand, SCHACH.feldNummer("e2"),
        SCHACH.feldNummer("e3"));

    wahr(ergebnis !== null, "der Zug geht");

    const fehlen = Object.keys(stand)
        .filter((schluessel) => !(schluessel in ergebnis.stand));

    gleich(fehlen.join(", "), "", "kein Feld faellt beim Ziehen weg");
});

pruefe("Enttarnen und Verstecken ueberleben den naechsten Zug (v0.98)", () => {
    /*
     * MELDUNG #36, die gemessene Haelfte: „Enttarnen ist sofort verschwunden
     * nach dem Einsammeln und Zugwechsel." Die Wirkung laeuft nach dem
     * Zugzaehler ab und muss deshalb ueber die Zuege hinweg stehen bleiben —
     * wie das volle Glas, neben dem sie im Stand steht.
     */
    const stand = standAus({ "e1": "K", "e8": "k", "e2": "B" }, "weiss", {
        enttarntFarbe: "weiss",
        enttarntBis: 6,
        verstecktFarbe: "schwarz",
        verstecktBis: 6,
        glasFarbe: "schwarz",
        glasBis: 4
    });

    const ergebnis = SCHACH.ziehen(stand, SCHACH.feldNummer("e2"),
        SCHACH.feldNummer("e3"));

    gleich(ergebnis.stand.enttarntFarbe, "weiss", "Enttarnen bleibt");
    gleich(ergebnis.stand.enttarntBis, 6, "und behaelt seine Frist");
    gleich(ergebnis.stand.verstecktFarbe, "schwarz", "Verstecken bleibt");
    gleich(ergebnis.stand.verstecktBis, 6, "und behaelt seine Frist");
    gleich(ergebnis.stand.glasFarbe, "schwarz", "das Glas ebenso");
});

pruefe("Die Startseiten ueberstehen jeden Zug (v0.72, gefunden v0.98)", () => {
    /*
     * `startSeiten` steht seit v0.72 im Stand, damit sich die Ansicht NICHT
     * dreht, wenn der letzte Bauer einer Seite faellt. Die Zusage galt nur bis
     * zum ersten Zug: Danach war der Eintrag weg und `startSeitenVon` fiel auf
     * seinen zweiten Weg zurueck, die Bauern.
     */
    const stand = standAus({ "e1": "K", "e8": "k", "e2": "B" }, "weiss", {
        startSeiten: { weiss: ["links"], schwarz: ["rechts"] }
    });

    const ergebnis = SCHACH.ziehen(stand, SCHACH.feldNummer("e2"),
        SCHACH.feldNummer("e3"));

    gleich(SCHACH.startSeitenVon(ergebnis.stand, "weiss").join(","), "links",
        "Weiss behaelt seine Startseite");
    gleich(SCHACH.startSeitenVon(ergebnis.stand, "schwarz").join(","), "rechts",
        "Schwarz behaelt seine Startseite");
});

/* ------------------------------------------------------------------ *
 * Der Doppelschritt gehoert dem Bauern, nicht der Reihe (v0.98, #37/#38)
 * ------------------------------------------------------------------ */

pruefe("Ein geschobener Bauer behaelt seinen Doppelschritt (#38, v0.98)", () => {
    /*
     * WUNSCH #38: „Bauernschub und Verschieben sollen nicht den ersten Zug des
     * Bauern beeinflussen." Wer geschoben wurde, hat sich nicht selbst bewegt.
     */
    const stand = standAus({ "e1": "K", "e8": "k", "b2": "B" }, "weiss");

    wahr(SCHACH.bauernDarfDoppelt(stand, SCHACH.feldNummer("b2"), "weiss"),
        "auf der Startreihe darf er");

    /* Ein Schub nach b3 — kein Zug, nur eine Bewegung. */
    const geschoben = SCHACH.figurMarkenVerschieben(
        SCHACH.standNormalisieren(Object.assign({}, stand, {
            brett: brettAus({ "e1": "K", "e8": "k", "b3": "B" })
        })),
        [{ von: SCHACH.feldNummer("b2"), nach: SCHACH.feldNummer("b3") }]);

    wahr(SCHACH.bauernDarfDoppelt(geschoben, SCHACH.feldNummer("b3"), "weiss"),
        "nach dem Schub darf er immer noch");
    gleich(ziele(geschoben, "b3"), "b4,b5", "und zwar wirklich zwei Felder weit");
});

pruefe("Ein Bauer springt nie zweimal (#37, v0.98)", () => {
    /*
     * WUNSCH #37: „Ein Bauer soll nie zweimal springen duerfen, nur beim
     * ersten Mal Bewegen." Bis v0.97 hing das an der REIHE — wer
     * zurueckgeschoben wurde, bekam den Doppelschritt ein zweites Mal.
     */
    const stand = standAus({ "e1": "K", "e8": "k", "b2": "B" }, "weiss");

    const gezogen = SCHACH.ziehen(stand, SCHACH.feldNummer("b2"),
        SCHACH.feldNummer("b3")).stand;

    wahr(!SCHACH.bauernDarfDoppelt(gezogen, SCHACH.feldNummer("b3"), "weiss"),
        "nach dem eigenen Zug ist der Doppelschritt weg");

    /* Jetzt schiebt ihn etwas auf seine Startreihe zurueck. `amZug` wird dabei
       auf Weiss zurueckgesetzt: Nach dem Zug ist Schwarz dran, und wir wollen
       die Zuege des weissen Bauern sehen. */
    const zurueck = SCHACH.figurMarkenVerschieben(
        Object.assign({}, gezogen, {
            brett: brettAus({ "e1": "K", "e8": "k", "b2": "B" }),
            amZug: "weiss"
        }),
        [{ von: SCHACH.feldNummer("b3"), nach: SCHACH.feldNummer("b2") }]);

    wahr(!SCHACH.bauernDarfDoppelt(zurueck, SCHACH.feldNummer("b2"), "weiss"),
        "und er bekommt ihn auch auf der Startreihe nicht zurueck");
    gleich(ziele(zurueck, "b2"), "b3", "nur noch ein Feld");
});

pruefe("Der Doppelschritt ueberlebt das Speichern und Laden (v0.98)", () => {
    /*
     * Der Datenvertrag: Die Liste reist im Stand mit, und `bauernZugFassung`
     * sagt, dass dieser Stand schon nach ihr rechnet. Ohne die Fassung wuerde
     * `standNormalisieren` sie bei jedem Laden aus der Reihen-Regel neu bauen
     * — und der geschobene Bauer verloere seinen Doppelschritt doch wieder.
     */
    const stand = standAus({ "e1": "K", "e8": "k", "b2": "B" }, "weiss");
    const gezogen = SCHACH.ziehen(stand, SCHACH.feldNummer("b2"),
        SCHACH.feldNummer("b4")).stand;

    const geladen = SCHACH.standNormalisieren(JSON.parse(JSON.stringify(gezogen)));

    gleich(geladen.bauernZugFassung, 1, "die Fassung reist mit");
    wahr(!SCHACH.bauernDarfDoppelt(geladen, SCHACH.feldNummer("b4"), "weiss"),
        "und der Bauer bleibt bei seinem einen Doppelschritt");

    /* Zweimal Normalisieren aendert nichts mehr. */
    const nochmal = SCHACH.standNormalisieren(geladen);
    gleich(nochmal.bauernZog.join(","), geladen.bauernZog.join(","),
        "Normalisieren ist stabil");
});

pruefe("Eine Partie von vor v0.98 rechnet im Umstieg wie vorher (v0.98)", () => {
    /*
     * DER UMSTIEG, wie bei `bonusFassung`: Ein Stand ohne Fassung bekommt die
     * Liste EINMAL aus der alten Reihen-Regel. Im Moment des Umstiegs muss
     * jede Antwort dieselbe sein wie vorher — sonst aendert sich eine laufende
     * Partie unter der Hand.
     */
    const roh = {
        brett: brettAus({ "e1": "K", "e8": "k", "b2": "B", "c4": "B", "g7": "b" }),
        amZug: "weiss"
    };

    const stand = SCHACH.standNormalisieren(roh);

    gleich(stand.bauernZugFassung, 1, "die Fassung wird gesetzt");
    wahr(SCHACH.bauernDarfDoppelt(stand, SCHACH.feldNummer("b2"), "weiss"),
        "b2 steht auf der Startreihe und darf");
    wahr(!SCHACH.bauernDarfDoppelt(stand, SCHACH.feldNummer("c4"), "weiss"),
        "c4 steht mittendrin und darf nicht");
    wahr(SCHACH.bauernDarfDoppelt(stand, SCHACH.feldNummer("g7"), "schwarz"),
        "g7 ist die schwarze Startreihe");
});

/* ------------------------------------------------------------------ *
 * Der Teleport hat keinen Weg (v0.98, Wunsch #35)
 * ------------------------------------------------------------------ */

pruefe("Ein Teleport hat weder Linie noch Weg (#35, v0.98)", () => {
    /*
     * WUNSCH #35: „Bei Teleport soll keine Linie gezeigt werden, nur der
     * Startpunkt und der Zielort werden markiert."
     *
     * Der Wunsch betraf die ANZEIGE — dahinter steckte aber eine Regel: Ein
     * Teleport zwei Felder GERADEAUS sah fuer `wegFelder` aus wie ein
     * gewoehnlicher Zug. Das Brett zog eine Linie durch das Feld dazwischen,
     * und die Figur sammelte dort auch noch eine Lootbox ein. Beides kommt
     * jetzt aus derselben Angabe.
     */
    const stand = standAus({ "e1": "K", "e8": "k", "d4": "T" }, "weiss", {
        zusatzFarbe: "weiss",
        zusatzMuster: "umkreis2",
        zusatzNurDieses: true
    });

    const von = SCHACH.feldNummer("d4");
    const nach = SCHACH.feldNummer("d6");
    const zug = SCHACH.zuege(stand, von).find((eintrag) => eintrag.nach === nach);

    wahr(!!zug, "der Teleport zwei Felder geradeaus ist moeglich");
    gleich(zug.ohneWeg, true, "und er ist als Zug ohne Weg gekennzeichnet");

    gleich(SCHACH.wegFelder(stand, von, nach, zug.ohneWeg).length, 2,
        "gezeichnet werden nur Start und Ziel");
    gleich(SCHACH.betreteneFelder(stand, von, nach, zug.ohneWeg).join(","),
        String(nach), "betreten wird nur das Zielfeld");

    /* Ohne die Angabe rechnet dieselbe Strecke weiter wie bisher — der
       Parameter ist wahlfrei, jeder Aufruf von frueher gilt unveraendert. */
    gleich(SCHACH.wegFelder(stand, von, nach).length, 3,
        "ohne die Angabe bleibt es die gerade Strecke");
});

/* ------------------------------------------------------------------ *
 * Status-Marken haengen an der Figur (v0.102)
 * ------------------------------------------------------------------ */

pruefe("Schild und Fessel wandern mit der geschobenen Figur (v0.102)", () => {
    /*
     * NUTZER-ANSAGE 20.08.: „Alle Status-Items sind an die Figur gebunden, also
     * Fessel und Schild — wenn die Figur durch Nudelholz oder Bauernschub
     * bewegt wird, soll es auf der Figur bleiben."
     *
     * Bis v0.101 stand im Stand nur eine FELDNUMMER, und die blieb liegen. Wer
     * eine geschuetzte Figur schob, liess ihr Schild auf dem leeren Feld
     * zurueck; wer eine gefesselte schob, machte sie frei und fesselte
     * stattdessen das, was danach auf dem alten Feld stand.
     */
    const vorher = standAus(
        { "e1": "K", "e8": "k", "b2": "B", "d4": "L", "g5": "t" }, "weiss", {
            schildFeld: SCHACH.feldNummer("d4"),
            schildFarbe: "weiss",
            fesselFeld: SCHACH.feldNummer("g5"),
            fesselFarbe: "weiss",
            fesselBis: 20
        });

    /* Beide Figuren werden geschoben, ohne dass ein Zug stattfindet. */
    const geschoben = SCHACH.figurMarkenVerschieben(
        SCHACH.standNormalisieren(Object.assign({}, vorher, {
            brett: brettAus({ "e1": "K", "e8": "k", "b2": "B", "d5": "L", "g6": "t" }),
            schildFeld: SCHACH.feldNummer("d4"),
            schildFarbe: "weiss",
            fesselFeld: SCHACH.feldNummer("g5"),
            fesselFarbe: "weiss",
            fesselBis: 20
        })),
        [
            { von: SCHACH.feldNummer("d4"), nach: SCHACH.feldNummer("d5") },
            { von: SCHACH.feldNummer("g5"), nach: SCHACH.feldNummer("g6") }
        ]);

    gleich(geschoben.schildFeld, SCHACH.feldNummer("d5"),
        "das Schild zieht mit dem Laeufer mit");
    gleich(geschoben.schildFarbe, "weiss", "und behaelt seine Seite");

    gleich(geschoben.fesselFeld, SCHACH.feldNummer("g6"),
        "die Fessel bleibt an der gefesselten Figur");
    gleich(geschoben.fesselBis, 20, "und behaelt ihre Frist");

    /* Und das alte Feld traegt nichts mehr — sonst erbte es die naechste
       Figur, die dort hinzieht. */
    wahr(!SCHACH.gefesselt(geschoben, SCHACH.feldNummer("g5")),
        "auf dem alten Feld ist keine Fessel mehr");
});

pruefe("Wo keine Figur mehr steht, faellt die Marke weg (v0.102)", () => {
    /*
     * Ein Erdbeben kann die geschuetzte Figur auch vom Brett nehmen. Bliebe die
     * Marke liegen, zeichnete das Brett einen Ring um ein leeres Feld — und die
     * naechste Figur, die dort hinzieht, waere ploetzlich geschuetzt.
     */
    const stand = SCHACH.standNormalisieren(standAus(
        { "e1": "K", "e8": "k", "d4": "L" }, "weiss", {
            schildFeld: SCHACH.feldNummer("d4"),
            schildFarbe: "weiss"
        }));

    /* Der Laeufer verschwindet, und ein Weg fuehrt ins Leere. */
    const ohne = SCHACH.figurMarkenVerschieben(
        Object.assign({}, stand, {
            brett: brettAus({ "e1": "K", "e8": "k" })
        }),
        [{ von: SCHACH.feldNummer("d4"), nach: SCHACH.feldNummer("d5") }]);

    gleich(ohne.schildFeld, -1, "das Schild ist weg");
    gleich(ohne.schildFarbe, "", "und seine Seite auch");
});

pruefe("Ein eigener ZUG verbraucht das Schild weiterhin (v3.3, geprueft v0.102)", () => {
    /*
     * DIE GRENZE, auf die es ankommt: Geschoben zu werden ist kein Zug. Zieht
     * die geschuetzte Figur selbst, verfaellt ihr Schild wie seit jeher —
     * sonst waere aus der neuen Regel versehentlich ein dauerhafter Schutz
     * geworden.
     */
    const stand = standAus({ "e1": "K", "e8": "k", "d4": "L" }, "weiss", {
        schildFeld: SCHACH.feldNummer("d4"),
        schildFarbe: "weiss"
    });

    /* Ein Laeufer zieht schraeg — d4 nach e5. */
    const gezogen = SCHACH.ziehen(stand, SCHACH.feldNummer("d4"),
        SCHACH.feldNummer("e5"));

    wahr(gezogen !== null, "der Zug geht");
    gleich(gezogen.stand.schildFeld, -1,
        "wer selbst zieht, nimmt sein Schild nicht mit");
});

/* ------------------------------------------------------------------ *
 * Ergebnis
 * ------------------------------------------------------------------ */

console.log(anzahlOk + " ok, " + anzahlFehler + " Fehler");
process.exit(anzahlFehler === 0 ? 0 : 1);
