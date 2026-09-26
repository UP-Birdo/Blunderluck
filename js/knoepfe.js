/*
 * knoepfe.js — macht aus den Knöpfen der App UPCrew-Knöpfe (seit v0.144.0,
 * UPCrew-Angleichung Runde 3, Design\3D-Schrift\docs\AUFTRAEGE-RUNDE-3.md).
 *
 * DIE KNOPF-FAMILIE (K1–K6) wählt der Spieler im Tab „Anpassen"; wie ein
 * Knopf dann aussieht, steht ausschließlich im gemeinsamen Baustein
 * css\upcrew-knoepfe.css (Kopie aus Design\3D-Schrift\final, nie abwandeln).
 * Ein Knopf braucht dafür:
 *
 *     class="up-kn up-haupt | up-zweit | up-gefahr"  (+ up-rund nur Symbol)
 *     als erstes Kind <i class="up-led"></i>          (leuchtet bei K3)
 *
 * DIE ZUORDNUNG — die Haus-Klassen bleiben stehen (an ihnen hängen Größe,
 * Anordnung und die Tests), dazu kommt:
 *
 *     knopf-gefahr                     → up-gefahr   (vor allem anderen —
 *                                                     der Zwei-Schritt-Knopf
 *                                                     trägt beides)
 *     knopf-haupt                      → up-haupt
 *     knopf-still                      → up-zweit
 *     knopf-zurueck                    → zusätzlich up-rund (nur Symbol;
 *                                                     der kleine Eck-Knopf am
 *                                                     Spieler behält seine
 *                                                     26 px und bleibt ohne)
 *
 * NICHT UMGESTELLT (Auftrag: „Tasten, Kacheln, Brettfelder bleiben, wie sie
 * sind") — das ist Spielgrafik oder eine Auswahl-Reihe, kein Knopf:
 *
 *     AUSNAHME_KLASSEN   die Fähigkeiten- und Unglücks-Karten, die
 *                        Armee-Wahl, die Haken im Vorrat, die Friedhofleiste
 *     AUSWAHL_REIHEN     die Segment-Reihen beim Anlegen einer Partie —
 *                        dort zeigt allein die Pille die Wahl
 *     ohne haupt/still/gefahr   Brettfelder, Hand, Reiter, Team-Kacheln …
 *
 * WARUM EIN WÄCHTER STATT 130 EINZELNER ÄNDERUNGEN: Knöpfe entstehen an
 * rund 130 Stellen in 17 Dateien, über ein halbes Dutzend eigener
 * `_knopf`-Helfer, und viele ändern später Text oder Klasse (der
 * Zwei-Schritt-Knopf setzt `className` neu, „Übernommen" ersetzt den Text
 * und damit das up-led). Ein `MutationObserver` am body stellt jeden
 * Knopf beim Einhängen und nach jeder solchen Änderung nach, an EINER
 * Stelle. Wer einen neuen Knopf baut, muss nichts tun; wer etwas Neues
 * ausnehmen will, trägt es in die beiden Listen unten ein. Begründung:
 * docs\entscheidungen\entschieden.md, „Knöpfe über einen Wächter".
 *
 * `KNOEPFE.gestalten(knopf)` ist dasselbe von Hand und macht nichts, wenn
 * schon alles stimmt — so beruhigt sich der Wächter nach einem Durchlauf.
 */

const KNOEPFE = {

    AUSNAHME_KLASSEN: [
        "faehigkeit-knopf",
        "unglueck-knopf",
        "armee-knopf",
        "item-haken",
        "friedhof-streifen"
    ],

    AUSWAHL_REIHEN: ".mengen-leiste, .bot-leiste, .vorrat-leiste, .armee-leiste, "
        + ".form-leiste, .sichtbarkeit-leiste, .bild-leiste, .karten-leiste",

    RUND_KLASSEN: ["knopf-zurueck"],

    UP_ARTEN: ["up-haupt", "up-zweit", "up-gefahr"],

    /* Welche Art ein Haus-Knopf bekommt — null heißt: bleibt, wie er ist. */
    art(knopf) {
        if (!knopf || !knopf.classList || !knopf.classList.contains("knopf")) {
            return null;
        }
        const liste = knopf.classList;
        if (KNOEPFE.AUSNAHME_KLASSEN.some((klasse) => liste.contains(klasse))) {
            return null;
        }
        if (typeof knopf.closest === "function" && knopf.closest(KNOEPFE.AUSWAHL_REIHEN)) {
            return null;
        }
        if (liste.contains("knopf-gefahr")) {
            return "up-gefahr";
        }
        if (liste.contains("knopf-haupt")) {
            return "up-haupt";
        }
        if (liste.contains("knopf-still")) {
            return "up-zweit";
        }
        return null;
    },

    gestalten(knopf) {
        const art = KNOEPFE.art(knopf);
        const liste = knopf && knopf.classList;
        if (!art) {
            /* War er vorher einer (Armee-Knopf wird aktiv, Klasse wechselt),
               kommt alles UPCrew-Eigene wieder weg. */
            if (liste && liste.contains("up-kn")) {
                liste.remove("up-kn", "up-rund", ...KNOEPFE.UP_ARTEN);
                const led = knopf.querySelector(":scope > .up-led");
                if (led) {
                    led.remove();
                }
            }
            return false;
        }

        if (!liste.contains("up-kn")) {
            liste.add("up-kn");
        }
        for (const andere of KNOEPFE.UP_ARTEN) {
            if (andere !== art && liste.contains(andere)) {
                liste.remove(andere);
            }
        }
        if (!liste.contains(art)) {
            liste.add(art);
        }
        const rund = KNOEPFE.RUND_KLASSEN.some((klasse) => liste.contains(klasse));
        if (rund !== liste.contains("up-rund")) {
            liste.toggle("up-rund", rund);
        }

        const erstes = knopf.firstElementChild;
        if (!erstes || !erstes.classList.contains("up-led")) {
            const led = document.createElement("i");
            led.className = "up-led";
            led.setAttribute("aria-hidden", "true");
            knopf.insertBefore(led, knopf.firstChild);
        }
        return true;
    },

    /* Alle Knöpfe in einem Element (das Element selbst eingeschlossen). */
    _alleIn(el) {
        if (!el || el.nodeType !== 1) {
            return;
        }
        if (el.matches && el.matches("button.knopf")) {
            KNOEPFE.gestalten(el);
        }
        if (typeof el.querySelectorAll === "function") {
            for (const knopf of el.querySelectorAll("button.knopf")) {
                KNOEPFE.gestalten(knopf);
            }
        }
    },

    _waechter: null,

    starten() {
        if (typeof document === "undefined" || !document.body
                || typeof MutationObserver !== "function") {
            return;
        }
        KNOEPFE._alleIn(document.body);
        KNOEPFE._waechter = new MutationObserver((aenderungen) => {
            for (const aenderung of aenderungen) {
                if (aenderung.type === "attributes") {
                    if (aenderung.target.matches && aenderung.target.matches("button.knopf, button.up-kn")) {
                        KNOEPFE.gestalten(aenderung.target);
                    }
                    continue;
                }
                /* Text oder Inhalt eines Knopfs ersetzt → up-led fehlt. */
                const ziel = aenderung.target;
                if (ziel.nodeType === 1 && ziel.matches && ziel.matches("button.knopf")) {
                    KNOEPFE.gestalten(ziel);
                }
                for (const neu of aenderung.addedNodes) {
                    KNOEPFE._alleIn(neu);
                }
            }
        });
        KNOEPFE._waechter.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["class"]
        });
    }
};

if (typeof document !== "undefined" && document.body) {
    KNOEPFE.starten();
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = KNOEPFE;
}
