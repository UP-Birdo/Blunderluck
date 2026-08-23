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
 * Die Freundeslisten sind — wie alles in dieser Datenbank — öffentlich
 * lesbar (docs\entscheidungen\offen-und-abgelehnt.md, „Die offene
 * Datenbank").
 */

const FREUNDE = {

    /* Der Suchtext überlebt das Neuzeichnen der Karte. */
    suchtext: "",

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
            karte.appendChild(FREUNDE._erklaerung(
                "Melde dich an, um Freunde zu verwalten."));
            return karte;
        }

        const sicht = SPIELER.freundeVon(daten, person.id);

        /* Offene Anfragen zuerst — sie warten auf eine Antwort. */
        if (sicht.offen.length > 0) {
            karte.appendChild(FREUNDE._erklaerung("Anfragen an dich:"));
            for (const anderer of sicht.offen) {
                karte.appendChild(FREUNDE._zeileBauen(anderer.name, [
                    FREUNDE._knopf("Annehmen", "knopf-still knopf-klein",
                        () => FREUNDE.annehmen(anderer.id)),
                    FREUNDE._knopf("Ablehnen", "knopf-still knopf-klein",
                        () => FREUNDE.ablehnen(anderer.id))
                ]));
            }
        }

        if (sicht.freunde.length > 0) {
            for (const freund of sicht.freunde) {
                karte.appendChild(FREUNDE._zeileBauen(freund.name, [
                    DIALOG.zweiSchritt(
                        FREUNDE._knopf("Entfernen", "knopf-gefahr knopf-klein", null),
                        () => FREUNDE.entfernen(freund.id))
                ]));
            }
        } else {
            karte.appendChild(FREUNDE._erklaerung(
                "Noch keine Freunde. Such unten nach einem Namen und stell "
                + "eine Anfrage — nimmt die andere Seite an, seid ihr "
                + "Freunde."));
        }

        if (sicht.gesendet.length > 0) {
            karte.appendChild(FREUNDE._erklaerung("Deine offenen Anfragen:"));
            for (const anderer of sicht.gesendet) {
                karte.appendChild(FREUNDE._zeileBauen(anderer.name, [
                    FREUNDE._knopf("Zurückziehen", "knopf-still knopf-klein",
                        () => FREUNDE.zurueckziehen(anderer.id))
                ]));
            }
        }

        /* Die Suche: ein Filter über die Spielerliste — sie liegt ohnehin
           vollständig im Speicher. */
        const feld = document.createElement("input");
        feld.className = "freunde-suche";
        feld.type = "text";
        feld.value = FREUNDE.suchtext;
        feld.placeholder = "Namen suchen …";
        feld.autocomplete = "off";
        feld.setAttribute("aria-label", "Freunde suchen");
        karte.appendChild(feld);

        const treffer = document.createElement("div");
        treffer.className = "freunde-treffer";
        karte.appendChild(treffer);

        const trefferZeigen = () => {
            treffer.innerHTML = "";
            const gesucht = FREUNDE.suchtext.trim().toLowerCase();
            if (gesucht === "") {
                return;
            }

            const stand = SPIELER.normalisieren(ANMELDUNG.abgleich.daten);
            const gefunden = stand.spieler.filter((anderer) =>
                anderer.id !== person.id
                && anderer.name.toLowerCase().indexOf(gesucht) !== -1
                && SPIELER.freundschaft(stand, person.id, anderer.id) === "keine");

            if (gefunden.length === 0) {
                treffer.appendChild(FREUNDE._erklaerung(
                    "Niemand gefunden, der dazu passt."));
                return;
            }

            for (const anderer of gefunden) {
                treffer.appendChild(FREUNDE._zeileBauen(anderer.name, [
                    FREUNDE._knopf("Anfrage senden", "knopf-still knopf-klein",
                        () => FREUNDE.anfragen(anderer.id))
                ]));
            }
        };

        feld.addEventListener("input", () => {
            FREUNDE.suchtext = feld.value;
            trefferZeigen();
        });
        trefferZeigen();

        return karte;
    },

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

    _zeileBauen(name, knoepfe) {
        const zeile = document.createElement("div");
        zeile.className = "freunde-zeile";

        const beschriftung = document.createElement("span");
        beschriftung.className = "freunde-name";
        beschriftung.textContent = name;
        zeile.appendChild(beschriftung);

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
