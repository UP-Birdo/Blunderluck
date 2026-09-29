/*
 * test-regel-12.js — Regel §12 „Spielerdaten schützen", Phase A: Blunderluck
 * kann beides (seit v0.154.0; Apps\UPCrew\docs\DATENBANK-KONZEPT-12.md,
 * Abschnitte 4, 5, 10 und 12).
 *
 * Die ECHTEN Dateien (konto.js, speicher.js, spieler.js, fortschritt.js,
 * anmeldung*.js …) laufen gegen eine nachgebaute Firebase, deren Datenbank
 * von der ECHTEN Regel geschützt wird (tests\regel-nachbau.js wertet die
 * Regel-Ausdrücke aus): erst die heutige Regel (§11c, SICHERHEIT.md
 * Abschnitt 11c, „Die GESAMTE Regel"), dann §12 (SICHERHEIT.md Abschnitt 14,
 * byte-gleich mit dem Konzept). So wird der Umstieg durchgespielt: Konten
 * unter der alten Regel anlegen → Regel §12 → UP#Plus zieht nach → alle
 * Wege unter §12 → und zurück.
 *
 * Nachbau ≠ Firebase: Die Gegenprobe gegen den Firebase-Emulator fehlt
 * (auf dem Bau-Rechner lief keiner, SICHERHEIT.md Abschnitt 14).
 *
 * Aufruf: siehe tests\README.md
 */

const pfad = require("path");
const dateisystem = require("fs");
const vm = require("vm");
const { RegelNachbau, firebaseMitRegel, wertBei } = require("./regel-nachbau.js");

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
const sicherheit = dateisystem.readFileSync(pfad.join(projekt, "SICHERHEIT.md"), "utf8");

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

const TEXT_11C = textBlockNach("**Die GESAMTE Regel (§11 + §11a + §11b + §11c)");
const TEXT_12 = textBlockNach("## 14. Regel §12");
/* Seit v0.159.0: die vorbereitete Regel mit Grau (Abschnitt 15, NICHT eingespielt). */
const TEXT_12_GRAU = textBlockNach("## 15. Regel §13");
const REGEL_11C = JSON.parse(TEXT_11C);
const REGEL_12 = JSON.parse(TEXT_12);
const REGEL_12_GRAU = JSON.parse(TEXT_12_GRAU);

const BASIS = "https://upcrew-7a29d-default-rtdb.europe-west1.firebasedatabase.app";
const OBER = "yJaWLaK5Kah6fxmnXfDycJhO5cF3";
const PW = { ober: "Stark#Pw9", anna: "Anna#Pass1", bert: "Bert#Pass1", jonas: "Jonas#Pw1", neu: "Neu#Pass2" };

/* ------------------------------------------------------------------ *
 * Die App in einer eigenen Umgebung (wie test-konto.js, dazu Fortschritt
 * und Abzeichen für den Auszug)
 * ------------------------------------------------------------------ */

function appLaden(fb) {
    const gespeichert = {};
    const dialog = { antworten: [], hinweise: [], kurz: [], listen: [] };
    const umgebung = {
        console, URL, URLSearchParams, AbortController, TextEncoder, Uint8Array, Uint32Array,
        crypto: globalThis.crypto,
        setTimeout, clearTimeout,
        fetch: (a, e) => fb.fetch(a, e),
        document: { addEventListener() {}, hidden: false },
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
            async passwort() { return dialog.antworten.shift(); },
            async eingabe() { return dialog.antworten.shift(); },
            async hinweis(titel, text) { dialog.hinweise.push(titel + ": " + text); },
            async frage() { return dialog.antworten.shift(); },
            async liste(titel, text, eintraege) {
                dialog.listen.push({ titel: titel, eintraege: eintraege });
                return dialog.antworten.shift();
            },
            kurzmeldung(text) { dialog.kurz.push(text); }
        },
        TABS: { wechseln() {} }
    };
    umgebung.localStorage = umgebung.window.localStorage;
    umgebung.globalThis = umgebung;
    vm.createContext(umgebung);

    const jsOrdner = pfad.join(projekt, "js");
    const quelltext = ["konto.js", "fortschritt.js", "upcrew-abzeichen.js", "spieler.js", "versiegelung.js",
        "ich.js", "fuehlen.js", "speicher.js", "abgleich.js", "anmeldung.js", "anmeldung-konto.js"]
        .map((name) => dateisystem.readFileSync(pfad.join(jsOrdner, name), "utf8"))
        .join("\n;\n")
        + "\nObject.assign(globalThis, { KONTO, FORTSCHRITT, SPIELER, ICH, ANMELDUNG,"
        + " Abgleich, SpeicherGemeinsam, SpeicherKonten, speicherErzeugen });";
    vm.runInContext(quelltext, umgebung, { filename: "regel-12-umgebung.js" });

    const { KONTO, SPIELER, ANMELDUNG } = umgebung;
    KONTO.einrichten(umgebung.KONFIG);
    umgebung.SpeicherGemeinsam.tokenGeber = () => KONTO.token();
    const speicher = umgebung.speicherErzeugen(umgebung.KONFIG, "spieler",
        "blunderluck.spieler", (roh) => SPIELER.normalisieren(roh), () => KONTO.uid()).speicher;
    const abgleich = new umgebung.Abgleich(speicher, umgebung.KONFIG.speicher, {
        beiDaten: () => {},
        beiStatus() {},
        leereDaten: () => SPIELER.leereDaten(),
        inhaltGleich: (a, b) => SPIELER.inhaltGleich(a, b),
        zusammenfuehren: (f, e, id) => SPIELER.zusammenfuehren(f, e, id)
    });
    ANMELDUNG.verbinden(abgleich);
    ANMELDUNG.aufbauen({ hidden: true, innerHTML: "" });
    return { umgebung, KONTO, SPIELER, ANMELDUNG, FORTSCHRITT: umgebung.FORTSCHRITT, abgleich, speicher, dialog };
}

async function laden(w) {
    w.abgleich.daten = await w.speicher.laden();
    return w.abgleich.daten;
}

/* Eine Firebase mit UP#Plus (wie das Werkzeug es anlegte) unter der Regel §11c. */
function firebaseAnlegen() {
    const fb = firebaseMitRegel(BASIS, REGEL_11C);
    fb.kontoAnlegen(OBER, "up-plus@konten.upcrew.invalid", PW.ober);
    fb.db = { spieler: {
        geaendertAm: 1,
        konten: { [OBER]: { id: "id-ober", name: "UP", tag: "Plus", uid: OBER, kennung: "up-plus" } },
        namen: { up: { Plus: OBER } }
    } };
    return fb;
}

/* Unter der ALTEN Regel: Anna, Bert und zweimal Jonas (gleiches Passwort) anlegen. */
async function kontenAnlegen(fb) {
    const w = appLaden(fb);
    await laden(w);
    gleich(w.KONTO.regel, "alt", "alte Regel erkannt");
    const anlegen = async (name, passwort) => {
        await laden(w);
        const ergebnis = await w.KONTO.kontoAnlegen(w.speicher, w.abgleich.daten, name, passwort);
        wahr(ergebnis.ok, "angelegt " + name + ": " + JSON.stringify(ergebnis));
        const eintrag = ergebnis.eintrag;
        w.KONTO.abmelden();
        return eintrag;
    };
    const anna = await anlegen("Anna", PW.anna);
    const bert = await anlegen("Bert", PW.bert);
    const jonas1 = await anlegen("Jonas", PW.jonas);
    /* Der zweite Jonas mit demselben Passwort: das Anlegen lehnt das ab
       (`kombinationVergeben`) — also direkt, wie ein älteres Konto. */
    fb.kontoAnlegen("uid-jonas2", "k-jonas2@konten.upcrew.invalid", PW.jonas);
    fb.db.spieler.konten["uid-jonas2"] = { id: "id-jonas2", name: "Jonas", tag: "7777", uid: "uid-jonas2",
        kennung: "k-jonas2", freunde: [], abgelehnt: [], abzeichen: [],
        fortschritt: { version: 1, spiele: { blunderluck: { xp: 900, partien: 12 } } } };
    fb.db.spieler.namen.jonas = Object.assign({}, fb.db.spieler.namen.jonas, { "7777": "uid-jonas2" });
    return { anna, bert, jonas1 };
}

/* Umstieg: Regel §12 einspielen, UP#Plus meldet sich an und zieht nach. */
async function umsteigen(fb) {
    fb.regelSetzen(REGEL_12);
    const w = appLaden(fb);
    const an = await w.KONTO.anmelden("up-plus", PW.ober);
    wahr(an.ok, "UP#Plus angemeldet");
    await laden(w);
    gleich(w.KONTO.regel, "p12", "Regel §12 erkannt");
    const ergebnis = await w.KONTO.nachziehen(w.speicher);
    wahr(ergebnis.ok, "nachgezogen: " + JSON.stringify(ergebnis));
    return { w, ergebnis };
}

async function angemeldetAls(fb, name, passwort) {
    const w = appLaden(fb);
    await laden(w);
    const ergebnis = await w.ANMELDUNG._kontoAnmeldenVersuchen(name, passwort);
    wahr(ergebnis.ok, "angemeldet " + name + ": " + JSON.stringify(ergebnis));
    return w;
}

const spieler = (fb) => fb.db.spieler;

/* ------------------------------------------------------------------ *
 * Die Prüfungen
 * ------------------------------------------------------------------ */

(async () => {

    await pruefe("Regeltext §12: gültiges JSON, byte-gleich mit dem Konzept, alle §11c-Zeilen bis auf die geänderten", () => {
        wahr(REGEL_12.rules && REGEL_12.rules.spieler, "Regel §12 gelesen");
        const konzeptPfad = pfad.join(projekt, "..", "UPCrew", "docs", "DATENBANK-KONZEPT-12.md");
        if (dateisystem.existsSync(konzeptPfad)) {
            /* Zeilenenden zählen nicht (das Konzept liegt seit 29.09.2026 mit CRLF). */
            const konzept = dateisystem.readFileSync(konzeptPfad, "utf8").replace(/\r/g, "");
            const i = konzept.indexOf("## 11. Regeltext §12");
            const a = konzept.indexOf("```json", i) + "```json".length + 1;
            const konzeptText = konzept.slice(a, konzept.indexOf("```", a));
            /* Seit v0.155.0 geht der Text von hier ins Konzept (die
               Koordination überträgt ihn); verglichen wird, sobald das
               Konzept die Ergänzungen von v0.155.2 trägt. */
            /* Seit v0.159.0 trägt das Konzept die Regel MIT Grau — sie steht hier
               als Abschnitt 15 (vorbereitet), Abschnitt 14 bleibt die eingespielte. */
            if (konzeptText.indexOf("\"spielzeitOeffentlich\"") !== -1) {
                gleich(konzeptText === (konzeptText.indexOf("\"umstellung\"") !== -1 ? TEXT_12_GRAU : TEXT_12), true,
                    "byte-gleich mit Konzept Abschnitt 11");
            }
        }
        const zeilen12 = new Set(TEXT_12.split("\n").map((z) => z.trim()));
        const fehlen = TEXT_11C.split("\n").map((z) => z.trim())
            .filter((z) => /"\.(read|write|validate)"/.test(z) && !zeilen12.has(z));
        /* Geändert laut Konzept: `spieler/.read` (gestrichen; als Zeile
           gleichlautend woanders vorhanden), `geaendertAm` (+ .read) und
           `namen/$name/$tag` (Code mit Buchstaben, + .read). Seit v0.155.0
           dazu `blunderluck` (.write wandert nach unten, Löschregel) und
           `team-schach` (jetzt mehrzeilig). */
        gleich(fehlen.map((z) => z.slice(0, 15)), ["\"geaendertAm\": ", "\"$tag\": { \".wri",
            "\".write\": \"auth", "\"team-schach\": "], "nur die geänderten Zeilen fehlen");
        wahr(REGEL_11C.rules.spieler[".read"] === true && REGEL_12.rules.spieler[".read"] === undefined,
            "spieler/.read gestrichen");
    });

    /* Seit der zweiten Nachbesserung v0.159.0: Abschnitt 15 = Regel §13 (offene Muster für
       farbwelt/schrift/knoepfe, umstellung, neu konten/$uid/besitz/$art). */
    await pruefe("Regel §13 (Abschnitt 15): nur farbwelt/schrift/knoepfe/umstellung + lieblingswoerter + besitz anders als Abschnitt 14", () => {
        const a = TEXT_12.split("\n");
        const b = TEXT_12_GRAU.split("\n");
        const name = (z) => z.trim().split(":")[0];
        const nurA = a.filter((z) => b.indexOf(z) === -1).map(name);
        const nurB = b.filter((z) => a.indexOf(z) === -1).map(name);
        const drei = ["\"farbwelt\"", "\"schrift\"", "\"knoepfe\""];
        gleich(nurA, drei.concat(drei), "weg: die alten farbwelt/schrift/knoepfe-Zeilen");
        const vier = drei.concat(["\"umstellung\""]);
        /* Seit 30.09.2026 (eingespielt, Entscheid „REGEL §13 LIVE"): dazu
           `konten/$uid/lieblingswoerter/$app/$i` (nur typoluck, 3 Wörter). */
        gleich(nurB, vier.concat(vier, ["\"lieblingswoerter\"", "\".validate\"", "\"$i\"", "\"besitz\"", "\"$art\""]),
            "dazu: offene Muster + umstellung + lieblingswoerter + besitz");
        const konto = REGEL_12_GRAU.rules.spieler.konten.$uid;
        const muster = (ausdruck) => new RegExp(/matches\(\/(.*?)\/\)/.exec(ausdruck)[1]);
        for (const zweig of [konto.aussehen, konto.aussehenJe.$app]) {
            const fw = muster(zweig.farbwelt[".validate"]);
            wahr(["grau", "werkstatt", "studio", "feld", "tiefsee", "gold", "neon2"].every((w) => fw.test(w)), "Farbwelten offen");
            wahr(!fw.test("Grau") && !fw.test("g") && !fw.test("2grau") && !fw.test("a".repeat(17)), "farbwelt-Muster eng genug");
            wahr(muster(zweig.schrift[".validate"]).test("S12") && !muster(zweig.schrift[".validate"]).test("S123"), "schrift S0–S99");
            wahr(muster(zweig.knoepfe[".validate"]).test("K7") && !muster(zweig.knoepfe[".validate"]).test("X1"), "knoepfe K0–K99");
            wahr(/newData\.val\(\) <= 9/.test(zweig.umstellung[".validate"]), "umstellung 0–9");
        }
        const lw = konto.lieblingswoerter.$app;
        wahr(lw[".validate"] === "$app.matches(/^(typoluck)$/)", "lieblingswoerter nur typoluck");
        const lwi = lw.$i[".validate"];
        wahr(/\$i\.matches\(\/\^\[0-2\]\$\/\)/.test(lwi) && /\[a-zäöü\]\{4,8\}/.test(lwi) && /auth\.uid === \$uid/.test(lwi),
            "lieblingswoerter/$app/$i: 3 Wörter, 4–8 Kleinbuchstaben");
        const besitz = konto.besitz.$art[".validate"];
        wahr(/\$art\.matches/.test(besitz) && /length <= 2000/.test(besitz) && /auth\.uid === \$uid/.test(besitz), "besitz/$art");
    });

    await pruefe("Regel-Nachbau: Nummern-Codes nach Abschnitt 16 (0001, 9999, A7K2 ja; AB1C, OABC, a7k2, ABC nein; Plus nur UP#Plus)", () => {
        const nachbau = new RegelNachbau(REGEL_12);
        const auth = { uid: "uid-x", provider: "password" };
        const geht = (tag, wer) => nachbau.schreibenPruefen({}, [{ weg: ["spieler", "namen", "jonas", tag],
            wert: (wer || auth).uid }], wer || auth).ok;
        for (const tag of ["0001", "9999", "A7K2"]) {
            wahr(geht(tag), tag + " abgelehnt");
        }
        for (const tag of ["AB1C", "OABC", "a7k2", "ABC"]) {
            wahr(!geht(tag), tag + " angenommen");
        }
        wahr(!geht("Plus"), "Plus für andere angenommen");
        wahr(geht("Plus", { uid: OBER, provider: "password" }), "Plus für UP#Plus abgelehnt");
    });

    await pruefe("Regel-Nachbau: Lesen kaskadiert, gezielt je Name, ohne Anmeldung nur Marke und Verzeichnis", () => {
        const nachbau = new RegelNachbau(REGEL_12);
        const baum = { spieler: { geaendertAm: 5, rollen: {}, anmeldung: { jonas: { u1: { k: "k1" } } },
            oeffentlich: { u1: { id: "i", name: "Jonas" } }, konten: { u1: { id: "i", name: "Jonas", tag: "0001", uid: "u1" } },
            namen: { jonas: { "0001": "u1" } } } };
        const ich = { uid: "u2", provider: "password" };
        const lies = (weg, auth) => nachbau.darfLesen(baum, weg, auth);
        wahr(!lies(["spieler"], null) && !lies(["spieler"], ich), "spieler ganz");
        wahr(lies(["spieler", "geaendertAm"], null), "Marke");
        wahr(lies(["spieler", "anmeldung", "jonas"], null), "Verzeichnis je Name");
        wahr(!lies(["spieler", "anmeldung"], ich), "Verzeichnis ganz");
        wahr(!lies(["spieler", "oeffentlich"], null) && lies(["spieler", "oeffentlich"], ich), "Auszüge nur angemeldet");
        wahr(!lies(["spieler", "konten", "u1"], ich) && lies(["spieler", "konten", "u1"], { uid: "u1" }), "Konto nur Besitzer");
        wahr(!lies(["spieler", "namen"], ich) && lies(["spieler", "namen", "jonas", "0001"], ich), "Nummer nur gezielt");
        wahr(lies(["spieler", "konten"], { uid: OBER }), "UP#Plus liest alle Konten");
    });

    /* Der Umstieg, einmal ganz — die Welten danach teilen sich diese Firebase. */
    const fb = firebaseAnlegen();
    let konten = null;
    let umstieg = null;

    await pruefe("Alte Regel: Konten anlegen wie bisher, KEINE neuen Knoten (die alte Regel lehnte sie ab)", async () => {
        konten = await kontenAnlegen(fb);
        wahr(!spieler(fb).oeffentlich && !spieler(fb).anmeldung, "keine §12-Knoten unter der alten Regel");
        const w = appLaden(fb);
        await laden(w);
        gleich(w.KONTO.regel, "alt", "alt");
        wahr(w.abgleich.daten.spieler.some((s) => s.name === "Anna" && s.tag), "alte Regel: ganze Liste mit Nummern");
        wahr(fb.aufrufe.some((a) => a.methode === "GET" && a.pfad === "/spieler" && !a.flach),
            "alte Regel: ganzes spieler gelesen (wie bisher)");
    });

    await pruefe("Regel-Erkennung: 200 = alt, 401 = §12, Netzfehler = bleibt", async () => {
        const w = appLaden(fb);
        gleich(await w.KONTO.regelErkennen(), "alt", "200");
        fb.regelSetzen(REGEL_12);
        gleich(await w.KONTO.regelErkennen(), "p12", "401");
        const netz = fb.fetch;
        fb.fetch = async () => { throw new Error("offline"); };
        gleich(await w.KONTO.regelErkennen(), "p12", "Netzfehler: bleibt");
        const frisch = appLaden(fb);
        gleich(await frisch.KONTO.regelErkennen(), "alt", "Netzfehler ohne Wissen: alt");
        fb.fetch = netz;
        fb.regelSetzen(REGEL_11C);
    });

    await pruefe("Umstieg: Regel §12, UP#Plus liest alle Konten und zieht nach — zweimal = dasselbe", async () => {
        umstieg = await umsteigen(fb);
        const anzahl = Object.keys(spieler(fb).konten).length;
        gleich(umstieg.ergebnis.geschrieben, anzahl, "alle Konten nachgezogen");
        gleich(Object.keys(spieler(fb).oeffentlich).length, anzahl, "Auszug für jedes Konto (auch UP#Plus)");
        gleich(spieler(fb).anmeldung.up[OBER].k, "up-plus", "UP#Plus steht im Verzeichnis");
        gleich(Object.keys(spieler(fb).anmeldung.jonas).length, 2, "beide Jonas im Verzeichnis");
        const vorher = JSON.stringify(spieler(fb).oeffentlich);
        const nochmal = await umstieg.w.KONTO.nachziehen(umstieg.w.speicher);
        gleich([nochmal.geschrieben, nochmal.uebersprungen], [0, anzahl], "zweiter Lauf: nichts zu tun");
        gleich(JSON.stringify(spieler(fb).oeffentlich), vorher, "gleiches Ergebnis");
        const auszug = spieler(fb).oeffentlich["uid-jonas2"];
        gleich(Object.keys(auszug).sort(), ["auszug", "id", "name", "tag"], "nur erlaubte Felder");
        gleich(auszug.tag, "7777", "Nummer im Auszug (seit v0.155.0)");
        wahr(!("kennung" in auszug) && !("fortschritt" in auszug), "keine Kennung, kein Fortschritt");
        gleich(auszug.auszug.xp, 900, "XP im Auszug");
    });

    await pruefe("§12 nachziehen: nur UP#Plus, nur unter §12", async () => {
        const w = await angemeldetAls(fb, "Anna", PW.anna);
        const ergebnis = await w.KONTO.nachziehen(w.speicher);
        wahr(!ergebnis.ok, "Anna darf nicht nachziehen");
        const quelle = dateisystem.readFileSync(pfad.join(projekt, "js", "verwaltungs-bildschirm.js"), "utf8");
        wahr(/KONTO\.istP12\(\) \|\| KONTO\.uid\(\) !== KONTO\.OBER_UID/.test(quelle), "Knopf nur für UP#Plus unter §12");
    });

    await pruefe("Aussenmessung ohne Anmeldung (Konzept Phase B Schritt 4)", async () => {
        const holen = async (unter) => (await fb.fetch(BASIS + "/" + unter + ".json", {})).status;
        gleich(await holen("spieler"), 401, "spieler");
        gleich(await holen("spieler/konten"), 401, "konten");
        gleich(await holen("spieler/oeffentlich"), 401, "oeffentlich");
        gleich(await holen("spieler/namen"), 401, "namen");
        gleich(await holen("typoluck-intern"), 401, "typoluck-intern");
        gleich(await holen("spieler/anmeldung/jonas"), 200, "Verzeichnis je Name");
        gleich(await holen("spieler/geaendertAm"), 200, "Marke");
    });

    await pruefe("§12 Lesen: niemand liest spieler ganz; fremde nur als Auszug, der eigene Eintrag voll", async () => {
        const w = await angemeldetAls(fb, "Anna", PW.anna);
        const zaehlerVorher = fb.aufrufe.length;
        const daten = await laden(w);
        const aufrufe = fb.aufrufe.slice(zaehlerVorher).filter((a) => a.methode === "GET");
        wahr(!aufrufe.some((a) => a.pfad === "/spieler" && !a.flach), "spieler ganz gelesen");
        wahr(!aufrufe.some((a) => a.pfad === "/spieler/konten"), "alle Konten gelesen");
        wahr(aufrufe.some((a) => a.pfad === "/spieler/oeffentlich"), "Auszüge gelesen");
        const ich = daten.spieler.find((s) => s.name === "Anna");
        wahr(ich && ich.tag && ich.kennung, "eigener Eintrag mit Nummer");
        const bert = daten.spieler.find((s) => s.name === "Bert");
        wahr(bert && bert.tag && !bert.kennung && !bert.fortschritt && bert.auszug, "Bert nur als Auszug (mit Nummer)");
        wahr(w.SPIELER.istVerteiler(daten.spieler.find((s) => s.uid === OBER)), "UP#Plus ohne Nummer erkannt");
        wahr(!w.SPIELER.mitspieler(daten).some((s) => s.uid === OBER), "UP#Plus in keiner Liste");
    });

    await pruefe("§12 Anmelden: nur Name, falsches Passwort, Gast-Name, unbekannt", async () => {
        const w = appLaden(fb);
        await laden(w);
        gleich(w.abgleich.daten.spieler.length, 0, "vor der Anmeldung keine Spieler");
        const falsch = await w.KONTO.anmeldenMitEingabe(w.abgleich.daten, "Anna", "Falsch#Pw1");
        gleich([falsch.ok, falsch.fehler], [false, "falsch"], "falsches Passwort");
        const gast = await w.KONTO.anmeldenMitEingabe(w.abgleich.daten, "Gast", "x");
        gleich(gast.fehler, "gast", "Gast-Name");
        const niemand = await w.KONTO.anmeldenMitEingabe(w.abgleich.daten, "Zora", PW.anna);
        gleich(niemand.fehler, "unbekannt", "unbekannter Name");
        const gut = await w.ANMELDUNG._kontoAnmeldenVersuchen("anna", PW.anna);
        wahr(gut.ok, "Anna angemeldet");
        wahr(w.ANMELDUNG.ich() && w.ANMELDUNG.ich().tag === konten.anna.tag, "eigener Eintrag nach der Anmeldung da");
    });

    await pruefe("§12 Anmelden: gleiche Namen + gleiches Passwort → Auswahl, Nummer erst nach dem Passwort", async () => {
        const w = appLaden(fb);
        await laden(w);
        const ergebnis = await w.KONTO.anmeldenMitEingabe(w.abgleich.daten, "Jonas", PW.jonas);
        gleich(ergebnis.fehler, "auswahl", "Auswahl");
        gleich(ergebnis.auswahl.map((s) => s.tag).sort(), [konten.jonas1.tag, "7777"].sort(), "Nummern der Treffer");
        wahr(ergebnis.auswahl.some((s) => s.fortschritt), "Level lesbar (eigener Schlüssel)");
        const gewaehlt = await w.KONTO.anmeldenAuswahl(ergebnis.auswahl.find((s) => s.tag === "7777"), PW.jonas);
        wahr(gewaehlt.ok && w.KONTO.uid() === "uid-jonas2", "gewählt angemeldet");
        const direkt = appLaden(fb);
        await laden(direkt);
        const mitNummer = await direkt.KONTO.anmeldenMitEingabe(direkt.abgleich.daten, "Jonas#7777", PW.jonas);
        wahr(mitNummer.ok && direkt.KONTO.uid() === "uid-jonas2", "Name#Nummer direkt");
        const falscheNummer = await appLaden(fb).KONTO.anmeldenMitEingabe(null, "Jonas#1111", PW.jonas);
        gleich(falscheNummer.fehler, "unbekannt", "falsche Nummer");
    });

    await pruefe("§12 Freund suchen: nur Name#Nummer, gezielt; nur Name → Hinweis", async () => {
        const w = await angemeldetAls(fb, "Bert", PW.bert);
        gleich((await w.KONTO.freundFinden(w.abgleich.daten, "Anna")).fehler, "nummer", "nur Name");
        const vorher = fb.aufrufe.length;
        const fund = await w.KONTO.freundFinden(w.abgleich.daten, "Anna#" + konten.anna.tag);
        gleich(fund.spieler && fund.spieler.name, "Anna", "gefunden");
        wahr(fb.aufrufe.slice(vorher).some((a) => a.pfad === "/spieler/namen/anna/" + konten.anna.tag), "gezielt gelesen");
        wahr(!(await w.KONTO.freundFinden(w.abgleich.daten, "Anna#0000")).spieler, "falsche Nummer: niemand");
    });

    await pruefe("§12 Nummer ändern: EIN Schritt (neuer Platz, alter frei, Konto); vergeben → nichts; Suche folgt", async () => {
        const w = await angemeldetAls(fb, "Anna", PW.anna);
        const alt = konten.anna.tag;
        const ich = w.ANMELDUNG.ich();
        const besetzt = await w.KONTO.tagAendern(w.speicher, w.abgleich.daten, ich, konten.jonas1.tag === alt ? "7777" : alt);
        wahr(besetzt.ok, "eigene Nummer bleibt ok");
        /* Eine fremde, besetzte Nummer: Bert hat seine. */
        spieler(fb).namen.anna = Object.assign({}, spieler(fb).namen.anna, { "5555": "uid-fremd" });
        const abgelehnt = await w.KONTO.tagAendern(w.speicher, w.abgleich.daten, ich, "5555");
        gleich(abgelehnt.text, "Diese Nummer ist vergeben.", "besetzt");
        gleich(spieler(fb).konten[ich.uid].tag, alt, "nichts geändert");
        const patchVorher = fb.aufrufe.filter((a) => a.methode === "PATCH").length;
        const neu = await w.KONTO.tagAendern(w.speicher, w.abgleich.daten, ich, "4242");
        wahr(neu.ok, "freie Nummer: " + JSON.stringify(neu));
        gleich(fb.aufrufe.filter((a) => a.methode === "PATCH").length - patchVorher, 1, "EIN Schritt");
        gleich(spieler(fb).namen.anna["4242"], ich.uid, "neuer Platz");
        wahr(!(alt in spieler(fb).namen.anna), "alter Platz frei");
        gleich(spieler(fb).konten[ich.uid].tag, "4242", "Konto");
        gleich(spieler(fb).oeffentlich[ich.uid].tag, "4242", "Auszug zieht mit (seit v0.155.0)");
        const b = await angemeldetAls(fb, "Bert", PW.bert);
        wahr((await b.KONTO.freundFinden(b.abgleich.daten, "Anna#4242")).spieler, "neue Nummer gefunden");
        wahr(!(await b.KONTO.freundFinden(b.abgleich.daten, "Anna#" + alt)).spieler, "alte nicht mehr");
        const wieder = await angemeldetAls(fb, "Anna", PW.anna);
        wahr(wieder.KONTO.uid() === ich.uid, "Anmelden ohne Nummer geht weiter");
        konten.anna.tag = "4242";
    });

    await pruefe("§12 zwei gleichzeitig auf dieselbe Nummer → genau einer gewinnt", async () => {
        const anna = await angemeldetAls(fb, "Anna", PW.anna);
        /* Ein zweites Konto „Anna" mit anderem Passwort. */
        const zweite = appLaden(fb);
        await laden(zweite);
        const angelegt = await zweite.KONTO.kontoAnlegen(zweite.speicher, zweite.abgleich.daten, "Anna", "Anna#Zwei2");
        wahr(angelegt.ok, "zweite Anna");
        await laden(zweite);
        const a = anna.KONTO.tagAendern(anna.speicher, anna.abgleich.daten, anna.ANMELDUNG.ich(), "3131");
        const b = zweite.KONTO.tagAendern(zweite.speicher, zweite.abgleich.daten,
            zweite.abgleich.daten.spieler.find((s) => s.uid === zweite.KONTO.uid()), "3131");
        const ergebnisse = await Promise.all([a, b]);
        gleich(ergebnisse.filter((e) => e.ok).length, 1, "genau einer");
        wahr(typeof spieler(fb).namen.anna["3131"] === "string", "Platz belegt, einmal");
    });

    await pruefe("§12 Konto anlegen: vier Knoten in einem Schritt; besetzte Nummer → neu gewürfelt", async () => {
        const w = appLaden(fb);
        await laden(w);
        const zahlen = [1234, 5678];
        spieler(fb).namen.carla = { "1234": "uid-fremd" };
        w.KONTO._zufallsZahl = (grenze) => (grenze === 10000 && zahlen.length ? zahlen.shift() : 42);
        const ergebnis = await w.KONTO.kontoAnlegen(w.speicher, w.abgleich.daten, "Carla", "Carla#Pw1");
        wahr(ergebnis.ok, "angelegt: " + JSON.stringify(ergebnis));
        gleich(ergebnis.eintrag.tag, "5678", "zweiter Wurf");
        const uid = w.KONTO.uid();
        wahr(spieler(fb).konten[uid] && spieler(fb).oeffentlich[uid] && spieler(fb).anmeldung.carla[uid],
            "Konto, Auszug, Verzeichnis");
        gleich(spieler(fb).namen.carla["5678"], uid, "Namens-Platz");
    });

    await pruefe("§12 Gast: Auszug mit gast, kein Verzeichnis; Sichern bringt den Verzeichnis-Eintrag", async () => {
        const w = appLaden(fb);
        await laden(w);
        const gast = await w.KONTO.gastAnlegen(w.speicher, w.abgleich.daten);
        wahr(gast.ok, "Gast: " + JSON.stringify(gast));
        const uid = w.KONTO.uid();
        gleich(spieler(fb).oeffentlich[uid].gast, true, "Auszug mit gast");
        wahr(!spieler(fb).anmeldung.gast, "Gast nicht im Verzeichnis");
        await laden(w);
        const eintrag = w.abgleich.daten.spieler.find((s) => s.uid === uid);
        const gesichert = await w.KONTO.gastSichern(w.speicher, w.abgleich.daten, eintrag, "Dora", "Dora#Pw12");
        wahr(gesichert.ok, "gesichert: " + JSON.stringify(gesichert));
        gleich(spieler(fb).anmeldung.dora[uid].k, gesichert.eintrag.kennung, "jetzt im Verzeichnis");
        wahr(!spieler(fb).oeffentlich[uid].gast, "Auszug ohne gast");
    });

    await pruefe("§12 Neu verbinden: Admin gibt frei (f im Verzeichnis), Anmeldung erkennt es, neues Konto zieht um", async () => {
        const up = appLaden(fb);
        await up.KONTO.anmelden("up-plus", PW.ober);
        await laden(up);
        const bert = up.abgleich.daten.spieler.find((s) => s.name === "Bert");
        const frei = await up.KONTO.freigeben(up.speicher, bert);
        wahr(frei.ok, "freigegeben: " + JSON.stringify(frei));
        gleich(spieler(fb).anmeldung.bert[bert.uid].f, true, "f im Verzeichnis");
        const w = appLaden(fb);
        await laden(w);
        const versuch = await w.KONTO.anmeldenMitEingabe(w.abgleich.daten, "Bert", "egal");
        gleich(versuch.fehler, "freigegeben", "erkannt");
        const neu = await w.KONTO.neuVerbinden(w.speicher, w.abgleich.daten, versuch.spieler, PW.neu);
        wahr(neu.ok, "neu verbunden: " + JSON.stringify(neu));
        const neueUid = w.KONTO.uid();
        wahr(neueUid !== bert.uid && spieler(fb).konten[neueUid], "neues Konto");
        wahr(!spieler(fb).konten[bert.uid] && !spieler(fb).oeffentlich[bert.uid], "altes Konto und Auszug weg");
        wahr(!spieler(fb).anmeldung.bert[bert.uid] && spieler(fb).anmeldung.bert[neueUid], "Verzeichnis umgezogen");
        gleich(spieler(fb).konten[neueUid].id, bert.id, "Spieler-Kennung bleibt");
        const wieder = await angemeldetAls(fb, "Bert", PW.neu);
        gleich(wieder.KONTO.uid(), neueUid, "Anmelden mit neuem Passwort");
    });

    await pruefe("§12 Verwaltung: Admin entfernt — Auszug und Verzeichnis gehen mit", async () => {
        const up = appLaden(fb);
        await up.KONTO.anmelden("up-plus", PW.ober);
        await laden(up);
        const carla = up.abgleich.daten.spieler.find((s) => s.name === "Carla");
        const weg = await up.KONTO.eintragEntfernen(up.speicher, carla);
        wahr(weg.ok, "entfernt: " + JSON.stringify(weg));
        wahr(!spieler(fb).konten[carla.uid] && !spieler(fb).oeffentlich[carla.uid]
            && !(spieler(fb).anmeldung.carla && spieler(fb).anmeldung.carla[carla.uid]), "alles weg");
    });

    await pruefe("§12 Marke: steigt bei öffentlichen Änderungen, nicht beim Aussehen", async () => {
        const w = await angemeldetAls(fb, "Anna", PW.anna);
        await laden(w);
        const ich = () => w.abgleich.daten.spieler.find((s) => s.uid === w.KONTO.uid());
        await w.speicher.speichern(w.abgleich.daten);
        const marke = spieler(fb).geaendertAm;
        const mitAussehen = w.SPIELER.aussehenJeSetzen(w.abgleich.daten, ich().id, "blunderluck",
            { farbwelt: "gold", stand: 5 });
        await w.speicher.speichern(mitAussehen);
        gleich(spieler(fb).konten[w.KONTO.uid()].aussehenJe.blunderluck.farbwelt, "gold", "Aussehen geschrieben");
        gleich(spieler(fb).geaendertAm, marke, "Marke unverändert");
        w.abgleich.daten = mitAussehen;
        const bertId = w.abgleich.daten.spieler.find((s) => s.name === "Bert").id;
        const mitFreund = w.SPIELER.freundHinzufuegen(w.abgleich.daten, ich().id, bertId);
        await w.speicher.speichern(mitFreund);
        wahr(spieler(fb).geaendertAm > marke, "Marke gestiegen");
        wahr(JSON.stringify(spieler(fb).oeffentlich[w.KONTO.uid()].freunde).indexOf(bertId) !== -1,
            "Freund im Auszug");
    });

    await pruefe("§12 Blunderluck: `stufe` wandert unverändert durch, ganzer Eintrag von der Regel angenommen", async () => {
        const w = await angemeldetAls(fb, "Anna", PW.anna);
        const uid = w.KONTO.uid();
        const stufe = { typoluck: { wert: 41, unsicher: 6, runden: 12, stand: 1000 } };
        spieler(fb).konten[uid].stufe = stufe;
        await laden(w);
        const eintrag = w.umgebung.SpeicherKonten.eintragFuerServer(
            w.abgleich.daten.spieler.find((s) => s.uid === uid));
        gleich(eintrag.stufe, stufe, "durchgereicht");
        const mitAbzeichen = w.SPIELER.abzeichenSetzen(w.abgleich.daten, eintrag.id, ["erste-partie"]);
        await w.speicher.speichern(mitAbzeichen);
        gleich(spieler(fb).konten[uid].stufe, stufe, "Stufe bleibt auf dem Server");
    });

    await pruefe("Auszug: nur erlaubte Felder; Level und fünf Abzeichen = aus dem vollen Fortschritt", async () => {
        const w = appLaden(fb);
        const F = w.FORTSCHRITT;
        const A = w.umgebung.UPCREW_ABZEICHEN;
        const heute = "2026-09-28";
        const staende = [
            null,
            { version: 1, spiele: { blunderluck: { xp: 4321, partien: 57, tage: ["2026-09-26", "2026-09-27", "2026-09-28"],
                zaehler: { serie: 3, serieBis: 20260928, besteSerie: 9, figuren: 12, tagesaufgaben: 20, beideTage: 2 },
                turm: { figuren: { "1-1": 3, "1-2": 2 } } },
            typoluck: { xp: 800, partien: 30, tage: ["2026-09-27"], zaehler: { tagesaufgaben: 5 } } } },
            { version: 1, spiele: { typoluck: { xp: 99999, partien: 3, tage: ["2026-09-01"] } } }
        ];
        for (const stand of staende) {
            const a = F.auszug(stand, heute);
            gleich(Object.keys(a).sort(), ["serie", "serieBis", "werte", "xp"], "Felder");
            gleich(Object.keys(a.werte).sort(), ["beideTage", "besteSerie", "figuren", "partien", "tagesaufgaben"], "Werte");
            gleich(F.auszugLevel(a), F.level(stand), "Level");
            const sauber = F.normalisieren(stand);
            const laufend = F.serie(sauber, heute, F.schutzVerdient(F.level(sauber).level)).tage;
            const voll = A.liste(sauber, laufend).map((e) => [e.id, e.wert, e.erreicht]);
            const ausAuszug = A.liste(F.auszugAlsStand(a), F.auszugSerie(a, heute)).map((e) => [e.id, e.wert, e.erreicht]);
            gleich(ausAuszug, voll, "fünf Abzeichen");
        }
        gleich(F.auszugVon({ auszug: F.auszug(staende[1], heute) }, heute), F.auszug(staende[1], heute), "Auszug vom Eintrag");
        const oeff = w.KONTO.oeffentlichVon({ id: "i", name: "N", tag: "0001", kennung: "k", uid: "u",
            aussehen: {}, fortschritt: staende[1], stufe: {}, freunde: ["a"], abzeichen: [] });
        gleich(Object.keys(oeff).sort(), ["auszug", "freunde", "id", "name", "tag"], "öffentlich nur erlaubte Felder");
        wahr(!("spielzeit" in oeff.auszug.werte), "Spielzeit nur mit Haken");
        gleich(w.KONTO.oeffentlichVon({ id: "i", name: "N", tag: "0001", fortschritt: staende[1] }, heute, true)
            .auszug.werte.spielzeit, 0, "mit Haken: Spielzeit im Auszug");
    });

    await pruefe("Gegenproben: der Nachbau lehnt ab, was die Regel §12 verbietet", async () => {
        const w = await angemeldetAls(fb, "Anna", PW.anna);
        const uid = w.KONTO.uid();
        const token = await w.KONTO.token();
        const schreiben = async (aenderungen) => (await fb.fetch(BASIS + "/spieler.json?auth=" + token,
            { method: "PATCH", body: JSON.stringify(aenderungen) })).status;
        const mein = spieler(fb).oeffentlich[uid];
        const bertUid = Object.keys(spieler(fb).oeffentlich).find((u) => spieler(fb).oeffentlich[u].name === "Bert");
        gleich(await schreiben({ ["oeffentlich/" + uid]: Object.assign({}, mein, { tag: "4242" }) }), 401, "Nummer im Auszug");
        gleich(await schreiben({ ["oeffentlich/" + uid]: Object.assign({}, mein, { name: "Anders" }) }), 401, "Name ≠ Konto");
        gleich(await schreiben({ ["oeffentlich/" + bertUid]: spieler(fb).oeffentlich[bertUid] }), 401, "fremder Auszug");
        gleich(await schreiben({ ["anmeldung/anna/" + uid]: { k: "falsch" } }), 401, "falsche Kennung im Verzeichnis");
        gleich(await schreiben({ ["anmeldung/bert/" + uid]: { k: spieler(fb).konten[uid].kennung } }), 401, "falscher Name im Verzeichnis");
        gleich(await schreiben({ ["konten/" + uid + "/stufe/typoluck"]: { wert: 5 } }), 401, "Stufe ohne runden/stand");
        gleich(await schreiben({ ["oeffentlich/" + uid]: mein }), 200, "eigener Auszug unverändert geht");
    });

    await pruefe("v0.155.0: tag im Auszug nur gleich dem Konto, Spielzeit in werte mit Grenze", async () => {
        const w = await angemeldetAls(fb, "Anna", PW.anna);
        const uid = w.KONTO.uid();
        const token = await w.KONTO.token();
        const schreiben = async (aenderungen) => (await fb.fetch(BASIS + "/spieler.json?auth=" + token,
            { method: "PATCH", body: JSON.stringify(aenderungen) })).status;
        const mein = JSON.parse(JSON.stringify(spieler(fb).oeffentlich[uid]));
        gleich(mein.tag, spieler(fb).konten[uid].tag, "Auszug trägt den Konto-tag");
        gleich(await schreiben({ ["oeffentlich/" + uid]: Object.assign({}, mein, { tag: "9998" }) }), 401, "fremder tag");
        const ohne = Object.assign({}, mein);
        delete ohne.tag;
        gleich(await schreiben({ ["oeffentlich/" + uid]: ohne }), 401, "tag fehlt");
        const mitZeit = JSON.parse(JSON.stringify(mein));
        mitZeit.auszug.werte.spielzeit = 3600;
        gleich(await schreiben({ ["oeffentlich/" + uid]: mitZeit }), 200, "Spielzeit angenommen");
        mitZeit.auszug.werte.spielzeit = 315360001;
        gleich(await schreiben({ ["oeffentlich/" + uid]: mitZeit }), 401, "Spielzeit über der Grenze");
        mitZeit.auszug.werte.spielzeit = 60;
        mitZeit.auszug.werte.sonstwas = 1;
        gleich(await schreiben({ ["oeffentlich/" + uid]: mitZeit }), 401, "anderer Wert-Schlüssel");
        /* Die App: der Haken am KONTO (seit v0.155.2) — mit Haken steht die
           Spielzeit im EIGENEN Auszug, im selben Schritt wie das Konto. */
        await laden(w);
        const ichId = w.abgleich.daten.spieler.find((s) => s.uid === uid).id;
        await w.speicher.speichern(w.SPIELER.spielzeitOeffentlichSetzen(w.abgleich.daten, ichId, true));
        gleich(spieler(fb).konten[uid].spielzeitOeffentlich, true, "Haken am Konto");
        wahr(typeof spieler(fb).oeffentlich[uid].auszug.werte.spielzeit === "number", "mit Haken veröffentlicht");
        const nachUp = appLaden(fb);
        await nachUp.KONTO.anmelden("up-plus", PW.ober);
        await laden(nachUp);
        await nachUp.KONTO.nachziehen(nachUp.speicher);
        wahr(typeof spieler(fb).oeffentlich[uid].auszug.werte.spielzeit === "number", "§12 nachziehen lässt sie stehen");
        await laden(w);
        await w.speicher.speichern(w.SPIELER.spielzeitOeffentlichSetzen(w.abgleich.daten, ichId, false));
        wahr(!("spielzeit" in spieler(fb).oeffentlich[uid].auszug.werte), "Haken aus: wieder privat");
        /* Regel: nur Ja/Nein, nur der Besitzer ändert. */
        gleich(await schreiben({ ["konten/" + uid + "/spielzeitOeffentlich"]: "ja" }), 401, "kein Ja/Nein");
        gleich(await schreiben({ ["konten/" + uid + "/spielzeitOeffentlich"]: true }), 200, "Besitzer ändert");
        const nachbau = new RegelNachbau(REGEL_12);
        const baum = JSON.parse(JSON.stringify(fb.db));
        baum.spieler.rollen = Object.assign({}, baum.spieler.rollen, { "u-adm": "admin" });
        wahr(!nachbau.schreibenPruefen(baum, [{ weg: ["spieler", "konten", uid, "spielzeitOeffentlich"], wert: false }],
            { uid: "u-adm", provider: "password" }).ok, "Admin ändert den Haken nicht");
        /* Unter der heutigen Regel (§11c) geht das Feld schon durch. */
        const alt = new RegelNachbau(REGEL_11C);
        const eintrag = Object.assign({}, fb.db.spieler.konten[uid], { spielzeitOeffentlich: true });
        wahr(alt.schreibenPruefen(fb.db, [{ weg: ["spieler", "konten", uid], wert: eintrag }],
            { uid: uid, provider: "password" }).ok, "§11c nimmt das Feld an");
    });

    await pruefe("v0.155.0 Löschregel: Partie + Übersicht löschen nur Teilnehmer, Admin oder verwaiste Bot-Runde", async () => {
        const nachbau = new RegelNachbau(REGEL_12);
        const partie = (weiss, schwarz, ergebnis) => ({ teams: { weiss: weiss, schwarz: schwarz },
            ergebnis: ergebnis, geaendertAm: 5 });
        const baum = { spieler: {
            konten: { "u-anna": { id: "p-anna" }, "u-bert": { id: "p-bert" }, "u-zora": { id: "p-zora" },
                "u-adm": { id: "p-adm" } },
            rollen: { "u-adm": "admin" } },
        blunderluck: { "team-schach": { geaendertAm: 1,
            partien: { p1: partie(["p-anna"], ["p-bert"], "weiss"), p2: partie(["bot"], [], ""),
                p3: partie(["p-x", "p-y", "p-z", "p-q", "p-anna"], ["bot"], "remis") },
            uebersicht: { p1: partie(["p-anna"], ["p-bert"], "weiss"), p2: partie(["bot"], [], ""),
                p3: partie(["p-x", "p-y", "p-z", "p-q", "p-anna"], ["bot"], "remis") },
            chronik: { 0: { id: "p1" } } } } };
        const loeschen = (id, uid) => nachbau.schreibenPruefen(baum, [
            { weg: ["blunderluck", "team-schach", "partien", id], wert: null },
            { weg: ["blunderluck", "team-schach", "uebersicht", id], wert: null },
            { weg: ["blunderluck", "team-schach", "geaendertAm"], wert: 9 }], { uid: uid, provider: "password" }).ok;
        wahr(loeschen("p1", "u-anna") && loeschen("p1", "u-bert"), "Teilnehmer löschen");
        wahr(!loeschen("p1", "u-zora"), "Fremder löscht NICHT");
        wahr(loeschen("p1", "u-adm") && loeschen("p1", OBER), "Admin und UP#Plus löschen");
        wahr(loeschen("p2", "u-zora"), "verwaiste Bot-Runde darf jeder wegräumen");
        /* Seit v0.155.2 höchstens 3 je Team: geprüft werden die Plätze 0–2. */
        wahr(!loeschen("p3", "u-anna") && loeschen("p3", "u-adm"), "5. Platz (alte Partie): nur Admin");
        const auf2 = JSON.parse(JSON.stringify(baum));
        auf2.blunderluck["team-schach"].partien.p5 = partie(["p-x", "p-y", "p-anna"], ["bot"], "remis");
        auf2.blunderluck["team-schach"].uebersicht.p5 = partie(["p-x", "p-y", "p-anna"], ["bot"], "remis");
        wahr(nachbau.schreibenPruefen(auf2, [
            { weg: ["blunderluck", "team-schach", "partien", "p5"], wert: null },
            { weg: ["blunderluck", "team-schach", "uebersicht", "p5"], wert: null }],
            { uid: "u-anna", provider: "password" }).ok, "3. Platz erkannt");
        /* Kein 4. Platz neu; ein schon vorhandener bleibt schreibbar. */
        const mitVier = (wer) => nachbau.schreibenPruefen(baum, [
            { weg: ["blunderluck", "team-schach", "partien", wer], wert: partie(["a", "b", "c", "d"], ["bot"], "") }],
            { uid: "u-zora", provider: "password" }).ok;
        wahr(!mitVier("p9"), "neue Partie mit 4 in einem Team abgelehnt");
        wahr(mitVier("p3"), "alte Partie mit mehr Plätzen läuft weiter");
        wahr(!nachbau.schreibenPruefen(baum, [{ weg: ["blunderluck", "team-schach", "partien", "p1"], wert: null }],
            null).ok, "ohne Anmeldung nie");
        /* Was heute erlaubt ist, bleibt erlaubt. */
        const auth = { uid: "u-zora", provider: "password" };
        wahr(nachbau.schreibenPruefen(baum, [
            { weg: ["blunderluck", "team-schach", "partien", "p4"], wert: partie(["p-zora"], [], "") },
            { weg: ["blunderluck", "team-schach", "uebersicht", "p4"], wert: partie(["p-zora"], [], "") },
            { weg: ["blunderluck", "team-schach", "chronik", "1"], wert: { id: "p4" } },
            { weg: ["blunderluck", "team-schach", "uebersicht", "p1", "gebucht", "p-zora"], wert: 7 },
            { weg: ["blunderluck", "team-schach", "geaendertAm"], wert: 10 }], auth).ok, "Anlegen, Chronik, gebucht");
        wahr(nachbau.schreibenPruefen(baum, [{ weg: ["blunderluck", "team-schach", "partien", "p1", "zuege"], wert: 3 }],
            auth).ok, "Züge schreiben wie bisher (Züge prüft die App)");
        wahr(!nachbau.schreibenPruefen(baum, [{ weg: ["blunderluck", "team-schach", "chronik"], wert: null }],
            auth).ok, "die ganze Chronik löschen nie");
        wahr(!nachbau.schreibenPruefen(baum, [{ weg: ["blunderluck", "anderes"], wert: 1 }], auth).ok,
            "neben team-schach nichts");
    });

    await pruefe("401 mitten im Lauf: alte Regel zurück → App fällt von selbst in den Modus alt", async () => {
        const w = await angemeldetAls(fb, "Anna", PW.anna);
        gleich(w.KONTO.regel, "p12", "p12");
        fb.regelSetzen(REGEL_11C);
        await laden(w);
        const bertId = w.abgleich.daten.spieler.find((s) => s.name === "Bert").id;
        const ichId = w.ANMELDUNG.ich().id;
        let abgelehnt = false;
        try {
            await w.speicher.speichern(w.SPIELER.freundAblehnen(w.abgleich.daten, ichId, bertId));
        } catch (fehler) {
            abgelehnt = true;
        }
        wahr(abgelehnt, "Schreiben mit §12-Knoten unter der alten Regel abgelehnt");
        await laden(w);
        gleich(w.KONTO.regel, "alt", "neu erkannt: alt");
        await w.speicher.speichern(w.SPIELER.freundAblehnen(w.abgleich.daten, ichId, bertId));
        wahr(true, "danach schreibt sie wie bisher");
        /* Und wieder vor: unter der alten Regel geladen, dann §12 → 401 → §12. */
        fb.regelSetzen(REGEL_12);
        await laden(w);
        gleich(w.KONTO.regel, "p12", "401 beim Laden: neu erkannt");
        wahr(wertBei(fb.db, ["spieler", "oeffentlich"]), "Knoten stehen noch");
    });

    console.log(anzahlOk + " ok, " + anzahlFehler + " Fehler");
    process.exit(anzahlFehler === 0 ? 0 : 1);
})();
