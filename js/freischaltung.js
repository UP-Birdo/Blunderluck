/*
 * freischaltung.js — was ein Spieler schon freigeschaltet hat (seit
 * v0.144.0, UPCrew-Angleichung Runde 3).
 *
 * EINE Stelle für alle Fragen „darf er das schon?" — der Tab „Sammlung"
 * (js\sammlung.js, bis v0.144 Tab „Anpassen"), das 3D-Brett (js\brett-3d.js) und der Partie-Bildschirm
 * (js\team-schach-brett.js) fragen nur hier, nie selbst.
 *
 *   stufe()       Seit v0.146.0 das LEVEL über alle UPCrew-Spiele
 *                 (js\fortschritt-konto.js; FORTSCHRITT.md: „Aussehen über
 *                 Level"). Ohne Fortschritt (Tests) 0 — nur der Standard
 *                 ist frei, alles andere zeigt der Tab als Vorschau.
 *   arena()       Seit v0.147.0 der ERREICHTE ORT im Turm (js\turm.js; 1 =
 *                 Werkbank, 2 = Holzhalle …). Ohne Turm (Tests) 0.
 *   brettStueckFrei(schluessel, wert)   Brett-Thema oder Figuren-Stil
 *                 frei? Die Vorgaben immer; die übrigen ab ihrem Ort
 *                 (`TURM.FREI_AB`), mit Admin-Freigabe oder in der
 *                 Werkstatt (seit v0.147.0).
 *   werkstatt()   Werkstatt-Modus: `?werkstatt` in der Adresse, NUR auf
 *                 dem eigenen Rechner (localhost/127.0.0.1) — im Netz kann
 *                 sich so niemand alles freischalten.
 *
 * DAS 3D-BRETT IST EINE FREISCHALTUNG (Nutzer 26.09.2026: „erst
 * 2D-Schach, 3D ab Arena 2, in Blunderluck selbst, kein Bestandsschutz"):
 *
 *   dreiDFrei()   Arena ≥ 2 ODER Werkstatt — solange SPERRE_3D an ist.
 *   brett()       "2d" | "oben" | "3d": was gerade gilt (seit v0.157.3
 *                 "oben" = 3D-Figuren auf dem 2D-Brett, Draufsicht). Gewähltes 3D zählt nur,
 *                 wenn es frei ist; ein gespeichertes an=true wird sonst
 *                 übergangen.
 *   brettDreiDFrei()  das 3D-BRETT (seit v0.157.4 ein eigenes Stück der
 *                 Sammlung): erst ab Marmorsaal (Ort 3, `TURM.FREI_AB.brettDreiD`)
 *                 oder Werkstatt. Die 3D-FIGUREN bleiben bei `dreiDFrei()`.
 *   brettSetzen(w)  merkt die Wahl (Gerätespeicher des 3D-Bretts,
 *                 `blunderluck.brett3d`, Feld `an`) und sagt es dem
 *                 3D-Brett, falls es schon geladen ist.
 *
 * SPERRE_3D IST SEIT v0.147.0 AN: Der Turm ist die Leiter, `arena()` liefert
 * den erreichten Ort, und 3D gibt es ab der Holzhalle (Ort 2, Runde 5: „3D
 * ab Holzhalle, ersetzt Arena 2"). Kein Bestandsschutz (Nutzer
 * 26.09.2026) — wer bisher 3D spielte, spielt 2D, bis er die Werkbank
 * geschafft hat. Von v0.144.0 bis v0.146 stand die Sperre aus, weil es die
 * Leiter noch nicht gab.
 */

const FREISCHALTUNG = {

    SPERRE_3D: true,

    DREI_D_AB_ARENA: 2,

    BRETT_SCHLUESSEL: "blunderluck.brett3d",

    stufe() {
        if (typeof FORTSCHRITT_KONTO === "undefined") {
            return 0;
        }
        return FORTSCHRITT_KONTO.level().level;
    },

    arena() {
        if (typeof FORTSCHRITT_KONTO === "undefined" || typeof TURM === "undefined") {
            return 0;
        }
        return FORTSCHRITT_KONTO.turmOrt();
    },

    /* Die Admin-Freigabe „Brett-Anpassung" (Verwaltung auf diesem Gerät
       UND der Schalter an) — dieselbe Frage wie `anpassungErlaubt` im
       3D-Brett. */
    adminAnpassung() {
        return typeof ICH !== "undefined" && typeof ICH.verwaltungAktiv === "function"
            && ICH.verwaltungAktiv() && typeof ICH.anpassungAn === "function" && ICH.anpassungAn();
    },

    brettStueckFrei(schluessel, wert) {
        const tabelle = (typeof TURM !== "undefined" && TURM.FREI_AB[schluessel]) || {};
        const ab = tabelle[wert];
        if (!ab) {
            return true;
        }
        return FREISCHALTUNG.arena() >= ab || FREISCHALTUNG.werkstatt() || FREISCHALTUNG.adminAnpassung();
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

    /* Seit v0.157.3 DREI Arten (Nutzer 29.09.2026): "3d" = 3D-Figuren auf
       dem 3D-Brett, "oben" = 3D-Figuren auf dem flachen 2D-Brett, senkrecht
       von oben gesehen (Feld `oben` im selben Gerätespeicher), "2d" = flache
       Figuren. "oben" zeigt die 3D-Figuren und hängt darum an derselben
       Freischaltung wie 3D (ab Holzhalle / Werkstatt). */
    ARTEN: ["2d", "oben", "3d"],

    /* Das 3D-Brett (v0.157.4, Nutzer 29.09.2026: „2d brett standard drin
       und an und 3d brett erst später"): ein Ort nach den 3D-Figuren. */
    BRETT_3D_AB_ARENA: 3,

    brettDreiDFrei() {
        if (!FREISCHALTUNG.SPERRE_3D) {
            return true;
        }
        const ab = (typeof TURM !== "undefined" && TURM.FREI_AB && TURM.FREI_AB.brettDreiD)
            || FREISCHALTUNG.BRETT_3D_AB_ARENA;
        return FREISCHALTUNG.arena() >= ab || FREISCHALTUNG.werkstatt();
    },

    /* Wer „3D" gewählt hat (an=true), das 3D-Brett aber noch nicht frei hat,
       behält seit v0.157.4 wenigstens die 3D-Figuren ("oben") — sinngemäss
       übernommen, bis das Brett frei ist. */
    brett() {
        if (!FREISCHALTUNG.dreiDFrei()) {
            return "2d";
        }
        const einst = FREISCHALTUNG._brettLesen();
        if (einst.an === true) {
            return FREISCHALTUNG.brettDreiDFrei() ? "3d" : "oben";
        }
        return einst.oben === true ? "oben" : "2d";
    },

    /* Die beiden Sammlungs-Stücke (seit v0.157.4) aus der einen Art:
       Brett 2d|3d, Figuren 2d|3d. 3D-Brett setzt 3D-Figuren voraus. */
    teile(art) {
        const wert = art || FREISCHALTUNG.brett();
        return { brett: wert === "3d" ? "3d" : "2d", figuren: wert === "2d" ? "2d" : "3d" };
    },

    /* Aus Brett- und Figuren-Wahl die Art. `zuletzt` sagt, welches Stück
       gerade gewählt wurde — es gewinnt: 3D-Brett zieht 3D-Figuren mit,
       2D-Figuren ziehen das 2D-Brett mit. */
    artAus(brett, figuren, zuletzt) {
        if (brett === "3d" && figuren === "3d") {
            return "3d";
        }
        if (brett === "3d") {
            return zuletzt === "figuren" ? "2d" : "3d";
        }
        return figuren === "3d" ? "oben" : "2d";
    },

    brettSetzen(wert) {
        const an = (wert === "3d") && FREISCHALTUNG.dreiDFrei() && FREISCHALTUNG.brettDreiDFrei();
        const oben = (wert === "oben") && FREISCHALTUNG.dreiDFrei();
        const einst = FREISCHALTUNG._brettLesen();
        einst.an = an;
        einst.oben = oben;
        try {
            localStorage.setItem(FREISCHALTUNG.BRETT_SCHLUESSEL, JSON.stringify(einst));
        } catch (fehler) {
            /* privates Fenster: dann gilt die Wahl nur, bis die Seite neu lädt */
        }
        if (typeof window !== "undefined" && window.BRETT_3D
                && typeof window.BRETT_3D.wahlUebernehmen === "function") {
            window.BRETT_3D.wahlUebernehmen(an, oben);
        }
        /* Echtes 2D (seit v0.151.3): flache Figuren an/aus. */
        if (typeof FIGUREN_FLACH !== "undefined") {
            FIGUREN_FLACH.anwenden();
        }
        return an ? "3d" : (oben ? "oben" : "2d");
    }
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = FREISCHALTUNG;
}
