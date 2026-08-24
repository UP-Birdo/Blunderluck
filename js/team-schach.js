/*
 * team-schach.js — der Tab "Team Schach": Übersicht, Brett und Teams.
 *
 * Zwei Ansichten in einem Tab:
 *
 *   ÜBERSICHT  Alle Partien untereinander mit ihrem Stand. Von hier aus wird
 *              eine Partie geöffnet oder eine neue angelegt (mit Auswahl der
 *              Spielart).
 *   PARTIE     Genau eine Partie mit Brett, Teams, Fähigkeiten und Verlauf.
 *              Dieser Bildschirm ist für das Handy gebaut: eine Spalte, das
 *              Brett so breit wie möglich, alles Weitere darunter.
 *
 * Umgeschaltet wird über `offeneId` — mehr Zustand braucht es nicht, weil
 * jede Ansicht bei jeder Änderung vollständig neu entsteht.
 *
 * So läuft eine Partie:
 *   1. Man tritt einem Team bei (Weiss oder Schwarz) — auch mitten im Spiel.
 *   2. Sobald auf beiden Seiten jemand steht und je einer "bereit" gedrückt
 *      hat, beginnt die Partie.
 *   3. Wer im Team ist, das am Zug ist, darf ziehen. **Innerhalb des Teams
 *      gibt es keine Reihenfolge: Wer zuerst zieht, hat gezogen.**
 *   4. Bedienung wie üblich: Figur antippen, mögliche Felder erscheinen als
 *      Punkte, Zielfeld antippen.
 *
 * Der Stand liegt in der Datenbank unter einem eigenen Pfad (siehe konfig.js)
 * und wird jederzeit fortgesetzt.
 *
 * Diese Datei kennt nur den Bildschirm. Die Regeln stehen in schach.js, die
 * Teams und der Ablauf einer Partie in schach-runde.js, die Sammlung aller
 * Partien in schach-tafel.js.
 *
 * DER BILDSCHIRM LIEGT IN VIER DATEIEN
 * TEAM_SCHACH war eine einzige Datei mit rund 2500 Zeilen — zu lang, um sie
 * beim Suchen noch am Stück zu überblicken. Seit v3.2 ist sie aufgeteilt:
 *
 *     team-schach.js              dieser Kern: Zustand, Zeichnen, Partie-Kopf,
 *                                 Teams, Bedienung, Senden, Bausteine
 *     team-schach-uebersicht.js   Liste aller Partien, Auswahl der Spielart
 *     team-schach-brett.js        Brett, Pfeil, Würfel, Abstimmung, Bewegung
 *     team-schach-auswertung.js   Abschluss, Fähigkeiten-Übersicht, Bilanz
 *
 * Die drei anderen ERGÄNZEN dieses eine Objekt (`Object.assign(TEAM_SCHACH, …)`)
 * und werden in index.html NACH dieser Datei geladen. Gewählt wurde dieser Weg,
 * weil er nichts am Verhalten ändert: Jeder Aufruf heißt weiter
 * `TEAM_SCHACH._brettBauen(…)`, egal in welcher Datei die Funktion steht. Vier
 * Objekte mit vier Namen hätten dieselbe Aufteilung erkauft, dafür aber jede
 * Aufrufstelle im Projekt angefasst — bei laufenden Partien das grössere Risiko.
 */

const TEAM_SCHACH = {

    id: "team-schach",
    titel: "Team Schach",

    /* Seit v0.9.0 (Bündel A, Schritt 4) kein Knopf mehr in der Leiste:
       Man kommt über den Spielen-Knopf des Startbildschirms hierher. */
    inLeiste: false,

    /* Wird von app.js gesetzt. */
    abgleich: null,

    wurzelEl: null,

    /* Kennung der geöffneten Partie; "" heißt Übersicht. */
    offeneId: "",

    /* Ist die Auswahl der Spielart offen? Sie liegt VOR der Übersicht. */
    auswahlOffen: false,

    /*
     * WELCHER TEIL DER AUSWAHL (seit v0.21.0, Wunsch 8). Bis v0.20.0 stand
     * alles auf einem Bildschirm: Figurenzahl, Regler, Brettform und die
     * Grössen-Kacheln. Der Nutzer hat ihn geteilt — auf dem Start führt die
     * VORSCHAU zur Brettform und der PFEIL zu den Grundeinstellungen:
     *
     *   "brett"   Brettform und Grösse (die Kacheln)
     *   "regeln"  Figurenzahl, Haken, Lootbox-Menge, Item-Vorrat
     */
    auswahlTeil: "brett",

    /* Ist die Fähigkeiten-Übersicht offen (hinter dem i)? */
    infoOffen: false,

    /* Ist die Schachregel-Anleitung offen (seit v0.96, „Schach lernen")?
       Wie die Bibliothek hängt sie an keinem Spielstand — `grundlagenGezeichnet`
       hält die regelmässige Abfrage davon ab, sie ständig neu zu bauen und
       dabei jeden aufgeklappten Eintrag wieder zuzuklappen. */
    grundlagenOffen: false,
    grundlagenGezeichnet: false,

    /* Welches Kapitel gerade aufgeklappt ist — es ist immer höchstens eines
       (bis v0.17.0 gab es dasselbe Muster in der Bibliothek). */
    grundlagenOffenerEintrag: null,

    /* Zeitgeber für den Countdown einer laufenden Abstimmung. */
    fristZeitgeber: null,

    /*
     * Die Einstellungen für die NÄCHSTE Partie. Sie leben nur, solange die
     * Auswahl offen ist; mit dem Anlegen wandern sie in die Partie und stehen
     * dort fest.
     */
    neueRegeln: {
        faehigkeiten: false,
        seltenheitZeigen: false,
        pechZeigen: false,

        /* Wie viele Lootboxen erscheinen (seit v0.71): wenig / normal /
           viele / regen. Sie löst den Haken `regen` und den Schieberegler
           `regenStufe` ab; beide werden beim Anlegen daraus gefüllt. */
        lootboxMenge: "wenig",

        zufallsArmee: false,
        armeeUnterschiedlich: false,

        /*
         * Wie viele Figuren JEDE Seite bekommt (seit v0.86) — eine der Stufen
         * aus `SCHACH_VARIANTEN.ARMEE_STAERKEN`.
         *
         * VORGABE IST DIE GEWOHNTE AUFSTELLUNG. Seit v0.100 wirkt der Regler
         * auch OHNE den Haken „Zufallsarmee"; die Vorgabe muss deshalb die
         * Stufe sein, die alles stehen lässt wie bisher — sonst startete jede
         * neue Partie mit einer Aufstellung, die niemand verlangt hat.
         *
         * Bis v0.103 hiess diese Stufe „voll", seit der neuen Leiter in v0.104
         * heisst sie „normal" (dieselbe Aufstellung, anderer Name). Wer mehr
         * will, klickt — „viel" und „voll" stehen jetzt darüber.
         *
         * Im MODELL bleibt die Vorgabe ebenfalls „normal" (`SCHACH_RUNDE`):
         * Eine Partie ohne Regeln-Block stammt von früher und muss
         * weiterrechnen wie bisher. Die Vorgabe hier gilt nur für das, was der
         * Anlege-Bildschirm vorschlägt.
         */
        armeeStaerke: "normal",

        /* Wie viele verschiedene Items es geben soll (seit v0.87). */
        itemVorrat: "alle",
        

        /* Die selbst angehakte Liste (seit v0.100) - nur bei

           `itemVorrat: "auswahl"` von Bedeutung. */
        itemAuswahl: [],

        /*
         * EINIGKEIT IST DIE VORGABE (seit v0.76, Eingangskorb vom 18.08.:
         * „Team muss einig sein soll andersrum da stehen").
         *
         * Der Haken am Anlege-Bildschirm fragt deshalb das GEGENTEIL ab und
         * heisst „Wer zuerst zieht, hat gezogen". Im MODELL bleibt `false` die
         * Vorgabe: Eine Partie ohne Regeln-Block stammt von früher und muss
         * weiterrechnen wie bisher.
         */
        einigkeit: true
    },

    /*
     * Welche Brettform in der Spielart-Auswahl gerade offen ist (seit v0.63).
     * Reine Anzeige — sie steht in keiner Partie, gespeichert wird nur die
     * gewählte Spielart. Vorgabe ist die quadratische Form: Dort liegt das
     * gewohnte Brett.
     */
    gewaehlteForm: "klassisch",

    /* Gerade angetipptes Feld (Feldnummer) oder -1. */
    gewaehltesFeld: -1,

    /*
     * Zu welchem Zugzähler die Auswahl gehört (seit v4.0); -1 = keine.
     *
     * Ohne diese Zahl überlebt eine Auswahl den nächsten Zug: Die Punkte und
     * die roten Schlagringe blieben auf dem Brett stehen, obwohl die Figuren
     * längst woanders standen und man gar nicht mehr am Zug war.
     */
    auswahlZaehler: -1,

    /* Zielfelder zum gewählten Feld, als Feldnummern. */
    moeglicheZiele: [],

    /*
     * DEN ZWEITEN WEG ZUR ROCHADE GIBT ES NICHT MEHR (ausgebaut in v0.44).
     *
     * Von v1.8 bis v0.43 war zusätzlich das TURMFELD anklickbar
     * (`rochadeZiele`) — mit dem Gedanken, dass man am echten Brett beide
     * Figuren anfasst. In der App war es ein zweiter Weg zu derselben Sache,
     * mit einer eigenen Kontur, die aussah wie eine Warnung. Geblieben ist der
     * eine Weg, den auch jeder andere Zug geht: **König antippen, Zugpunkt
     * antippen.** Der Rochadezug steht ohnehin als normaler Königszug in
     * `SCHACH.zuege`.
     */

    /*
     * Fähigkeit, die gerade auf ein Zielfeld wartet ("" = keine), und die
     * Felder, die dafür in Frage kommen. Beides nur auf diesem Gerät — der
     * gemeinsame Stand erfährt erst vom Einsatz, wenn er feststeht.
     */
    zielFaehigkeit: "",
    zielFelder: [],

    /*
     * DER VORSCHAU-KASTEN (seit v0.57).
     *
     * Bis v0.56 wirkte eine Fähigkeit sofort beim Antippen eines Feldes. Bei
     * Mauer (drei Felder), Frost und Friedhof (2×2) sah man dabei nicht, WO
     * genau sie landet — man tippte und hoffte. Jetzt setzt ein Tipp erst den
     * Kasten, ein weiterer Tipp verschiebt ihn, und unter dem Brett stehen
     * „Einsetzen" und „Abbrechen".
     *
     *     zielVorschau   das angetippte Feld (-1 = noch keines)
     *     zielUmriss     die Felder, die die Wirkung berühren würde
     *
     * Der Umriss wird NICHT hier gerechnet, sondern bei
     * `SCHACH_RUNDE.zielUmriss` erfragt — das ist dieselbe Rechnung, die
     * hinterher wirklich läuft.
     *
     * Warum antippen und nicht ziehen (Nutzer-Entscheidung 08.08.): Echtes
     * Ziehen kämpft auf dem Handy mit dem Scrollen der Seite, und der Finger
     * verdeckt genau das Feld, das man treffen will.
     */
    zielVorschau: -1,
    zielUmriss: [],

    /*
     * DIE LAGE DER MAUER (seit v0.80): "waagerecht" oder "senkrecht".
     *
     * Reiner Bildschirm-Zustand — im gespeicherten Stand steht sie NICHT.
     * `stand.mauern` ist eine Feldliste; ob die drei Felder neben- oder
     * übereinander liegen, sieht man ihnen an. Gebraucht wird die Angabe nur,
     * solange man platziert, und sie wird beim Abbrechen zurückgesetzt.
     *
     * Sie muss bis ins MODELL durchgereicht werden (`zielFelder`,
     * `zielUmriss`, `faehigkeitEinsetzen`): Sonst probiert `zielFelder` die
     * waagerechte Lage durch, während der Vorschau-Kasten die senkrechte zeigt
     * — und man tippt auf ein Feld, das gar nicht angeboten war.
     */
    mauerRichtung: "waagerecht",

    /*
     * Von welchem Rand das Nudelholz rollt (seit v0.117) — "unten", "oben",
     * "links" oder "rechts" in Brett-Koordinaten. Beim Start der Zielwahl
     * wird die EIGENE Seite vorgegeben (rollt von einem weg, wie früher);
     * der Knopf am Brett dreht reihum weiter.
     */
    nudelholzKante: "unten",

    /*
     * Die Richtung des Platztauschs (seit v0.101, Wunsch W7) — eine der vier
     * aus `SCHACH.TAUSCH_RICHTUNGEN`, gemessen an der eigenen Marschrichtung.
     * „vor" ist die Vorgabe und damit der Tausch, den es bis v0.100 als
     * einzigen gab.
     */
    tauschRichtung: "vor",

    /* Bis zu welchem Zugzähler die Wirkung einer Fähigkeit gezeigt wurde. */
    wirkungBis: {},

    /*
     * Der Abschluss einer Partie: { id, schritt }.
     * schritt 1 = Sieg oder Niederlage, schritt 2 = Punktestand.
     * Nur auf diesem Gerät — der gemeinsame Stand weiß davon nichts.
     */
    abschluss: null,

    /* Welche Abschlüsse dieses Gerät schon gesehen hat, steht im
       Gerätespeicher (ICH.abschlussGesehen) — sonst käme der Sieger-Bildschirm
       nach jedem Neuladen erneut. */

    /*
     * VORZÜGE GIBT ES NICHT MEHR (ausgebaut in v2.8).
     *
     * Sie waren in v2.5 gebaut: ein Zug, den man einträgt, während der Gegner
     * dran ist, ausgeführt sobald das eigene Team am Zug ist. In der Praxis lief
     * das nicht rund — der Zug sprang los, während man noch aufs Brett schaute,
     * und die Vormerkung war nach jedem Neuladen weg.
     *
     * Wer es später erneut versucht, findet die Begründung in
     * docs\DECISIONS.md. Wichtig bleibt dort die eine Festlegung: Ein Vorzug
     * darf NIE in den gemeinsamen Stand — sonst liest der Gegner ihn in der
     * offenen Datenbank mit.
     */

    /* Verhindert zwei Züge gleichzeitig vom selben Gerät. */
    ziehtGerade: false,

    /*
     * Der Computer denkt gerade nach (seit v0.27.0) — die Sperre gegen
     * doppeltes Anstossen. Die Abfrage zeichnet alle drei Sekunden neu, und
     * jedes Zeichnen käme sonst an `_botAnstossen` vorbei, während der
     * erste Bedenk-Augenblick noch läuft.
     *
     * ZWEI FELDER FÜR EINE SACHE, und das ist Absicht: Der Zeitgeber wird
     * NUR zum Abbrechen gebraucht, die Sperre wird VOR dem Aufruf von
     * `setTimeout` gesetzt. Stünde die Sperre in der Zeitgeber-Nummer,
     * bliebe der Bot in jeder Umgebung hängen, in der ein Zeitgeber sofort
     * feuert (die Testumgebung tut das): Der Rückruf räumte das Feld auf,
     * bevor die Zuweisung es gesetzt hätte.
     */
    botWartet: false,
    botZeitgeber: null,

    /*
     * Bis zu welchem Zugzähler eine Partie schon animiert wurde, je Kennung.
     * Ohne diesen Merker liefe die Bewegung bei jedem Neuzeichnen erneut —
     * und die Abfrage zeichnet oft.
     */
    animiertBis: {},

    /* Dauer der Zugbewegung in Millisekunden; muss zur Stildatei passen. */
    ANIMATION_MS: 260,

    /* Dauer des Aufleuchtens bei einer Fähigkeit; ebenfalls in der Stildatei
       (`--wirkung-dauer`). Seit v0.41 pulst es zweimal und dauert deshalb
       länger — ein einzelnes Aufblitzen von 900 ms sah man auf dem Handy nur,
       wenn man ohnehin hinschaute. */
    WIRKUNG_MS: 1600,

    /*
     * Wie gross eine Figur im Verhältnis zu ihrem Feld ist. Dieselbe Zahl
     * steht als Rückfall in der Stildatei (`.feld`, font-size) — gerechnet
     * wird sie hier aus der gemessenen Feldbreite, siehe
     * TEAM_SCHACH._figurGroesseSetzen.
     */
    FIGUR_ANTEIL: 0.68,

    /*
     * Wie lange ein Schritt der Bildanleitung stehen bleibt (seit v0.41).
     * Lang genug, um hinzusehen; kurz genug, dass man den nächsten abwartet.
     */
    ANLEITUNG_MS: 1600,

    /*
     * Die laufenden Takte der Bildanleitungen. Sie werden vor jedem
     * Neuzeichnen beendet — sonst schriebe ein Takt in Elemente weiter, die
     * niemand mehr sieht, und bei jeder Abfrage käme einer dazu.
     */
    anleitungTakte: [],

    /*
     * Steht die Fähigkeiten-Bibliothek schon im Bildschirm?
     *
     * Sie hängt an KEINEM Spielstand — es gibt also nichts, was die regelmässige
     * Abfrage dort auffrischen müsste. Würde sie trotzdem alle drei Sekunden neu
     * gezeichnet, klappte jeder aufgeklappte Eintrag wieder zu und jede
     * Anleitung finge von vorn an. Deshalb wird sie genau einmal gebaut.
     */
    infoGezeichnet: false,

    /*
     * Welchen Partien der Vorrat schon vorgestellt wurde (seit v0.100) —
     * `{ partieId: true }`. Steht bewusst NUR hier im Bildschirm und nie im
     * Stand: Es ist eine Nachricht an einen Zuschauer, kein Spielstand. Siehe
     * `vorratVorstellen`.
     */
    vorratGezeigt: {},

    /* Das Brett und ein Feld daraus, gemerkt beim Zeichnen — nur zum Messen. */
    brettEl: null,
    feldEl: null,

    verbinden(abgleich) {
        TEAM_SCHACH.abgleich = abgleich;
    },

    aufbauen(behaelter) {
        TEAM_SCHACH.wurzelEl = document.createElement("div");
        TEAM_SCHACH.wurzelEl.className = "schach";
        behaelter.appendChild(TEAM_SCHACH.wurzelEl);
    },

    /*
     * Wird bei jedem Wechsel auf diesen Tab gerufen. Nötig, weil der Stand
     * längst geladen sein kann, bevor es diesen Bereich überhaupt gibt — dann
     * bliebe der Tab sonst leer (siehe tabs.js).
     */
    beimOeffnen() {
        if (TEAM_SCHACH.abgleich) {
            TEAM_SCHACH.zeichnen(TEAM_SCHACH.abgleich.daten);
        }
    },

    /* Wer sitzt an diesem Gerät? Die Anmeldung läuft über den Würfel-Quizz. */
    _ich() {
        return ICH.person();
    },

    /* ---------------------------------------------------------------- *
     * Zeichnen
     * ---------------------------------------------------------------- */

    /*
     * WEICH NEU ZEICHNEN (seit v0.107) — für Knopfdrücke im Anlege-Bildschirm.
     *
     * `document.startViewTransition` ist eine eingebaute Browser-Schnittstelle
     * (keine Bibliothek): Sie macht ein Bild vom Bildschirm VOR dem Neuzeichnen
     * und blendet weich zum Stand DANACH über. Elemente mit einem
     * `view-transition-name` (die aktiven Knöpfe der Reihen, `stil.css`)
     * wandern dabei sichtbar von der alten zur neuen Position — die Markierung
     * gleitet zum gedrückten Knopf, statt hart umzuspringen.
     *
     * NUR FÜR NUTZER-AKTIONEN. Die regelmässige Abfrage ruft weiter das harte
     * `zeichnen`: Ein fremder Zug soll einfach dastehen, nicht überblenden —
     * und zwei überlappende Übergänge brechen einander ab.
     *
     * Ohne die Schnittstelle (ältere Browser, die Tests) oder mit
     * eingeschalteter Bewegungs-Reduzierung wird hart gezeichnet — die App
     * verhält sich exakt wie vor v0.107.
     */
    weichZeichnen() {
        const malen = () => TEAM_SCHACH.zeichnen(TEAM_SCHACH.abgleich.daten);

        const ruhig = (typeof window !== "undefined" && window.matchMedia
            && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

        if (ruhig || typeof document.startViewTransition !== "function") {
            malen();
            return;
        }

        document.startViewTransition(malen);
    },

    zeichnen(tafel) {
        const wurzel = TEAM_SCHACH.wurzelEl;
        if (!wurzel) {
            return;
        }

        /* Nur die offene Partie ist ein eigenes Fenster ohne Tab-Leiste
           (seit v0.113) — der Zweig ganz unten meldet sich zurück. Alle
           anderen Ansichten zeigen die Leiste. */
        TABS.rundeSetzen("team-schach", false);

        /* Neue Einladungen als Banner melden (seit v0.13.0) — bei jedem
           geholten Stand, unabhängig von der gezeigten Ansicht. */
        TEAM_SCHACH._einladungenMelden(tafel);

        /* Die Bibliothek steht schon — sie hängt an keinem Spielstand (siehe
           `infoGezeichnet`). Für die Schachregel-Anleitung gilt dasselbe. */
        if (TEAM_SCHACH.infoOffen && TEAM_SCHACH.infoGezeichnet) {
            return;
        }
        if (TEAM_SCHACH.grundlagenOffen && TEAM_SCHACH.grundlagenGezeichnet) {
            return;
        }

        TEAM_SCHACH._anleitungTakteBeenden();
        wurzel.innerHTML = "";

        const person = TEAM_SCHACH._ich();
        if (!person) {
            wurzel.appendChild(TEAM_SCHACH._element("p", "erklaerung",
                "Melde dich zuerst mit deinem Namen an — dann bist du auch hier "
                + "mit deinem Namen dabei."));
            return;
        }

        if (TEAM_SCHACH.infoOffen) {
            TEAM_SCHACH._infoZeichnen(wurzel);
            TEAM_SCHACH.infoGezeichnet = true;
            return;
        }

        /* Die Schachregeln stehen VOR der Auswahl und der Übersicht — wer
           nachschlägt, will nicht zwischendurch eine Partie anlegen. */
        if (TEAM_SCHACH.grundlagenOffen) {
            TEAM_SCHACH._grundlagenZeichnen(wurzel);
            TEAM_SCHACH.grundlagenGezeichnet = true;
            return;
        }

        if (TEAM_SCHACH.auswahlOffen) {
            TEAM_SCHACH._auswahlZeichnen(wurzel);
            return;
        }

        /*
         * Ist eine Partie zu Ende gegangen, in der dieses Gerät mitgespielt
         * hat, kommt der Abschluss von selbst — egal, ob die Partie gerade
         * offen ist oder man in der Übersicht steht.
         *
         * Bis v2.5 hing er an der geöffneten Partie. Wer beim letzten Zug
         * gerade in der Übersicht war (oder erst Stunden später wiederkam),
         * bekam ihn nie zu sehen: Beendete Partien liegen seither zugeklappt
         * unter „Beendet", und niemand sucht dort nach einem Sieg.
         */
        /*
         * ABER NICHT MITTEN IN EINER ANDEREN PARTIE (seit v3.9).
         *
         * Bis v3.8 galt die Suche immer. Lag irgendeine beendete Partie herum,
         * deren Abschluss man nie weggeklickt hatte, verdrängte sie bei JEDEM
         * Zeichnen die Partie, die man gerade spielte — also alle drei
         * Sekunden erneut. Man kam schlicht nicht mehr ans Brett, und auf dem
         * Bildschirm stand stattdessen dauerhaft der Punktestand. Genau so
         * wurde es gemeldet.
         *
         * Verloren geht dadurch nichts: Der Abschluss wartet, bis man die
         * offene Partie verlässt. Nur wenn die OFFENE Partie selbst zu Ende
         * geht, kommt er sofort — und das ist der Moment, um den es geht.
         */
        const offeneJetzt = TEAM_SCHACH.offeneId
            ? SCHACH_TAFEL.partie(tafel, TEAM_SCHACH.offeneId)
            : null;
        const spieltNoch = !!(offeneJetzt && !offeneJetzt.ergebnis);

        if (!TEAM_SCHACH.abschluss && !spieltNoch) {
            /*
             * NUR DIE ZULETZT BEENDETE (seit v0.69, Wunsch #23).
             *
             * Gemeldet als: „Wenn ich auf Schach gehe, bekomme ich erstmal
             * ALLE Matches, die ich gewonnen oder verloren habe, als Anzeige."
             * Genau so war es gebaut — gesucht wurde die erste beste Partie,
             * die dieses Gerät noch nicht abgehakt hatte, und nach dem
             * Wegklicken kam die nächste. Wer ein paar Tage nicht hineingesehen
             * hatte, klickte sich durch seine ganze Historie.
             *
             * Jetzt kommt nur die JÜNGSTE ungesehene; alle älteren gelten
             * damit als gesehen. Verloren geht nichts — jede beendete Partie
             * lässt sich in der Übersicht über „Ergebnis ansehen" wieder
             * öffnen.
             */
            const offeneAbschluesse = SCHACH_TAFEL.liste(tafel).filter((partie) =>
                partie.ergebnis
                && !ICH.abschlussGesehen(partie.id)
                && SCHACH_RUNDE.teamVon(partie, person.id));

            const fertig = offeneAbschluesse
                .slice()
                .sort((einer, anderer) =>
                    (anderer.geaendertAm || 0) - (einer.geaendertAm || 0))[0];

            /* Die älteren gleich mit abhaken, sonst kämen sie beim nächsten
               Öffnen doch wieder — eine nach der anderen. */
            for (const aeltere of offeneAbschluesse) {
                if (!fertig || aeltere.id !== fertig.id) {
                    ICH.abschlussMerken(aeltere.id);
                }
            }

            if (fertig) {
                /* Schritt 0 ist die Rückschau (seit v0.61): Sie kommt VOR
                   „Gewonnen"/„Verloren" — danach liest niemand mehr nach, wie
                   es dazu kam. */
                TEAM_SCHACH.abschluss = { id: fertig.id, schritt: 0 };
            }
        }

        if (TEAM_SCHACH.abschluss) {
            const partie = SCHACH_TAFEL.partie(tafel, TEAM_SCHACH.abschluss.id);

            if (partie && partie.ergebnis) {
                TEAM_SCHACH._abschlussZeichnen(wurzel, partie, person);
                return;
            }
            TEAM_SCHACH.abschluss = null;
        }

        const offene = TEAM_SCHACH.offeneId
            ? SCHACH_TAFEL.partie(tafel, TEAM_SCHACH.offeneId)
            : null;

        if (offene) {
            /* Die offene Partie ist ein Fenster: Tab-Leiste weg (v0.113). */
            TABS.rundeSetzen("team-schach", true);

            /* Die stille Zeitmessung läuft nur, solange eine Partie offen ist
               (v0.93) — siehe `_zeitMessungStarten`. */
            TEAM_SCHACH._zeitMessungStarten(offene.id);
            TEAM_SCHACH._partieZeichnen(wurzel, offene, person);

            /* Ist der Computer dran, zieht er gleich (v0.27.0) — erst nach
               dem Zeichnen, damit das eigene Brett schon dasteht. */
            TEAM_SCHACH._botAnstossen(offene, person);
        } else {
            TEAM_SCHACH._zeitMessungStoppen();
            TEAM_SCHACH._botAbbrechen();

            /* Die Partie kann inzwischen gelöscht worden sein. */
            TEAM_SCHACH.offeneId = "";
            TEAM_SCHACH._uebersichtZeichnen(wurzel, tafel, person);
        }
    },

    /* ---------------------------------------------------------------- *
     * Eine Partie
     * ---------------------------------------------------------------- */

    _partieZeichnen(wurzel, partie, person) {
        /* Zuerst: Gilt die Auswahl überhaupt noch? Sie lebt in diesem Objekt
           und nicht im Spielstand — siehe _auswahlPruefen. */
        TEAM_SCHACH._auswahlPruefen(partie, person);

        /*
         * Vor dem Anpfiff einmal zeigen, welche Items drin sind (seit v0.100).
         * NICHT abgewartet: Das Zeichnen läuft weiter, das Fenster legt sich
         * darüber. Ein `await` hier hielte den ganzen Bildschirm an, bis
         * jemand liest.
         */
        TEAM_SCHACH.vorratVorstellen(partie);

        wurzel.appendChild(TEAM_SCHACH._partieKopfBauen(partie));
        wurzel.appendChild(TEAM_SCHACH._standLeisteBauen(partie, person));

        const unglueck = TEAM_SCHACH._unglueckMeldungBauen(partie);
        if (unglueck) {
            wurzel.appendChild(unglueck);
        }

        wurzel.appendChild(TEAM_SCHACH._teamsBauen(partie, person));

        const halter = TEAM_SCHACH._brettBauen(partie, person);
        wurzel.appendChild(halter);

        const koennen = TEAM_SCHACH._faehigkeitenBauen(partie, person);
        if (koennen) {
            wurzel.appendChild(koennen);
        }

        wurzel.appendChild(TEAM_SCHACH._verlaufBauen(partie));
        wurzel.appendChild(TEAM_SCHACH._fussleisteBauen(partie, person));

        /* Erst wenn das Brett im Bildschirm steht, lässt sich die Feldgröße
           messen — deshalb stehen Größe und Bewegung ganz am Ende. */
        TEAM_SCHACH._figurGroesseSetzen();
        TEAM_SCHACH._groessenWaechterStarten();
        TEAM_SCHACH._zugAnimieren(halter, partie, person);
        TEAM_SCHACH._wirkungAnimieren(halter, partie);

    },

    /*
     * Lässt die Felder aufleuchten, auf die eine Fähigkeit gewirkt hat.
     *
     * Wie bei der Zugbewegung stehen die betroffenen Felder im Verlauf —
     * deshalb sieht JEDES Gerät die Wirkung, nicht nur das auslösende. Eine
     * Fähigkeit, die nur der Auslöser sieht, wäre die falsche Lösung: Der
     * Gegner müsste sonst raten, warum plötzlich eine Figur woanders steht.
     */
    _wirkungAnimieren(halter, partie) {
        /*
         * Auch hier NICHT blind der letzte Eintrag (seit v0.69, Wunsch #30):
         * Eine neu erschienene Lootbox hängt sich hinten an und hätte das
         * Aufleuchten der Fähigkeit verschluckt, die einen Zug vorher gewirkt
         * hat. Dieselbe Suche wie bei Spur und Bewegung.
         */
        const letzter = TEAM_SCHACH._letzterBewegungsEintrag(partie);

        if (!letzter || !letzter.wirkung || letzter.felder.length === 0) {
            TEAM_SCHACH.wirkungBis[partie.id] = partie.zugZaehler;
            return;
        }
        if (TEAM_SCHACH.wirkungBis[partie.id] === partie.zugZaehler) {
            return;
        }
        TEAM_SCHACH.wirkungBis[partie.id] = partie.zugZaehler;

        /* Zusätzlich zum Aufleuchten: das kleine Schauspiel der Fähigkeit
           (seit v0.115, Bündel Y) — Nudelholz rollt, Schild glänzt, Frost
           wächst. Der Merker oben sorgt dafür, dass es nur einmal spielt. */
        TEAM_SCHACH._wirkungSchauspiel(halter, letzter);

        const klasse = (letzter.wirkung === "pech") ? "feld-wirkung-pech" : "feld-wirkung";

        for (const feld of letzter.felder) {
            const zelle = halter.querySelector("[data-feld=\"" + feld + "\"]");
            if (!zelle) {
                continue;
            }
            zelle.classList.add(klasse);
            window.setTimeout(() => zelle.classList.remove(klasse),
                TEAM_SCHACH.WIRKUNG_MS + 60);
        }
    },

    /*
     * DER STREIFEN NACH EINEM UNGLÜCKSWÜRFEL (seit v0.59, Wunsch #13).
     *
     * Gemeldet als: „Es muss eine Information erscheinen, ob ein negatives Item
     * eingesammelt wurde." Bis dahin sah man nur die Folgen — Felder leuchteten
     * rot auf, eine Figur stand plötzlich woanders — und musste sich den Grund
     * aus dem Zugverlauf zusammensuchen, der weit unter dem Brett steht.
     *
     * Drei Entscheidungen dahinter:
     *
     *   - Er steht DIREKT UNTER der Stand-Leiste, über dem Brett: Dort schaut
     *     man ohnehin hin, und er schiebt das Brett nicht aus dem Bild.
     *   - Er wird aus dem VERLAUF gelesen, nicht aus einem gemerkten Zustand.
     *     Damit sieht ihn JEDES Gerät (auch der Gegner, der wissen muss, warum
     *     das Brett sich verändert hat), und er überlebt jedes Neuzeichnen.
     *   - Er verschwindet von selbst, sobald irgendetwas anderes passiert —
     *     wegklicken muss ihn niemand.
     *
     * Kein Bruch der eisernen Regel „die Oberfläche verrät nie, was in einem
     * Würfel steckt": Hier ist er bereits eingesammelt und hat gewirkt.
     */
    _unglueckMeldungBauen(partie) {
        const letzter = partie.verlauf[partie.verlauf.length - 1];

        if (!letzter || letzter.wirkung !== "pech") {
            return null;
        }

        const streifen = TEAM_SCHACH._element("div", "meldung meldung-fehler unglueck-meldung");

        /* Seite und Text getrennt — genau wie im Zugverlauf. Der Satz gehört
           dem Modell (`_pechAusloesen` schreibt ihn), die Seite steht im
           Eintrag daneben; zusammengesetzt stünde sie zweimal da. */
        streifen.appendChild(TEAM_SCHACH._element(
            "span",
            "zug-farbe " + ((letzter.farbe === "weiss") ? "zug-weiss" : "zug-schwarz"),
            (letzter.farbe === "weiss") ? "Weiss" : "Schwarz"
        ));
        streifen.appendChild(TEAM_SCHACH._element("span", "unglueck-text", letzter.text));

        return streifen;
    },

    _partieKopfBauen(partie) {
        const kopf = TEAM_SCHACH._element("div", "partie-kopf");

        /*
         * DER KOPF IST LEER BIS AUF DEN BEITRITTS-CODE (seit v0.40.0).
         *
         * Nutzer-Ansage 24.08.2026: „Wenn man eine Runde mit Spielen betritt
         * soll oben das Zurück Knopf weg, dann beide kleines-Brett-
         * Beschreibungen ganz oben auch überall weg, dafür soll in eine Ecke
         * oben blass der Beitritts Code stehen ohne Zusatz Text."
         *
         * WAS WEGGEFALLEN IST UND WOHIN ES GING:
         *   - „Zurück" — F10 hatte ihn während der eigenen laufenden Partie
         *     ohnehin verborgen; jetzt fehlt er immer. Hinaus kommt man über
         *     die Fussleiste (`_fussleisteBauen`), die seit v0.26.0 ALLE
         *     Runden-Aktionen trägt.
         *   - Der Partie-Titel und der Spielart-Chip — beide sagten
         *     dasselbe („Kleines Brett"), und beide standen über dem Brett,
         *     das es zeigt.
         *
         * DER CODE STEHT NUR AN OFFENEN PARTIEN: Eine beendete hat keinen
         * gültigen mehr (`SCHACH_TAFEL.partieZuCode` findet sie nicht), und
         * eine Zahl, die nirgends hinführt, ist schlimmer als keine.
         */
        if (!partie.ergebnis) {
            kopf.appendChild(TEAM_SCHACH._element("span", "partie-code",
                SCHACH_RUNDE.beitrittsCode(partie.id)));
        }

        /*
         * WELCHE ITEMS IN DIESER PARTIE VORKOMMEN (seit v0.87, Wunsch R6:
         * „Am Anfang vom Match soll gezeigt werden, welche Items alle drin
         * sind — ausser bei dem Modus, wo alle da sind").
         *
         * Es steht im Kopf und nicht in einem einmaligen Fenster: Die Liste
         * ist keine Nachricht, sondern eine REGEL dieser Partie — man will
         * sie auch im dreissigsten Zug noch nachsehen können, ohne dass
         * jemand sie sich gemerkt haben muss.
         */
        const vorrat = SCHACH_RUNDE.itemVorrat(partie);

        if (vorrat) {
            kopf.appendChild(TEAM_SCHACH._infoZeichenBauen(
                "Diese Items gibt es (" + vorrat.length + ")",
                "In dieser Partie kommen nur diese Items vor — ausgelost beim "
                + "Anlegen und für beide Seiten gleich:\n\n"
                + vorrat.map((art) => SCHACH_VARIANTEN.faehigkeitTitel(art)).join(", ")));
        }

        return kopf;
    },

    /*
     * Die Leiste über dem Brett: wer am Zug ist, ob Schach steht, welche
     * Fähigkeiten wirken. Sie trägt `stand-leiste` und klebt damit beim
     * Scrollen oben fest — auf dem Handy sieht man sonst nur noch das Brett und
     * weiß nicht mehr, wer dran ist.
     */
    _standLeisteBauen(partie, person) {
        const leiste = TEAM_SCHACH._element("div", "phasen-leiste stand-leiste");
        const meinTeam = SCHACH_RUNDE.teamVon(partie, person.id);

        if (partie.ergebnis) {
            const text = (partie.ergebnis === "remis")
                ? "Unentschieden"
                : ((partie.ergebnis === "weiss") ? "Weiss gewinnt" : "Schwarz gewinnt");
            leiste.appendChild(TEAM_SCHACH._element("span", "chip chip-fertig", text));
        } else if (partie.laeuft) {
            const amZug = (partie.stand.amZug === "weiss") ? "Weiss" : "Schwarz";
            const dran = (meinTeam === partie.stand.amZug);
            leiste.appendChild(TEAM_SCHACH._element(
                "span",
                "chip " + (dran ? "chip-fertig" : "chip-laeuft"),
                dran ? "Dein Team ist am Zug" : amZug + " ist am Zug"
            ));
        } else {
            leiste.appendChild(TEAM_SCHACH._element("span", "chip chip-offen",
                "Noch nicht gestartet"));
        }

        if (partie.laeuft && SCHACH.imSchach(partie.stand, partie.stand.amZug)) {
            leiste.appendChild(TEAM_SCHACH._element("span", "chip chip-fehler", "Schach"));
        }

        /*
         * WENN NIEMAND ZIEHEN KANN, STEHT ES DA (seit v0.94).
         *
         * Bis v0.93 konnte eine Fähigkeit den Gegner mattsetzen, ohne dass die
         * Partie endete — die Leiste sagte weiter „am Zug", und man tippte ins
         * Leere. Im Modell ist das gleich zweifach abgestellt: Seit v0.95 wird
         * eine Fähigkeit, die dorthin führen würde, gar nicht erst angenommen
         * (`_wirkungVerboten`), und was doch noch endet — ein Unglück beim
         * Einsammeln — beendet die Partie ordentlich (`SCHACH.lage`).
         *
         * Diese Marke bleibt trotzdem: Sie ist die Absicherung für JEDEN
         * künftigen Weg, auf dem eine Stellung ohne Zug entsteht. Lieber eine
         * Marke zu viel als ein Brett, das sich totstellt.
         *
         * Gefragt wird das Modell, nicht selbst gerechnet — und nur bei einer
         * laufenden Partie, damit `alleZuege` nicht bei jedem Bild einer
         * beendeten Partie umsonst läuft.
         */
        if (partie.laeuft && !partie.ergebnis
            && SCHACH.alleZuege(partie.stand).length === 0) {

            leiste.appendChild(TEAM_SCHACH._element("span", "chip chip-fehler",
                "Kein Zug möglich"));
        }

        /*
         * WIE LANGE DAS VOLLE GLAS NOCH TRÜBT (seit v0.69, Wunsch #33).
         *
         * Jede andere ablaufende Wirkung trägt ihre Restzeit am FELD
         * (`SCHACH.restzeitAuf`, seit v0.53). Das volle Glas hat kein Feld — es
         * trübt die Sicht einer ganzen SEITE und hängt an `glasBis`. Deshalb
         * steht seine Restzeit hier oben in der Leiste, wo auch alles andere
         * steht, was für die ganze Partie gilt.
         *
         * Gezeigt wird sie NUR DEM BETROFFENEN: Der Gegner soll nicht wissen,
         * wie lange er noch falsch sieht — und schon gar nicht, dass er es tut.
         */
        if (partie.laeuft && meinTeam && partie.stand.glasFarbe === meinTeam) {
            const rest = partie.stand.glasBis - partie.zugZaehler;

            if (rest > 0) {
                leiste.appendChild(TEAM_SCHACH._element("span", "chip chip-fehler",
                    "Sicht getrübt: noch " + rest + (rest === 1 ? " Halbzug" : " Halbzüge")));
            }
        }

        /*
         * „Wird gesendet" — solange ein eigener Zug unterwegs ist (seit v3.9).
         *
         * Ohne diese Marke tippt man in dieser Zeit ins Leere: Das Brett nimmt
         * keine Züge mehr an (`ziehtGerade`), sagt es aber niemandem. Wer
         * mehrmals drückt und nichts passieren sieht, hält die Seite für
         * abgestürzt — genau so wurde es gemeldet.
         */
        if (TEAM_SCHACH.ziehtGerade) {
            leiste.appendChild(TEAM_SCHACH._element("span", "chip chip-laeuft",
                "Wird gesendet …"));
        }

        /* Aktive Fähigkeiten sichtbar machen — sonst wundert sich der Gegner
           über einen Zug, den es sonst nicht gibt. */
        if (partie.stand.sprungAktiv) {
            leiste.appendChild(TEAM_SCHACH._element("span", "chip chip-laeuft",
                "Sprung aktiv: " + ((partie.stand.sprungAktiv === "weiss") ? "Weiss" : "Schwarz")));
        }
        if (partie.stand.extraZug) {
            leiste.appendChild(TEAM_SCHACH._element("span", "chip chip-laeuft",
                "Doppelzug: " + ((partie.stand.extraZug === "weiss") ? "Weiss" : "Schwarz")));
        }

        leiste.appendChild(TEAM_SCHACH._element("span", "phasen-text",
            "Zug " + partie.stand.zugNummer));

        return leiste;
    },

    /* ---------------------------------------------------------------- *
     * Teams
     * ---------------------------------------------------------------- */

    _teamsBauen(partie, person) {
        const bereich = TEAM_SCHACH._element("div", "team-reihe");
        const meinTeam = SCHACH_RUNDE.teamVon(partie, person.id);

        /*
         * IN EINER COMPUTER-RUNDE VOR DER SEITENWAHL sagt ein Satz, was zu
         * tun ist (seit v0.29.0). Ohne ihn stünden dort zwei leere Karten
         * und der Computer nirgends — man müsste raten, ob überhaupt einer
         * kommt. Er verschwindet, sobald er wahr geworden ist.
         */
        if (SCHACH_BOT.botVorgesehen(partie) && !SCHACH_BOT.istBotPartie(partie)
                && !partie.ergebnis) {
            bereich.appendChild(TEAM_SCHACH._element("p", "erklaerung",
                meinTeam
                    ? "Der Computer setzt sich auf die andere Seite, sobald "
                        + "du auf „Bereit“ drückst."
                    : "Such dir eine Seite aus — der Computer nimmt die "
                        + "andere, sobald du bereit bist."));
        }

        for (const farbe of ["weiss", "schwarz"]) {
            const karte = TEAM_SCHACH._element("section",
                "karte team-karte" + (meinTeam === farbe ? " team-karte-meine" : ""));

            const kopf = TEAM_SCHACH._element("div", "karte-kopf");
            kopf.appendChild(TEAM_SCHACH._element("h3", "",
                (farbe === "weiss") ? "Weiss" : "Schwarz"));

            if (partie.bereit[farbe]) {
                kopf.appendChild(TEAM_SCHACH._element("span", "chip chip-fertig", "bereit"));
            }
            karte.appendChild(kopf);

            /* Namen der Mitspieler — aufgelöst über die Runde des Würfel-Quizz,
               weil dort die Namen stehen. */
            const namen = partie.teams[farbe].map((id) => TEAM_SCHACH._nameVon(id));
            karte.appendChild(TEAM_SCHACH._element("p", "team-namen",
                namen.length > 0 ? namen.join(", ") : "noch niemand"));

            const leiste = TEAM_SCHACH._element("div", "karte-fuss");

            if (meinTeam === farbe) {
                /* „Team verlassen" stand hier bis v0.25.0. Seit v0.26.0
                   sammelt die Fussleiste alle Runden-Aktionen an EINER
                   Stelle (`_fussleisteBauen`) — hier bleibt nur, was das
                   Team selbst betrifft. */
                if (!partie.laeuft && !partie.ergebnis) {
                    leiste.appendChild(TEAM_SCHACH._knopf(
                        partie.bereit[farbe] ? "Doch nicht bereit" : "Bereit",
                        partie.bereit[farbe] ? "knopf-still knopf-klein" : "knopf-haupt",
                        () => TEAM_SCHACH.bereitUmschalten(partie, farbe, !partie.bereit[farbe])
                    ));
                }
            } else if (!(meinTeam && partie.bereit[meinTeam])) {
                /*
                 * WER BEREIT IST, SIEHT DIE ANDERE SEITE NICHT MEHR ALS
                 * ANGEBOT (seit v0.44.0).
                 *
                 * Nutzer-Entscheidung 24.08.2026 zu Punkt 7: „2. kann raus,
                 * du bist schon beigetreten — soll erst kommen, wenn man 1
                 * drückt." Gemeint ist „Doch nicht bereit": Erst wer seine
                 * Bereitschaft zurücknimmt, bekommt die Wahl wieder.
                 *
                 * Die Bedingung fragt `partie.bereit[meinTeam]` und nicht
                 * „läuft die Partie" — genau darum geht es: Der Knopf soll
                 * schon im Warten verschwinden, nicht erst beim Anpfiff.
                 *
                 * DIE DREI BEITRITTS-KNÖPFE SEHEN GLEICH AUS (seit v0.41.0,
                 * Nutzer-Ansage 24.08.2026): „Die Knöpfe weiss, schwarz und
                 * Zufall sollen alle drei gleich aussehen und die
                 * entsprechenden Farben bekommen."
                 *
                 * Sie tragen deshalb dieselbe Grundklasse `team-knopf` und
                 * unterscheiden sich nur in der Farbe. Der dritte steht
                 * weiter unten, ausserhalb der Karten — er gehört zu keiner
                 * Seite.
                 */
                leiste.appendChild(TEAM_SCHACH._knopf("Mitspielen",
                    "team-knopf team-knopf-" + farbe,
                    () => TEAM_SCHACH.teamBeitreten(partie, farbe)));
            }

            karte.appendChild(leiste);
            bereich.appendChild(karte);
        }

        /* Wer noch in keinem Team ist, kann sich auch würfeln lassen. Der
           Knopf trägt seit v0.41.0 dieselbe Form wie die beiden in den
           Karten, nur diagonal geteilt — er gehört zu keiner Seite. */
        if (!meinTeam && !partie.ergebnis) {
            const zufall = TEAM_SCHACH._element("div", "team-zufall-zeile");
            zufall.appendChild(TEAM_SCHACH._knopf("Zufall",
                "team-knopf team-knopf-zufall",
                () => TEAM_SCHACH.zufaelligBeitreten(partie)));
            bereich.appendChild(zufall);
        }

        /*
         * Der Beitritts-Code zum Weitergeben (seit v0.10.0): Er steht bei
         * den Teams, weil man ihn genau dann braucht, wenn noch jemand
         * fehlt. Er gilt, solange die Partie nicht beendet ist — auch
         * Nachzügler dürfen herein (F19).
         */
        /* ---- DIE CODE-ZEILE IST WEG (v0.40.1). ----
         *
         * Sie stand hier seit v0.10.0 mit Beschriftung und Erklärsatz. Seit
         * v0.40.0 steht der Code blass oben in der Ecke des Kopfes
         * (`partie-code`) — und damit stand er ZWEIMAL auf demselben
         * Bildschirm. Die Nutzer-Ansage war „ohne Zusatz Text"; also bleibt
         * die knappe Fassung oben, und diese hier geht. */

        /*
         * FREUNDE EINLADEN (seit v0.13.0, Schritt 7): nur Freunde („erst
         * befreunden, dann einladen", F17), die weder mitspielen noch
         * schon eingeladen sind noch in einer anderen laufenden Partie
         * stecken (F16d). Der Eingeladene bekommt ein Banner und findet
         * die Runde unter „Runde beitreten".
         */
        if (!partie.ergebnis && meinTeam
                && typeof ANMELDUNG !== "undefined" && ANMELDUNG.abgleich) {
            const einladbare = SPIELER.freundeVon(
                ANMELDUNG.abgleich.daten, person.id).freunde.filter((freund) =>
                    !SCHACH_RUNDE.teamVon(partie, freund.id)
                    && !SCHACH_RUNDE.istEingeladen(partie, freund.id)
                    && SCHACH_TAFEL.eigeneLaufende(
                        TEAM_SCHACH.abgleich.daten, freund.id).length === 0);

            if (einladbare.length > 0) {
                bereich.appendChild(TEAM_SCHACH._element("p", "erklaerung",
                    "Freunde einladen:"));
                for (const freund of einladbare) {
                    const zeile = TEAM_SCHACH._element("div", "freunde-zeile");
                    zeile.appendChild(TEAM_SCHACH._element("span",
                        "freunde-name", freund.name));
                    zeile.appendChild(TEAM_SCHACH._knopf("Einladen",
                        "knopf-still knopf-klein",
                        () => TEAM_SCHACH.einladen(partie, freund.id)));
                    bereich.appendChild(zeile);
                }
            }

            /* Wer schon eingeladen ist, steht dabei — niemand fragt doppelt. */
            const wartend = SCHACH_RUNDE.normalisieren(partie).eingeladen
                .filter((id) => SCHACH_RUNDE.istEingeladen(partie, id));
            if (wartend.length > 0) {
                bereich.appendChild(TEAM_SCHACH._element("p", "erklaerung",
                    "Eingeladen: " + wartend.map(
                        (id) => TEAM_SCHACH._nameVon(id)).join(", ")));
            }
        }

        return bereich;
    },

    /*
     * Zufällig einem Team beitreten — aber nur dann zufällig, wenn beide
     * gleich besetzt sind. Steht ein Team leer, geht es dorthin: Eine Partie
     * mit vier gegen null fängt nie an.
     */
    zufaelligBeitreten(partie) {
        const leer = ["weiss", "schwarz"].filter(
            (farbe) => partie.teams[farbe].length === 0);

        let farbe;
        if (leer.length === 1) {
            farbe = leer[0];
        } else if (partie.teams.weiss.length !== partie.teams.schwarz.length) {
            /* Sonst in das kleinere Team — das hält die Seiten im Gleichgewicht. */
            farbe = (partie.teams.weiss.length < partie.teams.schwarz.length)
                ? "weiss" : "schwarz";
        } else {
            farbe = (Math.random() < 0.5) ? "weiss" : "schwarz";
        }

        TEAM_SCHACH.teamBeitreten(partie, farbe);
    },

    /* Name eines Spielers aus der Spielerliste; Kennung als Rückfall. */
    _nameVon(spielerId) {
        /*
         * Der Computer steht in KEINER Spielerliste (seit v0.27.0) — er hat
         * kein Konto. Ohne diesen Zweig hiesse er an der Team-Karte und im
         * Verlauf „Unbekannt".
         */
        if (SCHACH_BOT.istBot(spielerId)) {
            return SCHACH_BOT.NAME;
        }

        const spielerDaten = (ANMELDUNG.abgleich && ANMELDUNG.abgleich.daten)
            ? ANMELDUNG.abgleich.daten
            : null;

        if (spielerDaten) {
            const spieler = SPIELER.spielerFinden(spielerDaten, spielerId);
            if (spieler) {
                return spieler.name;
            }
        }
        return "Unbekannt";
    },

    /* ---------------------------------------------------------------- *
     * Fussleiste der Partie
     * ---------------------------------------------------------------- */

    /*
     * DIE FUSSLEISTE IST DIE EINE STELLE FÜR ALLE RUNDEN-AKTIONEN
     * (seit v0.26.0, Nutzer-Ansage 24.08.: „wenn ich ein spiel starte gibt
     * es noch die knöpfe zurück und so ganz unten, die sollen alle zsm
     * gefasst werden").
     *
     * Vorher lagen sie an drei Orten: „Zurück" oben im Kopf, „Team
     * verlassen" an der eigenen Team-Karte, und hier unten Aufgeben,
     * Umbenennen, Neu aufstellen und Zur Übersicht. Jetzt steht alles hier —
     * und zwar nur noch das, was in der jeweiligen Lage überhaupt geht:
     *
     *     beendet          Neu aufstellen (Hauptaktion), Zur Übersicht
     *     läuft, ich spiele mit   Aufgeben, Neu aufstellen, Runde verlassen
     *     wartet, ich spiele mit  Neu aufstellen, Runde verlassen,
     *                             Zur Übersicht
     *     ich schaue nur zu       Zur Übersicht
     *
     * „ZUR ÜBERSICHT" FEHLT IN DER LAUFENDEN EIGENEN PARTIE — dieselbe
     * Entscheidung wie beim Zurück-Knopf im Kopf (F10, v0.9.0): Solange die
     * eigene Runde läuft, zeigt die App nur sie. Wer wirklich raus will,
     * gibt auf oder verlässt die Runde.
     *
     * „UMBENENNEN" IST GANZ ENTFALLEN: Seit v0.14.0 haben Runden keinen
     * eigenen Namen mehr, nur den Titel ihrer Spielart. Der Knopf hätte
     * etwas geändert, das es nicht mehr gibt.
     */
    _fussleisteBauen(partie, person) {
        const leiste = TEAM_SCHACH._element("div", "fussleiste");
        const meinTeam = SCHACH_RUNDE.teamVon(partie, person.id);
        const laeuftMit = !partie.ergebnis && partie.laeuft === true && !!meinTeam;

        /*
         * EIN WORT FÜR EINE SACHE (seit v0.94).
         *
         * Beide Zweige rufen `neuAufstellen` — bis v0.93 hiess derselbe
         * Vorgang bei beendeter Partie „Neu aufstellen" und bei laufender
         * „Partie zurücksetzen". Sie stehen nie gleichzeitig da, deshalb fiel
         * es nicht auf; wer aber beides einmal gesehen hat, sucht danach zwei
         * verschiedene Dinge. Jetzt heisst es überall „Neu aufstellen" — der
         * Unterschied bleibt in der FARBE (Hauptaktion, sobald die Partie
         * vorbei ist) und in der Rückfrage, die `neuAufstellen` ohnehin stellt.
         */
        if (partie.ergebnis) {
            leiste.appendChild(TEAM_SCHACH._knopf("Neu aufstellen", "knopf-haupt",
                () => TEAM_SCHACH.neuAufstellen(partie)));
        } else if (laeuftMit) {
            /*
             * IM LAUFENDEN MATCH GIBT ES NUR „AUFGEBEN" (seit v0.43.0).
             *
             * Nutzer-Ansage 24.08.2026: „Sobald Match startet soll nur ein
             * aufgeben Knopf geben, wo das Match schliesst und man
             * verliert." Weggefallen sind hier deshalb „Neu aufstellen"
             * (eine laufende Partie zurückzusetzen ist kein Zug, sondern
             * ein Rückgängig) und „Runde verlassen" (dasselbe Ergebnis wie
             * Aufgeben, nur ohne es so zu nennen).
             *
             * Das ist die konsequente Fassung von F10 (v0.9.0): Solange die
             * eigene Runde läuft, zeigt die App nur sie — und es gibt genau
             * einen Weg hinaus, der ehrlich heisst, was er tut. Die zwei
             * Schritte bleiben: Aufgeben ist nichts, was ein Daumen
             * versehentlich erledigen darf.
             */
            leiste.appendChild(DIALOG.zweiSchritt(
                TEAM_SCHACH._knopf("Aufgeben", "knopf-gefahr knopf-klein", null),
                () => TEAM_SCHACH.aufgeben(partie, meinTeam)));
            return leiste;
        }

        /*
         * „NEU AUFSTELLEN" GIBT ES NUR BEI ZUFALLSARMEE (seit v0.42.0).
         *
         * Nutzer-Ansage 24.08.2026, Lesart am selben Tag bestätigt: Der
         * Knopf ist zum NEU WÜRFELN da. Ohne Zufallsarmee würfelt er nichts
         * — er stellte nur dieselbe feste Aufstellung wieder hin, und dafür
         * braucht es keinen Knopf.
         *
         * ZWEI FÄLLE, UND SIE UNTERSCHEIDEN SICH:
         *   - Beide Seiten bekommen DIESELBE Armee (`armeeUnterschiedlich`
         *     aus, die Vorgabe): Es wird einmal für alle gewürfelt, also
         *     darf man auch VOR der Team-Wahl neu würfeln.
         *   - Jede Seite würfelt für sich (`armeeUnterschiedlich` an): erst
         *     NACH dem Beitritt — vorher wüsste der Knopf nicht, wessen
         *     Armee er neu würfelt.
         *
         * DIE BEENDETE PARTIE IST NICHT GEMEINT: Dort heisst derselbe Knopf
         * zwar auch „Neu aufstellen" (der Zweig weiter oben), tut aber etwas
         * anderes — er startet die Revanche. Der bleibt, wie er war.
         */
        const armeeGewuerfelt = SCHACH_RUNDE.armeeAn(partie);
        const jedeSeiteFuerSich =
            SCHACH_RUNDE.normalisieren(partie).regeln.armeeUnterschiedlich === true;
        const darfNeuWuerfeln = armeeGewuerfelt
            && (jedeSeiteFuerSich ? !!meinTeam : true);

        if (!partie.ergebnis && darfNeuWuerfeln) {
            leiste.appendChild(TEAM_SCHACH._knopf("Neu aufstellen", "knopf-still knopf-klein",
                () => TEAM_SCHACH.neuAufstellen(partie)));
        }

        /* Der Weg aus der Runde heraus — bis v0.25.0 stand er als „Team
           verlassen" an der eigenen Team-Karte. Zwei Schritte, weil er die
           Runde für Alleinspielende zugleich schliesst. */
        if (meinTeam && !partie.ergebnis) {
            leiste.appendChild(DIALOG.zweiSchritt(
                TEAM_SCHACH._knopf("Runde verlassen", "knopf-still knopf-klein", null),
                () => TEAM_SCHACH.teamVerlassen(partie)));
        }

        /*
         * „ZUR ÜBERSICHT" GIBT ES NUR NOCH OHNE EIGENES TEAM (seit v0.44.0).
         *
         * Nutzer-Entscheidung 24.08.2026 zu Punkt 7: „Zur Übersicht kann
         * raus." Wer in einem Team sitzt, hat mit „Runde verlassen" den
         * ehrlicheren Weg — er sagt, was er tut.
         *
         * WARUM ER FÜR ZUSCHAUER STEHEN BLEIBT, obwohl die Ansage ihn
         * ausnahmslos strich: Eine offene Partie ist ein Fenster OHNE
         * Tab-Leiste (v0.113). Wer sie über einen Beitritts-Code betreten,
         * aber noch keine Seite gewählt hat, hat kein Team — also auch kein
         * „Runde verlassen". Ohne diesen Knopf wäre er eingesperrt, und
         * zwar in einer Runde, die er nicht einmal spielt. Fällt die
         * Tab-Leiste dort je wieder an, kann der Knopf ersatzlos weg.
         */
        if (!meinTeam && !partie.ergebnis) {
            leiste.appendChild(TEAM_SCHACH._knopf("Zur Übersicht", "knopf-still knopf-klein",
                () => TEAM_SCHACH.uebersichtOeffnen()));
        }

        /* Die beendete Partie behält ihren Ausgang: Von dort führt sonst
           nichts zurück, und „Runde verlassen" gibt es dort nicht. */
        if (partie.ergebnis) {
            leiste.appendChild(TEAM_SCHACH._knopf("Zur Übersicht", "knopf-still knopf-klein",
                () => TEAM_SCHACH.uebersichtOeffnen()));
        }

        return leiste;
    },

    /* ---------------------------------------------------------------- *
     * Bedienung
     * ---------------------------------------------------------------- */

    partieOeffnen(id) {
        TEAM_SCHACH.offeneId = id;

        /*
         * Die Spielart-Auswahl wird mit geschlossen (seit v0.44).
         *
         * SO SAH DER FEHLER AUS: Wer eine Partie anlegte, gab den Namen ein,
         * bestätigte — und stand wieder vor den Spielart-Kacheln. Die Partie
         * war längst angelegt und geöffnet, aber `zeichnen` fragt die Auswahl
         * VOR der offenen Partie ab, und die stand noch auf offen. Man musste
         * erst „Zurück" drücken und die eigene Partie in der Übersicht suchen.
         */
        TEAM_SCHACH.auswahlOffen = false;
        TEAM_SCHACH._auswahlAufheben();

        /* Beim Öffnen wird nicht animiert: Der letzte Zug liegt womöglich
           Stunden zurück. */
        const partie = SCHACH_TAFEL.partie(TEAM_SCHACH.abgleich.daten, id);
        if (partie) {
            TEAM_SCHACH.animiertBis[id] = partie.zugZaehler;
            TEAM_SCHACH.wirkungBis[id] = partie.zugZaehler;
        }

        TEAM_SCHACH.zeichnen(TEAM_SCHACH.abgleich.daten);
    },

    /*
     * Die Runde, die DIESES Gerät gerade angelegt hat und der noch niemand
     * beigetreten ist (seit v0.29.0). Nur hier im Bildschirm, nie im
     * gemeinsamen Stand — siehe `uebersichtOeffnen`.
     */
    selbstAngelegt: "",

    /*
     * `async`, obwohl der Knopf nicht darauf wartet: Nur so lässt sich das
     * Wegräumen unten überhaupt PRÜFEN — ein Test muss abwarten können, bis
     * geschrieben wurde. Für die Knöpfe ändert sich nichts.
     */
    async uebersichtOeffnen() {
        /*
         * EINE SELBST ANGELEGTE, NIE BETRETENE RUNDE WIRD BEIM VERLASSEN
         * GESCHLOSSEN (seit v0.29.0).
         *
         * Diese Lücke ist mit der Seitenwahl entstanden: Seit v0.29.0 trägt
         * `rundeStarten` bei Computer-Runden niemanden mehr ein. Wer dann
         * „Spielen" drückt und ohne Seitenwahl zurückgeht, liesse eine
         * menschenleere Runde im gemeinsamen Stand stehen — für niemanden
         * auffindbar, aber für immer da. Genau dasselbe Problem hat v0.26.0
         * für verlassene Runden gelöst; hier fehlte der Auslöser, weil man
         * ohne Team gar nichts zu verlassen hat.
         *
         * DREI BEDINGUNGEN, und alle drei sind nötig:
         *   - Es ist die Runde, die DIESES Gerät eben angelegt hat. Sonst
         *     löschte ein Besucher die frische Runde eines anderen, der
         *     seine Seite noch sucht.
         *   - Es sitzt kein Mensch darin (der Computer zählt nicht).
         *   - Sie hat nie begonnen und hat kein Ergebnis.
         */
        const offene = TEAM_SCHACH.offeneId
            ? SCHACH_TAFEL.partie(TEAM_SCHACH.abgleich.daten, TEAM_SCHACH.offeneId)
            : null;

        const wegwerfen = !!offene
            && offene.id === TEAM_SCHACH.selbstAngelegt
            && !offene.laeuft
            && !offene.ergebnis
            && SCHACH_BOT.nurNochBot(offene);

        TEAM_SCHACH.offeneId = "";
        TEAM_SCHACH.selbstAngelegt = "";
        TEAM_SCHACH._auswahlAufheben();
        TEAM_SCHACH._botAbbrechen();

        if (wegwerfen) {
            await TEAM_SCHACH._verwaisteRundeSchliessen(offene);
            TEAM_SCHACH._zumStart();
            return;
        }

        TEAM_SCHACH.zeichnen(TEAM_SCHACH.abgleich.daten);
        TEAM_SCHACH._zumStart();
    },

    /*
     * RAUS AUS EINER RUNDE HEISST: AUF DEN STARTBILDSCHIRM (seit v0.36.0).
     *
     * Nutzer-Ansage 24.08.2026: „Zurück zur Übersicht nach einer Runde soll
     * nicht zu Runde beitreten führen sondern zum Start Screen."
     *
     * WARUM ES VORHER ANDERS WAR: Bis v0.13.0 war der Zwischenbildschirm die
     * Schaltzentrale — dort lagen Erstellen, Beitreten und die eigenen
     * Partien. Seit Wunsch 1 legt der Start die Runde an, seit v0.35.0 ist
     * der Zwischenbildschirm nur noch das Code-Feld. Wer aus einer Runde
     * kommt, stand also vor einem leeren Formular für fremde Runden.
     *
     * Der Name `uebersichtOeffnen` bleibt: An ihm hängen Kommentare, Tests
     * und die Fussleiste. Was er tut, steht hier.
     */
    _zumStart() {
        if (typeof TABS !== "undefined") {
            TABS.wechseln("start");
        }
    },

    /*
     * Beitritt über den Beitritts-Code (seit v0.10.0, Bündel A Schritt 5).
     * Der Code führt ZUR Partie — das Team wählt man dort wie gehabt
     * („Mitspielen"), und dort greift auch die F11-Sperre. Laufende
     * Partien lassen Nachzügler herein (F19), beendete nicht.
     */
    async codeBeitreten(code) {
        const person = TEAM_SCHACH._ich();
        if (!person) {
            return;
        }

        const partie = SCHACH_TAFEL.partieZuCode(
            TEAM_SCHACH.abgleich.daten, code);

        if (!partie) {
            await DIALOG.hinweis(
                "Kein Treffer",
                "Zu diesem Code läuft keine offene Runde. Vertippt? Der "
                    + "Code hat " + SCHACH_RUNDE.CODE_LAENGE + " Zeichen — "
                    + "0, O, 1, I und L kommen darin nie vor."
            );
            return;
        }

        TEAM_SCHACH.partieOeffnen(partie.id);
    },

    feldAngetippt(partie, person, feld) {
        if (!SCHACH_RUNDE.darfZiehen(partie, person.id)) {
            return;
        }

        /* Wartet eine Fähigkeit auf ihr Ziel, gilt jeder Tipp ihr. */
        if (TEAM_SCHACH.zielFaehigkeit) {
            if (TEAM_SCHACH.zielFelder.indexOf(feld) === -1) {
                /*
                 * Ein Tipp daneben BRICHT AB, statt stumm nichts zu tun.
                 *
                 * Bis v3.5 passierte hier gar nichts: Das Brett nahm keine
                 * Tipps mehr an, und der einzige Ausweg war ein
                 * Abbrechen-Knopf unter dem Brett, den man auf dem Handy erst
                 * einmal finden muss. Von aussen sah das aus, als hinge die
                 * Seite. Die Fähigkeit bleibt dabei erhalten.
                 */
                TEAM_SCHACH._auswahlAufheben();
                TEAM_SCHACH.zeichnen(TEAM_SCHACH.abgleich.daten);
                return;
            }

            /*
             * DER TIPP SETZT DEN KASTEN, ER SETZT NICHT EIN (seit v0.57).
             *
             * Ausgeführt wird erst über „Einsetzen" unter dem Brett. Ein
             * zweiter Tipp auf ein anderes gültiges Feld verschiebt den
             * Kasten; ein Tipp auf DASSELBE Feld gilt als Bestätigung, damit
             * der gewohnte Doppeltipp weiter durchgeht.
             */
            if (TEAM_SCHACH.zielVorschau === feld) {
                TEAM_SCHACH.faehigkeitAusfuehren(partie, TEAM_SCHACH.zielFaehigkeit,
                    feld, undefined, TEAM_SCHACH._zusatzWahl());
                return;
            }

            TEAM_SCHACH.zielVorschau = feld;
            TEAM_SCHACH.zielUmriss = SCHACH_RUNDE.zielUmriss(
                partie, person.id, TEAM_SCHACH.zielFaehigkeit, feld,
                TEAM_SCHACH._zusatzWahl());

            TEAM_SCHACH.zeichnen(TEAM_SCHACH.abgleich.daten);
            return;
        }

        /* Zweiter Tipp auf ein mögliches Ziel: ziehen. */
        if (TEAM_SCHACH.gewaehltesFeld !== -1
            && TEAM_SCHACH.moeglicheZiele.indexOf(feld) !== -1) {
            TEAM_SCHACH.zugAusfuehren(partie, TEAM_SCHACH.gewaehltesFeld, feld);
            return;
        }

        const figur = SCHACH.figurAuf(partie.stand, feld);

        /* Eigene Figur antippen: auswählen (oder Auswahl aufheben). */
        if (SCHACH.farbeVon(figur) === partie.stand.amZug) {
            if (TEAM_SCHACH.gewaehltesFeld === feld) {
                TEAM_SCHACH._auswahlAufheben();
            } else {
                TEAM_SCHACH._auswaehlen(partie, feld);
            }
        } else {
            TEAM_SCHACH._auswahlAufheben();
        }

        TEAM_SCHACH.zeichnen(TEAM_SCHACH.abgleich.daten);
    },


    /*
     * Merkt sich die angetippte Figur samt ihren Zielen.
     *
     * DIE ROCHADE BRAUCHT HIER NICHTS EIGENES MEHR (seit v0.44): Der
     * Rochadezug steht als ganz normaler Königszug in `SCHACH.zuege` und
     * bekommt damit denselben Zugpunkt wie jedes andere Ziel. Bis v0.43 war
     * zusätzlich das Turmfeld anklickbar (`rochadeZiele`) — zwei Wege zu
     * derselben Sache, und der zweite sah anders aus als alles Übrige.
     */
    _auswaehlen(partie, feld) {
        const zuege = SCHACH.zuege(partie.stand, feld);

        TEAM_SCHACH.auswahlZaehler = partie.zugZaehler;
        TEAM_SCHACH.gewaehltesFeld = feld;
        TEAM_SCHACH.moeglicheZiele = zuege
            .map((zug) => zug.nach)
            .filter((ziel, stelle, alle) => alle.indexOf(ziel) === stelle);
    },

    /*
     * DIE EINGESTELLTEN REGLER IN DIE GERÄTE-ERINNERUNG (seit v0.33.0).
     *
     * DER FEHLER, DEN DAS BEHEBT: Bis v0.32.0 schrieb nur der
     * „Zurück"-Knopf und die Spielart-Kachel. Wer den Auswahl-Bildschirm
     * anders verliess — über die Leiste, über das Zahnrad, über
     * `partieOeffnen` —, verlor jede Reglerstellung: Beim nächsten Öffnen
     * holt `_auswahlOeffnen` die Werte aus dem Gerätespeicher und
     * überschreibt damit die ungesicherten. Gemeldet als „die Einstellungen
     * sollen bleiben, bis man sie ändert".
     *
     * GERUFEN WIRD SIE AN ZWEI ARTEN VON STELLEN, und beide braucht es:
     *   - beim ZEICHNEN der Auswahl (`_auswahlZeichnen`) — jede Änderung
     *     eines Reglers zeichnet neu, also führt jede Änderung hier vorbei,
     *     auch die von Reglern, die es noch gar nicht gibt;
     *   - an den beiden Ausgängen, die eine Änderung OHNE Neuzeichnen
     *     hinterlassen können.
     *
     * `neueRegeln` ist ausserhalb des Auswahl-Bildschirms nichts wert
     * (gesetzt wird es nur in `_auswahlOeffnen`) — hier kann also nichts
     * Falsches gemerkt werden.
     */
    reglerMerken() {
        if (typeof START !== "undefined") {
            START.regelnMerken(TEAM_SCHACH.neueRegeln);
        }
    },

    _auswahlAufheben() {
        TEAM_SCHACH.gewaehltesFeld = -1;
        TEAM_SCHACH.moeglicheZiele = [];
        TEAM_SCHACH.zielFaehigkeit = "";
        TEAM_SCHACH.zielFelder = [];
        TEAM_SCHACH.zielVorschau = -1;
        TEAM_SCHACH.zielUmriss = [];
        TEAM_SCHACH.mauerRichtung = "waagerecht";
        TEAM_SCHACH.tauschRichtung = "vor";
        TEAM_SCHACH.auswahlZaehler = -1;
    },

    /*
     * „Einsetzen" unter dem Brett: Die Fähigkeit wirkt auf das Feld, auf dem
     * der Vorschau-Kasten gerade liegt (seit v0.57).
     */
    zielBestaetigen(partie) {
        if (!TEAM_SCHACH.zielFaehigkeit || TEAM_SCHACH.zielVorschau < 0) {
            return;
        }

        TEAM_SCHACH.faehigkeitAusfuehren(partie, TEAM_SCHACH.zielFaehigkeit,
            TEAM_SCHACH.zielVorschau, undefined, TEAM_SCHACH._zusatzWahl());
    },

    /*
     * DIE ZUSATZWAHL DER GERADE PLATZIERTEN FÄHIGKEIT (seit v0.101).
     *
     * Zwei Fähigkeiten brauchen neben dem Zielfeld noch eine zweite Angabe,
     * und beide reisen als `wahl` durch dieselbe Kette bis in `_zielWirkung`:
     * die LAGE der Mauer (seit v0.80) und die RICHTUNG des Platztauschs (seit
     * v0.101). Damit der Weg dorthin nur einmal existiert, fragen alle Stellen
     * diese eine Funktion — vorher stand an vier Stellen `mauerRichtung`, und
     * die zweite Fähigkeit hätte jede davon anfassen müssen.
     *
     * `art` ist WAHLFREI: Ohne Angabe gilt die Fähigkeit, die gerade platziert
     * wird (`zielFaehigkeit`). Das genügt an drei der vier Stellen — nur beim
     * ERSTEN Prüfen in `faehigkeitEinsetzen` steht sie noch nicht fest, und
     * dort wird sie ausdrücklich mitgegeben.
     */
    _zusatzWahl(art) {
        const gemeint = art || TEAM_SCHACH.zielFaehigkeit;

        if (gemeint === "platztausch") {
            return TEAM_SCHACH.tauschRichtung;
        }
        if (gemeint === "nudelholz") {
            return TEAM_SCHACH.nudelholzKante;
        }
        return TEAM_SCHACH.mauerRichtung;
    },

    /*
     * DIE RICHTUNG DES PLATZTAUSCHS WEITERSCHALTEN (seit v0.101).
     *
     * Ein Knopf statt vier: Er zählt durch `SCHACH.TAUSCH_RICHTUNGEN` — genau
     * das Muster des Dreh-Knopfs der Mauer, nur mit vier Stationen. Vier
     * Knöpfe nebeneinander wären am Handy die grössere Fläche für dieselbe
     * Auskunft, und die Zielfelder zeigen ohnehin sofort, was gerade geht.
     */
    schaltenTausch(partie) {
        const person = TEAM_SCHACH._ich();
        if (!person || TEAM_SCHACH.zielFaehigkeit !== "platztausch") {
            return;
        }

        const alle = SCHACH.TAUSCH_RICHTUNGEN;
        const jetzt = alle.indexOf(TEAM_SCHACH.tauschRichtung);

        TEAM_SCHACH.tauschRichtung = alle[(jetzt + 1) % alle.length];

        /* Wie beim Drehen der Mauer: Der bisherige Vorschau-Platz passt meist
           nicht mehr, und die Liste der möglichen Felder wird neu gerechnet. */
        TEAM_SCHACH.zielVorschau = -1;
        TEAM_SCHACH.zielUmriss = [];
        TEAM_SCHACH.zielFelder = SCHACH_RUNDE.zielFelder(
            partie, person.id, "platztausch", TEAM_SCHACH.tauschRichtung);

        TEAM_SCHACH.zeichnen(TEAM_SCHACH.abgleich.daten);
    },

    /* Wie die Richtung im Knopf heisst. */
    tauschRichtungText(richtungId) {
        if (richtungId === "zurueck") {
            return "zurück";
        }
        if (richtungId === "links") {
            return "nach links";
        }
        if (richtungId === "rechts") {
            return "nach rechts";
        }
        return "nach vorn";
    },

    /*
     * DIE MAUER DREHEN (seit v0.80, Nutzer-Wunsch 18.08.).
     *
     * Nach dem Drehen ist der bisherige Vorschau-Platz meistens ungültig — an
     * einer Stelle, wo drei Felder nebeneinander frei sind, müssen nicht auch
     * drei übereinander frei sein. Deshalb wird die Vorschau geleert und die
     * Liste der möglichen Felder neu gerechnet: Man sieht sofort, wohin die
     * gedrehte Mauer überhaupt noch passt.
     */
    drehenMauer(partie) {
        const person = TEAM_SCHACH._ich();
        if (!person || TEAM_SCHACH.zielFaehigkeit !== "mauer") {
            return;
        }

        TEAM_SCHACH.mauerRichtung =
            (TEAM_SCHACH.mauerRichtung === "senkrecht") ? "waagerecht" : "senkrecht";

        TEAM_SCHACH.zielVorschau = -1;
        TEAM_SCHACH.zielUmriss = [];
        TEAM_SCHACH.zielFelder = SCHACH_RUNDE.zielFelder(
            partie, person.id, "mauer", TEAM_SCHACH.mauerRichtung);

        TEAM_SCHACH.zeichnen(TEAM_SCHACH.abgleich.daten);
    },

    /*
     * DEN NUDELHOLZ-RAND WEITERSCHALTEN (seit v0.117, Nutzer-Entscheidung
     * 22.08.): EIN Knopf zählt reihum durch die vier Ränder — dasselbe
     * Muster wie der Dreh-Knopf der Mauer und des Platztauschs. Die
     * markierten Randfelder zeigen sofort, wo das Holz ansetzen würde.
     */
    NUDELHOLZ_REIHE: ["unten", "links", "oben", "rechts"],

    NUDELHOLZ_KANTEN_TEXT: {
        unten: "von unten",
        oben: "von oben",
        links: "von links",
        rechts: "von rechts"
    },

    drehenNudelholz(partie) {
        const person = TEAM_SCHACH._ich();
        if (!person || TEAM_SCHACH.zielFaehigkeit !== "nudelholz") {
            return;
        }

        const reihe = TEAM_SCHACH.NUDELHOLZ_REIHE;
        const stelle = reihe.indexOf(TEAM_SCHACH.nudelholzKante);
        TEAM_SCHACH.nudelholzKante = reihe[(stelle + 1) % reihe.length];

        TEAM_SCHACH.zielVorschau = -1;
        TEAM_SCHACH.zielUmriss = [];
        TEAM_SCHACH.zielFelder = SCHACH_RUNDE.zielFelder(
            partie, person.id, "nudelholz", TEAM_SCHACH.nudelholzKante);

        TEAM_SCHACH.zeichnen(TEAM_SCHACH.abgleich.daten);
    },

    /* „Abbrechen": Die Fähigkeit bleibt im Vorrat. */
    zielVerwerfen() {
        TEAM_SCHACH._auswahlAufheben();
        TEAM_SCHACH.zeichnen(TEAM_SCHACH.abgleich.daten);
    },

    /*
     * „Abbrechen" bei Sprung und Teleport (seit v0.76).
     *
     * Anders als bei `zielVerwerfen` reicht es hier NICHT, den Bildschirm
     * aufzuräumen: Die Fähigkeit ist längst eingesetzt und steht als Muster im
     * gemeinsamen Stand. Zurückgenommen wird sie deshalb im Modell und über
     * denselben Weg geschrieben wie ein Zug — mitsamt der Zugzähler-Prüfung,
     * damit zwei aus einem Team sich nicht in die Quere kommen.
     */
    async zugmusterVerwerfen(partie) {
        const person = TEAM_SCHACH._ich();
        if (!person) {
            return;
        }

        const neu = SCHACH_RUNDE.zugmusterZuruecknehmen(partie, person.id);
        if (!neu) {
            return;
        }

        TEAM_SCHACH._auswahlAufheben();
        await TEAM_SCHACH._sendenMitPruefung(neu, partie.zugZaehler);
    },

    /*
     * Wirft eine Auswahl weg, die nicht mehr zur Stellung passt (seit v4.0).
     *
     * SO SAH DER FEHLER AUS: Man tippt eine Figur an, die Zielpunkte und die
     * roten Schlagringe erscheinen — und dann zieht jemand. Der Bildschirm
     * zeichnete das neue Brett, liess die alten Markierungen aber stehen: Sie
     * leben in diesem Objekt, nicht im Spielstand. Übrig blieb ein Brett voller
     * Punkte und Ringe, die zu Figuren gehörten, die dort längst nicht mehr
     * standen — und das, obwohl darunter „Warte, bis dein Team wieder am Zug
     * ist" stand.
     *
     * Zwei Bedingungen, und beide sind nötig:
     *
     *   - Der Zugzähler hat sich geändert: Die Auswahl bezog sich auf eine
     *     andere Stellung. Das trifft auch den eigenen Zug innerhalb des Teams.
     *   - Man darf gar nicht (mehr) ziehen: Dann ist jede Markierung eine
     *     Einladung, ins Leere zu tippen.
     */
    _auswahlPruefen(partie, person) {
        const nichtsGewaehlt = (TEAM_SCHACH.gewaehltesFeld === -1
            && TEAM_SCHACH.zielFaehigkeit === ""
            && TEAM_SCHACH.moeglicheZiele.length === 0);

        if (nichtsGewaehlt) {
            return;
        }

        if (TEAM_SCHACH.auswahlZaehler !== partie.zugZaehler
            || !SCHACH_RUNDE.darfZiehen(partie, person.id)) {
            TEAM_SCHACH._auswahlAufheben();
        }
    },

    /*
     * Führt den Zug aus und schreibt ihn sofort.
     *
     * Vor dem Schreiben wird der Stand vom Server geholt und der Zugzähler
     * verglichen: Hat in der Zwischenzeit jemand aus dem eigenen Team gezogen,
     * gilt dessen Zug — wer zuerst drückt, hat gezogen. Der eigene Zug wird
     * dann verworfen, statt den fremden zu überschreiben.
     */
    async zugAusfuehren(partie, von, nach) {
        if (TEAM_SCHACH.ziehtGerade) {
            return;
        }
        TEAM_SCHACH.ziehtGerade = true;

        try {
            const person = TEAM_SCHACH._ich();
            const stand = partie.stand;

            /* Umwandlung: nur bei einem Bauern auf die letzte Reihe fragen. */
            let umwandlung = "D";
            const figur = SCHACH.figurAuf(stand, von);
            const breite = SCHACH.breiteVon(stand);
            const letzteReihe = (stand.amZug === "weiss") ? 0 : SCHACH.hoeheVon(stand) - 1;

            if (SCHACH.artVon(figur) === "B" && SCHACH.reiheVon(nach, breite) === letzteReihe) {
                const wahl = await DIALOG.liste(
                    "Bauer wandelt um",
                    "In welche Figur soll der Bauer umgewandelt werden?",
                    [
                        { beschriftung: "Dame", hinweis: "die übliche Wahl", wert: "D" },
                        { beschriftung: "Turm", hinweis: "", wert: "T" },
                        { beschriftung: "Läufer", hinweis: "", wert: "L" },
                        { beschriftung: "Springer", hinweis: "manchmal stärker", wert: "S" }
                    ],
                    "Abbrechen"
                );
                if (!wahl) {
                    TEAM_SCHACH._auswahlAufheben();
                    TEAM_SCHACH.zeichnen(TEAM_SCHACH.abgleich.daten);
                    return;
                }
                umwandlung = wahl;
            }

            /* Braucht die Partie Einigkeit, wird der Zug erst vorgeschlagen.
               Ist man allein im Team, zieht `zugVorschlagen` sofort. */
            const neu = SCHACH_RUNDE.brauchtEinigkeit(partie)
                ? SCHACH_RUNDE.zugVorschlagen(
                    partie, person.id, von, nach, umwandlung, person.name)
                : SCHACH_RUNDE.ziehen(
                    partie, person.id, von, nach, umwandlung, person.name);

            if (!neu) {
                TEAM_SCHACH._auswahlAufheben();
                TEAM_SCHACH.zeichnen(TEAM_SCHACH.abgleich.daten);
                return;
            }

            TEAM_SCHACH._auswahlAufheben();
            await TEAM_SCHACH._sendenMitPruefung(neu, partie.zugZaehler);
        } finally {
            TEAM_SCHACH.ziehtGerade = false;

            /* Noch einmal zeichnen, damit die Marke „Wird gesendet" wieder
               verschwindet — sie hängt an genau diesem Schalter. */
            if (TEAM_SCHACH.abgleich) {
                TEAM_SCHACH.zeichnen(TEAM_SCHACH.abgleich.daten);
            }
        }
    },

    /* ---------------------------------------------------------------- *
     * Der Computer-Gegner (seit v0.27.0, Stufe 1)
     *
     * Die Zugwahl steht im Modell (`js\schach-bot.js`); hier steht nur,
     * WANN sie angestossen wird und WER sie anstösst.
     *
     * WER RECHNET? Das Gerät eines MITSPIELERS, der die Partie gerade
     * offen hat. Die Partie liegt gemeinsam in Firebase — zwei Geräte, die
     * gleichzeitig für den Bot ziehen, wären ein Doppelzug. Beim Spiel
     * allein gegen den Computer gibt es ohnehin nur ein Gerät; kommt über
     * den Beitritts-Code doch ein zweiter Mensch dazu, fängt die
     * Zugzähler-Prüfung in `_sendenMitPruefung` den zweiten Zug ab, genau
     * wie bei zwei Menschen aus einem Team.
     * ---------------------------------------------------------------- */

    /*
     * Gerufen am Ende jedes Zeichnens einer offenen Partie. Prüft, ob der
     * Computer dran ist, und lässt ihn nach kurzer Bedenkzeit ziehen.
     *
     * Alle Bedingungen werden hier NUR abgefragt, nicht gerechnet: Ob der
     * Bot ziehen darf, weiss das Modell (`SCHACH_BOT.istAmZug`).
     */
    _botAnstossen(partie, person) {
        if (TEAM_SCHACH.botWartet || TEAM_SCHACH.ziehtGerade) {
            return;
        }
        if (!SCHACH_BOT.istBotPartie(partie) || !SCHACH_BOT.istAmZug(partie)) {
            return;
        }

        /* Nur wer selbst mitspielt, zieht für den Computer — ein Zuschauer
           mischt sich nicht in eine fremde Partie ein. */
        if (!person || !SCHACH_RUNDE.teamVon(partie, person.id)) {
            return;
        }

        /*
         * Eine Abstimmung passt nicht zum Computer: Er würde einen Vorschlag
         * einbringen, über den niemand abstimmt. Bot-Runden werden deshalb
         * ohne Einigkeit angelegt (`rundeStarten`) — kommt trotzdem eine
         * daher (alte Runde, zweiter Mensch im Bot-Team), zieht er lieber
         * gar nicht, als die Abstimmung zu umgehen.
         */
        if (SCHACH_RUNDE.brauchtEinigkeit(partie)) {
            return;
        }

        const id = partie.id;

        /* Erst anmelden, dann den Zeitgeber setzen — siehe `botWartet`. */
        TEAM_SCHACH.botWartet = true;

        TEAM_SCHACH.botZeitgeber = window.setTimeout(() => {
            TEAM_SCHACH.botWartet = false;
            TEAM_SCHACH.botZeitgeber = null;

            /*
             * Der Stand wird NEU geholt, nicht mitgeschleppt: In der
             * Bedenkzeit kann alles passiert sein — ein Zug des Gegners,
             * eine Fähigkeit im Gegenzug, das Ende der Partie.
             */
            const jetzt = SCHACH_TAFEL.partie(TEAM_SCHACH.abgleich.daten, id);
            if (!jetzt) {
                return;
            }
            TEAM_SCHACH.botZiehen(jetzt);
        }, SCHACH_BOT.BEDENKZEIT_MS);
    },

    /*
     * Den Zug des Computers rechnen und senden — über denselben Weg wie
     * jeden Menschenzug, samt Zugzähler-Prüfung.
     */
    async botZiehen(partie) {
        if (TEAM_SCHACH.ziehtGerade) {
            return;
        }

        const neu = SCHACH_BOT.ziehen(partie);
        if (!neu) {
            return;
        }

        TEAM_SCHACH.ziehtGerade = true;

        try {
            await TEAM_SCHACH._sendenMitPruefung(neu, partie.zugZaehler);
        } finally {
            TEAM_SCHACH.ziehtGerade = false;
        }
    },

    /*
     * Einen wartenden Bot-Zug fallen lassen — beim Verlassen der Partie
     * und beim Schliessen der Runde. Ohne das feuerte der Zeitgeber noch
     * in eine Partie hinein, die dieses Gerät gar nicht mehr zeigt.
     */
    _botAbbrechen() {
        TEAM_SCHACH.botWartet = false;

        if (TEAM_SCHACH.botZeitgeber !== null) {
            window.clearTimeout(TEAM_SCHACH.botZeitgeber);
            TEAM_SCHACH.botZeitgeber = null;
        }
    },

    /*
     * Schreibt EINE Partie in die Tafel, aber nur wenn ihr Zugzähler auf dem
     * Server noch der erwartete ist. So gewinnt bei zwei gleichzeitigen Zügen
     * der erste.
     *
     * Geschrieben wird immer der Stand vom Server mit der eigenen Partie
     * darin — nie die eigene Tafel als Ganzes. Sonst verschwänden Partien, die
     * inzwischen woanders angelegt wurden (dieselbe Lehre wie beim
     * Würfel-Quizz, siehe docs\DECISIONS.md).
     */
    /*
     * DIE STILLE ZEITMESSUNG (seit v0.93, Wunsch W10).
     *
     * Sie hat EINEN Zweck: die geschätzte Rundendauer unter den
     * Spielart-Kacheln. Der Nutzer sieht nur diese Schätzung — die Messung
     * selbst taucht nirgends auf.
     *
     * WARUM SIE NICHTS KOSTET: Gezählt wird lokal, solange eine Partie offen
     * und die Seite im Vordergrund ist. Geschrieben wird NIE für sich, sondern
     * nur als Beifahrer im nächsten Zug (`_sendenMitPruefung`). Damit gibt es
     * keinen zusätzlichen Netzaufruf, keinen neuen Schreibweg und keine neue
     * Firebase-Regel — und die eiserne Regel „jeder Schreibvorgang meldet sich
     * mit `eigenerVorgangBeginnt` an" bleibt unberührt, weil kein neuer
     * hinzukommt.
     *
     * WARUM IM VORDERGRUND: Ein Handy, das in der Tasche steckt, spielt nicht.
     * Die Abfrage ruht dort ohnehin schon (`abgleich`), die Messung folgt
     * derselben Linie.
     */
    _zeitMessungStarten(partieId) {
        if (TEAM_SCHACH._zeitPartie === partieId) {
            return;
        }

        TEAM_SCHACH._zeitPartie = partieId;
        TEAM_SCHACH._zeitSeit = TEAM_SCHACH._jetzt();
        TEAM_SCHACH._zeitOffen = TEAM_SCHACH._zeitOffen || 0;
    },

    _zeitMessungStoppen() {
        TEAM_SCHACH._zeitOffen = TEAM_SCHACH._offeneSekunden();
        TEAM_SCHACH._zeitSeit = 0;
        TEAM_SCHACH._zeitPartie = "";
    },

    /* Wie viele ganze Sekunden sind seit dem letzten Abholen zusammengekommen? */
    _offeneSekunden() {
        const offen = TEAM_SCHACH._zeitOffen || 0;

        if (!TEAM_SCHACH._zeitSeit) {
            return offen;
        }
        /* Im Hintergrund zählt nichts. */
        if (typeof document !== "undefined" && document.hidden) {
            return offen;
        }

        return offen + Math.max(0,
            Math.floor((TEAM_SCHACH._jetzt() - TEAM_SCHACH._zeitSeit) / 1000));
    },

    _jetzt() {
        return (typeof Date === "function" && Date.now) ? Date.now() : 0;
    },

    async _sendenMitPruefung(neuePartie, erwarteterZaehler) {
        const abgleich = TEAM_SCHACH.abgleich;

        /*
         * Die stillen Sekunden fahren im Zug mit (v0.93) — nur, wenn sie zu
         * DIESER Partie gehören. Danach ist der Zähler leer; was zwischen
         * zwei Zügen zusammenkommt, wird beim nächsten mitgenommen.
         */
        if (TEAM_SCHACH._zeitPartie === neuePartie.id) {
            const sekunden = TEAM_SCHACH._offeneSekunden();

            if (sekunden > 0) {
                neuePartie = SCHACH_RUNDE.spielzeitErgaenzen(neuePartie, sekunden);
                TEAM_SCHACH._zeitOffen = 0;
                TEAM_SCHACH._zeitSeit = TEAM_SCHACH._jetzt();
            }
        }

        /*
         * ERST ANZEIGEN, DANN SENDEN (seit v3.8).
         *
         * Bis v3.7 wurde der Zug erst gezeichnet, wenn die Datenbank ihn
         * bestätigt hatte. Über mobile Daten sind das schnell ein bis zwei
         * Sekunden, in denen sich nichts rührt — man tippt noch einmal, und die
         * Seite wirkt hängengeblieben. Jetzt steht der Zug sofort auf dem
         * Brett; das Schreiben läuft dahinter.
         *
         * DREI DINGE MACHEN DAS SICHER:
         *
         *   1. Der Zug ist bereits vollständig gerechnet (SCHACH_RUNDE.ziehen)
         *      — angezeigt wird kein Wunschbild, sondern das Ergebnis.
         *   2. Die Zugzähler-Prüfung bleibt, wo sie war. Wer aus dem eigenen
         *      Team schneller war, gewinnt weiterhin; der eigene Zug wird dann
         *      zurückgenommen. Die Hausregel ändert sich nicht.
         *   3. Solange gesendet wird, übernimmt der Abgleich keinen fremden
         *      Stand (`eigenerVorgangBeginnt`). Sonst käme die regelmässige
         *      Abfrage dazwischen und setzte das Brett auf den Stand von vor
         *      dem Zug zurück — genau das Zurückspringen, um das es geht.
         *
         * Geht das Schreiben schief, wird der Stand von vorher wiederhergestellt
         * und gesagt, was los ist. Auf einem Stand weiterzuspielen, den niemand
         * sonst kennt, wäre schlimmer als ein Rücksprung.
         */
        const vorher = abgleich.daten;
        const sofort = SCHACH_TAFEL.partieEinsetzen(abgleich.daten, neuePartie);

        abgleich.daten = sofort;
        TEAM_SCHACH.zeichnen(sofort);

        abgleich.eigenerVorgangBeginnt();

        try {
            let tafel = sofort;

            if (abgleich.speicher.art === "gemeinsam") {
                const fremd = SCHACH_TAFEL.normalisieren(await abgleich.speicher.laden());
                const fremdePartie = fremd.partien[neuePartie.id];

                if (fremdePartie && fremdePartie.zugZaehler !== erwarteterZaehler) {
                    abgleich.daten = fremd;
                    TEAM_SCHACH.zeichnen(fremd);
                    await DIALOG.hinweis(
                        "Jemand war schneller",
                        "Aus deinem Team hat gerade schon jemand gezogen. Dein Zug "
                            + "wurde deshalb nicht ausgeführt."
                    );
                    return false;
                }
                tafel = SCHACH_TAFEL.partieEinsetzen(fremd, neuePartie);
            }

            await abgleich.speicher.speichern(tafel);
            abgleich.daten = tafel;
            TEAM_SCHACH.zeichnen(tafel);
            return true;
        } catch (fehler) {
            abgleich.daten = vorher;
            TEAM_SCHACH.zeichnen(vorher);

            await DIALOG.hinweis("Nicht gespeichert",
                "Die Änderung konnte nicht gesendet werden: " + fehler.message
                    + "\n\nDein Zug wurde deshalb zurückgenommen — sonst würdest du "
                    + "auf einem Brett weiterspielen, das sonst niemand sieht.");
            return false;
        } finally {
            abgleich.eigenerVorgangEndet();
        }
    },

    /*
     * EINE FÄHIGKEIT IM GEGENZUG DARF NICHT AM ZUGZÄHLER SCHEITERN
     * (seit v0.66, Wunsch #28: „wenn ich Ausweichen einsetze, passiert nichts").
     *
     * DER FEHLER. `_sendenMitPruefung` verlangt, dass der Zugzähler auf dem
     * Server noch der erwartete ist. Diese Prüfung gibt es aus einem guten
     * Grund: Zwei Leute aus DEMSELBEN Team dürfen nicht gleichzeitig ziehen,
     * der erste gewinnt. Für eine Fähigkeit mit Blitz ist sie aber genau
     * falsch — die wird ja absichtlich eingesetzt, WÄHREND der Gegner zieht.
     * Zieht er in derselben Sekunde, ist der Zähler weitergelaufen, und das
     * Einsetzen wird als „jemand war schneller" abgewiesen. Von aussen sieht
     * das aus, als passiere gar nichts: Die Fähigkeit ist wieder im Vorrat,
     * das Brett unverändert.
     *
     * DIE LÖSUNG ist dieselbe wie beim Würfel-Quizz („jeder ist Herr über
     * seinen eigenen Eintrag"): NICHT prüfen und abweisen, sondern
     * ZUSAMMENFÜHREN. Der Stand wird frisch vom Server geholt, die Fähigkeit
     * auf DIESEN Stand angewandt und das Ergebnis geschrieben. Der gegnerische
     * Zug bleibt damit erhalten, und die Fähigkeit wirkt auf das Brett, wie es
     * wirklich steht.
     *
     * Wird das Einsetzen auf dem frischen Stand abgelehnt (die Regeln sagen
     * nein — etwa weil der Gegner inzwischen fertig gezogen hat und man selbst
     * am Zug ist), bleibt die Fähigkeit im Vorrat und es wird gesagt, warum.
     * Genau das verlangt Wunsch #29: Was nicht gewirkt hat, wird nicht
     * verbraucht.
     */
    async _faehigkeitImGegenzugSenden(partie, art, zielFeld, umwandlung) {
        const abgleich = TEAM_SCHACH.abgleich;
        const person = TEAM_SCHACH._ich();

        if (!person) {
            return;
        }

        abgleich.eigenerVorgangBeginnt();

        try {
            /* Im lokalen Betrieb gibt es kein Rennen — dort ist der eigene
               Stand der einzige. */
            const tafel = (abgleich.speicher.art === "gemeinsam")
                ? SCHACH_TAFEL.normalisieren(await abgleich.speicher.laden())
                : abgleich.daten;

            const frisch = SCHACH_TAFEL.partie(tafel, partie.id);

            if (!frisch) {
                await DIALOG.hinweis("Partie nicht gefunden",
                    "Die Partie gibt es nicht mehr.");
                return;
            }

            const neu = SCHACH_RUNDE.faehigkeitEinsetzen(
                frisch, person.id, art, zielFeld, person.name, undefined, umwandlung);

            if (!neu) {
                await DIALOG.hinweis("Zu spät",
                    SCHACH_VARIANTEN.faehigkeitTitel(art) + " liess sich gerade nicht "
                        + "mehr einsetzen — auf dem Brett hat sich inzwischen etwas "
                        + "geändert. Die Fähigkeit bleibt dir erhalten.");

                abgleich.daten = tafel;
                TEAM_SCHACH.zeichnen(tafel);
                return;
            }

            const geschrieben = SCHACH_TAFEL.partieEinsetzen(tafel, neu);

            if (abgleich.speicher.art === "gemeinsam") {
                await abgleich.speicher.speichern(geschrieben);
            }

            abgleich.daten = geschrieben;
            TEAM_SCHACH.zeichnen(geschrieben);

        } catch (fehler) {
            await DIALOG.hinweis("Nicht gespeichert",
                "Die Fähigkeit konnte nicht gesendet werden: " + fehler.message
                    + "\n\nSie bleibt dir erhalten.");
        } finally {
            abgleich.eigenerVorgangEndet();
        }
    },

    /* ---------------------------------------------------------------- *
     * Aktionen rund um die Partie
     * ---------------------------------------------------------------- */

    /* Die Vorgaben einer neuen Runde. EINE Quelle für beides: die Auswahl
       (unten) und die Geräte-Erinnerung des Startbildschirms
       (START.regeln) — sonst laufen sie auseinander. */
    _regelnVorgabe() {
        return {
            /*
             * Gegen den Computer (seit v0.27.0). Steht bewusst ganz oben:
             * Der Haken entscheidet nicht über eine Regel, sondern darüber,
             * GEGEN WEN gespielt wird — alles Weitere gilt danach genauso.
             *
             * Er wandert NICHT in `regeln` der Partie: Ob ein Computer
             * mitspielt, steht schon in den Teams (`SCHACH_BOT.istBotPartie`).
             * Zwei Quellen für dieselbe Aussage laufen auseinander, und der
             * Datenvertrag bleibt so unangetastet.
             */
            gegenComputer: false,

            /*
             * Wie stark der Computer spielt (seit v0.28.0). Anders als
             * `gegenComputer` reist diese Angabe MIT DER PARTIE
             * (`regeln.botStufe`): Es gibt keine zweite Quelle, aus der man
             * sie ableiten könnte, und das rechnende Gerät muss sie kennen.
             */
            botStufe: SCHACH_BOT.STUFE_VORGABE,

            faehigkeiten: false,
            seltenheitZeigen: false,
            pechZeigen: false,
            lootboxMenge: SCHACH_VARIANTEN.MENGE_VORGABE,
            zufallsArmee: false,
            armeeUnterschiedlich: false,
            armeeStaerke: "normal",
            itemVorrat: "alle",

            /* Die selbst angehakte Liste (seit v0.100) - nur bei
               `itemVorrat: "auswahl"` von Bedeutung. */
            itemAuswahl: [],

            /* Einigkeit ist die Vorgabe (seit v0.76) — siehe `neueRegeln`. */
            einigkeit: true
        };
    },

    /*
     * Der Pfeil neben „Spielen" führt zu den Grundeinstellungen (Wunsch 8,
     * v0.21.0). Bis v0.20.0 öffnete er den ganzen Auswahl-Bildschirm samt
     * Brettform und Kacheln; die wohnen jetzt hinter der Vorschau
     * (`brettformOeffnen`).
     *
     * SEIT WUNSCH 1 (24.08.2026) LEGT DIE AUSWAHL NICHTS MEHR AN: Sie zeigt,
     * was zuletzt eingestellt war, und schreibt jede Wahl in die
     * Geräte-Erinnerung des Starts zurück (`spielartGewaehlt`,
     * `auswahlSchliessen`). Angelegt wird erst mit „Spielen"
     * (`rundeStarten`).
     */
    partieAnlegen() {
        TEAM_SCHACH._auswahlOeffnen("regeln");
    },

    /* Der Weg über die Vorschau (Wunsch 7/8): Form und Grösse. */
    brettformOeffnen() {
        TEAM_SCHACH._auswahlOeffnen("brett");
    },

    /*
     * Beide Wege in die Auswahl. Sie unterscheiden sich nur darin, WELCHER
     * Teil gezeigt wird — geholt und gemerkt wird in beiden Fällen dasselbe
     * (seit Wunsch 8).
     */
    _auswahlOeffnen(teil) {
        if (!TEAM_SCHACH._ich()) {
            return;
        }
        TEAM_SCHACH.auswahlOffen = true;
        TEAM_SCHACH.auswahlTeil = (teil === "regeln") ? "regeln" : "brett";
        TEAM_SCHACH.offeneId = "";

        /* Die zuletzt gemerkten Einstellungen, sonst die Vorgaben. */
        TEAM_SCHACH.neueRegeln = (typeof START !== "undefined")
            ? START.regeln()
            : TEAM_SCHACH._regelnVorgabe();

        /* Die offene Brettform folgt der gemerkten Spielart — sonst läge
           die Kachel, auf der man zuletzt war, unter einem anderen Reiter. */
        if (typeof START !== "undefined") {
            TEAM_SCHACH.gewaehlteForm =
                SCHACH_VARIANTEN.formVon(START._spielart());
        }

        TEAM_SCHACH._auswahlAufheben();
        TEAM_SCHACH.zeichnen(TEAM_SCHACH.abgleich.daten);
    },

    /*
     * „Zurück" aus der Auswahl. Seit Wunsch 1 kommt man vom Startbildschirm
     * herein — also geht es auch dorthin zurück, und nicht mehr in den
     * Zwischenbildschirm.
     *
     * GEMERKT WIRD HIER UND BEIM ZEICHNEN (seit v0.33.0, `reglerMerken`):
     * beim Zeichnen, damit kein Weg hinaus etwas verliert — und hier, weil
     * ein Regler auch ohne Neuzeichnen geändert worden sein kann.
     */
    auswahlSchliessen() {
        TEAM_SCHACH.reglerMerken();
        TEAM_SCHACH.auswahlOffen = false;
        TEAM_SCHACH.zeichnen(TEAM_SCHACH.abgleich.daten);
        TABS.wechseln("start");
    },

    /*
     * F11 (Nutzer-Entscheidung 23.08.2026, Bündel A): Eine Person spielt
     * höchstens EINE laufende Partie. Geprüft am Vollzug — beim Anlegen und
     * beim Beitreten —, nicht schon beim Öffnen der Auswahl. Liefert true,
     * wenn gesperrt wurde.
     */
    async _zweitePartieVerhindern(person) {
        const eigene = SCHACH_TAFEL.eigeneLaufende(
            TEAM_SCHACH.abgleich.daten, person.id);
        if (eigene.length === 0) {
            return false;
        }

        await DIALOG.hinweis(
            "Du spielst schon",
            "Du steckst noch in der laufenden Partie \"" + eigene[0].titel
                + "\". Mehr als eine gleichzeitig gibt es nicht — spiel sie "
                + "zu Ende oder verlass sie, dann kannst du neu starten."
        );
        return true;
    },

    /*
     * Eine Kachel wurde angetippt. SIE LEGT NICHTS MEHR AN (Wunsch 1,
     * 24.08.2026): Die Wahl wird nur GEMERKT — Spielart und die
     * eingestellten Regler wandern in den Gerätespeicher —, und man landet
     * wieder auf dem Startbildschirm. Dort zeigt die Vorschau das gewählte
     * Brett, und erst „Spielen" legt die Runde an (`rundeStarten`).
     *
     * Damit ist auch der Namens-Dialog weg: Runden bekommen gar keinen
     * eigenen Namen mehr, nur einen Anzeigetitel aus der Spielart.
     */
    spielartGewaehlt(varianteId) {
        if (!SCHACH_VARIANTEN.gibtEs(varianteId)) {
            return;
        }

        TEAM_SCHACH.reglerMerken();
        if (typeof START !== "undefined") {
            START.spielartMerken(varianteId);
        }

        TEAM_SCHACH.auswahlOffen = false;
        TEAM_SCHACH._auswahlAufheben();
        TABS.wechseln("start");
    },

    /*
     * „Spielen" auf dem Startbildschirm: die Runde mit der gemerkten
     * Spielart und den gemerkten Reglern anlegen und gleich betreten.
     * Gerufen aus START.spielen; bis v0.13.0 stand dieser Rumpf hinter dem
     * Namens-Dialog in `spielartGewaehlt`.
     */
    async rundeStarten(varianteId, regelnWunsch) {
        const person = TEAM_SCHACH._ich();
        if (!person || !SCHACH_VARIANTEN.gibtEs(varianteId)) {
            return;
        }
        if (await TEAM_SCHACH._zweitePartieVerhindern(person)) {
            return;
        }

        const variante = SCHACH_VARIANTEN.holen(varianteId);
        const wunsch = regelnWunsch || TEAM_SCHACH._regelnVorgabe();

        /* Den Anzeigetitel vergibt die App (Wunsch 1) — gefragt wird nicht
           mehr. Er steht auf den Karten und in den Hinweisen. */
        const titel = variante.titel;

        /* Angelegt wird auf dem Stand vom Server, damit keine fremde Partie
           verloren geht. */
        const abgleich = TEAM_SCHACH.abgleich;
        let tafel = abgleich.daten;

        try {
            if (abgleich.speicher.art === "gemeinsam") {
                tafel = SCHACH_TAFEL.normalisieren(await abgleich.speicher.laden());
            }
        } catch (fehler) {
            await DIALOG.hinweis("Nicht angelegt",
                "Der aktuelle Stand konnte nicht geladen werden: " + fehler.message);
            return;
        }

        /*
         * GEGEN DEN COMPUTER (seit v0.27.0): Die Abstimmung im Team passt
         * nicht dazu — man ist allein in seinem Team, und der Computer
         * stimmt über nichts ab. Der Haken wird für diese Runde deshalb
         * still ausgeschaltet; die Geräte-Erinnerung des Starts bleibt
         * unberührt, für die nächste Runde gegen Menschen gilt sie wieder.
         */
        const gegenComputer = (wunsch.gegenComputer === true);

        /* Die Spielart „Fähigkeiten sammeln“ hat sie ohnehin an; für alle
           anderen entscheidet der Schalter. */
        const regeln = {
            faehigkeiten: wunsch.faehigkeiten || !!variante.faehigkeiten,
            seltenheitZeigen: wunsch.seltenheitZeigen,
            pechZeigen: wunsch.pechZeigen,
            lootboxMenge: wunsch.lootboxMenge,
            zufallsArmee: wunsch.zufallsArmee,
            armeeUnterschiedlich: wunsch.armeeUnterschiedlich,
            armeeStaerke: wunsch.armeeStaerke,
            itemVorrat: wunsch.itemVorrat,
            itemAuswahl: wunsch.itemAuswahl,
            einigkeit: gegenComputer ? false : wunsch.einigkeit,

            /*
             * Die Stufe wandert nur in Bot-Runden mit (v0.28.0) — in einer
             * Partie unter Menschen wäre sie ein Feld ohne Bedeutung.
             * Unbekanntes wird zur Vorgabe, nicht durchgereicht.
             */
            botStufe: (gegenComputer && SCHACH_BOT.gibtEsStufe(wunsch.botStufe))
                ? wunsch.botStufe
                : (gegenComputer ? SCHACH_BOT.STUFE_VORGABE : "")
        };

        const ergebnis = SCHACH_TAFEL.partieAnlegen(
            tafel, varianteId, titel, undefined, regeln);

        /*
         * Wer anlegt, spielt mit: Er kommt gleich ins weisse Team und landet
         * direkt in der Partie. Vorher musste man erst zurück in die Übersicht,
         * die eigene Partie suchen und dort beitreten.
         */
        /*
         * GEGEN DEN COMPUTER WÄHLT DER MENSCH SEINE SEITE SELBST (seit
         * v0.29.0, Nutzer-Ansage: „soll ich mir meine seite auswählen
         * können und sobald ich auf bereit klicke soll der Bot in die
         * andere Gruppe joinen").
         *
         * Deshalb wird hier NIEMAND eingetragen — weder der Mensch noch der
         * Computer. Die Runde öffnet mit zwei leeren Team-Karten; ein Tipp
         * auf „Mitspielen" entscheidet, und `bereitUmschalten` holt danach
         * den Computer auf die andere Seite.
         *
         * WARUM NICHT EINTRAGEN UND WECHSELN LASSEN: Ein Teamwechsel ist im
         * Modell verboten (`SCHACH_RUNDE.teamBeitreten`) — bei Partien über
         * mehrere Tage hiesse er, erst für die eine und dann für die andere
         * Seite zu ziehen. Wer die Wahl haben soll, darf also gar nicht
         * erst gesetzt werden.
         *
         * Partien unter Menschen bleiben, wie sie waren: Wer anlegt, kommt
         * gleich ins weisse Team und muss sich um nichts kümmern.
         */
        let partie = ergebnis.partie;

        if (!gegenComputer) {
            partie = SCHACH_RUNDE.teamBeitreten(partie, person.id, "weiss");
        }

        ergebnis.tafel = SCHACH_TAFEL.partieEinsetzen(ergebnis.tafel, partie);

        /*
         * ANMELDEN, BEVOR AM ABGLEICH VORBEI GESCHRIEBEN WIRD (seit v0.52).
         *
         * SO SAH DER FEHLER AUS: „Wenn ich einen Raum erstelle, springe ich
         * nicht direkt rein — ich bleibe in dem Menü, wo man auf die Größe
         * tippt, und erkenne nicht, dass eine Partie schon begonnen hat."
         *
         * Die Ursache ist nicht der Bildschirm, sondern das Rennen mit der
         * regelmässigen Abfrage: Sie läuft weiter, während gespeichert wird.
         * Landet ihre Antwort nach dem Schreiben, ersetzt sie `abgleich.daten`
         * durch den Stand VOM SERVER — und der kennt die eben angelegte Partie
         * noch nicht. Das frisch gesetzte `offeneId` zeigt dann ins Leere.
         *
         * Genau dafür gibt es `eigenerVorgangBeginnt` (eiserne Regel: „Wer am
         * Abgleich vorbei schreibt, meldet sich an"). Züge tun das seit v3.8,
         * der Imposter auch — nur das Anlegen und das Löschen nicht. Das ist
         * derselbe Fehlertyp wie v0.44, aber eine andere Ursache: Damals blieb
         * die Auswahl offen, diesmal verschwindet die Partie unter ihr.
         */
        abgleich.eigenerVorgangBeginnt();

        try {
            await abgleich.speicher.speichern(ergebnis.tafel);
            abgleich.daten = ergebnis.tafel;

            /* Merken, dass DIESES Gerät sie angelegt hat — solange ihr
               niemand beigetreten ist, räumt `uebersichtOeffnen` sie beim
               Verlassen wieder weg (seit v0.29.0). */
            TEAM_SCHACH.selbstAngelegt = ergebnis.partie.id;

            /* Gestartet wird jetzt vom Startbildschirm aus — der Tab muss
               also erst gewechselt werden (Wunsch 1). */
            TABS.wechseln("team-schach");
            TEAM_SCHACH.partieOeffnen(ergebnis.partie.id);

            /* Der Startbildschirm merkt sich die Spielart fürs
               Vorschaubild (seit v0.9.0). */
            if (typeof START !== "undefined") {
                START.spielartMerken(varianteId);
            }
        } catch (fehler) {
            await DIALOG.hinweis("Nicht angelegt",
                "Die Partie konnte nicht gespeichert werden: " + fehler.message);
        } finally {
            abgleich.eigenerVorgangEndet();
        }
    },

    /*
     * Löschen ist der Verwaltung vorbehalten (seit v3.3).
     *
     * Die Punkte einer beendeten Partie sind zwar in der Chronik festgeschrieben
     * und überleben das Löschen — eine LAUFENDE Partie ist aber unwiederbringlich
     * weg, mitsamt der Arbeit aller Beteiligten. Bis v3.2 reichte dafür ein
     * Fehlgriff auf einem fremden Handy.
     */
    async partieLoeschen(partie) {
        const darf = await VERWALTUNG.verlangen(
            "Partie löschen",
            "Eine laufende Partie ist danach für alle weg — auch für die, die "
                + "gerade mitspielen. Das darf nur, wer das Passwort kennt."
        );
        if (!darf) {
            return;
        }

        /* Die „Wirklich?"-Frage stellt seit v0.112 der Knopf selbst
           (`DIALOG.zweiSchritt` in der Übersicht) — hier bleibt nur noch
           die Passwort-Schranke oben. */

        const abgleich = TEAM_SCHACH.abgleich;
        let tafel = abgleich.daten;

        /* Auch hier wird am Abgleich vorbei geschrieben — sonst holt die
           regelmässige Abfrage die eben gelöschte Partie zurück (seit v0.52,
           siehe `spielartGewaehlt`). */
        abgleich.eigenerVorgangBeginnt();

        try {
            if (abgleich.speicher.art === "gemeinsam") {
                tafel = SCHACH_TAFEL.normalisieren(await abgleich.speicher.laden());
            }
            const neueTafel = SCHACH_TAFEL.partieEntfernen(tafel, partie.id);
            await abgleich.speicher.speichern(neueTafel);
            abgleich.daten = neueTafel;

            if (TEAM_SCHACH.offeneId === partie.id) {
                TEAM_SCHACH.offeneId = "";
            }
            TEAM_SCHACH.zeichnen(neueTafel);
        } catch (fehler) {
            await DIALOG.hinweis("Nicht gelöscht",
                "Die Partie konnte nicht entfernt werden: " + fehler.message);
        } finally {
            abgleich.eigenerVorgangEndet();
        }
    },

    /*
     * HIER STAND BIS v0.25.0 `umbenennen` — der Knopf „Umbenennen" in der
     * Fussleiste fragte nach einem neuen Partie-Namen. Seit v0.14.0 haben
     * Runden gar keinen eigenen Namen mehr, nur den Titel ihrer Spielart;
     * der Knopf änderte also etwas, das es nicht mehr gibt, und ist mit
     * v0.26.0 entfallen.
     *
     * `SCHACH_RUNDE.umbenennen` BLEIBT im Modell: Es gehört zum additiven
     * Datenvertrag (das Feld `titel` gibt es weiter), und die Tests der
     * Tafel rechnen damit.
     */

    async teamBeitreten(partie, farbe) {
        const person = TEAM_SCHACH._ich();
        if (!person) {
            return;
        }

        /* F11: Wer schon in einer laufenden Partie steckt, tritt keiner
           weiteren bei. Der Wechsel INNERHALB derselben Partie bleibt
           unberührt (das regelt das Modell). */
        if (!SCHACH_RUNDE.teamVon(partie, person.id)
                && await TEAM_SCHACH._zweitePartieVerhindern(person)) {
            return;
        }

        TEAM_SCHACH._auswahlAufheben();
        await TEAM_SCHACH._sendenMitPruefung(
            SCHACH_RUNDE.teamBeitreten(partie, person.id, farbe),
            partie.zugZaehler
        );
    },

    /*
     * Die Runde verlassen.
     *
     * WER ALLEIN WAR, SCHLIESST SIE DAMIT (seit v0.26.0, Nutzer-Ansage
     * 24.08.: „und einmalig den raum beim verlassen auch schliessen,
     * solange man alleine in der runde war"). Sonst bliebe für jede
     * angelegte und wieder verlassene Runde eine leere Partie im
     * gemeinsamen Stand stehen — sichtbar für niemanden, aber für immer.
     *
     * ALLEIN heisst: In BEIDEN Teams steht danach niemand mehr. Ist noch
     * jemand da, bleibt die Runde selbstverständlich stehen — es ist ja
     * seine.
     *
     * Beendete Runden werden NIE entfernt: An ihnen hängt das Ergebnis,
     * das die Rangliste zeigt.
     */
    async teamVerlassen(partie) {
        const person = TEAM_SCHACH._ich();
        if (!person) {
            return;
        }
        TEAM_SCHACH._auswahlAufheben();
        TEAM_SCHACH._botAbbrechen();

        const danach = SCHACH_RUNDE.teamVerlassen(partie, person.id);

        if (!partie.ergebnis && TEAM_SCHACH._istVerwaist(danach)) {
            await TEAM_SCHACH._verwaisteRundeSchliessen(danach);
            return;
        }

        await TEAM_SCHACH._sendenMitPruefung(danach, partie.zugZaehler);
    },

    /*
     * Steht in beiden Teams kein MENSCH mehr?
     *
     * Der Computer zählt seit v0.27.0 nicht mit: Er hält keine Runde am
     * Leben. Ohne diese Ausnahme bliebe für jede Partie gegen den Computer,
     * die man verlässt, eine Runde mit einem einsamen Bot im gemeinsamen
     * Stand stehen — sichtbar für niemanden, aber für immer.
     */
    _istVerwaist(partie) {
        return SCHACH_BOT.nurNochBot(partie);
    },

    /*
     * Die verwaiste Runde aus dem gemeinsamen Stand nehmen.
     *
     * NICHT über `_sendenMitPruefung`: Das setzt eine geänderte Partie
     * ein, hier soll sie verschwinden. Der Ablauf ist deshalb derselbe wie
     * bei `partieLoeschen` — Stand vom Server holen, Partie entfernen,
     * schreiben — nur ohne Passwort-Schranke: Wer allein in seiner eigenen
     * Runde sass, löscht niemandem etwas weg.
     *
     * ANMELDEN NICHT VERGESSEN (`eigenerVorgangBeginnt`, eiserne Regel):
     * Hier wird am Abgleich vorbei geschrieben, und seine regelmässige
     * Abfrage holte die eben entfernte Runde sonst zurück (v0.52).
     */
    async _verwaisteRundeSchliessen(partie) {
        const abgleich = TEAM_SCHACH.abgleich;
        abgleich.eigenerVorgangBeginnt();

        try {
            let tafel = abgleich.daten;
            if (abgleich.speicher.art === "gemeinsam") {
                tafel = SCHACH_TAFEL.normalisieren(await abgleich.speicher.laden());
            }

            const neueTafel = SCHACH_TAFEL.partieEntfernen(tafel, partie.id);
            await abgleich.speicher.speichern(neueTafel);
            abgleich.daten = neueTafel;

            if (TEAM_SCHACH.offeneId === partie.id) {
                TEAM_SCHACH.offeneId = "";
            }
            TEAM_SCHACH.zeichnen(neueTafel);
            DIALOG.kurzmeldung("Runde geschlossen");

        } catch (fehler) {
            await DIALOG.hinweis("Nicht geschlossen",
                "Die Runde konnte nicht geschlossen werden: " + fehler.message
                    + "\n\nDu bist trotzdem nicht mehr dabei, sobald es "
                    + "wieder geht.");
        } finally {
            abgleich.eigenerVorgangEndet();
        }
    },

    async bereitUmschalten(partie, farbe, bereit) {
        const person = TEAM_SCHACH._ich();
        let neu = SCHACH_RUNDE.bereitSetzen(partie, farbe, bereit);

        /*
         * JETZT STEIGT DER COMPUTER EIN (seit v0.29.0) — auf der Seite
         * gegenüber. Er wartete darauf, dass der Mensch sich eine Seite
         * ausgesucht hat; deshalb steht dieser Aufruf hier und nicht beim
         * Anlegen. Wer „Doch nicht bereit" drückt, holt niemanden dazu.
         *
         * Das Modell entscheidet, ob überhaupt etwas zu tun ist — hier wird
         * nichts geprüft.
         */
        if (bereit && person) {
            neu = SCHACH_BOT.beiBereitDazuholen(neu, person.id);
        }

        await TEAM_SCHACH._sendenMitPruefung(neu, partie.zugZaehler);
    },

    /* Einen Freund in die Runde einladen (seit v0.13.0, Schritt 7). */
    async einladen(partie, spielerId) {
        await TEAM_SCHACH._sendenMitPruefung(
            SCHACH_RUNDE.einladen(partie, spielerId),
            partie.zugZaehler
        );
    },

    /* ---------------------------------------------------------------- *
     * Das Einladungs-Banner (seit v0.13.0, Bündel A Schritt 7)
     *
     * Es fährt oben herein, sobald das Gerät eine Einladung im geholten
     * Stand sieht — also nur, solange die Seite offen ist (F15: das
     * genügt, entschieden 24.08.). Nach zehn Sekunden verschwindet es von
     * selbst (Nutzer-Vorgabe zu F16); die Einladung selbst bleibt unter
     * „Runde beitreten" liegen, bis die Runde vorbei ist (F16a).
     * ---------------------------------------------------------------- */

    /* Je Sitzung wird jede Einladung nur einmal als Banner gemeldet. */
    _einladungGemeldet: {},

    _einladungenMelden(tafel) {
        if (typeof document === "undefined" || !document.body
                || !document.body.appendChild) {
            return;
        }
        const person = TEAM_SCHACH._ich();
        if (!person) {
            return;
        }

        for (const partie of SCHACH_TAFEL.liste(tafel)) {
            if (!SCHACH_RUNDE.istEingeladen(partie, person.id)) {
                continue;
            }
            if (TEAM_SCHACH._einladungGemeldet[partie.id]) {
                continue;
            }
            TEAM_SCHACH._einladungGemeldet[partie.id] = true;
            TEAM_SCHACH._bannerZeigen(partie);
            break;
        }
    },

    _bannerZeigen(partie) {
        /* Immer nur eines — ein neues löst das alte ab. */
        const altes = document.body.querySelector
            ? document.body.querySelector(".einladung-banner") : null;
        if (altes && altes.parentNode) {
            altes.parentNode.removeChild(altes);
        }

        const banner = document.createElement("div");
        banner.className = "einladung-banner";
        banner.setAttribute("role", "status");

        banner.appendChild(TEAM_SCHACH._element("span", "einladung-text",
            "Du bist eingeladen: " + partie.titel));

        const weg = () => {
            if (banner.parentNode) {
                banner.parentNode.removeChild(banner);
            }
        };

        banner.appendChild(TEAM_SCHACH._knopf("Ansehen",
            "knopf-haupt knopf-klein", () => {
                weg();
                TABS.wechseln("team-schach");
                TEAM_SCHACH.partieOeffnen(partie.id);
            }));

        document.body.appendChild(banner);

        window.setTimeout(weg, 10000);
    },

    /*
     * NUR ANSEHEN (seit v0.48): Beschreibung, was sie kostet, und die
     * abgespielte Anleitung — ohne etwas einzusetzen.
     *
     * Das ist der Weg für jede Fähigkeit, die man gerade NICHT einsetzen darf:
     * die des Gegners, oder die eigene, während der Gegner am Zug ist. Bis
     * v0.47 war so eine Fähigkeit ein totes Schildchen; wer wissen wollte, was
     * dahintersteckt, musste in der Bibliothek danach suchen. Dieselben Bilder
     * wie beim Einsetzen — es gibt nur eine Anleitung je Fähigkeit.
     */
    /*
     * `grund` (seit v0.59) ist wahlfrei: ein Satz, WARUM sie sich gerade nicht
     * einsetzen lässt. Ohne ihn bleibt es beim Ansehen wie bisher — man tippt
     * ja auch die Fähigkeiten des Gegners an, und dort gibt es keinen Grund zu
     * nennen.
     */
    /*
     * DAS FENSTER VOR DEM ANPFIFF: WELCHE ITEMS SIND DRIN? (seit v0.100.)
     *
     * Nutzer-Wunsch 20.08.: „Es soll vor Beginn auch ein Popup kommen mit
     * ‚diese Items sind drin' in einer Liste, wo auch anklickbar ist, um sich
     * die einzelnen anzuschauen, was sie machen."
     *
     * DREI FESTLEGUNGEN:
     *
     *   1. NUR VOR DEM ANPFIFF. Läuft die Partie schon, drängt sich nichts
     *      dazwischen — dieselbe Regel wie beim Abschluss-Bildschirm. Wer
     *      später nachsehen will, hat weiter das i im Partie-Kopf.
     *   2. NUR EINMAL JE PARTIE UND GERÄT. Gemerkt wird es im Bildschirm,
     *      nicht im Stand: Es ist eine Nachricht an EINEN Zuschauer, kein
     *      Spielstand. Nach dem Neuladen kommt es wieder — das ist gewollt,
     *      denn dann sieht man es ja auch wieder zum ersten Mal.
     *   3. NUR, WENN ES ETWAS ZU SAGEN GIBT. Ohne begrenzten Vorrat („alle")
     *      gibt es keine Liste, und dann bleibt das Fenster weg.
     *
     * Die Liste führt WEITER: Ein Tipp auf einen Eintrag öffnet dessen
     * Anleitung mit Bildern, danach steht die Liste wieder da. Deshalb die
     * Schleife — `DIALOG.liste` liefert den gewählten Eintrag oder `null`.
     */
    async vorratVorstellen(partie) {
        const vorrat = SCHACH_RUNDE.itemVorrat(partie);

        if (!vorrat || vorrat.length === 0 || partie.laeuft || partie.ergebnis) {
            return;
        }
        if (TEAM_SCHACH.vorratGezeigt[partie.id]) {
            return;
        }
        TEAM_SCHACH.vorratGezeigt[partie.id] = true;

        while (true) {
            const eintraege = vorrat.map((art) => ({
                beschriftung: SCHACH_VARIANTEN.faehigkeitTitel(art),
                hinweis: SCHACH_VARIANTEN.stufeVon(art).titel,
                wert: art
            }));

            const gewaehlt = await DIALOG.liste(
                "Diese Items sind drin (" + vorrat.length + ")",
                "Nur diese Fähigkeiten kommen in dieser Partie vor, für beide "
                    + "Seiten dieselben. Tippe eine an.",
                eintraege,
                "Los geht's");

            if (!gewaehlt) {
                return;
            }
            await TEAM_SCHACH.faehigkeitAnsehen(gewaehlt);
        }
    },

    async faehigkeitAnsehen(art, grund) {
        const beschreibung = SCHACH_VARIANTEN.FAEHIGKEITEN[art];
        if (!beschreibung) {
            return;
        }

        /* Oben ein Satz, darunter die Bilder, die ganze Beschreibung im
           Aufklapper darunter (seit v0.94, siehe `_anleitungMitBeschreibung`). */
        await DIALOG.hinweis(
            SCHACH_VARIANTEN.faehigkeitTitel(art),
            SCHACH_VARIANTEN.faehigkeitKurz(art)
                + "\n\n" + TEAM_SCHACH._kostenSatz(beschreibung)
                + (beschreibung.imGegenzug
                    ? "\n\nBlitz: Sie geht auch, während der Gegner am Zug ist."
                    : "")
                + (grund ? "\n\n" + grund : ""),
            TEAM_SCHACH._anleitungMitBeschreibung(art)
        );
    },

    /*
     * Der Knopf an einer Fähigkeit. Braucht sie ein Ziel, wird hier nur der
     * Auswahl-Zustand gesetzt — der Einsatz folgt beim Antippen des Feldes.
     */
    async faehigkeitEinsetzen(partie, art) {
        const person = TEAM_SCHACH._ich();
        if (!person) {
            return;
        }

        const beschreibung = SCHACH_VARIANTEN.FAEHIGKEITEN[art];
        if (!beschreibung) {
            return;
        }

        /*
         * Der Händler fragt anders: Er zeigt sein Angebot, statt nur zu
         * erklären, was die Fähigkeit tut. Wer ablehnt, behält sie — das
         * Angebot ändert sich mit dem nächsten Zug von selbst.
         */
        if (beschreibung.art === "handel") {
            await TEAM_SCHACH.handelAnbieten(partie, person, art);
            return;
        }

        /* Der Dieb fragt genauso: Er zeigt, was er greifen würde. */
        if (beschreibung.art === "diebstahl") {
            await TEAM_SCHACH.diebstahlAnbieten(partie, person, art);
            return;
        }

        /*
         * ERST NACHSEHEN, OB ES ÜBERHAUPT EIN FELD GIBT (seit v0.94).
         *
         * Die Prüfung stand bis v0.93 NACH der Rückfrage: Man las die
         * Beschreibung, sah sich die Bilder an, drückte „Einsetzen" — und
         * bekam dann zu hören, dass es gerade gar kein Feld gibt. Jetzt kommt
         * die Absage sofort, und die Rückfrage bleibt aus.
         *
         * Die Liste wird gleich weiterverwendet; ein zweites Rechnen nach der
         * Rückfrage wäre auch ein zweites Ergebnis, wenn inzwischen jemand
         * gezogen hat.
         */
        let felder = null;
        if (beschreibung.art === "ziel") {
            /* Das Nudelholz beginnt immer an der EIGENEN Seite (v0.117) —
               von dort rollt es von einem weg, wie man es kennt. Gedreht
               wird danach mit dem Knopf am Brett. */
            if (art === "nudelholz") {
                TEAM_SCHACH.nudelholzKante =
                    (SCHACH_RUNDE.teamVon(partie, person.id) === SCHACH.WEISS)
                        ? "unten" : "oben";
            }

            felder = SCHACH_RUNDE.zielFelder(partie, person.id, art,
                TEAM_SCHACH._zusatzWahl(art));

            if (felder.length === 0) {
                await DIALOG.hinweis("Kein Ziel möglich",
                    "Für " + SCHACH_VARIANTEN.faehigkeitTitel(art)
                        + " gibt es auf diesem Brett gerade kein gültiges Feld. "
                        + "Die Fähigkeit bleibt dir erhalten.");
                return;
            }
        }

        /* Dieselbe Frage wie beim Pluszeichen am Vorrat, dieselbe Antwort —
           sie kommt aus dem Modell (SCHACH_RUNDE.behaeltZug). */
        const meineFarbe = SCHACH_RUNDE.teamVon(partie, person.id);
        const behaeltZug = SCHACH_RUNDE.behaeltZug(partie, meineFarbe, art);

        const ja = await DIALOG.frage(
            SCHACH_VARIANTEN.faehigkeitTitel(art) + " einsetzen?",
            SCHACH_VARIANTEN.faehigkeitKurz(art)
                + "\n\nSie ist danach verbraucht."
                + (behaeltZug
                    ? " Dein normaler Zug bleibt dir."
                    : (beschreibung.istDerZug
                        ? " Sie IST dein Zug: Gleich danach tippst du deine Figur "
                            + "und ihr Ziel an — etwas anderes geht dann nicht mehr."
                        : (beschreibung.beendetZug
                            ? " Und sie kostet den ganzen Zug: Danach ist der Gegner dran."
                            : " Einen Zug bekommst du dadurch nicht — du bist gerade "
                                + "nicht dran."))),
            "Einsetzen",
            false,
            /* Bilder statt eines langen Satzes: was die Fähigkeit tut, sieht
               man schneller, als man es liest. Der ganze Text steht seit v0.94
               im Aufklapper DARUNTER — vorher stand er darüber und schob die
               Bilder aus dem Bild. */
            TEAM_SCHACH._anleitungMitBeschreibung(art)
        );
        if (!ja) {
            return;
        }

        if (beschreibung.art === "ziel") {
            TEAM_SCHACH.gewaehltesFeld = -1;
            TEAM_SCHACH.moeglicheZiele = [];
            TEAM_SCHACH.zielFaehigkeit = art;
            TEAM_SCHACH.zielFelder = felder;

            /* Auch die Zielauswahl gehört zu genau dieser Stellung: Zieht
               jemand dazwischen, sind die Felder überholt. */
            TEAM_SCHACH.auswahlZaehler = partie.zugZaehler;

            TEAM_SCHACH.zeichnen(TEAM_SCHACH.abgleich.daten);
            return;
        }

        /*
         * DER BAUERNSCHUB FRAGT NACH DER FIGUR (seit v0.56).
         *
         * Erreichen durch ihn Bauern die letzte Reihe, werden sie ALLE
         * umgewandelt — und zwar in dieselbe Figur, einmal gefragt statt
         * fünfmal. Wer abbricht, behält die Fähigkeit.
         *
         * Ob überhaupt jemand umwandelt, beantwortet das Modell
         * (`SCHACH_RUNDE.schubWandeltUm`); der Bildschirm zählt nicht selbst
         * nach, welcher Bauer wie weit vorn steht.
         */
        const wandelnd = SCHACH_RUNDE.schubWandeltUm(partie, person.id);

        if (beschreibung.art === "sofort" && wandelnd > 0) {
            const wahl = await DIALOG.liste(
                (wandelnd === 1) ? "Ein Bauer wandelt um" : wandelnd + " Bauern wandeln um",
                (wandelnd === 1)
                    ? "Der Schub bringt einen Bauern auf die letzte Reihe. In welche "
                        + "Figur soll er umgewandelt werden?"
                    : "Der Schub bringt " + wandelnd + " Bauern auf die letzte Reihe. "
                        + "In welche Figur sollen sie umgewandelt werden? Die Wahl "
                        + "gilt für alle.",
                [
                    { beschriftung: "Dame", hinweis: "die übliche Wahl", wert: "D" },
                    { beschriftung: "Turm", hinweis: "", wert: "T" },
                    { beschriftung: "Läufer", hinweis: "", wert: "L" },
                    { beschriftung: "Springer", hinweis: "manchmal stärker", wert: "S" }
                ],
                "Abbrechen"
            );

            if (!wahl) {
                return;
            }

            await TEAM_SCHACH.faehigkeitAusfuehren(partie, art, -1, wahl);
            return;
        }

        await TEAM_SCHACH.faehigkeitAusfuehren(partie, art, -1);
    },

    /*
     * Das Angebot des Händlers zeigen und annehmen lassen.
     *
     * Es steht ausdrücklich da, WAS weggeht und WO das Neue erscheint — sonst
     * verschwinden fünf Bauern, und niemand weiss, welche. Abgelehnt kostet es
     * nichts: Die Fähigkeit bleibt im Vorrat.
     */
    async handelAnbieten(partie, person, art) {
        const farbe = SCHACH_RUNDE.teamVon(partie, person.id);
        const angebot = SCHACH_RUNDE.handelsAngebot(partie, farbe);

        if (!angebot) {
            await DIALOG.hinweis("Der Händler hat nichts für dich",
                "Dir fehlen die passenden Figuren — oder der Platz für das, was du "
                + "bekämst. Nach dem nächsten Zug bietet er etwas anderes an.");
            return;
        }

        const breite = SCHACH.breiteVon(partie.stand);
        const hoehe = SCHACH.hoeheVon(partie.stand);
        const namen = (felder) => felder
            .map((feld) => SCHACH.feldName(feld, breite, hoehe))
            .join(", ");

        const ja = await DIALOG.frage(
            "Der Händler bietet",
            angebot.text + "\n\n"
                + "Du gibst ab: " + namen(angebot.gibtFelder) + "\n"
                + "Du bekommst auf: " + namen(angebot.bekommtFelder) + "\n\n"
                + "Nimmst du an, ist danach der Gegner am Zug. Lehnst du ab, "
                + "behältst du die Fähigkeit — und nach dem nächsten Zug hat der "
                + "Händler ein anderes Angebot.",
            "Annehmen",
            false
        );

        if (!ja) {
            return;
        }

        await TEAM_SCHACH.faehigkeitAusfuehren(partie, art, -1);
    },

    /*
     * Der Dieb zeigt seine Beute, bevor er zugreift (seit v0.85).
     *
     * Aufgebaut wie der Händler eine Funktion höher — und aus demselben
     * Grund: Was eine Fähigkeit einem BRINGT, will man sehen, bevor man sie
     * ausgibt. Angezeigt werden die Titel, nicht die Beschreibungen; wer
     * wissen will, was eine davon kann, findet sie danach im eigenen Vorrat.
     */
    async diebstahlAnbieten(partie, person, art) {
        const farbe = SCHACH_RUNDE.teamVon(partie, person.id);
        const beute = SCHACH_RUNDE.diebesBeute(partie, farbe);

        if (!beute) {
            await DIALOG.hinweis("Beim Gegner ist nichts zu holen",
                "Der Gegner hat gerade nichts im Vorrat. Der Dieb bleibt dir "
                + "erhalten, bis sich der Griff lohnt.");
            return;
        }

        const titel = beute.arten
            .map((eine) => SCHACH_VARIANTEN.faehigkeitTitel(eine));

        const ja = await DIALOG.frage(
            "Der Dieb greift zu",
            "Du nimmst dem Gegner ab:\n\n"
                + titel.map((eine) => "• " + eine).join("\n") + "\n\n"
                + (titel.length === 1
                    ? "Mehr hat er nicht — das ist alles, was er besitzt.\n\n"
                    : "")
                + "Sie wandern sofort in deinen Vorrat, und im Verlauf steht, was "
                + "du genommen hast. Nimmst du an, ist danach der Gegner am Zug. "
                + "Lehnst du ab, behältst du den Dieb — nach dem nächsten Zug "
                + "greift er woanders zu.",
            "Klauen",
            false
        );

        if (!ja) {
            return;
        }

        await TEAM_SCHACH.faehigkeitAusfuehren(partie, art, -1);
    },

    /*
     * Setzt die Fähigkeit wirklich ein — mit Ziel, wenn sie eines braucht.
     *
     * `umwandlung` braucht bisher nur der Bauernschub (seit v0.56) und ist
     * wahlfrei; ohne Angabe werden umgewandelte Bauern zu Damen.
     */
    async faehigkeitAusfuehren(partie, art, zielFeld, umwandlung, wahl) {
        const person = TEAM_SCHACH._ich();
        if (!person) {
            return;
        }

        /*
         * FÄHIGKEITEN MIT BLITZ GEHEN EINEN EIGENEN WEG (seit v0.66).
         *
         * Sie werden eingesetzt, während der Gegner am Zug ist — die
         * Zugzähler-Prüfung von `_sendenMitPruefung` würde sie deshalb fast
         * immer abweisen. Warum das so ist und was stattdessen passiert, steht
         * bei `_faehigkeitImGegenzugSenden`.
         *
         * Nur wenn man WIRKLICH nicht am Zug ist: Wer eine Blitz-Fähigkeit im
         * eigenen Zug einsetzt (das dürfen alle ausser Ausweichen), soll
         * weiterhin die gewohnte Prüfung bekommen — dort ist sie richtig.
         */
        const beschreibungJetzt = SCHACH_VARIANTEN.FAEHIGKEITEN[art] || {};
        const meineFarbeJetzt = SCHACH_RUNDE.teamVon(partie, person.id);

        if (beschreibungJetzt.imGegenzug && partie.stand.amZug !== meineFarbeJetzt) {
            await TEAM_SCHACH._faehigkeitImGegenzugSenden(partie, art, zielFeld, umwandlung);
            return;
        }

        /* Braucht die Partie Einigkeit, wird auch die Fähigkeit erst
           vorgeschlagen — genau wie ein Zug. */
        const neu = SCHACH_RUNDE.brauchtEinigkeit(partie)
            ? SCHACH_RUNDE.faehigkeitVorschlagen(
                partie, person.id, art, zielFeld, person.name, undefined, umwandlung, wahl)
            : SCHACH_RUNDE.faehigkeitEinsetzen(
                partie, person.id, art, zielFeld, person.name, undefined, umwandlung, wahl);

        TEAM_SCHACH._auswahlAufheben();

        if (!neu) {
            const beschreibung = SCHACH_VARIANTEN.FAEHIGKEITEN[art] || {};

            /*
             * DEN ECHTEN GRUND NENNEN, WENN ER BEKANNT IST (seit v0.94).
             *
             * Bis v0.93 zählte dieser Hinweis drei mögliche Gründe auf und
             * überliess es dem Spieler, den richtigen zu erraten. In der
             * Praxis war es fast immer derselbe: Der eigene König stünde
             * danach im Schach. Seit v0.94 markiert das Brett solche Felder
             * gar nicht mehr (`zielFelder` fragt `_wirkungVerboten` mit) —
             * hierher kommt man deshalb nur noch, wenn sich der Stand
             * zwischendurch geändert hat. Genau das soll dann auch dastehen.
             */
            const imSchach = meineFarbeJetzt
                && SCHACH.imSchach(partie.stand, meineFarbeJetzt);

            await DIALOG.hinweis("Geht gerade nicht",
                imSchach
                    ? "Dein König steht im Schach. Dann geht nichts, was deinen "
                        + "Zug beendet — du müsstest das Schach dabei ja auflösen. "
                        + "Die Fähigkeit bleibt dir erhalten."
                    : (beschreibung.imGegenzug
                        ? "Die Fähigkeit lässt sich nur einsetzen, solange die "
                            + "Partie läuft und du in einem Team bist. Sie bleibt "
                            + "dir erhalten."
                        : "Auf dem Brett hat sich etwas geändert — dein Team ist "
                            + "gerade nicht am Zug, oder das Feld geht nicht mehr. "
                            + "Die Fähigkeit bleibt dir erhalten."));
            TEAM_SCHACH.zeichnen(TEAM_SCHACH.abgleich.daten);
            return;
        }

        await TEAM_SCHACH._sendenMitPruefung(neu, partie.zugZaehler);
    },

    async aufgeben(partie, farbe) {
        /* Die „Wirklich?"-Frage stellt seit v0.112 der Knopf selbst
           (`DIALOG.zweiSchritt` an der Knopfleiste der Partie). */
        await TEAM_SCHACH._sendenMitPruefung(
            SCHACH_RUNDE.aufgeben(partie, farbe),
            partie.zugZaehler
        );
    },

    async neuAufstellen(partie) {
        const ja = await DIALOG.frage(
            "Neu aufstellen?",
            "Das Brett wird zurückgesetzt. Die Teams bleiben, beide Seiten müssen "
                + "erneut bereit drücken.",
            "Neu aufstellen",
            true
        );
        if (!ja) {
            return;
        }
        TEAM_SCHACH._auswahlAufheben();
        await TEAM_SCHACH._sendenMitPruefung(
            SCHACH_RUNDE.neuePartie(partie),
            partie.zugZaehler
        );
    },

    /* ---------------------------------------------------------------- *
     * Bausteine
     * ---------------------------------------------------------------- */

    _element(tag, klasse, text) {
        const element = document.createElement(tag);
        if (klasse) {
            element.className = klasse;
        }
        if (text !== undefined) {
            element.textContent = text;
        }
        return element;
    },

    _knopf(beschriftung, klasse, beiKlick) {
        const knopf = document.createElement("button");
        knopf.type = "button";
        knopf.className = "knopf " + klasse;
        knopf.textContent = beschriftung;
        knopf.addEventListener("click", beiKlick);
        return knopf;
    }
};
