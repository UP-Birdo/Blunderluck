/*
 * intro.js — das UPCrew-Studio-Intro beim Start: der Anpasser für Blunderluck.
 *
 * UPCrew ist das Studio hinter allen Spielen. Beim Öffnen erscheint kurz
 * das Studio-Zeichen, dann das Spiel — in JEDER UPCrew-App gleich (Nutzer-
 * Ansage 25.09.2026: „beide Apps gleich").
 *
 * SEIT v0.140.3 STECKT DAS INTRO SELBST IN js\upcrew-intro.js (+ css\upcrew-
 * intro.css) — dem gemeinsamen Baustein aller UPCrew-Apps. Quelle ist
 * dev\Design\3D-Schrift\final\; dort wird er geändert und in die Apps
 * KOPIERT, hier nie abgewandelt (Schnittstelle und Regeln:
 * Design\3D-Schrift\docs\EINBAU-INTRO.md). Diese Datei sagt ihm nur, was
 * nur Blunderluck weiss: hell oder dunkel, Nummer, Name und Version der App.
 * Vorlage war Apps\Typoluck\js\intro.js (0.6.1).
 *
 * Die Regeln (Nutzer-Entscheidung 25.09.2026):
 *   - bei JEDEM Start (die Sperre „einmal je Besuch" ist weg);
 *   - jeder Start zeigt die nächste von sechs Arten (Zähler im Baustein,
 *     gemeinsam mit den anderen UPCrew-Apps);
 *   - ein Tipp oder eine Taste überspringt es sofort;
 *   - die App lädt darunter weiter — das Intro hält nichts auf.
 */

const INTRO = {

    /* Nummer und Name im Studio (Blunderluck 01, Typoluck 02, Trainer 03). */
    APP_NR: "01",
    APP_NAME: "Blunderluck",

    /* Hell oder dunkel — Blunderluck hat keinen eigenen Schalter und folgt
       nur dem Gerät (wie css\stil.css und das 3D-Brett). */
    modus() {
        const geraetDunkel = !!(window.matchMedia
            && window.matchMedia("(prefers-color-scheme: dark)").matches);
        return geraetDunkel ? "dunkel" : "hell";
    },

    /* Zeigt das Intro im Behälter und liefert ein Versprechen, das nach dem
       Ausblenden erfüllt ist (mit { art, welt, modus } oder null). */
    zeigen(behaelter) {
        if (!behaelter || typeof UPCREW_INTRO === "undefined") {
            return Promise.resolve(null);
        }
        return UPCREW_INTRO.zeigen(behaelter, {
            modus: INTRO.modus(),
            app: { nr: INTRO.APP_NR, name: INTRO.APP_NAME, version: KONFIG.APP_VERSION }
        });
    }
};
