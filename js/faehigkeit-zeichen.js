/*
 * Blunderluck — die Zeichen der Fähigkeiten und Unglücke (seit v0.63.0)
 *
 * NUTZER-ANSAGE 25.08.2026: „Die Icons kannst du mal selbst anhand dessen,
 * was sie machen / wie sie heissen, erstellen — querliegender Holzstamm bei
 * Nudelholz, Schneeflocke bei Frost, ein Spiegel bei Spiegel, eine Bärenfalle
 * bei Fessel und und und, denk dir was Cooles aus."
 *
 * Bis dahin stand im Raster der Bibliothek der Anfangsbuchstabe als
 * Lückenfüller (F4 aus dem Entwurf). Jede der 22 Fähigkeiten und jedes der
 * 7 Unglücke hat jetzt ein eigenes Zeichen.
 *
 * DREI REGELN, DIE FÜR JEDES ZEICHEN HIER GELTEN:
 *
 *   1. **Gezeichnet, nicht gemalt.** Kein Emoji (Haus-Regel), keine
 *      Bilddatei — reines SVG in `currentColor`. Damit nimmt jedes Zeichen
 *      die Farbe seiner Umgebung an: im Raster die Stufenfarbe, an der Marke
 *      am Brett die Schriftfarbe. Eine PNG-Datei je Fähigkeit wären 29
 *      Dateien, die bei jedem Farbwechsel neu gerendert werden müssten.
 *   2. **Ein Motiv, das man OHNE Text erkennt.** Gesucht ist nicht die
 *      Illustration der Regel, sondern der Gegenstand, an den der Name
 *      denken lässt: das Nudelholz ist eine Walze, die Fessel eine
 *      Bärenfalle. Wo der Name nichts Gegenständliches hergibt (Doppelzug,
 *      Platztausch), zeigt das Zeichen die BEWEGUNG.
 *   3. **Nichts Blutiges, nichts Gruseliges** (Nutzer-Entscheidung
 *      25.08.2026: kein Blut, Zielgruppe ab sechs). Deshalb ist der Nekromant
 *      ein Aufstehen aus dem Boden und kein Grabstein, und der Dieb trägt
 *      eine Augenbinde statt einer Waffe.
 *
 * WIE EIN ZEICHEN GESCHRIEBEN WIRD: eine Liste von Formen, jede ein kleines
 * Objekt. Vier Formen gibt es, mehr braucht keines der Zeichen:
 *
 *     { pfad: "M4 12 L20 12" }        Linienzug (Umriss)
 *     { pfad: "…", voll: true }       Fläche statt Umriss
 *     { kreis: [x, y, r] }            Kreis, mit `voll` gefüllt
 *     { linie: [x1, y1, x2, y2] }     gerade Linie
 *     { rechteck: [x, y, breite, hoehe, rundung] }
 *
 * Alle Zeichnungen liegen im Feld 24 x 24 und rechnen mit Strichbreite 2 —
 * dieselben Masse wie die Zeichen des Startbildschirms (`START._zahnradBauen`
 * und Geschwister), damit sie nebeneinander gleich schwer wirken.
 */

const FAEHIGKEIT_ZEICHEN = {

    /* Der Namensraum für `createElementNS`. Er steht an dieser EINEN Stelle:
       29 Zeichen aus einer Tabelle zu bauen heisst, ihn genau einmal zu
       brauchen. */
    RAUM: "http://www.w3.org/2000/svg",

    /* ---------------------------------------------------------------- *
     * Die Fähigkeiten (22)
     * ---------------------------------------------------------------- */

    ZEICHEN: {

        /* SPRUNG — der Weg des Springers: zwei gerade, einer quer. */
        sprung: [
            { pfad: "M6 19 L6 10 L14 10" },
            { pfad: "M11 6.5 L14.5 10 L11 13.5" }
        ],

        /* AUSWEICHEN — ein Bogen um das herum, was einen treffen wollte
           (der Punkt unten). */
        ausweichen: [
            { pfad: "M4 19 C4 9 20 9 20 19" },
            { pfad: "M17 16 L20.2 19 L21.5 15" },
            { kreis: [12, 20, 1.7], voll: true }
        ],

        /* TELEPORT — der Wirbel, in den die Figur hineingeht. */
        teleport: [
            { pfad: "M12 4.5 C6.8 4.5 4.5 8.5 4.5 12 C4.5 16 8.5 19.5 12 19.5 "
                + "C15.3 19.5 17.5 17.2 17.5 14.5 C17.5 12.3 15.8 10.8 13.8 10.8 "
                + "C12.2 10.8 11 12 11 13.3" }
        ],

        /* SCHUBS — der Block und die Richtung, in die er geht. */
        schubs: [
            { rechteck: [3.5, 7.5, 7.5, 9, 1.5] },
            { linie: [13.5, 12, 20.5, 12] },
            { pfad: "M17.5 8.8 L20.8 12 L17.5 15.2" }
        ],

        /* PLATZTAUSCH — zwei, die aneinander vorbeigehen. */
        platztausch: [
            { linie: [4, 9, 17.5, 9] },
            { pfad: "M14 5.8 L17.8 9 L14 12.2" },
            { linie: [20, 15, 6.5, 15] },
            { pfad: "M10 11.8 L6.2 15 L10 18.2" }
        ],

        /* BAUERNSCHUB — die ganze Reihe rückt einen vor. */
        bauernschub: [
            { kreis: [5.5, 19.5, 1.7], voll: true },
            { kreis: [12, 19.5, 1.7], voll: true },
            { kreis: [18.5, 19.5, 1.7], voll: true },
            { linie: [12, 15, 12, 5.5] },
            { pfad: "M8.3 9 L12 5 L15.7 9" }
        ],

        /* SCHUTZSCHILD — das Schild. */
        schutzschild: [
            { pfad: "M12 2.5 L20 5.8 V12 C20 17 16 20 12 21.5 "
                + "C8 20 4 17 4 12 V5.8 Z" }
        ],

        /* NUDELHOLZ — die querliegende Walze mit ihren zwei Griffen
           (Nutzer-Vorgabe: „querliegender Holzstamm"). */
        nudelholz: [
            { rechteck: [5.5, 8.5, 13, 7, 3.2] },
            { linie: [2.2, 12, 5.5, 12] },
            { linie: [18.5, 12, 21.8, 12] },
            { linie: [9, 9.6, 9, 14.4] },
            { linie: [15, 9.6, 15, 14.4] }
        ],

        /* NACHSCHUB — ein Bauer tritt an, und einer kommt dazu. */
        nachschub: [
            { kreis: [9, 7.5, 2.6] },
            { pfad: "M4.5 19.5 H13.5 L11.8 12.5 H6.2 Z" },
            { linie: [18.5, 4, 18.5, 10] },
            { linie: [15.5, 7, 21.5, 7] }
        ],

        /* FROST — die Schneeflocke (Nutzer-Vorgabe). */
        frost: [
            { linie: [12, 2.5, 12, 21.5] },
            { linie: [3.8, 7.2, 20.2, 16.8] },
            { linie: [3.8, 16.8, 20.2, 7.2] },
            { pfad: "M9 5.5 L12 8 L15 5.5" },
            { pfad: "M9 18.5 L12 16 L15 18.5" }
        ],

        /* VERSTÄRKUNG — die Figur steigt eine Stufe auf: die Krone. */
        verstaerkung: [
            { pfad: "M4 17.5 L5.5 7.5 L9.5 12 L12 5.5 L14.5 12 L18.5 7.5 "
                + "L20 17.5 Z" },
            { linie: [4.5, 20.5, 19.5, 20.5] }
        ],

        /* FESSEL — die Bärenfalle (Nutzer-Vorgabe): zwei Zahnreihen, die
           zuschnappen, und die Bügel an den Seiten. */
        fessel: [
            { pfad: "M4.5 7.5 L8 11.5 L11.5 7.5 L15 11.5 L18.5 7.5" },
            { pfad: "M4.5 16.5 L8 12.5 L11.5 16.5 L15 12.5 L18.5 16.5" },
            { kreis: [3, 12, 1.6] },
            { kreis: [20.5, 12, 1.6] }
        ],

        /* DOPPELZUG — zweimal hintereinander. */
        doppelzug: [
            { pfad: "M5.5 5.5 L12 12 L5.5 18.5" },
            { pfad: "M13 5.5 L19.5 12 L13 18.5" }
        ],

        /* WIEDERGEBURT — die Verlorene kommt zurück: der Kreis, der sich
           schliesst, um die Figur herum. */
        wiedergeburt: [
            { pfad: "M19.5 12 A7.5 7.5 0 1 1 12 4.5" },
            { pfad: "M8.5 7.5 L12 4 L15.5 7.5" },
            { kreis: [12, 12, 2.4], voll: true }
        ],

        /* SPIEGEL — der Handspiegel mit seinem Glanz (Nutzer-Vorgabe). */
        spiegel: [
            { kreis: [12, 8.5, 5.8] },
            { linie: [12, 14.3, 12, 20.5] },
            { linie: [9, 20.5, 15, 20.5] },
            { pfad: "M9 7 C9.6 5.6 10.8 4.7 12.2 4.5" }
        ],

        /* WIEDERBELEBUNG — sie steht genau dort wieder auf, wo sie fiel. */
        wiederbelebung: [
            { linie: [3.5, 20, 20.5, 20] },
            { linie: [12, 17.5, 12, 7] },
            { pfad: "M8 10.5 L12 6.5 L16 10.5" },
            { linie: [5.5, 5.5, 7, 7] },
            { linie: [18.5, 5.5, 17, 7] }
        ],

        /* MAUER — drei Felder dicht: das Ziegelwerk. */
        mauer: [
            { rechteck: [3, 6, 18, 12, 1.2] },
            { linie: [3, 12, 21, 12] },
            { linie: [12, 6, 12, 12] },
            { linie: [7.5, 12, 7.5, 18] },
            { linie: [16.5, 12, 16.5, 18] }
        ],

        /* HÄNDLER — sein Angebot wiegt ungefähr gleich viel: die Waage. */
        haendler: [
            { linie: [4, 7.5, 20, 7.5] },
            { linie: [12, 4.5, 12, 19.5] },
            { linie: [8, 19.5, 16, 19.5] },
            { pfad: "M2 7.5 L4.5 12.5 L7 7.5" },
            { pfad: "M17 7.5 L19.5 12.5 L22 7.5" }
        ],

        /* ENTTARNEN — man sieht, was sonst verborgen ist. */
        enttarnen: [
            { pfad: "M2.5 12 C6 6.5 18 6.5 21.5 12 C18 17.5 6 17.5 2.5 12 Z" },
            { kreis: [12, 12, 2.6], voll: true }
        ],

        /* VERSTECKEN — dasselbe Auge, durchgestrichen. */
        verstecken: [
            { pfad: "M2.5 12 C6 6.5 18 6.5 21.5 12 C18 17.5 6 17.5 2.5 12 Z" },
            { kreis: [12, 12, 2.6], voll: true },
            { linie: [4, 20, 20, 4] }
        ],

        /* DIEB — die Augenbinde. Nichts Bedrohliches: Er nimmt etwas weg,
           er tut niemandem weh. */
        dieb: [
            { pfad: "M3 10 C3 7.8 21 7.8 21 10 C21 14.2 16.8 15.4 14.8 13.2 "
                + "C13.4 11.6 10.6 11.6 9.2 13.2 C7.2 15.4 3 14.2 3 10 Z",
                voll: true }
        ],

        /* NEKROMANT — die Gefallenen stehen auf. Kein Grabstein, kein
           Knochen: der Boden und was daraus emporsteigt. */
        friedhof: [
            { linie: [3, 20.5, 21, 20.5] },
            { linie: [7, 18, 7, 11] },
            { pfad: "M4.6 13 L7 10.4 L9.4 13" },
            { linie: [17, 18, 17, 11] },
            { pfad: "M14.6 13 L17 10.4 L19.4 13" },
            { pfad: "M12 3 L13.2 6.4 L16.6 7.6 L13.2 8.8 L12 12.2 "
                + "L10.8 8.8 L7.4 7.6 L10.8 6.4 Z", voll: true }
        ]
    },

    /* ---------------------------------------------------------------- *
     * Die Unglücke (7)
     *
     * Sie stehen in derselben Tabelle wie die Fähigkeiten — im Raster der
     * Bibliothek liegen sie nebeneinander, und `bauen` fragt nur nach der
     * Art, nicht danach, was sie ist. Zwei davon (Ausdehnung, Einsturz) sind
     * seit v0.84 aus dem Spiel genommen und bekommen trotzdem ihr Zeichen:
     * Sie tauchen im Zugverlauf alter Partien auf, und die Überarbeitung
     * braucht später nur den Schalter zurückzunehmen.
     * ---------------------------------------------------------------- */

    ZEICHEN_PECH: {

        /* STOLPERSTEIN — der Stein, über den man fällt. */
        stolperstein: [
            { pfad: "M6 16.5 L3.8 11.5 L8 6.5 L15 5.5 L20.2 10.5 L18 16.5 Z" },
            { linie: [4.5, 20, 10, 20] },
            { linie: [13, 20, 19.5, 20] }
        ],

        /* AUSDEHNUNG — das Brett wächst nach allen Seiten. */
        ausdehnung: [
            { rechteck: [8, 8, 8, 8, 1.2] },
            { pfad: "M6 6 L2.5 2.5 M2.5 6.5 V2.5 H6.5" },
            { pfad: "M18 6 L21.5 2.5 M17.5 2.5 H21.5 V6.5" },
            { pfad: "M6 18 L2.5 21.5 M2.5 17.5 V21.5 H6.5" },
            { pfad: "M18 18 L21.5 21.5 M17.5 21.5 H21.5 V17.5" }
        ],

        /* EINSTURZ — es zieht sich von allen Seiten zusammen. */
        schrumpfung: [
            { rechteck: [8, 8, 8, 8, 1.2] },
            { pfad: "M2.5 2.5 L6 6 M6 2.5 V6 H2.5" },
            { pfad: "M21.5 2.5 L18 6 M18 2.5 V6 H21.5" },
            { pfad: "M2.5 21.5 L6 18 M6 21.5 V18 H2.5" },
            { pfad: "M21.5 21.5 L18 18 M18 21.5 V18 H21.5" }
        ],

        /* SPALT — der Riss quer durch das Brett. */
        erdbeben: [
            { pfad: "M10.5 2.5 L14.5 9 L9 13 L14 21.5" },
            { linie: [3.5, 6.5, 8, 8.5] },
            { linie: [20.5, 15.5, 16, 13.5] }
        ],

        /* HALLUZINATION — das volle Glas und was danach schwankt. */
        vollesGlas: [
            { pfad: "M7 4.5 H17 L15.4 19.5 H8.6 Z" },
            { pfad: "M7.9 9 C9.8 7.4 14.2 10.6 16.1 9" },
            { linie: [3, 5, 4.5, 6.5] },
            { linie: [21, 5, 19.5, 6.5] }
        ],

        /* MEUTEREI — eine Seite läuft über: die Fahne des Aufstands. */
        meuterei: [
            { linie: [6, 3, 6, 21.5] },
            { pfad: "M6 4 H18.5 L15.5 8 L18.5 12 H6 Z" }
        ],

        /* ERDRUTSCH — der Hang und was ihn herunterkommt. */
        erdrutsch: [
            { pfad: "M2.5 19.5 L13 6.5" },
            { linie: [2.5, 19.5, 21.5, 19.5] },
            { kreis: [10.5, 13, 2], voll: true },
            { kreis: [15.5, 16.5, 2.4], voll: true },
            { kreis: [19.5, 14, 1.6], voll: true }
        ]
    },

    /* ---------------------------------------------------------------- *
     * Bauen
     * ---------------------------------------------------------------- */

    /*
     * Das Zeichen zu einer Art — oder `null`, wenn es keines gibt.
     *
     * NULL IST KEIN FEHLER, sondern der Rückfall: Der Aufrufer setzt dann
     * wieder den Anfangsbuchstaben. Damit bricht nichts, wenn später eine
     * Fähigkeit dazukommt und ihr Zeichen noch fehlt — sie sieht nur aus wie
     * vor v0.63.0. Ein Test wacht trotzdem darüber, dass keine ohne dasteht.
     */
    bauen(art) {
        const formen = FAEHIGKEIT_ZEICHEN.ZEICHEN[art]
            || FAEHIGKEIT_ZEICHEN.ZEICHEN_PECH[art];

        if (!formen || typeof document === "undefined"
                || !document.createElementNS) {
            return null;
        }

        const svg = document.createElementNS(FAEHIGKEIT_ZEICHEN.RAUM, "svg");
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("class", "start-zeichen faehigkeit-bild");
        svg.setAttribute("aria-hidden", "true");

        for (const form of formen) {
            const teil = FAEHIGKEIT_ZEICHEN._formBauen(form);
            if (teil) {
                svg.appendChild(teil);
            }
        }

        return svg;
    },

    /* Gibt es zu dieser Art ein Zeichen? Fragt die Tabelle, ohne zu bauen —
       so lässt sich die Vollständigkeit auch ohne Bildschirm prüfen. */
    gibtEs(art) {
        return !!(FAEHIGKEIT_ZEICHEN.ZEICHEN[art]
            || FAEHIGKEIT_ZEICHEN.ZEICHEN_PECH[art]);
    },

    /*
     * Eine einzelne Form. Der gemeinsame Stil steht hier und nicht in der
     * Tabelle: Jede der 29 Zeichnungen soll gleich schwer wirken, und
     * Strichbreite je Form einzeln zu pflegen wäre 29 Gelegenheiten,
     * auseinanderzulaufen.
     */
    _formBauen(form) {
        let teil = null;

        if (form.pfad) {
            teil = document.createElementNS(FAEHIGKEIT_ZEICHEN.RAUM, "path");
            teil.setAttribute("d", form.pfad);
        } else if (form.kreis) {
            teil = document.createElementNS(FAEHIGKEIT_ZEICHEN.RAUM, "circle");
            teil.setAttribute("cx", String(form.kreis[0]));
            teil.setAttribute("cy", String(form.kreis[1]));
            teil.setAttribute("r", String(form.kreis[2]));
        } else if (form.linie) {
            teil = document.createElementNS(FAEHIGKEIT_ZEICHEN.RAUM, "line");
            teil.setAttribute("x1", String(form.linie[0]));
            teil.setAttribute("y1", String(form.linie[1]));
            teil.setAttribute("x2", String(form.linie[2]));
            teil.setAttribute("y2", String(form.linie[3]));
        } else if (form.rechteck) {
            teil = document.createElementNS(FAEHIGKEIT_ZEICHEN.RAUM, "rect");
            teil.setAttribute("x", String(form.rechteck[0]));
            teil.setAttribute("y", String(form.rechteck[1]));
            teil.setAttribute("width", String(form.rechteck[2]));
            teil.setAttribute("height", String(form.rechteck[3]));
            teil.setAttribute("rx", String(form.rechteck[4]));
        }

        if (!teil) {
            return null;
        }

        if (form.voll) {
            teil.setAttribute("fill", "currentColor");
            teil.setAttribute("stroke", "none");
        } else {
            teil.setAttribute("fill", "none");
            teil.setAttribute("stroke", "currentColor");
            teil.setAttribute("stroke-width", "2");
            teil.setAttribute("stroke-linecap", "round");
            teil.setAttribute("stroke-linejoin", "round");
        }

        return teil;
    }
};

/* Für die Tests unter Node (der Browser lädt die Datei als Skript). */
if (typeof module !== "undefined" && module.exports) {
    module.exports = FAEHIGKEIT_ZEICHEN;
}
