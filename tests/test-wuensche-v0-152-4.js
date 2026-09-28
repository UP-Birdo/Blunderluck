/*
 * test-wuensche-v0-152-4.js — die Wünsche des Nutzers vom 28.09.2026, Fassung v0.152.4.
 *
 * Geprüft: A Denk-Blase bei der Seite am Zug (nicht bei der wartenden); B die Mauer im 2D-Modus flach mit
 * Ziegelfugen und EINER hellen Restzeit; C der flache Würfel im 2D-Modus (3D-Bild nur in 3D); D die Warnung am
 * Schutzschild und ihre Anzeige; E flache Fähigkeiten-Karten im 2D-Modus. (F Item-Max: test-item-max.js.)
 *
 * Aufruf: siehe tests\README.md
 */

const fs = require("fs");
const pfad = require("path");

const { umgebung, SCHACH_TAFEL, SCHACH_VARIANTEN, TEAM_SCHACH, FAEHIGKEIT_ZEICHEN, kennungen,
    klasseSuchen } = require("./bildschirm-umgebung.js");

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
const body = umgebung.document.body;

/* Führt `fn` einmal mit 2D-Brett (Klasse `brett-flach` am body) aus. */
function imFlachen(fn) {
    body.classList.add("brett-flach");
    try {
        return fn();
    } finally {
        body.classList.remove("brett-flach");
    }
}

pruefe("A: Denk-Blase nur bei der Seite am Zug", () => {
    const partie = SCHACH_TAFEL.partie(TEAM_SCHACH.abgleich.daten, kennungen.standard);
    const person = umgebung.ICH.person();
    const amZug = partie.stand.amZug;
    const wartet = (amZug === "weiss") ? "schwarz" : "weiss";
    wahr(klasseSuchen(TEAM_SCHACH._spielerZeileBauen(partie, person, amZug), "denk-blase"), "am Zug: Blase da");
    wahr(!klasseSuchen(TEAM_SCHACH._spielerZeileBauen(partie, person, wartet), "denk-blase"), "wartend: keine Blase");
    const blase = TEAM_SCHACH._denkBlaseBauen();
    wahr(klasseSuchen(blase, "denk-kreis") && klasseSuchen(blase, "denk-punkt-1"), "Punkte und laufender Kreis");
    wahr(/@keyframes denk-drehen/.test(lesen("css/stil-auswertung.css")), "Kreis läuft");
});

pruefe("B: Mauer im 2D flach mit Fugen, Restzeit nur einmal und hell", () => {
    const css = lesen("css/stil-effekte.css");
    wahr(/body\.brett-flach \.feld-mauer::after \{[^}]*--mauer-fuge/.test(css), "flache Mauer mit Fugen");
    wahr(/body\.brett-flach \.feld-mauer\.mauer-senkrecht::after \{/.test(css), "senkrechte Mauer gedreht");
    wahr(/body\.brett-flach \.feld-mauer:not\(\.mauer-ende\) > \.feld-restzeit \{\s*display: none;/.test(css),
        "Restzeit nur am Ende");
    wahr(/body\.brett-flach \.feld-mauer > \.feld-restzeit \{[^}]*background: #fff;/.test(css), "hell");
});

pruefe("C: Würfel im 2D flach, im 3D das gerenderte Bild", () => {
    const stufe = SCHACH_VARIANTEN.STUFEN[0];
    const drei = TEAM_SCHACH._wuerfelBauen(stufe, false);
    wahr(!/wuerfel-flach/.test(drei.attribute.class), "3D: kein flacher Würfel");
    const flach = imFlachen(() => TEAM_SCHACH._wuerfelBauen(stufe, false));
    wahr(/wuerfel-flach/.test(flach.attribute.class), "2D: flach");
    const pech = imFlachen(() => TEAM_SCHACH._wuerfelBauen(stufe, true));
    wahr((pech.kinder || []).some((k) => k.attribute && k.attribute.transform === "rotate(180 50 50)"),
        "Unglück kopfüber");
});

pruefe("D: Schutzschild warnt, die aktive Karte zeigt die Warnung", () => {
    const schild = SCHACH_VARIANTEN.FAEHIGKEITEN
        ? [].concat(SCHACH_VARIANTEN.FAEHIGKEITEN).find((f) => f && f.id === "schutzschild") : null;
    const quelle = lesen("js/schach-varianten.js");
    wahr((schild && /Schild ist weg|Schild weg/.test(schild.warnung || ""))
        || /warnung: "Achtung · Figur stehen lassen, sonst ist das Schild weg"/.test(quelle), "Warnung am Schild");
    wahr(/hand-aktiv-warnung", beschreibung\.warnung/.test(lesen("js/team-schach.js")), "Anzeige an der Karte");
    wahr(/\.hand-aktiv-warnung \{/.test(lesen("css/stil-auswertung.css")), "Stil");
});

pruefe("E: Fähigkeiten-Karten im 2D flach, im 3D das Plättchen", () => {
    const klasse = (el) => String(el.className || (el.attribute || {}).class || "");
    /* Die Plättchen rechnet brett-3d.js erst im Browser — hier eins untergeschoben. */
    const art = "schutzschild";
    FAEHIGKEIT_ZEICHEN.plaettchen[art] = "data:image/png;base64,AA==";
    let drei;
    let flach;
    try {
        drei = FAEHIGKEIT_ZEICHEN.bauen(art);
        flach = imFlachen(() => FAEHIGKEIT_ZEICHEN.bauen(art));
    } finally {
        delete FAEHIGKEIT_ZEICHEN.plaettchen[art];
    }
    const erwartet = FAEHIGKEIT_ZEICHEN.flachBauen(art);
    wahr(/faehigkeit-bild-3d/.test(klasse(drei)), "3D: Plättchen (" + klasse(drei) + ")");
    wahr(!/faehigkeit-bild-3d/.test(klasse(flach)), "2D: kein Plättchen (" + klasse(flach) + ")");
    wahr(klasse(flach) === klasse(erwartet), "2D baut die flache Karte");
});

console.log(anzahlOk + " ok, " + anzahlFehler + " Fehler");
process.exit(anzahlFehler === 0 ? 0 : 1);
