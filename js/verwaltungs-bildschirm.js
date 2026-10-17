/*
 * verwaltungs-bildschirm.js — der Rahmen der Verwaltung (Blatt über den
 * Einstellungen).
 *
 * Bis v0.99.0 hing die Liste der Mitspieler direkt in der Spieler-Karte der
 * Einstellungen; seitdem ein eigener Bildschirm (Nutzer-Ansage 27.08.2026:
 * „gebe mir in der verwaltung nicht alle spieler unter einander sonderern
 * alls seperater screen und als Tabelle"). Seit v0.156.0 als BLATT über den
 * Einstellungen im gemeinsamen Aufbau js\upcrew-einstellungen.js.
 *
 * SEIT v0.172.0 zeichnet den Inhalt der gemeinsame Baustein
 * js\upcrew-verwaltung.js (Nutzer 17.10.2026: „bei allen crew up apps soll
 * verwaltung der benutzer und alles über all gleich sein“): Tabelle der
 * Konten, Rollen samt Beta, Neu verbinden, Entfernen, Spielerliste und
 * „§12 nachziehen“, mit den Haken aus `EINSTELLUNGEN.kontoEinrichten`
 * (js\einstellungen.js). Er prüft die Rolle selbst („Nur Rolle Admin“).
 * Hier bleibt nur der Rahmen und der Abschnitt „Nur in Blunderluck“
 * (Brett-Anpassung, Haken `spiel`).
 *
 * SEIT v0.173.0 ist der Altweg ohne UPCrew-Konto weg (Freischaltung mit
 * VERWALTUNG.verlangen, die alte Tabelle, „Verwaltung beenden“) — wie in
 * Typoluck und Kaffekasse gibt es die Verwaltung nur mit Admin-Rolle.
 *
 * Ein Tab ohne Leisten-Knopf (`inLeiste: false`), erreichbar nur über
 * TABS.wechseln — den Wechsel macht ANMELDUNG.verwaltungOeffnen (Haken
 * `verwaltungOeffnen` des Bausteins upcrew-konto).
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

        /* Als Blatt über den Einstellungen: Titel und
           Zurück trägt das Blatt. Ohne den Baustein wie bisher ein Fenster
           mit dem einen Zurück-Knopf (Haus-Muster seit v0.113). */
        const alsBlatt = Array.isArray(TABS._blattTabs)
            && TABS._blattTabs.indexOf(VERWALTUNGS_BILDSCHIRM.id) !== -1;
        if (!alsBlatt) {
            if (TABS.rundeSetzen) {
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

        /* Der gemeinsame Baustein. Er prüft die Rolle selbst („Nur Rolle
           Admin“) und zeichnet Spieler · Datenbank · Nur in Blunderluck mit
           den Haken aus EINSTELLUNGEN.kontoEinrichten. */
        if (typeof UPCREW_VERWALTUNG !== "undefined"
                && typeof EINSTELLUNGEN !== "undefined" && EINSTELLUNGEN.kontoEinrichten()) {
            UPCREW_VERWALTUNG.zeigen(inhalt, UPCREW_KONTO.haken());
            return;
        }

        /* Fehlt der Baustein (sollte nie sein): nichts zum Bedienen. */
        UPCREW_EINSTELLUNGEN.bauen(inhalt, "verwaltung", [{ art: "spieler", zeilen: [{
            zeichen: "schloss", titel: "Nur Rolle Admin"
        }] }], { spiel: "Blunderluck" });
    },

    /*
     * Nur in Blunderluck — BRETT-ANPASSUNG (seit v0.129.0, Nutzer-Ansage
     * 24.09.2026): Farben, Figuren und Blick des 3D-Bretts stellt nur der
     * Admin um. Der Schalter blendet am Brett den Paletten-Knopf ein oder
     * aus — auf diesem Gerät, solange das Konto die Admin-Rolle hat. Der
     * Haken `spiel` reicht ihn an den Baustein weiter.
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
