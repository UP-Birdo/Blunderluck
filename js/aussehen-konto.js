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
 * Schlägt das Schreiben fehl (etwa weil die vorgeschlagene Regel in
 * SICHERHEIT.md §11 noch nicht eingespielt ist und eine strengere es
 * ablehnt), läuft es wie jeder andere Fehler des Spieler-Abgleichs: Die
 * Verbindungs-Anzeige meldet es, sonst passiert nichts.
 */

const AUSSEHEN_KONTO = {

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
        const neu = SPIELER.aussehenSetzen(ANMELDUNG.abgleich.daten, eintrag.id,
            UPCREW_AUSSEHEN.fuerKonto());
        const vorher = JSON.stringify(eintrag.aussehen || null);
        const nachher = JSON.stringify(SPIELER.spielerFinden(neu, eintrag.id).aussehen);
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
        if (eintrag && eintrag.aussehen) {
            UPCREW_AUSSEHEN.uebernehmen(eintrag.aussehen);
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
