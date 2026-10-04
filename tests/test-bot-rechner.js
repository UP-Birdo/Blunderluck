/*
 * test-bot-rechner.js — Bobs Zugsuche im Hintergrund (v0.165.0, js\bot-rechner.js).
 *
 * A  GLEICHHEIT: Das ECHTE js\wertung-rechner.js läuft in einem eigenen
 *    vm-Kontext (eigene Instanzen aller Regeln, `importScripts` lädt die
 *    echten Dateien) hinter einem nachgestellten Worker, der wie der Browser
 *    nur Kopien (`structuredClone`) hinüber- und zurückgibt. Über viele
 *    Stellungen (alle Spielarten, Stufen leicht/mittel, dazu schwer/meister
 *    auf vier Brettern) muss der Worker GENAU den Zug liefern, den
 *    `SCHACH_BOT.zugWaehlen` auf dem Haupt-Thread wählt.
 * B  RÜCKFALL: kein Worker, Worker lässt sich nicht anlegen, meldet einen
 *    Fehler, die Suche wirft dort, antwortet nicht in der Frist, Runde nicht
 *    übertragbar — immer derselbe Zug vom Haupt-Thread, der Worker wird
 *    beendet und nicht wieder benutzt; nie zwei Suchen zugleich.
 * C  AM BILDSCHIRM (bildschirm-umgebung.js, echtes team-schach.js): Bob zieht
 *    mit der Wahl aus dem Hintergrund; eine Antwort nach dem Verlassen
 *    (`_botAbbrechen`) oder nach einer Änderung der Partie wird verworfen;
 *    während der Suche stösst kein Zeichnen eine zweite an.
 *
 * Aufruf: siehe tests\README.md
 */

const pfad = require("path");
const fs = require("fs");
const vm = require("vm");

const jsOrdner = pfad.join(__dirname, "..", "js");
const lesen = (name) => fs.readFileSync(pfad.join(jsOrdner, name), "utf8");

globalThis.SCHACH_VARIANTEN = require(pfad.join(jsOrdner, "schach-varianten.js"));
globalThis.SCHACH = require(pfad.join(jsOrdner, "schach.js"));
globalThis.SCHACH_RUNDE = require(pfad.join(jsOrdner, "schach-runde.js"));
require(pfad.join(jsOrdner, "schach-runde-faehigkeiten.js"));
const SCHACH_BOT = require(pfad.join(jsOrdner, "schach-bot.js"));
const SCHACH = globalThis.SCHACH;
const SCHACH_RUNDE = globalThis.SCHACH_RUNDE;

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
        throw new Error((was || "Wert") + ": ist " + a + ", soll " + b);
    }
}
function wahr(bedingung, was) {
    if (!bedingung) {
        throw new Error((was || "Bedingung") + " nicht erfüllt");
    }
}
const ruhe = () => new Promise((fertig) => setImmediate(fertig));

/* ------------------------------------------------------------------ *
 * Der nachgestellte Worker mit dem ECHTEN wertung-rechner.js
 * ------------------------------------------------------------------ */

let workerGestartet = 0;
let suchenImWorker = 0;

function workerKontext() {
    const kontext = { console };
    kontext.self = kontext;
    kontext.importScripts = (...namen) => {
        for (const name of namen) {
            vm.runInContext(lesen(name), kontext, { filename: "worker/" + name });
        }
    };
    vm.createContext(kontext);
    vm.runInContext(lesen("wertung-rechner.js"), kontext, { filename: "worker/wertung-rechner.js" });
    return kontext;
}

class EchterWorker {
    constructor(adresse) {
        workerGestartet++;
        this.adresse = adresse;
        this.beendet = false;
        this.kontext = workerKontext();
        this.kontext.postMessage = (daten) => {
            const kopie = structuredClone(daten);
            setImmediate(() => {
                if (!this.beendet && this.onmessage) this.onmessage({ data: kopie });
            });
        };
    }
    postMessage(daten) {
        const kopie = structuredClone(daten);
        setImmediate(() => {
            if (this.beendet) return;
            if (kopie && kopie.art === "bot") suchenImWorker++;
            this.kontext.onmessage({ data: kopie });
        });
    }
    terminate() {
        this.beendet = true;
    }
}

/* BOT_RECHNER frisch in eigenem Kontext; `Worker` nach Wahl. */
function rechnerLaden(WorkerKlasse, wartenMs) {
    const kontext = {
        console: { error() {}, log: console.log },
        setTimeout, clearTimeout, SCHACH_BOT, structuredClone
    };
    if (WorkerKlasse) kontext.Worker = WorkerKlasse;
    vm.createContext(kontext);
    vm.runInContext(lesen("bot-rechner.js") + "\nglobalThis.BOT_RECHNER = BOT_RECHNER;", kontext, { filename: "bot-rechner.js" });
    if (wartenMs) kontext.BOT_RECHNER.WARTEN_MS = wartenMs;
    return kontext.BOT_RECHNER;
}

/* ------------------------------------------------------------------ *
 * Stellungen: Partien gegen Bob, Anna zieht nach fester Regel
 * ------------------------------------------------------------------ */

function botPartie(varianteId, stufeId, nr) {
    let runde = SCHACH_RUNDE.leereRunde(1000, varianteId, "p-gleich-" + varianteId + "-" + stufeId + "-" + nr, "Test");
    runde = SCHACH_RUNDE.teamBeitreten(runde, "id-anna", "weiss", 1000);
    runde = SCHACH_BOT.inRundeSetzen(runde, "schwarz", 1000);
    runde = SCHACH_RUNDE.aufstellungBereitSetzen(
        SCHACH_RUNDE.bereitSetzen(runde, "weiss", true, 1000), "weiss", true, 1000);
    runde = SCHACH_RUNDE.kopieren(runde);
    runde.regeln.botStufe = stufeId;
    return runde;
}

/* Liefert die Stellungen, in denen Bob am Zug ist (höchstens `anzahl`). */
function stellungen(varianteId, stufeId, anzahl, nr) {
    const liste = [];
    let runde = botPartie(varianteId, stufeId, nr);
    let t = 2000;
    for (let schritt = 0; liste.length < anzahl && schritt < anzahl * 3; schritt++) {
        const stand = SCHACH_RUNDE.normalisieren(runde);
        if (!stand.laeuft || stand.ergebnis) break;
        if (SCHACH_BOT.istAmZug(stand)) {
            liste.push(runde);
            const weiter = SCHACH_BOT.ziehen(runde, t += 10);
            if (!weiter) break;
            runde = weiter;
            continue;
        }
        const zuege = SCHACH.alleZuege(stand.stand);
        if (zuege.length === 0) break;
        const zug = zuege[(schritt * 7 + nr * 3) % zuege.length];
        const weiter = SCHACH_RUNDE.ziehen(runde, "id-anna", zug.von, zug.nach, zug.umwandlung || "D", "Anna", t += 10);
        if (!weiter) break;
        runde = weiter;
    }
    return liste;
}

(async () => {

    await pruefe("A: Der Worker (echtes wertung-rechner.js) wählt in jeder Stellung denselben Zug wie der Haupt-Thread", async () => {
        const rechner = rechnerLaden(EchterWorker);
        const faelle = [];
        let nr = 0;
        for (const variante of SCHACH_VARIANTEN.liste) {
            for (const stufe of ["leicht", "mittel"]) {
                faelle.push(...stellungen(variante.id, stufe, 6, ++nr));
            }
        }
        for (const varianteId of ["standard", "klein", "faehigkeiten", "zufallsarmee"]) {
            faelle.push(...stellungen(varianteId, "schwer", 4, ++nr));
            faelle.push(...stellungen(varianteId, "meister", 2, ++nr));
        }
        wahr(faelle.length >= 150, "genug Stellungen (" + faelle.length + ")");
        let mitBox = 0;
        for (const runde of faelle) {
            const haupt = SCHACH_BOT.zugWaehlen(runde);
            const hinten = await rechner.zugWaehlen(runde);
            wahr(haupt !== null, "Bob hat einen Zug");
            gleich(hinten, haupt, "Partie " + runde.id + " Zug " + runde.zugZaehler);
            if (SCHACH_RUNDE.normalisieren(runde).bonus.length > 0) mitBox++;
        }
        wahr(suchenImWorker >= faelle.length, "wirklich im Worker gerechnet (" + suchenImWorker + ")");
        wahr(mitBox > 0, "auch Stellungen mit Lootboxen dabei (" + mitBox + ")");
        gleich(workerGestartet, 1, "ein Worker für alle Suchen");
        gleich(rechner.rechnet(), false, "danach rechnet nichts mehr");
    });

    const probe = stellungen("standard", "schwer", 3, 99)[2];
    const soll = SCHACH_BOT.zugWaehlen(probe);

    await pruefe("B: ohne Worker rechnet der Haupt-Thread — derselbe Zug", async () => {
        const rechner = rechnerLaden(null);
        gleich(await rechner.zugWaehlen(probe), soll, "Zug");
        gleich(rechner._kaputt, true, "gemerkt: ohne Worker");
    });

    await pruefe("B: Worker lässt sich nicht anlegen → Haupt-Thread", async () => {
        const rechner = rechnerLaden(class { constructor() { throw new Error("CSP"); } });
        gleich(await rechner.zugWaehlen(probe), soll, "Zug");
        gleich(rechner._rechner, null, "kein Worker");
    });

    await pruefe("B: Worker meldet einen Fehler → Offenes rechnet der Haupt-Thread, danach ohne Worker", async () => {
        let beendet = 0;
        let angelegt = 0;
        class Stoerer {
            constructor() { angelegt++; }
            postMessage() { setImmediate(() => this.onerror({ message: "importScripts", preventDefault() {} })); }
            terminate() { beendet++; }
        }
        const rechner = rechnerLaden(Stoerer);
        gleich(await rechner.zugWaehlen(probe), soll, "Zug");
        gleich(beendet, 1, "Worker beendet");
        gleich(await rechner.zugWaehlen(probe), soll, "zweiter Zug");
        gleich(angelegt, 1, "kein neuer Worker");
    });

    await pruefe("B: Suche wirft im Worker → derselbe Zug vom Haupt-Thread", async () => {
        class Wirft {
            postMessage(d) { setImmediate(() => this.onmessage({ data: { nr: d.nr, art: "bot", fehler: true } })); }
            terminate() {}
        }
        const rechner = rechnerLaden(Wirft);
        gleich(await rechner.zugWaehlen(probe), soll, "Zug");
    });

    await pruefe("B: Worker antwortet nicht in der Frist → beendet, Haupt-Thread rechnet; eine späte Antwort zählt nicht", async () => {
        let beendet = 0;
        let spaet = null;
        class Haengt {
            postMessage(d) { spaet = d; }
            terminate() { beendet++; }
        }
        const rechner = rechnerLaden(Haengt, 30);
        const beginn = Date.now();
        gleich(await rechner.zugWaehlen(probe), soll, "Zug");
        wahr(Date.now() - beginn >= 25, "erst nach der Frist");
        gleich(beendet, 1, "Worker beendet — keine zweite Suche nebenher");
        /* die Antwort des beendeten Workers käme zu spät: nichts passiert */
        rechner._antwort({ nr: spaet.nr, art: "bot", wahl: { von: 0, nach: 1, umwandlung: "D" } });
        gleich(rechner.rechnet(), false, "nichts offen");
        gleich(await rechner.zugWaehlen(probe), soll, "danach ohne Worker");
    });

    /* Ein langsamer Worker, der wie der echte eine Nachricht nach der anderen abarbeitet:
       erst `beginnt`, dann nach `rechenMs` die echte Wahl. */
    function langsamerWorker(rechenMs, zaehler) {
        return class Langsam {
            constructor() { zaehler.angelegt++; this.schlange = []; this.beschaeftigt = false; this.beendet = false; }
            postMessage(d) { this.schlange.push(structuredClone(d)); this._weiter(); }
            _weiter() {
                if (this.beschaeftigt || this.beendet || this.schlange.length === 0) return;
                const d = this.schlange.shift();
                this.beschaeftigt = true;
                setImmediate(() => {
                    if (this.beendet) return;
                    this.onmessage({ data: { nr: d.nr, art: "bot", beginnt: true } });
                    setTimeout(() => {
                        if (this.beendet) return;
                        this.beschaeftigt = false;
                        this.onmessage({ data: { nr: d.nr, art: "bot", wahl: SCHACH_BOT.zugWaehlen(d.runde) } });
                        this._weiter();
                    }, rechenMs);
                });
            }
            terminate() { this.beendet = true; zaehler.beendet++; }
        };
    }

    await pruefe("v0.165.1 Fund 1: verwerfen beendet die laufende Suche ohne Rückfall; die nächste rechnet ein frischer Worker", async () => {
        const z = { angelegt: 0, beendet: 0 };
        const rechner = rechnerLaden(langsamerWorker(60, z), 90);
        wahr(typeof rechner.verwerfen === "function", "BOT_RECHNER.verwerfen gibt es");
        const erste = rechner.zugWaehlen(probe);
        await ruhe();
        rechner.verwerfen();
        gleich(await erste, null, "die verworfene Anfrage liefert null, wird nicht gerechnet");
        gleich([rechner._kaputt, rechner._rechner, rechner.rechnet()], [false, null, false], "nicht kaputt, kein Worker, nichts offen");
        gleich(await rechner.zugWaehlen(probe), soll, "die neue Anfrage: derselbe Zug");
        gleich([z.angelegt, z.beendet, rechner._kaputt], [2, 1, false], "frischer Worker, der alte beendet, kein Rückfall");
        rechner.verwerfen();
        gleich(rechner._kaputt, false, "verwerfen ohne laufende Suche schadet nicht");
    });

    await pruefe("v0.165.1 Fund 2: die Frist beginnt erst, wenn der Worker die Anfrage bearbeitet", async () => {
        const z = { angelegt: 0, beendet: 0 };
        const rechner = rechnerLaden(langsamerWorker(50, z), 80);
        /* zwei Anfragen in der Schlange: die zweite wartet 50 ms, rechnet 50 ms — zusammen über der Frist */
        const [a, b] = await Promise.all([rechner.zugWaehlen(probe), rechner.zugWaehlen(probe)]);
        gleich([a, b], [soll, soll], "Züge");
        gleich([z.beendet, rechner._kaputt], [0, false], "kein Rückfall wegen der Wartezeit");
        gleich(lesen("bot-rechner.js").indexOf("WARTEN_MS: 30000") !== -1, true, "Frist 30 s");
    });

    await pruefe("B: Runde nicht übertragbar → Haupt-Thread", async () => {
        class Klon {
            postMessage() { throw new Error("DataCloneError"); }
            terminate() {}
        }
        const rechner = rechnerLaden(Klon);
        gleich(await rechner.zugWaehlen(probe), soll, "Zug");
        gleich(rechner.rechnet(), false, "nichts offen");
    });

    await pruefe("B: zwei Anfragen hintereinander laufen im Worker nacheinander, jede bekommt ihren Zug", async () => {
        const rechner = rechnerLaden(EchterWorker);
        const zwei = stellungen("standard", "mittel", 4, 5).slice(2, 4);
        const [a, b] = await Promise.all(zwei.map((r) => rechner.zugWaehlen(r)));
        gleich([a, b], zwei.map((r) => SCHACH_BOT.zugWaehlen(r)), "Züge");
    });

    /* ------------------------------------------------------------------ *
     * C  Am Bildschirm
     * ------------------------------------------------------------------ */

    const U = require("./bildschirm-umgebung.js");
    const { netz, TEAM_SCHACH, SCHACH_TAFEL, bereitUndAufgestellt } = U;
    const B = U.SCHACH_BOT;
    const R = U.SCHACH_RUNDE;
    const BR = vm.runInContext("BOT_RECHNER", U.umgebung);

    /* Eine Partie, in der Bob (Schwarz) am Zug ist, als offene Partie der Tafel. */
    function amZug() {
        const angelegt = SCHACH_TAFEL.partieAnlegen(SCHACH_TAFEL.leereTafel(9900),
            U.SCHACH_VARIANTEN.liste[0].id, "Gegen Bob", 9910);
        let partie = R.teamBeitreten(angelegt.partie, "id-anna", "weiss", 9910);
        partie = B.inRundeSetzen(partie, "schwarz", 9910);
        partie = bereitUndAufgestellt(partie, "weiss", 9910);
        partie = R.ziehen(partie, "id-anna", U.SCHACH.feldNummer("e2"), U.SCHACH.feldNummer("e4"), "D", "Anna", 9920);
        TEAM_SCHACH.abgleich.daten = SCHACH_TAFEL.partieEinsetzen(angelegt.tafel, partie, 9920);
        TEAM_SCHACH.offeneId = partie.id;
        return partie;
    }
    const jetzt = (id) => SCHACH_TAFEL.partie(TEAM_SCHACH.abgleich.daten, id);

    /* Ein Rechner, dessen Antwort der Test selbst gibt. */
    function steuerbar() {
        const anfragen = [];
        const echt = BR.zugWaehlen;
        BR.zugWaehlen = (runde) => new Promise((fertig) => anfragen.push({ runde, fertig }));
        return { anfragen, zurueck() { BR.zugWaehlen = echt; } };
    }

    async function amBildschirm(name, ablauf) {
        const echteDaten = TEAM_SCHACH.abgleich.daten;
        const echteOffene = TEAM_SCHACH.offeneId;
        const vorherSofort = netz.sofort;
        const echtZeichnen = TEAM_SCHACH.zeichnen;
        const r = steuerbar();
        try {
            netz.sofort = true;
            TEAM_SCHACH._botAbbrechen();
            await pruefe(name, () => ablauf(r));
        } finally {
            r.zurueck();
            TEAM_SCHACH.zeichnen = echtZeichnen;
            netz.sofort = vorherSofort;
            TEAM_SCHACH._botAbbrechen();
            TEAM_SCHACH.abgleich.daten = echteDaten;
            TEAM_SCHACH.offeneId = echteOffene;
        }
    }
    const anna = { id: "id-anna", name: "Anna" };

    await amBildschirm("C: Bob zieht mit der Wahl aus dem Hintergrund; währenddessen keine zweite Suche", async (r) => {
        const partie = amZug();
        TEAM_SCHACH._botAnstossen(partie, anna);
        await ruhe();
        gleich(r.anfragen.length, 1, "eine Suche angestossen");
        gleich(TEAM_SCHACH.botWartet, true, "Bob gilt als beschäftigt");
        /* die Abfrage zeichnet weiter: kein zweites Anstossen */
        TEAM_SCHACH._botAnstossen(jetzt(partie.id), anna);
        TEAM_SCHACH._botAnstossen(jetzt(partie.id), anna);
        await ruhe();
        gleich(r.anfragen.length, 1, "nie zwei Suchen zugleich");
        gleich(jetzt(partie.id).zugZaehler, partie.zugZaehler, "noch kein Zug");
        r.anfragen[0].fertig(B.zugWaehlen(r.anfragen[0].runde));
        for (let i = 0; i < 10; i++) await ruhe();
        gleich(jetzt(partie.id).zugZaehler, partie.zugZaehler + 1, "Bob hat gezogen");
        const erwartet = B.ziehen(partie, 1);
        gleich(jetzt(partie.id).stand.brett, erwartet.stand.brett, "genau der Zug, den der Haupt-Thread gewählt hätte");
        gleich(TEAM_SCHACH.botWartet, false, "frei für den nächsten Zug");
    });

    await amBildschirm("C: Antwort nach dem Verlassen der Partie wird verworfen", async (r) => {
        const partie = amZug();
        TEAM_SCHACH._botAnstossen(partie, anna);
        await ruhe();
        gleich(r.anfragen.length, 1, "Suche läuft");
        TEAM_SCHACH._botAbbrechen();
        r.anfragen[0].fertig(B.zugWaehlen(r.anfragen[0].runde));
        for (let i = 0; i < 10; i++) await ruhe();
        gleich(jetzt(partie.id).zugZaehler, partie.zugZaehler, "kein Zug in die verlassene Partie");
    });

    await amBildschirm("v0.165.1 C: _botAbbrechen verwirft eine laufende Hintergrund-Suche (und nur dann)", async () => {
        const echtRechnet = BR.rechnet;
        const echtVerwerfen = BR.verwerfen;
        let verworfen = 0;
        try {
            BR.verwerfen = () => { verworfen++; };
            BR.rechnet = () => false;
            TEAM_SCHACH._botAbbrechen();
            gleich(verworfen, 0, "ohne laufende Suche nichts");
            BR.rechnet = () => true;
            TEAM_SCHACH._botAbbrechen();
            gleich(verworfen, 1, "laufende Suche verworfen");
        } finally {
            BR.rechnet = echtRechnet;
            BR.verwerfen = echtVerwerfen;
        }
    });

    await amBildschirm("C: Antwort nach Neubeginn (neue Suche läuft) — nur die neue zählt", async (r) => {
        const alt = amZug();
        TEAM_SCHACH._botAnstossen(alt, anna);
        await ruhe();
        TEAM_SCHACH._botAbbrechen();
        const neu = amZug();
        TEAM_SCHACH._botAnstossen(neu, anna);
        await ruhe();
        gleich(r.anfragen.length, 2, "zweite Suche für die neue Partie");
        r.anfragen[0].fertig(B.zugWaehlen(r.anfragen[0].runde));
        for (let i = 0; i < 10; i++) await ruhe();
        gleich(jetzt(neu.id).zugZaehler, neu.zugZaehler, "die alte Antwort zieht nicht");
        gleich(TEAM_SCHACH.botWartet, true, "die neue Suche läuft weiter");
        r.anfragen[1].fertig(B.zugWaehlen(r.anfragen[1].runde));
        for (let i = 0; i < 10; i++) await ruhe();
        gleich(jetzt(neu.id).zugZaehler, neu.zugZaehler + 1, "die neue zieht");
    });

    await amBildschirm("C: Partie inzwischen beendet oder verändert → verworfen, neu gezeichnet", async (r) => {
        let gezeichnet = 0;
        TEAM_SCHACH.zeichnen = () => { gezeichnet++; };
        const partie = amZug();
        TEAM_SCHACH._botAnstossen(partie, anna);
        await ruhe();
        /* Anna gibt auf, während Bob rechnet */
        const aufgegeben = R.aufgeben(partie, "weiss", 9930);
        wahr(!!aufgegeben, "aufgeben möglich");
        TEAM_SCHACH.abgleich.daten = SCHACH_TAFEL.partieEinsetzen(TEAM_SCHACH.abgleich.daten, aufgegeben, 9930);
        r.anfragen[0].fertig(B.zugWaehlen(r.anfragen[0].runde));
        for (let i = 0; i < 10; i++) await ruhe();
        gleich(jetzt(partie.id).zugZaehler, aufgegeben.zugZaehler, "kein Zug in die beendete Partie");
        gleich(gezeichnet, 1, "neu gezeichnet");
        gleich(TEAM_SCHACH.botWartet, false, "Bob wieder frei");
    });

    await amBildschirm("C: Ohne js\\bot-rechner.js (nicht geladen) rechnet botZiehen wie bisher selbst", async () => {
        const quelle = fs.readFileSync(pfad.join(jsOrdner, "team-schach.js"), "utf8");
        wahr(/typeof BOT_RECHNER !== "undefined"\)\s*\?\s*await BOT_RECHNER\.zugWaehlen\(partie\)\s*:\s*SCHACH_BOT\.zugWaehlen\(partie\)/.test(quelle),
            "Rückfall im Code");
    });

    await pruefe("Einbindung: index.html lädt bot-rechner.js nach schach-bot.js, sw.js hält sie vor, CSP unverändert (worker-src 'self')", async () => {
        const seite = fs.readFileSync(pfad.join(__dirname, "..", "index.html"), "utf8");
        const sw = fs.readFileSync(pfad.join(__dirname, "..", "sw.js"), "utf8");
        const bot = seite.indexOf("<script src=\"js/schach-bot.js\"></script>");
        const rechner = seite.indexOf("<script src=\"js/bot-rechner.js\"></script>");
        wahr(bot > 0 && rechner > bot, "Reihenfolge");
        wahr(sw.indexOf("\"./js/bot-rechner.js\"") !== -1 && sw.indexOf("\"./js/wertung-rechner.js\"") !== -1, "sw.js");
        const csp = /Content-Security-Policy" content="([^"]+)"/.exec(seite)[1];
        wahr(/worker-src 'self';/.test(csp) && !/unsafe-eval/.test(csp) && /script-src 'self' 'sha256-[^']+' 'sha256-[^']+';/.test(csp),
            "Worker nur von der eigenen Herkunft, nichts aufgeweicht");
        gleich(lesen("bot-rechner.js").indexOf("js/wertung-rechner.js") !== -1, true, "derselbe Rechner wie die Wertung");
        wahr(!/Math\.random/.test(lesen("bot-rechner.js")), "kein Zufall");
    });

    console.log(anzahlOk + " ok, " + anzahlFehler + " Fehler");
    process.exit(anzahlFehler === 0 ? 0 : 1);
})();
