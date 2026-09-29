/*
 * aussehen-konto.js — das gemeinsame UPCrew-Aussehen wandert mit dem Konto
 * (seit v0.144.0, UPCrew-Angleichung Runde 3, Absprache „Konto-Abgleich").
 *
 * Im selben Browser ziehen Blunderluck und Typoluck schon über den
 * Browser-Speicher mit (js\upcrew-aussehen.js). Auf ANDEREN Geräten — und
 * bei iPhone-Apps vom Home-Bildschirm, die jede ihren eigenen Speicher
 * haben — geht es nur über das Konto:
 *
 *   insKonto()   nach jeder EIGENEN Änderung (Einstellungen, Tab
 *                „Anpassen"): `UPCREW_AUSSEHEN.fuerKonto()` als Feld
 *                `aussehen` an den eigenen Eintrag. Er liegt unter
 *                `spieler/konten/<uid>` und wird wie jede andere Änderung
 *                am eigenen Eintrag über den Spieler-Abgleich geschrieben
 *                (`ANMELDUNG.abgleich.aendern`) — derselbe Weg wie Freunde
 *                und Abzeichen, kein zweiter Schreibweg daneben.
 *   vomKonto()   nach JEDEM geholten Stand (Start, Rückkehr in den
 *                Vordergrund, regelmäßige Abfrage — app.js `beiDaten`):
 *                das Feld an `UPCREW_AUSSEHEN.uebernehmen()`. Der Baustein
 *                übernimmt nur, wenn die Wahl am Konto NEUER ist (`stand`).
 *
 * Gäste und Nicht-Angemeldete: nur der Browser-Speicher (Absprache).
 * Änderungen aus der anderen App oder vom Konto selbst werden NICHT
 * zurückgeschrieben — das tut die App, in der umgestellt wurde.
 *
 * SEIT v0.151.17 JE SPIEL (Nutzer 27.09.2026: „wenn man auf Übernehmen
 * drückt, soll sich nur das Spiel ändern"): Ist `UPCREW_AUSSEHEN.GETEILT`
 * false (Standard), gehört das Aussehen je Spiel ans Konto —
 * `konten/<uid>/aussehenJe/blunderluck` (Regel SICHERHEIT.md §11c, vom
 * Nutzer eingespielt am 28.09.2026; seit v0.152.5 `AUSSEHEN_JE_AM_KONTO =
 * true`). Mit dem Schalter aus schreibt Blunderluck dorthin NICHTS — das
 * Aussehen bleibt dann auf dem Gerät.
 * Das alte Feld `aussehen` wird nicht mehr geschrieben, aber gelesen: Fehlt
 * `aussehenJe/blunderluck`, dient es als Umzug (gilt, wenn es neuer ist).
 * Ist GETEILT true, läuft alles wie vor v0.151.17 über `aussehen`.
 *
 * Schlägt das Schreiben fehl (etwa weil die vorgeschlagene Regel in
 * SICHERHEIT.md §11 noch nicht eingespielt ist und eine strengere es
 * ablehnt), läuft es wie jeder andere Fehler des Spieler-Abgleichs: Die
 * Verbindungs-Anzeige meldet es, sonst passiert nichts.
 */

const AUSSEHEN_KONTO = {

    /* Schreibt Blunderluck sein Aussehen je Spiel ans Konto? An seit
       v0.152.5: Der Nutzer hat Regel §11c (SICHERHEIT.md) am 28.09.2026
       eingespielt. */
    AUSSEHEN_JE_AM_KONTO: true,

    APP: "blunderluck",

    _geteilt() {
        return typeof UPCREW_AUSSEHEN !== "undefined" && UPCREW_AUSSEHEN.GETEILT !== false;
    },

    /* Der eigene Eintrag — nur mit echtem Konto, nie als Gast. */
    _eigener() {
        if (typeof ANMELDUNG === "undefined" || !ANMELDUNG.abgleich
                || typeof ANMELDUNG.ich !== "function") {
            return null;
        }
        const eintrag = ANMELDUNG.ich();
        if (!eintrag || eintrag.gast === true) {
            return null;
        }
        return eintrag;
    },

    insKonto() {
        if (typeof UPCREW_AUSSEHEN === "undefined") {
            return;
        }
        const eintrag = AUSSEHEN_KONTO._eigener();
        if (!eintrag) {
            return;
        }
        let neu;
        let feld;
        if (AUSSEHEN_KONTO._geteilt()) {
            neu = SPIELER.aussehenSetzen(ANMELDUNG.abgleich.daten, eintrag.id,
                UPCREW_AUSSEHEN.fuerKonto());
            feld = (e) => e.aussehen;
        } else {
            if (!AUSSEHEN_KONTO.AUSSEHEN_JE_AM_KONTO) {
                return;
            }
            neu = SPIELER.aussehenJeSetzen(ANMELDUNG.abgleich.daten, eintrag.id,
                AUSSEHEN_KONTO.APP, UPCREW_AUSSEHEN.fuerKonto());
            feld = (e) => (e.aussehenJe || {})[AUSSEHEN_KONTO.APP];
        }
        const vorher = JSON.stringify(feld(eintrag) || null);
        const nachher = JSON.stringify(feld(SPIELER.spielerFinden(neu, eintrag.id)) || null);
        if (vorher === nachher) {
            return;
        }
        ANMELDUNG.abgleich.aendern(neu, false);
    },

    vomKonto() {
        if (typeof UPCREW_AUSSEHEN === "undefined") {
            return;
        }
        const eintrag = AUSSEHEN_KONTO._eigener();
        if (!eintrag) {
            return;
        }
        if (AUSSEHEN_KONTO._geteilt()) {
            if (eintrag.aussehen) {
                UPCREW_AUSSEHEN.uebernehmen(eintrag.aussehen);
            }
            AUSSEHEN_KONTO._umstellungInsKonto(eintrag.aussehen || null);
            return;
        }
        /* Je Spiel: der eigene Zweig; fehlt er, das alte gemeinsame Feld als
           EINMALIGER Umzug (der Baustein nimmt es nur, wenn es neuer ist).
           Danach nie wieder — sonst zöge eine Änderung in einem Typoluck,
           das noch gemeinsam schreibt, über das Konto doch wieder mit. */
        const eigenes = eintrag.aussehenJe && eintrag.aussehenJe[AUSSEHEN_KONTO.APP];
        if (eigenes) {
            UPCREW_AUSSEHEN.uebernehmen(eigenes);
        } else if (eintrag.aussehen && !AUSSEHEN_KONTO._umzugGemacht()) {
            UPCREW_AUSSEHEN.uebernehmen(eintrag.aussehen);
            AUSSEHEN_KONTO._umzugMerken();
        }
        AUSSEHEN_KONTO._umstellungInsKonto(eigenes || null);
    },

    /*
     * EINMALIGE UMSTELLUNG AUF GRAU (seit v0.159.0, EINBAU-2026-09-29c.md
     * Schritt 2): Trägt das Konto-Objekt den Merker `umstellung` noch nicht
     * (`UPCREW_AUSSEHEN.kontoBraucht`), schreibt Blunderluck EINMAL
     * `fuerKonto()` ans Konto — auch wenn `uebernehmen` nichts übernommen
     * hat. Höchstens einmal je Seitenaufruf: Solange die Regel mit Grau
     * nicht eingespielt ist (`SpeicherKonten.REGEL_GRAU_EINGESPIELT` in
     * js\speicher.js), lässt die Schreib-Schleuse `grau` und `umstellung`
     * weg — das Konto bekäme den Merker nie, und jede Abfrage schriebe sonst
     * erneut. Gäste: `_eigener()` liefert null, es wird nichts geschrieben.
     */
    _umstellungGeschrieben: false,

    _umstellungInsKonto(vomKonto) {
        if (AUSSEHEN_KONTO._umstellungGeschrieben || typeof UPCREW_AUSSEHEN.kontoBraucht !== "function") {
            return false;
        }
        if (!UPCREW_AUSSEHEN.kontoBraucht(vomKonto)) {
            return false;
        }
        AUSSEHEN_KONTO._umstellungGeschrieben = true;
        AUSSEHEN_KONTO.insKonto();
        return true;
    },

    UMZUG_SCHLUESSEL: "blunderluck.aussehen-umzug",

    _umzugGemacht() {
        try {
            return window.localStorage.getItem(AUSSEHEN_KONTO.UMZUG_SCHLUESSEL) === "1";
        } catch (fehler) {
            return false;
        }
    },

    _umzugMerken() {
        try {
            window.localStorage.setItem(AUSSEHEN_KONTO.UMZUG_SCHLUESSEL, "1");
        } catch (fehler) {
            /* Gesperrter Speicher: dann eben beim nächsten Start noch einmal. */
        }
    },

    starten() {
        if (typeof DARSTELLUNG === "undefined") {
            return;
        }
        DARSTELLUNG.beiAenderung((aussehen, quelle) => {
            if (quelle === "selbst") {
                AUSSEHEN_KONTO.insKonto();
            }
        });
    }
};

if (typeof document !== "undefined") {
    AUSSEHEN_KONTO.starten();
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = AUSSEHEN_KONTO;
}
