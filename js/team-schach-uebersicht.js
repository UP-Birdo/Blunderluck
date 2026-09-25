/*
 * team-schach-uebersicht.js - die Uebersicht aller Partien und das Anlegen.
 *
 * Teil des Bildschirms TEAM_SCHACH; der Einstieg steht in team-schach.js.
 * Diese Datei ERGAENZT dasselbe Objekt (siehe dort) und wird NACH ihm geladen.
 *
 * Hier drin: die Auswahl der Spielart mit ihren Vorschaubildern, die
 * Einstellungen fuer eine neue Partie und die Liste aller Partien.
 */

Object.assign(TEAM_SCHACH, {
    /* ---------------------------------------------------------------- *
     * Die neue Runde einstellen — EIN Bildschirm, drei Reiter
     *
     * SEIT v0.121.0 (Nutzer-Ansage 24.09.2026: „das Grundeinstellungen-
     * Menü überarbeiten: weniger Texte, mehr Bilder, einfachere Navigation";
     * die Variante „ein Bildschirm, drei Reiter" hat er gewählt). Bis
     * v0.120.1 waren es zwei Bildschirme hinter zwei Einstiegen — die
     * Vorschau führte zur Brettform, der Pfeil zu den Grundeinstellungen
     * (Wunsch 8, v0.21.0) —, und „Spielen" gab es nur auf dem Start.
     *
     * Jetzt:
     *   - Beide Einstiege führen HIERHER, nur in einen anderen Reiter
     *     (Vorschau -> „Brett", Pfeil -> „Gegner"). `auswahlTeil` trägt
     *     den offenen Reiter.
     *   - Jede Wahl ist ein SEGMENT-SCHALTER MIT BILDERN (Bild oben, ein
     *     Wort darunter — das Muster der Figurenzahl) statt eines Hakens
     *     mit Satz. Die Bilder sind die 3D-Figuren und Lootboxen der App
     *     oder schlichte Linienzeichen.
     *   - EIN i je Abschnitt statt eines je Zeile; es sammelt die Sätze,
     *     die vorher neben jedem Schalter hingen.
     *   - Unten klebt „Spielen": Wer hier fertig ist, legt direkt an.
     *   - Die Brett-Kachel wählt nur aus und bleibt hier (bis v0.120.1
     *     schickte sie sofort zurück auf den Start).
     *
     * Gemerkt wird wie bisher bei jedem Zeichnen (`reglerMerken`), die
     * Datenfelder in `neueRegeln` sind unverändert.
     * ---------------------------------------------------------------- */

    AUSWAHL_REITER: [
        { id: "brett", titel: "Brett" },
        { id: "gegner", titel: "Gegner" },
        { id: "lootboxen", titel: "Lootboxen" }
    ],

    _auswahlZeichnen(wurzel) {
        /* Jede Änderung eines Reglers zeichnet neu — also führt jede
           Änderung hier vorbei und wird gemerkt (seit v0.33.0). Warum das
           nötig war und warum es zusätzlich an den Ausgängen steht:
           `TEAM_SCHACH.reglerMerken` in team-schach.js. */
        TEAM_SCHACH.reglerMerken();

        /*
         * DIE AUSWAHL IST EIN FENSTER, KEIN TAB (seit v0.39.0, Nutzer-Ansage
         * 24.08.2026: „unten das Menüband weg, so dass man nur oben zurück
         * hat"). `zeichnen` hat die Leiste ein paar Zeilen vorher wieder
         * eingeschaltet — deshalb steht das hier und nicht dort.
         */
        if (typeof TABS !== "undefined" && TABS.rundeSetzen) {
            TABS.rundeSetzen("team-schach", true);
        }

        const reiter = TEAM_SCHACH._auswahlReiterVon(TEAM_SCHACH.auswahlTeil);
        const seite = TEAM_SCHACH._element("div", "runde-seite");

        seite.appendChild(TEAM_SCHACH._auswahlKopfBauen());
        seite.appendChild(TEAM_SCHACH._auswahlReiterLeisteBauen(reiter));

        if (reiter === "gegner") {
            TEAM_SCHACH._gegnerReiterBauen(seite);
        } else if (reiter === "lootboxen") {
            TEAM_SCHACH._lootboxReiterBauen(seite);
        } else {
            TEAM_SCHACH._brettReiterBauen(seite);
        }

        seite.appendChild(TEAM_SCHACH._auswahlFussBauen());
        wurzel.appendChild(seite);
    },

    /* Aus dem Einstieg den Reiter: „regeln" (der Pfeil, so heisst er seit
       Wunsch 8) öffnet „Gegner", alles Unbekannte das Brett. */
    _auswahlReiterVon(teil) {
        if (teil === "regeln") {
            return "gegner";
        }
        return TEAM_SCHACH.AUSWAHL_REITER.some((eintrag) => eintrag.id === teil)
            ? teil : "brett";
    },

    auswahlReiterSetzen(id) {
        TEAM_SCHACH.auswahlTeil = TEAM_SCHACH._auswahlReiterVon(id);
        TEAM_SCHACH.weichZeichnen();
    },

    /*
     * Der Kopf klebt oben (wie seit v0.116.0): Zurück, Titel und darunter
     * die Dauer-Zeile mit ihrer Quelle (`_regelnDauerBauen`, unverändert).
     */
    _auswahlKopfBauen() {
        const kopf = TEAM_SCHACH._element("div", "partie-kopf partie-kopf-klebt runde-kopf");
        kopf.appendChild(ZUSTAND.alsZurueck(TEAM_SCHACH._knopf("Zurück", "knopf-still knopf-klein",
            () => TEAM_SCHACH.auswahlSchliessen())));
        kopf.appendChild(TEAM_SCHACH._element("h2", "partie-titel", "Neue Runde"));
        kopf.appendChild(TEAM_SCHACH._regelnDauerBauen());
        return kopf;
    },

    /* Die Reiter-Leiste — derselbe Segment-Schalter wie im Profil. */
    _auswahlReiterLeisteBauen(offen) {
        const leiste = TEAM_SCHACH._element("div", "profil-reiter runde-reiter");
        leiste.setAttribute("role", "tablist");

        for (const reiter of TEAM_SCHACH.AUSWAHL_REITER) {
            const aktiv = (reiter.id === offen);
            const knopf = TEAM_SCHACH._knopf(reiter.titel,
                "profil-reiter-knopf runde-reiter-knopf" + (aktiv ? " profil-reiter-aktiv" : ""),
                () => TEAM_SCHACH.auswahlReiterSetzen(reiter.id));
            knopf.setAttribute("role", "tab");
            knopf.setAttribute("aria-selected", aktiv ? "true" : "false");
            knopf.dataset.reiter = reiter.id;
            leiste.appendChild(knopf);
        }
        return leiste;
    },

    /* Unten, klebend: der eine Weg ins Spiel. */
    _auswahlFussBauen() {
        const fuss = TEAM_SCHACH._element("div", "runde-fuss");
        const knopf = TEAM_SCHACH._knopf("Spielen", "knopf-haupt runde-spielen",
            () => TEAM_SCHACH.auswahlSpielen());
        fuss.appendChild(knopf);
        return fuss;
    },

    /*
     * „Spielen" aus der Auswahl: merken, schliessen, anlegen — derselbe
     * Weg wie der Knopf auf dem Start (`START.spielen`), damit Sperre und
     * „Wird angelegt …" nur an einer Stelle wohnen.
     */
    auswahlSpielen() {
        TEAM_SCHACH.reglerMerken();
        TEAM_SCHACH.auswahlOffen = false;
        if (typeof START === "undefined") {
            return null;
        }
        TABS.wechseln("start");
        return START.spielen();
    },

    /* ---------------------------------------------------------------- *
     * Bausteine: Abschnitt, Bild-Reihe, Bilder
     * ---------------------------------------------------------------- */

    /*
     * Ein Abschnitt: eine Karte, oben die Frage mit EINEM i (derselbe Kopf
     * wie bei der Figurenzahl, `leisten-kopf`), darunter die Wahl.
     */
    _abschnittBauen(titel, infoText) {
        const karte = TEAM_SCHACH._element("section", "karte runde-abschnitt");
        const kopf = TEAM_SCHACH._element("div", "leisten-kopf");
        kopf.appendChild(TEAM_SCHACH._element("h3", "", titel));
        if (infoText) {
            kopf.appendChild(TEAM_SCHACH._infoZeichenBauen(titel, infoText));
        }
        karte.appendChild(kopf);
        return karte;
    },

    /*
     * EINE WAHL ALS SEGMENT-SCHALTER MIT BILDERN — das Muster der
     * Figurenzahl-Reihe (seit v0.115.1: Bild oben, Wort klein darunter,
     * die blaue Pille gleitet beim Umschalten), jetzt für jede Wahl.
     *
     * `name` gibt der Reihe ihre Klassen (`<name>-leiste`, `<name>-knopf`,
     * `<name>-knopf-aktiv`) und der Pille ihren Übergangsnamen
     * (`reihen-pille-<name>` in `css\stil-brett.css`) — jede Reihe braucht
     * einen EIGENEN, sonst gleiten zwei Pillen unter demselben Namen und
     * der Browser bricht den Übergang ab. `eintraege` ist eine Liste aus
     * { id, titel, bild (Element oder null), hinweis }.
     */
    _bildReiheBauen(name, eintraege, gewaehltId, beiWahl) {
        const leiste = TEAM_SCHACH._element("div", name + "-leiste bild-leiste");

        for (const eintrag of eintraege) {
            const aktiv = (eintrag.id === gewaehltId);
            const knopf = TEAM_SCHACH._knopf("",
                "knopf-klein bild-knopf " + name + "-knopf"
                    + (aktiv ? " bild-knopf-aktiv " + name + "-knopf-aktiv" : " knopf-still"),
                () => beiWahl(eintrag.id));
            knopf.setAttribute("aria-pressed", aktiv ? "true" : "false");
            knopf.setAttribute("aria-label", eintrag.titel);
            knopf.dataset.wahl = String(eintrag.id);
            if (eintrag.hinweis) {
                knopf.title = eintrag.hinweis;
            }

            const bild = TEAM_SCHACH._element("span", "bild-knopf-bild");
            bild.setAttribute("aria-hidden", "true");
            if (eintrag.bild) {
                bild.appendChild(eintrag.bild);
            }
            knopf.appendChild(bild);
            knopf.appendChild(TEAM_SCHACH._element("span", "bild-knopf-wort", eintrag.titel));

            if (aktiv) {
                knopf.appendChild(TEAM_SCHACH._aktivPille(name));
            }
            leiste.appendChild(knopf);
        }
        return leiste;
    },

    /* Ein Feld aus neueRegeln setzen und neu zeichnen. */
    _regelSetzen(feld, wert) {
        TEAM_SCHACH.neueRegeln[feld] = wert;
        TEAM_SCHACH.weichZeichnen();
    },

    /* Eine 3D-Figur als Bild (dieselben Dateien wie auf dem Brett). */
    FIGUREN_ORDNER: "img/figuren/",

    _figurBildBauen(art, farbe) {
        const bild = document.createElement("img");
        bild.className = "bild-figur";
        bild.src = TEAM_SCHACH.FIGUREN_ORDNER + "figur-" + art + "-" + farbe + ".png";
        bild.alt = "";
        return bild;
    },

    /* Mehrere Bilder nebeneinander in einem Halter. */
    _bildGruppe(teile) {
        const gruppe = TEAM_SCHACH._element("span", "bild-gruppe");
        for (const teil of teile) {
            gruppe.appendChild(teil);
        }
        return gruppe;
    },

    /* Eine Lootbox als Bild (dieselben Dateien wie auf dem Brett). */
    _lootboxKachelBild(stufeId, pech) {
        return TEAM_SCHACH._wuerfelBauen
            ? TEAM_SCHACH._wuerfelBauen({ id: stufeId }, !!pech)
            : null;
    },

    /*
     * Ein Linienzeichen aus Pfaden, über currentColor gefärbt (wie die
     * Zeichen im Menüband — kein Emoji, Haus-Regel). `formen` ist eine
     * Liste aus [tag, attribute]; gefüllt wird nur, was `fill` selbst
     * setzt.
     */
    _linienZeichen(formen) {
        const ns = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(ns, "svg");
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("class", "bild-zeichen");
        svg.setAttribute("aria-hidden", "true");
        for (const [tag, attribute] of formen) {
            const form = document.createElementNS(ns, tag);
            form.setAttribute("fill", "none");
            form.setAttribute("stroke", "currentColor");
            form.setAttribute("stroke-width", "1.8");
            form.setAttribute("stroke-linecap", "round");
            form.setAttribute("stroke-linejoin", "round");
            for (const name of Object.keys(attribute)) {
                form.setAttribute(name, attribute[name]);
            }
            svg.appendChild(form);
        }
        return svg;
    },

    /* Die Zeichen, nach Namen. Was sie zeigen, steht daneben. */
    _zeichen(name) {
        const z = TEAM_SCHACH._linienZeichen;
        switch (name) {
        case "menschen":        /* zwei Personen */
            return z([
                ["circle", { cx: "9", cy: "8", r: "3.4" }],
                ["path", { d: "M3.4 20 C3.4 15.6 5.8 13.4 9 13.4 C12.2 13.4 14.6 15.6 14.6 20" }],
                ["circle", { cx: "16.5", cy: "8.5", r: "2.6" }],
                ["path", { d: "M16.2 14.2 C19.4 14.2 21 16 21 19" }]
            ]);
        case "computer":        /* ein Roboterkopf */
            return z([
                ["rect", { x: "4.5", y: "7", width: "15", height: "12", rx: "3" }],
                ["path", { d: "M12 7 V3.8" }],
                ["circle", { cx: "12", cy: "3", r: "1.1" }],
                ["circle", { cx: "9", cy: "12.5", r: "1.4", fill: "currentColor" }],
                ["circle", { cx: "15", cy: "12.5", r: "1.4", fill: "currentColor" }],
                ["path", { d: "M9.5 16 H14.5" }]
            ]);
        case "welt":            /* ein Globus: öffentlich */
            return z([
                ["circle", { cx: "12", cy: "12", r: "8.5" }],
                ["path", { d: "M3.5 12 H20.5" }],
                ["path", { d: "M12 3.5 C8.8 6.5 8.8 17.5 12 20.5 C15.2 17.5 15.2 6.5 12 3.5" }]
            ]);
        case "schloss":         /* ein Vorhängeschloss: privat */
            return z([
                ["rect", { x: "5", y: "10.5", width: "14", height: "9.5", rx: "2" }],
                ["path", { d: "M8 10.5 V7.5 C8 5 9.8 3.5 12 3.5 C14.2 3.5 16 5 16 7.5 V10.5" }],
                ["path", { d: "M12 14.2 V16.4" }]
            ]);
        case "wuerfel":         /* ein Würfel mit fünf Augen: Zufall */
            return z([
                ["rect", { x: "4", y: "4", width: "16", height: "16", rx: "3.5" }],
                ["circle", { cx: "8.5", cy: "8.5", r: "1.2", fill: "currentColor" }],
                ["circle", { cx: "15.5", cy: "8.5", r: "1.2", fill: "currentColor" }],
                ["circle", { cx: "12", cy: "12", r: "1.2", fill: "currentColor" }],
                ["circle", { cx: "8.5", cy: "15.5", r: "1.2", fill: "currentColor" }],
                ["circle", { cx: "15.5", cy: "15.5", r: "1.2", fill: "currentColor" }]
            ]);
        case "blitz":           /* ein Blitz: sofort */
            return z([
                ["path", { d: "M13.5 3 L6 13.5 H11.5 L10.5 21 L18 10.5 H12.5 Z" }]
            ]);
        case "einig":           /* ein Haken im Kreis: alle einig */
            return z([
                ["circle", { cx: "12", cy: "12", r: "8.5" }],
                ["path", { d: "M8 12.3 L10.9 15.2 L16.2 9.2" }]
            ]);
        case "brett":           /* ein leeres Brett: ohne Lootboxen */
            return z([
                ["rect", { x: "3.5", y: "3.5", width: "17", height: "17", rx: "1.5" }],
                ["rect", { x: "3.5", y: "3.5", width: "5.67", height: "5.67", fill: "currentColor", stroke: "none" }],
                ["rect", { x: "14.83", y: "3.5", width: "5.67", height: "5.67", fill: "currentColor", stroke: "none" }],
                ["rect", { x: "9.17", y: "9.17", width: "5.67", height: "5.67", fill: "currentColor", stroke: "none" }],
                ["rect", { x: "3.5", y: "14.83", width: "5.67", height: "5.67", fill: "currentColor", stroke: "none" }],
                ["rect", { x: "14.83", y: "14.83", width: "5.67", height: "5.67", fill: "currentColor", stroke: "none" }]
            ]);
        case "quadrat":
            return z([["rect", { x: "5", y: "5", width: "14", height: "14", rx: "1.5" }]]);
        case "rechteck":
            return z([["rect", { x: "3.5", y: "7", width: "17", height: "10", rx: "1.5" }]]);
        case "kreuz":
            return z([["path", { d: "M9 3.5 H15 V9 H20.5 V15 H15 V20.5 H9 V15 H3.5 V9 H9 Z" }]]);
        default:
            return null;
        }
    },

    /* Welches Zeichen zu welcher Brettform (`SCHACH_VARIANTEN.FORMEN`). */
    FORM_ZEICHEN: { klassisch: "quadrat", rechteckig: "rechteck", kreuz: "kreuz" },

    /* Stärke als vier Balken, die ersten `n` gefüllt. */
    _staerkeZeichen(n) {
        const formen = [];
        for (let stelle = 0; stelle < 4; stelle++) {
            const hoehe = 5 + stelle * 4;
            formen.push(["rect", {
                x: String(3 + stelle * 5), y: String(20 - hoehe),
                width: "3.4", height: String(hoehe), rx: "1",
                fill: (stelle < n) ? "currentColor" : "none"
            }]);
        }
        return TEAM_SCHACH._linienZeichen(formen);
    },

    /* ---------------------------------------------------------------- *
     * Reiter 1: Brett
     * ---------------------------------------------------------------- */

    _brettReiterBauen(seite) {
        /* Form und Grösse — die Kachel wählt nur aus und bleibt hier. */
        const brett = TEAM_SCHACH._abschnittBauen("Brett",
            "Erst die Form, dann die Grösse. Das Bild zeigt die Startaufstellung "
            + "mit der Figurenzahl, die darunter eingestellt ist.");

        brett.appendChild(TEAM_SCHACH._bildReiheBauen("form",
            SCHACH_VARIANTEN.FORMEN.map((form) => ({
                id: form.id, titel: form.titel,
                bild: TEAM_SCHACH._zeichen(TEAM_SCHACH.FORM_ZEICHEN[form.id])
            })),
            TEAM_SCHACH.gewaehlteForm,
            (id) => {
                TEAM_SCHACH.gewaehlteForm = id;
                TEAM_SCHACH.weichZeichnen();
            }));

        const gewaehlt = (typeof START !== "undefined") ? START._spielart().id : "";
        const feld = TEAM_SCHACH._element("div", "spielart-feld runde-spielarten");
        for (const variante of SCHACH_VARIANTEN.zurAuswahlNachForm(TEAM_SCHACH.gewaehlteForm)) {
            feld.appendChild(TEAM_SCHACH._spielartKachelBauen(variante, variante.id === gewaehlt));
        }
        brett.appendChild(feld);
        seite.appendChild(brett);

        /* Figuren je Seite — die Knöpfe mit Zahl und Muster (v0.115.1). */
        seite.appendChild(TEAM_SCHACH._armeeStaerkeLeisteBauen());

        /* Aufstellung: gewohnt oder gewürfelt, und beim Würfeln gleich
           oder verschieden. */
        const aufstellung = TEAM_SCHACH._abschnittBauen("Aufstellung",
            "Gewohnt: die Aufstellung der Spielart. Zufall: gewürfelte Figuren — "
            + "wie viele, sagt die Figurenzahl darüber. Selten sind es ZWEI Könige: "
            + "Dann hast du zwei Leben.\n\nGleich: beide Seiten bekommen dieselben "
            + "Figuren, spiegelbildlich. Verschieden: jede Seite würfelt für sich.");

        aufstellung.appendChild(TEAM_SCHACH._bildReiheBauen("aufstellung", [
            { id: "gewohnt", titel: "Gewohnt", bild: TEAM_SCHACH._bildGruppe([
                TEAM_SCHACH._figurBildBauen("dame", "weiss"),
                TEAM_SCHACH._figurBildBauen("koenig", "weiss")]) },
            { id: "zufall", titel: "Zufall", bild: TEAM_SCHACH._zeichen("wuerfel") }
        ], TEAM_SCHACH.neueRegeln.zufallsArmee ? "zufall" : "gewohnt",
        (id) => TEAM_SCHACH._regelSetzen("zufallsArmee", id === "zufall")));

        if (TEAM_SCHACH.neueRegeln.zufallsArmee) {
            aufstellung.appendChild(TEAM_SCHACH._bildReiheBauen("armeen", [
                { id: "gleich", titel: "Beide gleich", bild: TEAM_SCHACH._bildGruppe([
                    TEAM_SCHACH._figurBildBauen("turm", "weiss"),
                    TEAM_SCHACH._figurBildBauen("turm", "schwarz")]) },
                { id: "verschieden", titel: "Verschieden", bild: TEAM_SCHACH._bildGruppe([
                    TEAM_SCHACH._figurBildBauen("dame", "weiss"),
                    TEAM_SCHACH._figurBildBauen("bauer", "schwarz")]) }
            ], TEAM_SCHACH.neueRegeln.armeeUnterschiedlich ? "verschieden" : "gleich",
            (id) => TEAM_SCHACH._regelSetzen("armeeUnterschiedlich", id === "verschieden")));
        }
        seite.appendChild(aufstellung);
    },

    /* ---------------------------------------------------------------- *
     * Reiter 2: Gegner — gegen wen, wer sieht es, wie wird gezogen
     * ---------------------------------------------------------------- */

    _gegnerReiterBauen(seite) {
        const regeln = TEAM_SCHACH.neueRegeln;

        const gegen = TEAM_SCHACH._abschnittBauen("Gegen wen?",
            "Menschen: andere Spieler kommen über Code, Link oder die Liste der "
            + "offenen Runden dazu. Computer: er sitzt in Schwarz und zieht von "
            + "selbst — solche Runden zählen nicht für die Rangliste.");
        gegen.appendChild(TEAM_SCHACH._bildReiheBauen("gegner", [
            { id: "menschen", titel: "Menschen", bild: TEAM_SCHACH._zeichen("menschen") },
            { id: "computer", titel: "Computer", bild: TEAM_SCHACH._zeichen("computer") }
        ], regeln.gegenComputer ? "computer" : "menschen",
        (id) => TEAM_SCHACH._regelSetzen("gegenComputer", id === "computer")));
        seite.appendChild(gegen);

        if (regeln.gegenComputer) {
            /* Wie stark er spielt — die Stufen und Sätze aus dem Modell. */
            const staerke = TEAM_SCHACH._abschnittBauen("Wie stark?",
                SCHACH_BOT.STUFEN.map((stufe) => stufe.titel + ": " + stufe.hinweis).join("\n")
                + "\n\nEine laufende Partie behält ihre Stufe.");
            staerke.appendChild(TEAM_SCHACH._bildReiheBauen("bot",
                SCHACH_BOT.STUFEN.map((stufe, stelle) => ({
                    id: stufe.id, titel: stufe.titel, hinweis: stufe.hinweis,
                    bild: TEAM_SCHACH._staerkeZeichen(stelle + 1)
                })),
                regeln.botStufe,
                (id) => TEAM_SCHACH._regelSetzen("botStufe", id)));
            seite.appendChild(staerke);
        } else {
            /* Wer die Runde sieht — nur, wenn Menschen dazukommen sollen. */
            const bilder = { oeffentlich: "welt", freunde: "menschen", privat: "schloss" };
            const sicht = TEAM_SCHACH._abschnittBauen("Sichtbar für wen?",
                SCHACH_RUNDE.SICHTBARKEITEN.map((stufe) => stufe.titel + ": " + stufe.hinweis)
                    .join("\n")
                + "\n\nDen Code gibt es in jeder Stufe — wer ihn hat, kommt immer hinein.");
            sicht.appendChild(TEAM_SCHACH._bildReiheBauen("sichtbarkeit",
                SCHACH_RUNDE.SICHTBARKEITEN.map((stufe) => ({
                    id: stufe.id, titel: stufe.titel, hinweis: stufe.hinweis,
                    bild: TEAM_SCHACH._zeichen(bilder[stufe.id] || "welt")
                })),
                regeln.sichtbarkeit,
                (id) => TEAM_SCHACH._regelSetzen("sichtbarkeit", id)));
            seite.appendChild(sicht);
        }

        /* Die Seiten: zulosen oder selbst wählen. */
        const seiten = TEAM_SCHACH._abschnittBauen("Wer spielt Weiss?",
            "Zulosen (Vorgabe): Jeder bekommt seine Farbe beim Betreten — es geht "
            + "sofort ans Brett. Selbst wählen: Vorher kommt ein Bildschirm mit "
            + "Weiss, Schwarz und Zufall.");
        seiten.appendChild(TEAM_SCHACH._bildReiheBauen("seiten", [
            { id: "zulosen", titel: "Zulosen", bild: TEAM_SCHACH._zeichen("wuerfel") },
            { id: "waehlen", titel: "Selbst wählen", bild: TEAM_SCHACH._bildGruppe([
                TEAM_SCHACH._figurBildBauen("koenig", "weiss"),
                TEAM_SCHACH._figurBildBauen("koenig", "schwarz")]) }
        ], regeln.seiteZufaellig ? "zulosen" : "waehlen",
        (id) => TEAM_SCHACH._regelSetzen("seiteZufaellig", id === "zulosen")));
        seite.appendChild(seiten);

        /* Ziehen im Team: alle einig (Vorgabe) oder wer zuerst zieht.
           Gespeichert bleibt `einigkeit` mit derselben Bedeutung (v0.76). */
        const team = TEAM_SCHACH._abschnittBauen("Ziehen im Team",
            "Alle einig (Vorgabe): Ein Zug zählt erst, wenn ALLE aus dem Team "
            + "denselben gemacht haben; die Vorschläge stehen durchsichtig auf dem "
            + "Brett. Wer nicht mitzieht, wird nach Ablauf der Frist übergangen.\n\n"
            + "Wer zuerst zieht: Jeder zieht sofort für sein ganzes Team.");
        team.appendChild(TEAM_SCHACH._bildReiheBauen("einigkeit", [
            { id: "einig", titel: "Alle einig", bild: TEAM_SCHACH._zeichen("einig") },
            { id: "sofort", titel: "Wer zuerst zieht", bild: TEAM_SCHACH._zeichen("blitz") }
        ], regeln.einigkeit ? "einig" : "sofort",
        (id) => TEAM_SCHACH._regelSetzen("einigkeit", id === "einig")));
        seite.appendChild(team);
    },

    /* ---------------------------------------------------------------- *
     * Reiter 3: Lootboxen
     * ---------------------------------------------------------------- */

    _lootboxReiterBauen(seite) {
        const regeln = TEAM_SCHACH.neueRegeln;

        const an = TEAM_SCHACH._abschnittBauen("Mit Lootboxen?",
            "Auf freien Feldern erscheinen Lootboxen. Wer darüberzieht, sammelt "
            + "eine Fähigkeit oder ein Unglück ein.");
        an.appendChild(TEAM_SCHACH._bildReiheBauen("lootbox", [
            { id: "aus", titel: "Ohne", bild: TEAM_SCHACH._zeichen("brett") },
            { id: "an", titel: "Mit Lootboxen", bild: TEAM_SCHACH._lootboxKachelBild("lila", false) }
        ], regeln.faehigkeiten ? "an" : "aus",
        (id) => TEAM_SCHACH._regelSetzen("faehigkeiten", id === "an")));

        /* Der Weg in die Bibliothek: alle Fähigkeiten mit Bildanleitung. */
        an.appendChild(TEAM_SCHACH._knopf("Alle Fähigkeiten",
            "knopf-still knopf-klein runde-bibliothek", () => TEAM_SCHACH.faehigkeitenOeffnen()));
        seite.appendChild(an);

        if (!regeln.faehigkeiten) {
            return;
        }

        /* Wie viele — je Stufe eine Lootbox mehr im Bild. */
        const stufen = SCHACH_VARIANTEN.STUFEN;
        const menge = TEAM_SCHACH._abschnittBauen("Wie viele?",
            SCHACH_VARIANTEN.LOOTBOX_MENGEN
                .filter((eintrag) => !!eintrag.hinweis)
                .map((eintrag) => eintrag.titel + ": " + eintrag.hinweis).join("\n"));
        menge.appendChild(TEAM_SCHACH._bildReiheBauen("mengen",
            SCHACH_VARIANTEN.LOOTBOX_MENGEN.map((eintrag, stelle) => ({
                id: eintrag.id, titel: eintrag.titel, hinweis: eintrag.hinweis,
                bild: TEAM_SCHACH._bildGruppe(stufen.slice(0, Math.min(stelle + 1, stufen.length))
                    .map((stufe) => TEAM_SCHACH._lootboxKachelBild(stufe.id, false))
                    .filter((teil) => !!teil))
            })),
            regeln.lootboxMenge,
            (id) => TEAM_SCHACH._regelSetzen("lootboxMenge", id)));
        seite.appendChild(menge);

        /* Welche Items — die Mengen als Kacheln, die eigene Wahl darunter. */
        const vorrat = TEAM_SCHACH._abschnittBauen("Welche Items?",
            SCHACH_VARIANTEN.ITEM_VORRAETE
                .filter((eintrag) => !!eintrag.hinweis)
                .map((eintrag) => eintrag.titel + ": " + eintrag.hinweis).join("\n"));
        const mengen = SCHACH_VARIANTEN.ITEM_VORRAETE.filter((eintrag) => !eintrag.eigeneWahl);
        vorrat.appendChild(TEAM_SCHACH._bildReiheBauen("vorrat",
            mengen.map((eintrag, stelle) => ({
                id: eintrag.id, titel: eintrag.titel, hinweis: eintrag.hinweis,
                bild: TEAM_SCHACH._bildGruppe(stufen
                    .slice(0, Math.max(1, Math.round((stelle + 1) * stufen.length / mengen.length)))
                    .map((stufe) => TEAM_SCHACH._lootboxKachelBild(stufe.id, false))
                    .filter((teil) => !!teil))
            })),
            regeln.itemVorrat,
            (id) => TEAM_SCHACH._regelSetzen("itemVorrat", id)));
        vorrat.appendChild(TEAM_SCHACH._eigeneWahlKnopfBauen());
        seite.appendChild(vorrat);

        /* Sieht man, was drin ist? Ein Bild für jede Antwort. */
        const seltenheit = TEAM_SCHACH._abschnittBauen("Inhalt sichtbar?",
            "Farbig: Jede Lootbox trägt schon auf dem Brett die Farbe ihrer Stufe, "
            + "eine schlechte ihr Fragezeichen. Verdeckt: Alle sehen gleich aus — "
            + "man weiss erst beim Einsammeln, was es war.");
        const wechsel = TEAM_SCHACH._element("span", "schalter-bild schalter-bild-fenster");
        wechsel.appendChild(TEAM_SCHACH._lootboxWechselBauen());
        seltenheit.appendChild(TEAM_SCHACH._bildReiheBauen("seltenheit", [
            { id: "verdeckt", titel: "Verdeckt", bild: TEAM_SCHACH._lootboxKachelBild("unbekannt", false) },
            { id: "farbig", titel: "Farbig", bild: wechsel }
        ], regeln.seltenheitZeigen ? "farbig" : "verdeckt",
        (id) => {
            /* Ein Wert für beide Felder (seit v0.115.3, `entschieden.md`). */
            regeln.pechZeigen = (id === "farbig");
            TEAM_SCHACH._regelSetzen("seltenheitZeigen", id === "farbig");
        }));
        seite.appendChild(seltenheit);
    },

    /*
     * DIE OFFENEN RUNDEN, DIE MAN SEHEN DARF (seit v0.118.0, Nutzer-Ansage
     * 18.09.2026: „unter Runde beitreten soll man auch seine Freunde
     * sehen, welche gerade eine Runde offen haben, und dort beitreten").
     *
     * Gezeigt werden WARTENDE Runden — nicht gestartet, nicht beendet —,
     * in denen man nicht selbst sitzt (die eigene erreicht man über den
     * Start), und die `SCHACH_RUNDE.sichtbarFuer` freigibt: öffentliche
     * für jeden, „Freunde"-Runden, wenn jemand darin ein Freund ist. Ob
     * jemand ein Freund ist, weiss die Spielerliste (`SPIELER.freundschaft`)
     * — die Regeln bekommen dafür eine Frage-Funktion mit.
     *
     * Je Runde: die Namen derer, die schon darin sitzen (der erste ist
     * meist der Ersteller), die Spielart, ein Schildchen „Freund" oder
     * „Öffentlich", und „Beitreten" — derselbe Weg wie über den Code
     * (`partieOeffnen`), im Vorraum wählt oder lost man dann die Seite.
     */
    _offeneRundenBauen(tafel, person) {
        const karte = TEAM_SCHACH._element("section", "karte offene-runden");
        karte.appendChild(TEAM_SCHACH._element("h3", "", "Offene Runden"));

        const spielerDaten = (typeof ANMELDUNG !== "undefined" && ANMELDUNG.abgleich)
            ? ANMELDUNG.abgleich.daten : null;
        const istFreund = (id) => !!spielerDaten
            && SPIELER.freundschaft(spielerDaten, person.id, id) === "freunde";

        const wartende = SCHACH_TAFEL.liste(tafel).filter((partie) =>
            !partie.ergebnis && !partie.laeuft
            && !SCHACH_RUNDE.teamVon(partie, person.id)
            && SCHACH_RUNDE.sichtbarFuer(partie, person.id, istFreund));

        /* Leer mit Ausweg (UPCrew-Standard, seit v0.140.0): Wartet keine
           Runde, macht man selbst eine auf — derselbe Weg wie „Spielen" auf
           dem Start. Hier erscheinen öffentliche Runden und die der Freunde. */
        if (wartende.length === 0) {
            karte.appendChild(ZUSTAND.leer({
                zeichen: "leer", text: "Keine Runde offen",
                aktion: {
                    text: "Selbst starten",
                    beiKlick: () => {
                        TABS.wechseln("start");
                        START.spielen();
                    }
                }
            }));
            return karte;
        }

        for (const partie of wartende) {
            const mitglieder = partie.teams.weiss.concat(partie.teams.schwarz);
            const mitFreund = mitglieder.some(istFreund);

            const zeile = TEAM_SCHACH._element("div", "offene-runde");

            const text = TEAM_SCHACH._element("div", "offene-runde-text");
            const wer = TEAM_SCHACH._element("span", "offene-runde-wer");
            if (mitglieder.length === 0) {
                wer.textContent = "Noch niemand";
            }
            /* Jeder Name führt ins Profil (seit v0.119.0). */
            mitglieder.forEach((id, stelle) => {
                if (stelle > 0) {
                    wer.appendChild(document.createTextNode(", "));
                }
                wer.appendChild(TEAM_SCHACH._nameKnopfBauen(id));
            });
            text.appendChild(wer);
            text.appendChild(TEAM_SCHACH._element("span", "offene-runde-was",
                SCHACH_RUNDE.varianteVon(partie).titel
                + " — " + SCHACH_RUNDE.kurzfassung(partie)));
            zeile.appendChild(text);

            zeile.appendChild(TEAM_SCHACH._element("span",
                "chip " + (mitFreund ? "chip-fertig" : "chip-offen"),
                mitFreund ? "Freund" : "Öffentlich"));

            zeile.appendChild(TEAM_SCHACH._knopf("Beitreten", "knopf-still knopf-klein",
                () => TEAM_SCHACH.partieOeffnen(partie.id)));

            karte.appendChild(zeile);
        }

        return karte;
    },

    /*
     * DIE DAUER-ZEILE IM KLEBENDEN KOPF (seit v0.116.0).
     *
     * Dieselbe Rechnung wie unter der Spielart-Kachel (`SCHACH_RUNDE.dauerText`,
     * seit v0.93): erwartete Halbzüge aus Figurenzahl und Brettgrösse, mal
     * die gemessenen Sekunden je Halbzug aus den gespielten Partien, mal
     * der Lootbox-Zuschlag. Der Bildschirm rechnet nichts selbst — er holt
     * das Brett, das die eingestellte Spielart mit den aktuellen Reglern
     * WIRKLICH ergäbe (`_vorschauBrett`, also mit Armeestärke und
     * Zufallsarmee), und fragt das Modell.
     *
     * Weil jeder Knopfdruck neu zeichnet (`weichZeichnen`), zieht die Zahl
     * bei jeder Änderung mit: mehr Figuren, grösseres Brett, mehr
     * Lootboxen — die Zeile sagt sofort, was das kostet.
     *
     * Darunter steht, WORAUF die Schätzung fusst: „aus 12 gespielten
     * Partien" — oder dass es noch keine gibt und der Richtwert gilt. Ohne
     * diesen Satz wäre die Zahl eine Behauptung.
     */
    _regelnDauerBauen() {
        const variante = (typeof START !== "undefined")
            ? START._spielart()
            : SCHACH_VARIANTEN.holen("standard");
        const brett = TEAM_SCHACH._vorschauBrett(variante);
        const partien = TEAM_SCHACH._gespieltePartien();

        const zeile = TEAM_SCHACH._element("div", "regeln-dauer");
        zeile.setAttribute("aria-live", "polite");

        zeile.appendChild(TEAM_SCHACH._element("span", "regeln-dauer-wert",
            "Dauer: " + SCHACH_RUNDE.dauerText(
                TEAM_SCHACH._figurenJeSeite(brett),
                variante.breite * variante.hoehe,
                TEAM_SCHACH.neueRegeln,
                partien)));

        const gezaehlt = SCHACH_RUNDE.messungVon(partien).gezaehlt;
        zeile.appendChild(TEAM_SCHACH._element("span", "regeln-dauer-quelle",
            (gezaehlt > 0)
                ? ("geschätzt · " + gezaehlt
                    + ((gezaehlt === 1) ? " Partie" : " Partien"))
                : "Richtwert · noch nicht gemessen"));

        return zeile;
    },

    /*
     * Ein kleines i, das einen Text in einem Hinweis zeigt (seit v0.52).
     *
     * Es gibt schon `_infoKnopfBauen` — der führt aber fest in die
     * Fähigkeiten-Bibliothek. Dieses hier trägt seinen Text bei sich und ist
     * überall einsetzbar, wo ein Absatz den Bildschirm aufbläht.
     */
    /*
     * DER KOPF EINER KNOPFREIHE: Frage links, i rechts (seit v0.105).
     *
     * NUTZER-ANSAGE 21.08.: „Generell zu viel Texte überall — kürze die Infos
     * so, dass man sie noch versteht, und verstecke sie so, dass sie beim
     * normalen Nutzen nicht sichtbar sind, aber nicht verschwinden."
     *
     * Bis v0.104 stand unter jeder der drei Reihen ein ganzer Satz zur gerade
     * gewählten Stufe. Drei Reihen mal ein Satz, dazu sieben Haken mit je einem
     * Satz — der Anlege-Bildschirm war zu zwei Dritteln Text, und die Kacheln,
     * die man antippen will, standen ganz unten. Jetzt steht die Erklärung
     * hinter dem i, und zwar für ALLE Stufen auf einmal: Wer sie liest, will
     * ohnehin vergleichen, und ein Text, der nur die gewählte Stufe erklärt,
     * musste bei jedem Knopfdruck neu gelesen werden.
     *
     * Die Texte kommen aus dem Modell (`hinweis` je Stufe) — der Bildschirm
     * denkt sich keine Regeln aus (eiserne Regel).
     */
    /* `alsUeberschrift` (seit v0.109): Steht die Reihe in einer eigenen
       Karte, trägt der Kopf ein h3 wie die Nachbar-Karten — als Unterpunkt
       im Einstellungs-Kasten bleibt es der kleinere Titel. */
    _leistenKopfBauen(titel, stufen, nachsatz, alsUeberschrift) {
        const kopf = TEAM_SCHACH._element("div", "leisten-kopf");

        kopf.appendChild(alsUeberschrift
            ? TEAM_SCHACH._element("h3", "", titel)
            : TEAM_SCHACH._element("span", "schalter-titel", titel));

        const zeilen = stufen
            .filter((stufe) => !!stufe.hinweis)
            .map((stufe) => stufe.titel + ": " + stufe.hinweis);

        if (nachsatz) {
            zeilen.push("");
            zeilen.push(nachsatz);
        }

        kopf.appendChild(TEAM_SCHACH._infoZeichenBauen(titel, zeilen.join("\n")));

        return kopf;
    },

    _infoZeichenBauen(titel, text) {
        const knopf = document.createElement("button");

        knopf.type = "button";
        knopf.className = "info-knopf";
        knopf.textContent = "i";
        knopf.setAttribute("aria-label", titel);
        knopf.title = titel;
        knopf.addEventListener("click", (ereignis) => {
            /* Sonst schaltet der Klick zusätzlich den Haken der Zeile um. */
            if (ereignis && ereignis.preventDefault) {
                ereignis.preventDefault();
            }
            DIALOG.hinweis(titel, text);
        });

        return knopf;
    },

    /*
     * DIE KNOPFREIHE FÜR DIE FIGURENZAHL (seit v0.86, Wunsch V1).
     *
     * Gebaut wie die Lootbox-Mengen — dieselbe Reihe, dieselben Klassen; wer
     * die eine bedienen kann, kann auch die andere. Sie steht IMMER da, auch
     * ohne den Haken „Zufallsarmee": Die Ansage war „immer bei der Auswahl
     * ganz oben". Ohne den Haken sagt der Hinweis, dass die Spielart ihre
     * eigene Aufstellung mitbringt — die Reihe verschwindet nicht, sonst
     * springt der Bildschirm beim Haken-Setzen.
     */
    /*
     * DER KNOPF FÜR DIE EIGENE WAHL — und was er anzeigt.
     *
     * Er trägt den STAND (wie viele von wie vielen), nicht die Erklärung: Das
     * ist die einzige Angabe, die man beim Anlegen wirklich sehen muss. Der
     * erste Druck hakt alles an und öffnet das Popup; man streicht weg, was man
     * nicht will — das ist weniger Arbeit als zwanzigmal anhaken, und die Liste
     * ist nie leer.
     */
    _eigeneWahlKnopfBauen() {
        const stufe = SCHACH_VARIANTEN.ITEM_VORRAETE.find(
            (eintrag) => eintrag.eigeneWahl);
        const aktiv = (TEAM_SCHACH.neueRegeln.itemVorrat === stufe.id);

        /* Gezählt werden EINTRÄGE, nicht Fähigkeiten (seit v0.115.2): Das
           Paar Enttarnen/Verstecken ist im Popup ein Eintrag, also muss
           der Knopf „19 von 19" sagen, nicht „20 von 20". */
        const eintraege = TEAM_SCHACH._itemEintraege();
        const gewaehlt = eintraege.filter((eintrag) =>
            TEAM_SCHACH._itemEintragDrin(eintrag)).length;
        const alle = eintraege.length;

        const knopf = TEAM_SCHACH._knopf(
            aktiv
                ? ("Selbst gewählt: " + gewaehlt + " von " + alle + " — ändern")
                : (stufe.titel + " ..."),
            "knopf-klein vorrat-eigene"
                + (aktiv ? " vorrat-knopf-aktiv" : " knopf-still"),
            () => {
                TEAM_SCHACH.neueRegeln.itemVorrat = stufe.id;

                if (TEAM_SCHACH.neueRegeln.itemAuswahl.length === 0) {
                    TEAM_SCHACH.neueRegeln.itemAuswahl = TEAM_SCHACH._alleItems();
                }

                TEAM_SCHACH._itemAuswahlOeffnen();
            });

        knopf.setAttribute("aria-pressed", aktiv ? "true" : "false");

        /* Auch hier wandert nur die farbige Fläche (siehe `_aktivPille`) —
           derselbe Name wie in der Mengen-Reihe darüber, denn aktiv ist
           immer nur EINER von beiden. */
        if (aktiv) {
            knopf.appendChild(TEAM_SCHACH._aktivPille("vorrat"));
        }

        return knopf;
    },

    /*
     * DIE LISTE ZUM ANHAKEN (seit v0.100).
     *
     * Gezeigt wird, was in dieser Partie überhaupt vorkommen KANN — also
     * `faehigkeitenDerStufe` je Stufe, dieselbe Quelle wie Ziehung und
     * Bibliothek. Versteckte Fähigkeiten stehen deshalb gar nicht erst drin.
     *
     * MINDESTENS EINS BLEIBT ANGEHAKT (Nutzer-Vorgabe). Das letzte Kästchen
     * lässt sich nicht ausschalten; wer es versucht, bekommt einen Hinweis
     * statt einer leeren Liste. Eine leere Liste hiesse im Modell „keine
     * Einschränkung", also das Gegenteil von dem, was man gerade wollte.
     */
    /* Jede Fähigkeit, die es zu wählen gibt — dieselbe Quelle wie Ziehung und
       Bibliothek, also ohne die versteckten. */
    _alleItems() {
        const liste = [];

        for (const stufe of SCHACH_VARIANTEN.STUFEN) {
            for (const art of SCHACH_VARIANTEN.faehigkeitenDerStufe(stufe.id)) {
                liste.push(art);
            }
        }
        return liste;
    },

    /*
     * DIE EINTRÄGE DES POPUPS (seit v0.115.2) — je Stufe, und ein Eintrag
     * kann ZWEI Fähigkeiten tragen.
     *
     * Nutzer-Ansage 18.09.2026: „Seltenheit anzeigen ja/nein sollen keine
     * zwei Punkte sein, das eine grenzt das andere ja aus." Enttarnen und
     * Verstecken standen als zwei Kästchen da, obwohl in einer Partie nur
     * eins von beiden vorkommt — welches, sagt der Haken „Seltenheit
     * anzeigen" (`SCHACH_VARIANTEN.gegenstueckVon`). Jetzt sind sie EIN
     * Eintrag „Enttarnen / Verstecken", der beide zusammen an- und
     * abhakt.
     *
     * GESPEICHERT WIRD WEITER JE FÄHIGKEIT (`itemAuswahl` trägt beide
     * Schlüssel) — additiver Datenvertrag, und `erlaubteFaehigkeiten`
     * siebt in der Partie ohnehin die passende heraus. Zusammengefasst
     * wird nur, was der Bildschirm zeigt.
     */
    _itemEintraege(stufeId) {
        const eintraege = [];
        const schonDrin = [];

        for (const stufe of SCHACH_VARIANTEN.STUFEN) {
            if (stufeId && stufe.id !== stufeId) {
                continue;
            }

            for (const art of SCHACH_VARIANTEN.faehigkeitenDerStufe(stufe.id)) {
                if (schonDrin.indexOf(art) !== -1) {
                    continue;
                }

                const arten = [art];
                const gegenstueck = SCHACH_VARIANTEN.gegenstueckVon(art);
                if (gegenstueck) {
                    arten.push(gegenstueck);
                }

                schonDrin.push(...arten);
                eintraege.push({
                    arten: arten,
                    titel: arten.map(SCHACH_VARIANTEN.faehigkeitTitel).join(" / ")
                });
            }
        }

        return eintraege;
    },

    /* Angehakt ist ein Eintrag, sobald EINE seiner Fähigkeiten gewählt ist —
       so zählt auch eine Auswahl von vor v0.115.2, die nur eine der zwei
       trug, als angehakt und wird beim nächsten Tipp vervollständigt. */
    _itemEintragDrin(eintrag) {
        const gewaehlt = TEAM_SCHACH.neueRegeln.itemAuswahl;
        return eintrag.arten.some((art) => gewaehlt.indexOf(art) !== -1);
    },

    /*
     * DIE AUSWAHL STEHT IM POPUP (seit v0.105, Nutzer-Ansage 21.08.: „bei
     * selbst wählen soll statt dieser scrollbaren Liste ein Popup-Menü
     * kommen").
     *
     * Bis v0.104 hing die Ankreuzliste mitten im Anlege-Bildschirm, in einem
     * Kasten mit eigener Höhe und eigenem Rollbalken — zwei Rollbalken
     * ineinander, und die Kacheln darunter waren weg. Der Dialog bringt seinen
     * eigenen mit (`dialog-kasten`, 90 vh), also braucht die Liste hier keinen:
     * Sie darf so hoch werden, wie sie ist.
     *
     * Die Kästchen schreiben direkt in `neueRegeln.itemAuswahl` und zeichnen
     * NUR sich selbst neu (`_itemAuswahlFuellen`). Ein `TEAM_SCHACH.zeichnen`
     * bei jedem Haken würde den Bildschirm HINTER dem offenen Dialog neu
     * aufbauen — der Dialog bliebe stehen, aber sein Auslöser wäre ein anderes
     * Element als das, was man gerade sieht. Neu gezeichnet wird deshalb erst
     * beim Schliessen; dann stimmt auch die Zahl auf dem Knopf wieder.
     */
    _itemAuswahlOeffnen() {
        const halter = TEAM_SCHACH._element("div", "item-auswahl");

        TEAM_SCHACH._itemAuswahlFuellen(halter);

        DIALOG.hinweis("Welche Items?",
            "Angehakt = kommt vor · "
            + "mindestens eins",
            halter).then(() => TEAM_SCHACH.weichZeichnen());
    },

    _itemAuswahlFuellen(halter) {
        halter.innerHTML = "";

        for (const stufe of SCHACH_VARIANTEN.STUFEN) {
            const eintraege = TEAM_SCHACH._itemEintraege(stufe.id);
            if (eintraege.length === 0) {
                continue;
            }

            halter.appendChild(TEAM_SCHACH._element("div",
                "item-auswahl-stufe stufe-" + stufe.id, stufe.titel));

            for (const eintrag of eintraege) {
                halter.appendChild(TEAM_SCHACH._itemHakenBauen(eintrag, halter));
            }
        }

        return halter;
    },

    /* Ein Kästchen je EINTRAG (seit v0.115.2 statt je Fähigkeit): Der Tipp
       hakt alle Fähigkeiten des Eintrags zusammen an oder ab. */
    _itemHakenBauen(eintrag, halter) {
        const gewaehlt = TEAM_SCHACH.neueRegeln.itemAuswahl;
        const drin = TEAM_SCHACH._itemEintragDrin(eintrag);

        const knopf = TEAM_SCHACH._knopf(
            (drin ? "[x] " : "[ ] ") + eintrag.titel,
            "knopf-klein item-haken" + (drin ? " item-haken-an" : " knopf-still"),
            () => {
                if (!drin) {
                    for (const art of eintrag.arten) {
                        if (gewaehlt.indexOf(art) === -1) {
                            gewaehlt.push(art);
                        }
                    }
                    TEAM_SCHACH._itemAuswahlFuellen(halter);
                    return;
                }

                /* Mindestens EIN Eintrag bleibt — gezählt nach Einträgen,
                   sonst liesse sich das Paar als „zwei" abhaken und die
                   Liste wäre leer. */
                const bleibt = TEAM_SCHACH._itemEintraege().filter((anderer) =>
                    anderer.titel !== eintrag.titel
                    && TEAM_SCHACH._itemEintragDrin(anderer)).length;

                if (bleibt === 0) {
                    DIALOG.hinweis("Mindestens ein Item",
                        "Sonst Lootboxen leer · erst anderes anhaken");
                    return;
                }

                for (const art of eintrag.arten) {
                    const stelle = gewaehlt.indexOf(art);
                    if (stelle !== -1) {
                        gewaehlt.splice(stelle, 1);
                    }
                }
                TEAM_SCHACH._itemAuswahlFuellen(halter);
            });

        knopf.setAttribute("aria-pressed", drin ? "true" : "false");

        /* Der Mauszeiger-Text: der erste Satz jeder Fähigkeit; beim Paar
           dazu, wer von beiden entscheidet. */
        knopf.title = eintrag.arten.map(SCHACH_VARIANTEN.faehigkeitKurz).join(" ")
            + ((eintrag.arten.length > 1)
                ? " Welches von beiden es gibt, entscheidet der Haken \"Seltenheit anzeigen\"."
                : "");

        return knopf;
    },

    _armeeStaerkeLeisteBauen() {
        /*
         * EINE EIGENE KARTE (seit v0.109) wie „Einstellungen" und „Welche
         * Brettform?". Bis v0.108 trug die Reihe die Unterpunkt-Klasse samt
         * Einrück-Strich — der zeigt aber eine Zugehörigkeit an, und diese
         * Reihe gehört zu keinem Haken: Der Strich hing im Leeren
         * (Nutzer-Meldung 22.08.). Eigene Klassen (`armee-*`), nicht die der
         * Lootbox-Mengen — mit denselben hielte ein Test die eine Reihe für
         * die andere.
         */
        const karte = TEAM_SCHACH._element("section", "karte armee-karte");

        karte.appendChild(TEAM_SCHACH._leistenKopfBauen("Figuren je Seite",
            SCHACH_VARIANTEN.ARMEE_STAERKEN,
            "Ohne den Haken „Zufallsarmee“ bleibt die Aufstellung der Spielart "
            + "stehen, nur eben schmaler oder tiefer.", true));

        const leiste = TEAM_SCHACH._element("div", "armee-leiste");

        for (const staerke of SCHACH_VARIANTEN.ARMEE_STAERKEN) {
            const aktiv = (staerke.id === TEAM_SCHACH.neueRegeln.armeeStaerke);

            /*
             * DER KNOPF ZEIGT SEIT v0.109.0 EIN BILD (Nutzer-Ansage
             * 28.08.2026: „Beispielbilder statt Texten"). Vier Wörter —
             * wenig, normal, viel, voll — sagten nichts darüber, wie das
             * Brett hinterher aussieht. Seit v0.115.1 ist das Bild die
             * Zahl plus das Belegungs-Muster (`_armeeVorschauBauen` sagt,
             * warum das Mini-Brett nicht taugte). Das Wort bleibt klein
             * darunter stehen: Es ist der Name der Wahl und steht so auch
             * in der Sprachausgabe.
             */
            const knopf = TEAM_SCHACH._knopf("",
                "knopf-klein armee-knopf" + (aktiv ? " armee-knopf-aktiv" : " knopf-still"),
                () => {
                    TEAM_SCHACH.neueRegeln.armeeStaerke = staerke.id;
                    TEAM_SCHACH.weichZeichnen();
                });

            const bild = TEAM_SCHACH._armeeVorschauBauen(staerke.id);
            if (bild) {
                knopf.appendChild(bild);
            }

            knopf.appendChild(TEAM_SCHACH._element("span", "armee-wort",
                staerke.titel));

            knopf.setAttribute("aria-label",
                staerke.titel + " Figuren: " + staerke.hinweis);
            knopf.setAttribute("aria-pressed", aktiv ? "true" : "false");

            if (aktiv) {
                knopf.appendChild(TEAM_SCHACH._aktivPille("armee"));
            }

            leiste.appendChild(knopf);
        }

        karte.appendChild(leiste);

        return karte;
    },

    /*
     * DIE WECHSELNDE BOX (seit v0.115.3): ein Streifen aus allen Stufen-
     * Boxen plus einer Unglücks-Box in der ersten Stufenfarbe, der im
     * Kasten des Bildes Schritt für Schritt nach links fährt — reine CSS-
     * Animation (`lootbox-wechsel` in `css\stil-brett.css`), kein Zeitgeber,
     * also nichts, das beim Neuzeichnen aufgeräumt werden müsste.
     *
     * Wie viele Bilder es sind, weiss nur diese Funktion; der Streifen
     * bekommt Schrittzahl und Dauer deshalb von hier als Inline-Stil, die
     * Stildatei rechnet damit. Ändert sich die Zahl der Stufen, ändert sich
     * die Animation mit.
     */
    _lootboxWechselBauen() {
        const stufen = SCHACH_VARIANTEN.STUFEN;
        const streifen = TEAM_SCHACH._element("span", "lootbox-wechsel");

        for (const stufe of stufen) {
            streifen.appendChild(TEAM_SCHACH._wuerfelBauen(stufe, false));
        }
        streifen.appendChild(TEAM_SCHACH._wuerfelBauen(stufen[0], true));

        const bilder = stufen.length + 1;
        streifen.style.setProperty("--wechsel-bilder", String(bilder));

        /* `steps(n, jump-none)` hat n Haltepunkte, den Anfang und das Ende
           eingeschlossen — also genau so viele wie Bilder. (Mit bilder - 1
           stand die Box zwischen zwei Bildern; im Browser gesehen, 18.09.) */
        streifen.style.setProperty("animation-timing-function",
            "steps(" + bilder + ", jump-none)");
        streifen.style.setProperty("animation-duration", (bilder * 1.1) + "s");

        return streifen;
    },

    /*
     * ZAHL UND MUSTER AUF EINEM ARMEE-KNOPF (seit v0.115.1; v0.109.0 bis
     * v0.115.0 ein ganzes Mini-Brett)
     *
     * GERECHNET, NICHT GEMALT — mit demselben Weg, den die Spielart-Kachel
     * seit v0.100 geht (`kreuzAufstellen` + `aufstellungAnpassen`) und den
     * auch die echte Partie nimmt. Ein gemaltes Beispiel wäre die zweite
     * Wahrheit, die beim ersten Umbau der Stärken abweicht; genau daran ist
     * v0.86/v0.87 gescheitert (`erkenntnisse.md`).
     *
     * WARUM NICHT MEHR DAS GANZE MINI-BRETT (Nutzer-Meldung 18.09.2026:
     * „die Anzahl-Ansicht oben sieht nicht gut aus"): Im Browser
     * nachgesehen — auf Handy-Breite ist jeder Knopf rund 75 Pixel breit,
     * ein Feld also 9 Pixel und eine Figur 6. Das Brett wurde zu einem
     * Strichcode aus 64 Kacheln mit Plattenrand, die Figuren zu Flecken,
     * und die vier Bilder sahen gleich aus: Ob 16 oder 24 Figuren, sieht
     * man an einem Fleckenteppich nicht. Die Karte fragt „Wie viele?" —
     * und das Bild gab keine Zahl.
     *
     * JETZT: oben die ZAHL (die Antwort auf die Frage, gezählt am
     * gerechneten Brett), darunter das MUSTER der eigenen Brett-Hälfte —
     * flache Felder, belegt oder frei, ohne Plattenrand und ohne
     * Figurenbilder. Vier Reihen mal acht Felder bleiben auch bei 9 Pixeln
     * je Feld lesbar, und die vier Muster unterscheiden sich auf den
     * ersten Blick: ein Block, zwei Reihen, drei Reihen, fast alles.
     * Gezeigt wird die Hälfte von Weiss (die unteren Reihen), so wie der
     * Spieler sein Brett auf dem Start sieht; das Muster wächst von der
     * Kante zur Mitte.
     *
     * IMMER AUF DEM KLASSISCHEN BRETT, auch wenn hinterher Kreuz gespielt
     * wird: Der Knopf zeigt das MUSTER der Stärke (mittiger Block, volle
     * Breite, eine Reihe mehr, bis zur Mitte), und das ist auf acht mal acht
     * am deutlichsten. Welches Brett gespielt wird, sagt die Vorschau
     * darüber — diese vier Bilder beantworten eine andere Frage.
     *
     * OHNE ZUFALLSARMEE, auch wenn der Haken gesetzt ist: Vier gewürfelte
     * Bilder nebeneinander wären vier verschiedene Zufälle, und der
     * Unterschied zwischen den Stärken ginge im Rauschen unter.
     */
    _armeeVorschauBauen(staerkeId) {
        if (!SCHACH_RUNDE.kreuzAufstellen || !SCHACH_RUNDE.aufstellungAnpassen) {
            return null;
        }

        const variante = SCHACH_VARIANTEN.holen("standard");

        let runde = SCHACH_RUNDE.leereRunde(0, variante.id,
            "vorschau-armee-" + staerkeId, "");

        runde.regeln.armeeStaerke = staerkeId;

        /* Wie in der Spielart-Kachel: Eine Vorschau ist immer eine NEUE
           Partie und rechnet deshalb nach der neuen Fassung. */
        runde.regeln.armeeFassung = 1;

        runde = SCHACH_RUNDE.kreuzAufstellen(runde, "");
        runde = SCHACH_RUNDE.aufstellungAnpassen(runde);

        const brett = runde.stand.brett;

        const halter = TEAM_SCHACH._element("div", "armee-vorschau");

        /* Die Zahl: Figuren EINER Seite, dieselbe Zählung wie auf der
           Spielart-Kachel („16 Figuren je Seite"). */
        halter.appendChild(TEAM_SCHACH._element("span", "armee-zahl",
            String(TEAM_SCHACH._figurenJeSeite(brett))));

        /* Das Muster: die untere Hälfte des Bretts (Weiss), je Feld nur
           „belegt" oder „frei" — keine Figur, keine Feldfarbe. */
        const muster = TEAM_SCHACH._element("div", "armee-muster");
        muster.style.setProperty("--muster-spalten", String(variante.breite));
        muster.setAttribute("aria-hidden", "true");

        const ersteReihe = Math.floor(variante.hoehe / 2);
        for (let reihe = ersteReihe; reihe < variante.hoehe; reihe++) {
            for (let spalte = 0; spalte < variante.breite; spalte++) {
                const belegt = (brett[reihe * variante.breite + spalte] !== ".");
                muster.appendChild(TEAM_SCHACH._element("span",
                    "armee-muster-feld" + (belegt ? " armee-muster-belegt" : "")));
            }
        }
        halter.appendChild(muster);

        return halter;
    },

    /*
     * DIE FARBIGE FLÄCHE DES AKTIVEN KNOPFS IST EIN EIGENES ELEMENT (seit
     * v0.109). Beim weichen Neuzeichnen wandert nur SIE zum neuen Knopf — der
     * Text bleibt stehen. Bis v0.108 trug der Knopf selbst den
     * `view-transition-name`: Dann wanderte er MITSAMT Beschriftung, und
     * „wenig" verschmierte sichtbar zu „normal" (Nutzer-Meldung 22.08.).
     *
     * Die Pille liegt hinter dem Text (`z-index: -1`) und trägt je Reihe
     * ihren eigenen Namen (`stil-brett.css`). Ohne View-Transitions ist sie
     * einfach
     * der Hintergrund — die Optik ist dieselbe.
     */
    _aktivPille(reihe) {
        const pille = TEAM_SCHACH._element("span",
            "reihen-pille reihen-pille-" + reihe);

        pille.setAttribute("aria-hidden", "true");
        return pille;
    },

    /*
     * DIE BRETT-KACHEL (seit v0.121.0 schlank): Bild, Name mit Massen und
     * die Figurenzahl. Die Dauer steht im klebenden Kopf, die Beschreibung
     * im Mauszeiger-Text. `gewaehlt` hebt die Kachel hervor — sie wählt
     * seit v0.121.0 nur aus und bleibt auf dem Bildschirm.
     */
    _spielartKachelBauen(variante, gewaehlt) {
        const kachel = document.createElement("button");
        kachel.type = "button";
        kachel.className = "spielart-kachel" + (gewaehlt ? " spielart-kachel-aktiv" : "");
        kachel.setAttribute("aria-pressed", gewaehlt ? "true" : "false");
        kachel.title = variante.beschreibung || variante.titel;
        kachel.addEventListener("click", () => TEAM_SCHACH.spielartGewaehlt(variante.id));

        /*
         * MIT ZUFALLSARMEE ZEIGT DIE KACHEL EIN BEISPIEL (seit v0.83,
         * Nutzer-Wunsch 18.08.: „bei Zufall auch gleich ein Beispiel zeigen,
         * wie es sein kann").
         *
         * Gerechnet mit derselben Funktion, die auch die echte Partie
         * aufstellt — ein gemaltes Beispiel wäre die zweite Wahrheit, die
         * beim ersten Umbau abweicht. Die Saat hängt an der Spielart, das
         * Bild bleibt deshalb beim Neuzeichnen stehen und flackert nicht.
         */
        const brett = TEAM_SCHACH._vorschauBrett(variante);

        kachel.appendChild(TEAM_SCHACH._vorschauBauen(variante, brett));

        const kopf = TEAM_SCHACH._element("div", "spielart-kopf");
        kopf.appendChild(TEAM_SCHACH._element("span", "spielart-titel", variante.titel));
        kopf.appendChild(TEAM_SCHACH._element("span", "spielart-masse",
            variante.breite + " mal " + variante.hoehe));
        kachel.appendChild(kopf);

        /*
         * WIE VIELE FIGUREN JE SEITE (seit v0.83, „die Vorschau soll schon die
         * Anzahl anzeigen"). Gezählt wird aus dem Brett, das die Kachel WIRKLICH
         * zeigt — mit Zufallsarmee steht dort also die gewürfelte Zahl, nicht
         * die der vollen Aufstellung.
         *
         * Sind beide Seiten gleich stark, steht eine Zahl da; das ist der
         * Normalfall. Nur wenn sie sich unterscheiden (Haken „unterschiedliche
         * Armeen"), werden beide genannt — sonst wäre die eine Zahl gelogen.
         */
        kachel.appendChild(TEAM_SCHACH._element("span", "spielart-anzahl",
            TEAM_SCHACH._figurenText(brett)));

        /*
         * DIE DAUER STEHT SEIT v0.121.0 NICHT MEHR AUF DER KACHEL (v0.93 bis
         * v0.120.1 stand sie hier, samt Beschreibungssatz): Der klebende
         * Kopf zeigt sie für das gewählte Brett, und ein Tipp auf eine
         * andere Kachel wählt sie aus — die Zeile oben rechnet dann mit.
         * So bleibt die Kachel ein Bild mit Namen (Nutzer-Ansage 24.09.2026:
         * „weniger Texte, mehr Bilder").
         */

        return kachel;
    },

    /*
     * Das Brett, das die Kachel zeigt: die feste Aufstellung — oder ein
     * gewürfeltes Beispiel, wenn der Haken „Zufallsarmee" gesetzt ist.
     *
     * Gebaut wird das Beispiel über `SCHACH_RUNDE.armeeAufstellen`, also über
     * den öffentlichen Weg, den auch die echte Partie geht. Damit stimmt es
     * auch auf dem Kreuz (dort stellt `_armeeStandKreuz` seit v0.76 je
     * Startseite auf) und beim Haken „unterschiedliche Armeen".
     */
    _vorschauBrett(variante) {
        let runde = SCHACH_RUNDE.leereRunde(0, variante.id,
            "vorschau-" + variante.id, "");

        /*
         * OHNE HAKEN ZEIGT DIE KACHEL DIE FESTE AUFSTELLUNG — seit v0.100 aber
         * auf den Regler zugeschnitten, genau wie die Partie sie anlegt.
         * Vorher gab sie hier stumpf `variante.aufstellung` zurück; der Regler
         * bewegte das Bild also nur mit Haken, und ohne ihn versprach die
         * Kachel eine Aufstellung, die so gar nicht kam.
         *
         * Gerechnet wird über DENSELBEN Weg wie beim Anlegen. Eine Vorschau,
         * die aus einer anderen Quelle rechnet als das Ergebnis, bestätigt
         * einen Fehler, statt ihn zu zeigen — genau das ist in v0.86/v0.87
         * passiert (`erkenntnisse.md`).
         */
        if (TEAM_SCHACH.neueRegeln.zufallsArmee !== true) {
            runde.regeln.armeeStaerke = TEAM_SCHACH.neueRegeln.armeeStaerke;

            /* Die Vorschau ist immer eine NEUE Partie — sie rechnet deshalb
               nach der neuen Regel (siehe `armeeFassung`). */
            runde.regeln.armeeFassung = 1;

            runde = SCHACH_RUNDE.kreuzAufstellen(runde, "");
            runde = SCHACH_RUNDE.aufstellungAnpassen(runde);
            return runde.stand.brett;
        }

        runde.regeln.zufallsArmee = true;
        runde.regeln.armeeUnterschiedlich =
            (TEAM_SCHACH.neueRegeln.armeeUnterschiedlich === true);

        /* Dieselbe Stärke wie beim Anlegen (seit v0.86) — sonst zeigt die
           Kachel eine andere Zahl, als die Partie hinterher aufstellt. */
        runde.regeln.armeeStaerke = TEAM_SCHACH.neueRegeln.armeeStaerke;

        runde = SCHACH_RUNDE.armeeAufstellen(runde, "");
        return runde.stand.brett;
    },

    /*
     * Die Figurenzahl EINER Seite — die Grundlage der Dauer-Schätzung. Genommen
     * wird Weiss; unterscheiden sich die Seiten (Haken „unterschiedliche
     * Armeen"), ist das nah genug für einen groben Anhaltspunkt.
     */
    _figurenJeSeite(brett) {
        let anzahl = 0;

        for (const zeichen of brett) {
            if (zeichen !== "." && zeichen === zeichen.toUpperCase()) {
                anzahl++;
            }
        }

        return anzahl;
    },

    /*
     * Die Partien, aus denen die Zeitmessung lernt: alles, was auf der Tafel
     * liegt. Beendete wie laufende — beide tragen echte Sekunden und echte
     * Züge bei, und `sekundenJeHalbzug` verwirft von selbst, was zu kurz ist.
     */
    _gespieltePartien() {
        const daten = TEAM_SCHACH.abgleich && TEAM_SCHACH.abgleich.daten;
        if (!daten || !daten.partien) {
            return [];
        }

        /*
         * `partien` IST EINE TABELLE NACH KENNUNG, KEINE LISTE — und genau
         * daran ist die Messung von v0.93 bis v0.115.3 gescheitert: Hier
         * stand `Array.isArray(daten.partien) ? daten.partien : []`, was
         * bei einer Tabelle IMMER die leere Liste ergab. Die Schätzung
         * lief damit seit ihrem ersten Tag mit dem Richtwert, ohne je zu
         * lernen; aufgefallen am 18.09.2026, als die Dauer-Zeile ihre
         * Quelle nennen sollte und der Test „2 gespielten Partien" an
         * `concat is not a function` scheiterte. `SCHACH_TAFEL.liste`
         * ist der eine Weg von der Tabelle zur Liste (v0.116.0).
         */
        return SCHACH_TAFEL.liste(daten);
    },

    /* „12 Figuren je Seite" — oder beide Zahlen, wenn sie sich unterscheiden. */
    _figurenText(brett) {
        let weiss = 0;
        let schwarz = 0;

        for (const zeichen of brett) {
            if (zeichen === ".") {
                continue;
            }
            if (zeichen === zeichen.toUpperCase()) {
                weiss++;
            } else {
                schwarz++;
            }
        }

        if (weiss === schwarz) {
            return weiss + " Figuren je Seite";
        }
        return weiss + " gegen " + schwarz + " Figuren";
    },

    /*
     * Das Vorschaubild: ein Miniaturbrett aus DERSELBEN Aufstellung, aus der
     * auch das echte Brett entsteht. Deshalb kann es nicht veralten — wer eine
     * Spielart ändert, ändert ihr Bild automatisch mit. Eine gezeichnete Datei
     * je Spielart wäre die zweite Wahrheit, die irgendwann von der ersten
     * abweicht.
     */
    _vorschauBauen(variante, brett) {
        /* `brett` ist wahlfrei — ohne Angabe die feste Aufstellung der
           Spielart (seit v0.83; davor gab es nur diese eine Quelle). */
        const stellung = brett || variante.aufstellung;

        const vorschau = TEAM_SCHACH._element("div", "vorschau");
        vorschau.style.setProperty("--vorschau-spalten", String(variante.breite));

        const felder = variante.breite * variante.hoehe;

        /* Die toten Ecken eines Kreuz-Bretts gehören ins Vorschaubild — sonst
           sähe die Kachel aus wie ein gewöhnliches Quadrat (seit v0.63). */
        const ecken = variante.kreuz ? SCHACH_VARIANTEN.kreuzEcken(variante) : [];

        for (let feld = 0; feld < felder; feld++) {
            const reihe = Math.floor(feld / variante.breite);
            const spalte = feld % variante.breite;

            const zelle = TEAM_SCHACH._element("div",
                "vorschau-feld " + (((reihe + spalte) % 2 === 0) ? "feld-hell" : "feld-dunkel"));

            if (ecken.indexOf(feld) !== -1) {
                /* Dieselben zwei Klassen wie am echten Brett (v0.31.0):
                   `feld-ausserhalb` nimmt der Ecke die 3D-Kachel, sonst
                   stünden im Vorschaubild Plattenränder um nichts. */
                zelle.classList.add("feld-riss");
                zelle.classList.add("feld-ausserhalb");
            }

            const figur = stellung[feld];
            if (figur !== ".") {
                zelle.appendChild(TEAM_SCHACH._element("span",
                    "figur " + (SCHACH.farbeVon(figur) === "weiss" ? "figur-weiss" : "figur-schwarz")
                    + TEAM_SCHACH._figurKlasse(figur),
                    TEAM_SCHACH._figurZeichen(figur)));
            }

            /* Angedeutete Würfel: Sie zeigen, dass in dieser Spielart welche
               erscheinen — wo genau, entscheidet später die Ziehung. */
            const beispiel = variante.bonusFelder.find((eintrag) => eintrag.feld === feld);
            if (beispiel) {
                zelle.classList.add("feld-bonus");

                /* Ganz nach vorn ins Feld, also hinter eine Figur — dieselbe
                   Reihenfolge wie am echten Brett und in den Bildanleitungen
                   (seit v0.83.1, Begründung bei `.wuerfel` in `css\stil.css`).
                   Hier treffen die beiden heute nicht aufeinander; die Regel
                   gilt trotzdem überall gleich, sonst fällt die dritte Stelle
                   beim nächsten Umbau durch. */
                zelle.insertBefore(TEAM_SCHACH._wuerfelBauen(
                    SCHACH_VARIANTEN.stufeVon(beispiel.art)), zelle.firstChild);
            }

            vorschau.appendChild(zelle);
        }

        /* Seit v0.123.0 legt das 3D-Brett ein Standbild darüber. */
        TEAM_SCHACH._standbild3d(vorschau);

        return vorschau;
    },

    /* ---------------------------------------------------------------- *
     * Übersicht: alle Partien
     * ---------------------------------------------------------------- */

    /*
     * SEIT v0.10.0 IST DIE ÜBERSICHT DER ZWISCHENBILDSCHIRM des Entwurfs
     * (Bündel A, Schritt 5): „Runde beitreten" (Code-Feld; die Einladungen
     * kommen mit Schritt 7 dazu) und „Runde erstellen". Eine ÖFFENTLICHE
     * Liste aller Partien gibt es nicht mehr (Entwurf, Abschnitt 3.3) —
     * man kommt über den Code hinein. Sichtbar bleiben:
     *
     *   - die EIGENEN offenen Partien (wartend oder laufend) — dort setzt
     *     man Bereitschaft und findet den Code zum Weitergeben;
     *   - die eigenen beendeten (zugeklappt, wie seit v0.59);
     *   - mit aktiver Verwaltung ALLE offenen — sonst könnte sie
     *     verwaiste Partien nicht mehr löschen.
     */
    _uebersichtZeichnen(wurzel, tafel, person) {
        const alle = SCHACH_TAFEL.liste(tafel);
        const offene = alle.filter((partie) => !partie.ergebnis);

        /* Die eigenen offenen wurden bis v0.34.0 hier gefiltert und darunter
           aufgelistet. Seit v0.35.0 führt der Startbildschirm zurück in die
           eigene Runde — die Filterung ist mit der Liste entfallen. */

        /* Die beendeten Partien wohnen seit v0.37.0 hinter dem
           Verlauf-Zeichen des Starts — gebaut in `verlaufKastenBauen`. */

        const kopf = TEAM_SCHACH._element("div", "phasen-leiste");

        /* Seit v0.9.0 hat das Team Schach keinen Leisten-Knopf mehr — man
           kommt über den Spielen-Knopf des Starts hierher und hier wieder
           zurück. */
        kopf.appendChild(ZUSTAND.alsZurueck(TEAM_SCHACH._knopf("Zurück", "knopf-still knopf-klein",
            () => TABS.wechseln("start"))));

        kopf.appendChild(TEAM_SCHACH._element("span", "phasen-text", "Spielen"));

        /*
         * HIER STAND „SCHACH LERNEN" (v0.96 bis v0.102.0) — der Weg zu den
         * Schachregeln, damit man nachlesen kann, BEVOR man einem Team
         * beitritt. Nutzer-Ansage 27.08.2026: „Schach lernen soll wo ander
         * hin aber nicht bei runde beitreten" (ROADMAP Punkt 36).
         *
         * Seit v0.103.0 hängt der Einstieg im Menüband des Startbildschirms
         * (`START._menuePunkte`) — also eine Stufe FRÜHER als hier und ohne
         * den Umweg über „Runde beitreten". Der Bildschirm selbst ist
         * unverändert (`js\team-schach-grundlagen.js`).
         */
        wurzel.appendChild(kopf);

        /* ---- Runde beitreten: Einladungen und Code-Feld (F14/F17). ---- */
        const beitreten = TEAM_SCHACH._element("section", "karte");
        beitreten.appendChild(TEAM_SCHACH._element("h3", "", "Runde beitreten"));

        /* Die Einladungen an mich (seit v0.13.0): Sie liegen hier, bis die
           Runde vorbei ist (F16a) — das Banner ist nur der Hinweis. */
        const einladungen = offene.filter((partie) =>
            SCHACH_RUNDE.istEingeladen(partie, person.id));
        if (einladungen.length > 0) {
            beitreten.appendChild(TEAM_SCHACH._element("p", "erklaerung",
                "Einladungen"));
            for (const partie of einladungen) {
                const zeile = TEAM_SCHACH._element("div", "freunde-zeile");
                zeile.appendChild(TEAM_SCHACH._element("span", "freunde-name",
                    partie.titel + " (" + SCHACH_RUNDE.varianteVon(partie).titel + ")"));
                zeile.appendChild(TEAM_SCHACH._knopf("Ansehen",
                    "knopf-still knopf-klein",
                    () => TEAM_SCHACH.partieOeffnen(partie.id)));
                beitreten.appendChild(zeile);
            }
        }

        /*
         * DAS CODE-FELD IST EIN KÄSTCHEN-FELD (seit v0.51.0).
         *
         * Nutzer-Ansage 24.08.2026: „Den Text anpassen bei Runde beitreten —
         * es reicht ‚rechts oben in einer Runde steht der Code' oder so, und
         * das am besten ins Suchfeld selbst, und das Suchfeld soll nur
         * 6 Felder haben."
         *
         * BEIDES ZUSAMMEN GEHT NICHT, und der Nutzer hat am 25.08.2026
         * entschieden, wie es aufgelöst wird: sechs Kästchen (das Feld ist
         * dann genau so breit, wie der Code lang ist), der Hinweissatz blass
         * DARUNTER statt im Feld. Im Feld wäre er nach zwei Wörtern
         * abgeschnitten gewesen.
         *
         * GEBAUT IST ES MIT EINEM EINZIGEN `input`, nicht mit sechs. Die
         * Kästchen zeichnet die Stildatei als Trennstriche im Hintergrund.
         * Sechs echte Felder müssten den Sprung von Kästchen zu Kästchen,
         * das Zurücklöschen und das Einfügen eines kopierten Codes von Hand
         * nachbauen — dreimal Gelegenheit für einen Fehler, und der
         * Zwischenspeicher des Handys fällt dabei erfahrungsgemäss als
         * Erstes durch. Mit einem Feld bleibt alles, was der Browser schon
         * kann, und die Prüfung darunter ist unverändert dieselbe.
         *
         * DER SATZ NENNT DIE LÄNGE NICHT MEHR: Die sechs Kästchen sagen sie.
         * Auch die Ausnahme-Zeichen (0, O, 1, I, L) stehen nicht mehr da —
         * das Feld nimmt sie ohnehin nicht an, und wer sie nie tippen kann,
         * muss auch nicht darüber lesen.
         */
        const codeZeile = TEAM_SCHACH._element("div", "code-zeile");

        const codeFeld = document.createElement("input");
        codeFeld.className = "code-feld";
        codeFeld.type = "text";
        codeFeld.value = "";
        codeFeld.autocomplete = "off";
        codeFeld.maxLength = SCHACH_RUNDE.CODE_LAENGE;
        codeFeld.setAttribute("aria-label", "Beitritts-Code");
        codeZeile.appendChild(codeFeld);

        const codeKnopf = TEAM_SCHACH._knopf("Beitreten", "knopf-haupt",
            () => TEAM_SCHACH.codeBeitreten(codeFeld.value));
        codeKnopf.disabled = true;
        codeZeile.appendChild(codeKnopf);

        /* Nur Zeichen aus dem Code-Zeichensatz, gleich grossgeschrieben —
           und der Knopf wird erst mit voller Länge frei. */
        codeFeld.addEventListener("input", () => {
            const sauber = codeFeld.value.toUpperCase().split("")
                .filter((zeichen) =>
                    SCHACH_RUNDE.CODE_ZEICHEN.indexOf(zeichen) !== -1)
                .join("");
            if (codeFeld.value !== sauber) {
                codeFeld.value = sauber;
            }
            codeKnopf.disabled =
                (sauber.length !== SCHACH_RUNDE.CODE_LAENGE);
        });

        beitreten.appendChild(codeZeile);

        /* Der Hinweis steht UNTER dem Feld — kurz genug, um ihn im Vorbeigehen
           zu lesen, und er sagt genau das eine, was man wissen muss: wo der
           Code steht. Seit v0.47.0 ist das die mitlaufende Leiste oben rechts. */
        beitreten.appendChild(TEAM_SCHACH._element("p", "erklaerung code-hinweis",
            "Code · rechts oben in der Runde"));

        wurzel.appendChild(beitreten);

        /* Die offenen Runden, die man sehen darf (seit v0.118.0). */
        wurzel.appendChild(TEAM_SCHACH._offeneRundenBauen(tafel, person));

        /*
         * DIE KARTE „RUNDE ERSTELLEN" IST WEG (Wunsch 1, 24.08.2026).
         * Erstellt wird jetzt auf dem Startbildschirm: Die Vorschau zeigt
         * die gewählte Spielart, der Pfeil daneben öffnet die
         * Einstellungen, und „Spielen" legt die Runde an
         * (`TEAM_SCHACH.rundeStarten`). Dieser Bildschirm ist damit nur
         * noch der Weg HINEIN in fremde Runden — und die Übersicht über
         * die eigenen.
         */

        /* ---- Die Freunde-Karte hing hier von v0.11.0 bis v0.18.0. Seit
           Wunsch 6 (v0.19.0) wohnt sie am Freunde-Zeichen des
           Startbildschirms (`START.freundeOeffnen`) — hierher kommt man
           seit Wunsch 1 nur noch zum Beitreten. ---- */

        /*
         * ---- „DEINE OFFENEN PARTIEN" IST WEG (v0.35.0). ----
         *
         * Nutzer-Ansage 24.08.2026: „deine offenen partien es soll dort
         * eigentlich ja keine mehr geben, da man nur eine gleichzeitig offen
         * haben kann pro benutzer und beim verlassen soll sie sich
         * schliessen."
         *
         * Die Liste war seit F11 höchstens einen Eintrag lang und
         * beantwortete nur noch eine Frage: „wie komme ich in meine Runde
         * zurück?" Diese Frage beantwortet seit v0.34.0 der Startbildschirm
         * („Zurück in deine Runde", `START._eigeneOffene`) — dort, wo man
         * ohnehin steht. Dieser Bildschirm ist damit nur noch das, was sein
         * Name sagt: der Weg HINEIN in fremde Runden.
         *
         * WER DIE LISTE WIEDER EINBAUEN WILL, prüft zuerst, ob der Weg über
         * den Start weggefallen ist — sonst gibt es zwei Türen zur selben
         * Runde, und eine davon veraltet.
         */

        /* ---- Verwaltung: alle übrigen offenen, sonst unlöschbar. ---- */
        if (ICH.verwaltungAktiv()) {
            const fremde = offene.filter((partie) =>
                !SCHACH_RUNDE.teamVon(partie, person.id));
            if (fremde.length > 0) {
                wurzel.appendChild(TEAM_SCHACH._element("p", "erklaerung",
                    "Offene Partien · Verwaltung"));
            }
            for (const partie of fremde) {
                wurzel.appendChild(TEAM_SCHACH._partieKarteBauen(partie, person));
            }
        }

        /* ---- DIE BEENDETEN PARTIEN SIND UMGEZOGEN (v0.37.0). ----
         *
         * Nutzer-Ansage 24.08.2026: „Die vergangenen Matches sollen auch
         * nicht bei Runde beitreten stehen sondern oben neben Freunde und
         * Einstellungen ein eigenes Icon." Sie wohnen jetzt hinter dem
         * Verlauf-Zeichen des Startbildschirms; gebaut werden sie weiterhin
         * hier (`verlaufKastenBauen`), damit die Karten überall gleich
         * aussehen. */
    },

    /*
     * DIE EIGENEN BEENDETEN PARTIEN als fertiger Kasten (seit v0.37.0
     * eigenständig, vorher Teil der Übersicht).
     *
     * Gerufen wird das vom Startbildschirm (`START._verlaufZeichnen`). Die
     * Funktion steht trotzdem HIER, bei den anderen Partie-Karten: Sie baut
     * dieselben Karten wie die Übersicht, und zwei Fassungen liefen früher
     * oder später auseinander.
     *
     * NUR DIE EIGENE HISTORIE (seit v0.59, Wunsch #8): Beendete sind
     * abgeschlossen; wer nicht mitgespielt hat, kann dort nichts mehr tun.
     * Die Partien selbst bleiben im gemeinsamen Stand, die Rangliste zählt
     * unverändert alles.
     *
     * Liefert null, wenn es nichts zu zeigen gibt.
     */
    verlaufKastenBauen(tafel, person) {
        const beendete = SCHACH_TAFEL.liste(tafel).filter((partie) =>
            partie.ergebnis && SCHACH_RUNDE.teamVon(partie, person.id));

        if (beendete.length === 0) {
            return null;
        }

        const kasten = TEAM_SCHACH._element("div", "verlauf-liste");

        for (const partie of beendete) {
            const karte = TEAM_SCHACH._partieKarteBauen(partie, person);

            /* Wer mitgespielt hat, kann sein Ergebnis jederzeit wieder
               ansehen — auch nachdem er den Abschluss weggeklickt hat. Der
               Abschluss wird im Schach-Tab gezeichnet, also erst dorthin. */
            const leiste = TEAM_SCHACH._element("div", "karte-fuss");
            leiste.appendChild(TEAM_SCHACH._knopf("Ergebnis ansehen",
                "knopf-still knopf-klein",
                () => {
                    TABS.wechseln("team-schach");
                    TEAM_SCHACH.abschlussZeigen(partie.id);
                }));
            karte.appendChild(leiste);

            kasten.appendChild(karte);
        }

        return kasten;
    },

    _partieKarteBauen(partie, person) {
        const karte = TEAM_SCHACH._element("section", "karte partie-karte");
        const meinTeam = SCHACH_RUNDE.teamVon(partie, person.id);

        const kopf = TEAM_SCHACH._element("div", "karte-kopf");
        kopf.appendChild(TEAM_SCHACH._element("h3", "", partie.titel));

        if (meinTeam) {
            kopf.appendChild(TEAM_SCHACH._element("span", "chip chip-fertig",
                (meinTeam === "weiss") ? "Du: Weiss" : "Du: Schwarz"));
        }
        /*
         * WER HAT GEWONNEN, WER VERLOREN (seit v0.59, Wunsch #18).
         *
         * Bis dahin stand hier nur „beendet", und wer gewonnen hatte, ging
         * allein aus dem Satz darunter hervor („Weiss hat gewonnen") — die
         * NAMEN dazu standen wieder zwei Zeilen tiefer, unsortiert. Jetzt sagt
         * der Kopf das Ergebnis, und die Namenszeile sagt, wer auf welcher
         * Seite stand.
         *
         * Das eigene Ergebnis steht dabei vorn: Wer mitgespielt hat, will
         * zuerst wissen, ob ER gewonnen hat.
         */
        if (partie.ergebnis) {
            if (meinTeam) {
                const gewonnen = (partie.ergebnis === meinTeam);
                const remis = (partie.ergebnis === "remis");

                kopf.appendChild(TEAM_SCHACH._element("span",
                    "chip " + (remis ? "chip-offen" : (gewonnen ? "chip-fertig" : "chip-fehler")),
                    remis ? "Unentschieden" : (gewonnen ? "Gewonnen" : "Verloren")));
            } else {
                kopf.appendChild(TEAM_SCHACH._element("span", "chip chip-offen",
                    (partie.ergebnis === "remis")
                        ? "Unentschieden"
                        : ((partie.ergebnis === "weiss") ? "Weiss gewinnt" : "Schwarz gewinnt")));
            }
        } else if (partie.laeuft) {
            kopf.appendChild(TEAM_SCHACH._element("span", "chip chip-laeuft", "läuft"));
        }
        karte.appendChild(kopf);

        const variante = SCHACH_RUNDE.varianteVon(partie);
        karte.appendChild(TEAM_SCHACH._element("p", "partie-zeile",
            variante.titel + " — " + SCHACH_RUNDE.kurzfassung(partie)));

        /*
         * MIT WELCHER VERSION SIE ANGELEGT WURDE (seit v0.77) — aber NUR, wenn
         * es eine andere als die laufende ist.
         *
         * Sonst stünde an jeder Karte dieselbe Nummer, und eine Angabe, die
         * immer gleich ist, liest nach zwei Tagen niemand mehr. Interessant ist
         * sie genau dann, wenn die Partie älter ist als die Seite: Dann
         * beantwortet sie beim Melden eines Fehlers die erste Rückfrage
         * („welcher Stand war das?"), ohne dass jemand sie stellen muss.
         *
         * Eine Partie von vor v0.77 trägt den Stempel nicht; dann bleibt die
         * Zeile weg, statt „unbekannt" zu behaupten.
         */
        const jetzt = SCHACH_RUNDE._appVersion();
        if (partie.angelegtMit && jetzt && partie.angelegtMit !== jetzt) {
            karte.appendChild(TEAM_SCHACH._element("p", "partie-zeile partie-herkunft",
                "Angelegt v" + partie.angelegtMit + " · Seite v"
                + jetzt));
        }

        /* Bei einer beendeten Partie trägt jede Seite dazu, wie sie
           ausgegangen ist — sonst muss man das Ergebnis oben mit den Namen
           hier unten selbst zusammenrechnen. Die Namen sind seit v0.119.0
           Knöpfe ins Profil; deshalb wird die Zeile aus Teilen gebaut. */
        const namenZeile = TEAM_SCHACH._element("p", "team-namen");
        const seite = (farbe) => {
            const kopfText = (farbe === "weiss") ? "Weiss" : "Schwarz";
            let zusatz = "";
            if (partie.ergebnis === "remis") {
                zusatz = " (unentschieden)";
            } else if (partie.ergebnis) {
                zusatz = (partie.ergebnis === farbe) ? " (Sieger)" : " (Verlierer)";
            }
            namenZeile.appendChild(document.createTextNode(kopfText + zusatz + ": "));

            const ids = partie.teams[farbe];
            if (ids.length === 0) {
                namenZeile.appendChild(document.createTextNode("niemand"));
            }
            ids.forEach((id, stelle) => {
                if (stelle > 0) {
                    namenZeile.appendChild(document.createTextNode(", "));
                }
                namenZeile.appendChild(TEAM_SCHACH._nameKnopfBauen(id));
            });
        };
        seite("weiss");
        namenZeile.appendChild(document.createTextNode("   |   "));
        seite("schwarz");
        karte.appendChild(namenZeile);

        const leiste = TEAM_SCHACH._element("div", "karte-fuss");
        leiste.appendChild(TEAM_SCHACH._knopf("Öffnen", "knopf-still knopf-klein",
            () => TEAM_SCHACH.partieOeffnen(partie.id)));
        leiste.appendChild(DIALOG.zweiSchritt(
            TEAM_SCHACH._knopf("Löschen", "knopf-gefahr knopf-klein", null),
            () => TEAM_SCHACH.partieLoeschen(partie)));
        karte.appendChild(leiste);

        return karte;
    },

});
