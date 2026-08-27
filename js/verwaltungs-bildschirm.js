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
        kopfzeile.appendChild(VERWALTUNGS_BILDSCHIRM._knopf("Zurück",
            "knopf-still knopf-klein", () => TABS.wechseln("einstellungen")));

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
            hinweis.textContent = "Die Verwaltung ist auf diesem Gerät nicht "
                + "freigeschaltet. Öffne sie über die Einstellungen — dort "
                + "wird das Verwaltungs-Passwort abgefragt.";
            karte.appendChild(hinweis);
            return;
        }

        const erklaerung = document.createElement("p");
        erklaerung.className = "erklaerung";
        erklaerung.textContent = "Alle Mitspieler der Runde. Entfernen "
            + "löscht den Eintrag aus Spielerliste und Rangliste — etwa bei "
            + "doppelten Anmeldungen oder vergessenem Passwort.";
        karte.appendChild(erklaerung);

        karte.appendChild(VERWALTUNGS_BILDSCHIRM._tabelleBauen());

        /* Die Freischaltung sichtbar wieder schliessen — vorher tat das der
           Umschalt-Knopf in den Einstellungen. */
        const fuss = document.createElement("div");
        fuss.className = "karte-fuss";
        fuss.appendChild(VERWALTUNGS_BILDSCHIRM._knopf(
            "Verwaltung beenden", "knopf-still knopf-klein",
            () => ANMELDUNG.verwaltungBeenden()));
        karte.appendChild(fuss);
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
