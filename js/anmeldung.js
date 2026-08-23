/*
 * anmeldung.js — Anmeldung, Profil und Verwaltung der Spielerliste.
 *
 * Das Gegenstück zu spieler.js: Dort steht, WIE die Daten aussehen, hier
 * steht der Ablauf am Bildschirm. Einen eigenen Tab gibt es nicht — die
 * Anmeldung ist ein VOLLBILD beim Start (seit v0.8.0, Bündel A Schritt 3);
 * Profil und Verwaltung hängen im Tab Einstellungen (einstellungen.js ruft
 * die Funktionen hier auf).
 *
 * Drei Wege in die Runde:
 *   1. Das Gerät kennt seinen Spieler schon — kein Bild, direkt hinein.
 *   2. Vorhandenes Konto: Benutzername eintippen, mit dem Passwort
 *      ausweisen. Das geht von jedem Gerät aus.
 *   3. Neues Konto: Name und Passwort festlegen (doppelte Eingabe).
 *
 * Seit v0.7.0 (Bündel A, Schritt 2) ist die 4-stellige PIN ein Passwort mit
 * 4 bis 8 Zeichen (Regel: SPIELER.passwortPruefen). Die Datenfelder heissen
 * weiter pinPruefwert/pinSalz (additiver Datenvertrag), die Prüfsummen-Zutat
 * blieb unangetastet — alte PINs gelten deshalb weiter.
 */

const ANMELDUNG = {

    /* Wird von app.js gesetzt. */
    abgleich: null,

    /* Kennung des eigenen Spielers (erst nach dem Anmelden gesetzt). */
    ichId: null,

    /*
     * Läuft gerade eine Anmeldung (das Vollbild ist offen)? Solange ja,
     * darf keine zweite starten — datenAktualisiert würde sonst mitten in
     * einer Eingabe ein zweites Bild darüberlegen.
     */
    anmeldenLaeuft: false,

    /* Der Behälter des Anmelde-Vollbilds (das <div id="anmeldung"> aus
       index.html). Wird von app.js gesetzt. */
    wurzelEl: null,

    verbinden(abgleich) {
        ANMELDUNG.abgleich = abgleich;
    },

    aufbauen(behaelter) {
        ANMELDUNG.wurzelEl = behaelter;
    },

    /* Setzt an einer Stelle, wer an diesem Gerät sitzt — die Abgleich-Schicht
       braucht das, um beim Schreiben den eigenen Eintrag zu erkennen. */
    _ichIdSetzen(id) {
        ANMELDUNG.ichId = id;
        ANMELDUNG.abgleich.eigeneIdSetzen(id);
    },

    /* Der eigene Eintrag aus dem aktuellen Stand, oder null. */
    ich() {
        if (!ANMELDUNG.abgleich || !ANMELDUNG.ichId) {
            return null;
        }
        return SPIELER.spielerFinden(ANMELDUNG.abgleich.daten, ANMELDUNG.ichId);
    },

    /*
     * Wird nach jedem geholten Stand gerufen (app.js). Einzige Aufgabe:
     * merken, wenn der eigene Spieler über die Verwaltung entfernt wurde —
     * dann wird das Gerät abgemeldet und fragt neu.
     * (Dass er durch ein Überschreiben verschwindet, verhindert
     * SPIELER.zusammenfuehren.)
     */
    datenAktualisiert(daten) {
        if (!ANMELDUNG.ichId || ANMELDUNG.anmeldenLaeuft) {
            return;
        }
        if (!SPIELER.spielerFinden(daten, ANMELDUNG.ichId)) {
            ANMELDUNG._ichIdSetzen(null);
            ICH.personVergessen();
            ANMELDUNG.anmelden();
        }
    },

    /* ---------------------------------------------------------------- *
     * Anmelden — das Vollbild (seit v0.8.0, Bündel A Schritt 3)
     *
     * Solange auf diesem Gerät niemand angemeldet ist, liegt ein
     * vollflächiger Bildschirm über der ganzen App: erst die Weiche
     * (vorhandenes oder neues Konto), dahinter je ein Formular. Die
     * Dialog-Kette von früher gibt es nicht mehr; DIALOG dient nur noch
     * den Sonderfällen (Konto ohne Passwort, dreimal falsch) und liegt
     * ÜBER dem Vollbild (Ebenen in css\stil.css).
     *
     * Wer einmal angemeldet ist, sieht das Bild nie wieder — bis er sich
     * abmeldet oder sein Eintrag über die Verwaltung entfernt wird
     * (datenAktualisiert).
     * ---------------------------------------------------------------- */

    anmelden() {
        if (ANMELDUNG.anmeldenLaeuft) {
            return;
        }

        /* Weg 1: bekanntes Gerät, Spieler existiert noch — kein Bild. */
        const person = ICH.person();
        if (person) {
            const bekannt = SPIELER.spielerFinden(ANMELDUNG.abgleich.daten, person.id);
            if (bekannt) {
                ANMELDUNG._ichIdSetzen(bekannt.id);
                if (bekannt.name !== person.name) {
                    ICH.personSetzen(bekannt.id, bekannt.name);
                }
                ANMELDUNG._anzeigenAuffrischen();
                return;
            }
        }

        ANMELDUNG._vollbildZeigen();
    },

    _vollbildZeigen() {
        if (!ANMELDUNG.wurzelEl) {
            return;
        }
        ANMELDUNG.anmeldenLaeuft = true;
        ANMELDUNG.wurzelEl.hidden = false;
        ANMELDUNG._weicheZeigen();
    },

    /* Angemeldet: Das Bild verschwindet, die App dahinter wird aufgefrischt. */
    _vollbildSchliessen() {
        ANMELDUNG.anmeldenLaeuft = false;
        if (ANMELDUNG.wurzelEl) {
            ANMELDUNG.wurzelEl.hidden = true;
            ANMELDUNG.wurzelEl.innerHTML = "";
        }
        ANMELDUNG._anzeigenAuffrischen();
    },

    /* Die Weiche: zwei grosse Knöpfe, man MUSS sich entscheiden. */
    _weicheZeigen() {
        const kasten = ANMELDUNG._kastenBauen(
            "Blunderluck",
            "Schach mit Lootboxen. Melde dich an, um mitzuspielen."
        );

        kasten.appendChild(ANMELDUNG._knopfBauen(
            "Vorhandenes Konto", "knopf-haupt anmeldung-knopf",
            () => ANMELDUNG._vorhandenesKontoZeigen()));

        kasten.appendChild(ANMELDUNG._knopfBauen(
            "Neues Konto erstellen", "knopf-still anmeldung-knopf",
            () => ANMELDUNG._neuesKontoZeigen()));
    },

    /*
     * Vorhandenes Konto: Benutzername eintippen (ohne Rücksicht auf
     * Gross-/Kleinschreibung gesucht), Passwort dazu — erst dann kommt man
     * hinein. Eine alte 4-stellige PIN gilt weiter als Passwort.
     *
     * Nach drei falschen Passwörtern geht es mit einem Hinweis zurück auf
     * die Weiche — die alte Dreier-Grenze, angepasst ans Vollbild, damit
     * keine Sackgasse entsteht (Entwurf, Frage F5).
     */
    _vorhandenesKontoZeigen() {
        const kasten = ANMELDUNG._kastenBauen(
            "Vorhandenes Konto",
            "Melde dich mit Benutzername und Passwort an — das geht von "
                + "jedem Gerät aus. Eine alte 4-stellige PIN gilt weiter."
        );

        const name = ANMELDUNG._feldBauen(kasten, "Benutzername", false);
        const passwort = ANMELDUNG._feldBauen(kasten, "Passwort", true);

        const anmelden = ANMELDUNG._knopfBauen(
            "Anmelden", "knopf-haupt anmeldung-knopf anmeldung-weiter", null);

        const pruefen = () => {
            anmelden.disabled = (name.feld.value.trim() === ""
                || passwort.feld.value === "");
        };
        name.feld.addEventListener("input", pruefen);
        passwort.feld.addEventListener("input", pruefen);
        pruefen();

        let fehlversuche = 0;

        anmelden.addEventListener("click", async () => {
            if (anmelden.disabled) {
                return;
            }
            anmelden.disabled = true;

            const spieler = SPIELER.spielerNachName(
                ANMELDUNG.abgleich.daten, name.feld.value);

            if (!spieler) {
                name.fehler.textContent = "Diesen Namen gibt es hier nicht. "
                    + "Neu hier? Dann erstell ein neues Konto.";
                pruefen();
                return;
            }
            name.fehler.textContent = "";

            /* Ohne Passwort angelegt (sollte nicht vorkommen — es ist
               Pflicht): Nachfrage, dann MUSS eins vergeben werden, damit
               die Lücke sich nicht fortsetzt. Der Dialog liegt über dem
               Vollbild. */
            if (!SPIELER.hatPin(spieler)) {
                const binIch = await DIALOG.frage(
                    "Ohne Passwort angelegt",
                    spieler.name + " hat kein Passwort hinterlegt, deshalb "
                        + "lässt sich das hier nicht prüfen. Bist du das "
                        + "wirklich?",
                    "Ja, das bin ich"
                );
                if (!binIch) {
                    pruefen();
                    return;
                }
                ANMELDUNG._uebernehmen(spieler);
                await ANMELDUNG._passwortVergeben(
                    spieler.id,
                    "Jetzt fehlt nur noch dein Passwort. Damit kommst du "
                        + "künftig von jedem Gerät wieder als du selbst hinein."
                );
                ANMELDUNG._vollbildSchliessen();
                return;
            }

            const richtig = await VERSIEGELUNG.pinPruefen(
                passwort.feld.value, spieler.pinSalz, spieler.pinPruefwert);

            if (richtig) {
                ANMELDUNG._uebernehmen(spieler);
                ANMELDUNG._vollbildSchliessen();
                return;
            }

            fehlversuche += 1;
            if (fehlversuche >= 3) {
                await DIALOG.hinweis(
                    "Dreimal falsch",
                    "Das Passwort stimmt nicht. Vergessen? Dann muss dich "
                        + "jemand mit dem Verwaltungs-Zugang aus der Runde "
                        + "entfernen."
                );
                ANMELDUNG._weicheZeigen();
                return;
            }

            passwort.feld.value = "";
            passwort.fehler.textContent = "Das war nicht richtig. Noch "
                + (3 - fehlversuche)
                + (fehlversuche === 2 ? " Versuch." : " Versuche.");
            pruefen();
        });

        kasten.appendChild(anmelden);
        ANMELDUNG._eingabetaste([name, passwort], anmelden);

        kasten.appendChild(ANMELDUNG._knopfBauen(
            "Zurück", "knopf-still anmeldung-knopf",
            () => ANMELDUNG._weicheZeigen()));

        name.feld.focus();
    },

    /*
     * Neues Konto: Benutzername, Passwort und Wiederholung auf EINEM Bild.
     * Jede Regel meldet sich sofort unter ihrem Feld — nicht erst nach dem
     * Absenden —, und der Erstellen-Knopf wird erst frei, wenn alle drei
     * Felder gültig sind.
     */
    _neuesKontoZeigen() {
        const kasten = ANMELDUNG._kastenBauen(
            "Neues Konto",
            "Diesen Namen sehen die anderen in der Runde."
        );

        const name = ANMELDUNG._feldBauen(kasten, "Benutzername", false);
        const passwort = ANMELDUNG._feldBauen(kasten,
            "Passwort (" + SPIELER.PASSWORT_MIN + " bis " + SPIELER.PASSWORT_MAX
                + " Zeichen, Gross-/Kleinschreibung zählt)", true);
        const wiederholung = ANMELDUNG._feldBauen(kasten,
            "Passwort wiederholen", true);

        const weiter = ANMELDUNG._knopfBauen(
            "Konto erstellen", "knopf-haupt anmeldung-knopf anmeldung-weiter",
            null);

        const pruefen = () => {
            let gueltig = true;

            /* Der Name darf noch nicht vergeben sein — derselbe Vergleich
               ohne Gross-/Kleinschreibung wie überall, sonst gäbe es
               „Anna" und „anna" nebeneinander. */
            const nameWert = name.feld.value.trim();
            let nameFehler = "";
            if (nameWert === "") {
                gueltig = false;
            } else if (SPIELER.spielerNachName(ANMELDUNG.abgleich.daten, nameWert)) {
                nameFehler = "Dieser Name ist schon vergeben.";
                gueltig = false;
            }
            name.fehler.textContent = nameFehler;

            const passwortWert = passwort.feld.value;
            const passwortFehler = (passwortWert === "")
                ? "" : SPIELER.passwortPruefen(passwortWert);
            if (passwortWert === "" || passwortFehler !== "") {
                gueltig = false;
            }
            passwort.fehler.textContent = passwortFehler;

            let wiederholungFehler = "";
            if (wiederholung.feld.value === "") {
                gueltig = false;
            } else if (wiederholung.feld.value !== passwortWert) {
                wiederholungFehler = "Die beiden Passwörter stimmen nicht überein.";
                gueltig = false;
            }
            wiederholung.fehler.textContent = wiederholungFehler;

            weiter.disabled = !gueltig;
        };

        name.feld.addEventListener("input", pruefen);
        passwort.feld.addEventListener("input", pruefen);
        wiederholung.feld.addEventListener("input", pruefen);
        pruefen();

        weiter.addEventListener("click", () => {
            if (weiter.disabled) {
                return;
            }
            weiter.disabled = true;
            ANMELDUNG._neuesKontoAnlegen(
                name.feld.value.trim(), passwort.feld.value);
        });

        kasten.appendChild(weiter);
        ANMELDUNG._eingabetaste([name, passwort, wiederholung], weiter);

        kasten.appendChild(ANMELDUNG._knopfBauen(
            "Zurück", "knopf-still anmeldung-knopf",
            () => ANMELDUNG._weicheZeigen()));

        name.feld.focus();
    },

    async _neuesKontoAnlegen(name, passwort) {
        const abgleich = ANMELDUNG.abgleich;
        const spielerId = SPIELER.idErzeugen();

        /* Erst bekannt machen, wer wir sind — die Abgleich-Schicht braucht das
           beim Schreiben, um den eigenen Eintrag zu erkennen. */
        ANMELDUNG._ichIdSetzen(spielerId);
        ICH.personSetzen(spielerId, name);

        abgleich.aendern(
            SPIELER.spielerHinzufuegen(abgleich.daten, name, spielerId), true
        );

        const salz = VERSIEGELUNG.verfuegbar() ? VERSIEGELUNG.salzErzeugen() : "";
        const pinPruefwert = await VERSIEGELUNG.pinPruefwertBilden(passwort, salz);

        abgleich.aendern(
            SPIELER.pinSetzen(abgleich.daten, spielerId, pinPruefwert, salz),
            true
        );

        ANMELDUNG._vollbildSchliessen();
    },

    /* ---------------------------------------------------------------- *
     * Bausteine des Vollbilds
     * ---------------------------------------------------------------- */

    /* Ein leerer Kasten in der Mitte des Vollbilds — jede Ansicht beginnt so. */
    _kastenBauen(titel, erklaerung) {
        const wurzel = ANMELDUNG.wurzelEl;
        wurzel.innerHTML = "";

        const kasten = document.createElement("div");
        kasten.className = "anmeldung-kasten";

        const kopf = document.createElement("h2");
        kopf.textContent = titel;
        kasten.appendChild(kopf);

        if (erklaerung) {
            const absatz = document.createElement("p");
            absatz.className = "erklaerung";
            absatz.textContent = erklaerung;
            kasten.appendChild(absatz);
        }

        wurzel.appendChild(kasten);
        return kasten;
    },

    /*
     * Ein beschriftetes Eingabefeld mit Fehlerzeile darunter. Passwörter
     * sind verdeckt und bekommen den Zeigen-Knopf (dasselbe Muster wie in
     * DIALOG.passwort); Leerraum kommt gar nicht erst hinein.
     * Liefert { feld, fehler }.
     */
    _feldBauen(kasten, beschriftung, verdeckt) {
        const marke = document.createElement("label");
        marke.className = "anmeldung-beschriftung";
        marke.textContent = beschriftung;
        kasten.appendChild(marke);

        const feld = document.createElement("input");
        feld.className = "anmeldung-feld";
        feld.value = "";
        feld.autocomplete = "off";
        feld.setAttribute("aria-label", beschriftung);

        if (verdeckt) {
            feld.type = "password";
            feld.maxLength = SPIELER.PASSWORT_MAX;
            feld.addEventListener("input", () => {
                const ohneLeerraum = feld.value.replace(/\s/g, "");
                if (feld.value !== ohneLeerraum) {
                    feld.value = ohneLeerraum;
                }
            });

            const halter = document.createElement("div");
            halter.className = "anmeldung-passwort-halter";
            halter.appendChild(feld);

            const zeigen = document.createElement("button");
            zeigen.type = "button";
            zeigen.className = "knopf knopf-still anmeldung-zeigen";
            zeigen.textContent = "Zeigen";
            zeigen.setAttribute("aria-label", "Passwort anzeigen");
            zeigen.addEventListener("click", () => {
                const offen = (feld.type === "text");
                feld.type = offen ? "password" : "text";
                zeigen.textContent = offen ? "Zeigen" : "Verbergen";
                feld.focus();
            });
            halter.appendChild(zeigen);
            kasten.appendChild(halter);
        } else {
            feld.type = "text";
            kasten.appendChild(feld);
        }

        /* Die Fehlerzeile ist immer da (auch leer) — so springt das
           Formular nicht, wenn eine Meldung erscheint. */
        const fehler = document.createElement("p");
        fehler.className = "anmeldung-fehler";
        fehler.setAttribute("role", "alert");
        kasten.appendChild(fehler);

        return { feld: feld, fehler: fehler };
    },

    _knopfBauen(beschriftung, klasse, beiKlick) {
        const knopf = document.createElement("button");
        knopf.type = "button";
        knopf.className = "knopf " + klasse;
        knopf.textContent = beschriftung;
        if (beiKlick) {
            knopf.addEventListener("click", beiKlick);
        }
        return knopf;
    },

    /* Die Eingabetaste löst den Haupt-Knopf der Ansicht aus. */
    _eingabetaste(teile, knopf) {
        for (const teil of teile) {
            teil.feld.addEventListener("keydown", (ereignis) => {
                if (ereignis && ereignis.key === "Enter" && !knopf.disabled) {
                    knopf.click();
                }
            });
        }
    },

    /*
     * Vergibt ein Passwort und hinterlegt seine Prüfsumme. Bewusst OHNE
     * Abbruch-Möglichkeit: Ein Passwort ist Pflicht, sonst könnte sich jeder
     * als jeder ausgeben. Zweimal eingeben, damit ein Vertipper nicht später
     * aussperrt.
     */
    async _passwortVergeben(spielerId, einleitung) {
        let passwort = null;

        while (passwort === null) {
            const eingabe = await DIALOG.passwort(
                "Passwort festlegen", einleitung, "Weiter", false
            );
            const wiederholung = await DIALOG.passwort(
                "Passwort wiederholen",
                "Noch einmal dasselbe Passwort.",
                "Fertig", false
            );

            if (eingabe === wiederholung) {
                passwort = eingabe;
            } else {
                await DIALOG.hinweis(
                    "Die beiden stimmen nicht überein",
                    "Damit du dich später nicht aussperrst, muss das Passwort "
                        + "zweimal gleich eingegeben werden. Noch einmal."
                );
            }
        }

        const salz = VERSIEGELUNG.verfuegbar() ? VERSIEGELUNG.salzErzeugen() : "";
        const pinPruefwert = await VERSIEGELUNG.pinPruefwertBilden(passwort, salz);

        ANMELDUNG.abgleich.aendern(
            SPIELER.pinSetzen(ANMELDUNG.abgleich.daten, spielerId, pinPruefwert, salz),
            true
        );
    },

    /* Ab jetzt ist dieses Gerät dieser Spieler. */
    _uebernehmen(spieler) {
        ANMELDUNG._ichIdSetzen(spieler.id);
        ICH.personSetzen(spieler.id, spieler.name);
    },

    /* ---------------------------------------------------------------- *
     * Profil — Name und Passwort ändern (aufgerufen aus dem Tab Einstellungen)
     * ---------------------------------------------------------------- */

    async profilOeffnen() {
        const ich = ANMELDUNG.ich();
        if (!ich) {
            await DIALOG.hinweis("Nicht angemeldet",
                "Auf diesem Gerät ist gerade niemand angemeldet.");
            return;
        }

        const wahl = await DIALOG.liste(
            "Dein Profil",
            "Was möchtest du ändern?",
            [
                {
                    beschriftung: "Name ändern",
                    hinweis: "Zurzeit: " + ich.name,
                    wert: "name"
                },
                {
                    beschriftung: "Passwort ändern",
                    hinweis: SPIELER.hatPin(ich)
                        ? "Für die Anmeldung auf anderen Geräten"
                        : "Noch kein Passwort hinterlegt",
                    wert: "passwort"
                }
            ],
            "Schließen"
        );

        if (wahl === "name") {
            await ANMELDUNG.namenAendern(ich);
        } else if (wahl === "passwort") {
            await ANMELDUNG.passwortAendern(ich);
        }
    },

    async namenAendern(ich) {
        const name = await DIALOG.eingabe(
            "Name ändern",
            "Unter welchem Namen sollen dich die anderen sehen?",
            ich.name,
            "Übernehmen",
            true
        );
        if (!name || name === ich.name) {
            return;
        }

        /* Der Name ist zugleich das, woran man sich beim Anmelden
           wiedererkennt — doppelte Namen machten die Liste unbrauchbar. */
        const vorhanden = SPIELER.spielerNachName(ANMELDUNG.abgleich.daten, name);
        if (vorhanden && vorhanden.id !== ich.id) {
            await DIALOG.hinweis(
                "Name schon vergeben",
                name + " spielt bereits mit. Nimm bitte einen anderen Namen."
            );
            return;
        }

        ICH.personSetzen(ich.id, name);
        ANMELDUNG.abgleich.aendern(
            SPIELER.nameSetzen(ANMELDUNG.abgleich.daten, ich.id, name),
            true
        );
        ANMELDUNG._anzeigenAuffrischen();
    },

    /*
     * Passwort ändern. Wer schon eines hat, muss es zuerst eingeben — sonst
     * könnte jemand an einem kurz unbeaufsichtigten Handy das Passwort
     * austauschen und den Zugang übernehmen. Eine alte 4-stellige PIN zählt
     * dabei als bisheriges Passwort und lässt sich hier auf ein richtiges
     * Passwort heben.
     */
    async passwortAendern(ich) {
        if (SPIELER.hatPin(ich)) {
            const altes = await DIALOG.passwort(
                "Bisheriges Passwort",
                "Zur Sicherheit zuerst dein bisheriges Passwort (oder deine "
                    + "alte PIN).",
                "Weiter"
            );
            if (altes === null) {
                return;
            }
            if (!await VERSIEGELUNG.pinPruefen(altes, ich.pinSalz, ich.pinPruefwert)) {
                await DIALOG.hinweis(
                    "Passwort stimmt nicht",
                    "Das bisherige Passwort war falsch. Es wurde nichts geändert."
                );
                return;
            }
        }

        let neues = null;
        while (neues === null) {
            const eingabe = await DIALOG.passwort(
                "Neues Passwort",
                "Denk dir ein Passwort aus — " + SPIELER.PASSWORT_MIN + " bis "
                    + SPIELER.PASSWORT_MAX + " Zeichen, Gross- und "
                    + "Kleinschreibung zählt.",
                "Weiter"
            );
            if (eingabe === null) {
                return;
            }

            const wiederholung = await DIALOG.passwort(
                "Neues Passwort wiederholen",
                "Noch einmal dasselbe Passwort.",
                "Speichern"
            );
            if (wiederholung === null) {
                return;
            }

            if (eingabe === wiederholung) {
                neues = eingabe;
            } else {
                await DIALOG.hinweis(
                    "Die beiden stimmen nicht überein",
                    "Damit du dich nicht aussperrst, muss das neue Passwort "
                        + "zweimal gleich eingegeben werden. Noch einmal."
                );
            }
        }

        /* Neues Salz zum neuen Passwort — sonst bliebe der alte Prüfwert
           vergleichbar. */
        const salz = VERSIEGELUNG.verfuegbar() ? VERSIEGELUNG.salzErzeugen() : "";
        const pinPruefwert = await VERSIEGELUNG.pinPruefwertBilden(neues, salz);

        ANMELDUNG.abgleich.aendern(
            SPIELER.pinSetzen(ANMELDUNG.abgleich.daten, ich.id, pinPruefwert, salz),
            true
        );

        DIALOG.kurzmeldung("Passwort geändert");
    },

    /* ---------------------------------------------------------------- *
     * Verwaltung
     *
     * Ein Zugang für denjenigen, der die Runde betreut: Er darf Spieler aus
     * der Runde entfernen — etwa jemanden, der sich doppelt angemeldet oder
     * seine PIN vergessen hat. Auch das Löschen fremder Partien im Schach
     * hängt an diesem Zugang (VERWALTUNG.verlangen).
     * ---------------------------------------------------------------- */

    async verwaltungUmschalten() {
        if (ICH.verwaltungAktiv()) {
            ICH.verwaltungSetzen(false);
            ANMELDUNG._anzeigenAuffrischen();
            return;
        }

        const darf = await VERWALTUNG.verlangen(
            "Verwaltung",
            "Passwort eingeben. Damit lassen sich Spieler aus der Runde "
                + "entfernen und fremde Partien löschen."
        );
        if (!darf) {
            return;
        }

        ANMELDUNG._anzeigenAuffrischen();
    },

    /* Entfernt einen Spieler (nur mit aktiver Verwaltung aufrufbar — die
       Knöpfe dafür baut einstellungen.js). Betrifft absichtlich einen
       fremden Eintrag: ohne Zusammenführung schreiben. */
    spielerEntfernen(spielerId) {
        ANMELDUNG.abgleich.aendern(
            SPIELER.spielerEntfernen(ANMELDUNG.abgleich.daten, spielerId),
            true,
            true
        );
        ANMELDUNG._anzeigenAuffrischen();
    },

    /* ---------------------------------------------------------------- *
     * Account — Abmelden und Konto löschen (Bündel A, Schritt 1)
     *
     * Zwei Aktionen, die leicht zu verwechseln wären; die Karte „Account"
     * in einstellungen.js hält sie deshalb sichtbar auseinander.
     * ---------------------------------------------------------------- */

    /*
     * Abmelden: NUR dieses Gerät vergisst die Anmeldung. Das Konto bleibt
     * samt Punkten und Partien in der Spielerliste bestehen — mit dem
     * Passwort meldet man sich jederzeit wieder an, auch von einem anderen
     * Gerät. Danach fragt die Anmeldung neu, wie beim ersten Besuch.
     */
    abmelden() {
        if (!ANMELDUNG.ichId) {
            return;
        }
        ICH.personVergessen();
        ANMELDUNG._ichIdSetzen(null);
        ANMELDUNG.anmelden();
    },

    /*
     * Konto löschen (bis v0.5.0 „Ich bin raus"): entfernt den EIGENEN
     * Eintrag und meldet das Gerät ab — ohne Verwaltung, jeder darf über
     * sich selbst entscheiden. Danach fragt die Anmeldung neu (wie beim
     * ersten Besuch).
     *
     * Die „Wirklich?"-Frage stellt der Knopf (DIALOG.zweiSchritt in
     * einstellungen.js). Beendete Partien bleiben in der Chronik stehen; nur
     * der Name verschwindet aus Spielerliste und Rangliste — wer später
     * wiederkommt, fängt mit neuer Kennung bei null an.
     */
    austreten() {
        const ich = ANMELDUNG.ich();
        if (!ich) {
            return;
        }

        const id = ich.id;
        ICH.personVergessen();
        ANMELDUNG._ichIdSetzen(null);

        /* Der eigene Eintrag soll WEG bleiben — ohne Zusammenführung
           schreiben, sonst setzte sie ihn gleich wieder ein. */
        ANMELDUNG.abgleich.aendern(
            SPIELER.spielerEntfernen(ANMELDUNG.abgleich.daten, id),
            true,
            true
        );

        ANMELDUNG.anmelden();
    },

    /* ---------------------------------------------------------------- *
     * Innereien
     * ---------------------------------------------------------------- */

    /* Namen stehen in Rangliste, Schach und Einstellungen — nach einer
       Änderung alles auffrischen, was gerade gezeichnet ist. */
    _anzeigenAuffrischen() {
        if (typeof RANGLISTE !== "undefined" && RANGLISTE.zeichnen) {
            RANGLISTE.zeichnen();
        }
        if (typeof TEAM_SCHACH !== "undefined" && TEAM_SCHACH.abgleich
                && TEAM_SCHACH.zeichnen) {
            TEAM_SCHACH.zeichnen(TEAM_SCHACH.abgleich.daten);
        }
        if (typeof EINSTELLUNGEN !== "undefined" && EINSTELLUNGEN.beimOeffnen) {
            EINSTELLUNGEN.beimOeffnen();
        }
    }
};
