/*
 * test-schach-tafel.js — Regressionstests der Partien-Sammlung.
 *
 * Geladen werden die ECHTEN Dateien. Der wichtigste Test dieser Datei ist der
 * UMSTIEG: Ein Stand aus der Zeit, als es nur eine einzige Partie gab, muss
 * unverändert weiterlaufen. Wer daran etwas ändert, bricht laufende Partien —
 * deshalb steht dieser Fall hier gleich zu Beginn.
 *
 * Aufruf: siehe tests\README.md
 */

const pfad = require("path");

globalThis.SCHACH_VARIANTEN = require(pfad.join(__dirname, "..", "js", "schach-varianten.js"));
globalThis.SCHACH = require(pfad.join(__dirname, "..", "js", "schach.js"));
globalThis.SCHACH_RUNDE = require(pfad.join(__dirname, "..", "js", "schach-runde.js"));
const SCHACH_TAFEL = require(pfad.join(__dirname, "..", "js", "schach-tafel.js"));

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

/* So sah der gespeicherte Stand bis v1.3 aus: EINE Partie, ohne Sammlung. */
function alterEinzelstand() {
    let runde = SCHACH_RUNDE.leereRunde(1000);
    runde = SCHACH_RUNDE.teamBeitreten(runde, "id-anna", "weiss", 1000);
    runde = SCHACH_RUNDE.teamBeitreten(runde, "id-bert", "schwarz", 1000);
    runde = SCHACH_RUNDE.bereitSetzen(runde, "weiss", true, 1000);
    runde = SCHACH_RUNDE.bereitSetzen(runde, "schwarz", true, 1000);
    runde = SCHACH_RUNDE.ziehen(runde, "id-anna",
        SCHACH.feldNummer("e2"), SCHACH.feldNummer("e4"), "D", "Anna", 1100);

    /* Die alten Stände hatten weder id noch titel. */
    delete runde.id;
    delete runde.titel;
    delete runde.variante;

    return JSON.parse(JSON.stringify(runde));
}

/* ------------------------------------------------------------------ *
 * Umstieg — laufende Partien dürfen nicht verloren gehen
 * ------------------------------------------------------------------ */

pruefe("Eine einzelne Partie von frueher wird zur ersten Partie der Tafel", () => {
    const tafel = SCHACH_TAFEL.normalisieren(alterEinzelstand());

    gleich(SCHACH_TAFEL.anzahl(tafel), 1, "genau eine Partie");

    const partie = SCHACH_TAFEL.partie(tafel, SCHACH_TAFEL.ERSTE_ID);
    wahr(partie !== null, "unter der Kennung start zu finden");
    gleich(partie.titel, "Erste Partie", "hat einen Namen bekommen");
});

pruefe("Beim Umstieg bleibt der Spielstand vollstaendig erhalten", () => {
    const alt = alterEinzelstand();
    const partie = SCHACH_TAFEL.partie(
        SCHACH_TAFEL.normalisieren(alt), SCHACH_TAFEL.ERSTE_ID);

    gleich(partie.stand.brett, alt.stand.brett, "Brett");
    gleich(partie.stand.amZug, "schwarz", "Schwarz ist am Zug");
    gleich(partie.zugZaehler, alt.zugZaehler, "Zugzaehler");
    gleich(partie.laeuft, true, "laeuft weiter");
    gleich(partie.teams.weiss.join(","), "id-anna", "Team Weiss");
    gleich(partie.teams.schwarz.join(","), "id-bert", "Team Schwarz");
    gleich(partie.bereit.weiss, true, "Bereitschaft Weiss");
    gleich(partie.verlauf.length, alt.verlauf.length, "Verlauf");
    gleich(partie.variante, "standard", "klassische Spielart");
});

pruefe("Ein Umstieg passiert nur einmal", () => {
    /* Die umgestellte Tafel darf beim naechsten Laden nicht erneut als
       Einzelpartie gelesen werden. */
    const einmal = SCHACH_TAFEL.normalisieren(alterEinzelstand());
    const zweimal = SCHACH_TAFEL.normalisieren(JSON.parse(JSON.stringify(einmal)));

    gleich(SCHACH_TAFEL.anzahl(zweimal), 1, "immer noch eine Partie");
    gleich(SCHACH_TAFEL.partie(zweimal, SCHACH_TAFEL.ERSTE_ID).zugZaehler, 1, "Zugzaehler");
});

pruefe("Unsinn und Leere ergeben eine leere Tafel", () => {
    gleich(SCHACH_TAFEL.anzahl(null), 0, "null");
    gleich(SCHACH_TAFEL.anzahl("kaputt"), 0, "Text");
    gleich(SCHACH_TAFEL.anzahl({}), 0, "leeres Objekt");
    gleich(SCHACH_TAFEL.anzahl({ datenVersion: 2 }), 0, "Tafel ohne Partien");
});

/* ------------------------------------------------------------------ *
 * Anlegen, einsetzen, entfernen
 * ------------------------------------------------------------------ */

pruefe("Eine neue Partie bekommt Kennung, Titel und Spielart", () => {
    const ergebnis = SCHACH_TAFEL.partieAnlegen(
        SCHACH_TAFEL.leereTafel(1000), "klein", "Schnelle Runde", 2000);

    gleich(SCHACH_TAFEL.anzahl(ergebnis.tafel), 1, "eine Partie");
    gleich(ergebnis.partie.titel, "Schnelle Runde", "Titel");
    gleich(ergebnis.partie.variante, "klein", "Spielart");
    wahr(ergebnis.partie.id !== "", "Kennung vergeben");
    gleich(SCHACH_TAFEL.partie(ergebnis.tafel, ergebnis.partie.id).id,
        ergebnis.partie.id, "unter ihrer Kennung zu finden");
});

pruefe("Zwei Partien im selben Moment bekommen verschiedene Kennungen", () => {
    const erste = SCHACH_TAFEL.partieAnlegen(SCHACH_TAFEL.leereTafel(1000), "standard", "A", 2000);
    const zweite = SCHACH_TAFEL.partieAnlegen(erste.tafel, "standard", "B", 2000);

    wahr(erste.partie.id !== zweite.partie.id, "verschiedene Kennungen");
    gleich(SCHACH_TAFEL.anzahl(zweite.tafel), 2, "beide vorhanden");
});

pruefe("Einsetzen aendert nur die eine Partie", () => {
    /* Genau der Fall, der beim Wuerfel-Quizz einmal Mitspieler geloescht hat:
       Ein Geraet schreibt mit einem veralteten Gesamtstand. */
    const erste = SCHACH_TAFEL.partieAnlegen(SCHACH_TAFEL.leereTafel(1000), "standard", "A", 2000);
    const zweite = SCHACH_TAFEL.partieAnlegen(erste.tafel, "standard", "B", 2100);

    /* Das Geraet kennt nur die erste Partie und aendert sie. */
    const geaendert = SCHACH_RUNDE.umbenennen(erste.partie, "A neu", 2200);
    const zusammen = SCHACH_TAFEL.partieEinsetzen(zweite.tafel, geaendert, 2300);

    gleich(SCHACH_TAFEL.anzahl(zusammen), 2, "die zweite Partie bleibt");
    gleich(SCHACH_TAFEL.partie(zusammen, erste.partie.id).titel, "A neu", "Aenderung uebernommen");
    gleich(SCHACH_TAFEL.partie(zusammen, zweite.partie.id).titel, "B", "die andere unberuehrt");
});

pruefe("Entfernen loescht genau eine Partie", () => {
    const erste = SCHACH_TAFEL.partieAnlegen(SCHACH_TAFEL.leereTafel(1000), "standard", "A", 2000);
    const zweite = SCHACH_TAFEL.partieAnlegen(erste.tafel, "standard", "B", 2100);
    const weniger = SCHACH_TAFEL.partieEntfernen(zweite.tafel, erste.partie.id, 2200);

    gleich(SCHACH_TAFEL.anzahl(weniger), 1, "eine uebrig");
    gleich(SCHACH_TAFEL.partie(weniger, erste.partie.id), null, "die richtige ist weg");
});

/* ------------------------------------------------------------------ *
 * Reihenfolge in der Übersicht
 * ------------------------------------------------------------------ */

pruefe("Laufende Partien stehen oben, beendete unten", () => {
    let tafel = SCHACH_TAFEL.leereTafel(1000);

    const offen = SCHACH_TAFEL.partieAnlegen(tafel, "standard", "Offen", 2000);
    tafel = offen.tafel;

    const laufend = SCHACH_TAFEL.partieAnlegen(tafel, "standard", "Laeuft", 2100);
    tafel = laufend.tafel;

    const fertig = SCHACH_TAFEL.partieAnlegen(tafel, "standard", "Fertig", 2200);
    tafel = fertig.tafel;

    let partie = SCHACH_RUNDE.teamBeitreten(laufend.partie, "id-anna", "weiss", 2100);
    partie = SCHACH_RUNDE.teamBeitreten(partie, "id-bert", "schwarz", 2100);
    partie = SCHACH_RUNDE.bereitSetzen(partie, "weiss", true, 2100);
    partie = SCHACH_RUNDE.bereitSetzen(partie, "schwarz", true, 2100);
    tafel = SCHACH_TAFEL.partieEinsetzen(tafel, partie, 2300);

    let beendet = SCHACH_RUNDE.kopieren(fertig.partie);
    beendet.ergebnis = "weiss";
    tafel = SCHACH_TAFEL.partieEinsetzen(tafel, beendet, 2400);

    const namen = SCHACH_TAFEL.liste(tafel).map((eintrag) => eintrag.titel).join(",");
    gleich(namen, "Laeuft,Offen,Fertig", "Reihenfolge");
});

/* ------------------------------------------------------------------ *
 * Die Einstellungen aus der Auswahl
 * ------------------------------------------------------------------ */

pruefe("Anlegen schreibt die Lootbox-Stufe UND die zwei alten Schalter (v0.71)", () => {
    /*
     * Die Stufe ist die Wahrheit. `regen` und `regenStufe` werden daneben
     * mitgeschrieben, damit ein Geraet mit einer aelteren Fassung im
     * Zwischenspeicher nicht nach ganz anderen Zahlen spielt.
     */
    const angelegt = SCHACH_TAFEL.partieAnlegen(
        SCHACH_TAFEL.leereTafel(1000), "standard", "M", 2000,
        { faehigkeiten: true, lootboxMenge: "viele" });

    gleich(angelegt.partie.regeln.lootboxMenge, "viele", "die Stufe steht in der Partie");
    gleich(angelegt.partie.regeln.regen, true, "der alte Haken zieht mit");
    gleich(angelegt.partie.regeln.regenStufe, 3, "und die alte Reglerstellung auch");

    /* Ohne Stufe entscheiden die zwei alten Angaben — so legt auch alter
       Aufruf-Code an, was er meint. */
    const alt = SCHACH_TAFEL.partieAnlegen(
        SCHACH_TAFEL.leereTafel(1000), "standard", "A", 2000,
        { faehigkeiten: true, regen: true, regenStufe: 5 });

    gleich(alt.partie.regeln.lootboxMenge, "regen", "Haken plus Stufe 5 ist der Regen");

    const ohne = SCHACH_TAFEL.partieAnlegen(
        SCHACH_TAFEL.leereTafel(1000), "standard", "O", 2000,
        { faehigkeiten: true });

    gleich(ohne.partie.regeln.lootboxMenge, "wenig", "ohne Angabe die unterste Stufe");
    gleich(ohne.partie.regeln.regen, false, "und kein Regen");
});

/* ------------------------------------------------------------------ *
 * Vergleich
 * ------------------------------------------------------------------ */

pruefe("Der Vergleich erkennt neue, geaenderte und geloeschte Partien", () => {
    const erste = SCHACH_TAFEL.partieAnlegen(SCHACH_TAFEL.leereTafel(1000), "standard", "A", 2000);
    const zweite = SCHACH_TAFEL.partieAnlegen(erste.tafel, "standard", "B", 2100);

    wahr(SCHACH_TAFEL.inhaltGleich(erste.tafel, SCHACH_TAFEL.kopieren(erste.tafel)), "gleich");
    wahr(!SCHACH_TAFEL.inhaltGleich(erste.tafel, zweite.tafel), "neue Partie erkannt");

    const umbenannt = SCHACH_TAFEL.partieEinsetzen(
        erste.tafel, SCHACH_RUNDE.umbenennen(erste.partie, "A neu", 2200), 2200);
    wahr(!SCHACH_TAFEL.inhaltGleich(erste.tafel, umbenannt), "Aenderung erkannt");

    wahr(!SCHACH_TAFEL.inhaltGleich(zweite.tafel,
        SCHACH_TAFEL.partieEntfernen(zweite.tafel, erste.partie.id, 2300)), "Loeschen erkannt");
});

pruefe("JEDE Einstellung aus der Auswahl kommt in der Partie an (v0.91)", () => {
    /*
     * DER FEHLER, DER DIESEN TEST AUSGELOEST HAT (gefunden 20.08. beim
     * Nachmessen der Meldung #36):
     *
     * `partieAnlegen` kopiert jede Einstellung EINZELN. Bei v0.86
     * (`armeeStaerke`) und v0.87 (`itemVorrat`) wurde diese Zeile vergessen —
     * beide Knopfreihen liessen sich bedienen und taten NICHTS. Aufgefallen
     * ist es nicht, weil die Kachel-Vorschau `TEAM_SCHACH.neueRegeln` direkt
     * liest: Das Bild stimmte, das Spiel nicht.
     *
     * Dieser Test vergleicht deshalb nicht einzelne Felder, sondern geht die
     * uebergebenen Regeln DURCH: Was hineingeht, muss auch ankommen. Wer eine
     * neue Einstellung ergaenzt, faellt hier auf, sobald er sie in
     * `partieAnlegen` vergisst — ohne dass jemand den Test anfassen muesste.
     */
    const regeln = {
        faehigkeiten: true,
        seltenheitZeigen: false,
        pechZeigen: true,
        lootboxMenge: "viele",
        zufallsArmee: true,
        armeeUnterschiedlich: true,
        armeeStaerke: "wenig",
        itemVorrat: "viele",
        einigkeit: false
    };

    const angelegt = SCHACH_TAFEL.partieAnlegen(
        SCHACH_TAFEL.leereTafel(), "faehigkeiten", "Naht", 5000, regeln);

    const partie = angelegt.partie;

    for (const schluessel of Object.keys(regeln)) {
        gleich(partie.regeln[schluessel], regeln[schluessel],
            "Einstellung \"" + schluessel + "\" kommt in der Partie an");
    }

    /* Und die Auswirkung, nicht nur der Wert: Der Item-Vorrat wurde
       ausgelost, weil `itemVorrat` angekommen ist. Verglichen wird gegen die
       Zahl der STUFE, nicht gegen eine getippte — sonst haengt der Test an
       einer Menge, die sich jederzeit aendern darf (v0.105: die Stufe „10"
       ist entfallen, und dieser Vergleich stand noch auf 10). */
    gleich(partie.regeln.itemPool.length,
        SCHACH_VARIANTEN.itemVorratVon(regeln.itemVorrat).anzahl,
        "der Vorrat wurde mit der gewaehlten Groesse ausgelost");
});

console.log(anzahlOk + " ok, " + anzahlFehler + " Fehler");
process.exit(anzahlFehler === 0 ? 0 : 1);
