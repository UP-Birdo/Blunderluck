/*
 * test-hand-max-vorgabe.js — „Hand max" ist seit v0.153.0 standardmässig ohne Grenze (Nutzer 28.09.2026: „nein
 * derzeit noch unendlich"). Der Schalter bleibt wählbar.
 *
 * Geprüft: neue Regeln schlagen 0 vor; eine unter v0.152.4 ungefragt gemerkte 4 (ohne `itemMaxGewaehlt`) fällt
 * auf „ohne Grenze" zurück; eine selbst gewählte Grenze bleibt gemerkt; laufende Partien behalten ihren Wert.
 *
 * Aufruf: siehe tests\README.md
 */

const { umgebung, SCHACH_VARIANTEN, SCHACH_RUNDE, TEAM_SCHACH } = require("./bildschirm-umgebung.js");

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

const START = umgebung.START;
const speicher = umgebung.window ? umgebung.window.localStorage : umgebung.localStorage;

pruefe("Vorgabe ohne Grenze", () => {
    gleich(SCHACH_VARIANTEN.ITEM_MAX_VORGABE, 0, "Vorgabe");
    gleich(TEAM_SCHACH._regelnVorgabe().itemMax, 0, "Regeln-Vorgabe");
    gleich(TEAM_SCHACH._regelnVorgabe().itemMaxGewaehlt, false, "nicht gewählt");
    gleich(SCHACH_VARIANTEN.ITEM_MAX.map((e) => e.wert), [2, 3, 4, 5, 0], "Schalter bleibt");
});

pruefe("Ungefragt gemerkte 4 aus v0.152.4 fällt auf ohne Grenze zurück", () => {
    const alt = Object.assign({}, TEAM_SCHACH._regelnVorgabe(), { itemMax: 4 });
    delete alt.itemMaxGewaehlt;
    speicher.setItem(START.SCHLUESSEL_REGELN, JSON.stringify(alt));
    gleich(START.regeln().itemMax, 0, "ohne Grenze");
});

pruefe("Selbst gewählte Grenze bleibt gemerkt", () => {
    const gewaehlt = Object.assign({}, TEAM_SCHACH._regelnVorgabe(), { itemMax: 3, itemMaxGewaehlt: true });
    START.regelnMerken(gewaehlt);
    gleich(START.regeln().itemMax, 3, "3 bleibt");
    speicher.removeItem(START.SCHLUESSEL_REGELN);
    gleich(START.regeln().itemMax, 0, "ohne Merker Vorgabe");
});

pruefe("Laufende Partien behalten ihren Wert", () => {
    gleich(SCHACH_RUNDE.normalisieren({ regeln: { itemMax: 4 } }).regeln.itemMax, 4, "4 bleibt");
    gleich(SCHACH_RUNDE.normalisieren({ regeln: {} }).regeln.itemMax, 0, "ohne Angabe ohne Grenze");
});

console.log(anzahlOk + " ok, " + anzahlFehler + " Fehler");
process.exit(anzahlFehler === 0 ? 0 : 1);
