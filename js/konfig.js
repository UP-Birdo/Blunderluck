/*
 * konfig.js — die einzige Datei, die von Hand angepasst wird.
 *
 * Hier stehen Version und Speicher-Einstellungen. Wer die App auf GitHub Pages
 * stellt, trägt unten die Adresse der Firebase-Datenbank ein — mehr ist nicht
 * nötig. Ohne Adresse läuft die App vollständig, speichert dann aber nur lokal
 * im Browser des jeweiligen Besuchers.
 *
 * Hinweis zu Bezeichnern: Namen im Code bleiben ohne Umlaute (wuerfel, aendern),
 * Kommentare und alle sichtbaren Texte werden korrekt deutsch geschrieben.
 * Siehe docs\ARCHITECTURE.md, Abschnitt Code-Konventionen.
 */

const KONFIG = {

    /* Version der App (SemVer: 0.MINOR.PATCH — die 0 vorne heisst "noch in
       Entwicklung", 1.0.0 erst bei erfuellten Fertig-Kriterien der ROADMAP).
       Wird im Kopf angezeigt und muss zu CHANGELOG.md passen. */
    APP_VERSION: "0.83.2",

    speicher: {

        /* "lokal"     — jeder Besucher hat seine eigene Tabelle (Browser-Speicher).
           "gemeinsam" — alle Besucher sehen dieselbe Tabelle (Firebase).
           Steht hier "gemeinsam", ist aber keine Basis-Adresse hinterlegt,
           fällt die App automatisch auf "lokal" zurück und sagt es im Kopf. */
        modus: "gemeinsam",

        /* Basis-Adresse der Firebase Realtime Database, OHNE Schrägstrich am
           Ende. Angelegt am 23.08.2026, Region europe-west1 (Belgien — die
           einzige EU-Region der Realtime Database). Die Adresse ist kein
           Geheimnis: Sie steht ohnehin im Quelltext jeder ausgelieferten
           Seite. Anleitung und Regeln: docs\DEPLOYMENT.md, Abschnitt 2. */
        firebaseBasis: "https://blunderluck-8b7f0-default-rtdb.europe-west1.firebasedatabase.app",

        /* Ablage-Pfade innerhalb der Datenbank. Jeder Stand hat seinen eigenen,
           damit sich die Teile nicht ins Gehege kommen.
           ACHTUNG: Für jeden Pfad braucht es in den Firebase-Regeln einen
           eigenen Eintrag — siehe docs\DEPLOYMENT.md, Abschnitt 2.
           "spieler" ist die Spielerliste (Namen, PIN-Prüfsummen) —
           kein Spielstand, siehe js\spieler.js. */
        pfad: "spieler",
        schachPfad: "team-schach",

        /* Wie oft (in Millisekunden) nach fremden Änderungen gefragt wird.
           Gefragt wird nur, solange die Seite im Vordergrund ist — im
           Hintergrund ruht die Abfrage, damit sie unterwegs kein Datenvolumen
           verbraucht. Wer die Runde träger, aber noch sparsamer will, setzt
           hier einen größeren Wert (z. B. 10000 für zehn Sekunden). */
        abfrageIntervallMs: 3000,

        /* Wie lange (in Millisekunden) nach der letzten Eingabe gewartet wird,
           bevor gespeichert wird. Verhindert einen Schreibvorgang je Tastendruck. */
        schreibVerzoegerungMs: 500,

        /* Schlüssel im Browser-Speicher für den lokalen Modus, je Stand einer. */
        lokalerSchluessel: "blunderluck.spieler",
        lokalerSchluesselSchach: "blunderluck.team-schach"
    },

    verwaltung: {

        /*
         * Prüfsumme des Verwaltungs-Passworts (SHA-256 über
         * "blunderluck-admin|<passwort>"). Das Passwort selbst steht bewusst
         * NIRGENDWO in den Dateien — diese Seite ist öffentlich, jeder könnte
         * es sonst abschreiben.
         *
         * Gesetzt am 23.08.2026. Das Passwort selbst kennt nur der Nutzer —
         * es wurde nie übermittelt, gerechnet hat er die Prüfsumme selbst.
         *
         * Passwort ändern: In PowerShell die neue Prüfsumme rechnen und den
         * Wert unten ersetzen. Der Text vor dem Passwort gehört dazu.
         *
         *     $text  = "blunderluck-admin|<neues Passwort>"
         *     $bytes = [System.Text.Encoding]::UTF8.GetBytes($text)
         *     $summe = [System.Security.Cryptography.SHA256]::Create().ComputeHash($bytes)
         *     ($summe | ForEach-Object { $_.ToString("x2") }) -join ""
         *
         * Was die Verwaltung darf, steht in docs\ARCHITECTURE.md; was sie NICHT
         * leistet (eine sechsstellige Zahl ist durchprobierbar), in
         * docs\DECISIONS.md.
         */
        pruefwert: "da9675146c86f5988647847c5062a24eea0cdb36d7a309325a82027ef88f6703",

        /* Wie viele Ziffern das Verwaltungs-Passwort hat. Muss zur Prüfsumme
           oben passen, sonst lässt sich der Dialog nicht bestätigen.
           (Das SPIELER-Passwort ist keine Ziffernfolge mehr: Seine Regel —
           4 bis 8 Zeichen — wohnt seit v0.7.0 im Modell, js\spieler.js.) */
        passwortStellen: 6
    }
};
