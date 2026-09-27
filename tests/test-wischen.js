/*
 * test-wischen.js — Tabs wechseln durch Wischen (seit v0.151.14, gemeinsamer Baustein js\upcrew-wischen.js;
 * Nutzer 27.09.2026: „mache, dass man in den Menüs swipen kann, um die Tabs zu wechseln“).
 *
 * Reine Logik: Schwellen, Richtung, Überspringen stiller Tabs, Enden; gesperrt in Partie, Dialog, am Rand,
 * auf Eingabefeldern, Regal-Reihen, Umschaltern und allem mit waagrechtem Rollbalken. Dazu die Einbindung.
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

const projekt = pfad.join(__dirname, "..");
const lesen = (name) => fs.readFileSync(pfad.join(projekt, name), "utf8");
const W = require(pfad.join(projekt, "js", "upcrew-wischen.js"));

pruefe("Schwellen und Richtung", () => {
    gleich(W.entscheiden(-80, 10, 400), 1, "nach links weit = nächster Tab rechts");
    gleich(W.entscheiden(80, 10, 400), -1, "nach rechts weit = vorheriger");
    gleich(W.entscheiden(-50, 5, 400), 0, "zu kurz und langsam");
    gleich(W.entscheiden(-40, 5, 60), 1, "kurz, aber schnell");
    gleich(W.entscheiden(-20, 0, 10), 0, "zu kurz, auch wenn schnell");
    gleich(W.entscheiden(-90, 70, 300), 0, "zu schräg (nicht 1,5-mal waagrechter)");
    gleich(W.entscheiden(0, 300, 300), 0, "senkrecht rollen");
});

pruefe("Nachbar: Leisten-Reihenfolge, stille übersprungen, Enden", () => {
    const tabs = ["aufgaben", "sammlung", "start", "rangliste", { id: "bald", still: true }];
    gleich(W.nachbar(tabs, "start", 1), "rangliste", "rechts");
    gleich(W.nachbar(tabs, "start", -1), "sammlung", "links");
    gleich(W.nachbar(tabs, "rangliste", 1), null, "rechts nur noch „Bald“ (still)");
    gleich(W.nachbar(tabs, "aufgaben", -1), null, "linkes Ende");
    gleich(W.nachbar(["a", { id: "b", still: true }, "c"], "a", 1), "c", "stillen überspringen");
    gleich(W.nachbar(tabs, "team-schach", 1), null, "aktiver Tab nicht in der Leiste");
});

function element(klassen, eigen) {
    return Object.assign({
        nodeType: 1, parentElement: null, scrollWidth: 100, clientWidth: 100,
        closest(selektor) {
            const teile = selektor.split(",").map((s) => s.trim());
            return teile.some((t) => klassen.some((k) => t === k)) ? this : null;
        }
    }, eigen || {});
}

const dok = (offen) => ({ querySelectorAll: () => (offen ? [{ getClientRects: () => [1] }] : []) });

pruefe("Start gesperrt: Partie, Dialog, Rand, Eingabe, Regal-Reihe, Umschalter, eigene Sperren", () => {
    const frei = element([]);
    gleich(W.startErlaubt(frei, 200, 390, { dokument: dok(false) }), true, "frei");
    gleich(W.startErlaubt(frei, 200, 390, { dokument: dok(false), erlaubt: () => false }), false, "Partie");
    gleich(W.startErlaubt(frei, 200, 390, { dokument: dok(true) }), false, "Dialog offen");
    gleich(W.startErlaubt(frei, 10, 390, { dokument: dok(false) }), false, "linker Rand (iOS-Zurück)");
    gleich(W.startErlaubt(frei, 380, 390, { dokument: dok(false) }), false, "rechter Rand");
    for (const k of ["input", "textarea", "[data-kein-wischen]", ".upa-reihe", ".upa-mini-seg"]) {
        gleich(W.startErlaubt(element([k]), 200, 390, { dokument: dok(false) }), false, k);
    }
    gleich(W.startErlaubt(element([".brett"]), 200, 390, { dokument: dok(false), sperren: ".brett" }), false,
        "eigene Sperre");
});

pruefe("Start gesperrt in allem, was waagrecht rollt", () => {
    global.getComputedStyle = (e) => ({ overflowX: e.ox || "visible" });
    try {
        const reihe = element([], { scrollWidth: 600, clientWidth: 300, ox: "auto" });
        const kind = element([], { parentElement: reihe });
        gleich(W.startErlaubt(kind, 200, 390, { dokument: dok(false) }), false, "Kind einer Rollreihe");
        const breit = element([], { scrollWidth: 600, clientWidth: 300, ox: "hidden" });
        gleich(W.startErlaubt(element([], { parentElement: breit }), 200, 390, { dokument: dok(false) }), true,
            "abgeschnitten ist nicht rollbar");
    } finally {
        delete global.getComputedStyle;
    }
});

pruefe("Passiv, nur Finger/Stift, touch-action pan-y, reduzierte Bewegung", () => {
    const quelle = lesen("js/upcrew-wischen.js");
    if (/preventDefault/.test(quelle.replace(/\/\*[\s\S]*?\*\//g, ""))) {
        throw new Error("preventDefault — Rollen darf nie blockiert werden");
    }
    if (!/passive: true/.test(quelle)) {
        throw new Error("Horcher nicht passiv");
    }
    if (!/pointerType !== "touch" && e\.pointerType !== "pen"/.test(quelle)) {
        throw new Error("nicht auf Finger/Stift beschränkt");
    }
    if (!/prefers-reduced-motion: reduce/.test(quelle)) {
        throw new Error("reduzierte Bewegung fehlt");
    }
    if (!/touch-action: pan-y pinch-zoom/.test(lesen("css/upcrew-wischen.css"))) {
        throw new Error("touch-action fehlt");
    }
});

pruefe("Rechts und links ist Stopp: kein Rundlauf, am Ende keine Bewegung, Seite fest (v0.151.15)", () => {
    /* Nutzer 27.09.2026: „man soll nicht infinite scrollen können, sprich
       rechts und links ist Stopp". */
    const tabs = ["aufgaben", "sammlung", "start", "rangliste"];
    gleich(W.nachbar(tabs, "rangliste", 1), null, "letzter → kein Sprung zum ersten");
    gleich(W.nachbar(tabs, "aufgaben", -1), null, "erster → kein Sprung zum letzten");
    const quelle = lesen("js/upcrew-wischen.js");
    if (!/const weg = hatZiel \? [^;]* : 0;/.test(quelle)) {
        throw new Error("am Ende ohne Nachbarn muss der Inhalt stehen bleiben (weg = 0)");
    }
    const stil = lesen("css/stil.css");
    const html = stil.slice(stil.indexOf("\nhtml {"), stil.indexOf("}", stil.indexOf("\nhtml {")));
    const body = stil.slice(stil.indexOf("\nbody {"), stil.indexOf("}", stil.indexOf("\nbody {")));
    if (!/overscroll-behavior-x: none/.test(html) || !/overscroll-behavior-x: none/.test(body)) {
        throw new Error("html/body ohne overscroll-behavior-x: none");
    }
    const start = lesen("css/stil-start.css");
    if (!/\.start-art-halter \{[^}]*flex: 0 0 74px/.test(start)) {
        throw new Error("das Quadrat am Start hat keine feste Seite (ragte 7 px über den Rand)");
    }
});

pruefe("Wandernde Kapsel der Leiste eingebunden (v0.151.16)", () => {
    const app = lesen("js/app.js");
    if (!/UPCREW_LEISTE\.an\(TABS\.leisteEl\)/.test(app)) {
        throw new Error("UPCREW_LEISTE.an(TABS.leisteEl) fehlt in app.js");
    }
    const index = lesen("index.html");
    const js = index.indexOf("js/upcrew-leiste.js");
    if (js === -1 || js > index.indexOf("js/app.js") || index.indexOf("css/upcrew-leiste.css") === -1
            || index.indexOf("css/upcrew-leiste.css") > js) {
        throw new Error("index.html: CSS vor JS, JS vor app.js");
    }
    if (lesen("sw.js").indexOf("\"./js/upcrew-leiste.js\"") === -1) {
        throw new Error("offline");
    }
    if (!/prefers-reduced-motion: reduce[\s\S]*\.up-kapsel/.test(lesen("css/upcrew-leiste.css"))) {
        throw new Error("reduzierte Bewegung für die Kapsel fehlt");
    }
});

pruefe("Blunderluck: eingebunden über TABS, nicht in der Partie", () => {
    const app = lesen("js/app.js");
    if (!/UPCREW_WISCHEN\.an\(TABS\.inhaltEl/.test(app) || !/wechseln: \(id\) => TABS\.wechseln\(id\)/.test(app)) {
        throw new Error("nicht über TABS.wechseln eingebunden");
    }
    if (!/partie-spielt/.test(app.slice(app.indexOf("UPCREW_WISCHEN.an(")))) {
        throw new Error("während der Partie nicht gesperrt");
    }
    const index = lesen("index.html");
    if (index.indexOf("js/upcrew-wischen.js") === -1 || index.indexOf("js/upcrew-wischen.js") > index.indexOf("js/app.js")
            || index.indexOf("css/upcrew-wischen.css") === -1) {
        throw new Error("index.html");
    }
    const sw = lesen("sw.js");
    if (sw.indexOf("\"./js/upcrew-wischen.js\"") === -1 || sw.indexOf("\"./css/upcrew-wischen.css\"") === -1) {
        throw new Error("offline");
    }
});

console.log(anzahlOk + " ok, " + anzahlFehler + " Fehler");
process.exit(anzahlFehler === 0 ? 0 : 1);
