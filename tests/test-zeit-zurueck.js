/*
 * test-zeit-zurueck.js — „Zeit zurück" statt „Extra-Leben" (seit v0.152.2).
 *
 * Nutzer 27.09.2026: „soll nicht Extra-Leben heißen, sondern Zeit zurück —
 * zwei Halbzüge zurückspringen".
 *
 * Geprüft: das Merken und Einlösen im Modell (Stellung, Zugzähler, Karten,
 * Verluste, Verlauf; auch nach dem Wegwerfen leerer Listen wie in
 * Firebase), zwei Halbzüge zurück und wieder selbst am Zug, nicht gegen
 * Menschen, nicht nach „Aufgeben" per Knopf, aber nach verfehltem
 * Tagesbrett; im Bildschirm (nachgebautes DOM, bildschirm-umgebung.js) der
 * Knopf im Spiel-Menü hinter dem Trennstrich, der Abschluss-Weg ohne
 * Doppelbuchung (Buchung wartet bis zum Schliessen), ohne Vorrat bucht es
 * sofort; die Wertungsgrenze im Turm (höchstens ein Bauer) und das
 * Verwerfen der Wertung ab dem Rücksprung; der Name nur aus SHOP.TEXTE.
 *
 * Aufruf: siehe tests\README.md
 */

const pfad = require("path");
const fs = require("fs");
const vm = require("vm");

const {
    umgebung, bereitUndAufgestellt, klasseSuchen,
    SCHACH, SCHACH_RUNDE, SCHACH_TAFEL, SCHACH_BOT, TEAM_SCHACH, kennungen
} = require("./bildschirm-umgebung.js");

const projekt = pfad.join(__dirname, "..");
const lesen = (name) => fs.readFileSync(pfad.join(projekt, name), "utf8");

let anzahlOk = 0;
let anzahlFehler = 0;

async function pruefe(bezeichnung, funktion) {
    try {
        await funktion();
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

const warten = () => new Promise((fertig) => setImmediate(fertig));

/* Das Tagesbrett und der echte Shop (seine Texte) in die Umgebung. */
vm.runInContext(lesen("js/tagesbrett.js") + "\n;globalThis.TAGESBRETT = TAGESBRETT;", umgebung);
vm.runInContext(lesen("js/shop.js") + "\n;globalThis.SHOP = SHOP;", umgebung);

/* Der Fortschritt als Stellvertreter: Vorrat, Buchung (einmal je Partie), Hilfe. */
const FK = {
    lager: { leben: 2, tipp: 0 },
    gebucht: [],
    hilfe: [],
    vorrat(ware) { return FK.lager[ware] || 0; },
    benutzen(ware) {
        if (!(FK.lager[ware] > 0)) {
            return false;
        }
        FK.lager[ware]--;
        return true;
    },
    hilfeMerken(id) { FK.hilfe.push(id); },
    hilfeGenutzt(id) { return FK.hilfe.indexOf(id) !== -1; },
    istGezaehlt(id) { return FK.gebucht.indexOf(id) !== -1; },
    partieBeendet(partie) {
        if (FK.gebucht.indexOf(partie.id) !== -1) {
            return null;
        }
        FK.gebucht.push(partie.id);
        return { xp: 10, levelVorher: 1, levelNachher: 1 };
    }
};
umgebung.FORTSCHRITT_KONTO = FK;

/* ------------------------------------------------------------------ *
 * Hilfen: eine Partie Anna (Weiss) gegen Bob (Schwarz)
 * ------------------------------------------------------------------ */

let uhr = 50000;

/* Seit v0.152.3 gibt es Zeit zurück nur im Turm — die Probe-Partie ist
   deshalb eine Turm-Stufe (`frei = true`: eine freie Partie gegen Bob). */
function botPartie(id, frei) {
    let runde = SCHACH_RUNDE.leereRunde(uhr, "standard", id, "Gegen Bob");
    if (!frei) {
        runde.regeln.turm = { ort: 1, stufe: 0 };
    }
    runde = SCHACH_RUNDE.teamBeitreten(runde, "id-anna", "weiss", uhr);
    runde = SCHACH_BOT.inRundeSetzen(runde, "schwarz", uhr);
    return bereitUndAufgestellt(runde, "weiss", uhr);
}

/* Anna zieht ihren ersten erlaubten Zug — wie der Bildschirm mit
   `zeitMerkenVor` (erste eigene Aktion ohne Rückblick). */
function annaZieht(runde) {
    const zug = SCHACH.alleZuege(runde.stand)[0];
    const neu = SCHACH_RUNDE.ziehen(runde, "id-anna", zug.von, zug.nach, "D", "Anna", ++uhr);
    return SCHACH_BOT.zeitMerkenVor(runde, neu);
}

/* Zwei volle Züge: [S0, S1, S2], Anna wieder am Zug. */
function zweiZuege(id) {
    let p = botPartie(id);
    p = annaZieht(p);
    p = SCHACH_BOT.ziehen(p, ++uhr);
    const nachBob1 = p;
    p = annaZieht(p);
    p = SCHACH_BOT.ziehen(p, ++uhr);
    return { p, nachBob1 };
}

/* Wie Firebase: leere Listen und Objekte verschwinden. */
function wieFirebase(wert) {
    if (Array.isArray(wert)) {
        const liste = wert.map(wieFirebase).filter((w) => w !== undefined);
        return liste.length ? liste : undefined;
    }
    if (wert && typeof wert === "object") {
        const neu = {};
        for (const k of Object.keys(wert)) {
            const w = wieFirebase(wert[k]);
            if (w !== undefined && w !== null && w !== "") {
                neu[k] = w;
            }
        }
        return Object.keys(neu).length ? neu : undefined;
    }
    return wert;
}

function spielfelder(runde) {
    const n = SCHACH_RUNDE.normalisieren(runde);
    const aus = {};
    for (const feld of SCHACH_RUNDE.RUECKBLICK_FELDER) {
        aus[feld] = n[feld];
    }
    return JSON.stringify(aus);
}

async function alles() {

    /* ---------------- Modell ---------------- */

    await pruefe("Merken: Bob merkt nach seinem Zug den Anfang von Annas Zug; erst nach 2 Halbzügen geht es", () => {
        let p = botPartie("p-zz-1");
        gleich(SCHACH_RUNDE.normalisieren(p).rueckblick.length, 0, "leer beim Anpfiff");
        gleich(SCHACH_BOT.zeitZurueckZiel(p, "id-anna"), -1, "am Anfang nicht");
        p = annaZieht(p);
        gleich(SCHACH_RUNDE.normalisieren(p).rueckblick.length, 1, "erste eigene Aktion merkt den Anfang");
        p = SCHACH_BOT.ziehen(p, ++uhr);
        gleich(SCHACH_RUNDE.normalisieren(p).rueckblick.length, 2, "Bob merkt den nächsten Anfang");
        gleich(SCHACH_BOT.zeitZurueckZiel(p, "id-anna"), 0, "nach zwei Halbzügen: zurück an den Anfang");
        gleich(SCHACH_BOT.zeitZurueckZiel(p, "bot"), -1, "Bob selbst nie");
    });

    await pruefe("Zwei Halbzüge zurück: Stellung, Zugzähler, Verlauf wie nach Bobs erstem Zug, Anna am Zug", () => {
        const { p, nachBob1 } = zweiZuege("p-zz-2");
        const zurueck = SCHACH_BOT.zeitZurueck(p, "id-anna", 99);
        wahr(zurueck, "geht");
        gleich(zurueck.zugZaehler, nachBob1.zugZaehler, "Zugzähler");
        gleich(zurueck.zugZaehler, p.zugZaehler - 2, "genau zwei Halbzüge");
        gleich(zurueck.stand.amZug, "weiss", "Anna wieder am Zug");
        gleich(spielfelder(zurueck), spielfelder(nachBob1), "alle Spielfelder wie damals");
        gleich(zurueck.rueckblick.length, 2, "der verfallene Anfang ist weg");
        gleich(zurueck.teams, p.teams, "Teams bleiben");
        gleich(zurueck.geaendertAm, 99, "geändert jetzt");
        gleich(SCHACH_BOT.zeitZurueckZiel(zurueck, "id-anna"), 0, "noch einmal zurück geht (Tiefe 3)");
        const nochmal = SCHACH_BOT.zeitZurueck(zurueck, "id-anna", 100);
        gleich(nochmal.zugZaehler, 0, "an den Anpfiff");
        gleich(SCHACH_BOT.zeitZurueckZiel(nochmal, "id-anna"), -1, "weiter zurück nicht");
    });

    await pruefe("Karten, Verluste, Unglück und Lootboxen gehen mit zurück — auch ohne leere Listen (Firebase)", () => {
        const art = Object.keys(umgebung.SCHACH_VARIANTEN.FAEHIGKEITEN)
            .find((a) => !umgebung.SCHACH_VARIANTEN.FAEHIGKEITEN[a].versteckt);
        const pech = Object.keys(umgebung.SCHACH_VARIANTEN.PECH)[0];
        let p = botPartie("p-zz-3");
        p = SCHACH_RUNDE.kopieren(p);
        p.faehigkeiten.weiss = [art];
        p.unglueckskarten.schwarz = [{ art: pech, zugZaehler: 0 }];
        p = SCHACH_RUNDE.rueckblickMerken(p);
        const damals = spielfelder(p);
        /* Danach: Karte weg, Verlust, andere Stellung. */
        p = annaZieht(p);
        p = SCHACH_RUNDE.kopieren(p);
        p.faehigkeiten.weiss = [];
        p.verloren.weiss = ["D"];
        p.bonus = [{ feld: 27, art: art }];
        p = SCHACH_BOT.ziehen(p, ++uhr);
        const ausDerDatenbank = wieFirebase(JSON.parse(JSON.stringify(p)));
        const zurueck = SCHACH_BOT.zeitZurueck(ausDerDatenbank, "id-anna", 5);
        gleich(spielfelder(zurueck), damals, "wie damals");
        gleich(zurueck.faehigkeiten.weiss, [art], "Karte wieder in der Hand");
        gleich(zurueck.verloren.weiss, [], "Verlust zurück");
        gleich(zurueck.bonus, [], "Lootbox von später weg");
    });

    await pruefe("Rückblick überlebt das Normalisieren, höchstens RUECKBLICK_TIEFE; neue Partie leert ihn", () => {
        let p = botPartie("p-zz-4");
        for (let i = 0; i < 4; i++) {
            p = annaZieht(p);
            p = SCHACH_BOT.ziehen(p, ++uhr);
        }
        const n = SCHACH_RUNDE.normalisieren(JSON.parse(JSON.stringify(p)));
        gleich(n.rueckblick.length, SCHACH_RUNDE.RUECKBLICK_TIEFE, "gedeckelt");
        wahr(n.rueckblick.every((e) => e.rueckblick === undefined), "kein Rückblick im Rückblick");
        gleich(SCHACH_RUNDE.neuePartie(p, 7).rueckblick, [], "Revanche ohne Rückblick");
        gleich(SCHACH_RUNDE.normalisieren({ id: "alt" }).rueckblick, [], "alte Partie: leer");
    });

    await pruefe("Nicht gegen Menschen: Freundes-Runde und Bob-Runde mit zweitem Menschen", () => {
        const { p } = zweiZuege("p-zz-5");
        const menschen = SCHACH_RUNDE.kopieren(SCHACH_TAFEL.partie(TEAM_SCHACH.abgleich.daten, kennungen.standard));
        menschen.rueckblick = p.rueckblick;
        gleich(SCHACH_BOT.zeitZurueckZiel(menschen, "id-anna"), -1, "Anna gegen Bert");
        const zuZweit = SCHACH_RUNDE.kopieren(p);
        zuZweit.teams.weiss = ["id-anna", "id-bert"];
        gleich(SCHACH_BOT.zeitZurueckZiel(zuZweit, "id-anna"), -1, "Bert im Team");
        const bobAmZug = SCHACH_RUNDE.kopieren(p);
        bobAmZug.stand = Object.assign({}, bobAmZug.stand, { amZug: "schwarz" });
        gleich(SCHACH_BOT.zeitZurueckZiel(bobAmZug, "id-anna"), -1, "nicht während Bob am Zug ist");
    });

    await pruefe("Nach einer Niederlage: an den Anfang des letzten eigenen Zugs; nicht nach Aufgeben per Knopf", () => {
        const { p } = zweiZuege("p-zz-6");
        const matt = SCHACH_RUNDE.kopieren(p);
        matt.ergebnis = "schwarz";
        matt.laeuft = false;
        gleich(SCHACH_BOT.zeitZurueckZiel(matt, "id-anna"), 2, "der letzte Anfang");
        const weiter = SCHACH_BOT.zeitZurueck(matt, "id-anna", 1);
        gleich([weiter.ergebnis, weiter.laeuft, weiter.stand.amZug], ["", true, "weiss"], "läuft wieder, Anna am Zug");
        gleich(weiter.zugZaehler, p.zugZaehler, "wie vor dem letzten eigenen Zug");
        const aufgegeben = SCHACH_RUNDE.aufgeben(p, "weiss", 2);
        gleich(SCHACH_BOT.zeitZurueckZiel(aufgegeben, "id-anna"), -1, "Aufgeben per Knopf: nein");
        const gewonnen = SCHACH_RUNDE.kopieren(matt);
        gewonnen.ergebnis = "weiss";
        gleich(SCHACH_BOT.zeitZurueckZiel(gewonnen, "id-anna"), -1, "Sieg: nichts zurückzunehmen");
    });

    await pruefe("Nur im Turm (v0.152.3): nicht in Frei, nicht beim Tagesbrett; dort wird auch nichts gemerkt", () => {
        /* Nutzer 28.09.2026: „nur im Turm nutzbar, Bob da rauslassen". */
        const { p } = zweiZuege("p-zz-7");
        const tb = SCHACH_RUNDE.kopieren(p);
        tb.regeln.turm = null;
        tb.regeln.tagesbrett = { datum: "2026-09-27", nr: 1, zuege: 2 };
        const verfehlt = umgebung.TAGESBRETT.nachZug(tb, "weiss");
        wahr(verfehlt.ergebnis === "schwarz", "verfehlt nach 2 Zügen");
        gleich(SCHACH_BOT.zeitZurueckZiel(verfehlt, "id-anna"), -1, "Tagesbrett: nein");
        const frei = SCHACH_RUNDE.kopieren(p);
        frei.regeln.turm = null;
        gleich(SCHACH_BOT.zeitZurueckZiel(frei, "id-anna"), -1, "Frei: nein");
        let f = botPartie("p-zz-frei", true);
        f = SCHACH_BOT.ziehen(annaZieht(f), ++uhr);
        f = SCHACH_BOT.ziehen(annaZieht(f), ++uhr);
        gleich(SCHACH_RUNDE.normalisieren(f).rueckblick.length, 0, "Frei trägt keinen Rückblick");
    });

    /* ---------------- Bildschirm: Spiel-Menü ---------------- */

    const echteDaten = TEAM_SCHACH.abgleich.daten;
    const einsetzen = (partie) => {
        TEAM_SCHACH.abgleich.daten = SCHACH_TAFEL.partieEinsetzen(TEAM_SCHACH.abgleich.daten, partie, ++uhr);
    };
    const menueZeichnen = (id) => {
        TEAM_SCHACH.abschluss = null;
        TEAM_SCHACH.offeneId = id;
        TEAM_SCHACH.eckMenueOffen = true;
        TEAM_SCHACH.zeichnen(TEAM_SCHACH.abgleich.daten);
        return TEAM_SCHACH.wurzelEl;
    };

    await pruefe("Spiel-Menü: Zeit zurück hinter dem Trennstrich mit Vorrat; Klick springt zwei Halbzüge zurück", async () => {
        FK.lager.leben = 2;
        const { p, nachBob1 } = zweiZuege("p-zz-menue");
        einsetzen(p);
        const wurzel = menueZeichnen(p.id);
        const knopf = klasseSuchen(wurzel, "eck-zeit");
        wahr(knopf, "Knopf da");
        wahr(klasseSuchen(wurzel, "eck-trenner"), "Trennstrich da");
        gleich(knopf.attribute["aria-label"], "Zeit zurück · noch 2", "Name aus SHOP.TEXTE, Vorrat");
        gleich(klasseSuchen(knopf, "eck-hilfe-zahl").textContent, "2", "Vorrats-Zahl");
        knopf.ausloesen("click");
        for (let i = 0; i < 5; i++) {
            await warten();
        }
        const jetzt = SCHACH_TAFEL.partie(TEAM_SCHACH.abgleich.daten, p.id);
        gleich(jetzt.zugZaehler, nachBob1.zugZaehler, "zurückgesprungen");
        gleich(FK.lager.leben, 1, "ein Stück verbraucht");
        wahr(FK.hilfeGenutzt(p.id), "Hilfe gemerkt (Wertung)");
        gleich(TEAM_SCHACH.eckMenueOffen, false, "Menü zu");
    });

    await pruefe("Spiel-Menü: kein Knopf ohne Vorrat, zu früh oder gegen Menschen", () => {
        const { p } = zweiZuege("p-zz-ohne");
        einsetzen(p);
        FK.lager.leben = 0;
        wahr(!klasseSuchen(menueZeichnen(p.id), "eck-zeit"), "ohne Vorrat");
        wahr(!klasseSuchen(TEAM_SCHACH.wurzelEl, "eck-trenner"), "ohne Hilfe kein Strich");
        FK.lager.leben = 3;
        let frueh = botPartie("p-zz-frueh");
        frueh = SCHACH_BOT.ziehen(annaZieht(frueh), ++uhr);
        frueh = SCHACH_RUNDE.kopieren(frueh);
        frueh.rueckblick = frueh.rueckblick.slice(-1);
        einsetzen(frueh);
        wahr(!klasseSuchen(menueZeichnen(frueh.id), "eck-zeit"), "nur ein Anfang gemerkt");
        const menschen = SCHACH_RUNDE.kopieren(SCHACH_TAFEL.partie(TEAM_SCHACH.abgleich.daten, kennungen.standard));
        menschen.rueckblick = p.rueckblick;
        einsetzen(menschen);
        wahr(!klasseSuchen(menueZeichnen(menschen.id), "eck-zeit"), "gegen Bert nie");
    });

    /* ---------------- Bildschirm: Abschluss und Buchung ---------------- */

    const verlorenGegenBob = (id) => {
        const { p } = zweiZuege(id);
        const matt = SCHACH_RUNDE.kopieren(p);
        matt.ergebnis = "schwarz";
        matt.laeuft = false;
        matt.geaendertAm = ++uhr + 100000;
        return matt;
    };
    /* Seit v0.155.1 zeigt nur die OFFENE Partie ihren Abschluss — die
       Partie ist hier also offen, als sie endet. */
    const abschlussZeichnen = (id) => {
        TEAM_SCHACH.abschluss = null;
        TEAM_SCHACH.offeneId = id;
        TEAM_SCHACH.zeichnen(TEAM_SCHACH.abgleich.daten);
    };

    await pruefe("Abschluss: Niederlage bucht NICHT sofort; Zeit zurück spielt weiter; erst das Schliessen bucht, einmal", async () => {
        FK.lager.leben = 2;
        const matt = verlorenGegenBob("p-zz-ende");
        einsetzen(matt);
        abschlussZeichnen(matt.id);
        wahr(TEAM_SCHACH.abschluss && TEAM_SCHACH.abschluss.id === matt.id, "Abschluss erscheint");
        gleich(FK.istGezaehlt(matt.id), false, "noch nicht gebucht");
        TEAM_SCHACH.abschluss.schritt = 1;
        TEAM_SCHACH.zeichnen(TEAM_SCHACH.abgleich.daten);
        const knopf = klasseSuchen(TEAM_SCHACH.wurzelEl, "abschluss-zeit-zurueck");
        wahr(knopf, "Hauptknopf da");
        gleich(knopf.textContent, "Zeit zurück · noch 2", "Beschriftung");
        wahr(/knopf-haupt/.test(knopf.className), "Hauptfarbe");
        await knopf.hoerer.click({ preventDefault() { }, stopPropagation() { } });
        const weiter = SCHACH_TAFEL.partie(TEAM_SCHACH.abgleich.daten, matt.id);
        gleich([weiter.ergebnis, weiter.laeuft], ["", true], "die Partie läuft weiter");
        gleich(weiter.zugZaehler, matt.zugZaehler, "am Anfang des letzten eigenen Zugs");
        gleich([TEAM_SCHACH.abschluss, TEAM_SCHACH.offeneId], [null, matt.id], "zurück am Brett");
        gleich(FK.istGezaehlt(matt.id), false, "nichts gebucht, nichts zurückzunehmen");
        gleich(FK.lager.leben, 1, "ein Stück weg");

        /* Wieder verloren, diesmal geschlossen: jetzt bucht es — einmal. */
        const nochmal = SCHACH_RUNDE.kopieren(weiter);
        nochmal.ergebnis = "schwarz";
        nochmal.laeuft = false;
        einsetzen(nochmal);
        abschlussZeichnen(matt.id);
        gleich(FK.istGezaehlt(matt.id), false, "wartet wieder (noch 1 Vorrat)");
        TEAM_SCHACH.abschlussSchliessen(matt.id);
        gleich(FK.gebucht.filter((id) => id === matt.id).length, 1, "beim Schliessen gebucht");
        TEAM_SCHACH.abschlussSchliessen(matt.id);
        abschlussZeichnen(matt.id);
        gleich(FK.gebucht.filter((id) => id === matt.id).length, 1, "nie doppelt");
        gleich(TEAM_SCHACH.zeitZurueckMoeglich(nochmal, { id: "id-anna" }), false, "gebucht: kein Zeit zurück mehr");
    });

    await pruefe("Abschluss ohne Vorrat oder nach Aufgeben: bucht sofort, kein Zeit-zurück-Knopf", () => {
        FK.lager.leben = 0;
        const matt = verlorenGegenBob("p-zz-leer");
        einsetzen(matt);
        abschlussZeichnen(matt.id);
        wahr(FK.istGezaehlt(matt.id), "sofort gebucht wie bisher");
        TEAM_SCHACH.abschluss.schritt = 1;
        TEAM_SCHACH.zeichnen(TEAM_SCHACH.abgleich.daten);
        wahr(!klasseSuchen(TEAM_SCHACH.wurzelEl, "abschluss-zeit-zurueck"), "kein Knopf");
        TEAM_SCHACH.abschlussSchliessen(matt.id);

        FK.lager.leben = 2;
        const { p } = zweiZuege("p-zz-auf");
        const aufgegeben = SCHACH_RUNDE.aufgeben(p, "weiss", ++uhr + 200000);
        einsetzen(aufgegeben);
        abschlussZeichnen(aufgegeben.id);
        wahr(FK.istGezaehlt(aufgegeben.id), "Aufgabe bucht sofort");
        TEAM_SCHACH.abschluss.schritt = 1;
        TEAM_SCHACH.zeichnen(TEAM_SCHACH.abgleich.daten);
        wahr(!klasseSuchen(TEAM_SCHACH.wurzelEl, "abschluss-zeit-zurueck"), "kein Knopf nach Aufgeben");
        TEAM_SCHACH.abschlussSchliessen(aufgegeben.id);
    });

    TEAM_SCHACH.abgleich.daten = echteDaten;
    TEAM_SCHACH.offeneId = "";
    TEAM_SCHACH.abschluss = null;
    TEAM_SCHACH.eckMenueOffen = false;

    /* ---------------- Wertung und Name ---------------- */

    await pruefe("Wertung: mit Hilfe im Turm höchstens ein Bauer; Zeit zurück verwirft die Wertung ab dem Rücksprung", () => {
        const speicher = {};
        const ls = {
            getItem: (k) => (k in speicher ? speicher[k] : null),
            setItem: (k, w) => { speicher[k] = String(w); },
            removeItem: (k) => { delete speicher[k]; }
        };
        global.localStorage = ls;
        global.window = { localStorage: ls };
        global.FORTSCHRITT = require(pfad.join(projekt, "js", "fortschritt.js"));
        global.TURM = require(pfad.join(projekt, "js", "turm.js"));
        global.WERTUNG = { genauigkeitVon: () => 100 };
        try {
            const K = require(pfad.join(projekt, "js", "fortschritt-konto.js"));
            const sieg = { id: "p-turm", ergebnis: "weiss", regeln: { turm: { ort: 1, stufe: 0 } } };
            gleich(K._turmWertung(sieg, "weiss").figuren, 3, "ohne Hilfe: bis zu drei");
            K.hilfeMerken("p-turm");
            gleich(K._turmWertung(sieg, "weiss").figuren, 1, "mit Hilfe: ein Bauer");
            gleich(K.istGezaehlt("p-x"), false, "noch nicht gezählt");
            K._lokalSchreiben(global.FORTSCHRITT.partieZaehlen({}, "p-x", 1));
            gleich(K.istGezaehlt("p-x"), true, "gezählt");

            delete global.WERTUNG;
            global.SCHACH_BOT = SCHACH_BOT;
            global.SCHACH = SCHACH;
            const W = require(pfad.join(projekt, "js", "wertung.js"));
            for (const z of [0, 2, 4, 6]) {
                W._eintragSpeichern("p-w", z, "weiss", { k: "gut", g: 90 });
            }
            W.abZugVerwerfen("p-w", 4);
            gleich(Object.keys(W._lesen()["p-w"].zuege), ["0", "2"], "ab Zugzähler 4 verworfen");
        } finally {
            delete global.localStorage;
            delete global.window;
            delete global.FORTSCHRITT;
            delete global.TURM;
            delete global.WERTUNG;
            delete global.SCHACH_BOT;
            delete global.SCHACH;
        }
    });

    await pruefe("Name nur über SHOP.TEXTE; Kennung bleibt `leben`; kein „Extra-Leben“ und kein „Leben einsetzen“ mehr im Spiel", () => {
        gleich(umgebung.SHOP.TEXTE.leben.name, "Zeit zurück", "Shop-Name");
        /* Nutzer 28.09.2026: „Keine Halbzug-Beschreibung, sondern ein ganzer Zug." */
        wahr(!/Halbz/.test(JSON.stringify(umgebung.SHOP.TEXTE.leben)), "Shop spricht nicht von Halbzügen");
        gleich(umgebung.SHOP.TEXTE.leben.text, "Einen Zug zurück · nur im Turm", "Kurztext");
        wahr(!/Bob/.test(umgebung.SHOP.TEXTE.leben.text), "Bob bleibt draussen");
        wahr(typeof umgebung.SHOP.BILDER.leben === "string", "eigenes Bild (Vorschlag Option bilder)");
        for (const datei of ["js/team-schach.js", "js/team-schach-auswertung.js", "js/shop.js"]) {
            const text = lesen(datei);
            wahr(!/"[^"\n]*Extra-Leben[^"\n]*"/.test(text), datei + ": kein Extra-Leben als Text");
            wahr(!/Leben einsetzen · noch/.test(text), datei + ": kein Leben einsetzen");
            wahr(!/"Zeit zurück/.test(text.replace(/leben: \{ name: "Zeit zurück"/, "")), datei + ": Name nur in SHOP.TEXTE");
        }
        wahr(/"zeit-zurueck":/.test(lesen("js/zustand.js")), "Zeichen Uhr zurück");
    });

    console.log(anzahlOk + " ok, " + anzahlFehler + " Fehler");
    process.exit(anzahlFehler === 0 ? 0 : 1);
}

alles();
