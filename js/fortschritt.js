/*
 * fortschritt.js — XP und Level über alle UPCrew-Spiele (seit v0.146.0,
 * Runde 5, Design\3D-Schrift\docs\AUFTRAEGE-RUNDE-5.md; Regeln und Zahlen:
 * Apps\UPCrew\docs\FORTSCHRITT.md, „GÜLTIGER STAND").
 *
 * Die reine Rechnung — kein Bildschirm, kein Speicher (die stehen in
 * js\fortschritt-konto.js). Ohne Browser testbar.
 *
 * WAS GILT (FORTSCHRITT.md):
 *   - XP: Partie gespielt +10 (auch verloren, auch gegen Bob), je neue
 *     Figur im Turm +10, Tagesaufgabe +15/20/30 nach Schwierigkeit und
 *     +10 je Figur (seit v0.151.0), beide Spiele an einem Tag ×1,5,
 *     Serie +5 … +35. In dieser Fassung zählt nur die Partie; Figuren und
 *     Tagesaufgabe kommen mit Turm und „Heute".
 *   - Level: Die Kosten von Level L zu L+1 sind min(100 + 25·(L−1), 500) —
 *     danach jedes Level gleich teuer, also endlos. Man beginnt bei Level 1.
 *   - Das Level ist die Stufe fürs Aussehen (`UPCREW_ANPASSEN.STUFEN`,
 *     über js\freischaltung.js `stufe()`).
 *   - Nach Level 10 alle 5 Level ein Rahmen, dazwischen ein Serien-Schutz
 *     (Nutzer 27.09.2026, Frage 6).
 *
 * DATENVERTRAG — gemeinsam mit Typoluck (seit v0.150.0, Runde 6 Teil A,
 * Design\3D-Schrift\docs\AUFTRAEGE-RUNDE-6.md; Typoluck zieht mit 0.11.0
 * nach). Er steht in BEIDEN `js\fortschritt.js`-Köpfen gleich:
 *
 *     Gerät  `upcrew.fortschritt` = { "<spieler-id oder gast>": FORTSCHRITT }
 *            (js\fortschritt-konto.js; bis v0.149.0 `blunderluck.fortschritt`)
 *     Konto  `spieler/konten/<uid>/fortschritt` = FORTSCHRITT — erst mit der
 *            Regel `SICHERHEIT.md` §11b (Nutzer spielt sie ein)
 *
 * FORTSCHRITT:
 *
 *     {
 *         "version": 1,
 *         "spiele": {
 *             "blunderluck": {           // JEDES Spiel schreibt NUR seinen
 *                 "xp": 130,             // eigenen Zweig
 *                 "partien": 13,
 *                 "gezaehlt": ["p-…"],   // Partien, die schon XP gaben
 *                 "stand": 1759000000000,// Zeitpunkt der letzten Änderung
 *                 "turm": {              // seit v0.147.0 (js\turm.js):
 *                     "figuren": { "1-0": 1, "1-3": 2 }  // je Stufe 1–3
 *                 },
 *                 "heute": {             // seit v0.149.0: die Tagesaufgabe
 *                     "datum": "2026-09-27",  // (Blunderluck: Tagesbrett,
 *                     "versuche": 2,          //  Typoluck: Tageswort)
 *                     "figuren": 2            // 0 = noch nicht geschafft
 *                 },
 *                 "tage": ["2026-09-26", "2026-09-27"], // Tage mit
 *                                                       // geschaffter Aufgabe
 *                 // VEREINBART, noch nicht geschrieben (kommen mit
 *                 // v0.151.0 ff.; bis dahin wandern sie unverändert durch):
 *                 //   "turm": { "schwuere": { "<zahl>": figuren } },
 *                 //   "zaehler": { siege, genauigkeitSumme,
 *                 //                genauigkeitAnzahl, besteGenauigkeit, … },
 *                 //   "taten": ["<id>", …]
 *             },
 *             "typoluck": { … }          // dieselben Felder, `heute` =
 *         },                             // Tageswort; wandert unverändert
 *         "schutz": { … }                // durch. Serien-Schutz, falls nicht
 *     }                                  // je Zweig (vereinbart, ungenutzt)
 *
 * Im Gerätespeicher kann ein Eintrag zusätzlich Typolucks FLACHE Felder
 * aus 0.10.0 tragen (`xp`, `heute.wort`, `serie` …) — sie wandern hier
 * unverändert durch, bis Typoluck sie selbst umzieht.
 *
 * DIE SERIE SEIT v0.152.0 (Nutzer 27.09.2026: „Serie soll einfach: einmal
 * eine Runde starten, egal welches Game" · „ja über 60"). In BEIDEN
 * `fortschritt.js` gleich:
 *   - Ein Tag zählt, sobald in IRGENDEINEM UPCrew-Spiel eine Runde
 *     GESTARTET wird (`rundeGestartet`, Blunderluck: beim Anpfiff jeder
 *     Partie — Turm, Frei, Freunde, Tagesbrett). Der Tag kommt in `tage`
 *     (höchstens 60 gemerkt). Die Tagesaufgabe trägt ihren Tag weiter ein;
 *     ihre XP und die Karten „Heute" bleiben, wie sie sind.
 *   - ÜBER 60 TAGE trägt ein ZÄHLER am Zweig, nur Zahlen in `zaehler` (die
 *     Regel §11b erlaubt dort beliebige Buchstaben-Namen mit Zahlen — keine
 *     Regeländerung): `serie` = Länge der Serie, `serieBis` = ihr letzter Tag
 *     als Zahl JJJJMMTT, `serieSchutz` = in dieser Serie schon überbrückte
 *     Tage. Jedes Spiel schreibt nur SEINEN Zähler, und zwar den über BEIDE
 *     Spiele gerechneten Stand (`serieStand`).
 *   - GERECHNET wird so (`serieStand`): Man nimmt den Zähler mit dem
 *     NEUESTEN `serieBis` aus allen Zweigen und geht von dort die Tage aus
 *     `tage` (aller Zweige) vorwärts: der nächste Tag +1; EIN fehlender Tag
 *     wird von einem Schutz überbrückt (+1, der fehlende Tag zählt nicht mit);
 *     zwei oder mehr fehlende Tage beginnen neu bei 1. Ohne Zähler (alte
 *     Stände) beginnt es beim ältesten Tag — das ergibt genau die bisherige
 *     Rechnung. Warum ein Zähler statt einer langen Tagesliste: Die Liste
 *     wüchse endlos und wäre gegen die Regel (§11b: `tage` höchstens 1000
 *     Einträge) irgendwann zu lang; zwei Zahlen reichen für jede Länge.
 *   - SCHUTZ: je Serie so viele Tage wie verdient (`schutzVerdient`, über das
 *     Level), danach gekaufte Flammen-Schilde (`zaehler.schildGekauft` −
 *     `schildGenutzt`, js\upcrew-muenzen.js). Ein gekaufter Schild wird beim
 *     Überbrücken verbraucht (`schildGenutzt` +1 im Spiel, das die Serie
 *     fortschreibt).
 *   - ZUSAMMENFÜHREN (gleiches Spiel, zwei Geräte): Zähler, die nur wachsen
 *     (Münzen, Käufe, Tagesaufgaben …), nehmen je Name den GRÖSSEREN Wert;
 *     die drei Serien-Zähler kommen gemeinsam aus der Fassung mit dem
 *     neueren `serieBis` (`zusammenfuehren`).
 *
 * WARUM JE SPIEL EIN ZWEIG: Das Level zählt die XP ALLER Spiele. Schriebe
 * jedes Spiel eine gemeinsame Summe, überschriebe das eine die XP des
 * anderen, sobald beide abwechselnd speichern. Mit Zweigen ist jedes Spiel
 * Herr über seinen eigenen, und beim Zusammenführen gewinnt je Zweig der
 * neuere `stand` (`zusammenfuehren`). Die Summe wird nur GERECHNET.
 */

const FORTSCHRITT = {

    VERSION: 1,

    /* Dieses Spiel — der Zweig, den Blunderluck schreibt. */
    APP: "blunderluck",

    /* Die XP-Quellen (FORTSCHRITT.md, „GÜLTIGER STAND"). */
    XP: {
        partie: 10,
        figur: 10,
        tagesaufgabe: 20
    },

    /* Grund-XP der Tagesaufgabe nach Schwierigkeit (seit v0.151.0, Runde 6
       Nachtrag: „je nachdem, wie schwer was ist", in Typoluck gleich):
       1 = leicht 15, 2 = mittel 20, 3 = schwer 30. Blunderluck: Matt in N
       ist Schwierigkeit N. Dazu +10 je Figur (XP.figur). */
    TAGES_GRUND: { 1: 15, 2: 20, 3: 30 },

    /* So viele gezählte Partie-Kennungen merkt sich ein Zweig. Eine Partie
       gibt ihre XP, sobald ihr Abschluss erscheint — später taucht sie nicht
       mehr auf; 60 reichen weit über jede Liste offener Abschlüsse hinaus. */
    GEZAEHLT_MAX: 60,

    /* Schutz gegen offensichtlichen Unsinn aus dem Speicher. */
    XP_MAX: 10000000,

    /* So viele Tage mit geschaffter Tagesaufgabe merkt sich ein Zweig —
       genug für jede sichtbare Serie (die Anzeige zeigt 7). */
    TAGE_MAX: 60,

    /* Die Serie bringt je Tag 5 XP mehr, höchstens 35 (FORTSCHRITT.md:
       „Serie +5…35"), und beide Spiele an einem Tag ×1,5 auf die
       Tagesaufgabe. */
    SERIE_XP: 5,
    SERIE_XP_MAX: 35,
    BEIDE_FAKTOR: 1.5,

    /* Rahmen und Titel am Profilbild. EINE Regel für beide Spiele (Runde 6
       Nachtrag, seit v0.151.0): der erste Rahmen ab Level 10, dann alle 5
       Level einer (10, 15, 20, 25 …): Silber 10, Gold 15, Platin 20, danach
       „Glanz <Level>" (`belohnungen`) — genau wie Typoluck 0.14.0. Bis
       v0.150.0 gab es Kupfer schon ab 5 (entfallen). */
    RAHMEN: [
        { ab: 10, id: "silber", name: "Silber" },
        { ab: 15, id: "gold", name: "Gold" },
        { ab: 20, id: "platin", name: "Platin" }
    ],

    /* Ab diesem Level ist jeder Rahmen ein „Glanz" (nach Platin). */
    GLANZ_AB: 25,

    TITEL: [
        { ab: 1, name: "Neuling" },
        { ab: 10, name: "Stammgast" },
        { ab: 25, name: "Kenner" },
        { ab: 50, name: "Legende" }
    ],

    /* ---------------------------------------------------------------- *
     * Grundformen
     * ---------------------------------------------------------------- */

    leer() {
        return { version: FORTSCHRITT.VERSION, spiele: {} };
    },

    spielLeer() {
        return { xp: 0, partien: 0, gezaehlt: [], stand: 0 };
    },

    _istObjekt(wert) {
        return !!wert && typeof wert === "object" && !Array.isArray(wert);
    },

    _zahl(wert, hoechstens) {
        return (typeof wert === "number" && isFinite(wert) && wert > 0)
            ? Math.min(Math.floor(wert), hoechstens) : 0;
    },

    /*
     * Bringt einen beliebigen Stand in Form. Unbekannte Felder und die
     * Zweige anderer Spiele wandern unverändert durch (additiver
     * Datenvertrag, wie am Spieler-Eintrag); geprüft werden nur die Felder,
     * die hier gerechnet werden.
     */
    normalisieren(roh) {
        const stand = FORTSCHRITT.leer();
        if (!FORTSCHRITT._istObjekt(roh)) {
            return stand;
        }
        for (const schluessel of Object.keys(roh)) {
            if (!(schluessel in stand)) {
                stand[schluessel] = JSON.parse(JSON.stringify(roh[schluessel]));
            }
        }
        const spiele = FORTSCHRITT._istObjekt(roh.spiele) ? roh.spiele : {};
        for (const app of Object.keys(spiele)) {
            if (!FORTSCHRITT._istObjekt(spiele[app])) {
                continue;
            }
            const zweig = JSON.parse(JSON.stringify(spiele[app]));
            zweig.xp = FORTSCHRITT._zahl(zweig.xp, FORTSCHRITT.XP_MAX);
            zweig.partien = FORTSCHRITT._zahl(zweig.partien, FORTSCHRITT.XP_MAX);
            zweig.stand = FORTSCHRITT._zahl(zweig.stand, Number.MAX_SAFE_INTEGER);
            zweig.gezaehlt = Array.isArray(zweig.gezaehlt)
                ? zweig.gezaehlt.filter((id) => typeof id === "string" && id !== "")
                    .slice(-FORTSCHRITT.GEZAEHLT_MAX)
                : [];
            /* Der Turm (seit v0.147.0): nur Schlüssel „Zahl-Zahl" mit 1
               bis 3 Figuren. Fehlt er, gibt es noch keine Figur. */
            if ("turm" in zweig) {
                const roheFiguren = (FORTSCHRITT._istObjekt(zweig.turm)
                    && FORTSCHRITT._istObjekt(zweig.turm.figuren)) ? zweig.turm.figuren : {};
                const figuren = {};
                for (const schluessel of Object.keys(roheFiguren)) {
                    const wert = roheFiguren[schluessel];
                    if (/^\d{1,2}-\d{1,2}$/.test(schluessel) && Number.isInteger(wert) && wert > 0) {
                        figuren[schluessel] = Math.min(wert, 3);
                    }
                }
                zweig.turm = Object.assign({},
                    FORTSCHRITT._istObjekt(zweig.turm) ? zweig.turm : {}, { figuren: figuren });
            }
            /* Heute und die Tage der Serie (seit v0.149.0). */
            if ("heute" in zweig) {
                const h = FORTSCHRITT._istObjekt(zweig.heute) ? zweig.heute : {};
                zweig.heute = Object.assign({}, h, {
                    datum: FORTSCHRITT._istDatum(h.datum) ? h.datum : "",
                    versuche: FORTSCHRITT._zahl(h.versuche, 1000),
                    figuren: Math.min(FORTSCHRITT._zahl(h.figuren, 3), 3)
                });
            }
            if ("tage" in zweig) {
                zweig.tage = (Array.isArray(zweig.tage) ? zweig.tage : [])
                    .filter((tag, stelle, liste) => FORTSCHRITT._istDatum(tag) && liste.indexOf(tag) === stelle)
                    .sort()
                    .slice(-FORTSCHRITT.TAGE_MAX);
            }
            stand.spiele[app] = zweig;
        }
        return stand;
    },

    /* Der Zweig eines Spiels — immer ein gültiger, notfalls ein leerer. */
    zweig(stand, app) {
        const sauber = FORTSCHRITT.normalisieren(stand);
        return sauber.spiele[app || FORTSCHRITT.APP] || FORTSCHRITT.spielLeer();
    },

    /* ---------------------------------------------------------------- *
     * Zusammenführen: je Spiel gewinnt der neuere Zweig
     * ---------------------------------------------------------------- */

    zusammenfuehren(a, b) {
        const eins = FORTSCHRITT.normalisieren(a);
        const zwei = FORTSCHRITT.normalisieren(b);
        const ergebnis = Object.assign({}, zwei, eins, { spiele: {} });
        const apps = new Set(Object.keys(eins.spiele).concat(Object.keys(zwei.spiele)));
        for (const app of apps) {
            const x = eins.spiele[app];
            const y = zwei.spiele[app];
            if (!x || !y) {
                ergebnis.spiele[app] = x || y;
            } else {
                const neuer = (y.stand > x.stand) ? y : x;
                const aelter = (neuer === y) ? x : y;
                ergebnis.spiele[app] = FORTSCHRITT._zaehlerZusammen(neuer, aelter);
            }
        }
        return ergebnis;
    },

    /* Die drei Zähler der Serie — sie gehören zusammen (seit v0.152.0). */
    SERIE_ZAEHLER: ["serie", "serieBis", "serieSchutz"],

    /*
     * Zwei Fassungen DESSELBEN Zweigs (zwei Geräte): die neuere gewinnt wie
     * bisher, aber ihre `zaehler` nehmen je Name den grösseren Wert (sie
     * wachsen nur — sonst ginge z. B. eine auf dem anderen Gerät verdiente
     * Münze verloren); die Serien-Zähler kommen gemeinsam aus der Fassung
     * mit dem neueren `serieBis` (seit v0.152.0).
     */
    _zaehlerZusammen(neuer, aelter) {
        const a = FORTSCHRITT._istObjekt(neuer.zaehler) ? neuer.zaehler : null;
        const b = FORTSCHRITT._istObjekt(aelter.zaehler) ? aelter.zaehler : null;
        if (!b) {
            return neuer;
        }
        const zaehler = Object.assign({}, a || {});
        for (const k of Object.keys(b)) {
            if (FORTSCHRITT.SERIE_ZAEHLER.indexOf(k) !== -1) {
                continue;
            }
            if (typeof b[k] === "number" && !(typeof zaehler[k] === "number" && zaehler[k] >= b[k])) {
                zaehler[k] = b[k];
            }
        }
        const bisA = (a && typeof a.serieBis === "number") ? a.serieBis : -1;
        const bisB = typeof b.serieBis === "number" ? b.serieBis : -1;
        if (bisB > bisA) {
            for (const k of FORTSCHRITT.SERIE_ZAEHLER) {
                if (typeof b[k] === "number") {
                    zaehler[k] = b[k];
                }
            }
        }
        return Object.assign({}, neuer, { zaehler: zaehler });
    },

    /* ---------------------------------------------------------------- *
     * XP und Level
     * ---------------------------------------------------------------- */

    /* XP aller Spiele zusammen. */
    gesamtXp(stand) {
        const sauber = FORTSCHRITT.normalisieren(stand);
        return Object.keys(sauber.spiele)
            .reduce((summe, app) => summe + sauber.spiele[app].xp, 0);
    },

    /* Was Level L bis zum nächsten kostet. */
    levelKosten(level) {
        const l = Math.max(1, Math.floor(level));
        return Math.min(100 + 25 * (l - 1), 500);
    },

    /*
     * Level aus XP: { level, imLevel, kosten, anteil }. `imLevel` sind die
     * XP innerhalb des laufenden Levels, `anteil` ihr Bruchteil (0 bis
     * unter 1) — der Ring um das Profilbild.
     */
    levelAus(xp) {
        let rest = FORTSCHRITT._zahl(xp, FORTSCHRITT.XP_MAX);
        let level = 1;
        while (rest >= FORTSCHRITT.levelKosten(level)) {
            rest -= FORTSCHRITT.levelKosten(level);
            level++;
        }
        const kosten = FORTSCHRITT.levelKosten(level);
        return { level: level, imLevel: rest, kosten: kosten, anteil: rest / kosten };
    },

    level(stand) {
        return FORTSCHRITT.levelAus(FORTSCHRITT.gesamtXp(stand));
    },

    /*
     * EINE PARTIE ZÄHLEN: +10 XP, einmal je Partie-Kennung. Liefert einen
     * NEUEN Stand; war die Partie schon gezählt, den unveränderten.
     *
     * `turm` (seit v0.147.0, wahlfrei): { schluessel: "2-3", figuren: 0–3 }
     * — die Wertung einer Turm-Partie, im SELBEN Schritt gezählt (dieselbe
     * Sperre gegen doppeltes Zählen). Es bleibt die BESTE Wertung der
     * Stufe; jede Figur mehr als vorher bringt +10 XP („neue Figur").
     */
    partieZaehlen(stand, partieId, zeitpunkt, app, turm) {
        const sauber = FORTSCHRITT.normalisieren(stand);
        const name = app || FORTSCHRITT.APP;
        const zweig = sauber.spiele[name] || FORTSCHRITT.spielLeer();
        if (!partieId || zweig.gezaehlt.indexOf(partieId) !== -1) {
            return sauber;
        }
        zweig.xp = Math.min(zweig.xp + FORTSCHRITT.XP.partie, FORTSCHRITT.XP_MAX);
        zweig.partien += 1;
        zweig.gezaehlt = zweig.gezaehlt.concat([partieId]).slice(-FORTSCHRITT.GEZAEHLT_MAX);
        zweig.stand = Math.max(zweig.stand + 1, zeitpunkt || 0);

        if (turm && /^\d{1,2}-\d{1,2}$/.test(turm.schluessel)
                && Number.isInteger(turm.figuren) && turm.figuren > 0) {
            const figuren = Object.assign({}, (zweig.turm && zweig.turm.figuren) || {});
            const vorher = figuren[turm.schluessel] || 0;
            const neu = Math.min(turm.figuren, 3);
            if (neu > vorher) {
                figuren[turm.schluessel] = neu;
                zweig.xp = Math.min(zweig.xp + (neu - vorher) * FORTSCHRITT.XP.figur, FORTSCHRITT.XP_MAX);
            }
            zweig.turm = Object.assign({}, zweig.turm || {}, { figuren: figuren });
        }

        sauber.spiele[name] = zweig;
        return sauber;
    },

    /* ---------------------------------------------------------------- *
     * Heute und die Serie (seit v0.149.0)
     * ---------------------------------------------------------------- */

    _istDatum(wert) {
        return typeof wert === "string" && /^\d{4}-\d{2}-\d{2}$/.test(wert);
    },

    /* Das Datum eines Zeitpunkts in ORTSZEIT als „JJJJ-MM-TT" — ein Tag
       beginnt um Mitternacht auf dem Gerät. */
    datumVon(zeitpunkt) {
        const d = new Date(zeitpunkt);
        const zwei = (zahl) => (zahl < 10 ? "0" : "") + zahl;
        return d.getFullYear() + "-" + zwei(d.getMonth() + 1) + "-" + zwei(d.getDate());
    },

    /* Der Tag davor, als „JJJJ-MM-TT" (rechnet in UTC — Datumsgrenzen
       spielen dabei keine Rolle, nur die Kalenderfolge). */
    _vortag(datum) {
        const d = new Date(datum + "T12:00:00Z");
        d.setUTCDate(d.getUTCDate() - 1);
        return d.toISOString().slice(0, 10);
    },

    /* Die Tagesaufgabe eines Spiels HEUTE: { versuche, figuren } — 0/0,
       wenn der gemerkte Tag nicht heute ist. */
    heuteVon(stand, app, datum) {
        const zweig = FORTSCHRITT.zweig(stand, app);
        const h = zweig.heute;
        if (!h || h.datum !== datum) {
            return { versuche: 0, figuren: 0 };
        }
        return { versuche: h.versuche, figuren: h.figuren };
    },

    /* Alle Tage mit geschaffter Tagesaufgabe, über alle Spiele. */
    alleTage(stand) {
        const sauber = FORTSCHRITT.normalisieren(stand);
        const tage = new Set();
        for (const app of Object.keys(sauber.spiele)) {
            for (const tag of sauber.spiele[app].tage || []) {
                tage.add(tag);
            }
        }
        return tage;
    },

    /*
     * DIE SERIE: wie viele Tage am Stück bis heute (oder bis gestern, wenn
     * heute noch nichts geschafft ist) eine Tagesaufgabe geschafft wurde —
     * in irgendeinem Spiel. Ein fehlender Tag wird von einem SERIEN-SCHUTZ
     * überbrückt, solange welche da sind (`schutz`, verdient über das
     * Level). Liefert { tage, heute, schutzGenutzt }.
     *
     * Vereinfachung, bewusst: Gezählt wird nur, was die LAUFENDE Serie an
     * Schutz braucht; ein Schutz, der eine längst gerissene Serie einmal
     * gerettet hätte, wird nicht rückwirkend abgezogen.
     */
    serie(stand, datum, schutz) {
        const level = Math.max(0, Math.floor(schutz || 0));
        const st = FORTSCHRITT.serieStand(stand, level, datum);
        const leer = { tage: 0, heute: false, schutzGenutzt: 0 };
        if (!st.bis) {
            return leer;
        }
        if (st.bis === datum) {
            return { tage: st.tage, heute: true, schutzGenutzt: st.schutzImLauf };
        }
        const luecke = FORTSCHRITT._tageZwischen(st.bis, datum) - 1;
        if (luecke === 0) {
            return { tage: st.tage, heute: false, schutzGenutzt: st.schutzImLauf };
        }
        /* Gestern fehlt: Die Serie lebt noch, wenn heute ein Schutz den
           Tag überbrücken kann (verbraucht wird er erst beim nächsten Start). */
        if (luecke === 1 && (level - st.schutzImLauf > 0 || st.schildeFrei > 0)) {
            return { tage: st.tage, heute: false, schutzGenutzt: st.schutzImLauf };
        }
        return leer;
    },

    /* „JJJJ-MM-TT" ↔ Zahl JJJJMMTT (für `zaehler.serieBis`). */
    _datumZahl(datum) {
        return FORTSCHRITT._istDatum(datum) ? Number(datum.replace(/-/g, "")) : 0;
    },

    _zahlDatum(zahl) {
        const t = String(Math.floor(Number(zahl) || 0));
        return /^\d{8}$/.test(t) ? t.slice(0, 4) + "-" + t.slice(4, 6) + "-" + t.slice(6, 8) : "";
    },

    /* Wie viele Kalendertage von `a` bis `b` („JJJJ-MM-TT"), b nach a > 0. */
    _tageZwischen(a, b) {
        return Math.round((Date.parse(b + "T12:00:00Z") - Date.parse(a + "T12:00:00Z")) / 86400000);
    },

    /* Summe eines Zählers über alle Zweige. */
    _zaehlerSumme(stand, name) {
        const sauber = FORTSCHRITT.normalisieren(stand);
        let summe = 0;
        for (const app of Object.keys(sauber.spiele)) {
            const z = sauber.spiele[app].zaehler;
            if (FORTSCHRITT._istObjekt(z) && typeof z[name] === "number" && isFinite(z[name]) && z[name] > 0) {
                summe += Math.floor(z[name]);
            }
        }
        return summe;
    },

    /* Gekaufte, noch nicht verbrauchte Flammen-Schilde über alle Spiele. */
    schildVorrat(stand) {
        return Math.max(0, FORTSCHRITT._zaehlerSumme(stand, "schildGekauft")
            - FORTSCHRITT._zaehlerSumme(stand, "schildGenutzt"));
    },

    /*
     * DER STAND DER SERIE über alle Spiele (seit v0.152.0, Kopf „DIE SERIE"):
     * { tage, bis ("JJJJ-MM-TT" oder ""), schutzImLauf, schildeFrei,
     *   schildeVerbraucht }. `schildeVerbraucht` = gekaufte Schilde, die seit
     * dem neuesten Zähler zum Überbrücken nötig waren (das schreibende Spiel
     * bucht sie als `schildGenutzt`). Tage nach `bisDatum` zählen nicht.
     */
    serieStand(stand, levelSchutz, bisDatum) {
        const sauber = FORTSCHRITT.normalisieren(stand);
        const level = Math.max(0, Math.floor(levelSchutz || 0));
        const grenze = FORTSCHRITT._istDatum(bisDatum) ? bisDatum : "9999-12-31";

        let tage = 0;
        let bis = "";
        let schutzImLauf = 0;
        for (const app of Object.keys(sauber.spiele)) {
            const z = sauber.spiele[app].zaehler;
            if (!FORTSCHRITT._istObjekt(z)) {
                continue;
            }
            const datum = FORTSCHRITT._zahlDatum(z.serieBis);
            const laenge = Math.floor(Number(z.serie) || 0);
            if (!datum || datum > grenze || laenge < 1) {
                continue;
            }
            if (datum > bis || (datum === bis && laenge > tage)) {
                bis = datum;
                tage = laenge;
                schutzImLauf = Math.max(0, Math.floor(Number(z.serieSchutz) || 0));
            }
        }

        let schildeFrei = FORTSCHRITT.schildVorrat(sauber);
        let verbraucht = 0;
        const danach = Array.from(FORTSCHRITT.alleTage(sauber))
            .filter((tag) => tag > bis && tag <= grenze).sort();
        for (const tag of danach) {
            if (!bis) {
                tage = 1;
                schutzImLauf = 0;
            } else {
                const luecke = FORTSCHRITT._tageZwischen(bis, tag) - 1;
                if (luecke === 0) {
                    tage++;
                } else if (luecke === 1 && schutzImLauf < level) {
                    tage++;
                    schutzImLauf++;
                } else if (luecke === 1 && schildeFrei > 0) {
                    tage++;
                    schutzImLauf++;
                    schildeFrei--;
                    verbraucht++;
                } else {
                    tage = 1;
                    schutzImLauf = 0;
                }
            }
            bis = tag;
        }
        return { tage: bis ? tage : 0, bis: bis, schutzImLauf: schutzImLauf,
            schildeFrei: schildeFrei, schildeVerbraucht: verbraucht };
    },

    /*
     * EINE RUNDE WURDE GESTARTET (seit v0.152.0): Der Tag zählt für die Serie.
     * Einmal je Tag und Spiel; sonst unverändert. Schreibt den Tag in `tage`
     * und den über beide Spiele gerechneten Serien-Stand in den eigenen
     * `zaehler` (serie, serieBis, serieSchutz; verbrauchte gekaufte Schilde
     * in `schildGenutzt`). Liefert { stand, neu, serie }.
     */
    rundeGestartet(stand, datum, zeitpunkt, app, schutz) {
        const sauber = FORTSCHRITT.normalisieren(stand);
        const name = app || FORTSCHRITT.APP;
        const zweig = sauber.spiele[name] || FORTSCHRITT.spielLeer();
        const zaehler = FORTSCHRITT._zaehlerAnlegen(zweig);
        const tageListe = Array.isArray(zweig.tage) ? zweig.tage : [];
        if (!FORTSCHRITT._istDatum(datum)
                || (tageListe.indexOf(datum) !== -1 && zaehler.serieBis === FORTSCHRITT._datumZahl(datum))) {
            return { stand: sauber, neu: false, serie: FORTSCHRITT.serie(sauber, datum, schutz).tage };
        }
        zweig.tage = tageListe.indexOf(datum) === -1 ? tageListe.concat([datum]) : tageListe;
        sauber.spiele[name] = zweig;
        const st = FORTSCHRITT.serieStand(sauber, schutz, datum);
        zaehler.serie = st.tage;
        zaehler.serieBis = FORTSCHRITT._datumZahl(st.bis);
        zaehler.serieSchutz = st.schutzImLauf;
        if (st.schildeVerbraucht > 0) {
            zaehler.schildGenutzt = (zaehler.schildGenutzt || 0) + st.schildeVerbraucht;
        }
        zweig.zaehler = zaehler;
        zweig.stand = Math.max(zweig.stand + 1, zeitpunkt || 0);
        sauber.spiele[name] = zweig;
        const neu = FORTSCHRITT.normalisieren(sauber);
        return { stand: neu, neu: true, serie: st.tage };
    },

    /*
     * Die Zähler eines Zweigs (seit v0.152.0), mit einmaligem Umzug: Bis
     * v0.151 standen in `tage` NUR Tage mit geschaffter Tagesaufgabe — das
     * Abzeichen „Tagesaufgaben" zählte sie dort. Seit `tage` auch gestartete
     * Runden trägt, zählt `zaehler.tagesaufgaben`; beim ersten Anlegen
     * übernimmt es die bisherige Zahl der Tage.
     */
    _zaehlerAnlegen(zweig) {
        const zaehler = Object.assign({}, FORTSCHRITT._istObjekt(zweig.zaehler) ? zweig.zaehler : {});
        if (typeof zaehler.tagesaufgaben !== "number") {
            zaehler.tagesaufgaben = (Array.isArray(zweig.tage) ? zweig.tage : [])
                .filter(FORTSCHRITT._istDatum).length;
        }
        return zaehler;
    },

    /*
     * EIN VERSUCH AN DER TAGESAUFGABE (Blunderluck: das Tagesbrett).
     * Liefert { stand, xp } — `xp` nur beim ersten Schaffen des Tages:
     * Grund-XP nach `schwierigkeit` (1–3, TAGES_GRUND: 15/20/30), ×1,5, wenn
     * heute schon ein ANDERES Spiel seine geschafft hat, dazu +10 je Figur
     * und die Serie (+5 je Tag, höchstens +35). Figuren: im 1. Versuch 3,
     * im 2. Versuch 2, danach 1. Ohne Angabe gilt Schwierigkeit 2.
     *
     * Schafft das andere Spiel seine Aufgabe erst SPÄTER am Tag, gibt DAS
     * Spiel das ×1,5 — jedes rechnet den Zuschlag auf seine eigene Aufgabe.
     */
    tagesaufgabe(stand, datum, geschafft, zeitpunkt, app, schutz, schwierigkeit, hilfe) {
        const sauber = FORTSCHRITT.normalisieren(stand);
        const name = app || FORTSCHRITT.APP;
        const zweig = sauber.spiele[name] || FORTSCHRITT.spielLeer();
        /* Seit v0.152.0 zählen die Tagesaufgaben im Zähler (der Umzug aus
           den alten Tagen VOR dem Eintragen dieses Tages). */
        zweig.zaehler = FORTSCHRITT._zaehlerAnlegen(zweig);
        const alt = (zweig.heute && zweig.heute.datum === datum) ? zweig.heute : { datum: datum, versuche: 0, figuren: 0 };
        const heute = Object.assign({}, alt, { datum: datum, versuche: alt.versuche + 1 });
        let xp = 0;

        if (geschafft && !alt.figuren) {
            heute.figuren = heute.versuche === 1 ? 3 : (heute.versuche === 2 ? 2 : 1);
            /* Mit Hilfe (Tipp oder Leben aus dem Shop, seit v0.152.0)
               höchstens ein Bauer. */
            if (hilfe) {
                heute.figuren = 1;
            }
            zweig.zaehler.tagesaufgaben += 1;
            const andereHeute = Object.keys(sauber.spiele).some((anderes) => anderes !== name
                && sauber.spiele[anderes].heute && sauber.spiele[anderes].heute.datum === datum
                && sauber.spiele[anderes].heute.figuren > 0);
            xp += Math.round(FORTSCHRITT.tagesGrund(schwierigkeit) * (andereHeute ? FORTSCHRITT.BEIDE_FAKTOR : 1));
            xp += heute.figuren * FORTSCHRITT.XP.figur;
            if ((zweig.tage || []).indexOf(datum) === -1) {
                zweig.tage = (zweig.tage || []).concat([datum]);
            }
            sauber.spiele[name] = zweig;
            const serie = FORTSCHRITT.serie(sauber, datum, schutz).tage;
            xp += Math.min(FORTSCHRITT.SERIE_XP * serie, FORTSCHRITT.SERIE_XP_MAX);
        }

        zweig.heute = heute;
        zweig.xp = Math.min(zweig.xp + xp, FORTSCHRITT.XP_MAX);
        zweig.stand = Math.max(zweig.stand + 1, zeitpunkt || 0);
        sauber.spiele[name] = zweig;
        return { stand: FORTSCHRITT.normalisieren(sauber), xp: xp };
    },

    /*
     * WAS ANS KONTO GEHT (seit v0.151.0): genau die Felder, die die Regel
     * `SICHERHEIT.md` §11b erlaubt — sonst lehnt die Datenbank den GANZEN
     * Konto-Eintrag ab. Weg bleiben alles Unbekannte, Typolucks flache
     * 0.10.0-Felder und `umzug` (bleibt nur auf dem Gerät, Runde 6
     * Nachtrag). Zahlen werden auf die Grenzen der Regel gekürzt. Wer hier
     * ein Feld ergänzt, ergänzt es im selben Zug in §11b.
     */
    KONTO_SPIELE: ["blunderluck", "typoluck"],

    fuerKonto(stand) {
        const sauber = FORTSCHRITT.normalisieren(stand);
        const zahl = (wert, hoechstens) => FORTSCHRITT._zahl(wert, hoechstens);
        const datum = (wert) => FORTSCHRITT._istDatum(wert) ? wert : "";
        const zahlenTabelle = (roh, muster, hoechstens) => {
            const aus = {};
            if (FORTSCHRITT._istObjekt(roh)) {
                for (const k of Object.keys(roh)) {
                    if (muster.test(k) && typeof roh[k] === "number" && isFinite(roh[k])) {
                        aus[k] = Math.max(0, Math.min(Math.floor(roh[k]), hoechstens));
                    }
                }
            }
            return aus;
        };
        const ergebnis = { version: FORTSCHRITT.VERSION, spiele: {} };
        for (const app of FORTSCHRITT.KONTO_SPIELE) {
            const z = sauber.spiele[app];
            if (!z) {
                continue;
            }
            const zweig = {
                xp: zahl(z.xp, FORTSCHRITT.XP_MAX),
                partien: zahl(z.partien, FORTSCHRITT.XP_MAX),
                stand: zahl(z.stand, Number.MAX_SAFE_INTEGER),
                gezaehlt: (Array.isArray(z.gezaehlt) ? z.gezaehlt : [])
                    .filter((id) => typeof id === "string" && id.length <= 64).slice(-FORTSCHRITT.GEZAEHLT_MAX),
                tage: (Array.isArray(z.tage) ? z.tage : []).filter(FORTSCHRITT._istDatum).slice(-FORTSCHRITT.TAGE_MAX)
            };
            if (FORTSCHRITT._istObjekt(z.heute)) {
                zweig.heute = {
                    datum: datum(z.heute.datum),
                    versuche: zahl(z.heute.versuche, 1000),
                    figuren: zahl(z.heute.figuren, 3)
                };
            }
            if (FORTSCHRITT._istObjekt(z.turm)) {
                const figuren = zahlenTabelle(z.turm.figuren, /^\d{1,2}-\d{1,2}$/, 3);
                for (const k of Object.keys(figuren)) {
                    if (figuren[k] < 1) {
                        delete figuren[k];
                    }
                }
                zweig.turm = { figuren: figuren, schwuere: zahlenTabelle(z.turm.schwuere, /^\d{1,3}$/, 3) };
            }
            if (FORTSCHRITT._istObjekt(z.zaehler)) {
                zweig.zaehler = zahlenTabelle(z.zaehler, /^[a-zA-Z]{1,32}$/, 1000000000);
            }
            if (Array.isArray(z.taten)) {
                zweig.taten = z.taten.filter((id) => typeof id === "string" && id.length <= 64).slice(0, 1000);
            }
            ergebnis.spiele[app] = zweig;
        }
        if (FORTSCHRITT._istObjekt(sauber.schutz)) {
            ergebnis.schutz = zahlenTabelle(sauber.schutz, /^[a-zA-Z]{1,32}$/, 1000);
        }
        return ergebnis;
    },

    /* Grund-XP einer Tagesaufgabe der Schwierigkeit 1–3 (sonst mittel). */
    tagesGrund(schwierigkeit) {
        return FORTSCHRITT.TAGES_GRUND[schwierigkeit] || FORTSCHRITT.TAGES_GRUND[2];
    },

    /* Die Figuren-Tabelle des Turms (`{ "1-0": 1, … }`) — leer ohne Turm. */
    turmFiguren(stand, app) {
        const zweig = FORTSCHRITT.zweig(stand, app);
        return (zweig.turm && zweig.turm.figuren) ? zweig.turm.figuren : {};
    },

    /* ---------------------------------------------------------------- *
     * Belohnungen je Level
     * ---------------------------------------------------------------- */

    rahmenVon(level) {
        let gefunden = null;
        for (const rahmen of FORTSCHRITT.RAHMEN) {
            if (level >= rahmen.ab) {
                gefunden = rahmen;
            }
        }
        return gefunden;
    },

    titelVon(level) {
        let gefunden = FORTSCHRITT.TITEL[0];
        for (const titel of FORTSCHRITT.TITEL) {
            if (level >= titel.ab) {
                gefunden = titel;
            }
        }
        return gefunden;
    },

    /*
     * Was Level L bringt: [{ art, name, wert }]. `art` ist farbwelt,
     * schrift, knoepfe (das Aussehen, `stufen` = UPCREW_ANPASSEN.STUFEN),
     * rahmen, titel oder schutz. Ab Level 11 bringt jedes Level etwas:
     * durch 5 teilbar einen Rahmen, sonst einen Serien-Schutz.
     */
    belohnungen(level, stufen) {
        const liste = [];
        const tabelle = FORTSCHRITT._istObjekt(stufen) ? stufen : {};
        for (const art of ["farbwelt", "schrift", "knoepfe"]) {
            const werte = FORTSCHRITT._istObjekt(tabelle[art]) ? tabelle[art] : {};
            for (const wert of Object.keys(werte)) {
                if (werte[wert] === level) {
                    liste.push({ art: art, wert: wert, name: wert });
                }
            }
        }
        for (const rahmen of FORTSCHRITT.RAHMEN) {
            if (rahmen.ab === level) {
                liste.push({ art: "rahmen", wert: rahmen.id, name: rahmen.name });
            }
        }
        for (const titel of FORTSCHRITT.TITEL) {
            if (titel.ab === level && level > 1) {
                liste.push({ art: "titel", wert: titel.name, name: titel.name });
            }
        }
        if (level >= FORTSCHRITT.GLANZ_AB && level % 5 === 0) {
            liste.push({ art: "rahmen", wert: "glanz", name: "Glanz " + level });
        } else if (level > 10 && level % 5 !== 0) {
            liste.push({ art: "schutz", wert: "schutz", name: "Serien-Schutz" });
        }
        return liste;
    },

    /* Wie viele Serien-Schutze bis Level L verdient sind (Level 11 bis L,
       ohne die Rahmen-Level). Verbraucht werden sie mit „Heute". */
    schutzVerdient(level) {
        let anzahl = 0;
        for (let l = 11; l <= level; l++) {
            if (l % 5 !== 0) {
                anzahl++;
            }
        }
        return anzahl;
    },

    /* ---------------------------------------------------------------- *
     * DER ÖFFENTLICHE AUSZUG (seit v0.154.0, Regel §12 —
     * Apps\UPCrew\docs\DATENBANK-KONZEPT-12.md, Abschnitt 3 und K3)
     *
     * Unter §12 lesen andere nur noch `spieler/oeffentlich/<uid>`, nicht mehr
     * den ganzen Fortschritt. Was fremde Bildschirme davon brauchen (Level-
     * Karte, die fünf Abzeichen), steht im Auszug:
     *
     *     { xp, serie, serieBis, werte: { partien, besteSerie, beideTage,
     *       figuren, tagesaufgaben } }
     *
     * `xp` = Summe aller Zweige; `serie` = laufende Serie am Tag `heute`,
     * `serieBis` = ihr letzter gezählter Tag als JJJJMMTT (0 ohne Serie);
     * `werte` = die fünf Zahlen des Abzeichen-Bausteins
     * (`UPCREW_ABZEICHEN.werte`, mit der laufenden Serie). Schon unter der
     * alten Regel rechnet Blunderluck fremdes Level und fremde Abzeichen über
     * diesen Auszug (`auszugVon`) — dieselbe Rechnung wie später.
     * Grenzen wie in der Regel (xp ≤ 1e8, serie ≤ 1e5, werte ≤ 1e9).
     * ---------------------------------------------------------------- */

    AUSZUG_WERTE: ["partien", "besteSerie", "beideTage", "figuren", "tagesaufgaben"],

    auszug(stand, heute) {
        const sauber = FORTSCHRITT.normalisieren(stand);
        const datum = FORTSCHRITT._istDatum(heute) ? heute : FORTSCHRITT.datumVon(Date.now());
        const schutz = FORTSCHRITT.schutzVerdient(FORTSCHRITT.level(sauber).level);
        const serie = FORTSCHRITT.serie(sauber, datum, schutz);
        const bis = serie.tage > 0
            ? FORTSCHRITT._datumZahl(FORTSCHRITT.serieStand(sauber, schutz, datum).bis) : 0;
        const roh = (typeof UPCREW_ABZEICHEN !== "undefined" && typeof UPCREW_ABZEICHEN.werte === "function")
            ? UPCREW_ABZEICHEN.werte(sauber, serie.tage) : {};
        const werte = {};
        for (const name of FORTSCHRITT.AUSZUG_WERTE) {
            werte[name] = FORTSCHRITT._zahl(roh[name], 1000000000);
        }
        return {
            xp: FORTSCHRITT._zahl(FORTSCHRITT.gesamtXp(sauber), 100000000),
            serie: FORTSCHRITT._zahl(serie.tage, 100000),
            serieBis: bis,
            werte: werte
        };
    },

    /* Ein Auszug vom Server in Form — oder null, wenn keiner da ist. */
    auszugPruefen(roh) {
        if (!FORTSCHRITT._istObjekt(roh)) {
            return null;
        }
        const werte = {};
        const rohWerte = FORTSCHRITT._istObjekt(roh.werte) ? roh.werte : {};
        for (const name of FORTSCHRITT.AUSZUG_WERTE) {
            werte[name] = FORTSCHRITT._zahl(rohWerte[name], 1000000000);
        }
        const bis = FORTSCHRITT._zahl(roh.serieBis, 99991231);
        return {
            xp: FORTSCHRITT._zahl(roh.xp, 100000000),
            serie: FORTSCHRITT._zahl(roh.serie, 100000),
            serieBis: /^\d{8}$/.test(String(bis)) ? bis : 0,
            werte: werte
        };
    },

    /* Der Auszug eines Spieler-Eintrags: Liegt der volle `fortschritt` da
       (alte Regel, eigener Eintrag, Admin), wird aus ihm gerechnet; sonst
       gilt `auszug` vom Eintrag (§12, aus `spieler/oeffentlich`). */
    auszugVon(spieler, heute) {
        if (spieler && FORTSCHRITT._istObjekt(spieler.fortschritt)) {
            return FORTSCHRITT.auszug(spieler.fortschritt, heute);
        }
        return (spieler && FORTSCHRITT.auszugPruefen(spieler.auszug))
            || FORTSCHRITT.auszug(null, heute);
    },

    /* Level aus dem Auszug — dasselbe wie `level(stand)` am vollen Stand. */
    auszugLevel(auszug) {
        return FORTSCHRITT.levelAus(auszug ? auszug.xp : 0);
    },

    /* Die laufende Serie am Tag `heute`: sie lebt, solange ihr letzter Tag
       höchstens gestern war (einen Serien-Schutz kennt der Auszug nicht). */
    auszugSerie(auszug, heute) {
        if (!auszug || !auszug.serie || !auszug.serieBis) {
            return 0;
        }
        const datum = FORTSCHRITT._istDatum(heute) ? heute : FORTSCHRITT.datumVon(Date.now());
        const luecke = FORTSCHRITT._tageZwischen(FORTSCHRITT._zahlDatum(auszug.serieBis), datum);
        return (luecke >= 0 && luecke <= 1) ? auszug.serie : 0;
    },

    /* Ein Stand, aus dem `UPCREW_ABZEICHEN.werte` genau die fünf Werte des
       Auszugs liest (der Baustein bleibt unverändert, er kommt aus final). */
    auszugAlsStand(auszug) {
        const w = (auszug && auszug.werte) || {};
        return {
            version: 1,
            spiele: {
                auszug: {
                    xp: 0, partien: w.partien || 0, tage: [],
                    zaehler: {
                        besteSerie: w.besteSerie || 0, beideTage: w.beideTage || 0,
                        figuren: w.figuren || 0, tagesaufgaben: w.tagesaufgaben || 0
                    }
                }
            }
        };
    }
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = FORTSCHRITT;
}
