/*
 * test-wertung.js — Regressionstests für die Wertung der Turm-Partien
 * (seit v0.148.0, js\wertung.js): Formeln, Klassen, die Suche an echten
 * Stellungen (hängende Dame, Matt in eins), Glück statt Wertung, Speicher.
 *
 * Geprüft werden die ECHTEN Dateien.
 *
 * Aufruf: siehe tests\README.md
 */

const pfad = require("path");

globalThis.SCHACH_VARIANTEN = require(pfad.join(__dirname, "..", "js", "schach-varianten.js"));
globalThis.SCHACH = require(pfad.join(__dirname, "..", "js", "schach.js"));
globalThis.SCHACH_RUNDE = require(pfad.join(__dirname, "..", "js", "schach-runde.js"));
require(pfad.join(__dirname, "..", "js", "schach-runde-faehigkeiten.js"));
globalThis.SCHACH_BOT = require(pfad.join(__dirname, "..", "js", "schach-bot.js"));
const WERTUNG = require(pfad.join(__dirname, "..", "js", "wertung.js"));

const SCHACH = globalThis.SCHACH;

const speicher = {};
globalThis.localStorage = {
    getItem: (k) => (k in speicher ? speicher[k] : null),
    setItem: (k, v) => { speicher[k] = String(v); }
};

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

/* Eine Stellung aus 8 Zeilen (Weiss gross, Schwarz klein; "." leer) —
   im Zeichensatz des Modells (B S L T D K). */
function brett(zeilen, amZug) {
    const stand = SCHACH.neuerStand("standard");
    const text = zeilen.join("");
    /* Das Brett ist im Modell je nach Fassung Text oder Liste — dieselbe
       Form wie die Aufstellung übernehmen. */
    stand.brett = (typeof stand.brett === "string") ? text : text.split("");
    stand.amZug = amZug || "weiss";
    stand.rochade = "";
    stand.rochadeFelder = [];
    stand.rochadeKoenige = [];
    return stand;
}

function zugVon(stand, von, nach) {
    return SCHACH.alleZuege(stand).find((zug) => zug.von === von && zug.nach === nach);
}

/* ------------------------------------------------------------------ *
 * Formeln und Klassen
 * ------------------------------------------------------------------ */

pruefe("Verlust in Hundertstel-Bauern, beide Werte auf den Deckel begrenzt", () => {
    gleich(WERTUNG.verlustAus(100, 100), 0, "gleich gut");
    gleich(WERTUNG.verlustAus(300, 0), 300, "Läufer verschenkt");
    gleich(WERTUNG.verlustAus(0, 50), 0, "besser als „bester“: kein Verlust");
    gleich(WERTUNG.verlustAus(WERTUNG.MATT, 900), WERTUNG.DECKEL - 900, "Matt ausgelassen: begrenzt");
});

pruefe("Genauigkeit: kein Verlust = 100, ein Bauer deutlich weniger, eine Figur fast 0", () => {
    gleich(Math.round(WERTUNG.genauigkeitAus(0)), 100, "0 Verlust");
    const bauer = WERTUNG.genauigkeitAus(100);
    wahr(bauer > 20 && bauer < 40, "ein Bauer ~ 29: " + bauer);
    wahr(WERTUNG.genauigkeitAus(300) < 3, "eine Figur");
});

pruefe("Entschiedene Stellung: kein echter Wahlzug, wird nicht gewertet", () => {
    gleich(WERTUNG.entschieden(-5000, -2000), true, "längst verloren");
    gleich(WERTUNG.entschieden(5000, 1600), true, "längst gewonnen");
    gleich(WERTUNG.entschieden(5000, 300), false, "Gewinn verspielt: zählt");
    gleich(WERTUNG.entschieden(100, 50), false, "offen");
    gleich(WERTUNG.entschieden(WERTUNG.MATT - 1, WERTUNG.MATT - 1), false, "Matt auf dem Brett: zählt");
});

pruefe("Klassen nach dem Verlust; Brillant nur als Opfer", () => {
    gleich(WERTUNG.klasseAus(0, false), "stark", "bester Zug");
    gleich(WERTUNG.klasseAus(10, true), "brillant", "bestes Opfer");
    gleich(WERTUNG.klasseAus(30, true), "gut", "Opfer mit Verlust ist nicht brillant");
    gleich(WERTUNG.klasseAus(60), "ungenau", "60");
    gleich(WERTUNG.klasseAus(150), "fehler", "150");
    gleich(WERTUNG.klasseAus(400), "blunder", "400");
});

/* ------------------------------------------------------------------ *
 * An echten Stellungen
 * ------------------------------------------------------------------ */

/* Weisse Dame e4 hängt am schwarzen Turm e8 nicht — aber sie kann den
   ungedeckten Turm a8 schlagen oder sich einstellen. */
const offen = brett([
    "t...k...",
    "........",
    "........",
    "........",
    "....D...",
    "........",
    "........",
    "....K..."
]);

pruefe("Der beste Zug (freien Turm schlagen) ist stark, Dame einstellen ein Blunder", () => {
    const schlagen = WERTUNG.zugWerten(offen, zugVon(offen, 36, 0));
    wahr(schlagen && (schlagen.klasse === "stark" || schlagen.klasse === "brillant"),
        "Turm schlagen: " + (schlagen && schlagen.klasse));
    wahr(schlagen.genauigkeit >= 95, "Genauigkeit " + schlagen.genauigkeit);
    /* Dame nach e7 — dort nimmt der König sie (e8 steht daneben). */
    const einstellen = WERTUNG.zugWerten(offen, zugVon(offen, 36, 12));
    gleich(einstellen.klasse, "blunder", "Dame einstellen");
    wahr(einstellen.genauigkeit < 20, "Genauigkeit " + einstellen.genauigkeit);
});

/* Matt in eins: Turm a1 nach a8, schwarzer König h8 hinter eigenen Bauern. */
const matt = brett([
    ".......k",
    "......bb",
    "........",
    "........",
    "........",
    "........",
    "........",
    "T.....K."
]);

pruefe("Matt in eins wird erkannt: der Mattzug ist stark, ein stiller Zug ein Fehler oder schlimmer", () => {
    const mattzug = WERTUNG.zugWerten(matt, zugVon(matt, 56, 0));
    wahr(mattzug.klasse === "stark" || mattzug.klasse === "brillant", "Mattzug: " + mattzug.klasse);
    const still = WERTUNG.zugWerten(matt, zugVon(matt, 62, 61));
    wahr(["fehler", "blunder"].indexOf(still.klasse) !== -1, "stiller Zug: " + still.klasse);
});

pruefe("Ein erzwungener Zug (nur einer möglich) wird nicht gewertet", () => {
    /* Schwarzer König h8 eingesperrt (g8/g7 deckt der weisse König f8,
       der Bauer h7 ist blockiert) — einzig der Bauer a5 kann ziehen. */
    const erzwungen = brett([
        ".....K.k",
        ".......b",
        ".......B",
        "b.......",
        "........",
        "........",
        "........",
        "........"
    ], "schwarz");
    const zuege = SCHACH.alleZuege(erzwungen);
    gleich(zuege.length, 1, "nur ein Zug");
    gleich(WERTUNG.zugWerten(erzwungen, zuege[0]), null, "nicht gewertet");
});

/* ------------------------------------------------------------------ *
 * In der Partie: Glück, Speicher, Zusammenfassung
 * ------------------------------------------------------------------ */

function partie(id, zaehler, bonusFelder) {
    return {
        id: id,
        zugZaehler: zaehler,
        stand: offen,
        bonus: (bonusFelder || []).map((feld) => ({ feld: feld, art: "sprung" })),
        regeln: { turm: { ort: 1, stufe: 0 } }
    };
}

pruefe("Ein Zug über eine Lootbox zählt als Glück, nicht als Wertung", () => {
    const eintrag = WERTUNG.zugMerken(partie("p-g", 1, [0]), "weiss", 36, 0, "D");
    gleich(eintrag.glueck, 1, "eine Lootbox");
    const z = WERTUNG.zusammenfassung("p-g", "weiss");
    gleich(z.glueck, 1, "Glück");
    gleich(z.gewertet, 0, "nichts gewertet");
    gleich(z.genauigkeit, undefined, "keine Genauigkeit");
});

pruefe("Genauigkeit erst ab vier gewerteten Zügen, dann der Durchschnitt", () => {
    for (let i = 1; i <= 3; i++) {
        WERTUNG.zugMerken(partie("p-w", i), "weiss", 36, 0, "D");
    }
    gleich(WERTUNG.zusammenfassung("p-w", "weiss").genauigkeit, undefined, "drei Züge reichen nicht");
    WERTUNG.zugMerken(partie("p-w", 4), "weiss", 36, 12, "D");
    const z = WERTUNG.zusammenfassung("p-w", "weiss");
    gleich(z.gewertet, 4, "vier gewertet");
    wahr(z.genauigkeit > 50 && z.genauigkeit < 90, "Durchschnitt aus drei guten und einem Blunder: " + z.genauigkeit);
    gleich(z.klassen.blunder, 1, "ein Blunder");
    gleich(WERTUNG.genauigkeitVon({ id: "p-w" }, "weiss"), z.genauigkeit, "genauigkeitVon");
    gleich(WERTUNG.zusammenfassung("p-w", "schwarz").gewertet, 0, "andere Seite: nichts");
});

pruefe("Derselbe Zugzähler zweimal überschreibt nur; ohne Turm wird nichts gemerkt", () => {
    WERTUNG.zugMerken(partie("p-d", 7), "weiss", 36, 0, "D");
    WERTUNG.zugMerken(partie("p-d", 7), "weiss", 36, 0, "D");
    gleich(WERTUNG.zusammenfassung("p-d", "weiss").gewertet, 1, "einmal");
    const ohne = partie("p-o", 1);
    ohne.regeln = {};
    gleich(WERTUNG.zugMerken(ohne, "weiss", 36, 0, "D"), null, "keine Turm-Partie");
});

pruefe("Der Speicher behält nur die jüngsten Partien", () => {
    for (let i = 0; i < WERTUNG.MAX_PARTIEN + 3; i++) {
        WERTUNG.zugMerken(partie("p-s" + i, 1), "weiss", 36, 0, "D");
    }
    const alle = JSON.parse(speicher[WERTUNG.SCHLUESSEL]);
    gleich(Object.keys(alle).length, WERTUNG.MAX_PARTIEN, "Anzahl");
    wahr(("p-s" + (WERTUNG.MAX_PARTIEN + 2)) in alle, "die jüngste ist da");
});

/* ------------------------------------------------------------------ *
 * Der Web Worker (seit v0.151.0): lädt er die echten Dateien und
 * antwortet er wie `zugWerten`? Nachgebaut mit einem eigenen vm-Kontext,
 * in dem `importScripts` die Dateien aus js\ ausführt.
 * ------------------------------------------------------------------ */

pruefe("Der Worker lädt Regeln + Wertung und antwortet mit demselben Ergebnis", () => {
    const vm = require("vm");
    const fs = require("fs");
    const jsOrdner = pfad.join(__dirname, "..", "js");
    const antworten = [];
    const kontext = { console: console, Math: Math, JSON: JSON };
    kontext.self = kontext;
    kontext.postMessage = (daten) => antworten.push(daten);
    kontext.importScripts = (...namen) => {
        for (const name of namen) {
            vm.runInContext(fs.readFileSync(pfad.join(jsOrdner, name), "utf8"), kontext, { filename: name });
        }
    };
    vm.createContext(kontext);
    vm.runInContext(fs.readFileSync(pfad.join(jsOrdner, "wertung-rechner.js"), "utf8"), kontext,
        { filename: "wertung-rechner.js" });
    const zug = zugVon(offen, 36, 12);
    kontext.onmessage({ data: { nr: 7, brett: JSON.parse(JSON.stringify(offen)), zug: zug } });
    gleich(antworten.length, 1, "eine Antwort");
    gleich(antworten[0].nr, 7, "Nummer zurück");
    gleich(JSON.stringify(antworten[0].ergebnis), JSON.stringify(WERTUNG.zugWerten(offen, zug)), "gleiches Ergebnis");
    kontext.onmessage({ data: { nr: 8, brett: null, zug: null } });
    gleich(antworten[1].ergebnis, null, "Unsinn: null statt Absturz");
});

pruefe("Ohne Worker (Node, file://): im Hintergrund trotzdem gerechnet und gezählt", () => {
    gleich(typeof Worker, "undefined", "hier gibt es keinen Worker");
    const p = partie("p-h", 3);
    WERTUNG.zugMerkenImHintergrund(p, "weiss", 36, 12, "D");
    gleich(WERTUNG.rechnetNoch("p-h"), true, "rechnet noch");
    const gemeldet = [];
    WERTUNG.beiFertig((id) => gemeldet.push(id));
    /* Der Rückfall rechnet per setTimeout — hier von Hand anstossen. */
    for (const nr of Object.keys(WERTUNG._warten)) {
        WERTUNG._direktRechnen(WERTUNG._warten[nr], Number(nr));
    }
    gleich(WERTUNG.rechnetNoch("p-h"), false, "fertig");
    gleich(gemeldet.join(","), "p-h", "fertig gemeldet");
    gleich(WERTUNG.zusammenfassung("p-h", "weiss").klassen.blunder, 1, "gespeichert");
});

console.log(anzahlOk + " ok, " + anzahlFehler + " Fehler");
process.exit(anzahlFehler === 0 ? 0 : 1);
