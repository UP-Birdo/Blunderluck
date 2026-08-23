/*
 * start.js — der Startbildschirm (seit v0.9.0, Bündel A Schritt 4).
 *
 * Die mittlere der drei Seiten (Fähigkeiten / Start / Rangliste) und das
 * Erste, was ein Angemeldeter ohne laufende Partie sieht:
 *
 *   - oben rechts das Zahnrad — der einzige Weg in die Einstellungen, die
 *     seit v0.9.0 kein Tab mehr sind (F8: oben rechts);
 *   - obere Hälfte: das Vorschaubild der eingestellten Spielart, gerechnet
 *     über dieselben Wege wie die echte Partie (F2 — die Kachel-Vorschau
 *     aus team-schach-uebersicht.js, deshalb kann sie nicht veralten);
 *   - untere Hälfte: der Spielen-Knopf (zwei Drittel breit, für den
 *     Daumen) und daneben ein Quadrat mit Pfeil, das die
 *     Match-Einstellungen öffnet (die heutige Spielart-Auswahl).
 *
 * DER WIEDEREINSTIEG (Entwurf, Abschnitt 3.2) wohnt ebenfalls hier: Nach
 * jeder Anmeldung wird die Schach-Tafel nach der eigenen Kennung
 * durchsucht (SCHACH_TAFEL.eigeneLaufende). Genau eine laufende Partie
 * heisst: direkt hinein, ohne Liste. Mehrere sind ein Fehlerzustand und
 * bekommen einen Ausweg (F11). Fremde Partien ziehen niemanden hinein.
 *
 * „Spielen" führt ÜBERGANGSWEISE in die heutige Partien-Übersicht des Team
 * Schach — bis Schritt 5 des Entwurfs den Zwischenbildschirm „Runde
 * beitreten / Runde erstellen" bringt (blockiert von F18/F19).
 */

const START = {

    id: "start",
    titel: "Start",

    wurzelEl: null,

    /* Die zuletzt angelegte Spielart — nur eine Geräte-Erinnerung fürs
       Vorschaubild, kein gemeinsamer Stand. */
    SCHLUESSEL_SPIELART: "blunderluck.start-spielart",

    aufbauen(behaelter) {
        START.wurzelEl = behaelter;
        START._zeichnen();
    },

    beimOeffnen() {
        START._zeichnen();
    },

    /* ---------------------------------------------------------------- *
     * Zeichnen
     * ---------------------------------------------------------------- */

    _zeichnen() {
        const wurzel = START.wurzelEl;
        if (!wurzel) {
            return;
        }

        /* Der Start ist nie ein Fenster — die Tab-Leiste gehört dazu. Wer
           aus einem Fenster (Einstellungen, Partie) hierher zurückkommt,
           bekommt sie so wieder. */
        TABS.rundeSetzen("start", false);

        wurzel.innerHTML = "";

        const seite = document.createElement("div");
        seite.className = "start";

        /* Das Zahnrad oben rechts (F8) — der Weg in die Einstellungen. */
        const kopf = document.createElement("div");
        kopf.className = "start-kopf";

        const zahnrad = document.createElement("button");
        zahnrad.type = "button";
        zahnrad.className = "start-zahnrad";
        zahnrad.setAttribute("aria-label", "Einstellungen");
        zahnrad.title = "Einstellungen";
        zahnrad.appendChild(START._zahnradBauen());
        zahnrad.addEventListener("click", () => TABS.wechseln("einstellungen"));
        kopf.appendChild(zahnrad);
        seite.appendChild(kopf);

        /* Obere Hälfte: das Vorschaubild der eingestellten Spielart (F2). */
        const variante = START._spielart();

        const vorschau = document.createElement("div");
        vorschau.className = "start-vorschau";
        vorschau.appendChild(TEAM_SCHACH._vorschauBauen(
            variante, TEAM_SCHACH._vorschauBrett(variante)));

        const name = document.createElement("p");
        name.className = "start-spielart";
        name.textContent = variante.titel;
        vorschau.appendChild(name);

        seite.appendChild(vorschau);

        /* Untere Hälfte: Spielen (zwei Drittel) und das Pfeil-Quadrat. */
        const zeile = document.createElement("div");
        zeile.className = "start-spielen-zeile";

        const spielen = document.createElement("button");
        spielen.type = "button";
        spielen.className = "knopf knopf-haupt start-spielen";
        spielen.textContent = "Spielen";
        spielen.addEventListener("click", () => START.spielen());
        zeile.appendChild(spielen);

        const match = document.createElement("button");
        match.type = "button";
        match.className = "knopf knopf-still start-match";
        match.setAttribute("aria-label", "Match-Einstellungen");
        match.title = "Match-Einstellungen";
        match.appendChild(START._pfeilBauen());
        match.addEventListener("click", () => START.matchEinstellungen());
        zeile.appendChild(match);

        seite.appendChild(zeile);
        wurzel.appendChild(seite);
    },

    /* ---------------------------------------------------------------- *
     * Bedienung
     * ---------------------------------------------------------------- */

    /* Übergang bis Schritt 5 (Zwischenbildschirm „Runde beitreten /
       Runde erstellen"): Spielen führt in die Partien-Übersicht. */
    spielen() {
        TABS.wechseln("team-schach");
    },

    /* Das Pfeil-Quadrat: die Match-Einstellungen — heute die
       Spielart-Auswahl mit allen Reglern (team-schach-uebersicht.js). */
    matchEinstellungen() {
        TABS.wechseln("team-schach");
        TEAM_SCHACH.partieAnlegen();
    },

    /* ---------------------------------------------------------------- *
     * Der Wiedereinstieg nach der Anmeldung (Entwurf, Abschnitt 3.2)
     *
     * Gerufen über ANMELDUNG.beiAngemeldet (verdrahtet in app.js), wenn
     * Spielerliste UND Schach-Tafel geladen sind.
     * ---------------------------------------------------------------- */

    async wiedereinstieg() {
        const person = ICH.person();
        const abgleich = (typeof TEAM_SCHACH !== "undefined")
            ? TEAM_SCHACH.abgleich : null;
        if (!person || !abgleich) {
            return;
        }

        const eigene = SCHACH_TAFEL.eigeneLaufende(abgleich.daten, person.id);

        /* Keine eigene laufende Partie: Man bleibt auf dem Start. Was
           andere spielen, zieht einen nicht hinein. */
        if (eigene.length === 0) {
            return;
        }

        if (eigene.length === 1) {
            TABS.wechseln("team-schach");
            TEAM_SCHACH.partieOeffnen(eigene[0].id);
            return;
        }

        /*
         * Mehrere eigene laufende Partien sind kein gültiger Zustand (F9) —
         * und dürfen keine Sackgasse sein (F11): Angeboten wird, alle bis
         * auf die jüngste zu verlassen. Wer ablehnt, bleibt auf dem Start
         * und kann in der Übersicht selbst aufräumen.
         */
        const aufraeumen = await DIALOG.frage(
            "Mehrere laufende Partien",
            "Du steckst in " + eigene.length + " laufenden Partien — mehr "
                + "als eine gleichzeitig ist nicht vorgesehen. Sollen alle "
                + "bis auf die jüngste verlassen werden?",
            "Aufräumen"
        );
        if (!aufraeumen) {
            return;
        }

        for (const partie of eigene.slice(1)) {
            await TEAM_SCHACH.teamVerlassen(partie);
        }
        TABS.wechseln("team-schach");
        TEAM_SCHACH.partieOeffnen(eigene[0].id);
    },

    /* ---------------------------------------------------------------- *
     * Innereien
     * ---------------------------------------------------------------- */

    /* Die eingestellte Spielart: die zuletzt angelegte (gemerkt in
       `spielartMerken`), sonst die erste der Liste. */
    _spielart() {
        let id = null;
        try {
            id = window.localStorage.getItem(START.SCHLUESSEL_SPIELART);
        } catch (fehler) {
            /* Ohne Gerätespeicher (Privatmodus) bleibt die Vorgabe. */
        }
        return SCHACH_VARIANTEN.liste.find((variante) => variante.id === id)
            || SCHACH_VARIANTEN.liste[0];
    },

    /* Gerufen aus `spielartGewaehlt` (team-schach.js), wenn eine Partie
       angelegt wurde — das Vorschaubild zeigt beim nächsten Start diese
       Spielart. */
    spielartMerken(varianteId) {
        try {
            window.localStorage.setItem(START.SCHLUESSEL_SPIELART, varianteId);
        } catch (fehler) {
            /* Dann bleibt es eben bei der Vorgabe. */
        }
    },

    /* Ein gezeichnetes Zahnrad — kein Emoji (Haus-Regel), keine Bilddatei:
       ein Ring mit acht Zähnen, gefärbt über currentColor. */
    _zahnradBauen() {
        const ns = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(ns, "svg");
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("class", "start-zeichen");
        svg.setAttribute("aria-hidden", "true");

        const ring = document.createElementNS(ns, "circle");
        ring.setAttribute("cx", "12");
        ring.setAttribute("cy", "12");
        ring.setAttribute("r", "5");
        ring.setAttribute("fill", "none");
        ring.setAttribute("stroke", "currentColor");
        ring.setAttribute("stroke-width", "2.4");
        svg.appendChild(ring);

        for (let zahn = 0; zahn < 8; zahn++) {
            const winkel = zahn * Math.PI / 4;
            const linie = document.createElementNS(ns, "line");
            linie.setAttribute("x1", String(12 + Math.cos(winkel) * 8));
            linie.setAttribute("y1", String(12 + Math.sin(winkel) * 8));
            linie.setAttribute("x2", String(12 + Math.cos(winkel) * 10.6));
            linie.setAttribute("y2", String(12 + Math.sin(winkel) * 10.6));
            linie.setAttribute("stroke", "currentColor");
            linie.setAttribute("stroke-width", "2.6");
            linie.setAttribute("stroke-linecap", "round");
            svg.appendChild(linie);
        }

        return svg;
    },

    /* Der nach unten zeigende Pfeil des Match-Quadrats. */
    _pfeilBauen() {
        const ns = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(ns, "svg");
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("class", "start-zeichen");
        svg.setAttribute("aria-hidden", "true");

        const pfeil = document.createElementNS(ns, "path");
        pfeil.setAttribute("d", "M7 10 L12 15 L17 10");
        pfeil.setAttribute("fill", "none");
        pfeil.setAttribute("stroke", "currentColor");
        pfeil.setAttribute("stroke-width", "2.6");
        pfeil.setAttribute("stroke-linecap", "round");
        pfeil.setAttribute("stroke-linejoin", "round");
        svg.appendChild(pfeil);

        return svg;
    }
};
