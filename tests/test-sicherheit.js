/*
 * test-sicherheit.js — die Sicherheits-Leitplanken der ausgelieferten Seite
 * (seit v0.137.0, Sicherheits-Runde 25.09.2026).
 *
 *   1. Die Seite trägt eine Content-Security-Policy (Sperre im Browser).
 *   2. JEDER eingebettete Skript-Block ist dort mit seinem Fingerabdruck
 *      erlaubt — ändert jemand die Import-Karte, bleibt sonst das 3D-Brett
 *      still aus, ohne dass es jemand merkt.
 *   3. Die Datenbank-Adresse aus js\konfig.js steht in `connect-src` —
 *      sonst blockiert der Browser jeden Abgleich.
 *   4. Keine Ereignis-Attribute (`onclick="…"`) im HTML.
 *   5. In nichts, was ausgeliefert wird, steht ein Zugangsschlüssel
 *      (GitHub-Token, Google-Schlüssel mit Geheimnis-Charakter, private
 *      Schlüssel).
 */

"use strict";

const pfad = require("path");
const dateisystem = require("fs");
const krypto = require("crypto");

const projekt = pfad.join(__dirname, "..");

let anzahlOk = 0;
let anzahlFehler = 0;

function pruefe(name, test) {
    try {
        test();
        anzahlOk++;
    } catch (fehler) {
        anzahlFehler++;
        console.log("[test-sicherheit.js] FEHLER: " + name);
        console.log("             " + fehler.message);
    }
}

function wahr(wert, was) {
    if (!wert) {
        throw new Error(was);
    }
}

const seite = dateisystem.readFileSync(pfad.join(projekt, "index.html"), "utf8")
    .replace(/\r\n/g, "\n");
const konfig = dateisystem.readFileSync(pfad.join(projekt, "js", "konfig.js"), "utf8");

const cspTreffer = /<meta http-equiv="Content-Security-Policy" content="([^"]+)">/.exec(seite);
const csp = cspTreffer ? cspTreffer[1] : "";

function quelle(name) {
    const teil = csp.split(";").map((t) => t.trim()).find((t) => t.indexOf(name + " ") === 0);
    return teil ? teil.slice(name.length).trim().split(/\s+/) : [];
}

pruefe("Die Seite trägt eine Content-Security-Policy", () => {
    wahr(csp !== "", "kein CSP-Meta-Tag in index.html");
    wahr(quelle("default-src").indexOf("'self'") !== -1, "default-src ist nicht 'self'");
    wahr(quelle("object-src").indexOf("'none'") !== -1, "object-src ist nicht 'none'");
    wahr(quelle("script-src").indexOf("'unsafe-inline'") === -1, "script-src erlaubt eingebettete Skripte pauschal");
    wahr(quelle("script-src").indexOf("'unsafe-eval'") === -1, "script-src erlaubt eval");
    wahr(quelle("base-uri").length > 0, "base-uri fehlt");
});

pruefe("Jeder eingebettete Skript-Block ist per Fingerabdruck erlaubt", () => {
    const erlaubt = quelle("script-src");
    const muster = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;
    let treffer;
    let anzahl = 0;
    while ((treffer = muster.exec(seite)) !== null) {
        anzahl++;
        const abdruck = "'sha256-" + krypto.createHash("sha256")
            .update(treffer[1], "utf8").digest("base64") + "'";
        wahr(erlaubt.indexOf(abdruck) !== -1,
            "eingebetteter Block ohne passenden Fingerabdruck — in die CSP gehört " + abdruck);
    }
    wahr(anzahl >= 1, "die Import-Karte des 3D-Bretts fehlt");
});

pruefe("Die Datenbank-Adresse steht in connect-src", () => {
    const basis = /^\s*firebaseBasis:\s*"([^"]*)"/m.exec(konfig);
    wahr(basis, "firebaseBasis nicht gefunden");
    if (basis[1] !== "") {
        wahr(quelle("connect-src").indexOf(basis[1].replace(/\/+$/, "")) !== -1,
            "connect-src erlaubt die Datenbank nicht: " + basis[1]);
    }
});

pruefe("Keine Ereignis-Attribute im HTML", () => {
    wahr(!/\son[a-z]+\s*=\s*["']/i.test(seite), "onclick=\"…\" o. ä. gefunden");
});

pruefe("In nichts Ausgeliefertem steht ein Zugangsschlüssel", () => {
    const muster = [
        /ghp_[0-9A-Za-z]{20,}/,
        /github_pat_[0-9A-Za-z_]{20,}/,
        /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
        /"private_key"\s*:/,
        /AKIA[0-9A-Z]{16}/
    ];
    const durchsuchen = (ordner) => {
        for (const eintrag of dateisystem.readdirSync(ordner, { withFileTypes: true })) {
            const voll = pfad.join(ordner, eintrag.name);
            if (eintrag.isDirectory()) {
                if (eintrag.name === "lib") {
                    continue;
                }
                durchsuchen(voll);
            } else if (/\.(js|html|json|md|css|webmanifest)$/.test(eintrag.name)) {
                const text = dateisystem.readFileSync(voll, "utf8");
                for (const m of muster) {
                    wahr(!m.test(text), "Schlüssel-Muster in " + pfad.relative(projekt, voll));
                }
            }
        }
    };
    for (const ordner of ["js", "css", "docs", "tests"]) {
        durchsuchen(pfad.join(projekt, ordner));
    }
    wahr(!/ghp_|github_pat_/.test(seite), "Schlüssel-Muster in index.html");
});

console.log(anzahlOk + " ok, " + anzahlFehler + " Fehler");
process.exit(anzahlFehler === 0 ? 0 : 1);
