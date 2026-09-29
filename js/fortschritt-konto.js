/*
 * fortschritt-konto.js — wo XP und Level wohnen (seit v0.146.0, Runde 5).
 *
 * Die Rechnung steht in js\fortschritt.js; hier nur, WOHER der Stand kommt
 * und WOHIN er geht — nach dem Muster von js\aussehen-konto.js:
 *
 *   Gerät   immer: `upcrew.fortschritt` im Gerätespeicher (seit v0.150.0,
 *           gemeinsamer Datenvertrag, Design\3D-Schrift\docs\
 *           AUFTRAEGE-RUNDE-6.md Teil A) — EIN Schlüssel für alle
 *           UPCrew-Spiele, darin je Person ein Eintrag:
 *               { "<spieler-id oder gast>": FORTSCHRITT }
 *           Beide Spiele liegen auf demselben Ursprung (up-birdo.github.io),
 *           also sieht Blunderluck hier Typolucks Zweig und umgekehrt —
 *           ohne Konto, ohne Netz. Gäste und Nicht-Angemeldete stehen unter
 *           „gast" (Absprache FORTSCHRITT.md: „Gäste: nur lokal").
 *   Konto   mit echtem Konto zusätzlich das Feld `fortschritt` am eigenen
 *           Eintrag (`spieler/konten/<uid>`), geschrieben über den
 *           Spieler-Abgleich (`ANMELDUNG.abgleich.aendern`) — derselbe Weg
 *           wie Freunde, Abzeichen und Aussehen, kein zweiter daneben.
 *           SCHREIBEN erst, wenn der Nutzer die Regel `SICHERHEIT.md` §11b
 *           eingespielt hat (Schalter `AM_KONTO`); gelesen wird schon jetzt.
 *
 * Gelesen wird immer die Zusammenführung aus allem (je Spiel der neuere
 * Zweig, `FORTSCHRITT.zusammenfuehren`). So kommt Typolucks Zweig herein,
 * und ein Gerät ohne Netz zählt trotzdem weiter.
 *
 * UMZUG (einmalig, seit v0.150.0): Bis v0.149.0 lag der Stand unter
 * `blunderluck.fortschritt` (nur dieses Spiel, nur lokal gebaut, nie
 * ausgeliefert). Er wird beim LESEN mit eingerechnet und beim ersten
 * SCHREIBEN in den Eintrag der dann angemeldeten Person übernommen; danach
 * wird der alte Schlüssel entfernt. So landet er nicht versehentlich bei
 * „gast", nur weil die Anmeldung beim ersten Lesen noch nicht fertig war.
 *
 * TYPOLUCK 0.10.0 (live) legt unter demselben Schlüssel je Person einen
 * FLACHEN Stand ab (`xp`, `heute.wort`, `serie` …). Blunderluck lässt diese
 * Felder unberührt durchwandern (`FORTSCHRITT.normalisieren` behält
 * Unbekanntes) und hängt nur `version` und `spiele.blunderluck` daneben;
 * umziehen tut Typoluck seinen flachen Stand selbst (0.11.0).
 *
 * VERTRAUEN: Alles rechnet der Browser — fälschbar. Für ein Solo-Level
 * unter Freunden in Ordnung (FORTSCHRITT.md, Leitplanken); für einen Rang
 * gegen Menschen reichte das nicht (geparkt).
 */

const FORTSCHRITT_KONTO = {

    /* Der gemeinsame Schlüssel aller UPCrew-Spiele (seit v0.150.0). */
    SCHLUESSEL: "upcrew.fortschritt",

    /* Der Schlüssel bis v0.149.0 — wird einmalig übernommen (Umzug). */
    SCHLUESSEL_ALT: "blunderluck.fortschritt",

    /* Der Eintrag für alle ohne echtes Konto. */
    GAST: "gast",

    /* Schreibt Blunderluck den Fortschritt auch an das Konto? Erst, wenn die
       Regel `SICHERHEIT.md` §11b eingespielt ist (Runde 6, Teil A: „bis
       dahin Gerät-only"). Ohne Regel ginge das Schreiben heute zwar durch —
       aber sobald die Regel kommt, lehnte die Datenbank bei jedem
       Formfehler den GANZEN Eintrag ab (Freunde, Abzeichen). Regel und
       Schalter gehen deshalb in EINEM Zug. AN seit v0.151.1: Der Nutzer hat
       die gesamte Regel (§11 + §11a + §11b) am 27.09.2026 eingespielt. */
    AM_KONTO: true,

    _horcher: [],

    /* Der eigene Eintrag — nur mit echtem Konto, nie als Gast. */
    _eigener() {
        if (typeof ANMELDUNG === "undefined" || !ANMELDUNG.abgleich
                || typeof ANMELDUNG.ich !== "function") {
            return null;
        }
        const eintrag = ANMELDUNG.ich();
        if (!eintrag || eintrag.gast === true) {
            return null;
        }
        return eintrag;
    },

    /* Unter welchem Eintrag im Gerätespeicher diese Person steht: die
       Spieler-Id des eigenen Kontos (in beiden Spielen dieselbe, weil beide
       denselben Konto-Eintrag lesen), sonst „gast". */
    _person() {
        const eintrag = FORTSCHRITT_KONTO._eigener();
        return (eintrag && typeof eintrag.id === "string" && eintrag.id !== "")
            ? eintrag.id : FORTSCHRITT_KONTO.GAST;
    },

    /* Alle Einträge unter dem gemeinsamen Schlüssel — ein Objekt, notfalls
       ein leeres (kaputt, gesperrt, noch nie geschrieben). */
    _alleLesen() {
        try {
            const roh = JSON.parse(localStorage.getItem(FORTSCHRITT_KONTO.SCHLUESSEL) || "null");
            return FORTSCHRITT._istObjekt(roh) ? roh : {};
        } catch (fehler) {
            return {};
        }
    },

    /* Der Stand bis v0.149.0, solange er noch nicht umgezogen ist — oder null. */
    _altLesen() {
        try {
            const roh = JSON.parse(localStorage.getItem(FORTSCHRITT_KONTO.SCHLUESSEL_ALT) || "null");
            return FORTSCHRITT._istObjekt(roh) ? FORTSCHRITT.normalisieren(roh) : null;
        } catch (fehler) {
            return null;
        }
    },

    /* Der eigene Eintrag auf dem Gerät, samt noch nicht umgezogenem Altstand. */
    _lokalLesen() {
        const eigener = FORTSCHRITT.normalisieren(FORTSCHRITT_KONTO._alleLesen()[FORTSCHRITT_KONTO._person()]);
        const alt = FORTSCHRITT_KONTO._altLesen();
        return alt ? FORTSCHRITT.zusammenfuehren(eigener, alt) : eigener;
    },

    /*
     * Den eigenen Eintrag schreiben — FRISCH gelesen, damit ein anderes
     * Spiel im selben Browser nichts verliert (andere Personen, andere
     * Zweige, Typolucks flache Felder). Danach ist der Altstand umgezogen:
     * Er steckt in `stand` (über `_lokalLesen`), der alte Schlüssel geht weg.
     */
    _lokalSchreiben(stand) {
        try {
            const alle = FORTSCHRITT_KONTO._alleLesen();
            const person = FORTSCHRITT_KONTO._person();
            /* Reihenfolge mit Absicht: Oben im Eintrag (Typolucks flache
               Felder) gewinnt der frisch gelesene Stand, in `spiele` je
               Zweig der neuere — und der eigene ist gerade neu gezählt. */
            alle[person] = FORTSCHRITT.zusammenfuehren(alle[person] || null, stand);
            localStorage.setItem(FORTSCHRITT_KONTO.SCHLUESSEL, JSON.stringify(alle));
            if (localStorage.getItem(FORTSCHRITT_KONTO.SCHLUESSEL_ALT) !== null) {
                localStorage.removeItem(FORTSCHRITT_KONTO.SCHLUESSEL_ALT);
            }
        } catch (fehler) {
            /* privates Fenster: dann zählt es nur bis zum Neuladen */
        }
    },

    /* Der geltende Stand: Gerät und Konto zusammengeführt. */
    lesen() {
        const lokal = FORTSCHRITT_KONTO._lokalLesen();
        const eintrag = FORTSCHRITT_KONTO._eigener();
        if (eintrag && eintrag.fortschritt) {
            return FORTSCHRITT.zusammenfuehren(lokal, eintrag.fortschritt);
        }
        return lokal;
    },

    /* { level, imLevel, kosten, anteil } — für Ring, Profil und Freischaltung. */
    level() {
        return FORTSCHRITT.level(FORTSCHRITT_KONTO.lesen());
    },

    /*
     * Einen neuen Stand ablegen: immer auf dem Gerät, mit Konto auch dort
     * (sobald `AM_KONTO` an ist) — aber nur, wenn sich am Konto-Feld
     * wirklich etwas ändert (sonst schriebe jeder Aufruf den ganzen Eintrag
     * neu). Ans Konto gehen nur die Felder des Vertrags (`version`,
     * `spiele`), nie Typolucks flache Gerätefelder — die Regel §11b lehnt
     * alles andere ab.
     */
    _ablegen(stand) {
        FORTSCHRITT_KONTO._lokalSchreiben(stand);
        const eintrag = FORTSCHRITT_KONTO.AM_KONTO ? FORTSCHRITT_KONTO._eigener() : null;
        if (eintrag) {
            /* Nur, was die Regel §11b erlaubt (`FORTSCHRITT.fuerKonto`,
               seit v0.151.0: ohne `umzug`, ohne flache Felder). */
            const konto = FORTSCHRITT.fuerKonto(eintrag.fortschritt || null);
            const zusammen = FORTSCHRITT.fuerKonto(FORTSCHRITT.zusammenfuehren(stand, konto));
            if (JSON.stringify(zusammen) !== JSON.stringify(konto)) {
                const neu = SPIELER.fortschrittSetzen(ANMELDUNG.abgleich.daten, eintrag.id, zusammen);
                ANMELDUNG.abgleich.aendern(neu, false);
            }
        }
        for (const horcher of FORTSCHRITT_KONTO._horcher) {
            try {
                horcher(stand);
            } catch (fehler) {
                console.error("Fortschritt-Horcher:", fehler);
            }
        }
    },

    /*
     * EINE BEENDETE PARTIE ZÄHLEN (+10 XP, einmal je Partie). Gerufen, sobald
     * ihr Abschluss auftaucht (js\team-schach.js) — für jede beendete Partie,
     * in der die Person mitspielte, auch gegen Bob und auch verloren.
     * Liefert { xp, levelVorher, levelNachher } oder null, wenn nichts zu
     * zählen war.
     */
    partieBeendet(partie, personId) {
        const team = (partie && typeof SCHACH_RUNDE !== "undefined")
            ? SCHACH_RUNDE.teamVon(partie, personId) : "";
        if (!partie || !partie.ergebnis || !partie.id || !team) {
            return null;
        }
        const turm = FORTSCHRITT_KONTO._turmWertung(partie, team);
        const vorher = FORTSCHRITT_KONTO.lesen();
        let nachher = FORTSCHRITT.partieZaehlen(vorher, partie.id, Date.now(), undefined, turm);
        const xpVorher = FORTSCHRITT.gesamtXp(vorher);
        if (FORTSCHRITT.gesamtXp(nachher) === xpVorher) {
            return null;
        }

        /* Ein Tagesbrett (seit v0.149.0) ist zugleich ein Versuch an der
           Tagesaufgabe — im selben Schritt, also auch nur einmal. */
        let heute = null;
        const angabe = partie.regeln && partie.regeln.tagesbrett;
        if (angabe && typeof TAGESBRETT !== "undefined") {
            const schutz = FORTSCHRITT.schutzVerdient(FORTSCHRITT.level(nachher).level);
            const versuch = FORTSCHRITT.tagesaufgabe(nachher, angabe.datum,
                TAGESBRETT.geschafft(partie, team), Date.now(), undefined, schutz,
                TAGESBRETT.schwierigkeit(angabe.zuege),
                FORTSCHRITT_KONTO.hilfeGenutzt(partie.id));
            nachher = versuch.stand;
            heute = Object.assign({ xp: versuch.xp },
                FORTSCHRITT.heuteVon(nachher, undefined, angabe.datum));
        }

        /* Münzen für diese Partie (seit v0.152.0, UPCREW_MUENZEN.VERDIENST). */
        const muenzen = FORTSCHRITT_KONTO._muenzenFuerPartie(partie, team, vorher, nachher, turm, heute);
        if (muenzen > 0 && typeof UPCREW_MUENZEN !== "undefined") {
            nachher = UPCREW_MUENZEN.verdienen(nachher, FORTSCHRITT.APP, muenzen, Date.now());
        }

        const xpNachher = FORTSCHRITT.gesamtXp(nachher);
        FORTSCHRITT_KONTO._ablegen(nachher);
        FORTSCHRITT_KONTO._muenzenMelden(muenzen);
        /* Herzen und Rückfall des neuen Turms (seit v0.160.0, Gerät). */
        FORTSCHRITT_KONTO._turmNachPartie(partie, team, vorher);
        const ergebnis = {
            xp: xpNachher - xpVorher,
            levelVorher: FORTSCHRITT.levelAus(xpVorher).level,
            levelNachher: FORTSCHRITT.levelAus(xpNachher).level
        };
        if (heute) {
            ergebnis.heute = heute;
        }
        if (muenzen > 0) {
            ergebnis.muenzen = muenzen;
        }
        if (turm) {
            ergebnis.turm = Object.assign({}, turm, {
                ortVorher: TURM.erreicht(FORTSCHRITT.turmFiguren(vorher)),
                ortNachher: TURM.erreicht(FORTSCHRITT.turmFiguren(nachher))
            });
        }
        return ergebnis;
    },

    /*
     * Die Wertung einer TURM-Partie (seit v0.147.0): { schluessel, figuren,
     * ort, stufe } — oder null, wenn es keine Turm-Partie ist. Die Figuren
     * rechnet js\turm.js (Sieg = Bauer; Springer und König mit der
     * Genauigkeit, sobald die Wertung sie liefert).
     */
    _turmWertung(partie, team) {
        const angabe = partie.regeln && partie.regeln.turm;
        if (typeof TURM === "undefined" || !angabe || !TURM.ort(angabe.ort)) {
            return null;
        }
        const genauigkeit = (typeof WERTUNG !== "undefined")
            ? WERTUNG.genauigkeitVon(partie, team) : undefined;
        let figuren = TURM.figurenFuer(partie.ergebnis === team, angabe.ort, genauigkeit);
        /* Mit Hilfe aus dem Shop (Tipp, Zeit zurück) höchstens ein Bauer —
           wie beim Tagesbrett (seit v0.152.2 auch im Turm). */
        if (FORTSCHRITT_KONTO.hilfeGenutzt(partie.id)) {
            figuren = Math.min(figuren, 1);
        }
        return {
            schluessel: TURM.schluessel(angabe.ort, angabe.stufe),
            ort: angabe.ort,
            stufe: angabe.stufe,
            figuren: figuren,
            genauigkeit: genauigkeit
        };
    },

    /* Hat diese Partie schon gezählt (XP, Figuren)? Dann lässt sie sich
       mit Zeit zurück nicht mehr wiederbeleben (seit v0.152.2). */
    istGezaehlt(partieId) {
        const zweig = (FORTSCHRITT_KONTO.lesen().spiele || {})[FORTSCHRITT.APP];
        return !!zweig && Array.isArray(zweig.gezaehlt) && zweig.gezaehlt.indexOf(partieId) !== -1;
    },

    /* Die Figuren-Tabelle des Turms und der erreichte Ort (Start, Freischaltung). */
    turmFiguren() {
        return FORTSCHRITT.turmFiguren(FORTSCHRITT_KONTO.lesen());
    },

    turmOrt() {
        return (typeof TURM === "undefined") ? 1 : TURM.erreicht(FORTSCHRITT_KONTO.turmFiguren());
    },

    /* ---------------------------------------------------------------- *
     * DER NEUE TURM (seit v0.160.0, js\turm.js): Seed, Lauf, Gerät
     * ---------------------------------------------------------------- */

    /* Herzen und „neu zu spielen" liegen NUR auf dem Gerät (Regel §13 hat
       dafür kein Feld): { "<person>|<ort>|<durchgang>": { herzen, wieder,
       geheilt } }. */
    TURM_GERAET_SCHLUESSEL: "blunderluck.turm-lauf",
    TURM_GERAET_MAX: 12,

    /* Durchgang und Generator-Version aus den Zählern (fehlen sie: 1 und die
       neueste Version — geschrieben beim ersten Schritt im Turm). */
    _turmDurchgangAus(stand) {
        const zweig = FORTSCHRITT.zweig(stand, FORTSCHRITT.APP);
        const z = FORTSCHRITT._istObjekt(zweig.zaehler) ? zweig.zaehler : {};
        const d = (Number.isInteger(z.turmDurchgang) && z.turmDurchgang > 0) ? z.turmDurchgang : 1;
        const v = (typeof UPCREW_ZUFALL !== "undefined") ? UPCREW_ZUFALL.version(z.turmGenerator)
            : (z.turmGenerator || 1);
        return { durchgang: d, version: v, gemerkt: typeof z.turmDurchgang === "number" && typeof z.turmGenerator === "number" };
    },

    /* Beim ersten Schritt im neuen Turm: Durchgang und Version festhalten,
       damit ein laufender Durchgang seine Version behält. */
    turmDurchgangSichern() {
        const d = FORTSCHRITT_KONTO._turmDurchgangAus(FORTSCHRITT_KONTO.lesen());
        if (d.gemerkt) {
            return 0;
        }
        return FORTSCHRITT_KONTO.zaehlerHeben({ turmDurchgang: d.durchgang, turmGenerator: d.version });
    },

    _turmGeraetAlle() {
        try {
            const roh = JSON.parse(window.localStorage.getItem(FORTSCHRITT_KONTO.TURM_GERAET_SCHLUESSEL) || "{}");
            return FORTSCHRITT._istObjekt(roh) ? roh : {};
        } catch (fehler) {
            return {};
        }
    },

    _turmGeraetName(nr, durchgang) {
        return FORTSCHRITT_KONTO._person() + "|" + nr + "|" + durchgang;
    },

    turmGeraet(nr, durchgang) {
        const g = FORTSCHRITT_KONTO._turmGeraetAlle()[FORTSCHRITT_KONTO._turmGeraetName(nr, durchgang)];
        return FORTSCHRITT._istObjekt(g) ? g : {};
    },

    turmGeraetSetzen(nr, durchgang, geraet) {
        try {
            const alle = FORTSCHRITT_KONTO._turmGeraetAlle();
            const name = FORTSCHRITT_KONTO._turmGeraetName(nr, durchgang);
            delete alle[name];
            alle[name] = {
                herzen: geraet.herzen,
                wieder: (geraet.wieder || []).slice(0, 60),
                geheilt: (geraet.geheilt || []).slice(0, 60)
            };
            const namen = Object.keys(alle);
            for (const alt of namen.slice(0, Math.max(0, namen.length - FORTSCHRITT_KONTO.TURM_GERAET_MAX))) {
                delete alle[alt];
            }
            window.localStorage.setItem(FORTSCHRITT_KONTO.TURM_GERAET_SCHLUESSEL, JSON.stringify(alle));
        } catch (fehler) {
            /* ohne Gerätespeicher: Herzen gelten bis zum Neuladen nicht */
        }
    },

    /* Alles, was `TURM.lauf` braucht — aus einem Stand (sonst dem geltenden). */
    turmAngabe(nr, stand) {
        const s = stand || FORTSCHRITT_KONTO.lesen();
        const d = FORTSCHRITT_KONTO._turmDurchgangAus(s);
        const g = FORTSCHRITT_KONTO.turmGeraet(nr, d.durchgang);
        return {
            figuren: FORTSCHRITT.turmFiguren(s),
            schwuere: FORTSCHRITT.turmSchwuere(s),
            spieler: FORTSCHRITT_KONTO._person(),
            durchgang: d.durchgang,
            version: d.version,
            herzen: g.herzen,
            wieder: g.wieder,
            geheilt: g.geheilt
        };
    },

    turmLauf(nr, stand) {
        return (typeof TURM === "undefined") ? null : TURM.lauf(nr, FORTSCHRITT_KONTO.turmAngabe(nr, stand));
    },

    /*
     * EINE STATION OHNE PARTIE (Rast, Truhe, Händler, Fund): „betreten"
     * merken und Zähler wachsen lassen (Münzen, Waren). `plus` wie bei
     * `FORTSCHRITT.turmStation`. Ausgaben stehen als `muenzenAusgegeben`
     * darin; reicht der Kontostand nicht, passiert nichts (→ false).
     */
    turmStation(nr, knoten, plus) {
        const vorher = FORTSCHRITT_KONTO.lesen();
        const ausgabe = (plus && plus.muenzenAusgegeben) || 0;
        if (ausgabe > 0 && typeof UPCREW_MUENZEN !== "undefined" && UPCREW_MUENZEN.saldo(vorher) < ausgabe) {
            return false;
        }
        FORTSCHRITT_KONTO.turmDurchgangSichern();
        const nachher = FORTSCHRITT.turmStation(FORTSCHRITT_KONTO.lesen(),
            knoten ? TURM.stationsSchluessel(nr, knoten.nr) : null, plus || {}, Date.now());
        FORTSCHRITT_KONTO._ablegen(nachher);
        return true;
    },

    /* Was der Start nach einer Turm-Partie zeigen soll (einmal, dann null). */
    turmMeldung: null,

    /*
     * NACH EINER TURM-PARTIE (neuer Turm): Herzen und Rückfall auf dem
     * Gerät. Gerechnet auf dem Stand VOR der Partie (so steht der Weg noch
     * dort, wo sie begann). Remis kostet nichts.
     */
    _turmNachPartie(partie, team, vorher) {
        const angabe = partie.regeln && partie.regeln.turm;
        if (typeof TURM === "undefined" || !angabe || angabe.stufe < TURM.NR_AB || !TURM.ort(angabe.ort)) {
            return;
        }
        const nr = angabe.ort;
        const lauf = FORTSCHRITT_KONTO.turmLauf(nr, vorher);
        const k = lauf && lauf.plan.knotenMitNr(angabe.stufe);
        if (!k) {
            return;
        }
        const d = FORTSCHRITT_KONTO._turmDurchgangAus(vorher);
        const geraet = FORTSCHRITT_KONTO.turmGeraet(nr, d.durchgang);
        if (partie.ergebnis === team) {
            FORTSCHRITT_KONTO.turmGeraetSetzen(nr, d.durchgang, TURM.nachSieg(lauf, k.id, geraet));
            FORTSCHRITT_KONTO.turmMeldung = { art: "sieg", ort: nr, id: k.id };
        } else if (partie.ergebnis !== "remis") {
            const r = TURM.nachNiederlage(lauf, k.id, geraet);
            FORTSCHRITT_KONTO.turmGeraetSetzen(nr, d.durchgang, r.geraet);
            FORTSCHRITT_KONTO.turmMeldung = { art: r.rueckfall ? "rueckfall" : "verloren", ort: nr, id: k.id,
                minus: r.minus, herzen: r.geraet.herzen, rueckfall: r.rueckfall };
        }
    },

    /* Heute (seit v0.149.0): das Datum des Geräts, die Tagesaufgabe je
       Spiel und die Serie samt Schutz — alles für den Tab „Heute". */
    heute() {
        const stand = FORTSCHRITT_KONTO.lesen();
        const datum = FORTSCHRITT.datumVon(Date.now());
        const level = FORTSCHRITT.level(stand).level;
        const schutz = FORTSCHRITT.schutzVerdient(level);
        const serie = FORTSCHRITT.serie(stand, datum, schutz);
        return {
            datum: datum,
            blunderluck: FORTSCHRITT.heuteVon(stand, "blunderluck", datum),
            typoluck: FORTSCHRITT.heuteVon(stand, "typoluck", datum),
            serie: serie,
            tage: FORTSCHRITT.alleTage(stand)
            /* `schutzFrei` und `schilde` sind seit v0.157.0 weg (kein Schutz, kein Schild). */
        };
    },

    /*
     * ALTE FLAMMEN-SCHILDE ERSTATTEN (seit v0.157.0, einmalig): Wer noch
     * gekaufte, unbenutzte Schilde hat, bekommt ihren Kaufpreis
     * (`SCHILD_PREIS`, 50 je Stück wie im alten Shop) als verdiente Münzen.
     * Gemerkt im Zähler `schildErstattet` des Blunderluck-Zweigs — beim
     * Zusammenführen gilt je Zähler der grössere Wert, so zahlt auch ein
     * zweites Gerät nicht doppelt. Gerufen bei jedem Spieler-Stand
     * (app.js `beiDaten`); liefert die gutgeschriebenen Münzen (meist 0).
     */
    SCHILD_PREIS: 50,

    schildeErstatten() {
        if (!FORTSCHRITT_KONTO._person() || typeof FORTSCHRITT.schildeErstatten !== "function") {
            return 0;
        }
        const r = FORTSCHRITT.schildeErstatten(FORTSCHRITT_KONTO.lesen(), FORTSCHRITT.APP,
            FORTSCHRITT_KONTO.SCHILD_PREIS, Date.now());
        if (r.stueck <= 0) {
            return 0;
        }
        FORTSCHRITT_KONTO._ablegen(r.stand);
        FORTSCHRITT_KONTO._muenzenMelden(r.muenzen);
        return r.muenzen;
    },

    /* ---------------------------------------------------------------- *
     * Serie ab Rundenstart, Münzen und Waren (seit v0.152.0)
     * ---------------------------------------------------------------- */

    /*
     * EINE RUNDE HAT ANGEFANGEN (Nutzer 27.09.2026: „Serie soll einfach:
     * einmal eine Runde starten, egal welches Game"). Gerufen beim Anpfiff
     * jeder eigenen Partie (js\team-schach.js) — einmal je Tag wirksam. Wer
     * damit 7, 14, 21 … Tage am Stück erreicht, bekommt Münzen.
     */
    rundeGestartet() {
        const vorher = FORTSCHRITT_KONTO.lesen();
        const datum = FORTSCHRITT.datumVon(Date.now());
        const schutz = FORTSCHRITT.schutzVerdient(FORTSCHRITT.level(vorher).level);
        const r = FORTSCHRITT.rundeGestartet(vorher, datum, Date.now(), undefined, schutz);
        if (!r.neu) {
            return null;
        }
        let nachher = r.stand;
        let muenzen = 0;
        const bisher = FORTSCHRITT.serie(vorher, datum, schutz);
        if (typeof UPCREW_MUENZEN !== "undefined" && r.serie > 0 && r.serie % 7 === 0
                && !(bisher.heute && bisher.tage === r.serie)) {
            muenzen = UPCREW_MUENZEN.VERDIENST.serieWoche;
            nachher = UPCREW_MUENZEN.verdienen(nachher, FORTSCHRITT.APP, muenzen, Date.now());
        }
        FORTSCHRITT_KONTO._ablegen(nachher);
        FORTSCHRITT_KONTO._muenzenMelden(muenzen);
        return { serie: r.serie, muenzen: muenzen };
    },

    /* Was eine beendete Partie an Münzen bringt (einmal je Partie — das
       sichert `partieBeendet` über die gezählten Partien). */
    _muenzenFuerPartie(partie, team, vorher, nachher, turm, heute) {
        if (typeof UPCREW_MUENZEN === "undefined") {
            return 0;
        }
        const v = UPCREW_MUENZEN.VERDIENST;
        let summe = 0;
        const tagesbrett = !!(partie.regeln && partie.regeln.tagesbrett);
        if (!tagesbrett && partie.ergebnis === team) {
            summe += v.sieg;
        }
        if (heute && heute.figuren > 0) {
            const alt = FORTSCHRITT.heuteVon(vorher, undefined, partie.regeln.tagesbrett.datum);
            if (!alt.figuren) {
                summe += v.tagesaufgabe;
            }
        }
        if (turm) {
            const alt = FORTSCHRITT.turmFiguren(vorher)[turm.schluessel] || 0;
            const neu = FORTSCHRITT.turmFiguren(nachher)[turm.schluessel] || 0;
            if (neu > alt) {
                summe += (neu - alt) * v.figur;
                if (alt === 0 && typeof TURM !== "undefined" && TURM.istBoss(turm.ort, turm.stufe)) {
                    summe += v.boss;
                }
            }
        }
        const levelVorher = FORTSCHRITT.level(vorher).level;
        const levelNachher = FORTSCHRITT.level(nachher).level;
        if (levelNachher > levelVorher) {
            summe += (levelNachher - levelVorher) * v.level;
        }
        return summe;
    },

    /* Kurz einblenden: „+3 Münzen". */
    _muenzenMelden(betrag) {
        if (betrag > 0 && typeof DIALOG !== "undefined" && typeof UPCREW_MUENZEN !== "undefined"
                && typeof DIALOG.kurzmeldung === "function") {
            DIALOG.kurzmeldung("+" + betrag + " " + UPCREW_MUENZEN.WAEHRUNG.name);
        }
    },

    muenzen() {
        return (typeof UPCREW_MUENZEN === "undefined") ? 0 : UPCREW_MUENZEN.anzeige(FORTSCHRITT_KONTO.lesen());
    },

    vorrat(ware) {
        return (typeof UPCREW_MUENZEN === "undefined") ? 0 : UPCREW_MUENZEN.vorrat(FORTSCHRITT_KONTO.lesen(), ware);
    },

    /* Kaufen im Shop: nur, wenn der Stand reicht. Liefert { ok, grund }. */
    kaufen(ware) {
        const r = UPCREW_MUENZEN.kaufen(FORTSCHRITT_KONTO.lesen(), FORTSCHRITT.APP, ware, Date.now());
        if (r.ok) {
            FORTSCHRITT_KONTO._ablegen(r.stand);
        }
        return { ok: r.ok, grund: r.grund };
    },

    /* Ein Stück aus dem Vorrat nehmen (Zeit zurück = Ware „leben", Tipp).
       Liefert true/false. */
    benutzen(ware) {
        const r = UPCREW_MUENZEN.benutzen(FORTSCHRITT_KONTO.lesen(), FORTSCHRITT.APP, ware, Date.now());
        if (r.ok) {
            FORTSCHRITT_KONTO._ablegen(r.stand);
        }
        return r.ok;
    },

    /*
     * HILFE IN EINER PARTIE (Tipp, Zeit zurück): gemerkt auf dem Gerät je
     * Partie — beim Tagesbrett gibt es dann höchstens einen Bauern
     * (`FORTSCHRITT.tagesaufgabe`, Wert `hilfe`), im Turm ebenso
     * (`_turmWertung`, seit v0.152.2).
     */
    HILFE_SCHLUESSEL: "blunderluck.hilfe-partien",

    hilfeMerken(partieId) {
        try {
            const liste = JSON.parse(window.localStorage.getItem(FORTSCHRITT_KONTO.HILFE_SCHLUESSEL) || "[]");
            if (liste.indexOf(partieId) === -1) {
                liste.push(partieId);
            }
            window.localStorage.setItem(FORTSCHRITT_KONTO.HILFE_SCHLUESSEL, JSON.stringify(liste.slice(-50)));
        } catch (fehler) {
            /* Ohne Speicher gilt die Hilfe nicht als gemerkt. */
        }
    },

    hilfeGenutzt(partieId) {
        try {
            const liste = JSON.parse(window.localStorage.getItem(FORTSCHRITT_KONTO.HILFE_SCHLUESSEL) || "[]");
            return Array.isArray(liste) && liste.indexOf(partieId) !== -1;
        } catch (fehler) {
            return false;
        }
    },

    /* Wer wissen will, wann sich der Stand ändert (Start, Profil). */
    beiAenderung(horcher) {
        FORTSCHRITT_KONTO._horcher.push(horcher);
    },

    /* ---------------------------------------------------------------- *
     * SPIELZEIT (seit v0.155.0; Rechnung `FORTSCHRITT.spielzeitZaehlen`)
     *
     * Gezählt wird nur, solange die Seite SICHTBAR ist
     * (`document.visibilityState`): alle SPIELZEIT_TAKT_MS die Zeit seit dem
     * letzten Schritt — auf das Gerät (auch als Gast). Ans Konto geht sie
     * nicht bei jedem Schritt (der ganze Eintrag würde geschrieben), sondern
     * beim Verbergen der Seite und höchstens alle SPIELZEIT_KONTO_MS.
     * ---------------------------------------------------------------- */

    SPIELZEIT_TAKT_MS: 30000,
    SPIELZEIT_KONTO_MS: 15 * 60 * 1000,
    _sichtbarSeit: null,
    _spielzeitKontoZuletzt: 0,
    _spielzeitUhr: null,

    spielzeitStarten() {
        if (FORTSCHRITT_KONTO._spielzeitUhr || typeof document === "undefined") {
            return;
        }
        const sichtbar = () => document.visibilityState !== "hidden";
        FORTSCHRITT_KONTO._sichtbarSeit = sichtbar() ? Date.now() : null;
        FORTSCHRITT_KONTO._spielzeitKontoZuletzt = Date.now();
        FORTSCHRITT_KONTO._spielzeitUhr = setInterval(() => FORTSCHRITT_KONTO.spielzeitSchritt(sichtbar()),
            FORTSCHRITT_KONTO.SPIELZEIT_TAKT_MS);
        document.addEventListener("visibilitychange", () => {
            FORTSCHRITT_KONTO.spielzeitSchritt(sichtbar());
        });
    },

    /*
     * Ein Schritt: die sichtbare Zeit seit dem letzten Schritt buchen.
     * `sichtbar` = ist die Seite JETZT sichtbar. Wird sie gerade verborgen,
     * geht der Stand ans Konto. Liefert die gebuchten Sekunden.
     */
    spielzeitSchritt(sichtbar, jetzt) {
        const zeit = (typeof jetzt === "number") ? jetzt : Date.now();
        let gebucht = 0;
        if (FORTSCHRITT_KONTO._sichtbarSeit !== null) {
            gebucht = Math.min(Math.floor(Math.max(0, zeit - FORTSCHRITT_KONTO._sichtbarSeit) / 1000),
                FORTSCHRITT.SPIELZEIT_SCHRITT_MAX);
            if (gebucht > 0) {
                const stand = FORTSCHRITT.spielzeitZaehlen(FORTSCHRITT_KONTO.lesen(), gebucht, zeit);
                FORTSCHRITT_KONTO._lokalSchreiben(stand);
            }
        }
        FORTSCHRITT_KONTO._sichtbarSeit = sichtbar ? zeit : null;
        if (!sichtbar || zeit - FORTSCHRITT_KONTO._spielzeitKontoZuletzt >= FORTSCHRITT_KONTO.SPIELZEIT_KONTO_MS) {
            FORTSCHRITT_KONTO.spielzeitSichern(zeit);
        }
        return gebucht;
    },

    /* Den Gerätestand (mit Spielzeit) ans Konto geben — nur mit echtem
       Konto, und `_ablegen` schreibt nur, wenn sich etwas ändert. */
    spielzeitSichern(jetzt) {
        FORTSCHRITT_KONTO._spielzeitKontoZuletzt = (typeof jetzt === "number") ? jetzt : Date.now();
        if (FORTSCHRITT_KONTO._eigener()) {
            FORTSCHRITT_KONTO._ablegen(FORTSCHRITT_KONTO.lesen());
        }
    },

    /* Für das eigene Profil: { spiele: { app: Sekunden }, summe, seit
       ("JJJJ-MM-TT" oder "") }. */
    spielzeit() {
        const stand = FORTSCHRITT_KONTO.lesen();
        const spiele = {};
        for (const app of Object.keys(FORTSCHRITT.normalisieren(stand).spiele)) {
            spiele[app] = FORTSCHRITT.spielzeitVon(stand, app);
        }
        return { spiele: spiele, summe: FORTSCHRITT.spielzeitSumme(stand), seit: FORTSCHRITT.seitVon(stand) };
    },

    /*
     * ZÄHLER IM EIGENEN ZWEIG HEBEN (seit v0.156.0, für die verdienten
     * Abzeichen `az…`, js\profil.js): je Name nur höher, nie tiefer — so
     * bleibt ein einmal verdientes Abzeichen liegen. Namen nur aus
     * Buchstaben (Regel §11b). Liefert, wie viele Zähler sich änderten.
     */
    zaehlerHeben(felder) {
        const stand = FORTSCHRITT.normalisieren(FORTSCHRITT_KONTO.lesen());
        const zweig = stand.spiele[FORTSCHRITT.APP] || FORTSCHRITT.spielLeer();
        const zaehler = FORTSCHRITT._zaehlerAnlegen(zweig);
        let geaendert = 0;
        for (const name of Object.keys(felder || {})) {
            const wert = felder[name];
            if (/^[a-zA-Z]{1,32}$/.test(name) && typeof wert === "number" && isFinite(wert) && wert >= 0
                    && wert <= 1000000000 && !(typeof zaehler[name] === "number" && zaehler[name] >= wert)) {
                zaehler[name] = Math.floor(wert);
                geaendert++;
            }
        }
        if (geaendert === 0) {
            return 0;
        }
        zweig.zaehler = zaehler;
        zweig.stand = Math.max(zweig.stand + 1, Date.now());
        stand.spiele[FORTSCHRITT.APP] = zweig;
        FORTSCHRITT_KONTO._ablegen(FORTSCHRITT.normalisieren(stand));
        return geaendert;
    },

    /*
     * GAST → KONTO (seit v0.155.0, Nutzer 28.09.2026: Spielzeit und
     * Startdatum „auch bei gästen", beim Umzug mitnehmen): Nach „Spielstand
     * sichern" liegt der Gast-Stand auf dem Gerät noch unter „gast". Er wird
     * mit dem Eintrag der neuen Person zusammengeführt (Spielzeit, „dabei
     * seit", XP, Serie — alles, was der Gast hatte), der Gast-Eintrag
     * verschwindet, und der Stand geht ans Konto. Liefert, ob etwas
     * umgezogen ist.
     */
    gastUebernehmen() {
        const person = FORTSCHRITT_KONTO._person();
        if (person === FORTSCHRITT_KONTO.GAST) {
            return false;
        }
        try {
            const alle = FORTSCHRITT_KONTO._alleLesen();
            const gast = alle[FORTSCHRITT_KONTO.GAST];
            if (!FORTSCHRITT._istObjekt(gast)) {
                return false;
            }
            alle[person] = FORTSCHRITT.zusammenfuehren(alle[person] || null, gast);
            delete alle[FORTSCHRITT_KONTO.GAST];
            localStorage.setItem(FORTSCHRITT_KONTO.SCHLUESSEL, JSON.stringify(alle));
        } catch (fehler) {
            return false;
        }
        FORTSCHRITT_KONTO._ablegen(FORTSCHRITT_KONTO.lesen());
        return true;
    }
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = FORTSCHRITT_KONTO;
}
