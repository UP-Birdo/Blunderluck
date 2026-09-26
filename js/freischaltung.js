/*
 * freischaltung.js — was ein Spieler schon freigeschaltet hat (seit
 * v0.144.0, UPCrew-Angleichung Runde 3).
 *
 * EINE Stelle für alle Fragen „darf er das schon?" — der Tab „Anpassen"
 * (js\anpassen.js), das 3D-Brett (js\brett-3d.js) und der Partie-Bildschirm
 * (js\team-schach-brett.js) fragen nur hier, nie selbst.
 *
 *   stufe()       Stufe im gemeinsamen Herausforderungs-Pfad beider Spiele.
 *                 Den Pfad gibt es noch nicht → immer 0 (nur der Standard
 *                 ist frei, alles andere zeigt der Tab als Vorschau).
 *   arena()       Arena in der Blunderluck-Leiter. Die Leiter gibt es noch
 *                 nicht → immer 0.
 *   werkstatt()   Werkstatt-Modus: `?werkstatt` in der Adresse, NUR auf
 *                 dem eigenen Rechner (localhost/127.0.0.1) — im Netz kann
 *                 sich so niemand alles freischalten.
 *
 * DAS 3D-BRETT IST EINE FREISCHALTUNG (Nutzer 26.09.2026: „erst
 * 2D-Schach, 3D ab Arena 2, in Blunderluck selbst, kein Bestandsschutz"):
 *
 *   dreiDFrei()   Arena ≥ 2 ODER Werkstatt — solange SPERRE_3D an ist.
 *   brett()       "2d" | "3d": was gerade gilt. Gewähltes 3D zählt nur,
 *                 wenn es frei ist; ein gespeichertes an=true wird sonst
 *                 übergangen.
 *   brettSetzen(w)  merkt die Wahl (Gerätespeicher des 3D-Bretts,
 *                 `blunderluck.brett3d`, Feld `an`) und sagt es dem
 *                 3D-Brett, falls es schon geladen ist.
 *
 * SPERRE_3D IST AUS — mit Absicht: Die Arena-Leiter gibt es noch nicht;
 * schaltete man die Sperre heute scharf, hätte niemand mehr 3D. Scharf
 * geschaltet wird sie im selben Zug, in dem die Leiter live geht (und
 * `arena()` die echte Arena liefert). Bis dahin ist 3D für alle frei, aber
 * nicht mehr die Vorgabe: Wer nichts gewählt hat, spielt 2D.
 */

const FREISCHALTUNG = {

    SPERRE_3D: false,

    DREI_D_AB_ARENA: 2,

    BRETT_SCHLUESSEL: "blunderluck.brett3d",

    stufe() {
        return 0;
    },

    arena() {
        return 0;
    },

    werkstatt() {
        if (typeof location === "undefined") {
            return false;
        }
        const eigenerRechner = location.hostname === "localhost" || location.hostname === "127.0.0.1";
        return eigenerRechner && /[?&]werkstatt(=|&|$)/.test(location.search || "");
    },

    dreiDFrei() {
        if (!FREISCHALTUNG.SPERRE_3D) {
            return true;
        }
        return FREISCHALTUNG.arena() >= FREISCHALTUNG.DREI_D_AB_ARENA || FREISCHALTUNG.werkstatt();
    },

    /* Die gespeicherten Brett-Einstellungen (gehören dem 3D-Brett). */
    _brettLesen() {
        try {
            const roh = JSON.parse(localStorage.getItem(FREISCHALTUNG.BRETT_SCHLUESSEL) || "{}");
            return (roh && typeof roh === "object") ? roh : {};
        } catch (fehler) {
            return {};
        }
    },

    brett() {
        return (FREISCHALTUNG._brettLesen().an === true && FREISCHALTUNG.dreiDFrei()) ? "3d" : "2d";
    },

    brettSetzen(wert) {
        const an = (wert === "3d") && FREISCHALTUNG.dreiDFrei();
        const einst = FREISCHALTUNG._brettLesen();
        einst.an = an;
        try {
            localStorage.setItem(FREISCHALTUNG.BRETT_SCHLUESSEL, JSON.stringify(einst));
        } catch (fehler) {
            /* privates Fenster: dann gilt die Wahl nur, bis die Seite neu lädt */
        }
        if (typeof window !== "undefined" && window.BRETT_3D
                && typeof window.BRETT_3D.wahlUebernehmen === "function") {
            window.BRETT_3D.wahlUebernehmen(an);
        }
        return an ? "3d" : "2d";
    }
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = FREISCHALTUNG;
}
