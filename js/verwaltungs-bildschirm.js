/*
 * verwaltungs-bildschirm.js — die Spieler-Verwaltung als eigener Bildschirm.
 *
 * Bis v0.99.0 hing die Liste der Mitspieler direkt in der Spieler-Karte der
 * Einstellungen: alle untereinander, je eine Zeile mit Entfernen-Knopf. Ab
 * einer Handvoll Spieler wurde die Karte damit unübersichtlich
 * (Nutzer-Ansage 27.08.2026: „gebe mir in der verwaltung nicht alle spieler
 * unter einander sonderern alls seperater screen und als Tabelle").
 *
 * Jetzt ist die Verwaltung dasselbe Fenster-Muster wie die Einstellungen
 * selbst: ein Tab ohne Leisten-Knopf (`inLeiste: false`), erreichbar nur über
 * TABS.wechseln — den Wechsel macht ANMELDUNG.verwaltungOeffnen, und NUR
 * nachdem VERWALTUNG.verlangen das Passwort geprüft hat. Dieser Bildschirm
 * prüft beim Zeichnen trotzdem selbst noch einmal ICH.verwaltungAktiv():
 * Wer ohne Freischaltung hierher gerät (etwa nach „Verwaltung beenden" auf
 * einem zweiten Weg), sieht nur den Hinweis, nie die Knöpfe.
 *
 * Die Tabelle zeigt, was die Spieler-Einträge hergeben, OHNE Geheimnisse:
 * Name, gekürzte Kennung (hilft, doppelte Anmeldungen auseinanderzuhalten),
 * ob ein Passwort hinterlegt ist (ja/nein — nie die Prüfsumme selbst) und
 * die Zahl der Freunde. Das Entfernen läuft unverändert über
 * ANMELDUNG.spielerEntfernen, mit der Zwei-Schritt-Bestätigung.
 */

const VERWALTUNGS_BILDSCHIRM = {

    id: "verwaltung",
    titel: "Verwaltung",

    /* Kein Knopf in der Tab-Leiste — erreichbar nur über die Einstellungen
       (dasselbe Muster wie die Einstellungen selbst, seit v0.9.0). */
    inLeiste: false,

    wurzelEl: null,

    aufbauen(behaelter) {
        VERWALTUNGS_BILDSCHIRM.wurzelEl = behaelter;
        VERWALTUNGS_BILDSCHIRM._zeichnen();
    },

    beimOeffnen() {
        VERWALTUNGS_BILDSCHIRM._zeichnen();
    },

    _zeichnen() {
        const wurzel = VERWALTUNGS_BILDSCHIRM.wurzelEl;
        if (!wurzel) {
            return;
        }
        wurzel.innerHTML = "";

        /* Ein Fenster wie die Einstellungen: Tab-Leiste weg, oben links der
           eine Zurück-Knopf (Haus-Muster seit v0.113). */
        if (typeof TABS !== "undefined" && TABS.rundeSetzen) {
            TABS.rundeSetzen("verwaltung", true);
        }

        const kopfzeile = document.createElement("div");
        kopfzeile.className = "partie-kopf";
        kopfzeile.appendChild(ZUSTAND.alsZurueck(VERWALTUNGS_BILDSCHIRM._knopf("Zurück",
            "knopf-still knopf-klein", () => TABS.wechseln("einstellungen"))));

        const kopfTitel = document.createElement("h2");
        kopfTitel.className = "partie-titel";
        kopfTitel.textContent = "Verwaltung";
        kopfzeile.appendChild(kopfTitel);
        wurzel.appendChild(kopfzeile);

        const karte = document.createElement("section");
        karte.className = "karte";
        wurzel.appendChild(karte);

        const kopf = document.createElement("h2");
        kopf.textContent = "Spieler";
        karte.appendChild(kopf);

        /* Ohne Freischaltung gibt es hier nichts zu sehen — der Weg herein
           führt über ANMELDUNG.verwaltungOeffnen samt Passwort. */
        if (!ICH.verwaltungAktiv()) {
            const hinweis = document.createElement("p");
            hinweis.className = "erklaerung";
            hinweis.textContent = (typeof KONTO !== "undefined" && KONTO.aktiv())
                ? "Nur Rolle Admin"
                : "Nicht freigeschaltet · über Einstellungen "
                    + "mit Verwaltungs-Passwort";
            karte.appendChild(hinweis);
            return;
        }

        const erklaerung = document.createElement("p");
        erklaerung.className = "erklaerung";
        /* Seit dem UPCrew-Umzug sind es die Konten ALLER Spiele — Entfernen
           wirkt überall, nicht nur in Blunderluck. */
        erklaerung.textContent = "Alle UPCrew-Konten · Entfernen gilt in "
            + "ALLEN Spielen · samt Spielerliste und Rangliste";
        karte.appendChild(erklaerung);

        /* Mit UPCrew-Konto (seit v0.138.0): Name#Nummer, Rollen, Neu-Verbinden. */
        const mitKonto = (typeof KONTO !== "undefined" && KONTO.aktiv());
        karte.appendChild(mitKonto
            ? VERWALTUNGS_BILDSCHIRM._kontoTabelleBauen()
            : VERWALTUNGS_BILDSCHIRM._tabelleBauen());

        /* Die Spielerliste mit Statistiken (seit v0.152.1, gemeinsamer
           Baustein js\upcrew-spielerliste.js, gleich in Typoluck): nur
           lesen, nur mit Konto und Rolle Admin. */
        const liste = mitKonto ? VERWALTUNGS_BILDSCHIRM._spielerlisteBauen() : null;
        if (liste) {
            wurzel.appendChild(liste);
        }

        /* „§12 nachziehen" (seit v0.154.0): nur UP#Plus, nur unter Regel §12. */
        const nachziehen = mitKonto ? VERWALTUNGS_BILDSCHIRM._nachziehenBauen() : null;
        if (nachziehen) {
            wurzel.appendChild(nachziehen);
        }

        /*
         * BRETT-ANPASSUNG (seit v0.129.0, Nutzer-Ansage 24.09.2026): Farben,
         * Figuren und Blick des 3D-Bretts stellt nur der Admin um. Der
         * Schalter blendet am Brett den Paletten-Knopf ein oder aus — auf
         * diesem Gerät, solange die Verwaltung offen ist.
         */
        const anpassung = document.createElement("section");
        anpassung.className = "karte";
        const anpassungKopf = document.createElement("h2");
        anpassungKopf.textContent = "Brett-Anpassung";
        anpassung.appendChild(anpassungKopf);
        const an = (typeof ICH.anpassungAn === "function") && ICH.anpassungAn();
        const anpassungText = document.createElement("p");
        anpassungText.className = "erklaerung";
        anpassungText.textContent = an
            ? "An · Paletten-Knopf am Brett · Farben, Figuren, Blick"
            : "Aus · kein Paletten-Knopf am Brett";
        anpassung.appendChild(anpassungText);
        const schalter = VERWALTUNGS_BILDSCHIRM._knopf(
            an ? "Ausschalten" : "Einschalten",
            an ? "knopf-still knopf-klein" : "knopf-haupt knopf-klein",
            () => {
                if (typeof ICH.anpassungSetzen === "function") {
                    ICH.anpassungSetzen(!an);
                }
                VERWALTUNGS_BILDSCHIRM._zeichnen();
            });
        schalter.setAttribute("aria-pressed", an ? "true" : "false");
        const anpassungFuss = document.createElement("div");
        anpassungFuss.className = "karte-fuss";
        anpassungFuss.appendChild(schalter);
        anpassung.appendChild(anpassungFuss);
        wurzel.appendChild(anpassung);

        /* Die Freischaltung sichtbar wieder schliessen — vorher tat das der
           Umschalt-Knopf in den Einstellungen. */
        /* Mit UPCrew-Konto gibt es nichts zu beenden — die Rolle hängt am
           Konto, nicht an einer Freischaltung auf dem Gerät. */
        if (!mitKonto) {
            const fuss = document.createElement("div");
            fuss.className = "karte-fuss";
            fuss.appendChild(VERWALTUNGS_BILDSCHIRM._knopf(
                "Verwaltung beenden", "knopf-still knopf-klein",
                () => ANMELDUNG.verwaltungBeenden()));
            karte.appendChild(fuss);
        }
    },

    /*
     * Die Tabelle der UPCrew-Konten (seit v0.138.0). Wer was darf, prüfen
     * die Regeln der Datenbank; hier werden nur die passenden Knöpfe
     * gezeigt:
     *   Neu verbinden  jeder Admin, für echte Konten („Passwort vergessen")
     *   Admin geben    nur UP#Plus (AboveAdmin)
     *   Entfernen      jeder Admin; nie UP#Plus, nie das eigene Konto
     */
    /*
     * DIE SPIELERLISTE FÜR ADMINS (seit v0.152.1; Nutzer 27.09.2026: „in
     * beiden generell eine Spielerliste mit Statistiken und co, aber nur der
     * Admin-Account"). Der Baustein zeichnet und sortiert; die Rechner kommen
     * von hier: Rolle (KONTO), Level und Serie (FORTSCHRITT, über alle
     * Zweige), Abzeichen (UPCREW_ABZEICHEN), Münzen (UPCREW_MUENZEN, Saldo
     * über alle Zweige — ehrlich, also auch ein kurzes Minus). UP#Plus steht
     * nicht in der Liste (verteilt nur Rollen).
     */
    _spielerlisteDaten() {
        const daten = ANMELDUNG.abgleich.daten;
        const heute = FORTSCHRITT.datumVon(Date.now());
        const serieVon = (stand) => FORTSCHRITT.serie(stand, heute,
            FORTSCHRITT.schutzVerdient(FORTSCHRITT.level(stand).level)).tage;
        const spieler = ((daten && daten.spieler) || [])
            .filter((eintrag) => !SPIELER.istVerteiler(eintrag))
            .map((eintrag) => Object.assign({}, eintrag, {
                muenzen: (typeof UPCREW_MUENZEN !== "undefined")
                    ? UPCREW_MUENZEN.saldo(eintrag.fortschritt || null) : undefined
            }));
        return UPCREW_SPIELERLISTE.zeilen(spieler, {
            rolle: (uid) => KONTO.rolleVon(daten, uid),
            level: (stand) => ({ level: FORTSCHRITT.level(stand).level, xp: FORTSCHRITT.gesamtXp(stand) }),
            serie: serieVon,
            abzeichen: (stand) => {
                if (typeof UPCREW_ABZEICHEN === "undefined") {
                    return null;
                }
                const liste = UPCREW_ABZEICHEN.liste(FORTSCHRITT.normalisieren(stand), serieVon(stand));
                return { erreicht: liste.filter((e) => e.erreicht > 0).length, alle: liste.length };
            }
        });
    },

    _spielerlisteBauen() {
        if (typeof UPCREW_SPIELERLISTE === "undefined" || typeof FORTSCHRITT === "undefined"
                || typeof KONTO === "undefined" || !ANMELDUNG.abgleich
                || !KONTO.istAdmin(ANMELDUNG.abgleich.daten, KONTO.uid())) {
            return null;
        }
        const karte = document.createElement("section");
        karte.className = "karte";
        const kopf = document.createElement("h2");
        kopf.textContent = "Spielerliste";
        karte.appendChild(kopf);
        UPCREW_SPIELERLISTE.bauen(karte, {
            zeilen: VERWALTUNGS_BILDSCHIRM._spielerlisteDaten(),
            beiAuswahl: (zeile) => DIALOG.hinweis(zeile.name + (zeile.tag ? "#" + zeile.tag : ""), "",
                UPCREW_SPIELERLISTE.details(zeile))
        });
        return karte;
    },

    /*
     * „§12 NACHZIEHEN" (seit v0.154.0, Apps\UPCrew\docs\DATENBANK-KONZEPT-12.md
     * Phase A Punkt 4 und Phase B Schritt 2): Direkt nach dem Einspielen der
     * Regel §12 fehlen die öffentlichen Auszüge und das Anmeldeverzeichnis —
     * bis dahin stehen keine Namen in den Listen, und auf neuen Geräten geht
     * die Anmeldung mit Namen nicht. Der Knopf schreibt beides für alle
     * Konten (`KONTO.nachziehen`), wiederholbar. Sichtbar nur für UP#Plus
     * und nur, wenn die App die Regel §12 erkannt hat.
     */
    _nachziehenBauen() {
        if (typeof KONTO === "undefined" || typeof KONTO.istP12 !== "function"
                || !KONTO.istP12() || KONTO.uid() !== KONTO.OBER_UID) {
            return null;
        }
        const karte = document.createElement("section");
        karte.className = "karte";
        const kopf = document.createElement("h2");
        kopf.textContent = "Regel §12";
        karte.appendChild(kopf);
        const text = document.createElement("p");
        text.className = "erklaerung";
        text.textContent = "Auszüge und Anmeldeverzeichnis für alle Konten · wiederholbar";
        karte.appendChild(text);
        const knopf = VERWALTUNGS_BILDSCHIRM._knopf("§12 nachziehen", "knopf-still", async () => {
            knopf.disabled = true;
            const ergebnis = await KONTO.nachziehen(ANMELDUNG.abgleich.speicher);
            knopf.disabled = false;
            if (!ergebnis.ok) {
                await DIALOG.hinweis("Nicht nachgezogen", ergebnis.text);
                return;
            }
            await ANMELDUNG._kontoNachladen();
            await DIALOG.hinweis("Nachgezogen", ergebnis.geschrieben + " geschrieben · "
                + ergebnis.uebersprungen + " übersprungen");
        });
        karte.appendChild(knopf);
        return karte;
    },

    _kontoTabelleBauen() {
        const rollbereich = document.createElement("div");
        rollbereich.className = "tabelle-rollbereich";
        const tabelle = document.createElement("table");
        tabelle.className = "ergebnis-tabelle";

        const tabellenkopf = document.createElement("thead");
        const kopfzeile = document.createElement("tr");
        for (const beschriftung of ["Name", "Konto", "Rolle", "Freunde", ""]) {
            const zelle = document.createElement("th");
            zelle.textContent = beschriftung;
            kopfzeile.appendChild(zelle);
        }
        tabellenkopf.appendChild(kopfzeile);
        tabelle.appendChild(tabellenkopf);

        const koerper = document.createElement("tbody");
        const daten = ANMELDUNG.abgleich.daten;
        const meineUid = KONTO.uid();
        const binOberAdmin = KONTO.istOberAdmin(daten, meineUid);

        for (const spieler of SPIELER.normalisieren(daten).spieler) {
            const binIch = spieler.uid === meineUid;
            const istOber = KONTO.istOberAdmin(daten, spieler.uid);
            const rolle = KONTO.rolleVon(daten, spieler.uid);

            const zeile = document.createElement("tr");
            if (binIch) {
                zeile.className = "zeile-ich";
            }
            const zelle = (text) => {
                const td = document.createElement("td");
                td.textContent = text;
                zeile.appendChild(td);
                return td;
            };
            zelle(KONTO.anzeigeName(spieler) + (binIch ? " (du)" : ""));
            zelle(spieler.gast === true ? "Gast"
                : (spieler.neuVerbinden === true ? "freigegeben" : "verbunden"));
            zelle(rolle || "-");
            zelle(String(spieler.freunde.length));

            const aktion = document.createElement("td");
            aktion.className = "verwaltung-aktion";
            if (!binIch && !istOber) {
                if (spieler.gast !== true && spieler.neuVerbinden !== true) {
                    aktion.appendChild(DIALOG.zweiSchritt(
                        VERWALTUNGS_BILDSCHIRM._knopf("Neu verbinden",
                            "knopf-still knopf-klein", null),
                        () => ANMELDUNG.neuVerbindenFreigeben(spieler.id)));
                }
                if (binOberAdmin && spieler.gast !== true) {
                    aktion.appendChild(DIALOG.zweiSchritt(
                        VERWALTUNGS_BILDSCHIRM._knopf(
                            rolle === "Admin" ? "Admin nehmen" : "Admin geben",
                            "knopf-still knopf-klein", null),
                        () => ANMELDUNG.rolleUmschalten(spieler.id)));
                }
                aktion.appendChild(DIALOG.zweiSchritt(
                    VERWALTUNGS_BILDSCHIRM._knopf("Entfernen",
                        "knopf-gefahr knopf-klein", null),
                    () => ANMELDUNG.spielerEntfernen(spieler.id)));
            }
            zeile.appendChild(aktion);
            koerper.appendChild(zeile);
        }

        tabelle.appendChild(koerper);
        rollbereich.appendChild(tabelle);
        return rollbereich;
    },

    /*
     * Eine Zeile je Spieler. Gezeichnet wird nur mit ICH und SPIELER;
     * ANMELDUNG wird erst im Klick-Behandler angefasst — dasselbe Muster wie
     * die Spieler-Karte der Einstellungen (Regressionstest gegen das
     * nachgebaute DOM).
     */
    _tabelleBauen() {
        /* Der Rollbereich: Auf schmalen Bildschirmen rollt die Tabelle
           WAAGERECHT in diesem Behälter, statt die Seite zu verbreitern
           (Regel in css\stil.css, .tabelle-rollbereich). */
        const rollbereich = document.createElement("div");
        rollbereich.className = "tabelle-rollbereich";

        const tabelle = document.createElement("table");
        tabelle.className = "ergebnis-tabelle";

        const tabellenkopf = document.createElement("thead");
        const kopfzeile = document.createElement("tr");
        for (const beschriftung of ["Name", "Kennung", "Passwort", "Freunde", ""]) {
            const zelle = document.createElement("th");
            zelle.textContent = beschriftung;
            kopfzeile.appendChild(zelle);
        }
        tabellenkopf.appendChild(kopfzeile);
        tabelle.appendChild(tabellenkopf);

        const koerper = document.createElement("tbody");
        const person = ICH.person();
        const daten = (typeof ANMELDUNG !== "undefined" && ANMELDUNG.abgleich)
            ? ANMELDUNG.abgleich.daten : null;
        const liste = SPIELER.normalisieren(daten).spieler;

        for (const spieler of liste) {
            const binIch = !!(person && spieler.id === person.id);

            const zeile = document.createElement("tr");
            if (binIch) {
                zeile.className = "zeile-ich";
            }

            const name = document.createElement("td");
            name.textContent = spieler.name + (binIch ? " (du)" : "");
            zeile.appendChild(name);

            /* Die Kennung GEKÜRZT: Sie ist kein Geheimnis (die Datenbank ist
               offen), aber in voller Länge unlesbar. Die ersten acht Zeichen
               reichen, um zwei Einträge auseinanderzuhalten. */
            const kennung = document.createElement("td");
            kennung.className = "verwaltung-kennung";
            kennung.textContent = spieler.id.slice(0, 8);
            zeile.appendChild(kennung);

            /* Nur JA oder NEIN — nie Prüfsumme oder Salz. */
            const passwort = document.createElement("td");
            passwort.textContent = SPIELER.hatPin(spieler) ? "ja" : "nein";
            zeile.appendChild(passwort);

            const freunde = document.createElement("td");
            freunde.textContent = String(spieler.freunde.length);
            zeile.appendChild(freunde);

            const aktion = document.createElement("td");
            aktion.className = "verwaltung-aktion";
            aktion.appendChild(DIALOG.zweiSchritt(
                VERWALTUNGS_BILDSCHIRM._knopf("Entfernen",
                    "knopf-gefahr knopf-klein", null),
                () => ANMELDUNG.spielerEntfernen(spieler.id)));
            zeile.appendChild(aktion);

            koerper.appendChild(zeile);
        }

        tabelle.appendChild(koerper);
        rollbereich.appendChild(tabelle);
        return rollbereich;
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
