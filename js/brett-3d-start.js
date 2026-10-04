/*
 * brett-3d-start.js — WANN das 3D-Modul lädt und startet (seit v0.164.0,
 * Laden seit v0.166.0).
 *
 * ANLASS (Befund der Nacht 04.10.2026, Tabelle 2, Punkt B): js\brett-3d.js
 * lud samt three.js (690 KB) als festes Modul-Skript und startete sofort —
 * WebGL anlegen, Szene bauen, Modelle laden (808 KB), zwölf Figurenbilder,
 * Plättchen und Standbilder rechnen —, auch wenn das 2D-Brett gewählt ist,
 * und zwar VOR dem ersten Bild der App.
 *
 * v0.164.0 hat den START verschoben, v0.166.0 auch das LADEN. Es wird
 * NICHTS weggelassen — Figurenbilder, Plättchen und Standbilder gibt es
 * weiter auch im 2D-Betrieb. Geändert ist nur der ZEITPUNKT:
 *
 *   2D gewählt          Laden und Start warten auf das erste sichtbare Bild
 *                       und laufen dann im Leerlauf (`requestIdleCallback`
 *                       mit Frist, Rückfall `setTimeout`).
 *   3D gewählt          das Laden beginnt sofort, wenn diese Datei läuft
 *                       ("3d", "scheiben" und "oben" — alles ausser "2d",
 *                       `FREISCHALTUNG.brett()`), gestartet wird, sobald das
 *                       Modul da ist.
 *   jemand braucht 3D   `anfordern()` lädt bzw. startet sofort: eine Partie
 *                       wird gezeichnet, die Bühne einer Anleitung, die
 *                       Vorschau in der Sammlung, der Wechsel auf 3D, eine
 *                       Falle.
 *
 * DER PLATZHALTER (seit v0.166.0): Bis das Modul da ist, steht hier ein
 * `window.BRETT_3D` mit denselben Eingängen. Er verhält sich wie das
 * geladene, noch nicht gestartete Modul bis v0.165.1 — wer 3D braucht,
 * verlangt den Start; Sammlung und Shop bekommen ihre drei Auskünfte
 * (`aussehen`, `aussehenFrei`, `aussehenWaehlen`) aus
 * js\brett-3d-aussehen.js, derselben Quelle, die auch das Modul benutzt;
 * kleine Bretter und Vorschauen merkt er sich und reicht sie nach dem Laden
 * an das Modul weiter, das sie wie bisher nachholt (`MINI.warte`,
 * `MINI.warteMit`). Das Modul ersetzt ihn durch seine Zuweisung. Darum
 * musste keine der Stellen, die `window.BRETT_3D` fragen, geändert werden.
 *
 * EIN LADEN FÜR ALLE: `laden()` ruft `import()` höchstens einmal; jede
 * Stelle wartet auf dasselbe Versprechen `geladen` (es liefert das Modul,
 * bei einem Fehler `null`). Scheitert das Laden (offline ohne Vorrat), gilt
 * der Rückfall von bisher: `BRETT_3D_AUS`, das flache Brett wird gezeigt,
 * kleine Bretter bleiben Gitter, die Anleitung flach.
 *
 * Diese Datei kennt three.js nicht und steht in index.html NACH der
 * Import-Karte (ein `import()` vor der Karte könnte "three" nicht auflösen).
 * Fehlt sie (Werkstatt-Seite mit festem Modul-Skript), startet das Modul wie
 * bisher sofort. tests\test-3d-start.js und test-3d-laden.js prüfen sie mit
 * nachgestellten Uhren und einem nachgestellten `import()`.
 */

const BRETT_3D_START = {
    /* Leerlauf nach dem ersten Bild — spätestens nach dieser Frist. */
    FRIST_MS: 2000,
    /* Ohne `requestIdleCallback` (iPhone): so lange nach dem ersten Bild. */
    RUECKFALL_MS: 200,
    /* Kommt gar kein Bild (Seite im Hintergrund geöffnet): dann eben so. */
    SPAETESTENS_MS: 5000,

    _start: null,          // die Start-Funktion des Moduls
    _gestartet: false,
    _geplant: false,
    _wunsch: "",           // Grund, aus dem gestartet wird, sobald das Modul da ist
    _bildGesehen: false,
    _modulUrl: "",         // wohin `import()` greift (`vorbereiten`)
    _ladung: null,         // das eine laufende `import()`
    _kaputt: false,        // Laden gescheitert
    _fertig: null,         // löst `geladen` auf

    /* DAS EINE VERSPRECHEN: das Modul (`window.BRETT_3D`) oder `null`. */
    geladen: null,

    /* Wodurch gestartet wurde: "sofort", "leerlauf", "frist" oder der Grund
       der Anforderung ("partie", "buehne", "vorschau", "wahl", "falle"). */
    grund: "",

    gestartet() {
        return BRETT_3D_START._gestartet;
    },

    /* Ist etwas anderes als das reine 2D gewählt? Dann braucht schon das
       erste Bild das Modul. Ohne Freischaltung (darf nicht sein): wie bisher
       sofort. */
    sofortNoetig() {
        if (typeof FREISCHALTUNG === "undefined" || typeof FREISCHALTUNG.brett !== "function") {
            return true;
        }
        try {
            return FREISCHALTUNG.brett() !== "2d";
        } catch (fehler) {
            return true;
        }
    },

    /* Das Laden selbst — eine eigene Stelle, damit die Tests es nachstellen
       können. Dieselbe Herkunft: die CSP (`script-src 'self'`) lässt es zu. */
    _importieren(url) {
        return import(url);
    },

    /* Beim Laden der Seite (Ende dieser Datei, nur im Browser): Platzhalter
       aufstellen; 3D gewählt → sofort laden, sonst nach dem ersten Bild im
       Leerlauf. */
    vorbereiten(modulUrl) {
        const S = BRETT_3D_START;
        S._modulUrl = modulUrl || "";
        if (typeof window !== "undefined" && !window.BRETT_3D) {
            window.BRETT_3D = S.platzhalter();
        }
        if (S.sofortNoetig()) {
            S._jetzt("sofort");
        } else {
            S._planen();
        }
    },

    /* Lädt das Modul — höchstens einmal, gleich von wo. Ohne Adresse (eine
       Seite mit festem Modul-Skript) wird nichts geladen; das Modul meldet
       sich dann selbst an. Gibt immer dasselbe Versprechen zurück. */
    laden() {
        const S = BRETT_3D_START;
        if (S._ladung || S._start || !S._modulUrl) {
            return S.geladen;
        }
        S._ladung = Promise.resolve()
            .then(() => S._importieren(S._modulUrl))
            .then(() => {
                if (!S._start) {
                    S._fehlschlag(new Error("Das 3D-Modul hat sich nicht angemeldet."));
                }
            }, (fehler) => S._fehlschlag(fehler));
        return S.geladen;
    },

    /* Laden gescheitert: der Rückfall von bisher (flaches Brett zeigen, kein
       Warten mehr), alle Wartenden bekommen `null`. */
    _fehlschlag(fehler) {
        const S = BRETT_3D_START;
        if (S._kaputt || S._start) {
            return;
        }
        S._kaputt = true;
        if (typeof window !== "undefined") {
            window.BRETT_3D_AUS = true;
        }
        if (typeof document !== "undefined" && typeof document.querySelectorAll === "function") {
            for (const el of document.querySelectorAll(".brett-3d-wartet")) {
                el.classList.remove("brett-3d-wartet");
            }
        }
        if (typeof console !== "undefined") {
            console.error("3D-Brett nicht verfügbar:", fehler);
        }
        S._fertig(null);
    },

    /* Das Modul meldet seine Start-Funktion an (am Ende von brett-3d.js) —
       genau einmal. Wurde es geladen, weil jemand es wollte (3D gewählt,
       Leerlauf, Anforderung), startet es jetzt; meldet es sich von selbst
       (festes Modul-Skript), fällt hier die Entscheidung wie bis v0.165.1. */
    anmelden(start) {
        const S = BRETT_3D_START;
        if (typeof start !== "function" || S._start) {
            return;
        }
        S._start = start;
        if (S._wunsch) {
            S._jetzt(S._wunsch);
        } else if (S.sofortNoetig()) {
            S._jetzt("sofort");
        } else {
            S._planen();
        }
        S._fertig(typeof window !== "undefined" ? window.BRETT_3D || null : null);
    },

    /* Eine Stelle braucht das 3D-Modul JETZT. Gibt zurück, ob dieser Aufruf
       den Start ausgelöst hat (false: läuft schon, oder das Modul ist noch
       unterwegs — dann startet es, sobald es sich anmeldet). */
    anfordern(grund) {
        return BRETT_3D_START._jetzt(grund || "anforderung");
    },

    /* Startet — höchstens einmal, gleich von wo. Ist das Modul noch nicht
       da, wird es geladen und der Grund gemerkt. */
    _jetzt(grund) {
        const S = BRETT_3D_START;
        if (S._gestartet) {
            return false;
        }
        if (typeof S._start !== "function") {
            if (!S._wunsch) {
                S._wunsch = grund || "anforderung";
            }
            S.laden();
            return false;
        }
        S._gestartet = true;
        S.grund = grund || "";
        try {
            const lauf = S._start();
            if (lauf && typeof lauf.catch === "function") {
                lauf.catch((fehler) => console.error("3D-Start nicht möglich:", fehler));
            }
        } catch (fehler) {
            console.error("3D-Start nicht möglich:", fehler);
        }
        return true;
    },

    /* Hat die App ihr erstes Bild schon gebaut? `APP.starten` läuft bei
       DOMContentLoaded und setzt als Erstes diesen Merker; ist das Dokument
       schon fertig geladen, kommt kein Ereignis mehr, auf das sich warten
       liesse. */
    _appSteht() {
        if (typeof window !== "undefined" && window.BLUNDERLUCK_GESTARTET === true) {
            return true;
        }
        return typeof document !== "undefined" && document.readyState === "complete";
    },

    /* 2D gewählt: erst das erste Bild abwarten (zwei Bild-Takte nach dem
       Start der App), dann im Leerlauf laden und starten. */
    _planen() {
        const S = BRETT_3D_START;
        if (S._geplant) {
            return;
        }
        S._geplant = true;

        const imLeerlauf = () => {
            if (typeof requestIdleCallback === "function") {
                requestIdleCallback(() => S._jetzt("leerlauf"), { timeout: S.FRIST_MS });
            } else {
                setTimeout(() => S._jetzt("leerlauf"), S.RUECKFALL_MS);
            }
        };
        const nachBild = () => {
            if (S._bildGesehen) {
                return;
            }
            S._bildGesehen = true;
            setTimeout(() => S._jetzt("frist"), S.SPAETESTENS_MS);
            if (typeof requestAnimationFrame === "function") {
                requestAnimationFrame(() => requestAnimationFrame(imLeerlauf));
            } else {
                imLeerlauf();
            }
        };

        if (S._appSteht()) {
            nachBild();
            return;
        }
        /* Diese Datei läuft VOR DOMContentLoaded — `APP.starten` hat sich
           früher angemeldet und baut das erste Bild also vor uns. Das `load`
           dahinter ist nur das Netz für den Fall, dass diese Datei einmal
           später geladen wird als das Ereignis. */
        document.addEventListener("DOMContentLoaded", nachBild, { once: true });
        if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
            window.addEventListener("load", nachBild, { once: true });
        }
    },

    /*
     * Der Platzhalter `window.BRETT_3D`, bis das Modul da ist — dieselben
     * Eingänge und dieselben Antworten wie das geladene, noch nicht
     * gestartete Modul bis v0.165.1 (`Z.einst` leer, `Z.bereit` falsch).
     */
    platzhalter() {
        const S = BRETT_3D_START;
        const A = () => (typeof BRETT_3D_AUSSEHEN !== "undefined") ? BRETT_3D_AUSSEHEN : null;
        /* Nach dem Laden an das Modul weiterreichen (nie an den Platzhalter). */
        const danach = (arbeit) => {
            S.geladen.then((modul) => {
                if (modul && modul !== platz) {
                    try {
                        arbeit(modul);
                    } catch (fehler) {
                        console.error("3D-Bild nicht möglich:", fehler);
                    }
                }
            });
        };
        const platz = {
            platzhalter: true,
            anbinden() {
                /* Das Modul liest beim Start `TEAM_SCHACH._brett3dLetzte`. */
                S.anfordern("partie");
            },
            aktiv() {
                return false;
            },
            wahlUebernehmen(an, oben) {
                /* Die Wahl ist schon gespeichert (FREISCHALTUNG.brettSetzen) —
                   der Aufbau liest sie. */
                if (an === true || oben === true) S.anfordern("wahl");
            },
            laedt() {
                return !S._kaputt;
            },
            /* Kleine Bretter verlangen den Start NICHT (wie bisher). */
            standbild(el) {
                if (!el || S._kaputt) return;
                danach((modul) => modul.standbild(el));
            },
            standbildMit(el, wahl) {
                S.anfordern("vorschau");
                if (!el || S._kaputt || (typeof window !== "undefined" && window.BRETT_3D_AUS)) return false;
                danach((modul) => modul.standbildMit(el, wahl));
                return false;
            },
            aussehen() {
                return A() ? A().aussehenLesen(null) : null;
            },
            aussehenFrei() {
                return A() ? A().aussehenFrei() : false;
            },
            aussehenWaehlen(schluessel, wert) {
                return A() ? A().aussehenWaehlen(schluessel, wert, null) : false;
            },
            falleZeigen() {
                S.anfordern("falle");
                return false;
            },
            buehneMoeglich() {
                S.anfordern("buehne");
                return false;
            },
            buehne() {
                S.anfordern("buehne");
                return false;
            },
            kollisionen() {
                return null;
            },
            ueberdeckungen() {
                return null;
            },
            _zustand: null
        };
        return platz;
    }
};

BRETT_3D_START.geladen = new Promise((fertig) => {
    BRETT_3D_START._fertig = fertig;
});

/* Im Browser: gleich hier entscheiden (die Seite hat alle klassischen
   Skripte davor schon ausgeführt). Das Modul liegt neben dieser Datei. */
if (typeof document !== "undefined" && document.currentScript && document.currentScript.src) {
    BRETT_3D_START.vorbereiten(new URL("brett-3d.js", document.currentScript.src).href);
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = BRETT_3D_START;
}
