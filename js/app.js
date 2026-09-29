/*
 * app.js — der Startpunkt: verdrahtet Speicher, Abgleich, Tabs und Dialoge.
 *
 * Zwei Stände in der Datenbank:
 *   Spielerliste  ->  KONFIG.speicher.pfad (spieler.js/anmeldung.js:
 *                     Namen und PIN-Prüfsummen — kein Spielstand)
 *   Team Schach   ->  KONFIG.speicher.schachPfad (mehrere Partien)
 *
 * Beide teilen sich die Speicher- und Abgleich-Schicht, wissen aber nichts
 * voneinander. Gemeinsam ist ihnen nur, wer an diesem Gerät sitzt (ich.js) —
 * angemeldet wird über anmeldung.js, weil in der Spielerliste Namen und
 * PINs stehen.
 *
 * Dazu kommt der Tab Rangliste. Er hat KEINEN eigenen Stand: Er liest die
 * vorhandenen nur und zeigt sie zusammen. Deshalb wird er nach jeder
 * Änderung am Spielstand neu gezeichnet.
 *
 * Reihenfolge beim Start:
 *   1. Dialoge bereitstellen,
 *   2. beide Speicher-Rückwände wählen,
 *   3. beide Abgleiche erzeugen und den Tabs bekannt machen,
 *   4. Tab-Leiste zeichnen (baut die Gerüste auf),
 *   5. Daten laden,
 *   6. anmelden — erst jetzt ist bekannt, wer schon mitspielt.
 *
 * GANZ OBEN in dieser Datei steht der globale Fehlerfang (FEHLERFANG) — vor
 * dem Startpunkt, weil er auch dessen Fehler auffangen soll.
 */

/* ------------------------------------------------------------------ *
 * DER GLOBALE FEHLERFANG (seit v0.105.0)
 *
 * WOGEGEN ER STEHT: Fliegt beim Start etwas auseinander, blieb bis dahin eine
 * WEISSE SEITE zurück — ohne Meldung, ohne Hinweis aufs Neuladen und ohne
 * Meldeweg. Der Nutzer konnte nicht einmal sagen, was passiert ist; der
 * Wunsch-Knopf hängt in den Einstellungen, und die erreicht man nur, wenn die
 * App läuft.
 *
 * WARUM DIESE STELLE: Der Fang wird beim ÜBERSETZEN dieser Datei angemeldet,
 * nicht erst in `DOMContentLoaded` — sonst wäre er genau in dem Moment noch
 * nicht da, in dem `APP.starten` stolpert. `app.js` ist das letzte Skript der
 * Seite; ein Fehler beim LADEN einer früheren Datei entgeht ihm deshalb. In
 * der Praxis fällt auch der auf: Fehlt danach ein Baustein, scheitert
 * `APP.starten` daran, und dieser Fehler landet hier.
 *
 * WAS ER NICHT TUT: Er repariert nichts und verschluckt nichts. Jeder Fehler
 * geht zusätzlich unverändert in die Entwickler-Konsole (`console.error`) —
 * beim Bauen soll man ihn dort weiterhin sehen.
 *
 * WARUM ER SICH NICHT AUF `DIALOG` VERLÄSST: `DIALOG` ist selbst App-Code und
 * damit ein möglicher Fehlerort. Der Streifen wird deshalb mit eigenen Klassen
 * direkt in den `body` gehängt; gebraucht wird nur `document.body`.
 * ------------------------------------------------------------------ */

const FEHLERFANG = {

    /* Wie viele Fehler seit dem Laden der Seite. Der ERSTE baut den Streifen,
       jeder weitere erhöht nur die kleine Zahl darin. */
    anzahl: 0,

    /* Die technische Meldung des ersten Fehlers — sie geht in den Melde-Text. */
    ersteMeldung: "",

    kastenEl: null,
    zaehlerEl: null,

    /* Einmal weggeklickt, kommt der Streifen bis zum Neuladen nicht wieder.
       Sonst wäre der Schliessen-Knopf wertlos: Ein Fehler in einer Schleife
       baute ihn im nächsten Augenblick erneut auf. */
    verworfen: false,

    /*
     * RÜCKFALL-SPERRE. Wirft der Fang selbst (etwa weil es noch keinen `body`
     * gibt), meldet der Browser DIESEN Fehler wieder an genau diesen Fang —
     * eine Endlosschleife. Die Sperre bricht sie.
     */
    _laeuft: false,

    registrieren() {
        window.addEventListener("error", (ereignis) => {
            FEHLERFANG.melden(FEHLERFANG._textAusFehler(ereignis));
        });

        /* Ein Versprechen, das ablehnt und niemanden findet, der es auffängt —
           bei dieser App der häufigere Fall, weil Laden und Speichern
           durchgehend über `await` laufen. */
        window.addEventListener("unhandledrejection", (ereignis) => {
            FEHLERFANG.melden(FEHLERFANG._textAusAblehnung(ereignis));
        });
    },

    melden(text) {
        if (FEHLERFANG._laeuft) {
            return;
        }
        FEHLERFANG._laeuft = true;

        try {
            FEHLERFANG.anzahl++;

            /* NICHTS VERSCHLUCKEN — die Konsole bekommt jeden Fehler. */
            console.error("[Blunderluck] " + text);

            if (FEHLERFANG.verworfen) {
                return;
            }

            if (FEHLERFANG.anzahl === 1) {
                FEHLERFANG.ersteMeldung = text;
                FEHLERFANG._kastenBauen();
            } else {
                FEHLERFANG._zaehlerAktualisieren();
            }
        } catch (eigenerFehler) {
            console.error("[Blunderluck] Der Fehlerfang selbst ist gestolpert: "
                + eigenerFehler);
        } finally {
            FEHLERFANG._laeuft = false;
        }
    },

    /*
     * DER STREIFEN — oben am Rand, nicht über dem Brett.
     *
     * WARUM OBEN und nicht unten: Bleibt die Seite weiss, sucht das Auge oben
     * — dort steht auch sonst jede Meldung dieser App (`<p id="hinweis">`).
     * Der untere Rand ist im Spiel besetzt (Fussleiste, am iPhone zusätzlich
     * der Systembalken); ein Streifen dort verdeckte genau die Knöpfe, mit
     * denen man weiterspielen soll.
     *
     * EINE HAUPTAKTION: „Neu laden" (blau). „Fehler melden" und „Schliessen"
     * sind still — sie sind Nebenwege.
     */
    _kastenBauen() {
        if (!document.body) {
            return;
        }

        const kasten = document.createElement("div");
        kasten.className = "fehler-streifen";
        kasten.setAttribute("role", "alert");

        const textTeil = document.createElement("div");
        textTeil.className = "fehler-streifen-text";

        const titel = document.createElement("p");
        titel.className = "fehler-streifen-titel";
        titel.textContent = "Etwas schiefgegangen";
        textTeil.appendChild(titel);

        const satz = document.createElement("p");
        satz.className = "fehler-streifen-satz";
        satz.textContent = "Fehler der App, nicht deiner · meist hilft Neu laden"
            + " · kommt es wieder: Fehler melden, die Technik steht schon drin";
        textTeil.appendChild(satz);

        const zaehler = document.createElement("p");
        zaehler.className = "fehler-streifen-zaehler";
        zaehler.hidden = true;
        textTeil.appendChild(zaehler);
        FEHLERFANG.zaehlerEl = zaehler;

        kasten.appendChild(textTeil);

        const knoepfe = document.createElement("div");
        knoepfe.className = "fehler-streifen-knoepfe";

        knoepfe.appendChild(FEHLERFANG._knopfBauen(
            "Neu laden", "knopf knopf-haupt knopf-klein",
            () => window.location.reload()));

        /*
         * DER MELDE-WEG IST DER VORHANDENE (`js\wunsch.js`) — nur ohne Dialog:
         * `WUNSCH.formularOeffnen` öffnet das vorbefüllte GitHub-Formular
         * unmittelbar, mit der technischen Meldung als Text. So muss niemand
         * eine Fehlermeldung abtippen.
         *
         * Gibt es `WUNSCH` nicht (die Datei kam gar nicht durch), fehlt der
         * Knopf lieber ganz, als tot dazustehen.
         */
        if (typeof WUNSCH !== "undefined"
                && typeof WUNSCH.formularOeffnen === "function") {
            knoepfe.appendChild(FEHLERFANG._knopfBauen(
                "Fehler melden", "knopf knopf-still knopf-klein",
                () => WUNSCH.formularOeffnen(FEHLERFANG.meldeText())));
        }

        knoepfe.appendChild(FEHLERFANG._knopfBauen(
            "Schliessen", "knopf knopf-still knopf-klein",
            () => FEHLERFANG.schliessen()));

        kasten.appendChild(knoepfe);

        document.body.appendChild(kasten);
        FEHLERFANG.kastenEl = kasten;
    },

    _knopfBauen(beschriftung, klasse, aktion) {
        const knopf = document.createElement("button");
        knopf.type = "button";
        knopf.className = klasse;
        knopf.textContent = beschriftung;
        knopf.addEventListener("click", aktion);
        return knopf;
    },

    _zaehlerAktualisieren() {
        if (!FEHLERFANG.zaehlerEl) {
            return;
        }

        const weitere = FEHLERFANG.anzahl - 1;
        FEHLERFANG.zaehlerEl.textContent = (weitere === 1)
            ? "und ein weiterer Fehler"
            : "und " + weitere + " weitere Fehler";
        FEHLERFANG.zaehlerEl.hidden = false;
    },

    schliessen() {
        FEHLERFANG.verworfen = true;

        if (FEHLERFANG.kastenEl && FEHLERFANG.kastenEl.parentNode) {
            FEHLERFANG.kastenEl.parentNode.removeChild(FEHLERFANG.kastenEl);
        }
        FEHLERFANG.kastenEl = null;
        FEHLERFANG.zaehlerEl = null;
    },

    /* Was im Melde-Formular stehen soll: die Bitte um einen Satz Zusammenhang
       und darunter die technische Meldung im Wortlaut. */
    meldeText() {
        let text = "Automatische Fehlermeldung aus der App."
            + "\n\nWas ich gerade gemacht habe: (bitte kurz ergänzen)"
            + "\n\nTechnische Meldung:\n" + FEHLERFANG.ersteMeldung;

        if (FEHLERFANG.anzahl > 1) {
            text += "\n\nSeit dem Laden der Seite: " + FEHLERFANG.anzahl
                + " Fehler.";
        }
        return text;
    },

    /*
     * Aus dem Ereignis die aussagekräftigste Form ziehen: Der Stapel nennt
     * Datei und Zeile mit, ist aber lang — vier Zeilen reichen, um die Stelle
     * zu finden, und passen noch in ein Formular.
     */
    _textAusFehler(ereignis) {
        const fehler = ereignis && ereignis.error;

        if (fehler && fehler.stack) {
            return FEHLERFANG._stapelKuerzen(fehler.stack);
        }

        const teile = [];
        if (ereignis && ereignis.message) {
            teile.push(String(ereignis.message));
        }
        if (ereignis && ereignis.filename) {
            teile.push(ereignis.filename + ":" + ereignis.lineno
                + ":" + ereignis.colno);
        }
        return teile.length > 0 ? teile.join("\n") : "Unbekannter Fehler";
    },

    _textAusAblehnung(ereignis) {
        const grund = ereignis && ereignis.reason;

        if (grund && grund.stack) {
            return "Nicht aufgefangene Ablehnung:\n"
                + FEHLERFANG._stapelKuerzen(grund.stack);
        }
        return "Nicht aufgefangene Ablehnung: " + String(grund);
    },

    _stapelKuerzen(stapel) {
        return String(stapel).split("\n").slice(0, 4).join("\n");
    }
};

/* Sofort beim Übersetzen dieser Datei — siehe „WARUM DIESE STELLE" oben. */
FEHLERFANG.registrieren();

/* ------------------------------------------------------------------ *
 * DER SERVICE WORKER (seit v0.106.0)
 *
 * Er macht die App offline-fähig und installierbar; was er tut und was
 * bewusst nicht, steht im Kopf von `sw.js` in der Projektwurzel.
 *
 * WARUM DIE ANMELDUNG HIER STEHT UND NICHT IN index.html: `index.html`
 * enthält keine einzige Zeile JavaScript — alles Ausführbare wohnt in `js\`,
 * und `app.js` ist der dokumentierte Startpunkt, an dem die App verdrahtet
 * wird. Ein Skript-Block in der HTML-Datei wäre die einzige Ausnahme im
 * ganzen Projekt und würde ausserdem am Fehlerfang vorbeilaufen.
 *
 * WARUM NICHT IN `APP.starten`: Die Anmeldung hat mit dem Aufbau der
 * Bildschirme nichts zu tun. Stolpert `APP.starten`, soll der Worker
 * trotzdem angemeldet werden — gerade dann ist ein funktionierender
 * Offline-Stand etwas wert.
 *
 * WARUM ERST BEI `load`: Vorher konkurriert die Anmeldung mit dem Laden der
 * Seite um dieselbe Leitung. Ein paar Hundert Millisekunden später kostet
 * niemanden etwas — der Worker greift ohnehin erst beim nächsten Aufruf.
 * ------------------------------------------------------------------ */

const SERVICE_WORKER = {

    anmelden() {
        /*
         * ZWEI SPERREN, BEIDE NÖTIG:
         *
         * 1. Alte Browser kennen `navigator.serviceWorker` nicht — dort ist
         *    die App eben nur online nutzbar, aber sie startet.
         * 2. `file://` — wer die `index.html` doppelklickt, hat KEINE
         *    Herkunft, und `register` wirft dort („URL protocol of script
         *    is not supported"). Zum Ausprobieren gibt es
         *    `tools\Blunderluck lokal starten.cmd`.
         */
        if (!("serviceWorker" in navigator) || location.protocol === "file:") {
            return;
        }

        /* Seit v0.151.2 (js\aktualisieren.js): Wechsel des Workers
           beobachten, beim Zurückkehren nachfragen — sonst bleibt eine
           geöffnete Seite auf der alten Version stehen. */
        const aktualisieren = (typeof AKTUALISIEREN !== "undefined") ? AKTUALISIEREN : null;
        if (aktualisieren) {
            aktualisieren.beobachten();
        }

        window.addEventListener("load", () => {
            navigator.serviceWorker.register("sw.js").then((registrierung) => {
                if (aktualisieren) {
                    aktualisieren.starten(registrierung);
                }
            }).catch((fehler) => {
                /*
                 * Ein Fehlschlag ist kein App-Fehler: Ohne Worker läuft
                 * alles weiter, nur eben ohne Offline-Betrieb. Deshalb geht
                 * er in die Konsole und NICHT in den Fehlerstreifen — der
                 * ist für Dinge da, die der Nutzer merkt.
                 */
                console.error("Service Worker nicht angemeldet:", fehler);
            });
        });
    }
};

SERVICE_WORKER.anmelden();

const APP = {

    /*
     * DER STAND DES ABGLEICHS (grüner Punkt) WOHNT SEIT WUNSCH 2
     * (v0.15.0, 24.08.2026) IN DEN EINSTELLUNGEN, nicht mehr im Kopf der
     * Seite. Gehalten wird er hier, weil er schon läuft, bevor der Tab
     * das erste Mal gezeichnet ist — die Einstellungen holen ihn sich
     * beim Zeichnen ab (EINSTELLUNGEN.statusAktualisieren).
     */
    status: "laedt",
    statusText: "Lädt",
    statusTechnik: "",

    starten() {
        /* Für den Notfall-Weg in index.html (seit v0.151.5): Die App ist
           angekommen. Steht als ERSTES — auch wenn danach etwas stolpert,
           sind die Dateien da, und ein Neuladen würde nichts retten. */
        window.BLUNDERLUCK_GESTARTET = true;

        DIALOG.aufbauen(document.getElementById("dialog"));

        /* Jeder Knopf vibriert kurz beim Antippen (UPCrew-Standard, seit
           v0.140.0) — EIN Zuhörer für die ganze Seite, js\fuehlen.js. */
        FUEHLEN.einrichten(document);

        /* Das UPCrew-Intro legt sich über alles; die App lädt darunter
           weiter, deshalb wird NICHT darauf gewartet (wie in Typoluck). */
        INTRO.zeigen(document.getElementById("intro"));

        /* Die Spielzeit (seit v0.155.0): gezählt, solange die Seite sichtbar
           ist (FORTSCHRITT_KONTO.spielzeitStarten). */
        if (typeof FORTSCHRITT_KONTO !== "undefined") {
            FORTSCHRITT_KONTO.spielzeitStarten();
        }

        /* ---- Das UPCrew-Konto (seit v0.138.0, js\konto.js) ----
           Jede Anfrage an die Datenbank trägt den Anmelde-Schlüssel; die
           Regeln lassen nur angemeldete Konten schreiben. Erkennt Firebase
           die Sitzung nicht mehr an, fragt die Anmeldung neu. */
        KONTO.einrichten(KONFIG);
        if (KONTO.aktiv()) {
            SpeicherGemeinsam.tokenGeber = () => KONTO.token();
            KONTO.beiVerloren = () => ANMELDUNG.sitzungVerloren();
        }

        /* ---- Spielerliste (Anmeldung) ---- */
        const spielerSpeicher = speicherErzeugen(
            KONFIG,
            KONFIG.speicher.pfad,
            KONFIG.speicher.lokalerSchluessel,
            (roh) => SPIELER.normalisieren(roh),
            /* Die Konten-Rückwand schreibt nur den Eintrag dieses Kontos. */
            KONTO.aktiv() ? () => KONTO.uid() : null
        );

        if (spielerSpeicher.hinweis) {
            APP.hinweisZeigen(spielerSpeicher.hinweis);
        }

        const spielerAbgleich = new Abgleich(spielerSpeicher.speicher, KONFIG.speicher, {
            beiDaten: (daten) => {
                ANMELDUNG.datenAktualisiert(daten);

                /* Das Aussehen vom Konto (seit v0.144.0): Hat der Spieler
                   auf einem anderen Gerät umgestellt, gilt es jetzt auch
                   hier (js\aussehen-konto.js). */
                if (typeof AUSSEHEN_KONTO !== "undefined") {
                    AUSSEHEN_KONTO.vomKonto();
                }

                RANGLISTE.zeichnen();

                /* Die Serien-Flamme (seit v0.151.18): Der Fortschritt vom
                   Konto kommt mit dem Spieler-Stand — auf einem neuen Gerät
                   erst nach der Anmeldung. Seit v0.157.0 werden dabei
                   alte Flammen-Schilde einmal in Münzen erstattet. */
                if (typeof FORTSCHRITT_KONTO !== "undefined" && FORTSCHRITT_KONTO.schildeErstatten) {
                    FORTSCHRITT_KONTO.schildeErstatten();
                }
                if (typeof START !== "undefined" && START.flammeAktualisieren) {
                    START.flammeAktualisieren();
                }

                /* Auch der Schach-Bereich zeigt Spieler-Daten: die Namen
                   an den Teams und in der Rangliste. Eine fremde Anfrage
                   soll ankommen, ohne dass erst ein Zug passiert. */
                if (TEAM_SCHACH.abgleich) {
                    TEAM_SCHACH.zeichnen(TEAM_SCHACH.abgleich.daten);
                }
            },
            beiStatus: (status, text, technik) => APP.statusZeigen(status, text, technik),
            leereDaten: () => SPIELER.leereDaten(),
            inhaltGleich: (a, b) => SPIELER.inhaltGleich(a, b),
            zusammenfuehren: (fremd, eigen, id) => SPIELER.zusammenfuehren(fremd, eigen, id),

            /* Die Spielerliste fragt seit v0.152.5 nur alle 15 Sekunden
               (`KONFIG.speicher.abfrageTaktMs.spieler`). */
            taktMs: () => KONFIG.speicher.abfrageTaktMs
                ? KONFIG.speicher.abfrageTaktMs.spieler : undefined
        });

        ANMELDUNG.verbinden(spielerAbgleich);
        ANMELDUNG.aufbauen(document.getElementById("anmeldung"));

        /* ---- Team Schach ---- */
        const schachSpeicher = speicherErzeugen(
            KONFIG,
            KONFIG.speicher.schachPfad,
            KONFIG.speicher.lokalerSchluesselSchach,
            (roh) => SCHACH_TAFEL.normalisieren(roh)
        );

        /* Ohne `zusammenfuehren`: Beim Schach ändert ein Zug den gemeinsamen
           Stand, es gibt keinen "eigenen Eintrag" je Person. Geschrieben wird
           deshalb nicht über den Abgleich, sondern über
           TEAM_SCHACH._sendenMitPruefung — dort wird der Stand vom Server
           geholt, der Zugzähler geprüft und nur die eine geänderte Partie
           eingesetzt. */
        const schachAbgleich = new Abgleich(schachSpeicher.speicher, KONFIG.speicher, {
            beiDaten: (tafel) => {
                TEAM_SCHACH.zeichnen(tafel);
                RANGLISTE.zeichnen();
            },
            beiStatus: () => { /* Der Kopf zeigt den Stand der Spielerliste. */ },
            leereDaten: () => SCHACH_TAFEL.leereTafel(),
            inhaltGleich: (a, b) => SCHACH_TAFEL.inhaltGleich(a, b),

            /* Der eigene Ladeweg (seit v0.114.3): Das Schach holt nicht die
               ganze Tafel, sondern über die Übersicht nur, was es braucht —
               und in einer offenen Partie nur diese (js\schach-speicher.js). */
            laden: (alles) => TEAM_SCHACH.standLaden(alles),
            brauchtAlles: () => TEAM_SCHACH.brauchtAlles(),

            /* Der Takt je Bildschirm (seit v0.152.5): 3 s mit Menschen
               und im Vorraum, 15 s gegen Bob und ohne offene Partie. */
            taktMs: () => TEAM_SCHACH.abfrageTaktMs()
        });

        TEAM_SCHACH.verbinden(schachAbgleich);

        /*
         * ---- Tabs ----
         * Die Reihenfolge der Registrierung ist die Reihenfolge in der
         * Leiste — fünf Plätze wie in der UPCrew-Absprache, seit v0.145.0
         * (Runde 4) in beiden Spielen: Aufgaben / Sammlung / Start /
         * Rangliste / Bald (Platz 5 still). Der Start in der Mitte und als
         * Erstes offen. Davor: v0.144 Aufgaben / Fähigkeiten / Start /
         * Rangliste / Anpassen, v0.9.0 bis v0.141 Fähigkeiten / Start /
         * Rangliste. Team Schach und die
         * Einstellungen sind registriert, stehen aber NICHT in der Leiste
         * (`inLeiste: false`) — sie werden über den Startbildschirm
         * betreten (Spielen-Knopf bzw. Zahnrad). Die Anmeldung
         * (anmeldung.js) hat KEINEN Tab — sie ist ein Vollbild beim Start
         * (seit v0.8.0).
         */
        /* SEIT v0.156.0 (Nutzer 28.09.2026: „in beiden spielen shop nach
           ganz links dann sammlung start herausforderung und dann ganz
           rechts rangliste"): Shop · Sammlung · Start · Aufgaben ·
           Rangliste — das Wischen folgt derselben Reihenfolge.
           SEIT v0.156.1 (Nutzer 29.09.2026, final\EINBAU-2026-09-29.md):
           Leisten-Tabs sind wieder SEITEN; als Blatt öffnen nur Bereiche
           OHNE Leisten-Knopf (Einstellungen, Verwaltung; Profil, Freunde,
           Verlauf und die Serien-Karte öffnet start.js selbst). */
        for (const tab of [EINSTELLUNGEN, VERWALTUNGS_BILDSCHIRM]) {
            tab.alsBlatt = true;
        }
        if (typeof UPCREW_BLATT !== "undefined") {
            UPCREW_BLATT.einrichten({
                ebenen: document.getElementById("ebenen"),
                haupt: document.getElementById("tab-inhalt"),
                /* Seit v0.157.0: jedes Blatt und jede Karte (Profil, Level-Pfad, Vorschau, Serie, Abzeichen-Wahl)
                   legt einen Verlaufseintrag an — die Zurück-Taste/Wischgeste schliesst das oberste statt die
                   App-Seite zu verlassen (Baustein horcht selbst auf popstate). */
                verlauf: true
            });
        }
        TABS.registrieren(SHOP);
        TABS.registrieren(SAMMLUNG);
        TABS.registrieren(START);
        TABS.registrieren(HERAUSFORDERUNGEN);
        TABS.registrieren(RANGLISTE);
        TABS.registrieren(TEAM_SCHACH);
        TABS.registrieren(EINSTELLUNGEN);
        /* Die Spieler-Verwaltung als eigener Bildschirm (Nutzer-Ansage
           27.08.2026), ebenfalls ohne Leisten-Knopf — betreten über den
           Knopf „Verwaltung" in den Einstellungen. */
        TABS.registrieren(VERWALTUNGS_BILDSCHIRM);

        /* Die gewählte Darstellung VOR dem ersten Zeichnen anwenden — sonst
           blitzt kurz das falsche Design auf (seit v0.119). */
        EINSTELLUNGEN.laden();

        /* Werkstatt `&kerbe` (seit v0.151.14, wie Typoluck 0.15.8): der
           iPhone-Streifen oben zum Ansehen am Rechner — 47 px statt
           env(safe-area-inset-top), das der Browser hier mit 0 liefert
           (css\stil.css `--oben-frei`). Nur auf dem eigenen Rechner. */
        if (typeof FREISCHALTUNG !== "undefined" && FREISCHALTUNG.werkstatt()
                && /[?&]kerbe(=|&|$)/.test(location.search || "")) {
            document.documentElement.style.setProperty("--oben-frei", "47px");
        }

        TABS.starten(
            document.getElementById("tab-leiste"),
            document.getElementById("tab-inhalt"),
            "start"
        );

        /* Die wandernde Kapsel der Leiste (seit v0.151.16, Baustein
           js\upcrew-leiste.js, Fassung „C · Gleiten + Hüpfen"; Nutzer
           27.09.2026: „die Animation beim Tab-Wechseln unten muss besser
           werden"). Sie beobachtet `aria-current` selbst — am Tab-Wechsel
           (`TABS.wechseln`) ändert sich nichts. */
        if (typeof UPCREW_LEISTE !== "undefined") {
            UPCREW_LEISTE.an(TABS.leisteEl);
        }

        /*
         * WISCHEN WECHSELT DIE TABS (seit v0.151.14, Nutzer 27.09.2026: „mache,
         * dass man in den Menüs swipen kann, um die Tabs zu wechseln").
         * Gemeinsamer Baustein js\upcrew-wischen.js; gewechselt wird über
         * denselben Weg wie ein Tipp auf die Leiste (`TABS.wechseln`), in
         * Leisten-Reihenfolge, „Bald" (Platzhalter) wird übersprungen. Nicht
         * während einer Runde (Leiste weg, `partie-spielt`), nicht in einem
         * eigenen Fenster (`runde-offen`), nicht während der Anmeldung.
         */
        if (typeof UPCREW_WISCHEN !== "undefined") {
            UPCREW_WISCHEN.an(TABS.inhaltEl, {
                tabs: () => TABS.liste.filter((tab) => tab.inLeiste !== false)
                    .map((tab) => (tab.platzhalter ? { id: tab.id, still: true } : tab.id)),
                aktiv: () => TABS.aktiveId,
                wechseln: (id) => TABS.wechseln(id),
                erlaubt: () => !document.body.classList.contains("partie-spielt")
                    && !document.body.classList.contains("runde-offen")
                    && !(typeof ANMELDUNG !== "undefined" && ANMELDUNG.anmeldenLaeuft),
                sperren: ".vorschau, .brett, .bild-leiste, .karten-leiste",
                bewegen: () => TABS.inhaltEl.querySelector(".tab-bereich:not([hidden])")
            });
            /* Seit v0.156.1 nicht mehr auf #ebenen: ein Blatt ist kein Tab. */
        }

        /* Den Wunsch-Knopf hängt seit v0.25.0 die Karte „Über die App" in
           den Einstellungen selbst ein (js\einstellungen.js) — der
           Kopfbalken, in dem er hing, gibt es nicht mehr. */

        /* Nach jeder Anmeldung entscheidet der Wiedereinstieg (start.js),
           ob es auf den Start geht oder direkt in die eigene laufende
           Partie (Entwurf, Abschnitt 3.2). */
        ANMELDUNG.beiAngemeldet = () => {
            /* Erst jetzt steht fest, WESSEN beendete Partien in die Tafel
               gehören (Verlauf, Abschluss) — der Ladeweg holt sie nach
               (seit v0.114.3). Der Wiedereinstieg braucht darauf nicht zu
               warten: Laufende Partien sind immer geladen. */
            schachAbgleich.vollNachladen();

            /* Ein Einladungslink (`?code=…`, seit v0.117.0) geht vor: Wer
               ihn antippt, will in DIESE Runde — nicht in eine eigene
               laufende. Ohne Code läuft der Wiedereinstieg wie bisher. */
            if (TEAM_SCHACH.einladungAusAdresseAnnehmen()) {
                return;
            }
            START.wiedereinstieg();

            /* Ein Gast wird hin und wieder gefragt, ob er seinen Spielstand
               sichern will (seit v0.138.0, anmeldung-konto.js). */
            ANMELDUNG.gastErinnern();
        };

        /* Angemeldet wird erst, wenn BEIDE Stände da sind: die
           Spielerliste für die Anmeldung selbst, die Schach-Tafel für die
           Suche nach der eigenen laufenden Partie. */
        Promise.all([
            spielerAbgleich.starten(),
            schachAbgleich.starten()
        ]).then(([spielerGeladen]) => {
            /*
             * NUR FRAGEN, WENN WIR AUCH GESCHAUT HABEN (seit v0.89.0).
             *
             * `starten` wirft bei einem Ladefehler nicht — die App soll ja
             * auch ohne Netz hochkommen —, sondern meldet ihn und liefert
             * seit v0.89.0 `false`. Ohne diese Unterscheidung liefe hier
             * `anmelden()` mit dem LEEREN Anfangsstand an: Die eigene
             * Kennung steht dort nicht, das Anmelde-Vollbild erscheint, und
             * wer dann ein neues Konto anlegt, hat zwei. Genau das wurde am
             * 27.08.2026 gemeldet („bin in meinen Account nicht wieder
             * reingekommen").
             *
             * Schlug das Laden fehl, wird hier NICHT gefragt: Die
             * regelmässige Abfrage holt den Stand nach, und
             * `ANMELDUNG.datenAktualisiert` meldet das Gerät dann von selbst
             * an. Wer noch nie angemeldet war, bekommt sein Vollbild
             * ebenfalls dort — sobald wirklich feststeht, dass es ihn nicht
             * gibt.
             */
            if (spielerGeladen) {
                ANMELDUNG.anmelden();
            }
        });
    },

    /*
     * status ist einer von: laedt, bereit, schreibt, fehler.
     *
     * Gemerkt wird immer; gezeigt wird er nur, wenn die Einstellungen
     * gerade offen sind (seit Wunsch 2). Wer sie öffnet, sieht den
     * aktuellen Stand, weil die Karte ihn beim Zeichnen abholt.
     */
    statusZeigen(status, text, technik) {
        APP.status = status;
        APP.statusText = text;
        APP.statusTechnik = technik || "";

        if (typeof EINSTELLUNGEN !== "undefined"
                && EINSTELLUNGEN.statusAktualisieren) {
            EINSTELLUNGEN.statusAktualisieren();
        }
    },

    hinweisZeigen(text) {
        const balken = document.getElementById("hinweis");
        balken.textContent = text;
        balken.hidden = false;
    }
};

document.addEventListener("DOMContentLoaded", APP.starten);
