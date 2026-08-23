/*
 * test-schach-grundlagen.js — die Anleitung zu den Schachregeln (seit v0.96).
 *
 * Sie ist wie die Bildanleitung der Faehigkeiten GERECHNET, nicht gezeichnet.
 * Genau das laesst sich pruefen: Sagt ein Kapitel „das ist Patt", muss
 * `SCHACH.lage` dasselbe sagen. Sagt es „so zieht der Springer", muessen die
 * markierten Felder die sein, die `SCHACH.zuege` liefert — keines zu viel,
 * keines zu wenig.
 *
 * Wer eine Regel aendert und das Kapitel vergisst, sieht es hier.
 */

const pfad = require("path");

globalThis.SCHACH_VARIANTEN = require(pfad.join(__dirname, "..", "js", "schach-varianten.js"));
globalThis.SCHACH = require(pfad.join(__dirname, "..", "js", "schach.js"));
globalThis.SCHACH_RUNDE = require(pfad.join(__dirname, "..", "js", "schach-runde.js"));
const SCHACH_GRUNDLAGEN = require(pfad.join(__dirname, "..", "js", "schach-grundlagen.js"));
const SCHACH = globalThis.SCHACH;
const SCHACH_RUNDE = globalThis.SCHACH_RUNDE;

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
    if (ist !== soll) {
        throw new Error((was || "Wert") + ": erwartet <" + soll + ">, war <" + ist + ">");
    }
}

function wahr(bedingung, was) {
    if (!bedingung) {
        throw new Error((was || "Bedingung") + " war nicht erfuellt");
    }
}

/* ------------------------------------------------------------------ *
 * Vollstaendigkeit
 * ------------------------------------------------------------------ */

pruefe("Jede Gruppe hat Kapitel, und jedes Kapitel gehoert zu einer Gruppe", () => {
    const gruppen = SCHACH_GRUNDLAGEN.GRUPPEN.map((gruppe) => gruppe.id);

    for (const gruppe of SCHACH_GRUNDLAGEN.GRUPPEN) {
        wahr(gruppe.titel.length > 0, gruppe.id + ": hat einen Titel");
        wahr(gruppe.text.length > 20, gruppe.id + ": hat einen Erklaersatz");
    }

    for (const kapitel of SCHACH_GRUNDLAGEN.KAPITEL) {
        wahr(gruppen.indexOf(kapitel.gruppe) !== -1,
            kapitel.id + ": Gruppe <" + kapitel.gruppe + "> gibt es");
        wahr(kapitel.titel.length > 0, kapitel.id + ": hat einen Titel");
        wahr(kapitel.text.length > 40, kapitel.id + ": hat einen Text");
    }

    /* Die Gruppe "werte" hat bewusst keine Kapitel — sie ist eine Tabelle. */
    for (const gruppe of gruppen) {
        if (gruppe === "werte") {
            continue;
        }
        wahr(SCHACH_GRUNDLAGEN.kapitelDerGruppe(gruppe).length > 0,
            gruppe + ": hat mindestens ein Kapitel");
    }
});

pruefe("Jedes Kapitel bringt mindestens ein Bild zustande", () => {
    for (const kapitel of SCHACH_GRUNDLAGEN.KAPITEL) {
        const bilder = SCHACH_GRUNDLAGEN.bilder(kapitel.id);

        wahr(bilder.length > 0, kapitel.id + ": es kommt ein Bild zustande");

        for (const bild of bilder) {
            wahr(!!bild.runde && !!bild.runde.stand, kapitel.id + ": das Bild hat einen Stand");
            wahr(Array.isArray(bild.marken), kapitel.id + ": Marken sind eine Liste");
            wahr(Array.isArray(bild.ziele), kapitel.id + ": Ziele sind eine Liste");
            wahr(Array.isArray(bild.wege), kapitel.id + ": Wege sind eine Liste");
            wahr(typeof bild.text === "string" && bild.text.length > 0,
                kapitel.id + ": das Bild hat einen Satz");
            gleich(bild.runde.stand.brett.length,
                SCHACH_GRUNDLAGEN.BREITE * SCHACH_GRUNDLAGEN.HOEHE,
                kapitel.id + ": das Brett hat 8 mal 8 Felder");
        }
    }
});

pruefe("Auf keinem Bild liegt eine Lootbox (v0.97)", () => {
    /*
     * DER FEHLER AUS v0.96, vom Nutzer gemeldet: Auf jedem Brett der Anleitung
     * lagen vier Lootboxen.
     *
     * Ursache war die gewaehlte Spielart. `SCHACH_RUNDE.normalisieren` legt die
     * Startwuerfel der Spielart aufs Brett, WENN die Runde keine eigene Liste
     * mitbringt — und die alte, versteckte Spielart `faehigkeiten` traegt aus
     * Umstiegs-Gruenden vier solche Felder. Mit den Schachregeln hat das
     * nichts zu tun. Behoben durch die Spielart `standard` UND eine
     * ausdrueckliche leere Liste.
     */
    for (const kapitel of SCHACH_GRUNDLAGEN.KAPITEL) {
        for (const bild of SCHACH_GRUNDLAGEN.bilder(kapitel.id)) {
            gleich(bild.runde.bonus.length, 0, kapitel.id + ": keine Lootbox");
            gleich(bild.runde.faehigkeiten.weiss.length, 0,
                kapitel.id + ": kein Vorrat");
            gleich(SCHACH_RUNDE.faehigkeitenAn(bild.runde), false,
                kapitel.id + ": Faehigkeiten sind aus");
        }
    }
});

pruefe("Die Anleitung steht auf dem NORMALEN Brett (v0.97)", () => {
    /*
     * 8 mal 8, Spielart `standard` — der Nutzer soll das Brett sehen, das er
     * nachher vor sich hat. Die Bildanleitung der Faehigkeiten nimmt weiterhin
     * ein kleineres 6-mal-6; dort ist das Brett nur der Rahmen fuer eine
     * Wirkung, hier ist es die Sache selbst.
     */
    gleich(SCHACH_GRUNDLAGEN.BREITE, 8, "acht Spalten");
    gleich(SCHACH_GRUNDLAGEN.HOEHE, 8, "acht Reihen");

    for (const kapitel of SCHACH_GRUNDLAGEN.KAPITEL) {
        gleich(kapitel.brett.length, 8, kapitel.id + ": acht Zeilen geschrieben");
        for (const zeile of kapitel.brett) {
            gleich(zeile.length, 8, kapitel.id + ": jede Zeile acht Zeichen");
        }

        const bild = SCHACH_GRUNDLAGEN.bilder(kapitel.id)[0];
        gleich(SCHACH.breiteVon(bild.runde.stand), 8, kapitel.id + ": Brett acht breit");
        gleich(SCHACH.hoeheVon(bild.runde.stand), 8, kapitel.id + ": Brett acht hoch");
    }
});

pruefe("Die Rochade steht auf den echten Feldern e1 und h1 (v0.97)", () => {
    /*
     * Auf dem normalen Brett ist die kurze Rochade die, die jeder kennt —
     * Koenig e1 nach g1, Turm h1 nach f1. Genau das soll das Bild zeigen.
     */
    const bilder = SCHACH_GRUNDLAGEN.bilder("rochade");
    const vorher = bilder[0].runde.stand;
    const nachher = bilder[1].runde.stand;

    gleich(SCHACH.figurAuf(vorher, SCHACH.feldNummer("e1")), "K", "Koenig auf e1");
    gleich(SCHACH.figurAuf(vorher, SCHACH.feldNummer("h1")), "T", "Turm auf h1");
    gleich(SCHACH.figurAuf(nachher, SCHACH.feldNummer("g1")), "K", "danach Koenig auf g1");
    gleich(SCHACH.figurAuf(nachher, SCHACH.feldNummer("f1")), "T", "danach Turm auf f1");
});

pruefe("Ein unbekanntes Kapitel liefert nichts, statt zu stolpern", () => {
    gleich(SCHACH_GRUNDLAGEN.bilder("gibtesnicht").length, 0, "leere Liste");
    gleich(SCHACH_GRUNDLAGEN.kapitel("gibtesnicht"), null, "kein Eintrag");
});

/* ------------------------------------------------------------------ *
 * Die Gangarten — die Probe aufs Exempel
 * ------------------------------------------------------------------ */

pruefe("Die markierten Felder sind genau die, die die Regel erlaubt", () => {
    /*
     * DAS IST DER KERN DIESER DATEI. Die Punkte im Bild kommen aus
     * `SCHACH.zuege` — hier wird nachgerechnet, dass wirklich JEDER moegliche
     * Zug markiert ist und kein Feld zu viel. Wer eine Gangart aendert, sieht
     * das Bild mitgehen; wer sie kaputt macht, sieht es hier.
     */
    for (const kapitel of SCHACH_GRUNDLAGEN.kapitelDerGruppe("figuren")) {
        const bild = SCHACH_GRUNDLAGEN.bilder(kapitel.id)[0];
        const feld = bild.runde.stand.brett.indexOf(kapitel.figur);

        wahr(feld !== -1, kapitel.id + ": die Figur steht auf dem Brett");
        gleich(bild.marken.length, 1, kapitel.id + ": genau ein markiertes Feld");
        gleich(bild.marken[0], feld, kapitel.id + ": markiert ist die Figur selbst");

        const echte = SCHACH.zuege(bild.runde.stand, feld).map((zug) => zug.nach);

        gleich(bild.ziele.length, echte.length, kapitel.id + ": gleich viele Felder");
        for (const ziel of echte) {
            wahr(bild.ziele.indexOf(ziel) !== -1,
                kapitel.id + ": Feld " + ziel + " ist markiert");
        }
        wahr(echte.length > 0, kapitel.id + ": die Figur kann ueberhaupt ziehen");
    }
});

pruefe("Jede Figur hat ihr eigenes Kapitel, keine fehlt", () => {
    const gezeigt = SCHACH_GRUNDLAGEN.kapitelDerGruppe("figuren")
        .map((kapitel) => kapitel.figur);

    for (const art of SCHACH_GRUNDLAGEN.FIGUREN) {
        wahr(gezeigt.indexOf(art) !== -1, SCHACH.artName(art) + " hat ein Kapitel");
    }
    gleich(gezeigt.length, SCHACH_GRUNDLAGEN.FIGUREN.length, "und keine doppelt");
});

pruefe("Der Bauer zeigt wirklich beides: gerade ziehen, schraeg schlagen", () => {
    /*
     * Die Stellung ist so gebaut, dass man den Unterschied SIEHT: Vor dem
     * Bauern steht ein Gegner, also faellt das Feld geradeaus weg, und schraeg
     * davor kommt eines dazu. Ohne diese Probe koennte jemand die Stellung
     * beim Aufraeumen glattziehen und das Bild um seine Aussage bringen.
     */
    const bild = SCHACH_GRUNDLAGEN.bilder("bauer")[0];
    const stand = bild.runde.stand;
    const feld = stand.brett.indexOf("B");
    const breite = SCHACH.breiteVon(stand);

    const geradeaus = feld - breite;
    wahr(SCHACH.artVon(SCHACH.figurAuf(stand, geradeaus)) !== "",
        "vor dem Bauern steht jemand");
    wahr(bild.ziele.indexOf(geradeaus) === -1,
        "geradeaus schlaegt er nicht, also ist das Feld kein Ziel");

    const schraeg = SCHACH.bauernSchlagfelder(stand, feld, "weiss")
        .filter((ziel) => SCHACH.farbeVon(SCHACH.figurAuf(stand, ziel)) === "schwarz");

    wahr(schraeg.length > 0, "es gibt ein schraeges Schlagfeld");
    for (const ziel of schraeg) {
        wahr(bild.ziele.indexOf(ziel) !== -1, "und es ist markiert");
    }
});

pruefe("Der Springer setzt ueber alles hinweg — auch im Bild", () => {
    const bild = SCHACH_GRUNDLAGEN.bilder("springer")[0];
    gleich(bild.ziele.length, 8, "aus der Mitte heraus acht Felder");
});

/* ------------------------------------------------------------------ *
 * Schach, Matt und Patt — sagt die Regel dasselbe wie der Text?
 * ------------------------------------------------------------------ */

pruefe("Was ein Kapitel behauptet, bestaetigt SCHACH.lage", () => {
    for (const kapitel of SCHACH_GRUNDLAGEN.KAPITEL) {
        if (kapitel.art !== "lage") {
            continue;
        }

        const bild = SCHACH_GRUNDLAGEN.bilder(kapitel.id)[0];
        const lage = SCHACH.lage(bild.runde.stand);

        gleich(lage.art, kapitel.erwartet, kapitel.id + ": die Regel sagt dasselbe");
    }
});

pruefe("Beim Schach steht der Koenig im Schach und hat trotzdem Zuege", () => {
    const bild = SCHACH_GRUNDLAGEN.bilder("schach")[0];
    const stand = bild.runde.stand;

    gleich(SCHACH.imSchach(stand, "schwarz"), true, "Schwarz steht im Schach");
    wahr(SCHACH.alleZuege(stand).length > 0, "und kann noch etwas tun");
    gleich(bild.ziele.length, SCHACH.alleZuege(stand).length,
        "die rettenden Zuege sind markiert");
});

pruefe("Beim Matt steht der Koenig im Schach und hat KEINEN Zug", () => {
    const bild = SCHACH_GRUNDLAGEN.bilder("matt")[0];
    const stand = bild.runde.stand;

    gleich(SCHACH.imSchach(stand, "schwarz"), true, "Schwarz steht im Schach");
    gleich(SCHACH.alleZuege(stand).length, 0, "und hat keinen Zug mehr");
    gleich(SCHACH.lage(stand).sieger, "weiss", "Weiss gewinnt");
});

pruefe("Beim Patt steht der Koenig NICHT im Schach und hat keinen Zug", () => {
    /*
     * Der Unterschied zum Matt ist genau ein Wort — und genau der wird am
     * haeufigsten missverstanden. Deshalb steht er hier als eigene Pruefung.
     */
    const bild = SCHACH_GRUNDLAGEN.bilder("patt")[0];
    const stand = bild.runde.stand;

    gleich(SCHACH.imSchach(stand, "schwarz"), false, "KEIN Schach");
    gleich(SCHACH.alleZuege(stand).length, 0, "und trotzdem kein Zug");
    gleich(SCHACH.lage(stand).sieger, "", "niemand gewinnt");
});

/* ------------------------------------------------------------------ *
 * Die Sonderzuege — sie werden wirklich gezogen
 * ------------------------------------------------------------------ */

pruefe("Jeder Sonderzug hat ein Vorher und ein Nachher", () => {
    for (const kapitel of SCHACH_GRUNDLAGEN.kapitelDerGruppe("sonderzuege")) {
        const bilder = SCHACH_GRUNDLAGEN.bilder(kapitel.id);

        gleich(bilder.length, 2, kapitel.id + ": zwei Bilder");
        wahr(bilder[0].runde.stand.brett !== bilder[1].runde.stand.brett,
            kapitel.id + ": und sie unterscheiden sich sichtbar");
        gleich(bilder[1].wege.length, 1, kapitel.id + ": das Nachher zeigt den Weg");
    }
});

pruefe("Aus dem Bauern wird wirklich eine Dame", () => {
    const bilder = SCHACH_GRUNDLAGEN.bilder("umwandlung");
    const nachher = bilder[1].runde.stand;
    const ziel = bilder[1].marken[0];

    gleich(SCHACH.figurAuf(nachher, ziel), "D", "auf dem Zielfeld steht eine Dame");
    gleich(nachher.brett.indexOf("B"), -1, "und kein weisser Bauer mehr");
});

pruefe("Bei der Rochade bewegen sich zwei Figuren", () => {
    const bilder = SCHACH_GRUNDLAGEN.bilder("rochade");
    const vorher = bilder[0].runde.stand;
    const nachher = bilder[1].runde.stand;

    /* Zwei Figuren stehen woanders — der Koenig und der Turm. */
    let anders = 0;
    for (let feld = 0; feld < vorher.brett.length; feld++) {
        if (vorher.brett[feld] !== nachher.brett[feld]) {
            anders++;
        }
    }
    gleich(anders, 4, "vier Felder haben gewechselt: zwei Figuren, je Start und Ziel");
    wahr(nachher.brett.indexOf("K") !== vorher.brett.indexOf("K"),
        "der Koenig steht woanders");
    wahr(nachher.brett.indexOf("T") !== vorher.brett.indexOf("T"),
        "und der Turm auch");
});

pruefe("Im Vorbeigehen wird wirklich geschlagen", () => {
    const bilder = SCHACH_GRUNDLAGEN.bilder("enpassant");
    const vorher = bilder[0].runde.stand;
    const nachher = bilder[1].runde.stand;

    /* Vorher steht der schwarze Bauer noch da, nachher nicht mehr. */
    wahr(vorher.brett.indexOf("b") !== -1, "vorher steht der gegnerische Bauer da");
    gleich(nachher.brett.indexOf("b"), -1, "nachher ist er weg");
    wahr(nachher.brett.indexOf("B") !== -1, "und der eigene steht noch");
});

/* ------------------------------------------------------------------ *
 * Die Figurenwerte
 * ------------------------------------------------------------------ */

pruefe("Die Werte kommen aus derselben Tabelle wie die Auswertung", () => {
    /*
     * Zwei Listen von Figurenwerten wuerden auseinanderlaufen — die Anleitung
     * saehe dann anders aus als die Bilanz am Ende der Partie. Deshalb liest
     * sie `SCHACH_RUNDE.FIGUR_WERT`, und das wird hier festgehalten.
     */
    for (const eintrag of SCHACH_GRUNDLAGEN.werte()) {
        gleich(eintrag.wert, SCHACH_RUNDE.FIGUR_WERT[eintrag.art],
            eintrag.art + ": derselbe Wert wie in der Bilanz");
        wahr(eintrag.name.length > 0, eintrag.art + ": hat einen Namen");
        wahr(eintrag.satz.length > 20, eintrag.art + ": hat einen Satz");
    }
});

pruefe("Die Reihenfolge geht vom Wertvollsten zum Kleinsten", () => {
    /*
     * Der Koenig steht bewusst oben, obwohl sein Wert 0 ist: Er ist nicht
     * wertvoll, sondern unersetzlich. Geprueft wird deshalb ab der Dame.
     */
    const werte = SCHACH_GRUNDLAGEN.werte();

    gleich(werte[0].art, "K", "der Koenig steht oben");

    for (let stelle = 2; stelle < werte.length; stelle++) {
        wahr(werte[stelle].wert <= werte[stelle - 1].wert,
            werte[stelle].name + " ist nicht mehr wert als " + werte[stelle - 1].name);
    }
});

console.log(anzahlOk + " ok, " + anzahlFehler + " Fehler");
process.exit(anzahlFehler === 0 ? 0 : 1);
