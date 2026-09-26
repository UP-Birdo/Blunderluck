/*
 * anpassen.js — der Tab „Anpassen" ganz rechts in der Leiste (seit v0.144.0,
 * UPCrew-Angleichung Runde 3, Design\3D-Schrift\docs\AUFTRAEGE-RUNDE-3.md).
 *
 * Den Inhalt baut der gemeinsame Baustein js\upcrew-anpassen.js
 * (`UPCREW_ANPASSEN`, Kopie aus Design\3D-Schrift\final, in Typoluck
 * gleich): Vorschau oben, darunter die Regale Farbwelt · Schrift · Knöpfe ·
 * Darstellung · Sets, unten „Zurück" / „Übernehmen". Übernommen wird über
 * js\upcrew-aussehen.js — es gilt in BEIDEN Spielen.
 *
 * Blunderluck liefert nur:
 *   - die Kopfzeile wie im Tab „Fähigkeiten" (klebt oben; der Baustein
 *     hält mit `--upa-oben` Abstand, damit seine Vorschau darunter klebt);
 *   - den Stand aus js\freischaltung.js: Pfad-Stufe (heute 0 — nur der
 *     Standard ist frei, alles andere als Vorschau) und den
 *     Werkstatt-Modus (dann ist alles frei);
 *   - das EIGENE Regal „Brett" (2D/3D, entschieden 26.09.2026: 3D ist eine
 *     Freischaltung ab Arena 2 — solange SPERRE_3D aus ist, für alle frei).
 *
 * Beim Verlassen wird der Baustein abgebaut (`entfernen`), beim nächsten
 * Öffnen neu aufgebaut — so zeigt er immer den aktuellen Stand, auch wenn
 * Typoluck inzwischen etwas umgestellt hat.
 */

const ANPASSEN = {

    id: "anpassen",
    titel: "Anpassen",
    zeichen: "anpassen",

    wurzelEl: null,
    ortEl: null,
    kopfEl: null,
    tab: null,

    aufbauen(behaelter) {
        ANPASSEN.wurzelEl = behaelter;
        behaelter.classList.add("anpassen");

        const kopf = document.createElement("div");
        kopf.className = "partie-kopf partie-kopf-klebt";
        const titel = document.createElement("h2");
        titel.className = "partie-titel";
        titel.textContent = ANPASSEN.titel;
        kopf.appendChild(titel);
        behaelter.appendChild(kopf);
        ANPASSEN.kopfEl = kopf;

        ANPASSEN.ortEl = document.createElement("div");
        ANPASSEN.ortEl.className = "anpassen-ort";
        behaelter.appendChild(ANPASSEN.ortEl);
    },

    beimOeffnen() {
        /* Ein normaler Tab: kein Fenster, rollt wie immer. */
        if (typeof TABS !== "undefined" && TABS.rundeSetzen) {
            TABS.rundeSetzen(ANPASSEN.id, false);
        }
        ANPASSEN._zeigen();
    },

    beimVerlassen() {
        if (ANPASSEN.tab) {
            ANPASSEN.tab.entfernen();
            ANPASSEN.tab = null;
        }
    },

    _zeigen() {
        if (!ANPASSEN.ortEl || typeof UPCREW_ANPASSEN === "undefined") {
            return;
        }
        if (ANPASSEN.tab) {
            ANPASSEN.tab.entfernen();
            ANPASSEN.tab = null;
        }
        ANPASSEN.tab = UPCREW_ANPASSEN.zeigen(ANPASSEN.ortEl, {
            app: "blunderluck",
            stufe: FREISCHALTUNG.stufe(),
            alleFrei: FREISCHALTUNG.werkstatt(),
            regale: [ANPASSEN.brettRegal()]
        });
        ANPASSEN._obenSetzen();
    },

    /* Die Kopfzeile klebt — die Vorschau des Bausteins klebt darunter. */
    _obenSetzen() {
        if (!ANPASSEN.kopfEl || !ANPASSEN.wurzelEl) {
            return;
        }
        const hoehe = ANPASSEN.kopfEl.offsetHeight || 0;
        ANPASSEN.wurzelEl.style.setProperty("--upa-oben", hoehe + "px");
    },

    /*
     * Das Regal „Brett" (Auftrag Punkt 5b). `wert` ist, was gerade gilt;
     * gesperrtes 3D zeigt der Baustein mit Schloss und „ab Arena 2", in der
     * Vorschau aber trotzdem (gekipptes Brett). Übernommen wird über
     * js\freischaltung.js — das prüft die Freigabe ein zweites Mal.
     */
    brettRegal() {
        return {
            schluessel: "brett",
            titel: "Brett",
            wert: FREISCHALTUNG.brett(),
            stuecke: [
                { wert: "2d", name: "2D" },
                { wert: "3d", name: "3D", frei: FREISCHALTUNG.dreiDFrei(), ab: "Arena 2" }
            ],
            uebernehmen(wert) {
                FREISCHALTUNG.brettSetzen(wert);
            }
        };
    }
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = ANPASSEN;
}
