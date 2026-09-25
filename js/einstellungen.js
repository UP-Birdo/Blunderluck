/*
 * einstellungen.js — der Bildschirm Einstellungen.
 *
 * SEIT v0.143.0 IM TYPOLUCK-STIL (UPCrew-Angleichung Runde 2, Vorlage
 * `Apps\Typoluck\js\bildschirm-einstellungen.js`): drei Karten, Stichworte
 * statt Erklärsätzen hinter i-Knöpfen.
 *
 *   1. DIESES GERÄT — je Zeile Symbol + Name links, Umschalter rechts:
 *      Darstellung (Auto / Hell / Dunkel, js\darstellung.js) und Vibration
 *      (An / Aus, js\fuehlen.js; kann das Gerät nicht vibrieren, steht
 *      „nicht möglich" da statt eines Schalters ohne Wirkung).
 *   2. UPCREW-KONTO · ALLE SPIELE — wer angemeldet ist (Name#Nummer, Rolle)
 *      und alle Konto-Knöpfe untereinander: Spielstand sichern (nur Gast),
 *      Profil, Verwaltung (nur Admins), Abmelden, UPCrew-Konto löschen
 *      (Zwei-Schritt, weil nicht rückgängig zu machen). Bis v0.142 waren das
 *      zwei Karten „Account" und „Spieler" mit je einem i.
 *   3. ÜBER BLUNDERLUCK — Angaben wie in Typoluck (Ein Spiel von, Version,
 *      Verbindung) und der Wunsch-Knopf. Die Verbindung war bis v0.142 eine
 *      eigene Karte; gehalten wird ihr Stand weiter in app.js (`APP.status`).
 *
 * Bis v0.16.0 gab es eine Karte „Darstellung" mit dem Schalter
 * klassisch/3D; seit v0.17.0 ist der 3D-Look dauerhaft an (siehe `laden`).
 * Die neue Darstellung (hell/dunkel) seit v0.141.0 ist etwas anderes.
 */

const EINSTELLUNGEN = {

    id: "einstellungen",
    titel: "Einstellungen",

    /* Seit v0.9.0 (Bündel A, Schritt 4) kein Tab mehr: Man kommt über das
       Menü des Startbildschirms hierher; der Pfeil oben führt zum Start. */
    inLeiste: false,

    wurzelEl: null,

    /*
     * DER 3D-LOOK IST SEIT v0.17.0 DAUERHAFT AN (Wunsch 4: „2D/3D-Schalter
     * entfernen — die App bleibt dauerhaft im 3D-Look").
     *
     * Die Klasse `design-3d` am body BLEIBT — an ihr hängen rund dreissig
     * Regeln in den Stildateien (vor allem `css\stil-effekte.css`). Sie wird
     * einmal beim Start gesetzt und nie wieder angefasst. Ein alter Eintrag
     * „klassisch" im Gerätespeicher wird schlicht nicht mehr gelesen.
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

        /* Ein Fenster wie die offene Partie: oben links der Pfeil zurück
           (Haus-Muster seit v0.110, Pfeil seit v0.142.0). */
        if (typeof TABS !== "undefined" && TABS.rundeSetzen) {
            TABS.rundeSetzen("einstellungen", true);
        }

        const kopfzeile = document.createElement("div");
        kopfzeile.className = "partie-kopf";
        kopfzeile.appendChild(ZUSTAND.alsZurueck(EINSTELLUNGEN._knopf("Zurück",
            "knopf-still knopf-klein", () => TABS.wechseln("start"))));

        const kopfTitel = document.createElement("h2");
        kopfTitel.className = "partie-titel";
        kopfTitel.textContent = "Einstellungen";
        kopfzeile.appendChild(kopfTitel);
        wurzel.appendChild(kopfzeile);

        wurzel.appendChild(EINSTELLUNGEN._geraetKarteBauen());
        wurzel.appendChild(EINSTELLUNGEN._kontoKarteBauen());
        wurzel.appendChild(EINSTELLUNGEN._ueberKarteBauen());
    },

    /* ---------------------------------------------------------------- *
     * 1. Dieses Gerät
     * ---------------------------------------------------------------- */

    _geraetKarteBauen() {
        const karte = EINSTELLUNGEN._karteBauen("Dieses Gerät");

        /* Hell / dunkel / wie das Gerät (seit v0.141.0). Fehlt der
           Baustein (Bildschirm-Tests), bleibt die Zeile weg. */
        if (typeof DARSTELLUNG !== "undefined") {
            karte.appendChild(EINSTELLUNGEN._zeileBauen("auto", "Darstellung",
                EINSTELLUNGEN._segmentBauen([
                    { wert: "geraet", text: "Auto" },
                    { wert: "hell", text: "Hell" },
                    { wert: "dunkel", text: "Dunkel" }
                ], DARSTELLUNG.thema(), (wert) => {
                    DARSTELLUNG.themaSetzen(wert);
                    EINSTELLUNGEN._zeichnen();
                }, "Darstellung")));
        }

        /* Vibration (seit v0.140.0, UPCrew-Standard Abschnitt 5): ab Werk
           an, nur dieses Gerät. Das iPhone lässt Web-Apps nicht vibrieren —
           dann steht das als Stichwort da. */
        const kannVibrieren = (typeof FUEHLEN !== "undefined") && FUEHLEN.verfuegbar();
        const an = (typeof FUEHLEN === "undefined") || FUEHLEN.an();
        karte.appendChild(EINSTELLUNGEN._zeileBauen("vibration", "Vibration",
            kannVibrieren
                ? EINSTELLUNGEN._segmentBauen([
                    { wert: true, text: "An" },
                    { wert: false, text: "Aus" }
                ], an, (wert) => {
                    FUEHLEN.anSetzen(wert);
                    /* Man spürt sofort, was man eingeschaltet hat. */
                    FUEHLEN.tippen();
                    EINSTELLUNGEN._zeichnen();
                }, "Vibration")
                : EINSTELLUNGEN._element("span", "schild", "nicht möglich")));
        return karte;
    },

    /* ---------------------------------------------------------------- *
     * 2. Das UPCrew-Konto
     *
     * Gezeichnet wird nur mit ICH (Gerätespeicher) und dem, was ANMELDUNG
     * schon weiss; ANMELDUNG wird sonst erst in den Klick-Behandlern
     * angefasst — so bleibt der Bildschirm auch ohne die Anmelde-Schicht
     * zeichenbar (Regressionstest gegen das nachgebaute DOM).
     *
     * Abmelden und Löschen bleiben ZWEI Knöpfe mit sehr verschiedener
     * Tragweite (Bündel A, Schritt 1): Abmelden vergisst nur die Anmeldung
     * auf diesem Gerät, Löschen nimmt das Konto aus ALLEN UPCrew-Spielen.
     * Deshalb ist nur Löschen rot und nur Löschen fragt nach.
     * ---------------------------------------------------------------- */

    _kontoKarteBauen() {
        const karte = EINSTELLUNGEN._karteBauen("UPCrew-Konto · alle Spiele");
        const person = ICH.person();

        if (!person) {
            karte.appendChild(EINSTELLUNGEN._element("p", "erklaerung", "Nicht angemeldet"));
            return karte;
        }

        /* Mit UPCrew-Konto (seit v0.138.0): Name MIT Nummer und die Rolle;
           ein Gast sieht, dass sein Stand nur hier liegt. */
        const stand = EINSTELLUNGEN._element("p", "erklaerung", "Angemeldet · " + person.name);
        const mitKonto = (typeof KONTO !== "undefined" && KONTO.aktiv()
            && typeof ANMELDUNG !== "undefined" && ANMELDUNG.abgleich);
        const eintrag = mitKonto ? ANMELDUNG.ich() : null;
        if (eintrag) {
            const rolle = KONTO.rolleVon(ANMELDUNG.abgleich.daten, eintrag.uid);
            stand.textContent = "Angemeldet · " + KONTO.anzeigeName(eintrag)
                + (rolle ? " · " + rolle : "")
                + (eintrag.gast === true ? " · nur dieses Gerät" : "");
        }
        karte.appendChild(stand);

        const spalte = EINSTELLUNGEN._element("div", "knopf-spalte");

        if (eintrag && eintrag.gast === true) {
            spalte.appendChild(EINSTELLUNGEN._knopf("Spielstand sichern", "knopf-haupt",
                () => ANMELDUNG.gastSichernOeffnen()));
        }

        /* Seit v0.119.0 die Profilseite (Rangliste) statt eines Popups;
           der Pfeil dort führt in die Einstellungen zurück. */
        spalte.appendChild(EINSTELLUNGEN._knopf("Profil", "knopf-still",
            () => RANGLISTE.eigenesProfilOeffnen("einstellungen")));

        /* EIN Knopf statt einer eingebetteten Mitspieler-Liste (seit
           v0.100.0): Er öffnet den eigenen Bildschirm mit der Tabelle
           (js\verwaltungs-bildschirm.js). Mit UPCrew-Konto nur für Admins
           (seit v0.138.0; ICH fragt dann die Rolle). */
        const nurAdmins = (typeof KONTO !== "undefined" && KONTO.aktiv());
        if (!nurAdmins || ICH.verwaltungAktiv()) {
            spalte.appendChild(EINSTELLUNGEN._knopf("Verwaltung", "knopf-still",
                () => ANMELDUNG.verwaltungOeffnen()));
        }

        spalte.appendChild(EINSTELLUNGEN._knopf("Abmelden", "knopf-still",
            () => ANMELDUNG.abmelden()));

        spalte.appendChild(DIALOG.zweiSchritt(
            EINSTELLUNGEN._knopf("UPCrew-Konto löschen", "knopf-gefahr", null),
            () => ANMELDUNG.austreten()));

        karte.appendChild(spalte);
        return karte;
    },

    /* ---------------------------------------------------------------- *
     * 3. Über Blunderluck — Angaben wie Typoluck, dazu die Verbindung
     *
     * Die Versionsanzeige (seit v0.25.0 hier, Nutzer-Ansage 24.08.: „die
     * version und der wunsch knopf oben raus und in die einstellungen")
     * steht seit v0.143.0 wie in Typoluck als Angabe „Version" ohne
     * vorangestelltes v.
     * ---------------------------------------------------------------- */

    statusEl: null,
    statusTextEl: null,

    _ueberKarteBauen() {
        const karte = EINSTELLUNGEN._karteBauen("Über Blunderluck");

        const liste = EINSTELLUNGEN._element("dl", "angaben");
        const angabe = (begriff, wert, klasse) => {
            liste.appendChild(EINSTELLUNGEN._element("dt", null, begriff));
            const feld = EINSTELLUNGEN._element("dd", klasse || null, null);
            if (typeof wert === "string") {
                feld.textContent = wert;
            } else if (wert) {
                feld.appendChild(wert);
            }
            liste.appendChild(feld);
            return feld;
        };

        angabe("Ein Spiel von", "UPCrew");
        angabe("Version", typeof KONFIG !== "undefined" ? KONFIG.APP_VERSION : "", "version");

        /* Die Verbindung (seit v0.15.0, Wunsch 2): Punkt und ein, zwei
           Wörter. Grün = Stand aktuell, Gelb = lädt oder sendet, Rot =
           Datenbank nicht erreichbar; die technische Meldung steht nur beim
           Darüberfahren (seit v0.140.0). */
        const zeile = EINSTELLUNGEN._element("span", "status status-karte");
        const punkt = EINSTELLUNGEN._element("span", "status-punkt");
        punkt.setAttribute("aria-hidden", "true");
        zeile.appendChild(punkt);
        const text = EINSTELLUNGEN._element("span", null, null);
        zeile.appendChild(text);
        angabe("Verbindung", zeile);

        karte.appendChild(liste);

        EINSTELLUNGEN.statusEl = zeile;
        EINSTELLUNGEN.statusTextEl = text;
        EINSTELLUNGEN.statusAktualisieren();

        /* Den Knopf baut wunsch.js selbst; im Bildschirm-Test läuft
           wunsch.js nicht mit. */
        const fuss = EINSTELLUNGEN._element("div", "karte-fuss");
        if (typeof WUNSCH !== "undefined") {
            WUNSCH.aufbauen(fuss);
        }
        karte.appendChild(fuss);

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
        const technik = (typeof APP !== "undefined") ? (APP.statusTechnik || "") : "";

        EINSTELLUNGEN.statusEl.setAttribute("data-status", stand);
        EINSTELLUNGEN.statusTextEl.textContent = text;
        EINSTELLUNGEN.statusTextEl.title = technik;
    },

    /* ---------------------------------------------------------------- *
     * Bausteine dieses Bildschirms (Muster: Typoluck BAUSTEINE)
     * ---------------------------------------------------------------- */

    /* Eine Karte mit Überschrift — seit v0.143.0 ohne i-Knopf. */
    _karteBauen(titel) {
        const karte = EINSTELLUNGEN._element("section", "karte");
        const kopf = EINSTELLUNGEN._element("div", "karte-kopf");
        kopf.appendChild(EINSTELLUNGEN._element("h2", null, titel));
        karte.appendChild(kopf);
        return karte;
    },

    /* Eine Zeile „Symbol + Name links, Schalter rechts" (wie Typoluck). */
    _zeileBauen(zeichen, text, schalter) {
        const zeile = EINSTELLUNGEN._element("div", "einstellung-zeile");
        const name = EINSTELLUNGEN._element("span", "einstellung-name");
        name.appendChild(ZUSTAND.zeichen(zeichen));
        name.appendChild(EINSTELLUNGEN._element("span", null, text));
        zeile.appendChild(name);
        zeile.appendChild(schalter);
        return zeile;
    },

    /*
     * Ein Segment-Schalter (wie Typoluck `BAUSTEINE.segment`): mehrere
     * Wahlen in einer Pille, die gewählte hebt sich ab. `optionen` sind
     * { wert, text }; `beiWahl(wert)` läuft nur bei einer ANDEREN Wahl.
     */
    _segmentBauen(optionen, aktuell, beiWahl, name) {
        const gruppe = EINSTELLUNGEN._element("div", "segment");
        gruppe.setAttribute("role", "radiogroup");
        gruppe.setAttribute("aria-label", name);
        for (const option of optionen) {
            const gewaehlt = option.wert === aktuell;
            const knopf = EINSTELLUNGEN._element("button",
                "segment-wahl" + (gewaehlt ? " segment-aktiv" : ""), option.text);
            knopf.type = "button";
            knopf.setAttribute("role", "radio");
            knopf.setAttribute("aria-checked", gewaehlt ? "true" : "false");
            knopf.addEventListener("click", () => {
                if (option.wert !== aktuell) {
                    beiWahl(option.wert);
                }
            });
            gruppe.appendChild(knopf);
        }
        return gruppe;
    },

    _element(tag, klasse, text) {
        const el = document.createElement(tag);
        if (klasse) {
            el.className = klasse;
        }
        if (text) {
            el.textContent = text;
        }
        return el;
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
