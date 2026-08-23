/*
 * einstellungen.js — der Tab Einstellungen.
 *
 * Drei Karten:
 *
 *   1. DARSTELLUNG (Geräte-Einstellung, kein gemeinsamer Stand): der Wechsel
 *      zwischen dem klassischen Brett und dem 3D-Look. Alles hängt an EINER
 *      Klasse am body (`design-3d`) — neue Stufen docken dort an, ohne
 *      diesen Tab zu ändern.
 *   2. ACCOUNT (seit v0.6.0, Bündel A Schritt 1): Abmelden (Gerät vergisst
 *      die Anmeldung, Konto bleibt) und Konto löschen (Eintrag verschwindet
 *      aus Spielerliste und Rangliste) — bewusst klar getrennt, die
 *      Verwechslung wäre teuer.
 *   3. SPIELER: der Zugang zu Profil (Name/Passwort ändern) und Verwaltung —
 *      die Abläufe selbst stehen in anmeldung.js, dieser Tab zeigt nur die
 *      Knöpfe. Mit aktiver Verwaltung erscheint zusätzlich die Liste der
 *      Mitspieler mit einem Entfernen-Knopf je Person.
 */

const EINSTELLUNGEN = {

    id: "einstellungen",
    titel: "Einstellungen",

    /* Seit v0.9.0 (Bündel A, Schritt 4) kein Tab mehr: Man kommt über das
       Zahnrad des Startbildschirms hierher; die Ansicht ist ein Fenster
       ohne Tab-Leiste, der Zurück-Knopf führt zum Start. */
    inLeiste: false,

    /* Die gewählte Darstellung: "klassisch" oder "3d". */
    SCHLUESSEL_DESIGN: "blunderluck-design",
    design: "klassisch",

    wurzelEl: null,

    /* Beim Start (app.js), VOR dem ersten Zeichnen — sonst blitzt kurz das
       falsche Design auf. */
    laden() {
        try {
            const wert = window.localStorage.getItem(EINSTELLUNGEN.SCHLUESSEL_DESIGN);
            if (wert === "3d" || wert === "klassisch") {
                EINSTELLUNGEN.design = wert;
            }
        } catch (fehler) {
            /* Ohne Gerätespeicher (Privatmodus) bleibt die Vorgabe. */
        }
        EINSTELLUNGEN._anwenden();
    },

    designSetzen(wert) {
        EINSTELLUNGEN.design = (wert === "3d") ? "3d" : "klassisch";
        try {
            window.localStorage.setItem(
                EINSTELLUNGEN.SCHLUESSEL_DESIGN, EINSTELLUNGEN.design);
        } catch (fehler) {
            /* Dann gilt die Wahl eben nur bis zum Neuladen. */
        }
        EINSTELLUNGEN._anwenden();
    },

    _anwenden() {
        if (typeof document === "undefined" || !document.body
            || !document.body.classList) {
            return;
        }
        document.body.classList.toggle("design-3d", EINSTELLUNGEN.design === "3d");
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

        const karte = document.createElement("section");
        karte.className = "karte";

        const kopf = document.createElement("h2");
        kopf.textContent = "Darstellung";
        karte.appendChild(kopf);

        /* Derselbe Kipp-Schalter wie im Anlege-Bildschirm — EIN Muster für
           die ganze App. Die ganze Zeile ist ein label und schaltet um; das
           i steht daneben (siehe die v0.105-Regel: Erklärtexte hinters i). */
        const zeile = document.createElement("label");
        zeile.className = "schalter-zeile";

        const kasten = document.createElement("input");
        kasten.type = "checkbox";
        kasten.className = "schalter-kasten";
        kasten.checked = (EINSTELLUNGEN.design === "3d");
        kasten.addEventListener("change", () => {
            EINSTELLUNGEN.designSetzen(kasten.checked ? "3d" : "klassisch");
        });
        zeile.appendChild(kasten);

        const text = document.createElement("span");
        text.className = "schalter-text";
        const titel = document.createElement("span");
        titel.className = "schalter-titel";
        titel.textContent = "3D-Look (Vorschau)";
        text.appendChild(titel);
        zeile.appendChild(text);

        const halter = document.createElement("div");
        halter.className = "schalter-halter";
        halter.appendChild(zeile);

        const info = document.createElement("button");
        info.type = "button";
        info.className = "info-knopf";
        info.textContent = "i";
        info.setAttribute("aria-label", "Was ist der 3D-Look?");
        info.addEventListener("click", () => DIALOG.hinweis("3D-Look (Vorschau)",
            "Das Schachbrett wird zu Pastell-Kacheln mit Tiefe, wie in einem "
            + "3D-Spiel. Das ist die erste Ausbaustufe — Spielzeug-Figuren und "
            + "eine leichte Schräg-Ansicht folgen nach und nach.\n\n"
            + "Aus bleibt das gewohnte Brett. Die Wahl gilt nur für dieses "
            + "Gerät."));
        halter.appendChild(info);

        karte.appendChild(halter);
        wurzel.appendChild(karte);

        wurzel.appendChild(EINSTELLUNGEN._accountKarteBauen());
        wurzel.appendChild(EINSTELLUNGEN._spielerKarteBauen());
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
