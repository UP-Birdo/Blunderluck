/*
 * tabs.js — die Tab-Leiste.
 *
 * Ein offenes Register: Ein weiteres Spiel muss nur registriert werden, ohne
 * Umbau an dieser Datei.
 *
 * Ein Tab ist ein Objekt:
 *     {
 *         id:        "wuerfel-quizz",          // eindeutig, auch für die Adresse
 *         titel:     "Würfel Quizz",           // Beschriftung in der Leiste
 *         inLeiste:  false,                    // optional (seit v0.9.0): kein
 *                                              // Knopf — erreichbar nur über
 *                                              // TABS.wechseln (Startbildschirm)
 *         zeichen:   "start",                  // seit v0.142.0: Symbol aus
 *                                              // ZUSTAND.ZEICHEN
 *         leisteText: "Aufgaben",              // optional: Name in der Leiste,
 *                                              // wenn er vom Titel abweicht
 *         platzhalter: true,                   // optional: nur ein Platz in der
 *                                              // Leiste, ausgegraut, ohne Inhalt
 *         aufbauen(behaelter),                 // legt das Gerüst einmalig an
 *         beimOeffnen(),                       // optional: bei jedem Wechsel
 *         beimVerlassen()                      // optional (seit v0.144.0):
 *                                              // wenn ein ANDERER Tab kommt
 *     }
 *
 * DIE LEISTE IST DER GEMEINSAME BAUSTEIN (seit v0.145.0, UPCrew-Angleichung
 * Runde 4, css\upcrew-leiste.css aus Design\3D-Schrift\final, in Typoluck
 * gleich). Nutzer 27.09.2026: „keine Schrift bis auf den Tab, wo man
 * derzeit ist, und das Symbol nach vorne gehoben". Je Eintrag ein
 * `button.up-tab` mit Symbol und Namen; der Name ist nur am aktiven Eintrag
 * zu sehen (`aria-current="page"`), der auf einer gehobenen Kachel in der
 * Hauptfarbe sitzt. Für Vorleseprogramme trägt jeder Eintrag seinen Namen
 * als `aria-label`. Die Leiste steht fest am unteren Rand, auf JEDER Breite
 * und JEDEM Bildschirm (seit v0.142.0) — ausser in der laufenden Partie.
 * Die Reihenfolge der Registrierung ist die Reihenfolge in der Leiste.
 *
 * Bis v0.144 zeichnete diese Datei eine eigene Leiste (Symbol über Wort,
 * ein gleitender Strich über dem aktiven Eintrag, `.tab-knopf`,
 * `.tab-marker`). Die Kachel des Bausteins bewegt sich selbst — der Strich
 * und sein Nachmessen beim Drehen sind deshalb entfallen.
 *
 * Warum es `beimOeffnen` braucht: Das Gerüst eines Tabs entsteht erst, wenn er
 * zum ersten Mal geöffnet wird. Seine Daten können lange vorher geladen worden
 * sein — der Zeichen-Aufruf lief dann ins Leere, weil es den Bereich noch nicht
 * gab. Ohne diesen Haken bliebe ein Tab leer, bis sich zufällig etwas ändert.
 * Genau das war der Fehler, mit dem Team Schach in v1.1 nichts anzeigte.
 */

const TABS = {

    liste: [],
    aktiveId: null,
    leisteEl: null,
    inhaltEl: null,
    aufgebaut: {},

    /*
     * ALTE TAB-KENNUNGEN FÜHREN WEITER (seit v0.145.0): Die Tabs
     * „Fähigkeiten" und „Anpassen" sind im Tab „Sammlung" aufgegangen. Wer
     * noch eine alte Kennung ruft (ein gemerkter Rückweg, ein vergessener
     * Aufruf), landet dort statt im Nichts.
     */
    UMLEITUNGEN: {
        faehigkeiten: "sammlung",
        anpassen: "sammlung"
    },

    registrieren(tab) {
        TABS.liste.push(tab);
    },

    /* Zeichnet die Leiste und öffnet den Start-Tab (ohne Angabe: den
       ersten). Tabs mit `inLeiste: false` bekommen keinen Knopf — sie sind
       nur über TABS.wechseln erreichbar (seit v0.9.0: Team Schach über den
       Spielen-Knopf, die Einstellungen über das Zahnrad). */
    starten(leisteEl, inhaltEl, startId) {
        TABS.leisteEl = leisteEl;
        TABS.inhaltEl = inhaltEl;
        TABS.leisteEl.innerHTML = "";

        for (const tab of TABS.liste) {
            if (tab.inLeiste === false) {
                continue;
            }
            TABS.leisteEl.appendChild(TABS._eintragBauen(tab));
        }

        if (TABS.liste.length > 0) {
            const start = startId
                && TABS.liste.some((eintrag) => eintrag.id === startId);
            TABS.wechseln(start ? startId : TABS.liste[0].id);
        }
    },

    /*
     * EIN EINTRAG DER LEISTE, genau im Aufbau aus dem Kopf von
     * css\upcrew-leiste.css:
     *     <button type="button" class="up-tab" aria-label="Start">
     *         <svg …><path d="…"/></svg><span>Start</span>
     *     </button>
     * Das Symbol kommt aus ZUSTAND.ZEICHEN (24er-Raster). Strichstärke und
     * Farbe setzt der Baustein über `.up-tab svg`; die Strichstärke, die
     * `ZUSTAND.zeichen` am Pfad mitgibt, nimmt css\stil.css zurück
     * (`.tab-leiste .up-tab path`), sonst gälte am Pfad weiter 1,8.
     */
    _eintragBauen(tab) {
        const name = tab.leisteText || tab.titel;
        const knopf = document.createElement("button");
        knopf.type = "button";
        knopf.className = "up-tab";
        knopf.setAttribute("aria-label", name);
        if (tab.zeichen && typeof ZUSTAND !== "undefined") {
            knopf.appendChild(ZUSTAND.zeichen(tab.zeichen, "up-tab-zeichen"));
        }
        const wort = document.createElement("span");
        wort.textContent = name;
        knopf.appendChild(wort);
        if (tab.platzhalter) {
            /* Sichtbar, aber erkennbar noch ohne Funktion (Baustein:
               `up-tab-still`, nicht antippbar). */
            knopf.disabled = true;
            knopf.classList.add("up-tab-still");
        } else {
            knopf.dataset.tabId = tab.id;
            knopf.addEventListener("click", () => TABS.wechseln(tab.id));
        }
        return knopf;
    },

    /* Merkt sich, ob gerade eine Runde als eigenes Fenster läuft. */
    _rundeOffen: false,
    _rundeFest: false,

    /*
     * EINE OFFENE RUNDE IST EIN EIGENES FENSTER (seit v0.113, Nutzer-Ansage
     * 22.08.): Solange eine Partie oder ein Raum offen ist, hat der
     * Bildschirm seinen eigenen Zurück-Knopf. Die Spiele melden ihren
     * Zustand bei jedem Zeichnen; gezählt wird nur der sichtbare Tab, denn
     * die regelmässige Abfrage zeichnet auch verdeckte Tabs.
     *
     * Die Klasse sitzt am body. Bis v0.141 blendete die Stildatei damit die
     * Tab-Leiste aus; seit v0.142.0 bleibt die Leiste IMMER stehen
     * (UPCrew-Angleichung, wie Typoluck) — die Klasse bleibt für alles
     * andere, was ein Fenster anders macht (Kurzmeldung, Ränder).
     */
    /*
     * DER DRITTE WERT `fest` (seit v0.52.0): Dieser Bildschirm passt auf EINE
     * Seite und rollt nicht.
     *
     * Er hängt hier und nicht an einer eigenen Stelle, weil `rundeSetzen`
     * ohnehin von JEDEM Bildschirm beim Zeichnen gerufen wird — und wer
     * nichts angibt, sagt damit „meiner rollt wie immer". Ein eigener
     * Schalter müsste an jedem dieser Bildschirme einzeln zurückgenommen
     * werden, und genau das vergisst man; die Klasse bliebe stehen, und der
     * nächste Bildschirm wäre abgeschnitten.
     */
    /*
     * DER VIERTE WERT `spielt` (seit v0.151.3, Nutzer 27.09.2026: „während
     * spielen bei beiden games soll das band unten verschwinden"): Eine
     * PARTIE ist offen und noch nicht zu Ende — ab dem Vorraum (Seite,
     * Aufstellung, „Bereit") bis zum Matt. Dann ist die Tab-Leiste weg
     * (Klasse `partie-spielt`, css\stil.css). Bis v0.151.2 verschwand sie erst
     * mit dem Anpfiff (`partie-fest`); im Vorraum stand sie noch. Wer den
     * Wert nicht angibt (Abschluss, Übersicht, jeder andere Tab), holt die
     * Leiste zurück — dasselbe Muster wie `fest`.
     */
    _spielt: false,

    rundeSetzen(tabId, offen, fest, spielt) {
        if (TABS.aktiveId !== tabId) {
            return;
        }
        if (typeof document === "undefined" || !document.body
                || !document.body.classList) {
            return;
        }

        const sollSpielt = (spielt === true);
        if (TABS._spielt !== sollSpielt) {
            TABS._spielt = sollSpielt;
            document.body.classList.toggle("partie-spielt", sollSpielt);
        }

        /* Vor dem Ausstieg unten: Auch wenn sich am „offen" nichts ändert,
           kann sich das „fest" geändert haben (Übersicht → Partie). */
        const sollFest = (fest === true);
        if (TABS._rundeFest !== sollFest) {
            TABS._rundeFest = sollFest;
            document.body.classList.toggle("partie-fest", sollFest);
        }

        const soll = (offen === true);
        if (TABS._rundeOffen === soll) {
            return;
        }
        TABS._rundeOffen = soll;
        document.body.classList.toggle("runde-offen", soll);
    },

    /* ---------------------------------------------------------------- *
     * TABS ALS BLATT (seit v0.156.0, Nutzer 28.09.2026: „keine Menüs, die den
     * ganzen Screen bedecken … alles, was nicht im Spiel ist, als Popup, das
     * im Hintergrund noch das Hauptmenü zeigt"; gemeinsamer Baustein
     * js\upcrew-blatt.js).
     *
     * SEIT v0.156.1 (Nutzer 29.09.2026, final\EINBAU-2026-09-29.md): Die
     * Leisten-Tabs sind wieder SEITEN; `alsBlatt` tragen nur noch Tabs ohne
     * Leisten-Knopf (Einstellungen, Verwaltung).
     *
     * Ein Tab mit `alsBlatt: true` öffnet als BLATT über dem Start: Der Start
     * bleibt sichtbar dahinter (leicht zurückgesetzt), der Bereich des Tabs
     * wandert in das Blatt. Ein Tipp in der Leiste ersetzt das Blatt, „Start"
     * schliesst alles; `blattOeffnen(id)` legt eines DARÜBER (Profil →
     * Einstellungen → Verwaltung). Die Partie (`team-schach`) bleibt ein
     * eigener Bildschirm. Ohne den Baustein (Tests) wie bisher als Seite.
     * `blattTitel`/`blattRechts()` am Tab sind wahlfrei.
     * ---------------------------------------------------------------- */

    /* Die Tab-Kennungen der offenen Blätter, unten zuerst. */
    _blattTabs: [],
    _bereiche: {},
    _stumm: false,

    _alsBlatt(tab) {
        return !!tab && tab.alsBlatt === true && typeof UPCREW_BLATT !== "undefined";
    },

    blattOeffnen(id) {
        TABS.wechseln(id, { stapeln: true });
    },

    /* Alle Blätter zu, ohne dass sie zurück zum Start zeichnen. */
    _blaetterStillSchliessen() {
        if (typeof UPCREW_BLATT === "undefined") {
            return;
        }
        TABS._stumm = true;
        try {
            UPCREW_BLATT.alleSchliessen();
        } finally {
            TABS._stumm = false;
        }
        for (const id of TABS._blattTabs.splice(0)) {
            const tab = TABS.liste.find((eintrag) => eintrag.id === id);
            if (tab && typeof tab.beimVerlassen === "function") {
                tab.beimVerlassen();
            }
        }
    },

    _leisteMarkieren(leisteId) {
        if (!TABS.leisteEl) {
            return;
        }
        for (const knopf of TABS.leisteEl.querySelectorAll(".up-tab")) {
            if (knopf.dataset.tabId === leisteId) {
                knopf.setAttribute("aria-current", "page");
            } else {
                knopf.removeAttribute("aria-current");
            }
        }
    },

    _bereichVon(tab) {
        if (!TABS._bereiche[tab.id]) {
            const bereich = document.createElement("section");
            bereich.className = "tab-bereich tab-bereich-blatt";
            bereich.dataset.tabId = tab.id;
            TABS._bereiche[tab.id] = bereich;
            tab.aufbauen(bereich);
            TABS.aufgebaut[tab.id] = true;
        }
        return TABS._bereiche[tab.id];
    },

    _blattWechseln(tab, optionen) {
        /* Liegt das Blatt schon im Stapel (Verwaltung beenden → zurück in
           die Einstellungen), gehen nur die Blätter darüber zu. */
        if (TABS._blattTabs.indexOf(tab.id) !== -1) {
            while (TABS._blattTabs.length > 0 && TABS._blattTabs[TABS._blattTabs.length - 1] !== tab.id
                    && UPCREW_BLATT.anzahl() > 0) {
                UPCREW_BLATT.schliessen("code");
            }
            if (TABS.aktiveId === tab.id && typeof tab.beimOeffnen === "function") {
                tab.beimOeffnen();
            }
            return;
        }
        /* Ohne eigenen Leisten-Knopf (Einstellungen, Verwaltung) legt sich
           ein Blatt DARÜBER (Profil → Einstellungen → Verwaltung); ein
           Eintrag der Leiste ersetzt die offenen Blätter. */
        const stapeln = !!(optionen && optionen.stapeln)
            || (tab.inLeiste === false && UPCREW_BLATT.blaetter() > 0);
        if (!stapeln) {
            TABS._blaetterStillSchliessen();
        }

        /* Dahinter steht der Start — sichtbar, nicht die Partie. */
        const start = TABS.liste.find((eintrag) => eintrag.id === "start");
        if (TABS.aktiveId !== "start" && TABS._blattTabs.length === 0 && start
                && (!stapeln || UPCREW_BLATT.blaetter() === 0)) {
            TABS._seiteZeigen(start);
        }

        const bereich = TABS._bereichVon(tab);
        bereich.hidden = false;
        TABS._blattTabs.push(tab.id);
        TABS.aktiveId = tab.id;
        TABS._leisteMarkieren(tab.inLeiste === false ? (tab.leisteBei || "start") : tab.id);
        UPCREW_BLATT.oeffnen({
            titel: tab.blattTitel || tab.titel,
            inhalt: bereich,
            klasse: "blatt-" + tab.id,
            rechts: (typeof tab.blattRechts === "function") ? tab.blattRechts() : [],
            beimSchliessen: () => TABS._blattZu(tab)
        });
        if (typeof tab.beimOeffnen === "function") {
            tab.beimOeffnen();
        }
    },

    /* Ein Blatt ist zu (✕, Zurück, Grund, Esc): der Tab räumt auf; darunter
       ist wieder das nächste Blatt oder der Start aktiv. */
    _blattZu(tab) {
        if (TABS._stumm) {
            return;
        }
        const stelle = TABS._blattTabs.lastIndexOf(tab.id);
        if (stelle !== -1) {
            TABS._blattTabs.splice(stelle, 1);
        }
        if (typeof tab.beimVerlassen === "function") {
            tab.beimVerlassen();
        }
        const darunter = TABS._blattTabs[TABS._blattTabs.length - 1];
        if (darunter) {
            const unten = TABS.liste.find((eintrag) => eintrag.id === darunter);
            TABS.aktiveId = darunter;
            TABS._leisteMarkieren(unten && unten.inLeiste === false ? (unten.leisteBei || "start") : darunter);
            if (unten && typeof unten.beimOeffnen === "function") {
                unten.beimOeffnen();
            }
            return;
        }
        TABS.aktiveId = "start";
        TABS._leisteMarkieren("start");
        const start = TABS.liste.find((eintrag) => eintrag.id === "start");
        if (start && typeof start.beimOeffnen === "function") {
            start.beimOeffnen();
        }
    },

    /* Zeigt den Bereich eines Seiten-Tabs (ohne Blatt) — der Kern des
       bisherigen `wechseln`. */
    _seiteZeigen(tab) {
        const id = tab.id;
        TABS.aktiveId = id;
        for (const bereich of TABS.inhaltEl.querySelectorAll(".tab-bereich")) {
            const zeigen = bereich.dataset.tabId === id;
            if (zeigen && bereich.hidden && bereich.classList) {
                bereich.classList.remove("tab-bereich-zeigt");
                void bereich.offsetWidth;
                bereich.classList.add("tab-bereich-zeigt");
            }
            bereich.hidden = !zeigen;
        }
        if (!TABS.aufgebaut[id]) {
            const bereich = document.createElement("section");
            bereich.className = "tab-bereich tab-bereich-zeigt";
            bereich.dataset.tabId = id;
            TABS.inhaltEl.appendChild(bereich);
            tab.aufbauen(bereich);
            TABS.aufgebaut[id] = true;
            bereich.hidden = false;
        }
        if (typeof tab.beimOeffnen === "function") {
            tab.beimOeffnen();
        }
    },

    wechseln(gewuenscht, optionen) {
        const id = TABS.UMLEITUNGEN[gewuenscht] || gewuenscht;
        const tab = TABS.liste.find((eintrag) => eintrag.id === id);
        if (!tab) {
            return;
        }

        if (TABS._alsBlatt(tab)) {
            const vorherBlatt = TABS.liste.find((eintrag) => eintrag.id === TABS.aktiveId);
            if (vorherBlatt && TABS._blattTabs.length === 0 && vorherBlatt.id !== id
                    && typeof vorherBlatt.beimVerlassen === "function" && vorherBlatt.id !== "start") {
                vorherBlatt.beimVerlassen();
            }
            if (TABS._spielt && typeof document !== "undefined" && document.body) {
                TABS._spielt = false;
                document.body.classList.remove("partie-spielt");
            }
            TABS._blattWechseln(tab, optionen);
            return;
        }

        /* Ein Seiten-Tab (Start, Partie): offene Blätter gehen zu. */
        if (TABS._blattTabs.length > 0 || (typeof UPCREW_BLATT !== "undefined" && UPCREW_BLATT.anzahl() > 0)) {
            TABS._blaetterStillSchliessen();
            if (TABS.aktiveId !== "start" && TABS.liste.some((eintrag) => eintrag.id === TABS.aktiveId && eintrag.alsBlatt)) {
                TABS.aktiveId = "start";
            }
        }

        /* Der bisherige Tab räumt auf, wenn er es will (seit v0.144.0; der
           Tab „Sammlung" baut seinen Baustein ab). */
        const vorher = TABS.liste.find((eintrag) => eintrag.id === TABS.aktiveId);
        if (vorher && vorher.id !== id && typeof vorher.beimVerlassen === "function") {
            vorher.beimVerlassen();
        }

        TABS.aktiveId = id;

        /* Beim Wechsel ist erst einmal keine Partie im Bild (seit v0.151.3):
           die Leiste kommt zurück; eine offene Partie setzt es beim
           Zeichnen gleich wieder. */
        if (TABS._spielt && typeof document !== "undefined" && document.body) {
            TABS._spielt = false;
            document.body.classList.remove("partie-spielt");
        }

        /* Ein Bildschirm ohne eigenen Leisten-Knopf (Partie, Einstellungen,
           Verwaltung) markiert den Eintrag, zu dem er gehört — ohne Angabe
           den Start, von dem aus man ihn betritt (seit v0.142.0; vorher war
           die Leiste dort ausgeblendet). */
        const leisteId = tab.inLeiste === false ? (tab.leisteBei || "start") : id;

        /* Der aktive Eintrag trägt `aria-current="page"` — daran hängt der
           Baustein Kachel und Namen. Die übrigen verlieren das Merkmal ganz
           (ein „false" wäre für den Baustein kein Unterschied, für
           Vorleseprogramme aber eine überflüssige Ansage). */
        for (const knopf of TABS.leisteEl.querySelectorAll(".up-tab")) {
            if (knopf.dataset.tabId === leisteId) {
                knopf.setAttribute("aria-current", "page");
            } else {
                knopf.removeAttribute("aria-current");
            }
        }

        for (const bereich of TABS.inhaltEl.querySelectorAll(".tab-bereich")) {
            const zeigen = bereich.dataset.tabId === id;

            /* Der neu sichtbare Bereich blendet kurz ein (seit v0.107): Die
               Klasse wird entfernt und frisch gesetzt, damit die Animation
               bei JEDEM Wechsel spielt, nicht nur beim ersten. */
            if (zeigen && bereich.hidden && bereich.classList) {
                bereich.classList.remove("tab-bereich-zeigt");
                void bereich.offsetWidth;
                bereich.classList.add("tab-bereich-zeigt");
            }

            bereich.hidden = !zeigen;
        }

        /* Das Gerüst wird beim ersten Öffnen einmal aufgebaut. */
        if (!TABS.aufgebaut[id]) {
            const bereich = document.createElement("section");
            bereich.className = "tab-bereich tab-bereich-zeigt";
            bereich.dataset.tabId = id;
            TABS.inhaltEl.appendChild(bereich);
            tab.aufbauen(bereich);
            TABS.aufgebaut[id] = true;
            bereich.hidden = false;
        }

        /* Danach zeichnet der Tab seinen aktuellen Stand — jedes Mal, nicht nur
           beim ersten Öffnen. Siehe Erklärung im Kopf dieser Datei. */
        if (typeof tab.beimOeffnen === "function") {
            tab.beimOeffnen();
        }

        /* Eine Leisten-Seite beginnt oben (seit v0.156.1, wie Typoluck
           navigation.js) — sonst stünde sie auf der Rollhöhe der vorigen. */
        if (tab.inLeiste !== false && typeof window !== "undefined"
                && typeof window.scrollTo === "function") {
            window.scrollTo(0, 0);
        }
    }
};
