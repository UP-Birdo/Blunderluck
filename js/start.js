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
 *     Match-Einstellungen öffnet (die Spielart-Auswahl);
 *   - darunter still „Runde beitreten" — der Weg zum Zwischenbildschirm.
 *
 * DER WIEDEREINSTIEG (Entwurf, Abschnitt 3.2) wohnt ebenfalls hier: Nach
 * jeder Anmeldung wird die Schach-Tafel nach der eigenen Kennung
 * durchsucht (SCHACH_TAFEL.eigeneLaufende). Genau eine laufende Partie
 * heisst: direkt hinein, ohne Liste. Mehrere sind ein Fehlerzustand und
 * bekommen einen Ausweg (F11). Fremde Partien ziehen niemanden hinein.
 *
 * SEIT WUNSCH 1 (v0.14.0, 24.08.2026) LEGT „SPIELEN" DIE RUNDE AN. Vorher
 * führte der Knopf nur weiter, und angelegt wurde erst mit einem Tipp auf
 * eine Spielart-Kachel — samt Namensfrage. Jetzt hält dieser Bildschirm
 * die WAHL (Spielart und Regler, beides im Gerätespeicher: `_spielart`
 * und `regeln`), und `TEAM_SCHACH.rundeStarten` macht daraus eine Runde.
 * Runden bekommen keinen Namen mehr, nur den Titel der Spielart.
 */

const START = {

    id: "start",
    titel: "Start",

    wurzelEl: null,

    /* Die zuletzt gewählte Spielart — nur eine Geräte-Erinnerung fürs
       Vorschaubild und für „Spielen", kein gemeinsamer Stand. */
    SCHLUESSEL_SPIELART: "blunderluck.start-spielart",

    /* Dasselbe für die Regler der nächsten Runde (seit Wunsch 1) — siehe
       `regeln` weiter unten. */
    SCHLUESSEL_REGELN: "blunderluck.start-regeln",

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

        /* Die Freundesliste ist seit v0.19.0 (Wunsch 6) eine eigene Seite
           INNERHALB des Starts — kein eigener Tab, sondern ein Fenster mit
           Zurück-Knopf, wie die Einstellungen. */
        if (START.freundeOffen) {
            START._freundeZeichnen(wurzel);
            return;
        }

        /* Der Start ist nie ein Fenster — die Tab-Leiste gehört dazu. Wer
           aus einem Fenster (Einstellungen, Partie) hierher zurückkommt,
           bekommt sie so wieder. */
        TABS.rundeSetzen("start", false);

        wurzel.innerHTML = "";

        const seite = document.createElement("div");
        seite.className = "start";

        /*
         * Oben rechts: die Freunde und das Zahnrad (F8; die Freunde seit
         * v0.19.0, Wunsch 6 — „Freunde-Icon neben dem Zahnrad"). Die
         * Reihenfolge ist Absicht: Das Zahnrad bleibt ganz aussen, wo es
         * seit v0.9.0 sitzt.
         */
        const kopf = document.createElement("div");
        kopf.className = "start-kopf";

        const freunde = document.createElement("button");
        freunde.type = "button";
        freunde.className = "start-zahnrad start-freunde";
        freunde.setAttribute("aria-label", "Freunde");
        freunde.title = "Freunde";
        freunde.appendChild(START._freundeZeichenBauen());
        freunde.addEventListener("click", () => START.freundeOeffnen());
        kopf.appendChild(freunde);

        const zahnrad = document.createElement("button");
        zahnrad.type = "button";
        zahnrad.className = "start-zahnrad";
        zahnrad.setAttribute("aria-label", "Einstellungen");
        zahnrad.title = "Einstellungen";
        zahnrad.appendChild(START._zahnradBauen());
        zahnrad.addEventListener("click", () => TABS.wechseln("einstellungen"));
        kopf.appendChild(zahnrad);
        seite.appendChild(kopf);

        /*
         * Obere Hälfte: das Vorschaubild der eingestellten Spielart (F2).
         *
         * SEIT v0.20.0 (Wunsch 7) IST SIE DRÜCKBAR: „Die Schachbrett-
         * Vorschau über Spielen wird drückbar: Ein Tipp darauf öffnet die
         * Wahl der Brettform." Sie ist deshalb ein Knopf und kein `div`
         * mehr — mit Beschriftung für Vorleseprogramme, denn zu sehen ist
         * nur ein Brett.
         */
        const variante = START._spielart();

        const vorschau = document.createElement("button");
        vorschau.type = "button";
        vorschau.className = "start-vorschau";
        vorschau.setAttribute("aria-label",
            "Brettform wählen — eingestellt ist " + variante.titel);
        vorschau.title = "Brettform wählen";
        vorschau.addEventListener("click", () => START.brettformWaehlen());

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

        /*
         * Der Weg zum Zwischenbildschirm (seit Wunsch 1): Seit „Spielen"
         * die Runde selbst anlegt, führt nichts anderes mehr dorthin —
         * dort liegen aber die Einladungen, das Code-Feld und die eigenen
         * Partien. Still gehalten: Die Hauptaktion bleibt „Spielen".
         */
        const beitreten = document.createElement("button");
        beitreten.type = "button";
        beitreten.className = "knopf knopf-still start-beitreten";
        beitreten.textContent = "Runde beitreten";
        beitreten.addEventListener("click", () => START.beitreten());
        seite.appendChild(beitreten);

        wurzel.appendChild(seite);
    },

    /* ---------------------------------------------------------------- *
     * Bedienung
     * ---------------------------------------------------------------- */

    /* ---------------------------------------------------------------- *
     * Die Freundesliste als Seite (Wunsch 6, 24.08.2026)
     *
     * Bis v0.18.0 hing die Karte „Freunde" auf dem Zwischenbildschirm
     * „Spielen" — dort, wo man vor Bündel A seine Mitspieler suchte. Seit
     * „Spielen" die Runde selbst anlegt (Wunsch 1), kommt man dort kaum
     * noch vorbei. Sie hängt deshalb jetzt am eigenen Zeichen oben rechts.
     *
     * Ein Fenster, kein Tab: Die Leiste geht weg, oben links steht der eine
     * Zurück-Knopf (Haus-Muster seit v0.110). Gezeichnet wird die KARTE aus
     * freunde.js — dieselbe wie vorher, nur an einem anderen Ort.
     * ---------------------------------------------------------------- */

    freundeOffen: false,

    _freundeZeichnen(wurzel) {
        TABS.rundeSetzen("start", true);
        wurzel.innerHTML = "";

        const kopfzeile = document.createElement("div");
        kopfzeile.className = "partie-kopf";

        const zurueck = document.createElement("button");
        zurueck.type = "button";
        zurueck.className = "knopf knopf-still knopf-klein";
        zurueck.textContent = "Zurück";
        zurueck.addEventListener("click", () => START.freundeSchliessen());
        kopfzeile.appendChild(zurueck);

        const titel = document.createElement("h2");
        titel.className = "partie-titel";
        titel.textContent = "Freunde";
        kopfzeile.appendChild(titel);
        wurzel.appendChild(kopfzeile);

        wurzel.appendChild(FREUNDE.karteBauen(ICH.person()));
    },

    freundeOeffnen() {
        START.freundeOffen = true;
        START._zeichnen();
    },

    freundeSchliessen() {
        START.freundeOffen = false;
        FREUNDE.suchtext = "";
        START._zeichnen();
    },

    /*
     * „Spielen" LEGT DIE RUNDE AN (Wunsch 1, 24.08.2026) — mit der
     * gemerkten Spielart und den gemerkten Reglern, ohne Namens-Dialog und
     * ohne Zwischenbildschirm. Gebaut wird sie im Team Schach
     * (`TEAM_SCHACH.rundeStarten`); wer schon in einer laufenden Partie
     * steckt, wird dort abgewiesen (F11).
     */
    spielen() {
        return TEAM_SCHACH.rundeStarten(START._spielart().id, START.regeln());
    },

    /* Der stille Knopf darunter: der Weg zum Zwischenbildschirm, auf dem
       Einladungen, das Code-Feld und die eigenen Partien liegen. Erstellt
       wird dort nicht mehr — das macht „Spielen". */
    beitreten() {
        TABS.wechseln("team-schach");
    },

    /* Das Pfeil-Quadrat: die Match-Einstellungen — heute die
       Spielart-Auswahl mit allen Reglern (team-schach-uebersicht.js). */
    matchEinstellungen() {
        TABS.wechseln("team-schach");
        TEAM_SCHACH.partieAnlegen();
    },

    /*
     * Ein Tipp auf die Vorschau (Wunsch 7, v0.20.0): die Wahl der
     * Brettform. Heute führt sie auf denselben Bildschirm wie der Pfeil —
     * dort stehen Brettform und Grössen ja beieinander. Wunsch 8 teilt ihn
     * auf: Der Pfeil behält die Regler, hier bleiben Form und Grösse.
     */
    brettformWaehlen() {
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

    /* Gerufen aus `spielartGewaehlt` (team-schach.js), wenn eine Spielart
       gewählt wurde — das Vorschaubild zeigt beim nächsten Start diese
       Spielart, und „Spielen" legt sie an. */
    spielartMerken(varianteId) {
        try {
            window.localStorage.setItem(START.SCHLUESSEL_SPIELART, varianteId);
        } catch (fehler) {
            /* Dann bleibt es eben bei der Vorgabe. */
        }
    },

    /*
     * Die gemerkten Regler einer künftigen Runde (seit Wunsch 1). Wie die
     * Spielart nur eine GERÄTE-Erinnerung, kein gemeinsamer Stand: Sie
     * sagt, womit „Spielen" die nächste Runde anlegt.
     *
     * Gelesen wird vorsichtig — was im Gerätespeicher liegt, kann von
     * einer älteren Fassung stammen. Deshalb gilt immer die Vorgabe als
     * Grundlage, und nur bekannte Felder werden daraus überschrieben.
     */
    regeln() {
        const vorgabe = TEAM_SCHACH._regelnVorgabe();
        let roh = null;

        try {
            roh = JSON.parse(
                window.localStorage.getItem(START.SCHLUESSEL_REGELN) || "null");
        } catch (fehler) {
            /* Ohne Gerätespeicher oder bei Schrott bleibt die Vorgabe. */
        }
        if (!roh || typeof roh !== "object") {
            return vorgabe;
        }

        for (const feld of Object.keys(vorgabe)) {
            if (Object.prototype.hasOwnProperty.call(roh, feld)
                    && typeof roh[feld] === typeof vorgabe[feld]) {
                vorgabe[feld] = roh[feld];
            }
        }

        /* Die Item-Liste ist die einzige Sammlung — sie muss eine bleiben. */
        if (!Array.isArray(vorgabe.itemAuswahl)) {
            vorgabe.itemAuswahl = [];
        }
        return vorgabe;
    },

    regelnMerken(regeln) {
        try {
            window.localStorage.setItem(
                START.SCHLUESSEL_REGELN, JSON.stringify(regeln || {}));
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

    /*
     * Das Freunde-Zeichen: zwei Personen — je ein Kopf über einer Schulter,
     * die hintere kleiner und versetzt. Wie das Zahnrad gezeichnet statt
     * als Bilddatei, und über currentColor gefärbt (kein Emoji, Haus-Regel).
     */
    _freundeZeichenBauen() {
        const ns = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(ns, "svg");
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("class", "start-zeichen");
        svg.setAttribute("aria-hidden", "true");

        /* Die hintere Person, kleiner und nach rechts versetzt. */
        const kopfHinten = document.createElementNS(ns, "circle");
        kopfHinten.setAttribute("cx", "16.5");
        kopfHinten.setAttribute("cy", "8.5");
        kopfHinten.setAttribute("r", "2.6");
        kopfHinten.setAttribute("fill", "none");
        kopfHinten.setAttribute("stroke", "currentColor");
        kopfHinten.setAttribute("stroke-width", "1.8");
        svg.appendChild(kopfHinten);

        const schulterHinten = document.createElementNS(ns, "path");
        schulterHinten.setAttribute("d", "M14.6 19 C14.6 15.6 16 14.2 18 14.2 C20 14.2 21.4 15.6 21.4 19");
        schulterHinten.setAttribute("fill", "none");
        schulterHinten.setAttribute("stroke", "currentColor");
        schulterHinten.setAttribute("stroke-width", "1.8");
        schulterHinten.setAttribute("stroke-linecap", "round");
        svg.appendChild(schulterHinten);

        /* Die vordere Person — sie überdeckt die hintere. */
        const kopf = document.createElementNS(ns, "circle");
        kopf.setAttribute("cx", "9");
        kopf.setAttribute("cy", "8");
        kopf.setAttribute("r", "3.4");
        kopf.setAttribute("fill", "none");
        kopf.setAttribute("stroke", "currentColor");
        kopf.setAttribute("stroke-width", "2.2");
        svg.appendChild(kopf);

        const schulter = document.createElementNS(ns, "path");
        schulter.setAttribute("d", "M3.4 20 C3.4 15.6 5.8 13.4 9 13.4 C12.2 13.4 14.6 15.6 14.6 20");
        schulter.setAttribute("fill", "none");
        schulter.setAttribute("stroke", "currentColor");
        schulter.setAttribute("stroke-width", "2.2");
        schulter.setAttribute("stroke-linecap", "round");
        svg.appendChild(schulter);

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
