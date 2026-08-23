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
 */

const APP = {

    /*
     * DER STAND DES ABGLEICHS (grüner Punkt) WOHNT SEIT WUNSCH 2
     * (v0.15.0, 24.08.2026) IN DEN EINSTELLUNGEN, nicht mehr im Kopf der
     * Seite. Gehalten wird er hier, weil er schon läuft, bevor der Tab
     * das erste Mal gezeichnet ist — die Einstellungen holen ihn sich
     * beim Zeichnen ab (EINSTELLUNGEN.statusAktualisieren).
     */
    status: "laedt",
    statusText: "Wird geladen …",

    starten() {
        DIALOG.aufbauen(document.getElementById("dialog"));

        document.getElementById("app-version").textContent = "v" + KONFIG.APP_VERSION;

        /* ---- Spielerliste (Anmeldung) ---- */
        const spielerSpeicher = speicherErzeugen(
            KONFIG,
            KONFIG.speicher.pfad,
            KONFIG.speicher.lokalerSchluessel,
            (roh) => SPIELER.normalisieren(roh)
        );

        if (spielerSpeicher.hinweis) {
            APP.hinweisZeigen(spielerSpeicher.hinweis);
        }

        const spielerAbgleich = new Abgleich(spielerSpeicher.speicher, KONFIG.speicher, {
            beiDaten: (daten) => {
                ANMELDUNG.datenAktualisiert(daten);
                RANGLISTE.zeichnen();

                /* Auch der Schach-Bereich zeigt Spieler-Daten: Namen und —
                   seit v0.11.0 — die Freunde-Karte auf dem
                   Zwischenbildschirm. Eine fremde Anfrage soll erscheinen,
                   ohne dass erst ein Zug passiert. */
                if (TEAM_SCHACH.abgleich) {
                    TEAM_SCHACH.zeichnen(TEAM_SCHACH.abgleich.daten);
                }
            },
            beiStatus: (status, text) => APP.statusZeigen(status, text),
            leereDaten: () => SPIELER.leereDaten(),
            inhaltGleich: (a, b) => SPIELER.inhaltGleich(a, b),
            zusammenfuehren: (fremd, eigen, id) => SPIELER.zusammenfuehren(fremd, eigen, id)
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
            inhaltGleich: (a, b) => SCHACH_TAFEL.inhaltGleich(a, b)
        });

        TEAM_SCHACH.verbinden(schachAbgleich);

        /*
         * ---- Tabs ----
         * Die Reihenfolge der Registrierung ist die Reihenfolge in der
         * Leiste (seit v0.9.0: Fähigkeiten / Start / Rangliste, der Start
         * in der Mitte und als Erstes offen). Team Schach und die
         * Einstellungen sind registriert, stehen aber NICHT in der Leiste
         * (`inLeiste: false`) — sie werden über den Startbildschirm
         * betreten (Spielen-Knopf bzw. Zahnrad). Die Anmeldung
         * (anmeldung.js) hat KEINEN Tab — sie ist ein Vollbild beim Start
         * (seit v0.8.0).
         */
        TABS.registrieren(FAEHIGKEITEN);
        TABS.registrieren(START);
        TABS.registrieren(RANGLISTE);
        TABS.registrieren(TEAM_SCHACH);
        TABS.registrieren(EINSTELLUNGEN);

        /* Die gewählte Darstellung VOR dem ersten Zeichnen anwenden — sonst
           blitzt kurz das falsche Design auf (seit v0.119). */
        EINSTELLUNGEN.laden();

        TABS.starten(
            document.getElementById("tab-leiste"),
            document.getElementById("tab-inhalt"),
            "start"
        );

        /* Der Wunsch-Knopf im Kopf — nach den Tabs, weil er den offenen Tab
           als Herkunft mitschickt. */
        WUNSCH.aufbauen(document.getElementById("wunsch-platz"));

        /* Nach jeder Anmeldung entscheidet der Wiedereinstieg (start.js),
           ob es auf den Start geht oder direkt in die eigene laufende
           Partie (Entwurf, Abschnitt 3.2). */
        ANMELDUNG.beiAngemeldet = () => START.wiedereinstieg();

        /* Angemeldet wird erst, wenn BEIDE Stände da sind: die
           Spielerliste für die Anmeldung selbst, die Schach-Tafel für die
           Suche nach der eigenen laufenden Partie. */
        Promise.all([
            spielerAbgleich.starten(),
            schachAbgleich.starten()
        ]).then(() => {
            ANMELDUNG.anmelden();
        });
    },

    /*
     * status ist einer von: laedt, bereit, schreibt, fehler.
     *
     * Gemerkt wird immer; gezeigt wird er nur, wenn die Einstellungen
     * gerade offen sind (seit Wunsch 2). Wer sie öffnet, sieht den
     * aktuellen Stand, weil die Karte ihn beim Zeichnen abholt.
     */
    statusZeigen(status, text) {
        APP.status = status;
        APP.statusText = text;

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
