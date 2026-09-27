/*
 * test-aussehen.js — Regressionstests der UPCrew-Angleichung Runde 3
 * (seit v0.144.0): EIN Aussehen, eigene Schrift, eigene Knöpfe, Tab
 * „Anpassen", 3D-Brett als Freischaltung.
 *
 * Geprüft werden die ECHTEN Dateien:
 *   - js\knoepfe.js: welcher Haus-Knopf welche UPCrew-Klasse bekommt, dass
 *     Spielgrafik und Auswahl-Reihen ausgenommen bleiben, dass up-led als
 *     erstes Kind kommt und nach einem Textwechsel zurückkommt;
 *   - js\freischaltung.js: 2D ist die Vorgabe, 3D nur, wenn frei —
 *     SPERRE_3D aus (heute) und an (sobald die Arena-Leiter kommt),
 *     Werkstatt nur auf dem eigenen Rechner;
 *   - die Stildateien: keine eigene Form-Regel mehr für Haus-Knöpfe (sie
 *     schlüge die Knopf-Familie, die in einer Ebene liegt), keine feste
 *     Schrift ausser Festbreite für Codes;
 *   - index.html und app.js: Ladereihenfolge des Aussehens, die fünf Plätze
 *     der Leiste.
 *
 * Aufruf: siehe tests\README.md
 */

const pfad = require("path");
const dateisystem = require("fs");

const projekt = pfad.join(__dirname, "..");

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

/* ------------------------------------------------------------------ *
 * Ein winziges Element — gerade genug für js\knoepfe.js
 * ------------------------------------------------------------------ */

function element(tag, klassen, eltern) {
    const el = {
        nodeType: 1,
        tagName: tag.toUpperCase(),
        _klassen: new Set(klassen || []),
        children: [],
        parent: eltern || null,
        attribute: {},
        setAttribute(name, wert) { this.attribute[name] = wert; },
        get className() { return [...this._klassen].join(" "); },
        set className(text) { this._klassen = new Set(String(text).split(/\s+/).filter(Boolean)); },
        get firstElementChild() { return this.children[0] || null; },
        get firstChild() { return this.children[0] || null; },
        insertBefore(neu, vor) {
            const stelle = vor ? this.children.indexOf(vor) : -1;
            if (stelle === -1) this.children.push(neu); else this.children.splice(stelle, 0, neu);
            neu.parent = this;
        },
        querySelector(sel) {
            /* nur ":scope > .up-led" wird gebraucht */
            return this.children.find((k) => k._klassen.has("up-led")) || null;
        },
        remove() {
            if (this.parent) this.parent.children.splice(this.parent.children.indexOf(this), 1);
        },
        closest(liste) {
            const gesucht = liste.split(",").map((s) => s.trim().replace(/^\./, ""));
            for (let el = this; el; el = el.parent) {
                if (gesucht.some((k) => el._klassen.has(k))) return el;
            }
            return null;
        },
        set textContent(text) { this.children = []; this._text = text; }
    };
    el.classList = {
        contains: (k) => el._klassen.has(k),
        add: (...k) => k.forEach((x) => el._klassen.add(x)),
        remove: (...k) => k.forEach((x) => el._klassen.delete(x)),
        toggle: (k, an) => { if (an) el._klassen.add(k); else el._klassen.delete(k); }
    };
    return el;
}

globalThis.document = { createElement: (tag) => element(tag), body: null };

const KNOEPFE = require(pfad.join(projekt, "js", "knoepfe.js"));

pruefe("Knöpfe: haupt/still/gefahr werden up-haupt/up-zweit/up-gefahr (v0.144.0)", () => {
    for (const [haus, up] of [["knopf-haupt", "up-haupt"], ["knopf-still", "up-zweit"], ["knopf-gefahr", "up-gefahr"]]) {
        const k = element("button", ["knopf", haus]);
        wahr(KNOEPFE.gestalten(k), haus + " wird umgestellt");
        wahr(k.classList.contains("up-kn") && k.classList.contains(up), haus + " → " + up);
        wahr(k.classList.contains(haus), "die Haus-Klasse bleibt stehen");
        wahr(k.firstElementChild && k.firstElementChild.classList.contains("up-led"), "up-led als erstes Kind");
    }
});

pruefe("Knöpfe: der Zwei-Schritt-Knopf (still + gefahr) wird rot, einmal up-led", () => {
    const k = element("button", ["knopf", "knopf-still", "knopf-gefahr", "knopf-wirklich"]);
    KNOEPFE.gestalten(k);
    KNOEPFE.gestalten(k);
    wahr(k.classList.contains("up-gefahr") && !k.classList.contains("up-zweit"), "Gefahr geht vor");
    gleich(k.children.length, 1, "nur ein up-led nach zwei Durchläufen");

    /* Zurück in Ruhe: Klasse ohne Gefahr → wieder zweit. */
    k.className = "knopf knopf-still";
    KNOEPFE.gestalten(k);
    wahr(k.classList.contains("up-zweit") && !k.classList.contains("up-gefahr"), "zurück zu zweit");
});

pruefe("Knöpfe: nach einem Textwechsel kommt up-led wieder", () => {
    const k = element("button", ["knopf", "knopf-haupt"]);
    KNOEPFE.gestalten(k);
    k.textContent = "Übernommen";
    gleich(k.children.length, 0, "Text ersetzt das up-led");
    KNOEPFE.gestalten(k);
    wahr(k.firstElementChild && k.firstElementChild.classList.contains("up-led"), "wieder da");
});

pruefe("Knöpfe: der Zurück-Pfeil ist up-rund, der kleine Eck-Knopf nicht", () => {
    const zurueck = element("button", ["knopf", "knopf-still", "knopf-klein", "knopf-zurueck"]);
    KNOEPFE.gestalten(zurueck);
    wahr(zurueck.classList.contains("up-rund"), "Zurück ist rund");
    const eck = element("button", ["knopf", "knopf-still", "knopf-klein", "eck-knopf"]);
    KNOEPFE.gestalten(eck);
    wahr(eck.classList.contains("up-kn") && !eck.classList.contains("up-rund"), "Eck-Knopf behält seine Größe");
});

pruefe("Knöpfe: Spielgrafik und Auswahl-Reihen bleiben, wie sie sind", () => {
    for (const klasse of KNOEPFE.AUSNAHME_KLASSEN) {
        const k = element("button", ["knopf", "knopf-still", klasse]);
        wahr(!KNOEPFE.gestalten(k) && !k.classList.contains("up-kn"), klasse + " bleibt");
        gleich(k.children.length, 0, klasse + " ohne up-led");
    }
    const reihe = element("div", ["mengen-leiste"]);
    const inReihe = element("button", ["knopf", "knopf-still"], reihe);
    wahr(!KNOEPFE.gestalten(inReihe), "Segment in der Auswahl-Reihe bleibt");
    const ohneArt = element("button", ["knopf", "team-knopf"]);
    wahr(!KNOEPFE.gestalten(ohneArt), "ohne haupt/still/gefahr bleibt er");

    /* Wird ein umgestellter Knopf zur Ausnahme (Armee-Knopf wird aktiv),
       kommt alles UPCrew-Eigene wieder weg. */
    const armee = element("button", ["knopf", "knopf-still"]);
    KNOEPFE.gestalten(armee);
    armee.classList.add("armee-knopf");
    KNOEPFE.gestalten(armee);
    wahr(!armee.classList.contains("up-kn") && armee.children.length === 0, "zurückgebaut");
});

/* ------------------------------------------------------------------ *
 * Freischaltung: 2D/3D
 * ------------------------------------------------------------------ */

const speicher = {};
globalThis.localStorage = {
    getItem: (k) => (k in speicher ? speicher[k] : null),
    setItem: (k, v) => { speicher[k] = String(v); }
};
globalThis.location = { hostname: "up-birdo.github.io", search: "" };

const FREISCHALTUNG = require(pfad.join(projekt, "js", "freischaltung.js"));

pruefe("Freischaltung: 2D ist die Vorgabe, 3D wählbar, solange die Sperre aus ist", () => {
    gleich(FREISCHALTUNG.SPERRE_3D, false, "SPERRE_3D steht aus, bis die Arena-Leiter live ist");
    gleich(FREISCHALTUNG.stufe(), 0, "Pfad gibt es noch nicht");
    gleich(FREISCHALTUNG.brett(), "2d", "ohne Wahl 2D");
    gleich(FREISCHALTUNG.brettSetzen("3d"), "3d", "3D wählbar");
    gleich(FREISCHALTUNG.brett(), "3d", "3D gemerkt");
    gleich(JSON.parse(speicher["blunderluck.brett3d"]).an, true, "im Speicher des 3D-Bretts");
    FREISCHALTUNG.brettSetzen("2d");
    gleich(FREISCHALTUNG.brett(), "2d", "zurück auf 2D");
});

pruefe("Freischaltung: mit Sperre gilt 3D erst ab Arena 2 oder in der Werkstatt", () => {
    FREISCHALTUNG.SPERRE_3D = true;
    try {
        speicher["blunderluck.brett3d"] = JSON.stringify({ an: true, thema: "holz" });
        gleich(FREISCHALTUNG.dreiDFrei(), false, "Arena 0: gesperrt");
        gleich(FREISCHALTUNG.brett(), "2d", "gespeichertes an=true wird übergangen");
        gleich(FREISCHALTUNG.brettSetzen("3d"), "2d", "gesperrt lässt sich 3D nicht setzen");
        gleich(JSON.parse(speicher["blunderluck.brett3d"]).thema, "holz", "übrige Brett-Wahl bleibt");

        globalThis.location = { hostname: "up-birdo.github.io", search: "?werkstatt" };
        gleich(FREISCHALTUNG.werkstatt(), false, "im Netz gibt es keine Werkstatt");
        globalThis.location = { hostname: "localhost", search: "?werkstatt" };
        gleich(FREISCHALTUNG.werkstatt(), true, "auf dem eigenen Rechner schon");
        gleich(FREISCHALTUNG.dreiDFrei(), true, "Werkstatt schaltet 3D frei");

        const arena = FREISCHALTUNG.arena;
        globalThis.location = { hostname: "localhost", search: "" };
        FREISCHALTUNG.arena = () => 2;
        gleich(FREISCHALTUNG.dreiDFrei(), true, "Arena 2 schaltet 3D frei");
        FREISCHALTUNG.arena = () => 1;
        gleich(FREISCHALTUNG.dreiDFrei(), false, "Arena 1 noch nicht");
        FREISCHALTUNG.arena = arena;
    } finally {
        FREISCHALTUNG.SPERRE_3D = false;
        globalThis.location = { hostname: "up-birdo.github.io", search: "" };
    }
});

/* ------------------------------------------------------------------ *
 * Die Stildateien
 * ------------------------------------------------------------------ */

const EIGENE_STILE = dateisystem.readdirSync(pfad.join(projekt, "css"))
    .filter((name) => /^stil.*\.css$/.test(name));

function regeln(quelle) {
    const ohne = quelle.replace(/\/\*[\s\S]*?\*\//g, "");
    return [...ohne.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
        .map((t) => ({ selektor: t[1].trim().replace(/\s+/g, " "), inhalt: t[2] }));
}

/*
 * DIE KNOPF-FAMILIE LIEGT IN EINER EBENE (css\upcrew-schicht.css) — jede
 * eigene Regel schlägt sie. Setzt eine eigene Regel Rundung, Kante,
 * Schatten, Rahmen oder Fläche eines Haus-Knopfs, sieht dieser Knopf in
 * jeder Familie gleich aus. Ausgenommen: `:not(.up-kn)` und die Knöpfe, die
 * js\knoepfe.js bewusst nicht umstellt.
 */
pruefe("Keine eigene Form-Regel für Haus-Knöpfe (Knopf-Familie gewinnt)", () => {
    const form = /(^|;)\s*(border-radius|box-shadow|border|border-color|border-width|border-style|background|background-color)\s*:/;
    const hausKnopf = /\.knopf(-haupt|-still|-gefahr|-klein|-zurueck)?(?![a-z-])/;
    const reihen = KNOEPFE.AUSWAHL_REIHEN.split(",").map((s) => s.trim());
    const funde = [];
    for (const name of EIGENE_STILE) {
        for (const regel of regeln(dateisystem.readFileSync(pfad.join(projekt, "css", name), "utf8"))) {
            if (!form.test(regel.inhalt)) continue;
            for (const teil of regel.selektor.split(",").map((s) => s.trim())) {
                const letzte = teil.split(/[ >+~]+/).pop();
                if (!hausKnopf.test(letzte) || letzte.indexOf(":not(.up-kn)") !== -1) continue;
                if (KNOEPFE.AUSNAHME_KLASSEN.some((k) => letzte.indexOf("." + k) !== -1)) continue;
                if (reihen.some((r) => teil.indexOf(r + " ") !== -1)) continue;
                if (/imposter-stufe/.test(letzte)) continue;   /* Quizz-Erbe, kommt in Blunderluck nicht vor */
                funde.push(name + ": " + teil);
            }
        }
    }
    if (funde.length > 0) {
        throw new Error(funde.length + " Regel(n): " + funde.slice(0, 6).join(" | "));
    }
});

pruefe("Schrift nur über --schrift-familie, fest nur Festbreite für Codes", () => {
    const funde = [];
    for (const name of EIGENE_STILE) {
        for (const regel of regeln(dateisystem.readFileSync(pfad.join(projekt, "css", name), "utf8"))) {
            for (const t of regel.inhalt.matchAll(/font-family:\s*([^;]+)/g)) {
                const wert = t[1].trim();
                if (/^var\(--schrift-familie\b/.test(wert) || wert === "inherit" || /monospace$/.test(wert)) continue;
                funde.push(name + ": " + regel.selektor + " → " + wert);
            }
        }
    }
    if (funde.length > 0) {
        throw new Error(funde.join(" | "));
    }
    const grund = dateisystem.readFileSync(pfad.join(projekt, "css", "stil.css"), "utf8");
    wahr(/body\s*\{[^}]*font-family:\s*var\(--schrift-familie/.test(grund), "body liest --schrift-familie");
});

pruefe("Rote Knöpfe haben Kante und Schrift in hell und dunkel", () => {
    const grund = dateisystem.readFileSync(pfad.join(projekt, "css", "stil.css"), "utf8");
    gleich((grund.match(/--gefahr-kante:/g) || []).length, 3, "hell, Gerät dunkel, Dunkel gewählt");
    gleich((grund.match(/--gefahr-schrift:/g) || []).length, 3, "hell, Gerät dunkel, Dunkel gewählt");
});

/* ------------------------------------------------------------------ *
 * index.html und app.js
 * ------------------------------------------------------------------ */

const seite = dateisystem.readFileSync(pfad.join(projekt, "index.html"), "utf8");
const skripte = [...seite.matchAll(/<script[^>]*\ssrc="js\/([^"]+)"/g)].map((t) => t[1]);

pruefe("Aussehen lädt früh: Farbwelten → Aussehen → darstellung.js direkt hintereinander", () => {
    const i = skripte.indexOf("upcrew-farbwelten.js");
    gleich(skripte[i + 1], "upcrew-aussehen.js", "Baustein direkt nach den Farbwelten");
    gleich(skripte[i + 2], "darstellung.js", "der frühe Aufruf direkt danach");
    wahr(skripte.indexOf("knoepfe.js") < skripte.indexOf("dialog.js"), "Knopf-Wächter vor allem, was Knöpfe baut");
    wahr(skripte.indexOf("freischaltung.js") < skripte.indexOf("team-schach-brett.js"), "Freischaltung vor dem Partie-Bildschirm");
    wahr(skripte.indexOf("upcrew-anpassen.js") !== -1
        && skripte.indexOf("upcrew-anpassen.js") < skripte.indexOf("sammlung.js"), "Baustein vor der Sammlung");
    wahr(/<link rel="stylesheet" href="css\/upcrew-schicht\.css">/.test(seite)
        && !/href="css\/upcrew-knoepfe\.css"/.test(seite), "Knopf-Familie nur über die Ebene");
    const schicht = dateisystem.readFileSync(pfad.join(projekt, "css", "upcrew-schicht.css"), "utf8");
    wahr(/@import url\("upcrew-knoepfe\.css"\) layer\(upcrew\);/.test(schicht), "Import in die Ebene upcrew");
});

/*
 * RUNDE 4 (seit v0.145.0): in BEIDEN Spielen dieselbe Reihenfolge
 * „Aufgaben · Sammlung · Start · Rangliste · Bald", der Start in der Mitte,
 * Platz 5 still. Die Tabs „Fähigkeiten" und „Anpassen" sind in der
 * Sammlung aufgegangen.
 */
pruefe("Leiste: Aufgaben · Sammlung · Start · Rangliste · Bald (v0.145.0)", () => {
    const app = dateisystem.readFileSync(pfad.join(projekt, "js", "app.js"), "utf8");
    const reihe = [...app.matchAll(/TABS\.registrieren\(([A-Z_]+)\)/g)].map((t) => t[1]);
    gleich(reihe.slice(0, 5).join(","), "HERAUSFORDERUNGEN,SAMMLUNG,START,RANGLISTE,BALD", "Reihenfolge");
    wahr(reihe.indexOf("FAEHIGKEITEN") === -1 && reihe.indexOf("ANPASSEN") === -1,
        "Fähigkeiten und Anpassen sind keine eigenen Tabs mehr");
    const { BALD } = require(pfad.join(projekt, "js", "herausforderungen.js"));
    gleich(BALD.platzhalter, true, "Bald ist der stille Platzhalter");
    gleich(skripte.indexOf("faehigkeiten.js") + skripte.indexOf("anpassen.js"), -2,
        "die alten Tab-Dateien laden nicht mehr");
});

/*
 * DIE LEISTE IST DER GEMEINSAME BAUSTEIN (seit v0.145.0): css\upcrew-leiste.css
 * lädt NACH dem eigenen Stil und geht offline mit; die eigenen Regeln, die
 * sie jetzt schlagen müssen (fest unten), tragen zwei Klassen. Die Symbole
 * sind die gemeinsame Absprache (in Typoluck gleich).
 */
pruefe("Leiste: Baustein upcrew-leiste.css eingebunden, nach dem eigenen Stil, offline (v0.145.0)", () => {
    const links = [...seite.matchAll(/<link rel="stylesheet" href="css\/([^"]+)">/g)].map((t) => t[1]);
    const stelle = links.indexOf("upcrew-leiste.css");
    wahr(stelle !== -1, "upcrew-leiste.css ist nicht eingebunden");
    wahr(links.filter((n) => /^stil/.test(n)).every((n) => links.indexOf(n) < stelle), "lädt vor einem eigenen Stil");
    const sw = dateisystem.readFileSync(pfad.join(projekt, "sw.js"), "utf8");
    wahr(sw.indexOf("\"./css/upcrew-leiste.css\"") !== -1, "fehlt in sw.js");
    wahr(/<nav class="tab-leiste up-leiste" id="tab-leiste"/.test(seite), "die Leiste trägt up-leiste");

    const grund = dateisystem.readFileSync(pfad.join(projekt, "css", "stil.css"), "utf8");
    wahr(/\.tab-leiste\.up-leiste\s*\{[^}]*position:\s*fixed/.test(grund), "fest unten mit zwei Klassen");
    wahr(!/\.tab-knopf|\.tab-marker|\.tab-wort/.test(dateisystem.readFileSync(pfad.join(projekt, "css", "stil.css"), "utf8")
        + dateisystem.readFileSync(pfad.join(projekt, "css", "stil-start.css"), "utf8")), "alte Leisten-Regeln sind weg");
});

pruefe("Leiste: Symbole Aufgaben, Sammlung und Bald wie abgesprochen (Runde 4)", () => {
    const zustand = dateisystem.readFileSync(pfad.join(projekt, "js", "zustand.js"), "utf8");
    const pfadVon = (name) => (zustand.match(new RegExp("\\b" + name + ": \"([^\"]+)\"")) || [])[1];
    gleich(pfadVon("aufgaben"), "M3 18 L9 12 L13 16 L21 8 M15 8 H21 V14", "Aufgaben");
    gleich(pfadVon("sammlung"), "M4 4 H10 V10 H4 Z M14 4 H20 V10 H14 Z M4 14 H10 V20 H4 Z M14 14 H20 V20 H14 Z", "Sammlung");
    gleich(pfadVon("bald"), "M12 7 V12 L15 14 M12 3 A9 9 0 1 0 12.01 3", "Bald");
});

/* ------------------------------------------------------------------ *
 * Der Tab „Sammlung" (seit v0.145.0)
 * ------------------------------------------------------------------ */

globalThis.FREISCHALTUNG = FREISCHALTUNG;
const SAMMLUNG = require(pfad.join(projekt, "js", "sammlung.js"));
const BRETT_QUELLE = dateisystem.readFileSync(pfad.join(projekt, "js", "brett-3d.js"), "utf8");

pruefe("Sammlung: Themen und Figuren sind genau die des 3D-Bretts", () => {
    const schluessel = (block) => {
        const text = BRETT_QUELLE.match(new RegExp("const " + block + " = \\{([\\s\\S]*?)\\n\\};"))[1];
        return [...text.matchAll(/^\s{4}([a-z]+):/gm)].map((t) => t[1]).sort().join(",");
    };
    gleich(SAMMLUNG.THEMEN.map((t) => t.wert).sort().join(","), schluessel("THEMEN"), "Brett-Themen");
    gleich(SAMMLUNG.FIGUREN.map((t) => t.wert).sort().join(","), schluessel("FIGUR_STILE"), "Figuren-Stile");
    gleich(SAMMLUNG.THEMEN[0].wert, "blunderluck", "die Vorgabe (Farbwelt) steht vorn");
    gleich(SAMMLUNG.FIGUREN[0].wert, "emaille", "die Vorgabe (Emaille) steht vorn");
    for (const eintrag of SAMMLUNG.THEMEN.concat(SAMMLUNG.FIGUREN).concat([{ bild: "brett-2d" }])) {
        const datei = pfad.join(projekt, "img", "sammlung", "klein-" + eintrag.bild + ".png");
        wahr(dateisystem.existsSync(datei), "Bild fehlt: klein-" + eintrag.bild + ".png");
    }
});

pruefe("Sammlung: ohne Freigabe nur die Vorgaben frei, mit Ort am Schloss", () => {
    globalThis.location = { hostname: "up-birdo.github.io", search: "" };
    const thema = SAMMLUNG.themaRegal();
    gleich(thema.wert, "blunderluck", "ohne 3D-Modul gilt die Vorgabe");
    gleich(thema.stuecke.filter((s) => s.frei).map((s) => s.wert).join(","), "blunderluck", "nur Farbwelt frei");
    gleich(thema.stuecke.find((s) => s.wert === "holz").ab, "Holzhalle", "Holz ab Holzhalle");
    gleich(thema.stuecke.find((s) => s.wert === "turnier").ab, "Turniersaal", "Turnier ab Turniersaal");
    const figuren = SAMMLUNG.figurenRegal();
    gleich(figuren.stuecke.filter((s) => s.frei).map((s) => s.wert).join(","), "emaille", "nur Emaille frei");
    gleich(figuren.stuecke.find((s) => s.wert === "metall").ab, "Nachtclub", "Metall ab Nachtclub");

    globalThis.location = { hostname: "localhost", search: "?werkstatt" };
    try {
        wahr(SAMMLUNG.themaRegal().stuecke.every((s) => s.frei), "in der Werkstatt alles frei");
    } finally {
        globalThis.location = { hostname: "up-birdo.github.io", search: "" };
    }
});

pruefe("Sammlung: Reihenfolge der eigenen Regale Brett · Brett-Thema · Figuren", () => {
    gleich(SAMMLUNG.regale().map((r) => r.schluessel).join(","), "brett,thema,figuren", "Reihenfolge");
    gleich(SAMMLUNG.regale().map((r) => r.titel).join(" | "), "Brett | Brett-Thema · 3D | Figuren · 3D", "Titel");
});

pruefe("Sammlung: der Anteil zählt Regale, Baustein-Stücke und reine Sammlung", () => {
    globalThis.SCHACH_VARIANTEN = {
        STUFEN: [{ id: "a" }, { id: "b" }],
        faehigkeitenDerStufe: (id) => (id === "a" ? ["x", "y"] : ["z"]),
        pechDerStufe: (id) => (id === "a" ? ["p"] : []),
        zurAuswahl: () => [{ id: "k" }, { id: "r" }]
    };
    globalThis.UPCREW_ANPASSEN = { STUFEN: { farbwelt: { a: 0, b: 2 }, schrift: { c: 0 }, knoepfe: { d: 0, e: 3 } } };
    try {
        const anteil = SAMMLUNG.anteil();
        /* Regale: 2 + 5 + 4 = 11 Stücke, frei 2 (2D, 3D) + 1 + 1 = 4.
           Baustein: 5 Stücke, frei 3. Reine Sammlung: 4 Karten + 2 Formen, alle da. */
        gleich(anteil.alle, 11 + 5 + 6, "alle");
        gleich(anteil.hat, 4 + 3 + 6, "gesammelt");
        gleich(anteil.prozent, Math.round(13 / 22 * 100), "Prozent");
    } finally {
        delete globalThis.SCHACH_VARIANTEN;
        delete globalThis.UPCREW_ANPASSEN;
    }
});

pruefe("3D-Brett: Sammlung-Schnittstelle da, Vorschau ändert das echte Brett nicht", () => {
    for (const name of ["standbildMit", "aussehen: aussehenLesen", "aussehenFrei", "aussehenWaehlen"]) {
        wahr(new RegExp("window\\.BRETT_3D = \\{[\\s\\S]*\\b" + name.replace(/[:]/g, "\\:") + "\\b").test(BRETT_QUELLE),
            "BRETT_3D." + name.split(":")[0] + " fehlt");
    }
    const mit = BRETT_QUELLE.match(/function standbildMit\(el, wahl\) \{([\s\S]*?)\n\}/)[1];
    wahr(/finally\s*\{[\s\S]*Z\.einst\.an = alt\.an;[\s\S]*Z\.einst\.thema = alt\.thema;[\s\S]*Z\.einst\.figuren = alt\.figuren;/.test(mit),
        "die Wahl wird nicht zurückgesetzt");
    wahr(!/einstellungenSpeichern/.test(mit), "die Vorschau speichert");
    const waehlen = BRETT_QUELLE.match(/function aussehenWaehlen\(schluessel, wert\) \{([\s\S]*?)\n\}/)[1];
    wahr(/!aussehenFrei\(\)\) return false/.test(waehlen), "Wählen prüft die Freigabe nicht");
});

pruefe("Die zwölf Crew-Schriften liegen bei und gehen offline mit", () => {
    const sw = dateisystem.readFileSync(pfad.join(projekt, "sw.js"), "utf8");
    for (let i = 1; i <= 6; i++) {
        for (const stil of ["normal", "fett"]) {
            const datei = "schrift/crew-S" + i + "-" + stil + ".woff2";
            wahr(dateisystem.existsSync(pfad.join(projekt, datei)), datei + " fehlt");
            wahr(sw.indexOf("\"./" + datei + "\"") !== -1, datei + " fehlt in sw.js");
        }
    }
    wahr(dateisystem.existsSync(pfad.join(projekt, "schrift", "LIZENZ.txt")), "LIZENZ.txt fehlt");
});

/*
 * DIE APP-ZEICHEN SIND DIE GERENDERTEN PNG (seit v0.144.1, Design\3D-Schrift
 * docs\ICON-3D.md). Das alte icon.svg (Springer) darf weder Tab-Zeichen
 * noch Manifest-Zeichen sein — moderne Browser und Android zögen es sonst
 * dem neuen Bild vor. Und das alte Zeichen-Werkzeug bricht ohne Schalter ab.
 */
pruefe("App-Zeichen nur als PNG, das alte SVG hängt nirgends mehr (v0.144.1)", () => {
    wahr(seite.indexOf("href=\"icon.svg\"") === -1, "index.html verweist noch auf icon.svg");
    wahr(/<link rel="icon" type="image\/png" sizes="32x32" href="icons\/icon-32\.png">/.test(seite),
        "Tab-Zeichen icon-32.png fehlt");
    wahr(/<link rel="apple-touch-icon" href="icons\/icon-180\.png">/.test(seite), "iPhone-Zeichen fehlt");
    const manifest = JSON.parse(dateisystem.readFileSync(pfad.join(projekt, "manifest.webmanifest"), "utf8"));
    const quellen = manifest.icons.map((i) => i.src).sort().join(",");
    gleich(quellen, "icons/icon-192.png,icons/icon-512.png", "Manifest-Zeichen");
    for (const groesse of [32, 180, 192, 512]) {
        wahr(dateisystem.existsSync(pfad.join(projekt, "icons", "icon-" + groesse + ".png")), "icon-" + groesse + ".png fehlt");
    }
    const werkzeug = dateisystem.readFileSync(pfad.join(projekt, "tools", "Icons-Erzeugen.ps1"), "utf8");
    wahr(/if \(-not \$AltesZeichen\)[\s\S]*?exit 1/.test(werkzeug), "Icons-Erzeugen.ps1 ohne Sperre");
});

console.log(anzahlOk + " ok, " + anzahlFehler + " Fehler");
process.exit(anzahlFehler === 0 ? 0 : 1);
