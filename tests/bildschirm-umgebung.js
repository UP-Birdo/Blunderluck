/*
 * bildschirm-umgebung.js — die GEMEINSAME Testumgebung der drei
 * Bildschirm-Testdateien (test-bildschirm.js, test-bildschirm-anzeigen.js,
 * test-bildschirm-ablaeufe.js). KEINE Testdatei: Sie beginnt nicht mit
 * `test-` und wird deshalb von tests\Tests-Ausfuehren.ps1 nicht als Test
 * gestartet; sie erzeugt selbst keine Prüfungen und kein Fazit.
 *
 * Warum es die Bildschirm-Tests gibt: Die übrigen Tests prüfen Regeln und
 * Daten. Fehler im Bildschirm-Code (ein falsch geschriebener Aufruf, ein
 * Feld, das es nicht mehr gibt) fallen dort nicht auf — sie fliegen erst im
 * Browser auseinander, beim Klick. Genau so blieb in v1.2 ein ganzer Tab leer.
 *
 * Hier wird deshalb ein winziges DOM nachgebaut (nur so viel, wie der Code
 * anfasst), die ECHTEN Dateien aus js\ werden in einem vm-Kontext übersetzt,
 * und die Ausgangslage (zwei Mitspieler, je eine laufende Partie pro
 * Spielart) wird aufgebaut. Jede der drei Testdateien lädt diese Datei per
 * require() und bekommt so ihre EIGENE, frische Umgebung — die Dateien
 * laufen als getrennte Prozesse und teilen keinen Zustand.
 *
 * WAS DIESE TESTS NICHT KÖNNEN
 * Sie sagen nichts über das Aussehen: keine Stildatei, keine echten Größen,
 * keine Farben. Sie beantworten nur die Frage „läuft der Code durch, ohne zu
 * stolpern". Die Prüfliste in docs\DEPLOYMENT.md ersetzen sie nicht.
 */

const pfad = require("path");
const dateisystem = require("fs");
const vm = require("vm");

const projekt = pfad.join(__dirname, "..");
const jsOrdner = pfad.join(projekt, "js");

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

        /*
         * Seit v0.63.0: Das Zeichen einer Faehigkeit wird VOR den Text
         * gehaengt (`_faehigkeitMarkeBauen`). `firstChild` ist dabei `null`,
         * solange der Knopf nur `textContent` traegt — dann haengt
         * `insertBefore` hinten an, genau wie der Browser es tut.
         */
        insertBefore(kind, vor) {
            const stelle = this.kinder.indexOf(vor);
            if (stelle === -1) {
                this.kinder.push(kind);
            } else {
                this.kinder.splice(stelle, 0, kind);
            }
            return kind;
        },

        get firstChild() {
            return this.kinder.length > 0 ? this.kinder[0] : null;
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

        /*
         * SEIT v0.84.0 SUCHT SIE WIRKLICH (vorher immer eine leere Liste).
         *
         * Gebraucht vom freien Ziehen: `_vorschauUmsetzen` holt sich damit
         * alle Felder des Brettes und tauscht ihre Rahmen-Klassen, ohne das
         * Brett neu zu bauen. Mit der leeren Liste von früher wäre genau
         * dieser Teil im Test unsichtbar geblieben — er hätte nichts getan
         * und trotzdem bestanden.
         *
         * Sie versteht dieselben zwei Sucharten wie `querySelector` und
         * zusätzlich den blossen Attributnamen (`[data-feld]`).
         */
        querySelectorAll(wahl) {
            const feld = wahl.match(/data-feld="(\d+)"/);
            const alleFelder = /^\[data-feld\]$/.test(wahl);
            const klasse = wahl.match(/^\.([a-z-]+)$/);

            const passt = (element) => {
                if (alleFelder) {
                    return element.dataset && element.dataset.feld !== undefined;
                }
                if (feld) {
                    return element.dataset && element.dataset.feld === feld[1];
                }
                if (klasse) {
                    return typeof element.className === "string"
                        && element.className.split(" ").indexOf(klasse[1]) !== -1;
                }
                return false;
            };

            const treffer = [];
            const suchen = (element) => {
                for (const kind of element.kinder || []) {
                    if (passt(kind)) {
                        treffer.push(kind);
                    }
                    suchen(kind);
                }
            };

            suchen(this);
            return treffer;
        },

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
    "SCHACH_TAFEL", "SCHACH_BOT", "SCHACH_VORSCHAU", "SCHACH_GRUNDLAGEN", "TEAM_SCHACH",
    "RANGLISTE", "START", "FAEHIGKEITEN", "FREUNDE", "EINSTELLUNGEN",
    "VERWALTUNGS_BILDSCHIRM",
    "FAEHIGKEIT_ZEICHEN",
    "SpeicherGemeinsam",
    /* Seit v0.76 auch der Abgleich: Sein Rennen mit der regelmaessigen Abfrage
       war der „Doppelzug-Fehler", und ohne Test kaeme es unbemerkt zurueck. */
    "Abgleich"];

/* Die Reihenfolge ist dieselbe wie in index.html — die drei team-schach-Teile
   ergänzen das Objekt und müssen nach ihm kommen. */
const dateien = ["konfig.js", "spieler.js", "speicher.js", "abgleich.js",
    "anmeldung.js",
    "faehigkeit-zeichen.js", "schach-varianten.js",
    "schach.js", "schach-runde.js", "schach-runde-faehigkeiten.js",
    "schach-tafel.js", "schach-bot.js",
    "schach-vorschau.js",
    "schach-grundlagen.js",
    "team-schach.js",
    "team-schach-uebersicht.js", "team-schach-brett.js", "team-schach-auswertung.js",
    "team-schach-grundlagen.js",
    "rangliste.js", "start.js", "faehigkeiten.js", "freunde.js",
    "einstellungen.js",
    /* Die Spieler-Verwaltung als eigener Bildschirm mit Tabelle. */
    "verwaltungs-bildschirm.js",
    /* Seit v0.78.0: Der Wunsch-Knopf haengt auch in den Match-Einstellungen. */
    "wunsch.js"];

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
const SCHACH_BOT = umgebung.SCHACH_BOT;
const SCHACH_GRUNDLAGEN = umgebung.SCHACH_GRUNDLAGEN;
const TEAM_SCHACH = umgebung.TEAM_SCHACH;
const RANGLISTE = umgebung.RANGLISTE;
const SpeicherGemeinsam = umgebung.SpeicherGemeinsam;
const Abgleich = umgebung.Abgleich;
const FAEHIGKEIT_ZEICHEN = umgebung.FAEHIGKEIT_ZEICHEN;

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
    partie = bereitUndAufgestellt(partie, "weiss", zeitpunkt);
    partie = bereitUndAufgestellt(partie, "schwarz", zeitpunkt);

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

/*
 * Drei kleine DOM-Sucher, die mehrere der Testdateien benutzen. Sie standen
 * ursprünglich bei den „drei Bildschirm-Punkten aus v0.76" und sind mit der
 * Aufteilung (08/2026) hierher gezogen.
 */
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

/* Alles, was die drei Testdateien aus dieser Umgebung greifen. */
module.exports = {
    umgebung, netz, neuesElement, brettSuchen, faehigkeitenZeilen,
    bereitUndAufgestellt, hatKlasse, klasseSuchen, klasseZaehlen,
    spielerDaten, tafel, kennungen,
    SPIELER, ANMELDUNG, SCHACH, SCHACH_VARIANTEN, SCHACH_RUNDE, SCHACH_TAFEL,
    SCHACH_BOT, SCHACH_GRUNDLAGEN, TEAM_SCHACH, RANGLISTE,
    SpeicherGemeinsam, Abgleich, FAEHIGKEIT_ZEICHEN
};
