/*
 * test-3d-start.js — WANN das 3D-Modul startet (seit v0.164.0, Befund der
 * Nacht 04.10.2026, Tabelle 2, Punkt B).
 *
 * Das ECHTE js\brett-3d-start.js läuft hier mit nachgestellten Uhren
 * (Bild-Takt, Leerlauf, Zeitgeber, DOMContentLoaded):
 *   - 2D gewählt → der Start wartet auf das erste Bild und läuft im Leerlauf;
 *   - 3D gewählt ("3d", "scheiben", "oben") → sofort;
 *   - eine frühe Anforderung (Partie öffnen vor dem Leerlauf) startet sofort;
 *   - nie ein zweiter Start, gleich aus welcher Richtung.
 * Dazu die ECHTE Verdrahtung am Ende von js\brett-3d.js (herausgeschnitten —
 * das Modul selbst braucht three.js und läuft in den Tests nicht): Wer 3D
 * braucht, verlangt den Start und bekommt sein Ergebnis nach.
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
    const a = JSON.stringify(ist);
    const b = JSON.stringify(soll);
    if (a !== b) {
        throw new Error((was || "Wert") + ": erwartet <" + b + ">, war <" + a + ">");
    }
}

function wahr(bedingung, was) {
    if (!bedingung) {
        throw new Error((was || "Bedingung") + " war nicht erfüllt");
    }
}

const lesen = (datei) => fs.readFileSync(pfad.join(__dirname, "..", datei), "utf8").replace(/\r\n/g, "\n");
const START_QUELLE = lesen("js/brett-3d-start.js");
const MODUL_QUELLE = lesen("js/brett-3d.js");
const INDEX = lesen("index.html");
const SW = lesen("sw.js");

/*
 * Eine Welt für einen Lauf: das echte Start-Skript, dazu Uhren zum Anfassen.
 *   art        was `FREISCHALTUNG.brett()` antwortet ("2d", "3d", …);
 *              `null` = es gibt keine Freischaltung
 *   leerlauf   false = ohne `requestIdleCallback` (iPhone)
 *   appSteht   true = `APP.starten` ist schon gelaufen
 *   start      eigene Start-Funktion (sonst wird nur gezählt)
 */
function welt(angaben) {
    const a = angaben || {};
    const bilder = [];        // wartende Bild-Rückrufe (requestAnimationFrame)
    const leerlaeufe = [];    // wartende Leerlauf-Rückrufe samt Frist
    const uhren = [];         // gestellte Zeitgeber { f, ms }
    const horcher = { DOMContentLoaded: [], load: [] };
    const fehlerZeilen = [];
    const gestartet = [];

    const kontext = {
        window: {
            BLUNDERLUCK_GESTARTET: a.appSteht === true ? true : undefined,
            addEventListener: (name, f) => { horcher[name].push(f); }
        },
        document: {
            readyState: a.bereit || "interactive",
            addEventListener: (name, f) => { horcher[name].push(f); }
        },
        requestAnimationFrame: (f) => { bilder.push(f); },
        setTimeout: (f, ms) => { uhren.push({ f, ms }); },
        console: { error: (...teile) => { fehlerZeilen.push(teile.map(String).join(" ")); } }
    };
    if (a.leerlauf !== false) {
        kontext.requestIdleCallback = (f, opt) => { leerlaeufe.push({ f, frist: opt && opt.timeout }); };
    }
    if (a.art !== null) {
        kontext.FREISCHALTUNG = { brett: () => a.art || "2d" };
    }
    vm.createContext(kontext);
    /* `ohneSkript`: eine Seite, die brett-3d-start.js nicht lädt. */
    const START = a.ohneSkript === true ? null
        : vm.runInContext(START_QUELLE + "\nBRETT_3D_START;", kontext, { filename: "js/brett-3d-start.js" });
    const start = a.start || (() => { gestartet.push(START.grund); });

    return {
        START, kontext, uhren, leerlaeufe, bilder, horcher, fehlerZeilen, gestartet, start,
        anmelden() { START.anmelden(start); },
        /* Die App startet: `APP.starten` setzt den Merker, dann die Horcher. */
        domBereit() {
            kontext.window.BLUNDERLUCK_GESTARTET = true;
            horcher.DOMContentLoaded.splice(0).forEach((f) => f());
        },
        /* Der Browser malt EIN Bild: alle bis hierher wartenden Rückrufe. */
        bild() { bilder.splice(0).forEach((f) => f()); },
        leerlauf() { leerlaeufe.splice(0).forEach((eintrag) => eintrag.f()); },
        uhr(ms) { uhren.filter((u) => u.ms === ms).forEach((u) => u.f()); }
    };
}

/* ---- 2D gewählt: erst das erste Bild, dann im Leerlauf ---- */

pruefe("2D gewählt: beim Anmelden startet nichts — er wartet auf den Start der App", () => {
    const w = welt({ art: "2d" });
    w.anmelden();
    gleich(w.gestartet, [], "kein Start");
    gleich(w.START.gestartet(), false, "gestartet()");
    gleich(w.horcher.DOMContentLoaded.length, 1, "horcht auf DOMContentLoaded");
    gleich([w.bilder.length, w.leerlaeufe.length, w.uhren.length], [0, 0, 0], "noch keine Uhr");
});

pruefe("2D gewählt: nach dem Start der App zwei Bild-Takte, dann Leerlauf mit Frist, dann EIN Start", () => {
    const w = welt({ art: "2d" });
    w.anmelden();
    w.domBereit();
    gleich(w.gestartet, [], "mit dem Start der App noch nichts");
    gleich(w.bilder.length, 1, "wartet auf ein Bild");
    w.bild();
    gleich([w.gestartet.length, w.bilder.length, w.leerlaeufe.length], [0, 1, 0], "nach dem ersten Takt: noch ein Bild");
    w.bild();
    gleich([w.gestartet.length, w.leerlaeufe.length], [0, 1], "nach dem ersten sichtbaren Bild: Leerlauf bestellt");
    gleich(w.leerlaeufe[0].frist, 2000, "Frist des Leerlaufs");
    gleich(w.START.FRIST_MS, 2000, "FRIST_MS");
    w.leerlauf();
    gleich(w.gestartet, ["leerlauf"], "genau ein Start, im Leerlauf");
    gleich(w.START.gestartet(), true, "gestartet()");
});

pruefe("2D gewählt, ohne requestIdleCallback (iPhone): Zeitgeber nach dem ersten Bild", () => {
    const w = welt({ art: "2d", leerlauf: false });
    w.anmelden();
    w.domBereit();
    w.bild();
    w.bild();
    gleich(w.gestartet, [], "noch nichts");
    gleich(w.uhren.map((u) => u.ms).sort((x, y) => x - y), [200, 5000], "Rückfall 200 ms, Netz 5 s");
    w.uhr(200);
    gleich(w.gestartet, ["leerlauf"], "Start über den Rückfall");
});

pruefe("2D gewählt, es kommt kein Bild (Seite im Hintergrund): nach 5 s startet es trotzdem — einmal", () => {
    const w = welt({ art: "2d" });
    w.anmelden();
    w.domBereit();
    gleich(w.uhren.map((u) => u.ms), [5000], "Netz gestellt");
    w.uhr(5000);
    gleich(w.gestartet, ["frist"], "Start über das Netz");
    w.bild();
    w.bild();
    w.leerlauf();
    gleich(w.gestartet, ["frist"], "der Leerlauf danach startet nicht noch einmal");
});

pruefe("2D gewählt, die App steht schon: kein Warten auf DOMContentLoaded", () => {
    const w = welt({ art: "2d", appSteht: true });
    w.anmelden();
    gleich(w.horcher.DOMContentLoaded.length, 0, "kein Horcher");
    gleich(w.bilder.length, 1, "gleich das Bild abwarten");
    const fertig = welt({ art: "2d", bereit: "complete" });
    fertig.anmelden();
    gleich(fertig.bilder.length, 1, "auch bei fertig geladenem Dokument");
});

pruefe("DOMContentLoaded und load zusammen bestellen den Leerlauf nur einmal", () => {
    const w = welt({ art: "2d" });
    w.anmelden();
    w.domBereit();
    w.horcher.load.splice(0).forEach((f) => f());
    gleich([w.bilder.length, w.uhren.length], [1, 1], "ein Bild-Rückruf, ein Netz");
});

/* ---- 3D gewählt: sofort ---- */

pruefe("3D gewählt (3d, scheiben, oben): der Start läuft sofort beim Anmelden, ohne Uhren", () => {
    for (const art of ["3d", "scheiben", "oben"]) {
        const w = welt({ art: art });
        w.anmelden();
        gleich(w.gestartet, ["sofort"], art + ": sofort");
        gleich([w.bilder.length, w.leerlaeufe.length, w.uhren.length, w.horcher.DOMContentLoaded.length],
            [0, 0, 0, 0], art + ": nichts geplant");
    }
});

pruefe("Ohne Freischaltung (darf nicht sein) oder wenn sie stolpert: wie bisher sofort", () => {
    const ohne = welt({ art: null });
    ohne.anmelden();
    gleich(ohne.gestartet, ["sofort"], "ohne FREISCHALTUNG");
    const kaputt = welt({ art: "2d" });
    kaputt.kontext.FREISCHALTUNG.brett = () => { throw new Error("kaputt"); };
    kaputt.anmelden();
    gleich(kaputt.gestartet, ["sofort"], "FREISCHALTUNG.brett wirft");
});

/* ---- Eine frühe Anforderung ---- */

pruefe("Frühe Anforderung (Partie öffnen vor dem Leerlauf): Start sofort, im selben Aufruf", () => {
    const w = welt({ art: "2d" });
    w.anmelden();
    w.domBereit();
    w.bild();
    gleich(w.gestartet, [], "vor der Anforderung nichts");
    gleich(w.START.anfordern("partie"), true, "dieser Aufruf hat gestartet");
    gleich(w.gestartet, ["partie"], "gestartet, mit Grund");
});

pruefe("Kein doppelter Start: Anforderungen, Leerlauf, Netz und ein zweites Anmelden danach tun nichts", () => {
    const w = welt({ art: "2d" });
    w.anmelden();
    w.domBereit();
    w.START.anfordern("partie");
    gleich(w.START.anfordern("buehne"), false, "zweite Anforderung");
    w.bild();
    w.bild();
    w.leerlauf();
    w.uhr(5000);
    w.anmelden();
    w.START.anmelden(() => { w.gestartet.push("fremd"); });
    gleich(w.gestartet, ["partie"], "genau ein Start");
    const drei = welt({ art: "3d" });
    drei.anmelden();
    drei.START.anfordern("partie");
    drei.anmelden();
    gleich(drei.gestartet, ["sofort"], "auch bei gewähltem 3D nur einer");
});

pruefe("Anforderung, bevor das Modul da ist: gemerkt — beim Anmelden startet es sofort, auch bei 2D", () => {
    const w = welt({ art: "2d" });
    gleich(w.START.anfordern("partie"), false, "noch nichts zu starten");
    gleich(w.gestartet, [], "kein Start ohne Modul");
    w.anmelden();
    /* Seit v0.166.0 bleibt der Grund der ersten Anforderung erhalten (bis v0.165.1 "anforderung"). */
    gleich(w.gestartet, ["partie"], "beim Anmelden sofort, mit dem Grund");
    gleich(w.horcher.DOMContentLoaded.length, 0, "nichts geplant");
});

pruefe("Stolpert der Start (Wurf oder abgelehntes Versprechen), schlägt nichts durch — und es bleibt bei einem", () => {
    const wurf = welt({ art: "3d", start: () => { throw new Error("kein WebGL"); } });
    wurf.anmelden();
    gleich(wurf.START.gestartet(), true, "gilt als gestartet");
    gleich(wurf.fehlerZeilen.length, 1, "gemeldet");
    gleich(wurf.START.anfordern("partie"), false, "kein zweiter Versuch");
    let gefangen = false;
    const versprechen = { catch: (f) => { gefangen = typeof f === "function"; } };
    const ab = welt({ art: "3d", start: () => versprechen });
    ab.anmelden();
    wahr(gefangen, "ein abgelehntes Versprechen wird gefangen");
    const nichts = welt({ art: "3d" });
    nichts.START.anmelden(null);
    gleich(nichts.START.gestartet(), false, "ohne Funktion kein Start");
});

/* ---- Die Verdrahtung am Ende des Moduls (herausgeschnitten) ---- */

const SCHNITT = MODUL_QUELLE.indexOf("function startVerlangen(grund)");
const VERDRAHTUNG = MODUL_QUELLE.slice(SCHNITT);

/* Das Modul-Ende in einer kleinen Welt: die inneren Funktionen sind
   Attrappen, die mitschreiben; `starten` wird wie im Modul erst später
   „bereit" (die Formen laden asynchron) und holt dann nach. */
function modulEnde(art, mitStartSkript) {
    const w = welt({ art: art, ohneSkript: mitStartSkript === false });
    const rufe = [];
    const k = w.kontext;
    const Z = { bereit: false, fehler: false, einst: null, letzte: null, stoesse: null };
    let fertigMachen = null;
    Object.assign(k, {
        Z: Z,
        TEAM_SCHACH: { _brett3dLetzte: null },
        anbinden: (halter, partie, person, animieren) => {
            Z.letzte = { halter, partie, person };
            rufe.push("anbinden:" + halter + ":" + (Z.bereit ? "gezeichnet" : "gemerkt") + ":" + animieren);
        },
        wahlUebernehmen: (an, oben, scheiben) => { rufe.push("wahl:" + an + ":" + oben + ":" + scheiben); },
        standbild: (el) => { rufe.push("standbild:" + el); },
        standbildMit: (el) => { rufe.push("standbildMit:" + el + ":" + Z.bereit); return Z.bereit; },
        aussehenLesen: () => ({ thema: "holz", figuren: "matt" }),
        aussehenFrei: () => true,
        aussehenWaehlen: () => true,
        falleZeigen: () => { rufe.push("falle"); return false; },
        buehneMoeglich: () => { rufe.push("buehneMoeglich"); return Z.bereit; },
        buehne: () => { rufe.push("buehne"); return Z.bereit; },
        ueberdeckungen: () => null,
        starten: () => {
            rufe.push("starten");
            fertigMachen = () => {
                Z.bereit = true;
                const letzte = k.TEAM_SCHACH._brett3dLetzte;
                if (letzte) k.anbinden(letzte.halter, letzte.partie, letzte.person, false);
            };
        }
    });
    vm.runInContext(VERDRAHTUNG, k, { filename: "js/brett-3d.js#ende" });
    return { w, rufe, Z, B: k.window.BRETT_3D, k, bereit: () => fertigMachen && fertigMachen() };
}

pruefe("Modul-Ende: der Schnitt trifft, und gestartet wird nur noch über BRETT_3D_START (Rückfall: sofort)", () => {
    wahr(SCHNITT > 0, "function startVerlangen gefunden");
    wahr(/if \(typeof BRETT_3D_START !== "undefined"\) \{\n {4}BRETT_3D_START\.anmelden\(starten\);\n\} else \{\n {4}starten\(\);\n\}\s*$/.test(MODUL_QUELLE),
        "Ende des Moduls");
    gleich((MODUL_QUELLE.match(/^starten\(\);$/gm) || []).length, 0, "kein nackter Start mehr auf Modulebene");
    gleich((MODUL_QUELLE.match(/^\s*starten\(\);$/gm) || []).length, 1, "`starten();` steht nur noch im Rückfall");
});

pruefe("Modul, 2D gewählt: beim Laden startet nichts; die Auskünfte für Sammlung und Shop gehen trotzdem", () => {
    const m = modulEnde("2d");
    gleich(m.rufe, [], "kein Start beim Laden");
    gleich(m.B.aussehen(), { thema: "holz", figuren: "matt" }, "aussehen() synchron");
    gleich([m.B.aussehenFrei(), m.B.aussehenWaehlen("thema", "holz"), m.B.laedt(), !!m.B.aktiv()],
        [true, true, true, false], "frei, wählen, lädt, aktiv");
    m.B.standbild("start-vorschau");
    gleich(m.rufe, ["standbild:start-vorschau"], "ein kleines Brett verlangt den Start NICHT (der Start-Tab ruft es sofort)");
    m.B.wahlUebernehmen(false, false, false);
    gleich(m.rufe.indexOf("starten"), -1, "die Wahl 2D verlangt ihn auch nicht");
});

pruefe("Modul, 2D gewählt: Partie öffnen vor dem Leerlauf startet sofort — und bekommt ihr Brett nach", () => {
    const m = modulEnde("2d");
    m.w.domBereit();
    m.k.TEAM_SCHACH._brett3dLetzte = { halter: "partie-1", partie: "p", person: "ich" };
    m.B.anbinden("partie-1", "p", "ich");
    gleich(m.rufe, ["starten", "anbinden:partie-1:gemerkt:true"], "erst der Start, dann gemerkt");
    gleich(m.w.START.grund, "partie", "Grund");
    m.B.anbinden("partie-1", "p", "ich");
    gleich(m.rufe.filter((r) => r === "starten").length, 1, "das nächste Zeichnen startet nicht noch einmal");
    m.bereit();
    gleich(m.rufe[m.rufe.length - 1], "anbinden:partie-1:gezeichnet:false", "die Formen sind da: das Brett kommt nach");
    m.w.bild();
    m.w.bild();
    m.w.leerlauf();
    m.w.uhr(5000);
    gleich(m.rufe.filter((r) => r === "starten").length, 1, "Leerlauf und Netz danach: kein zweiter Start");
});

pruefe("Modul, 2D gewählt: Bühne, Vorschau der Sammlung, Falle und der Wechsel auf 3D verlangen den Start", () => {
    const faelle = [
        ["buehne", (B) => B.buehneMoeglich(), "buehneMoeglich"],
        ["buehne", (B) => B.buehne("el", {}), "buehne"],
        ["vorschau", (B) => B.standbildMit("sammlung", { thema: "holz" }), "standbildMit:sammlung:false"],
        ["falle", (B) => B.falleZeigen("riss"), "falle"],
        ["wahl", (B) => B.wahlUebernehmen(true, false, false), "wahl:true:false:false"],
        ["wahl", (B) => B.wahlUebernehmen(false, true, false), "wahl:false:true:false"]
    ];
    for (const [grund, aufruf, erwartet] of faelle) {
        const m = modulEnde("2d");
        aufruf(m.B);
        gleich(m.rufe, ["starten", erwartet], grund + ": erst der Start, dann die Sache selbst");
        gleich(m.w.START.grund, grund, "Grund");
    }
});

pruefe("Modul, 3D gewählt: Start beim Laden wie bisher; ohne brett-3d-start.js ebenso", () => {
    const drei = modulEnde("3d");
    gleich(drei.rufe, ["starten"], "sofort");
    drei.B.anbinden("partie-1", "p", "ich");
    gleich(drei.rufe.filter((r) => r === "starten").length, 1, "die Partie startet nicht noch einmal");
    const ohne = modulEnde("2d", false);
    gleich(ohne.rufe, ["starten"], "Werkstatt-Seite: sofort, auch bei 2D");
    ohne.B.anbinden("partie-1", "p", "ich");
    ohne.B.buehneMoeglich();
    gleich(ohne.rufe.filter((r) => r === "starten").length, 1, "und nur einmal");
});

pruefe("Modul: was vor dem Bereitsein gefragt hat, holt `starten` nach (Brett, kleine Bretter, Vorschau der Sammlung)", () => {
    const rumpf = MODUL_QUELLE.slice(MODUL_QUELLE.indexOf("async function starten()"), SCHNITT);
    wahr(/TEAM_SCHACH\._brett3dLetzte : null;\s*if \(letzte\) anbinden\(letzte\.halter, letzte\.partie, letzte\.person, false\);/.test(rumpf),
        "das zuletzt gezeichnete Brett");
    wahr(/MINI\.warte\.splice\(0\)/.test(rumpf), "die kleinen Bretter");
    wahr(/for \(const offen of MINI\.warteMit\.splice\(0\)\) \{\s*await spaeter\(\(\) => \{ if \(offen\.el\.isConnected\) standbildMit\(offen\.el, offen\.wahl\); \}\);/.test(rumpf),
        "die Vorschauen der Sammlung");
    wahr(/function standbildMit\(el, wahl\) \{\n {4}if \(!el \|\| Z\.fehler \|\| window\.BRETT_3D_AUS\) return false;\n {4}if \(!Z\.bereit\) \{[\s\S]{0,400}?MINI\.warteMit\.push\(\{ el, wahl \}\);\n {8}return false;/.test(MODUL_QUELLE),
        "standbildMit merkt sich, was es noch nicht zeigen kann");
    wahr(/const MINI = \{[^}]*warteMit: \[\]/.test(MODUL_QUELLE), "MINI.warteMit");
    wahr(/figurenBilder\b/.test(rumpf) && /plaettchenBilder\(\)/.test(rumpf),
        "Figurenbilder und Plättchen rechnet der Start weiter — auch bei 2D, nichts ist weggelassen");
});

/* ---- Einbindung: Reihenfolge bleibt, der Worker lädt weiter alles vor ---- */

pruefe("index.html (seit v0.166.0/v0.166.1): Import-Karte im <head>, dahinter das Vorab-Laden; brett-3d-start.js zuletzt; kein festes Modul", () => {
    const stelleApp = INDEX.indexOf("<script src=\"js/app.js\"></script>");
    const stelleStart = INDEX.indexOf("<script src=\"js/brett-3d-start.js\"></script>");
    const stelleKarte = INDEX.indexOf("<script type=\"importmap\">");
    const stelleVorab = INDEX.indexOf("<script async src=\"js/brett-3d-vorab.js\"></script>");
    const stelleNotfall = INDEX.indexOf("<script id=\"notfall\">");
    wahr(stelleKarte > stelleNotfall && stelleKarte < INDEX.indexOf("</head>"), "Import-Karte im <head>, nach dem Notfall-Block");
    wahr(stelleVorab > stelleKarte && stelleVorab < INDEX.indexOf("<link rel=\"stylesheet\""), "Vorab-Laden direkt nach der Karte, vor den Stilen");
    gleich((INDEX.slice(stelleKarte, stelleVorab).match(/<script/g) || []).length, 1, "nichts zwischen Karte und Vorab-Laden");
    gleich((INDEX.match(/<script async src="js\/brett-3d-vorab\.js">/g) || []).length, 1, "Vorab-Laden genau einmal, async");
    wahr(stelleApp > 0 && stelleStart > stelleApp, "das Start-Skript steht nach app.js (und damit nach der Import-Karte)");
    gleich((INDEX.match(/<script src="js\/brett-3d-start\.js">/g) || []).length, 1, "genau einmal");
    gleich((INDEX.match(/<script type="module"/g) || []).length, 0, "kein festes Modul-Skript mehr");
    gleich((INDEX.match(/js\/brett-3d\.js/g) || []).length, 0, "das Modul steht nirgends fest in der Seite");
    wahr(/return import\(url\);/.test(START_QUELLE), "das Start-Skript lädt das Modul selbst");
    const klassisch = (INDEX.match(/<script src="js\/[^"]+">/g) || []);
    gleich(klassisch[klassisch.length - 1], "<script src=\"js/brett-3d-start.js\">", "das Start-Skript ist das letzte Skript");
    gleich(klassisch[klassisch.length - 2], "<script src=\"js/app.js\">", "app.js bleibt das letzte Skript der App davor");
    const aussehen = INDEX.indexOf("<script src=\"js/brett-3d-aussehen.js\"></script>");
    wahr(aussehen > INDEX.indexOf("<script src=\"js/freischaltung.js\"></script>") && aussehen < INDEX.indexOf("<script src=\"js/sammlung.js\"></script>"),
        "brett-3d-aussehen.js nach freischaltung.js und vor der Sammlung");
});

pruefe("sw.js lädt weiter alles vor: Start-Skript, Modul, three.js und die Formen", () => {
    for (const datei of ["./js/brett-3d-aussehen.js", "./js/brett-3d-vorab.js", "./js/brett-3d-start.js", "./js/brett-3d.js", "./js/lib/three/three.module.min.js"]) {
        wahr(SW.indexOf("\"" + datei + "\"") !== -1, datei);
    }
    wahr(/"\.\/modelle\/[^"]+\.glb"/.test(SW), "die Formen (glb)");
    wahr(SW.indexOf("\"./js/brett-3d-start.js\"") < SW.indexOf("\"./js/brett-3d.js\""), "Reihenfolge wie in index.html");
});

console.log(anzahlOk + " ok, " + anzahlFehler + " Fehler");
process.exit(anzahlFehler === 0 ? 0 : 1);
