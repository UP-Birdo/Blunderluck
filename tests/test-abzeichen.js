/*
 * test-abzeichen.js — die fünf Abzeichen (seit v0.151.12, gemeinsamer Baustein js\upcrew-abzeichen.js;
 * Nutzer 27.09.2026: „es fehlen die Abzeichen, die sollen kopiert werden“).
 *
 * Geprüft: Stufen und „nach oben offen“, die Werte über ALLE Zweige, und — wenn der Typoluck-Ordner daneben
 * liegt — dass Blunderluck für denselben Fortschritt GENAU dieselben Abzeichen zeigt wie Typoluck
 * (Typoluck wird dafür nur gelesen). Dazu die Einbindung (Profil, Sammlung, index.html, sw.js).
 *
 * Aufruf: siehe tests\README.md
 */

const fs = require("fs");
const pfad = require("path");

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
    if (JSON.stringify(ist) !== JSON.stringify(soll)) {
        throw new Error(was + ": ist " + JSON.stringify(ist) + ", soll " + JSON.stringify(soll));
    }
}

function wahr(bedingung, was) {
    if (!bedingung) {
        throw new Error(was);
    }
}

const projekt = pfad.join(__dirname, "..");
const lesen = (name) => fs.readFileSync(pfad.join(projekt, name), "utf8");
const AZ = require(pfad.join(projekt, "js", "upcrew-abzeichen.js"));
const FORTSCHRITT = require(pfad.join(__dirname, "fortschritt-laden.js"));

/* Ein Stand mit beiden Spielen: Blunderluck ohne Zähler (Tage, Turm), Typoluck mit Zählern. */
const STAND = {
    version: 1,
    spiele: {
        blunderluck: {
            xp: 900, partien: 42, stand: 5, gezaehlt: [],
            tage: ["2026-09-20", "2026-09-21", "2026-09-25", "2026-09-26", "2026-09-27"],
            turm: { figuren: { "1-1": 3, "1-2": 2, "2-1": 1 } }
        },
        typoluck: {
            xp: 1200, partien: 70, stand: 6, gezaehlt: [],
            tage: ["2026-09-21", "2026-09-26", "2026-09-27"],
            zaehler: { besteSerie: 9, beideTage: 2, figuren: 25, tagesaufgaben: 12 }
        }
    }
};

pruefe("Werte über alle Zweige", () => {
    const w = AZ.werte(STAND, 3);
    gleich(w.partien, 112, "Partien");
    gleich(w.besteSerie, 9, "beste Serie (Zähler schlägt laufende)");
    gleich(w.beideTage, 3, "beide Spiele: gemeinsame Tage schlagen den Zähler");
    gleich(w.figuren, 31, "Figuren: Zähler + Turm");
    gleich(w.tagesaufgaben, 17, "Tagesaufgaben: Zähler bzw. Tage");
    gleich(AZ.werte(null, 0).partien, 0, "leer");
});

pruefe("Stufen und nach oben offen", () => {
    const liste = AZ.liste(STAND, 0);
    gleich(liste.map((e) => e.id), ["partien", "besteSerie", "beideTage", "figuren", "tagesaufgaben"], "Reihenfolge");
    const partien = liste[0];
    gleich([partien.erreicht, partien.naechste], [3, 250], "112 Partien");
    const offen = AZ.liste({ spiele: { a: { partien: 2100 } } }, 0)[0];
    gleich([offen.erreicht, offen.naechste], [8, 2500], "über 1000 in 500er-Schritten");
});

pruefe("Kachel und Blatt: Punkte je Stufe, +n, Wert und Stufen", () => {
    const elemente = [];
    const el = (tag) => {
        const e = { tag, kinder: [], className: "", textContent: "", attribute: {},
            appendChild(k) { this.kinder.push(k); return k; }, setAttribute(n, w) { this.attribute[n] = w; },
            addEventListener() {} };
        elemente.push(e);
        return e;
    };
    global.document = { createElement: el, createElementNS: (ns, tag) => el(tag) };
    try {
        const eintrag = AZ.liste({ spiele: { a: { partien: 2100 } } }, 0)[0];
        const k = AZ.kachel(eintrag, () => {});
        gleich(k.className, "up-az up-az-an", "an");
        const punkte = k.kinder[1];
        gleich(punkte.kinder.filter((i) => i.className === "an").length, 6, "sechs goldene Punkte");
        gleich(punkte.kinder[punkte.kinder.length - 1].textContent, "+2", "zwei Extra-Stufen");
        gleich(k.kinder[2].textContent, "Partien", "Kurzname");
        const b = AZ.blatt(eintrag);
        gleich(b.kinder[0].kinder[0].textContent, "2100", "Wert");
        gleich(b.kinder[1].kinder[b.kinder[1].kinder.length - 1].textContent, "+500 …", "weiter");
        const aus = AZ.kachel(AZ.liste(null, 0)[0], null);
        gleich(aus.className, "up-az", "ohne Stufe blass");
    } finally {
        delete global.document;
    }
});

pruefe("Dieselben Abzeichen wie Typoluck (nur gelesen, wenn vorhanden)", () => {
    const typoPfad = pfad.join(projekt, "..", "Typoluck", "js", "fortschritt.js");
    if (!fs.existsSync(typoPfad)) {
        return;
    }
    const TYPO = require(typoPfad);
    for (const datum of ["2026-09-27", "2026-09-28", "2026-10-15"]) {
        const laufendTypo = TYPO.serieHeute(STAND, datum).tage;
        const sauber = FORTSCHRITT.normalisieren(STAND);
        const laufendBlunder = FORTSCHRITT.serie(sauber, datum,
            FORTSCHRITT.schutzVerdient(FORTSCHRITT.level(sauber).level)).tage;
        gleich(laufendBlunder, laufendTypo, "laufende Serie " + datum);
        const soll = TYPO.abzeichen(STAND, datum).map((e) => [e.id, e.wert, e.erreicht, e.naechste]);
        const ist = AZ.liste(sauber, laufendBlunder).map((e) => [e.id, e.wert, e.erreicht, e.naechste]);
        gleich(ist, soll, "Abzeichen " + datum);
        /* Bis Typoluck 0.15.8 hatte Typoluck eine eigene Tabelle; seit
           0.15.9 rechnet es mit demselben Baustein (dann fehlt sie). */
        if (Array.isArray(TYPO.ABZEICHEN)) {
            gleich(AZ.ABZEICHEN.map((a) => [a.id, a.titel, a.kurz, a.stufen, a.weiter, a.einheit]),
                TYPO.ABZEICHEN.map((a) => [a.id, a.titel, a.kurz, a.stufen, a.weiter, a.einheit]), "Tabelle");
        }
    }
});

pruefe("Eingebunden: Profil, Sammlung, index.html, sw.js", () => {
    const rangliste = lesen("js/rangliste.js");
    wahr(/_fortschrittsAbzeichenBauen\(/.test(rangliste) && /UPCREW_ABZEICHEN\.liste\(/.test(rangliste), "Profil");
    wahr(/UPCREW_SAMMLUNG\.abzeichenTeil\(/.test(lesen("js/sammlung.js")), "Sammlung");
    wahr(/function abzeichenTeil\(/.test(lesen("js/upcrew-sammlung.js")), "Gruppe im Sammlungs-Baustein");
    const index = lesen("index.html");
    wahr(index.indexOf("js/upcrew-abzeichen.js") !== -1
        && index.indexOf("js/upcrew-abzeichen.js") < index.indexOf("js/upcrew-sammlung.js"), "JS-Reihenfolge");
    wahr(index.indexOf("css/upcrew-abzeichen.css") !== -1, "CSS");
    const sw = lesen("sw.js");
    wahr(sw.indexOf("\"./js/upcrew-abzeichen.js\"") !== -1 && sw.indexOf("\"./css/upcrew-abzeichen.css\"") !== -1, "offline");
});

console.log(anzahlOk + " ok, " + anzahlFehler + " Fehler");
process.exit(anzahlFehler === 0 ? 0 : 1);
