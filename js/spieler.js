/*
 * spieler.js — die reine Datenlogik der Spielerliste.
 *
 * Blunderluck hat genau EINE Liste von Mitspielern: Wer dabei ist, unter
 * welchem Namen, und die Prüfsumme seiner PIN. Mehr nicht — kein Spielstand,
 * keine Punkte. Die Schachpartien kennen ihre Spieler nur über die Kennung
 * und holen sich den Anzeigenamen aus dieser Liste.
 *
 * Hier steht KEIN Bildschirm-Code und KEIN Speicher-Code: nur die Regeln, wie
 * die Daten aussehen und wie sie sich verändern. Der Bildschirm-Teil
 * (Anmelde-Dialoge, Profil, Verwaltung) steht in anmeldung.js.
 *
 * Datenvertrag (additiv — Felder werden nur ERGÄNZT, nie umbenannt oder
 * gelöscht):
 *
 *     {
 *         "datenVersion": 1,
 *         "geaendertAm": 1750000000000,      // Millisekunden seit 1970
 *         "spieler": [
 *             {
 *                 "id": "3f2c…",             // eindeutig, unveränderlich
 *                 "name": "Anna",
 *                 "pinPruefwert": "7c1f…",   // Prüfsumme der PIN, "" = keine
 *                 "pinSalz": "a91b…",        // offen; jedes Gerät muss prüfen können
 *                 "freunde": ["9d2a…"],      // wen ICH als Freund führe (seit v0.11.0)
 *                 "abgelehnt": []            // wen ich abgelehnt oder entfernt habe
 *             }
 *         ]
 *     }
 *
 * FREUNDSCHAFT WIRD GELESEN, NIE GESCHRIEBEN (seit v0.11.0, Bündel A
 * Schritt 6): Wegen der Abgleich-Regel „jeder ist Herr über seinen eigenen
 * Eintrag" kann niemand eine Anfrage in einen FREMDEN Eintrag schreiben —
 * sie würde beim nächsten Speichern der anderen Person überschrieben.
 * Deshalb schreibt jeder nur seine eigene Sicht (`freunde`, `abgelehnt`),
 * und die Beziehung ergibt sich aus dem Vergleich BEIDER Listen
 * (`freundschaft`).
 *
 * Die PIN selbst steht NIRGENDWO in diesen Daten — nur ihre Prüfsumme
 * (siehe js\versiegelung.js).
 */

const SPIELER = {

    /* Aktuelle Fassung des Datenvertrags. */
    DATEN_VERSION: 1,

    /* ---------------------------------------------------------------- *
     * Grundstrukturen
     * ---------------------------------------------------------------- */

    /* Erzeugt eine neue, möglichst eindeutige Kennung.
       Die Tests übergeben stattdessen eine feste Kennung. */
    idErzeugen() {
        const krypto = (typeof globalThis !== "undefined") ? globalThis.crypto : null;
        if (krypto && typeof krypto.randomUUID === "function") {
            return krypto.randomUUID();
        }
        SPIELER._zaehler = (SPIELER._zaehler || 0) + 1;
        return "spieler-" + Date.now() + "-" + SPIELER._zaehler;
    },

    /* Ein neuer Spieler ohne PIN. */
    neuerSpieler(name, id) {
        return {
            id: id || SPIELER.idErzeugen(),
            name: (name === undefined || name === null) ? "" : String(name),
            pinPruefwert: "",
            pinSalz: "",
            freunde: [],
            abgelehnt: []
        };
    },

    /* Ein leerer, gültiger Datenstand. */
    leereDaten(zeitpunkt) {
        return {
            datenVersion: SPIELER.DATEN_VERSION,
            geaendertAm: (zeitpunkt === undefined) ? 0 : zeitpunkt,
            spieler: []
        };
    },

    /*
     * Bringt einen beliebigen (auch halben oder kaputten) Datenstand auf die
     * aktuelle Fassung. Das ist die Nachrüst-Stelle des additiven
     * Datenvertrags: fehlende Felder werden ERGÄNZT, vorhandene nie verworfen.
     * Liefert immer einen gültigen Stand — notfalls einen leeren.
     */
    normalisieren(rohdaten) {
        const daten = SPIELER.leereDaten();

        if (!rohdaten || typeof rohdaten !== "object") {
            return daten;
        }

        if (typeof rohdaten.geaendertAm === "number" && isFinite(rohdaten.geaendertAm)) {
            daten.geaendertAm = rohdaten.geaendertAm;
        }

        const rohliste = Array.isArray(rohdaten.spieler) ? rohdaten.spieler : [];

        for (const roh of rohliste) {
            if (!roh || typeof roh !== "object") {
                continue;
            }

            const spieler = SPIELER.neuerSpieler(
                (typeof roh.name === "string") ? roh.name : "",
                (typeof roh.id === "string" && roh.id !== "") ? roh.id : undefined
            );

            if (typeof roh.pinPruefwert === "string") {
                spieler.pinPruefwert = roh.pinPruefwert;
            }
            if (typeof roh.pinSalz === "string") {
                spieler.pinSalz = roh.pinSalz;
            }

            /* Die Freundes-Sicht (seit v0.11.0) — der additive Datenvertrag:
               fehlende Listen bleiben leer, fremder Müll fliegt raus. */
            for (const feld of ["freunde", "abgelehnt"]) {
                if (Array.isArray(roh[feld])) {
                    spieler[feld] = roh[feld].filter(
                        (eintrag) => typeof eintrag === "string" && eintrag !== "");
                }
            }

            daten.spieler.push(spieler);
        }

        return daten;
    },

    /* Tiefe Kopie eines Datenstandes — damit nie versehentlich der
       Ausgangsstand verändert wird. */
    kopieren(daten) {
        return SPIELER.normalisieren(daten);
    },

    /* ---------------------------------------------------------------- *
     * Suchen
     * ---------------------------------------------------------------- */

    spielerFinden(daten, id) {
        const stand = SPIELER.normalisieren(daten);
        return stand.spieler.find((spieler) => spieler.id === id) || null;
    },

    /* Sucht ohne Rücksicht auf Groß- und Kleinschreibung — damit dieselbe
       Person nach einem Gerätewechsel ihren Platz wiederfindet. */
    spielerNachName(daten, name) {
        const gesucht = String(name || "").trim().toLowerCase();
        if (gesucht === "") {
            return null;
        }
        const stand = SPIELER.normalisieren(daten);
        return stand.spieler.find(
            (spieler) => spieler.name.trim().toLowerCase() === gesucht) || null;
    },

    /* Hat der Spieler eine PIN hinterlegt? Nur dann ist er von einem fremden
       Gerät aus prüfbar erreichbar. (Seit v0.7.0 ist die „PIN" ein Passwort —
       die Feldnamen bleiben, der Datenvertrag ist additiv.) */
    hatPin(spieler) {
        return !!(spieler && spieler.pinPruefwert && spieler.pinSalz);
    },

    /* ---------------------------------------------------------------- *
     * Passwort-Regel (seit v0.7.0, Bündel A Schritt 2)
     *
     * Aus der 4-stelligen PIN wird ein Passwort: 4 bis 8 Zeichen, erlaubt
     * sind Buchstaben (Gross-/Kleinschreibung zählt), Ziffern und
     * Sonderzeichen. Nur Leerraum ist verboten — er ist unsichtbar und beim
     * Abtippen nicht zu treffen. Alte 4-stellige PINs bleiben gültig: Sie
     * sind eine erlaubte 4-Zeichen-Eingabe, und die Prüfsummen-Zutat in
     * versiegelung.js blieb unangetastet.
     *
     * Die Regel wohnt hier im Modell, nicht im Dialog und nicht in
     * konfig.js — Bildschirm-Code fragt sie ab, statt selbst zu rechnen.
     * ---------------------------------------------------------------- */

    PASSWORT_MIN: 4,
    PASSWORT_MAX: 8,

    /* Liefert "" bei gültigem Passwort, sonst die Begründung als Satz. */
    passwortPruefen(text) {
        const wert = (text === undefined || text === null) ? "" : String(text);

        if (/\s/.test(wert)) {
            return "Leerzeichen sind im Passwort nicht erlaubt.";
        }
        if (wert.length < SPIELER.PASSWORT_MIN
                || wert.length > SPIELER.PASSWORT_MAX) {
            return "Das Passwort braucht " + SPIELER.PASSWORT_MIN + " bis "
                + SPIELER.PASSWORT_MAX + " Zeichen.";
        }
        return "";
    },

    /* ---------------------------------------------------------------- *
     * Änderungen — jede liefert einen NEUEN Stand
     * ---------------------------------------------------------------- */

    spielerHinzufuegen(daten, name, id, zeitpunkt) {
        const neu = SPIELER.kopieren(daten);
        neu.spieler.push(SPIELER.neuerSpieler(name, id));
        neu.geaendertAm = (zeitpunkt === undefined) ? Date.now() : zeitpunkt;
        return neu;
    },

    spielerEntfernen(daten, id, zeitpunkt) {
        const neu = SPIELER.kopieren(daten);
        neu.spieler = neu.spieler.filter((spieler) => spieler.id !== id);
        neu.geaendertAm = (zeitpunkt === undefined) ? Date.now() : zeitpunkt;
        return neu;
    },

    /*
     * Hinterlegt die PIN eines Spielers — gespeichert wird nur die Prüfsumme
     * und das zugehörige Salz, nie die Ziffern selbst (siehe versiegelung.js).
     * Damit kann sich dieselbe Person später von einem anderen Gerät aus
     * wieder als sie selbst anmelden.
     */
    pinSetzen(daten, id, pinPruefwert, pinSalz, zeitpunkt) {
        const neu = SPIELER.kopieren(daten);
        for (const spieler of neu.spieler) {
            if (spieler.id === id) {
                spieler.pinPruefwert = String(pinPruefwert || "");
                spieler.pinSalz = String(pinSalz || "");
            }
        }
        neu.geaendertAm = (zeitpunkt === undefined) ? Date.now() : zeitpunkt;
        return neu;
    },

    nameSetzen(daten, id, name, zeitpunkt) {
        const neu = SPIELER.kopieren(daten);
        for (const spieler of neu.spieler) {
            if (spieler.id === id) {
                spieler.name = (name === undefined || name === null) ? "" : String(name);
            }
        }
        neu.geaendertAm = (zeitpunkt === undefined) ? Date.now() : zeitpunkt;
        return neu;
    },

    /* ---------------------------------------------------------------- *
     * Zusammenführen — der Schutz gegen gegenseitiges Überschreiben
     * ---------------------------------------------------------------- */

    /*
     * Fügt den eigenen Stand in den fremden ein, statt ihn zu überschreiben.
     *
     * Warum das nötig ist: Geschrieben wird immer der GANZE Stand. Ohne
     * Zusammenführung verschwindet jeder, der sich anmeldet, während ein
     * anderes Gerät noch den alten Stand im Speicher hat — dessen nächster
     * Schreibvorgang löscht ihn wieder (der v0.8-Fehler des Quizz, siehe
     * docs\entscheidungen\erkenntnisse.md).
     *
     * Die Regel dagegen: **Jeder ist Herr über seinen eigenen Eintrag, alles
     * andere kommt vom Server.** Ausnahmen sind Aktionen, die absichtlich
     * fremde Einträge ändern (Spieler entfernen) — die schreiben ohne
     * Zusammenführung, siehe abgleich.js.
     */
    zusammenfuehren(fremd, eigen, eigeneId) {
        const fremdStand = SPIELER.normalisieren(fremd);
        const eigenStand = SPIELER.normalisieren(eigen);

        const meiner = eigenStand.spieler.find(
            (spieler) => spieler.id === eigeneId) || null;

        const ergebnis = SPIELER.leereDaten(eigenStand.geaendertAm);

        let selbstGefunden = false;

        for (const spieler of fremdStand.spieler) {
            if (meiner && spieler.id === eigeneId) {
                ergebnis.spieler.push(meiner);
                selbstGefunden = true;
            } else {
                ergebnis.spieler.push(spieler);
            }
        }

        /* Gerade erst angemeldet: den eigenen Eintrag anhängen. */
        if (meiner && !selbstGefunden) {
            ergebnis.spieler.push(meiner);
        }

        return ergebnis;
    },

    /* ---------------------------------------------------------------- *
     * Vergleich (steuert das Neuzeichnen beim gemeinsamen Speicher)
     * ---------------------------------------------------------------- */

    /* Vergleicht zwei Stände INHALTLICH (ohne Zeitstempel) — nur bei echten
       Unterschieden wird neu gezeichnet. */
    inhaltGleich(a, b) {
        const einsA = SPIELER.normalisieren(a);
        const einsB = SPIELER.normalisieren(b);

        if (einsA.spieler.length !== einsB.spieler.length) {
            return false;
        }

        for (let i = 0; i < einsA.spieler.length; i++) {
            const spielerA = einsA.spieler[i];
            const spielerB = einsB.spieler[i];

            if (spielerA.id !== spielerB.id
                || spielerA.name !== spielerB.name
                || spielerA.pinPruefwert !== spielerB.pinPruefwert
                || spielerA.pinSalz !== spielerB.pinSalz) {
                return false;
            }

            /* Auch die Freundes-Sicht (seit v0.11.0) — sonst zeichnet die
               App eine neue Anfrage nicht (Entwurf, Abschnitt 3.4). */
            if (spielerA.freunde.join("|") !== spielerB.freunde.join("|")
                || spielerA.abgelehnt.join("|") !== spielerB.abgelehnt.join("|")) {
                return false;
            }
        }

        return true;
    },

    /* ---------------------------------------------------------------- *
     * Freundschaft (seit v0.11.0, Bündel A Schritt 6)
     *
     * Jeder schreibt NUR seine eigene Sicht; die Beziehung zwischen zwei
     * Personen wird aus beiden Listen GELESEN (Begründung im Datenvertrag
     * oben). Die vier Lagen aus Sicht von `ichId`:
     *
     *     "freunde"   beide führen einander
     *     "gesendet"  ich führe ihn, er mich (noch) nicht — auch wenn er
     *                 mich abgelehnt hat: Das sieht für mich gleich aus
     *     "offen"     er führt mich, ich habe nicht abgelehnt — seine
     *                 Anfrage wartet auf meine Antwort
     *     "keine"     nichts von alledem (Fremde, oder ich habe abgelehnt)
     * ---------------------------------------------------------------- */

    freundschaft(daten, ichId, andererId) {
        if (!ichId || !andererId || ichId === andererId) {
            return "keine";
        }

        const stand = SPIELER.normalisieren(daten);
        const ich = stand.spieler.find((spieler) => spieler.id === ichId);
        const anderer = stand.spieler.find((spieler) => spieler.id === andererId);
        if (!ich || !anderer) {
            return "keine";
        }

        const ichFuehre = ich.freunde.indexOf(andererId) !== -1;
        const erFuehrt = anderer.freunde.indexOf(ichId) !== -1;

        if (ichFuehre && erFuehrt) {
            return "freunde";
        }
        if (ichFuehre) {
            return "gesendet";
        }
        if (erFuehrt && ich.abgelehnt.indexOf(andererId) === -1) {
            return "offen";
        }
        return "keine";
    },

    /* Die ganze Freundes-Sicht einer Person, fürs Zeichnen:
       { freunde, offen, gesendet } — jeweils Listen von Spieler-Objekten. */
    freundeVon(daten, ichId) {
        const stand = SPIELER.normalisieren(daten);
        const sicht = { freunde: [], offen: [], gesendet: [] };

        for (const anderer of stand.spieler) {
            const lage = SPIELER.freundschaft(stand, ichId, anderer.id);
            if (lage === "freunde") {
                sicht.freunde.push(anderer);
            } else if (lage === "offen") {
                sicht.offen.push(anderer);
            } else if (lage === "gesendet") {
                sicht.gesendet.push(anderer);
            }
        }

        return sicht;
    },

    /*
     * Anfrage stellen UND Anfrage annehmen sind dieselbe Handlung: sich
     * selbst den anderen in `freunde` eintragen. Eine eigene frühere
     * Ablehnung wird dabei aufgehoben — wer anfragt oder annimmt, meint es
     * ja jetzt anders.
     */
    freundHinzufuegen(daten, ichId, andererId, zeitpunkt) {
        const neu = SPIELER.kopieren(daten);
        for (const spieler of neu.spieler) {
            if (spieler.id === ichId && ichId !== andererId) {
                if (spieler.freunde.indexOf(andererId) === -1) {
                    spieler.freunde.push(andererId);
                }
                spieler.abgelehnt = spieler.abgelehnt.filter(
                    (eintrag) => eintrag !== andererId);
            }
        }
        neu.geaendertAm = (zeitpunkt === undefined) ? Date.now() : zeitpunkt;
        return neu;
    },

    /* Eine eigene Anfrage zurückziehen: nur aus `freunde` streichen —
       KEINE Ablehnung, die Gegenseite sieht die Anfrage einfach
       verschwinden. */
    freundStreichen(daten, ichId, andererId, zeitpunkt) {
        const neu = SPIELER.kopieren(daten);
        for (const spieler of neu.spieler) {
            if (spieler.id === ichId) {
                spieler.freunde = spieler.freunde.filter(
                    (eintrag) => eintrag !== andererId);
            }
        }
        neu.geaendertAm = (zeitpunkt === undefined) ? Date.now() : zeitpunkt;
        return neu;
    },

    /*
     * Ablehnen und „Freund entfernen" sind dieselbe Handlung: den anderen
     * in `abgelehnt` aufnehmen UND aus `freunde` streichen. Ohne das
     * Streichen sähe die Gegenseite die verbliebene einseitige Eintragung
     * als frische Anfrage (Entwurf, Abschnitt 3.4).
     */
    freundAblehnen(daten, ichId, andererId, zeitpunkt) {
        const neu = SPIELER.kopieren(daten);
        for (const spieler of neu.spieler) {
            if (spieler.id === ichId && ichId !== andererId) {
                spieler.freunde = spieler.freunde.filter(
                    (eintrag) => eintrag !== andererId);
                if (spieler.abgelehnt.indexOf(andererId) === -1) {
                    spieler.abgelehnt.push(andererId);
                }
            }
        }
        neu.geaendertAm = (zeitpunkt === undefined) ? Date.now() : zeitpunkt;
        return neu;
    }
};

/* Damit die Regressionstests die Datei außerhalb des Browsers laden können. */
if (typeof module !== "undefined" && module.exports) {
    module.exports = SPIELER;
}
