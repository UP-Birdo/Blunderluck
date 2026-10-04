/*
 * turm.js — der Turm (seit v0.147.0; NEU seit v0.160.0: mehrere Wege aus
 * einem SEED, Elite, Rast, Truhe, Händler, Fund).
 *
 * Nutzer 28.09.2026: „turm soll besser animiert werden wie ein richtiger
 * turm · auch mehrere pfade aber viel weniger runden bis zum boss auch elite
 * gegner und co“ · „ja seeds einbauen“. Vorlage: der abgenommene Entwurf
 * „Oberfläche Runde 7" (turm-seed.js,
 * TURM-TABELLE.md). Muster wie die Typoluck-Bibliothek (js\bibliothek.js).
 *
 * Die reine Tabelle und Rechnung — kein Bildschirm (js\start-turm.js), kein
 * Speicher (js\fortschritt.js, js\fortschritt-konto.js). Ohne Browser testbar.
 *
 * GRUNDSATZ: Die SCHWIERIGKEIT kommt vom Ort (Zahl der Stockwerke, Stärke je
 * Stockwerk, feste Reihen: Stockwerk 1 = Gegner, die Mitte = Truhe, das
 * vorletzte = Rast, das letzte = Boss) — gleich für jeden Seed. Die
 * ABWECHSLUNG kommt vom Seed (js\upcrew-zufall.js): welche Wege, welche
 * Station wo, welcher Gegner mit welcher Eigenheit, welche Farbe, was in
 * Fund, Händler und Truhe liegt. Seed = Spieler + Turm + Ort + Durchgang
 * (+ Version des Generators). Gespeichert wird nur die Durchgangsnummer
 * (`zaehler.turmDurchgang`) und die Version, mit der er begann
 * (`zaehler.turmGenerator`) — der Weg lässt sich jederzeit neu rechnen.
 * Bobs Züge hängen NICHT am Seed.
 *
 * EIN ORT: Stockwerke 1 … S (S = Boss), je Stockwerk 2 oder 3 Spuren; von
 * jeder Station geht es ein Stockwerk hinauf in dieselbe oder eine
 * Nachbarspur, ohne dass sich Wege kreuzen. An einer Kreuzung wählt man.
 * Gegangene Wege sind nicht noch einmal spielbar — es geht nur vorwärts.
 *
 * STATIONEN: g Gegner · e Elite (+2 Stärke und eine Verschärfung; Sieg =
 * Herzen voll und Rückfall-Punkt) · r Rast (Heilen +2 oder Zeit zurück +1;
 * Rückfall-Punkt) · t Truhe (Münzen und ein Tipp oder Zeit zurück) ·
 * h Händler (billiger als im Shop) · f Fund (Tausch) · b Boss.
 *
 * HERZEN (ab Holzhalle, wie die Bibliothek): 5 je Durchgang, nur bei einer
 * Niederlage weg (Gegner −1, Elite −2, Boss −3). Bei 0 zurück zur letzten
 * Rast oder besiegten Elite (was später kam), sonst an den Anfang des Orts;
 * die Stationen darüber sind neu zu spielen, die Herzen wieder voll.
 * Figuren und Münzen bleiben. Herzen und „neu zu spielen" liegen NUR AUF
 * DEM GERÄT (js\fortschritt-konto.js, `turmGeraet`) — die Regel §13 hat
 * dafür kein Feld; ein zweites Gerät sieht den Weg ohne Rückfall.
 *
 * SPEICHER (Regel §13, keine Änderung nötig):
 *   Kampf (g, e, b): `turm.figuren["<ort>-<nr>"]` = 1–3, die beste bleibt.
 *     `nr` = Nummer der Station: 10 + (Stockwerk − 1) · 3 + Spur, der Boss
 *     immer 40 (`BOSS_NR`). So stößt nichts mit den Stufen 0–5 des alten
 *     Turms zusammen, die Regel /^[0-9]{1,2}-[0-9]{1,2}$/ hält, und die
 *     Turm-Angabe an der Partie (`SCHACH_RUNDE.turmAngabe`, Stufe ≤ 50)
 *     bleibt gültig.
 *   Rast, Truhe, Händler, Fund: `turm.schwuere["<ort · 100 + nr>"]` = 1
 *     („betreten"; Regel: /^[0-9]{1,3}$/ mit 0–3). So zählen sie nicht als
 *     Figuren (Profil, Abzeichen). Die Schwur-Halle bekommt später die
 *     Nummern unter 100.
 *   Der Weg, die aktuelle Station, „Ort geschafft": GERECHNET (`lauf`).
 *
 * ÜBERNAHME DES ALTEN TURMS (bis v0.159.0: je Ort 4–6 Stufen in einer
 * Reihe, Schlüssel „<ort>-<stufe>" mit Stufe 0–5): Alle alten Einträge
 * bleiben stehen und zählen weiter als Figuren. Eine alte Tür (Boss
 * besiegt, `ALT_BOSS`) bleibt offen — der Ort gilt als geschafft, der
 * erreichte Ort und damit jede Freischaltung bleiben gleich. Wer im
 * erreichten Ort schon ALLE alten Gegner besiegt hatte (also vor dem Boss
 * stand), steht im neuen Turm wieder vor dem Boss: Die Stockwerke unter der
 * Rast gelten als gegangen (`uebernommen`). Angefangene Orte ohne das
 * beginnen unten — der neue Ort hat ohnehin nur 3 bis 5 Partien.
 *
 * DIE EIGENHEIT EINES GEGNERS IST DIE REGEL SEINER PARTIE (seit v0.147.0):
 * Bob spielt nur auf einer seiner vier Stufen; was eine Partie anders macht,
 * sind vorhandene Regler. Es gibt keine eigene Spiel-Mechanik für den Turm.
 */

const TURM_ZUFALL = (typeof UPCREW_ZUFALL !== "undefined")
    ? UPCREW_ZUFALL
    : require("./upcrew-zufall.js");

const TURM = {

    /* Die Rahmen jeder Partie, wenn nichts anderes dasteht. */
    GRUNDREGELN: {
        spielart: "standard",
        bot: "mittel",
        faehigkeiten: true,
        lootboxMenge: "wenig",
        seltenheitZeigen: true,
        pechZeigen: true,
        zufallsArmee: false,
        armeeUnterschiedlich: false,
        seite: "weiss"
    },

    /* Die Arten der Stationen. */
    ARTEN: {
        ein: { name: "Eingang" },
        g: { name: "Gegner" },
        e: { name: "Elite" },
        r: { name: "Rast" },
        t: { name: "Truhe" },
        h: { name: "Händler" },
        f: { name: "Fund" },
        b: { name: "Boss" }
    },

    HERZEN: 5,
    HEILEN: 2,
    VERLUST: { g: 1, e: 2, b: 3 },
    NR_AB: 10,
    BOSS_NR: 40,

    /*
     * DIE ORTE (Blunderluck, TURM-TABELLE.md). `stock` = Stockwerke inkl.
     * Boss, `spuren` = Wege nebeneinander, `staerke` = Stärke (1–10) auf
     * Stockwerk 1, sie steigt bis zur Rast um `anstieg`. `schwelle` =
     * Genauigkeit für Springer und König (seit v0.151.0 gemessen,
     * entschieden.md). `gegner` = der Vorrat, aus dem der Seed zieht (die
     * Gegner des alten Turms); `boss` = der Bob des Orts. `altBoss` = die
     * Stufe, die im alten Turm der Boss war (Übernahme).
     */
    ORTE: [
        {
            name: "Werkbank", bob: "Bob der Lehrling", altBoss: 3,
            schwelle: [60, 80],
            stock: 5, spuren: 2, staerke: 1, anstieg: 1, herzen: false, eliteMin: 0, partien: [2, 3],
            gewichte: { g: 60, f: 16, h: 8, r: 8 },
            regeln: {},
            gegner: [
                { name: "Spänchen", eigen: "Ohne Lootboxen", regeln: { faehigkeiten: false } },
                { name: "Lehrling Lotte", eigen: "Erste Lootboxen" },
                { name: "Hobel", eigen: "Seltenheit verborgen", regeln: { seltenheitZeigen: false } },
                { name: "Leimtopf", eigen: "Mehr Lootboxen", regeln: { lootboxMenge: "normal" } }
            ],
            boss: { eigen: "Spielt eine Stufe stärker" }
        },
        {
            name: "Holzhalle", bob: "Bob der Sammler", altBoss: 4,
            schwelle: [63, 82],
            stock: 7, spuren: 3, staerke: 2, anstieg: 2, herzen: true, eliteMin: 2, partien: [3, 4],
            gewichte: { g: 46, e: 16, f: 14, h: 10, r: 8 },
            regeln: { lootboxMenge: "normal" },
            gegner: [
                { name: "Kistenträger", eigen: "Viele Lootboxen", regeln: { lootboxMenge: "viele" } },
                { name: "Holzwurm", eigen: "Fallen unsichtbar", regeln: { pechZeigen: false } },
                { name: "Händlerin Hanna", eigen: "Seltenheit verborgen", regeln: { seltenheitZeigen: false } },
                { name: "Sägeblatt", eigen: "Lootbox-Regen", regeln: { lootboxMenge: "regen" } }
            ],
            boss: { eigen: "Viele Lootboxen", regeln: { lootboxMenge: "viele" } }
        },
        {
            name: "Marmorsaal", bob: "Bob der Stratege", altBoss: 4,
            schwelle: [66, 84],
            stock: 7, spuren: 3, staerke: 4, anstieg: 2, herzen: true, eliteMin: 2, partien: [3, 4],
            gewichte: { g: 46, e: 16, f: 14, h: 10, r: 8 },
            regeln: { lootboxMenge: "normal" },
            gegner: [
                { name: "Säule", eigen: "Kleines Brett", regeln: { spielart: "klein" } },
                { name: "Büste", eigen: "Kleines Kreuz", regeln: { spielart: "kreuzKleinEinzeln" } },
                { name: "Kurator", eigen: "Breites Brett", regeln: { spielart: "gross" } },
                { name: "Mosaik", eigen: "Großes Quadrat", regeln: { spielart: "grossQuadrat" } }
            ],
            boss: { eigen: "Auf dem Kreuz", regeln: { spielart: "kreuzEinzeln" } }
        },
        {
            name: "Nachtclub", bob: "Bob der Trickser", altBoss: 5,
            schwelle: [69, 86],
            stock: 8, spuren: 3, staerke: 5, anstieg: 3, herzen: true, eliteMin: 3, partien: [3, 4],
            gewichte: { g: 44, e: 18, f: 16, h: 10, r: 7 },
            regeln: { lootboxMenge: "normal", pechZeigen: false },
            gegner: [
                { name: "Türsteher", eigen: "Fallen unsichtbar" },
                { name: "DJ Frost", eigen: "Zufallsarmee", regeln: { zufallsArmee: true } },
                { name: "Schatten", eigen: "Alles verborgen", regeln: { seltenheitZeigen: false } },
                { name: "Glitzer", eigen: "Viele Lootboxen", regeln: { lootboxMenge: "viele" } },
                { name: "Barkeeper", eigen: "Lootbox-Regen", regeln: { lootboxMenge: "regen" } }
            ],
            boss: { eigen: "Spielt als Meister", regeln: { lootboxMenge: "viele" } }
        },
        {
            name: "Turniersaal", bob: "Bob der Profi", altBoss: 5,
            schwelle: [72, 88],
            stock: 8, spuren: 3, staerke: 7, anstieg: 2, herzen: true, eliteMin: 3, partien: [4, 5],
            gewichte: { g: 44, e: 18, f: 16, h: 10, r: 7 },
            regeln: {},
            gegner: [
                { name: "Schiedsrichter", eigen: "Reines Schach", regeln: { faehigkeiten: false } },
                { name: "Titelträger", eigen: "Lootbox-Regen", regeln: { lootboxMenge: "regen" } },
                { name: "Uhrwerk", eigen: "Großes Kreuz", regeln: { spielart: "kreuzGrossEinzeln" } },
                { name: "Knappe", eigen: "Doppelbrett", regeln: { spielart: "doppelbrett" } },
                { name: "Herold", eigen: "Ungleiche Zufallsarmee", regeln: { zufallsArmee: true, armeeUnterschiedlich: true } }
            ],
            boss: { eigen: "Lootboxen normal", regeln: { lootboxMenge: "normal" } }
        },
        {
            name: "Meisterliga", bob: "Meister Bob", altBoss: 5,
            schwelle: [75, 90],
            stock: 9, spuren: 3, staerke: 8, anstieg: 2, herzen: true, eliteMin: 3, partien: [4, 5],
            gewichte: { g: 42, e: 20, f: 16, h: 10, r: 7 },
            regeln: { lootboxMenge: "normal", pechZeigen: false },
            gegner: [
                { name: "Großmeister Gustav", eigen: "Reines Schach", regeln: { faehigkeiten: false } },
                { name: "Königin Kora", eigen: "Viele Lootboxen", regeln: { lootboxMenge: "viele" } },
                { name: "Turm-Tessa", eigen: "Großes Quadrat", regeln: { spielart: "grossQuadrat" } },
                { name: "Springer-Sam", eigen: "Auf dem Kreuz", regeln: { spielart: "kreuzEinzeln" } },
                { name: "Läufer-Lu", eigen: "Ungleiche Zufallsarmee", regeln: { zufallsArmee: true, armeeUnterschiedlich: true } }
            ],
            boss: { eigen: "Regen, alles verborgen", regeln: { lootboxMenge: "regen", seltenheitZeigen: false } }
        }
    ],

    /* Die Elite-Verschärfungen (nur, was die Partie wirklich kann). */
    ELITE: [
        { name: "Eisenfaust", eigen: "Bob eine Stufe stärker", botPlus: 1 },
        { name: "Stille", eigen: "Keine Fähigkeiten", regeln: { faehigkeiten: false } },
        { name: "Fallensteller", eigen: "Fallen unsichtbar", regeln: { pechZeigen: false } },
        { name: "Krumme Kante", eigen: "Andere Brettform", regeln: { spielart: "kreuzKleinEinzeln" } },
        { name: "Wirbel", eigen: "Zufallsarmee", regeln: { zufallsArmee: true } }
    ],

    /* Fund: zwei Tauschangebote je Fund (aus dem Seed), dazu immer „Nein".
       `herzen` = nur in Orten mit Herzen. */
    FUND: [
        { id: "herzmuenzen", gib: "−1 Herz", kriegst: "+40 Münzen", herzen: true },
        { id: "muenzenherz", gib: "30 Münzen", kriegst: "+1 Herz", herzen: true },
        { id: "herztipp", gib: "−1 Herz", kriegst: "+1 Tipp", herzen: true },
        { id: "muenzenzeit", gib: "20 Münzen", kriegst: "+1 Zeit zurück" },
        { id: "tippmuenzen", gib: "1 Tipp", kriegst: "+20 Münzen" }
    ],

    /* Händler: billiger als im Shop (Shop: Tipp 15, Zeit zurück 30). */
    HAENDLER: [
        { id: "tipp", ware: "tipp", preis: 10 },
        { id: "leben", ware: "leben", preis: 25 },
        { id: "herz", ware: "herz", preis: 25, herzen: true }
    ],

    /* Welcher Ort was freischaltet (Anzeige „Neuer Ort" und
       js\freischaltung.js). Nummer = Ort, ab dem es frei ist. Die Orte des
       neuen Turms (v0.160.0) sind dieselben wie vorher — nichts wandert. */
    FREI_AB: {
        /* Seit v0.159.0 erst das 3D-BRETT, dann die 3D-FIGUREN (Nutzer
           29.09.2026: „alles bei blunder luck 2d beginnen · später erst 3d
           brett dann figuren"; bis v0.158.0 umgekehrt). `dreiD` = Figuren. */
        brettDreiD: 2,
        dreiD: 3,
        thema: { holz: 2, marmor: 3, nacht: 4, turnier: 5 },
        /* Die Designs des 2D-Bretts (seit v0.159.0, js\brett-design.js):
           dieselben Orte wie die 3D-Themen gleichen Namens. */
        design2d: { holz: 2, marmor: 3, nacht: 4, turnier: 5 },
        figuren: { matt: 2, porzellan: 3, metall: 4 }
    },

    /* ---------------------------------------------------------------- *
     * Nachschlagen
     * ---------------------------------------------------------------- */

    anzahlOrte() {
        return TURM.ORTE.length;
    },

    /* Ort Nummer `nr` (ab 1), oder null. */
    ort(nr) {
        return TURM.ORTE[nr - 1] || null;
    },

    /* Der Schlüssel einer Station im Fortschritt: "ort-nr". */
    schluessel(nr, stufe) {
        return nr + "-" + stufe;
    },

    /* Der Schlüssel einer Station ohne Figuren (`turm.schwuere`). */
    stationsSchluessel(nr, stufe) {
        return String(nr * 100 + stufe);
    },

    /* Die Nummer eines Knotens: 10 + (Stockwerk − 1) · 3 + Spur; Boss 40. */
    nummer(f, x) {
        return x === "b" ? TURM.BOSS_NR : TURM.NR_AB + (f - 1) * 3 + x;
    },

    istKampf(art) {
        return art === "g" || art === "e" || art === "b";
    },

    /* Eine Stufe ist der Boss: im neuen Turm Nummer 40, im alten die letzte. */
    istBoss(nr, stufe) {
        const ort = TURM.ort(nr);
        return !!ort && (stufe === TURM.BOSS_NR || (stufe < TURM.NR_AB && stufe === ort.altBoss));
    },

    /* Stärke (1–10) → Bob-Stufe. */
    bot(staerke, plus) {
        const stufen = ["leicht", "mittel", "schwer", "meister"];
        const i = staerke <= 2 ? 0 : staerke <= 5 ? 1 : staerke <= 7 ? 2 : 3;
        return stufen[Math.min(3, i + (plus || 0))];
    },

    /* Stärke je Stockwerk: NUR vom Ort (gleich für jeden Seed). Elite +2,
       Boss +3, höchstens 10. */
    staerke(ort, f, art) {
        const rast = ort.stock - 1;
        const basis = ort.staerke + Math.floor((Math.min(f, rast) - 1) * ort.anstieg / Math.max(1, rast - 1) + 1e-9);
        return Math.min(10, basis + (art === "e" ? 2 : art === "b" ? 3 : 0));
    },

    /* ---------------------------------------------------------------- *
     * Der Plan eines Orts aus dem Seed
     * ---------------------------------------------------------------- */

    _plaene: {},

    /* Der Seed eines Durchgangs: Spieler + Turm + Ort + Durchgang (+ Version). */
    seed(nr, angabe) {
        const a = angabe || {};
        return TURM_ZUFALL.spielSeed({ spieler: a.spieler || "gast", welt: "turm", teil: [nr],
            durchgang: a.durchgang || 1, version: a.version });
    },

    /*
     * Der Plan: { seed, ort, nr, stock, spuren, knoten: [{ id, f, x, nr, art,
     * staerke, … }], kanten: [[von, nach]], nach(id), knotenVon(id) }. Gleich
     * bei gleicher Eingabe (wird je Seed-Text einmal gerechnet).
     */
    plan(nr, angabe) {
        const O = TURM.ort(nr);
        if (!O) {
            return null;
        }
        const s = TURM.seed(nr, angabe);
        if (TURM._plaene[s.text]) {
            return TURM._plaene[s.text];
        }
        const z = TURM_ZUFALL.folge(s);
        const zWege = z.zweig("wege");
        const zArt = z.zweig("stationen");
        const zInhalt = z.zweig("inhalt");
        const S = O.stock;
        const rastF = S - 1;
        const truheF = Math.ceil(S / 2);
        const spuren = O.spuren;

        /* 1) Wege: je Spur ein Wanderer, jeder Schritt −1 / 0 / +1 Spur,
              ohne dass sich Linien kreuzen. */
        const kanten = [];
        const kantenSet = {};
        const knoten = {};
        const setze = (f, x) => {
            const id = f + "-" + x;
            if (!knoten[id]) {
                knoten[id] = { id: id, f: f, x: x };
            }
            return id;
        };
        const kante = (a, b) => {
            if (!kantenSet[a + ">" + b]) {
                kantenSet[a + ">" + b] = true;
                kanten.push([a, b]);
            }
        };
        setze(0, "e");
        let jetzt = (spuren === 2 ? [0, 1] : [0, 2, zWege.ganz(3)]).map((x) => {
            kante("0-e", setze(1, x));
            return x;
        });
        for (let f = 2; f <= rastF; f++) {
            const schritt = [];
            jetzt = jetzt.map((a) => {
                const moeglich = zWege.mischen([-1, 0, 1]).map((d) => a + d).filter((b) => b >= 0 && b < spuren);
                const kreuzt = (b) => schritt.some(([c, d]) => (a < c && b > d) || (a > c && b < d));
                const b = moeglich.find((x) => !kreuzt(x));
                const ziel = (b === undefined) ? a : b;
                schritt.push([a, ziel]);
                kante(setze(f - 1, a), setze(f, ziel));
                return ziel;
            });
        }
        const bossId = setze(S, "b");
        for (const a of jetzt) {
            kante(rastF + "-" + a, bossId);
        }

        /* 2) Stationen: feste Reihen vom Ort. Dazwischen wählt der Seed
              KAMPF-STOCKWERKE (jede Station dort ist ein Gegner), EIN
              gemischtes Stockwerk (je Station Gegner oder nicht — das ist das
              ±1) und ruhige Stockwerke (Fund, Händler, Rast). So hat JEDER
              Weg dieselbe Zahl Partien (`partien` des Orts, ±1): Die
              Schwierigkeit kommt vom Ort, nicht vom Glück bei der Wahl. */
        const liste = Object.keys(knoten).map((id) => knoten[id])
            .sort((p, q) => p.f - q.f || String(p.x).localeCompare(String(q.x)));
        const truheListe = liste.filter((k) => k.f === truheF);
        const truheId = truheListe.length ? zArt.eins(truheListe).id : null;
        const mitte = [];
        for (let f = 2; f < rastF; f++) {
            if (f !== truheF) {
                mitte.push(f);
            }
        }
        const reihe = zArt.mischen(mitte);
        const kampfZahl = Math.max(0, Math.min(reihe.length, O.partien[0] - 2));
        const kampfStock = reihe.slice(0, kampfZahl);
        const gemischt = (O.partien[1] > O.partien[0] && reihe.length > kampfZahl) ? reihe[kampfZahl] : -1;
        const ruhig = (k) => {
            const gew = { f: O.gewichte.f, h: O.gewichte.h, r: O.gewichte.r };
            if (k.f === 2) {
                delete gew.r;
                delete gew.h;
            }
            if (k.f === rastF - 1) {
                delete gew.r;
            }
            return zArt.gewichtet(gew);
        };
        const eliteAnteil = (O.gewichte.e || 0) / ((O.gewichte.e || 0) + O.gewichte.g);
        const kampfArt = (k) => (k.f >= 2 && zArt.chance(eliteAnteil)) ? "e" : "g";
        for (const k of liste) {
            if (k.x === "e") {
                k.art = "ein";
            } else if (k.x === "b") {
                k.art = "b";
            } else if (k.f === 1) {
                k.art = "g";
            } else if (k.f === rastF) {
                k.art = "r";
            } else if (k.id === truheId) {
                k.art = "t";
            } else if (kampfStock.indexOf(k.f) !== -1) {
                k.art = kampfArt(k);
            } else if (k.f === gemischt) {
                k.art = zArt.chance(0.5) ? kampfArt(k) : ruhig(k);
            } else {
                k.art = ruhig(k);
            }
        }

        /* Mindestens `eliteMin` Elite (ab Stockwerk 2), sonst Gegner umwandeln. */
        let elite = liste.filter((k) => k.art === "e").length;
        const umwandelbar = zArt.mischen(liste.filter((k) => k.art === "g" && k.f >= 2));
        while (elite < O.eliteMin && umwandelbar.length) {
            umwandelbar.pop().art = "e";
            elite++;
        }

        /* 3) Inhalte je Station. */
        const namen = zInhalt.mischen(O.gegner);
        let ni = 0;
        const fundListe = TURM.FUND.filter((a) => O.herzen || !a.herzen);
        const warenListe = TURM.HAENDLER.filter((w) => O.herzen || !w.herzen);
        for (const k of liste) {
            k.nr = (k.art === "ein") ? 0 : TURM.nummer(k.f, k.x);
            k.staerke = (k.art === "ein") ? 0 : TURM.staerke(O, k.f, k.art);
            if (k.art === "g") {
                const g = namen[ni++ % namen.length];
                k.gegner = g.name;
                k.eigen = g.eigen || "";
                k.regeln = g.regeln || {};
            } else if (k.art === "e") {
                const e = zInhalt.eins(TURM.ELITE);
                k.gegner = e.name;
                k.eigen = e.eigen;
                k.regeln = e.regeln || {};
                k.botPlus = e.botPlus || 0;
            } else if (k.art === "b") {
                k.gegner = O.bob;
                k.eigen = O.boss.eigen;
                k.regeln = O.boss.regeln || {};
            }
            if (TURM.istKampf(k.art)) {
                /* Die Farbe steht vorher fest (Nutzer 28.09.2026: „davor schon
                   feststehen welche farbe ich bekomme aber random"). */
                k.farbe = zInhalt.chance(0.5) ? "weiss" : "schwarz";
            }
            if (k.art === "f") {
                k.angebote = zInhalt.mischen(fundListe).slice(0, 2).map((a) => a.id);
            }
            if (k.art === "h") {
                k.waren = zInhalt.mischen(warenListe).map((w) => w.id);
            }
            if (k.art === "t") {
                k.muenzen = (nr >= 5) ? zInhalt.zwischen(25, 45) : zInhalt.zwischen(15, 30);
                k.item = zInhalt.chance(0.5) ? "tipp" : "leben";
            }
        }

        const nachListe = {};
        for (const [a, b] of kanten) {
            (nachListe[a] = nachListe[a] || []).push(b);
        }
        const plan = {
            seed: s,
            ort: O,
            nr: nr,
            stock: S,
            spuren: spuren,
            knoten: liste,
            kanten: kanten,
            nach: (id) => (nachListe[id] || []).slice(),
            knotenVon: (id) => knoten[id] || null,
            knotenMitNr: (stufe) => liste.find((k) => k.nr === stufe) || null
        };
        TURM._plaene[s.text] = plan;
        return plan;
    },

    /* Alle Wege vom Eingang zum Boss (Listen von Knoten-Kennungen). */
    wege(plan) {
        const wege = [];
        const gehe = (id, bisher) => {
            const n = plan.nach(id);
            if (!n.length) {
                wege.push(bisher);
                return;
            }
            for (const b of n) {
                gehe(b, bisher.concat(b));
            }
        };
        gehe("0-e", []);
        return wege;
    },

    /* Kennzahlen, die für jeden Seed gleich sein sollen (Schwierigkeit) —
       und die, die wechseln dürfen (Abwechslung). */
    kennzahlen(plan) {
        const wege = TURM.wege(plan);
        const kaempfe = wege.map((w) => w.filter((id) => TURM.istKampf(plan.knotenVon(id).art)).length);
        return {
            stockwerke: plan.stock,
            wege: wege.length,
            kaempfeMin: Math.min.apply(null, kaempfe),
            kaempfeMax: Math.max.apply(null, kaempfe),
            elite: plan.knoten.filter((k) => k.art === "e").length,
            staerke: Array.from({ length: plan.stock }, (_, i) =>
                TURM.staerke(plan.ort, i + 1, i + 1 === plan.stock ? "b" : "g"))
        };
    },

    /* ---------------------------------------------------------------- *
     * Der Stand im Turm — gerechnet, nie gespeichert
     * ---------------------------------------------------------------- */

    /* Figuren einer Station (0 bis 3) aus der Tabelle des Fortschritts. */
    figurenVon(figuren, nr, stufe) {
        const wert = (figuren && typeof figuren === "object")
            ? figuren[TURM.schluessel(nr, stufe)] : 0;
        return (Number.isInteger(wert) && wert > 0) ? Math.min(wert, 3) : 0;
    },

    /* Hatte der alte Turm (bis v0.159.0) hier den Boss besiegt? */
    altTuer(figuren, nr) {
        const ort = TURM.ort(nr);
        return !!ort && TURM.figurenVon(figuren, nr, ort.altBoss) > 0;
    },

    /* Hatte der alte Turm hier alle Gegner vor dem Boss besiegt? */
    altVorBoss(figuren, nr) {
        const ort = TURM.ort(nr);
        if (!ort) {
            return false;
        }
        for (let i = 0; i < ort.altBoss; i++) {
            if (TURM.figurenVon(figuren, nr, i) === 0) {
                return false;
            }
        }
        return true;
    },

    /* Ist der Boss dieses Orts besiegt (= Tür offen)? Neuer oder alter Turm. */
    tuerOffen(figuren, nr) {
        return !!TURM.ort(nr) && (TURM.figurenVon(figuren, nr, TURM.BOSS_NR) > 0 || TURM.altTuer(figuren, nr));
    },

    /*
     * Der ERREICHTE Ort: der unterste, dessen Tür noch zu ist. Sind alle
     * Türen offen, ist man über dem letzten Ort (Anzahl + 1 — dort wartet
     * später die Schwur-Halle). Gerechnet statt gespeichert.
     */
    erreicht(figuren) {
        let nr = 1;
        while (nr <= TURM.anzahlOrte() && TURM.tuerOffen(figuren, nr)) {
            nr++;
        }
        return nr;
    },

    /* Wie viele Türen offen sind (Profil, Abzeichen). */
    tueren(figuren) {
        let n = 0;
        for (let nr = 1; nr <= TURM.anzahlOrte(); nr++) {
            if (TURM.tuerOffen(figuren, nr)) {
                n++;
            }
        }
        return n;
    },

    /* Figuren eines Orts zusammen (alter und neuer Turm). */
    figurenImOrt(figuren, nr) {
        let hat = 0;
        for (const k of Object.keys(figuren || {})) {
            if (k.split("-")[0] === String(nr)) {
                hat += TURM.figurenVon(figuren, nr, Number(k.split("-")[1]));
            }
        }
        return hat;
    },

    /*
     * DER LAUF durch einen Ort: wo man steht, welcher Weg gegangen ist, wohin
     * es weitergeht. `angabe` = { figuren, schwuere, spieler, durchgang,
     * version, herzen, wieder: [id], geheilt: [id] } (die letzten drei vom
     * Gerät). Liefert { plan, pos, verlauf, front, geschafft, herzen, cp,
     * erledigt(id), echt(id), uebernommen(id) }.
     *
     * Gegangen ist eine Station, wenn sie einen Eintrag hat (Figuren oder
     * „betreten") und nicht neu zu spielen ist (`wieder`), oder wenn sie aus
     * dem alten Turm übernommen ist. Gewählt wird unter allen möglichen Wegen
     * der mit den meisten echten Einträgen — so findet auch ein zweites Gerät
     * denselben Weg.
     */
    lauf(nr, angabe) {
        const a = angabe || {};
        const O = TURM.ort(nr);
        const plan = TURM.plan(nr, a);
        if (!plan) {
            return null;
        }
        const figuren = a.figuren || {};
        const schwuere = a.schwuere || {};
        const wieder = Array.isArray(a.wieder) ? a.wieder : [];
        const altTuer = TURM.altTuer(figuren, nr);
        const altVorBoss = TURM.altVorBoss(figuren, nr);

        const echt = (id) => {
            const k = plan.knotenVon(id);
            if (!k || k.art === "ein" || wieder.indexOf(id) !== -1) {
                return false;
            }
            return TURM.figurenVon(figuren, nr, k.nr) > 0
                || Number(schwuere[TURM.stationsSchluessel(nr, k.nr)]) > 0;
        };
        const uebernommen = (id) => {
            const k = plan.knotenVon(id);
            if (!k || k.art === "ein" || echt(id)) {
                return false;
            }
            return altTuer || (altVorBoss && k.f <= plan.stock - 2);
        };
        const erledigt = (id) => id === "0-e" || echt(id) || uebernommen(id);

        /* Der beste Weg durch gegangene Stationen. */
        let bester = { weg: ["0-e"], echt: 0 };
        const suche = (id, weg, zahl) => {
            if (zahl > bester.echt || (zahl === bester.echt && weg.length > bester.weg.length)) {
                bester = { weg: weg, echt: zahl };
            }
            for (const b of plan.nach(id)) {
                if (erledigt(b)) {
                    suche(b, weg.concat(b), zahl + (echt(b) ? 1 : 0));
                }
            }
        };
        suche("0-e", ["0-e"], 0);
        const verlauf = bester.weg;
        const pos = verlauf[verlauf.length - 1];
        const geschafft = TURM.tuerOffen(figuren, nr) && (plan.knotenVon(pos).art === "b" || altTuer);
        const front = geschafft ? [] : plan.nach(pos).filter((id) => !erledigt(id))
            .sort((p, q) => String(plan.knotenVon(p).x).localeCompare(String(plan.knotenVon(q).x)));

        /* Rückfall-Punkt: die letzte Rast oder besiegte Elite des Wegs. */
        let cp = "0-e";
        for (const id of verlauf) {
            const k = plan.knotenVon(id);
            if (k.art === "r" || (k.art === "e" && echt(id))) {
                cp = id;
            }
        }
        const herzen = O.herzen
            ? Math.max(1, Math.min(TURM.HERZEN, Number.isInteger(a.herzen) ? a.herzen : TURM.HERZEN))
            : null;
        return {
            nr: nr, plan: plan, pos: pos, verlauf: verlauf, front: front, geschafft: geschafft,
            herzen: herzen, cp: cp, echt: echt, uebernommen: uebernommen, erledigt: erledigt,
            geheilt: Array.isArray(a.geheilt) ? a.geheilt : [], wieder: wieder
        };
    },

    /*
     * NACH EINER NIEDERLAGE (Gerät): Herzen abziehen; bei 0 der Rückfall —
     * die Stationen nach dem Rückfall-Punkt sind neu zu spielen, die Herzen
     * wieder voll. `geraet` = { herzen, wieder, geheilt } → { geraet, minus,
     * rueckfall (Kennung oder null) }.
     */
    nachNiederlage(lauf, id, geraet) {
        const k = lauf.plan.knotenVon(id);
        const g = TURM._geraetKopie(geraet);
        if (!k || lauf.herzen === null || !TURM.istKampf(k.art)) {
            return { geraet: g, minus: 0, rueckfall: null };
        }
        const minus = TURM.VERLUST[k.art];
        g.herzen = lauf.herzen - minus;
        if (g.herzen > 0) {
            return { geraet: g, minus: minus, rueckfall: null };
        }
        const bis = lauf.verlauf.indexOf(lauf.cp);
        for (const x of lauf.verlauf.slice(bis + 1)) {
            if (lauf.echt(x) && g.wieder.indexOf(x) === -1) {
                g.wieder.push(x);
            }
        }
        g.herzen = TURM.HERZEN;
        return { geraet: g, minus: minus, rueckfall: lauf.cp };
    },

    /* NACH EINEM SIEG oder beim Betreten einer Station (Gerät): nicht mehr
       neu zu spielen; eine besiegte Elite füllt die Herzen. */
    nachSieg(lauf, id, geraet) {
        const k = lauf.plan.knotenVon(id);
        const g = TURM._geraetKopie(geraet);
        g.wieder = g.wieder.filter((x) => x !== id);
        if (k && k.art === "e" && lauf.herzen !== null) {
            g.herzen = TURM.HERZEN;
        }
        return g;
    },

    _geraetKopie(geraet) {
        const g = geraet || {};
        return {
            herzen: Number.isInteger(g.herzen) ? g.herzen : TURM.HERZEN,
            wieder: Array.isArray(g.wieder) ? g.wieder.slice() : [],
            geheilt: Array.isArray(g.geheilt) ? g.geheilt.slice() : []
        };
    },

    /* ---------------------------------------------------------------- *
     * Eine Station spielen
     * ---------------------------------------------------------------- */

    /*
     * Die Einstellungen im Format, das `TEAM_SCHACH.rundeStarten` nimmt
     * (Felder von `TEAM_SCHACH._regelnVorgabe`), plus `turm` und die feste
     * `turmSeite`. Die Runde ist privat: Niemand anders tritt einer
     * Turm-Partie bei. `knoten` = ein Kampf-Knoten aus dem Plan.
     */
    regelnFuer(nr, knoten) {
        const ort = TURM.ort(nr);
        if (!ort || !knoten || !TURM.istKampf(knoten.art)) {
            return null;
        }
        const e = Object.assign({}, TURM.GRUNDREGELN, ort.regeln || {}, knoten.regeln || {});
        return {
            spielart: e.spielart,
            gegenComputer: true,
            botStufe: TURM.bot(knoten.staerke, knoten.botPlus),
            faehigkeiten: e.faehigkeiten,
            seltenheitZeigen: e.seltenheitZeigen,
            pechZeigen: e.pechZeigen,
            lootboxMenge: e.lootboxMenge,
            zufallsArmee: e.zufallsArmee,
            armeeUnterschiedlich: e.armeeUnterschiedlich,
            seiteZufaellig: false,
            sichtbarkeit: "privat",
            armeeStaerke: "normal",
            itemVorrat: "alle",
            itemAuswahl: [],
            einigkeit: false,
            turm: { ort: nr, stufe: knoten.nr },
            turmSeite: knoten.farbe === "schwarz" ? "schwarz" : "weiss"
        };
    },

    /* Das Stockwerk einer Stufe (neuer Turm) oder null (alter Turm). */
    stockwerk(stufe) {
        if (stufe === TURM.BOSS_NR) {
            return null;
        }
        return stufe >= TURM.NR_AB ? Math.floor((stufe - TURM.NR_AB) / 3) + 1 : null;
    },

    /* Der Titel der Partie: „Holzhalle · 3" (Stockwerk) bzw. „Holzhalle · Boss". */
    titel(nr, stufe) {
        const ort = TURM.ort(nr);
        if (!ort) {
            return "Turm";
        }
        if (TURM.istBoss(nr, stufe)) {
            return ort.name + " · Boss";
        }
        const f = TURM.stockwerk(stufe);
        return ort.name + " · " + String(f === null ? stufe + 1 : f);
    },

    /*
     * WIE VIELE FIGUREN EINE BEENDETE TURM-PARTIE BRINGT. Verloren oder
     * remis 0, gewonnen 1 (Bauer), mit der Genauigkeit 2 (Springer) oder 3
     * (König) nach den Schwellen des Orts.
     */
    figurenFuer(gewonnen, nr, genauigkeit) {
        if (!gewonnen) {
            return 0;
        }
        const ort = TURM.ort(nr);
        if (!ort || typeof genauigkeit !== "number") {
            return 1;
        }
        if (genauigkeit >= ort.schwelle[1]) {
            return 3;
        }
        return genauigkeit >= ort.schwelle[0] ? 2 : 1;
    }
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = TURM;
}
