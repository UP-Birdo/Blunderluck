/*
 * test-flamme.js — die Serien-Flamme im Kurzprofil (seit v0.151.18, gemeinsamer Baustein js\upcrew-flamme.js;
 * Nutzer 27.09.2026: „ein Kreis mit einer Flamme und in der Flamme die Anzeige, ausgelegt für 3 Stellen, alles
 * drüber 1k+ … sync mit deinem Profil“).
 *
 * Geprüft: Anzeige (0/7/99/999/1000/2500), Zustände, der gebaute Knopf, die Serie aus BEIDEN Zweigen (eine
 * Tagesaufgabe in Blunderluck ODER Typoluck zählt), die Einbindung (Kurzprofil, Aktualisieren bei neuem Stand).
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
const F = require(pfad.join(projekt, "js", "upcrew-flamme.js"));
const FORTSCHRITT = require(pfad.join(projekt, "js", "fortschritt.js"));

pruefe("Anzeige: drei Stellen, ab 1000 kurz k+", () => {
    const soll = { 0: "0", 7: "7", 99: "99", 999: "999", 1000: "1k+", 2500: "2k+", 12345: "12k+" };
    for (const [serie, text] of Object.entries(soll)) {
        gleich(F.anzeige(Number(serie)), text, "Serie " + serie);
    }
    gleich(F.anzeige(-3), "0", "negativ");
    gleich(F.anzeige(undefined), "0", "leer");
    for (const n of [0, 5, 99, 999, 1000, 9999, 99999]) {
        wahr(F.anzeige(n).length <= 4, n + " bleibt kurz");
    }
});

pruefe("Zustände: aus, voll, offen", () => {
    gleich(F.zustand({ serie: 0, heuteGeschafft: true }), "aus", "Serie 0 ist aus");
    gleich(F.zustand({ serie: 5, heuteGeschafft: true }), "voll", "heute geschafft");
    gleich(F.zustand({ serie: 5, heuteGeschafft: false }), "offen", "heute offen");
    /* Seit v0.157.0 ohne Serien-Schutz: ein alter Wert wird still übergangen. */
    wahr(!/Schutz/.test(F.beschriftung({ serie: 3, heuteGeschafft: false, schutz: 2 })), "kein Schutz im Vorlesetext");
});

pruefe("Der Knopf: Klassen, Zahl, kein Schild, Vorlesetext", () => {
    const el = (tag) => ({
        tag, kinder: [], className: "", textContent: "", attribute: {}, title: "", lauscher: {},
        appendChild(k) { this.kinder.push(k); return k; }, setAttribute(n, w) { this.attribute[n] = w; },
        addEventListener(n, f) { this.lauscher[n] = f; }
    });
    global.document = { createElement: el, createElementNS: (ns, tag) => el(tag) };
    try {
        const halter = el("div");
        let geklickt = false;
        const f = F.bauen(halter, { beiKlick: () => { geklickt = true; } });
        gleich(halter.kinder[0], f.el, "angehängt");
        gleich(f.el.className, "up-fl up-fl-aus", "Start: aus");
        f.setzen({ serie: 1234, heuteGeschafft: true, schutz: 1 });
        gleich(f.el.className, "up-fl up-fl-voll", "voll, ein alter Schutz-Wert zeigt kein Schild");
        gleich(f.el.kinder[1].textContent, "1k+", "Zahl");
        wahr(/Serie 1234 Tage/.test(f.el.attribute["aria-label"]), "Vorlesetext");
        f.setzen({ serie: 3, heuteGeschafft: false, schutz: 0 });
        gleich(f.el.className, "up-fl up-fl-offen", "offen ohne Schutz");
        f.el.lauscher.click();
        wahr(geklickt, "Klick");
    } finally {
        delete global.document;
    }
});

pruefe("Serie aus BEIDEN Zweigen: Blunderluck ODER Typoluck hält sie am Leben", () => {
    const stand = { version: 1, spiele: {
        blunderluck: { xp: 0, partien: 0, gezaehlt: [], stand: 1, tage: ["2026-09-25", "2026-09-27"] },
        typoluck: { xp: 0, partien: 0, gezaehlt: [], stand: 1, tage: ["2026-09-26"] }
    } };
    const s = FORTSCHRITT.serie(stand, "2026-09-27", 0);
    gleich([s.tage, s.heute], [3, true], "25. (B) + 26. (T) + 27. (B)");
    const morgen = FORTSCHRITT.serie(stand, "2026-09-28", 0);
    gleich([morgen.tage, morgen.heute], [3, false], "morgen noch offen, Serie läuft");
    gleich(F.zustand({ serie: morgen.tage, heuteGeschafft: morgen.heute }), "offen", "Flamme gedämpft");
});

pruefe("Eingebunden: Kurzprofil, Tipp zu Aufgaben, Aktualisieren bei neuem Stand, offline", () => {
    const start = lesen("js/start.js");
    wahr(/START\._flammeBauen\(oben, START\._kopfFlamme\)/.test(start), "im Kurzprofil (seit v0.157.0 die Flamme der Kopfzeile)");
    wahr(/TABS\.wechseln\("herausforderungen"\)/.test(start), "Tipp führt zu Aufgaben");
    wahr(/FORTSCHRITT_KONTO\.beiAenderung\(\(\) => START\.flammeAktualisieren\(\)\)/.test(start), "nach Tagesaufgabe");
    wahr(/START\.flammeAktualisieren\(\)/.test(lesen("js/app.js")), "wenn der Konto-Stand eintrifft");
    const index = lesen("index.html");
    wahr(index.indexOf("js/upcrew-flamme.js") !== -1 && index.indexOf("css/upcrew-flamme.css") !== -1, "index.html");
    const sw = lesen("sw.js");
    wahr(sw.indexOf("\"./js/upcrew-flamme.js\"") !== -1 && sw.indexOf("\"./css/upcrew-flamme.css\"") !== -1, "offline");
    const css = lesen("css/upcrew-flamme.css").replace(/\/\*[\s\S]*?\*\//g, "");
    wahr(!/#[0-9a-fA-F]{3,8}\b|rgba?\(/.test(css), "keine festen Farben");
    wahr(/prefers-reduced-motion: reduce[\s\S]*animation: none/.test(css), "ohne Puls bei reduzierter Bewegung");
});

console.log(anzahlOk + " ok, " + anzahlFehler + " Fehler");
process.exit(anzahlFehler === 0 ? 0 : 1);
