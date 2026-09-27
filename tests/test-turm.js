/*
 * test-turm.js — Regressionstests für den Turm (seit v0.147.0, Runde 5):
 * die Tabelle und Rechnung in js\turm.js, die Turm-Angabe an der Partie
 * (js\schach-runde.js, js\schach-tafel.js), die Figuren im Fortschritt
 * (js\fortschritt.js) und die Freischaltung über Orte (js\freischaltung.js).
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
const SCHACH_TAFEL = require(pfad.join(__dirname, "..", "js", "schach-tafel.js"));
const TURM = require(pfad.join(__dirname, "..", "js", "turm.js"));
globalThis.TURM = TURM;
const FORTSCHRITT = require(pfad.join(__dirname, "..", "js", "fortschritt.js"));
globalThis.FORTSCHRITT = FORTSCHRITT;

const SCHACH_VARIANTEN = globalThis.SCHACH_VARIANTEN;
const SCHACH_RUNDE = globalThis.SCHACH_RUNDE;

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

/* ------------------------------------------------------------------ *
 * Die Tabelle
 * ------------------------------------------------------------------ */

pruefe("Sechs Orte mit 4, 5, 5, 6, 6, 6 Stufen, die Namen wie im Entwurf", () => {
    gleich(TURM.anzahlOrte(), 6, "Orte");
    gleich(TURM.ORTE.map((o) => o.stufen.length).join(","), "4,5,5,6,6,6", "Stufen je Ort");
    gleich(TURM.ORTE.map((o) => o.name).join(","),
        "Werkbank,Holzhalle,Marmorsaal,Nachtclub,Turniersaal,Meisterliga", "Namen");
});

pruefe("Jede Stufe ist spielbar: Spielart, Bob-Stufe, Lootbox-Menge und Seite gibt es", () => {
    const botStufen = ["leicht", "mittel", "schwer", "meister"];
    const mengen = SCHACH_VARIANTEN.LOOTBOX_MENGEN.map((m) => m.id);
    for (let nr = 1; nr <= TURM.anzahlOrte(); nr++) {
        TURM.ort(nr).stufen.forEach((_, i) => {
            const r = TURM.regelnFuer(nr, i);
            const wo = TURM.titel(nr, i);
            wahr(SCHACH_VARIANTEN.gibtEs(r.spielart), wo + ": Spielart " + r.spielart);
            wahr(!SCHACH_VARIANTEN.holen(r.spielart).versteckt, wo + ": Spielart versteckt");
            wahr(botStufen.indexOf(r.botStufe) !== -1, wo + ": Bob-Stufe " + r.botStufe);
            wahr(mengen.indexOf(r.lootboxMenge) !== -1, wo + ": Menge " + r.lootboxMenge);
            wahr(r.turmSeite === "weiss" || r.turmSeite === "schwarz", wo + ": Seite");
            gleich(r.gegenComputer, true, wo + ": gegen Bob");
            gleich(r.sichtbarkeit, "privat", wo + ": privat");
            gleich(r.turm.ort, nr, wo + ": Ort");
            gleich(r.turm.stufe, i, wo + ": Stufe");
        });
    }
});

pruefe("Gegner: jede Stufe hat Namen und Eigenheit, die letzte ist der Boss des Orts", () => {
    for (let nr = 1; nr <= TURM.anzahlOrte(); nr++) {
        const ort = TURM.ort(nr);
        ort.stufen.forEach((_, i) => {
            const g = TURM.gegner(nr, i);
            wahr(g.name && g.eigen, ort.name + " " + (i + 1) + ": Name und Eigenheit");
            gleich(g.boss, i === ort.stufen.length - 1, ort.name + " " + (i + 1) + ": Boss?");
        });
        gleich(TURM.gegner(nr, ort.stufen.length - 1).name, ort.bob, ort.name + ": der Boss ist der Bob des Orts");
    }
    gleich(TURM.gegner(1, 9), null, "keine Stufe 10");
});

pruefe("Schwellen steigen von Ort zu Ort, der König braucht mehr als der Springer", () => {
    let vorher = [0, 0];
    for (const ort of TURM.ORTE) {
        wahr(ort.schwelle[0] < ort.schwelle[1], ort.name + ": Springer < König");
        wahr(ort.schwelle[0] > vorher[0] && ort.schwelle[1] > vorher[1], ort.name + ": steigt");
        vorher = ort.schwelle;
    }
    /* Gegen Bob gemessen mit der geschärften Wertung (v0.151.0,
       entschieden.md): Zufall 26–40 %, Meister-Niveau 84–92 %. */
    gleich(TURM.ORTE[0].schwelle.join("/"), "60/80", "Werkbank");
    gleich(TURM.ORTE[5].schwelle.join("/"), "75/90", "Meisterliga");
});

/* ------------------------------------------------------------------ *
 * Offen, Boss, Tür, erreichter Ort
 * ------------------------------------------------------------------ */

pruefe("Am Anfang: Werkbank, nur Stufe 1 offen, Boss zu", () => {
    const leer = {};
    gleich(TURM.erreicht(leer), 1, "Ort");
    gleich(TURM.offen(leer, 1, 0), true, "Stufe 1");
    gleich(TURM.offen(leer, 1, 1), false, "Stufe 2");
    gleich(TURM.offen(leer, 1, 3), false, "Boss");
    gleich(TURM.offen(leer, 2, 0), false, "Holzhalle zu");
    gleich(TURM.naechste(leer, 1), 0, "nächste");
});

pruefe("Boss erst nach allen Gegnern; Tür und nächster Ort erst nach dem Boss", () => {
    const f = { "1-0": 1, "1-1": 2 };
    gleich(TURM.offen(f, 1, 2), true, "Stufe 3 nach Stufe 2");
    gleich(TURM.offen(f, 1, 3), false, "Boss noch zu (Stufe 3 fehlt)");
    f["1-2"] = 1;
    gleich(TURM.offen(f, 1, 3), true, "Boss offen");
    gleich(TURM.naechste(f, 1), 3, "nächste = Boss");
    gleich(TURM.tuerOffen(f, 1), false, "Tür zu");
    f["1-3"] = 1;
    gleich(TURM.tuerOffen(f, 1), true, "Tür auf");
    gleich(TURM.erreicht(f), 2, "Holzhalle erreicht");
    gleich(TURM.offen(f, 2, 0), true, "Holzhalle Stufe 1");
    gleich(TURM.offen(f, 1, 0), true, "Nachholen im alten Ort geht");
    gleich(TURM.summe(f, 1).hat, 5, "Summe");
    gleich(TURM.summe(f, 1).alle, 12, "höchstens");
});

pruefe("Oben angekommen: Ort 7, jede Tür offen", () => {
    const f = {};
    for (let nr = 1; nr <= 6; nr++) {
        TURM.ort(nr).stufen.forEach((_, i) => { f[TURM.schluessel(nr, i)] = 1; });
    }
    gleich(TURM.erreicht(f), 7, "über dem letzten Ort");
});

pruefe("Figuren: verloren 0, Sieg 1, mit Genauigkeit 2 und 3 nach den Schwellen des Orts", () => {
    gleich(TURM.figurenFuer(false, 1, 99), 0, "verloren");
    gleich(TURM.figurenFuer(true, 1), 1, "Sieg ohne Wertung = Bauer");
    gleich(TURM.figurenFuer(true, 1, 59), 1, "Werkbank 59 %");
    gleich(TURM.figurenFuer(true, 1, 60), 2, "Werkbank 60 %");
    gleich(TURM.figurenFuer(true, 1, 80), 3, "Werkbank 80 %");
    gleich(TURM.figurenFuer(true, 6, 89), 2, "Meisterliga 89 %");
    gleich(TURM.figurenFuer(true, 6, 90), 3, "Meisterliga 90 %");
});

/* ------------------------------------------------------------------ *
 * An der Partie
 * ------------------------------------------------------------------ */

pruefe("Die Partie trägt ihre Turm-Stufe durch Anlegen und Normalisieren", () => {
    const regeln = TURM.regelnFuer(2, 1);
    const ergebnis = SCHACH_TAFEL.partieAnlegen(SCHACH_TAFEL.leereTafel(), regeln.spielart,
        "Holzhalle · 2", 5000, regeln);
    gleich(ergebnis.partie.regeln.turm.ort, 2, "Ort angelegt");
    gleich(ergebnis.partie.regeln.turm.stufe, 1, "Stufe angelegt");
    gleich(ergebnis.partie.regeln.botStufe, "mittel", "Bob-Stufe der Holzhalle");
    gleich(ergebnis.partie.regeln.lootboxMenge, "normal", "Lootboxen der Holzhalle");
    const wieder = SCHACH_RUNDE.normalisieren(JSON.parse(JSON.stringify(ergebnis.partie)));
    gleich(wieder.regeln.turm.ort, 2, "Ort nach dem Normalisieren");
    gleich(SCHACH_RUNDE.normalisieren(SCHACH_RUNDE.leereRunde(1, "standard", "p", "x")).regeln.turm, null,
        "gewöhnliche Partie ohne Turm");
    gleich(SCHACH_RUNDE.turmAngabe({ ort: "2", stufe: 1 }), null, "Text statt Zahl");
    gleich(SCHACH_RUNDE.turmAngabe({ ort: 0, stufe: 1 }), null, "Ort 0");
});

/* ------------------------------------------------------------------ *
 * Im Fortschritt
 * ------------------------------------------------------------------ */

pruefe("Fortschritt: Sieg im Turm gibt Partie-XP und je neue Figur +10, die beste Wertung bleibt", () => {
    let stand = FORTSCHRITT.partieZaehlen(FORTSCHRITT.leer(), "p-1", 1, undefined,
        { schluessel: "1-0", figuren: 1 });
    gleich(FORTSCHRITT.gesamtXp(stand), 20, "10 Partie + 10 Figur");
    gleich(FORTSCHRITT.turmFiguren(stand)["1-0"], 1, "Figur gemerkt");
    stand = FORTSCHRITT.partieZaehlen(stand, "p-2", 2, undefined, { schluessel: "1-0", figuren: 3 });
    gleich(FORTSCHRITT.gesamtXp(stand), 50, "+10 Partie, +20 für zwei neue Figuren");
    stand = FORTSCHRITT.partieZaehlen(stand, "p-3", 3, undefined, { schluessel: "1-0", figuren: 1 });
    gleich(FORTSCHRITT.turmFiguren(stand)["1-0"], 3, "schlechtere Wertung ändert nichts");
    gleich(FORTSCHRITT.gesamtXp(stand), 60, "nur die Partie");
    stand = FORTSCHRITT.partieZaehlen(stand, "p-4", 4, undefined, { schluessel: "1-1", figuren: 0 });
    wahr(!("1-1" in FORTSCHRITT.turmFiguren(stand)), "verloren gibt keine Figur");
});

pruefe("Fortschritt: kaputte Turm-Einträge fliegen beim Normalisieren", () => {
    const stand = FORTSCHRITT.normalisieren({ spiele: { blunderluck: { xp: 5,
        turm: { figuren: { "1-0": 2, "x": 3, "2-1": 9, "3-0": -1, "4-0": "3" } } } } });
    const f = FORTSCHRITT.turmFiguren(stand);
    gleich(Object.keys(f).sort().join(","), "1-0,2-1", "nur gültige Schlüssel");
    gleich(f["2-1"], 3, "höchstens 3");
});

/* ------------------------------------------------------------------ *
 * Freischaltung über Orte
 * ------------------------------------------------------------------ */

pruefe("Freischaltung: 3D, Themen und Figuren je nach erreichtem Ort", () => {
    globalThis.location = { hostname: "up-birdo.github.io", search: "" };
    const FREISCHALTUNG = require(pfad.join(__dirname, "..", "js", "freischaltung.js"));
    let ort = 1;
    globalThis.FORTSCHRITT_KONTO = { turmOrt: () => ort, level: () => ({ level: 1 }) };
    try {
        gleich(FREISCHALTUNG.SPERRE_3D, true, "Sperre an");
        gleich(FREISCHALTUNG.arena(), 1, "Werkbank");
        gleich(FREISCHALTUNG.dreiDFrei(), false, "3D noch zu");
        gleich(FREISCHALTUNG.brettStueckFrei("thema", "blunderluck"), true, "Vorgabe immer frei");
        gleich(FREISCHALTUNG.brettStueckFrei("thema", "holz"), false, "Holz zu");
        ort = 2;
        gleich(FREISCHALTUNG.dreiDFrei(), true, "3D ab Holzhalle");
        gleich(FREISCHALTUNG.brettStueckFrei("thema", "holz"), true, "Holz ab Holzhalle");
        gleich(FREISCHALTUNG.brettStueckFrei("figuren", "matt"), true, "Matt ab Holzhalle");
        gleich(FREISCHALTUNG.brettStueckFrei("thema", "marmor"), false, "Marmor noch zu");
        ort = 5;
        gleich(FREISCHALTUNG.brettStueckFrei("thema", "turnier"), true, "Turnier ab Turniersaal");
    } finally {
        delete globalThis.FORTSCHRITT_KONTO;
    }
});

console.log(anzahlOk + " ok, " + anzahlFehler + " Fehler");
process.exit(anzahlFehler === 0 ? 0 : 1);
