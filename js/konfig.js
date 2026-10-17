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
    APP_VERSION: "0.173.1",

    /*
     * DER FREIGABE-KANAL (seit v0.171.0, Baustein js\freigabe.js, Einbau:
     * UPCrew bausteine\EINBAU-FREIGABE.md). Jede sichtbare Neuerung hat hier
     * einen Namen und eine Stufe:
     *     "alle"   jeder (auch Gast)
     *     "beta"   nur Konten mit Rolle „beta“ und Admins (UP#Plus zählt mit)
     *     "admin"  nur Admins
     *     "aus"    gebaut, niemand sieht es
     * Bildschirme fragen nur `UPCREW_FREIGABE.darf(name)`. Ein Name, der hier
     * fehlt, heisst „nein“ (tests\test-freigabe-einbau.js hält Code und
     * Tabelle gleich). Die Rolle „beta“ vergibt UP#Plus in der Verwaltung
     * (höchstens 10 Konten).
     * REGEL FÜR KÜNFTIGE LÄUFE: sichtbar Neues kommt als "beta" (nie direkt
     * "alle"); Freigabe für alle = hier auf "alle" + Version hochzählen.
     * Startbelegung v0.171.0: die sichtbaren Neuerungen aus v0.170.0, die
     * heute alle sehen, stehen auf "alle" — Notfall-Schalter, nichts
     * verschwindet. Nicht in der Tabelle: der Vorraum-Umbruch (v0.169.0,
     * reines CSS, behebt waagrechtes Rollen) und Anpassen wie in allen
     * Crew-Apps (gemeinsamer Baustein, gilt in allen Apps gleich).
     */
    FREIGABEN: {
        "xp-bis-level": "alle",         /* v0.170.0 „noch N XP bis Level L+1“ am Abschluss */
        "turm-zu-wenige-zuege": "alle", /* v0.170.0 „zu wenige Züge · ab 4 Zügen“ in der Wertung */
        "nochmal": "alle",              /* v0.170.0 „Nochmal“ nach freier Bob-Partie (aus: „Neu aufstellen“ wie bis v0.169.0) */
        "verwaltung": "alle"            /* v0.172.0 Verwaltung aus dem Baustein (gab es schon; sieht trotzdem nur ein Admin) */
    },

    speicher: {

        /* "lokal"     — jeder Besucher hat seine eigene Tabelle (Browser-Speicher).
           "gemeinsam" — alle Besucher sehen dieselbe Tabelle (Firebase).
           Steht hier "gemeinsam", ist aber keine Basis-Adresse hinterlegt,
           fällt die App automatisch auf "lokal" zurück und sagt es im Kopf. */
        modus: "gemeinsam",

        /* Basis-Adresse der Firebase Realtime Database, OHNE Schrägstrich am
           Ende. SEIT v0.138.0 DIE UPCREW-DATENBANK (Nutzer-Entscheidung
           25.09.2026: „nur noch EINE Datenbank"): Die Konten gehören dem
           Studio und gelten in jedem UPCrew-Spiel, Blunderluck hat daneben
           seinen eigenen Bereich. Region europe-west1 (Belgien). Die Adresse
           ist kein Geheimnis: Sie steht ohnehin im Quelltext jeder
           ausgelieferten Seite. Regeln: SICHERHEIT.md (Hauptordner). Bis
           v0.137.0 stand hier die eigene Blunderluck-Datenbank; bis
           v0.167.2 wurde sie noch beim Umzug eines Kontos gelesen
           (`konto.altBasis`), seit v0.168.0 ist der Umzugsweg abgeschaltet. */
        firebaseBasis: "https://upcrew-7a29d-default-rtdb.europe-west1.firebasedatabase.app",

        /* Ablage-Pfade innerhalb der Datenbank. Jeder Stand hat seinen eigenen,
           damit sich die Teile nicht ins Gehege kommen.
           ACHTUNG: Für jeden Pfad braucht es in den Firebase-Regeln einen
           eigenen Eintrag — siehe SICHERHEIT.md.
           "spieler" sind die UPCrew-Konten, GETEILT mit allen UPCrew-Spielen
           (seit v0.138.0 je Konto ein Knoten, js\speicher.js,
           SpeicherKonten) — kein Spielstand, siehe js\spieler.js.
           Das Schach liegt im Bereich, der nur Blunderluck gehört. */
        pfad: "spieler",
        schachPfad: "blunderluck/team-schach",

        /* Wie oft (in Millisekunden) nach fremden Änderungen gefragt wird.
           Gefragt wird nur, solange die Seite im Vordergrund ist — im
           Hintergrund ruht die Abfrage, damit sie unterwegs kein Datenvolumen
           verbraucht. Wer die Runde träger, aber noch sparsamer will, setzt
           hier einen größeren Wert (z. B. 10000 für zehn Sekunden). */
        abfrageIntervallMs: 3000,

        /* Der Takt JE BILDSCHIRM (seit v0.152.5, `Abgleich.taktSchlag`):
           Wo ein Mensch auf einen Zug wartet, alle 3 Sekunden; wo nur Bob
           zieht oder niemand auf etwas wartet, alle 15. Der Grundtakt oben
           ist das kürzeste, was hier wirken kann. */
        abfrageTaktMs: {
            partie: 3000,       // offene Partie mit Menschen (auch der Abschluss)
            vorraum: 3000,      // eigene Runde, die noch nicht läuft
            bob: 15000,         // Partie gegen Bob, ohne weitere Menschen
            start: 15000,       // keine Partie offen (Start, Sammlung, Rangliste …)
            spieler: 15000      // die Spielerliste
        },

        /* Wie lange (in Millisekunden) nach der letzten Eingabe gewartet wird,
           bevor gespeichert wird. Verhindert einen Schreibvorgang je Tastendruck. */
        schreibVerzoegerungMs: 500,

        /* Schlüssel im Browser-Speicher für den lokalen Modus, je Stand einer. */
        lokalerSchluessel: "blunderluck.spieler",
        lokalerSchluesselSchach: "blunderluck.team-schach"
    },

    /*
     * DAS UPCREW-KONTO (seit v0.138.0, js\konto.js): Anmeldung über
     * Firebase Authentication, Projekt UPCrew. Beide Werte sind KEIN
     * Geheimnis — sie stehen bei jeder Firebase-Web-App im Quelltext;
     * geschützt wird über die Datenbank-Regeln (und später App Check).
     * Eingetragen vom Nutzer am 25.09.2026.
     */
    konto: {
        apiKey: "AIzaSyC-oWrTMnUaUbb7Sb14TvzfdYcRIOIYcmU",
        appId: "1:355067454774:web:c97aeb6b21445897a53f97",

        /* Die erfundene Adresse: `<kennung>@<domain>` — nie zustellbar,
           ohne Namen. UNANTASTBAR, sobald das erste Konto besteht. */
        domain: "konten.upcrew.invalid",

        /*
         * DIE ALTE BLUNDERLUCK-DATENBANK (`blunderluck-8b7f0`) — bis v0.167.2
         * der Umzugsweg: Wer sich anmeldete und noch kein UPCrew-Konto hatte,
         * wurde dort gesucht und sein Konto übernommen (anmeldung-konto.js).
         * SEIT v0.168.0 LEER (Sicherheits-Befund 13.10.2026, Punkt B1): Die
         * alte Datenbank wird vom Nutzer geschlossen; mit leerem Wert fällt
         * der Umzugsweg still weg, und die App spricht nur noch mit der
         * UPCrew-Datenbank (auch die Browser-Sperre in index.html nennt nur
         * noch diese). Der Schlüssel bleibt stehen, weil anmeldung-konto.js,
         * tools\Partien-Umziehen.ps1 und die Tests ihn lesen — „leer“ ist
         * dort der vorgesehene Zustand.
         */
        altBasis: "",
        altPfad: "spieler"
    }

    /*
     * KEIN VERWALTUNGS-PASSWORT MEHR (seit v0.168.0, Sicherheits-Befund
     * 13.10.2026, Punkt A4). Bis v0.167.2 stand hier `verwaltung.pruefwert`,
     * eine ungesalzene SHA-256-Prüfsumme über sechs Ziffern — aus dem
     * öffentlichen Quelltext in Sekunden rückrechenbar. Die Verwaltung hängt
     * seit v0.138.0 an der Rolle „admin“ des UPCrew-Kontos, die die
     * Datenbank-Regeln serverseitig prüfen (js\ich.js `verwaltungAktiv`);
     * der Prüfwert öffnete nur noch die Oberfläche ohne Konto und war damit
     * überflüssig und irreführend.
     */
};

/* Die Freigabe-Tabelle so früh wie möglich melden (seit v0.171.0, wie
   Typoluck 0.38.0): js\freigabe.js lädt in index.html VOR dieser Datei, damit
   jeder Bildschirm von Anfang an die Tabelle kennt. APP.starten meldet sie
   noch einmal (Einbau-Anleitung). */
if (typeof UPCREW_FREIGABE !== "undefined" && UPCREW_FREIGABE && typeof UPCREW_FREIGABE.tabelle === "function") {
    UPCREW_FREIGABE.tabelle(KONFIG.FREIGABEN);
}
