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
/* Ergänzt SCHACH_RUNDE (Fähigkeiten, Lootboxen, Händler) — NACH schach-runde.js. */
require(pfad.join(jsOrdner, "schach-runde-faehigkeiten.js"));
globalThis.SCHACH_TAFEL = require(pfad.join(jsOrdner, "schach-tafel.js"));
globalThis.SCHACH_BOT = require(pfad.join(jsOrdner, "schach-bot.js"));

const bausteine = {
    SPIELER: globalThis.SPIELER,
    SCHACH: globalThis.SCHACH,
    SCHACH_VARIANTEN: globalThis.SCHACH_VARIANTEN,
    SCHACH_RUNDE: globalThis.SCHACH_RUNDE,
    SCHACH_TAFEL: globalThis.SCHACH_TAFEL,
    SCHACH_BOT: globalThis.SCHACH_BOT,
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

/*
 * DIE STILDATEIEN EBENFALLS — seit dem 27.08.2026 ist das Aussehen in fünf
 * Dateien geteilt (reiner Umzug, ROADMAP-Gruppe J, Punkt 33). Die Reihenfolge
 * der link-Zeilen in index.html IST die Kaskade: Wer sie umstellt, ändert das
 * Aussehen, ohne eine Regel anzufassen. Geprüft wird deshalb, dass jede
 * Stildatei eingebunden ist und die Grundlagen (Variablen) zuerst laden.
 *
 * Für die Inhalts-Prüfungen weiter unten werden die Teile in genau dieser
 * Ladereihenfolge zu EINEM Text verkettet (`stil`) — für sie bleibt das
 * Aussehen eine Datei, egal wie viele Teile es sind.
 */
const stilNamen = [...seite.matchAll(/<link rel="stylesheet" href="css\/([^"]+)">/g)]
    .map((treffer) => treffer[1]);

pruefe("Ordner css und index.html nennen dieselben Stildateien", () => {
    const vorhanden = dateisystem.readdirSync(pfad.join(projekt, "css"))
        .filter((name) => name.endsWith(".css")).sort();
    const eingebunden = [...stilNamen].sort();
    if (vorhanden.join(", ") !== eingebunden.join(", ")) {
        throw new Error("Ordner css: " + vorhanden.join(", ")
            + " — index.html: " + eingebunden.join(", "));
    }
});

pruefe("stil.css (Grundlagen) lädt als erster Teil", () => {
    if (stilNamen[0] !== "stil.css") {
        throw new Error("erster Stylesheet-Verweis ist " + stilNamen[0]
            + " — die Grundlagen mit den Variablen müssen zuerst laden");
    }
});

const stil = stilNamen.map((name) => dateisystem.readFileSync(
    pfad.join(projekt, "css", name), "utf8")).join("");

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
    const verweise = stil.match(/url\("\.\.\/img\/figuren\/[^"]+"\)/g) || [];

    if (verweise.length !== 12) {
        throw new Error("die Stildateien nennen " + verweise.length
            + " Figuren-Bilder, erwartet sind 12"
            + " (6 Arten mal 2 Farben, Paket-Vertrag in"
            + " docs/FIGUREN-BLENDER.md)");
    }

    for (const verweis of verweise) {
        const datei = verweis.slice("url(\"../".length, -2);
        if (!dateisystem.existsSync(pfad.join(projekt, datei))) {
            throw new Error(datei + " wird in den Stildateien genannt, fehlt aber");
        }
    }
});

/*
 * DIE ZEHN LOOTBOX-BILDER (seit v0.24.0, Wunsch 10 in zweiter Fassung).
 *
 * Anders als die Figuren haengen sie NICHT in der Stildatei, sondern werden
 * im Bildschirm-Code zusammengesetzt (`TEAM_SCHACH._lootboxBild`). Fehlt eine
 * Datei, bleibt auf dem Brett ein leeres Feld stehen — das Fragezeichen ist
 * seit v0.24.0 EINGRAVIERT, es gibt also keine Rueckfallebene mehr im Code.
 * Umso wichtiger dieser Test: Er prueft, dass es zu jeder Stufe BEIDE Bilder
 * gibt (normal und Unglueck) und dass der Code dieselben Namen bildet, die
 * das Blender-Skript schreibt.
 */
pruefe("Die zehn Lootbox-Bilder liegen alle da (v0.24.0)", () => {
    const quelle = dateisystem.readFileSync(
        pfad.join(jsOrdner, "team-schach-brett.js"), "utf8");

    const treffer = quelle.match(/LOOTBOX_ORDNER:\s*"([^"]+)"/);
    if (!treffer) {
        throw new Error("team-schach-brett.js nennt keinen LOOTBOX_ORDNER");
    }
    const ordner = treffer[1];

    /* Die Stufen aus dem Modell, dazu die verborgene Box. */
    const varianten = dateisystem.readFileSync(
        pfad.join(jsOrdner, "schach-varianten.js"), "utf8");
    const stufen = (varianten.match(/\{\s*id:\s*"(gruen|blau|lila|gelb)"/g) || [])
        .map((zeile) => zeile.match(/"([a-z]+)"/)[1]);

    if (stufen.length !== 4) {
        throw new Error("erwartet 4 Stufen in schach-varianten.js, gefunden: "
            + stufen.length);
    }

    for (const stufe of stufen.concat(["unbekannt"])) {
        for (const nachsatz of ["", "-pech"]) {
            const datei = ordner + "lootbox-" + stufe + nachsatz + ".png";
            if (!dateisystem.existsSync(pfad.join(projekt, datei))) {
                throw new Error(datei + " fehlt - neu erzeugen mit"
                    + " tools\\Lootboxen rendern.cmd");
            }
        }
    }

    /* Und das Blender-Skript schreibt wirklich diese Namen. */
    const bauplan = dateisystem.readFileSync(
        pfad.join(projekt, "tools", "Lootbox-Blender.py"), "utf8");
    if (bauplan.indexOf("lootbox-{}{}.png") === -1) {
        throw new Error("Lootbox-Blender.py schreibt andere Dateinamen als"
            + " der Bildschirm-Code erwartet");
    }
    if (bauplan.indexOf("\"-pech\"") === -1) {
        throw new Error("Lootbox-Blender.py kennt den Unglueckswuerfel nicht");
    }

    /* Das Fragezeichen darf NICHT wieder im Code auftauchen: Es steckt in
       der Gravur, und zwei Zeichen uebereinander waeren doppelt. */
    if (quelle.indexOf("wuerfel-zeichen") !== -1) {
        throw new Error("das aufgemalte Fragezeichen ist zurueck - seit"
            + " v0.24.0 ist es eingraviert");
    }
});

/*
 * Und die Gegenrichtung: Jede Art braucht ihre Klasse, sonst greift die
 * Stildatei nicht. `_figurKlasse` ist die einzige Stelle, die sie vergibt.
 */
pruefe("_figurKlasse vergibt Marker- und Art-Klasse (v0.121, erweitert v0.122)", () => {
    const quelle = dateisystem.readFileSync(
        pfad.join(jsOrdner, "team-schach-brett.js"), "utf8");

    for (const art of ["bauer", "springer", "laeufer", "turm", "dame", "koenig"]) {
        if (quelle.indexOf("\"" + art + "\"") === -1) {
            throw new Error("team-schach-brett.js kennt die Art " + art
                + " nicht — _figurKlasse muss sie vergeben");
        }
        if (stil.indexOf(".figur-art-" + art) === -1) {
            throw new Error("die Stildateien haben keine Regel fuer .figur-art-" + art);
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
        throw new Error("die Stildateien haben keine Regel fuer .figur-bild");
    }
});
/*
 * JEDE BENUTZTE FARB-VARIABLE MUSS ES AUCH GEBEN (seit v0.30.0).
 *
 * ANLASS: v0.30.0 faerbt die Zugspur ueber drei NEUE Variablen
 * (`--spur-kante` und Geschwister). Ein Tippfehler im Namen faellt in CSS
 * nicht auf — der Browser wirft die ganze Eigenschaft still weg. Die Kachel
 * haette dann einfach keine Kante mehr, und niemand wuesste, warum.
 *
 * Geprueft wird nur, was OHNE Ausweichwert benutzt wird: `var(--x, 12px)`
 * traegt seinen Ersatz selbst und darf von aussen kommen (das JS setzt ein
 * paar Werte zur Laufzeit, etwa `--wirkung-dauer`).
 */
pruefe("Jede benutzte CSS-Variable ohne Ausweichwert ist auch definiert", () => {

    const definiert = new Set();
    for (const treffer of stil.matchAll(/(--[a-z0-9-]+)\s*:/g)) {
        definiert.add(treffer[1]);
    }

    const fehlend = new Set();
    for (const treffer of stil.matchAll(/var\(\s*(--[a-z0-9-]+)\s*([,)])/g)) {
        if (treffer[2] === ")" && !definiert.has(treffer[1])) {
            fehlend.add(treffer[1]);
        }
    }

    if (fehlend.size > 0) {
        throw new Error("die Stildateien benutzen Variablen, die es nicht gibt: "
            + [...fehlend].join(", "));
    }
});

/*
 * DIE ECKEN DES KREUZ-BRETTS TRAGEN IHRE EIGENE KLASSE (seit v0.31.0).
 *
 * Sie sehen aus wie ein Riss, sind aber keiner: Ein Riss ist eine kaputte
 * Kachel, die Ecke gehoert gar nicht zum Brett. Wer `feld-ausserhalb` in
 * einer der beiden Zeichen-Dateien streicht oder in der Stildatei vergisst,
 * bekommt im 3D-Look wieder Plattenraender um nichts — genau der gemeldete
 * Fehler. Geprueft wird deshalb an allen drei Stellen zugleich.
 */
pruefe("Die Kreuz-Ecken tragen feld-ausserhalb (v0.31.0)", () => {

    for (const datei of ["team-schach-brett.js", "team-schach-uebersicht.js"]) {
        const quelle = dateisystem.readFileSync(pfad.join(jsOrdner, datei), "utf8");
        if (quelle.indexOf("feld-ausserhalb") === -1) {
            throw new Error(datei + " vergibt die Klasse feld-ausserhalb nicht"
                + " mehr — die Kreuz-Ecken saehen wieder wie Kacheln aus");
        }
    }

    if (stil.indexOf(".feld-ausserhalb") === -1) {
        throw new Error("die Stildateien haben keine Regel fuer .feld-ausserhalb");
    }
    if (stil.indexOf("body.design-3d .feld-ausserhalb") === -1) {
        throw new Error("die Stildateien nehmen der Ecke im 3D-Look die Kachel nicht"
            + " — ohne body.design-3d .feld-ausserhalb bleibt die Kante stehen");
    }
});

/*
 * DIE DREI BEITRITTS-KNÖPFE HABEN DIESELBE FORM (seit v0.41.0).
 *
 * Sie sollen gleich aussehen und nur die Farbe unterscheiden. Das haelt
 * kein Test „am Bild" fest — was sich pruefen laesst, ist der Vertrag
 * dahinter: EINE gemeinsame Klasse plus drei Farbklassen, im Code vergeben
 * und in der Stildatei definiert. Wer eine davon streicht, bekommt einen
 * Knopf ohne Farbe oder eine Farbe ohne Knopf.
 */
pruefe("Die drei Beitritts-Knoepfe teilen sich eine Klasse (v0.41.0)", () => {
    const quelle = dateisystem.readFileSync(
        pfad.join(jsOrdner, "team-schach.js"), "utf8");

    for (const klasse of ["team-knopf", "team-knopf-zufall"]) {
        if (quelle.indexOf(klasse) === -1) {
            throw new Error("team-schach.js vergibt " + klasse + " nicht mehr");
        }
        if (stil.indexOf("." + klasse) === -1) {
            throw new Error("die Stildateien haben keine Regel fuer ." + klasse);
        }
    }

    /* Die beiden Seitenfarben entstehen im Code aus der Farbe der Seite
       ("team-knopf-" + farbe) — geprueft wird deshalb die Stildatei. */
    for (const farbe of ["weiss", "schwarz"]) {
        if (stil.indexOf(".team-knopf-" + farbe) === -1) {
            throw new Error("die Stildateien haben keine Regel fuer .team-knopf-" + farbe);
        }
    }
});

/*
 * DIE FESTE SEITE HAENGT AN GENAU EINER STELLE (seit v0.52.0).
 *
 * Nutzer-Ansage 24.08.2026: „Das Match an sich soll nicht mehr scrollbar
 * sein." Gebaut ist das als Koerper-Klasse `partie-fest`, gesetzt vom
 * DRITTEN Wert von `TABS.rundeSetzen` — und zwar nur dort, wo die offene
 * Partie gezeichnet wird.
 *
 * WAS SCHIEFGEHEN KANN, und wogegen dieser Waechter steht:
 *
 *   - Ein zweiter Bildschirm ruft `rundeSetzen(..., true, true)`. Dann bleibt
 *     die feste Seite an, wo sie nicht hingehoert, und alles unterhalb des
 *     Fensterrands ist weg — ohne Rollbalken, der es verriete.
 *   - Die Klasse verschwindet aus der Stildatei oder aus `tabs.js`. Dann
 *     rollt das Match wieder, und `_brettEinpassen` steigt still aus (es
 *     prueft genau diese Klasse) — es faellt also niemandem auf.
 */
pruefe("Die feste Seite haengt an genau einer Stelle (v0.52.0)", () => {
    const tabs = dateisystem.readFileSync(pfad.join(jsOrdner, "tabs.js"), "utf8");

    if (tabs.indexOf("classList.toggle(\"partie-fest\"") === -1) {
        throw new Error("tabs.js setzt die Klasse partie-fest nicht mehr");
    }
    if (stil.indexOf("body.partie-fest") === -1) {
        throw new Error("die Stildateien haben keine Regel fuer body.partie-fest —"
            + " das Match rollt wieder");
    }

    /* Wer ruft mit drittem Wert? Ueber ALLE Programmdateien gesucht, nicht
       nur in der einen, in der er heute steht. Nur `tabs.js` bleibt aussen
       vor: Dort steht die Vereinbarung selbst (`rundeSetzen(tabId, offen,
       fest)`), und die sieht fuer jedes Muster aus wie ein Aufruf. Bildschirme
       zeichnet diese Datei keine. */
    let stellen = 0;
    for (const name of dateisystem.readdirSync(jsOrdner)) {
        if (!name.endsWith(".js") || name === "tabs.js") {
            continue;
        }
        const quelle = dateisystem.readFileSync(pfad.join(jsOrdner, name), "utf8");
        const treffer = quelle.match(/rundeSetzen\([^)]*,[^,)]*,[^)]*\)/g) || [];
        stellen += treffer.length;
    }

    if (stellen !== 1) {
        throw new Error("rundeSetzen wird an " + stellen + " Stellen mit"
            + " drittem Wert gerufen, erwartet ist genau eine (die offene"
            + " Partie) — die Definition in tabs.js zaehlt nicht mit");
    }

    /* Und das Brett muss sich einpassen, sonst nuetzt die feste Seite nichts. */
    const brettDatei = dateisystem.readFileSync(
        pfad.join(jsOrdner, "team-schach-brett.js"), "utf8");
    if (brettDatei.indexOf("partie-fest") === -1) {
        throw new Error("_brettEinpassen prueft die Klasse partie-fest nicht"
            + " mehr — es wuerde auch auf rollenden Bildschirmen rechnen");
    }
});

/* ------------------------------------------------------------------ *
 * DER SERVICE WORKER (sw.js, seit v0.106.0 — ROADMAP Gruppe L, Punkt 45)
 *
 * Sieben Wächter. Der wertvollste ist der dritte: Er vergleicht die Liste im
 * Worker mit dem, was wirklich im Projekt liegt. Wer eine Programmdatei
 * ergänzt und den Worker vergisst, merkt das sonst NIE beim Bauen — online
 * läuft alles, und erst der Nutzer ohne Netz steht vor einer halben App.
 *
 * NEUE PRUEFUNGEN GEHOEREN VOR DEN FAZIT-BLOCK. Alles hinter `process.exit`
 * läuft nie (Haus-Lehre).
 * ------------------------------------------------------------------ */

const swPfad = pfad.join(projekt, "sw.js");
const sw = dateisystem.readFileSync(swPfad, "utf8");

pruefe("sw.js ist syntaktisch fehlerfrei", () => {
    /* Wie bei den Programmdateien: übersetzen, nicht ausführen. Ein Service
       Worker lässt sich hier ohnehin nicht starten (es gibt kein `self`,
       kein `caches`) — ein Tippfehler in ihm bliebe sonst aber bis zum
       ersten Aufruf im Browser unentdeckt, und dort meldet er sich nur in
       der Entwickler-Konsole. */
    new vm.Script(sw, { filename: "sw.js" });
});

pruefe("sw.js nennt dieselbe Version wie konfig.js und CHANGELOG.md", () => {
    /*
     * DIE HAUSREGEL: Die Version des Zwischenspeichers zieht im SELBEN
     * Schritt mit der App-Version mit. Bleibt sie stehen, behalten die
     * Geräte tagelang den alten Stand — der häufigste Auslieferungsfehler
     * im Haus. Deshalb prüft dieser Wächter alle drei Stellen gegeneinander.
     */
    const konfig = dateisystem.readFileSync(pfad.join(jsOrdner, "konfig.js"), "utf8");
    const treffer = konfig.match(/APP_VERSION:\s*"([^"]+)"/);
    if (!treffer) {
        throw new Error("APP_VERSION nicht in js/konfig.js gefunden");
    }
    const version = treffer[1];

    const imWorker = sw.match(/blunderluck-v(\d+\.\d+\.\d+)/g) || [];
    if (imWorker.length === 0) {
        throw new Error("in sw.js steht kein Speichername der Form"
            + " blunderluck-v0.0.0 — wie heisst der Zwischenspeicher?");
    }
    if (imWorker.length > 1) {
        throw new Error("die Version steht " + imWorker.length + " mal in"
            + " sw.js (" + imWorker.join(", ") + ") — sie gehoert an GENAU"
            + " EINE Stelle, zwei Quellen laufen auseinander");
    }
    if (imWorker[0] !== "blunderluck-v" + version) {
        throw new Error("sw.js nennt " + imWorker[0] + ", konfig.js aber v"
            + version + " — beim naechsten Ausliefern behielten die Geraete"
            + " den alten Stand");
    }

    const changelog = dateisystem.readFileSync(pfad.join(projekt, "CHANGELOG.md"), "utf8");
    if (changelog.indexOf("v" + version) === -1) {
        throw new Error("v" + version + " fehlt in CHANGELOG.md");
    }
});

pruefe("sw.js legt genau die Dateien in den Zwischenspeicher, die es gibt", () => {
    /*
     * DER WICHTIGSTE WAECHTER DIESES BLOCKS.
     *
     * Verglichen wird in BEIDE Richtungen: Was im Projekt liegt, muss im
     * Worker stehen (sonst fehlt es offline), und was im Worker steht, muss
     * es geben (sonst scheitert `addAll` — und mit ihm die ganze
     * Installation, weil `addAll` alles oder nichts nimmt).
     *
     * Die Erwartung kommt aus dem Dateisystem, nicht aus einer zweiten
     * Liste: Eine Liste, die man von Hand nachziehen muss, ist genau das
     * Problem, das hier gefangen werden soll.
     */
    const block = sw.match(/const DATEIEN = \[([\s\S]*?)\n\];/);
    if (!block) {
        throw new Error("in sw.js gibt es keine Liste `const DATEIEN = [ ... ];`");
    }

    const genannt = new Set((block[1].match(/"([^"]+)"/g) || [])
        .map((text) => text.slice(1, -1).replace(/^\.\//, "")));

    /* Die Ordner-Adresse selbst — so fragt der Browser die Seite an, wenn
       niemand `index.html` tippt. */
    if (!genannt.has("")) {
        throw new Error("in DATEIEN fehlt \"./\" — der Aufruf ohne Dateinamen"
            + " (genau der aus dem Manifest) waere offline nicht bedienbar");
    }
    genannt.delete("");

    const erwartet = new Set(["index.html", "manifest.webmanifest", "icon.svg"]);
    for (const ordner of ["icons", "css", "js", "img/figuren", "img/lootboxen"]) {
        for (const name of dateisystem.readdirSync(pfad.join(projekt, ordner))) {
            erwartet.add(ordner + "/" + name);
        }
    }

    const fehlt = [...erwartet].filter((name) => !genannt.has(name)).sort();
    const zuviel = [...genannt].filter((name) => !erwartet.has(name)).sort();

    if (fehlt.length > 0) {
        throw new Error("sw.js kennt " + fehlt.length + " Datei(en) nicht: "
            + fehlt.join(", ") + " — sie fehlten im Offline-Betrieb");
    }
    if (zuviel.length > 0) {
        throw new Error("sw.js nennt " + zuviel.length + " Datei(en), die es"
            + " nicht gibt: " + zuviel.join(", ") + " — daran scheitert die"
            + " ganze Installation (addAll nimmt alles oder nichts)");
    }
});

pruefe("sw.js bedient nur GET und nur die eigene Herkunft (Firebase bleibt frisch)", () => {
    /*
     * WOGEGEN DIESER WAECHTER STEHT: Käme der gemeinsame Spielstand je aus
     * dem Zwischenspeicher, zeigte das Brett einen Zug, den es nicht mehr
     * gibt — und niemand sähe, woher das kommt. Firebase liegt unter einer
     * FREMDEN Herkunft; entscheidend ist deshalb, dass der Worker Fremdes
     * gar nicht erst anfasst (kein `respondWith`).
     *
     * Geprüft wird die Reihenfolge im Quelltext: Beide Ausstiege müssen VOR
     * dem ersten `respondWith` stehen. Ein Ausstieg dahinter käme zu spät.
     */
    /*
     * Gesucht wird im CODE des fetch-Horchers — ohne Kommentare und ohne
     * den Rest der Datei. Beides ist noetig: Der Kopf der Datei erklaert
     * `respondWith` in Worten, und die Kommentare im Horcher selbst
     * ebenfalls. Ein Wort in einem Kommentar hat aber keine Reihenfolge,
     * die etwas bedeutet — sonst stuende jeder Ausstieg scheinbar zu spaet.
     */
    const swCode = sw.replace(/\/\*[\s\S]*?\*\//g, "");
    const horcher = swCode.slice(swCode.indexOf("self.addEventListener(\"fetch\""));

    const methode = horcher.indexOf("anfrage.method !== \"GET\"");
    const herkunft = horcher.indexOf("adresse.origin !== self.location.origin");
    const antwort = horcher.indexOf("respondWith");

    if (methode === -1) {
        throw new Error("sw.js prueft die Methode nicht — ein PUT/PATCH an"
            + " Firebase darf nie aus dem Zwischenspeicher beantwortet werden");
    }
    if (herkunft === -1) {
        throw new Error("sw.js vergleicht die Herkunft nicht mit"
            + " self.location.origin — Fremdes muss ungefiltert ans Netz");
    }
    if (antwort === -1) {
        throw new Error("sw.js beantwortet gar nichts (kein respondWith)");
    }
    if (methode > antwort || herkunft > antwort) {
        throw new Error("die beiden Ausstiege stehen HINTER dem ersten"
            + " respondWith — dann greifen sie nicht mehr");
    }

    /* Und die Datenbank-Adresse selbst hat im Worker nichts verloren. */
    const konfig = dateisystem.readFileSync(pfad.join(jsOrdner, "konfig.js"), "utf8");
    const basis = (konfig.match(/firebaseBasis:\s*"https:\/\/([^"/]+)"/) || [])[1];
    if (basis && sw.indexOf(basis) !== -1) {
        throw new Error("die Firebase-Adresse steht in sw.js — der"
            + " gemeinsame Stand darf nie zwischengespeichert werden");
    }
});

pruefe("sw.js bevorzugt beim Bauen (localhost) das Netz", () => {
    /*
     * Ohne diesen Schalter sieht man beim Entwickeln nach jeder Änderung die
     * alte Fassung: Der Zwischenspeicher antwortet schneller, als man neu
     * laden kann. Erkannt wird der Bau-Rechner am Rechnernamen.
     */
    if (sw.indexOf("BEIM_BAUEN") === -1) {
        throw new Error("in sw.js gibt es keinen Schalter BEIM_BAUEN");
    }
    if (sw.indexOf("self.location.hostname") === -1) {
        throw new Error("BEIM_BAUEN fragt nicht self.location.hostname ab");
    }
    for (const name of ["\"localhost\"", "\"127.0.0.1\""]) {
        if (sw.indexOf(name) === -1) {
            throw new Error("BEIM_BAUEN kennt " + name + " nicht — unter"
                + " diesem Namen laeuft der lokale Server");
        }
    }
});

pruefe("sw.js loescht nur seine EIGENEN alten Zwischenspeicher", () => {
    /*
     * DIE FALLE: Ein Zwischenspeicher gehoert der HERKUNFT, nicht dem
     * Ordner. Unter `up-birdo.github.io` liegen mehrere Apps des Hauses —
     * ein „loesche alles ausser meinem" beim Aktivieren zoege den
     * Nachbar-Apps ihren Speicher unter den Fuessen weg, und zwar still.
     */
    if (sw.indexOf("startsWith(\"blunderluck-\")") === -1) {
        throw new Error("beim Aufraeumen fehlt die Einschraenkung auf"
            + " Namen, die mit blunderluck- beginnen — der Worker wuerde"
            + " fremden Apps derselben Herkunft den Speicher loeschen");
    }
    if (sw.indexOf("caches.delete") === -1) {
        throw new Error("sw.js raeumt alte Zwischenspeicher gar nicht weg");
    }
});

pruefe("app.js meldet den Service Worker abgesichert an", () => {
    /*
     * Ohne Anmeldung ist der beste Worker wirkungslos. Zwei Sperren gehoeren
     * dazu: alte Browser ohne `serviceWorker` und der Aufruf per Doppelklick
     * (`file://`) — dort wirft `register`, und der Fehlerstreifen aus
     * v0.105.0 erschiene bei JEDEM lokalen Aufruf.
     */
    const app = dateisystem.readFileSync(pfad.join(jsOrdner, "app.js"), "utf8");

    if (app.indexOf("navigator.serviceWorker.register(\"sw.js\")") === -1) {
        throw new Error("js/app.js meldet sw.js nicht an — die App bleibt"
            + " ohne Netz unbenutzbar und wird nicht als installierbar angeboten");
    }
    if (app.indexOf("\"serviceWorker\" in navigator") === -1) {
        throw new Error("die Anmeldung ist nicht gegen Browser ohne"
            + " Service Worker abgesichert");
    }
    if (app.indexOf("location.protocol === \"file:\"") === -1) {
        throw new Error("die Anmeldung ist nicht gegen den Aufruf per"
            + " file:// abgesichert — dort wirft register()");
    }
});

/*
 * `innerHTML` DARF NUR LEEREN — NIEMALS TEXT SETZEN (seit 01.09.2026).
 *
 * DER FALL, DEN DAS VERHINDERT (Stored XSS): Ein Spieler nennt sich
 * `<img src=x onerror=...>`. Landet dieser Name irgendwo über `innerHTML` im
 * Baum, führt JEDES fremde Gerät den Code aus, das die Rangliste oder eine
 * Partie öffnet — die Namen kommen aus der gemeinsamen Datenbank. Über
 * `textContent` (bzw. `_element(...)`, das nichts anderes tut) kann derselbe
 * Name nichts anrichten: Dort ist er Text und bleibt Text.
 *
 * WARUM ALS TEST UND NICHT ALS DURCHSICHT: Am 30.08.2026 wurde genau das
 * einmal von Hand geprüft (Prüfliste aus der Reel-Sammlung, Ergebnis sauber).
 * Eine Durchsicht gilt aber nur für den Tag, an dem sie stattfand; seither
 * sind neun Versionen dazugekommen. Diese Prüfung gilt für jede weitere.
 *
 * ERLAUBT BLEIBT `element.innerHTML = ""` — das Leeren eines Behälters vor
 * dem Neuzeichnen. Es setzt nichts ein und ist im ganzen Projekt die einzige
 * Verwendung (heute 15 Stellen in 11 Dateien).
 */
pruefe("innerHTML leert nur, es setzt nichts ein (Stored XSS)", () => {
    const erlaubt = /\.innerHTML\s*=\s*""\s*;/;
    const funde = [];

    for (const name of dateien) {
        const quelle = dateisystem.readFileSync(
            pfad.join(jsOrdner, name), "utf8");

        quelle.split("\n").forEach((zeile, nummer) => {
            if (zeile.indexOf("innerHTML") === -1) {
                return;
            }
            if (erlaubt.test(zeile)) {
                return;
            }
            funde.push(name + ":" + (nummer + 1) + "  " + zeile.trim());
        });
    }

    if (funde.length > 0) {
        throw new Error("innerHTML wird nicht nur zum Leeren benutzt — jeder"
            + " Nutzertext gehoert ueber textContent in den Baum:\n        "
            + funde.join("\n        "));
    }
});

console.log(anzahlOk + " ok, " + anzahlFehler + " Fehler");
process.exit(anzahlFehler === 0 ? 0 : 1);
