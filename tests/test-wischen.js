/*
 * test-wischen.js — Tabs wechseln als SEITEN-BAND (seit v0.161.0, UPCrew Runde 8; gemeinsamer Baustein
 * js\upcrew-wischen.js mit neuem Vertrag. Nutzer 03.10.2026: „es soll schon kleine swip bewegung ausreichen. wenn
 * man in eine richtung wischt soll dort schon die nächste seite zu sehen sein“). Bis v0.160 prüfte diese Datei die
 * Zeiger-Fassung (`entscheiden`, `startErlaubt`) — beides gibt es nicht mehr.
 *
 * Geprüft wird, wie BLUNDERLUCK das Band einbaut — mit den echten Dateien js\tabs.js, js\upcrew-wischen.js und der
 * echten Verdrahtung aus js\app.js an einem nachgestellten Dokument: Tab-Reihenfolge = Band, ein Platzhalter-Tab
 * fehlt im Band, kein Bereich einer Leisten-Seite ist `hidden`, `wechseln` ruft `zu`, das Band setzt den Tab nach
 * dem Einrasten (ein Wechsel, kein Kreis), Bauen im Leerlauf und bei `kommt`, Sperre in der Partie, Band ↔ Partie,
 * der Start rechnet nur eingerastet, die Sammlung baut sich nicht mehr ab. Dazu die Einbindung (index.html, sw.js,
 * Stile). Den Baustein selbst prüfen UPCrew `tests\test-wischen-band.js` und `test-wischen-geraet.js`; ob ein
 * echter Browser so rollt und einrastet, zeigt nur der Browser (ansicht\v0.162.0\probe.html).
 *
 * SEIT v0.162.0 zieht die Leiste früher nach (`frueh: true`): Hält kein Finger das Band und hat es die Hälfte zur
 * Nachbarseite überschritten, kommt `wechseln` sofort — genau einmal, beim Einrasten kein zweites Mal. Tab und
 * Leiste stehen dann gleich; gezeichnet (`beimOeffnen`) wird die Seite erst nach dem Einrasten (`band.ort()`).
 * Solange der Finger hält, bleibt die Leiste; ein Tipp läuft nicht voraus; in der Partie bleibt alles gesperrt.
 *
 * Aufruf: siehe tests\README.md
 */

const fs = require("fs");
const pfad = require("path");
const vm = require("vm");

let anzahlOk = 0;
let anzahlFehler = 0;

function pruefe(bezeichnung, funktion) {
    try {
        funktion();
        anzahlOk++;
    } catch (fehler) {
        anzahlFehler++;
        console.error("FEHLER: " + bezeichnung);
        console.error("        " + fehler.message);
    }
}

function gleich(ist, soll, was) {
    if (JSON.stringify(ist) !== JSON.stringify(soll)) {
        throw new Error(was + ": ist " + JSON.stringify(ist) + ", soll " + JSON.stringify(soll));
    }
}

function wahr(bedingung, was) {
    if (!bedingung) {
        throw new Error(was);
    }
}

const projekt = pfad.join(__dirname, "..");
const lesen = (name) => fs.readFileSync(pfad.join(projekt, name), "utf8").replace(/\r\n/g, "\n");
const ohneKommentare = (text) => text.replace(/\/\*[\s\S]*?\*\//g, "");

/* ------------------------------------------------------------------ *
 * Das nachgestellte Dokument
 * ------------------------------------------------------------------ */

const BREITE = 390;

function neuesElement(tag) {
    const klassen = [];
    const hoerer = {};
    const el = {
        tagName: String(tag).toUpperCase(),
        children: [],
        parentNode: null,
        dataset: {},
        style: {},
        attribute: {},
        hidden: false,
        inert: false,
        disabled: false,
        scrollTop: 0,
        scrollLeft: 0,
        offsetWidth: 0,
        textContent: "",
        classList: {
            add(k) { if (klassen.indexOf(k) === -1) { klassen.push(k); } },
            remove(k) { const i = klassen.indexOf(k); if (i !== -1) { klassen.splice(i, 1); } },
            contains: (k) => klassen.indexOf(k) !== -1,
            toggle(k, an) {
                const soll = an === undefined ? klassen.indexOf(k) === -1 : !!an;
                el.classList[soll ? "add" : "remove"](k);
                return soll;
            }
        },
        get className() { return klassen.join(" "); },
        set className(w) { klassen.length = 0; String(w).split(/\s+/).filter(Boolean).forEach((k) => klassen.push(k)); },
        set innerHTML(w) { el.children.forEach((k) => { k.parentNode = null; }); el.children.length = 0; },
        get innerHTML() { return ""; },
        appendChild(kind) { kind.parentNode = el; el.children.push(kind); return kind; },
        setAttribute(n, w) { el.attribute[n] = String(w); },
        getAttribute: (n) => (n in el.attribute ? el.attribute[n] : null),
        removeAttribute(n) { delete el.attribute[n]; },
        addEventListener(art, f) { (hoerer[art] = hoerer[art] || []).push(f); },
        removeEventListener(art, f) { hoerer[art] = (hoerer[art] || []).filter((g) => g !== f); },
        ausloesen(art, ereignis) { (hoerer[art] || []).slice().forEach((f) => f(ereignis || {})); },
        /* genügt für ".klasse" — mehr braucht tabs.js nicht */
        querySelectorAll(wahl) {
            const klasse = String(wahl).replace(/^\./, "");
            const treffer = [];
            const gehen = (knoten) => {
                for (const k of knoten.children) {
                    if (k.classList.contains(klasse)) {
                        treffer.push(k);
                    }
                    gehen(k);
                }
            };
            gehen(el);
            return treffer;
        },
        querySelector: (wahl) => el.querySelectorAll(wahl)[0] || null
    };
    return el;
}

/* Das Band: ein Element mit Rollstand. Verborgen (`hidden`) hat es keine Breite — wie im Browser. */
function neuesBand() {
    const band = neuesElement("div");
    band.rollen = [];
    band.getBoundingClientRect = () => ({ width: band.hidden ? 0 : BREITE });
    Object.defineProperty(band, "clientWidth", { get: () => (band.hidden ? 0 : BREITE) });
    band.scrollTo = (ziel) => { band.rollen.push(ziel.left); };
    band.onscrollend = null;
    /* Der Browser rollt: Rollstand setzen, `scroll` schicken; mit ende = true rastet er dort ein. */
    band.rolle = (links, ende) => {
        band.scrollLeft = links;
        band.ausloesen("scroll");
        if (ende) {
            band.ausloesen("scrollend");
        }
    };
    return band;
}

/* Eine Welt: echte tabs.js + echter Baustein + die echte Verdrahtung aus app.js. */
function welt(wahl) {
    const o = wahl || {};
    const koerper = neuesElement("body");
    const wurzel = neuesElement("html");
    const dokument = {
        body: koerper,
        documentElement: wurzel,
        createElement: neuesElement,
        querySelectorAll: () => []
    };
    const leerlauf = [];
    /* Die Bilder des Browsers (requestAnimationFrame) von Hand: `bildLeeren()` lässt EIN Bild vergehen. */
    const bilder = [];
    const umgebung = {
        console, document: dokument, setTimeout, clearTimeout,
        matchMedia: () => ({ matches: false }),
        addEventListener() {}, removeEventListener() {},
        requestIdleCallback: (f) => { leerlauf.push(f); },
        requestAnimationFrame: (f) => { bilder.push(f); },
        ANMELDUNG: { anmeldenLaeuft: false }
    };
    umgebung.window = umgebung;
    umgebung.globalThis = umgebung;
    vm.createContext(umgebung);
    vm.runInContext(lesen("js/upcrew-wischen.js") + "\n;\n" + lesen("js/tabs.js") + "\n;globalThis.TABS = TABS;", umgebung);
    const T = umgebung.TABS;

    const log = [];
    const tab = (id, mehr) => Object.assign({
        id: id, titel: id,
        aufbauen(b) { log.push("auf:" + id); this.bereich = b; },
        beimOeffnen() { log.push("offen:" + id); },
        beimVerlassen() { log.push("weg:" + id); },
        vorzeichnen() { log.push("vor:" + id); }
    }, mehr || {});
    const liste = [tab("shop"), tab("sammlung"), tab("start"), tab("herausforderungen")];
    if (o.platzhalter) {
        liste.push(tab("bald", { platzhalter: true }));
    }
    liste.push(tab("rangliste"), tab("team-schach", { inLeiste: false }));
    liste.forEach((t) => T.registrieren(t));

    const leiste = neuesElement("nav");
    const inhalt = neuesElement("main");
    const band = neuesBand();
    band.ownerDocument = dokument;
    const sicht = [];
    T.beiHaupt = (element) => sicht.push(element);
    T.starten(leiste, inhalt, "start", o.ohneBand ? null : band);

    /* Die Verdrahtung so, wie sie in app.js steht — herausgeschnitten, nicht nachgebaut. */
    if (!o.ohneBand) {
        const app = lesen("js/app.js");
        const von = app.indexOf("TABS.band = UPCREW_WISCHEN.an(TABS.bandEl, {");
        const bis = app.indexOf("});", von);
        wahr(von !== -1 && bis !== -1, "app.js: UPCREW_WISCHEN.an(TABS.bandEl, …) nicht gefunden");
        vm.runInContext(app.slice(von, bis + 3), umgebung);
    }

    const seiten = () => band.children.filter((s) => s.dataset.upSeite);
    return {
        umgebung, T, leiste, inhalt, band, log, sicht, leerlauf, koerper, wurzel, liste,
        seiten,
        seite: (id) => seiten().find((s) => s.dataset.upSeite === id),
        links: (id) => ["shop", "sammlung", "start", "herausforderungen", "rangliste"].indexOf(id) * BREITE,
        markiert: () => leiste.children.filter((k) => k.getAttribute("aria-current") === "page")
            .map((k) => k.dataset.tabId),
        bedienbar: () => seiten().filter((s) => !s.hidden && !s.inert).map((s) => s.dataset.upSeite),
        leerlaufLeeren() {
            while (leerlauf.length > 0) {
                leerlauf.shift()();
            }
        },
        /* ein Bild vergeht: was bis jetzt auf das nächste Bild wartete, läuft (Neues wartet aufs übernächste) */
        bildLeeren() {
            for (const f of bilder.splice(0)) {
                f();
            }
        },
        wartetAufBild: () => bilder.length,
        /* der Finger legt sich aufs Band / hebt ab (nur gelesen — für `frueh`) */
        fingerRunter() { band.ausloesen("touchstart", { touches: [{}] }); },
        fingerHoch() { band.ausloesen("touchend", { touches: [] }); }
    };
}

const REIHE = ["shop", "sammlung", "start", "herausforderungen", "rangliste"];

/* ------------------------------------------------------------------ *
 * 1. Das Gerüst
 * ------------------------------------------------------------------ */

pruefe("Baustein: neuer Vertrag (Seiten-Band), die Zeiger-Fassung ist weg", () => {
    const W = require(pfad.join(projekt, "js", "upcrew-wischen.js"));
    for (const name of ["an", "seiten", "nachbar", "linksVon", "stelle", "eingerastet", "sichtbar", "sperrGrund"]) {
        gleich(typeof W[name], "function", name);
    }
    for (const name of ["entscheiden", "startErlaubt", "richtung", "versatz", "loslassen", "auswerten"]) {
        gleich(typeof W[name], "undefined", "alt: " + name);
    }
    const css = lesen("css/upcrew-wischen.css");
    wahr(/scroll-snap-type: x mandatory/.test(css) && /scroll-snap-stop: always/.test(css), "scroll-snap im Baustein");
});

pruefe("Tab-Reihenfolge = Band: je Leisten-Tab eine Seite, in Leisten-Reihenfolge, alle sofort im Dokument", () => {
    const w = welt();
    gleich(w.leiste.children.map((k) => k.dataset.tabId), REIHE, "Leiste");
    gleich(w.seiten().map((s) => s.dataset.upSeite), REIHE, "Seiten des Bandes");
    gleich(w.seiten().map((s) => s.style.order), ["0", "1", "2", "3", "4"], "Reihenfolge des Bausteins");
    gleich(w.umgebung.UPCREW_WISCHEN.seiten(w.T.bandTabs()), REIHE, "bandTabs");
    for (const s of w.seiten()) {
        wahr(s.parentNode === w.band, s.dataset.upSeite + ": unmittelbares Kind des Bandes");
        wahr(s.classList.contains("up-band-seite"), s.dataset.upSeite + ": up-band-seite");
        const innen = s.children[0];
        wahr(innen.classList.contains("tab-inhalt") && innen.classList.contains("band-inhalt"),
            s.dataset.upSeite + ": der Innenabstand sitzt am Kind (.tab-inhalt.band-inhalt)");
        const bereich = innen.children[0];
        wahr(bereich.classList.contains("tab-bereich") && bereich.dataset.tabId === s.dataset.upSeite,
            s.dataset.upSeite + ": darin der Bereich des Tabs");
    }
    wahr(!w.seite("team-schach"), "die Partie steht nicht im Band");
    gleich(w.inhalt.querySelectorAll(".tab-bereich").length, 0, "kein Leisten-Bereich im alten Behälter");
});

pruefe("Platzhalter-Tab: still in der Leiste, fehlt im Band", () => {
    const w = welt({ platzhalter: true });
    gleich(w.leiste.children.length, 6, "sechs Plätze in der Leiste");
    const knopf = w.leiste.children[4];
    wahr(knopf.disabled && knopf.classList.contains("up-tab-still"), "der Platzhalter ist still");
    wahr(!w.seite("bald"), "keine Seite für den Platzhalter");
    gleich(w.seiten().map((s) => s.dataset.upSeite), REIHE, "das Band hat fünf Seiten");
    gleich(w.T.bandTabs()[4], { id: "bald", still: true }, "dem Baustein als still gemeldet");
    /* von Aufgaben nach rechts rastet das Band gleich auf Rangliste ein */
    w.T.wechseln("herausforderungen");
    w.band.rolle(3 * BREITE, true);
    w.band.rolle(4 * BREITE, true);
    gleich(w.T.aktiveId, "rangliste", "rechts von Aufgaben liegt Rangliste");
});

pruefe("Kein Bereich einer Leisten-Seite ist hidden — auch nach Wechseln; keine Einblend-Animation", () => {
    const w = welt();
    for (const id of ["shop", "rangliste", "sammlung", "start", "herausforderungen"]) {
        w.T.wechseln(id);
        w.band.rolle(w.links(id), true);
    }
    for (const s of w.seiten()) {
        gleich(s.hidden, false, s.dataset.upSeite + ": Seite");
        const bereich = s.children[0].children[0];
        gleich(bereich.hidden, false, s.dataset.upSeite + ": Bereich");
        wahr(!bereich.classList.contains("tab-bereich-zeigt"), s.dataset.upSeite + ": ohne tab-bereich-zeigt");
    }
    gleich(w.band.hidden, false, "das Band ist zu sehen");
    gleich(w.inhalt.hidden, true, "der alte Behälter ist verborgen");
    wahr(w.wurzel.classList.contains("im-band"), "html.im-band: das Dokument rollt nicht");
});

/* ------------------------------------------------------------------ *
 * 2. Wechseln: Tipp und Band, ein Weg
 * ------------------------------------------------------------------ */

pruefe("Start: das Band steht ohne Weg auf dem Start, nur er ist bedienbar und gebaut", () => {
    const w = welt();
    gleich(w.band.scrollLeft, 2 * BREITE, "Start ist die dritte Seite");
    gleich(w.band.rollen, [], "kein sanftes Rollen beim Start");
    gleich(w.bedienbar(), ["start"], "Nachbarn sind inert");
    gleich(w.T.band.ort(), "start", "ort");
    gleich(w.T.offeneSeite, "start", "offeneSeite");
    gleich(w.log, ["auf:start", "offen:start"], "nur der Start ist gebaut und geöffnet");
    gleich(w.markiert(), ["start"], "Leiste");
});

pruefe("wechseln ruft zu: der Tipp setzt Leiste und Tab sofort, das Band rollt hin — genau ein Wechsel", () => {
    const w = welt();
    let gerufen = [];
    const echt = w.T.band.zu;
    w.T.band.zu = (id, wahl) => { gerufen.push(id + (wahl && wahl.sofort ? " sofort" : "")); return echt(id, wahl); };
    w.log.length = 0;
    w.leiste.children[4].ausloesen("click");
    gleich(gerufen, ["rangliste"], "band.zu(rangliste), sanft");
    gleich(w.T.aktiveId, "rangliste", "der Tab steht sofort");
    gleich(w.markiert(), ["rangliste"], "die Leiste sofort");
    gleich(w.band.rollen, [4 * BREITE], "das Band rollt zur fünften Seite");
    gleich(w.log, ["weg:start", "auf:rangliste", "offen:rangliste"], "verlassen → bauen → öffnen");
    /* das Band kommt an: kein zweiter Wechsel */
    w.log.length = 0;
    gerufen = [];
    w.band.rolle(3 * BREITE);
    w.band.rolle(4 * BREITE, true);
    gleich(w.log.filter((e) => e.indexOf("offen:") === 0), [], "kein zweites Öffnen");
    gleich(gerufen, [], "kein Kreis");
    gleich(w.T.band.ort(), "rangliste", "ort");
    gleich(w.bedienbar(), ["rangliste"], "bedienbar");
    /* in tabs.js steht der Ruf am Ende von wechseln */
    const tabs = ohneKommentare(lesen("js/tabs.js"));
    wahr(/TABS\._bandZu\(id, erschienen\);\s*\}\s*\}\s*\};\s*$/.test(tabs), "wechseln endet mit TABS._bandZu");
    wahr(/TABS\.band\.zu\(id, sofort \? \{ sofort: true \} : undefined\)/.test(tabs), "_bandZu ruft band.zu");
});

/* Seit v0.162.0 mit `frueh: true` (Nutzer 03.10.2026: „die leiste“ soll nicht warten). Bis v0.161 kam der Wechsel
   erst nach dem Einrasten. */
pruefe("Band, Finger hält: der Tab bleibt — losgelassen über der Hälfte zieht die Leiste SOFORT nach, einmal", () => {
    const w = welt();
    w.log.length = 0;
    w.fingerRunter();
    w.band.rolle(2 * BREITE + 120);
    w.band.rolle(2 * BREITE + 300);
    gleich(w.T.aktiveId, "start", "der Finger hält das Band: der Tab bleibt");
    gleich(w.markiert(), ["start"], "der Finger hält das Band: die Leiste bleibt");
    wahr(w.log.indexOf("auf:herausforderungen") !== -1 && w.log.indexOf("vor:herausforderungen") !== -1,
        "die Nachbarseite ist gebaut und gefüllt, sobald sie in Sicht kommt (kommt)");
    wahr(w.log.indexOf("offen:herausforderungen") === -1, "geöffnet ist sie noch nicht");
    /* der Finger hebt ab, das Band steht über der Hälfte: Es steht fest, wo es einrastet */
    w.fingerHoch();
    gleich(w.T.aktiveId, "herausforderungen", "losgelassen über der Hälfte: Tab gesetzt, VOR dem Einrasten");
    gleich(w.markiert(), ["herausforderungen"], "die Leiste zieht sofort nach");
    gleich(w.T.offeneSeite, "herausforderungen", "offeneSeite");
    gleich(w.T.band.ort(), "start", "eingerastet ist das Band noch nicht");
    gleich(w.bedienbar(), ["start"], "die neue Seite ist noch NICHT bedienbar — erst beim Einrasten (Baustein 04.10.2026)");
    gleich(w.log.filter((e) => /^(weg|offen):/.test(e)), ["weg:start"],
        "verlassen ja — aber die Seite, auf der das Band gerade ankommt, wird noch NICHT neu gezeichnet");
    gleich(w.band.rollen, [], "wechseln rollt das Band nicht selbst (band.zu greift nicht ein)");
    gleich(w.band.scrollLeft, 2 * BREITE + 300, "und setzt den Rollstand nicht um");
    /* das Band rollt allein zu Ende */
    w.bildLeeren();
    w.band.rolle(2 * BREITE + 360);
    w.bildLeeren();
    gleich(w.log.filter((e) => /^(weg|offen):/.test(e)), ["weg:start"], "unterwegs: weiter kein Zeichnen, kein zweiter Wechsel");
    w.band.rolle(3 * BREITE, true);
    gleich(w.T.band.ort(), "herausforderungen", "eingerastet");
    gleich(w.bedienbar(), ["herausforderungen"], "eingerastet: jetzt ist die neue Seite bedienbar");
    gleich(w.log.filter((e) => /^(weg|offen):/.test(e)), ["weg:start"], "beim Einrasten kein zweiter Wechsel");
    w.bildLeeren();
    gleich(w.log.filter((e) => /^(weg|offen):/.test(e)), ["weg:start", "offen:herausforderungen"],
        "im nächsten Bild nach dem Einrasten zeichnet die Seite frisch — genau einmal");
    w.bildLeeren();
    w.bildLeeren();
    gleich(w.log.filter((e) => e === "offen:herausforderungen").length, 1, "und nie ein zweites Mal");
    gleich(w.wartetAufBild(), 0, "nichts wartet mehr");
    gleich(w.band.rollen, [], "das Band steht schon dort — zu() rollt nicht noch einmal");
});

pruefe("Band ohne Finger (Schwung, Rad): über der Hälfte = EIN Wechsel, beim Einrasten kein zweiter; darunter keiner", () => {
    const w = welt();
    let wechsel = 0;
    const echt = w.T.wechseln;
    w.T.wechseln = (id, optionen) => { wechsel++; return echt(id, optionen); };
    w.log.length = 0;
    w.band.rolle(2 * BREITE + 120);
    gleich([wechsel, w.T.aktiveId], [0, "start"], "unter der Hälfte: nichts");
    w.band.rolle(2 * BREITE + 196);
    gleich([wechsel, w.T.aktiveId], [1, "herausforderungen"], "über der Hälfte: der Tab steht");
    gleich(w.markiert(), ["herausforderungen"], "die Leiste auch");
    w.band.rolle(2 * BREITE + 300);
    w.band.rolle(3 * BREITE, true);
    gleich(wechsel, 1, "genau ein Wechsel — unterwegs und beim Einrasten kein zweiter");
    w.bildLeeren();
    gleich(w.log.filter((e) => /^(weg|offen):/.test(e)), ["weg:start", "offen:herausforderungen"], "je einmal");
    /* nach links genauso */
    w.band.rolle(3 * BREITE - 200);
    gleich([wechsel, w.T.aktiveId], [2, "start"], "zurück über die Hälfte: Start");
    w.band.rolle(2 * BREITE, true);
    gleich(wechsel, 2, "eingerastet: kein weiterer");
    /* app.js gibt dem Wechsel vom Band `vomBand` mit — nur dann wartet das Zeichnen aufs Einrasten */
    const tabs = ohneKommentare(lesen("js/tabs.js"));
    wahr(/optionen && optionen\.vomBand/.test(tabs) && /TABS\.band\.ort\(\) !== id/.test(tabs),
        "tabs.js: aufgeschoben nur bei vomBand und solange band.ort() noch nicht die Seite nennt");
});

pruefe("Zurückgezogen: greift der Finger noch einmal zu und zieht zurück, wechselt die Leiste wieder zurück", () => {
    const w = welt();
    w.log.length = 0;
    w.band.rolle(2 * BREITE + 250);
    gleich(w.T.aktiveId, "herausforderungen", "die Leiste war voraus");
    w.fingerRunter();
    w.band.rolle(2 * BREITE + 150);
    w.band.rolle(2 * BREITE + 40);
    gleich(w.T.aktiveId, "herausforderungen", "der Finger hält: die Leiste bleibt stehen");
    w.fingerHoch();
    gleich(w.T.aktiveId, "start", "losgelassen diesseits der Hälfte: zurück auf die alte Seite");
    w.band.rolle(2 * BREITE, true);
    gleich(w.T.aktiveId, "start", "eingerastet auf der alten Seite");
    gleich(w.markiert(), ["start"], "die Leiste auch");
    w.bildLeeren();
    w.bildLeeren();
    gleich(w.log.filter((e) => e.indexOf("offen:") === 0), ["offen:start"],
        "die Seite, auf der das Band nie ankam, wird nicht gezeichnet — der Start einmal");
    gleich(w.wartetAufBild(), 0, "das aufgeschobene Öffnen ist verfallen");
});

pruefe("Ein Tipp auf die Leiste läuft nicht voraus: das Band fährt über fremde Seiten, ohne sie zu öffnen", () => {
    const w = welt();
    w.T.wechseln("shop");
    w.band.rolle(0, true);
    w.log.length = 0;
    w.leiste.children[4].ausloesen("click");
    gleich(w.log.filter((e) => e.indexOf("offen:") === 0), ["offen:rangliste"], "der Tipp öffnet sofort (kein Aufschub)");
    for (const links of [BREITE - 100, BREITE + 250, 2 * BREITE + 250, 3 * BREITE + 250]) {
        w.band.rolle(links);
        gleich(w.T.aktiveId, "rangliste", "unterwegs bei " + links + ": der Tab bleibt beim Ziel");
    }
    w.band.rolle(4 * BREITE, true);
    w.bildLeeren();
    gleich(w.log.filter((e) => e.indexOf("offen:") === 0), ["offen:rangliste"], "keine fremde Seite geöffnet, kein zweites Öffnen");
});

pruefe("Aufgeschobenes Öffnen: wartet nicht ewig, und ein neuerer Wechsel lässt es verfallen", () => {
    const w = welt();
    w.log.length = 0;
    w.band.rolle(2 * BREITE + 250);
    gleich(w.T.aktiveId, "herausforderungen", "voraus");
    /* ein neuerer Wechsel (Tipp auf die Leiste) überholt */
    w.T.wechseln("shop");
    w.band.rolle(0, true);
    w.bildLeeren();
    w.bildLeeren();
    gleich(w.log.filter((e) => e.indexOf("offen:") === 0), ["offen:shop"], "nur die getippte Seite öffnet");
    /* bleibt das Band hängen (es rastet nie ein), öffnet die Seite nach der Wartezeit trotzdem */
    w.log.length = 0;
    w.band.rolle(BREITE - 150);
    gleich(w.T.aktiveId, "sammlung", "voraus");
    const uhr = vm.runInContext("Date", w.umgebung);
    const echt = uhr.now;
    try {
        w.bildLeeren();
        gleich(w.log.filter((e) => e.indexOf("offen:") === 0), [], "noch wartet es");
        const jetzt = echt();
        uhr.now = () => jetzt + w.T.OEFFNEN_WARTEN_MS + 1;
        w.bildLeeren();
        gleich(w.log.filter((e) => e.indexOf("offen:") === 0), ["offen:sammlung"], "nach der Wartezeit geöffnet");
        gleich(w.wartetAufBild(), 0, "danach wartet nichts mehr");
    } finally {
        uhr.now = echt;
    }
});

pruefe("Unter der Hälfte zurück, an den Enden Stopp: kein Wechsel", () => {
    const w = welt();
    w.log.length = 0;
    w.band.rolle(2 * BREITE + 100);
    w.band.rolle(2 * BREITE, true);
    gleich(w.T.aktiveId, "start", "zurück auf dieselbe Seite");
    w.T.wechseln("rangliste");
    w.band.rolle(4 * BREITE, true);
    w.log.length = 0;
    w.band.rolle(4 * BREITE, true);
    gleich(w.log, [], "am rechten Ende geschieht nichts");
    gleich(w.umgebung.UPCREW_WISCHEN.nachbar(w.T.bandTabs(), "rangliste", 1), null, "kein Rundlauf rechts");
    gleich(w.umgebung.UPCREW_WISCHEN.nachbar(w.T.bandTabs(), "shop", -1), null, "kein Rundlauf links");
});

pruefe("Eine Leisten-Seite beginnt oben: erneut angetippt rollt sie nach oben, ohne window.scrollTo", () => {
    const w = welt();
    w.seite("start").scrollTop = 240;
    w.T.wechseln("start");
    gleich(w.seite("start").scrollTop, 0, "die offene Seite steht wieder oben");
    /* eine verlassene Seite setzt der Baustein nach oben */
    w.seite("start").scrollTop = 300;
    w.T.wechseln("sammlung");
    w.band.rolle(BREITE, true);
    gleich(w.seite("start").scrollTop, 0, "verlassen: oben");
    wahr(!/window\.scrollTo/.test(ohneKommentare(lesen("js/tabs.js"))), "tabs.js rollt das Fenster nicht mehr");
});

/* ------------------------------------------------------------------ *
 * 3. Bauen: sofort, im Leerlauf, spätestens bei kommt
 * ------------------------------------------------------------------ */

pruefe("Bauen: die offene Seite sofort, die anderen im Leerlauf — Nachbarn zuerst, gefüllt über vorzeichnen", () => {
    const w = welt();
    gleich(Object.keys(w.T.aufgebaut), ["start"], "nach dem Start steht nur der Start");
    w.log.length = 0;
    w.T.vorbauen();
    gleich(w.log, [], "nichts sofort");
    w.leerlaufLeeren();
    gleich(w.log.filter((e) => e.indexOf("auf:") === 0).sort(),
        ["auf:herausforderungen", "auf:rangliste", "auf:sammlung", "auf:shop"], "alle vier gebaut");
    const stellen = ["sammlung", "herausforderungen", "shop", "rangliste"].map((id) => w.log.indexOf("auf:" + id));
    wahr(Math.max(stellen[0], stellen[1]) < Math.min(stellen[2], stellen[3]), "die Nachbarn des Starts zuerst");
    gleich(w.log.filter((e) => e.indexOf("vor:") === 0).length, 4, "jede einmal gefüllt (vorzeichnen)");
    gleich(w.log.filter((e) => e.indexOf("offen:") === 0), [], "geöffnet wird dabei keine");
    w.log.length = 0;
    w.T.vorbauen();
    w.leerlaufLeeren();
    w.T.seiteKommt("shop");
    gleich(w.log, [], "nichts wird zweimal gebaut");
    const app = ohneKommentare(lesen("js/app.js"));
    wahr(/ANMELDUNG\.beiAngemeldet = \(\) => \{\s*TABS\.bandAuffrischen\(\);\s*TABS\.vorbauen\(\);/.test(app),
        "app.js: nach der Anmeldung auffrischen und im Leerlauf vorbauen");
    wahr(/requestIdleCallback/.test(lesen("js/tabs.js")) && /setTimeout\(aufgabe/.test(lesen("js/tabs.js")),
        "requestIdleCallback mit Rückfall");
});

pruefe("vorzeichnen: Shop, Sammlung, Aufgaben und Rangliste füllen sich als Nachbarseite", () => {
    for (const [datei, name] of [["js/shop.js", "SHOP"], ["js/sammlung.js", "SAMMLUNG"],
        ["js/herausforderungen.js", "HERAUSFORDERUNGEN"], ["js/rangliste.js", "RANGLISTE"]]) {
        wahr(/\n    vorzeichnen\(\) \{/.test(lesen(datei)), name + ".vorzeichnen fehlt");
    }
});

pruefe("Sammlung: baut sich beim Verlassen nicht mehr ab", () => {
    const quelle = ohneKommentare(lesen("js/sammlung.js"));
    wahr(!/\n    beimVerlassen\(\)/.test(quelle), "SAMMLUNG.beimVerlassen gibt es nicht mehr");
    gleich((quelle.match(/SAMMLUNG\.tab\.entfernen\(\)/g) || []).length, 1,
        "abgebaut wird nur noch unmittelbar vor dem frischen Zeichnen (_zeigen)");
});

/* ------------------------------------------------------------------ *
 * 4. Sperre, Partie
 * ------------------------------------------------------------------ */

pruefe("Sperre in der Partie: erlaubt ist false, rundeSetzen frischt sofort auf", () => {
    const w = welt();
    const app = lesen("js/app.js");
    const einbau = app.slice(app.indexOf("TABS.band = UPCREW_WISCHEN.an(TABS.bandEl, {"));
    for (const wort of ["partie-spielt", "runde-offen", "ANMELDUNG.anmeldenLaeuft", "TABS.bandSichtbar()"]) {
        wahr(einbau.slice(0, einbau.indexOf("});")).indexOf(wort) !== -1, "erlaubt nennt " + wort);
    }
    wahr(!w.band.classList.contains("up-band-gesperrt"), "frei auf dem Start");
    /* ein Fenster auf einer Leisten-Seite: runde-offen */
    w.T.rundeSetzen("start", true);
    wahr(w.koerper.classList.contains("runde-offen"), "body.runde-offen");
    wahr(w.band.classList.contains("up-band-gesperrt"), "sofort gesperrt (auffrischen), ohne Berührung");
    w.band.rolle(2 * BREITE + 300);
    gleich(w.T.aktiveId, "start", "gesperrt: auch über der Hälfte läuft die Leiste nicht voraus (frueh)");
    w.band.rolle(3 * BREITE, true);
    gleich(w.T.aktiveId, "start", "gesperrt und doch verrutscht: kein Wechsel");
    gleich(w.band.scrollLeft, 2 * BREITE, "das Band springt zurück auf die offene Seite");
    w.T.rundeSetzen("start", false);
    wahr(!w.band.classList.contains("up-band-gesperrt"), "wieder frei");
    /* die Anmeldung */
    w.umgebung.ANMELDUNG.anmeldenLaeuft = true;
    w.T.bandAuffrischen();
    wahr(w.band.classList.contains("up-band-gesperrt"), "Anmeldung läuft: gesperrt");
    w.umgebung.ANMELDUNG.anmeldenLaeuft = false;
    w.T.bandAuffrischen();
    wahr(!w.band.classList.contains("up-band-gesperrt"), "Anmeldung durch: frei");
    wahr(/_vollbildZeigen\(vorname\) \{[\s\S]{0,400}TABS\.bandAuffrischen\(\)/.test(lesen("js/anmeldung.js")),
        "anmeldung.js frischt das Band auf, wenn das Anmelde-Bild erscheint");
    wahr(/_vollbildSchliessen\(\) \{[\s\S]{0,400}TABS\.bandAuffrischen\(\)/.test(lesen("js/anmeldung.js")),
        "… und wenn es verschwindet");
});

pruefe("Partie: das Band ist verborgen und gesperrt, das Dokument rollt wieder; zurück ohne Weg", () => {
    const w = welt();
    w.T.wechseln("sammlung");
    w.band.rolle(BREITE, true);
    w.sicht.length = 0;
    w.band.rollen.length = 0;
    w.T.wechseln("team-schach");
    w.T.rundeSetzen("team-schach", true, true, true);
    gleich(w.band.hidden, true, "Band verborgen");
    gleich(w.inhalt.hidden, false, "der alte Behälter trägt die Partie");
    wahr(!w.wurzel.classList.contains("im-band"), "html ohne im-band: das Dokument rollt wie bisher");
    wahr(w.sicht.length === 1 && w.sicht[0] === w.inhalt,
        "beiHaupt(alter Behälter) — hinter einem Blatt rückt jetzt die Partie zurück");
    gleich(w.T.offeneSeite, null, "keine Leisten-Seite offen");
    wahr(w.band.classList.contains("up-band-gesperrt"), "gesperrt");
    wahr(w.koerper.classList.contains("partie-spielt"), "body.partie-spielt");
    const partie = w.inhalt.querySelectorAll(".tab-bereich");
    gleich(partie.map((b) => b.dataset.tabId), ["team-schach"], "die Partie liegt ausserhalb des Bandes");
    wahr(partie[0].classList.contains("tab-bereich-zeigt") && !partie[0].hidden,
        "die Partie behält tab-bereich-zeigt (daran hängt body.partie-fest)");
    for (const s of w.seiten()) {
        gleich(s.children[0].children[0].hidden, false, s.dataset.upSeite + ": bleibt, wie sie ist");
    }
    /* Partie zu Ende → Start */
    w.sicht.length = 0;
    w.T.wechseln("start");
    gleich(w.band.hidden, false, "Band wieder da");
    gleich(w.inhalt.hidden, true, "alter Behälter verborgen");
    wahr(w.wurzel.classList.contains("im-band"), "html.im-band");
    wahr(w.sicht.length === 1 && w.sicht[0] === w.seite("start").children[0],
        "beiHaupt(Inhalt der Start-Seite)");
    gleich(w.band.scrollLeft, 2 * BREITE, "das Band steht auf dem Start");
    gleich(w.band.rollen, [], "ohne Weg (sofort), nicht sanft quer durch die Sammlung");
    wahr(!w.koerper.classList.contains("partie-spielt"), "partie-spielt ist weg");
    w.T.rundeSetzen("start", false);
    wahr(!w.band.classList.contains("up-band-gesperrt"), "wieder frei");
    gleich(w.T.band.ort(), "start", "ort");
});

pruefe("Ohne Band-Element (alte Proben, andere Tests) arbeitet TABS wie bis v0.160", () => {
    const w = welt({ ohneBand: true });
    w.T.wechseln("shop");
    const bereiche = w.inhalt.querySelectorAll(".tab-bereich");
    gleich(bereiche.map((b) => b.dataset.tabId + ":" + (b.hidden ? "zu" : "offen")), ["start:zu", "shop:offen"],
        "Bereiche im alten Behälter, über hidden umgeschaltet");
    gleich(w.T.band, null, "kein Band");
    wahr(!w.wurzel.classList.contains("im-band"), "kein html.im-band");
});

/* ------------------------------------------------------------------ *
 * 5. Teures nur auf der eingerasteten Seite
 * ------------------------------------------------------------------ */

pruefe("3D ruht ausserhalb von Start: START zeichnet nur, solange der Start die offene Seite ist", () => {
    const tabs = { bandEl: {}, offeneSeite: "rangliste", aktiveId: "rangliste" };
    const umgebung = { console, TABS: tabs };
    umgebung.window = umgebung;
    umgebung.globalThis = umgebung;
    vm.createContext(umgebung);
    vm.runInContext(lesen("js/start.js") + "\n;globalThis.START = START;", umgebung);
    const S = umgebung.START;
    let geleert = 0;
    S.wurzelEl = { set innerHTML(w) { geleert++; } };
    const zeichnen = () => {
        try {
            S._zeichnen();
        } catch (fehler) {
            /* ohne die übrige App kommt das Zeichnen nicht weit — hier zählt nur, OB es beginnt */
        }
    };
    /* das erste Bild entsteht immer */
    gleich(S._ruht(), false, "noch nie gezeichnet: ruht nicht");
    S._gezeichnet = true;
    gleich(S._ruht(), true, "Band steht auf der Rangliste: der Start ruht");
    let begonnen = false;
    S._unterAlsBlatt = () => { begonnen = true; throw new Error("weiter nicht"); };
    zeichnen();
    gleich(begonnen, false, "ruht: _zeichnen beginnt gar nicht (kein Turm, kein 3D-Standbild)");
    gleich(geleert, 0, "ruht: der Start behält sein letztes Bild");
    tabs.offeneSeite = null;
    zeichnen();
    gleich(begonnen, false, "Partie offen (Band verborgen): ruht");
    tabs.offeneSeite = "start";
    gleich(S._ruht(), false, "Start eingerastet: ruht nicht");
    zeichnen();
    gleich(begonnen, true, "eingerastet: _zeichnen läuft");
    /* ohne Band (Tests, alte Proben) wie bisher */
    tabs.bandEl = null;
    tabs.offeneSeite = null;
    gleich(S._ruht(), false, "ohne Band ruht der Start nie");
    /* und TABS öffnet eine Seite erst nach dem Einrasten: siehe „Band: erst nach dem Einrasten“ oben */
    const start = lesen("js/start.js");
    wahr(/_zeichnen\(\) \{\s*const wurzel = START\.wurzelEl;\s*if \(!wurzel\) \{\s*return;\s*\}\s*if \(START\._ruht\(\)\) \{\s*return;/.test(start),
        "die Sperre steht am Anfang von START._zeichnen");
});

/* ------------------------------------------------------------------ *
 * 6. Einbindung und Stile
 * ------------------------------------------------------------------ */

pruefe("app.js: neuer Vertrag — Band-Element, tabs, aktiv, wechseln, erlaubt, kommt; nichts vom alten", () => {
    const app = ohneKommentare(lesen("js/app.js"));
    wahr(/TABS\.band = UPCREW_WISCHEN\.an\(TABS\.bandEl, \{/.test(app), "UPCREW_WISCHEN.an(TABS.bandEl, …)");
    const einbau = app.slice(app.indexOf("UPCREW_WISCHEN.an("), app.indexOf("});", app.indexOf("UPCREW_WISCHEN.an(")));
    wahr(/tabs: \(\) => TABS\.bandTabs\(\)/.test(einbau), "tabs");
    wahr(/aktiv: \(\) => TABS\.offeneSeite \|\| TABS\.aktiveId/.test(einbau), "aktiv = die offene Leisten-Seite");
    wahr(/wechseln: \(id\) => TABS\.wechseln\(id, \{ vomBand: true \}\)/.test(einbau),
        "wechseln = derselbe Weg wie der Tipp, mit dem Zeichen vomBand (seit v0.162.0)");
    wahr(/kommt: \(id\) => TABS\.seiteKommt\(id\)/.test(einbau), "kommt");
    wahr(/frueh: true/.test(einbau), "frueh: true — die Leiste zieht früher nach (seit v0.162.0)");
    wahr(!/sperren:|bewegen:|nachbar:|rand:/.test(einbau), "die alten Optionen sind entfallen");
    wahr(!/maus: true/.test(einbau), "maus bleibt aus");
    wahr(/document\.getElementById\("seiten-band"\)/.test(app), "das Band kommt aus index.html");
    wahr(/TABS\.beiHaupt = /.test(app), "der Blatt-Baustein zieht mit der offenen Seite um");
    wahr(!/UPCREW_WISCHEN\.an\(ebenen,/.test(app), "kein Band auf den Blättern");
});

pruefe("index.html, sw.js: Band-Element, Baustein vor app.js, offline", () => {
    const index = lesen("index.html");
    wahr(/<div class="up-band seiten-band" id="seiten-band"><\/div>/.test(index), "#seiten-band");
    wahr(/<main class="tab-inhalt" id="tab-inhalt"><\/main>/.test(index), "#tab-inhalt bleibt (Partie)");
    wahr(index.indexOf("js/upcrew-wischen.js") !== -1 && index.indexOf("js/upcrew-wischen.js") < index.indexOf("js/app.js")
        && index.indexOf("css/upcrew-wischen.css") !== -1, "Baustein eingebunden, vor app.js");
    wahr(index.indexOf("css/upcrew-wischen.css") > index.indexOf("css/stil.css"), "Baustein-CSS nach stil.css");
    const sw = lesen("sw.js");
    wahr(sw.indexOf("\"./js/upcrew-wischen.js\"") !== -1 && sw.indexOf("\"./css/upcrew-wischen.css\"") !== -1, "offline");
});

pruefe("Stile: das Dokument rollt nicht mehr, das Band liegt fest, der Innenabstand sitzt am Kind", () => {
    const stil = lesen("css/stil.css");
    wahr(/html\.im-band,\s*html\.im-band body \{[^}]*overflow: hidden;/.test(stil), "html/body fest, overflow hidden");
    wahr(/html\.im-band,\s*html\.im-band body \{[^}]*height: 100%;/.test(stil), "feste Höhe");
    wahr(/\.seiten-band \{[^}]*position: fixed;[^}]*top: 0;[^}]*bottom: 0;[^}]*height: auto;/.test(stil), "Band fest über dem Fenster");
    wahr(/\.seiten-band\[hidden\] \{\s*display: none;/.test(stil), "ein verborgenes Band bleibt verborgen");
    wahr(/\.tab-inhalt\[hidden\] \{\s*display: none;/.test(stil), "der verborgene alte Behälter auch");
    wahr(!/\.band-seite \{[^}]*padding/.test(stil), "kein Innenabstand an der rollenden Seite (Klebendes zählt ab dem Fenster)");
    wahr(!/up-wischen/.test(stil), "die Regel der Zeiger-Fassung (.up-wischen) ist weg");
    const html = stil.slice(stil.indexOf("\nhtml {"), stil.indexOf("}", stil.indexOf("\nhtml {")));
    const body = stil.slice(stil.indexOf("\nbody {"), stil.indexOf("}", stil.indexOf("\nbody {")));
    wahr(/overscroll-behavior-x: none/.test(html) && /overscroll-behavior-x: none/.test(body),
        "html/body: seitlich ist Stopp (v0.151.15)");
    wahr(!/\.seiten-band\.up-bl-dahinter/.test(lesen("css/stil-blatt.css")),
        "hinter einem Blatt rückt der Inhalt der Seite zurück, nie das Band (es mässe sonst die falsche Breite)");
    const start = lesen("css/stil-start.css");
    wahr(/\.turm-sicht\.turm-sicht-klein \{\s*touch-action: auto;/.test(start),
        "die kleine Turm-Sicht auf dem Start nimmt dem Band den Wisch nicht (touch-action)");
    wahr(/\.start-art-halter \{[^}]*flex: 0 0 74px/.test(start), "das Quadrat am Start hat eine feste Seite (v0.151.15)");
});

pruefe("Was selbst waagrecht zieht: nichts auf einer Leisten-Seite sperrt den Wisch per touch-action", () => {
    /* Die alte Liste `sperren` (.vorschau, .brett, .bild-leiste, .karten-leiste): Brett und Bild-Leisten stehen nur in
       der Partie (ausserhalb des Bandes); `.vorschau` auf dem Start und `.karten-leiste` in der Sammlung ziehen nicht
       selbst. `up-band-fest` braucht deshalb heute nichts — wer künftig auf einer Leisten-Seite etwas waagrecht
       ziehen lässt, gibt ihm die Klasse im eigenen Markup. */
    for (const datei of ["js/start.js", "js/start-turm.js", "js/sammlung.js", "js/shop.js", "js/herausforderungen.js",
        "js/rangliste.js"]) {
        wahr(!/addEventListener\("(pointermove|touchmove)"/.test(lesen(datei)), datei + " zieht selbst");
    }
    /* der Turm zieht nur im Vollbild (hängt am body, nicht im Band) */
    wahr(/if \(!o\.klein\) \{[\s\S]{0,300}sicht\.onpointerdown/.test(lesen("js/start-turm.js")),
        "Umsehen im Turm nur im Vollbild");
});

pruefe("Wandernde Kapsel der Leiste eingebunden (v0.151.16)", () => {
    const app = lesen("js/app.js");
    wahr(/UPCREW_LEISTE\.an\(TABS\.leisteEl\)/.test(app), "UPCREW_LEISTE.an(TABS.leisteEl) fehlt in app.js");
    const index = lesen("index.html");
    const js = index.indexOf("js/upcrew-leiste.js");
    wahr(js !== -1 && js < index.indexOf("js/app.js") && index.indexOf("css/upcrew-leiste.css") !== -1
        && index.indexOf("css/upcrew-leiste.css") < js, "index.html: CSS vor JS, JS vor app.js");
    wahr(lesen("sw.js").indexOf("\"./js/upcrew-leiste.js\"") !== -1, "offline");
    wahr(/prefers-reduced-motion: reduce[\s\S]*\.up-kapsel/.test(lesen("css/upcrew-leiste.css")),
        "reduzierte Bewegung für die Kapsel");
});

console.log(anzahlOk + " ok, " + anzahlFehler + " Fehler");
process.exit(anzahlFehler === 0 ? 0 : 1);
