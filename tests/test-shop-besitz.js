/*
 * test-shop-besitz.js — der Shop mit Besitz (v0.163.0, UPCrew Runde 8, Auftrag
 * ..\UPCrew\AUFTRAG-Blunderluck-v0.163.0.md samt Nachtrag der Koordination 04.10.2026, 02:10 Uhr), dazu die sicheren
 * Punkte aus dem Befund der Nacht (..\UPCrew\werkbank\nacht-2026-10-04\BEFUND-Blunderluck.md, Tabelle 1).
 *
 * Es laufen die ECHTEN Dateien: js\besitz.js, js\shop.js, js\sammlung.js, js\spieler.js, js\fortschritt-konto.js,
 * js\freischaltung.js, js\brett-design.js und die echten Bausteine (upcrew-besitz, -katalog, -muenzen, -shop,
 * -platz, -blatt, -anpassen, -sammlung, -aussehen …).
 *
 *   A. BESITZ (kleine Welt: kleines Dokument, Gerätespeicher, die Anmeldung als Attrappe)
 *      Kauf zieht Münzen ab und legt Besitz an · zu wenig Münzen = kein Kauf · doppelter Kauf unmöglich ·
 *      Reihenfolge Merker → Besitz → Fortschritt · Gast kauft nur aufs Gerät · mit Konto auch ans Konto ·
 *      Gerät und Konto werden vereinigt · ZWEI PERSONEN AUF EINEM GERÄT sehen je nur ihren Besitz, Abmelden zeigt
 *      den Gast-Besitz · Gast → Konto wie der Fortschritt · Merker „Kauf offen" nur für die Person von jetzt.
 *   B. SHOP UND SAMMLUNG am kleinen Dokument: der Reiter „Design", Kauf über das Blatt samt Rückfrage, das
 *      gekaufte Stück ist in der Sammlung frei und lässt sich übernehmen, die Anprobe speichert nichts und endet
 *      beim Tab-Wechsel; Preise stehen nur im Katalog.
 *   C. GEGEN DIE REGEL §13 (tests\regel-nachbau.js wertet den echten Regeltext aus): Die Form, die das Spiel
 *      schreibt, wird angenommen; der gebuchte Zähler geht durch; ein Kauf aus dem anderen Spiel geht beim
 *      nächsten Schreiben nicht verloren.
 *   D. BEFUND Tabelle 1: Nr. 1 (Wartezeit je Fehlschlag verdoppeln, höchstens 30 s), Nr. 2 (Marke beim Start),
 *      Nr. 4 (Rangliste baut nur, wenn sie zu sehen ist), Nr. 5 (Fokus zurück an den Auslöser), Nr. 6 (Turm-Karte
 *      einmal bauen).
 *
 * Dass die Listen des Spiels dem Katalog gleichen (brett2d, brett3d, figurstil), prüft test-sammlung-a.js (1).
 * Wie der Shop aussieht und ob nichts waagrecht rollt, zeigt nur der Browser (ansicht\v0.163.0, UEBERGABE.md).
 *
 * Aufruf: siehe tests\README.md
 */

const fs = require("fs");
const pfad = require("path");
const vm = require("vm");
const { dokumentBauen } = require("./kleines-dom.js");
const { firebaseMitRegel } = require("./regel-nachbau.js");

let anzahlOk = 0;
let anzahlFehler = 0;

async function pruefe(bezeichnung, funktion) {
    try {
        await funktion();
        anzahlOk++;
    } catch (fehler) {
        anzahlFehler++;
        console.error("FEHLER: " + bezeichnung);
        console.error("        " + (fehler && fehler.stack ? fehler.stack.split("\n").slice(0, 3).join(" | ") : fehler));
    }
}

function gleich(ist, soll, was) {
    if (JSON.stringify(ist) !== JSON.stringify(soll)) {
        throw new Error((was || "Wert") + ": ist " + JSON.stringify(ist) + ", soll " + JSON.stringify(soll));
    }
}

function wahr(bedingung, was) {
    if (!bedingung) {
        throw new Error((was || "Bedingung") + " war nicht erfüllt");
    }
}

const projekt = pfad.join(__dirname, "..");
const lesen = (name) => fs.readFileSync(pfad.join(projekt, name), "utf8").replace(/\r\n/g, "\n");
const ohneKommentare = (text) => text.replace(/\/\*[\s\S]*?\*\//g, "");
const warten = () => new Promise((fertig) => setTimeout(fertig, 0));

/* ------------------------------------------------------------------ *
 * Die kleine Welt (A und B)
 * ------------------------------------------------------------------ */

/* In der Reihenfolge aus index.html (soweit Shop, Besitz und Sammlung sie brauchen). */
const DATEIEN = ["js/spieler.js", "js/fortschritt-kern.js", "js/fortschritt.js", "js/upcrew-zufall.js", "js/turm.js",
    "js/upcrew-intro.js", "js/upcrew-farbwelten.js", "js/upcrew-aussehen.js", "js/freischaltung.js", "js/upcrew-blatt.js",
    "js/fortschritt-konto.js", "js/brett-design.js", "js/schach-varianten.js", "js/upcrew-katalog.js",
    "js/upcrew-besitz.js", "js/upcrew-platz.js", "js/upcrew-anpassen.js", "js/upcrew-muenzen.js", "js/upcrew-shop.js",
    "js/besitz.js", "js/shop.js", "js/upcrew-sammlung.js", "js/sammlung.js"];

/*
 * Eine Welt: Dokument, Gerätespeicher (mit Protokoll der Schreibvorgänge), die Anmeldung als Attrappe.
 *   speicher   Vorbelegung des Gerätespeichers ({ schluessel: text })
 *   gesperrt   der Gerätespeicher lässt nichts schreiben (privates Fenster)
 */
function welt(wahl) {
    const o = wahl || {};
    const dokument = dokumentBauen();
    const speicher = Object.assign({}, o.speicher || {});
    const protokoll = [];
    const meldungen = [];
    const fragen = [];
    const w = { antwort: true, ichId: null };
    const umgebung = {
        console, setTimeout, clearTimeout,
        document: dokument,
        localStorage: {
            getItem: (k) => (k in speicher ? speicher[k] : null),
            setItem(k, v) {
                if (o.gesperrt) {
                    throw new Error("Gerätespeicher gesperrt");
                }
                protokoll.push("setzen " + k);
                speicher[k] = String(v);
            },
            removeItem(k) {
                protokoll.push("loeschen " + k);
                delete speicher[k];
            }
        },
        location: { hostname: "up-birdo.github.io", search: "", pathname: "/Blunderluck/" },
        matchMedia: () => ({ matches: false, addEventListener() {} }),
        addEventListener() {}, removeEventListener() {},
        DIALOG: {
            frage: async (...angaben) => {
                fragen.push(angaben);
                return w.antwort;
            },
            kurzmeldung: (text) => meldungen.push(text),
            hinweis() {}
        },
        RANGLISTE: { abzeichenListe: () => [], abzeichenZeigen() {} },
        UPCREW_ABZEICHEN: { raster: () => dokument.createElement("div") },
        START: { _spielart: () => ({ id: "standard" }) }
    };
    umgebung.TEAM_SCHACH = {
        _infoInhaltBauen() {},
        _vorschauBrett: () => ({}),
        _vorschauBauen() {
            const gitter = dokument.createElement("div");
            gitter.className = "vorschau";
            return gitter;
        }
    };
    /* Die Anmeldung: wer am Gerät sitzt, und der Spieler-Abgleich (nimmt Änderungen an, schreibt nichts). */
    const geschrieben = [];
    umgebung.ANMELDUNG = {
        abgleich: {
            daten: { geaendertAm: 0, spieler: [] },
            aendern(neu) {
                this.daten = neu;
                geschrieben.push(JSON.parse(JSON.stringify(neu)));
            }
        },
        ich: () => (umgebung.ANMELDUNG.abgleich.daten.spieler || []).find((s) => s.id === w.ichId) || null
    };
    umgebung.window = umgebung;
    umgebung.globalThis = umgebung;
    vm.createContext(umgebung);
    for (const datei of DATEIEN) {
        vm.runInContext(lesen(datei), umgebung, { filename: datei });
    }
    const hol = (name) => vm.runInContext(name, umgebung);

    const ebenen = dokument.createElement("div");
    const haupt = dokument.createElement("main");
    dokument.body.appendChild(haupt);
    dokument.body.appendChild(ebenen);
    umgebung.UPCREW_BLATT.einrichten({ ebenen: ebenen, haupt: haupt });

    Object.assign(w, {
        umgebung, dokument, speicher, protokoll, meldungen, fragen, geschrieben, ebenen, haupt,
        B: hol("BESITZ"), FK: hol("FORTSCHRITT_KONTO"), F: hol("FORTSCHRITT"), S: hol("SPIELER"),
        FREI: hol("FREISCHALTUNG"), DESIGN: hol("BRETT_DESIGN"), SHOP: hol("SHOP"), SAMMLUNG: hol("SAMMLUNG"),
        UB: umgebung.UPCREW_BESITZ, K: umgebung.UPCREW_KATALOG, M: umgebung.UPCREW_MUENZEN,
        A: umgebung.UPCREW_AUSSEHEN,
        geraet: () => JSON.parse(speicher["upcrew.besitz"] || "{}"),
        saldo: () => umgebung.UPCREW_MUENZEN.saldo(w.FK.lesen()),
        ausgegeben: () => (((w.FK.lesen().spiele || {}).blunderluck || {}).zaehler || {}).muenzenAusgegeben || 0,
        /* Münzen verdienen — auf dem Weg des Spiels (Gerät, mit Konto auch dort). */
        muenzen(betrag) {
            w.FK.ablegen(umgebung.UPCREW_MUENZEN.verdienen(w.FK.lesen(), "blunderluck", betrag, Date.now()));
        },
        /* Ein Konto anmelden (legt den Eintrag an, falls er fehlt) bzw. abmelden. */
        anmelden(id, zusatz) {
            const daten = umgebung.ANMELDUNG.abgleich.daten;
            if (!daten.spieler.some((s) => s.id === id)) {
                const neu = w.S.normalisieren({ spieler: daten.spieler.concat([Object.assign(
                    { id: id, name: id, uid: "u-" + id }, zusatz || {})]) });
                umgebung.ANMELDUNG.abgleich.daten = neu;
            }
            w.ichId = id;
        },
        abmelden() {
            w.ichId = null;
        },
        eintrag: (id) => umgebung.ANMELDUNG.abgleich.daten.spieler.find((s) => s.id === id)
    });
    return w;
}

/* ------------------------------------------------------------------ *
 * Die App gegen die nachgebaute Firebase mit Regel §13 (C) — wie test-level-luecken.js
 * ------------------------------------------------------------------ */

const sicherheit = lesen("SICHERHEIT.md");

function textBlockNach(marke) {
    const start = sicherheit.indexOf(marke);
    if (start === -1) {
        throw new Error("Abschnitt fehlt: " + marke);
    }
    const a = sicherheit.indexOf("```text", start) + "```text".length + 1;
    const e = sicherheit.indexOf("```", a);
    return sicherheit.slice(a, e);
}

const REGEL_13 = JSON.parse(textBlockNach("## 15. Regel §13"));
const BASIS = "https://upcrew-7a29d-default-rtdb.europe-west1.firebasedatabase.app";
const PW_ANNA = "Anna#Pass1";

/* `vorbelegung` (seit v0.164.1): der Gerätespeicher eines früheren Laufs — dasselbe Gerät startet neu. */
function appLaden(fb, vorbelegung) {
    const gespeichert = Object.assign({}, vorbelegung || {});
    const umgebung = {
        console, URL, URLSearchParams, AbortController, TextEncoder, Uint8Array, Uint32Array,
        crypto: globalThis.crypto,
        setTimeout, clearTimeout,
        fetch: (a, e) => fb.fetch(a, e),
        document: { hidden: false, addEventListener() {} },
        window: {
            setTimeout, clearTimeout,
            setInterval() { return 0; },
            addEventListener() {},
            localStorage: {
                getItem(s) { return (s in gespeichert) ? gespeichert[s] : null; },
                setItem(s, wert) { gespeichert[s] = String(wert); },
                removeItem(s) { delete gespeichert[s]; }
            }
        },
        KONFIG: {
            APP_VERSION: "test",
            speicher: {
                modus: "gemeinsam", firebaseBasis: BASIS, pfad: "spieler",
                schachPfad: "blunderluck/team-schach", abfrageIntervallMs: 3000,
                schreibVerzoegerungMs: 60000, lokalerSchluessel: "blunderluck.spieler",
                lokalerSchluesselSchach: "blunderluck.team-schach"
            },
            konto: { apiKey: "test-schluessel", domain: "konten.upcrew.invalid", altBasis: "", altPfad: "spieler" }
        },
        DIALOG: {
            async passwort() { return null; },
            async eingabe() { return null; },
            async hinweis() {},
            async frage() { return false; },
            async liste() { return null; },
            kurzmeldung() {}
        },
        TABS: { wechseln() {} }
    };
    umgebung.localStorage = umgebung.window.localStorage;
    umgebung.globalThis = umgebung;
    vm.createContext(umgebung);

    const quelltext = ["konto.js", "fortschritt-kern.js", "fortschritt.js", "upcrew-abzeichen.js", "spieler.js",
        "versiegelung.js", "ich.js", "fuehlen.js", "speicher.js", "speicher-konten.js", "abgleich.js",
        "anmeldung.js", "anmeldung-konto.js", "fortschritt-konto.js", "upcrew-muenzen.js", "upcrew-katalog.js",
        "upcrew-besitz.js", "besitz.js"]
        .map((name) => fs.readFileSync(pfad.join(projekt, "js", name), "utf8"))
        .join("\n;\n")
        + "\nObject.assign(globalThis, { KONTO, FORTSCHRITT, FORTSCHRITT_KONTO, SPIELER, ICH, ANMELDUNG, BESITZ,"
        + " Abgleich, SpeicherGemeinsam, SpeicherKonten, speicherErzeugen });";
    vm.runInContext(quelltext, umgebung, { filename: "shop-besitz-umgebung.js" });

    const { KONTO, SPIELER, ANMELDUNG } = umgebung;
    KONTO.einrichten(umgebung.KONFIG);
    umgebung.SpeicherGemeinsam.tokenGeber = () => KONTO.token();
    const speicher = umgebung.speicherErzeugen(umgebung.KONFIG, "spieler",
        "blunderluck.spieler", (roh) => SPIELER.normalisieren(roh), () => KONTO.uid()).speicher;

    /* `beiDaten` wie in js\app.js: der Besitz wird dort vereinigt, wo der Fortschritt vom Konto ankommt. */
    const abgleich = new umgebung.Abgleich(speicher, umgebung.KONFIG.speicher, {
        beiDaten: () => { umgebung.BESITZ.abgleichen(); },
        beiStatus() {},
        leereDaten: () => SPIELER.leereDaten(),
        inhaltGleich: (a, b) => SPIELER.inhaltGleich(a, b),
        zusammenfuehren: (f, e, id) => SPIELER.zusammenfuehren(f, e, id),
        eigenerEintrag: {
            holen: () => ANMELDUNG.eigenenEintragHolen(),
            einsetzen: (daten, geholt) => ANMELDUNG.eigenenEintragEinsetzen(daten, geholt)
        }
    });
    ANMELDUNG.verbinden(abgleich);
    ANMELDUNG.aufbauen({ hidden: true, innerHTML: "" });
    return { umgebung, gespeichert, KONTO, SPIELER, ANMELDUNG, BESITZ: umgebung.BESITZ,
        FORTSCHRITT_KONTO: umgebung.FORTSCHRITT_KONTO, M: umgebung.UPCREW_MUENZEN, abgleich, speicher };
}

async function firebaseMitAnna() {
    const fb = firebaseMitRegel(BASIS, REGEL_13);
    fb.db = { spieler: { geaendertAm: 1 } };
    const w = appLaden(fb);
    w.abgleich.daten = await w.speicher.laden();
    const ergebnis = await w.KONTO.kontoAnlegen(w.speicher, w.abgleich.daten, "Anna", PW_ANNA);
    wahr(ergebnis.ok, "Anna angelegt: " + JSON.stringify(ergebnis));
    w.KONTO.abmelden();
    return { fb: fb, uid: ergebnis.eintrag.uid };
}

async function geraetVonAnna(fb) {
    const w = appLaden(fb);
    await w.abgleich.starten();
    const an = await w.ANMELDUNG._kontoAnmeldenVersuchen("Anna", PW_ANNA);
    wahr(an.ok, "Anna angemeldet: " + JSON.stringify(an));
    wahr(!!w.ANMELDUNG.ich(), "eigener Eintrag da");
    return w;
}

/* ------------------------------------------------------------------ *
 * Abgleich allein (D, Befund Nr. 1 und 2)
 * ------------------------------------------------------------------ */

function abgleichWelt(speicher) {
    const zeitgeber = [];
    const umgebung = {
        console: { warn() {}, error() {}, log() {} },
        document: { hidden: false, addEventListener() {} },
        window: {
            setTimeout(aufgabe, ms) {
                zeitgeber.push({ aufgabe: aufgabe, ms: ms, aus: false });
                return zeitgeber.length;
            },
            clearTimeout(nummer) {
                if (zeitgeber[nummer - 1]) {
                    zeitgeber[nummer - 1].aus = true;
                }
            },
            setInterval() { return 0; },
            addEventListener() {}
        }
    };
    vm.createContext(umgebung);
    vm.runInContext(lesen("js/abgleich.js") + "\nglobalThis.Abgleich = Abgleich;", umgebung, { filename: "abgleich.js" });
    const abgleich = new umgebung.Abgleich(speicher, { schreibVerzoegerungMs: 500, abfrageIntervallMs: 3000 }, {
        beiDaten() {}, beiStatus() {},
        leereDaten: () => ({ leer: true }),
        inhaltGleich: (a, b) => JSON.stringify(a) === JSON.stringify(b)
    });
    /* Der zuletzt geplante, noch gültige Zeitgeber. */
    const letzter = () => zeitgeber.filter((z) => !z.aus).slice(-1)[0];
    return { abgleich, zeitgeber, letzter, Abgleich: umgebung.Abgleich };
}

(async () => {

    /* ================================================================ *
     * A. Besitz
     * ================================================================ */

    await pruefe("Kauf als Gast: Münzen ab, Besitz an — nur auf dem Gerät, unter „gast“", () => {
        const w = welt();
        w.muenzen(300);
        gleich(w.saldo(), 300, "Ausgang: 300 Münzen");
        gleich(w.B.lesen(), {}, "Ausgang: kein Besitz");
        gleich(w.FREI.brettStueckFrei("design2d", "holz"), false, "Holz ist gesperrt (Ort 1)");
        const r = w.B.kaufen("brett2d", "holz");
        gleich([r.ok, r.grund, r.preis], [true, "", 250], "Kauf");
        gleich(r.neu, [{ art: "brett2d", wert: "holz" }], "neu im Besitz");
        gleich(w.saldo(), 50, "250 Münzen abgezogen");
        gleich(w.ausgegeben(), 250, "gebucht im Zähler muenzenAusgegeben des eigenen Zweigs (wie beim Vorrat)");
        gleich(w.geraet(), { gast: { brett2d: ["holz"] } }, "Gerät: unter der Person „gast“");
        gleich(w.geschrieben.length, 0, "nichts ans Konto (ein Gast hat keines)");
        gleich(w.B.hat("brett2d", "holz"), true, "hat");
        gleich([w.B.frei("design2d", "holz"), w.B.frei("brett2d", "holz"), w.B.frei("design2d", "marmor")],
            [true, true, false], "frei: mit dem Regal-Schlüssel des Spiels oder der Art des Katalogs");
        gleich(w.FREI.brettStueckFrei("design2d", "holz"), true, "die Freischaltung kennt den Kauf");
        gleich(w.DESIGN.waehlen("holz"), "holz", "und das Spiel nimmt das Stück an");
        gleich(w.speicher["upcrew.kaufOffen.blunderluck"], undefined, "der Merker ist wieder weg");
    });

    await pruefe("Zu wenig Münzen = kein Kauf; doppelter Kauf unmöglich; „bald“, erspielt und Start sind nicht kaufbar", () => {
        const w = welt();
        w.muenzen(100);
        const vorher = w.protokoll.length;
        const r = w.B.kaufen("brett2d", "holz");
        gleich([r.ok, r.grund, r.fehlt], [false, "zuWenig", 150], "100 reichen nicht für 250");
        gleich(w.protokoll.slice(vorher), [], "nichts geschrieben — kein Besitz, kein Merker, kein Fortschritt");
        gleich([w.saldo(), w.B.lesen()], [100, {}], "Münzen und Besitz unverändert");
        w.muenzen(500);
        gleich(w.B.kaufen("brett2d", "holz").ok, true, "mit 600 geht es");
        const zweiter = w.B.kaufen("brett2d", "holz");
        gleich([zweiter.ok, zweiter.grund], [false, "besitz"], "ein zweites Mal: schon im Besitz");
        gleich([w.saldo(), w.ausgegeben()], [350, 250], "nur einmal bezahlt");
        gleich(w.B.kaufen("figurstil", "glas").grund, "bald", "Glas wirkt noch nicht");
        gleich(w.B.kaufen("farbwelt", "gold").grund, "erspielt", "Gold wird erspielt");
        gleich(w.B.kaufen("brett2d", "grau").grund, "start", "Grau hat jeder");
        gleich(w.B.kaufen("brett2d", "gibtesnicht").grund, "unbekannt", "unbekannt");
        gleich([w.saldo(), w.geraet()], [350, { gast: { brett2d: ["holz"] } }], "danach alles wie vorher");
    });

    await pruefe("Reihenfolge: Merker, dann der Besitz, DANN der Fortschritt, dann Merker weg", () => {
        const w = welt();
        w.muenzen(300);
        const vorher = w.protokoll.length;
        w.B.kaufen("brett2d", "holz");
        gleich(w.protokoll.slice(vorher), ["setzen upcrew.kaufOffen.blunderluck", "setzen upcrew.besitz",
            "setzen upcrew.fortschritt", "loeschen upcrew.kaufOffen.blunderluck"], "Gerät");
        /* mit Konto: erst steht der Besitz am Eintrag, dann der gebuchte Zähler */
        const k = welt();
        k.anmelden("anna");
        k.muenzen(300);
        const stand = k.geschrieben.length;
        k.B.kaufen("brett2d", "holz");
        const schritte = k.geschrieben.slice(stand).map((daten) => {
            const e = daten.spieler.find((s) => s.id === "anna");
            const z = (((e.fortschritt || {}).spiele || {}).blunderluck || {}).zaehler || {};
            return [JSON.stringify(e.besitz || null), z.muenzenAusgegeben || 0];
        });
        gleich(schritte, [["{\"brett2d\":\"holz\"}", 0], ["{\"brett2d\":\"holz\"}", 250]],
            "Konto: erst der Besitz, dann der Fortschritt");
        gleich(k.geraet(), { anna: { brett2d: ["holz"] } }, "Gerät: unter der Spieler-Id — wie der Fortschritt");
        gleich(Object.keys(JSON.parse(k.speicher["upcrew.fortschritt"])), ["anna"], "derselbe Schlüssel wie beim Fortschritt");
        wahr(/FORTSCHRITT_KONTO\.person\(\)/.test(ohneKommentare(lesen("js/besitz.js")))
            && !/ANMELDUNG\.ich\(\)/.test(ohneKommentare(lesen("js/besitz.js"))),
            "js\\besitz.js nimmt die Person aus FORTSCHRITT_KONTO, baut sie nicht nach");
    });

    await pruefe("Ein Paket legt sich selbst und jedes kaufbare Teil in den Besitz — einmal bezahlt", () => {
        const w = welt();
        w.muenzen(1000);
        const paket = w.K.stueck("paket", "studio");
        const r = w.B.kaufen("paket", "studio");
        gleich([r.ok, r.preis], [true, paket.preis], "Preis aus dem Katalog");
        const erwartet = {};
        for (const s of [paket].concat(w.K.inhalt(paket).filter((t) => t.weg === "kauf"))) {
            erwartet[s.art] = [s.wert];
        }
        gleich(w.geraet().gast, w.UB.lesen(erwartet), "Paket + Teile");
        gleich(w.saldo(), 1000 - paket.preis, "einmal bezahlt");
        gleich(w.B.kaufen("farbwelt", "studio").grund, "besitz", "das Teil ist schon da");
        gleich(w.UB.alsText(w.B.lesen()).ok, true, "passt in die Form der Regel");
    });

    await pruefe("Gerät und Konto werden vereinigt — wer abweicht, bekommt es zurückgeschrieben; Unbekanntes bleibt", () => {
        const w = welt({ speicher: { "upcrew.besitz": JSON.stringify({ anna: { schrift: ["S2"] }, bert: { knoepfe: ["K3"] } }) } });
        w.anmelden("anna", { besitz: { brett2d: "holz", schrift: "S3", zukunft: "x1_x2" } });
        gleich(w.B.lesen(), { brett2d: ["holz"], schrift: ["S2", "S3"], zukunft: ["x1", "x2"] }, "gelesen: die Vereinigung");
        const r = w.B.abgleichen();
        gleich(r, { geraet: true, konto: true }, "beide Seiten wichen ab");
        gleich(w.geraet().anna, { brett2d: ["holz"], schrift: ["S2", "S3"], zukunft: ["x1", "x2"] }, "Gerät vereinigt");
        gleich(w.geraet().bert, { knoepfe: ["K3"] }, "ein fremder Eintrag bleibt beim Schreiben erhalten");
        gleich(w.eintrag("anna").besitz, { brett2d: "holz", schrift: "S2_S3", zukunft: "x1_x2" },
            "Konto vereinigt — auch die Art, die dieses Spiel nicht kennt");
        const stand = w.geschrieben.length;
        const vorher = w.protokoll.length;
        gleich(w.B.abgleichen(), { geraet: false, konto: false }, "zweiter Lauf: nichts mehr zu tun");
        gleich([w.geschrieben.length, w.protokoll.length], [stand, vorher], "nichts geschrieben");
        /* Unlesbares auf dem Gerät = leere Menge, nie ein Fehler */
        const kaputt = welt({ speicher: { "upcrew.besitz": "{kaputt" } });
        gleich(kaputt.B.lesen(), {}, "kaputter Text");
        const falsch = welt({ speicher: { "upcrew.besitz": JSON.stringify({ gast: "nichts", x: 5 }) } });
        gleich(falsch.B.lesen(), {}, "falsche Form");
        const flach = welt({ speicher: { "upcrew.besitz": JSON.stringify({ brett2d: ["holz"] }) } });
        gleich(flach.B.lesen(), {}, "eine flache Menge (gab es nie live) gehört niemandem");
    });

    await pruefe("Zwei Personen auf einem Gerät sehen je nur ihren Besitz; Abmelden zeigt den Gast-Besitz", () => {
        const w = welt();
        /* der Gast kauft Nacht */
        w.muenzen(300);
        gleich(w.B.kaufen("brett2d", "nacht").ok, true, "Gast kauft Nacht");
        /* Anna meldet sich an und kauft Holz */
        w.anmelden("anna");
        gleich(w.B.lesen(), {}, "Anna sieht den Gast-Besitz nicht (Anmelden an ein Konto übernimmt ihn nicht)");
        gleich(w.FREI.brettStueckFrei("design2d", "nacht"), false, "für Anna bleibt Nacht gesperrt");
        w.muenzen(300);
        gleich(w.B.kaufen("brett2d", "holz").ok, true, "Anna kauft Holz");
        /* Bert am selben Gerät */
        w.anmelden("bert");
        gleich(w.B.lesen(), {}, "Bert sieht weder Annas noch den Gast-Besitz");
        gleich([w.B.hat("brett2d", "holz"), w.FREI.brettStueckFrei("design2d", "holz")], [false, false], "Holz gehört Bert nicht");
        w.B.abgleichen();
        gleich(w.eintrag("bert").besitz, undefined, "Bert bekommt nichts geschenkt — auch nicht ans Konto");
        w.muenzen(300);
        gleich(w.B.kaufen("brett2d", "marmor").ok, true, "Bert kauft Marmor");
        gleich(w.geraet(), { gast: { brett2d: ["nacht"] }, anna: { brett2d: ["holz"] }, bert: { brett2d: ["marmor"] } },
            "drei Einträge nebeneinander");
        /* zurück zu Anna, dann abmelden */
        w.anmelden("anna");
        gleich(w.B.lesen(), { brett2d: ["holz"] }, "Anna: nur Holz");
        w.abmelden();
        gleich(w.B.lesen(), { brett2d: ["nacht"] }, "abgemeldet: der Gast-Besitz, nicht der des Kontos");
        gleich([w.FREI.brettStueckFrei("design2d", "nacht"), w.FREI.brettStueckFrei("design2d", "holz")], [true, false],
            "und die Freischaltung folgt");
        gleich(w.eintrag("anna").besitz, { brett2d: "holz" }, "Annas Konto behält seinen Besitz");
    });

    await pruefe("Gast → Konto: der Gast-Besitz zieht mit „Spielstand sichern“ um — wie der Fortschritt", () => {
        const w = welt();
        w.muenzen(600);
        w.B.kaufen("brett2d", "nacht");
        w.B.kaufen("figurstil", "matt");
        gleich(w.B.gastUebernehmen(), false, "als Gast: nichts zu tun");
        /* „Spielstand sichern“: aus dem Gast wird ein Konto; an genau dieser Stelle ruft das Spiel beide Umzüge */
        w.anmelden("neu");
        gleich(w.FK.gastUebernehmen(), true, "der Fortschritt zieht um");
        gleich(w.B.gastUebernehmen(), true, "der Besitz zieht um");
        gleich(w.geraet(), { neu: { brett2d: ["nacht"], figurstil: ["matt"] } }, "Gerät: der Gast-Eintrag ist weg");
        gleich(w.eintrag("neu").besitz, { brett2d: "nacht", figurstil: "matt" }, "am Konto");
        gleich(w.saldo(), 100, "die Münzen sind mitgekommen (einmal bezahlt)");
        gleich(w.B.gastUebernehmen(), false, "ein zweites Mal: nichts mehr da");
        const quelle = ohneKommentare(lesen("js/anmeldung-konto.js"));
        wahr(/FORTSCHRITT_KONTO\.gastUebernehmen\(\);\s*\}\s*if \(ergebnis\.ok && typeof BESITZ !== "undefined"\) \{\s*BESITZ\.gastUebernehmen\(\);/
            .test(quelle), "js\\anmeldung-konto.js: der Besitz direkt nach dem Fortschritt, an derselben Stelle");
        gleich(quelle.split("BESITZ.gastUebernehmen()").length - 1, 1, "und nur dort");
    });

    await pruefe("Merker „Kauf offen“: { wem, merker } — aufgelöst nur für die Person von jetzt", () => {
        const w = welt();
        w.muenzen(300);
        /* Der Kauf bricht zwischen Besitz und Fortschritt ab (App zu). */
        const echt = w.FK.ablegen;
        w.FK.ablegen = () => { throw new Error("App zu"); };
        let abgebrochen = false;
        try {
            w.B.kaufen("brett2d", "holz");
        } catch (fehler) {
            abgebrochen = true;
        }
        w.FK.ablegen = echt;
        wahr(abgebrochen, "der Kauf brach ab");
        gleich([w.B.hat("brett2d", "holz"), w.saldo()], [true, 300], "Stück im Besitz, Münzen noch nicht abgezogen");
        gleich(JSON.parse(w.speicher["upcrew.kaufOffen.blunderluck"]),
            { wem: "gast", merker: { app: "blunderluck", art: "brett2d", wert: "holz", preis: 250, vorher: 0 } }, "der Merker");
        /* jemand anders am Gerät: der Merker bleibt liegen, nichts wird gebucht */
        w.anmelden("anna");
        w.muenzen(500);
        gleich(w.B.offenAufloesen(), "fremd", "Anna: fremder Merker");
        gleich(w.B.abgleichen().konto, false, "auch der Abgleich rührt ihn nicht an");
        gleich(w.saldo(), 500, "Anna bezahlt nicht für den Gast");
        gleich(w.B.kaufen("brett2d", "marmor").ok, true, "Anna kann trotzdem kaufen");
        wahr(JSON.parse(w.speicher["upcrew.kaufOffen.blunderluck"]).wem === "gast", "der Merker des Gasts liegt noch da");
        /* der Gast ist wieder da: nachbuchen, Merker weg */
        w.abmelden();
        gleich(w.B.offenAufloesen(), "nachbuchen", "Gast: nachbuchen");
        gleich([w.saldo(), w.ausgegeben()], [50, 250], "der Preis von damals ist gebucht");
        gleich(w.speicher["upcrew.kaufOffen.blunderluck"], undefined, "Merker gelöscht");
        gleich(w.B.offenAufloesen(), "kein", "danach: keiner");
        /* gebucht / verworfen / unlesbar */
        const m = (wem, merker) => { w.speicher["upcrew.kaufOffen.blunderluck"] = JSON.stringify({ wem: wem, merker: merker }); };
        m("gast", { app: "blunderluck", art: "brett2d", wert: "holz", preis: 250, vorher: 0 });
        gleich([w.B.offenAufloesen(), w.saldo()], ["gebucht", 50], "schon gebucht: nicht noch einmal");
        m("gast", { app: "blunderluck", art: "brett2d", wert: "turnier", preis: 250, vorher: 250 });
        gleich([w.B.offenAufloesen(), w.saldo()], ["verworfen", 50], "Stück nicht im Besitz: verworfen");
        w.speicher["upcrew.kaufOffen.blunderluck"] = "{kaputt";
        gleich([w.B.offenAufloesen(), w.speicher["upcrew.kaufOffen.blunderluck"]], ["kein", undefined], "unlesbar: weg");
        /* Start und Abgleich lösen auf (dort, wo der Fortschritt abgeglichen wird) */
        m("gast", { app: "blunderluck", art: "brett2d", wert: "holz", preis: 250, vorher: 250 });
        w.B.abgleichen();
        gleich(w.speicher["upcrew.kaufOffen.blunderluck"], undefined, "abgleichen() löst den Merker der Person auf");
        gleich(w.ausgegeben(), 500, "nachgebucht (vorher 250 + 250)");
    });

    await pruefe("Gesperrter Gerätespeicher ohne Konto: kein Kauf, nichts bezahlt", () => {
        const w = welt({ gesperrt: true, speicher: { "upcrew.fortschritt": JSON.stringify({ gast: { version: 1, spiele: {
            blunderluck: { xp: 0, partien: 0, gezaehlt: [], stand: 1, zaehler: { muenzenVerdient: 300 } } } } }) } });
        gleich(w.saldo(), 300, "300 Münzen");
        const r = w.B.kaufen("brett2d", "holz");
        gleich([r.ok, r.grund], [false, "speicher"], "nirgends angekommen");
        gleich([w.saldo(), w.B.lesen()], [300, {}], "nichts bezahlt, nichts im Besitz");
    });

    await pruefe("SPIELER: `besitz` wandert durch, wird beim Zusammenführen VEREINIGT und beim Vergleich gesehen", () => {
        const w = welt();
        const S = w.S;
        const roh = { spieler: [{ id: "a", name: "A", besitz: { schrift: "S3", zukunft: "x" } }, { id: "b", name: "B", besitz: "müll" }] };
        const sauber = S.normalisieren(roh);
        gleich(sauber.spieler[0].besitz, { schrift: "S3", zukunft: "x" }, "Objekt bleibt, samt unbekannter Art");
        gleich("besitz" in sauber.spieler[1], false, "kein Objekt: fliegt raus");
        /* besitzSetzen: nur die Form der Regel */
        const gesetzt = S.besitzSetzen(sauber, "a", { schrift: "S3_S5", Gross: "x", brett2d: "holz marmor", leer: "", knoepfe: 7 }, 5);
        gleich(gesetzt.spieler[0].besitz, { schrift: "S3_S5" }, "nur gültige Arten und Texte");
        gleich(S.besitzSetzen(sauber, "a", {}, 5).spieler[0].besitz, { schrift: "S3", zukunft: "x" }, "leer: das Feld bleibt, wie es ist");
        gleich(S.inhaltGleich(sauber, gesetzt), false, "der Vergleich sieht den Unterschied");
        /* zusammenfuehren: eigener Eintrag mit holz, am Server inzwischen S3 (das andere Spiel) */
        const eigen = S.normalisieren({ spieler: [{ id: "a", name: "A", besitz: { brett2d: "holz" } }] });
        const fremd = S.normalisieren({ spieler: [{ id: "a", name: "A", besitz: { schrift: "S3", brett2d: "marmor" } }] });
        gleich(S.zusammenfuehren(fremd, eigen, "a").spieler[0].besitz, { brett2d: "holz_marmor", schrift: "S3" },
            "Käufe wachsen nur: Vereinigung statt „der eigene Eintrag gewinnt“");
        const ohne = S.normalisieren({ spieler: [{ id: "a", name: "A" }] });
        gleich(S.zusammenfuehren(fremd, ohne, "a").spieler[0].besitz, { brett2d: "marmor", schrift: "S3" }, "eigener ohne Besitz");
        gleich("besitz" in S.zusammenfuehren(ohne, ohne, "a").spieler[0], false, "nirgends Besitz: kein leeres Feld");
    });

    /* ================================================================ *
     * B. Shop und Sammlung am kleinen Dokument
     * ================================================================ */

    await pruefe("Shop: Reiter „Design“ mit den Arten des Spiels, Kauf über das Blatt samt Rückfrage, danach „Im Besitz“", async () => {
        const w = welt();
        w.muenzen(300);
        const bereich = w.dokument.createElement("section");
        w.haupt.appendChild(bereich);
        w.SHOP.aufbauen(bereich);
        const griff = w.SHOP.griff;
        gleich(griff.teil(), "design", "der Reiter Design steht zuerst");
        gleich(bereich.querySelectorAll(".up-shop-seg button").map((k) => k.textContent), ["Design", "Blunderluck"], "die zwei Reiter");
        const arten = bereich.querySelectorAll(".up-shop-kat").map((k) => k.dataset.kat);
        for (const art of ["farbwelt", "schrift", "knoepfe", "brett2d", "brett3d", "figurstil"]) {
            wahr(arten.indexOf(art) !== -1, "Einzelteile: " + art);
        }
        wahr(arten.indexOf("kachelset") === -1 && arten.indexOf("einband") === -1, "keine Art nur für Typoluck");
        wahr(bereich.querySelectorAll(".up-shop-paket").length > 0, "Design-Pakete");
        /* das Blatt des Stücks */
        gleich(griff.oeffnen("stueck:brett2d-holz"), true, "Blatt öffnet");
        const blatt = () => w.ebenen.querySelector("[data-up-shop=\"stueck:brett2d-holz\"]");
        const kaufen = () => blatt().querySelector(".up-shop-kaufen");
        gleich([kaufen().disabled, kaufen().textContent], [false, "Kaufen · 250"], "Kaufen an, Preis aus dem Katalog");
        gleich(blatt().querySelector(".up-shop-anprobieren").disabled, false, "Anprobieren an");
        wahr(blatt().querySelector(".brett-design-bild"), "bildVon: das kleine Brett-Bild des Spiels sitzt im Platz");
        /* Rückfrage: Nein */
        w.antwort = false;
        kaufen().click();
        await warten();
        gleich(w.fragen, [["Holz kaufen?", "250 Münzen", "Kaufen"]], "kurze Rückfrage wie beim Vorrat");
        gleich([w.B.lesen(), w.saldo()], [{}, 300], "Nein: nichts gekauft");
        /* Rückfrage: Ja */
        w.antwort = true;
        kaufen().click();
        await warten();
        gleich(w.B.lesen(), { brett2d: ["holz"] }, "gekauft");
        gleich(w.saldo(), 50, "bezahlt");
        gleich(w.meldungen.slice(-1), ["Holz gekauft"], "Kurzmeldung");
        gleich([kaufen().disabled, kaufen().textContent], [true, "Im Besitz"], "das Blatt ist neu gezeichnet");
        gleich(bereich.querySelector(".up-shop-kopf .up-shop-saldo").textContent.replace(/\s+/g, ""), "50", "Guthaben im Kopf");
        /* zu wenig für das nächste */
        griff.oeffnen("stueck:brett2d-marmor");
        const marmor = w.ebenen.querySelector("[data-up-shop=\"stueck:brett2d-marmor\"] .up-shop-kaufen");
        gleich([marmor.disabled, marmor.textContent], [true, "Es fehlen 200"], "ohne Guthaben gesperrt");
        griff.schliessen();
        /* der Vorrat arbeitet wie bisher */
        griff.teilSetzen("vorrat");
        gleich(w.SHOP.teil, "vorrat", "beiTeil merkt den Reiter");
        gleich(griff.liste.querySelectorAll(".up-shop-karte h3").map((h) => h.textContent), ["Zeit zurück", "Tipp"], "Vorrat: die zwei Waren");
    });

    await pruefe("Gekauft im Shop → in der Sammlung frei und übernehmbar; die Nachbarseite zeichnet nach dem Kauf neu", async () => {
        const w = welt();
        w.muenzen(300);
        const shop = w.dokument.createElement("section");
        const sammlung = w.dokument.createElement("section");
        w.haupt.appendChild(shop);
        w.haupt.appendChild(sammlung);
        w.SHOP.aufbauen(shop);
        w.SAMMLUNG.aufbauen(sammlung);
        w.SAMMLUNG.vorzeichnen();
        const stueck = (wert) => w.ebenen.querySelector(".upa-stueck[data-wert=\"" + wert + "\"]");
        const zahl = () => w.SAMMLUNG.ortEl.querySelector(".upa-kat[data-kat=\"design2d\"] small").textContent.replace(/\s+/g, "");
        wahr(/^1\/6/.test(zahl()), "vorher 1/6: " + zahl());
        w.SHOP.griff.oeffnen("stueck:brett2d-holz");
        w.ebenen.querySelector(".up-shop-kaufen").click();
        await warten();
        wahr(/^2\/6/.test(zahl()), "die Sammlung nebenan zählt den Kauf schon mit: " + zahl());
        w.SHOP.griff.schliessen();
        w.SAMMLUNG.beimOeffnen();
        w.SAMMLUNG.tab.blattOeffnen("design2d");
        wahr(!stueck("holz").classList.contains("zu"), "Holz ist frei");
        wahr(stueck("marmor").classList.contains("zu"), "Marmor nicht");
        stueck("holz").click();
        const knopf = w.ebenen.querySelector(".upa-b-aktion .upa-uebernehmen");
        gleich(knopf.disabled, false, "Übernehmen an");
        knopf.click();
        gleich(w.DESIGN.wahl(), "holz", "übernommen");
    });

    /* v0.166.3 (UPCrew Runde 9, Teil B): „Im Shop ansehen". Das ECHTE js\tabs.js mit Band-Element in derselben
       Welt; die Shop-Seite ist noch nicht gebaut (Nachbarseiten entstehen sonst im Leerlauf). */
    function weltMitTabs() {
        const w = welt();
        vm.runInContext(lesen("js/tabs.js"), w.umgebung, { filename: "js/tabs.js" });
        const T = vm.runInContext("TABS", w.umgebung);
        T.registrieren(w.SHOP);
        T.registrieren(w.SAMMLUNG);
        const leiste = w.dokument.createElement("nav");
        const inhalt = w.dokument.createElement("div");
        const band = w.dokument.createElement("div");
        w.haupt.appendChild(leiste);
        w.haupt.appendChild(inhalt);
        w.haupt.appendChild(band);
        const gerufen = [];
        const echt = w.SAMMLUNG.zumShop;
        w.SAMMLUNG.zumShop = (stueck) => {
            gerufen.push(JSON.parse(JSON.stringify(stueck)));
            return echt(stueck);
        };
        T.starten(leiste, inhalt, "sammlung", band);
        return Object.assign(w, { T, leiste, gerufen,
            stueck: (wert) => w.ebenen.querySelector(".upa-stueck[data-wert=\"" + wert + "\"]"),
            zumShopKnopf: () => w.ebenen.querySelector(".upa-zumshop"),
            uebernehmenKnopf: () => w.ebenen.querySelector(".upa-b-aktion .upa-uebernehmen") });
    }

    await pruefe("Im Shop ansehen: Sammlung → Blatt → Knopf ruft das Spiel mit dem Katalog-Schlüssel → Shop-Tab, Reiter Design, Stück-Blatt → Kaufen → zurück: übernehmbar", async () => {
        const w = weltMitTabs();
        w.muenzen(300);
        w.SHOP.teil = "vorrat";                       /* zuletzt war der Vorrat vorn */
        gleich([w.T.aktiveId, !!w.T.aufgebaut.shop, w.SHOP.griff], ["sammlung", false, null], "Shop-Seite noch nicht gebaut");
        w.SAMMLUNG.tab.blattOeffnen("design2d");
        w.stueck("farbwelt").click();
        const knopf = w.zumShopKnopf();
        wahr(knopf && !knopf.hidden, "„Im Shop ansehen“ steht da");
        gleich(knopf.textContent.trim(), "Im Shop ansehen", "Aufschrift");
        wahr(w.uebernehmenKnopf().hidden, "statt des grauen „Nicht im Besitz“");
        knopf.click();
        gleich(w.gerufen, [{ art: "brett2d", wert: "farbwelt" }], "Katalog-Schlüssel brett2d (nicht das Regal design2d)");
        gleich([w.T.aktiveId, w.T.offeneSeite, !!w.T.aufgebaut.shop], ["shop", "shop", true], "Shop-Tab offen und gebaut");
        gleich(w.leiste.querySelector("[aria-current=\"page\"]").dataset.tabId, "shop", "die Leiste steht auf dem Shop");
        gleich(w.SHOP.griff.teil(), "design", "Reiter Design");
        const blatt = w.ebenen.querySelector("[data-up-shop=\"stueck:brett2d-farbwelt\"]");
        wahr(blatt, "das Stück-Blatt ist offen");
        wahr(!w.ebenen.querySelector(".upa-zumshop"), "das Blatt der Sammlung ist zu");
        const kaufen = blatt.querySelector(".up-shop-kaufen");
        gleich(kaufen.textContent, "Kaufen · 250", "Preis aus dem Katalog");
        kaufen.click();
        await warten();
        gleich(w.B.lesen(), { brett2d: ["farbwelt"] }, "gekauft");
        w.SHOP.griff.schliessen();
        w.T.wechseln("sammlung");
        w.SAMMLUNG.tab.blattOeffnen("design2d");
        w.stueck("farbwelt").click();
        wahr(w.zumShopKnopf().hidden, "im Besitz: kein „Im Shop ansehen“ mehr");
        const uebernehmen = w.uebernehmenKnopf();
        gleich([uebernehmen.hidden, uebernehmen.disabled], [false, false], "Übernehmen an");
        uebernehmen.click();
        gleich(w.DESIGN.wahl(), "farbwelt", "übernommen");
    });

    await pruefe("Im Shop ansehen: kein Knopf ohne Kauf-Weg (frei, Ort im Turm); klappt das Öffnen nicht, bleibt es still beim Tab-Wechsel", async () => {
        const w = weltMitTabs();
        w.SAMMLUNG.tab.blattOeffnen("design2d");
        w.stueck("grau").click();
        wahr(w.zumShopKnopf().hidden, "freies Stück: kein Knopf");
        w.stueck("holz").click();
        wahr(w.zumShopKnopf().hidden, "Holz trägt den Ort im Turm (eigenes `ab`): kein Knopf, wie der Baustein es will");
        gleich(w.uebernehmenKnopf().hidden, false, "dort bleibt „Nicht im Besitz“");
        w.SAMMLUNG.tab.blattOeffnen("thema");
        w.stueck("holz").click();
        wahr(!w.zumShopKnopf() || w.zumShopKnopf().hidden, "Brett-Thema 3D mit Ort im Turm: kein Knopf");
        /* unbekanntes Stück: Tab gewechselt, kein Blatt, kein Fehler */
        w.T.wechseln("sammlung");
        gleich(w.SAMMLUNG.zumShop({ art: "brett2d", wert: "gibtsnicht" }), false, "unbekannt: false");
        gleich(w.T.aktiveId, "shop", "es bleibt beim Tab-Wechsel");
        gleich(w.ebenen.querySelectorAll("[data-up-shop]").length, 0, "kein Blatt");
        /* Tab-Wechsel wirft: kein Fehler nach aussen */
        const echt = w.T.wechseln;
        w.T.wechseln = () => {
            throw new Error("kaputt");
        };
        gleich(w.SAMMLUNG.zumShop({ art: "brett2d", wert: "holz" }), false, "Tab-Wechsel wirft: false, nichts geworfen");
        /* Tab-Wechsel greift nicht (z. B. gesperrt): nichts öffnet sich über der Sammlung */
        w.T.wechseln = () => {};
        w.T.aktiveId = "sammlung";
        gleich(w.SAMMLUNG.zumShop({ art: "brett2d", wert: "holz" }), false, "nicht gewechselt: false");
        gleich(w.ebenen.querySelectorAll("[data-up-shop]").length, 0, "kein Shop-Blatt über der Sammlung");
        w.T.wechseln = echt;
        /* ohne Shop-Baustein (kein griff) */
        const ohne = weltMitTabs();
        ohne.SHOP.griff = null;
        ohne.T.aufgebaut.shop = true;
        gleich(ohne.SAMMLUNG.zumShop({ art: "brett2d", wert: "holz" }), false, "ohne Shop-Griff: false");
        gleich(ohne.T.aktiveId, "shop", "nur der Tab-Wechsel");
        /* ohne TABS (Welt ohne Tabs, wie die übrigen Tests) */
        gleich(welt().SAMMLUNG.zumShop({ art: "brett2d", wert: "holz" }), false, "ohne TABS: false");
        wahr(/zumShop:\s*\(typeof SHOP !== "undefined"\)/.test(lesen("js/sammlung.js")), "die Sammlung übergibt `zumShop`");
    });

    await pruefe("Shop.frei:was das Spiel auf anderem Weg frei rechnet (Level), zeigt der Shop als „im Besitz“ — ohne den Besitz", () => {
        const stand = (xp) => ({ "upcrew.fortschritt": JSON.stringify({ gast: { version: 1, spiele: {
            blunderluck: { xp: xp, partien: 0, gezaehlt: [], stand: 1 } } } }) });
        const w = welt({ speicher: stand(0) });
        gleich([w.SHOP.frei("brett2d", "farbwelt"), w.SHOP.frei("schrift", "S4"), w.SHOP.frei("brett3d", "holz")],
            [false, false, false], "Level 1, Ort 1: nichts davon");
        gleich(w.SHOP.frei("figurstil", "glas"), false, "ein Stück, das das Spiel nicht kennt, ist nie „frei“");
        gleich(w.SHOP.frei("material", "holz"), false, "eine Art, die das Spiel nicht anlegt");
        const zwei = welt({ speicher: stand(100) });
        gleich(zwei.FK.level().level, 2, "100 XP = Level 2");
        gleich([zwei.SHOP.frei("brett2d", "farbwelt"), zwei.SHOP.frei("brett2d", "holz")], [true, false], "Level 2: Brett-Design „Farbwelt“");
        gleich(zwei.SHOP.frei("schrift", "S4"), zwei.umgebung.UPCREW_ANPASSEN.frei("schrift", "S4", 2, null), "Schrift: wie UPCREW_ANPASSEN.STUFEN");
        /* der Besitz selbst steckt NICHT in frei() — den kennt der Baustein über `besitz` */
        zwei.muenzen(300);
        zwei.B.kaufen("brett2d", "holz");
        gleich(zwei.SHOP.frei("brett2d", "holz"), false, "gekauft ≠ erspielt");
        gleich(zwei.FREI.erspielt("design2d", "holz"), false, "FREISCHALTUNG.erspielt: der heutige Weg, unverändert");
    });

    await pruefe("Anprobe: zeigt probeweise, speichert nichts, „Anprobe beenden“ und der Tab-Wechsel beenden sie", () => {
        const w = welt();
        const angewendet = [];
        w.umgebung.DARSTELLUNG = { anwenden: () => angewendet.push("echt"), modus: () => "dunkel", _ergaenzen() {} };
        const html = w.dokument.documentElement;
        const vorher = w.protokoll.length;
        const aussehen = JSON.stringify(w.A.lesen());
        /* ein Stück des Spiels: die echte Start-Vorschau klein in der Leiste */
        gleich(w.SHOP.anprobieren([w.K.stueck("brett2d", "holz")]), true, "Anprobe läuft");
        const leiste = () => w.dokument.body.querySelector(".shop-anprobe");
        wahr(leiste(), "die Leiste steht");
        gleich([leiste().querySelector(".shop-anprobe-text small").textContent, leiste().querySelector(".shop-anprobe-text b").textContent],
            ["Anprobe · Brett-Design · 2D", "Holz"], "zwei kurze Zeilen: Art und Name");
        gleich(leiste().querySelector(".shop-anprobe-ende").textContent, "Anprobe beenden", "sichtbarer Knopf");
        gleich(leiste().querySelector(".shop-anprobe-brett .vorschau").style.getPropertyValue("--feld-hell"), "#ebd0a4",
            "das Brett trägt das Design der Anprobe");
        gleich(w.DESIGN.wahl(), "grau", "das Spiel selbst bleibt bei Grau");
        /* ein Paket: Schrift und Knöpfe legen sich über die App */
        const paket = w.K.inhalt(w.K.stueck("paket", "studio")).filter((t) => t.wirkt);
        w.SHOP.anprobieren(paket);
        gleich(w.dokument.body.querySelectorAll(".shop-anprobe").length, 1, "eine Leiste, nicht zwei");
        gleich([leiste().querySelector(".shop-anprobe-text small").textContent, leiste().querySelector(".shop-anprobe-text b").textContent],
            ["Anprobe · Design-Paket", "Studio"], "Paket");
        wahr(html.style.getPropertyValue("--schrift-familie").indexOf("Crew S4") !== -1, "Schrift der Anprobe");
        gleich(html.dataset.knoepfe, "K5", "Knöpfe der Anprobe");
        wahr(!leiste().querySelector(".shop-anprobe-brett"), "ohne Brett-Stück keine Vorschau");
        gleich(JSON.stringify(w.A.lesen()), aussehen, "das gespeicherte Aussehen ist unverändert");
        gleich(w.protokoll.slice(vorher), [], "NICHTS gespeichert");
        /* beenden über den Knopf */
        const zuvor = angewendet.length;
        leiste().querySelector(".shop-anprobe-ende").click();
        wahr(!leiste() && w.SHOP.anprobe === null, "Leiste weg");
        wahr(angewendet.length > zuvor, "das echte Aussehen wird wieder angewendet");
        /* beenden über den Tab-Wechsel */
        w.SHOP.anprobieren([w.K.stueck("brett2d", "holz")]);
        wahr(leiste(), "läuft wieder");
        w.SHOP.beimVerlassen();
        wahr(!leiste(), "beimVerlassen beendet die Anprobe");
        w.SHOP.beimVerlassen();
        wahr(/vorher\.beimVerlassen\(\);/.test(lesen("js/tabs.js")), "TABS ruft beimVerlassen beim Wechsel");
        /* was das Spiel nicht zeigen kann, läuft nicht an */
        gleich(w.SHOP.anprobieren([{ art: "material", wert: "holz", name: "Holz" }]), false, "Material: keine Anprobe");
        gleich(w.SHOP.anprobieren([]), false, "leer");
    });

    await pruefe("Einbindung: neue Optionen im Aufruf, Preise nur im Katalog, kein `shop: false` mehr", () => {
        const shop = ohneKommentare(lesen("js/shop.js"));
        const aufruf = shop.slice(shop.indexOf("UPCREW_SHOP.bauen("), shop.indexOf("});", shop.indexOf("UPCREW_SHOP.bauen(")));
        for (const option of ["spiel: \"blunderluck\"", "besitz:", "frei:", "kaufenStueck:", "anprobieren:", "bildVon:", "teil:", "beiTeil:",
            "lesen:", "kaufen:", "texte:", "bilder:"]) {
            wahr(aufruf.indexOf(option) !== -1, "Option " + option);
        }
        wahr(/s\.art === "brett2d"[\s\S]*BRETT_DESIGN\.miniBild\(s\.wert\)/.test(aufruf), "bildVon: brett2d → BRETT_DESIGN.miniBild");
        wahr(aufruf.indexOf("heute:") === -1, "kein eigenes Datum (Blunderluck lässt `heute` weg)");
        for (const datei of ["js/shop.js", "js/besitz.js", "js/sammlung.js", "js/freischaltung.js", "js/brett-design.js"]) {
            const text = ohneKommentare(lesen(datei));
            wahr(!/\b(900|400|250|200|150|120)\b/.test(text), datei + " nennt keinen Preis — alles kommt aus dem Katalog");
        }
        wahr(!/shop\s*:\s*false/.test(ohneKommentare(lesen("js/sammlung.js"))), "Sammlung ohne `shop: false`");
        const app = ohneKommentare(lesen("js/app.js"));
        wahr(/AUSSEHEN_KONTO\.vomKonto\(\);\s*\}\s*if \(typeof BESITZ !== "undefined"\) \{\s*BESITZ\.abgleichen\(\);/.test(app),
            "js\\app.js: der Besitz wird in `beiDaten` vereinigt (Start, Anmeldung, Vordergrund)");
        const besitz = ohneKommentare(lesen("js/besitz.js"));
        const kauf = besitz.slice(besitz.indexOf("kaufen(art, wert, datum) {"));
        wahr(kauf.indexOf("_offenSchreiben(person, merker)") !== -1
            && kauf.indexOf("_offenSchreiben(person, merker)") < kauf.indexOf("_geraetSchreiben(r.besitz")
            && kauf.indexOf("_geraetSchreiben(r.besitz") < kauf.indexOf("_kontoSchreiben(r.besitz")
            && kauf.indexOf("_kontoSchreiben(r.besitz") < kauf.indexOf("FORTSCHRITT_KONTO.ablegen(r.stand)"),
            "js\\besitz.js `kaufen`: Merker, Besitz (Gerät, dann Konto), DANN der Fortschritt");
        wahr(/SCHLUESSEL: "upcrew\.besitz"/.test(besitz) && /OFFEN_SCHLUESSEL: "upcrew\.kaufOffen\.blunderluck"/.test(besitz), "die zwei Schlüssel");
        /* Stil: die Anprobe-Leiste rollt nicht, kein eigener Stil am Baustein */
        const stil = lesen("css/stil.css");
        wahr(/\.shop-anprobe \{[^}]*position: fixed;/.test(stil), "Anprobe-Leiste steht fest");
        for (const name of ["css/stil.css", "css/stil-start.css", "css/stil-blatt.css", "css/stil-effekte.css"]) {
            const css = ohneKommentare(lesen(name));
            /* erlaubt ist nur das EIGENE Bild im Platz (`… .up-platz > .brett-design-bild`), kein Stil am Baustein */
            const regeln = css.match(/[^{}]*\.up-shop[^{}]*\{/g) || [];
            wahr(regeln.every((r) => r.split(",").every((teil) => /\.up-platz > \.brett-design-bild\s*\{?\s*$/.test(teil.trim()))),
                name + " setzt Stil am Shop-Baustein: " + regeln.join(" | "));
        }
        wahr(/\.up-shop \.up-platz > \.brett-design-bild,\s*\.up-shop-blatt \.up-platz > \.brett-design-bild \{[^}]*aspect-ratio: 1;/
            .test(lesen("css/stil-effekte.css")), "das Brett-Bild füllt seinen Platz im Shop quadratisch");
        const baustein = ohneKommentare(lesen("css/upcrew-shop.css"));
        wahr(!/overflow-x\s*:\s*(auto|scroll)/.test(baustein) && !/scroll-snap/.test(baustein), "der Shop-Baustein lässt nichts waagrecht rollen");
    });

    /* ================================================================ *
     * C. Gegen die Regel §13
     * ================================================================ */

    await pruefe("Regel §13: die geschriebene Form wird angenommen, der gebuchte Zähler geht durch", async () => {
        const { fb, uid } = await firebaseMitAnna();
        const w = await geraetVonAnna(fb);
        w.FORTSCHRITT_KONTO.ablegen(w.M.verdienen(w.FORTSCHRITT_KONTO.lesen(), "blunderluck", 2000, Date.now()));
        await w.abgleich.sofortSchreiben();
        gleich(w.abgleich.aenderungOffen, false, "Münzen am Konto");
        gleich(w.BESITZ.kaufen("brett2d", "holz").ok, true, "Holz");
        gleich(w.BESITZ.kaufen("paket", "studio").ok, true, "Paket Studio");
        gleich(w.BESITZ.kaufen("figurstil", "matt").ok, true, "Matt");
        await w.abgleich.sofortSchreiben();
        gleich([w.abgleich.aenderungOffen, w.abgleich.schreibFehlschlaege], [false, 0], "die Regel hat den Eintrag angenommen");
        const konto = fb.db.spieler.konten[uid];
        const erwartet = w.umgebung.UPCREW_BESITZ.alsText(w.BESITZ.lesen()).feld;
        gleich(konto.besitz, erwartet, "am Konto steht genau `UPCREW_BESITZ.alsText(besitz).feld`");
        gleich(konto.besitz.brett2d, "holz", "Brett-Design");
        /* genau die Form der Regel: Art, Zeichen, Länge */
        for (const art of Object.keys(konto.besitz)) {
            wahr(/^[a-z][a-z0-9]{1,23}$/.test(art), "Art " + art);
            wahr(typeof konto.besitz[art] === "string" && konto.besitz[art].length <= 2000
                && /^[A-Za-z0-9_-]*$/.test(konto.besitz[art]), "Text " + art + " = " + konto.besitz[art]);
        }
        const bezahlt = 250 + 900 + 250;
        gleich(konto.fortschritt.spiele.blunderluck.zaehler.muenzenAusgegeben, bezahlt, "der Zähler steht am Konto um die Preise höher");
        gleich(w.M.saldo(w.FORTSCHRITT_KONTO.lesen()), 2000 - bezahlt, "Guthaben");
        /* Gegenprobe am Regeltext selbst */
        const auth = { uid: uid, provider: "password" };
        const versuch = (art, wert, wer) => fb.nachbau.schreibenPruefen(fb.db,
            [{ weg: ["spieler", "konten", uid, "besitz", art], wert: wert }], wer || auth).ok;
        gleich(versuch("brett2d", "holz_marmor"), true, "die Form des Spiels");
        gleich(versuch("brett2d", "holz marmor"), false, "ein Leerzeichen lehnt die Regel ab");
        gleich(versuch("Brett2d", "holz"), false, "eine Art mit Grossbuchstaben auch");
        gleich(versuch("brett2d", ["holz"]), false, "eine Liste statt Text auch");
        gleich(versuch("brett2d", "x".repeat(2001)), false, "über 2000 Zeichen auch");
        gleich(versuch("brett2d", "holz_marmor", { uid: "fremd", provider: "password" }), false, "und niemand ausser dem Besitzer");
    });

    await pruefe("Regel §13: ein Kauf aus dem anderen Spiel geht beim nächsten Schreiben nicht verloren und kommt aufs Gerät", async () => {
        const { fb, uid } = await firebaseMitAnna();
        const w = await geraetVonAnna(fb);
        w.FORTSCHRITT_KONTO.ablegen(w.M.verdienen(w.FORTSCHRITT_KONTO.lesen(), "blunderluck", 1000, Date.now()));
        w.BESITZ.kaufen("brett2d", "holz");
        await w.abgleich.sofortSchreiben();
        gleich(fb.db.spieler.konten[uid].besitz, { brett2d: "holz" }, "Ausgang am Konto");
        /* „Typoluck“ schreibt NUR sein Feld — ohne die Marke zu heben; dieses Gerät weiss nichts davon */
        fb.db.spieler.konten[uid].besitz.schrift = "S3";
        gleich(w.BESITZ.hat("schrift", "S3"), false, "hier noch unbekannt");
        w.BESITZ.kaufen("brett2d", "marmor");
        await w.abgleich.sofortSchreiben();
        gleich(w.abgleich.aenderungOffen, false, "geschrieben");
        gleich(fb.db.spieler.konten[uid].besitz, { brett2d: "holz_marmor", schrift: "S3" },
            "der ganze Eintrag wurde geschrieben — und der fremde Kauf ist noch da");
        gleich(w.BESITZ.hat("schrift", "S3"), true, "und jetzt auch hier bekannt");
        const geraet = JSON.parse(w.gespeichert["upcrew.besitz"]);
        gleich(geraet[w.FORTSCHRITT_KONTO.person()], { brett2d: ["holz", "marmor"], schrift: ["S3"] }, "auf dem Gerät vereinigt");
        /* zurück im Vordergrund: ein weiterer fremder Kauf kommt mit dem eigenen Eintrag */
        fb.db.spieler.konten[uid].besitz.knoepfe = "K3";
        await w.abgleich.rueckkehr();
        gleich(w.BESITZ.hat("knoepfe", "K3"), true, "Rückkehr: der Kauf vom anderen Gerät ist da");
        gleich(w.abgleich.aenderungOffen, false, "und nichts muss zurückgeschrieben werden");
    });

    /* ================================================================ *
     * D. Befund Tabelle 1
     * ================================================================ */

    await pruefe("Befund 1: nach einem Fehlschlag verdoppelt sich die Wartezeit bis höchstens 30 s; Erfolg setzt zurück", async () => {
        let geht = false;
        let versuche = 0;
        const w = abgleichWelt({ art: "lokal", beschreibung: "Test", async laden() { return {}; },
            async speichern() {
                versuche++;
                if (!geht) {
                    throw new Error("kein Netz");
                }
            } });
        w.abgleich.aendern({ a: 1 }, false);
        gleich(w.letzter().ms, 500, "eine Änderung wartet wie bisher 500 ms");
        const zeiten = [];
        for (let i = 0; i < 9; i++) {
            await w.letzter().aufgabe();
            zeiten.push(w.letzter().ms);
        }
        gleich(zeiten, [500, 1000, 2000, 4000, 8000, 16000, 30000, 30000, 30000], "500 ms, dann je Fehlschlag das Doppelte, höchstens 30 s");
        gleich(w.Abgleich.WIEDERHOLUNG_MAX_MS, 30000, "die Obergrenze");
        gleich(w.abgleich.aenderungOffen, true, "die Änderung bleibt offen — nichts geht verloren");
        /* der Abgang der Seite schreibt weiter sofort */
        const vorher = versuche;
        await w.abgleich.sofortSchreiben();
        gleich(versuche, vorher + 1, "sofortSchreiben wartet nicht");
        /* eine neue Änderung versucht es wieder nach 500 ms */
        w.abgleich.aendern({ a: 2 }, false);
        gleich(w.letzter().ms, 500, "neue Änderung: 500 ms");
        /* Erfolg setzt zurück */
        geht = true;
        await w.letzter().aufgabe();
        gleich([w.abgleich.aenderungOffen, w.abgleich.schreibFehlschlaege], [false, 0], "geschrieben, Zähler zurück");
        geht = false;
        w.abgleich.aendern({ a: 3 }, false);
        await w.letzter().aufgabe();
        gleich(w.letzter().ms, 500, "nach dem Erfolg beginnt die Wartezeit wieder bei 500 ms");
    });

    await pruefe("Befund 2: der Start merkt die Marke — VOR dem Laden geholt, nach dem Erfolg gesetzt; der erste Takt lädt nicht doppelt", async () => {
        const folge = [];
        let marke = 7;
        let geht = true;
        const speicher = { art: "gemeinsam", beschreibung: "Test",
            async marke() { folge.push("marke"); return marke; },
            async laden() {
                folge.push("laden");
                if (!geht) {
                    throw new Error("kein Netz");
                }
                return { n: marke };
            },
            async speichern() {} };
        const w = abgleichWelt(speicher);
        gleich(await w.abgleich.starten(), true, "geladen");
        gleich(folge, ["marke", "laden"], "erst die Marke, dann der Stand");
        gleich([w.abgleich.markeGesehen, w.abgleich.markeGanzGesehen], [7, 7], "beide Marken gemerkt");
        await w.abgleich.fremdenStandHolen();
        gleich(folge, ["marke", "laden", "marke"], "erster Takt: nur die Marke gefragt, nichts doppelt geladen");
        marke = 8;
        gleich(await w.abgleich.fremdenStandHolen(), true, "steigt die Marke, wird geholt");
        gleich(w.abgleich.daten, { n: 8 }, "neuer Stand");
        /* schlägt das Laden beim Start fehl, gilt keine Marke als gesehen */
        geht = false;
        const f = abgleichWelt(speicher);
        gleich(await f.abgleich.starten(), false, "Start ohne Netz");
        gleich([f.abgleich.markeGesehen, f.abgleich.markeGanzGesehen], [null, null], "nichts gemerkt");
        /* ohne Marke (lokaler Speicher) wie bisher */
        const l = abgleichWelt({ art: "lokal", beschreibung: "Test", async laden() { return {}; }, async speichern() {} });
        gleich(await l.abgleich.starten(), true, "lokal");
        gleich(l.abgleich.markeGesehen, null, "keine Marke");
        /* eine Marke, die wirft, hält den Start nicht auf */
        const k = abgleichWelt({ art: "gemeinsam", beschreibung: "Test", async marke() { throw new Error("x"); },
            async laden() { return { ok: 1 }; }, async speichern() {} });
        gleich(await k.abgleich.starten(), true, "Marke wirft: trotzdem geladen");
        gleich(k.abgleich.markeGesehen, null, "dann eben ohne");
    });

    await pruefe("Befund 4: die Rangliste baut bei neuen Daten nur, wenn sie zu sehen ist — und holt es nach", () => {
        const umgebung = { console, TABS: { bandEl: {}, offeneSeite: "start" } };
        vm.createContext(umgebung);
        vm.runInContext(lesen("js/rangliste.js") + "\nglobalThis.RANGLISTE = RANGLISTE;", umgebung, { filename: "rangliste.js" });
        const R = umgebung.RANGLISTE;
        let gebaut = 0;
        R.zeichnen = () => { gebaut++; R._veraltet = false; };
        gleich([R.datenGeaendert(), gebaut, R._veraltet], [false, 0, true], "andere Seite offen: nur gemerkt");
        R.datenGeaendert();
        gleich(gebaut, 0, "auch beim zweiten Mal nicht");
        R.nachholen();
        gleich([gebaut, R._veraltet], [1, false], "kommt die Seite in Sicht: einmal nachgeholt");
        R.nachholen();
        gleich(gebaut, 1, "nicht doppelt");
        umgebung.TABS.offeneSeite = null;
        gleich(R.datenGeaendert(), false, "in der Partie (Band verborgen): nicht gebaut");
        umgebung.TABS.offeneSeite = "rangliste";
        gleich([R.datenGeaendert(), gebaut], [true, 2], "die Rangliste ist offen: sofort gebaut");
        umgebung.TABS.bandEl = null;
        umgebung.TABS.offeneSeite = "start";
        gleich([R.datenGeaendert(), gebaut], [true, 3], "ohne Band wie bisher");
        const quelle = ohneKommentare(lesen("js/rangliste.js"));
        wahr(/RANGLISTE\._veraltet = false;\s*wurzel\.innerHTML = "";/.test(quelle), "das echte zeichnen() räumt die Marke ab");
        wahr(/beimOeffnen\(\) \{\s*RANGLISTE\.zeichnen\(\);/.test(quelle), "beimOeffnen zeichnet immer");
        const app = ohneKommentare(lesen("js/app.js"));
        gleich(app.split("RANGLISTE.datenGeaendert()").length - 1, 2, "js\\app.js: beide Stände melden nur noch neue Daten");
        wahr(app.indexOf("RANGLISTE.zeichnen()") === -1, "und bauen nicht mehr selbst");
        wahr(/typeof tab\.nachholen === "function"\) \{\s*tab\.nachholen\(\);/.test(lesen("js/tabs.js")), "TABS.seiteKommt ruft nachholen");
    });

    await pruefe("Befund 5: der Fokus geht nach dem Dialog an den Auslöser zurück — nicht an Eingabefelder, nicht ins Leere", () => {
        const koerper = {};
        const dokument = { body: koerper, activeElement: null, drin: [], contains: (el) => dokument.drin.indexOf(el) !== -1 };
        const umgebung = { console, document: dokument, setTimeout, clearTimeout };
        vm.createContext(umgebung);
        vm.runInContext(lesen("js/dialog.js") + "\nglobalThis.DIALOG = DIALOG;", umgebung, { filename: "dialog.js" });
        const D = umgebung.DIALOG;
        const el = (tag) => ({ tagName: tag, fokus: 0, focus() { this.fokus++; } });
        const behaelter = { hidden: true, contains: (x) => x && x.imDialog === true };
        /* der gewöhnliche Fall */
        const knopf = el("BUTTON");
        dokument.activeElement = knopf;
        dokument.drin = [knopf];
        D._ausloeserMerken(behaelter);
        D._fokusZurueck();
        gleich(knopf.fokus, 1, "zurück an den Knopf");
        D._fokusZurueck();
        gleich(knopf.fokus, 1, "nur einmal");
        /* zwei Dialoge nacheinander: der erste Auslöser gilt weiter */
        dokument.activeElement = knopf;
        D._ausloeserMerken(behaelter);
        const imDialog = el("BUTTON");
        imDialog.imDialog = true;
        dokument.activeElement = imDialog;
        behaelter.hidden = false;
        D._ausloeserMerken(behaelter);
        D._fokusZurueck();
        gleich([knopf.fokus, imDialog.fokus], [2, 0], "Kette: an den ERSTEN Auslöser");
        behaelter.hidden = true;
        /* nicht mehr im Dokument */
        const weg = el("BUTTON");
        dokument.activeElement = weg;
        D._ausloeserMerken(behaelter);
        D._fokusZurueck();
        gleich(weg.fokus, 0, "ein entferntes Element bekommt ihn nicht");
        /* Eingabefeld: die Tastatur soll am Handy nicht aufklappen */
        const feld = el("INPUT");
        dokument.activeElement = feld;
        dokument.drin = [feld];
        D._ausloeserMerken(behaelter);
        D._fokusZurueck();
        gleich(feld.fokus, 0, "kein Fokus zurück in ein Eingabefeld");
        /* nichts hatte den Fokus */
        dokument.activeElement = koerper;
        D._ausloeserMerken(behaelter);
        gleich(D._ausloeser, null, "body: kein Auslöser");
        const quelle = ohneKommentare(lesen("js/dialog.js"));
        wahr(quelle.indexOf("DIALOG._ausloeserMerken(behaelter);") < quelle.indexOf("behaelter.innerHTML = \"\";"),
            "gemerkt wird VOR dem Leeren des Dialogs");
        wahr(/classList\.remove\("dialog-offen"\);\s*DIALOG\._fokusZurueck\(\);/.test(quelle), "zurückgegeben beim Aufräumen");
    });

    await pruefe("Befund 6: die Turm-Karte am Start baut ihre Sicht nur noch einmal", () => {
        const quelle = ohneKommentare(lesen("js/start-turm.js"));
        wahr(/requestAnimationFrame\(zeichnen\);\s*\} else \{\s*zeichnen\(\);\s*\}\s*return karte;/.test(quelle),
            "im nächsten Bild — direkt nur ohne requestAnimationFrame");
    });

    /* ================================================================ *
     * E. Nachbesserung v0.164.1 (..\UPCrew\werkbank\nacht-2026-10-04\PRUEFUNG-Besitz-Kauf.md, Funde 2, 3, 5, 8)
     * ================================================================ */

    /* Ein Netz mit Schaltern: `aus` = nichts geht, `ladenAus` = nur das Lesen scheitert (Zeitlimit im Funkloch). */
    const netzMit = (fb) => {
        const netz = { aus: false, ladenAus: false };
        netz.fetch = (adresse, e) => {
            const lesend = !e || !e.method || String(e.method).toUpperCase() === "GET";
            if (netz.aus || (netz.ladenAus && lesend)) {
                return Promise.reject(new Error("kein Netz"));
            }
            return fb.fetch(adresse, e);
        };
        return netz;
    };
    const ausgegebenVon = (w) => (((w.FORTSCHRITT_KONTO.lesen().spiele || {}).blunderluck || {}).zaehler || {}).muenzenAusgegeben || 0;

    await pruefe("Fund 2/3: Konto gemerkt, Spielerliste noch nicht geladen — kein Kauf, nichts gebucht (auch nicht beim Gast); nach dem Laden kein Doppelkauf", async () => {
        const { fb, uid } = await firebaseMitAnna();
        const erstes = await geraetVonAnna(fb);
        erstes.FORTSCHRITT_KONTO.ablegen(erstes.M.verdienen(erstes.FORTSCHRITT_KONTO.lesen(), "blunderluck", 1000, Date.now()));
        await erstes.abgleich.sofortSchreiben();
        /* am anderen Gerät / im anderen Spiel gekauft: „Holz“ liegt am Konto */
        fb.db.spieler.konten[uid].besitz = { brett2d: "holz" };

        /* dasselbe Gerät startet neu — ohne Netz */
        const netz = netzMit(fb);
        netz.aus = true;
        const w = appLaden(netz, erstes.gespeichert);
        gleich(await w.abgleich.starten(), false, "Start ohne Netz");
        gleich([w.ANMELDUNG.ichId, !!w.umgebung.ICH.person(), w.KONTO.angemeldet(), w.KONTO.istGastSitzung()],
            [null, true, true, false], "das Gerät kennt sein Konto, die Liste fehlt noch");
        gleich(w.FORTSCHRITT_KONTO.person(), "gast", "die Person heisst bis dahin „gast“ (daran wird nichts geändert)");
        /* eine Partie gegen Bob verdient Münzen — sie landen unter „gast“ */
        w.FORTSCHRITT_KONTO.ablegen(w.M.verdienen(w.FORTSCHRITT_KONTO.lesen(), "blunderluck", 300, Date.now()));
        gleich(w.BESITZ.kaufBereit(), false, "kaufBereit: nein");
        const vorher = JSON.stringify(w.gespeichert);
        const r = w.BESITZ.kaufen("brett2d", "holz");
        gleich([r.ok, r.grund], [false, "laedt"], "kein Kauf, Grund „laedt“");
        gleich(JSON.stringify(w.gespeichert), vorher, "am Gerät hat sich nichts geändert: kein Besitz, keine Zahlung, kein Merker");
        gleich(ausgegebenVon(w), 0, "nichts gebucht");

        /* das Netz kommt: die Liste lädt, das Gerät meldet sich selbst an (js\anmeldung.js, datenAktualisiert) */
        netz.aus = false;
        gleich(await w.abgleich.fremdenStandHolen(), true, "Stand geholt");
        w.ANMELDUNG.datenAktualisiert(w.abgleich.daten);
        w.BESITZ.abgleichen();
        wahr(!!w.ANMELDUNG.ich(), "eigener Eintrag da");
        gleich(w.BESITZ.kaufBereit(), true, "kaufBereit: ja");
        gleich(w.BESITZ.hat("brett2d", "holz"), true, "der Kauf vom anderen Gerät ist bekannt");
        const doppelt = w.BESITZ.kaufen("brett2d", "holz");
        gleich([doppelt.ok, ausgegebenVon(w)], [false, 0], "„Holz“ wird nicht ein zweites Mal bezahlt");
        const marmor = w.BESITZ.kaufen("brett2d", "marmor");
        gleich([marmor.ok, ausgegebenVon(w)], [true, 250], "ein anderes Stück geht — bezahlt vom Konto");
        await w.abgleich.sofortSchreiben();
        gleich(fb.db.spieler.konten[uid].besitz, { brett2d: "holz_marmor" }, "am Konto vereinigt");
        gleich(JSON.parse(w.gespeichert["upcrew.besitz"]).gast, undefined, "unter „gast“ liegt kein Besitz");
    });

    await pruefe("Fund 2/3: der eigene Eintrag fehlt im Stand, obwohl jemand angemeldet ist — kein Kauf", async () => {
        const { fb } = await firebaseMitAnna();
        const w = await geraetVonAnna(fb);
        w.FORTSCHRITT_KONTO.ablegen(w.M.verdienen(w.FORTSCHRITT_KONTO.lesen(), "blunderluck", 500, Date.now()));
        gleich(w.BESITZ.kaufBereit(), true, "Ausgang: angemeldet und geladen");
        /* ein Stand ohne den eigenen Eintrag (überholte Antwort) — `ich()` liefert null, die Person hiesse „gast“ */
        w.abgleich.daten = w.SPIELER.leereDaten();
        gleich([!!w.ANMELDUNG.ichId, w.ANMELDUNG.ich(), w.FORTSCHRITT_KONTO.person()], [true, null, "gast"], "Lage");
        const r = w.BESITZ.kaufen("brett2d", "holz");
        gleich([r.ok, r.grund], [false, "laedt"], "kein Kauf");
        gleich(w.gespeichert["upcrew.besitz"], undefined, "kein Besitz auf dem Gerät");
    });

    await pruefe("Fund 2/3: ein echter Gast kauft wie bisher aufs Gerät — niemand gemerkt, und mit Gast-Sitzung auch ohne Netz", async () => {
        const { fb } = await firebaseMitAnna();
        /* niemand auf dem Gerät, kein Netz */
        const netz = netzMit(fb);
        netz.aus = true;
        const leer = appLaden(netz);
        gleich(await leer.abgleich.starten(), false, "Start ohne Netz");
        leer.FORTSCHRITT_KONTO.ablegen(leer.M.verdienen(leer.FORTSCHRITT_KONTO.lesen(), "blunderluck", 300, Date.now()));
        gleich(leer.BESITZ.kaufBereit(), true, "niemand gemerkt: Gast");
        gleich(leer.BESITZ.kaufen("brett2d", "holz").ok, true, "Kauf");
        gleich(JSON.parse(leer.gespeichert["upcrew.besitz"]), { gast: { brett2d: ["holz"] } }, "unter „gast“");

        /* „Als Gast spielen“ — dann dasselbe Gerät neu, ohne Netz */
        const g = appLaden(fb);
        await g.abgleich.starten();
        const gast = await g.KONTO.gastAnlegen(g.speicher, g.abgleich.daten);
        wahr(gast.ok, "Gast angelegt: " + JSON.stringify(gast));
        g.umgebung.ICH.personSetzen(gast.eintrag.id, gast.eintrag.name);
        netz.aus = true;
        const w = appLaden(netz, g.gespeichert);
        gleich(await w.abgleich.starten(), false, "Start ohne Netz");
        gleich([!!w.umgebung.ICH.person(), w.KONTO.istGastSitzung()], [true, true], "gemerkt ist ein Gast");
        w.FORTSCHRITT_KONTO.ablegen(w.M.verdienen(w.FORTSCHRITT_KONTO.lesen(), "blunderluck", 300, Date.now()));
        gleich(w.BESITZ.kaufBereit(), true, "ein Gast bleibt „gast“ — vor und nach dem Laden");
        gleich(w.BESITZ.kaufen("brett2d", "holz").ok, true, "Kauf aufs Gerät");
        gleich(JSON.parse(w.gespeichert["upcrew.besitz"]), { gast: { brett2d: ["holz"] } }, "unter „gast“");
    });

    await pruefe("Fund 2/3 im Shop: Konto noch nicht geladen → Kurzmeldung statt Rückfrage, nichts gebucht; Anprobieren geht", async () => {
        const w = welt();
        w.muenzen(300);
        /* das Gerät kennt ein Konto, der eigene Eintrag ist noch nicht da */
        w.umgebung.ICH = { person: () => ({ id: "anna", name: "Anna" }) };
        const bereich = w.dokument.createElement("section");
        w.haupt.appendChild(bereich);
        w.SHOP.aufbauen(bereich);
        gleich(w.SHOP.griff.oeffnen("stueck:brett2d-holz"), true, "Blatt öffnet");
        const blatt = () => w.ebenen.querySelector("[data-up-shop=\"stueck:brett2d-holz\"]");
        blatt().querySelector(".up-shop-kaufen").click();
        await warten();
        gleich(w.fragen, [], "keine Rückfrage");
        gleich(w.meldungen, ["Kaufen geht, sobald dein Konto geladen ist"], "Kurzmeldung");
        gleich([w.B.lesen(), w.saldo(), w.speicher["upcrew.besitz"], w.speicher["upcrew.kaufOffen.blunderluck"]],
            [{}, 300, undefined, undefined], "nichts gekauft, nichts gebucht, kein Merker");
        gleich(blatt().querySelector(".up-shop-anprobieren").disabled, false, "Anprobieren bleibt an");
        gleich(w.SHOP.anprobieren([w.K.stueck("brett2d", "holz")]), true, "und geht");
        w.SHOP.anprobeBeenden();
        /* das Konto ist da: jetzt mit Rückfrage und Kauf */
        w.anmelden("anna");
        w.muenzen(300);
        blatt().querySelector(".up-shop-kaufen").click();
        await warten();
        gleich(w.fragen.length, 1, "Rückfrage");
        gleich(w.B.lesen(), { brett2d: ["holz"] }, "gekauft");
        gleich(w.geraet().anna, { brett2d: ["holz"] }, "unter der Person");
    });

    await pruefe("Fund 5: scheitert das Laden vor dem Schreiben, wird NICHT geschrieben — die Änderung wartet, ein fremder Kauf bleibt am Konto", async () => {
        const { fb, uid } = await firebaseMitAnna();
        const netz = netzMit(fb);
        const w = await geraetVonAnna(netz);
        w.FORTSCHRITT_KONTO.ablegen(w.M.verdienen(w.FORTSCHRITT_KONTO.lesen(), "blunderluck", 1000, Date.now()));
        w.BESITZ.kaufen("brett2d", "holz");
        await w.abgleich.sofortSchreiben();
        gleich(fb.db.spieler.konten[uid].besitz, { brett2d: "holz" }, "Ausgang am Konto");
        /* „Typoluck“ schreibt NUR sein Feld; dieses Gerät weiss nichts davon */
        fb.db.spieler.konten[uid].besitz.schrift = "S3";
        /* Funkloch: das Lesen scheitert, das Schreiben käme durch */
        netz.ladenAus = true;
        gleich(w.BESITZ.kaufen("brett2d", "marmor").ok, true, "Kauf (Gerät sofort, Konto wartet)");
        await w.abgleich.sofortSchreiben();
        gleich(fb.db.spieler.konten[uid].besitz, { brett2d: "holz", schrift: "S3" },
            "am Konto steht noch alles — der alte Stand hat den fremden Kauf nicht überschrieben");
        gleich([w.abgleich.aenderungOffen, w.abgleich.schreibFehlschlaege], [true, 1], "die Änderung bleibt offen, gezählt als Fehlschlag");
        wahr(w.abgleich.schreibZeitgeber !== null, "der nächste Versuch ist geplant");
        /* das Netz ist wieder da: laden, vereinigen, schreiben */
        netz.ladenAus = false;
        await w.abgleich.sofortSchreiben();
        gleich([w.abgleich.aenderungOffen, w.abgleich.schreibFehlschlaege], [false, 0], "geschrieben");
        gleich(fb.db.spieler.konten[uid].besitz, { brett2d: "holz_marmor", schrift: "S3" }, "beides am Konto");
        gleich(w.BESITZ.hat("schrift", "S3"), true, "und der fremde Kauf ist hier bekannt");
    });

    await pruefe("Fund 5 am Abgleich allein: ohne geglücktes Laden kein Schreiben, Wiederholung mit Wartezeit; global und lokal wie bisher", async () => {
        let ladenGeht = false;
        let geschrieben = [];
        const speicher = { art: "gemeinsam", beschreibung: "Test",
            async laden() {
                if (!ladenGeht) {
                    throw new Error("Zeitlimit");
                }
                return { fremd: 1 };
            },
            async speichern(daten) { geschrieben.push(JSON.parse(JSON.stringify(daten))); } };
        const w = abgleichWelt(speicher);
        w.abgleich.zusammenfuehren = (fremd, eigen) => Object.assign({}, fremd, eigen);
        w.abgleich.eigeneIdSetzen("ich");
        w.abgleich.aendern({ eigen: 1 }, false);
        await w.letzter().aufgabe();
        gleich(geschrieben, [], "Laden gescheitert: nichts geschrieben");
        gleich([w.abgleich.aenderungOffen, w.abgleich.schreibFehlschlaege, w.letzter().ms], [true, 1, 500], "offen, nächster Versuch nach 500 ms");
        await w.letzter().aufgabe();
        gleich([geschrieben.length, w.letzter().ms], [0, 1000], "wieder gescheitert: die Wartezeit wächst");
        ladenGeht = true;
        await w.letzter().aufgabe();
        gleich(geschrieben, [{ fremd: 1, eigen: 1 }], "mit geglücktem Laden: zusammengeführt geschrieben");
        gleich([w.abgleich.aenderungOffen, w.abgleich.schreibFehlschlaege], [false, 0], "erledigt");
        /* eine globale Änderung (Verwaltung) führt nicht zusammen — sie lädt nicht und schreibt wie bisher */
        ladenGeht = false;
        geschrieben = [];
        w.abgleich.aendern({ global: 1 }, false, true);
        await w.letzter().aufgabe();
        gleich(geschrieben, [{ global: 1 }], "global: geschrieben ohne Laden");
        /* ohne angemeldete Person ebenso */
        w.abgleich.eigeneIdSetzen(null);
        w.abgleich.aendern({ ohne: 1 }, false);
        await w.letzter().aufgabe();
        gleich(geschrieben.slice(-1), [{ ohne: 1 }], "ohne eigene Id: wie bisher");
    });

    await pruefe("Fund 8: ein gewähltes Thema, das beim Aufbau (noch) nicht frei war, bleibt gemerkt — nur die Anzeige ist gekürzt", () => {
        const quelle = lesen("js/brett-3d.js");
        const schnitt = (name) => {
            const treffer = quelle.match(new RegExp("\\nfunction " + name + "\\([^)]*\\) \\{[\\s\\S]*?\\n\\}"));
            wahr(!!treffer, "Funktion " + name + " gefunden");
            return treffer[0];
        };
        const brettWelt = (gespeichert) => {
            const speicher = { "blunderluck.brett3d": JSON.stringify(gespeichert) };
            const frei = { thema: ["blunderluck"], figuren: ["emaille"] };
            const umgebung = {
                console,
                localStorage: {
                    getItem: (k) => (k in speicher ? speicher[k] : null),
                    setItem(k, v) { speicher[k] = String(v); }
                },
                FREISCHALTUNG: {
                    brett: () => "3d",
                    werkstatt: () => false,
                    brettStueckFrei: (schluessel, wert) => frei[schluessel].indexOf(wert) !== -1
                },
                Z: { einst: null, bereit: false },
                aussehenAnwenden() {}
            };
            vm.createContext(umgebung);
            /* Seit v0.166.0: die Logik steht in js\brett-3d-aussehen.js, das Modul reicht nur `Z.einst` hinein —
               beides echt (die Hüllen des Moduls herausgeschnitten). */
            vm.runInContext(lesen("js/brett-3d-aussehen.js") + "\nglobalThis.AUSSEHEN = BRETT_3D_AUSSEHEN;",
                umgebung, { filename: "brett-3d-aussehen.js" });
            vm.runInContext(["einstellungenLaden", "einstellungenSpeichern", "anpassungErlaubt", "aussehenFrei",
                "aussehenLesen", "aussehenWaehlen"].map(schnitt).join("\n")
                + "\nObject.assign(globalThis, { einstellungenLaden, einstellungenSpeichern, aussehenLesen, aussehenWaehlen });",
            umgebung, { filename: "brett-3d-ausschnitt.js" });
            return { umgebung, frei, im: () => JSON.parse(speicher["blunderluck.brett3d"]) };
        };

        /* Das Brett baut sich, BEVOR der Besitz vom Konto bekannt ist: „Marmor“ (gekauft) gilt noch als gesperrt. */
        const w = brettWelt({ an: true, thema: "marmor", figuren: "matt", schatten: true });
        w.umgebung.Z.einst = w.umgebung.einstellungenLaden();
        gleich([w.umgebung.Z.einst.thema, w.umgebung.Z.einst.figuren], ["blunderluck", "emaille"], "angezeigt wird die Vorgabe (gekürzt)");
        /* irgendein Speichern (hier: wie die Paletten-Tafel bei „Schatten“) */
        w.umgebung.Z.einst.schatten = false;
        w.umgebung.einstellungenSpeichern();
        gleich([w.im().thema, w.im().figuren, w.im().schatten], ["marmor", "matt", false], "die gemerkte Wahl steht noch im Speicher, der Schatten ist gespeichert");
        /* der Besitz kommt an; der Spieler wählt einen anderen Figuren-Stil — das Thema bleibt gemerkt */
        w.frei.thema.push("marmor");
        w.frei.figuren.push("metall");
        gleich(w.umgebung.aussehenWaehlen("figuren", "metall"), true, "Figuren gewählt");
        gleich([w.im().thema, w.im().figuren], ["marmor", "metall"], "Thema bleibt, Figuren neu");
        /* eine ausdrückliche Wahl gilt — auch die der Vorgabe */
        gleich(w.umgebung.aussehenWaehlen("thema", "blunderluck"), true, "Vorgabe gewählt");
        gleich(w.im().thema, "blunderluck", "die eigene Wahl überschreibt das Gemerkte");
        /* beim nächsten Aufbau ist das Gemerkte wieder da */
        const neu = brettWelt({ an: true, thema: "marmor", figuren: "matt" });
        neu.frei.thema.push("marmor");
        gleich(neu.umgebung.einstellungenLaden().thema, "marmor", "frei → gilt");

        /* Noch nicht aufgebaut (`Z.einst` leer): Wählen speichert nur — und verliert die andere gemerkte Wahl nicht. */
        const frueh = brettWelt({ an: true, thema: "marmor", figuren: "matt" });
        frueh.frei.figuren.push("metall");
        gleich(frueh.umgebung.aussehenWaehlen("figuren", "metall"), true, "früh gewählt");
        gleich([frueh.im().thema, frueh.im().figuren, frueh.umgebung.Z.einst], ["marmor", "metall", null], "Thema bleibt gemerkt, `Z.einst` bleibt leer");
        gleich(frueh.umgebung.aussehenWaehlen("thema", "marmor"), false, "Gesperrtes lässt sich weiter nicht wählen");
        /* Unbekanntes im Speicher (altes Thema, kaputt) wird nicht weitergetragen */
        const alt = brettWelt({ an: true, thema: "gibtsnicht", figuren: 7 });
        alt.umgebung.Z.einst = alt.umgebung.einstellungenLaden();
        alt.umgebung.einstellungenSpeichern();
        gleich([alt.im().thema, alt.im().figuren], ["blunderluck", "emaille"], "Unbekanntes fällt auf die Vorgabe");
    });

    /* v0.165.0 Teil A: dasselbe für die Brett-Art (an / oben / scheiben) — mit dem ECHTEN js\freischaltung.js. */
    await pruefe("v0.165.0: die gewählte Brett-Art (3D, Scheiben, 3D-Figuren oben) geht nicht verloren, wenn das Brett vor dem Konto baut", () => {
        const quelle = lesen("js/brett-3d.js");
        const schnitt = (name) => {
            const treffer = quelle.match(new RegExp("\\nfunction " + name + "\\([^)]*\\) \\{[\\s\\S]*?\\n\\}"));
            wahr(!!treffer, "Funktion " + name + " gefunden");
            return treffer[0];
        };
        const welt = (gespeichert) => {
            const speicher = {};
            if (gespeichert) speicher["blunderluck.brett3d"] = JSON.stringify(gespeichert);
            const stand = { ort: 0 };
            const umgebung = {
                console,
                localStorage: {
                    getItem: (k) => (k in speicher ? speicher[k] : null),
                    setItem(k, v) { speicher[k] = String(v); }
                },
                TURM: { FREI_AB: { brettDreiD: 2, dreiD: 3 } },
                FORTSCHRITT_KONTO: { turmOrt: () => stand.ort, level: () => ({ level: 1 }) },
                Z: { einst: null, bereit: false },
                aussehenAnwenden() {}
            };
            vm.createContext(umgebung);
            vm.runInContext(lesen("js/freischaltung.js"), umgebung, { filename: "freischaltung.js" });
            /* Seit v0.166.0: echte js\brett-3d-aussehen.js + die Hüllen des Moduls. */
            vm.runInContext(lesen("js/brett-3d-aussehen.js") + "\nglobalThis.AUSSEHEN = BRETT_3D_AUSSEHEN;",
                umgebung, { filename: "brett-3d-aussehen.js" });
            vm.runInContext(["einstellungenLaden", "einstellungenSpeichern", "anpassungErlaubt", "aussehenFrei",
                "aussehenLesen", "aussehenWaehlen"].map(schnitt).join("\n")
                + "\nObject.assign(globalThis, { einstellungenLaden, einstellungenSpeichern, aussehenWaehlen, FREISCHALTUNG });",
            umgebung, { filename: "brett-3d-ausschnitt.js" });
            return { u: umgebung, stand, im: () => JSON.parse(speicher["blunderluck.brett3d"] || "{}"), roh: () => speicher["blunderluck.brett3d"] };
        };

        /* 3D gewählt; das Brett baut, bevor das Konto da ist (Ort 0 = nichts frei); dann speichert irgendetwas (Schatten). */
        const w = welt({ an: true, oben: false, scheiben: false, thema: "blunderluck" });
        w.u.Z.einst = w.u.einstellungenLaden();
        gleich([w.u.Z.einst.an, w.u.FREISCHALTUNG.brett()], [false, "2d"], "vor dem Konto: angezeigt wird 2D (gekürzt)");
        w.u.Z.einst.schatten = false;
        w.u.einstellungenSpeichern("schatten");
        gleich(w.im().schatten, false, "der Schatten ist gespeichert");
        w.stand.ort = 3;
        gleich(w.u.FREISCHALTUNG.brett(), "3d", "das Konto kommt an (Marmorsaal): die 3D-Wahl gilt wieder");

        /* nur das 3D-Brett frei (Holzhalle): angezeigt „Scheiben“ — gespeichert bleibt der Wunsch nach 3D-Figuren */
        const halb = welt({ an: true, oben: false, scheiben: false });
        halb.stand.ort = 2;
        halb.u.Z.einst = halb.u.einstellungenLaden();
        gleich(halb.u.Z.einst.scheiben, true, "Holzhalle: Scheiben angezeigt");
        halb.u.einstellungenSpeichern();
        halb.stand.ort = 3;
        gleich(halb.u.FREISCHALTUNG.brett(), "3d", "Marmorsaal: wieder 3D-Figuren, nicht Scheiben");

        /* 3D-Figuren auf dem 2D-Brett („oben“) */
        const oben = welt({ an: false, oben: true });
        oben.u.Z.einst = oben.u.einstellungenLaden();
        oben.u.einstellungenSpeichern();
        oben.stand.ort = 3;
        gleich(oben.u.FREISCHALTUNG.brett(), "oben", "„oben“ bleibt gemerkt");

        /* noch nicht aufgebaut: ein Thema wählen verliert die Brett-Art nicht */
        const frueh = welt({ an: true, scheiben: true });
        gleich(frueh.u.aussehenWaehlen("thema", "holz"), true, "Thema früh gewählt");
        frueh.stand.ort = 2;
        gleich([frueh.im().thema, frueh.u.FREISCHALTUNG.brett()], ["holz", "scheiben"], "Thema gespeichert, Scheiben bleiben");

        /* die eigene Wahl gilt: brettSetzen schreibt; ein späteres Speichern mit veraltetem `Z.einst` macht sie nicht rückgängig */
        const selbst = welt({ an: true, scheiben: false });
        selbst.stand.ort = 3;
        selbst.u.Z.einst = selbst.u.einstellungenLaden();
        gleich(selbst.u.FREISCHALTUNG.brettSetzen("2d"), "2d", "2D gewählt");
        selbst.u.einstellungenSpeichern("blick");
        gleich(selbst.u.FREISCHALTUNG.brett(), "2d", "2D bleibt gewählt");
        gleich(selbst.u.FREISCHALTUNG.brettSetzen("oben"), "oben", "3D-Figuren oben gewählt");
        selbst.u.einstellungenSpeichern();
        gleich(selbst.u.FREISCHALTUNG.brett(), "oben", "„oben“ bleibt gewählt");

        /* nichts gemerkt: Speichern erfindet keine 3D-Wahl */
        const leer = welt(null);
        leer.u.Z.einst = leer.u.einstellungenLaden();
        leer.u.einstellungenSpeichern();
        leer.stand.ort = 3;
        gleich(leer.u.FREISCHALTUNG.brett(), "2d", "ohne Wahl bleibt 2D");
    });

    console.log(anzahlOk + " ok, " + anzahlFehler + " Fehler");
    process.exit(anzahlFehler === 0 ? 0 : 1);
})();
