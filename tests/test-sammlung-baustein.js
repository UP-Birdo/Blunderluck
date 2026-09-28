/*
 * test-sammlung-baustein.js — das gemeinsame Gerüst der Sammlung (seit v0.151.11,
 * js\upcrew-sammlung.js + css\upcrew-sammlung.css; Nutzer 27.09.2026: „bei beiden Apps soll Sammlung
 * gleich sein und immer gleich bleiben“).
 *
 * Geprüft: der Aufbau nach dem Markup-Vertrag, „NN %“, die reine Sammlung vor dem Balken, die Teile
 * der reinen Sammlung; im Stil nur Farbwelt-Variablen und nur Klassen mit `up-sm-` (plus die zwei
 * Anpassen-Teile, die das Gerüst setzt); Blunderluck nutzt NUR den Baustein für das Gerüst.
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

function element(tag) {
    const el = {
        tagName: tag.toUpperCase(), kinder: [], className: "", textContent: "", attribute: {}, title: "",
        stil: {}, lauscher: {},
        style: { setProperty(n, w) { el.stil[n] = w; } },
        classList: { add(k) { el.className = (el.className + " " + k).trim(); } },
        appendChild(k) { el.kinder.push(k); return k; },
        insertBefore(k, vor) { const i = el.kinder.indexOf(vor); el.kinder.splice(i === -1 ? el.kinder.length : i, 0, k); return k; },
        setAttribute(n, w) { el.attribute[n] = String(w); },
        addEventListener(n, f) { el.lauscher[n] = f; },
        querySelector(sel) {
            const klasse = sel.replace(/^\./, "");
            return el.kinder.find((k) => String(k.className).split(" ").indexOf(klasse) !== -1) || null;
        },
        offsetHeight: 43
    };
    return el;
}

const umgebung = { document: { createElement: element }, console };
umgebung.globalThis = umgebung;
vm.createContext(umgebung);
vm.runInContext(lesen("js/upcrew-sammlung.js"), umgebung);
const U = umgebung.UPCREW_SAMMLUNG;

pruefe("Gerüst nach dem Vertrag: up-sm, Kopf mit Titel und Anteil, Ort", () => {
    const tab = element("section");
    const g = U.bauen(tab, { titel: "Sammlung" });
    wahr(tab.className.split(" ").indexOf("up-sm") !== -1, "up-sm fehlt");
    gleich(tab.kinder.map((k) => k.className), ["up-sm-kopf", "up-sm-ort"], "Kinder");
    gleich(g.kopf.kinder.map((k) => k.className), ["up-sm-titel", "up-sm-anteil"], "Kopf");
    gleich(g.titel.textContent, "Sammlung", "Titel");
    gleich(g.titel.tagName, "H2", "Titel ist h2");
});

pruefe("„NN %“ gerundet, Vorleser-Text und Titel", () => {
    const g = U.bauen(element("section"), {});
    gleich(g.anteilSetzen(2, 3), 67, "Prozent");
    gleich(g.anteil.textContent, "67 %", "Text");
    gleich(g.anteil.attribute["aria-label"], "67 Prozent gesammelt", "Vorleser");
    gleich(g.anteil.title, "2 von 3", "Titel");
    gleich(g.anteilSetzen(0, 0), 0, "nichts");
});

pruefe("Reine Sammlung vor den Balken, Kopfhöhe als --upa-oben", () => {
    const tab = element("section");
    const g = U.bauen(tab, {});
    const regal = element("section");
    const balken = element("div");
    balken.className = "upa-aktion";
    g.ort.appendChild(regal);
    g.ort.appendChild(balken);
    const rest = U.rest();
    g.restEinsetzen(rest);
    gleich(g.ort.kinder.indexOf(rest), 1, "vor dem Balken");
    g.obenSetzen();
    gleich(tab.stil["--upa-oben"], "43px", "Kopfhöhe");
});

pruefe("Teile der reinen Sammlung: Überschrift „Name n/m“, Gitter, Stück", () => {
    const teil = U.teil("Brettformen", 11, 11);
    gleich(teil.className, "upa-regal up-sm-teil", "Teil");
    gleich(teil.kinder[0].textContent, "Brettformen ", "Überschrift");
    gleich(teil.kinder[0].kinder[0].className, "up-sm-zahl", "Zahl");
    gleich(teil.kinder[0].kinder[0].textContent, "11/11", "n/m");
    gleich(U.gitter().className, "up-sm-gitter", "Gitter");
    gleich(U.innen().className, "up-sm-innen", "Innen");
    let geklickt = false;
    const bild = element("span");
    const st = U.stueck({ name: "Kreuz", bild: bild, da: true, beiKlick() { geklickt = true; } });
    gleich(st.className, "up-sm-stueck up-sm-da", "Stück");
    gleich(st.type, "button", "Knopf");
    gleich(st.attribute["aria-label"], "Kreuz", "Name");
    gleich(st.kinder[0], bild, "Bild zuerst");
    gleich(st.kinder[1].className, "up-sm-stueck-name", "Name danach");
    st.lauscher.click();
    wahr(geklickt, "Klick");
    gleich(U.stueck({ name: "x", da: false }).className, "up-sm-stueck", "nicht da");
});

pruefe("Stil: nur Farbwelt-Variablen, nur up-sm-Klassen, Vertrag im Kopf", () => {
    const css = lesen("css/upcrew-sammlung.css");
    const ohneKommentare = css.replace(/\/\*[\s\S]*?\*\//g, "");
    wahr(!/#[0-9a-fA-F]{3,8}\b/.test(ohneKommentare), "feste Farbe (#…)");
    wahr(!/\brgba?\(/.test(ohneKommentare), "feste Farbe (rgb)");
    const klassen = [...new Set((ohneKommentare.match(/\.[a-z][a-z0-9-]*/g) || []))];
    const fremd = klassen.filter((k) => !k.startsWith(".up-sm") && [".upa-vorschau-rahmen", ".upa-aktion",
        /* seit v0.156.0: der Würfel im Balken (Vorschlag an final) */ ".upa-zufall"].indexOf(k) === -1);
    gleich(fremd, [], "fremde Klassen");
    wahr(/MARKUP-VERTRAG/.test(css) && /--up-sm-rand/.test(css) && /--up-sm-leiste/.test(css) && /--oben-frei/.test(css),
        "Vertrag und Stellschrauben im Kopf");
});

pruefe("Ein verborgener Sammlungs-Tab bleibt verborgen (v0.151.15)", () => {
    /* `.up-sm { display: block }` schlug das [hidden] — der Kopf stand auf
       jedem anderen Tab unten im Bild. */
    const stil = lesen("css/stil.css");
    wahr(/\.tab-bereich\[hidden\] \{\s*display: none;/.test(stil), ".tab-bereich[hidden] fehlt in stil.css");
});

pruefe("Blunderluck nutzt nur den Baustein fürs Gerüst", () => {
    const sammlung = lesen("js/sammlung.js");
    wahr(/UPCREW_SAMMLUNG\.bauen\(/.test(sammlung), "bauen");
    wahr(!/partie-kopf|sammel-rest|album-gitter|sammlung-ort|sammlung-anteil/.test(sammlung), "alte Gerüst-Klassen in sammlung.js");
    const stil = lesen("css/stil.css");
    wahr(!/\.sammlung-ort|\.sammlung-kopf|\.sammlung-anteil|\.sammel-|\.album-gitter|\.stueck\s*\{|\.stueck-name/.test(stil),
        "alte Gerüst-Regeln in stil.css");
    const index = lesen("index.html");
    wahr(index.indexOf("css/upcrew-anpassen.css") < index.indexOf("css/upcrew-sammlung.css"), "CSS nach upcrew-anpassen.css");
    wahr(index.indexOf("js/upcrew-sammlung.js") !== -1
        && index.indexOf("js/upcrew-sammlung.js") < index.indexOf("js/sammlung.js"), "JS vor sammlung.js");
    const sw = lesen("sw.js");
    wahr(sw.indexOf("\"./css/upcrew-sammlung.css\"") !== -1 && sw.indexOf("\"./js/upcrew-sammlung.js\"") !== -1, "offline");
});

console.log(anzahlOk + " ok, " + anzahlFehler + " Fehler");
process.exit(anzahlFehler === 0 ? 0 : 1);
