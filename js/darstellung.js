/*
 * darstellung.js — der Blunderluck-Anpasser für EIN Aussehen aller
 * UPCrew-Spiele (seit v0.144.0, UPCrew-Angleichung Runde 3,
 * Design\3D-Schrift\docs\AUFTRAEGE-RUNDE-3.md).
 *
 * WER WAS FÜHRT:
 *
 *   Hell/Dunkel, Farbwelt, Schrift und Knöpfe stehen NUR noch im
 *   gemeinsamen Baustein js\upcrew-aussehen.js (`UPCREW_AUSSEHEN`, Kopie aus
 *   Design\3D-Schrift\final, nie abwandeln) unter `upcrew.aussehen`. Stellt
 *   Typoluck im selben Browser um, zieht Blunderluck sofort mit — und
 *   umgekehrt. Diese Datei schreibt nichts Eigenes mehr, sie ergänzt nur,
 *   was der Baustein nicht kennt:
 *
 *     - die Kanten der Brettfelder (--feld-kante-hell/-dunkel), abgedunkelt
 *       aus den Feldfarben mit demselben Maß wie die übrigen Kanten;
 *     - die Farbe der Browser-Leiste am Handy (meta theme-color);
 *     - das Ereignis „darstellung-geaendert" an `document` — daran hängen
 *       das 3D-Brett (js\brett-3d.js liest seine Feldfarben neu) und alles
 *       andere, was Farben selbst ausrechnet.
 *
 *   Bis v0.143 stand die Wahl je Gerät in ICH (`blunderluck.darstellung`)
 *   und die Farbwelt war fest „werkstatt". Diese alte Wahl wird beim ersten
 *   Start EINMAL per `UPCREW_AUSSEHEN.migrieren` übergeben und danach nicht
 *   mehr gelesen.
 *
 * DIE SCHNITTSTELLE bleibt, wie sie war (Einstellungen, 3D-Brett):
 *
 *     DARSTELLUNG.thema()            "geraet" | "hell" | "dunkel"
 *     DARSTELLUNG.themaSetzen(wert)  schreibt über UPCREW_AUSSEHEN.setzen
 *     DARSTELLUNG.modus()            "hell" | "dunkel" — was gerade gilt
 *     DARSTELLUNG.anwenden()         Baustein anwenden + die Ergänzungen oben
 *     DARSTELLUNG.beiAenderung(fn)   fn(aussehen, quelle) nach jeder Änderung,
 *                                    auch aus der anderen App (Konto-Abgleich)
 *
 * Angewendet wird SOFORT beim Laden dieser Datei (ganz unten) — sie steht
 * in index.html direkt hinter dem Baustein und ist damit der „frühe Aufruf"
 * aus der Absprache: kein Bild in falscher Farbe oder Schrift.
 *
 * Fehlt der Baustein (Bildschirm-Tests im nachgebauten DOM), bleibt es beim
 * Gerät und den Werten aus den Stildateien — nichts bricht.
 */

const DARSTELLUNG = {

    THEMEN: ["geraet", "hell", "dunkel"],

    /* Kanten: so stark abgedunkelt wie im Farbwelten-Baustein. */
    KANTE_ANTEIL: 0.28,

    EREIGNIS: "darstellung-geaendert",

    /* Wer nach einer Änderung Bescheid haben will (Konto-Abgleich). */
    _horcher: [],

    _baustein() {
        return (typeof UPCREW_AUSSEHEN !== "undefined") ? UPCREW_AUSSEHEN : null;
    },

    thema() {
        const baustein = DARSTELLUNG._baustein();
        return baustein ? baustein.lesen().darstellung : "geraet";
    },

    themaSetzen(wert) {
        const baustein = DARSTELLUNG._baustein();
        if (!baustein) {
            return;
        }
        /* `setzen` wendet selbst an und meldet „selbst" an alle Beobachter
           — die Ergänzungen unten laufen über `_beobachten`. */
        baustein.setzen({ darstellung: DARSTELLUNG.THEMEN.indexOf(wert) !== -1 ? wert : "geraet" });
    },

    /* Was gerade gilt: die feste Wahl, sonst das Gerät. */
    modus() {
        const baustein = DARSTELLUNG._baustein();
        if (baustein) {
            return baustein.modus();
        }
        const geraetHell = typeof window !== "undefined" && !!(window.matchMedia
            && window.matchMedia("(prefers-color-scheme: light)").matches);
        return geraetHell ? "hell" : "dunkel";
    },

    beiAenderung(fn) {
        if (typeof fn === "function") {
            DARSTELLUNG._horcher.push(fn);
        }
    },

    anwenden() {
        if (typeof document === "undefined" || !document.documentElement) {
            return;
        }
        const wurzel = document.documentElement;
        const baustein = DARSTELLUNG._baustein();
        if (baustein) {
            try {
                baustein.anwenden(wurzel);
            } catch (fehler) {
                /* Fehlt der Intro-Baustein (er trägt die Grundfarben),
                   bleiben die Werte aus den Stildateien stehen. */
            }
        }
        DARSTELLUNG._ergaenzen(wurzel);
    },

    /* Was der Baustein nicht kennt (siehe Kopf). */
    _ergaenzen(wurzel) {
        if (wurzel.style && typeof wurzel.style.getPropertyValue === "function") {
            const hell = wurzel.style.getPropertyValue("--feld-hell");
            const dunkel = wurzel.style.getPropertyValue("--feld-dunkel");
            if (hell) {
                wurzel.style.setProperty("--feld-kante-hell", DARSTELLUNG._abdunkeln(hell));
            }
            if (dunkel) {
                wurzel.style.setProperty("--feld-kante-dunkel", DARSTELLUNG._abdunkeln(dunkel));
            }
        }

        /* Die Leiste des Browsers am Handy in der Grundfarbe. */
        const leiste = document.querySelector("meta[name=\"theme-color\"]");
        if (leiste && typeof getComputedStyle === "function") {
            const grund = getComputedStyle(wurzel).getPropertyValue("--flaeche").trim();
            if (grund) {
                leiste.setAttribute("content", grund);
            }
        }

        if (typeof CustomEvent === "function") {
            document.dispatchEvent(new CustomEvent(DARSTELLUNG.EREIGNIS,
                { detail: { modus: DARSTELLUNG.modus() } }));
        }
    },

    /* "#rrggbb" um KANTE_ANTEIL Richtung Schwarz; Unlesbares bleibt, wie es ist. */
    _abdunkeln(farbe) {
        const treffer = /^#([0-9a-f]{6})$/i.exec(String(farbe || "").trim());
        if (!treffer) {
            return farbe;
        }
        const zahl = parseInt(treffer[1], 16);
        const anteil = 1 - DARSTELLUNG.KANTE_ANTEIL;
        return "#" + [16, 8, 0]
            .map((schieben) => Math.round(((zahl >> schieben) & 255) * anteil))
            .map((wert) => wert.toString(16).padStart(2, "0"))
            .join("");
    },

    /*
     * Beim Laden: die alte eigene Wahl einmalig übergeben, anwenden, und
     * jede Änderung beobachten — eigene (Einstellungen, Anpassen), aus der
     * anderen App, vom Konto oder vom Gerät (Hell/Dunkel des Systems). Der
     * Baustein hat dann schon angewendet; hier kommen die Ergänzungen dazu
     * und die Meldung an die eigenen Horcher.
     */
    _starten() {
        const baustein = DARSTELLUNG._baustein();
        if (baustein && typeof ICH !== "undefined") {
            baustein.migrieren({ darstellung: ICH.darstellung() });
        }
        DARSTELLUNG.anwenden();
        if (!baustein) {
            return;
        }
        baustein.beobachten((aussehen, quelle) => {
            DARSTELLUNG._ergaenzen(document.documentElement);
            for (const fn of DARSTELLUNG._horcher) {
                try {
                    fn(aussehen, quelle);
                } catch (fehler) {
                    console.error(fehler);
                }
            }
        });
    }
};

if (typeof document !== "undefined") {
    DARSTELLUNG._starten();
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = DARSTELLUNG;
}
