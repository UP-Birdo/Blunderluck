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
 *   - Mit UPCrew-Konto anmelden: Name und Passwort (seit v0.151.8; die
 *     Nummer muss niemand kennen — „Name#Nummer" geht weiter direkt).
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
        const kasten = ANMELDUNG._kastenBauen("Umzug zu UPCrew",
            "Einmal altes Passwort · dann neues · Partien, Freunde, "
                + "Abzeichen ziehen mit");
        kasten.appendChild(ANMELDUNG._knopfBauen("Weiter",
            "knopf-haupt anmeldung-knopf", () => ANMELDUNG._kontoAnmeldenZeigen(vorname)));
        kasten.appendChild(ANMELDUNG._knopfBauen("Anderes Konto",
            "knopf-still anmeldung-knopf", () => ANMELDUNG._kontoWeicheZeigen()));
    },

    _kontoAnmeldenZeigen(vorbelegt) {
        const kasten = ANMELDUNG._kastenBauen("Anmelden",
            "Name und Passwort · altes Konto: Name und altes Passwort");
        const name = ANMELDUNG._kontoFeld(kasten, "Name", "username");
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
            if (ergebnis.abgebrochen) {
                pruefen();
                return;
            }
            FUEHLEN.fehler();
            if (ergebnis.fehler === "falsch") {
                fehlversuche += 1;
                passwort.feld.value = "";
                /* Wurden mehrere Konten gleichen Namens versucht, bleibt
                   offen, ob Name oder Passwort falsch ist (seit v0.151.8). */
                const wasFalsch = ergebnis.reihum ? "Name oder Passwort falsch" : "Passwort falsch";
                passwort.fehler.textContent = fehlversuche >= 3
                    ? wasFalsch + " · vergessen? Admin gibt Neu-Verbinden frei"
                    : wasFalsch;
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
            await ANMELDUNG._nachAnmeldungLaden();
            ANMELDUNG._uebernehmen(ergebnis.spieler);
            return { ok: true };
        }
        if (ergebnis.fehler === "freigegeben") {
            return { weiter: () => ANMELDUNG._kontoNeuesPasswortZeigen("neuVerbinden",
                ergebnis.spieler) };
        }
        if (ergebnis.fehler === "auswahl") {
            return ANMELDUNG._kontoAuswaehlen(ergebnis.auswahl, passwort);
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
                text: "Konto unbekannt · neues Konto?" };
        }
        if (!SPIELER.hatPin(altSpieler)
                || !await VERSIEGELUNG.pinPruefen(passwort, altSpieler.pinSalz,
                    altSpieler.pinPruefwert)) {
            return { fehler: "falsch" };
        }
        return { weiter: () => ANMELDUNG._kontoNeuesPasswortZeigen("umzug", altSpieler, passwort) };
    },

    /*
     * „Welches Konto?" (seit v0.151.9): Name und Passwort passen zu mehreren
     * gleichnamigen Konten. Hier — und nur hier im Ablauf — steht die Nummer,
     * weil die Konten sonst nicht zu unterscheiden sind; dazu Level und der
     * letzte Spieltag, soweit im Eintrag lesbar.
     */
    async _kontoAuswaehlen(auswahl, passwort) {
        const eintraege = auswahl.map((spieler, nummer) => ({
            beschriftung: spieler.name,
            hinweis: ANMELDUNG._kontoErkennung(spieler),
            wert: String(nummer)
        }));
        const wahl = await DIALOG.liste("Welches Konto?",
            "Dein Passwort passt zu mehreren Konten", eintraege, "Abbrechen");
        if (wahl === null || wahl === undefined || !auswahl[Number(wahl)]) {
            KONTO.auswahlVerwerfen();
            return { abgebrochen: true };
        }
        const ergebnis = await KONTO.anmeldenAuswahl(auswahl[Number(wahl)], passwort);
        if (!ergebnis.ok) {
            return ergebnis;
        }
        await ANMELDUNG._nachAnmeldungLaden();
        ANMELDUNG._uebernehmen(ergebnis.spieler);
        return { ok: true };
    },

    /* Regel §12 (seit v0.154.0): Vor der Anmeldung war nur die Marke
       lesbar — der eigene Eintrag und die Liste kommen erst jetzt. Unter der
       alten Regel lag beides schon da; dann wird nichts extra geladen. */
    async _nachAnmeldungLaden() {
        if (typeof KONTO.istP12 === "function" && KONTO.istP12()) {
            await ANMELDUNG._kontoNachladen();
        }
    },

    /* „#1234 · Level 5 · zuletzt 26.09." — was ohne Anmeldung lesbar ist. */
    _kontoErkennung(spieler) {
        const teile = ["#" + spieler.tag];
        if (typeof FORTSCHRITT !== "undefined" && spieler.fortschritt) {
            try {
                teile.push("Level " + FORTSCHRITT.level(spieler.fortschritt).level);
                const tage = Array.from(FORTSCHRITT.alleTage(spieler.fortschritt)).sort();
                const letzter = tage[tage.length - 1];
                if (letzter) {
                    teile.push("zuletzt " + letzter.slice(8, 10) + "." + letzter.slice(5, 7) + ".");
                }
            } catch (fehler) {
                /* Unlesbarer Fortschritt: dann nur die Nummer. */
            }
        }
        return teile.join(" · ");
    },

    /*
     * Das neue Passwort festlegen — für den Umzug (mit Namensfeld, falls der
     * alte Name nach den neuen Regeln nicht geht) und fürs Neu-Verbinden.
     */
    _kontoNeuesPasswortZeigen(art, spieler, altesPasswort) {
        const umzug = (art === "umzug");
        const kasten = ANMELDUNG._kastenBauen(
            umzug ? "UPCrew-Passwort" : "Neu verbinden",
            (umzug
                ? "Altes Passwort stimmt · neues: "
                : "Neues Passwort: ")
                + KONTO.passwortRegelText());

        const name = umzug ? ANMELDUNG._kontoFeld(kasten, "Name", "username") : null;
        if (name) {
            name.feld.value = KONTO.nameSaeubern(spieler.name);
            ANMELDUNG._nameFeldSaeubern(name.feld);
        }
        const passwort = ANMELDUNG._kontoFeld(kasten, "Neues Passwort", "new-password");
        const wiederholung = ANMELDUNG._kontoFeld(kasten, "Passwort wiederholen", "new-password");
        const los = ANMELDUNG._knopfBauen(umzug ? "Umziehen" : "Neu verbinden",
            "knopf-haupt anmeldung-knopf anmeldung-weiter", null);

        const pruefen = ANMELDUNG._kontoFormularPruefen(name, passwort, wiederholung, los);

        los.addEventListener("click", async () => {
            if (los.disabled || !ANMELDUNG._kontoVorSenden(pruefen)) {
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
            "Für alle UPCrew-Spiele · Name und Passwort genügen");
        const name = ANMELDUNG._kontoFeld(kasten, "Name · Buchstaben, Ziffern", "username");
        ANMELDUNG._nameFeldSaeubern(name.feld);
        const passwort = ANMELDUNG._kontoFeld(kasten,
            "Passwort (" + KONTO.passwortRegelText() + ")", "new-password");
        const wiederholung = ANMELDUNG._kontoFeld(kasten, "Passwort wiederholen", "new-password");
        const los = ANMELDUNG._knopfBauen("UPCrew-Konto erstellen",
            "knopf-haupt anmeldung-knopf anmeldung-weiter", null);

        const pruefen = ANMELDUNG._kontoFormularPruefen(name, passwort, wiederholung, los);
        const allgemein = ANMELDUNG._kontoAllgemein(kasten);

        los.addEventListener("click", async () => {
            if (los.disabled || !ANMELDUNG._kontoVorSenden(pruefen)) {
                return;
            }
            los.disabled = true;
            allgemein.fehler.textContent = "";
            const ergebnis = await KONTO.kontoAnlegen(ANMELDUNG.abgleich.speicher,
                ANMELDUNG.abgleich.daten, name.feld.value, passwort.feld.value);
            await ANMELDUNG._kontoFertig(ergebnis, name, pruefen, "Angemeldet · ",
                { name: name, passwort: passwort, wiederholung: wiederholung, allgemein: allgemein });
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
        DIALOG.kurzmeldung("Gast · " + ergebnis.eintrag.name);
    },

    /* ---------------------------------------------------------------- *
     * Einladungslink ohne Anmeldung (seit v0.151.7)
     *
     * Nutzer 27.09.2026: „mach den teilbaren Link so, dass man in die Runde
     * kommt, ohne sich anmelden zu müssen — also einen Gast-Account im
     * Hintergrund erstellen, und wenn man fertig ist mit der Runde, soll man
     * gefragt werden: Account erstellen".
     *
     * Kommt jemand OHNE Person auf dem Gerät über einen Link mit `?code=`,
     * legt `anmelden` still einen Gast an (derselbe Weg wie „Als Gast
     * spielen": anonymes Firebase-Konto + Eintrag „Gast#1234") — ohne
     * Vollbild. Danach läuft der gewohnte Weg: `beiAngemeldet` → der Code
     * aus der Adresse → beitreten. Scheitert es, kommt „Nochmal"; der Code
     * bleibt in der Adresse, bis das Beitreten wirklich läuft.
     * ---------------------------------------------------------------- */

    /* Merker auf dem Gerät: „1" = eine Einladungs-Runde als Gast steht an,
       nach ihrem Ende wird einmal nach einem Konto gefragt. */
    EINLADUNG_GAST_SCHLUESSEL: "blunderluck.einladung-gast",

    /* Still als Gast anmelden und die Einladung annehmen. Liefert wahr,
       wenn der Gast steht. */
    async einladungAlsGast() {
        ANMELDUNG.anmeldenLaeuft = true;
        for (;;) {
            let ergebnis = null;
            try {
                ergebnis = await KONTO.gastAnlegen(ANMELDUNG.abgleich.speicher, ANMELDUNG.abgleich.daten);
            } catch (fehler) {
                ergebnis = { ok: false, text: fehler && fehler.message };
            }
            if (ergebnis && ergebnis.ok) {
                await ANMELDUNG._kontoNachladen();
                ANMELDUNG._uebernehmen(ergebnis.eintrag);
                /* Schliesst nur den (unsichtbaren) Vorgang und meldet
                   „angemeldet" → app.js nimmt den Code aus der Adresse. */
                ANMELDUNG._vollbildSchliessen();
                DIALOG.kurzmeldung("Gast · " + ergebnis.eintrag.name);
                return true;
            }
            const nochmal = await DIALOG.fehler("Beitreten geht nicht", {
                folge: "Code bleibt", technik: ergebnis && ergebnis.text, nochmal: true });
            if (!nochmal) {
                /* Kein zweiter Versuch: das gewohnte Anmelde-Bild — der Code
                   steht weiter in der Adresse und gilt nach jeder Anmeldung. */
                ANMELDUNG.anmeldenLaeuft = false;
                ANMELDUNG._vollbildZeigen();
                return false;
            }
        }
    },

    /* Wurde gerade als Gast über einen Link beigetreten? Dann nach dem Ende
       dieser Runde einmal fragen (gerufen aus `einladungAusAdresseAnnehmen`). */
    einladungsGastMerken() {
        if (!ANMELDUNG.istGast()) {
            return;
        }
        try {
            window.localStorage.setItem(ANMELDUNG.EINLADUNG_GAST_SCHLUESSEL, "1");
        } catch (fehler) {
            /* ohne Gerätespeicher: dann wird eben nicht gefragt */
        }
    },

    /* Die Regel, rein: gefragt wird nur ein Gast, und nur, wenn eine
       Einladungs-Runde ansteht (Merker „1"). */
    sollNachEinladungFragen(istGast, merker) {
        return istGast === true && merker === "1";
    },

    /*
     * NACH DEM ENDE DER RUNDE (Abschluss weggelegt, js\team-schach-
     * auswertung.js `abschlussSchliessen`): einmal kurz fragen. Der Merker
     * wird VOR der Frage gelöscht — so fragt es höchstens einmal je Runde,
     * und nach „Später" erst wieder nach der nächsten Einladungs-Runde.
     * „Konto erstellen" = der bestehende Weg „Spielstand sichern"
     * (`gastSichernOeffnen`): Der Gast wird zum Konto, alles bleibt.
     */
    async nachEinladungFragen() {
        let merker = null;
        try {
            merker = window.localStorage.getItem(ANMELDUNG.EINLADUNG_GAST_SCHLUESSEL);
        } catch (fehler) {
            return false;
        }
        if (!KONTO.aktiv() || !ANMELDUNG.sollNachEinladungFragen(ANMELDUNG.istGast(), merker)) {
            return false;
        }
        try {
            window.localStorage.removeItem(ANMELDUNG.EINLADUNG_GAST_SCHLUESSEL);
        } catch (fehler) {
            return false;
        }
        const ja = await DIALOG._zeigen({
            titel: "Konto erstellen?",
            text: "Partie, Fortschritt, Freunde bleiben",
            zusatz: null,
            knoepfe: [
                { beschriftung: "Später", wert: false, stil: "knopf-still" },
                { beschriftung: "Konto erstellen", wert: true, stil: "knopf-haupt" }
            ]
        });
        if (ja) {
            ANMELDUNG.gastSichernOeffnen();
        }
        return true;
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
            "Gast · Spielstand nur auf diesem Gerät · mit Konto überall",
            "Sichern");
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
            "Name und Passwort · alles als "
                + eintrag.name + " bleibt");
        const name = ANMELDUNG._kontoFeld(kasten, "Name · Buchstaben, Ziffern", "username");
        ANMELDUNG._nameFeldSaeubern(name.feld);
        const passwort = ANMELDUNG._kontoFeld(kasten,
            "Passwort (" + KONTO.passwortRegelText() + ")", "new-password");
        const wiederholung = ANMELDUNG._kontoFeld(kasten, "Passwort wiederholen", "new-password");
        const los = ANMELDUNG._knopfBauen("Sichern",
            "knopf-haupt anmeldung-knopf anmeldung-weiter", null);

        const pruefen = ANMELDUNG._kontoFormularPruefen(name, passwort, wiederholung, los);
        const allgemein = ANMELDUNG._kontoAllgemein(kasten);

        los.addEventListener("click", async () => {
            if (los.disabled || !ANMELDUNG._kontoVorSenden(pruefen)) {
                return;
            }
            los.disabled = true;
            allgemein.fehler.textContent = "";
            const ergebnis = await KONTO.gastSichern(ANMELDUNG.abgleich.speicher,
                ANMELDUNG.abgleich.daten, eintrag, name.feld.value, passwort.feld.value);
            await ANMELDUNG._kontoFertig(ergebnis, name, pruefen, "Gesichert · ",
                { name: name, passwort: passwort, wiederholung: wiederholung, allgemein: allgemein });
            /* Spielzeit, „dabei seit" und der übrige Gast-Stand vom Gerät
               ziehen mit (seit v0.155.0). */
            if (ergebnis.ok && typeof FORTSCHRITT_KONTO !== "undefined") {
                FORTSCHRITT_KONTO.gastUebernehmen();
            }
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
            "Buchstaben, Ziffern · alle UPCrew-Spiele · Nummer bleibt, "
                + "wenn frei", ich.name, "Übernehmen", true);
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
            await DIALOG.hinweis("Geht nicht", ergebnis.text);
            return;
        }
        await ANMELDUNG._kontoNachladen();
        ICH.personSetzen(ich.id, name);
        ANMELDUNG._anzeigenAuffrischen();
        DIALOG.kurzmeldung("Umbenannt · " + ergebnis.eintrag.name);
    },

    /* Die eigene Nummer ändern (seit v0.151.8): würfeln oder selbst
       wählen. Anmelden geht weiter nur mit Name und Passwort. */
    async nummerAendern(ich) {
        if (!ich || ich.gast === true || !KONTO.aktiv()) {
            return;
        }
        const wahl = await DIALOG.liste("Nummer ändern",
            "Zurzeit #" + ich.tag + " · dein Freundescode",
            [
                { beschriftung: "Würfeln", hinweis: "Zufällige freie Nummer", wert: "wuerfeln" },
                { beschriftung: "Selbst wählen", hinweis: "4 Ziffern", wert: "waehlen" }
            ],
            "Abbrechen");
        if (!wahl) {
            return;
        }
        let wunsch = "";
        if (wahl === "waehlen") {
            const eingabe = await DIALOG.eingabe("Nummer wählen", "4 Ziffern, nicht 0000",
                ich.tag, "Übernehmen", true);
            if (!eingabe) {
                return;
            }
            wunsch = String(eingabe).replace(/\D/g, "");
        }
        const ergebnis = await KONTO.tagAendern(ANMELDUNG.abgleich.speicher,
            ANMELDUNG.abgleich.daten, ich, wunsch);
        if (!ergebnis.ok) {
            await DIALOG.hinweis("Geht nicht", ergebnis.text);
            return;
        }
        await ANMELDUNG._kontoNachladen();
        ANMELDUNG._anzeigenAuffrischen();
        FUEHLEN.erfolg();
        /* Die Nummer ist der Freundescode (seit v0.154.0, Konzept Abschnitt
           5 Punkt 5): Die alte findet niemanden mehr. */
        DIALOG.kurzmeldung("Neue Nummer · #" + ergebnis.eintrag.tag + " · Freunde brauchen ab jetzt diese");
    },

    async _kontoPasswortAendern(ich) {
        const altes = await DIALOG.passwort("Bisheriges Passwort",
            "Zur Sicherheit", "Weiter");
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
            await DIALOG.hinweis("Geht nicht", "UP#Plus ist fest");
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
                "Keine Berechtigung · oder kein Netz");
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
                "Spielstand weg · vorher sichern: Einstellungen",
                "Trotzdem abmelden", true);
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
                "Konto weg · in allen UPCrew-Spielen", "Endgültig löschen");
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
    /*
     * SEIT 28.09.2026 SAGT DAS FORMULAR IMMER, WAS NICHT STIMMT (Nutzer: „Bei
     * falscher Eingabe beim Account-Erstellen soll eine Meldung kommen, was
     * genau nicht stimmt"). Bis dahin war der Knopf still gesperrt, solange
     * etwas fehlte — wer nicht sah, welches Feld, kam nicht weiter. Jetzt:
     *   - beim Tippen die Meldung am Feld, sobald darin etwas steht,
     *   - der Knopf ist immer drückbar; beim Drücken stehen ALLE Meldungen
     *     da (auch „Name fehlt."), der Finger springt ins erste falsche Feld,
     *   - die Absage vom Server steht am richtigen Feld (`ergebnis.feld`,
     *     `_kontoFertig`).
     * Die Prüfung selbst ist `KONTO.formularPruefen` (in jedem Spiel gleich).
     * `pruefen(alles)` liefert, ob alles passt.
     */
    _kontoFormularPruefen(name, passwort, wiederholung, knopf) {
        const pruefen = (alles) => {
            const ergebnis = KONTO.formularPruefen(name ? name.feld.value : "Abc",
                passwort.feld.value, wiederholung.feld.value);
            const zeigen = (teil, schluessel) => {
                if (!teil) {
                    return;
                }
                teil.fehler.textContent = (alles === true || teil.feld.value !== "") ? ergebnis[schluessel] : "";
            };
            zeigen(name, "name");
            zeigen(passwort, "passwort");
            zeigen(wiederholung, "wiederholung");
            knopf.disabled = false;
            if (alles === true && ergebnis.feld) {
                const erstes = { name: name, passwort: passwort, wiederholung: wiederholung }[ergebnis.feld];
                if (erstes && erstes.feld.focus) {
                    erstes.feld.focus();
                }
            }
            return !ergebnis.feld;
        };
        [name, passwort, wiederholung].filter(Boolean)
            .forEach((teil) => teil.feld.addEventListener("input", () => pruefen(false)));
        return pruefen;
    },

    /* Die allgemeine Meldungszeile über dem Knopf (Verbindung, Server). */
    _kontoAllgemein(kasten) {
        const zeile = document.createElement("p");
        zeile.className = "anmeldung-fehler anmeldung-fehler-allgemein";
        zeile.setAttribute("role", "alert");
        kasten.appendChild(zeile);
        return { feld: { focus() { } }, fehler: zeile };
    },

    /* Vor dem Senden: alles prüfen und zeigen. Liefert wahr, wenn es passt. */
    _kontoVorSenden(pruefen) {
        if (pruefen(true)) {
            return true;
        }
        if (typeof FUEHLEN !== "undefined") {
            FUEHLEN.fehler();
        }
        return false;
    },

    /* Nach Umzug, neuem Konto, Neu-Verbinden, Gast-Sichern: Liste neu laden,
       übernehmen, Bild zu — oder die Meldung unter das Feld. */
    async _kontoFertig(ergebnis, meldungFeld, pruefen, gruss, felder) {
        if (!ergebnis.ok) {
            FUEHLEN.fehler();
            pruefen(false);
            /* Seit 28.09.2026 an das Feld, zu dem die Absage gehört. */
            const ziel = (felder && ergebnis.feld && felder[ergebnis.feld]) || meldungFeld;
            ziel.fehler.textContent = ergebnis.text;
            return;
        }
        await ANMELDUNG._kontoNachladen();
        ANMELDUNG._uebernehmen(ergebnis.eintrag);
        ANMELDUNG._vollbildSchliessen();
        /* Erfolg spürt man (UPCrew-Standard, seit v0.140.0); die Meldung
           ist ein Stichwort und der Name, kein Ausruf. */
        FUEHLEN.erfolg();
        /* Nur der Name (seit v0.151.8): Die Nummer ist zufällig und muss
           niemand kennen — zu sehen und zu ändern in den Einstellungen. */
        DIALOG.kurzmeldung(gruss + ergebnis.eintrag.name);
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
