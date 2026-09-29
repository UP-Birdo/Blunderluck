/*
 * test-zufall.js — der gemeinsame Baustein js\upcrew-zufall.js (seit
 * v0.160.0, Quelle Design\3D-Schrift\final): gleich bei gleicher Eingabe,
 * Versionsnummer, Tages-Seed, Verteilung.
 *
 * Geprüft wird die ECHTE Datei.
 *
 * Aufruf: siehe tests\README.md
 */

const fs = require("fs");
const pfad = require("path");
const Z = require(pfad.join(__dirname, "..", "js", "upcrew-zufall.js"));

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

function wahr(bedingung, was) {
    if (!bedingung) {
        throw new Error((was || "Bedingung") + " war nicht erfüllt");
    }
}

const ziehen = (f, n) => Array.from({ length: n }, () => f());

pruefe("Gleiche Eingabe → gleicher Seed und dieselbe Folge (jedes Gerät, jedes Mal)", () => {
    const a = Z.spielSeed({ spieler: "jonas#4821", welt: "turm", durchgang: 3, teil: [2] });
    const b = Z.spielSeed({ spieler: "jonas#4821", welt: "turm", durchgang: 3, teil: [2] });
    gleich(a.text, "jonas#4821|turm|2|3|v1", "Seed-Text");
    gleich(a.zahl, b.zahl, "Zahl");
    gleich(a.hex, "E2BCE6CF", "Hex (festgenagelt)");
    gleich(ziehen(Z.folge(a), 50).join(","), ziehen(Z.folge(b), 50).join(","), "50 Ziehungen");
});

pruefe("Spieler wird klein und ohne Rand gelesen; Vorgaben: Gast, Durchgang 1", () => {
    gleich(Z.spielSeed({ spieler: " Jonas#4821 ", welt: "turm", durchgang: 3, teil: [2] }).zahl,
        Z.spielSeed({ spieler: "jonas#4821", welt: "turm", durchgang: 3, teil: [2] }).zahl, "gleich");
    gleich(Z.spielSeed({ welt: "buch" }).text, "gast|buch|1|v1", "Vorgaben");
});

pruefe("Andere Eingabe → anderer Seed (Spieler, Welt, Ort, Durchgang)", () => {
    const grund = { spieler: "a", welt: "turm", durchgang: 1, teil: [1] };
    const zahlen = new Set([
        Z.spielSeed(grund).zahl,
        Z.spielSeed(Object.assign({}, grund, { spieler: "b" })).zahl,
        Z.spielSeed(Object.assign({}, grund, { welt: "buch" })).zahl,
        Z.spielSeed(Object.assign({}, grund, { teil: [2] })).zahl,
        Z.spielSeed(Object.assign({}, grund, { durchgang: 2 })).zahl
    ]);
    gleich(zahlen.size, 5, "fünf verschiedene");
    /* Durchgänge 1–500 eines Spielers: keine zwei gleich. */
    const d = new Set();
    for (let i = 1; i <= 500; i++) {
        d.add(Z.spielSeed({ spieler: "a", welt: "turm", durchgang: i }).zahl);
    }
    gleich(d.size, 500, "500 Durchgänge");
});

pruefe("Version: steht im Seed, eine gespeicherte bleibt, eine unbekannte wird die neueste", () => {
    gleich(Z.VERSION, 1, "neueste Version");
    wahr(Z.VERSIONEN.indexOf(Z.VERSION) !== -1, "die neueste ist bekannt");
    gleich(Z.version(1), 1, "gespeicherte Version 1");
    gleich(Z.version(undefined), Z.VERSION, "ohne Angabe die neueste");
    gleich(Z.version(99), Z.VERSION, "unbekannte → neueste");
    const s = Z.spielSeed({ spieler: "a", welt: "turm", version: 1 });
    gleich(s.version, 1, "am Seed");
    gleich(Z.folge(s).version, 1, "an der Folge");
    /* Festgenagelt: Version 1 rechnet für immer genau so (laufende Durchgänge). */
    const f = Z.folge(12345, 1);
    gleich(ziehen(f, 3).map((x) => x.toFixed(10)).join(","), "0.9797282678,0.3067522645,0.4842054215", "v1-Folge");
    gleich(Z.hash("upcrew"), 1420470748, "Hash");
});

pruefe("Tages-Seed: für alle gleich, je Tag und Zweck anders", () => {
    const a = Z.tagesSeed("2026-09-30", "tagesbrett");
    gleich(a.text, "tag|2026-09-30|tagesbrett|v1", "Text ohne Spieler");
    gleich(a.hex, "015F8893", "festgenagelt");
    wahr(Z.tagesSeed("2026-10-01", "tagesbrett").zahl !== a.zahl, "anderer Tag");
    wahr(Z.tagesSeed("2026-09-30", "tageswort").zahl !== a.zahl, "anderer Zweck");
    wahr(/^\d{4}-\d{2}-\d{2}$/.test(Z.heute()), "heute im Format JJJJ-MM-TT");
    gleich(Z.heute(new Date(2026, 8, 30, 23, 30).getTime()), "2026-09-30", "Uhr des Geräts");
});

pruefe("Verteilung: Zahlen in [0, 1) gleichmäßig (10 Fächer, 100 000 Ziehungen, ±3 %)", () => {
    const f = Z.folge(Z.tagesSeed("2026-09-30", "verteilung"));
    const faecher = new Array(10).fill(0);
    for (let i = 0; i < 100000; i++) {
        const x = f();
        wahr(x >= 0 && x < 1, "im Bereich");
        faecher[Math.floor(x * 10)]++;
    }
    for (const n of faecher) {
        wahr(Math.abs(n - 10000) < 300, "Fach " + n);
    }
});

pruefe("Helfer: ganz, zwischen (beide Enden), chance, eins, mischen, gewichtet", () => {
    const f = Z.folge(Z.spielSeed({ spieler: "helfer" }));
    const wuerfel = new Array(6).fill(0);
    for (let i = 0; i < 60000; i++) {
        wuerfel[f.ganz(6)]++;
    }
    for (const n of wuerfel) {
        wahr(Math.abs(n - 10000) < 400, "Würfel " + n);
    }
    const ende = new Set();
    for (let i = 0; i < 2000; i++) {
        ende.add(f.zwischen(15, 17));
    }
    gleich([...ende].sort().join(","), "15,16,17", "zwischen mit beiden Enden");
    let ja = 0;
    for (let i = 0; i < 20000; i++) {
        ja += f.chance(0.1) ? 1 : 0;
    }
    wahr(Math.abs(ja - 2000) < 200, "chance 10 %: " + ja);
    const liste = [1, 2, 3, 4, 5, 6, 7, 8];
    const gemischt = f.mischen(liste);
    gleich(gemischt.slice().sort().join(","), liste.join(","), "mischen ist eine Umordnung");
    gleich(liste.join(","), "1,2,3,4,5,6,7,8", "die alte Liste bleibt");
    wahr(liste.indexOf(f.eins(liste)) !== -1, "eins aus der Liste");
    const zaehl = { g: 0, e: 0, x: 0 };
    for (let i = 0; i < 30000; i++) {
        zaehl[f.gewichtet({ g: 3, e: 1, x: 0 })]++;
    }
    gleich(zaehl.x, 0, "Gewicht 0 nie");
    wahr(Math.abs(zaehl.g / 30000 - 0.75) < 0.02, "Gewicht 3:1 → " + zaehl.g);
});

pruefe("Zweige: eine Ziehung mehr im Stamm verschiebt keinen Zweig", () => {
    const s = Z.spielSeed({ spieler: "zweig" });
    const a = Z.folge(s);
    const b = Z.folge(s);
    b();
    b();
    gleich(ziehen(a.zweig("truhe"), 10).join(","), ziehen(b.zweig("truhe"), 10).join(","), "Zweig gleich");
    wahr(ziehen(a.zweig("truhe"), 3).join() !== ziehen(a.zweig("wege"), 3).join(), "Zweige unterscheiden sich");
});

pruefe("Kein Math.random im Baustein; Blunderluck lädt ihn vor dem Turm", () => {
    const quelle = fs.readFileSync(pfad.join(__dirname, "..", "js", "upcrew-zufall.js"), "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "");
    wahr(quelle.indexOf("Math.random") === -1, "ohne Math.random");
    const html = fs.readFileSync(pfad.join(__dirname, "..", "index.html"), "utf8");
    const z = html.indexOf("js/upcrew-zufall.js");
    wahr(z !== -1 && z < html.indexOf("js/turm.js"), "vor js/turm.js");
});

console.log(anzahlOk + " ok, " + anzahlFehler + " Fehler");
process.exit(anzahlFehler === 0 ? 0 : 1);
