/*
 * test-spielzeit.js — Spielzeit und „dabei seit" (seit v0.155.0) samt den
 * Intro-Streifen am PC.
 *
 * Nutzer 28.09.2026: „log die zeit wie lange die app offen ist auf jedem
 * account" · „okay privat … auch bei gästen … sowohl als auch der start
 * datum" · „bis zur ersten stunde 0 bis 59 min danach 1h+ 2h". Geprüft:
 * die reine Rechnung in js\fortschritt.js (Zählen mit Grenze, „seit",
 * Zusammenführen, Anzeige, Summe, Haken mit Standard aus), das Zählen nur
 * bei sichtbarer Seite und der Gast→Konto-Umzug in js\fortschritt-konto.js,
 * die Einbindung (Profil, Einstellungen, Verwaltung, app.js) und — wenn der
 * Typoluck-Ordner daneben liegt und Typoluck die Spielzeit schon hat — dass
 * der Auszug- und Spielzeit-Teil von fortschritt.js in beiden Spielen
 * Zeile für Zeile gleich ist.
 *
 * Intro-Streifen (Nutzer: „dünne Streifen beim Intro am PC beheben"):
 * `INTRO._raenderDecken` setzt `html.intro-offen` (+ Farbe) und nimmt es
 * nach dem Ausblenden wieder weg; die Regeln stehen in css\stil.css.
 *
 * Aufruf: siehe tests\README.md
 */

const fs = require("fs");
const pfad = require("path");
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
    if (JSON.stringify(ist) !== JSON.stringify(soll)) {
        throw new Error(was + ": ist " + JSON.stringify(ist) + ", soll " + JSON.stringify(soll));
    }
}

function wahr(bedingung, was) {
    if (!bedingung) {
        throw new Error(was);
    }
}

const projekt = pfad.join(__dirname, "..");
const lesen = (name) => fs.readFileSync(pfad.join(projekt, name), "utf8");

/* Eine Umgebung mit Gerätespeicher, FORTSCHRITT und FORTSCHRITT_KONTO. */
function welt(ich) {
    const gespeichert = {};
    const speicher = {
        getItem: (s) => (s in gespeichert ? gespeichert[s] : null),
        setItem: (s, w) => { gespeichert[s] = String(w); },
        removeItem: (s) => { delete gespeichert[s]; }
    };
    const geschrieben = [];
    const umgebung = {
        console, setTimeout, clearTimeout, setInterval() { return 1; },
        localStorage: speicher,
        window: { localStorage: speicher },
        ANMELDUNG: {
            abgleich: { daten: { spieler: [] }, aendern(neu) { geschrieben.push(neu); } },
            ich: () => ich.eintrag
        },
        SPIELER: { fortschrittSetzen: (daten, id, f) => ({ id: id, fortschritt: f }) }
    };
    umgebung.globalThis = umgebung;
    vm.createContext(umgebung);
    vm.runInContext(lesen("js/fortschritt.js") + "\n;" + lesen("js/upcrew-abzeichen.js") + "\n;"
        + lesen("js/fortschritt-konto.js")
        + "\nObject.assign(globalThis, { FORTSCHRITT, FORTSCHRITT_KONTO });", umgebung);
    return { F: umgebung.FORTSCHRITT, K: umgebung.FORTSCHRITT_KONTO, gespeichert, geschrieben, speicher };
}

(async () => {

    await pruefe("Rechnung: zählen mit Grenze je Schritt, seit, Summe, Anzeige", () => {
        const { F } = welt({ eintrag: null });
        const t = Date.parse("2026-09-28T10:00:00Z");
        let s = F.spielzeitZaehlen(null, 90, t);
        gleich(F.spielzeitVon(s), 90, "90 s");
        s = F.spielzeitZaehlen(s, 100000, t + 1000);
        gleich(F.spielzeitVon(s), 90 + F.SPIELZEIT_SCHRITT_MAX, "Ausreisser gekappt");
        gleich(F.spielzeitZaehlen(s, -5, t), s, "Unsinn zählt nicht");
        gleich(F.seitVon(s), "2026-09-28", "dabei seit");
        s = F.spielzeitZaehlen(s, 60, t, "typoluck");
        gleich(F.spielzeitSumme(s), 90 + F.SPIELZEIT_SCHRITT_MAX + 60, "Summe über die Zweige");
        gleich([0, 59, 60, 3599, 3600, 7199, 7200].map(F.spielzeitText),
            ["0 min", "0 min", "1 min", "59 min", "1h+", "1h+", "2h+"], "Anzeige");
        gleich(s.spiele.blunderluck.zaehler.seit, 20260928, "seit als Zahl (Regel §11b)");
    });

    await pruefe("Zusammenführen: Spielzeit der grössere Zähler, seit das frühere Datum", () => {
        const { F } = welt({ eintrag: null });
        const a = F.spielzeitZaehlen(null, 100, Date.parse("2026-09-20T10:00:00Z"));
        let b = F.spielzeitZaehlen(null, 50, Date.parse("2026-09-25T10:00:00Z"));
        b = F.spielzeitZaehlen(b, 100, Date.parse("2026-09-25T11:00:00Z"));
        const beide = F.zusammenfuehren(a, b);
        gleich(F.spielzeitVon(beide), 150, "grösserer Zähler");
        gleich(F.seitVon(beide), "2026-09-20", "früheres seit");
        gleich(F.seitVon(F.zusammenfuehren(b, a)), "2026-09-20", "auch andersherum");
    });

    await pruefe("Haken am Konto (v0.155.2): Standard privat (EINE Konstante), Auszug nur mit Haken", () => {
        const { F } = welt({ eintrag: null });
        gleich(F.SPIELZEIT_OEFFENTLICH_STANDARD, false, "Standard privat");
        gleich(F.spielzeitOeffentlichVon({}), false, "ohne Feld: Standard");
        gleich(F.spielzeitOeffentlichVon(null), false, "ohne Eintrag: Standard");
        gleich(F.spielzeitOeffentlichVon({ spielzeitOeffentlich: true }), true, "an");
        gleich(F.spielzeitOeffentlichVon({ spielzeitOeffentlich: "ja" }), false, "nur Ja/Nein zählt");
        wahr(lesen("js/fortschritt.js").indexOf("localStorage") === -1
            || lesen("js/fortschritt.js").indexOf("spielzeit-oeffentlich") === -1, "nicht mehr auf dem Gerät");
        const s = F.spielzeitZaehlen(null, 100, Date.now());
        wahr(!("spielzeit" in F.auszug(s).werte), "ohne Option nicht im Auszug");
        gleich(F.auszug(s, undefined, { spielzeit: true }).werte.spielzeit, 100, "mit Option im Auszug");
        gleich(F.auszugPruefen({ werte: { spielzeit: 7200 } }).werte.spielzeit, 7200, "vom Server gelesen");
    });

    await pruefe("Zählen nur bei sichtbarer Seite; ans Konto erst beim Verbergen", () => {
        const ich = { eintrag: { id: "p-anna", uid: "u-anna", fortschritt: null } };
        const { F, K, geschrieben } = welt(ich);
        const t = 1000000;
        K._sichtbarSeit = t;
        K._spielzeitKontoZuletzt = t;
        gleich(K.spielzeitSchritt(true, t + 30000), 30, "30 s sichtbar");
        gleich(geschrieben.length, 0, "noch nicht ans Konto");
        gleich(K.spielzeitSchritt(false, t + 40000), 10, "bis zum Verbergen");
        gleich(geschrieben.length, 1, "beim Verbergen ans Konto");
        gleich(F.spielzeitVon(geschrieben[0].fortschritt), 40, "40 s am Konto");
        gleich(K.spielzeitSchritt(false, t + 900000), 0, "verborgen zählt nicht");
        gleich(K.spielzeitSchritt(true, t + 910000), 0, "wieder sichtbar: ab jetzt");
        gleich(K.spielzeitSchritt(true, t + 5000000), F.SPIELZEIT_SCHRITT_MAX, "eingeschlafene Seite gekappt");
    });

    await pruefe("Gast: Spielzeit und seit auf dem Gerät, beim Sichern ans Konto", () => {
        const ich = { eintrag: { id: "p-gast", uid: "u-gast", gast: true } };
        const { F, K, geschrieben, gespeichert } = welt(ich);
        K._sichtbarSeit = 0;
        K.spielzeitSchritt(false, 60000);
        gleich(geschrieben.length, 0, "Gast schreibt nichts ans Konto");
        const gastStand = JSON.parse(gespeichert["upcrew.fortschritt"]).gast;
        gleich(F.spielzeitVon(gastStand), 60, "Gast zählt auf dem Gerät");
        wahr(F.seitVon(gastStand) !== "", "Gast hat ein seit");
        ich.eintrag = { id: "p-gast", uid: "u-neu", fortschritt: null };
        wahr(K.gastUebernehmen(), "umgezogen");
        const alle = JSON.parse(gespeichert["upcrew.fortschritt"]);
        wahr(!alle.gast, "Gast-Eintrag weg");
        gleich(F.spielzeitVon(alle["p-gast"]), 60, "unter der Person");
        gleich(F.spielzeitVon(geschrieben[geschrieben.length - 1].fortschritt), 60, "ans Konto");
        gleich(K.spielzeit().seit, F.seitVon(gastStand), "dabei seit zieht mit");
        wahr(/FORTSCHRITT_KONTO\.gastUebernehmen\(\)/.test(lesen("js/anmeldung-konto.js")), "nach Spielstand sichern");
    });

    await pruefe("Einbindung: Start, Profil, Einstellungen, Verwaltung", () => {
        wahr(/FORTSCHRITT_KONTO\.spielzeitStarten\(\)/.test(lesen("js/app.js")), "app.js startet das Zählen");
        const r = lesen("js/rangliste.js");
        wahr(/_spielzeitKarteBauen/.test(r) && /FORTSCHRITT\.spielzeitText/.test(r), "Profil");
        wahr(/SPIELER\.spielzeitOeffentlichSetzen/.test(lesen("js/einstellungen.js")), "Einstellung schreibt ans Konto");
        const v = lesen("js/verwaltungs-bildschirm.js");
        wahr(/"Spielzeit"/.test(v) && /spielzeitSumme\(spieler\.fortschritt\)/.test(v), "Verwaltung je Spieler");
        wahr(/dabei seit|Dabei seit/.test(r), "dabei seit im Profil");
    });

    await pruefe("Typoluck kann Zeile für Zeile übernehmen (Auszug + Spielzeit gleich, wenn schon nachgezogen)", () => {
        const eigenes = lesen("js/fortschritt.js");
        const start = eigenes.indexOf("     * DER ÖFFENTLICHE AUSZUG");
        wahr(start !== -1 && eigenes.indexOf("SPIELZEIT UND „DABEI SEIT\"") > start, "Spielzeit steht im Auszug-Teil");
        const typoPfad = pfad.join(projekt, "..", "Typoluck", "js", "fortschritt.js");
        if (!fs.existsSync(typoPfad)) {
            return;
        }
        const typo = fs.readFileSync(typoPfad, "utf8");
        if (typo.indexOf("spielzeitZaehlen") === -1) {
            /* Typoluck hat noch nicht nachgezogen (UEBERGABE.md). */
            return;
        }
        const teil = (text) => text.slice(text.indexOf("     * DER ÖFFENTLICHE AUSZUG"));
        gleich(teil(typo) === teil(eigenes), true, "Auszug- und Spielzeit-Teil gleich");
    });

    await pruefe("Intro-Streifen: html.intro-offen solange das Intro steht, mit seiner Farbe", async () => {
        const klassen = new Set();
        const stil = {};
        const wurzel = {
            classList: {
                add: (...k) => k.forEach((x) => klassen.add(x)),
                remove: (...k) => k.forEach((x) => klassen.delete(x))
            },
            style: { setProperty: (n, w) => { stil[n] = w; } }
        };
        const behaelter = { hidden: false, style: { background: "rgb(1, 2, 3)" },
            classList: { contains: () => false } };
        const umgebung = { document: { documentElement: wurzel }, console, Promise };
        umgebung.globalThis = umgebung;
        vm.createContext(umgebung);
        vm.runInContext(lesen("js/intro.js") + "\n;globalThis.INTRO = INTRO;", umgebung);
        let fertig;
        const versprechen = new Promise((ok) => { fertig = ok; });
        umgebung.INTRO._raenderDecken(behaelter, versprechen);
        wahr(klassen.has("intro-offen"), "Klasse gesetzt");
        gleich(stil["--intro-rand"], "rgb(1, 2, 3)", "Farbe des Intros");
        fertig(null);
        await versprechen;
        await new Promise((ok) => setTimeout(ok, 0));
        wahr(!klassen.has("intro-offen"), "danach weg");
        const css = lesen("css/stil.css");
        wahr(/html\.intro-offen \{[^}]*overflow: hidden;[^}]*background-color: var\(--intro-rand/.test(css), "CSS: Rand in Intro-Farbe, kein Rollbalken");
        wahr(/html\.intro-offen\.intro-weg \{[^}]*transition/.test(css), "CSS: Übergang nur beim Ausblenden");
        wahr(/scrollbar-gutter: stable both-edges/.test(css), "der Rand bleibt reserviert (Brett mittig)");
        wahr(/INTRO\._raenderDecken\(behaelter, fertig\)/.test(lesen("js/intro.js")), "zeigen ruft es");
        wahr(lesen("css/upcrew-intro.css").indexOf("intro-offen") === -1, "Baustein unverändert");
    });

    console.log(anzahlOk + " ok, " + anzahlFehler + " Fehler");
    process.exit(anzahlFehler === 0 ? 0 : 1);
})();
