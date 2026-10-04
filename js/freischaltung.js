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
 *   brettStueckFrei(schluessel, wert)   Brett-Thema, Figuren-Stil oder
 *                 (seit v0.159.0) Brett-Design 2D frei? Die Vorgaben immer;
 *                 die übrigen ab ihrem Ort (`TURM.FREI_AB`) bzw. Level
 *                 (`STUFE_AB`), mit Admin-Freigabe oder in der Werkstatt —
 *                 und seit v0.163.0 ODER im Shop gekauft (`gekauft`,
 *                 js\besitz.js). Der erspielte Weg ist unverändert.
 *   werkstatt()   Werkstatt-Modus: `?werkstatt` in der Adresse, NUR auf
 *                 dem eigenen Rechner (localhost/127.0.0.1) — im Netz kann
 *                 sich so niemand alles freischalten.
 *
 * BRETT UND FIGUREN SIND ZWEI FREISCHALTUNGEN (Nutzer 26.09.2026: „erst
 * 2D-Schach, 3D in Blunderluck selbst, kein Bestandsschutz"; seit v0.159.0
 * in DIESER Reihenfolge, Nutzer 29.09.2026: „alles bei blunder luck 2d
 * beginnen · später erst 3d brett dann figuren"):
 *
 *   brettDreiDFrei()  das 3D-BRETT: ab HOLZHALLE (Ort 2,
 *                 `TURM.FREI_AB.brettDreiD`) oder Werkstatt.
 *   dreiDFrei()   die 3D-FIGUREN: ab MARMORSAAL (Ort 3, `TURM.FREI_AB.dreiD`)
 *                 oder Werkstatt. Bis v0.158.0 genau umgekehrt.
 *   brett()       was gerade gilt — vier Arten:
 *                   "2d"       2D-Brett, 2D-Figuren (Vorgabe, neue Spieler)
 *                   "scheiben" 3D-Brett, 2D-Figuren als flache Scheiben
 *                              (seit v0.159.0, js\brett-3d.js)
 *                   "oben"     2D-Brett, 3D-Figuren leicht geneigt (v0.157.3)
 *                   "3d"       3D-Brett, 3D-Figuren
 *                 Gewähltes zählt nur, soweit es frei ist; sonst gilt der
 *                 freie Teil (3D-Brett ohne 3D-Figuren = "scheiben").
 *   teile(art) / artAus(brett, figuren)   Art ⇄ zwei Sammlungs-Stücke.
 *   brettSetzen(w)  merkt die Wahl (Gerätespeicher des 3D-Bretts,
 *                 `blunderluck.brett3d`, Felder `an`, `oben`, `scheiben`)
 *                 und sagt es dem 3D-Brett, falls es schon geladen ist.
 *
 * SPERRE_3D IST SEIT v0.147.0 AN: Der Turm ist die Leiter, `arena()` liefert
 * den erreichten Ort. Kein Bestandsschutz (Nutzer 26.09. und 29.09.2026) —
 * wer bisher 3D-Figuren ab Holzhalle hatte, hat sie ab v0.159.0 erst im
 * Marmorsaal wieder; sein 3D-Brett (falls gewählt) bleibt, mit Scheiben.
 */

const FREISCHALTUNG = {

    SPERRE_3D: true,

    /* Rückfälle ohne js\turm.js (die Werte stehen in `TURM.FREI_AB`). */
    DREI_D_AB_ARENA: 3,
    BRETT_3D_AB_ARENA: 2,

    BRETT_SCHLUESSEL: "blunderluck.brett3d",

    /* Was am LEVEL hängt statt am Ort (seit v0.159.0): das Brett-Design
       „Farbwelt" im 2D-Brett, zugleich mit der ersten Farbwelt nach Grau
       (Werkstatt, Level 2 — `UPCREW_ANPASSEN.STUFEN.farbwelt`). */
    STUFE_AB: {
        design2d: { farbwelt: 2 }
    },

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
        if (FREISCHALTUNG.werkstatt() || FREISCHALTUNG.adminAnpassung()) {
            return true;
        }
        /* Seit v0.163.0: der heutige Weg (Level, Turm — unverändert) ODER
           im Shop gekauft (js\besitz.js). */
        return FREISCHALTUNG.erspielt(schluessel, wert) || FREISCHALTUNG.gekauft(schluessel, wert);
    },

    /* Der heutige Weg: Level (`STUFE_AB`) bzw. Ort im Turm (`TURM.FREI_AB`). */
    erspielt(schluessel, wert) {
        const stufen = FREISCHALTUNG.STUFE_AB[schluessel] || {};
        if (stufen[wert]) {
            return FREISCHALTUNG.stufe() >= stufen[wert];
        }
        const tabelle = (typeof TURM !== "undefined" && TURM.FREI_AB[schluessel]) || {};
        const ab = tabelle[wert];
        if (!ab) {
            return true;
        }
        return FREISCHALTUNG.arena() >= ab;
    },

    /* Im Shop gekauft (seit v0.163.0)? `schluessel` ist der des Regals
       (`design2d`, `thema`, `figuren`); ohne js\besitz.js (Tests) nie. */
    gekauft(schluessel, wert) {
        return typeof BESITZ !== "undefined" && BESITZ.frei(schluessel, wert);
    },

    werkstatt() {
        if (typeof location === "undefined") {
            return false;
        }
        const eigenerRechner = location.hostname === "localhost" || location.hostname === "127.0.0.1";
        return eigenerRechner && /[?&]werkstatt(=|&|$)/.test(location.search || "");
    },

    _ab(schluessel, rueckfall) {
        return (typeof TURM !== "undefined" && TURM.FREI_AB && TURM.FREI_AB[schluessel]) || rueckfall;
    },

    /* Die 3D-FIGUREN (seit v0.159.0 ab Marmorsaal). */
    dreiDFrei() {
        if (!FREISCHALTUNG.SPERRE_3D) {
            return true;
        }
        return FREISCHALTUNG.arena() >= FREISCHALTUNG._ab("dreiD", FREISCHALTUNG.DREI_D_AB_ARENA)
            || FREISCHALTUNG.werkstatt();
    },

    /* Das 3D-BRETT (seit v0.159.0 ab Holzhalle). */
    brettDreiDFrei() {
        if (!FREISCHALTUNG.SPERRE_3D) {
            return true;
        }
        return FREISCHALTUNG.arena() >= FREISCHALTUNG._ab("brettDreiD", FREISCHALTUNG.BRETT_3D_AB_ARENA)
            || FREISCHALTUNG.werkstatt();
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

    ARTEN: ["2d", "scheiben", "oben", "3d"],

    /* Die Wahl aus dem Speicher, auf das Freie gekürzt:
       an = 3D-Brett gewählt; scheiben = dabei 2D-Figuren; oben = 2D-Brett
       mit 3D-Figuren. Ein altes an=true ohne `scheiben` (bis v0.158.0) heisst
       3D-Brett MIT 3D-Figuren. */
    brett() {
        const einst = FREISCHALTUNG._brettLesen();
        const willBrett = einst.an === true;
        const willFiguren = willBrett ? einst.scheiben !== true : einst.oben === true;
        const brett = willBrett && FREISCHALTUNG.brettDreiDFrei() ? "3d" : "2d";
        const figuren = willFiguren && FREISCHALTUNG.dreiDFrei() ? "3d" : "2d";
        return FREISCHALTUNG.artAus(brett, figuren);
    },

    /* Die beiden Sammlungs-Stücke (seit v0.157.4) aus der einen Art. */
    teile(art) {
        const wert = art || FREISCHALTUNG.brett();
        return {
            brett: (wert === "3d" || wert === "scheiben") ? "3d" : "2d",
            figuren: (wert === "3d" || wert === "oben") ? "3d" : "2d"
        };
    },

    /* Aus Brett- und Figuren-Wahl die Art. Seit v0.159.0 sind alle vier
       Kombinationen möglich — nichts zieht mehr etwas mit (`zuletzt` bleibt
       als Parameter für ältere Aufrufer, zählt aber nicht). */
    artAus(brett, figuren) {
        if (brett === "3d") {
            return figuren === "3d" ? "3d" : "scheiben";
        }
        return figuren === "3d" ? "oben" : "2d";
    },

    brettSetzen(wert) {
        const teile = FREISCHALTUNG.teile(FREISCHALTUNG.ARTEN.indexOf(wert) !== -1 ? wert : "2d");
        const brett = teile.brett === "3d" && FREISCHALTUNG.brettDreiDFrei() ? "3d" : "2d";
        const figuren = teile.figuren === "3d" && FREISCHALTUNG.dreiDFrei() ? "3d" : "2d";
        const art = FREISCHALTUNG.artAus(brett, figuren);
        const an = brett === "3d";
        const oben = art === "oben";
        const scheiben = art === "scheiben";
        const einst = FREISCHALTUNG._brettLesen();
        einst.an = an;
        einst.oben = oben;
        einst.scheiben = scheiben;
        try {
            localStorage.setItem(FREISCHALTUNG.BRETT_SCHLUESSEL, JSON.stringify(einst));
        } catch (fehler) {
            /* privates Fenster: dann gilt die Wahl nur, bis die Seite neu lädt */
        }
        if (typeof window !== "undefined" && window.BRETT_3D
                && typeof window.BRETT_3D.wahlUebernehmen === "function") {
            window.BRETT_3D.wahlUebernehmen(an, oben, scheiben);
        }
        /* Echtes 2D (seit v0.151.3): flache Figuren an/aus. */
        if (typeof FIGUREN_FLACH !== "undefined") {
            FIGUREN_FLACH.anwenden();
        }
        return art;
    }
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = FREISCHALTUNG;
}
