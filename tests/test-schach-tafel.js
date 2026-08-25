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


/*
 * BEIDE BEREITSCHAFTEN AUF EINMAL (seit v0.62.0).
 *
 * Seit dem zweiten Start-Bildschirm braucht der Anpfiff ZWEI Zusagen je
 * Seite: die zur eigenen Seite (`bereitSetzen`) und die zur Aufstellung
 * (`aufstellungBereitSetzen`). Fast jede Testpartie will einfach eine
 * LAUFENDE Partie herstellen — dafuer steht dieser Helfer, damit nicht in
 * jeder Vorbereitung zwei Aufrufe stehen.
 *
 * Wer die Stufen EINZELN pruefen will, ruft das Modell weiterhin direkt.
 */
function bereitUndAufgestellt(runde, farbe, zeitpunkt) {
    return SCHACH_RUNDE.aufstellungBereitSetzen(
        SCHACH_RUNDE.bereitSetzen(runde, farbe, true, zeitpunkt),
        farbe, true, zeitpunkt);
}
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
    runde = bereitUndAufgestellt(runde, "weiss", 1000);
    runde = bereitUndAufgestellt(runde, "schwarz", 1000);
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
    partie = bereitUndAufgestellt(partie, "weiss", 2100);
    partie = bereitUndAufgestellt(partie, "schwarz", 2100);
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
     * uebergebenen Regeln DURCH: Was hineingeht, muss auch ankommen.
     *
     * DAS REICHTE NICHT — DERSELBE FEHLER KAM v0.28.0 EIN DRITTES MAL
     * (`botStufe`, die Schwierigkeitsstufe des Computers). Der Grund: Die
     * Liste unten ist von Hand geschrieben. Wer eine Einstellung ergaenzt
     * und sie hier NICHT eintraegt, wird auch nicht geprueft — der Test
     * schweigt genau bei dem Fehler, gegen den er gebaut wurde.
     *
     * Seit v0.28.0 steht deshalb die Vollstaendigkeits-Pruefung darunter:
     * Sie liest die Felder aus dem DATENVERTRAG (`leereRunde().regeln`) und
     * verlangt, dass jedes entweder hier steht oder ausdruecklich als
     * abgeleitet vermerkt ist. Vergessen ist damit kein Schweigen mehr,
     * sondern ein roter Test.
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
        einigkeit: false,
        botStufe: "meister"
    };

    /*
     * Felder des Datenvertrags, die NICHT durchgereicht werden — jedes mit
     * seinem Grund. Wer hier etwas eintraegt, sollte es begruenden koennen.
     */
    const abgeleitet = {
        regen: "wird aus lootboxMenge gerechnet",
        regenStufe: "wird aus lootboxMenge gerechnet",
        itemPool: "wird beim Anlegen ausgelost, nicht uebergeben",
        itemAuswahl: "die Eingabe zum Pool, eigener Test weiter unten",
        armeeFassung: "keine Einstellung, sondern die Fassung der Rechnung"
    };

    for (const feld of Object.keys(SCHACH_RUNDE.leereRunde().regeln)) {
        wahr(Object.prototype.hasOwnProperty.call(regeln, feld)
                || Object.prototype.hasOwnProperty.call(abgeleitet, feld),
            "die Einstellung \"" + feld + "\" wird von diesem Test geprueft"
                + " (neu dazugekommen? dann oben in `regeln` eintragen —"
                + " sonst kann sie in partieAnlegen fehlen, ohne dass es"
                + " auffaellt)");
    }

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

/* ------------------------------------------------------------------ *
 * Die eigenen laufenden Partien (v0.9.0, Buendel A Schritt 4)
 * ------------------------------------------------------------------ */

pruefe("eigeneLaufende findet nur laufende Partien mit eigener Beteiligung", () => {
    let tafel = SCHACH_TAFEL.leereTafel(1000);

    /* Partie 1: laeuft, Anna spielt mit. */
    const eins = SCHACH_TAFEL.partieAnlegen(tafel, "standard", "Laeuft", 2000);
    let partieEins = SCHACH_RUNDE.teamBeitreten(eins.partie, "id-anna", "weiss", 2000);
    partieEins = SCHACH_RUNDE.teamBeitreten(partieEins, "id-bert", "schwarz", 2000);
    partieEins = bereitUndAufgestellt(partieEins, "weiss", 2000);
    partieEins = bereitUndAufgestellt(partieEins, "schwarz", 2000);
    tafel = SCHACH_TAFEL.partieEinsetzen(eins.tafel, partieEins, 2000);

    /* Partie 2: laeuft, aber OHNE Anna — fremde Partien ziehen niemanden
       hinein (Entwurf, F9). */
    const zwei = SCHACH_TAFEL.partieAnlegen(tafel, "standard", "Fremd", 3000);
    let partieZwei = SCHACH_RUNDE.teamBeitreten(zwei.partie, "id-cem", "weiss", 3000);
    partieZwei = SCHACH_RUNDE.teamBeitreten(partieZwei, "id-bert", "schwarz", 3000);
    partieZwei = bereitUndAufgestellt(partieZwei, "weiss", 3000);
    partieZwei = bereitUndAufgestellt(partieZwei, "schwarz", 3000);
    tafel = SCHACH_TAFEL.partieEinsetzen(zwei.tafel, partieZwei, 3000);

    /* Partie 3: Anna ist beigetreten, aber die Partie laeuft noch NICHT
       (Wartephase) — kein Wiedereinstiegs-Fall. */
    const drei = SCHACH_TAFEL.partieAnlegen(tafel, "standard", "Wartet", 4000);
    const partieDrei = SCHACH_RUNDE.teamBeitreten(drei.partie, "id-anna", "weiss", 4000);
    tafel = SCHACH_TAFEL.partieEinsetzen(drei.tafel, partieDrei, 4000);

    const anna = SCHACH_TAFEL.eigeneLaufende(tafel, "id-anna");
    gleich(anna.length, 1, "genau eine eigene laufende Partie");
    gleich(anna[0].titel, "Laeuft", "die richtige Partie");

    const bert = SCHACH_TAFEL.eigeneLaufende(tafel, "id-bert");
    gleich(bert.length, 2, "Bert steckt in beiden laufenden");

    gleich(SCHACH_TAFEL.eigeneLaufende(tafel, "id-nix").length, 0,
        "Unbeteiligte bekommen nichts");
});

pruefe("eigeneOffene findet auch die noch wartende Runde (v0.34.0)", () => {
    /*
     * DER UNTERSCHIED ZU `eigeneLaufende`, UND WARUM ES IHN BRAUCHT:
     * Der Startbildschirm bietet seit v0.34.0 den Weg zurueck in die eigene
     * Runde an. Wer eine Runde anlegt, betritt und wieder verlaesst, waehrend
     * sie noch auf den zweiten Spieler wartet, haette sonst KEINEN Weg
     * zurueck — die Liste im Zwischenbildschirm faellt weg, und
     * `eigeneLaufende` verlangt `laeuft === true`.
     */
    let tafel = SCHACH_TAFEL.leereTafel(1000);

    /* Eine wartende Runde mit Anna. */
    const wartet = SCHACH_TAFEL.partieAnlegen(tafel, "standard", "Wartet", 2000);
    const partieWartet = SCHACH_RUNDE.teamBeitreten(wartet.partie, "id-anna", "weiss", 2000);
    tafel = SCHACH_TAFEL.partieEinsetzen(wartet.tafel, partieWartet, 2000);

    /* Eine beendete Runde mit Anna — die zaehlt NICHT. */
    const vorbei = SCHACH_TAFEL.partieAnlegen(tafel, "standard", "Vorbei", 3000);
    let partieVorbei = SCHACH_RUNDE.teamBeitreten(vorbei.partie, "id-anna", "weiss", 3000);
    partieVorbei = SCHACH_RUNDE.teamBeitreten(partieVorbei, "id-bert", "schwarz", 3000);
    partieVorbei = bereitUndAufgestellt(partieVorbei, "weiss", 3000);
    partieVorbei = bereitUndAufgestellt(partieVorbei, "schwarz", 3000);
    partieVorbei = SCHACH_RUNDE.aufgeben(partieVorbei, "weiss", 3100);
    tafel = SCHACH_TAFEL.partieEinsetzen(vorbei.tafel, partieVorbei, 3100);

    /* Eine fremde wartende Runde — zieht niemanden hinein. */
    const fremd = SCHACH_TAFEL.partieAnlegen(tafel, "standard", "Fremd", 4000);
    const partieFremd = SCHACH_RUNDE.teamBeitreten(fremd.partie, "id-cem", "weiss", 4000);
    tafel = SCHACH_TAFEL.partieEinsetzen(fremd.tafel, partieFremd, 4000);

    const anna = SCHACH_TAFEL.eigeneOffene(tafel, "id-anna");
    gleich(anna.length, 1, "genau eine eigene offene Runde");
    gleich(anna[0].titel, "Wartet", "die wartende Runde");

    /* Genau hier unterscheiden sich die beiden Abfragen. */
    gleich(SCHACH_TAFEL.eigeneLaufende(tafel, "id-anna").length, 0,
        "eigeneLaufende findet sie NICHT — das ist der Grund fuer eigeneOffene");

    gleich(SCHACH_TAFEL.eigeneOffene(tafel, "id-nix").length, 0,
        "Unbeteiligte bekommen nichts");
});

pruefe("eigeneLaufende laesst beendete Partien aus", () => {
    let tafel = SCHACH_TAFEL.leereTafel(1000);

    const eins = SCHACH_TAFEL.partieAnlegen(tafel, "standard", "Vorbei", 2000);
    let partie = SCHACH_RUNDE.teamBeitreten(eins.partie, "id-anna", "weiss", 2000);
    partie = SCHACH_RUNDE.teamBeitreten(partie, "id-bert", "schwarz", 2000);
    partie = bereitUndAufgestellt(partie, "weiss", 2000);
    partie = bereitUndAufgestellt(partie, "schwarz", 2000);
    partie = SCHACH_RUNDE.aufgeben(partie, "schwarz", 2100);
    tafel = SCHACH_TAFEL.partieEinsetzen(eins.tafel, partie, 2100);

    gleich(SCHACH_TAFEL.eigeneLaufende(tafel, "id-anna").length, 0,
        "eine beendete Partie zaehlt nicht");
});

/* ------------------------------------------------------------------ *
 * Der Beitritts-Code (v0.10.0, Buendel A Schritt 5)
 * ------------------------------------------------------------------ */

pruefe("Der Beitritts-Code ist gerechnet, fest und ohne verwechselbare Zeichen", () => {
    const eins = SCHACH_RUNDE.beitrittsCode("p-abc");

    gleich(eins.length, SCHACH_RUNDE.CODE_LAENGE, "Laenge");
    gleich(eins, SCHACH_RUNDE.beitrittsCode("p-abc"),
        "derselbe Code bei jedem Aufruf — er wird nie gespeichert");
    wahr(eins !== SCHACH_RUNDE.beitrittsCode("p-abd"),
        "eine andere Kennung bekommt einen anderen Code");

    for (const zeichen of eins) {
        wahr(SCHACH_RUNDE.CODE_ZEICHEN.indexOf(zeichen) !== -1,
            "nur Zeichen aus dem Satz (" + zeichen + ")");
    }

    /* Der Code wird vorgelesen und abgetippt — Verwechselbares fehlt. */
    for (const verboten of ["0", "O", "1", "I", "L"]) {
        wahr(SCHACH_RUNDE.CODE_ZEICHEN.indexOf(verboten) === -1,
            verboten + " darf nicht im Zeichensatz stehen");
    }

    gleich(SCHACH_RUNDE.beitrittsCode(""), "", "ohne Kennung kein Code");
    gleich(SCHACH_RUNDE.beitrittsCode({ id: "p-abc" }), eins,
        "eine ganze Partie liefert denselben Code wie ihre Kennung");
});

pruefe("partieZuCode findet offene Partien grosszuegig, beendete nicht", () => {
    let tafel = SCHACH_TAFEL.leereTafel(1000);
    const angelegt = SCHACH_TAFEL.partieAnlegen(tafel, "standard", "Runde", 2000);
    tafel = angelegt.tafel;
    const partieId = angelegt.partie.id;

    const code = SCHACH_RUNDE.beitrittsCode(partieId);

    /* Gross-/Kleinschreibung und Leerraum sind egal — der Code wird
       diktiert und abgetippt. */
    const klein = SCHACH_TAFEL.partieZuCode(tafel, " " + code.toLowerCase() + " ");
    wahr(klein !== null && klein.id === partieId, "kleingeschrieben mit Raendern");

    gleich(SCHACH_TAFEL.partieZuCode(tafel, "AAAAAA"), null,
        "ein falscher Code findet nichts");
    gleich(SCHACH_TAFEL.partieZuCode(tafel, code.slice(0, 3)), null,
        "ein halber Code findet nichts");

    /* Eine beendete Partie hat keinen gueltigen Code mehr. */
    let partie = SCHACH_TAFEL.partie(tafel, partieId);
    partie = SCHACH_RUNDE.teamBeitreten(partie, "id-anna", "weiss", 2100);
    partie = SCHACH_RUNDE.teamBeitreten(partie, "id-bert", "schwarz", 2100);
    partie = bereitUndAufgestellt(partie, "weiss", 2100);
    partie = bereitUndAufgestellt(partie, "schwarz", 2100);
    partie = SCHACH_RUNDE.aufgeben(partie, "schwarz", 2200);
    tafel = SCHACH_TAFEL.partieEinsetzen(tafel, partie, 2200);

    gleich(SCHACH_TAFEL.partieZuCode(tafel, code), null,
        "beendet heisst: der Code fuehrt nicht mehr hinein");
});

/* ------------------------------------------------------------------ *
 * Einladungen (v0.13.0, Buendel A Schritt 7)
 * ------------------------------------------------------------------ */

pruefe("einladen ist additiv, doppelt wirkungslos, und ueberlebt das Nachruesten", () => {
    let runde = SCHACH_RUNDE.leereRunde(1000, "standard", "p-1", "Runde");

    runde = SCHACH_RUNDE.einladen(runde, "id-cem", 2000);
    runde = SCHACH_RUNDE.einladen(runde, "id-cem", 2100);
    gleich(runde.eingeladen.join(","), "id-cem", "einmal eingeladen, nicht doppelt");

    /* Der additive Datenvertrag: Das Feld uebersteht normalisieren … */
    const nachgeruestet = SCHACH_RUNDE.normalisieren(
        JSON.parse(JSON.stringify(runde)));
    gleich(nachgeruestet.eingeladen.join(","), "id-cem",
        "eingeladen uebersteht das Nachruesten");

    /* … und eine alte Partie ohne das Feld heisst: niemand eingeladen. */
    const alt = JSON.parse(JSON.stringify(runde));
    delete alt.eingeladen;
    gleich(SCHACH_RUNDE.normalisieren(alt).eingeladen.length, 0,
        "alte Partien gelten als ohne Einladungen");
});

pruefe("istEingeladen erlischt mit Beitritt und Partie-Ende", () => {
    let runde = SCHACH_RUNDE.leereRunde(1000, "standard", "p-1", "Runde");
    runde = SCHACH_RUNDE.einladen(runde, "id-cem", 2000);

    wahr(SCHACH_RUNDE.istEingeladen(runde, "id-cem"), "die Einladung wartet");
    wahr(!SCHACH_RUNDE.istEingeladen(runde, "id-dora"), "niemand sonst");

    /* Wer beigetreten ist, wartet nicht mehr. */
    const beigetreten = SCHACH_RUNDE.teamBeitreten(runde, "id-cem", "schwarz", 2100);
    wahr(!SCHACH_RUNDE.istEingeladen(beigetreten, "id-cem"),
        "nach dem Beitritt keine offene Einladung mehr");

    /* Mit dem Ergebnis erlischt jede Einladung (F16a). */
    let vorbei = SCHACH_RUNDE.teamBeitreten(runde, "id-anna", "weiss", 2100);
    vorbei = SCHACH_RUNDE.teamBeitreten(vorbei, "id-bert", "schwarz", 2100);
    vorbei = bereitUndAufgestellt(vorbei, "weiss", 2100);
    vorbei = bereitUndAufgestellt(vorbei, "schwarz", 2100);
    vorbei = SCHACH_RUNDE.aufgeben(vorbei, "schwarz", 2200);
    wahr(!SCHACH_RUNDE.istEingeladen(vorbei, "id-cem"),
        "eine beendete Runde laedt niemanden mehr ein");
});

console.log(anzahlOk + " ok, " + anzahlFehler + " Fehler");
process.exit(anzahlFehler === 0 ? 0 : 1);
