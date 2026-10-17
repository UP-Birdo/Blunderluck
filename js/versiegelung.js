/*
 * versiegelung.js — Prüfsummen für Spieler-PIN und Würfel-Siegel.
 *
 * Bis v0.167.2 auch für das Verwaltungs-Passwort (`verwaltungPruefen` mit
 * eigener Admin-Zutat) — entfernt mit v0.168.0, die Verwaltung hängt allein
 * an der Admin-Rolle des UPCrew-Kontos (js\verwaltung.js). Der Test wacht,
 * dass die alte Zutat hier nicht wieder auftaucht — auch nicht im Kommentar.
 *
 * Die gemeinsame Ablage liegt in einer öffentlich erreichbaren Datenbank und
 * der Quelltext auf GitHub. Deshalb steht keine Zahl im Klartext irgendwo:
 * Gespeichert wird immer nur eine SHA-256-Prüfsumme (bei der PIN mit einem
 * offenen Zufallssalz, damit jedes Gerät prüfen kann).
 */

const VERSIEGELUNG = {

    /* Steht die benötigte Krypto-Funktion zur Verfügung?
       Browser bieten sie nur in sicherem Zusammenhang an (HTTPS oder
       localhost) — auf GitHub Pages und beim lokalen Testen also immer. */
    verfuegbar() {
        const krypto = (typeof globalThis !== "undefined") ? globalThis.crypto : null;
        return !!(krypto && krypto.subtle && typeof krypto.subtle.digest === "function");
    },

    /* Zufälliges Salz als Hex-Zeichenkette (16 Byte). */
    salzErzeugen() {
        const krypto = globalThis.crypto;
        const bytes = new Uint8Array(16);
        krypto.getRandomValues(bytes);
        return VERSIEGELUNG._alsHex(bytes);
    },

    /* ---------------------------------------------------------------- *
     * Zahlenwörter (Spieler-PIN; bis v0.167.2 auch Verwaltungs-Passwort)
     *
     * Dasselbe Verfahren, anderer Zweck: Gespeichert wird nie die Zahl selbst,
     * sondern nur ihre Prüfsumme. Wer die Datenbank oder den Quelltext liest,
     * findet keine Zahl zum Abtippen.
     *
     * Grenze, die man kennen muss: Vier Ziffern sind nur zehntausend
     * Möglichkeiten. Wer Prüfsumme und Salz hat und sich hinsetzt, probiert sie
     * mit einem kleinen Programm in Sekunden durch. Das ist ein Türschloss
     * unter Freunden, kein Tresor — es hält jemanden ab, der mal eben schauen
     * will, mehr nicht. Siehe docs\DECISIONS.md.
     * ---------------------------------------------------------------- */

    /* Prüfsumme einer Spieler-PIN. Das Salz steht offen in der Datenbank,
       damit jedes Gerät die PIN prüfen kann. */
    async pinPruefwertBilden(pin, salz) {
        if (!VERSIEGELUNG.verfuegbar()) {
            return "";
        }
        /*
         * ACHTUNG, DAS „blunderluck" HIER IST KEIN NAME, SONDERN EINE ZUTAT.
         *
         * Diese Zeichenketten gehen in die Prüfsumme ein und dürfen ab der
         * ersten echten Runde NIE mehr angepasst werden. Wer hier etwas
         * ändert, macht auf einen Schlag jede gespeicherte Spieler-PIN
         * ungültig — und der Fehler fiele erst beim nächsten Anmelden auf.
         *
         * Dasselbe gilt für die Speicherpfade in `konfig.js`. Die Lehre
         * stammt aus dem Quizz (dort v0.89 umbenannt, v0.90 zurückgebaut):
         * Quizz-Doku, `entschieden-ab-v0-41.md`, „Die Schreibweise Quizz
         * bleibt". Beim Herauslösen nach Blunderluck (08/2026) wurden die
         * Zutaten EINMALIG neu benannt — erlaubt, weil die neue App mit
         * leerer Datenbank startet und es noch nichts zu entwerten gab.
         */
        return VERSIEGELUNG._summeBilden("blunderluck-pin|" + String(pin || "") + "|" + String(salz || ""));
    },

    async pinPruefen(pin, salz, pruefwert) {
        if (!pruefwert) {
            return false;
        }
        const gerechnet = await VERSIEGELUNG.pinPruefwertBilden(pin, salz);
        return gerechnet !== "" && gerechnet === pruefwert;
    },

    /* ---------------------------------------------------------------- *
     * Innereien
     * ---------------------------------------------------------------- */

    /* SHA-256 über eine beliebige Zeichenkette, als Hex. */
    async _summeBilden(text) {
        const daten = new TextEncoder().encode(text);
        const summe = await globalThis.crypto.subtle.digest("SHA-256", daten);
        return VERSIEGELUNG._alsHex(new Uint8Array(summe));
    },

    _alsHex(bytes) {
        let text = "";
        for (const byte of bytes) {
            text += byte.toString(16).padStart(2, "0");
        }
        return text;
    }
};

/* Damit die Regressionstests die Datei außerhalb des Browsers laden können. */
if (typeof module !== "undefined" && module.exports) {
    module.exports = VERSIEGELUNG;
}
