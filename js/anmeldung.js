/*
 * anmeldung.js — Anmeldung, Profil und Verwaltung der Spielerliste.
 *
 * Das Gegenstück zu spieler.js: Dort steht, WIE die Daten aussehen, hier
 * steht der Ablauf am Bildschirm. Einen eigenen Tab gibt es nicht — die
 * Anmeldung läuft in Dialogen beim Start, Profil und Verwaltung hängen im
 * Tab Einstellungen (einstellungen.js ruft die Funktionen hier auf).
 *
 * Drei Wege in die Runde (Ablauf wie im Quizz erprobt):
 *   1. Das Gerät kennt seinen Spieler schon — nichts zu tun.
 *   2. Man wählt sich aus der Liste der Mitspieler und weist sich mit dem
 *      Passwort aus. Das geht von jedem Gerät aus.
 *   3. Man meldet sich neu an: Name und Passwort festlegen.
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
     * Läuft gerade eine Anmeldung? Solange ja, darf keine zweite starten —
     * sonst öffnen sich mehrere Dialoge übereinander, von denen nur der
     * letzte sichtbar ist.
     */
    anmeldenLaeuft: false,

    verbinden(abgleich) {
        ANMELDUNG.abgleich = abgleich;
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
     * Anmelden
     * ---------------------------------------------------------------- */

    async anmelden() {
        /* Nur eine Anmeldung gleichzeitig. */
        if (ANMELDUNG.anmeldenLaeuft) {
            return;
        }
        ANMELDUNG.anmeldenLaeuft = true;
        try {
            await ANMELDUNG._anmeldenAblauf();
        } finally {
            ANMELDUNG.anmeldenLaeuft = false;
        }
        ANMELDUNG._anzeigenAuffrischen();
    },

    async _anmeldenAblauf() {
        const abgleich = ANMELDUNG.abgleich;
        const person = ICH.person();

        /* Weg 1: bekanntes Gerät, Spieler existiert noch. */
        if (person) {
            const bekannt = SPIELER.spielerFinden(abgleich.daten, person.id);
            if (bekannt) {
                ANMELDUNG._ichIdSetzen(bekannt.id);
                if (bekannt.name !== person.name) {
                    ICH.personSetzen(bekannt.id, bekannt.name);
                }
                return;
            }
        }

        /* Weg 2: aus der Liste der Mitspieler wählen. */
        const spielerliste = SPIELER.normalisieren(abgleich.daten).spieler;
        if (spielerliste.length > 0) {
            const eintraege = spielerliste.map((spieler) => ({
                beschriftung: spieler.name,
                hinweis: SPIELER.hatPin(spieler)
                    ? "mit Passwort gesichert" : "ohne Passwort angelegt",
                wert: spieler.id
            }));

            const gewaehlt = await DIALOG.liste(
                "Bist du schon dabei?",
                "Wähle deinen Namen, wenn du schon mitspielst — mit deinem "
                    + "Passwort kommst du von jedem Gerät aus wieder hinein.",
                eintraege,
                "Ich bin neu hier"
            );

            if (gewaehlt) {
                const erfolg = await ANMELDUNG._alsBestehenderAnmelden(gewaehlt);
                if (!erfolg) {
                    /* Abgebrochen oder Passwort falsch: von vorn fragen. */
                    await ANMELDUNG._anmeldenAblauf();
                }
                return;
            }
        }

        /* Weg 3: neu anmelden. */
        await ANMELDUNG._neuAnmelden();
    },

    /* Weg 2: bestehenden Spieler übernehmen, ausgewiesen durchs Passwort. */
    async _alsBestehenderAnmelden(spielerId) {
        const abgleich = ANMELDUNG.abgleich;
        const spieler = SPIELER.spielerFinden(abgleich.daten, spielerId);
        if (!spieler) {
            return false;
        }

        /* Ohne Passwort angelegt (sollte nicht vorkommen — es ist Pflicht):
           dann bleibt nur die Nachfrage, und anschließend MUSS ein Passwort
           vergeben werden, damit die Lücke sich nicht fortsetzt. */
        if (!SPIELER.hatPin(spieler)) {
            const binIch = await DIALOG.frage(
                "Ohne Passwort angelegt",
                spieler.name + " hat kein Passwort hinterlegt, deshalb lässt sich "
                    + "das hier nicht prüfen. Bist du das wirklich?",
                "Ja, das bin ich"
            );
            if (!binIch) {
                return false;
            }

            ANMELDUNG._uebernehmen(spieler);
            await ANMELDUNG._passwortVergeben(
                spieler.id,
                "Jetzt fehlt nur noch dein Passwort. Damit kommst du künftig von "
                    + "jedem Gerät wieder als du selbst hinein."
            );
            return true;
        }

        for (let versuch = 1; versuch <= 3; versuch++) {
            const text = (versuch === 1)
                ? "Gib dein Passwort ein. (Wer noch eine alte 4-stellige PIN "
                    + "hat: Sie gilt weiter.)"
                : "Das war nicht richtig. Noch " + (4 - versuch)
                    + (versuch === 3 ? " Versuch." : " Versuche.");

            const passwort = await DIALOG.passwort(
                "Passwort von " + spieler.name, text, "Anmelden");

            if (passwort === null) {
                return false;
            }
            if (await VERSIEGELUNG.pinPruefen(
                    passwort, spieler.pinSalz, spieler.pinPruefwert)) {
                ANMELDUNG._uebernehmen(spieler);
                return true;
            }
        }

        await DIALOG.hinweis(
            "Dreimal falsch",
            "Das Passwort stimmt nicht. Vergessen? Dann muss dich jemand mit "
                + "dem Verwaltungs-Zugang aus der Runde entfernen."
        );
        return false;
    },

    /* Weg 3: neuer Spieler mit Name und Passwort. */
    async _neuAnmelden() {
        const abgleich = ANMELDUNG.abgleich;

        /* Name — darf noch nicht vergeben sein. */
        let name = "";
        while (!name) {
            name = await DIALOG.eingabe(
                "Wie heißt du?",
                "Diesen Namen sehen die anderen in der Runde.",
                "",
                "Weiter",
                false
            );

            if (name && SPIELER.spielerNachName(abgleich.daten, name)) {
                await DIALOG.hinweis(
                    "Name schon vergeben",
                    name + " spielt bereits mit. Bist du das selbst, melde dich über "
                        + "die Liste mit deinem Passwort an. Sonst nimm bitte einen "
                        + "anderen Namen."
                );
                name = "";
            }
        }

        const spielerId = SPIELER.idErzeugen();

        /* Erst bekannt machen, wer wir sind — die Abgleich-Schicht braucht das
           beim Schreiben, um den eigenen Eintrag zu erkennen. */
        ANMELDUNG._ichIdSetzen(spielerId);
        ICH.personSetzen(spielerId, name);

        abgleich.aendern(
            SPIELER.spielerHinzufuegen(abgleich.daten, name, spielerId), true
        );

        await ANMELDUNG._passwortVergeben(
            spielerId,
            "Denk dir ein Passwort aus — " + SPIELER.PASSWORT_MIN + " bis "
                + SPIELER.PASSWORT_MAX + " Zeichen, Gross- und Kleinschreibung "
                + "zählt. Damit kommst du auch von einem anderen Handy wieder "
                + "als du selbst hinein."
        );
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
