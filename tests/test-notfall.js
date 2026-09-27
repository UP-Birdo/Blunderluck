/*
 * test-notfall.js — der Notfall-Weg in index.html und der gehärtete Service
 * Worker (seit v0.151.5; Anlass: weisse Seite in Typoluck am iPhone,
 * 27.09.2026 — derselbe Aufbau steckt in Blunderluck).
 *
 * Das ECHTE Skript aus index.html (`<script id="notfall">`) läuft hier in
 * einer Attrappe von Fenster, Worker und Zwischenspeichern:
 *   - App gestartet und Stil da → nichts passiert;
 *   - App nicht gestartet (oder Stil fehlt) → NUR der Worker dieses Ordners
 *     wird abgemeldet, NUR blunderluck-Speicher geleert, einmal neu geladen;
 *   - innerhalb von 5 Minuten ein zweites Mal → kein Neuladen, nur ein Link.
 * Dazu: Die CSP erlaubt genau diesen Block über seinen Fingerabdruck, und
 * Quelltext-Prüfungen am Worker.
 *
 * Aufruf: siehe tests\README.md
 */

const fs = require("fs");
const pfad = require("path");
const vm = require("vm");
const krypto = require("crypto");

let anzahlOk = 0;
let anzahlFehler = 0;

async function pruefe(bezeichnung, funktion) {
    try {
        await funktion();
        anzahlOk++;
    } catch (fehler) {
        anzahlFehler++;
        console.error("FEHLER: " + bezeichnung);
        console.error("        " + fehler.message);
    }
}

function gleich(ist, soll, was) {
    const a = JSON.stringify(ist);
    const b = JSON.stringify(soll);
    if (a !== b) {
        throw new Error((was || "Wert") + ": erwartet <" + b + ">, war <" + a + ">");
    }
}

function wahr(bedingung, was) {
    if (!bedingung) {
        throw new Error((was || "Bedingung") + " war nicht erfüllt");
    }
}

const lesen = (datei) => fs.readFileSync(pfad.join(__dirname, "..", datei), "utf8").replace(/\r\n/g, "\n");
const index = lesen("index.html");
const treffer = /<script id="notfall">([\s\S]*?)<\/script>/.exec(index);

const ORDNER = "https://up-birdo.github.io/Blunderluck/";

function sitzungAttrappe() {
    const daten = {};
    return {
        getItem: (k) => (k in daten ? daten[k] : null),
        setItem: (k, v) => { daten[k] = String(v); }
    };
}

/* Eine Welt für einen Lauf. */
function welt(angaben) {
    const zeit = { jetzt: angaben.jetzt || 1000000 };
    const uhren = [];
    const abgemeldet = [];
    const geloescht = [];
    let neuGeladen = 0;
    const koerper = { kinder: [], appendChild(el) { this.kinder.push(el); } };
    const sitzung = angaben.sitzung || sitzungAttrappe();
    const fenster = {
        location: { href: ORDNER + "index.html", reload: () => { neuGeladen++; } },
        sessionStorage: sitzung,
        caches: {
            keys: async () => ["blunderluck-v0.151.4", "blunderluck-v0.151.5", "typoluck-v0.15.4"],
            delete: async (name) => { geloescht.push(name); return true; }
        },
        BLUNDERLUCK_GESTARTET: angaben.gestartet
    };
    const kontext = {
        window: fenster,
        navigator: { serviceWorker: { getRegistrations: async () => [
            { scope: ORDNER, unregister: async () => { abgemeldet.push(ORDNER); return true; } },
            { scope: "https://up-birdo.github.io/Typoluck/", unregister: async () => {
                abgemeldet.push("typoluck"); return true; } }
        ] } },
        document: {
            documentElement: {},
            body: koerper,
            getElementById: (id) => koerper.kinder.find((el) => el.id === id) || null,
            createElement: () => ({ style: {} })
        },
        getComputedStyle: () => ({ getPropertyValue: () => (angaben.stil === false ? "" : " 64px") }),
        setTimeout: (f, ms) => { uhren.push({ f, ms }); },
        URL: URL,
        Promise: Promise,
        Date: { now: () => zeit.jetzt },
        Number: Number,
        String: String
    };
    vm.runInNewContext(treffer[1], kontext, { filename: "index.html#notfall" });
    return {
        uhren, abgemeldet, geloescht, koerper, sitzung,
        get neuGeladen() { return neuGeladen; },
        async ablaufen() {
            uhren.forEach((uhr) => uhr.f());
            await new Promise((fertig) => setImmediate(fertig));
            await new Promise((fertig) => setImmediate(fertig));
        }
    };
}

(async () => {
    await pruefe("Notfall-Skript steht in index.html, vor jedem Stil und jedem anderen Skript, ohne src", () => {
        wahr(!!treffer, "kein <script id=\"notfall\">");
        const stelle = index.indexOf("<script id=\"notfall\">");
        wahr(stelle < index.indexOf("<link rel=\"stylesheet\""), "vor dem ersten Stil");
        wahr(stelle < index.indexOf("<script src="), "vor dem ersten Skript");
        wahr(stelle > index.indexOf("Content-Security-Policy"), "NACH der CSP (sonst gälte sie nicht für ihn)");
    });

    await pruefe("Die CSP erlaubt genau diesen Block über seinen Fingerabdruck", () => {
        const csp = /<meta http-equiv="Content-Security-Policy" content="([^"]+)">/.exec(index)[1];
        const abdruck = "'sha256-" + krypto.createHash("sha256").update(treffer[1], "utf8").digest("base64") + "'";
        wahr(csp.indexOf(abdruck) !== -1, "in script-src gehört " + abdruck);
    });

    await pruefe("App gestartet, Stil da: nach 10 s passiert nichts", async () => {
        const gut = welt({ gestartet: true });
        gleich(gut.uhren.map((u) => u.ms), [10000], "wartet 10 Sekunden");
        await gut.ablaufen();
        gleich([gut.neuGeladen, gut.abgemeldet.length, gut.geloescht.length], [0, 0, 0], "nichts");
    });

    let merkerSitzung = null;
    await pruefe("Nicht gestartet: nur eigener Worker ab, nur blunderluck-Speicher leer, einmal neu laden", async () => {
        const kaputt = welt({ gestartet: undefined });
        await kaputt.ablaufen();
        gleich(kaputt.neuGeladen, 1, "einmal neu geladen");
        gleich(kaputt.abgemeldet, [ORDNER], "Typoluck bleibt angemeldet");
        gleich(kaputt.geloescht, ["blunderluck-v0.151.4", "blunderluck-v0.151.5"], "Typoluck-Speicher bleibt");
        wahr(!!kaputt.sitzung.getItem("blunderluck.notfall"), "Merker gesetzt");
        merkerSitzung = kaputt.sitzung;
    });

    await pruefe("Zweites Mal innerhalb von 5 Minuten: kein Neuladen, nur ein Link; danach wieder", async () => {
        const nochmal = welt({ gestartet: undefined, sitzung: merkerSitzung, jetzt: 1000000 + 60000 });
        await nochmal.ablaufen();
        gleich(nochmal.neuGeladen, 0, "keine Schleife");
        gleich(nochmal.koerper.kinder.map((k) => k.textContent), ["Neu laden"], "Link");
        const spaeter = welt({ gestartet: undefined, sitzung: merkerSitzung, jetzt: 1000000 + 6 * 60000 });
        await spaeter.ablaufen();
        gleich(spaeter.neuGeladen, 1, "nach 5 Minuten darf es wieder retten");
    });

    await pruefe("Gestartet, aber Stil fehlt: auch retten", async () => {
        const ohneStil = welt({ gestartet: true, stil: false });
        await ohneStil.ablaufen();
        gleich(ohneStil.neuGeladen, 1, "gerettet");
    });

    await pruefe("app.js meldet den Start als Erstes; der geprüfte Stil steht in css/stil.css", () => {
        wahr(/starten\(\) \{[\s\S]{0,400}?window\.BLUNDERLUCK_GESTARTET = true;/.test(lesen("js/app.js")), "Merker in starten()");
        wahr(/--leiste-hoehe:/.test(lesen("css/stil.css")), "--leiste-hoehe in stil.css");
    });

    await pruefe("Worker: eigener Speicher zuerst, Ersatz nur aus blunderluck-Speichern, keine Umleitung", () => {
        const sw = lesen("sw.js");
        const vorErsatz = sw.split("async function irgendeinTreffer")[0];
        wahr(/caches\.open\(SPEICHER_NAME\)\)\.match\(anfrage/.test(sw), "eigener Speicher zuerst");
        wahr(!/caches\.match\(/.test(vorErsatz.split("async function speicherZuerst")[1] || ""), "kein caches.match über alle Speicher");
        wahr(!/caches\.match\(/.test(sw), "nirgends caches.match über alle Speicher (auch nicht beim Bauen)");
        wahr(/name\.startsWith\("blunderluck-"\)\)/.test(sw) || /!name\.startsWith\("blunderluck-"\)/.test(sw), "Ersatz nur blunderluck-");
        wahr(/antwort\.redirected/.test(sw) && /new Response\(/.test(sw), "umgeleitete Startseite nachgebaut");
        wahr(/name\.startsWith\("blunderluck-"\) && name !== SPEICHER_NAME/.test(sw), "activate löscht nur eigene alte");
        wahr(/cache: "reload"/.test(sw), "install an der HTTP-Ablage vorbei");
    });

    console.log(anzahlOk + " ok, " + anzahlFehler + " Fehler");
    process.exit(anzahlFehler === 0 ? 0 : 1);
})();
