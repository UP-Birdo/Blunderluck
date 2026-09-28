/*
 * intro.js — das UPCrew-Studio-Intro beim Start: der Anpasser für Blunderluck.
 *
 * UPCrew ist das Studio hinter allen Spielen. Beim Öffnen erscheint kurz
 * das Studio-Zeichen, dann das Spiel — in JEDER UPCrew-App gleich (Nutzer-
 * Ansage 25.09.2026: „beide Apps gleich").
 *
 * SEIT v0.140.3 STECKT DAS INTRO SELBST IN js\upcrew-intro.js (+ css\upcrew-
 * intro.css) — dem gemeinsamen Baustein aller UPCrew-Apps. Quelle ist
 * dev\Design\3D-Schrift\final\; dort wird er geändert und in die Apps
 * KOPIERT, hier nie abgewandelt (Schnittstelle und Regeln:
 * Design\3D-Schrift\docs\EINBAU-INTRO.md). Diese Datei sagt ihm nur, was
 * nur Blunderluck weiss: hell oder dunkel, Nummer, Name und Version der App.
 * Vorlage war Apps\Typoluck\js\intro.js (0.6.1).
 *
 * Die Regeln (Nutzer-Entscheidung 25.09.2026):
 *   - bei JEDEM Start (die Sperre „einmal je Besuch" ist weg);
 *   - jeder Start zeigt die nächste von sechs Arten (Zähler im Baustein,
 *     gemeinsam mit den anderen UPCrew-Apps);
 *   - ein Tipp oder eine Taste überspringt es sofort;
 *   - die App lädt darunter weiter — das Intro hält nichts auf.
 */

const INTRO = {

    /* Nummer und Name im Studio (Blunderluck 01, Typoluck 02, Trainer 03). */
    APP_NR: "01",
    APP_NAME: "Blunderluck",

    /*
     * WANN DAS INTRO KOMMT (seit v0.152.3, gleich wie Typoluck 0.18.2;
     * Nutzer 28.09.2026: „Wenn ich die Seite neu lade, soll die
     * UPCrew-Animation erneut kommen"). Rein, in `entscheiden`:
     *   1. Direkt nach dem AUTOMATISCHEN Neuladen einer neuen Version (Merker
     *      von js\aktualisieren.js jünger als 15 s): kein Intro — das
     *      Neuladen hat der Nutzer nicht gewollt, ein zweites Intro wäre
     *      doppelt.
     *   2. In der Werkstatt (`?werkstatt`): nur mit `&intro` oder beim
     *      Neuladen — sonst stört es jedes Bildschirmfoto.
     *   3. Sonst IMMER — auch F5 und Zurück/Vor.
     * `pageshow` mit `persisted` (Rückkehr aus dem Zurück-Speicher des
     * Browsers) bleibt bewusst aussen vor: Die Seite wird dann gar nicht neu
     * geladen.
     */
    NACH_AKTUALISIERUNG_MS: 15000,

    entscheiden(lage) {
        const l = lage || {};
        if (typeof l.aktualisiertVorMs === "number" && l.aktualisiertVorMs >= 0
                && l.aktualisiertVorMs < INTRO.NACH_AKTUALISIERUNG_MS) {
            return false;
        }
        if (l.werkstatt) {
            return !!l.introSchalter || l.ladeArt === "reload";
        }
        return true;
    },

    /* Wie diese Seite geladen wurde (Navigation Timing). */
    _ladeArt() {
        try {
            const eintrag = performance.getEntriesByType("navigation")[0];
            if (eintrag && eintrag.type) {
                return eintrag.type;
            }
            return (performance.navigation && performance.navigation.type === 1) ? "reload" : "navigate";
        } catch (fehler) {
            return "navigate";
        }
    },

    /* Alter des Merkers, den js\aktualisieren.js vor dem Neuladen setzt. */
    _aktualisiertVorMs() {
        try {
            const zeit = Number(window.sessionStorage.getItem("blunderluck.neu-geladen"));
            return zeit > 0 ? Date.now() - zeit : null;
        } catch (fehler) {
            return null;
        }
    },

    /* Soll es jetzt kommen? */
    faellig() {
        const werkstatt = typeof FREISCHALTUNG !== "undefined" && FREISCHALTUNG.werkstatt();
        return INTRO.entscheiden({
            werkstatt: werkstatt,
            introSchalter: werkstatt && /[?&]intro(=|&|$)/.test(location.search || ""),
            ladeArt: INTRO._ladeArt(),
            aktualisiertVorMs: INTRO._aktualisiertVorMs()
        });
    },

    /* Ein Wert aus der Werkstatt-Adresse (`&farbwelt=feld`, `&hell`) — null,
       wenn er fehlt oder keine Werkstatt ist. */
    _werkstattWert(name) {
        if (typeof FREISCHALTUNG === "undefined" || !FREISCHALTUNG.werkstatt()) {
            return null;
        }
        try {
            return new URLSearchParams(location.search || "").get(name);
        } catch (fehler) {
            return null;
        }
    },

    /*
     * DIE FARBWELT DES INTROS (seit v0.152.4, gleich wie Typoluck 0.18.3;
     * Nutzer 28.09.2026: „Das Intro soll die Farbe des aktiven Design-Pakets
     * nutzen (Pink → UPCrew in Pink statt Orange)"). Rein:
     *   - normal: die gewählte Farbwelt dieses Spiels;
     *   - Werkstatt: `&farbwelt=…`, sonst (Typoluck) der Standard;
     *   - eine Welt, die der Intro-Baustein nicht kennt: Standard.
     * UNTERSCHIED ZU TYPOLUCK im Aufruf (`welt`): Blunderluck setzt in der
     * Werkstatt das Aussehen NICHT zurück — ohne `&farbwelt` gilt deshalb
     * dort die gewählte Welt, wie in der App dahinter.
     */
    weltWaehlen(lage) {
        const l = lage || {};
        const bekannt = (w) => !!w && Array.isArray(l.welten) && l.welten.indexOf(w) !== -1;
        const wunsch = l.werkstatt ? (l.werkstattWelt || l.standard) : l.gewaehlt;
        return bekannt(wunsch) ? wunsch : l.standard;
    },

    welt() {
        const werkstatt = typeof FREISCHALTUNG !== "undefined" && FREISCHALTUNG.werkstatt();
        const aussehen = (typeof UPCREW_AUSSEHEN !== "undefined") ? UPCREW_AUSSEHEN : null;
        const gewaehlt = aussehen ? aussehen.lesen().farbwelt : null;
        return INTRO.weltWaehlen({
            werkstatt: werkstatt,
            werkstattWelt: werkstatt ? (INTRO._werkstattWert("farbwelt") || gewaehlt) : null,
            gewaehlt: gewaehlt,
            standard: (aussehen && aussehen.STANDARD) ? aussehen.STANDARD.farbwelt : "werkstatt",
            welten: (typeof UPCREW_INTRO !== "undefined") ? Object.keys(UPCREW_INTRO.WELTEN) : []
        });
    },

    /* Hell oder dunkel — wie die App gerade aussieht: seit v0.141.0 die
       Einstellung „Darstellung" (js\darstellung.js), sonst das Gerät. In der
       Werkstatt gelten `&hell` / `&dunkel` (seit v0.152.4, wie Typoluck). */
    modus() {
        if (INTRO._werkstattWert("hell") !== null) {
            return "hell";
        }
        if (INTRO._werkstattWert("dunkel") !== null) {
            return "dunkel";
        }
        if (typeof DARSTELLUNG !== "undefined") {
            return DARSTELLUNG.modus();
        }
        const geraetDunkel = !!(window.matchMedia
            && window.matchMedia("(prefers-color-scheme: dark)").matches);
        return geraetDunkel ? "dunkel" : "hell";
    },

    /* Zeigt das Intro im Behälter und liefert ein Versprechen, das nach dem
       Ausblenden erfüllt ist (mit { art, welt, modus } oder null). */
    zeigen(behaelter) {
        if (!behaelter || typeof UPCREW_INTRO === "undefined" || !INTRO.faellig()) {
            return Promise.resolve(null);
        }
        return UPCREW_INTRO.zeigen(behaelter, {
            modus: INTRO.modus(),
            /* Die eigene Farbwelt (seit v0.151.17; seit v0.152.4 über
               `welt`, wie Typoluck). */
            welt: INTRO.welt(),
            app: { nr: INTRO.APP_NR, name: INTRO.APP_NAME, version: KONFIG.APP_VERSION }
        });
    }
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = INTRO;
}
