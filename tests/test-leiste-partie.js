/*
 * test-leiste-partie.js — die Tab-Leiste ist weg, solange eine Partie
 * läuft (seit v0.151.3; Nutzer 27.09.2026: „während spielen bei beiden
 * games soll das band unten verschwinden").
 *
 * Geprüft: `TABS.rundeSetzen` (vierter Wert `spielt`) setzt und nimmt die
 * Klasse `partie-spielt` am body; ein Tab-Wechsel nimmt sie zurück; die
 * Partie meldet sie ab dem Vorraum bis zum Ende (`!offene.ergebnis`); die
 * Stildatei blendet die Leiste damit aus und lässt unten keinen Platz für
 * sie frei.
 *
 * Aufruf: siehe tests\README.md
 */

const pfad = require("path");
const fs = require("fs");
const vm = require("vm");

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

const projekt = pfad.join(__dirname, "..");

/* tabs.js in einem Kontext mit nachgebautem body. */
const klassen = new Set();
const kontext = {
    console: console,
    document: {
        body: {
            classList: {
                toggle: (k, an) => { if (an) { klassen.add(k); } else { klassen.delete(k); } },
                remove: (k) => klassen.delete(k),
                contains: (k) => klassen.has(k),
                add: (k) => klassen.add(k)
            }
        },
        querySelectorAll: () => []
    }
};
vm.createContext(kontext);
vm.runInContext(fs.readFileSync(pfad.join(projekt, "js", "tabs.js"), "utf8")
    + "\n;this.TABS = TABS;", kontext, { filename: "tabs.js" });
const TABS = kontext.TABS;

pruefe("rundeSetzen: vierter Wert setzt partie-spielt, ohne ihn verschwindet die Klasse", () => {
    TABS.aktiveId = "team-schach";
    TABS.rundeSetzen("team-schach", true, false, true);
    gleich(klassen.has("partie-spielt"), true, "Vorraum: Leiste weg");
    TABS.rundeSetzen("team-schach", true, true, true);
    gleich(klassen.has("partie-spielt"), true, "laufende Partie: Leiste weg");
    TABS.rundeSetzen("team-schach", true);
    gleich(klassen.has("partie-spielt"), false, "Abschluss/Übersicht: Leiste zurück");
});

pruefe("Ein anderer Tab (nicht aktiv) ändert nichts; ein Tab-Wechsel nimmt die Klasse zurück", () => {
    TABS.aktiveId = "team-schach";
    TABS.rundeSetzen("team-schach", true, false, true);
    TABS.rundeSetzen("start", false);
    gleich(klassen.has("partie-spielt"), true, "fremder Tab zählt nicht");
    TABS.liste = [{ id: "start", knopf: null }];
    try {
        TABS.wechseln("start");
    } catch (fehler) {
        /* Der Wechsel zeichnet danach Knöpfe — hier nur die Klasse zählt. */
    }
    gleich(klassen.has("partie-spielt"), false, "nach dem Wechsel: Leiste zurück");
});

pruefe("Die Partie meldet `spielt` bis zum Ende (team-schach.js)", () => {
    const quelle = fs.readFileSync(pfad.join(projekt, "js", "team-schach.js"), "utf8");
    gleich(/TABS\.rundeSetzen\("team-schach", true, offene\.laeuft === true, !offene\.ergebnis\)/.test(quelle),
        true, "Aufruf mit !offene.ergebnis");
});

pruefe("Stildatei: Leiste weg und kein freier Platz für sie", () => {
    const stil = fs.readFileSync(pfad.join(projekt, "css", "stil.css"), "utf8");
    const brett = fs.readFileSync(pfad.join(projekt, "css", "stil-brett.css"), "utf8");
    gleich(/body\.partie-spielt \.tab-leiste\.up-leiste\s*\{\s*display: none;/.test(stil), true, "Leiste weg");
    gleich(/body\.partie-spielt \.tab-inhalt\s*\{[^}]*padding-bottom: calc\(16px \+ env\(safe-area-inset-bottom/.test(stil),
        true, "unten nur Rand + iPhone-Streifen");
    gleich(/body\.partie-spielt:not\(\.partie-fest\) \.vorraum-fuss\s*\{[^}]*bottom: 0;/.test(brett), true,
        "„Bereit“ rutscht nach unten");
});

console.log(anzahlOk + " ok, " + anzahlFehler + " Fehler");
process.exit(anzahlFehler === 0 ? 0 : 1);
