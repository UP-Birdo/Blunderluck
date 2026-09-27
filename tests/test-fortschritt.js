/*
 * test-fortschritt.js — Regressionstests für XP und Level (seit v0.146.0,
 * Runde 5): js\fortschritt.js (die Rechnung), js\fortschritt-konto.js (Gerät
 * und Konto) und der Fortschritt am Spieler-Eintrag (js\spieler.js).
 *
 * Geprüft werden die ECHTEN Dateien; Zahlen aus Apps\UPCrew\docs\
 * FORTSCHRITT.md („GÜLTIGER STAND").
 *
 * Aufruf: siehe tests\README.md
 */

const pfad = require("path");

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

const FORTSCHRITT = require(pfad.join(projekt, "js", "fortschritt.js"));
globalThis.FORTSCHRITT = FORTSCHRITT;
const SPIELER = require(pfad.join(projekt, "js", "spieler.js"));
globalThis.SPIELER = SPIELER;

/* ------------------------------------------------------------------ *
 * Level
 * ------------------------------------------------------------------ */

pruefe("Level-Kosten: 100, 125, 150 … und ab Level 17 immer 500", () => {
    gleich(FORTSCHRITT.levelKosten(1), 100, "Level 1");
    gleich(FORTSCHRITT.levelKosten(2), 125, "Level 2");
    gleich(FORTSCHRITT.levelKosten(16), 475, "Level 16");
    gleich(FORTSCHRITT.levelKosten(17), 500, "Level 17");
    gleich(FORTSCHRITT.levelKosten(80), 500, "Level 80 (endlos)");
});

pruefe("Level aus XP: man beginnt bei 1, genau an der Grenze steigt man auf", () => {
    const null_ = FORTSCHRITT.levelAus(0);
    gleich(null_.level, 1, "0 XP");
    gleich(null_.imLevel, 0, "0 XP im Level");
    gleich(FORTSCHRITT.levelAus(99).level, 1, "99 XP");
    gleich(FORTSCHRITT.levelAus(100).level, 2, "100 XP");
    gleich(FORTSCHRITT.levelAus(224).level, 2, "224 XP");
    const drei = FORTSCHRITT.levelAus(225);
    gleich(drei.level, 3, "225 XP");
    gleich(drei.kosten, 150, "Kosten Level 3");
    gleich(FORTSCHRITT.levelAus(290).anteil, 65 / 150, "Anteil im Level");
    gleich(FORTSCHRITT.levelAus(-5).level, 1, "Unsinn wird 0");
});

/* ------------------------------------------------------------------ *
 * Partien zählen
 * ------------------------------------------------------------------ */

pruefe("Eine Partie gibt einmal +10 XP, nie doppelt", () => {
    let stand = FORTSCHRITT.leer();
    stand = FORTSCHRITT.partieZaehlen(stand, "p-a", 1000);
    gleich(FORTSCHRITT.gesamtXp(stand), 10, "nach einer Partie");
    const nochmal = FORTSCHRITT.partieZaehlen(stand, "p-a", 2000);
    gleich(FORTSCHRITT.gesamtXp(nochmal), 10, "dieselbe Partie zählt nicht zweimal");
    gleich(nochmal.spiele.blunderluck.stand, 1000, "unverändert heisst auch: kein neuer Stand");
    stand = FORTSCHRITT.partieZaehlen(stand, "p-b", 1500);
    gleich(FORTSCHRITT.gesamtXp(stand), 20, "zweite Partie");
    gleich(stand.spiele.blunderluck.partien, 2, "Partien gezählt");
    gleich(FORTSCHRITT.partieZaehlen(stand, "", 3000).spiele.blunderluck.partien, 2, "ohne Kennung nichts");
});

pruefe("Der Stand steigt immer, auch bei gleicher oder älterer Uhrzeit", () => {
    let stand = FORTSCHRITT.partieZaehlen(FORTSCHRITT.leer(), "p-a", 5000);
    stand = FORTSCHRITT.partieZaehlen(stand, "p-b", 4000);
    gleich(stand.spiele.blunderluck.stand, 5001, "vorwärts trotz Uhr zurück");
});

pruefe("Die Liste gezählter Partien bleibt kurz, die XP bleiben", () => {
    let stand = FORTSCHRITT.leer();
    for (let i = 0; i < FORTSCHRITT.GEZAEHLT_MAX + 5; i++) {
        stand = FORTSCHRITT.partieZaehlen(stand, "p-" + i, 1000 + i);
    }
    gleich(stand.spiele.blunderluck.gezaehlt.length, FORTSCHRITT.GEZAEHLT_MAX, "Länge");
    gleich(FORTSCHRITT.gesamtXp(stand), (FORTSCHRITT.GEZAEHLT_MAX + 5) * 10, "XP");
});

/* ------------------------------------------------------------------ *
 * Zusammenführen und fremde Zweige
 * ------------------------------------------------------------------ */

pruefe("Zusammenführen: je Spiel gewinnt der neuere Zweig, die Summe zählt beide", () => {
    const hier = {
        version: 1,
        spiele: {
            blunderluck: { xp: 50, partien: 5, gezaehlt: [], stand: 900 },
            typoluck: { xp: 20, partien: 2, gezaehlt: [], stand: 100 }
        }
    };
    const konto = {
        version: 1,
        spiele: {
            blunderluck: { xp: 30, partien: 3, gezaehlt: [], stand: 500 },
            typoluck: { xp: 70, partien: 7, gezaehlt: [], stand: 800, woerter: 12 }
        }
    };
    const zusammen = FORTSCHRITT.zusammenfuehren(hier, konto);
    gleich(zusammen.spiele.blunderluck.xp, 50, "eigener Zweig ist neuer");
    gleich(zusammen.spiele.typoluck.xp, 70, "Typolucks Zweig ist neuer");
    gleich(zusammen.spiele.typoluck.woerter, 12, "fremdes Feld im Zweig wandert durch");
    gleich(FORTSCHRITT.gesamtXp(zusammen), 120, "Summe");
    gleich(JSON.stringify(FORTSCHRITT.zusammenfuehren(konto, hier)), JSON.stringify(
        FORTSCHRITT.zusammenfuehren(konto, hier)), "wiederholbar");
    gleich(FORTSCHRITT.gesamtXp(FORTSCHRITT.zusammenfuehren(konto, hier)), 120, "Reihenfolge egal");
});

pruefe("Normalisieren: Müll fliegt, unbekannte Felder oben wandern durch", () => {
    const stand = FORTSCHRITT.normalisieren({
        version: 1, neu: { a: 1 },
        spiele: { blunderluck: { xp: "viel", partien: -3, gezaehlt: [1, "p-x", ""] }, kaputt: 7 }
    });
    gleich(stand.spiele.blunderluck.xp, 0, "Text als XP");
    gleich(stand.spiele.blunderluck.partien, 0, "negative Partien");
    gleich(stand.spiele.blunderluck.gezaehlt.join(","), "p-x", "nur Texte");
    wahr(!("kaputt" in stand.spiele), "Zweig ohne Objekt fliegt");
    gleich(stand.neu.a, 1, "unbekanntes Feld oben");
    gleich(FORTSCHRITT.gesamtXp(null), 0, "nichts");
});

/* ------------------------------------------------------------------ *
 * Belohnungen
 * ------------------------------------------------------------------ */

pruefe("Belohnungen: Aussehen aus den Stufen, Rahmen ab 10 alle 5 Level, sonst Serien-Schutz ab 11", () => {
    const stufen = { farbwelt: { werkstatt: 0, studio: 2 }, schrift: { S4: 2 }, knoepfe: { K5: 2 } };
    const zwei = FORTSCHRITT.belohnungen(2, stufen).map((b) => b.art + ":" + b.wert).join(",");
    gleich(zwei, "farbwelt:studio,schrift:S4,knoepfe:K5", "Level 2");
    gleich(FORTSCHRITT.belohnungen(5, stufen).length, 0, "Level 5: kein Rahmen mehr (seit v0.151.0)");
    gleich(FORTSCHRITT.belohnungen(10, stufen).map((b) => b.art + ":" + b.wert).join(","),
        "rahmen:silber,titel:Stammgast", "Level 10: erster Rahmen (Silber, wie Typoluck)");
    gleich(FORTSCHRITT.belohnungen(11, stufen).map((b) => b.art).join(","), "schutz", "Level 11");
    gleich(FORTSCHRITT.belohnungen(15, stufen).map((b) => b.wert).join(","), "gold", "Level 15");
    gleich(FORTSCHRITT.belohnungen(20, stufen).map((b) => b.wert).join(","), "platin", "Level 20");
    gleich(FORTSCHRITT.belohnungen(25, stufen).map((b) => b.art + ":" + b.wert).join(","),
        "titel:Kenner,rahmen:glanz", "Level 25: Glanz");
    /* Jedes durch 5 teilbare Level ab 10 bringt genau einen Rahmen, keins davor. */
    for (let l = 1; l <= 60; l++) {
        const rahmen = FORTSCHRITT.belohnungen(l, {}).filter((b) => b.art === "rahmen").length;
        gleich(rahmen, (l >= 10 && l % 5 === 0) ? 1 : 0, "Rahmen bei Level " + l);
    }
    gleich(FORTSCHRITT.belohnungen(3, stufen).length, 0, "Level 3 ohne Stufen-Eintrag");
    gleich(FORTSCHRITT.schutzVerdient(10), 0, "bis 10 kein Schutz");
    gleich(FORTSCHRITT.schutzVerdient(16), 5, "11–14 und 16");
    gleich(FORTSCHRITT.rahmenVon(9), null, "unter 10 kein Rahmen");
    gleich(FORTSCHRITT.rahmenVon(12).id, "silber", "12 = Silber");
    gleich(FORTSCHRITT.rahmenVon(17).id, "gold", "17 = Gold");
    gleich(FORTSCHRITT.titelVon(1).name, "Neuling", "Titel am Anfang");
});

/* ------------------------------------------------------------------ *
 * Am Spieler-Eintrag
 * ------------------------------------------------------------------ */

function daten(fortschrittA, fortschrittB) {
    return {
        eigen: { spieler: [{ id: "ich", name: "Anna", fortschritt: fortschrittA }] },
        fremd: { spieler: [{ id: "ich", name: "Anna", fortschritt: fortschrittB }] }
    };
}

pruefe("Spieler-Abgleich: Typolucks neuere XP gehen beim Speichern nicht verloren", () => {
    const eigen = { version: 1, spiele: { blunderluck: { xp: 40, partien: 4, gezaehlt: [], stand: 900 } } };
    const server = { version: 1, spiele: {
        blunderluck: { xp: 30, partien: 3, gezaehlt: [], stand: 500 },
        typoluck: { xp: 60, partien: 6, gezaehlt: [], stand: 950 } } };
    const d = daten(eigen, server);
    const zusammen = SPIELER.zusammenfuehren(d.fremd, d.eigen, "ich");
    const f = zusammen.spieler[0].fortschritt;
    gleich(f.spiele.blunderluck.xp, 40, "eigener Zweig");
    gleich(f.spiele.typoluck.xp, 60, "Typolucks Zweig vom Server");
});

pruefe("Spieler-Eintrag: nur ein Objekt ist ein Fortschritt; setzen normalisiert", () => {
    const stand = SPIELER.normalisieren({ spieler: [{ id: "a", name: "A", fortschritt: "kaputt" }] });
    wahr(!("fortschritt" in stand.spieler[0]), "Text fliegt");
    const neu = SPIELER.fortschrittSetzen({ spieler: [{ id: "a", name: "A" }] }, "a",
        { spiele: { blunderluck: { xp: 25 } } }, 5);
    gleich(neu.spieler[0].fortschritt.spiele.blunderluck.xp, 25, "gesetzt");
    gleich(neu.spieler[0].fortschritt.version, 1, "in Form gebracht");
    wahr(!SPIELER.inhaltGleich(neu, { spieler: [{ id: "a", name: "A" }] }), "Änderung wird bemerkt");
});

/* ------------------------------------------------------------------ *
 * Gerät und Konto (js\fortschritt-konto.js)
 * ------------------------------------------------------------------ */

const speicher = {};
globalThis.localStorage = {
    getItem: (k) => (k in speicher ? speicher[k] : null),
    setItem: (k, v) => { speicher[k] = String(v); },
    removeItem: (k) => { delete speicher[k]; }
};
globalThis.SCHACH_RUNDE = {
    teamVon: (partie, id) => (partie.teams.weiss.indexOf(id) !== -1 ? "weiss"
        : (partie.teams.schwarz.indexOf(id) !== -1 ? "schwarz" : ""))
};
const FORTSCHRITT_KONTO = require(pfad.join(projekt, "js", "fortschritt-konto.js"));

pruefe("Gast: eine beendete eigene Partie zählt einmal, nur im Gerätespeicher", () => {
    globalThis.ANMELDUNG = { abgleich: { daten: { spieler: [] }, aendern() { throw new Error("Gast schreibt ans Konto"); } },
        ich: () => ({ id: "gast-1", gast: true }) };
    const partie = { id: "p-1", ergebnis: "weiss", teams: { weiss: ["gast-1"], schwarz: ["bot"] } };
    const gewinn = FORTSCHRITT_KONTO.partieBeendet(partie, "gast-1");
    gleich(gewinn.xp, 10, "+10");
    gleich(FORTSCHRITT_KONTO.partieBeendet(partie, "gast-1"), null, "nicht zweimal");
    gleich(FORTSCHRITT_KONTO.partieBeendet({ id: "p-2", ergebnis: "", teams: partie.teams }, "gast-1"), null,
        "laufende Partie zählt nicht");
    gleich(FORTSCHRITT_KONTO.partieBeendet({ id: "p-3", ergebnis: "remis", teams: { weiss: ["x"], schwarz: ["y"] } },
        "gast-1"), null, "fremde Partie zählt nicht");
    const alle = JSON.parse(speicher["upcrew.fortschritt"]);
    gleich(FORTSCHRITT.gesamtXp(alle.gast), 10, "im gemeinsamen Gerätespeicher unter „gast\"");
    gleich(Object.keys(alle).join(","), "gast", "nur der eigene Eintrag");
});

pruefe("Konto: ohne Regel §11b (AM_KONTO aus) schreibt nichts ans Konto, liest aber von dort", () => {
    gleich(FORTSCHRITT_KONTO.AM_KONTO, false, "Vorgabe: aus, bis der Nutzer die Regel einspielt");
    const kontoDaten = { spieler: [{ id: "ich", name: "Anna", uid: "u1",
        fortschritt: { version: 1, spiele: { typoluck: { xp: 40, partien: 4, gezaehlt: [], stand: 7 } } } }] };
    globalThis.ANMELDUNG = {
        abgleich: { daten: kontoDaten, aendern() { throw new Error("schreibt ohne Regel ans Konto"); } },
        ich: () => SPIELER.spielerFinden(kontoDaten, "ich")
    };
    const gewinn = FORTSCHRITT_KONTO.partieBeendet(
        { id: "p-5", ergebnis: "weiss", teams: { weiss: ["ich"], schwarz: ["bot"] } }, "ich");
    gleich(gewinn.xp, 10, "+10");
    const alle = JSON.parse(speicher["upcrew.fortschritt"]);
    gleich(alle.ich.spiele.blunderluck.xp, 10, "eigener Eintrag unter der Spieler-Id");
    gleich(alle.ich.spiele.typoluck.xp, 40, "Typolucks Zweig vom Konto mitgenommen");
    gleich(FORTSCHRITT.gesamtXp(alle.gast), 10, "der Gast-Eintrag bleibt, wie er war");
    delete speicher["upcrew.fortschritt"];
});

pruefe("Konto: mit AM_KONTO geht der Fortschritt über den Spieler-Abgleich an den eigenen Eintrag", () => {
    const geschrieben = [];
    const kontoDaten = { spieler: [{ id: "ich", name: "Anna", uid: "u1",
        fortschritt: { version: 1, spiele: { typoluck: { xp: 90, partien: 9, gezaehlt: [], stand: 7 } } } }] };
    globalThis.ANMELDUNG = {
        abgleich: { daten: kontoDaten, aendern(neu) { geschrieben.push(neu); } },
        ich: () => SPIELER.spielerFinden(kontoDaten, "ich")
    };
    /* Ein flacher Typoluck-0.10.0-Stand auf dem Gerät darf NICHT ans Konto. */
    speicher["upcrew.fortschritt"] = JSON.stringify({ ich: { xp: 30, heute: { datum: "2026-09-27", wort: 2 } } });
    FORTSCHRITT_KONTO.AM_KONTO = true;
    try {
        gleich(FORTSCHRITT_KONTO.level().level, 1, "90 XP aus Typoluck = Level 1");
        const gewinn = FORTSCHRITT_KONTO.partieBeendet(
            { id: "p-9", ergebnis: "schwarz", teams: { weiss: ["bot"], schwarz: ["ich"] } }, "ich");
        gleich(gewinn.levelVorher, 1, "vorher Level 1");
        gleich(gewinn.levelNachher, 2, "90 + 10 = 100 XP = Level 2");
        gleich(geschrieben.length, 1, "einmal geschrieben");
        const f = SPIELER.spielerFinden(geschrieben[0], "ich").fortschritt;
        gleich(f.spiele.typoluck.xp, 90, "Typolucks Zweig bleibt");
        gleich(f.spiele.blunderluck.xp, 10, "eigener Zweig dazu");
        gleich(Object.keys(f).sort().join(","), "spiele,version", "nur die Felder des Vertrags ans Konto");
    } finally {
        FORTSCHRITT_KONTO.AM_KONTO = false;
        delete speicher["upcrew.fortschritt"];
    }
});

/* ------------------------------------------------------------------ *
 * Der gemeinsame Gerätespeicher und der Umzug (seit v0.150.0)
 * ------------------------------------------------------------------ */

pruefe("Umzug: der alte Stand `blunderluck.fortschritt` geht vollständig in `upcrew.fortschritt` über", () => {
    globalThis.ANMELDUNG = { abgleich: { daten: { spieler: [] }, aendern() { throw new Error("Gast schreibt ans Konto"); } },
        ich: () => ({ id: "gast-7", gast: true }) };
    speicher["blunderluck.fortschritt"] = JSON.stringify({ version: 1, spiele: { blunderluck: {
        xp: 140, partien: 12, gezaehlt: ["p-alt"], stand: 50,
        turm: { figuren: { "1-0": 3, "1-1": 2 } },
        heute: { datum: "2026-09-27", versuche: 2, figuren: 2 },
        tage: ["2026-09-26", "2026-09-27"] } } });
    delete speicher["upcrew.fortschritt"];

    /* Lesen allein zieht noch nicht um, zählt den Altstand aber schon mit. */
    gleich(FORTSCHRITT.gesamtXp(FORTSCHRITT_KONTO.lesen()), 140, "Altstand gelesen");
    wahr("blunderluck.fortschritt" in speicher, "Lesen löscht nichts");
    gleich(FORTSCHRITT_KONTO.turmFiguren()["1-0"], 3, "Turm-Figuren gelesen");

    /* Die alte Partie zählt nicht noch einmal, eine neue schon. */
    gleich(FORTSCHRITT_KONTO.partieBeendet({ id: "p-alt", ergebnis: "weiss",
        teams: { weiss: ["gast-7"], schwarz: ["bot"] } }, "gast-7"), null, "p-alt war gezählt");
    const gewinn = FORTSCHRITT_KONTO.partieBeendet({ id: "p-neu", ergebnis: "weiss",
        teams: { weiss: ["gast-7"], schwarz: ["bot"] } }, "gast-7");
    gleich(gewinn.xp, 10, "+10");

    wahr(!("blunderluck.fortschritt" in speicher), "alter Schlüssel nach dem Schreiben entfernt");
    const zweig = JSON.parse(speicher["upcrew.fortschritt"]).gast.spiele.blunderluck;
    gleich(zweig.xp, 150, "XP vollständig");
    gleich(zweig.partien, 13, "Partien");
    gleich(zweig.turm.figuren["1-1"], 2, "Turm");
    gleich(zweig.heute.figuren, 2, "Heute");
    gleich(zweig.tage.join(","), "2026-09-26,2026-09-27", "Tage der Serie");
    wahr(zweig.gezaehlt.indexOf("p-alt") !== -1 && zweig.gezaehlt.indexOf("p-neu") !== -1, "gezählte Partien");
    delete speicher["upcrew.fortschritt"];
});

pruefe("Gemeinsamer Speicher: andere Personen und Typolucks flacher 0.10.0-Stand bleiben unberührt", () => {
    const kontoDaten = { spieler: [{ id: "ich", name: "Anna", uid: "u1" }] };
    globalThis.ANMELDUNG = { abgleich: { daten: kontoDaten, aendern() { throw new Error("ohne Regel"); } },
        ich: () => SPIELER.spielerFinden(kontoDaten, "ich") };
    const flach = { stand: 9, xp: 70, serie: { tage: 2, schutz: 0, zuletzt: "2026-09-27" },
        heute: { datum: "2026-09-27", brett: 0, wort: 3, xp: 20 }, turm: {}, taten: [], zaehler: { partien: 7 } };
    const fremd = { version: 1, spiele: { typoluck: { xp: 5, stand: 1 } } };
    speicher["upcrew.fortschritt"] = JSON.stringify({ ich: flach, "id-andere": fremd });
    FORTSCHRITT_KONTO.partieBeendet({ id: "p-f", ergebnis: "weiss",
        teams: { weiss: ["ich"], schwarz: ["bot"] } }, "ich");
    const alle = JSON.parse(speicher["upcrew.fortschritt"]);
    gleich(JSON.stringify(alle["id-andere"]), JSON.stringify(fremd), "fremde Person unverändert");
    for (const feld of Object.keys(flach)) {
        gleich(JSON.stringify(alle.ich[feld]), JSON.stringify(flach[feld]), "flaches Typoluck-Feld " + feld);
    }
    gleich(alle.ich.spiele.blunderluck.xp, 10, "eigener Zweig daneben");
    gleich(alle.ich.version, 1, "Version gesetzt");
    delete speicher["upcrew.fortschritt"];
});

pruefe("Heute liest den Typoluck-Zweig aus dem gemeinsamen Speicher (Karte Tageswort und ×1,5)", () => {
    globalThis.ANMELDUNG = { abgleich: null, ich: () => null };
    const datum = FORTSCHRITT.datumVon(Date.now());
    speicher["upcrew.fortschritt"] = JSON.stringify({ gast: { version: 1, spiele: { typoluck: {
        xp: 20, stand: 3, heute: { datum: datum, versuche: 1, figuren: 3 }, tage: [datum] } } } });
    const heute = FORTSCHRITT_KONTO.heute();
    gleich(heute.typoluck.figuren, 3, "Tageswort geschafft");
    gleich(heute.blunderluck.figuren, 0, "Tagesbrett offen");
    gleich(heute.serie.tage, 1, "die Serie zählt Typolucks Tag mit");
    const versuch = FORTSCHRITT.tagesaufgabe(FORTSCHRITT_KONTO.lesen(), datum, true, Date.now());
    gleich(versuch.xp, 30 + 30 + 5, "×1,5 auf die 20, 3 Figuren, Serie — weil Typolucks Zweig heute geschafft hat");
    delete speicher["upcrew.fortschritt"];
});

pruefe("Kaputter oder fremder Inhalt im gemeinsamen Speicher bricht nichts", () => {
    globalThis.ANMELDUNG = { abgleich: null, ich: () => null };
    speicher["upcrew.fortschritt"] = "{kaputt";
    gleich(FORTSCHRITT_KONTO.level().level, 1, "kaputt: Level 1");
    speicher["upcrew.fortschritt"] = "[1,2]";
    gleich(FORTSCHRITT.gesamtXp(FORTSCHRITT_KONTO.lesen()), 0, "Liste: leer");
    delete speicher["upcrew.fortschritt"];
});

pruefe("Freischaltung: die Aussehen-Stufe ist das Level", () => {
    const FREISCHALTUNG = require(pfad.join(projekt, "js", "freischaltung.js"));
    globalThis.FORTSCHRITT_KONTO = FORTSCHRITT_KONTO;
    try {
        gleich(FREISCHALTUNG.stufe(), FORTSCHRITT_KONTO.level().level, "stufe() = Level");
    } finally {
        delete globalThis.FORTSCHRITT_KONTO;
    }
    gleich(FREISCHALTUNG.stufe(), 0, "ohne Fortschritt 0");
});

pruefe("Ans Konto nur die Felder der Regel §11b: ohne umzug, ohne flache Felder, Zahlen begrenzt", () => {
    const roh = {
        version: 1, xp: 70, serie: { tage: 2 }, heute: { wort: 3 },
        spiele: {
            typoluck: { xp: 40, partien: 4, stand: 9, gezaehlt: [], tage: ["2026-09-27", "kaputt"],
                heute: { datum: "2026-09-27", versuche: 1, figuren: 3, wort: 3 },
                zaehler: { koennenSumme: 180, koennenAnzahl: 2, koennenBeste: 95, "böse-zahl": 1, text: "x" },
                taten: ["erste"], umzug: { von: "0.10.0", alt: { xp: 70 } } },
            blunderluck: { xp: 20000000, partien: 2, stand: 3, gezaehlt: ["p-1"],
                turm: { figuren: { "1-0": 3, "1-1": 0, "x": 2 }, schwuere: { "3": 2 }, extra: 1 } },
            fremdspiel: { xp: 5 }
        },
        schutz: { frei: 2 }
    };
    const k = FORTSCHRITT.fuerKonto(roh);
    gleich(Object.keys(k).sort().join(","), "schutz,spiele,version", "oben nur Vertragsfelder");
    gleich(Object.keys(k.spiele).sort().join(","), "blunderluck,typoluck", "nur bekannte Spiele");
    wahr(!("umzug" in k.spiele.typoluck), "umzug bleibt auf dem Gerät");
    gleich(Object.keys(k.spiele.typoluck.heute).sort().join(","), "datum,figuren,versuche", "heute ohne wort");
    gleich(Object.keys(k.spiele.typoluck.zaehler).sort().join(","), "koennenAnzahl,koennenBeste,koennenSumme",
        "zaehler nur Zahlen mit Buchstaben-Namen");
    gleich(k.spiele.typoluck.tage.join(","), "2026-09-27", "nur gültige Tage");
    gleich(k.spiele.typoluck.taten.join(","), "erste", "Taten");
    gleich(k.spiele.blunderluck.xp, FORTSCHRITT.XP_MAX, "XP begrenzt");
    gleich(JSON.stringify(k.spiele.blunderluck.turm), JSON.stringify({ figuren: { "1-0": 3 }, schwuere: { "3": 2 } }),
        "Turm nur gültige Schlüssel, Figuren ab 1");
    gleich(k.schutz.frei, 2, "Schutz");
});

console.log(anzahlOk + " ok, " + anzahlFehler + " Fehler");
process.exit(anzahlFehler === 0 ? 0 : 1);
