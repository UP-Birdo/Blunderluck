/*
 * test-intro.js — wann das UPCrew-Intro kommt (seit v0.152.3, js\intro.js `entscheiden`, gleich wie Typoluck
 * 0.18.2). Nutzer 28.09.2026: „Wenn ich die Seite neu lade, soll die UPCrew-Animation erneut kommen."
 *
 * Aufruf: siehe tests\README.md
 */

const fs = require("fs");
const pfad = require("path");

let anzahlOk = 0;
let anzahlFehler = 0;

function gleich(bezeichnung, ist, soll) {
    if (ist === soll) {
        anzahlOk++;
    } else {
        anzahlFehler++;
        console.error("FEHLER: " + bezeichnung);
        console.error("        ist " + JSON.stringify(ist) + ", soll " + JSON.stringify(soll));
    }
}

const wurzel = pfad.join(__dirname, "..");
const lesen = (name) => fs.readFileSync(pfad.join(wurzel, name), "utf8");
const INTRO = require("../js/intro.js");
const AKTUALISIEREN = require("../js/aktualisieren.js");

gleich("Jedes Laden: Intro", INTRO.entscheiden({ ladeArt: "navigate" }), true);
gleich("Neuladen (F5): Intro", INTRO.entscheiden({ ladeArt: "reload" }), true);
gleich("Zurück/Vor (wird neu geladen): Intro", INTRO.entscheiden({ ladeArt: "back_forward" }), true);
gleich("Ohne Angaben: Intro", INTRO.entscheiden(), true);
gleich("Automatisches Neuladen der Aktualisierung (vor 2 s): kein Intro",
    INTRO.entscheiden({ ladeArt: "reload", aktualisiertVorMs: 2000 }), false);
gleich("… Merker alt (vor 5 min), der Nutzer lädt selbst neu: Intro",
    INTRO.entscheiden({ ladeArt: "reload", aktualisiertVorMs: 300000 }), true);
gleich("Werkstatt, frischer Aufruf ohne &intro (Bildschirmfoto): kein Intro",
    INTRO.entscheiden({ werkstatt: true, ladeArt: "navigate" }), false);
gleich("Werkstatt, Neuladen: Intro", INTRO.entscheiden({ werkstatt: true, ladeArt: "reload" }), true);
gleich("Werkstatt mit &intro: Intro", INTRO.entscheiden({ werkstatt: true, introSchalter: true, ladeArt: "navigate" }), true);
gleich("Merker der Aktualisierung: derselbe Name wie in js\\aktualisieren.js",
    lesen("js/intro.js").indexOf('"' + AKTUALISIEREN.MERKER + '"') !== -1, true);
gleich("zeigen fragt faellig", /!INTRO\.faellig\(\)/.test(lesen("js/intro.js")), true);

/* Die Farbwelt (seit v0.152.4, wie Typoluck 0.18.3). */
const WELTEN = ["werkstatt", "studio", "feld", "tiefsee", "gold"];
gleich("Normal: die gewählte Welt (Pink = feld)",
    INTRO.weltWaehlen({ gewaehlt: "feld", standard: "werkstatt", welten: WELTEN }), "feld");
gleich("Werkstatt mit &farbwelt",
    INTRO.weltWaehlen({ werkstatt: true, werkstattWelt: "gold", gewaehlt: "feld", standard: "werkstatt", welten: WELTEN }), "gold");
gleich("Werkstatt ohne Angabe: Standard",
    INTRO.weltWaehlen({ werkstatt: true, gewaehlt: "feld", standard: "werkstatt", welten: WELTEN }), "werkstatt");
gleich("Unbekannte Welt: Standard",
    INTRO.weltWaehlen({ gewaehlt: "lila", standard: "werkstatt", welten: WELTEN }), "werkstatt");
gleich("zeigen gibt INTRO.welt() mit", /welt: INTRO\.welt\(\)/.test(lesen("js/intro.js")), true);
gleich("Das Intro startet bei jedem Start der App (APP.starten → INTRO.zeigen)",
    /INTRO\.zeigen\(document\.getElementById\("intro"\)\)/.test(lesen("js/app.js")), true);

console.log(anzahlOk + " ok, " + anzahlFehler + " Fehler");
process.exit(anzahlFehler === 0 ? 0 : 1);
