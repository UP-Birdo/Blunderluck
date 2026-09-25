/*
 * test-zustand-fuehlen.js — die Bausteine des UPCrew-Standards (seit
 * v0.140.0): ZUSTAND (Laden, Leer, Fehler), FUEHLEN (Vibration) und der
 * Vibrations-Schalter in ICH.
 *
 * Geladen werden die ECHTEN Dateien aus js\ in eine eigene Umgebung mit
 * einem kleinen nachgebauten DOM — nur so viel, wie die Bausteine brauchen.
 * Die Vibration landet in einem Ersatz-`navigator`, der mitschreibt.
 *
 * Aufruf (siehe README.md):  Code.exe mit ELECTRON_RUN_AS_NODE=1, Datei als Argument
 */

"use strict";

const pfad = require("path");
const dateisystem = require("fs");
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

function wahr(bedingung, text) {
    if (!bedingung) {
        throw new Error(text);
    }
}

/* ------------------------------------------------------------------ *
 * Ein kleines DOM
 * ------------------------------------------------------------------ */

function neuesElement(tag) {
    const element = {
        tagName: String(tag).toUpperCase(),
        kinder: [],
        parentNode: null,
        attribute: {},
        className: "",
        textContent: "",
        title: "",
        disabled: false,
        zuhoerer: {},
        get isConnected() {
            let knoten = this;
            while (knoten.parentNode) {
                knoten = knoten.parentNode;
            }
            return knoten === dokument.body;
        },
        setAttribute(name, wert) { this.attribute[name] = String(wert); },
        getAttribute(name) { return this.attribute[name]; },
        appendChild(kind) {
            kind.parentNode = this;
            this.kinder.push(kind);
            return kind;
        },
        replaceChild(neu, alt) {
            const stelle = this.kinder.indexOf(alt);
            this.kinder[stelle] = neu;
            neu.parentNode = this;
            alt.parentNode = null;
        },
        addEventListener(art, behandler) {
            (this.zuhoerer[art] = this.zuhoerer[art] || []).push(behandler);
        },
        klicken() {
            for (const behandler of this.zuhoerer.click || []) {
                behandler();
            }
        },
        /* Nur die eine Form, die FUEHLEN.einrichten benutzt: das Element
           selbst oder ein Vorfahr mit passendem Tag. */
        closest(auswahl) {
            const tags = auswahl.split(",").map((teil) => teil.trim().split(/[[.]/)[0].toUpperCase());
            let knoten = this;
            while (knoten) {
                if (tags.indexOf(knoten.tagName) !== -1) {
                    return knoten;
                }
                knoten = knoten.parentNode;
            }
            return null;
        }
    };
    return element;
}

/* Alle Nachfahren, die eine Klasse tragen. */
function finden(wurzel, klasse) {
    const funde = [];
    const laufen = (knoten) => {
        if ((" " + knoten.className + " ").indexOf(" " + klasse + " ") !== -1) {
            funde.push(knoten);
        }
        (knoten.kinder || []).forEach(laufen);
    };
    laufen(wurzel);
    return funde;
}

const dokument = {
    body: null,
    zuhoerer: {},
    createElement: neuesElement,
    createElementNS(namensraum, tag) { return neuesElement(tag); },
    addEventListener(art, behandler) {
        (this.zuhoerer[art] = this.zuhoerer[art] || []).push(behandler);
    }
};
dokument.body = neuesElement("body");

/* Zeitgeber, die der Test von Hand ablaufen lässt. */
const zeitgeber = [];

/* Der Ersatz-navigator schreibt jedes Muster mit. */
const vibriert = [];
const umgebung = {
    console,
    document: dokument,
    navigator: { vibrate(muster) { vibriert.push(muster); return true; } },
    window: {
        setTimeout(funktion, ms) { zeitgeber.push({ funktion, ms }); return zeitgeber.length; },
        localStorage: (() => {
            const inhalt = {};
            return {
                getItem(s) { return Object.prototype.hasOwnProperty.call(inhalt, s) ? inhalt[s] : null; },
                setItem(s, w) { inhalt[s] = String(w); },
                removeItem(s) { delete inhalt[s]; },
                _inhalt: inhalt
            };
        })()
    }
};
umgebung.globalThis = umgebung;
vm.createContext(umgebung);

const jsOrdner = pfad.join(__dirname, "..", "js");
const quelltext = ["ich.js", "fuehlen.js", "zustand.js"]
    .map((name) => dateisystem.readFileSync(pfad.join(jsOrdner, name), "utf8"))
    .join("\n;\n")
    + "\nObject.assign(globalThis, { ICH, FUEHLEN, ZUSTAND });";
vm.runInContext(quelltext, umgebung, { filename: "zustand-umgebung.js" });

const { ICH, FUEHLEN, ZUSTAND } = umgebung;

/* ------------------------------------------------------------------ *
 * ICH: der Schalter
 * ------------------------------------------------------------------ */

pruefe("Vibration ist ab Werk an (nichts gespeichert)", () => {
    wahr(ICH.vibrationAn() === true, "ab Werk nicht an");
});

pruefe("Abschalten wird gemerkt, Anschalten löscht den Eintrag wieder", () => {
    ICH.vibrationSetzen(false);
    wahr(ICH.vibrationAn() === false, "nach Abschalten noch an");
    wahr(umgebung.window.localStorage._inhalt["blunderluck.vibration"] === "false",
        "nicht unter blunderluck.vibration gespeichert");
    ICH.vibrationSetzen(true);
    wahr(ICH.vibrationAn() === true, "nach Anschalten noch aus");
    wahr(!("blunderluck.vibration" in umgebung.window.localStorage._inhalt),
        "Eintrag blieb nach Anschalten stehen");
});

/* ------------------------------------------------------------------ *
 * FUEHLEN
 * ------------------------------------------------------------------ */

pruefe("Die drei Muster gehen an navigator.vibrate", () => {
    vibriert.length = 0;
    wahr(FUEHLEN.tippen() === true, "tippen meldet kein Vibrieren");
    FUEHLEN.erfolg();
    FUEHLEN.fehler();
    wahr(JSON.stringify(vibriert) === JSON.stringify([8, [20, 60, 20, 60, 60], [70, 50, 70]]),
        "Muster: " + JSON.stringify(vibriert));
});

pruefe("Ausgeschaltet vibriert nichts", () => {
    vibriert.length = 0;
    FUEHLEN.anSetzen(false);
    wahr(FUEHLEN.tippen() === false && vibriert.length === 0, "vibriert trotz Aus");
    FUEHLEN.anSetzen(true);
});

pruefe("Ohne navigator.vibrate (iPhone) still nichts, kein Fehler", () => {
    const echt = umgebung.navigator;
    umgebung.navigator = {};
    try {
        wahr(FUEHLEN.verfuegbar() === false, "verfuegbar ohne vibrate");
        wahr(FUEHLEN.fehler() === false, "meldet Vibrieren ohne vibrate");
    } finally {
        umgebung.navigator = echt;
    }
});

pruefe("Ein werfender Browser bricht nichts", () => {
    const echt = umgebung.navigator;
    umgebung.navigator = { vibrate() { throw new Error("noch nicht angetippt"); } };
    try {
        wahr(FUEHLEN.tippen() === false, "Fehler nicht abgefangen");
    } finally {
        umgebung.navigator = echt;
    }
});

pruefe("einrichten: ein Knopf vibriert beim Drücken, ein gesperrter nicht, das Brett nicht", () => {
    FUEHLEN.einrichten(dokument);
    const behandler = dokument.zuhoerer.pointerdown[0];
    wahr(typeof behandler === "function", "kein pointerdown-Zuhörer");

    const knopf = neuesElement("button");
    const wort = knopf.appendChild(neuesElement("span"));
    vibriert.length = 0;
    behandler({ target: wort });
    wahr(vibriert.length === 1 && vibriert[0] === 8, "Druck auf das Wort im Knopf vibriert nicht");

    knopf.disabled = true;
    behandler({ target: knopf });
    wahr(vibriert.length === 1, "gesperrter Knopf vibriert");

    behandler({ target: neuesElement("canvas") });
    wahr(vibriert.length === 1, "das 3D-Brett vibriert bei jedem Berühren");
});

/* ------------------------------------------------------------------ *
 * ZUSTAND
 * ------------------------------------------------------------------ */

pruefe("Leer: Zeichen, Text, und der Knopf hilft weiter", () => {
    let gedrueckt = 0;
    const feld = ZUSTAND.leer({ zeichen: "menschen", text: "Keine Freunde",
        aktion: { text: "Suchen", beiKlick: () => { gedrueckt++; } } });
    wahr(feld.className === "zustand zustand-leer", "Klasse: " + feld.className);
    wahr(finden(feld, "zustand-text")[0].textContent === "Keine Freunde", "Text fehlt");
    const knopf = finden(feld, "knopf")[0];
    wahr(knopf && knopf.textContent === "Suchen" && knopf.type === "button", "Knopf fehlt");
    knopf.klicken();
    wahr(gedrueckt === 1, "Knopf ruft die Aktion nicht");
});

pruefe("Leer ohne Aktion hat keinen Knopf", () => {
    wahr(finden(ZUSTAND.leer({ text: "Keine Punkte" }), "knopf").length === 0, "Knopf ohne Aktion");
});

pruefe("Fehler: Nochmal wiederholt den Schritt, die Technik steht nur im title", () => {
    let wiederholt = 0;
    const feld = ZUSTAND.fehler({ text: "Kein Netz", technik: "HTTP 503",
        nochmal: () => { wiederholt++; } });
    wahr(feld.title === "HTTP 503", "title: " + feld.title);
    wahr(finden(feld, "zustand-text")[0].textContent === "Kein Netz", "Text fehlt");
    const knopf = finden(feld, "knopf")[0];
    wahr(knopf.textContent === "Nochmal", "Nochmal fehlt");
    knopf.klicken();
    wahr(wiederholt === 1, "Nochmal ruft nichts");
});

pruefe("Laden: Balken, und nach der Grenze wird daraus der Fehler mit Nochmal", () => {
    zeitgeber.length = 0;
    let wiederholt = 0;
    const halter = dokument.body.appendChild(neuesElement("div"));
    const platzhalter = halter.appendChild(ZUSTAND.laden({ zeilen: 4, nochmal: () => { wiederholt++; } }));
    wahr(finden(platzhalter, "zustand-balken").length === 4, "nicht vier Balken");
    wahr(zeitgeber.length === 1 && zeitgeber[0].ms === ZUSTAND.LADEN_GRENZE_MS, "keine Grenze gestellt");
    wahr(ZUSTAND.LADEN_GRENZE_MS === 10000, "Grenze ist nicht 10 Sekunden");

    zeitgeber[0].funktion();
    const jetzt = halter.kinder[0];
    wahr(jetzt.className === "zustand zustand-fehler", "kein Fehler nach der Grenze: " + jetzt.className);
    finden(jetzt, "knopf")[0].klicken();
    wahr(wiederholt === 1, "Nochmal nach der Grenze ruft nichts");
});

pruefe("Laden: Kam die Antwort vorher (Platzhalter ersetzt), tut die Grenze nichts", () => {
    zeitgeber.length = 0;
    const halter = dokument.body.appendChild(neuesElement("div"));
    const platzhalter = halter.appendChild(ZUSTAND.laden({}));
    const inhalt = neuesElement("p");
    halter.replaceChild(inhalt, platzhalter);
    zeitgeber[0].funktion();
    wahr(halter.kinder[0] === inhalt, "der Inhalt wurde durch den Fehler ersetzt");
});

pruefe("Jedes Zeichen ist ein SVG mit rundem Strich 1,8", () => {
    for (const name of Object.keys(ZUSTAND.ZEICHEN)) {
        const svg = ZUSTAND.zeichen(name);
        const strich = svg.kinder[0].attribute;
        wahr(svg.tagName === "SVG" && strich["stroke-width"] === "1.8"
            && strich["stroke-linecap"] === "round", name + " weicht ab");
    }
});

console.log(anzahlOk + " ok, " + anzahlFehler + " Fehler");
process.exit(anzahlFehler === 0 ? 0 : 1);
