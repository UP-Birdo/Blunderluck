/*
 * team-schach-auswertung.js - was nach dem Zug und nach der Partie zu sehen ist.
 *
 * Teil des Bildschirms TEAM_SCHACH; der Einstieg steht in team-schach.js.
 * Diese Datei ERGAENZT dasselbe Objekt (siehe dort) und wird NACH ihm geladen.
 *
 * Hier drin: der Abschluss-Bildschirm mit dem Punktestand, die Uebersicht aller
 * Faehigkeiten und die Bilanz samt Zugverlauf unter dem Brett.
 */

Object.assign(TEAM_SCHACH, {
    /* ---------------------------------------------------------------- *
     * Abschluss: Rückschau, Sieg/Niederlage, Punktestand
     *
     * DREI Schritte seit v0.61, die den ganzen Bereich einnehmen:
     *
     *   0  die Rückschau — WARUM es so ausging (Wunsch #7)
     *   1  Sieg oder Niederlage samt Punkten dieser Partie
     *   2  der Punktestand aller Mitspieler
     *
     * Danach geht es zurück in die Übersicht, und die Partie gilt für dieses
     * Gerät als abgeschlossen.
     *
     * WARUM DIE RÜCKSCHAU VORNE STEHT: Sobald „Gewonnen" oder „Verloren" auf
     * dem Schirm steht, ist die Frage beantwortet und niemand liest mehr nach,
     * wie es dazu kam. Genau so war der Wunsch formuliert — „vor dem Gewinnen
     * oder Verlieren".
     *
     * Warum das keine Dialog-Box ist: Das Ende einer Partie, an der man tagelang
     * gespielt hat, ist der Moment, auf den alles zulief. Eine Meldung mit
     * OK-Knopf würde ihn wegwischen.
     * ---------------------------------------------------------------- */

    /* Je Partie regnet das Konfetti nur EINMAL — die regelmässige Abfrage
       zeichnet den Abschluss sonst alle paar Sekunden neu. Kein Spielstand,
       nur Anzeige-Gedächtnis (wie `animiertBis`). */
    _konfettiGespielt: {},

    /*
     * DER KONFETTIREGEN ZUM SIEG (seit v0.116): zwei Dutzend fallende,
     * trudelnde Farbstücke über der Gewonnen-Fläche. Ohne Zufall — Lage und
     * Verzögerung sind aus der Stücknummer gerechnet, damit kein
     * `Math.random` in den Bildschirm-Code einzieht. Bei „weniger Bewegung"
     * entsteht der Regen gar nicht erst (dasselbe Muster wie die
     * Wirkungs-Schauspiele, deshalb steht das CSS ausserhalb des
     * no-preference-Blocks).
     */
    _konfettiStreuen(flaeche, partieId) {
        if (TEAM_SCHACH._konfettiGespielt[partieId]) {
            return;
        }
        if (typeof window !== "undefined"
            && typeof window.matchMedia === "function"
            && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            return;
        }
        TEAM_SCHACH._konfettiGespielt[partieId] = true;

        const regen = TEAM_SCHACH._element("div", "konfetti-regen");
        regen.setAttribute("aria-hidden", "true");

        for (let stueck = 0; stueck < 24; stueck++) {
            const teil = TEAM_SCHACH._element("span",
                "konfetti-stueck konfetti-" + (stueck % 6));
            teil.style.left = ((stueck * 37 + 11) % 100) + "%";
            teil.style.animationDelay = ((stueck * 53) % 900) + "ms";
            regen.appendChild(teil);
        }

        flaeche.appendChild(regen);
        window.setTimeout(() => {
            if (regen.parentNode) {
                regen.parentNode.removeChild(regen);
            }
        }, 3600);
    },

    _abschlussZeichnen(wurzel, partie, person) {
        if (TEAM_SCHACH.abschluss.schritt === 2) {
            TEAM_SCHACH._punktestandZeichnen(wurzel, partie, person);
            return;
        }
        if (TEAM_SCHACH.abschluss.schritt === 0) {
            TEAM_SCHACH._rueckschauZeichnen(wurzel, partie, person);
            return;
        }

        const meinTeam = SCHACH_RUNDE.teamVon(partie, person.id);
        const gewonnen = (partie.ergebnis === meinTeam);
        const remis = (partie.ergebnis === "remis");

        const art = remis ? "remis" : (gewonnen ? "sieg" : "niederlage");
        const flaeche = TEAM_SCHACH._element("div", "abschluss abschluss-" + art);

        flaeche.appendChild(TEAM_SCHACH._element("p", "abschluss-marke", partie.titel));
        flaeche.appendChild(TEAM_SCHACH._element("h2", "abschluss-titel",
            remis ? "Unentschieden" : (gewonnen ? "Gewonnen" : "Verloren")));

        /* Zum Sieg regnet einmal Konfetti (seit v0.116). */
        if (gewonnen) {
            TEAM_SCHACH._konfettiStreuen(flaeche, partie.id);
        }

        const lage = SCHACH.lage(partie.stand);
        flaeche.appendChild(TEAM_SCHACH._element("p", "abschluss-text",
            remis
                ? "Keine Seite konnte die Partie für sich entscheiden."
                : (gewonnen
                    ? "Euer Team hat die Partie gewonnen."
                    : ((partie.ergebnis === "weiss") ? "Weiss" : "Schwarz")
                        + " hat die Partie gewonnen.")));

        if (lage.text && lage.art !== "laeuft") {
            flaeche.appendChild(TEAM_SCHACH._element("p", "abschluss-grund", lage.text));
        }

        /*
         * WAS DIESE PARTIE GEBRACHT HAT — GROSS OBEN, DANN AUFGESCHLÜSSELT
         * (seit v0.53).
         *
         * Bis v0.52 stand hier eine Summe und daneben in Klammern, woraus sie
         * besteht. Die Beute fehlte darin ganz: Gerechnet hatte sie die
         * Rangliste längst, gezeigt wurde sie nie. Jetzt kommt die Zahl aus
         * `RANGLISTE.schachPunkteJePartie` — derselben Rechnung, die auch die
         * Rangliste füllt —, und darunter steht Zeile für Zeile, wofür es sie
         * gab. Links die Sache, rechts die Punkte.
         */
        /*
         * `schachPunkteJePartie` rechnet auf einem CHRONIK-Eintrag, nicht auf
         * der laufenden Partie: Dort steht die Beute als Zahl, weil das Brett
         * nach dem Löschen nicht mehr da wäre. Gebaut wird er mit derselben
         * Funktion, die auch die Chronik füllt — sonst stünde die Umrechnung
         * zweimal im Programm und liefe auseinander.
         */
        /*
         * GEGEN DEN COMPUTER ENDET ES HIER (Nutzer-Ansage 24.08.2026,
         * v0.32.0).
         *
         * Punkte gibt es in einer Bot-Partie für NIEMANDEN — das ist seit
         * v0.27.0 so und in `test-rangliste.js` dreifach festgenagelt. Bis
         * v0.31.0 kam trotzdem der ganze Apparat: eine grosse „+0", eine
         * Aufschlüsselung, aus der nichts folgt, und ein Knopf in eine
         * Rangliste, in der sich nichts geändert hat. Der Weg dorthin bleibt
         * offen — über den Tab, wann immer man will.
         *
         * Der Satz darunter ist Absicht: Ohne ihn sucht man die Punkte.
         */
        const gegenComputer = (typeof SCHACH_BOT !== "undefined")
            && SCHACH_BOT.istBotPartie(partie);

        if (gegenComputer) {
            flaeche.appendChild(TEAM_SCHACH._element("p", "erklaerung",
                "Gegen den Computer gibt es keine Punkte — die Rangliste "
                + "bleibt, wie sie war."));

            const nurZurueck = TEAM_SCHACH._element("div", "abschluss-leiste");
            nurZurueck.appendChild(TEAM_SCHACH._knopf("Zurück zur Übersicht",
                "knopf-haupt", () => TEAM_SCHACH.abschlussSchliessen(partie.id)));
            flaeche.appendChild(nurZurueck);

            wurzel.appendChild(flaeche);
            return;
        }

        const teil = RANGLISTE.schachPunkteJePartie(
            SCHACH_TAFEL._chronikEintrag(partie), meinTeam);

        const kasten = TEAM_SCHACH._element("div", "abschluss-punkte");
        kasten.appendChild(TEAM_SCHACH._element("span", "abschluss-zahl",
            "+" + teil.punkte));
        kasten.appendChild(TEAM_SCHACH._element("span", "abschluss-punkte-text",
            "Punkte für die Rangliste"));
        flaeche.appendChild(kasten);

        flaeche.appendChild(TEAM_SCHACH._aufschluesselungBauen(partie, meinTeam, teil));

        const leiste = TEAM_SCHACH._element("div", "abschluss-leiste");
        leiste.appendChild(TEAM_SCHACH._knopf("Punktestand ansehen", "knopf-haupt",
            () => {
                TEAM_SCHACH.abschluss.schritt = 2;
                TEAM_SCHACH.zeichnen(TEAM_SCHACH.abgleich.daten);
            }));
        flaeche.appendChild(leiste);

        wurzel.appendChild(flaeche);
    },

    /*
     * DIE RÜCKSCHAU (seit v0.61, Wunsch #7).
     *
     * Sie zeigt in dieser Reihenfolge: wie es endete, was es an Figuren
     * gekostet hat, und welche Fähigkeiten und Unglückswürfel dazwischen
     * lagen. Was ein Wendepunkt ist, entscheidet das Modell
     * (`SCHACH_RUNDE.rueckschau`) — hier wird nur gezeichnet.
     *
     * Sie ist bewusst NEUTRAL gehalten: kein Grün, kein Rot. Ob es ein Sieg
     * war, sagt das nächste Bild; hier geht es um den Hergang.
     */
    _rueckschauZeichnen(wurzel, partie, person) {
        const meinTeam = SCHACH_RUNDE.teamVon(partie, person.id);
        const schau = SCHACH_RUNDE.rueckschau(partie, meinTeam);

        const flaeche = TEAM_SCHACH._element("div", "abschluss abschluss-rueckschau");

        flaeche.appendChild(TEAM_SCHACH._element("p", "abschluss-marke", partie.titel));
        flaeche.appendChild(TEAM_SCHACH._element("h2", "abschluss-titel", "Wie es dazu kam"));

        /*
         * ZWEI SPALTEN (seit v0.64): links die SCHLUSSSTELLUNG, rechts der
         * Text. Gemeldet als „blende den Text rechts ein und links das finale
         * Spielfeld nochmal zeigen, wie das Feld ganz zum Schluss aussah."
         *
         * Das Brett ist dasselbe, das auch die Anleitungen zeichnen
         * (`_beispielBrettBauen`) — klein, ohne Bedienung, aber mit allem
         * darauf: Figuren, Würfel, Mauern, Risse. Eine zweite Zeichenroutine
         * liefe früher oder später der ersten hinterher.
         *
         * Auf schmalen Geräten stehen die beiden untereinander, Brett zuerst
         * (siehe Stildatei) — nebeneinander wäre das Brett dort briefmarkengross.
         */
        const spalten = TEAM_SCHACH._element("div", "rueckschau-spalten");

        const brettSpalte = TEAM_SCHACH._element("div", "rueckschau-brett");
        brettSpalte.appendChild(TEAM_SCHACH._element("span", "rueckschau-marke",
            "So stand es am Ende"));
        /* Ein Bild ohne jede Markierung: kein Tipp, kein Pfeil, kein Zielfeld —
           die Stellung, wie sie stehen geblieben ist. Die leeren Listen sind
           Pflicht, `_beispielBrettBauen` fragt sie ohne Umweg ab. */
        brettSpalte.appendChild(TEAM_SCHACH._beispielBrettBauen({
            runde: partie,
            marken: [],
            wahl: [],
            ziele: [],
            wege: [],
            tipp: -1
        }));
        spalten.appendChild(brettSpalte);

        const textSpalte = TEAM_SCHACH._element("div", "rueckschau-text");
        spalten.appendChild(textSpalte);
        flaeche.appendChild(spalten);

        textSpalte.appendChild(TEAM_SCHACH._element("p", "abschluss-text", schau.ende));

        /* Was jede Seite an Material gelassen hat. */
        const bilanz = TEAM_SCHACH._element("div", "abschluss-aufschluesselung");
        const zeile = (was, wert) => {
            const eintrag = TEAM_SCHACH._element("div", "abschluss-posten");
            eintrag.appendChild(TEAM_SCHACH._element("span", "abschluss-posten-was", was));
            eintrag.appendChild(TEAM_SCHACH._element("span", "abschluss-posten-wert",
                String(wert)));
            bilanz.appendChild(eintrag);
        };

        zeile("Dein Team hat verloren (Figurenwert)", schau.wert.eigen);
        zeile("Der Gegner hat verloren (Figurenwert)", schau.wert.gegner);

        /*
         * WAS AM ENDE NOCH AUF DEM BRETT STAND (seit v0.76).
         *
         * Die zwei Zeilen darüber sagen, was die Partie GEKOSTET hat. Wer
         * besser dastand, ist eine andere Frage — und die beantwortet nur die
         * Stellung: Wiedergeburt, Umwandlung und Verstärkung bringen Material
         * zurück oder erschaffen es, ohne dass jemand etwas verloren hätte. Bis
         * v0.75 wurde der Satz darunter aus den VERLUSTEN gerechnet und
         * widersprach deshalb dem, was man auf dem Brett daneben sah.
         */
        zeile("Auf dem Brett standen noch (dein Team)", schau.stellung.eigen);
        zeile("Auf dem Brett standen noch (Gegner)", schau.stellung.gegner);
        textSpalte.appendChild(bilanz);

        const abstand = schau.stellung.eigen - schau.stellung.gegner;
        textSpalte.appendChild(TEAM_SCHACH._element("p", "abschluss-grund",
            (abstand === 0)
                ? "Am Material lag es nicht — am Ende stand auf beiden Seiten "
                    + "gleich viel."
                : ((abstand > 0)
                    ? "Beim Material lagt ihr vorn, um " + abstand + "."
                    : "Beim Material lagt ihr hinten, um " + (-abstand) + ".")));

        /* Die Wendepunkte — Fähigkeiten und Unglückswürfel, in der Reihenfolge,
           in der sie geschahen. */
        const liste = TEAM_SCHACH._element("div", "zug-liste rueckschau-liste");

        if (schau.wendepunkte.length === 0) {
            liste.appendChild(TEAM_SCHACH._element("p", "erklaerung",
                "Keine Fähigkeit und keine Unglücks-Lootbox — diese Partie wurde "
                + "allein mit Zügen entschieden."));
        }

        for (const punkt of schau.wendepunkte) {
            const eintrag = TEAM_SCHACH._element("div",
                "zug-zeile" + (punkt.unglueck ? " rueckschau-unglueck" : ""));

            eintrag.appendChild(TEAM_SCHACH._element(
                "span",
                "zug-farbe " + ((punkt.farbe === "weiss") ? "zug-weiss" : "zug-schwarz"),
                punkt.eigen ? "Ihr" : "Gegner"
            ));
            eintrag.appendChild(TEAM_SCHACH._element("span", "zug-text", punkt.text));
            liste.appendChild(eintrag);
        }

        textSpalte.appendChild(liste);

        const leiste = TEAM_SCHACH._element("div", "abschluss-leiste");
        leiste.appendChild(TEAM_SCHACH._knopf("Weiter zum Ergebnis", "knopf-haupt",
            () => {
                TEAM_SCHACH.abschluss.schritt = 1;
                TEAM_SCHACH.zeichnen(TEAM_SCHACH.abgleich.daten);
            }));
        flaeche.appendChild(leiste);

        wurzel.appendChild(flaeche);
    },

    /*
     * Die Aufschlüsselung unter der grossen Zahl: links wofür, rechts wie viel.
     *
     * Die geschlagenen Figuren stehen einzeln da (Dame 9, Turm 5 …) — genau
     * darum ging es im Wunsch: Man soll sehen, was die Beute wert war, nicht
     * nur ihre Summe. Gezählt wird nach Art, sonst stünde bei acht Bauern
     * achtmal dieselbe Zeile.
     */
    _aufschluesselungBauen(partie, farbe, teil) {
        const liste = TEAM_SCHACH._element("div", "abschluss-aufschluesselung");
        const zeile = (was, wert) => {
            const eintrag = TEAM_SCHACH._element("div", "abschluss-posten");
            eintrag.appendChild(TEAM_SCHACH._element("span", "abschluss-posten-was", was));
            eintrag.appendChild(TEAM_SCHACH._element("span", "abschluss-posten-wert",
                (wert >= 0 ? "+" : "") + wert));
            liste.appendChild(eintrag);
        };

        zeile("Mitgespielt", RANGLISTE.PUNKTE_TEILNAHME);

        if (teil.ausgang === "sieg") {
            zeile("Partie gewonnen", RANGLISTE.PUNKTE_SIEG);
        } else if (teil.ausgang === "remis") {
            zeile("Unentschieden", RANGLISTE.PUNKTE_REMIS);
        }

        /*
         * Die geschlagenen Figuren, nach Art gezählt. Der Figurenwert kommt aus
         * dem Modell (`SCHACH_RUNDE.FIGUR_WERT`) — er ist derselbe, aus dem die
         * Rangliste ihre Beutepunkte rechnet.
         */
        const bilanz = SCHACH_RUNDE.bilanz(partie, farbe);
        const gezaehlt = {};

        for (const art of bilanz.geschlagen) {
            gezaehlt[art] = (gezaehlt[art] || 0) + 1;
        }

        for (const art of Object.keys(gezaehlt).sort()) {
            const anzahl = gezaehlt[art];
            const wert = (SCHACH_RUNDE.FIGUR_WERT[art] || 0) * anzahl;

            liste.appendChild(TEAM_SCHACH._element("div", "abschluss-posten-still"));
            const eintrag = TEAM_SCHACH._element("div", "abschluss-posten");
            eintrag.appendChild(TEAM_SCHACH._element("span", "abschluss-posten-was",
                SCHACH.artName(art) + (anzahl > 1 ? " (" + anzahl + "×)" : "")));
            eintrag.appendChild(TEAM_SCHACH._element("span", "abschluss-posten-wert",
                String(wert) + " Figurenwert"));
            liste.appendChild(eintrag);
        }

        /*
         * Die Beute zählt gedeckelt in die Rangliste — sonst ersetzte sie einen
         * Sieg, statt ihn zu ergänzen. Deshalb steht sie als EIGENE Zeile da,
         * mit dem Wert, der wirklich gutgeschrieben wurde.
         */
        if (teil.beute > 0) {
            zeile("Beute (" + bilanz.punkte + " Figurenwert Vorsprung)", teil.beute);
        }

        return liste;
    },

    _punktestandZeichnen(wurzel, partie, person) {
        const flaeche = TEAM_SCHACH._element("div", "abschluss abschluss-stand");

        flaeche.appendChild(TEAM_SCHACH._element("h2", "abschluss-titel", "Punktestand"));

        /* Die Rangliste rechnet — hier wird nur gezeigt. */
        const spielerDaten = (ANMELDUNG.abgleich && ANMELDUNG.abgleich.daten)
            ? ANMELDUNG.abgleich.daten
            : null;
        const liste = RANGLISTE.gesamt(spielerDaten, TEAM_SCHACH.abgleich.daten);

        if (liste.length === 0) {
            flaeche.appendChild(TEAM_SCHACH._element("p", "erklaerung",
                "Noch keine Punkte."));
        } else {
            const tabelle = TEAM_SCHACH._element("div", "abschluss-tabelle");

            /*
             * WER AUS DIESER PARTIE WIE VIEL MITGENOMMEN HAT (seit v0.53).
             *
             * Über beiden Seiten steht ein grüner Pfeil mit dem Zuwachs — sonst
             * sieht man nur den Gesamtstand und muss raten, was gerade
             * dazugekommen ist. Gerechnet wird je FARBE, nicht je Person: Ein
             * Team teilt sich das Ergebnis, und jeder darin bekommt dieselben
             * Punkte.
             */
            const zuwachs = {};
            const chronik = SCHACH_TAFEL._chronikEintrag(partie);

            for (const farbe of ["weiss", "schwarz"]) {
                const teil = RANGLISTE.schachPunkteJePartie(chronik, farbe);
                for (const id of partie.teams[farbe]) {
                    zuwachs[id] = teil.punkte;
                }
            }

            for (let platz = 0; platz < liste.length; platz++) {
                const eintrag = liste[platz];
                const zeile = TEAM_SCHACH._element("div",
                    "abschluss-zeile" + ((eintrag.id === person.id) ? " abschluss-ich" : ""));

                zeile.appendChild(TEAM_SCHACH._element("span", "abschluss-platz",
                    (platz + 1) + "."));
                zeile.appendChild(TEAM_SCHACH._element("span", "abschluss-name", eintrag.name));

                if (zuwachs[eintrag.id] > 0) {
                    const marke = TEAM_SCHACH._element("span", "abschluss-zuwachs");
                    marke.appendChild(TEAM_SCHACH._pfeilHochBauen());
                    marke.appendChild(TEAM_SCHACH._element("span", "abschluss-zuwachs-zahl",
                        "+" + zuwachs[eintrag.id]));
                    marke.title = "Aus dieser Partie";
                    zeile.appendChild(marke);
                }

                zeile.appendChild(TEAM_SCHACH._element("span", "abschluss-gesamt",
                    String(eintrag.gesamt)));

                tabelle.appendChild(zeile);
            }

            flaeche.appendChild(tabelle);
        }

        flaeche.appendChild(TEAM_SCHACH._element("p", "erklaerung",
            "Die Punkte dieser Partie sind festgeschrieben. Sie bleiben erhalten, "
            + "auch wenn die Partie später aus der Liste verschwindet."));

        const leiste = TEAM_SCHACH._element("div", "abschluss-leiste");
        leiste.appendChild(TEAM_SCHACH._knopf("Zurück zur Übersicht", "knopf-haupt",
            () => TEAM_SCHACH.abschlussSchliessen(partie.id)));
        flaeche.appendChild(leiste);

        wurzel.appendChild(flaeche);
    },

    /* Den Abschluss einer beendeten Partie noch einmal ansehen — auch hier
       von vorn, also mit der Rückschau (seit v0.61). */
    abschlussZeigen(id) {
        TEAM_SCHACH.abschluss = { id: id, schritt: 0 };
        TEAM_SCHACH.offeneId = "";
        TEAM_SCHACH.zeichnen(TEAM_SCHACH.abgleich.daten);
    },

    /* Abschluss weglegen: Die Partie gilt auf diesem Gerät als erledigt —
       dauerhaft, also auch nach dem Neuladen der Seite. */
    abschlussSchliessen(id) {
        ICH.abschlussMerken(id);
        TEAM_SCHACH.abschluss = null;
        TEAM_SCHACH.offeneId = "";
        TEAM_SCHACH._auswahlAufheben();
        TEAM_SCHACH.zeichnen(TEAM_SCHACH.abgleich.daten);

        /* Nach der Partie geht es auf den Startbildschirm, nicht in das
           Code-Feld für fremde Runden (seit v0.36.0) — Begründung bei
           `TEAM_SCHACH._zumStart`. */
        TEAM_SCHACH._zumStart();
    },


    /* ---------------------------------------------------------------- *
     * Fähigkeiten
     * ---------------------------------------------------------------- */

    /*
     * Gefragt wird die PARTIE, nicht die Spielart.
     *
     * Seit v2.5 lassen sich die Würfel zu jeder Spielart zuschalten
     * (`regeln.faehigkeiten`); nur `SCHACH_RUNDE.faehigkeitenAn` kennt beide
     * Fälle — Schalter der Partie zuerst, sonst die Vorgabe der Spielart. Diese
     * Karte fragte weiter die Spielart und blieb deshalb bei „klassisch mit
     * Würfeln" weg: Die Würfel lagen auf dem Brett, aber die eingesammelten
     * Fähigkeiten liessen sich nirgends einsetzen.
     */
    _faehigkeitenBauen(partie, person) {
        if (!SCHACH_RUNDE.faehigkeitenAn(partie)) {
            return null;
        }

        const karte = TEAM_SCHACH._element("section", "karte");

        /*
         * Überschrift und i-Knopf in einer Zeile.
         *
         * Bis v3.5 stand unter der Überschrift ein Absatz, der die Würfel
         * erklärte, und der i-Knopf ganz unten. Auf dem Handy schob das die
         * Fähigkeiten — das Einzige, was man hier anfassen kann — unter den
         * sichtbaren Bereich. Der Erklärtext steht jetzt im i-Menü, wo er
         * hingehört: Wer ihn braucht, sucht ihn dort; wer spielt, sieht seine
         * Fähigkeiten.
         */
        const kopf = TEAM_SCHACH._element("div", "karte-kopf");
        kopf.appendChild(TEAM_SCHACH._element("h3", "", "Fähigkeiten"));
        kopf.appendChild(TEAM_SCHACH._infoKnopfBauen());
        karte.appendChild(kopf);

        const meinTeam = SCHACH_RUNDE.teamVon(partie, person.id);

        /* Wartet gerade eine Fähigkeit auf ihr Ziel? Dann zählt nur das. */
        if (TEAM_SCHACH.zielFaehigkeit) {
            const hinweis = TEAM_SCHACH._element("p", "erklaerung erklaerung-rochade",
                SCHACH_VARIANTEN.faehigkeitTitel(TEAM_SCHACH.zielFaehigkeit)
                + ": Tippe eines der hervorgehobenen Felder an.");
            karte.appendChild(hinweis);

            const leiste = TEAM_SCHACH._element("div", "faehigkeit-zeile");
            leiste.appendChild(TEAM_SCHACH._knopf("Abbrechen", "knopf-still knopf-klein",
                () => {
                    TEAM_SCHACH._auswahlAufheben();
                    TEAM_SCHACH.zeichnen(TEAM_SCHACH.abgleich.daten);
                }));
            karte.appendChild(leiste);
            return karte;
        }

        for (const farbe of ["weiss", "schwarz"]) {
            const koennen = partie.faehigkeiten[farbe];
            const zeile = TEAM_SCHACH._element("div", "faehigkeit-zeile");

            zeile.appendChild(TEAM_SCHACH._element("span", "zug-farbe",
                (farbe === "weiss") ? "Weiss" : "Schwarz"));

            if (koennen.length === 0) {
                zeile.appendChild(TEAM_SCHACH._element("span", "erklaerung", "keine"));
            }

            for (let stelle = 0; stelle < koennen.length; stelle++) {
                zeile.appendChild(TEAM_SCHACH._faehigkeitMarkeBauen(
                    partie, person, koennen[stelle], meinTeam === farbe));
            }

            karte.appendChild(zeile);
        }

        return karte;
    },

    /*
     * Eine Fähigkeit im Vorrat: Knopf, wenn man sie einsetzen darf, sonst nur
     * eine Marke. Dazu die beiden Zeichen, die sagen, was sie KOSTET:
     *
     *     +        Danach bleibt dir dein normaler Zug.
     *     Blitz    Geht auch, während der Gegner am Zug ist.
     *
     * Beides stand bis v3.5 nirgends. Man musste die Fähigkeit einsetzen, um
     * zu erfahren, ob damit der Zug weg ist — bei einer legendären eine teure
     * Art, es herauszufinden.
     *
     * DIE ZEICHEN SIND EIGENSCHAFTEN DER FÄHIGKEIT (seit v0.48), nicht des
     * Spielstands. Zwischen v0.41 und v0.47 fragte das Pluszeichen
     * `SCHACH_RUNDE.behaeltZug` — es verschwand also, sobald der Gegner am Zug
     * war, und bei gegnerischen Fähigkeiten stand es nie. Damit war es kein
     * Merkmal mehr, an dem man eine Fähigkeit wiedererkennt, sondern ein
     * Zustand, der ständig hin und her sprang. Der Nutzer will das Zeichen
     * IMMER und ÜBERALL sehen, auch beim Gegner: Es sagt, was die Fähigkeit
     * ist, nicht was gerade geht.
     *
     * Was gerade geht, sagt weiterhin der Dialog beim Einsetzen — dort steht
     * es als Satz, und dort ist Platz für „du bist gerade nicht dran".
     *
     * ANTIPPEN GEHT IMMER (seit v0.48). Wer nicht einsetzen darf — der Gegner
     * ist dran, oder es ist gar nicht die eigene Farbe — bekommt Beschreibung
     * und Anleitung zu sehen. Vorher war eine fremde Fähigkeit ein totes
     * Schildchen, und wer wissen wollte, was der Gegner da hat, musste die
     * Bibliothek durchsuchen.
     */
    _faehigkeitMarkeBauen(partie, person, art, meineFarbe) {
        const beschreibung = SCHACH_VARIANTEN.FAEHIGKEITEN[art] || {};
        const stufe = SCHACH_VARIANTEN.stufeVon(art);
        const darf = meineFarbe && SCHACH_RUNDE.darfEinsetzen(partie, person.id, art);

        /*
         * WARUM SIE NICHT GEHT, wenn es an einem leeren Vorrat liegt (seit
         * v0.59, Wunsch #19). Alle anderen Gründe („der Gegner ist dran")
         * sieht man am Brett; ein leerer Friedhof ist dagegen nicht sichtbar,
         * und ohne den Satz bliebe die Marke unerklärlich stumm.
         */
        const leererVorrat = meineFarbe
            && !SCHACH_RUNDE._gefalleneVorhanden(partie, person.id, art);

        /*
         * DASSELBE FÜR DIEB UND HÄNDLER (seit v0.94). Auch ihr Vorrat ist am
         * Brett nicht zu sehen: Der Dieb greift in den des Gegners, der
         * Händler braucht die Figuren, die er eintauschen will. Beide waren
         * bis v0.93 antippbar und sagten erst im Fenster danach ab.
         */
        const nichtsZuHolen = meineFarbe && !leererVorrat
            && !SCHACH_RUNDE._etwasZuHolen(partie, person.id, art);

        let grund = "";
        if (leererVorrat) {
            grund = "Gerade nicht möglich: Es ist niemand mehr da, den sie "
                + "zurückholen könnte. Sobald wieder eine Figur fällt, geht sie.";
        } else if (nichtsZuHolen && art === "dieb") {
            grund = "Gerade nicht möglich: Der Gegner hat keine einzige Fähigkeit "
                + "im Vorrat. Sobald er eine Lootbox einsammelt, geht es wieder.";
        } else if (nichtsZuHolen) {
            grund = "Gerade nicht möglich: Für den Tausch fehlen dir die Figuren, "
                + "die er haben will. Sein Angebot wechselt mit jedem Zug.";
        }

        const marke = TEAM_SCHACH._knopf(SCHACH_VARIANTEN.faehigkeitTitel(art),
            "knopf-still knopf-klein faehigkeit-knopf"
                + (darf ? "" : " faehigkeit-knopf-fremd"),
            () => (darf
                ? TEAM_SCHACH.faehigkeitEinsetzen(partie, art)
                : TEAM_SCHACH.faehigkeitAnsehen(art, grund)));

        if (SCHACH_VARIANTEN.zeigtPlus(art)) {
            const plus = TEAM_SCHACH._element("span", "faehigkeit-zeichen", "+");
            plus.title = "Danach bleibt der normale Zug — es kann noch gezogen "
                + "und geschlagen werden.";
            marke.appendChild(plus);
        }
        if (beschreibung.imGegenzug) {
            marke.appendChild(TEAM_SCHACH._blitzBauen());
        }

        /* Die Farbe der Stufe trägt die Marke — so sieht man sofort, wie
           selten die Fähigkeit war. */
        marke.style.setProperty("--stufe-farbe", stufe.farbe);

        /*
         * NUR EIN SATZ IM KURZHINWEIS (seit v0.94).
         *
         * Bis v0.93 stand hier die ganze Beschreibung — bei der Mauer 668
         * Zeichen. Der Kurzhinweis gehört dem BROWSER: Er zeichnet ihn in
         * seiner eigenen Schriftgrösse, und keine Zeile in dieser Stildatei
         * ändert daran etwas. Wer ihn kleiner haben will, muss weniger
         * hineinschreiben. Genau so wurde es gemeldet („zeigt den Riesentext").
         * Die ganze Beschreibung steht weiter im Fenster und in der Bibliothek.
         */
        marke.title = stufe.titel + " — " + SCHACH_VARIANTEN.faehigkeitKurz(art);

        return marke;
    },

    /*
     * Der Blitz: geht auch beim gegnerischen Zug.
     *
     * Gezeichnet als SVG und nicht als Zeichen aus der Schrift — das Haus
     * verbietet Emojis, und das einzige passende Schriftzeichen (U+26A1) wird
     * auf den meisten Geräten genau als solches gezeichnet.
     */
    _blitzBauen() {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("class", "faehigkeit-blitz");
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("aria-hidden", "true");

        const strich = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        strich.setAttribute("points", "13,2 4,14 10,14 9,22 19,9 13,9");
        svg.appendChild(strich);

        const titel = document.createElementNS("http://www.w3.org/2000/svg", "title");
        titel.textContent = "Geht auch, während der Gegner am Zug ist.";
        svg.appendChild(titel);

        return svg;
    },

    /*
     * Was eine Fähigkeit kostet, als ein Satz. Drei Fälle, und sie stehen an
     * genau EINER Stelle — die Bibliothek und der Blick auf eine fremde
     * Fähigkeit sagen sonst zweierlei über dasselbe Zeichen.
     */
    _kostenSatz(beschreibungsSatz) {
        if (beschreibungsSatz.istDerZug) {
            return "Kein Pluszeichen: Die Fähigkeit IST der Zug — du machst sie "
                + "sofort, etwas anderes geht in diesem Zug nicht mehr.";
        }
        if (beschreibungsSatz.beendetZug) {
            return "Kein Pluszeichen: Das Einsetzen kostet deinen Zug — danach "
                + "ist der Gegner dran.";
        }
        return "Pluszeichen (+): Nach dem Einsetzen darfst du noch ganz "
            + "normal ziehen.";
    },

    /*
     * Der grüne Pfeil nach oben (seit v0.53) — er sagt: Das ist dazugekommen.
     *
     * Gezeichnet und nicht als Schriftzeichen eingefügt, aus demselben Grund
     * wie beim Blitz und beim Würfel: Das Haus verbietet Emojis, und ein Pfeil
     * aus der Schrift wird auf den meisten Geräten genau als solcher gezeichnet.
     */
    _pfeilHochBauen() {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("class", "zuwachs-pfeil");
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("aria-hidden", "true");

        const strich = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        strich.setAttribute("points", "12,3 21,14 15,14 15,21 9,21 9,14 3,14");
        svg.appendChild(strich);

        return svg;
    },

    /* Der i-Knopf öffnet die Übersicht aller Fähigkeiten. */
    _infoKnopfBauen() {
        const knopf = document.createElement("button");
        knopf.type = "button";
        knopf.className = "info-knopf";
        knopf.textContent = "i";
        knopf.setAttribute("aria-label", "Welche Fähigkeiten gibt es?");
        knopf.title = "Welche Fähigkeiten gibt es?";
        knopf.addEventListener("click", () => TEAM_SCHACH.faehigkeitenOeffnen());
        return knopf;
    },

    /*
     * Die Übersicht der Fähigkeiten: nach Seltenheit geordnet, jede Stufe in
     * ihrer Farbe. Die Zahlen (Chance je Stufe, Abstand, Höchstzahl) stecken
     * hinter einem eigenen i an der Überschrift — wer nur wissen will, was eine
     * Fähigkeit tut, soll nicht durch Prozentwerte lesen müssen.
     */
    faehigkeitenOeffnen() {
        TEAM_SCHACH.infoOffen = true;
        /* Einmal neu bauen — danach lässt die regelmässige Abfrage sie in
           Ruhe (siehe `infoGezeichnet`). */
        TEAM_SCHACH.infoGezeichnet = false;
        TEAM_SCHACH.zeichnen(TEAM_SCHACH.abgleich.daten);
    },

    infoSchliessen() {
        TEAM_SCHACH.infoOffen = false;
        TEAM_SCHACH.infoGezeichnet = false;
        TEAM_SCHACH.infoStufe = "";
        TEAM_SCHACH.zeichnen(TEAM_SCHACH.abgleich.daten);
    },

    _infoZeichnen(wurzel) {
        /*
         * EIN Zurück-Knopf, oben links wie überall (seit v0.110, Nutzer-Ansage
         * 22.08.: „entferne einen, gleich zu finden in der ganzen App"). Bis
         * v0.109 schwebte hier ein ZWEITER am unteren Rand, weil die
         * Bibliothek lang ist — jetzt KLEBT stattdessen die Kopfzeile beim
         * Rollen oben fest (`partie-kopf-klebt`): derselbe Nutzen, ein Knopf.
         */
        const kopf = TEAM_SCHACH._element("div", "partie-kopf partie-kopf-klebt");
        kopf.appendChild(TEAM_SCHACH._knopf("Zurück", "knopf-still knopf-klein",
            () => TEAM_SCHACH.infoSchliessen()));
        kopf.appendChild(TEAM_SCHACH._element("h2", "partie-titel", "Fähigkeiten"));
        wurzel.appendChild(kopf);

        TEAM_SCHACH._infoInhaltBauen(wurzel);
    },

    /*
     * Der INHALT der Bibliothek, ohne Kopfzeile — seit v0.9.0 getrennt,
     * weil ihn zwei Ansichten brauchen: die Bibliothek im Spiel (oben, mit
     * Zurück-Knopf) und der Tab „Fähigkeiten" (faehigkeiten.js, die Leiste
     * ist dort der Weg zurück).
     */
    _infoInhaltBauen(wurzel) {
        wurzel.appendChild(TEAM_SCHACH._element("p", "erklaerung",
            "Wer mit einer Figur über eine Lootbox oder auf sie zieht, sammelt ein, "
            + "was darin steckt — vorher sieht man es nie. Nur der Springer sammelt "
            + "unterwegs nichts ein. Manche Lootboxen bringen nichts Gutes und wirken "
            + "sofort; ob man ihnen das ansieht, entscheidet ein Haken beim Anlegen."));

        wurzel.appendChild(TEAM_SCHACH._element("p", "erklaerung",
            "Nachschub kommt, solange ein Feld frei ist; liegen gelassene bleiben "
            + "liegen. Was du schon im Vorrat hast, kommt seltener nach."));

        /*
         * DAS ICON-RASTER (seit v0.12.0, Bündel A Schritt 8): alle
         * Fähigkeiten und Unglücke als Kacheln, der Rahmen zeigt die
         * Seltenheit, ein Tipp öffnet die Vorschau. Die echten Bilder
         * kommen später — bis dahin trägt jede Kachel ihren
         * Anfangsbuchstaben (Lückenfüller, Nutzer-Entscheidung F4).
         * Die Stufen-Karten mit den vollen Beschreibungen bleiben darunter
         * stehen, bis die echten Icons da sind.
         *
         * In der BIBLIOTHEK darf der Rahmen die Stufe immer zeigen — sie
         * ist kein Spiel. Wer die Kacheln je in den Vorrat unterm Brett
         * übernimmt, MUSS dort `seltenheitZeigen` beachten (Entwurf,
         * Abschnitt 4.2).
         */
        wurzel.appendChild(TEAM_SCHACH._iconRasterBauen());

        /* Die beiden Zeichen aus dem Vorrat erklären — dort ist kein Platz
           für Text, hier schon. */
        const legende = TEAM_SCHACH._element("section", "karte");
        legende.appendChild(TEAM_SCHACH._element("h3", "", "Die Zeichen am Vorrat"));

        const plusZeile = TEAM_SCHACH._element("div", "stufen-eintrag");
        plusZeile.appendChild(TEAM_SCHACH._element("span", "stufen-name", "Pluszeichen"));
        plusZeile.appendChild(TEAM_SCHACH._element("span", "stufen-text",
            "Nach dem Einsetzen bleibt dir dein normaler Zug. Fehlt es, kostet die "
            + "Fähigkeit den Zug. Das Zeichen steht immer da, auch beim Gegner."));
        legende.appendChild(plusZeile);

        const blitzZeile = TEAM_SCHACH._element("div", "stufen-eintrag");
        blitzZeile.appendChild(TEAM_SCHACH._element("span", "stufen-name", "Blitz"));
        blitzZeile.appendChild(TEAM_SCHACH._element("span", "stufen-text",
            "Du darfst sie auch einsetzen, während der Gegner am Zug ist. Wer zuerst "
            + "drückt, war zuerst."));
        legende.appendChild(blitzZeile);

        wurzel.appendChild(legende);

        /*
         * DIE STUFEN-LISTEN SIND SEIT v0.18.0 WEG (Wunsch 5, 24.08.2026:
         * „Fähigkeiten-Tab: nur noch das neue Icon-Raster — die
         * Stufen-Listen darunter sollen weg"). Bis v0.17.0 standen unter
         * dem Raster vier Karten mit allen 23 Einträgen zum Aufklappen.
         *
         * Verloren geht dabei nichts: Beschreibung und abgespielte
         * Anleitung stecken hinter jeder Raster-Kachel
         * (`faehigkeitAnsehen` bzw. der Pech-Hinweis). Was NUR in den
         * Karten stand, war die Auskunft „wie oft kommt diese Stufe" —
         * dafür steht jetzt die Stufen-Legende hier, vier Zeilen statt
         * vier Karten.
         */
        wurzel.appendChild(TEAM_SCHACH._stufenLegendeBauen());
    },

    /*
     * Die Stufen-Legende (seit v0.18.0): Welche Rahmenfarbe im Raster
     * welche Stufe ist — und hinter dem i, wie oft sie vorkommt. Sie
     * ersetzt die vier Stufen-Karten, nicht das Raster.
     */
    _stufenLegendeBauen() {
        const karte = TEAM_SCHACH._element("section", "karte");
        karte.appendChild(TEAM_SCHACH._element("h3", "", "Die Stufen"));

        for (const stufe of SCHACH_VARIANTEN.STUFEN) {
            const zeile = TEAM_SCHACH._element("div", "stufen-legende-zeile");
            zeile.style.setProperty("--stufe-farbe", stufe.farbe);

            zeile.appendChild(TEAM_SCHACH._element("span", "stufen-legende-punkt"));
            zeile.appendChild(TEAM_SCHACH._element("span", "stufen-name", stufe.titel));

            const zahlen = document.createElement("button");
            zahlen.type = "button";
            zahlen.className = "info-knopf";
            zahlen.textContent = "i";
            zahlen.setAttribute("aria-label", "Wie oft kommt " + stufe.titel + "?");
            zahlen.title = "Wie oft kommt " + stufe.titel + "?";
            zahlen.addEventListener("click", () => {
                DIALOG.hinweis(stufe.titel, SCHACH_VARIANTEN.stufenErklaerung(stufe.id));
            });
            zeile.appendChild(zahlen);

            karte.appendChild(zeile);
        }

        return karte;
    },

    _iconRasterBauen() {
        const raster = TEAM_SCHACH._element("div", "faehigkeiten-raster");

        for (const stufe of SCHACH_VARIANTEN.STUFEN) {
            for (const art of SCHACH_VARIANTEN.faehigkeitenDerStufe(stufe.id)) {
                raster.appendChild(TEAM_SCHACH._iconKachelBauen(
                    art, SCHACH_VARIANTEN.faehigkeitTitel(art), stufe, false));
            }
            for (const pechArt of SCHACH_VARIANTEN.pechDerStufe(stufe.id)) {
                raster.appendChild(TEAM_SCHACH._iconKachelBauen(
                    pechArt, SCHACH_VARIANTEN.pechTitel(pechArt), stufe, true));
            }
        }

        return raster;
    },

    /*
     * Eine Raster-Kachel: kein Text (Entwurf, Abschnitt 4.1) — nur der
     * Lückenfüller-Buchstabe, der Stufen-Rahmen und für Vorleseprogramme
     * der Titel. Unglücke tragen einen gestrichelten Rahmen.
     */
    _iconKachelBauen(art, titel, stufe, istPech) {
        const kachel = document.createElement("button");
        kachel.type = "button";
        kachel.className = "faehigkeit-kachel" + (istPech ? " kachel-pech" : "");
        kachel.style.setProperty("--stufe-farbe", stufe.farbe);
        kachel.title = titel + (istPech ? " (Unglück)" : "");
        kachel.setAttribute("aria-label", kachel.title);

        kachel.appendChild(TEAM_SCHACH._element("span", "kachel-zeichen",
            titel.charAt(0).toUpperCase()));

        kachel.addEventListener("click", () => {
            if (istPech) {
                DIALOG.hinweis(
                    titel + " (Unglück)",
                    SCHACH_VARIANTEN.pechBeschreibung(art),
                    TEAM_SCHACH._anleitungBauen(art)
                );
            } else {
                TEAM_SCHACH.faehigkeitAnsehen(art);
            }
        });

        return kachel;
    },

    /*
     * HIER STANDEN BIS v0.17.0 `_stufenKarteBauen`, `_bibliothekEintragBauen`
     * und `_bibliothekSchliessen` — die aufklappbare Bibliothek in vier
     * Stufen-Karten. Sie sind mit Wunsch 5 entfallen; an ihre Stelle traten
     * das Icon-Raster (v0.12.0) und die Stufen-Legende (oben). Wer sie
     * nachlesen will, findet sie im Backup `Backup\Blunderluck\v0.15.0`.
     */

    /* ---------------------------------------------------------------- *
     * Die Bildanleitung zu einer Fähigkeit (seit v0.41)
     *
     * Zwei kleine Bretter nebeneinander: vorher und nachher. WAS auf dem
     * Nachher-Bild steht, rechnet `SCHACH_VORSCHAU` mit den echten Regeln aus
     * — hier wird nur gezeichnet. Deshalb kann die Anleitung nicht veralten.
     * ---------------------------------------------------------------- */

    /*
     * Die ganze Anleitung zu einer Fähigkeit oder einem Unglückswürfel: EIN
     * Brett, das die Schritte nacheinander abspielt — Ausgangsstellung, der
     * Handgriff, die Wirkung — und immer wieder von vorn.
     *
     * WARUM ABGESPIELT UND NICHT NEBENEINANDER: Zwei Bretter nebeneinander
     * muss man vergleichen; eine Bewegung sieht man. Auf dem Handy ist ein
     * grosses Bild ausserdem lesbarer als zwei kleine. Wer im Betriebssystem
     * weniger Bewegung eingestellt hat, bekommt stattdessen alle Schritte
     * nebeneinander — dann ist der Vergleich der einzige Weg.
     *
     * Liefert null, wenn es kein Beispiel gibt (ein Test hält fest, dass das
     * für keine Fähigkeit vorkommt).
     */
    /*
     * DIE ANLEITUNG MIT DER GANZEN BESCHREIBUNG DARUNTER (seit v0.94).
     *
     * WAS DAS LÖST: Bis v0.93 stand die vollständige Beschreibung als Text
     * ÜBER den Bildern — bei der Mauer 668 Zeichen, auf dem Handy rund zwanzig
     * Zeilen. Die Bilder, die den langen Satz eigentlich ersetzen sollen,
     * standen damit unter dem Bildrand: Man musste erst durch die Erklärung
     * scrollen, um zu der Erklärung zu kommen. Gemeldet mit einem Bild, auf
     * dem vom Brett nur die obere Hälfte zu sehen war.
     *
     * Jetzt steht oben EIN Satz (`faehigkeitKurz`), darunter sofort die
     * Bilder, und darunter der ganze Text in einem Aufklapper. Verloren geht
     * nichts — es ist nur einen Tipp weiter weg als vorher, und zwar genau
     * für die, die es lesen wollen.
     *
     * Der Aufklapper entfällt, wenn die Beschreibung ohnehin nur aus einem
     * Satz besteht (Doppelzug, Spiegel): Dort stünde derselbe Text zweimal.
     */
    _anleitungMitBeschreibung(art) {
        const anleitung = TEAM_SCHACH._anleitungBauen(art);
        const voll = SCHACH_VARIANTEN.faehigkeitBeschreibung(art);
        const kurz = SCHACH_VARIANTEN.faehigkeitKurz(art);

        if (voll === kurz) {
            return anleitung;
        }

        const aufklapper = document.createElement("details");
        aufklapper.className = "mehr-text";

        const griff = document.createElement("summary");
        griff.textContent = "Die ganze Beschreibung";
        aufklapper.appendChild(griff);

        aufklapper.appendChild(TEAM_SCHACH._element("p", "mehr-text-satz", voll));

        if (!anleitung) {
            return aufklapper;
        }

        const halter = TEAM_SCHACH._element("div", "anleitung-mitbeschreibung");
        halter.appendChild(anleitung);
        halter.appendChild(aufklapper);

        return halter;
    },

    _anleitungBauen(art) {
        const schritte = SCHACH_VORSCHAU.schritte(art);
        if (!schritte || schritte.length === 0) {
            return null;
        }

        if (TEAM_SCHACH._wenigerBewegung()) {
            return TEAM_SCHACH._anleitungRuhigBauen(schritte);
        }

        const halter = TEAM_SCHACH._element("div", "anleitung anleitung-film");
        const bild = TEAM_SCHACH._element("div", "anleitung-bild");

        let stelle = 0;
        let brett = TEAM_SCHACH._beispielBrettBauen(schritte[0]);
        bild.appendChild(brett);
        halter.appendChild(bild);

        /*
         * DIE TEXTE STEHEN ALLE GLEICHZEITIG DA (seit v0.44), einer je Bild,
         * und der laufende ist hervorgehoben. Vorher wechselte EIN Satz mit
         * dem Bild — und weil die Sätze verschieden lang sind, hüpfte alles
         * darunter im Sekundentakt.
         */
        const liste = TEAM_SCHACH._element("ol", "anleitung-schritte");
        const zeilen = schritte.map((schritt, nummer) => {
            const zeile = TEAM_SCHACH._element("li",
                "anleitung-schritt" + (nummer === 0 ? " anleitung-schritt-jetzt" : ""));

            zeile.appendChild(TEAM_SCHACH._element("span", "anleitung-nummer",
                "Bild " + (nummer + 1)));
            zeile.appendChild(TEAM_SCHACH._element("span", "anleitung-satz", schritt.text));

            liste.appendChild(zeile);
            return zeile;
        });
        halter.appendChild(liste);

        const weiter = () => {
            /*
             * Ist das Bild nicht mehr im Bildschirm (Dialog geschlossen, neu
             * gezeichnet), hört der Takt von selbst auf. Sonst tickte er
             * weiter und schriebe in Elemente, die niemand mehr sieht.
             */
            if (halter.isConnected === false) {
                window.clearInterval(takt);
                return;
            }

            stelle = (stelle + 1) % schritte.length;

            const neues = TEAM_SCHACH._beispielBrettBauen(schritte[stelle]);
            bild.replaceChild(neues, brett);
            brett = neues;

            for (let nummer = 0; nummer < zeilen.length; nummer++) {
                zeilen[nummer].className = "anleitung-schritt"
                    + (nummer === stelle ? " anleitung-schritt-jetzt" : "");
            }
        };

        const takt = window.setInterval(weiter, TEAM_SCHACH.ANLEITUNG_MS);
        TEAM_SCHACH.anleitungTakte.push(takt);

        return halter;
    },

    /* Alle Schritte nebeneinander — für alle, die keine Bewegung wollen. */
    _anleitungRuhigBauen(schritte) {
        const halter = TEAM_SCHACH._element("div", "anleitung");

        /*
         * UND EIN SATZ, DER ES ERKLÄRT (seit v0.73, Meldung I1).
         *
         * Gemeldet wurde: „ist die Animation evtl. nicht am PC zu sehen oder
         * geht sie generell nicht mehr?" Sie geht — nur zeigt die App hier
         * absichtlich alle Bilder nebeneinander, weil im Betriebssystem
         * „weniger Bewegung" eingestellt ist (seit v0.42). Ohne einen Hinweis
         * sieht genau das aus wie ein Fehler.
         */
        halter.appendChild(TEAM_SCHACH._element("p", "erklaerung",
            "Dein Gerät ist auf weniger Bewegung eingestellt — deshalb stehen alle "
            + "Bilder nebeneinander, statt abgespielt zu werden."));

        for (let nummer = 0; nummer < schritte.length; nummer++) {
            const kasten = TEAM_SCHACH._element("div", "anleitung-bild");

            kasten.appendChild(TEAM_SCHACH._element("span", "anleitung-marke",
                "Bild " + (nummer + 1)));
            kasten.appendChild(TEAM_SCHACH._beispielBrettBauen(schritte[nummer]));
            kasten.appendChild(TEAM_SCHACH._element("p", "anleitung-text",
                schritte[nummer].text));

            halter.appendChild(kasten);
        }

        return halter;
    },

    /* Hat der Nutzer im Betriebssystem weniger Bewegung eingestellt? */
    _wenigerBewegung() {
        return !!(window.matchMedia
            && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    },

    /* Beendet alle laufenden Anleitungen — vor jedem Neuzeichnen. */
    _anleitungTakteBeenden() {
        for (const takt of TEAM_SCHACH.anleitungTakte) {
            window.clearInterval(takt);
        }
        TEAM_SCHACH.anleitungTakte = [];
    },

    /*
     * Ein Beispielbrett. Es zeigt dasselbe wie das echte Brett — Figuren,
     * Würfel, Mauern, Schild, Fessel, Frost und geliehene Figuren —, nur klein
     * und ohne Bedienung. Dazu die markierten Felder: worauf es in diesem Bild
     * ankommt.
     */
    _beispielBrettBauen(schritt) {
        const runde = schritt.runde;
        const marken = schritt.marken;
        const wahl = schritt.wahl;
        const stand = runde.stand;
        const breite = SCHACH.breiteVon(stand);
        const felder = SCHACH.felderVon(stand);

        const brett = TEAM_SCHACH._element("div", "vorschau anleitung-brett");
        brett.style.setProperty("--vorschau-spalten", String(breite));

        /* Das volle Glas trübt nur EINE Sicht — im Beispiel die des
           Betrachters, der ja die Seite spielt, die den Würfel erwischt hat. */
        const glas = TEAM_SCHACH._glasWirkt(runde, SCHACH_VORSCHAU.FARBE);

        for (let feld = 0; feld < felder; feld++) {
            const reihe = Math.floor(feld / breite);
            const spalte = feld % breite;

            const zelle = TEAM_SCHACH._element("div",
                "vorschau-feld " + (((reihe + spalte) % 2 === 0) ? "feld-hell" : "feld-dunkel"));

            /* Damit die Wirkungs-Schauspiele (v0.116) ihre Felder finden —
               dieselbe Adresse wie am echten Brett. */
            zelle.dataset.feld = String(feld);

            const figur = SCHACH.figurAuf(stand, feld);
            if (figur !== ".") {
                const getruebt = glas && SCHACH.farbeVon(figur) !== SCHACH_VORSCHAU.FARBE;
                const gezeigt = getruebt
                    ? TEAM_SCHACH._glasZeichen(runde, feld, figur)
                    : figur;

                zelle.appendChild(TEAM_SCHACH._element("span",
                    "figur " + (SCHACH.farbeVon(figur) === "weiss" ? "figur-weiss" : "figur-schwarz")
                    + TEAM_SCHACH._figurKlasse(gezeigt),
                    TEAM_SCHACH._figurZeichen(gezeigt)));

            } else if (schritt.graeber) {
                /*
                 * BLASSE GEFALLENE (seit v0.75, Meldung I21) — nur auf FREIEN
                 * Feldern und nur, wo die Anleitung sie braucht (Friedhof,
                 * Wiederbelebung; siehe `SCHACH_VORSCHAU.GRAEBER_ZEIGEN`).
                 *
                 * Gezeichnet wird in der Farbe DESSEN, der die Fähigkeit
                 * einsetzt: Was er bekommt, steht danach in seiner Farbe auf
                 * dem Brett — genau wie am echten Brett.
                 */
                const gefallene = (runde.gefallen && runde.gefallen[schritt.graeber])
                    ? runde.gefallen[schritt.graeber]
                    : [];

                let grab = "";
                for (let stelle = gefallene.length - 1; stelle >= 0 && !grab; stelle--) {
                    if (gefallene[stelle].feld === feld) {
                        grab = gefallene[stelle].art;
                    }
                }

                if (grab) {
                    zelle.appendChild(TEAM_SCHACH._element("span",
                        "figur figur-schemen figur-weiss"
                        + TEAM_SCHACH._figurKlasse(grab),
                        TEAM_SCHACH._figurZeichen(grab)));
                    zelle.title = "Hier fiel " + SCHACH.artName(grab);
                }
            }

            const wuerfel = runde.bonus.find((eintrag) => eintrag.feld === feld);
            if (wuerfel) {
                /*
                 * DIE SICHT ZÄHLT AUCH IM BEISPIEL (seit v0.118, für
                 * Enttarnen und Verstecken): Verbirgt die Beispiel-Partie
                 * die Seltenheit, sind die Würfel grau; das Enttarnen macht
                 * sie für den Betrachter farbig. Beim Verstecken zeigt das
                 * Nachher-Bild bewusst die Sicht des BETROFFENEN — deshalb
                 * fragt `versteckt` nur, OB verborgen ist, nicht für wen
                 * (der Text des Bildes sagt, wessen Sicht das ist).
                 */
                const versteckt = !!runde.stand.verstecktFarbe
                    && runde.zugZaehler < runde.stand.verstecktBis;
                const enttarnt = (runde.stand.enttarntFarbe === SCHACH_VORSCHAU.FARBE)
                    && runde.zugZaehler < runde.stand.enttarntBis;
                const farbeZeigen = ((runde.regeln.seltenheitZeigen !== false)
                    && !versteckt) || enttarnt;

                zelle.classList.add("feld-bonus");
                zelle.appendChild(TEAM_SCHACH._wuerfelBauen(
                    farbeZeigen
                        ? SCHACH_RUNDE.bonusStufe(wuerfel)
                        : SCHACH_VARIANTEN.STUFE_UNBEKANNT,
                    wuerfel.pech));
            }

            /* Ränder wie am echten Brett: nur aussen, damit die drei Felder
               EIN Riegel sind und nicht drei Steine. */
            if (SCHACH.mauerAuf(stand, feld)) {
                zelle.classList.add("feld-mauer");

                if (spalte === 0
                    || !SCHACH.mauerAuf(stand, SCHACH._feld(stand, reihe, spalte - 1))) {
                    zelle.classList.add("mauer-anfang");
                }
                if (spalte + 1 >= breite
                    || !SCHACH.mauerAuf(stand, SCHACH._feld(stand, reihe, spalte + 1))) {
                    zelle.classList.add("mauer-ende");
                }
            }
            /*
             * RISSE GEHÖREN AUCH INS KLEINE BRETT (seit v0.76).
             *
             * Gemeldet als „bei der Was-ist-passiert-Ansicht zeigt es nicht das
             * Kreuz-Schachbrett". Die Rückschau zeichnet die Schlussstellung
             * mit genau dieser Funktion — und sie kannte als Einzige die Risse
             * nicht. Auf einem Kreuz-Brett sind die vier toten Ecken aber
             * nichts anderes als Risse (seit v0.63): Ohne sie sah die
             * Schlussstellung aus wie ein gewöhnliches Quadrat, auf dem in den
             * Ecken nur zufällig nichts stand. Dasselbe fehlte in jeder
             * Anleitung, in der ein Erdbeben Löcher reisst.
             */
            if (SCHACH.rissAuf(stand, feld)) {
                zelle.classList.add("feld-riss");
            }
            if (stand.schildFeld === feld) {
                zelle.classList.add("feld-schild");
            }
            if (stand.fesselFeld === feld) {
                zelle.classList.add("feld-fessel");
            }

            /* Der Frost ist seit v0.56 ein Block mit Rahmen — gezeichnet von
               derselben Funktion wie am echten Brett. */
            TEAM_SCHACH._frostKanten(stand, feld, zelle);
            if (SCHACH.istGeliehen(stand, feld)) {
                zelle.classList.add("feld-geliehen");
            }

            /*
             * DIE RESTZEIT AUCH IN DER ANLEITUNG (seit v0.58).
             *
             * Am echten Brett steht sie seit v0.53 an jedem Feld, auf dem etwas
             * abläuft; im Beispielbrett fehlte sie. Gerade dort ist sie aber
             * die halbe Auskunft: „Die Mauer steht sechs Halbzüge" liest sich
             * anders, als die 6 am Feld zu sehen. Gefragt wird dasselbe
             * Regelwerk wie am echten Brett.
             */
            const restzeit = SCHACH.restzeitAuf(stand, feld);
            if (restzeit > 0) {
                zelle.appendChild(TEAM_SCHACH._element("span", "feld-restzeit",
                    String(restzeit)));
            }
            /* Die übrigen möglichen Felder — dieselbe Marke wie am echten
               Brett, wenn eine Fähigkeit auf ihr Ziel wartet. */
            if (wahl && wahl.indexOf(feld) !== -1) {
                zelle.classList.add("feld-wahl");
            }

            /* Wohin man ziehen könnte: der Zugpunkt aus dem echten Spiel. */
            if (schritt.ziele.indexOf(feld) !== -1) {
                zelle.classList.add(figur === "." ? "feld-ziel" : "feld-schlag");
            }

            if (marken.indexOf(feld) !== -1) {
                zelle.classList.add("vorschau-marke");
            }

            /* Der Fingerabdruck: HIER wird getippt. */
            if (schritt.tipp === feld) {
                zelle.appendChild(TEAM_SCHACH._fingerBauen());
            }

            brett.appendChild(zelle);
        }

        /* Die Pfeile liegen über dem ganzen Brett, nicht in einem Feld. */
        const pfeile = TEAM_SCHACH._pfeileBauen(stand, schritt.wege);
        if (pfeile) {
            brett.appendChild(pfeile);
        }

        /*
         * Das Wirkungs-Schauspiel spielt auch im Beispiel (seit v0.116) —
         * dieselbe Funktion wie am echten Brett. Kurz warten, bis das Bild
         * im Bildschirm hängt: Vorher hat die Nudelholz-Walze keine Masse.
         * In den Tests feuert der Zeitgeber nie — dort wird das Schauspiel
         * einzeln geprüft.
         */
        if (schritt.schauspiel) {
            window.setTimeout(() => TEAM_SCHACH._wirkungSchauspiel(brett, {
                wirkung: schritt.schauspiel,
                felder: schritt.marken,
                wege: schritt.wege
            }), 80);
        }

        /*
         * DER GRIFF AN DEN VORRAT (seit v0.50). Getippt wird in diesem Bild
         * nicht aufs Brett, sondern auf die Fähigkeit — also wird sie gezeigt,
         * mit dem Fingerabdruck darauf. Dasselbe Zeichen wie auf dem Brett,
         * damit man es wiedererkennt.
         *
         * Zurückgegeben wird dann eine Hülle um beides; der Aufrufer hängt
         * weiterhin genau EIN Element ein und muss nichts darüber wissen.
         */
        if (!schritt.knopf && !schritt.fenster) {
            return brett;
        }

        const huelle = TEAM_SCHACH._element("div", "anleitung-mitknopf");
        huelle.appendChild(brett);

        /*
         * DAS NACHGESTELLTE FENSTER (seit v0.75, Meldung I6).
         *
         * Der Händler ist die einzige Fähigkeit, die nachfragt — und genau die
         * Rückfrage fehlte in der Anleitung: Man sah den Griff an den Vorrat
         * und das Ergebnis, aber nie das Fenster dazwischen. Es ist ein BILD
         * des Fensters, kein echtes: Die Knöpfe sind Attrappen (`disabled`),
         * damit niemand in der Bibliothek etwas anzunehmen versucht.
         */
        if (schritt.fenster) {
            const fenster = TEAM_SCHACH._element("div", "anleitung-fenster");

            fenster.appendChild(TEAM_SCHACH._element("span", "anleitung-fenster-titel",
                schritt.fenster.titel));
            fenster.appendChild(TEAM_SCHACH._element("p", "anleitung-fenster-text",
                schritt.fenster.text));

            const knoepfe = TEAM_SCHACH._element("div", "anleitung-fenster-knoepfe");

            for (const eintrag of [{ text: schritt.fenster.nein, klasse: "knopf-still" },
                { text: schritt.fenster.ja, klasse: "knopf-haupt" }]) {

                const knopf = TEAM_SCHACH._element("span",
                    "knopf knopf-klein " + eintrag.klasse, eintrag.text);
                knopf.setAttribute("aria-hidden", "true");
                knoepfe.appendChild(knopf);
            }

            fenster.appendChild(knoepfe);
            huelle.appendChild(fenster);
        }

        if (!schritt.knopf) {
            return huelle;
        }

        /*
         * DIE MARKE STEHT IN JEDEM BILD (seit v0.58), der Fingerabdruck nur in
         * dem, in dem gedrückt wird. Bis v0.57 kam die ganze Leiste mit dem
         * einen Bild und verschwand danach — die Anleitung sprang bei jedem
         * Takt in der Höhe, und das Auge folgte dem Sprung statt dem Brett.
         */
        const leiste = TEAM_SCHACH._element("div", "anleitung-vorrat");
        const marke = TEAM_SCHACH._element("span",
            "chip faehigkeit-marke anleitung-knopf"
                + (schritt.knopfTipp ? "" : " anleitung-knopf-ruht"),
            schritt.knopf);

        if (schritt.knopfTipp) {
            marke.appendChild(TEAM_SCHACH._fingerBauen());
        }

        leiste.appendChild(marke);
        huelle.appendChild(leiste);

        return huelle;
    },

    /*
     * DIE TIPPENDE HAND — sie sagt: Hier tippst du hin. Seit v0.116 ersetzt
     * sie auf Nutzer-Wunsch (22.08.) den Fingerabdruck von v0.45: eine Hand
     * mit ausgestrecktem Zeigefinger, die im Takt der Anleitung sichtbar
     * nach unten tippt (CSS).
     *
     * GEZEICHNET, NICHT EINGEFÜGT. Dieselbe Entscheidung wie beim Würfel
     * (siehe `docs\entscheidungen\entschieden.md`, „Warum der Würfel gezeichnet
     * und nicht eingefügt ist"): Eine Bilddatei wäre ein weiterer Bestandteil,
     * der beim Ausliefern mitmuss, in jeder Grösse neu gebraucht wird und die
     * Farbe nicht mitdreht. Als Pfade bleibt das Zeichen überall scharf.
     */
    /* Die Handfläche: Zeigefinger hoch (Kuppe bei 10,7 | 4), rechts daneben
       die eingeklappten Finger, links der Daumenansatz. Eine geschlossene
       Fläche — so trägt sie Füllung UND Umriss. */
    HAND_FLAECHE: "M 9.1 13.6 L 9.1 5.7 A 1.6 1.6 0 0 1 12.3 5.7 L 12.3 10.4 "
        + "L 16.5 11.3 A 2.7 2.7 0 0 1 18.6 14.1 L 17.9 17.7 "
        + "A 3.5 3.5 0 0 1 14.5 20.5 L 12.2 20.5 A 4 4 0 0 1 9.1 19 "
        + "L 6.2 15.4 A 1.5 1.5 0 0 1 8.4 13.4 Z",

    /* Die Funken-Bögen über der Kuppe sind seit dem Nutzer-Zuruf vom 22.08.
       wieder raus („der Strich vorne weg") — die tippende Bewegung sagt
       schon alles. */

    _fingerBauen() {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("class", "anleitung-finger anleitung-hand");
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("aria-hidden", "true");

        const hand = document.createElementNS("http://www.w3.org/2000/svg", "path");
        hand.setAttribute("d", TEAM_SCHACH.HAND_FLAECHE);
        hand.setAttribute("class", "anleitung-hand-flaeche");
        svg.appendChild(hand);

        return svg;
    },

    /*
     * Die Bewegungspfeile über dem Beispielbrett (seit v0.44).
     *
     * NICHT ZU VERWECHSELN MIT DEM ALTEN ZUGPFEIL, der in v3.6 aus dem Spiel
     * geflogen ist: Der sollte JEDE Gangart darstellen und konnte es nicht
     * (siehe `docs\entscheidungen\entschieden.md`). Hier ist die Aufgabe eine
     * andere und viel kleinere — im Beispiel steht fest, welche Figur wohin
     * geht, und genau das zeigt eine gerade Linie richtig.
     *
     * Ein Pfeil je Weg, zweifarbig wie jede Markierung auf dem Brett: heller
     * Rand aussen, dunkler Kern darüber.
     */
    _pfeileBauen(stand, wege) {
        if (!wege || wege.length === 0) {
            return null;
        }

        const breite = SCHACH.breiteVon(stand);
        const hoehe = SCHACH.hoeheVon(stand);

        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("class", "anleitung-pfeile");
        svg.setAttribute("viewBox", "0 0 " + breite + " " + hoehe);
        svg.setAttribute("preserveAspectRatio", "none");
        svg.setAttribute("aria-hidden", "true");

        for (const weg of wege) {
            for (const teil of TEAM_SCHACH._pfeilTeile(weg, breite)) {
                svg.appendChild(teil);
            }
        }

        return svg;
    },

    /* Ein Pfeil: zwei Linien und zwei Spitzen (aussen hell, innen dunkel). */
    _pfeilTeile(weg, breite) {
        const mitte = (feld) => ({
            x: (feld % breite) + 0.5,
            y: Math.floor(feld / breite) + 0.5
        });

        const von = mitte(weg.von);
        const nach = mitte(weg.nach);
        const dx = nach.x - von.x;
        const dy = nach.y - von.y;
        const laenge = Math.sqrt(dx * dx + dy * dy) || 1;

        /* Der Pfeil hört kurz vor der Feldmitte auf — sonst steckt seine
           Spitze in der Figur, die dort steht. */
        const ex = dx / laenge;
        const ey = dy / laenge;
        const spitzeX = nach.x - ex * 0.26;
        const spitzeY = nach.y - ey * 0.26;
        const endeX = spitzeX - ex * 0.2;
        const endeY = spitzeY - ey * 0.2;

        const teile = [];

        for (const lage of ["rand", "kern"]) {
            const linie = document.createElementNS("http://www.w3.org/2000/svg", "line");
            linie.setAttribute("x1", String(von.x + ex * 0.26));
            linie.setAttribute("y1", String(von.y + ey * 0.26));
            linie.setAttribute("x2", String(endeX));
            linie.setAttribute("y2", String(endeY));
            linie.setAttribute("class", "anleitung-pfeil-" + lage);
            teile.push(linie);

            /* Die Spitze: ein Dreieck quer zur Richtung. */
            const quer = 0.16;
            const punkte = [
                spitzeX + " " + spitzeY,
                (endeX - ey * quer) + " " + (endeY + ex * quer),
                (endeX + ey * quer) + " " + (endeY - ex * quer)
            ].join(", ");

            const dreieck = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
            dreieck.setAttribute("points", punkte);
            dreieck.setAttribute("class", "anleitung-spitze-" + lage);
            teile.push(dreieck);
        }

        return teile;
    },

    /* ---------------------------------------------------------------- *
     * Verlauf
     * ---------------------------------------------------------------- */

    /*
     * Die Bilanz unter dem Brett: geschlagene und verlorene Figuren je Seite,
     * dazu der Vorsprung nach Figurenwert. Beantwortet auf einen Blick die
     * Frage, die man sonst durch Abzählen beantworten müsste — wer steht besser?
     *
     * SO WIE IN DEN BEKANNTEN SCHACH-APPS (seit v0.76, Nutzer-Meldung „der
     * Figurenzähler plus/minus ist nicht richtig, bitte von bekannten
     * Schach-Apps abschauen"). Zwei Dinge waren anders als dort:
     *
     *   1. GERECHNET WIRD AUS DER STELLUNG, nicht aus den Verlustlisten
     *      (`SCHACH_RUNDE.materialVorsprung`). Hier entsteht Material, ohne
     *      dass jemand schlägt — Umwandlung, Wiedergeburt, Verstärkung,
     *      Nachschub —, und genau dann log der alte Zähler. Die Begründung
     *      steht im Modell.
     *   2. NUR DIE FÜHRENDE SEITE BEKOMMT EINE ZAHL. Bis v0.75 stand links
     *      „+8" und rechts „-8" — dieselbe Auskunft zweimal, und ein Minus
     *      zeigt keine Schach-App. Steht es gleich, steht nirgends etwas.
     *
     * Die geschlagenen Figuren daneben bleiben, wie sie waren: Sie sagen, WAS
     * gefallen ist, und das beantwortet der Zähler nicht.
     */
    _bilanzBauen(partie) {
        const zeile = TEAM_SCHACH._element("div", "bilanz-reihe");

        for (const farbe of ["weiss", "schwarz"]) {
            const bilanz = SCHACH_RUNDE.bilanz(partie, farbe);
            const spalte = TEAM_SCHACH._element("div", "bilanz-seite");

            spalte.appendChild(TEAM_SCHACH._element("span", "zug-farbe",
                (farbe === "weiss") ? "Weiss" : "Schwarz"));

            /* Die geschlagenen Figuren als kleine Zeichen — das liest sich
               schneller als eine Zahl. */
            const beute = TEAM_SCHACH._element("span", "bilanz-beute");
            const sortiert = bilanz.geschlagen.slice().sort((einer, anderer) =>
                (SCHACH_RUNDE.FIGUR_WERT[anderer] || 0) - (SCHACH_RUNDE.FIGUR_WERT[einer] || 0));

            for (const art of sortiert) {
                /* Geschlagen wurden Figuren der Gegenfarbe. */
                const figur = (farbe === "weiss") ? art.toLowerCase() : art;
                beute.appendChild(TEAM_SCHACH._element("span",
                    "figur bilanz-figur " + ((farbe === "weiss") ? "figur-schwarz" : "figur-weiss")
                    + TEAM_SCHACH._figurKlasse(figur),
                    TEAM_SCHACH._figurZeichen(figur)));
            }

            if (sortiert.length === 0) {
                beute.appendChild(TEAM_SCHACH._element("span", "erklaerung", "nichts"));
            }
            spalte.appendChild(beute);

            const vorsprung = SCHACH_RUNDE.materialVorsprung(partie, farbe);
            spalte.appendChild(TEAM_SCHACH._element("span",
                "bilanz-punkte" + ((vorsprung > 0) ? " bilanz-vorn" : ""),
                (vorsprung > 0) ? ("+" + vorsprung) : ""));

            zeile.appendChild(spalte);
        }

        return zeile;
    },

    _verlaufBauen(partie) {
        const karte = TEAM_SCHACH._element("section", "karte");
        karte.appendChild(TEAM_SCHACH._bilanzBauen(partie));

        /* Auf dem Handy soll der Verlauf nicht die halbe Seite füllen —
           deshalb eingeklappt, mit der Anzahl in der Überschrift. */
        const kasten = document.createElement("details");
        kasten.className = "verlauf-kasten";

        const titel = document.createElement("summary");
        titel.className = "verlauf-titel";
        titel.textContent = "Züge (" + partie.verlauf.length + ")";
        kasten.appendChild(titel);

        if (partie.verlauf.length === 0) {
            kasten.appendChild(TEAM_SCHACH._element("p", "erklaerung", "Noch kein Zug."));
            karte.appendChild(kasten);
            return karte;
        }

        const liste = TEAM_SCHACH._element("div", "zug-liste");

        /* Neueste zuerst — auf dem Handy sieht man so das Wichtigste. */
        for (let i = partie.verlauf.length - 1; i >= 0; i--) {
            const eintrag = partie.verlauf[i];
            const zeile = TEAM_SCHACH._element("div", "zug-zeile");

            zeile.appendChild(TEAM_SCHACH._element(
                "span",
                "zug-farbe " + (eintrag.farbe === "weiss" ? "zug-weiss" : "zug-schwarz"),
                (eintrag.farbe === "weiss") ? "Weiss" : "Schwarz"
            ));
            zeile.appendChild(TEAM_SCHACH._element("span", "zug-text", eintrag.text));
            if (eintrag.wer) {
                zeile.appendChild(TEAM_SCHACH._element("span", "zug-wer", eintrag.wer));
            }

            liste.appendChild(zeile);
        }

        kasten.appendChild(liste);
        karte.appendChild(kasten);
        return karte;
    },
});
