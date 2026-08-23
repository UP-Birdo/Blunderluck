/*
 * test-versiegelung.js — Regressionstests der Prüfsummen.
 *
 * Spieler-PIN und Verwaltungs-Passwort stehen nie im Klartext in Datenbank
 * oder Quelltext — nur ihre SHA-256-Prüfsummen. Geprüft wird die ECHTE Datei
 * js\versiegelung.js.
 */

const pfad = require("path");

const VERSIEGELUNG = require(pfad.join(__dirname, "..", "js", "versiegelung.js"));

let anzahlOk = 0;
let anzahlFehler = 0;

/* Die Prüfungen sind asynchron (die Krypto-Funktion des Browsers ist es auch),
   deshalb laufen sie nacheinander in einer Liste. */
const pruefungen = [];

function pruefe(bezeichnung, funktion) {
    pruefungen.push({ bezeichnung: bezeichnung, funktion: funktion });
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

/* ------------------------------------------------------------------ */

pruefe("Die Krypto-Funktion steht zur Verfügung", async () => {
    wahr(VERSIEGELUNG.verfuegbar(), "crypto.subtle vorhanden");
});

pruefe("Ein Salz ist lang genug und jedes Mal anders", async () => {
    const eins = VERSIEGELUNG.salzErzeugen();
    const zwei = VERSIEGELUNG.salzErzeugen();
    gleich(eins.length, 32, "16 Byte als Hex");
    wahr(eins !== zwei, "zwei Salze verschieden");
});

/* ------------------------------------------------------------------ *
 * Spieler-PIN
 * ------------------------------------------------------------------ */

pruefe("Die richtige PIN wird erkannt, eine falsche nicht", async () => {
    const salz = VERSIEGELUNG.salzErzeugen();
    const pruefwert = await VERSIEGELUNG.pinPruefwertBilden("1234", salz);

    wahr(await VERSIEGELUNG.pinPruefen("1234", salz, pruefwert), "richtige PIN");
    wahr(!await VERSIEGELUNG.pinPruefen("1235", salz, pruefwert), "falsche PIN");
    wahr(!await VERSIEGELUNG.pinPruefen("1234", "anderes-salz", pruefwert), "anderes Salz");
    wahr(!await VERSIEGELUNG.pinPruefen("1234", salz, ""), "ohne Pruefwert");
});

pruefe("Gleiche PIN bei zwei Spielern ergibt verschiedene Pruefwerte", async () => {
    /* Dafuer ist das Salz da: Sonst sähe man in der Datenbank sofort, wer
       dieselbe PIN benutzt. */
    const eins = await VERSIEGELUNG.pinPruefwertBilden("1234", VERSIEGELUNG.salzErzeugen());
    const zwei = await VERSIEGELUNG.pinPruefwertBilden("1234", VERSIEGELUNG.salzErzeugen());
    wahr(eins !== zwei, "unterschiedlich");
});

pruefe("Der Pruefwert einer PIN enthaelt die Ziffern nicht", async () => {
    const pruefwert = await VERSIEGELUNG.pinPruefwertBilden("1234", "salz");
    wahr(pruefwert.indexOf("1234") === -1, "keine Ziffernfolge");
    wahr(/^[0-9a-f]{64}$/.test(pruefwert), "reine Hex-Zeichenkette");
});

/* ------------------------------------------------------------------ *
 * Verwaltungs-Passwort
 * ------------------------------------------------------------------ */

pruefe("Der hinterlegte Verwaltungs-Pruefwert ist leer oder eine gueltige Pruefsumme", async () => {
    /* Der Wert stammt aus js\konfig.js. Das Passwort selbst kennt nur der
       Nutzer (anders als im Quizz steht es bewusst nirgends im Projekt) —
       geprueft wird deshalb die Form: solange der Wert leer ist, ist die
       Verwaltung gesperrt (Nutzer-Aufgabe in der STATUS.md); sobald einer
       gesetzt ist, muss er eine 64-stellige Hex-Pruefsumme sein. */
    const dateisystem = require("fs");
    const konfig = dateisystem.readFileSync(pfad.join(__dirname, "..", "js", "konfig.js"), "utf8");
    const treffer = konfig.match(/pruefwert:\s*"([0-9a-f]*)"/);
    wahr(treffer !== null, "Pruefwert-Zeile in konfig.js gefunden");

    const wert = treffer[1];
    wahr(wert === "" || /^[0-9a-f]{64}$/.test(wert),
        "leer (Verwaltung gesperrt) oder 64-stellige Hex-Pruefsumme");

    if (wert === "") {
        wahr(!await VERSIEGELUNG.verwaltungPruefen("123456", wert),
            "mit leerem Pruefwert kommt niemand hinein");
    }
});

pruefe("Ohne hinterlegten Pruefwert kommt niemand in die Verwaltung", async () => {
    wahr(!await VERSIEGELUNG.verwaltungPruefen("660932", ""), "leerer Pruefwert");
});

/* ------------------------------------------------------------------ */

(async () => {
    for (const pruefung of pruefungen) {
        try {
            await pruefung.funktion();
            anzahlOk++;
        } catch (fehler) {
            anzahlFehler++;
            console.error("FEHLER: " + pruefung.bezeichnung);
            console.error("        " + fehler.message);
        }
    }

    console.log(anzahlOk + " ok, " + anzahlFehler + " Fehler");
    process.exit(anzahlFehler === 0 ? 0 : 1);
})();
