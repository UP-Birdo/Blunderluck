/*
 * test-knopf-innenrand.js — Knöpfe mit eigenem Innenrand behalten ihn (seit v0.152.3).
 *
 * Nutzer 28.09.2026: „Verstärken kann man nicht einsetzen." Gefunden: `.knopf:not(.up-kn)` (css\stil.css,
 * seit v0.144.0) setzt 18 px Innenrand je Seite und gewinnt über eine EINZELNE Klasse. Die runden Knöpfe der
 * Karten-Leiste (44 px) behielten so 4 px für ihr Zeichen — ✓ „Einsetzen" war ein leerer grüner Kreis.
 *
 * Geprüft: Jede Klasse, die ein Bildschirm-Knopf (`TEAM_SCHACH._knopf`) trägt und die in einer Stildatei als
 * einzelne Klasse `padding: 0` setzt, braucht auch eine Regel `.knopf.<klasse>` mit Innenrand — sonst gilt
 * der Innenrand der Haus-Knöpfe.
 *
 * Aufruf: siehe tests\README.md
 */

const fs = require("fs");
const pfad = require("path");

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
const cssOrdner = pfad.join(projekt, "css");
const css = fs.readdirSync(cssOrdner).filter((n) => /\.css$/.test(n))
    .map((n) => fs.readFileSync(pfad.join(cssOrdner, n), "utf8").replace(/\/\*[\s\S]*?\*\//g, ""))
    .join("\n");
const js = fs.readdirSync(pfad.join(projekt, "js")).filter((n) => /^team-schach.*\.js$/.test(n))
    .map((n) => fs.readFileSync(pfad.join(projekt, "js", n), "utf8")).join("\n");

/* Alle Regeln als [Selektoren, Block]. */
const regeln = [];
const muster = /([^{}]+)\{([^{}]*)\}/g;
let treffer;
while ((treffer = muster.exec(css)) !== null) {
    regeln.push({ selektoren: treffer[1].split(",").map((s) => s.trim()), block: treffer[2] });
}
const nullRand = (block) => /(^|;|\s)padding\s*:\s*0(px)?\s*(;|$)/.test(block);

/* Die Klassen der Bildschirm-Knöpfe. */
const klassen = new Set();
const knopfMuster = /_knopf\([^,()]*,\s*"([^"]+)"/g;
while ((treffer = knopfMuster.exec(js)) !== null) {
    for (const k of treffer[1].split(/\s+/)) {
        if (k && !/^knopf(-|$)/.test(k)) {
            klassen.add(k);
        }
    }
}

pruefe("Haus-Knopf-Regel ist da (sonst prüft dieser Test nichts)", () => {
    if (!regeln.some((r) => r.selektoren.indexOf(".knopf:not(.up-kn)") !== -1 && /padding/.test(r.block))) {
        throw new Error(".knopf:not(.up-kn) mit Innenrand nicht gefunden");
    }
    if (klassen.size < 10) {
        throw new Error("zu wenige Knopf-Klassen gefunden: " + klassen.size);
    }
});

pruefe("Knöpfe mit eigenem Innenrand 0 schlagen .knopf:not(.up-kn)", () => {
    const fehlend = [];
    for (const k of klassen) {
        const eigen = regeln.some((r) => r.selektoren.indexOf("." + k) !== -1 && nullRand(r.block));
        if (!eigen) {
            continue;
        }
        const stark = regeln.some((r) => r.selektoren.indexOf(".knopf." + k) !== -1 && /padding/.test(r.block));
        if (!stark) {
            fehlend.push(k);
        }
    }
    if (fehlend.length) {
        throw new Error("ohne .knopf.<klasse>-Regel: " + fehlend.join(", "));
    }
});

pruefe("Die Karten-Leiste: ✓ ✕ ? (hand-rund), Karte und Menü-Knopf", () => {
    for (const k of ["hand-rund", "hand-aktiv-karte", "hand-menue"]) {
        if (!regeln.some((r) => r.selektoren.indexOf(".knopf." + k) !== -1 && nullRand(r.block))) {
            throw new Error(k + " ohne .knopf." + k + " { padding: 0 }");
        }
    }
});

console.log(anzahlOk + " ok, " + anzahlFehler + " Fehler");
process.exit(anzahlFehler === 0 ? 0 : 1);
