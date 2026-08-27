/*
 * test-bildschirm-ablaeufe.js — Bildschirm-Tests der Abläufe: Start und
 * Beitritt, Abgleich und Zeitlimit der Datenbank-Aufrufe (asynchron), dazu
 * die Fenster und Tabs (Zwei-Schritt-Bestätigung, offene Runde,
 * Wirkungs-Schauspiele, Anleitung, Einstellungen, Startbildschirm,
 * Fussleiste, Fähigkeiten-Zeichen, Anmelde-Vollbild, Tab-Leiste).
 *
 * Teil 3 von 3 — die gemeinsame Testumgebung kommt aus
 * bildschirm-umgebung.js (dort steht auch, was diese Tests NICHT können);
 * die anderen Teile sind test-bildschirm.js und test-bildschirm-anzeigen.js.
 * Aufgeteilt 08/2026, die Prüfungen sind unverändert umgezogen.
 *
 * DAS FAZIT dieser Datei steht am Ende von `zeitlimitPruefen()`: Die
 * asynchronen Prüfungen laufen NACH allen synchronen, und erst danach darf
 * gezählt und beendet werden — eine Prüfung hinter dem Fazit liefe nie.
 *
 * Aufruf: siehe tests\README.md
 */

const pfad = require("path");
const dateisystem = require("fs");
const vm = require("vm");

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
 * Das Zeitlimit der Datenbank-Aufrufe (seit v3.9)
 *
 * Diese Pruefungen muessen WARTEN koennen und laufen deshalb am Ende, nach
 * allen anderen. `pruefe` ist synchron und wuerde ein Versprechen einfach
 * durchwinken — ein Test, der immer besteht, waere schlimmer als keiner.
 * ------------------------------------------------------------------ */

async function pruefeMitWarten(bezeichnung, funktion) {
    try {
        await funktion();
        anzahlOk++;
    } catch (fehler) {
        anzahlFehler++;
        console.error("FEHLER: " + bezeichnung);
        console.error("        " + fehler.message);
    }
}

async function zeitlimitPruefen() {
    const speicher = new SpeicherGemeinsam(
        "https://beispiel.example", "team-schach", (roh) => roh);

    await pruefeMitWarten("Ein haengendes Laden bricht nach dem Zeitlimit ab", async () => {
        netz.haengt = true;
        netz.sofort = true;
        netz.abgebrochen = false;

        try {
            await speicher.laden();
            throw new Error("kein Abbruch — der Aufruf haette ewig gehangen");
        } catch (fehler) {
            if (fehler.message.indexOf("zu lange gedauert") === -1) {
                throw new Error("falscher Fehler: " + fehler.message);
            }
            if (!netz.abgebrochen) {
                throw new Error("der Aufruf wurde nicht wirklich abgebrochen");
            }
        } finally {
            netz.haengt = false;
            netz.sofort = false;
        }
    });

    await pruefeMitWarten("Auch ein haengendes Speichern bricht ab", async () => {
        netz.haengt = true;
        netz.sofort = true;

        try {
            await speicher.speichern({});
            throw new Error("kein Abbruch beim Speichern");
        } catch (fehler) {
            if (fehler.message.indexOf("zu lange gedauert") === -1) {
                throw new Error("falscher Fehler: " + fehler.message);
            }
        } finally {
            netz.haengt = false;
            netz.sofort = false;
        }
    });

    await pruefeMitWarten("Ein antwortender Aufruf laeuft ganz normal durch", async () => {
        netz.haengt = false;
        await speicher.laden();
    });

    /*
     * DIE ÜBERHOLTE ANTWORT DER REGELMAESSIGEN ABFRAGE (v0.76).
     *
     * Gemeldet als „Doppelzug-Fehler — der zweite Zug wird nur angezeigt": Der
     * zweite eigene Zug kam mit „Jemand war schneller" zurueck, obwohl niemand
     * sonst im Team war. Die Ursache liegt nicht beim Doppelzug, sondern im
     * Abgleich: Seine Sperren gegen fremde Staende greifen VOR dem Netzaufruf,
     * die Antwort kommt aber danach — und trug den Stand von vor dem eigenen
     * Zug. Der Bildschirm zeichnete daraufhin mit einem veralteten Zugzaehler,
     * und der naechste Zug wurde als „jemand war schneller" abgewiesen.
     *
     * Auffallen konnte das nur beim Doppelzug: Sonst ist nach dem eigenen Zug
     * der Gegner dran, und bis man wieder tippen darf, hat die naechste Abfrage
     * den Stand laengst geradegerueckt.
     */
    const abgleichBauen = (laden, uebernahmen) => new Abgleich(
        {
            art: "gemeinsam",
            beschreibung: "Attrappe",
            laden: laden,
            speichern: async () => true
        },
        { abfrageIntervallMs: 3000, schreibVerzoegerungMs: 10 },
        {
            beiDaten: () => { uebernahmen.anzahl++; },
            beiStatus: () => { /* nichts zu melden */ },
            leereDaten: () => ({ stand: "leer" }),
            inhaltGleich: (a, b) => JSON.stringify(a) === JSON.stringify(b)
        }
    );

    await pruefeMitWarten("Eine ueberholte Antwort der Abfrage wird verworfen (v0.76)",
        async () => {
            const uebernahmen = { anzahl: 0 };
            const abgleich = abgleichBauen(async () => ({ stand: "alt" }), uebernahmen);

            abgleich.daten = { stand: "neu" };

            /* Die Antwort ist unterwegs — und genau in dieser Zeit laeuft ein
               eigener Schreibvorgang durch. */
            const laeuft = abgleich.fremdenStandHolen();
            abgleich.eigenerVorgangBeginnt();
            abgleich.eigenerVorgangEndet();
            await laeuft;

            if (uebernahmen.anzahl !== 0) {
                throw new Error("der ueberholte Stand wurde uebernommen");
            }
            if (JSON.stringify(abgleich.daten) !== JSON.stringify({ stand: "neu" })) {
                throw new Error("der eigene Stand wurde ueberschrieben");
            }
        });

    await pruefeMitWarten("Ohne eigenen Vorgang kommt der fremde Stand ganz normal an",
        async () => {
            const uebernahmen = { anzahl: 0 };
            const abgleich = abgleichBauen(async () => ({ stand: "fremd" }), uebernahmen);

            abgleich.daten = { stand: "eigen" };
            await abgleich.fremdenStandHolen();

            if (uebernahmen.anzahl !== 1) {
                throw new Error("ein fremder Stand kommt nicht mehr an");
            }
            if (JSON.stringify(abgleich.daten) !== JSON.stringify({ stand: "fremd" })) {
                throw new Error("der fremde Stand wurde nicht uebernommen");
            }
        });

    await pruefeMitWarten("Sofort schreiben ueberspringt die Schreibverzoegerung (v0.91.0)",
        async () => {
            /*
             * NEBENBEFUND v0.89.0: Ein frisch angelegtes Konto wartete bis zu
             * 500 ms auf die Schreibverzoegerung — wer die Seite sofort
             * schloss, verlor es. `sofortSchreiben` (gerufen nach dem
             * Konto-Anlegen und beim Verschwinden der Seite) schreibt die
             * offene Aenderung JETZT und raeumt den geplanten Zeitgeber weg.
             */
            const geschrieben = [];
            const abgleich = new Abgleich(
                {
                    art: "gemeinsam",
                    beschreibung: "Attrappe",
                    laden: async () => ({ stand: "server" }),
                    speichern: async (daten) => {
                        geschrieben.push(JSON.stringify(daten));
                        return true;
                    }
                },
                { abfrageIntervallMs: 3000, schreibVerzoegerungMs: 60000 },
                {
                    beiDaten: () => undefined,
                    beiStatus: () => undefined,
                    leereDaten: () => ({ stand: "leer" }),
                    inhaltGleich: (a, b) => JSON.stringify(a) === JSON.stringify(b)
                }
            );

            /* Die Aenderung liegt an, der Zeitgeber der Testumgebung feuert
               absichtlich nie — genau wie eine echte Verzoegerung, die das
               Schliessen der Seite nicht mehr abwartet. */
            abgleich.aendern({ stand: "neues Konto" }, false);
            if (geschrieben.length !== 0) {
                throw new Error("geschrieben, obwohl die Verzoegerung laeuft");
            }

            abgleich.sofortSchreiben();
            await new Promise((fertig) => setTimeout(fertig, 0));

            if (geschrieben.length !== 1
                    || geschrieben[0].indexOf("neues Konto") === -1) {
                throw new Error("sofortSchreiben hat die Aenderung nicht geschrieben");
            }
            if (abgleich.schreibZeitgeber !== null) {
                throw new Error("der alte Zeitgeber laeuft weiter");
            }
            if (abgleich.aenderungOffen) {
                throw new Error("die Aenderung gilt noch als offen");
            }
        });

    /* ---------------------------------------------------------------- *
     * Wunsch 1 (24.08.2026): „Spielen" legt die Runde an — ohne Namen
     * ---------------------------------------------------------------- */

    await pruefeMitWarten("Spielen legt die Runde ohne Namens-Dialog an (Wunsch 1)",
        async () => {
            const START = umgebung.START;
            const echteDaten = TEAM_SCHACH.abgleich.daten;
            const echteEingabe = umgebung.DIALOG.eingabe;

            /*
             * Ein leeres Brett: Sonst greift die Sperre gegen die zweite
             * Partie (F11) — Anna steckt in allen Partien der Testtafel.
             */
            TEAM_SCHACH.abgleich.daten = SCHACH_TAFEL.leereTafel(9000);

            /* WUERDE DER NAMENS-DIALOG NOCH GESTELLT, schlaegt der Test hier
               fehl statt lautlos durchzulaufen. */
            umgebung.DIALOG.eingabe = async () => {
                throw new Error("der Namens-Dialog wird noch gestellt");
            };

            try {
                const variante = SCHACH_VARIANTEN.liste[1]
                    || SCHACH_VARIANTEN.liste[0];
                START.spielartMerken(variante.id);
                START.regelnMerken(Object.assign(TEAM_SCHACH._regelnVorgabe(),
                    { faehigkeiten: true, armeeStaerke: "wenig" }));

                umgebung.TABS.gewechseltZu = "";
                await START.spielen();

                const liste = SCHACH_TAFEL.liste(TEAM_SCHACH.abgleich.daten);
                if (liste.length !== 1) {
                    throw new Error("Spielen hat keine Runde angelegt");
                }

                const partie = liste[0];
                if (partie.variante !== variante.id) {
                    throw new Error("die gemerkte Spielart wurde nicht genommen");
                }
                if (partie.titel !== variante.titel) {
                    throw new Error("der Anzeigetitel kommt nicht von der Spielart");
                }
                if (partie.regeln.armeeStaerke !== "wenig"
                        || partie.regeln.faehigkeiten !== true) {
                    throw new Error("die gemerkten Regler kamen nicht an");
                }
                if (!SCHACH_RUNDE.teamVon(partie, "id-anna")) {
                    throw new Error("wer anlegt, steht nicht im Team");
                }
                if (TEAM_SCHACH.offeneId !== partie.id) {
                    throw new Error("die neue Runde wird nicht geoeffnet");
                }
                if (umgebung.TABS.gewechseltZu !== "team-schach") {
                    throw new Error("es wird nicht ins Team Schach gewechselt");
                }
            } finally {
                umgebung.DIALOG.eingabe = echteEingabe;
                TEAM_SCHACH.abgleich.daten = echteDaten;
                TEAM_SCHACH.offeneId = "";
                umgebung.TABS.gewechseltZu = "";
            }
        });

    /* ---------------------------------------------------------------- *
     * Wer allein war, schliesst die Runde beim Verlassen (v0.26.0)
     * ---------------------------------------------------------------- */

    await pruefeMitWarten("Allein verlassen schliesst die Runde (v0.26.0)",
        async () => {
            /*
             * DIE GEMELDETE ANSAGE: „und einmalig den raum beim verlassen
             * auch schliessen, solange man alleine in der runde war."
             *
             * Zwei Faelle in einem Test, weil sie sich nur in einer Zeile
             * unterscheiden: allein -> Runde weg, zu zweit -> Runde bleibt.
             */
            const echteDaten = TEAM_SCHACH.abgleich.daten;

            try {
                /* 1) Anna ganz allein in einer wartenden Runde. */
                let tafel = SCHACH_TAFEL.leereTafel(9500);
                let angelegt = SCHACH_TAFEL.partieAnlegen(
                    tafel, SCHACH_VARIANTEN.liste[0].id, "Allein", 9510);
                let partie = SCHACH_RUNDE.teamBeitreten(
                    angelegt.partie, "id-anna", "weiss", 9510);

                TEAM_SCHACH.abgleich.daten = SCHACH_TAFEL.partieEinsetzen(
                    angelegt.tafel, partie, 9510);
                TEAM_SCHACH.offeneId = partie.id;

                await TEAM_SCHACH.teamVerlassen(partie);

                if (SCHACH_TAFEL.partie(TEAM_SCHACH.abgleich.daten, partie.id)) {
                    throw new Error("die verwaiste Runde steht noch da");
                }
                if (TEAM_SCHACH.offeneId === partie.id) {
                    throw new Error("die geschlossene Runde bleibt geoeffnet");
                }

                /* 2) Dieselbe Lage, aber Bert sitzt noch drin. */
                tafel = SCHACH_TAFEL.leereTafel(9600);
                angelegt = SCHACH_TAFEL.partieAnlegen(
                    tafel, SCHACH_VARIANTEN.liste[0].id, "Zu zweit", 9610);
                partie = SCHACH_RUNDE.teamBeitreten(
                    angelegt.partie, "id-anna", "weiss", 9610);
                partie = SCHACH_RUNDE.teamBeitreten(partie, "id-bert", "schwarz", 9610);

                TEAM_SCHACH.abgleich.daten = SCHACH_TAFEL.partieEinsetzen(
                    angelegt.tafel, partie, 9610);
                TEAM_SCHACH.offeneId = partie.id;

                await TEAM_SCHACH.teamVerlassen(partie);

                const geblieben = SCHACH_TAFEL.partie(
                    TEAM_SCHACH.abgleich.daten, partie.id);
                if (!geblieben) {
                    throw new Error("die Runde wurde geschlossen, obwohl Bert"
                        + " noch drin sass");
                }
                if (SCHACH_RUNDE.teamVon(geblieben, "id-anna")) {
                    throw new Error("Anna steckt noch im Team");
                }
                if (!SCHACH_RUNDE.teamVon(geblieben, "id-bert")) {
                    throw new Error("Bert wurde mit hinausgeworfen");
                }
            } finally {
                TEAM_SCHACH.abgleich.daten = echteDaten;
                TEAM_SCHACH.offeneId = "";
            }
        });

    /* ---------------------------------------------------------------- *
     * Gegen den Computer (v0.27.0)
     * ---------------------------------------------------------------- */

    await pruefeMitWarten("Gegen den Computer waehlt der Mensch seine Seite selbst",
        async () => {
            /*
             * NUTZER-ANSAGE (24.08.2026): „soll ich mir meine seite
             * auswaehlen koennen und sobald ich auf bereit klicke soll der
             * Bot in die andere Gruppe joinen."
             *
             * Geprueft wird die ganze Kette in zwei Schritten (seit Punkt 8,
             * 27.08.2026): Spielen legt eine LEERE Runde an; der TIPP auf
             * Schwarz ist Beitritt UND Zusage in einem und holt den Computer
             * nach Weiss — den frueheren dritten Schritt („Bereit") gibt es
             * nicht mehr.
             */
            const START = umgebung.START;
            const echteDaten = TEAM_SCHACH.abgleich.daten;

            /* Leeres Brett, sonst greift die Sperre gegen die zweite
               Partie (F11) — Anna steckt in allen Partien der Testtafel. */
            TEAM_SCHACH.abgleich.daten = SCHACH_TAFEL.leereTafel(9700);

            try {
                START.spielartMerken(SCHACH_VARIANTEN.liste[0].id);
                /* Die Seite wird hier AUSGESUCHT (v0.66.0): Dieser Test prueft
                   genau den Weg ueber die Seitenwahl. Mit zugeloster Seite
                   gaebe es ihn nicht — dafuer steht ein eigener Test. */
                START.regelnMerken(Object.assign(TEAM_SCHACH._regelnVorgabe(),
                    { gegenComputer: true, seiteZufaellig: false }));

                await START.spielen();

                const hole = () => SCHACH_TAFEL.partie(
                    TEAM_SCHACH.abgleich.daten, TEAM_SCHACH.offeneId);

                /* 1) Angelegt, aber noch NIEMAND drin — auch der Computer nicht. */
                let partie = hole();
                if (!partie) {
                    throw new Error("Spielen hat keine Runde angelegt");
                }
                if (SCHACH_RUNDE.teamVon(partie, "id-anna")) {
                    throw new Error("der Mensch wurde ungefragt einsortiert");
                }
                if (SCHACH_BOT.istBotPartie(partie)) {
                    throw new Error("der Computer sitzt schon drin, vor der Seitenwahl");
                }
                if (!SCHACH_BOT.botVorgesehen(partie)) {
                    throw new Error("der Runde sieht man nicht an, dass ein"
                        + " Computer kommen soll");
                }

                /*
                 * Die Abstimmung im Team passt nicht zum Solo-Spiel und wird
                 * fuer diese Runde still ausgeschaltet — die Vorgabe des
                 * Reglers ist `einigkeit: true`, hier muss sie weg sein.
                 */
                if (partie.regeln.einigkeit !== false) {
                    throw new Error("die Abstimmung ist in der Bot-Runde noch an");
                }

                /*
                 * 2) Der Mensch waehlt SCHWARZ — nicht die Vorgabe von
                 * frueher.
                 *
                 * SEIT Punkt 8 (27.08.2026) IST DER TIPP AUF DIE SEITE
                 * ZUGLEICH DIE ERSTE ZUSAGE: `teamBeitreten` setzt sie mit,
                 * holt den Computer auf die andere Seite (bis dahin tat das
                 * `bereitUmschalten`) — und weil die Standard-Runde KEINE
                 * Zufallsarmee hat, pfeift das Modell direkt an: Den
                 * Aufstellungs-Bildschirm und den separaten Bereit-Schritt
                 * gibt es hier nicht mehr.
                 */
                await TEAM_SCHACH.teamBeitreten(hole(), "schwarz");

                partie = hole();
                if (SCHACH_RUNDE.teamVon(partie, "id-anna") !== "schwarz") {
                    throw new Error("die gewaehlte Seite kam nicht an");
                }
                if (partie.bereit.schwarz !== true) {
                    throw new Error("der Tipp auf die Seite gilt nicht als Zusage");
                }
                if (SCHACH_RUNDE.teamVon(partie, SCHACH_BOT.KENNUNG) !== "weiss") {
                    throw new Error("der Computer sitzt nicht gegenueber");
                }
                if (partie.bereit.weiss !== true) {
                    throw new Error("der Computer meldet sich nicht bereit");
                }
                if (partie.laeuft !== true) {
                    throw new Error("ohne Zufallsarmee muss die Partie mit dem"
                        + " Seiten-Tipp starten - einen Aufstellungs-Bildschirm"
                        + " gibt es nicht mehr");
                }

                /* Und der Computer heisst am Bildschirm nicht Unbekannt. */
                if (TEAM_SCHACH._nameVon(SCHACH_BOT.KENNUNG) !== SCHACH_BOT.NAME) {
                    throw new Error("der Computer hat keinen Namen");
                }
            } finally {
                TEAM_SCHACH.abgleich.daten = echteDaten;
                TEAM_SCHACH.offeneId = "";
                TEAM_SCHACH.selbstAngelegt = "";
                umgebung.TABS.gewechseltZu = "";
                START.regelnMerken(TEAM_SCHACH._regelnVorgabe());
            }
        });

    await pruefeMitWarten("Eine angelegte, nie betretene Runde raeumt sich weg",
        async () => {
            /*
             * DIE LUECKE, DIE MIT DER SEITENWAHL ENTSTAND (v0.29.0): Wer
             * „Spielen" drueckt und ohne Seitenwahl zurueckgeht, liesse eine
             * menschenleere Runde im gemeinsamen Stand stehen.
             *
             * DAS SETZT DIE SEITENWAHL VORAUS (seit v0.66.0 ausdruecklich):
             * Mit zugeloster Seite sitzt man sofort drin, die Runde ist also
             * nie menschenleer — dafuer fuehrt dort das „Zurueck" aus der
             * Runde heraus und schliesst sie (eigener Test).
             */
            const START = umgebung.START;
            const echteDaten = TEAM_SCHACH.abgleich.daten;

            TEAM_SCHACH.abgleich.daten = SCHACH_TAFEL.leereTafel(9720);

            try {
                START.spielartMerken(SCHACH_VARIANTEN.liste[0].id);
                START.regelnMerken(Object.assign(TEAM_SCHACH._regelnVorgabe(),
                    { gegenComputer: true, seiteZufaellig: false }));

                await START.spielen();

                const id = TEAM_SCHACH.offeneId;
                if (!id || !SCHACH_TAFEL.partie(TEAM_SCHACH.abgleich.daten, id)) {
                    throw new Error("Spielen hat keine Runde angelegt");
                }

                await TEAM_SCHACH.uebersichtOeffnen();
                await Promise.resolve();
                await Promise.resolve();

                if (SCHACH_TAFEL.partie(TEAM_SCHACH.abgleich.daten, id)) {
                    throw new Error("die leere Runde steht noch da");
                }

                /* Die Gegenprobe: Eine Runde, der man BEIGETRETEN ist,
                   bleibt selbstverstaendlich stehen. */
                await START.spielen();
                const zweite = TEAM_SCHACH.offeneId;
                await TEAM_SCHACH.teamBeitreten(
                    SCHACH_TAFEL.partie(TEAM_SCHACH.abgleich.daten, zweite), "weiss");

                await TEAM_SCHACH.uebersichtOeffnen();
                await Promise.resolve();

                if (!SCHACH_TAFEL.partie(TEAM_SCHACH.abgleich.daten, zweite)) {
                    throw new Error("eine betretene Runde wurde weggeraeumt");
                }
            } finally {
                TEAM_SCHACH.abgleich.daten = echteDaten;
                TEAM_SCHACH.offeneId = "";
                TEAM_SCHACH.selbstAngelegt = "";
                umgebung.TABS.gewechseltZu = "";
                START.regelnMerken(TEAM_SCHACH._regelnVorgabe());
            }
        });

    await pruefeMitWarten("Die gewaehlte Schwierigkeitsstufe landet in der Runde",
        async () => {
            /*
             * NUTZER-ANSAGE (24.08.2026): „und auch vier schwirichkeitsstufen
             * wo man umstellen kann." Geprueft wird die ganze Kette: Reihe am
             * Bildschirm -> Geraete-Erinnerung -> angelegte Partie.
             */
            const START = umgebung.START;
            const echteDaten = TEAM_SCHACH.abgleich.daten;

            /* Wie in den Nachbar-Tests: alles einsammeln, was zu einer
               Klasse passt (das nachgebaute DOM kann kein querySelector). */
            const einsammeln = (element, passt, treffer) => {
                for (const kind of element.kinder || []) {
                    if (passt(kind)) {
                        treffer.push(kind);
                    }
                    einsammeln(kind, passt, treffer);
                }
                return treffer;
            };

            TEAM_SCHACH.abgleich.daten = SCHACH_TAFEL.leereTafel(9750);

            try {
                /* 1) Die Reihe erscheint erst MIT dem Computer-Haken. */
                START.regelnMerken(Object.assign(TEAM_SCHACH._regelnVorgabe(),
                    { gegenComputer: false }));
                TEAM_SCHACH.partieAnlegen();

                const reihen = () => einsammeln(TEAM_SCHACH.wurzelEl, (kind) =>
                    String(kind.className || "").indexOf("bot-leiste") !== -1, []);

                if (reihen().length !== 0) {
                    throw new Error("die Stufen stehen da, obwohl kein Computer mitspielt");
                }

                TEAM_SCHACH.neueRegeln.gegenComputer = true;
                TEAM_SCHACH.zeichnen(TEAM_SCHACH.abgleich.daten);

                if (reihen().length !== 1) {
                    throw new Error("mit dem Computer-Haken fehlt die Stufen-Reihe");
                }

                const knoepfe = einsammeln(reihen()[0], (kind) =>
                    String(kind.className || "").indexOf("bot-knopf") !== -1, []);

                if (knoepfe.length !== SCHACH_BOT.STUFEN.length) {
                    throw new Error("erwartet " + SCHACH_BOT.STUFEN.length
                        + " Stufen-Knoepfe, gezaehlt: " + knoepfe.length);
                }

                /* 2) Die hoechste Stufe antippen setzt sie. */
                const hoechste = SCHACH_BOT.STUFEN[SCHACH_BOT.STUFEN.length - 1];
                knoepfe[knoepfe.length - 1].ausloesen("click");

                if (TEAM_SCHACH.neueRegeln.botStufe !== hoechste.id) {
                    throw new Error("der Stufen-Knopf wurde nicht uebernommen");
                }

                /* 3) Und sie reist mit der angelegten Runde mit. */
                TEAM_SCHACH.auswahlSchliessen();
                await START.spielen();

                /* Ueber `offeneId` gesucht, nicht ueber die erste Partie der
                   Liste: `rundeStarten` legt auf dem Stand VOM SERVER an, und
                   der Stellvertreter liefert dort seine eigene Tafel. */
                const partie = SCHACH_TAFEL.partie(
                    TEAM_SCHACH.abgleich.daten, TEAM_SCHACH.offeneId);

                if (!partie) {
                    throw new Error("Spielen hat keine Runde angelegt");
                }
                if (partie.regeln.botStufe !== hoechste.id) {
                    throw new Error("die Stufe steht nicht in der Partie: <"
                        + partie.regeln.botStufe + "> — kopiert"
                        + " SCHACH_TAFEL.partieAnlegen sie mit?");
                }
                if (SCHACH_BOT.stufeVon(partie).id !== hoechste.id) {
                    throw new Error("das Modell deutet die Stufe anders");
                }

                /* 4) Ohne Computer bleibt das Feld leer — ein Regler ohne
                      Bedeutung gehoert nicht in den Datenvertrag. */
                TEAM_SCHACH.abgleich.daten = SCHACH_TAFEL.leereTafel(9760);
                TEAM_SCHACH.offeneId = "";
                START.regelnMerken(Object.assign(TEAM_SCHACH._regelnVorgabe(),
                    { gegenComputer: false, botStufe: hoechste.id }));

                await START.spielen();

                const ohne = SCHACH_TAFEL.partie(
                    TEAM_SCHACH.abgleich.daten, TEAM_SCHACH.offeneId);

                if (!ohne) {
                    throw new Error("die zweite Runde wurde nicht angelegt");
                }
                if (ohne.regeln.botStufe !== "") {
                    throw new Error("ohne Computer traegt die Runde trotzdem eine Stufe");
                }
            } finally {
                TEAM_SCHACH.abgleich.daten = echteDaten;
                TEAM_SCHACH.offeneId = "";
                umgebung.TABS.gewechseltZu = "";
                TEAM_SCHACH.auswahlOffen = false;
                START.regelnMerken(TEAM_SCHACH._regelnVorgabe());
            }
        });

    await pruefeMitWarten("Eine Bot-Runde schliesst sich, wenn der Mensch geht",
        async () => {
            /*
             * OHNE DIESE AUSNAHME BLIEBE JEDE BOT-RUNDE STEHEN: `_istVerwaist`
             * verlangte bis v0.26.0 ZWEI leere Teams, und in Schwarz sitzt
             * der Computer. Fuer jede angelegte und wieder verlassene Partie
             * gegen den Computer bliebe eine Runde im gemeinsamen Stand.
             */
            const echteDaten = TEAM_SCHACH.abgleich.daten;

            try {
                const angelegt = SCHACH_TAFEL.partieAnlegen(
                    SCHACH_TAFEL.leereTafel(9800),
                    SCHACH_VARIANTEN.liste[0].id, "Gegen den Computer", 9810);

                let partie = SCHACH_RUNDE.teamBeitreten(
                    angelegt.partie, "id-anna", "weiss", 9810);
                partie = SCHACH_BOT.inRundeSetzen(partie, "schwarz", 9810);

                TEAM_SCHACH.abgleich.daten = SCHACH_TAFEL.partieEinsetzen(
                    angelegt.tafel, partie, 9810);
                TEAM_SCHACH.offeneId = partie.id;

                await TEAM_SCHACH.teamVerlassen(partie);

                if (SCHACH_TAFEL.partie(TEAM_SCHACH.abgleich.daten, partie.id)) {
                    throw new Error("die Runde mit dem einsamen Computer steht noch da");
                }
            } finally {
                TEAM_SCHACH.abgleich.daten = echteDaten;
                TEAM_SCHACH.offeneId = "";
            }
        });

    await pruefeMitWarten("Der Computer zieht erst, wenn er wirklich dran ist",
        async () => {
            /*
             * Geprueft wird der ANSTOSS, nicht die Zugwahl (die steht in
             * test-schach-bot.js): Der Zeitgeber der Testumgebung feuert nur
             * bei `netz.sofort` — damit laesst sich der Bedenk-Augenblick
             * hier auf Knopfdruck ausloesen.
             */
            const echteDaten = TEAM_SCHACH.abgleich.daten;
            const echteOffene = TEAM_SCHACH.offeneId;
            const vorherSofort = netz.sofort;

            try {
                const angelegt = SCHACH_TAFEL.partieAnlegen(
                    SCHACH_TAFEL.leereTafel(9900),
                    SCHACH_VARIANTEN.liste[0].id, "Gegen den Computer", 9910);

                let partie = SCHACH_RUNDE.teamBeitreten(
                    angelegt.partie, "id-anna", "weiss", 9910);
                partie = SCHACH_BOT.inRundeSetzen(partie, "schwarz", 9910);
                partie = bereitUndAufgestellt(partie, "weiss", 9910);

                TEAM_SCHACH.abgleich.daten = SCHACH_TAFEL.partieEinsetzen(
                    angelegt.tafel, partie, 9910);
                TEAM_SCHACH.offeneId = partie.id;

                netz.sofort = true;
                TEAM_SCHACH._botAbbrechen();

                /* Weiss ist am Zug: Der Computer haelt still. */
                TEAM_SCHACH._botAnstossen(partie, { id: "id-anna", name: "Anna" });
                await Promise.resolve();

                const unveraendert = SCHACH_TAFEL.partie(
                    TEAM_SCHACH.abgleich.daten, partie.id);
                if (unveraendert.zugZaehler !== 0) {
                    throw new Error("der Computer zieht, obwohl Weiss dran ist");
                }

                /* Anna zieht — jetzt ist Schwarz dran. */
                const nachAnna = SCHACH_RUNDE.ziehen(partie, "id-anna",
                    SCHACH.feldNummer("e2"), SCHACH.feldNummer("e4"), "D", "Anna", 9920);

                TEAM_SCHACH.abgleich.daten = SCHACH_TAFEL.partieEinsetzen(
                    TEAM_SCHACH.abgleich.daten, nachAnna, 9920);

                TEAM_SCHACH._botAbbrechen();
                TEAM_SCHACH._botAnstossen(nachAnna, { id: "id-anna", name: "Anna" });
                await Promise.resolve();
                await Promise.resolve();

                const gezogen = SCHACH_TAFEL.partie(
                    TEAM_SCHACH.abgleich.daten, partie.id);
                if (gezogen.zugZaehler !== nachAnna.zugZaehler + 1) {
                    throw new Error("der Computer hat nicht gezogen");
                }
                if (gezogen.stand.amZug !== "weiss") {
                    throw new Error("nach dem Computer ist nicht wieder Weiss dran");
                }
            } finally {
                netz.sofort = vorherSofort;
                TEAM_SCHACH._botAbbrechen();
                TEAM_SCHACH.abgleich.daten = echteDaten;
                TEAM_SCHACH.offeneId = echteOffene;
            }
        });


    await pruefeMitWarten("Wer eine Runde verlaesst, landet auf dem Startbildschirm (v0.69.0)", async () => {
        /*
         * NUTZER-ANSAGE 25.08.2026: „Wenn ich aus einer Runde rausgehe, moechte
         * ich auf dem Start-Screen landen und nicht im Runde-beitreten-Screen."
         *
         * DAS IST DIE ANSAGE VON v0.36.0, DIE EINEN WEG UEBERSAH: Damals wurde
         * „Zur Uebersicht" umgebogen, `teamVerlassen` aber nicht. Geprueft wird
         * deshalb genau dieser Weg — und zwar an BEIDEN Ausgaengen der Funktion:
         * der Runde, die stehen bleibt (noch jemand drin), und der, die sich
         * dabei schliesst (niemand mehr drin).
         */
        const person = umgebung.ICH.person();
        const echteDaten = TEAM_SCHACH.abgleich.daten;
        const echteOffene = TEAM_SCHACH.offeneId;
    
        const gelandet = () => String((umgebung.TABS.gewechseltZu || ""));
    
        try {
            /* FALL 1: Es bleibt jemand zurueck — die Runde ueberlebt. */
            const angelegt = SCHACH_TAFEL.partieAnlegen(
                SCHACH_TAFEL.leereTafel(9500), "standard", "Verlassen", 9510);
            let partie = SCHACH_RUNDE.teamBeitreten(
                angelegt.partie, person.id, "weiss", 9520);
            partie = SCHACH_RUNDE.teamBeitreten(partie, "id-bert", "schwarz", 9520);
    
            TEAM_SCHACH.abgleich.daten = SCHACH_TAFEL.partieEinsetzen(
                SCHACH_TAFEL.leereTafel(9500), partie, 9530);
            TEAM_SCHACH.offeneId = partie.id;
            umgebung.TABS.gewechseltZu = "";
    
            /* `teamVerlassen` ist async: Der Sprung zum Start steht hinter dem
               Senden. Deshalb wird hier auf die Kette gewartet. */
            await TEAM_SCHACH.teamVerlassen(partie);
    
            if (gelandet() !== "start") {
                throw new Error("nach dem Verlassen nicht auf dem Start, sondern: "
                    + gelandet());
            }
            if (TEAM_SCHACH.offeneId !== "") {
                throw new Error("die Partie ist noch offen");
            }
    
            /* FALL 2: Der Letzte geht — die Runde schliesst sich dabei. */
            const zweite = SCHACH_TAFEL.partieAnlegen(
                SCHACH_TAFEL.leereTafel(9600), "standard", "Allein", 9610);
            const allein = SCHACH_RUNDE.teamBeitreten(
                zweite.partie, person.id, "weiss", 9620);
    
            TEAM_SCHACH.abgleich.daten = SCHACH_TAFEL.partieEinsetzen(
                SCHACH_TAFEL.leereTafel(9600), allein, 9630);
            TEAM_SCHACH.offeneId = allein.id;
            umgebung.TABS.gewechseltZu = "";
    
            await TEAM_SCHACH.teamVerlassen(allein);
    
            if (gelandet() !== "start") {
                throw new Error("nach dem Schliessen nicht auf dem Start, sondern: "
                    + gelandet());
            }
        } finally {
            TEAM_SCHACH.abgleich.daten = echteDaten;
            TEAM_SCHACH.offeneId = echteOffene;
            umgebung.TABS.gewechseltZu = "";
        }
        });

    await pruefeMitWarten("Der zweite Bereit-Druck loescht die Zusage der Gegenseite nicht (v0.89.1)",
        async () => {
            /*
             * DER GEMELDETE FEHLER (27.08.2026): „Wenn auf beiden Seiten alle
             * Spieler bereit gedrueckt haben, soll das Spiel starten —
             * derzeit nicht der Fall."
             *
             * URSACHE: Die Zusage wurde auf dem LOKALEN Stand gerechnet und
             * ueber `_sendenMitPruefung` in die frische Tafel gesetzt. Hatte
             * das Geraet die Zusage der Gegenseite noch nicht per Abgleich
             * erhalten, ueberschrieb der Schreibvorgang sie — der Zugzaehler
             * schuetzt hier nicht, denn Bereit-Druecken aendert ihn nicht.
             * Seit v0.89.1 wird die Aenderung auf den FRISCH geladenen
             * Stand angewandt (`_aufFrischemSenden`; bis v0.90.0 hiess der
             * Sendeweg `_bereitSenden`).
             *
             * NACHGESTELLT WIRD GENAU DAS RENNEN: Auf dem Server liegt die
             * Zusage von Weiss, das Geraet von Schwarz haelt noch den Stand
             * davor — fuer BEIDE Bereitschaften.
             */
            const echteDaten = TEAM_SCHACH.abgleich.daten;
            const echterSpeicher = TEAM_SCHACH.abgleich.speicher;
            const echteOffene = TEAM_SCHACH.offeneId;

            try {
                /* FALL 1: die zweite Bereitschaft (der Anpfiff). */
                const angelegt = SCHACH_TAFEL.partieAnlegen(
                    SCHACH_TAFEL.leereTafel(9800), "standard", "Bereit-Rennen", 9810);
                let partie = SCHACH_RUNDE.teamBeitreten(
                    angelegt.partie, "id-anna", "weiss", 9820);
                partie = SCHACH_RUNDE.teamBeitreten(partie, "id-bert", "schwarz", 9820);
                /* Die zweite Zusage gibt es seit Punkt 8 (27.08.2026) nur
                   noch MIT Zufallsarmee — ohne sie liefe die Partie nach den
                   zwei ersten Zusagen laengst. */
                partie.regeln.zufallsArmee = true;
                partie = SCHACH_RUNDE.bereitSetzen(partie, "weiss", true, 9830);
                partie = SCHACH_RUNDE.bereitSetzen(partie, "schwarz", true, 9830);

                /* Der Server kennt die zweite Zusage von Weiss schon … */
                let serverTafel = SCHACH_TAFEL.partieEinsetzen(
                    SCHACH_TAFEL.leereTafel(9800),
                    SCHACH_RUNDE.aufstellungBereitSetzen(partie, "weiss", true, 9840),
                    9840);

                /* … das Geraet von Schwarz noch nicht. */
                TEAM_SCHACH.abgleich.daten = SCHACH_TAFEL.partieEinsetzen(
                    SCHACH_TAFEL.leereTafel(9800), partie, 9830);
                TEAM_SCHACH.abgleich.speicher = {
                    art: "gemeinsam",
                    async laden() { return serverTafel; },
                    async speichern(tafel) { serverTafel = tafel; return true; }
                };
                TEAM_SCHACH.offeneId = partie.id;

                await TEAM_SCHACH.aufstellungBereitUmschalten(
                    SCHACH_TAFEL.partie(TEAM_SCHACH.abgleich.daten, partie.id),
                    "schwarz", true);

                const geschrieben = SCHACH_TAFEL.partie(serverTafel, partie.id);
                if (geschrieben.aufstellungBereit.weiss !== true) {
                    throw new Error("die Zusage von Weiss wurde ueberschrieben");
                }
                if (geschrieben.laeuft !== true) {
                    throw new Error(
                        "die Partie startet nicht, obwohl beide zugesagt haben");
                }

                /* FALL 2: die erste Bereitschaft (die Seitenwahl) — dasselbe
                   Rennen einen Bildschirm frueher. */
                const zweite = SCHACH_TAFEL.partieAnlegen(
                    SCHACH_TAFEL.leereTafel(9850), "standard", "Seiten-Rennen", 9860);
                let fruehe = SCHACH_RUNDE.teamBeitreten(
                    zweite.partie, "id-anna", "weiss", 9870);
                fruehe = SCHACH_RUNDE.teamBeitreten(fruehe, "id-bert", "schwarz", 9870);

                serverTafel = SCHACH_TAFEL.partieEinsetzen(
                    SCHACH_TAFEL.leereTafel(9850),
                    SCHACH_RUNDE.bereitSetzen(fruehe, "weiss", true, 9880),
                    9880);
                TEAM_SCHACH.abgleich.daten = SCHACH_TAFEL.partieEinsetzen(
                    SCHACH_TAFEL.leereTafel(9850), fruehe, 9870);
                TEAM_SCHACH.offeneId = fruehe.id;

                await TEAM_SCHACH.bereitUmschalten(
                    SCHACH_TAFEL.partie(TEAM_SCHACH.abgleich.daten, fruehe.id),
                    "schwarz", true);

                const beideBereit = SCHACH_TAFEL.partie(serverTafel, fruehe.id);
                if (beideBereit.bereit.weiss !== true) {
                    throw new Error(
                        "die erste Zusage von Weiss wurde ueberschrieben");
                }
                if (!SCHACH_RUNDE.kannStarten(beideBereit)) {
                    throw new Error(
                        "die Runde erreicht die Aufstellung nicht, obwohl beide"
                            + " Seiten zugesagt haben");
                }
                /* Seit Punkt 8 (27.08.2026) pfeift die zweite erste Zusage
                   ohne Zufallsarmee direkt an — auch das darf das Rennen
                   nicht verschlucken. */
                if (beideBereit.laeuft !== true) {
                    throw new Error(
                        "die Partie startet nicht, obwohl beide erste Zusagen"
                            + " zusammengekommen sind");
                }
            } finally {
                TEAM_SCHACH.abgleich.daten = echteDaten;
                TEAM_SCHACH.abgleich.speicher = echterSpeicher;
                TEAM_SCHACH.offeneId = echteOffene;
            }
        });

    await pruefeMitWarten("Vor-Spiel-Schreibwege raeumen fremde Zusagen nicht ab (v0.90.0)",
        async () => {
            /*
             * DIE VERALLGEMEINERUNG DES BEREIT-FEHLERS (Nebenbefund v0.89.1):
             * Auch Einladen, Beitritt, Zulosung, Wuerfeln und Revanche
             * schrieben die lokal gerechnete Partie und konnten so vor dem
             * ersten Zug fremde Aenderungen ueberschreiben — der Zugzaehler
             * schuetzt dort nicht. Seit v0.90.0 laufen sie ueber
             * `_aufFrischemSenden`.
             *
             * GEPRUEFT WIRD STELLVERTRETEND `einladen`: Auf dem Server liegt
             * die erste Zusage von Weiss, das einladende Geraet haelt noch
             * den Stand davor. Die Einladung muss ankommen, OHNE die Zusage
             * zu loeschen.
             */
            const echteDaten = TEAM_SCHACH.abgleich.daten;
            const echterSpeicher = TEAM_SCHACH.abgleich.speicher;
            const echteOffene = TEAM_SCHACH.offeneId;

            try {
                const angelegt = SCHACH_TAFEL.partieAnlegen(
                    SCHACH_TAFEL.leereTafel(9900), "standard", "Einlade-Rennen", 9910);
                let partie = SCHACH_RUNDE.teamBeitreten(
                    angelegt.partie, "id-anna", "weiss", 9920);
                partie = SCHACH_RUNDE.teamBeitreten(partie, "id-bert", "schwarz", 9920);

                /* Der Server kennt die Zusage von Weiss schon … */
                let serverTafel = SCHACH_TAFEL.partieEinsetzen(
                    SCHACH_TAFEL.leereTafel(9900),
                    SCHACH_RUNDE.bereitSetzen(partie, "weiss", true, 9930),
                    9930);

                /* … das einladende Geraet noch nicht. */
                TEAM_SCHACH.abgleich.daten = SCHACH_TAFEL.partieEinsetzen(
                    SCHACH_TAFEL.leereTafel(9900), partie, 9920);
                TEAM_SCHACH.abgleich.speicher = {
                    art: "gemeinsam",
                    async laden() { return serverTafel; },
                    async speichern(tafel) { serverTafel = tafel; return true; }
                };
                TEAM_SCHACH.offeneId = partie.id;

                await TEAM_SCHACH.einladen(
                    SCHACH_TAFEL.partie(TEAM_SCHACH.abgleich.daten, partie.id),
                    "id-cem");

                const geschrieben = SCHACH_TAFEL.partie(serverTafel, partie.id);
                if (geschrieben.eingeladen.indexOf("id-cem") === -1) {
                    throw new Error("die Einladung ist nicht angekommen");
                }
                if (geschrieben.bereit.weiss !== true) {
                    throw new Error("die Einladung hat die Zusage von Weiss"
                        + " ueberschrieben");
                }
            } finally {
                TEAM_SCHACH.abgleich.daten = echteDaten;
                TEAM_SCHACH.abgleich.speicher = echterSpeicher;
                TEAM_SCHACH.offeneId = echteOffene;
            }
        });

    await pruefeMitWarten("Die Nachkontrolle holt eine ueberschriebene Zusage zurueck (v0.94.0)",
        async () => {
            /*
             * NUTZER-MELDUNG 27.08.2026, NACH v0.89.1: „das mit bereit geht
             * manchmal noch nicht". Das Rest-Fenster: Laden BEIDE Geraete
             * den frischen Stand, BEVOR der jeweils andere geschrieben hat,
             * ueberschreiben sie sich weiterhin — das Frisch-Laden von
             * v0.89.1 schuetzt nur vor VOR dem Laden gelandeten Schreibern.
             *
             * Seit v0.94.0 sieht `_aufFrischemSenden` deshalb nach dem
             * Schreiben noch einmal nach (`_nachkontrolle`): Stand erneut
             * holen, die eigene Aenderung darauf anwenden, bei Neuem einmal
             * nachschreiben. NACHGESTELLT: Weiss drueckt; waehrend sein
             * Schreiben unterwegs ist, ueberschreibt Schwarz' gleichzeitiger
             * Druck die Zusage. Die Nachkontrolle von Weiss muss sie
             * zurueckholen — und weil damit beide Zusagen dastehen, pfeift
             * sie an.
             */
            const echteDaten = TEAM_SCHACH.abgleich.daten;
            const echterSpeicher = TEAM_SCHACH.abgleich.speicher;
            const echteOffene = TEAM_SCHACH.offeneId;

            try {
                const angelegt = SCHACH_TAFEL.partieAnlegen(
                    SCHACH_TAFEL.leereTafel(9950), "standard", "Kontroll-Rennen", 9955);
                let partie = SCHACH_RUNDE.teamBeitreten(
                    angelegt.partie, "id-anna", "weiss", 9960);
                partie = SCHACH_RUNDE.teamBeitreten(partie, "id-bert", "schwarz", 9960);
                /* Die zweite Zusage gibt es seit Punkt 8 (27.08.2026) nur
                   noch MIT Zufallsarmee — ohne sie liefe die Partie nach den
                   zwei ersten Zusagen laengst. */
                partie.regeln.zufallsArmee = true;
                partie = SCHACH_RUNDE.bereitSetzen(partie, "weiss", true, 9965);
                partie = SCHACH_RUNDE.bereitSetzen(partie, "schwarz", true, 9965);

                /* Schwarz' gleichzeitiger Druck, wie er NACH dem Schreiben
                   von Weiss auf dem Server landet: Weiss' Zusage ist weg. */
                const ueberschrieben = SCHACH_TAFEL.partieEinsetzen(
                    SCHACH_TAFEL.leereTafel(9950),
                    SCHACH_RUNDE.aufstellungBereitSetzen(partie, "schwarz", true, 9970),
                    9970);

                let serverTafel = SCHACH_TAFEL.partieEinsetzen(
                    SCHACH_TAFEL.leereTafel(9950), partie, 9965);
                const geschriebene = [];
                let ladeNummer = 0;

                TEAM_SCHACH.abgleich.daten = serverTafel;
                TEAM_SCHACH.abgleich.speicher = {
                    art: "gemeinsam",
                    /* 1. Laden (vor dem Schreiben): der Stand ohne Zusagen.
                       2. Laden (Nachkontrolle): Schwarz hat inzwischen
                       ueberschrieben. */
                    async laden() {
                        ladeNummer += 1;
                        return (ladeNummer === 1) ? serverTafel : ueberschrieben;
                    },
                    async speichern(tafel) {
                        geschriebene.push(tafel);
                        serverTafel = tafel;
                        return true;
                    }
                };
                TEAM_SCHACH.offeneId = partie.id;

                await TEAM_SCHACH.aufstellungBereitUmschalten(
                    SCHACH_TAFEL.partie(TEAM_SCHACH.abgleich.daten, partie.id),
                    "weiss", true);

                if (geschriebene.length !== 2) {
                    throw new Error("erwartet zwei Schreibvorgaenge (Druck +"
                        + " Nachkontrolle), waren " + geschriebene.length);
                }
                const geheilt = SCHACH_TAFEL.partie(serverTafel, partie.id);
                if (geheilt.aufstellungBereit.weiss !== true
                        || geheilt.aufstellungBereit.schwarz !== true) {
                    throw new Error("die Nachkontrolle hat die Zusagen nicht"
                        + " zusammengefuehrt");
                }
                if (geheilt.laeuft !== true) {
                    throw new Error("die Partie startet nicht, obwohl die"
                        + " Nachkontrolle beide Zusagen sah");
                }
            } finally {
                TEAM_SCHACH.abgleich.daten = echteDaten;
                TEAM_SCHACH.abgleich.speicher = echterSpeicher;
                TEAM_SCHACH.offeneId = echteOffene;
            }
        });

    console.log(anzahlOk + " ok, " + anzahlFehler + " Fehler");
    process.exit(anzahlFehler === 0 ? 0 : 1);
}

/* ------------------------------------------------------------------ *
 * Die Zwei-Schritt-Bestätigung am Knopf (v0.112)
 *
 * Geprüft wird die ECHTE Funktion aus js\dialog.js — sie läuft dafür in
 * einem eigenen Kontext, denn im Haupt-Kontext sind die Dialoge bewusst
 * durch Stellvertreter ersetzt (siehe oben).
 * ------------------------------------------------------------------ */

pruefe("Zwei-Schritt: erster Druck fragt nur, zweiter führt aus (v0.112)", () => {
    const dialogUmgebung = { setTimeout: setTimeout, clearTimeout: clearTimeout };
    vm.createContext(dialogUmgebung);
    vm.runInContext(
        dateisystem.readFileSync(pfad.join(jsOrdner, "dialog.js"), "utf8")
            + "\nglobalThis.DIALOG = DIALOG;",
        dialogUmgebung,
        { filename: "dialog.js" }
    );

    let ausgefuehrt = 0;
    const knopf = neuesElement("button");
    knopf.textContent = "Löschen";
    knopf.className = "knopf knopf-gefahr knopf-klein";

    const zurueckgegeben = dialogUmgebung.DIALOG.zweiSchritt(
        knopf, () => { ausgefuehrt += 1; });
    if (zurueckgegeben !== knopf) {
        throw new Error("zweiSchritt gibt den Knopf nicht zurueck");
    }

    knopf.ausloesen("click");
    if (ausgefuehrt !== 0) {
        throw new Error("der erste Druck fuehrt schon aus");
    }
    if (knopf.textContent !== "Wirklich?") {
        throw new Error("der Knopf stellt die Frage nicht selbst");
    }
    if (knopf.className.indexOf("knopf-wirklich") === -1) {
        throw new Error("der Frage-Zustand traegt seine Klasse nicht");
    }

    knopf.ausloesen("click");
    if (ausgefuehrt !== 1) {
        throw new Error("der zweite Druck fuehrt nicht aus");
    }
    if (knopf.textContent !== "Löschen"
            || knopf.className !== "knopf knopf-gefahr knopf-klein") {
        throw new Error("der Knopf kehrt nach dem zweiten Druck nicht zurueck");
    }
});

/* ------------------------------------------------------------------ *
 * Eine offene Runde ist ein eigenes Fenster (v0.113)
 * ------------------------------------------------------------------ */

pruefe("Die offene Partie meldet sich als Fenster, die Uebersicht zurueck (v0.113)", () => {
    TEAM_SCHACH.infoOffen = false;
    TEAM_SCHACH.grundlagenOffen = false;
    TEAM_SCHACH.auswahlOffen = false;
    TEAM_SCHACH.abschluss = null;

    /* Herumliegende Abschluesse abhaken, sonst draengt sich der Punktestand
       vor die Partie (siehe `zeichnen`). */
    const liste = SCHACH_TAFEL.liste(TEAM_SCHACH.abgleich.daten);
    for (const partie of liste) {
        if (partie.ergebnis) {
            umgebung.ICH.abschlussMerken(partie.id);
        }
    }
    if (liste.length === 0) {
        throw new Error("keine Partie zum Oeffnen da");
    }

    TEAM_SCHACH.partieOeffnen(liste[0].id);
    if (!umgebung.TABS.zuletzt
            || umgebung.TABS.zuletzt.tabId !== "team-schach"
            || umgebung.TABS.zuletzt.offen !== true) {
        throw new Error("die offene Partie meldet kein Fenster");
    }

    TEAM_SCHACH.uebersichtOeffnen();
    if (umgebung.TABS.zuletzt.offen !== false) {
        throw new Error("die Uebersicht nimmt das Fenster nicht zurueck");
    }
});

/* ------------------------------------------------------------------ *
 * Die Wirkungs-Schauspiele (v0.115)
 * ------------------------------------------------------------------ */

/* Ein kleines Brett aus zwei Zellen mit echten Massen — mehr braucht das
   Schauspiel nicht. */
function schauspielBrett() {
    const halter = neuesElement("div");
    const brett = neuesElement("div");
    brett.className = "brett";
    halter.appendChild(brett);

    for (const eintrag of [{ feld: 3, oben: 0 }, { feld: 11, oben: 40 }]) {
        const zelle = neuesElement("button");
        zelle.className = "feld";
        zelle.dataset.feld = String(eintrag.feld);
        zelle.offsetLeft = 40;
        zelle.offsetTop = eintrag.oben;
        zelle.offsetHeight = 40;
        brett.appendChild(zelle);
    }
    return { halter: halter, brett: brett };
}

pruefe("Das Nudelholz rollt als Walze ueber die betroffenen Felder (v0.115)", () => {
    const aufbau = schauspielBrett();
    TEAM_SCHACH._wirkungSchauspiel(aufbau.halter,
        { wirkung: "nudelholz", felder: [3, 11] });

    const walze = aufbau.brett.kinder.find((kind) =>
        String(kind.className).indexOf("nudelholz-walze") !== -1);
    if (!walze) {
        throw new Error("keine Walze auf dem Brett");
    }
    if (walze.style.left !== "40px" || walze.style.width !== "40px") {
        throw new Error("die Walze liegt nicht ueber den Feldern ("
            + walze.style.left + ", " + walze.style.width + ")");
    }

    /* Ohne Wege gilt die Vorgabe: von unten nach oben (v0.117). */
    if (walze.style["--roll-von"] !== "0px, 80px"
            || walze.style["--roll-bis"] !== "0px, -24px") {
        throw new Error("die Walze rollt nicht von unten nach oben: "
            + walze.style["--roll-von"] + " / " + walze.style["--roll-bis"]);
    }
});

pruefe("Die Walze folgt der Richtung der geschobenen Figuren (v0.117)", () => {
    /* Ein Weg von Feld 3 (oben) nach Feld 11 (unten) heisst: Es rollt auf
       dem Schirm nach unten — die Walze startet dann oben. */
    const aufbau = schauspielBrett();
    TEAM_SCHACH._wirkungSchauspiel(aufbau.halter, {
        wirkung: "nudelholz",
        felder: [3, 11],
        wege: [{ von: 3, nach: 11 }]
    });

    const walze = aufbau.brett.kinder.find((kind) =>
        String(kind.className).indexOf("nudelholz-walze") !== -1);
    if (!walze) {
        throw new Error("keine Walze auf dem Brett");
    }
    if (walze.style["--roll-von"] !== "0px, -24px"
            || walze.style["--roll-bis"] !== "0px, 80px") {
        throw new Error("die Walze startet nicht am Start-Rand: "
            + walze.style["--roll-von"] + " / " + walze.style["--roll-bis"]);
    }
});

pruefe("Schutzschild und Frost bekommen ihre Marke im Feld (v0.115)", () => {
    for (const fall of [
        { wirkung: "schutzschild", klasse: "wirkung-schild" },
        { wirkung: "frost", klasse: "wirkung-frost" }
    ]) {
        const aufbau = schauspielBrett();
        TEAM_SCHACH._wirkungSchauspiel(aufbau.halter,
            { wirkung: fall.wirkung, felder: [3] });

        const zelle = aufbau.brett.kinder.find((kind) => kind.dataset.feld === "3");
        const marke = (zelle.kinder || []).find((kind) =>
            String(kind.className).indexOf(fall.klasse) !== -1);
        if (!marke) {
            throw new Error(fall.wirkung + " bekommt keine Marke");
        }
    }
});

pruefe("Das Schauspiel haengt am Wirkungs-Abspieler (v0.115)", () => {
    /* Quelltext-Pruefung wie bei v0.52: Der Aufruf muss in
       `_wirkungAnimieren` stehen, sonst spielt nie etwas. */
    if (String(TEAM_SCHACH._wirkungAnimieren).indexOf("_wirkungSchauspiel") === -1) {
        throw new Error("_wirkungAnimieren ruft das Schauspiel nicht auf");
    }
});

/* ------------------------------------------------------------------ *
 * Anleitung, Hand und Konfetti (v0.116)
 * ------------------------------------------------------------------ */

pruefe("Das Wirkungs-Bild der Anleitung traegt sein Schauspiel (v0.116)", () => {
    const schritte = umgebung.SCHACH_VORSCHAU.schritte("nudelholz");
    if (!schritte) {
        throw new Error("keine Anleitung fuer das Nudelholz");
    }
    const mitSchauspiel = schritte.filter(
        (schritt) => schritt.schauspiel === "nudelholz");
    if (mitSchauspiel.length !== 1) {
        throw new Error("das Schauspiel steht in " + mitSchauspiel.length
            + " Bildern statt in genau einem");
    }
    if (mitSchauspiel[0].tipp !== -1) {
        throw new Error("das Schauspiel liegt auf einem Tipp-Bild statt auf der Wirkung");
    }
});

pruefe("Die tippende Hand ersetzt den Fingerabdruck (v0.116)", () => {
    const hand = TEAM_SCHACH._fingerBauen();
    if (String(hand.attribute["class"] || "").indexOf("anleitung-hand") === -1) {
        throw new Error("die Hand traegt ihre Klasse nicht");
    }
    const flaeche = (hand.kinder || []).filter((kind) =>
        String(kind.attribute && kind.attribute["class"] || "")
            .indexOf("anleitung-hand-flaeche") !== -1);
    if (flaeche.length !== 1) {
        throw new Error("die Handflaeche fehlt");
    }
});

pruefe("Konfetti regnet zum Sieg genau einmal je Partie (v0.116)", () => {
    const flaeche = neuesElement("div");
    TEAM_SCHACH._konfettiStreuen(flaeche, "partie-konfetti-test");

    const regen = flaeche.kinder.filter((kind) =>
        String(kind.className).indexOf("konfetti-regen") !== -1);
    if (regen.length !== 1) {
        throw new Error("kein Konfettiregen");
    }
    if (regen[0].kinder.length !== 24) {
        throw new Error("es fallen " + regen[0].kinder.length + " statt 24 Stuecke");
    }

    TEAM_SCHACH._konfettiStreuen(flaeche, "partie-konfetti-test");
    const nochmal = flaeche.kinder.filter((kind) =>
        String(kind.className).indexOf("konfetti-regen") !== -1);
    if (nochmal.length !== 1) {
        throw new Error("das Konfetti regnet bei jedem Neuzeichnen erneut");
    }
});

/* ------------------------------------------------------------------ *
 * Der Einstellungen-Tab (v0.119, seit Wunsch 4 ohne Design-Schalter)
 * ------------------------------------------------------------------ */

pruefe("Der 3D-Look ist fest an, ohne Schalter (Wunsch 4, v0.17.0)", () => {
    /*
     * DER GEMELDETE WUNSCH: „2D/3D-Schalter entfernen — die App bleibt
     * dauerhaft im 3D-Look."
     *
     * Bis v0.16.0 stand hier ein Test, der den Kipp-Schalter hin und her
     * schaltete. An seine Stelle tritt die neue Zusage: Die Klasse
     * `design-3d` haengt fest am body, und in den Einstellungen gibt es
     * keinen Schalter mehr.
     */
    const EINSTELLUNGEN = umgebung.EINSTELLUNGEN;
    if (!EINSTELLUNGEN || EINSTELLUNGEN.id !== "einstellungen") {
        throw new Error("der Einstellungen-Baustein fehlt");
    }

    EINSTELLUNGEN.laden();
    if (!umgebung.document.body.classList.contains("design-3d")) {
        throw new Error("der 3D-Look wird beim Start nicht gesetzt");
    }

    /* Zweimal laden darf die Klasse nicht wieder abschalten. */
    EINSTELLUNGEN.laden();
    if (!umgebung.document.body.classList.contains("design-3d")) {
        throw new Error("ein zweites Laden nimmt den 3D-Look zurueck");
    }

    EINSTELLUNGEN.aufbauen(neuesElement("div"));

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

    if (suchen(EINSTELLUNGEN.wurzelEl, "schalter-kasten")) {
        throw new Error("der Design-Schalter haengt noch in den Einstellungen");
    }
    if (EINSTELLUNGEN.designSetzen) {
        throw new Error("designSetzen gibt es noch — die Wahl ist entfallen");
    }
});

pruefe("Der Stand des Abgleichs steht in den Einstellungen (Wunsch 2)", () => {
    /*
     * DER GEMELDETE WUNSCH: „Status-Anzeige (gruener Punkt ‚Gemeinsame
     * Tabelle …') aus dem Kopf in die Einstellungen verschieben — nicht
     * mehr dauerhaft oben."
     *
     * app.js laeuft in diesem Test nicht mit (es haengt am echten
     * Dokument). Sein Stand wird deshalb nachgestellt — geprueft wird,
     * dass die Karte ihn abholt und dass eine spaetere Meldung durchkommt.
     */
    const EINSTELLUNGEN = umgebung.EINSTELLUNGEN;
    umgebung.APP = { status: "bereit", statusText: "Gemeinsame Tabelle" };

    try {
        EINSTELLUNGEN.aufbauen(neuesElement("div"));

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

        const zeile = suchen(EINSTELLUNGEN.wurzelEl, "status-karte");
        if (!zeile) {
            throw new Error("keine Verbindungs-Karte in den Einstellungen");
        }
        if (zeile.attribute["data-status"] !== "bereit") {
            throw new Error("die Karte zeigt den Stand nicht: "
                + zeile.attribute["data-status"]);
        }
        if (String(EINSTELLUNGEN.statusTextEl.textContent) !== "Gemeinsame Tabelle") {
            throw new Error("die Karte zeigt den Text nicht");
        }

        /* Eine spaetere Meldung erreicht die haengende Karte. */
        umgebung.APP.status = "fehler";
        umgebung.APP.statusText = "Nicht erreichbar";
        EINSTELLUNGEN.statusAktualisieren();

        if (zeile.attribute["data-status"] !== "fehler") {
            throw new Error("eine spaetere Meldung kommt nicht an");
        }
    } finally {
        delete umgebung.APP;
    }
});

pruefe("Version und Wunsch-Knopf stehen in den Einstellungen (v0.25.0)", () => {
    /*
     * DIE GEMELDETE ANSAGE: „die version und der wunsch knopf oben raus und
     * auch in die einstellungen verschieben damit mehr plaz fuer das
     * wichtige ist."
     *
     * wunsch.js laeuft in diesem Test nicht mit (es haengt am echten
     * Dokument) — geprueft wird deshalb die Karte samt Versionszeile und
     * dem Platz, in den der Knopf sich einhaengt.
     */
    const EINSTELLUNGEN = umgebung.EINSTELLUNGEN;
    EINSTELLUNGEN.aufbauen(neuesElement("div"));

    const einsammeln = (element, passt, treffer) => {
        for (const kind of element.kinder || []) {
            if (passt(kind)) {
                treffer.push(kind);
            }
            einsammeln(kind, passt, treffer);
        }
        return treffer;
    };

    const zeile = einsammeln(EINSTELLUNGEN.wurzelEl, (kind) =>
        String(kind.className || "").indexOf("version") !== -1, [])[0];
    if (!zeile) {
        throw new Error("keine Versionszeile in den Einstellungen");
    }
    if (String(zeile.textContent).indexOf(umgebung.KONFIG.APP_VERSION) === -1) {
        throw new Error("die Versionszeile nennt die Version nicht: "
            + zeile.textContent);
    }

    const ueberschriften = einsammeln(EINSTELLUNGEN.wurzelEl, (kind) =>
        kind.tagName === "h2", []).map((kind) => String(kind.textContent));
    if (ueberschriften.indexOf("Über die App") === -1) {
        throw new Error("keine Karte Über die App, nur: "
            + ueberschriften.join(", "));
    }
});

pruefe("Die Account-Karte trennt Abmelden und Konto loeschen (v0.6.0)", () => {
    /*
     * Buendel A, Schritt 1: Abmelden (Geraet vergisst die Anmeldung, das
     * Konto bleibt) und Konto loeschen (der Eintrag verschwindet) stehen in
     * einer eigenen Karte „Account". Der alte Knopf „Ich bin raus" darf
     * nirgends mehr auftauchen — er hiesse zwei Dinge zugleich.
     */
    const EINSTELLUNGEN = umgebung.EINSTELLUNGEN;
    EINSTELLUNGEN.aufbauen(neuesElement("div"));

    const knoepfe = [];
    const sammeln = (element) => {
        for (const kind of element.kinder || []) {
            if (kind.tagName === "button") {
                knoepfe.push(kind);
            }
            sammeln(kind);
        }
    };
    sammeln(EINSTELLUNGEN.wurzelEl);

    const texte = knoepfe.map((knopf) => String(knopf.textContent || ""));

    if (texte.indexOf("Abmelden") === -1) {
        throw new Error("kein Abmelden-Knopf in den Einstellungen");
    }
    if (texte.indexOf("Konto löschen") === -1) {
        throw new Error("kein Konto-loeschen-Knopf in den Einstellungen");
    }
    if (texte.indexOf("Ich bin raus") !== -1) {
        throw new Error("der alte Knopf Ich bin raus steht noch da");
    }

    /* Konto loeschen ist zerstoerend und muss rot sein — Abmelden nicht. */
    const loeschen = knoepfe[texte.indexOf("Konto löschen")];
    if (String(loeschen.className).indexOf("knopf-gefahr") === -1) {
        throw new Error("Konto loeschen ist nicht als Gefahr gekennzeichnet");
    }
    const abmelden = knoepfe[texte.indexOf("Abmelden")];
    if (String(abmelden.className).indexOf("knopf-gefahr") !== -1) {
        throw new Error("Abmelden darf nicht rot sein — es loescht nichts");
    }
});

/* ------------------------------------------------------------------ *
 * Der Verwaltungs-Bildschirm (Nutzer-Ansage 27.08.2026)
 *
 * „gebe mir in der verwaltung nicht alle spieler unter einander sonderern
 * alls seperater screen und als Tabelle." — Die Mitspieler-Liste hing bis
 * v0.99.0 eingebettet in der Spieler-Karte der Einstellungen; jetzt ist
 * sie ein eigener Bildschirm (js\verwaltungs-bildschirm.js) mit einer
 * Tabellenzeile je Spieler. Drei Zusagen werden geprueft: die Zeilenzahl,
 * der unveraenderte Entfernen-Weg und der fehlende Zugang ohne
 * Freischaltung.
 * ------------------------------------------------------------------ */

pruefe("Die Verwaltungs-Tabelle hat eine Zeile je Spieler", () => {
    const VB = umgebung.VERWALTUNGS_BILDSCHIRM;
    if (!VB || VB.id !== "verwaltung" || VB.inLeiste !== false) {
        throw new Error("der Verwaltungs-Bildschirm fehlt oder haengt in der Leiste");
    }

    const datenVorher = ANMELDUNG.abgleich.daten;
    try {
        /* Drei Spieler hinein — die Tabelle muss GENAU drei Zeilen zeigen. */
        let daten = SPIELER.leereDaten(1000);
        daten = SPIELER.spielerHinzufuegen(daten, "Anna", "id-anna", 1000);
        daten = SPIELER.spielerHinzufuegen(daten, "Bert", "id-bert", 1000);
        daten = SPIELER.spielerHinzufuegen(daten, "Cem", "id-cem", 1000);
        ANMELDUNG.abgleich.daten = daten;

        umgebung.ICH.verwaltungSetzen(true);
        VB.aufbauen(neuesElement("div"));

        const zeilen = einsammelnIn(VB.wurzelEl, (kind) =>
            kind.tagName === "tr", []);
        const koerperZeilen = zeilen.filter((zeile) =>
            (zeile.kinder || []).some((zelle) => zelle.tagName === "td"));
        if (koerperZeilen.length !== 3) {
            throw new Error("die Tabelle zeigt " + koerperZeilen.length
                + " statt 3 Zeilen");
        }

        /* Es ist eine echte Tabelle mit Kopf — keine Liste untereinander. */
        if (!einsammelnIn(VB.wurzelEl, (kind) => kind.tagName === "table", [])[0]) {
            throw new Error("keine Tabelle auf dem Verwaltungs-Bildschirm");
        }
        const kopfTexte = einsammelnIn(VB.wurzelEl, (kind) =>
            kind.tagName === "th", []).map((zelle) => String(zelle.textContent));
        if (kopfTexte.indexOf("Name") === -1) {
            throw new Error("die Tabelle hat keine Namens-Spalte, nur: "
                + kopfTexte.join(", "));
        }

        /* Die Tabelle rollt auf schmalen Bildschirmen im eigenen Behaelter. */
        if (!einsammelnIn(VB.wurzelEl, (kind) =>
                String(kind.className || "").indexOf("tabelle-rollbereich") !== -1,
                [])[0]) {
            throw new Error("die Tabelle hat keinen waagerechten Rollbereich");
        }

        /* Der eigene Eintrag ist markiert, ein Geheimnis steht nirgends. */
        const annaZeile = koerperZeilen[0];
        if (String((annaZeile.kinder[0] || {}).textContent).indexOf("(du)") === -1) {
            throw new Error("der eigene Eintrag ist nicht als (du) markiert");
        }
    } finally {
        ANMELDUNG.abgleich.daten = datenVorher;
        umgebung.ICH.verwaltungSetzen(false);
    }
});

pruefe("Entfernen laeuft weiter ueber ANMELDUNG.spielerEntfernen", () => {
    const VB = umgebung.VERWALTUNGS_BILDSCHIRM;
    const datenVorher = ANMELDUNG.abgleich.daten;
    const entfernenVorher = ANMELDUNG.spielerEntfernen;
    const entfernteIds = [];

    try {
        let daten = SPIELER.leereDaten(1000);
        daten = SPIELER.spielerHinzufuegen(daten, "Anna", "id-anna", 1000);
        daten = SPIELER.spielerHinzufuegen(daten, "Bert", "id-bert", 1000);
        ANMELDUNG.abgleich.daten = daten;

        /* Der Spitzel: aufzeichnen, mit welcher Kennung die BESTEHENDE
           Funktion gerufen wird — der Weg selbst bleibt unveraendert. */
        ANMELDUNG.spielerEntfernen = (id) => { entfernteIds.push(id); };

        umgebung.ICH.verwaltungSetzen(true);
        VB.aufbauen(neuesElement("div"));

        const knoepfe = einsammelnIn(VB.wurzelEl, (kind) =>
            kind.tagName === "button"
                && String(kind.textContent) === "Entfernen", []);
        if (knoepfe.length !== 2) {
            throw new Error(knoepfe.length + " statt 2 Entfernen-Knoepfe");
        }
        if (einsammelnIn(VB.wurzelEl, (kind) => kind.tagName === "button"
                && String(kind.className).indexOf("knopf-gefahr") !== -1
                && String(kind.textContent) !== "Entfernen", []).length !== 0) {
            throw new Error("ein anderer Knopf ist rot — nur Entfernen zerstoert");
        }

        /* Klick auf Berts Entfernen (zweiSchritt sagt im Test sofort zu). */
        knoepfe[1].ausloesen("click");
        if (entfernteIds.length !== 1 || entfernteIds[0] !== "id-bert") {
            throw new Error("spielerEntfernen wurde gerufen mit: "
                + entfernteIds.join(", "));
        }
    } finally {
        ANMELDUNG.abgleich.daten = datenVorher;
        ANMELDUNG.spielerEntfernen = entfernenVorher;
        umgebung.ICH.verwaltungSetzen(false);
    }
});

pruefe("Ohne Freischaltung: kein Zugang, keine eingebettete Liste mehr", () => {
    const VB = umgebung.VERWALTUNGS_BILDSCHIRM;
    const EINSTELLUNGEN = umgebung.EINSTELLUNGEN;
    const datenVorher = ANMELDUNG.abgleich.daten;

    try {
        let daten = SPIELER.leereDaten(1000);
        daten = SPIELER.spielerHinzufuegen(daten, "Anna", "id-anna", 1000);
        daten = SPIELER.spielerHinzufuegen(daten, "Bert", "id-bert", 1000);
        ANMELDUNG.abgleich.daten = daten;

        /* 1. Der Bildschirm selbst zeigt ohne Freischaltung nur den
           Hinweis — keine Tabelle, keine Entfernen-Knoepfe. */
        umgebung.ICH.verwaltungSetzen(false);
        VB.aufbauen(neuesElement("div"));

        if (einsammelnIn(VB.wurzelEl, (kind) => kind.tagName === "table", [])[0]) {
            throw new Error("ohne Freischaltung steht die Tabelle da");
        }
        if (einsammelnIn(VB.wurzelEl, (kind) => kind.tagName === "button"
                && String(kind.textContent) === "Entfernen", []).length !== 0) {
            throw new Error("ohne Freischaltung gibt es Entfernen-Knoepfe");
        }

        /* 2. Die Einstellungen betten die Liste auch MIT Freischaltung
           nicht mehr ein — es bleibt der EINE Knopf „Verwaltung". */
        umgebung.ICH.verwaltungSetzen(true);
        EINSTELLUNGEN.aufbauen(neuesElement("div"));

        const knopfTexte = einsammelnIn(EINSTELLUNGEN.wurzelEl, (kind) =>
            kind.tagName === "button", []).map((knopf) =>
            String(knopf.textContent));
        if (knopfTexte.indexOf("Verwaltung") === -1) {
            throw new Error("kein Verwaltung-Knopf in den Einstellungen");
        }
        if (knopfTexte.indexOf("Entfernen") !== -1) {
            throw new Error("die Mitspieler-Liste haengt noch in den Einstellungen");
        }
        if (knopfTexte.indexOf("Verwaltung beenden") !== -1) {
            throw new Error("der Umschalt-Knopf steht noch in den Einstellungen"
                + " — beendet wird auf dem Verwaltungs-Bildschirm");
        }
    } finally {
        ANMELDUNG.abgleich.daten = datenVorher;
        umgebung.ICH.verwaltungSetzen(false);
    }
});

/* Der kleine Sammler der drei Verwaltungs-Tests: alle Elemente unterhalb
   von `element`, auf die `passt` zutrifft. */
function einsammelnIn(element, passt, treffer) {
    for (const kind of (element && element.kinder) || []) {
        if (passt(kind)) {
            treffer.push(kind);
        }
        einsammelnIn(kind, passt, treffer);
    }
    return treffer;
}

/* ------------------------------------------------------------------ *
 * Der Startbildschirm und der Faehigkeiten-Tab (v0.9.0, Schritt 4)
 * ------------------------------------------------------------------ */

pruefe("Der Startbildschirm zeigt Vorschau, Spielen und Zahnrad (v0.9.0)", () => {
    const START = umgebung.START;
    if (!START || START.id !== "start") {
        throw new Error("der Start-Baustein fehlt");
    }

    START.aufbauen(neuesElement("div"));

    const einsammeln = (element, passt, treffer) => {
        for (const kind of element.kinder || []) {
            if (passt(kind)) {
                treffer.push(kind);
            }
            einsammeln(kind, passt, treffer);
        }
        return treffer;
    };

    const knoepfe = einsammeln(START.wurzelEl,
        (kind) => kind.tagName === "button", []);

    const spielen = knoepfe.find(
        (knopf) => String(knopf.textContent || "") === "Spielen");
    if (!spielen) {
        throw new Error("kein Spielen-Knopf");
    }
    if (String(spielen.className).indexOf("knopf-haupt") === -1) {
        throw new Error("Spielen ist nicht die Hauptaktion");
    }

    if (!knoepfe.some((knopf) => knopf.attribute
            && knopf.attribute["aria-label"] === "Grundeinstellungen")) {
        throw new Error("kein Quadrat fuer die Grundeinstellungen");
    }
    if (!knoepfe.some((knopf) => knopf.attribute
            && knopf.attribute["aria-label"] === "Einstellungen")) {
        throw new Error("kein Zahnrad fuer die Einstellungen");
    }

    /* Das Vorschaubrett ist da und hat Felder. */
    const vorschau = einsammeln(START.wurzelEl, (kind) =>
        String(kind.className || "").split(" ").indexOf("vorschau") !== -1, [])[0];
    if (!vorschau) {
        throw new Error("kein Vorschaubrett auf dem Start");
    }
    if (!vorschau.kinder || vorschau.kinder.length < 16) {
        throw new Error("das Vorschaubrett hat keine Felder");
    }

    /* Das Zahnrad fuehrt in die Einstellungen. */
    const zahnrad = knoepfe.find((knopf) => knopf.attribute
        && knopf.attribute["aria-label"] === "Einstellungen");
    zahnrad.ausloesen("click");
    if (umgebung.TABS.gewechseltZu !== "einstellungen") {
        throw new Error("das Zahnrad wechselt nicht zu den Einstellungen");
    }
    umgebung.TABS.gewechseltZu = "";
});

pruefe("Ein Tipp auf die Vorschau oeffnet die Brettform (Wunsch 7)", () => {
    /*
     * DER GEMELDETE WUNSCH: „Die Schachbrett-Vorschau ueber Spielen wird
     * drueckbar: Ein Tipp darauf oeffnet die Wahl der Brettform."
     *
     * Sie ist deshalb seit v0.20.0 ein `button`. Zu SEHEN ist nur ein
     * Brett — der Test besteht darum auf einer Beschriftung fuer
     * Vorleseprogramme.
     */
    const START = umgebung.START;
    START.aufbauen(neuesElement("div"));

    const suchen = (element) => {
        for (const kind of element.kinder || []) {
            if (String(kind.className || "").split(" ")
                    .indexOf("start-vorschau") !== -1) {
                return kind;
            }
            const tiefer = suchen(kind);
            if (tiefer) {
                return tiefer;
            }
        }
        return null;
    };

    const vorschau = suchen(START.wurzelEl);
    if (!vorschau) {
        throw new Error("keine Vorschau auf dem Start");
    }
    if (vorschau.tagName !== "button") {
        throw new Error("die Vorschau ist kein Knopf, sondern: " + vorschau.tagName);
    }
    if (!vorschau.attribute || !vorschau.attribute["aria-label"]) {
        throw new Error("die Vorschau hat keine Beschriftung");
    }

    TEAM_SCHACH.auswahlOffen = false;
    umgebung.TABS.gewechseltZu = "";
    vorschau.ausloesen("click");

    if (umgebung.TABS.gewechseltZu !== "team-schach") {
        throw new Error("die Vorschau wechselt nicht ins Team Schach");
    }
    if (!TEAM_SCHACH.auswahlOffen) {
        throw new Error("die Vorschau oeffnet die Brettform-Wahl nicht");
    }

    TEAM_SCHACH.auswahlSchliessen();
    umgebung.TABS.gewechseltZu = "";
});

pruefe("Pfeil und Vorschau fuehren auf getrennte Bildschirme (Wunsch 8)", () => {
    /*
     * DER GEMELDETE WUNSCH: „Unter dem Pfeil neben Spielen verschwindet die
     * Spielart-Auswahl: Dort werden nur noch die Grundeinstellungen der
     * Runde festgelegt (Regler/Haken). Die Brettform waehlt man ueber die
     * Vorschau."
     */
    const einsammeln = (element, passt, treffer) => {
        for (const kind of element.kinder || []) {
            if (passt(kind)) {
                treffer.push(kind);
            }
            einsammeln(kind, passt, treffer);
        }
        return treffer;
    };
    const kacheln = () => einsammeln(TEAM_SCHACH.wurzelEl, (kind) =>
        String(kind.className || "").indexOf("spielart-kachel") !== -1, []);
    const formKnoepfe = () => einsammeln(TEAM_SCHACH.wurzelEl, (kind) =>
        String(kind.className || "").indexOf("form-knopf") !== -1, []);
    const schalter = () => einsammeln(TEAM_SCHACH.wurzelEl, (kind) =>
        String(kind.className || "").indexOf("schalter-kasten") !== -1, []);

    /* Der Pfeil: Regler ja, Brettform und Kacheln nein. */
    TEAM_SCHACH.partieAnlegen();
    if (TEAM_SCHACH.auswahlTeil !== "regeln") {
        throw new Error("der Pfeil oeffnet nicht die Grundeinstellungen");
    }
    if (schalter().length === 0) {
        throw new Error("auf den Grundeinstellungen fehlen die Haken");
    }
    if (kacheln().length !== 0 || formKnoepfe().length !== 0) {
        throw new Error("die Brettform haengt noch unter dem Pfeil");
    }

    /* Was hier eingestellt wird, ueberlebt das Zurueck (es gibt hier keine
       Kachel, die es merken koennte). */
    TEAM_SCHACH.neueRegeln.armeeStaerke = "viel";
    TEAM_SCHACH.auswahlSchliessen();
    if (umgebung.START.regeln().armeeStaerke !== "viel") {
        throw new Error("Zurueck vergisst die Regler");
    }

    /* Die Vorschau: Brettform und Kacheln ja, Regler nein. */
    TEAM_SCHACH.brettformOeffnen();
    if (TEAM_SCHACH.auswahlTeil !== "brett") {
        throw new Error("die Vorschau oeffnet nicht die Brettform");
    }
    if (kacheln().length === 0 || formKnoepfe().length === 0) {
        throw new Error("auf der Brettform fehlen Form oder Groessen");
    }
    if (schalter().length !== 0) {
        throw new Error("die Regler haengen noch bei der Brettform");
    }

    TEAM_SCHACH.auswahlSchliessen();
    umgebung.TABS.gewechseltZu = "";
});

/* ------------------------------------------------------------------ *
 * Wunsch 1 (24.08.2026): Die Kachel merkt nur, „Spielen" legt an
 * ------------------------------------------------------------------ */

pruefe("Die Spielart-Kachel legt nichts mehr an, sie merkt nur (Wunsch 1)", () => {
    const START = umgebung.START;

    /*
     * DER GEMELDETE WUNSCH: „Wenn in der Auswahl alles gewaehlt ist und man
     * auf die Spielart-Kachel drueckt, soll NICHT ‚Name eingeben' kommen —
     * die Wahl soll nur GEMERKT werden, und man kommt zurueck zum
     * Start-Screen."
     *
     * Geprueft wird beides: dass keine Partie entsteht und dass Spielart
     * UND Regler im Geraetespeicher landen.
     */
    TEAM_SCHACH.partieAnlegen();
    if (!TEAM_SCHACH.auswahlOffen) {
        throw new Error("die Auswahl ist gar nicht offen");
    }

    /* Zwei Regler verstellen — sie muessen die Kachel ueberleben. */
    TEAM_SCHACH.neueRegeln.faehigkeiten = true;
    TEAM_SCHACH.neueRegeln.armeeStaerke = "wenig";

    const vorher = SCHACH_TAFEL.liste(TEAM_SCHACH.abgleich.daten).length;

    /* Eine Spielart, die NICHT die Vorgabe ist — sonst beweist der
       Vergleich unten nichts. */
    const gewaehlt = SCHACH_VARIANTEN.liste[1] || SCHACH_VARIANTEN.liste[0];
    umgebung.TABS.gewechseltZu = "";
    TEAM_SCHACH.spielartGewaehlt(gewaehlt.id);

    if (SCHACH_TAFEL.liste(TEAM_SCHACH.abgleich.daten).length !== vorher) {
        throw new Error("die Kachel hat doch eine Partie angelegt");
    }
    if (TEAM_SCHACH.auswahlOffen) {
        throw new Error("die Auswahl bleibt nach der Wahl offen");
    }
    if (umgebung.TABS.gewechseltZu !== "start") {
        throw new Error("die Kachel fuehrt nicht zurueck zum Start");
    }
    if (START._spielart().id !== gewaehlt.id) {
        throw new Error("die Spielart wurde nicht gemerkt");
    }

    const gemerkt = START.regeln();
    if (gemerkt.faehigkeiten !== true || gemerkt.armeeStaerke !== "wenig") {
        throw new Error("die Regler wurden nicht gemerkt");
    }

    /* Und die Auswahl zeigt beim naechsten Oeffnen genau das wieder. */
    TEAM_SCHACH.partieAnlegen();
    if (TEAM_SCHACH.neueRegeln.armeeStaerke !== "wenig") {
        throw new Error("die Auswahl faengt wieder bei den Vorgaben an");
    }
    if (TEAM_SCHACH.gewaehlteForm !== SCHACH_VARIANTEN.formVon(gewaehlt)) {
        throw new Error("die Auswahl oeffnet die falsche Brettform");
    }

    TEAM_SCHACH.auswahlSchliessen();
    umgebung.TABS.gewechseltZu = "";
});

pruefe("Der Start fuehrt zum Beitreten und Spielen ist die Hauptaktion (Wunsch 1)", () => {
    const START = umgebung.START;
    START.aufbauen(neuesElement("div"));

    const einsammeln = (element, passt, treffer) => {
        for (const kind of element.kinder || []) {
            if (passt(kind)) {
                treffer.push(kind);
            }
            einsammeln(kind, passt, treffer);
        }
        return treffer;
    };

    const knoepfe = einsammeln(START.wurzelEl,
        (kind) => kind.tagName === "button", []);

    const beitreten = knoepfe.find(
        (knopf) => String(knopf.textContent || "") === "Runde beitreten");
    if (!beitreten) {
        throw new Error("kein Knopf Runde beitreten auf dem Start");
    }
    if (String(beitreten.className).indexOf("knopf-haupt") !== -1) {
        throw new Error("Beitreten macht Spielen die Hauptaktion streitig");
    }

    umgebung.TABS.gewechseltZu = "";
    beitreten.ausloesen("click");
    if (umgebung.TABS.gewechseltZu !== "team-schach") {
        throw new Error("Beitreten fuehrt nicht auf den Zwischenbildschirm");
    }
    umgebung.TABS.gewechseltZu = "";
});

pruefe("Der Faehigkeiten-Tab zeichnet die Bibliothek ohne Zurueck (v0.9.0)", () => {
    const FAEHIGKEITEN = umgebung.FAEHIGKEITEN;
    if (!FAEHIGKEITEN || FAEHIGKEITEN.id !== "faehigkeiten") {
        throw new Error("der Faehigkeiten-Baustein fehlt");
    }

    FAEHIGKEITEN.aufbauen(neuesElement("div"));
    FAEHIGKEITEN.beimOeffnen();

    const einsammeln = (element, passt, treffer) => {
        for (const kind of element.kinder || []) {
            if (passt(kind)) {
                treffer.push(kind);
            }
            einsammeln(kind, passt, treffer);
        }
        return treffer;
    };

    /* Seit Wunsch 5 (v0.18.0) steht im Tab das Raster mit der
       Stufen-Legende — keine Stufen-Karten mehr. */
    const karten = einsammeln(FAEHIGKEITEN.wurzelEl, (kind) =>
        String(kind.className || "").indexOf("stufen-karte") !== -1, []);
    if (karten.length !== 0) {
        throw new Error("im Tab haengen noch " + karten.length + " Stufen-Karten");
    }

    /* Seit v0.86.0 steht im Tab NUR das Raster — Skala und Texte liegen
       hinter dem i (Nutzer-Ansage 27.08.2026). */
    const zeilen = einsammeln(FAEHIGKEITEN.wurzelEl, (kind) =>
        String(kind.className || "").indexOf("stufen-legende-zeile") !== -1, []);
    if (zeilen.length !== 0) {
        throw new Error("die Stufen-Skala steht noch offen im Tab ("
            + zeilen.length + " Zeilen)");
    }

    const texte = einsammeln(FAEHIGKEITEN.wurzelEl, (kind) =>
        String(kind.className || "").indexOf("erklaerung") !== -1, []);
    if (texte.length !== 0) {
        throw new Error("im Tab stehen noch " + texte.length + " Erklaer-Texte");
    }

    const iKnoepfe = einsammeln(FAEHIGKEITEN.wurzelEl, (kind) =>
        String(kind.className || "").indexOf("info-knopf") !== -1, []);
    if (iKnoepfe.length !== 1) {
        throw new Error("erwartet genau EIN i im Tab, sind " + iKnoepfe.length);
    }

    /* Im Tab ist die Leiste der Weg zurueck — kein eigener Knopf. */
    const zurueck = einsammeln(FAEHIGKEITEN.wurzelEl, (kind) =>
        kind.tagName === "button"
        && String(kind.textContent || "") === "Zurück", []);
    if (zurueck.length !== 0) {
        throw new Error("der Tab traegt einen ueberfluessigen Zurueck-Knopf");
    }
});

pruefe("Das Icon-Raster zeigt jede Faehigkeit mit Stufenrahmen (v0.12.0)", () => {
    const FAEHIGKEITEN = umgebung.FAEHIGKEITEN;
    FAEHIGKEITEN.gezeichnet = false;
    FAEHIGKEITEN.aufbauen(neuesElement("div"));
    FAEHIGKEITEN.beimOeffnen();

    const einsammeln = (element, passt, treffer) => {
        for (const kind of element.kinder || []) {
            if (passt(kind)) {
                treffer.push(kind);
            }
            einsammeln(kind, passt, treffer);
        }
        return treffer;
    };

    const kacheln = einsammeln(FAEHIGKEITEN.wurzelEl, (kind) =>
        String(kind.className || "").indexOf("faehigkeit-kachel") !== -1, []);

    /* Vollstaendig: jede Faehigkeit und jedes Unglueck hat seine Kachel —
       das Raster darf keine Luecke lassen (Entwurf, Abschnitt 4.1). */
    let erwartet = 0;
    for (const stufe of umgebung.SCHACH_VARIANTEN.STUFEN) {
        erwartet += umgebung.SCHACH_VARIANTEN.faehigkeitenDerStufe(stufe.id).length;
        erwartet += umgebung.SCHACH_VARIANTEN.pechDerStufe(stufe.id).length;
    }
    if (kacheln.length !== erwartet) {
        throw new Error("erwartet " + erwartet + " Kacheln, sind " + kacheln.length);
    }

    for (const kachel of kacheln) {
        if (!kachel.style || !kachel.style["--stufe-farbe"]) {
            throw new Error("eine Kachel traegt keine Stufenfarbe");
        }
        if (!kachel.kinder || kachel.kinder.length === 0) {
            throw new Error("eine Kachel hat keinen Lueckenfueller-Buchstaben");
        }
        if (!kachel.hoerer || !kachel.hoerer.click) {
            throw new Error("eine Kachel ist nicht antippbar");
        }
    }
});

/* ------------------------------------------------------------------ *
 * Die Fussleiste sammelt die Runden-Aktionen (v0.26.0)
 * ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ *
 * Die Zeichen der Faehigkeiten (v0.63.0)
 * ------------------------------------------------------------------ */

pruefe("Jede Faehigkeit und jedes Unglueck hat ein Zeichen (v0.63.0)", () => {
    /*
     * Nutzer-Ansage 25.08.2026: „Die Icons kannst du mal selbst anhand
     * dessen, was sie machen / wie sie heissen, erstellen."
     *
     * DIESER TEST IST DER WAECHTER GEGEN DIE HALBE ARBEIT. Der Buchstabe
     * bleibt als Rueckfall im Code stehen (`_iconKachelBauen`), damit eine
     * neue Faehigkeit ohne Zeichen nicht leer aussieht — genau das koennte
     * aber unbemerkt bleiben. Er zieht seine Liste aus der Quelle, die sich
     * ohnehin aendert (`SCHACH_VARIANTEN`), nicht aus einer Liste im Test:
     * Wer eine Faehigkeit ergaenzt, faellt hier auf, ohne den Test
     * anzufassen. (Die Lehre von v0.28.0, `erkenntnisse.md`.)
     */
    const ohneZeichen = [];

    for (const art of Object.keys(SCHACH_VARIANTEN.FAEHIGKEITEN)) {
        if (!FAEHIGKEIT_ZEICHEN.gibtEs(art)) {
            ohneZeichen.push(art);
        }
    }
    for (const art of Object.keys(SCHACH_VARIANTEN.PECH)) {
        if (!FAEHIGKEIT_ZEICHEN.gibtEs(art)) {
            ohneZeichen.push(art + " (Unglueck)");
        }
    }

    if (ohneZeichen.length > 0) {
        throw new Error("ohne Zeichen: " + ohneZeichen.join(", "));
    }

    /* Und nichts Ueberzaehliges: ein Zeichen ohne Faehigkeit waere ein
       Tippfehler im Schluessel, der sonst nie auffiele. */
    const bekannt = Object.keys(SCHACH_VARIANTEN.FAEHIGKEITEN)
        .concat(Object.keys(SCHACH_VARIANTEN.PECH));
    const verwaist = Object.keys(FAEHIGKEIT_ZEICHEN.ZEICHEN)
        .concat(Object.keys(FAEHIGKEIT_ZEICHEN.ZEICHEN_PECH))
        .filter((art) => bekannt.indexOf(art) === -1);

    if (verwaist.length > 0) {
        throw new Error("Zeichen ohne Faehigkeit: " + verwaist.join(", "));
    }
});

pruefe("Ein Zeichen ist ein echtes SVG mit Formen darin (v0.63.0)", () => {
    /*
     * Geprueft an drei Zeichen, die der Nutzer namentlich gewuenscht hat.
     * Ein leeres SVG waere die stille Art zu scheitern: Die Kachel saehe
     * einfach leer aus, und der Rueckfall auf den Buchstaben griffe NICHT
     * (es gibt ja ein Element).
     */
    for (const art of ["nudelholz", "frost", "spiegel", "fessel"]) {
        const bild = FAEHIGKEIT_ZEICHEN.bauen(art);

        if (!bild) {
            throw new Error(art + ": kein Zeichen gebaut");
        }
        if (bild.tagName !== "svg") {
            throw new Error(art + ": ist kein svg, sondern " + bild.tagName);
        }
        if ((bild.kinder || []).length === 0) {
            throw new Error(art + ": das Zeichen ist leer");
        }
        if (String(bild.attribute.viewBox || "") !== "0 0 24 24") {
            throw new Error(art + ": falsches Feld " + bild.attribute.viewBox);
        }
    }

    /* Eine unbekannte Art gibt null — das ist der Rueckfall auf den
       Buchstaben, kein Fehler. */
    if (FAEHIGKEIT_ZEICHEN.bauen("gibtesnicht") !== null) {
        throw new Error("eine unbekannte Art liefert ein Zeichen");
    }
});

pruefe("Die Kachel der Bibliothek traegt das Zeichen statt des Buchstabens (v0.63.0)", () => {
    const stufe = SCHACH_VARIANTEN.stufeVon("frost");
    const kachel = TEAM_SCHACH._iconKachelBauen(
        "frost", SCHACH_VARIANTEN.faehigkeitTitel("frost"), stufe, false);

    const suchen = (element, treffer) => {
        for (const kind of element.kinder || []) {
            treffer.push(kind);
            suchen(kind, treffer);
        }
        return treffer;
    };
    const alle = suchen(kachel, []);

    if (!alle.some((kind) => kind.tagName === "svg")) {
        throw new Error("kein Zeichen in der Kachel");
    }

    /* Der Buchstabe darf nicht zusaetzlich dastehen. */
    const zeichen = alle.find((kind) =>
        String(kind.className || "").indexOf("kachel-zeichen") !== -1);
    if (String(zeichen.textContent || "") !== "") {
        throw new Error("der Lueckenfueller-Buchstabe steht noch da: "
            + zeichen.textContent);
    }

    /* Und der Titel steht weiter fuer Vorleseprogramme dabei. */
    if (String(kachel.attribute["aria-label"] || "").indexOf("Frost") === -1) {
        throw new Error("die Kachel sagt Vorleseprogrammen nicht, was sie ist");
    }
});

pruefe("Die wartende Partie ist der Seitenwahl-Bildschirm (v0.61.0)", () => {
    /*
     * DIE GEMELDETE ANSAGE (25.08.2026): „Wenn ich eine Runde starte, soll
     * erst ein Screen, welcher nur oben links wie ueberall Zurueck hat, die
     * Knoepfe Weiss, Schwarz und Zufall gross stehen — und du hast noch den
     * Einladungs-Code sowie Freunde-einladen-Knopf."
     *
     * Dieser Test loest den alten „Alle Runden-Aktionen stehen in der
     * Fussleiste (v0.26.0)" ab: Die wartende Partie hat gar keine
     * Fussleiste mehr. Geprueft wird deshalb dieselbe Lage mit den neuen
     * Erwartungen — und zwar am GEZEICHNETEN Bildschirm, nicht an einer
     * einzelnen Bau-Funktion:
     *
     *   - kein Brett (das kommt erst mit dem zweiten Start-Bildschirm),
     *   - keine Fussleiste,
     *   - oben links ein „Zurueck",
     *   - kein „Runde verlassen", kein „Umbenennen" (v0.14.0),
     *   - die Beitritts-Knoepfe gross,
     *   - KEIN eigener „Bereit"-Knopf mehr (Punkt 8, 27.08.2026: der Tipp
     *     auf die Seite ist die Zusage),
     *   - der Beitritts-Code — seit Punkt 8 als KNOPF, der das Fenster
     *     „Freunde einladen" oeffnet.
     */
    let partie = SCHACH_TAFEL.partie(TEAM_SCHACH.abgleich.daten,
        kennungen[SCHACH_VARIANTEN.liste[0].id]);
    partie = SCHACH_RUNDE.kopieren(partie);
    partie.laeuft = false;
    partie.ergebnis = null;

    /* Die Bereitschaft muss mit zurueck: Wer schon bereit ist, bekommt seit
       v0.44.0 keine Wahl mehr angeboten — die Partie lief ja, weil beide
       Seiten bereit waren. */
    partie.bereit = { weiss: false, schwarz: false };

    /* Und die Seite wird hier AUSGESUCHT, nicht zugelost (v0.66.0) — sonst
       gaebe es diesen Bildschirm gar nicht. */
    partie.regeln = Object.assign({}, partie.regeln, { seiteZufaellig: false });

    const vorher = TEAM_SCHACH.abgleich.daten;

    try {
        TEAM_SCHACH.abgleich.daten = SCHACH_TAFEL.partieEinsetzen(
            vorher, partie, 9100);
        TEAM_SCHACH.partieOeffnen(partie.id);

        const einsammeln = (element, passt, treffer) => {
            for (const kind of element.kinder || []) {
                if (passt(kind)) {
                    treffer.push(kind);
                }
                einsammeln(kind, passt, treffer);
            }
            return treffer;
        };
        const mitKlasse = (klasse) => einsammeln(TEAM_SCHACH.wurzelEl, (kind) =>
            String(kind.className || "").indexOf(klasse) !== -1, []);

        if (mitKlasse("brett-halter").length > 0) {
            throw new Error("vor dem Anpfiff steht ein Brett da");
        }
        if (mitKlasse("fussleiste").length > 0) {
            throw new Error("die wartende Partie hat noch eine Fussleiste");
        }

        const texte = einsammeln(TEAM_SCHACH.wurzelEl, (kind) =>
            kind.tagName === "button", [])
            .map((knopf) => String(knopf.textContent || ""));

        if (texte.indexOf("Zurück") === -1) {
            throw new Error("kein Zurueck oben links, da ist: " + texte.join(", "));
        }
        if (texte.indexOf("Runde verlassen") !== -1) {
            throw new Error("Runde verlassen steht noch als eigener Knopf da");
        }
        if (texte.indexOf("Umbenennen") !== -1) {
            throw new Error("Umbenennen ist zurueck - Runden haben keinen Namen");
        }

        /* Der Ausgang haengt IM KOPF, nicht irgendwo auf der Seite. */
        const kopf = mitKlasse("partie-kopf")[0];
        if (!kopf) {
            throw new Error("kein Partie-Kopf auf dem Seitenwahl-Bildschirm");
        }
        const imKopf = einsammeln(kopf, (kind) => kind.tagName === "button", [])
            .map((knopf) => String(knopf.textContent || ""));
        if (imKopf.indexOf("Zurück") === -1) {
            throw new Error("das Zurueck steht nicht im Kopf, dort ist: "
                + imKopf.join(", "));
        }

        /* Die Wahl steht gross da — ein eigener „Bereit"-Knopf nicht mehr:
           Seit Punkt 8 (27.08.2026) ist der Tipp auf die Seite die Zusage. */
        if (mitKlasse("beitritt-reihe-gross").length === 0) {
            throw new Error("die Beitritts-Knoepfe stehen nicht gross da");
        }
        if (mitKlasse("seitenwahl-bereit").length > 0) {
            throw new Error("der alte Bereit-Knopf steht noch da");
        }

        /* Und der Code zum Weitergeben — seit Punkt 8 ein KNOPF. */
        const code = mitKlasse("einladung-code")[0];
        if (!code) {
            throw new Error("der Beitritts-Code fehlt");
        }
        if (code.tagName !== "button") {
            throw new Error("der Code ist kein Knopf, sondern " + code.tagName);
        }
        if (String(code.textContent || "")
                !== SCHACH_RUNDE.beitrittsCode(partie.id)) {
            throw new Error("dort steht ein anderer Code: " + code.textContent);
        }
    } finally {
        TEAM_SCHACH.abgleich.daten = vorher;
        TEAM_SCHACH.uebersichtOeffnen();
    }
});

pruefe("Die Aufstellung ist der zweite Start-Bildschirm (v0.62.0)", () => {
    /*
     * Nutzer-Ansage 25.08.2026: „Sobald beide Seiten einen Spieler haben und
     * beide bereit sind, gehts ein Screen weiter, wo das Spielfeld gezeigt
     * wird — wo aber beide noch die Moeglichkeit haben, neu aufzustellen."
     *
     * Geprueft wird am GEZEICHNETEN Bildschirm: Das Brett ist zurueck (der
     * erste Screen hat keins), der Wuerfel steht da (Zufallsarmee an), die
     * zweite Zusage auch — und die Seitenwahl NICHT mehr, die ist getroffen.
     */
    let partie = SCHACH_TAFEL.partie(TEAM_SCHACH.abgleich.daten,
        kennungen[SCHACH_VARIANTEN.liste[0].id]);
    partie = SCHACH_RUNDE.kopieren(partie);
    partie.laeuft = false;
    partie.ergebnis = null;
    partie.bereit = { weiss: true, schwarz: true };
    partie.aufstellungBereit = { weiss: false, schwarz: false };
    partie.regeln = Object.assign({}, partie.regeln, { zufallsArmee: true });

    const vorher = TEAM_SCHACH.abgleich.daten;

    try {
        TEAM_SCHACH.abgleich.daten = SCHACH_TAFEL.partieEinsetzen(
            vorher, partie, 9200);
        TEAM_SCHACH.partieOeffnen(partie.id);

        const einsammeln = (element, passt, treffer) => {
            for (const kind of element.kinder || []) {
                if (passt(kind)) {
                    treffer.push(kind);
                }
                einsammeln(kind, passt, treffer);
            }
            return treffer;
        };
        const mitKlasse = (klasse) => einsammeln(TEAM_SCHACH.wurzelEl, (kind) =>
            String(kind.className || "").indexOf(klasse) !== -1, []);

        if (mitKlasse("brett-halter").length === 0) {
            throw new Error("in der Aufstellung fehlt das Brett");
        }
        if (mitKlasse("wuerfel-knopf").length === 0) {
            throw new Error("der Wuerfel fehlt, obwohl die Armee gewuerfelt wird");
        }
        if (mitKlasse("aufstellung-bereit").length === 0) {
            throw new Error("die zweite Zusage fehlt");
        }

        /* Die Seitenwahl ist vorbei — und eingeladen wird auch nicht mehr. */
        if (mitKlasse("beitritt-reihe").length > 0) {
            throw new Error("die Seitenwahl steht noch da");
        }
        if (mitKlasse("einladung-block").length > 0) {
            throw new Error("der Einladungs-Block steht noch da");
        }

        /* Und oben links das Zurueck, wie ueberall. */
        const kopf = mitKlasse("partie-kopf")[0];
        const imKopf = einsammeln(kopf, (kind) => kind.tagName === "button", [])
            .map((knopf) => String(knopf.textContent || ""));
        if (imKopf.indexOf("Zurück") === -1) {
            throw new Error("kein Zurueck im Kopf, dort ist: " + imKopf.join(", "));
        }
    } finally {
        TEAM_SCHACH.abgleich.daten = vorher;
        TEAM_SCHACH.uebersichtOeffnen();
    }
});

pruefe("Ohne Zufallsarmee gibt es keinen Aufstellungs-Bildschirm (Punkt 8)", () => {
    /*
     * BIS Punkt 8 (27.08.2026) HIESS DIESER TEST „Ohne Zufallsarmee steht
     * in der Aufstellung kein Wuerfel" (v0.62.0). NUTZER-ANSAGE 27.08.2026:
     * „man muss ja das Feld nicht davor sehen, wenn man eh nichts mehr
     * aendern kann" — ohne Zufallsarmee entfaellt der Bildschirm jetzt GANZ
     * (`inAufstellung` sagt nein).
     *
     * DIE NACHGESTELLTE LAGE ist eine ALTE wartende Runde von vor dem
     * Update: beide erste Zusagen liegen, angepfiffen ist noch nicht. Sie
     * zeigt die Seitenwahl als Warte-Bildschirm (ohne Brett, ohne Wuerfel,
     * ohne zweite Zusage); anpfeifen wird sie das Modell beim naechsten
     * Schreiben (`kannAnpfeifen`, eigener Modell-Test).
     */
    let partie = SCHACH_TAFEL.partie(TEAM_SCHACH.abgleich.daten,
        kennungen[SCHACH_VARIANTEN.liste[0].id]);
    partie = SCHACH_RUNDE.kopieren(partie);
    partie.laeuft = false;
    partie.ergebnis = null;
    partie.bereit = { weiss: true, schwarz: true };
    partie.aufstellungBereit = { weiss: false, schwarz: false };
    partie.regeln = Object.assign({}, partie.regeln, { zufallsArmee: false });

    const vorher = TEAM_SCHACH.abgleich.daten;

    try {
        TEAM_SCHACH.abgleich.daten = SCHACH_TAFEL.partieEinsetzen(
            vorher, partie, 9210);
        TEAM_SCHACH.partieOeffnen(partie.id);

        const einsammeln = (element, passt, treffer) => {
            for (const kind of element.kinder || []) {
                if (passt(kind)) {
                    treffer.push(kind);
                }
                einsammeln(kind, passt, treffer);
            }
            return treffer;
        };
        const mitKlasse = (klasse) => einsammeln(TEAM_SCHACH.wurzelEl, (kind) =>
            String(kind.className || "").indexOf(klasse) !== -1, []);

        if (mitKlasse("wuerfel-knopf").length > 0) {
            throw new Error("ohne Zufallsarmee steht ein Wuerfel da");
        }
        if (mitKlasse("aufstellung-bereit").length > 0) {
            throw new Error("die zweite Zusage steht noch da, obwohl es den"
                + " Aufstellungs-Bildschirm ohne Zufallsarmee nicht mehr gibt");
        }
        if (mitKlasse("brett-halter").length > 0) {
            throw new Error("vor dem Anpfiff steht ein Brett da");
        }
        /* Der Warte-Bildschirm traegt weiter Code und Einladen. */
        if (mitKlasse("einladung-block").length === 0) {
            throw new Error("der Einladungs-Block fehlt auf dem Warte-Bildschirm");
        }
    } finally {
        TEAM_SCHACH.abgleich.daten = vorher;
        TEAM_SCHACH.uebersichtOeffnen();
    }
});

pruefe("Das Zurueck fragt nach - der Zuschauer geht ohne Frage (v0.61.0)", () => {
    /*
     * Nutzer-Entscheidung 25.08.2026: Das „Zurueck" oben links tut, was
     * „Runde verlassen" tat — also MIT Rueckfrage, weil es die Runde
     * schliessen kann. Wer gar kein Team hat, verlaesst nichts und geht
     * ohne Frage zur Uebersicht.
     *
     * Geprueft wird beides an derselben Funktion. Die Rueckfrage sagt hier
     * ab (`false`), damit der Test nicht in `teamVerlassen` und dessen
     * Senden laeuft — geprueft ist, DASS gefragt wird.
     */
    const person = umgebung.ICH.person();

    const angelegt = SCHACH_TAFEL.partieAnlegen(
        SCHACH_TAFEL.leereTafel(8900), "standard", "Ausgang", 8910);
    const ohneTeam = angelegt.partie;
    const mitTeam = SCHACH_RUNDE.teamBeitreten(ohneTeam, person.id, "weiss", 8920);

    const echteFrage = umgebung.DIALOG.frage;
    const echteUebersicht = TEAM_SCHACH.uebersichtOeffnen;
    let gefragt = 0;
    let zurUebersicht = 0;

    try {
        umgebung.DIALOG.frage = async () => {
            gefragt++;
            return false;
        };
        TEAM_SCHACH.uebersichtOeffnen = async () => {
            zurUebersicht++;
        };

        TEAM_SCHACH._seitenwahlVerlassen(mitTeam, person);
        if (gefragt !== 1) {
            throw new Error("mit eigenem Team wurde nicht gefragt");
        }
        if (zurUebersicht !== 0) {
            throw new Error("mit eigenem Team ging es an der Frage vorbei");
        }

        TEAM_SCHACH._seitenwahlVerlassen(ohneTeam, person);
        if (zurUebersicht !== 1) {
            throw new Error("der Zuschauer kommt nicht zur Uebersicht");
        }
        if (gefragt !== 1) {
            throw new Error("der Zuschauer wird gefragt, obwohl er nichts verlaesst");
        }
    } finally {
        umgebung.DIALOG.frage = echteFrage;
        TEAM_SCHACH.uebersichtOeffnen = echteUebersicht;
    }
});

pruefe("Einladen gibt es nur mit eigener Seite und nur mit Zielen (v0.61.0)", () => {
    /*
     * F17 („erst befreunden, dann einladen") gilt seit v0.13.0 — neu ist,
     * dass der Knopf ganz WEGBLEIBT, statt eine leere Liste anzubieten: Ein
     * Zeichen-Knopf, der ein leeres Fenster oeffnet, ist schlimmer als kein
     * Knopf.
     */
    const person = umgebung.ICH.person();

    const angelegt = SCHACH_TAFEL.partieAnlegen(
        SCHACH_TAFEL.leereTafel(8950), "standard", "Einladen", 8960);

    /* Ohne eigenes Team: nie. */
    if (TEAM_SCHACH._einladenKnopfBauen(angelegt.partie, person) !== null) {
        throw new Error("ohne eigene Seite steht der Einladen-Knopf da");
    }

    /* Mit Team, aber ohne einen einzigen Freund und ohne Wartende: auch
       nicht — dann haette das Fenster nichts anzubieten. */
    const mitTeam = SCHACH_RUNDE.teamBeitreten(
        angelegt.partie, person.id, "weiss", 8970);
    const echterStand = ANMELDUNG.abgleich.daten;
    try {
        ANMELDUNG.abgleich.daten = SPIELER.leereDaten(8975);
        if (TEAM_SCHACH._einladenKnopfBauen(mitTeam, person) !== null) {
            throw new Error("ohne Freunde und ohne Wartende steht er da");
        }
    } finally {
        ANMELDUNG.abgleich.daten = echterStand;
    }

    /* Mit einem Wartenden steht er da, auch wenn niemand mehr einladbar ist. */
    const mitWartendem = SCHACH_RUNDE.einladen(mitTeam, "id-bert", 8980);
    if (!TEAM_SCHACH._einladenKnopfBauen(mitWartendem, person)) {
        throw new Error("mit einem Eingeladenen fehlt der Knopf");
    }
});

pruefe("In der eigenen laufenden Partie fuehrt nichts an ihr vorbei (F10)", () => {
    /*
     * F10 galt bisher nur fuer den Zurueck-Knopf im Kopf. Seit v0.26.0
     * zieht die Fussleiste mit: Solange die eigene Runde laeuft, gibt es
     * dort kein „Zur Uebersicht" — wer raus will, gibt auf oder verlaesst.
     */
    const partie = SCHACH_TAFEL.partie(TEAM_SCHACH.abgleich.daten,
        kennungen[SCHACH_VARIANTEN.liste[0].id]);
    TEAM_SCHACH.partieOeffnen(partie.id);

    const einsammeln = (element, passt, treffer) => {
        for (const kind of element.kinder || []) {
            if (passt(kind)) {
                treffer.push(kind);
            }
            einsammeln(kind, passt, treffer);
        }
        return treffer;
    };

    /*
     * F10: KEIN AUSGANG, der an der laufenden eigenen Partie vorbeifuehrt —
     * nirgends ein „Zur Uebersicht". Seit v0.59.0 ist die Fussleiste im Match
     * leer, deshalb wird der ganze Bildschirm durchsucht, nicht mehr sie.
     */
    const texte = einsammeln(TEAM_SCHACH.wurzelEl, (kind) =>
        kind.tagName === "button", []).map((knopf) => String(knopf.textContent || ""));

    if (texte.indexOf("Zur Übersicht") !== -1) {
        throw new Error("die laufende eigene Partie bietet einen Ausgang an: "
            + texte.join(", "));
    }

    /*
     * DAS AUFGEBEN STEHT HINTER DEN EINSTELLUNGEN (v0.48.0), die seit
     * v0.80.0 im Menue hinter dem eigenen Namens-Kasten liegen. Geprueft
     * wird der ganze Weg — sonst bliebe der Test gruen, wenn das Aufgeben
     * ganz verschwaende: Kasten antippen, Menue auf, Einstellungen.
     */
    const kasten = einsammeln(TEAM_SCHACH.wurzelEl, (kind) =>
        String(kind.className || "").indexOf("spieler-zeile-tippbar") !== -1
        && String(kind.attribute["role"] || "") === "button", [])[0];
    if (!kasten) {
        throw new Error("kein antippbarer Namens-Kasten in der laufenden Partie");
    }

    kasten.ausloesen("click");
    const einstellungen = einsammeln(TEAM_SCHACH.wurzelEl, (kind) =>
        kind.tagName === "button"
        && String((kind.attribute || {})["aria-label"] || "")
            .indexOf("Einstellungen") !== -1, [])[0];
    if (!einstellungen) {
        throw new Error("hinter dem Namens-Kasten fehlen die Einstellungen");
    }

    einstellungen.ausloesen("click");
    if (!TEAM_SCHACH.spielEinstellungenOffen) {
        throw new Error("der Einstellungen-Knopf im Eck-Menue oeffnet nichts");
    }

    const dahinter = einsammeln(TEAM_SCHACH.wurzelEl, (kind) =>
        kind.tagName === "button", []).map((k) => String(k.textContent || ""));
    if (dahinter.indexOf("Aufgeben") === -1) {
        throw new Error("hinter dem Zahnrad fehlt das Aufgeben: "
            + dahinter.join(", "));
    }

    TEAM_SCHACH.spielEinstellungenSchliessen();
    TEAM_SCHACH.eckMenueOffen = false;
    TEAM_SCHACH.uebersichtOeffnen();
});

pruefe("Der Zwischenbildschirm laesst per Code beitreten (v0.10.0)", () => {
    /*
     * Schritt 5 des Entwurfs: Die Uebersicht ist der Zwischenbildschirm
     * „Runde beitreten / Runde erstellen". Der Code fuehrt zur Partie —
     * gross oder klein getippt, der Knopf wird erst mit voller Laenge frei.
     */

    /* Was fruehere Tests offen liessen, wuerde hier statt der Uebersicht
       gezeichnet — deshalb erst aufraeumen. */
    TEAM_SCHACH.abschluss = null;
    TEAM_SCHACH.auswahlOffen = false;
    TEAM_SCHACH.infoOffen = false;
    TEAM_SCHACH.grundlagenOffen = false;
    for (const partie of SCHACH_TAFEL.liste(TEAM_SCHACH.abgleich.daten)) {
        if (partie.ergebnis) {
            umgebung.ICH.abschlussMerken(partie.id);
        }
    }

    TEAM_SCHACH.uebersichtOeffnen();

    const einsammeln = (element, passt, treffer) => {
        for (const kind of element.kinder || []) {
            if (passt(kind)) {
                treffer.push(kind);
            }
            einsammeln(kind, passt, treffer);
        }
        return treffer;
    };

    const feld = einsammeln(TEAM_SCHACH.wurzelEl, (kind) =>
        String(kind.className || "").indexOf("code-feld") !== -1, [])[0];
    if (!feld) {
        throw new Error("kein Code-Feld auf dem Zwischenbildschirm");
    }

    const knoepfe = einsammeln(TEAM_SCHACH.wurzelEl, (kind) =>
        kind.tagName === "button", []);
    const beitreten = knoepfe.find(
        (knopf) => String(knopf.textContent || "") === "Beitreten");
    if (!beitreten) {
        throw new Error("kein Beitreten-Knopf");
    }
    if (beitreten.disabled !== true) {
        throw new Error("Beitreten ist ohne Code schon frei");
    }

    /* SEIT WUNSCH 1 (24.08.2026) hat der Zwischenbildschirm KEINE Karte
       „Runde erstellen" mehr — erstellt wird auf dem Startbildschirm. */
    if (knoepfe.some(
            (knopf) => String(knopf.textContent || "") === "Runde erstellen")) {
        throw new Error("die Karte Runde erstellen haengt noch hier");
    }

    /* Der echte Code einer laufenden Partie, klein getippt. */
    const partieId = kennungen[SCHACH_VARIANTEN.liste[0].id];
    feld.value = SCHACH_RUNDE.beitrittsCode(partieId).toLowerCase();
    feld.ausloesen("input");

    if (beitreten.disabled !== false) {
        throw new Error("ein vollstaendiger Code gibt Beitreten nicht frei");
    }

    beitreten.ausloesen("click");
    if (TEAM_SCHACH.offeneId !== partieId) {
        throw new Error("der Code fuehrt nicht in die Partie");
    }

    /* Aufraeumen fuer die folgenden Tests. */
    TEAM_SCHACH.uebersichtOeffnen();
});

pruefe("Die Freunde-Seite am Start: suchen, anfragen, entfernen (Wunsch 6)", () => {
    /*
     * DER GEMELDETE WUNSCH: „Freunde-Icon neben dem Zahnrad auf dem Start:
     * dort die Freundesliste sehen, Freunde suchen und anhand des
     * eingegebenen Benutzernamens einladen."
     *
     * Bis v0.18.0 hing dieselbe Karte auf dem Zwischenbildschirm; der Test
     * lief deshalb gegen TEAM_SCHACH. Jetzt gegen START — der Ablauf
     * darunter (Modell, Zusammenfuehrung) ist unveraendert.
     */
    const START = umgebung.START;

    const einsammeln = (element, passt, treffer) => {
        for (const kind of element.kinder || []) {
            if (passt(kind)) {
                treffer.push(kind);
            }
            einsammeln(kind, passt, treffer);
        }
        return treffer;
    };
    const knopfMitText = (text) => einsammeln(START.wurzelEl, (kind) =>
        kind.tagName === "button"
        && String(kind.textContent || "") === text, [])[0] || null;

    const standVorher = ANMELDUNG.abgleich.daten;

    try {
        START.aufbauen(neuesElement("div"));

        /* Das Zeichen steht neben dem Zahnrad und oeffnet die Seite. */
        const zeichen = einsammeln(START.wurzelEl, (kind) =>
            kind.tagName === "button" && kind.attribute
            && kind.attribute["aria-label"] === "Freunde", [])[0];
        if (!zeichen) {
            throw new Error("kein Freunde-Zeichen auf dem Start");
        }

        zeichen.ausloesen("click");
        if (!START.freundeOffen) {
            throw new Error("das Zeichen oeffnet die Freundesliste nicht");
        }

        /* Suchen: Der Filter laeuft ueber die Spielerliste. */
        const feld = einsammeln(START.wurzelEl, (kind) =>
            String(kind.className || "").indexOf("freunde-suche") !== -1, [])[0];
        if (!feld) {
            throw new Error("kein Suchfeld auf der Freunde-Seite");
        }

        feld.value = "ber";
        feld.ausloesen("input");

        const senden = knopfMitText("Anfrage senden");
        if (!senden) {
            throw new Error("die Suche nach ber findet Bert nicht");
        }

        /* Anfragen: schreibt NUR die eigene Sicht. */
        senden.ausloesen("click");
        if (SPIELER.freundschaft(ANMELDUNG.abgleich.daten,
                "id-anna", "id-bert") !== "gesendet") {
            throw new Error("die Anfrage steht nicht im eigenen Eintrag");
        }

        /* Bert nimmt an (Modell-Schritt seines Geraets) — die Seite zeigt
           ihn danach als Freund mit Entfernen-Knopf. */
        ANMELDUNG.abgleich.daten = SPIELER.freundHinzufuegen(
            ANMELDUNG.abgleich.daten, "id-bert", "id-anna", 9000);
        START._zeichnen();

        const entfernen = knopfMitText("Entfernen");
        if (!entfernen) {
            throw new Error("der Freund Bert hat keinen Entfernen-Knopf");
        }

        /* Entfernen (zweiSchritt sagt im Test sofort zu). */
        entfernen.ausloesen("click");
        if (SPIELER.freundschaft(ANMELDUNG.abgleich.daten,
                "id-anna", "id-bert") !== "keine") {
            throw new Error("Entfernen wirkt nicht");
        }

        /* Zurueck fuehrt auf den Start — und der zeigt wieder Spielen. */
        const zurueck = knopfMitText("Zurück");
        if (!zurueck) {
            throw new Error("kein Zurueck-Knopf auf der Freunde-Seite");
        }
        zurueck.ausloesen("click");
        if (START.freundeOffen) {
            throw new Error("Zurueck schliesst die Freundesliste nicht");
        }
        if (!knopfMitText("Spielen")) {
            throw new Error("nach Zurueck steht der Start nicht wieder da");
        }
    } finally {
        ANMELDUNG.abgleich.daten = standVorher;
        umgebung.FREUNDE.suchtext = "";
        START.freundeOffen = false;
        TEAM_SCHACH.uebersichtOeffnen();
    }
});

pruefe("Der Zwischenbildschirm traegt die Freunde-Karte nicht mehr (Wunsch 6)", () => {
    TEAM_SCHACH.uebersichtOeffnen();

    const einsammeln = (element, passt, treffer) => {
        for (const kind of element.kinder || []) {
            if (passt(kind)) {
                treffer.push(kind);
            }
            einsammeln(kind, passt, treffer);
        }
        return treffer;
    };

    const feld = einsammeln(TEAM_SCHACH.wurzelEl, (kind) =>
        String(kind.className || "").indexOf("freunde-suche") !== -1, []);
    if (feld.length !== 0) {
        throw new Error("die Freunde-Karte haengt noch am Zwischenbildschirm");
    }
});

pruefe("Einladen in der Partie und die Einladung beim Eingeladenen (v0.13.0)", () => {
    const einsammeln = (element, passt, treffer) => {
        for (const kind of element.kinder || []) {
            if (passt(kind)) {
                treffer.push(kind);
            }
            einsammeln(kind, passt, treffer);
        }
        return treffer;
    };
    const knopfMitText = (text) => einsammeln(TEAM_SCHACH.wurzelEl, (kind) =>
        kind.tagName === "button"
        && String(kind.textContent || "") === text, [])[0] || null;

    const standVorher = ANMELDUNG.abgleich.daten;
    const tafelVorher = TEAM_SCHACH.abgleich.daten;
    const echtePerson = umgebung.ICH.person;

    try {
        /* Cem ist Annas Freund, spielt aber nirgends mit — also einladbar
           (F16d: wer in einer laufenden Partie steckt, waere es nicht). */
        let spielerNeu = SPIELER.spielerHinzufuegen(standVorher, "Cem", "id-cem", 8000);
        spielerNeu = SPIELER.freundHinzufuegen(spielerNeu, "id-anna", "id-cem", 8000);
        spielerNeu = SPIELER.freundHinzufuegen(spielerNeu, "id-cem", "id-anna", 8000);
        ANMELDUNG.abgleich.daten = spielerNeu;

        const partieId = kennungen[SCHACH_VARIANTEN.liste[0].id];
        TEAM_SCHACH.partieOeffnen(partieId);

        /*
         * SEIT v0.61.0 IST DAS EINLADEN EIN ZEICHEN-KNOPF: Er traegt das
         * Freunde-Zeichen statt des Wortes, und die Namen stehen in seinem
         * Fenster (`DIALOG.liste`). Gesucht wird deshalb nach der Klasse —
         * der Text ist ein SVG-Zeichen geworden.
         */
        const einladen = einsammeln(TEAM_SCHACH.wurzelEl, (kind) =>
            String(kind.className || "").indexOf("einladen-knopf") !== -1, [])[0];
        if (!einladen) {
            throw new Error("kein Einladen-Knopf fuer den freien Freund");
        }

        /* Der Klick bietet genau Cem an — und niemanden sonst. */
        const echteListe = umgebung.DIALOG.liste;
        let angeboten = null;
        try {
            umgebung.DIALOG.liste = async (titel, text, eintraege) => {
                angeboten = eintraege;
                return null;
            };
            einladen.ausloesen("click");
        } finally {
            umgebung.DIALOG.liste = echteListe;
        }

        if (!angeboten || angeboten.length !== 1
                || angeboten[0].wert !== "id-cem") {
            throw new Error("das Fenster bietet nicht genau Cem an: "
                + JSON.stringify(angeboten));
        }

        /* Die Einladung liegt in der PARTIE (kein neuer Pfad) — der
           Eingeladene findet sie auf dem Zwischenbildschirm. */
        let partie = SCHACH_TAFEL.partie(TEAM_SCHACH.abgleich.daten, partieId);
        partie = SCHACH_RUNDE.einladen(partie, "id-cem", 9000);
        TEAM_SCHACH.abgleich.daten = SCHACH_TAFEL.partieEinsetzen(
            TEAM_SCHACH.abgleich.daten, partie, 9000);

        umgebung.ICH.person = () => ({ id: "id-cem", name: "Cem" });
        TEAM_SCHACH.uebersichtOeffnen();

        const ansehen = knopfMitText("Ansehen");
        if (!ansehen) {
            throw new Error("die Einladung erscheint nicht unter Runde beitreten");
        }
        ansehen.ausloesen("click");
        if (TEAM_SCHACH.offeneId !== partieId) {
            throw new Error("Ansehen oeffnet die eingeladene Runde nicht");
        }
    } finally {
        umgebung.ICH.person = echtePerson;
        ANMELDUNG.abgleich.daten = standVorher;
        TEAM_SCHACH.abgleich.daten = tafelVorher;
        TEAM_SCHACH.uebersichtOeffnen();
    }
});

pruefe("Der Code im Match ist ein Knopf und oeffnet das Einladen-Fenster (Punkt 8)", () => {
    /*
     * NUTZER-ANSAGE 27.08.2026: Der Code soll UEBERALL, wo er steht, ein
     * klickbarer Knopf zum Freunde-Einladen sein — auch oben rechts im
     * laufenden Match, OHNE dass der Klick das Match schliesst. Geprueft
     * wird am gezeichneten Match: Der Code in der Standleiste ist ein
     * Knopf, sein Klick oeffnet das Fenster „Freunde einladen" mit dem
     * Code GROSS darin (Zusatz-Element von `DIALOG.liste`), und die
     * offene Partie bleibt offen — es ist ein Dialog, kein
     * Bildschirmwechsel.
     */
    const einsammeln = (element, passt, treffer) => {
        for (const kind of element.kinder || []) {
            if (passt(kind)) {
                treffer.push(kind);
            }
            einsammeln(kind, passt, treffer);
        }
        return treffer;
    };

    const partieId = kennungen[SCHACH_VARIANTEN.liste[0].id];
    TEAM_SCHACH.partieOeffnen(partieId);

    try {
        const code = einsammeln(TEAM_SCHACH.wurzelEl, (kind) =>
            String(kind.className || "").indexOf("partie-code") !== -1, [])[0];
        if (!code) {
            throw new Error("kein Beitritts-Code an der laufenden Partie");
        }
        if (code.tagName !== "button") {
            throw new Error("der Code im Match ist kein Knopf, sondern "
                + code.tagName);
        }
        if (String(code.textContent || "")
                !== SCHACH_RUNDE.beitrittsCode(partieId)) {
            throw new Error("dort steht ein anderer Code: " + code.textContent);
        }

        const echteListe = umgebung.DIALOG.liste;
        let titel = null;
        let zusatz = null;
        try {
            umgebung.DIALOG.liste = async (t, text, eintraege, abbrechen, z) => {
                titel = t;
                zusatz = z;
                return null;
            };
            code.ausloesen("click");
        } finally {
            umgebung.DIALOG.liste = echteListe;
        }

        if (titel !== "Freunde einladen") {
            throw new Error("der Klick oeffnet nicht das Einladen-Fenster: "
                + titel);
        }
        if (!zusatz || String(zusatz.textContent || "")
                !== SCHACH_RUNDE.beitrittsCode(partieId)) {
            throw new Error("im Fenster fehlt der gross angezeigte Code");
        }
        if (TEAM_SCHACH.offeneId !== partieId) {
            throw new Error("der Klick auf den Code hat das Match verlassen");
        }
    } finally {
        TEAM_SCHACH.uebersichtOeffnen();
    }
});

/* ------------------------------------------------------------------ *
 * Das Anmelde-Vollbild (v0.8.0, Buendel A Schritt 3)
 * ------------------------------------------------------------------ */

pruefe("Das Anmelde-Vollbild prueft Name und Passwort live (v0.8.0)", () => {
    /*
     * Auf einem unbekannten Geraet zeigt anmelden() die Weiche; „Neues
     * Konto erstellen" fuehrt auf das Formular mit drei Feldern. Die Regeln
     * (Name vergeben, Passwoerter ungleich) melden sich sofort unter dem
     * Feld, und der Erstellen-Knopf bleibt gesperrt, bis alles gueltig ist.
     */
    const echtePerson = umgebung.ICH.person;
    const echterAbgleich = ANMELDUNG.abgleich;
    umgebung.ICH.person = () => null;
    ANMELDUNG.abgleich = { daten: spielerDaten, eigeneIdSetzen() { } };

    const inhalte = (wurzel, tagName) => {
        const treffer = [];
        const sammeln = (element) => {
            for (const kind of element.kinder || []) {
                if (kind.tagName === tagName) {
                    treffer.push(kind);
                }
                sammeln(kind);
            }
        };
        sammeln(wurzel);
        return treffer;
    };
    const knopfMitText = (text) => inhalte(ANMELDUNG.wurzelEl, "button")
        .find((knopf) => String(knopf.textContent || "") === text) || null;

    try {
        ANMELDUNG.aufbauen(neuesElement("div"));
        ANMELDUNG.anmelden();

        if (ANMELDUNG.wurzelEl.hidden !== false) {
            throw new Error("das Vollbild ist nicht sichtbar");
        }
        if (!knopfMitText("Vorhandenes Konto")) {
            throw new Error("die Weiche hat keinen Knopf fuer das vorhandene Konto");
        }
        const neu = knopfMitText("Neues Konto erstellen");
        if (!neu) {
            throw new Error("die Weiche hat keinen Knopf fuer das neue Konto");
        }

        neu.ausloesen("click");

        const felder = inhalte(ANMELDUNG.wurzelEl, "input");
        if (felder.length !== 3) {
            throw new Error("erwartet drei Felder, sind " + felder.length);
        }
        const fehlerzeilen = inhalte(ANMELDUNG.wurzelEl, "p").filter(
            (element) => String(element.className).indexOf("anmeldung-fehler") !== -1);
        if (fehlerzeilen.length !== 3) {
            throw new Error("erwartet drei Fehlerzeilen, sind " + fehlerzeilen.length);
        }

        const weiter = knopfMitText("Konto erstellen");
        if (!weiter) {
            throw new Error("kein Erstellen-Knopf");
        }
        if (weiter.disabled !== true) {
            throw new Error("Erstellen ist ohne Eingaben schon frei");
        }

        /* Vergebener Name — ohne Ruecksicht auf Gross-/Kleinschreibung. */
        felder[0].value = "anna";
        felder[0].ausloesen("input");
        if (String(fehlerzeilen[0].textContent).indexOf("vergeben") === -1) {
            throw new Error("der vergebene Name anna wird nicht gemeldet");
        }

        felder[0].value = "Dora";
        felder[0].ausloesen("input");
        if (String(fehlerzeilen[0].textContent) !== "") {
            throw new Error("ein freier Name wird faelschlich gemeldet");
        }

        /* Ungleiche Passwoerter sperren und melden sich sofort. */
        felder[1].value = "abcd";
        felder[1].ausloesen("input");
        felder[2].value = "abce";
        felder[2].ausloesen("input");
        if (weiter.disabled !== true) {
            throw new Error("ungleiche Passwoerter lassen Erstellen frei");
        }
        if (String(fehlerzeilen[2].textContent).indexOf("stimmen nicht") === -1) {
            throw new Error("die ungleiche Wiederholung wird nicht gemeldet");
        }

        felder[2].value = "abcd";
        felder[2].ausloesen("input");
        if (weiter.disabled !== false) {
            throw new Error("gueltige Eingaben geben Erstellen nicht frei");
        }

        /* Zurueck fuehrt auf die Weiche. */
        knopfMitText("Zurück").ausloesen("click");
        if (!knopfMitText("Vorhandenes Konto")) {
            throw new Error("Zurueck fuehrt nicht auf die Weiche");
        }
    } finally {
        umgebung.ICH.person = echtePerson;
        ANMELDUNG.abgleich = echterAbgleich;
        ANMELDUNG.anmeldenLaeuft = false;
        ANMELDUNG.wurzelEl = null;
    }
});

/*
 * DAS KONTO KOMMT ZURUECK, WENN DER STAND NACHKOMMT (v0.89.0).
 *
 * DRINGENDE NUTZER-MELDUNG 27.08.2026: „Jemand hat sich angemeldet, das
 * Spiel geschlossen — und ist in seinen Account nicht wieder reingekommen."
 *
 * Nachgemessen war die Kette: Ein fehlgeschlagenes erstes Laden liess
 * `anmelden()` mit dem LEEREN Anfangsstand laufen, das Vollbild erschien,
 * und es verschwand auch dann nicht wieder, wenn die naechste Abfrage den
 * echten Stand brachte — `datenAktualisiert` stieg aus, solange `ichId`
 * null war. Wer dann ein neues Konto anlegte, hatte zwei.
 */
pruefe("Ein nachgereichter Stand meldet das Geraet selbst an (v0.89.0)", () => {
    const echtePerson = umgebung.ICH.person;
    const echterAbgleich = ANMELDUNG.abgleich;
    const echteId = ANMELDUNG.ichId;
    const echtesWurzelEl = ANMELDUNG.wurzelEl;
    const echtesLaeuft = ANMELDUNG.anmeldenLaeuft;

    try {
        /* Der Startfall: Geraet kennt seine Person, der Stand ist LEER. */
        umgebung.ICH.person = () => ({ id: "id-anna", name: "Anna" });
        ANMELDUNG.wurzelEl = neuesElement("div");
        ANMELDUNG.abgleich = { daten: { spieler: [] }, eigeneIdSetzen() { } };
        ANMELDUNG.ichId = null;
        ANMELDUNG.anmeldenLaeuft = false;

        ANMELDUNG.anmelden();

        if (!ANMELDUNG.anmeldenLaeuft) {
            throw new Error("ohne Stand muesste das Vollbild erscheinen");
        }
        if (ANMELDUNG.ichId !== null) {
            throw new Error("angemeldet, obwohl die Person nicht im Stand steht");
        }

        /* Jetzt kommt der echte Stand nach — das Geraet muss sich selbst
           anmelden und das Vollbild wegraeumen. */
        ANMELDUNG.datenAktualisiert(spielerDaten);

        if (ANMELDUNG.ichId !== "id-anna") {
            throw new Error("der nachgereichte Stand meldet nicht an, ichId ist "
                + ANMELDUNG.ichId);
        }
        if (ANMELDUNG.anmeldenLaeuft) {
            throw new Error("das Vollbild bleibt stehen, obwohl das Konto da ist");
        }
    } finally {
        umgebung.ICH.person = echtePerson;
        ANMELDUNG.abgleich = echterAbgleich;
        ANMELDUNG.ichId = echteId;
        ANMELDUNG.wurzelEl = echtesWurzelEl;
        ANMELDUNG.anmeldenLaeuft = echtesLaeuft;
    }
});

pruefe("Ohne gemerkte Person fragt der nachgereichte Stand nach (v0.89.0)", () => {
    /*
     * Die Gegenrichtung: Wer noch NIE angemeldet war, darf nach einem
     * Fehlstart nicht ohne Anmeldung sitzen bleiben — `app.js` fragt seit
     * v0.89.0 nicht mehr, wenn das erste Laden fehlschlug.
     */
    const echtePerson = umgebung.ICH.person;
    const echterAbgleich = ANMELDUNG.abgleich;
    const echteId = ANMELDUNG.ichId;
    const echtesWurzelEl = ANMELDUNG.wurzelEl;
    const echtesLaeuft = ANMELDUNG.anmeldenLaeuft;

    try {
        umgebung.ICH.person = () => null;
        ANMELDUNG.wurzelEl = neuesElement("div");
        ANMELDUNG.abgleich = { daten: spielerDaten, eigeneIdSetzen() { } };
        ANMELDUNG.ichId = null;
        ANMELDUNG.anmeldenLaeuft = false;

        ANMELDUNG.datenAktualisiert(spielerDaten);

        if (!ANMELDUNG.anmeldenLaeuft) {
            throw new Error("ohne gemerktes Konto muesste jetzt gefragt werden");
        }
    } finally {
        umgebung.ICH.person = echtePerson;
        ANMELDUNG.abgleich = echterAbgleich;
        ANMELDUNG.ichId = echteId;
        ANMELDUNG.wurzelEl = echtesWurzelEl;
        ANMELDUNG.anmeldenLaeuft = echtesLaeuft;
    }
});

/*
 * DER NUDELHOLZ-KNOPF UND DIE GEDREHTE ANSICHT (v0.73.0).
 *
 * Nutzer-Meldung 26.08.2026: „Nudelholz geht nicht … hat evtl was mit dem
 * drehen zu tun." Nachgemessen: Die Fähigkeit selbst war in Ordnung, aber der
 * Knopf nannte die Kante in BRETT-Koordinaten. Wer nicht von unten spielt,
 * bekam bei jeder der vier Richtungen die falsche Auskunft — als Schwarz
 * wählte man „von unten" und die Figuren rollten auf einen ZU.
 *
 * Geprüft werden beide Seiten: Für Weiss (Drehung 0) darf sich nichts ändern,
 * für Schwarz (Drehung 2) muss sich JEDE der vier Richtungen umkehren.
 */
pruefe("Der Nudelholz-Knopf nennt den Rand aus Sicht des Spielers (v0.73.0)", () => {
    const partie = SCHACH_TAFEL.partie(TEAM_SCHACH.abgleich.daten, kennungen.standard);
    const echtePerson = umgebung.ICH.person;

    try {
        /* Weiss spielt von unten — Brett und Schirm meinen dasselbe. */
        umgebung.ICH.person = () => ({ id: "id-anna", name: "Anna" });
        for (const kante of ["unten", "oben", "links", "rechts"]) {
            const text = TEAM_SCHACH.nudelholzKanteText(partie, kante);
            if (text !== "von " + kante) {
                throw new Error("fuer Weiss sagt '" + kante + "' faelschlich: " + text);
            }
        }

        /* Schwarz sieht das Brett um 180 Grad gedreht. */
        umgebung.ICH.person = () => ({ id: "id-bert", name: "Bert" });
        const erwartet = {
            unten: "von oben",
            oben: "von unten",
            links: "von rechts",
            rechts: "von links"
        };
        for (const kante of Object.keys(erwartet)) {
            const text = TEAM_SCHACH.nudelholzKanteText(partie, kante);
            if (text !== erwartet[kante]) {
                throw new Error("fuer Schwarz sagt '" + kante + "' faelschlich "
                    + text + " statt " + erwartet[kante]);
            }
        }
    } finally {
        umgebung.ICH.person = echtePerson;
    }
});

/* ------------------------------------------------------------------ *
 * DIE PILLE DER TAB-LEISTE BEIM DREHEN (v0.74.0)
 *
 * Nutzer-Meldung 26.08.2026: „Wenn man den Bildschirm dreht, schiebt sich die
 * blaue Pille aus dem Hauptmenü hin und her."
 *
 * Geprüft wird das ECHTE `js\tabs.js` in einem eigenen Kontext — im
 * Haupt-Kontext ist TABS durch einen Stellvertreter ersetzt.
 *
 * Der Kern: Gemessen werden darf ERST, wenn der Browser das neue Layout
 * gerechnet hat. Der Test hält deshalb fest, dass beim Ereignis noch NICHTS
 * gemessen wird und die Messung im angemeldeten Bild nachkommt — und dass
 * mehrere Ereignisse nur EIN Bild anmelden.
 * ------------------------------------------------------------------ */

pruefe("Die Tab-Pille misst erst im naechsten Bild und nur einmal (v0.74.0)", () => {
    const bilder = [];
    const tabUmgebung = {
        console: console,
        requestAnimationFrame(funktion) {
            bilder.push(funktion);
            return bilder.length;
        },
        document: {
            createElement: neuesElement,
            body: neuesElement("body")
        },
        window: { addEventListener() { /* im Test nicht gebraucht */ } }
    };
    tabUmgebung.globalThis = tabUmgebung;
    vm.createContext(tabUmgebung);
    vm.runInContext(
        dateisystem.readFileSync(pfad.join(jsOrdner, "tabs.js"), "utf8")
            + "\nglobalThis.TABS = TABS;",
        tabUmgebung,
        { filename: "tabs.js" }
    );

    const TABS_ECHT = tabUmgebung.TABS;

    /* Eine Leiste mit einem aktiven Knopf, dessen Masse sich „beim Drehen"
       aendern — mehr braucht `_markerSetzen` nicht. */
    const knopf = neuesElement("button");
    knopf.className = "tab-knopf tab-knopf-aktiv";
    knopf.offsetLeft = 10;
    knopf.offsetTop = 0;
    knopf.offsetWidth = 100;
    knopf.offsetHeight = 40;

    const leiste = neuesElement("nav");
    leiste.querySelector = (wahl) =>
        (wahl === ".tab-knopf-aktiv" ? knopf : null);

    TABS_ECHT.leisteEl = leiste;
    TABS_ECHT.markerEl = neuesElement("span");
    TABS_ECHT._markerFrame = 0;

    /* Drei Ereignisse kurz hintereinander — wie beim Drehen. */
    TABS_ECHT._markerNachmessen();
    TABS_ECHT._markerNachmessen();
    TABS_ECHT._markerNachmessen();

    if (bilder.length !== 1) {
        throw new Error("drei Ereignisse melden " + bilder.length
            + " Bilder an statt genau eines");
    }
    if (TABS_ECHT.markerEl.style.left !== undefined
            && TABS_ECHT.markerEl.style.left !== "") {
        throw new Error("die Pille wurde schon beim Ereignis gesetzt statt "
            + "erst im Bild — genau das misst die alte Lage");
    }

    /* Jetzt rechnet der Browser: neue Masse, dann das Bild. */
    knopf.offsetLeft = 250;
    knopf.offsetWidth = 60;
    bilder[0]();

    if (TABS_ECHT.markerEl.style.left !== "250px"
            || TABS_ECHT.markerEl.style.width !== "60px") {
        throw new Error("die Pille uebernimmt die neuen Masse nicht: left="
            + TABS_ECHT.markerEl.style.left + " width="
            + TABS_ECHT.markerEl.style.width);
    }

    /* Ohne Gleiten — sonst wandert sie beim Drehen sichtbar hinterher. */
    if (String(TABS_ECHT.markerEl.className || "").indexOf("tab-marker-weich") !== -1) {
        throw new Error("die Pille gleitet beim Drehen, statt zu springen");
    }

    /* Nach dem Bild ist wieder eines anmeldbar. */
    TABS_ECHT._markerNachmessen();
    if (bilder.length !== 2) {
        throw new Error("nach dem Bild laesst sich kein neues anmelden");
    }
});

/*
 * DER WUNSCH-KNOPF IN DEN MATCH-EINSTELLUNGEN (v0.78.0)
 *
 * Nutzer-Ansage 26.08.2026: „Wunsch-Knopf soll mit in die
 * Match-Einstellungen … man soll nicht das Match verlassen."
 *
 * Der Knopf hing bis dahin nur in den GERAETE-Einstellungen, und die sind ein
 * eigener Tab — wer mitten im Spiel etwas melden wollte, musste die Partie
 * verlassen. Geprueft wird, dass er jetzt auch im Einstellungs-Fenster der
 * laufenden Partie steht.
 */
pruefe("Die Match-Einstellungen tragen den Wunsch-Knopf (v0.78.0)", () => {
    const partie = SCHACH_TAFEL.partie(TEAM_SCHACH.abgleich.daten, kennungen.standard);
    const person = umgebung.ICH.person();

    const wurzel = neuesElement("div");
    TEAM_SCHACH._spielEinstellungenZeichnen(wurzel, partie, person);

    const suchen = (el) => {
        for (const kind of el.kinder || []) {
            if (String(kind.textContent || "") === "Wunsch") {
                return kind;
            }
            const t = suchen(kind);
            if (t) { return t; }
        }
        return null;
    };

    if (!suchen(wurzel)) {
        throw new Error("in den Match-Einstellungen steht kein Wunsch-Knopf");
    }
});

zeitlimitPruefen();
