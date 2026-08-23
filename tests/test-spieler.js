/*
 * test-spieler.js — Regressionstests der Spielerliste (js\spieler.js).
 *
 * Geprüft wird die ECHTE Datei: Datenvertrag, Nachrüsten, Suchen, Ändern,
 * Zusammenführen und der Inhaltsvergleich — alles ohne Browser.
 *
 * Aufruf: siehe tests\README.md
 */

const pfad = require("path");

const SPIELER = require(pfad.join(__dirname, "..", "js", "spieler.js"));

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

/* Drei Mitspieler, feste Kennungen wie in allen Tests. */
function mitDrei() {
    let daten = SPIELER.leereDaten(1000);
    daten = SPIELER.spielerHinzufuegen(daten, "Anna", "id-anna", 1000);
    daten = SPIELER.spielerHinzufuegen(daten, "Bert", "id-bert", 1000);
    daten = SPIELER.spielerHinzufuegen(daten, "Cem", "id-cem", 1000);
    return daten;
}

/* ------------------------------------------------------------------ *
 * Grundstrukturen und Nachrüsten
 * ------------------------------------------------------------------ */

pruefe("Ein leerer Stand ist gültig und leer", () => {
    const daten = SPIELER.leereDaten(1000);
    gleich(daten.datenVersion, SPIELER.DATEN_VERSION, "Fassung");
    gleich(daten.geaendertAm, 1000, "Zeitpunkt");
    gleich(daten.spieler.length, 0, "keine Spieler");
});

pruefe("normalisieren macht aus Müll einen leeren Stand", () => {
    for (const roh of [null, undefined, 42, "kaputt", [], { spieler: "nein" }]) {
        const daten = SPIELER.normalisieren(roh);
        gleich(daten.spieler.length, 0, "leer bei " + JSON.stringify(roh));
        gleich(daten.datenVersion, SPIELER.DATEN_VERSION, "Fassung gesetzt");
    }
});

pruefe("normalisieren ergänzt fehlende Felder, verwirft aber keine Spieler", () => {
    const daten = SPIELER.normalisieren({
        geaendertAm: 500,
        spieler: [
            { id: "id-anna", name: "Anna" },
            { id: "id-bert", name: "Bert", pinPruefwert: "abc", pinSalz: "def" },
            "kaputt",
            null
        ]
    });

    gleich(daten.spieler.length, 2, "zwei gültige Spieler");
    gleich(daten.geaendertAm, 500, "Zeitpunkt übernommen");
    gleich(daten.spieler[0].pinPruefwert, "", "fehlende PIN wird leer ergänzt");
    gleich(daten.spieler[1].pinPruefwert, "abc", "vorhandene PIN bleibt");
    gleich(daten.spieler[1].pinSalz, "def", "vorhandenes Salz bleibt");
});

pruefe("Änderungen lassen den Ausgangsstand unangetastet", () => {
    const vorher = mitDrei();
    const kopieText = JSON.stringify(vorher);

    SPIELER.spielerHinzufuegen(vorher, "Dora", "id-dora", 2000);
    SPIELER.spielerEntfernen(vorher, "id-anna", 2000);
    SPIELER.nameSetzen(vorher, "id-anna", "Anders", 2000);
    SPIELER.pinSetzen(vorher, "id-anna", "p", "s", 2000);

    gleich(JSON.stringify(vorher), kopieText, "Ausgangsstand unverändert");
});

/* ------------------------------------------------------------------ *
 * Suchen
 * ------------------------------------------------------------------ */

pruefe("spielerFinden findet über die Kennung", () => {
    const daten = mitDrei();
    gleich(SPIELER.spielerFinden(daten, "id-bert").name, "Bert", "gefunden");
    gleich(SPIELER.spielerFinden(daten, "id-nix"), null, "unbekannt = null");
});

pruefe("spielerNachName findet ohne Rücksicht auf Groß- und Kleinschreibung", () => {
    const daten = mitDrei();
    gleich(SPIELER.spielerNachName(daten, "anna").id, "id-anna", "klein geschrieben");
    gleich(SPIELER.spielerNachName(daten, "  BERT ").id, "id-bert", "mit Rändern");
    gleich(SPIELER.spielerNachName(daten, ""), null, "leer = null");
    gleich(SPIELER.spielerNachName(daten, "Dora"), null, "unbekannt = null");
});

pruefe("hatPin verlangt Prüfwert UND Salz", () => {
    wahr(!SPIELER.hatPin(null), "null");
    wahr(!SPIELER.hatPin({ pinPruefwert: "", pinSalz: "" }), "beides leer");
    wahr(!SPIELER.hatPin({ pinPruefwert: "abc", pinSalz: "" }), "ohne Salz");
    wahr(SPIELER.hatPin({ pinPruefwert: "abc", pinSalz: "def" }), "beides da");
});

/* ------------------------------------------------------------------ *
 * Passwort-Regel (v0.7.0, Bündel A Schritt 2)
 * ------------------------------------------------------------------ */

pruefe("passwortPruefen: 4 bis 8 Zeichen sind gültig", () => {
    gleich(SPIELER.passwortPruefen("abcd"), "", "vier Buchstaben");
    gleich(SPIELER.passwortPruefen("Abc4!xY?"), "", "acht gemischte Zeichen");
    gleich(SPIELER.passwortPruefen("1234"), "",
        "eine alte 4-stellige PIN bleibt ein gültiges Passwort");
});

pruefe("passwortPruefen weist zu kurz, zu lang und Leerraum ab", () => {
    wahr(SPIELER.passwortPruefen("abc") !== "", "drei Zeichen sind zu kurz");
    wahr(SPIELER.passwortPruefen("abcdefghi") !== "", "neun Zeichen sind zu lang");
    wahr(SPIELER.passwortPruefen("ab cd") !== "", "Leerzeichen mittendrin");
    wahr(SPIELER.passwortPruefen(" abcd") !== "", "Leerzeichen am Rand");
    wahr(SPIELER.passwortPruefen("") !== "", "leer");
    wahr(SPIELER.passwortPruefen(null) !== "", "null");
    wahr(SPIELER.passwortPruefen(undefined) !== "", "undefined");
});

pruefe("passwortPruefen unterscheidet Gross- und Kleinschreibung nicht selbst", () => {
    /* Die Empfindlichkeit steckt in der Prüfsumme (versiegelung.js) — die
       Regel hier muss beide Schreibungen nur GELTEN lassen. */
    gleich(SPIELER.passwortPruefen("PASS"), "", "gross");
    gleich(SPIELER.passwortPruefen("pass"), "", "klein");
});

/* ------------------------------------------------------------------ *
 * Ändern
 * ------------------------------------------------------------------ */

pruefe("Hinzufügen, Umbenennen, PIN setzen und Entfernen", () => {
    let daten = mitDrei();
    gleich(daten.spieler.length, 3, "drei dabei");

    daten = SPIELER.nameSetzen(daten, "id-anna", "Annelie", 2000);
    gleich(SPIELER.spielerFinden(daten, "id-anna").name, "Annelie", "umbenannt");
    gleich(daten.geaendertAm, 2000, "Zeitpunkt gesetzt");

    daten = SPIELER.pinSetzen(daten, "id-bert", "pruef", "salz", 2100);
    const bert = SPIELER.spielerFinden(daten, "id-bert");
    wahr(SPIELER.hatPin(bert), "PIN hinterlegt");

    daten = SPIELER.spielerEntfernen(daten, "id-cem", 2200);
    gleich(daten.spieler.length, 2, "einer weniger");
    gleich(SPIELER.spielerFinden(daten, "id-cem"), null, "Cem ist weg");
});

/* ------------------------------------------------------------------ *
 * Zusammenführen — jeder ist Herr über seinen eigenen Eintrag
 * ------------------------------------------------------------------ */

pruefe("Der eigene Eintrag überlebt einen fremden Stand ohne ihn", () => {
    /* Der Quizz-v0.8-Fall: Ein anderes Gerät schreibt einen alten Stand,
       in dem der gerade Angemeldete noch fehlt. */
    const eigen = SPIELER.spielerHinzufuegen(SPIELER.leereDaten(1000), "Dora", "id-dora", 1100);
    const fremd = mitDrei();

    const ergebnis = SPIELER.zusammenfuehren(fremd, eigen, "id-dora");
    gleich(ergebnis.spieler.length, 4, "alle vier");
    gleich(SPIELER.spielerFinden(ergebnis, "id-dora").name, "Dora", "Dora bleibt");
});

pruefe("Der eigene Eintrag gewinnt gegen die fremde Fassung seiner selbst", () => {
    let eigen = mitDrei();
    eigen = SPIELER.nameSetzen(eigen, "id-anna", "Annelie", 2000);

    const ergebnis = SPIELER.zusammenfuehren(mitDrei(), eigen, "id-anna");
    gleich(SPIELER.spielerFinden(ergebnis, "id-anna").name, "Annelie",
        "eigener Name setzt sich durch");
    gleich(ergebnis.spieler.length, 3, "niemand doppelt");
});

pruefe("Fremde Einträge kommen unverändert vom Server", () => {
    let eigen = mitDrei();
    /* Eine lokale Änderung an BERT (fremder Eintrag) darf sich NICHT
       durchsetzen — nur der eigene Eintrag gehört einem. */
    eigen = SPIELER.nameSetzen(eigen, "id-bert", "Falsch", 2000);

    const ergebnis = SPIELER.zusammenfuehren(mitDrei(), eigen, "id-anna");
    gleich(SPIELER.spielerFinden(ergebnis, "id-bert").name, "Bert",
        "fremder Eintrag kommt vom Server");
});

pruefe("Ohne eigenen Eintrag ist das Ergebnis der fremde Stand", () => {
    const ergebnis = SPIELER.zusammenfuehren(mitDrei(), SPIELER.leereDaten(1000), "id-nix");
    gleich(ergebnis.spieler.length, 3, "fremder Stand übernommen");
});

/* ------------------------------------------------------------------ *
 * Inhaltsvergleich
 * ------------------------------------------------------------------ */

pruefe("inhaltGleich ignoriert den Zeitstempel", () => {
    const eins = mitDrei();
    const zwei = SPIELER.normalisieren(JSON.parse(JSON.stringify(eins)));
    zwei.geaendertAm = 9999;
    wahr(SPIELER.inhaltGleich(eins, zwei), "gleicher Inhalt");
});

pruefe("inhaltGleich erkennt jede echte Änderung", () => {
    const eins = mitDrei();

    wahr(!SPIELER.inhaltGleich(eins, SPIELER.spielerEntfernen(eins, "id-cem", 2000)),
        "einer weniger");
    wahr(!SPIELER.inhaltGleich(eins, SPIELER.nameSetzen(eins, "id-anna", "Neu", 2000)),
        "anderer Name");
    wahr(!SPIELER.inhaltGleich(eins, SPIELER.pinSetzen(eins, "id-anna", "p", "s", 2000)),
        "andere PIN");
});

/* ------------------------------------------------------------------ *
 * Freundschaft (v0.11.0, Bündel A Schritt 6) — jeder schreibt nur seine
 * eigene Sicht, die Beziehung wird aus beiden Listen GELESEN
 * ------------------------------------------------------------------ */

pruefe("normalisieren rüstet freunde und abgelehnt nach", () => {
    const daten = SPIELER.normalisieren({
        spieler: [
            { id: "id-anna", name: "Anna" },
            { id: "id-bert", name: "Bert", freunde: ["id-anna", 7, ""], abgelehnt: ["id-cem"] }
        ]
    });

    gleich(daten.spieler[0].freunde.length, 0, "fehlende Liste wird leer ergänzt");
    gleich(daten.spieler[0].abgelehnt.length, 0, "auch abgelehnt");
    gleich(daten.spieler[1].freunde.join(","), "id-anna", "Müll fliegt raus");
    gleich(daten.spieler[1].abgelehnt.join(","), "id-cem", "vorhandenes bleibt");
});

pruefe("freundschaft liest die vier Lagen aus beiden Sichten", () => {
    let daten = mitDrei();
    gleich(SPIELER.freundschaft(daten, "id-anna", "id-bert"), "keine", "Fremde");

    daten = SPIELER.freundHinzufuegen(daten, "id-anna", "id-bert", 2000);
    gleich(SPIELER.freundschaft(daten, "id-anna", "id-bert"), "gesendet",
        "Anna sieht ihre Anfrage als gesendet");
    gleich(SPIELER.freundschaft(daten, "id-bert", "id-anna"), "offen",
        "Bert sieht sie als offen");

    daten = SPIELER.freundHinzufuegen(daten, "id-bert", "id-anna", 2100);
    gleich(SPIELER.freundschaft(daten, "id-anna", "id-bert"), "freunde", "beidseitig");
    gleich(SPIELER.freundschaft(daten, "id-bert", "id-anna"), "freunde", "beidseitig");

    gleich(SPIELER.freundschaft(daten, "id-anna", "id-anna"), "keine",
        "niemand ist sein eigener Freund");
});

pruefe("Ablehnen: beim Ablehnenden verschwunden, beim Sender ohne Antwort", () => {
    let daten = mitDrei();
    daten = SPIELER.freundHinzufuegen(daten, "id-anna", "id-bert", 2000);
    daten = SPIELER.freundAblehnen(daten, "id-bert", "id-anna", 2100);

    gleich(SPIELER.freundschaft(daten, "id-bert", "id-anna"), "keine",
        "bei Bert ist die Anfrage weg");
    gleich(SPIELER.freundschaft(daten, "id-anna", "id-bert"), "gesendet",
        "Anna sieht weiter nur gesendet — keine Blossstellung");
});

pruefe("Entfernen erzeugt keine frische Anfrage aus der Gegenrichtung", () => {
    /* Der Stolperstein aus dem Entwurf: Ohne das Streichen UND Ablehnen
       sähe die entfernende Seite die verbliebene einseitige Eintragung
       des anderen als neue Anfrage. */
    let daten = mitDrei();
    daten = SPIELER.freundHinzufuegen(daten, "id-anna", "id-bert", 2000);
    daten = SPIELER.freundHinzufuegen(daten, "id-bert", "id-anna", 2100);

    daten = SPIELER.freundAblehnen(daten, "id-anna", "id-bert", 2200);

    gleich(SPIELER.freundschaft(daten, "id-anna", "id-bert"), "keine",
        "für Anna ist Bert kein Freund und keine Anfrage");
    gleich(SPIELER.freundschaft(daten, "id-bert", "id-anna"), "gesendet",
        "Berts Eintragung bleibt als gesendet stehen");
});

pruefe("Eine neue Anfrage hebt die eigene frühere Ablehnung auf", () => {
    let daten = mitDrei();
    daten = SPIELER.freundAblehnen(daten, "id-anna", "id-bert", 2000);
    daten = SPIELER.freundHinzufuegen(daten, "id-anna", "id-bert", 2100);

    gleich(SPIELER.freundschaft(daten, "id-anna", "id-bert"), "gesendet",
        "die Anfrage steht");
    gleich(SPIELER.spielerFinden(daten, "id-anna").abgelehnt.length, 0,
        "die Ablehnung ist aufgehoben");
});

pruefe("Zurückziehen streicht ohne Ablehnung — eine spätere Anfrage bleibt möglich", () => {
    let daten = mitDrei();
    daten = SPIELER.freundHinzufuegen(daten, "id-anna", "id-bert", 2000);
    daten = SPIELER.freundStreichen(daten, "id-anna", "id-bert", 2100);

    gleich(SPIELER.freundschaft(daten, "id-anna", "id-bert"), "keine", "zurückgezogen");
    gleich(SPIELER.freundschaft(daten, "id-bert", "id-anna"), "keine",
        "Bert sieht nichts mehr");

    daten = SPIELER.freundHinzufuegen(daten, "id-bert", "id-anna", 2200);
    gleich(SPIELER.freundschaft(daten, "id-anna", "id-bert"), "offen",
        "Berts spätere Anfrage kommt bei Anna an — nichts war abgelehnt");
});

pruefe("freundeVon sortiert in freunde, offen und gesendet", () => {
    let daten = mitDrei();
    daten = SPIELER.freundHinzufuegen(daten, "id-anna", "id-bert", 2000);
    daten = SPIELER.freundHinzufuegen(daten, "id-bert", "id-anna", 2100);
    daten = SPIELER.freundHinzufuegen(daten, "id-cem", "id-anna", 2200);

    const sicht = SPIELER.freundeVon(daten, "id-anna");
    gleich(sicht.freunde.map((s) => s.id).join(","), "id-bert", "Freunde");
    gleich(sicht.offen.map((s) => s.id).join(","), "id-cem", "offene Anfragen");
    gleich(sicht.gesendet.length, 0, "nichts gesendet");
});

pruefe("Die eigene Freundes-Sicht überlebt die Zusammenführung", () => {
    let eigen = mitDrei();
    eigen = SPIELER.freundHinzufuegen(eigen, "id-anna", "id-bert", 2000);

    const ergebnis = SPIELER.zusammenfuehren(mitDrei(), eigen, "id-anna");
    gleich(SPIELER.freundschaft(ergebnis, "id-anna", "id-bert"), "gesendet",
        "die Anfrage übersteht einen fremden Stand ohne sie");
});

pruefe("inhaltGleich erkennt Freundes-Änderungen", () => {
    const eins = mitDrei();

    wahr(!SPIELER.inhaltGleich(eins,
        SPIELER.freundHinzufuegen(eins, "id-anna", "id-bert", 2000)),
        "eine neue Anfrage zählt als Änderung");
    wahr(!SPIELER.inhaltGleich(eins,
        SPIELER.freundAblehnen(eins, "id-anna", "id-bert", 2000)),
        "eine Ablehnung zählt als Änderung");
});

/* ------------------------------------------------------------------ */

console.log(anzahlOk + " ok, " + anzahlFehler + " Fehler");
process.exit(anzahlFehler === 0 ? 0 : 1);
