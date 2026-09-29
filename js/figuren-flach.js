/*
 * figuren-flach.js — ECHTES 2D: flache Figuren im 2D-Brett (seit v0.151.3).
 *
 * Nutzer 27.09.2026: „2d bei blunder soll echtes 2d sein, also der Bauer im
 * Turm, wo du die Figur als Vorschau nutzt — es gab diese Version schon mal
 * früher."
 *
 * WAS VORHER WAR: Seit v0.17.0 ist der „3D-Look" dauerhaft an
 * (`body.design-3d`, Wunsch 4 damals: „2D/3D-Schalter entfernen"). Auch das
 * FLACHE Brett zeigt seither gerenderte Blender-Bilder der 3D-Figuren
 * (`img\figuren\*.png`, seit v0.123.0 teils live aus den 3D-Formen
 * gerechnet), die schräg auf der Kachel stehen. Vor v0.17.0 gab es den
 * klassischen Look mit flachen Figuren. „2D" war damit nur ein flaches BRETT
 * mit 3D-Figuren darauf.
 *
 * WAS JETZT GILT: Ist das Brett 2D (`FREISCHALTUNG.brett() !== "3d"`; seit
 * v0.159.0 auch bei "scheiben", dann liegen dieselben Silhouetten auf den
 * Scheiben des 3D-Bretts),
 * trägt der body die Klasse `brett-flach`, und jede Figur (Brett,
 * Vorschau, Hand, Beute, Schach lernen) ist eine flache Silhouette im Stil
 * der Wertungs-Figuren des Turms (dieselben Pfade für Bauer, Springer und
 * König wie `START_TURM_FIGUREN`, dazu Turm, Läufer und Dame im selben
 * 24er-Raster): Weiss hell mit dunkler Kante, Schwarz dunkel mit heller
 * Kante, mittig IN der Kachel statt schräg darauf. 3D bleibt 3D.
 *
 * DIE BILDER ENTSTEHEN HIER, als SVG-Daten-Adressen — kein Bild-Paket,
 * kein Blender. Die Stilregeln dafür setzt `stilSetzen` einmal in den Kopf;
 * sie gewinnen gegen die PNG-Regeln, weil sie eine Klasse mehr tragen.
 */

const FIGUREN_FLACH = {

    KLASSE: "brett-flach",

    /* Die sechs Silhouetten (24er-Raster). Bauer, Springer, König wie im
       Turm (js\start-turm.js, `START_TURM_FIGUREN`). */
    PFADE: {
        bauer: "M12 3.5 A3.2 3.2 0 1 1 11.99 3.5 Z M9 11 H15 L14 12.5 L16.5 18 H7.5 L10 12.5 Z M6 19 H18 V21.5 H6 Z",
        springer: "M7 21.5 H18.5 V19 H17.2 C17.4 14.5 18.2 10.5 15.8 6.8 C14.3 4.4 11.8 3.2 9.6 3.6 L10.6 5.2 "
            + "C9.3 5.8 6.9 8 5.5 10.2 L6.4 12.3 L9.2 11.4 L11.3 10.4 C10.2 13 8.3 15 8.4 19 H7 Z",
        laeufer: "M12 1.6 A1.3 1.3 0 1 1 11.99 1.6 Z M12 4.2 C15.6 6.6 16.2 10.2 14.6 12.4 H9.4 "
            + "C7.8 10.2 8.4 6.6 12 4.2 Z M9.2 13.4 H14.8 L14.3 14.8 L15.8 18 H8.2 L9.7 14.8 Z M6 19 H18 V21.5 H6 Z",
        turm: "M6.5 3 H9 V5 H11 V3 H13 V5 H15 V3 H17.5 V8.2 L15.6 9.8 L16.3 17.8 H7.7 L8.4 9.8 L6.5 8.2 Z "
            + "M6 19 H18 V21.5 H6 Z",
        dame: "M4 4.6 A1.2 1.2 0 1 1 3.99 4.6 Z M9 3.2 A1.2 1.2 0 1 1 8.99 3.2 Z M15 3.2 A1.2 1.2 0 1 1 14.99 3.2 Z "
            + "M20 4.6 A1.2 1.2 0 1 1 19.99 4.6 Z M4 7 L7.8 12.2 L9 5.8 L12 11.2 L15 5.8 L16.2 12.2 L20 7 "
            + "L17.6 17.8 H6.4 Z M6 19 H18 V21.5 H6 Z",
        koenig: "M11 1.5 H13 V3.5 H15 V5.5 H13 V7.5 H11 V5.5 H9 V3.5 H11 Z M7.5 9 C9 8 15 8 16.5 9 L15 17.5 H9 Z "
            + "M6 18.5 H18 V21.5 H6 Z"
    },

    /* Füllung und Kante je Farbe. */
    FARBEN: {
        weiss: { fuellung: "#fbf8f1", kante: "#26262b", breite: 1.2 },
        schwarz: { fuellung: "#26262b", kante: "#e8e4da", breite: 0.9 }
    },

    /* Ein SVG als Text: eine Figur, `art` wie `figur-art-*`, `farbe`
       weiss | schwarz. Optional verschoben/skaliert (für das Mini-Brett). */
    svgPfad(art, farbe, x, y, massstab) {
        const f = FIGUREN_FLACH.FARBEN[farbe] || FIGUREN_FLACH.FARBEN.weiss;
        const pfad = FIGUREN_FLACH.PFADE[art] || "";
        const verschieben = (typeof x === "number")
            ? " transform=\"translate(" + x + " " + y + ") scale(" + massstab + ")\"" : "";
        return "<path d=\"" + pfad + "\" fill=\"" + f.fuellung + "\" stroke=\"" + f.kante
            + "\" stroke-width=\"" + f.breite + "\" stroke-linejoin=\"round\"" + verschieben + "/>";
    },

    svg(art, farbe) {
        return "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 24 24\">"
            + FIGUREN_FLACH.svgPfad(art, farbe) + "</svg>";
    },

    /* Als Adresse für `src` oder `background-image`. */
    datenUrl(art, farbe) {
        return "data:image/svg+xml," + encodeURIComponent(FIGUREN_FLACH.svg(art, farbe));
    },

    /* Ist gerade 2D? Ohne Freischaltung (Tests) ja — 2D ist die Vorgabe. */
    flach() {
        return typeof FREISCHALTUNG === "undefined" || FREISCHALTUNG.brett() !== "3d";
    },

    /*
     * 3D-FIGUREN AUF DEM 2D-BRETT (seit v0.157.3, Nutzer 29.09.2026): Bei
     * `FREISCHALTUNG.brett() === "oben"` bleibt das Brett das flache
     * 2D-Brett (Klasse `brett-flach`, alle Markierungen, Züge und Tipps wie
     * dort), die Figuren sind aber die echten 3D-Modelle, seit v0.157.4 mit
     * leicht GENEIGTER Kamera gerendert (Form erkennbar; Fuss auf der
     * Feldmitte, `obenMass`) — einmal je Art und Farbe von js\brett-3d.js
     * (`figurenBilderOben`, derselbe kleine Renderer, dieselben Formen). Die
     * Bilder liegen in `obenBilder` (Schlüssel `art-farbe`) und kommen per
     * Stilregel mit der Klasse `figuren-oben` über die flachen. Bis sie
     * gerechnet sind (oder ohne WebGL) gelten die flachen.
     */
    KLASSE_OBEN: "figuren-oben",

    obenBilder: null,

    /* Masse der geneigten Bilder in Feldern (seit v0.157.4, gesetzt von
       jsrett-3d.js): `groesse` Kante, `fuss` Fuss über dem unteren Rand. */
    obenMass: null,

    oben() {
        return typeof FREISCHALTUNG !== "undefined" && FREISCHALTUNG.brett() === "oben";
    },

    /* Das Bild einer Figur für `src` im flachen Brett: von oben gerendert,
       sonst die flache Silhouette. */
    bildUrl(art, farbe) {
        const oben = FIGUREN_FLACH.oben() && FIGUREN_FLACH.obenBilder;
        return (oben && oben[art + "-" + farbe]) || FIGUREN_FLACH.datenUrl(art, farbe);
    },

    /* Die Stilregeln (einmal) und die Klassen am body (bei jeder Wahl). */
    anwenden() {
        if (typeof document === "undefined" || !document.body) {
            return;
        }
        FIGUREN_FLACH.stilSetzen();
        document.body.classList.toggle(FIGUREN_FLACH.KLASSE, FIGUREN_FLACH.flach());
        document.body.classList.toggle(FIGUREN_FLACH.KLASSE_OBEN, FIGUREN_FLACH.oben());
        /* Seit v0.159.0: `brett-2d` = das BRETT ist flach (2d oder oben) —
           daran hängen die schlichten Felder ohne Kante und das Brett-Design
           (js\brett-design.js, css\stil-effekte.css). `brett-flach` heisst
           weiter „flache Figuren oder flaches Brett" (auch bei Scheiben). */
        document.body.classList.toggle(FIGUREN_FLACH.KLASSE_BRETT_2D, FIGUREN_FLACH.brettZweiD());
        if (typeof BRETT_DESIGN !== "undefined") {
            BRETT_DESIGN.anwenden();
        }
    },

    KLASSE_BRETT_2D: "brett-2d",

    brettZweiD() {
        if (typeof FREISCHALTUNG === "undefined") {
            return true;
        }
        const art = FREISCHALTUNG.brett();
        return art === "2d" || art === "oben";
    },

    /* Zwölf Regeln, eine je Farbe und Art — mit einer Klasse mehr als die
       PNG-Regeln in css\stil-effekte.css und die live gerechneten aus
       js\brett-3d.js, also gewinnen sie im 2D-Brett. */
    regeln() {
        const liste = [];
        for (const art of Object.keys(FIGUREN_FLACH.PFADE)) {
            for (const farbe of ["weiss", "schwarz"]) {
                /* Zweiter Wähler: die Vorschau der Sammlung zeigt „2D"
                   auch, wenn gerade eine andere Art gilt (seit v0.157.3). */
                liste.push("body.design-3d." + FIGUREN_FLACH.KLASSE + " .figur-" + farbe + ".figur-art-" + art
                    + ", body.design-3d .sammlung-buehne.nur-flach .vorschau-feld > .figur-" + farbe + ".figur-art-" + art
                    + " { background-image: url(\"" + FIGUREN_FLACH.datenUrl(art, farbe) + "\"); }");
            }
        }
        return liste;
    },

    stilSetzen() {
        if (document.getElementById("figuren-flach-bilder")) {
            return;
        }
        const stil = document.createElement("style");
        stil.id = "figuren-flach-bilder";
        stil.textContent = FIGUREN_FLACH.regeln().join("\n");
        document.head.appendChild(stil);
    },

    /* Ein kleines flaches Brett als SVG-Text (Regal „Brett" in der
       Sammlung): 4 × 4 Felder mit ein paar Figuren. `oben` (seit v0.157.3):
       die von oben gerenderten 3D-Figuren, sobald es sie gibt. */
    miniBrett(oben) {
        const bilder = oben ? FIGUREN_FLACH.obenBilder : null;
        /* Seit v0.159.0 in den Farben des gewählten 2D-Designs (Vorgabe
           Grau); „Farbwelt" hat keine festen Farben, dann ebenfalls Grau. */
        const design = (typeof BRETT_DESIGN !== "undefined" && BRETT_DESIGN.farben(BRETT_DESIGN.wahl()))
            || { hell: "#dedede", dunkel: "#8e8e8e" };
        const hell = design.hell;
        const dunkel = design.dunkel;
        const aufstellung = [
            ["turm", "schwarz"], [null], ["koenig", "schwarz"], [null],
            [null], ["bauer", "schwarz"], [null], ["springer", "schwarz"],
            ["laeufer", "weiss"], [null], ["bauer", "weiss"], [null],
            [null], ["dame", "weiss"], [null], ["koenig", "weiss"]
        ];
        const mass = FIGUREN_FLACH.obenMass || { groesse: 0.88, fuss: 0.44 };
        let inhalt = "";
        for (let i = 0; i < 16; i++) {
            const x = (i % 4) * 24;
            const y = Math.floor(i / 4) * 24;
            const feld = ((i % 4) + Math.floor(i / 4)) % 2 === 0 ? hell : dunkel;
            inhalt += "<rect x=\"" + x + "\" y=\"" + y + "\" width=\"24\" height=\"24\" fill=\"" + feld + "\"/>";
            const [art, farbe] = aufstellung[i];
            if (art && bilder && bilder[art + "-" + farbe]) {
                /* Geneigt (v0.157.4): Fuss auf der Feldmitte, ragt nach oben. */
                const kante = mass.groesse * 24;
                inhalt += "<image href=\"" + bilder[art + "-" + farbe] + "\" x=\"" + (x + 12 - kante / 2)
                    + "\" y=\"" + (y + 12 + mass.fuss * 24 - kante) + "\" width=\"" + kante
                    + "\" height=\"" + kante + "\"/>";
            } else if (art) {
                inhalt += FIGUREN_FLACH.svgPfad(art, farbe, x + 2.4, y + 2.4, 0.8);
            }
        }
        return "<svg class=\"sammlung-bild sammlung-bild-flach\" xmlns=\"http://www.w3.org/2000/svg\" "
            + "viewBox=\"" + (bilder ? "-6 -12 108 108" : "0 0 96 96") + "\" aria-hidden=\"true\">"
            + inhalt + "</svg>";
    }
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = FIGUREN_FLACH;
}
