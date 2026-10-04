/*
 * bot-rechner.js — Bobs Zugsuche im Hintergrund (seit v0.165.0).
 *
 * Bis v0.164.1 rechnete `SCHACH_BOT.zugWaehlen` auf dem Haupt-Thread. Gemessen
 * (kopfloser Edge, 4-fache CPU-Drossel, Standardbrett): „Schwer" 209–413 ms,
 * „Meister" 2,0–2,6 s — solange stand die Seite (Befund 04.10.2026, Zeile D).
 * Jetzt rechnet DIESELBE Funktion in einem Web Worker: einer eigenen Instanz
 * von js\wertung-rechner.js (lädt die echten Regeln und `schach-bot.js`).
 *
 * WAS SICH NICHT ÄNDERT (docs\architektur\09-computer-gegner.md): Gesucht wird
 * mit genau `SCHACH_BOT.zugWaehlen` — im Worker oder, beim Rückfall, hier.
 * Hinüber geht nur die Runde (reine Daten), zurück nur die Wahl
 * { von, nach, umwandlung }. Gleiche Runde = gleicher Zug, wo auch immer.
 *
 * RÜCKFALL AUF DEN HAUPT-THREAD (wie bei der Wertung): kein `Worker`, er lässt
 * sich nicht anlegen, er meldet einen Fehler, die Runde lässt sich nicht
 * hinüberschicken, die Suche wirft dort, oder er antwortet nicht binnen
 * `WARTEN_MS`. Dann wird er beendet (keine zweite Suche nebenher) und für
 * diese Sitzung nicht mehr benutzt.
 *
 * NIE ZWEI SUCHEN ZUGLEICH: Der Worker arbeitet seine Nachrichten der Reihe
 * nach ab; der Rückfall beendet ihn vorher. Ob eine Antwort noch gilt
 * (Partie verlassen, beendet, neu begonnen), entscheidet der Aufrufer
 * (`TEAM_SCHACH.botZiehen`, Kennung der Anfrage).
 *
 *   BOT_RECHNER.zugWaehlen(runde)  → Promise<{ von, nach, umwandlung } | null>
 *   BOT_RECHNER.rechnet()          → läuft gerade eine Suche?
 *   BOT_RECHNER.verwerfen()        → laufende Suche beenden, Offenes = null (v0.165.1)
 */

const BOT_RECHNER = {

    /* Adresse des Rechners, relativ zur Seite — dieselbe Datei wie die Wertung. */
    RECHNER: "js/wertung-rechner.js",

    /* „Angemessene Zeit" (seit v0.165.1 30 s, Entscheidung der Koordination
       nach der Gegenprüfung, Fund 2): „Meister" braucht gedrosselt rund
       2,5 s; ein langsames Handy ein Mehrfaches. Ein Rückfall rechnet die
       GANZE Suche noch einmal auf der Seite — darum lieber spät. Die Frist
       beginnt neu, sobald der Worker meldet, dass er die Anfrage bearbeitet
       (`beginnt`); ein Fehler (`onerror`) fällt weiter sofort zurück. */
    WARTEN_MS: 30000,

    _rechner: null,
    _kaputt: false,
    _naechsteNr: 1,
    _warten: {},          // nr -> { runde, aufloesen, ablehnen, zeitgeber }

    rechnet() {
        return Object.keys(BOT_RECHNER._warten).length > 0;
    },

    _rechnerHolen() {
        if (BOT_RECHNER._rechner || BOT_RECHNER._kaputt) {
            return BOT_RECHNER._rechner;
        }
        if (typeof Worker === "undefined") {
            BOT_RECHNER._kaputt = true;
            return null;
        }
        try {
            const rechner = new Worker(BOT_RECHNER.RECHNER);
            rechner.onmessage = (nachricht) => BOT_RECHNER._antwort(nachricht.data || {});
            rechner.onerror = (fehler) => {
                if (fehler && typeof fehler.preventDefault === "function") fehler.preventDefault();
                console.error("Bobs Rechner gestört, rechne ohne Worker:", fehler && fehler.message);
                BOT_RECHNER._aufgeben();
            };
            BOT_RECHNER._rechner = rechner;
        } catch (fehler) {
            BOT_RECHNER._kaputt = true;
        }
        return BOT_RECHNER._rechner;
    },

    zugWaehlen(runde) {
        return new Promise((aufloesen, ablehnen) => {
            const rechner = BOT_RECHNER._rechnerHolen();
            if (!rechner) {
                BOT_RECHNER._direkt(runde, aufloesen, ablehnen);
                return;
            }
            const nr = BOT_RECHNER._naechsteNr++;
            const eintrag = { runde, aufloesen, ablehnen, zeitgeber: null };
            BOT_RECHNER._warten[nr] = eintrag;
            try {
                rechner.postMessage({ nr: nr, art: "bot", runde: runde });
            } catch (fehler) {
                /* nicht übertragbar (darf bei reinen Daten nicht sein) */
                delete BOT_RECHNER._warten[nr];
                BOT_RECHNER._direkt(runde, aufloesen, ablehnen);
                return;
            }
            BOT_RECHNER._fristSetzen(eintrag);
        });
    },

    _fristSetzen(eintrag) {
        clearTimeout(eintrag.zeitgeber);
        eintrag.zeitgeber = setTimeout(() => {
            console.error("Bobs Rechner antwortet nicht, rechne ohne Worker.");
            BOT_RECHNER._aufgeben();
        }, BOT_RECHNER.WARTEN_MS);
    },

    /*
     * DIE LAUFENDE SUCHE GILT NICHT MEHR (seit v0.165.1, Gegenprüfung Fund 1;
     * gerufen aus `TEAM_SCHACH._botAbbrechen`): Partie verlassen oder neu
     * begonnen. Der Worker wird beendet, damit die nächste Anfrage nicht
     * hinter einer verworfenen wartet — aber NICHT als kaputt gemerkt: Die
     * nächste Anfrage bekommt einen frischen. Offenes liefert `null` und wird
     * nicht gerechnet.
     */
    verwerfen() {
        const rechner = BOT_RECHNER._rechner;
        BOT_RECHNER._rechner = null;
        if (rechner) {
            try { rechner.terminate(); } catch (fehler) { /* schon weg */ }
        }
        const offen = BOT_RECHNER._warten;
        BOT_RECHNER._warten = {};
        for (const nr of Object.keys(offen)) {
            clearTimeout(offen[nr].zeitgeber);
            offen[nr].aufloesen(null);
        }
    },

    /* Auf dem Haupt-Thread — genau der Weg bis v0.164.1. */
    _direkt(runde, aufloesen, ablehnen) {
        try {
            aufloesen(SCHACH_BOT.zugWaehlen(runde));
        } catch (fehler) {
            ablehnen(fehler);
        }
    },

    _antwort(daten) {
        const eintrag = BOT_RECHNER._warten[daten.nr];
        if (!eintrag || daten.art !== "bot") {
            return;
        }
        if (daten.beginnt) {
            /* Der Worker fängt jetzt an: ab hier zählt die Frist. */
            BOT_RECHNER._fristSetzen(eintrag);
            return;
        }
        delete BOT_RECHNER._warten[daten.nr];
        clearTimeout(eintrag.zeitgeber);
        if (daten.fehler) {
            BOT_RECHNER._direkt(eintrag.runde, eintrag.aufloesen, eintrag.ablehnen);
            return;
        }
        eintrag.aufloesen(daten.wahl || null);
    },

    /* Worker beenden, ab jetzt ohne ihn; Offenes rechnet der Haupt-Thread. */
    _aufgeben() {
        const rechner = BOT_RECHNER._rechner;
        BOT_RECHNER._rechner = null;
        BOT_RECHNER._kaputt = true;
        if (rechner) {
            try { rechner.terminate(); } catch (fehler) { /* schon weg */ }
        }
        const offen = BOT_RECHNER._warten;
        BOT_RECHNER._warten = {};
        for (const nr of Object.keys(offen)) {
            clearTimeout(offen[nr].zeitgeber);
            BOT_RECHNER._direkt(offen[nr].runde, offen[nr].aufloesen, offen[nr].ablehnen);
        }
    }
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = BOT_RECHNER;
}
