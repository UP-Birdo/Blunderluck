/*
 * test-sammlung-a.js — die Sammlung „Variante A" (seit v0.162.0, UPCrew Runde 8; Nutzer 03.10.2026: „es soll nicht
 * mehr nach rechts oder links scroll bar sein das hin und her wischen gehört dem tab wechsel", Wahl „1. A":
 * Kategorie-Kacheln, ein Tipp öffnet ein Blatt mit den Stücken).
 *
 * Hier läuft das ECHTE js\sammlung.js mit den ECHTEN Bausteinen (upcrew-anpassen, -sammlung, -katalog, -platz,
 * -blatt, -aussehen, -farbwelten, -intro) und den echten Modellen (js\freischaltung.js, js\brett-design.js,
 * js\turm.js, js\schach-varianten.js) an einem kleinen Dokument (tests\kleines-dom.js). Nur Fortschritt (Level, Ort
 * im Turm), die Bibliothek der Fähigkeiten, der Start und die Abzeichen sind Attrappen.
 *
 *   1. Die Listen des Spiels = die Arten des Katalogs: `BRETT_DESIGN.DESIGNS` = `brett2d`, `SAMMLUNG.THEMEN` =
 *      `brett3d`, `SAMMLUNG.FIGUREN` = `figurstil` (ohne `glas`, das noch nicht wirkt).
 *   2. Die Fläche: Kacheln statt Regal-Reihen — erst die fünf eigenen Regale, dann die Arten des Katalogs, dann
 *      Darstellung und Sets, dann die Abschnitte der reinen Sammlung. Die Stück-Knöpfe stehen im Blatt, nicht im Ort.
 *   3. Kein „Lv": Die Oberfläche nennt kein Level mehr; ohne Shop tragen gesperrte Stücke „wird erspielt".
 *   4. „NN %": `anteil()` = `tab.zaehlen()` plus die eigenen Abschnitte.
 *   5. Im Blatt: Ein freies Stück lässt sich wählen und übernehmen (eigenes Regal UND Art des Katalogs), ein
 *      gesperrtes nur ansehen, eines, das noch nicht wirkt, gar nicht antippen.
 *   6. Die reine Sammlung: Abschnitt wandert ins Blatt und zurück; ein neues Zeichnen schliesst ihr Blatt.
 *   7. Die Vorschau kommt mit der kompakten im Blatt zurecht.
 *   8. Einbindung und Stil: Reihenfolge in index.html, offline, `shop: false`, kein `besitz`; kein Baustein der
 *      Sammlung lässt etwas waagrecht rollen.
 *
 * Wie es aussieht und ob am Gerät wirklich nichts waagrecht rollt, zeigt nur der Browser (ansicht\v0.162.0,
 * Messung in UEBERGABE.md).
 *
 * Aufruf: siehe tests\README.md
 */

const fs = require("fs");
const pfad = require("path");
const vm = require("vm");
const { dokumentBauen } = require("./kleines-dom.js");

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

/* In der Reihenfolge aus index.html (soweit die Sammlung sie braucht). */
const DATEIEN = ["js/upcrew-intro.js", "js/upcrew-farbwelten.js", "js/upcrew-aussehen.js", "js/upcrew-blatt.js",
    "js/freischaltung.js", "js/upcrew-zufall.js", "js/turm.js", "js/brett-design.js", "js/schach-varianten.js", "js/upcrew-katalog.js",
    "js/upcrew-platz.js", "js/upcrew-anpassen.js", "js/upcrew-sammlung.js", "js/sammlung.js"];

/*
 * Eine Welt: Dokument, Gerätespeicher, die Attrappen — und die offene Sammlung.
 *   level      das Level (Vorgabe 0)
 *   ort        der erreichte Ort im Turm (Vorgabe 1 = Werkbank)
 *   werkstatt  Werkstatt-Modus (alles frei)
 *   start      mit Attrappen für Start und Start-Vorschau (`SAMMLUNG._vorschau` setzt dann das echte Brett ein)
 */
function welt(wahl) {
    const o = wahl || {};
    const dokument = dokumentBauen();
    const speicher = {};
    const umgebung = {
        console, setTimeout, clearTimeout,
        document: dokument,
        localStorage: {
            getItem: (k) => (k in speicher ? speicher[k] : null),
            setItem(k, v) { speicher[k] = String(v); },
            removeItem(k) { delete speicher[k]; }
        },
        location: { hostname: o.werkstatt ? "localhost" : "up-birdo.github.io",
            search: o.werkstatt ? "?werkstatt" : "", pathname: "/Blunderluck/" },
        matchMedia: () => ({ matches: false, addEventListener() {} }),
        addEventListener() {}, removeEventListener() {},
        FORTSCHRITT_KONTO: { level: () => ({ level: o.level || 0 }), turmOrt: () => o.ort || 1 },
        DIALOG: { hinweis() {} },
        RANGLISTE: {
            abzeichenListe: () => [{ id: "a", erreicht: 1 }, { id: "b", erreicht: 0 }, { id: "c", erreicht: 0 }],
            abzeichenZeigen() {}
        },
        UPCREW_ABZEICHEN: { raster: () => dokument.createElement("div") }
    };
    /* Die Bibliothek der Fähigkeiten (js\team-schach-auswertung.js) als Attrappe: Sie zeichnet in den Abschnitt. */
    umgebung.TEAM_SCHACH = {
        _infoInhaltBauen(el) {
            const raster = dokument.createElement("div");
            raster.className = "bibliothek-attrappe";
            el.appendChild(raster);
        },
        _vorschauBrett: () => ({}),
        _vorschauBauen() {
            const gitter = dokument.createElement("div");
            gitter.className = "vorschau";
            return gitter;
        }
    };
    if (o.start) {
        umgebung.START = { _spielart: () => ({ id: "standard" }) };
    }
    umgebung.window = umgebung;
    umgebung.globalThis = umgebung;
    vm.createContext(umgebung);
    for (const datei of DATEIEN) {
        vm.runInContext(lesen(datei), umgebung, { filename: datei });
    }
    const hol = (name) => vm.runInContext(name, umgebung);

    const ebenen = dokument.createElement("div");
    const haupt = dokument.createElement("main");
    const bereich = dokument.createElement("section");
    haupt.appendChild(bereich);
    dokument.body.appendChild(haupt);
    dokument.body.appendChild(ebenen);
    umgebung.UPCREW_BLATT.einrichten({ ebenen: ebenen, haupt: haupt });

    const S = hol("SAMMLUNG");
    S.aufbauen(bereich);
    S.beimOeffnen();

    const w = {
        umgebung, dokument, speicher, ebenen, bereich, S,
        K: umgebung.UPCREW_KATALOG,
        B: hol("BRETT_DESIGN"),
        A: umgebung.UPCREW_AUSSEHEN,
        ort: S.ortEl,
        /* das offene Blatt (die Fläche) oder null */
        blatt: () => ebenen.querySelector(".up-bl-blatt"),
        stueck: (wert) => ebenen.querySelector('.upa-stueck[data-wert="' + wert + '"]'),
        knopf: (klasse) => ebenen.querySelector(".upa-b-aktion ." + klasse),
        kacheln: () => S.ortEl.querySelectorAll(".upa-kat").map((k) => k.dataset.kat || ("rest:" + k.dataset.rest))
    };
    return w;
}

const EIGENE = ["brett", "design2d", "thema", "figurart", "figuren"];

/* ------------------------------------------------------------------ *
 * 1. Die Listen des Spiels = der Katalog
 * ------------------------------------------------------------------ */

pruefe("Katalog: brett2d = BRETT_DESIGN.DESIGNS, brett3d = SAMMLUNG.THEMEN, figurstil = SAMMLUNG.FIGUREN (ohne glas)", () => {
    const w = welt();
    const paare = (liste) => liste.map((s) => s.wert + "=" + s.name);
    gleich(paare(w.K.stuecke("brett2d")), paare(w.B.DESIGNS), "Brett-Design 2D: Werte, Namen, Reihenfolge");
    gleich(paare(w.K.stuecke("brett3d")), paare(w.S.THEMEN), "Brett-Design 3D");
    gleich(paare(w.K.stuecke("figurstil").filter((s) => s.wirkt)), paare(w.S.FIGUREN), "Figuren-Stil (was wirkt)");
    gleich(w.K.stuecke("figurstil").filter((s) => !s.wirkt).map((s) => s.wert), ["glas"],
        "nur Glas wirkt noch nicht — kommt es ins Spiel, zieht SAMMLUNG.FIGUREN nach");
    wahr(w.K.stuecke("brett2d").concat(w.K.stuecke("brett3d")).every((s) => s.wirkt), "alle Brett-Designs wirken");
    /* die Regal-Schlüssel des Spiels passen auf die Arten */
    gleich(["brett2d", "brett3d", "figurstil"].map((a) => w.K.art(a).regal), ["design2d", "thema", "figuren"],
        "Katalog nennt die Regale des Spiels");
    gleich(w.S.regale().map((r) => r.schluessel), EIGENE, "die fünf eigenen Regale bleiben");
    gleich(w.K.pruefen(), [], "der Katalog hält seine eigenen Regeln");
});

/* ------------------------------------------------------------------ *
 * 2. Die Fläche
 * ------------------------------------------------------------------ */

pruefe("Fläche: Kacheln statt Regal-Reihen — eigene Regale, Katalog-Arten, Darstellung, Sets, reine Sammlung", () => {
    const w = welt();
    wahr(w.ort.querySelector(".upa-vorschau-rahmen .upa-vorschau"), "die klebende Vorschau steht");
    wahr(w.ort.querySelector(".upa-kat-raster"), "das Kachel-Raster steht");
    gleich(w.ort.querySelectorAll(".upa-reihe").length, 0, "keine waagrechte Regal-Reihe mehr");
    gleich(w.ort.querySelectorAll(".upa-stueck").length, 0, "die Stück-Knöpfe stehen nicht mehr im Ort");
    const kacheln = w.kacheln();
    gleich(kacheln.slice(0, 5), EIGENE, "zuerst die eigenen Regale, in ihrer Reihenfolge");
    gleich(kacheln.slice(5, 8), ["farbwelt", "schrift", "knoepfe"], "dann Farbwelt · Schrift · Knöpfe");
    const arten = w.K.arten("blunderluck").filter((a) => a.anlegbar && !a.regal).map((a) => a.schluessel);
    gleich(kacheln.slice(5, 5 + arten.length), arten, "alle anlegbaren Arten des Katalogs für Blunderluck");
    wahr(kacheln.indexOf("kachelset") === -1 && kacheln.indexOf("einband") === -1, "keine Art nur für Typoluck");
    gleich(kacheln.slice(5 + arten.length), ["darstellung", "sets", "rest:abzeichen", "rest:faehigkeiten",
        "rest:brettformen"], "danach Darstellung, Sets und die Abschnitte der reinen Sammlung");
    gleich(w.S.tab.kategorien(), kacheln.filter((k) => k.indexOf("rest:") !== 0), "tab.kategorien()");
    /* die eigenen Regale tragen ihren Titel und zählen mit den Stücken des Katalogs */
    const text = (k) => w.ort.querySelector('.upa-kat[data-kat="' + k + '"] .upa-kat-text').textContent.replace(/\s+/g, " ").trim();
    gleich(text("brett"), "Brett1/2", "Brett");
    gleich(text("design2d"), "Brett-Design · 2D1/6", "Brett-Design 2D");
    gleich(text("thema"), "Brett-Design · 3D1/5", "Brett-Design 3D");
    gleich(text("figurart"), "Figuren1/2", "Figuren");
    gleich(text("figuren"), "Figuren-Stil · 3D1/5", "Figuren-Stil: vier des Spiels + Glas (bald)");
    /* der Würfel sitzt vorn im Balken (Gerüst-Baustein) */
    const balken = w.ort.querySelector(".upa-aktion");
    wahr(balken.children[0].classList.contains("upa-zufall"), "Würfel vorn im Balken");
    wahr(w.ort.children[w.ort.children.length - 1] === balken, "der Balken bleibt ganz unten");
    /* die Abschnitte der reinen Sammlung warten unsichtbar im Rest */
    const rest = w.ort.querySelector(".up-sm-rest");
    wahr(rest.classList.contains("up-sm-rest-kacheln"), "Rest trägt up-sm-rest-kacheln");
    gleich(rest.querySelectorAll(".up-sm-teil").map((t) => t.dataset.kennung), ["abzeichen", "faehigkeiten", "brettformen"],
        "drei Abschnitte, Abzeichen zuerst");
});

/* ------------------------------------------------------------------ *
 * 3. Kein Level in der Oberfläche, ohne Shop „wird erspielt"
 * ------------------------------------------------------------------ */

pruefe("Kein „Lv“ in der Sammlung: weder im Ort noch in einem Blatt; `ab` nennt nur Orte", () => {
    const w = welt();
    const level = /\bLv\b|\bLevel\b|\bStufe \d|ab Stufe/;
    wahr(!level.test(w.ort.textContent), "Ort: " + (level.exec(w.ort.textContent) || [""])[0]);
    for (const k of w.S.tab.kategorien()) {
        wahr(w.S.tab.blattOeffnen(k), "Blatt " + k + " öffnet");
        const text = w.blatt().textContent;
        wahr(!level.test(text), "Blatt " + k + ": " + (level.exec(text) || [""])[0]);
        w.S.tab.blattSchliessen();
    }
    gleich(w.ebenen.children.length, 0, "alle Blätter wieder zu");
    for (const regal of w.S.regale()) {
        for (const stueck of regal.stuecke) {
            wahr(!/Lv|\d/.test(stueck.ab || ""), regal.schluessel + "/" + stueck.wert + ": ab = " + stueck.ab);
        }
    }
    gleich(w.S.designRegal().stuecke.find((s) => s.wert === "farbwelt").ab, "", "Brett-Design „Farbwelt“: kein „Lv 2“ mehr");
    gleich(w.S.designRegal().stuecke.find((s) => s.wert === "holz").ab, "Holzhalle", "Holz: weiter der Ort");
    wahr(!/"Lv /.test(ohneKommentare(lesen("js/sammlung.js"))), "js\\sammlung.js setzt kein „Lv “ mehr zusammen");
});

pruefe("Ohne Shop: kaufbare gesperrte Stücke tragen „wird erspielt“, Orte bleiben Orte, nichts heisst „im Shop“", () => {
    const w = welt();
    const band = (wert) => {
        const b = w.stueck(wert).querySelector(".upa-band");
        return b ? b.textContent : "";
    };
    w.S.tab.blattOeffnen("design2d");
    gleich(band("grau"), "", "frei: kein Band");
    gleich(band("farbwelt"), "wird erspielt", "Farbwelt (heute über das Level): wird erspielt");
    gleich(band("holz"), "Holzhalle", "Holz: der Ort");
    w.S.tab.blattOeffnen("schrift");
    gleich(band("S1"), "", "Crew 1 frei");
    gleich(band("S4"), "wird erspielt", "Crew 4");
    w.S.tab.blattOeffnen("farbwelt");
    gleich(band("gold"), "wird erspielt", "Gold wird erspielt");
    gleich(band("neon"), "bald", "was noch nicht wirkt: bald");
    w.S.tab.blattOeffnen("figuren");
    gleich(band("glas"), "bald", "Glas: bald");
    gleich(band("matt"), "Holzhalle", "Matt: der Ort");
    for (const k of w.S.tab.kategorien()) {
        w.S.tab.blattOeffnen(k);
        for (const b of w.blatt().querySelectorAll(".upa-band")) {
            wahr(b.textContent !== "im Shop", k + ": „im Shop“ ohne Shop");
        }
    }
    w.S.tab.blattSchliessen();
    const quelle = ohneKommentare(lesen("js/sammlung.js"));
    wahr(/UPCREW_ANPASSEN\.zeigen\(SAMMLUNG\.ortEl, \{[\s\S]*?shop: false,[\s\S]*?\}\);/.test(quelle), "zeigen(…, { shop: false })");
    const aufruf = quelle.slice(quelle.indexOf("UPCREW_ANPASSEN.zeigen("), quelle.indexOf("});", quelle.indexOf("UPCREW_ANPASSEN.zeigen(")));
    wahr(!/besitz/.test(aufruf), "besitz wird nicht übergeben");
});

/* ------------------------------------------------------------------ *
 * 4. „NN %"
 * ------------------------------------------------------------------ */

pruefe("Anteil: anteil() = tab.zaehlen() plus die eigenen Abschnitte (Fähigkeiten, Brettformen)", () => {
    for (const wahl of [{}, { level: 5, ort: 3 }, { werkstatt: true }]) {
        const w = welt(wahl);
        const z = w.S.tab.zaehlen();
        const eigen = w.S.kartenAnzahl() + w.S.brettformen().length;
        const anteil = w.S.anteil();
        const was = JSON.stringify(wahl);
        gleich([anteil.hat, anteil.alle], [z.hat + eigen, z.alle + eigen], was + ": hat/alle");
        gleich(anteil.prozent, Math.round((z.hat + eigen) / (z.alle + eigen) * 100), was + ": Prozent");
        gleich(w.S.anteilEl.textContent, anteil.prozent + " %", was + ": Kopf");
        wahr(eigen > 0 && z.alle > 19, was + ": es wird wirklich gezählt");
    }
    /* mehr Level und ein höherer Ort heben den Anteil, die Werkstatt hebt ihn weiter */
    const p = (wahl) => welt(wahl).S.anteil().hat;
    wahr(p({}) < p({ level: 5, ort: 3 }) && p({ level: 5, ort: 3 }) < p({ werkstatt: true }), "frei zählt");
    /* die Kacheln zeigen dieselben Zahlen wie zaehlen() */
    const w = welt({ level: 2 });
    let hat = 0;
    let alle = 0;
    for (const k of w.ort.querySelectorAll(".upa-kat-eigen .upa-kat")) {
        const t = /(\d+)\/(\d+)/.exec(k.querySelector("small").textContent);
        if (t && k.dataset.kat !== "sets" && k.dataset.kat !== "darstellung") {
            hat += Number(t[1]);
            alle += Number(t[2]);
        }
    }
    gleich([hat, alle], [w.S.tab.zaehlen().hat, w.S.tab.zaehlen().alle], "Summe der Kacheln = zaehlen()");
    /* ohne den Baustein (kein Bildschirm) zählen die eigenen Regale */
    const quelle = ohneKommentare(lesen("js/sammlung.js"));
    wahr(!/UPCREW_ANPASSEN\.STUFEN/.test(quelle), "die eigene Rechnung über STUFEN ist entfallen");
    const tab = w.S.tab;
    w.S.tab = null;
    try {
        gleich(w.S.anteil().alle, 19 + w.S.kartenAnzahl() + w.S.brettformen().length, "ohne Baustein: 19 eigene Stücke");
    } finally {
        w.S.tab = tab;
    }
});

/* ------------------------------------------------------------------ *
 * 5. Wählen und Übernehmen im Blatt
 * ------------------------------------------------------------------ */

pruefe("Blatt eines eigenen Regals: ein freies Stück wählen und übernehmen", () => {
    const w = welt({ level: 2 });
    gleich(w.B.wahl(), "grau", "Ausgang: Grau");
    w.ort.querySelector('.upa-kat[data-kat="design2d"]').click();
    wahr(w.blatt() && w.blatt().classList.contains("upa-blatt-huelle"), "ein Tipp auf die Kachel öffnet das Blatt");
    gleich(w.blatt().querySelector(".up-bl-titel").textContent, "Brett-Design · 2D", "Titel");
    gleich(w.blatt().querySelector(".upa-b-zahl").textContent, "2/6", "n/m im Kopf (Level 2: Grau + Farbwelt)");
    gleich(w.blatt().querySelectorAll(".upa-raster .upa-stueck").map((s) => s.dataset.wert),
        ["grau", "farbwelt", "holz", "marmor", "nacht", "turnier"], "sechs Stücke im Raster");
    wahr(w.blatt().querySelectorAll(".upa-stueck").every((s) => s.dataset.extra === "design2d"), "Schlüssel des Spiels");
    wahr(w.stueck("grau").classList.contains("aktiv") && w.stueck("grau").getAttribute("aria-pressed") === "true",
        "das Angelegte ist markiert");
    wahr(w.blatt().querySelector(".upa-vorschau.upa-kompakt"), "kompakte Vorschau im Blatt");
    wahr(w.knopf("upa-uebernehmen").disabled, "nichts geändert: Übernehmen aus");
    w.stueck("farbwelt").click();
    gleich(w.stueck("farbwelt").getAttribute("aria-pressed"), "true", "Probe steht");
    gleich(w.B.wahl(), "grau", "die Probe ändert noch nichts");
    gleich(w.knopf("upa-uebernehmen").disabled, false, "Übernehmen an");
    gleich(w.knopf("upa-uebernehmen").textContent, "Übernehmen", "Text");
    wahr(w.ort.querySelector('.upa-kat[data-kat="design2d"]').classList.contains("upa-kat-probe"), "die Kachel zeigt die Probe");
    w.knopf("upa-uebernehmen").click();
    gleich(w.B.wahl(), "farbwelt", "übernommen: das Spiel trägt das Brett-Design");
    gleich(w.speicher["blunderluck.brett-design"], "farbwelt", "gemerkt (Gerät)");
    wahr(w.blatt(), "das Blatt bleibt offen");
    wahr(w.stueck("farbwelt").classList.contains("aktiv"), "das neue Stück ist das angelegte");
    wahr(w.knopf("upa-uebernehmen").disabled && w.knopf("upa-uebernehmen").textContent === "Übernommen", "Übernommen");
    /* Zurück verwirft eine Probe */
    w.stueck("grau").click();
    w.knopf("upa-zurueck").click();
    gleich(w.stueck("farbwelt").getAttribute("aria-pressed"), "true", "Zurück: wieder das Angelegte");
    gleich(w.B.wahl(), "farbwelt", "nichts geändert");
});

pruefe("Blatt eines eigenen Regals: ein gesperrtes Stück nur ansehen, nicht übernehmen", () => {
    const w = welt({ level: 2 });
    w.S.tab.blattOeffnen("design2d");
    const holz = w.stueck("holz");
    wahr(holz.classList.contains("zu") && !holz.disabled, "gesperrt, aber antippbar (Probe)");
    holz.click();
    gleich(w.stueck("holz").getAttribute("aria-pressed"), "true", "Probe steht");
    const knopf = w.knopf("upa-uebernehmen");
    gleich([knopf.disabled, knopf.textContent], [true, "Nicht im Besitz"], "Übernehmen gesperrt");
    const hinweis = w.ort.querySelector(".upa-hinweis");
    gleich([hinweis.hidden, hinweis.textContent.trim()], [false, "Probe · nicht im Besitz"], "Hinweis über der Vorschau");
    knopf.click();
    gleich(w.B.wahl(), "grau", "ein Tipp auf den gesperrten Knopf ändert nichts");
    gleich(w.speicher["blunderluck.brett-design"], undefined, "nichts gemerkt");
    gleich(w.B.waehlen("holz"), "grau", "und das Spiel selbst lehnt es weiter ab (BRETT_DESIGN.frei unverändert)");
    /* auch der Balken der Seite übernimmt nichts Gesperrtes */
    const seite = w.ort.querySelector(".upa-aktion .upa-uebernehmen");
    wahr(seite.disabled, "Balken der Seite: gesperrt");
    /* mit dem Ort im Turm ist Holz frei — daran ändert v0.162.0 nichts */
    const frei = welt({ ort: 2 });
    frei.S.tab.blattOeffnen("design2d");
    wahr(!frei.stueck("holz").classList.contains("zu"), "Holzhalle erreicht: Holz frei");
    frei.stueck("holz").click();
    frei.knopf("upa-uebernehmen").click();
    gleich(frei.B.wahl(), "holz", "und übernehmbar");
});

pruefe("Blatt einer Katalog-Art: Schrift wählen und übernehmen — frei wie bisher über das Level", () => {
    const w = welt({ level: 2 });
    w.ort.querySelector('.upa-kat[data-kat="schrift"]').click();
    gleich(w.blatt().querySelector(".up-bl-titel").textContent, "Schriften", "Titel aus dem Katalog");
    gleich(w.blatt().querySelectorAll(".upa-stueck").map((s) => s.dataset.wert), ["S1", "S4", "S2", "S3", "S5", "S6"],
        "sechs Schriften");
    wahr(w.blatt().querySelectorAll(".upa-stueck").every((s) => s.dataset.art === "schrift"), "data-art");
    gleich(w.blatt().querySelectorAll(".upa-stueck").filter((s) => !s.classList.contains("zu")).map((s) => s.dataset.wert),
        ["S1", "S4"], "Level 2: Crew 1 und Crew 4 frei (UPCREW_ANPASSEN.STUFEN unverändert)");
    gleich(w.A.lesen().schrift, "S1", "Ausgang");
    w.stueck("S4").click();
    w.knopf("upa-uebernehmen").click();
    gleich(w.A.lesen().schrift, "S4", "übernommen (UPCREW_AUSSEHEN)");
    w.stueck("S2").click();
    gleich([w.knopf("upa-uebernehmen").disabled, w.knopf("upa-uebernehmen").textContent], [true, "Nicht im Besitz"],
        "Crew 2 (Level 3) bleibt gesperrt");
    w.knopf("upa-uebernehmen").click();
    gleich(w.A.lesen().schrift, "S4", "nichts geändert");
    /* die Probe bleibt beim Schliessen des Blatts stehen, der Balken der Seite gilt für alles */
    w.S.tab.blattSchliessen();
    wahr(w.ort.querySelector('.upa-kat[data-kat="schrift"]').classList.contains("upa-kat-probe"), "Probe bleibt stehen");
    w.ort.querySelector(".upa-aktion .upa-zurueck").click();
    wahr(!w.ort.querySelector('.upa-kat[data-kat="schrift"]').classList.contains("upa-kat-probe"), "Zurück auf der Seite räumt auf");
});

pruefe("Was noch nicht wirkt („bald“), lässt sich ansehen, aber nicht antippen", () => {
    const w = welt({ werkstatt: true });
    w.S.tab.blattOeffnen("figuren");
    const glas = w.stueck("glas");
    wahr(glas.disabled && glas.classList.contains("upa-bald"), "Glas: abgeschaltet");
    glas.click();
    gleich(glas.getAttribute("aria-pressed"), "false", "kein Tipp kommt an");
    gleich(w.S.tab.probieren("figuren", "glas"), false, "auch nicht über probieren()");
    wahr(!w.stueck("metall").classList.contains("zu"), "Werkstatt: was das Spiel kennt, ist frei");
    w.S.tab.blattOeffnen("material");
    wahr(w.blatt().querySelectorAll(".upa-stueck").every((s) => s.disabled), "Materialien: alle noch „bald“");
    wahr(w.ort.querySelector('.upa-kat[data-kat="material"]').classList.contains("upa-kat-bald"), "die Kachel sagt es");
});

pruefe("Brett und Figuren (eigene Regale ausserhalb des Katalogs): 2D frei, 3D mit Ort", () => {
    const w = welt();
    w.S.tab.blattOeffnen("brett");
    gleich(w.blatt().querySelectorAll(".upa-stueck").map((s) => s.dataset.wert + (s.classList.contains("zu") ? ":zu" : "")),
        ["2d", "3d:zu"], "Brett");
    gleich(w.stueck("3d").querySelector(".upa-band").textContent, "Holzhalle", "3D-Brett ab Holzhalle");
    w.S.tab.blattOeffnen("figurart");
    gleich(w.stueck("3d").querySelector(".upa-band").textContent, "Marmorsaal", "3D-Figuren ab Marmorsaal");
    gleich(w.ebenen.children.length, 1, "ein neues Blatt ersetzt das alte");
});

/* ------------------------------------------------------------------ *
 * 6. Die reine Sammlung
 * ------------------------------------------------------------------ */

pruefe("Reine Sammlung: der Abschnitt wandert ins Blatt und zurück, dasselbe Element", () => {
    const w = welt();
    const rest = w.ort.querySelector(".up-sm-rest");
    const abschnitt = rest.querySelector('.up-sm-teil[data-kennung="faehigkeiten"]');
    wahr(abschnitt.classList.contains("sammel-faehigkeiten") && abschnitt.querySelector(".bibliothek-attrappe"),
        "die Bibliothek steht im Abschnitt");
    w.ort.querySelector('.upa-kat[data-rest="faehigkeiten"]').click();
    wahr(w.blatt() && w.blatt().classList.contains("up-sm-blatt"), "Blatt der reinen Sammlung");
    gleich(w.blatt().querySelector(".up-bl-titel").textContent, "Fähigkeiten", "Titel");
    wahr(w.blatt().contains(abschnitt), "derselbe Abschnitt hängt im Blatt");
    wahr(!rest.contains(abschnitt), "und nicht mehr im Rest");
    const zahl = w.blatt().querySelector(".up-sm-blatt-zahl").textContent;
    gleich(zahl, w.S.kartenAnzahl() + "/" + w.S.kartenAnzahl(), "n/m");
    w.umgebung.UPCREW_BLATT.schliessen();
    wahr(rest.contains(abschnitt), "zurück im Rest");
    gleich(rest.querySelectorAll(".up-sm-teil").map((t) => t.dataset.kennung), ["abzeichen", "faehigkeiten", "brettformen"],
        "an seinem alten Platz");
    gleich(w.S.geruest.restOeffnen("brettformen"), true, "restOeffnen(kennung)");
    gleich(w.blatt().querySelector(".up-bl-titel").textContent, "Brettformen", "Brettformen");
    gleich(w.blatt().querySelectorAll(".up-sm-stueck").length, w.S.brettformen().length, "je Spielart ein Stück");
});

pruefe("Neu zeichnen: ein offenes Blatt geht zu, die drei Kacheln der reinen Sammlung bleiben, nichts doppelt", () => {
    const w = welt();
    w.S.geruest.restOeffnen("faehigkeiten");
    w.S.beimOeffnen();
    gleich(w.ebenen.children.length, 0, "das Blatt der reinen Sammlung ist zu");
    gleich(w.kacheln().filter((k) => k.indexOf("rest:") === 0), ["rest:abzeichen", "rest:faehigkeiten", "rest:brettformen"],
        "drei Kacheln");
    w.S.tab.blattOeffnen("schrift");
    w.S.beimOeffnen();
    gleich(w.ebenen.children.length, 0, "das Blatt einer Kategorie auch");
    w.S.beimOeffnen();
    gleich(w.ort.querySelectorAll(".up-sm-kat").length, 3, "nach mehrfachem Öffnen keine doppelten Kacheln");
    gleich(w.ort.querySelectorAll(".up-sm-rest").length, 1, "ein Rest");
    gleich(w.ort.querySelectorAll('.up-sm-teil[data-kennung="abzeichen"]').length, 1, "Abzeichen einmal (frisch gebaut)");
    /* ein fremdes Blatt (Profil, Einstellungen) bleibt beim Neuzeichnen stehen */
    w.umgebung.UPCREW_BLATT.oeffnen({ titel: "Fremd", klasse: "blatt-fremd", inhalt: w.dokument.createElement("div") });
    w.S._zeigen();
    gleich(w.ebenen.children.length, 1, "fremdes Blatt unberührt");
});

/* ------------------------------------------------------------------ *
 * 7. Die Vorschau
 * ------------------------------------------------------------------ */

pruefe("Vorschau: das echte Brett in der klebenden UND in der kompakten Vorschau, Kopf nennt den Entwurf", () => {
    const w = welt({ level: 2, start: true });
    const seite = w.ort.querySelector(".upa-vorschau");
    wahr(seite.querySelector(".sammlung-buehne .vorschau") && !seite.querySelector(".upa-schach-buehne"),
        "Seite: das gezeichnete 6×6 ist durch die Start-Vorschau ersetzt");
    gleich(seite.querySelector(".upa-v-kopf span").textContent, "2D · Grau", "Kopf");
    w.S.tab.blattOeffnen("design2d");
    const kompakt = w.blatt().querySelector(".upa-vorschau.upa-kompakt");
    wahr(kompakt.querySelector(".sammlung-buehne .vorschau") && !kompakt.querySelector(".upa-schach-buehne"),
        "Blatt: die kompakte Vorschau bekommt dasselbe Brett");
    wahr(kompakt.querySelector(".vorschau") !== w.ort.querySelector(".upa-vorschau .vorschau"), "jede ihr eigenes Gitter");
    w.stueck("holz").click();
    for (const el of [w.ort.querySelector(".upa-vorschau"), w.blatt().querySelector(".upa-vorschau")]) {
        gleich(el.querySelector(".upa-v-kopf span").textContent, "2D · Holz", "Kopf zeigt die Probe");
        gleich(el.querySelector(".vorschau").style.getPropertyValue("--feld-hell"), "#ebd0a4", "das Brett trägt das Design der Probe");
        wahr(el.querySelector(".sammlung-buehne").classList.contains("brett-2d-vorschau"), "flaches 2D-Brett");
    }
    const stil = lesen("css/stil.css");
    wahr(/\.upa-kompakt \.sammlung-buehne \{\s*--sammlung-buehne-breite: 124px;/.test(stil), "kompakt: 124 px wie der Baustein");
    wahr(/\.sammlung-buehne \{\s*--sammlung-buehne-breite: 150px;/.test(stil), "Seite: 150 px wie bisher");
});

/* ------------------------------------------------------------------ *
 * 8. Einbindung und Stil
 * ------------------------------------------------------------------ */

pruefe("index.html, sw.js: Katalog und Platz vor Anpassen und Sammlung, Platz-Stil vor Anpassen-Stil, offline", () => {
    const index = lesen("index.html");
    const stelle = (name) => index.indexOf("\"" + name + "\"");
    for (const name of ["js/upcrew-katalog.js", "js/upcrew-platz.js", "css/upcrew-platz.css"]) {
        wahr(stelle(name) !== -1, name + " fehlt in index.html");
        wahr(lesen("sw.js").indexOf("\"./" + name + "\"") !== -1, name + " fehlt in sw.js");
        wahr(fs.existsSync(pfad.join(projekt, name)), name + " fehlt");
    }
    wahr(stelle("css/upcrew-platz.css") < stelle("css/upcrew-anpassen.css"), "upcrew-platz.css VOR upcrew-anpassen.css");
    wahr(stelle("css/upcrew-anpassen.css") < stelle("css/upcrew-sammlung.css"), "upcrew-sammlung.css danach");
    wahr(stelle("js/upcrew-katalog.js") < stelle("js/upcrew-platz.js"), "Katalog vor Platz");
    wahr(stelle("js/upcrew-platz.js") < stelle("js/upcrew-anpassen.js")
        && stelle("js/upcrew-platz.js") < stelle("js/upcrew-sammlung.js"), "Platz vor Anpassen und Sammlung");
    wahr(stelle("js/upcrew-blatt.js") < stelle("js/sammlung.js"), "der Blatt-Baustein ist geladen, bevor die Sammlung zeichnet");
    /* nicht dabei: Besitz und der neue Shop */
    wahr(!fs.existsSync(pfad.join(projekt, "js", "upcrew-besitz.js")) && stelle("js/upcrew-besitz.js") === -1,
        "upcrew-besitz.js gehört nicht in diese Version");
});

pruefe("Stil: kein Baustein der Sammlung lässt etwas waagrecht rollen; die Sammlung hat keine eigene Roll-Regel", () => {
    for (const name of ["css/upcrew-anpassen.css", "css/upcrew-sammlung.css", "css/upcrew-platz.css"]) {
        const css = ohneKommentare(lesen(name));
        wahr(!/overflow-x\s*:\s*(auto|scroll)/.test(css), name + ": overflow-x auto|scroll");
        wahr(!/overflow\s*:\s*(auto|scroll)/.test(css), name + ": overflow auto|scroll");
        wahr(!/scroll-snap/.test(css), name + ": scroll-snap");
    }
    wahr(!/\.upa-reihe|\.upa-regal/.test(ohneKommentare(lesen("css/upcrew-anpassen.css"))), "die Regal-Reihe ist aus dem Baustein verschwunden");
    for (const name of ["css/stil.css", "css/stil-start.css", "css/stil-blatt.css", "css/stil-effekte.css"]) {
        wahr(!/\.upa-reihe/.test(lesen(name)), name + " kennt .upa-reihe noch");
    }
    /* js\sammlung.js zieht nichts selbst (kein eigener Wisch auf der Seite) */
    wahr(!/addEventListener\("(pointermove|touchmove|wheel)"/.test(lesen("js/sammlung.js")), "sammlung.js zieht selbst");
});

console.log(anzahlOk + " ok, " + anzahlFehler + " Fehler");
process.exit(anzahlFehler === 0 ? 0 : 1);
