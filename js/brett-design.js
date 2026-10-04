/*
 * brett-design.js — die Designs des 2D-BRETTS als Sammlungs-Stücke (seit
 * v0.159.0).
 *
 * Nutzer 29.09.2026: „Es soll Brett designs für das 2d brett geben sowie
 * für das 3d … das 2d brett soll nicht 3d schatten haben wie bei 3d brett
 * sondern einfach 2d felder eine 2d palette". Vorlage der Paletten:
 * der Entwurf „Sammlung neu" (`BRETT_FARBEN`).
 *
 * Ein Design ist nur ein Farbpaar für helle und dunkle Felder. „Grau" ist
 * die Vorgabe (passend zum Grau-Start, EINBAU-2026-09-29c.md); „Farbwelt"
 * nimmt die Feldfarben der gewählten Farbwelt (--feld-hell/--feld-dunkel,
 * js\darstellung.js) — so sah das 2D-Brett bis v0.158.0 immer aus. Die
 * übrigen schalten der Turm (`TURM.FREI_AB.design2d`, dieselben Orte wie die
 * 3D-Themen) bzw. das Level frei (`FREISCHALTUNG.STUFE_AB.design2d`).
 *
 * Die Designs des 3D-BRETTS sind die Themen in js\brett-3d.js (`THEMEN`,
 * Regal „Brett-Design · 3D" in js\sammlung.js).
 *
 * WIE ES WIRKT: `anwenden()` setzt am body die Klasse `brett-design-eigen`
 * und die Platzhalter --brett2d-hell/--brett2d-dunkel; css\stil-effekte.css
 * gibt sie im 2D-Brett (`body.brett-2d`) an --feld-hell/--feld-dunkel
 * weiter. Beim Design „Farbwelt" fehlt die Klasse — dann gilt die Farbwelt.
 * Gespeichert wird nur auf diesem Gerät (wie das Thema des 3D-Bretts).
 */

const BRETT_DESIGN = {

    SCHLUESSEL: "blunderluck.brett-design",

    KLASSE: "brett-design-eigen",

    VORGABE: "grau",

    /* `ort` = Name des Orts für das Schloss (die Nummer steht in
       `TURM.FREI_AB.design2d`), `stufe` = Level. */
    DESIGNS: [
        { wert: "grau", name: "Grau", hell: "#dedede", dunkel: "#8e8e8e" },
        { wert: "farbwelt", name: "Farbwelt", hell: null, dunkel: null, stufe: 2 },
        { wert: "holz", name: "Holz", hell: "#ebd0a4", dunkel: "#a9713d", ort: "Holzhalle" },
        { wert: "marmor", name: "Marmor", hell: "#f1eee9", dunkel: "#9ba5af", ort: "Marmorsaal" },
        { wert: "nacht", name: "Nacht", hell: "#6a7496", dunkel: "#2e3550", ort: "Nachtclub" },
        { wert: "turnier", name: "Turnier", hell: "#eeeed2", dunkel: "#769656", ort: "Turniersaal" }
    ],

    eintrag(wert) {
        return BRETT_DESIGN.DESIGNS.find((d) => d.wert === wert) || null;
    },

    frei(wert) {
        if (!BRETT_DESIGN.eintrag(wert)) {
            return false;
        }
        /* Seit v0.163.0: der heutige Weg (Vorgabe, Level, Turm) ODER im Shop
           gekauft — `FREISCHALTUNG.brettStueckFrei` fragt den Besitz selbst
           (js\besitz.js, Art `brett2d`). */
        if (typeof FREISCHALTUNG === "undefined") {
            return wert === BRETT_DESIGN.VORGABE
                || (typeof BESITZ !== "undefined" && BESITZ.frei("design2d", wert));
        }
        return FREISCHALTUNG.brettStueckFrei("design2d", wert);
    },

    _lesen() {
        try {
            return localStorage.getItem(BRETT_DESIGN.SCHLUESSEL) || "";
        } catch (fehler) {
            return "";
        }
    },

    /* Was gilt: das Gewählte, wenn es (noch) frei ist, sonst die Vorgabe. */
    wahl() {
        const wert = BRETT_DESIGN._lesen();
        return (wert && BRETT_DESIGN.frei(wert)) ? wert : BRETT_DESIGN.VORGABE;
    },

    waehlen(wert) {
        if (!BRETT_DESIGN.frei(wert)) {
            return BRETT_DESIGN.wahl();
        }
        try {
            localStorage.setItem(BRETT_DESIGN.SCHLUESSEL, wert);
        } catch (fehler) {
            /* privates Fenster: dann bleibt es bei der Vorgabe */
        }
        BRETT_DESIGN.anwenden();
        return BRETT_DESIGN.wahl();
    },

    /* { hell, dunkel } — oder null bei „Farbwelt". */
    farben(wert) {
        const d = BRETT_DESIGN.eintrag(wert) || BRETT_DESIGN.eintrag(BRETT_DESIGN.VORGABE);
        return d.hell ? { hell: d.hell, dunkel: d.dunkel } : null;
    },

    /* Die Platzhalter an einem Element setzen (Vorschau der Sammlung zeigt
       den ENTWURF) oder am body (was gilt). */
    stilSetzen(el, wert) {
        if (!el || !el.style) {
            return;
        }
        const f = BRETT_DESIGN.farben(wert);
        if (f) {
            el.style.setProperty("--feld-hell", f.hell);
            el.style.setProperty("--feld-dunkel", f.dunkel);
        } else {
            /* „Farbwelt": die Feldfarben von aussen (in der Vorschau die
               Farbwelt des Entwurfs), auch wenn am body ein Design gilt. */
            el.style.setProperty("--feld-hell", "inherit");
            el.style.setProperty("--feld-dunkel", "inherit");
        }
    },

    anwenden() {
        if (typeof document === "undefined" || !document.body) {
            return;
        }
        const f = BRETT_DESIGN.farben(BRETT_DESIGN.wahl());
        document.body.classList.toggle(BRETT_DESIGN.KLASSE, !!f);
        if (f) {
            document.body.style.setProperty("--brett2d-hell", f.hell);
            document.body.style.setProperty("--brett2d-dunkel", f.dunkel);
        } else {
            document.body.style.removeProperty("--brett2d-hell");
            document.body.style.removeProperty("--brett2d-dunkel");
        }
    },

    /* Das kleine Bild im Regal: 3 × 3 flache Felder, ohne Schatten. */
    miniBild(wert) {
        const f = BRETT_DESIGN.farben(wert) || { hell: "var(--feld-hell)", dunkel: "var(--feld-dunkel)" };
        let felder = "";
        for (let i = 0; i < 9; i++) {
            const hell = (Math.floor(i / 3) + (i % 3)) % 2 === 0;
            felder += "<i style=\"background:" + (hell ? f.hell : f.dunkel) + "\"></i>";
        }
        return "<span class=\"sammlung-bild brett-design-bild\" aria-hidden=\"true\">" + felder + "</span>";
    }
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = BRETT_DESIGN;
}
