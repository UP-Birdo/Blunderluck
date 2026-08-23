/*
 * team-schach-brett.js - das Brett und alles darauf.
 *
 * Teil des Bildschirms TEAM_SCHACH; der Einstieg steht in team-schach.js.
 * Diese Datei ERGAENZT dasselbe Objekt, statt ein zweites daneben zu stellen -
 * so bleiben alle Aufrufe (TEAM_SCHACH._brettBauen und so weiter) unveraendert,
 * und die Aufteilung ist eine reine Frage der Lesbarkeit.
 *
 * WICHTIG: Diese Datei wird NACH team-schach.js geladen (index.html).
 *
 * Hier drin: das Brett selbst, die Randbeschriftung, der Zugpfeil, die Wuerfel,
 * die Abstimmung ueber einen Vorschlag und die Bewegungen.
 */

Object.assign(TEAM_SCHACH, {

    /*
     * DER FROST-RAHMEN (seit v0.56) — gebraucht an ZWEI Stellen.
     *
     * Der Frost sperrt seit v0.56 einen 2×2-Block, und ein Block soll auch
     * wie einer aussehen: Die Linie läuft nur aussen herum, innen bleibt sie
     * weg. Dafür fragt jedes Feld seine vier Nachbarn — liegt der Nachbar
     * auch im Block, fällt die Kante zu ihm hin weg. Dieselbe Bauweise wie
     * bei der Mauer (`mauer-anfang` / `mauer-ende`), nur in beide Richtungen.
     *
     * Die Funktion steht hier und nicht zweimal, weil das echte Brett und das
     * Beispielbrett der Anleitung (`_beispielBrettBauen`) beide zeichnen
     * müssen. Zwei Fassungen liefen früher oder später auseinander.
     *
     * Liefert true, wenn dieses Feld eingefroren ist.
     */
    _frostKanten(stand, feld, zelle) {
        if (SCHACH.frostFelder(stand).indexOf(feld) === -1) {
            return false;
        }

        zelle.classList.add("feld-frost");
        TEAM_SCHACH._umrissKanten(stand, feld, SCHACH.frostFelder(stand), zelle);
        return true;
    },

    /*
     * DIE AUSSENKANTEN EINER FELDERGRUPPE (seit v0.57 eigenständig).
     *
     * Setzt `kante-oben` bis `kante-rechts` auf die Seiten, an denen die
     * Gruppe aufhört. Die Stildatei macht daraus einen durchgehenden Rahmen;
     * WELCHE Farbe er hat, entscheidet die Klasse daneben (`feld-frost`
     * blau, `feld-vorschau` grün).
     *
     * Zwei Nutzer teilen sich das: der eingefrorene Block und der
     * Vorschau-Kasten beim Platzieren. Zwei Fassungen liefen früher oder
     * später auseinander — und der Vorschau-Kasten muss genau so aussehen wie
     * das, was danach dasteht.
     */
    _umrissKanten(stand, feld, gruppe, zelle) {
        const breite = SCHACH.breiteVon(stand);
        const reihe = SCHACH.reiheVon(feld, breite);
        const spalte = SCHACH.spalteVon(feld, breite);

        const dabei = (r, s) => SCHACH._imBrett(stand, r, s)
            && gruppe.indexOf(SCHACH._feld(stand, r, s)) !== -1;

        if (!dabei(reihe - 1, spalte)) { zelle.classList.add("kante-oben"); }
        if (!dabei(reihe + 1, spalte)) { zelle.classList.add("kante-unten"); }
        if (!dabei(reihe, spalte - 1)) { zelle.classList.add("kante-links"); }
        if (!dabei(reihe, spalte + 1)) { zelle.classList.add("kante-rechts"); }
    },

    /* ---------------------------------------------------------------- *
     * WAS SICH SEIT DEM LETZTEN ZEICHNEN GEÄNDERT HAT (seit v0.77)
     *
     * Grundlage der kleinen Animationen: Eine Lootbox, die erscheint, eine,
     * die verschwindet, eine Figur, die dazukommt, und eine, die geschlagen
     * wird (Nutzer-Wunsch 18.08., ausdrücklich „keine Farben und sehr simpel").
     *
     * WARUM VERGLICHEN UND NICHT AUS DEM VERLAUF GELESEN. Der Verlauf sagt,
     * was jemand GETAN hat; die Animation soll zeigen, was auf dem Brett
     * ANDERS ist. Das ist nicht dasselbe: Eine Lootbox verschwindet auch, wenn
     * eine Mauer sie frisst (v0.77) oder ein Riss sie verschluckt (v0.60), und
     * für jeden dieser Wege einen eigenen Verlaufseintrag zu deuten hiesse,
     * die Liste bei jeder neuen Regel nachzupflegen. Der Vergleich kennt sie
     * alle, ohne einen davon zu kennen.
     *
     * DER ERSTE ANBLICK ANIMIERT NIE. Wer eine Partie öffnet, sähe sonst die
     * ganze Stellung auf einmal aufpoppen. Dasselbe beim Wechsel der Partie —
     * und wenn sich das BRETTMASS geändert hat (Ausdehnung, Einsturz), denn
     * dann zeigen dieselben Feldnummern woanders hin.
     *
     * Liefert vier Listen von Feldnummern.
     * ---------------------------------------------------------------- */
    _letzterAnblick: null,

    _veraenderungen(partie) {
        const nichts = { boxenNeu: [], boxenWeg: [], figurenNeu: [], schlaege: [] };

        const jetzt = {
            partie: partie.id || "",
            brett: partie.stand.brett,
            boxen: SCHACH_RUNDE.offeneBonusFelder(partie).map((eintrag) => eintrag.feld)
        };
        const vorher = TEAM_SCHACH._letzterAnblick;
        TEAM_SCHACH._letzterAnblick = jetzt;

        if (!vorher || vorher.partie !== jetzt.partie
            || vorher.brett.length !== jetzt.brett.length) {
            return nichts;
        }

        /*
         * WIE VIELE FIGUREN JE FARBE DAZUGEKOMMEN SIND — die Frage, an der
         * „erschienen" und „hingezogen" auseinandergehen.
         *
         * Ein freies Feld, auf dem plötzlich eine Figur steht, ist meistens
         * nur das Ziel eines Zuges; dort ist nichts erschienen, dort ist etwas
         * angekommen. Wirklich NEU ist eine Figur nur, wenn ihre Farbe
         * insgesamt mehr Figuren hat als vorher — so entstehen Nachschub,
         * Spiegel, Wiedergeburt, Wiederbelebung und Friedhof, und so entsteht
         * kein Zug.
         */
        const zaehlen = (brett, gross) => {
            let anzahl = 0;
            for (let stelle = 0; stelle < brett.length; stelle++) {
                const zeichen = brett[stelle];
                if (zeichen === ".") {
                    continue;
                }
                if ((zeichen === zeichen.toUpperCase()) === gross) {
                    anzahl++;
                }
            }
            return anzahl;
        };

        const mehrWeiss = zaehlen(jetzt.brett, true) > zaehlen(vorher.brett, true);
        const mehrSchwarz = zaehlen(jetzt.brett, false) > zaehlen(vorher.brett, false);

        const figurenNeu = [];
        const schlaege = [];

        for (let feld = 0; feld < jetzt.brett.length; feld++) {
            const alt = vorher.brett[feld];
            const neu = jetzt.brett[feld];

            if (alt === neu) {
                continue;
            }

            if (alt === "." && neu !== ".") {
                const weiss = (neu === neu.toUpperCase());
                if (weiss ? mehrWeiss : mehrSchwarz) {
                    figurenNeu.push(feld);
                }
                continue;
            }

            /*
             * EIN SCHLAG IST EIN FARBWECHSEL AUF EINEM FELD. Stand dort eben
             * noch Schwarz und jetzt Weiss, hat Weiss dort geschlagen —
             * gleich, ob durch einen Zug oder durch eine Fähigkeit.
             *
             * Zwei Fälle fallen bewusst nicht darunter: das Schlagen im
             * Vorbeigehen (der Bauer fällt auf einem ANDEREN Feld als dem
             * Zielfeld) und eine Figur, die ohne Nachrücker verschwindet.
             * Beides wäre nur mit einer zweiten Quelle sauber zu erkennen, und
             * ein leeres Feld, das kurz aufblitzt, erklärt niemandem etwas.
             */
            if (alt !== "." && neu !== "."
                && (alt === alt.toUpperCase()) !== (neu === neu.toUpperCase())) {
                schlaege.push(feld);
            }
        }

        return {
            boxenNeu: jetzt.boxen.filter((feld) => vorher.boxen.indexOf(feld) === -1),
            boxenWeg: vorher.boxen.filter((feld) => jetzt.boxen.indexOf(feld) === -1),
            figurenNeu: figurenNeu,
            schlaege: schlaege
        };
    },

    _brettBauen(partie, person) {
        const halter = TEAM_SCHACH._element("div", "brett-halter");

        const meinTeam = SCHACH_RUNDE.teamVon(partie, person.id);

        /* Jeder blickt von SEINER Seite auf das Brett, wie am echten Tisch —
           seit v0.72 in vier Lagen statt zweien (siehe `_drehungVon`). */
        const drehung = TEAM_SCHACH._drehungVon(partie, meinTeam);
        const quer = (drehung % 2) === 1;

        const stand = partie.stand;
        const breite = SCHACH.breiteVon(stand);
        const hoehe = SCHACH.hoeheVon(stand);
        const felder = breite * hoehe;

        /* Bei einer Vierteldrehung tauschen Breite und Höhe der ANSICHT. */
        const zeigeSpalten = quer ? hoehe : breite;

        const brett = TEAM_SCHACH._element("div", "brett");

        /*
         * Spaltenzahl und Höchstbreite gehen als Stil-Variablen an die
         * Stildatei — dort rechnet sie daraus auch die Schriftgröße der
         * Figuren. So bleibt alles Aussehen in der Stildatei, und ein breites
         * Brett schrumpft auf dem Handy von selbst mit.
         */
        brett.style.setProperty("--brett-spalten", String(zeigeSpalten));
        brett.style.setProperty("--brett-max", Math.min(64 * zeigeSpalten, 900) + "px");

        /* Gemerkt für _figurGroesseSetzen: Die Schriftgröße der Figuren lässt
           sich erst messen, wenn das Brett im Bildschirm steht. */
        TEAM_SCHACH.brettEl = brett;

        const darfZiehen = SCHACH_RUNDE.darfZiehen(partie, person.id);
        const bonus = SCHACH_RUNDE.offeneBonusFelder(partie);
        const glas = TEAM_SCHACH._glasWirkt(partie, meinTeam);

        /*
         * WANN DIE GRÄBER BLASS ZU SEHEN SIND (seit v0.57 für BEIDE
         * Fähigkeiten, vorher nur beim Friedhof).
         *
         * Friedhof und Wiederbelebung holen etwas von einem bestimmten FELD —
         * ohne zu sehen, wo etwas liegt, tippt man ins Blaue. Der Unterschied
         * steckt nur darin, WESSEN Gefallene gemeint sind, und das beantwortet
         * `_grabAuf`.
         */
        const graeberZeigen = (TEAM_SCHACH.zielFaehigkeit === "friedhof"
            || TEAM_SCHACH.zielFaehigkeit === "wiederbelebung");

        /*
         * WANN DIE LOOTBOXEN AUSBLEIBEN.
         *
         * Zwei Gründe, dieselbe Wirkung:
         *
         *   Gräber (seit v0.57)   Friedhof und Wiederbelebung zeigen ihre
         *                         Gefallenen auf genau den Feldern, die auch
         *                         Lootboxen tragen können — beides übereinander
         *                         ist nicht mehr lesbar.
         *   Mauer (seit v0.77)    Sie frisst die Lootbox, über die sie gelegt
         *                         wird (Nutzer-Ansage 18.08., „blende sie aus
         *                         wie beim Friedhof"). Man sucht in diesem
         *                         Moment eine Reihe mit drei freien Feldern,
         *                         nicht eine Box — und was gleich verschwindet,
         *                         soll nicht so aussehen, als sei es noch zu
         *                         holen.
         *
         * In beiden Fällen sind sie nur verborgen, nicht weg: Wer abbricht,
         * sieht sie sofort wieder.
         */
        const wuerfelAusblenden = graeberZeigen
            || (TEAM_SCHACH.zielFaehigkeit === "mauer");

        /* Die Felder, über die zuletzt gezogen wurde — siehe _letzteSpur. */
        const spur = TEAM_SCHACH._letzteSpur(partie);

        /* Was sich seit dem letzten Zeichnen geändert hat — siehe
           `_veraenderungen`. GENAU EINMAL je Zeichnung abfragen: Der Aufruf
           merkt sich den neuen Anblick, ein zweiter fände nichts mehr. */
        const anders = TEAM_SCHACH._veraenderungen(partie);

        for (let anzeige = 0; anzeige < felder; anzeige++) {
            const feld = TEAM_SCHACH._feldZuAnzeige(stand, drehung,
                Math.floor(anzeige / zeigeSpalten), anzeige % zeigeSpalten);

            const zelle = document.createElement("button");
            zelle.type = "button";
            zelle.className = "feld " + (((SCHACH.reiheVon(feld, breite)
                + SCHACH.spalteVon(feld, breite)) % 2 === 0) ? "feld-hell" : "feld-dunkel");
            zelle.dataset.feld = String(feld);
            zelle.setAttribute("aria-label", SCHACH.feldName(feld, breite, hoehe));

            /*
             * Die Spur des letzten Zuges. Sie liegt VOR allem anderen, damit
             * eine Zielmarkierung oder ein Schild sie überschreiben kann —
             * was gerade möglich ist, ist wichtiger als das, was war.
             */
            if (spur.weg[feld]) {
                /* Gelb nur dort, wo wirklich ein Unglück gewirkt hat — der
                   eigene Zug bleibt grün, auch wenn er eine Unglücks-Lootbox
                   eingesammelt hat (seit v0.76). */
                zelle.classList.add(spur.pech[feld] ? "feld-spur-pech" : "feld-spur");
                if (spur.enden[feld]) {
                    zelle.classList.add("feld-spur-ende");
                }
            }
            if (spur.wirkung[feld]) {
                zelle.classList.add("feld-spur-wirkung");
            }

            const figur = SCHACH.figurAuf(stand, feld);
            if (figur !== ".") {
                /* Unter dem vollen Glas sehen die GEGNERISCHEN Figuren anders
                   aus, als sie sind — nur für diese Seite. */
                const getruebt = glas && SCHACH.farbeVon(figur) !== meinTeam;
                const gezeigt = getruebt
                    ? TEAM_SCHACH._glasZeichen(partie, feld, figur)
                    : figur;

                const zeichen = TEAM_SCHACH._element("span",
                    "figur " + (SCHACH.farbeVon(figur) === "weiss" ? "figur-weiss" : "figur-schwarz")
                    + (getruebt ? " figur-getruebt" : "")
                    + ((anders.figurenNeu.indexOf(feld) !== -1) ? " figur-erscheint" : "")
                    + TEAM_SCHACH._figurKlasse(gezeigt),
                    TEAM_SCHACH._figurZeichen(gezeigt));
                zelle.appendChild(zeichen);
            }

            /*
             * Hier wurde gerade geschlagen: ein kurzer grauer Ring, dort wo
             * die gefallene Figur stand. Er liegt UNTER der neuen Figur, nicht
             * an ihrer Stelle — sie ist ja schon da.
             */
            if (anders.schlaege.indexOf(feld) !== -1) {
                zelle.appendChild(TEAM_SCHACH._element("span", "verpufft verpufft-schlag"));
            }

            /* Hier lag bis eben eine Lootbox: eingesammelt, von einer Mauer
               gefressen oder in einen Riss gefallen. Derselbe Ring. */
            if (anders.boxenWeg.indexOf(feld) !== -1) {
                zelle.appendChild(TEAM_SCHACH._element("span", "verpufft verpufft-box"));
            }

            /* Liegt hier ein Würfel mit einer Fähigkeit? Warum er manchmal
               ausbleibt, steht oben bei `wuerfelAusblenden`. */
            const bonusHier = wuerfelAusblenden
                ? null
                : bonus.find((eintrag) => eintrag.feld === feld);

            if (bonusHier) {
                /*
                 * WELCHE Fähigkeit drin ist, verrät die Oberfläche NIE — auch
                 * nicht beim Darüberfahren. Ein Würfel, dessen Inhalt man
                 * vorher lesen kann, ist kein Überraschungswürfel mehr.
                 *
                 * ZWEI GETRENNTE FRAGEN (seit v0.49):
                 *
                 *   `seltenheitZeigen`  Die FARBE — wie selten ist er?
                 *   `pechZeigen`        Das ZEICHEN — ist er schlecht?
                 *                       (umgedrehtes Fragezeichen)
                 *
                 * Bis v0.48 hing beides am ersten Haken, und das Unglück war
                 * ausserdem eine eiserne Regel. Getrennt lässt sich einstellen,
                 * was gemeint war: Farbe ja, Warnung nein — dann ist jeder
                 * Würfel ein Wagnis, sieht aber weiter nach seiner Stufe aus.
                 */
                /*
                 * ENTTARNEN (seit v0.88): Wer sie eingesetzt hat, sieht die
                 * Farbe für ein paar Halbzüge auch dann, wenn die Partie sie
                 * sonst verbirgt. Nur die eigene Ansicht — der Gegner merkt
                 * nichts, deshalb steht die Prüfung hier im Bildschirm und
                 * nicht in den Regeln (wie beim vollen Glas).
                 */
                const enttarnt = !!meinTeam
                    && partie.stand.enttarntFarbe === meinTeam
                    && partie.zugZaehler < partie.stand.enttarntBis;

                /*
                 * VERSTECKEN (seit v0.98): das Gegenstück. Hier steht im Stand
                 * das OPFER — wer das Verstecken abbekommen hat, sieht die
                 * Farbe für ein paar Halbzüge nicht, obwohl die Partie sie
                 * sonst zeigt. Wer sie eingesetzt hat, sieht weiter alles.
                 */
                const versteckt = !!meinTeam
                    && partie.stand.verstecktFarbe === meinTeam
                    && partie.zugZaehler < partie.stand.verstecktBis;

                /*
                 * Die Einstellung der Partie ist der Ausgangspunkt, die zwei
                 * Fähigkeiten drehen sie je Seite und auf Zeit. Zusammentreffen
                 * können sie nicht: Enttarnen gibt es nur ohne, Verstecken nur
                 * mit `seltenheitZeigen`.
                 */
                const zeigen = ((partie.regeln.seltenheitZeigen !== false) && !versteckt)
                    || enttarnt;
                const pechZeigen = (partie.regeln.pechZeigen === true)
                    && !!bonusHier.pech;
                const stufe = SCHACH_RUNDE.bonusStufe(bonusHier);

                zelle.classList.add("feld-bonus");
                if (anders.boxenNeu.indexOf(feld) !== -1) {
                    zelle.classList.add("feld-bonus-neu");
                }
                zelle.title = "Lootbox"
                    + (zeigen ? " — " + stufe.titel : "")
                    + (pechZeigen ? (zeigen ? ", Unglück" : " — Unglück") : "");
                zelle.setAttribute("aria-label",
                    SCHACH.feldName(feld, breite, hoehe) + ", " + zelle.title);

                zelle.appendChild(TEAM_SCHACH._wuerfelBauen(
                    zeigen ? stufe : SCHACH_VARIANTEN.STUFE_UNBEKANNT,
                    pechZeigen));
            }

            /*
             * Eine geliehene Figur (Fähigkeit „Friedhof"). Sie sieht aus wie
             * eine eigene und zieht auch so — aber sie zerfällt. Ohne
             * Kennzeichnung baut man eine Stellung darauf auf und wundert sich,
             * wenn plötzlich die halbe Armee fehlt.
             */
            if (SCHACH.istGeliehen(stand, feld)) {
                const rest = SCHACH.geliehene(stand)
                    .find((eintrag) => eintrag.feld === feld);

                zelle.classList.add("feld-geliehen");
                zelle.title = "Geliehen: zerfällt in "
                    + (rest.bis - stand.takt) + " Halbzügen";
                zelle.setAttribute("aria-label",
                    SCHACH.feldName(feld, breite, hoehe) + ", geliehene Figur");
            }

            /*
             * Eine Mauer auf diesem Feld. Sie trägt keine Figur und keinen
             * Würfel — sie IST das Feld, solange sie steht. Die Ränder werden
             * gesetzt, damit drei nebeneinander liegende Felder als EIN Block
             * erscheinen und nicht als drei Kästchen.
             */
            if (SCHACH.mauerAuf(stand, feld)) {
                /*
                 * GEFRAGT WIRD IN DER ANSICHT, NICHT IN DER LOGIK (seit v0.80).
                 *
                 * Seit die Mauer auch senkrecht liegen darf, muss der
                 * Bildschirm wissen, wie herum sie VOR DEM SPIELER liegt — und
                 * das ist nicht dasselbe wie ihre Lage im Stand: Das Brett
                 * wird in vier Lagen gezeichnet (v0.72), auf einer
                 * Vierteldrehung erscheint eine senkrechte Mauer waagerecht.
                 *
                 * Deshalb werden die Nachbarn über `_feldZuAnzeige` geholt,
                 * also über dieselbe Umrechnung, mit der auch dieses Feld hier
                 * gelandet ist. Nebenbei behebt das einen alten Schönheitsfehler:
                 * Bis v0.79 rechnete die Kantenlogik mit den LOGISCHEN Spalten,
                 * auf einem gedrehten Brett sassen die runden Enden deshalb an
                 * den falschen Seiten.
                 */
                const zeile = Math.floor(anzeige / zeigeSpalten);
                const spalteAnzeige = anzeige % zeigeSpalten;
                const zeigeZeilen = felder / zeigeSpalten;

                const nachbarMauer = (dz, ds) => {
                    const z = zeile + dz;
                    const s = spalteAnzeige + ds;

                    if (z < 0 || s < 0 || z >= zeigeZeilen || s >= zeigeSpalten) {
                        return false;
                    }
                    const nachbar = TEAM_SCHACH._feldZuAnzeige(stand, drehung, z, s);
                    return nachbar >= 0 && SCHACH.mauerAuf(stand, nachbar);
                };

                const linksMauer = nachbarMauer(0, -1);
                const rechtsMauer = nachbarMauer(0, 1);
                const obenMauer = nachbarMauer(-1, 0);
                const untenMauer = nachbarMauer(1, 0);

                zelle.classList.add("feld-mauer");

                /* Steht sie senkrecht vor mir? Nur dann, wenn sie senkrechte
                   Nachbarn hat und keine waagerechten — eine einzeln stehende
                   Mauer bleibt der gewohnte waagerechte Riegel. */
                if ((obenMauer || untenMauer) && !linksMauer && !rechtsMauer) {
                    zelle.classList.add("mauer-senkrecht");

                    if (!obenMauer) {
                        zelle.classList.add("mauer-anfang");
                    }
                    if (!untenMauer) {
                        zelle.classList.add("mauer-ende");
                    }
                } else {
                    if (!linksMauer) {
                        zelle.classList.add("mauer-anfang");
                    }
                    if (!rechtsMauer) {
                        zelle.classList.add("mauer-ende");
                    }
                }

                zelle.title = "Mauer: hier zieht niemand hindurch";
                zelle.setAttribute("aria-label",
                    SCHACH.feldName(feld, breite, hoehe) + ", Mauer");
            }

            /* Ein Riss im Boden (seit v0.54): gesperrt wie eine Mauer, aber
               dauerhaft — und deshalb anders gezeichnet. */
            if (SCHACH.rissAuf(stand, feld)) {
                zelle.classList.add("feld-riss");

                /* Auf dem Kreuz-Brett sind die vier Ecken von Anfang an
                   gesperrt (seit v0.63) — sie sind kein Unglück, sondern die
                   Form des Bretts. Gezeichnet gleich, benannt anders. */
                const kreuzEcke = !!SCHACH_VARIANTEN.holen(stand.variante).kreuz;

                zelle.title = kreuzEcke
                    ? "Gehört nicht zum Brett"
                    : "Riss im Boden: dauerhaft gesperrt, nur Springer setzen darüber";
                zelle.setAttribute("aria-label",
                    SCHACH.feldName(feld, breite, hoehe)
                        + (kreuzEcke ? ", ausserhalb des Bretts" : ", Riss"));
            }

            /*
             * Wirkende Fähigkeiten am Brett zeigen: Ohne sie muss man sich
             * merken, welche Figur geschützt ist und welche festhängt — und
             * genau das vergisst man in einer Partie, die über Tage läuft.
             */
            if (partie.stand.schildFeld === feld) {
                zelle.classList.add("feld-schild");
                zelle.title = "Geschützt: lässt sich nicht schlagen";
            }
            if (partie.stand.fesselFeld === feld) {
                zelle.classList.add("feld-fessel");
                zelle.title = "Gefesselt: darf mehrere Züge lang nicht ziehen, "
                    + "ist dabei aber schlagbar";
            }

            if (TEAM_SCHACH._frostKanten(stand, feld, zelle)) {
                zelle.title = "Eingefroren: zieht nicht und ist unantastbar";
            }

            /*
             * DIE RESTZEIT ALS KLEINE ZAHL (seit v0.53).
             *
             * Überall, wo etwas abläuft — geliehene Figur, Mauer, Schild,
             * Fessel, Frost —, steht rechts oben am Feld, wie viele Halbzüge es
             * noch gilt. Vorher stand die Zahl nur im Titel-Text beim
             * Darüberfahren; auf dem Handy gibt es kein Darüberfahren, und
             * damit musste man mitzählen.
             *
             * Gefragt wird das Regelwerk (`SCHACH.restzeitAuf`) — die Fristen
             * stehen dort, und hier wird nur gezeichnet.
             */
            const restzeit = SCHACH.restzeitAuf(stand, feld);
            if (restzeit > 0) {
                zelle.appendChild(TEAM_SCHACH._element("span", "feld-restzeit",
                    String(restzeit)));
            }

            /*
             * DIE GEFALLENEN BLASS ZEIGEN, SOLANGE DER FRIEDHOF WARTET
             * (seit v0.54).
             *
             * Seit die Fähigkeit weckt, wer GENAU DORT gefallen ist, muss man
             * sehen, wo das war — sonst tippt man ins Blaue. Gezeigt wird nur,
             * was auch aufstehen könnte: gefallene GEGNER auf einem Feld, das
             * jetzt frei ist. Liegen auf einem Feld mehrere, steht der zuletzt
             * gefallene oben — genau der, den die Regel weckt.
             */
            if (graeberZeigen && figur === ".") {
                const grab = TEAM_SCHACH._grabAuf(partie, meinTeam, feld);

                if (grab) {
                    const schemen = TEAM_SCHACH._element("span",
                        "figur figur-schemen "
                        + ((meinTeam === "weiss") ? "figur-weiss" : "figur-schwarz")
                        + TEAM_SCHACH._figurKlasse(grab),
                        TEAM_SCHACH._figurZeichen(
                            (meinTeam === "weiss") ? grab : grab.toLowerCase()));
                    zelle.appendChild(schemen);

                    zelle.title = "Hier fiel " + SCHACH.artName(grab);
                    zelle.setAttribute("aria-label",
                        SCHACH.feldName(feld, breite, hoehe) + ", Grab: "
                        + SCHACH.artName(grab));
                }
            }

            /* Wartet die Fähigkeit auf ein Ziel? Dann sind die möglichen
               Felder markiert. */
            if (TEAM_SCHACH.zielFelder.indexOf(feld) !== -1) {
                zelle.classList.add("feld-wahl");
            }

            /*
             * DER VORSCHAU-KASTEN (seit v0.57): der Umriss dessen, was
             * passieren WÜRDE — drei Felder bei der Mauer, ein 2×2 beim Frost
             * und beim Friedhof. Er liegt über der Auswahlmarke, denn er ist
             * die genauere Auskunft.
             */
            if (TEAM_SCHACH.zielUmriss.indexOf(feld) !== -1) {
                zelle.classList.add("feld-vorschau");
                TEAM_SCHACH._umrissKanten(stand, feld, TEAM_SCHACH.zielUmriss, zelle);
            }

            if (feld === TEAM_SCHACH.gewaehltesFeld) {
                zelle.classList.add("feld-gewaehlt");
            }
            /*
             * Mögliche Ziele. Der rote Schlagring gilt nur für GEGNERISCHE
             * Figuren (seit v0.44).
             *
             * Vorher hing er an „da steht irgendetwas" — und bei der Rochade
             * steht dort die eigene Figur: Auf einem sechs Felder breiten
             * Brett landet der König genau auf dem Turm. Das Feld sah damit
             * aus, als schlüge man den eigenen Turm.
             */
            if (TEAM_SCHACH.moeglicheZiele.indexOf(feld) !== -1) {
                const gegnerisch = (figur !== "." && SCHACH.farbeVon(figur) !== stand.amZug);
                zelle.classList.add(gegnerisch ? "feld-schlag" : "feld-ziel");
            }
            /* Den zweiten Weg zur Rochade über das Turmfeld gibt es seit v0.44
               nicht mehr — der Rochadezug ist ein normaler Königszug und steht
               als Zugpunkt schon oben in `moeglicheZiele`. */


            /* Königsfeld hervorheben, wenn es im Schach steht. */
            if (partie.laeuft && SCHACH.artVon(figur) === "K"
                && SCHACH.farbeVon(figur) === stand.amZug
                && SCHACH.imSchach(stand, stand.amZug)) {
                zelle.classList.add("feld-schach");
            }

            zelle.disabled = !darfZiehen;
            zelle.addEventListener("click", () => TEAM_SCHACH.feldAngetippt(partie, person, feld));

            /* Irgendein Feld genügt, um später die Feldbreite zu messen —
               alle sind gleich gross (`aspect-ratio: 1 / 1`). */
            if (anzeige === 0) {
                TEAM_SCHACH.feldEl = zelle;
            }

            brett.appendChild(zelle);
        }

        /*
         * Die Beschriftung am Rand (a, b, c … und 8, 7, 6 …). Sie entsteht aus
         * denselben Maßen wie das Brett — auf dem 6er-Brett steht a bis f, auf
         * dem Doppelbrett a bis p, und die Zahlen zählen bis zur Höhe. Damit
         * wächst sie mit jeder Spielart mit, ohne Sonderfall.
         */
        const rahmen = TEAM_SCHACH._element("div", "brett-rahmen");
        rahmen.style.setProperty("--brett-spalten", String(zeigeSpalten));
        rahmen.style.setProperty("--brett-reihen", String(quer ? breite : hoehe));
        rahmen.style.setProperty("--brett-max", Math.min(64 * zeigeSpalten, 900) + "px");

        rahmen.appendChild(TEAM_SCHACH._randBauen(partie, drehung, "reihen"));
        rahmen.appendChild(brett);
        rahmen.appendChild(TEAM_SCHACH._randBauen(partie, drehung, "spalten"));

        halter.appendChild(rahmen);

        if (!partie.laeuft && !partie.ergebnis) {
            halter.appendChild(TEAM_SCHACH._element("p", "erklaerung",
                "Die Partie beginnt, sobald in beiden Teams jemand steht und beide "
                + "Seiten bereit gedrückt haben."));
        } else if (partie.laeuft && !darfZiehen) {
            halter.appendChild(TEAM_SCHACH._element("p", "erklaerung",
                meinTeam
                    ? "Warte, bis dein Team wieder am Zug ist."
                    : "Tritt einem Team bei, um mitzuspielen."));
        } else if (darfZiehen && !TEAM_SCHACH.zielFaehigkeit) {
            /* Wartet eine Fähigkeit auf ihr Ziel, erklärt die Platzier-Leiste
               weiter unten, was zu tun ist — zwei Anleitungen gleichzeitig
               widersprächen sich. */
            halter.appendChild(TEAM_SCHACH._element("p", "erklaerung",
                "Figur antippen, dann ein Feld mit Punkt. Wer aus deinem Team "
                + "zuerst zieht, hat gezogen."));
        }

        if (glas) {
            halter.appendChild(TEAM_SCHACH._element("p", "erklaerung erklaerung-rochade",
                "Halluzination: Du siehst die gegnerischen Figuren gerade falsch. "
                + "Sie ziehen wie immer — verlass dich lieber auf die "
                + "hervorgehobenen Felder. Noch "
                + (partie.stand.glasBis - partie.zugZaehler) + " Halbzüge."));
        }

        const rochade = TEAM_SCHACH._rochadeHinweis(partie);
        if (rochade) {
            halter.appendChild(TEAM_SCHACH._element("p", "erklaerung erklaerung-rochade", rochade));
        }

        const platzieren = TEAM_SCHACH._platzierenBauen(partie, person);
        if (platzieren) {
            halter.appendChild(platzieren);
        }

        const zugmuster = TEAM_SCHACH._zugmusterBauen(partie, person);
        if (zugmuster) {
            halter.appendChild(zugmuster);
        }

        const abstimmung = TEAM_SCHACH._abstimmungBauen(partie, person);
        if (abstimmung) {
            halter.appendChild(abstimmung);
        }

        return halter;
    },

    /*
     * DIE LEISTE ZUM PLATZIEREN (seit v0.57).
     *
     * Sie erscheint, sobald eine Fähigkeit auf ihr Ziel wartet, und führt
     * durch zwei Schritte: erst ein Feld antippen, dann „Einsetzen". Bis v0.56
     * wirkte der erste Tipp sofort — bei Mauer, Frost und Friedhof sah man
     * dabei nie, WO die Wirkung landet.
     *
     * Der Abbrechen-Knopf ist dabei mehr als Höflichkeit: Er ist der einzige
     * sichtbare Ausweg, wenn man sich vertippt hat. (Ein Tipp neben die
     * gültigen Felder bricht weiterhin ebenfalls ab — das bleibt, weil es der
     * schnellere Weg ist.)
     */
    _platzierenBauen(partie, person) {
        if (!TEAM_SCHACH.zielFaehigkeit) {
            return null;
        }
        if (!SCHACH_RUNDE.darfEinsetzen(partie, person.id, TEAM_SCHACH.zielFaehigkeit)) {
            return null;
        }

        const breite = SCHACH.breiteVon(partie.stand);
        const hoehe = SCHACH.hoeheVon(partie.stand);
        const titel = SCHACH_VARIANTEN.faehigkeitTitel(TEAM_SCHACH.zielFaehigkeit);
        const gesetzt = (TEAM_SCHACH.zielVorschau >= 0);

        const karte = TEAM_SCHACH._element("section", "karte platzieren");
        karte.appendChild(TEAM_SCHACH._element("h3", "", titel + " platzieren"));

        karte.appendChild(TEAM_SCHACH._element("p", "erklaerung",
            gesetzt
                ? ("Der grüne Rahmen zeigt, was passiert — auf "
                    + SCHACH.feldName(TEAM_SCHACH.zielVorschau, breite, hoehe)
                    + ". Ein anderes helles Feld antippen verschiebt ihn.")
                : "Tippe eines der hell umrandeten Felder an. Der grüne Rahmen "
                    + "zeigt dann, wohin die Wirkung wirklich geht."));

        const leiste = TEAM_SCHACH._element("div", "knopf-zeile");

        if (gesetzt) {
            leiste.appendChild(TEAM_SCHACH._knopf("Einsetzen", "knopf-haupt",
                () => TEAM_SCHACH.zielBestaetigen(partie)));
        }

        /*
         * DER DREH-KNOPF DER MAUER (seit v0.80). Er steht nur bei ihr, weil
         * sie die einzige Fähigkeit mit einer Lage ist — ein Frost-Block und
         * ein Friedhof sind quadratisch, da gibt es nichts zu drehen.
         *
         * Beschriftet wird mit dem ZIEL, nicht mit dem Zustand: „Senkrecht
         * legen" sagt, was der Tipp bewirkt. Ein Knopf, der den Ist-Zustand
         * nennt, liest sich am Handy wie eine Anzeige.
         */
        if (TEAM_SCHACH.zielFaehigkeit === "mauer") {
            const senkrecht = (TEAM_SCHACH.mauerRichtung === "senkrecht");

            leiste.appendChild(TEAM_SCHACH._knopf(
                senkrecht ? "Waagerecht legen" : "Senkrecht legen",
                "knopf-still",
                () => TEAM_SCHACH.drehenMauer(partie)));
        }

        /*
         * DERSELBE KNOPF FÜR DEN PLATZTAUSCH (seit v0.101, Wunsch W7). Er
         * nennt den IST-Zustand statt des Ziels — anders als bei der Mauer,
         * und mit Absicht: Bei zwei Lagen sagt „Senkrecht legen" eindeutig,
         * was der Tipp bewirkt; bei vier Richtungen wäre die nächste Station
         * eine Angabe ohne Wert. Was zählt, ist, in welche Richtung gerade
         * getauscht wird — die markierten Felder zeigen den Rest.
         */
        if (TEAM_SCHACH.zielFaehigkeit === "platztausch") {
            leiste.appendChild(TEAM_SCHACH._knopf(
                "Richtung: " + TEAM_SCHACH.tauschRichtungText(TEAM_SCHACH.tauschRichtung),
                "knopf-still",
                () => TEAM_SCHACH.schaltenTausch(partie)));
        }

        /*
         * UND FÜR DAS NUDELHOLZ (seit v0.117): vier Ränder, ein Knopf, der
         * reihum zählt — wie beim Platztausch nennt er den IST-Zustand, die
         * markierten Randfelder zeigen den Rest.
         */
        if (TEAM_SCHACH.zielFaehigkeit === "nudelholz") {
            leiste.appendChild(TEAM_SCHACH._knopf(
                "Rollt " + TEAM_SCHACH.NUDELHOLZ_KANTEN_TEXT[TEAM_SCHACH.nudelholzKante],
                "knopf-still",
                () => TEAM_SCHACH.drehenNudelholz(partie)));
        }

        leiste.appendChild(TEAM_SCHACH._knopf("Abbrechen", "knopf-still",
            () => TEAM_SCHACH.zielVerwerfen()));

        karte.appendChild(leiste);
        return karte;
    },

    /*
     * DIE LEISTE ZUM ABBRECHEN EINES AKTIVEN ITEMS (seit v0.76).
     *
     * Gemeldet als: „Wenn man ein Item aktiv hat, also gerade dabei ist eine
     * Figur auszuwählen, soll man mit einem Abbrechen-Knopf das Item abbrechen
     * können, und das Item muss zurückgegeben werden."
     *
     * Sie erscheint bei Sprung und Teleport — den Fähigkeiten, die IHR ZUG
     * sind (`istDerZug`). Sie sind mit dem Antippen sofort verbraucht, und
     * danach zählt auf dem Brett nur noch ihr Muster; wer sich vertippt hatte,
     * musste bis v0.75 springen. Fähigkeiten mit Zielfeld haben ihren
     * Abbrechen-Knopf seit v0.57 (`_platzierenBauen`) — dort ist noch gar
     * nichts eingesetzt, hier wird wirklich zurückgenommen.
     *
     * WELCHE Fähigkeit gerade läuft, beantwortet das Modell
     * (`SCHACH_RUNDE.laufendesZugmuster`) — der Bildschirm liest kein Muster.
     */
    _zugmusterBauen(partie, person) {
        if (!SCHACH_RUNDE.darfZiehen(partie, person.id)) {
            return null;
        }

        const meinTeam = SCHACH_RUNDE.teamVon(partie, person.id);
        const art = SCHACH_RUNDE.laufendesZugmuster(partie, meinTeam);

        if (!art) {
            return null;
        }

        const titel = SCHACH_VARIANTEN.faehigkeitTitel(art);
        const karte = TEAM_SCHACH._element("section", "karte platzieren");

        karte.appendChild(TEAM_SCHACH._element("h3", "", titel + " läuft"));
        karte.appendChild(TEAM_SCHACH._element("p", "erklaerung",
            titel + " IST dein Zug: Tippe deine Figur an, dann ihr Ziel. Etwas "
            + "anderes geht in diesem Zug nicht mehr — wenn du es dir anders "
            + "überlegst, brich hier ab. " + titel + " kommt dann zurück in "
            + "deinen Vorrat."));

        const leiste = TEAM_SCHACH._element("div", "knopf-zeile");
        leiste.appendChild(TEAM_SCHACH._knopf("Abbrechen", "knopf-still",
            () => TEAM_SCHACH.zugmusterVerwerfen(partie)));

        karte.appendChild(leiste);
        return karte;
    },

    /*
     * Der offene Zugvorschlag, über den das Team abstimmt. Nur in Partien, die
     * mit „Team muss sich einig sein“ angelegt wurden.
     */
    _abstimmungBauen(partie, person) {
        if (!partie.vorschlag || partie.vorschlag.zugZaehler !== partie.zugZaehler) {
            return null;
        }

        const meinTeam = SCHACH_RUNDE.teamVon(partie, person.id);
        if (meinTeam !== partie.stand.amZug) {
            return null;
        }

        const breite = SCHACH.breiteVon(partie.stand);
        const hoehe = SCHACH.hoeheVon(partie.stand);
        const vorschlag = partie.vorschlag;

        const karte = TEAM_SCHACH._element("section", "karte abstimmung");
        karte.appendChild(TEAM_SCHACH._element("h3", "",
            (vorschlag.art === "faehigkeit") ? "Fähigkeit vorgeschlagen" : "Zug vorgeschlagen"));

        const was = (vorschlag.art === "faehigkeit")
            ? SCHACH_VARIANTEN.faehigkeitTitel(vorschlag.faehigkeit)
                + ((vorschlag.zielFeld >= 0)
                    ? " auf " + SCHACH.feldName(vorschlag.zielFeld, breite, hoehe)
                    : "")
            : SCHACH.feldName(vorschlag.von, breite, hoehe) + " nach "
                + SCHACH.feldName(vorschlag.nach, breite, hoehe);

        karte.appendChild(TEAM_SCHACH._element("p", "abstimmung-zug",
            (vorschlag.name || "Jemand") + " schlägt vor: " + was));

        /* Der Countdown — er läuft für alle gleich, weil die Frist im
           gemeinsamen Stand steht. */
        if (vorschlag.frist) {
            const bleiben = Math.max(0, Math.ceil((vorschlag.frist - Date.now()) / 1000));
            karte.appendChild(TEAM_SCHACH._element("p", "abstimmung-frist",
                (bleiben > 0)
                    ? "Noch " + bleiben + " Sekunden — danach gilt der Vorschlag."
                    : "Die Zeit ist um."));
        }

        const fehlende = partie.teams[meinTeam]
            .filter((id) => vorschlag.stimmen.indexOf(id) === -1);

        /*
         * Solange eine Abstimmung läuft, wird jede Sekunde neu gezeichnet —
         * anders ließe sich kein Countdown zeigen. Und wenn die Frist abläuft,
         * schiebt ihn das erste Gerät an, das es bemerkt.
         */
        TEAM_SCHACH._fristVerfolgen(partie);

        karte.appendChild(TEAM_SCHACH._element("p", "erklaerung",
            fehlende.length === 0
                ? "Alle sind einverstanden."
                : "Es fehlt noch: " + fehlende.map((id) => TEAM_SCHACH._nameVon(id)).join(", ")));

        const leiste = TEAM_SCHACH._element("div", "karte-fuss");

        if (partie.vorschlag.stimmen.indexOf(person.id) === -1) {
            leiste.appendChild(TEAM_SCHACH._knopf("Einverstanden", "knopf-haupt",
                () => TEAM_SCHACH.zugMittragen(partie)));
        } else {
            leiste.appendChild(TEAM_SCHACH._element("span", "chip chip-fertig",
                "Du bist einverstanden"));
        }

        leiste.appendChild(TEAM_SCHACH._knopf("Verwerfen", "knopf-still knopf-klein",
            () => TEAM_SCHACH.vorschlagVerwerfen(partie)));

        karte.appendChild(leiste);
        return karte;
    },

    /*
     * Hält den Countdown am Laufen und löst den Vorschlag aus, wenn die Frist
     * abgelaufen ist.
     *
     * Der Zeitgeber wird bei jedem Zeichnen neu gesetzt (und der alte gelöscht),
     * damit nie zwei nebeneinander laufen. Ausgelöst wird über denselben Weg wie
     * ein Zug — die Zugzähler-Prüfung sorgt dafür, dass es auch dann nur einmal
     * passiert, wenn drei Geräte gleichzeitig aufwachen.
     */
    _fristVerfolgen(partie) {
        if (TEAM_SCHACH.fristZeitgeber !== null) {
            window.clearTimeout(TEAM_SCHACH.fristZeitgeber);
            TEAM_SCHACH.fristZeitgeber = null;
        }

        const vorschlag = partie.vorschlag;
        if (!vorschlag || !vorschlag.frist) {
            return;
        }

        const bleiben = vorschlag.frist - Date.now();

        TEAM_SCHACH.fristZeitgeber = window.setTimeout(() => {
            TEAM_SCHACH.fristZeitgeber = null;

            const jetzt = SCHACH_TAFEL.partie(TEAM_SCHACH.abgleich.daten, partie.id);
            if (!jetzt || !jetzt.vorschlag) {
                TEAM_SCHACH.zeichnen(TEAM_SCHACH.abgleich.daten);
                return;
            }

            if (Date.now() >= jetzt.vorschlag.frist) {
                TEAM_SCHACH.fristAusloesen(jetzt);
            } else {
                TEAM_SCHACH.zeichnen(TEAM_SCHACH.abgleich.daten);
            }
        }, Math.max(250, Math.min(bleiben, 1000)));
    },

    async fristAusloesen(partie) {
        const neu = SCHACH_RUNDE.fristAbgelaufen(partie, Date.now());
        if (!neu) {
            return;
        }
        await TEAM_SCHACH._sendenMitPruefung(neu, partie.zugZaehler);
    },

    async zugMittragen(partie) {
        const person = TEAM_SCHACH._ich();
        if (!person) {
            return;
        }

        const neu = SCHACH_RUNDE.zugMittragen(partie, person.id);
        if (!neu) {
            return;
        }
        await TEAM_SCHACH._sendenMitPruefung(neu, partie.zugZaehler);
    },

    async vorschlagVerwerfen(partie) {
        const person = TEAM_SCHACH._ich();
        if (!person) {
            return;
        }

        const neu = SCHACH_RUNDE.vorschlagVerwerfen(partie, person.id);
        if (!neu) {
            return;
        }
        await TEAM_SCHACH._sendenMitPruefung(neu, partie.zugZaehler);
    },

    /*
     * Erklärt beim gewählten König, was mit der Rochade ist.
     *
     * Ohne diesen Satz sieht es aus, als wäre die Rochade kaputt: Man tippt den
     * König an, es erscheint kein Feld, und niemand sagt warum. Die Gründe
     * kommen aus dem Regelwerk (SCHACH.rochadeLage) — der Bildschirm rechnet
     * nichts selbst nach.
     */
    _rochadeHinweis(partie) {
        if (TEAM_SCHACH.gewaehltesFeld === -1) {
            return "";
        }
        const figur = SCHACH.figurAuf(partie.stand, TEAM_SCHACH.gewaehltesFeld);
        if (SCHACH.artVon(figur) !== "K") {
            return "";
        }

        const lage = SCHACH.rochadeLage(partie.stand, partie.stand.amZug);
        const moegliche = lage.filter((eintrag) => eintrag.moeglich);

        if (moegliche.length > 0) {
            return "Rochade möglich: den Turm antippen, oder den König zwei Felder "
                + "zur Seite.";
        }

        /* Ist es überhaupt eine Spielart mit Rochade? Dann keine Belehrung. */
        if (lage.every((eintrag) => eintrag.grund.indexOf("Spielart") !== -1)) {
            return "";
        }

        return "Rochade gerade nicht möglich. Kurz: " + lage[0].grund
            + " Lang: " + lage[1].grund;
    },

    /* ---------------------------------------------------------------- *
     * DIE VIER LAGEN DES BRETTS (seit v0.72, Wunsch K4)
     *
     * Bis v0.71 gab es zwei: Weiss sah das Brett, wie es steht, Schwarz um
     * 180 Grad gedreht. Auf dem Kreuz stehen seit v0.65 Armeen auch LINKS und
     * RECHTS — für die brauchte es zwei weitere Lagen, sonst spielt man seine
     * eigene Armee quer von der Seite.
     *
     * `drehung` zählt Vierteldrehungen IM UHRZEIGERSINN und sagt zugleich,
     * welche Seite des Brettes unten landet:
     *
     *     0  unten (nichts zu tun)      2  oben  (die Ansicht von Schwarz)
     *     1  rechts                     3  links
     *
     * GEDREHT WIRD EINMAL ZU BEGINN, nicht laufend (Nutzer-Ansage 13.08.).
     * Die Lage hängt an der STARTSEITE der eigenen Armee — die steht im Stand
     * und ändert sich nie (`SCHACH.startSeitenVon`). Deshalb steht sie in
     * keinem Spielstand: Jeder sieht sein eigenes Brett, geschrieben wird
     * nichts.
     * ---------------------------------------------------------------- */

    DREHUNG_JE_SEITE: { unten: 0, rechts: 1, oben: 2, links: 3 },

    /* Welche Seite unten stehen soll, wenn eine Farbe mehrere hat. „unten"
       zuerst — dann bleibt das gewohnte Brett gewohnt. */
    SEITEN_VORZUG: ["unten", "links", "rechts", "oben"],

    _drehungVon(partie, farbe) {
        /* Wer nur zuschaut, sieht das Brett wie Weiss. */
        if (!farbe) {
            return 0;
        }

        const seiten = SCHACH.startSeitenVon(partie.stand, farbe);
        const gewaehlt = TEAM_SCHACH.SEITEN_VORZUG.find(
            (seite) => seiten.indexOf(seite) !== -1) || "unten";

        return TEAM_SCHACH.DREHUNG_JE_SEITE[gewaehlt];
    },

    /*
     * Welches FELD liegt in der Ansicht an dieser Stelle? Die Umkehrung der
     * Drehung, und die einzige Stelle, an der sie steht: Brett, Randbeschrif-
     * tung und die Bewegung fragen alle hier.
     */
    _feldZuAnzeige(stand, drehung, zeigeReihe, zeigeSpalte) {
        const breite = SCHACH.breiteVon(stand);
        const hoehe = SCHACH.hoeheVon(stand);

        let reihe = zeigeReihe;
        let spalte = zeigeSpalte;

        if (drehung === 1) {
            spalte = zeigeReihe;
            reihe = hoehe - 1 - zeigeSpalte;
        } else if (drehung === 2) {
            reihe = hoehe - 1 - zeigeReihe;
            spalte = breite - 1 - zeigeSpalte;
        } else if (drehung === 3) {
            reihe = zeigeSpalte;
            spalte = breite - 1 - zeigeReihe;
        }

        return reihe * breite + spalte;
    },

    /*
     * Ein Weg auf dem BRETT, umgerechnet auf die Ansicht. Gebraucht für die
     * gleitende Bewegung: Eine Figur, die auf dem Brett nach oben zieht, muss
     * bei einer Vierteldrehung nach rechts wandern.
     */
    _wegZuAnzeige(drehung, dReihe, dSpalte) {
        if (drehung === 1) {
            return { dr: dSpalte, ds: -dReihe };
        }
        if (drehung === 2) {
            return { dr: -dReihe, ds: -dSpalte };
        }
        if (drehung === 3) {
            return { dr: -dSpalte, ds: dReihe };
        }
        return { dr: dReihe, ds: dSpalte };
    },

    /*
     * Eine Randbeschriftung: die Spaltenbuchstaben unter dem Brett oder die
     * Reihenzahlen links daneben. Beide kommen aus den Maßen der Spielart und
     * beachten die Lage des Brettes — bei einer Vierteldrehung stehen unten
     * die ZAHLEN und links die Buchstaben, weil dort dann Reihen und Spalten
     * getauscht sind.
     */
    _randBauen(partie, drehung, art) {
        const stand = partie.stand;
        const breite = SCHACH.breiteVon(stand);
        const hoehe = SCHACH.hoeheVon(stand);
        const quer = (drehung % 2) === 1;
        const untenDrunter = (art === "spalten");

        const anzahl = untenDrunter
            ? (quer ? hoehe : breite)
            : (quer ? breite : hoehe);

        const rand = TEAM_SCHACH._element("div", "brett-rand brett-rand-" + art);

        for (let stelle = 0; stelle < anzahl; stelle++) {
            const feld = TEAM_SCHACH._feldZuAnzeige(stand, drehung,
                untenDrunter ? 0 : stelle,
                untenDrunter ? stelle : 0);

            /* Buchstabe oder Zahl? Ohne Vierteldrehung tragen die Spalten die
               Buchstaben, mit ihr die Reihen — also genau dann getauscht. */
            const text = (untenDrunter !== quer)
                ? SCHACH.SPALTEN[SCHACH.spalteVon(feld, breite)]
                : String(hoehe - SCHACH.reiheVon(feld, breite));

            rand.appendChild(TEAM_SCHACH._element("span", "brett-marke", text));
        }

        return rand;
    },

    /* ---------------------------------------------------------------- *
     * Die Spur des letzten Zuges (seit v3.6)
     *
     * BIS v3.5 WAR HIER EIN PFEIL. Er wurde als SVG über das Brett gelegt,
     * mit Maske, damit er unter den Figuren verschwindet. Drei gemeldete
     * Fehler hatten dieselbe Ursache — ein Pfeil ist eine gerade Linie:
     *
     *   - Beim schlagenden Bauern fehlte er. Die Strecke von einem Feld war
     *     kürzer als Rand plus Spitze, deshalb wurde gar nichts gezeichnet.
     *   - Beim Springer fehlte er aus demselben Grund, sobald der kurze
     *     Schenkel des L die Spitze tragen musste.
     *   - Und wo er kam, zeigte er über Felder hinweg, die die Figur nie
     *     berührt hat.
     *
     * Jetzt wird der WEG eingefärbt, so wie es Schachprogramme seit jeher
     * machen. Der kann nie zu kurz sein: Start und Ziel gehören immer dazu.
     * Damit ist die ganze Maskerei mit Maske, Lagen und Doppelkontur weg —
     * knapp 300 Zeilen Zeichenarbeit gegen zwei CSS-Klassen.
     * ---------------------------------------------------------------- */

    /*
     * Welche Felder hat der letzte Eintrag im Verlauf berührt? Liefert
     *
     *     {
     *         weg:     { <Feld>: true },  alle durchlaufenen Felder
     *         enden:   { <Feld>: true },  nur Start und Ziel (kräftiger)
     *         wirkung: { <Feld>: true },  Wirkung ohne Bewegung
     *         pech:    true|false         war es ein Unglückswürfel?
     *     }
     *
     * Ein Zug hat einen Weg, ein Erdbeben oder ein Bauernschub mehrere — jede
     * Figur, die sich bewegt hat, hinterlässt ihre Spur. Ältere Einträge im
     * Verlauf kennen nur `von`/`nach`; die tragen genauso.
     */
    /*
     * DER LETZTE EINTRAG, DER EINE BEWEGUNG BESCHREIBT (seit v0.69, Wunsch #30).
     *
     * DER FEHLER: „Manche Züge, gerade mit dem Pferd, wurden nicht gezeigt."
     * Spur und Bewegung lasen beide den LETZTEN Verlaufseintrag — und der ist
     * nach einem Zug sehr oft gar nicht der Zug. Erscheint danach eine neue
     * Lootbox (was in einer Partie mit Lootboxen ständig passiert), hängt
     * `_bonusNachziehen` einen Eintrag „Eine Lootbox erscheint auf …" hinten
     * an, und der trägt `von: -1, nach: -1`. Damit fiel die Bewegungsanimation
     * sofort heraus und die Spur blieb leer: Der Zug war passiert, aber nichts
     * zeigte ihn.
     *
     * Beim SPRINGER fällt es am meisten auf — sein L lässt sich ohne Spur am
     * schwersten nachvollziehen. Deshalb kam die Meldung über ihn.
     *
     * Gesucht wird jetzt rückwärts der erste Eintrag, der wirklich eine
     * Bewegung trägt: entweder `wege` oder ein gültiges Feldpaar. Ohne einen
     * solchen bleibt es beim letzten Eintrag — dann gibt es eben keine Spur.
     */
    _letzterBewegungsEintrag(partie) {
        for (let stelle = partie.verlauf.length - 1; stelle >= 0; stelle--) {
            const eintrag = partie.verlauf[stelle];

            if (eintrag.wege && eintrag.wege.length > 0) {
                return eintrag;
            }
            if (Number.isInteger(eintrag.von) && eintrag.von >= 0
                && Number.isInteger(eintrag.nach) && eintrag.nach >= 0) {
                return eintrag;
            }

            /*
             * Nur über Einträge hinweg, die NEBENHER entstanden sind. Ein
             * Eintrag mit Wirkung, der nichts bewegt hat (Schutzschild,
             * Fessel), ist das Letzte, was passiert ist — dahinter wird nicht
             * weitergesucht, sonst zeigte die Spur einen Zug von vorgestern.
             */
            if (eintrag.wirkung !== "erscheint") {
                return eintrag;
            }
        }
        return null;
    },

    /*
     * DER ZUG, DER ZU DIESEM UNGLÜCK GEHÖRT (seit v0.76).
     *
     * Ein Unglückswürfel wird nicht eingesetzt, er wird EINGESAMMELT — also
     * gehört zu ihm immer eine Bewegung, die ihn berührt hat. Sie steht
     * unmittelbar davor im Verlauf; dazwischen können nur Einträge stehen, die
     * nebenher entstanden sind (neu erschienene Lootboxen, ein zweiter
     * Unglückswürfel auf demselben Weg).
     *
     * Weiter zurück wird NICHT gesucht: Der erste Eintrag, der etwas anderes
     * ist, gehört zu diesem Halbzug — sonst zeigte die Spur einen Zug von
     * vorgestern.
     */
    _zugZumUnglueck(partie, unglueck) {
        const stelle = partie.verlauf.lastIndexOf(unglueck);

        for (let nummer = stelle - 1; nummer >= 0; nummer--) {
            const eintrag = partie.verlauf[nummer];

            if (eintrag.wirkung === "erscheint" || eintrag.wirkung === "pech") {
                continue;
            }
            return eintrag;
        }

        return null;
    },

    /*
     * ZUG UND UNGLÜCK SIND ZWEI DINGE (seit v0.76).
     *
     * Gemeldet als: „Wenn ich eine Unglücksbox einsammle, verhält sich die
     * grüne Farbe meiner Bewegung nicht richtig." Genau so war es: Der
     * Bildschirm nahm IMMER nur den letzten Eintrag. Sammelte ein Zug
     * unterwegs einen Unglückswürfel ein, war das der Unglücks-Eintrag — die
     * ganze Spur wurde gelb, und sie endete dort, wo die Lootbox lag, statt
     * dort, wo die Figur steht.
     *
     * Jetzt werden beide gezeichnet: der ZUG in Grün (wo bin ich hergekommen,
     * wo stehe ich) und darüber das UNGLÜCK in Gelb (was hat es bewegt, was
     * hat es getroffen). Überschneiden sie sich, gewinnt Gelb — das Unglück
     * ist das Jüngere und das Ungewöhnliche.
     */
    _letzteSpur(partie) {
        const spur = { weg: {}, enden: {}, wirkung: {}, pech: {} };
        const letzter = TEAM_SCHACH._letzterBewegungsEintrag(partie);

        if (!letzter) {
            return spur;
        }

        /* Der Zug zuerst, das Unglück darüber. */
        const eintraege = [];
        if (letzter.wirkung === "pech") {
            const zug = TEAM_SCHACH._zugZumUnglueck(partie, letzter);
            if (zug) {
                eintraege.push(zug);
            }
        }
        eintraege.push(letzter);

        for (const eintrag of eintraege) {
            const istPech = (eintrag.wirkung === "pech");
            let wege = (eintrag.wege && eintrag.wege.length > 0) ? eintrag.wege : [];

            /*
             * Der Rückfall auf `von`/`nach` gilt nur für Einträge, die WIRKLICH
             * eine Bewegung beschreiben. Ein Unglück tut das nie — was es
             * bewegt hat, steht ausschliesslich in `wege` (seit v0.76 trägt es
             * deshalb `von`/`nach` = -1).
             */
            if (wege.length === 0 && Number.isInteger(eintrag.von) && eintrag.von >= 0
                && Number.isInteger(eintrag.nach) && eintrag.nach >= 0) {
                wege = [{ von: eintrag.von, nach: eintrag.nach }];
            }

            /*
             * DER TELEPORT BEKOMMT KEINE LINIE (seit v0.98, Wunsch #35):
             * „nur der Startpunkt und der Zielort werden markiert". Beides
             * setzt `spur.enden` ohnehin; die Angabe schaltet allein die Felder
             * dazwischen ab. Sie steht am EINTRAG, weil sie zum Zug gehört —
             * die Geometrie sieht einem geraden Teleport nichts an.
             */
            const ohneWeg = !!eintrag.ohneWeg;

            for (const weg of wege) {
                if (weg.von === weg.nach) {
                    continue;
                }
                spur.enden[weg.von] = true;
                spur.enden[weg.nach] = true;

                for (const feld of SCHACH.wegFelder(partie.stand, weg.von, weg.nach,
                    ohneWeg)) {
                    spur.weg[feld] = true;
                    if (istPech) {
                        spur.pech[feld] = true;
                    }
                }
            }

            /*
             * Fähigkeiten, die nichts bewegen (Schutzschild, Fessel,
             * Verstärkung), bekommen eine eigene Marke — sonst wäre die einzige
             * Spur ein kurzes Aufleuchten, das verpasst, wer gerade nicht
             * hinsieht.
             *
             * Neu erschienene Würfel bekommen KEINE: Sie sind schon als Würfel
             * zu sehen, und eine zweite Marke sähe aus, als wäre gerade etwas
             * mit ihnen passiert.
             */
            if (eintrag.wirkung && eintrag.wirkung !== "erscheint") {
                for (const feld of (eintrag.felder || [])) {
                    if (!spur.weg[feld]) {
                        spur.wirkung[feld] = true;
                    }
                }
            }
        }

        return spur;
    },

    /*
     * Der Würfel, der eine Fähigkeit auf dem Brett anzeigt.
     *
     * Gezeichnet als SVG statt als Bilddatei: Er hat damit von Haus aus keinen
     * Hintergrund, bleibt auf jeder Feldgröße scharf (von 6 mal 6 bis zum
     * Doppelbrett auf dem Handy) — und er kann seine FARBE aus der
     * Seltenheitsstufe nehmen. Man sieht einem Würfel also schon von weitem an,
     * was er wert ist. Eine Bilddatei je Stufe wäre fünfmal dasselbe Bild in
     * fünf Farben, das jemand pflegen müsste.
     *
     * Die drei Seitenflächen entstehen aus einer Grundfarbe in drei
     * Helligkeiten — deckend, damit auf hellen Feldern nichts durchscheint.
     */
    /*
     * Zähler für die Kennungen der Farbverläufe (seit v0.69). Ein `<svg>` kann
     * seinen Verlauf nur über eine Kennung ansprechen, und die muss in der
     * ganzen Seite eindeutig sein — auf dem Brett liegen schnell ein Dutzend
     * Lootboxen nebeneinander.
     */
    _verlaufZaehler: 0,

    /* Legt einen Regenbogen-Verlauf in dieses SVG und liefert seine Kennung. */
    _regenbogenVerlauf(svg) {
        TEAM_SCHACH._verlaufZaehler++;
        const kennung = "lootbox-regenbogen-" + TEAM_SCHACH._verlaufZaehler;

        const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
        const verlauf = document.createElementNS(
            "http://www.w3.org/2000/svg", "linearGradient");

        verlauf.setAttribute("id", kennung);
        /* Schräg über den Würfel, damit alle drei Seiten etwas abbekommen. */
        verlauf.setAttribute("x1", "0");
        verlauf.setAttribute("y1", "0");
        verlauf.setAttribute("x2", "1");
        verlauf.setAttribute("y2", "1");

        const farben = SCHACH_VARIANTEN.STUFE_UNBEKANNT.regenbogen;

        for (let stelle = 0; stelle < farben.length; stelle++) {
            const halt = document.createElementNS("http://www.w3.org/2000/svg", "stop");
            halt.setAttribute("offset",
                Math.round(stelle / (farben.length - 1) * 100) + "%");
            halt.setAttribute("stop-color", farben[stelle]);
            verlauf.appendChild(halt);
        }

        defs.appendChild(verlauf);
        svg.appendChild(defs);
        return kennung;
    },

    _wuerfelBauen(stufe, pech) {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("class", "wuerfel");
        svg.setAttribute("viewBox", "0 0 100 100");
        svg.setAttribute("aria-hidden", "true");

        const flaechen = [
            /* Oberseite, hell. */
            { punkte: "50,6 92,30 50,54 8,30", ton: 1.35 },
            /* Linke Seite, dunkel. */
            { punkte: "8,30 50,54 50,96 8,72", ton: 0.7 },
            /* Rechte Seite, mittel. */
            { punkte: "92,30 50,54 50,96 92,72", ton: 1 }
        ];

        /*
         * DIE VERBORGENE LOOTBOX SCHILLERT (seit v0.69, Wunsch #26).
         *
         * Wer die Seltenheit nicht anzeigen lässt, bekam bis v0.68 ein
         * unauffälliges Grau — und damit sah die Lootbox nach gar nichts aus.
         * Jetzt läuft ein Regenbogen über alle drei Flächen.
         *
         * ES IST FÜR JEDE VERBORGENE LOOTBOX DERSELBE VERLAUF. Ein Zufall je
         * Box oder eine Farbe je Stufe würde genau das verraten, was der Haken
         * verbergen soll (eiserne Regel: Die Oberfläche verrät nie, was drin
         * steckt). Die Helligkeitsstufen der drei Seiten bleiben trotzdem —
         * sonst sähe der Würfel flach aus statt körperlich.
         */
        const verlauf = stufe.regenbogen
            ? TEAM_SCHACH._regenbogenVerlauf(svg)
            : null;

        for (const flaeche of flaechen) {
            const teil = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
            teil.setAttribute("points", flaeche.punkte);

            if (verlauf) {
                teil.setAttribute("fill", "url(#" + verlauf + ")");
                /* Die Fläche wird über die Deckkraft heller oder dunkler —
                   den Verlauf selbst je Seite umzufärben hiesse drei
                   Farbverläufe statt einem. */
                teil.setAttribute("fill-opacity", String(Math.min(1, flaeche.ton * 0.75)));
                teil.setAttribute("stroke", "#2b2f36");
            } else {
                teil.setAttribute("fill", TEAM_SCHACH._tonAendern(stufe.farbe, flaeche.ton));
                teil.setAttribute("stroke", TEAM_SCHACH._tonAendern(stufe.farbe, 0.45));
            }

            teil.setAttribute("stroke-width", "3");
            teil.setAttribute("stroke-linejoin", "round");
            svg.appendChild(teil);
        }

        /*
         * Das Fragezeichen auf der rechten Seitenfläche — beim Unglückswürfel
         * steht es auf dem Kopf. Ein eigenes Zeichen statt einer anderen Farbe:
         * Die Farbe trägt schon die Seltenheit, und ein umgedrehtes
         * Fragezeichen erkennt man auch auf einem winzigen Feld.
         */
        const zeichen = document.createElementNS("http://www.w3.org/2000/svg", "text");
        zeichen.setAttribute("x", "70");
        zeichen.setAttribute("y", "80");
        zeichen.setAttribute("text-anchor", "middle");
        zeichen.setAttribute("class", "wuerfel-zeichen");
        zeichen.textContent = "?";

        if (pech) {
            /*
             * Gedreht wird um die OPTISCHE Mitte des Zeichens, nicht um einen
             * Punkt darunter: Die Grundlinie liegt bei y=80, das Zeichen reicht
             * bei Schriftgröße 34 bis etwa y=56 hinauf — Mitte also y=68. Mit
             * der alten Achse (y=72) rutschte das gespiegelte Fragezeichen um
             * acht Einheiten nach unten und hing aus der Würfelfläche heraus
             * (Meldung T1/T2 vom 18.08.).
             */
            zeichen.setAttribute("transform", "rotate(180 70 68)");
        }
        svg.appendChild(zeichen);

        return svg;
    },

    /*
     * Hellt eine Farbe auf oder dunkelt sie ab (Faktor über oder unter 1).
     * Gerechnet statt fünfmal drei Farbwerte von Hand zu pflegen — eine neue
     * Stufe braucht so nur eine einzige Farbe.
     */
    _tonAendern(farbe, faktor) {
        const zahl = parseInt(String(farbe).replace("#", ""), 16);

        const teile = [
            (zahl >> 16) & 255,
            (zahl >> 8) & 255,
            zahl & 255
        ].map((wert) => Math.max(0, Math.min(255, Math.round(wert * faktor))));

        return "rgb(" + teile.join(",") + ")";
    },

    /*
     * Wirkt das volle Glas für diese Seite gerade?
     *
     * Es trübt NUR die Ansicht: Die gegnerischen Figuren sehen aus wie etwas
     * anderes, ziehen aber wie immer. Deshalb steht das hier im Bildschirm-Code
     * und nirgends in den Regeln — `SCHACH.zuege` weiß nichts davon.
     */
    _glasWirkt(partie, meinTeam) {
        return !!meinTeam
            && partie.stand.glasFarbe === meinTeam
            && partie.zugZaehler < partie.stand.glasBis;
    },

    /*
     * Das Zeichen, das eine gegnerische Figur unter dem vollen Glas bekommt.
     * Gerechnet aus Partie, Feld und Figur — also auf jedem Gerät desselben
     * Teams gleich, und über die Partie hinweg stabil: Dieselbe Figur sieht
     * immer gleich falsch aus, sonst wäre es Flackern statt Täuschung.
     */
    /*
     * Welche gefallene Figur liegt auf diesem Feld? (seit v0.54)
     *
     * Liefert die Figurenart oder "". Gefragt wird die Grabliste der Runde —
     * dieselbe, aus der `_zielWirkung` beide Fähigkeiten bedient, damit das
     * blasse Bild und die Regel nicht auseinanderlaufen. Der ZULETZT Gefallene
     * gewinnt: Genau den weckt die Fähigkeit.
     *
     * WESSEN GRÄBER, hängt an der Fähigkeit (seit v0.57): Der Friedhof holt
     * gefallene GEGNER und leiht sie sich; die Wiederbelebung holt die EIGENE
     * Figur endgültig zurück. Zwei Fähigkeiten, dieselbe Frage ans Feld.
     */
    _grabAuf(partie, meinTeam, feld) {
        if (!meinTeam) {
            return "";
        }

        const wessen = (TEAM_SCHACH.zielFaehigkeit === "wiederbelebung")
            ? meinTeam
            : SCHACH.gegner(meinTeam);

        const gefallene = partie.gefallen[wessen] || [];

        for (let stelle = gefallene.length - 1; stelle >= 0; stelle--) {
            if (gefallene[stelle].feld === feld) {
                return gefallene[stelle].art;
            }
        }

        return "";
    },

    _glasZeichen(partie, feld, figur) {
        const arten = ["B", "S", "L", "T", "D"];

        /*
         * DIE FELDNUMMER STEHT VORNE (seit v0.49.1) — und das ist kein Zierat.
         *
         * `_zufallsWert` ist FNV-1a: Ein Unterschied im LETZTEN Zeichen der
         * Saat erlebt nur noch eine Multiplikation und verschiebt das Ergebnis
         * um Bruchteile. Mit `… + "|glas|" + feld` lagen benachbarte Felder
         * praktisch auf demselben Wert: Die Felder 0 bis 9 sahen alle wie ein
         * Springer aus, 10 bis 15 wie ein Turm, und Läufer und Dame kamen als
         * Trugbild überhaupt nie vor. Statt einer Täuschung war es ein Muster.
         *
         * Vorne durchläuft die Zahl alle übrigen Mischschritte. Die Zusage von
         * oben bleibt: dieselbe Partie, dasselbe Feld, dasselbe Trugbild.
         */
        const wert = SCHACH_RUNDE._zufallsWert(feld + "|glas|" + partie.id);
        const art = arten[Math.floor(wert * arten.length) % arten.length];

        return (SCHACH.farbeVon(figur) === "weiss") ? art : art.toLowerCase();
    },

    /*
     * Die Figuren sind Schriftzeichen aus dem Unicode-Schachblock, keine
     * Emojis. Das angehängte Zeichen erzwingt die Text-Darstellung, damit kein
     * Gerät sie doch bunt als Emoji zeichnet.
     */
    _figurZeichen(figur) {
        const zeichen = {
            "K": "♔", "D": "♕", "T": "♖",
            "L": "♗", "S": "♘", "B": "♙",
            "k": "♚", "d": "♛", "t": "♜",
            "l": "♝", "s": "♞", "b": "♟"
        };
        return (zeichen[figur] || "") + "︎";
    },

    /*
     * DIE ART ALS KLASSE — die Brücke zu den gemalten Figuren (seit v0.121).
     *
     * Im 3D-Look zeigt die App statt der Schriftzeichen die in Blender
     * gerenderten Bilder aus `img\figuren\`. CSS kann aber nicht sehen,
     * WELCHES Zeichen in einem Element steht — es braucht eine Klasse. Genau
     * die liefert diese Funktion. Die FARBE steht schon in `figur-weiss` bzw.
     * `figur-schwarz`; hier kommt nur die ART dazu.
     *
     * Sie liefert ZWEI Klassen: `figur-bild` sagt „hier steht ein Bild statt
     * eines Zeichens" (daran hängen Farbe, Kasten und Lage), `figur-art-*`
     * sagt WELCHES. Getrennt, weil die kleinen Figuren in Textzeilen zwar ein
     * Bild bekommen, aber nicht auf einer Kachel stehen.
     *
     * Sie liefert einen führenden Leerraum, damit sie sich an eine bestehende
     * Klassen-Zeichenkette anhängen lässt, und bei einer unbekannten Figur
     * eine LEERE Zeichenkette. Das ist die Rückfallebene: Ohne Klasse greift
     * im 3D-Look keine der Bild-Regeln, und das Schriftzeichen bleibt sichtbar.
     * Die Rückfallebene ist also nicht gebaut, sondern übrig.
     */
    _figurKlasse(figur) {
        const arten = {
            "K": "koenig", "D": "dame", "T": "turm",
            "L": "laeufer", "S": "springer", "B": "bauer"
        };
        const art = arten[String(figur).toUpperCase()];

        return art ? (" figur-bild figur-art-" + art) : "";
    },

    /*
     * Die Schriftgröße der Figuren aus der GEMESSENEN Feldbreite setzen.
     *
     * Die Stildatei rechnet sie sonst aus `88vw` — einer Schätzung der
     * Bildschirmbreite. Die stimmt nicht, sobald das Brett schmaler ausfällt
     * als geschätzt: am Rechner etwa, sobald ein Scrollbalken erscheint. Und
     * genau das passiert MITTEN IM SPIEL, weil der Verlauf mit jedem Zug
     * wächst und die Seite irgendwann über den Bildschirm hinausgeht — die
     * Figuren ändern dann ihre Größe, ohne dass jemand etwas getan hätte.
     *
     * Gemessen kann das nicht passieren: Die Zahl kommt aus dem Feld selbst.
     * Der Rückfall in der Stildatei bleibt für den Augenblick vor der ersten
     * Messung stehen.
     */
    _figurGroesseSetzen() {
        const brett = TEAM_SCHACH.brettEl;
        const zelle = TEAM_SCHACH.feldEl;
        const breite = (zelle && zelle.offsetWidth) ? zelle.offsetWidth : 0;

        if (brett && breite > 0) {
            brett.style.setProperty("--figur-groesse",
                Math.round(breite * TEAM_SCHACH.FIGUR_ANTEIL) + "px");
        }
    },

    /*
     * DIE SCHWARZEN STREIFEN BEIM DREHEN (Meldung #34, behoben v0.88).
     *
     * Gemeldet als „schwarze Streifen manchmal, wenn man sein Display dreht".
     *
     * URSACHE: `_figurGroesseSetzen` misst die Feldbreite und schreibt sie als
     * PIXELWERT nach `--figur-groesse`. Gemessen wurde aber nur beim Zeichnen.
     * Dreht man das Gerät, rechnet die Stildatei mit der neuen Fensterbreite
     * weiter (`88vw` im Rückfall), der geschriebene Pixelwert bleibt jedoch auf
     * dem alten Stand. Raster und Inhalt passen dann nicht mehr zusammen, und
     * die 2-Pixel-Fugen des `.brett-rahmen` blitzen als dunkle Streifen durch.
     *
     * WARUM EIN WÄCHTER UND KEIN NEUZEICHNEN: Neu zu zeichnen wäre teurer und
     * würde laufende Animationen abschneiden. Gebraucht wird nur die neue Zahl.
     *
     * WARUM NUR EINMAL ANGEMELDET: `zeichnen` läuft bei jeder Änderung, auch
     * mehrmals je Sekunde. Ohne die Sperre sammelten sich Hunderte Zuhörer an,
     * die alle dasselbe tun — der klassische Weg, eine Seite langsam zu machen.
     *
     * WARUM ÜBER `requestAnimationFrame`: Beim Drehen meldet sich das Ereignis,
     * BEVOR der Browser neu gesetzt hat. Sofort gemessen käme die alte Breite
     * heraus — also genau der Fehler, den wir beheben wollen.
     */
    _groessenWaechterStarten() {
        if (TEAM_SCHACH._groessenWaechterLaeuft) {
            return;
        }

        /*
         * Ohne echtes Fenster gibt es nichts anzumelden — so läuft der
         * Bildschirm-Test gegen sein nachgebautes DOM, das keine Ereignisse
         * kennt. Der Wächter ist reine Anzeige-Politur; fehlt er, stimmt nur
         * die Figurengrösse nach dem Drehen nicht, und genau das prüft der
         * Test auch gar nicht.
         */
        if (typeof window === "undefined"
            || typeof window.addEventListener !== "function") {
            return;
        }

        TEAM_SCHACH._groessenWaechterLaeuft = true;

        const nachmessen = () => {
            if (typeof requestAnimationFrame === "function") {
                requestAnimationFrame(() => TEAM_SCHACH._figurGroesseSetzen());
            } else {
                TEAM_SCHACH._figurGroesseSetzen();
            }
        };

        window.addEventListener("resize", nachmessen);

        /*
         * `orientationchange` ZUSÄTZLICH, nicht ersatzweise: Auf älteren
         * iPhones kommt beim Drehen nur dieses Ereignis zuverlässig, auf
         * neueren nur `resize`. Doppelt gemessen schadet nichts — es wird
         * derselbe Wert geschrieben.
         */
        window.addEventListener("orientationchange", nachmessen);
    },

    /*
     * Lässt die zuletzt gezogene Figur von ihrem alten Feld herüberwandern.
     *
     * Der Weg steht im Verlauf (von/nach), deshalb sehen ALLE die Bewegung —
     * nicht nur derjenige, der gezogen hat. Der Merker `animiertBis`
     * verhindert, dass dieselbe Bewegung bei jedem Neuzeichnen erneut läuft;
     * gezeichnet wird oft, gezogen selten.
     */
    _zugAnimieren(halter, partie, person) {
        /* Derselbe Eintrag wie bei der Spur (seit v0.69) — sonst zeigt die eine
           den Zug und die andere nicht. */
        const gefunden = TEAM_SCHACH._letzterBewegungsEintrag(partie);

        /*
         * Bei einem Unglückswürfel wandert die Figur des ZUGES, nicht das
         * Unglück (seit v0.76). Der Unglücks-Eintrag beschreibt gar keine
         * Bewegung — bis v0.75 trug er das Feld der Lootbox als Ziel, und die
         * Bewegung suchte ihre Figur dort statt dort, wo sie wirklich steht.
         */
        const letzter = (gefunden && gefunden.wirkung === "pech")
            ? TEAM_SCHACH._zugZumUnglueck(partie, gefunden)
            : gefunden;

        if (!letzter || !Number.isInteger(letzter.von) || letzter.von < 0
            || letzter.nach < 0) {
            TEAM_SCHACH.animiertBis[partie.id] = partie.zugZaehler;
            return;
        }
        if (TEAM_SCHACH.animiertBis[partie.id] === partie.zugZaehler) {
            return;
        }
        TEAM_SCHACH.animiertBis[partie.id] = partie.zugZaehler;

        const zelle = halter.querySelector("[data-feld=\"" + letzter.nach + "\"]");
        const figurEl = zelle ? zelle.querySelector(".figur") : null;
        if (!figurEl) {
            return;
        }

        const groesse = zelle.offsetWidth;
        if (!groesse) {
            /* Der Tab liegt im Hintergrund — dann gibt es nichts zu sehen. */
            return;
        }

        /*
         * SEIT v0.120 MISST DIE BEWEGUNG DIE ECHTEN ZELLEN (wie die
         * Nudelholz-Walze): Damit stimmt der Startpunkt auch mit dem
         * Kachel-Abstand des 3D-Looks. Die Dreh-Umrechnung bleibt als
         * Rückfallebene, falls das Startfeld gerade nicht im Bild steht.
         */
        const vonZelle = halter.querySelector("[data-feld=\"" + letzter.von + "\"]");

        if (vonZelle && typeof vonZelle.offsetLeft === "number"
            && typeof zelle.offsetLeft === "number") {
            figurEl.style.transform = "translate("
                + (vonZelle.offsetLeft - zelle.offsetLeft) + "px, "
                + (vonZelle.offsetTop - zelle.offsetTop) + "px)";
        } else {
            const breite = SCHACH.breiteVon(partie.stand);

            /* Der Weg auf dem BRETT — umgerechnet auf die Lage, in der dieses
               Gerät das Brett sieht (seit v0.72 vier statt zwei). */
            const weg = TEAM_SCHACH._wegZuAnzeige(
                TEAM_SCHACH._drehungVon(partie, SCHACH_RUNDE.teamVon(partie, person.id)),
                SCHACH.reiheVon(letzter.von, breite) - SCHACH.reiheVon(letzter.nach, breite),
                SCHACH.spalteVon(letzter.von, breite) - SCHACH.spalteVon(letzter.nach, breite));

            figurEl.style.transform = "translate(" + (weg.ds * groesse) + "px, "
                + (weg.dr * groesse) + "px)";
        }
        /* Die wandernde Figur liegt über ihren Nachbarfeldern. */
        zelle.classList.add("feld-zieht");

        /* Zwei Bilder warten: Das erste setzt den Startpunkt, erst danach darf
           der Übergang eingeschaltet werden — sonst springt die Figur. */
        window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => {
                figurEl.classList.add("figur-zieht");
                figurEl.style.transform = "";
            });
        });

        window.setTimeout(() => zelle.classList.remove("feld-zieht"),
            TEAM_SCHACH.ANIMATION_MS + 60);
    },

    /* ------------------------------------------------------------------ *
     * Die Wirkungs-Schauspiele (seit v0.115, ROADMAP Bündel Y)
     * ------------------------------------------------------------------ */

    /*
     * Spielt zur eingesetzten Fähigkeit ihr kleines Schauspiel auf dem
     * Brett ab — zusätzlich zum blauen Aufleuchten der betroffenen Felder.
     * Aufgerufen aus `_wirkungAnimieren`; dessen Merker (`wirkungBis`)
     * sorgt schon dafür, dass jedes Schauspiel nur einmal läuft.
     *
     * Wer „weniger Bewegung" eingestellt hat, bekommt keines: Das Erzeugen
     * wird HIER unterbunden — deshalb dürfen die zugehörigen CSS-Regeln
     * ausserhalb des no-preference-Blocks stehen (ein Element, das nie
     * entsteht, bewegt sich auch nie).
     */
    _wirkungSchauspiel(halter, eintrag) {
        /* Gefragt wird nach „reduce" (Haus-Konvention, siehe das window-
           Double der Tests): Nur die AUSDRÜCKLICHE Bitte um weniger
           Bewegung schaltet ab. */
        if (typeof window !== "undefined"
            && typeof window.matchMedia === "function"
            && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            return;
        }

        if (eintrag.wirkung === "nudelholz") {
            TEAM_SCHACH._nudelholzRollen(halter, eintrag);
            return;
        }

        /* Je Fähigkeit eine Marke im betroffenen Feld; wer hier nicht
           steht, behält nur das Aufleuchten von `_wirkungAnimieren`. */
        const marken = {
            schutzschild: "wirkung-schild",
            fessel: "wirkung-fessel",
            frost: "wirkung-frost"
        };
        const klasse = marken[eintrag.wirkung];
        if (!klasse) {
            return;
        }

        for (const feld of eintrag.felder) {
            const zelle = halter.querySelector("[data-feld=\"" + feld + "\"]");
            if (!zelle) {
                continue;
            }

            const marke = TEAM_SCHACH._element("span", "wirkung-marke " + klasse);
            zelle.appendChild(marke);
            window.setTimeout(() => {
                if (marke.parentNode) {
                    marke.parentNode.removeChild(marke);
                }
            }, 950);

            /* Die Fessel rüttelt zusätzlich kurz an der gefangenen Figur. */
            if (eintrag.wirkung === "fessel") {
                const figurEl = zelle.querySelector(".figur");
                if (figurEl && figurEl.classList) {
                    figurEl.classList.add("figur-ruettelt");
                    window.setTimeout(
                        () => figurEl.classList.remove("figur-ruettelt"), 500);
                }
            }
        }
    },

    /* So lange braucht die Walze über die ganze Bahn — die Figuren rücken
       erst, wenn sie sie erreicht (siehe unten). */
    NUDELHOLZ_ROLL_MS: 900,

    /*
     * DAS ROLLENDE NUDELHOLZ (seit v0.115, Nutzer-Wunsch 22.08.; seit
     * v0.117 mit freier Richtung): Eine Holzwalze erscheint am Start-Rand
     * der Bahn, rollt einmal über sie hinweg und verschwindet — und jede
     * geschobene Figur rückt erst, wenn die Walze sie BERÜHRT (gestaffelte
     * Verzögerung entlang des Rollwegs).
     *
     * Gemessen wird an den ECHTEN Zellen — damit stimmt die Lage in jeder
     * Brettgrösse und Drehung. Auch die BILDSCHIRM-Richtung kommt aus den
     * Zellen: Der erste Weg der geschobenen Figuren sagt, wohin auf dem
     * Schirm gerollt wird — das Brett kann ja gedreht sein (vier Lagen
     * seit v0.72). Im Hintergrund-Tab (keine Masse) passiert nichts.
     */
    _nudelholzRollen(halter, eintrag) {
        /* Am echten Brett kommt der Halter herein und das Brett liegt darin;
           in der Bildanleitung (seit v0.116) IST der Halter das Brett. */
        const istBrett = String(halter.className || "").split(" ")
            .some((name) => name === "brett" || name === "anleitung-brett");
        const brett = istBrett ? halter : halter.querySelector(".brett");
        if (!brett) {
            return;
        }

        const felder = eintrag.felder || [];
        const wege = eintrag.wege || [];

        let links = Infinity;
        let oben = Infinity;
        let rechts = -Infinity;
        let unten = -Infinity;
        let feldMass = 0;
        let gefunden = 0;
        const zellen = {};

        for (const feld of felder) {
            const zelle = brett.querySelector("[data-feld=\"" + feld + "\"]");
            if (!zelle || typeof zelle.offsetLeft !== "number"
                || typeof zelle.offsetTop !== "number") {
                continue;
            }
            zellen[feld] = zelle;
            gefunden++;
            feldMass = zelle.offsetHeight || zelle.offsetWidth || 0;
            links = Math.min(links, zelle.offsetLeft);
            oben = Math.min(oben, zelle.offsetTop);
            rechts = Math.max(rechts, zelle.offsetLeft + (zelle.offsetWidth || 0));
            unten = Math.max(unten, zelle.offsetTop
                + (zelle.offsetHeight || zelle.offsetWidth || 0));
        }

        if (gefunden === 0 || rechts <= links || unten <= oben) {
            return;
        }

        /* Die Bildschirm-Richtung aus dem ersten Weg. Ohne Weg gibt es
           nichts zu rollen — die Wirkung entsteht nur, wenn etwas rückt. */
        let dx = 0;
        let dy = 0;
        if (wege.length > 0 && zellen[wege[0].von]) {
            const nachZelle = zellen[wege[0].nach]
                || brett.querySelector("[data-feld=\"" + wege[0].nach + "\"]");
            if (nachZelle) {
                dx = Math.sign((nachZelle.offsetLeft || 0)
                    - (zellen[wege[0].von].offsetLeft || 0));
                dy = Math.sign((nachZelle.offsetTop || 0)
                    - (zellen[wege[0].von].offsetTop || 0));
            }
        }
        if (dx === 0 && dy === 0) {
            /* Vorgabe: von unten nach oben (Nutzer-Wunsch 22.08.). */
            dy = -1;
        }
        const senkrecht = (dy !== 0);

        const walzeDicke = Math.max(10, Math.round(feldMass * 0.6));
        const walze = TEAM_SCHACH._element("div",
            "nudelholz-walze" + (senkrecht ? "" : " nudelholz-walze-quer"));

        walze.style.left = links + "px";
        walze.style.top = oben + "px";
        if (senkrecht) {
            walze.style.width = (rechts - links) + "px";
            walze.style.height = walzeDicke + "px";
            const bahn = unten - oben;
            walze.style.setProperty("--roll-von", (dy === -1)
                ? "0px, " + bahn + "px" : "0px, " + (-walzeDicke) + "px");
            walze.style.setProperty("--roll-bis", (dy === -1)
                ? "0px, " + (-walzeDicke) + "px" : "0px, " + bahn + "px");
        } else {
            walze.style.width = walzeDicke + "px";
            walze.style.height = (unten - oben) + "px";
            const bahn = rechts - links;
            walze.style.setProperty("--roll-von", (dx === -1)
                ? bahn + "px, 0px" : (-walzeDicke) + "px, 0px");
            walze.style.setProperty("--roll-bis", (dx === -1)
                ? (-walzeDicke) + "px, 0px" : bahn + "px, 0px");
        }

        brett.appendChild(walze);
        window.setTimeout(() => {
            if (walze.parentNode) {
                walze.parentNode.removeChild(walze);
            }
        }, TEAM_SCHACH.NUDELHOLZ_ROLL_MS + 200);

        /*
         * JEDE FIGUR RÜCKT ERST, WENN DIE WALZE SIE ERREICHT (v0.117):
         * dasselbe Vorgehen wie `_zugAnimieren` — Figur zurück aufs alte
         * Feld setzen, im nächsten Bild gleiten lassen —, nur mit einer
         * Verzögerung, die dem Abstand vom Start-Rand entspricht.
         */
        const laenge = senkrecht ? (unten - oben) : (rechts - links);

        for (const weg of wege) {
            const vonZelle = zellen[weg.von];
            const nachZelle = zellen[weg.nach]
                || brett.querySelector("[data-feld=\"" + weg.nach + "\"]");
            const figurEl = nachZelle ? nachZelle.querySelector(".figur") : null;
            if (!vonZelle || !nachZelle || !figurEl) {
                continue;
            }

            let strecke;
            if (senkrecht) {
                strecke = (dy === 1)
                    ? (vonZelle.offsetTop - oben)
                    : (unten - (vonZelle.offsetTop + feldMass));
            } else {
                strecke = (dx === 1)
                    ? (vonZelle.offsetLeft - links)
                    : (rechts - (vonZelle.offsetLeft + feldMass));
            }
            const verzoegerung = Math.max(0, Math.round(
                (strecke / Math.max(1, laenge)) * TEAM_SCHACH.NUDELHOLZ_ROLL_MS));

            /*
             * EINE ANIMATION STATT EINES ÜBERGANGS (v0.117.1): Startlage,
             * Wartezeit und Gleiten stecken in EINEM Stück, das synchron
             * beim Aufbau gesetzt wird — `backwards` hält das erste Bild
             * (die Figur auf ihrem alten Feld) während der Verzögerung.
             * Beim Übergangs-Weg von vorher konnte zwischen Aufbau und
             * Rücksetzung ein Einzelbild mit der Endstellung durchblitzen:
             * Die Figur hüpfte kurz vor und wieder zurück.
             */
            figurEl.style.setProperty("--schub-von",
                (vonZelle.offsetLeft - nachZelle.offsetLeft) + "px, "
                + (vonZelle.offsetTop - nachZelle.offsetTop) + "px");
            figurEl.style.animation = "nudelholz-schub "
                + TEAM_SCHACH.ANIMATION_MS + "ms ease-out "
                + verzoegerung + "ms backwards";
            nachZelle.classList.add("feld-zieht");

            window.setTimeout(() => {
                nachZelle.classList.remove("feld-zieht");
                figurEl.style.animation = "";
            }, verzoegerung + TEAM_SCHACH.ANIMATION_MS + 60);
        }
    },

});
