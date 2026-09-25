/*
 * anmeldung-konto.js — die Bildschirme des UPCrew-Kontos (seit v0.138.0).
 *
 * Ergänzt ANMELDUNG (Object.assign) und muss in index.html NACH
 * anmeldung.js stehen. anmeldung.js ruft diese Wege nur, wenn
 * `KONTO.aktiv()` — ohne Firebase (lokaler Modus, Tests) bleibt alles wie
 * bis v0.137.0.
 *
 * Die Regeln und Abläufe selbst (Namen mit Nummer, Passwort-Regel, Umzug,
 * Gast, Rollen) stehen in js\konto.js; hier wird nur gefragt und gezeigt.
 *
 * DIE WEGE HINEIN (Nutzer-Aufträge 25.09.2026):
 *   - Mit UPCrew-Konto anmelden: „Name#Nummer" und Passwort.
 *   - Neues UPCrew-Konto: Name (nur Buchstaben und Ziffern) und Passwort
 *     nach der UPCrew-Regel; die Nummer kommt von selbst.
 *   - Als Gast spielen: ohne alles, an das Gerät gebunden. Hin und wieder
 *     fragt die App, ob der Gast seinen Spielstand sichern will.
 *   - Der Umzug: Wer ein altes Blunderluck-Konto hat, meldet sich einmal mit
 *     dem ALTEN Passwort an und legt ein neues nach der UPCrew-Regel fest.
 *     Geräte von vor dem Umzug zeigen dazu einen Hinweis.
 */

Object.assign(ANMELDUNG, {

    /* Die alte Blunderluck-Spielerliste (nur für den Umzug). */
    _altDaten: null,
    _altVersprechen: null,

    /* Wie oft ein Gast die App geöffnet hat — jedes dritte Mal kommt die
       Frage, ob er seinen Spielstand sichern will. Nur auf diesem Gerät. */
    GAST_ERINNERUNG_SCHLUESSEL: "blunderluck.gast-erinnerung",
    GAST_ERINNERUNG_JEDES: 3,

    /* ---------------------------------------------------------------- *
     * Rollen des angemeldeten Kontos
     * ---------------------------------------------------------------- */

    istAdmin() {
        return KONTO.aktiv() && !!ANMELDUNG.abgleich
            && KONTO.istAdmin(ANMELDUNG.abgleich.daten, KONTO.uid());
    },

    /* UP#Plus — verteilt Rollen, spielt nicht. */
    istOberAdmin() {
        return KONTO.aktiv() && !!ANMELDUNG.abgleich
            && KONTO.istOberAdmin(ANMELDUNG.abgleich.daten, KONTO.uid());
    },

    istGast() {
        const ich = ANMELDUNG.ich();
        return !!(ich && ich.gast === true);
    },

    /* ---------------------------------------------------------------- *
     * Die Vollbilder
     * ---------------------------------------------------------------- */

    /* Aus anmeldung.js: `vorname` = das Gerät kennt eine Person von vor dem
       Umzug (keine UPCrew-Sitzung). */
    _kontoStartZeigen(vorname) {
        if (vorname) {
            ANMELDUNG._kontoUmzugHinweisZeigen(vorname);
        } else {
            ANMELDUNG._kontoWeicheZeigen();
        }
    },

    _kontoWeicheZeigen() {
        /* Keine Begrüssung (UPCrew-Standard, seit v0.140.0; bis v0.139.0
           „Willkommen bei Blunderluck" plus drei Sätze) — wie in Typoluck. */
        const kasten = ANMELDUNG._kastenBauen("Blunderluck",
            "Ein Konto · alle UPCrew-Spiele");
        kasten.appendChild(ANMELDUNG._knopfBauen("Mit UPCrew-Konto anmelden",
            "knopf-haupt anmeldung-knopf", () => ANMELDUNG._kontoAnmeldenZeigen("")));
        kasten.appendChild(ANMELDUNG._knopfBauen("Neues UPCrew-Konto erstellen",
            "knopf-still anmeldung-knopf", () => ANMELDUNG._kontoNeuZeigen()));
        kasten.appendChild(ANMELDUNG._knopfBauen("Als Gast spielen",
            "knopf-still anmeldung-knopf", () => ANMELDUNG._kontoGastStarten()));
    },

    /* Geräte von vor dem Umzug: alle sind abgemeldet, mit Hinweis. */
    _kontoUmzugHinweisZeigen(vorname) {
        const kasten = ANMELDUNG._kastenBauen("Blunderluck zieht zu UPCrew",
            "Alle Konten sind jetzt UPCrew-Konten. Melde dich einmal mit deinem "
                + "bisherigen Passwort an und leg danach ein neues fest. Deine "
                + "Partien, Freunde und Abzeichen ziehen mit.");
        kasten.appendChild(ANMELDUNG._knopfBauen("Weiter",
            "knopf-haupt anmeldung-knopf", () => ANMELDUNG._kontoAnmeldenZeigen(vorname)));
        kasten.appendChild(ANMELDUNG._knopfBauen("Anderes Konto",
            "knopf-still anmeldung-knopf", () => ANMELDUNG._kontoWeicheZeigen()));
    },

    _kontoAnmeldenZeigen(vorbelegt) {
        const kasten = ANMELDUNG._kastenBauen("Anmelden",
            "Mit Name#Nummer (z. B. Jonas#0001) und Passwort. Dein altes "
                + "Blunderluck-Konto? Dann Name und bisheriges Passwort.");
        const name = ANMELDUNG._kontoFeld(kasten, "Name#Nummer", "username");
        const passwort = ANMELDUNG._kontoFeld(kasten, "Passwort", "current-password");
        name.feld.addEventListener("input", () => {
            const sauber = KONTO.eingabeSaeubern(name.feld.value);
            if (sauber !== name.feld.value) {
                name.feld.value = sauber;
            }
        });

        const los = ANMELDUNG._knopfBauen("Anmelden",
            "knopf-haupt anmeldung-knopf anmeldung-weiter", null);
        const pruefen = () => {
            los.disabled = name.feld.value === "" || passwort.feld.value === "";
        };
        name.feld.addEventListener("input", pruefen);
        passwort.feld.addEventListener("input", pruefen);

        let fehlversuche = 0;
        los.addEventListener("click", async () => {
            if (los.disabled) {
                return;
            }
            los.disabled = true;
            name.fehler.textContent = "";
            passwort.fehler.textContent = "";

            const ergebnis = await ANMELDUNG._kontoAnmeldenVersuchen(
                name.feld.value, passwort.feld.value);

            if (ergebnis.ok) {
                ANMELDUNG._vollbildSchliessen();
                return;
            }
            if (ergebnis.weiter) {
                ergebnis.weiter();
                return;
            }
            FUEHLEN.fehler();
            if (ergebnis.fehler === "falsch") {
                fehlversuche += 1;
                passwort.feld.value = "";
                passwort.fehler.textContent = fehlversuche >= 3
                    ? "Wieder falsch. Passwort vergessen? Bitte einen Admin, dein "
                        + "Konto zum Neu-Verbinden freizugeben."
                    : "Das Passwort stimmt nicht.";
            } else {
                (ergebnis.feld === "name" ? name : passwort).fehler.textContent = ergebnis.text;
            }
            pruefen();
        });

        kasten.appendChild(los);
        ANMELDUNG._eingabetaste([name, passwort], los);
        kasten.appendChild(ANMELDUNG._knopfBauen("Zurück", "knopf-still anmeldung-knopf",
            () => ANMELDUNG._kontoWeicheZeigen()));

        if (vorbelegt) {
            name.feld.value = KONTO.eingabeSaeubern(vorbelegt);
            passwort.feld.focus();
        } else {
            name.feld.focus();
        }
        pruefen();
    },

    /*
     * Anmelden, und wenn es das Konto bei UPCrew (noch) nicht gibt: in der
     * alten Blunderluck-Datenbank nachsehen. Liefert { ok } oder { fehler,
     * text, feld } oder { weiter } (ein Folgebild: Umzug, Neu-Verbinden).
     */
    async _kontoAnmeldenVersuchen(eingabe, passwort) {
        const daten = ANMELDUNG.abgleich.daten;
        const ergebnis = await KONTO.anmeldenMitEingabe(daten, eingabe, passwort);

        if (ergebnis.ok) {
            ANMELDUNG._uebernehmen(ergebnis.spieler);
            return { ok: true };
        }
        if (ergebnis.fehler === "freigegeben") {
            return { weiter: () => ANMELDUNG._kontoNeuesPasswortZeigen("neuVerbinden",
                ergebnis.spieler) };
        }
        if (ergebnis.fehler !== "unbekannt") {
            return ergebnis;
        }

        /* Nicht bei UPCrew: vielleicht ein altes Blunderluck-Konto. Dort sind
           Namen eindeutig, eine Nummer gibt es nicht. */
        const alt = await ANMELDUNG._altLaden();
        if (alt.fehler) {
            return { fehler: "netz", feld: "name", text: KONTO.fehlerText("netz") };
        }
        const teile = KONTO.eingabeZerlegen(eingabe);
        const altSpieler = SPIELER.spielerNachName(alt.daten, teile.name);
        if (!altSpieler) {
            return { fehler: "unbekannt", feld: "name",
                text: "Dieses Konto gibt es nicht. Neu hier? Dann erstell ein UPCrew-Konto." };
        }
        if (!SPIELER.hatPin(altSpieler)
                || !await VERSIEGELUNG.pinPruefen(passwort, altSpieler.pinSalz,
                    altSpieler.pinPruefwert)) {
            return { fehler: "falsch" };
        }
        return { weiter: () => ANMELDUNG._kontoNeuesPasswortZeigen("umzug", altSpieler, passwort) };
    },

    /*
     * Das neue Passwort festlegen — für den Umzug (mit Namensfeld, falls der
     * alte Name nach den neuen Regeln nicht geht) und fürs Neu-Verbinden.
     */
    _kontoNeuesPasswortZeigen(art, spieler, altesPasswort) {
        const umzug = (art === "umzug");
        const kasten = ANMELDUNG._kastenBauen(
            umzug ? "Neues Passwort für UPCrew" : "Konto neu verbinden",
            (umzug
                ? "Das alte Passwort stimmt. Leg jetzt dein UPCrew-Passwort fest — "
                : "Leg ein neues Passwort fest — ")
                + KONTO.passwortRegelText() + ".");

        const name = umzug ? ANMELDUNG._kontoFeld(kasten, "Name", "username") : null;
        if (name) {
            name.feld.value = KONTO.nameSaeubern(spieler.name);
            ANMELDUNG._nameFeldSaeubern(name.feld);
        }
        const passwort = ANMELDUNG._kontoFeld(kasten, "Neues Passwort", "new-password");
        const wiederholung = ANMELDUNG._kontoFeld(kasten, "Passwort wiederholen", "new-password");
        const los = ANMELDUNG._knopfBauen(umzug ? "Zu UPCrew umziehen" : "Neu verbinden",
            "knopf-haupt anmeldung-knopf anmeldung-weiter", null);

        const pruefen = ANMELDUNG._kontoFormularPruefen(name, passwort, wiederholung, los);

        los.addEventListener("click", async () => {
            if (los.disabled) {
                return;
            }
            los.disabled = true;
            const speicher = ANMELDUNG.abgleich.speicher;
            const daten = ANMELDUNG.abgleich.daten;
            const ergebnis = umzug
                ? await KONTO.umziehen(speicher, daten, spieler, name.feld.value,
                    passwort.feld.value, altesPasswort)
                : await KONTO.neuVerbinden(speicher, daten, spieler, passwort.feld.value);
            await ANMELDUNG._kontoFertig(ergebnis, passwort, pruefen,
                umzug ? "Umgezogen · " : "Angemeldet · ");
        });

        kasten.appendChild(los);
        ANMELDUNG._eingabetaste([name, passwort, wiederholung].filter(Boolean), los);
        kasten.appendChild(ANMELDUNG._knopfBauen("Abbrechen", "knopf-still anmeldung-knopf",
            () => {
                KONTO.abmelden();
                ANMELDUNG._kontoWeicheZeigen();
            }));
        (name || passwort).feld.focus();
        pruefen();
    },

    _kontoNeuZeigen() {
        const kasten = ANMELDUNG._kastenBauen("Neues UPCrew-Konto",
            "Damit spielst du in allen UPCrew-Spielen. Deine Nummer (#1234) "
                + "bekommst du automatisch.");
        const name = ANMELDUNG._kontoFeld(kasten, "Name (nur Buchstaben und Ziffern)", "username");
        ANMELDUNG._nameFeldSaeubern(name.feld);
        const passwort = ANMELDUNG._kontoFeld(kasten,
            "Passwort (" + KONTO.passwortRegelText() + ")", "new-password");
        const wiederholung = ANMELDUNG._kontoFeld(kasten, "Passwort wiederholen", "new-password");
        const los = ANMELDUNG._knopfBauen("UPCrew-Konto erstellen",
            "knopf-haupt anmeldung-knopf anmeldung-weiter", null);

        const pruefen = ANMELDUNG._kontoFormularPruefen(name, passwort, wiederholung, los);

        los.addEventListener("click", async () => {
            if (los.disabled) {
                return;
            }
            los.disabled = true;
            const ergebnis = await KONTO.kontoAnlegen(ANMELDUNG.abgleich.speicher,
                ANMELDUNG.abgleich.daten, name.feld.value, passwort.feld.value);
            await ANMELDUNG._kontoFertig(ergebnis, name, pruefen, "Angemeldet · ");
        });

        kasten.appendChild(los);
        ANMELDUNG._eingabetaste([name, passwort, wiederholung], los);
        kasten.appendChild(ANMELDUNG._knopfBauen("Zurück", "knopf-still anmeldung-knopf",
            () => ANMELDUNG._kontoWeicheZeigen()));
        name.feld.focus();
        pruefen();
    },

    async _kontoGastStarten() {
        const ergebnis = await KONTO.gastAnlegen(ANMELDUNG.abgleich.speicher,
            ANMELDUNG.abgleich.daten);
        if (!ergebnis.ok) {
            await DIALOG.hinweis("Gast-Zugang", ergebnis.text);
            return;
        }
        await ANMELDUNG._kontoNachladen();
        ANMELDUNG._uebernehmen(ergebnis.eintrag);
        ANMELDUNG._vollbildSchliessen();
        DIALOG.kurzmeldung("Gast · " + KONTO.anzeigeName(ergebnis.eintrag));
    },

    /* ---------------------------------------------------------------- *
     * Gast: Spielstand sichern
     * ---------------------------------------------------------------- */

    /* Nach jeder Anmeldung (app.js): Jedes dritte Öffnen fragt ein Gast, ob
       er seinen Spielstand sichern will. */
    async gastErinnern() {
        if (!KONTO.aktiv() || !ANMELDUNG.istGast()) {
            return;
        }
        let zaehler = 0;
        try {
            zaehler = Number(window.localStorage.getItem(ANMELDUNG.GAST_ERINNERUNG_SCHLUESSEL)) || 0;
            window.localStorage.setItem(ANMELDUNG.GAST_ERINNERUNG_SCHLUESSEL, String(zaehler + 1));
        } catch (fehler) {
            return;
        }
        if ((zaehler + 1) % ANMELDUNG.GAST_ERINNERUNG_JEDES !== 0) {
            return;
        }
        const jetzt = await DIALOG.frage("Spielstand sichern?",
            "Als Gast hängt dein Spielstand an diesem Gerät — geht es verloren "
                + "oder meldest du dich ab, ist er weg. Mit einem UPCrew-Konto "
                + "nimmst du alles mit.", "Jetzt sichern");
        if (jetzt) {
            ANMELDUNG.gastSichernOeffnen();
        }
    },

    gastSichernOeffnen() {
        const eintrag = ANMELDUNG.ich();
        if (!eintrag || eintrag.gast !== true || !ANMELDUNG.wurzelEl) {
            return;
        }
        ANMELDUNG.anmeldenLaeuft = true;
        ANMELDUNG.wurzelEl.hidden = false;

        const kasten = ANMELDUNG._kastenBauen("Spielstand sichern",
            "Such dir einen Namen und ein Passwort aus. Alles, was du als "
                + KONTO.anzeigeName(eintrag) + " gespielt hast, bleibt.");
        const name = ANMELDUNG._kontoFeld(kasten, "Name (nur Buchstaben und Ziffern)", "username");
        ANMELDUNG._nameFeldSaeubern(name.feld);
        const passwort = ANMELDUNG._kontoFeld(kasten,
            "Passwort (" + KONTO.passwortRegelText() + ")", "new-password");
        const wiederholung = ANMELDUNG._kontoFeld(kasten, "Passwort wiederholen", "new-password");
        const los = ANMELDUNG._knopfBauen("Sichern",
            "knopf-haupt anmeldung-knopf anmeldung-weiter", null);

        const pruefen = ANMELDUNG._kontoFormularPruefen(name, passwort, wiederholung, los);

        los.addEventListener("click", async () => {
            if (los.disabled) {
                return;
            }
            los.disabled = true;
            const ergebnis = await KONTO.gastSichern(ANMELDUNG.abgleich.speicher,
                ANMELDUNG.abgleich.daten, eintrag, name.feld.value, passwort.feld.value);
            await ANMELDUNG._kontoFertig(ergebnis, name, pruefen, "Gesichert · ");
        });

        kasten.appendChild(los);
        ANMELDUNG._eingabetaste([name, passwort, wiederholung], los);
        kasten.appendChild(ANMELDUNG._knopfBauen("Später", "knopf-still anmeldung-knopf",
            () => ANMELDUNG._vollbildSchliessen()));
        name.feld.focus();
        pruefen();
    },

    /* ---------------------------------------------------------------- *
     * Profil, Verwaltung, Abmelden, Löschen
     * ---------------------------------------------------------------- */

    async _kontoNameAendern(ich) {
        const eingabe = await DIALOG.eingabe("Name ändern",
            "Nur Buchstaben und Ziffern. Der Name gilt in allen UPCrew-Spielen; "
                + "deine Nummer bleibt, wenn sie frei ist.", ich.name, "Übernehmen", true);
        if (!eingabe) {
            return;
        }
        const name = KONTO.nameSaeubern(eingabe);
        if (name === ich.name) {
            return;
        }
        const ergebnis = await KONTO.nameAendern(ANMELDUNG.abgleich.speicher,
            ANMELDUNG.abgleich.daten, ich, name);
        if (!ergebnis.ok) {
            await DIALOG.hinweis("Das geht nicht", ergebnis.text);
            return;
        }
        await ANMELDUNG._kontoNachladen();
        ICH.personSetzen(ich.id, name);
        ANMELDUNG._anzeigenAuffrischen();
        DIALOG.kurzmeldung("Du heisst jetzt " + KONTO.anzeigeName(ergebnis.eintrag));
    },

    async _kontoPasswortAendern(ich) {
        const altes = await DIALOG.passwort("Bisheriges Passwort",
            "Zur Sicherheit zuerst dein bisheriges Passwort.", "Weiter");
        if (altes === null || altes === undefined) {
            return;
        }
        const probe = await KONTO.anmelden(KONTO.kennungVon(ich), altes);
        if (!probe.ok) {
            await DIALOG.hinweis("Nichts geändert", KONTO.fehlerText(probe.fehler));
            return;
        }
        const neues = await ANMELDUNG._neuesPasswortErfragen();
        if (neues === null) {
            return;
        }
        const ergebnis = await KONTO.passwortAendern(neues);
        if (!ergebnis.ok) {
            await DIALOG.hinweis("Nichts geändert", KONTO.fehlerText(ergebnis.fehler));
            return;
        }
        DIALOG.kurzmeldung("Passwort geändert");
    },

    /* Verwaltung: nur Admins (die Regeln prüfen es noch einmal). */
    async _kontoAdminAendern(spielerId, wie) {
        const spieler = SPIELER.spielerFinden(ANMELDUNG.abgleich.daten, spielerId);
        if (!spieler || !spieler.uid) {
            return false;
        }
        if (KONTO.istOberAdmin(ANMELDUNG.abgleich.daten, spieler.uid)) {
            await DIALOG.hinweis("Geht nicht", "UP#Plus lässt sich nicht ändern.");
            return false;
        }
        const speicher = ANMELDUNG.abgleich.speicher;
        let ergebnis;
        if (wie === "entfernen") {
            ergebnis = await KONTO.eintragEntfernen(speicher, spieler);
        } else if (wie === "freigeben") {
            ergebnis = await KONTO.freigeben(speicher, spieler);
        } else {
            ergebnis = await KONTO.rolleSetzen(speicher, spieler.uid,
                !KONTO.istAdmin(ANMELDUNG.abgleich.daten, spieler.uid));
        }
        if (!ergebnis.ok) {
            await DIALOG.hinweis("Nicht gespeichert",
                "Das darf dein Konto nicht, oder die Verbindung fehlt.");
            return false;
        }
        await ANMELDUNG._kontoNachladen();
        ANMELDUNG._anzeigenAuffrischen();
        return true;
    },

    rolleUmschalten(spielerId) {
        return ANMELDUNG._kontoAdminAendern(spielerId, "rolle");
    },

    /* Abmelden: Ein Gast verliert dabei alles — vorher fragen und sein
       Konto wegräumen, damit keine verwaisten Gäste bleiben. */
    async _kontoAbmelden() {
        const ich = ANMELDUNG.ich();
        if (ich && ich.gast === true) {
            const sicher = await DIALOG.frage("Als Gast abmelden?",
                "Dein Gast-Spielstand ist danach weg. Sichern kannst du ihn in den "
                    + "Einstellungen (Spielstand sichern).", "Trotzdem abmelden", true);
            if (!sicher) {
                return;
            }
            await KONTO.eintragEntfernen(ANMELDUNG.abgleich.speicher, ich);
            await KONTO.loeschen();
        }
        KONTO.abmelden();
        ICH.personVergessen();
        ANMELDUNG._ichIdSetzen(null);
        ANMELDUNG.anmelden();
    },

    async _kontoLoeschen(ich) {
        let ergebnis;
        if (ich.gast === true) {
            ergebnis = await KONTO.eintragEntfernen(ANMELDUNG.abgleich.speicher, ich);
            await KONTO.loeschen();
            KONTO.abmelden();
        } else {
            const passwort = await DIALOG.passwort("UPCrew-Konto löschen",
                "Zur Sicherheit noch einmal dein Passwort. Danach ist dein Konto "
                    + "weg - in allen Spielen von UPCrew.", "Endgültig löschen");
            if (passwort === null || passwort === undefined) {
                return;
            }
            ergebnis = await KONTO.kontoLoeschen(ANMELDUNG.abgleich.speicher, ich, passwort);
        }
        if (!ergebnis.ok) {
            await DIALOG.hinweis("Nicht gelöscht", ergebnis.text);
            return;
        }
        ICH.personVergessen();
        ANMELDUNG._ichIdSetzen(null);
        await ANMELDUNG._kontoNachladen();
        ANMELDUNG.anmelden();
    },

    /* ---------------------------------------------------------------- *
     * Bausteine
     * ---------------------------------------------------------------- */

    /* Ein Feld mit Fehlerzeile, mit der richtigen `autocomplete`-Angabe —
       Passwort-Manager dürfen helfen (Best Practice). */
    _kontoFeld(kasten, beschriftung, art) {
        const marke = document.createElement("label");
        marke.className = "anmeldung-beschriftung";
        marke.textContent = beschriftung;
        kasten.appendChild(marke);

        const feld = document.createElement("input");
        feld.className = "anmeldung-feld";
        feld.value = "";
        feld.autocomplete = art;
        feld.setAttribute("aria-label", beschriftung);
        feld.setAttribute("autocapitalize", "off");
        feld.spellcheck = false;

        if (art === "current-password" || art === "new-password") {
            feld.type = "password";
            feld.maxLength = 64;
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

        const fehler = document.createElement("p");
        fehler.className = "anmeldung-fehler";
        fehler.setAttribute("role", "alert");
        kasten.appendChild(fehler);
        return { feld: feld, fehler: fehler };
    },

    /* Symbole und Leerzeichen fallen beim Tippen sofort heraus. */
    _nameFeldSaeubern(feld) {
        feld.maxLength = KONTO.NAME_MAX;
        feld.addEventListener("input", () => {
            const sauber = KONTO.nameSaeubern(feld.value);
            if (sauber !== feld.value) {
                feld.value = sauber;
            }
        });
    },

    /* Live-Prüfung eines Formulars mit (optional) Name, Passwort und
       Wiederholung. Liefert die Prüf-Funktion. */
    _kontoFormularPruefen(name, passwort, wiederholung, knopf) {
        const pruefen = () => {
            let gueltig = true;
            if (name) {
                const regel = name.feld.value === "" ? "" : KONTO.namePruefen(name.feld.value);
                name.fehler.textContent = regel;
                gueltig = gueltig && name.feld.value !== "" && regel === "";
            }
            const regel = passwort.feld.value === "" ? "" : KONTO.passwortPruefen(passwort.feld.value);
            passwort.fehler.textContent = regel;
            gueltig = gueltig && passwort.feld.value !== "" && regel === "";

            const gleich = wiederholung.feld.value === passwort.feld.value;
            wiederholung.fehler.textContent = (wiederholung.feld.value !== "" && !gleich)
                ? "Die beiden Passwörter stimmen nicht überein." : "";
            gueltig = gueltig && wiederholung.feld.value !== "" && gleich;
            knopf.disabled = !gueltig;
        };
        [name, passwort, wiederholung].filter(Boolean)
            .forEach((teil) => teil.feld.addEventListener("input", pruefen));
        return pruefen;
    },

    /* Nach Umzug, neuem Konto, Neu-Verbinden, Gast-Sichern: Liste neu laden,
       übernehmen, Bild zu — oder die Meldung unter das Feld. */
    async _kontoFertig(ergebnis, meldungFeld, pruefen, gruss) {
        if (!ergebnis.ok) {
            FUEHLEN.fehler();
            meldungFeld.fehler.textContent = ergebnis.text;
            pruefen();
            return;
        }
        await ANMELDUNG._kontoNachladen();
        ANMELDUNG._uebernehmen(ergebnis.eintrag);
        ANMELDUNG._vollbildSchliessen();
        /* Erfolg spürt man (UPCrew-Standard, seit v0.140.0); die Meldung
           ist ein Stichwort und der Name, kein Ausruf. */
        FUEHLEN.erfolg();
        DIALOG.kurzmeldung(gruss + KONTO.anzeigeName(ergebnis.eintrag));
    },

    /* Die Spielerliste frisch vom Server — nach jedem Konto-Ablauf, damit
       Namen, Nummern und Rollen sofort stimmen. */
    async _kontoNachladen() {
        const abgleich = ANMELDUNG.abgleich;
        abgleich.eigenerVorgangBeginnt();
        try {
            abgleich.daten = await abgleich.speicher.laden();
            abgleich.beiDaten(abgleich.daten);
        } catch (fehler) {
            /* Kein Netz: Die regelmässige Abfrage holt es nach. */
        } finally {
            abgleich.eigenerVorgangEndet();
        }
    },

    /* Die alte Blunderluck-Spielerliste, einmal je Sitzung. Ohne
       `konto.altBasis` (alte Datenbank gelöscht) ist sie leer. */
    _altLaden() {
        const konto = KONFIG.konto || {};
        if (!konto.altBasis) {
            ANMELDUNG._altDaten = SPIELER.leereDaten();
            return Promise.resolve({ daten: ANMELDUNG._altDaten });
        }
        if (ANMELDUNG._altDaten) {
            return Promise.resolve({ daten: ANMELDUNG._altDaten });
        }
        if (!ANMELDUNG._altVersprechen) {
            const alt = new SpeicherGemeinsam(konto.altBasis, konto.altPfad || "spieler",
                (roh) => SPIELER.normalisieren(roh));
            alt.mitAnmeldung = false;
            ANMELDUNG._altVersprechen = alt.laden()
                .then((daten) => {
                    ANMELDUNG._altDaten = daten;
                    return { daten: daten };
                })
                .catch((fehler) => ({ fehler: fehler }))
                .finally(() => { ANMELDUNG._altVersprechen = null; });
        }
        return ANMELDUNG._altVersprechen;
    }
});
