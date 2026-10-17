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
 * Seit v0.138.0 entscheidet die ROLLE des angemeldeten UPCrew-Kontos (Admin
 * oder UP#Plus, `ICH.verwaltungAktiv`), und dieselbe Rolle prüfen die Regeln
 * der Datenbank serverseitig — nur dort liegt die echte Grenze. Jede Sperre
 * in einer reinen Browser-App ist für den entschlossenen Mitspieler nur
 * Deko; sie verhindert den Fehlgriff und das beiläufige Löschen.
 *
 * BIS v0.167.2 gab es ohne Konto einen zweiten Weg: ein sechsstelliges
 * Verwaltungs-Passwort, dessen ungesalzene Prüfsumme in js\konfig.js stand.
 * Aus dem öffentlichen Quelltext war sie in Sekunden rückrechenbar und gab
 * nichts frei, was die Regeln nicht ohnehin verweigern — entfernt mit
 * v0.168.0 (Sicherheits-Befund 13.10.2026, Punkt A4). Ohne UPCrew-Konto
 * gibt es seitdem keine Verwaltung.
 */

const VERWALTUNG = {

    /*
     * Prüft, ob die Verwaltung offen ist, und liefert true, wenn ja. Sonst
     * zeigt sie einen Hinweis und liefert false.
     *
     *     titel   Überschrift des Hinweises, z. B. "Raum löschen"
     *     grund   Ein Satz, WARUM gefragt wird — nicht, dass gefragt wird.
     *             Der Nutzer soll wissen, was auf dem Spiel steht.
     *
     * Wer die Verwaltung ohnehin offen hat, sieht keinen Hinweis: Sonst
     * müsste man beim Aufräumen für jeden Raum einzeln bestätigen.
     */
    async verlangen(titel, grund) {
        if (ICH.verwaltungAktiv()) {
            return true;
        }

        /* Mit UPCrew-Konto zählt die Rolle: Wer nicht Admin ist, bekommt
           nur den Hinweis. */
        if (KONTO.aktiv()) {
            await DIALOG.hinweis(titel, "Rolle Admin nötig");
            return false;
        }

        /* Ohne Konto gibt es keinen Weg hinein — das Verwaltungs-Passwort
           ist seit v0.168.0 abgeschafft. `grund` bleibt der Satz, der sagt,
           was auf dem Spiel steht. */
        await DIALOG.hinweis(titel,
            "Anmeldung mit Admin-Rolle nötig" + (grund ? " · " + grund : ""));
        return false;
    }
};
