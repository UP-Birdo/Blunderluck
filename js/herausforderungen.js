/*
 * herausforderungen.js — der Tab „Aufgaben" = HEUTE (seit v0.149.0,
 * Runde 5; bis v0.148 nur ein Platzhalter „Kommt bald").
 *
 * FORTSCHRITT.md („GÜLTIGER STAND"): „Aufgaben-Tab = Heute: Tagesbrett
 * (Blunderluck) + Tageswort (Typoluck), jeweils mit Figuren-Wertung; beide
 * geschafft = ×1,5 XP; Serie (7 Flammen) mit Serien-Schutz. Die jeweils
 * andere App als Karte mit ‚Zu …'." Vorlage: Entwurf `aufgabenSicht`.
 *
 *   - Tagesbrett: die Schach-Aufgabe des Tages (js\tagesbrett.js), für alle
 *     gleich. „Lösen" startet sie als Partie gegen Bob; nach dem Abschluss
 *     stehen hier die Figuren (3 im ersten Versuch, 2 im zweiten, sonst 1).
 *   - Tageswort: die Karte von Typoluck. Ob es heute geschafft ist, steht im
 *     gemeinsamen Fortschritt am Konto (Zweig „typoluck"); gespielt wird es
 *     in Typoluck („Zu Typoluck").
 *   - Serie: die letzten sieben Tage als Flammen, die Zahl der Tage am
 *     Stück und die Serien-Schutze, die das Level bringt.
 *
 * Unten in derselben Datei: der stille Platzhalter „Bald" für Platz 5 der
 * Leiste (seit v0.145.0).
 */

/* Die Zeichen dieses Tabs (24er-Raster, Entwurf `P`). */
const HEUTE_ZEICHEN = {
    serie: "M12 3 C15 7 18 9 18 14 A6 6 0 0 1 6 14 C6 11 8 9 9 7 C10 10 11 11 12 11 C12 8 11 6 12 3 Z",
    schutz: "M12 3 L19 6 V11 C19 16 16 19 12 21 C8 19 5 16 5 11 V6 Z",
    beide: "M4 9 H14 V20 H4 Z M10 4 H20 V15 H16"
};

/* Adresse von Typoluck neben Blunderluck (beide unter up-birdo.github.io). */
const HEUTE_TYPOLUCK = "../Typoluck/";

const HERAUSFORDERUNGEN = {

    id: "herausforderungen",
    titel: "Heute",
    leisteText: "Aufgaben",
    zeichen: "aufgaben",

    wurzelEl: null,
    laeuft: false,

    aufbauen(behaelter) {
        HERAUSFORDERUNGEN.wurzelEl = behaelter;
        behaelter.classList.add("heute");
    },

    beimOeffnen() {
        /* Ein normaler Tab: kein Fenster, rollt wie immer. */
        if (typeof TABS !== "undefined" && TABS.rundeSetzen) {
            TABS.rundeSetzen(HERAUSFORDERUNGEN.id, false);
        }
        HERAUSFORDERUNGEN.zeichnen();
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
    },

    _zeichen(pfad, klasse) {
        const ns = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(ns, "svg");
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("aria-hidden", "true");
        svg.setAttribute("class", klasse || "heute-zeichen");
        const weg = document.createElementNS(ns, "path");
        weg.setAttribute("d", pfad);
        svg.appendChild(weg);
        return svg;
    },

    zeichnen() {
        const wurzel = HERAUSFORDERUNGEN.wurzelEl;
        if (!wurzel) {
            return;
        }
        wurzel.innerHTML = "";

        const kopf = HERAUSFORDERUNGEN._el("div", "partie-kopf partie-kopf-klebt");
        kopf.appendChild(HERAUSFORDERUNGEN._el("h2", "partie-titel", HERAUSFORDERUNGEN.titel));
        wurzel.appendChild(kopf);

        if (typeof FORTSCHRITT_KONTO === "undefined" || typeof TAGESBRETT === "undefined") {
            wurzel.appendChild(ZUSTAND.leer({ zeichen: "aufgaben", text: "Kommt bald" }));
            return;
        }

        const heute = FORTSCHRITT_KONTO.heute();
        wurzel.appendChild(HERAUSFORDERUNGEN._brettKarteBauen(heute));
        wurzel.appendChild(HERAUSFORDERUNGEN._wortKarteBauen(heute));

        const beide = heute.blunderluck.figuren > 0 && heute.typoluck.figuren > 0;
        const hinweis = HERAUSFORDERUNGEN._el("div", "heute-beide" + (beide ? " an" : ""));
        hinweis.appendChild(HERAUSFORDERUNGEN._zeichen(HEUTE_ZEICHEN.beide));
        hinweis.appendChild(HERAUSFORDERUNGEN._el("b", "", "×1,5"));
        hinweis.appendChild(HERAUSFORDERUNGEN._el("span", "", beide ? "Beide geschafft" : "Beide schaffen"));
        wurzel.appendChild(hinweis);

        wurzel.appendChild(HERAUSFORDERUNGEN._serieBauen(heute));
    },

    /* Die Karte „Tagesbrett": Bild der Stellung, Aufgabe, Lösen/Figuren. */
    _brettKarteBauen(heute) {
        const karte = HERAUSFORDERUNGEN._el("section", "karte heute-karte"
            + (heute.blunderluck.figuren > 0 ? " erledigt" : ""));
        const aufgabe = TAGESBRETT.fuer(heute.datum);

        const bild = HERAUSFORDERUNGEN._el("div", "heute-bild");
        if (aufgabe && typeof TEAM_SCHACH !== "undefined") {
            bild.appendChild(TEAM_SCHACH._vorschauBauen(SCHACH_VARIANTEN.holen("standard"),
                aufgabe.aufgabe.brett, true));
        }
        karte.appendChild(bild);

        const text = HERAUSFORDERUNGEN._el("div", "heute-text");
        text.appendChild(HERAUSFORDERUNGEN._el("span", "heute-spiel", "Blunderluck"));
        text.appendChild(HERAUSFORDERUNGEN._el("b", "heute-name", "Tagesbrett"));
        if (aufgabe) {
            text.appendChild(HERAUSFORDERUNGEN._el("span", "heute-aufgabe",
                "Matt in " + aufgabe.aufgabe.zuege + " · "
                    + (aufgabe.aufgabe.amZug === "weiss" ? "Weiss" : "Schwarz") + " am Zug"));
            text.appendChild(HERAUSFORDERUNGEN._stufeBauen(TAGESBRETT.schwierigkeit(aufgabe.aufgabe.zuege)));
        }

        if (heute.blunderluck.figuren > 0) {
            text.appendChild(HERAUSFORDERUNGEN._figurenBauen(heute.blunderluck.figuren));
        } else if (aufgabe) {
            const knopf = HERAUSFORDERUNGEN._el("button", "knopf knopf-haupt heute-los",
                heute.blunderluck.versuche > 0 ? "Nochmal" : "Lösen");
            knopf.type = "button";
            knopf.disabled = HERAUSFORDERUNGEN.laeuft;
            knopf.addEventListener("click", () => HERAUSFORDERUNGEN.loesen(heute.datum));
            text.appendChild(knopf);
            if (heute.blunderluck.versuche > 0) {
                text.appendChild(HERAUSFORDERUNGEN._el("span", "heute-versuche",
                    heute.blunderluck.versuche + (heute.blunderluck.versuche === 1 ? " Versuch" : " Versuche")));
            }
        }
        karte.appendChild(text);
        return karte;
    },

    /* Die Karte „Tageswort" (Typoluck): geschafft → Figuren, sonst der Weg
       hinüber. */
    _wortKarteBauen(heute) {
        const karte = HERAUSFORDERUNGEN._el("section", "karte heute-karte heute-karte-wort"
            + (heute.typoluck.figuren > 0 ? " erledigt" : ""));
        const kacheln = HERAUSFORDERUNGEN._el("div", "heute-wort");
        for (const buchstabe of "TAGES") {
            kacheln.appendChild(HERAUSFORDERUNGEN._el("i", heute.typoluck.figuren > 0 ? "an" : "",
                heute.typoluck.figuren > 0 ? buchstabe : ""));
        }
        karte.appendChild(kacheln);

        const text = HERAUSFORDERUNGEN._el("div", "heute-text");
        text.appendChild(HERAUSFORDERUNGEN._el("span", "heute-spiel", "Typoluck"));
        text.appendChild(HERAUSFORDERUNGEN._el("b", "heute-name", "Tageswort"));
        text.appendChild(HERAUSFORDERUNGEN._el("span", "heute-aufgabe", "Für alle gleich"));
        if (heute.typoluck.figuren > 0) {
            text.appendChild(HERAUSFORDERUNGEN._figurenBauen(heute.typoluck.figuren));
        } else {
            const knopf = HERAUSFORDERUNGEN._el("button", "knopf knopf-still heute-los", "Zu Typoluck");
            knopf.type = "button";
            knopf.addEventListener("click", () => {
                window.location.href = HEUTE_TYPOLUCK;
            });
            text.appendChild(knopf);
        }
        karte.appendChild(text);
        return karte;
    },

    /* Die Schwierigkeit als 1–3 Punkte (seit v0.151.0, in Typoluck gleich). */
    _stufeBauen(schwierigkeit) {
        const namen = { 1: "leicht", 2: "mittel", 3: "schwer" };
        const reihe = HERAUSFORDERUNGEN._el("span", "heute-stufe");
        reihe.title = namen[schwierigkeit] || "";
        reihe.setAttribute("aria-label", "Schwierigkeit " + (namen[schwierigkeit] || ""));
        for (let i = 1; i <= 3; i++) {
            reihe.appendChild(HERAUSFORDERUNGEN._el("i", i <= schwierigkeit ? "an" : ""));
        }
        return reihe;
    },

    _figurenBauen(anzahl) {
        if (typeof START !== "undefined" && typeof START._figurenBauen === "function") {
            return START._figurenBauen(anzahl, "heute-figuren");
        }
        return HERAUSFORDERUNGEN._el("span", "heute-figuren", anzahl + "/3");
    },

    /* Die Serie: sieben Flammen (heute rechts), die Zahl, die Schutze. */
    _serieBauen(heute) {
        const reihe = HERAUSFORDERUNGEN._el("section", "karte heute-serie");
        const flammen = HERAUSFORDERUNGEN._el("div", "heute-flammen");
        let tag = heute.datum;
        const liste = [];
        for (let i = 0; i < 7; i++) {
            liste.unshift(tag);
            tag = FORTSCHRITT._vortag(tag);
        }
        for (const eintrag of liste) {
            const flamme = HERAUSFORDERUNGEN._el("i", "heute-flamme"
                + (heute.tage.has(eintrag) ? " an" : "") + (eintrag === heute.datum ? " heute" : ""));
            flamme.appendChild(HERAUSFORDERUNGEN._zeichen(HEUTE_ZEICHEN.serie));
            flammen.appendChild(flamme);
        }
        reihe.appendChild(flammen);

        const zahlen = HERAUSFORDERUNGEN._el("div", "heute-serie-zahlen");
        zahlen.appendChild(HERAUSFORDERUNGEN._el("b", "", String(heute.serie.tage)));
        zahlen.appendChild(HERAUSFORDERUNGEN._el("span", "", heute.serie.tage === 1 ? "Tag Serie" : "Tage Serie"));
        const schutz = HERAUSFORDERUNGEN._el("span", "heute-schutz");
        schutz.title = "Serien-Schutz";
        schutz.setAttribute("aria-label", heute.schutzFrei + " Serien-Schutz");
        schutz.appendChild(HERAUSFORDERUNGEN._zeichen(HEUTE_ZEICHEN.schutz));
        schutz.appendChild(document.createTextNode(String(heute.schutzFrei)));
        zahlen.appendChild(schutz);
        reihe.appendChild(zahlen);
        return reihe;
    },

    /* „Lösen": das Tagesbrett als Partie gegen Bob anlegen und betreten. */
    async loesen(datum) {
        if (HERAUSFORDERUNGEN.laeuft) {
            return;
        }
        const regeln = TAGESBRETT.regelnFuer(datum);
        if (!regeln) {
            return;
        }
        HERAUSFORDERUNGEN.laeuft = true;
        HERAUSFORDERUNGEN.zeichnen();
        try {
            await TEAM_SCHACH.rundeStarten(regeln.spielart, regeln);
        } finally {
            HERAUSFORDERUNGEN.laeuft = false;
            HERAUSFORDERUNGEN.zeichnen();
        }
    }
};

/* Platz 5 der Leiste: still, ohne Inhalt (`platzhalter`, js\tabs.js). */
const BALD = {
    id: "bald",
    titel: "Bald",
    zeichen: "bald",
    platzhalter: true,
    aufbauen() {
        /* Nie geöffnet — der Knopf ist gesperrt. */
    }
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = { HERAUSFORDERUNGEN, BALD };
}
