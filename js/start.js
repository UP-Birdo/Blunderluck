/*
 * start.js — der Startbildschirm (seit v0.9.0, Bündel A Schritt 4).
 *
 * Die mittlere der drei Seiten (Fähigkeiten / Start / Rangliste) und das
 * Erste, was ein Angemeldeter ohne laufende Partie sieht:
 *
 *   - oben rechts das MENÜBAND (seit v0.103.0) — ein Knopf mit drei
 *     Balken, dahinter Profil, Einstellungen, Freunde, Verlauf und
 *     „Schach lernen". Bis v0.102.0 standen dort drei einzelne Zeichen
 *     (Verlauf, Freunde, Zahnrad); die Einstellungen sind seit v0.9.0
 *     kein Tab mehr und weiterhin nur von hier aus erreichbar (F8);
 *   - obere Hälfte: das Vorschaubild der eingestellten Spielart, gerechnet
 *     über dieselben Wege wie die echte Partie (F2 — die Kachel-Vorschau
 *     aus team-schach-uebersicht.js, deshalb kann sie nicht veralten). Seit
 *     v0.20.0 ist es ein KNOPF und führt zur Brettform (Wunsch 7/8);
 *   - untere Hälfte: der Spielen-Knopf (zwei Drittel breit, für den
 *     Daumen), daneben ein Quadrat mit Pfeil, das die
 *     Grundeinstellungen der Runde öffnet (Regler und Haken);
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

        /* Die vergangenen Matches, nach demselben Muster (seit v0.37.0). */
        if (START.verlaufOffen) {
            START._verlaufZeichnen(wurzel);
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
         * Oben rechts steht seit v0.103.0 EIN Knopf: das Menüband (drei
         * Balken). Bis dahin lagen dort drei einzelne Zeichen nebeneinander
         * (Verlauf, Freunde, Zahnrad) — sie sind samt Profil und „Schach
         * lernen" in das Menü dahinter gezogen (`_menuebandBauen`).
         */
        const kopf = document.createElement("div");
        kopf.className = "start-kopf";
        kopf.appendChild(START._menuebandBauen());
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

        /*
         * DER NAME UNTER DEM BRETT IST WEG (v0.38.0, Nutzer-Ansage
         * 24.08.2026: „Die Beschreibung auf dem Haupt Tab soll unter dem
         * Brett weg"). Das Bild sagt bereits, welche Spielart eingestellt
         * ist; die Zeile darunter wiederholte es nur und schob den
         * Spielen-Knopf nach unten.
         *
         * FÜR VORLESEPROGRAMME BLEIBT ER: Er steht in der Beschriftung des
         * Vorschau-Knopfes („Brettform wählen — eingestellt ist …"). Wer
         * die Zeile hier je wieder einbaut, prüft zuerst, ob sie dort noch
         * steht — sonst gibt es den Namen zweimal.
         */

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
        match.setAttribute("aria-label", "Grundeinstellungen");
        match.title = "Grundeinstellungen";
        match.appendChild(START._pfeilBauen());
        match.addEventListener("click", () => START.matchEinstellungen());
        zeile.appendChild(match);

        seite.appendChild(zeile);

        /*
         * ZURÜCK IN DIE EIGENE RUNDE (seit v0.34.0).
         *
         * WOZU: Bis v0.33.0 führte der einzige Weg zurück über die Liste
         * „Deine offenen Partien" im Zwischenbildschirm. Der automatische
         * Wiedereinstieg (`START.wiedereinstieg`) hilft nur nach der
         * Anmeldung und nur bei LAUFENDEN Partien — wer seine noch wartende
         * Runde verliess, kam ohne die Liste nur über den Beitritts-Code
         * zurück. Seit der Start die Schaltzentrale ist, gehört diese Tür
         * hierher (Nutzer-Entscheidung 24.08.2026).
         *
         * Gezeigt wird sie nur, wenn es wirklich etwas zu betreten gibt —
         * sonst steht hier nichts im Weg.
         */
        const eigeneOffene = START._eigeneOffene();
        if (eigeneOffene) {
            const zurueck = document.createElement("button");
            zurueck.type = "button";
            zurueck.className = "knopf knopf-still start-zurueck";

            const titel = document.createElement("span");
            titel.className = "start-zurueck-titel";
            titel.textContent = "Zurück in deine Runde";
            zurueck.appendChild(titel);

            const lage = document.createElement("span");
            lage.className = "start-zurueck-lage";
            lage.textContent = eigeneOffene.titel + " — "
                + (eigeneOffene.laeuft
                    ? "läuft"
                    : "wartet auf einen Mitspieler");
            zurueck.appendChild(lage);

            zurueck.addEventListener("click", () => {
                TABS.wechseln("team-schach");
                TEAM_SCHACH.partieOeffnen(eigeneOffene.id);
            });
            seite.appendChild(zurueck);
        }

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
     * DAS MENÜBAND OBEN RECHTS (seit v0.103.0)
     *
     * Nutzer-Ansage 27.08.2026: „packe auf dem haupt screen oben rechts
     * statt den ganzen icons ein menü band hin was von aussen 3 balken sind
     * und dahinter verstecken sich alle weiteren punkte wie Profil als
     * eigner punkt unter den 3 balken und halt einstellungen freunde und
     * verlauf" — dazu (Punkt 36 der ROADMAP) „Schach lernen soll wo ander
     * hin aber nicht bei runde beitreten".
     *
     * Statt drei einzelner Zeichen steht dort jetzt EIN Knopf mit drei
     * Balken; dahinter liegen fünf Punkte, jeder mit seinem bisherigen
     * Zeichen links und der Beschriftung rechts. Vier der fünf Zeichen sind
     * die alten — neu gezeichnet werden musste nur der Balken-Knopf, das
     * Profil (eine Person statt zweier) und das Buch für „Schach lernen".
     *
     * DER AUSSENKLICK IST NACH DEM MUSTER VON v0.96.0 GEBAUT
     * (`TEAM_SCHACH.eckMenueUmschalten` samt `_eckMenueAussenklick` in
     * js\team-schach.js): ein Merker, ein `document`-Horcher, der beim
     * Aufklappen an- und beim Zuklappen wieder abgemeldet wird, und eine
     * `dataset`-Marke am eigenen Kasten, an der der Horcher „drinnen" von
     * „draussen" unterscheidet. Nachgebaut statt geteilt, weil beide Seiten
     * verschieden neu zeichnen (dort `TEAM_SCHACH.zeichnen(daten)`, hier
     * `START._zeichnen()`) — ein gemeinsamer Helfer bräuchte für jeden
     * Unterschied einen Parameter und wäre schwerer zu lesen als beide
     * Fassungen zusammen.
     *
     * EIN UNTERSCHIED ZUM VORBILD: Dort liegen die Menü-Knöpfe IM
     * Kasten-Knopf und müssen ihr Ereignis stoppen. Hier ist der
     * Balken-Knopf ein Geschwister der Liste, beide stecken im selben
     * Halter mit der Marke — kein `stopPropagation` nötig, weil kein Knopf
     * im anderen liegt.
     * ---------------------------------------------------------------- */

    menueOffen: false,

    /* Ist der Aussenklick-Horcher gerade am `document` angemeldet? */
    _menueHorcherAktiv: false,

    /*
     * Die fünf Punkte in ihrer Reihenfolge — Profil zuerst (eigener Punkt,
     * wie gewünscht), dann die drei bisherigen Zeichen, zuletzt der
     * Zugezogene vom Beitritts-Bildschirm.
     *
     * `tun` beschreibt NUR das Ziel; das Zuklappen erledigt `_menueWahl`
     * für alle gemeinsam.
     */
    _menuePunkte() {
        return [
            {
                name: "Profil",
                hinweis: "Name und Passwort ändern",
                zeichen: () => START._profilZeichenBauen(),
                tun: () => ANMELDUNG.profilOeffnen()
            },
            {
                name: "Einstellungen",
                hinweis: "Account, Spieler, Verbindung",
                zeichen: () => START._zahnradBauen(),
                tun: () => TABS.wechseln("einstellungen")
            },
            {
                name: "Freunde",
                hinweis: "Freunde suchen und verwalten",
                zeichen: () => START._freundeZeichenBauen(),
                tun: () => START.freundeOeffnen()
            },
            {
                name: "Verlauf",
                hinweis: "Vergangene Matches",
                zeichen: () => START._verlaufZeichenBauen(),
                tun: () => START.verlaufOeffnen()
            },
            {
                name: "Schach lernen",
                hinweis: "Die Grundregeln: Figuren, Schach, Matt und Patt",
                zeichen: () => START._lernenZeichenBauen(),
                tun: () => {
                    TABS.wechseln("team-schach");
                    TEAM_SCHACH.grundlagenOeffnen();
                }
            }
        ];
    },

    /* Der Halter mit dem Balken-Knopf und — solange offen — der Liste. Er
       trägt die Marke, an der der Aussenklick-Horcher „drinnen" erkennt. */
    _menuebandBauen() {
        const halter = document.createElement("div");
        halter.className = "start-menue-halter";
        halter.dataset.startMenue = "1";

        const knopf = document.createElement("button");
        knopf.type = "button";
        knopf.className = "start-zahnrad start-menueband";
        knopf.setAttribute("aria-label", "Menü");
        knopf.setAttribute("aria-expanded", START.menueOffen ? "true" : "false");
        knopf.title = "Menü";
        knopf.appendChild(START._menuebandZeichenBauen());
        knopf.addEventListener("click", () => START.menueUmschalten());
        halter.appendChild(knopf);

        if (!START.menueOffen) {
            return halter;
        }

        const liste = document.createElement("div");
        liste.className = "start-menue";
        liste.setAttribute("role", "menu");

        for (const punkt of START._menuePunkte()) {
            const eintrag = document.createElement("button");
            eintrag.type = "button";
            eintrag.className = "start-menue-eintrag";
            eintrag.setAttribute("role", "menuitem");
            eintrag.title = punkt.hinweis;
            eintrag.appendChild(punkt.zeichen());

            const text = document.createElement("span");
            text.className = "start-menue-text";
            text.textContent = punkt.name;
            eintrag.appendChild(text);

            eintrag.addEventListener("click", () => START._menueWahl(punkt.tun));
            liste.appendChild(eintrag);
        }

        halter.appendChild(liste);
        return halter;
    },

    menueUmschalten() {
        START.menueOffen = !START.menueOffen;
        if (START.menueOffen) {
            START._menueHorcherAnmelden();
        } else {
            START._menueHorcherAbmelden();
        }
        START._zeichnen();
    },

    /*
     * Ein Menüpunkt wurde gewählt: erst zuklappen und den Start einmal neu
     * zeichnen (dann ist das Menü weg, egal ob der Punkt hier bleibt oder
     * den Tab wechselt), danach das Ziel öffnen. Die Reihenfolge ist
     * Absicht — „Profil" legt einen Dialog ÜBER den Start, und darunter
     * dürfte kein offenes Menü stehenbleiben.
     */
    _menueWahl(tun) {
        START._menueZuklappen();
        START._zeichnen();
        tun();
    },

    /* Zuklappen ohne Neuzeichnen — wer es ruft, zeichnet selbst. */
    _menueZuklappen() {
        START._menueHorcherAbmelden();
        START.menueOffen = false;
    },

    /*
     * An- und Abmelden des Horchers. Beide Wege sind gegen die
     * Testumgebung abgesichert: Dort ist `document` ein Stummel, dessen
     * `addEventListener` nichts tut und dem `removeEventListener` ganz
     * fehlt — der Code darf also nie davon abhängen, dass Ereignisse
     * wirklich feuern (wörtlich dasselbe wie im Vorbild).
     */
    _menueHorcherAnmelden() {
        if (START._menueHorcherAktiv) {
            return;
        }
        if (typeof document === "undefined"
            || typeof document.addEventListener !== "function") {
            return;
        }
        document.addEventListener("click", START._menueAussenklick);
        START._menueHorcherAktiv = true;
    },

    _menueHorcherAbmelden() {
        if (!START._menueHorcherAktiv) {
            return;
        }
        if (typeof document !== "undefined"
            && typeof document.removeEventListener === "function") {
            document.removeEventListener("click", START._menueAussenklick);
        }
        START._menueHorcherAktiv = false;
    },

    /*
     * Der Aussenklick selbst: Vom getroffenen Element wird nach oben
     * gelaufen (`closest` gibt es im Test-DOM nicht, und die Schleife ist
     * genauso deutlich). Trifft der Klick den Halter — also den
     * Balken-Knopf oder einen Menüpunkt —, passiert hier nichts: Das
     * Umschalten macht der Knopf, das Zuklappen der Punkt selbst.
     *
     * Abgemeldet wird IMMER, auch wenn das Menü anderweitig schon zu ist;
     * ein verwaister Horcher bliebe sonst hängen. Neu gezeichnet wird nur,
     * wenn es offen war.
     */
    _menueAussenklick(ereignis) {
        let element = ereignis ? ereignis.target : null;
        while (element) {
            if (element.dataset && element.dataset.startMenue === "1") {
                return;
            }
            element = element.parentElement;
        }

        START._menueHorcherAbmelden();
        if (START.menueOffen) {
            START.menueOffen = false;
            START._zeichnen();
        }
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

    /* ---------------------------------------------------------------- *
     * Die vergangenen Matches als Seite (seit v0.37.0)
     *
     * Nutzer-Ansage 24.08.2026: „Die vergangenen Matches sollen auch nicht
     * bei Runde beitreten stehen sondern oben neben Freunde und
     * Einstellungen ein eigenes Icon." Dasselbe Muster wie die
     * Freundesliste: ein Fenster mit Zurück-Knopf, kein eigener Tab.
     *
     * Gebaut wird die Liste in `TEAM_SCHACH.verlaufKastenBauen` — dort, wo
     * auch die anderen Partie-Karten entstehen.
     * ---------------------------------------------------------------- */

    verlaufOffen: false,

    _verlaufZeichnen(wurzel) {
        TABS.rundeSetzen("start", true);
        wurzel.innerHTML = "";

        const kopfzeile = document.createElement("div");
        kopfzeile.className = "partie-kopf";

        const zurueck = document.createElement("button");
        zurueck.type = "button";
        zurueck.className = "knopf knopf-still knopf-klein";
        zurueck.textContent = "Zurück";
        zurueck.addEventListener("click", () => START.verlaufSchliessen());
        kopfzeile.appendChild(zurueck);

        const titel = document.createElement("h2");
        titel.className = "partie-titel";
        titel.textContent = "Vergangene Matches";
        kopfzeile.appendChild(titel);
        wurzel.appendChild(kopfzeile);

        const person = ICH.person();
        const abgleich = (typeof TEAM_SCHACH !== "undefined")
            ? TEAM_SCHACH.abgleich : null;

        const kasten = (person && abgleich && abgleich.daten)
            ? TEAM_SCHACH.verlaufKastenBauen(abgleich.daten, person)
            : null;

        if (kasten) {
            wurzel.appendChild(kasten);
            return;
        }

        const leer = document.createElement("p");
        leer.className = "erklaerung";
        leer.textContent = "Noch keine beendete Partie. Was du spielst, "
            + "landet hier, sobald es vorbei ist.";
        wurzel.appendChild(leer);
    },

    verlaufOeffnen() {
        START.verlaufOffen = true;
        START._zeichnen();
    },

    verlaufSchliessen() {
        START.verlaufOffen = false;
        START._zeichnen();
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

    /* Das Pfeil-Quadrat: die Grundeinstellungen der nächsten Runde
       (Regler und Haken) — seit Wunsch 8 ohne Brettform und Kacheln. */
    matchEinstellungen() {
        TABS.wechseln("team-schach");
        TEAM_SCHACH.partieAnlegen();
    },

    /* Ein Tipp auf die Vorschau (Wunsch 7/8): Brettform und Grösse. */
    brettformWaehlen() {
        TABS.wechseln("team-schach");
        TEAM_SCHACH.brettformOeffnen();
    },

    /* ---------------------------------------------------------------- *
     * Der Wiedereinstieg nach der Anmeldung (Entwurf, Abschnitt 3.2)
     *
     * Gerufen über ANMELDUNG.beiAngemeldet (verdrahtet in app.js), wenn
     * Spielerliste UND Schach-Tafel geladen sind.
     * ---------------------------------------------------------------- */

    /*
     * Die eine eigene offene Runde, oder nichts (seit v0.34.0). Gefragt beim
     * Zeichnen des Starts — deshalb still: Fehlt die Person oder der
     * Abgleich (ganz am Anfang, vor der Anmeldung), gibt es eben keine.
     *
     * Gibt es mehrere, gewinnt die zuletzt geänderte (`liste` sortiert
     * so). Mehrere sind kein gültiger Zustand, aber der Startbildschirm ist
     * nicht der Ort, das zu klären — das tut `wiedereinstieg`.
     */
    _eigeneOffene() {
        if (typeof TEAM_SCHACH === "undefined" || typeof ICH === "undefined") {
            return null;
        }
        const person = ICH.person();
        const abgleich = TEAM_SCHACH.abgleich;
        if (!person || !abgleich || !abgleich.daten) {
            return null;
        }
        return SCHACH_TAFEL.eigeneOffene(abgleich.daten, person.id)[0] || null;
    },

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

    /*
     * Ein gezeichnetes Zahnrad — kein Emoji (Haus-Regel), keine Bilddatei.
     *
     * BIS v0.101.0 WAR ES EINE SONNE (Nutzer-Meldung 27.08.2026: „sieht aus
     * wie die Sonne und nicht wie ein Zahnrad"). Er hatte recht, und der
     * Grund lag in der Machart: ein dünner Ring mit acht RUNDEN Strichen,
     * die daneben in der Luft standen — das ist das Bildzeichen der Sonne.
     * Einem Zahnrad fehlten dabei drei Dinge: Zähne mit geraden Flanken, die
     * AM Körper sitzen statt neben ihm; eine gefüllte Scheibe statt einer
     * Kontur; und das Loch in der Mitte.
     *
     * Gezeichnet wird deshalb EIN gefüllter Pfad: acht Zahnköpfe auf dem
     * Aussenradius, dazwischen der Fussradius, dazu als zweiter Teilpfad das
     * Loch. `fill-rule="evenodd"` stanzt es aus — so stimmt das Zeichen auf
     * jedem Untergrund, ohne dessen Farbe zu kennen. Gefärbt wird es wie
     * die übrigen Zeichen über `currentColor`.
     */
    _zahnradBauen() {
        const ns = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(ns, "svg");
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("class", "start-zeichen");
        svg.setAttribute("aria-hidden", "true");

        const ZAEHNE = 8;
        const R_KOPF = 10.6;     /* Aussenkante eines Zahns */
        const R_FUSS = 7.6;      /* der Körper zwischen zwei Zähnen */
        const R_LOCH = 3.4;
        const HALB_KOPF = 9;     /* halbe Zahnbreite oben, in Grad */
        const HALB_FUSS = 14;    /* halbe Zahnbreite unten — daher die Flanke */
        const SCHRITT = 360 / ZAEHNE;

        const punkt = (radius, grad) => {
            const bogen = grad * Math.PI / 180;
            return (12 + radius * Math.cos(bogen)).toFixed(2)
                + " " + (12 + radius * Math.sin(bogen)).toFixed(2);
        };

        let pfad = "M " + punkt(R_FUSS, -HALB_FUSS);

        for (let zahn = 0; zahn < ZAEHNE; zahn++) {
            const mitte = zahn * SCHRITT;

            /* Flanke hoch, Zahnkopf entlang, Flanke herunter, dann der
               Bogen des Körpers bis zum nächsten Zahn. */
            pfad += " L " + punkt(R_KOPF, mitte - HALB_KOPF)
                + " A " + R_KOPF + " " + R_KOPF + " 0 0 1 "
                + punkt(R_KOPF, mitte + HALB_KOPF)
                + " L " + punkt(R_FUSS, mitte + HALB_FUSS)
                + " A " + R_FUSS + " " + R_FUSS + " 0 0 1 "
                + punkt(R_FUSS, mitte + SCHRITT - HALB_FUSS);
        }
        pfad += " Z";

        /* Das Loch, als eigener Teilpfad aus zwei Halbbögen. */
        pfad += " M " + punkt(R_LOCH, 0)
            + " A " + R_LOCH + " " + R_LOCH + " 0 1 0 " + punkt(R_LOCH, 180)
            + " A " + R_LOCH + " " + R_LOCH + " 0 1 0 " + punkt(R_LOCH, 0)
            + " Z";

        const rad = document.createElementNS(ns, "path");
        rad.setAttribute("d", pfad);
        rad.setAttribute("fill", "currentColor");
        rad.setAttribute("fill-rule", "evenodd");
        svg.appendChild(rad);

        return svg;
    },

    /*
     * Das Verlauf-Zeichen (seit v0.37.0): eine Uhr — Ring, Zeiger auf zehn
     * nach zwei. Wie die anderen beiden gezeichnet statt als Bilddatei und
     * über currentColor gefärbt (kein Emoji, Haus-Regel).
     */
    _verlaufZeichenBauen() {
        const ns = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(ns, "svg");
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("class", "start-zeichen");
        svg.setAttribute("aria-hidden", "true");

        const ring = document.createElementNS(ns, "circle");
        ring.setAttribute("cx", "12");
        ring.setAttribute("cy", "12");
        ring.setAttribute("r", "8.6");
        ring.setAttribute("fill", "none");
        ring.setAttribute("stroke", "currentColor");
        ring.setAttribute("stroke-width", "2.2");
        svg.appendChild(ring);

        /* Zwei Zeiger: der lange nach oben, der kurze nach rechts. */
        const zeiger = (x2, y2, breite) => {
            const linie = document.createElementNS(ns, "line");
            linie.setAttribute("x1", "12");
            linie.setAttribute("y1", "12");
            linie.setAttribute("x2", String(x2));
            linie.setAttribute("y2", String(y2));
            linie.setAttribute("stroke", "currentColor");
            linie.setAttribute("stroke-width", String(breite));
            linie.setAttribute("stroke-linecap", "round");
            svg.appendChild(linie);
        };

        zeiger(12, 6.4, 2.2);
        zeiger(16, 13.4, 2.2);

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

    /*
     * DAS MENÜBAND-ZEICHEN (seit v0.103.0): drei waagerechte Balken — das
     * Bildzeichen, das der Nutzer wörtlich verlangt hat („von aussen 3
     * balken"). Wie die übrigen Zeichen gezeichnet statt als Bilddatei und
     * über currentColor gefärbt (kein Emoji, Haus-Regel).
     *
     * Gleich lang und gleich weit auseinander: Ein Balken-Knopf mit
     * ungleichen Strichen sieht nach Aufzählung aus, nicht nach Menü.
     */
    _menuebandZeichenBauen() {
        const ns = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(ns, "svg");
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("class", "start-zeichen");
        svg.setAttribute("aria-hidden", "true");

        for (const y of [7, 12, 17]) {
            const balken = document.createElementNS(ns, "line");
            balken.setAttribute("x1", "4.2");
            balken.setAttribute("y1", String(y));
            balken.setAttribute("x2", "19.8");
            balken.setAttribute("y2", String(y));
            balken.setAttribute("stroke", "currentColor");
            balken.setAttribute("stroke-width", "2.2");
            balken.setAttribute("stroke-linecap", "round");
            svg.appendChild(balken);
        }

        return svg;
    },

    /*
     * DAS PROFIL-ZEICHEN (seit v0.103.0): EINE Person, mittig — Kopf über
     * Schulter, dieselbe Machart wie die vordere Person des
     * Freunde-Zeichens. Der Unterschied ist genau der Punkt: Freunde sind
     * zwei, das Profil ist einer.
     */
    _profilZeichenBauen() {
        const ns = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(ns, "svg");
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("class", "start-zeichen");
        svg.setAttribute("aria-hidden", "true");

        const kopf = document.createElementNS(ns, "circle");
        kopf.setAttribute("cx", "12");
        kopf.setAttribute("cy", "8.4");
        kopf.setAttribute("r", "3.6");
        kopf.setAttribute("fill", "none");
        kopf.setAttribute("stroke", "currentColor");
        kopf.setAttribute("stroke-width", "2.2");
        svg.appendChild(kopf);

        const schulter = document.createElementNS(ns, "path");
        schulter.setAttribute("d",
            "M5.4 20 C5.4 15.4 8.2 13.2 12 13.2 C15.8 13.2 18.6 15.4 18.6 20");
        schulter.setAttribute("fill", "none");
        schulter.setAttribute("stroke", "currentColor");
        schulter.setAttribute("stroke-width", "2.2");
        schulter.setAttribute("stroke-linecap", "round");
        svg.appendChild(schulter);

        return svg;
    },

    /*
     * DAS ZEICHEN FÜR „SCHACH LERNEN" (seit v0.103.0): ein aufgeschlagenes
     * Buch — zwei Seiten und der Rücken dazwischen.
     *
     * KEINE FIGUR: Ein Bauer oder ein Springer stünde für das Spiel, nicht
     * fürs Nachlesen — und die Figuren gibt es in dieser App bereits als
     * gerenderte Bilder, ein zweiter, gestrichelter Springer daneben wäre
     * eine falsche Fährte. Das Buch sagt „hier steht, wie es geht".
     */
    _lernenZeichenBauen() {
        const ns = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(ns, "svg");
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("class", "start-zeichen");
        svg.setAttribute("aria-hidden", "true");

        /* Die zwei Seiten, spiegelbildlich um den Rücken bei x = 12. */
        for (const seite of ["M12 6.8 C10 5.3 7.2 4.7 3.6 4.9 V17.5 "
                + "C7.2 17.3 10 17.9 12 19.4",
            "M12 6.8 C14 5.3 16.8 4.7 20.4 4.9 V17.5 "
                + "C16.8 17.3 14 17.9 12 19.4"]) {
            const pfad = document.createElementNS(ns, "path");
            pfad.setAttribute("d", seite);
            pfad.setAttribute("fill", "none");
            pfad.setAttribute("stroke", "currentColor");
            pfad.setAttribute("stroke-width", "2");
            pfad.setAttribute("stroke-linejoin", "round");
            pfad.setAttribute("stroke-linecap", "round");
            svg.appendChild(pfad);
        }

        const ruecken = document.createElementNS(ns, "line");
        ruecken.setAttribute("x1", "12");
        ruecken.setAttribute("y1", "6.8");
        ruecken.setAttribute("x2", "12");
        ruecken.setAttribute("y2", "19.4");
        ruecken.setAttribute("stroke", "currentColor");
        ruecken.setAttribute("stroke-width", "2");
        ruecken.setAttribute("stroke-linecap", "round");
        svg.appendChild(ruecken);

        return svg;
    },

    /*
     * DER TOTENKOPF FÜR DEN FRIEDHOF (seit v0.65.0).
     *
     * Nutzer-Ansage 25.08.2026: „Das F für Friedhof soll zu einem Totenkopf
     * werden." Bis dahin stand dort der Buchstabe F.
     *
     * FREUNDLICH GEZEICHNET, nicht gruselig: runder Schädel, zwei grosse
     * Augen, ein kleines Nasendreieck, eine angedeutete Zahnreihe. Das
     * passt zur Entscheidung „kein Blut, Zielgruppe ab sechs"
     * (`docs\VISION.md`, Abschnitt 6) — ein Totenkopf ist dort so
     * selbstverständlich wie auf einer Piratenflagge, solange er nicht
     * bedrohlich aussieht.
     */
    _totenkopfZeichenBauen() {
        const ns = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(ns, "svg");
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("class", "start-zeichen");
        svg.setAttribute("aria-hidden", "true");

        /* Die Hirnschale mit dem eckigen Kiefer darunter. */
        const schaedel = document.createElementNS(ns, "path");
        schaedel.setAttribute("d",
            "M12 2.6 C6.8 2.6 3.4 6.4 3.4 11 C3.4 13.6 4.6 15.6 6.4 16.8 "
            + "V19.2 C6.4 20.2 7.2 21 8.2 21 H15.8 C16.8 21 17.6 20.2 17.6 19.2 "
            + "V16.8 C19.4 15.6 20.6 13.6 20.6 11 C20.6 6.4 17.2 2.6 12 2.6 Z");
        schaedel.setAttribute("fill", "none");
        schaedel.setAttribute("stroke", "currentColor");
        schaedel.setAttribute("stroke-width", "2");
        schaedel.setAttribute("stroke-linejoin", "round");
        svg.appendChild(schaedel);

        /* Zwei grosse Augen — gefüllt, damit sie auch klein noch tragen. */
        for (const x of [9, 15]) {
            const auge = document.createElementNS(ns, "circle");
            auge.setAttribute("cx", String(x));
            auge.setAttribute("cy", "11");
            auge.setAttribute("r", "2.1");
            auge.setAttribute("fill", "currentColor");
            svg.appendChild(auge);
        }

        /* Das Nasendreieck. */
        const nase = document.createElementNS(ns, "path");
        nase.setAttribute("d", "M12 14 L10.7 16.2 H13.3 Z");
        nase.setAttribute("fill", "currentColor");
        svg.appendChild(nase);

        /* Die Zahnreihe: zwei senkrechte Striche im Kiefer. */
        for (const x of [10.4, 13.6]) {
            const zahn = document.createElementNS(ns, "line");
            zahn.setAttribute("x1", String(x));
            zahn.setAttribute("y1", "18");
            zahn.setAttribute("x2", String(x));
            zahn.setAttribute("y2", "21");
            zahn.setAttribute("stroke", "currentColor");
            zahn.setAttribute("stroke-width", "1.6");
            zahn.setAttribute("stroke-linecap", "round");
            svg.appendChild(zahn);
        }

        return svg;
    },

    /*
     * DAS VERLAUFS-ZEICHEN FÜR DIE ZUGLISTE (seit v0.65.0).
     *
     * Nutzer-Ansage 25.08.2026: „Z soll zu einem Verlaufs-Zeichen ersetzt
     * werden." Bis dahin stand dort der Buchstabe Z.
     *
     * EINE LISTE, KEINE UHR: Das übliche Verlaufs-Zeichen im Browser ist eine
     * Uhr mit Rückwärtspfeil — die ist hier aber schon vergeben
     * (`_verlaufZeichenBauen`, die vergangenen Matches oben in der Leiste).
     * Zwei fast gleiche Uhren an einem Bildschirm wären schlimmer als gar
     * kein Zeichen. Die Zugliste bekommt deshalb, was sie IST: drei Zeilen
     * mit ihrem Aufzählungspunkt.
     */
    _zugverlaufZeichenBauen() {
        const ns = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(ns, "svg");
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("class", "start-zeichen");
        svg.setAttribute("aria-hidden", "true");

        /* Drei Zeilen; die oberste ist die neueste und deshalb am längsten. */
        const zeilen = [
            { y: 6.5, bis: 20.5 },
            { y: 12, bis: 18 },
            { y: 17.5, bis: 15.5 }
        ];

        for (const zeile of zeilen) {
            const punkt = document.createElementNS(ns, "circle");
            punkt.setAttribute("cx", "5");
            punkt.setAttribute("cy", String(zeile.y));
            punkt.setAttribute("r", "1.7");
            punkt.setAttribute("fill", "currentColor");
            svg.appendChild(punkt);

            const strich = document.createElementNS(ns, "line");
            strich.setAttribute("x1", "9");
            strich.setAttribute("y1", String(zeile.y));
            strich.setAttribute("x2", String(zeile.bis));
            strich.setAttribute("y2", String(zeile.y));
            strich.setAttribute("stroke", "currentColor");
            strich.setAttribute("stroke-width", "2");
            strich.setAttribute("stroke-linecap", "round");
            svg.appendChild(strich);
        }

        return svg;
    },

    /*
     * DAS WÜRFEL-ZEICHEN FÜR „NEU AUFSTELLEN" (seit v0.62.0).
     *
     * Nutzer-Entscheidung 25.08.2026: Die Nebenaktionen werden Icons. „Neu
     * aufstellen" bekommt einen Würfel, weil der Knopf genau das tut — die
     * Armee neu WÜRFELN. Er steht deshalb auch nur bei Zufallsarmee da
     * (`TEAM_SCHACH._darfNeuWuerfeln`).
     *
     * Gezeichnet wie die anderen Zeichen (kein Emoji, Haus-Regel), über
     * currentColor gefärbt: ein abgerundetes Quadrat mit fünf Augen.
     */
    _wuerfelZeichenBauen() {
        const ns = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(ns, "svg");
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("class", "start-zeichen");
        svg.setAttribute("aria-hidden", "true");

        const koerper = document.createElementNS(ns, "rect");
        koerper.setAttribute("x", "3.2");
        koerper.setAttribute("y", "3.2");
        koerper.setAttribute("width", "17.6");
        koerper.setAttribute("height", "17.6");
        koerper.setAttribute("rx", "4");
        koerper.setAttribute("fill", "none");
        koerper.setAttribute("stroke", "currentColor");
        koerper.setAttribute("stroke-width", "2.2");
        svg.appendChild(koerper);

        /* Die Fünf: vier Ecken und die Mitte. Weniger Augen wären kleiner zu
           zeichnen, aber schlechter als Würfel zu erkennen. */
        const auge = (x, y) => {
            const punkt = document.createElementNS(ns, "circle");
            punkt.setAttribute("cx", String(x));
            punkt.setAttribute("cy", String(y));
            punkt.setAttribute("r", "1.5");
            punkt.setAttribute("fill", "currentColor");
            svg.appendChild(punkt);
        };

        auge(8.4, 8.4);
        auge(15.6, 8.4);
        auge(12, 12);
        auge(8.4, 15.6);
        auge(15.6, 15.6);

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
