/*
 * start-turm.js — der Turm auf dem Startbildschirm (seit v0.147.0, Runde 5,
 * Design\3D-Schrift\docs\AUFTRAEGE-RUNDE-5.md; Vorlage
 * Design\3D-Schrift\entwuerfe\Herausforderungen\, Funktionen `weg`,
 * `gegnerIntro`, `aufstiegWeg`).
 *
 * ERGÄNZT das Objekt START (Object.assign) und lädt deshalb NACH start.js.
 * Die Regeln des Turms stehen in js\turm.js, der Stand im Fortschritt
 * (js\fortschritt-konto.js) — hier wird nur gezeichnet und gestartet.
 *
 * WAS DER START IM TURM ZEIGT (Nutzer 27.09.2026: „mir reichen die Punkte
 * vom Anfang"): oben den WEG durch das aktuelle Stockwerk — ein Punkt je
 * Stufe im Zickzack von unten nach oben, die Tür oben, unter jedem Punkt die
 * Wertung (Bauer, Springer, König). Rechts ▲▼ und Punkte zum Blättern durch
 * die Orte, „zu dir" springt zurück. Der Boss-Punkt ist grösser und rot.
 * Wer der Gegner ist, zeigt erst die VORSTELLUNG beim Start („VS").
 *
 * DIE ART (Turm · Frei) wählt man am Quadrat rechts neben „Spielen"; es
 * zeigt das Zeichen der Art und klappt die Wahl nach oben auf. Kein Band
 * oben (Nutzer: gefiel nicht). Die letzte Wahl merkt sich das Gerät.
 */

/* Die Zeichen dieser Datei (24er-Raster, wie ZUSTAND.ZEICHEN). */
const START_TURM_ZEICHEN = {
    turm: "M5 21 V9 H8 V6 H11 V9 H13 V6 H16 V9 H19 V21 Z M10 21 V16 A2 2 0 0 1 14 16 V21",
    frei: "M4 7 H13 M17 7 H20 M15 5 V9 M4 17 H7 M11 17 H20 M9 15 V19",
    auf: "M6 15 L12 9 L18 15",
    ab: "M6 9 L12 15 L18 9",
    schloss: "M7 11 V8 A5 5 0 0 1 17 8 V11 M5 11 H19 V20 H5 Z",
    tuer: "M6 21 V4 H18 V21 M3 21 H21 M14.5 12.5 H15",
    haken: "M5 12.5 L10 17 L19 7",
    bob: "M6 9 A6 6 0 0 1 18 9 V15 A3 3 0 0 1 15 18 H9 A3 3 0 0 1 6 15 Z M9.5 11.5 H10 M14 11.5 H14.5 M12 3 V1.5",
    boss: "M4 5 L8 9 H16 L20 5 L18.5 14 C17.5 18 15 20.5 12 20.5 C9 20.5 6.5 18 5.5 14 Z "
        + "M8.5 13 L10.5 14 M15.5 13 L13.5 14 M10 17.5 H14"
};

/* Die Wertung als Schachfiguren — gefüllt gezeichnet (Entwurf `FIGUREN`):
   Bauer = gewonnen, Springer = genau, König = sehr genau. */
const START_TURM_FIGUREN = [
    "M12 3.5 A3.2 3.2 0 1 1 11.99 3.5 Z M9 11 H15 L14 12.5 L16.5 18 H7.5 L10 12.5 Z M6 19 H18 V21.5 H6 Z",
    "M7 21.5 H18.5 V19 H17.2 C17.4 14.5 18.2 10.5 15.8 6.8 C14.3 4.4 11.8 3.2 9.6 3.6 L10.6 5.2 "
        + "C9.3 5.8 6.9 8 5.5 10.2 L6.4 12.3 L9.2 11.4 L11.3 10.4 C10.2 13 8.3 15 8.4 19 H7 Z",
    "M11 1.5 H13 V3.5 H15 V5.5 H13 V7.5 H11 V5.5 H9 V3.5 H11 Z M7.5 9 C9 8 15 8 16.5 9 L15 17.5 H9 Z "
        + "M6 18.5 H18 V21.5 H6 Z"
];

Object.assign(START, {

    ART_SCHLUESSEL: "blunderluck.start-art",
    GESEHEN_SCHLUESSEL: "blunderluck.turm-gesehen",

    ARTEN: [
        { id: "turm", name: "Turm" },
        { id: "frei", name: "Frei" }
    ],

    /* Anzeige-Gedächtnis: Art-Wahl offen? Welcher Ort wird angesehen
       (0 = der eigene)? In welche Richtung wurde zuletzt geblättert? */
    artMenueOffen: false,
    turmBlick: 0,
    _turmRichtung: 0,
    _artHorcherAktiv: false,

    /* Die gemerkte Art; ohne Wahl der Turm (Entwurf: „Start-Tab = Turm"). */
    art() {
        try {
            const wert = window.localStorage.getItem(START.ART_SCHLUESSEL);
            if (START.ARTEN.some((eintrag) => eintrag.id === wert)) {
                return wert;
            }
        } catch (fehler) {
            /* ohne Gerätespeicher: die Vorgabe */
        }
        return "turm";
    },

    artSetzen(id) {
        try {
            window.localStorage.setItem(START.ART_SCHLUESSEL, id);
        } catch (fehler) {
            /* dann gilt die Wahl bis zum Neuladen nicht — hinnehmbar */
        }
        START.artMenueOffen = false;
        START.turmBlick = 0;
        START._zeichnen();
    },

    /* Ein Zeichen als SVG. `gefuellt` für die Figuren. */
    _turmSvg(pfad, klasse, gefuellt) {
        const ns = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(ns, "svg");
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("aria-hidden", "true");
        svg.setAttribute("class", klasse || "turm-zeichen");
        const weg = document.createElementNS(ns, "path");
        weg.setAttribute("d", pfad);
        if (gefuellt) {
            weg.setAttribute("fill", "currentColor");
        } else {
            weg.setAttribute("fill", "none");
            weg.setAttribute("stroke", "currentColor");
            weg.setAttribute("stroke-width", "2");
            weg.setAttribute("stroke-linecap", "round");
            weg.setAttribute("stroke-linejoin", "round");
        }
        svg.appendChild(weg);
        return svg;
    },

    /* Drei kleine Figuren; die ersten `anzahl` leuchten. */
    _figurenBauen(anzahl, klasse) {
        const reihe = document.createElement("span");
        reihe.className = "turm-figuren" + (klasse ? " " + klasse : "");
        reihe.setAttribute("aria-label", anzahl + " von 3 Figuren");
        for (let i = 0; i < 3; i++) {
            const figur = START._turmSvg(START_TURM_FIGUREN[i], "turm-figur" + (i < anzahl ? " an" : ""), true);
            reihe.appendChild(figur);
        }
        return reihe;
    },

    /* ---------------------------------------------------------------- *
     * Das Quadrat neben „Spielen": die Wahl der Art
     * ---------------------------------------------------------------- */

    _artKnopfBauen() {
        const halter = document.createElement("div");
        halter.className = "start-art-halter";
        halter.dataset.startArt = "1";

        const art = START.art();
        const knopf = document.createElement("button");
        knopf.type = "button";
        knopf.className = "knopf knopf-still start-match start-art-knopf";
        knopf.setAttribute("aria-label", "Art wählen · " + (art === "turm" ? "Turm" : "Frei"));
        knopf.setAttribute("aria-haspopup", "true");
        knopf.setAttribute("aria-expanded", START.artMenueOffen ? "true" : "false");
        knopf.appendChild(START._turmSvg(START_TURM_ZEICHEN[art], "turm-zeichen start-art-zeichen"));
        knopf.appendChild(START._turmSvg(START_TURM_ZEICHEN.auf, "turm-zeichen start-art-pfeil"));
        knopf.addEventListener("click", () => {
            START.artMenueOffen = !START.artMenueOffen;
            START._zeichnen();
        });
        halter.appendChild(knopf);

        if (START.artMenueOffen) {
            const menue = document.createElement("div");
            menue.className = "start-art-menue";
            menue.setAttribute("role", "menu");
            for (const eintrag of START.ARTEN) {
                const punkt = document.createElement("button");
                punkt.type = "button";
                punkt.className = "start-art-eintrag";
                punkt.setAttribute("role", "menuitemradio");
                punkt.setAttribute("aria-checked", eintrag.id === art ? "true" : "false");
                punkt.appendChild(START._turmSvg(START_TURM_ZEICHEN[eintrag.id], "turm-zeichen"));
                const name = document.createElement("span");
                name.textContent = eintrag.name;
                punkt.appendChild(name);
                if (eintrag.id === art) {
                    punkt.appendChild(START._turmSvg(START_TURM_ZEICHEN.haken, "turm-zeichen start-art-haken"));
                }
                punkt.addEventListener("click", () => START.artSetzen(eintrag.id));
                menue.appendChild(punkt);
            }
            halter.appendChild(menue);
            START._artHorcherAnmelden();
        }
        return halter;
    },

    /* Ein Tipp daneben klappt die Wahl zu — dasselbe Muster wie das
       Menüband oben rechts (`_menueHorcherAktiv`). */
    _artHorcherAnmelden() {
        if (START._artHorcherAktiv || typeof document === "undefined"
                || typeof document.addEventListener !== "function") {
            return;
        }
        START._artHorcherAktiv = true;
        const horcher = (ereignis) => {
            const ziel = ereignis.target;
            if (ziel && typeof ziel.closest === "function" && ziel.closest("[data-start-art]")) {
                return;
            }
            document.removeEventListener("click", horcher, true);
            START._artHorcherAktiv = false;
            if (START.artMenueOffen) {
                START.artMenueOffen = false;
                START._zeichnen();
            }
        };
        document.addEventListener("click", horcher, true);
    },

    /* ---------------------------------------------------------------- *
     * Der Weg durch das Stockwerk
     * ---------------------------------------------------------------- */

    /* Die Lage der Punkte (in Prozent der Weg-Fläche), Stufe 1 unten. */
    WEG_X: [30, 62, 78, 58, 32, 54],

    _wegY(i, n) {
        return 88 - i * (62 / Math.max(1, n - 1));
    },

    /* Der Stand: Figuren-Tabelle und erreichter Ort. */
    _turmStand() {
        const figuren = (typeof FORTSCHRITT_KONTO !== "undefined") ? FORTSCHRITT_KONTO.turmFiguren() : {};
        return { figuren: figuren, ort: TURM.erreicht(figuren) };
    },

    _turmKarteBauen() {
        const stand = START._turmStand();
        const anzahl = TURM.anzahlOrte();
        const eigener = Math.min(stand.ort, anzahl);
        const nr = Math.min(Math.max(START.turmBlick || eigener, 1), anzahl);
        const ort = TURM.ort(nr);
        const zustand = (nr < stand.ort) ? "fertig" : (nr === stand.ort ? "jetzt" : "zu");

        const karte = document.createElement("div");
        karte.className = "turm-karte turm-ort-" + nr + " turm-" + zustand
            + (START._turmRichtung > 0 ? " turm-rein-oben" : (START._turmRichtung < 0 ? " turm-rein-unten" : ""));
        START._turmRichtung = 0;

        /* Oben der Name des Orts — antippen erklärt ihn. */
        const kopf = document.createElement("div");
        kopf.className = "turm-kopf";
        const name = document.createElement("button");
        name.type = "button";
        name.className = "turm-ortname";
        const nummer = document.createElement("span");
        nummer.className = "turm-ort-nr";
        nummer.textContent = String(nr);
        name.appendChild(nummer);
        const titel = document.createElement("b");
        titel.textContent = ort.name;
        name.appendChild(titel);
        name.addEventListener("click", () => START._ortErklaeren(nr));
        kopf.appendChild(name);
        const summe = TURM.summe(stand.figuren, nr);
        const zahl = document.createElement("span");
        zahl.className = "turm-summe";
        zahl.appendChild(START._turmSvg(START_TURM_FIGUREN[0], "turm-zeichen turm-summe-figur", true));
        zahl.appendChild(document.createTextNode(summe.hat + "/" + summe.alle));
        kopf.appendChild(zahl);
        karte.appendChild(kopf);

        karte.appendChild(START._wegBauen(nr, stand, zustand));
        karte.appendChild(START._blaetternBauen(nr, eigener, anzahl));

        if (nr !== eigener) {
            const zuDir = document.createElement("button");
            zuDir.type = "button";
            zuDir.className = "knopf knopf-still knopf-klein turm-zu-dir";
            zuDir.textContent = "Zu dir";
            zuDir.addEventListener("click", () => START._turmBlicken(0, nr > eigener ? -1 : 1));
            karte.appendChild(zuDir);
        }
        return karte;
    },

    _wegBauen(nr, stand, zustand) {
        const ort = TURM.ort(nr);
        const n = ort.stufen.length;
        const weg = document.createElement("div");
        weg.className = "turm-weg";

        /* Die Linie: grau der ganze Weg bis zur Tür, farbig bis zum
           erreichten Punkt. */
        const naechste = (zustand === "jetzt") ? TURM.naechste(stand.figuren, nr) : -1;
        const tuerOffen = TURM.tuerOffen(stand.figuren, nr);
        const punkte = [];
        for (let i = 0; i < n; i++) {
            punkte.push(START.WEG_X[i] + "," + START._wegY(i, n).toFixed(1));
        }
        punkte.push("50,9");
        let bis = 0;
        if (zustand === "fertig") {
            bis = n + 1;
        } else if (zustand === "jetzt") {
            bis = (naechste === -1) ? n : naechste + 1;
            if (tuerOffen) {
                bis = n + 1;
            }
        }
        const ns = "http://www.w3.org/2000/svg";
        const linien = document.createElementNS(ns, "svg");
        linien.setAttribute("class", "turm-linien");
        linien.setAttribute("viewBox", "0 0 100 100");
        linien.setAttribute("preserveAspectRatio", "none");
        linien.setAttribute("aria-hidden", "true");
        const grau = document.createElementNS(ns, "polyline");
        grau.setAttribute("class", "turm-linie");
        grau.setAttribute("points", punkte.join(" "));
        linien.appendChild(grau);
        if (bis > 1) {
            const farbig = document.createElementNS(ns, "polyline");
            farbig.setAttribute("class", "turm-linie turm-linie-fertig");
            farbig.setAttribute("points", punkte.slice(0, bis).join(" "));
            linien.appendChild(farbig);
        }
        weg.appendChild(linien);

        for (let i = 0; i < n; i++) {
            weg.appendChild(START._punktBauen(nr, i, n, stand, zustand, naechste));
        }

        /* Die Tür oben: offen, wenn der Boss besiegt ist. */
        const tuer = document.createElement("button");
        tuer.type = "button";
        tuer.className = "turm-punkt turm-tuer" + (tuerOffen ? " offen" : "");
        tuer.style.left = "50%";
        tuer.style.top = "9%";
        tuer.setAttribute("aria-label", tuerOffen ? "Tür offen · nächster Ort" : "Tür · erst den Boss besiegen");
        const kreis = document.createElement("span");
        kreis.className = "turm-kreis";
        kreis.appendChild(START._turmSvg(tuerOffen ? START_TURM_ZEICHEN.tuer : START_TURM_ZEICHEN.schloss, "turm-zeichen"));
        tuer.appendChild(kreis);
        tuer.addEventListener("click", () => {
            if (tuerOffen && nr < TURM.anzahlOrte()) {
                START._turmBlicken(nr + 1, 1);
            } else if (!tuerOffen) {
                DIALOG.kurzmeldung("Erst den Boss besiegen");
            } else {
                DIALOG.kurzmeldung("Ganz oben");
            }
        });
        weg.appendChild(tuer);

        if (zustand === "zu") {
            const schloss = document.createElement("div");
            schloss.className = "turm-schloss";
            schloss.appendChild(START._turmSvg(START_TURM_ZEICHEN.schloss, "turm-zeichen"));
            const text = document.createElement("span");
            text.textContent = "Erst " + TURM.ort(nr - 1).name;
            schloss.appendChild(text);
            weg.appendChild(schloss);
        }
        return weg;
    },

    _punktBauen(nr, i, n, stand, zustand, naechste) {
        const figuren = TURM.figurenVon(stand.figuren, nr, i);
        const boss = TURM.istBoss(nr, i);
        const offen = TURM.offen(stand.figuren, nr, i);
        const art = (i === naechste) ? "jetzt" : (figuren > 0 ? "fertig" : (offen ? "offen" : "zu"));

        const punkt = document.createElement("button");
        punkt.type = "button";
        punkt.className = "turm-punkt turm-punkt-" + art + (boss ? " turm-boss" : "");
        punkt.style.left = START.WEG_X[i] + "%";
        punkt.style.top = START._wegY(i, n).toFixed(1) + "%";
        punkt.setAttribute("aria-label", (boss ? "Boss" : "Stufe " + (i + 1))
            + " · " + figuren + " von 3 Figuren" + (offen ? "" : " · gesperrt"));

        const kreis = document.createElement("span");
        kreis.className = "turm-kreis";
        if (art === "jetzt") {
            kreis.appendChild(START._turmSvg(START_TURM_FIGUREN[0], "turm-zeichen turm-du", true));
        } else if (boss) {
            kreis.appendChild(START._turmSvg(START_TURM_ZEICHEN.boss, "turm-zeichen"));
        } else if (art === "zu") {
            kreis.appendChild(START._turmSvg(START_TURM_ZEICHEN.schloss, "turm-zeichen"));
        } else {
            kreis.textContent = String(i + 1);
        }
        punkt.appendChild(kreis);
        if (art !== "jetzt") {
            punkt.appendChild(START._figurenBauen(figuren));
        }

        punkt.addEventListener("click", () => {
            if (offen && zustand !== "zu") {
                START._vsZeigen(nr, i);
            } else {
                DIALOG.kurzmeldung(boss ? "Erst alle Gegner davor" : "Erst die Stufe davor");
            }
        });
        return punkt;
    },

    /* ▲▼ und ein Punkt je Ort — oben der höchste, der eigene markiert. */
    _blaetternBauen(nr, eigener, anzahl) {
        const leiste = document.createElement("div");
        leiste.className = "turm-blaettern";

        const hoch = document.createElement("button");
        hoch.type = "button";
        hoch.className = "turm-bl";
        hoch.setAttribute("aria-label", "Ort darüber");
        hoch.disabled = nr >= anzahl;
        hoch.appendChild(START._turmSvg(START_TURM_ZEICHEN.auf, "turm-zeichen"));
        hoch.addEventListener("click", () => START._turmBlicken(nr + 1, 1));
        leiste.appendChild(hoch);

        const punkte = document.createElement("span");
        punkte.className = "turm-bl-punkte";
        for (let o = anzahl; o >= 1; o--) {
            const p = document.createElement("i");
            p.className = (o === nr ? "da" : "") + (o === eigener ? " du" : "");
            punkte.appendChild(p);
        }
        leiste.appendChild(punkte);

        const runter = document.createElement("button");
        runter.type = "button";
        runter.className = "turm-bl";
        runter.setAttribute("aria-label", "Ort darunter");
        runter.disabled = nr <= 1;
        runter.appendChild(START._turmSvg(START_TURM_ZEICHEN.ab, "turm-zeichen"));
        runter.addEventListener("click", () => START._turmBlicken(nr - 1, -1));
        leiste.appendChild(runter);
        return leiste;
    },

    /* Zu einem anderen Ort blättern (0 = der eigene); `richtung` +1 hoch,
       −1 runter — der neue Ort gleitet von dort herein. */
    _turmBlicken(nr, richtung) {
        START.turmBlick = nr;
        START._turmRichtung = richtung;
        START._zeichnen();
    },

    /* Was ein Ort ist: Bob, Regel, was er freischaltet — hinter dem Namen. */
    _ortErklaeren(nr) {
        const ort = TURM.ort(nr);
        const frei = START._freiDurch(nr);
        DIALOG.hinweis(nr + " · " + ort.name,
            "Boss: " + ort.bob + "\nStufen: " + ort.stufen.length
                + "\nKönig ab " + ort.schwelle[1] + " % Genauigkeit"
                + (frei.length ? "\nNeu frei: " + frei.join(", ") : ""));
    },

    /* Was mit einem Ort frei wird (für Erklärung und Banner). */
    _freiDurch(nr) {
        const namen = [];
        if (TURM.FREI_AB.dreiD === nr) {
            namen.push("3D-Figuren");
        }
        if (TURM.FREI_AB.brettDreiD === nr) {
            namen.push("3D-Brett");
        }
        const themen = { holz: "Holz", marmor: "Marmor", nacht: "Nacht", turnier: "Turnier" };
        const figuren = { matt: "Matt", porzellan: "Porzellan", metall: "Metall" };
        for (const wert of Object.keys(TURM.FREI_AB.thema)) {
            if (TURM.FREI_AB.thema[wert] === nr) {
                namen.push("Brett " + themen[wert]);
            }
        }
        for (const wert of Object.keys(TURM.FREI_AB.figuren)) {
            if (TURM.FREI_AB.figuren[wert] === nr) {
                namen.push("Figuren " + figuren[wert]);
            }
        }
        return namen;
    },

    /* ---------------------------------------------------------------- *
     * „Spielen" im Turm
     * ---------------------------------------------------------------- */

    /*
     * Was „Spielen" startet: die nächste Stufe im erreichten Ort. Ist oben
     * alles geschafft, die unterste Stufe mit weniger als drei Figuren
     * (nachholen) — und wenn es die nicht gibt, noch einmal der letzte Boss.
     */
    _turmZiel() {
        const stand = START._turmStand();
        const anzahl = TURM.anzahlOrte();
        if (stand.ort <= anzahl) {
            const i = TURM.naechste(stand.figuren, stand.ort);
            if (i >= 0) {
                return { ort: stand.ort, stufe: i };
            }
        }
        for (let nr = 1; nr <= anzahl; nr++) {
            const ort = TURM.ort(nr);
            for (let i = 0; i < ort.stufen.length; i++) {
                if (TURM.figurenVon(stand.figuren, nr, i) < 3 && TURM.offen(stand.figuren, nr, i)) {
                    return { ort: nr, stufe: i };
                }
            }
        }
        return { ort: anzahl, stufe: TURM.ort(anzahl).stufen.length - 1 };
    },

    _turmSpielenText() {
        const ziel = START._turmZiel();
        return TURM.istBoss(ziel.ort, ziel.stufe) ? "Boss" : "Stufe " + (ziel.stufe + 1);
    },

    turmSpielen() {
        const ziel = START._turmZiel();
        START._vsZeigen(ziel.ort, ziel.stufe);
    },

    /*
     * DIE VORSTELLUNG („VS", Entwurf `gegnerIntro`): Der Gegner gleitet von
     * oben herein, man selbst von unten; beim Boss dunkelrot mit „BOSS" und
     * einem kurzen Beben. Erst hier erfährt man, gegen wen es geht.
     */
    _vsZeigen(nr, stufe) {
        if (typeof document === "undefined" || !document.body) {
            return;
        }
        const alt = document.querySelector(".turm-vs");
        if (alt) {
            alt.remove();
        }
        const ort = TURM.ort(nr);
        const gegner = TURM.gegner(nr, stufe);
        const ich = (typeof ICH !== "undefined") ? ICH.person() : null;

        const vs = document.createElement("div");
        vs.className = "turm-vs turm-ort-" + nr + (gegner.boss ? " turm-vs-boss" : "");
        vs.setAttribute("role", "dialog");
        vs.setAttribute("aria-label", "Gegner: " + gegner.name);

        const oben = document.createElement("div");
        oben.className = "turm-vs-oben";
        const lage = document.createElement("span");
        lage.className = "turm-vs-lage";
        lage.textContent = ort.name + " · " + (gegner.boss ? "Boss" : "Stufe " + (stufe + 1) + "/" + ort.stufen.length);
        oben.appendChild(lage);
        if (gegner.boss) {
            const wort = document.createElement("span");
            wort.className = "turm-vs-bosswort";
            wort.textContent = "BOSS";
            oben.appendChild(wort);
        }
        const gesicht = document.createElement("span");
        gesicht.className = "turm-vs-gesicht";
        gesicht.appendChild(START._turmSvg(gegner.boss ? START_TURM_ZEICHEN.boss : START_TURM_ZEICHEN.bob, "turm-zeichen"));
        oben.appendChild(gesicht);
        const name = document.createElement("b");
        name.className = "turm-vs-name";
        name.textContent = gegner.name;
        oben.appendChild(name);
        if (gegner.eigen) {
            const eigen = document.createElement("span");
            eigen.className = "turm-vs-eigen";
            eigen.textContent = gegner.eigen;
            oben.appendChild(eigen);
        }
        vs.appendChild(oben);

        const mitte = document.createElement("div");
        mitte.className = "turm-vs-mitte";
        mitte.textContent = "VS";
        vs.appendChild(mitte);

        const unten = document.createElement("div");
        unten.className = "turm-vs-unten";
        const bild = document.createElement("span");
        bild.className = "visitenkarte-bild turm-vs-ich";
        bild.textContent = ich ? (String(ich.name || "").trim().charAt(0).toUpperCase() || "?") : "?";
        unten.appendChild(bild);
        const meinName = document.createElement("b");
        meinName.textContent = ich ? ich.name : "";
        unten.appendChild(meinName);
        unten.appendChild(START._figurenBauen(TURM.figurenVon(START._turmStand().figuren, nr, stufe), "turm-vs-figuren"));

        const knoepfe = document.createElement("div");
        knoepfe.className = "turm-vs-knoepfe";
        const zurueck = document.createElement("button");
        zurueck.type = "button";
        zurueck.className = "knopf knopf-still";
        zurueck.textContent = "Zurück";
        zurueck.addEventListener("click", () => START._vsSchliessen(vs));
        knoepfe.appendChild(zurueck);
        const los = document.createElement("button");
        los.type = "button";
        los.className = "knopf knopf-haupt turm-vs-los";
        los.textContent = "Los";
        los.addEventListener("click", () => {
            START._vsSchliessen(vs);
            START._turmStarten(nr, stufe);
        });
        knoepfe.appendChild(los);
        unten.appendChild(knoepfe);
        vs.appendChild(unten);

        document.body.appendChild(vs);
        if (typeof FUEHLEN !== "undefined") {
            if (gegner.boss) {
                FUEHLEN.fehler();
            } else {
                FUEHLEN.tippen();
            }
        }
        /* Erst nach dem ersten Bild einblenden, sonst gleitet nichts. Der
           Zeitgeber ist die Rückfallebene, falls kein Bild kommt (Fenster im
           Hintergrund) — dann steht die Vorstellung eben ohne Gleiten da. */
        const zeigen = () => vs.classList.add("da");
        if (typeof requestAnimationFrame === "function") {
            requestAnimationFrame(() => requestAnimationFrame(zeigen));
        }
        window.setTimeout(zeigen, 80);
    },

    _vsSchliessen(vs) {
        vs.classList.remove("da");
        window.setTimeout(() => {
            if (vs.parentNode) {
                vs.parentNode.removeChild(vs);
            }
        }, 260);
    },

    /* Die Partie der Stufe anlegen — derselbe Weg wie „Spielen" in Frei
       (`START.spielen`), nur mit den Regeln der Stufe. */
    async _turmStarten(nr, stufe) {
        if (START.spielenLaeuft) {
            return;
        }
        if (typeof ANMELDUNG !== "undefined" && typeof ANMELDUNG.istOberAdmin === "function"
                && ANMELDUNG.istOberAdmin()) {
            await DIALOG.hinweis("Nicht mit UP#Plus",
                "Verwaltungskonto · spielt nicht · mit Spieler-Konto anmelden");
            return;
        }
        const regeln = TURM.regelnFuer(nr, stufe);
        if (!regeln) {
            return;
        }
        START.spielenLaeuft = true;
        START._zeichnen();
        try {
            return await TEAM_SCHACH.rundeStarten(regeln.spielart, regeln);
        } finally {
            START.spielenLaeuft = false;
            START._zeichnen();
        }
    },

    /* ---------------------------------------------------------------- *
     * Ein neuer Ort (Entwurf `aufstiegWeg`: Banner „Neuer Ort")
     * ---------------------------------------------------------------- */

    /*
     * Einmal je neu erreichtem Ort: ein Banner mit Namen, Boss und dem, was
     * jetzt frei ist. Gemerkt wird auf dem Gerät, bis wohin schon gefeiert
     * wurde — beim allerersten Öffnen ohne Banner (sonst feierte jedes neue
     * Gerät den Ort, in dem man längst ist).
     */
    _neuerOrtPruefen() {
        const ort = Math.min(START._turmStand().ort, TURM.anzahlOrte());
        let gesehen = 0;
        try {
            gesehen = parseInt(window.localStorage.getItem(START.GESEHEN_SCHLUESSEL) || "0", 10) || 0;
            window.localStorage.setItem(START.GESEHEN_SCHLUESSEL, String(Math.max(ort, gesehen)));
        } catch (fehler) {
            return;
        }
        if (gesehen === 0 || ort <= gesehen) {
            return;
        }
        START._bannerZeigen(ort);
    },

    _bannerZeigen(nr) {
        if (typeof document === "undefined" || !document.body) {
            return;
        }
        const ort = TURM.ort(nr);
        const banner = document.createElement("div");
        banner.className = "turm-banner turm-ort-" + nr;
        banner.setAttribute("role", "status");
        const klein = document.createElement("span");
        klein.className = "turm-banner-klein";
        klein.textContent = "Neuer Ort";
        banner.appendChild(klein);
        const name = document.createElement("b");
        name.textContent = nr + " · " + ort.name;
        banner.appendChild(name);
        for (const frei of START._freiDurch(nr)) {
            const chip = document.createElement("span");
            chip.className = "turm-banner-chip";
            chip.textContent = frei;
            banner.appendChild(chip);
        }
        banner.addEventListener("click", () => banner.remove());
        document.body.appendChild(banner);
        if (typeof FUEHLEN !== "undefined") {
            FUEHLEN.erfolg();
        }
        window.setTimeout(() => banner.classList.add("weg"), 2800);
        window.setTimeout(() => banner.remove(), 3300);
    }
});
