/*
 * ich.js — was nur auf DIESEM Gerät liegt.
 *
 * Wer ich bin (Kennung und Name), ob die Verwaltung an diesem Gerät offen
 * ist, und welche Partie-Abschlüsse dieses Gerät schon gesehen hat. Kein
 * Konto, kein Passwort — die PIN-Prüfsummen liegen im gemeinsamen Stand
 * (spieler.js), nie hier.
 *
 * Alles hier ist bewusst ausfallsicher: Ist der Browser-Speicher gesperrt oder
 * kaputt, liefert jede Funktion einen leeren Wert und die App läuft weiter.
 */

const ICH = {

    SCHLUESSEL_PERSON: "blunderluck.ich",
    SCHLUESSEL_VERWALTUNG: "blunderluck.verwaltung",
    SCHLUESSEL_ABSCHLUSS: "blunderluck.abschluss-gesehen",

    /* ---------------------------------------------------------------- *
     * Wer bin ich
     * ---------------------------------------------------------------- */

    /* Liefert { id, name } oder null, wenn sich hier noch niemand gemeldet hat. */
    person() {
        const roh = ICH._lesen(ICH.SCHLUESSEL_PERSON);
        if (!roh || typeof roh.id !== "string" || roh.id === "") {
            return null;
        }
        return {
            id: roh.id,
            name: (typeof roh.name === "string") ? roh.name : ""
        };
    },

    personSetzen(id, name) {
        ICH._schreiben(ICH.SCHLUESSEL_PERSON, { id: id, name: name });
    },

    personVergessen() {
        ICH._loeschen(ICH.SCHLUESSEL_PERSON);
    },

    /* ---------------------------------------------------------------- *
     * Verwaltung
     *
     * Merkt sich auf DIESEM Gerät, dass das Verwaltungs-Passwort einmal richtig
     * eingegeben wurde. Es steht bewusst nur ein Schalter hier und nirgends das
     * Passwort — wer den Gerätespeicher liest, gewinnt nichts, was er nicht
     * ohnehin schon hätte.
     * ---------------------------------------------------------------- */

    verwaltungAktiv() {
        return ICH._lesen(ICH.SCHLUESSEL_VERWALTUNG) === true;
    },

    verwaltungSetzen(aktiv) {
        if (aktiv) {
            ICH._schreiben(ICH.SCHLUESSEL_VERWALTUNG, true);
        } else {
            ICH._loeschen(ICH.SCHLUESSEL_VERWALTUNG);
        }
    },

    /* ---------------------------------------------------------------- *
     * Gesehene Abschlüsse
     *
     * Welche beendeten Partien dieses Gerät schon abgeschlossen gesehen hat.
     * Das gehört hierher und nicht in den Arbeitsspeicher: Sonst käme der
     * Sieger-Bildschirm nach jedem Neuladen erneut — und in den gemeinsamen
     * Stand gehört es erst recht nicht, denn es ist eine Eigenschaft des
     * Geräts, nicht der Partie.
     * ---------------------------------------------------------------- */

    abschlussGesehen(partieId) {
        const liste = ICH._lesen(ICH.SCHLUESSEL_ABSCHLUSS);
        return Array.isArray(liste) && liste.indexOf(partieId) !== -1;
    },

    abschlussMerken(partieId) {
        if (!partieId) {
            return;
        }

        const liste = ICH._lesen(ICH.SCHLUESSEL_ABSCHLUSS);
        const neu = Array.isArray(liste) ? liste.slice() : [];

        if (neu.indexOf(partieId) !== -1) {
            return;
        }
        neu.push(partieId);

        /* Nicht endlos wachsen lassen — die ältesten fallen hinten weg. */
        while (neu.length > 100) {
            neu.shift();
        }

        ICH._schreiben(ICH.SCHLUESSEL_ABSCHLUSS, neu);
    },

    /* ---------------------------------------------------------------- *
     * Innereien
     * ---------------------------------------------------------------- */

    _lesen(schluessel) {
        try {
            const text = window.localStorage.getItem(schluessel);
            return text ? JSON.parse(text) : null;
        } catch (fehler) {
            console.warn("Gerätespeicher nicht lesbar:", fehler);
            return null;
        }
    },

    _schreiben(schluessel, wert) {
        try {
            window.localStorage.setItem(schluessel, JSON.stringify(wert));
        } catch (fehler) {
            console.warn("Gerätespeicher nicht beschreibbar:", fehler);
        }
    },

    _loeschen(schluessel) {
        try {
            window.localStorage.removeItem(schluessel);
        } catch (fehler) {
            console.warn("Gerätespeicher nicht änderbar:", fehler);
        }
    }
};
