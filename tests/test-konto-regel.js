/*
 * test-konto-regel.js — besteht der GANZE Konto-Eintrag, den Blunderluck
 * schreibt, die Datenbank-Regel? (seit v0.151.1)
 *
 * Anlass: Der Nutzer hat am 27.09.2026 die gesamte Regel eingespielt
 * (SICHERHEIT.md §11 + §11a `aussehen` + §11b `fortschritt`). Blunderluck
 * schreibt immer den ganzen Eintrag `spieler/konten/<uid>` — verletzt EIN
 * Feld die Regel, lehnt die Datenbank ALLES ab, auch Freunde und Abzeichen.
 *
 * WIE: Die Regel-Blöcke werden aus SICHERHEIT.md gelesen (keine Kopie!) und
 * mit einem kleinen Nachbau der Firebase-Prüfung ausgewertet — genau die
 * Ausdrücke, die dort vorkommen: isNumber/isString/isBoolean, >=, <=,
 * .length <=, .matches(/…/) auf Wert und Schlüssel, `false`, und die
 * Kind-Knoten mit `$platzhalter`. Die Besitzer-Klausel (`auth.uid ===
 * $uid || …`) gilt hier als erfüllt: Geschrieben wird der EIGENE Eintrag.
 *
 * Geprüft wird der Weg, den jeder Schreibvorgang nimmt:
 * `SpeicherKonten.eintragFuerServer` (js\speicher.js), gefüttert mit einem
 * absichtlich unordentlichen Eintrag (Typoluck-Flachfelder, `umzug`, zu
 * lange Listen, falsche Aussehen-Werte).
 *
 * Aufruf: siehe tests\README.md
 */

const pfad = require("path");
const fs = require("fs");
const vm = require("vm");

const projekt = pfad.join(__dirname, "..");
const FORTSCHRITT = require(pfad.join(projekt, "js", "fortschritt.js"));

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

/* ------------------------------------------------------------------ *
 * Die Regel aus SICHERHEIT.md
 * ------------------------------------------------------------------ */

const sicherheit = fs.readFileSync(pfad.join(projekt, "SICHERHEIT.md"), "utf8");

/* Der erste ```json-Block nach einer Überschrift, als Objekt. Die Blöcke
   §11a/§11b sind Ausschnitte (`"feld": { … }`) — sie werden in {} gefasst. */
function blockNach(ueberschrift) {
    const start = sicherheit.indexOf(ueberschrift);
    if (start === -1) {
        throw new Error("Abschnitt fehlt: " + ueberschrift);
    }
    const a = sicherheit.indexOf("```json", start) + "```json".length;
    const e = sicherheit.indexOf("```", a);
    const text = sicherheit.slice(a, e).trim();
    return JSON.parse(text.startsWith("{") ? text : "{" + text + "}");
}

const REGEL_11 = blockNach("## 11. Endgültige Regeln UPCrew");
const REGEL_11A = blockNach("### 11a.");
const REGEL_11B = blockNach("### 11b.");

/* Ein .validate-Ausdruck gegen einen Wert und seinen Schlüssel. */
function ausdruckGilt(ausdruck, wert, schluessel) {
    if (ausdruck === false || ausdruck === "false") {
        return false;
    }
    if (typeof ausdruck !== "string") {
        return true;
    }
    if (/newData\.isNumber\(\)/.test(ausdruck) && !(typeof wert === "number" && isFinite(wert))) {
        return false;
    }
    if (/newData\.isString\(\)/.test(ausdruck) && typeof wert !== "string") {
        return false;
    }
    if (/newData\.isBoolean\(\)/.test(ausdruck) && typeof wert !== "boolean") {
        return false;
    }
    for (const t of ausdruck.matchAll(/newData\.val\(\) >= (-?\d+)/g)) {
        if (!(wert >= Number(t[1]))) {
            return false;
        }
    }
    for (const t of ausdruck.matchAll(/newData\.val\(\) <= (-?\d+)/g)) {
        if (!(wert <= Number(t[1]))) {
            return false;
        }
    }
    for (const t of ausdruck.matchAll(/newData\.val\(\)\.length <= (\d+)/g)) {
        if (!(typeof wert === "string" && wert.length <= Number(t[1]))) {
            return false;
        }
    }
    const leerErlaubt = ausdruck.indexOf("newData.val() === ''") !== -1;
    for (const t of ausdruck.matchAll(/newData\.val\(\)\.matches\(\/(.*?)\/\)/g)) {
        if (!(leerErlaubt && wert === "") && !(typeof wert === "string" && new RegExp(t[1]).test(wert))) {
            return false;
        }
    }
    for (const t of ausdruck.matchAll(/\$(\w+)\.matches\(\/(.*?)\/\)/g)) {
        if (!new RegExp(t[2]).test(String(schluessel))) {
            return false;
        }
    }
    return true;
}

/* Firebase: Kind-Regel mit genauem Namen, sonst der eine `$platzhalter`. */
function kindRegel(regel, schluessel) {
    if (Object.prototype.hasOwnProperty.call(regel, schluessel)) {
        return regel[schluessel];
    }
    const platz = Object.keys(regel).find((k) => k.startsWith("$"));
    return platz ? regel[platz] : null;
}

/* Liefert die Liste der Verstösse (leer = besteht). Listen schreibt
   Firebase als Objekte mit Zahl-Schlüsseln. */
function verstoesse(regel, wert, schluessel, weg) {
    const fehler = [];
    if (!regel || wert === null || wert === undefined) {
        return fehler;
    }
    if (".validate" in regel && !ausdruckGilt(regel[".validate"], wert, schluessel)) {
        fehler.push(weg + " = " + JSON.stringify(wert).slice(0, 60));
        return fehler;
    }
    if (wert && typeof wert === "object") {
        for (const k of Object.keys(wert)) {
            fehler.push(...verstoesse(kindRegel(regel, k), wert[k], k, weg + "/" + k));
        }
    }
    return fehler;
}

/* Der ganze Konto-Eintrag gegen §11 (Pflichtfelder, keine Prüfsummen),
   §11a (`aussehen`) und §11b (`fortschritt`). */
function kontoVerstoesse(eintrag) {
    const fehler = [];
    const konto = REGEL_11.rules.spieler.konten.$uid[".validate"];
    for (const pflicht of ["id", "name", "tag", "uid"]) {
        if (konto.indexOf("'" + pflicht + "'") !== -1 && !(pflicht in eintrag)) {
            fehler.push("Pflichtfeld fehlt: " + pflicht);
        }
    }
    for (const verboten of ["pinPruefwert", "pinSalz"]) {
        if (verboten in eintrag) {
            fehler.push("verbotenes Feld: " + verboten);
        }
    }
    fehler.push(...verstoesse(REGEL_11A.aussehen, eintrag.aussehen, "aussehen", "aussehen"));
    fehler.push(...verstoesse(REGEL_11B.fortschritt, eintrag.fortschritt, "fortschritt", "fortschritt"));
    return fehler;
}

/* ------------------------------------------------------------------ *
 * Die echte Schreib-Schleuse aus js\speicher.js
 * ------------------------------------------------------------------ */

const kontext = { console: console, JSON: JSON, Math: Math, FORTSCHRITT: FORTSCHRITT };
vm.createContext(kontext);
vm.runInContext(fs.readFileSync(pfad.join(projekt, "js", "speicher.js"), "utf8")
    + "\n;this.SpeicherKonten = SpeicherKonten;", kontext, { filename: "speicher.js" });
const SpeicherKonten = kontext.SpeicherKonten;

/* Ein absichtlich unordentlicher eigener Eintrag. */
function unordentlich() {
    const gezaehlt = [];
    for (let i = 0; i < 150; i++) {
        gezaehlt.push("p-" + i);
    }
    const tage = [];
    for (let i = 1; i <= 28; i++) {
        tage.push("2026-09-" + (i < 10 ? "0" : "") + i);
    }
    for (let i = 1; i <= 31; i++) {
        tage.push("2026-08-" + (i < 10 ? "0" : "") + i);
    }
    for (let i = 1; i <= 20; i++) {
        tage.push("2026-07-" + (i < 10 ? "0" : "") + i);
    }
    return {
        id: "id-ich", name: "Anna", tag: "0007", uid: "u1", kennung: "anna",
        freunde: ["id-bob"], abzeichen: { sieg: 3 },
        pinPruefwert: "abc", pinSalz: "xyz",
        aussehen: { darstellung: "dunkel", farbwelt: "neonpink", schrift: "S4", knoepfe: "K9",
            leseschrift: "ja", stand: 1759000000000, extra: 1 },
        fortschritt: {
            version: 1, xp: 70, serie: { tage: 2 }, heute: { wort: 3 }, umzug: { alt: 1 },
            spiele: {
                blunderluck: { xp: 99999999, partien: 13, stand: 1759000000001, gezaehlt: gezaehlt,
                    tage: tage, heute: { datum: "2026-09-27", versuche: 2, figuren: 2, fremd: 1 },
                    turm: { figuren: { "1-0": 3, "1-1": 0, "abc": 2 }, schwuere: { "3": 2 }, extra: true },
                    zaehler: { siege: 4, "geht-nicht": 1, text: "x" }, taten: ["erste"], umzug: { alt: 1 } },
                typoluck: { xp: 40, partien: 4, stand: 9, gezaehlt: [], tage: ["2026-09-27"],
                    heute: { datum: "", versuche: 0, figuren: 0 },
                    zaehler: { tagesaufgaben: 1, beideTage: 0, figuren: 3, besteSerie: 1,
                        koennenSumme: 180, koennenAnzahl: 2, koennenBeste: 95 },
                    taten: [], umzug: { von: "0.10.0", alt: { xp: 70 } } },
                fremdspiel: { xp: 1 }
            },
            schutz: { frei: 2 }
        }
    };
}

pruefe("Die Regel-Blöcke §11, §11a und §11b lassen sich aus SICHERHEIT.md lesen", () => {
    wahr(!!REGEL_11.rules.spieler.konten.$uid, "§11 konten/$uid");
    wahr(!!REGEL_11A.aussehen && !!REGEL_11B.fortschritt, "§11a und §11b");
});

pruefe("Der Prüf-Nachbau greift: der unordentliche Eintrag verletzt die Regel", () => {
    const fehler = kontoVerstoesse(unordentlich());
    wahr(fehler.some((f) => f.indexOf("pinPruefwert") !== -1), "Prüfsumme erkannt");
    wahr(fehler.some((f) => f.indexOf("aussehen/farbwelt") !== -1), "falsche Farbwelt erkannt");
    wahr(fehler.some((f) => f.indexOf("fortschritt/umzug") !== -1 || f.indexOf("fortschritt/xp") !== -1),
        "flache Felder / umzug erkannt");
    wahr(fehler.some((f) => f.indexOf("gezaehlt/100") !== -1), "gezaehlt über 100 erkannt");
    wahr(fehler.some((f) => f.indexOf("spiele/fremdspiel") !== -1), "fremdes Spiel erkannt");
});

pruefe("Was Blunderluck schreibt (eintragFuerServer), besteht die GANZE Regel", () => {
    const eintrag = SpeicherKonten.eintragFuerServer(unordentlich());
    const fehler = kontoVerstoesse(eintrag);
    gleich(fehler.join(" | "), "", "keine Verstösse");
    /* Das Übrige bleibt, wie es war — Freunde gehen nicht verloren. */
    gleich(eintrag.freunde.join(","), "id-bob", "Freunde");
    gleich(eintrag.abzeichen.sieg, 3, "Abzeichen");
    gleich(Object.keys(eintrag.aussehen).sort().join(","), "darstellung,schrift,stand", "nur gültige Aussehen-Felder");
    wahr(!("umzug" in eintrag.fortschritt.spiele.typoluck), "kein umzug");
    wahr(eintrag.fortschritt.spiele.blunderluck.gezaehlt.length <= 100, "gezaehlt höchstens 100");
    wahr(eintrag.fortschritt.spiele.blunderluck.tage.length <= 1000, "tage höchstens 1000");
    gleich(eintrag.fortschritt.spiele.typoluck.zaehler.koennenBeste, 95, "Typolucks Zähler bleiben");
});

pruefe("Ohne Aussehen und Fortschritt bleibt der Eintrag unberührt (nur ohne Prüfsummen)", () => {
    const eintrag = SpeicherKonten.eintragFuerServer({ id: "a", name: "A", tag: "0001", uid: "u", pinSalz: "s" });
    gleich(JSON.stringify(eintrag), JSON.stringify({ id: "a", name: "A", tag: "0001", uid: "u" }), "gleich");
    gleich(kontoVerstoesse(eintrag).length, 0, "besteht");
    const ungueltig = SpeicherKonten.eintragFuerServer({ id: "a", name: "A", tag: "0001", uid: "u",
        aussehen: { farbwelt: "neonpink" } });
    wahr(!("aussehen" in ungueltig), "nichts Gültiges übrig: Feld fällt weg");
});

pruefe("Regel §11a, Schreib-Schleuse und Baustein nennen dieselben Aussehen-Werte", () => {
    const baustein = fs.readFileSync(pfad.join(projekt, "js", "upcrew-aussehen.js"), "utf8");
    const schleuse = SpeicherKonten.REGEL_AUSSEHEN;
    for (const feld of Object.keys(schleuse)) {
        const zeile = baustein.match(new RegExp(feld + ":\\s*\\[([^\\]]*)\\]"));
        wahr(!!zeile, "WAHL." + feld + " im Baustein");
        const imBaustein = zeile[1].split(",").map((s) => s.trim().replace(/"/g, "")).filter(Boolean);
        gleich(imBaustein.join(","), schleuse[feld].join(","), feld + ": Baustein = Schleuse");
        for (const wert of schleuse[feld]) {
            wahr(ausdruckGilt(REGEL_11A.aussehen[feld][".validate"], wert, feld), feld + " " + wert + " erlaubt die Regel");
        }
    }
});

console.log(anzahlOk + " ok, " + anzahlFehler + " Fehler");
process.exit(anzahlFehler === 0 ? 0 : 1);
