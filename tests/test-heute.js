/*
 * test-heute.js — Regressionstests für „Heute" (seit v0.149.0, Runde 5):
 * das Tagesbrett (js\tagesbrett.js: Aufgabe je Datum, Ende nach N Zügen,
 * die Stellungen selbst), die Tagesaufgabe und die Serie im Fortschritt
 * (js\fortschritt.js) und die Angabe an der Partie (js\schach-runde.js,
 * js\schach-tafel.js).
 *
 * Die Stellungen prüft ein Löser bei JEDEM Lauf erneut: Matt in 1 und 2
 * vollständig (Lösungszug erzwingt das Matt, kein kürzeres Matt), Matt in 3
 * mit Lösungszug und ohne Matt in 1. Die volle Prüfung von Matt in 3 (kein
 * Matt in 2, eindeutiger erster Zug) lief beim Heraussuchen am 27.09.2026 —
 * sie dauert für die Testkette zu lange.
 *
 * Aufruf: siehe tests\README.md
 */

const pfad = require("path");

globalThis.SCHACH_VARIANTEN = require(pfad.join(__dirname, "..", "js", "schach-varianten.js"));
globalThis.SCHACH = require(pfad.join(__dirname, "..", "js", "schach.js"));
globalThis.SCHACH_RUNDE = require(pfad.join(__dirname, "..", "js", "schach-runde.js"));
require(pfad.join(__dirname, "..", "js", "schach-runde-faehigkeiten.js"));
const SCHACH_TAFEL = require(pfad.join(__dirname, "..", "js", "schach-tafel.js"));
const TAGESBRETT = require(pfad.join(__dirname, "..", "js", "tagesbrett.js"));
const FORTSCHRITT = require(pfad.join(__dirname, "..", "js", "fortschritt.js"));

const SCHACH = globalThis.SCHACH;
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
 * Die Stellungen — mit einem Löser nachgerechnet
 * ------------------------------------------------------------------ */

function standVon(aufgabe) {
    const stand = SCHACH.neuerStand("standard");
    return Object.assign({}, stand, {
        brett: (typeof stand.brett === "string") ? aufgabe.brett : aufgabe.brett.split(""),
        amZug: aufgabe.amZug,
        rochade: "",
        rochadeFelder: [],
        rochadeKoenige: [],
        enPassant: ""
    });
}

function istMatt(stand) {
    return SCHACH.alleZuege(stand).length === 0 && SCHACH.imSchach(stand, stand.amZug);
}

/* Setzt die Seite am Zug in höchstens `n` eigenen Zügen matt? */
function mattIn(stand, n) {
    for (const zug of SCHACH.alleZuege(stand)) {
        const danach = SCHACH._ausfuehren(stand, zug);
        if (istMatt(danach)) {
            return true;
        }
        if (n > 1) {
            const antworten = SCHACH.alleZuege(danach);
            if (antworten.length > 0 && antworten.every((antwort) =>
                mattIn(SCHACH._ausfuehren(danach, antwort), n - 1))) {
                return true;
            }
        }
    }
    return false;
}

/* Erzwingt DIESER Zug das Matt in insgesamt `n` Zügen? */
function zugErzwingt(stand, zug, n) {
    const danach = SCHACH._ausfuehren(stand, zug);
    if (istMatt(danach)) {
        return true;
    }
    if (n <= 1) {
        return false;
    }
    const antworten = SCHACH.alleZuege(danach);
    return antworten.length > 0 && antworten.every((antwort) =>
        mattIn(SCHACH._ausfuehren(danach, antwort), n - 1));
}

pruefe("Es gibt Aufgaben, jede mit gültigem Brett, Seite, N und Lösung", () => {
    wahr(TAGESBRETT.AUFGABEN.length >= 30, "mindestens 30 Aufgaben, sind " + TAGESBRETT.AUFGABEN.length);
    for (const [nr, a] of TAGESBRETT.AUFGABEN.entries()) {
        gleich(a.brett.length, 64, "Aufgabe " + nr + ": 64 Felder");
        wahr(/^[.BSLTDKbsltdk]{64}$/.test(a.brett), "Aufgabe " + nr + ": nur gültige Zeichen");
        wahr(a.amZug === "weiss" || a.amZug === "schwarz", "Aufgabe " + nr + ": Seite");
        wahr([1, 2, 3].indexOf(a.zuege) !== -1, "Aufgabe " + nr + ": N");
        wahr(/^\d{1,2}-\d{1,2}$/.test(a.loesung), "Aufgabe " + nr + ": Lösung");
        gleich((a.brett.match(/K/g) || []).length, 1, "Aufgabe " + nr + ": ein weisser König");
        gleich((a.brett.match(/k/g) || []).length, 1, "Aufgabe " + nr + ": ein schwarzer König");
    }
});

pruefe("Jede Aufgabe: Lösung legal und erzwingend, kein kürzeres Matt (Matt in 3: kein Matt in 1)", () => {
    for (const [nr, a] of TAGESBRETT.AUFGABEN.entries()) {
        const stand = standVon(a);
        wahr(!SCHACH.imSchach(stand, SCHACH.gegner(stand.amZug)), "Aufgabe " + nr + ": Gegner steht nicht schon im Schach");
        const [von, nach] = a.loesung.split("-").map(Number);
        const zug = SCHACH.alleZuege(stand).find((z) => z.von === von && z.nach === nach);
        wahr(!!zug, "Aufgabe " + nr + ": Lösung " + a.loesung + " ist legal");
        if (a.zuege <= 2) {
            wahr(zugErzwingt(stand, zug, a.zuege), "Aufgabe " + nr + ": Lösung erzwingt Matt in " + a.zuege);
        } else {
            wahr(zugErzwingt(stand, zug, 1) === false, "Aufgabe " + nr + ": Lösung ist nicht schon Matt");
        }
        if (a.zuege >= 2) {
            wahr(!mattIn(stand, 1), "Aufgabe " + nr + ": kein Matt in 1");
        }
    }
});

/* ------------------------------------------------------------------ *
 * Aufgabe je Datum und das Ende nach N Zügen
 * ------------------------------------------------------------------ */

pruefe("Jeder Tag hat seine Aufgabe, für alle gleich, die Liste läuft im Kreis", () => {
    const heute = TAGESBRETT.fuer("2026-09-27");
    gleich(heute.nr, 0, "Tag 0");
    gleich(TAGESBRETT.fuer("2026-09-28").nr, 1, "Tag 1");
    gleich(TAGESBRETT.fuer("2026-09-27").nr, TAGESBRETT.fuer("2026-09-27").nr, "gleich gerechnet");
    const n = TAGESBRETT.AUFGABEN.length;
    const spaeter = new Date(Date.UTC(2026, 8, 27 + n)).toISOString().slice(0, 10);
    gleich(TAGESBRETT.fuer(spaeter).nr, 0, "nach einer Runde wieder die erste");
    gleich(TAGESBRETT.fuer("2026-09-26").nr, n - 1, "vor dem Anfang: rückwärts im Kreis");
});

pruefe("Die Regeln des Tagesbretts: gegen Bob, privat, ohne Lootboxen, mit Stellung", () => {
    const r = TAGESBRETT.regelnFuer("2026-09-30");
    gleich(r.gegenComputer, true, "gegen Bob");
    gleich(r.faehigkeiten, false, "keine Lootboxen");
    gleich(r.sichtbarkeit, "privat", "privat");
    gleich(r.tagesbrett.datum, "2026-09-30", "Datum");
    gleich(r.tagesbrett.zuege, TAGESBRETT.fuer("2026-09-30").aufgabe.zuege, "N");
    gleich(r.stellung.brett, TAGESBRETT.fuer("2026-09-30").aufgabe.brett, "Stellung");
});

pruefe("Die Partie trägt ihr Tagesbrett durch Anlegen und Normalisieren", () => {
    const r = TAGESBRETT.regelnFuer("2026-09-27");
    const ergebnis = SCHACH_TAFEL.partieAnlegen(SCHACH_TAFEL.leereTafel(), "standard", "T", 5000, r);
    gleich(ergebnis.partie.regeln.tagesbrett.datum, "2026-09-27", "angelegt");
    const wieder = SCHACH_RUNDE.normalisieren(JSON.parse(JSON.stringify(ergebnis.partie)));
    gleich(wieder.regeln.tagesbrett.zuege, r.tagesbrett.zuege, "nach dem Normalisieren");
    gleich(SCHACH_RUNDE.tagesbrettAngabe({ datum: "gestern", nr: 1, zuege: 2 }), null, "kein Datum");
});

pruefe("Nach N eigenen Zügen ohne Matt ist die Aufgabe verfehlt — vorher nicht", () => {
    const partie = { laeuft: true, ergebnis: "", regeln: { tagesbrett: { datum: "2026-09-27", nr: 0, zuege: 2 } },
        verlauf: [{ farbe: "weiss", von: 1, nach: 2 }, { farbe: "schwarz", von: 3, nach: 4 }] };
    const runde = SCHACH_RUNDE.normalisieren(SCHACH_RUNDE.leereRunde(1, "standard", "p", "x"));
    const eins = Object.assign({}, runde, partie);
    gleich(TAGESBRETT.nachZug(eins, "weiss").ergebnis, "", "nach 1 von 2 läuft es");
    const zwei = Object.assign({}, eins, { verlauf: eins.verlauf.concat([{ farbe: "weiss", von: 5, nach: 6 }]) });
    gleich(TAGESBRETT.nachZug(zwei, "weiss").ergebnis, "schwarz", "nach 2 von 2 verfehlt");
    const matt = Object.assign({}, zwei, { ergebnis: "weiss", laeuft: false });
    gleich(TAGESBRETT.nachZug(matt, "weiss").ergebnis, "weiss", "Matt bleibt Matt");
    const ohne = Object.assign({}, zwei, { regeln: {} });
    gleich(TAGESBRETT.nachZug(ohne, "weiss").ergebnis, "", "andere Partie unberührt");
});

/* ------------------------------------------------------------------ *
 * Tagesaufgabe und Serie im Fortschritt
 * ------------------------------------------------------------------ */

pruefe("Tagesaufgabe: Grund-XP nach Schwierigkeit + 10 je Figur beim ersten Schaffen, dazu die Serie", () => {
    let r = FORTSCHRITT.tagesaufgabe(FORTSCHRITT.leer(), "2026-09-27", false, 1, undefined, 0, 2);
    gleich(r.xp, 0, "verfehlt: nichts");
    r = FORTSCHRITT.tagesaufgabe(r.stand, "2026-09-27", true, 2, undefined, 0, 2);
    gleich(r.xp, 20 + 2 * 10 + 5, "mittel 20 + 2 Figuren + Serie Tag 1");
    gleich(FORTSCHRITT.heuteVon(r.stand, "blunderluck", "2026-09-27").figuren, 2, "2. Versuch = 2 Figuren");
    const nochmal = FORTSCHRITT.tagesaufgabe(r.stand, "2026-09-27", true, 3, undefined, 0, 2);
    gleich(nochmal.xp, 0, "zweites Schaffen am selben Tag bringt nichts");
    gleich(FORTSCHRITT.heuteVon(nochmal.stand, "blunderluck", "2026-09-27").figuren, 2, "Figuren bleiben");
    const morgen = FORTSCHRITT.tagesaufgabe(r.stand, "2026-09-28", true, 4, undefined, 0, 3);
    gleich(morgen.xp, 30 + 3 * 10 + 10, "schwer 30 + 3 Figuren + Tag 2 der Serie");
    gleich(FORTSCHRITT.heuteVon(morgen.stand, "blunderluck", "2026-09-28").figuren, 3, "1. Versuch = 3 Figuren");
    gleich(FORTSCHRITT.gesamtXp(morgen.stand), 45 + 70, "gesamt");
    const leicht = FORTSCHRITT.tagesaufgabe(FORTSCHRITT.leer(), "2026-09-27", true, 1, undefined, 0, 1);
    gleich(leicht.xp, 15 + 30 + 5, "leicht 15 + 3 Figuren + Serie");
    gleich(FORTSCHRITT.tagesGrund(undefined), 20, "ohne Angabe: mittel");
    gleich(TAGESBRETT.schwierigkeit(1), 1, "Matt in 1 = leicht");
    gleich(TAGESBRETT.schwierigkeit(3), 3, "Matt in 3 = schwer");
});

pruefe("Beide Spiele am selben Tag: ×1,5 auf die Grund-XP, nicht auf die Figuren", () => {
    const stand = { spiele: { typoluck: { xp: 0, heute: { datum: "2026-09-27", versuche: 1, figuren: 3 },
        tage: ["2026-09-27"], stand: 5 } } };
    const r = FORTSCHRITT.tagesaufgabe(stand, "2026-09-27", true, 6, undefined, 0, 2);
    gleich(r.xp, 30 + 30 + 5, "20 × 1,5 = 30, 3 Figuren, Serie Tag 1 (derselbe Tag zählt einmal)");
});

pruefe("Serie: Tage am Stück über beide Spiele, bis gestern zählt, ein Schutz überbrückt eine Lücke", () => {
    const stand = { spiele: {
        blunderluck: { tage: ["2026-09-24", "2026-09-26"] },
        typoluck: { tage: ["2026-09-25", "2026-09-22"] } } };
    let s = FORTSCHRITT.serie(stand, "2026-09-26", 0);
    gleich(s.tage, 3, "24–26");
    gleich(s.heute, true, "heute geschafft");
    s = FORTSCHRITT.serie(stand, "2026-09-27", 0);
    gleich(s.tage, 3, "heute noch nicht: bis gestern");
    gleich(s.heute, false, "heute offen");
    s = FORTSCHRITT.serie(stand, "2026-09-26", 1);
    gleich(s.tage, 4, "Lücke am 23. mit Schutz: 22, 24, 25, 26");
    gleich(s.schutzGenutzt, 1, "ein Schutz");
    gleich(FORTSCHRITT.serie(stand, "2026-09-29", 5).tage, 0, "zwei Tage vorbei: gerissen");
    gleich(FORTSCHRITT.serie({}, "2026-09-26", 3).tage, 0, "nichts");
});

pruefe("Datum in Ortszeit, Vortag über Monats- und Jahresgrenzen", () => {
    gleich(FORTSCHRITT.datumVon(new Date(2026, 8, 27, 23, 59).getTime()), "2026-09-27", "spät abends");
    gleich(FORTSCHRITT._vortag("2026-10-01"), "2026-09-30", "Monatsgrenze");
    gleich(FORTSCHRITT._vortag("2027-01-01"), "2026-12-31", "Jahresgrenze");
});

console.log(anzahlOk + " ok, " + anzahlFehler + " Fehler");
process.exit(anzahlFehler === 0 ? 0 : 1);
