/*
 * test-bausteine-quelle.js — alle gemeinsamen UPCrew-Bausteine in Blunderluck sind BYTE-GLEICH mit der Quelle
 * Apps\UPCrew\bausteine (Nutzer-Entscheid 03.10.2026; bis dahin Design\3D-Schrift\final und der Name
 * test-bausteine-final.js, seit v0.151.13). Bausteine werden nur kopiert, nie abgewandelt — geändert wird ein
 * Baustein allein in UPCrew (..\UPCrew\bausteine\LIESMICH.md).
 *
 * Geprüft wird jede Datei css\upcrew-*.css und js\upcrew-*.js per SHA-256 gegen die gleichnamige Datei in
 * ..\UPCrew\bausteine\<css|js>\. Ausgenommen: css\upcrew-schicht.css — Blunderluck-eigen (lädt die Knopf-Familie
 * in eine Ebene), kein Baustein. Dazu js\konto.js gegen ..\UPCrew\bausteine\kern\konto.js: Dort steht statt des
 * Speicher-Schlüssels der Platzhalter UPCREW-JE-APP:KONTO-SCHLUESSEL, hier ist "blunderluck.konto" eingesetzt.
 * Seit v0.160.1 dazu die zwei Kern-Bausteine js\speicher-konten.js und js\fortschritt-kern.js gegen
 * ..\UPCrew\bausteine\kern\ (ohne Platzhalter, byte-gleich).
 * Fehlt der Ordner (anderer Rechner, nur das Repo), wird übersprungen statt zu scheitern.
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
const QUELLE = pfad.join(projekt, "..", "UPCrew", "bausteine");
const EIGENE = ["upcrew-schicht.css"];
const KONTO_PLATZHALTER = "UPCREW-JE-APP:KONTO-SCHLUESSEL";
const KONTO_SCHLUESSEL = "blunderluck.konto";
const KERN_DATEIEN = ["speicher-konten.js", "fortschritt-kern.js"];

const hashVon = (inhalt) => krypto.createHash("sha256").update(inhalt).digest("hex");
const hash = (datei) => hashVon(fs.readFileSync(datei));

const bausteine = [];
for (const ordner of ["css", "js"]) {
    for (const name of fs.readdirSync(pfad.join(projekt, ordner))) {
        if (/^upcrew-.*\.(css|js)$/.test(name) && EIGENE.indexOf(name) === -1) {
            bausteine.push({ ordner: ordner, name: name });
        }
    }
}

if (!fs.existsSync(QUELLE)) {
    console.log("(Apps\\UPCrew\\bausteine nicht erreichbar — Vergleich übersprungen)");
} else {
    for (const b of bausteine) {
        pruefe(b.ordner + "\\" + b.name + " ist byte-gleich mit der Quelle", () => {
            const quelle = pfad.join(QUELLE, b.ordner, b.name);
            if (!fs.existsSync(quelle)) {
                /* Ein NEUER Baustein, der hier entstanden ist und noch nicht
                   nach UPCrew übertragen wurde: nur melden. */
                console.log("(" + b.name + " liegt noch nicht in UPCrew\\bausteine — neu, wartet aufs Übertragen)");
                return;
            }
            const hier = hash(pfad.join(projekt, b.ordner, b.name));
            if (hash(quelle) !== hier) {
                /* Ausnahme: ein VORSCHLAG an UPCrew (docs\bausteine\<name>),
                   mit dem Blunderluck schon läuft — genau dieselbe Datei.
                   Übernimmt die Quelle ihn, ist wieder alles gleich. */
                const vorschlag = pfad.join(projekt, "docs", "bausteine", b.name);
                if (fs.existsSync(vorschlag) && hash(vorschlag) === hier) {
                    console.log("(" + b.name + " ist ein Vorschlag an UPCrew — docs\\bausteine, wartet aufs Übertragen)");
                    return;
                }
                throw new Error("weicht von der Quelle ab — aus UPCrew\\bausteine kopieren, nicht hier ändern");
            }
        });
    }

    pruefe("js\\konto.js ist byte-gleich mit kern\\konto.js (Platzhalter durch den Schlüssel ersetzt)", () => {
        const quelle = pfad.join(QUELLE, "kern", "konto.js");
        if (!fs.existsSync(quelle)) {
            throw new Error("kern\\konto.js fehlt in UPCrew\\bausteine");
        }
        const text = fs.readFileSync(quelle, "utf8");
        const stellen = text.split(KONTO_PLATZHALTER).length - 1;
        if (stellen !== 1) {
            throw new Error("der Platzhalter " + KONTO_PLATZHALTER + " steht " + stellen + "-mal in der Quelle, erwartet genau einmal");
        }
        const erwartet = Buffer.from(text.replace(KONTO_PLATZHALTER, KONTO_SCHLUESSEL), "utf8");
        if (hashVon(erwartet) !== hash(pfad.join(projekt, "js", "konto.js"))) {
            throw new Error("weicht von der Quelle ab — konto.js nur in UPCrew\\bausteine\\kern ändern, nicht hier");
        }
    });

    /* Die zwei Kern-Bausteine ohne Platzhalter (seit v0.160.1). */
    for (const name of KERN_DATEIEN) {
        pruefe("js\\" + name + " ist byte-gleich mit kern\\" + name, () => {
            const quelle = pfad.join(QUELLE, "kern", name);
            if (!fs.existsSync(quelle)) {
                throw new Error("kern\\" + name + " fehlt in UPCrew\\bausteine");
            }
            const hier = pfad.join(projekt, "js", name);
            if (!fs.existsSync(hier)) {
                throw new Error("js\\" + name + " fehlt — aus UPCrew\\bausteine\\kern kopieren");
            }
            if (hash(quelle) !== hash(hier)) {
                throw new Error("weicht von der Quelle ab — " + name + " nur in UPCrew\\bausteine\\kern ändern, nicht hier");
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
