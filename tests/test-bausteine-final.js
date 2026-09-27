/*
 * test-bausteine-final.js — alle gemeinsamen UPCrew-Bausteine in Blunderluck sind BYTE-GLEICH mit der Quelle
 * Design\3D-Schrift\final (seit v0.151.13). Bausteine werden nur kopiert, nie abgewandelt.
 *
 * Geprüft wird jede Datei css\upcrew-*.css und js\upcrew-*.js per SHA-256 gegen die gleichnamige Datei in
 * `final`. Ausgenommen: css\upcrew-schicht.css — Blunderluck-eigen (lädt die Knopf-Familie in eine Ebene),
 * kein Baustein. Fehlt der Ordner `final` (anderer Rechner, nur das Repo), wird übersprungen statt zu scheitern.
 *
 * Aufruf: siehe tests\README.md
 */

const fs = require("fs");
const pfad = require("path");
const krypto = require("crypto");

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

const projekt = pfad.join(__dirname, "..");
const FINAL = pfad.join(projekt, "..", "..", "Design", "3D-Schrift", "final");
const EIGENE = ["upcrew-schicht.css"];

const hash = (datei) => krypto.createHash("sha256").update(fs.readFileSync(datei)).digest("hex");

const bausteine = [];
for (const ordner of ["css", "js"]) {
    for (const name of fs.readdirSync(pfad.join(projekt, ordner))) {
        if (/^upcrew-.*\.(css|js)$/.test(name) && EIGENE.indexOf(name) === -1) {
            bausteine.push({ ordner: ordner, name: name });
        }
    }
}

if (!fs.existsSync(FINAL)) {
    console.log("(Design\\3D-Schrift\\final nicht erreichbar — Vergleich übersprungen)");
} else {
    for (const b of bausteine) {
        pruefe(b.ordner + "\\" + b.name + " ist byte-gleich mit final", () => {
            const quelle = pfad.join(FINAL, b.name);
            if (!fs.existsSync(quelle)) {
                /* Ein NEUER Baustein, der hier entstanden ist und noch nicht
                   nach final übertragen wurde: nur melden. */
                console.log("(" + b.name + " liegt noch nicht in final — neu, wartet aufs Übertragen)");
                return;
            }
            const hier = hash(pfad.join(projekt, b.ordner, b.name));
            if (hash(quelle) !== hier) {
                /* Ausnahme: ein VORSCHLAG an final (docs\bausteine\<name>),
                   mit dem Blunderluck schon läuft — genau dieselbe Datei.
                   Übernimmt final ihn, ist wieder alles gleich. */
                const vorschlag = pfad.join(projekt, "docs", "bausteine", b.name);
                if (fs.existsSync(vorschlag) && hash(vorschlag) === hier) {
                    console.log("(" + b.name + " ist ein Vorschlag an final — docs\\bausteine, wartet aufs Übertragen)");
                    return;
                }
                throw new Error("weicht von final ab — aus final kopieren, nicht hier ändern");
            }
        });
    }
}

pruefe("Es gibt Bausteine zu prüfen", () => {
    if (bausteine.length < 10) {
        throw new Error("nur " + bausteine.length + " Bausteine gefunden");
    }
});

console.log(anzahlOk + " ok, " + anzahlFehler + " Fehler");
process.exit(anzahlFehler === 0 ? 0 : 1);
