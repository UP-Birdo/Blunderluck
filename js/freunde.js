/*
 * freunde.js — die Freundesliste (seit v0.11.0, Bündel A Schritt 6).
 *
 * „Gross gedacht" (Nutzer-Entscheidung F13): Suchen, Anfrage stellen,
 * Annehmen, Ablehnen, Zurückziehen und Entfernen. Die Karte hing bis
 * v0.18.0 auf dem Zwischenbildschirm „Spielen"; seit Wunsch 6 (v0.19.0)
 * wohnt sie am Freunde-Zeichen des Startbildschirms
 * (`START.freundeOeffnen`) — der Zwischenbildschirm ist seit Wunsch 1 nur
 * noch der Weg ins Beitreten. Fürs Einladen in eine laufende Runde bleibt
 * es bei der Liste an den Teams (v0.13.0).
 *
 * Die DATEN-Regeln wohnen in spieler.js (Abschnitt „Freundschaft"): Jeder
 * schreibt nur die eigene Sicht (`freunde`, `abgelehnt`), die Beziehung
 * wird aus beiden Listen gelesen. Diese Datei zeichnet nur und ruft das
 * Modell — geschrieben wird über den Spieler-Abgleich MIT Zusammenführung,
 * denn geändert wird ausschliesslich der eigene Eintrag.
 *
 * Die Freundeslisten sind öffentlich lesbar (docs\entscheidungen\offen-und-
 * abgelehnt.md, „Die offene Datenbank") — unter Regel §12 (seit v0.154.0)
 * nur noch für Angemeldete, im öffentlichen Auszug `spieler/oeffentlich`.
 */

const FREUNDE = {

    /* Namen gibt es seit v0.138.0 mehrfach — eindeutig ist erst Name#Nummer
       (js\konto.js). Gezeigt wird seit v0.151.8 nur der Name (Nutzer
       27.09.2026: um die Nummer soll sich niemand sorgen müssen). */
    _name(spieler) {
        return spieler.name;
    },

    /*
     * GLEICHE NAMEN: „Level N" leise hinter dem Namen — nur, wenn es den
     * Namen unter den Mitspielern mehrmals gibt; sonst "". Bis v0.153.0
     * stand hier die Nummer (#1234). Seit v0.154.0 (Regel §12, Konzept K6,
     * Nutzer F1) sieht die Nummer eines anderen niemand mehr — sie ist sein
     * Freundescode; nur der Besitzer sieht sie im eigenen Profil.
     */
    _gleichNameZusatz(liste, spieler) {
        if (!spieler || typeof KONTO === "undefined") {
            return "";
        }
        const schluessel = KONTO.nameSchluessel(spieler.name);
        const gleich = liste.filter((anderer) =>
            KONTO.nameSchluessel(anderer.name) === schluessel).length;
        if (gleich <= 1 || typeof FORTSCHRITT === "undefined") {
            return "";
        }
        return "Level " + FORTSCHRITT.auszugLevel(FORTSCHRITT.auszugVon(spieler)).level;
    },

    /* Der Suchtext überlebt das Neuzeichnen der Karte. */
    suchtext: "",

    /* Das Ergebnis der letzten Suche nach „Name#Nummer" (seit v0.154.0):
       { eingabe, spieler | null, fehler }. Die Suche fragt die Datenbank
       (Regel §12: gezielt ein Namens-Platz) — erst, wenn Name und vier
       Zeichen Nummer dastehen. */
    _suchErgebnis: null,

    /* Baut die Karte „Freunde" für den Zwischenbildschirm. */
    karteBauen(person) {
        const karte = document.createElement("section");
        karte.className = "karte";

        const kopf = document.createElement("h3");
        kopf.textContent = "Freunde";
        karte.appendChild(kopf);

        const daten = (typeof ANMELDUNG !== "undefined" && ANMELDUNG.abgleich)
            ? ANMELDUNG.abgleich.daten : null;
        if (!person || !daten) {
            karte.appendChild(ZUSTAND.leer({ zeichen: "menschen", text: "Nicht angemeldet" }));
            return karte;
        }

        /* UP#Plus verteilt nur Rollen und hat keine Freunde. */
        if (SPIELER.istVerteiler(person)) {
            karte.appendChild(ZUSTAND.leer({ zeichen: "menschen", text: "Nur Rollen" }));
            return karte;
        }

        const sicht = SPIELER.freundeVon(daten, person.id);
        const alle = SPIELER.mitspieler(daten);
        const zusatz = (spieler) => FREUNDE._gleichNameZusatz(alle, spieler);

        /* Offene Anfragen zuerst — sie warten auf eine Antwort. */
        if (sicht.offen.length > 0) {
            karte.appendChild(FREUNDE._erklaerung("Anfragen an dich"));
            for (const anderer of sicht.offen) {
                karte.appendChild(FREUNDE._zeileBauen(FREUNDE._name(anderer), [
                    FREUNDE._knopf("Annehmen", "knopf-still knopf-klein",
                        () => FREUNDE.annehmen(anderer.id)),
                    FREUNDE._knopf("Ablehnen", "knopf-still knopf-klein",
                        () => FREUNDE.ablehnen(anderer.id))
                ], anderer.id, zusatz(anderer)));
            }
        }

        if (sicht.freunde.length > 0) {
            for (const freund of sicht.freunde) {
                karte.appendChild(FREUNDE._zeileBauen(FREUNDE._name(freund), [
                    DIALOG.zweiSchritt(
                        FREUNDE._knopf("Entfernen", "knopf-gefahr knopf-klein", null),
                        () => FREUNDE.entfernen(freund.id))
                ], freund.id, zusatz(freund)));
            }
        } else {
            /* Leer-Zustand mit Ausweg (UPCrew-Standard): Der Knopf springt
               in das Suchfeld unten. Das Feld gibt es erst weiter unten —
               gesucht wird es deshalb erst beim Klick. */
            karte.appendChild(ZUSTAND.leer({
                zeichen: "menschen", text: "Keine Freunde",
                aktion: {
                    text: "Suchen",
                    beiKlick: () => {
                        const suche = karte.querySelector(".freunde-suche");
                        if (suche) {
                            suche.focus();
                        }
                    }
                }
            }));
        }

        if (sicht.gesendet.length > 0) {
            karte.appendChild(FREUNDE._erklaerung("Gesendet"));
            for (const anderer of sicht.gesendet) {
                karte.appendChild(FREUNDE._zeileBauen(FREUNDE._name(anderer), [
                    FREUNDE._knopf("Zurückziehen", "knopf-still knopf-klein",
                        () => FREUNDE.zurueckziehen(anderer.id))
                ], anderer.id, zusatz(anderer)));
            }
        }

        /*
         * DIE SUCHE NUR MIT „NAME#NUMMER" (seit v0.154.0, Regel §12, Nutzer
         * F1: „bei der Freundes-Suche muss man den # eingeben"). Bis v0.153.0
         * filterte sie die ganze Spielerliste nach dem Namen — das verwechselt
         * gleiche Namen und verrät Nummern. Jetzt: erst mit Name und vier
         * Zeichen Nummer fragt `KONTO.freundFinden` (unter §12 gezielt ein
         * Namens-Platz), sonst steht nur der Hinweis da.
         */
        const feld = document.createElement("input");
        feld.className = "freunde-suche";
        feld.type = "text";
        feld.value = FREUNDE.suchtext;
        feld.placeholder = "Name#1234";
        feld.autocomplete = "off";
        feld.setAttribute("aria-label", "Freunde suchen · Name#Nummer");
        karte.appendChild(feld);

        const treffer = document.createElement("div");
        treffer.className = "freunde-treffer";
        karte.appendChild(treffer);

        const trefferZeigen = () => {
            treffer.innerHTML = "";
            const gesucht = FREUNDE.suchtext.trim();
            if (gesucht === "") {
                return;
            }
            /* Ohne UPCrew-Konto (lokaler Modus, Tests) gibt es keine
               Nummern — dort bleibt der Namens-Filter wie bis v0.153.0. */
            if (typeof KONTO === "undefined" || !KONTO.aktiv()) {
                FREUNDE._namenFilterZeigen(treffer, person, gesucht.toLowerCase());
                return;
            }
            const teile = KONTO.eingabeZerlegen(gesucht);
            if (!teile.tag || teile.tag.length !== 4) {
                treffer.appendChild(ZUSTAND.leer({ zeichen: "lupe", text: "Name#Nummer nötig" }));
                return;
            }
            const ergebnis = FREUNDE._suchErgebnis;
            if (!ergebnis || ergebnis.eingabe !== gesucht) {
                treffer.appendChild(ZUSTAND.laden({ zeilen: 1 }));
                FREUNDE._suchen(gesucht, trefferZeigen);
                return;
            }
            if (ergebnis.fehler) {
                treffer.appendChild(ZUSTAND.leer({ zeichen: "lupe", text: "Keine Verbindung" }));
                return;
            }
            const stand = SPIELER.normalisieren(ANMELDUNG.abgleich.daten);
            const anderer = ergebnis.spieler;
            if (!anderer || anderer.id === person.id || SPIELER.istVerteiler(anderer)
                    || SPIELER.istGast(anderer)
                    || SPIELER.freundschaft(stand, person.id, anderer.id) !== "keine") {
                treffer.appendChild(ZUSTAND.leer({ zeichen: "lupe", text: "Niemand gefunden" }));
                return;
            }
            treffer.appendChild(FREUNDE._zeileBauen(FREUNDE._name(anderer), [
                FREUNDE._knopf("Anfrage senden", "knopf-still knopf-klein",
                    () => FREUNDE.anfragen(anderer.id))
            ], null, ""));
        };

        feld.addEventListener("input", () => {
            FREUNDE.suchtext = feld.value;
            trefferZeigen();
        });
        trefferZeigen();

        return karte;
    },

    /* Der Namens-Filter über die geladene Liste — nur ohne UPCrew-Konto. */
    _namenFilterZeigen(treffer, person, gesucht) {
        const stand = SPIELER.normalisieren(ANMELDUNG.abgleich.daten);
        const gefunden = SPIELER.mitspieler(stand).filter((anderer) =>
            anderer.id !== person.id
            && anderer.name.toLowerCase().indexOf(gesucht) !== -1
            && SPIELER.freundschaft(stand, person.id, anderer.id) === "keine");
        if (gefunden.length === 0) {
            treffer.appendChild(ZUSTAND.leer({ zeichen: "lupe", text: "Niemand gefunden" }));
            return;
        }
        for (const anderer of gefunden) {
            treffer.appendChild(FREUNDE._zeileBauen(FREUNDE._name(anderer), [
                FREUNDE._knopf("Anfrage senden", "knopf-still knopf-klein",
                    () => FREUNDE.anfragen(anderer.id))
            ], anderer.id, ""));
        }
    },

    /* Einmal nachschlagen und danach neu zeigen — nur, wenn der Suchtext
       inzwischen derselbe ist. */
    async _suchen(eingabe, danach) {
        if (FREUNDE._sucheLaeuft === eingabe) {
            return;
        }
        FREUNDE._sucheLaeuft = eingabe;
        let ergebnis;
        try {
            ergebnis = await KONTO.freundFinden(ANMELDUNG.abgleich.daten, eingabe);
        } catch (fehler) {
            ergebnis = { fehler: "netz" };
        }
        FREUNDE._sucheLaeuft = null;
        FREUNDE._suchErgebnis = { eingabe: eingabe, spieler: ergebnis.spieler || null,
            fehler: ergebnis.fehler === "netz" };
        if (FREUNDE.suchtext.trim() === eingabe && typeof danach === "function") {
            danach();
        }
    },

    _sucheLaeuft: null,

    /* ---------------------------------------------------------------- *
     * Bedienung — jede Aktion ändert NUR den eigenen Eintrag
     * ---------------------------------------------------------------- */

    /* Anfrage stellen und Annehmen sind im Modell dieselbe Handlung. */
    anfragen(andererId) {
        FREUNDE.suchtext = "";
        FREUNDE._schreiben((daten, ichId) =>
            SPIELER.freundHinzufuegen(daten, ichId, andererId));
        DIALOG.kurzmeldung("Anfrage gesendet");
    },

    annehmen(andererId) {
        FREUNDE._schreiben((daten, ichId) =>
            SPIELER.freundHinzufuegen(daten, ichId, andererId));
        DIALOG.kurzmeldung("Ihr seid jetzt Freunde");
    },

    ablehnen(andererId) {
        FREUNDE._schreiben((daten, ichId) =>
            SPIELER.freundAblehnen(daten, ichId, andererId));
    },

    entfernen(andererId) {
        FREUNDE._schreiben((daten, ichId) =>
            SPIELER.freundAblehnen(daten, ichId, andererId));
    },

    zurueckziehen(andererId) {
        FREUNDE._schreiben((daten, ichId) =>
            SPIELER.freundStreichen(daten, ichId, andererId));
    },

    _schreiben(aenderung) {
        const person = ICH.person();
        if (!person || typeof ANMELDUNG === "undefined" || !ANMELDUNG.abgleich) {
            return;
        }

        /* MIT Zusammenführung: Geändert wird nur der eigene Eintrag —
           jeder ist Herr über ihn, alles andere kommt vom Server. */
        ANMELDUNG.abgleich.aendern(
            aenderung(ANMELDUNG.abgleich.daten, person.id), true);

        /* Wer die Karte gerade zeigt, zeichnet neu. Seit Wunsch 6
           (v0.19.0) ist das der Startbildschirm; das Team Schach zeichnet
           trotzdem mit, weil dort die Einladungen an den Teams hängen. */
        if (typeof START !== "undefined" && START.freundeOffen) {
            START._zeichnen();
        }
        if (typeof TEAM_SCHACH !== "undefined" && TEAM_SCHACH.abgleich) {
            TEAM_SCHACH.zeichnen(TEAM_SCHACH.abgleich.daten);
        }
    },

    /* ---------------------------------------------------------------- *
     * Bausteine
     * ---------------------------------------------------------------- */

    /* `id` (seit v0.119.0) macht den Namen zum Knopf ins Profil. */
    _zeileBauen(name, knoepfe, id, nummer) {
        const zeile = document.createElement("div");
        zeile.className = "freunde-zeile";

        /* Name und (nur bei gleichen Namen) die leise Nummer bleiben links
           beisammen. */
        const wer = document.createElement("span");
        wer.className = "freunde-wer";
        if (id && typeof TEAM_SCHACH !== "undefined" && TEAM_SCHACH._nameKnopfBauen) {
            wer.appendChild(TEAM_SCHACH._nameKnopfBauen(id, "freunde-name"));
        } else {
            const beschriftung = document.createElement("span");
            beschriftung.className = "freunde-name";
            beschriftung.textContent = name;
            wer.appendChild(beschriftung);
        }
        if (nummer) {
            const leise = document.createElement("span");
            leise.className = "freunde-nummer";
            leise.textContent = nummer;
            wer.appendChild(leise);
        }
        zeile.appendChild(wer);

        const leiste = document.createElement("span");
        leiste.className = "freunde-knoepfe";
        for (const knopf of knoepfe) {
            leiste.appendChild(knopf);
        }
        zeile.appendChild(leiste);

        return zeile;
    },

    _erklaerung(text) {
        const absatz = document.createElement("p");
        absatz.className = "erklaerung";
        absatz.textContent = text;
        return absatz;
    },

    _knopf(beschriftung, klasse, beiKlick) {
        const knopf = document.createElement("button");
        knopf.type = "button";
        knopf.className = "knopf " + klasse;
        knopf.textContent = beschriftung;
        if (beiKlick) {
            knopf.addEventListener("click", beiKlick);
        }
        return knopf;
    }
};
