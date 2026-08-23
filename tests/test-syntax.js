/*
 * test-syntax.js — prüft alle Programmdateien, die nur im Browser laufen.
 *
 * `test-modell.js` prüft die Datenlogik inhaltlich. Die übrigen Dateien
 * (Bildschirm, Speicher, Start) brauchen einen Browser und lassen sich hier
 * nicht ausführen — wohl aber ÜBERSETZEN. Genau das macht dieser Test: jede
 * Datei wird kompiliert, ohne sie zu starten. Damit fallen Tippfehler,
 * vergessene Klammern und die im Haus bekannte Falle der typografischen
 * Anführungszeichen sofort auf und nicht erst beim Aufruf der Seite.
 *
 * Zusätzlich wird geprüft, dass jede Datei in index.html eingebunden ist —
 * eine neue Datei zu schreiben und das Einbinden zu vergessen, ist ein
 * lautloser Fehler.
 */

const pfad = require("path");
const dateisystem = require("fs");
const vm = require("vm");

const projekt = pfad.join(__dirname, "..");
const jsOrdner = pfad.join(projekt, "js");

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

const dateien = dateisystem.readdirSync(jsOrdner)
    .filter((name) => name.endsWith(".js"))
    .sort();

pruefe("Der Ordner js enthält Programmdateien", () => {
    if (dateien.length === 0) {
        throw new Error("keine .js-Datei gefunden");
    }
});

/* Übersetzbarkeit jeder einzelnen Datei. */
for (const name of dateien) {
    pruefe("js/" + name + " ist syntaktisch fehlerfrei", () => {
        const quelltext = dateisystem.readFileSync(pfad.join(jsOrdner, name), "utf8");
        /* new vm.Script übersetzt, führt aber nichts aus. */
        new vm.Script(quelltext, { filename: name });
    });
}

/* Einbindung in index.html. */
const seite = dateisystem.readFileSync(pfad.join(projekt, "index.html"), "utf8");

for (const name of dateien) {
    pruefe("js/" + name + " ist in index.html eingebunden", () => {
        if (seite.indexOf("js/" + name) === -1) {
            throw new Error("kein script-Verweis auf js/" + name + " in index.html");
        }
    });
}

/*
 * Aufrufe ins Modell und in die Versiegelung müssen es wirklich geben.
 *
 * Das fängt die typische Umbau-Falle: Eine Funktion wird umbenannt, eine
 * Bildschirmdatei ruft sie weiter unter dem alten Namen auf. Syntaktisch ist
 * das fehlerfrei, im Browser fliegt es erst beim Klick auseinander.
 */
globalThis.SPIELER = require(pfad.join(jsOrdner, "spieler.js"));
globalThis.SCHACH_VARIANTEN = require(pfad.join(jsOrdner, "schach-varianten.js"));
globalThis.SCHACH = require(pfad.join(jsOrdner, "schach.js"));
globalThis.SCHACH_RUNDE = require(pfad.join(jsOrdner, "schach-runde.js"));
globalThis.SCHACH_TAFEL = require(pfad.join(jsOrdner, "schach-tafel.js"));

const bausteine = {
    SPIELER: globalThis.SPIELER,
    SCHACH: globalThis.SCHACH,
    SCHACH_VARIANTEN: globalThis.SCHACH_VARIANTEN,
    SCHACH_RUNDE: globalThis.SCHACH_RUNDE,
    SCHACH_TAFEL: globalThis.SCHACH_TAFEL,
    RANGLISTE: require(pfad.join(jsOrdner, "rangliste.js")),
    VERSIEGELUNG: require(pfad.join(jsOrdner, "versiegelung.js"))
};

for (const name of dateien) {
    const quelltext = dateisystem.readFileSync(pfad.join(jsOrdner, name), "utf8");

    for (const baustein of Object.keys(bausteine)) {
        /* Der Rückblick verhindert, dass SCHACH auch in TEAM_SCHACH trifft —
           sonst prüft der Test Eigenschaften am falschen Baustein. */
        const muster = new RegExp("(?<![A-Za-z0-9_])" + baustein + "\\.([A-Za-z][A-Za-z0-9_]*)", "g");
        const benutzt = new Set();

        let treffer = muster.exec(quelltext);
        while (treffer !== null) {
            benutzt.add(treffer[1]);
            treffer = muster.exec(quelltext);
        }

        for (const eigenschaft of benutzt) {
            pruefe("js/" + name + ": " + baustein + "." + eigenschaft + " gibt es", () => {
                if (!(eigenschaft in bausteine[baustein])) {
                    throw new Error(baustein + "." + eigenschaft + " ist nicht definiert");
                }
            });
        }
    }
}

/* Die Stildatei ebenfalls. */
pruefe("css/stil.css ist in index.html eingebunden", () => {
    if (seite.indexOf("css/stil.css") === -1) {
        throw new Error("kein Verweis auf css/stil.css in index.html");
    }
});

/* Die Version muss an genau einer Stelle stehen und im CHANGELOG auftauchen. */
pruefe("Version aus konfig.js steht im CHANGELOG", () => {
    const konfig = dateisystem.readFileSync(pfad.join(jsOrdner, "konfig.js"), "utf8");
    const treffer = konfig.match(/APP_VERSION:\s*"([^"]+)"/);
    if (!treffer) {
        throw new Error("APP_VERSION nicht in js/konfig.js gefunden");
    }

    const version = treffer[1];
    const changelog = dateisystem.readFileSync(pfad.join(projekt, "CHANGELOG.md"), "utf8");
    if (changelog.indexOf("v" + version) === -1) {
        throw new Error("v" + version + " fehlt in CHANGELOG.md");
    }
});

/*
 * UND SIE MUSS IN DER STATUS.md STEHEN (seit v0.85).
 *
 * Die STATUS.md ist der Einstieg jeder neuen Sitzung — steht dort eine alte
 * Nummer, arbeitet die nächste Sitzung mit einem falschen Bild vom Projekt.
 * Genau das ist nach v0.84.0 passiert: ausgeliefert war 0.84.0, die STATUS.md
 * nannte weiter 0.83.1. Dieselbe Prüfung wie beim CHANGELOG, nur eine Datei
 * weiter — sie kostet nichts und fängt eine Drift ab, die sonst erst beim
 * Lesen auffällt.
 */
pruefe("Version aus konfig.js steht in der STATUS.md", () => {
    const konfig = dateisystem.readFileSync(pfad.join(jsOrdner, "konfig.js"), "utf8");
    const treffer = konfig.match(/APP_VERSION:\s*"([^"]+)"/);
    if (!treffer) {
        throw new Error("APP_VERSION nicht in js/konfig.js gefunden");
    }

    const version = treffer[1];
    const status = dateisystem.readFileSync(pfad.join(projekt, "STATUS.md"), "utf8");

    /*
     * GEPRUEFT WIRD DIE VERSIONSZEILE SELBST, nicht der ganze Kopf.
     *
     * Bis v0.90 stand hier `kopf.indexOf(...)` — und das war zu grosszuegig:
     * Im Kopf steht auch der Satz „das naechste Voll-Backup ist bei v0.90.0
     * faellig". Als die App auf 0.90.0 sprang, fand der Test die Nummer dort
     * und meldete gruen, obwohl die Versionszeile noch 0.89.0 nannte — also
     * genau die Drift, gegen die er gebaut wurde. Ein Waechter, der am
     * falschen Ort sucht, ist schlimmer als keiner: Er beruhigt.
     */
    const zeile = (status.match(/^\*\*Version:\*\*.*$/m) || [""])[0];

    if (!zeile) {
        throw new Error("In der STATUS.md fehlt die Zeile, die mit"
            + " **Version:** beginnt");
    }
    if (zeile.indexOf("v" + version) === -1) {
        throw new Error("Die Versionszeile der STATUS.md nennt nicht v" + version
            + " (dort steht: " + zeile.trim() + ")");
    }
});

pruefe("Die Pruefsummen-Zutaten heissen blunderluck", () => {
    /*
     * Diese Zeichenketten sind keine Namen, sondern Zutaten einer Pruefsumme.
     * Wer sie umbenennt, macht jede Spieler-PIN, das Verwaltungs-Passwort und
     * jedes Siegel ungueltig, und zwar STILL: Es faellt erst auf, wenn sich
     * jemand nicht mehr anmelden kann. Die Lehre stammt aus dem Quizz
     * (dort v0.89 umbenannt, v0.90 zurueckgebaut).
     */
    const versiegelung = dateisystem.readFileSync(
        pfad.join(jsOrdner, "versiegelung.js"), "utf8");

    for (const zutat of ["blunderluck-pin|", "blunderluck-admin|"]) {
        if (versiegelung.indexOf(zutat) === -1) {
            throw new Error("Die Pruefsummen-Zutat \"" + zutat + "\" fehlt in"
                + " versiegelung.js — wurde sie umbenannt? Das macht PINs,"
                + " Verwaltungs-Passwort und Siegel ungueltig.");
        }
    }

    /* Und die Speicherpfade, die Adresse aller gespeicherten Daten. */
    const konfig = dateisystem.readFileSync(pfad.join(jsOrdner, "konfig.js"), "utf8");

    for (const schluessel of ["pfad: \"spieler\"", "schachPfad: \"team-schach\"",
        "blunderluck.spieler", "blunderluck.team-schach"]) {
        if (konfig.indexOf(schluessel) === -1) {
            throw new Error("Der Speicherpfad \"" + schluessel + "\" fehlt in"
                + " konfig.js — neue Pfade lassen alle bisherigen Daten"
                + " verwaisen.");
        }
    }
});

pruefe("Der Name der App ist Blunderluck", () => {
    /*
     * Der Name und die technischen Kennungen sollen nicht auseinanderlaufen
     * — die Lehre stammt aus dem Quizz (v0.89/v0.90). Der Test darueber
     * haelt die technische Kennung stabil, dieser den Namen.
     *
     * SEIT v0.16.0 (Wunsch 3) IST DER SCHRIFTZUG IM KOPF UNSICHTBAR
     * (`class="nur-vorlesen"`). Die Ueberschrift muss trotzdem dastehen —
     * fuer Vorleseprogramme —, deshalb wird jetzt auf das ENDE des
     * h1-Elements geprueft statt auf die frueher feste Schreibweise
     * „<h1>Blunderluck</h1>".
     */
    const seite = dateisystem.readFileSync(pfad.join(projekt, "index.html"), "utf8");
    const anzeige = dateisystem.readFileSync(
        pfad.join(projekt, "manifest.webmanifest"), "utf8");

    for (const stelle of ["<title>Blunderluck</title>", ">Blunderluck</h1>"]) {
        if (seite.indexOf(stelle) === -1) {
            throw new Error("index.html: " + stelle + " fehlt —"
                + " der Name der App muss Blunderluck sein");
        }
    }

    if (anzeige.indexOf("\"name\": \"Blunderluck\"") === -1) {
        throw new Error("manifest.webmanifest: der Name heisst nicht Blunderluck");
    }
});

pruefe("Der Schriftzug im Kopf ist unsichtbar (Wunsch 3, v0.16.0)", () => {
    /*
     * „Der Schriftzug Blunderluck oben soll ueberall verschwinden."
     * Geloescht wurde die Ueberschrift NICHT (siehe oben) — sie traegt die
     * Klasse `nur-vorlesen`. Ohne diesen Test kaeme sie beim naechsten
     * Anfassen der Kopfzeile lautlos zurueck.
     */
    const seite = dateisystem.readFileSync(pfad.join(projekt, "index.html"), "utf8");
    const stil = dateisystem.readFileSync(
        pfad.join(projekt, "css", "stil.css"), "utf8");

    if (seite.indexOf("<h1 class=\"nur-vorlesen\">Blunderluck</h1>") === -1) {
        throw new Error("die Ueberschrift im Kopf ist wieder sichtbar");
    }
    if (stil.indexOf(".nur-vorlesen") === -1) {
        throw new Error("die Klasse nur-vorlesen fehlt in der Stildatei");
    }
});


/*
 * DIE ZWÖLF FIGUREN-BILDER DES 3D-LOOKS (seit v0.121).
 *
 * Die Bilder liegen als Dateien im Projekt und werden allein über die
 * Stildatei eingebunden — kein Programmcode fasst sie an. Damit gibt es
 * genau eine Art, sie zu verlieren: eine Datei umbenennen oder loeschen und
 * die Stildatei vergessen. Sichtbar wuerde das erst am Brett, und auch dort
 * nur im 3D-Look; die Figur faellt still auf ihr Schriftzeichen zurueck.
 *
 * Dieser Test schliesst die Luecke: Er liest die Verweise aus der ECHTEN
 * Stildatei und sieht nach, ob jede Datei da ist.
 */
pruefe("Die zwoelf Figuren-Bilder des 3D-Looks liegen alle da (v0.121)", () => {
    const stil = dateisystem.readFileSync(
        pfad.join(projekt, "css", "stil.css"), "utf8");
    const verweise = stil.match(/url\("\.\.\/img\/figuren\/[^"]+"\)/g) || [];

    if (verweise.length !== 12) {
        throw new Error("stil.css nennt " + verweise.length
            + " Figuren-Bilder, erwartet sind 12"
            + " (6 Arten mal 2 Farben, Paket-Vertrag in"
            + " docs/FIGUREN-BLENDER.md)");
    }

    for (const verweis of verweise) {
        const datei = verweis.slice("url(\"../".length, -2);
        if (!dateisystem.existsSync(pfad.join(projekt, datei))) {
            throw new Error(datei + " wird in stil.css genannt, fehlt aber");
        }
    }
});

/*
 * Und die Gegenrichtung: Jede Art braucht ihre Klasse, sonst greift die
 * Stildatei nicht. `_figurKlasse` ist die einzige Stelle, die sie vergibt.
 */
pruefe("_figurKlasse vergibt Marker- und Art-Klasse (v0.121, erweitert v0.122)", () => {
    const quelle = dateisystem.readFileSync(
        pfad.join(jsOrdner, "team-schach-brett.js"), "utf8");
    const stil = dateisystem.readFileSync(
        pfad.join(projekt, "css", "stil.css"), "utf8");

    for (const art of ["bauer", "springer", "laeufer", "turm", "dame", "koenig"]) {
        if (quelle.indexOf("\"" + art + "\"") === -1) {
            throw new Error("team-schach-brett.js kennt die Art " + art
                + " nicht — _figurKlasse muss sie vergeben");
        }
        if (stil.indexOf(".figur-art-" + art) === -1) {
            throw new Error("stil.css hat keine Regel fuer .figur-art-" + art);
        }
    }

    /*
     * Die Marker-Klasse (seit v0.122): An ihr haengen Farbe, Kasten und die
     * Lage AUF der Kachel. Wer sie in `_figurKlasse` streicht, bekaeme wieder
     * Schriftzeichen mit Bild-Regeln darunter — also gar nichts Sichtbares.
     */
    if (quelle.indexOf("figur-bild figur-art-") === -1) {
        throw new Error("_figurKlasse vergibt die Marker-Klasse figur-bild"
            + " nicht mehr — ohne sie greift keine Bild-Regel");
    }
    if (stil.indexOf(".figur-bild") === -1) {
        throw new Error("stil.css hat keine Regel fuer .figur-bild");
    }
});
console.log(anzahlOk + " ok, " + anzahlFehler + " Fehler");
process.exit(anzahlFehler === 0 ? 0 : 1);
