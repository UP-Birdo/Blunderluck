/*
 * darstellung.js — wie die App aussieht: hell, dunkel oder wie das Gerät,
 * und in welcher Farbwelt (seit v0.141.0, UPCrew-Angleichung Runde 2).
 *
 * EIN Baustein, wie in Typoluck (Apps\Typoluck\js\darstellung.js):
 *
 *     DARSTELLUNG.thema()            "geraet" | "hell" | "dunkel"
 *     DARSTELLUNG.themaSetzen(wert)  merkt die Wahl und wendet sie an
 *     DARSTELLUNG.modus()            "hell" | "dunkel" — was gerade gilt
 *     DARSTELLUNG.anwenden()         schreibt alles an <html>
 *
 * WIE ES WIRKT, in zwei Schritten:
 *
 *   1. Das Attribut `data-darstellung` ("hell"/"dunkel"; fehlt es, gilt das
 *      Gerät) an <html>. Die Stildateien tauschen daraufhin ihre Variablen
 *      (Muster im Kopf von css\stil.css) — das deckt alle Farben ab, auch
 *      Bedeutungs- und Brettmarken-Farben, die keine Farbwelt kennt.
 *   2. Die Farbwelt: js\upcrew-farbwelten.js (gemeinsamer Baustein aus
 *      Design\3D-Schrift\final, nur kopiert) setzt die Oberflächen-Farben
 *      (--flaeche … --still-kante) und das Brett (--feld-hell/-dunkel)
 *      direkt an <html>. Welt ist vorerst IMMER „werkstatt" — das
 *      Freischalten weiterer Welten kommt später (Runde 3), auch wenn im
 *      Browser-Speicher `upcrew.farbwelt` schon etwas anderes steht.
 *
 * Die Kanten der Brettfelder (--feld-kante-hell/-dunkel) liefert der
 * Baustein nicht; sie werden hier aus den Feldfarben abgedunkelt, mit
 * demselben Maß wie seine übrigen Kanten.
 *
 * Nach jedem Anwenden geht das Ereignis „darstellung-geaendert" an
 * `document` — das 3D-Brett (js\brett-3d.js) liest daraufhin seine Farben
 * neu. Ab Werk: wie das Gerät; gespeichert je Gerät in ICH, wie die
 * Vibration.
 *
 * Angewendet wird SOFORT beim Laden dieser Datei (ganz unten) — sie steht
 * früh in index.html, damit kein Bild in der falschen Farbe aufblitzt.
 */

const DARSTELLUNG = {

    THEMEN: ["geraet", "hell", "dunkel"],

    /* Die Farbwelt dieser Runde (siehe Kopf). */
    WELT: "werkstatt",

    /* Kanten: so stark abgedunkelt wie im Farbwelten-Baustein. */
    KANTE_ANTEIL: 0.28,

    EREIGNIS: "darstellung-geaendert",

    thema() {
        return ICH.darstellung();
    },

    themaSetzen(wert) {
        ICH.darstellungSetzen(DARSTELLUNG.THEMEN.indexOf(wert) !== -1 ? wert : "geraet");
        DARSTELLUNG.anwenden();
    },

    /* Was gerade gilt: die feste Wahl, sonst das Gerät. */
    modus() {
        const thema = DARSTELLUNG.thema();
        if (thema === "hell" || thema === "dunkel") {
            return thema;
        }
        const geraetDunkel = typeof window !== "undefined" && !!(window.matchMedia
            && window.matchMedia("(prefers-color-scheme: dark)").matches);
        return geraetDunkel ? "dunkel" : "hell";
    },

    anwenden() {
        if (typeof document === "undefined" || !document.documentElement) {
            return;
        }
        const wurzel = document.documentElement;
        const thema = DARSTELLUNG.thema();
        if (thema === "geraet") {
            delete wurzel.dataset.darstellung;
        } else {
            wurzel.dataset.darstellung = thema;
        }

        const modus = DARSTELLUNG.modus();
        if (typeof UPCREW_FARBWELTEN !== "undefined") {
            try {
                const werte = UPCREW_FARBWELTEN.anwenden(DARSTELLUNG.WELT, modus, wurzel);
                wurzel.style.setProperty("--feld-kante-hell",
                    DARSTELLUNG._abdunkeln(werte["--feld-hell"]));
                wurzel.style.setProperty("--feld-kante-dunkel",
                    DARSTELLUNG._abdunkeln(werte["--feld-dunkel"]));
            } catch (fehler) {
                /* Fehlt der Intro-Baustein (er trägt die Grundfarben), bleiben
                   die Werte aus den Stildateien stehen — die App läuft weiter. */
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
            document.dispatchEvent(new CustomEvent(DARSTELLUNG.EREIGNIS, { detail: { modus: modus } }));
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

    /* Folgt die App dem Gerät, zieht sie mit, wenn das Gerät umschaltet. */
    _geraetBeobachten() {
        if (typeof window === "undefined" || !window.matchMedia) {
            return;
        }
        const frage = window.matchMedia("(prefers-color-scheme: dark)");
        const aenderung = () => {
            if (DARSTELLUNG.thema() === "geraet") {
                DARSTELLUNG.anwenden();
            }
        };
        if (typeof frage.addEventListener === "function") {
            frage.addEventListener("change", aenderung);
        } else if (typeof frage.addListener === "function") {
            frage.addListener(aenderung);
        }
    }
};

if (typeof document !== "undefined") {
    DARSTELLUNG.anwenden();
    DARSTELLUNG._geraetBeobachten();
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = DARSTELLUNG;
}
