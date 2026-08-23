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

    statusEl: null,
    statusTextEl: null,

    starten() {
        DIALOG.aufbauen(document.getElementById("dialog"));

        document.getElementById("app-version").textContent = "v" + KONFIG.APP_VERSION;

        APP.statusEl = document.getElementById("status");
        APP.statusTextEl = document.getElementById("status-text");

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
            },
            beiStatus: (status, text) => APP.statusZeigen(status, text),
            leereDaten: () => SPIELER.leereDaten(),
            inhaltGleich: (a, b) => SPIELER.inhaltGleich(a, b),
            zusammenfuehren: (fremd, eigen, id) => SPIELER.zusammenfuehren(fremd, eigen, id)
        });

        ANMELDUNG.verbinden(spielerAbgleich);

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
         * Leiste. Die Anmeldung (anmeldung.js) hat KEINEN Tab — sie läuft in
         * Dialogen beim Start; Profil und Verwaltung hängen im Tab
         * Einstellungen.
         */
        TABS.registrieren(TEAM_SCHACH);
        TABS.registrieren(RANGLISTE);
        TABS.registrieren(EINSTELLUNGEN);

        /* Die gewählte Darstellung VOR dem ersten Zeichnen anwenden — sonst
           blitzt kurz das falsche Design auf (seit v0.119). */
        EINSTELLUNGEN.laden();

        TABS.starten(
            document.getElementById("tab-leiste"),
            document.getElementById("tab-inhalt")
        );

        /* Der Wunsch-Knopf im Kopf — nach den Tabs, weil er den offenen Tab
           als Herkunft mitschickt. */
        WUNSCH.aufbauen(document.getElementById("wunsch-platz"));

        spielerAbgleich.starten().then(() => {
            ANMELDUNG.anmelden();
        });
        schachAbgleich.starten();
    },

    /* status ist einer von: laedt, bereit, schreibt, fehler */
    statusZeigen(status, text) {
        if (!APP.statusEl) {
            return;
        }
        APP.statusEl.dataset.status = status;
        APP.statusTextEl.textContent = text;
    },

    hinweisZeigen(text) {
        const balken = document.getElementById("hinweis");
        balken.textContent = text;
        balken.hidden = false;
    }
};

document.addEventListener("DOMContentLoaded", APP.starten);
