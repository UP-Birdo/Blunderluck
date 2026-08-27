/*
 * wunsch.js — der Wunsch-Knopf im Kopf der Seite.
 *
 * Der Weg eines Wunsches, vom Einfall bis zur Umsetzung:
 *
 *     App  ->  vorbefülltes GitHub-Formular  ->  Eintrag im Repo
 *          ->  tools\Wuensche-Abholen.ps1  ->  TODO.md "## Anfragen"
 *          ->  Nutzer schreibt "bestätigt" dahinter  ->  ROADMAP.md
 *
 * Dasselbe Muster wie im Lernheft-Projekt. Warum über ein Formular und nicht
 * über die GitHub-Schnittstelle: Ein Schreib-Token müsste dafür in der
 * öffentlichen Seite stehen — jeder Besucher könnte damit ins Repo schreiben.
 * Der Umweg über das Formular kostet einen Klick und braucht kein Geheimnis.
 */

const WUNSCH = {

    KONTO: "up-birdo",
    REPO: "Blunderluck",

    /* Hängt den Knopf in den Kopf der Seite. */
    aufbauen(behaelter) {
        if (!behaelter) {
            return;
        }

        const knopf = document.createElement("button");
        knopf.type = "button";
        knopf.className = "knopf knopf-still knopf-klein";
        knopf.textContent = "Wunsch";
        knopf.title = "Einen Wunsch oder Fehler melden";
        knopf.addEventListener("click", () => WUNSCH.oeffnen());

        behaelter.appendChild(knopf);
    },

    async oeffnen() {
        /* Mehrzeilig (seit v0.59): Hier schreibt man Sätze. Bis dahin lief ein
           längerer Wunsch in eine einzige Zeile, von der man immer nur das Ende
           sah. */
        const text = await DIALOG.eingabe(
            "Wunsch oder Fehler",
            "Was fehlt dir, was stört dich? Schreib so viel, wie du willst — das "
                + "Feld wächst mit. Der Text landet als Eintrag auf GitHub, von "
                + "dort wandert er in die Aufgabenliste.",
            "",
            "Weiter",
            true,
            true
        );

        if (text === null || text.trim() === "") {
            return;
        }

        if (!WUNSCH.formularOeffnen(text.trim())) {
            /* Blockiert der Browser das Fenster, bleibt der Text nicht liegen. */
            await DIALOG.hinweis("Fenster blockiert",
                "Der Browser hat das GitHub-Formular nicht geöffnet. Dein Text:\n\n"
                + text.trim());
        }
    },

    /*
     * Öffnet das vorbefüllte GitHub-Formular mit diesem Text und meldet, ob es
     * aufging.
     *
     * ABGETRENNT VON `oeffnen` SEIT v0.105.0: Der globale Fehlerfang
     * (`js\app.js`) meldet OHNE Dialog und ohne Rückfrage — er läuft auch dann,
     * wenn die App gar nicht aufgebaut ist und `DIALOG` deshalb nicht helfen
     * kann. Er gibt den Text (die technische Fehlermeldung) fertig herein.
     */
    formularOeffnen(text) {
        const adresse = "https://github.com/" + WUNSCH.KONTO + "/" + WUNSCH.REPO
            + "/issues/new?template=wunsch.yml"
            + "&idee=" + encodeURIComponent(text)
            + "&stelle=" + encodeURIComponent(WUNSCH._stelle())
            + "&fassung=" + encodeURIComponent(WUNSCH._fassung());

        /*
         * KEIN "noopener" IM DRITTEN ARGUMENT (seit v0.66).
         *
         * DER FEHLER: Die Meldung „Fenster blockiert" kam JEDES MAL, auch wenn
         * das Formular sauber aufging und der Wunsch auf GitHub landete.
         *
         * DIE URSACHE steht so im Web-Standard: Wird `noopener` angegeben,
         * liefert `window.open` **immer `null`** zurück — auch bei Erfolg. Das
         * ist kein Fehlerzeichen, sondern der ganze Sinn des Schalters: Das
         * neue Fenster soll keinerlei Verbindung zurück haben, also gibt es
         * auch keine Kennung. Die Prüfung `if (!fenster)` hat damit „geöffnet"
         * und „blockiert" nicht mehr unterscheiden können.
         *
         * Der Schutz bleibt trotzdem: Das Fenster wird ohne den Schalter
         * geöffnet und ihm sofort danach die Rückverbindung genommen
         * (`opener = null`). Das ist der übliche Weg und liefert beides —
         * Sicherheit UND eine ehrliche Antwort auf die Frage, ob es aufging.
         */
        const fenster = window.open(adresse, "_blank");

        if (!fenster) {
            return false;
        }

        fenster.opener = null;
        return true;
    },

    /*
     * Welcher Tab ist gerade offen? Hilft beim Einordnen des Wunsches.
     *
     * SEIT v0.105.0 MIT AUFFANG: Der Fehlerfang meldet auch dann, wenn die App
     * beim Start auseinandergeflogen ist — dann gibt es die Tab-Leiste
     * womöglich gar nicht. Ohne den Auffang würde ausgerechnet der Melde-Weg
     * am selben Fehler scheitern, den er melden soll.
     */
    _stelle() {
        try {
            const tab = TABS.liste.find((eintrag) => eintrag.id === TABS.aktiveId);
            return tab ? tab.titel : "Blunderluck";
        } catch (fehler) {
            return "Blunderluck";
        }
    },

    /* Dieselbe Vorsicht für die Versionsnummer: Sie steht in `konfig.js`, und
       die kann beim Fehler-Fall ebenfalls fehlen. */
    _fassung() {
        try {
            return "v" + KONFIG.APP_VERSION;
        } catch (fehler) {
            return "unbekannt";
        }
    }
};
