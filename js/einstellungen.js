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
 *      Knöpfe. Mit aktiver Verwaltung erscheint zusätzlich die Liste der
 *      Mitspieler mit einem Entfernen-Knopf je Person.
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
     * BLEIBT — an ihr hängen rund dreissig Regeln in `css\stil.css`, und
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
        const karte = document.createElement("section");
        karte.className = "karte";

        const kopf = document.createElement("h2");
        kopf.textContent = "Verbindung";
        karte.appendChild(kopf);

        const zeile = document.createElement("div");
        zeile.className = "status status-karte";

        const punkt = document.createElement("span");
        punkt.className = "status-punkt";
        punkt.setAttribute("aria-hidden", "true");
        zeile.appendChild(punkt);

        const text = document.createElement("span");
        zeile.appendChild(text);
        karte.appendChild(zeile);

        const erklaerung = document.createElement("p");
        erklaerung.className = "erklaerung";
        erklaerung.textContent = "Grün heisst: Der gemeinsame Stand ist da "
            + "und aktuell. Gelb heisst laden oder senden, Rot heisst, dass "
            + "die Datenbank gerade nicht erreichbar ist.";
        karte.appendChild(erklaerung);

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
        const karte = document.createElement("section");
        karte.className = "karte";

        const kopf = document.createElement("h2");
        kopf.textContent = "Account";
        karte.appendChild(kopf);

        const person = ICH.person();

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

        const abmeldenText = document.createElement("p");
        abmeldenText.className = "erklaerung";
        abmeldenText.textContent = "Abmelden: Dieses Gerät vergisst die "
            + "Anmeldung, dein Konto bleibt samt Punkten und Partien "
            + "bestehen. Du meldest dich jederzeit wieder an.";
        karte.appendChild(abmeldenText);

        const abmeldenLeiste = document.createElement("div");
        abmeldenLeiste.className = "karte-fuss";
        abmeldenLeiste.appendChild(EINSTELLUNGEN._knopf(
            "Abmelden", "knopf-still knopf-klein",
            () => ANMELDUNG.abmelden()));
        karte.appendChild(abmeldenLeiste);

        const loeschenText = document.createElement("p");
        loeschenText.className = "erklaerung";
        loeschenText.textContent = "Konto löschen: Dein Eintrag verschwindet "
            + "aus Spielerliste und Rangliste — das lässt sich nicht "
            + "rückgängig machen. Beendete Partien bleiben in der Chronik.";
        karte.appendChild(loeschenText);

        const loeschenLeiste = document.createElement("div");
        loeschenLeiste.className = "karte-fuss";
        loeschenLeiste.appendChild(DIALOG.zweiSchritt(
            EINSTELLUNGEN._knopf("Konto löschen", "knopf-gefahr knopf-klein", null),
            () => ANMELDUNG.austreten()));
        karte.appendChild(loeschenLeiste);

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
        const karte = document.createElement("section");
        karte.className = "karte";

        const kopf = document.createElement("h2");
        kopf.textContent = "Spieler";
        karte.appendChild(kopf);

        const person = ICH.person();
        const stand = document.createElement("p");
        stand.className = "erklaerung";
        stand.textContent = person
            ? "Angemeldet als " + person.name + "."
            : "Auf diesem Gerät ist niemand angemeldet.";
        karte.appendChild(stand);

        const leiste = document.createElement("div");
        leiste.className = "karte-fuss";

        leiste.appendChild(EINSTELLUNGEN._knopf("Profil", "knopf-still knopf-klein",
            () => ANMELDUNG.profilOeffnen()));
        leiste.appendChild(EINSTELLUNGEN._knopf(
            ICH.verwaltungAktiv() ? "Verwaltung beenden" : "Verwaltung",
            "knopf-still knopf-klein",
            () => ANMELDUNG.verwaltungUmschalten()));

        /* Die Selbst-Löschung („Konto löschen") wohnt seit v0.6.0 in der
           Account-Karte darüber — hier bleiben Profil und Verwaltung. */

        karte.appendChild(leiste);

        /* Nur mit aktiver Verwaltung: die Mitspieler samt Entfernen-Knopf. */
        if (ICH.verwaltungAktiv() && typeof ANMELDUNG !== "undefined"
                && ANMELDUNG.abgleich) {
            const liste = SPIELER.normalisieren(ANMELDUNG.abgleich.daten).spieler;

            for (const spieler of liste) {
                const zeile = document.createElement("div");
                zeile.className = "schalter-halter";

                const name = document.createElement("span");
                name.className = "schalter-text";
                name.textContent = spieler.name
                    + (person && spieler.id === person.id ? " (du)" : "");
                zeile.appendChild(name);

                zeile.appendChild(DIALOG.zweiSchritt(
                    EINSTELLUNGEN._knopf("Entfernen", "knopf-gefahr knopf-klein", null),
                    () => ANMELDUNG.spielerEntfernen(spieler.id)));

                karte.appendChild(zeile);
            }
        }

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
