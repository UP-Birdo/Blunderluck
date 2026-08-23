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
 *   2. Man wählt sich aus der Liste der Mitspieler und weist sich mit der
 *      PIN aus. Das geht von jedem Gerät aus.
 *   3. Man meldet sich neu an: Name und PIN festlegen.
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
                hinweis: SPIELER.hatPin(spieler) ? "mit PIN gesichert" : "ohne PIN angelegt",
                wert: spieler.id
            }));

            const gewaehlt = await DIALOG.liste(
                "Bist du schon dabei?",
                "Wähle deinen Namen, wenn du schon mitspielst — mit deiner PIN "
                    + "kommst du von jedem Gerät aus wieder hinein.",
                eintraege,
                "Ich bin neu hier"
            );

            if (gewaehlt) {
                const erfolg = await ANMELDUNG._alsBestehenderAnmelden(gewaehlt);
                if (!erfolg) {
                    /* Abgebrochen oder PIN falsch: von vorn fragen. */
                    await ANMELDUNG._anmeldenAblauf();
                }
                return;
            }
        }

        /* Weg 3: neu anmelden. */
        await ANMELDUNG._neuAnmelden();
    },

    /* Weg 2: bestehenden Spieler übernehmen, ausgewiesen durch die PIN. */
    async _alsBestehenderAnmelden(spielerId) {
        const abgleich = ANMELDUNG.abgleich;
        const spieler = SPIELER.spielerFinden(abgleich.daten, spielerId);
        if (!spieler) {
            return false;
        }

        /* Ohne PIN angelegt (sollte nicht vorkommen — die PIN ist Pflicht):
           dann bleibt nur die Nachfrage, und anschließend MUSS eine PIN
           vergeben werden, damit die Lücke sich nicht fortsetzt. */
        if (!SPIELER.hatPin(spieler)) {
            const binIch = await DIALOG.frage(
                "Ohne PIN angelegt",
                spieler.name + " hat keine PIN hinterlegt, deshalb lässt sich das "
                    + "hier nicht prüfen. Bist du das wirklich?",
                "Ja, das bin ich"
            );
            if (!binIch) {
                return false;
            }

            ANMELDUNG._uebernehmen(spieler);
            await ANMELDUNG._pinVergeben(
                spieler.id,
                "Jetzt fehlt nur noch deine PIN. Damit kommst du künftig von jedem "
                    + "Gerät wieder als du selbst hinein."
            );
            return true;
        }

        const stellen = KONFIG.verwaltung.pinStellen;

        for (let versuch = 1; versuch <= 3; versuch++) {
            const text = (versuch === 1)
                ? "Gib deine " + stellen + "-stellige PIN ein."
                : "Das war nicht richtig. Noch " + (4 - versuch)
                    + (versuch === 3 ? " Versuch." : " Versuche.");

            const pin = await DIALOG.zahlen("PIN von " + spieler.name, text, stellen, "Anmelden");

            if (pin === null) {
                return false;
            }
            if (await VERSIEGELUNG.pinPruefen(pin, spieler.pinSalz, spieler.pinPruefwert)) {
                ANMELDUNG._uebernehmen(spieler);
                return true;
            }
        }

        await DIALOG.hinweis(
            "Dreimal falsch",
            "Die PIN stimmt nicht. Vergessen? Dann muss dich jemand mit dem "
                + "Verwaltungs-Zugang aus der Runde entfernen."
        );
        return false;
    },

    /* Weg 3: neuer Spieler mit Name und PIN. */
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
                        + "die Liste mit deiner PIN an. Sonst nimm bitte einen anderen "
                        + "Namen."
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

        await ANMELDUNG._pinVergeben(
            spielerId,
            "Denk dir " + KONFIG.verwaltung.pinStellen + " Ziffern aus. Damit kommst "
                + "du auch von einem anderen Handy wieder als du selbst hinein."
        );
    },

    /*
     * Vergibt eine PIN und hinterlegt sie. Bewusst OHNE Abbruch-Möglichkeit:
     * Eine PIN ist Pflicht, sonst könnte sich jeder als jeder ausgeben.
     * Zweimal eingeben, damit ein Vertipper nicht später aussperrt.
     */
    async _pinVergeben(spielerId, einleitung) {
        const stellen = KONFIG.verwaltung.pinStellen;
        let pin = null;

        while (pin === null) {
            const eingabe = await DIALOG.zahlen(
                "PIN festlegen", einleitung, stellen, "Weiter", false
            );
            const wiederholung = await DIALOG.zahlen(
                "PIN wiederholen",
                "Noch einmal dieselben " + stellen + " Ziffern.",
                stellen, "Fertig", false
            );

            if (eingabe === wiederholung) {
                pin = eingabe;
            } else {
                await DIALOG.hinweis(
                    "Die beiden stimmen nicht überein",
                    "Damit du dich später nicht aussperrst, muss die PIN zweimal "
                        + "gleich eingegeben werden. Noch einmal."
                );
            }
        }

        const salz = VERSIEGELUNG.verfuegbar() ? VERSIEGELUNG.salzErzeugen() : "";
        const pinPruefwert = await VERSIEGELUNG.pinPruefwertBilden(pin, salz);

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
     * Profil — Name und PIN ändern (aufgerufen aus dem Tab Einstellungen)
     * ---------------------------------------------------------------- */

    async profilOeffnen() {
        const ich = ANMELDUNG.ich();
        if (!ich) {
            await DIALOG.hinweis("Nicht angemeldet",
                "Auf diesem Gerät ist gerade niemand angemeldet.");
            return;
        }

        const stellen = KONFIG.verwaltung.pinStellen;

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
                    beschriftung: "PIN ändern",
                    hinweis: SPIELER.hatPin(ich)
                        ? stellen + " Ziffern für die Anmeldung auf anderen Geräten"
                        : "Noch keine PIN hinterlegt",
                    wert: "pin"
                }
            ],
            "Schließen"
        );

        if (wahl === "name") {
            await ANMELDUNG.namenAendern(ich);
        } else if (wahl === "pin") {
            await ANMELDUNG.pinAendern(ich);
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
     * PIN ändern. Wer schon eine hat, muss sie zuerst eingeben — sonst könnte
     * jemand an einem kurz unbeaufsichtigten Handy die PIN austauschen und
     * den Zugang übernehmen.
     */
    async pinAendern(ich) {
        const stellen = KONFIG.verwaltung.pinStellen;

        if (SPIELER.hatPin(ich)) {
            const alte = await DIALOG.zahlen(
                "Bisherige PIN",
                "Zur Sicherheit zuerst deine bisherige PIN.",
                stellen, "Weiter"
            );
            if (alte === null) {
                return;
            }
            if (!await VERSIEGELUNG.pinPruefen(alte, ich.pinSalz, ich.pinPruefwert)) {
                await DIALOG.hinweis(
                    "PIN stimmt nicht",
                    "Die bisherige PIN war falsch. Es wurde nichts geändert."
                );
                return;
            }
        }

        let neue = null;
        while (neue === null) {
            const eingabe = await DIALOG.zahlen(
                "Neue PIN",
                "Denk dir " + stellen + " Ziffern aus.",
                stellen, "Weiter"
            );
            if (eingabe === null) {
                return;
            }

            const wiederholung = await DIALOG.zahlen(
                "Neue PIN wiederholen",
                "Noch einmal dieselben " + stellen + " Ziffern.",
                stellen, "Speichern"
            );
            if (wiederholung === null) {
                return;
            }

            if (eingabe === wiederholung) {
                neue = eingabe;
            } else {
                await DIALOG.hinweis(
                    "Die beiden stimmen nicht überein",
                    "Damit du dich nicht aussperrst, muss die neue PIN zweimal "
                        + "gleich eingegeben werden. Noch einmal."
                );
            }
        }

        /* Neues Salz zur neuen PIN — sonst bliebe der alte Prüfwert
           vergleichbar. */
        const salz = VERSIEGELUNG.verfuegbar() ? VERSIEGELUNG.salzErzeugen() : "";
        const pinPruefwert = await VERSIEGELUNG.pinPruefwertBilden(neue, salz);

        ANMELDUNG.abgleich.aendern(
            SPIELER.pinSetzen(ANMELDUNG.abgleich.daten, ich.id, pinPruefwert, salz),
            true
        );

        DIALOG.kurzmeldung("PIN geändert");
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
     * samt Punkten und Partien in der Spielerliste bestehen — mit der PIN
     * meldet man sich jederzeit wieder an, auch von einem anderen Gerät.
     * Danach fragt die Anmeldung neu, wie beim ersten Besuch.
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
