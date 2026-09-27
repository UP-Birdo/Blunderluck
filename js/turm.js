/*
 * turm.js — der Turm (seit v0.147.0, Runde 5,
 * Design\3D-Schrift\docs\AUFTRAEGE-RUNDE-5.md; Regeln:
 * Apps\UPCrew\docs\FORTSCHRITT.md, „GÜLTIGER STAND").
 *
 * Die reine Tabelle und Rechnung — kein Bildschirm (der steht in
 * js\start-turm.js), kein Speicher (der Stand liegt im Fortschritt,
 * js\fortschritt.js, Zweig `turm`). Ohne Browser testbar.
 *
 * WAS GILT:
 *   - Sechs ORTE übereinander, von unten nach oben. Jeder hat eigene
 *     Stufen; jede Stufe ist ein eigener GEGNER mit Namen und Eigenheit,
 *     die letzte ist der BOSS des Orts (der Bob des Orts).
 *   - Eine Stufe ist offen, wenn die davor besiegt ist; der Boss erst, wenn
 *     ALLE Gegner davor besiegt sind. Die TÜR öffnet, sobald der Boss
 *     besiegt ist — dann ist der nächste Ort erreicht. Kein Auf und Ab.
 *   - Wertung je Stufe: 0 bis 3 Figuren — Bauer (1, gewonnen), Springer
 *     (2) und König (3, Genauigkeit über den Schwellen des Orts). Bis die
 *     Wertung gebaut ist (v0.148.0), gibt ein Sieg den Bauern.
 *   - Freischaltungen hängen am erreichten Ort (js\freischaltung.js):
 *     3D-Brett und Holz/Matt ab Holzhalle, Marmor/Porzellan ab Marmorsaal,
 *     Nacht/Metall ab Nachtclub, Turnier ab Turniersaal.
 *
 * DIE EIGENHEIT EINES GEGNERS IST DIE REGEL SEINER PARTIE. Der Entwurf
 * hatte Sätze wie „zieht fast nur Bauern" — Bob kann das nicht, er spielt
 * nur auf einer seiner vier Stufen. Statt etwas zu versprechen, das nicht
 * passiert, sagt die Eigenheit, was an DIESER Partie anders ist (Schwarz,
 * viele Lootboxen, Fallen unsichtbar …). Namen und Orte wie im Entwurf.
 *
 * WIE EINE STUFE GESPIELT WIRD: `regelnFuer` liefert die Einstellungen
 * einer Partie gegen Bob, so wie der Start sie auch sonst an
 * `TEAM_SCHACH.rundeStarten` gibt — dazu `turm: { ort, stufe }` und die
 * feste Seite. Es gibt keine eigene Spiel-Mechanik für den Turm; alles,
 * was eine Stufe anders macht, sind vorhandene Regler.
 */

const TURM = {

    /* Die Rahmen jeder Stufe, wenn nichts anderes dasteht. */
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

    /*
     * DIE ORTE (Blunderluck). `schwelle` = Genauigkeit in Prozent für
     * Springer und König. Seit v0.151.0 auf die geschärfte Wertung
     * (Verlust in Bauern, js\wertung.js) gemessen: Zufallszüge 26–40 %,
     * Bob leicht 29–63 %, Bob mittel/schwer 63–92 %, Bob Meister 84–92 %
     * (Tabelle in docs\entscheidungen\entschieden.md). Springer = ordentlich
     * gespielt, König = nahe Meister-Niveau, oben fast fehlerfrei. Jede
     * Stufe nennt nur, was von den Grundregeln abweicht.
     */
    ORTE: [
        {
            name: "Werkbank",
            bob: "Bob der Lehrling",
            schwelle: [60, 80],
            regeln: { bot: "leicht" },
            stufen: [
                { gegner: "Spänchen", eigen: "Ohne Lootboxen", regeln: { faehigkeiten: false } },
                { gegner: "Lehrling Lotte", eigen: "Erste Lootboxen" },
                { gegner: "Hobel", eigen: "Du bist Schwarz", regeln: { seite: "schwarz" } },
                { eigen: "Spielt eine Stufe stärker", regeln: { bot: "mittel" } }
            ]
        },
        {
            name: "Holzhalle",
            bob: "Bob der Sammler",
            schwelle: [63, 82],
            regeln: { bot: "mittel", lootboxMenge: "normal" },
            stufen: [
                { gegner: "Kistenträger", eigen: "Viele Lootboxen", regeln: { lootboxMenge: "viele" } },
                { gegner: "Holzwurm", eigen: "Du bist Schwarz", regeln: { seite: "schwarz" } },
                { gegner: "Händlerin Hanna", eigen: "Seltenheit verborgen", regeln: { seltenheitZeigen: false } },
                { gegner: "Sägeblatt", eigen: "Lootbox-Regen", regeln: { lootboxMenge: "regen" } },
                { eigen: "Spielt eine Stufe stärker", regeln: { bot: "schwer", lootboxMenge: "viele" } }
            ]
        },
        {
            name: "Marmorsaal",
            bob: "Bob der Stratege",
            schwelle: [66, 84],
            regeln: { bot: "schwer", lootboxMenge: "normal" },
            stufen: [
                { gegner: "Säule", eigen: "Kleines Brett", regeln: { spielart: "klein" } },
                { gegner: "Büste", eigen: "Kleines Kreuz", regeln: { spielart: "kreuzKleinEinzeln" } },
                { gegner: "Kurator", eigen: "Breites Brett", regeln: { spielart: "gross" } },
                { gegner: "Mosaik", eigen: "Großes Quadrat", regeln: { spielart: "grossQuadrat" } },
                { eigen: "Auf dem Kreuz", regeln: { spielart: "kreuzEinzeln" } }
            ]
        },
        {
            name: "Nachtclub",
            bob: "Bob der Trickser",
            schwelle: [69, 86],
            regeln: { bot: "schwer", lootboxMenge: "normal", pechZeigen: false },
            stufen: [
                { gegner: "Türsteher", eigen: "Fallen unsichtbar" },
                { gegner: "DJ Frost", eigen: "Zufallsarmee", regeln: { zufallsArmee: true } },
                { gegner: "Schatten", eigen: "Alles verborgen", regeln: { seltenheitZeigen: false } },
                { gegner: "Glitzer", eigen: "Schwarz, viele Lootboxen", regeln: { seite: "schwarz", lootboxMenge: "viele" } },
                { gegner: "Barkeeper", eigen: "Lootbox-Regen", regeln: { lootboxMenge: "regen" } },
                { eigen: "Spielt als Meister", regeln: { bot: "meister", lootboxMenge: "viele" } }
            ]
        },
        {
            name: "Turniersaal",
            bob: "Bob der Profi",
            schwelle: [72, 88],
            regeln: { bot: "meister" },
            stufen: [
                { gegner: "Schiedsrichter", eigen: "Reines Schach", regeln: { faehigkeiten: false } },
                { gegner: "Titelträger", eigen: "Reines Schach, Schwarz", regeln: { faehigkeiten: false, seite: "schwarz" } },
                { gegner: "Uhrwerk", eigen: "Großes Kreuz", regeln: { spielart: "kreuzGrossEinzeln" } },
                { gegner: "Knappe", eigen: "Doppelbrett", regeln: { spielart: "doppelbrett" } },
                { gegner: "Herold", eigen: "Ungleiche Zufallsarmee", regeln: { zufallsArmee: true, armeeUnterschiedlich: true } },
                { eigen: "Lootboxen normal", regeln: { lootboxMenge: "normal" } }
            ]
        },
        {
            name: "Meisterliga",
            bob: "Meister Bob",
            schwelle: [75, 90],
            regeln: { bot: "meister", lootboxMenge: "normal", pechZeigen: false },
            stufen: [
                { gegner: "Großmeister Gustav", eigen: "Reines Schach, Schwarz", regeln: { faehigkeiten: false, seite: "schwarz" } },
                { gegner: "Königin Kora", eigen: "Viele Lootboxen", regeln: { lootboxMenge: "viele" } },
                { gegner: "Turm-Tessa", eigen: "Großes Quadrat", regeln: { spielart: "grossQuadrat" } },
                { gegner: "Springer-Sam", eigen: "Auf dem Kreuz", regeln: { spielart: "kreuzEinzeln" } },
                { gegner: "Läufer-Lu", eigen: "Ungleiche Zufallsarmee", regeln: { zufallsArmee: true, armeeUnterschiedlich: true } },
                { eigen: "Regen, alles verborgen", regeln: { lootboxMenge: "regen", seltenheitZeigen: false } }
            ]
        }
    ],

    /* Welcher Ort was freischaltet (Anzeige „Neuer Ort" und
       js\freischaltung.js). Nummer = Ort, ab dem es frei ist. */
    FREI_AB: {
        dreiD: 2,
        thema: { holz: 2, marmor: 3, nacht: 4, turnier: 5 },
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

    /* Der Schlüssel einer Stufe im Fortschritt: "ort-stufe", Stufe ab 0. */
    schluessel(nr, stufe) {
        return nr + "-" + stufe;
    },

    istBoss(nr, stufe) {
        const ort = TURM.ort(nr);
        return !!ort && stufe === ort.stufen.length - 1;
    },

    /* { name, eigen, boss } — wer auf dieser Stufe spielt. */
    gegner(nr, stufe) {
        const ort = TURM.ort(nr);
        const eintrag = ort && ort.stufen[stufe];
        if (!eintrag) {
            return null;
        }
        const boss = TURM.istBoss(nr, stufe);
        return { name: boss ? ort.bob : eintrag.gegner, eigen: eintrag.eigen || "", boss: boss };
    },

    /* ---------------------------------------------------------------- *
     * Der Stand im Turm — gerechnet aus den Figuren, nie gespeichert
     * ---------------------------------------------------------------- */

    /* Figuren einer Stufe (0 bis 3) aus der Tabelle des Fortschritts. */
    figurenVon(figuren, nr, stufe) {
        const wert = (figuren && typeof figuren === "object")
            ? figuren[TURM.schluessel(nr, stufe)] : 0;
        return (Number.isInteger(wert) && wert > 0) ? Math.min(wert, 3) : 0;
    },

    /* Ist der Boss dieses Orts besiegt (= Tür offen)? */
    tuerOffen(figuren, nr) {
        const ort = TURM.ort(nr);
        return !!ort && TURM.figurenVon(figuren, nr, ort.stufen.length - 1) > 0;
    },

    /*
     * Der ERREICHTE Ort: der unterste, dessen Tür noch zu ist. Sind alle
     * Türen offen, ist man über dem letzten Ort (Anzahl + 1 — dort wartet
     * später die Schwur-Halle). Gerechnet statt gespeichert, damit Ort und
     * Figuren nie auseinanderlaufen.
     */
    erreicht(figuren) {
        let nr = 1;
        while (nr <= TURM.anzahlOrte() && TURM.tuerOffen(figuren, nr)) {
            nr++;
        }
        return nr;
    },

    /* Darf diese Stufe gespielt werden? Nur im erreichten Ort oder darunter
       (Nachholen); dort die erste, jede nach einer besiegten, der Boss nach
       allen. */
    offen(figuren, nr, stufe) {
        const ort = TURM.ort(nr);
        if (!ort || stufe < 0 || stufe >= ort.stufen.length || nr > TURM.erreicht(figuren)) {
            return false;
        }
        if (TURM.istBoss(nr, stufe)) {
            for (let i = 0; i < stufe; i++) {
                if (TURM.figurenVon(figuren, nr, i) === 0) {
                    return false;
                }
            }
            return true;
        }
        return stufe === 0 || TURM.figurenVon(figuren, nr, stufe - 1) > 0;
    },

    /* Die nächste Stufe, die im Ort noch keine Figur hat und offen ist —
       oder -1, wenn alle eine haben. */
    naechste(figuren, nr) {
        const ort = TURM.ort(nr);
        if (!ort) {
            return -1;
        }
        for (let i = 0; i < ort.stufen.length; i++) {
            if (TURM.figurenVon(figuren, nr, i) === 0 && TURM.offen(figuren, nr, i)) {
                return i;
            }
        }
        return -1;
    },

    /* Figuren eines Orts zusammen, und wie viele es höchstens gibt. */
    summe(figuren, nr) {
        const ort = TURM.ort(nr);
        if (!ort) {
            return { hat: 0, alle: 0 };
        }
        let hat = 0;
        for (let i = 0; i < ort.stufen.length; i++) {
            hat += TURM.figurenVon(figuren, nr, i);
        }
        return { hat: hat, alle: ort.stufen.length * 3 };
    },

    /* ---------------------------------------------------------------- *
     * Eine Stufe spielen
     * ---------------------------------------------------------------- */

    /* Die Regeln einer Stufe: Grundregeln, darüber die des Orts, darüber
       die der Stufe. */
    einstellungen(nr, stufe) {
        const ort = TURM.ort(nr);
        const eintrag = ort && ort.stufen[stufe];
        if (!eintrag) {
            return null;
        }
        return Object.assign({}, TURM.GRUNDREGELN, ort.regeln || {}, eintrag.regeln || {});
    },

    /*
     * Die Einstellungen im Format, das `TEAM_SCHACH.rundeStarten` nimmt
     * (Felder von `TEAM_SCHACH._regelnVorgabe`), plus `turm` und die feste
     * `turmSeite`. Die Runde ist privat: Niemand anders tritt einer
     * Turm-Partie bei.
     */
    regelnFuer(nr, stufe) {
        const e = TURM.einstellungen(nr, stufe);
        if (!e) {
            return null;
        }
        return {
            spielart: e.spielart,
            gegenComputer: true,
            botStufe: e.bot,
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
            turm: { ort: nr, stufe: stufe },
            turmSeite: e.seite === "schwarz" ? "schwarz" : "weiss"
        };
    },

    /* Der Titel der Partie: „Werkbank · 2" bzw. „Werkbank · Boss". */
    titel(nr, stufe) {
        const ort = TURM.ort(nr);
        if (!ort) {
            return "Turm";
        }
        return ort.name + " · " + (TURM.istBoss(nr, stufe) ? "Boss" : String(stufe + 1));
    },

    /*
     * WIE VIELE FIGUREN EINE BEENDETE TURM-PARTIE BRINGT. Verloren oder
     * remis 0, gewonnen 1 (Bauer). Springer und König kommen mit der
     * Wertung (v0.148.0): `genauigkeit` in Prozent, sonst bleibt es beim
     * Bauern.
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
