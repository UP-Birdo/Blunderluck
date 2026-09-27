/*
 * test-wunsch.js — die Zeichen-Sperre beim Wunsch / Fehler melden (seit
 * v0.151.10, Nutzer 27.09.2026: „nur Text, sonst kann was schiefgehen").
 *
 * Das ECHTE js\wunsch.js läuft in einer Attrappe von Fenster und Dialog:
 *   - beim Tippen fliegt alles ausser Buchstaben, Ziffern, Leerzeichen,
 *     Zeilenumbruch und . , ! ? - ( ) : ; raus;
 *   - vor dem Senden: Mehrfach-Leerzeichen zu einem, Ränder weg, 500 Zeichen;
 *   - der Dialog bekommt Filter und Länge mit;
 *   - ins GitHub-Formular geht nur der gesäuberte Text;
 *   - die automatische Fehlermeldung behält Pfade, verliert < > { } `.
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
        console.error("        " + fehler.message);
    }
}

function gleich(ist, soll, was) {
    const a = JSON.stringify(ist);
    const b = JSON.stringify(soll);
    if (a !== b) {
        throw new Error(was + ": ist " + a + ", soll " + b);
    }
}

function wahr(bedingung, was) {
    if (!bedingung) {
        throw new Error(was);
    }
}

function laden() {
    const geoeffnet = [];
    const eingaben = [];
    const umgebung = {
        console,
        antwort: null,
        window: {
            open(adresse) {
                geoeffnet.push(adresse);
                return {};
            }
        },
        DIALOG: {
            async eingabe(...argumente) {
                eingaben.push(argumente);
                return umgebung.antwort;
            },
            async hinweis() { return true; }
        },
        KONFIG: { APP_VERSION: "test" },
        TABS: { liste: [], aktiveId: "" }
    };
    umgebung.globalThis = umgebung;
    vm.createContext(umgebung);
    const quelle = fs.readFileSync(pfad.join(__dirname, "..", "js", "wunsch.js"), "utf8");
    const WUNSCH = vm.runInContext(quelle + "\n;WUNSCH", umgebung);
    return { umgebung, WUNSCH, geoeffnet, eingaben };
}

(async () => {
    const { umgebung, WUNSCH, geoeffnet, eingaben } = laden();

    await pruefe("Beim Tippen: nur Buchstaben, Ziffern, Leerzeichen und einfache Satzzeichen", () => {
        gleich(WUNSCH.zeichenFiltern("Größe ändern, bitte! (Seite 2): ja; nein? - ok."),
            "Größe ändern, bitte! (Seite 2): ja; nein? - ok.", "Erlaubtes bleibt");
        gleich(WUNSCH.zeichenFiltern("<script>alert(1)</script>"), "scriptalert(1)script", "Spitze Klammern");
        gleich(WUNSCH.zeichenFiltern("a{b}[c]\\d/e|f$g%h&i*j=k~l^m`n"), "abcdefghijklmn", "Sonderzeichen");
        gleich(WUNSCH.zeichenFiltern("Hallo \u{1F600} Welt"), "Hallo  Welt", "Emoji");
        gleich(WUNSCH.zeichenFiltern("a​b\u0000c‮d﻿e"), "abcde", "Unsichtbares und Steuerzeichen");
        gleich(WUNSCH.zeichenFiltern("Zeile 1\r\nZeile 2\tTab"), "Zeile 1\nZeile 2 Tab", "Umbruch und Tab");
        gleich(WUNSCH.zeichenFiltern("ende "), "ende ", "Leerzeichen am Ende bleibt beim Tippen");
    });

    await pruefe("Vor dem Senden: Leerzeichen zusammen, Ränder weg, höchstens 500 Zeichen", () => {
        gleich(WUNSCH.saeubern("  zu    viele   Leerzeichen  "), "zu viele Leerzeichen", "Leerzeichen");
        gleich(WUNSCH.saeubern("a\n\n\n\n\nb"), "a\n\nb", "Leerzeilen");
        gleich(WUNSCH.saeubern("x".repeat(800)).length, 500, "Länge");
        gleich(WUNSCH.saeubern("<>{}[]$%&"), "", "nur Unfug wird leer");
    });

    await pruefe("Der Dialog bekommt Filter und Länge, ins Formular geht nur Gesäubertes", async () => {
        umgebung.antwort = "Bitte   <b>fett</b> {x} 😀 machen";
        await WUNSCH.oeffnen();
        const optionen = eingaben[0][6];
        wahr(optionen && typeof optionen.filter === "function", "Filter fehlt");
        gleich(optionen.maxLaenge, 500, "Länge");
        gleich(geoeffnet.length, 1, "Formular geöffnet");
        const idee = new URL(geoeffnet[0]).searchParams.get("idee");
        gleich(idee, "Bitte bfettb x machen", "gesäuberter Text");
    });

    await pruefe("Nur Unfug oder Abbrechen: nichts wird geöffnet", async () => {
        geoeffnet.length = 0;
        umgebung.antwort = "<<>>{}";
        await WUNSCH.oeffnen();
        umgebung.antwort = null;
        await WUNSCH.oeffnen();
        umgebung.antwort = false;
        await WUNSCH.oeffnen();
        gleich(geoeffnet.length, 0, "nichts geöffnet");
    });

    await pruefe("Automatische Fehlermeldung: Pfade bleiben, < > { } ` und Unsichtbares nicht", () => {
        const technik = WUNSCH.technikSaeubern("TypeError: x at https://a.b/js/app.js:12:3 <b>{`​`}</b>");
        gleich(technik, "TypeError: x at https://a.b/js/app.js:12:3 b/b", "Technik");
        gleich(WUNSCH.technikSaeubern("y".repeat(3000)).length, 1500, "Länge");
    });

    await pruefe("Das Eingabefeld filtert beim Tippen (dialog.js)", () => {
        const dialog = fs.readFileSync(pfad.join(__dirname, "..", "js", "dialog.js"), "utf8");
        wahr(/eingabe\(titel, text, vorgabe, bestaetigenText, abbrechbar, mehrzeilig, optionen\)/.test(dialog),
            "eingabe nimmt optionen");
        wahr(/vorgabe\.eingabe\.filter/.test(dialog) && /feld\.maxLength = vorgabe\.eingabe\.maxLaenge/.test(dialog),
            "Filter und Länge am Feld");
    });

    await pruefe("Der Wunsch-Text landet nirgends in innerHTML", () => {
        const quelle = fs.readFileSync(pfad.join(__dirname, "..", "js", "wunsch.js"), "utf8");
        wahr(!/innerHTML/.test(quelle), "wunsch.js benutzt innerHTML");
    });

    await pruefe("Wuensche-Abholen.ps1 prüft dasselbe, bevor etwas in TODO.md landet", () => {
        const skript = fs.readFileSync(pfad.join(__dirname, "..", "tools", "Wuensche-Abholen.ps1"), "utf8");
        wahr(/\$idee = \[string\]\$idee -replace "\[\^A-Za-z0-9/.test(skript), "Zeichen-Sperre fehlt");
        wahr(/Substring\(0, 500\)/.test(skript), "Länge fehlt");
    });

    console.log(anzahlOk + " ok, " + anzahlFehler + " Fehler");
    process.exit(anzahlFehler === 0 ? 0 : 1);
})();
