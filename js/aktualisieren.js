/*
 * aktualisieren.js — eine neue Version kommt auch an (seit v0.151.2).
 *
 * DER FEHLER (Nutzer 27.09.2026: „ich bekomme die neuste Version nicht mehr
 * aufgerufen"; live nachgemessen): Der Server lieferte 0.151.1, die Seite
 * startete aber aus dem Zwischenspeicher mit 0.151.0. Der neue Service
 * Worker installierte sich im Hintergrund und übernahm (skipWaiting/claim) —
 * die OFFENE Seite lief trotzdem mit den alten Dateien weiter. Als
 * Home-Bildschirm-App bleibt die Seite im Speicher; sie wird kaum je neu
 * geladen, also sah der Nutzer die neue Version praktisch nie. Bis v0.151.1
 * hat `app.js` den Worker nur angemeldet — nie nachgefragt, nie reagiert.
 *
 * WAS JETZT PASSIERT (in Typoluck 0.15.2 gleich):
 *   1. Beim Start und bei jeder Rückkehr in den Vordergrund fragt die App
 *      den Server nach einem neuen Worker (`registration.update()`),
 *      höchstens alle PRUEF_ABSTAND_MS.
 *   2. Übernimmt ein neuer Worker (`controllerchange`) — und gab es vorher
 *      schon einen (sonst ist es nur die allererste Anmeldung) —, lädt die
 *      Seite EINMAL neu, aber nur an einer sicheren Stelle: nicht in einer
 *      laufenden Partie, nicht in einem offenen Dialog, nicht in einem
 *      Eingabefeld. Sonst erscheint oben die Leiste „Neue Version" (antippen
 *      = sofort laden); sobald die Stelle sicher ist, lädt sie von selbst.
 *   3. Keine Endlosschleife: Ein Merker in sessionStorage verhindert, dass
 *      die Seite innerhalb von SPERRE_MS ein zweites Mal von selbst lädt —
 *      dann bleibt es bei der Leiste.
 *
 * Die ENTSCHEIDUNGEN stehen als reine Funktionen oben (ohne Browser
 * testbar, tests\test-aktualisieren.js); die Verdrahtung unten.
 */

const AKTUALISIEREN = {

    /* So oft höchstens fragt die App beim Zurückkehren nach. */
    PRUEF_ABSTAND_MS: 3 * 60 * 1000,

    /* Innerhalb dieser Zeit nach einem Selbst-Neuladen kein zweites. */
    SPERRE_MS: 60 * 1000,

    /* So oft wird geschaut, ob die Stelle inzwischen sicher ist. */
    WARTE_TAKT_MS: 4000,

    MERKER: "blunderluck.neu-geladen",

    _zuletztGefragt: 0,
    _hatteController: false,
    _wartet: false,
    _takt: null,
    _registrierung: null,

    /* ---------------------------------------------------------------- *
     * Die Entscheidungen (rein)
     * ---------------------------------------------------------------- */

    /* Soll jetzt nachgefragt werden? */
    sollFragen(jetzt, zuletzt) {
        return !zuletzt || (jetzt - zuletzt) >= AKTUALISIEREN.PRUEF_ABSTAND_MS;
    },

    /* Darf die Seite von selbst neu laden? Nicht zweimal kurz hintereinander
       (Merker = Zeitpunkt des letzten Selbst-Neuladens, oder leer). */
    darfSelbstLaden(jetzt, merker) {
        const zuletzt = Number(merker);
        return !(zuletzt > 0 && (jetzt - zuletzt) < AKTUALISIEREN.SPERRE_MS);
    },

    /*
     * Ist die Stelle sicher? `lage` = { verborgen, eingabe, dialog, partie }
     * — verborgen (Seite im Hintergrund) ist immer sicher; sonst darf keine
     * Eingabe offen sein, kein Dialog und keine laufende eigene Partie.
     */
    sicher(lage) {
        if (lage.verborgen) {
            return true;
        }
        return !lage.eingabe && !lage.dialog && !lage.partie;
    },

    /* ---------------------------------------------------------------- *
     * Die Lage im Browser
     * ---------------------------------------------------------------- */

    _lage() {
        const aktiv = document.activeElement;
        const eingabe = !!aktiv && (aktiv.tagName === "INPUT" || aktiv.tagName === "TEXTAREA"
            || aktiv.tagName === "SELECT" || aktiv.isContentEditable === true);
        const dialog = !!document.querySelector("[role=\"dialog\"]");
        let partie = false;
        try {
            if (typeof TEAM_SCHACH !== "undefined" && TEAM_SCHACH.offeneId && TEAM_SCHACH.abgleich
                    && typeof SCHACH_TAFEL !== "undefined") {
                const offen = SCHACH_TAFEL.partie(TEAM_SCHACH.abgleich.daten, TEAM_SCHACH.offeneId);
                partie = !!(offen && !offen.ergebnis);
            }
        } catch (fehler) {
            partie = true;
        }
        return { verborgen: document.visibilityState === "hidden", eingabe: eingabe, dialog: dialog, partie: partie };
    },

    _merkerLesen() {
        try {
            return sessionStorage.getItem(AKTUALISIEREN.MERKER);
        } catch (fehler) {
            return null;
        }
    },

    _neuLaden() {
        try {
            sessionStorage.setItem(AKTUALISIEREN.MERKER, String(Date.now()));
        } catch (fehler) {
            /* ohne Speicher: dann eben ohne Merker */
        }
        window.location.reload();
    },

    /* ---------------------------------------------------------------- *
     * Die Verdrahtung
     * ---------------------------------------------------------------- */

    /* Gerufen aus `SERVICE_WORKER.anmelden` (js\app.js), sobald die
       Anmeldung durch ist. */
    starten(registrierung) {
        AKTUALISIEREN._registrierung = registrierung;
        AKTUALISIEREN._zuletztGefragt = Date.now();
        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "visible") {
                AKTUALISIEREN.fragen();
            } else if (AKTUALISIEREN._wartet) {
                AKTUALISIEREN._versuchen();
            }
        });
    },

    /* Beim Laden der Seite, VOR der Anmeldung: Gibt es schon einen Worker?
       Nur dann ist ein späteres `controllerchange` ein Wechsel der Version. */
    beobachten() {
        if (!("serviceWorker" in navigator)) {
            return;
        }
        AKTUALISIEREN._hatteController = !!navigator.serviceWorker.controller;
        navigator.serviceWorker.addEventListener("controllerchange", () => {
            if (!AKTUALISIEREN._hatteController) {
                AKTUALISIEREN._hatteController = true;
                return;
            }
            AKTUALISIEREN._neueVersion();
        });
    },

    fragen() {
        const reg = AKTUALISIEREN._registrierung;
        const jetzt = Date.now();
        if (!reg || !AKTUALISIEREN.sollFragen(jetzt, AKTUALISIEREN._zuletztGefragt)) {
            return;
        }
        AKTUALISIEREN._zuletztGefragt = jetzt;
        reg.update().catch(() => {
            /* ohne Netz: beim nächsten Mal */
        });
    },

    _neueVersion() {
        AKTUALISIEREN._wartet = true;
        if (!AKTUALISIEREN._versuchen()) {
            AKTUALISIEREN._leisteZeigen();
            if (!AKTUALISIEREN._takt) {
                AKTUALISIEREN._takt = window.setInterval(AKTUALISIEREN._versuchen, AKTUALISIEREN.WARTE_TAKT_MS);
            }
        }
    },

    /* Lädt, wenn es sicher ist und keine Sperre gilt; liefert, ob geladen. */
    _versuchen() {
        if (!AKTUALISIEREN._wartet) {
            return false;
        }
        if (!AKTUALISIEREN.darfSelbstLaden(Date.now(), AKTUALISIEREN._merkerLesen())) {
            return false;
        }
        if (!AKTUALISIEREN.sicher(AKTUALISIEREN._lage())) {
            return false;
        }
        AKTUALISIEREN._neuLaden();
        return true;
    },

    /* Die Leiste oben: ein Streifen, antippen lädt sofort. Kein Satz
       (UPCrew-Standard). */
    _leisteZeigen() {
        if (document.querySelector(".neu-leiste")) {
            return;
        }
        const leiste = document.createElement("div");
        leiste.className = "neu-leiste";
        leiste.setAttribute("role", "status");
        leiste.tabIndex = 0;
        leiste.textContent = "Neue Version · antippen";
        const laden = () => AKTUALISIEREN._neuLaden();
        leiste.addEventListener("click", laden);
        leiste.addEventListener("keydown", (ereignis) => {
            if (ereignis.key === "Enter" || ereignis.key === " ") {
                laden();
            }
        });
        document.body.appendChild(leiste);
    }
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = AKTUALISIEREN;
}
