/*
 * verwaltungs-bildschirm.js — die Spieler-Verwaltung als eigener Bildschirm.
 *
 * Bis v0.99.0 hing die Liste der Mitspieler direkt in der Spieler-Karte der
 * Einstellungen: alle untereinander, je eine Zeile mit Entfernen-Knopf. Ab
 * einer Handvoll Spieler wurde die Karte damit unübersichtlich
 * (Nutzer-Ansage 27.08.2026: „gebe mir in der verwaltung nicht alle spieler
 * unter einander sonderern alls seperater screen und als Tabelle").
 *
 * SEIT v0.156.0 im gemeinsamen Aufbau js\upcrew-einstellungen.js (gleich
 * wie die Einstellungen und wie in Typoluck, Nutzer 28.09.2026) und als
 * BLATT über den Einstellungen: Spieler · Datenbank · Nur in Blunderluck
 * (Brett-Anpassung) · Verwaltung beenden.
 *
 * Die Verwaltung ist dasselbe Muster wie die Einstellungen
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

        /* Als Blatt (seit v0.156.0) über den Einstellungen: Titel und
           Zurück trägt das Blatt. Ohne den Baustein wie bisher ein Fenster
           mit dem einen Zurück-Knopf (Haus-Muster seit v0.113). */
        const alsBlatt = typeof TABS !== "undefined" && Array.isArray(TABS._blattTabs)
            && TABS._blattTabs.indexOf(VERWALTUNGS_BILDSCHIRM.id) !== -1;
        if (!alsBlatt) {
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
        }

        const inhalt = document.createElement("div");
        inhalt.className = "verwaltung-inhalt";
        wurzel.appendChild(inhalt);

        /* Ohne Freischaltung gibt es hier nichts zu sehen — der Weg herein
           führt über ANMELDUNG.verwaltungOeffnen samt Passwort. */
        if (!ICH.verwaltungAktiv()) {
            UPCREW_EINSTELLUNGEN.bauen(inhalt, "verwaltung", [{ art: "spieler", zeilen: [{
                zeichen: "schloss",
                titel: (typeof KONTO !== "undefined" && KONTO.aktiv())
                    ? "Nur Rolle Admin"
                    : "Nicht freigeschaltet · über Einstellungen mit Verwaltungs-Passwort"
            }] }], { spiel: "Blunderluck" });
            return;
        }

        /* Mit UPCrew-Konto (seit v0.138.0): Name#Nummer, Rollen, Neu-Verbinden. */
        const mitKonto = (typeof KONTO !== "undefined" && KONTO.aktiv());
        UPCREW_EINSTELLUNGEN.bauen(inhalt, "verwaltung", [
            VERWALTUNGS_BILDSCHIRM._spielerAbschnitt(mitKonto),
            VERWALTUNGS_BILDSCHIRM._datenbankAbschnitt(mitKonto),
            VERWALTUNGS_BILDSCHIRM._spielAbschnitt(),
            VERWALTUNGS_BILDSCHIRM._endeAbschnitt(mitKonto)
        ], { spiel: "Blunderluck" });
    },

    /* 1. Spieler · alle Spiele — die Tabelle und (nur Admins mit Konto)
          die Spielerliste mit Statistiken. */
    _spielerAbschnitt(mitKonto) {
        const halter = document.createElement("div");
        halter.className = "verwaltung-spieler";

        const karte = document.createElement("section");
        karte.className = "karte";
        const erklaerung = document.createElement("p");
        erklaerung.className = "erklaerung";
        /* Seit dem UPCrew-Umzug sind es die Konten ALLER Spiele — Entfernen
           wirkt überall, nicht nur in Blunderluck. */
        erklaerung.textContent = "Alle UPCrew-Konten · Entfernen gilt in "
            + "ALLEN Spielen · samt Spielerliste und Rangliste";
        karte.appendChild(erklaerung);
        karte.appendChild(mitKonto
            ? VERWALTUNGS_BILDSCHIRM._kontoTabelleBauen()
            : VERWALTUNGS_BILDSCHIRM._tabelleBauen());
        halter.appendChild(karte);

        /* Die Spielerliste mit Statistiken (seit v0.152.1, gemeinsamer
           Baustein js\upcrew-spielerliste.js, gleich in Typoluck): nur
           lesen, nur mit Konto und Rolle Admin. */
        const liste = mitKonto ? VERWALTUNGS_BILDSCHIRM._spielerlisteBauen() : null;
        if (liste) {
            halter.appendChild(liste);
        }
        return { art: "spieler", inhalt: halter,
            hinweis: mitKonto ? "Admins sehen die Spielzeit immer, auch wenn sie privat ist." : "" };
    },

    /* 2. Datenbank — „§12 nachziehen" (nur UP#Plus, nur unter Regel §12). */
    _datenbankAbschnitt(mitKonto) {
        const zeile = mitKonto ? VERWALTUNGS_BILDSCHIRM._nachziehenZeile() : null;
        return { art: "datenbank", zeilen: zeile ? [zeile] : [] };
    },

    /*
     * 3. Nur in Blunderluck — BRETT-ANPASSUNG (seit v0.129.0, Nutzer-Ansage
     * 24.09.2026): Farben, Figuren und Blick des 3D-Bretts stellt nur der
     * Admin um. Der Schalter blendet am Brett den Paletten-Knopf ein oder
     * aus — auf diesem Gerät, solange die Verwaltung offen ist.
     */
    _spielAbschnitt() {
        const an = (typeof ICH.anpassungAn === "function") && ICH.anpassungAn();
        return { art: "spiel", zeilen: [{
            zeichen: "brett",
            titel: "Brett-Anpassung",
            unter: an ? "An · Paletten-Knopf am Brett · Farben, Figuren, Blick"
                : "Aus · kein Paletten-Knopf am Brett",
            rechts: UPCREW_EINSTELLUNGEN.schalter(an, (neu) => {
                if (typeof ICH.anpassungSetzen === "function") {
                    ICH.anpassungSetzen(neu);
                }
                VERWALTUNGS_BILDSCHIRM._zeichnen();
            }, "Brett-Anpassung")
        }] };
    },

    /* 4. Die Freischaltung sichtbar wieder schliessen — nur ohne UPCrew-Konto
          (mit Konto hängt die Rolle am Konto, nicht an einer Freischaltung). */
    _endeAbschnitt(mitKonto) {
        return { art: "ende", zeilen: mitKonto ? [] : [{
            titel: "Verwaltung beenden", gefahr: true, beiKlick: () => ANMELDUNG.verwaltungBeenden()
        }] };
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
        /* Ohne Serien-Schutz (seit v0.157.0). */
        const serieVon = (stand) => FORTSCHRITT.serie(stand, heute, 0).tage;
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
     * „§12 NACHZIEHEN" (seit v0.154.0, Datenbank-Konzept §12,
     * Phase A Punkt 4 und Phase B Schritt 2): Direkt nach dem Einspielen der
     * Regel §12 fehlen die öffentlichen Auszüge und das Anmeldeverzeichnis —
     * bis dahin stehen keine Namen in den Listen, und auf neuen Geräten geht
     * die Anmeldung mit Namen nicht. Der Knopf schreibt beides für alle
     * Konten (`KONTO.nachziehen`), wiederholbar. Sichtbar nur für UP#Plus
     * und nur, wenn die App die Regel §12 erkannt hat.
     */
    _nachziehenLaeuft: false,

    _nachziehenZeile() {
        if (typeof KONTO === "undefined" || typeof KONTO.istP12 !== "function"
                || !KONTO.istP12() || KONTO.uid() !== KONTO.OBER_UID) {
            return null;
        }
        return {
            zeichen: "schild",
            titel: "§12 nachziehen",
            unter: "Auszüge und Anmeldeverzeichnis für alle Konten · wiederholbar",
            rechts: "pfeil",
            beiKlick: async () => {
                if (VERWALTUNGS_BILDSCHIRM._nachziehenLaeuft) {
                    return;
                }
                VERWALTUNGS_BILDSCHIRM._nachziehenLaeuft = true;
                let ergebnis;
                try {
                    ergebnis = await KONTO.nachziehen(ANMELDUNG.abgleich.speicher);
                } finally {
                    VERWALTUNGS_BILDSCHIRM._nachziehenLaeuft = false;
                }
                if (!ergebnis.ok) {
                    await DIALOG.hinweis("Nicht nachgezogen", ergebnis.text);
                    return;
                }
                await ANMELDUNG._kontoNachladen();
                await DIALOG.hinweis("Nachgezogen", ergebnis.geschrieben + " geschrieben · "
                    + ergebnis.uebersprungen + " übersprungen");
            }
        };
    },

    /* „N min" / „Nh+" aus dem Konto-Fortschritt, „–" ohne (Gast, alt). */
    spielzeitText(spieler) {
        if (typeof FORTSCHRITT === "undefined" || typeof FORTSCHRITT.spielzeitText !== "function"
                || !spieler || !spieler.fortschritt) {
            return "–";
        }
        return FORTSCHRITT.spielzeitText(FORTSCHRITT.spielzeitSumme(spieler.fortschritt));
    },

    _kontoTabelleBauen() {
        const rollbereich = document.createElement("div");
        rollbereich.className = "tabelle-rollbereich";
        const tabelle = document.createElement("table");
        tabelle.className = "ergebnis-tabelle";

        const tabellenkopf = document.createElement("thead");
        const kopfzeile = document.createElement("tr");
        for (const beschriftung of ["Name", "Konto", "Rolle", "Freunde", "Spielzeit", ""]) {
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
            /* Spielzeit über beide Spiele (seit v0.155.0; Admins lesen die
               vollen Konten). Gäste zählen nur auf ihrem Gerät. */
            zelle(VERWALTUNGS_BILDSCHIRM.spielzeitText(spieler));

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
