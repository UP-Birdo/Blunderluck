/*
 * test-konto.js — das UPCrew-Konto (seit v0.138.0): js\konto.js, die
 * Konten-Rückwand in js\speicher.js und die Abläufe in anmeldung(-konto).js.
 *
 * Geprüft wird gegen eine NACHGEBAUTE Firebase: Anmeldung (identitytoolkit,
 * securetoken, auch anonym) und zwei Datenbanken — die UPCrew-Datenbank MIT
 * den endgültigen Regeln aus SICHERHEIT.md (Abschnitt 11: eigener Eintrag,
 * Namens-Plätze, Rollen, UP#Plus) und die alte Blunderluck-Datenbank, aus
 * der die Konten umziehen. Hält sich die App nicht an die Regeln, lehnt der
 * Nachbau ab wie die echte Datenbank.
 *
 * Aufruf: siehe tests\README.md
 */

const pfad = require("path");
const dateisystem = require("fs");
const vm = require("vm");

let anzahlOk = 0;
let anzahlFehler = 0;

async function pruefe(bezeichnung, funktion) {
    try {
        await funktion();
        anzahlOk++;
    } catch (fehler) {
        anzahlFehler++;
        console.error("FEHLER: " + bezeichnung);
        console.error("        " + (fehler && fehler.message));
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
 * Die nachgebaute Firebase
 * ------------------------------------------------------------------ */

const UPCREW = "https://upcrew-7a29d-default-rtdb.europe-west1.firebasedatabase.app";
const ALT = "https://blunderluck-8b7f0-default-rtdb.europe-west1.firebasedatabase.app";

function firebaseNachbauen() {
    const fb = {
        db: { upcrew: {}, alt: {} },
        konten: {},            // uid -> { email, passwort, anonym }
        tokens: {},
        erneuerungen: {},
        zaehler: 0,
        oberUid: null,
        aufrufe: [],
        erneuerungAufrufe: 0,
        erneuerungKaputt: false
    };

    const antwort = (status, inhalt) => ({
        ok: status >= 200 && status < 300,
        status: status,
        async json() { return JSON.parse(JSON.stringify(inhalt)); }
    });
    const fehler = (text) => antwort(400, { error: { message: text } });
    const kopie = (wert) => JSON.parse(JSON.stringify(wert));

    const sitzungGeben = (uid) => {
        fb.zaehler++;
        const idToken = "tok-" + uid + "-" + fb.zaehler;
        const refreshToken = "ref-" + uid + "-" + fb.zaehler;
        fb.tokens[idToken] = uid;
        fb.erneuerungen[refreshToken] = uid;
        return { localId: uid, idToken: idToken, refreshToken: refreshToken, expiresIn: "3600" };
    };
    const uidZuAdresse = (email) =>
        Object.keys(fb.konten).find((uid) => fb.konten[uid].email === email);

    const lesen = (baum, teile) => {
        let knoten = baum;
        for (const teil of teile) {
            if (!knoten || typeof knoten !== "object" || !(teil in knoten)) {
                return null;
            }
            knoten = knoten[teil];
        }
        return knoten === undefined ? null : knoten;
    };
    const setzen = (baum, teile, wert) => {
        let knoten = baum;
        for (let i = 0; i < teile.length - 1; i++) {
            if (!knoten[teile[i]] || typeof knoten[teile[i]] !== "object") {
                knoten[teile[i]] = {};
            }
            knoten = knoten[teile[i]];
        }
        const letzter = teile[teile.length - 1];
        if (wert === null) {
            delete knoten[letzter];
        } else {
            knoten[letzter] = kopie(wert);
        }
    };

    /* Die endgültigen Regeln (SICHERHEIT.md, Abschnitt 11). `alt` = Stand
       vor dem Schreiben, `neu` = Stand danach (wie `root`/`newData`). */
    const istAdmin = (alt, uid) => uid === fb.oberUid
        || lesen(alt, ["spieler", "rollen", uid]) === "admin";

    const darfSchreiben = (teile, wert, uid, alt, neu) => {
        if (!uid) {
            return false;
        }
        if (teile[0] === "blunderluck" || teile[0] === "typoluck") {
            return true;
        }
        if (teile[0] !== "spieler") {
            return false;
        }
        if (teile.length === 2 && teile[1] === "geaendertAm") {
            return typeof wert === "number";
        }
        if (teile.length === 3 && teile[1] === "rollen") {
            return uid === fb.oberUid && teile[2] !== fb.oberUid
                && (wert === null || wert === "admin");
        }
        if (teile.length === 4 && teile[1] === "namen") {
            const bisher = lesen(alt, teile);
            const erlaubt = ((bisher === null || bisher === uid) && (wert === null || wert === uid))
                || (bisher !== null && wert === uid
                    && lesen(alt, ["spieler", "konten", bisher, "neuVerbinden"]) === true)
                || (istAdmin(alt, uid) && bisher !== fb.oberUid);
            if (!erlaubt) {
                return false;
            }
            if (wert === null) {
                return true;
            }
            return typeof wert === "string"
                && (/^[0-9]{4}$/.test(teile[3]) || uid === fb.oberUid)
                && teile[2].length >= 3 && teile[2].length <= 16;
        }
        if (teile.length === 3 && teile[1] === "konten") {
            const ziel = teile[2];
            const bisher = lesen(alt, teile);
            const erlaubt = uid === ziel
                || (istAdmin(alt, uid) && ziel !== fb.oberUid)
                || (bisher && bisher.neuVerbinden === true && wert === null);
            if (!erlaubt) {
                return false;
            }
            if (wert === null) {
                return true;
            }
            return typeof wert.id === "string" && typeof wert.name === "string"
                && typeof wert.tag === "string" && wert.uid === ziel
                && wert.name.length >= 1 && wert.name.length <= 40
                && !("pinPruefwert" in wert) && !("pinSalz" in wert)
                && lesen(neu, ["spieler", "namen", wert.name.toLowerCase(), wert.tag]) === ziel;
        }
        return false;
    };

    fb.fetch = async (adresse, einstellungen) => {
        const url = new URL(adresse);
        const methode = (einstellungen && einstellungen.method) || "GET";
        const inhalt = einstellungen && einstellungen.body;
        fb.aufrufe.push({ adresse: adresse, methode: methode, inhalt: inhalt });

        if (url.host === "identitytoolkit.googleapis.com") {
            const d = JSON.parse(inhalt);
            const endpunkt = url.pathname.split("/").pop();
            if (endpunkt === "accounts:signUp") {
                if (!d.email) {
                    const uid = "anon-" + (++fb.zaehler);
                    fb.konten[uid] = { email: null, passwort: null, anonym: true };
                    return antwort(200, sitzungGeben(uid));
                }
                if (uidZuAdresse(d.email)) {
                    return fehler("EMAIL_EXISTS");
                }
                const uid = "uid-" + (++fb.zaehler);
                fb.konten[uid] = { email: d.email, passwort: d.password, anonym: false };
                return antwort(200, sitzungGeben(uid));
            }
            if (endpunkt === "accounts:signInWithPassword") {
                const uid = uidZuAdresse(d.email);
                if (!uid || fb.konten[uid].passwort !== d.password) {
                    return fehler("INVALID_LOGIN_CREDENTIALS");
                }
                return antwort(200, sitzungGeben(uid));
            }
            if (endpunkt === "accounts:update") {
                const uid = fb.tokens[d.idToken];
                if (!uid || !fb.konten[uid]) {
                    return fehler("INVALID_ID_TOKEN");
                }
                if (d.email) {
                    if (uidZuAdresse(d.email) && uidZuAdresse(d.email) !== uid) {
                        return fehler("EMAIL_EXISTS");
                    }
                    fb.konten[uid].email = d.email;
                    fb.konten[uid].anonym = false;
                }
                if (d.password) {
                    fb.konten[uid].passwort = d.password;
                }
                return antwort(200, sitzungGeben(uid));
            }
            if (endpunkt === "accounts:delete") {
                const uid = fb.tokens[d.idToken];
                if (!uid || !fb.konten[uid]) {
                    return fehler("USER_NOT_FOUND");
                }
                delete fb.konten[uid];
                return antwort(200, {});
            }
            return fehler("UNBEKANNT");
        }

        if (url.host === "securetoken.googleapis.com") {
            fb.erneuerungAufrufe++;
            const uid = fb.erneuerungen[new URLSearchParams(inhalt).get("refresh_token")];
            if (!uid || fb.erneuerungKaputt) {
                return antwort(400, { error: { message: "INVALID_REFRESH_TOKEN" } });
            }
            const neu = sitzungGeben(uid);
            return antwort(200, { id_token: neu.idToken, refresh_token: neu.refreshToken,
                expires_in: "3600", user_id: uid });
        }

        const baumName = (adresse.indexOf(UPCREW) === 0) ? "upcrew"
            : (adresse.indexOf(ALT) === 0) ? "alt" : null;
        if (!baumName) {
            return antwort(404, null);
        }
        const baum = fb.db[baumName];
        const teile = url.pathname.replace(/\.json$/, "").split("/").filter((t) => t !== "");
        const uid = fb.tokens[url.searchParams.get("auth")] || null;

        if (methode === "GET") {
            return antwort(200, lesen(baum, teile));
        }
        if (baumName === "alt") {
            return antwort(401, { error: "Permission denied" });
        }
        if (methode === "PATCH") {
            const aenderungen = JSON.parse(inhalt);
            const neu = kopie(baum);
            for (const schluessel of Object.keys(aenderungen)) {
                setzen(neu, teile.concat(schluessel.split("/")), aenderungen[schluessel]);
            }
            for (const schluessel of Object.keys(aenderungen)) {
                if (!darfSchreiben(teile.concat(schluessel.split("/")), aenderungen[schluessel],
                        uid, baum, neu)) {
                    return antwort(401, { error: "Permission denied" });
                }
            }
            fb.db.upcrew = neu;
            return antwort(200, aenderungen);
        }
        return antwort(405, null);
    };

    return fb;
}

/* ------------------------------------------------------------------ *
 * Die App in einer eigenen Umgebung
 * ------------------------------------------------------------------ */

function appLaden(fb) {
    const gespeichert = {};
    const dialog = { antworten: [], fragen: [], hinweise: [], kurz: [] };

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
                modus: "gemeinsam", firebaseBasis: UPCREW, pfad: "spieler",
                schachPfad: "blunderluck/team-schach", abfrageIntervallMs: 3000,
                schreibVerzoegerungMs: 0, lokalerSchluessel: "blunderluck.spieler",
                lokalerSchluesselSchach: "blunderluck.team-schach"
            },
            konto: { apiKey: "test-schluessel", domain: "konten.upcrew.invalid",
                altBasis: ALT, altPfad: "spieler" }
        },
        DIALOG: {
            async passwort() { return dialog.antworten.shift(); },
            async eingabe() { return dialog.antworten.shift(); },
            async hinweis(titel, text) { dialog.hinweise.push(titel + ": " + text); },
            async frage(titel) { dialog.fragen.push(titel); return dialog.antworten.shift(); },
            kurzmeldung(text) { dialog.kurz.push(text); }
        },
        TABS: { wechseln() {} }
    };
    umgebung.globalThis = umgebung;
    vm.createContext(umgebung);

    const jsOrdner = pfad.join(__dirname, "..", "js");
    const quelltext = ["konto.js", "spieler.js", "versiegelung.js", "ich.js", "fuehlen.js",
        "speicher.js", "abgleich.js", "anmeldung.js", "anmeldung-konto.js"]
        .map((name) => dateisystem.readFileSync(pfad.join(jsOrdner, name), "utf8"))
        .join("\n;\n")
        + "\nObject.assign(globalThis, { KONTO, SPIELER, VERSIEGELUNG, ICH, ANMELDUNG,"
        + " Abgleich, SpeicherGemeinsam, SpeicherKonten, speicherErzeugen });";
    vm.runInContext(quelltext, umgebung, { filename: "konto-umgebung.js" });

    const { KONTO, SPIELER, ANMELDUNG } = umgebung;
    KONTO.einrichten(umgebung.KONFIG);
    umgebung.SpeicherGemeinsam.tokenGeber = () => KONTO.token();
    KONTO.beiVerloren = () => ANMELDUNG.sitzungVerloren();

    const speicher = umgebung.speicherErzeugen(umgebung.KONFIG, "spieler",
        "blunderluck.spieler", (roh) => SPIELER.normalisieren(roh), () => KONTO.uid()).speicher;
    const abgleich = new umgebung.Abgleich(speicher, umgebung.KONFIG.speicher, {
        beiDaten: (daten) => ANMELDUNG.datenAktualisiert(daten),
        beiStatus() {},
        leereDaten: () => SPIELER.leereDaten(),
        inhaltGleich: (a, b) => SPIELER.inhaltGleich(a, b),
        zusammenfuehren: (f, e, id) => SPIELER.zusammenfuehren(f, e, id)
    });
    ANMELDUNG.verbinden(abgleich);
    ANMELDUNG.aufbauen({ hidden: true, innerHTML: "" });

    /* Die Vollbilder selbst prüfen die Bildschirm-Tests — hier genügt, dass
       sie aufgehen (und mit welchem Namen). */
    ANMELDUNG._vollbildZeigen = (vorname) => {
        ANMELDUNG.anmeldenLaeuft = true;
        umgebung.vollbild = vorname || "Weiche";
    };

    return { umgebung, KONTO, SPIELER, ANMELDUNG, abgleich, speicher, dialog, gespeichert };
}

/* Eine frische Welt: alte Datenbank mit Jonas (PIN 1234) und fr3ddy. */
async function welt() {
    const fb = firebaseNachbauen();
    const app = appLaden(fb);
    const V = app.umgebung.VERSIEGELUNG;
    fb.db.alt.spieler = {
        datenVersion: 1, geaendertAm: 1000,
        spieler: [
            { id: "id-jonas", name: "Jonas", freunde: ["id-freddy"],
                pinSalz: "aa11", pinPruefwert: await V.pinPruefwertBilden("1234", "aa11") },
            { id: "id-freddy", name: "fr3ddy",
                pinSalz: "bb22", pinPruefwert: await V.pinPruefwertBilden("geheim7", "bb22") }
        ]
    };
    app.abgleich.daten = await app.speicher.laden();
    return Object.assign(app, { fb });
}

const konten = (fb) => (fb.db.upcrew.spieler && fb.db.upcrew.spieler.konten) || {};
const namen = (fb) => (fb.db.upcrew.spieler && fb.db.upcrew.spieler.namen) || {};
const NEU = "Neu#Pass1";

async function nachladen(w) {
    w.abgleich.daten = await w.speicher.laden();
}

/* Jonas zieht um (altes Passwort 1234, neues NEU) und ist angemeldet. */
async function jonasUmziehen(w) {
    const schritt = await w.ANMELDUNG._kontoAnmeldenVersuchen("Jonas", "1234");
    wahr(schritt.weiter, "kein Umzug angeboten: " + JSON.stringify(schritt));
    const alt = w.SPIELER.spielerNachName(w.ANMELDUNG._altDaten, "Jonas");
    const ergebnis = await w.KONTO.umziehen(w.speicher, w.abgleich.daten, alt, "Jonas", NEU, "1234");
    wahr(ergebnis.ok, "Umzug: " + JSON.stringify(ergebnis));
    await nachladen(w);
    w.ANMELDUNG._uebernehmen(ergebnis.eintrag);
    return ergebnis.eintrag;
}

/* UP#Plus anlegen, wie es das Werkzeug tut (vor den endgültigen Regeln). */
function oberAnlegen(w) {
    const uid = "uid-ober";
    w.fb.oberUid = uid;
    w.fb.konten[uid] = { email: "up-plus@konten.upcrew.invalid", passwort: "Stark#Pw9", anonym: false };
    w.fb.db.upcrew.spieler = w.fb.db.upcrew.spieler || {};
    w.fb.db.upcrew.spieler.konten = Object.assign(konten(w.fb), {
        [uid]: { id: "id-ober", name: "UP", tag: "Plus", uid: uid, kennung: "up-plus" }
    });
    w.fb.db.upcrew.spieler.namen = Object.assign(namen(w.fb), { up: { Plus: uid } });
    return uid;
}

/* ------------------------------------------------------------------ *
 * Die Prüfungen
 * ------------------------------------------------------------------ */

(async () => {

    await pruefe("Namen: Symbole und Leerzeichen fallen weg, Länge und Reserviertes", async () => {
        const { KONTO } = await welt();
        gleich(KONTO.nameSaeubern(" Jo nas!_ "), "Jonas", "gesäubert");
        gleich(KONTO.nameSaeubern("Jönäs ß"), "Jönäsß", "Umlaute bleiben");
        gleich(KONTO.nameSaeubern("Jоnas"), "Jnas", "kyrillisches o fällt weg");
        wahr(KONTO.namePruefen("Jo") !== "", "zu kurz angenommen");
        wahr(KONTO.namePruefen("gast") !== "", "reservierter Name angenommen");
        wahr(KONTO.namePruefen("UP") !== "", "UP angenommen");
        gleich(KONTO.namePruefen("Jonas"), "", "Jonas");
    });

    await pruefe("Passwort: 8 bis 12 Zeichen, gross, klein, Ziffer, Sonderzeichen", async () => {
        const { KONTO } = await welt();
        gleich(KONTO.passwortPruefen("Neu#Pass1"), "", "gültig");
        wahr(KONTO.passwortPruefen("Ne#1a") !== "", "zu kurz");
        wahr(KONTO.passwortPruefen("Neu#Pass1234567") !== "", "zu lang");
        wahr(KONTO.passwortPruefen("neu#pass1") !== "", "ohne Grossbuchstaben");
        wahr(KONTO.passwortPruefen("NEU#PASS1") !== "", "ohne Kleinbuchstaben");
        wahr(KONTO.passwortPruefen("Neu#Passw") !== "", "ohne Ziffer");
        wahr(KONTO.passwortPruefen("NeuPass12") !== "", "ohne Sonderzeichen");
        wahr(KONTO.passwortPruefen("Neu# Pass1") !== "", "mit Leerzeichen");
        /* Genau wie die Passwortrichtlinie von Firebase: § + € und Umlaute
           zählen dort nicht (25.09.2026 abgefragt). */
        wahr(KONTO.passwortPruefen("Neu§Pass1") !== "", "§ als Sonderzeichen angenommen");
        wahr(KONTO.passwortPruefen("Neu+Pass1") !== "", "+ als Sonderzeichen angenommen");
        wahr(KONTO.passwortPruefen("ÄÖÜ#pass1") !== "", "Umlaut als Grossbuchstabe angenommen");
        gleich(KONTO.passwortPruefen("Neu-Pass_1"), "", "Bindestrich und Unterstrich");
        gleich(KONTO.passwortPruefen("A1b\\cdefg"), "", "Backslash");
    });

    await pruefe("Eingabe Name#Nummer wird zerlegt und gesäubert", async () => {
        const { KONTO } = await welt();
        const teile = KONTO.eingabeZerlegen("Jo nas#00-01");
        gleich(teile.name, "Jonas", "Name");
        gleich(teile.tag, "0001", "Nummer");
        gleich(KONTO.eingabeZerlegen("Jonas").tag, null, "ohne Nummer");
        gleich(KONTO.eingabeSaeubern("UP#Plus!"), "UP#Plus", "UP#Plus");
        gleich(KONTO.anzeigeName({ name: "Jonas", tag: "0001" }), "Jonas#0001", "Anzeige");
    });

    await pruefe("Umzug: altes Passwort prüfen, neues nach der Regel, Nummer 0001", async () => {
        const w = await welt();
        const eintrag = await jonasUmziehen(w);
        gleich(eintrag.tag, "0001", "Nummer");
        gleich(eintrag.id, "id-jonas", "Spieler-Kennung bleibt");
        const uid = w.KONTO.uid();
        const server = konten(w.fb)[uid];
        gleich(server.name, "Jonas", "Name");
        gleich(server.freunde.join(","), "id-freddy", "Freunde ziehen mit");
        wahr(!("pinPruefwert" in server) && !("pinSalz" in server), "Prüfsumme mitgezogen");
        gleich(namen(w.fb).jonas["0001"], uid, "Namens-Platz");
        gleich(w.fb.konten[uid].email, "id-jonas@konten.upcrew.invalid", "erfundene Adresse");
        gleich(w.fb.konten[uid].passwort, NEU, "neues Passwort, ohne Zutat");
    });

    await pruefe("Zwischenstand-Konto (alte Zutat, ohne Nummer) zieht sauber um", async () => {
        const w = await welt();
        /* So hat es der Zwischenstand vom 25.09. nachts hinterlassen. */
        w.fb.konten["uid-zw"] = { email: "id-jonas@konten.upcrew.invalid",
            passwort: "upcrew-konto|1234", anonym: false };
        w.fb.db.upcrew.spieler = { geaendertAm: 1, konten: { "uid-zw": {
            id: "id-jonas", name: "Jonas", uid: "uid-zw", kennung: "id-jonas",
            freunde: ["id-freddy"] } } };
        await nachladen(w);
        w.umgebung.ICH.personSetzen("id-jonas", "Jonas");
        w.KONTO.sitzung = { kennung: "id-jonas", uid: "uid-zw", idToken: "x",
            refreshToken: "ref-alt", ablauf: 0, gast: false };
        w.ANMELDUNG.anmelden();
        gleich(w.umgebung.vollbild, "Jonas", "Umzugs-Hinweis statt direkt hinein");
        w.KONTO.abmelden();

        const eintrag = await jonasUmziehen(w);
        gleich(w.KONTO.uid(), "uid-zw", "dasselbe Firebase-Konto");
        gleich(eintrag.tag, "0001", "Nummer");
        gleich(w.fb.konten["uid-zw"].passwort, NEU, "neues Passwort");
        gleich(namen(w.fb).jonas["0001"], "uid-zw", "Namens-Platz");
        gleich(konten(w.fb)["uid-zw"].tag, "0001", "Eintrag mit Nummer");
    });

    await pruefe("Umzug: falsches altes Passwort legt nichts an", async () => {
        const w = await welt();
        const schritt = await w.ANMELDUNG._kontoAnmeldenVersuchen("Jonas", "9999");
        gleich(schritt.fehler, "falsch", "Fehlerart");
        gleich(Object.keys(w.fb.konten).length, 0, "Firebase-Konten");
    });

    await pruefe("Umzug: ein neues Passwort gegen die Regel wird abgelehnt", async () => {
        const w = await welt();
        await w.ANMELDUNG._kontoAnmeldenVersuchen("Jonas", "1234");
        const alt = w.SPIELER.spielerNachName(w.ANMELDUNG._altDaten, "Jonas");
        const ergebnis = await w.KONTO.umziehen(w.speicher, w.abgleich.daten, alt, "Jonas", "1234");
        wahr(!ergebnis.ok, "schwaches Passwort angenommen");
        gleich(Object.keys(w.fb.konten).length, 0, "Firebase-Konten");
    });

    await pruefe("Nach dem Umzug: Anmelden mit Jonas#0001 und neuem Passwort, die alte PIN gilt nicht", async () => {
        const w = await welt();
        await jonasUmziehen(w);
        w.KONTO.abmelden();
        const mitNummer = await w.ANMELDUNG._kontoAnmeldenVersuchen("Jonas#0001", NEU);
        wahr(mitNummer.ok, "mit Nummer: " + JSON.stringify(mitNummer));
        w.KONTO.abmelden();
        const ohneNummer = await w.ANMELDUNG._kontoAnmeldenVersuchen("jonas", NEU);
        wahr(ohneNummer.ok, "eindeutiger Name ohne Nummer");
        w.KONTO.abmelden();
        const altePin = await w.ANMELDUNG._kontoAnmeldenVersuchen("Jonas", "1234");
        gleich(altePin.fehler, "falsch", "alte PIN");
    });

    await pruefe("Zwei Jonase: verschiedene Nummern, ohne Nummer mehrdeutig", async () => {
        const w = await welt();
        await jonasUmziehen(w);
        w.KONTO.abmelden();
        const zweiter = await w.KONTO.kontoAnlegen(w.speicher, w.abgleich.daten, "Jonas", "Zwei#Pass2");
        wahr(zweiter.ok, "zweiter Jonas: " + JSON.stringify(zweiter));
        wahr(zweiter.eintrag.tag !== "0001" && /^[0-9]{4}$/.test(zweiter.eintrag.tag), "Nummer");
        await nachladen(w);
        w.KONTO.abmelden();
        const ohne = await w.ANMELDUNG._kontoAnmeldenVersuchen("Jonas", NEU);
        gleich(ohne.fehler, "mehrdeutig", "ohne Nummer");
    });

    await pruefe("Die Datenbank lässt einen besetzten Namens-Platz nicht übernehmen", async () => {
        const w = await welt();
        await jonasUmziehen(w);
        w.KONTO.abmelden();
        await w.KONTO.kontoAnlegen(w.speicher, w.abgleich.daten, "Mia", "Mia#Pass1");
        let abgelehnt = false;
        try {
            await w.speicher.teilSchreiben({ "namen/jonas/0001": w.KONTO.uid() });
        } catch (fehler) {
            abgelehnt = true;
        }
        wahr(abgelehnt, "fremder Namens-Platz übernommen");
        gleich(namen(w.fb).jonas["0001"] !== w.KONTO.uid(), true, "Platz gehört noch Jonas");
    });

    await pruefe("Gast: anonymes Konto, Gast#Nummer, Sichern behält die Konto-Nummer", async () => {
        const w = await welt();
        const gast = await w.KONTO.gastAnlegen(w.speicher, w.abgleich.daten);
        wahr(gast.ok, "Gast: " + JSON.stringify(gast));
        const uid = w.KONTO.uid();
        wahr(w.fb.konten[uid].anonym, "nicht anonym");
        gleich(konten(w.fb)[uid].gast, true, "gast-Feld");
        gleich(konten(w.fb)[uid].name, "Gast", "Name");
        await nachladen(w);
        w.ANMELDUNG._uebernehmen(gast.eintrag);

        const gesichert = await w.KONTO.gastSichern(w.speicher, w.abgleich.daten,
            w.ANMELDUNG.ich(), "Lena", "Lena#Pass1");
        wahr(gesichert.ok, "sichern: " + JSON.stringify(gesichert));
        gleich(w.KONTO.uid(), uid, "dieselbe Konto-Nummer");
        wahr(!w.fb.konten[uid].anonym, "noch anonym");
        const eintrag = konten(w.fb)[uid];
        gleich(eintrag.name, "Lena", "neuer Name");
        gleich(eintrag.id, gast.eintrag.id, "Spieler-Kennung bleibt");
        wahr(!("gast" in eintrag), "gast-Feld bleibt");
        wahr(!namen(w.fb).gast || !namen(w.fb).gast[gast.eintrag.tag], "Gast-Platz bleibt");
        w.KONTO.abmelden();
        await nachladen(w);
        const wieder = await w.ANMELDUNG._kontoAnmeldenVersuchen("Lena#" + eintrag.tag, "Lena#Pass1");
        wahr(wieder.ok, "Anmelden nach dem Sichern");
    });

    await pruefe("Rollen: nur UP#Plus vergibt Admin, ein Admin gibt frei, andere nicht", async () => {
        const w = await welt();
        const jonas = await jonasUmziehen(w);
        const jonasUid = w.KONTO.uid();
        w.KONTO.abmelden();
        const mia = await w.KONTO.kontoAnlegen(w.speicher, w.abgleich.daten, "Mia", "Mia#Pass1");
        await nachladen(w);

        /* Mia (ohne Rolle) darf Jonas nicht freigeben. */
        const ohneRecht = await w.KONTO.freigeben(w.speicher, konten(w.fb)[jonasUid]);
        wahr(!ohneRecht.ok, "ohne Rolle freigegeben");

        /* Jonas darf sich nicht selbst zum Admin machen. */
        w.KONTO.abmelden();
        await w.KONTO.anmelden("id-jonas", NEU);
        const selbst = await w.KONTO.rolleSetzen(w.speicher, jonasUid, true);
        wahr(!selbst.ok, "Rolle selbst gesetzt");

        /* UP#Plus gibt Jonas die Rolle Admin. */
        const oberUid = oberAnlegen(w);
        w.KONTO.abmelden();
        await w.KONTO.anmelden("up-plus", "Stark#Pw9");
        await nachladen(w);
        wahr(w.KONTO.istOberAdmin(w.abgleich.daten, oberUid), "UP#Plus nicht erkannt");
        wahr(w.ANMELDUNG.istOberAdmin(), "ANMELDUNG kennt UP#Plus nicht");
        const rolle = await w.KONTO.rolleSetzen(w.speicher, jonasUid, true);
        wahr(rolle.ok, "Rolle vergeben: " + JSON.stringify(rolle));
        await nachladen(w);
        gleich(w.KONTO.rolleVon(w.abgleich.daten, jonasUid), "Admin", "Rolle");

        /* Jonas (Admin) gibt Mia frei, darf aber keine Rollen vergeben und
           UP#Plus nicht ändern. */
        w.KONTO.abmelden();
        await w.KONTO.anmelden("id-jonas", NEU);
        w.ANMELDUNG._uebernehmen(jonas);
        const frei = await w.KONTO.freigeben(w.speicher, konten(w.fb)[mia.eintrag.uid]);
        wahr(frei.ok, "Admin konnte nicht freigeben: " + JSON.stringify(frei));
        const rollenVersuch = await w.KONTO.rolleSetzen(w.speicher, mia.eintrag.uid, true);
        wahr(!rollenVersuch.ok, "Admin vergab eine Rolle");
        const oberWeg = await w.KONTO.eintragEntfernen(w.speicher, konten(w.fb)[oberUid]);
        wahr(!oberWeg.ok, "Admin entfernte UP#Plus");
        wahr(w.umgebung.ICH.verwaltungAktiv(), "Verwaltung für Admin zu");
    });

    await pruefe("Niemand ausser UP#Plus bekommt eine Buchstaben-Nummer", async () => {
        const w = await welt();
        await w.KONTO.kontoAnlegen(w.speicher, w.abgleich.daten, "Mia", "Mia#Pass1");
        let abgelehnt = false;
        try {
            await w.speicher.teilSchreiben({ "namen/mia/Plus": w.KONTO.uid() });
        } catch (fehler) {
            abgelehnt = true;
        }
        wahr(abgelehnt, "Buchstaben-Nummer angenommen");
    });

    await pruefe("Neu verbinden: freigegeben, neues Passwort, gleiche Kennung, Platz zieht mit", async () => {
        const w = await welt();
        await jonasUmziehen(w);
        const altUid = w.KONTO.uid();
        oberAnlegen(w);
        w.KONTO.abmelden();
        await w.KONTO.anmelden("up-plus", "Stark#Pw9");
        await nachladen(w);
        await w.KONTO.freigeben(w.speicher, konten(w.fb)[altUid]);

        w.KONTO.abmelden();
        await nachladen(w);
        const schritt = await w.ANMELDUNG._kontoAnmeldenVersuchen("Jonas#0001", "egal");
        wahr(schritt.weiter, "Neu-Verbinden nicht angeboten");
        const alt = konten(w.fb)[altUid];
        const ergebnis = await w.KONTO.neuVerbinden(w.speicher, w.abgleich.daten,
            Object.assign({}, alt, { uid: altUid }), "Wieder#Da1");
        wahr(ergebnis.ok, "neu verbinden: " + JSON.stringify(ergebnis));
        const neuUid = w.KONTO.uid();
        wahr(neuUid !== altUid, "neue Konto-Nummer");
        wahr(!konten(w.fb)[altUid], "alter Knoten da");
        gleich(konten(w.fb)[neuUid].id, "id-jonas", "Kennung");
        gleich(namen(w.fb).jonas["0001"], neuUid, "Platz zieht mit");
        wahr(!("neuVerbinden" in konten(w.fb)[neuUid]), "Freigabe bleibt");
    });

    await pruefe("Name ändern: Nummer bleibt, wenn frei; alter Platz wird frei", async () => {
        const w = await welt();
        const eintrag = await jonasUmziehen(w);
        const ergebnis = await w.KONTO.nameAendern(w.speicher, w.abgleich.daten,
            w.ANMELDUNG.ich(), "Jonny");
        wahr(ergebnis.ok, "umbenennen: " + JSON.stringify(ergebnis));
        gleich(ergebnis.eintrag.tag, eintrag.tag, "Nummer");
        gleich(namen(w.fb).jonny["0001"], w.KONTO.uid(), "neuer Platz");
        wahr(!namen(w.fb).jonas || !namen(w.fb).jonas["0001"], "alter Platz noch belegt");
    });

    await pruefe("Name nur in Gross-/Kleinschreibung ändern: derselbe Platz, erlaubt", async () => {
        const w = await welt();
        await jonasUmziehen(w);
        const ergebnis = await w.KONTO.nameAendern(w.speicher, w.abgleich.daten,
            w.ANMELDUNG.ich(), "JONAS");
        wahr(ergebnis.ok, "umbenennen: " + JSON.stringify(ergebnis));
        gleich(konten(w.fb)[w.KONTO.uid()].name, "JONAS", "Name");
        gleich(namen(w.fb).jonas["0001"], w.KONTO.uid(), "Platz");
    });

    await pruefe("Passwort ändern: altes bei Firebase, neues nach der Regel", async () => {
        const w = await welt();
        await jonasUmziehen(w);
        const uid = w.KONTO.uid();
        w.dialog.antworten = ["Falsch#Pw1"];
        await w.ANMELDUNG.passwortAendern(w.ANMELDUNG.ich());
        gleich(w.fb.konten[uid].passwort, NEU, "ohne altes geändert");
        w.dialog.antworten = [NEU, "Anders#Pw2", "Anders#Pw2"];
        await w.ANMELDUNG.passwortAendern(w.ANMELDUNG.ich());
        gleich(w.fb.konten[uid].passwort, "Anders#Pw2", "neues Passwort");
    });

    await pruefe("Konto löschen: Eintrag, Platz und Firebase-Konto weg, Gerät abgemeldet", async () => {
        const w = await welt();
        await jonasUmziehen(w);
        const uid = w.KONTO.uid();
        w.dialog.antworten = [NEU];
        await w.ANMELDUNG.austreten();
        wahr(!konten(w.fb)[uid], "Eintrag");
        wahr(!namen(w.fb).jonas || !namen(w.fb).jonas["0001"], "Platz");
        wahr(!w.fb.konten[uid], "Firebase-Konto");
        wahr(!w.KONTO.angemeldet() && !w.umgebung.ICH.person(), "noch angemeldet");
    });

    await pruefe("Gast meldet sich ab: Rückfrage, dann ist das Gast-Konto weg", async () => {
        const w = await welt();
        const gast = await w.KONTO.gastAnlegen(w.speicher, w.abgleich.daten);
        await nachladen(w);
        w.ANMELDUNG._uebernehmen(gast.eintrag);
        const uid = w.KONTO.uid();
        w.dialog.antworten = [false];
        await w.ANMELDUNG.abmelden();
        wahr(w.KONTO.angemeldet(), "ohne Ja abgemeldet");
        w.dialog.antworten = [true];
        await w.ANMELDUNG.abmelden();
        wahr(!konten(w.fb)[uid] && !w.fb.konten[uid], "Gast-Konto blieb");
        wahr(!w.KONTO.angemeldet(), "noch angemeldet");
    });

    await pruefe("Gast-Erinnerung: jedes dritte Öffnen", async () => {
        const w = await welt();
        const gast = await w.KONTO.gastAnlegen(w.speicher, w.abgleich.daten);
        await nachladen(w);
        w.ANMELDUNG._uebernehmen(gast.eintrag);
        w.dialog.antworten = [false, false, false];
        await w.ANMELDUNG.gastErinnern();
        await w.ANMELDUNG.gastErinnern();
        gleich(w.dialog.fragen.length, 0, "zu früh gefragt");
        await w.ANMELDUNG.gastErinnern();
        gleich(w.dialog.fragen.length, 1, "beim dritten Mal");
    });

    await pruefe("Es wird nur der EIGENE Eintrag geschrieben", async () => {
        const w = await welt();
        await w.KONTO.kontoAnlegen(w.speicher, w.abgleich.daten, "Mia", "Mia#Pass1");
        const miaUid = w.KONTO.uid();
        w.KONTO.abmelden();
        await jonasUmziehen(w);
        const vorher = w.fb.aufrufe.length;
        const miaId = konten(w.fb)[miaUid].id;
        await w.speicher.speichern(w.SPIELER.freundHinzufuegen(w.abgleich.daten, miaId, "x"));
        gleich(w.fb.aufrufe.length, vorher, "fremde Änderung ging hinaus");
        await w.speicher.speichern(w.SPIELER.freundHinzufuegen(w.abgleich.daten, "id-jonas", miaId));
        gleich(konten(w.fb)[w.KONTO.uid()].freunde.indexOf(miaId) !== -1, true, "eigene Freundschaft");
    });

    await pruefe("Gerät von vor dem Umzug: Hinweis-Bild mit dem gemerkten Namen", async () => {
        const w = await welt();
        w.umgebung.ICH.personSetzen("id-jonas", "Jonas");
        w.ANMELDUNG.anmelden();
        gleich(w.umgebung.vollbild, "Jonas", "Vollbild");
        gleich(w.ANMELDUNG.ichId, null, "ohne Passwort angemeldet");
    });

    await pruefe("Mit gültiger Sitzung geht es ohne Bild hinein", async () => {
        const w = await welt();
        await jonasUmziehen(w);
        w.ANMELDUNG._ichIdSetzen(null);
        w.umgebung.vollbild = undefined;
        w.ANMELDUNG.anmelden();
        gleich(w.ANMELDUNG.ichId, "id-jonas", "angemeldet");
        gleich(w.umgebung.vollbild, undefined, "Vollbild");
    });

    await pruefe("Schlüssel: gültig aus dem Speicher, sonst EINE Erneuerung für alle", async () => {
        const w = await welt();
        await jonasUmziehen(w);
        const erster = await w.KONTO.token();
        gleich(w.fb.erneuerungAufrufe, 0, "Erneuerungen");
        w.KONTO.sitzung.ablauf = Date.now();
        const [a, b] = await Promise.all([w.KONTO.token(), w.KONTO.token()]);
        gleich(w.fb.erneuerungAufrufe, 1, "Erneuerungen");
        wahr(a && a === b && a !== erster, "neuer Schlüssel");
    });

    await pruefe("Kennt Firebase die Sitzung nicht mehr, meldet sich das Gerät ab", async () => {
        const w = await welt();
        await jonasUmziehen(w);
        w.fb.erneuerungKaputt = true;
        w.KONTO.sitzung.ablauf = Date.now();
        gleich(await w.KONTO.token(), null, "Schlüssel");
        wahr(!w.KONTO.angemeldet(), "Sitzung");
        gleich(w.ANMELDUNG.ichId, null, "angemeldet");
    });

    await pruefe("Kein Netz beim Erneuern lässt die Sitzung stehen", async () => {
        const w = await welt();
        await jonasUmziehen(w);
        const echt = w.fb.fetch;
        w.fb.fetch = async () => { throw new Error("Funkloch"); };
        w.KONTO.sitzung.ablauf = Date.now();
        gleich(await w.KONTO.token(), null, "Schlüssel");
        wahr(w.KONTO.angemeldet(), "Sitzung verloren");
        w.fb.fetch = echt;
    });

    await pruefe("Eine überholte Liste ohne den eigenen Eintrag meldet niemanden ab", async () => {
        const w = await welt();
        await jonasUmziehen(w);
        w.ANMELDUNG.datenAktualisiert(w.SPIELER.leereDaten());
        await new Promise((fertig) => setTimeout(fertig, 10));
        gleich(w.ANMELDUNG.ichId, "id-jonas", "abgemeldet");
    });

    await pruefe("In der UPCrew-Datenbank steht nach allen Abläufen keine Prüfsumme", async () => {
        const w = await welt();
        await jonasUmziehen(w);
        w.KONTO.abmelden();
        await w.ANMELDUNG._kontoAnmeldenVersuchen("fr3ddy", "geheim7");
        const alt = w.SPIELER.spielerNachName(w.ANMELDUNG._altDaten, "fr3ddy");
        const ergebnis = await w.KONTO.umziehen(w.speicher, w.abgleich.daten, alt, "fr3ddy", "Fred#Pw12");
        wahr(ergebnis.ok, "fr3ddy");
        gleich(ergebnis.eintrag.tag, "0001", "fr3ddy#0001");
        const text = JSON.stringify(w.fb.db.upcrew);
        wahr(text.indexOf("pinPruefwert") === -1 && text.indexOf("pinSalz") === -1, "Prüfsumme gefunden");
    });

    await pruefe("Die alte Datenbank wird ohne Anmelde-Schlüssel gelesen", async () => {
        const w = await welt();
        await jonasUmziehen(w);
        const altAufrufe = w.fb.aufrufe.filter((a) => a.adresse.indexOf(ALT) === 0);
        wahr(altAufrufe.length >= 1, "alte Datenbank nicht gefragt");
        wahr(altAufrufe.every((a) => a.adresse.indexOf("auth=") === -1), "Schlüssel an die alte Datenbank");
    });

    await pruefe("Ohne altBasis fällt der Umzugsweg still weg", async () => {
        const w = await welt();
        w.umgebung.KONFIG.konto.altBasis = "";
        const ergebnis = await w.ANMELDUNG._kontoAnmeldenVersuchen("Jonas", "1234");
        gleich(ergebnis.fehler, "unbekannt", "Fehlerart");
    });

    await pruefe("Konten-Knoten werden zur Liste, sortiert, mit uid, Namen und Rollen oben", async () => {
        const { umgebung } = await welt();
        const liste = umgebung.SpeicherKonten.alsListe({
            geaendertAm: 5, rollen: { b: "admin" }, namen: { a: { "0001": "a" } },
            konten: { b: { id: "2", name: "B" }, a: { id: "1", name: "A" }, c: "Müll" }
        });
        gleich(liste.spieler.map((s) => s.uid).join(","), "a,b", "Reihenfolge");
        gleich(liste.rollen.b, "admin", "Rollen");
        gleich(liste.namen.a["0001"], "a", "Namen");
    });

    await pruefe("SPIELER.inhaltGleich sieht Nummer, Freigabe und Rollen", async () => {
        const { SPIELER } = await welt();
        const a = SPIELER.eintragEinsetzen(SPIELER.leereDaten(1), { id: "x", name: "X", uid: "u1", tag: "0001" }, 1);
        const b = SPIELER.eintragEinsetzen(a, { id: "x", name: "X", uid: "u1", tag: "0002" }, 1);
        const c = Object.assign(SPIELER.kopieren(a), { rollen: { u1: "admin" } });
        wahr(!SPIELER.inhaltGleich(a, b), "Nummer übersehen");
        wahr(!SPIELER.inhaltGleich(a, c), "Rolle übersehen");
    });

    console.log(anzahlOk + " ok, " + anzahlFehler + " Fehler");
    process.exit(anzahlFehler === 0 ? 0 : 1);
})();
