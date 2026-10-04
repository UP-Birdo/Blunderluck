/*
 * test-3d-laden.js — three.js hält den Start nicht mehr auf (v0.166.0).
 *
 * Das ECHTE js\brett-3d-start.js mit nachgestellten Uhren und einem
 * nachgestellten `import()` (`_importieren`):
 *   - 2D gewählt → vor dem Start der App wird nichts geladen, danach im
 *     Leerlauf genau einmal;
 *   - 3D gewählt → das Laden beginnt sofort;
 *   - eine frühe Anforderung lädt sofort, wartet und bekommt ihr Ergebnis;
 *   - ein Laden für viele Wartende (dasselbe Versprechen `geladen`);
 *   - Lade-Fehler → Rückfall wie bisher (`BRETT_3D_AUS`, flaches Brett).
 * Dazu der Platzhalter `window.BRETT_3D` und die herausgelösten Auskünfte
 * (js\brett-3d-aussehen.js): Der Platzhalter antwortet Wert für Wert wie das
 * Modul vor seinem Aufbau (dessen Hüllen hier herausgeschnitten), in allen
 * Kombinationen frei / gesperrt / gekauft. (Gegen die Fassung v0.165.1
 * selbst wurde beim Bau einmal mit einem Wegwerf-Skript verglichen:
 * 126 720 Fälle, keine Abweichung — UEBERGABE.md.)
 *
 * Aufruf: siehe tests\README.md
 */

const fs = require("fs");
const pfad = require("path");
const vm = require("vm");

let anzahlOk = 0;
let anzahlFehler = 0;
const offen = [];

function pruefe(bezeichnung, funktion) {
    const lauf = (async () => funktion())();
    offen.push(lauf.then(() => { anzahlOk++; }, (fehler) => {
        anzahlFehler++;
        console.error("FEHLER: " + bezeichnung);
        console.error("        " + (fehler && fehler.message));
    }));
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
const AUSSEHEN_QUELLE = lesen("js/brett-3d-aussehen.js");
const MODUL_QUELLE = lesen("js/brett-3d.js");
const FREISCHALTUNG_QUELLE = lesen("js/freischaltung.js");

/* Alle Mikroaufgaben (Versprechen) abarbeiten lassen. */
const ruhe = () => new Promise((fertig) => setImmediate(fertig));

/*
 * Eine Welt: das echte Start-Skript samt brett-3d-aussehen.js, Uhren zum
 * Anfassen und ein `import()`, das erst auf `modulKommt()` bzw.
 * `ladenScheitert()` antwortet. `modulKommt` tut, was das Ende von
 * js\brett-3d.js tut: `window.BRETT_3D` setzen, `anmelden(starten)`.
 */
function welt(angaben) {
    const a = angaben || {};
    const bilder = [];
    const leerlaeufe = [];
    const uhren = [];
    const horcher = { DOMContentLoaded: [], load: [] };
    const fehlerZeilen = [];
    const gestartet = [];
    const geladen = [];        // jede Adresse, die `import()` bekam
    const warteKlassen = [];   // `.brett-3d-wartet`, die der Rückfall abnimmt
    let antwort = null;

    const kontext = {
        window: {
            BLUNDERLUCK_GESTARTET: undefined,
            addEventListener: (name, f) => { horcher[name].push(f); }
        },
        document: {
            readyState: "interactive",
            addEventListener: (name, f) => { horcher[name].push(f); },
            querySelectorAll: (wahl) => (wahl === ".brett-3d-wartet" ? warteKlassen.slice() : [])
        },
        requestAnimationFrame: (f) => { bilder.push(f); },
        requestIdleCallback: (f, opt) => { leerlaeufe.push({ f, frist: opt && opt.timeout }); },
        setTimeout: (f, ms) => { uhren.push({ f, ms }); },
        console: { error: (...teile) => { fehlerZeilen.push(teile.map(String).join(" ")); } },
        FREISCHALTUNG: { brett: () => a.art || "2d", werkstatt: () => false }
    };
    if (a.ohneLeerlauf) delete kontext.requestIdleCallback;
    vm.createContext(kontext);
    vm.runInContext(AUSSEHEN_QUELLE, kontext, { filename: "js/brett-3d-aussehen.js" });
    const START = vm.runInContext(START_QUELLE + "\nBRETT_3D_START;", kontext, { filename: "js/brett-3d-start.js" });
    START._importieren = (url) => {
        geladen.push(url);
        return new Promise((ja, nein) => { antwort = { ja, nein }; });
    };

    /* Das echte Modul nach dem Laden: dieselben Eingänge, die mitschreiben. */
    const rufe = [];
    const modul = {
        echt: true,
        standbild: (el) => { rufe.push("standbild:" + el.name); },
        standbildMit: (el, wahl) => { rufe.push("standbildMit:" + el.name + ":" + JSON.stringify(wahl)); return false; },
        anbinden: () => { rufe.push("anbinden"); }
    };
    const start = () => { gestartet.push(START.grund); };

    return {
        START, kontext, uhren, leerlaeufe, bilder, horcher, fehlerZeilen, gestartet, geladen, rufe, modul, warteKlassen,
        platz: () => kontext.window.BRETT_3D,
        vorbereiten() { START.vorbereiten("https://beispiel.test/app/js/brett-3d.js"); },
        domBereit() {
            kontext.window.BLUNDERLUCK_GESTARTET = true;
            horcher.DOMContentLoaded.splice(0).forEach((f) => f());
        },
        bild() { bilder.splice(0).forEach((f) => f()); },
        leerlauf() { leerlaeufe.splice(0).forEach((eintrag) => eintrag.f()); },
        uhr(ms) { uhren.filter((u) => u.ms === ms).forEach((u) => u.f()); },
        async modulKommt(ohneAnmelden) {
            await ruhe();
            if (!antwort) throw new Error("es wurde nichts geladen");
            if (!ohneAnmelden) {
                kontext.window.BRETT_3D = modul;
                START.anmelden(start);
            }
            antwort.ja({});
            await ruhe();
        },
        async ladenScheitert() {
            await ruhe();
            if (!antwort) throw new Error("es wurde nichts geladen");
            antwort.nein(new Error("offline, kein Vorrat"));
            await ruhe();
        }
    };
}

/* ---- Wann geladen wird ---- */

pruefe("2D gewählt: vor dem Start der App wird das Modul NICHT geladen; danach im Leerlauf genau einmal", async () => {
    const w = welt({ art: "2d" });
    w.vorbereiten();
    await ruhe();
    gleich(w.geladen, [], "beim Laden der Seite nichts");
    wahr(w.platz() && w.platz().platzhalter === true, "der Platzhalter steht");
    w.domBereit();
    await ruhe();
    gleich(w.geladen, [], "mit dem Start der App noch nichts");
    w.bild();
    w.bild();
    await ruhe();
    gleich(w.geladen, [], "nach dem ersten Bild: erst der Leerlauf");
    gleich(w.leerlaeufe.map((l) => l.frist), [2000], "Leerlauf mit Frist bestellt");
    w.leerlauf();
    await ruhe();
    gleich(w.geladen, ["https://beispiel.test/app/js/brett-3d.js"], "im Leerlauf geladen");
    gleich(w.gestartet, [], "gestartet wird erst, wenn das Modul da ist");
    await w.modulKommt();
    gleich(w.gestartet, ["leerlauf"], "dann sofort, ohne zweites Warten");
    w.uhr(5000);
    await ruhe();
    gleich([w.geladen.length, w.gestartet.length], [1, 1], "das Netz nach 5 s tut nichts mehr");
    wahr(w.platz() === w.modul, "das Modul hat den Platzhalter ersetzt");
});

pruefe("2D gewählt, ohne requestIdleCallback (iPhone) bzw. ohne Bild: Rückfall 200 ms, Netz 5 s — je ein Laden", async () => {
    const w = welt({ art: "2d", ohneLeerlauf: true });
    w.vorbereiten();
    w.domBereit();
    w.bild();
    w.bild();
    w.uhr(200);
    await ruhe();
    gleich(w.geladen.length, 1, "Rückfall lädt");
    const n = welt({ art: "2d" });
    n.vorbereiten();
    n.domBereit();
    n.uhr(5000);
    await ruhe();
    gleich(n.geladen.length, 1, "Netz lädt");
    n.bild();
    n.bild();
    n.leerlauf();
    await ruhe();
    gleich(n.geladen.length, 1, "der Leerlauf danach lädt nicht noch einmal");
    await n.modulKommt();
    gleich(n.gestartet, ["frist"], "Start mit dem Grund des Netzes");
});

pruefe("3D gewählt (3d, scheiben, oben): das Laden beginnt sofort, noch vor dem Start der App; Start, sobald es da ist", async () => {
    for (const art of ["3d", "scheiben", "oben"]) {
        const w = welt({ art: art });
        w.vorbereiten();
        await ruhe();
        gleich(w.geladen.length, 1, art + ": sofort geladen");
        gleich([w.horcher.DOMContentLoaded.length, w.bilder.length, w.leerlaeufe.length], [0, 0, 0], art + ": nichts geplant");
        await w.modulKommt();
        gleich(w.gestartet, ["sofort"], art + ": gestartet");
    }
});

pruefe("Frühe Anforderung (Partie vor dem Leerlauf): lädt sofort, wartet, bekommt ihr Ergebnis — ein Laden für viele", async () => {
    const w = welt({ art: "2d" });
    w.vorbereiten();
    const P = w.platz();
    const brett = { name: "start-vorschau" };
    const vorschau = { name: "sammlung" };
    P.standbild(brett);
    await ruhe();
    gleich(w.geladen, [], "ein kleines Brett lädt NICHT (wie bisher: es verlangt den Start nicht)");
    P.anbinden("partie-1", "p", "ich");
    gleich(P.standbildMit(vorschau, { thema: "holz" }), false, "Vorschau: noch kein Bild");
    gleich(P.buehneMoeglich(), false, "Bühne: noch nicht");
    gleich(P.falleZeigen("riss"), false, "Falle: flach");
    P.wahlUebernehmen(true, false, false);
    const viele = [w.START.geladen, w.START.laden(), w.START.laden(), w.START.geladen];
    await ruhe();
    gleich(w.geladen.length, 1, "genau EIN import() für alle");
    gleich(w.gestartet, [], "noch nicht da");
    await w.modulKommt();
    gleich(w.gestartet, ["partie"], "gestartet aus dem Grund der ersten Anforderung");
    const ergebnisse = await Promise.all(viele);
    wahr(ergebnisse.every((m) => m === w.modul), "alle Wartenden bekommen dasselbe Modul");
    gleich(w.rufe, ["standbild:start-vorschau", "standbildMit:sammlung:{\"thema\":\"holz\"}"],
        "kleines Brett und Vorschau gehen an das Modul weiter (das holt sie wie bisher nach)");
    w.bild();
    w.bild();
    w.leerlauf();
    w.uhr(5000);
    w.START.anfordern("buehne");
    await ruhe();
    gleich([w.geladen.length, w.gestartet.length], [1, 1], "danach kein zweites Laden, kein zweiter Start");
});

pruefe("Platzhalter: die Wahl 2D lädt nichts; was nach dem Laden kommt, geht an das Modul, nicht an den Platzhalter", async () => {
    const w = welt({ art: "2d" });
    w.vorbereiten();
    const P = w.platz();
    P.wahlUebernehmen(false, false, false);
    await ruhe();
    gleich(w.geladen, [], "2D gewählt: kein Laden");
    gleich([P.aktiv(), P.laedt(), P.kollisionen(), P.ueberdeckungen()], [false, true, null, null], "aktiv, lädt, Werkstatt");
    P.wahlUebernehmen(false, true, false);
    await ruhe();
    gleich(w.geladen.length, 1, "3D-Figuren oben gewählt: lädt");
    await w.modulKommt();
    P.standbild({ name: "spaet" });
    await ruhe();
    gleich(w.rufe, ["standbild:spaet"], "ein alter Verweis auf den Platzhalter reicht weiter");
});

pruefe("Das Modul ist schon da (festes Modul-Skript, Werkstatt): kein Platzhalter, kein import()", async () => {
    const w = welt({ art: "2d" });
    w.kontext.window.BRETT_3D = w.modul;
    w.vorbereiten();
    gleich(w.platz(), w.modul, "vorbereiten ersetzt kein vorhandenes BRETT_3D");
    const ohne = welt({ art: "3d" });
    ohne.START.anmelden(() => { ohne.gestartet.push(ohne.START.grund); });
    ohne.START.anfordern("partie");
    await ruhe();
    gleich([ohne.geladen.length, ohne.gestartet], [0, ["sofort"]], "ohne vorbereiten (keine Adresse): nichts geladen, Start wie bis v0.165.1");
});

/* ---- Lade-Fehler ---- */

pruefe("Laden scheitert (offline ohne Vorrat): Rückfall wie bisher — flaches Brett, kein Warten, kein zweiter Versuch", async () => {
    const w = welt({ art: "3d" });
    const rahmen = { classList: { weg: [], remove(k) { this.weg.push(k); } } };
    w.warteKlassen.push(rahmen);
    w.vorbereiten();
    const P = w.platz();
    P.standbild({ name: "klein" });
    const warten = w.START.geladen;
    await w.ladenScheitert();
    gleich(await warten, null, "die Wartenden bekommen null");
    gleich(w.kontext.window.BRETT_3D_AUS, true, "BRETT_3D_AUS");
    gleich(rahmen.classList.weg, ["brett-3d-wartet"], "das verborgene flache Brett wird gezeigt");
    gleich(P.laedt(), false, "der Bildschirm wartet nicht mehr");
    gleich(P.standbildMit({ name: "v" }, {}), false, "Vorschau bleibt flach");
    gleich(P.buehneMoeglich(), false, "Anleitung flach");
    gleich(w.gestartet, [], "kein Start");
    gleich(w.fehlerZeilen.length, 1, "einmal gemeldet");
    w.START.anfordern("partie");
    await ruhe();
    gleich(w.geladen.length, 1, "kein zweiter Versuch in dieser Sitzung");
    gleich(w.rufe, [], "nichts wurde weitergereicht");
});

pruefe("Laden gelingt, aber das Modul meldet sich nicht an: wie ein Fehler", async () => {
    const w = welt({ art: "3d" });
    w.vorbereiten();
    await w.modulKommt(true);
    gleich([w.kontext.window.BRETT_3D_AUS, await w.START.geladen], [true, null], "Rückfall");
});

pruefe("Im Browser entscheidet die Datei selbst — das Modul liegt neben ihr (auch bei <base> der Probe)", () => {
    wahr(/if \(typeof document !== "undefined" && document\.currentScript && document\.currentScript\.src\) \{\n {4}BRETT_3D_START\.vorbereiten\(new URL\("brett-3d\.js", document\.currentScript\.src\)\.href\);\n\}/.test(START_QUELLE),
        "vorbereiten mit der Adresse neben dem Skript");
    const k = { window: {}, document: { currentScript: { src: "https://up-birdo.github.io/Blunderluck/js/brett-3d-start.js" }, readyState: "complete", addEventListener() {} },
        URL, requestAnimationFrame() {}, setTimeout() {}, console: { error() {} }, FREISCHALTUNG: { brett: () => "2d" } };
    vm.createContext(k);
    const S = vm.runInContext(START_QUELLE + "\nBRETT_3D_START;", k);
    gleich(S._modulUrl, "https://up-birdo.github.io/Blunderluck/js/brett-3d.js", "Adresse");
    wahr(k.window.BRETT_3D && k.window.BRETT_3D.platzhalter, "Platzhalter steht");
});

/* ---- Die herausgelösten Auskünfte: Platzhalter = Modul vor dem Aufbau ---- */

const schnitt = (name) => {
    const treffer = MODUL_QUELLE.match(new RegExp("\\nfunction " + name + "\\([^)]*\\) \\{[\\s\\S]*?\\n\\}"));
    if (!treffer) throw new Error("Funktion " + name + " fehlt im Modul");
    return treffer[0];
};

function aussehenWelt(lage) {
    const speicher = {};
    if (lage.gespeichert !== undefined) speicher["blunderluck.brett3d"] = lage.gespeichert;
    const k = {
        console,
        localStorage: { getItem: (x) => (x in speicher ? speicher[x] : null), setItem(x, v) { speicher[x] = String(v); } },
        location: { hostname: lage.werkstatt ? "localhost" : "up-birdo.github.io", search: lage.werkstatt ? "?werkstatt" : "" },
        TURM: { FREI_AB: { brettDreiD: 2, dreiD: 3, thema: { holz: 2, marmor: 3, nacht: 4, turnier: 5 },
            figuren: { matt: 2, porzellan: 3, metall: 4 } } },
        FORTSCHRITT_KONTO: { turmOrt: () => lage.ort, level: () => ({ level: 1 }) },
        BESITZ: { frei: (s, w) => (lage.besitz[s] || []).indexOf(w) !== -1 },
        ICH: { verwaltungAktiv: () => lage.admin, anpassungAn: () => lage.admin },
        Z: { einst: null, bereit: false },
        aussehenAnwenden() {},
        window: {},
        document: { readyState: "loading", addEventListener() {} }
    };
    vm.createContext(k);
    vm.runInContext(FREISCHALTUNG_QUELLE + "\nglobalThis.FREISCHALTUNG = FREISCHALTUNG;", k);
    vm.runInContext(AUSSEHEN_QUELLE, k);
    vm.runInContext("const AUSSEHEN = BRETT_3D_AUSSEHEN;\n"
        + ["einstellungenLaden", "einstellungenSpeichern", "anpassungErlaubt", "aussehenFrei", "aussehenLesen", "aussehenWaehlen"]
            .map(schnitt).join("\n")
        + "\nglobalThis.MODUL = { aussehen: aussehenLesen, aussehenFrei, aussehenWaehlen };", k);
    vm.runInContext(START_QUELLE + "\nglobalThis.PLATZ = BRETT_3D_START.platzhalter();", k);
    return { k, speicher };
}

pruefe("Platzhalter und Modul (vor dem Aufbau) antworten Wert für Wert gleich — frei, gesperrt, gekauft, Werkstatt, Admin", () => {
    const gespeicherte = [undefined, "kaputt{", JSON.stringify({ an: true, scheiben: true }),
        JSON.stringify({ an: true, thema: "marmor", figuren: "metall", schatten: false }),
        JSON.stringify({ thema: "holz", figuren: "matt", blick: "oben" }), JSON.stringify({ thema: "gibtsnicht", figuren: 7 })];
    const besitze = [{}, { thema: ["marmor"], figuren: ["metall"] }];
    let faelle = 0;
    for (const gespeichert of gespeicherte) for (const ort of [0, 2, 3, 5]) for (const besitz of besitze)
    for (const admin of [false, true]) for (const werkstatt of [false, true]) {
        const lage = { gespeichert, ort, besitz, admin, werkstatt };
        const tag = JSON.stringify(lage);
        const m = aussehenWelt(lage);
        const p = aussehenWelt(lage);
        gleich(p.k.PLATZ.aussehen(), m.k.MODUL.aussehen(), tag + " aussehen");
        gleich(p.k.PLATZ.aussehenFrei(), m.k.MODUL.aussehenFrei(), tag + " aussehenFrei");
        faelle += 2;
        for (const [s, werte] of [["thema", ["blunderluck", "holz", "marmor", "nacht", "gibtsnicht"]],
            ["figuren", ["emaille", "matt", "metall", "gibtsnicht"]], ["blick", ["oben"]]]) {
            for (const wert of werte) {
                const m2 = aussehenWelt(lage);
                const p2 = aussehenWelt(lage);
                gleich([p2.k.PLATZ.aussehenWaehlen(s, wert), p2.speicher], [m2.k.MODUL.aussehenWaehlen(s, wert), m2.speicher],
                    tag + " wählen " + s + "=" + wert);
                gleich(p2.k.Z.einst, null, "der Platzhalter legt kein Brett an");
                faelle++;
            }
        }
    }
    wahr(faelle > 1000, "genug Fälle (" + faelle + ")");
});

pruefe("Auskünfte: gesperrt = Vorgabe, gekauft = frei, Wahl bleibt gemerkt (Beispiele, damit der Vergleich oben nicht leer gleich ist)", () => {
    const gesperrt = aussehenWelt({ gespeichert: JSON.stringify({ thema: "marmor", figuren: "metall" }), ort: 0, besitz: {}, admin: false, werkstatt: false });
    gleich(gesperrt.k.PLATZ.aussehen(), { thema: "blunderluck", figuren: "emaille" }, "gesperrt: angezeigt die Vorgabe");
    gleich(gesperrt.k.PLATZ.aussehenWaehlen("thema", "marmor"), false, "gesperrt: nicht wählbar");
    const gekauft = aussehenWelt({ gespeichert: JSON.stringify({ thema: "marmor", figuren: "metall" }), ort: 0,
        besitz: { thema: ["marmor"] }, admin: false, werkstatt: false });
    gleich(gekauft.k.PLATZ.aussehen(), { thema: "marmor", figuren: "emaille" }, "gekauftes Thema gilt, Figuren gekürzt");
    gleich(gekauft.k.PLATZ.aussehenWaehlen("thema", "blunderluck"), true, "Vorgabe wählbar");
    gleich(JSON.parse(gekauft.speicher["blunderluck.brett3d"]), { thema: "blunderluck", figuren: "metall", blick: "schraeg",
        kacheln: "rund", schatten: true, tempo: "normal" }, "gespeichert: die Wahl, die gemerkten Figuren bleiben, keine Brett-Art erfunden");
    const ort = aussehenWelt({ gespeichert: JSON.stringify({ figuren: "matt" }), ort: 2, besitz: {}, admin: false, werkstatt: false });
    gleich(ort.k.PLATZ.aussehen(), { thema: "blunderluck", figuren: "matt" }, "erspielt (Holzhalle): Matt gilt");
    gleich(ort.k.PLATZ.aussehenFrei(), false, "aussehenFrei nur Admin/Werkstatt");
    gleich(aussehenWelt({ ort: 0, besitz: {}, admin: true, werkstatt: false }).k.PLATZ.aussehenFrei(), true, "Admin");
});

pruefe("Das Modul nimmt die Tabellen und die Logik aus brett-3d-aussehen.js — nichts doppelt geführt", () => {
    wahr(/const AUSSEHEN = BRETT_3D_AUSSEHEN;/.test(MODUL_QUELLE), "AUSSEHEN");
    wahr(/const \{ THEMEN, FIGUR_STILE, KACHELN, TEMPI, VORGABE \} = AUSSEHEN;/.test(MODUL_QUELLE), "Tabellen");
    wahr(/BLICKE\[id\] = \{ name: blick\.name, winkel: THREE\.MathUtils\.degToRad\(blick\.grad\) \};/.test(MODUL_QUELLE), "Blicke umgerechnet");
    for (const name of ["SPEICHER_SCHLUESSEL", "dreiDGilt", "stueckFrei"]) {
        wahr(MODUL_QUELLE.indexOf(name) === -1, name + " steht nicht mehr im Modul");
    }
    wahr(!/localStorage/.test(MODUL_QUELLE.slice(0, MODUL_QUELLE.indexOf("function dauer("))), "kein eigener Speicherzugriff für die Einstellungen");
    wahr(!/three|THREE/.test(AUSSEHEN_QUELLE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")), "brett-3d-aussehen.js kennt three.js nicht");
    wahr(!/import\(|^import /m.test(AUSSEHEN_QUELLE), "klassisch, ohne import");
    const A = require(pfad.join(__dirname, "..", "js", "brett-3d-aussehen.js"));
    gleich(Object.keys(A.BLICKE), ["oben", "schraeg"], "Blicke");
    gleich([A.BLICKE.oben.grad, A.BLICKE.schraeg.grad], [4, 30], "Grade wie bis v0.165.1 (4 und 30)");
});

pruefe("Werkstatt-Seite: lädt brett-3d-aussehen.js vor dem festen Modul", () => {
    const werkstatt = lesen("_werkstatt-3d.html");
    const a = werkstatt.indexOf("<script src=\"js/brett-3d-aussehen.js\"></script>");
    wahr(a > 0 && a < werkstatt.indexOf("<script type=\"module\" src=\"js/brett-3d.js\"></script>"), "Reihenfolge");
});

/* ---- v0.166.1: bei gewähltem 3D früh herunterladen (js\brett-3d-vorab.js) ---- */

const VORAB_QUELLE = lesen("js/brett-3d-vorab.js");
const VORAB = require(pfad.join(__dirname, "..", "js", "brett-3d-vorab.js"));

pruefe("Vorab: wo FREISCHALTUNG.brett() etwas anderes als 2D sagt, lädt es vorab — in jeder Kombination (die echte freischaltung.js)", () => {
    const werte = [undefined, true, false, "true", 1];
    let faelle = 0;
    let vorab = 0;
    for (const an of werte) for (const oben of werte) for (const scheiben of werte) for (const ort of [0, 2, 3, 5]) {
        const gespeichert = {};
        if (an !== undefined) gespeichert.an = an;
        if (oben !== undefined) gespeichert.oben = oben;
        if (scheiben !== undefined) gespeichert.scheiben = scheiben;
        const roh = JSON.stringify(gespeichert);
        const w = aussehenWelt({ gespeichert: roh, ort, besitz: {}, admin: false, werkstatt: false });
        const art = w.k.FREISCHALTUNG.brett();
        if (art !== "2d") {
            wahr(VORAB.gewuenscht(roh), roh + " Ort " + ort + ": " + art + " gilt, aber kein Vorab-Laden");
        }
        if (VORAB.gewuenscht(roh)) vorab++;
        faelle++;
    }
    for (const kaputt of [null, "", "kaputt{", "null", "7", "[]"]) {
        gleich(VORAB.gewuenscht(kaputt), false, "unlesbar: " + kaputt);
    }
    gleich(VORAB.gewuenscht(JSON.stringify({})), false, "nichts gewählt (Vorgabe 2D)");
    gleich(VORAB.gewuenscht(JSON.stringify({ an: false, oben: false, scheiben: true })), false, "2D");
    wahr(faelle === 500 && vorab > 0 && vorab < faelle, "Fälle " + faelle + ", vorab " + vorab);
});

/* Alle Dateien, die das Modul braucht: seine Imports und — seit v0.166.2 — die der Zusätze, rekursiv aus den
   `import … from "…"`-Zeilen gelesen (auch mehrzeilige), wie die Import-Karte sie auflöst. */
function alleImporte() {
    const jsOrdner = pfad.join(__dirname, "..", "js");
    const aufloesen = (spez, von) => {
        if (spez === "three") return "lib/three/three.module.min.js";
        if (spez.indexOf("three/addons/") === 0) return "lib/three/addons/" + spez.slice("three/addons/".length);
        if (/^\.\.?\//.test(spez)) return pfad.posix.normalize(pfad.posix.join(pfad.posix.dirname(von), spez));
        throw new Error("unbekannte Angabe " + spez + " in " + von);
    };
    const gefunden = new Set(["brett-3d.js"]);
    const offen = ["brett-3d.js"];
    while (offen.length) {
        const datei = offen.pop();
        const quelle = fs.readFileSync(pfad.join(jsOrdner, datei), "utf8");
        const angaben = [...quelle.matchAll(/(?:^|[\s;])(?:import|export)\s*(?:[\w*{}\s,$]*?\s*from\s*)?["']([^"']+)["']/g)].map((t) => t[1]);
        for (const spez of angaben) {
            const ziel = aufloesen(spez, datei);
            if (!gefunden.has(ziel)) {
                gefunden.add(ziel);
                offen.push(ziel);
            }
        }
    }
    return [...gefunden];
}

pruefe("Vorab: genau die Dateien, die das Modul und seine Zusätze importieren — als modulepreload neben der Datei, nichts ausgeführt", () => {
    const importe = alleImporte();
    wahr(importe.indexOf("lib/three/addons/utils/BufferGeometryUtils.js") !== -1, "die Suche findet auch die Imports der Zusätze");
    gleich(VORAB.DATEIEN.slice().sort(), importe.slice().sort(), "dieselben Dateien wie die Import-Kette von js/brett-3d.js");
    gleich(VORAB.DATEIEN[0], "brett-3d.js", "das Modul selbst zuerst");
    for (const datei of VORAB.DATEIEN) {
        wahr(fs.existsSync(pfad.join(__dirname, "..", "js", datei)), datei + " fehlt");
    }
    const n = VORAB.DATEIEN.length;
    const links = [];
    const dok = { createElement: () => ({}), head: { appendChild: (l) => links.push(l) } };
    gleich(VORAB.vorladen("https://up-birdo.github.io/Blunderluck/js/brett-3d-vorab.js", dok), n, "ein Link je Datei");
    gleich(links.map((l) => l.rel), Array(n).fill("modulepreload"), "nur modulepreload");
    gleich(links[0].href, "https://up-birdo.github.io/Blunderluck/js/brett-3d.js", "dieselbe Adresse, die brett-3d-start.js per import() lädt");
    const code = VORAB_QUELLE.replace(/\/\*[\s\S]*?\*\//g, "");
    wahr(!/import\(|BRETT_3D_START|<script/.test(code), "kein import(), kein Start — nur herunterladen");
    wahr(VORAB.SCHLUESSEL === require(pfad.join(__dirname, "..", "js", "brett-3d-aussehen.js")).SPEICHER_SCHLUESSEL,
        "derselbe Speicher-Schlüssel wie brett-3d-aussehen.js");
});

pruefe("Vorab im Browser-Ablauf: 3D gewünscht → Links; 2D → nichts; ohne Speicher → nichts, kein Fehler", () => {
    const lauf = (roh, ohneSpeicher) => {
        const links = [];
        const k = {
            URL,
            document: { currentScript: { src: "http://127.0.0.1:8370/js/brett-3d-vorab.js" }, createElement: () => ({}),
                head: { appendChild: (l) => links.push(l) } },
            localStorage: ohneSpeicher ? { getItem() { throw new Error("gesperrt"); } } : { getItem: () => roh }
        };
        vm.createContext(k);
        vm.runInContext(VORAB_QUELLE, k);
        return links.length;
    };
    gleich(lauf(JSON.stringify({ an: true })), VORAB.DATEIEN.length, "3D-Brett gewünscht");
    gleich(lauf(JSON.stringify({ oben: true })), VORAB.DATEIEN.length, "3D-Figuren oben gewünscht");
    gleich(lauf(JSON.stringify({ an: false })), 0, "2D");
    gleich(lauf(null), 0, "nichts gespeichert");
    gleich(lauf(null, true), 0, "privates Fenster");
});

Promise.all(offen).then(() => {
    console.log(anzahlOk + " ok, " + anzahlFehler + " Fehler");
    process.exit(anzahlFehler === 0 ? 0 : 1);
});
