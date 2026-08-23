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
 *         aufbauen(behaelter),                 // legt das Gerüst einmalig an
 *         beimOeffnen()                        // optional: bei jedem Wechsel
 *     }
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

    /* Die gleitende Markierung des aktiven Tabs (seit v0.107; seit v0.111
       eine Pille hinter dem Knopf statt eines Strichs darunter). */
    markerEl: null,

    registrieren(tab) {
        TABS.liste.push(tab);
    },

    /* Zeichnet die Leiste und öffnet den ersten Tab. */
    starten(leisteEl, inhaltEl) {
        TABS.leisteEl = leisteEl;
        TABS.inhaltEl = inhaltEl;
        TABS.leisteEl.innerHTML = "";

        for (const tab of TABS.liste) {
            const knopf = document.createElement("button");
            knopf.type = "button";
            knopf.className = "tab-knopf";
            knopf.textContent = tab.titel;
            knopf.dataset.tabId = tab.id;
            knopf.setAttribute("role", "tab");
            knopf.addEventListener("click", () => TABS.wechseln(tab.id));
            TABS.leisteEl.appendChild(knopf);
        }

        /*
         * DIE MARKIERUNG DES AKTIVEN TABS IST EIN EIGENES ELEMENT (seit
         * v0.107, seit v0.111 eine Pille hinter dem Knopf statt eines
         * Strichs darunter): Sie GLEITET beim Wechsel zum neuen Tab, statt
         * hart umzuspringen. Ein Rahmen am Knopf selbst kann das nicht — er
         * hängt am Element und kennt keine Position. Bei Grössenänderung des
         * Fensters wird nachgemessen, ohne Gleiten.
         */
        TABS.markerEl = document.createElement("span");
        TABS.markerEl.className = "tab-marker";
        TABS.markerEl.setAttribute("aria-hidden", "true");
        TABS.leisteEl.appendChild(TABS.markerEl);

        if (typeof window !== "undefined") {
            window.addEventListener("resize", () => TABS._markerSetzen(false));
        }

        if (TABS.liste.length > 0) {
            TABS.wechseln(TABS.liste[0].id);
        }
    },

    /*
     * Schiebt die Pille hinter den aktiven Knopf (seit v0.111 eine volle
     * Fläche statt des Strichs darunter — dasselbe Muster wie die
     * Segment-Reihen beim Anlegen). Gemessen wird die echte Lage im
     * Leisten-Element — damit stimmt es auch, wenn die Leiste auf
     * schmalen Geräten umbricht (`offsetTop`). `weich = false` setzt ohne
     * Gleiten: beim ersten Zeichnen und nach Fenster-Grössenänderung.
     */
    _markerSetzen(weich) {
        const aktiv = TABS.leisteEl
            ? TABS.leisteEl.querySelector(".tab-knopf-aktiv") : null;

        if (!aktiv || !TABS.markerEl || typeof aktiv.offsetLeft !== "number") {
            return;
        }

        TABS.markerEl.classList.toggle("tab-marker-weich", weich === true);
        TABS.markerEl.style.left = aktiv.offsetLeft + "px";
        TABS.markerEl.style.top = (aktiv.offsetTop + 6) + "px";
        TABS.markerEl.style.width = aktiv.offsetWidth + "px";
        TABS.markerEl.style.height = (aktiv.offsetHeight - 12) + "px";
    },

    /* Merkt sich, ob gerade eine Runde als eigenes Fenster läuft. */
    _rundeOffen: false,

    /*
     * EINE OFFENE RUNDE IST EIN EIGENES FENSTER (seit v0.113, Nutzer-Ansage
     * 22.08.): Solange eine Partie oder ein Raum offen ist, verschwindet die
     * Tab-Leiste — man ist IM Spiel und verlässt es über dessen eigenen
     * Zurück-Knopf, nicht über die Tabs. Die Spiele melden ihren Zustand
     * bei jedem Zeichnen; gezählt wird nur der sichtbare Tab, denn die
     * regelmässige Abfrage zeichnet auch verdeckte Tabs.
     *
     * Die Klasse sitzt am body, das Ausblenden macht die Stildatei
     * (`body.runde-offen .tab-leiste`).
     */
    rundeSetzen(tabId, offen) {
        if (TABS.aktiveId !== tabId) {
            return;
        }
        if (typeof document === "undefined" || !document.body
                || !document.body.classList) {
            return;
        }

        const soll = (offen === true);
        if (TABS._rundeOffen === soll) {
            return;
        }
        TABS._rundeOffen = soll;
        document.body.classList.toggle("runde-offen", soll);

        /* Kommt die Leiste zurück, steht die Pille noch auf den Massen von
           vorher — nachmessen, ohne Gleiten. */
        if (!soll) {
            TABS._markerSetzen(false);
        }
    },

    wechseln(id) {
        const tab = TABS.liste.find((eintrag) => eintrag.id === id);
        if (!tab) {
            return;
        }

        /* Beim ersten Aufruf steht der Strich noch nirgends — dann wird er
           gesetzt statt geschoben. */
        const ersterWechsel = (TABS.aktiveId === null);

        TABS.aktiveId = id;

        for (const knopf of TABS.leisteEl.querySelectorAll(".tab-knopf")) {
            const istAktiv = knopf.dataset.tabId === id;
            knopf.classList.toggle("tab-knopf-aktiv", istAktiv);
            knopf.setAttribute("aria-selected", istAktiv ? "true" : "false");
        }

        TABS._markerSetzen(!ersterWechsel);

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
    }
};
