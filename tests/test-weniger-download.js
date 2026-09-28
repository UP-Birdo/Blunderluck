/*
 * test-weniger-download.js — v0.152.5: weniger Datenbank-Download und
 * Aufräumen beendeter Partien (Nutzer-Auftrag 28.09.2026).
 *
 * Geprüft wird an den ECHTEN Dateien gegen einen nachgebauten Server, der
 * jeden Aufruf mitschreibt:
 *
 *   1. fremde laufende Partien werden nicht mehr geholt — eigene, wartende,
 *      eingeladene, Einträge älterer Fassungen und alle für die Verwaltung
 *      schon; der Code-Beitritt findet ihre Kennung trotzdem;
 *   2. die Chronik kommt stückweise (nur neue Nummern), beim Schreiben
 *      ebenso, und ein Ergebnis zählt trotzdem nie doppelt;
 *   3. der Vorrat behält eigene Partien, die der Server gelöscht hat;
 *   4. das Aufräumen hält seine Regeln (7 Tage hart laut Nutzer, Chronik,
 *      die gebucht-Regel für eine längere Grenze, nur eigene — Verwaltung
 *      alle —, höchstens 10, einmal je
 *      Stunde), `gebuchtMelden` schreibt nur den einen Pfad;
 *   5. der Takt je Bildschirm (`abfrageTakt`, `Abgleich.taktSchlag`);
 *   6. die Messung: Bytes je Spieler-Stunde gegen die Vorher-Zahlen von
 *      v0.152.4 (tests\messung-download.js).
 *
 * DAS FAZIT steht am Ende von `alleMitWarten()` — die Prüfungen sind
 * asynchron, und eine Prüfung hinter `process.exit` liefe nie.
 */

const pfad = require("path");
const fs = require("fs");

globalThis.SCHACH_VARIANTEN = require(pfad.join(__dirname, "..", "js", "schach-varianten.js"));
globalThis.SCHACH = require(pfad.join(__dirname, "..", "js", "schach.js"));
globalThis.SCHACH_RUNDE = require(pfad.join(__dirname, "..", "js", "schach-runde.js"));
require(pfad.join(__dirname, "..", "js", "schach-runde-faehigkeiten.js"));
globalThis.SCHACH_TAFEL = require(pfad.join(__dirname, "..", "js", "schach-tafel.js"));

const geraet = {};
globalThis.window = {
    localStorage: {
        getItem(s) { return Object.prototype.hasOwnProperty.call(geraet, s) ? geraet[s] : null; },
        setItem(s, w) { geraet[s] = String(w); },
        removeItem(s) { delete geraet[s]; }
    },
    setInterval() { return 1; },
    setTimeout() { return 1; },
    clearTimeout() { }
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

function gleich(ist, soll, meldung) {
    const a = JSON.stringify(ist);
    const b = JSON.stringify(soll);
    if (a !== b) {
        throw new Error(meldung + " — ist " + a + ", soll " + b);
    }
}

function lesen(datei) {
    return fs.readFileSync(pfad.join(__dirname, "..", datei), "utf8");
}

/* Der Server-Nachbau (wie test-schach-speicher.js). */
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
        geladen() {
            return speicher.protokoll.filter((e) => e.art === "laden").map((e) => e.pfad + (e.flach ? "?flach" : ""));
        },
        vergessen() {
            speicher.protokoll = [];
        }
    };
    return speicher;
}

function partieBauen(id, weiss, schwarz, zeitpunkt, ergebnis, laeuft) {
    let partie = SCHACH_RUNDE.leereRunde(zeitpunkt, SCHACH_VARIANTEN.liste[0].id, id, "Test " + id);
    if (weiss) {
        partie = SCHACH_RUNDE.teamBeitreten(partie, weiss, "weiss", zeitpunkt);
    }
    if (schwarz) {
        partie = SCHACH_RUNDE.teamBeitreten(partie, schwarz, "schwarz", zeitpunkt);
    }
    partie = SCHACH_RUNDE.kopieren(partie);
    if (ergebnis) {
        partie.laeuft = false;
        partie.ergebnis = ergebnis;
    } else if (laeuft) {
        partie.laeuft = true;
    }
    return partie;
}

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

const TAG = 24 * 60 * 60 * 1000;

/* Gemessen am 28.09.2026 mit tests\messung-download.js gegen die Dateien
   von v0.152.4 (vor diesem Umbau) — Bytes Nutzlast je Spieler-Stunde. */
const VORHER = {
    start: { bytes: 11003725, anfragen: 4103 },
    mensch: { bytes: 1679264, anfragen: 2120 },
    bob: { bytes: 234686, anfragen: 1940 }
};

async function alleMitWarten() {

    /* -------------------------------------------------------------- *
     * 1. Fremde laufende Partien
     * -------------------------------------------------------------- */

    await pruefeMitWarten("Übersichts-Eintrag trägt die Einladungen (mitEinladungen, Liste nur wenn nicht leer)", async () => {
        let partie = partieBauen("p-e", "id-a", "id-b", 1000, "", true);
        const ohne = SCHACH_TAFEL.uebersichtEintrag(partie, 2000);
        gleich(ohne.mitEinladungen, true, "Marke immer da");
        wahr(!("eingeladen" in ohne), "keine leere Liste (die Datenbank speichert sie nicht)");
        partie = SCHACH_RUNDE.einladen ? SCHACH_RUNDE.einladen(partie, "id-ich", 1100) : partie;
        if (!SCHACH_RUNDE.einladen) {
            partie.eingeladen = ["id-ich"];
        }
        gleich(SCHACH_TAFEL.uebersichtEintrag(partie, 2000).eingeladen, ["id-ich"], "Liste mit der Eingeladenen");
    });

    await pruefeMitWarten("tafelLaden: fremde laufende nicht, eigene/wartende/eingeladene/alte Einträge schon", async () => {
        SCHACH_SPEICHER.vergessen();
        const eigene = partieBauen("p-eigen", "id-ich", "id-b", 1000, "", true);
        const fremd = partieBauen("p-fremd", "id-x", "id-y", 1000, "", true);
        const wartend = partieBauen("p-wartet", "id-x", "", 1000);
        const eingeladen = partieBauen("p-einl", "id-x", "id-y", 1000, "", true);
        eingeladen.eingeladen = ["id-ich"];
        const alt = partieBauen("p-alt", "id-x", "id-y", 1000, "", true);
        const baum = baumBauen([eigene, fremd, wartend, eingeladen, alt],
            { "p-eigen": 2000, "p-fremd": 2000, "p-wartet": 2000, "p-einl": 2000, "p-alt": 2000 });
        /* Ein Eintrag, wie ihn v0.152.4 und älter schreiben: ohne Einladungsliste. */
        delete baum.uebersicht["p-alt"].mitEinladungen;
        const server = nachbau(baum);

        const tafel = await SCHACH_SPEICHER.tafelLaden(server, "id-ich", SCHACH_TAFEL.leereTafel(),
            { aufraeumen: false });
        const geholt = server.geladen().filter((p) => /^partien\/.+/.test(p)).sort();
        gleich(geholt, ["partien/p-alt", "partien/p-eigen", "partien/p-einl", "partien/p-wartet"],
            "geholte Partien");
        wahr(!tafel.partien["p-fremd"], "die fremde laufende steht nicht in der Tafel");
        wahr(SCHACH_SPEICHER._offeneKennungen.indexOf("p-fremd") !== -1, "ihre Kennung ist bekannt");
        gleich(SCHACH_SPEICHER.idZuCode(SCHACH_RUNDE.beitrittsCode("p-fremd")), "p-fremd",
            "der Code findet sie");
        gleich(SCHACH_SPEICHER.idZuCode(" " + SCHACH_RUNDE.beitrittsCode("p-fremd").toLowerCase()), "p-fremd",
            "grosszügig gelesen wie partieZuCode");
        gleich(SCHACH_SPEICHER.idZuCode("ABC"), null, "falsche Länge");
    });

    await pruefeMitWarten("tafelLaden mit aktiver Verwaltung holt auch fremde laufende", async () => {
        SCHACH_SPEICHER.vergessen();
        const fremd = partieBauen("p-fremd", "id-x", "id-y", 1000, "", true);
        const server = nachbau(baumBauen([fremd], { "p-fremd": 2000 }));
        const tafel = await SCHACH_SPEICHER.tafelLaden(server, "id-ich", SCHACH_TAFEL.leereTafel(),
            { verwaltung: true, aufraeumen: false });
        wahr(!!tafel.partien["p-fremd"], "Verwaltung sieht sie");
    });

    await pruefeMitWarten("partieAuffrischen fragt nur den Zeitstempel des Eintrags", async () => {
        SCHACH_SPEICHER.vergessen();
        const offen = partieBauen("p-o", "id-ich", "id-b", 1000, "", true);
        const server = nachbau(baumBauen([offen], { "p-o": 2000 }));
        let tafel = await SCHACH_SPEICHER.partieAuffrischen(server, SCHACH_TAFEL.leereTafel(), "p-o");
        wahr(!!tafel.partien["p-o"], "beim ersten Mal geholt");
        server.vergessen();
        tafel = await SCHACH_SPEICHER.partieAuffrischen(server, tafel, "p-o");
        gleich(server.geladen(), ["uebersicht/p-o/geaendertAm"], "nur der Zeitstempel, keine Partie");
    });

    /* -------------------------------------------------------------- *
     * 2. Chronik stückweise
     * -------------------------------------------------------------- */

    await pruefeMitWarten("Chronik: einmal ganz, danach nur die neue Nummer; Vorrat im Gerät", async () => {
        SCHACH_SPEICHER.vergessen();
        const b1 = partieBauen("p-b1", "id-x", "id-y", 1000, "weiss");
        const b2 = partieBauen("p-b2", "id-x", "id-y", 1000, "schwarz");
        const server = nachbau(baumBauen([b1, b2], { "p-b1": 2000, "p-b2": 2000 }));

        let tafel = await SCHACH_SPEICHER.tafelLaden(server, "id-ich", SCHACH_TAFEL.leereTafel(), { aufraeumen: false });
        wahr(server.geladen().indexOf("chronik") !== -1, "erster Blick: die ganze Chronik");
        gleich(tafel.chronik.length, 2, "zwei Einträge");
        wahr(!!geraet[SCHACH_SPEICHER.CHRONIK_VORRAT_SCHLUESSEL], "im Gerätespeicher");

        const b3 = partieBauen("p-b3", "id-x", "id-y", 1000, "weiss");
        server.baum.chronik.push(SCHACH_TAFEL._chronikEintrag(b3));
        server.vergessen();
        tafel = await SCHACH_SPEICHER.tafelLaden(server, "id-ich", tafel, { aufraeumen: false });
        const chronikLaden = server.geladen().filter((p) => /^chronik/.test(p));
        gleich(chronikLaden, ["chronik?flach", "chronik/2"], "nur Schlüssel und der neue Eintrag");
        gleich(tafel.chronik.map((e) => e.id), ["p-b1", "p-b2", "p-b3"], "Reihenfolge nach Nummer");

        /* Neue Seite (nichts im Arbeitsspeicher), Vorrat im Gerät: nichts ganz holen. */
        SCHACH_SPEICHER._chronikAnzahlGesehen = null;
        server.vergessen();
        tafel = await SCHACH_SPEICHER.tafelLaden(server, "id-ich", SCHACH_TAFEL.leereTafel(), { aufraeumen: false });
        wahr(server.geladen().indexOf("chronik") === -1, "aus dem Vorrat, nicht ganz");
        gleich(tafel.chronik.length, 3, "vollständig");
    });

    await pruefeMitWarten("Chronik: viele fehlende Nummern holen sie einmal ganz statt einzeln", async () => {
        SCHACH_SPEICHER.vergessen();
        const partien = [partieBauen("p-0", "id-x", "id-y", 1000, "weiss")];
        const server = nachbau(baumBauen(partien, { "p-0": 2000 }));
        await SCHACH_SPEICHER.tafelLaden(server, "id-ich", SCHACH_TAFEL.leereTafel(), { aufraeumen: false });
        for (let n = 1; n <= SCHACH_SPEICHER.CHRONIK_EINZELN_HOECHSTENS + 1; n++) {
            server.baum.chronik.push(SCHACH_TAFEL._chronikEintrag(partieBauen("p-" + n, "id-x", "id-y", 1000, "weiss")));
        }
        server.vergessen();
        const tafel = await SCHACH_SPEICHER.tafelLaden(server, "id-ich", SCHACH_TAFEL.leereTafel(), { aufraeumen: false });
        gleich(server.geladen().filter((p) => /^chronik\/\d/.test(p)).length, 0, "keine Einzelabrufe");
        wahr(server.geladen().indexOf("chronik") !== -1, "einmal ganz");
        gleich(tafel.chronik.length, SCHACH_SPEICHER.CHRONIK_EINZELN_HOECHSTENS + 2, "vollständig");
    });

    await pruefeMitWarten("schreiben: Chronik stückweise, Ergebnis nie doppelt, nächste freie Nummer", async () => {
        SCHACH_SPEICHER.vergessen();
        const b1 = partieBauen("p-b1", "id-ich", "id-y", 1000, "weiss");
        const server = nachbau(baumBauen([b1], { "p-b1": 2000 }));
        let tafel = await SCHACH_SPEICHER.tafelLaden(server, "id-ich", SCHACH_TAFEL.leereTafel(), { aufraeumen: false });

        const neu = partieBauen("p-neu", "id-ich", "id-y", 3000, "schwarz");
        tafel = SCHACH_TAFEL.partieEinsetzen(tafel, neu, 3000);
        server.vergessen();
        await SCHACH_SPEICHER.schreiben(server, tafel, ["p-neu"]);
        wahr(server.geladen().indexOf("chronik") === -1, "nicht die ganze Chronik");
        gleich(server.baum.chronik[1] && server.baum.chronik[1].id, "p-neu", "an Stelle 1 angehängt");

        /* Noch einmal dieselbe beendete Partie schreiben: kein zweiter Eintrag. */
        await SCHACH_SPEICHER.schreiben(server, tafel, ["p-neu"]);
        const ids = Object.keys(server.baum.chronik).map((k) => server.baum.chronik[k].id);
        gleich(ids.filter((id) => id === "p-neu").length, 1, "nie doppelt");
    });

    /* -------------------------------------------------------------- *
     * 3. Vorrat behält eigene gelöschte
     * -------------------------------------------------------------- */

    await pruefeMitWarten("Vorrat: eigene beendete bleiben im Verlauf, wenn der Server sie löscht — nur für ihre Person", async () => {
        SCHACH_SPEICHER.vergessen();
        const eigene = partieBauen("p-mein", "id-ich", "id-y", 1000, "weiss");
        const server = nachbau(baumBauen([eigene], { "p-mein": 2000 }));
        let tafel = await SCHACH_SPEICHER.tafelLaden(server, "id-ich", SCHACH_TAFEL.leereTafel(), { aufraeumen: false });
        wahr(!!tafel.partien["p-mein"], "geladen");

        delete server.baum.partien["p-mein"];
        delete server.baum.uebersicht["p-mein"];
        tafel = await SCHACH_SPEICHER.tafelLaden(server, "id-ich", tafel, { aufraeumen: false });
        wahr(!!tafel.partien["p-mein"], "bleibt aus dem Vorrat");

        const fremderBlick = await SCHACH_SPEICHER.tafelLaden(server, "id-anderer", SCHACH_TAFEL.leereTafel(), { aufraeumen: false });
        wahr(!fremderBlick.partien["p-mein"], "ein anderer an diesem Gerät sieht sie nicht");
        wahr(!!JSON.parse(geraet[SCHACH_SPEICHER.VORRAT_SCHLUESSEL])["p-mein"], "bleibt trotzdem im Vorrat");
    });

    /* -------------------------------------------------------------- *
     * 4. Aufräumen
     * -------------------------------------------------------------- */

    const jetzt = 100 * TAG;
    function aufraeumBaum() {
        const liste = [
            /* löschbar: 8 Tage, alle gebucht */
            ["p-gebucht", "id-ich", "id-y", jetzt - 8 * TAG, { "id-ich": 1, "id-y": 1 }],
            /* löschbar: 8 Tage, nicht alle gebucht (harte Grenze 7 Tage) */
            ["p-halb", "id-ich", "id-y", jetzt - 8 * TAG, { "id-ich": 1 }],
            /* löschbar: 31 Tage, niemand gebucht */
            ["p-alt", "id-ich", "id-y", jetzt - 31 * TAG, null],
            /* bleibt: 6 Tage, alle gebucht */
            ["p-jung", "id-ich", "id-y", jetzt - 6 * TAG, { "id-ich": 1, "id-y": 1 }],
            /* löschbar: gegen Bob, 8 Tage, der eine Mensch hat gebucht */
            ["p-bob", "id-ich", "bot", jetzt - 8 * TAG, { "id-ich": 1 }],
            /* bleibt (ausser für die Verwaltung): fremd, 31 Tage */
            ["p-fremd", "id-x", "id-y", jetzt - 31 * TAG, null]
        ];
        const partien = liste.map((z) => partieBauen(z[0], z[1], z[2], z[3], "weiss"));
        const marken = {};
        liste.forEach((z) => { marken[z[0]] = z[3]; });
        const baum = baumBauen(partien, marken);
        liste.forEach((z) => {
            if (z[4]) {
                baum.uebersicht[z[0]].gebucht = z[4];
            }
        });
        return baum;
    }

    await pruefeMitWarten("aufraeumen: Nutzer-Entscheid 7 Tage hart — gebucht oder nicht; nur eigene", async () => {
        gleich(SCHACH_SPEICHER.AUFRAEUMEN.MINDEST_TAGE, 7, "frühestens nach 7 Tagen");
        gleich(SCHACH_SPEICHER.AUFRAEUMEN.HOECHST_TAGE, 7, "harte Grenze ebenfalls 7 Tage (Auftrag)");
        SCHACH_SPEICHER.vergessen();
        const server = nachbau(aufraeumBaum());
        const weg = await SCHACH_SPEICHER.aufraeumen(server, server.baum.uebersicht,
            server.baum.chronik, "id-ich", { jetzt: jetzt, ohneSperre: true });
        gleich(weg.slice().sort(), ["p-alt", "p-bob", "p-gebucht", "p-halb"], "gelöscht");
        wahr(!server.baum.partien["p-halb"] && !server.baum.uebersicht["p-halb"], "auch ohne alle Buchungen, Partie und Eintrag weg");
        wahr(!!server.baum.partien["p-jung"] && !!server.baum.partien["p-fremd"], "jünger als 7 Tage und fremde bleiben");
        gleich(server.baum.chronik.length, 6, "die Chronik bleibt ganz");
        gleich(server.protokoll.filter((e) => e.art === "schreiben").length, 1, "EIN Schreibvorgang");
    });

    await pruefeMitWarten("aufraeumen: die Buchungs-Regel wirkt, sobald die harte Grenze länger ist", async () => {
        const vorher = SCHACH_SPEICHER.AUFRAEUMEN.HOECHST_TAGE;
        SCHACH_SPEICHER.AUFRAEUMEN.HOECHST_TAGE = 30;
        try {
            SCHACH_SPEICHER.vergessen();
            const server = nachbau(aufraeumBaum());
            const weg = await SCHACH_SPEICHER.aufraeumen(server, server.baum.uebersicht,
                server.baum.chronik, "id-ich", { jetzt: jetzt, ohneSperre: true });
            gleich(weg.slice().sort(), ["p-alt", "p-bob", "p-gebucht"], "halb gebucht bleibt bis 30 Tage");
        } finally {
            SCHACH_SPEICHER.AUFRAEUMEN.HOECHST_TAGE = vorher;
        }
    });

    await pruefeMitWarten("aufraeumen: ohne Chronik-Eintrag nichts; Verwaltung räumt auch fremde", async () => {
        SCHACH_SPEICHER.vergessen();
        const server = nachbau(aufraeumBaum());
        let weg = await SCHACH_SPEICHER.aufraeumen(server, server.baum.uebersicht, [], "id-ich",
            { jetzt: jetzt, ohneSperre: true });
        gleich(weg, [], "ohne Chronik bleibt alles");
        weg = await SCHACH_SPEICHER.aufraeumen(server, server.baum.uebersicht, server.baum.chronik,
            "id-ich", { jetzt: jetzt, ohneSperre: true, verwaltung: true });
        wahr(weg.indexOf("p-fremd") !== -1, "Verwaltung: auch die fremde");
    });

    await pruefeMitWarten("aufraeumen: höchstens 10 je Lauf (die ältesten), höchstens einmal je Stunde", async () => {
        SCHACH_SPEICHER.vergessen();
        const partien = [];
        const marken = {};
        for (let n = 0; n < 12; n++) {
            const p = partieBauen("p-" + n, "id-ich", "id-y", jetzt - (40 + n) * TAG, "weiss");
            partien.push(p);
            marken[p.id] = jetzt - (40 + n) * TAG;
        }
        const server = nachbau(baumBauen(partien, marken));
        const weg = await SCHACH_SPEICHER.aufraeumen(server, server.baum.uebersicht, server.baum.chronik,
            "id-ich", { jetzt: jetzt });
        gleich(weg.length, SCHACH_SPEICHER.AUFRAEUMEN.JE_LAUF, "zehn");
        wahr(weg.indexOf("p-11") !== -1 && weg.indexOf("p-0") === -1, "die ältesten zuerst");
        const gleichDanach = await SCHACH_SPEICHER.aufraeumen(server, server.baum.uebersicht,
            server.baum.chronik, "id-ich", { jetzt: jetzt + 30 * 60 * 1000 });
        gleich(gleichDanach, [], "nach einer halben Stunde noch gesperrt");
        const spaeter = await SCHACH_SPEICHER.aufraeumen(server, server.baum.uebersicht,
            server.baum.chronik, "id-ich", { jetzt: jetzt + 61 * 60 * 1000 });
        gleich(spaeter.length, 2, "nach der Stunde der Rest");
    });

    await pruefeMitWarten("tafelLaden stösst das Aufräumen an (nur mit Person)", async () => {
        SCHACH_SPEICHER.vergessen();
        const server = nachbau(aufraeumBaum());
        SCHACH_SPEICHER._aufraeumenLaeuft = null;
        await SCHACH_SPEICHER.tafelLaden(server, "", SCHACH_TAFEL.leereTafel(), { jetzt: jetzt });
        gleich(SCHACH_SPEICHER._aufraeumenLaeuft, null, "ohne Person nicht");
        await SCHACH_SPEICHER.tafelLaden(server, "id-ich", SCHACH_TAFEL.leereTafel(), { jetzt: jetzt });
        const weg = await SCHACH_SPEICHER._aufraeumenLaeuft;
        gleich(weg.slice().sort(), ["p-alt", "p-bob", "p-gebucht", "p-halb"], "mit Person läuft es");
    });

    await pruefeMitWarten("gebuchtMelden: nur der eine Pfad, ohne Marke; lokal nichts", async () => {
        const server = nachbau({ geaendertAm: 5000, uebersicht: { "p-1": { geaendertAm: 1 } } });
        const ok = await SCHACH_SPEICHER.gebuchtMelden(server, "p-1", "id-ich", 777);
        gleich(ok, true, "gemeldet");
        gleich(server.protokoll[0].aenderungen, { "uebersicht/p-1/gebucht/id-ich": 777 }, "genau ein Pfad");
        gleich(server.baum.geaendertAm, 5000, "Marke unverändert");
        gleich(await SCHACH_SPEICHER.gebuchtMelden({ art: "lokal" }, "p-1", "id-ich"), false, "lokal: nichts");
        const kaputt = { art: "gemeinsam", async teilSchreiben() { throw new Error("abgelehnt"); } };
        const warnen = console.warn;
        console.warn = () => { };
        try {
            gleich(await SCHACH_SPEICHER.gebuchtMelden(kaputt, "p-1", "id-ich"), false, "Fehler wirft nicht");
        } finally {
            console.warn = warnen;
        }
    });

    await pruefeMitWarten("Die Buchung läuft überall über TEAM_SCHACH._buchen, das gebucht meldet", async () => {
        const kern = lesen("js/team-schach.js");
        const auswertung = lesen("js/team-schach-auswertung.js");
        gleich((kern + auswertung).match(/FORTSCHRITT_KONTO\.partieBeendet\(/g).length, 1,
            "partieBeendet nur noch in _buchen");
        wahr(/_buchen\(partie, personId\) \{\s*const gewinn = FORTSCHRITT_KONTO\.partieBeendet\(partie, personId\);\s*TEAM_SCHACH\._gebuchtMelden\(partie, personId\);/.test(kern),
            "_buchen meldet danach");
        gleich((kern + auswertung).match(/TEAM_SCHACH\._buchen\(/g).length, 3, "drei Aufrufer");
    });

    /* -------------------------------------------------------------- *
     * 5. Takt
     * -------------------------------------------------------------- */

    await pruefeMitWarten("abfrageTakt: Start, Vorraum, Menschen, Bob", async () => {
        const T = { partie: 3000, vorraum: 3000, bob: 15000, start: 15000, spieler: 15000 };
        gleich(SCHACH_SPEICHER.abfrageTakt(null, T), 15000, "keine Partie offen");
        gleich(SCHACH_SPEICHER.abfrageTakt(partieBauen("a", "id-ich", "", 1), T), 3000, "Vorraum");
        gleich(SCHACH_SPEICHER.abfrageTakt(partieBauen("b", "id-ich", "id-du", 1, "", true), T), 3000, "gegen Menschen");
        gleich(SCHACH_SPEICHER.abfrageTakt(partieBauen("c", "id-ich", "bot", 1, "", true), T), 15000, "gegen Bob");
        const zweiMitBob = partieBauen("d", "id-ich", "bot", 1, "", true);
        zweiMitBob.teams.weiss.push("id-du");
        gleich(SCHACH_SPEICHER.abfrageTakt(zweiMitBob, T), 3000, "zwei Menschen mit Bob");
        gleich(SCHACH_SPEICHER.abfrageTakt(partieBauen("e", "id-ich", "id-du", 1, "weiss"), T), 3000, "Abschluss mit Menschen");
        gleich(SCHACH_SPEICHER.abfrageTakt(null, null), undefined, "ohne Tabelle: jeder Grundtakt");
    });

    await pruefeMitWarten("KONFIG: Takte wie im Auftrag, Grundtakt 3 s", async () => {
        const k = lesen("js/konfig.js");
        wahr(/abfrageIntervallMs: 3000,/.test(k), "Grundtakt");
        for (const [name, wert] of [["partie", 3000], ["vorraum", 3000], ["bob", 15000], ["start", 15000], ["spieler", 15000]]) {
            wahr(new RegExp("\\b" + name + ": " + wert + ",?").test(k), name + " = " + wert);
        }
        const app = lesen("js/app.js");
        gleich((app.match(/taktMs: /g) || []).length, 2, "beide Abgleiche bekommen ihren Takt");
    });

    await pruefeMitWarten("Abgleich.taktSchlag: lässt Schläge aus, bis der Takt um ist", async () => {
        const quelle = lesen("js/abgleich.js");
        const Abgleich = new Function(quelle + "\nreturn Abgleich;")();
        let takt = 15000;
        const abgleich = new Abgleich({ art: "gemeinsam" }, { abfrageIntervallMs: 3000 }, {
            beiDaten() { }, leereDaten() { return {}; }, inhaltGleich() { return true; },
            taktMs: () => takt
        });
        let fragen = 0;
        abgleich.fremdenStandHolen = () => { fragen++; abgleich.letzteAbfrage = aktuell; };
        let aktuell = 0;
        for (aktuell = 3000; aktuell <= 60000; aktuell += 3000) {
            abgleich.taktSchlag(aktuell);
        }
        gleich(fragen, 4, "15 s: vier Abfragen in einer Minute");
        takt = 3000;
        fragen = 0;
        for (aktuell = 63000; aktuell <= 120000; aktuell += 3000) {
            abgleich.taktSchlag(aktuell);
        }
        gleich(fragen, 20, "3 s: jeder Schlag");
        const ohne = new Abgleich({ art: "gemeinsam" }, { abfrageIntervallMs: 3000 }, {
            beiDaten() { }, leereDaten() { return {}; }, inhaltGleich() { return true; }
        });
        let alle = 0;
        ohne.fremdenStandHolen = () => { alle++; };
        ohne.taktSchlag(1);
        ohne.taktSchlag(2);
        gleich(alle, 2, "ohne Takt fragt jeder Schlag (wie bisher)");
    });

    /* -------------------------------------------------------------- *
     * 6. Messung
     * -------------------------------------------------------------- */

    await pruefeMitWarten("Messung: Bytes je Spieler-Stunde deutlich unter v0.152.4", async () => {
        const { messen } = require(pfad.join(__dirname, "messung-download.js"));
        const nachher = await messen(pfad.join(__dirname, "..", "js"));
        const kb = (b) => Math.round(b / 1024) + " KB";
        for (const lage of ["start", "mensch", "bob"]) {
            console.log("  Messung " + lage + ": vorher " + kb(VORHER[lage].bytes) + " / "
                + VORHER[lage].anfragen + " Anfragen, nachher " + kb(nachher[lage].bytes) + " / "
                + nachher[lage].anfragen + " Anfragen");
        }
        console.log("  Messung start, Server aufgeräumt: " + kb(nachher.startAufgeraeumt.bytes));
        wahr(nachher.start.bytes <= VORHER.start.bytes * 0.25, "Start höchstens ein Viertel");
        wahr(nachher.start.anfragen <= VORHER.start.anfragen * 0.3, "Start: Anfragen höchstens 30 %");
        wahr(nachher.bob.bytes <= VORHER.bob.bytes * 0.6, "Bob höchstens 60 %");
        wahr(nachher.mensch.bytes <= VORHER.mensch.bytes, "mit Menschen nicht mehr als vorher");
        wahr(nachher.startAufgeraeumt.bytes < nachher.start.bytes, "aufgeräumt noch weniger");
        gleich(nachher.start.fremdeLaufendeGeholt, 0, "keine fremde laufende geholt");
    });

    console.log(anzahlOk + " ok, " + anzahlFehler + " Fehler");
    process.exit(anzahlFehler === 0 ? 0 : 1);
}

alleMitWarten();
