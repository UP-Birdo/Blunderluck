/*
 * test-schach-bot.js — Regressionstests des Computer-Gegners (seit v0.27.0).
 *
 * Geladen werden die ECHTEN Dateien. Der Bot ist deshalb gut testbar, weil er
 * NICHT würfelt: Seine Wahl wird aus Partie-Kennung und Zugzähler gerechnet
 * (`SCHACH_RUNDE._zufallsWert`) — derselbe Stand ergibt immer denselben Zug.
 *
 * Was hier NICHT geprüft wird: das Anstossen im Bildschirm (Zeitgeber,
 * Senden). Das steht in `test-bildschirm.js`, wo es ein nachgebautes DOM gibt.
 *
 * Aufruf: siehe tests\README.md
 */

const pfad = require("path");

globalThis.SCHACH_VARIANTEN = require(pfad.join(__dirname, "..", "js", "schach-varianten.js"));
globalThis.SCHACH = require(pfad.join(__dirname, "..", "js", "schach.js"));
globalThis.SCHACH_RUNDE = require(pfad.join(__dirname, "..", "js", "schach-runde.js"));
const SCHACH_BOT = require(pfad.join(__dirname, "..", "js", "schach-bot.js"));

const SCHACH = globalThis.SCHACH;
const SCHACH_RUNDE = globalThis.SCHACH_RUNDE;

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

/*
 * Eine laufende Partie: Anna spielt Weiss, der Computer Schwarz.
 *
 * OHNE ANGABE AUF DER STUFE „LEICHT" — das ist genau das Verhalten einer
 * Runde aus v0.27.0, als es nur eine Spielstaerke gab. Die Tests unten
 * rechnen mit einem Halbzug Weitsicht; wer eine hoehere Stufe braucht,
 * setzt sie ausdruecklich.
 */
function botPartie(varianteId, stufeId) {
    let runde = SCHACH_RUNDE.leereRunde(1000, varianteId, "p-test", "Test");
    runde = SCHACH_RUNDE.teamBeitreten(runde, "id-anna", "weiss", 1000);
    runde = SCHACH_BOT.inRundeSetzen(runde, "schwarz", 1000);
    runde = SCHACH_RUNDE.bereitSetzen(runde, "weiss", true, 1000);

    if (stufeId) {
        runde = SCHACH_RUNDE.kopieren(runde);
        runde.regeln.botStufe = stufeId;
    }
    return runde;
}

/* Dieselbe Partie, aber mit einer selbst gesetzten Stellung und Schwarz am
   Zug. `zeilen` sind acht Zeilen zu acht Zeichen, oben ist Schwarz. */
function mitStellung(runde, zeilen) {
    const neu = SCHACH_RUNDE.kopieren(runde);

    neu.stand = SCHACH.standNormalisieren({
        variante: runde.variante,
        brett: zeilen.join(""),
        amZug: "schwarz",
        rochade: ""
    });
    return neu;
}

/* ------------------------------------------------------------------ *
 * Wer ist der Bot?
 * ------------------------------------------------------------------ */

pruefe("Die Kennung des Computers ist bot und sein Name Computer", () => {
    gleich(SCHACH_BOT.KENNUNG, "bot", "Kennung");
    gleich(SCHACH_BOT.NAME, "Computer", "Name");
    wahr(SCHACH_BOT.istBot("bot"), "bot ist der Bot");
    wahr(!SCHACH_BOT.istBot("id-anna"), "Anna ist es nicht");
    wahr(!SCHACH_BOT.istBot(""), "und eine leere Kennung auch nicht");
});

pruefe("istBotPartie erkennt den Computer in beiden Teams", () => {
    const ohne = SCHACH_RUNDE.teamBeitreten(
        SCHACH_RUNDE.leereRunde(1000), "id-anna", "weiss", 1000);
    wahr(!SCHACH_BOT.istBotPartie(ohne), "ohne Computer");

    wahr(SCHACH_BOT.istBotPartie(SCHACH_BOT.inRundeSetzen(ohne, "schwarz", 1000)),
        "Computer in Schwarz");
    wahr(SCHACH_BOT.istBotPartie(SCHACH_BOT.inRundeSetzen(ohne, "weiss", 1000)),
        "Computer in Weiss");
});

pruefe("istBotPartie fragt einen Chronik-Eintrag ohne Spielstand", () => {
    /*
     * DIE RANGLISTE FRAGT MIT CHRONIK-EINTRÄGEN (v0.27.0): Die tragen ihre
     * Teams, aber kein Brett. Ginge die Frage durch `normalisieren`, würde
     * für jede beendete Partie ein Brett aufgebaut — bei jedem Zeichnen.
     */
    wahr(SCHACH_BOT.istBotPartie({ teams: { weiss: ["id-anna"], schwarz: ["bot"] } }),
        "Chronik-Eintrag mit Computer");
    wahr(!SCHACH_BOT.istBotPartie({ teams: { weiss: ["id-anna"], schwarz: ["id-bert"] } }),
        "Chronik-Eintrag ohne Computer");
    wahr(!SCHACH_BOT.istBotPartie(null), "null");
    wahr(!SCHACH_BOT.istBotPartie({}), "leeres Objekt");
});

pruefe("nurNochBot: ein einsamer Computer haelt keine Runde am Leben", () => {
    let runde = botPartie();
    wahr(!SCHACH_BOT.nurNochBot(runde), "solange Anna dabei ist");

    runde = SCHACH_RUNDE.teamVerlassen(runde, "id-anna", 2000);
    wahr(SCHACH_BOT.nurNochBot(runde), "nachdem Anna gegangen ist");

    /* Zwei leere Teams sind ebenfalls menschenleer — so verhielt sich
       `_istVerwaist` schon vor v0.27.0. */
    wahr(SCHACH_BOT.nurNochBot(SCHACH_RUNDE.leereRunde(1000)), "leere Runde");
});

pruefe("botVorgesehen trennt die Absicht von der Tatsache (v0.29.0)", () => {
    /*
     * Zwischen „Spielen" und „Bereit" gibt es eine Computer-Runde OHNE
     * Computer — der Mensch sucht sich in dieser Zeit seine Seite aus. Die
     * beiden Fragen duerfen deshalb nicht dieselbe sein.
     */
    let runde = SCHACH_RUNDE.leereRunde(1000, "", "p-test", "Test");
    runde = SCHACH_RUNDE.kopieren(runde);
    runde.regeln.botStufe = "mittel";

    wahr(SCHACH_BOT.botVorgesehen(runde), "die Runde will einen Computer");
    wahr(!SCHACH_BOT.istBotPartie(runde), "es sitzt aber noch keiner drin");

    const mitBot = SCHACH_BOT.inRundeSetzen(runde, "schwarz", 1000);
    wahr(SCHACH_BOT.botVorgesehen(mitBot), "die Absicht bleibt");
    wahr(SCHACH_BOT.istBotPartie(mitBot), "und jetzt ist sie wahr");

    /* Eine Partie unter Menschen traegt keine Stufe und will keinen. */
    wahr(!SCHACH_BOT.botVorgesehen(SCHACH_RUNDE.leereRunde(1000)), "ohne Stufe");
    wahr(!SCHACH_BOT.botVorgesehen(null), "null");
});

pruefe("Der Computer steigt beim Bereit GEGENUEBER ein (v0.29.0)", () => {
    /*
     * NUTZER-ANSAGE: „sobald ich auf bereit klicke soll der Bot in die
     * andere Gruppe joinen." Beide Seiten werden geprueft — der Mensch darf
     * sich Weiss ODER Schwarz aussuchen.
     */
    for (const meine of ["weiss", "schwarz"]) {
        const gegenueber = (meine === "weiss") ? "schwarz" : "weiss";

        let runde = SCHACH_RUNDE.leereRunde(1000, "", "p-test", "Test");
        runde = SCHACH_RUNDE.kopieren(runde);
        runde.regeln.botStufe = "mittel";
        runde = SCHACH_RUNDE.teamBeitreten(runde, "id-anna", meine, 1000);
        runde = SCHACH_RUNDE.bereitSetzen(runde, meine, true, 1000);

        gleich(runde.laeuft, false, meine + ": allein laeuft nichts");

        const danach = SCHACH_BOT.beiBereitDazuholen(runde, "id-anna", 1100);

        gleich(SCHACH_RUNDE.teamVon(danach, SCHACH_BOT.KENNUNG), gegenueber,
            "Mensch in " + meine + " -> Computer in " + gegenueber);
        gleich(danach.bereit[gegenueber], true, meine + ": der Computer ist bereit");
        gleich(danach.laeuft, true, meine + ": und die Partie beginnt");
    }
});

pruefe("beiBereitDazuholen laesst alles andere in Ruhe", () => {
    /* Eine Partie unter Menschen bekommt keinen Computer angehaengt. */
    let ohne = SCHACH_RUNDE.teamBeitreten(
        SCHACH_RUNDE.leereRunde(1000), "id-anna", "weiss", 1000);
    ohne = SCHACH_RUNDE.bereitSetzen(ohne, "weiss", true, 1000);

    wahr(!SCHACH_BOT.istBotPartie(SCHACH_BOT.beiBereitDazuholen(ohne, "id-anna", 1100)),
        "ohne Stufe kommt kein Computer");

    /* Wer noch keine Seite gewaehlt hat, holt auch niemanden dazu. */
    let ohneSeite = SCHACH_RUNDE.kopieren(SCHACH_RUNDE.leereRunde(1000));
    ohneSeite.regeln.botStufe = "mittel";

    wahr(!SCHACH_BOT.istBotPartie(
        SCHACH_BOT.beiBereitDazuholen(ohneSeite, "id-anna", 1100)),
        "ohne eigene Seite kommt kein Computer");

    /* Und zweimal Druecken holt keinen zweiten. */
    const einmal = botPartie();
    const zweimal = SCHACH_BOT.beiBereitDazuholen(einmal, "id-anna", 1200);

    gleich(zweimal.teams.schwarz.filter((id) => SCHACH_BOT.istBot(id)).length, 1,
        "es bleibt bei EINEM Computer");
});

pruefe("inRundeSetzen meldet die Seite des Computers sofort bereit", () => {
    const runde = botPartie();
    gleich(runde.bereit.schwarz, true, "Schwarz bereit");
    gleich(runde.teams.schwarz[0], "bot", "und der Computer steht drin");

    /* Angepfiffen wird trotzdem erst, wenn der Mensch bereit ist. */
    let ohneMensch = SCHACH_RUNDE.leereRunde(1000);
    ohneMensch = SCHACH_RUNDE.teamBeitreten(ohneMensch, "id-anna", "weiss", 1000);
    ohneMensch = SCHACH_BOT.inRundeSetzen(ohneMensch, "schwarz", 1000);
    gleich(ohneMensch.laeuft, false, "laeuft noch nicht");
    gleich(SCHACH_RUNDE.bereitSetzen(ohneMensch, "weiss", true, 1000).laeuft, true,
        "und laeuft, sobald der Mensch bereit ist");
});

/* ------------------------------------------------------------------ *
 * Wann der Bot zieht — und wann nicht
 * ------------------------------------------------------------------ */

pruefe("Der Computer zieht nur, wenn er wirklich am Zug ist", () => {
    const runde = botPartie();

    /* Weiss beginnt: der Computer wartet. */
    gleich(runde.laeuft, true, "Partie laeuft");
    wahr(!SCHACH_BOT.istAmZug(runde), "Weiss ist dran");
    gleich(SCHACH_BOT.zugWaehlen(runde), null, "also kein Zug");

    const nachWeiss = SCHACH_RUNDE.ziehen(runde, "id-anna",
        SCHACH.feldNummer("e2"), SCHACH.feldNummer("e4"), "D", "Anna", 2000);

    wahr(SCHACH_BOT.istAmZug(nachWeiss), "jetzt ist Schwarz dran");
    wahr(SCHACH_BOT.zugWaehlen(nachWeiss) !== null, "und der Computer waehlt");
});

pruefe("In einer Partie ohne Computer waehlt er nichts", () => {
    let runde = SCHACH_RUNDE.leereRunde(1000, "", "p-test", "Test");
    runde = SCHACH_RUNDE.teamBeitreten(runde, "id-anna", "weiss", 1000);
    runde = SCHACH_RUNDE.teamBeitreten(runde, "id-bert", "schwarz", 1000);
    runde = SCHACH_RUNDE.bereitSetzen(runde, "weiss", true, 1000);
    runde = SCHACH_RUNDE.bereitSetzen(runde, "schwarz", true, 1000);

    const nachWeiss = SCHACH_RUNDE.ziehen(runde, "id-anna",
        SCHACH.feldNummer("e2"), SCHACH.feldNummer("e4"), "D", "Anna", 2000);

    gleich(SCHACH_BOT.zugWaehlen(nachWeiss), null, "kein Computer, kein Zug");
});

pruefe("Eine beendete Partie bewegt der Computer nicht mehr", () => {
    const runde = SCHACH_RUNDE.kopieren(botPartie());
    runde.stand.amZug = "schwarz";
    runde.ergebnis = "weiss";
    runde.laeuft = false;

    gleich(SCHACH_BOT.zugWaehlen(runde), null, "kein Zug nach dem Ende");
    gleich(SCHACH_BOT.ziehen(runde), null, "und auch keine neue Runde");
});

/* ------------------------------------------------------------------ *
 * Die Zugwahl
 * ------------------------------------------------------------------ */

pruefe("Der Computer nimmt die WERTVOLLSTE Figur, die zu holen ist", () => {
    /*
     * Schwarzer Turm auf d5. Erreichbar sind ein weisser Bauer (d7 waere
     * rueckwaerts, also nehmen wir d3) und eine weisse Dame auf a5.
     * Erwartet wird die Dame — 9 Punkte schlagen 1.
     */
    const runde = mitStellung(botPartie(), [
        "....k...",
        "........",
        "........",
        "D..t....",
        "........",
        "...B....",
        "........",
        "....K..."
    ]);

    const wahl = SCHACH_BOT.zugWaehlen(runde);
    wahr(wahl !== null, "es gibt einen Zug");
    gleich(SCHACH.feldName(wahl.von), "d5", "der Turm zieht");
    gleich(SCHACH.feldName(wahl.nach), "a5", "und holt die Dame");
});

pruefe("Ohne etwas zu holen zieht er trotzdem — irgendetwas Gueltiges", () => {
    const runde = mitStellung(botPartie(), [
        "....k...",
        "...t....",
        "........",
        "........",
        "........",
        "........",
        "........",
        "....K..."
    ]);

    const wahl = SCHACH_BOT.zugWaehlen(runde);
    wahr(wahl !== null, "es gibt einen Zug");

    /* Und er ist regelkonform: Das Modell fuehrt ihn aus. */
    const neu = SCHACH_BOT.ziehen(runde, 3000);
    wahr(neu !== null, "der Zug laesst sich ausfuehren");
    gleich(neu.zugZaehler, runde.zugZaehler + 1, "Zugzaehler weitergezaehlt");
    gleich(neu.stand.amZug, "weiss", "und Weiss ist wieder dran");
});

pruefe("Ein Bauer auf der letzten Reihe wird zur DAME, nicht zum Springer", () => {
    const runde = mitStellung(botPartie(), [
        "....k...",
        "........",
        "........",
        "........",
        "........",
        "........",
        ".b......",
        "....K..."
    ]);

    const wahl = SCHACH_BOT.zugWaehlen(runde);
    wahr(wahl !== null, "es gibt einen Zug");
    gleich(SCHACH.feldName(wahl.nach), "b1", "der Bauer geht bis ans Ende");
    gleich(wahl.umwandlung, "D", "und wird zur Dame");

    const neu = SCHACH_BOT.ziehen(runde, 3000);
    gleich(SCHACH.artVon(SCHACH.figurAuf(neu.stand, SCHACH.feldNummer("b1"))), "D",
        "auf b1 steht danach eine Dame");
});

pruefe("Die Umwandlung wiegt schwerer als ein geschlagener Bauer", () => {
    /*
     * Zwei Angebote fuer denselben Bauern auf b2: gerade nach b1 (Umwandlung,
     * Gewinn 8 mal 12 = 96) oder schraeg auf a1, wo ein weisser Bauer steht
     * — der aber auf der letzten Reihe steht, also ebenfalls umwandelt. Damit
     * der Vergleich sauber ist, steht der Bauer eine Reihe hoeher.
     */
    const runde = mitStellung(botPartie(), [
        "....k...",
        "........",
        "........",
        "........",
        "........",
        "B.......",
        ".b......",
        "....K..."
    ]);

    const wahl = SCHACH_BOT.zugWaehlen(runde);
    wahr(wahl !== null, "es gibt einen Zug");
    gleich(SCHACH.feldName(wahl.nach), "b1", "Umwandlung schlaegt den Bauern auf a3");
});

pruefe("Bei gleichwertigen Zuegen wird GERECHNET, nicht gewuerfelt", () => {
    const runde = mitStellung(botPartie(), [
        "....k...",
        "........",
        "........",
        "........",
        "........",
        "........",
        "........",
        "....K..."
    ]);

    const erste = SCHACH_BOT.zugWaehlen(runde);
    wahr(erste !== null, "es gibt einen Zug");

    /* Zehnmal dieselbe Frage, zehnmal dieselbe Antwort — sonst saehe jedes
       Geraet ein anderes Brett (eiserne Regel). */
    for (let lauf = 0; lauf < 10; lauf++) {
        const wieder = SCHACH_BOT.zugWaehlen(runde);
        gleich(wieder.von, erste.von, "Startfeld im Lauf " + lauf);
        gleich(wieder.nach, erste.nach, "Zielfeld im Lauf " + lauf);
    }
});

pruefe("Ein anderer Zugzaehler fuehrt zu einer anderen Wahl", () => {
    /*
     * Sonst zoege der Computer in einer Wiederholungsstellung immer dasselbe
     * und die Partie liefe im Kreis. Gesucht wird nur, DASS sich unter
     * gleichwertigen Zuegen etwas bewegt — welcher Zug es ist, legt der Test
     * bewusst nicht fest.
     */
    const grund = mitStellung(botPartie(), [
        "....k...",
        "........",
        "........",
        "...t....",
        "........",
        "........",
        "........",
        "....K..."
    ]);

    const gesehen = {};

    for (let zaehler = 0; zaehler < 12; zaehler++) {
        const runde = SCHACH_RUNDE.kopieren(grund);
        runde.zugZaehler = zaehler;

        const wahl = SCHACH_BOT.zugWaehlen(runde);
        gesehen[wahl.von + "-" + wahl.nach] = true;
    }

    wahr(Object.keys(gesehen).length > 1,
        "zwoelf Zugzaehler ergeben mehr als einen Zug");
});

/* ------------------------------------------------------------------ *
 * Lootboxen
 * ------------------------------------------------------------------ */

pruefe("Der Computer sammelt eine Lootbox ein, wenn sonst nichts lockt", () => {
    const runde = SCHACH_RUNDE.kopieren(mitStellung(botPartie("faehigkeiten"), [
        "....k...",
        "........",
        "........",
        "...t....",
        "........",
        "........",
        "........",
        "....K..."
    ]));

    /* Eine Box auf d1 — der Turm kommt senkrecht hin. */
    runde.regeln.faehigkeiten = true;
    runde.bonus = [{ feld: SCHACH.feldNummer("d1"), art: "", stufe: "gruen" }];

    const wahl = SCHACH_BOT.zugWaehlen(runde);
    wahr(wahl !== null, "es gibt einen Zug");
    gleich(SCHACH.feldName(wahl.nach), "d1", "er faehrt auf die Lootbox");
});

pruefe("Eine geschlagene Figur wiegt schwerer als eine Lootbox", () => {
    const runde = SCHACH_RUNDE.kopieren(mitStellung(botPartie("faehigkeiten"), [
        "....k...",
        "........",
        "........",
        "T..t....",
        "........",
        "........",
        "........",
        "....K..."
    ]));

    runde.regeln.faehigkeiten = true;
    runde.bonus = [{ feld: SCHACH.feldNummer("d1"), art: "", stufe: "gruen" }];

    const wahl = SCHACH_BOT.zugWaehlen(runde);
    gleich(SCHACH.feldName(wahl.nach), "a5", "der Turm wiegt mehr als die Box");
});

pruefe("Der Computer liest von einer Lootbox NUR das Feld", () => {
    /*
     * ER SPICKT NICHT (Festlegung 2 im Kopf von schach-bot.js): Der Stand
     * steht offen in der Datenbank, ein Bot koennte `pech` mitlesen und
     * jeder Unglueckskiste ausweichen — Wissen, das kein Mensch hat, solange
     * der Haken "Unglueck anzeigen" aus ist.
     *
     * Geprueft wird das an der Wirkung: Dieselbe Stellung, einmal mit einer
     * guten und einmal mit einer Unglueckskiste auf demselben Feld, muss
     * denselben Zug ergeben.
     */
    const grund = SCHACH_RUNDE.kopieren(mitStellung(botPartie("faehigkeiten"), [
        "....k...",
        "........",
        "........",
        "...t....",
        "........",
        "........",
        "........",
        "....K..."
    ]));
    grund.regeln.faehigkeiten = true;

    const gut = SCHACH_RUNDE.kopieren(grund);
    gut.bonus = [{ feld: SCHACH.feldNummer("d1"), art: "", stufe: "gelb" }];

    const boese = SCHACH_RUNDE.kopieren(grund);
    boese.bonus = [{ feld: SCHACH.feldNummer("d1"), art: "stolperstein", pech: true }];

    const wahlGut = SCHACH_BOT.zugWaehlen(gut);
    const wahlBoese = SCHACH_BOT.zugWaehlen(boese);

    gleich(wahlBoese.von, wahlGut.von, "gleiches Startfeld");
    gleich(wahlBoese.nach, wahlGut.nach, "gleiches Zielfeld");
});

pruefe("Boxen auf dem WEG zaehlen mit, nicht nur die auf dem Zielfeld", () => {
    /*
     * Eingesammelt wird auf dem ganzen Weg (`_bonusEinsammeln`). Der Turm auf
     * d5 hat zwei gleich lange Wege; auf dem einen liegen zwei Boxen, auf dem
     * anderen keine.
     */
    const runde = SCHACH_RUNDE.kopieren(mitStellung(botPartie("faehigkeiten"), [
        "....k...",
        "........",
        "........",
        "...t....",
        "........",
        "........",
        "........",
        "....K..."
    ]));

    runde.regeln.faehigkeiten = true;
    runde.bonus = [
        { feld: SCHACH.feldNummer("d4"), art: "", stufe: "gruen" },
        { feld: SCHACH.feldNummer("d3"), art: "", stufe: "gruen" }
    ];

    const wahl = SCHACH_BOT.zugWaehlen(runde);
    gleich(SCHACH.feldName(wahl.von), "d5", "der Turm zieht");
    wahr(SCHACH.reiheVon(wahl.nach, 8) >= SCHACH.reiheVon(SCHACH.feldNummer("d3"), 8),
        "und faehrt ueber beide Boxen nach unten");
});

/* ------------------------------------------------------------------ *
 * Die vier Schwierigkeitsstufen (seit v0.28.0)
 * ------------------------------------------------------------------ */

pruefe("Es gibt genau vier Stufen, und jede kann mehr als die davor", () => {
    gleich(SCHACH_BOT.STUFEN.length, 4, "Zahl der Stufen");

    for (const stufe of SCHACH_BOT.STUFEN) {
        wahr(!!stufe.id, "jede Stufe hat eine Kennung");
        wahr(!!stufe.titel, "jede Stufe hat einen Titel");
        wahr(!!stufe.hinweis, "jede Stufe erklaert sich (fuer das i am Regler)");
    }

    /*
     * DIE LEITER MUSS ECHT SEIN — und „staerker" heisst NICHT nur „tiefer".
     *
     * Beim Bauen stand hier zuerst „jede Stufe rechnet tiefer als die
     * davor". Das war zu eng: „Meister" holt seine Staerke aus der
     * Ruhesuche und der Stellungsbewertung, nicht aus einem vierten
     * Halbzug — gemessen war Tiefe 4 nicht besser, aber deutlich teurer.
     *
     * Geprueft wird deshalb: In KEINER der drei Stellschrauben faellt eine
     * Stufe hinter ihre Vorgaengerin zurueck, und in MINDESTENS EINER ist
     * sie besser. Das laesst offen, WORAUS die Staerke kommt, und schliesst
     * trotzdem aus, dass zwei Stufen dasselbe tun.
     */
    for (let stelle = 1; stelle < SCHACH_BOT.STUFEN.length; stelle++) {
        const davor = SCHACH_BOT.STUFEN[stelle - 1];
        const jetzt = SCHACH_BOT.STUFEN[stelle];
        const wie = jetzt.id + " gegen " + davor.id;

        wahr(jetzt.tiefe >= davor.tiefe, wie + ": die Tiefe faellt nicht");
        wahr(jetzt.ruhe >= davor.ruhe, wie + ": die Ruhesuche faellt nicht");
        wahr(!davor.positionell || jetzt.positionell,
            wie + ": die Stellungsbewertung faellt nicht weg");

        wahr(jetzt.tiefe > davor.tiefe
                || jetzt.ruhe > davor.ruhe
                || (jetzt.positionell && !davor.positionell),
            wie + ": irgendetwas muss besser sein, sonst sind es zwei"
                + " Stufen mit demselben Inhalt");
    }

    /* Die unterste Stufe darf nicht suchen — sonst waere sie nicht mehr
       das Verhalten von v0.27.0. */
    gleich(SCHACH_BOT.STUFEN[0].tiefe, 1, "die unterste Stufe schaut einen Halbzug");
    gleich(SCHACH_BOT.STUFEN[0].ruhe, 0, "und sie rechnet keinen Abtausch zu Ende");
});

pruefe("Unbekannte und fehlende Stufen werden zum Altbestand", () => {
    /*
     * DER WICHTIGSTE TEST DIESES ABSCHNITTS: Eine Runde aus v0.27.0 hat
     * kein Feld `botStufe`. Sie muss weiterspielen wie bisher — also mit
     * einem Halbzug Weitsicht, nicht ploetzlich als Meister.
     */
    gleich(SCHACH_BOT.stufe("").id, SCHACH_BOT.STUFE_ALTBESTAND, "leer");
    gleich(SCHACH_BOT.stufe("gibtesnicht").id, SCHACH_BOT.STUFE_ALTBESTAND, "Unsinn");
    gleich(SCHACH_BOT.stufe(undefined).id, SCHACH_BOT.STUFE_ALTBESTAND, "fehlt");

    const alt = SCHACH_RUNDE.normalisieren({ teams: { weiss: ["id-anna"], schwarz: ["bot"] } });
    gleich(alt.regeln.botStufe, "", "eine Runde ohne Angabe traegt leeren Text");
    gleich(SCHACH_BOT.stufeVon(alt).id, SCHACH_BOT.STUFE_ALTBESTAND,
        "und spielt auf der Altbestands-Stufe");

    /* Und die Vorgabe fuer NEUE Runden ist eine andere. */
    wahr(SCHACH_BOT.STUFE_VORGABE !== SCHACH_BOT.STUFE_ALTBESTAND,
        "neue Runden starten nicht auf der Altbestands-Stufe");
    wahr(SCHACH_BOT.gibtEsStufe(SCHACH_BOT.STUFE_VORGABE), "die Vorgabe gibt es");
    wahr(!SCHACH_BOT.gibtEsStufe("gibtesnicht"), "Unsinn gibt es nicht");
});

pruefe("Die Stufe reist in der Partie mit (additiver Datenvertrag)", () => {
    const roh = {
        teams: { weiss: ["id-anna"], schwarz: ["bot"] },
        regeln: { botStufe: "meister" }
    };

    gleich(SCHACH_RUNDE.normalisieren(roh).regeln.botStufe, "meister", "uebernommen");
    gleich(SCHACH_BOT.stufeVon(roh).id, "meister", "und gedeutet");

    /* Was kein Text ist, wird leer — und die Laenge ist gedeckelt, damit
       ueber den offenen Datenpfad kein Roman in der Partie landet. */
    gleich(SCHACH_RUNDE.normalisieren({ regeln: { botStufe: 42 } }).regeln.botStufe,
        "", "eine Zahl wird verworfen");
    gleich(SCHACH_RUNDE.normalisieren(
        { regeln: { botStufe: "x".repeat(500) } }).regeln.botStufe.length,
        20, "die Laenge ist gedeckelt");
});

pruefe("Jede Stufe liefert in derselben Stellung einen gueltigen Zug", () => {
    for (const stufe of SCHACH_BOT.STUFEN) {
        const runde = mitStellung(botPartie("", stufe.id), [
            "....k...",
            "...t....",
            "......b.",
            "........",
            "........",
            ".....B..",
            "..T.....",
            "....K..."
        ]);

        const wahl = SCHACH_BOT.zugWaehlen(runde);
        wahr(wahl !== null, "Stufe " + stufe.id + " waehlt einen Zug");

        const neu = SCHACH_BOT.ziehen(runde, 3000);
        wahr(neu !== null, "Stufe " + stufe.id + " kann ihn ausfuehren");
        gleich(neu.stand.amZug, "weiss", "Stufe " + stufe.id + ": Weiss ist wieder dran");
    }
});

pruefe("Ab Stufe Mittel verschenkt der Computer keine Figur mehr", () => {
    /*
     * DER UNTERSCHIED, DEN DER NUTZER MERKT.
     *
     * Schwarz kann mit dem Turm d5 den ungedeckten Bauern auf d3 nehmen —
     * oder den auf a5, der von der Dame a1 GEDECKT ist. „Leicht" sieht nur
     * den eigenen Zug und nimmt irgendeinen Bauern; ab „Mittel" rechnet der
     * Bot die Antwort mit und laesst den gedeckten stehen.
     */
    const zeilen = [
        "....k...",
        "........",
        "........",
        "B..t....",
        "........",
        "...B....",
        "........",
        "D...K..."
    ];

    const gedeckt = SCHACH.feldNummer("a5");

    for (const stufe of SCHACH_BOT.STUFEN) {
        const wahl = SCHACH_BOT.zugWaehlen(mitStellung(botPartie("", stufe.id), zeilen));
        wahr(wahl !== null, "Stufe " + stufe.id + " waehlt");

        if (stufe.tiefe >= 2) {
            wahr(wahl.nach !== gedeckt,
                "Stufe " + stufe.id + " faellt nicht auf den gedeckten Bauern herein");
        }
    }

    /* Und die unterste Stufe greift wirklich zu — sonst prueft der Test
       oben nichts, weil der Zug ohnehin niemand machen wuerde. */
    const leicht = SCHACH_BOT.zugWaehlen(mitStellung(botPartie("", "leicht"), zeilen));
    wahr(leicht.nach === gedeckt || SCHACH.feldName(leicht.nach) === "d3",
        "Leicht schlaegt einen der beiden Bauern");
});

pruefe("Auch die tiefen Stufen bleiben vorhersagbar", () => {
    /* Gerechnet statt gewuerfelt gilt auf JEDER Stufe (eiserne Regel) —
       sonst saehe jedes Geraet ein anderes Brett. */
    const runde = mitStellung(botPartie("", "meister"), [
        "....k...",
        "...t....",
        "........",
        "........",
        "........",
        "........",
        "..T.....",
        "....K..."
    ]);

    const erste = SCHACH_BOT.zugWaehlen(runde);
    wahr(erste !== null, "es gibt einen Zug");

    for (let lauf = 0; lauf < 5; lauf++) {
        const wieder = SCHACH_BOT.zugWaehlen(runde);
        gleich(wieder.von, erste.von, "Startfeld im Lauf " + lauf);
        gleich(wieder.nach, erste.nach, "Zielfeld im Lauf " + lauf);
    }
});

pruefe("Das Arbeitsbudget wird je Zug frisch gesetzt", () => {
    /*
     * Ohne das Zuruecksetzen waere der erste Zug einer Partie stark und
     * jeder weitere schwaecher, bis der Bot nur noch ueberschlaegt — ein
     * Fehler, den man beim Spielen nie als solchen erkennen wuerde.
     */
    const runde = mitStellung(botPartie("", "schwer"), [
        "....k...",
        "...t....",
        "........",
        "........",
        "........",
        "........",
        "..T.....",
        "....K..."
    ]);

    SCHACH_BOT.zugWaehlen(runde);
    const nachErstem = SCHACH_BOT._rest;

    SCHACH_BOT.zugWaehlen(runde);
    gleich(SCHACH_BOT._rest, nachErstem,
        "derselbe Zug verbraucht zweimal dasselbe Budget");

    wahr(SCHACH_BOT.stufe("schwer").budget > 0, "die Stufe hat ueberhaupt ein Budget");
});

/* ------------------------------------------------------------------ *
 * Eine ganze Partie
 * ------------------------------------------------------------------ */

pruefe("Vierzig Zuege gegen den Computer laufen ohne Bruch durch", () => {
    /*
     * Der eigentliche Belastungstest: Der Computer bekommt keine gestellte
     * Aufgabe, sondern eine echte Partie — und muss in JEDER Stellung einen
     * gueltigen Zug liefern, bis die Partie zu Ende ist.
     *
     * Weiss spielt dabei stur den ersten Zug aus `SCHACH.alleZuege`; das ist
     * kein guter Gegner, aber ein vollkommen unvorhersehbarer.
     */
    let runde = botPartie();
    let zuege = 0;

    while (runde.laeuft && !runde.ergebnis && zuege < 40) {
        if (runde.stand.amZug === "weiss") {
            const moeglich = SCHACH.alleZuege(runde.stand);
            if (moeglich.length === 0) {
                break;
            }
            const zug = moeglich[0];
            const naechste = SCHACH_RUNDE.ziehen(runde, "id-anna", zug.von, zug.nach,
                zug.umwandlung || "D", "Anna", 2000 + zuege);

            wahr(naechste !== null, "Weiss konnte in Zug " + zuege + " ziehen");
            runde = naechste;
        } else {
            const naechste = SCHACH_BOT.ziehen(runde, 2000 + zuege);
            wahr(naechste !== null, "der Computer konnte in Zug " + zuege + " ziehen");
            runde = naechste;
        }
        zuege++;
    }

    wahr(zuege > 0, "es wurde ueberhaupt gezogen");
    gleich(runde.zugZaehler, zuege, "jeder Zug hat den Zaehler bewegt");
});

console.log(anzahlOk + " ok, " + anzahlFehler + " Fehler");
process.exit(anzahlFehler === 0 ? 0 : 1);
