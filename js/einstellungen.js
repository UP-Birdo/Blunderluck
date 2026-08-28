/*
 * einstellungen.js — der Tab Einstellungen.
 *
 * Drei Karten:
 *
 *   1. ACCOUNT (seit v0.6.0, Bündel A Schritt 1): Abmelden (Gerät vergisst
 *      die Anmeldung, Konto bleibt) und Konto löschen (Eintrag verschwindet
 *      aus Spielerliste und Rangliste) — bewusst klar getrennt, die
 *      Verwechslung wäre teuer.
 *   2. SPIELER: der Zugang zu Profil (Name/Passwort ändern) und Verwaltung —
 *      die Abläufe selbst stehen in anmeldung.js, dieser Tab zeigt nur die
 *      Knöpfe. Die Liste der Mitspieler hing bis v0.99.0 direkt in dieser
 *      Karte; seitdem ist sie ein eigener Bildschirm mit Tabelle
 *      (js\verwaltungs-bildschirm.js), der Knopf „Verwaltung" führt dorthin.
 *   3. VERBINDUNG (seit v0.15.0, Wunsch 2): der Stand des Abgleichs —
 *      grüner Punkt und Text. Bis v0.14.0 stand er dauerhaft im Kopf der
 *      Seite; gehalten wird er weiterhin in app.js (`APP.status`).
 *
 * Die Karte DARSTELLUNG (Umschalter klassisch/3D) gab es bis v0.16.0. Seit
 * v0.17.0 ist der 3D-Look dauerhaft an (Wunsch 4) — was davon bleibt,
 * steht bei `laden`.
 */

const EINSTELLUNGEN = {

    id: "einstellungen",
    titel: "Einstellungen",

    /* Seit v0.9.0 (Bündel A, Schritt 4) kein Tab mehr: Man kommt über das
       Zahnrad des Startbildschirms hierher; die Ansicht ist ein Fenster
       ohne Tab-Leiste, der Zurück-Knopf führt zum Start. */
    inLeiste: false,

    wurzelEl: null,

    /*
     * DER 3D-LOOK IST SEIT v0.17.0 DAUERHAFT AN (Wunsch 4: „2D/3D-Schalter
     * entfernen — die App bleibt dauerhaft im 3D-Look").
     *
     * Bis v0.16.0 war er eine Geräte-Einstellung (`blunderluck-design` im
     * Gerätespeicher, Vorgabe „klassisch"). Beides ist weg: Der Schalter
     * aus dieser Karte und die Wahl selbst. Die Klasse `design-3d` am body
     * BLEIBT — an ihr hängen rund dreissig Regeln in den Stildateien
     * (vor allem `css\stil-effekte.css`), und
     * sie herauszuschneiden wäre viel Risiko für nichts. Sie wird jetzt
     * einmal beim Start gesetzt und nie wieder angefasst.
     *
     * Ein alter Eintrag „klassisch" im Gerätespeicher wird schlicht nicht
     * mehr gelesen — niemand bleibt auf dem alten Brett hängen.
     */
    laden() {
        if (typeof document === "undefined" || !document.body
            || !document.body.classList) {
            return;
        }
        document.body.classList.add("design-3d");
    },

    aufbauen(behaelter) {
        EINSTELLUNGEN.wurzelEl = behaelter;
        EINSTELLUNGEN._zeichnen();
    },

    beimOeffnen() {
        EINSTELLUNGEN._zeichnen();
    },

    _zeichnen() {
        const wurzel = EINSTELLUNGEN.wurzelEl;
        if (!wurzel) {
            return;
        }
        wurzel.innerHTML = "";

        /* Ein Fenster wie die offene Partie: Tab-Leiste weg, oben links
           der eine Zurück-Knopf (Haus-Muster seit v0.110). */
        if (typeof TABS !== "undefined" && TABS.rundeSetzen) {
            TABS.rundeSetzen("einstellungen", true);
        }

        const kopfzeile = document.createElement("div");
        kopfzeile.className = "partie-kopf";
        kopfzeile.appendChild(EINSTELLUNGEN._knopf("Zurück",
            "knopf-still knopf-klein", () => TABS.wechseln("start")));

        const kopfTitel = document.createElement("h2");
        kopfTitel.className = "partie-titel";
        kopfTitel.textContent = "Einstellungen";
        kopfzeile.appendChild(kopfTitel);
        wurzel.appendChild(kopfzeile);

        /* DIE KARTE „DARSTELLUNG" IST SEIT v0.17.0 WEG (Wunsch 4): Es gibt
           nichts mehr zu wählen, der 3D-Look ist dauerhaft an (siehe
           `laden`). Es bleiben Account, Spieler und Verbindung. */

        wurzel.appendChild(EINSTELLUNGEN._accountKarteBauen());
        wurzel.appendChild(EINSTELLUNGEN._spielerKarteBauen());
        wurzel.appendChild(EINSTELLUNGEN._statusKarteBauen());
        wurzel.appendChild(EINSTELLUNGEN._ueberKarteBauen());
    },

    /* ---------------------------------------------------------------- *
     * Die Karte „Über die App" (seit v0.25.0)
     *
     * Nutzer-Ansage 24.08.: „die version und der wunsch knopf oben raus
     * und auch in die einstellungen verschieben, damit mehr Platz für das
     * Wichtige ist." Damit ist der Kopfbalken der Seite ganz entfallen —
     * seine drei Bewohner sitzen jetzt alle hier unten.
     * ---------------------------------------------------------------- */

    _ueberKarteBauen() {
        const karte = EINSTELLUNGEN._karteBauen("Über die App", "", "");

        const zeile = document.createElement("p");
        zeile.className = "version";
        zeile.textContent = "Blunderluck "
            + (typeof KONFIG !== "undefined" ? "v" + KONFIG.APP_VERSION : "");
        karte.appendChild(zeile);

        /*
         * HIER STAND „Fehlt dir etwas oder stört dich etwas? Schreib es auf
         * …" (bis v0.107.0) — ERSATZLOS weg, nicht hinter ein i geschoben.
         * Der Satz erklärt den Knopf, der direkt darunter steht und selbst
         * sagt, was er tut. Ein i dafür wäre Aufwand für nichts.
         */

        /* Den Knopf baut wunsch.js selbst; er hing bis v0.24.0 im Kopf der
           Seite. Im Bildschirm-Test läuft wunsch.js nicht mit. */
        const fuss = document.createElement("div");
        fuss.className = "karte-fuss";
        if (typeof WUNSCH !== "undefined") {
            WUNSCH.aufbauen(fuss);
        }
        karte.appendChild(fuss);

        return karte;
    },

    /* ---------------------------------------------------------------- *
     * Die Verbindungs-Karte (Wunsch 2, 24.08.2026)
     *
     * Der grüne Punkt mit „Gemeinsame Tabelle …" stand bis v0.14.0
     * dauerhaft im Kopf der Seite. Er sagt etwas, das man einmal
     * nachsehen will und danach nicht mehr — im Kopf nahm er auf dem
     * Handy die halbe Zeile weg. Gehalten wird der Stand in app.js
     * (`APP.status`), diese Karte zeigt ihn nur.
     * ---------------------------------------------------------------- */

    statusEl: null,
    statusTextEl: null,

    _statusKarteBauen() {
        const karte = EINSTELLUNGEN._karteBauen("Verbindung",
            "Was die Farbe bedeutet",
            "Grün heisst: Der gemeinsame Stand ist da und aktuell. Gelb "
            + "heisst laden oder senden, Rot heisst, dass die Datenbank "
            + "gerade nicht erreichbar ist.");

        const zeile = document.createElement("div");
        zeile.className = "status status-karte";

        const punkt = document.createElement("span");
        punkt.className = "status-punkt";
        punkt.setAttribute("aria-hidden", "true");
        zeile.appendChild(punkt);

        const text = document.createElement("span");
        zeile.appendChild(text);
        karte.appendChild(zeile);

        EINSTELLUNGEN.statusEl = zeile;
        EINSTELLUNGEN.statusTextEl = text;
        EINSTELLUNGEN.statusAktualisieren();

        return karte;
    },

    /* Gerufen beim Zeichnen und aus APP.statusZeigen, solange die Karte
       hängt. Ohne Karte ist nichts zu tun — der Stand steht in app.js. */
    statusAktualisieren() {
        if (!EINSTELLUNGEN.statusEl) {
            return;
        }

        const stand = (typeof APP !== "undefined") ? APP.status : "laedt";
        const text = (typeof APP !== "undefined") ? APP.statusText : "";

        EINSTELLUNGEN.statusEl.setAttribute("data-status", stand);
        EINSTELLUNGEN.statusTextEl.textContent = text;
    },

    /* ---------------------------------------------------------------- *
     * Die Account-Karte: Abmelden und Konto löschen (Bündel A, Schritt 1)
     *
     * Zwei Aktionen mit sehr verschiedener Tragweite, deshalb je eine
     * eigene Zeile mit eigenem Erklärtext:
     *
     *   Abmelden      — nur dieses Gerät vergisst die Anmeldung, das Konto
     *                   bleibt samt Punkten und Partien bestehen.
     *   Konto löschen — der eigene Eintrag verschwindet aus Spielerliste
     *                   und Rangliste (bis v0.5.0 hiess das „Ich bin raus");
     *                   Zwei-Schritt, weil nicht rückgängig zu machen.
     * ---------------------------------------------------------------- */

    _accountKarteBauen() {
        const person = ICH.person();

        /*
         * SEIT v0.108.0 STEHEN DIE ZWEI ERKLÄRUNGEN HINTER DEM i
         * (Nutzer-Ansage 28.08.2026: „weniger Text", und die Ansage vom
         * 21.08.: verstecken statt löschen). Bis v0.107.0 stand über jedem
         * der beiden Knöpfe ein voller Absatz — sieben Zeilen Text für zwei
         * Knöpfe, die man einmal im Leben drückt.
         *
         * WAS NICHT WEGFÄLLT: der Unterschied zwischen Abmelden und
         * Löschen. Er ist die ganze Begründung dieser Karte, und wer ihn
         * nicht kennt, drückt womöglich das Falsche — er steht deshalb
         * vollständig im Fenster hinter dem i.
         */
        const karte = EINSTELLUNGEN._karteBauen("Account",
            "Abmelden und Konto löschen",
            "Abmelden: Dieses Gerät vergisst die Anmeldung, dein Konto "
            + "bleibt samt Punkten und Partien bestehen. Du meldest dich "
            + "jederzeit wieder an."
            + "\n\nKonto löschen: Dein Eintrag verschwindet aus Spielerliste "
            + "und Rangliste — das lässt sich nicht rückgängig machen. "
            + "Beendete Partien bleiben in der Chronik.");

        if (!person) {
            const stand = document.createElement("p");
            stand.className = "erklaerung";
            stand.textContent = "Auf diesem Gerät ist niemand angemeldet.";
            karte.appendChild(stand);
            return karte;
        }

        const stand = document.createElement("p");
        stand.className = "erklaerung";
        stand.textContent = "Angemeldet als " + person.name + ".";
        karte.appendChild(stand);

        /* Beide Knöpfe in EINER Fusszeile — bis v0.107.0 hatte jeder seine
           eigene, weil zwischen ihnen ein Erklärabsatz stand. */
        const leiste = document.createElement("div");
        leiste.className = "karte-fuss";

        leiste.appendChild(EINSTELLUNGEN._knopf(
            "Abmelden", "knopf-still knopf-klein",
            () => ANMELDUNG.abmelden()));

        leiste.appendChild(DIALOG.zweiSchritt(
            EINSTELLUNGEN._knopf("Konto löschen", "knopf-gefahr knopf-klein", null),
            () => ANMELDUNG.austreten()));

        karte.appendChild(leiste);

        return karte;
    },

    /* ---------------------------------------------------------------- *
     * Die Spieler-Karte: Profil und Verwaltung
     *
     * Gezeichnet wird nur mit ICH (Gerätespeicher); ANMELDUNG wird erst in
     * den Klick-Behandlern angefasst — so bleibt der Tab auch ohne die
     * Anmelde-Schicht zeichenbar (Regressionstest gegen das nachgebaute DOM).
     * ---------------------------------------------------------------- */

    _spielerKarteBauen() {
        const karte = EINSTELLUNGEN._karteBauen("Spieler",
            "Profil und Verwaltung",
            "Profil: dein Name und dein Passwort."
            + "\n\nVerwaltung: die Liste aller Mitspieler dieses Hauses, mit "
            + "der Möglichkeit, einen Eintrag zu entfernen. Sie ist durch ein "
            + "eigenes Passwort geschützt.");

        /*
         * DAS „ANGEMELDET ALS …" STAND HIER DOPPELT (bis v0.107.0) — die
         * Account-Karte direkt darüber sagt denselben Satz. Zweimal
         * dieselbe Auskunft auf einem Bildschirm ist kein Text, der etwas
         * erklärt, sondern Text, den man überliest.
         */

        const leiste = document.createElement("div");
        leiste.className = "karte-fuss";

        leiste.appendChild(EINSTELLUNGEN._knopf("Profil", "knopf-still knopf-klein",
            () => ANMELDUNG.profilOeffnen()));

        /* EIN Knopf statt der eingebetteten Mitspieler-Liste (bis v0.99.0
           hier, Nutzer-Ansage 27.08.2026): Er fragt bei Bedarf das
           Verwaltungs-Passwort ab und öffnet dann den eigenen Bildschirm
           mit der Spieler-Tabelle (js\verwaltungs-bildschirm.js). Beendet
           wird die Verwaltung ebenfalls dort. */
        leiste.appendChild(EINSTELLUNGEN._knopf(
            "Verwaltung", "knopf-still knopf-klein",
            () => ANMELDUNG.verwaltungOeffnen()));

        /* Die Selbst-Löschung („Konto löschen") wohnt seit v0.6.0 in der
           Account-Karte darüber — hier bleiben Profil und Verwaltung. */

        karte.appendChild(leiste);

        return karte;
    },

    /* ---------------------------------------------------------------- *
     * EINE KARTE MIT KOPFZEILE (seit v0.108.0)
     *
     * Überschrift links, ein i rechts — dahinter steht, was bis v0.107.0
     * als Absatz auf der Seite stand. Das ist dasselbe Muster wie über dem
     * Icon-Raster der Bibliothek (v0.86.0) und über den Knopfreihen des
     * Anlege-Bildschirms (v0.105): **Wer die Seite benutzt, sieht sie
     * nicht; wer die Erklärung sucht, findet sie an der gewohnten Stelle.**
     *
     * Der i-Knopf selbst wird NICHT hier gebaut, sondern von
     * `TEAM_SCHACH._infoZeichenBauen` geholt — er trägt seinen Text bei
     * sich und ist genau dafür gemacht. Eine zweite Fassung desselben
     * Knopfs wäre die zweite Wahrheit.
     *
     * OHNE `iText` bleibt die Kopfzeile eine schlichte Überschrift.
     * ---------------------------------------------------------------- */

    _karteBauen(titel, iTitel, iText) {
        const karte = document.createElement("section");
        karte.className = "karte";

        const kopf = document.createElement("div");
        kopf.className = "karte-kopf";

        const ueberschrift = document.createElement("h2");
        ueberschrift.textContent = titel;
        kopf.appendChild(ueberschrift);

        if (iText && typeof TEAM_SCHACH !== "undefined"
            && TEAM_SCHACH._infoZeichenBauen) {
            kopf.appendChild(TEAM_SCHACH._infoZeichenBauen(iTitel, iText));
        }

        karte.appendChild(kopf);

        return karte;
    },

    _knopf(beschriftung, klasse, beiKlick) {
        const knopf = document.createElement("button");
        knopf.type = "button";
        knopf.className = "knopf " + klasse;
        knopf.textContent = beschriftung;
        if (beiKlick) {
            knopf.addEventListener("click", beiKlick);
        }
        return knopf;
    }
};
