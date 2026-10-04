/*
 * test-level-luecken.js — die drei Level-Lücken aus dem Befund vom 03.10.2026
 * („Blunderluck Level 1, Typoluck Level 6", UEBERGABE.md), geschlossen mit
 * v0.160.1. Jede der drei Prüfgruppen wäre mit v0.160.0 rot:
 *
 *   1. RÜCKKEHR IN DEN VORDERGRUND: Der eigene Konto-Eintrag wird geholt,
 *      auch wenn die Marke `spieler/geaendertAm` nicht gestiegen ist — nur
 *      der eigene Eintrag, höchstens einmal je Rückkehr, nur für angemeldete
 *      Konten; die zwei Sperren des Abgleichs gelten weiter
 *      (`Abgleich.rueckkehr`, `ANMELDUNG.eigenenEintragHolen`).
 *      Die ECHTEN Dateien laufen gegen die nachgebaute Firebase mit der
 *      ECHTEN Regel §13 (tests\regel-nachbau.js, SICHERHEIT.md Abschnitt 15).
 *   2. START-KOPF: Trifft ein Konto-Stand ein, der Level, XP oder Serie
 *      ändert, zeichnet der Kopf neu — ohne Neustart und ohne den Rest des
 *      Starts neu zu bauen (`START.kopfAktualisieren`, app.js `beiDaten`).
 *   3. GAST-HINWEIS: Ein Gast sieht im ausführlichen Profil EINE Zeile, dass
 *      das Level nur auf diesem Gerät zählt, mit Weg zum Konto
 *      (`PROFIL._gastHinweisEinsetzen`). Der Baustein js\upcrew-profil.js
 *      läuft dabei unverändert mit.
 *
 * Gruppe 2 und 3 nutzen die gemeinsame Bildschirm-Umgebung
 * (bildschirm-umgebung.js: nachgebautes DOM, echte js\-Dateien).
 *
 * Aufruf: siehe tests\README.md
 */

const pfad = require("path");
const dateisystem = require("fs");
const vm = require("vm");
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
    const a = JSON.stringify(ist);
    const b = JSON.stringify(soll);
    if (a !== b) {
        throw new Error((was || "Wert") + ": erwartet " + b + ", war " + a);
    }
}

function wahr(bedingung, was) {
    if (!bedingung) {
        throw new Error((was || "Bedingung") + " war nicht erfüllt");
    }
}

const projekt = pfad.join(__dirname, "..");
const jsOrdner = pfad.join(projekt, "js");
const lesen = (name) => dateisystem.readFileSync(pfad.join(projekt, name), "utf8");

/* ------------------------------------------------------------------ *
 * Gruppe 1: die App gegen die nachgebaute Firebase (wie test-regel-12.js)
 * ------------------------------------------------------------------ */

const sicherheit = lesen("SICHERHEIT.md");

/* Der ```text-Block nach einer Überschrift. */
function textBlockNach(marke) {
    const start = sicherheit.indexOf(marke);
    if (start === -1) {
        throw new Error("Abschnitt fehlt: " + marke);
    }
    const a = sicherheit.indexOf("```text", start) + "```text".length + 1;
    const e = sicherheit.indexOf("```", a);
    return sicherheit.slice(a, e);
}

/* Die eingespielte Regel (§13, seit 30.09.2026). */
const REGEL_13 = JSON.parse(textBlockNach("## 15. Regel §13"));

const BASIS = "https://upcrew-7a29d-default-rtdb.europe-west1.firebasedatabase.app";
const PW_ANNA = "Anna#Pass1";

/* 800 XP aus Typoluck = Level 6 (100 + 125 + 150 + 175 + 200 = 750). */
const TYPOLUCK_ZWEIG = { xp: 800, partien: 80, stand: 1759500000000, gezaehlt: [] };

function appLaden(fb) {
    const gespeichert = {};
    const sichtbarkeit = [];
    const gezeichnet = { anzahl: 0 };
    const umgebung = {
        console, URL, URLSearchParams, AbortController, TextEncoder, Uint8Array, Uint32Array,
        crypto: globalThis.crypto,
        setTimeout, clearTimeout,
        fetch: (a, e) => fb.fetch(a, e),
        document: {
            hidden: false,
            addEventListener(art, behandler) {
                if (art === "visibilitychange") {
                    sichtbarkeit.push(behandler);
                }
            }
        },
        window: {
            setTimeout, clearTimeout,
            setInterval() { return 0; },
            addEventListener() {},
            localStorage: {
                getItem(s) { return (s in gespeichert) ? gespeichert[s] : null; },
                setItem(s, w) { gespeichert[s] = String(w); },
                removeItem(s) { delete gespeichert[s]; }
            }
        },
        KONFIG: {
            APP_VERSION: "test",
            speicher: {
                modus: "gemeinsam", firebaseBasis: BASIS, pfad: "spieler",
                schachPfad: "blunderluck/team-schach", abfrageIntervallMs: 3000,
                schreibVerzoegerungMs: 0, lokalerSchluessel: "blunderluck.spieler",
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

    /* Dieselbe Reihenfolge wie in index.html. */
    const quelltext = ["konto.js", "fortschritt-kern.js", "fortschritt.js", "upcrew-abzeichen.js", "spieler.js",
        "versiegelung.js", "ich.js", "fuehlen.js", "speicher.js", "speicher-konten.js", "abgleich.js",
        "anmeldung.js", "anmeldung-konto.js", "fortschritt-konto.js"]
        .map((name) => dateisystem.readFileSync(pfad.join(jsOrdner, name), "utf8"))
        .join("\n;\n")
        + "\nObject.assign(globalThis, { KONTO, FORTSCHRITT, FORTSCHRITT_KONTO, SPIELER, ICH, ANMELDUNG,"
        + " Abgleich, SpeicherGemeinsam, SpeicherKonten, speicherErzeugen });";
    vm.runInContext(quelltext, umgebung, { filename: "level-luecken-umgebung.js" });

    const { KONTO, SPIELER, ANMELDUNG } = umgebung;
    KONTO.einrichten(umgebung.KONFIG);
    umgebung.SpeicherGemeinsam.tokenGeber = () => KONTO.token();
    const speicher = umgebung.speicherErzeugen(umgebung.KONFIG, "spieler",
        "blunderluck.spieler", (roh) => SPIELER.normalisieren(roh), () => KONTO.uid()).speicher;

    /* Die Rückrufe wie in js\app.js (dass app.js genau diese zwei Wege
       verdrahtet, prüft Gruppe 1 am Quelltext). */
    const abgleich = new umgebung.Abgleich(speicher, umgebung.KONFIG.speicher, {
        beiDaten: () => { gezeichnet.anzahl++; },
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
    return { umgebung, KONTO, SPIELER, ANMELDUNG, FORTSCHRITT: umgebung.FORTSCHRITT,
        FORTSCHRITT_KONTO: umgebung.FORTSCHRITT_KONTO, abgleich, speicher, sichtbarkeit, gezeichnet };
}

/* Eine Firebase unter Regel §13 mit dem Konto „Anna" — angelegt über den
   echten Weg, danach abgemeldet. */
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

/* Ein frisches Gerät, auf dem sich Anna anmeldet; der Abgleich läuft und
   hat die Marke gesehen (wie nach dem Start der App). */
async function geraetVonAnna(fb) {
    const w = appLaden(fb);
    await w.abgleich.starten();
    const an = await w.ANMELDUNG._kontoAnmeldenVersuchen("Anna", PW_ANNA);
    wahr(an.ok, "Anna angemeldet: " + JSON.stringify(an));
    /* Seit v0.163.0 merkt schon `starten()` die Marke (Befund 04.10.2026
       Nr. 2): Der erste Blick im Takt holt den Stand nicht noch einmal —
       Liste und eigener Eintrag kamen mit der Anmeldung
       (`ANMELDUNG._nachAnmeldungLaden`). Bis v0.162.0 stand hier `true`. */
    gleich(await w.abgleich.fremdenStandHolen(), undefined, "erster Blick: Marke unverändert, nichts doppelt geholt");
    wahr(w.abgleich.markeGesehen !== null, "Marke gesehen (schon beim Start)");
    wahr(!!w.ANMELDUNG.ich(), "eigener Eintrag da");
    return w;
}

/* Die GET-Aufrufe an die Datenbank seit `ab` (ohne Anmelde-Dienste). */
function leseAufrufe(fb, ab) {
    return fb.aufrufe.slice(ab)
        .filter((aufruf) => aufruf.methode === "GET" && aufruf.pfad.indexOf("/spieler") === 0)
        .map((aufruf) => aufruf.pfad);
}

/* „Typoluck" schreibt seinen Zweig an Annas Konto — OHNE die Marke zu heben. */
function typoluckSchreibt(fb, uid, zweig) {
    const eintrag = fb.db.spieler.konten[uid];
    const fortschritt = eintrag.fortschritt || { version: 1, spiele: {} };
    fortschritt.spiele = Object.assign({}, fortschritt.spiele, { typoluck: zweig });
    eintrag.fortschritt = fortschritt;
}

(async () => {

    await pruefe("Rückkehr: der eigene Konto-Eintrag kommt, auch wenn die Marke stillsteht (Level 1 → 6)", async () => {
        const { fb, uid } = await firebaseMitAnna();
        const w = await geraetVonAnna(fb);
        gleich(w.FORTSCHRITT_KONTO.level().level, 1, "vorher Level 1");

        const marke = fb.db.spieler.geaendertAm;
        typoluckSchreibt(fb, uid, TYPOLUCK_ZWEIG);
        gleich(fb.db.spieler.geaendertAm, marke, "die Marke steht still");

        /* Der gewohnte Blick allein sieht es NICHT — das war die Lücke. */
        const vorBlick = fb.aufrufe.length;
        wahr(await w.abgleich.fremdenStandHolen() !== true, "gleiche Marke: nichts geholt");
        gleich(leseAufrufe(fb, vorBlick), ["/spieler/geaendertAm"], "nur die Marke gefragt");
        gleich(w.FORTSCHRITT_KONTO.level().level, 1, "Level bleibt ohne Rückkehr 1");

        const vorRueckkehr = fb.aufrufe.length;
        const gezeichnetVorher = w.gezeichnet.anzahl;
        gleich(await w.abgleich.rueckkehr(), true, "Rückkehr übernimmt den eigenen Eintrag");
        gleich(w.ANMELDUNG.ich().fortschritt.spiele.typoluck.xp, 800, "Typolucks Zweig am eigenen Eintrag");
        gleich(w.FORTSCHRITT_KONTO.level().level, 6, "Level 6 ohne Neustart");
        gleich(w.gezeichnet.anzahl, gezeichnetVorher + 1, "beiDaten genau einmal");

        /* Nur der eigene Eintrag, ein Aufruf: Marke + konten/<uid>, sonst nichts. */
        gleich(leseAufrufe(fb, vorRueckkehr), ["/spieler/geaendertAm", "/spieler/konten/" + uid],
            "Marke und NUR der eigene Eintrag");

        /* Noch einmal zurück, nichts Neues: geholt, aber nicht neu gezeichnet. */
        gleich(await w.abgleich.rueckkehr(), false, "ohne Änderung keine Übernahme");
        gleich(w.gezeichnet.anzahl, gezeichnetVorher + 1, "kein zweites beiDaten");
    });

    await pruefe("Rückkehr: der Wechsel in den Vordergrund ruft `rueckkehr` — im Hintergrund nichts", async () => {
        const { fb } = await firebaseMitAnna();
        const w = await geraetVonAnna(fb);
        wahr(w.sichtbarkeit.length >= 1, "Abgleich hört auf visibilitychange");
        let gerufen = 0;
        w.abgleich.rueckkehr = async () => { gerufen++; return false; };
        w.umgebung.document.hidden = true;
        w.sichtbarkeit.forEach((behandler) => behandler());
        gleich(gerufen, 0, "verborgen: keine Rückkehr");
        w.umgebung.document.hidden = false;
        w.sichtbarkeit.forEach((behandler) => behandler());
        gleich(gerufen, 1, "sichtbar: genau eine Rückkehr");
    });

    await pruefe("Rückkehr: ist die Marke gestiegen, holt der gewohnte Weg — der eigene Eintrag nur EINMAL", async () => {
        const { fb, uid } = await firebaseMitAnna();
        const w = await geraetVonAnna(fb);
        typoluckSchreibt(fb, uid, TYPOLUCK_ZWEIG);
        fb.db.spieler.geaendertAm += 1;
        const ab = fb.aufrufe.length;
        gleich(await w.abgleich.rueckkehr(), true, "Stand geholt");
        gleich(w.FORTSCHRITT_KONTO.level().level, 6, "Level 6");
        const eigene = leseAufrufe(fb, ab).filter((p) => p === "/spieler/konten/" + uid);
        gleich(eigene.length, 1, "konten/<uid> genau einmal je Rückkehr");
    });

    await pruefe("Rückkehr: keine Übernahme, solange eine eigene Änderung aussteht (Sperre vor dem Aufruf)", async () => {
        const { fb, uid } = await firebaseMitAnna();
        const w = await geraetVonAnna(fb);
        typoluckSchreibt(fb, uid, TYPOLUCK_ZWEIG);
        for (const sperre of ["aenderungOffen", "schreibtGerade"]) {
            w.abgleich[sperre] = true;
            const ab = fb.aufrufe.length;
            gleich(await w.abgleich.rueckkehr(), false, sperre + ": nichts übernommen");
            gleich(leseAufrufe(fb, ab), [], sperre + ": gar nicht erst gefragt");
            w.abgleich[sperre] = false;
        }
        w.abgleich.eigenerVorgangBeginnt();
        gleich(await w.abgleich.rueckkehr(), false, "eigener Vorgang läuft: nichts übernommen");
        w.abgleich.eigenerVorgangEndet();
        gleich(w.FORTSCHRITT_KONTO.level().level, 1, "Stand unberührt");
        gleich(await w.abgleich.rueckkehr(), true, "ohne Sperre kommt er");
    });

    await pruefe("Rückkehr: nach dem Warten NEU geprüft — eine überholte Antwort wird verworfen", async () => {
        const { fb, uid } = await firebaseMitAnna();
        const w = await geraetVonAnna(fb);
        typoluckSchreibt(fb, uid, TYPOLUCK_ZWEIG);

        /* Während die Antwort unterwegs ist, läuft ein eigener Vorgang durch
           (begonnen UND beendet — nur der Zähler verrät ihn noch). */
        const echtesHolen = w.abgleich.eigenerEintrag.holen;
        w.abgleich.eigenerEintrag.holen = async () => {
            const geholt = await echtesHolen();
            w.abgleich.eigenerVorgangBeginnt();
            w.abgleich.eigenerVorgangEndet();
            return geholt;
        };
        const vorher = w.gezeichnet.anzahl;
        gleich(await w.abgleich.rueckkehr(), false, "überholt: verworfen");
        gleich(w.gezeichnet.anzahl, vorher, "nicht gezeichnet");
        gleich(w.FORTSCHRITT_KONTO.level().level, 1, "Stand unberührt");

        /* Ebenso, wenn währenddessen eine eigene Änderung dazukommt. */
        w.abgleich.eigenerEintrag.holen = async () => {
            const geholt = await echtesHolen();
            w.abgleich.aenderungOffen = true;
            return geholt;
        };
        gleich(await w.abgleich.rueckkehr(), false, "Änderung während des Wartens: verworfen");
        w.abgleich.aenderungOffen = false;

        /* Ein Netzfehler wirft nicht nach aussen. */
        w.abgleich.eigenerEintrag.holen = async () => { throw new Error("Kein Netz"); };
        gleich(await w.abgleich.rueckkehr(), false, "Netzfehler: still");

        w.abgleich.eigenerEintrag.holen = echtesHolen;
        gleich(await w.abgleich.rueckkehr(), true, "danach kommt er");
        gleich(w.FORTSCHRITT_KONTO.level().level, 6, "Level 6");
    });

    await pruefe("Rückkehr: ein Gast und ein nicht angemeldetes Gerät holen keinen eigenen Eintrag", async () => {
        const { fb } = await firebaseMitAnna();

        /* Nicht angemeldet. */
        const leer = appLaden(fb);
        await leer.abgleich.starten();
        await leer.abgleich.fremdenStandHolen();
        gleich(await leer.ANMELDUNG.eigenenEintragHolen(), null, "nicht angemeldet: null");

        /* Gast. */
        const w = appLaden(fb);
        await w.abgleich.starten();
        const gast = await w.KONTO.gastAnlegen(w.speicher, w.abgleich.daten);
        wahr(gast.ok, "Gast angelegt: " + JSON.stringify(gast));
        w.abgleich.daten = await w.speicher.laden();
        w.ANMELDUNG._uebernehmen(gast.eintrag);
        await w.abgleich.fremdenStandHolen();
        wahr(w.ANMELDUNG.istGast(), "als Gast angemeldet");
        const ab = fb.aufrufe.length;
        gleich(await w.ANMELDUNG.eigenenEintragHolen(), null, "Gast: null");
        gleich(await w.abgleich.rueckkehr(), false, "Gast: keine Übernahme");
        gleich(leseAufrufe(fb, ab).filter((p) => /^\/spieler\/konten\/[^/]+$/.test(p)), [],
            "Gast: kein Aufruf des eigenen Eintrags");
    });

    await pruefe("Rückkehr: der Eintrag eines anderen Kontos wird nicht eingesetzt", async () => {
        const { fb, uid } = await firebaseMitAnna();
        const w = await geraetVonAnna(fb);
        const daten = w.abgleich.daten;
        const fremd = { uid: "uid-fremd", eintrag: Object.assign({}, fb.db.spieler.konten[uid], { uid: "uid-fremd" }) };
        gleich(w.ANMELDUNG.eigenenEintragEinsetzen(daten, fremd), null, "fremde Konto-Nummer");
        gleich(w.ANMELDUNG.eigenenEintragEinsetzen(daten, null), null, "nichts geholt");
        const andereId = { uid: uid, eintrag: Object.assign({}, fb.db.spieler.konten[uid], { id: "id-anders" }) };
        gleich(w.ANMELDUNG.eigenenEintragEinsetzen(daten, andereId), null, "andere Spieler-Kennung");
        const gut = w.ANMELDUNG.eigenenEintragEinsetzen(daten, { uid: uid, eintrag: fb.db.spieler.konten[uid] });
        wahr(gut && gut !== daten && gut.spieler.length === daten.spieler.length, "eigener Eintrag: neuer Stand, gleich lang");
        wahr(w.SPIELER.inhaltGleich(gut, daten), "unverändert vom Server = inhaltlich gleich");
    });

    await pruefe("Rückkehr: app.js gibt der Spielerliste genau diese zwei Wege mit, das Schach keinen", () => {
        const app = lesen("js/app.js");
        wahr(/eigenerEintrag: \{\s*holen: \(\) => ANMELDUNG\.eigenenEintragHolen\(\),\s*einsetzen: \(daten, geholt\) => ANMELDUNG\.eigenenEintragEinsetzen\(daten, geholt\)\s*\}/.test(app),
            "spielerAbgleich mit eigenerEintrag");
        gleich(app.split("eigenerEintrag:").length - 1, 1, "nur einmal — nicht am Schach-Abgleich");
        wahr(/if \(!document\.hidden\) \{\s*this\.rueckkehr\(\);/.test(lesen("js/abgleich.js")), "Sichtbarkeit → rueckkehr");
    });

    /* -------------------------------------------------------------- *
     * Gruppe 2 und 3: Start-Kopf und Gast-Hinweis im nachgebauten DOM
     * -------------------------------------------------------------- */

    const B = require("./bildschirm-umgebung.js");
    const u = B.umgebung;
    u.localStorage = u.window.localStorage;
    vm.runInContext(["fortschritt-kern.js", "fortschritt.js", "fortschritt-konto.js"]
        .map((name) => dateisystem.readFileSync(pfad.join(jsOrdner, name), "utf8")).join("\n;\n")
        + "\nObject.assign(globalThis, { FORTSCHRITT, FORTSCHRITT_KONTO });", u, { filename: "fortschritt-dazu.js" });
    const START = u.START;
    const ANMELDUNG = B.ANMELDUNG;
    const SPIELER = B.SPIELER;
    ANMELDUNG.ichId = "id-anna";
    const ausgangsDaten = ANMELDUNG.abgleich.daten;

    const kontoStand = (zweig) => {
        ANMELDUNG.abgleich.daten = SPIELER.fortschrittSetzen(ANMELDUNG.abgleich.daten, "id-anna",
            { version: 1, spiele: { typoluck: zweig } }, 5);
    };
    const levelZahl = () => {
        const zahl = B.klasseSuchen(START.wurzelEl, "level-zahl");
        return zahl ? zahl.textContent : null;
    };

    await pruefe("Start-Kopf: trifft der Konto-Stand später ein, zeigt der Kopf das neue Level ohne Neustart", () => {
        START.aufbauen(B.neuesElement("div"));
        gleich(levelZahl(), "1", "gezeichnet mit Level 1");
        const kopfVorher = B.klasseSuchen(START.wurzelEl, "start-oben");
        const spielenVorher = B.klasseSuchen(START.wurzelEl, "start-spielen");
        wahr(!!kopfVorher && !!spielenVorher, "Kopf und Spielen-Knopf gezeichnet");
        gleich(START.kopfAktualisieren(), false, "ohne Änderung kein Neubau");

        /* Der Stand vom Konto kommt nach (800 XP aus Typoluck). */
        kontoStand({ xp: 800, partien: 80, stand: 9, gezaehlt: [] });
        gleich(u.FORTSCHRITT_KONTO.level().level, 6, "die Rechnung kennt Level 6");
        START.flammeAktualisieren();
        gleich(levelZahl(), "1", "die Flamme allein zieht das Level nicht nach (Stand v0.160.0)");

        gleich(START.kopfAktualisieren(), true, "Kopf neu gebaut");
        gleich(levelZahl(), "6", "Kopf zeigt Level 6");
        wahr(B.klasseSuchen(START.wurzelEl, "start-oben") === kopfVorher, "derselbe Kopf-Bereich, nur neu gefüllt");
        wahr(B.klasseSuchen(START.wurzelEl, "start-spielen") === spielenVorher, "der Rest des Starts bleibt stehen");
        gleich(B.klasseZaehlen(START.wurzelEl, "level-zahl"), 1, "kein doppelter Kopf");
        gleich(START.kopfAktualisieren(), false, "zweiter Aufruf: nichts zu tun");
    });

    await pruefe("Start-Kopf: auch XP im selben Level und die Serie lösen den Neubau aus", () => {
        const ring = () => B.klasseSuchen(START.wurzelEl, "level-ring");
        const ringVorher = ring();
        kontoStand({ xp: 900, partien: 90, stand: 10, gezaehlt: [] });
        gleich(u.FORTSCHRITT_KONTO.level().level, 6, "weiter Level 6");
        gleich(START.kopfAktualisieren(), true, "XP geändert: neu gebaut");
        wahr(ring() !== ringVorher, "neuer Ring");
        gleich(levelZahl(), "6", "Level 6");

        const heute = u.FORTSCHRITT.datumVon(Date.now());
        kontoStand({ xp: 900, partien: 90, stand: 11, gezaehlt: [], tage: [heute],
            zaehler: { serie: 1, serieBis: Number(heute.replace(/-/g, "")), serieSchutz: 0 } });
        gleich(u.FORTSCHRITT_KONTO.heute().serie.tage, 1, "Serie 1");
        gleich(START.kopfAktualisieren(), true, "Serie geändert: neu gebaut");
        gleich(START.kopfAktualisieren(), false, "danach Ruhe");
    });

    await pruefe("Start-Kopf: ohne gezeichneten Start passiert nichts; app.js ruft ihn bei jedem Spieler-Stand", () => {
        const gemerkt = START._obenEl;
        START._obenEl = null;
        gleich(START.kopfAktualisieren(), false, "kein Start gezeichnet");
        START._obenEl = gemerkt;
        const app = lesen("js/app.js");
        const beiDaten = app.slice(app.indexOf("const spielerAbgleich = new Abgleich("), app.indexOf("beiStatus:"));
        wahr(/START\.kopfAktualisieren\(\);/.test(beiDaten), "beiDaten der Spielerliste ruft START.kopfAktualisieren");
        wahr(beiDaten.indexOf("START.kopfAktualisieren()") < beiDaten.indexOf("START.flammeAktualisieren()"),
            "vor der Flamme");
    });

    /* Gruppe 3: das ausführliche Profil mit dem ECHTEN Baustein. */
    u.TABS.blattOeffnen = (id) => { u.TABS.blattGeoeffnet = id; };
    vm.runInContext(["upcrew-profil.js", "profil.js"]
        .map((name) => dateisystem.readFileSync(pfad.join(jsOrdner, name), "utf8")).join("\n;\n")
        + "\nObject.assign(globalThis, { PROFIL });", u, { filename: "profil-dazu.js" });
    const PROFIL = u.PROFIL;
    const profilZeichnen = (spielerId, eigen) => {
        PROFIL._eintrag = { inhalt: B.neuesElement("div"), spielerId: spielerId, eigen: eigen };
        PROFIL.zeichnen();
        return PROFIL._eintrag.inhalt;
    };
    const alsGast = (an) => {
        const daten = SPIELER.kopieren(ausgangsDaten);
        for (const spieler of daten.spieler) {
            if (spieler.id === "id-anna" && an) {
                spieler.gast = true;
            }
        }
        ANMELDUNG.abgleich.daten = daten;
    };

    await pruefe("Gast-Hinweis: ein Gast sieht im eigenen Profil EINE Zeile mit Weg zum Konto", () => {
        alsGast(true);
        const inhalt = profilZeichnen("id-anna", true);
        gleich(B.klasseZaehlen(inhalt, "profil-gast-hinweis"), 1, "genau eine Zeile");
        const zeile = B.klasseSuchen(inhalt, "profil-gast-hinweis");
        const text = B.klasseSuchen(zeile, "profil-gast-hinweis-text");
        wahr(/Gast/.test(text.textContent) && /nur auf diesem Gerät/.test(text.textContent),
            "sagt: nur auf diesem Gerät — war: " + text.textContent);
        wahr(!/[.!?]$/.test(text.textContent), "Stichwort, kein Satz");
        const knopf = zeile.kinder.find((kind) => kind.tagName === "button");
        wahr(!!knopf && knopf.textContent === "Anmelden", "Knopf „Anmelden“");
        wahr(B.hatKlasse(knopf, "knopf") && B.hatKlasse(knopf, "knopf-still"), "ein stiller Haus-Knopf");
        u.TABS.blattGeoeffnet = "";
        knopf.ausloesen("click");
        gleich(u.TABS.blattGeoeffnet, "einstellungen", "führt zur Konto-Karte in den Einstellungen");
        wahr(B.klasseZaehlen(inhalt, "up-pf-level-abschnitt") === 1, "der Level-Balken des Bausteins steht daneben");

        /* Neu zeichnen verdoppelt nichts. */
        PROFIL.zeichnen();
        gleich(B.klasseZaehlen(PROFIL._eintrag.inhalt, "profil-gast-hinweis"), 1, "nach Neuzeichnen weiter eine");
    });

    await pruefe("Gast-Hinweis: mit Konto keine Zeile, und nie an einem fremden Profil", () => {
        alsGast(false);
        gleich(B.klasseZaehlen(profilZeichnen("id-anna", true), "profil-gast-hinweis"), 0, "mit Konto: keine Zeile");
        alsGast(true);
        gleich(B.klasseZaehlen(profilZeichnen("id-bert", false), "profil-gast-hinweis"), 0, "fremdes Profil: keine Zeile");
        alsGast(false);
        PROFIL._eintrag = null;
    });

    await pruefe("Gast-Hinweis: steht in Blunderlucks eigenen Dateien — der Baustein kennt ihn nicht", () => {
        wahr(lesen("js/upcrew-profil.js").indexOf("gast-hinweis") === -1, "nicht im Baustein upcrew-profil.js");
        wahr(lesen("js/upcrew-levelpfad.js").indexOf("gast-hinweis") === -1, "nicht im Baustein upcrew-levelpfad.js");
        wahr(/\.profil-gast-hinweis \{/.test(lesen("css/stil.css")), "Stil in css\\stil.css");
    });

    console.log(anzahlOk + " ok, " + anzahlFehler + " Fehler");
    process.exit(anzahlFehler === 0 ? 0 : 1);
})();
