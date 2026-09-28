/*
 * test-oberflaeche-7.js — v0.156.0, gemeinsame Runde 7 „Oberfläche" (Entwurf
 * Design\3D-Schrift\entwuerfe\Oberflaeche-Runde-7, vom Nutzer abgenommen
 * 28.09.2026).
 *
 * Geprüft gegen ein kleines nachgebautes DOM (kein Browser, keine Datenbank):
 *   1. js\upcrew-blatt.js — Blätter stapeln, Karten über allem, Schliessen
 *      (Knopf, Grund, Esc), der Start dahinter, nur die Karte ist modal.
 *   2. js\tabs.js + Blatt — Leisten-Tabs öffnen als Blatt über dem Start und
 *      ersetzen einander, Einstellungen → Verwaltung stapeln, „Verwaltung
 *      beenden" legt nur die Verwaltung weg, Start und Partie schliessen
 *      alles, ✕ führt zum Start zurück.
 *   3. js\upcrew-serie.js — Werte, Kapsel, Karte mit „Schild kaufen".
 *   4. js\upcrew-abzeichen.js (Vorschlag) + upcrew-abzeichen-spiele.js — eine
 *      Liste für alle Spiele, ausrüsten, einmalige Abzeichen.
 *   5. js\upcrew-profil.js — Kopf, drei Plätze, Auswahl höchstens drei.
 *   6. js\upcrew-einstellungen.js — feste Reihenfolge, „Nur in …", Schalter.
 *   7. js\upcrew-sammlung.js (Vorschlag) — der Würfel im Balken.
 *   8. Einbindung: index.html, sw.js, Leiste, keine Serie mehr in den
 *      Herausforderungen, Profil-Wege, Zähler `az…` nur höher.
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
        console.error("        " + (fehler && fehler.stack ? fehler.stack.split("\n").slice(0, 3).join(" | ") : fehler));
    }
}

function gleich(ist, soll, was) {
    if (JSON.stringify(ist) !== JSON.stringify(soll)) {
        throw new Error(was + ": ist " + JSON.stringify(ist) + ", soll " + JSON.stringify(soll));
    }
}

function dasselbe(ist, soll, was) {
    if (ist !== soll) {
        throw new Error(was + ": nicht dasselbe Element");
    }
}

function wahr(bedingung, was) {
    if (!bedingung) {
        throw new Error(was);
    }
}

const projekt = pfad.join(__dirname, "..");
const lesen = (name) => fs.readFileSync(pfad.join(projekt, name), "utf8");

/* ------------------------------------------------------------------ *
 * Ein kleines DOM
 * ------------------------------------------------------------------ */

function neuesElement(tag) {
    const el = {
        tagName: String(tag).toUpperCase(),
        nodeType: 1,
        kinder: [],
        parentNode: null,
        attribute: {},
        dataset: {},
        hidden: false,
        offsetWidth: 40,
        offsetHeight: 20,
        _text: "",
        _hoerer: {},
        style: { setProperty(n, w) { this[n] = w; } },
        get className() { return this.attribute["class"] || ""; },
        set className(w) { this.attribute["class"] = String(w); },
        get textContent() {
            return this._text + this.kinder.map((k) => k.textContent).join("");
        },
        set textContent(w) { this.kinder = []; this._text = String(w); },
        set innerHTML(w) { this.kinder.forEach((k) => { k.parentNode = null; }); this.kinder = []; this._text = ""; },
        get innerHTML() { return ""; },
        get firstChild() { return this.kinder[0] || null; },
        appendChild(k) {
            if (k.parentNode) {
                k.parentNode.removeChild(k);
            }
            this.kinder.push(k);
            k.parentNode = this;
            return k;
        },
        insertBefore(k, vor) {
            if (k.parentNode) {
                k.parentNode.removeChild(k);
            }
            const i = this.kinder.indexOf(vor);
            if (i === -1) {
                this.kinder.push(k);
            } else {
                this.kinder.splice(i, 0, k);
            }
            k.parentNode = this;
            return k;
        },
        removeChild(k) {
            this.kinder = this.kinder.filter((x) => x !== k);
            k.parentNode = null;
            return k;
        },
        setAttribute(n, w) { this.attribute[n] = String(w); },
        getAttribute(n) { return (n in this.attribute) ? this.attribute[n] : null; },
        removeAttribute(n) { delete this.attribute[n]; },
        addEventListener(art, f) { (this._hoerer[art] = this._hoerer[art] || []).push(f); },
        removeEventListener() { },
        ausloesen(art, ereignis) {
            const e = Object.assign({ preventDefault() { }, stopPropagation() { }, target: this, currentTarget: this }, ereignis || {});
            for (const f of (this._hoerer[art] || [])) {
                f(e);
            }
        },
        focus() { },
        querySelector(wahl) {
            return this.querySelectorAll(wahl)[0] || null;
        },
        querySelectorAll(wahl) {
            const treffer = [];
            const passt = baueWahl(wahl);
            const suchen = (e) => {
                for (const k of e.kinder) {
                    if (passt(k)) {
                        treffer.push(k);
                    }
                    suchen(k);
                }
            };
            suchen(this);
            return treffer;
        }
    };
    el.classList = {
        add(...n) { const l = el.className.split(" ").filter(Boolean); for (const x of n) { if (l.indexOf(x) === -1) { l.push(x); } } el.className = l.join(" "); },
        remove(...n) { el.className = el.className.split(" ").filter((x) => x && n.indexOf(x) === -1).join(" "); },
        toggle(n, an) { const soll = (an === undefined) ? !this.contains(n) : !!an; if (soll) { this.add(n); } else { this.remove(n); } return soll; },
        contains(n) { return el.className.split(" ").indexOf(n) !== -1; }
    };
    return el;
}

/* Versteht „.klasse", „.a.b", „.klasse:not([hidden])", „tag". */
function baueWahl(wahl) {
    const nichtVersteckt = /:not\(\[hidden\]\)$/.test(wahl);
    const kern = wahl.replace(/:not\(\[hidden\]\)$/, "");
    const klassen = (kern.match(/\.[a-zA-Z0-9_-]+/g) || []).map((k) => k.slice(1));
    const tag = /^[a-z]+/.test(kern) ? kern.match(/^[a-z]+/)[0].toUpperCase() : "";
    return (e) => (!tag || e.tagName === tag)
        && klassen.every((k) => e.classList && e.classList.contains(k))
        && (!nichtVersteckt || !e.hidden);
}

function textNode(t) {
    const k = neuesElement("#text");
    k.nodeType = 3;
    k._text = String(t);
    return k;
}

function neueWelt(zusatz) {
    const koerper = neuesElement("body");
    const dokHoerer = {};
    const dokument = {
        body: koerper,
        createElement: neuesElement,
        createElementNS: (ns, t) => neuesElement(t),
        createTextNode: textNode,
        addEventListener(art, f) { (dokHoerer[art] = dokHoerer[art] || []).push(f); },
        querySelectorAll: (w) => koerper.querySelectorAll(w),
        getElementById: () => null
    };
    const umgebung = Object.assign({ console, document: dokument, Element: undefined, setTimeout, clearTimeout,
        _taste: (key) => (dokHoerer.keydown || []).forEach((f) => f({ key: key })) }, zusatz || {});
    umgebung.window = umgebung;
    umgebung.globalThis = umgebung;
    vm.createContext(umgebung);
    return umgebung;
}

function laden(welt, dateien, namen) {
    vm.runInContext(dateien.map(lesen).join("\n;\n") + "\n" + (namen || []).map((n) => "globalThis." + n + " = " + n + ";").join("\n"), welt);
}

function sucheText(el, text) {
    if (el.textContent === text || el.getAttribute("aria-label") === text) {
        return el;
    }
    for (const k of el.kinder) {
        const t = sucheText(k, text);
        if (t) {
            return t;
        }
    }
    return null;
}

/* ------------------------------------------------------------------ *
 * 1. upcrew-blatt.js
 * ------------------------------------------------------------------ */

pruefe("Blatt: öffnen, stapeln, Zurück/✕, Karte über allem, Esc", () => {
    const w = neueWelt();
    laden(w, ["js/upcrew-blatt.js"]);
    const B = w.UPCREW_BLATT;
    const ebenen = neuesElement("div");
    const haupt = neuesElement("main");
    B.einrichten({ ebenen: ebenen, haupt: haupt });

    const zu = [];
    const inhalt = neuesElement("section");
    const eins = B.oeffnen({ titel: "Profil", inhalt: inhalt, beimSchliessen: (wie) => zu.push("profil:" + wie) });
    wahr(haupt.classList.contains("up-bl-dahinter"), "der Start rückt nach hinten");
    wahr(w.document.body.classList.contains("up-bl-offen"), "body weiss, dass etwas offen ist");
    gleich(eins.flaeche.getAttribute("aria-modal"), null, "ein Blatt ist nicht modal (Leiste und Wischen bleiben)");
    wahr(!!sucheText(eins.el, "Schließen"), "das erste Blatt hat ein ✕");
    wahr(!sucheText(eins.el, "Zurück"), "… und keinen Zurück-Pfeil");
    dasselbe(inhalt.parentNode, eins.inhalt, "das Element hängt im Blatt");

    const zwei = B.oeffnen({ titel: "Einstellungen", inhalt: (el) => el.appendChild(neuesElement("p")),
        beimSchliessen: (wie) => zu.push("einst:" + wie) });
    wahr(zwei.el.classList.contains("up-bl-oben-drauf"), "das zweite liegt oben drauf");
    wahr(!!sucheText(zwei.el, "Zurück") && !sucheText(zwei.el, "Schließen"), "gestapelt: Zurück statt ✕");
    gleich(B.blaetter(), 2, "zwei Blätter");

    const karte = B.oeffnen({ art: "karte", titel: "Serie", inhalt: (el) => el.appendChild(textNode("x")) });
    gleich(karte.flaeche.getAttribute("aria-modal"), "true", "die Karte ist modal");
    wahr(karte.el.classList.contains("up-bl-karte-ebene"), "Karten-Ebene");
    gleich(B.blaetter(), 2, "eine Karte zählt nicht als Blatt");

    w._taste("Escape");
    gleich(B.anzahl(), 2, "Esc schliesst die Karte");
    sucheText(zwei.el, "Zurück").ausloesen("click");
    gleich(zu, ["einst:knopf"], "Zurück schliesst das obere Blatt");
    zwei.el.kinder[0].ausloesen("click");
    eins.el.kinder[0].ausloesen("click");
    gleich(zu, ["einst:knopf", "profil:grund"], "Tipp auf den Grund schliesst");
    gleich(B.anzahl(), 0, "alles zu");
    wahr(!haupt.classList.contains("up-bl-dahinter"), "der Start ist wieder vorn");
    dasselbe(inhalt.parentNode, null, "das Element ist nur abgehängt");
    gleich(ebenen.kinder.length, 0, "keine Ebene bleibt liegen");

    B.oeffnen({ titel: "a" });
    B.oeffnen({ titel: "b" });
    B.alleSchliessen();
    gleich(B.anzahl(), 0, "alleSchliessen");
});

/* ------------------------------------------------------------------ *
 * 2. TABS mit Blättern
 * ------------------------------------------------------------------ */

function tabsWelt() {
    const w = neueWelt();
    laden(w, ["js/upcrew-blatt.js", "js/tabs.js"], ["TABS"]);
    const T = w.TABS;
    const leiste = neuesElement("nav");
    const inhalt = neuesElement("main");
    const ebenen = neuesElement("div");
    w.UPCREW_BLATT.einrichten({ ebenen: ebenen, haupt: inhalt });
    const log = [];
    const tab = (id, extra) => Object.assign({
        id: id, titel: id,
        aufbauen(b) { log.push("auf:" + id); b.appendChild(textNode(id)); },
        beimOeffnen() { log.push("offen:" + id); },
        beimVerlassen() { log.push("weg:" + id); }
    }, extra || {});
    for (const t of [tab("shop", { alsBlatt: true }), tab("sammlung", { alsBlatt: true }), tab("start"),
        tab("herausforderungen", { alsBlatt: true }), tab("rangliste", { alsBlatt: true }),
        tab("team-schach", { inLeiste: false }), tab("einstellungen", { inLeiste: false, alsBlatt: true }),
        tab("verwaltung", { inLeiste: false, alsBlatt: true })]) {
        T.registrieren(t);
    }
    T.starten(leiste, inhalt, "start");
    return { w, T, leiste, inhalt, ebenen, log, B: w.UPCREW_BLATT };
}

const markiert = (leiste) => leiste.kinder.filter((k) => k.getAttribute("aria-current") === "page")
    .map((k) => k.dataset.tabId);

pruefe("Tabs: Leisten-Tabs als Blatt über dem Start, einander ersetzend", () => {
    const { T, leiste, inhalt, B, log } = tabsWelt();
    gleich(leiste.kinder.map((k) => k.dataset.tabId), ["shop", "sammlung", "start", "herausforderungen", "rangliste"],
        "Leiste: Shop · Sammlung · Start · Aufgaben · Rangliste");
    T.wechseln("shop");
    gleich(T.aktiveId, "shop", "Shop ist aktiv");
    gleich(B.blaetter(), 1, "als Blatt");
    gleich(markiert(leiste), ["shop"], "Leiste markiert den Shop");
    const start = inhalt.kinder.find((k) => k.dataset.tabId === "start");
    wahr(start && !start.hidden, "der Start bleibt sichtbar dahinter");
    wahr(!inhalt.kinder.some((k) => k.dataset.tabId === "shop"), "der Shop-Bereich liegt nicht im Hauptteil");
    T.wechseln("rangliste");
    gleich(B.blaetter(), 1, "Rangliste ersetzt den Shop");
    wahr(log.indexOf("weg:shop") !== -1, "der Shop räumt auf");
    gleich(markiert(leiste), ["rangliste"], "Leiste folgt");
    T.wechseln("start");
    gleich(B.anzahl(), 0, "Start schliesst alles");
    gleich(T.aktiveId, "start", "Start aktiv");
});

pruefe("Tabs: Einstellungen → Verwaltung stapeln, Verwaltung beenden legt nur sie weg", () => {
    const { T, B, log } = tabsWelt();
    B.oeffnen({ titel: "Profil" });              // das Profil (kein Tab)
    T.wechseln("einstellungen");
    gleich(B.blaetter(), 2, "Einstellungen über dem Profil");
    T.wechseln("verwaltung");
    gleich(B.blaetter(), 3, "Verwaltung über den Einstellungen");
    gleich(T.aktiveId, "verwaltung", "Verwaltung aktiv");
    log.length = 0;
    T.wechseln("einstellungen");                 // ANMELDUNG.verwaltungBeenden
    gleich(B.blaetter(), 2, "nur die Verwaltung ist zu");
    gleich(T.aktiveId, "einstellungen", "zurück in den Einstellungen");
    wahr(log.indexOf("offen:einstellungen") !== -1, "die Einstellungen zeichnen neu");
    B.schliessen("knopf");
    gleich(T.aktiveId, "start", "✕ an den Einstellungen → Start");
    gleich(B.blaetter(), 1, "das Profil liegt noch");
});

pruefe("Tabs: die Partie ist ein eigener Bildschirm und schliesst alle Blätter", () => {
    const { T, B, inhalt } = tabsWelt();
    T.wechseln("sammlung");
    B.oeffnen({ art: "karte", titel: "Serie" });
    T.wechseln("team-schach");
    gleich(B.anzahl(), 0, "keine Blätter über der Partie");
    const partie = inhalt.kinder.find((k) => k.dataset.tabId === "team-schach");
    wahr(partie && !partie.hidden, "die Partie ist sichtbar");
    T.wechseln("herausforderungen");
    gleich(B.blaetter(), 1, "aus der Partie ein Blatt …");
    const start = inhalt.kinder.find((k) => k.dataset.tabId === "start");
    wahr(!start.hidden && partie.hidden, "… über dem Start, nicht über der Partie");
});

/* ------------------------------------------------------------------ *
 * 3. upcrew-serie.js
 * ------------------------------------------------------------------ */

pruefe("Serie: Werte sauber, Kapsel mit Woche und zwei Schilden, Karte mit Kauf", () => {
    const w = neueWelt();
    laden(w, ["js/upcrew-flamme.js", "js/upcrew-serie.js"]);
    const S = w.UPCREW_SERIE;
    const s = S.sauber({ serie: 12.7, woche: [true, true], schild: -1, schutz: 1, schutzAlle: 1 });
    gleich(s.woche.length, 7, "immer sieben Tage");
    gleich(s.woche.slice(-2), [true, true], "heute zuletzt");
    gleich([s.serie, s.schild], [12, 0], "ganze Zahlen, nie negativ");

    const halter = neuesElement("div");
    let getippt = 0;
    const k = S.kapsel(halter, { beiKlick: () => getippt++ });
    k.setzen({ serie: 5, heute: true, woche: [0, 0, 0, 1, 1, 1, 1].map(Boolean), schild: 1, schutz: 0, schutzAlle: 1 });
    gleich(k.el.getAttribute("aria-label"), "Serie 5 Tage · Flammen-Schild 1 · Serien-Schutz 0", "Beschriftung");
    gleich(k.el.querySelectorAll(".up-se-woche")[0].kinder.length, 7, "sieben Flammen hinter dem Kreis");
    gleich(k.el.querySelectorAll(".up-se-schild").length, 2, "zwei Schilde");
    wahr(k.el.querySelector(".up-se-level").classList.contains("up-se-leer"), "leerer Schutz blass");
    k.el.ausloesen("click");
    k.el.ausloesen("keydown", { key: "Enter" });
    gleich(getippt, 2, "Tipp und Enter öffnen");

    const karte = neuesElement("div");
    let gekauft = 0;
    S.karteFuellen(karte, { serie: 1, schild: 2, schildMax: 2, schutz: 1, schutzAlle: 1 }, { beiKauf: () => gekauft++ });
    const kauf = sucheText(karte, "Schild kaufen");
    wahr(!!kauf, "Knopf Schild kaufen");
    gleich(kauf.disabled, true, "voll → gesperrt");
    wahr(!!sucheText(karte, "2 / 2") && !!sucheText(karte, "1 / 1"), "beide Schilde mit Zahl");
    const karte2 = neuesElement("div");
    S.karteFuellen(karte2, { serie: 3, schild: 0, schildMax: 2 }, { beiKauf: () => gekauft++ });
    sucheText(karte2, "Schild kaufen").ausloesen("click");
    gleich(gekauft, 1, "Kaufen ruft die App");
});

/* ------------------------------------------------------------------ *
 * 4. Abzeichen: eine Liste für alle Spiele
 * ------------------------------------------------------------------ */

pruefe("Abzeichen: gemeinsame + Spiele, einmalige, ausrüsten nur verdiente (höchstens 3)", () => {
    const w = neueWelt();
    laden(w, ["js/upcrew-abzeichen.js", "js/upcrew-abzeichen-spiele.js"]);
    const A = w.UPCREW_ABZEICHEN;
    const bl = w.UPCREW_ABZEICHEN_SPIELE.blunderluck.abzeichen;
    gleich(bl.length, 14, "14 Blunderluck-Abzeichen");
    wahr(bl.every((e) => /^bl-/.test(e.kennung) && /^az[A-Za-z]+$/.test(e.feld)), "Kennung bl-…, Zähler az… nur Buchstaben");
    gleich(new Set(bl.map((e) => e.feld)).size, 14, "jeder Zähler einmal");

    const stand = { spiele: { blunderluck: { partien: 12, zaehler: { azErsterSieg: 1, azLegende: 0 } },
        typoluck: { partien: 3 } } };
    const alle = A.alle(stand, 0);
    gleich(alle.length, 5 + 14, "fünf gemeinsame + 14");
    const partien = alle.find((e) => e.kennung === "up-partien");
    gleich([partien.marke, partien.wert, partien.erreicht], ["UP", 15, 1], "gemeinsam über beide Spiele (12 + 3)");
    const sieg = alle.find((e) => e.kennung === "bl-erster-sieg");
    gleich([sieg.marke, sieg.erreicht, sieg.naechste, sieg.weiter], ["BL", 1, null, 0], "einmalig, keine weiteren Stufen");
    gleich(alle.find((e) => e.kennung === "bl-legende").erreicht, 0, "nicht verdient");

    const an = A.ausgeruestet(alle, ["bl-legende", "bl-erster-sieg", "up-partien", "tl-gibtsnicht", "up-besteSerie"], 3);
    gleich(an.map((e) => e.kennung), ["bl-erster-sieg", "up-partien"], "nur verdiente, in Reihenfolge");
    const alt = A.ausgeruestet(alle, ["erster-sieg"], 3, (k) => "bl-" + k);
    gleich(alt.map((e) => e.kennung), ["bl-erster-sieg"], "alte Kennung übersetzt");

    const kachel = A.kachel(sieg, null);
    wahr(!!kachel.querySelector(".up-az-marke"), "Marke auf der Kachel");
    gleich(A.liste(stand, 0).length, 5, "die alte Liste bleibt die fünf gemeinsamen");
});

/* ------------------------------------------------------------------ *
 * 5. upcrew-profil.js
 * ------------------------------------------------------------------ */

pruefe("Profil: Kopf mit #Tag und XP, drei Plätze, Auswahl höchstens drei", () => {
    const w = neueWelt();
    laden(w, ["js/upcrew-abzeichen.js", "js/upcrew-profil.js"]);
    const P = w.UPCREW_PROFIL;
    const eintrag = (k, erreicht) => ({ kennung: k, id: k, titel: k, kurz: k, zeichen: "partie", stufen: [1], weiter: 0,
        wert: erreicht, erreicht: erreicht, einheit: "" });
    const ort = neuesElement("div");
    let tipp = 0;
    P.zeichnen(ort, { name: "Anna", tag: "#0042", level: 7, anteil: 0.5, xpText: "50 / 100 XP bis Level 8",
        abzeichen: [eintrag("a", 1), eintrag("b", 1)], plaetze: 3,
        spielzeit: { wert: "1h+", zeilen: ["Blunderluck 1h+"], oeffentlich: false }, seit: "01.09.2026",
        orte: [{ spiel: "Blunderluck", titel: "Turm · Werkbank", anteil: 0.2 }] }, { beiAbzeichen: () => tipp++ });
    wahr(!!sucheText(ort, "#0042"), "klein #Tag");
    wahr(!!sucheText(ort, "Anna#0042"), "Name + Tag in einer Zeile");
    gleich(ort.querySelectorAll(".up-pf-platz").length, 3, "drei Plätze");
    gleich(ort.querySelectorAll(".up-pf-leer").length, 1, "ein freier Platz");
    ort.querySelector(".up-pf-leer").ausloesen("click");
    gleich(tipp, 1, "Tipp auf einen Platz öffnet die Auswahl");
    wahr(!!sucheText(ort, "01.09.2026") && !!sucheText(ort, "Turm · Werkbank"), "dabei seit, Ort");

    const wahl = neuesElement("div");
    const gewechselt = [];
    const alle = ["a", "b", "c", "d"].map((k) => eintrag(k, 1)).concat([eintrag("zu", 0)]);
    const griff = P.abzeichenWahl(wahl, alle, ["a", "b", "c"], { plaetze: 3, beiWechsel: (l) => gewechselt.push(l.join()) });
    wahl.querySelectorAll(".up-az")[3].ausloesen("click");      // d dazu → a fällt raus
    gleich(griff.wahl(), ["b", "c", "d"], "beim Vierten fällt das älteste heraus");
    wahl.querySelectorAll(".up-az")[4].ausloesen("click");      // nicht verdient
    gleich(griff.wahl(), ["b", "c", "d"], "nicht verdient: keine Änderung");
    wahl.querySelectorAll(".up-az")[1].ausloesen("click");      // b ab
    gleich(griff.wahl(), ["c", "d"], "abwählen");
    gleich(gewechselt, ["b,c,d", "c,d"], "jede Änderung gemeldet");
});

/* ------------------------------------------------------------------ *
 * 6. upcrew-einstellungen.js
 * ------------------------------------------------------------------ */

pruefe("Einstellungen/Verwaltung: feste Reihenfolge, Abschnitt „Nur in …“, Schalter", () => {
    const w = neueWelt();
    laden(w, ["js/upcrew-einstellungen.js"]);
    const E = w.UPCREW_EINSTELLUNGEN;
    const ort = neuesElement("div");
    const z = (t) => ({ titel: t });
    const reihe = E.bauen(ort, "einstellungen", [
        { art: "gefahr", zeilen: [z("Konto löschen")] }, { art: "ueber", zeilen: [z("Über")] },
        { art: "spiel", zeilen: [z("Vibration")] }, { art: "konto", zeilen: [z("Anna")] },
        { art: "admin", zeilen: [] }, { art: "aussehen", zeilen: [z("Darstellung")] }
    ], { spiel: "Blunderluck" });
    gleich(reihe, ["konto", "aussehen", "spiel", "ueber", "gefahr"], "Reihenfolge; leere Abschnitte fallen weg");
    gleich(ort.querySelectorAll(".up-es-spiel")[0].kinder[0].textContent, "Nur in Blunderluck", "Abschnitt des Spiels");
    gleich(E.REIHENFOLGE.verwaltung, ["spieler", "datenbank", "spiel", "ende"], "Verwaltung gleich aufgebaut");

    let geklickt = 0;
    const knopf = E.zeile({ titel: "Verwaltung", rechts: "pfeil", beiKlick: () => geklickt++ });
    gleich([knopf.tagName, knopf.getAttribute("aria-label")], ["BUTTON", "Verwaltung"], "Zeile mit Klick ist ein Knopf");
    knopf.ausloesen("click");
    gleich(geklickt, 1, "Klick");
    const nur = E.zeile({ titel: "Anna", tag: "#1" });
    gleich(nur.tagName, "DIV", "Anzeige ohne Klick");

    const werte = [];
    const sch = E.schalter(false, (an) => werte.push(an), "Test");
    sch.ausloesen("click");
    sch.ausloesen("click");
    gleich([werte, sch.getAttribute("aria-checked"), sch.getAttribute("role")], [[true, false], "false", "switch"], "Schalter");
    const gewaehlt = [];
    const seg = E.segment([{ wert: 1, text: "A" }, { wert: 2, text: "B" }], 1, (v) => gewaehlt.push(v), "S");
    seg.kinder[0].ausloesen("click");
    seg.kinder[1].ausloesen("click");
    gleich(gewaehlt, [2], "Segment meldet nur eine andere Wahl");
});

/* ------------------------------------------------------------------ *
 * 7. Sammlung: Würfel im Balken
 * ------------------------------------------------------------------ */

pruefe("Sammlung: der Würfel Zufall sitzt vorn im Balken Zurück · Übernehmen", () => {
    const w = neueWelt();
    laden(w, ["js/upcrew-sammlung.js"]);
    const U = w.UPCREW_SAMMLUNG;
    const b = neuesElement("section");
    const g = U.bauen(b, { titel: "Sammlung" });
    /* So baut upcrew-anpassen.js den Ort (Leiste mit Würfel oben, Balken unten). */
    const leiste = neuesElement("div");
    leiste.className = "upa-leiste";
    const wuerfel = neuesElement("button");
    wuerfel.className = "up-kn up-zweit up-rund upa-zufall";
    leiste.appendChild(wuerfel);
    const balken = neuesElement("div");
    balken.className = "upa-aktion";
    const zurueck = neuesElement("button");
    zurueck.className = "upa-zurueck";
    balken.appendChild(zurueck);
    g.ort.appendChild(leiste);
    g.ort.appendChild(balken);
    g.restEinsetzen(U.rest());
    dasselbe(wuerfel.parentNode, balken, "im Balken");
    dasselbe(balken.kinder[0], wuerfel, "vorn");
    gleich(g.wuerfelUnten(), true, "ein zweiter Aufruf schadet nicht");
    gleich(balken.kinder.length, 2, "nichts doppelt");
});

/* ------------------------------------------------------------------ *
 * 8. Einbindung
 * ------------------------------------------------------------------ */

const seite = lesen("index.html");
const sw = lesen("sw.js");
const NEU = ["css/upcrew-blatt.css", "css/upcrew-serie.css", "css/upcrew-profil.css", "css/upcrew-einstellungen.css",
    "css/stil-blatt.css", "js/upcrew-blatt.js", "js/upcrew-serie.js", "js/upcrew-profil.js",
    "js/upcrew-einstellungen.js", "js/upcrew-abzeichen-spiele.js", "js/profil.js"];

pruefe("Einbindung: neue Dateien in index.html und offline in sw.js, Halter #ebenen", () => {
    for (const datei of NEU) {
        wahr(seite.indexOf("\"" + datei + "\"") !== -1, datei + " fehlt in index.html");
        wahr(sw.indexOf("\"./" + datei + "\"") !== -1, datei + " fehlt in sw.js");
    }
    wahr(/<div class="up-bl-halter" id="ebenen"><\/div>/.test(seite), "Halter #ebenen");
    const vor = (a, b) => seite.indexOf("src=\"" + a + "\"") !== -1
        && seite.indexOf("src=\"" + a + "\"") < seite.indexOf("src=\"" + b + "\"");
    wahr(vor("js/upcrew-blatt.js", "js/tabs.js"), "Blatt vor tabs.js");
    wahr(vor("js/upcrew-abzeichen.js", "js/upcrew-abzeichen-spiele.js"), "Daten nach dem Baustein");
    wahr(vor("js/upcrew-flamme.js", "js/upcrew-serie.js"), "Serie nach der Flamme");
    wahr(vor("js/upcrew-einstellungen.js", "js/einstellungen.js"), "Aufbau vor den Einstellungen");
    wahr(vor("js/upcrew-profil.js", "js/profil.js") && vor("js/profil.js", "js/app.js"), "Profil vor app.js");
    const links = [...seite.matchAll(/href="css\/([^"]+)"/g)].map((t) => t[1]);
    wahr(links.indexOf("stil-blatt.css") === links.length - 1, "stil-blatt.css lädt zuletzt");
});

pruefe("Einbindung: sechs Tabs als Blatt, die Partie nicht; Wischen auch auf den Blättern", () => {
    const app = lesen("js/app.js");
    const zeile = app.match(/for \(const tab of \[([A-Z_, ]+)\]\) \{\s*tab\.alsBlatt = true;/);
    wahr(!!zeile, "Schleife alsBlatt");
    gleich(zeile[1].split(/,\s*/), ["SHOP", "SAMMLUNG", "HERAUSFORDERUNGEN", "RANGLISTE", "EINSTELLUNGEN",
        "VERWALTUNGS_BILDSCHIRM"], "Blätter");
    wahr(/UPCREW_WISCHEN\.an\(ebenen,/.test(app), "Wischen auf #ebenen");
});

pruefe("Kopf: Serie in der Kapsel, nicht mehr in den Herausforderungen; Profil als Blatt", () => {
    const hf = lesen("js/herausforderungen.js");
    wahr(hf.indexOf("_serieBauen") === -1 && hf.indexOf("heute-serie") === -1, "keine Serie in den Herausforderungen");
    const start = lesen("js/start.js");
    wahr(/UPCREW_SERIE\.kapsel\(/.test(start), "Kapsel im Kopf");
    wahr(/TABS\.wechseln\("shop"\)/.test(start), "Schild kaufen → Shop");
    wahr((start.match(/START\.profilOeffnen\(\)/g) || []).length >= 2, "Kurzprofil und Menü öffnen das Profil-Blatt");
    wahr(/@media \(max-width: 379px\)[\s\S]{0,80}\.start-profil-text[\s\S]{0,40}display: none/.test(lesen("css/stil-blatt.css")),
        "unter 380 px nur der Ring");
    const profil = lesen("js/profil.js");
    wahr(/UPCREW_PROFIL\.zahnrad\(\(\) => TABS\.blattOeffnen\("einstellungen"\)\)/.test(profil), "Zahnrad → Einstellungen");
});

pruefe("Profil: alte Abzeichen-Kennungen übersetzt, Zähler az… nur höher", () => {
    const gespeichert = {};
    const w = neueWelt({
        localStorage: {
            getItem: (s) => (s in gespeichert ? gespeichert[s] : null),
            setItem: (s, v) => { gespeichert[s] = String(v); },
            removeItem: (s) => { delete gespeichert[s]; }
        },
        ANMELDUNG: { abgleich: null, ich: () => null }
    });
    laden(w, ["js/fortschritt.js", "js/upcrew-abzeichen.js", "js/upcrew-abzeichen-spiele.js", "js/fortschritt-konto.js",
        "js/profil.js"], ["FORTSCHRITT", "FORTSCHRITT_KONTO", "PROFIL"]);
    w.RANGLISTE = { ABZEICHEN: [{ id: "erster-sieg" }, { id: "veteran" }] };
    gleich([w.PROFIL.umdeuten("erster-sieg"), w.PROFIL.umdeuten("up-partien"), w.PROFIL.umdeuten("bl-veteran")],
        ["bl-erster-sieg", "up-partien", "bl-veteran"], "umdeuten");
    const K = w.FORTSCHRITT_KONTO;
    gleich(K.zaehlerHeben({ azErsterSieg: 1, "az-kaputt": 1, azVeteran: -1 }), 1, "nur gültige Namen und Werte");
    gleich(K.zaehlerHeben({ azErsterSieg: 1 }), 0, "schon da: nichts zu tun");
    gleich(K.zaehlerHeben({ azErsterSieg: 0 }), 0, "nie tiefer");
    const zweig = K.lesen().spiele.blunderluck;
    gleich(zweig.zaehler.azErsterSieg, 1, "liegt im eigenen Zweig");
    const alle = w.UPCREW_ABZEICHEN.alle(K.lesen(), 0);
    gleich(alle.find((e) => e.kennung === "bl-erster-sieg").erreicht, 1, "fest im Profil verdient");
});

console.log(anzahlOk + " ok, " + anzahlFehler + " Fehler");
process.exit(anzahlFehler === 0 ? 0 : 1);
