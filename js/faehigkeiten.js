/*
 * faehigkeiten.js — der Tab „Fähigkeiten" (seit v0.9.0, Bündel A Schritt 4).
 *
 * Die linke der drei Seiten (Fähigkeiten / Start / Rangliste): die
 * Fähigkeiten-Bibliothek als eigene Seite in der Leiste. Gezeichnet wird
 * derselbe Inhalt wie in der Bibliothek im Spiel
 * (TEAM_SCHACH._infoInhaltBauen) — nur ohne Zurück-Knopf, denn hier ist
 * die Tab-Leiste der Weg zurück.
 *
 * Die Bibliothek hängt an keinem Spielstand; gezeichnet wird deshalb nur
 * einmal (`gezeichnet`), damit ein Tab-Wechsel keinen aufgeklappten
 * Eintrag wieder zuklappt. Der Weg über das i im Spiel (infoOffen in
 * team-schach.js) bleibt daneben unverändert bestehen — dort verrät der
 * Rahmen weiterhin nichts über eine laufende Partie.
 */

const FAEHIGKEITEN = {

    id: "faehigkeiten",
    titel: "Fähigkeiten",

    wurzelEl: null,
    gezeichnet: false,

    aufbauen(behaelter) {
        FAEHIGKEITEN.wurzelEl = behaelter;
    },

    beimOeffnen() {
        if (FAEHIGKEITEN.gezeichnet || !FAEHIGKEITEN.wurzelEl) {
            return;
        }

        FAEHIGKEITEN.wurzelEl.innerHTML = "";

        const kopf = TEAM_SCHACH._element("div", "partie-kopf partie-kopf-klebt");
        kopf.appendChild(TEAM_SCHACH._element("h2", "partie-titel", "Fähigkeiten"));
        FAEHIGKEITEN.wurzelEl.appendChild(kopf);

        TEAM_SCHACH._infoInhaltBauen(FAEHIGKEITEN.wurzelEl);
        FAEHIGKEITEN.gezeichnet = true;
    }
};
