/*
 * test-muenzen.js — Serie ab Rundenstart (über 60 Tage), Münzen und Shop (seit v0.152.0; Nutzer 27.09.2026:
 * „Serie soll einfach: einmal eine Runde starten, egal welches Game“ · „ja über 60“ · „In-Game-Währung, die über
 * beide Spiele geht … Extra-Leben, Tipps und Schild für Flammen … in einem Shop“ · „Name → Münzen“).
 *
 * Geprüft: Serie aus beiden Zweigen, ab Rundenstart, über 60 Tage (Zähler), ohne Rettung (v0.157.0) samt Erstattung,
 * Zusammenführen zweier Geräte; Kontostand als Summe, nie unter 0 beim Kaufen, Preise, Vorrat (Schild höchstens 2),
 * gleichzeitiger Kauf auf zwei Geräten; der Shop-Baustein (Karten, gesperrt, Kaufen); die Schleuse zum Konto
 * (§11b) lässt die neuen Zähler durch; Einbindung (Shop statt Bald, Anpfiff, Tipp, Leben, Tagesbrett-Hilfe).
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
const F = require(pfad.join(__dirname, "fortschritt-laden.js"));
const M = require(pfad.join(projekt, "js", "upcrew-muenzen.js"));

/* Ein Datum N Tage nach dem 1.1.2026. */
function tag(n) {
    const d = new Date(Date.UTC(2026, 0, 1 + n, 12));
    return d.toISOString().slice(0, 10);
}

/* ---------------- Serie ---------------- */

pruefe("Serie: jeder Rundenstart zählt, einmal je Tag, über beide Spiele", () => {
    let stand = {};
    stand = F.rundeGestartet(stand, tag(0), 1, "blunderluck", 0).stand;
    const zweimal = F.rundeGestartet(stand, tag(0), 2, "blunderluck", 0);
    gleich(zweimal.neu, false, "am selben Tag nur einmal");
    stand = F.rundeGestartet(stand, tag(1), 3, "typoluck", 0).stand;
    const r = F.rundeGestartet(stand, tag(2), 4, "blunderluck", 0);
    gleich(r.serie, 3, "Blunderluck, Typoluck, Blunderluck");
    gleich(F.serie(r.stand, tag(2), 0), { tage: 3, heute: true, schutzGenutzt: 0 }, "heute gestartet");
    gleich(F.serie(r.stand, tag(3), 0).heute, false, "morgen noch offen");
    gleich(F.serie(r.stand, tag(3), 0).tage, 3, "läuft noch");
    gleich(F.serie(r.stand, tag(5), 0).tage, 0, "zwei Tage verpasst: vorbei");
    gleich(r.stand.spiele.blunderluck.zaehler.serieBis, 20260103, "Zähler bis (JJJJMMTT)");
});

pruefe("Serie über 60 Tage (Zähler statt Tagesliste), auch abwechselnd in beiden Spielen", () => {
    let stand = {};
    for (let n = 0; n < 400; n++) {
        stand = F.rundeGestartet(stand, tag(n), n + 1, n % 3 === 0 ? "typoluck" : "blunderluck", 0).stand;
    }
    gleich(F.serie(stand, tag(399), 0).tage, 400, "400 Tage");
    wahr(stand.spiele.blunderluck.tage.length <= 60, "Tagesliste bleibt kurz: " + stand.spiele.blunderluck.tage.length);
    stand = F.rundeGestartet(stand, tag(1400), 9999, "blunderluck", 0).stand;
    gleich(F.serie(stand, tag(1400), 0).tage, 1, "nach langer Pause neu bei 1");
});

pruefe("Serie ohne Rettung (seit v0.157.0): ein verpasster Tag reisst sie, auch mit alten Schilden und hohem Level", () => {
    let stand = {};
    stand = F.rundeGestartet(stand, tag(0), 1, "blunderluck", 0).stand;
    stand = F.rundeGestartet(stand, tag(2), 2, "blunderluck", 0).stand;
    gleich(F.serie(stand, tag(2), 0).tage, 1, "gerissen");
    gleich(F.schutzVerdient(40), 0, "Level bringt keinen Schutz mehr");

    /* Ein alter Stand mit gekauften, unbenutzten Schilden (Zähler bleiben liegen). */
    let alt = F.rundeGestartet({}, tag(0), 1, "blunderluck", 0).stand;
    alt.spiele.blunderluck.zaehler.schildGekauft = 2;
    gleich(F.schildVorrat(alt), 0, "Vorrat immer 0");
    gleich(F.serie(alt, tag(2), F.schutzVerdient(40)).tage, 0, "gestern verpasst: Serie auf 0");
    alt = F.rundeGestartet(alt, tag(2), 4, "blunderluck", F.schutzVerdient(40)).stand;
    gleich(F.serie(alt, tag(2), 0).tage, 1, "neu bei 1");
    gleich(alt.spiele.blunderluck.zaehler.schildGenutzt || 0, 0, "kein Schild verbraucht");
});

pruefe("Alte Schilde: einmal Kaufpreis in Münzen erstattet, nie doppelt (auch nicht über zwei Geräte)", () => {
    let s = M.verdienen({}, "blunderluck", 10, 1);
    s.spiele.blunderluck.zaehler.schildGekauft = 2;
    s.spiele.blunderluck.zaehler.schildGenutzt = 0;
    const vorher = M.saldo(s);
    const r = F.schildeErstatten(s, "blunderluck", 50, 5);
    gleich([r.stueck, r.muenzen], [2, 100], "zwei Stück = 100 Münzen");
    gleich(M.saldo(r.stand), vorher + 100, "gutgeschrieben");
    gleich(r.stand.spiele.blunderluck.zaehler.schildErstattet, 2, "gemerkt");
    gleich(F.schildeErstatten(r.stand, "blunderluck", 50, 6).stueck, 0, "zweites Mal nichts");
    /* Zwei Geräte erstatten gleichzeitig: beim Zusammenführen gilt je Zähler das Grössere. */
    const zweites = F.schildeErstatten(s, "blunderluck", 50, 7).stand;
    gleich(M.saldo(F.zusammenfuehren(r.stand, zweites)), vorher + 100, "zusammengeführt nicht doppelt");
    /* Ein verbrauchter Schild wird nicht erstattet; ein in Typoluck gekaufter nur dort. */
    const t = { spiele: { blunderluck: { stand: 1, zaehler: { schildGekauft: 1, schildGenutzt: 1 } } } };
    gleich(F.schildeErstatten(t, "blunderluck", 50, 2).stueck, 0, "verbraucht: nichts");
    const tl = { spiele: { typoluck: { stand: 1, zaehler: { schildGekauft: 1 } } } };
    gleich(F.schildeErstatten(tl, "blunderluck", 50, 2).stueck, 0, "in Typoluck gekauft: nicht hier");
});
pruefe("Alte Stände ohne Zähler: dieselbe Rechnung wie bisher (aus den Tagen)", () => {
    const stand = { spiele: {
        blunderluck: { tage: ["2026-09-24", "2026-09-26"] },
        typoluck: { tage: ["2026-09-25", "2026-09-22"] } } };
    gleich(F.serie(stand, "2026-09-26", 0).tage, 3, "24–26");
    gleich(F.serie(stand, "2026-09-26", 1).tage, 4, "22 + Schutz 23 + 24–26");
});

pruefe("Tagesaufgaben zählen jetzt im Zähler (Umzug aus den alten Tagen)", () => {
    const alt = { spiele: { blunderluck: { xp: 0, partien: 0, gezaehlt: [], stand: 1,
        tage: ["2026-09-20", "2026-09-21"] } } };
    let s = F.rundeGestartet(alt, "2026-09-27", 2, "blunderluck", 0).stand;
    gleich(s.spiele.blunderluck.zaehler.tagesaufgaben, 2, "die zwei alten Tage waren Tagesaufgaben");
    s = F.tagesaufgabe(s, "2026-09-27", true, 3, "blunderluck", 0, 2).stand;
    gleich(s.spiele.blunderluck.zaehler.tagesaufgaben, 3, "+1");
    const mitHilfe = F.tagesaufgabe(alt, "2026-09-27", true, 3, "blunderluck", 0, 2, true).stand;
    gleich(mitHilfe.spiele.blunderluck.heute.figuren, 1, "mit Hilfe höchstens ein Bauer");
});

pruefe("Zwei Geräte, dasselbe Spiel: wachsende Zähler nehmen das Größere, Serie aus dem neueren", () => {
    const a = { spiele: { blunderluck: { stand: 10, zaehler: { muenzenVerdient: 30, serie: 5, serieBis: 20260105 } } } };
    const b = { spiele: { blunderluck: { stand: 20, zaehler: { muenzenVerdient: 12, serie: 2, serieBis: 20260101 } } } };
    const z = F.zusammenfuehren(a, b).spiele.blunderluck.zaehler;
    gleich(z.muenzenVerdient, 30, "Münzen gehen nicht verloren");
    gleich([z.serie, z.serieBis], [5, 20260105], "Serie aus dem neueren serieBis");
});

/* ---------------- Münzen ---------------- */

pruefe("Kontostand = Summe über beide Zweige, Preise und Vorrat", () => {
    gleich(M.WAEHRUNG.name, "Münzen", "Name an einer Stelle");
    gleich(M.WAREN.schild, undefined, "kein Flammen-Schild mehr (seit v0.157.0)");
    gleich([M.WAREN.leben.preis, M.WAREN.tipp.preis], [30, 15], "Preise");
    gleich(M.VERDIENST, { tagesaufgabe: 10, sieg: 3, figur: 5, boss: 25, serieWoche: 20, level: 10 }, "Verdienst");
    let s = M.verdienen({}, "blunderluck", 40, 1);
    s = M.verdienen(s, "typoluck", 30, 1);
    gleich(M.saldo(s), 70, "40 + 30");
    const k = M.kaufen(s, "typoluck", "leben", 2);
    wahr(k.ok, "kaufen");
    gleich(M.saldo(k.stand), 40, "70 − 30");
    gleich(M.vorrat(k.stand, "leben"), 1, "ein Leben");
    gleich(k.stand.spiele.blunderluck.zaehler.muenzenVerdient, 40, "Blunderlucks Zweig unberührt");
    const b = M.benutzen(k.stand, "blunderluck", "leben", 3);
    wahr(b.ok, "benutzen (in dem anderen Spiel gekauft)");
    gleich(M.vorrat(b.stand, "leben"), 0, "weg");
    gleich(M.benutzen(b.stand, "blunderluck", "leben", 4).ok, false, "ohne Vorrat nicht");
});

pruefe("Nie unter 0 beim Kaufen; kein Schild mehr; gleichzeitiger Kauf zweier Geräte", () => {
    let s = M.verdienen({}, "blunderluck", 29, 1);
    gleich(M.kaufen(s, "blunderluck", "leben", 2).ok, false, "29 reicht nicht für 30");
    gleich(M.kannKaufen(s, "leben").grund, "zuWenig", "Grund");
    s = M.verdienen(s, "blunderluck", 200, 2);
    gleich(M.kaufen(s, "blunderluck", "schild", 3).ok, false, "Schild nicht mehr kaufbar");
    gleich(M.kannKaufen(s, "schild").grund, "unbekannt", "unbekannte Ware");
    gleich(M.vorrat(s, "schild"), 0, "Vorrat 0");
    /* Zwei Geräte sehen denselben Stand (60) und kaufen je ein Leben für 30 … und je ein Tipp. */
    let basis = M.verdienen({}, "blunderluck", 30, 1);
    basis = M.verdienen(basis, "typoluck", 10, 1);
    const geraetA = M.kaufen(basis, "blunderluck", "leben", 5).stand;
    const geraetB = M.kaufen(basis, "typoluck", "leben", 5).stand;
    const zusammen = F.zusammenfuehren(geraetA, geraetB);
    gleich(M.saldo(zusammen), -20, "ehrlich gerechnet: 40 − 60");
    gleich(M.anzeige(zusammen), 0, "angezeigt nie unter 0");
    gleich(M.vorrat(zusammen, "leben"), 2, "beide Käufe bleiben (nichts überschrieben)");
    gleich(M.kannKaufen(zusammen, "tipp").ok, false, "erst neu verdienen");
});

/* ---------------- Shop-Baustein ---------------- */

function dom() {
    const el = (tag) => ({
        /* `dataset` seit v0.163.0: Der neue Shop-Baustein merkt an seinen zwei Reiter-Knöpfen, wofür sie stehen —
           auch wenn (wie hier, ohne Katalog und Besitz) nur der Vorrat gezeichnet wird. */
        tag, kinder: [], className: "", textContent: "", attribute: {}, dataset: {}, disabled: false, lauscher: {},
        classList: { add(k) { this._besitzer.className = (this._besitzer.className + " " + k).trim(); } },
        appendChild(k) { this.kinder.push(k); return k; }, setAttribute(n, w) { this.attribute[n] = w; },
        addEventListener(n, f) { this.lauscher[n] = f; }
    });
    return {
        createElement: (t) => { const e = el(t); e.classList._besitzer = e; Object.defineProperty(e, "textContent", {
            get() { return this._text || ""; }, set(w) { this._text = w; if (w === "") { this.kinder = []; } } }); return e; },
        createElementNS: (ns, t) => el(t)
    };
}

pruefe("Shop: zwei Karten (ohne Schild), Preis, gesperrt ohne Geld, Kaufen ruft die App", () => {
    global.document = dom();
    global.UPCREW_MUENZEN = M;
    try {
        const S = require(pfad.join(projekt, "js", "upcrew-shop.js"));
        let stand = M.verdienen({}, "blunderluck", 20, 1);
        const gekauft = [];
        const behaelter = global.document.createElement("section");
        const griff = S.bauen(behaelter, { titel: "Shop", lesen: () => stand,
            kaufen: async (w) => { gekauft.push(w); return true; } });
        const karten = griff.liste.kinder;
        gleich(karten.length, 2, "Leben, Tipp");
        const knopf = (k) => k.kinder[2].kinder[1];
        gleich(karten.map((k) => k.className.indexOf("up-shop-zu") !== -1), [true, false], "nur der Tipp (15) geht mit 20");
        gleich(knopf(karten[0]).disabled, true, "Zeit zurück gesperrt");
        knopf(karten[1]).lauscher.click();
        gleich(gekauft, ["tipp"], "Kaufen ruft die App");
    } finally {
        delete global.document;
        delete global.UPCREW_MUENZEN;
    }
});

pruefe("Shop: Zeit zurück zeigt die Uhr (Option bilder, seit v0.153.0 aus final)", () => {
    global.document = dom();
    global.UPCREW_MUENZEN = M;
    try {
        const S = require(pfad.join(projekt, "js", "upcrew-shop.js"));
        const uhr = "M4.5 12 A7.5 7.5 0 1 0 6.7 6.7 L4 9.4 M4 5.4 V9.4 H8 M12 8 V12 L14.5 13.5";
        const behaelter = global.document.createElement("section");
        const griff = S.bauen(behaelter, { titel: "Shop", lesen: () => ({}), kaufen: async () => true,
            bilder: { leben: uhr } });
        const pfadVon = (karte) => karte.kinder[0].kinder[0].kinder[0].attribute.d;
        const karten = griff.liste.kinder;
        gleich(pfadVon(karten[0]), uhr, "Zeit zurück: Uhr");
        wahr(pfadVon(karten[1]) && pfadVon(karten[1]) !== uhr, "Tipp: gemeinsames Bild");
        const shop = lesen("js/shop.js");
        wahr(shop.indexOf(uhr) !== -1 && /bilder: SHOP\.BILDER/.test(shop), "Blunderluck gibt die Uhr mit");
    } finally {
        delete global.document;
        delete global.UPCREW_MUENZEN;
    }
});

/* ---------------- Konto und Einbindung ---------------- */

pruefe("Die Schleuse zum Konto lässt die neuen Zähler durch (Regel §11b: Buchstaben-Namen mit Zahlen)", () => {
    let s = F.rundeGestartet({}, "2026-09-27", 5, "blunderluck", 0).stand;
    s = M.verdienen(s, "blunderluck", 123, 6);
    s = M.kaufen(s, "blunderluck", "tipp", 7).stand;
    const k = F.fuerKonto(s).spiele.blunderluck.zaehler;
    for (const name of ["serie", "serieBis", "serieSchutz", "muenzenVerdient", "muenzenAusgegeben", "tippGekauft", "tagesaufgaben"]) {
        wahr(typeof k[name] === "number", name + " geht ans Konto");
        wahr(/^[a-zA-Z]{1,32}$/.test(name) && k[name] <= 1000000000, name + " passt zur Regel");
    }
    gleich(k.serieBis, 20260927, "Datum als Zahl");
});

pruefe("Eingebunden: Shop statt Bald, Anpfiff zählt, Tipp und Leben, Münzen je Partie", () => {
    const app = lesen("js/app.js");
    wahr(/TABS\.registrieren\(SHOP\)/.test(app) && !/TABS\.registrieren\(BALD\)/.test(app), "Shop auf Platz 5");
    wahr(/shop: "/.test(lesen("js/zustand.js")), "Symbol Shop");
    const ts = lesen("js/team-schach.js");
    wahr(/FORTSCHRITT_KONTO\.rundeGestartet\(\)/.test(ts), "Anpfiff meldet die Serie");
    wahr(/tippZeigen/.test(ts) && /FORTSCHRITT_KONTO\.vorrat\("tipp"\) > 0/.test(ts), "Tipp nur mit Vorrat");
    /* Seit v0.152.2 heisst das Leben „Zeit zurück" (test-zeit-zurueck.js). */
    wahr(/zeitZurueckEinsetzen/.test(lesen("js/team-schach-auswertung.js")), "Zeit zurück im Abschluss");
    const fk = lesen("js/fortschritt-konto.js");
    wahr(/_muenzenFuerPartie/.test(fk) && /hilfeGenutzt\(partie\.id\)/.test(fk), "Münzen je Partie, Hilfe beim Tagesbrett");
    const index = lesen("index.html");
    for (const d of ["js/upcrew-muenzen.js", "js/upcrew-shop.js", "js/shop.js", "css/upcrew-shop.css"]) {
        wahr(index.indexOf(d) !== -1 && lesen("sw.js").indexOf("\"./" + d + "\"") !== -1, d + " geladen und offline");
    }
});

console.log(anzahlOk + " ok, " + anzahlFehler + " Fehler");
process.exit(anzahlFehler === 0 ? 0 : 1);
