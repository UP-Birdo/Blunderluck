/*
 * schach-tafel.js — die Sammlung aller Schachpartien.
 *
 * Bis v1.3 lag unter dem Schach-Pfad genau EINE Partie. Seit v1.4 liegen dort
 * beliebig viele nebeneinander; jede einzelne ist unverändert das, was
 * schach-runde.js beschreibt. Diese Datei kennt nur die Sammlung und niemals
 * die Schachregeln.
 *
 * Datenvertrag:
 *
 *     {
 *         "datenVersion": 2,
 *         "geaendertAm": 1750000000000,
 *         "partien": {
 *             "start": { … eine Runde, siehe schach-runde.js … },
 *             "p-l3k9": { … }
 *         }
 *     }
 *
 * UMSTIEG VON EINER EINZELNEN PARTIE (die wichtigste Aufgabe dieser Datei)
 * Ein Stand aus der Zeit davor sieht aus wie eine Runde: Er hat `stand` und
 * `teams` an der Wurzel, aber kein `partien`. Ein solcher Stand wird
 * übernommen und wird zur Partie mit der Kennung "start". Damit läuft eine
 * angefangene Partie ohne Bruch weiter — Brett, Teams, Bereitschaft, Verlauf
 * und Zugzähler bleiben, wie sie waren.
 *
 * WARUM DIE PARTIEN EIN OBJEKT SIND UND KEINE LISTE
 * Firebase speichert Listen mit Lücken unzuverlässig und macht aus einer Liste
 * mit fehlenden Stellen ein Objekt. Bei einem Objekt mit Kennungen als
 * Schlüssel gibt es diese Überraschung nicht, und das Einsetzen einer einzelnen
 * Partie in einen fremden Stand ist eine einzige Zuweisung — genau das, was
 * das gleichzeitige Spielen an mehreren Partien braucht.
 */

const SCHACH_TAFEL = {

    DATEN_VERSION: 2,

    /* Kennung der Partie, zu der ein alter Einzel-Stand wird. */
    ERSTE_ID: "start",

    leereTafel(zeitpunkt) {
        return {
            datenVersion: SCHACH_TAFEL.DATEN_VERSION,
            geaendertAm: (zeitpunkt === undefined) ? 0 : zeitpunkt,
            partien: {},

            /*
             * Die Chronik: je beendeter Partie EIN Eintrag mit dem Ergebnis und
             * den Teams, wie sie am Ende waren.
             *
             * Sie ist der Grund, warum die Rangliste nichts mehr verlieren kann.
             * Bis v2.3 rechnete sie aus den Partien selbst — wer eine beendete
             * Partie löschte, nahm allen Beteiligten ihre Punkte wieder weg.
             * Ein Chronik-Eintrag wird geschrieben, sobald ein Ergebnis
             * feststeht, und danach NIE wieder angefasst.
             */
            chronik: []
        };
    },

    normalisieren(roh) {
        const tafel = SCHACH_TAFEL.leereTafel();

        if (!roh || typeof roh !== "object") {
            return tafel;
        }

        if (typeof roh.geaendertAm === "number" && isFinite(roh.geaendertAm)) {
            tafel.geaendertAm = roh.geaendertAm;
        }

        /* Der Umstieg: ein Stand aus der Zeit der einzelnen Partie. */
        if (!roh.partien && SCHACH_TAFEL._istEinzelnePartie(roh)) {
            const einzelne = SCHACH_RUNDE.normalisieren(roh);
            einzelne.id = SCHACH_TAFEL.ERSTE_ID;
            einzelne.titel = einzelne.titel || "Erste Partie";
            tafel.partien[SCHACH_TAFEL.ERSTE_ID] = einzelne;
            return tafel;
        }

        if (roh.partien && typeof roh.partien === "object") {
            for (const id of Object.keys(roh.partien)) {
                const partie = SCHACH_RUNDE.normalisieren(roh.partien[id]);
                partie.id = id;
                if (!partie.titel) {
                    partie.titel = "Partie";
                }
                tafel.partien[id] = partie;
            }
        }

        if (Array.isArray(roh.chronik)) {
            tafel.chronik = roh.chronik
                .filter((eintrag) => eintrag && typeof eintrag.id === "string"
                    && ["weiss", "schwarz", "remis"].indexOf(eintrag.ergebnis) !== -1)
                .map((eintrag) => ({
                    id: eintrag.id,
                    titel: (typeof eintrag.titel === "string") ? eintrag.titel : "Partie",
                    variante: SCHACH_VARIANTEN.gibtEs(eintrag.variante)
                        ? eintrag.variante : SCHACH_VARIANTEN.STANDARD,
                    ergebnis: eintrag.ergebnis,
                    beendetAm: (typeof eintrag.beendetAm === "number") ? eintrag.beendetAm : 0,

                    /* Seit v3.3, fürs Spielerprofil. Einträge von vorher haben
                       beides nicht — dann 0, und das Profil lässt die Angabe
                       weg, statt eine erfundene Zahl zu zeigen. */
                    begonnenAm: (typeof eintrag.begonnenAm === "number")
                        ? eintrag.begonnenAm : 0,
                    zuege: (typeof eintrag.zuege === "number" && eintrag.zuege >= 0)
                        ? eintrag.zuege : 0,

                    teams: {
                        weiss: SCHACH_TAFEL._kennungen(eintrag.teams, "weiss"),
                        schwarz: SCHACH_TAFEL._kennungen(eintrag.teams, "schwarz")
                    },
                    /* Einträge von vor v3.1 haben keine Beute — dann null. */
                    beute: {
                        weiss: SCHACH_TAFEL._zahl(eintrag.beute, "weiss"),
                        schwarz: SCHACH_TAFEL._zahl(eintrag.beute, "schwarz")
                    }
                }))
                .filter((eintrag, stelle, alle) =>
                    alle.findIndex((anderer) => anderer.id === eintrag.id) === stelle);
        }

        /*
         * Nachrüstung: Partien, die schon beendet sind, aber noch keinen
         * Chronik-Eintrag haben. So kommen die Ergebnisse aus der Zeit vor v2.4
         * in die Chronik, ohne dass jemand etwas tun muss.
         */
        for (const id of Object.keys(tafel.partien)) {
            const partie = tafel.partien[id];
            if (partie.ergebnis && !tafel.chronik.some((eintrag) => eintrag.id === id)) {
                tafel.chronik.push(SCHACH_TAFEL._chronikEintrag(partie));
            }
        }

        return tafel;
    },

    _zahl(quelle, feld) {
        const wert = quelle ? quelle[feld] : 0;
        return (typeof wert === "number" && isFinite(wert) && wert > 0) ? wert : 0;
    },

    _kennungen(teams, farbe) {
        const liste = (teams && Array.isArray(teams[farbe])) ? teams[farbe] : [];
        return liste
            .filter((id) => typeof id === "string" && id !== "")
            .filter((id, stelle, alle) => alle.indexOf(id) === stelle);
    },

    /* Was von einer beendeten Partie dauerhaft festgehalten wird. */
    _chronikEintrag(partie) {
        return {
            id: partie.id,
            titel: partie.titel || "Partie",
            variante: partie.variante,
            ergebnis: partie.ergebnis,
            beendetAm: partie.geaendertAm || 0,

            /*
             * Wann es losging und wie viele Halbzüge es wurden — Grundlage der
             * Spieldauer im Profil. Ohne `gestartetAm` (Partien von vor v3.3)
             * tritt der Zeitpunkt des Anlegens ein; das ist grosszügiger, aber
             * die einzige Zahl, die es dann gibt.
             */
            begonnenAm: partie.gestartetAm || partie.erstelltAm || 0,
            zuege: partie.zugZaehler || 0,

            teams: {
                weiss: partie.teams.weiss.slice(),
                schwarz: partie.teams.schwarz.slice()
            },
            /* Der Figurenwert der Beute je Seite — daraus rechnet die
               Rangliste ihre Teilpunkte. Er wird HIER festgehalten, weil das
               Brett nach dem Löschen der Partie nicht mehr da ist. */
            beute: {
                weiss: SCHACH_RUNDE.beuteWert(partie, "weiss"),
                schwarz: SCHACH_RUNDE.beuteWert(partie, "schwarz")
            }
        };
    },

    /*
     * Sieht der Stand aus wie eine einzelne Partie von früher?
     * Geprüft wird auf die Felder, die es nur dort gibt — `datenVersion` allein
     * genügt nicht, weil die Zahl 1 auch in einer leeren Ablage stehen könnte.
     */
    _istEinzelnePartie(roh) {
        return !!(roh.stand || roh.teams || roh.verlauf
            || typeof roh.zugZaehler === "number");
    },

    kopieren(tafel) {
        return SCHACH_TAFEL.normalisieren(tafel);
    },

    /* Eine einzelne Partie, oder null. */
    partie(tafel, id) {
        const stand = SCHACH_TAFEL.normalisieren(tafel);
        return stand.partien[id] || null;
    },

    /* Wie viele Partien gibt es? */
    anzahl(tafel) {
        return Object.keys(SCHACH_TAFEL.normalisieren(tafel).partien).length;
    },

    /*
     * Die eigenen LAUFENDEN Partien (Bündel A, Schritt 4): Die Partie läuft,
     * hat kein Ergebnis, und die Person steht in einem Team. Grundlage des
     * Wiedereinstiegs nach der Anmeldung und der Sperre gegen eine zweite
     * Partie (Entwurf, F9 und F11). Dank der Sortierung von `liste` steht
     * die zuletzt geänderte vorn.
     */
    eigeneLaufende(tafel, spielerId) {
        return SCHACH_TAFEL.liste(tafel).filter((partie) =>
            partie.laeuft === true
            && !partie.ergebnis
            && !!SCHACH_RUNDE.teamVon(partie, spielerId));
    },

    /*
     * Alle Partien als Liste, sortiert für die Übersicht:
     * erst die laufenden, dann die noch nicht gestarteten, zuletzt die
     * beendeten — innerhalb jeder Gruppe die zuletzt geänderte zuerst.
     */
    liste(tafel) {
        const stand = SCHACH_TAFEL.normalisieren(tafel);

        const rang = (partie) => {
            if (partie.ergebnis) {
                return 2;
            }
            return partie.laeuft ? 0 : 1;
        };

        return Object.keys(stand.partien)
            .map((id) => stand.partien[id])
            .sort((a, b) => {
                if (rang(a) !== rang(b)) {
                    return rang(a) - rang(b);
                }
                if (b.geaendertAm !== a.geaendertAm) {
                    return b.geaendertAm - a.geaendertAm;
                }
                return a.id < b.id ? -1 : 1;
            });
    },

    /*
     * Setzt EINE Partie in die Tafel. Alles andere bleibt unangetastet.
     *
     * Das ist beim Schach dieselbe Regel wie im Würfel-Quizz bei
     * SPIELER.zusammenfuehren: Wer schreibt, ändert nur seinen Teil. Sonst
     * löscht ein Gerät mit einer veralteten Tafel die Partien weg, die
     * inzwischen woanders angelegt oder gezogen wurden.
     */
    partieEinsetzen(tafel, partie, zeitpunkt) {
        const neu = SCHACH_TAFEL.kopieren(tafel);

        if (!partie || !partie.id) {
            return neu;
        }

        const eingesetzt = SCHACH_RUNDE.normalisieren(partie);
        neu.partien[partie.id] = eingesetzt;

        /*
         * Steht ein Ergebnis fest und fehlt der Chronik-Eintrag, wird er JETZT
         * geschrieben — an der einzigen Stelle, durch die jede Änderung läuft.
         * Danach überlebt das Ergebnis auch das Löschen der Partie.
         */
        if (eingesetzt.ergebnis
            && !neu.chronik.some((eintrag) => eintrag.id === eingesetzt.id)) {
            neu.chronik.push(SCHACH_TAFEL._chronikEintrag(eingesetzt));
        }

        neu.geaendertAm = (zeitpunkt === undefined) ? Date.now() : zeitpunkt;
        return neu;
    },

    /*
     * Entfernt eine Partie vom Brett. Ihr Chronik-Eintrag BLEIBT — die Punkte
     * in der Rangliste sind damit endgültig und können nicht mehr verschwinden.
     */
    partieEntfernen(tafel, id, zeitpunkt) {
        const neu = SCHACH_TAFEL.kopieren(tafel);
        delete neu.partien[id];
        neu.geaendertAm = (zeitpunkt === undefined) ? Date.now() : zeitpunkt;
        return neu;
    },

    /*
     * Legt eine Partie an und liefert { tafel, partie }.
     *
     * Die Kennung enthält den Zeitpunkt, damit zwei Geräte, die im selben
     * Moment eine Partie anlegen, nicht dieselbe erwischen. Ganz ausschliessen
     * lässt sich das ohne Server nicht — deshalb wird bei einer Kollision
     * hochgezählt.
     */
    partieAnlegen(tafel, varianteId, titel, zeitpunkt, regeln) {
        const neu = SCHACH_TAFEL.kopieren(tafel);
        const wann = (zeitpunkt === undefined) ? Date.now() : zeitpunkt;

        let id = "p-" + wann.toString(36);
        let nummer = 1;
        while (neu.partien[id]) {
            nummer++;
            id = "p-" + wann.toString(36) + "-" + nummer;
        }

        const partie = SCHACH_RUNDE.leereRunde(
            wann,
            varianteId,
            id,
            String(titel || "").trim().substring(0, 40) || "Neue Partie"
        );

        /* Die Einstellungen aus der Auswahl. Ohne Angabe bleibt alles bei den
           Vorgaben der Spielart. */
        if (regeln && typeof regeln === "object") {
            if (regeln.faehigkeiten === true || regeln.faehigkeiten === false) {
                partie.regeln.faehigkeiten = regeln.faehigkeiten;
            }
            partie.regeln.seltenheitZeigen = (regeln.seltenheitZeigen !== false);
            partie.regeln.pechZeigen = (regeln.pechZeigen === true);
            /*
             * DIE LOOTBOX-MENGE (seit v0.71) UND DIE ZWEI ALTEN SCHALTER.
             *
             * Die Stufe ist, was zählt; `regen` und `regenStufe` werden
             * daneben mitgeschrieben, damit ein Gerät mit einer älteren
             * Fassung im Zwischenspeicher nicht nach ganz anderen Zahlen
             * spielt. Bis v0.70 fiel `regenStufe` hier durch — der
             * Schieberegler von v0.60 erreichte die Partie nie.
             *
             * Nennt der Aufrufer keine Stufe, wird sie wie in
             * `SCHACH_RUNDE.normalisieren` aus den zwei alten Schaltern
             * abgeleitet — so legt auch alter Aufruf-Code an, was er meint.
             */
            const gewaehlt = SCHACH_VARIANTEN.LOOTBOX_MENGEN.some(
                (eintrag) => eintrag.id === regeln.lootboxMenge)
                ? regeln.lootboxMenge
                : SCHACH_VARIANTEN.mengeAusAltem(regeln.regen === true, regeln.regenStufe);

            const menge = SCHACH_VARIANTEN.mengeVon(gewaehlt);

            partie.regeln.lootboxMenge = menge.id;
            partie.regeln.regen = (menge.id !== "wenig");
            partie.regeln.regenStufe = menge.stufe
                || SCHACH_VARIANTEN.REGEN.STUFE_VORGABE;

            partie.regeln.zufallsArmee = (regeln.zufallsArmee === true);
            partie.regeln.armeeUnterschiedlich = (regeln.armeeUnterschiedlich === true);

            /*
             * DIESE ZWEI FEHLTEN — v0.86 und v0.87 waren dadurch WIRKUNGSLOS
             * (gefunden beim Nachmessen der Meldung #36, behoben v0.91).
             *
             * Diese Funktion kopiert jede Einstellung EINZELN aus dem
             * übergebenen Objekt. Wer eine neue hinzufügt und diese Zeile
             * vergisst, baut eine Einstellung, die sich bedienen lässt und
             * nichts tut. Besonders heimtückisch war es hier, weil die
             * Kachel-Vorschau richtig aussah: Sie liest `TEAM_SCHACH.neueRegeln`
             * direkt, nicht die angelegte Partie — das Bild stimmte also,
             * das Spiel nicht.
             *
             * Ein Test in `test-schach-tafel.js` vergleicht seit v0.91 die
             * übergebenen Regeln mit denen der angelegten Partie, damit die
             * nächste Einstellung nicht wieder hier hängen bleibt.
             */
            partie.regeln.armeeStaerke =
                SCHACH_VARIANTEN.armeeStaerkeVon(regeln.armeeStaerke).id;
            partie.regeln.itemVorrat =
                SCHACH_VARIANTEN.itemVorratVon(regeln.itemVorrat).id;

            /* Die selbst angehakte Liste (seit v0.100). Ohne diese Zeile
               liesse sich die Auswahl bedienen und täte nichts — genau der
               Fehler von v0.86/v0.87, den der Test unten seit v0.91 abfängt. */
            partie.regeln.itemAuswahl = Array.isArray(regeln.itemAuswahl)
                ? regeln.itemAuswahl.slice() : [];

            partie.regeln.einigkeit = (regeln.einigkeit === true);
        }

        /*
         * RECHNET DIESE PARTIE NACH DER NEUEN REGEL? (seit v0.100.)
         *
         * Die Fassung wird genau dann gesetzt, wenn der Aufrufer eine Stärke
         * WIRKLICH GENANNT hat. Das ist der Unterschied, auf den es ankommt:
         * `armeeStaerkeVon` liefert für alles Unbekannte „normal" — wer die
         * Einstellung gar nicht kennt, bekäme damit stillschweigend die halbe
         * Aufstellung. Der Anlege-Bildschirm nennt sie immer; Aufrufer von
         * früher tun es nicht, und für die bleibt alles beim Alten.
         *
         * Der Eintrag steht ausserhalb des `regeln`-Blocks oben, weil er keine
         * Einstellung ist, sondern die Fassung.
         */
        const genannt = SCHACH_VARIANTEN.ARMEE_STAERKEN.some(
            (stufe) => stufe.id === (regeln ? regeln.armeeStaerke : ""));

        partie.regeln.armeeFassung = genannt ? 1 : 0;

        /*
         * ERST JETZT steht der Haken fest, deshalb wird die Zufallsarmee hier
         * aufgestellt (seit v0.51). `leereRunde` konnte es nur für die alte
         * SPIELART tun — die Regeln kommen von aussen und sind dort noch nicht
         * gesetzt. Ohne Haken ändert der Aufruf nichts.
         */
        SCHACH_RUNDE.kreuzAufstellen(partie);
        SCHACH_RUNDE.armeeAufstellen(partie);

        /* Ohne Haken bleibt die feste Aufstellung stehen - der Regler
           schneidet sie auf seine Breite zu (seit v0.100). */
        SCHACH_RUNDE.aufstellungAnpassen(partie);

        /* Welche Items es in dieser Partie gibt — einmalig, gerechnet aus der
           Partie-Kennung (seit v0.87). */
        SCHACH_RUNDE.itemVorratAuslosen(partie);

        neu.partien[id] = partie;
        neu.geaendertAm = wann;

        return { tafel: neu, partie: partie };
    },

    /* ---------------------------------------------------------------- *
     * Vergleich (steuert das Neuzeichnen)
     * ---------------------------------------------------------------- */

    inhaltGleich(a, b) {
        const einsA = SCHACH_TAFEL.normalisieren(a);
        const einsB = SCHACH_TAFEL.normalisieren(b);

        const idsA = Object.keys(einsA.partien).sort();
        const idsB = Object.keys(einsB.partien).sort();

        if (idsA.join(",") !== idsB.join(",")) {
            return false;
        }

        for (const id of idsA) {
            if (!SCHACH_RUNDE.inhaltGleich(einsA.partien[id], einsB.partien[id])) {
                return false;
            }
        }

        return true;
    }
};

/* Für die Tests ausserhalb des Browsers. SCHACH, SCHACH_VARIANTEN und
   SCHACH_RUNDE müssen dort vorher als globale Größen bereitstehen. */
if (typeof module !== "undefined" && module.exports) {
    module.exports = SCHACH_TAFEL;
}
