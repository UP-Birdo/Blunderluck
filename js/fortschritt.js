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
                ergebnis.spiele[app] = (y.stand > x.stand) ? y : x;
            }
        }
        return ergebnis;
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
        const tage = FORTSCHRITT.alleTage(stand);
        const heute = tage.has(datum);
        let tag = heute ? datum : FORTSCHRITT._vortag(datum);
        let laenge = 0;
        let genutzt = 0;
        let vorrat = Math.max(0, Math.floor(schutz || 0));
        for (let schritt = 0; schritt < 400; schritt++) {
            if (tage.has(tag)) {
                laenge++;
            } else if (laenge > 0 && vorrat > 0 && tage.has(FORTSCHRITT._vortag(tag))) {
                vorrat--;
                genutzt++;
            } else {
                break;
            }
            tag = FORTSCHRITT._vortag(tag);
        }
        return { tage: laenge, heute: heute, schutzGenutzt: genutzt };
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
    tagesaufgabe(stand, datum, geschafft, zeitpunkt, app, schutz, schwierigkeit) {
        const sauber = FORTSCHRITT.normalisieren(stand);
        const name = app || FORTSCHRITT.APP;
        const zweig = sauber.spiele[name] || FORTSCHRITT.spielLeer();
        const alt = (zweig.heute && zweig.heute.datum === datum) ? zweig.heute : { datum: datum, versuche: 0, figuren: 0 };
        const heute = Object.assign({}, alt, { datum: datum, versuche: alt.versuche + 1 });
        let xp = 0;

        if (geschafft && !alt.figuren) {
            heute.figuren = heute.versuche === 1 ? 3 : (heute.versuche === 2 ? 2 : 1);
            const andereHeute = Object.keys(sauber.spiele).some((anderes) => anderes !== name
                && sauber.spiele[anderes].heute && sauber.spiele[anderes].heute.datum === datum
                && sauber.spiele[anderes].heute.figuren > 0);
            xp += Math.round(FORTSCHRITT.tagesGrund(schwierigkeit) * (andereHeute ? FORTSCHRITT.BEIDE_FAKTOR : 1));
            xp += heute.figuren * FORTSCHRITT.XP.figur;
            zweig.tage = (zweig.tage || []).concat([datum]);
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
    }
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = FORTSCHRITT;
}
