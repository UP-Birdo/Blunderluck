/*
 * test-bildschirm-anzeigen.js — Bildschirm-Tests der Anzeigen neben dem
 * Brett: die drei Bildschirm-Punkte aus v0.76, die Rangliste, der Weg einer
 * Bewegung und die Zeichen am Fähigkeiten-Vorrat.
 *
 * Teil 2 von 3 — die gemeinsame Testumgebung kommt aus
 * bildschirm-umgebung.js (dort steht auch, was diese Tests NICHT können);
 * die anderen Teile sind test-bildschirm.js und test-bildschirm-ablaeufe.js.
 * Aufgeteilt 08/2026, die Prüfungen sind unverändert umgezogen.
 *
 * Aufruf: siehe tests\README.md
 */

const pfad = require("path");
const dateisystem = require("fs");

const jsOrdner = pfad.join(__dirname, "..", "js");

const {
    umgebung, netz, neuesElement, brettSuchen, faehigkeitenZeilen,
    bereitUndAufgestellt, hatKlasse, klasseSuchen, klasseZaehlen,
    spielerDaten, tafel, kennungen,
    SPIELER, ANMELDUNG, SCHACH, SCHACH_VARIANTEN, SCHACH_RUNDE, SCHACH_TAFEL,
    SCHACH_BOT, SCHACH_GRUNDLAGEN, TEAM_SCHACH, RANGLISTE,
    SpeicherGemeinsam, Abgleich, FAEHIGKEIT_ZEICHEN
} = require("./bildschirm-umgebung.js");

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

/* ------------------------------------------------------------------ *
 * Die drei Bildschirm-Punkte aus v0.76
 * ------------------------------------------------------------------ */


pruefe("Das kleine Brett zeichnet die Risse mit (v0.76)", () => {
    /*
     * DER GEMELDETE FEHLER: „Bei der Was-ist-passiert-Ansicht zeigt es nicht
     * das Kreuz-Schachbrett." Die Rueckschau zeichnet die Schlussstellung mit
     * `_beispielBrettBauen` — und die kannte als Einzige die Risse nicht. Auf
     * einem Kreuz-Brett sind die vier toten Ecken aber genau das.
     */
    const angelegt = SCHACH_TAFEL.partieAnlegen(
        TEAM_SCHACH.abgleich.daten, "kreuzKlein", "Kreuz-Rueckschau", 7400);

    const partie = angelegt.partie;
    const ecken = SCHACH.risse(partie.stand).length;

    if (ecken === 0) {
        throw new Error("das Kreuz-Brett hat keine toten Ecken");
    }

    const brett = TEAM_SCHACH._beispielBrettBauen({
        runde: partie,
        marken: [],
        wahl: [],
        ziele: [],
        wege: [],
        tipp: -1
    });

    const gezeichnet = klasseZaehlen(brett, "feld-riss");
    if (gezeichnet !== ecken) {
        throw new Error("erwartet " + ecken + " Risse, gezeichnet " + gezeichnet);
    }

    /* Auf einem Brett ohne Risse darf keiner auftauchen. */
    const klassisch = SCHACH_TAFEL.partie(TEAM_SCHACH.abgleich.daten, kennungen.standard);
    const ohne = TEAM_SCHACH._beispielBrettBauen({
        runde: klassisch,
        marken: [],
        wahl: [],
        ziele: [],
        wege: [],
        tipp: -1
    });

    if (klasseZaehlen(ohne, "feld-riss") !== 0) {
        throw new Error("ein Riss auf einem Brett ohne Risse");
    }
});

pruefe("Nur die fuehrende Seite bekommt ein Plus (v0.76)", () => {
    /*
     * DER GEMELDETE FEHLER: „Der Figurenzaehler plus/minus ist nicht richtig,
     * bitte von bekannten Schach-Apps abschauen." Dort steht das Plus nur bei
     * dem, der vorn liegt — und es kommt aus der STELLUNG.
     */
    let partie = SCHACH_RUNDE.kopieren(
        SCHACH_TAFEL.partie(TEAM_SCHACH.abgleich.daten, kennungen.standard));

    /* Ausgeglichen: nirgends eine Zahl. */
    const gleichstand = TEAM_SCHACH._bilanzBauen(partie);
    for (const spalte of gleichstand.kinder) {
        const zahl = klasseSuchen(spalte, "bilanz-punkte");
        if (zahl && String(zahl.textContent || "") !== "") {
            throw new Error("bei Gleichstand steht eine Zahl: " + zahl.textContent);
        }
    }

    /* Weiss hat eine Dame mehr, ohne dass jemals etwas geschlagen wurde —
       genau der Fall, den der alte Zaehler nicht sah. */
    partie.stand = SCHACH.standNormalisieren({
        variante: "standard",
        brett: "....k..."
            + "........"
            + "........"
            + "........"
            + "........"
            + "........"
            + "........"
            + "D...K...",
        amZug: "weiss",
        rochade: ""
    });

    const zeile = TEAM_SCHACH._bilanzBauen(partie);
    const zahlen = zeile.kinder.map((spalte) => {
        const feld = klasseSuchen(spalte, "bilanz-punkte");
        return feld ? String(feld.textContent || "") : "fehlt";
    });

    if (zahlen[0] !== "+9") {
        throw new Error("Weiss muesste +9 zeigen, zeigt " + zahlen[0]);
    }
    if (zahlen[1] !== "") {
        throw new Error("Schwarz darf nichts zeigen, zeigt " + zahlen[1]);
    }
});

pruefe("Der Friedhof-Streifen traegt Totenkopf, Zahl und Pfeil (v0.80.0)", () => {
    /*
     * NUTZER-ENTSCHEIDUNG 25.08.2026 (unveraendert): Der Friedhof zeigt
     * die EIGENEN Gefallenen. NUTZER-WAHL 26.08.2026: Im Streifen stehen
     * Totenkopf UND Zahl — man sieht ohne Tipp, ob sich das Oeffnen lohnt.
     */
    const partie = SCHACH_TAFEL.partie(TEAM_SCHACH.abgleich.daten, kennungen.standard);

    const knopf = TEAM_SCHACH._friedhofStreifenBauen(partie, "weiss", false);
    if (!knopf || knopf.tagName !== "button") {
        throw new Error("der Friedhof-Streifen ist kein Knopf");
    }
    /* Totenkopf und Pfeil sind SVGs, die Zahl ist ein eigener Baustein. */
    const svgs = (knopf.kinder || []).filter((kind) => kind.tagName === "svg").length;
    if (svgs < 2) {
        throw new Error("dem Streifen fehlen Totenkopf oder Pfeil (" + svgs + " SVGs)");
    }
    if (!klasseSuchen(knopf, "friedhof-zahl")) {
        throw new Error("dem Streifen fehlt die Zahl der Gefallenen");
    }
    if (String(knopf.attribute["aria-label"] || "").indexOf("Weiss") === -1) {
        throw new Error("der Streifen nennt seine Seite nicht: "
            + knopf.attribute["aria-label"]);
    }

    /*
     * EIGENE GEFALLENE = was die ANDERE Seite geschlagen hat. Geprueft wird
     * die Richtung an der Klappe (seit v0.81.0 gruppiert): die Summe der
     * Saeulen-Zaehler einer Seite gleicht dem, was die Gegenseite
     * geschlagen hat.
     */
    const mitVerlust = SCHACH_RUNDE.kopieren(partie);
    mitVerlust.verloren = { weiss: ["B", "S"], schwarz: ["B"] };
    for (const farbe of ["weiss", "schwarz"]) {
        const gegner = (farbe === "weiss") ? "schwarz" : "weiss";
        const halter = TEAM_SCHACH._friedhofKlappeBauen(mitVerlust, farbe);
        if (!halter || !klasseSuchen(halter, "friedhof-figuren")) {
            throw new Error("kein Friedhof-Behaelter fuer " + farbe);
        }
        let summe = 0;
        const sammeln = (kind) => {
            const klasse = String(kind.className || "");
            if (klasse.indexOf("friedhof-anzahl") !== -1) {
                summe += parseInt(String(kind.textContent || "0"), 10) || 0;
            }
            for (const enkel of kind.kinder || []) {
                sammeln(enkel);
            }
        };
        sammeln(halter);
        const erwartet = SCHACH_RUNDE.bilanz(mitVerlust, gegner).geschlagen.length;
        if (summe !== erwartet) {
            throw new Error("der Friedhof von " + farbe + " zaehlt " + summe
                + " Figuren, die Gegenseite hat " + erwartet + " geschlagen");
        }
    }

    /*
     * IM LAUFENDEN MATCH hat jede Seite ihren Streifen, VORHER nicht (da
     * ist noch niemand gefallen; der Seitenwahl-Bildschirm hat andere
     * Sorgen). Dieselbe Bedingung galt bis v0.79 fuer die Steuer-Spalte.
     */
    const angelegt = SCHACH_TAFEL.partieAnlegen(
        TEAM_SCHACH.abgleich.daten, "standard", "Friedhof", 6200);
    const vorAnpfiff = TEAM_SCHACH._friedhofStreifenBauen(
        angelegt.partie, "weiss", false);
    if (vorAnpfiff !== null) {
        throw new Error("vor dem Anpfiff steht schon ein Friedhof-Streifen");
    }

    let laeuft = SCHACH_RUNDE.teamBeitreten(angelegt.partie, "id-anna", "weiss", 6200);
    laeuft = SCHACH_RUNDE.teamBeitreten(laeuft, "id-bert", "schwarz", 6200);
    laeuft = bereitUndAufgestellt(laeuft, "weiss", 6200);
    laeuft = bereitUndAufgestellt(laeuft, "schwarz", 6200);

    const imMatch = TEAM_SCHACH._friedhofStreifenBauen(laeuft, "weiss", false);
    if (imMatch === null) {
        throw new Error("im laufenden Match fehlt der Friedhof-Streifen");
    }

    /* Ohne Gefallene gibt es keine Klappe (v0.81.0) — der Streifen mit
       seiner 0 sagt alles. */
    if (TEAM_SCHACH._friedhofKlappeBauen(laeuft, "weiss") !== null) {
        throw new Error("die Klappe steht da, obwohl niemand gefallen ist");
    }
});
pruefe("Die Spieler stehen als Zeilen am Brett, richtig herum (v0.53.0)", () => {
    /*
     * NUTZER-ANSAGE 25.08.2026: „Die zwei grossen Felder nehmen zu viel
     * Platz ein." Entschieden: zwei schmale Zeilen, Gegner oben, man selbst
     * unten.
     *
     * DIE EIGENTLICHE GEFAHR IST DIE ZUORDNUNG. Das Brett dreht sich zur
     * eigenen Seite; steht die obere Zeile dann fuer die falsche Farbe, sitzt
     * der Gegner auf dem Schirm bei den eigenen Figuren — und das faellt beim
     * Bauen nicht auf, weil beide Zeilen gleich aussehen. Geprueft wird
     * deshalb genau das: WELCHE Farbe oben steht, aus Sicht eines Spielers
     * mit Team und aus Sicht eines Zuschauers.
     */
    const person = umgebung.ICH.person();
    const angelegt = SCHACH_TAFEL.partieAnlegen(
        SCHACH_TAFEL.leereTafel(9100), "standard", "Zeilen", 9110);

    /* Ohne Team sieht man das Brett wie Weiss — also steht Schwarz oben. */
    if (TEAM_SCHACH._farbeObenAmBrett(angelegt.partie, person) !== "schwarz") {
        throw new Error("fuer Zuschauer muesste Schwarz oben stehen");
    }

    /* Wer Schwarz spielt, sieht das Brett gedreht — dann steht Weiss oben. */
    const alsSchwarz = SCHACH_RUNDE.teamBeitreten(
        angelegt.partie, person.id, "schwarz", 9120);
    if (TEAM_SCHACH._farbeObenAmBrett(alsSchwarz, person) !== "weiss") {
        throw new Error("als Schwarz muesste Weiss oben stehen");
    }

    /* Und die Zeile selbst traegt, was vorher die Karte trug. */
    const zeile = TEAM_SCHACH._spielerZeileBauen(alsSchwarz, person, "schwarz");
    if (String(zeile.className || "").indexOf("spieler-zeile-meine") === -1) {
        throw new Error("die eigene Seite ist nicht als solche erkennbar");
    }
    if (!klasseSuchen(zeile, "spieler-punkt")) {
        throw new Error("der Zeile fehlt der Farbpunkt");
    }

    const namen = klasseSuchen(zeile, "spieler-name");
    if (!namen || String(namen.textContent || "") !== person.name) {
        throw new Error("der Name steht nicht in der Zeile: "
            + (namen ? namen.textContent : "gar nicht"));
    }
});
pruefe("Die drei Beitritts-Knoepfe stehen beisammen (v0.55.0)", () => {
    /*
     * NUTZER-ANSAGE 25.08.2026: „Besser an dem Punkt wie zuvor machen, dass
     * Schwarz, Weiss und Zufall beisammen stehen."
     *
     * Mit v0.53.0 sassen Weiss und Schwarz je in der Zeile IHRER Seite — und
     * zwischen den beiden Zeilen liegt das Brett. Geprueft wird deshalb
     * genau das, was schiefging: dass alle drei in EINEM Element haengen und
     * KEINER mehr in einer Spielerzeile steht.
     */
    const person = umgebung.ICH.person();
    const angelegt = SCHACH_TAFEL.partieAnlegen(
        SCHACH_TAFEL.leereTafel(9200), "standard", "Beisammen", 9210);

    /* Ohne Team: alle drei. */
    const reihe = TEAM_SCHACH._beitrittReiheBauen(angelegt.partie, person);
    if (!reihe || reihe.kinder.length !== 3) {
        throw new Error("es stehen " + (reihe ? reihe.kinder.length : 0)
            + " Knoepfe beisammen statt drei");
    }
    for (const klasse of ["team-knopf-weiss", "team-knopf-schwarz", "team-knopf-zufall"]) {
        if (!reihe.kinder.some((knopf) =>
                String(knopf.className || "").indexOf(klasse) !== -1)) {
            throw new Error(klasse + " fehlt in der Reihe");
        }
    }

    /* Und in den Spielerzeilen steht keiner mehr. */
    for (const farbe of ["weiss", "schwarz"]) {
        const zeile = TEAM_SCHACH._spielerZeileBauen(angelegt.partie, person, farbe);
        if (klasseSuchen(zeile, "team-knopf")) {
            throw new Error("die Spielerzeile " + farbe
                + " traegt wieder einen Beitritts-Knopf");
        }
    }

    /* Mit eigenem Team: nur noch der Wechsel auf die andere Seite. */
    const alsWeiss = SCHACH_RUNDE.teamBeitreten(
        angelegt.partie, person.id, "weiss", 9220);
    const zwei = TEAM_SCHACH._beitrittReiheBauen(alsWeiss, person);
    if (!zwei || zwei.kinder.length !== 1) {
        throw new Error("mit eigenem Team muesste genau der Wechsel dastehen, da sind "
            + (zwei ? zwei.kinder.length : 0));
    }
    if (String(zwei.kinder[0].className || "").indexOf("team-knopf-schwarz") === -1) {
        throw new Error("der uebrige Knopf ist nicht die andere Seite");
    }
});

pruefe("Die feste Seite gilt erst, wenn das Match laeuft (v0.55.0)", () => {
    /*
     * NUTZER-ANSAGE 25.08.2026: „Das mit dem fixen Spiel soll beim
     * Entscheiden, welches Team man ist, noch nicht sein — da ist es eher
     * verwirrend."
     *
     * Geprueft wird am QUELLTEXT, nicht am Verhalten: Die Klasse setzt eine
     * Koerper-Klasse im echten Browser, und der Bildschirm-Test hat keinen.
     * Was sich hier festhalten laesst, ist der Vertrag — der dritte Wert von
     * `rundeSetzen` haengt an `laeuft` und ist keine feste Zusage mehr.
     */
    const quelle = dateisystem.readFileSync(
        pfad.join(jsOrdner, "team-schach.js"), "utf8");

    if (quelle.indexOf("rundeSetzen(\"team-schach\", true, true)") !== -1) {
        throw new Error("die feste Seite gilt wieder ausnahmslos —"
            + " dann ist sie auch beim Team-Aussuchen an");
    }
    if (quelle.indexOf("rundeSetzen(\"team-schach\", true, offene.laeuft === true)") === -1) {
        throw new Error("der dritte Wert haengt nicht mehr an laeuft");
    }
});

pruefe("Wer am Zug ist, leuchtet — und die Leiste sagt es nicht mehr (v0.53.0)", () => {
    /*
     * Der Grund, warum diese beiden Dinge in EINEM Test stehen: Sie sind
     * zwei Haelften derselben Entscheidung. „Am Zug" und „Schach" sind aus
     * der Standleiste in die Spielerzeile gezogen; bliebe eines von beiden
     * oben stehen, stuende dieselbe Auskunft zweimal auf einem Bildschirm —
     * genau der Fehler, der bei v0.40.0 schon einmal passiert ist (der Code
     * stand doppelt) und mit v0.40.1 nachgebessert werden musste.
     */
    const partie = SCHACH_TAFEL.partie(TEAM_SCHACH.abgleich.daten, kennungen.standard);
    const person = umgebung.ICH.person();

    const amZug = partie.stand.amZug;
    const wartet = (amZug === "weiss") ? "schwarz" : "weiss";

    const dranZeile = TEAM_SCHACH._spielerZeileBauen(partie, person, amZug);
    if (String(dranZeile.className || "").indexOf("spieler-zeile-amzug") === -1) {
        throw new Error("die Zeile des Spielers am Zug leuchtet nicht");
    }

    const warteZeile = TEAM_SCHACH._spielerZeileBauen(partie, person, wartet);
    if (String(warteZeile.className || "").indexOf("spieler-zeile-amzug") !== -1) {
        throw new Error("auch die wartende Seite leuchtet");
    }

    /* Und oben steht es nicht mehr. */
    const leiste = TEAM_SCHACH._standLeisteBauen(partie, person);
    const textSammeln = (element) => {
        let text = String(element.textContent || "");
        for (const kind of element.kinder || []) {
            text += " " + textSammeln(kind);
        }
        return text;
    };
    const oben = textSammeln(leiste);

    if (oben.indexOf("am Zug") !== -1) {
        throw new Error("die Standleiste sagt weiter, wer am Zug ist: " + oben);
    }
    if (oben.indexOf("Schach") !== -1) {
        throw new Error("die Standleiste traegt weiter die Schach-Marke");
    }

    /* Was sie weiter tragen MUSS: Zugnummer und Code. */
    if (oben.indexOf("Zug ") === -1) {
        throw new Error("die Zugnummer ist mit weggeraeumt worden");
    }
});

pruefe("Der Zugverlauf liegt im Kasten-Menue und zaehlt seine Zuege (v0.81.0)", () => {
    /*
     * Seit v0.59.0 ist der Zugverlauf kein Fach unter dem Brett mehr;
     * seit v0.81.0 oeffnet ihn der Verlaufs-Knopf IM eigenen Namens-Kasten
     * (`zuegeOeffnen`). `_verlaufBauen` und das Fach gibt es weiterhin
     * nicht.
     */
    const partie = SCHACH_TAFEL.partie(TEAM_SCHACH.abgleich.daten, kennungen.standard);

    if (typeof TEAM_SCHACH._verlaufBauen === "function") {
        throw new Error("_verlaufBauen gibt es noch — die Verlauf-Karte sollte weg sein");
    }
    if (typeof TEAM_SCHACH.zuegeOeffnen !== "function") {
        throw new Error("zuegeOeffnen fehlt");
    }

    /* Eine leere Zugliste ist null (das Fenster sagt es dann selbst) … */
    const leer = SCHACH_RUNDE.kopieren(partie);
    leer.verlauf = [];
    if (TEAM_SCHACH._zugListeBauen(leer) !== null) {
        throw new Error("die leere Zugliste ist nicht null");
    }

    /* … und der Knopf im Kasten zaehlt trotzdem („0 Züge" in der
       Beschriftung). */
    TEAM_SCHACH.eckMenueOffen = true;
    try {
        const kasten = TEAM_SCHACH._spielerZeileBauen(
            leer, umgebung.ICH.person(), "weiss");
        let zaehlt = false;
        const suchen = (kind) => {
            if (String((kind.attribute || {})["aria-label"] || "")
                .indexOf("0 Züge") !== -1) {
                zaehlt = true;
            }
            for (const enkel of kind.kinder || []) {
                suchen(enkel);
            }
        };
        suchen(kasten);
        if (!zaehlt) {
            throw new Error("der Verlaufs-Knopf im Kasten zaehlt die leere Liste nicht");
        }
    } finally {
        TEAM_SCHACH.eckMenueOffen = false;
    }
});
pruefe("Einigkeit ist die Vorgabe, der Haken fragt das Gegenteil (v0.76)", () => {
    /*
     * DER GEMELDETE PUNKT: „Team muss einig sein soll andersrum da stehen, also
     * dass einig sein Standard sein soll und das andere (wer zuerst zieht,
     * zieht zuerst) nur mit Knopfdruck auswaehlbar ist."
     *
     * Gespeichert wird weiter `regeln.einigkeit` mit derselben Bedeutung —
     * umgedreht ist nur, was am Bildschirm steht.
     */
    TEAM_SCHACH.partieAnlegen();

    if (TEAM_SCHACH.neueRegeln.einigkeit !== true) {
        throw new Error("Einigkeit ist beim Anlegen nicht die Vorgabe");
    }

    /* Die Zeile heisst nach dem SCHNELLEN Weg — und ihr Haken ist aus. */
    const zeilen = [];
    const sammeln = (element) => {
        if (String(element.className || "").indexOf("schalter-zeile") !== -1) {
            zeilen.push(element);
        }
        for (const kind of element.kinder || []) {
            sammeln(kind);
        }
    };
    sammeln(TEAM_SCHACH.wurzelEl);

    const gesucht = zeilen.find((zeile) => {
        const titel = klasseSuchen(zeile, "schalter-titel");
        return titel && String(titel.textContent || "") === "Wer zuerst zieht, hat gezogen";
    });

    if (!gesucht) {
        throw new Error("die Zeile Wer-zuerst-zieht fehlt");
    }

    const kasten = gesucht.kinder.find((kind) => kind.tagName === "input");
    if (!kasten) {
        throw new Error("die Zeile hat keinen Haken");
    }
    if (kasten.checked !== false) {
        throw new Error("der Haken muesste aus sein");
    }

    /* Anhaken schaltet die Abstimmung ab, nicht an. */
    kasten.checked = true;
    kasten.ausloesen("change");

    if (TEAM_SCHACH.neueRegeln.einigkeit !== false) {
        throw new Error("der umgekehrte Haken schaltet in die falsche Richtung");
    }

    TEAM_SCHACH.auswahlSchliessen();
});

pruefe("Ein laufender Sprung laesst sich abbrechen (v0.76)", () => {
    /*
     * DER GEMELDETE PUNKT: „Wenn man ein Item aktiv hat, also gerade dabei ist
     * eine Figur auszuwaehlen, soll man mit einem Abbrechen-Knopf das Item
     * abbrechen koennen, und das Item muss zurueckgegeben werden."
     */
    const angelegt = SCHACH_TAFEL.partieAnlegen(
        TEAM_SCHACH.abgleich.daten, "standard", "Sprung abbrechen", 7500);

    let partie = angelegt.partie;
    partie = SCHACH_RUNDE.teamBeitreten(partie, "id-anna", "weiss", 7500);
    partie = SCHACH_RUNDE.teamBeitreten(partie, "id-bert", "schwarz", 7500);
    partie = bereitUndAufgestellt(partie, "weiss", 7500);
    partie = bereitUndAufgestellt(partie, "schwarz", 7500);
    partie.faehigkeiten.weiss.push("sprung");

    partie = SCHACH_RUNDE.faehigkeitEinsetzen(
        partie, "id-anna", "sprung", -1, "Anna", 7600);

    TEAM_SCHACH.abgleich.daten = SCHACH_TAFEL.partieEinsetzen(
        angelegt.tafel, partie, 7600);
    TEAM_SCHACH.partieOeffnen(angelegt.partie.id);

    const leiste = klasseSuchen(TEAM_SCHACH.wurzelEl, "platzieren");
    if (!leiste) {
        throw new Error("keine Leiste fuer das laufende Item");
    }

    const knopf = klasseSuchen(leiste, "knopf-still");
    if (!knopf || String(knopf.textContent || "") !== "Abbrechen") {
        throw new Error("kein Abbrechen-Knopf");
    }

    /* Der Knopf nimmt die Faehigkeit wirklich zurueck. */
    knopf.ausloesen("click");

    const jetzt = SCHACH_TAFEL.partie(TEAM_SCHACH.abgleich.daten, angelegt.partie.id);
    if (jetzt.faehigkeiten.weiss.indexOf("sprung") === -1) {
        throw new Error("der Sprung kam nicht in den Vorrat zurueck");
    }
    if (jetzt.stand.zusatzMuster !== "") {
        throw new Error("das Muster laeuft weiter");
    }

    /* Ohne laufendes Item gibt es die Leiste nicht. */
    TEAM_SCHACH.zeichnen(TEAM_SCHACH.abgleich.daten);
    if (klasseSuchen(TEAM_SCHACH.wurzelEl, "platzieren")) {
        throw new Error("die Leiste bleibt stehen, obwohl nichts mehr laeuft");
    }

    TEAM_SCHACH.offeneId = "";

    /*
     * Der Schreibvorgang haengt noch am `await` und meldet sich erst ab, wenn
     * dieser Lauf die Kontrolle abgibt — also nach allen synchronen Tests. Der
     * Zaehler wird deshalb hier von Hand zurueckgesetzt; sonst zaehlt der Test
     * „Ein Zug steht sofort auf dem Brett" weiter unten eins zu viel.
     */
    TEAM_SCHACH.abgleich.vorgaenge = 0;
});


/* ------------------------------------------------------------------ *
 * Rangliste
 * ------------------------------------------------------------------ */

pruefe("Die Rangliste zeichnet mit Mitspielern", () => {
    RANGLISTE.aufbauen(neuesElement("div"));
    RANGLISTE.zeichnen();

    if (RANGLISTE.wurzelEl.kinder.length === 0) {
        throw new Error("nichts gezeichnet");
    }
});

pruefe("Die Rangliste zeichnet auch ohne Mitspieler", () => {
    ANMELDUNG.abgleich = { daten: SPIELER.leereDaten(1000) };
    try {
        RANGLISTE.zeichnen();
    } finally {
        ANMELDUNG.abgleich = {
    daten: spielerDaten,

    /* Die Freunde-Karte (v0.11.0) schreibt ueber den Abgleich — hier
       reicht es, den Stand zu uebernehmen. */
    aendern(neu) {
        ANMELDUNG.abgleich.daten = neu;
    }
};
    }
});

pruefe("Die Rangliste zeichnet, bevor Daten da sind", () => {
    const gemerkt = TEAM_SCHACH.abgleich;
    TEAM_SCHACH.abgleich = null;
    try {
        RANGLISTE.zeichnen();
    } finally {
        TEAM_SCHACH.abgleich = gemerkt;
    }
});

pruefe("Ein Tipp auf den Namen fuehrt ins Profil und wieder zurueck", () => {
    RANGLISTE.profilSchliessen();
    RANGLISTE.zeichnen();

    /* Den Namensknopf in der Tabelle suchen und ausloesen — genau das, was ein
       Fingertipp tut. */
    const knoepfe = [];
    const sammeln = (element) => {
        if (String(element.className).indexOf("name-knopf") !== -1) {
            knoepfe.push(element);
        }
        for (const kind of element.kinder || []) {
            sammeln(kind);
        }
    };
    sammeln(RANGLISTE.wurzelEl);

    if (knoepfe.length === 0) {
        throw new Error("kein anklickbarer Name in der Wertung");
    }

    knoepfe[0].ausloesen("click");

    if (!RANGLISTE.offenesProfil) {
        throw new Error("das Profil hat sich nicht geoeffnet");
    }
    if (RANGLISTE.wurzelEl.kinder.length === 0) {
        throw new Error("das Profil zeichnet nichts");
    }

    /* Der Zurueck-Knopf steht im Kopf und fuehrt in die Wertung. */
    const kopf = RANGLISTE.wurzelEl.kinder.find(
        (kind) => String(kind.className).indexOf("partie-kopf") !== -1);

    if (!kopf) {
        throw new Error("kein Kopf mit Zurueck-Knopf");
    }
    kopf.kinder[0].ausloesen("click");

    if (RANGLISTE.offenesProfil !== "") {
        throw new Error("Zurueck hat das Profil nicht geschlossen");
    }
});

pruefe("Ein Profil ohne Partien bricht nicht", () => {
    /* Cem ist angemeldet, hat aber nie gespielt. */
    RANGLISTE.profilOeffnen("id-cem");
    try {
        if (RANGLISTE.wurzelEl.kinder.length === 0) {
            throw new Error("nichts gezeichnet");
        }
    } finally {
        RANGLISTE.profilSchliessen();
    }
});

pruefe("Ein Profil eines entfernten Spielers faellt in die Wertung zurueck", () => {
    RANGLISTE.profilOeffnen("id-gibtsnicht");
    RANGLISTE.zeichnen();

    if (RANGLISTE.offenesProfil !== "") {
        throw new Error("der Tab haengt an einem Spieler, den es nicht gibt");
    }
});

/* ------------------------------------------------------------------ *
 * Der Weg einer Bewegung (seit v3.6; loest den Zugpfeil ab)
 * ------------------------------------------------------------------ */

/* Ein Stand vom klassischen Brett genuegt — gerechnet wird nur mit den Massen. */
const wegStand = SCHACH.neuerStand("standard");

/* Kurzform: Feldnamen statt Nummern, damit die Tests lesbar bleiben. */
function wegVon(vonName, nachName) {
    return SCHACH.wegFelder(wegStand,
        SCHACH.feldNummer(vonName), SCHACH.feldNummer(nachName))
        .map((feld) => SCHACH.feldName(feld));
}

/* Und dasselbe fuer die Felder, die WIRKLICH betreten werden. */
function betretenVon(vonName, nachName) {
    return SCHACH.betreteneFelder(wegStand,
        SCHACH.feldNummer(vonName), SCHACH.feldNummer(nachName))
        .map((feld) => SCHACH.feldName(feld));
}

pruefe("Ein Turm betritt jedes Feld auf seinem Weg, das Startfeld nicht", () => {
    const betreten = betretenVon("a1", "a4").join(" ");

    if (betreten !== "a2 a3 a4") {
        throw new Error("erwartet 'a2 a3 a4', war '" + betreten + "'");
    }
});

pruefe("Ein Springer betritt nur sein Zielfeld", () => {
    const betreten = betretenVon("b1", "c3").join(" ");

    if (betreten !== "c3") {
        throw new Error("erwartet 'c3', war '" + betreten + "'");
    }
});

pruefe("Auch der Teleport betritt nur sein Zielfeld", () => {
    const betreten = betretenVon("d4", "f7").join(" ");

    if (betreten !== "f7") {
        throw new Error("erwartet 'f7', war '" + betreten + "'");
    }
});

pruefe("Ein gerader Zug faerbt jedes Feld dazwischen", () => {
    const weg = wegVon("a1", "a4").join(" ");

    if (weg !== "a1 a2 a3 a4") {
        throw new Error("erwartet 'a1 a2 a3 a4', war '" + weg + "'");
    }
});

pruefe("Ein diagonaler Zug faerbt die Diagonale", () => {
    const weg = wegVon("c1", "f4").join(" ");

    if (weg !== "c1 d2 e3 f4") {
        throw new Error("erwartet 'c1 d2 e3 f4', war '" + weg + "'");
    }
});

pruefe("Ein Springersprung faerbt das L, nicht die Diagonale", () => {
    /* b1 nach c3: zwei Felder hoch, eines zur Seite. Der Knick liegt am Ende
       der LANGEN Achse — also senkrecht ueber dem Start. */
    const weg = wegVon("b1", "c3").join(" ");

    if (weg !== "b1 b2 b3 c3") {
        throw new Error("erwartet 'b1 b2 b3 c3', war '" + weg + "'");
    }
});

pruefe("Auch die flache L-Bewegung knickt richtig", () => {
    /* b1 nach d2: zwei Felder zur Seite, eines hoch. */
    const weg = wegVon("b1", "d2").join(" ");

    if (weg !== "b1 c1 d1 d2") {
        throw new Error("erwartet 'b1 c1 d1 d2', war '" + weg + "'");
    }
});

pruefe("Beim Teleport gehoert nur Anfang und Ende zum Weg", () => {
    /* Zwei Felder schraeg — kein Muster, das ueber Felder fuehrt. */
    const weg = wegVon("d4", "f7").join(" ");

    if (weg !== "d4 f7") {
        throw new Error("erwartet 'd4 f7', war '" + weg + "'");
    }
});

pruefe("Ein Weg ohne Laenge ist genau ein Feld", () => {
    const weg = wegVon("e4", "e4").join(" ");

    if (weg !== "e4") {
        throw new Error("erwartet 'e4', war '" + weg + "'");
    }
});

/* ------------------------------------------------------------------ *
 * Die Zeichen am Faehigkeiten-Vorrat (seit v3.6)
 * ------------------------------------------------------------------ */

/*
 * Die Klassen aller Kinder einer Marke, als eine Zeichenkette.
 *
 * SEIT v0.48 SIND DIE ZEICHEN EIGENSCHAFTEN DER FAEHIGKEIT: Sie stehen immer
 * und ueberall, auch beim Gegner und auch, waehrend der Gegner am Zug ist.
 * Zwischen v0.41 und v0.47 fragten sie den Spielstand — deshalb bekommt dieser
 * Helfer weiterhin mit, wer am Zug ist, und deshalb prueft ein eigener Test,
 * dass es keinen Unterschied mehr macht.
 */
function zeichenAn(art, amZug) {
    const partie = SCHACH_RUNDE.kopieren(
        SCHACH_TAFEL.partie(TEAM_SCHACH.abgleich.daten, kennungen.standard));

    partie.laeuft = true;
    partie.ergebnis = "";
    partie.stand.amZug = amZug || "weiss";

    const marke = TEAM_SCHACH._faehigkeitMarkeBauen(
        partie, { id: "id-anna", name: "Anna" }, art, false);

    return marke.kinder
        .map((kind) => String(kind.className || (kind.attribute && kind.attribute["class"]) || ""))
        .join(" ");
}

pruefe("Ausweichen traegt nur noch den Blitz (v0.58)", () => {
    /*
     * Bis v0.57 trug es beides. Seit es NUR im Gegenzug geht, faellt das
     * Pluszeichen von selbst weg: Wer am Zug ist, darf es gar nicht einsetzen
     * — es gibt also keinen Zug zu behalten. Der Blitz bleibt und ist jetzt
     * das einzige Zeichen an ihm.
     */
    const zeichen = zeichenAn("ausweichen");

    if (zeichen.indexOf("faehigkeit-zeichen") !== -1) {
        throw new Error("Pluszeichen, obwohl Ausweichen nur im Gegenzug geht");
    }
    if (zeichen.indexOf("faehigkeit-blitz") === -1) {
        throw new Error("kein Blitz — Ausweichen geht im Gegenzug");
    }
});

pruefe("Der Friedhof traegt keines von beiden", () => {
    const zeichen = zeichenAn("friedhof");

    if (zeichen.indexOf("faehigkeit-zeichen") !== -1) {
        throw new Error("Pluszeichen, obwohl der Friedhof den Zug beendet");
    }
    if (zeichen.indexOf("faehigkeit-blitz") !== -1) {
        throw new Error("Blitz, obwohl der Friedhof nur am eigenen Zug geht");
    }
});

pruefe("Die Mauer traegt das Pluszeichen, aber keinen Blitz", () => {
    const zeichen = zeichenAn("mauer");

    if (zeichen.indexOf("faehigkeit-zeichen") === -1) {
        throw new Error("kein Pluszeichen — danach zieht man noch normal");
    }
    if (zeichen.indexOf("faehigkeit-blitz") !== -1) {
        throw new Error("Blitz, obwohl sie nur am eigenen Zug geht");
    }
});

pruefe("Der Bauernschub hat sein Pluszeichen verloren (v0.56)", () => {
    /*
     * Bis v0.55 trug er es: Er aendert ja nur die Stellung. Er schiebt aber
     * bis zu acht Figuren, und mit dem Zug obendrauf war das zu stark —
     * gemeldet vom Nutzer am 08.08. Nach der Regel von v0.47 nimmt man einer
     * zu starken Faehigkeit das Pluszeichen, statt ihre Stufe zu verschieben.
     */
    const zeichen = zeichenAn("bauernschub");

    if (zeichen.indexOf("faehigkeit-zeichen") !== -1) {
        throw new Error("Pluszeichen, obwohl der Bauernschub den Zug beendet");
    }
    if (zeichen.indexOf("faehigkeit-blitz") !== -1) {
        throw new Error("Blitz, obwohl er nur am eigenen Zug geht");
    }
});

pruefe("Der Sprung traegt kein Pluszeichen", () => {
    /* Seit v0.48: Er IST der Zug — danach bleibt kein normaler uebrig. */
    const zeichen = zeichenAn("sprung");

    if (zeichen.indexOf("faehigkeit-zeichen") !== -1) {
        throw new Error("Pluszeichen, obwohl der Sprung der Zug selbst ist");
    }
});

pruefe("Die Zeichen stehen auch im Gegnerzug (v0.48)", () => {
    /*
     * DIE UMKEHR VON v0.41.
     *
     * Zwischen v0.41 und v0.47 verschwand das Pluszeichen, sobald der Gegner am
     * Zug war — es beantwortete die Frage „habe ich JETZT danach noch einen
     * Zug". Damit war es kein Merkmal der Faehigkeit mehr, sondern ein
     * flackernder Zustand, und bei gegnerischen Faehigkeiten stand es nie.
     * Seit v0.48 sagt es, was die Faehigkeit IST — und ist deshalb von der
     * Frage, wer am Zug ist, unabhaengig.
     */
    /*
     * Geprueft wird das seit v0.58 an der MAUER (Pluszeichen) und am
     * AUSWEICHEN (Blitz): Ausweichen hat sein Pluszeichen verloren, taugt
     * also nicht mehr, um beide Zeichen an einer Faehigkeit zu zeigen. Die
     * Aussage bleibt dieselbe — die Zeichen haengen an der Faehigkeit, nicht
     * daran, wer gerade am Zug ist.
     */
    for (const amZug of ["weiss", "schwarz"]) {
        if (zeichenAn("mauer", amZug).indexOf("faehigkeit-zeichen") === -1) {
            throw new Error("kein Pluszeichen an der Mauer bei amZug=" + amZug);
        }
        if (zeichenAn("ausweichen", amZug).indexOf("faehigkeit-blitz") === -1) {
            throw new Error("kein Blitz bei amZug=" + amZug);
        }
    }
});

pruefe("Auch eine fremde Faehigkeit laesst sich antippen (v0.48)", () => {
    /*
     * Wer nicht einsetzen darf, bekommt Beschreibung und Anleitung zu sehen.
     * Dafuer muss die Marke ein KNOPF sein — bis v0.47 war sie ein totes
     * Schildchen.
     */
    const partie = SCHACH_RUNDE.kopieren(
        SCHACH_TAFEL.partie(TEAM_SCHACH.abgleich.daten, kennungen.standard));

    partie.laeuft = true;
    partie.ergebnis = "";

    const marke = TEAM_SCHACH._faehigkeitMarkeBauen(
        partie, { id: "id-anna", name: "Anna" }, "friedhof", false);

    if (String(marke.tagName || "").toLowerCase() !== "button") {
        throw new Error("erwartet ein button, war '" + marke.tagName + "'");
    }
    if (String(marke.className || "").indexOf("faehigkeit-knopf-fremd") === -1) {
        throw new Error("fremde Faehigkeit ohne eigene Klasse");
    }
});

pruefe("Ein Zug steht sofort auf dem Brett, bevor gespeichert ist", () => {
    /*
     * Der Kern von v3.8: Nicht erst warten, bis die Datenbank bestaetigt hat.
     *
     * Geprueft wird das mit einem Speicher, der NIE fertig wird. Der Aufruf von
     * `_sendenMitPruefung` wird bewusst nicht abgewartet — alles vor dem ersten
     * `await` laeuft synchron, und genau dort muss der Zug schon stehen.
     */
    const angelegt = SCHACH_TAFEL.partieAnlegen(
        TEAM_SCHACH.abgleich.daten, "standard", "Sofort", 7000);

    let partie = SCHACH_RUNDE.teamBeitreten(angelegt.partie, "id-anna", "weiss", 7000);
    partie = SCHACH_RUNDE.teamBeitreten(partie, "id-bert", "schwarz", 7000);
    partie = bereitUndAufgestellt(partie, "weiss", 7000);
    partie = bereitUndAufgestellt(partie, "schwarz", 7000);

    TEAM_SCHACH.abgleich.daten = SCHACH_TAFEL.partieEinsetzen(angelegt.tafel, partie, 7000);
    TEAM_SCHACH.partieOeffnen(partie.id);

    const gezogen = SCHACH_RUNDE.ziehen(partie, "id-anna",
        SCHACH.feldNummer("d2"), SCHACH.feldNummer("d4"), "D", "Anna", 7100);

    const gemerkt = TEAM_SCHACH.abgleich.speicher;
    TEAM_SCHACH.abgleich.speicher = {
        art: "lokal",
        /* Loest nie auf: So bleibt der Ablauf genau an der Stelle stehen, an
           der frueher der Bildschirm gewartet haette. */
        speichern() { return new Promise(() => undefined); }
    };

    try {
        TEAM_SCHACH._sendenMitPruefung(gezogen, partie.zugZaehler);

        const jetzt = SCHACH_TAFEL.partie(TEAM_SCHACH.abgleich.daten, partie.id);
        if (!jetzt || jetzt.zugZaehler !== gezogen.zugZaehler) {
            throw new Error("der Zug steht noch nicht im Stand");
        }
        if (SCHACH.figurAuf(jetzt.stand, SCHACH.feldNummer("d4")) !== "B") {
            throw new Error("der Bauer steht nicht auf d4");
        }
        if (TEAM_SCHACH.abgleich.vorgaenge !== 1) {
            throw new Error("der Schreibvorgang ist beim Abgleich nicht angemeldet");
        }
    } finally {
        TEAM_SCHACH.abgleich.speicher = gemerkt;
        TEAM_SCHACH.abgleich.vorgaenge = 0;
    }
});

pruefe("Eine Auswahl ueberlebt den naechsten Zug nicht", () => {
    /*
     * Der gemeldete Fehler (Screenshot v3.9): Zielpunkte und rote Schlagringe
     * blieben nach einem Zug auf dem Brett stehen — sie leben im
     * Bildschirm-Objekt, nicht im Spielstand. Darunter stand dabei „Warte, bis
     * dein Team wieder am Zug ist".
     */
    const angelegt = SCHACH_TAFEL.partieAnlegen(
        TEAM_SCHACH.abgleich.daten, "standard", "Auswahl", 9000);

    let partie = SCHACH_RUNDE.teamBeitreten(angelegt.partie, "id-anna", "weiss", 9000);
    partie = SCHACH_RUNDE.teamBeitreten(partie, "id-bert", "schwarz", 9000);
    partie = bereitUndAufgestellt(partie, "weiss", 9000);
    partie = bereitUndAufgestellt(partie, "schwarz", 9000);

    TEAM_SCHACH.abgleich.daten = SCHACH_TAFEL.partieEinsetzen(angelegt.tafel, partie, 9000);
    TEAM_SCHACH.partieOeffnen(partie.id);

    /* Anna tippt einen Bauern an — die Ziele erscheinen. */
    TEAM_SCHACH.feldAngetippt(partie, { id: "id-anna", name: "Anna" },
        SCHACH.feldNummer("e2"));

    if (TEAM_SCHACH.moeglicheZiele.length === 0) {
        throw new Error("keine Ziele markiert");
    }

    /* Jetzt zieht jemand — hier Anna selbst, also wechselt das Zugrecht. */
    const gezogen = SCHACH_RUNDE.ziehen(partie, "id-anna",
        SCHACH.feldNummer("d2"), SCHACH.feldNummer("d4"), "D", "Anna", 9100);

    TEAM_SCHACH.abgleich.daten = SCHACH_TAFEL.partieEinsetzen(
        TEAM_SCHACH.abgleich.daten, gezogen, 9100);
    TEAM_SCHACH.zeichnen(TEAM_SCHACH.abgleich.daten);

    if (TEAM_SCHACH.moeglicheZiele.length !== 0
        || TEAM_SCHACH.gewaehltesFeld !== -1) {
        throw new Error("die alte Auswahl steht noch auf dem Brett");
    }

    /* Und auf dem gezeichneten Brett darf keine Marke mehr kleben. */
    const marken = brettSuchen().kinder.filter((zelle) => {
        const klassen = String(zelle.className || "").split(" ")
            .concat(zelle.classList.liste);
        return klassen.indexOf("feld-ziel") !== -1
            || klassen.indexOf("feld-schlag") !== -1
            || klassen.indexOf("feld-gewaehlt") !== -1;
    });

    if (marken.length !== 0) {
        throw new Error(marken.length + " Felder tragen noch eine Auswahl-Marke");
    }
});

pruefe("Wer nicht am Zug ist, sieht keine Zielpunkte", () => {
    /* Eine eigene, frische Partie — die gemeinsamen sind durch fruehere Tests
       schon bewegt worden. */
    const angelegt = SCHACH_TAFEL.partieAnlegen(
        TEAM_SCHACH.abgleich.daten, "standard", "Warten", 9300);

    let partie = SCHACH_RUNDE.teamBeitreten(angelegt.partie, "id-anna", "weiss", 9300);
    partie = SCHACH_RUNDE.teamBeitreten(partie, "id-bert", "schwarz", 9300);
    partie = bereitUndAufgestellt(partie, "weiss", 9300);
    partie = bereitUndAufgestellt(partie, "schwarz", 9300);

    TEAM_SCHACH.abgleich.daten = SCHACH_TAFEL.partieEinsetzen(angelegt.tafel, partie, 9300);
    TEAM_SCHACH.partieOeffnen(partie.id);

    TEAM_SCHACH.feldAngetippt(partie, { id: "id-anna", name: "Anna" },
        SCHACH.feldNummer("e2"));

    if (TEAM_SCHACH.moeglicheZiele.length === 0) {
        throw new Error("keine Ziele markiert");
    }

    /* Dieselbe Stellung, aber Schwarz ist am Zug: Anna darf nicht ziehen. */
    const fremd = SCHACH_RUNDE.kopieren(partie);
    fremd.stand.amZug = "schwarz";

    TEAM_SCHACH.abgleich.daten = SCHACH_TAFEL.partieEinsetzen(
        TEAM_SCHACH.abgleich.daten, fremd, 9200);
    TEAM_SCHACH.zeichnen(TEAM_SCHACH.abgleich.daten);

    if (TEAM_SCHACH.moeglicheZiele.length !== 0) {
        throw new Error("Ziele bleiben stehen, obwohl das Team nicht am Zug ist");
    }
});

pruefe("Eine geoeffnete Partie schliesst die Spielart-Auswahl", () => {
    /*
     * DER GEMELDETE FEHLER (v0.44): Wer eine Partie anlegte, gab den Namen ein,
     * bestaetigte — und stand wieder vor den Spielart-Kacheln. Die Partie war
     * laengst angelegt und geoeffnet, aber `zeichnen` fragt die Auswahl VOR der
     * offenen Partie ab, und die stand noch auf offen.
     */
    const angelegt = SCHACH_TAFEL.partieAnlegen(
        TEAM_SCHACH.abgleich.daten, "standard", "Frisch angelegt", 9400);

    let partie = SCHACH_RUNDE.teamBeitreten(angelegt.partie, "id-anna", "weiss", 9400);
    partie = SCHACH_RUNDE.teamBeitreten(partie, "id-bert", "schwarz", 9400);
    partie = bereitUndAufgestellt(partie, "weiss", 9400);
    partie = bereitUndAufgestellt(partie, "schwarz", 9400);

    TEAM_SCHACH.abgleich.daten = SCHACH_TAFEL.partieEinsetzen(angelegt.tafel, partie, 9400);

    /* So steht es unmittelbar nach dem Anlegen: die Auswahl ist noch offen. */
    TEAM_SCHACH.auswahlOffen = true;
    TEAM_SCHACH.partieOeffnen(partie.id);

    if (TEAM_SCHACH.auswahlOffen) {
        throw new Error("die Spielart-Auswahl ist noch offen");
    }
    if (!brettSuchen()) {
        throw new Error("statt des Bretts steht etwas anderes im Tab");
    }
});

pruefe("Ein eigenes Zielfeld ist kein Schlagfeld", () => {
    /*
     * v0.44: Der rote Schlagring galt fuer jedes besetzte Zielfeld. Bei der
     * Rochade steht dort die EIGENE Figur — auf sechs Feldern Breite landet der
     * Koenig genau auf dem Turm. Das sah aus, als schluege man ihn.
     */
    TEAM_SCHACH.partieOeffnen(kennungen.gross);
    const partie = SCHACH_TAFEL.partie(TEAM_SCHACH.abgleich.daten, kennungen.gross);
    const breite = SCHACH.breiteVon(partie.stand);
    const hoehe = SCHACH.hoeheVon(partie.stand);

    const eigenerTurm = SCHACH.feldNummer("a1", breite, hoehe);
    const fremderTurm = SCHACH.feldNummer("a8", breite, hoehe);

    TEAM_SCHACH.gewaehltesFeld = SCHACH.feldNummer("a2", breite, hoehe);
    TEAM_SCHACH.moeglicheZiele = [eigenerTurm, fremderTurm];
    TEAM_SCHACH.auswahlZaehler = partie.zugZaehler;
    TEAM_SCHACH.zeichnen(TEAM_SCHACH.abgleich.daten);

    const klassenVon = (feld) => {
        const zelle = brettSuchen().kinder.find(
            (kind) => kind.dataset && kind.dataset.feld === String(feld));
        if (!zelle) {
            throw new Error("Feld " + feld + " nicht gezeichnet");
        }
        return String(zelle.className || "").split(" ").concat(zelle.classList.liste);
    };

    if (klassenVon(eigenerTurm).indexOf("feld-schlag") !== -1) {
        throw new Error("die eigene Figur ist als Schlagfeld markiert");
    }
    if (klassenVon(eigenerTurm).indexOf("feld-ziel") === -1) {
        throw new Error("die eigene Figur traegt keine Zielmarke");
    }
    if (klassenVon(fremderTurm).indexOf("feld-schlag") === -1) {
        throw new Error("die gegnerische Figur traegt keinen Schlagring");
    }

    TEAM_SCHACH._auswahlAufheben();
    TEAM_SCHACH.zeichnen(TEAM_SCHACH.abgleich.daten);
});

pruefe("Ein Abschluss verdraengt keine laufende Partie", () => {
    /*
     * Der gemeldete Haenger: Lag irgendeine beendete Partie herum, deren
     * Abschluss man nie weggeklickt hatte, kam sie bei JEDEM Zeichnen wieder —
     * also alle drei Sekunden — und man kam nicht mehr ans Brett.
     */
    let tafelJetzt = TEAM_SCHACH.abgleich.daten;

    /* Eine beendete Partie, in der Anna mitgespielt hat. */
    const beendet = SCHACH_TAFEL.partieAnlegen(tafelJetzt, "standard", "Vorbei", 8000);
    let alt = SCHACH_RUNDE.teamBeitreten(beendet.partie, "id-anna", "weiss", 8000);
    alt = SCHACH_RUNDE.teamBeitreten(alt, "id-bert", "schwarz", 8000);
    alt = bereitUndAufgestellt(alt, "weiss", 8000);
    alt = bereitUndAufgestellt(alt, "schwarz", 8000);
    alt = SCHACH_RUNDE.aufgeben(alt, "schwarz", 8100);
    tafelJetzt = SCHACH_TAFEL.partieEinsetzen(beendet.tafel, alt, 8100);

    /* Und eine zweite, die noch laeuft. */
    const laufend = SCHACH_TAFEL.partieAnlegen(tafelJetzt, "standard", "Laeuft", 8200);
    let neu = SCHACH_RUNDE.teamBeitreten(laufend.partie, "id-anna", "weiss", 8200);
    neu = SCHACH_RUNDE.teamBeitreten(neu, "id-bert", "schwarz", 8200);
    neu = bereitUndAufgestellt(neu, "weiss", 8200);
    neu = bereitUndAufgestellt(neu, "schwarz", 8200);
    tafelJetzt = SCHACH_TAFEL.partieEinsetzen(laufend.tafel, neu, 8200);

    TEAM_SCHACH.abschluss = null;
    TEAM_SCHACH.abgleich.daten = tafelJetzt;
    TEAM_SCHACH.partieOeffnen(neu.id);

    if (TEAM_SCHACH.abschluss) {
        throw new Error("der Abschluss der alten Partie hat die laufende verdraengt");
    }
    if (!brettSuchen()) {
        throw new Error("kein Brett gezeichnet");
    }

    /* Verlaesst man die laufende Partie, darf er kommen — sonst saehe man ihn
       nie wieder. */
    TEAM_SCHACH.uebersichtOeffnen();

    if (!TEAM_SCHACH.abschluss || TEAM_SCHACH.abschluss.id !== alt.id) {
        throw new Error("in der Uebersicht muesste der Abschluss erscheinen");
    }

    TEAM_SCHACH.abschlussSchliessen(alt.id);
});

pruefe("Die Marke 'Wird gesendet' ist weg — auch waehrend ein Zug laeuft (v0.81.0)", () => {
    /*
     * NUTZER-ANSAGE 26.08.2026: „nimmt zu viel Platz, brauch ich nicht."
     * Die Marke stand seit v3.9 in der Leiste und hielt seit v0.79.1 ihren
     * Platz dauerhaft frei; beides ist zurueckgebaut. Die Sperre selbst
     * (`ziehtGerade`) bleibt — geprueft wird, dass sie STUMM bleibt: Wer
     * die Marke wieder einbaut, macht die Leiste wieder hoeher und das
     * Brett wieder zappelig (v0.79.1, `erkenntnisse.md`).
     */
    TEAM_SCHACH.partieOeffnen(kennungen.standard);

    TEAM_SCHACH.ziehtGerade = true;
    try {
        TEAM_SCHACH.zeichnen(TEAM_SCHACH.abgleich.daten);

        const leiste = TEAM_SCHACH.wurzelEl.kinder.find((kind) =>
            String(kind.className || "").indexOf("stand-leiste") !== -1);

        if (!leiste) {
            throw new Error("keine Standleiste gefunden");
        }
        if (leiste.kinder.some((kind) =>
            String(kind.textContent || "").indexOf("gesendet") !== -1)) {
            throw new Error("die Marke 'Wird gesendet' steht wieder in der Leiste");
        }
    } finally {
        TEAM_SCHACH.ziehtGerade = false;
    }
});

pruefe("Ein Tipp neben die Zielfelder bricht die Faehigkeit ab", () => {
    /* Bis v3.5 passierte hier gar nichts — das sah aus, als haenge die Seite. */
    const angelegt = SCHACH_TAFEL.partieAnlegen(
        TEAM_SCHACH.abgleich.daten, "standard", "Abbruch", 6000);

    let partie = SCHACH_RUNDE.teamBeitreten(angelegt.partie, "id-anna", "weiss", 6000);
    partie = SCHACH_RUNDE.teamBeitreten(partie, "id-bert", "schwarz", 6000);
    partie = bereitUndAufgestellt(partie, "weiss", 6000);
    partie = bereitUndAufgestellt(partie, "schwarz", 6000);

    TEAM_SCHACH.abgleich.daten = SCHACH_TAFEL.partieEinsetzen(angelegt.tafel, partie, 6000);
    TEAM_SCHACH.partieOeffnen(partie.id);

    if (!SCHACH_RUNDE.darfZiehen(partie, "id-anna")) {
        throw new Error("Anna muesste am Zug sein");
    }

    TEAM_SCHACH.zielFaehigkeit = "schutzschild";
    TEAM_SCHACH.zielFelder = [SCHACH.feldNummer("e2")];

    TEAM_SCHACH.feldAngetippt(partie, { id: "id-anna", name: "Anna" },
        SCHACH.feldNummer("h8"));

    if (TEAM_SCHACH.zielFaehigkeit !== "") {
        throw new Error("die Zielauswahl laeuft noch");
    }
});

pruefe("Ein schlagender Bauer bekommt seine Spur", () => {
    /* Genau der Fall, in dem der alte Pfeil fehlte: eine Strecke von einem
       Feld war kuerzer als Rand plus Spitze und wurde gar nicht gezeichnet. */
    const weg = wegVon("e4", "d5").join(" ");

    if (weg !== "e4 d5") {
        throw new Error("erwartet 'e4 d5', war '" + weg + "'");
    }
});


console.log(anzahlOk + " ok, " + anzahlFehler + " Fehler");
process.exit(anzahlFehler === 0 ? 0 : 1);
