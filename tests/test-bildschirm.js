/*
 * test-bildschirm.js — lässt den Bildschirm-Code gegen ein NACHGEBAUTES DOM laufen.
 *
 * Warum es diese Datei gibt: Die übrigen Tests prüfen Regeln und Daten. Fehler
 * im Bildschirm-Code (ein falsch geschriebener Aufruf, ein Feld, das es nicht
 * mehr gibt) fallen dort nicht auf — sie fliegen erst im Browser auseinander,
 * beim Klick. Genau so blieb in v1.2 ein ganzer Tab leer.
 *
 * Hier wird deshalb ein winziges DOM nachgebaut (nur so viel, wie der Code
 * anfasst) und jeder Bildschirm einmal gezeichnet: die Übersicht, jede
 * Spielart, eine beendete Partie, die Rangliste.
 *
 * WAS DIESER TEST NICHT KANN
 * Er sagt nichts über das Aussehen: keine Stildatei, keine echten Größen, keine
 * Farben. Er beantwortet nur die Frage „läuft der Code durch, ohne zu stolpern".
 * Die Prüfliste in docs\DEPLOYMENT.md ersetzt er nicht.
 *
 * Aufruf: siehe tests\README.md
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

/*
 * Sucht das Brett im gerade gezeichneten Bereich.
 *
 * Nach Klasse statt nach Stelle: Über und um das Brett sind schon mehrfach
 * Sachen dazugekommen (Randbeschriftung, Rahmen), und jedes Mal brachen sonst
 * alle Tests auf einmal.
 */
function brettSuchen() {
    const suchen = (element) => {
        for (const kind of element.kinder || []) {
            if (kind.className === "brett" || kind.className === "brett brett-gedreht") {
                return kind;
            }
            const gefunden = suchen(kind);
            if (gefunden) {
                return gefunden;
            }
        }
        return null;
    };

    const brett = suchen(TEAM_SCHACH.wurzelEl);
    if (!brett) {
        throw new Error("kein Brett gezeichnet");
    }
    return brett;
}

/*
 * Die Zeilen der Fähigkeiten-Karte (eine je Farbe). Gesucht wird die Klasse,
 * nicht die Überschrift: Der sichtbare Text darf sich ändern, die Klasse trägt
 * die Bedeutung.
 */
function faehigkeitenZeilen() {
    const gefunden = [];
    const suchen = (element) => {
        for (const kind of element.kinder || []) {
            if (String(kind.className || "").indexOf("faehigkeit-zeile") !== -1) {
                gefunden.push(kind);
            }
            suchen(kind);
        }
    };

    suchen(TEAM_SCHACH.wurzelEl);
    return gefunden;
}

/* ------------------------------------------------------------------ *
 * Das nachgebaute DOM
 *
 * Nur die Mitglieder, die der Bildschirm-Code wirklich benutzt. Wer dort
 * etwas Neues verwendet, muss es hier ergänzen — das ist Absicht: So bleibt
 * sichtbar, wie viel Browser die App überhaupt braucht.
 * ------------------------------------------------------------------ */

function neuesElement(tag) {
    const element = {
        tagName: tag,
        kinder: [],
        className: "",
        dataset: {},
        attribute: {},
        style: {
            setProperty(name, wert) { this[name] = wert; }
        },

        /* Eine Feldbreite ungleich null, damit die Zugbewegung wirklich läuft. */
        offsetWidth: 40,

        appendChild(kind) {
            this.kinder.push(kind);
            return kind;
        },

        /* Beide seit v0.44: Die Bildanleitung tauscht ihr Brett beim Weiter-
           schalten aus, und ein zugeklappter Bibliothekseintrag raeumt seinen
           Inhalt weg (damit sein Takt aufhoert). */
        removeChild(kind) {
            this.kinder = this.kinder.filter((eintrag) => eintrag !== kind);
            return kind;
        },

        replaceChild(neu, alt) {
            this.kinder = this.kinder.map((eintrag) => (eintrag === alt) ? neu : eintrag);
            return alt;
        },

        classList: {
            liste: [],
            add(...namen) { this.liste.push(...namen); },
            remove(name) { this.liste = this.liste.filter((eintrag) => eintrag !== name); },
            toggle(name, an) { if (an) { this.add(name); } else { this.remove(name); } },

            /*
             * Prüft AUCH die Klassen aus `className`. Im Browser sind beide
             * dasselbe; hier waren sie es lange nicht, und ein Test hat
             * deshalb eine Klasse nicht gefunden, die sichtbar da war.
             */
            contains(name) {
                if (this.liste.indexOf(name) !== -1) {
                    return true;
                }
                const fest = this.besitzer ? String(this.besitzer.className || "") : "";
                return fest.split(" ").indexOf(name) !== -1;
            }
        },

        addEventListener(art, behandler) {
            this.hoerer = this.hoerer || {};
            this.hoerer[art] = behandler;
        },

        /* Das Anmelde-Vollbild (v0.8.0) setzt den Fokus auf sein erstes
           Feld — hier reicht es, dass der Aufruf nicht scheitert. */
        focus() { },

        /*
         * Löst ein gemerktes Ereignis aus — damit ein Test einen Fingertipp
         * nachstellen kann, statt die Behandlungsfunktion direkt aufzurufen.
         * Der Unterschied ist wichtig: So wird auch geprüft, dass der Knopf
         * überhaupt verdrahtet wurde.
         */
        ausloesen(art) {
            if (!this.hoerer || !this.hoerer[art]) {
                throw new Error("kein Behandler fuer " + art + " an diesem Element");
            }
            this.hoerer[art]({ preventDefault() { }, stopPropagation() { } });
        },

        setAttribute(name, wert) { this.attribute[name] = wert; },

        /* Seit v0.23.0: Die Lootbox setzt ihr Bild zusaetzlich ueber die alte
           xlink-Schreibweise. Der Namensraum spielt hier keine Rolle —
           gemerkt wird unter demselben Namen wie bei setAttribute. */
        setAttributeNS(namensraum, name, wert) { this.attribute[name] = wert; },

        /* Versteht genau zwei Sucharten: nach data-feld und nach einer Klasse. */
        querySelector(wahl) {
            const feld = wahl.match(/data-feld="(\d+)"/);
            const klasse = wahl.match(/^\.([a-z-]+)$/);

            const passt = (element) => {
                if (feld) {
                    return element.dataset && element.dataset.feld === feld[1];
                }
                if (klasse) {
                    return typeof element.className === "string"
                        && element.className.split(" ").indexOf(klasse[1]) !== -1;
                }
                return false;
            };

            const suchen = (element) => {
                for (const kind of element.kinder || []) {
                    if (passt(kind)) {
                        return kind;
                    }
                    const gefunden = suchen(kind);
                    if (gefunden) {
                        return gefunden;
                    }
                }
                return null;
            };

            return suchen(this);
        },

        querySelectorAll() { return []; },

        set innerHTML(wert) { this.kinder = []; },
        get innerHTML() { return ""; }
    };

    /* Eigene Liste je Element — sonst teilen sich alle dieselbe. Der
       Rückbezug lässt `contains` auch die Klassen aus `className` sehen. */
    element.classList = Object.assign({}, element.classList,
        { liste: [], besitzer: element });
    return element;
}

/*
 * Ein `fetch`, das sich steuern laesst — fuer die Pruefung des Zeitlimits.
 * `haengt = true` heisst: Der Aufruf antwortet nie, wie im Funkloch.
 */
const netz = { haengt: false, abgebrochen: false, sofort: false };

async function fetchNachbau(adresse, einstellungen) {
    if (!netz.haengt) {
        return { ok: true, async json() { return {}; } };
    }

    const signal = einstellungen && einstellungen.signal;

    const abbruchFehler = () => {
        netz.abgebrochen = true;
        const fehler = new Error("abgebrochen");
        fehler.name = "AbortError";
        return fehler;
    };

    /*
     * WICHTIG: Das Signal kann SCHON abgebrochen sein, bevor fetch ueberhaupt
     * gerufen wird — im Test feuert der Zeitgeber sofort. Echtes fetch lehnt
     * dann unmittelbar ab; ohne diese Zeile wartete der Nachbau auf ein
     * Ereignis, das nie mehr kommt, und der ganze Testlauf endete still.
     */
    if (signal && signal.aborted) {
        throw abbruchFehler();
    }

    return new Promise((_, ablehnen) => {
        if (!signal) {
            return;
        }
        signal.addEventListener("abort", () => ablehnen(abbruchFehler()));
    });
}

const umgebung = {
    console: console,
    fetch: fetchNachbau,
    AbortController: AbortController,
    document: {
        createElement: neuesElement,
        /* Für den Pfeil des letzten Zuges (SVG). Der Namensraum spielt hier
           keine Rolle — geprüft wird, dass der Code durchläuft. */
        createElementNS(namensraum, tag) { return neuesElement(tag); },
        addEventListener() { /* wird beim Zeichnen nicht gebraucht */ },

        /* Seit Wunsch 4 (v0.17.0) setzt EINSTELLUNGEN.laden die Klasse
           `design-3d` fest an den body — dafuer muss es einen geben. */
        body: neuesElement("body"),
        hidden: false
    },
    window: {
        requestAnimationFrame(funktion) { funktion(); },
        /*
         * Zeitgeber laufen normalerweise NIE ab — sonst ruft sich die Uhr des
         * Imposter-Raums endlos selbst auf. Nur wo ein Test es ausdruecklich
         * verlangt (`netz.sofort`), feuert der Zeitgeber sofort: So muss die
         * Pruefung des Zeitlimits nicht acht Sekunden warten und loest den
         * Abbruch trotzdem echt aus.
         */
        setTimeout(funktion) {
            if (netz.sofort && typeof funktion === "function") { funktion(); }
            return 0;
        },
        clearTimeout() { /* nichts zu tun */ },

        /*
         * Der Takt der Bildanleitung (seit v0.41). Er feuert hier NIE: Geprüft
         * wird, dass die Anleitung entsteht und der Takt sauber angemeldet und
         * wieder beendet wird — nicht, wie sie aussieht, wenn sie läuft.
         */
        setInterval() { return 0; },
        clearInterval() { /* nichts zu tun */ },

        /* Ohne Angabe gilt: normale Bewegung erlaubt. */
        matchMedia() { return { matches: false }; },
        /*
         * EIN ECHTER KLEINER GERAETESPEICHER (seit Wunsch 1, 24.08.2026).
         * Vorher gab `getItem` immer null zurueck; das reichte, solange nur
         * die Vorschau-Spielart darin lag. Seit „Spielen" die Runde mit den
         * GEMERKTEN Reglern anlegt, muss ein Test schreiben und wieder
         * lesen koennen — sonst prueft er die halbe Kette.
         */
        localStorage: (() => {
            const inhalt = {};
            return {
                getItem(schluessel) {
                    return Object.prototype.hasOwnProperty.call(inhalt, schluessel)
                        ? inhalt[schluessel]
                        : null;
                },
                setItem(schluessel, wert) { inhalt[schluessel] = String(wert); },
                removeItem(schluessel) { delete inhalt[schluessel]; }
            };
        })()
    }
};
umgebung.globalThis = umgebung;
vm.createContext(umgebung);

/* Stellvertreter für die Teile, die hier nicht mitspielen. */
umgebung.ICH = {
    person: () => ({ id: "id-anna", name: "Anna" }),

    /* Der Gerätespeicher, so weit der Bildschirm ihn braucht. */
    _gesehen: {},
    abschlussGesehen(id) { return umgebung.ICH._gesehen[id] === true; },
    abschlussMerken(id) { umgebung.ICH._gesehen[id] = true; },

    /* Verwaltungs-Zugang: Seit v3.7 haengt der Bibliotheks-Knopf im Imposter
       daran. Standardmaessig aus — ein Test schaltet ihn gezielt ein. */
    _verwaltung: false,
    verwaltungAktiv() { return umgebung.ICH._verwaltung === true; },
    verwaltungSetzen(an) { umgebung.ICH._verwaltung = (an === true); }
};
/*
 * Die Dialoge sagen immer ab: `eingabe` und `liste` liefern null. So laufen
 * Abläufe, die etwas erfragen, sauber in ihren Abbruch-Zweig — geprüft wird
 * hier, dass der Bildschirm-Code durchläuft, nicht der Dialog selbst.
 */
umgebung.DIALOG = {
    hinweis: async () => true,
    frage: async () => true,
    eingabe: async () => null,
    liste: async () => null,

    /* Die Passwort-Eingabe (v0.7.0) sagt wie die anderen Eingaben ab. */
    passwort: async () => null,

    /* Die Kurzmeldung (v0.114) ist reine Anzeige — im Test ein Nichtstuer. */
    kurzmeldung() { },

    /* Wie `frage: () => true`: Die Zwei-Schritt-Bestätigung (v0.112) sagt im
       Test sofort zu — ein Klick führt aus. Die echte Mechanik (erster Druck
       fragt, zweiter führt aus) prüft ein eigener Test weiter unten gegen
       das ECHTE dialog.js. */
    zweiSchritt(knopf, aktion) {
        knopf.addEventListener("click", aktion);
        return knopf;
    }
};

/*
 * Die Tab-Leiste als Stellvertreter: `rundeSetzen` (v0.113) merkt sich nur
 * die letzte Meldung — ein Test unten prüft, dass die offene Partie sich
 * als Fenster meldet und die Übersicht sich zurückmeldet.
 */
umgebung.TABS = {
    aktiveId: "",
    zuletzt: null,
    rundeSetzen(tabId, offen) {
        umgebung.TABS.zuletzt = { tabId: tabId, offen: offen === true };
    },

    /* Seit v0.9.0 wechseln Startbildschirm und Einstellungen die Tabs
       selbst — hier reicht es, sich das Ziel zu merken. */
    gewechseltZu: "",
    wechseln(id) {
        umgebung.TABS.gewechseltZu = id;
    }
};

/*
 * Alle Dateien in EINEM Lauf übersetzen: Ein `const` auf oberster Ebene gehört
 * zum Bereich des jeweiligen Skripts, nicht zum globalen Objekt. Getrennte
 * Läufe sähen sich also gegenseitig nicht — mehrere script-Blöcke im Browser
 * sehr wohl. Am Ende werden die Bausteine global bereitgestellt, damit dieser
 * Test sie greifen kann.
 */
const bausteinNamen = ["KONFIG", "SPIELER", "ANMELDUNG", "SCHACH_VARIANTEN", "SCHACH", "SCHACH_RUNDE",
    "SCHACH_TAFEL", "SCHACH_VORSCHAU", "SCHACH_GRUNDLAGEN", "TEAM_SCHACH",
    "RANGLISTE", "START", "FAEHIGKEITEN", "FREUNDE", "EINSTELLUNGEN",
    "SpeicherGemeinsam",
    /* Seit v0.76 auch der Abgleich: Sein Rennen mit der regelmaessigen Abfrage
       war der „Doppelzug-Fehler", und ohne Test kaeme es unbemerkt zurueck. */
    "Abgleich"];

/* Die Reihenfolge ist dieselbe wie in index.html — die drei team-schach-Teile
   ergänzen das Objekt und müssen nach ihm kommen. */
const dateien = ["konfig.js", "spieler.js", "speicher.js", "abgleich.js",
    "anmeldung.js",
    "schach-varianten.js",
    "schach.js", "schach-runde.js", "schach-tafel.js", "schach-vorschau.js",
    "schach-grundlagen.js",
    "team-schach.js",
    "team-schach-uebersicht.js", "team-schach-brett.js", "team-schach-auswertung.js",
    "team-schach-grundlagen.js",
    "rangliste.js", "start.js", "faehigkeiten.js", "freunde.js",
    "einstellungen.js"];

const quelltext = dateien
    .map((name) => dateisystem.readFileSync(pfad.join(jsOrdner, name), "utf8"))
    .join("\n;\n")
    + "\n" + bausteinNamen.map((name) => "globalThis." + name + " = " + name + ";").join("\n");

vm.runInContext(quelltext, umgebung, { filename: "alle.js" });

const SPIELER = umgebung.SPIELER;
const ANMELDUNG = umgebung.ANMELDUNG;
const SCHACH = umgebung.SCHACH;
const SCHACH_VARIANTEN = umgebung.SCHACH_VARIANTEN;
const SCHACH_RUNDE = umgebung.SCHACH_RUNDE;
const SCHACH_TAFEL = umgebung.SCHACH_TAFEL;
const SCHACH_GRUNDLAGEN = umgebung.SCHACH_GRUNDLAGEN;
const TEAM_SCHACH = umgebung.TEAM_SCHACH;
const RANGLISTE = umgebung.RANGLISTE;
const SpeicherGemeinsam = umgebung.SpeicherGemeinsam;
const Abgleich = umgebung.Abgleich;

/* ------------------------------------------------------------------ *
 * Ausgangslage: zwei Mitspieler, je eine laufende Partie pro Spielart
 * ------------------------------------------------------------------ */

let spielerDaten = SPIELER.leereDaten(1000);
spielerDaten = SPIELER.spielerHinzufuegen(spielerDaten, "Anna", "id-anna", 1000);
spielerDaten = SPIELER.spielerHinzufuegen(spielerDaten, "Bert", "id-bert", 1000);
ANMELDUNG.abgleich = {
    daten: spielerDaten,

    /* Die Freunde-Karte (v0.11.0) schreibt ueber den Abgleich — hier
       reicht es, den Stand zu uebernehmen. */
    aendern(neu) {
        ANMELDUNG.abgleich.daten = neu;
    }
};

let tafel = SCHACH_TAFEL.leereTafel(1000);
const kennungen = {};
let zeitpunkt = 2000;

for (const variante of SCHACH_VARIANTEN.liste) {
    zeitpunkt += 10;
    const angelegt = SCHACH_TAFEL.partieAnlegen(tafel, variante.id, variante.titel, zeitpunkt);

    let partie = SCHACH_RUNDE.teamBeitreten(angelegt.partie, "id-anna", "weiss", zeitpunkt);
    partie = SCHACH_RUNDE.teamBeitreten(partie, "id-bert", "schwarz", zeitpunkt);
    partie = SCHACH_RUNDE.bereitSetzen(partie, "weiss", true, zeitpunkt);
    partie = SCHACH_RUNDE.bereitSetzen(partie, "schwarz", true, zeitpunkt);

    tafel = SCHACH_TAFEL.partieEinsetzen(angelegt.tafel, partie, zeitpunkt);
    kennungen[variante.id] = partie.id;
}

/*
 * Der Abgleich-Stellvertreter. `eigenerVorgangBeginnt`/`-Endet` gehoeren dazu,
 * seit der Bildschirm seine eigenen Schreibvorgaenge anmeldet (v3.8) — der
 * echte Abgleich haelt damit die regelmaessige Abfrage an.
 */
TEAM_SCHACH.abgleich = {
    daten: tafel,
    /* `speichern` seit v0.76: Ein Test drueckt jetzt einen Knopf, der wirklich
       ueber `_sendenMitPruefung` schreibt. Ohne die Funktion liefe der Weg in
       seinen Fehlerzweig und naehme die Aenderung gleich wieder zurueck. */
    speicher: { art: "lokal", async speichern() { return true; } },
    vorgaenge: 0,
    eigenerVorgangBeginnt() { this.vorgaenge++; },
    eigenerVorgangEndet() { this.vorgaenge = Math.max(0, this.vorgaenge - 1); }
};
TEAM_SCHACH.aufbauen(neuesElement("div"));

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

    const kasten = suchen("schalter-kasten")[0];
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
    partie = SCHACH_RUNDE.bereitSetzen(partie, "weiss", true, 4000);
    partie = SCHACH_RUNDE.bereitSetzen(partie, "schwarz", true, 4000);

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
    partie = SCHACH_RUNDE.bereitSetzen(partie, "weiss", true, 5000);
    partie = SCHACH_RUNDE.bereitSetzen(partie, "schwarz", true, 5000);

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

pruefe("Beendete Partien stehen nicht mehr zwischen den offenen", () => {
    TEAM_SCHACH.zeichnen(TEAM_SCHACH.abgleich.daten);

    /* Kopf, dann die offenen Karten, dann der zugeklappte Kasten. */
    const kasten = TEAM_SCHACH.wurzelEl.kinder.find((kind) => kind.tagName === "details");
    if (!kasten) {
        throw new Error("kein Kasten fuer beendete Partien");
    }
    const beschriftung = String(kasten.kinder[0].textContent || "");
    if (beschriftung.indexOf("beendeten Partien") === -1) {
        throw new Error("Kasten falsch beschriftet: " + beschriftung);
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

    const kastenSuchen = () => TEAM_SCHACH.wurzelEl.kinder
        .find((kind) => kind.tagName === "details");

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
    partie = SCHACH_RUNDE.bereitSetzen(partie, "weiss", true, 7000);
    partie = SCHACH_RUNDE.bereitSetzen(partie, "schwarz", true, 7000);

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
    partie = SCHACH_RUNDE.bereitSetzen(partie, "weiss", true, 6100);
    partie = SCHACH_RUNDE.bereitSetzen(partie, "schwarz", true, 6100);

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
    partie = SCHACH_RUNDE.bereitSetzen(partie, "weiss", true, 9400);
    partie = SCHACH_RUNDE.bereitSetzen(partie, "schwarz", true, 9400);

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
    partie = SCHACH_RUNDE.bereitSetzen(partie, "weiss", true, 9500);
    partie = SCHACH_RUNDE.bereitSetzen(partie, "schwarz", true, 9500);
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

    /* Und je Stufe eine Zeile in der Legende, mit dem i fuer die Zahlen. */
    const zeilen = einsammeln(TEAM_SCHACH.wurzelEl, (kind) =>
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
 * DER STREIFEN NACH EINEM UNGLÜCKSWÜRFEL (v0.59, Wunsch #13).
 *
 * Er wird aus dem letzten Verlaufseintrag gelesen. Gebaut wird der Fall hier
 * über einen echten Zug auf einen Unglückswürfel — dann steht der Eintrag im
 * Verlauf, so wie er im Spiel entsteht.
 */
pruefe("Ein eingesammelter Unglueckswuerfel wird angesagt (v0.59)", () => {
    const angelegt = SCHACH_TAFEL.partieAnlegen(
        TEAM_SCHACH.abgleich.daten, "standard", "Unglueck", 5700);

    let partie = SCHACH_RUNDE.teamBeitreten(angelegt.partie, "id-anna", "weiss", 5700);
    partie = SCHACH_RUNDE.teamBeitreten(partie, "id-bert", "schwarz", 5700);
    partie = SCHACH_RUNDE.bereitSetzen(partie, "weiss", true, 5700);
    partie = SCHACH_RUNDE.bereitSetzen(partie, "schwarz", true, 5700);

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

    const streifen = TEAM_SCHACH.wurzelEl.kinder.find(
        (kind) => String(kind.className || "").indexOf("unglueck-meldung") !== -1);

    if (!streifen) {
        throw new Error("kein Streifen nach dem Unglueckswuerfel");
    }

    /* Er steht ueber dem Brett, nicht darunter: direkt hinter der Standleiste. */
    const stelle = TEAM_SCHACH.wurzelEl.kinder.indexOf(streifen);
    if (stelle !== 2) {
        throw new Error("der Streifen steht an Stelle " + stelle + " statt ueber dem Brett");
    }

    /* Und nach einem gewoehnlichen Zug ist er wieder weg. */
    partie = SCHACH_RUNDE.ziehen(partie, "id-bert",
        SCHACH.feldNummer("h7"), SCHACH.feldNummer("h6"), "D", "Bert", 5720);
    TEAM_SCHACH.abgleich.daten = SCHACH_TAFEL.partieEinsetzen(
        TEAM_SCHACH.abgleich.daten, partie, 5720);
    TEAM_SCHACH.zeichnen(TEAM_SCHACH.abgleich.daten);

    if (TEAM_SCHACH.wurzelEl.kinder.some(
        (kind) => String(kind.className || "").indexOf("unglueck-meldung") !== -1)) {
        throw new Error("der Streifen bleibt nach dem naechsten Zug stehen");
    }

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
    partie = SCHACH_RUNDE.bereitSetzen(partie, "weiss", true, 7700);
    partie = SCHACH_RUNDE.bereitSetzen(partie, "schwarz", true, 7700);

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
    partie = SCHACH_RUNDE.bereitSetzen(partie, "weiss", true, 6000);
    partie = SCHACH_RUNDE.bereitSetzen(partie, "schwarz", true, 6000);
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

/* ------------------------------------------------------------------ *
 * Die drei Bildschirm-Punkte aus v0.76
 * ------------------------------------------------------------------ */

/*
 * Traegt dieses Element die Klasse? Gefragt werden BEIDE Wege: `className`
 * (beim Bauen mitgegeben) und `classList` (spaeter hinzugefuegt). Im Browser
 * ist das dasselbe, im Nachbau nicht — genau daran ist schon einmal ein Test
 * vorbeigelaufen (siehe `classList.contains`).
 */
function hatKlasse(element, klasse) {
    if (String(element.className || "").split(" ").indexOf(klasse) !== -1) {
        return true;
    }
    return !!(element.classList && element.classList.contains(klasse));
}

/* Sucht das erste Kind mit dieser Klasse, egal wie tief. */
function klasseSuchen(element, klasse) {
    for (const kind of element.kinder || []) {
        if (hatKlasse(kind, klasse)) {
            return kind;
        }
        const tiefer = klasseSuchen(kind, klasse);
        if (tiefer) {
            return tiefer;
        }
    }
    return null;
}

/* Zaehlt alle Kinder mit dieser Klasse, egal wie tief. */
function klasseZaehlen(element, klasse) {
    let anzahl = 0;
    for (const kind of element.kinder || []) {
        if (hatKlasse(kind, klasse)) {
            anzahl++;
        }
        anzahl += klasseZaehlen(kind, klasse);
    }
    return anzahl;
}

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
    partie = SCHACH_RUNDE.bereitSetzen(partie, "weiss", true, 7500);
    partie = SCHACH_RUNDE.bereitSetzen(partie, "schwarz", true, 7500);
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
    partie = SCHACH_RUNDE.bereitSetzen(partie, "weiss", true, 7000);
    partie = SCHACH_RUNDE.bereitSetzen(partie, "schwarz", true, 7000);

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
    partie = SCHACH_RUNDE.bereitSetzen(partie, "weiss", true, 9000);
    partie = SCHACH_RUNDE.bereitSetzen(partie, "schwarz", true, 9000);

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
    partie = SCHACH_RUNDE.bereitSetzen(partie, "weiss", true, 9300);
    partie = SCHACH_RUNDE.bereitSetzen(partie, "schwarz", true, 9300);

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
    partie = SCHACH_RUNDE.bereitSetzen(partie, "weiss", true, 9400);
    partie = SCHACH_RUNDE.bereitSetzen(partie, "schwarz", true, 9400);

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
    alt = SCHACH_RUNDE.bereitSetzen(alt, "weiss", true, 8000);
    alt = SCHACH_RUNDE.bereitSetzen(alt, "schwarz", true, 8000);
    alt = SCHACH_RUNDE.aufgeben(alt, "schwarz", 8100);
    tafelJetzt = SCHACH_TAFEL.partieEinsetzen(beendet.tafel, alt, 8100);

    /* Und eine zweite, die noch laeuft. */
    const laufend = SCHACH_TAFEL.partieAnlegen(tafelJetzt, "standard", "Laeuft", 8200);
    let neu = SCHACH_RUNDE.teamBeitreten(laufend.partie, "id-anna", "weiss", 8200);
    neu = SCHACH_RUNDE.teamBeitreten(neu, "id-bert", "schwarz", 8200);
    neu = SCHACH_RUNDE.bereitSetzen(neu, "weiss", true, 8200);
    neu = SCHACH_RUNDE.bereitSetzen(neu, "schwarz", true, 8200);
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

pruefe("Waehrend ein Zug unterwegs ist, sagt es die Leiste", () => {
    /* Ohne diese Marke tippt man ins Leere: Das Brett nimmt nichts mehr an,
       sagt es aber niemandem. */
    TEAM_SCHACH.partieOeffnen(kennungen.standard);
    const partie = SCHACH_TAFEL.partie(TEAM_SCHACH.abgleich.daten, kennungen.standard);

    TEAM_SCHACH.ziehtGerade = true;
    try {
        TEAM_SCHACH.zeichnen(TEAM_SCHACH.abgleich.daten);

        const leiste = TEAM_SCHACH.wurzelEl.kinder.find((kind) =>
            String(kind.className || "").indexOf("stand-leiste") !== -1);

        if (!leiste) {
            throw new Error("keine Standleiste gefunden");
        }
        const marken = leiste.kinder.map((kind) => kind.textInhalt || kind.text || "");
        if (!leiste.kinder.some((kind) =>
            String(kind.textContent || "").indexOf("gesendet") !== -1)) {
            throw new Error("keine Marke 'Wird gesendet': " + marken.join(" | "));
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
    partie = SCHACH_RUNDE.bereitSetzen(partie, "weiss", true, 6000);
    partie = SCHACH_RUNDE.bereitSetzen(partie, "schwarz", true, 6000);

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

    const zeilen = einsammeln(FAEHIGKEITEN.wurzelEl, (kind) =>
        String(kind.className || "").indexOf("stufen-legende-zeile") !== -1, []);
    if (zeilen.length !== umgebung.SCHACH_VARIANTEN.STUFEN.length) {
        throw new Error("erwartet " + umgebung.SCHACH_VARIANTEN.STUFEN.length
            + " Legenden-Zeilen, sind " + zeilen.length);
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

pruefe("Alle Runden-Aktionen stehen in der Fussleiste (v0.26.0)", () => {
    /*
     * DIE GEMELDETE ANSAGE: „wenn ich ein spiel starte gibt es noch die
     * knoepfe zurueck und so ganz unten, die sollen alle zsm gefasst
     * werden."
     *
     * Geprueft wird an einer WARTENDEN Partie (dort gibt es am meisten zu
     * sehen): „Runde verlassen" ist von der Team-Karte in die Fussleiste
     * gezogen, und „Umbenennen" ist ganz weg — Runden haben seit v0.14.0
     * keinen eigenen Namen mehr.
     */
    let partie = SCHACH_TAFEL.partie(TEAM_SCHACH.abgleich.daten,
        kennungen[SCHACH_VARIANTEN.liste[0].id]);
    partie = SCHACH_RUNDE.kopieren(partie);
    partie.laeuft = false;
    partie.ergebnis = null;

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

        const leiste = einsammeln(TEAM_SCHACH.wurzelEl, (kind) =>
            String(kind.className || "").indexOf("fussleiste") !== -1, [])[0];
        if (!leiste) {
            throw new Error("keine Fussleiste in der Partie");
        }

        const texte = einsammeln(leiste, (kind) => kind.tagName === "button", [])
            .map((knopf) => String(knopf.textContent || ""));

        if (texte.indexOf("Runde verlassen") === -1) {
            throw new Error("Runde verlassen fehlt in der Fussleiste, da ist: "
                + texte.join(", "));
        }
        if (texte.indexOf("Umbenennen") !== -1) {
            throw new Error("Umbenennen ist zurueck - Runden haben keinen Namen");
        }

        /* Und an der Team-Karte haengt es nicht mehr. */
        const karten = einsammeln(TEAM_SCHACH.wurzelEl, (kind) =>
            String(kind.className || "").indexOf("team-karte") !== -1, []);
        for (const karte of karten) {
            const inKarte = einsammeln(karte, (kind) =>
                kind.tagName === "button", [])
                .map((knopf) => String(knopf.textContent || ""));
            if (inKarte.indexOf("Team verlassen") !== -1) {
                throw new Error("Team verlassen haengt noch an der Team-Karte");
            }
        }
    } finally {
        TEAM_SCHACH.abgleich.daten = vorher;
        TEAM_SCHACH.uebersichtOeffnen();
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

    const leiste = einsammeln(TEAM_SCHACH.wurzelEl, (kind) =>
        String(kind.className || "").indexOf("fussleiste") !== -1, [])[0];
    const texte = einsammeln(leiste, (kind) => kind.tagName === "button", [])
        .map((knopf) => String(knopf.textContent || ""));

    if (texte.indexOf("Zur Übersicht") !== -1) {
        throw new Error("die laufende eigene Partie bietet einen Ausgang an: "
            + texte.join(", "));
    }
    if (texte.indexOf("Aufgeben") === -1) {
        throw new Error("kein Aufgeben in der laufenden Partie");
    }

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

        if (!knopfMitText("Einladen")) {
            throw new Error("kein Einladen-Knopf fuer den freien Freund");
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

zeitlimitPruefen();
