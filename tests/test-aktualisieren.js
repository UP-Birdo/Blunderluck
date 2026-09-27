/*
 * test-aktualisieren.js — kommt eine neue Version an? (seit v0.151.2,
 * js\aktualisieren.js). Anlass: Die offene Seite blieb nach einer
 * Auslieferung auf der alten Version stehen (Nutzer 27.09.2026).
 *
 * Geprüft werden die reinen Entscheidungen und die Verdrahtung mit
 * nachgebautem Browser (Service Worker, Dokument, sessionStorage):
 * nachfragen beim Zurückkehren (gedrosselt), einmal neu laden bei neuem
 * Worker, nicht in einer Partie/Eingabe/Dialog (dann Leiste), keine
 * Schleife, nichts bei der allerersten Anmeldung.
 *
 * NICHT prüfbar ohne echten Browser: ob `registration.update()` wirklich
 * einen neuen Worker holt und `controllerchange` feuert — das hängt am
 * Browser (und auf 8093 gilt BEIM_BAUEN, Netz zuerst).
 *
 * Aufruf: siehe tests\README.md
 */

const pfad = require("path");
const fs = require("fs");
const vm = require("vm");

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

const quelle = fs.readFileSync(pfad.join(__dirname, "..", "js", "aktualisieren.js"), "utf8");

/* Ein nachgebauter Browser; `lage` steuert Partie/Eingabe/Dialog. */
function browser(hatController) {
    const b = {
        neuGeladen: 0,
        updates: 0,
        horcher: {},
        dokHorcher: {},
        takte: [],
        sitzung: {},
        koerper: [],
        sichtbar: "visible",
        dialog: false,
        eingabe: false,
        partieLaeuft: false,
        jetzt: 1000000
    };
    const kontext = {
        console: console,
        Math: Math,
        JSON: JSON,
        String: String,
        Number: Number,
        Date: { now: () => b.jetzt },
        navigator: {
            serviceWorker: {
                controller: hatController ? {} : null,
                addEventListener: (name, f) => { b.horcher[name] = f; }
            }
        },
        document: {
            get visibilityState() { return b.sichtbar; },
            get activeElement() { return b.eingabe ? { tagName: "INPUT" } : { tagName: "BODY" }; },
            querySelector: (sel) => {
                if (sel.indexOf("dialog") !== -1) {
                    return b.dialog ? {} : null;
                }
                if (sel === ".neu-leiste") {
                    return b.koerper.find((el) => el.className === "neu-leiste") || null;
                }
                return null;
            },
            addEventListener: (name, f) => { b.dokHorcher[name] = f; },
            createElement: () => ({ setAttribute() {}, addEventListener() {} }),
            body: { appendChild: (el) => b.koerper.push(el) }
        },
        sessionStorage: {
            getItem: (k) => (k in b.sitzung ? b.sitzung[k] : null),
            setItem: (k, v) => { b.sitzung[k] = String(v); }
        },
        window: {
            location: { reload: () => { b.neuGeladen++; } },
            setInterval: (f) => { b.takte.push(f); return b.takte.length; }
        }
    };
    kontext.TEAM_SCHACH = { get offeneId() { return b.partieLaeuft ? "p1" : null; }, abgleich: { daten: {} } };
    kontext.SCHACH_TAFEL = { partie: () => ({ ergebnis: "" }) };
    vm.createContext(kontext);
    vm.runInContext(quelle + "\n;this.AKTUALISIEREN = AKTUALISIEREN;", kontext, { filename: "aktualisieren.js" });
    b.A = kontext.AKTUALISIEREN;
    b.registrierung = { update: () => { b.updates++; return Promise.resolve(); } };
    return b;
}

pruefe("Entscheidungen: fragen gedrosselt, keine zweite Selbst-Ladung kurz danach, sichere Stelle", () => {
    const b = browser(true);
    const A = b.A;
    gleich(A.sollFragen(1000, 0), true, "nie gefragt");
    gleich(A.sollFragen(1000 + A.PRUEF_ABSTAND_MS - 1, 1000), false, "zu früh");
    gleich(A.sollFragen(1000 + A.PRUEF_ABSTAND_MS, 1000), true, "Zeit um");
    gleich(A.darfSelbstLaden(5000, null), true, "kein Merker");
    gleich(A.darfSelbstLaden(5000, "4000"), false, "eben erst geladen");
    gleich(A.darfSelbstLaden(4000 + A.SPERRE_MS, "4000"), true, "Sperre vorbei");
    gleich(A.sicher({ verborgen: false, eingabe: false, dialog: false, partie: false }), true, "Ruhe");
    gleich(A.sicher({ verborgen: false, eingabe: false, dialog: false, partie: true }), false, "Partie");
    gleich(A.sicher({ verborgen: false, eingabe: true, dialog: false, partie: false }), false, "Eingabe");
    gleich(A.sicher({ verborgen: false, eingabe: false, dialog: true, partie: false }), false, "Dialog");
    gleich(A.sicher({ verborgen: true, eingabe: true, dialog: true, partie: true }), true, "im Hintergrund");
});

pruefe("Zurück in den Vordergrund: nachfragen, aber höchstens alle paar Minuten", () => {
    const b = browser(true);
    b.A.beobachten();
    b.A.starten(b.registrierung);
    b.jetzt += 1000;
    b.dokHorcher.visibilitychange();
    gleich(b.updates, 0, "gleich nach dem Start nicht");
    b.jetzt += b.A.PRUEF_ABSTAND_MS;
    b.dokHorcher.visibilitychange();
    gleich(b.updates, 1, "nach der Pause gefragt");
    b.dokHorcher.visibilitychange();
    gleich(b.updates, 1, "nicht gleich nochmal");
});

pruefe("Neuer Worker an ruhiger Stelle: einmal neu laden, mit Merker", () => {
    const b = browser(true);
    b.A.beobachten();
    b.horcher.controllerchange();
    gleich(b.neuGeladen, 1, "geladen");
    gleich(b.sitzung[b.A.MERKER], String(b.jetzt), "Merker gesetzt");
});

pruefe("Allererste Anmeldung (vorher kein Worker): nicht neu laden", () => {
    const b = browser(false);
    b.A.beobachten();
    b.horcher.controllerchange();
    gleich(b.neuGeladen, 0, "nicht geladen");
    gleich(b.koerper.length, 0, "keine Leiste");
});

pruefe("In einer laufenden Partie: Leiste statt Laden, lädt von selbst, sobald die Partie vorbei ist", () => {
    const b = browser(true);
    b.partieLaeuft = true;
    b.A.beobachten();
    b.horcher.controllerchange();
    gleich(b.neuGeladen, 0, "nicht mitten in der Partie");
    gleich(b.koerper.length, 1, "Leiste da");
    gleich(b.koerper[0].className, "neu-leiste", "Leiste");
    b.takte[0]();
    gleich(b.neuGeladen, 0, "Partie läuft noch");
    b.partieLaeuft = false;
    b.takte[0]();
    gleich(b.neuGeladen, 1, "jetzt geladen");
});

pruefe("Keine Schleife: kurz nach einem Selbst-Neuladen nur die Leiste", () => {
    const b = browser(true);
    b.sitzung["blunderluck.neu-geladen"] = String(b.jetzt - 1000);
    b.A.beobachten();
    b.horcher.controllerchange();
    gleich(b.neuGeladen, 0, "nicht erneut von selbst");
    gleich(b.koerper.length, 1, "Leiste zum Antippen");
});

pruefe("app.js meldet den Worker mit AKTUALISIEREN an; index.html lädt es davor", () => {
    const app = fs.readFileSync(pfad.join(__dirname, "..", "js", "app.js"), "utf8");
    const seite = fs.readFileSync(pfad.join(__dirname, "..", "index.html"), "utf8");
    gleich(/aktualisieren\.beobachten\(\)/.test(app), true, "beobachten");
    gleich(/aktualisieren\.starten\(registrierung\)/.test(app), true, "starten mit der Registrierung");
    gleich(seite.indexOf("js/aktualisieren.js") < seite.indexOf("js/app.js"), true, "Reihenfolge");
});

console.log(anzahlOk + " ok, " + anzahlFehler + " Fehler");
process.exit(anzahlFehler === 0 ? 0 : 1);
