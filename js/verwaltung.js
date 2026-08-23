/*
 * verwaltung.js — eine einzige Stelle für die Frage "darf der das?".
 *
 * Es gibt Handlungen, die nicht nur den eigenen Eintrag treffen, sondern den
 * Stand für ALLE: eine neue Runde starten, einen Mitspieler entfernen, eine
 * Partie oder einen Raum löschen, die Wortbibliothek ändern. Ein Fehlgriff ist
 * dabei nicht rückgängig zu machen, deshalb muss man sich vorher ausweisen.
 *
 * WARUM DIESE DATEI
 * Die Abfrage stand ab v0.6 dreimal fast wortgleich im Code (Würfel-Quizz zwei
 * Mal, Imposter ein Mal). Mit dem Passwortschutz fürs Löschen (v3.3) wären es
 * fünf Kopien geworden — und fünf Orte, an denen jemand vergisst, `ICH` zu
 * setzen oder den Abbruch zu behandeln. Jetzt gilt: **Wer etwas schützen will,
 * ruft `VERWALTUNG.verlangen(...)` auf und prüft das Ergebnis.**
 *
 * WAS DER SCHUTZ LEISTET UND WAS NICHT
 * Er verhindert den Fehlgriff und das beiläufige Löschen durch jemanden, der
 * das Passwort nicht hat. Er verhindert NICHT den entschlossenen Mitspieler:
 * Die Datenbank ist offen, wer die Konsole öffnet, kann schreiben, was er will.
 * Dieselbe ehrliche Grenze wie bei der PIN und beim Würfel-Siegel; die
 * Begründung steht in docs\DECISIONS.md.
 *
 * Im Quelltext steht nur die PRÜFSUMME des Passworts (`KONFIG.verwaltung`),
 * nie das Passwort selbst.
 */

const VERWALTUNG = {

    /*
     * Fragt das Verwaltungs-Passwort ab und liefert true, wenn es stimmt.
     *
     *     titel   Überschrift des Dialogs, z. B. "Raum löschen"
     *     grund   Ein Satz, WARUM gefragt wird — nicht, dass gefragt wird.
     *             Der Nutzer soll wissen, was auf dem Spiel steht.
     *
     * Wer die Verwaltung ohnehin offen hat, wird nicht noch einmal gefragt:
     * Sonst müsste man beim Aufräumen für jeden Raum einzeln tippen.
     */
    async verlangen(titel, grund) {
        if (ICH.verwaltungAktiv()) {
            return true;
        }

        const passwort = await DIALOG.zahlen(
            titel,
            grund,
            KONFIG.verwaltung.passwortStellen,
            "Weiter",
            true
        );

        /* Abgebrochen — das ist kein Fehler und bekommt deshalb auch keine
           Meldung. */
        if (!passwort) {
            return false;
        }

        const richtig = await VERSIEGELUNG.verwaltungPruefen(
            passwort, KONFIG.verwaltung.pruefwert);

        if (!richtig) {
            await DIALOG.hinweis("Passwort falsch",
                "Es bleibt alles, wie es ist.");
            return false;
        }

        /*
         * Ab jetzt gilt die Verwaltung auf diesem Gerät als offen. Beendet wird
         * sie über den Knopf im Würfel-Quizz — dort ist auch der Ort, an dem
         * man sie sichtbar wieder schliesst.
         */
        ICH.verwaltungSetzen(true);
        return true;
    }
};
