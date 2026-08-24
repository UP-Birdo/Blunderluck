/*
 * test-rangliste.js — Regressionstests der Gesamtwertung.
 *
 * Geladen werden die ECHTEN Dateien js\rangliste.js, js\spieler.js und die
 * Schach-Dateien. Geprüft wird nur der rechnende Teil; der Bildschirm-Teil
 * braucht einen Browser und steht in der Prüfliste in docs\DEPLOYMENT.md.
 *
 * Aufruf: siehe tests\README.md
 */

const pfad = require("path");

globalThis.SPIELER = require(pfad.join(__dirname, "..", "js", "spieler.js"));
globalThis.SCHACH_VARIANTEN = require(pfad.join(__dirname, "..", "js", "schach-varianten.js"));
globalThis.SCHACH = require(pfad.join(__dirname, "..", "js", "schach.js"));
globalThis.SCHACH_RUNDE = require(pfad.join(__dirname, "..", "js", "schach-runde.js"));
globalThis.SCHACH_TAFEL = require(pfad.join(__dirname, "..", "js", "schach-tafel.js"));
/* Seit v0.27.0 fragt die Rangliste, ob ein Computer mitgespielt hat. */
globalThis.SCHACH_BOT = require(pfad.join(__dirname, "..", "js", "schach-bot.js"));
const RANGLISTE = require(pfad.join(__dirname, "..", "js", "rangliste.js"));

const SPIELER = globalThis.SPIELER;
const SCHACH_RUNDE = globalThis.SCHACH_RUNDE;
const SCHACH_TAFEL = globalThis.SCHACH_TAFEL;

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

/* Drei Mitspieler in der Spielerliste, noch ohne Punkte. */
function spielerMitDrei() {
    let daten = SPIELER.leereDaten(1000);
    daten = SPIELER.spielerHinzufuegen(daten, "Anna", "id-anna", 1000);
    daten = SPIELER.spielerHinzufuegen(daten, "Bert", "id-bert", 1000);
    daten = SPIELER.spielerHinzufuegen(daten, "Cem", "id-cem", 1000);
    return daten;
}

/* Eine beendete Partie mit dem angegebenen Ergebnis. */
function beendetePartie(tafel, titel, ergebnis, zeitpunkt) {
    const angelegt = SCHACH_TAFEL.partieAnlegen(tafel, "standard", titel, zeitpunkt);

    let partie = SCHACH_RUNDE.teamBeitreten(angelegt.partie, "id-anna", "weiss", zeitpunkt);
    partie = SCHACH_RUNDE.teamBeitreten(partie, "id-bert", "schwarz", zeitpunkt);
    partie.ergebnis = ergebnis;
    partie.laeuft = false;

    return SCHACH_TAFEL.partieEinsetzen(angelegt.tafel, partie, zeitpunkt);
}

/* ------------------------------------------------------------------ *
 * Schachpunkte
 * ------------------------------------------------------------------ */

pruefe("Ohne beendete Partie gibt es keine Schachpunkte", () => {
    const tafel = SCHACH_TAFEL.partieAnlegen(
        SCHACH_TAFEL.leereTafel(1000), "standard", "Laeuft noch", 2000).tafel;

    gleich(Object.keys(RANGLISTE.schachPunkte(tafel)).length, 0, "keine Wertung");
});

pruefe("Ein Sieg bringt Sieg- und Teilnahmepunkte", () => {
    const tafel = beendetePartie(SCHACH_TAFEL.leereTafel(1000), "Erste", "weiss", 2000);
    const punkte = RANGLISTE.schachPunkte(tafel);

    gleich(punkte["id-anna"].punkte, RANGLISTE.PUNKTE_SIEG + RANGLISTE.PUNKTE_TEILNAHME,
        "Siegerin");
    gleich(punkte["id-anna"].siege, 1, "ein Sieg");
    gleich(punkte["id-bert"].punkte, RANGLISTE.PUNKTE_TEILNAHME, "Verlierer");
    gleich(punkte["id-bert"].siege, 0, "kein Sieg");
});

pruefe("Unentschieden bringt beiden Seiten dasselbe", () => {
    const tafel = beendetePartie(SCHACH_TAFEL.leereTafel(1000), "Remis", "remis", 2000);
    const punkte = RANGLISTE.schachPunkte(tafel);

    const erwartet = RANGLISTE.PUNKTE_REMIS + RANGLISTE.PUNKTE_TEILNAHME;
    gleich(punkte["id-anna"].punkte, erwartet, "Weiss");
    gleich(punkte["id-bert"].punkte, erwartet, "Schwarz");
    gleich(punkte["id-anna"].remis, 1, "als Remis gezaehlt");
});

pruefe("Mehrere Partien werden zusammengezaehlt", () => {
    let tafel = beendetePartie(SCHACH_TAFEL.leereTafel(1000), "Erste", "weiss", 2000);
    tafel = beendetePartie(tafel, "Zweite", "weiss", 2100);
    tafel = beendetePartie(tafel, "Dritte", "schwarz", 2200);

    const punkte = RANGLISTE.schachPunkte(tafel);
    gleich(punkte["id-anna"].siege, 2, "zwei Siege fuer Anna");
    gleich(punkte["id-bert"].siege, 1, "ein Sieg fuer Bert");
    gleich(punkte["id-anna"].partien, 3, "drei Partien");
    gleich(punkte["id-anna"].punkte,
        2 * RANGLISTE.PUNKTE_SIEG + 3 * RANGLISTE.PUNKTE_TEILNAHME, "Summe Anna");
});

pruefe("Geschlagene Figuren bringen Teilpunkte — auch beim Verlierer", () => {
    let tafel = SCHACH_TAFEL.leereTafel(1000);
    const angelegt = SCHACH_TAFEL.partieAnlegen(tafel, "standard", "Beute", 1000);

    let partie = SCHACH_RUNDE.teamBeitreten(angelegt.partie, "id-anna", "weiss", 1000);
    partie = SCHACH_RUNDE.teamBeitreten(partie, "id-bert", "schwarz", 1000);
    partie = SCHACH_RUNDE.bereitSetzen(partie, "weiss", true, 1000);
    partie = SCHACH_RUNDE.bereitSetzen(partie, "schwarz", true, 1000);

    /* Schwarz nimmt Weiss die Dame ab (Wert 9) und gibt dann auf. */
    partie.verloren.weiss.push("D");
    partie = SCHACH_RUNDE.aufgeben(partie, "schwarz", 1100);

    gleich(SCHACH_RUNDE.beuteWert(partie, "schwarz"), 9, "Beute von Schwarz");
    gleich(SCHACH_RUNDE.beuteWert(partie, "weiss"), 0, "Weiss hat nichts geschlagen");

    tafel = SCHACH_TAFEL.partieEinsetzen(angelegt.tafel, partie, 1100);
    gleich(tafel.chronik[0].beute.schwarz, 9, "steht in der Chronik");

    const punkte = RANGLISTE.schachPunkte(tafel);
    const erwartet = Math.min(
        Math.round(9 * RANGLISTE.PUNKTE_JE_FIGURENWERT),
        RANGLISTE.PUNKTE_BEUTE_HOECHSTENS);

    /* Bert hat verloren, aber die Dame geschlagen. */
    gleich(punkte["id-bert"].beute, erwartet, "Teilpunkte fuer die Beute");
    gleich(punkte["id-bert"].punkte, RANGLISTE.PUNKTE_TEILNAHME + erwartet,
        "Teilnahme plus Beute, kein Sieg");

    /* Anna hat gewonnen, aber nichts geschlagen. */
    gleich(punkte["id-anna"].beute, 0, "keine Beute");
    gleich(punkte["id-anna"].punkte,
        RANGLISTE.PUNKTE_TEILNAHME + RANGLISTE.PUNKTE_SIEG, "Sieg ohne Beute");

    /* Und die Beute ueberholt keinen Sieg. */
    wahr(punkte["id-bert"].punkte < punkte["id-anna"].punkte,
        "der Sieg wiegt schwerer als die Beute");
});

pruefe("Alte Chronik-Eintraege ohne Beute bleiben gueltig", () => {
    /* Eintraege von vor v3.1 kennen das Feld nicht. */
    const tafel = SCHACH_TAFEL.normalisieren({
        partien: {},
        chronik: [{
            id: "p-alt",
            titel: "Von frueher",
            variante: "standard",
            ergebnis: "weiss",
            beendetAm: 500,
            teams: { weiss: ["id-anna"], schwarz: ["id-bert"] }
        }]
    });

    gleich(tafel.chronik[0].beute.weiss, 0, "keine Beute vermerkt");

    const punkte = RANGLISTE.schachPunkte(tafel);
    gleich(punkte["id-anna"].punkte,
        RANGLISTE.PUNKTE_TEILNAHME + RANGLISTE.PUNKTE_SIEG, "Punkte unveraendert");
});

pruefe("Die Punkte bleiben, wenn die Partie geloescht wird", () => {
    /*
     * Der Kern der Chronik: Bis v2.3 rechnete die Rangliste aus den Partien
     * selbst — wer eine beendete Partie loeschte, nahm allen Beteiligten ihre
     * Punkte wieder weg. Genau das darf nicht mehr passieren.
     */
    const tafel = beendetePartie(SCHACH_TAFEL.leereTafel(1000), "Endspiel", "weiss", 2000);

    const vorher = RANGLISTE.schachPunkte(tafel);
    gleich(vorher["id-anna"].punkte, RANGLISTE.PUNKTE_SIEG + RANGLISTE.PUNKTE_TEILNAHME,
        "Anna hat gewonnen");
    gleich(tafel.chronik.length, 1, "ein Chronik-Eintrag");

    /* Partie weg — Punkte bleiben. */
    const id = SCHACH_TAFEL.liste(tafel)[0].id;
    const ohne = SCHACH_TAFEL.partieEntfernen(tafel, id, 2100);
    gleich(SCHACH_TAFEL.anzahl(ohne), 0, "keine Partie mehr");

    const nachher = RANGLISTE.schachPunkte(ohne);
    gleich(nachher["id-anna"].punkte, vorher["id-anna"].punkte, "Annas Punkte bleiben");
    gleich(nachher["id-bert"].punkte, vorher["id-bert"].punkte, "Berts Punkte bleiben");

    /* Und auch ueber Speichern und Laden hinweg. */
    const geladen = SCHACH_TAFEL.normalisieren(JSON.parse(JSON.stringify(ohne)));
    gleich(RANGLISTE.schachPunkte(geladen)["id-anna"].punkte, vorher["id-anna"].punkte,
        "nach dem Neuladen ebenfalls");
});

pruefe("Ein Ergebnis wird nur einmal gezaehlt", () => {
    let tafel = beendetePartie(SCHACH_TAFEL.leereTafel(1000), "Doppelt", "weiss", 2000);
    const partie = SCHACH_TAFEL.liste(tafel)[0];

    /* Dieselbe beendete Partie mehrfach schreiben — etwa weil zwei Geraete
       denselben Stand senden. */
    tafel = SCHACH_TAFEL.partieEinsetzen(tafel, partie, 2100);
    tafel = SCHACH_TAFEL.partieEinsetzen(tafel, partie, 2200);

    gleich(tafel.chronik.length, 1, "trotzdem ein Eintrag");
    gleich(RANGLISTE.schachPunkte(tafel)["id-anna"].partien, 1, "eine Partie gewertet");
});

/* ------------------------------------------------------------------ *
 * Gesamtwertung
 * ------------------------------------------------------------------ */

pruefe("Ohne Spieler ist die Wertung leer", () => {
    gleich(RANGLISTE.gesamt(SPIELER.leereDaten(1000), SCHACH_TAFEL.leereTafel(1000)).length,
        0, "leer");
});

pruefe("Jeder Mitspieler steht in der Wertung, auch ohne Punkte", () => {
    const liste = RANGLISTE.gesamt(spielerMitDrei(), SCHACH_TAFEL.leereTafel(1000));

    gleich(liste.length, 3, "drei Eintraege");
    gleich(liste[0].gesamt, 0, "noch keine Punkte");
});

pruefe("Schachpunkte entscheiden die Reihenfolge", () => {
    const tafel = beendetePartie(SCHACH_TAFEL.leereTafel(1000), "Erste", "weiss", 2000);
    const liste = RANGLISTE.gesamt(spielerMitDrei(), tafel);

    gleich(liste[0].name, "Anna", "Anna vorn");
    gleich(liste[0].schach, RANGLISTE.PUNKTE_SIEG + RANGLISTE.PUNKTE_TEILNAHME, "Schachpunkte");
    gleich(liste[0].gesamt, liste[0].schach, "gesamt = Schachpunkte");
    gleich(liste[1].name, "Bert", "Bert danach");
    gleich(liste[2].name, "Cem", "Cem ohne Partie");
    gleich(liste[2].schach, 0, "keine Schachpunkte");
});

pruefe("Wer aus der Spielerliste entfernt wurde, steht nicht mehr in der Wertung", () => {
    const tafel = beendetePartie(SCHACH_TAFEL.leereTafel(1000), "Erste", "weiss", 2000);
    const ohneAnna = SPIELER.spielerEntfernen(spielerMitDrei(), "id-anna", 1300);
    const liste = RANGLISTE.gesamt(ohneAnna, tafel);

    gleich(liste.length, 2, "zwei uebrig");
    wahr(!liste.some((eintrag) => eintrag.id === "id-anna"), "Anna ist weg");
});

pruefe("Die Erklaerung nennt dieselben Zahlen wie die Rechnung", () => {
    const text = RANGLISTE.erklaerung();

    wahr(text.indexOf(String(RANGLISTE.PUNKTE_SIEG)) !== -1, "Siegpunkte genannt");
    wahr(text.indexOf(String(RANGLISTE.PUNKTE_REMIS)) !== -1, "Remispunkte genannt");
    wahr(text.indexOf(String(RANGLISTE.PUNKTE_TEILNAHME)) !== -1, "Teilnahme genannt");
});

/* ------------------------------------------------------------------ *
 * Der Verlauf eines Spielers (Spielerprofil, seit v3.3)
 * ------------------------------------------------------------------ */

pruefe("Der Verlauf zeigt jede Partie, in der jemand mitgespielt hat", () => {
    let tafel = beendetePartie(SCHACH_TAFEL.leereTafel(1000), "Erste", "weiss", 2000);
    tafel = beendetePartie(tafel, "Zweite", "schwarz", 3000);

    const annas = RANGLISTE.verlauf("id-anna", tafel);
    gleich(annas.length, 2, "beide Partien");

    const cems = RANGLISTE.verlauf("id-cem", tafel);
    gleich(cems.length, 0, "Cem hat nicht mitgespielt");
});

pruefe("Der Verlauf nennt Ausgang, Gegner und Mitspieler", () => {
    const tafel = beendetePartie(SCHACH_TAFEL.leereTafel(1000), "Erste", "weiss", 2000);
    const eintrag = RANGLISTE.verlauf("id-anna", tafel)[0];

    gleich(eintrag.art, "schach", "Art");
    gleich(eintrag.ausgang, "sieg", "Anna spielt Weiss und Weiss gewinnt");
    gleich(eintrag.gegner.join(","), "id-bert", "Gegner");
    gleich(eintrag.mitspieler.length, 0, "allein im Team");

    const berts = RANGLISTE.verlauf("id-bert", tafel)[0];
    gleich(berts.ausgang, "niederlage", "Bert hat verloren");
});

pruefe("Die Punkte im Verlauf ergeben zusammen die Summe der Wertung", () => {
    let tafel = beendetePartie(SCHACH_TAFEL.leereTafel(1000), "Erste", "weiss", 2000);
    tafel = beendetePartie(tafel, "Zweite", "remis", 3000);

    const summe = RANGLISTE.schachPunkte(tafel)["id-anna"].punkte;
    const einzeln = RANGLISTE.verlauf("id-anna", tafel)
        .reduce((zwischenstand, eintrag) => zwischenstand + eintrag.punkte, 0);

    gleich(einzeln, summe, "Einzelposten und Summe muessen uebereinstimmen");
});

pruefe("Das Juengste steht oben", () => {
    let tafel = beendetePartie(SCHACH_TAFEL.leereTafel(1000), "Alt", "weiss", 2000);
    tafel = beendetePartie(tafel, "Neu", "weiss", 9000);

    const verlauf = RANGLISTE.verlauf("id-anna", tafel);
    wahr(verlauf[0].wann >= verlauf[1].wann, "absteigend nach Zeitpunkt");
});

pruefe("Ohne Kennung liefert der Verlauf nichts", () => {
    gleich(RANGLISTE.verlauf("", SCHACH_TAFEL.leereTafel()).length,
        0, "leer");
});

/*
 * Partien von vor v3.3 haben weder Startzeit noch Zugzahl. Das Profil darf
 * dann NICHTS erfinden - es laesst die Angabe weg (dauerMs bleibt 0).
 */
pruefe("Alte Chronik-Eintraege liefern keine erfundene Dauer", () => {
    const tafel = SCHACH_TAFEL.normalisieren({
        chronik: [{
            id: "p-alt",
            titel: "Von frueher",
            variante: "standard",
            ergebnis: "weiss",
            beendetAm: 9000,
            teams: { weiss: ["id-anna"], schwarz: ["id-bert"] }
        }]
    });

    const eintrag = RANGLISTE.verlauf("id-anna", tafel)[0];

    gleich(eintrag.dauerMs, 0, "keine Dauer");
    gleich(eintrag.zuege, 0, "keine Zugzahl");
    gleich(eintrag.wann, 9000, "der Zeitpunkt ist aber bekannt");
});

pruefe("Eine neue Partie haelt Beginn und Zugzahl fest", () => {
    const angelegt = SCHACH_TAFEL.partieAnlegen(
        SCHACH_TAFEL.leereTafel(1000), "standard", "Frisch", 2000);

    let partie = SCHACH_RUNDE.teamBeitreten(angelegt.partie, "id-anna", "weiss", 2000);
    partie = SCHACH_RUNDE.teamBeitreten(partie, "id-bert", "schwarz", 2000);
    partie = SCHACH_RUNDE.bereitSetzen(partie, "weiss", true, 2000);
    partie = SCHACH_RUNDE.bereitSetzen(partie, "schwarz", true, 5000);

    gleich(partie.gestartetAm, 5000, "gestartet, als beide bereit waren");

    partie.ergebnis = "weiss";
    partie.laeuft = false;
    partie.zugZaehler = 24;
    partie.geaendertAm = 65000;

    const tafel = SCHACH_TAFEL.partieEinsetzen(angelegt.tafel, partie, 65000);
    const eintrag = RANGLISTE.verlauf("id-anna", tafel)[0];

    gleich(eintrag.dauerMs, 60000, "eine Minute gespielt");
    gleich(eintrag.zuege, 24, "24 Halbzuege");
});

pruefe("Die Dauer wird lesbar ausgegeben", () => {
    /* 30 Sekunden duerfen nicht zu "1 Minute" aufgerundet werden. */
    gleich(RANGLISTE._dauerText(30000), "unter einer Minute", "Sekunden");
    gleich(RANGLISTE._dauerText(59999), "unter einer Minute", "knapp darunter");
    gleich(RANGLISTE._dauerText(60000), "1 Minute", "genau eine");
    gleich(RANGLISTE._dauerText(5 * 60000), "5 Minuten", "Minuten");
    gleich(RANGLISTE._dauerText(90 * 60000), "1 Stunde 30 Minuten", "Stunden");
    gleich(RANGLISTE._dauerText(2 * 60 * 60000), "2 Stunden", "volle Stunden");
    gleich(RANGLISTE._dauerText(26 * 60 * 60000), "1 Tag 2 Stunden", "Tage");
    gleich(RANGLISTE._dauerText(48 * 60 * 60000), "2 Tage", "volle Tage");
});

/* ------------------------------------------------------------------ *
 * Partien gegen den Computer (v0.27.0, Nutzer-Ansage bekraeftigt 24.08.)
 * ------------------------------------------------------------------ */

/* Dieselbe beendete Partie, aber Schwarz ist der Computer. */
function beendeteBotPartie(tafel, titel, ergebnis, zeitpunkt) {
    const angelegt = SCHACH_TAFEL.partieAnlegen(tafel, "standard", titel, zeitpunkt);

    let partie = SCHACH_RUNDE.teamBeitreten(angelegt.partie, "id-anna", "weiss", zeitpunkt);
    partie = SCHACH_RUNDE.teamBeitreten(partie, globalThis.SCHACH_BOT.KENNUNG,
        "schwarz", zeitpunkt);
    partie.ergebnis = ergebnis;
    partie.laeuft = false;

    return SCHACH_TAFEL.partieEinsetzen(angelegt.tafel, partie, zeitpunkt);
}

pruefe("Gegen den Computer gibt es KEINE Punkte — fuer niemanden", () => {
    /*
     * NUTZER-ANSAGE (24.08.2026): „es sollen keine punkte geben wenn man
     * gegen den bot spielt auch der bot soll keine punkte bekommen."
     *
     * Zwei Haelften, und beide muessen stimmen:
     *   - Der MENSCH bekommt nichts. Gegen einen Computer waeren die Punkte
     *     geschenkt, und die gemeinsame Tabelle saegte nichts mehr aus.
     *   - Der COMPUTER bekommt nichts. Er taucht auch gar nicht erst als
     *     Zeile auf, weil die Tabelle sich aus der Spielerliste baut und er
     *     dort keinen Eintrag hat.
     */
    const tafel = beendeteBotPartie(
        SCHACH_TAFEL.leereTafel(1000), "Gegen den Computer", "weiss", 2000);

    const punkte = RANGLISTE.schachPunkte(tafel);

    wahr(!punkte["id-anna"], "Anna bekommt fuer den Sieg gegen den Computer nichts");
    wahr(!punkte[globalThis.SCHACH_BOT.KENNUNG], "und der Computer erst recht nicht");
    gleich(Object.keys(punkte).length, 0, "die Partie taucht in der Wertung gar nicht auf");

    /* Auch nicht ueber die Gesamttabelle — dort steht der Computer nie. */
    const liste = RANGLISTE.gesamt(spielerMitDrei(), tafel);
    const anna = liste.find((eintrag) => eintrag.id === "id-anna");

    gleich(anna.gesamt, 0, "Annas Gesamtpunktzahl bleibt bei null");
    gleich(anna.partien, 0, "und die Partie wird nicht mitgezaehlt");
    wahr(!liste.some((eintrag) => eintrag.id === globalThis.SCHACH_BOT.KENNUNG),
        "der Computer steht nicht in der Tabelle");
});

pruefe("Eine Bot-Partie steht auch nicht im Spielerprofil", () => {
    /* Das Profil erklaert, wie die Summe zustande kommt — es darf deshalb
       keine Partie zeigen, die gar nicht mitgezaehlt wurde. */
    let tafel = beendeteBotPartie(
        SCHACH_TAFEL.leereTafel(1000), "Gegen den Computer", "weiss", 2000);
    tafel = beendetePartie(tafel, "Gegen Bert", "weiss", 2100);

    const verlauf = RANGLISTE.verlauf("id-anna", tafel);

    gleich(verlauf.length, 1, "nur die Partie gegen einen Menschen");
    gleich(verlauf[0].titel, "Gegen Bert", "und zwar die richtige");
});

pruefe("Partien unter Menschen zaehlen unveraendert weiter", () => {
    /* Die Gegenprobe: Die Ausnahme darf NUR den Computer treffen. */
    const tafel = beendetePartie(SCHACH_TAFEL.leereTafel(1000), "Normal", "weiss", 2000);
    const punkte = RANGLISTE.schachPunkte(tafel);

    gleich(punkte["id-anna"].punkte, RANGLISTE.PUNKTE_SIEG + RANGLISTE.PUNKTE_TEILNAHME,
        "Siegerin bekommt ihre Punkte");
    gleich(punkte["id-bert"].punkte, RANGLISTE.PUNKTE_TEILNAHME, "Verlierer auch");
});

console.log(anzahlOk + " ok, " + anzahlFehler + " Fehler");
process.exit(anzahlFehler === 0 ? 0 : 1);
