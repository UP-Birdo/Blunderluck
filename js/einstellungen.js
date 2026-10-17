/*
 * einstellungen.js — der Bildschirm Einstellungen.
 *
 * SEIT v0.156.0 IM GEMEINSAMEN AUFBAU js\upcrew-einstellungen.js (Nutzer
 * 28.09.2026: „verwalten und die einstellungen sollen in beiden spielen
 * gleich aussehen"; Entwurf Oberfläche Runde 7) und als BLATT über dem
 * Start (js\upcrew-blatt.js). Die Reihenfolge der Abschnitte legt der
 * Baustein fest:
 *
 *   1. UPCREW-KONTO · ALLE SPIELE — seit v0.172.0 aus dem Baustein
 *      js\upcrew-konto.js (dazu Admin und Gefahr); hier nur die Haken
 *      (`kontoEinrichten`).
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
 *   8. ganz unten, rot, mit Rückfrage: UPCrew-Konto löschen (Baustein).
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

    /* Beim Schliessen die Lampe beim Offline-Hinweis
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

        /* Als Blatt trägt das Blatt Titel und Zurück; als
           Seite (ohne den Baustein) wie bisher ein Fenster mit Pfeil. */
        const alsBlatt = Array.isArray(TABS._blattTabs)
            && TABS._blattTabs.indexOf(EINSTELLUNGEN.id) !== -1;
        if (!alsBlatt) {
            if (TABS.rundeSetzen) {
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
        /* Konto, Admin, Gefahr aus dem Baustein (seit v0.172.0; seit
           v0.173.0 ohne Altweg: die Zeile „Verwaltung“ nur für Admins). */
        const konto = EINSTELLUNGEN.kontoEinrichten() ? UPCREW_KONTO.abschnitte() : [];
        return konto.concat([
            EINSTELLUNGEN._aussehenAbschnitt(),
            EINSTELLUNGEN._privatAbschnitt(),
            EINSTELLUNGEN._spielAbschnitt(),
            { art: "hilfe", zeilen: [
                { zeichen: "hilfe", titel: "Wunsch oder Fehler melden", rechts: "pfeil",
                    beiKlick: () => WUNSCH.oeffnen() }
            ] },
            EINSTELLUNGEN._ueberAbschnitt()
        ]);
    },

    /* ---------------------------------------------------------------- *
     * 1. Das UPCrew-Konto — seit v0.172.0 der gemeinsame Baustein
     *    js\upcrew-konto.js (Abschnitte Konto, Admin, Gefahr; Texte und
     *    Abläufe gleich in allen UPCrew-Apps, EINBAU-VERWALTUNG.md). Hier
     *    stehen nur die HAKEN von Blunderluck — dasselbe Objekt nimmt auch
     *    die Verwaltung (js\upcrew-verwaltung.js).
     * ---------------------------------------------------------------- */

    _kontoEingerichtet: false,

    /* Richtet beide Bausteine einmal ein (gerufen aus app.js und beim
       Zeichnen). Liefert, ob der Baustein bereit ist. */
    kontoEinrichten() {
        if (typeof UPCREW_KONTO === "undefined") {
            return false;
        }
        if (EINSTELLUNGEN._kontoEingerichtet) {
            return true;
        }
        UPCREW_KONTO.einrichten({
            app: "Blunderluck",
            daten: () => (ANMELDUNG.abgleich ? ANMELDUNG.abgleich.daten : null),
            speicher: () => (ANMELDUNG.abgleich ? ANMELDUNG.abgleich.speicher : null),
            nachladen: () => ANMELDUNG._kontoNachladen(),
            nachAbmelden: async () => {
                ICH.personVergessen();
                ANMELDUNG._ichIdSetzen(null);
                ANMELDUNG.anmelden();
            },
            ich: () => (ANMELDUNG.abgleich ? ANMELDUNG.ich() : null),
            nachLoeschen: async () => {
                ICH.personVergessen();
                ANMELDUNG._ichIdSetzen(null);
                await ANMELDUNG._kontoNachladen();
                ANMELDUNG.anmelden();
            },
            nachGastSichern: (eintrag) => {
                if (eintrag) {
                    ANMELDUNG._uebernehmen(eintrag);
                }
                /* Spielzeit, „dabei seit“ und der übrige Gast-Stand vom Gerät
                   ziehen mit (seit v0.155.0), der Besitz aus dem Shop an
                   derselben Stelle und auf dieselbe Art. */
                if (typeof FORTSCHRITT_KONTO !== "undefined") {
                    FORTSCHRITT_KONTO.gastUebernehmen();
                }
                if (typeof BESITZ !== "undefined") {
                    BESITZ.gastUebernehmen();
                }
            },
            nachKonto: (art, eintrag) => {
                if (art === "name" && eintrag) {
                    ICH.personSetzen(eintrag.id, eintrag.name);
                }
                ANMELDUNG._anzeigenAuffrischen();
            },
            verwaltungOeffnen: () => ANMELDUNG.verwaltungOeffnen(),
            verwaltungSichtbar: () => typeof UPCREW_FREIGABE === "undefined"
                || UPCREW_FREIGABE.darf("verwaltung"),
            spalten: [
                { titel: "Freunde", wert: (spieler) => String(Array.isArray(spieler.freunde) ? spieler.freunde.length : 0) },
                { titel: "Spielzeit", wert: (spieler) => EINSTELLUNGEN.spielzeitText(spieler) }
            ],
            spielerWerte: EINSTELLUNGEN.spielerWerte(),
            spiel: () => VERWALTUNGS_BILDSCHIRM._spielAbschnitt(),
            nachAenderung: () => ANMELDUNG._anzeigenAuffrischen()
        });
        /* Kurzmeldungen wie im übrigen Blunderluck (erlaubt laut Einbau). */
        if (typeof DIALOG !== "undefined" && typeof DIALOG.kurzmeldung === "function") {
            UPCREW_KONTO.dialog.kurzmeldung = (text) => DIALOG.kurzmeldung(text);
        }
        EINSTELLUNGEN._kontoEingerichtet = true;
        return true;
    },

    /* „N min" / „Nh+" aus dem Konto-Fortschritt, „–" ohne (Gast, alt) —
       Spalte „Spielzeit“ der Verwaltung (Admins sehen sie immer). */
    spielzeitText(spieler) {
        if (typeof FORTSCHRITT === "undefined" || typeof FORTSCHRITT.spielzeitText !== "function"
                || !spieler || !spieler.fortschritt) {
            return "–";
        }
        return FORTSCHRITT.spielzeitText(FORTSCHRITT.spielzeitSumme(spieler.fortschritt));
    },

    /* Die Rechner der Spielerliste (seit v0.152.1): Level und Serie
       (FORTSCHRITT, über alle Zweige, ohne Serien-Schutz), Abzeichen
       (UPCREW_ABZEICHEN), Münzen (UPCREW_MUENZEN, Saldo über alle Zweige —
       ehrlich, also auch ein kurzes Minus). */
    spielerWerte() {
        const serie = (stand) => FORTSCHRITT.serie(stand, FORTSCHRITT.datumVon(Date.now()), 0).tage;
        return {
            level: (stand) => ({ level: FORTSCHRITT.level(stand).level, xp: FORTSCHRITT.gesamtXp(stand) }),
            serie: serie,
            abzeichen: (stand) => {
                if (typeof UPCREW_ABZEICHEN === "undefined") {
                    return null;
                }
                const liste = UPCREW_ABZEICHEN.liste(FORTSCHRITT.normalisieren(stand), serie(stand));
                return { erreicht: liste.filter((e) => e.erreicht > 0).length, alle: liste.length };
            },
            muenzen: (eintrag) => ((typeof UPCREW_MUENZEN !== "undefined")
                ? UPCREW_MUENZEN.saldo(eintrag.fortschritt || null) : undefined)
        };
    },

    /* ---------------------------------------------------------------- *
     * 2. Aussehen — gilt über das gemeinsame UPCrew-Aussehen auch in
     *    Typoluck. Fehlt ein Baustein (Bildschirm-Tests),
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
        const ichSelbst = (typeof ANMELDUNG.ich === "function")
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
        if (typeof TEAM_SCHACH.grundlagenOeffnen === "function") {
            zeilen.push({ zeichen: "figur", titel: "Schach lernen", unter: "Figuren · Matt",
                rechts: "pfeil", beiKlick: () => {
                    TABS.wechseln("team-schach");
                    TEAM_SCHACH.grundlagenOeffnen();
                } });
        }
        if (typeof START.verlaufOeffnen === "function") {
            zeilen.push({ zeichen: "liste", titel: "Vergangene Matches", rechts: "pfeil",
                beiKlick: () => START.verlaufOeffnen() });
        }
        return { art: "spiel", zeilen: zeilen };
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
        const zeilen = [
            { zeichen: "info", titel: "Über Blunderluck", unter: "von UPCrew", rechts: version },
            speicher
        ];
        /* Beta-Zugang (seit v0.171.0, Freigabe-Kanal): nur für Rolle beta/admin
           sichtbar — Gast und alle anderen sehen die Zeile nicht. */
        const rolle = EINSTELLUNGEN.betaRolle();
        if (rolle) {
            zeilen.push({ zeichen: "schild", titel: "Beta-Zugang",
                unter: rolle === "admin" ? "Als Admin" : "Neues früher",
                rechts: UPCREW_EINSTELLUNGEN.wert("Aktiv") });
        }
        return { art: "ueber", zeilen: zeilen };
    },

    /* Die Rolle aus dem Freigabe-Kanal: "beta" | "admin" | null (Gast, ohne Rolle, ohne Baustein). */
    betaRolle() {
        if (typeof UPCREW_FREIGABE === "undefined" || typeof UPCREW_FREIGABE.rolle !== "function") {
            return null;
        }
        const r = UPCREW_FREIGABE.rolle();
        return (r === "beta" || r === "admin") ? r : null;
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
