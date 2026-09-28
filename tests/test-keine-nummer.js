/*
 * test-keine-nummer.js — die Nummer eines ANDEREN steht nirgends im Bild
 * (seit v0.154.0, Regel §12 Konzept K6, Nutzer F1: Die Nummer ist der
 * Freundescode; nur der Besitzer sieht sie im eigenen Profil). Bei gleichen
 * Namen steht „Level N" statt der Nummer. Geprüft an der echten
 * Freunde-Karte im nachgebauten DOM (bildschirm-umgebung.js).
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
    let text = String(element.textContent || "") + " " + String(element.value || "") + " "
        + String(element.placeholder || "");
    for (const kind of element.kinder || []) {
        text += " " + allerText(kind);
    }
    return text;
}

const ANMELDUNG = umgebung.ANMELDUNG;
const FREUNDE = umgebung.FREUNDE;

pruefe("Freunde-Karte: keine fremde Nummer, gleiche Namen mit Level", () => {
    const vorher = ANMELDUNG.abgleich.daten;
    try {
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
        ANMELDUNG.abgleich.daten = daten;
        const karte = FREUNDE.karteBauen({ id: "id-anna", name: "Anna" });
        const text = allerText(karte);
        for (const fremd of ["2222", "3333", "4444"]) {
            wahr(text.indexOf("#" + fremd) === -1 && text.indexOf(fremd) === -1, "Nummer " + fremd + " im Bild");
        }
        wahr(/Jonas/.test(text) && /jonas/.test(text), "beide Jonas als Anfrage da");
        if (typeof umgebung.FORTSCHRITT !== "undefined") {
            wahr(/Level 1/.test(text), "gleiche Namen: Level");
        }
    } finally {
        ANMELDUNG.abgleich.daten = vorher;
    }
});

console.log(anzahlOk + " ok, " + anzahlFehler + " Fehler");
process.exit(anzahlFehler === 0 ? 0 : 1);
