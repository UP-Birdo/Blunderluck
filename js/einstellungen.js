/*
 * einstellungen.js — der Bildschirm Einstellungen.
 *
 * SEIT v0.156.0 IM GEMEINSAMEN AUFBAU js\upcrew-einstellungen.js (Nutzer
 * 28.09.2026: „verwalten und die einstellungen sollen in beiden spielen
 * gleich aussehen"; Entwurf Oberfläche Runde 7) und als BLATT über dem
 * Start (js\upcrew-blatt.js). Die Reihenfolge der Abschnitte legt der
 * Baustein fest:
 *
 *   1. UPCREW-KONTO · ALLE SPIELE — wer angemeldet ist (Name, klein #Tag,
 *      Rolle), Spielstand sichern (nur Gast), Name, Nummer, Passwort
 *      ändern, Abmelden.
 *   2. AUSSEHEN — Darstellung (Auto / Hell / Dunkel, js\darstellung.js)
 *      und der Weg in die Sammlung (der Schalter „Standard-Schrift" ist
 *      seit v0.157.0 weg, Nutzer 29.09.2026).
 *   3. PRIVATSPHÄRE — Spielzeit privat oder öffentlich (am Konto).
 *   4. NUR IN BLUNDERLUCK — Vibration (dieses Gerät), Schach lernen,
 *      vergangene Matches.
 *   5. HILFE — Wunsch oder Fehler melden (js\wunsch.js).
 *   6. ADMIN — Verwaltung (nur Rolle Admin), öffnet als Blatt darüber.
 *   7. ÜBER — Version und „Speicher" mit Status-Lampe (seit v0.157.0,
 *      `UPCREW_EINSTELLUNGEN.speicherZeile`; Stand in app.js, `APP.status`).
 *
 * KURZE TEXTE (seit v0.157.0, Nutzer 29.09.2026: „zu viele texte sätze"):
 * `unter` höchstens 3 Wörter, `hinweis` höchstens 6 — Längeres zeigt der
 * Baustein ohnehin nicht.
 *   8. ganz unten, rot, mit Rückfrage: UPCrew-Konto löschen.
 *
 * Bis v0.155 drei Karten „Dieses Gerät", „UPCrew-Konto", „Über
 * Blunderluck" (seit v0.143.0 im Typoluck-Stil).
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
        /* Seit v0.151.3: im 2D-Brett flache Figuren statt der gerenderten
           3D-Bilder (js\figuren-flach.js, Klasse `brett-flach`). */
        if (typeof FIGUREN_FLACH !== "undefined") {
            FIGUREN_FLACH.anwenden();
        }
    },

    aufbauen(behaelter) {
        EINSTELLUNGEN.wurzelEl = behaelter;
        EINSTELLUNGEN._zeichnen();
        /* Die Lampe folgt auch dem Netz — seit v0.167.0 über den Baustein
           js\upcrew-offline.js (`UPCREW_OFFLINE.lampe`, in `_ueberAbschnitt`):
           grau „Offline · später", erst nach 1,2 s ohne Netz, wie das Zeichen
           am Profilbild. Ohne Baustein wie bis v0.166.4 sofort. */
        if (typeof UPCREW_OFFLINE === "undefined"
                && typeof window !== "undefined" && typeof window.addEventListener === "function") {
            window.addEventListener("online", () => EINSTELLUNGEN.statusAktualisieren());
            window.addEventListener("offline", () => EINSTELLUNGEN.statusAktualisieren());
        }
        /* Stellt Typoluck (oder das Konto) das Aussehen um, während die
           Einstellungen offen sind, ziehen die Umschalter mit. */
        if (typeof DARSTELLUNG !== "undefined") {
            DARSTELLUNG.beiAenderung((aussehen, quelle) => {
                if (quelle !== "selbst" && typeof TABS !== "undefined"
                        && TABS.aktiveId === EINSTELLUNGEN.id) {
                    EINSTELLUNGEN._zeichnen();
                }
            });
        }
    },

    beimOeffnen() {
        EINSTELLUNGEN._zeichnen();
    },

    /* Beim Schliessen (seit v0.167.1) die Lampe beim Offline-Hinweis
       abmelden — sie hängt nicht mehr im Bild. */
    beimVerlassen() {
        EINSTELLUNGEN._lampeLoesen();
    },

    _zeichnen() {
        const wurzel = EINSTELLUNGEN.wurzelEl;
        if (!wurzel) {
            return;
        }
        wurzel.innerHTML = "";
        EINSTELLUNGEN._lampeLoesen();
        EINSTELLUNGEN.lampeEl = null;

        /* Als Blatt (seit v0.156.0) trägt das Blatt Titel und Zurück; als
           Seite (ohne den Baustein) wie bisher ein Fenster mit Pfeil. */
        const alsBlatt = typeof TABS !== "undefined" && Array.isArray(TABS._blattTabs)
            && TABS._blattTabs.indexOf(EINSTELLUNGEN.id) !== -1;
        if (!alsBlatt) {
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
        }

        const inhalt = EINSTELLUNGEN._element("div", "einstellungen-inhalt");
        wurzel.appendChild(inhalt);
        UPCREW_EINSTELLUNGEN.bauen(inhalt, "einstellungen", EINSTELLUNGEN.abschnitte(),
            { spiel: "Blunderluck" });
        EINSTELLUNGEN.statusAktualisieren();
    },

    /*
     * DIE ABSCHNITTE (seit v0.156.0 im gemeinsamen Aufbau
     * js\upcrew-einstellungen.js, Nutzer 28.09.2026: „verwalten und die
     * einstellungen sollen in beiden spielen gleich aussehen"). Die
     * Reihenfolge legt der Baustein fest; hier steht nur, was Blunderluck
     * hat. Spiel-Eigenes (Vibration, Schach lernen, Verlauf) steht im
     * Abschnitt „Nur in Blunderluck".
     */
    abschnitte() {
        return [
            EINSTELLUNGEN._kontoAbschnitt(),
            EINSTELLUNGEN._aussehenAbschnitt(),
            EINSTELLUNGEN._privatAbschnitt(),
            EINSTELLUNGEN._spielAbschnitt(),
            { art: "hilfe", zeilen: [
                { zeichen: "hilfe", titel: "Wunsch oder Fehler melden", rechts: "pfeil",
                    beiKlick: () => WUNSCH.oeffnen() }
            ] },
            EINSTELLUNGEN._adminAbschnitt(),
            EINSTELLUNGEN._ueberAbschnitt(),
            EINSTELLUNGEN._gefahrAbschnitt()
        ];
    },

    /* ---------------------------------------------------------------- *
     * 1. Das UPCrew-Konto
     *
     * Gezeichnet wird nur mit ICH (Gerätespeicher) und dem, was ANMELDUNG
     * schon weiss; ANMELDUNG wird sonst erst in den Klick-Behandlern
     * angefasst — so bleibt der Bildschirm auch ohne die Anmelde-Schicht
     * zeichenbar (Regressionstest gegen das nachgebaute DOM).
     *
     * Abmelden und Löschen bleiben ZWEI Knöpfe mit sehr verschiedener
     * Tragweite (Bündel A, Schritt 1): Abmelden vergisst nur die Anmeldung
     * auf diesem Gerät, Löschen nimmt das Konto aus ALLEN UPCrew-Spielen.
     * Deshalb ist nur Löschen rot, steht ganz unten und fragt nach.
     * ---------------------------------------------------------------- */

    _kontoEintrag() {
        const mitKonto = (typeof KONTO !== "undefined" && KONTO.aktiv()
            && typeof ANMELDUNG !== "undefined" && ANMELDUNG.abgleich);
        return mitKonto ? ANMELDUNG.ich() : null;
    },

    _kontoAbschnitt() {
        const person = ICH.person();
        if (!person) {
            return { art: "konto", zeilen: [{ zeichen: "person", titel: "Nicht angemeldet" }] };
        }

        /* Mit UPCrew-Konto (seit v0.138.0): Name MIT Nummer und die Rolle;
           ein Gast sieht, dass sein Stand nur hier liegt. */
        const eintrag = EINSTELLUNGEN._kontoEintrag();
        const rolle = eintrag ? KONTO.rolleVon(ANMELDUNG.abgleich.daten, eintrag.uid) : "";
        const zeilen = [{
            zeichen: "person",
            titel: eintrag ? eintrag.name : person.name,
            tag: eintrag ? KONTO.tagZusatz(eintrag) : "",
            unter: (eintrag && eintrag.gast === true) ? "Gast · dieses Gerät" : (rolle || "Angemeldet"),
            klasse: "einstellungen-ich"
        }];

        if (eintrag && eintrag.gast === true) {
            zeilen.push({ zeichen: "hoch", titel: "Spielstand sichern", unter: "Konto anlegen",
                rechts: "pfeil", beiKlick: () => ANMELDUNG.gastSichernOeffnen() });
        }
        if (eintrag && eintrag.gast !== true) {
            zeilen.push({ zeichen: "person", titel: "Name ändern", rechts: "pfeil",
                beiKlick: () => ANMELDUNG.namenAendern(ANMELDUNG.ich()) });
            if (typeof ANMELDUNG.nummerAendern === "function") {
                zeilen.push({ zeichen: "liste", titel: "Nummer ändern", rechts: "pfeil",
                    beiKlick: () => ANMELDUNG.nummerAendern(ANMELDUNG.ich()).then(() => EINSTELLUNGEN._zeichnen()) });
            }
            zeilen.push({ zeichen: "schloss", titel: "Passwort ändern", rechts: "pfeil",
                beiKlick: () => ANMELDUNG.passwortAendern(ANMELDUNG.ich()) });
        }
        zeilen.push({ zeichen: "verlassen", titel: "Abmelden", beiKlick: () => ANMELDUNG.abmelden() });
        return { art: "konto", zeilen: zeilen };
    },

    /* ---------------------------------------------------------------- *
     * 2. Aussehen — gilt über das gemeinsame UPCrew-Aussehen auch in
     *    Typoluck (seit v0.144.0). Fehlt ein Baustein (Bildschirm-Tests),
     *    bleibt seine Zeile weg.
     * ---------------------------------------------------------------- */

    _aussehenAbschnitt() {
        const zeilen = [];
        if (typeof DARSTELLUNG !== "undefined") {
            zeilen.push({ zeichen: "farbe", titel: "Darstellung",
                rechts: UPCREW_EINSTELLUNGEN.segment([
                    { wert: "geraet", text: "Auto" },
                    { wert: "hell", text: "Hell" },
                    { wert: "dunkel", text: "Dunkel" }
                ], DARSTELLUNG.thema(), (wert) => {
                    DARSTELLUNG.themaSetzen(wert);
                    EINSTELLUNGEN._zeichnen();
                }, "Darstellung") });
        }
        /* Den Schalter „Standard-Schrift" gibt es seit v0.157.0 nicht mehr
           (Nutzer 29.09.2026: „brauchen wir eigentlich nicht"). */
        if (typeof SAMMLUNG !== "undefined") {
            zeilen.push({ zeichen: "sammlung", titel: "Anpassen", unter: "Farbwelt · Schrift · Knöpfe",
                rechts: "pfeil", beiKlick: () => TABS.wechseln(SAMMLUNG.id) });
        }
        return { art: "aussehen", zeilen: zeilen };
    },

    /* ---------------------------------------------------------------- *
     * 3. Privatsphäre — Spielzeit öffentlich zeigen? (seit v0.155.0,
     *    Nutzer 28.09.2026: „okay privat"). Standard
     *    `FORTSCHRITT.SPIELZEIT_OEFFENTLICH_STANDARD` (aus). Seit v0.155.2
     *    AM KONTO (`spielzeitOeffentlich`, geschrieben über den
     *    Spieler-Abgleich wie Freunde und Abzeichen). Ohne Anmeldung keine
     *    Zeile.
     * ---------------------------------------------------------------- */

    _privatAbschnitt() {
        const ichSelbst = (typeof ANMELDUNG !== "undefined" && typeof ANMELDUNG.ich === "function")
            ? ANMELDUNG.ich() : null;
        if (!ichSelbst || typeof FORTSCHRITT === "undefined"
                || typeof FORTSCHRITT.spielzeitOeffentlichVon !== "function") {
            return { art: "privatsphaere", zeilen: [] };
        }
        return { art: "privatsphaere", zeilen: [
            { zeichen: "uhr", titel: "Spielzeit", unter: "Standard privat",
                rechts: UPCREW_EINSTELLUNGEN.segment([
                    { wert: false, text: "Privat" },
                    { wert: true, text: "Öffentlich" }
                ], FORTSCHRITT.spielzeitOeffentlichVon(ichSelbst), (wert) => {
                    ANMELDUNG.abgleich.aendern(SPIELER.spielzeitOeffentlichSetzen(
                        ANMELDUNG.abgleich.daten, ichSelbst.id, wert), false);
                    EINSTELLUNGEN._zeichnen();
                }, "Spielzeit") }
        ] };
    },

    /* ---------------------------------------------------------------- *
     * 4. Nur in Blunderluck — Vibration (dieses Gerät, seit v0.140.0; das
     *    iPhone lässt Web-Apps nicht vibrieren), Schach lernen und die
     *    vergangenen Matches.
     * ---------------------------------------------------------------- */

    _spielAbschnitt() {
        const zeilen = [];
        const kannVibrieren = (typeof FUEHLEN !== "undefined") && FUEHLEN.verfuegbar();
        const an = (typeof FUEHLEN === "undefined") || FUEHLEN.an();
        zeilen.push({ zeichen: "vibration", titel: "Vibration", unter: "dieses Gerät",
            rechts: kannVibrieren
                ? UPCREW_EINSTELLUNGEN.segment([
                    { wert: true, text: "An" },
                    { wert: false, text: "Aus" }
                ], an, (wert) => {
                    FUEHLEN.anSetzen(wert);
                    /* Man spürt sofort, was man eingeschaltet hat. */
                    FUEHLEN.tippen();
                    EINSTELLUNGEN._zeichnen();
                }, "Vibration")
                : "nicht möglich" });
        if (typeof TEAM_SCHACH !== "undefined" && typeof TEAM_SCHACH.grundlagenOeffnen === "function") {
            zeilen.push({ zeichen: "figur", titel: "Schach lernen", unter: "Figuren · Matt",
                rechts: "pfeil", beiKlick: () => {
                    TABS.wechseln("team-schach");
                    TEAM_SCHACH.grundlagenOeffnen();
                } });
        }
        if (typeof START !== "undefined" && typeof START.verlaufOeffnen === "function") {
            zeilen.push({ zeichen: "liste", titel: "Vergangene Matches", rechts: "pfeil",
                beiKlick: () => START.verlaufOeffnen() });
        }
        return { art: "spiel", zeilen: zeilen };
    },

    /* ---------------------------------------------------------------- *
     * 5. Admin — EIN Eintrag statt einer eingebetteten Mitspieler-Liste
     *    (seit v0.100.0). Mit UPCrew-Konto nur für Admins (seit v0.138.0;
     *    ICH fragt dann die Rolle). Die Verwaltung öffnet als Blatt darüber.
     * ---------------------------------------------------------------- */

    _adminAbschnitt() {
        const nurAdmins = (typeof KONTO !== "undefined" && KONTO.aktiv());
        if (nurAdmins && !ICH.verwaltungAktiv()) {
            return { art: "admin", zeilen: [] };
        }
        return { art: "admin", zeilen: [
            { zeichen: "werkzeug", titel: "Verwaltung", unter: "nur Admin", rechts: "pfeil",
                beiKlick: () => ANMELDUNG.verwaltungOeffnen() }
        ] };
    },

    /* ---------------------------------------------------------------- *
     * 6. Über Blunderluck — Version und Verbindung
     *
     * Die Versionsanzeige (seit v0.25.0 hier) steht wie in Typoluck ohne
     * vorangestelltes v. Die Verbindung (seit v0.15.0, Wunsch 2) ist seit
     * v0.157.0 die Zeile „Speicher" mit STATUS-LAMPE des Bausteins (Nutzer
     * 29.09.2026: „bei speicher mache eine status lampe rein"): grün
     * gespeichert, gelb wartet, rot keine Verbindung — aus dem echten
     * Abgleich-Zustand (`lampeZustand`); die Meldung beim Darüberfahren.
     * ---------------------------------------------------------------- */

    lampeEl: null,

    /* Die Löse-Funktion aus `UPCREW_OFFLINE.lampe` (seit v0.167.1,
       EINBAU-OFFLINE.md): beim Neuzeichnen und Schliessen gerufen, damit
       nach mehrmaligem Öffnen nur die aktuelle Lampe angemeldet ist. */
    _lampeLoeser: null,

    _lampeLoesen() {
        const loesen = EINSTELLUNGEN._lampeLoeser;
        EINSTELLUNGEN._lampeLoeser = null;
        if (typeof loesen === "function") {
            loesen();
        }
    },

    /* APP.status (laedt, bereit, schreibt, fehler) → Lampe. Ohne Netz ist
       sie grau „Offline · später" (seit v0.167.0, Baustein; bis v0.166.4
       rot), auch wenn der letzte Abgleich noch „bereit" meldete. Ein
       Fehlschlag MIT Netz heisst „wartet": Die Änderung bleibt offen und wird
       wiederholt (js\abgleich.js) — ohne Netz übernimmt der Offline-Hinweis. */
    lampeZustand(status, online) {
        if (online === false) {
            return "offline";
        }
        return status === "bereit" ? "gespeichert" : "wartet";
    },

    /* „Ohne Netz" heisst seit v0.167.0: der Offline-Hinweis steht (nach
       1,2 s, `UPCREW_OFFLINE.sichtbar`) — sonst wie bisher das Gerät. */
    _lampeJetzt() {
        const stand = (typeof APP !== "undefined" && APP.status) ? APP.status : "laedt";
        let online;
        if (typeof UPCREW_OFFLINE !== "undefined" && typeof UPCREW_OFFLINE.sichtbar === "function") {
            online = !UPCREW_OFFLINE.sichtbar();
        } else {
            online = (typeof navigator !== "undefined" && typeof navigator.onLine === "boolean")
                ? navigator.onLine : true;
        }
        return EINSTELLUNGEN.lampeZustand(stand, online);
    },

    _ueberAbschnitt() {
        const version = EINSTELLUNGEN._element("span", "up-es-wert version",
            typeof KONFIG !== "undefined" ? KONFIG.APP_VERSION : "");
        const speicher = UPCREW_EINSTELLUNGEN.speicherZeile(EINSTELLUNGEN._lampeJetzt());
        EINSTELLUNGEN.lampeEl = speicher.lampe;
        if (typeof UPCREW_OFFLINE !== "undefined" && speicher.lampe) {
            EINSTELLUNGEN._lampeLoesen();
            EINSTELLUNGEN._lampeLoeser = UPCREW_OFFLINE.lampe(speicher.lampe);
        }
        return { art: "ueber", zeilen: [
            { zeichen: "info", titel: "Über Blunderluck", unter: "von UPCrew", rechts: version },
            speicher
        ] };
    },

    /* 7. Ganz unten, rot und mit Rückfrage: das Konto löschen. */
    _gefahrAbschnitt() {
        if (!ICH.person()) {
            return { art: "gefahr", zeilen: [] };
        }
        const knopf = EINSTELLUNGEN._element("button", "up-es-zeile up-es-gefahr", "UPCrew-Konto löschen");
        knopf.type = "button";
        return { art: "gefahr", zeilen: [], inhalt: (() => {
            const gruppe = EINSTELLUNGEN._element("div", "up-es-gruppe");
            gruppe.appendChild(DIALOG.zweiSchritt(knopf, () => ANMELDUNG.austreten()));
            return gruppe;
        })() };
    },

    /* Gerufen beim Zeichnen und aus APP.statusZeigen, solange die Karte
       hängt. Ohne Karte ist nichts zu tun — der Stand steht in app.js. */
    statusAktualisieren() {
        const lampe = EINSTELLUNGEN.lampeEl;
        if (!lampe) {
            return;
        }
        if (typeof lampe.setzen === "function") {
            lampe.setzen(EINSTELLUNGEN._lampeJetzt());
        }
        const text = (typeof APP !== "undefined") ? (APP.statusText || "") : "";
        const technik = (typeof APP !== "undefined") ? (APP.statusTechnik || "") : "";
        lampe.title = [text, technik].filter((t) => t).join(" · ");
    },

    /* ---------------------------------------------------------------- *
     * Bausteine dieses Bildschirms (Muster: Typoluck BAUSTEINE)
     * ---------------------------------------------------------------- */

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
