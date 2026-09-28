/*
 * test-name-tag.js — Name und klein „#Nummer" bei ALLEN Spielern (seit
 * v0.155.0, Nutzer 28.09.2026: „bei beiden spielen in die rangliste name und
 * dann in klein # mit dem tag sowie das profil"). Überholt v0.154.0
 * („Nummer nirgends sichtbar", „Level N" bei gleichen Namen; bis v0.154.0
 * hiess diese Datei test-keine-nummer.js). Geprüft an der echten
 * Freunde-Karte und der echten Rangliste im nachgebauten DOM.
 *
 * Aufruf: siehe tests\README.md
 */

const { umgebung, SPIELER } = require("./bildschirm-umgebung.js");

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

function wahr(bedingung, was) {
    if (!bedingung) {
        throw new Error(was);
    }
}

/* Aller Text eines nachgebauten Elements samt Kindern. */
function allerText(element) {
    if (!element) {
        return "";
    }
    let text = String(element.textContent || "");
    for (const kind of element.kinder || []) {
        text += " " + allerText(kind);
    }
    return text;
}

/* Alle Elemente mit dieser Klasse. */
function mitKlasse(element, klasse, treffer) {
    const liste = treffer || [];
    for (const kind of (element && element.kinder) || []) {
        if (String(kind.className || "").split(" ").indexOf(klasse) !== -1) {
            liste.push(kind);
        }
        mitKlasse(kind, klasse, liste);
    }
    return liste;
}

const ANMELDUNG = umgebung.ANMELDUNG;
const FREUNDE = umgebung.FREUNDE;
const RANGLISTE = umgebung.RANGLISTE;

function datenMitNummern() {
    let daten = SPIELER.leereDaten(1000);
    const neu = (name, id, tag, freunde) => {
        daten = SPIELER.spielerHinzufuegen(daten, name, id, 1000);
        const eintrag = daten.spieler.find((s) => s.id === id);
        eintrag.tag = tag;
        eintrag.freunde = freunde;
    };
    neu("Anna", "id-anna", "1111", ["id-bert"]);
    neu("Bert", "id-bert", "2222", ["id-anna"]);
    neu("Jonas", "id-j1", "3333", ["id-anna"]);
    neu("jonas", "id-j2", "4444", ["id-anna"]);
    return daten;
}

pruefe("Freunde-Karte: jede fremde Nummer klein hinter dem Namen, kein Level N", () => {
    const vorher = ANMELDUNG.abgleich.daten;
    try {
        ANMELDUNG.abgleich.daten = datenMitNummern();
        const karte = FREUNDE.karteBauen({ id: "id-anna", name: "Anna" });
        const nummern = mitKlasse(karte, "freunde-nummer").map((el) => el.textContent);
        for (const fremd of ["#2222", "#3333", "#4444"]) {
            wahr(nummern.indexOf(fremd) !== -1, fremd + " fehlt: " + JSON.stringify(nummern));
        }
        wahr(!/Level \d/.test(allerText(karte)), "Level N steht noch da");
    } finally {
        ANMELDUNG.abgleich.daten = vorher;
    }
});

pruefe("Rangliste: Name und klein #Nummer bei allen", () => {
    const vorher = ANMELDUNG.abgleich.daten;
    const wurzelVorher = RANGLISTE.wurzelEl;
    try {
        ANMELDUNG.abgleich.daten = datenMitNummern();
        RANGLISTE.offenesProfil = "";
        RANGLISTE.wurzelEl = umgebung.document.createElement("div");
        RANGLISTE.zeichnen();
        const tags = mitKlasse(RANGLISTE.wurzelEl, "name-tag").map((el) => el.textContent);
        for (const nummer of ["#1111", "#2222", "#3333", "#4444"]) {
            wahr(tags.indexOf(nummer) !== -1, nummer + " fehlt in der Rangliste: " + JSON.stringify(tags));
        }
        wahr(RANGLISTE.tagVon(ANMELDUNG.abgleich.daten, "id-bert") === "#2222", "tagVon");
    } finally {
        ANMELDUNG.abgleich.daten = vorher;
        RANGLISTE.wurzelEl = wurzelVorher;
    }
});

console.log(anzahlOk + " ok, " + anzahlFehler + " Fehler");
process.exit(anzahlFehler === 0 ? 0 : 1);
