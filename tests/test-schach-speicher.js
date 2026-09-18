/*
 * test-schach-speicher.js — Regressionstests des Teil-Ladens und
 * Teil-Schreibens (js\schach-speicher.js, seit v0.114.3).
 *
 * Geladen werden die ECHTEN Dateien; die Datenbank ist ein Nachbau, der
 * jeden Aufruf mitschreibt. Geprueft wird vor allem, WAS geholt wird —
 * denn genau daran haengt die Ersparnis: fremde beendete Partien nie,
 * eigene beendete einmal, offene nur bei neuer Marke. Ein Test, der nur
 * „es kommt eine Tafel heraus" prueft, waere hier wertlos.
 *
 * DAS FAZIT steht am Ende von `alleMitWarten()` — die Pruefungen sind
 * asynchron, und eine Pruefung hinter `process.exit` liefe nie.
 *
 * Aufruf: siehe tests\README.md
 */

const pfad = require("path");

globalThis.SCHACH_VARIANTEN = require(pfad.join(__dirname, "..", "js", "schach-varianten.js"));
globalThis.SCHACH = require(pfad.join(__dirname, "..", "js", "schach.js"));
globalThis.SCHACH_RUNDE = require(pfad.join(__dirname, "..", "js", "schach-runde.js"));
require(pfad.join(__dirname, "..", "js", "schach-runde-faehigkeiten.js"));
globalThis.SCHACH_TAFEL = require(pfad.join(__dirname, "..", "js", "schach-tafel.js"));

/* Der Geraetespeicher — ein Nachbau, damit der Vorrat pruefbar ist. */
const geraet = {};
globalThis.window = {
    localStorage: {
        getItem(schluessel) { return Object.prototype.hasOwnProperty.call(geraet, schluessel) ? geraet[schluessel] : null; },
        setItem(schluessel, wert) { geraet[schluessel] = String(wert); },
        removeItem(schluessel) { delete geraet[schluessel]; }
    }
};

const SCHACH_SPEICHER = require(pfad.join(__dirname, "..", "js", "schach-speicher.js"));

const SCHACH_RUNDE = globalThis.SCHACH_RUNDE;
const SCHACH_TAFEL = globalThis.SCHACH_TAFEL;
const SCHACH_VARIANTEN = globalThis.SCHACH_VARIANTEN;

let anzahlOk = 0;
let anzahlFehler = 0;

async function pruefeMitWarten(bezeichnung, funktion) {
    try {
        await funktion();
        anzahlOk++;
    } catch (fehler) {
        anzahlFehler++;
        console.error("FEHLER: " + bezeichnung);
        console.error("        " + fehler.message);
    }
}

function wahr(bedingung, meldung) {
    if (!bedingung) {
        throw new Error(meldung);
    }
}

/* ------------------------------------------------------------------ *
 * Der Datenbank-Nachbau: ein Baum, jeder Aufruf wird mitgeschrieben
 * ------------------------------------------------------------------ */

function nachbau(baum) {
    const speicher = {
        art: "gemeinsam",
        baum: JSON.parse(JSON.stringify(baum)),
        protokoll: [],

        async teilLaden(unterpfad, flach) {
            speicher.protokoll.push({ art: "laden", pfad: unterpfad, flach: !!flach });
            let knoten = speicher.baum;
            for (const teil of String(unterpfad || "").split("/").filter((t) => t)) {
                if (!knoten || typeof knoten !== "object") {
                    return null;
                }
                knoten = knoten[teil];
            }
            if (knoten === undefined) {
                return null;
            }
            if (flach && knoten && typeof knoten === "object") {
                const schluessel = {};
                Object.keys(knoten).forEach((k) => { schluessel[k] = true; });
                return schluessel;
            }
            return JSON.parse(JSON.stringify(knoten));
        },

        async teilSchreiben(aenderungen) {
            speicher.protokoll.push({ art: "schreiben", aenderungen: JSON.parse(JSON.stringify(aenderungen)) });
            for (const weg of Object.keys(aenderungen)) {
                const teile = weg.split("/");
                let knoten = speicher.baum;
                for (let i = 0; i < teile.length - 1; i++) {
                    if (!knoten[teile[i]] || typeof knoten[teile[i]] !== "object") {
                        knoten[teile[i]] = {};
                    }
                    knoten = knoten[teile[i]];
                }
                const letzte = teile[teile.length - 1];
                if (aenderungen[weg] === null) {
                    delete knoten[letzte];
                } else {
                    knoten[letzte] = JSON.parse(JSON.stringify(aenderungen[weg]));
                }
            }
        },

        geladenePartien() {
            return speicher.protokoll
                .filter((e) => e.art === "laden" && /^partien\/.+/.test(e.pfad))
                .map((e) => e.pfad.replace("partien/", ""));
        },
        ladeAufrufe() {
            return speicher.protokoll.filter((e) => e.art === "laden").length;
        },
        schreibAufrufe() {
            return speicher.protokoll.filter((e) => e.art === "schreiben");
        },
        vergessen() {
            speicher.protokoll = [];
        }
    };
    return speicher;
}

/* Eine Partie mit Teams, wahlweise laufend oder beendet. */
function partieBauen(id, weiss, schwarz, zeitpunkt, ergebnis) {
    let partie = SCHACH_RUNDE.leereRunde(zeitpunkt, SCHACH_VARIANTEN.liste[0].id, id, "Test " + id);
    if (weiss) {
        partie = SCHACH_RUNDE.teamBeitreten(partie, weiss, "weiss", zeitpunkt);
    }
    if (schwarz) {
        partie = SCHACH_RUNDE.teamBeitreten(partie, schwarz, "schwarz", zeitpunkt);
    }
    if (ergebnis) {
        partie = SCHACH_RUNDE.kopieren(partie);
        partie.laeuft = false;
        partie.ergebnis = ergebnis;
    }
    return partie;
}

/* Ein Server-Baum aus Partien — mit Uebersicht und Chronik, wie ihn die
   App ab v0.114.3 hinterlaesst. */
function baumBauen(partien, marken) {
    const baum = { datenVersion: 1, geaendertAm: 5000, partien: {}, chronik: [], uebersicht: {} };
    for (const partie of partien) {
        baum.partien[partie.id] = partie;
        baum.uebersicht[partie.id] = SCHACH_TAFEL.uebersichtEintrag(partie, marken[partie.id]);
        if (partie.ergebnis) {
            baum.chronik.push(SCHACH_TAFEL._chronikEintrag(partie));
        }
    }
    return baum;
}

async function alleMitWarten() {

    /* -------------------------------------------------------------- *
     * Laden
     * -------------------------------------------------------------- */

    await pruefeMitWarten("tafelLaden holt offene und eigene beendete Partien, fremde beendete nie", async () => {
        SCHACH_SPEICHER.vergessen();
        const offen = partieBauen("p-offen", "id-anna", "id-bert", 1000);
        const eigeneBeendete = partieBauen("p-eigene", "id-anna", "id-bert", 1100, "weiss");
        const fremdeBeendete = partieBauen("p-fremde", "id-bert", "bot", 1200, "schwarz");
        const server = nachbau(baumBauen([offen, eigeneBeendete, fremdeBeendete],
            { "p-offen": 2000, "p-eigene": 2100, "p-fremde": 2200 }));

        const tafel = await SCHACH_SPEICHER.tafelLaden(server, "id-anna", SCHACH_TAFEL.leereTafel());

        const geholt = server.geladenePartien().sort();
        wahr(geholt.join(",") === "p-eigene,p-offen",
            "geholt wurden " + geholt.join(",") + " — erwartet p-eigene,p-offen");
        wahr(!!tafel.partien["p-offen"] && !!tafel.partien["p-eigene"], "die geholten fehlen in der Tafel");
        wahr(!tafel.partien["p-fremde"], "die fremde beendete Partie steht in der Tafel");
        wahr(tafel.chronik.length === 2, "die Chronik kam nicht mit (" + tafel.chronik.length + ")");
        wahr(server.schreibAufrufe().length === 0, "beim Laden wurde geschrieben");
    });

    await pruefeMitWarten("Ein zweiter Blick ohne Aenderung holt keine einzige Partie", async () => {
        SCHACH_SPEICHER.vergessen();
        const offen = partieBauen("p-offen", "id-anna", "id-bert", 1000);
        const eigene = partieBauen("p-eigene", "id-anna", "id-bert", 1100, "weiss");
        const server = nachbau(baumBauen([offen, eigene], { "p-offen": 2000, "p-eigene": 2100 }));

        const erste = await SCHACH_SPEICHER.tafelLaden(server, "id-anna", SCHACH_TAFEL.leereTafel());
        server.vergessen();
        const zweite = await SCHACH_SPEICHER.tafelLaden(server, "id-anna", erste);

        wahr(server.geladenePartien().length === 0,
            "beim zweiten Blick wurden Partien geholt: " + server.geladenePartien().join(","));
        wahr(server.ladeAufrufe() === 3,
            "der zweite Blick braucht genau drei kleine Abfragen, nicht " + server.ladeAufrufe());
        wahr(!!zweite.partien["p-offen"] && !!zweite.partien["p-eigene"], "die Tafel hat Partien verloren");
    });

    await pruefeMitWarten("Aendert sich die Marke einer offenen Partie, wird nur sie geholt", async () => {
        SCHACH_SPEICHER.vergessen();
        const a = partieBauen("p-a", "id-anna", "id-bert", 1000);
        const b = partieBauen("p-b", "id-anna", "id-bert", 1000);
        const server = nachbau(baumBauen([a, b], { "p-a": 2000, "p-b": 2000 }));

        const erste = await SCHACH_SPEICHER.tafelLaden(server, "id-anna", SCHACH_TAFEL.leereTafel());
        server.vergessen();

        /* Jemand hat in p-a gezogen: Partie und Uebersicht sind neuer. */
        const gezogen = SCHACH_RUNDE.kopieren(server.baum.partien["p-a"]);
        gezogen.zugZaehler = 7;
        server.baum.partien["p-a"] = gezogen;
        server.baum.uebersicht["p-a"].geaendertAm = 2500;

        const zweite = await SCHACH_SPEICHER.tafelLaden(server, "id-anna", erste);
        wahr(server.geladenePartien().join(",") === "p-a",
            "geholt: " + server.geladenePartien().join(",") + " — erwartet nur p-a");
        wahr(zweite.partien["p-a"].zugZaehler === 7, "der neue Stand von p-a kam nicht an");
    });

    await pruefeMitWarten("Eine eigene beendete Partie kommt beim naechsten Start aus dem Vorrat", async () => {
        SCHACH_SPEICHER.vergessen();
        const eigene = partieBauen("p-eigene", "id-anna", "id-bert", 1100, "weiss");
        const server = nachbau(baumBauen([eigene], { "p-eigene": 2100 }));

        await SCHACH_SPEICHER.tafelLaden(server, "id-anna", SCHACH_TAFEL.leereTafel());
        wahr(server.geladenePartien().join(",") === "p-eigene", "beim ersten Start nicht geholt");

        /* Neue Sitzung: das Gemerkte im Speicher bleibt, das Fluechtige nicht. */
        SCHACH_SPEICHER._gesehen = {};
        SCHACH_SPEICHER._chronikAnzahlGesehen = null;
        server.vergessen();

        const tafel = await SCHACH_SPEICHER.tafelLaden(server, "id-anna", SCHACH_TAFEL.leereTafel());
        wahr(server.geladenePartien().length === 0,
            "die beendete Partie wurde trotz Vorrat erneut geholt");
        wahr(!!tafel.partien["p-eigene"] && tafel.partien["p-eigene"].ergebnis === "weiss",
            "die Partie aus dem Vorrat fehlt in der Tafel");

        /* Revanche: dieselbe Kennung, neue Marke — dann muss sie neu kommen. */
        const revanche = SCHACH_RUNDE.neuePartie(server.baum.partien["p-eigene"], 3000);
        server.baum.partien["p-eigene"] = revanche;
        server.baum.uebersicht["p-eigene"] = SCHACH_TAFEL.uebersichtEintrag(revanche, 3000);
        server.vergessen();

        const nachRevanche = await SCHACH_SPEICHER.tafelLaden(server, "id-anna", tafel);
        wahr(server.geladenePartien().join(",") === "p-eigene", "nach der Revanche nicht neu geholt");
        wahr(nachRevanche.partien["p-eigene"].ergebnis === "", "der Vorrat hat die Revanche ueberdeckt");
    });

    await pruefeMitWarten("Ohne Person werden keine beendeten Partien geholt", async () => {
        SCHACH_SPEICHER.vergessen();
        const offen = partieBauen("p-offen", "id-anna", "", 1000);
        const eigene = partieBauen("p-eigene", "id-anna", "id-bert", 1100, "weiss");
        const server = nachbau(baumBauen([offen, eigene], { "p-offen": 2000, "p-eigene": 2100 }));

        const tafel = await SCHACH_SPEICHER.tafelLaden(server, "", SCHACH_TAFEL.leereTafel());
        wahr(server.geladenePartien().join(",") === "p-offen",
            "geholt: " + server.geladenePartien().join(","));
        wahr(!tafel.partien["p-eigene"], "eine beendete Partie kam ohne Person mit");
    });

    await pruefeMitWarten("Altbestand ohne Uebersichts-Eintrag wird geholt und der Eintrag nachgetragen", async () => {
        SCHACH_SPEICHER.vergessen();
        const alt = partieBauen("p-alt", "id-bert", "bot", 900, "schwarz");
        const baum = baumBauen([alt], { "p-alt": 1900 });
        delete baum.uebersicht["p-alt"];
        const server = nachbau(baum);

        await SCHACH_SPEICHER.tafelLaden(server, "id-anna", SCHACH_TAFEL.leereTafel());
        wahr(server.geladenePartien().join(",") === "p-alt", "der Altbestand wurde nicht geholt");

        /* Das Nachtragen laeuft im Hintergrund — einmal warten. */
        await new Promise((weiter) => setTimeout(weiter, 0));
        const schreibungen = server.schreibAufrufe();
        wahr(schreibungen.length === 1, "es wurde " + schreibungen.length + "-mal geschrieben statt einmal");
        const aenderungen = schreibungen[0].aenderungen;
        wahr(Object.keys(aenderungen).join(",") === "uebersicht/p-alt",
            "nachgetragen wurde " + Object.keys(aenderungen).join(",") + " — erwartet nur der Eintrag");
        wahr(aenderungen["uebersicht/p-alt"].ergebnis === "schwarz", "der Eintrag traegt nicht das Ergebnis");
        wahr(aenderungen.geaendertAm === undefined, "das Nachtragen darf die Marke nicht anfassen");

        /* Beim naechsten Blick ist sie fremd und beendet — und wird nicht mehr geholt. */
        server.vergessen();
        await SCHACH_SPEICHER.tafelLaden(server, "id-anna", SCHACH_TAFEL.leereTafel());
        wahr(server.geladenePartien().length === 0, "mit Eintrag wurde die fremde beendete erneut geholt");
    });

    await pruefeMitWarten("Mehr eigene beendete als der Vorrat fasst: nur die juengsten", async () => {
        SCHACH_SPEICHER.vergessen();
        const grenzeVorher = SCHACH_SPEICHER.VORRAT_HOECHSTENS;
        SCHACH_SPEICHER.VORRAT_HOECHSTENS = 1;
        try {
            const aeltere = partieBauen("p-alt", "id-anna", "id-bert", 1000, "weiss");
            const juengere = partieBauen("p-neu", "id-anna", "id-bert", 1500, "schwarz");
            const server = nachbau(baumBauen([aeltere, juengere], { "p-alt": 2000, "p-neu": 2500 }));

            const tafel = await SCHACH_SPEICHER.tafelLaden(server, "id-anna", SCHACH_TAFEL.leereTafel());
            wahr(server.geladenePartien().join(",") === "p-neu",
                "geholt: " + server.geladenePartien().join(",") + " — erwartet nur die juengste");
            wahr(!!tafel.partien["p-neu"] && !tafel.partien["p-alt"], "die Tafel enthaelt die falsche");
        } finally {
            SCHACH_SPEICHER.VORRAT_HOECHSTENS = grenzeVorher;
        }
    });

    await pruefeMitWarten("Die Chronik wird nur bei geaenderter Anzahl erneut geholt", async () => {
        SCHACH_SPEICHER.vergessen();
        const eine = partieBauen("p-1", "id-bert", "bot", 1000, "weiss");
        const server = nachbau(baumBauen([eine], { "p-1": 2000 }));

        const erste = await SCHACH_SPEICHER.tafelLaden(server, "id-anna", SCHACH_TAFEL.leereTafel());
        server.vergessen();
        await SCHACH_SPEICHER.tafelLaden(server, "id-anna", erste);
        const chronikVoll = server.protokoll.filter((e) => e.art === "laden" && e.pfad === "chronik" && !e.flach);
        wahr(chronikVoll.length === 0, "die unveraenderte Chronik wurde erneut geholt");

        /* Ein weiterer Eintrag am Server: jetzt muss sie kommen. */
        const zweite = partieBauen("p-2", "id-bert", "bot", 1100, "remis");
        server.baum.chronik.push(SCHACH_TAFEL._chronikEintrag(zweite));
        server.vergessen();
        const tafel = await SCHACH_SPEICHER.tafelLaden(server, "id-anna", erste);
        wahr(tafel.chronik.length === 2, "der neue Chronik-Eintrag kam nicht an");
    });

    /* -------------------------------------------------------------- *
     * Die offene Partie auffrischen
     * -------------------------------------------------------------- */

    await pruefeMitWarten("partieAuffrischen holt die Partie nur bei neuer Marke", async () => {
        SCHACH_SPEICHER.vergessen();
        const a = partieBauen("p-a", "id-anna", "id-bert", 1000);
        const server = nachbau(baumBauen([a], { "p-a": 2000 }));
        const tafel = await SCHACH_SPEICHER.tafelLaden(server, "id-anna", SCHACH_TAFEL.leereTafel());
        server.vergessen();

        const gleich = await SCHACH_SPEICHER.partieAuffrischen(server, tafel, "p-a");
        wahr(server.ladeAufrufe() === 1 && server.geladenePartien().length === 0,
            "ohne Aenderung wurde mehr als der Eintrag geholt");
        wahr(gleich === SCHACH_TAFEL.normalisieren(gleich) || !!gleich.partien["p-a"], "keine Tafel zurueck");

        const gezogen = SCHACH_RUNDE.kopieren(server.baum.partien["p-a"]);
        gezogen.zugZaehler = 3;
        server.baum.partien["p-a"] = gezogen;
        server.baum.uebersicht["p-a"].geaendertAm = 2600;
        server.vergessen();

        const neu = await SCHACH_SPEICHER.partieAuffrischen(server, tafel, "p-a");
        wahr(server.geladenePartien().join(",") === "p-a", "bei neuer Marke wurde die Partie nicht geholt");
        wahr(neu.partien["p-a"].zugZaehler === 3, "der neue Stand fehlt");

        /* Verschwunden: dann auch hier weg. */
        delete server.baum.partien["p-a"];
        delete server.baum.uebersicht["p-a"];
        const weg = await SCHACH_SPEICHER.partieAuffrischen(server, neu, "p-a");
        wahr(!weg.partien["p-a"], "die geloeschte Partie blieb in der Tafel");
    });

    /* -------------------------------------------------------------- *
     * Schreiben
     * -------------------------------------------------------------- */

    await pruefeMitWarten("schreiben setzt nur Partie, Eintrag und Marke — nichts sonst", async () => {
        SCHACH_SPEICHER.vergessen();
        const a = partieBauen("p-a", "id-anna", "id-bert", 1000);
        const b = partieBauen("p-b", "id-anna", "id-bert", 1000);
        const server = nachbau(baumBauen([a, b], { "p-a": 2000, "p-b": 2000 }));
        let tafel = await SCHACH_SPEICHER.tafelLaden(server, "id-anna", SCHACH_TAFEL.leereTafel());
        server.vergessen();

        const gezogen = SCHACH_RUNDE.kopieren(tafel.partien["p-a"]);
        gezogen.zugZaehler = 4;
        tafel = SCHACH_TAFEL.partieEinsetzen(tafel, gezogen, 7000);

        await SCHACH_SPEICHER.schreiben(server, tafel, ["p-a"]);

        const schreibungen = server.schreibAufrufe();
        wahr(schreibungen.length === 1, "es wurde " + schreibungen.length + "-mal geschrieben");
        const wege = Object.keys(schreibungen[0].aenderungen).sort();
        wahr(wege.join(",") === "geaendertAm,partien/p-a,uebersicht/p-a",
            "geschrieben wurden " + wege.join(","));
        wahr(schreibungen[0].aenderungen.geaendertAm === 7000, "die Marke ist nicht die der Tafel");
        wahr(schreibungen[0].aenderungen["uebersicht/p-a"].geaendertAm === 7000,
            "der Eintrag traegt nicht die Marke");
        wahr(server.baum.partien["p-a"].zugZaehler === 4, "die Partie kam nicht an");
        wahr(server.baum.partien["p-b"].zugZaehler === 0 && !!server.baum.uebersicht["p-b"],
            "die andere Partie wurde angefasst");
        wahr(server.ladeAufrufe() === 0, "eine offene Partie zu schreiben braucht keinen Ladevorgang");
        wahr(SCHACH_SPEICHER._gesehen["p-a"] === 7000, "die eigene Marke gilt danach nicht als gesehen");
    });

    await pruefeMitWarten("Eine entfernte Partie wird als null geschrieben — samt Eintrag", async () => {
        SCHACH_SPEICHER.vergessen();
        const a = partieBauen("p-a", "id-anna", "", 1000);
        const server = nachbau(baumBauen([a], { "p-a": 2000 }));
        let tafel = await SCHACH_SPEICHER.tafelLaden(server, "id-anna", SCHACH_TAFEL.leereTafel());
        server.vergessen();

        tafel = SCHACH_TAFEL.partieEntfernen(tafel, "p-a", 7100);
        await SCHACH_SPEICHER.schreiben(server, tafel, ["p-a"]);

        const aenderungen = server.schreibAufrufe()[0].aenderungen;
        wahr(aenderungen["partien/p-a"] === null && aenderungen["uebersicht/p-a"] === null,
            "Partie oder Eintrag wurden nicht geloescht");
        wahr(!server.baum.partien["p-a"] && !server.baum.uebersicht["p-a"], "am Server blieb etwas stehen");
        wahr(SCHACH_SPEICHER._gesehen["p-a"] === undefined, "die Marke der geloeschten Partie blieb gemerkt");
    });

    await pruefeMitWarten("Eine eben beendete Partie bekommt ihren Chronik-Eintrag ans Ende — genau einmal", async () => {
        SCHACH_SPEICHER.vergessen();
        const fertig = partieBauen("p-fertig", "id-bert", "bot", 900, "weiss");
        const laufend = partieBauen("p-a", "id-anna", "id-bert", 1000);
        const server = nachbau(baumBauen([fertig, laufend], { "p-fertig": 1900, "p-a": 2000 }));
        let tafel = await SCHACH_SPEICHER.tafelLaden(server, "id-anna", SCHACH_TAFEL.leereTafel());
        server.vergessen();

        const beendet = SCHACH_RUNDE.kopieren(tafel.partien["p-a"]);
        beendet.laeuft = false;
        beendet.ergebnis = "schwarz";
        tafel = SCHACH_TAFEL.partieEinsetzen(tafel, beendet, 7200);

        await SCHACH_SPEICHER.schreiben(server, tafel, ["p-a"]);

        const aenderungen = server.schreibAufrufe()[0].aenderungen;
        wahr(aenderungen["chronik/1"] && aenderungen["chronik/1"].id === "p-a",
            "der Chronik-Eintrag steht nicht an Stelle 1: " + Object.keys(aenderungen).join(","));
        wahr(server.baum.chronik.length === 2 && server.baum.chronik[1].id === "p-a",
            "die Chronik am Server hat nicht zwei Eintraege");

        /* Noch einmal schreiben (etwa eine Nachkontrolle): kein zweiter Eintrag. */
        server.vergessen();
        await SCHACH_SPEICHER.schreiben(server, tafel, ["p-a"]);
        const erneut = server.schreibAufrufe()[0].aenderungen;
        wahr(!Object.keys(erneut).some((weg) => weg.indexOf("chronik/") === 0),
            "beim zweiten Schreiben kam ein zweiter Chronik-Eintrag");
        wahr(server.baum.chronik.length === 2, "die Chronik ist gewachsen");
    });

    await pruefeMitWarten("Eine Chronik mit Luecke (Objekt statt Feld) bekommt die naechste freie Nummer", async () => {
        SCHACH_SPEICHER.vergessen();
        const laufend = partieBauen("p-a", "id-anna", "id-bert", 1000);
        const baum = baumBauen([laufend], { "p-a": 2000 });
        baum.chronik = { "0": { id: "p-x", ergebnis: "weiss" }, "5": { id: "p-y", ergebnis: "remis" } };
        const server = nachbau(baum);
        let tafel = SCHACH_TAFEL.normalisieren({ partien: { "p-a": laufend } });
        SCHACH_SPEICHER._gesehen["p-a"] = 2000;

        const beendet = SCHACH_RUNDE.kopieren(tafel.partien["p-a"]);
        beendet.laeuft = false;
        beendet.ergebnis = "weiss";
        tafel = SCHACH_TAFEL.partieEinsetzen(tafel, beendet, 7300);

        await SCHACH_SPEICHER.schreiben(server, tafel, ["p-a"]);
        const aenderungen = server.schreibAufrufe()[0].aenderungen;
        wahr(!!aenderungen["chronik/6"], "erwartet Stelle 6, geschrieben: " + Object.keys(aenderungen).join(","));
    });

    await pruefeMitWarten("Mehrere Partien in einem Schritt: neue rein, alte raus", async () => {
        SCHACH_SPEICHER.vergessen();
        const alt = partieBauen("p-alt", "id-anna", "", 1000);
        const server = nachbau(baumBauen([alt], { "p-alt": 2000 }));
        let tafel = await SCHACH_SPEICHER.tafelLaden(server, "id-anna", SCHACH_TAFEL.leereTafel());
        server.vergessen();

        tafel = SCHACH_TAFEL.partieEntfernen(tafel, "p-alt", 7400);
        const neu = partieBauen("p-neu", "id-anna", "", 7400);
        tafel = SCHACH_TAFEL.partieEinsetzen(tafel, neu, 7400);

        await SCHACH_SPEICHER.schreiben(server, tafel, ["p-neu", "p-alt"]);
        wahr(server.schreibAufrufe().length === 1, "zwei Partien brauchten zwei Schreibvorgaenge");
        wahr(!!server.baum.partien["p-neu"] && !server.baum.partien["p-alt"], "am Server stimmt der Bestand nicht");
        wahr(!!server.baum.uebersicht["p-neu"] && !server.baum.uebersicht["p-alt"], "die Uebersicht stimmt nicht");
    });

    console.log(anzahlOk + " ok, " + anzahlFehler + " Fehler");
    process.exit(anzahlFehler === 0 ? 0 : 1);
}

alleMitWarten();
