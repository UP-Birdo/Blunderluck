/*
 * start-turm.js — der Turm auf dem Startbildschirm (seit v0.147.0; NEU seit
 * v0.160.0 als echter Turm mit mehreren Wegen, Vorlage: der abgenommene
 * Entwurf Design\3D-Schrift\entwuerfe\Oberflaeche-Runde-7\, `wegBauen`,
 * `vollbildOeffnen`, `stationAntippen`).
 *
 * ERGÄNZT das Objekt START (Object.assign) und lädt deshalb NACH start.js.
 * Die Regeln des Turms stehen in js\turm.js, der Stand im Fortschritt
 * (js\fortschritt-konto.js) — hier wird nur gezeichnet und gestartet.
 *
 * WAS DER START IM TURM ZEIGT: oben die VORSCHAU des Turms (ein Ausschnitt um
 * das eigene Stockwerk, nichts darin antippbar), unten wie bisher der feste
 * Knopf-Bereich mit „Spielen" und dem Quadrat der Art (Turm · Frei).
 *   - Vorschau antippen → der Turm im VOLLBILD (bewusste Ausnahme, Nutzer
 *     28.09.2026): Die Kamera fährt vom Tor unten bis zum eigenen Stockwerk.
 *     Unten „Verlassen" und „Spielen"; an einer KREUZUNG stehen dort die Wege
 *     („links", „Mitte", „rechts") und oben „Wo lang?". Jede Station lässt
 *     sich antippen (Karte mit allem, was dort wartet); ziehen oder das
 *     Mausrad sieht sich um, der Kreis-Knopf springt zurück.
 *   - Nach einer Partie an einer Kreuzung geht der Turm VON SELBST auf und
 *     fragt „Wo lang?" (Nutzer 28.09.2026).
 *   - Der Turm ist ein Turm: Steine, Stockwerke mit Boden, Fenster (hell, wo
 *     man schon war), flackernde Fackeln, Stärke je Stockwerk, oben Zinnen,
 *     Fahne und Tür (leuchtet, sobald der Boss besiegt ist), Himmel mit Tiefe.
 *     Der weiße Bauer hüpft von Station zu Station, die Kamera fährt mit.
 *   - Eine Partie geht nach der kurzen Vorstellung („VS") SOFORT los — ohne
 *     Vorraum, die Farbe steht vorher fest (Seed, js\turm.js).
 */

/* Die Zeichen dieser Datei (24er-Raster, Strich 2, runde Enden). */
const START_TURM_ZEICHEN = {
    turm: "M5 21 V9 H8 V6 H11 V9 H13 V6 H16 V9 H19 V21 Z M10 21 V16 A2 2 0 0 1 14 16 V21",
    frei: "M4 7 H13 M17 7 H20 M15 5 V9 M4 17 H7 M11 17 H20 M9 15 V19",
    auf: "M6 15 L12 9 L18 15",
    ab: "M6 9 L12 15 L18 9",
    schloss: "M7 11 V8 A5 5 0 0 1 17 8 V11 M5 11 H19 V20 H5 Z",
    tuer: "M6 21 V4 H18 V21 M3 21 H21 M14.5 12.5 H15",
    haken: "M5 12.5 L10 17 L19 7",
    bob: "M6 9 A6 6 0 0 1 18 9 V15 A3 3 0 0 1 15 18 H9 A3 3 0 0 1 6 15 Z M9.5 11.5 H10 M14 11.5 H14.5 M12 3 V1.5",
    gegner: "M12 3.5 A3 3 0 1 1 12 9.5 A3 3 0 1 1 12 3.5 M9.6 10 C9.6 12.8 8.7 14.8 7.6 16.8 H16.4 C15.3 14.8 14.4 12.8 14.4 10 M6 20.5 H18 V17.5 H6 Z",
    elite: "M4 4.5 L8.5 8 H15.5 L20 4.5 V12 C20 17 16.5 20 12 20 C7.5 20 4 17 4 12 Z M7.5 12 L10.5 13 M16.5 12 L13.5 13 M10 16.5 H14",
    rast: "M5 20.5 L19 16.5 M5 16.5 L19 20.5 M12 14.5 C8.8 12.8 9.2 9.2 12 4 C14.8 9.2 15.2 12.8 12 14.5 Z",
    truhe: "M3 11 H21 V20 H3 Z M3 11 V8.5 A3.5 3.5 0 0 1 6.5 5 H17.5 A3.5 3.5 0 0 1 21 8.5 V11 M11 13 H13 V16 H11 Z",
    haendler: "M5 8 H19 L18 20.5 H6 Z M9 8 V6.5 A3 3 0 0 1 15 6.5 V8 M9.5 12.5 H14.5",
    fund: "M12 4 V20 M8 20 H16 M5 7 H19 M5 7 L2.5 13 H7.5 Z M19 7 L16.5 13 H21.5 Z",
    boss: "M5 9.5 L6.5 4 L9.5 7 L12 3 L14.5 7 L17.5 4 L19 9.5 M5 9.5 H19 V13 C19 17.5 16 20.5 12 20.5 C8 20.5 5 17.5 5 13 Z M8.5 13.5 L10.5 14 M15.5 13.5 L13.5 14",
    herz: "M12 20 C6 15 3 12 3 8.5 A4.5 4.5 0 0 1 12 6 A4.5 4.5 0 0 1 21 8.5 C21 12 18 15 12 20 Z",
    ziel: "M12 3 A9 9 0 1 1 12 21 A9 9 0 1 1 12 3 M12 8 A4 4 0 1 1 12 16 A4 4 0 1 1 12 8",
    verlassen: "M14 4 H19 V20 H14 M10 8 L6 12 L10 16 M6 12 H15",
    oeffnen: "M4 9 V4 H9 M15 4 H20 V9 M20 15 V20 H15 M9 20 H4 V15",
    spielen: "M7 5 L19 12 L7 19 Z",
    hoch: "M12 20 V5 M6 11 L12 5 L18 11",
    uhr: "M4.5 12 A7.5 7.5 0 1 0 6.7 6.7 L4 9.4 M4 5.4 V9.4 H8 M12 8 V12 L14.5 13.5",
    tipp: "M9 18 H15 M10 21 H14 M12 3 A6 6 0 0 1 16 13.5 C15.2 14.3 15 15 15 16 H9 C9 15 8.8 14.3 8 13.5 A6 6 0 0 1 12 3 Z",
    muenzen: "M12 3 A9 9 0 1 1 12 21 A9 9 0 1 1 12 3 M9 8.5 H14 A2 2 0 0 1 14 12.5 H10 A2 2 0 0 1 10 16.5 H15 M12 6.5 V8.5 M12 16.5 V18",
    rechts: "M9 5 L16 12 L9 19"
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

/* Der weiße Bauer, der durch den Turm hüpft (Entwurf `figurSvg`). */
const START_TURM_BAUER = "M12 2 A4.2 4.2 0 1 1 12 10.4 A4.2 4.2 0 1 1 12 2 Z M8.6 11 C8.6 15 7.2 18 5.8 21 H18.2 "
    + "C16.8 18 15.4 15 15.4 11 Z M4 22.5 H20 V27.5 H4 Z";

Object.assign(START, {

    ART_SCHLUESSEL: "blunderluck.start-art",
    GESEHEN_SCHLUESSEL: "blunderluck.turm-gesehen",

    ARTEN: [
        { id: "turm", name: "Turm" },
        { id: "frei", name: "Frei" }
    ],

    /* Die Zeichen je Station. */
    TURM_ART_ZEICHEN: { g: "gegner", e: "elite", r: "rast", t: "truhe", h: "haendler", f: "fund", b: "boss" },

    /* Anzeige-Gedächtnis: Art-Wahl offen? Das offene Vollbild. */
    artMenueOffen: false,
    _artHorcherAktiv: false,
    _turmVb: null,

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

    _el(tag, klasse, text) {
        const el = document.createElement(tag);
        if (klasse) {
            el.className = klasse;
        }
        if (text !== undefined && text !== null) {
            el.textContent = text;
        }
        return el;
    },

    _knopf(klasse, text, zeichen, beiKlick) {
        const k = START._el("button", "knopf " + klasse);
        k.type = "button";
        if (zeichen) {
            k.appendChild(START._turmSvg(START_TURM_ZEICHEN[zeichen] || zeichen, "turm-zeichen"));
        }
        if (text) {
            k.appendChild(START._el("span", "", text));
        }
        if (beiKlick) {
            k.addEventListener("click", beiKlick);
        }
        return k;
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
     * Der Stand
     * ---------------------------------------------------------------- */

    /* { figuren, ort (erreicht, bis Anzahl + 1), nr (gezeigter Ort), oben,
       lauf } — der Lauf durch den gezeigten Ort. */
    _turmStand() {
        const figuren = (typeof FORTSCHRITT_KONTO !== "undefined") ? FORTSCHRITT_KONTO.turmFiguren() : {};
        const ort = TURM.erreicht(figuren);
        const nr = Math.min(ort, TURM.anzahlOrte());
        const lauf = (typeof FORTSCHRITT_KONTO !== "undefined" && typeof FORTSCHRITT_KONTO.turmLauf === "function")
            ? FORTSCHRITT_KONTO.turmLauf(nr)
            : TURM.lauf(nr, { figuren: figuren });
        return { figuren: figuren, ort: ort, nr: nr, oben: ort > TURM.anzahlOrte(), lauf: lauf };
    },

    /* Die Kopfzeile: Nummer, Name, Stockwerk, Herzen, „Boss in N". */
    _turmKopfBauen(stand, mitErklaerung) {
        const lauf = stand.lauf;
        const ort = TURM.ort(stand.nr);
        const k = lauf.plan.knotenVon(lauf.pos);
        const kopf = START._el("div", "turm-kopf");
        const name = START._el(mitErklaerung ? "button" : "span", "turm-ortname");
        if (mitErklaerung) {
            name.type = "button";
            name.addEventListener("click", () => START._ortErklaeren(stand.nr));
        }
        name.appendChild(START._el("span", "turm-ort-nr", String(stand.nr)));
        const titel = START._el("span", "turm-titel");
        titel.appendChild(START._el("b", "", ort.name));
        titel.appendChild(START._el("small", "", lauf.geschafft
            ? "Geschafft" : "Stockwerk " + Math.max(1, k.f) + " von " + lauf.plan.stock));
        name.appendChild(titel);
        kopf.appendChild(name);

        if (lauf.herzen === null) {
            kopf.appendChild(START._el("span", "turm-herzen aus", "ohne Herzen"));
        } else {
            const herzen = START._el("span", "turm-herzen");
            herzen.setAttribute("aria-label", lauf.herzen + " von " + TURM.HERZEN + " Herzen");
            for (let i = 0; i < TURM.HERZEN; i++) {
                herzen.appendChild(START._turmSvg(START_TURM_ZEICHEN.herz, "turm-herz" + (i < lauf.herzen ? " an" : ""), true));
            }
            kopf.appendChild(herzen);
        }
        const bossIn = lauf.geschafft ? 0 : lauf.plan.stock - Math.max(0, k.f);
        const boss = START._el("span", "turm-boss-in");
        boss.setAttribute("aria-label", "Boss in " + bossIn + " Stockwerken");
        boss.appendChild(START._turmSvg(START_TURM_ZEICHEN.boss, "turm-zeichen"));
        boss.appendChild(document.createTextNode(String(bossIn)));
        kopf.appendChild(boss);
        return kopf;
    },

    /* ---------------------------------------------------------------- *
     * Die Vorschau auf dem Start
     * ---------------------------------------------------------------- */

    _turmKarteBauen() {
        const stand = START._turmStand();
        const karte = START._el("div", "turm-karte turm-ort-" + stand.nr);
        karte.setAttribute("role", "button");
        karte.tabIndex = 0;
        karte.setAttribute("aria-label", "Turm öffnen");
        karte.appendChild(START._turmKopfBauen(stand, false));
        const sicht = START._el("div", "turm-sicht turm-sicht-klein");
        sicht.setAttribute("aria-hidden", "true");
        karte.appendChild(sicht);
        const chip = START._el("span", "turm-oeffnen-chip");
        chip.appendChild(START._turmSvg(START_TURM_ZEICHEN.oeffnen, "turm-zeichen"));
        chip.appendChild(START._el("span", "", stand.oben ? "Ganz oben" : "Turm öffnen"));
        karte.appendChild(chip);
        karte.addEventListener("click", () => START.turmOeffnen({}));
        karte.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                START.turmOeffnen({});
            }
        });
        /* Erst im Dokument messen (Höhe der Sicht) — nach dem Einhängen. */
        const zeichnen = () => START._turmSichtBauen(sicht, stand, { klein: true });
        if (typeof requestAnimationFrame === "function") {
            requestAnimationFrame(zeichnen);
        }
        zeichnen();
        return karte;
    },

    /* ---------------------------------------------------------------- *
     * Der Turm als Bild (Vorschau und Vollbild, Entwurf `wegBauen`)
     * ---------------------------------------------------------------- */

    _turmMasse(klein) {
        return klein ? { H: 64, G: 50, R: 92 } : { H: 100, G: 72, R: 104 };
    },

    _turmLage(plan, k, m) {
        const sp = plan.spuren;
        const x = (k.x === "e" || k.x === "b") ? 50 : (sp === 3 ? [22, 50, 78][k.x] : [32, 68][k.x]);
        const y = k.f === 0 ? m.G * 0.42 : m.G + (k.f - 1) * m.H + m.H * 0.5;
        return { x: x, y: y };
    },

    /* Was von hier aus noch erreichbar ist (für „möglich" und „vorbei"). */
    _turmErreichbar(lauf) {
        const menge = {};
        let rand = lauf.front.slice();
        while (rand.length) {
            const neu = [];
            for (const id of rand) {
                if (!menge[id]) {
                    menge[id] = true;
                    neu.push.apply(neu, lauf.plan.nach(id));
                }
            }
            rand = neu;
        }
        return menge;
    },

    /* Ein Element mit Klasse und Lage (Stil-Eigenschaften einzeln). */
    _turmTeil(tag, klasse, stil) {
        const el = document.createElement(tag);
        el.className = klasse;
        for (const k of Object.keys(stil || {})) {
            el.style.setProperty(k, stil[k]);
        }
        return el;
    },

    /*
     * Baut den Turm in `sicht` und gibt die Kamera-Steuerung zurück
     * ({ zuDir(sofort), aufsteigen(), zu(id) }). Kamera = die Welt wird
     * verschoben; der Himmel fährt mit 35 % mit (Tiefe). Alles über
     * createElement (nie als Text eingesetzt, test-syntax.js).
     */
    _turmSichtBauen(sicht, stand, opt) {
        const o = opt || {};
        const lauf = stand.lauf;
        const plan = lauf.plan;
        const m = START._turmMasse(o.klein);
        const S = plan.stock;
        const hoehe = m.G + S * m.H + m.R;
        const fertig = {};
        for (const id of lauf.verlauf) {
            fertig[id] = true;
        }
        const vorne = {};
        for (const id of lauf.front) {
            vorne[id] = true;
        }
        const erreich = START._turmErreichbar(lauf);
        const posK = plan.knotenVon(lauf.pos);
        const teil = START._turmTeil;
        const ns = "http://www.w3.org/2000/svg";

        sicht.innerHTML = "";
        sicht.style.setProperty("--turm-h", m.H + "px");
        const himmel = teil("div", "turm-himmel");
        himmel.appendChild(teil("i", "turm-wolke", { top: "22%" }));
        himmel.appendChild(teil("i", "turm-wolke", { top: "58%", "animation-delay": "-19s" }));
        sicht.appendChild(himmel);
        const welt = teil("div", "turm-welt", { height: hoehe + "px" });
        sicht.appendChild(welt);
        welt.appendChild(teil("div", "turm-boden", { height: m.G + "px" }));
        welt.appendChild(teil("div", "turm-tor"));

        /* Die Stockwerke mit Stärke, Fenstern und Fackeln. */
        const kz = TURM.kennzahlen(plan).staerke;
        const koerper = teil("div", "turm-koerper", { bottom: m.G + "px", height: (S * m.H) + "px" });
        for (let f = 1; f <= S; f++) {
            const hell = lauf.geschafft || f <= posK.f;
            const stock = teil("div", "turm-stock" + (hell ? " hell" : ""), { bottom: ((f - 1) * m.H) + "px", height: m.H + "px" });
            stock.appendChild(START._el("span", "turm-st-nr", String(f)));
            const pips = START._el("span", "turm-st-staerke");
            pips.title = "Stärke " + kz[f - 1];
            for (let i = 0; i < 5; i++) {
                pips.appendChild(START._el("i", i < Math.ceil(kz[f - 1] / 2) ? "an" : ""));
            }
            stock.appendChild(pips);
            const deko = (f % 2) ? "turm-fenster" : "turm-fackel";
            stock.appendChild(START._el("i", deko + " l"));
            stock.appendChild(START._el("i", deko + " r"));
            koerper.appendChild(stock);
        }
        welt.appendChild(koerper);

        const dach = teil("div", "turm-dach", { bottom: (m.G + S * m.H) + "px" });
        dach.appendChild(START._el("i", "turm-fahne-stab"));
        dach.appendChild(START._el("i", "turm-fahne"));
        dach.appendChild(START._el("div", "turm-zinnen"));
        dach.appendChild(START._el("i", "turm-dach-tuer" + (lauf.geschafft ? " offen" : "")));
        welt.appendChild(dach);

        /* Linien: gegangen (voll), offen (gestrichelt), vorbei (blass). */
        const pfade = document.createElementNS(ns, "svg");
        pfade.setAttribute("class", "turm-pfade");
        pfade.setAttribute("viewBox", "0 0 100 " + hoehe);
        pfade.setAttribute("preserveAspectRatio", "none");
        pfade.setAttribute("aria-hidden", "true");
        const rang = { blass: 0, offen: 1, weg: 2 };
        plan.kanten.map(([a, b]) => {
            const A = START._turmLage(plan, plan.knotenVon(a), m);
            const B = START._turmLage(plan, plan.knotenVon(b), m);
            const art = (fertig[a] && fertig[b]) ? "weg"
                : ((a === lauf.pos && vorne[b]) || (erreich[a] && erreich[b])) ? "offen" : "blass";
            const y1 = hoehe - A.y;
            const y2 = hoehe - B.y;
            const ym = (y1 + y2) / 2;
            return { art: art, d: "M" + A.x + " " + y1 + " C" + A.x + " " + ym + " " + B.x + " " + ym + " " + B.x + " " + y2 };
        }).sort((p, q) => rang[p.art] - rang[q.art]).forEach((l) => {
            const weg = document.createElementNS(ns, "path");
            weg.setAttribute("class", "turm-pf turm-pf-" + l.art);
            weg.setAttribute("d", l.d);
            weg.setAttribute("vector-effect", "non-scaling-stroke");
            pfade.appendChild(weg);
        });
        welt.appendChild(pfade);

        /* Die Stationen (in der Vorschau nur Bild, im Vollbild Knöpfe). */
        for (const k of plan.knoten) {
            const p = START._turmLage(plan, k, m);
            const zst = k.art === "ein" ? "fertig"
                : fertig[k.id] ? "fertig" : vorne[k.id] ? "naechste" : erreich[k.id] ? "moeglich" : "vorbei";
            const kn = teil(o.klein ? "span" : "button", "turm-kn art-" + k.art + " " + zst
                + (lauf.uebernommen(k.id) ? " alt" : ""), { left: p.x + "%", bottom: p.y + "px" });
            if (!o.klein) {
                kn.type = "button";
                kn.setAttribute("aria-label", TURM.ARTEN[k.art].name + (k.art === "ein" ? "" : " · Stockwerk " + k.f));
            }
            kn.dataset.kn = k.id;
            if (k.art !== "ein") {
                kn.appendChild(START._turmSvg(START_TURM_ZEICHEN[START.TURM_ART_ZEICHEN[k.art]], "turm-zeichen"));
            }
            if (lauf.cp === k.id && k.id !== "0-e") {
                const cp = START._el("span", "turm-cp");
                cp.title = "Rückfall-Punkt";
                kn.appendChild(cp);
            }
            if (k.art === "b" && !lauf.geschafft) {
                const schloss = START._el("span", "turm-kn-schloss");
                schloss.appendChild(START._turmSvg(START_TURM_ZEICHEN.schloss, "turm-zeichen"));
                kn.appendChild(schloss);
            }
            welt.appendChild(kn);
        }

        /* Der weiße Bauer. */
        const fp = START._turmLage(plan, posK, m);
        const bauer = teil("div", "turm-bauer", { left: fp.x + "%", bottom: (fp.y + (posK.art === "ein" ? 8 : 20)) + "px" });
        if (!o.klein) {
            bauer.dataset.turmFigur = "1";
        }
        const bild = document.createElementNS(ns, "svg");
        bild.setAttribute("viewBox", "0 0 24 30");
        bild.setAttribute("aria-hidden", "true");
        const umriss = document.createElementNS(ns, "path");
        umriss.setAttribute("d", START_TURM_BAUER);
        bild.appendChild(umriss);
        bauer.appendChild(bild);
        welt.appendChild(bauer);

        let versatz = 0;
        const grenze = () => Math.max(0, hoehe - sicht.clientHeight);
        const setzen = (wert, sofort) => {
            versatz = Math.max(0, Math.min(grenze(), wert));
            sicht.classList.toggle("sofort", !!sofort);
            welt.style.transform = "translateY(" + versatz + "px)";
            himmel.style.transform = "translateY(" + (versatz * 0.35) + "px)";
            if (sofort) {
                void sicht.offsetHeight;
                sicht.classList.remove("sofort");
            }
        };
        const zielVon = (id) => START._turmLage(plan, plan.knotenVon(id), m).y - sicht.clientHeight * (o.klein ? 0.34 : 0.3);
        const api = {
            zuDir(sofort) {
                setzen(zielVon(lauf.pos), sofort);
            },
            zu(id) {
                setzen(zielVon(id), false);
            },
            aufsteigen() {
                setzen(0, true);
                const los = () => {
                    sicht.style.setProperty("--turm-fahrt", "1500ms");
                    api.zuDir(false);
                    window.setTimeout(() => sicht.style.removeProperty("--turm-fahrt"), 1600);
                };
                if (typeof requestAnimationFrame === "function") {
                    requestAnimationFrame(() => requestAnimationFrame(los));
                } else {
                    los();
                }
            }
        };
        if (o.aufsteigen) {
            api.aufsteigen();
        } else {
            api.zuDir(true);
        }

        if (!o.klein) {
            /* Umsehen: ziehen oder Rad. Antippen einer Station → ihre Karte. */
            let y0 = null;
            let v0 = 0;
            let gezogen = false;
            sicht.onpointerdown = (e) => {
                y0 = e.clientY;
                v0 = versatz;
                gezogen = false;
            };
            sicht.onpointermove = (e) => {
                if (y0 === null) {
                    return;
                }
                const d = e.clientY - y0;
                if (Math.abs(d) > 6) {
                    gezogen = true;
                    sicht.classList.add("ziehen");
                    setzen(v0 + d, true);
                }
            };
            const ende = () => {
                y0 = null;
                sicht.classList.remove("ziehen");
            };
            sicht.onpointerup = ende;
            sicht.onpointercancel = ende;
            sicht.onpointerleave = ende;
            sicht.onwheel = (e) => {
                e.preventDefault();
                sicht.classList.add("ziehen");
                setzen(versatz - e.deltaY, true);
                sicht.classList.remove("ziehen");
            };
            sicht.onclick = (e) => {
                if (gezogen) {
                    gezogen = false;
                    return;
                }
                const b = e.target.closest("[data-kn]");
                if (b) {
                    START._stationAntippen(b.dataset.kn);
                }
            };
        }
        return api;
    },

    /* ---------------------------------------------------------------- *
     * Das Vollbild (bewusste Ausnahme: der Turm groß)
     * ---------------------------------------------------------------- */

    /* `opt`: { frage: „Wo lang?" zeigen, ohneAufstieg: Kamera gleich beim
       eigenen Stockwerk }. */
    turmOeffnen(opt) {
        if (typeof document === "undefined" || !document.body) {
            return;
        }
        const o = opt || {};
        START.turmSchliessen(true);
        const stand = START._turmStand();
        const vb = START._el("div", "turm-vollbild turm-ort-" + stand.nr);
        vb.setAttribute("role", "dialog");
        vb.setAttribute("aria-label", "Turm · " + TURM.ort(stand.nr).name);
        vb.appendChild(START._el("div", "turm-vb-kopf"));
        const sicht = START._el("div", "turm-sicht");
        vb.appendChild(sicht);
        const werkzeug = START._el("div", "turm-vb-werkzeug");
        const zuDir = START._knopf("knopf-still turm-rund", "", "ziel", () => {
            if (START._turmVb && START._turmVb.weg) {
                START._turmVb.weg.zuDir(false);
            }
        });
        zuDir.setAttribute("aria-label", "Zu dir");
        werkzeug.appendChild(zuDir);
        vb.appendChild(werkzeug);
        const frage = START._el("div", "turm-wo-lang", "Wo lang?");
        frage.hidden = true;
        vb.appendChild(frage);
        vb.appendChild(START._el("div", "turm-vb-fuss"));
        document.body.appendChild(vb);
        document.body.classList.add("turm-vb-offen");
        START._turmVb = { el: vb, frage: !!o.frage, weg: null };
        START._turmVbZeichnen(!o.ohneAufstieg, false);
        const esc = (e) => {
            if (e.key === "Escape" && START._turmVb && (typeof UPCREW_BLATT === "undefined" || !UPCREW_BLATT.anzahl
                    || UPCREW_BLATT.anzahl() === 0)) {
                START.turmSchliessen();
            }
        };
        START._turmVb.esc = esc;
        document.addEventListener("keydown", esc);
    },

    turmSchliessen(still) {
        const vb = START._turmVb;
        if (!vb) {
            return;
        }
        START._turmVb = null;
        document.removeEventListener("keydown", vb.esc);
        if (vb.el.parentNode) {
            vb.el.parentNode.removeChild(vb.el);
        }
        document.body.classList.remove("turm-vb-offen");
        if (!still) {
            START._zeichnen();
        }
    },

    /* Kopf, Turm und Fuss neu. `aufsteigen` = Kamerafahrt vom Tor; `hopp` =
       der Bauer springt von seiner alten Station zur neuen. */
    _turmVbZeichnen(aufsteigen, hopp) {
        const vb = START._turmVb;
        if (!vb) {
            return;
        }
        const stand = START._turmStand();
        const kopf = vb.el.querySelector(".turm-vb-kopf");
        kopf.innerHTML = "";
        kopf.appendChild(START._turmKopfBauen(stand, true));
        const sicht = vb.el.querySelector(".turm-sicht");
        const altFigur = sicht.querySelector("[data-turm-figur]");
        const alt = altFigur ? { left: altFigur.style.left, bottom: altFigur.style.bottom } : null;
        vb.weg = START._turmSichtBauen(sicht, stand, { aufsteigen: aufsteigen });
        const figur = sicht.querySelector("[data-turm-figur]");
        if (hopp && alt && figur) {
            const neu = { left: figur.style.left, bottom: figur.style.bottom };
            figur.style.transition = "none";
            figur.style.left = alt.left;
            figur.style.bottom = alt.bottom;
            void figur.offsetHeight;
            figur.style.transition = "";
            const springen = () => {
                figur.classList.add("hopp");
                figur.style.left = neu.left;
                figur.style.bottom = neu.bottom;
            };
            if (typeof requestAnimationFrame === "function") {
                requestAnimationFrame(springen);
            } else {
                springen();
            }
        }
        START._turmFussBauen(stand);
    },

    /* Die Seite eines Wegs an der Kreuzung. */
    _turmSeite(plan, id) {
        const k = plan.knotenVon(id);
        return plan.spuren === 3 ? ["links", "Mitte", "rechts"][k.x] : ["links", "rechts"][k.x];
    },

    _turmFussBauen(stand) {
        const vb = START._turmVb;
        const fuss = vb.el.querySelector(".turm-vb-fuss");
        fuss.innerHTML = "";
        const lauf = stand.lauf;
        /* An einer Kreuzung braucht die Wahl den Platz: „Verlassen" dann nur als Zeichen. */
        const eng = !stand.oben && !lauf.geschafft && lauf.front.length > 1;
        const verlassen = START._knopf("knopf-still turm-verlassen", eng ? "" : "Verlassen", "verlassen", () => START.turmSchliessen());
        verlassen.setAttribute("aria-label", "Verlassen");
        fuss.appendChild(verlassen);
        if (stand.oben || lauf.geschafft) {
            const text = stand.oben ? "Ganz oben" : "Nächster Ort";
            const k = START._knopf("knopf-haupt turm-vb-spielen", text, "hoch", () => {
                if (stand.oben) {
                    DIALOG.kurzmeldung("Ganz oben");
                } else {
                    START._turmVbZeichnen(true, false);
                }
            });
            fuss.appendChild(k);
        } else if (lauf.front.length > 1) {
            const reihe = START._el("div", "turm-wahl-reihe");
            for (const id of lauf.front) {
                const k = lauf.plan.knotenVon(id);
                const b = START._knopf("knopf-haupt", START._turmSeite(lauf.plan, id), START.TURM_ART_ZEICHEN[k.art],
                    () => START._stationAntippen(id));
                b.setAttribute("aria-label", START._turmSeite(lauf.plan, id) + " · " + TURM.ARTEN[k.art].name);
                b.addEventListener("pointerenter", () => vb.weg && vb.weg.zu(id));
                reihe.appendChild(b);
            }
            fuss.appendChild(reihe);
        } else if (lauf.front.length === 1) {
            const id = lauf.front[0];
            const k = lauf.plan.knotenVon(id);
            fuss.appendChild(START._knopf("knopf-haupt turm-vb-spielen", TURM.istKampf(k.art) ? "Spielen" : TURM.ARTEN[k.art].name,
                START.TURM_ART_ZEICHEN[k.art], () => START._stationAntippen(id)));
        }
        const frage = vb.el.querySelector(".turm-wo-lang");
        frage.hidden = !(vb.frage && lauf.front.length > 1);
    },

    /* Nach einer Station: neu zeichnen — im Vollbild mit Sprung. */
    _turmNeu() {
        if (START._turmVb) {
            START._turmVbZeichnen(false, true);
        }
        START._zeichnen();
    },

    /* ---------------------------------------------------------------- *
     * Die Stationen (Karten)
     * ---------------------------------------------------------------- */

    /* Eine Karte über allem (Baustein UPCREW_BLATT); `bauen(el, zu)`. */
    _turmKarte(titel, bauen) {
        const halter = { griff: null };
        const zu = () => {
            if (halter.griff) {
                halter.griff.schliessen();
            }
        };
        if (typeof UPCREW_BLATT !== "undefined" && typeof UPCREW_BLATT.oeffnen === "function") {
            halter.griff = UPCREW_BLATT.oeffnen({ art: "karte", titel: titel, klasse: "turm-station-karte",
                inhalt: (el) => bauen(el, zu) });
        }
        return halter.griff;
    },

    _turmKartenKopf(el, lauf, k) {
        const kopf = START._el("div", "turm-karte-kopf");
        const bild = START._el("span", "turm-kn-bild art-" + k.art);
        bild.appendChild(START._turmSvg(START_TURM_ZEICHEN[START.TURM_ART_ZEICHEN[k.art]], "turm-zeichen"));
        kopf.appendChild(bild);
        const text = START._el("div", "");
        text.appendChild(START._el("h2", "", TURM.ARTEN[k.art].name));
        text.appendChild(START._el("small", "turm-leise", "Stockwerk " + k.f + " von " + lauf.plan.stock));
        kopf.appendChild(text);
        el.appendChild(kopf);
    },

    _turmChip(text, klasse) {
        return START._el("span", "turm-chip" + (klasse ? " " + klasse : ""), text);
    },

    _turmStaerke(n) {
        const pips = START._el("span", "turm-staerke");
        pips.setAttribute("aria-label", "Stärke " + n + " von 10");
        for (let i = 0; i < 5; i++) {
            pips.appendChild(START._el("i", i < Math.ceil(n / 2) ? "an" : ""));
        }
        return pips;
    },

    _turmKnoepfe(el, liste) {
        const reihe = START._el("div", "turm-karte-knoepfe");
        for (const k of liste) {
            reihe.appendChild(k);
        }
        el.appendChild(reihe);
    },

    /* Das Gerät (Herzen, neu zu spielen) dieses Orts ändern. */
    _turmGeraetAendern(nr, aendern) {
        const d = FORTSCHRITT_KONTO._turmDurchgangAus(FORTSCHRITT_KONTO.lesen());
        const g = TURM._geraetKopie(FORTSCHRITT_KONTO.turmGeraet(nr, d.durchgang));
        aendern(g);
        FORTSCHRITT_KONTO.turmGeraetSetzen(nr, d.durchgang, g);
    },

    /* Eine Station ohne Partie ist gegangen (und nicht mehr neu zu spielen). */
    _turmBetreten(stand, k, plus) {
        FORTSCHRITT_KONTO.turmStation(stand.nr, k, plus || {});
        START._turmGeraetAendern(stand.nr, (g) => {
            const neu = TURM.nachSieg(stand.lauf, k.id, g);
            g.wieder = neu.wieder;
        });
    },

    _stationAntippen(id) {
        const stand = START._turmStand();
        const lauf = stand.lauf;
        const k = lauf.plan.knotenVon(id);
        if (!k || k.art === "ein") {
            return;
        }
        const vorne = lauf.front.indexOf(id) !== -1;
        if (!vorne) {
            const gegangen = lauf.verlauf.indexOf(id) !== -1;
            const erreichbar = !!START._turmErreichbar(lauf)[id];
            START._turmKarte(TURM.ARTEN[k.art].name, (el, zu) => {
                START._turmKartenKopf(el, lauf, k);
                el.appendChild(START._el("p", "", gegangen ? "Schon gegangen · nur vorwärts"
                    : erreichbar ? "Noch nicht erreichbar · erst darunter" : "Nicht mehr erreichbar · anderer Weg"));
                if (TURM.istKampf(k.art)) {
                    const chips = START._el("div", "turm-chips");
                    const st = START._turmChip("Stärke ");
                    st.appendChild(START._turmStaerke(k.staerke));
                    chips.appendChild(st);
                    if (k.art !== "g") {
                        chips.appendChild(START._turmChip(k.gegner));
                    }
                    el.appendChild(chips);
                }
                START._turmKnoepfe(el, [START._knopf("knopf-haupt", "Ok", null, zu)]);
            });
            return;
        }
        if (TURM.istKampf(k.art)) {
            START._kampfKarte(stand, k);
        } else if (k.art === "r") {
            START._rastKarte(stand, k);
        } else if (k.art === "t") {
            START._truheKarte(stand, k);
        } else if (k.art === "h") {
            START._haendlerKarte(stand, k);
        } else if (k.art === "f") {
            START._fundKarte(stand, k);
        }
    },

    _kampfKarte(stand, k) {
        const lauf = stand.lauf;
        START._turmKarte(TURM.ARTEN[k.art].name, (el, zu) => {
            START._turmKartenKopf(el, lauf, k);
            const chips = START._el("div", "turm-chips");
            const st = START._turmChip("Stärke ");
            st.appendChild(START._turmStaerke(k.staerke));
            chips.appendChild(st);
            const farbe = START._turmChip("Du spielst " + (k.farbe === "schwarz" ? "Schwarz" : "Weiß"));
            farbe.prepend(START._el("i", "turm-farbe-punkt " + (k.farbe === "schwarz" ? "schwarz" : "weiss")));
            chips.appendChild(farbe);
            chips.appendChild(START._turmChip(k.art === "g" ? "Gegner erst beim Start" : k.gegner));
            if (k.eigen) {
                chips.appendChild(START._turmChip(k.eigen));
            }
            if (lauf.herzen !== null) {
                const minus = TURM.VERLUST[k.art];
                chips.appendChild(START._turmChip("Niederlage −" + minus + (minus === 1 ? " Herz" : " Herzen"), "warn"));
            }
            if (k.art === "e") {
                chips.appendChild(START._turmChip(lauf.herzen !== null ? "Sieg: Herzen voll · Rückfall-Punkt" : "Sieg: Rückfall-Punkt", "gut"));
            } else if (k.art === "b") {
                chips.appendChild(START._turmChip("Sieg: Tür zum nächsten Ort", "gut"));
            }
            el.appendChild(chips);
            START._turmKnoepfe(el, [
                START._knopf("knopf-still", "Zurück", null, zu),
                START._knopf("knopf-haupt", "Spielen", "spielen", () => {
                    zu();
                    START._vsZeigen(stand.nr, k);
                })
            ]);
        });
    },

    _rastKarte(stand, k) {
        const lauf = stand.lauf;
        const schonDa = lauf.echt(k.id) || lauf.wieder.indexOf(k.id) !== -1;
        const geheilt = lauf.geheilt.indexOf(k.id) !== -1;
        START._turmKarte("Rast", (el, zu) => {
            START._turmKartenKopf(el, lauf, k);
            el.appendChild(START._el("p", "", "Eine Wahl · Rückfall-Punkt"));
            const wahl = START._el("div", "turm-wahl zwei");
            const heilen = START._knopf("knopf-still", "Heilen +" + TURM.HEILEN, "herz", () => {
                START._turmGeraetAendern(stand.nr, (g) => {
                    g.herzen = Math.min(TURM.HERZEN, lauf.herzen + TURM.HEILEN);
                    g.geheilt.push(k.id);
                });
                START._turmBetreten(stand, k);
                zu();
                DIALOG.kurzmeldung("+" + TURM.HEILEN + " Herzen");
                START._turmNeu();
            });
            heilen.disabled = lauf.herzen === null || lauf.herzen >= TURM.HERZEN || geheilt;
            const zeit = START._knopf("knopf-still", schonDa ? "Weiter" : "Zeit zurück +1", schonDa ? "rechts" : "uhr", () => {
                START._turmBetreten(stand, k, schonDa ? {} : { lebenGekauft: 1 });
                zu();
                if (!schonDa) {
                    DIALOG.kurzmeldung("+1 Zeit zurück");
                }
                START._turmNeu();
            });
            wahl.appendChild(heilen);
            wahl.appendChild(zeit);
            el.appendChild(wahl);
        });
    },

    _turmWareName(ware) {
        return ({ tipp: "Tipp", leben: "Zeit zurück", herz: "1 Herz" })[ware] || ware;
    },

    _truheKarte(stand, k) {
        const lauf = stand.lauf;
        const leer = lauf.echt(k.id) || lauf.wieder.indexOf(k.id) !== -1;
        START._turmKarte("Truhe", (el, zu) => {
            START._turmKartenKopf(el, lauf, k);
            if (leer) {
                el.appendChild(START._el("p", "", "Leer · schon genommen"));
            } else {
                const wahl = START._el("div", "turm-wahl zwei");
                const m = START._el("div", "turm-beute");
                m.appendChild(START._turmSvg(START_TURM_ZEICHEN.muenzen, "turm-zeichen"));
                m.appendChild(START._el("span", "", k.muenzen + " Münzen"));
                wahl.appendChild(m);
                const w = START._el("div", "turm-beute");
                w.appendChild(START._turmSvg(START_TURM_ZEICHEN[k.item === "tipp" ? "tipp" : "uhr"], "turm-zeichen"));
                w.appendChild(START._el("span", "", START._turmWareName(k.item)));
                wahl.appendChild(w);
                el.appendChild(wahl);
            }
            START._turmKnoepfe(el, [START._knopf("knopf-haupt", leer ? "Weiter" : "Alles nehmen", null, () => {
                const plus = leer ? {} : { muenzenVerdient: k.muenzen };
                if (!leer) {
                    plus[k.item + "Gekauft"] = 1;
                }
                START._turmBetreten(stand, k, plus);
                zu();
                if (!leer) {
                    DIALOG.kurzmeldung("+" + k.muenzen + " Münzen · +1 " + START._turmWareName(k.item));
                }
                START._turmNeu();
            })]);
        });
    },

    _turmSaldo() {
        return (typeof UPCREW_MUENZEN !== "undefined") ? UPCREW_MUENZEN.saldo(FORTSCHRITT_KONTO.lesen()) : 0;
    },

    _haendlerKarte(stand, k) {
        const lauf = stand.lauf;
        START._turmKarte("Händler", (el, zu) => {
            START._turmKartenKopf(el, lauf, k);
            el.appendChild(START._el("p", "", "Billiger als im Shop"));
            const wahl = START._el("div", "turm-wahl");
            const shop = { tipp: 15, leben: 30 };
            for (const id of k.waren) {
                const w = TURM.HAENDLER.find((x) => x.id === id);
                const b = START._el("button", "knopf knopf-still turm-ware");
                b.type = "button";
                b.appendChild(START._el("span", "", START._turmWareName(w.ware)));
                const preis = START._el("span", "turm-preis");
                if (shop[w.ware]) {
                    preis.appendChild(START._el("s", "", String(shop[w.ware])));
                }
                preis.appendChild(document.createTextNode(" " + w.preis));
                b.appendChild(preis);
                const voll = w.ware === "herz" && (lauf.herzen === null || lauf.herzen >= TURM.HERZEN);
                b.disabled = voll || START._turmSaldo() < w.preis;
                b.addEventListener("click", () => {
                    const plus = { muenzenAusgegeben: w.preis };
                    if (w.ware !== "herz") {
                        plus[w.ware + "Gekauft"] = 1;
                    }
                    if (!FORTSCHRITT_KONTO.turmStation(stand.nr, null, plus)) {
                        DIALOG.kurzmeldung("Zu wenig Münzen");
                        return;
                    }
                    if (w.ware === "herz") {
                        START._turmGeraetAendern(stand.nr, (g) => {
                            g.herzen = Math.min(TURM.HERZEN, lauf.herzen + 1);
                        });
                    }
                    b.disabled = true;
                    DIALOG.kurzmeldung(START._turmWareName(w.ware) + " gekauft");
                    START._turmNeu();
                });
                wahl.appendChild(b);
            }
            el.appendChild(wahl);
            START._turmKnoepfe(el, [START._knopf("knopf-haupt", "Weiter", null, () => {
                START._turmBetreten(stand, k);
                zu();
                START._turmNeu();
            })]);
        });
    },

    /* Was ein Fund-Tausch braucht und bewirkt. */
    _fundGeht(id, lauf, saldo, tipps) {
        const herzen = lauf.herzen;
        return ({
            herzmuenzen: herzen !== null && herzen > 1,
            muenzenherz: herzen !== null && herzen < TURM.HERZEN && saldo >= 30,
            herztipp: herzen !== null && herzen > 1,
            muenzenzeit: saldo >= 20,
            tippmuenzen: tipps >= 1
        })[id];
    },

    _fundAnwenden(stand, id) {
        const lauf = stand.lauf;
        const plus = ({
            herzmuenzen: { muenzenVerdient: 40 },
            muenzenherz: { muenzenAusgegeben: 30 },
            herztipp: { tippGekauft: 1 },
            muenzenzeit: { muenzenAusgegeben: 20, lebenGekauft: 1 },
            tippmuenzen: { tippGenutzt: 1, muenzenVerdient: 20 }
        })[id] || {};
        const herzen = ({ herzmuenzen: -1, muenzenherz: 1, herztipp: -1 })[id] || 0;
        if (herzen && lauf.herzen !== null) {
            START._turmGeraetAendern(stand.nr, (g) => {
                g.herzen = Math.max(1, Math.min(TURM.HERZEN, lauf.herzen + herzen));
            });
        }
        return plus;
    },

    _fundKarte(stand, k) {
        const lauf = stand.lauf;
        const schonDa = lauf.echt(k.id) || lauf.wieder.indexOf(k.id) !== -1;
        START._turmKarte("Fund", (el, zu) => {
            START._turmKartenKopf(el, lauf, k);
            el.appendChild(START._el("p", "", schonDa ? "Schon getauscht" : "Tausch · oder ablehnen"));
            const wahl = START._el("div", "turm-wahl");
            const saldo = START._turmSaldo();
            const tipps = FORTSCHRITT_KONTO.vorrat("tipp");
            if (!schonDa) {
                for (const id of k.angebote) {
                    const a = TURM.FUND.find((x) => x.id === id);
                    const b = START._el("button", "knopf knopf-still turm-tausch");
                    b.type = "button";
                    b.appendChild(START._el("span", "turm-gib", a.gib));
                    b.appendChild(START._turmSvg(START_TURM_ZEICHEN.rechts, "turm-zeichen"));
                    b.appendChild(START._el("span", "turm-kriegst", a.kriegst));
                    b.disabled = !START._fundGeht(id, lauf, saldo, tipps);
                    b.addEventListener("click", () => {
                        START._turmBetreten(stand, k, START._fundAnwenden(stand, id));
                        zu();
                        DIALOG.kurzmeldung("Getauscht · " + a.kriegst);
                        START._turmNeu();
                    });
                    wahl.appendChild(b);
                }
            }
            el.appendChild(wahl);
            START._turmKnoepfe(el, [START._knopf("knopf-haupt", schonDa ? "Weiter" : "Nein danke", null, () => {
                START._turmBetreten(stand, k);
                zu();
                START._turmNeu();
            })]);
        });
    },

    /* ---------------------------------------------------------------- *
     * „Spielen" im Turm
     * ---------------------------------------------------------------- */

    _turmSpielenText() {
        const stand = START._turmStand();
        const lauf = stand.lauf;
        if (stand.oben) {
            return "Ganz oben";
        }
        if (lauf.front.length > 1) {
            return "Weg wählen";
        }
        if (lauf.front.length === 1) {
            const k = lauf.plan.knotenVon(lauf.front[0]);
            return TURM.ARTEN[k.art].name + " · Stockwerk " + k.f;
        }
        return "";
    },

    /* An einer Kreuzung öffnet „Spielen" den Turm und fragt; sonst die
       nächste Station. */
    turmSpielen() {
        const stand = START._turmStand();
        if (stand.oben) {
            DIALOG.kurzmeldung("Ganz oben");
            return;
        }
        if (stand.lauf.front.length > 1) {
            START.turmOeffnen({ frage: true });
        } else if (stand.lauf.front.length === 1) {
            START._stationAntippen(stand.lauf.front[0]);
        }
    },

    /*
     * DIE VORSTELLUNG („VS", Entwurf `gegnerIntro`): Der Gegner gleitet von
     * oben herein, man selbst von unten; beim Boss dunkelrot mit „BOSS" und
     * einem kurzen Beben. Seit v0.160.0 ohne „Los": Nach 1,4 s (oder einem
     * Tipp) geht die Partie sofort los — ohne Vorraum (Nutzer 28.09.2026:
     * „wenn ich eine runde starte mit einem bot soll es direkt los gehen").
     */
    VS_DAUER_MS: 1400,

    _vsZeigen(nr, knoten) {
        if (typeof document === "undefined" || !document.body) {
            return;
        }
        START.turmSchliessen(true);
        const alt = document.querySelector(".turm-vs");
        if (alt) {
            alt.remove();
        }
        const ort = TURM.ort(nr);
        const boss = knoten.art === "b";
        const ich = (typeof ICH !== "undefined") ? ICH.person() : null;

        const vs = document.createElement("div");
        vs.className = "turm-vs turm-ort-" + nr + (boss ? " turm-vs-boss" : knoten.art === "e" ? " turm-vs-elite" : "");
        vs.setAttribute("role", "dialog");
        vs.setAttribute("aria-label", "Gegner: " + knoten.gegner);

        const oben = START._el("div", "turm-vs-oben");
        oben.appendChild(START._el("span", "turm-vs-lage", ort.name + " · "
            + (boss ? "Boss" : "Stockwerk " + knoten.f + "/" + ort.stock)));
        if (boss) {
            oben.appendChild(START._el("span", "turm-vs-bosswort", "BOSS"));
        }
        const gesicht = START._el("span", "turm-vs-gesicht");
        gesicht.appendChild(START._turmSvg(boss ? START_TURM_ZEICHEN.boss
            : knoten.art === "e" ? START_TURM_ZEICHEN.elite : START_TURM_ZEICHEN.bob, "turm-zeichen"));
        oben.appendChild(gesicht);
        oben.appendChild(START._el("b", "turm-vs-name", knoten.gegner));
        if (knoten.eigen) {
            oben.appendChild(START._el("span", "turm-vs-eigen", knoten.eigen));
        }
        vs.appendChild(oben);
        vs.appendChild(START._el("div", "turm-vs-mitte", "VS"));

        const unten = START._el("div", "turm-vs-unten");
        const bild = START._el("span", "visitenkarte-bild turm-vs-ich",
            ich ? (String(ich.name || "").trim().charAt(0).toUpperCase() || "?") : "?");
        unten.appendChild(bild);
        unten.appendChild(START._el("b", "", ich ? ich.name : ""));
        unten.appendChild(START._el("span", "turm-vs-farbe", "spielt " + (knoten.farbe === "schwarz" ? "Schwarz" : "Weiß")));
        vs.appendChild(unten);

        document.body.appendChild(vs);
        if (typeof FUEHLEN !== "undefined") {
            if (boss) {
                FUEHLEN.fehler();
            } else {
                FUEHLEN.tippen();
            }
        }
        let los = false;
        const starten = () => {
            if (los) {
                return;
            }
            los = true;
            START._vsSchliessen(vs);
            START._turmStarten(nr, knoten);
        };
        vs.addEventListener("click", starten);
        /* Erst nach dem ersten Bild einblenden, sonst gleitet nichts. */
        const zeigen = () => vs.classList.add("da");
        if (typeof requestAnimationFrame === "function") {
            requestAnimationFrame(() => requestAnimationFrame(zeigen));
        }
        window.setTimeout(zeigen, 80);
        window.setTimeout(starten, START.VS_DAUER_MS);
    },

    _vsSchliessen(vs) {
        vs.classList.remove("da");
        window.setTimeout(() => {
            if (vs.parentNode) {
                vs.parentNode.removeChild(vs);
            }
        }, 260);
    },

    /* Die Partie der Station anlegen — derselbe Weg wie „Spielen" in Frei
       (`START.spielen`), nur mit den Regeln der Station. */
    async _turmStarten(nr, knoten) {
        if (START.spielenLaeuft) {
            return;
        }
        if (typeof ANMELDUNG !== "undefined" && typeof ANMELDUNG.istOberAdmin === "function"
                && ANMELDUNG.istOberAdmin()) {
            await DIALOG.hinweis("Nicht mit UP#Plus",
                "Verwaltungskonto · spielt nicht · mit Spieler-Konto anmelden");
            return;
        }
        const regeln = TURM.regelnFuer(nr, knoten);
        if (!regeln) {
            return;
        }
        if (typeof FORTSCHRITT_KONTO !== "undefined" && typeof FORTSCHRITT_KONTO.turmDurchgangSichern === "function") {
            FORTSCHRITT_KONTO.turmDurchgangSichern();
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
     * Nach einer Partie: Kreuzung fragt, Rückfall erklärt
     * ---------------------------------------------------------------- */

    /* Gerufen, wenn der Start sichtbar gezeichnet ist (start.js). Die
       Meldung setzt FORTSCHRITT_KONTO._turmNachPartie — einmal je Partie. */
    _turmNachPartiePruefen() {
        if (typeof FORTSCHRITT_KONTO === "undefined" || !FORTSCHRITT_KONTO.turmMeldung
                || typeof TABS === "undefined" || TABS.aktiveId !== "start" || START._turmVb) {
            return;
        }
        const m = FORTSCHRITT_KONTO.turmMeldung;
        FORTSCHRITT_KONTO.turmMeldung = null;
        const stand = START._turmStand();
        if (m.ort !== stand.nr) {
            return;
        }
        if (m.art === "sieg") {
            if (stand.lauf.front.length > 1) {
                START.turmOeffnen({ frage: true, ohneAufstieg: true });
            }
        } else if (m.art === "rueckfall") {
            START.turmOeffnen({ ohneAufstieg: true });
            const cp = stand.lauf.plan.knotenVon(m.rueckfall);
            const wohin = (!cp || cp.art === "ein") ? "Zurück zum Anfang"
                : "Zurück zur " + (cp.art === "r" ? "Rast" : "Elite") + " · Stockwerk " + cp.f;
            START._turmKarte("Keine Herzen mehr", (el, zu) => {
                el.appendChild(START._el("h2", "", "Keine Herzen mehr"));
                el.appendChild(START._el("p", "", wohin + " · Herzen voll · Figuren und Münzen bleiben"));
                START._turmKnoepfe(el, [START._knopf("knopf-haupt", "Weiter", null, zu)]);
            });
        } else if (m.art === "verloren" && m.minus > 0) {
            DIALOG.kurzmeldung("−" + m.minus + (m.minus === 1 ? " Herz" : " Herzen") + " · noch " + m.herzen);
        }
    },

    /* Was ein Ort ist: Bob, Stockwerke, was er freischaltet — hinter dem Namen. */
    _ortErklaeren(nr) {
        const ort = TURM.ort(nr);
        const frei = START._freiDurch(nr);
        DIALOG.hinweis(nr + " · " + ort.name,
            "Boss: " + ort.bob + "\nStockwerke: " + ort.stock + " · Partien je Weg: " + ort.partien[0] + "–" + ort.partien[1]
                + (ort.herzen ? "\nHerzen: " + TURM.HERZEN : "\nOhne Herzen")
                + "\nKönig ab " + ort.schwelle[1] + " % Genauigkeit"
                + (frei.length ? "\nNeu frei: " + frei.join(", ") : ""));
    },

    /* Was mit einem Ort frei wird (für Erklärung und Banner). */
    _freiDurch(nr) {
        const namen = [];
        /* Seit v0.159.0 erst das 3D-Brett (Holzhalle), dann die
           3D-Figuren (Marmorsaal). „Brett Holz" usw. gilt für das
           Design im 2D- wie im 3D-Brett (gleicher Ort). */
        if (TURM.FREI_AB.brettDreiD === nr) {
            namen.push("3D-Brett");
        }
        if (TURM.FREI_AB.dreiD === nr) {
            namen.push("3D-Figuren");
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
