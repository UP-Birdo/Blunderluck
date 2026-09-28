/*
 * test-faehigkeit-absage.js — warum eine Fähigkeit gerade nicht geht (seit v0.152.3).
 *
 * Nutzer 28.09.2026: „Verstärken kann man nicht einsetzen" · „ging einfach für ein paar Runden nicht", dazu ein
 * Dialog „König im Schach · Fähigkeit bleibt" in einer Stellung mit drei weissen Königen. Der Bildschirm riet den
 * Grund; jetzt nennt ihn das Modell (`SCHACH_RUNDE.faehigkeitAbsage`) mit derselben Rechnung wie das Einsetzen.
 *
 * Geprüft auf dem kleinen Brett (6×6): mehrere Könige = kein Schach (auch wenn ein Springer einen davon angreift),
 * Verstärkung geht dort; ein einzelner König im Schach sperrt die Verstärkung („imSchach") — aber nur, solange er
 * im Schach steht, nicht über weitere Züge; „gäbe Schach" als eigener Grund; die Absage passt immer zum Einsetzen.
 *
 * Aufruf: siehe tests\README.md
 */

const pfad = require("path");

globalThis.SCHACH_VARIANTEN = require(pfad.join(__dirname, "..", "js", "schach-varianten.js"));
globalThis.SCHACH = require(pfad.join(__dirname, "..", "js", "schach.js"));
globalThis.SCHACH_RUNDE = require(pfad.join(__dirname, "..", "js", "schach-runde.js"));
require(pfad.join(__dirname, "..", "js", "schach-runde-faehigkeiten.js"));
const SCHACH_BOT = require(pfad.join(__dirname, "..", "js", "schach-bot.js"));
const SCHACH = globalThis.SCHACH;
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

/* Feld auf dem 6×6-Brett: „d1" → Nummer (Reihe 6 oben). */
function feld(name) {
    return (6 - Number(name[1])) * 6 + (name.charCodeAt(0) - 97);
}

/* Eine laufende Partie Anna (Weiss) gegen Bob auf dem kleinen Brett mit dieser Stellung. */
function stellung(figuren, faehigkeiten, extra) {
    let r = R.leereRunde(1000, "klein", "p-absage", "Absage");
    r = R.teamBeitreten(r, "id-anna", "weiss", 1000);
    r = SCHACH_BOT.inRundeSetzen(r, "schwarz", 1000);
    r = R.aufstellungBereitSetzen(R.bereitSetzen(r, "weiss", true, 1000), "weiss", true, 1000);
    r = R.kopieren(r);
    const brett = Array(36).fill(".");
    for (const name of Object.keys(figuren)) {
        brett[feld(name)] = figuren[name];
    }
    r.stand = Object.assign({}, r.stand, { brett: brett.join(""), amZug: "weiss", rochadeKoenige: [], rochade: "" },
        extra || {});
    r.faehigkeiten.weiss = faehigkeiten || ["verstaerkung"];
    r.regeln.faehigkeiten = true;
    /* Wie aus der Datenbank. */
    return R.normalisieren(JSON.parse(JSON.stringify(r)));
}

/* Absage und Einsetzen erzählen dasselbe: "" genau dann, wenn ein Feld (bzw. der Einsatz) geht. */
function passtZumEinsetzen(r, art) {
    const absage = R.faehigkeitAbsage(r, "id-anna", art);
    const felder = R.zielFelder(r, "id-anna", art);
    const geht = felder.some((f) => !!R.faehigkeitEinsetzen(r, "id-anna", art, f, "Anna", 2));
    gleich(absage === "", geht, "Absage „" + absage + "“ passt zum Einsetzen");
    return absage;
}

pruefe("Bild 1: drei weisse Könige, Springer greift einen an — kein Schach, Verstärkung geht", () => {
    const r = stellung({ d1: "K", f6: "K", c3: "K", b1: "s", a6: "k" }, ["verstaerkung"], { koenigeAlsLeben: true });
    gleich(SCHACH.imSchach(r.stand, "weiss"), false, "mehrere Könige = kein Schach");
    gleich(SCHACH.koenigSchlagbarFuer(r.stand, "weiss"), true, "Könige sind Leben");
    wahr(SCHACH.alleZuege(r.stand).length > 0, "normale Züge gehen");
    const absage = passtZumEinsetzen(r, "verstaerkung");
    wahr(absage !== "imSchach", "nie „König im Schach" + "“ bei drei Königen: " + absage);
});

pruefe("Die Kette erzeugt Könige nur mit dem Leben-Schalter (Dame wird König)", () => {
    const r = stellung({ d1: "K", c2: "D", a6: "k" }, ["verstaerkung"]);
    const n = R.faehigkeitEinsetzen(r, "id-anna", "verstaerkung", feld("c2"), "Anna", 2);
    wahr(n, "Dame → König geht");
    gleich(SCHACH.figurAuf(n.stand, feld("c2")), "K", "zweiter König");
    gleich(R.normalisieren(JSON.parse(JSON.stringify(n))).stand.koenigeAlsLeben, true, "Schalter bleibt über die Datenbank");
});

pruefe("Einzelner König im Schach: Verstärkung gesperrt (imSchach) — nur solange er im Schach steht", () => {
    const r = stellung({ d1: "K", a2: "B", c3: "s", a6: "k" }, ["verstaerkung"]);
    gleich(SCHACH.imSchach(r.stand, "weiss"), true, "Springer c3 gibt Schach");
    gleich(passtZumEinsetzen(r, "verstaerkung"), "imSchach", "Grund");
    wahr(R.ABSAGE_TEXTE.imSchach.indexOf("König im Schach") === 0, "Text");
    /* Der König zieht aus dem Schach, Bob zieht, Anna ist wieder dran: Die Sperre hängt nicht nach. */
    const zug = SCHACH.alleZuege(r.stand).find((z) => z.von === feld("d1"));
    let weiter = R.ziehen(r, "id-anna", zug.von, zug.nach, "D", "Anna", 3);
    weiter = SCHACH_BOT.ziehen(weiter, 4);
    if (!SCHACH.imSchach(weiter.stand, "weiss")) {
        wahr(passtZumEinsetzen(weiter, "verstaerkung") !== "imSchach", "nach dem Schach keine Schach-Sperre mehr");
    }
    /* Und ohne Bob dazwischen: dieselbe Stellung ohne Schach — geht. */
    const ohne = stellung({ d1: "K", a2: "B", c4: "s", a6: "k" }, ["verstaerkung"]);
    gleich(SCHACH.imSchach(ohne.stand, "weiss"), false, "kein Schach");
    gleich(passtZumEinsetzen(ohne, "verstaerkung"), "", "geht");
});

pruefe("Gäbe Schach ist ein eigener Grund (Item darf nicht direkt Schach geben)", () => {
    const r = stellung({ f1: "K", b4: "B", a6: "k" }, ["verstaerkung"]);
    gleich(passtZumEinsetzen(r, "verstaerkung"), "gaebeSchach", "Springer auf b4 gäbe Schach auf a6");
});

pruefe("Ohne Zielfeld (Doppelzug): Absage vorab statt Dialog nach dem ✓", () => {
    const frei = stellung({ d1: "K", a2: "B", a6: "k" }, ["doppelzug"]);
    gleich(R.faehigkeitAbsage(frei, "id-anna", "doppelzug"), "", "geht");
    const nichtDran = R.kopieren(frei);
    nichtDran.stand = Object.assign({}, nichtDran.stand, { amZug: "schwarz" });
    gleich(R.faehigkeitAbsage(nichtDran, "id-anna", "doppelzug"), "darfNicht", "nicht am Zug");
});

pruefe("Bildschirm fragt das Modell (kein Raten mehr)", () => {
    const fs = require("fs");
    const ts = fs.readFileSync(pfad.join(__dirname, "..", "js", "team-schach.js"), "utf8");
    wahr(/faehigkeitAbsage\(/.test(ts) && /ABSAGE_TEXTE/.test(ts), "Absage im Bildschirm");
    wahr(!/"König im Schach · Fähigkeit bleibt"/.test(ts), "kein geratener Text mehr");
    const dialog = fs.readFileSync(pfad.join(__dirname, "..", "js", "dialog.js"), "utf8");
    wahr(/"achtung"/.test(dialog), "Regel-Absage mit Achtung-Zeichen statt Funkloch");
});

console.log(anzahlOk + " ok, " + anzahlFehler + " Fehler");
process.exit(anzahlFehler === 0 ? 0 : 1);
