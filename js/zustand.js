/*
 * zustand.js — die drei Zustände jeder Stelle, die auf Daten wartet:
 * Laden, Leer, Fehler (UPCrew-Standard, Abschnitt 3, seit v0.140.0).
 *
 * WARUM EIN BAUSTEIN: Vorher erfand jede Stelle ihren eigenen Satz
 * („Noch keine Freunde. Such unten nach einem Namen …", „Noch keine
 * beendete Partie — die Zahlen kommen mit der ersten.", „Die Partie konnte
 * nicht gespeichert werden: " plus technische Meldung). Der Standard
 * verlangt je Zustand ein festes Bild — und keinen Satz:
 *
 *   Laden   Platzhalter in der Form des Inhalts (graue Balken, sanft
 *           pulsierend). Dauert es länger als LADEN_GRENZE_MS, wird daraus
 *           von selbst der Fehler — ein ewiges Pulsieren wäre eine
 *           Falschaussage.
 *   Leer    Zeichen, höchstens drei Wörter, EIN Knopf, der weiterhilft.
 *   Fehler  Zeichen, ein bis zwei Wörter, Knopf „Nochmal", der genau den
 *           fehlgeschlagenen Schritt wiederholt.
 *
 * Vorbild ist Typoluck (`Apps\Typoluck\js\zustand.js`) — gleiche Namen,
 * gleiche Klassen, damit beide UPCrew-Spiele gleich aussehen. Blunderluck
 * hat keinen `BAUSTEINE`-Baukasten; Knöpfe und Zeichen baut diese Datei
 * deshalb selbst, mit denselben Klassen wie jeder andere Knopf der App
 * (`knopf knopf-still knopf-klein`) und demselben Strich wie die Zeichen in
 * `TEAM_SCHACH._linienZeichen` (1,8, runde Enden).
 *
 * Fehler, die in einem DIALOG auftreten (Senden gescheitert), gehen über
 * `DIALOG.fehler` in dialog.js — dieselbe Regel, nur als Dialog.
 *
 * Jede Funktion liefert ein Element; der Aufrufer hängt es ein. Kommt die
 * Antwort, ersetzt er es durch den Inhalt — der Lade-Platzhalter ist dann
 * nicht mehr im Dokument, und seine Uhr läuft ins Leere.
 */

const ZUSTAND = {

    LADEN_GRENZE_MS: 10000,

    /* Die Zeichen dieser Datei (Pfade auf 24 x 24, wie in Typoluck). */
    ZEICHEN: {
        leer: "M3 13 L6 5 H18 L21 13 V19 H3 Z M3 13 H8 L9.5 15.5 H14.5 L16 13 H21",
        "kein-netz": "M2.5 9 A14 14 0 0 1 21.5 9 M5.5 12.5 A9.5 9.5 0 0 1 18.5 12.5 "
            + "M8.8 16 A4.8 4.8 0 0 1 15.2 16 M12 19.5 V19.6 M4 4 L20 20",
        aktualisieren: "M20 12 A8 8 0 1 1 17.7 6.3 M20 4 V8.5 H15.5",
        /* zwei Personen — Freunde, Mitspieler */
        menschen: "M9 4.6 A3.4 3.4 0 1 0 9 11.4 A3.4 3.4 0 1 0 9 4.6 Z "
            + "M3.4 20 C3.4 15.6 5.8 13.4 9 13.4 C12.2 13.4 14.6 15.6 14.6 20 "
            + "M16.5 5.9 A2.6 2.6 0 1 0 16.5 11.1 A2.6 2.6 0 1 0 16.5 5.9 Z "
            + "M16.2 14.2 C19.4 14.2 21 16 21 19",
        /* eine Lupe — Suche ohne Treffer */
        lupe: "M10.5 4 A6.5 6.5 0 1 0 10.5 17 A6.5 6.5 0 1 0 10.5 4 Z M15.3 15.3 L20.5 20.5",
        /* ein Pokal — Punkte, Rangliste */
        pokal: "M7 4 H17 V9 A5 5 0 0 1 7 9 Z M7 6 H4 V8 A3 3 0 0 0 7 11 "
            + "M17 6 H20 V8 A3 3 0 0 1 17 11 M12 14 V18 M8.5 20.5 H15.5 M9.5 18 H14.5",
        /* Der Vibrations-Schalter in den Einstellungen (wie Typoluck): ein
           Handy mit Wellen, und dasselbe Handy ohne Wellen. */
        vibration: "M8.5 4 H15.5 V20 H8.5 Z M11 17 H13 M4.5 8.5 V15.5 M19.5 8.5 V15.5 "
            + "M2 10.5 V13.5 M22 10.5 V13.5",
        "vibration-aus": "M8.5 4 H15.5 V20 H8.5 Z M11 17 H13 M4 4 L20 20"
    },

    /*
     * Der Lade-Platzhalter.
     *   zeilen   wie viele graue Balken (Vorgabe 3) — so viele Zeilen, wie
     *            der Inhalt ungefähr haben wird, damit nichts springt
     *   nochmal  Funktion für den Fehler-Knopf, falls die Grenze reisst
     */
    laden(angaben) {
        const einstellung = angaben || {};
        const platzhalter = ZUSTAND._el("div", "zustand-laden");
        platzhalter.setAttribute("role", "status");
        platzhalter.setAttribute("aria-label", "Lädt");
        const zeilen = einstellung.zeilen || 3;
        for (let i = 0; i < zeilen; i++) {
            platzhalter.appendChild(ZUSTAND._el("span", "zustand-balken"));
        }
        /* `window.setTimeout` wie überall in der App — die Tests ersetzen
           den Zeitgeber über `window`. */
        window.setTimeout(() => {
            if (platzhalter.isConnected && platzhalter.parentNode) {
                platzhalter.parentNode.replaceChild(ZUSTAND.fehler({
                    text: "Keine Antwort", nochmal: einstellung.nochmal
                }), platzhalter);
            }
        }, ZUSTAND.LADEN_GRENZE_MS);
        return platzhalter;
    },

    /*
     * Leer.
     *   zeichen  Name aus ZUSTAND.ZEICHEN (Vorgabe "leer")
     *   text     höchstens drei Wörter
     *   aktion   { text, beiKlick } — der Knopf, der weiterhilft
     */
    leer(angaben) {
        const feld = ZUSTAND._feldBauen("zustand-leer", angaben.zeichen || "leer", angaben.text);
        if (angaben.aktion) {
            feld.appendChild(ZUSTAND._knopf(angaben.aktion.text, angaben.aktion.beiKlick));
        }
        return feld;
    },

    /*
     * Fehler.
     *   text     ein bis zwei Wörter (Vorgabe „Nicht erreichbar")
     *   nochmal  Funktion — wiederholt den fehlgeschlagenen Schritt
     *   technik  die technische Meldung; steht NICHT im Bild, nur als
     *            Hinweis beim Darüberfahren (für die Fehlersuche)
     */
    fehler(angaben) {
        const einstellung = angaben || {};
        const feld = ZUSTAND._feldBauen("zustand-fehler", "kein-netz",
            einstellung.text || "Nicht erreichbar");
        if (einstellung.technik) {
            feld.title = einstellung.technik;
        }
        if (typeof einstellung.nochmal === "function") {
            feld.appendChild(ZUSTAND._knopf("Nochmal", einstellung.nochmal));
        }
        return feld;
    },

    /* Ein Zeichen als SVG — auch dialog.js holt sich hier das Fehler-Zeichen.
       `klasse` wahlfrei: In einer Bild-Reihe (`TEAM_SCHACH._bildReiheBauen`)
       muss es `bild-zeichen` heissen wie die Schach-Zeichen, sonst bekommt
       es dort keine Grösse. */
    zeichen(name, klasse) {
        const ns = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(ns, "svg");
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("aria-hidden", "true");
        svg.setAttribute("class", klasse || "zeichen");
        const pfad = document.createElementNS(ns, "path");
        pfad.setAttribute("d", ZUSTAND.ZEICHEN[name] || ZUSTAND.ZEICHEN.leer);
        pfad.setAttribute("fill", "none");
        pfad.setAttribute("stroke", "currentColor");
        pfad.setAttribute("stroke-width", "1.8");
        pfad.setAttribute("stroke-linecap", "round");
        pfad.setAttribute("stroke-linejoin", "round");
        svg.appendChild(pfad);
        return svg;
    },

    _feldBauen(klasse, zeichen, text) {
        const feld = ZUSTAND._el("div", "zustand " + klasse);
        const bild = ZUSTAND._el("span", "zustand-bild");
        bild.appendChild(ZUSTAND.zeichen(zeichen));
        feld.appendChild(bild);
        if (text) {
            feld.appendChild(ZUSTAND._el("p", "zustand-text", text));
        }
        return feld;
    },

    _knopf(text, beiKlick) {
        const knopf = ZUSTAND._el("button", "knopf knopf-still knopf-klein", text);
        knopf.type = "button";
        if (typeof beiKlick === "function") {
            knopf.addEventListener("click", beiKlick);
        }
        return knopf;
    },

    _el(tag, klasse, text) {
        const element = document.createElement(tag);
        if (klasse) {
            element.className = klasse;
        }
        if (text !== undefined) {
            element.textContent = text;
        }
        return element;
    }
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = ZUSTAND;
}
