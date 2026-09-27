/*
 * tagesbrett.js — die Schach-Aufgabe des Tages (seit v0.149.0, Runde 5;
 * FORTSCHRITT.md: „Aufgaben = Heute: Tagesbrett (Blunderluck, feste
 * Stellung + Aufgabe, z. B. ‚Matt in 3', für alle gleich)").
 *
 * Nutzer 27.09.2026, Frage 3: eine LISTE FESTER STELLUNGEN; welche dran
 * ist, ergibt sich aus dem Datum — für alle gleich, ohne Server.
 *
 * WOHER DIE STELLUNGEN KOMMEN: aus Partien Bob gegen Bob, herausgesucht
 * und GEPRÜFT von einem vollständigen Löser (27.09.2026, Wegwerf-Skript,
 * Ergebnis in docs\entscheidungen\entschieden.md): Jede Stellung hat ein
 * Matt in GENAU N Zügen, kein kürzeres, und (ab N = 2) genau EINEN ersten
 * Zug, der dorthin führt. `tests\test-heute.js` prüft das bei jedem
 * Testlauf erneut mit demselben Verfahren.
 *
 * WIE ES GESPIELT WIRD: als Partie gegen Bob (Stufe Meister) aus der
 * Stellung — derselbe Partie-Bildschirm wie immer. Man spielt die Seite am
 * Zug; nach N eigenen Zügen ohne Matt ist die Aufgabe verfehlt
 * (`nachZug`). Nochmal geht beliebig oft; die Figuren sinken mit den
 * Versuchen (js\fortschritt.js `tagesaufgabe`).
 */

const TAGESBRETT = {

    /*
     * DIE AUFGABEN. brett: 64 Zeichen, Feld 0 = a8 oben links, Weiss gross,
     * Schwarz klein, "." leer (B S L T D K). loesung: der einzige erste Zug
     * „von-nach" als Feldnummern (bei Matt in 1 einer der Mattzüge).
     */
    AUFGABEN: [
        { brett: "....t......b..kb.b..bd....l.....t.....BB......K...s..s..........", amZug: "schwarz", zuege: 2, loesung: "32-38" },
        { brett: ".....t.k.......b.b......b..L....B...BDBTS...B..B..B..........K.T", amZug: "weiss", zuege: 1, loesung: "37-5" },
        { brett: "...dt......b..kb.b..b.....l.....t.....B.......KB..s..s..........", amZug: "schwarz", zuege: 3, loesung: "50-60" },
        { brett: "t.l...s...bk..btb...b............B...b.......dlB.............LK.", amZug: "schwarz", zuege: 2, loesung: "45-53" },
        { brett: "...k....t.b..bb.lb.....bb....bsBB.......LT......T.B.t.s..S.K....", amZug: "schwarz", zuege: 2, loesung: "52-60" },
        { brett: ".t....k........b.bL..D..b.......B...B.BTS...B..B..B..........K.T", amZug: "weiss", zuege: 1, loesung: "18-27" },
        { brett: "......k....t...b.b...b.........b...b......bl..........K......t..", amZug: "schwarz", zuege: 3, loesung: "11-14" },
        { brett: ".k...l.t.....Db....b......b...Kb...........d....................", amZug: "schwarz", zuege: 2, loesung: "43-46" },
        { brett: ".Dlk...t.bb..b.........bB.l.b............B.B.d.Ss.BL..T..S.....K", amZug: "schwarz", zuege: 2, loesung: "45-47" },
        { brett: "s........tk...................blbb.d....l.........t.........K...", amZug: "schwarz", zuege: 1, loesung: "35-56" },
        { brett: "........b.......d.........l...L.....D....B......Bk...BBBTS..K.ST", amZug: "weiss", zuege: 3, loesung: "36-28" },
        { brett: "......k.B...................K.SB.B..B.....B.TS.........L.......D", amZug: "weiss", zuege: 2, loesung: "28-21" },
        { brett: "........b.......s......D.....k...b.B..b..B..B...dLB..KB..T.....T", amZug: "weiss", zuege: 2, loesung: "63-31" },
        { brett: "s........tk...................blbb.d....l..........t.........K..", amZug: "schwarz", zuege: 1, loesung: "35-56" },
        { brett: "t...k.st.b...sb..B..ll....Lb.d.b...B...B..B...D....T..BT......K.", amZug: "schwarz", zuege: 3, loesung: "0-56" },
        { brett: "....k.st.....b....b.b.bbK..s.........l..B.D.........Ld..........", amZug: "schwarz", zuege: 2, loesung: "53-17" },
        { brett: "....D.........k..........B.B....D...B....B.........T.K..........", amZug: "weiss", zuege: 2, loesung: "32-16" },
        { brett: "s........tk...................b.bb.d....l....l.....t........K...", amZug: "schwarz", zuege: 1, loesung: "35-53" },
        { brett: "tsldk.stbbb.lb......b.bb...bS..........BB.B..B...B.BB.B.TSLDKL.T", amZug: "schwarz", zuege: 3, loesung: "12-39" },
        { brett: "......k...............LLT......B..bB....B....B...t.SS...T......K", amZug: "weiss", zuege: 2, loesung: "24-0" },
        { brett: "td.D.l.tbk..b.bbl......sL............b...B.B.B..B.BSB.BBT..K.LST", amZug: "weiss", zuege: 2, loesung: "3-11" },
        { brett: "....t......b..kb.b..bd....l...........tB..........s..s.K........", amZug: "schwarz", zuege: 1, loesung: "21-28" },
        { brett: "t..................D....b......k....B...Bd.L....TBSB.BBB..L.K..T", amZug: "weiss", zuege: 3, loesung: "43-52" },
        { brett: "tdk..l.tb...b.bbl......sL..D.........b...B.B.B..B.BSB.BBT..K.LST", amZug: "weiss", zuege: 2, loesung: "27-18" },
        { brett: "....S........k.................T.B..............SL..D...K....l..", amZug: "weiss", zuege: 2, loesung: "4-19" },
        { brett: ".T............D.........k....B.B......B.B..B.....LB....S..SK...T", amZug: "weiss", zuege: 1, loesung: "14-8" },
        { brett: "..l.......s..k.b..B.bl......d.....B...B....T.b.B..........D...KT", amZug: "schwarz", zuege: 3, loesung: "28-46" },
        { brett: "........b.......d...........D.L....l.....B......Bk...BBBTS..K.ST", amZug: "weiss", zuege: 2, loesung: "28-35" },
        { brett: ".....tk..b.....b....bb.sK............s.b............dl..........", amZug: "schwarz", zuege: 2, loesung: "52-49" },
        { brett: ".T............D..............B.Bk.....B.B........LBB...S..SK...T", amZug: "weiss", zuege: 1, loesung: "14-8" },
        { brett: "t..kl.T.b..B..T............B.b..B....B.K.......t.b..............", amZug: "weiss", zuege: 3, loesung: "39-47" },
        { brett: "st...t.k....T.......D......bB...b..B..BBB.B.......B...LS..T.K...", amZug: "weiss", zuege: 2, loesung: "20-23" },
        { brett: "s..t.t.k..T.........D......bB...b..B..BBB.B.......B...LS..T.K...", amZug: "weiss", zuege: 2, loesung: "20-23" },
        { brett: ".T............D.........k....B.B......B.B........LBBS..S...K...T", amZug: "weiss", zuege: 1, loesung: "14-8" },
        { brett: "t..kl.T.b.....T....B.......B.b..B....B.K..t......b..............", amZug: "weiss", zuege: 3, loesung: "14-12" },
        { brett: "....k.st.b...sb..B..ll....Lb.d.b...B...B..B...D.......BTt..T..K.", amZug: "schwarz", zuege: 2, loesung: "56-59" },
        { brett: "......D..............k...B.D....S.B.............B..B.B.BT.LK..T.", amZug: "weiss", zuege: 1, loesung: "6-13" },
        { brett: "t...k...b...bt..Lb.bl..b.........d...B.Bs.....K.................", amZug: "schwarz", zuege: 3, loesung: "33-37" },
        { brett: ".s..k.sT.b..........lbb.....b.l...B...........B........B....dLK.", amZug: "schwarz", zuege: 3, loesung: "30-44" },
        { brett: "t...klst.b....b.....ls......B..bB..b.L....b..B.....b..d.TK.D....", amZug: "schwarz", zuege: 3, loesung: "54-22" }
    ],

    /* Der Tag 0 der Zählung — ab hier ist jede Aufgabe einmal dran, dann
       beginnt die Liste von vorn. */
    ANFANG: "2026-09-27",

    /* Bob verteidigt auf der höchsten Stufe. */
    BOT: "meister",

    /* Die Schwierigkeit 1–3 (leicht/mittel/schwer) einer Aufgabe mit N
       Zügen: Matt in N = N (seit v0.151.0; bestimmt die Grund-XP,
       FORTSCHRITT.TAGES_GRUND, und die Punkte auf der Karte „Heute"). */
    schwierigkeit(zuege) {
        return Math.max(1, Math.min(3, Math.floor(zuege) || 2));
    },

    /* Welche Aufgabe an einem Datum („JJJJ-MM-TT") dran ist: { nr, aufgabe }. */
    fuer(datum) {
        const tage = Math.round((Date.parse(datum + "T12:00:00Z")
            - Date.parse(TAGESBRETT.ANFANG + "T12:00:00Z")) / 86400000);
        const anzahl = TAGESBRETT.AUFGABEN.length;
        if (!anzahl || !isFinite(tage)) {
            return null;
        }
        const nr = ((tage % anzahl) + anzahl) % anzahl;
        return { nr: nr, aufgabe: TAGESBRETT.AUFGABEN[nr] };
    },

    /* Die Einstellungen für `TEAM_SCHACH.rundeStarten` (Felder von
       `_regelnVorgabe`), dazu `tagesbrett` und die `stellung`. */
    regelnFuer(datum) {
        const heute = TAGESBRETT.fuer(datum);
        if (!heute) {
            return null;
        }
        return {
            spielart: "standard",
            gegenComputer: true,
            botStufe: TAGESBRETT.BOT,
            faehigkeiten: false,
            seltenheitZeigen: true,
            pechZeigen: true,
            lootboxMenge: "wenig",
            zufallsArmee: false,
            armeeUnterschiedlich: false,
            seiteZufaellig: false,
            sichtbarkeit: "privat",
            armeeStaerke: "normal",
            itemVorrat: "alle",
            itemAuswahl: [],
            einigkeit: false,
            tagesbrett: { datum: datum, nr: heute.nr, zuege: heute.aufgabe.zuege },
            stellung: { brett: heute.aufgabe.brett, amZug: heute.aufgabe.amZug }
        };
    },

    /* Wie viele Züge die Seite `farbe` in dieser Partie gemacht hat
       (aus dem Verlauf — beim Tagesbrett höchstens eine Handvoll). */
    eigeneZuege(partie, farbe) {
        return (Array.isArray(partie.verlauf) ? partie.verlauf : [])
            .filter((eintrag) => eintrag && eintrag.farbe === farbe
                && typeof eintrag.von === "number" && eintrag.von >= 0).length;
    },

    /*
     * NACH EINEM EIGENEN ZUG: Ist es ein Tagesbrett, die Partie läuft noch
     * und die N Züge sind aufgebraucht, endet sie — verfehlt. Liefert die
     * (vielleicht beendete) Partie; alles andere unverändert.
     */
    nachZug(partie, farbe) {
        const angabe = partie && partie.regeln && partie.regeln.tagesbrett;
        if (!angabe || partie.ergebnis || !partie.laeuft || !farbe) {
            return partie;
        }
        if (TAGESBRETT.eigeneZuege(partie, farbe) >= angabe.zuege) {
            return SCHACH_RUNDE.aufgeben(partie, farbe);
        }
        return partie;
    },

    /* Geschafft = gewonnen (durch Matt — Bob gibt nie auf). */
    geschafft(partie, farbe) {
        return !!partie && partie.ergebnis === farbe;
    }
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = TAGESBRETT;
}
