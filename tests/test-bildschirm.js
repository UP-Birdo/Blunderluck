/*
 * test-bildschirm.js — lässt den Bildschirm-Code gegen ein NACHGEBAUTES DOM
 * laufen: die Übersicht, jede Spielart, das Brett mit seinen vier Lagen, das
 * Partie-Fenster samt Fähigkeiten, Bibliothek und Anleitung.
 *
 * Teil 1 von 3 — die gemeinsame Testumgebung (nachgebautes DOM, echte
 * js\-Dateien im vm-Kontext, Ausgangslage) kommt aus bildschirm-umgebung.js;
 * dort steht auch, was diese Tests NICHT können. Die beiden anderen Teile:
 * test-bildschirm-anzeigen.js (Rangliste, Zugweg, Vorrat-Zeichen) und
 * test-bildschirm-ablaeufe.js (Start, Abgleich, Fenster, asynchrone
 * Prüfungen). Aufgeteilt 08/2026, die Prüfungen sind unverändert umgezogen.
 *
 * Aufruf: siehe tests\README.md
 */

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
 * Team Schach
 * ------------------------------------------------------------------ */

pruefe("Die Uebersicht der Partien zeichnet", () => {
    TEAM_SCHACH.zeichnen(tafel);
    if (TEAM_SCHACH.wurzelEl.kinder.length === 0) {
        throw new Error("nichts gezeichnet");
    }
});

for (const variante of SCHACH_VARIANTEN.liste) {
    pruefe("Die Partie zeichnet in der Spielart " + variante.id, () => {
        TEAM_SCHACH.partieOeffnen(kennungen[variante.id]);

        /* Kopf, Standleiste, Teams, Brett, Verlauf, Fussleiste. */
        if (TEAM_SCHACH.wurzelEl.kinder.length < 6) {
            throw new Error("nur " + TEAM_SCHACH.wurzelEl.kinder.length + " Bereiche gezeichnet");
        }
    });
}

pruefe("Das Brett hat so viele Felder wie die Spielart Stellen", () => {
    for (const variante of SCHACH_VARIANTEN.liste) {
        TEAM_SCHACH.partieOeffnen(kennungen[variante.id]);

        const brett = brettSuchen();
        const erwartet = variante.breite * variante.hoehe;

        /* Neben den Feldern kann der Pfeil des letzten Zuges im Brett liegen —
           gezählt werden nur Felder. */
        const felder = brett.kinder.filter((kind) => kind.dataset
            && kind.dataset.feld !== undefined).length;

        if (felder !== erwartet) {
            throw new Error(variante.id + ": erwartet " + erwartet
                + " Felder, waren " + felder);
        }
    }
});

pruefe("Die Auswahl der Spielart zeigt je eine Kachel mit Vorschaubild", () => {
    /* Seit Wunsch 8 (v0.21.0) liegen die Kacheln hinter der Vorschau,
       nicht mehr hinter dem Pfeil. */
    TEAM_SCHACH.brettformOeffnen();

    if (!TEAM_SCHACH.auswahlOffen) {
        throw new Error("Auswahl nicht geoeffnet");
    }

    /* Nach Klasse suchen statt nach Stelle — sonst kippt der Test, sobald
       darüber etwas dazukommt (wie die Einstellungen in v2.5). */
    const feld = TEAM_SCHACH.wurzelEl.kinder.find(
        (kind) => kind.className === "spielart-feld");

    if (!feld) {
        throw new Error("kein Kachelfeld gezeichnet");
    }
    /* Versteckte Spielarten (etwa „Fähigkeiten sammeln" seit v2.9) stehen
       nicht mehr zur Auswahl, bleiben aber gültig. */
    const auswahl = SCHACH_VARIANTEN.zurAuswahl();

    if (auswahl.length >= SCHACH_VARIANTEN.liste.length) {
        throw new Error("keine Spielart ist versteckt — Test veraltet?");
    }

    /*
     * SEIT v0.63 ZEIGT DAS FELD NUR DIE SPIELARTEN EINER FORM (Wunsch #22).
     * Geprueft wird deshalb Form fuer Form — und am Ende, dass die drei
     * zusammen jede sichtbare Spielart abdecken. Sonst koennte eine neue
     * Spielart ohne Form in keiner Liste landen und waere unerreichbar.
     */
    let gesehen = 0;

    for (const form of SCHACH_VARIANTEN.FORMEN) {
        TEAM_SCHACH.gewaehlteForm = form.id;
        TEAM_SCHACH.zeichnen(TEAM_SCHACH.abgleich.daten);

        const dieses = TEAM_SCHACH.wurzelEl.kinder.find(
            (kind) => kind.className === "spielart-feld");
        const erwartete = SCHACH_VARIANTEN.zurAuswahlNachForm(form.id);

        if (dieses.kinder.length !== erwartete.length) {
            throw new Error(form.id + ": erwartet " + erwartete.length
                + " Kacheln, waren " + dieses.kinder.length);
        }
        if (erwartete.length === 0) {
            throw new Error(form.id + ": keine einzige Spielart");
        }
        gesehen += erwartete.length;

        /* Jedes Vorschaubild hat so viele Felder wie das Brett der Spielart. */
        for (let stelle = 0; stelle < erwartete.length; stelle++) {
            const variante = erwartete[stelle];
            const vorschau = dieses.kinder[stelle].kinder[0];
            const erwartet = variante.breite * variante.hoehe;

            if (vorschau.kinder.length !== erwartet) {
                throw new Error(variante.id + ": Vorschau mit " + vorschau.kinder.length
                    + " statt " + erwartet + " Feldern");
            }
        }
    }

    if (gesehen !== auswahl.length) {
        throw new Error("die Formen zeigen " + gesehen + " von " + auswahl.length
            + " Spielarten — eine hat keine passende Form");
    }

    TEAM_SCHACH.gewaehlteForm = "klassisch";
    TEAM_SCHACH.auswahlSchliessen();
    if (TEAM_SCHACH.auswahlOffen) {
        throw new Error("Auswahl nicht geschlossen");
    }
});

/* ------------------------------------------------------------------ *
 * Die vier Lagen des Brettes (seit v0.72, Wunsch K4)
 * ------------------------------------------------------------------ */

pruefe("Jede Vierteldrehung zeigt jedes Feld genau einmal (v0.72)", () => {
    /*
     * `_feldZuAnzeige` ist die einzige Stelle, an der die Drehung steht —
     * Brett, Randbeschriftung und Bewegung fragen sie. Geht dabei ein Feld
     * verloren oder taucht eines doppelt auf, fehlt es auf dem Brett.
     */
    const stand = SCHACH.standNormalisieren({ variante: "gross" });
    const breite = SCHACH.breiteVon(stand);
    const hoehe = SCHACH.hoeheVon(stand);

    if (breite === hoehe) {
        throw new Error("geprueft werden muss an einem NICHT quadratischen Brett");
    }

    for (const drehung of [0, 1, 2, 3]) {
        const quer = (drehung % 2) === 1;
        const spalten = quer ? hoehe : breite;
        const reihen = quer ? breite : hoehe;
        const gesehen = {};

        for (let zeigeReihe = 0; zeigeReihe < reihen; zeigeReihe++) {
            for (let zeigeSpalte = 0; zeigeSpalte < spalten; zeigeSpalte++) {
                const feld = TEAM_SCHACH._feldZuAnzeige(stand, drehung, zeigeReihe, zeigeSpalte);

                if (feld < 0 || feld >= breite * hoehe) {
                    throw new Error("Drehung " + drehung + ": Feld " + feld + " liegt draussen");
                }
                if (gesehen[feld]) {
                    throw new Error("Drehung " + drehung + ": Feld " + feld + " kommt doppelt");
                }
                gesehen[feld] = true;
            }
        }

        if (Object.keys(gesehen).length !== breite * hoehe) {
            throw new Error("Drehung " + drehung + " zeigt nur "
                + Object.keys(gesehen).length + " von " + (breite * hoehe) + " Feldern");
        }
    }
});

pruefe("Die gewaehlte Seite landet wirklich unten (v0.72)", () => {
    const stand = SCHACH.standNormalisieren({ variante: "standard" });
    const breite = SCHACH.breiteVon(stand);
    const hoehe = SCHACH.hoeheVon(stand);

    /* Ein Feld der jeweiligen Seite muss in der UNTERSTEN Anzeigereihe
       landen — das ist der ganze Zweck der Drehung. */
    const proben = {
        unten: SCHACH.feldNummer("d1"),
        oben: SCHACH.feldNummer("d8"),
        links: SCHACH.feldNummer("a4"),
        rechts: SCHACH.feldNummer("h4")
    };

    for (const seite of Object.keys(proben)) {
        const drehung = TEAM_SCHACH.DREHUNG_JE_SEITE[seite];
        const quer = (drehung % 2) === 1;
        const spalten = quer ? hoehe : breite;
        const reihen = quer ? breite : hoehe;

        let gefunden = false;
        for (let zeigeSpalte = 0; zeigeSpalte < spalten; zeigeSpalte++) {
            if (TEAM_SCHACH._feldZuAnzeige(stand, drehung, reihen - 1, zeigeSpalte)
                === proben[seite]) {
                gefunden = true;
            }
        }

        if (!gefunden) {
            throw new Error("die Seite " + seite + " liegt bei Drehung "
                + drehung + " nicht in der untersten Reihe");
        }
    }
});

pruefe("Jeder sieht seine eigene Armee unten (v0.72)", () => {
    /* Das gewohnte Brett: Weiss unverdreht, Schwarz um 180 Grad — wie vor
       v0.72. Ein Zuschauer sieht es wie Weiss. */
    const gewohnt = { stand: SCHACH.standNormalisieren({ variante: "standard" }) };
    const erwartet = { weiss: 0, schwarz: 2, "": 0 };

    for (const farbe of Object.keys(erwartet)) {
        const drehung = TEAM_SCHACH._drehungVon(gewohnt, farbe);
        if (drehung !== erwartet[farbe]) {
            throw new Error("auf dem gewohnten Brett muesste " + (farbe || "ein Zuschauer")
                + " die Lage " + erwartet[farbe] + " sehen, war " + drehung);
        }
    }

    /* Das Kreuz mit vier Armeen: Ein Team steht oben und unten, das andere
       links und rechts. Das zweite muss eine Vierteldrehung bekommen. */
    const kreuz = SCHACH_RUNDE.leereRunde(1000, "kreuz", "p-dreh", "K");

    const kreuzWeiss = SCHACH.startSeitenVon(kreuz.stand, "weiss");
    const kreuzSchwarz = SCHACH.startSeitenVon(kreuz.stand, "schwarz");

    if (kreuzWeiss.length !== 2 || kreuzSchwarz.length !== 2) {
        throw new Error("auf dem Kreuz muessten es zwei Seiten je Farbe sein");
    }

    /*
     * DIE TEAMS STEHEN SICH GEGENUEBER: ein PAAR je Team. Beim Bauen stand
     * hier zuerst „die Gegenseite jeder eigenen Seite" — das ergab fuer
     * oben+unten wieder unten+oben, also beide Teams senkrecht. Gefunden
     * wurde es erst am Bild, nicht am Test; deshalb steht es jetzt hier.
     */
    for (const seite of kreuzWeiss) {
        if (kreuzSchwarz.indexOf(seite) !== -1) {
            throw new Error("beide Teams stehen auf " + seite);
        }
    }
    if (kreuzWeiss.indexOf("unten") === -1 && kreuzSchwarz.indexOf("unten") === -1) {
        throw new Error("keines der beiden Teams steht unten");
    }

    for (const farbe of ["weiss", "schwarz"]) {
        const seiten = SCHACH.startSeitenVon(kreuz.stand, farbe);
        const drehung = TEAM_SCHACH._drehungVon(kreuz, farbe);
        const soll = (seiten.indexOf("unten") !== -1) ? 0 : 3;

        if (drehung !== soll) {
            throw new Error(farbe + " steht auf " + seiten.join("+")
                + " und muesste die Lage " + soll + " sehen, war " + drehung);
        }
    }
});

pruefe("Ein Haken zeigt seine Unterpunkte SOFORT (v0.71)", () => {
    /*
     * DER FEHLER AUS DEM EINGANGSKORB VOM 13.08.: „Hakt man Lootboxen an,
     * erscheinen die Unterpunkte erst, wenn man einmal auf eine andere
     * Brettform und zurueck tippt."
     *
     * Ursache war eine Liste mit zwei Schluesseln im Behandler des Hakens:
     * Nur „Lootboxen" und „Zufallsarmee" zeichneten neu. Der Regen-Haken
     * bekam v0.60 einen Schieberegler als Unterpunkt und stand nicht darin.
     * Nachgemessen am 14.08. in einem echten Browser — genau so war es.
     *
     * Geprueft wird deshalb ueber das EREIGNIS, nicht ueber einen direkten
     * Aufruf von `zeichnen`: Nur so faellt auf, wenn der Haken das
     * Neuzeichnen wieder verliert.
     */
    const suchen = (klasse) => {
        const treffer = [];
        const gehen = (element) => {
            for (const kind of element.kinder || []) {
                if (String(kind.className || "").split(" ").indexOf(klasse) !== -1) {
                    treffer.push(kind);
                }
                gehen(kind);
            }
        };
        gehen(TEAM_SCHACH.wurzelEl);
        return treffer;
    };

    TEAM_SCHACH.partieAnlegen();

    if (suchen("mengen-leiste").length !== 0) {
        throw new Error("die Stufen stehen da, bevor Lootboxen angehakt sind");
    }

    /*
     * DER HAKEN WIRD UEBER SEINEN TITEL GESUCHT, NICHT UEBER SEINE STELLE
     * (seit v0.27.0). Bis dahin stand hier `suchen("schalter-kasten")[0]` —
     * das war so lange richtig, wie „Lootboxen" der erste Haken war. Mit
     * „Gegen den Computer" darueber prueft der Test sonst lautlos den
     * falschen Schalter und meldet „der Haken kam nicht an".
     */
    const zeileMitTitel = (text) => suchen("schalter-zeile").find((zeile) => {
        const titel = klasseSuchen(zeile, "schalter-titel");
        return titel && String(titel.textContent || "") === text;
    });

    const lootboxZeile = zeileMitTitel("Lootboxen");
    if (!lootboxZeile) {
        throw new Error("der Haken Lootboxen fehlt");
    }

    const kasten = lootboxZeile.kinder.find((kind) => kind.tagName === "input");
    if (!kasten) {
        throw new Error("kein Haken gezeichnet");
    }

    kasten.checked = true;
    kasten.ausloesen("change");

    if (!TEAM_SCHACH.neueRegeln.faehigkeiten) {
        throw new Error("der Haken kam nicht an");
    }
    if (suchen("mengen-leiste").length !== 1) {
        throw new Error("die vier Stufen erscheinen nicht sofort");
    }

    /* Und die Unterpunkte des Hakens sind auch da — seit v0.110 liegen sie
       in einem GRUPPEN-KASTEN statt an einem Einrueck-Strich. Geprueft wird
       beides: Der Kasten steht da, und die abhaengigen Zeilen (Seltenheit,
       Unglueck) stecken mit den beiden Reihen DARIN. */
    const gruppen = suchen("schalter-gruppe");
    if (gruppen.length !== 1) {
        throw new Error("genau ein Gruppen-Kasten unter dem Lootbox-Haken, "
            + "gezaehlt: " + gruppen.length);
    }

    const inGruppe = (klasse) => {
        const treffer = [];
        const absteigen = (element) => {
            for (const kind of element.kinder || []) {
                if (String(kind.className || "").indexOf(klasse) !== -1) {
                    treffer.push(kind);
                }
                absteigen(kind);
            }
        };
        absteigen(gruppen[0]);
        return treffer;
    };

    if (inGruppe("schalter-zeile").length < 2) {
        throw new Error("Seltenheit und Unglueck gehoeren in den Kasten");
    }
    if (inGruppe("vorrat-leiste").length !== 1) {
        throw new Error("die Vorrat-Reihe gehoert in den Kasten");
    }

    /* Eine Stufe antippen setzt sie und zeichnet neu. */
    const knopf = suchen("mengen-knopf")[2];
    knopf.ausloesen("click");

    if (TEAM_SCHACH.neueRegeln.lootboxMenge !== SCHACH_VARIANTEN.LOOTBOX_MENGEN[2].id) {
        throw new Error("die Stufe wurde nicht uebernommen");
    }
    if (suchen("mengen-knopf-aktiv").length !== 1) {
        throw new Error("genau eine Stufe muesste hervorgehoben sein");
    }

    TEAM_SCHACH.auswahlSchliessen();
});

pruefe("Die Rochade steht als Zugpunkt beim Koenig", () => {
    /* Eine eigene Partie mit freier Grundreihe. */
    const angelegt = SCHACH_TAFEL.partieAnlegen(
        TEAM_SCHACH.abgleich.daten, "standard", "Rochade", 4000);

    let partie = SCHACH_RUNDE.teamBeitreten(angelegt.partie, "id-anna", "weiss", 4000);
    partie = SCHACH_RUNDE.teamBeitreten(partie, "id-bert", "schwarz", 4000);
    partie = bereitUndAufgestellt(partie, "weiss", 4000);
    partie = bereitUndAufgestellt(partie, "schwarz", 4000);

    /* Freie Grundreihe: Koenig auf e1, Tuerme auf a1 und h1. */
    partie.stand = SCHACH.standNormalisieren({
        brett: "....k..."
            + "........"
            + "........"
            + "........"
            + "........"
            + "........"
            + "........"
            + "T...K..T",
        amZug: "weiss",
        rochade: "KD"
    });

    const tafel = SCHACH_TAFEL.partieEinsetzen(angelegt.tafel, partie, 4000);
    TEAM_SCHACH.abgleich.daten = tafel;
    TEAM_SCHACH.partieOeffnen(partie.id);

    const person = { id: "id-anna", name: "Anna" };
    const offene = SCHACH_TAFEL.partie(tafel, partie.id);

    TEAM_SCHACH.feldAngetippt(offene, person, SCHACH.feldNummer("e1"));

    /*
     * SEIT v0.44 GIBT ES NUR NOCH EINEN WEG: Koenig antippen, Zugpunkt
     * antippen. Das Turmfeld ist kein eigener Knopf mehr (`rochadeZiele` ist
     * ausgebaut) — der Rochadezug steht als ganz normaler Koenigszug in den
     * moeglichen Zielen.
     */
    if (TEAM_SCHACH.moeglicheZiele.indexOf(SCHACH.feldNummer("g1")) === -1) {
        throw new Error("die kurze Rochade fehlt unter den Zielen");
    }
    if (TEAM_SCHACH.moeglicheZiele.indexOf(SCHACH.feldNummer("c1")) === -1) {
        throw new Error("die lange Rochade fehlt unter den Zielen");
    }
    if (TEAM_SCHACH.moeglicheZiele.indexOf(SCHACH.feldNummer("h1")) !== -1
        || TEAM_SCHACH.moeglicheZiele.indexOf(SCHACH.feldNummer("a1")) !== -1) {
        throw new Error("das Turmfeld ist noch ein Ziel");
    }

    /* Und der Zugpunkt fuehrt die Rochade wirklich aus. */
    const gezogen = SCHACH_RUNDE.ziehen(offene, "id-anna",
        SCHACH.feldNummer("e1"), SCHACH.feldNummer("g1"), "D", "Anna", 4100);

    if (!gezogen || SCHACH.figurAuf(gezogen.stand, SCHACH.feldNummer("f1")) !== "T") {
        throw new Error("der Turm steht nach der Rochade nicht auf f1");
    }

    TEAM_SCHACH._auswahlAufheben();
});

/* Die Klassen eines Feldes im gerade gezeichneten Brett. */
function feldKlassen(feld) {
    const zelle = brettSuchen().kinder.find((kind) => kind.dataset
        && kind.dataset.feld === String(feld));

    if (!zelle) {
        throw new Error("Feld " + feld + " nicht im Brett");
    }
    return String(zelle.className || "").split(" ").concat(zelle.classList.liste);
}

pruefe("Ohne Zug gibt es keine Spur, nach einem Zug schon", () => {
    /* Eine eigene Partie, damit der Test nicht von der Reihenfolge abhaengt. */
    const angelegt = SCHACH_TAFEL.partieAnlegen(
        TEAM_SCHACH.abgleich.daten, "standard", "Spur", 5000);

    let partie = SCHACH_RUNDE.teamBeitreten(angelegt.partie, "id-anna", "weiss", 5000);
    partie = SCHACH_RUNDE.teamBeitreten(partie, "id-bert", "schwarz", 5000);
    partie = bereitUndAufgestellt(partie, "weiss", 5000);
    partie = bereitUndAufgestellt(partie, "schwarz", 5000);

    TEAM_SCHACH.abgleich.daten = SCHACH_TAFEL.partieEinsetzen(angelegt.tafel, partie, 5000);
    TEAM_SCHACH.partieOeffnen(partie.id);

    if (feldKlassen(SCHACH.feldNummer("e4")).indexOf("feld-spur") !== -1) {
        throw new Error("ohne Zug darf keine Spur da sein");
    }

    const gezogen = SCHACH_RUNDE.ziehen(partie, "id-anna",
        SCHACH.feldNummer("e2"), SCHACH.feldNummer("e4"), "D", "Anna", 5100);

    TEAM_SCHACH.abgleich.daten = SCHACH_TAFEL.partieEinsetzen(
        TEAM_SCHACH.abgleich.daten, gezogen, 5100);
    TEAM_SCHACH.zeichnen(TEAM_SCHACH.abgleich.daten);

    /* e2 und e4 sind die Enden, e3 liegt dazwischen. */
    for (const name of ["e2", "e3", "e4"]) {
        if (feldKlassen(SCHACH.feldNummer(name)).indexOf("feld-spur") === -1) {
            throw new Error(name + " gehoert zum Weg, ist aber nicht eingefaerbt");
        }
    }
    for (const name of ["e2", "e4"]) {
        if (feldKlassen(SCHACH.feldNummer(name)).indexOf("feld-spur-ende") === -1) {
            throw new Error(name + " ist ein Ende und muesste kraeftiger sein");
        }
    }
    if (feldKlassen(SCHACH.feldNummer("e3")).indexOf("feld-spur-ende") !== -1) {
        throw new Error("e3 ist kein Ende des Weges");
    }
    if (feldKlassen(SCHACH.feldNummer("d4")).indexOf("feld-spur") !== -1) {
        throw new Error("d4 liegt nicht auf dem Weg");
    }
});

pruefe("Eine Figur antippen zeigt ihre Ziele", () => {
    TEAM_SCHACH.partieOeffnen(kennungen.standard);
    const partie = SCHACH_TAFEL.partie(TEAM_SCHACH.abgleich.daten, kennungen.standard);

    TEAM_SCHACH.feldAngetippt(partie, { id: "id-anna", name: "Anna" },
        SCHACH.feldNummer("e2"));

    if (TEAM_SCHACH.moeglicheZiele.length !== 2) {
        throw new Error("erwartet 2 Ziele, waren " + TEAM_SCHACH.moeglicheZiele.length);
    }
});

pruefe("Nach einem Zug laeuft die Bewegung — und nur einmal", () => {
    TEAM_SCHACH.partieOeffnen(kennungen.standard);

    let partie = SCHACH_TAFEL.partie(TEAM_SCHACH.abgleich.daten, kennungen.standard);
    partie = SCHACH_RUNDE.ziehen(partie, "id-anna",
        SCHACH.feldNummer("e2"), SCHACH.feldNummer("e4"), "D", "Anna", 3000);

    const neueTafel = SCHACH_TAFEL.partieEinsetzen(TEAM_SCHACH.abgleich.daten, partie, 3000);
    TEAM_SCHACH.abgleich.daten = neueTafel;
    TEAM_SCHACH.zeichnen(neueTafel);

    const zielfeld = "[data-feld=\"" + SCHACH.feldNummer("e4") + "\"]";
    const zelle = TEAM_SCHACH.wurzelEl.querySelector(zielfeld);
    if (!zelle) {
        throw new Error("Zielfeld nicht gezeichnet");
    }

    const figur = zelle.kinder[0];
    if (!figur || !figur.classList.contains("figur-zieht")) {
        throw new Error("Bewegung nicht ausgeloest");
    }
    if (figur.style.transform !== "") {
        throw new Error("Verschiebung nicht zurueckgenommen");
    }

    /* Gezeichnet wird alle drei Sekunden — die Bewegung darf sich dabei nicht
       wiederholen. Dafuer gibt es TEAM_SCHACH.animiertBis. */
    TEAM_SCHACH.zeichnen(neueTafel);
    const nochmal = TEAM_SCHACH.wurzelEl.querySelector(zielfeld).kinder[0];
    if (nochmal.classList.contains("figur-zieht")) {
        throw new Error("Bewegung wiederholt sich bei jedem Zeichnen");
    }
});


pruefe("Die Spielart-Kachel nennt die Zahl der Figuren (v0.83)", () => {
    /*
     * NUTZER-WUNSCH 18.08.: „Die Vorschau der Spielfelder soll schon die Anzahl
     * anzeigen." Gezaehlt wird aus dem Brett, das die Kachel WIRKLICH zeigt —
     * mit Zufallsarmee also die gewuerfelte Zahl, nicht die der vollen
     * Aufstellung.
     */
    const klassisch = SCHACH_VARIANTEN.holen("standard");

    const soll = (brett, erwartet) => {
        const ist = TEAM_SCHACH._figurenText(brett);
        if (ist !== erwartet) {
            throw new Error("erwartet <" + erwartet + ">, war <" + ist + ">");
        }
    };

    soll(klassisch.aufstellung, "16 Figuren je Seite");

    /* Ungleiche Seiten werden beide genannt — eine Zahl waere gelogen. */
    soll("TTT...ttt", "3 Figuren je Seite");
    soll("TTTT..ttt", "4 gegen 3 Figuren");
    soll("........", "0 Figuren je Seite");
});

pruefe("Mit Zufallsarmee zeigt die Kachel ein echtes Beispiel (v0.83)", () => {
    /*
     * „Bei Zufall auch gleich ein Beispiel zeigen, wie es sein kann."
     *
     * Gerechnet wird es mit derselben Funktion, die auch die echte Partie
     * aufstellt (`SCHACH_RUNDE.armeeAufstellen`) — ein gemaltes Beispiel waere
     * die zweite Wahrheit, die beim ersten Umbau abweicht.
     */
    const variante = SCHACH_VARIANTEN.holen("standard");
    const gemerkt = TEAM_SCHACH.neueRegeln.zufallsArmee;
    const gemerkteStaerke = TEAM_SCHACH.neueRegeln.armeeStaerke;

    const zaehlen = (brett) => brett.split("").filter((z) => z !== ".").length;

    try {
        /*
         * 1. OHNE HAKEN UND AUF „normal": die feste Aufstellung, unveraendert.
         *
         * SEIT v0.100 gehoert die Staerke dazu (Nutzer-Entscheidung 20.08.:
         * „Zufallsarmee hat keine Auswirkung mehr auf die Groesse, nur der
         * Regler"). Die Stufe, die nichts wegnimmt und nichts dazustellt,
         * heisst seit der neuen Leiter in v0.104 „normal" — bis v0.103 hiess
         * dieselbe Aufstellung „voll".
         */
        TEAM_SCHACH.neueRegeln.zufallsArmee = false;
        TEAM_SCHACH.neueRegeln.armeeStaerke = "normal";
        if (TEAM_SCHACH._vorschauBrett(variante) !== variante.aufstellung) {
            throw new Error("ohne Haken und auf normal muss die gewohnte "
                + "Aufstellung kommen");
        }

        /* 1b. Und der Regler wirkt AUCH ohne Haken (neu in v0.100). */
        TEAM_SCHACH.neueRegeln.armeeStaerke = "wenig";
        const schmal = TEAM_SCHACH._vorschauBrett(variante);

        if (zaehlen(schmal) >= zaehlen(variante.aufstellung)) {
            throw new Error("der Regler muss auch ohne Haken schmaler stellen ("
                + zaehlen(schmal) + " gegen " + zaehlen(variante.aufstellung) + ")");
        }
        if (schmal.indexOf("K") === -1 || schmal.indexOf("k") === -1) {
            throw new Error("beide Koenige muessen das Zuschneiden ueberstehen");
        }

        /* 1c. Und nach OBEN stellt er ohne Haken Figuren DAZU (neu in v0.104):
               „viel" fuellt eine dritte Reihe, „voll" bis zur Mitte. */
        TEAM_SCHACH.neueRegeln.armeeStaerke = "viel";
        const dicht = TEAM_SCHACH._vorschauBrett(variante);

        if (zaehlen(dicht) <= zaehlen(variante.aufstellung)) {
            throw new Error("viel muss auch ohne Haken mehr aufstellen ("
                + zaehlen(dicht) + " gegen " + zaehlen(variante.aufstellung) + ")");
        }
        if (dicht.split("").filter((z) => z === "K").length !== 1
            || dicht.split("").filter((z) => z === "k").length !== 1) {
            throw new Error("die zusaetzlichen Reihen duerfen keinen zweiten "
                + "Koenig bringen");
        }

        /* 2. Mit Haken: ein anderes Brett bei gleicher Groesse — der Haken
              entscheidet seit v0.100 nur noch, WELCHE Figuren stehen. */
        TEAM_SCHACH.neueRegeln.armeeStaerke = "normal";
        TEAM_SCHACH.neueRegeln.zufallsArmee = true;
        const beispiel = TEAM_SCHACH._vorschauBrett(variante);

        if (beispiel === variante.aufstellung) {
            throw new Error("mit Haken muss ein anderes Brett kommen");
        }
        if (beispiel.length !== variante.aufstellung.length) {
            throw new Error("die Brettgroesse darf sich nicht aendern");
        }
        if (zaehlen(beispiel) !== zaehlen(variante.aufstellung)) {
            throw new Error("auf normal stehen gleich viele Figuren wie sonst ("
                + zaehlen(beispiel) + " gegen " + zaehlen(variante.aufstellung) + ")");
        }

        /*
         * 3. UND ES STEHT STILL: Zweimal gefragt kommt dasselbe Bild. Die Saat
         * haengt an der Spielart — sonst wuerfelte die Kachel bei jedem
         * Neuzeichnen neu und flackerte vor den Augen.
         */
        if (TEAM_SCHACH._vorschauBrett(variante) !== beispiel) {
            throw new Error("zweimal gefragt muss dasselbe Beispiel kommen");
        }

        /* 4. Jede Spielart bekommt ihr eigenes Beispiel. */
        const andere = TEAM_SCHACH._vorschauBrett(SCHACH_VARIANTEN.holen("kreuzKlein"));
        if (andere.length === beispiel.length) {
            throw new Error("eine andere Spielart braucht ihr eigenes Brett");
        }
    } finally {
        TEAM_SCHACH.neueRegeln.zufallsArmee = gemerkt;
        TEAM_SCHACH.neueRegeln.armeeStaerke = gemerkteStaerke;
    }
});

pruefe("Item-Vorrat: drei Mengen in einer Reihe, die eigene Wahl im Popup (v0.105)", () => {
    /*
     * NUTZER-ANSAGE 21.08.: „bei welche Items kommen vor die 10 rausnehmen und
     * die drei uebrigen Punkte nebeneinander; bei selbst waehlen soll statt
     * dieser scrollbaren Liste ein Popup-Menue kommen."
     *
     * Geprueft wird der ECHTE Aufbau der Zeile, nicht der Stil: dass die Reihe
     * drei Knoepfe traegt, dass die eigene Wahl daneben steht statt darin, und
     * dass ihr Druck den Dialog mit der Liste als ELEMENT oeffnet — nicht als
     * Text.
     */
    const gemerkterVorrat = TEAM_SCHACH.neueRegeln.itemVorrat;
    const gemerkteAuswahl = TEAM_SCHACH.neueRegeln.itemAuswahl;
    const echterHinweis = umgebung.DIALOG.hinweis;

    try {
        TEAM_SCHACH.neueRegeln.itemVorrat = "alle";
        TEAM_SCHACH.neueRegeln.itemAuswahl = [];

        const zeile = TEAM_SCHACH._vorratLeisteBauen();
        const leiste = zeile.querySelector(".vorrat-leiste");

        if (!leiste) {
            throw new Error("die Mengen-Reihe fehlt");
        }
        if (leiste.kinder.length !== 3) {
            throw new Error("drei Mengen nebeneinander, gezaehlt: "
                + leiste.kinder.length);
        }

        const eigene = zeile.querySelector(".vorrat-eigene");
        if (!eigene) {
            throw new Error("der Knopf fuer die eigene Wahl fehlt");
        }

        /* Der Erklaersatz ist nicht weg, er steht hinter dem i (v0.105). */
        if (zeile.querySelector(".schalter-hinweis")) {
            throw new Error("der Erklaersatz soll nicht mehr offen dastehen");
        }
        if (!zeile.querySelector(".info-knopf")) {
            throw new Error("ohne i waere die Erklaerung verschwunden");
        }

        let zusatz = null;
        umgebung.DIALOG.hinweis = async (titel, text, element) => {
            zusatz = element;
            return true;
        };

        eigene.ausloesen("click");

        if (TEAM_SCHACH.neueRegeln.itemVorrat !== "auswahl") {
            throw new Error("der Knopf muss auf die eigene Wahl stellen");
        }
        if (TEAM_SCHACH.neueRegeln.itemAuswahl.length === 0) {
            throw new Error("beim ersten Mal ist alles angehakt");
        }
        if (!zusatz || !zusatz.kinder || zusatz.kinder.length === 0) {
            throw new Error("das Popup bekommt die Liste als Element");
        }
    } finally {
        umgebung.DIALOG.hinweis = echterHinweis;
        TEAM_SCHACH.neueRegeln.itemVorrat = gemerkterVorrat;
        TEAM_SCHACH.neueRegeln.itemAuswahl = gemerkteAuswahl;
    }
});

pruefe("Jeder aktive Reihen-Knopf traegt seine Pille (v0.109)", () => {
    /*
     * SEIT v0.109 IST DER AKTIVE KNOPF SELBST DURCHSICHTIG — seine Farbe
     * liefert ein Kind-Element (`.reihen-pille`), damit beim weichen
     * Neuzeichnen nur die FLAECHE wandert und nicht die Beschriftung.
     * Fehlt die Pille, ist der gewaehlte Knopf am Bildschirm UNSICHTBAR
     * markiert. Geprueft werden alle vier Reihen plus der Knopf der eigenen
     * Wahl; die Armee-Reihe muss ausserdem eine KARTE sein — der
     * Unterpunkt-Strich hing dort im Leeren (Nutzer-Meldung 22.08.).
     */
    const gemerkterVorrat = TEAM_SCHACH.neueRegeln.itemVorrat;
    const gemerkteAuswahl = TEAM_SCHACH.neueRegeln.itemAuswahl;

    const pilleDrin = (wurzel, name, wo) => {
        if (!wurzel.querySelector(".reihen-pille-" + name)) {
            throw new Error(wo + ": die Pille reihen-pille-" + name + " fehlt");
        }
    };

    try {
        const armee = TEAM_SCHACH._armeeStaerkeLeisteBauen();
        pilleDrin(armee, "armee", "Figurenzahl");
        if (armee.className.indexOf("karte") === -1
            || armee.className.indexOf("schalter-unterpunkt") !== -1) {
            throw new Error("die Figurenzahl-Reihe muss eine Karte ohne "
                + "Unterpunkt-Strich sein (war: " + armee.className + ")");
        }

        pilleDrin(TEAM_SCHACH._formLeisteBauen(), "form", "Brettform");
        pilleDrin(TEAM_SCHACH._mengenLeisteBauen(), "mengen", "Lootbox-Menge");

        TEAM_SCHACH.neueRegeln.itemVorrat = "alle";
        pilleDrin(TEAM_SCHACH._vorratLeisteBauen(), "vorrat", "Item-Vorrat");

        /* Und auf dem Knopf der eigenen Wahl, wenn SIE gewaehlt ist. */
        TEAM_SCHACH.neueRegeln.itemVorrat = "auswahl";
        TEAM_SCHACH.neueRegeln.itemAuswahl = ["mauer"];
        const zeile = TEAM_SCHACH._vorratLeisteBauen();
        const eigene = zeile.querySelector(".vorrat-eigene");
        pilleDrin(eigene, "vorrat", "Selbst gewaehlt");
    } finally {
        TEAM_SCHACH.neueRegeln.itemVorrat = gemerkterVorrat;
        TEAM_SCHACH.neueRegeln.itemAuswahl = gemerkteAuswahl;
    }
});

pruefe("Weiches Zeichnen faellt ohne Browser-Hilfe auf hartes zurueck (v0.107)", () => {
    /*
     * `weichZeichnen` benutzt `document.startViewTransition` — eine
     * Browser-Schnittstelle, die es hier im Test (und in aelteren Browsern)
     * nicht gibt. Dann MUSS sofort und synchron gezeichnet werden: Die sechs
     * Knopf-Reihen des Anlege-Bildschirms rufen seit v0.107 nur noch diesen
     * Weg. Bliebe der Rueckfall aus, staende der Bildschirm nach jedem
     * Knopfdruck still.
     */
    const echt = TEAM_SCHACH.zeichnen;
    let gerufen = 0;

    try {
        TEAM_SCHACH.zeichnen = () => { gerufen++; };
        TEAM_SCHACH.weichZeichnen();
    } finally {
        TEAM_SCHACH.zeichnen = echt;
    }

    if (gerufen !== 1) {
        throw new Error("ohne startViewTransition muss weichZeichnen sofort "
            + "zeichnen (gerufen: " + gerufen + ")");
    }
});

pruefe("Die Einstellungen tragen keinen offenen Erklaertext mehr (v0.105)", () => {
    /*
     * NUTZER-ANSAGE 21.08.: „Generell zu viel Texte ueberall — kuerze die Infos
     * so, dass man sie noch versteht, und verstecke sie so, dass sie beim
     * normalen Nutzen nicht sichtbar sind, aber nicht VERSCHWINDEN."
     *
     * Beides wird geprueft, und das zweite ist das wichtigere: Zu jeder
     * Haken-Zeile muss weiterhin ein i gehoeren. Ein Text, der nur geloescht
     * wird, waere die halbe Ansage.
     */
    const karte = TEAM_SCHACH._regelSchalterBauen();

    const suchen = (element, klasse, treffer) => {
        for (const kind of element.kinder || []) {
            if (typeof kind.className === "string"
                && kind.className.split(" ").indexOf(klasse) !== -1) {
                treffer.push(kind);
            }
            suchen(kind, klasse, treffer);
        }
        return treffer;
    };

    const hinweise = suchen(karte, "schalter-hinweis", []);
    const titel = suchen(karte, "schalter-titel", []);
    const infos = suchen(karte, "info-knopf", []);

    if (hinweise.length !== 0) {
        throw new Error("kein offener Erklaersatz mehr, gezaehlt: " + hinweise.length);
    }
    if (titel.length === 0) {
        throw new Error("die Titel der Einstellungen muessen bleiben");
    }
    if (infos.length < titel.length) {
        throw new Error("jede Zeile braucht ihr i (" + infos.length + " i zu "
            + titel.length + " Titeln)");
    }
});

pruefe("Was sich geaendert hat, wird erkannt — und beim ersten Anblick nichts (v0.77)", () => {
    /*
     * `_veraenderungen` ist die Grundlage der vier stillen Animationen
     * (Nutzer-Wunsch 18.08., „keine Farben und sehr simpel"). Es vergleicht den
     * jetzigen Anblick mit dem letzten. Geprueft wird hier die Unterscheidung,
     * auf die alles ankommt: ERSCHIENEN ist nicht dasselbe wie HINGEZOGEN.
     */
    /*
     * Eine EIGENE Partie, nicht die aus der Tafel: Der Vergleich haengt an
     * zwei aufeinanderfolgenden Staenden, und welche Zuege die Tests davor
     * schon gemacht haben, geht ihn nichts an. Die Staende werden hier direkt
     * gesetzt — `_veraenderungen` rechnet ohnehin nur aus zwei Anblicken.
     */
    const partie = SCHACH_RUNDE.leereRunde(1000, "faehigkeiten", "p-anim", "Animation");

    const b1 = SCHACH.feldNummer("b1");
    const c3 = SCHACH.feldNummer("c3");
    if (SCHACH.figurAuf(partie.stand, b1) !== "S"
        || SCHACH.figurAuf(partie.stand, c3) !== ".") {
        throw new Error("die Startstellung sieht anders aus als erwartet");
    }

    /* 1. Der erste Anblick animiert nie — sonst poppt beim Oeffnen einer
       Partie die ganze Stellung auf einmal auf. */
    TEAM_SCHACH._letzterAnblick = null;
    const erster = TEAM_SCHACH._veraenderungen(partie);

    if (erster.figurenNeu.length || erster.boxenNeu.length
        || erster.boxenWeg.length || erster.schlaege.length) {
        throw new Error("der erste Anblick haette nichts melden duerfen");
    }

    /* 2. Ein ZUG ist kein Erscheinen: Das Zielfeld war leer und traegt jetzt
       eine Figur — die Farbe hat aber nicht mehr Figuren als vorher. */
    const gezogen = SCHACH_RUNDE.kopieren(partie);
    gezogen.stand.brett = SCHACH._brettMit(
        SCHACH._brettMit(gezogen.stand.brett, b1, "."), c3, "S");

    const nachZug = TEAM_SCHACH._veraenderungen(gezogen);

    if (nachZug.figurenNeu.length !== 0) {
        throw new Error("ein Zug wurde als erschienene Figur gelesen: "
            + nachZug.figurenNeu.join(","));
    }
    if (nachZug.schlaege.length !== 0) {
        throw new Error("ein Zug ohne Schlag wurde als Schlag gelesen");
    }

    /* 3. Eine Lootbox, die dazukommt — und danach wieder verschwindet. */
    const mitBox = SCHACH_RUNDE.kopieren(gezogen);
    const boxFeld = SCHACH.feldNummer("c5");
    mitBox.bonus.push({ feld: boxFeld, art: "sprung" });

    const nachBox = TEAM_SCHACH._veraenderungen(mitBox);
    if (nachBox.boxenNeu.join(",") !== String(boxFeld)) {
        throw new Error("die neue Lootbox wurde nicht erkannt: " + nachBox.boxenNeu.join(","));
    }

    const ohneBox = SCHACH_RUNDE.kopieren(mitBox);
    ohneBox.bonus = [];

    const nachWeg = TEAM_SCHACH._veraenderungen(ohneBox);
    if (nachWeg.boxenWeg.join(",") !== String(boxFeld)) {
        throw new Error("die verschwundene Lootbox wurde nicht erkannt");
    }

    /* 4. Eine Figur, die WIRKLICH dazukommt: Weiss hat danach eine mehr. */
    const mitFigur = SCHACH_RUNDE.kopieren(ohneBox);
    const neuFeld = SCHACH.feldNummer("d5");
    mitFigur.stand.brett = SCHACH._brettMit(mitFigur.stand.brett, neuFeld, "B");

    const nachFigur = TEAM_SCHACH._veraenderungen(mitFigur);
    if (nachFigur.figurenNeu.join(",") !== String(neuFeld)) {
        throw new Error("die erschienene Figur wurde nicht erkannt: "
            + nachFigur.figurenNeu.join(","));
    }

    /* 5. Ein Schlag ist ein Farbwechsel auf einem Feld. */
    const geschlagen = SCHACH_RUNDE.kopieren(mitFigur);
    const opfer = SCHACH.feldNummer("d7");
    geschlagen.stand.brett = SCHACH._brettMit(geschlagen.stand.brett, opfer, "D");

    const nachSchlag = TEAM_SCHACH._veraenderungen(geschlagen);
    if (nachSchlag.schlaege.indexOf(opfer) === -1) {
        throw new Error("der Schlag wurde nicht erkannt");
    }

    /* 6. Ein Wechsel der Partie setzt den Vergleich zurueck — sonst wuerde die
       fremde Stellung als lauter Veraenderungen gelesen. */
    const andere = SCHACH_RUNDE.kopieren(geschlagen);
    andere.id = "eine-ganz-andere";

    const nachWechsel = TEAM_SCHACH._veraenderungen(andere);
    if (nachWechsel.figurenNeu.length || nachWechsel.schlaege.length) {
        throw new Error("nach dem Partiewechsel wurde verglichen");
    }

    TEAM_SCHACH._letzterAnblick = null;
});

pruefe("Eine Partie mit Wuerfel und eingesammelter Faehigkeit zeichnet", () => {
    let partie = SCHACH_TAFEL.partie(TEAM_SCHACH.abgleich.daten, kennungen.faehigkeiten);

    /* Ein Würfel auf c4, ein zweiter bleibt liegen — beides muss gezeichnet
       werden: der eingesammelte im Vorrat, der liegende auf dem Brett. */
    /* „erdbeben" ist seit v0.54 ein UNGLUECKSwuerfel — als Faehigkeit auf dem
       Brett wuerde er sofort wirken statt eingesammelt zu werden. */
    partie.bonus.push({ feld: SCHACH.feldNummer("c4"), art: "nudelholz" });
    partie.bonus.push({ feld: SCHACH.feldNummer("e5"), art: "sprung" });

    partie = SCHACH_RUNDE.ziehen(partie, "id-anna",
        SCHACH.feldNummer("c2"), SCHACH.feldNummer("c4"), "D", "Anna", 3100);

    if (partie.faehigkeiten.weiss.length !== 1) {
        throw new Error("Faehigkeit nicht eingesammelt");
    }
    if (partie.bonus.length !== 1) {
        throw new Error("der zweite Wuerfel muss liegen bleiben");
    }

    const neueTafel = SCHACH_TAFEL.partieEinsetzen(TEAM_SCHACH.abgleich.daten, partie, 3100);
    TEAM_SCHACH.abgleich.daten = neueTafel;
    TEAM_SCHACH.partieOeffnen(kennungen.faehigkeiten);
});

pruefe("Anlegen und Loeschen melden sich beim Abgleich an (v0.52)", () => {
    /*
     * DER GEMELDETE FEHLER: „Wenn ich einen Raum erstelle, springe ich nicht
     * direkt rein — ich bleibe in dem Menue, wo man auf die Groesse tippt."
     *
     * Ursache war ein Rennen mit der regelmaessigen Abfrage: Sie lief waehrend
     * des Namensdialogs und des Speicherns weiter und ersetzte `abgleich.daten`
     * durch den Stand vom SERVER — ohne die eben angelegte Partie. Die eiserne
     * Regel dagegen heisst `eigenerVorgangBeginnt`; Zuege und der Imposter
     * halten sie seit v3.8, das Anlegen und das Loeschen nicht.
     *
     * Geprueft wird die ANMELDUNG, nicht der Bildschirm: Ein Test kann das
     * Rennen nicht zuverlaessig nachstellen, die Sperre dagegen schon. Gezaehlt
     * wird mit dem Stellvertreter aus dieser Datei.
     */
    /* Seit Wunsch 1 (24.08.2026) legt `rundeStarten` an, nicht mehr
       `spielartGewaehlt` — die Anmeldepflicht wanderte mit. */
    const quelltext = String(TEAM_SCHACH.rundeStarten)
        + String(TEAM_SCHACH.partieLoeschen);

    if (quelltext.indexOf("eigenerVorgangBeginnt") === -1) {
        throw new Error("Anlegen oder Loeschen meldet sich nicht an");
    }
    if (quelltext.indexOf("eigenerVorgangEndet") === -1) {
        throw new Error("die Anmeldung wird nicht wieder zurueckgenommen");
    }

    /* Und die Sperre zaehlt wirklich hoch und wieder herunter. */
    const abgleich = TEAM_SCHACH.abgleich;
    const vorher = abgleich.vorgaenge;

    abgleich.eigenerVorgangBeginnt();
    if (abgleich.vorgaenge !== vorher + 1) {
        throw new Error("Anmeldung zaehlt nicht hoch");
    }
    abgleich.eigenerVorgangEndet();
    if (abgleich.vorgaenge !== vorher) {
        throw new Error("Anmeldung wird nicht zurueckgenommen");
    }
});

pruefe("Das i beim Wuerfel-Haken fuehrt in die Bibliothek (v0.55)", () => {
    /*
     * „Ich meinte bei dem i neben Zufallswuerfel an das ganze Menue mit den
     * Faehigkeiten, welche es gibt, mit Animationen und co."
     *
     * Moeglich ist das ohne Umbau, weil `zeichnen` die Bibliothek VOR der
     * Spielart-Auswahl abfragt — und `infoSchliessen` bringt einen deshalb
     * genau dorthin zurueck. Genau das prueft dieser Test.
     */
    TEAM_SCHACH.partieAnlegen();
    TEAM_SCHACH.neueRegeln.faehigkeiten = true;

    TEAM_SCHACH.faehigkeitenOeffnen();

    if (!TEAM_SCHACH.infoOffen) {
        throw new Error("die Bibliothek ist nicht offen");
    }
    if (!TEAM_SCHACH.auswahlOffen) {
        throw new Error("die Spielart-Auswahl darf darunter offen bleiben");
    }

    /* Gezeichnet wird die Bibliothek, nicht die Auswahl. */
    const ueberschrift = TEAM_SCHACH.wurzelEl.kinder
        .find((kind) => String(kind.className || "").indexOf("partie-kopf") !== -1);
    if (!ueberschrift) {
        throw new Error("kein Kopf gezeichnet");
    }

    /*
     * Und zurueck landet man wieder bei den Grundeinstellungen — dort steht
     * der Wuerfel-Haken, von dem aus man gekommen ist. Bis v0.20.0 waren
     * das die Spielart-Kacheln; seit Wunsch 8 sind die Bildschirme geteilt.
     */
    TEAM_SCHACH.infoSchliessen();
    if (TEAM_SCHACH.infoOffen) {
        throw new Error("die Bibliothek ist nicht zugegangen");
    }

    const suchen = (element, klasse) => {
        for (const kind of element.kinder || []) {
            if (String(kind.className || "").indexOf(klasse) !== -1) {
                return kind;
            }
            const tiefer = suchen(kind, klasse);
            if (tiefer) {
                return tiefer;
            }
        }
        return null;
    };

    if (!suchen(TEAM_SCHACH.wurzelEl, "schalter-kasten")) {
        throw new Error("nach dem Zurueck fehlen die Grundeinstellungen");
    }

    TEAM_SCHACH.auswahlSchliessen();
});

pruefe("Der Abschluss schluesselt die Punkte auf (v0.53)", () => {
    /*
     * „Beim Endscreen soll aufgelistet werden, mit Ueberschrift links und
     * rechts, wie viele Punkte man dadurch bekommen hat — und ganz oben gross
     * die Punktzahl."
     *
     * Geprueft wird, dass die grosse Zahl aus DERSELBEN Rechnung kommt wie die
     * Rangliste (frueher stand dort eine eigene Summe ohne die Beute) und dass
     * die Aufschluesselung Zeilen hat.
     */
    let partie = SCHACH_TAFEL.partie(TEAM_SCHACH.abgleich.daten, kennungen.klein);
    partie = SCHACH_RUNDE.kopieren(partie);
    partie.ergebnis = "weiss";

    const teil = RANGLISTE.schachPunkteJePartie(
        SCHACH_TAFEL._chronikEintrag(partie), "weiss");

    const liste = TEAM_SCHACH._aufschluesselungBauen(partie, "weiss", teil);
    const posten = liste.kinder.filter((kind) =>
        String(kind.className || "") === "abschluss-posten");

    if (posten.length < 2) {
        throw new Error("erwartet mindestens Mitspielen und Sieg, waren " + posten.length);
    }

    /* Jede Zeile hat links eine Sache und rechts einen Wert. */
    for (const zeile of posten) {
        if (zeile.kinder.length !== 2) {
            throw new Error("eine Zeile ohne zwei Spalten");
        }
    }

    /* Und die Summe stimmt mit der Rangliste ueberein. */
    if (teil.punkte !== RANGLISTE.PUNKTE_TEILNAHME + RANGLISTE.PUNKTE_SIEG + teil.beute) {
        throw new Error("die grosse Zahl passt nicht zur Rangliste");
    }
});

pruefe("Der Beitritts-Code steht in der mitlaufenden Leiste (v0.47.0)", () => {
    /*
     * „Dort, wo die Runden-Anzahl steht, dort rechts hin soll der Code"
     * (Nutzer, 24.08.2026). Die Stand-Leiste ist die, die beim Rollen oben
     * klebt — der Code laeuft im Spiel also immer mit.
     *
     * Geprueft wird beides: dass er DORT steht und dass er im Kopf NICHT
     * mehr steht. Sonst stuende er wie in v0.40.0 zweimal da.
     */
    const person = umgebung.ICH.person();
    const partie = SCHACH_TAFEL.partie(TEAM_SCHACH.abgleich.daten, kennungen.klein);
    const code = SCHACH_RUNDE.beitrittsCode(partie.id);

    const textVon = (element) => {
        let text = String(element.textContent || "");
        for (const kind of element.kinder || []) {
            text += " " + textVon(kind);
        }
        return text;
    };

    const leiste = TEAM_SCHACH._standLeisteBauen(partie, person);
    if (textVon(leiste).indexOf(code) === -1) {
        throw new Error("der Code fehlt in der Stand-Leiste");
    }

    const kopf = TEAM_SCHACH._partieKopfBauen(partie);
    if (textVon(kopf).indexOf(code) !== -1) {
        throw new Error("der Code steht immer noch auch im Kopf");
    }
});

pruefe("Die Rueckschau nennt den Ausgang, farbig (v0.46.0)", () => {
    /*
     * „Schachmatt in rot fuer verloren, gruen fuer gewonnen, und Patt in
     * grau soll statt ‚wie es dazu kam‘ stehen" (Nutzer, 24.08.2026).
     *
     * Geprueft wird der aufgegebene Fall — er ist der einzige, der sich
     * ohne echte Mattstellung herstellen laesst — und dass die alte
     * Ueberschrift verschwunden ist. Das WORT kommt aus `SCHACH.lage`,
     * also aus dem Modell; hier zaehlt, dass es oben steht und eine
     * Farbklasse traegt.
     */
    const echteDaten = TEAM_SCHACH.abgleich.daten;
    const echterAbschluss = TEAM_SCHACH.abschluss;
    const person = umgebung.ICH.person();

    try {
        const angelegt = SCHACH_TAFEL.partieAnlegen(
            SCHACH_TAFEL.leereTafel(8000), "standard", "Ausgang", 8010);
        let partie = SCHACH_RUNDE.teamBeitreten(angelegt.partie, person.id, "weiss", 8020);
        partie = SCHACH_RUNDE.teamBeitreten(partie, "id-bert", "schwarz", 8020);
        partie = bereitUndAufgestellt(partie, "weiss", 8030);
        partie = bereitUndAufgestellt(partie, "schwarz", 8030);
        partie = SCHACH_RUNDE.aufgeben(partie, "weiss", 8040);

        TEAM_SCHACH.abgleich.daten = SCHACH_TAFEL.partieEinsetzen(
            angelegt.tafel, partie, 8040);
        TEAM_SCHACH.abschluss = { id: partie.id, schritt: 0 };
        TEAM_SCHACH.zeichnen(TEAM_SCHACH.abgleich.daten);

        const suchen = (element, klasse) => {
            for (const kind of element.kinder || []) {
                if (String(kind.className || "").indexOf(klasse) !== -1) {
                    return kind;
                }
                const tiefer = suchen(kind, klasse);
                if (tiefer) {
                    return tiefer;
                }
            }
            return null;
        };

        const titel = suchen(TEAM_SCHACH.wurzelEl, "abschluss-ausgang");
        if (!titel) {
            throw new Error("die Rueckschau nennt den Ausgang nicht");
        }
        if (String(titel.textContent || "") === "Wie es dazu kam") {
            throw new Error("die alte Ueberschrift steht noch da");
        }
        /* Anna hat aufgegeben — also verloren, also die Niederlagen-Farbe. */
        if (String(titel.className).indexOf("abschluss-ausgang-niederlage") === -1) {
            throw new Error("falsche Farbklasse: " + titel.className);
        }
    } finally {
        TEAM_SCHACH.abgleich.daten = echteDaten;
        TEAM_SCHACH.abschluss = echterAbschluss;
        TEAM_SCHACH.offeneId = "";
        umgebung.TABS.gewechseltZu = "";
    }
});

pruefe("Der Abschluss ist ein Fenster ohne Tab-Leiste (v0.45.0)", () => {
    /*
     * „Wie es dazu kam und so sollen unten die Menü-Leiste verschwinden —
     * man muss durch klicken, um dorthin zu kommen" (Nutzer, 24.08.2026).
     *
     * Geprueft an der Rueckschau (Schritt 0). Die Ausgangslage wird
     * danach wiederhergestellt, weil die folgenden Tests damit rechnen.
     */
    const echteDaten = TEAM_SCHACH.abgleich.daten;
    const echterAbschluss = TEAM_SCHACH.abschluss;
    const person = umgebung.ICH.person();

    try {
        const angelegt = SCHACH_TAFEL.partieAnlegen(
            SCHACH_TAFEL.leereTafel(8200), "standard", "Vorbei", 8210);
        let partie = SCHACH_RUNDE.teamBeitreten(angelegt.partie, person.id, "weiss", 8220);
        partie = SCHACH_RUNDE.teamBeitreten(partie, "id-bert", "schwarz", 8220);
        partie = bereitUndAufgestellt(partie, "weiss", 8230);
        partie = bereitUndAufgestellt(partie, "schwarz", 8230);
        partie = SCHACH_RUNDE.aufgeben(partie, "weiss", 8240);

        TEAM_SCHACH.abgleich.daten = SCHACH_TAFEL.partieEinsetzen(
            angelegt.tafel, partie, 8240);
        TEAM_SCHACH.abschluss = { id: partie.id, schritt: 0 };
        umgebung.TABS.zuletzt = null;
        TEAM_SCHACH.zeichnen(TEAM_SCHACH.abgleich.daten);

        if (!umgebung.TABS.zuletzt || umgebung.TABS.zuletzt.offen !== true) {
            throw new Error("die Tab-Leiste steht noch: "
                + JSON.stringify(umgebung.TABS.zuletzt));
        }
    } finally {
        TEAM_SCHACH.abgleich.daten = echteDaten;
        TEAM_SCHACH.abschluss = echterAbschluss;
        TEAM_SCHACH.offeneId = "";
        umgebung.TABS.gewechseltZu = "";
    }
});

pruefe("Wer bereit ist, sieht die andere Seite nicht mehr als Angebot (v0.44.0)", () => {
    /*
     * Nutzer-Entscheidung 24.08.2026 zu Punkt 7: „2. kann raus, du bist
     * schon beigetreten — soll erst kommen, wenn man 1 drueckt."
     *
     * Geprueft wird der Weg hin UND zurueck: Nach dem Bereit-Drücken ist
     * „Mitspielen" weg, nach der Ruecknahme wieder da. Nur die Hinrichtung
     * zu pruefen wuerde einen Knopf durchgehen lassen, der nie wiederkommt.
     */
    const person = umgebung.ICH.person();

    /*
     * WO DER KNOPF WOHNT, HAT SICH ZWEIMAL GEAENDERT — die Frage nicht.
     * Bis v0.52.0 sass er im Fuss der Team-Karte, mit v0.53.0 kurz in der
     * Spielerzeile der anderen Seite, seit v0.55.0 steht er mit den anderen
     * beiden zusammen in der Beitritts-Reihe.
     *
     * Gesucht wird deshalb nach der KLASSE und nicht nach der Beschriftung:
     * Die hiess erst „Mitspielen" und heisst jetzt schlicht „Weiss" bzw.
     * „Schwarz". Die Klasse traegt die Bedeutung, das Wort nur den Anlass.
     */
    const mitspielenDa = (partie) => {
        const reihe = TEAM_SCHACH._beitrittReiheBauen(partie, person);
        if (!reihe) {
            return false;
        }
        return (reihe.kinder || []).some((knopf) =>
            String(knopf.className || "").indexOf("team-knopf-weiss") !== -1
            || String(knopf.className || "").indexOf("team-knopf-schwarz") !== -1);
    };

    const angelegt = SCHACH_TAFEL.partieAnlegen(
        SCHACH_TAFEL.leereTafel(8400), "standard", "Bereit", 8410);
    let partie = SCHACH_RUNDE.teamBeitreten(angelegt.partie, person.id, "weiss", 8420);

    if (!mitspielenDa(partie)) {
        throw new Error("vor dem Bereit fehlt die andere Seite als Angebot");
    }

    partie = bereitUndAufgestellt(partie, "weiss", 8430);
    if (mitspielenDa(partie)) {
        throw new Error("nach dem Bereit steht die andere Seite noch da");
    }

    partie = SCHACH_RUNDE.bereitSetzen(partie, "weiss", false, 8440);
    if (!mitspielenDa(partie)) {
        throw new Error("nach der Ruecknahme kommt die andere Seite nicht zurueck");
    }
});

pruefe("Im laufenden Match ist die Fussleiste leer, das Zahnrad sitzt am Spieler (v0.59.0)", () => {
    /*
     * Bis v0.58 stand im laufenden Match genau ein Knopf in der Fussleiste:
     * das Zahnrad (v0.48.0). Seit v0.59.0 ist es zu den Steuer-Knöpfen am
     * Spieler gezogen — die Fussleiste des laufenden Spielers ist damit LEER
     * (null). Zum Vergleich dieselbe Partie vor dem Start, wo die Fussleiste
     * noch den Ausgang traegt.
     */
    const person = umgebung.ICH.person();

    const knopfTexte = (leiste) => {
        const texte = [];
        const suchen = (element) => {
            if (!element) {
                return;
            }
            if (element.tagName === "button") {
                const text = String(element.textContent || "").trim();
                if (text) {
                    texte.push(text);
                }
            }
            for (const kind of element.kinder || []) {
                suchen(kind);
            }
        };
        suchen(leiste);
        return texte;
    };

    const angelegt = SCHACH_TAFEL.partieAnlegen(
        SCHACH_TAFEL.leereTafel(8600), "standard", "Laufend", 8610);
    let partie = SCHACH_RUNDE.teamBeitreten(angelegt.partie, person.id, "weiss", 8620);
    partie = SCHACH_RUNDE.teamBeitreten(partie, "id-bert", "schwarz", 8620);

    /*
     * Vor dem Start steht noch kein Aufgeben da. Der AUSGANG wird hier nicht
     * mehr geprueft: Seit v0.61.0 zeichnet die wartende Partie gar keine
     * Fussleiste mehr, sie ist der Seitenwahl-Bildschirm mit dem „Zurueck"
     * oben links — dafuer gibt es einen eigenen Test.
     */
    const vorher = knopfTexte(TEAM_SCHACH._fussleisteBauen(partie, person));
    if (vorher.indexOf("Aufgeben") !== -1) {
        throw new Error("Aufgeben steht schon vor dem Start da");
    }

    partie = bereitUndAufgestellt(partie, "weiss", 8630);
    partie = bereitUndAufgestellt(partie, "schwarz", 8630);
    if (partie.laeuft !== true) {
        throw new Error("die Testpartie laeuft gar nicht");
    }

    /* Im Match: die Fussleiste ist leer. */
    if (TEAM_SCHACH._fussleisteBauen(partie, person) !== null) {
        throw new Error("die Fussleiste im laufenden Match ist nicht leer");
    }

    /*
     * Die Einstellungen liegen hinter dem EIGENEN Namens-Kasten (person
     * spielt weiss) — einstellen kann nur, wer mitspielt.
     *
     * SEIT v0.81.0 ERSCHEINEN DIE KNOEPFE IM KASTEN SELBST (Nutzer-Ansage:
     * „die Knöpfe sollen in dem Kasten erscheinen") — nicht mehr als
     * eigene Zeile darunter (v0.80.0) oder als Spalte am Rand (v0.64.0).
     */
    const beschriftungen = (element) => {
        const gefunden = [];
        const suchen = (kind) => {
            if (kind.tagName === "button") {
                gefunden.push(String((kind.attribute || {})["aria-label"] || ""));
            }
            for (const enkel of kind.kinder || []) {
                suchen(enkel);
            }
        };
        suchen(element);
        return gefunden;
    };

    TEAM_SCHACH.eckMenueOffen = true;
    try {
        const meine = TEAM_SCHACH._spielerZeileBauen(partie, person, "weiss");
        const texte = beschriftungen(meine);
        if (!texte.some((t) => t.indexOf("Einstellungen") !== -1)) {
            throw new Error("im Kasten fehlen die Einstellungen: " + texte.join(" | "));
        }
        if (!texte.some((t) => t.indexOf("Zugverlauf") !== -1)) {
            throw new Error("im Kasten fehlt der Zugverlauf: " + texte.join(" | "));
        }

        /* Der Kasten des GEGNERS traegt keine Menue-Knoepfe. */
        const fremd = TEAM_SCHACH._spielerZeileBauen(partie, person, "schwarz");
        if (klasseSuchen(fremd, "eck-knopf")) {
            throw new Error("der gegnerische Kasten traegt Menue-Knoepfe");
        }
    } finally {
        TEAM_SCHACH.eckMenueOffen = false;
    }

    /* Zu bleibt zu: Ohne offenes Menue keine Knoepfe im Kasten — und die
       eigene Zeile ist selbst der Knopf (role="button"). */
    const banner = TEAM_SCHACH._spielerZeileBauen(partie, person, "weiss");
    if (klasseSuchen(banner, "eck-knopf")) {
        throw new Error("die Menue-Knoepfe stehen schon im zugeklappten Kasten");
    }
    if (banner.attribute["role"] !== "button") {
        throw new Error("der eigene Namens-Kasten ist kein Knopf");
    }
});

pruefe("Neu aufstellen gibt es nur bei Zufallsarmee (v0.42.0)", () => {
    /*
     * Nutzer-Ansage 24.08.2026, Lesart bestaetigt: Der Knopf ist zum NEU
     * WUERFELN da. Drei Faelle, und alle drei muessen stimmen:
     *   ohne Zufallsarmee            -> nie
     *   gleiche Armee fuer beide     -> auch ohne eigenes Team
     *   jede Seite fuer sich         -> erst mit eigenem Team
     *
     * GEPRUEFT WIRD SEIT v0.61.0 DIE REGEL, NICHT DER KNOPF. Er sass in der
     * Fussleiste der wartenden Partie; die gibt es nicht mehr, seit der
     * Seitenwahl-Bildschirm sie ersetzt hat. Sein Platz ist der zweite
     * Start-Bildschirm (ROADMAP Punkt 5) — bis dahin lebt die Regel allein
     * in `_darfNeuWuerfeln`, und genau die muss stimmen bleiben.
     */
    const person = umgebung.ICH.person();

    const knopfDa = (partie) => TEAM_SCHACH._darfNeuWuerfeln(partie, person);

    const bauen = (regeln, mitTeam) => {
        const angelegt = SCHACH_TAFEL.partieAnlegen(
            SCHACH_TAFEL.leereTafel(8800), "standard", "Probe", 8810);
        let partie = angelegt.partie;
        partie.regeln = Object.assign({}, partie.regeln, regeln);
        if (mitTeam) {
            partie = SCHACH_RUNDE.teamBeitreten(partie, person.id, "weiss", 8820);
        }
        return partie;
    };

    if (knopfDa(bauen({ zufallsArmee: false }, true))) {
        throw new Error("ohne Zufallsarmee steht der Knopf da");
    }
    if (!knopfDa(bauen({ zufallsArmee: true, armeeUnterschiedlich: false }, false))) {
        throw new Error("bei gleicher Armee fehlt er vor der Team-Wahl");
    }
    if (knopfDa(bauen({ zufallsArmee: true, armeeUnterschiedlich: true }, false))) {
        throw new Error("bei getrennten Armeen steht er schon ohne Team da");
    }
    if (!knopfDa(bauen({ zufallsArmee: true, armeeUnterschiedlich: true }, true))) {
        throw new Error("bei getrennten Armeen fehlt er trotz eigenem Team");
    }
});

pruefe("Die Grundeinstellungen sind ein Fenster ohne Tab-Leiste (v0.39.0)", () => {
    /*
     * „Grundeinstellungen für eine Runde soll unten das Menü Band weg so
     * das man nur oben zurück hat" (Nutzer, 24.08.2026).
     *
     * `TABS.rundeSetzen(tab, offen)` heisst: offen === true → Fenster ohne
     * Leiste. Der Nachbau schreibt den letzten Aufruf nach `TABS.zuletzt`.
     */
    try {
        TEAM_SCHACH.partieAnlegen();
        TEAM_SCHACH.zeichnen(TEAM_SCHACH.abgleich.daten);

        if (!umgebung.TABS.zuletzt || umgebung.TABS.zuletzt.offen !== true) {
            throw new Error("die Tab-Leiste steht noch: "
                + JSON.stringify(umgebung.TABS.zuletzt));
        }
    } finally {
        TEAM_SCHACH.auswahlSchliessen();
        umgebung.TABS.gewechseltZu = "";
    }
});

pruefe("Nach der Runde landet man auf dem Start, nicht im Code-Feld (v0.36.0)", () => {
    /*
     * „Zurück zur Übersicht nach einer Runde soll nicht zu Runde beitreten
     * führen sondern zum Start Screen" (Nutzer, 24.08.2026).
     *
     * Geprueft werden BEIDE Wege hinaus: der Abschluss („Zurueck zur
     * Uebersicht") und `uebersichtOeffnen` (Fussleiste, Kopf der Partie).
     */
    const echteDaten = TEAM_SCHACH.abgleich.daten;

    try {
        umgebung.TABS.gewechseltZu = "";
        TEAM_SCHACH.abschlussSchliessen("gibt-es-nicht");
        if (umgebung.TABS.gewechseltZu !== "start") {
            throw new Error("der Abschluss fuehrt nach <"
                + umgebung.TABS.gewechseltZu + "> statt zum Start");
        }

        umgebung.TABS.gewechseltZu = "";
        TEAM_SCHACH.uebersichtOeffnen();
        if (umgebung.TABS.gewechseltZu !== "start") {
            throw new Error("uebersichtOeffnen fuehrt nach <"
                + umgebung.TABS.gewechseltZu + "> statt zum Start");
        }
    } finally {
        TEAM_SCHACH.abgleich.daten = echteDaten;
        TEAM_SCHACH.abschluss = null;
        TEAM_SCHACH.offeneId = "";
        umgebung.TABS.gewechseltZu = "";
    }
});

pruefe("Der Zwischenbildschirm listet die eigenen offenen Partien nicht mehr (v0.35.0)", () => {
    /*
     * „deine offenen partien es soll dort eigentlich ja keine mehr geben"
     * (Nutzer, 24.08.2026). Der Weg zurueck in die eigene Runde fuehrt seit
     * v0.34.0 ueber den Startbildschirm.
     *
     * WICHTIG AN DIESEM TEST: Er prueft NICHT nur, dass die Ueberschrift
     * fehlt, sondern auch, dass der Code-Kasten steht — sonst wuerde er auch
     * dann gruen bleiben, wenn der ganze Bildschirm kaputt ist.
     */
    TEAM_SCHACH.offeneId = "";
    TEAM_SCHACH.abschluss = null;
    TEAM_SCHACH.zeichnen(TEAM_SCHACH.abgleich.daten);

    const textSammeln = (element) => {
        let text = String(element.textContent || "");
        for (const kind of element.kinder || []) {
            text += " " + textSammeln(kind);
        }
        return text;
    };

    const text = textSammeln(TEAM_SCHACH.wurzelEl);

    if (text.indexOf("Deine offenen Partien") !== -1) {
        throw new Error("die Liste steht noch da");
    }
    /* Der Kasten wird an seiner KLASSE erkannt, nicht am Text: Seit v0.51.0
       steht dort kein Erklaersatz mit dem Wort „Beitritts-Code" mehr, sondern
       das Kaestchen-Feld und ein kurzer Hinweis darunter. */
    if (!klasseSuchen(TEAM_SCHACH.wurzelEl, "code-feld")) {
        throw new Error("der Code-Kasten fehlt — der Bildschirm ist kaputt,"
            + " nicht aufgeraeumt");
    }
});

pruefe("Das Code-Feld traegt den Hinweis darunter, nicht darin (v0.51.0)", () => {
    /*
     * NUTZER-ANSAGE 24.08.2026, aufgeloest am 25.08.2026: sechs Kaestchen,
     * der Satz „rechts oben in einer Runde steht der Code" DARUNTER. Im Feld
     * waere er nach zwei Woertern abgeschnitten gewesen.
     *
     * Geprueft wird dreierlei: der alte, lange Erklaersatz ist weg, der neue
     * kurze steht da, und das Feld nimmt weiter genau CODE_LAENGE Zeichen.
     */
    TEAM_SCHACH.uebersichtOeffnen();

    const textSammeln = (element) => {
        let text = String(element.textContent || "");
        for (const kind of element.kinder || []) {
            text += " " + textSammeln(kind);
        }
        return text;
    };
    const text = textSammeln(TEAM_SCHACH.wurzelEl);

    if (text.indexOf("Gib den Beitritts-Code ein") !== -1) {
        throw new Error("der alte Erklaersatz steht noch da");
    }
    if (text.indexOf("Rechts oben in einer Runde steht der Code") === -1) {
        throw new Error("der neue Hinweis fehlt");
    }

    const hinweis = klasseSuchen(TEAM_SCHACH.wurzelEl, "code-hinweis");
    if (!hinweis) {
        throw new Error("der Hinweis traegt seine Klasse nicht");
    }

    const feld = klasseSuchen(TEAM_SCHACH.wurzelEl, "code-feld");
    if (feld.maxLength !== SCHACH_RUNDE.CODE_LAENGE) {
        throw new Error("das Feld nimmt " + feld.maxLength
            + " Zeichen statt " + SCHACH_RUNDE.CODE_LAENGE);
    }
});

pruefe("Die Regler bleiben, egal wie man die Auswahl verlaesst (v0.33.0)", () => {
    /*
     * „im menü wenn man was auswählt unter dem pfeil soll das so bleiben bis
     * man etwas ändert sprich wenn ich raus gehe soll die einstellungen im
     * hinter grunmd bleiben" (Nutzer, 24.08.2026).
     *
     * Bis v0.32.0 schrieb nur der „Zurueck"-Knopf in die Geraete-Erinnerung.
     * Geprueft wird deshalb der Weg, der frueher alles verlor: Regler
     * aendern und den Bildschirm OHNE „Zurueck" verlassen.
     */
    const START = umgebung.START;
    const echteDaten = TEAM_SCHACH.abgleich.daten;

    try {
        START.regelnMerken(TEAM_SCHACH._regelnVorgabe());

        TEAM_SCHACH.partieAnlegen();
        if (!TEAM_SCHACH.auswahlOffen) {
            throw new Error("die Auswahl ist gar nicht offen");
        }

        /* Eine Aenderung wie durch einen Knopfdruck: Wert setzen, neu
           zeichnen. Genau das tun die Regler (`weichZeichnen`). */
        const hoechste = SCHACH_BOT.STUFEN[SCHACH_BOT.STUFEN.length - 1];
        TEAM_SCHACH.neueRegeln.botStufe = hoechste.id;
        TEAM_SCHACH.neueRegeln.lootboxMenge = "viele";
        TEAM_SCHACH.zeichnen(TEAM_SCHACH.abgleich.daten);

        /* HINAUS OHNE „ZURUECK" — der Weg, der frueher alles verlor. */
        TEAM_SCHACH.auswahlOffen = false;
        TEAM_SCHACH._auswahlAufheben();

        const gemerkt = START.regeln();
        if (gemerkt.botStufe !== hoechste.id) {
            throw new Error("die Bot-Stufe ist verloren gegangen: <"
                + gemerkt.botStufe + ">");
        }
        if (gemerkt.lootboxMenge !== "viele") {
            throw new Error("die Lootbox-Menge ist verloren gegangen: <"
                + gemerkt.lootboxMenge + ">");
        }

        /* Und beim naechsten Oeffnen stehen sie wieder da. */
        TEAM_SCHACH.partieAnlegen();
        if (TEAM_SCHACH.neueRegeln.botStufe !== hoechste.id) {
            throw new Error("beim erneuten Oeffnen steht die alte Stufe da");
        }
        TEAM_SCHACH.auswahlSchliessen();
    } finally {
        TEAM_SCHACH.abgleich.daten = echteDaten;
        TEAM_SCHACH.auswahlOffen = false;
        START.regelnMerken(TEAM_SCHACH._regelnVorgabe());
    }
});

pruefe("Nach einer Bot-Partie kommt kein Punkte-Schirm (v0.32.0)", () => {
    /*
     * „nach bot spieln braucht nicht die rangliste angezigt zu werden gibt ja
     * eh keine punkte" (Nutzer, 24.08.2026).
     *
     * Geprueft wird der ERGEBNIS-Schritt (1) einer beendeten Partie gegen den
     * Computer: keine grosse Zahl, keine Aufschluesselung, kein Knopf in die
     * Rangliste. Die Rueckschau davor bleibt unberuehrt — sie zeigt den
     * Verlauf, nicht die Punkte.
     */
    const echteDaten = TEAM_SCHACH.abgleich.daten;
    const echterAbschluss = TEAM_SCHACH.abschluss;

    try {
        const angelegt = SCHACH_TAFEL.partieAnlegen(
            SCHACH_TAFEL.leereTafel(9600),
            SCHACH_VARIANTEN.liste[0].id, "Gegen den Computer", 9610);

        let partie = SCHACH_RUNDE.teamBeitreten(
            angelegt.partie, "id-anna", "weiss", 9610);
        partie = SCHACH_BOT.inRundeSetzen(partie, "schwarz", 9610);

        /* Erst wenn BEIDE Seiten bereit sind, laeuft die Partie — und nur
           eine laufende laesst sich aufgeben. Ohne diesen Schritt bleibt
           `ergebnis` leer, und `zeichnen` zeigt die Uebersicht statt des
           Abschlusses (beim Schreiben des Tests genau so passiert). */
        partie = bereitUndAufgestellt(partie, "weiss", 9615);
        partie = SCHACH_RUNDE.aufgeben(partie, "weiss", 9620);

        if (!SCHACH_BOT.istBotPartie(partie)) {
            throw new Error("die Testpartie ist gar keine Bot-Partie");
        }
        if (!partie.ergebnis) {
            throw new Error("die Testpartie ist gar nicht beendet");
        }

        TEAM_SCHACH.abgleich.daten = SCHACH_TAFEL.partieEinsetzen(
            angelegt.tafel, partie, 9620);
        TEAM_SCHACH.abschluss = { id: partie.id, schritt: 1 };
        TEAM_SCHACH.zeichnen(TEAM_SCHACH.abgleich.daten);

        const suchen = (element, klasse) => {
            for (const kind of element.kinder || []) {
                if (String(kind.className || "").indexOf(klasse) !== -1) {
                    return kind;
                }
                const tiefer = suchen(kind, klasse);
                if (tiefer) {
                    return tiefer;
                }
            }
            return null;
        };

        if (suchen(TEAM_SCHACH.wurzelEl, "abschluss-punkte")) {
            throw new Error("die grosse Punktzahl steht noch da");
        }
        if (suchen(TEAM_SCHACH.wurzelEl, "abschluss-aufschluesselung")) {
            throw new Error("die Aufschluesselung steht noch da");
        }

        /* Der DOM-Nachbau reicht `textContent` NICHT an die Eltern durch —
           der Text muss also selbst eingesammelt werden. */
        const textSammeln = (element) => {
            let text = String(element.textContent || "");
            for (const kind of element.kinder || []) {
                text += " " + textSammeln(kind);
            }
            return text;
        };

        const text = textSammeln(TEAM_SCHACH.wurzelEl);
        if (text.indexOf("Punktestand ansehen") !== -1) {
            throw new Error("der Weg in die Rangliste ist noch offen");
        }
        if (text.indexOf("Gegen den Computer gibt es keine Punkte") === -1) {
            throw new Error("der erklaerende Satz fehlt — sonst sucht man die Punkte"
                + " (gezeichnet wurde: " + text.slice(0, 200) + ")");
        }
    } finally {
        TEAM_SCHACH.abgleich.daten = echteDaten;
        TEAM_SCHACH.abschluss = echterAbschluss;
        TEAM_SCHACH.offeneId = "";
    }
});

pruefe("Wer verliert, bekommt den Abschluss-Bildschirm", () => {
    let partie = SCHACH_TAFEL.partie(TEAM_SCHACH.abgleich.daten, kennungen.klein);
    partie = SCHACH_RUNDE.aufgeben(partie, "weiss", 3200);

    const neueTafel = SCHACH_TAFEL.partieEinsetzen(TEAM_SCHACH.abgleich.daten, partie, 3200);
    TEAM_SCHACH.abgleich.daten = neueTafel;
    TEAM_SCHACH.partieOeffnen(kennungen.klein);

    /*
     * SEIT v0.61 KOMMT DIE RÜCKSCHAU ZUERST (Schritt 0, Wunsch #7): erst
     * WARUM es so ausging, dann Gewonnen/Verloren, dann der Punktestand.
     */
    if (!TEAM_SCHACH.abschluss || TEAM_SCHACH.abschluss.schritt !== 0) {
        throw new Error("kein Abschluss-Bildschirm");
    }

    if (!TEAM_SCHACH.wurzelEl.kinder[0].classList.contains("abschluss-rueckschau")) {
        throw new Error("die Rueckschau fehlt");
    }

    /*
     * ZWEI SPALTEN (v0.64): links die Schlussstellung, rechts der Text. Das
     * Brett hat so viele Felder wie das Brett der Partie — sonst zeigt es eine
     * andere Stellung als die, um die es geht.
     */
    const suchen = (element, klasse) => {
        for (const kind of element.kinder || []) {
            if (String(kind.className || "").indexOf(klasse) !== -1) {
                return kind;
            }
            const tiefer = suchen(kind, klasse);
            if (tiefer) {
                return tiefer;
            }
        }
        return null;
    };

    const brettSpalte = suchen(TEAM_SCHACH.wurzelEl, "rueckschau-brett");
    const textSpalte = suchen(TEAM_SCHACH.wurzelEl, "rueckschau-text");

    if (!brettSpalte || !textSpalte) {
        throw new Error("die Rueckschau hat keine zwei Spalten");
    }

    const schluss = suchen(brettSpalte, "vorschau");
    const partieJetzt = SCHACH_TAFEL.partie(TEAM_SCHACH.abgleich.daten, kennungen.klein);
    const erwartet = SCHACH.felderVon(partieJetzt.stand);

    if (!schluss || schluss.kinder.length < erwartet) {
        throw new Error("die Schlussstellung fehlt oder ist unvollstaendig");
    }

    /* Erster Schritt weiter: Anna spielt Weiss und hat aufgegeben — sie sieht
       den Verlierer-Schirm. */
    TEAM_SCHACH.abschluss.schritt = 1;
    TEAM_SCHACH.zeichnen(TEAM_SCHACH.abgleich.daten);

    const flaeche = TEAM_SCHACH.wurzelEl.kinder[0];
    if (!flaeche.classList.contains("abschluss-niederlage")) {
        throw new Error("nicht als Niederlage gezeichnet");
    }

    /* Zweiter Schritt: der Punktestand. */
    TEAM_SCHACH.abschluss.schritt = 2;
    TEAM_SCHACH.zeichnen(TEAM_SCHACH.abgleich.daten);

    if (!TEAM_SCHACH.wurzelEl.kinder[0].classList.contains("abschluss-stand")) {
        throw new Error("kein Punktestand");
    }

    /* Danach zurück in die Übersicht — und nicht wieder von vorn. */
    TEAM_SCHACH.abschlussSchliessen(kennungen.klein);

    if (TEAM_SCHACH.abschluss || TEAM_SCHACH.offeneId) {
        throw new Error("Abschluss nicht geschlossen");
    }

    TEAM_SCHACH.partieOeffnen(kennungen.klein);
    if (TEAM_SCHACH.abschluss) {
        throw new Error("der Abschluss darf nicht erneut kommen");
    }
    TEAM_SCHACH.offeneId = "";
});

pruefe("Beendete Partien stehen nicht im Zwischenbildschirm — sie sind umgezogen (v0.37.0)", () => {
    /*
     * Bis v0.36.0 hingen sie als zugeklappter Kasten unter den offenen
     * Partien. Seit v0.37.0 wohnen sie hinter dem Verlauf-Zeichen des
     * Starts (Nutzer-Ansage 24.08.2026) — hier darf davon nichts mehr
     * stehen, und der Kasten muss anderswo zu bauen sein.
     */
    TEAM_SCHACH.zeichnen(TEAM_SCHACH.abgleich.daten);

    const kasten = TEAM_SCHACH.wurzelEl.kinder.find((kind) => kind.tagName === "details");
    if (kasten) {
        throw new Error("die beendeten Partien haengen noch im Zwischenbildschirm");
    }

    const person = umgebung.ICH.person();
    if (!TEAM_SCHACH.verlaufKastenBauen(TEAM_SCHACH.abgleich.daten, person)) {
        throw new Error("verlaufKastenBauen liefert nichts — die Partien sind"
            + " nicht umgezogen, sondern verschwunden");
    }
});

/*
 * NUR DIE EIGENE HISTORIE (v0.59, Wunsch #8) — und mit Sieger und Verlierer
 * beschriftet (Wunsch #18).
 *
 * Anna spielt in jeder Partie mit; die beendete kleine Partie steht also in
 * ihrem Kasten. Wird sie aus beiden Teams entfernt, verschwindet der Kasten
 * ganz — die Partie selbst bleibt dabei in der Tafel stehen.
 */
pruefe("Die Historie zeigt nur eigene Partien, mit Sieger und Verlierer (v0.59)", () => {
    TEAM_SCHACH.zeichnen(TEAM_SCHACH.abgleich.daten);

    /* Seit v0.37.0 wohnt die Historie hinter dem Verlauf-Zeichen des
       Starts; gebaut wird sie weiterhin hier. */
    const kastenSuchen = () => TEAM_SCHACH.verlaufKastenBauen(
        TEAM_SCHACH.abgleich.daten, umgebung.ICH.person());

    const kasten = kastenSuchen();
    if (!kasten) {
        throw new Error("kein Kasten fuer beendete Partien");
    }

    /* Irgendwo im Kasten steht, wer Sieger und wer Verlierer war. */
    let gefunden = "";
    const durchsuchen = (element) => {
        if (String(element.className || "").indexOf("team-namen") !== -1) {
            gefunden += String(element.textContent || "");
        }
        for (const kind of element.kinder || []) {
            durchsuchen(kind);
        }
    };
    durchsuchen(kasten);

    if (gefunden.indexOf("Sieger") === -1 || gefunden.indexOf("Verlierer") === -1) {
        throw new Error("Sieger/Verlierer fehlen: " + gefunden);
    }

    /* Ohne Anna in den Teams ist es nicht mehr ihre Partie. */
    const vorher = TEAM_SCHACH.abgleich.daten;
    let partie = SCHACH_RUNDE.kopieren(SCHACH_TAFEL.partie(vorher, kennungen.klein));
    partie.teams.weiss = [];
    partie.teams.schwarz = [];

    TEAM_SCHACH.abgleich.daten = SCHACH_TAFEL.partieEinsetzen(vorher, partie, 3210);
    TEAM_SCHACH.zeichnen(TEAM_SCHACH.abgleich.daten);

    if (kastenSuchen()) {
        throw new Error("fremde beendete Partie steht in der eigenen Historie");
    }

    /* Ausgangslage wiederherstellen — die folgenden Tests rechnen damit. */
    TEAM_SCHACH.abgleich.daten = vorher;
    TEAM_SCHACH.zeichnen(vorher);
});

pruefe("Eine neu erschienene Lootbox verdeckt die Zugspur nicht (v0.69, Wunsch #30)", () => {
    /*
     * DER FEHLER: Spur und Bewegung lasen beide den LETZTEN Verlaufseintrag.
     * Erscheint nach dem Zug eine neue Lootbox, haengt `_bonusNachziehen`
     * einen Eintrag mit `von: -1, nach: -1` hinten an — und damit fiel beides
     * heraus. Der Zug war passiert, aber nichts zeigte ihn. Beim Springer fiel
     * es am meisten auf, weil sein L ohne Spur kaum nachzuvollziehen ist.
     */
    const angelegt = SCHACH_TAFEL.partieAnlegen(
        TEAM_SCHACH.abgleich.daten, "standard", "Spur", 7000);

    let partie = SCHACH_RUNDE.teamBeitreten(angelegt.partie, "id-anna", "weiss", 7000);
    partie = SCHACH_RUNDE.teamBeitreten(partie, "id-bert", "schwarz", 7000);
    partie = bereitUndAufgestellt(partie, "weiss", 7000);
    partie = bereitUndAufgestellt(partie, "schwarz", 7000);

    /* Ein Springerzug — und danach von Hand der Eintrag, den das Erscheinen
       einer Lootbox schreibt. */
    partie = SCHACH_RUNDE.ziehen(partie, "id-anna",
        SCHACH.feldNummer("b1"), SCHACH.feldNummer("c3"), "D", "Anna", 7010);

    partie = SCHACH_RUNDE.kopieren(partie);
    partie.verlauf.push({
        text: "Eine Lootbox erscheint auf d5", wer: "", farbe: "schwarz",
        von: -1, nach: -1, wirkung: "erscheint",
        felder: [SCHACH.feldNummer("d5")], wege: []
    });

    const gefunden = TEAM_SCHACH._letzterBewegungsEintrag(partie);

    if (!gefunden || gefunden.von !== SCHACH.feldNummer("b1")) {
        throw new Error("der Springerzug wird nicht mehr gefunden");
    }

    /* Und die Spur liegt wirklich auf dem L des Springers. */
    const spur = TEAM_SCHACH._letzteSpur(partie);

    if (!spur.enden[SCHACH.feldNummer("b1")] || !spur.enden[SCHACH.feldNummer("c3")]) {
        throw new Error("die Spur nennt Start und Ziel nicht");
    }

    /* Ein Eintrag, der etwas bewirkt hat, wird dagegen NICHT uebersprungen. */
    partie.verlauf.push({
        text: "Fähigkeit Schutzschild eingesetzt", wer: "Anna", farbe: "weiss",
        von: -1, nach: -1, wirkung: "schutzschild",
        felder: [SCHACH.feldNummer("e2")], wege: []
    });

    if (TEAM_SCHACH._letzterBewegungsEintrag(partie).wirkung !== "schutzschild") {
        throw new Error("eine wirkende Faehigkeit darf nicht uebersprungen werden");
    }
});

pruefe("Ein Wuerfel auf dem Brett wird gezeichnet", () => {
    let partie = SCHACH_TAFEL.partie(TEAM_SCHACH.abgleich.daten, kennungen.faehigkeiten);
    partie = SCHACH_RUNDE.kopieren(partie);
    partie.bonus.push({ feld: SCHACH.feldNummer("d5"), art: "nudelholz" });

    TEAM_SCHACH.abgleich.daten = SCHACH_TAFEL.partieEinsetzen(
        TEAM_SCHACH.abgleich.daten, partie, 3150);
    TEAM_SCHACH.partieOeffnen(partie.id);

    const zelle = TEAM_SCHACH.wurzelEl.querySelector(
        "[data-feld=\"" + SCHACH.feldNummer("d5") + "\"]");
    if (!zelle) {
        throw new Error("Feld nicht gezeichnet");
    }

    const wuerfel = zelle.kinder.find((kind) => kind.attribute
        && kind.attribute["class"] === "wuerfel");
    if (!wuerfel) {
        throw new Error("kein Wuerfel auf dem Feld");
    }
    /*
     * Seit v0.24.0 ist es GENAU EIN Teil: das gerenderte Bild. Bis v0.23.0
     * lag ein gezeichnetes Fragezeichen darueber, bis v0.22.0 waren es vier
     * Teile — drei gezeichnete Seitenflaechen plus Zeichen.
     */
    if (wuerfel.kinder.length !== 1) {
        throw new Error("Wuerfel hat " + wuerfel.kinder.length + " Teile statt 1");
    }

    const bild = wuerfel.kinder[0];
    if (bild.tagName !== "image") {
        throw new Error("das erste Teil ist kein Bild, sondern: " + bild.tagName);
    }
    if (String(bild.attribute["href"] || "").indexOf("lootbox-") === -1) {
        throw new Error("das Bild zeigt keine Lootbox: " + bild.attribute["href"]);
    }
});

/*
 * Der Fehler aus v3.3: Die Karte hing an der Spielart statt am Schalter der
 * Partie. Wer klassisch mit zugeschalteten Wuerfeln spielte, sah die Wuerfel
 * auf dem Brett, konnte das Eingesammelte aber nirgends einsetzen.
 */
pruefe("Klassisch mit zugeschalteten Wuerfeln zeigt die Faehigkeiten-Karte", () => {
    const angelegt = SCHACH_TAFEL.partieAnlegen(
        TEAM_SCHACH.abgleich.daten, "standard", "Klassisch mit Wuerfeln", 6100,
        { faehigkeiten: true, seltenheitZeigen: true, einigkeit: false });

    let partie = SCHACH_RUNDE.teamBeitreten(angelegt.partie, "id-anna", "weiss", 6100);
    partie = SCHACH_RUNDE.teamBeitreten(partie, "id-bert", "schwarz", 6100);
    partie = bereitUndAufgestellt(partie, "weiss", 6100);
    partie = bereitUndAufgestellt(partie, "schwarz", 6100);

    TEAM_SCHACH.abgleich.daten = SCHACH_TAFEL.partieEinsetzen(angelegt.tafel, partie, 6100);
    TEAM_SCHACH.partieOeffnen(partie.id);

    if (faehigkeitenZeilen().length === 0) {
        throw new Error("keine Faehigkeiten-Karte trotz eingeschalteter Wuerfel");
    }
});

pruefe("Klassisch ohne Wuerfel zeigt die Karte weiterhin nicht", () => {
    TEAM_SCHACH.partieOeffnen(kennungen.standard);

    if (faehigkeitenZeilen().length !== 0) {
        throw new Error("Faehigkeiten-Karte trotz abgeschalteter Wuerfel");
    }

    /* Ausgangslage fuer die folgenden Tests wiederherstellen. */
    TEAM_SCHACH.partieOeffnen(kennungen.faehigkeiten);
});

pruefe("Gegen den Computer startet die Partie auch nach einem Hin und Her (v0.64.1)", () => {
    /*
     * DER GEMELDETE FEHLER (Nutzer, 25.08.2026): „Manchmal beginnt das Spiel
     * nicht, auch wenn ich gegen den Bot spiele und wir beide auf bereit
     * gedrueckt haben."
     *
     * URSACHE: `bereitSetzen(false)` streicht seit v0.62.0 die
     * Aufstellungs-Zusage BEIDER Seiten. Der Computer erneuerte seine nur
     * beim Einsteigen — und einsteigen tut er genau einmal. Wer einmal „Doch
     * nicht bereit" drueckte, hatte danach einen Computer, der nie wieder
     * zusagte.
     *
     * GEPRUEFT WIRD DER GANZE WEG ueber `bereitUmschalten`, nicht nur die
     * Modellfunktion: Der Fehler sass genau in der Naht zwischen Bildschirm
     * und Bot, und ein Test am Modell allein haette ihn nie gesehen.
     *
     * MIT ZUFALLSARMEE, seit Punkt 8 (27.08.2026): Das Hin und Her um die
     * Aufstellung gibt es nur noch, wo gewuerfelt wird — ohne Zufallsarmee
     * pfiffe schon die Seitenwahl an, und der v0.64.1-Fehler sass genau in
     * der Aufstellung. `bereitUmschalten(true)` gibt es am Bildschirm nicht
     * mehr (der Tipp auf die Seite setzt die Zusage), die Funktion selbst
     * bleibt fuer die Ruecknahme — und genau die prueft dieser Test mit.
     */
    const person = umgebung.ICH.person();
    const echteDaten = TEAM_SCHACH.abgleich.daten;
    const echteOffene = TEAM_SCHACH.offeneId;

    try {
        const angelegt = SCHACH_TAFEL.partieAnlegen(
            SCHACH_TAFEL.leereTafel(9300), "standard", "Bot-Start", 9310);
        let partie = angelegt.partie;
        partie.regeln = Object.assign({}, partie.regeln,
            { botStufe: "leicht", zufallsArmee: true });
        partie = SCHACH_RUNDE.teamBeitreten(partie, person.id, "weiss", 9320);

        TEAM_SCHACH.abgleich.daten = SCHACH_TAFEL.partieEinsetzen(
            SCHACH_TAFEL.leereTafel(9300), partie, 9330);
        TEAM_SCHACH.offeneId = partie.id;

        const hole = () => SCHACH_TAFEL.partie(TEAM_SCHACH.abgleich.daten, partie.id);

        /* Bereit — zurueck — wieder bereit. Genau der gemeldete Weg. */
        TEAM_SCHACH.bereitUmschalten(hole(), "weiss", true);
        TEAM_SCHACH.bereitUmschalten(hole(), "weiss", false);
        TEAM_SCHACH.bereitUmschalten(hole(), "weiss", true);

        const nachHinUndHer = hole();
        if (nachHinUndHer.aufstellungBereit.schwarz !== true) {
            throw new Error("der Computer hat seine Zusage nicht erneuert");
        }
        if (!SCHACH_RUNDE.inAufstellung(nachHinUndHer)) {
            throw new Error("die Runde steht nicht in der Aufstellung");
        }

        /* Und das zweite Bereit pfeift an. */
        TEAM_SCHACH.aufstellungBereitUmschalten(hole(), "weiss", true);

        if (hole().laeuft !== true) {
            throw new Error("die Partie beginnt nicht, obwohl beide zugesagt haben");
        }
    } finally {
        TEAM_SCHACH.abgleich.daten = echteDaten;
        TEAM_SCHACH.offeneId = echteOffene;
    }
});


pruefe("Der Team-Kasten: Farbe gross, erster Name klein, Rest hinter einem Tipp (v0.68.0)", () => {
    /*
     * NUTZER-ANSAGE 25.08.2026: „Ein grosser Kasten mit Team plus dem ersten
     * Benutzer — alle weiteren erscheinen, wenn man drauf klickt. Weiss
     * gross und der erste Name klein drunter, nicht nebendran."
     */
    const person = umgebung.ICH.person();
    const partie = SCHACH_RUNDE.kopieren(
        SCHACH_TAFEL.partie(TEAM_SCHACH.abgleich.daten, kennungen.standard));

    /* Drei auf einer Seite: der erste steht da, die anderen zwei nicht. */
    partie.teams.weiss = ["id-anna", "id-bert", "id-cem"];

    const kasten = TEAM_SCHACH._spielerZeileBauen(partie, person, "weiss");

    const textVon = (klasse) => {
        const treffer = [];
        const suchen = (element) => {
            for (const kind of element.kinder || []) {
                if (String(kind.className || "").indexOf(klasse) !== -1) {
                    treffer.push(String(kind.textContent || ""));
                }
                suchen(kind);
            }
        };
        suchen(kasten);
        return treffer;
    };

    if (textVon("spieler-farbe")[0] !== "Weiss") {
        throw new Error("die Farbe steht nicht als Ueberschrift da");
    }

    const namen = textVon("spieler-name");
    if (namen.length !== 1) {
        throw new Error("es steht nicht genau ein Name da, sondern " + namen.length);
    }
    if (namen[0].indexOf(",") !== -1) {
        throw new Error("die Namen stehen aneinandergereiht: " + namen[0]);
    }

    /* Die Zahl sagt, dass mehr dahinterstehen. */
    if (textVon("spieler-mehr")[0] !== "+2") {
        throw new Error("die Zahl der weiteren fehlt: "
            + textVon("spieler-mehr").join("/"));
    }

    /* Farbe UND Name liegen im selben Stapel, also untereinander. */
    const stapel = (kasten.kinder || []).find((kind) =>
        String(kind.className || "").indexOf("spieler-stapel") !== -1);
    if (!stapel) {
        throw new Error("es gibt keinen Stapel aus Farbe und Name");
    }

    /*
     * DIE VOLLE LISTE LIEGT SEIT v0.80.0 HINTER ZWEI WEGEN: Der EIGENE
     * Kasten klappt sein Menue auf (seit v0.81.0 IM Kasten; dort haengt
     * der „+2"-Knopf), der Kasten des GEGNERS oeffnet die Liste direkt.
     */
    if (String(kasten.className || "").indexOf("spieler-zeile-tippbar") === -1) {
        throw new Error("der eigene Kasten ist nicht antippbar");
    }

    const echterHinweis = umgebung.DIALOG.hinweis;
    let gezeigt = null;
    try {
        umgebung.DIALOG.hinweis = async (titel, text, zusatz) => {
            gezeigt = { titel: titel, zusatz: zusatz };
            return true;
        };

        /* Weg 1 — mein Kasten: Tipp klappt das Menue auf, die Liste haengt
           dort als „+2"-Knopf. */
        kasten.ausloesen("click");
        if (TEAM_SCHACH.eckMenueOffen !== true) {
            throw new Error("der Tipp auf den eigenen Kasten oeffnet das Menue nicht");
        }
        const offenerKasten = TEAM_SCHACH._spielerZeileBauen(partie, person, "weiss");
        const alleKnoepfe = [];
        const einsammeln = (kind) => {
            if (kind.tagName === "button") {
                alleKnoepfe.push(kind);
            }
            for (const enkel of kind.kinder || []) {
                einsammeln(enkel);
            }
        };
        einsammeln(offenerKasten);
        const teamKnopf = alleKnoepfe.find((kind) =>
            String(kind.textContent || "") === "+2");
        if (!teamKnopf) {
            throw new Error("im Kasten fehlt der Team-Knopf (+2)");
        }
        teamKnopf.ausloesen("click");

        if (!gezeigt || String(gezeigt.titel || "").indexOf("Weiss") === -1) {
            throw new Error("der Team-Knopf oeffnet kein Team-Fenster");
        }
        const zeilen = ((gezeigt.zusatz || {}).kinder || []).length;
        if (zeilen !== 3) {
            throw new Error("das Fenster zeigt nicht alle drei, sondern " + zeilen);
        }

        /* Weg 2 — der Kasten des Gegners (aus Sicht von Bert ist Weiss der
           Gegner): der Tipp oeffnet die Liste direkt. */
        gezeigt = null;
        const gegnerSicht = { id: "id-zaungast", name: "Zaungast" };
        const fremd = TEAM_SCHACH._spielerZeileBauen(partie, gegnerSicht, "weiss");
        if (String(fremd.className || "").indexOf("spieler-zeile-tippbar") === -1) {
            throw new Error("der fremde Kasten mit dreien ist nicht antippbar");
        }
        fremd.ausloesen("click");
        if (!gezeigt || String(gezeigt.titel || "").indexOf("Weiss") === -1) {
            throw new Error("der fremde Kasten oeffnet kein Team-Fenster");
        }
    } finally {
        umgebung.DIALOG.hinweis = echterHinweis;
        TEAM_SCHACH.eckMenueOffen = false;
    }

    /* Ein fremder Kasten mit nur einem Spieler bleibt stumm; der eigene ist
       seit v0.80.0 IMMER antippbar — hinter ihm liegt ja das Menue. */
    const alleine = SCHACH_RUNDE.kopieren(partie);
    alleine.teams.weiss = ["id-anna"];
    const fremdEiner = TEAM_SCHACH._spielerZeileBauen(
        alleine, { id: "id-zaungast", name: "Zaungast" }, "weiss");
    if (String(fremdEiner.className || "").indexOf("spieler-zeile-tippbar") !== -1) {
        throw new Error("ein fremder Kasten mit einem Namen ist trotzdem antippbar");
    }
    const eigenerEiner = TEAM_SCHACH._spielerZeileBauen(alleine, person, "weiss");
    if (String(eigenerEiner.className || "").indexOf("spieler-zeile-tippbar") === -1) {
        throw new Error("der eigene Kasten traegt sein Menue nicht");
    }
});

pruefe("Gleiche Faehigkeiten stehen als EIN Stapel mit Anzahl (v0.67.0)", () => {
    /*
     * NUTZER-ANSAGE 25.08.2026: „Nicht das alte Item-Rechteck mit Schrift,
     * sondern nur das Symbol mit der Umrandung — gruppiert hintereinander
     * gestapelt."
     *
     * Geprueft wird beides: dass gleiche Arten zusammengezaehlt werden (aus
     * drei Karten wird eine mit einer 3) und dass auf der Karte kein Wort
     * mehr steht.
     */
    const person = umgebung.ICH.person();
    const partie = SCHACH_RUNDE.kopieren(
        SCHACH_TAFEL.partie(TEAM_SCHACH.abgleich.daten, kennungen.faehigkeiten));
    const meinTeam = SCHACH_RUNDE.teamVon(partie, person.id);

    partie.faehigkeiten[meinTeam] = ["sprung", "frost", "sprung", "sprung"];

    const reihe = TEAM_SCHACH._faehigkeitReiheBauen(partie, person, meinTeam);
    const karten = (reihe.kinder || []).filter((kind) =>
        String(kind.className || "").indexOf("faehigkeit-knopf") !== -1);

    if (karten.length !== 2) {
        throw new Error("aus vier Faehigkeiten wurden nicht zwei Stapel, "
            + "sondern " + karten.length);
    }

    /* Die erste ist der Dreier-Stapel Sprung. */
    const anzahl = (karte) => {
        const marke = (karte.kinder || []).find((kind) =>
            String(kind.className || "").indexOf("faehigkeit-anzahl") !== -1);
        return marke ? String(marke.textContent || "") : "";
    };

    if (anzahl(karten[0]) !== "3") {
        throw new Error("der Sprung-Stapel zeigt nicht 3, sondern: "
            + anzahl(karten[0]));
    }

    /* Der einzelne Frost traegt KEINE Zahl — eine 1 an jeder Karte waere
       Laerm. */
    if (anzahl(karten[1]) !== "") {
        throw new Error("die einzelne Faehigkeit traegt eine Zahl: "
            + anzahl(karten[1]));
    }

    /* Kein Wort mehr auf der Karte, aber ein Zeichen darin. */
    if (!(karten[0].kinder || []).some((kind) => kind.tagName === "svg")) {
        throw new Error("auf der Karte steht kein Zeichen");
    }

    /* Der Name steht weiter fuer Vorleseprogramme und im Kurzhinweis da —
       sonst waere die Karte fuer sie ein leerer Knopf. */
    const beschriftung = String(karten[0].attribute["aria-label"] || "");
    if (beschriftung.indexOf("Sprung") === -1) {
        throw new Error("die Karte nennt ihren Namen nicht: " + beschriftung);
    }
    if (beschriftung.indexOf("3") === -1) {
        throw new Error("die Karte nennt ihre Anzahl nicht: " + beschriftung);
    }
    if (String(karten[0].title || "").indexOf("Sprung") === -1) {
        throw new Error("der Kurzhinweis nennt den Namen nicht: " + karten[0].title);
    }
});

pruefe("Die Anordnung der dritten Skizze: Eck-Kasten mit Friedhof-Streifen (v0.80.0)", () => {
    /*
     * NUTZER-SKIZZE 26.08.2026 (die dritte):
     *
     *     [Karten Gegner ........]  [ Banner Gegner ]
     *                               [ Pfeil/Friedhof]
     *                    B R E T T
     *     [ Pfeil/Friedhof]
     *     [ Banner ich    ]  [........ Karten ich ]
     *
     * Der Pfeil-Streifen sitzt an der BRETTSEITE des Namens-Kastens und
     * klappt den Friedhof an Ort und Stelle auf; die Steuer-Spalten der
     * zweiten Skizze sind weg. Geprueft wird die Reihenfolge im Baum —
     * sie ist die Lesereihenfolge der Skizze.
     */
    TEAM_SCHACH.partieOeffnen(kennungen.faehigkeiten);
    const kinder = TEAM_SCHACH.wurzelEl.kinder;

    const stelle = (passt) => kinder.findIndex(passt);
    const brett = stelle((k) => hatKlasse(k, "brett-halter"));
    const obenReihe = stelle((k) => hatKlasse(k, "seiten-reihe-oben"));
    const untenReihe = stelle((k) => hatKlasse(k, "seiten-reihe-unten"));

    if (obenReihe < 0 || untenReihe < 0) {
        throw new Error("die zwei Seiten-Zeilen fehlen");
    }
    if (!(obenReihe < brett && brett < untenReihe)) {
        throw new Error("die Seiten stehen nicht ueber und unter dem Brett: "
            + obenReihe + " / " + brett + " / " + untenReihe);
    }

    /* Die Steuer-Spalten gibt es seit v0.80.0 nicht mehr. */
    if (kinder.some((k) => hatKlasse(k, "steuer-spalte"))) {
        throw new Error("es steht noch eine Steuer-Spalte im Baum");
    }

    /* Jede Seiten-Zeile traegt Karten, Banner UND ihren Friedhof-Streifen. */
    for (const stelleReihe of [obenReihe, untenReihe]) {
        const zeile = kinder[stelleReihe];
        if (!klasseSuchen(zeile, "spieler-zeile")) {
            throw new Error("in einer Seiten-Zeile fehlt der Banner");
        }
        if (!klasseSuchen(zeile, "faehigkeit-reihe")) {
            throw new Error("in einer Seiten-Zeile fehlen die Karten");
        }
        if (!klasseSuchen(zeile, "friedhof-streifen")) {
            throw new Error("in einer Seiten-Zeile fehlt der Friedhof-Streifen");
        }
    }

    /*
     * DIE LESEREIHENFOLGE DER ECKEN: Oben [Karten][Banner][Streifen] —
     * der Streifen zuletzt, denn er ist die Unterkante des Eck-Kastens.
     * Unten beginnt die Zeile mit ihm: [Streifen][Banner][Karten].
     */
    const folge = (zeile) => (zeile.kinder || []).map((k) => {
        if (hatKlasse(k, "spieler-zeile")) { return "banner"; }
        if (hatKlasse(k, "friedhof-streifen")) { return "streifen"; }
        return "karten";
    }).join(",");

    if (folge(kinder[obenReihe]) !== "karten,banner,streifen") {
        throw new Error("obere Zeile falsch geordnet: " + folge(kinder[obenReihe]));
    }
    if (folge(kinder[untenReihe]) !== "streifen,banner,karten") {
        throw new Error("untere Zeile falsch geordnet: " + folge(kinder[untenReihe]));
    }
});

pruefe("Der Friedhof ist offen, sobald jemand faellt — und vorher zu (v0.81.0)", () => {
    /*
     * Nutzer-Ansagen 26.08.2026: „standardmaessig ausgeklappt", aber „wenn
     * keine geschlagen wurden, soll es nicht aufgehen". Solange niemand
     * gefallen ist, gibt es also keine Klappe und der Streifen ist kein
     * Knopf; mit der ersten gefallenen Figur steht die Klappe von selbst
     * zwischen Eck-Kasten und Brett. Zuklappen bleibt ein Tipp.
     */
    TEAM_SCHACH.partieOeffnen(kennungen.faehigkeiten);

    const klappen = () => TEAM_SCHACH.wurzelEl.kinder
        .filter((k) => hatKlasse(k, "friedhof-klappe")).length;

    /* Niemand gefallen: keine Klappe, Streifen abgeschaltet. */
    if (klappen() !== 0) {
        throw new Error("eine Friedhof-Klappe steht da, obwohl niemand fiel");
    }
    const leererStreifen = klasseSuchen(TEAM_SCHACH.wurzelEl, "friedhof-streifen");
    if (!leererStreifen.disabled) {
        throw new Error("der Streifen ist bei 0 Gefallenen nicht abgeschaltet");
    }

    /* Jemand faellt (der additive Weg: `verloren` traegt die Gefallenen).
       `SCHACH_TAFEL.partie` liefert eine KOPIE — geaendert wird deshalb
       ueber `partieEinsetzen`, wie im echten Ablauf. */
    const echteDaten = TEAM_SCHACH.abgleich.daten;
    const partie = SCHACH_RUNDE.kopieren(
        SCHACH_TAFEL.partie(echteDaten, kennungen.faehigkeiten));
    partie.verloren = { weiss: ["B"], schwarz: ["B", "B", "D"] };
    try {
        TEAM_SCHACH.abgleich.daten =
            SCHACH_TAFEL.partieEinsetzen(echteDaten, partie, 9500);
        TEAM_SCHACH.zeichnen(TEAM_SCHACH.abgleich.daten);

        /* BEIDE Klappen stehen von selbst da — ohne einen einzigen Tipp. */
        if (klappen() !== 2) {
            throw new Error("erwartet zwei offene Klappen, da sind: " + klappen());
        }
        const kinder = TEAM_SCHACH.wurzelEl.kinder;
        const brett = kinder.findIndex((k) => hatKlasse(k, "brett-halter"));
        const obenReihe = kinder.findIndex((k) => hatKlasse(k, "seiten-reihe-oben"));
        const obenKlappe = kinder.findIndex((k) => hatKlasse(k, "friedhof-klappe"));
        if (!(obenReihe < obenKlappe && obenKlappe < brett)) {
            throw new Error("die obere Klappe steht nicht zwischen Eck-Kasten und Brett");
        }

        /* Ein Tipp klappt zu, der naechste wieder auf. */
        const obenFarbe = "schwarz";
        TEAM_SCHACH.friedhofUmschalten(obenFarbe);
        if (klappen() !== 1) {
            throw new Error("der Tipp klappt die Klappe nicht zu");
        }
        TEAM_SCHACH.friedhofUmschalten(obenFarbe);
        if (klappen() !== 2) {
            throw new Error("der zweite Tipp klappt sie nicht wieder auf");
        }

        /*
         * DER INHALT DER KLAPPE (v0.81.0): links die Bilanz, rechts die
         * gruppierten Figuren — „2x" UNTER der Figur, kein Erklaertext.
         * Schwarz hat zwei Bauern und eine Dame verloren: zwei Saeulen,
         * eine davon mit „2x".
         */
        const schwarzKlappe = kinder.filter((k) => hatKlasse(k, "friedhof-klappe"))
            .find((k) => String(k.className || "").indexOf("friedhof-klappe-schwarz") !== -1);
        if (!schwarzKlappe) {
            throw new Error("keine Klappe fuer Schwarz");
        }
        if (!klasseSuchen(schwarzKlappe, "friedhof-bilanz")) {
            throw new Error("in der Klappe fehlt die Bilanz-Zahl");
        }
        if (klasseSuchen(schwarzKlappe, "erklaerung")) {
            throw new Error("in der Klappe steht noch Erklaertext");
        }
        const saeulen = klasseZaehlen(schwarzKlappe, "friedhof-saeule");
        if (saeulen !== 2) {
            throw new Error("erwartet zwei Figuren-Saeulen (Bauer, Dame), da sind: "
                + saeulen);
        }
        const zaehler = [];
        const sammeln = (kind) => {
            if (String(kind.className || "").indexOf("friedhof-anzahl") !== -1) {
                zaehler.push(String(kind.textContent || ""));
            }
            for (const enkel of kind.kinder || []) {
                sammeln(enkel);
            }
        };
        sammeln(schwarzKlappe);
        if (zaehler.indexOf("2x") === -1 || zaehler.indexOf("1x") === -1) {
            throw new Error("die Saeulen zaehlen falsch: " + zaehler.join("/"));
        }
    } finally {
        TEAM_SCHACH.abgleich.daten = echteDaten;
        TEAM_SCHACH.friedhofOffen = { weiss: true, schwarz: true };
        TEAM_SCHACH.zeichnen(TEAM_SCHACH.abgleich.daten);
    }
});

pruefe("Der eigene Namens-Kasten klappt sein Menue IM Kasten auf (v0.81.0)", () => {
    /*
     * Nutzer-Ansage 26.08.2026, zweite Fassung: „die Knöpfe sollen in dem
     * Kasten erscheinen" — Zahnrad und Verlaufs-Zeichen tauchen an der
     * Stelle der Lage auf, keine eigene Zeile mehr (die gab es nur in
     * v0.80.0).
     */
    TEAM_SCHACH.partieOeffnen(kennungen.faehigkeiten);

    const eckKnoepfe = () => {
        const gefunden = [];
        const suchen = (kind) => {
            if (String(kind.className || "").indexOf("eck-knopf") !== -1) {
                gefunden.push(kind);
            }
            for (const enkel of kind.kinder || []) {
                suchen(enkel);
            }
        };
        suchen(TEAM_SCHACH.wurzelEl);
        return gefunden;
    };

    if (eckKnoepfe().length !== 0) {
        throw new Error("die Menue-Knoepfe stehen schon beim Oeffnen da");
    }

    TEAM_SCHACH.eckMenueUmschalten();
    try {
        const offen = eckKnoepfe();
        if (offen.length < 2) {
            throw new Error("nach dem Tipp fehlen die zwei Menue-Knoepfe ("
                + offen.length + ")");
        }
        /* Sie wohnen IM eigenen Kasten, nicht daneben. */
        const zeile = klasseSuchen(TEAM_SCHACH.wurzelEl, "spieler-zeile-meine");
        if (!zeile || !klasseSuchen(zeile, "eck-knopf")) {
            throw new Error("die Menue-Knoepfe stehen nicht im eigenen Kasten");
        }
    } finally {
        TEAM_SCHACH.eckMenueUmschalten();
    }

    if (eckKnoepfe().length !== 0) {
        throw new Error("der zweite Tipp schliesst das Menue nicht");
    }
});

pruefe("Die Faehigkeiten flankieren das Brett: Gegner oben, ich unten (v0.57.0)", () => {
    /*
     * NUTZER-SKIZZE 25.08.2026: Die Faehigkeiten stehen als Kartenreihe am
     * Brett, die des Gegners OBEN, meine UNTEN. Geprueft wird genau diese
     * Anordnung im DOM: eine `faehigkeit-reihe` VOR dem Brett und eine
     * DAHINTER. Steht eine auf der falschen Seite, sitzt sie beim falschen
     * Spieler.
     *
     * SEIT v0.64.0 STECKT JEDE REIHE IN IHRER SEITEN-ZEILE (`seiten-reihe`,
     * zweite Nutzer-Skizze: Karten und Banner nebeneinander) — deshalb wird
     * die Suche eine Ebene tiefer gefuehrt. Die Frage bleibt dieselbe: oben
     * oder unten.
     */
    TEAM_SCHACH.partieOeffnen(kennungen.faehigkeiten);
    const kinder = TEAM_SCHACH.wurzelEl.kinder;

    const brett = kinder.findIndex((k) => hatKlasse(k, "brett-halter"));
    if (brett < 0) {
        throw new Error("kein Brett-Halter unter den Bereichen");
    }

    const reihen = [];
    kinder.forEach((k, i) => {
        if (hatKlasse(k, "faehigkeit-reihe") || klasseSuchen(k, "faehigkeit-reihe")) {
            reihen.push(i);
        }
    });

    if (!reihen.some((i) => i < brett)) {
        throw new Error("keine Faehigkeitsreihe ueber dem Brett (Gegner)");
    }
    if (!reihen.some((i) => i > brett)) {
        throw new Error("keine Faehigkeitsreihe unter dem Brett (ich)");
    }

    /*
     * OFFEN (Nutzer-Entscheidung 25.08.2026): Eine Faehigkeit im Vorrat des
     * Gegners wird als Karte gezeigt, nicht verborgen.
     */
    const person = umgebung.ICH.person();
    const partie = SCHACH_RUNDE.kopieren(
        SCHACH_TAFEL.partie(TEAM_SCHACH.abgleich.daten, kennungen.faehigkeiten));
    const meinTeam = SCHACH_RUNDE.teamVon(partie, person.id);
    const gegner = (meinTeam === "weiss") ? "schwarz" : "weiss";

    partie.faehigkeiten = { weiss: [], schwarz: [] };
    partie.faehigkeiten[gegner] = ["sprung"];

    const reihe = TEAM_SCHACH._faehigkeitReiheBauen(partie, person, gegner);
    if (!reihe || !klasseSuchen(reihe, "faehigkeit-knopf")) {
        throw new Error("die Faehigkeit des Gegners wird nicht offen als Karte gezeigt");
    }
});

pruefe("Wartet eine Faehigkeit auf ihr Ziel, sind die Felder markiert", () => {
    /*
     * Eine frische, laufende Partie, in der Anna wirklich am Zug ist. Seit
     * v4.0 wirft der Bildschirm eine Auswahl weg, sobald man nicht (mehr)
     * ziehen darf — der Test muss also eine Lage herstellen, die es im echten
     * Ablauf auch gibt.
     */
    const angelegt = SCHACH_TAFEL.partieAnlegen(
        TEAM_SCHACH.abgleich.daten, "faehigkeiten", "Zielwahl", 9400);

    let partie = SCHACH_RUNDE.teamBeitreten(angelegt.partie, "id-anna", "weiss", 9400);
    partie = SCHACH_RUNDE.teamBeitreten(partie, "id-bert", "schwarz", 9400);
    partie = bereitUndAufgestellt(partie, "weiss", 9400);
    partie = bereitUndAufgestellt(partie, "schwarz", 9400);

    TEAM_SCHACH.abgleich.daten = SCHACH_TAFEL.partieEinsetzen(angelegt.tafel, partie, 9400);

    /* Seit v0.56 wertet die Verstaerkung jede eigene Figur auf: 16 Steine
       minus dem einen Koenig, der stehen bleiben muss. */
    const felder = SCHACH_RUNDE.zielFelder(partie, "id-anna", "verstaerkung");
    if (felder.length !== 15) {
        throw new Error("erwartet 15 aufwertbare Figuren, waren " + felder.length);
    }

    TEAM_SCHACH.partieOeffnen(partie.id);
    TEAM_SCHACH.zielFaehigkeit = "verstaerkung";
    TEAM_SCHACH.zielFelder = felder;

    /* Die Auswahl gehoert zu DIESER Stellung — ohne den Zaehler wirft
       _auswahlPruefen sie beim naechsten Zeichnen weg (seit v4.0). */
    TEAM_SCHACH.auswahlZaehler = partie.zugZaehler;

    TEAM_SCHACH.zeichnen(TEAM_SCHACH.abgleich.daten);

    const zelle = TEAM_SCHACH.wurzelEl.querySelector(
        "[data-feld=\"" + SCHACH.feldNummer("e2") + "\"]");
    if (!zelle || !zelle.classList.contains("feld-wahl")) {
        throw new Error("das Zielfeld ist nicht markiert");
    }

    TEAM_SCHACH._auswahlAufheben();
    TEAM_SCHACH.zeichnen(TEAM_SCHACH.abgleich.daten);
});

pruefe("Ein Tipp setzt den Vorschau-Kasten, statt sofort einzusetzen (v0.57)", () => {
    /*
     * BIS v0.56 WIRKTE DER ERSTE TIPP SOFORT. Bei Mauer (drei Felder) und
     * Frost (2x2) sah man dabei nie, WO die Wirkung landet. Jetzt setzt der
     * Tipp den Kasten, und ausgefuehrt wird ueber "Einsetzen" unter dem Brett.
     */
    const angelegt = SCHACH_TAFEL.partieAnlegen(
        TEAM_SCHACH.abgleich.daten, "faehigkeiten", "Vorschau", 9500);

    let partie = SCHACH_RUNDE.teamBeitreten(angelegt.partie, "id-anna", "weiss", 9500);
    partie = SCHACH_RUNDE.teamBeitreten(partie, "id-bert", "schwarz", 9500);
    partie = bereitUndAufgestellt(partie, "weiss", 9500);
    partie = bereitUndAufgestellt(partie, "schwarz", 9500);
    partie.faehigkeiten.weiss.push("mauer");

    TEAM_SCHACH.abgleich.daten = SCHACH_TAFEL.partieEinsetzen(angelegt.tafel, partie, 9500);
    TEAM_SCHACH.partieOeffnen(partie.id);

    TEAM_SCHACH.zielFaehigkeit = "mauer";
    TEAM_SCHACH.zielFelder = SCHACH_RUNDE.zielFelder(partie, "id-anna", "mauer");
    TEAM_SCHACH.auswahlZaehler = partie.zugZaehler;

    const mitte = SCHACH.feldNummer("d4");
    TEAM_SCHACH.feldAngetippt(partie, { id: "id-anna", name: "Anna" }, mitte);

    /* Der Tipp darf NICHTS eingesetzt haben — die Faehigkeit liegt noch da. */
    if (TEAM_SCHACH.zielVorschau !== mitte) {
        throw new Error("der Kasten liegt nicht auf dem angetippten Feld");
    }
    if (TEAM_SCHACH.zielUmriss.length !== SCHACH.MAUER_LAENGE) {
        throw new Error("erwartet " + SCHACH.MAUER_LAENGE + " Felder im Umriss, waren "
            + TEAM_SCHACH.zielUmriss.length);
    }

    /* Und die drei Felder tragen den Rahmen, aussen mit Kanten. */
    for (const name of ["c4", "d4", "e4"]) {
        const zelle = TEAM_SCHACH.wurzelEl.querySelector(
            "[data-feld=\"" + SCHACH.feldNummer(name) + "\"]");

        if (!zelle || !zelle.classList.contains("feld-vorschau")) {
            throw new Error(name + " traegt keinen Vorschau-Rahmen");
        }
        if (!zelle.classList.contains("kante-oben")) {
            throw new Error(name + " hat keine Oberkante");
        }
    }

    const links = TEAM_SCHACH.wurzelEl.querySelector(
        "[data-feld=\"" + SCHACH.feldNummer("c4") + "\"]");
    if (!links.classList.contains("kante-links")) {
        throw new Error("das linke Ende hat keine linke Kante");
    }
    if (links.classList.contains("kante-rechts")) {
        throw new Error("innen darf keine Kante stehen");
    }

    TEAM_SCHACH._auswahlAufheben();
    TEAM_SCHACH.zeichnen(TEAM_SCHACH.abgleich.daten);
});

pruefe("Der Vorschau-Kasten laesst sich ziehen, ohne das Brett neu zu bauen (v0.84.0)", () => {
    /*
     * NUTZER-WUNSCH 26.08.2026: „Künftig zieht man den Bereich mit Finger
     * oder Maus frei über das Brett — nichts passiert, bis man bestätigt."
     *
     * Geprueft wird der Kern, den die Zeige-Ereignisse benutzen: Der Kasten
     * wandert auf ein anderes Feld (`vorschauSetzen`), und die Klassen am
     * BESTEHENDEN Brett ziehen mit (`_vorschauUmsetzen`) — ohne `zeichnen`,
     * denn ein Neubau mitten in der Bewegung nimmt dem Zeiger das Element
     * unter dem Finger weg.
     */
    const angelegt = SCHACH_TAFEL.partieAnlegen(
        TEAM_SCHACH.abgleich.daten, "faehigkeiten", "Ziehen", 9550);

    let partie = SCHACH_RUNDE.teamBeitreten(angelegt.partie, "id-anna", "weiss", 9550);
    partie = SCHACH_RUNDE.teamBeitreten(partie, "id-bert", "schwarz", 9550);
    partie = bereitUndAufgestellt(partie, "weiss", 9550);
    partie = bereitUndAufgestellt(partie, "schwarz", 9550);
    partie.faehigkeiten.weiss.push("mauer");

    TEAM_SCHACH.abgleich.daten = SCHACH_TAFEL.partieEinsetzen(angelegt.tafel, partie, 9550);
    TEAM_SCHACH.partieOeffnen(partie.id);

    const person = { id: "id-anna", name: "Anna" };
    TEAM_SCHACH.zielFaehigkeit = "mauer";
    TEAM_SCHACH.zielFelder = SCHACH_RUNDE.zielFelder(partie, "id-anna", "mauer");
    TEAM_SCHACH.auswahlZaehler = partie.zugZaehler;

    /* Erst wie gehabt antippen — das ist der Griff an den Rahmen. */
    TEAM_SCHACH.feldAngetippt(partie, person, SCHACH.feldNummer("d4"));

    const vorher = TEAM_SCHACH.wurzelEl.querySelector(
        "[data-feld=\"" + SCHACH.feldNummer("d4") + "\"]");
    if (!vorher || !vorher.classList.contains("feld-vorschau")) {
        throw new Error("der Kasten liegt nach dem Tipp nicht auf d4");
    }

    /* Und jetzt gezogen: dasselbe, was `pointermove` tut. */
    const ziel = SCHACH.feldNummer("d5");
    if (TEAM_SCHACH.zielFelder.indexOf(ziel) === -1) {
        throw new Error("d5 ist gar kein gueltiges Ziel, der Fall waere nicht nachgebaut");
    }

    if (!TEAM_SCHACH.vorschauSetzen(partie, person, ziel)) {
        throw new Error("der Kasten ist nicht auf d5 gewandert");
    }
    TEAM_SCHACH._vorschauUmsetzen(partie);

    /* Der Rahmen liegt jetzt dort — und NICHT mehr auf dem alten Platz. */
    const jetzt = TEAM_SCHACH.wurzelEl.querySelector(
        "[data-feld=\"" + ziel + "\"]");
    if (!jetzt || !jetzt.classList.contains("feld-vorschau")) {
        throw new Error("das gezogene Feld traegt keinen Rahmen");
    }
    if (vorher.classList.contains("feld-vorschau")) {
        throw new Error("der alte Rahmen klebt auf d4 fest");
    }
    if (vorher.classList.contains("kante-oben")) {
        throw new Error("die alten Kanten wurden nicht abgeraeumt");
    }

    /* Eingesetzt wurde dabei NICHTS — die Faehigkeit liegt noch im Vorrat. */
    const stand = SCHACH_TAFEL.partie(TEAM_SCHACH.abgleich.daten, partie.id);
    if (stand.faehigkeiten.weiss.indexOf("mauer") === -1) {
        throw new Error("das Ziehen hat die Faehigkeit verbraucht");
    }

    /*
     * DER KLICK NACH DEM ZIEHEN WIRD VERSCHLUCKT: Sonst gilt er als zweiter
     * Tipp auf dasselbe Feld — und der setzt ein.
     */
    TEAM_SCHACH.ziehenVerbrauchtKlick = true;
    TEAM_SCHACH.feldAngetippt(partie, person, ziel);

    if (TEAM_SCHACH.ziehenVerbrauchtKlick) {
        throw new Error("der Merker wurde nicht zurueckgesetzt");
    }
    const danach = SCHACH_TAFEL.partie(TEAM_SCHACH.abgleich.daten, partie.id);
    if (danach.faehigkeiten.weiss.indexOf("mauer") === -1) {
        throw new Error("der Klick nach dem Ziehen hat die Faehigkeit eingesetzt");
    }

    TEAM_SCHACH._auswahlAufheben();
    TEAM_SCHACH.zeichnen(TEAM_SCHACH.abgleich.daten);
});

pruefe("Abbrechen raeumt den Vorschau-Kasten wieder weg (v0.57)", () => {
    TEAM_SCHACH.zielFaehigkeit = "mauer";
    TEAM_SCHACH.zielFelder = [1, 2, 3];
    TEAM_SCHACH.zielVorschau = 2;
    TEAM_SCHACH.zielUmriss = [1, 2, 3];

    TEAM_SCHACH.zielVerwerfen();

    if (TEAM_SCHACH.zielFaehigkeit !== "" || TEAM_SCHACH.zielVorschau !== -1
        || TEAM_SCHACH.zielUmriss.length !== 0) {
        throw new Error("nach dem Abbrechen liegt noch etwas herum");
    }
});

pruefe("Die Schachregel-Anleitung zeichnet jede Gruppe (v0.96)", () => {
    /*
     * Der Fehler, gegen den diese Datei ueberhaupt gebaut wurde, war ein Tab,
     * der leer blieb (v1.2). Eine ganz neue Ansicht bekommt deshalb sofort
     * ihren Test: Sie muss durchlaufen und sichtbar etwas erzeugen.
     */
    TEAM_SCHACH.grundlagenOeffnen();

    if (!TEAM_SCHACH.grundlagenOffen) {
        throw new Error("die Anleitung ist nicht offen");
    }

    const karten = TEAM_SCHACH.wurzelEl.kinder.filter(
        (kind) => String(kind.className || "").indexOf("karte") !== -1);

    /* Je Gruppe eine Karte, dazu die Abschluss-Karte „Was ist hier anders". */
    if (karten.length !== SCHACH_GRUNDLAGEN.GRUPPEN.length + 1) {
        throw new Error("es kommen " + karten.length + " Karten statt "
            + (SCHACH_GRUNDLAGEN.GRUPPEN.length + 1));
    }

    /* Zugeklappt steht nur die Ueberschrift da — kein Brett. */
    if (TEAM_SCHACH.wurzelEl.querySelector(".anleitung")) {
        throw new Error("ein Brett steht schon da, bevor jemand aufklappt");
    }

    TEAM_SCHACH.grundlagenSchliessen();
    if (TEAM_SCHACH.grundlagenOffen) {
        throw new Error("die Anleitung laesst sich nicht schliessen");
    }
});

pruefe("Ein Kapitel klappt sein Brett erst beim Antippen auf (v0.96)", () => {
    TEAM_SCHACH.grundlagenOeffnen();

    const eintrag = TEAM_SCHACH.wurzelEl.querySelector(".grundlagen-eintrag");
    if (!eintrag) {
        throw new Error("es gibt keinen aufklappbaren Eintrag");
    }
    if (eintrag.querySelector(".stufen-inhalt")) {
        throw new Error("der Inhalt steht schon vor dem Aufklappen da");
    }

    eintrag.open = true;
    eintrag.ausloesen("toggle");

    if (!eintrag.querySelector(".anleitung")) {
        throw new Error("nach dem Aufklappen fehlt das Brett");
    }
    if (!eintrag.querySelector(".stufen-text")) {
        throw new Error("nach dem Aufklappen fehlt der Satz");
    }

    TEAM_SCHACH.grundlagenSchliessen();
});

pruefe("Die Werte-Tabelle nennt jede Figur mit ihrer Zahl (v0.96)", () => {
    TEAM_SCHACH.grundlagenOeffnen();

    const liste = TEAM_SCHACH.wurzelEl.querySelector(".werte-liste");
    const anzahl = liste ? liste.kinder.length : 0;

    TEAM_SCHACH.grundlagenSchliessen();

    if (!liste) {
        throw new Error("die Werte-Tabelle fehlt");
    }
    if (anzahl !== SCHACH_GRUNDLAGEN.werte().length) {
        throw new Error("es stehen " + anzahl + " Zeilen statt "
            + SCHACH_GRUNDLAGEN.werte().length);
    }
});

pruefe("Die Bibliothek zeigt das Raster und die Stufen-Legende (Wunsch 5)", () => {
    /*
     * DER GEMELDETE WUNSCH: „Faehigkeiten-Tab: nur noch das neue
     * Icon-Raster — die Stufen-Listen darunter (alte Bibliothek) sollen
     * weg."
     *
     * Bis v0.17.0 prueften hier vier Stufen-Karten mit allen Eintraegen.
     * An ihre Stelle tritt die Zusage von v0.18.0: KEINE Stufen-Karte mehr,
     * dafuer das Raster mit jeder Faehigkeit und eine Legende mit einer
     * Zeile je Stufe — damit die Auskunft „wie oft kommt diese Stufe"
     * nicht verloren geht.
     */
    TEAM_SCHACH.faehigkeitenOeffnen();

    const einsammeln = (element, passt, treffer) => {
        for (const kind of element.kinder || []) {
            if (passt(kind)) {
                treffer.push(kind);
            }
            einsammeln(kind, passt, treffer);
        }
        return treffer;
    };

    const karten = einsammeln(TEAM_SCHACH.wurzelEl, (kind) =>
        String(kind.className || "").indexOf("stufen-karte") !== -1, []);
    if (karten.length !== 0) {
        throw new Error("es haengen noch " + karten.length + " Stufen-Karten da");
    }

    /* Das Raster zeigt weiterhin JEDE Faehigkeit und JEDES Unglueck. */
    const kacheln = einsammeln(TEAM_SCHACH.wurzelEl, (kind) =>
        String(kind.className || "").indexOf("faehigkeit-kachel") !== -1, []);

    let erwartet = 0;
    for (const stufe of SCHACH_VARIANTEN.STUFEN) {
        erwartet += SCHACH_VARIANTEN.faehigkeitenDerStufe(stufe.id).length
            + SCHACH_VARIANTEN.pechDerStufe(stufe.id).length;
    }
    if (kacheln.length !== erwartet) {
        throw new Error("das Raster zeigt " + kacheln.length + " statt " + erwartet);
    }

    /*
     * DIE SKALA STEHT SEIT v0.86.0 HINTER DEM i (Nutzer-Ansage 27.08.2026)
     * — auf der Seite selbst darf sie nicht mehr auftauchen.
     */
    const offen = einsammeln(TEAM_SCHACH.wurzelEl, (kind) =>
        String(kind.className || "").indexOf("stufen-legende-zeile") !== -1, []);
    if (offen.length !== 0) {
        throw new Error("die Stufen-Skala steht noch offen auf der Seite ("
            + offen.length + " Zeilen)");
    }

    /* Dafuer traegt die Seite das i, das sie zeigt. */
    const iKnoepfe = einsammeln(TEAM_SCHACH.wurzelEl, (kind) =>
        String(kind.className || "").indexOf("info-knopf") !== -1, []);
    if (iKnoepfe.length === 0) {
        throw new Error("kein i ueber dem Raster");
    }

    /* Und dahinter steht sie vollstaendig, je Stufe eine Zeile mit ihrem
       eigenen i fuer die Zahlen. */
    const zeilen = einsammeln(TEAM_SCHACH._erklaerInhaltBauen(), (kind) =>
        String(kind.className || "").indexOf("stufen-legende-zeile") !== -1, []);
    if (zeilen.length !== SCHACH_VARIANTEN.STUFEN.length) {
        throw new Error("die Legende hat " + zeilen.length + " Zeilen statt "
            + SCHACH_VARIANTEN.STUFEN.length);
    }
    for (const zeile of zeilen) {
        if (!(zeile.kinder || []).some((kind) =>
                String(kind.className || "").indexOf("info-knopf") !== -1)) {
            throw new Error("eine Stufen-Zeile hat kein i mit den Zahlen");
        }
    }

    /* Die abgeschafften Bausteine sind wirklich weg. */
    if (TEAM_SCHACH._stufenKarteBauen || TEAM_SCHACH._bibliothekEintragBauen) {
        throw new Error("die alte Bibliothek steckt noch im Code");
    }

    TEAM_SCHACH.infoSchliessen();
    if (TEAM_SCHACH.infoOffen) {
        throw new Error("Uebersicht nicht geschlossen");
    }
});

/*
 * EIN Zurueck-Knopf, oben links, und die Kopfzeile KLEBT (seit v0.110 —
 * Nutzer-Ansage 22.08.: „entferne einen, gleich zu finden in der ganzen
 * App"). Der schwebende Zweitknopf von v0.59 ist raus; damit die laengste
 * Ansicht keine Sackgasse wird, muss ihr Kopf die Klebe-Klasse tragen.
 */
pruefe("Die Bibliothek hat EINEN Zurueck-Knopf im klebenden Kopf (v0.110)", () => {
    TEAM_SCHACH.faehigkeitenOeffnen();

    const schwebend = TEAM_SCHACH.wurzelEl.kinder.find(
        (kind) => String(kind.className || "").indexOf("schwebe-zurueck") !== -1);
    if (schwebend) {
        throw new Error("der schwebende Zweitknopf sollte seit v0.110 weg sein");
    }

    const kopf = TEAM_SCHACH.wurzelEl.kinder.find(
        (kind) => String(kind.className || "").indexOf("partie-kopf") !== -1);
    if (!kopf) {
        throw new Error("kein Kopf in der Bibliothek");
    }
    if (String(kopf.className).indexOf("partie-kopf-klebt") === -1) {
        throw new Error("ohne Klebe-Klasse ist die lange Ansicht eine "
            + "Sackgasse fuer alle, die unten stehen");
    }

    /* Und der eine Knopf im Kopf schliesst wirklich. */
    const zurueck = (kopf.kinder || []).find(
        (kind) => kind.textContent === "Zurück");
    if (!zurueck) {
        throw new Error("kein Zurueck-Knopf im Kopf");
    }
    zurueck.ausloesen("click");
    if (TEAM_SCHACH.infoOffen) {
        throw new Error("der Zurueck-Knopf schliesst die Bibliothek nicht");
    }
});

/*
 * Die erste Kachel des Icon-Rasters in der offenen Bibliothek.
 *
 * Bis v0.17.0 hiess der Helfer `ersterBibliothekEintrag` und suchte den
 * ersten Aufklapper der ersten Stufen-Karte. Beides gibt es seit Wunsch 5
 * nicht mehr — geblieben ist das Raster.
 */
function ersteRasterKachel() {
    const suchen = (element) => {
        for (const kind of element.kinder || []) {
            if (String(kind.className || "").indexOf("faehigkeit-kachel") !== -1) {
                return kind;
            }
            const tiefer = suchen(kind);
            if (tiefer) {
                return tiefer;
            }
        }
        return null;
    };

    const kachel = suchen(TEAM_SCHACH.wurzelEl);
    if (!kachel) {
        throw new Error("keine Raster-Kachel gezeichnet");
    }
    return kachel;
}

pruefe("Das Einsetzen-Fenster zeigt Bilder oben und den langen Text im Aufklapper (v0.94)", () => {
    /*
     * Bis v0.93 stand die ganze Beschreibung als Text UEBER den Bildern — bei
     * der Mauer 668 Zeichen, auf dem Handy rund zwanzig Zeilen. Die Bilder,
     * die den Text ersetzen sollen, standen damit unter dem Bildrand.
     */
    const halter = TEAM_SCHACH._anleitungMitBeschreibung("mauer");
    if (!halter) {
        throw new Error("es kommt gar kein Element zustande");
    }

    if (!halter.querySelector(".anleitung")) {
        throw new Error("die Bildanleitung fehlt");
    }

    const aufklapper = halter.querySelector(".mehr-text");
    if (!aufklapper) {
        throw new Error("der Aufklapper mit der ganzen Beschreibung fehlt");
    }
    if (aufklapper.tagName !== "details") {
        throw new Error("der Aufklapper ist kein details-Element");
    }

    const satz = aufklapper.querySelector(".mehr-text-satz");
    if (!satz || satz.textContent !== SCHACH_VARIANTEN.faehigkeitBeschreibung("mauer")) {
        throw new Error("die ganze Beschreibung steht nicht darin");
    }
});

pruefe("Wo die Beschreibung nur ein Satz ist, gibt es keinen Aufklapper (v0.94)", () => {
    /* Sonst stuende derselbe Text zweimal im Fenster. */
    let einSatz = "";
    for (const art of Object.keys(SCHACH_VARIANTEN.FAEHIGKEITEN)) {
        if (SCHACH_VARIANTEN.faehigkeitKurz(art)
            === SCHACH_VARIANTEN.faehigkeitBeschreibung(art)) {

            einSatz = art;
        }
    }
    if (!einSatz) {
        return;
    }

    const halter = TEAM_SCHACH._anleitungMitBeschreibung(einSatz);
    if (halter && halter.querySelector(".mehr-text")) {
        throw new Error(einSatz + ": doppelter Text im Fenster");
    }
});

pruefe("Die Bibliothek wird nicht bei jeder Abfrage neu gezeichnet", () => {
    /*
     * Sie hängt an keinem Spielstand. Würde die regelmässige Abfrage sie neu
     * bauen, verlöre man beim Rollen dauernd die Stelle — und bis v0.17.0
     * klappte ausserdem jeder Eintrag alle drei Sekunden wieder zu.
     *
     * Gemessen wird an der IDENTITAET der ersten Raster-Kachel: Ein
     * Neuaufbau brächte ein anderes Element.
     */
    TEAM_SCHACH.faehigkeitenOeffnen();
    const kachel = ersteRasterKachel();

    TEAM_SCHACH.zeichnen(TEAM_SCHACH.abgleich.daten);

    if (ersteRasterKachel() !== kachel) {
        throw new Error("die Bibliothek wurde neu gebaut");
    }

    /* Beim Schliessen wird sie sehr wohl neu gebaut. */
    TEAM_SCHACH.infoSchliessen();
    if (TEAM_SCHACH.anleitungTakte.length !== 0) {
        throw new Error("die Takte laufen weiter, obwohl neu gezeichnet wurde");
    }
});

/*
 * Zeichnet einen Unglueckswuerfel auf g5 und liefert seine Zelle zurueck.
 * `pechZeigen` ist der Haken aus v0.49.
 */
function unglueckswuerfelZeichnen(pechZeigen, wann) {
    let partie = SCHACH_TAFEL.partie(TEAM_SCHACH.abgleich.daten, kennungen.faehigkeiten);
    partie = SCHACH_RUNDE.kopieren(partie);
    partie.regeln.pechZeigen = pechZeigen;

    /* Ein noch freies Feld — auf d5 liegt aus einem frueheren Test schon einer,
       und je Feld gilt der erste Eintrag. */
    if (!partie.bonus.some((eintrag) => eintrag.feld === SCHACH.feldNummer("g5"))) {
        partie.bonus.push({ feld: SCHACH.feldNummer("g5"), art: "erdrutsch", pech: true });
    }

    TEAM_SCHACH.abgleich.daten = SCHACH_TAFEL.partieEinsetzen(
        TEAM_SCHACH.abgleich.daten, partie, wann);
    TEAM_SCHACH.partieOeffnen(partie.id);

    return TEAM_SCHACH.wurzelEl.querySelector(
        "[data-feld=\"" + SCHACH.feldNummer("g5") + "\"]");
}

pruefe("Die Lootbox steht im Feld VOR der Figur (v0.83.1)", () => {
    /*
     * GEMELDET 27.08.2026: „die Lootbox ist im Vordergrund statt hinter der
     * Figur". Sie liegt auf dem Feld, die Figur steht darauf — also gehoert
     * sie dahinter. Beide sitzen in der Stildatei auf DERSELBEN Stufe
     * (`z-index: 1`), damit die Box weiterhin ueber den Feldmarken liegt;
     * welche von beiden vorn ist, entscheidet deshalb die Reihenfolge IM
     * FELD. Genau die haelt dieser Test fest.
     *
     * Eine Figur steht auf einer Box, wann immer sie GESCHOBEN wurde
     * (Erdrutsch, Nudelholz, Bauernschub) oder dorthin gestellt wurde
     * (Friedhof, Wiedergeburt): Geschoben zu werden ist kein Zug, es wird
     * dabei nichts eingesammelt.
     */
    let partie = SCHACH_TAFEL.partie(TEAM_SCHACH.abgleich.daten, kennungen.faehigkeiten);
    partie = SCHACH_RUNDE.kopieren(partie);

    /* Ein Feld, auf dem eine Figur STEHT — und eine Box daraufgelegt. */
    const feld = SCHACH.feldNummer("a2");
    if (SCHACH.figurAuf(partie.stand, feld) === ".") {
        throw new Error("auf a2 steht keine Figur, der Fall waere nicht nachgebaut");
    }
    if (!partie.bonus.some((eintrag) => eintrag.feld === feld)) {
        partie.bonus.push({ feld: feld, art: "", stufe: "gruen" });
    }

    TEAM_SCHACH.abgleich.daten = SCHACH_TAFEL.partieEinsetzen(
        TEAM_SCHACH.abgleich.daten, partie, 5450);
    TEAM_SCHACH.partieOeffnen(partie.id);

    const zelle = TEAM_SCHACH.wurzelEl.querySelector(
        "[data-feld=\"" + feld + "\"]");
    if (!zelle) {
        throw new Error("das Feld wurde gar nicht gezeichnet");
    }

    const stelleWuerfel = zelle.kinder.findIndex((kind) => kind.attribute
        && String(kind.attribute["class"] || "").indexOf("wuerfel") !== -1);
    const stelleFigur = zelle.kinder.findIndex((kind) =>
        String(kind.className || "").indexOf("figur") !== -1);

    if (stelleWuerfel === -1) {
        throw new Error("keine Lootbox auf dem Feld");
    }
    if (stelleFigur === -1) {
        throw new Error("keine Figur auf dem Feld");
    }
    if (stelleWuerfel > stelleFigur) {
        throw new Error("die Lootbox steht hinter der Figur im Feld (Stelle "
            + stelleWuerfel + " statt vor " + stelleFigur + ") — sie liegt "
            + "damit im Vordergrund");
    }

    TEAM_SCHACH.offeneId = "";
});

pruefe("Mit Haken traegt ein Unglueckswuerfel ein umgedrehtes Fragezeichen", () => {
    /*
     * SEIT v0.24.0 IST DAS ZEICHEN EINGRAVIERT, also Teil des Bildes: Der
     * Unglueckswuerfel ist nicht mehr an einem gedrehten `text` zu erkennen,
     * sondern an seiner Bilddatei (`...-pech.png`). Geprueft wird dasselbe
     * wie vorher, nur an der neuen Stelle.
     */
    const zelle = unglueckswuerfelZeichnen(true, 5500);
    const wuerfel = zelle.kinder.find((kind) => kind.attribute
        && kind.attribute["class"] === "wuerfel");

    if (!wuerfel) {
        throw new Error("kein Wuerfel");
    }

    const bild = wuerfel.kinder.find((kind) => kind.tagName === "image");
    if (!bild) {
        throw new Error("kein Bild im Wuerfel");
    }
    if (String(bild.attribute["href"] || "").indexOf("-pech.png") === -1) {
        throw new Error("das Fragezeichen steht nicht auf dem Kopf: "
            + bild.attribute["href"]);
    }

    /* Und der Titel verraet weiterhin nicht, was drin ist. */
    if (String(zelle.title).indexOf("Erdrutsch") !== -1) {
        throw new Error("der Titel verraet den Inhalt");
    }
});

pruefe("Ohne Haken ist ein Unglueckswuerfel nicht zu erkennen (v0.49)", () => {
    /*
     * DER PUNKT AUS DEM EINGANGSKORB: Grau gelassen sollen die Unglueckswuerfel
     * aussehen wie die guten — gleiche Farbe, Fragezeichen richtig herum. Bis
     * v0.48 war das Gegenteil eine EISERNE REGEL.
     */
    const zelle = unglueckswuerfelZeichnen(false, 5600);
    const wuerfel = zelle.kinder.find((kind) => kind.attribute
        && kind.attribute["class"] === "wuerfel");

    if (!wuerfel) {
        throw new Error("kein Wuerfel");
    }

    const bild = wuerfel.kinder.find((kind) => kind.tagName === "image");
    if (!bild) {
        throw new Error("kein Bild im Wuerfel");
    }
    if (String(bild.attribute["href"] || "").indexOf("-pech.png") !== -1) {
        throw new Error("der Wuerfel zeigt sein Unglueck, obwohl der Haken aus ist");
    }
    if (String(zelle.title).indexOf("Unglück") !== -1) {
        throw new Error("der Titel verraet das Unglueck");
    }
});

/*
 * DIE UNGLÜCKS-KARTE DER HAND (v0.82.0, Fund A2-1; davor v0.59 bis v0.81.0
 * ein roter Streifen ueber dem Brett, der es ~50 px zusammendrueckte).
 *
 * Gebaut wird der Fall ueber einen echten Zug auf einen Unglueckswuerfel —
 * dann steht die Karte in `unglueckskarten`, so wie sie im Spiel entsteht.
 */
pruefe("Ein eingesammeltes Unglueck liegt als Karte in der Hand (v0.82.0)", () => {
    const angelegt = SCHACH_TAFEL.partieAnlegen(
        TEAM_SCHACH.abgleich.daten, "standard", "Unglueck", 5700);

    let partie = SCHACH_RUNDE.teamBeitreten(angelegt.partie, "id-anna", "weiss", 5700);
    partie = SCHACH_RUNDE.teamBeitreten(partie, "id-bert", "schwarz", 5700);
    partie = bereitUndAufgestellt(partie, "weiss", 5700);
    partie = bereitUndAufgestellt(partie, "schwarz", 5700);

    /* Ein Unglückswürfel genau dort, wohin der Bauer zieht. */
    partie = SCHACH_RUNDE.kopieren(partie);
    partie.regeln.faehigkeiten = true;
    partie.bonus.push({ feld: SCHACH.feldNummer("a3"), art: "erdrutsch", pech: true });

    partie = SCHACH_RUNDE.ziehen(partie, "id-anna",
        SCHACH.feldNummer("a2"), SCHACH.feldNummer("a3"), "D", "Anna", 5710);

    const vorher = TEAM_SCHACH.abgleich.daten;
    TEAM_SCHACH.abgleich.daten = SCHACH_TAFEL.partieEinsetzen(
        angelegt.tafel, partie, 5710);
    TEAM_SCHACH.partieOeffnen(partie.id);

    const letzter = partie.verlauf[partie.verlauf.length - 1];
    if (!letzter || letzter.wirkung !== "pech") {
        throw new Error("der Zug hat gar keinen Unglueckswuerfel ausgeloest");
    }

    /* Der alte Streifen ist weg — nichts schiebt sich mehr vor das Brett. */
    if (TEAM_SCHACH.wurzelEl.kinder.some(
        (kind) => String(kind.className || "").indexOf("unglueck-meldung") !== -1)) {
        throw new Error("der alte Streifen wird immer noch gebaut");
    }

    /* Stattdessen liegt die Karte in der Hand der betroffenen Seite. */
    if (!klasseSuchen(TEAM_SCHACH.wurzelEl, "unglueck-knopf")) {
        throw new Error("keine Unglueck-Karte in der Hand nach dem Unglueckswuerfel");
    }

    /* Der Erdrutsch ist DAUERHAFT: Die Karte bleibt auch nach dem naechsten
       Zug liegen (Nutzer-Ansage 26.08.2026 — nur zeitlich Begrenztes geht). */
    partie = SCHACH_RUNDE.ziehen(partie, "id-bert",
        SCHACH.feldNummer("h7"), SCHACH.feldNummer("h6"), "D", "Bert", 5720);
    TEAM_SCHACH.abgleich.daten = SCHACH_TAFEL.partieEinsetzen(
        TEAM_SCHACH.abgleich.daten, partie, 5720);
    TEAM_SCHACH.zeichnen(TEAM_SCHACH.abgleich.daten);

    if (!klasseSuchen(TEAM_SCHACH.wurzelEl, "unglueck-knopf")) {
        throw new Error("die dauerhafte Unglueck-Karte verschwindet mit dem naechsten Zug");
    }

    TEAM_SCHACH.offeneId = "";
    TEAM_SCHACH.abgleich.daten = vorher;
});

/*
 * DIE TEAM-VORSCHLAEGE AM BRETT (v0.83.0, Fund A2-3; davor eine 206 px hohe
 * Abstimmungs-Karte, die das Brett auf die Mindestbreite drueckte).
 */
pruefe("Ein Team-Vorschlag steht als Schemen mit gruenem Weg am Brett (v0.83.0)", () => {
    const person = umgebung.ICH.person();
    const vorher = TEAM_SCHACH.abgleich.daten;

    const angelegt = SCHACH_TAFEL.partieAnlegen(
        TEAM_SCHACH.abgleich.daten, "standard", "Einig", 9600,
        { einigkeit: true });

    let partie = SCHACH_RUNDE.teamBeitreten(angelegt.partie, person.id, "weiss", 9600);
    partie = SCHACH_RUNDE.teamBeitreten(partie, "id-cem", "weiss", 9600);
    partie = SCHACH_RUNDE.teamBeitreten(partie, "id-bert", "schwarz", 9600);
    partie = bereitUndAufgestellt(partie, "weiss", 9600);
    partie = bereitUndAufgestellt(partie, "schwarz", 9600);

    /* Der MITSPIELER schlaegt e2-e4 vor — ausgefuehrt wird nichts. */
    partie = SCHACH_RUNDE.zugVorschlagen(partie, "id-cem",
        SCHACH.feldNummer("e2"), SCHACH.feldNummer("e4"), "D", "Cem", 9610);
    if (partie.zugZaehler !== 0) {
        throw new Error("der Vorschlag wurde faelschlich sofort gezogen");
    }

    TEAM_SCHACH.abgleich.daten = SCHACH_TAFEL.partieEinsetzen(
        angelegt.tafel, partie, 9610);
    TEAM_SCHACH.partieOeffnen(partie.id);

    /* Keine Abstimmungs-Karte mehr — nichts drueckt das Brett zusammen. */
    if (klasseSuchen(TEAM_SCHACH.wurzelEl, "abstimmung")) {
        throw new Error("die alte Abstimmungs-Karte wird immer noch gebaut");
    }

    /* Dafuer: die Figur als Schemen auf dem Ziel und der gruene Weg. */
    if (!klasseSuchen(TEAM_SCHACH.wurzelEl, "figur-schemen")) {
        throw new Error("kein Schemen der vorgeschlagenen Figur auf dem Brett");
    }
    if (!klasseSuchen(TEAM_SCHACH.wurzelEl, "feld-vorschlag-weg")) {
        throw new Error("kein gruener Laufweg zum Vorschlag");
    }
    if (!klasseSuchen(TEAM_SCHACH.wurzelEl, "feld-vorschlag-ziel")) {
        throw new Error("kein markiertes Zielfeld zum Vorschlag");
    }

    /* Der GEGNER bekommt nichts davon zu sehen: Fuer ihn ist die Liste leer. */
    if (TEAM_SCHACH._teamVorschlaege(partie, { id: "id-bert" }).length !== 0) {
        throw new Error("der Gegner sieht die Vorschlaege des Teams");
    }

    /* Der Frist-Zeitgeber laeuft nicht in den naechsten Test hinein. Die
       Zeitgeber der Testumgebung feuern nie (und `window` gibt es nur INNERHALB
       der Umgebung) — er wird schlicht abgelegt. */
    TEAM_SCHACH.fristZeitgeber = null;

    TEAM_SCHACH.offeneId = "";
    TEAM_SCHACH.abgleich.daten = vorher;
});

pruefe("Zug und Unglueck haben getrennte Spurfarben (v0.76)", () => {
    /*
     * DER GEMELDETE FEHLER: „Kann es sein, dass sich die gruene Farbe meiner
     * Bewegung nicht richtig verhaelt, wenn ich eine Ungluecksbox einsammle?"
     *
     * Ja. Der Bildschirm nahm immer nur den LETZTEN Verlaufseintrag — und das
     * war nach einem eingesammelten Unglueckswuerfel dessen eigener Eintrag.
     * Der trug bis v0.75 das Feld der LOOTBOX als Ziel: Die Spur wurde ganz
     * gelb, lief vom Startfeld bis zur Lootbox und hoerte dort auf, waehrend
     * die Figur ganz woanders stand.
     *
     * Der Turm zieht a1 nach a6 und nimmt auf a3 einen Erdrutsch mit, der ihn
     * anschliessend auf a5 zurueckschiebt. Zu sehen sein muss BEIDES: der Zug
     * in Gruen und der Rutsch in Gelb.
     */
    const angelegt = SCHACH_TAFEL.partieAnlegen(
        TEAM_SCHACH.abgleich.daten, "standard", "Spur und Unglueck", 7700);

    let partie = SCHACH_RUNDE.teamBeitreten(angelegt.partie, "id-anna", "weiss", 7700);
    partie = SCHACH_RUNDE.teamBeitreten(partie, "id-bert", "schwarz", 7700);
    partie = bereitUndAufgestellt(partie, "weiss", 7700);
    partie = bereitUndAufgestellt(partie, "schwarz", 7700);

    partie = SCHACH_RUNDE.kopieren(partie);
    partie.regeln.faehigkeiten = true;
    partie.regeln.lootboxMenge = "wenig";
    partie.stand = SCHACH.standNormalisieren({
        variante: "standard",
        brett: "....k..."
            + "....b..."
            + "........"
            + "........"
            + "........"
            + "........"
            + "........"
            + "T...K...",
        amZug: "weiss",
        rochade: ""
    });
    partie.bonus.push({ feld: SCHACH.feldNummer("a3"), art: "erdrutsch", pech: true });

    partie = SCHACH_RUNDE.ziehen(partie, "id-anna",
        SCHACH.feldNummer("a1"), SCHACH.feldNummer("a6"), "D", "Anna", 7710);

    const letzter = partie.verlauf[partie.verlauf.length - 1];
    if (!letzter || letzter.wirkung !== "pech") {
        throw new Error("der Zug hat gar keinen Unglueckswuerfel ausgeloest");
    }
    if (letzter.von !== -1 || letzter.nach !== -1) {
        throw new Error("der Unglueck-Eintrag gibt sich als Bewegung aus: "
            + letzter.von + " -> " + letzter.nach);
    }

    const spur = TEAM_SCHACH._letzteSpur(partie);
    const feld = (name) => SCHACH.feldNummer(name);

    /* Der ganze Weg des Zuges ist markiert — bis a6, nicht nur bis zur
       Lootbox auf a3. */
    for (const name of ["a1", "a2", "a3", "a4", "a5", "a6"]) {
        if (!spur.weg[feld(name)]) {
            throw new Error(name + " fehlt in der Spur des Zuges");
        }
    }

    /* Gruen ist, was der Zug war — gelb nur, was der Erdrutsch bewegt hat. */
    for (const name of ["a1", "a2", "a3", "a4"]) {
        if (spur.pech[feld(name)]) {
            throw new Error(name + " ist gelb, gehoert aber zum Zug");
        }
    }
    for (const name of ["a5", "a6"]) {
        if (!spur.pech[feld(name)]) {
            throw new Error(name + " muesste gelb sein — dort wirkte der Erdrutsch");
        }
    }

    /* Und die Bewegung nimmt die Figur des ZUGES, nicht das Lootbox-Feld. */
    const vorher = TEAM_SCHACH.abgleich.daten;
    TEAM_SCHACH.abgleich.daten = SCHACH_TAFEL.partieEinsetzen(
        angelegt.tafel, partie, 7710);
    TEAM_SCHACH.partieOeffnen(partie.id);

    const zelle = TEAM_SCHACH.wurzelEl.querySelector(
        "[data-feld=\"" + SCHACH.feldNummer("a3") + "\"]");
    if (zelle && zelle.kinder.some(
        (kind) => String(kind.className || "").indexOf("figur-zieht") !== -1)) {
        throw new Error("die Bewegung laeuft auf dem Feld der Lootbox");
    }

    TEAM_SCHACH.offeneId = "";
    TEAM_SCHACH.abgleich.daten = vorher;
});

pruefe("Wer nicht am Zug ist, kann das Brett nicht bedienen", () => {
    /*
     * Vorzuege gibt es seit v2.8 nicht mehr (siehe docs\DECISIONS.md). Das
     * Brett ist gesperrt, solange das eigene Team nicht am Zug ist.
     */
    const angelegt = SCHACH_TAFEL.partieAnlegen(
        TEAM_SCHACH.abgleich.daten, "standard", "Wartend", 6000);

    let partie = SCHACH_RUNDE.teamBeitreten(angelegt.partie, "id-anna", "weiss", 6000);
    partie = SCHACH_RUNDE.teamBeitreten(partie, "id-bert", "schwarz", 6000);
    partie = bereitUndAufgestellt(partie, "weiss", 6000);
    partie = bereitUndAufgestellt(partie, "schwarz", 6000);
    partie = SCHACH_RUNDE.ziehen(partie, "id-anna",
        SCHACH.feldNummer("a2"), SCHACH.feldNummer("a3"), "D", "Anna", 6100);

    TEAM_SCHACH.abgleich.daten = SCHACH_TAFEL.partieEinsetzen(angelegt.tafel, partie, 6100);
    TEAM_SCHACH.partieOeffnen(partie.id);

    const person = { id: "id-anna", name: "Anna" };
    const offene = SCHACH_TAFEL.partie(TEAM_SCHACH.abgleich.daten, partie.id);

    if (SCHACH_RUNDE.darfZiehen(offene, person.id)) {
        throw new Error("Anna duerfte gar nicht ziehen");
    }

    TEAM_SCHACH.feldAngetippt(offene, person, SCHACH.feldNummer("e2"));
    if (TEAM_SCHACH.gewaehltesFeld !== -1 || TEAM_SCHACH.moeglicheZiele.length !== 0) {
        throw new Error("das Brett haette nicht reagieren duerfen");
    }

    /* Und die Felder sind gesperrt. */
    const zelle = TEAM_SCHACH.wurzelEl.querySelector(
        "[data-feld=\"" + SCHACH.feldNummer("e2") + "\"]");
    if (!zelle.disabled) {
        throw new Error("das Feld ist nicht gesperrt");
    }

    TEAM_SCHACH.offeneId = "";
});

pruefe("Wird die offene Partie geloescht, landet man in der Uebersicht", () => {
    /* Genau die Partie öffnen, die gleich verschwindet. */
    TEAM_SCHACH.partieOeffnen(kennungen.klein);

    const neueTafel = SCHACH_TAFEL.partieEntfernen(
        TEAM_SCHACH.abgleich.daten, kennungen.klein, 3300);

    TEAM_SCHACH.abgleich.daten = neueTafel;
    TEAM_SCHACH.zeichnen(neueTafel);

    if (TEAM_SCHACH.offeneId !== "") {
        throw new Error("die geloeschte Partie gilt weiter als offen");
    }
});

pruefe("Ohne Anmeldung kommt der Hinweis statt eines Bretts", () => {
    umgebung.ICH.person = () => null;
    try {
        TEAM_SCHACH.zeichnen(TEAM_SCHACH.abgleich.daten);
        if (TEAM_SCHACH.wurzelEl.kinder.length !== 1) {
            throw new Error("erwartet genau einen Hinweis");
        }
    } finally {
        umgebung.ICH.person = () => ({ id: "id-anna", name: "Anna" });
    }
});


console.log(anzahlOk + " ok, " + anzahlFehler + " Fehler");
process.exit(anzahlFehler === 0 ? 0 : 1);
