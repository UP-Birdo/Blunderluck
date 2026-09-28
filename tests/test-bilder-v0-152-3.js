/*
 * test-bilder-v0-152-3.js — die Fehler aus den Bildschirmfotos des Nutzers (28.09.2026), Fassung v0.152.3.
 *
 * Geprüft: Die Anleitung spielt IMMER ab, auch bei „weniger Bewegung" („Es soll nur noch die GIF-Variante
 * geben"), die Bühne auch im 2D-Modus; das Brett steht am PC mittig (Rollbalken-Platz auf beiden Seiten); nichts
 * lässt sich markieren, Eingabefelder und Codes schon; die Partie-Einstellungen blenden die Leiste aus, solange
 * die Partie läuft; das Achtung-Zeichen für abgelehnte Regeln statt Funkloch; der Dialogtext in voller Farbe.
 *
 * Aufruf: siehe tests\README.md
 */

const fs = require("fs");
const pfad = require("path");

const { umgebung, SCHACH_TAFEL, TEAM_SCHACH, kennungen, klasseSuchen } = require("./bildschirm-umgebung.js");

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

function wahr(bedingung, was) {
    if (!bedingung) {
        throw new Error(was);
    }
}

const projekt = pfad.join(__dirname, "..");
const lesen = (name) => fs.readFileSync(pfad.join(projekt, name), "utf8");
const ohneKommentare = (text) => text.replace(/\/\*[\s\S]*?\*\//g, "");

pruefe("Anleitung bei „weniger Bewegung“: abgespielt, keine Bilder mit Satz nebeneinander", () => {
    const echt = umgebung.window.matchMedia;
    umgebung.window.matchMedia = () => ({ matches: true });
    try {
        const anleitung = TEAM_SCHACH._anleitungBauen("verstaerkung");
        wahr(anleitung, "Anleitung da");
        wahr(/anleitung-film/.test(anleitung.className), "abgespielt: " + anleitung.className);
        wahr(!klasseSuchen(anleitung, "anleitung-marke"), "kein „Bild 1“");
    } finally {
        umgebung.window.matchMedia = echt;
    }
    wahr(!/_anleitungRuhigBauen\(/.test(ohneKommentare(lesen("js/team-schach-auswertung.js"))), "ruhige Fassung entfernt");
});

pruefe("Die Bühne spielt auch im 2D-Modus (nicht mehr an Z.einst.an gebunden)", () => {
    const quelle = lesen("js/brett-3d.js");
    const treffer = /function buehneMoeglich\(\) \{\s*return ([^;]+);/.exec(quelle);
    wahr(treffer, "buehneMoeglich gefunden");
    wahr(!/einst/.test(treffer[1]), "keine 2D/3D-Bedingung mehr: " + treffer[1]);
});

pruefe("Brett am PC mittig: Rollbalken-Platz auf beiden Seiten (Seite und Partie-Bereich)", () => {
    const stil = ohneKommentare(lesen("css/stil.css"));
    const anzahl = (stil.match(/scrollbar-gutter:\s*stable both-edges/g) || []).length;
    wahr(anzahl >= 2, "both-edges an html und .schach: " + anzahl);
    wahr(!/scrollbar-gutter:\s*stable;/.test(stil), "kein einseitiges stable mehr");
});

pruefe("Nichts markieren und ziehen — ausser Eingaben und Codes", () => {
    const stil = ohneKommentare(lesen("css/stil.css"));
    wahr(/body\s*\{[^}]*user-select:\s*none/.test(stil), "body ohne Markieren");
    wahr(/-webkit-user-drag:\s*none/.test(stil), "Bilder nicht ziehbar");
    const frei = /input,\s*textarea,[^{]*\{[^}]*user-select:\s*text/.exec(stil);
    wahr(frei && /\.partie-code/.test(frei[0]) && /\.einladung-code/.test(frei[0]), "Eingaben und Codes markierbar");
});

pruefe("Partie-Einstellungen: Leiste weg, solange die Partie läuft", () => {
    const tafel = TEAM_SCHACH.abgleich.daten;
    const partie = SCHACH_TAFEL.partie(tafel, kennungen.standard);
    const echt = umgebung.TABS.rundeSetzen;
    const aufrufe = [];
    umgebung.TABS.rundeSetzen = (...werte) => aufrufe.push(werte);
    try {
        TEAM_SCHACH.offeneId = partie.id;
        TEAM_SCHACH.spielEinstellungenOffen = true;
        TEAM_SCHACH.zeichnen(tafel);
        const letzter = aufrufe[aufrufe.length - 1];
        wahr(letzter && letzter[3] === true, "vierter Wert „spielt“: " + JSON.stringify(letzter));
    } finally {
        umgebung.TABS.rundeSetzen = echt;
        TEAM_SCHACH.spielEinstellungenOffen = false;
        TEAM_SCHACH.offeneId = "";
    }
});

pruefe("Fehler-Dialog: Achtung für Regeln, Funkloch nur bei Netzfehlern; Text in voller Farbe", () => {
    const dialog = lesen("js/dialog.js");
    wahr(/einstellung\.technik \? "kein-netz" : "achtung"/.test(dialog), "Zeichen nach Grund");
    wahr(/achtung:/.test(lesen("js/zustand.js")), "Zeichen achtung");
    wahr(/\.dialog-kasten \.zustand-text\s*\{[^}]*color:\s*var\(--schrift\)/.test(lesen("css/stil.css")), "voller Text");
});

console.log(anzahlOk + " ok, " + anzahlFehler + " Fehler");
process.exit(anzahlFehler === 0 ? 0 : 1);
