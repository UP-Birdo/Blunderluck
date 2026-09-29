/*
 * test-turm.js — Regressionstests für den Turm (seit v0.147.0, neu seit
 * v0.160.0: Wege aus dem Seed, Elite und Stationen): die Tabelle und
 * Rechnung in js\turm.js, die Turm-Angabe an der Partie (js\schach-runde.js,
 * js\schach-tafel.js), Figuren und Stationen im Fortschritt
 * (js\fortschritt.js), die Übernahme des alten Turms und die Freischaltung
 * über Orte (js\freischaltung.js).
 *
 * Geprüft werden die ECHTEN Dateien.
 *
 * Aufruf: siehe tests\README.md
 */

const pfad = require("path");

globalThis.SCHACH_VARIANTEN = require(pfad.join(__dirname, "..", "js", "schach-varianten.js"));
globalThis.SCHACH = require(pfad.join(__dirname, "..", "js", "schach.js"));
globalThis.SCHACH_RUNDE = require(pfad.join(__dirname, "..", "js", "schach-runde.js"));
require(pfad.join(__dirname, "..", "js", "schach-runde-faehigkeiten.js"));
const SCHACH_TAFEL = require(pfad.join(__dirname, "..", "js", "schach-tafel.js"));
const TURM = require(pfad.join(__dirname, "..", "js", "turm.js"));
globalThis.TURM = TURM;
const FORTSCHRITT = require(pfad.join(__dirname, "..", "js", "fortschritt.js"));
globalThis.FORTSCHRITT = FORTSCHRITT;

const SCHACH_VARIANTEN = globalThis.SCHACH_VARIANTEN;
const SCHACH_RUNDE = globalThis.SCHACH_RUNDE;

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

/* Viele Spieler je Ort — die Eigenschaften sollen für JEDEN Seed gelten. */
const SEEDS = 150;
const jederPlan = (tu) => {
    for (let nr = 1; nr <= TURM.anzahlOrte(); nr++) {
        for (let i = 1; i <= SEEDS; i++) {
            tu(TURM.plan(nr, { spieler: "spieler-" + i, durchgang: 1 + (i % 3) }), nr);
        }
    }
};
/* Die alten Stufen je Ort (bis v0.159.0) — für „viel weniger Runden". */
const ALTE_STUFEN = [4, 5, 5, 6, 6, 6];

/* ------------------------------------------------------------------ *
 * Die Tabelle
 * ------------------------------------------------------------------ */

pruefe("Sechs Orte wie bisher (Namen, Reihenfolge), 5 bis 9 Stockwerke, 2 oder 3 Wege", () => {
    gleich(TURM.anzahlOrte(), 6, "Orte");
    gleich(TURM.ORTE.map((o) => o.name).join(","),
        "Werkbank,Holzhalle,Marmorsaal,Nachtclub,Turniersaal,Meisterliga", "Namen");
    gleich(TURM.ORTE.map((o) => o.stock).join(","), "5,7,7,8,8,9", "Stockwerke (TURM-TABELLE.md)");
    gleich(TURM.ORTE.map((o) => o.spuren).join(","), "2,3,3,3,3,3", "Wege nebeneinander");
    gleich(TURM.ORTE.map((o) => o.herzen).join(","), "false,true,true,true,true,true", "Herzen ab Holzhalle");
});

pruefe("Schwellen steigen von Ort zu Ort, der König braucht mehr als der Springer", () => {
    let vorher = [0, 0];
    for (const ort of TURM.ORTE) {
        wahr(ort.schwelle[0] < ort.schwelle[1], ort.name + ": Springer < König");
        wahr(ort.schwelle[0] > vorher[0] && ort.schwelle[1] > vorher[1], ort.name + ": steigt");
        vorher = ort.schwelle;
    }
    gleich(TURM.ORTE[0].schwelle.join("/"), "60/80", "Werkbank");
    gleich(TURM.ORTE[5].schwelle.join("/"), "75/90", "Meisterliga");
});

/* ------------------------------------------------------------------ *
 * Der Seed
 * ------------------------------------------------------------------ */

pruefe("Seed: gleicher Spieler + Ort + Durchgang → derselbe Turm; anderer Durchgang → anderer Weg", () => {
    const a = TURM.plan(2, { spieler: "jonas#4821", durchgang: 3 });
    TURM._plaene = {};
    const b = TURM.plan(2, { spieler: "jonas#4821", durchgang: 3 });
    gleich(a.seed.text, "jonas#4821|turm|2|3|v1", "Seed-Text");
    const bild = (p) => JSON.stringify(p.knoten) + JSON.stringify(p.kanten);
    gleich(bild(a), bild(b), "gleich gerechnet");
    const anders = new Set();
    for (let d = 1; d <= 12; d++) {
        anders.add(bild(TURM.plan(2, { spieler: "jonas#4821", durchgang: d })));
    }
    wahr(anders.size >= 10, "12 Durchgänge ergeben verschiedene Türme (" + anders.size + ")");
    wahr(bild(TURM.plan(2, { spieler: "andere", durchgang: 3 })) !== bild(a), "anderer Spieler, anderer Turm");
    gleich(TURM.plan(2, { spieler: "x", version: 1 }).seed.version, 1, "gespeicherte Version gilt");
});

pruefe("Seed: die Schwierigkeit kommt vom Ort — Stärke je Stockwerk für jeden Seed gleich, sie steigt", () => {
    for (let nr = 1; nr <= 6; nr++) {
        const soll = TURM.kennzahlen(TURM.plan(nr, { spieler: "a" })).staerke.join(",");
        for (let i = 0; i < 20; i++) {
            gleich(TURM.kennzahlen(TURM.plan(nr, { spieler: "b" + i })).staerke.join(","), soll, TURM.ort(nr).name);
        }
        const s = soll.split(",").map(Number);
        wahr(s.every((w, i) => i === 0 || w >= s[i - 1]), TURM.ort(nr).name + ": steigt");
        wahr(s[s.length - 1] <= 10, "höchstens 10");
    }
    gleich(TURM.kennzahlen(TURM.plan(2, { spieler: "a" })).staerke.join(" "), "2 2 2 3 3 4 7", "Holzhalle wie TURM-TABELLE.md");
});

/* ------------------------------------------------------------------ *
 * Wege, Boss-Abstand, feste Reihen
 * ------------------------------------------------------------------ */

pruefe("Pfade: immer mindestens zwei Wege und eine Wahl; Wege kreuzen sich nicht", () => {
    jederPlan((p, nr) => {
        const k = TURM.kennzahlen(p);
        wahr(k.wege >= 2, TURM.ort(nr).name + " " + p.seed.text + ": " + k.wege + " Wege");
        wahr(p.knoten.some((x) => p.nach(x.id).length > 1), "eine Wahl (am Eingang oder darüber)");
        /* Kanten zwischen zwei Stockwerken dürfen sich nicht überkreuzen. */
        for (const [a, b] of p.kanten) {
            for (const [c, d] of p.kanten) {
                const A = p.knotenVon(a), B = p.knotenVon(b), C = p.knotenVon(c), D = p.knotenVon(d);
                if (A.f === C.f && A.f >= 1 && B.x !== "b" && D.x !== "b") {
                    wahr(!((A.x < C.x && B.x > D.x) || (A.x > C.x && B.x < D.x)), "Kreuzung " + a + ">" + b + " / " + c + ">" + d);
                }
            }
        }
    });
});

pruefe("Boss-Abstand: jeder Weg geht jedes Stockwerk genau einmal, der Boss oben; Partien je Weg im Rahmen des Orts", () => {
    jederPlan((p, nr) => {
        const O = TURM.ort(nr);
        for (const weg of TURM.wege(p)) {
            gleich(weg.length, O.stock, O.name + ": Stationen bis zum Boss");
            weg.forEach((id, i) => gleich(p.knotenVon(id).f, i + 1, "Stockwerk " + (i + 1)));
            gleich(p.knotenVon(weg[weg.length - 1]).art, "b", "oben der Boss");
            const kaempfe = weg.filter((id) => TURM.istKampf(p.knotenVon(id).art)).length;
            wahr(kaempfe >= O.partien[0] && kaempfe <= O.partien[1],
                O.name + " " + p.seed.text + ": " + kaempfe + " Partien, Rahmen " + O.partien.join("–"));
            wahr(kaempfe < ALTE_STUFEN[nr - 1] || (nr === 1 && kaempfe <= 3), O.name + ": weniger als der alte Turm");
        }
        wahr(O.partien[1] - O.partien[0] <= 1, "±1");
    });
});

pruefe("Feste Reihen: Stockwerk 1 Gegner, vorletztes Rast, eine Truhe in der Mitte, Händler nicht unten", () => {
    jederPlan((p, nr) => {
        const O = TURM.ort(nr);
        for (const k of p.knoten) {
            if (k.f === 1) {
                gleich(k.art, "g", "Stockwerk 1");
            }
            if (k.f === O.stock - 1) {
                gleich(k.art, "r", "vorletztes Stockwerk");
            }
            if (k.art === "h") {
                wahr(k.f >= 3, "Händler ab Stockwerk 3");
            }
            if (k.art === "r") {
                wahr(k.f !== 2, "keine Rast auf Stockwerk 2");
            }
            if (k.art === "e") {
                wahr(k.f >= 2, "Elite ab Stockwerk 2");
            }
        }
        gleich(p.knoten.filter((k) => k.art === "t").length, 1, "genau eine Truhe");
        gleich(p.knoten.filter((k) => k.art === "t")[0].f, Math.ceil(O.stock / 2), "Truhe in der Mitte");
        gleich(p.knoten.filter((k) => k.art === "b").length, 1, "ein Boss");
    });
});

pruefe("Elite: +2 Stärke, eine Verschärfung, ab Holzhalle fast immer so viele wie verlangt", () => {
    let zuWenig = 0;
    let plaene = 0;
    jederPlan((p, nr) => {
        const O = TURM.ort(nr);
        for (const k of p.knoten.filter((x) => x.art === "e")) {
            gleich(k.staerke, Math.min(10, TURM.staerke(O, k.f, "g") + 2), "Elite +2");
            wahr(TURM.ELITE.some((e) => e.name === k.gegner && e.eigen === k.eigen), "Verschärfung aus der Liste");
        }
        if (O.eliteMin > 0) {
            plaene++;
            const e = p.knoten.filter((x) => x.art === "e").length;
            const moeglich = e + p.knoten.filter((x) => x.art === "g" && x.f >= 2).length;
            wahr(e >= Math.min(O.eliteMin, moeglich), O.name + ": Elite " + e + " von " + O.eliteMin);
            zuWenig += e < O.eliteMin ? 1 : 0;
        } else {
            gleich(p.knoten.filter((x) => x.art === "e").length, 0, "Werkbank ohne Elite");
        }
    });
    wahr(zuWenig / plaene < 0.2, "zu wenig Elite nur selten (" + zuWenig + "/" + plaene + ")");
});

pruefe("Jede Kampf-Station ist spielbar: Spielart, Bob-Stufe, Menge, feste Farbe, Turm-Angabe", () => {
    const botStufen = ["leicht", "mittel", "schwer", "meister"];
    const mengen = SCHACH_VARIANTEN.LOOTBOX_MENGEN.map((m) => m.id);
    const farben = { weiss: 0, schwarz: 0 };
    jederPlan((p, nr) => {
        for (const k of p.knoten.filter((x) => TURM.istKampf(x.art))) {
            const r = TURM.regelnFuer(nr, k);
            const wo = TURM.titel(nr, k.nr) + " " + p.seed.text;
            wahr(SCHACH_VARIANTEN.gibtEs(r.spielart), wo + ": Spielart " + r.spielart);
            wahr(!SCHACH_VARIANTEN.holen(r.spielart).versteckt, wo + ": Spielart versteckt");
            wahr(botStufen.indexOf(r.botStufe) !== -1, wo + ": Bob-Stufe " + r.botStufe);
            wahr(mengen.indexOf(r.lootboxMenge) !== -1, wo + ": Menge " + r.lootboxMenge);
            gleich(r.turmSeite, k.farbe, wo + ": Farbe aus dem Seed");
            gleich(r.gegenComputer, true, wo + ": gegen Bob");
            gleich(r.sichtbarkeit, "privat", wo + ": privat");
            const angabe = SCHACH_RUNDE.turmAngabe(r.turm);
            wahr(angabe && angabe.ort === nr && angabe.stufe === k.nr, wo + ": Turm-Angabe gültig");
            wahr(k.gegner && typeof k.eigen === "string", wo + ": Gegner");
            farben[k.farbe]++;
        }
    });
    const anteil = farben.weiss / (farben.weiss + farben.schwarz);
    wahr(anteil > 0.45 && anteil < 0.55, "Farbe zufällig, etwa halb/halb (" + anteil.toFixed(3) + ")");
    gleich(TURM.bot(1), "leicht", "Stärke 1");
    gleich(TURM.bot(5), "mittel", "Stärke 5");
    gleich(TURM.bot(7), "schwer", "Stärke 7");
    gleich(TURM.bot(10), "meister", "Stärke 10");
    gleich(TURM.bot(4, 1), "schwer", "Eisenfaust eine Stufe stärker");
});

pruefe("Stationen haben ihren Inhalt: Fund 2 Angebote, Händler Waren, Truhe Münzen und Ware", () => {
    jederPlan((p, nr) => {
        const O = TURM.ort(nr);
        for (const k of p.knoten) {
            if (k.art === "f") {
                gleich(k.angebote.length, 2, "Fund");
                wahr(k.angebote.every((id) => { const a = TURM.FUND.find((x) => x.id === id); return a && (O.herzen || !a.herzen); }),
                    "Fund passt zum Ort");
            }
            if (k.art === "h") {
                wahr(k.waren.length >= 2 && k.waren.every((id) => TURM.HAENDLER.some((w) => w.id === id)), "Händler");
                wahr(O.herzen || k.waren.indexOf("herz") === -1, "ohne Herzen kein Herz beim Händler");
            }
            if (k.art === "t") {
                wahr(k.muenzen >= 15 && k.muenzen <= 45, "Truhe Münzen " + k.muenzen);
                wahr(k.item === "tipp" || k.item === "leben", "Truhe Ware");
            }
        }
    });
});

/* ------------------------------------------------------------------ *
 * Speicher-Form (Regel §13)
 * ------------------------------------------------------------------ */

pruefe("Schlüssel passen in die Regel §13: figuren „ort-nr“ (1–2 Ziffern), schwuere bis 3 Ziffern, Stufe ≤ 50", () => {
    jederPlan((p, nr) => {
        const nummern = new Set();
        for (const k of p.knoten.filter((x) => x.art !== "ein")) {
            wahr(/^[0-9]{1,2}-[0-9]{1,2}$/.test(TURM.schluessel(nr, k.nr)), "figuren-Schlüssel " + k.nr);
            wahr(/^[0-9]{1,3}$/.test(TURM.stationsSchluessel(nr, k.nr)), "schwuere-Schlüssel");
            wahr(k.nr >= TURM.NR_AB && k.nr <= 50, "Nummer 10–50");
            wahr(!nummern.has(k.nr), "Nummer einmalig");
            nummern.add(k.nr);
        }
    });
    gleich(TURM.nummer(1, 0), 10, "erste Station");
    gleich(TURM.nummer(8, 2), 33, "höchste Station unter dem Boss");
    gleich(TURM.nummer(9, "b"), 40, "Boss");
});

pruefe("Fortschritt: Station ohne Partie → schwuere = 1 und Zähler wachsen; die Konto-Form bleibt gültig", () => {
    let stand = FORTSCHRITT.turmStation(FORTSCHRITT.leer(), "216", { muenzenVerdient: 22, tippGekauft: 1 }, 5);
    gleich(FORTSCHRITT.turmSchwuere(stand)["216"], 1, "betreten");
    gleich(FORTSCHRITT.zweig(stand).zaehler.muenzenVerdient, 22, "Münzen");
    stand = FORTSCHRITT.turmStation(stand, "216", { muenzenVerdient: 5, "kaputt-1": 3, minus: -4 }, 6);
    gleich(FORTSCHRITT.zweig(stand).zaehler.muenzenVerdient, 27, "wächst weiter");
    wahr(!("kaputt-1" in FORTSCHRITT.zweig(stand).zaehler) && !("minus" in FORTSCHRITT.zweig(stand).zaehler), "nur gültige Zähler");
    stand = FORTSCHRITT.turmStation(stand, "9999", {}, 7);
    wahr(!("9999" in FORTSCHRITT.turmSchwuere(stand)), "zu lange Schlüssel nie");
    stand = FORTSCHRITT.partieZaehlen(stand, "p-1", 8, undefined, { schluessel: "2-40", figuren: 2 });
    const konto = FORTSCHRITT.fuerKonto(stand);
    const turm = konto.spiele.blunderluck.turm;
    gleich(Object.keys(turm).sort().join(","), "figuren,schwuere", "nur figuren und schwuere");
    gleich(turm.figuren["2-40"], 2, "Boss-Figuren");
    gleich(turm.schwuere["216"], 1, "Station");
});

/* ------------------------------------------------------------------ *
 * Der Lauf: Position, Kreuzung, nur vorwärts, Herzen, Rückfall
 * ------------------------------------------------------------------ */

const spieler = "lauf-test";
const planHolz = () => TURM.plan(2, { spieler: spieler });
/* Einen Weg gehen: je Station den passenden Eintrag setzen. */
function gehen(ids, nr) {
    const p = TURM.plan(nr, { spieler: spieler });
    const figuren = {};
    const schwuere = {};
    for (const id of ids) {
        const k = p.knotenVon(id);
        if (TURM.istKampf(k.art)) {
            figuren[TURM.schluessel(nr, k.nr)] = 1;
        } else {
            schwuere[TURM.stationsSchluessel(nr, k.nr)] = 1;
        }
    }
    return { figuren: figuren, schwuere: schwuere };
}

pruefe("Lauf: am Anfang am Eingang, vorne die Stationen auf Stockwerk 1", () => {
    const lauf = TURM.lauf(2, { spieler: spieler });
    gleich(lauf.pos, "0-e", "Eingang");
    gleich(lauf.front.slice().sort().join(","), planHolz().nach("0-e").slice().sort().join(","), "vorne");
    gleich(lauf.front.map((id) => lauf.plan.knotenVon(id).x).join(","), "0,1,2", "von links nach rechts");
    gleich(lauf.herzen, 5, "5 Herzen");
    gleich(TURM.lauf(1, { spieler: spieler }).herzen, null, "Werkbank ohne Herzen");
});

pruefe("Lauf: gegangene Station → weiter oben; nur vorwärts (die andere Spur fällt weg)", () => {
    const p = planHolz();
    const erst = p.nach("0-e");
    const a = erst[0];
    const lauf = TURM.lauf(2, Object.assign({ spieler: spieler }, gehen([a], 2)));
    gleich(lauf.pos, a, "steht auf der gewonnenen Station");
    gleich(lauf.front.slice().sort().join(","), p.nach(a).slice().sort().join(","), "vorne die Nachfolger");
    for (const b of erst.slice(1)) {
        wahr(lauf.front.indexOf(b) === -1, "andere Spur nicht mehr vorne");
    }
    /* Einen ganzen Weg bis zur Rast: vorne nur der Boss. */
    const weg = TURM.wege(p)[0];
    const bisRast = TURM.lauf(2, Object.assign({ spieler: spieler }, gehen(weg.slice(0, -1), 2)));
    gleich(bisRast.front.join(","), weg[weg.length - 1], "vorne der Boss");
    gleich(bisRast.plan.knotenVon(bisRast.pos).art, "r", "auf der Rast");
    const oben = TURM.lauf(2, Object.assign({ spieler: spieler }, gehen(weg, 2)));
    gleich(oben.geschafft, true, "geschafft");
    gleich(oben.front.length, 0, "nichts mehr vorne");
});

pruefe("Kreuzung: irgendwo auf jedem Holzhallen-Turm gibt es eine Wahl mit zwei Wegen", () => {
    for (let i = 0; i < 40; i++) {
        const p = TURM.plan(2, { spieler: "k" + i });
        wahr(p.knoten.some((k) => k.art !== "ein" && p.nach(k.id).length >= 2) || p.nach("0-e").length >= 2, "Wahl");
    }
});

pruefe("Herzen: Niederlage −1/−2/−3, bei 0 Rückfall zur letzten Rast oder besiegten Elite, Herzen voll", () => {
    const p = planHolz();
    const weg = TURM.wege(p)[0];
    const bisRast = weg.slice(0, -1);
    const lauf = TURM.lauf(2, Object.assign({ spieler: spieler, herzen: 3 }, gehen(bisRast, 2)));
    const boss = weg[weg.length - 1];
    gleich(lauf.cp, bisRast[bisRast.length - 1], "Rast ist Rückfall-Punkt");
    const r = TURM.nachNiederlage(lauf, boss, { herzen: 3 });
    gleich(r.minus, 3, "Boss −3");
    gleich(r.rueckfall, lauf.cp, "Rückfall zur Rast");
    gleich(r.geraet.herzen, 5, "Herzen voll");
    /* Ein Gegner auf Stockwerk 1 bei 1 Herz: zurück zum Anfang, Stufe 1 neu. */
    const vorne = TURM.lauf(2, Object.assign({ spieler: spieler, herzen: 1 }, gehen([weg[0]], 2)));
    const g = p.nach(weg[0]).find((id) => TURM.istKampf(p.knotenVon(id).art));
    if (g) {
        const r2 = TURM.nachNiederlage(vorne, g, { herzen: 1 });
        gleich(r2.rueckfall, "0-e", "an den Anfang");
        gleich(r2.geraet.wieder.join(","), weg[0], "Stockwerk 1 neu zu spielen");
        const danach = TURM.lauf(2, Object.assign({ spieler: spieler }, gehen([weg[0]], 2), r2.geraet));
        gleich(danach.pos, "0-e", "steht wieder am Eingang");
        wahr(danach.front.indexOf(weg[0]) !== -1, "die Station ist wieder vorne");
        const neu = TURM.nachSieg(danach, weg[0], r2.geraet);
        gleich(neu.wieder.length, 0, "nach dem Sieg nicht mehr neu");
    }
    const eins = TURM.nachNiederlage(vorne, weg[1], { herzen: 5 });
    wahr(eins.minus >= 0 && eins.geraet.herzen === 5 - eins.minus || eins.rueckfall, "Herz ab");
});

pruefe("Elite besiegt → Herzen voll; Werkbank kostet keine Herzen", () => {
    for (let i = 0; i < 60; i++) {
        const p = TURM.plan(2, { spieler: "e" + i });
        const e = p.knoten.find((k) => k.art === "e");
        if (!e) {
            continue;
        }
        const lauf = TURM.lauf(2, { spieler: "e" + i, herzen: 2 });
        gleich(TURM.nachSieg(lauf, e.id, { herzen: 2 }).herzen, 5, "Herzen voll");
        break;
    }
    const w = TURM.lauf(1, { spieler: spieler });
    const r = TURM.nachNiederlage(w, w.front[0], { herzen: 5 });
    gleich(r.minus, 0, "Werkbank ohne Herzen");
});

/* ------------------------------------------------------------------ *
 * Übernahme des alten Turms (bis v0.159.0)
 * ------------------------------------------------------------------ */

pruefe("Übernahme: alte Türen bleiben offen, erreichter Ort und Tür-Zähler gleich, Figuren zählen weiter", () => {
    const alt = { "1-0": 1, "1-1": 2, "1-2": 1, "1-3": 3, "2-0": 1, "2-1": 1, "2-2": 2, "2-3": 1, "2-4": 1, "3-0": 1 };
    gleich(TURM.erreicht(alt), 3, "Marmorsaal wie vorher");
    gleich(TURM.tueren(alt), 2, "zwei Türen offen");
    gleich(TURM.tuerOffen(alt, 1) && TURM.tuerOffen(alt, 2), true, "Werkbank und Holzhalle offen");
    gleich(TURM.tuerOffen(alt, 3), false, "Marmorsaal zu");
    gleich(TURM.figurenImOrt(alt, 1), 7, "alte Figuren im Ort bleiben");
    const holz = TURM.lauf(2, { spieler: spieler, figuren: alt });
    gleich(holz.geschafft, true, "Holzhalle gilt als geschafft");
    const marmor = TURM.lauf(3, { spieler: spieler, figuren: alt });
    gleich(marmor.pos, "0-e", "angefangener Ort beginnt unten");
});

pruefe("Übernahme: wer im alten Turm vor dem Boss stand, steht wieder vor dem Boss (nach der Rast)", () => {
    const alt = { "1-0": 1, "1-1": 1, "1-2": 1, "1-3": 1, "2-0": 1, "2-1": 1, "2-2": 1, "2-3": 1 };
    gleich(TURM.erreicht(alt), 2, "Holzhalle");
    const lauf = TURM.lauf(2, { spieler: spieler, figuren: alt });
    const O = TURM.ort(2);
    gleich(lauf.plan.knotenVon(lauf.pos).f, O.stock - 2, "Stockwerk unter der Rast");
    wahr(lauf.front.length >= 1 && lauf.front.every((id) => lauf.plan.knotenVon(id).art === "r"), "vorne die Rast");
    wahr(lauf.uebernommen(lauf.pos), "als übernommen markiert");
    /* Spielt man dann die Rast, bleibt der übernommene Weg darunter stehen. */
    const rast = lauf.front[0];
    const weiter = TURM.lauf(2, Object.assign({ spieler: spieler, figuren: alt },
        { schwuere: { [TURM.stationsSchluessel(2, lauf.plan.knotenVon(rast).nr)]: 1 } }));
    gleich(weiter.pos, rast, "jetzt auf der Rast");
    gleich(weiter.front.join(","), "7-b", "vorne der Boss");
});

pruefe("Neuer Boss-Schlüssel öffnet die Tür; ein alter und ein neuer zählen gleich", () => {
    gleich(TURM.erreicht({ "1-40": 1 }), 2, "neuer Boss");
    gleich(TURM.erreicht({ "1-3": 1 }), 2, "alter Boss");
    gleich(TURM.istBoss(1, 40), true, "40 ist Boss");
    gleich(TURM.istBoss(1, 3), true, "alte Stufe 3 der Werkbank war Boss");
    gleich(TURM.istBoss(1, 13), false, "Station 13 kein Boss");
    const f = {};
    for (let nr = 1; nr <= 6; nr++) {
        f[TURM.schluessel(nr, TURM.BOSS_NR)] = 1;
    }
    gleich(TURM.erreicht(f), 7, "über dem letzten Ort");
});

pruefe("Figuren: verloren 0, Sieg 1, mit Genauigkeit 2 und 3 nach den Schwellen des Orts", () => {
    gleich(TURM.figurenFuer(false, 1, 99), 0, "verloren");
    gleich(TURM.figurenFuer(true, 1), 1, "Sieg ohne Wertung = Bauer");
    gleich(TURM.figurenFuer(true, 1, 59), 1, "Werkbank 59 %");
    gleich(TURM.figurenFuer(true, 1, 60), 2, "Werkbank 60 %");
    gleich(TURM.figurenFuer(true, 1, 80), 3, "Werkbank 80 %");
    gleich(TURM.figurenFuer(true, 6, 89), 2, "Meisterliga 89 %");
    gleich(TURM.figurenFuer(true, 6, 90), 3, "Meisterliga 90 %");
});

pruefe("Titel: Stockwerk oder Boss; alte Stufen wie bisher", () => {
    gleich(TURM.titel(2, 16), "Holzhalle · 3", "Station 16 = Stockwerk 3");
    gleich(TURM.titel(2, 40), "Holzhalle · Boss", "Boss");
    gleich(TURM.titel(2, 1), "Holzhalle · 2", "alte Stufe 1");
    gleich(TURM.titel(2, 4), "Holzhalle · Boss", "alte Boss-Stufe");
});

/* ------------------------------------------------------------------ *
 * An der Partie
 * ------------------------------------------------------------------ */

pruefe("Die Partie trägt ihre Turm-Station durch Anlegen und Normalisieren", () => {
    const p = planHolz();
    const k = p.knoten.find((x) => x.art === "b");
    const regeln = TURM.regelnFuer(2, k);
    const ergebnis = SCHACH_TAFEL.partieAnlegen(SCHACH_TAFEL.leereTafel(), regeln.spielart,
        TURM.titel(2, k.nr), 5000, regeln);
    gleich(ergebnis.partie.regeln.turm.ort, 2, "Ort angelegt");
    gleich(ergebnis.partie.regeln.turm.stufe, 40, "Boss-Nummer angelegt");
    gleich(ergebnis.partie.regeln.botStufe, TURM.bot(k.staerke), "Bob-Stufe aus der Stärke");
    const wieder = SCHACH_RUNDE.normalisieren(JSON.parse(JSON.stringify(ergebnis.partie)));
    gleich(wieder.regeln.turm.stufe, 40, "Nummer nach dem Normalisieren");
    gleich(SCHACH_RUNDE.normalisieren(SCHACH_RUNDE.leereRunde(1, "standard", "p", "x")).regeln.turm, null,
        "gewöhnliche Partie ohne Turm");
    gleich(SCHACH_RUNDE.turmAngabe({ ort: "2", stufe: 1 }), null, "Text statt Zahl");
    gleich(SCHACH_RUNDE.turmAngabe({ ort: 0, stufe: 1 }), null, "Ort 0");
});

/* ------------------------------------------------------------------ *
 * Im Fortschritt
 * ------------------------------------------------------------------ */

pruefe("Fortschritt: Sieg im Turm gibt Partie-XP und je neue Figur +10, die beste Wertung bleibt", () => {
    let stand = FORTSCHRITT.partieZaehlen(FORTSCHRITT.leer(), "p-1", 1, undefined,
        { schluessel: "1-10", figuren: 1 });
    gleich(FORTSCHRITT.gesamtXp(stand), 20, "10 Partie + 10 Figur");
    gleich(FORTSCHRITT.turmFiguren(stand)["1-10"], 1, "Figur gemerkt");
    stand = FORTSCHRITT.partieZaehlen(stand, "p-2", 2, undefined, { schluessel: "1-10", figuren: 3 });
    gleich(FORTSCHRITT.gesamtXp(stand), 50, "+10 Partie, +20 für zwei neue Figuren");
    stand = FORTSCHRITT.partieZaehlen(stand, "p-3", 3, undefined, { schluessel: "1-10", figuren: 1 });
    gleich(FORTSCHRITT.turmFiguren(stand)["1-10"], 3, "schlechtere Wertung ändert nichts");
    stand = FORTSCHRITT.partieZaehlen(stand, "p-4", 4, undefined, { schluessel: "1-11", figuren: 0 });
    wahr(!("1-11" in FORTSCHRITT.turmFiguren(stand)), "verloren gibt keine Figur");
});

pruefe("Fortschritt: kaputte Turm-Einträge fliegen beim Normalisieren", () => {
    const stand = FORTSCHRITT.normalisieren({ spiele: { blunderluck: { xp: 5,
        turm: { figuren: { "1-0": 2, "x": 3, "2-1": 9, "3-0": -1, "4-0": "3" } } } } });
    const f = FORTSCHRITT.turmFiguren(stand);
    gleich(Object.keys(f).sort().join(","), "1-0,2-1", "nur gültige Schlüssel");
    gleich(f["2-1"], 3, "höchstens 3");
});

/* ------------------------------------------------------------------ *
 * Freischaltung über Orte (die Orte sind dieselben geblieben)
 * ------------------------------------------------------------------ */

pruefe("Freischaltung: 3D-Brett ab Holzhalle, 3D-Figuren ab Marmorsaal, Themen je Ort — auch aus altem Stand", () => {
    globalThis.location = { hostname: "up-birdo.github.io", search: "" };
    const FREISCHALTUNG = require(pfad.join(__dirname, "..", "js", "freischaltung.js"));
    let ort = 1;
    globalThis.FORTSCHRITT_KONTO = { turmOrt: () => ort, level: () => ({ level: 1 }) };
    try {
        gleich(FREISCHALTUNG.SPERRE_3D, true, "Sperre an");
        gleich(FREISCHALTUNG.arena(), 1, "Werkbank");
        gleich(FREISCHALTUNG.dreiDFrei(), false, "3D-Figuren noch zu");
        gleich(FREISCHALTUNG.brettDreiDFrei(), false, "3D-Brett noch zu");
        gleich(FREISCHALTUNG.brettStueckFrei("thema", "blunderluck"), true, "Vorgabe immer frei");
        gleich(FREISCHALTUNG.brettStueckFrei("thema", "holz"), false, "Holz zu");
        gleich(FREISCHALTUNG.brettStueckFrei("design2d", "grau"), true, "Design Grau immer frei");
        gleich(FREISCHALTUNG.brettStueckFrei("design2d", "holz"), false, "Design Holz zu");
        /* Ein alter Stand (Werkbank-Boss im alten Turm) → Holzhalle → 3D-Brett. */
        ort = TURM.erreicht({ "1-0": 1, "1-1": 1, "1-2": 1, "1-3": 1 });
        gleich(ort, 2, "alter Stand: Holzhalle");
        gleich(FREISCHALTUNG.brettDreiDFrei(), true, "3D-Brett ab Holzhalle");
        gleich(FREISCHALTUNG.dreiDFrei(), false, "3D-Figuren noch nicht in der Holzhalle");
        gleich(FREISCHALTUNG.brettStueckFrei("thema", "holz"), true, "Holz ab Holzhalle");
        gleich(FREISCHALTUNG.brettStueckFrei("design2d", "holz"), true, "Design Holz ab Holzhalle");
        gleich(FREISCHALTUNG.brettStueckFrei("figuren", "matt"), true, "Matt ab Holzhalle");
        gleich(FREISCHALTUNG.brettStueckFrei("thema", "marmor"), false, "Marmor noch zu");
        /* Neuer Turm: Holzhallen-Boss (Nummer 40) → Marmorsaal → 3D-Figuren. */
        ort = TURM.erreicht({ "1-3": 1, "2-40": 2 });
        gleich(ort, 3, "neuer Stand: Marmorsaal");
        gleich(FREISCHALTUNG.dreiDFrei(), true, "3D-Figuren ab Marmorsaal");
        gleich(TURM.FREI_AB.brettDreiD < TURM.FREI_AB.dreiD, true, "Brett vor Figuren");
        gleich(TURM.ort(TURM.FREI_AB.brettDreiD).name + "/" + TURM.ort(TURM.FREI_AB.dreiD).name,
            "Holzhalle/Marmorsaal", "Orte der Freischaltung");
        ort = 5;
        gleich(FREISCHALTUNG.brettStueckFrei("thema", "turnier"), true, "Turnier ab Turniersaal");
    } finally {
        delete globalThis.FORTSCHRITT_KONTO;
    }
});

console.log(anzahlOk + " ok, " + anzahlFehler + " Fehler");
process.exit(anzahlFehler === 0 ? 0 : 1);
