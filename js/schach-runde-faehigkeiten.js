/*
 * schach-runde-faehigkeiten.js — Fähigkeiten, Lootboxen und der Händler
 * einer Partie.
 *
 * Teil des Bausteins SCHACH_RUNDE; der Kern (anlegen, normalisieren, Teams,
 * ziehen, Abstimmung) steht in schach-runde.js. Diese Datei ERGÄNZT dasselbe
 * Objekt (Object.assign, wie die team-schach-Teildateien) und muss ÜBERALL
 * NACH schach-runde.js geladen werden — in index.html wie in den Tests.
 *
 * Hier drin: Bilanz und Beute, Bonusfelder samt Nachziehen, der Einsatz der
 * Fähigkeiten mit Zielfeldern und Wirkungen, die Unglücke und der Händler.
 *
 * Aufgeteilt am 27.08.2026 (v0.92.0) — reiner Umzug aus schach-runde.js,
 * kein Verhalten geändert.
 */

Object.assign(SCHACH_RUNDE, {

    /* ---------------------------------------------------------------- *
     * Bonusfelder und Fähigkeiten
     * ---------------------------------------------------------------- */

    /*
     * Was eine Figurenart wert ist — für die Bilanz unter dem Brett.
     * Die üblichen Schachwerte; der König zählt nicht mit, er kann nicht
     * verloren gehen (ausser auf dem Doppelbrett, wo die Partie dann ohnehin
     * vorbei ist).
     */
    FIGUR_WERT: { B: 1, S: 3, L: 3, T: 5, D: 9, K: 0 },

    /*
     * Bilanz einer Seite: was sie erbeutet hat, was sie verloren hat, und die
     * Differenz nach Figurenwert.
     */
    bilanz(runde, farbe) {
        const stand = SCHACH_RUNDE.normalisieren(runde);
        const gegner = SCHACH.gegner(farbe);

        /* Was der Gegner verloren hat, hat diese Seite geschlagen. */
        const geschlagen = stand.verloren[gegner] || [];
        const verloren = stand.verloren[farbe] || [];

        const wert = (liste) => liste.reduce(
            (summe, art) => summe + (SCHACH_RUNDE.FIGUR_WERT[art] || 0), 0);

        return {
            geschlagen: geschlagen.slice(),
            verloren: verloren.slice(),
            punkte: wert(geschlagen) - wert(verloren)
        };
    },

    /*
     * WAS EINE SEITE GERADE AUF DEM BRETT STEHEN HAT, nach Figurenwert
     * (seit v0.76).
     *
     * Gemeldet als „der Figurenzähler plus/minus ist nicht richtig, bitte von
     * bekannten Schach-Apps abschauen". Genau das ist der Unterschied: Die
     * bekannten Apps zählen die Figuren, die DA SIND, nicht die geschlagenen.
     *
     * Bis v0.75 rechnete der Zähler unter dem Brett `bilanz.punkte` — Beute
     * minus eigene Verluste. In gewöhnlichem Schach ist das dasselbe; hier
     * nicht, denn hier entsteht und verschwindet Material, ohne dass jemand
     * schlägt:
     *
     *     Umwandlung        aus einem Bauern wird eine Dame (+8)
     *     Verstärkung       eine Aufwertungskette bis zum König
     *     Wiedergeburt,     eine gefallene Figur kommt zurück
     *     Wiederbelebung,
     *     Friedhof
     *     Nachschub         ein Bauer aus dem Nichts
     *     Spiegel, Handel   Material wechselt die Seite oder die Art
     *     Einsturz          eine ganze Brettseite bricht weg
     *
     * Nach jedem dieser Vorgänge stimmte die Zahl unter dem Brett nicht mehr
     * mit dem überein, was man sah. Aus der STELLUNG gerechnet stimmt sie
     * immer — und zwar ohne dass irgendeine Fähigkeit etwas nachtragen muss.
     *
     * Der König zählt mit 0 (`FIGUR_WERT`), wie in jeder Schach-App: Ein
     * zweiter König ist ein Leben, kein Materialvorteil.
     */
    materialWert(runde, farbe) {
        const stand = SCHACH_RUNDE.normalisieren(runde).stand;
        let summe = 0;

        for (let feld = 0; feld < SCHACH.felderVon(stand); feld++) {
            const figur = SCHACH.figurAuf(stand, feld);

            if (figur !== "." && SCHACH.farbeVon(figur) === farbe) {
                summe += (SCHACH_RUNDE.FIGUR_WERT[SCHACH.artVon(figur)] || 0);
            }
        }

        return summe;
    },

    /* Um wie viel Figurenwert diese Seite gerade vorn liegt. Negativ heisst
       hinten — der Bildschirm zeigt wie in den bekannten Apps nur die
       führende Seite an. */
    materialVorsprung(runde, farbe) {
        const stand = SCHACH_RUNDE.normalisieren(runde);

        return SCHACH_RUNDE.materialWert(stand, farbe)
            - SCHACH_RUNDE.materialWert(stand, SCHACH.gegner(farbe));
    },

    /* Wie viele Wendepunkte die Rückschau höchstens zeigt (seit v0.61). */
    RUECKSCHAU_HOECHSTENS: 6,

    /*
     * DIE RÜCKSCHAU (seit v0.61, Wunsch #7: „Recap einbauen vor dem Gewinnen
     * oder Verlieren, dass man sieht, warum man verloren hat").
     *
     * Sie beantwortet drei Fragen, und zwar HIER im Modell — der Bildschirm
     * zeigt nur an. Wer entscheidet, was ein Wendepunkt war, entscheidet über
     * die Erzählung der Partie, und das ist eine Regel wie jede andere.
     *
     *   1. WIE ging es aus? Nicht aus einem gemerkten Vermerk, sondern aus der
     *      Schlussstellung: `SCHACH.lage` sagt Matt oder Patt. Sagt sie nichts
     *      davon, obwohl ein Ergebnis feststeht, hat jemand aufgegeben.
     *   2. WAS hat es gekostet? Der Figurenwert dessen, was jede Seite verloren
     *      hat — dieselbe Rechnung wie bei der Beute (`FIGUR_WERT`).
     *   3. WAS gab den Ausschlag? Die Einträge des Verlaufs, die etwas
     *      Aussergewöhnliches waren: eingesetzte Fähigkeiten und
     *      Unglückswürfel. Gewöhnliche Züge stehen nicht darin — sie sind der
     *      Verlauf, nicht die Wendung.
     *
     * Warum nur die LETZTEN paar: Der Verlauf ist ohnehin gekürzt
     * (`VERLAUF_LAENGE`), und was am Ende passierte, hat die Partie
     * entschieden. Ausgegeben wird trotzdem in der Reihenfolge, in der es
     * geschah — eine Rückschau, die rückwärts erzählt, versteht niemand.
     */
    rueckschau(runde, farbe) {
        const stand = SCHACH_RUNDE.normalisieren(runde);
        const lage = SCHACH.lage(stand.stand);

        const ausgang = (!stand.ergebnis)
            ? "offen"
            : ((stand.ergebnis === "remis")
                ? "remis"
                : ((stand.ergebnis === farbe) ? "sieg" : "niederlage"));

        let ende = "Die Partie läuft noch.";
        if (lage.art === "matt") {
            ende = "Schachmatt — der König konnte dem Angriff nicht mehr entkommen.";
        } else if (lage.art === "patt") {
            ende = "Patt — die Seite am Zug hatte keinen einzigen erlaubten Zug mehr.";
        } else if (lage.art === "remis") {
            ende = lage.text || "Unentschieden.";
        } else if (stand.ergebnis) {
            ende = "Aufgegeben — die Partie wurde vorzeitig beendet.";
        }

        const wendepunkte = stand.verlauf
            .filter((eintrag) => eintrag.wirkung && eintrag.wirkung !== "eingesammelt")
            .slice(-SCHACH_RUNDE.RUECKSCHAU_HOECHSTENS)
            .map((eintrag) => ({
                farbe: eintrag.farbe,
                eigen: (eintrag.farbe === farbe),
                unglueck: (eintrag.wirkung === "pech"),
                text: eintrag.text
            }));

        return {
            ausgang: ausgang,
            ende: ende,
            verloren: {
                eigen: (stand.verloren[farbe] || []).slice(),
                gegner: (stand.verloren[SCHACH.gegner(farbe)] || []).slice()
            },
            wert: {
                /* Was die eigene Seite an Material eingebüsst hat — und was
                   der Gegner. `beuteWert` zählt aus der Sicht dessen, der
                   geschlagen HAT, deshalb hier über Kreuz. */
                eigen: SCHACH_RUNDE.beuteWert(stand, SCHACH.gegner(farbe)),
                gegner: SCHACH_RUNDE.beuteWert(stand, farbe)
            },

            /*
             * WAS AM ENDE NOCH STAND (seit v0.76).
             *
             * `wert` sagt, was die Partie GEKOSTET hat; das ist die Antwort auf
             * „warum habe ich verloren". Wer besser dastand, ist eine andere
             * Frage — und sie lässt sich nur aus der Stellung beantworten, weil
             * Fähigkeiten Material erschaffen und zurückholen (siehe
             * `materialWert`). Bis v0.75 wurde der Satz „beim Material lagt ihr
             * vorn/hinten" aus den Verlusten gerechnet und stimmte deshalb in
             * jeder Partie mit Wiedergeburt oder Umwandlung nicht.
             */
            stellung: {
                eigen: SCHACH_RUNDE.materialWert(stand, farbe),
                gegner: SCHACH_RUNDE.materialWert(stand, SCHACH.gegner(farbe))
            },
            wendepunkte: wendepunkte
        };
    },

    /*
     * DIE GEMESSENE SPIELZEIT EINER PARTIE (seit v0.93, Wunsch W10).
     *
     * `partie.spielzeit` sind die Sekunden, die insgesamt an dieser Partie
     * gespielt wurde — aufaddiert von allen Geräten, die sie offen hatten.
     * Sie dient EINEM Zweck: der Dauer-Schätzung unter den Spielart-Kacheln.
     * Angezeigt wird sie nirgends.
     */
    spielzeitErgaenzen(runde, sekunden) {
        if (!Number.isFinite(sekunden) || sekunden <= 0) {
            return runde;
        }

        const neu = SCHACH_RUNDE.kopieren(runde);
        neu.spielzeit = (neu.spielzeit || 0) + Math.floor(sekunden);
        return neu;
    },

    /*
     * WIE LANGE DAUERT EINE RUNDE MIT DIESEN EINSTELLUNGEN? (seit v0.93)
     *
     * Gerechnet aus zwei Teilen:
     *
     *   1. WIE VIELE HALBZÜGE zu erwarten sind — das hängt am Material und an
     *      der Brettgrösse: Mehr Figuren und mehr Platz heissen mehr Züge, bis
     *      eine Seite matt ist. Diese Zahl wird geschätzt, nicht gemessen.
     *   2. WIE LANGE EIN HALBZUG DAUERT — das wird GEMESSEN, aus echten
     *      Partien (`sekundenJeHalbzug`). Genau dafür läuft die stille
     *      Zeitmessung.
     *
     * Warum diese Zweiteilung: Die Zahl der Züge folgt den Regeln und ist
     * rechenbar; wie schnell Menschen ziehen, ist es nicht. Nur der zweite
     * Teil braucht Beobachtung — und er ist auch der, der sich zwischen
     * Runden am stärksten unterscheidet.
     *
     * Das Ergebnis ist ausdrücklich ein GROBER Indikator und nie als Zusage
     * formuliert.
     */
    SEKUNDEN_JE_HALBZUG_VORGABE: 20,

    /*
     * WIE SCHNELL DIE MESSUNG DIE VORGABE ABLÖST (seit v0.100).
     *
     * Die Zahl ist der „Anlauf" in der Mischung `gezaehlt / (gezaehlt + ANLAUF)`
     * — siehe `sekundenJeHalbzug`. Bei 3 zählt die erste gemessene Partie ein
     * Viertel, die dritte die Hälfte, die zwölfte vier Fünftel.
     *
     * WARUM MISCHEN STATT SCHWELLE: Bis v0.99 stand hier `MESSUNG_AB_PARTIEN: 5`
     * — vier Partien zählten gar nicht, die fünfte alles. Eine Schätzung, die
     * an einer festen Zahl springt, wirkt kaputt; eine, die sich mit jeder
     * Partie ein Stück bewegt, wirkt lernend. Sie IST auch lernend.
     */
    MESSUNG_ANLAUF: 3,

    sekundenJeHalbzug(partien) {
        const liste = Array.isArray(partien) ? partien : [];

        let sekunden = 0;
        let halbzuege = 0;
        let gezaehlt = 0;

        for (const partie of liste) {
            const zeit = partie && partie.spielzeit;
            const takt = partie && partie.stand && partie.stand.takt;

            /* Nur Partien, die wirklich gespielt wurden: Ohne Züge oder ohne
               gemessene Zeit sagt ein Eintrag nichts. */
            if (!Number.isFinite(zeit) || zeit <= 0
                || !Number.isFinite(takt) || takt < 5) {
                continue;
            }

            sekunden += zeit;
            halbzuege += takt;
            gezaehlt++;
        }

        if (gezaehlt <= 0 || halbzuege <= 0) {
            return SCHACH_RUNDE.SEKUNDEN_JE_HALBZUG_VORGABE;
        }

        /*
         * SEIT v0.100 GIBT ES KEINE SCHWELLE MEHR, SONDERN EIN GEWICHT
         * (Nutzer-Ansage: „die geschätzte Zeit soll sich immer besser anhand
         * gespielter Runden anpassen").
         *
         * Bis v0.99 galt: unter fünf gemessenen Partien die Vorgabe, ab der
         * fünften ausschliesslich die Messung. Das ist an beiden Enden falsch —
         * die vierte Partie sagte gar nichts, die fünfte plötzlich alles, und
         * die Zahl sprang.
         *
         * Jetzt mischen sich beide, und die Messung bekommt mit jeder Partie
         * mehr Gewicht: `gezaehlt / (gezaehlt + ANLAUF)`. Bei einer gemessenen
         * Partie zählt sie ein Viertel, bei drei die Hälfte, bei zwölf vier
         * Fünftel — sie nähert sich der reinen Messung, ohne sie je ganz zu
         * erreichen. Genau das ist gemeint mit „immer besser": Die Schätzung
         * bewegt sich ab der ERSTEN gemessenen Partie und wird ruhiger, je
         * mehr dazukommen.
         */
        const gemessen = sekunden / halbzuege;
        const gewicht = gezaehlt / (gezaehlt + SCHACH_RUNDE.MESSUNG_ANLAUF);

        return SCHACH_RUNDE.SEKUNDEN_JE_HALBZUG_VORGABE * (1 - gewicht)
            + gemessen * gewicht;
    },

    /*
     * Die erwartete Zahl der Halbzüge für ein Brett mit dieser Besetzung.
     *
     * Die Formel ist eine Faustregel, keine Wissenschaft: Jede Figur, die
     * geschlagen werden muss, kostet Züge, und auf einem grösseren Brett
     * laufen die Figuren länger, bis sie sich treffen. Beides steckt drin,
     * beides linear — mehr Genauigkeit würde eine Schätzung vortäuschen, die
     * es nicht gibt.
     */
    erwarteteHalbzuege(figurenJeSeite, felder) {
        const figuren = Math.max(2, figurenJeSeite || 2);
        const flaeche = Math.max(16, felder || 64);

        return Math.round(figuren * 3.5 + flaeche / 8);
    },

    /*
     * Die Schätzung in SEKUNDEN. `partien` sind die bereits gespielten
     * Partien der Tafel, aus denen die Messung kommt.
     */
    dauerSchaetzung(figurenJeSeite, felder, regeln, partien) {
        const halbzuege = SCHACH_RUNDE.erwarteteHalbzuege(figurenJeSeite, felder);
        let sekunden = halbzuege * SCHACH_RUNDE.sekundenJeHalbzug(partien);

        /*
         * Fähigkeiten verlängern eine Partie spürbar: Es gibt mehr zu
         * überlegen, Figuren kommen zurück, und Mauern halten auf. Der
         * Zuschlag steigt mit der Lootbox-Menge — ohne Fähigkeiten gibt es
         * ihn gar nicht.
         */
        if (regeln && regeln.faehigkeiten) {
            const menge = SCHACH_VARIANTEN.mengeVon(regeln.lootboxMenge);
            sekunden *= (1.2 + 0.1 * (menge.stufe || 0));
        }

        return Math.round(sekunden);
    },

    /*
     * Derselbe Wert als Satz, wie er unter der Kachel steht. Gerundet auf
     * fünf Minuten und mit „etwa" davor — es ist ein Anhaltspunkt.
     */
    dauerText(figurenJeSeite, felder, regeln, partien) {
        const minuten = SCHACH_RUNDE.dauerSchaetzung(
            figurenJeSeite, felder, regeln, partien) / 60;

        /*
         * DREI STUFEN DER GENAUIGKEIT (seit v0.100, Nutzer-Ansage: die Zahl
         * soll sich „bei jeder kleinen Änderung oben an den Auswahlfeldern"
         * verändern).
         *
         * Bis v0.99 wurde IMMER auf fünf Minuten gerundet, und alles unter
         * acht Minuten hiess pauschal „etwa 5 Minuten". Damit verschluckte die
         * Anzeige genau das, was der Nutzer sehen will: Ein Knopfdruck, der
         * vier Figuren mehr aufs Brett stellt, bewegte die Zahl oft gar nicht.
         *
         * Kurze Partien werden deshalb auf die MINUTE gerundet — dort fällt
         * jede Änderung ins Gewicht. Erst ab einer halben Stunde wird gröber
         * gerundet, denn dort ist die Minute ohnehin nicht mehr zu halten.
         */
        if (minuten < 30) {
            const knapp = Math.max(1, Math.round(minuten));
            return "etwa " + knapp + ((knapp === 1) ? " Minute" : " Minuten");
        }

        const gerundet = Math.round(minuten / 5) * 5;

        if (gerundet >= 60) {
            const stunden = Math.round(gerundet / 30) / 2;

            /* GENAU EINE STUNDE HEISST „Stunde" (seit v0.94). Bis v0.93 stand
               dort „etwa 1 Stunden" — der Fall trat bei jeder gut gefüllten
               Partie auf (klassisches Brett, 31 Figuren, viele Lootboxen). */
            if (stunden === 1) {
                return "etwa 1 Stunde";
            }
            return "etwa " + String(stunden).replace(".", ",") + " Stunden";
        }

        return "etwa " + gerundet + " Minuten";
    },

    /* Der Figurenwert dessen, was eine Seite geschlagen hat. */
    beuteWert(runde, farbe) {
        const stand = SCHACH_RUNDE.normalisieren(runde);
        const geschlagen = stand.verloren[SCHACH.gegner(farbe)] || [];

        return geschlagen.reduce(
            (summe, art) => summe + (SCHACH_RUNDE.FIGUR_WERT[art] || 0), 0);
    },

    /* Welche Würfel liegen gerade auf dem Brett? */
    offeneBonusFelder(runde) {
        return SCHACH_RUNDE.normalisieren(runde).bonus;
    },

    /*
     * Ein Zufallswert zwischen 0 und 1, GERECHNET statt gewürfelt.
     *
     * Das ist die wichtigste Festlegung an den Fähigkeiten: Alle Geräte sehen
     * denselben Stand und müssen deshalb dieselben Würfel sehen. Mit
     * `Math.random()` bekäme jedes Gerät ein anderes Brett, und der erste
     * Schreibvorgang gewönne — dieselbe Falle wie beim gegenseitigen
     * Überschreiben in v0.8. Aus Partie-Kennung und Zugzähler rechnet dagegen
     * jeder dasselbe aus, ohne sich abzustimmen, und die Tests bleiben
     * aussagekräftig, weil das Ergebnis vorhersagbar ist.
     *
     * Verfahren: FNV-1a, eine gängige einfache Streufunktion.
     *
     * ------------------------------------------------------------------
     * WAS SICH UNTERSCHEIDET, GEHÖRT AN DEN ANFANG DER SAAT (seit v0.49.1).
     *
     * FNV-1a verodert jedes Zeichen und multipliziert dann mit einer Primzahl.
     * Ein Unterschied im LETZTEN Zeichen erlebt danach genau eine
     * Multiplikation — er verschiebt das Ergebnis um rund 0,4 Prozent und
     * sonst nichts. Zwei Saaten, die sich nur am Ende unterscheiden, liefern
     * damit praktisch DENSELBEN Wert.
     *
     * Wer also über etwas zählt (Feldnummer, laufende Nummer), schreibt die
     * Zahl nach VORNE: `feld + "|glas|" + id`, nicht `id + "|glas|" + feld`.
     * Dann laufen alle übrigen Zeichen als Mischschritte hinterher.
     *
     * Zweimal ist genau das schiefgegangen, beide gefunden am 2026-08-08:
     * Unter dem vollen Glas trugen die Felder 0 bis 9 dasselbe Trugbild, und
     * die Zufallsarmee stellte siebenmal fast dieselbe Figur auf. Die Funktion
     * hier ist in Ordnung — die Saat war es nicht.
     * ------------------------------------------------------------------
     */
    _zufallsWert(text) {
        let wert = 2166136261;

        for (let stelle = 0; stelle < text.length; stelle++) {
            wert ^= text.charCodeAt(stelle);
            wert = Math.imul(wert, 16777619);
        }

        return (wert >>> 0) / 4294967296;
    },

    /*
     * Lässt bei Bedarf einen neuen Würfel erscheinen. Wird nach jedem Zug
     * gerufen und ändert die übergebene Runde.
     */
    /*
     * Erscheinen in dieser Partie Würfel? Der Schalter der Partie geht vor;
     * ohne Angabe entscheidet die Spielart wie vor v2.5.
     */
    faehigkeitenAn(runde) {
        const stand = SCHACH_RUNDE.normalisieren(runde);

        if (stand.regeln.faehigkeiten === true || stand.regeln.faehigkeiten === false) {
            return stand.regeln.faehigkeiten;
        }
        return !!SCHACH_RUNDE.varianteVon(stand).faehigkeiten;
    },

    /*
     * Regnet es in dieser Partie Glücksboxen? (seit v0.50)
     *
     * Nur mit Würfeln überhaupt — ein Regen ohne Würfel wäre keiner. Deshalb
     * wird hier BEIDES gefragt und nicht nur der eigene Haken; im Bildschirm
     * hängt er sichtbar unter dem Würfel-Haken.
     */
    regenAn(runde) {
        const stand = SCHACH_RUNDE.normalisieren(runde);
        return SCHACH_RUNDE.lootboxMenge(stand) !== "wenig"
            && SCHACH_RUNDE.faehigkeitenAn(stand);
    },

    /* Wie steil der Regen in dieser Partie ansteigt (1 bis 5, seit v0.59). */
    regenStufe(runde) {
        return SCHACH_RUNDE.normalisieren(runde).regeln.regenStufe;
    },

    /*
     * WIE VIELE LOOTBOXEN DIESE PARTIE AUSWIRFT (seit v0.71): eine der vier
     * Stufen aus `SCHACH_VARIANTEN.LOOTBOX_MENGEN`. Sie steht in der Partie und
     * wird für Partien von früher aus `regen`/`regenStufe` abgeleitet (siehe
     * `normalisieren`) — hier ist sie deshalb immer eine gültige Stufe.
     */
    lootboxMenge(runde) {
        return SCHACH_RUNDE.normalisieren(runde).regeln.lootboxMenge;
    },

    /*
     * Wie schwer jede Stufe im Moment wiegt — die Abklingzeit in Zahlen.
     *
     * Gemessen wird im TAKT: Er zählt jeden Halbzug und wird nie
     * zurückgesetzt (`halbzuege` springt bei jedem Bauernzug auf 0, siehe
     * `docs\entscheidungen\entschieden.md`, „Warum `halbzuege` keine Uhr ist").
     * Die Regel selbst steht in SCHACH_VARIANTEN — hier wird nur gemessen.
     */
    _stufenGewichte(runde) {
        const abstaende = {};

        for (const stufe of SCHACH_VARIANTEN.STUFEN) {
            const zuletzt = runde.stufeZuletzt[stufe.id];
            if (Number.isInteger(zuletzt)) {
                abstaende[stufe.id] = Math.max(runde.stand.takt - zuletzt, 0);
            }
        }

        const gewichte = SCHACH_VARIANTEN.stufenGewichte(abstaende);

        /*
         * EINE STUFE OHNE ITEMS BEKOMMT GEWICHT 0 (seit v0.87).
         *
         * Mit begrenztem Vorrat kann eine ganze Seltenheitsstufe leer bleiben —
         * das ist ausdrücklich erlaubt (Nutzer-Entscheidung 18.08.). Ohne diese
         * Zeilen zöge `stufeZiehen` sie trotzdem, und die Lootbox wäre beim
         * Einsammeln leer. Es ist dieselbe Rechnung wie bei den Unglücken seit
         * v0.84: Die Chance verteilt sich auf die übrigen Stufen.
         */
        const erlaubt = SCHACH_RUNDE.erlaubteFaehigkeiten(runde);

        if (erlaubt) {
            for (const stufe of SCHACH_VARIANTEN.STUFEN) {
                if (SCHACH_VARIANTEN.faehigkeitenDerStufe(stufe.id, erlaubt).length === 0) {
                    gewichte[stufe.id] = 0;
                }
            }
        }

        return gewichte;
    },

    /*
     * DER ITEM-VORRAT DIESER PARTIE (seit v0.87, Wunsch R5/V3).
     *
     * Gibt die Liste der Arten zurück, die es in dieser Partie gibt — oder
     * `null` für „alle", und dann filtert nichts.
     *
     * Der Vorrat steht in den REGELN und wird beim Anlegen EINMAL gerechnet
     * (`itemVorratAuslosen`), nicht bei jedem Aufruf: Er gehört zur Partie wie
     * die Spielart, und jedes Gerät muss dieselbe Liste sehen.
     */
    itemVorrat(runde) {
        const regeln = (runde && runde.regeln) ? runde.regeln : {};

        if (!Array.isArray(regeln.itemPool) || regeln.itemPool.length === 0) {
            return null;
        }

        return regeln.itemPool;
    },

    /*
     * PASST DIESE FÄHIGKEIT ZU DEN REGELN DIESER PARTIE? (seit v0.88, R4)
     *
     * Bisher hing die Existenz einer Fähigkeit nur an der Tabelle. Enttarnen
     * ist die erste, die von einer EINSTELLUNG abhängt: Sie gibt es nur, wo
     * die Seltenheit verborgen ist — sonst zeigte sie etwas, das ohnehin zu
     * sehen ist.
     *
     * Absichtlich EINE Funktion mit Schaltern statt einer Sonderabfrage je
     * Fähigkeit: Die zweite dieser Art (Verstecken, das Gegenstück) braucht
     * dann nur noch ihren Schalter, keine neue Mechanik.
     */
    bedingungPasst(art, runde) {
        const eintrag = SCHACH_VARIANTEN.FAEHIGKEITEN[art];
        if (!eintrag) {
            return false;
        }

        const regeln = (runde && runde.regeln) ? runde.regeln : {};
        const seltenheitAn = (regeln.seltenheitZeigen !== false);

        if (eintrag.nurOhneSeltenheit && seltenheitAn) {
            return false;
        }
        if (eintrag.nurMitSeltenheit && !seltenheitAn) {
            return false;
        }

        return true;
    },

    /*
     * WAS ES IN DIESER PARTIE ÜBERHAUPT GIBT (seit v0.88).
     *
     * Führt beides zusammen: den ausgelosten Item-Vorrat (v0.87) und die
     * Bedingungen an den Regeln (v0.88). Das Ergebnis geht als `erlaubt` in
     * `faehigkeitenDerStufe` — und damit in einem Zug in Ziehung,
     * Prozentrechnung und Erklärtext.
     *
     * `null` heisst „keine Einschränkung" und lässt jeden Aufruf von früher
     * unverändert. Das ist der Normalfall, solange nichts eingestellt ist und
     * keine bedingte Fähigkeit betroffen wäre.
     */
    erlaubteFaehigkeiten(runde) {
        const pool = SCHACH_RUNDE.itemVorrat(runde);

        const grundliste = pool || Object.keys(SCHACH_VARIANTEN.FAEHIGKEITEN)
            .filter((art) => !SCHACH_VARIANTEN.FAEHIGKEITEN[art].versteckt);

        const erlaubt = grundliste.filter(
            (art) => SCHACH_RUNDE.bedingungPasst(art, runde));

        /* Nichts ausgeschlossen und kein Vorrat gesetzt: gar nicht filtern. */
        if (!pool && erlaubt.length === grundliste.length) {
            return null;
        }

        return erlaubt;
    },

    /*
     * LOST DEN VORRAT AUS — einmalig beim Anlegen.
     *
     * Gezogen wird MIT DENSELBEN CHANCEN wie im Spiel („es soll zufällig mit
     * denselben Chancen aus dem Fähigkeiten-Pool ausgewählt werden"): erst
     * eine Stufe nach ihrer Chance, dann eine Art daraus. Wer schon drin ist,
     * wird übersprungen.
     *
     * GERECHNET, NICHT GEWÜRFELT (eiserne Regel): Die Saat hängt an der
     * Partie-Kennung, jedes Gerät kommt also auf dieselbe Liste, ohne dass
     * jemand sie schreiben müsste.
     *
     * Der König unter den Sonderfällen ist die Abbruchbedingung: Sind alle
     * verfügbaren Arten gezogen, hört es auf — auch wenn die Wunschzahl
     * grösser ist als das Angebot.
     */
    itemVorratAuslosen(runde) {
        const groesse = SCHACH_VARIANTEN.itemVorratVon(
            runde.regeln ? runde.regeln.itemVorrat : "");

        /*
         * SELBST GEWÄHLT (seit v0.100): Dann wird gar nicht gezogen, sondern
         * übernommen. Gefiltert wird trotzdem — die Wahl ist beim Anlegen
         * getroffen worden, die Bedingungen der Partie gelten aber weiter
         * (Enttarnen gibt es nur ohne, Verstecken nur mit sichtbarer
         * Seltenheit).
         *
         * BLEIBT NICHTS ÜBRIG, GILT WIEDER ALLES. Eine leere Liste heisst im
         * ganzen Projekt „keine Einschränkung" (`itemVorrat`), und das ist hier
         * die richtige Antwort: Eine Partie ganz ohne Items wäre eine Partie
         * ohne Lootboxen, und dafür gibt es den Haken. Der Anlege-Bildschirm
         * lässt die Liste ohnehin nicht leer werden.
         */
        if (groesse.eigeneWahl) {
            const gewaehlt = Array.isArray(runde.regeln.itemAuswahl)
                ? runde.regeln.itemAuswahl : [];

            runde.regeln.itemPool = gewaehlt
                .filter((art) => !!SCHACH_VARIANTEN.FAEHIGKEITEN[art])
                .filter((art) => !SCHACH_VARIANTEN.FAEHIGKEITEN[art].versteckt)
                .filter((art) => SCHACH_RUNDE.bedingungPasst(art, runde))
                .filter((art, stelle, alle) => alle.indexOf(art) === stelle);

            return runde;
        }

        if (!groesse.anzahl) {
            runde.regeln.itemPool = [];
            return runde;
        }

        /*
         * Gezogen wird nur aus dem, was in DIESER Partie überhaupt vorkommen
         * kann (seit v0.88): Eine Fähigkeit mit Bedingung — Enttarnen — darf
         * gar nicht erst in den Vorrat geraten, sonst belegte sie dort einen
         * Platz und käme trotzdem nie.
         */
        const alle = [];
        for (const stufe of SCHACH_VARIANTEN.STUFEN) {
            for (const art of SCHACH_VARIANTEN.faehigkeitenDerStufe(stufe.id)) {
                if (SCHACH_RUNDE.bedingungPasst(art, runde)) {
                    alle.push(art);
                }
            }
        }

        const ziel = Math.min(groesse.anzahl, alle.length);
        const gezogen = [];
        const basis = (runde.id || "partie") + "|vorrat";

        /*
         * Die Obergrenze ist eine Sicherung gegen eine Endlosschleife, nicht
         * Teil der Regel: Je voller die Liste, desto öfter kommt eine schon
         * gezogene Art. Wird sie erreicht, füllen die restlichen Arten der
         * Reihe nach auf — das Ergebnis bleibt vollständig und gerechnet.
         */
        for (let schritt = 0; gezogen.length < ziel && schritt < 500; schritt++) {
            const wahl = SCHACH_VARIANTEN.stufeZiehen(
                SCHACH_RUNDE._zufallsWert(basis + "|stufe|" + schritt));

            const art = SCHACH_VARIANTEN.faehigkeitAusStufe(
                wahl.stufe.id,
                SCHACH_RUNDE._zufallsWert(basis + "|art|" + schritt),
                [],
                alle);

            if (art && gezogen.indexOf(art) === -1) {
                gezogen.push(art);
            }
        }

        for (const art of alle) {
            if (gezogen.length >= ziel) {
                break;
            }
            if (gezogen.indexOf(art) === -1) {
                gezogen.push(art);
            }
        }

        runde.regeln.itemPool = gezogen.sort();
        return runde;
    },

    _bonusNachziehen(runde) {
        if (!SCHACH_RUNDE.faehigkeitenAn(runde)) {
            return;
        }
        /*
         * Fähigkeiten erscheinen nur auf leeren Feldern, und nie dort, wo schon
         * eine liegt. Gezählt wird ZUERST: Im Glücksboxen-Regen hängen Chance
         * und Anzahl davon ab, wie leer das Brett gerade ist.
         *
         * KEINE LOOTBOX AUF EINEM GESPERRTEN FELD (seit v0.76).
         *
         * Gemeldet als „bei Kreuz-Karten sollen nicht Lootboxen im Nichts
         * spawnen". Die vier toten Ecken eines Kreuz-Bretts sind gewöhnliche
         * RISSE (seit v0.63) — leer, aber niemand zieht dorthin. Eine Lootbox
         * dort war für immer unerreichbar und lag am Bildschirm mitten im
         * Schwarzen. Dasselbe gilt für ein Loch aus einem Erdbeben und für
         * eine Mauer: Unter ihr wäre die Box unsichtbar.
         *
         * Hier geht es um NEU erscheinende Boxen — die dürfen nicht unter eine
         * schon stehende Mauer fallen. Wird umgekehrt eine Mauer über eine
         * liegende Box gelegt, frisst sie diese seit v0.77 (`_zielWirkung`,
         * Fall `mauer`); bis v0.66 war jenes Feld dafür gesperrt.
         *
         * Gefragt wird `SCHACH.gesperrt` — die eine Stelle, die beide Ursachen
         * kennt (eiserne Regel).
         *
         * DIE TOTEN ECKEN ZÄHLEN AUCH NICHT MEHR ALS BRETT. `alleFelder` ist
         * der Massstab dafür, wie leer das Brett ist; die Ecken stünden sonst
         * für immer als „besetzt" darin, und auf dem Kreuz regnete es deutlich
         * weniger als auf jedem anderen Brett derselben Grösse.
         */
        const belegt = runde.bonus.map((eintrag) => eintrag.feld);
        const felderGesamt = SCHACH.felderVon(runde.stand);
        const freie = [];
        let alleFelder = 0;

        for (let feld = 0; feld < felderGesamt; feld++) {
            if (SCHACH.rissAuf(runde.stand, feld)) {
                continue;
            }
            alleFelder++;

            if (SCHACH.figurAuf(runde.stand, feld) === "."
                && !SCHACH.gesperrt(runde.stand, feld)
                && belegt.indexOf(feld) === -1) {
                freie.push(feld);
            }
        }

        if (freie.length === 0) {
            return;
        }

        const menge = SCHACH_RUNDE.lootboxMenge(runde);

        /*
         * DIE UNTERSTE STUFE WIRFT NUR NACH EINEM VOLLEN ZUG AUS (seit v0.71).
         *
         * Massgeblich ist der TAKT — die ehrliche Uhr, die nur bei echten
         * Zügen steigt und hier schon auf dem Wert NACH dem Zug steht; jeder
         * zweite schliesst einen vollen Zug ab. Bis v0.83 hing die Sperre am
         * `zugZaehler`, doch den erhöht auch jede Fähigkeit (das ist die
         * Sicherung gegen gleichzeitige Züge) — eine Mauer mit Pluszeichen
         * verschob damit den Lootbox-Fahrplan um einen Halbzug, und der
         * eigene Folgezug warf Boxen, die ohne sie nicht gekommen wären
         * (Meldung T1, siehe erkenntnisse.md „Zwei Uhren").
         */
        if (!SCHACH_VARIANTEN.mengeVon(menge).jederHalbzug
            && (runde.stand.takt % 2) !== 0) {
            return;
        }

        /*
         * Nach jedem Halbzug neu gewürfelt — kein fester Takt mehr, und seit
         * v3.3 auch keine Höchstzahl (siehe SCHACH_VARIANTEN.BONUS_CHANCE).
         * In der Saat stehen BEIDE Zähler: der Takt als Fahrplan, der
         * `zugZaehler` als Eindeutigkeit — ein Zug und eine direkt folgende
         * Zug-beendende Fähigkeit ziehen beim SELBEN Takt und dürfen nicht
         * dieselbe Saat teilen (sonst fielen ihre Ziehungen immer gleich aus).
         */
        const wuerfelt = SCHACH_RUNDE._zufallsWert(
            (runde.id || "partie") + "|" + runde.stand.takt + "|"
            + runde.zugZaehler + "|ob") * 100;

        if (wuerfelt >= SCHACH_VARIANTEN.mengenChance(menge, freie.length, alleFelder)) {
            return;
        }

        const basis = (runde.id || "partie") + "|" + runde.stand.takt + "|"
            + runde.zugZaehler;

        /*
         * Meist einer, manchmal zwei, sehr selten drei — und auf den drei
         * Füllstands-Stufen zusätzlich, was der Füllstand hergibt (das Grössere
         * von beidem, siehe `SCHACH_VARIANTEN.LOOTBOX_MENGEN`). Nie mehr, als
         * freie Felder da sind; das ist seit v3.3 die einzige harte Grenze.
         */
        const gewuenscht = SCHACH_VARIANTEN.mengenAnzahl(menge, freie.length, alleFelder,
            SCHACH_RUNDE._zufallsWert(basis + "|anzahl"));
        const moeglich = Math.min(gewuenscht, freie.length);

        /*
         * EINMAL VOR DER SCHLEIFE GERECHNET, nicht darin: `freie` schrumpft mit
         * jedem gesetzten Würfel (`splice` unten), und der Füllstand ist der
         * Stand VOR diesem Halbzug — sonst wäre der zweite Würfel eines
         * Durchgangs ein Stück gefährlicher als der erste, ohne dass sich auf
         * dem Brett etwas geändert hätte. Chance und Anzahl oben nehmen ihn aus
         * demselben Grund vorher.
         */
        const pechChance = SCHACH_VARIANTEN.pechChance(menge, freie.length, alleFelder);

        const neue = [];

        for (let nummer = 0; nummer < moeglich; nummer++) {
            const marke = basis + "|" + nummer;
            const stelle = Math.floor(SCHACH_RUNDE._zufallsWert(marke + "|feld") * freie.length);
            const feld = freie[stelle];

            /*
             * Ist es ein Unglückswürfel? Deutlich seltener als ein normaler —
             * und seit v0.77 umso häufiger, je leerer das Brett ist. Gerechnet
             * wird das in `SCHACH_VARIANTEN.pechChance`, mit denselben Kurven
             * wie die Menge; auf der Stufe „wenig" bleibt es beim festen
             * Grundwert.
             */
            const istPech = (SCHACH_RUNDE._zufallsWert(marke + "|pech") * 100)
                < pechChance;

            /*
             * BEIM ERSCHEINEN STEHT NUR DIE STUFE FEST (seit v3.6).
             *
             * Was in einem Würfel steckt, entscheidet sich erst beim
             * Einsammeln — und zwar gegen den Vorrat DESSEN, der ihn
             * einsammelt. Anders ginge die Dämpfung von Wiederholungen nicht:
             * Beim Erscheinen weiss noch niemand, wer den Würfel bekommt.
             *
             * Der Unglückswürfel behält seine feste Art. Er kommt nicht in den
             * Vorrat und wiederholt sich deshalb auch nicht.
             */
            const eintrag = { feld: feld };

            if (istPech) {
                eintrag.art = SCHACH_VARIANTEN.pechZiehen(
                    SCHACH_RUNDE._zufallsWert(marke + "|pechart"));
                eintrag.pech = true;

                if (!eintrag.art) {
                    continue;
                }
            } else {
                /*
                 * DIE STUFE MIT ABKLINGZEIT (seit v0.41). Die Gewichte werden
                 * für JEDEN Würfel neu geholt: Erscheinen zwei auf einmal,
                 * drückt der erste schon die Stufe des zweiten.
                 */
                eintrag.art = "";
                eintrag.stufe = SCHACH_VARIANTEN.stufeZiehen(
                    SCHACH_RUNDE._zufallsWert(marke + "|art"),
                    SCHACH_RUNDE._stufenGewichte(runde)).stufe.id;

                runde.stufeZuletzt[eintrag.stufe] = runde.stand.takt;
            }

            freie.splice(stelle, 1);
            runde.bonus.push(eintrag);
            neue.push(eintrag);
        }

        if (neue.length === 0) {
            return;
        }

        /*
         * Im Verlauf steht NUR, wo etwas liegt — nicht was. Weder die
         * Fähigkeit noch die Tatsache, dass es ein Unglückswürfel ist: Das ist
         * die Überraschung, um die es geht.
         */
        const namen = neue.map((eintrag) => SCHACH.feldName(eintrag.feld,
            SCHACH.breiteVon(runde.stand), SCHACH.hoeheVon(runde.stand)));

        runde.verlauf.push({
            text: (neue.length === 1 ? "Eine Lootbox erscheint auf " : "Lootboxen erscheinen auf ")
                + namen.join(", "),
            wer: "",
            farbe: runde.stand.amZug,
            von: -1,
            nach: -1,
            wirkung: "erscheint",
            felder: neue.map((eintrag) => eintrag.feld)
        });
        SCHACH_RUNDE._verlaufKuerzen(runde);
    },

    /*
     * Setzt eine Fähigkeit ein. Wirkt auf den Brett-Stand und verbraucht sie.
     * Der Zugzähler steigt mit, damit zwei Geräte sich nicht gegenseitig
     * überschreiben — genau wie bei einem Zug.
     *
     * `zielFeld` wird nur von Fähigkeiten der Art "ziel" gebraucht; die
     * übrigen bekommen -1 oder gar nichts.
     *
     * `umwandlung` (seit v0.56) braucht bisher nur der Bauernschub: Erreichen
     * Bauern durch ihn die letzte Reihe, sagt sie, was aus ihnen wird. Sie
     * steht als LETZTER Parameter und ist wahlfrei — jeder Aufruf von vorher
     * bleibt damit gültig und bekommt wie bisher Damen.
     */
    faehigkeitEinsetzen(runde, spielerId, art, zielFeld, wer, zeitpunkt, umwandlung, wahl) {
        const alt = SCHACH_RUNDE.normalisieren(runde);
        const beschreibung = SCHACH_VARIANTEN.FAEHIGKEITEN[art];

        if (!beschreibung) {
            return null;
        }
        if (!SCHACH_RUNDE.darfEinsetzen(alt, spielerId, art)) {
            return null;
        }

        const farbe = SCHACH_RUNDE.teamVon(alt, spielerId);
        const stelle = alt.faehigkeiten[farbe].indexOf(art);
        if (stelle === -1) {
            return null;
        }

        const neu = SCHACH_RUNDE.kopieren(alt);
        const ziel = Number.isInteger(zielFeld) ? zielFeld : -1;
        let betroffen = [];
        let wege = [];
        let zusatzText = "";

        /* Von welchem Rand eine Bahn-Wirkung rollte (nur Nudelholz, seit
           v0.117) — die Anzeige spielt daraus ihr Schauspiel richtig herum. */
        let richtung = "";

        if (beschreibung.art === "zugmuster") {
            neu.stand.zusatzFarbe = farbe;
            neu.stand.zusatzMuster = beschreibung.muster;

            /* `istDerZug` (Sprung, Teleport): Man bleibt am Zug, darf aber nur
               noch nach diesem Muster ziehen — die Fähigkeit ist der Zug. */
            neu.stand.zusatzNurDieses = !!beschreibung.istDerZug;
            neu.stand.sprungAktiv = (beschreibung.muster === "springer") ? farbe : "";

        } else if (beschreibung.art === "ablauf") {
            neu.stand.extraZug = farbe;

        } else if (beschreibung.art === "sicht") {
            /*
             * Ändert nichts am Brett — nur daran, wie EINE Seite es sieht.
             * Dasselbe Muster wie die Halluzination, nur mit umgekehrtem
             * Vorzeichen: Die zeigt weniger, diese zeigt mehr.
             *
             * ZWEI RICHTUNGEN seit v0.98: Enttarnen zeigt EINEM SELBST mehr,
             * Verstecken zeigt dem GEGNER weniger. Welche von beiden gemeint
             * ist, sagt `sichtWirkung` am Eintrag — nie der Name der
             * Fähigkeit, sonst müsste diese Stelle jede neue kennen.
             */
            if (beschreibung.sichtWirkung === "verbergen") {
                neu.stand.verstecktFarbe = SCHACH.gegner(farbe);
                neu.stand.verstecktBis = neu.zugZaehler + SCHACH_RUNDE.VERSTECKT_HALBZUEGE;
            } else {
                neu.stand.enttarntFarbe = farbe;
                neu.stand.enttarntBis = neu.zugZaehler + SCHACH_RUNDE.ENTTARNT_HALBZUEGE;
            }

        } else if (beschreibung.art === "sofort") {
            const wirkung = SCHACH.bauernschub(neu.stand, farbe, umwandlung);
            if (!wirkung) {
                return null;
            }
            neu.stand = wirkung.stand;
            betroffen = wirkung.felder;
            wege = wirkung.wege || [];

            /* Umgewandelte Bauern gehören in den Verlaufstext: Sie sind das,
               was man an der Stellung am wenigsten erwartet. */
            if (wirkung.umgewandelt && wirkung.umgewandelt.length > 0) {
                zusatzText = ": " + wirkung.umgewandelt.length + " mal umgewandelt";
            }

        } else if (beschreibung.art === "ziel") {
            const wirkung = SCHACH_RUNDE._zielWirkung(neu, art, farbe, ziel, wahl);
            if (!wirkung) {
                return null;
            }
            neu.stand = wirkung.stand;
            betroffen = wirkung.felder;
            wege = wirkung.wege || [];
            richtung = wirkung.richtung || "";
            zusatzText = wirkung.text ? (": " + wirkung.text) : "";

        } else if (beschreibung.art === "handel") {
            /*
             * Das Angebot wird HIER neu gerechnet, nicht vom Bildschirm
             * übergeben: Sonst könnte ein Gerät mit veraltetem Stand einen
             * Tausch durchsetzen, den es so gar nicht mehr gibt. Der Bildschirm
             * fragt dasselbe ab, um es zu zeigen — die Wahrheit steht hier.
             */
            const wirkung = SCHACH_RUNDE._handelAusfuehren(neu, farbe);
            if (!wirkung) {
                return null;
            }
            neu.stand = wirkung.stand;
            betroffen = wirkung.felder;
            zusatzText = wirkung.text ? (": " + wirkung.text) : "";

        } else if (beschreibung.art === "diebstahl") {
            /*
             * Auch hier wird die Beute NEU gerechnet und nicht vom Bildschirm
             * übernommen — derselbe Grund wie beim Handel eine Zeile höher.
             * `_diebstahlAusfuehren` ändert die Vorräte in `neu` unmittelbar;
             * der Stand bleibt, wie er ist.
             */
            const wirkung = SCHACH_RUNDE._diebstahlAusfuehren(neu, farbe);
            if (!wirkung) {
                return null;
            }
            neu.stand = wirkung.stand;
            betroffen = wirkung.felder;
            zusatzText = wirkung.text ? (": " + wirkung.text) : "";

        } else {
            return null;
        }

        /*
         * GESCHOBENE BAUERN NEHMEN IHRE STARTSEITE MIT (seit v0.65).
         *
         * Mehrere Fähigkeiten bewegen Figuren, ohne dass ein Zug stattfindet:
         * Nudelholz, Bauernschub, Erdbeben, Spiegel. Ihr `wege` sagt, was von
         * wo nach wo ging — genau daran wandern die Einträge entlang. Ohne das
         * bliebe der Eintrag auf dem alten Feld liegen, und der geschobene
         * Bauer fiele auf die Farbregel zurück: Auf dem Kreuz liefe er danach
         * in die falsche Richtung.
         *
         * Für jedes andere Brett ist der Aufruf wirkungslos — dort ist die
         * Liste leer.
         */
        neu.stand = SCHACH.figurMarkenVerschieben(neu.stand, wege);

        neu.faehigkeiten[farbe].splice(stelle, 1);
        neu.zugZaehler = alt.zugZaehler + 1;

        /*
         * Manche Fähigkeiten kosten den ganzen Zug (`beendetZug`): Danach ist
         * der Gegner dran. Der Doppelzug geht vor — wer ihn eingesetzt hat,
         * behält sein Recht auf einen weiteren Zug, sonst wäre die eine
         * Fähigkeit die andere wert.
         */
        if (beschreibung.beendetZug) {
            neu.stand = SCHACH_RUNDE._zugAbgebenNachFaehigkeit(neu.stand, farbe);
        }

        /*
         * DER EIGENE KÖNIG DARF DABEI NICHT IM SCHACH BLEIBEN (seit v3.6).
         *
         * Für einen Zug gilt das seit jeher (`SCHACH.zuege` filtert es weg),
         * für Fähigkeiten galt es nicht — dabei verschieben mehrere von ihnen
         * ganze Reihen (Erdbeben, Nudelholz, Bauernschub) oder tauschen
         * Figuren aus (Händler). Zwei Fälle sind verboten:
         *
         *   1. Man stellt sich selbst ins Schach. Das darf man mit einem Zug
         *      auch nicht, und eine Fähigkeit ist kein Freibrief.
         *   2. Man steht im Schach und gibt den Zug ab, ohne es aufzulösen.
         *      Dann wäre der König beim nächsten Zug einfach weg — die Partie
         *      endete, ohne dass Schachmatt gesagt wurde.
         *
         * Wer im Schach steht, darf dagegen weiter eine Fähigkeit einsetzen,
         * die den Zug NICHT beendet: Er muss danach ja ohnehin noch aus dem
         * Schach ziehen, und genau dabei kann sie helfen.
         *
         * Auf Brettern ohne Schachbegriff (Doppelbrett) entfällt das alles.
         */
        if (SCHACH_RUNDE._wirkungVerboten(alt.stand, neu.stand, farbe,
            !!beschreibung.beendetZug)) {

            return null;
        }

        /*
         * WER NUR NOCH SPRINGEN DARF, MUSS AUCH SPRINGEN KÖNNEN (seit v0.48).
         *
         * `istDerZug` nimmt der Seite für diesen einen Zug ihre gewohnte
         * Gangart. Bleibt dabei kein einziger Zug übrig — alle Sprungfelder
         * besetzt, oder der König steht im Schach und kein Muster löst es auf —
         * dann stünde die Partie: Der Spieler wäre am Zug, könnte aber nichts
         * tun, und `SCHACH.alleZuege` läse das als Matt. Deshalb wird das
         * Einsetzen abgewiesen; die Fähigkeit bleibt im Vorrat.
         */
        if (beschreibung.istDerZug && SCHACH.alleZuege(neu.stand).length === 0) {
            return null;
        }

        /*
         * BERÜHREN HEISST EINSAMMELN (seit v0.53).
         *
         * Bis v0.52 zählte nur der eigene ZUG: Wer mit dem Nudelholz eine Figur
         * über einen Würfel schob, sie mit dem Spiegel neben einen setzte oder
         * sie per Wiedergeburt auf einem erscheinen liess, ging leer aus — der
         * Würfel blieb unter der Figur liegen und war für immer unerreichbar,
         * weil man ihn nur durch Betreten einsammelt.
         *
         * Eingesammelt wird deshalb auf JEDEM Feld, das die Fähigkeit berührt
         * hat und auf dem jetzt eine eigene Figur steht. `betroffen` sind genau
         * diese Felder — dieselbe Liste, die auch das Aufleuchten am Brett
         * steuert.
         */
        const felderVorEinsammeln = SCHACH.felderVon(neu.stand);
        SCHACH_RUNDE._bonusEinsammelnAufFeldern(neu, betroffen, farbe, wer);

        /*
         * AUCH EINE GESCHOBENE GEGNERISCHE FIGUR SAMMELT EIN (seit v0.59,
         * Wunsch #6).
         *
         * Bis v0.58 zählten nur Felder, auf denen danach eine EIGENE Figur
         * stand. Wer mit dem Nudelholz eine gegnerische Figur über einen Würfel
         * schob, liess ihn also für immer unter ihr liegen — genau der Fall,
         * den „Berühren heisst Einsammeln" (v0.53) eigentlich abschaffen
         * sollte.
         *
         * ER GEHT AN DIE SEITE DER GESCHOBENEN FIGUR, nicht an den Einsetzer.
         * Die Figur betritt das Feld, also gehört ihr der Fund — dieselbe
         * Regel wie beim Zug. Damit bekommt das Nudelholz einen Preis: Wer
         * damit gegnerische Figuren schiebt, kann dem Gegner etwas schenken.
         *
         * `wer` bleibt leer: Im Verlauf stünde sonst der Name des Einsetzers
         * neben der Farbe des Gegners, und es sähe aus, als hätte der Gegner
         * gehandelt.
         *
         * HAT DER ERSTE DURCHGANG DAS BRETT VERÄNDERT, entfällt der zweite:
         * Nach einer Ausdehnung oder einem Einsturz zeigen die gemerkten
         * Feldnummern in `betroffen` woanders hin. Lieber ein Würfel, der
         * liegen bleibt, als einer, der auf einem falsch gerechneten Feld
         * wirkt — dieselbe Überlegung wie beim zweiten Unglückswürfel in
         * `_bonusEinsammelnAufFeldern`.
         */
        if (SCHACH.felderVon(neu.stand) === felderVorEinsammeln) {
            SCHACH_RUNDE._bonusEinsammelnAufFeldern(neu, betroffen, SCHACH.gegner(farbe), "");
        }

        /*
         * AUCH EIN ABGEGEBENER ZUG IST EIN HALBZUG (seit v0.52).
         *
         * Würfel erscheinen nach jedem Halbzug — aber `_bonusNachziehen` lief
         * nur in `ziehen`. Wer seinen Zug für eine Fähigkeit hergab (Friedhof,
         * Wiedergeburt, Händler …), bekam deshalb keinen neuen Würfel aufs
         * Brett, und in einer Partie mit vielen Fähigkeiten wurde es dadurch
         * spürbar still. Gemeldet als „Würfel sollen nicht nur in ganzen Zügen
         * spawnen, sondern nach jeder Bewegung".
         *
         * Nur bei `beendetZug`: Wer am Zug bleibt, hat noch keinen Halbzug
         * verbraucht — der Würfel kommt dann nach seinem Zug.
         */
        if (beschreibung.beendetZug) {
            SCHACH_RUNDE._bonusNachziehen(neu);
        }

        neu.verlauf.push({
            text: "Fähigkeit " + SCHACH_VARIANTEN.faehigkeitTitel(art) + " eingesetzt"
                + zusatzText,
            wer: wer || "",
            farbe: farbe,
            von: -1,
            nach: -1,
            wirkung: art,
            felder: betroffen,
            wege: wege,
            richtung: richtung
        });
        SCHACH_RUNDE._verlaufKuerzen(neu);

        /*
         * IST DIE PARTIE DAMIT VORBEI? (seit v0.94, gefunden im Spieltest)
         *
         * Bis v0.93 wurde Matt und Patt AUSSCHLIESSLICH in `ziehen` geprüft.
         * Eine Fähigkeit konnte deshalb mattsetzen, ohne dass die Partie
         * endete: Der Gegner war am Zug, hatte keinen einzigen erlaubten Zug,
         * und die Leiste sagte trotzdem „am Zug" — die Partie stand still.
         *
         * SEIT v0.95 KANN DIE FÄHIGKEIT SELBST DAS NICHT MEHR: `_wirkungVerboten`
         * oben weist sie ab, bevor es dazu kommt (Nutzer-Entscheidung 20.08.).
         * Diese Prüfung hier ist trotzdem kein toter Code — sie steht NACH dem
         * Einsammeln, und dort liegt der eine Weg, der weiterhin erlaubt ist:
         * Eine Fähigkeit, die eine Lootbox berührt, löst deren Unglück aus, und
         * ein Unglück DARF die Partie beenden (Entscheidung 09.08.: „eine
         * Fähigkeit wählt man, ein Unglück trifft einen"). Wer eine Figur mit
         * dem Nudelholz über einen Riss schiebt, kann so mattgesetzt werden.
         *
         * Gefragt wird dieselbe Funktion und in derselben Reihenfolge wie in
         * `ziehen` — erst nachziehen lassen, dann `SCHACH.lage`. Zwei Wege zu
         * demselben Urteil würden auseinanderlaufen.
         */
        const lage = SCHACH.lage(neu.stand);
        if (lage.art === "matt") {
            neu.ergebnis = lage.sieger;
            neu.laeuft = false;
        } else if (lage.art === "patt" || lage.art === "remis") {
            neu.ergebnis = "remis";
            neu.laeuft = false;
        }

        neu.geaendertAm = (zeitpunkt === undefined) ? Date.now() : zeitpunkt;
        return neu;
    },

    /*
     * DARF DER KÖNIG DAS? — die eine Stelle, die es beantwortet (seit v0.94).
     *
     * Zwei Fälle sind verboten, und beide stehen seit v3.6 im Regelwerk:
     *
     *   1. Man stellt sich mit der Fähigkeit selbst ins Schach. Das darf man
     *      mit einem Zug auch nicht, und eine Fähigkeit ist kein Freibrief.
     *   2. Man steht im Schach und gibt den Zug ab, ohne es aufzulösen. Dann
     *      wäre der König beim nächsten Zug einfach weg — die Partie endete,
     *      ohne dass Schachmatt gesagt wurde.
     *
     * Wer im Schach steht, darf dagegen weiter eine Fähigkeit einsetzen, die
     * den Zug NICHT beendet: Er muss danach ohnehin noch aus dem Schach
     * ziehen, und genau dabei kann sie helfen.
     *
     * WARUM DAS SEIT v0.94 EINE EIGENE FUNKTION IST: Bis dahin stand die
     * Prüfung nur in `faehigkeitEinsetzen`. `zielFelder` — die Liste, aus der
     * das Brett seine Markierungen macht — kannte sie nicht und bot deshalb
     * Felder an, die das Einsetzen hinterher ablehnte. Man tippte ein
     * markiertes Feld an und bekam „Geht gerade nicht". Im Spieltest über
     * 111.000 Halbzüge war das mit Abstand der häufigste Fund. Jetzt fragen
     * beide dieselbe Funktion; das Brett kann gar nichts mehr anbieten, was
     * das Modell danach verweigert.
     *
     * Auf Brettern ohne Schachbegriff (Doppelbrett) entfällt das alles.
     */
    _koenigVerbietet(altStand, neuStand, farbe, beendetZug) {
        if (SCHACH.varianteVon(neuStand).koenigSchlagbar) {
            return false;
        }
        if (!SCHACH.imSchach(neuStand, farbe)) {
            return false;
        }

        return beendetZug || !SCHACH.imSchach(altStand, farbe);
    },

    /*
     * WER GIBT NACH EINER FÄHIGKEIT DEN ZUG AB — und wie (seit v0.95).
     *
     * Zwei Zeilen, die aber an zwei Stellen gebraucht werden: beim Einsetzen
     * selbst und beim Anbieten der Zielfelder (`zielFelder` muss wissen, WER
     * danach am Zug ist, sonst kann es die Regel unten nicht prüfen).
     *
     * Der Doppelzug geht vor: Wer ihn offen hat, behält sein Recht auf einen
     * weiteren Zug, sonst wäre die eine Fähigkeit die andere wert.
     */
    _zugAbgebenNachFaehigkeit(stand, farbe) {
        if (stand.extraZug === farbe) {
            const ohne = Object.assign({}, stand);
            ohne.extraZug = "";
            return ohne;
        }
        return SCHACH.zugAbgeben(stand);
    },

    /*
     * DARF DIESE WIRKUNG SO STEHEN BLEIBEN? (seit v0.95)
     *
     * ------------------------------------------------------------------
     * NUTZER-ENTSCHEIDUNG VOM 20.08.2026, im Wortlaut:
     *
     *   „items sollen nie direkt zu schach oder matt führen … da mauer und so
     *    soll durch cleveres platzieren schon große bis massive auswirkungen
     *    haben, also soll denken belohnt werden. ganz beheben kann man es ja
     *    nie mit items im schach"
     *
     * Sie hebt zwei frühere Entscheidungen auf: das Recht des Frostes,
     * mattzusetzen (18.08., v0.80), und die Folge daraus, dass eine Fähigkeit
     * die Partie beenden kann (v0.94). Die Abwägung dahinter ist DIREKT gegen
     * INDIREKT: Ein Item soll die Stellung vorbereiten, den Angriff führt der
     * ZUG. Wer mit der Mauer clever sperrt, gewinnt weiterhin — nur eben einen
     * Halbzug später und aus eigener Hand.
     *
     * Auf Nachfrage ausdrücklich bestätigt: **auch kein Patt** (sonst liesse
     * sich eine verlorene Partie per Item zum Unentschieden machen), und
     * **Unglücks-Lootboxen bleiben ausgenommen** — für die gilt weiter die
     * Entscheidung vom 09.08. („eine Fähigkeit wählt man, ein Unglück trifft
     * einen"). Deshalb steht diese Prüfung VOR dem Einsammeln in
     * `faehigkeitEinsetzen` und die Ende-Prüfung dahinter: Was die Fähigkeit
     * selbst anrichtet, wird abgewiesen; was ein dabei aufgesammeltes Unglück
     * anrichtet, zählt.
     * ------------------------------------------------------------------
     *
     * Drei Fälle sind verboten. `neuStand` ist die Lage NACH dem Einsetzen,
     * einschliesslich der Zugabgabe — nur so steht fest, wer als Nächster
     * zieht.
     *
     *   1. Der EIGENE König stünde im Schach (seit v3.6, `_koenigVerbietet`).
     *   2. Der GEGNERISCHE König stünde im Schach, und die Fähigkeit hat es
     *      verursacht. Stand er schon vorher darin, liegt es nicht am Item.
     *   3. Wer als Nächster zieht, hätte keinen einzigen Zug. Das ist Matt
     *      oder Patt, je nach Schach — beides ist untersagt, und der Fall
     *      trifft BEIDE Seiten: Wer den Zug behält und sich selbst die letzte
     *      Möglichkeit nimmt (Mauer vor den eigenen König), stünde sonst fest.
     *      Bis v0.93 blieb die Partie dabei einfach stehen.
     *
     * ------------------------------------------------------------------
     * FALL 2 GILT NUR, WENN SICH AUF DEM BRETT WIRKLICH ETWAS BEWEGT HAT —
     * und das ist keine Feinheit, sondern die Stelle, an der die Regel beim
     * Bauen zuerst falsch war (gemessen am 20.08.):
     *
     * `SCHACH.imSchach` rechnet ein aktives ZUSATZMUSTER mit. Sobald der
     * Sprung an ist, gilt der gegnerische König als angegriffen, weil jetzt
     * jede eigene Figur wie ein Springer ziehen könnte — obwohl auf dem Brett
     * keine Figur ihren Platz verlassen hat. Ohne die Einschränkung unten
     * verbot die Regel den Sprung in fast jeder zweiten Stellung (278 von 579
     * Versuchen im Spieltest).
     *
     * Das ist auch sachlich richtig so: Sprung, Teleport und Doppelzug geben
     * nur ein Zugmuster oder ein Zugrecht aus. Was danach passiert, ist ein
     * ZUG — und ein Zug darf Schach geben, matt setzen und alles andere. Der
     * Vergleich der Brett-Zeichenketten trennt beides sauber: Wer keine Figur
     * versetzt, kann auch kein Schach geben.
     *
     * Mauer, Frost, Fessel und Schild versetzen ebenfalls nichts; sie können
     * eine Angriffslinie nur SPERREN, also Schach wegnehmen statt geben.
     * ------------------------------------------------------------------
     *
     * Auf Brettern ohne Schachbegriff (Doppelbrett) entfallen 1 und 2; Fall 3
     * gilt auch dort, denn ein Brett ohne Zug steht auch dort still.
     */
    _wirkungVerboten(altStand, neuStand, farbe, beendetZug) {
        if (SCHACH_RUNDE._koenigVerbietet(altStand, neuStand, farbe, beendetZug)) {
            return true;
        }

        const gegner = SCHACH.gegner(farbe);

        if (altStand.brett !== neuStand.brett
            && !SCHACH.varianteVon(neuStand).koenigSchlagbar
            && SCHACH.imSchach(neuStand, gegner)
            && !SCHACH.imSchach(altStand, gegner)) {

            return true;
        }

        return SCHACH.alleZuege(neuStand).length === 0;
    },

    /*
     * WELCHE FÄHIGKEIT WARTET GERADE AUF IHREN ZUG? (seit v0.76)
     *
     * `istDerZug` (Sprung, Teleport) setzt ein Zugmuster in den Stand und ist
     * damit verbraucht — danach ist die Seite zwar am Zug, darf aber NUR noch
     * nach diesem Muster ziehen. Der Stand merkt sich das Muster, nicht die
     * Fähigkeit; hier steht der Rückweg. Gesucht wird in der Tabelle, damit
     * eine neue Fähigkeit mit eigenem Muster von selbst mitkommt.
     */
    laufendesZugmuster(runde, farbe) {
        const stand = SCHACH_RUNDE.normalisieren(runde);

        if (stand.stand.zusatzFarbe !== farbe || !stand.stand.zusatzNurDieses) {
            return "";
        }

        const namen = Object.keys(SCHACH_VARIANTEN.FAEHIGKEITEN);
        const gefunden = namen.find((art) => {
            const eintrag = SCHACH_VARIANTEN.FAEHIGKEITEN[art];
            return eintrag.art === "zugmuster" && eintrag.istDerZug
                && eintrag.muster === stand.stand.zusatzMuster;
        });

        return gefunden || "";
    },

    /*
     * EIN AKTIVES ITEM ABBRECHEN — UND ZURÜCKBEKOMMEN (seit v0.76).
     *
     * Gemeldet als: „Wenn man ein Item aktiv hat, also gerade dabei ist eine
     * Figur auszuwählen, soll man mit einem Abbrechen-Knopf das Item abbrechen
     * können, und das Item muss zurückgegeben werden."
     *
     * Für Fähigkeiten mit ZIELFELD gab es das seit v0.57 (der Kasten wird
     * platziert, „Abbrechen" verwirft ihn, eingesetzt ist noch gar nichts).
     * Sprung und Teleport waren der blinde Fleck: Sie sind mit dem Antippen
     * SOFORT verbraucht, und danach steht man vor einem Brett, auf dem nur noch
     * das Muster zählt. Wer sich vertippt hatte, musste springen.
     *
     * Zurückgenommen wird deshalb genau das, was `faehigkeitEinsetzen` gesetzt
     * hat: das Muster aus dem Stand und die Fähigkeit zurück in den Vorrat.
     * ES IST KEIN GESCHENK — die Stellung ist danach dieselbe wie vorher, kein
     * Halbzug ist verbraucht, und deshalb erscheint auch keine neue Lootbox
     * (`_bonusNachziehen` läuft hier nicht, genau wie beim Einsetzen selbst).
     * Der Zugzähler steigt trotzdem: Er zählt Änderungen am Stand, und daran
     * hängt die Sicherung gegen zwei gleichzeitige Züge aus einem Team.
     */
    zugmusterZuruecknehmen(runde, spielerId, zeitpunkt) {
        const alt = SCHACH_RUNDE.normalisieren(runde);

        if (!SCHACH_RUNDE.darfZiehen(alt, spielerId)) {
            return null;
        }

        const farbe = SCHACH_RUNDE.teamVon(alt, spielerId);
        const art = SCHACH_RUNDE.laufendesZugmuster(alt, farbe);

        if (!art) {
            return null;
        }

        const neu = SCHACH_RUNDE.kopieren(alt);

        neu.stand = Object.assign({}, neu.stand, {
            zusatzFarbe: "",
            zusatzMuster: "",
            zusatzNurDieses: false,
            sprungAktiv: ""
        });

        neu.faehigkeiten[farbe].push(art);
        neu.zugZaehler = alt.zugZaehler + 1;

        neu.verlauf.push({
            text: "Fähigkeit " + SCHACH_VARIANTEN.faehigkeitTitel(art)
                + " abgebrochen — sie bleibt im Vorrat",
            wer: "",
            farbe: farbe,
            von: -1,
            nach: -1
        });
        SCHACH_RUNDE._verlaufKuerzen(neu);

        neu.geaendertAm = (zeitpunkt === undefined) ? Date.now() : zeitpunkt;
        return neu;
    },

    /*
     * Sammelt alle Würfel ein, über die dieser Zug geführt hat. Ändert die
     * übergebene Runde.
     *
     * BIS v3.5 ZÄHLTE NUR DAS ZIELFELD. Wer mit dem Turm über einen Würfel
     * hinwegzog, liess ihn liegen — was am Brett aussah wie ein Fehler, denn
     * die Figur war ja sichtbar darüber gelaufen. Jetzt zählt jedes betretene
     * Feld. Wer springt (Springer, Fähigkeit „Sprung", Teleport), betritt nur
     * sein Zielfeld und sammelt unterwegs deshalb nichts ein — genau so, wie
     * es `SCHACH.betreteneFelder` festlegt.
     *
     * `altStand` ist der Stand VOR dem Zug: Die Felder gehören zu seiner
     * Nummerierung, und ein Unglückswürfel kann das Brett vergrössern.
     */
    _bonusEinsammeln(runde, altStand, von, nach, farbe, wer, bericht, ohneWeg) {
        return SCHACH_RUNDE._bonusEinsammelnAufFeldern(runde,
            SCHACH.betreteneFelder(altStand, von, nach, ohneWeg), farbe, wer,
            { vonZug: true, von: von, nach: nach, altStand: altStand,
                bericht: bericht });
    },

    /*
     * Sammelt die Würfel auf diesen Feldern ein. Ändert die übergebene Runde.
     *
     * Zwei Wege führen hierher (seit v0.53): ein ZUG (dann sind es die
     * betretenen Felder, siehe oben) und eine FÄHIGKEIT, die Figuren bewegt
     * oder erscheinen lässt (dann sind es ihre betroffenen Felder). Vorher
     * konnte nur ein Zug einsammeln — ein Würfel unter einer per Nudelholz
     * geschobenen Figur blieb für immer liegen.
     *
     * `herkunft` trägt, was der Verlauf braucht (`von`, `nach`, `altStand`) und
     * unterscheidet die beiden Wege: Ein ZUG betritt sein Feld auf jeden Fall,
     * eine FÄHIGKEIT berührt auch Felder, auf denen danach gar nichts oder eine
     * gegnerische Figur steht (Erdbeben verschiebt beide Seiten). Dort wird
     * nichts eingesammelt — sonst bekäme man Würfel für Felder, die man nie
     * betreten hat.
     */
    _bonusEinsammelnAufFeldern(runde, felder, farbe, wer, herkunft) {
        const woher = herkunft || {};
        const von = Number.isInteger(woher.von) ? woher.von : -1;
        const nach = Number.isInteger(woher.nach) ? woher.nach : -1;
        const altStand = woher.altStand || runde.stand;

        const betreten = (felder || []).filter((feld) => {
            if (woher.vonZug) {
                return true;
            }
            return SCHACH.farbeVon(SCHACH.figurAuf(runde.stand, feld)) === farbe;
        });

        const eingesammelt = [];

        for (const feld of betreten) {
            const stelle = runde.bonus.findIndex((eintrag) => eintrag.feld === feld);
            if (stelle === -1) {
                continue;
            }
            eingesammelt.push(runde.bonus[stelle]);
            runde.bonus.splice(stelle, 1);
            runde.bonusGesammelt.push(feld);
        }

        /*
         * Erst alle Fähigkeiten gutschreiben, dann die Unglückswürfel wirken
         * lassen. Die Reihenfolge ist Absicht: Ein Unglückswürfel kann das
         * Brett verändern („Ausdehnung" vergrössert es), und danach zeigen die
         * gemerkten Feldnummern woanders hin.
         */
        for (const bonus of eingesammelt) {
            if (bonus.pech) {
                continue;
            }

            /*
             * WAS DRIN IST, ENTSCHEIDET SICH HIER (seit v3.6) — gegen den
             * Vorrat dessen, der ihn einsammelt. Ein Würfel von vor v3.6 trägt
             * seine Art schon; dann bleibt sie stehen.
             */
            /* Die Feldnummer steht VORNE — sonst liefern zwei Würfel, die im
               selben Zug auf benachbarten Feldern eingesammelt werden, fast
               denselben Wert und damit fast immer dieselbe Fähigkeit (siehe
               `_armeeSaat`). */
            const art = bonus.art || SCHACH_VARIANTEN.faehigkeitAusStufe(
                bonus.stufe,
                SCHACH_RUNDE._zufallsWert(bonus.feld + "|inhalt|"
                    + runde.zugZaehler + "|" + (runde.id || "partie")),
                runde.faehigkeiten[farbe],
                /* Nur, was es in dieser Partie gibt (seit v0.87). */
                SCHACH_RUNDE.erlaubteFaehigkeiten(runde));

            if (!art) {
                continue;
            }
            runde.faehigkeiten[farbe].push(art);

            /* Derselbe Weg wie beim Zug davor: Dieser Eintrag beschreibt
               denselben Zug. So findet der Bildschirm die Bewegung auch dann
               am Ende des Verlaufs, wenn dabei etwas eingesammelt wurde. */
            runde.verlauf.push({
                text: SCHACH_VARIANTEN.faehigkeitTitel(art) + " ("
                    + SCHACH_VARIANTEN.stufeVon(art).titel + ") eingesammelt",
                wer: wer || "",
                farbe: farbe,
                von: von,
                nach: nach,
                wirkung: "eingesammelt",
                felder: [bonus.feld]
            });
            SCHACH_RUNDE._verlaufKuerzen(runde);
        }

        /* Die Felder, auf denen ein UNGLÜCKSwürfel lag — der Aufrufer braucht
           sie, um den Zug am Riss abbrechen zu können (seit v0.58). */
        const pechFelder = [];

        for (const bonus of eingesammelt) {
            if (!bonus.pech) {
                continue;
            }
            pechFelder.push(bonus.feld);

            /*
             * Hat ein früherer Unglückswürfel das Brett schon verändert, sind
             * alle weiteren Felder verschoben. Dann wirkt keiner mehr — er
             * wird nur weggeräumt und im Verlauf vermerkt. Das ist selten
             * (zwei Unglückswürfel auf einem Weg) und allemal besser, als auf
             * ein falsch gerechnetes Feld zu wirken.
             */
            if (SCHACH.felderVon(runde.stand) !== SCHACH.felderVon(altStand)) {
                runde.verlauf.push({
                    text: "Eine zweite Unglücks-Lootbox verpufft — das Brett hat sich "
                        + "gerade verändert",
                    wer: wer || "",
                    farbe: farbe,
                    von: -1,
                    nach: -1,
                    wirkung: "pech",
                    felder: []
                });
                SCHACH_RUNDE._verlaufKuerzen(runde);
                continue;
            }

            /*
             * WO STEHT DIE FIGUR, DIE IHN EINGESAMMELT HAT? (seit v0.58)
             *
             * Bis v0.57 bekam `_pechAusloesen` immer das Feld des WÜRFELS —
             * mit der Begründung „dort steht jetzt die einsammelnde Figur".
             * Das stimmte bis v0.52. Seit „Berühren heisst Einsammeln" (v0.53)
             * sammelt ein Turm auch im Vorbeiziehen ein und steht danach ganz
             * woanders. Der Stolperstein suchte dann auf einem leeren Feld
             * nach einer Figur und verpuffte still — jedes Mal, wenn man über
             * ihn hinwegzog statt auf ihm zu landen.
             *
             * Bei einem Zug ist der Träger das ZIELFELD, sonst weiterhin das
             * Würfelfeld (dort hat eine Fähigkeit die Figur hingestellt).
             */
            const traeger = (woher.vonZug && Number.isInteger(nach) && nach >= 0)
                ? nach
                : bonus.feld;

            SCHACH_RUNDE._pechAusloesen(runde, bonus.art, farbe, bonus.feld, wer,
                von, traeger, woher.bericht);
        }

        return pechFelder;
    },

    /*
     * Lässt einen Unglückswürfel sofort wirken. Ändert die übergebene Runde.
     *
     * `feld` ist das Feld, auf dem er LAG, `farbe` die Seite, die ihn erwischt
     * hat. `traeger` ist das Feld, auf dem die einsammelnde Figur jetzt steht
     * (seit v0.58) — beim Vorbeiziehen ist das nicht dasselbe. Fehlt es, gilt
     * wie früher das Würfelfeld.
     */
    _pechAusloesen(runde, art, farbe, feld, wer, herkunft, traeger, bericht) {
        const basis = (runde.id || "partie") + "|" + runde.zugZaehler + "|pech";
        const wo = Number.isInteger(traeger) ? traeger : feld;
        let wirkung = null;

        if (art === "stolperstein") {
            wirkung = SCHACH.stolperstein(runde.stand, farbe, wo, herkunft, feld);

            /*
             * Wo die Figur hängen bleibt, muss der ZUG erfahren: Er bricht
             * dort ab, und ein Schlag am Zielfeld fällt damit aus (seit
             * v0.73, Meldung I8). Gemeldet wird es über `bericht`, weil das
             * Zurücknehmen nur `ziehen` kann — dort liegen die geschlagene
             * Figur und der Verlaufseintrag.
             */
            if (wirkung && bericht) {
                bericht.stolperHalt = wirkung.halt;
            }

        } else if (art === "ausdehnung") {
            /*
             * ALLE VIER SEITEN, JEDE MIT EINEM VIERTEL — und wenn die gezogene
             * nicht mehr kann, kommt die nächste dran (seit v0.50).
             *
             * `SCHACH.ausdehnung` weist eine Seite ab, sobald das Brett dort an
             * seine Grenze stösst (8 Spalten, 9 Reihen). Bis v0.49 verpuffte der
             * Würfel dann ganz: Wer ihn einsammelte, las „ohne Wirkung" und
             * hatte Glück gehabt — obwohl drei andere Seiten noch Platz hatten.
             * Gezogen wird deshalb weiterhin gleichverteilt, aber die übrigen
             * Seiten werden der Reihe nach durchprobiert.
             */
            const seiten = ["oben", "unten", "links", "rechts"];
            const wahl = SCHACH_RUNDE._zufallsWert(basis + "|seite");
            const erste = Math.floor(wahl * seiten.length) % seiten.length;

            for (let schritt = 0; schritt < seiten.length && !wirkung; schritt++) {
                wirkung = SCHACH.ausdehnung(runde.stand,
                    seiten[(erste + schritt) % seiten.length]);
            }

        } else if (art === "schrumpfung") {
            /* Wie die Ausdehnung: gleichverteilt gezogen, und wenn die
               gezogene Seite nicht kann (König darauf, Brett zu klein), kommt
               die nächste dran. */
            const seiten = ["oben", "unten", "links", "rechts"];
            const wahl = SCHACH_RUNDE._zufallsWert(basis + "|seite");
            const erste = Math.floor(wahl * seiten.length) % seiten.length;

            for (let schritt = 0; schritt < seiten.length && !wirkung; schritt++) {
                wirkung = SCHACH.schrumpfung(runde.stand,
                    seiten[(erste + schritt) % seiten.length]);
            }

        } else if (art === "erdbeben") {
            wirkung = SCHACH.erdbebenRisse(runde.stand,
                SCHACH_RUNDE._zufallsWert(basis + "|risse"));

        } else if (art === "meuterei") {
            wirkung = SCHACH.meuterei(runde.stand, farbe,
                SCHACH_RUNDE._zufallsWert(basis + "|figur"));

        } else if (art === "erdrutsch") {
            wirkung = SCHACH.erdrutsch(runde.stand, farbe);

        } else if (art === "vollesGlas") {
            /* Ändert nichts am Brett — nur daran, wie EINE Seite es sieht. */
            wirkung = {
                stand: Object.assign({}, runde.stand, {
                    glasFarbe: farbe,
                    glasBis: runde.zugZaehler + SCHACH_RUNDE.GLAS_HALBZUEGE
                }),
                felder: [],
                wege: [],
                text: "die Sicht verschwimmt für "
                    + ((farbe === "weiss") ? "Weiss" : "Schwarz")
            };
        }

        const stufe = SCHACH_VARIANTEN.pechStufeVon(art);
        let text = "Unglücks-Lootbox: " + SCHACH_VARIANTEN.pechTitel(art)
            + " (" + stufe.titel + ")";

        if (wirkung) {
            runde.stand = wirkung.stand;
            text += " — " + wirkung.text;

            /* Die Karte für die Hand (seit v0.82.0): Wer das Unglück
               abbekommen hat, trägt es ab jetzt als Karte. Nur ein Unglück,
               das WIRKT, zählt — ein verpufftes hat niemanden getroffen. */
            runde.unglueckskarten[farbe].push({
                art: art,
                zugZaehler: runde.zugZaehler
            });

            /*
             * GESCHOBENE BAUERN NEHMEN AUCH HIER IHRE EINTRÄGE MIT (seit
             * v0.98). Bis dahin galt das nur für die FÄHIGKEITEN — ein
             * Unglück (Erdbeben, Erdrutsch, Meuterei) schob Bauern, ohne die
             * Einträge nachzuführen. Das ist dieselbe Lücke wie beim
             * Erdrutsch in v0.81, nur eine Ebene höher: Wer eine Bewegung
             * baut, muss sie an EINER Stelle melden.
             *
             * Zwei Dinge hängen daran: die Startseite des Bauern (auf dem
             * Kreuz läuft er sonst in die falsche Richtung) und sein Recht
             * auf den ersten Doppelschritt.
             *
             * NICHT bei einer Brettgrössen-Änderung: Dort tragen die Wege noch
             * die ALTEN Feldnummern, während der Stand schon die neuen führt —
             * `SCHACH._feldnummernUmrechnen` hat beide Listen dann bereits
             * selbst umgerechnet. Erkennbar an `wirkung.umrechnen`.
             */
            if (typeof wirkung.umrechnen !== "function") {
                runde.stand = SCHACH.figurMarkenVerschieben(
                    runde.stand, wirkung.wege);
            }

            /*
             * ÄNDERT SICH DIE BRETTGRÖSSE, WANDERN DIE LIEGENDEN WÜRFEL MIT
             * (seit v0.54).
             *
             * Der Stand rechnet seine gemerkten Felder selbst um; die Würfel
             * liegen aber in der RUNDE, davon weiss `schach.js` nichts. Bis
             * v0.53 blieben sie nach einer Ausdehnung auf ihren alten Nummern
             * stehen und lagen damit plötzlich woanders — bei der Schrumpfung
             * wären sie sogar ausserhalb des Bretts gelandet.
             *
             * Was auf einer weggebrochenen Linie lag, fällt mit weg: Genau das
             * ist beim Einsturz gewollt.
             */
            if (typeof wirkung.umrechnen === "function") {
                runde.bonus = runde.bonus
                    .map((eintrag) => Object.assign({}, eintrag, {
                        feld: wirkung.umrechnen(eintrag.feld)
                    }))
                    .filter((eintrag) => eintrag.feld >= 0);
            }

            /*
             * WAS AUF EINEM RISS LAG, FÄLLT HINEIN (seit v0.59, Wunsch #20).
             *
             * Ein Erdbeben reisst Felder auf, ohne zu fragen, ob dort ein
             * Würfel liegt — und auf ein gesperrtes Feld kann danach niemand
             * mehr ziehen. Der Würfel lag damit für den Rest der Partie
             * unerreichbar im Loch. Jetzt fällt er mit hinein.
             *
             * Gefragt wird `rissAuf`, nicht `gesperrt`: Eine MAUER läuft ab,
             * der Würfel darunter wird danach wieder erreichbar und soll
             * liegen bleiben. Ein Riss bleibt die ganze Partie.
             */
            runde.bonus = runde.bonus.filter(
                (eintrag) => !SCHACH.rissAuf(runde.stand, eintrag.feld));
        } else {
            /* Auch ein wirkungsloser Unglückswürfel wird festgehalten: Sonst
               stünde im Verlauf ein Einsammeln ohne Folge, und niemand wüsste,
               warum nichts passiert ist. */
            text += " — ohne Wirkung";
        }

        /*
         * DER UNGLÜCKS-EINTRAG IST KEINE BEWEGUNG (seit v0.76).
         *
         * Bis v0.75 stand hier `von` = Startfeld des Zuges und `nach` = Feld
         * der Lootbox. Beides zusammen sah für den Bildschirm aus wie ein Weg —
         * und er zeichnete ihn: die Spur lief vom Startfeld zur LOOTBOX und
         * hörte dort auf, in Gelb, während die Figur ganz woanders stand. Die
         * grüne Spur des eigenen Zuges war damit weg, und die Bewegung suchte
         * ihre Figur auf dem Lootbox-Feld (gemeldet am 18.08.: „wenn ich eine
         * Unglücksbox einsammle, verhält sich die grüne Farbe meiner Bewegung
         * nicht richtig").
         *
         * Was das Unglück wirklich bewegt hat, steht in `wege` — dort und
         * nirgendwo sonst. `felder` sagt, worauf es gewirkt hat. Ein Weg vom
         * Start des Zuges zur Lootbox hat nie stattgefunden.
         */
        runde.verlauf.push({
            text: text,
            wer: wer || "",
            farbe: farbe,
            von: -1,
            nach: -1,
            wirkung: "pech",
            felder: wirkung ? wirkung.felder : [feld],
            wege: wirkung ? (wirkung.wege || []) : []
        });
        SCHACH_RUNDE._verlaufKuerzen(runde);
    },

    /*
     * Verschwimmt die Sicht dieser Seite gerade? (seit v0.82.0 im Modell)
     *
     * Die Rechnung stand vorher nur im Bildschirm (`TEAM_SCHACH._glasWirkt`);
     * seit die Unglücks-Karte der Hand dieselbe Frage stellt, wohnt sie hier —
     * eine Regel steht genau einmal, und zwar im Modell.
     */
    glasWirkt(runde, farbe) {
        return (farbe === "weiss" || farbe === "schwarz")
            && runde.stand.glasFarbe === farbe
            && runde.zugZaehler < runde.stand.glasBis;
    },

    /*
     * Die Unglücks-Karten, die die Hand einer Seite ZEIGT (seit v0.82.0,
     * Nutzer-Ansage 26.08.2026): Dauerhafte bleiben die ganze Partie liegen;
     * zeitlich Begrenztes liegt nur in der Hand, solange es wirkt. Die
     * Halluzination ist das einzige Unglück mit Ablauf — wer ein zweites
     * baut, ergänzt seinen Fall HIER, nicht im Bildschirm.
     */
    unglueckskartenVon(runde, farbe) {
        const liste = (runde.unglueckskarten && runde.unglueckskarten[farbe])
            ? runde.unglueckskarten[farbe] : [];

        return liste.filter((eintrag) => {
            if (eintrag.art === "vollesGlas") {
                return SCHACH_RUNDE.glasWirkt(runde, farbe);
            }
            return true;
        });
    },

    /*
     * Welche Felder kommen für eine Fähigkeit als Ziel in Frage?
     *
     * Ermittelt durch Ausprobieren: Ein Feld ist ein gültiges Ziel, wenn die
     * Wirkung dort etwas ergibt. Damit kann die Anzeige nicht von der Regel
     * abweichen — es gibt keine zweite Liste von Bedingungen, die veralten
     * könnte. Geprüft wird auf Kopien, damit nichts hängen bleibt.
     */
    zielFelder(runde, spielerId, art, wahl) {
        const alt = SCHACH_RUNDE.normalisieren(runde);
        const farbe = SCHACH_RUNDE.teamVon(alt, spielerId);
        const beschreibung = SCHACH_VARIANTEN.FAEHIGKEITEN[art];

        if (!farbe || !beschreibung || beschreibung.art !== "ziel") {
            return [];
        }

        /*
         * NUR FELDER, DIE DAS EINSETZEN AUCH ANNIMMT (seit v0.94).
         *
         * Dass die Wirkung zustande kommt, ist nur die halbe Frage. Die andere
         * stellt `_wirkungVerboten` — dieselbe Funktion, die auch
         * `faehigkeitEinsetzen` fragt. Bis v0.93 kannte sie nur das Einsetzen;
         * das Brett markierte deshalb Felder, die es hinterher ablehnte.
         *
         * Seit v0.95 wiegt das doppelt: Die Regel ist strenger geworden (kein
         * Schach, kein Matt, kein Patt durch ein Item), also fielen ohne diese
         * Zeile umso mehr Felder erst beim Antippen durch. Die Zugabgabe wird
         * dafür mitgerechnet — sonst wüsste die Regel nicht, wer als Nächster
         * zieht.
         */
        const liste = [];
        for (let feld = 0; feld < SCHACH.felderVon(alt.stand); feld++) {
            const wirkung = SCHACH_RUNDE._zielWirkung(
                SCHACH_RUNDE.kopieren(alt), art, farbe, feld, wahl);

            if (!wirkung) {
                continue;
            }

            const danach = beschreibung.beendetZug
                ? SCHACH_RUNDE._zugAbgebenNachFaehigkeit(wirkung.stand, farbe)
                : wirkung.stand;

            if (SCHACH_RUNDE._wirkungVerboten(alt.stand, danach, farbe,
                !!beschreibung.beendetZug)) {

                continue;
            }
            liste.push(feld);
        }

        return liste;
    },

    /*
     * WELCHE FELDER DIE WIRKUNG BERÜHREN WÜRDE (seit v0.57).
     *
     * Das ist die Auskunft für den Vorschau-Kasten: Der Bildschirm zeigt den
     * Umriss der echten Wirkung, BEVOR man sie einsetzt — drei Felder bei der
     * Mauer, ein 2×2 beim Frost und beim Friedhof, eine Spalte beim Nudelholz.
     *
     * Gefragt wird `_zielWirkung`, also genau die Rechnung, die hinterher auch
     * läuft. Eine zweite Liste von „was passiert wo" wäre eine zweite
     * Wahrheit, und sie veraltete beim ersten Umbau einer Fähigkeit — dieselbe
     * Überlegung wie bei `zielFelder`.
     *
     * Liefert eine leere Liste, wenn die Wirkung dort nicht zustande kommt.
     */
    zielUmriss(runde, spielerId, art, feld, wahl) {
        const alt = SCHACH_RUNDE.normalisieren(runde);
        const farbe = SCHACH_RUNDE.teamVon(alt, spielerId);
        const beschreibung = SCHACH_VARIANTEN.FAEHIGKEITEN[art];

        if (!farbe || !beschreibung || beschreibung.art !== "ziel") {
            return [];
        }

        const wirkung = SCHACH_RUNDE._zielWirkung(
            SCHACH_RUNDE.kopieren(alt), art, farbe, feld, wahl);

        return (wirkung && Array.isArray(wirkung.felder)) ? wirkung.felder.slice() : [];
    },

    /*
     * WIE VIELE BAUERN DER SCHUB UMWANDELN WÜRDE (seit v0.56).
     *
     * Der Bildschirm fragt danach, bevor er den Bauernschub einsetzt: Nur wenn
     * die Antwort grösser als 0 ist, lohnt die Rückfrage nach der Figur.
     *
     * Warum das hier steht und nicht im Bildschirm: Welche Bauern vorrücken
     * und welche dabei die letzte Reihe erreichen, ist eine Regelfrage — sie
     * hängt an freien Feldern, an der Zugrichtung und am Brettmass. Gerechnet
     * wird sie deshalb mit derselben Funktion, die es hinterher wirklich tut.
     */
    schubWandeltUm(runde, spielerId) {
        const alt = SCHACH_RUNDE.normalisieren(runde);
        const farbe = SCHACH_RUNDE.teamVon(alt, spielerId);

        if (!farbe) {
            return 0;
        }

        const wirkung = SCHACH.bauernschub(alt.stand, farbe);
        return (wirkung && wirkung.umgewandelt) ? wirkung.umgewandelt.length : 0;
    },

    /* Die Fähigkeiten, die ein angetipptes Feld brauchen. */
    _zielWirkung(runde, art, farbe, feld, wahl) {
        if (feld < 0 || feld >= SCHACH.felderVon(runde.stand)) {
            return null;
        }

        /*
         * DIE AUFWERTUNG WÜRFELT NICHT, SIE RECHNET (seit v0.56).
         *
         * Beim Springer gibt es zwei Ergebnisse (Läufer oder Turm), und die
         * Entscheidung muss auf jedem Gerät gleich ausfallen — sonst sieht
         * einer einen Läufer und der andere einen Turm, und der erste
         * Schreibvorgang gewinnt. Dieselbe Falle wie in v0.8.
         *
         * Das FELD steht vorn in der Saat: `_zufallsWert` ist FNV-1a, und ein
         * Unterschied im letzten Zeichen verschiebt das Ergebnis nur um
         * Bruchteile. Stünde das Feld hinten, bekämen ganze Feldblöcke
         * dieselbe Figur (siehe die Merksätze in `CLAUDE.md`).
         */
        if (art === "verstaerkung") {
            const saat = feld + "|aufwertung|" + (runde.id || "partie")
                + "|" + runde.zugZaehler;

            return SCHACH.verstaerkung(runde.stand, farbe, feld,
                SCHACH_RUNDE._zufallsWert(saat));
        }

        /* Das Erdbeben ist seit v0.54 ein Unglückswürfel und braucht kein
           Zielfeld mehr — es steht in `_pechAusloesen`. */

        if (art === "mauer") {
            const wirkung = SCHACH.mauerLegen(runde.stand, feld, wahl === "senkrecht");

            if (!wirkung) {
                return null;
            }

            /*
             * DIE MAUER FRISST DIE LOOTBOX (seit v0.77, Nutzer-Ansage 18.08.)
             * — KEHRT DIE REGEL AUS v0.66 UM.
             *
             * v0.66 (Wunsch #32) hat ein Feld mit Lootbox gar nicht erst als
             * Ziel angeboten. Die Begründung damals: Unter der Mauer ist die
             * Box unsichtbar und unerreichbar, „von aussen dasselbe wie weg" —
             * also lieber die Mauer woanders hin.
             *
             * Der Nutzer will es andersherum: „Die Mauer soll man auf alle
             * Felder platzieren können, wo es von den Figuren und vom Brettrand
             * her geht. Sobald man die Mauer dahin platziert, wo davor eine
             * Lootbox stand, verschwindet diese — sie wird gefressen."
             *
             * Damit wird aus dem „dasselbe wie weg" ein ehrliches Weg. Die
             * beiden Nachteile von v0.66 fallen mit: Man muss beim Platzieren
             * nicht mehr raten, warum ein Feld nicht geht, und die Mauer ist
             * wieder überall dort legbar, wo sie hingehört. Dass man dabei
             * etwas zerstört, ist die Gegenleistung — beim RISS ist es seit
             * v0.60 genauso, nur ungewollt.
             *
             * Der Bildschirm blendet die Lootboxen aus, solange man eine Mauer
             * platziert (`team-schach-brett.js`) — dieselbe Hilfe wie beim
             * Friedhof seit v0.57: Was in diesem Moment nicht zur Wahl gehört,
             * lenkt nur ab.
             */
            const gefressen = runde.bonus.filter(
                (eintrag) => wirkung.felder.indexOf(eintrag.feld) !== -1);

            if (gefressen.length > 0) {
                runde.bonus = runde.bonus.filter(
                    (eintrag) => wirkung.felder.indexOf(eintrag.feld) === -1);

                wirkung.text += ", frisst " + gefressen.length
                    + (gefressen.length === 1 ? " Lootbox" : " Lootboxen");
            }

            return wirkung;
        }

        /*
         * DER FRIEDHOF WECKT, WER GENAU DORT GEFALLEN IST (seit v0.54).
         *
         * Die Geweckten werden aus der Grabliste verbraucht; `verloren` bleibt
         * unangetastet, damit die Bilanz weiter zählt, was wirklich geschlagen
         * wurde.
         *
         * Bis v0.53 nahm er die vier ZULETZT gefallenen Gegner und stellte sie
         * auf ein beliebiges freies 2×2-Feld. Auf Nutzer-Ansage ist daraus eine
         * andere Regel geworden: Man sieht auf dem Brett, WO die Gefallenen
         * liegen, wählt ein 2×2-Feld — und genau die, die dort fielen, stehen
         * dort wieder auf, jeder auf seinem eigenen Feld.
         *
         * Das macht die Fähigkeit ortsgebunden statt beliebig: Sie ist stark,
         * wo viel gestorben ist, und nutzlos auf einem leeren Flügel.
         */
        if (art === "friedhof") {
            const gegner = SCHACH.gegner(farbe);
            const gefallene = runde.gefallen[gegner] || [];

            if (gefallene.length === 0) {
                return null;
            }

            const block = SCHACH.friedhofsFelder(runde.stand, feld);
            if (!block) {
                return null;
            }

            /* Wer liegt in diesem Block? Je Feld höchstens einer — fielen dort
               mehrere, steht der zuletzt gefallene auf. */
            const dort = [];
            const benutzt = [];

            for (let stelle = gefallene.length - 1; stelle >= 0; stelle--) {
                const eintrag = gefallene[stelle];

                if (block.indexOf(eintrag.feld) === -1
                    || benutzt.indexOf(eintrag.feld) !== -1) {
                    continue;
                }
                benutzt.push(eintrag.feld);
                dort.push({ stelle: stelle, art: eintrag.art, feld: eintrag.feld });
            }

            if (dort.length === 0) {
                return null;
            }

            const wirkung = SCHACH.friedhof(runde.stand, farbe, feld,
                dort.map((eintrag) => ({ art: eintrag.art, feld: eintrag.feld })));

            if (!wirkung) {
                return null;
            }

            /* Nur die verbraucht, die wirklich aufgestanden sind. */
            const geweckt = dort
                .filter((eintrag) => wirkung.felder.indexOf(eintrag.feld) !== -1)
                .map((eintrag) => eintrag.stelle);

            runde.gefallen[gegner] = gefallene.filter(
                (eintrag, stelle) => geweckt.indexOf(stelle) === -1);

            return wirkung;
        }

        if (art === "schutzschild") {
            const figur = SCHACH.figurAuf(runde.stand, feld);
            /* Auf den König wirkt das Schild nicht — sonst wäre "Schachmatt"
               nicht mehr eindeutig. Dieselbe Überlegung wie beim Doppelbrett. */
            if (SCHACH.farbeVon(figur) !== farbe || SCHACH.artVon(figur) === "K") {
                return null;
            }
            const stand = Object.assign({}, runde.stand, {
                schildFeld: feld,
                schildFarbe: farbe
            });
            return { stand: stand, felder: [feld], text: SCHACH.artName(SCHACH.artVon(figur)) };
        }

        if (art === "fessel") {
            const figur = SCHACH.figurAuf(runde.stand, feld);
            const gegner = SCHACH.gegner(farbe);
            /* Der König wird nicht gefesselt: Wer im Schach steht und nicht
               ziehen darf, wäre ohne eigenen Fehler matt. */
            if (SCHACH.farbeVon(figur) !== gegner || SCHACH.artVon(figur) === "K") {
                return null;
            }
            const stand = Object.assign({}, runde.stand, {
                fesselFeld: feld,
                fesselFarbe: gegner,

                /* Seit v0.56 hält sie mehrere Züge — gemessen am Takt, der
                   einzigen Uhr, die nicht zurückspringt. */
                fesselBis: runde.stand.takt + SCHACH.FESSEL_HALBZUEGE
            });
            return { stand: stand, felder: [feld], text: SCHACH.artName(SCHACH.artVon(figur)) };
        }

        /*
         * DER FROST SPERRT SEIT v0.56 EINEN 2×2-BLOCK.
         *
         * Angetippt wird die linke obere Ecke — dieselbe Lesart wie beim
         * Friedhof.
         *
         * WO ER SICH SETZEN LÄSST (seit v0.73, Meldung I10, Nutzer-Entscheidung
         * 09.08.: „eigenen helfen oder Gegner blockieren"). Bis v0.72 musste
         * wenigstens eine GEGNERISCHE Figur im Block stehen. Jetzt zählt jede
         * Figur, gleich welcher Farbe: Eingefroren heisst auch unantastbar, und
         * genau das kann man für die eigenen Leute wollen.
         *
         * Ein LEERER Block bleibt trotzdem draussen. Er friert nichts ein und
         * wäre ein verschenkter Würfel; ausserdem stünden auf einem leeren Brett
         * sonst hunderte gültiger Ziele.
         *
         * Eingefroren wird alles im Block, auch eigene Figuren
         * (Nutzer-Entscheidung 08.08.) und seit v0.80 auch Könige. WAS das für
         * eine Figur bedeutet, entscheidet `SCHACH.eingefroren` und nicht die
         * Auswahl hier: nicht heraus, aber im Block beweglich.
         */
        if (art === "frost") {
            const gegner = SCHACH.gegner(farbe);
            const block = SCHACH.frostBlock(runde.stand, feld);

            if (!block) {
                return null;
            }

            /*
             * SEIT v0.80 ZÄHLT AUCH EIN KÖNIG ALS TREFFER.
             *
             * Bis v0.79 stand hier `artVon(figur) !== "K"` — Könige konnten
             * nicht einfrieren, ein Block mit nur einem König war deshalb kein
             * gültiges Ziel. Genau diesen Fall hat der Nutzer verlangt: „Wenn
             * im Frostbereich nur ein König ist, kann er nicht raus." Ohne
             * diese Zeile wäre die Regel in `SCHACH.eingefroren` gebaut und
             * hier trotzdem nicht anwählbar gewesen.
             *
             * Ein LEERER Block bleibt draussen: Er friert nichts ein und wäre
             * eine verschenkte Lootbox — dafür gibt es die Mauer.
             */
            const trifft = block.filter(
                (platz) => SCHACH.figurAuf(runde.stand, platz) !== ".");

            if (trifft.length === 0) {
                return null;
            }

            const stand = Object.assign({}, runde.stand, {
                frostFeld: block[0],
                frostFelder: block.slice(),
                frostFarbe: gegner
            });

            return { stand: stand, felder: block.slice(), wege: [],
                text: trifft.length + (trifft.length === 1 ? " Figur" : " Figuren") };
        }

        if (art === "spiegel") {
            return SCHACH.spiegel(runde.stand, farbe, feld);
        }

        /* Die zwei gewöhnlichen von v0.79 — die Regel steht bei ihnen selbst
           in `schach.js`, hier wird nur durchgereicht. */
        if (art === "schubs") {
            return SCHACH.schubs(runde.stand, farbe, feld);
        }

        if (art === "platztausch") {
            /* `wahl` ist hier die RICHTUNG (seit v0.101) — dasselbe Muster wie
               die Lage der Mauer, nur mit vier Möglichkeiten statt zwei. */
            return SCHACH.platztausch(runde.stand, farbe, feld, wahl);
        }

        if (art === "nudelholz") {
            /*
             * EINE BAHN, RICHTUNG FREI (seit v0.117, Nutzer-Entscheidung
             * 22.08. — vorher: zwei Spalten, immer von der eigenen Seite
             * weg). Die Richtung reist wie bei der Mauer als Zusatzwahl
             * `wahl` herein: der Rand, VON dem gerollt wird ("unten",
             * "oben", "links", "rechts", Brett-Koordinaten). Ohne Wahl gilt
             * die eigene Seite — für Weiss unten, für Schwarz oben; so
             * rollt es wie früher von einem weg.
             *
             * Antippbar sind die Felder des gewählten RANDES — dort setzt
             * das Holz an und bestimmt so die Spalte oder Reihe.
             */
            const kante = SCHACH.NUDELHOLZ_KANTEN[wahl]
                ? wahl
                : ((farbe === SCHACH.WEISS) ? "unten" : "oben");

            const breite = SCHACH.breiteVon(runde.stand);
            const hoehe = SCHACH.hoeheVon(runde.stand);
            const reihe = SCHACH.reiheVon(feld, breite);
            const spalte = SCHACH.spalteVon(feld, breite);

            const amRand = (kante === "unten" && reihe === hoehe - 1)
                || (kante === "oben" && reihe === 0)
                || (kante === "links" && spalte === 0)
                || (kante === "rechts" && spalte === breite - 1);

            if (!amRand) {
                return null;
            }
            return SCHACH.nudelholz(runde.stand, feld, kante);
        }

        /*
         * Wiederbelebung: Die Figur kehrt an ihr Grab zurück.
         *
         * Gesucht wird der ZULETZT auf diesem Feld gefallene eigene Stein —
         * fielen dort mehrere nacheinander, kommt der jüngste zuerst wieder.
         * Der Eintrag wird verbraucht, sonst liesse sich dieselbe Figur mit
         * einer zweiten Wiederbelebung noch einmal holen.
         */
        if (art === "wiederbelebung") {
            const gefallene = runde.gefallen[farbe];
            if (!gefallene || gefallene.length === 0) {
                return null;
            }

            let stelle = -1;
            for (let nummer = gefallene.length - 1; nummer >= 0; nummer--) {
                if (gefallene[nummer].feld === feld) {
                    stelle = nummer;
                    break;
                }
            }
            if (stelle === -1) {
                return null;
            }

            const wirkung = SCHACH.wiedergeburt(
                runde.stand, farbe, feld, gefallene[stelle].art);

            if (!wirkung) {
                return null;
            }

            gefallene.splice(stelle, 1);
            return wirkung;
        }

        /*
         * Nachschub (seit v0.61): ein NEUER Bauer auf der eigenen Grundreihe.
         * Kein Vorrat dahinter — anders als Wiedergeburt und Wiederbelebung
         * verbraucht er nichts, er erschafft. Deshalb steht er auch nicht in
         * `_gefalleneVorhanden`.
         */
        if (art === "nachschub") {
            /* Dieselbe Rechnung wie bei der Wiedergeburt darunter: die eigene
               Grundreihe, unten für Weiss und oben für Schwarz. */
            const grundreihe = (farbe === "weiss") ? SCHACH.hoeheVon(runde.stand) - 1 : 0;
            if (SCHACH.reiheVon(feld, SCHACH.breiteVon(runde.stand)) !== grundreihe) {
                return null;
            }
            return SCHACH.wiedergeburt(runde.stand, farbe, feld, "B");
        }

        if (art === "wiedergeburt") {
            const verloren = runde.verloren[farbe];
            if (!verloren || verloren.length === 0) {
                return null;
            }
            const grundreihe = (farbe === "weiss") ? SCHACH.hoeheVon(runde.stand) - 1 : 0;
            if (SCHACH.reiheVon(feld, SCHACH.breiteVon(runde.stand)) !== grundreihe) {
                return null;
            }

            const figurArt = verloren[verloren.length - 1];
            const wirkung = SCHACH.wiedergeburt(runde.stand, farbe, feld, figurArt);
            if (!wirkung) {
                return null;
            }
            verloren.pop();
            return wirkung;
        }

        return null;
    },

    /* ---------------------------------------------------------------- *
     * Der Händler (seit v3.3)
     *
     * Er unterscheidet sich von jeder anderen Fähigkeit darin, dass man ihn
     * ANSEHEN kann, bevor man ihn benutzt: Das Angebot steht fest, sobald die
     * Fähigkeit im Vorrat liegt, und ändert sich erst mit dem nächsten Zug.
     * Deshalb kostet ein Ablehnen nichts — man kann nicht so lange neu würfeln,
     * bis das Angebot passt, denn dazwischen liegt immer ein Zug.
     * ---------------------------------------------------------------- */

    /*
     * Das Angebot für diese Farbe, oder null, wenn gerade keines möglich ist.
     * Liefert:
     *
     *     {
     *         gibt:     { art, anzahl },
     *         bekommt:  { art, anzahl },
     *         gibtFelder:    [Felder, die geräumt werden],
     *         bekommtFelder: [Felder, auf denen Neues erscheint],
     *         text: "3 Bauern gegen 1 Springer"
     *     }
     *
     * Gerechnet, nicht gewürfelt: Alle Geräte sehen dasselbe Angebot.
     */
    handelsAngebot(runde, farbe) {
        const stand = SCHACH_RUNDE.normalisieren(runde);

        if (farbe !== "weiss" && farbe !== "schwarz") {
            return null;
        }

        const marke = (stand.id || "partie") + "|handel|" + stand.zugZaehler + "|" + farbe;
        const angebot = SCHACH_VARIANTEN.handelZiehen(SCHACH_RUNDE._zufallsWert(marke));

        /*
         * WELCHE Figuren weggehen, entscheidet nicht der Spieler: Er tippt
         * sonst fünf Felder nacheinander an, und bei jedem Fehlgriff wäre der
         * Handel dahin. Genommen werden die HINTERSTEN — die, die am weitesten
         * von der gegnerischen Grundreihe entfernt stehen. Das ist die Wahl,
         * die man ohnehin fast immer treffen würde, und sie ist vorhersagbar.
         */
        /*
         * Seit v0.58 kann eine Seite MEHRERE Figurenarten tragen („Dame und
         * Bauer gegen einen König"). Gesammelt wird je Art getrennt; fehlt an
         * einer Stelle etwas, kommt der Handel nicht zustande.
         */
        const gibtTeile = SCHACH_VARIANTEN.handelSeite(angebot.gibt);
        const gibtAnzahl = SCHACH_VARIANTEN.handelAnzahl(angebot.gibt);
        const gibtFelder = [];

        for (const teil of gibtTeile) {
            const felder = SCHACH_RUNDE._hintersteFiguren(
                stand, farbe, teil.art, teil.anzahl);

            if (felder.length < teil.anzahl) {
                return null;
            }
            for (const feld of felder) {
                gibtFelder.push(feld);
            }
        }

        if (gibtFelder.length < gibtAnzahl) {
            return null;
        }

        /*
         * Die neuen Figuren erscheinen auf den frei werdenden Feldern; reichen
         * die nicht, kommen freie Felder der eigenen Grundreihe dazu. So bleibt
         * der Handel dort, wo die abgegebenen Figuren standen — und nicht
         * plötzlich in der gegnerischen Hälfte.
         */
        const bekommtAnzahl = SCHACH_VARIANTEN.handelAnzahl(angebot.bekommt);
        const bekommtFelder = SCHACH_RUNDE._handelsPlaetze(
            stand, farbe, gibtFelder, bekommtAnzahl);

        if (bekommtFelder.length < bekommtAnzahl) {
            return null;
        }

        return {
            gibt: angebot.gibt,
            bekommt: angebot.bekommt,
            gibtFelder: gibtFelder,
            bekommtFelder: bekommtFelder,
            text: SCHACH_RUNDE._handelsText(angebot.gibt)
                + " gegen " + SCHACH_RUNDE._handelsText(angebot.bekommt)
        };
    },

    /* Die Mehrzahl der Figurennamen — im Deutschen nicht ableitbar. */
    FIGUR_MEHRZAHL: {
        B: "Bauern", S: "Springer", L: "Läufer",
        T: "Türme", D: "Damen", K: "Könige"
    },

    /* „3 Bauern" — und seit v0.58 auch „1 Dame und 1 Bauer". */
    _handelsText(seite) {
        return SCHACH_VARIANTEN.handelSeite(seite)
            .map((teil) => teil.anzahl + " " + ((teil.anzahl === 1)
                ? SCHACH.artName(teil.art)
                : (SCHACH_RUNDE.FIGUR_MEHRZAHL[teil.art] || SCHACH.artName(teil.art))))
            .join(" und ");
    },

    /*
     * Die `anzahl` eigenen Figuren dieser Art, die am weitesten hinten stehen.
     * „Hinten" heisst: nah an der eigenen Grundreihe.
     */
    _hintersteFiguren(runde, farbe, art, anzahl) {
        const stand = runde.stand;
        const breite = SCHACH.breiteVon(stand);
        const eigene = [];

        for (let feld = 0; feld < SCHACH.felderVon(stand); feld++) {
            const figur = SCHACH.figurAuf(stand, feld);

            if (SCHACH.farbeVon(figur) === farbe && SCHACH.artVon(figur) === art) {
                eigene.push(feld);
            }
        }

        /* Weiss steht unten (grosse Reihennummern), Schwarz oben. */
        eigene.sort((einer, anderer) => {
            const reiheEiner = SCHACH.reiheVon(einer, breite);
            const reiheAnderer = SCHACH.reiheVon(anderer, breite);

            return (farbe === "weiss")
                ? (reiheAnderer - reiheEiner) || (einer - anderer)
                : (reiheEiner - reiheAnderer) || (einer - anderer);
        });

        return eigene.slice(0, anzahl);
    },

    /*
     * Den Handel wirklich durchführen: erst alle abgegebenen Felder räumen,
     * dann die neuen Figuren setzen.
     *
     * Die Reihenfolge ist Absicht — Räumen und Setzen können sich dieselben
     * Felder teilen (die neue Figur erscheint da, wo die alte stand). Würde man
     * abwechselnd räumen und setzen, löschte das Räumen eine gerade gesetzte
     * Figur wieder weg. Dieselbe Falle wie bei der Rochade auf schmalen
     * Brettern (siehe docs\DECISIONS.md).
     */
    /* Wie viele Fähigkeiten der Dieb höchstens mitnimmt (seit v0.85). */
    DIEB_BEUTE: 2,

    /*
     * WAS DER DIEB DIESMAL ERWISCHT — gerechnet, nicht gewürfelt.
     *
     * Dieselbe Vorsichtsmassnahme wie beim Händler: Der Bildschirm fragt das
     * hier ab, um die Beute ZU ZEIGEN, und das Modell rechnet sie beim
     * Einsetzen NEU. Sonst könnte ein Gerät mit veraltetem Stand eine Beute
     * durchsetzen, die es so nicht mehr gibt.
     *
     * Die Saat hängt am Zugzähler — nach dem nächsten Zug greift der Dieb also
     * woanders zu. Wer ablehnt, kann damit nicht so lange neu fragen, bis ihm
     * die Auswahl passt.
     *
     * Rückgabe: `{ opfer, stellen, arten }` oder `null`, wenn nichts zu holen
     * ist. `stellen` steht ABSTEIGEND — nur so bleiben die Positionen gültig,
     * während sie der Reihe nach aus dem Vorrat entfernt werden.
     */
    diebesBeute(runde, farbe) {
        const voll = SCHACH_RUNDE.normalisieren(runde);

        if (farbe !== "weiss" && farbe !== "schwarz") {
            return null;
        }

        const opfer = SCHACH.gegner(farbe);
        const vorrat = Array.isArray(voll.faehigkeiten[opfer])
            ? voll.faehigkeiten[opfer] : [];

        if (vorrat.length === 0) {
            return null;
        }

        const marke = (voll.id || "partie") + "|dieb|" + voll.zugZaehler + "|" + farbe;
        const wieViele = Math.min(SCHACH_RUNDE.DIEB_BEUTE, vorrat.length);

        /* Aus den noch nicht gegriffenen Plätzen wird gezogen — so kommt
           dieselbe Stelle nie zweimal, auch wenn zwei gleiche Fähigkeiten
           nebeneinander liegen. */
        const uebrig = vorrat.map((art, stelle) => stelle);
        const stellen = [];

        for (let nummer = 0; nummer < wieViele; nummer++) {
            const wert = SCHACH_RUNDE._zufallsWert(marke + "|" + nummer);
            const wahl = Math.min(Math.floor(wert * uebrig.length), uebrig.length - 1);

            stellen.push(uebrig[wahl]);
            uebrig.splice(wahl, 1);
        }

        stellen.sort((eine, andere) => andere - eine);

        return {
            opfer: opfer,
            stellen: stellen,
            arten: stellen.map((stelle) => vorrat[stelle])
        };
    },

    /*
     * Der Diebstahl selbst. Er fasst als einzige Wirkung NICHT das Brett an,
     * sondern die beiden Vorräte — deshalb gibt er den Stand unverändert
     * zurück und meldet keine betroffenen Felder.
     */
    _diebstahlAusfuehren(runde, farbe) {
        const beute = SCHACH_RUNDE.diebesBeute(runde, farbe);
        if (!beute) {
            return null;
        }

        /* Erst wegnehmen (von hinten nach vorn, sonst verrutschen die
           Positionen), dann gutschreiben. Angehängt wird hinten — die Stelle,
           an der der Dieb selbst liegt, muss gültig bleiben: Der Aufrufer
           entfernt ihn gleich über genau diesen Index. */
        for (const stelle of beute.stellen) {
            runde.faehigkeiten[beute.opfer].splice(stelle, 1);
        }

        for (const art of beute.arten) {
            runde.faehigkeiten[farbe].push(art);
        }

        return {
            stand: runde.stand,
            felder: [],
            text: beute.arten
                .map((art) => SCHACH_VARIANTEN.faehigkeitTitel(art))
                .join(" und ")
        };
    },

    _handelAusfuehren(runde, farbe) {
        const angebot = SCHACH_RUNDE.handelsAngebot(runde, farbe);
        if (!angebot) {
            return null;
        }

        let brett = runde.stand.brett;

        for (const feld of angebot.gibtFelder) {
            brett = SCHACH._brettMit(brett, feld, ".");
        }

        /* Die Plätze werden der Reihe nach vergeben — erst die erste
           Figurenart, dann die nächste (seit v0.58 können es mehrere sein). */
        let stelle = 0;
        let bringtKoenig = false;

        for (const teil of SCHACH_VARIANTEN.handelSeite(angebot.bekommt)) {
            const figur = (farbe === "weiss") ? teil.art : teil.art.toLowerCase();

            if (teil.art === "K") {
                bringtKoenig = true;
            }

            for (let nummer = 0; nummer < teil.anzahl; nummer++) {
                brett = SCHACH._brettMit(brett, angebot.bekommtFelder[stelle], figur);
                stelle++;
            }
        }

        const stand = Object.assign({}, runde.stand, { brett: brett, enPassant: "" });

        /*
         * Ein erhandelter König ist ein zweites LEBEN, kein unschlagbarer
         * Klotz — derselbe Schalter wie bei der Verstärkung (siehe
         * `SCHACH.koenigSchlagbarFuer`). Ohne ihn wäre „Schachmatt" nicht mehr
         * eindeutig.
         */
        if (bringtKoenig) {
            stand.koenigeAlsLeben = true;
        }

        return {
            stand: stand,
            felder: angebot.gibtFelder.concat(angebot.bekommtFelder)
                .filter((feld, stelle2, alle) => alle.indexOf(feld) === stelle2),
            text: angebot.text
        };
    },

    /* Wohin die eingetauschten Figuren kommen: erst die frei werdenden Felder,
       dann freie Felder der eigenen Grundreihe. */
    _handelsPlaetze(runde, farbe, gibtFelder, anzahl) {
        const stand = runde.stand;
        const breite = SCHACH.breiteVon(stand);
        const hoehe = SCHACH.hoeheVon(stand);
        const plaetze = gibtFelder.slice(0, anzahl);

        if (plaetze.length >= anzahl) {
            return plaetze;
        }

        const grundreihe = (farbe === "weiss") ? hoehe - 1 : 0;

        for (let spalte = 0; spalte < breite && plaetze.length < anzahl; spalte++) {
            const feld = SCHACH._feld(stand, grundreihe, spalte);

            if (SCHACH.figurAuf(stand, feld) === "."
                && !SCHACH.mauerAuf(stand, feld)
                && plaetze.indexOf(feld) === -1) {
                plaetze.push(feld);
            }
        }

        return plaetze;
    },

    _verlaufKuerzen(runde) {
        while (runde.verlauf.length > SCHACH_RUNDE.VERLAUF_LAENGE) {
            runde.verlauf.shift();
        }
    },
});
