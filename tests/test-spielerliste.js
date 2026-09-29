/*
 * test-spielerliste.js — die Spielerliste für Admins in der Verwaltung (seit v0.152.1; gemeinsamer Baustein
 * js\upcrew-spielerliste.js aus final) und die Waren-Texte je Spiel im Shop (Option `texte`, Vorschlag
 * docs\bausteine\upcrew-shop.js).
 *
 * Geprüft: Blunderlucks Rechner (Rolle, Level, Serie über beide Zweige, Abzeichen, Münzen als Saldo über alle
 * Zweige), UP#Plus fehlt, nur für Admins; der Shop zeigt eigene Texte, ohne UPCREW_MUENZEN.WAREN zu verändern.
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
const FORTSCHRITT = require(pfad.join(projekt, "js", "fortschritt.js"));
const M = require(pfad.join(projekt, "js", "upcrew-muenzen.js"));
const AZ = require(pfad.join(projekt, "js", "upcrew-abzeichen.js"));
const SL = require(pfad.join(projekt, "js", "upcrew-spielerliste.js"));

function heuteMinus(n) {
    return FORTSCHRITT.datumVon(Date.now() - n * 86400000);
}

function verwaltung(daten, admin) {
    const umgebung = {
        console, Date, JSON, Math, Object,
        FORTSCHRITT, UPCREW_MUENZEN: M, UPCREW_ABZEICHEN: AZ, UPCREW_SPIELERLISTE: SL,
        SPIELER: { istVerteiler: (e) => e.tag === "Plus" },
        KONTO: {
            uid: () => "u-admin",
            istAdmin: () => admin,
            rolleVon: (d, uid) => (uid === "u-admin" ? "Admin" : "")
        },
        ANMELDUNG: { abgleich: { daten: daten } },
        DIALOG: { hinweis() {} },
        document: { createElement: () => ({ appendChild() {}, set textContent(w) {} }) }
    };
    vm.createContext(umgebung);
    return vm.runInContext(lesen("js/verwaltungs-bildschirm.js") + "\n;VERWALTUNGS_BILDSCHIRM", umgebung);
}

let fortschritt = FORTSCHRITT.rundeGestartet({}, heuteMinus(1), 1, "typoluck", 0).stand;
fortschritt = FORTSCHRITT.rundeGestartet(fortschritt, heuteMinus(0), 2, "blunderluck", 0).stand;
fortschritt = M.verdienen(fortschritt, "blunderluck", 40, 3);
fortschritt = M.verdienen(fortschritt, "typoluck", 25, 3);
fortschritt = M.kaufen(fortschritt, "typoluck", "tipp", 4).stand;

const DATEN = { spieler: [
    { id: "a", uid: "u-admin", name: "Anna", tag: "0001", fortschritt: fortschritt },
    { id: "b", uid: "u-bob", name: "Bob", tag: "0002" },
    { id: "up", uid: "u-up", name: "UP", tag: "Plus" },
    { id: "g", uid: "u-g", name: "Gast", tag: "1234", gast: true }
] };

pruefe("Rechner: Rolle, Level, Serie über beide Zweige, Abzeichen, Münzen als Saldo", () => {
    const zeilen = verwaltung(DATEN, true)._spielerlisteDaten();
    gleich(zeilen.map((z) => z.name), ["Anna", "Bob", "Gast"], "UP#Plus fehlt");
    const anna = zeilen[0];
    gleich(anna.rolle, "Admin", "Rolle");
    gleich(anna.serie, 2, "Typoluck gestern + Blunderluck heute");
    gleich(anna.muenzen, 40 + 25 - 15, "Saldo über beide Zweige");
    wahr(anna.abzeichen && anna.abzeichen.alle === 5, "Abzeichen n/5");
    gleich(anna.level, FORTSCHRITT.level(fortschritt).level, "Level");
    gleich(zeilen[1].muenzen, 0, "ohne Fortschritt 0");
    wahr(/50 Münzen/.test(SL.kurzzeile(anna)), "Münzen in der Kurzzeile: " + SL.kurzzeile(anna));
});

pruefe("Nur für Admins", () => {
    gleich(verwaltung(DATEN, false)._spielerlisteBauen(), null, "ohne Rolle keine Liste");
    const quelle = lesen("js/verwaltungs-bildschirm.js");
    wahr(/_spielerlisteBauen\(\)/.test(quelle) && /_kontoTabelleBauen\(\)/.test(quelle), "neben der Konto-Tabelle");
});

pruefe("Shop: eigene Texte je Spiel, WAREN bleiben unverändert", () => {
    global.UPCREW_MUENZEN = M;
    try {
        const S = require(pfad.join(projekt, "js", "upcrew-shop.js"));
        const vorher = JSON.stringify(M.WAREN);
        gleich(S.text("leben", { leben: { name: "Zweite Chance", text: "Nochmal raten" } }),
            { name: "Zweite Chance", text: "Nochmal raten" }, "eigener Text");
        gleich(S.text("tipp", {}).name, "Tipp", "Rückfall auf WAREN");
        gleich(S.text("leben").text, M.WAREN.leben.text, "ohne texte");
        gleich(JSON.stringify(M.WAREN), vorher, "WAREN unverändert");
        const shop = lesen("js/shop.js");
        wahr(/texte: SHOP\.TEXTE/.test(shop) && !/UPCREW_MUENZEN\.WAREN\.[a-z]+\.(name|text)\s*=/.test(shop),
            "Blunderluck setzt Texte über die Option");
        /* Seit v0.152.2 ist der Vorschlag der genutzten Fassung voraus
           (Option `bilder`, Zeit zurück als Uhr) — `texte` steckt in beiden
           gleich. */
        const vorschlag = lesen("docs/bausteine/upcrew-shop.js");
        const textTeil = /function text\(id, texte\) \{[\s\S]*?\n    \}/.exec(lesen("js/upcrew-shop.js"));
        wahr(textTeil && vorschlag.indexOf(textTeil[0]) !== -1, "Vorschlag enthält die genutzte Option texte");
        wahr(/bild\(id, opt\.bilder\)/.test(vorschlag), "Vorschlag: Option bilder");
    } finally {
        delete global.UPCREW_MUENZEN;
    }
});

pruefe("Eingebunden: Spielerliste geladen und offline", () => {
    const index = lesen("index.html");
    const sw = lesen("sw.js");
    for (const d of ["js/upcrew-spielerliste.js", "css/upcrew-spielerliste.css"]) {
        wahr(index.indexOf(d) !== -1 && sw.indexOf("\"./" + d + "\"") !== -1, d);
    }
    wahr(index.indexOf("js/upcrew-spielerliste.js") < index.indexOf("js/verwaltungs-bildschirm.js"), "vor der Verwaltung");
});

console.log(anzahlOk + " ok, " + anzahlFehler + " Fehler");
process.exit(anzahlFehler === 0 ? 0 : 1);
