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

    /*
     * NUR TEXT (seit v0.151.10, Nutzer 27.09.2026: „bei Fehler melden eine
     * Sperre für Sonderzeichen und sonstigen Unfug einbauen, nur Text, sonst
     * kann was schiefgehen").
     *
     * Erlaubt: lateinische Buchstaben (mit Umlauten, ß, Akzenten), Ziffern,
     * Leerzeichen, Zeilenumbruch und . , ! ? - ( ) : ; — alles andere
     * (spitze, eckige, geschweifte Klammern, Schrägstriche, $ % & * = ~ ^,
     * Backtick, Emojis, Steuer- und unsichtbare Zeichen) fliegt beim Tippen
     * raus (`zeichenFiltern`) und wird vor dem Senden noch einmal entfernt
     * (`saeubern`). Der Text geht nur als Adress-Teil (encodeURIComponent)
     * in ein GitHub-Formular — eine Datenbank ist nicht beteiligt.
     */
    MAX_LAENGE: 500,
    NICHT_ERLAUBT: /[^\p{Script=Latin}0-9 \n.,!?\-():;]/gu,

    /* Beim Tippen: nur verbotene Zeichen weg (Tab → Leerzeichen), sonst
       nichts — ein Leerzeichen am Ende braucht man beim Weiterschreiben. */
    zeichenFiltern(text) {
        return String(text || "")
            .replace(/\r\n?/g, "\n")
            .replace(/\t/g, " ")
            .replace(WUNSCH.NICHT_ERLAUBT, "")
            .slice(0, WUNSCH.MAX_LAENGE);
    },

    /* Vor dem Senden: filtern, Mehrfach-Leerzeichen zu einem, höchstens eine
       Leerzeile am Stück, Ränder weg, Länge begrenzen. */
    saeubern(text) {
        return WUNSCH.zeichenFiltern(text)
            .replace(/ {2,}/g, " ")
            .replace(/ *\n */g, "\n")
            .replace(/\n{3,}/g, "\n\n")
            .trim()
            .slice(0, WUNSCH.MAX_LAENGE);
    },

    /*
     * Die AUTOMATISCHE Fehlermeldung (`FEHLERFANG.meldeText`) ist kein
     * getippter Text, sondern Technik mit Pfaden und Zeilennummern — `/` und
     * `:` müssen bleiben. Hier nur weg, was nie hineingehört: spitze und
     * geschweifte Klammern, Backtick, Steuer- und unsichtbare Zeichen.
     */
    technikSaeubern(text) {
        return String(text || "")
            .replace(/\r\n?/g, "\n")
            .replace(/[<>{}`\u0000-\u0009\u000B-\u001F\u007F-\u009F\u200B-\u200F\u2028-\u202E\u2060-\u206F\uFEFF]/g, "")
            .slice(0, 1500);
    },

    /* Hängt den Knopf in den Kopf der Seite. */
    aufbauen(behaelter) {
        if (!behaelter) {
            return;
        }

        const knopf = document.createElement("button");
        knopf.type = "button";
        knopf.className = "knopf knopf-still knopf-klein";
        knopf.textContent = "Wunsch";
        knopf.title = "Wunsch oder Fehler melden";
        knopf.addEventListener("click", () => WUNSCH.oeffnen());

        behaelter.appendChild(knopf);
    },

    async oeffnen() {
        /* Mehrzeilig (seit v0.59): Hier schreibt man Sätze. Bis dahin lief ein
           längerer Wunsch in eine einzige Zeile, von der man immer nur das Ende
           sah. */
        const roh = await DIALOG.eingabe(
            "Wunsch oder Fehler",
            "Was fehlt · was stört · nur Text, höchstens " + WUNSCH.MAX_LAENGE + " Zeichen",
            "",
            "Weiter",
            true,
            true,
            { filter: WUNSCH.zeichenFiltern, maxLaenge: WUNSCH.MAX_LAENGE }
        );

        if (typeof roh !== "string") {
            return;
        }
        const text = WUNSCH.saeubern(roh);
        if (text === "") {
            return;
        }

        if (!WUNSCH.formularOeffnen(text)) {
            /* Blockiert der Browser das Fenster, bleibt der Text nicht liegen. */
            await DIALOG.hinweis("Fenster blockiert",
                "GitHub-Formular nicht geöffnet · dein Text:\n\n"
                + text);
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
            + "&idee=" + encodeURIComponent(WUNSCH.technikSaeubern(text))
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
