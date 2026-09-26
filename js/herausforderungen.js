/*
 * herausforderungen.js — der Tab „Aufgaben" (seit v0.142.0).
 *
 * UPCrew-Angleichung Runde 2 (Design\3D-Schrift\docs\AUFTRAEGE-RUNDE-2.md):
 * Links in der Leiste steht in Blunderluck UND Typoluck „Aufgaben". Dahinter
 * kommt später der gemeinsame Herausforderungs-Pfad durch beide Spiele
 * (Runde 3, Design\3D-Schrift\docs\FARBWELTEN-PLAN.md). Bis dahin zeigt der
 * Bildschirm nur, dass er kommt — Titel und Satz sind die gemeinsame
 * Absprache und stehen in Typoluck wörtlich gleich.
 *
 * Bis v0.143 stand hier auch der Platzhalter „Bald" für den fünften Platz;
 * seit v0.144.0 ist dort der Tab „Anpassen" (js\anpassen.js).
 */

const HERAUSFORDERUNGEN = {

    id: "herausforderungen",
    titel: "Herausforderungen",
    leisteText: "Aufgaben",
    zeichen: "aufgaben",

    TEXT: "Kommt bald – hier siehst du deinen Weg durch beide Spiele.",

    aufbauen(behaelter) {
        const titel = document.createElement("h2");
        titel.className = "platzhalter-titel";
        titel.textContent = HERAUSFORDERUNGEN.titel;
        behaelter.appendChild(titel);

        const feld = document.createElement("div");
        feld.className = "zustand zustand-leer platzhalter-feld";
        const bild = document.createElement("span");
        bild.className = "zustand-bild";
        bild.appendChild(ZUSTAND.zeichen("aufgaben"));
        feld.appendChild(bild);
        const satz = document.createElement("p");
        satz.className = "zustand-text";
        satz.textContent = HERAUSFORDERUNGEN.TEXT;
        feld.appendChild(satz);
        behaelter.appendChild(feld);
    },

    beimOeffnen() {
        /* Ein normaler Tab: kein Fenster, rollt wie immer (ohne dritten
           Wert — die feste Seite setzt nur die offene Partie). */
        if (typeof TABS !== "undefined" && TABS.rundeSetzen) {
            TABS.rundeSetzen(HERAUSFORDERUNGEN.id, false);
        }
    }
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = { HERAUSFORDERUNGEN };
}
