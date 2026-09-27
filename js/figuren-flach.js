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
 * WAS JETZT GILT: Ist das Brett 2D (`FREISCHALTUNG.brett() === "2d"`),
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

    /* Die Stilregeln (einmal) und die Klasse am body (bei jeder Wahl). */
    anwenden() {
        if (typeof document === "undefined" || !document.body) {
            return;
        }
        FIGUREN_FLACH.stilSetzen();
        document.body.classList.toggle(FIGUREN_FLACH.KLASSE, FIGUREN_FLACH.flach());
    },

    /* Zwölf Regeln, eine je Farbe und Art — mit einer Klasse mehr als die
       PNG-Regeln in css\stil-effekte.css und die live gerechneten aus
       js\brett-3d.js, also gewinnen sie im 2D-Brett. */
    regeln() {
        const liste = [];
        for (const art of Object.keys(FIGUREN_FLACH.PFADE)) {
            for (const farbe of ["weiss", "schwarz"]) {
                liste.push("body.design-3d." + FIGUREN_FLACH.KLASSE + " .figur-" + farbe + ".figur-art-" + art
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
       Sammlung): 4 × 4 Felder mit ein paar Figuren. */
    miniBrett() {
        const hell = "#e9e2d0";
        const dunkel = "#8a6a4a";
        const aufstellung = [
            ["turm", "schwarz"], [null], ["koenig", "schwarz"], [null],
            [null], ["bauer", "schwarz"], [null], ["springer", "schwarz"],
            ["laeufer", "weiss"], [null], ["bauer", "weiss"], [null],
            [null], ["dame", "weiss"], [null], ["koenig", "weiss"]
        ];
        let inhalt = "";
        for (let i = 0; i < 16; i++) {
            const x = (i % 4) * 24;
            const y = Math.floor(i / 4) * 24;
            const feld = ((i % 4) + Math.floor(i / 4)) % 2 === 0 ? hell : dunkel;
            inhalt += "<rect x=\"" + x + "\" y=\"" + y + "\" width=\"24\" height=\"24\" fill=\"" + feld + "\"/>";
            const [art, farbe] = aufstellung[i];
            if (art) {
                inhalt += FIGUREN_FLACH.svgPfad(art, farbe, x + 2.4, y + 2.4, 0.8);
            }
        }
        return "<svg class=\"sammlung-bild sammlung-bild-flach\" xmlns=\"http://www.w3.org/2000/svg\" "
            + "viewBox=\"0 0 96 96\" aria-hidden=\"true\">" + inhalt + "</svg>";
    }
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = FIGUREN_FLACH;
}
