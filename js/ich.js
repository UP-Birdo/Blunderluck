/*
 * ich.js — was nur auf DIESEM Gerät liegt.
 *
 * Wer ich bin (Kennung und Name), ob die Brett-Anpassung an ist, und
 * welche Partie-Abschlüsse dieses Gerät schon gesehen hat. Kein
 * Konto, kein Passwort — die PIN-Prüfsummen liegen im gemeinsamen Stand
 * (spieler.js), nie hier.
 *
 * Alles hier ist bewusst ausfallsicher: Ist der Browser-Speicher gesperrt oder
 * kaputt, liefert jede Funktion einen leeren Wert und die App läuft weiter.
 */

const ICH = {

    SCHLUESSEL_PERSON: "blunderluck.ich",
    SCHLUESSEL_ANPASSUNG: "blunderluck.anpassung",
    SCHLUESSEL_ABSCHLUSS: "blunderluck.abschluss-gesehen",
    SCHLUESSEL_VIBRATION: "blunderluck.vibration",
    SCHLUESSEL_DARSTELLUNG: "blunderluck.darstellung",

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
     * Ob die Verwaltung offen ist, entscheidet allein die ROLLE des
     * angemeldeten UPCrew-Kontos (Admin oder UP#Plus) — die Regeln der
     * Datenbank prüfen dieselbe Rolle. Ohne Konto gibt es keine Verwaltung.
     * Bis v0.172.0 gab es daneben einen Schalter auf dem Gerät
     * („blunderluck.verwaltung“, Altweg ohne Konto) — seit v0.173.0 weg.
     * ---------------------------------------------------------------- */

    verwaltungAktiv() {
        return KONTO.aktiv() && typeof ANMELDUNG !== "undefined"
            && typeof ANMELDUNG.istAdmin === "function" && ANMELDUNG.istAdmin() === true;
    },

    /*
     * Der Schalter „Brett-Anpassung" aus der Verwaltung:
     * Nur wenn er an ist, zeigt das 3D-Brett dem Admin den Paletten-Knopf.
     * Er gilt nur auf diesem Gerät.
     */
    anpassungAn() {
        return ICH._lesen(ICH.SCHLUESSEL_ANPASSUNG) === true;
    },

    anpassungSetzen(an) {
        if (an) {
            ICH._schreiben(ICH.SCHLUESSEL_ANPASSUNG, true);
        } else {
            ICH._loeschen(ICH.SCHLUESSEL_ANPASSUNG);
        }
    },

    /*
     * Der Schalter „Vibration" (seit v0.140.0, UPCrew-Standard): ab Werk AN.
     * Gespeichert wird deshalb nur das Abschalten — ein Gerät, das nie
     * etwas gesetzt hat, vibriert.
     */
    vibrationAn() {
        return ICH._lesen(ICH.SCHLUESSEL_VIBRATION) !== false;
    },

    vibrationSetzen(an) {
        if (an) {
            ICH._loeschen(ICH.SCHLUESSEL_VIBRATION);
        } else {
            ICH._schreiben(ICH.SCHLUESSEL_VIBRATION, false);
        }
    },

    /*
     * Die Darstellung (seit v0.141.0, wie Typoluck): "geraet", "hell" oder
     * "dunkel". Ab Werk wie das Gerät — gespeichert wird deshalb nur eine
     * feste Wahl. Was sie bewirkt, steht in js\darstellung.js.
     *
     * SEIT v0.144.0 NUR NOCH ALTBESTAND: Die Darstellung steht im
     * gemeinsamen UPCrew-Aussehen (js\upcrew-aussehen.js). darstellung.js
     * liest diesen Wert genau einmal, um ihn per `migrieren` zu übergeben;
     * geschrieben wird er nicht mehr. Die Funktionen bleiben (additiver
     * Datenvertrag).
     */
    darstellung() {
        const wert = ICH._lesen(ICH.SCHLUESSEL_DARSTELLUNG);
        return (wert === "hell" || wert === "dunkel") ? wert : "geraet";
    },

    darstellungSetzen(wert) {
        if (wert === "hell" || wert === "dunkel") {
            ICH._schreiben(ICH.SCHLUESSEL_DARSTELLUNG, wert);
        } else {
            ICH._loeschen(ICH.SCHLUESSEL_DARSTELLUNG);
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
