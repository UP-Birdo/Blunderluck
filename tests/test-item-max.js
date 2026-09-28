/*
 * test-item-max.js — höchstens N Items auf der Hand (seit v0.152.4). Nutzer 28.09.2026: „ein Max an Items
 * einstellen, alles, was man über das Max aufnimmt, verpufft".
 *
 * Geprüft: Regel im Datenvertrag (Vorgabe ohne Grenze für alte Partien, nur kleine ganze Zahlen), volle Hand →
 * die eingesammelte Lootbox verpufft (weg vom Brett, nicht in der Hand, Verlauf „verpufft"), für Menschen und Bob,
 * ohne Grenze wie bisher; der Dieb füllt nur bis zur Grenze; der Anlege-Bildschirm schlägt 4 vor, die Schildchen
 * nennen „Hand max N".
 *
 * Aufruf: siehe tests\README.md
 */

const pfad = require("path");
const fs = require("fs");

globalThis.SCHACH_VARIANTEN = require(pfad.join(__dirname, "..", "js", "schach-varianten.js"));
globalThis.SCHACH = require(pfad.join(__dirname, "..", "js", "schach.js"));
globalThis.SCHACH_RUNDE = require(pfad.join(__dirname, "..", "js", "schach-runde.js"));
require(pfad.join(__dirname, "..", "js", "schach-runde-faehigkeiten.js"));
const SCHACH_BOT = require(pfad.join(__dirname, "..", "js", "schach-bot.js"));
const V = globalThis.SCHACH_VARIANTEN;
const R = globalThis.SCHACH_RUNDE;

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

/* Eine laufende Partie Anna (Weiss) gegen Bob, Lootbox auf e4 (36), Hand wie angegeben. */
function partie(itemMax, hand) {
    let r = R.leereRunde(1000, "standard", "p-max", "Max");
    r = R.teamBeitreten(r, "a", "weiss", 1000);
    r = SCHACH_BOT.inRundeSetzen(r, "schwarz", 1000);
    r = R.aufstellungBereitSetzen(R.bereitSetzen(r, "weiss", true, 1000), "weiss", true, 1000);
    r = R.kopieren(r);
    r.regeln.faehigkeiten = true;
    r.regeln.itemMax = itemMax;
    r.faehigkeiten.weiss = hand.slice();
    r.bonus = [{ feld: 36, art: "doppelzug" }];
    return R.normalisieren(JSON.parse(JSON.stringify(r)));
}

pruefe("Datenvertrag: alte Partie ohne Grenze, nur 1–20 zählt", () => {
    gleich(R.leereRunde(1, "standard").regeln.itemMax, 0, "Vorgabe im Modell");
    gleich(R.normalisieren({ regeln: {} }).regeln.itemMax, 0, "alte Partie");
    gleich(R.normalisieren({ regeln: { itemMax: 3 } }).regeln.itemMax, 3, "3");
    gleich(R.normalisieren({ regeln: { itemMax: 99 } }).regeln.itemMax, 0, "Unsinn");
    gleich(R.normalisieren({ regeln: { itemMax: "4" } }).regeln.itemMax, 0, "kein Text");
    gleich(V.ITEM_MAX.map((e) => e.wert), [2, 3, 4, 5, 0], "Stufen");
    gleich(V.ITEM_MAX_VORGABE, 4, "Vorschlag 4");
});

pruefe("Volle Hand: die Lootbox verpufft (weg vom Brett, nicht in der Hand)", () => {
    const r = partie(2, ["schutzschild", "mauer"]);
    const n = R.ziehen(r, "a", 52, 36, "D", "Anna", 2);
    wahr(n, "Zug geht");
    gleich(n.faehigkeiten.weiss, ["schutzschild", "mauer"], "Hand unverändert");
    gleich(n.bonus.some((b) => b.feld === 36), false, "Lootbox weg");
    const eintrag = n.verlauf.find((e) => e.wirkung === "verpufft");
    wahr(eintrag && /verpufft · Hand voll/.test(eintrag.text), "Verlauf: " + JSON.stringify(n.verlauf.slice(-2)));
    gleich(eintrag.felder, [36], "Feld");
    gleich(eintrag.farbe, "weiss", "Seite");
});

pruefe("Platz frei oder ohne Grenze: wie bisher eingesammelt", () => {
    const frei = R.ziehen(partie(3, ["schutzschild", "mauer"]), "a", 52, 36, "D", "Anna", 2);
    gleich(frei.faehigkeiten.weiss.length, 3, "passt noch");
    const ohne = R.ziehen(partie(0, ["schutzschild", "mauer", "frost", "fessel", "spiegel"]), "a", 52, 36, "D", "Anna", 2);
    gleich(ohne.faehigkeiten.weiss.length, 6, "ohne Grenze");
});

pruefe("Bob hält sich auch daran", () => {
    let r = partie(1, []);
    r = R.kopieren(r);
    r.faehigkeiten.schwarz = ["mauer"];
    r.bonus = [{ feld: 20, art: "doppelzug" }];
    r.stand = Object.assign({}, r.stand, { amZug: "schwarz" });
    /* e7 → e5 überquert e6 (20): Bob zieht selbst, hier derselbe Weg über `ziehen`. */
    const n = R.ziehen(r, "bot", 12, 28, "D", "Bob", 3);
    wahr(n, "Bob zieht");
    gleich(n.faehigkeiten.schwarz, ["mauer"], "Bobs Hand bleibt bei 1");
    wahr(n.verlauf.some((e) => e.wirkung === "verpufft" && e.farbe === "schwarz"), "verpufft bei Bob");
});

pruefe("Der Dieb füllt nur bis zur Grenze", () => {
    let r = partie(2, ["dieb"]);
    r = R.kopieren(r);
    r.faehigkeiten.schwarz = ["mauer", "frost", "fessel"];
    const n = R.faehigkeitEinsetzen(r, "a", "dieb", -1, "Anna", 2);
    if (n) {
        wahr(n.faehigkeiten.weiss.length <= 2, "höchstens 2: " + JSON.stringify(n.faehigkeiten.weiss));
    }
});

pruefe("Anlegen schlägt 4 vor, Schildchen nennen die Grenze, Rückschau ohne Verpuffen", () => {
    const ts = fs.readFileSync(pfad.join(__dirname, "..", "js", "team-schach.js"), "utf8");
    wahr(/itemMax: SCHACH_VARIANTEN\.ITEM_MAX_VORGABE/.test(ts), "Vorgabe im Bildschirm");
    wahr(/itemMax: wunsch\.itemMax/.test(ts), "Anlegen gibt sie mit");
    wahr(/"Hand max " \+ regeln\.itemMax/.test(ts), "Schildchen");
    wahr(/Hand voll · verpufft/.test(ts), "Hinweis am Bildschirm");
    const ue = fs.readFileSync(pfad.join(__dirname, "..", "js", "team-schach-uebersicht.js"), "utf8");
    wahr(/_regelSetzen\("itemMax"/.test(ue), "Regler");
    const r = R.ziehen(partie(1, ["mauer"]), "a", 52, 36, "D", "Anna", 2);
    gleich(R.rueckschau(r, "weiss").wendepunkte.some((w) => /verpufft/.test(w.text || "")), false, "Rückschau");
});

console.log(anzahlOk + " ok, " + anzahlFehler + " Fehler");
process.exit(anzahlFehler === 0 ? 0 : 1);
