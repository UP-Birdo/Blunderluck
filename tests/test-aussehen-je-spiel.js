/*
 * test-aussehen-je-spiel.js — jedes Spiel sein eigenes Aussehen (seit v0.151.17; Nutzer 27.09.2026: „mach es doch
 * so, dass es nicht sync ist, also die Designs — wenn man auf Übernehmen drückt, soll sich nur das Spiel ändern.
 * Aber mach einen Schalter rein für die Zukunft, falls ich beide wieder sync haben will“).
 *
 * Das ECHTE js\upcrew-aussehen.js läuft in einer Attrappe von Fenster und Speicher, einmal mit dem Schalter
 * `GETEILT = false` (wie ausgeliefert) und einmal mit `true` (Quelltext für den Test umgestellt):
 *   - false: Übernehmen in Blunderluck schreibt `blunderluck.aussehen`, ändert weder `typoluck.aussehen` noch das
 *     alte gemeinsame `upcrew.aussehen`; Umzug aus dem gemeinsamen Schlüssel; die andere App zieht nicht mit.
 *   - true: das alte Verhalten (`upcrew.aussehen`, `upcrew.farbwelt`, Mitziehen).
 * Dazu: Konto je Spiel (SPIELER.aussehenJeSetzen, _neueresAussehenJe), Anpassen ohne Umschalter, Schalter am Konto.
 *
 * Aufruf: siehe tests\README.md
 */

const fs = require("fs");
const pfad = require("path");
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
    if (JSON.stringify(ist) !== JSON.stringify(soll)) {
        throw new Error(was + ": ist " + JSON.stringify(ist) + ", soll " + JSON.stringify(soll));
    }
}

function wahr(bedingung, was) {
    if (!bedingung) {
        throw new Error(was);
    }
}

const projekt = pfad.join(__dirname, "..");
const lesen = (name) => fs.readFileSync(pfad.join(projekt, name), "utf8");
const QUELLE = lesen("js/upcrew-aussehen.js");

/* Eine Welt: gemeinsamer Browser-Speicher (gleicher Ursprung), eine Seite unter `/<App>/`. */
function welt(speicher, pfadName, geteilt) {
    const lauscher = {};
    const umgebung = {
        console,
        localStorage: {
            getItem: (k) => (k in speicher ? speicher[k] : null),
            setItem: (k, v) => { speicher[k] = String(v); },
            removeItem: (k) => { delete speicher[k]; }
        },
        location: { pathname: pfadName },
        document: {
            documentElement: { dataset: {}, style: { setProperty() {} } },
            addEventListener() {},
            visibilityState: "visible"
        }
    };
    umgebung.window = {
        addEventListener: (name, fn) => { lauscher[name] = fn; }
    };
    vm.createContext(umgebung);
    const text = geteilt ? QUELLE.replace("const GETEILT = false;", "const GETEILT = true;") : QUELLE;
    if (geteilt && text === QUELLE) {
        throw new Error("Schalter `const GETEILT = false;` nicht gefunden");
    }
    vm.runInContext(text, umgebung);
    return { A: umgebung.window.UPCREW_AUSSEHEN, lauscher };
}

const ALT = JSON.stringify({ darstellung: "dunkel", farbwelt: "feld", schrift: "S2", knoepfe: "K3", leseschrift: false, stand: 5 });

pruefe("Der Schalter steht im Baustein auf false (jedes Spiel sein eigenes)", () => {
    wahr(/const GETEILT = false;/.test(QUELLE), "GETEILT = false");
    wahr(/GETEILT = false \(Standard seit 27\.09\.2026\)/.test(QUELLE), "im Dateikopf dokumentiert");
});

pruefe("GETEILT = false: Umzug aus dem gemeinsamen Schlüssel, danach eigener", () => {
    const speicher = { "upcrew.aussehen": ALT };
    const { A } = welt(speicher, "/Blunderluck/", false);
    gleich(A.app, "blunderluck", "App aus dem Pfad");
    gleich(A.SCHLUESSEL, "blunderluck.aussehen", "eigener Schlüssel");
    gleich(A.lesen().farbwelt, "feld", "bisherige Wahl übernommen");
    wahr("blunderluck.aussehen" in speicher, "gleich als eigener Stand abgelegt");
    gleich(speicher["upcrew.aussehen"], ALT, "gemeinsamer Schlüssel unverändert");
});

pruefe("GETEILT = false: Übernehmen in Blunderluck ändert Typoluck nicht", () => {
    const speicher = { "upcrew.aussehen": ALT, "typoluck.aussehen": JSON.stringify({ farbwelt: "tiefsee", stand: 9 }) };
    const blunder = welt(speicher, "/Blunderluck/", false);
    blunder.A.setzen({ farbwelt: "gold", darstellung: "hell" });
    gleich(JSON.parse(speicher["blunderluck.aussehen"]).farbwelt, "gold", "Blunderluck gold");
    gleich(JSON.parse(speicher["typoluck.aussehen"]).farbwelt, "tiefsee", "Typoluck unverändert");
    gleich(speicher["upcrew.aussehen"], ALT, "gemeinsamer Schlüssel nicht geschrieben");
    wahr(!("upcrew.farbwelt" in speicher), "upcrew.farbwelt nicht geschrieben");
    const typo = welt(speicher, "/Typoluck/", false);
    gleich(typo.A.lesen().farbwelt, "tiefsee", "Typoluck liest seins");
});

pruefe("GETEILT = false: die andere App zieht über das storage-Ereignis nicht mit", () => {
    const speicher = { "blunderluck.aussehen": ALT };
    const { A, lauscher } = welt(speicher, "/Blunderluck/", false);
    let gemeldet = 0;
    A.beobachten(() => { gemeldet++; });
    A.lesen();
    speicher["typoluck.aussehen"] = JSON.stringify({ farbwelt: "gold", stand: 99 });
    lauscher.storage({ key: "typoluck.aussehen" });
    speicher["upcrew.aussehen"] = JSON.stringify({ farbwelt: "gold", stand: 99 });
    lauscher.storage({ key: "upcrew.aussehen" });
    gleich(gemeldet, 0, "keine Meldung");
    gleich(A.lesen().farbwelt, "feld", "eigenes bleibt");
    lauscher.storage({ key: "blunderluck.aussehen" });
    gleich(gemeldet, 1, "der eigene Schlüssel (anderer Tab desselben Spiels) meldet");
});

pruefe("GETEILT = true: altes Verhalten (ein Schlüssel für alle, Farbwelt fürs Intro, Mitziehen)", () => {
    const speicher = {};
    const blunder = welt(speicher, "/Blunderluck/", true);
    gleich(blunder.A.GETEILT, true, "Schalter");
    gleich(blunder.A.SCHLUESSEL, "upcrew.aussehen", "gemeinsamer Schlüssel");
    blunder.A.setzen({ farbwelt: "studio" });
    gleich(JSON.parse(speicher["upcrew.aussehen"]).farbwelt, "studio", "gemeinsam geschrieben");
    gleich(speicher["upcrew.farbwelt"], "studio", "Farbwelt fürs Intro");
    wahr(!("blunderluck.aussehen" in speicher), "kein eigener Schlüssel");
    const typo = welt(speicher, "/Typoluck/", true);
    gleich(typo.A.lesen().farbwelt, "studio", "Typoluck sieht dasselbe");
    let gemeldet = 0;
    typo.A.beobachten(() => { gemeldet++; });
    blunder.A.setzen({ farbwelt: "gold" });
    typo.lauscher.storage({ key: "upcrew.aussehen" });
    gleich(gemeldet, 1, "Typoluck zieht mit");
    gleich(typo.A.lesen().farbwelt, "gold", "neue Wahl");
});

pruefe("Unbekanntes Spiel oder App gesetzt: `app` steuert den Schlüssel", () => {
    const speicher = {};
    const { A } = welt(speicher, "/", false);
    gleich(A.SCHLUESSEL, "upcrew.aussehen", "ohne Spiel wie gemeinsam");
    A.app = "typoluck";
    gleich(A.SCHLUESSEL, "typoluck.aussehen", "gesetzt");
});

pruefe("Konto je Spiel: aussehenJe[app], altes Feld bleibt, je Spiel gewinnt der neuere Stand", () => {
    const SPIELER = require(pfad.join(projekt, "js", "spieler.js"));
    const daten = { spieler: [{ id: "i", name: "A", aussehen: { farbwelt: "feld", stand: 5 },
        aussehenJe: { typoluck: { farbwelt: "tiefsee", stand: 9 } } }] };
    const neu = SPIELER.aussehenJeSetzen(daten, "i", "blunderluck",
        { darstellung: "hell", farbwelt: "gold", schrift: "S1", knoepfe: "K1", leseschrift: false, stand: 20 }, 1);
    const ich = neu.spieler[0];
    gleich(ich.aussehenJe.blunderluck.farbwelt, "gold", "eigener Zweig");
    gleich(ich.aussehenJe.typoluck.farbwelt, "tiefsee", "Typoluck-Zweig bleibt");
    gleich(ich.aussehen, { farbwelt: "feld", stand: 5 }, "altes Feld unverändert");
    const zusammen = SPIELER._neueresAussehenJe(
        { aussehenJe: { blunderluck: { stand: 20 }, typoluck: { stand: 9 } } },
        { aussehenJe: { blunderluck: { stand: 10 }, typoluck: { stand: 30, farbwelt: "studio" } } });
    gleich(zusammen.aussehenJe.blunderluck.stand, 20, "meiner neuer");
    gleich(zusammen.aussehenJe.typoluck.farbwelt, "studio", "Server neuer");
});

pruefe("Konto: Schreiben nach aussehenJe erst mit Schalter, altes Feld nicht mehr schreiben", () => {
    const k = lesen("js/aussehen-konto.js");
    wahr(/AUSSEHEN_JE_AM_KONTO: false,/.test(k), "Schalter aus, bis §11c eingespielt ist");
    wahr(/if \(!AUSSEHEN_KONTO\.AUSSEHEN_JE_AM_KONTO\) \{\s*return;/.test(k), "ohne Schalter nichts ans Konto");
    wahr(/aussehenJeSetzen\(/.test(k), "je Spiel");
    wahr(/_umzugGemacht\(\)/.test(k), "altes Feld nur einmal (Umzug)");
});

pruefe("Anpassen: der Umschalter Typoluck/Blunderluck nur bei GETEILT", () => {
    const a = lesen("js/upcrew-anpassen.js");
    wahr(/const geteilt = A\.GETEILT !== false;/.test(a), "Schalter gelesen");
    wahr(/\$\{geteilt \? `<div class="upa-mini-seg"/.test(a), "Umschalter nur bei geteilt");
});

pruefe("Vorschläge an final liegen bei, byte-gleich mit dem, was Blunderluck nutzt", () => {
    for (const name of ["upcrew-aussehen.js", "upcrew-anpassen.js"]) {
        gleich(lesen("docs/bausteine/" + name), lesen("js/" + name), name);
    }
});

console.log(anzahlOk + " ok, " + anzahlFehler + " Fehler");
process.exit(anzahlFehler === 0 ? 0 : 1);
