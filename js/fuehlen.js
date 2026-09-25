/*
 * fuehlen.js — das Anfass-Gefühl: Vibration beim Antippen, bei Erfolg und
 * bei Fehlern (UPCrew-Standard, Abschnitt 5, seit v0.140.0).
 *
 * Nutzer 25.09.2026: Vibration „beim Tasten drücken und allem", Töne nein.
 * EIN Baustein, damit jede Stelle dasselbe Muster benutzt — dieselben
 * Muster wie in Typoluck (`Apps\Typoluck\js\fuehlen.js`), damit sich beide
 * UPCrew-Spiele gleich anfühlen:
 *
 *     FUEHLEN.tippen()   ganz kurz — jeder Knopf, jedes Feld (von selbst,
 *                        siehe `einrichten`)
 *     FUEHLEN.erfolg()   Partie gewonnen, Konto fertig
 *     FUEHLEN.fehler()   Senden gescheitert, Passwort falsch, verloren
 *
 * Ab Werk AN; abschaltbar in den Einstellungen, Karte „Gerät" (Schalter in
 * js\ich.js, gilt nur auf diesem Gerät). Wo es keine Vibration gibt, tut
 * der Baustein still nichts.
 *
 * DAS IPHONE VIBRIERT FÜR WEB-APPS NICHT: `navigator.vibrate` fehlt in
 * Safari. Auf Android geht es. Der Umweg über einen Schalter-Knopf
 * (`<input type="checkbox" switch>`, Safari ab 17.4) ist bewusst NICHT
 * gebaut — der Standard verlangt, ihn erst auf dem iPhone des Nutzers zu
 * messen, und diese Messung gehört Typoluck. `verfuegbar()` sagt den
 * Einstellungen, ob der Schalter hier überhaupt etwas bewirkt.
 */

const FUEHLEN = {

    /* Die Muster in Millisekunden: vibrieren, Pause, vibrieren … */
    MUSTER: {
        tippen: 8,
        erfolg: [20, 60, 20, 60, 60],
        fehler: [70, 50, 70]
    },

    /*
     * Was als „angetippt" zählt. Bewusst NICHT das 3D-Brett (`canvas`):
     * Dort wird auch gedreht und gewischt, und jedes Berühren zu spüren
     * wäre Lärm statt Rückmeldung.
     */
    ANTIPPBAR: "button, a[href], input, select, summary, label, [role=button], [role=tab]",

    /* Die Vibrations-Schnittstelle des Geräts. Die Tests setzen einen Ersatz. */
    _navigator() {
        return (typeof navigator !== "undefined") ? navigator : null;
    },

    verfuegbar() {
        const nav = FUEHLEN._navigator();
        return !!nav && typeof nav.vibrate === "function";
    },

    an() {
        return (typeof ICH === "undefined") || ICH.vibrationAn();
    },

    anSetzen(wert) {
        ICH.vibrationSetzen(wert === true);
    },

    tippen() {
        return FUEHLEN._vibrieren(FUEHLEN.MUSTER.tippen);
    },

    erfolg() {
        return FUEHLEN._vibrieren(FUEHLEN.MUSTER.erfolg);
    },

    fehler() {
        return FUEHLEN._vibrieren(FUEHLEN.MUSTER.fehler);
    },

    /*
     * Einmal beim Start (app.js): EIN Zuhörer für die ganze Seite statt
     * einer Zeile in jedem Knopf. Blunderluck baut seine Knöpfe an vielen
     * Stellen selbst — so bekommt jeder neue Knopf das Gefühl von allein.
     * `pointerdown` statt `click`: Man spürt den Druck, nicht das Loslassen.
     * Gesperrte Knöpfe vibrieren nicht (sie tun ja nichts).
     */
    einrichten(dokument) {
        if (!dokument || typeof dokument.addEventListener !== "function") {
            return;
        }
        dokument.addEventListener("pointerdown", (ereignis) => {
            const ziel = ereignis.target;
            if (!ziel || typeof ziel.closest !== "function") {
                return;
            }
            const element = ziel.closest(FUEHLEN.ANTIPPBAR);
            if (element && !element.disabled) {
                FUEHLEN.tippen();
            }
        }, { passive: true });
    },

    /* Liefert, ob vibriert wurde — für die Tests. Wirft nie: Manche Browser
       werfen, wenn die Seite noch nicht angetippt wurde. */
    _vibrieren(muster) {
        if (!FUEHLEN.an() || !FUEHLEN.verfuegbar()) {
            return false;
        }
        try {
            return FUEHLEN._navigator().vibrate(muster) !== false;
        } catch (fehler) {
            return false;
        }
    }
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = FUEHLEN;
}
