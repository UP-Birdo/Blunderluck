/*
 * rangliste.js — der Tab "Rangliste": der Punktestand aller Schachpartien.
 *
 * AUSNAHME VON DER HAUSREGEL, BEWUSST
 * Sonst gilt: kein Zustand zwischen den Teilen. Dieser Tab liest die Stände
 * — aber NUR lesend und nur zur Anzeige. Er schreibt nichts, hat keinen eigenen
 * Pfad in der Datenbank und keine eigenen Daten. Nähme man diesen Tab weg,
 * änderte sich am Spiel nichts.
 *
 * WO DIE PUNKTE HERKOMMEN
 *   Team Schach   die Konstanten unten, gerechnet in schachPunkte().
 * Die Namen der Spieler liefert die Spielerliste (spieler.js).
 * Es gilt: Zahlen, Rechnung und der angezeigte Erklärungstext stehen in
 * derselben Datei, damit die angezeigte Regel nicht von der gerechneten
 * abweichen kann.
 */

const RANGLISTE = {

    id: "rangliste",
    titel: "Rangliste",

    /*
     * Punkte im Schach, je beendeter Partie.
     *
     * Die Zahlen stammen aus dem Quizz (dort gegen die anderen Spiele
     * ausbalanciert): Ein Sieg bringt 30 plus Beute, also etwa 35 bis 45.
     */
    PUNKTE_SIEG: 30,
    PUNKTE_REMIS: 10,
    PUNKTE_TEILNAHME: 2,

    /*
     * Teilpunkte für geschlagene Figuren: Auch eine verlorene Partie war Arbeit,
     * wenn man dem Gegner die Dame abgenommen hat.
     *
     * Gerechnet wird auf den Figurenwert (Bauer 1 … Dame 9) mal diesem Faktor,
     * gedeckelt, damit eine einzige Schlachtplatte keinen Sieg überholt. Ein
     * ausgeglichenes Ende bringt so ein paar Punkte, ein klarer Materialvorteil
     * etwa ein Drittel eines Sieges.
     */
    PUNKTE_JE_FIGURENWERT: 0.8,
    PUNKTE_BEUTE_HOECHSTENS: 12,

    wurzelEl: null,

    /* Wessen Profil ist gerade offen? Leer heißt: die Gesamtwertung. */
    offenesProfil: "",

    /* ---------------------------------------------------------------- *
     * Rechnen (ohne Bildschirm — deshalb testbar)
     * ---------------------------------------------------------------- */

    /*
     * Punkte aus allen beendeten Schachpartien, je Spieler-Kennung.
     * Liefert { "<id>": { punkte, siege, remis, partien } }.
     *
     * Gerechnet wird aus der CHRONIK der Tafel, nicht aus den Partien selbst.
     * Das ist der Unterschied seit v2.4: Ein Ergebnis wird beim Beenden einmal
     * festgeschrieben und bleibt dann stehen — auch wenn die Partie später
     * geschlossen oder gelöscht wird. Vorher nahm ein Löschen allen
     * Beteiligten ihre Punkte wieder weg.
     *
     * Gewertet wird weiterhin nur, was vorbei ist: Eine laufende Partie hat
     * noch kein Ergebnis, und ein Zwischenstand wäre reine Vermutung.
     */
    schachPunkte(tafel) {
        const ergebnis = {};

        const eintragen = (id) => {
            if (!ergebnis[id]) {
                ergebnis[id] = { punkte: 0, siege: 0, remis: 0, partien: 0, beute: 0 };
            }
            return ergebnis[id];
        };

        for (const partie of SCHACH_TAFEL.normalisieren(tafel).chronik) {
            /*
             * PARTIEN GEGEN DEN COMPUTER ZÄHLEN NICHT (seit v0.27.0).
             *
             * Die gemeinsame Tabelle vergleicht Menschen miteinander. Ein
             * Bot der Stufe 1 schaut nicht voraus und ist leichte Beute —
             * wer gegen ihn spielt, sammelte sonst Punkte, für die niemand
             * etwas riskiert hat, und die Tabelle sagte nichts mehr aus.
             * Die Partie bleibt vollständig in der Chronik stehen; nur die
             * Wertung lässt sie aus.
             *
             * Zurücknehmen ist eine Zeile: diese Prüfung entfernen. Dann
             * zählen Bot-Partien wie jede andere — der Bot selbst taucht in
             * der Tabelle trotzdem nicht auf, weil sie ihre Zeilen aus der
             * Spielerliste baut und er dort keinen Eintrag hat.
             */
            if (SCHACH_BOT.istBotPartie(partie)) {
                continue;
            }

            for (const farbe of ["weiss", "schwarz"]) {
                const teil = RANGLISTE.schachPunkteJePartie(partie, farbe);

                for (const id of partie.teams[farbe]) {
                    const eintrag = eintragen(id);
                    eintrag.partien++;
                    eintrag.punkte += teil.punkte;
                    eintrag.beute += teil.beute;

                    if (teil.ausgang === "sieg") {
                        eintrag.siege++;
                    } else if (teil.ausgang === "remis") {
                        eintrag.remis++;
                    }
                }
            }
        }

        return ergebnis;
    },

    /*
     * Was EINE Partie einem Spieler dieser Farbe eingebracht hat.
     * Liefert { punkte, beute, ausgang: "sieg" | "remis" | "niederlage" }.
     *
     * Eigene Funktion, weil zwei Stellen dieselbe Rechnung brauchen: die
     * Gesamtsumme (`schachPunkte`) und die Aufschlüsselung im Spielerprofil
     * (`verlauf`). Stünde sie zweimal da, wüchsen die beiden Zahlen früher oder
     * später auseinander — und ausgerechnet das Profil soll ja erklären, wie
     * die Summe zustande kommt.
     */
    schachPunkteJePartie(partie, farbe) {
        /* Teilpunkte für die Beute — gedeckelt, damit sie einen Sieg ergänzen
           und nicht ersetzen. */
        const beute = Math.min(
            Math.round((partie.beute[farbe] || 0) * RANGLISTE.PUNKTE_JE_FIGURENWERT),
            RANGLISTE.PUNKTE_BEUTE_HOECHSTENS);

        let punkte = RANGLISTE.PUNKTE_TEILNAHME + beute;
        let ausgang = "niederlage";

        if (partie.ergebnis === farbe) {
            ausgang = "sieg";
            punkte += RANGLISTE.PUNKTE_SIEG;
        } else if (partie.ergebnis === "remis") {
            ausgang = "remis";
            punkte += RANGLISTE.PUNKTE_REMIS;
        }

        return { punkte: punkte, beute: beute, ausgang: ausgang };
    },

    /*
     * Die Gesamtwertung, absteigend sortiert. Liefert eine Liste aus
     * { id, name, gesamt, schach, siege, remis, partien }.
     *
     * Grundlage der Namen ist die Spielerliste (spieler.js): Dort steht, wer
     * mitspielt. Wer dort entfernt wurde, taucht auch hier nicht mehr auf —
     * sonst stünden Kennungen ohne Namen in der Liste.
     */
    gesamt(spielerDaten, schachTafel) {
        const mitspieler = SPIELER.normalisieren(spielerDaten).spieler;
        const schach = RANGLISTE.schachPunkte(schachTafel);

        const liste = mitspieler.map((eintrag) => {
            const dazu = schach[eintrag.id] || { punkte: 0, siege: 0, remis: 0, partien: 0 };

            return {
                id: eintrag.id,
                name: eintrag.name,
                schach: dazu.punkte,
                gesamt: dazu.punkte,
                siege: dazu.siege,
                remis: dazu.remis,
                partien: dazu.partien
            };
        });

        liste.sort((a, b) => {
            if (b.gesamt !== a.gesamt) {
                return b.gesamt - a.gesamt;
            }
            return a.name.localeCompare(b.name, "de");
        });

        return liste;
    },

    /* ---------------------------------------------------------------- *
     * Der Verlauf eines Spielers — Grundlage des Profils
     *
     * Beantwortet die Frage "wie bin ich an meine Punkte gekommen?": jede
     * Partie einzeln, mit Zeitpunkt, Dauer, Mitspielern und den Punkten,
     * die dabei heraussprangen.
     *
     * Was vor Quizz-v3.3 gespielt wurde, hat weder Startzeit noch Zugzahl.
     * Das Profil lässt die Angabe dann weg, statt sie zu schätzen.
     * ---------------------------------------------------------------- */

    /*
     * Liefert eine Liste, das Jüngste zuerst:
     *
     *     {
     *         art: "schach",
     *         id, titel, punkte,
     *         wann,                    // Zeitpunkt des Endes, 0 = unbekannt
     *         dauerMs,                 // 0 = unbekannt (alte Partien)
     *         zuege,                   // 0 = unbekannt
     *         ausgang,                 // sieg | remis | niederlage
     *         mitspieler: [ids],       // eigenes Team ohne einen selbst
     *         gegner: [ids]
     *     }
     */
    verlauf(spielerId, schachTafel) {
        if (!spielerId) {
            return [];
        }

        const liste = [];

        for (const partie of SCHACH_TAFEL.normalisieren(schachTafel).chronik) {
            /* Dieselbe Ausnahme wie in `schachPunkte` (v0.27.0): Das Profil
               erklärt, wie die Summe zustande kommt — es darf deshalb keine
               Partie zeigen, die gar nicht mitgezählt wurde. */
            if (SCHACH_BOT.istBotPartie(partie)) {
                continue;
            }

            const farbe = (partie.teams.weiss.indexOf(spielerId) !== -1)
                ? "weiss"
                : ((partie.teams.schwarz.indexOf(spielerId) !== -1) ? "schwarz" : "");

            if (!farbe) {
                continue;
            }

            const gegenfarbe = (farbe === "weiss") ? "schwarz" : "weiss";
            const teil = RANGLISTE.schachPunkteJePartie(partie, farbe);

            liste.push({
                art: "schach",
                id: partie.id,
                titel: partie.titel,
                variante: partie.variante,
                farbe: farbe,
                punkte: teil.punkte,
                beute: teil.beute,
                ausgang: teil.ausgang,
                wann: partie.beendetAm,
                dauerMs: (partie.begonnenAm > 0 && partie.beendetAm > partie.begonnenAm)
                    ? (partie.beendetAm - partie.begonnenAm) : 0,
                zuege: partie.zuege,
                mitspieler: partie.teams[farbe].filter((id) => id !== spielerId),
                gegner: partie.teams[gegenfarbe].slice()
            });
        }

        /* Das Jüngste zuerst. Einträge ohne Zeitpunkt (Altbestand) rutschen
           dabei ans Ende — dort stören sie am wenigsten. */
        liste.sort((a, b) => b.wann - a.wann);
        return liste;
    },

    /* Die Regeln im Wortlaut, aus denselben Konstanten wie die Rechnung. */
    erklaerung() {
        return "Je beendeter Partie, für jeden im Team:\n"
            + "Sieg " + RANGLISTE.PUNKTE_SIEG + ", unentschieden "
            + RANGLISTE.PUNKTE_REMIS + ", dabeigewesen "
            + RANGLISTE.PUNKTE_TEILNAHME + " (zusätzlich).\n"
            + "Beute: " + RANGLISTE.PUNKTE_JE_FIGURENWERT + " je Figurenwert "
            + "(Bauer 1, Springer und Läufer 3, Turm 5, Dame 9), höchstens "
            + RANGLISTE.PUNKTE_BEUTE_HOECHSTENS + " je Partie.\n\n"
            + "Laufende Partien und Partien gegen den Computer zählen nicht. "
            + "Im Team bekommen alle dasselbe — "
            + "wer wie viel gezogen hat, zählt nicht. Bei Gleichstand "
            + "entscheidet der Name.";
    },

    /* ---------------------------------------------------------------- *
     * Bildschirm
     * ---------------------------------------------------------------- */

    aufbauen(behaelter) {
        RANGLISTE.wurzelEl = document.createElement("div");
        RANGLISTE.wurzelEl.className = "rangliste";
        behaelter.appendChild(RANGLISTE.wurzelEl);
    },

    /* Wird bei jedem Tab-Wechsel und nach jeder Datenänderung gerufen. */
    beimOeffnen() {
        RANGLISTE.zeichnen();
    },

    /* Die Stände an einem Ort — beide Ansichten brauchen sie. */
    _staende() {
        return {
            spieler: (ANMELDUNG.abgleich && ANMELDUNG.abgleich.daten)
                ? ANMELDUNG.abgleich.daten
                : SPIELER.leereDaten(),
            schach: (TEAM_SCHACH.abgleich && TEAM_SCHACH.abgleich.daten)
                ? TEAM_SCHACH.abgleich.daten
                : SCHACH_TAFEL.leereTafel()
        };
    },

    zeichnen() {
        const wurzel = RANGLISTE.wurzelEl;
        if (!wurzel) {
            return;
        }

        wurzel.innerHTML = "";

        const staende = RANGLISTE._staende();
        const liste = RANGLISTE.gesamt(staende.spieler, staende.schach);

        /* Ein geöffnetes Profil geht vor. Steht der Spieler nicht mehr in der
           Wertung (entfernt), fällt die Ansicht von selbst zurück. */
        if (RANGLISTE.offenesProfil) {
            const person = liste.find((eintrag) => eintrag.id === RANGLISTE.offenesProfil);

            if (person) {
                RANGLISTE._profilZeichnen(wurzel, person, staende);
                return;
            }
            RANGLISTE.offenesProfil = "";
        }

        const bereich = RANGLISTE._element("section", "karte karte-ergebnis");

        const kopf = RANGLISTE._element("div", "karte-kopf");
        kopf.appendChild(RANGLISTE._element("h3", "", "Gesamtwertung"));
        kopf.appendChild(RANGLISTE._infoKnopfBauen());
        bereich.appendChild(kopf);

        if (liste.length === 0) {
            bereich.appendChild(RANGLISTE._element("p", "erklaerung",
                "Noch niemand dabei. Die Anmeldung fragt beim ersten Öffnen "
                + "nach dem Namen."));
            wurzel.appendChild(bereich);
            return;
        }

        const tabelle = document.createElement("table");
        tabelle.className = "ergebnis-tabelle";

        const tabellenkopf = document.createElement("thead");
        const kopfzeile = document.createElement("tr");
        for (const titel of ["Platz", "Name", "Punkte"]) {
            const zelle = document.createElement("th");
            zelle.textContent = titel;
            kopfzeile.appendChild(zelle);
        }
        tabellenkopf.appendChild(kopfzeile);
        tabelle.appendChild(tabellenkopf);

        const koerper = document.createElement("tbody");
        const ich = ICH.person();
        let platz = 0;
        let letztePunkte = null;
        let gezaehlt = 0;

        for (const eintrag of liste) {
            gezaehlt++;
            if (eintrag.gesamt !== letztePunkte) {
                platz = gezaehlt;
                letztePunkte = eintrag.gesamt;
            }

            const zeile = document.createElement("tr");
            if (ich && eintrag.id === ich.id) {
                zeile.className = "zeile-ich";
            }

            const platzZelle = document.createElement("td");
            platzZelle.textContent = platz + ".";
            zeile.appendChild(platzZelle);

            /*
             * Der Name ist ein Knopf: Er führt ins Profil. Ein echter <button>
             * und kein anklickbares <span> — sonst findet ihn die Tastatur
             * nicht, und auf dem Handy fehlt die Rückmeldung beim Tippen.
             */
            const nameZelle = document.createElement("td");
            const nameKnopf = document.createElement("button");
            nameKnopf.type = "button";
            nameKnopf.className = "name-knopf";
            nameKnopf.setAttribute("aria-label", "Profil von " + eintrag.name);
            nameKnopf.addEventListener("click", () => RANGLISTE.profilOeffnen(eintrag.id));

            /*
             * NUR DER NAME (seit v3.7).
             *
             * Darunter stand bis v3.6 eine Zeile „Würfel 5, Schach 30,
             * Imposter 8 (2 Siege aus 3)". Bei zehn Mitspielern waren das zehn
             * solcher Zeilen — die Tabelle las sich als Textwand, und der
             * Punktestand, um den es geht, ging darin unter. Dieselben Zahlen
             * stehen jetzt im Profil, einen Fingertipp entfernt.
             */
            nameKnopf.appendChild(RANGLISTE._element("span", "name-text", eintrag.name));

            nameZelle.appendChild(nameKnopf);
            zeile.appendChild(nameZelle);

            const punkteZelle = document.createElement("td");
            punkteZelle.className = "ergebnis-punkte";
            const punkteEl = RANGLISTE._element("span", "punkte-zahl");
            RANGLISTE._zahlSetzen(punkteEl, eintrag.id, eintrag.gesamt);
            punkteZelle.appendChild(punkteEl);
            zeile.appendChild(punkteZelle);

            koerper.appendChild(zeile);
        }
        tabelle.appendChild(koerper);

        bereich.appendChild(tabelle);

        /*
         * HIER STAND EIN ERKLÄRABSATZ (bis v0.107.0): „Gezählt werden alle
         * beendeten Partien. Die Rechnung steht hinter dem i — und wer auf
         * einen Namen tippt, sieht, aus welchen Partien die Punkte kamen."
         *
         * Er ist mit v0.108.0 ersatzlos weg (Nutzer-Ansage 28.08.2026:
         * weniger Text). Er verwies auf das i, das direkt darüber in der
         * Kopfzeile sitzt — ein Text, der auf einen sichtbaren Knopf
         * zeigt, erklärt nichts, sondern verdoppelt ihn. Was er sonst noch
         * sagte (auf einen Namen tippen), ist genau das, was ein Tipp
         * ohnehin zeigt; die Rechnung selbst stand nie hier, sondern immer
         * hinter dem i.
         */

        wurzel.appendChild(bereich);
    },

    /* ---------------------------------------------------------------- *
     * Das Profil eines Spielers
     *
     * Beantwortet "wie ist der an seine Punkte gekommen?" — jede Partie
     * einzeln, das Jüngste zuerst. Bewusst für JEDEN einsehbar und nicht nur
     * für einen selbst: Es steht ohnehin nichts darin, was nicht alle am
     * Tisch miterlebt haben.
     * ---------------------------------------------------------------- */

    /*
     * DAS PROFIL IST SEIT v0.119.0 DIE PROFILSEITE DER GANZEN APP (Nutzer-
     * Ansage 18.09.2026: „unter den drei Strichen oben soll Profil kein
     * Popup mehr sein, sondern die ganze Seite mit Visitenkarte, drei
     * Abzeichen und Statistiken" und „auf Benutzernamen soll man in der
     * ganzen App klicken können, um das Profil zu sehen … aber auch
     * Freundanfragen").
     *
     * `rueckweg` ist der Tab, aus dem man kam: Ein Name im Vorraum, im
     * Abschluss oder in der Freundesliste führt hierher, und „Zurück" soll
     * genau dorthin zurückführen — nicht in die Rangliste, die man nie
     * gesehen hat. Ohne Rückweg (Tipp in der Tabelle) geht es in die
     * Wertung wie bisher.
     */
    profilRueckweg: "",

    profilOeffnen(spielerId, rueckweg) {
        RANGLISTE.offenesProfil = spielerId;
        RANGLISTE.profilRueckweg = (typeof rueckweg === "string" && rueckweg !== "rangliste")
            ? rueckweg : "";

        if (typeof TABS !== "undefined" && TABS.aktiveId !== "rangliste") {
            /* `wechseln` ruft `beimOeffnen`, und das zeichnet schon — das
               Zeichnen darunter ist dann ein zweites, billiges; so hängt
               das Profil nicht daran, dass der Wechsel wirklich zeichnet. */
            TABS.wechseln("rangliste");
        }
        RANGLISTE.zeichnen();
    },

    profilSchliessen() {
        const rueckweg = RANGLISTE.profilRueckweg;
        RANGLISTE.offenesProfil = "";
        RANGLISTE.profilRueckweg = "";

        if (rueckweg && typeof TABS !== "undefined") {
            TABS.wechseln(rueckweg);
            return;
        }
        RANGLISTE.zeichnen();
    },

    /* Das eigene Profil — aus dem Menüband und den Einstellungen. */
    eigenesProfilOeffnen(rueckweg) {
        const ich = ICH.person();
        if (!ich) {
            DIALOG.hinweis("Nicht angemeldet",
                "Auf diesem Gerät ist gerade niemand angemeldet.");
            return;
        }
        RANGLISTE.profilOeffnen(ich.id, rueckweg);
    },

    /* ---------------------------------------------------------------- *
     * Die Statistik eines Spielers — gerechnet aus der Chronik (v0.119.0)
     *
     * Alles aus `verlauf`, also aus beendeten Partien unter Menschen.
     * Serien laufen in Spielreihenfolge (das Älteste zuerst), sonst zählte
     * „in Folge" rückwärts.
     * ---------------------------------------------------------------- */

    statistik(spielerId, staende) {
        const verlauf = RANGLISTE.verlauf(spielerId, staende.schach).slice().reverse();

        const stat = {
            partien: verlauf.length,
            siege: 0,
            remis: 0,
            niederlagen: 0,
            punkte: 0,
            beute: 0,
            zuege: 0,
            dauerMs: 0,
            laengsteSerie: 0,
            aktuelleSerie: 0,
            schnellsterSieg: 0,
            laengstePartie: 0,
            siegeWeiss: 0,
            siegeSchwarz: 0,
            comebacks: 0,
            nachtPartien: 0,
            spielarten: {},
            gegner: {},
            erstePartieAm: 0,
            letztePartieAm: 0
        };

        let serie = 0;
        let vorigerAusgang = "";

        for (const eintrag of verlauf) {
            stat.punkte += eintrag.punkte;
            stat.beute += eintrag.beute;
            stat.zuege += eintrag.zuege;
            stat.dauerMs += eintrag.dauerMs;

            if (eintrag.zuege > stat.laengstePartie) {
                stat.laengstePartie = eintrag.zuege;
            }
            if (eintrag.wann > 0) {
                if (!stat.erstePartieAm || eintrag.wann < stat.erstePartieAm) {
                    stat.erstePartieAm = eintrag.wann;
                }
                if (eintrag.wann > stat.letztePartieAm) {
                    stat.letztePartieAm = eintrag.wann;
                }
                const stunde = new Date(eintrag.wann).getHours();
                if (stunde < 5) {
                    stat.nachtPartien++;
                }
            }

            stat.spielarten[eintrag.variante] = (stat.spielarten[eintrag.variante] || 0) + 1;
            for (const id of eintrag.gegner) {
                stat.gegner[id] = (stat.gegner[id] || 0) + 1;
            }

            if (eintrag.ausgang === "sieg") {
                stat.siege++;
                serie++;
                if (serie > stat.laengsteSerie) {
                    stat.laengsteSerie = serie;
                }
                if (eintrag.zuege > 0
                        && (!stat.schnellsterSieg || eintrag.zuege < stat.schnellsterSieg)) {
                    stat.schnellsterSieg = eintrag.zuege;
                }
                if (eintrag.farbe === "weiss") {
                    stat.siegeWeiss++;
                } else {
                    stat.siegeSchwarz++;
                }
                if (vorigerAusgang === "niederlage") {
                    stat.comebacks++;
                }
            } else {
                serie = 0;
                if (eintrag.ausgang === "remis") {
                    stat.remis++;
                } else {
                    stat.niederlagen++;
                }
            }
            vorigerAusgang = eintrag.ausgang;
        }

        stat.aktuelleSerie = serie;
        stat.siegquote = stat.partien ? Math.round(100 * stat.siege / stat.partien) : 0;

        const meiste = (tabelle) => {
            let bestesId = "";
            let beste = 0;
            for (const id of Object.keys(tabelle)) {
                if (tabelle[id] > beste) {
                    beste = tabelle[id];
                    bestesId = id;
                }
            }
            return { id: bestesId, anzahl: beste };
        };
        stat.lieblingsSpielart = meiste(stat.spielarten);
        stat.haeufigsterGegner = meiste(stat.gegner);

        return stat;
    },

    /*
     * DIE ABZEICHEN (seit v0.119.0, Nutzer-Ansage: „drei Abzeichen, die
     * man bekommen kann … denk dir coole aus"). Jedes wird aus der
     * Statistik GERECHNET, nie vergeben oder gespeichert — was einmal
     * verdient ist, bleibt es, solange die Chronik steht. Gespeichert wird
     * nur, welche drei der Spieler auf seiner Karte zeigt
     * (`SPIELER.abzeichenSetzen`).
     *
     * Die Reihenfolge ist die der Anzeige: leicht zu haben oben, selten
     * unten.
     */
    ABZEICHEN: [
        { id: "erster-sieg", titel: "Erster Sieg", zeichen: "1",
            text: "Die erste Partie gewonnen.",
            pruefen: (s) => s.siege >= 1 },
        { id: "veteran", titel: "Veteran", zeichen: "10",
            text: "Zehn Partien zu Ende gespielt.",
            pruefen: (s) => s.partien >= 10 },
        { id: "beidhaendig", titel: "Beidhändig", zeichen: "WS",
            text: "Als Weiss und als Schwarz gewonnen.",
            pruefen: (s) => s.siegeWeiss >= 1 && s.siegeSchwarz >= 1 },
        { id: "serie-3", titel: "Serienheld", zeichen: "x3",
            text: "Drei Siege in Folge.",
            pruefen: (s) => s.laengsteSerie >= 3 },
        { id: "comeback", titel: "Comeback", zeichen: "CB",
            text: "Nach einer Niederlage gleich wieder gewonnen.",
            pruefen: (s) => s.comebacks >= 1 },
        { id: "blitzmatt", titel: "Blitzmatt", zeichen: "20",
            text: "Ein Sieg in höchstens 20 Halbzügen.",
            pruefen: (s) => s.schnellsterSieg > 0 && s.schnellsterSieg <= 20 },
        { id: "marathon", titel: "Marathon", zeichen: "100",
            text: "Eine Partie über 100 Halbzüge.",
            pruefen: (s) => s.laengstePartie >= 100 },
        { id: "nachteule", titel: "Nachteule", zeichen: "N",
            text: "Eine Partie zwischen Mitternacht und fünf Uhr beendet.",
            pruefen: (s) => s.nachtPartien >= 1 },
        { id: "sammler", titel: "Sammler", zeichen: "B",
            text: "50 Punkte allein für geschlagene Figuren.",
            pruefen: (s) => s.beute >= 50 },
        { id: "allrounder", titel: "Allrounder", zeichen: "3B",
            text: "Auf drei verschiedenen Brettern gespielt.",
            pruefen: (s) => Object.keys(s.spielarten).length >= 3 },
        { id: "hunderter", titel: "Hunderter", zeichen: "100P",
            text: "100 Punkte in der Rangliste.",
            pruefen: (s) => s.punkte >= 100 },
        { id: "unaufhaltsam", titel: "Unaufhaltsam", zeichen: "x5",
            text: "Fünf Siege in Folge.",
            pruefen: (s) => s.laengsteSerie >= 5 },
        { id: "dauerbrenner", titel: "Dauerbrenner", zeichen: "50",
            text: "Fünfzig Partien zu Ende gespielt.",
            pruefen: (s) => s.partien >= 50 },
        { id: "legende", titel: "Legende", zeichen: "500",
            text: "500 Punkte in der Rangliste.",
            pruefen: (s) => s.punkte >= 500 }
    ],

    /* Ein Abzeichen zu seiner Kennung — oder null. */
    abzeichenEintrag(id) {
        return RANGLISTE.ABZEICHEN.find((eintrag) => eintrag.id === id) || null;
    },

    /* Alle Abzeichen mit der Angabe, ob dieser Spieler sie verdient hat. */
    abzeichenVon(spielerId, staende) {
        const stat = RANGLISTE.statistik(spielerId, staende);
        return RANGLISTE.ABZEICHEN.map((eintrag) => ({
            id: eintrag.id,
            titel: eintrag.titel,
            zeichen: eintrag.zeichen,
            text: eintrag.text,
            erreicht: eintrag.pruefen(stat) === true
        }));
    },

    /*
     * Die Abzeichen, die auf der Visitenkarte stehen: die gewählten, aber
     * nur, soweit sie verdient sind — eine Chronik kann schrumpfen (Spieler
     * entfernt), und dann steht dort nichts Erlogenes.
     */
    gezeigteAbzeichen(spielerId, staende) {
        const spieler = SPIELER.spielerFinden(staende.spieler, spielerId);
        const verdient = RANGLISTE.abzeichenVon(spielerId, staende)
            .filter((eintrag) => eintrag.erreicht);
        const gewaehlt = spieler ? spieler.abzeichen : [];

        return gewaehlt
            .map((id) => verdient.find((eintrag) => eintrag.id === id))
            .filter((eintrag) => !!eintrag);
    },

    /* ---------------------------------------------------------------- *
     * Zeichnen der Profilseite
     * ---------------------------------------------------------------- */

    _profilZeichnen(wurzel, person, staende) {
        const ich = ICH.person();
        const istIch = !!ich && ich.id === person.id;

        const kopf = RANGLISTE._element("div", "partie-kopf partie-kopf-klebt");
        kopf.appendChild(RANGLISTE._knopf("Zurück", "knopf-still knopf-klein",
            () => RANGLISTE.profilSchliessen()));
        kopf.appendChild(RANGLISTE._element("h2", "partie-titel",
            istIch ? "Dein Profil" : "Profil"));
        wurzel.appendChild(kopf);

        const stat = RANGLISTE.statistik(person.id, staende);

        wurzel.appendChild(RANGLISTE._visitenkarteBauen(person, staende, stat, istIch));
        wurzel.appendChild(RANGLISTE._statistikKarteBauen(person, staende, stat));
        wurzel.appendChild(RANGLISTE._abzeichenKarteBauen(person, staende, istIch));

        const verlauf = RANGLISTE.verlauf(person.id, staende.schach);

        const karte = RANGLISTE._element("section", "karte");
        karte.appendChild(RANGLISTE._element("h3", "", "Woher die Punkte kommen"));

        if (verlauf.length === 0) {
            karte.appendChild(RANGLISTE._element("p", "erklaerung",
                "Noch nichts zu Ende gespielt. Erst ein Ergebnis bringt Punkte."));
        }

        for (const eintrag of verlauf) {
            karte.appendChild(RANGLISTE._verlaufZeileBauen(eintrag, staende));
        }

        wurzel.appendChild(karte);
    },

    /*
     * DIE VISITENKARTE: Name gross, darunter Platz und Punkte, die drei
     * gewählten Abzeichen, und die Handlung — beim eigenen Profil Name,
     * Passwort und Abzeichen, bei fremden der Freundschafts-Knopf.
     */
    _visitenkarteBauen(person, staende, stat, istIch) {
        const karte = RANGLISTE._element("section", "karte visitenkarte");

        const kopf = RANGLISTE._element("div", "visitenkarte-kopf");
        kopf.appendChild(RANGLISTE._element("span", "visitenkarte-name", person.name));

        const punkteEl = RANGLISTE._element("span", "punkte-zahl visitenkarte-punkte");
        RANGLISTE._zahlSetzen(punkteEl, "profil-" + person.id, person.gesamt);
        kopf.appendChild(punkteEl);
        karte.appendChild(kopf);

        /* Platz in der Wertung — dieselbe Zählung wie in der Tabelle. */
        const liste = RANGLISTE.gesamt(staende.spieler, staende.schach);
        let platz = 0;
        let letztePunkte = null;
        for (let stelle = 0; stelle < liste.length; stelle++) {
            if (liste[stelle].gesamt !== letztePunkte) {
                platz = stelle + 1;
                letztePunkte = liste[stelle].gesamt;
            }
            if (liste[stelle].id === person.id) {
                break;
            }
        }

        const angaben = [];
        if (platz > 0) {
            angaben.push("Platz " + platz + " von " + liste.length);
        }
        if (stat.erstePartieAm > 0) {
            angaben.push("dabei seit " + RANGLISTE._datumText(stat.erstePartieAm));
        } else {
            angaben.push("noch keine Partie beendet");
        }
        karte.appendChild(RANGLISTE._element("p", "visitenkarte-angaben",
            angaben.join(" · ")));

        /* Die drei Abzeichen. */
        const reihe = RANGLISTE._element("div", "visitenkarte-abzeichen");
        const gezeigt = RANGLISTE.gezeigteAbzeichen(person.id, staende);
        for (const eintrag of gezeigt) {
            reihe.appendChild(RANGLISTE._abzeichenBauen(eintrag, true));
        }
        for (let frei = gezeigt.length; frei < SPIELER.ABZEICHEN_PLAETZE; frei++) {
            reihe.appendChild(RANGLISTE._element("span", "abzeichen abzeichen-leer",
                istIch ? "frei" : "–"));
        }
        karte.appendChild(reihe);

        /* Die Handlung. */
        const fuss = RANGLISTE._element("div", "karte-fuss");
        if (istIch) {
            fuss.appendChild(RANGLISTE._knopf("Name ändern", "knopf-still knopf-klein",
                () => ANMELDUNG.namenAendern(ANMELDUNG.ich())));
            fuss.appendChild(RANGLISTE._knopf("Passwort ändern", "knopf-still knopf-klein",
                () => ANMELDUNG.passwortAendern(ANMELDUNG.ich())));
            fuss.appendChild(RANGLISTE._knopf("Abzeichen wählen", "knopf-haupt knopf-klein",
                () => RANGLISTE.abzeichenWaehlen()));
        } else {
            RANGLISTE._freundschaftBauen(fuss, person, staende);
        }
        karte.appendChild(fuss);

        return karte;
    },

    /*
     * DER FREUNDSCHAFTS-KNOPF (Nutzer-Ansage: „aber auch Freundanfragen —
     * die Person bekommt dann unter Freunde/Anfragen eine Anfrage, wenn
     * die bestätigt ist, seid ihr befreundet"). Genau die Lagen aus
     * `SPIELER.freundschaft`; geschrieben wird über FREUNDE, denselben
     * Weg wie die Freundesliste.
     */
    _freundschaftBauen(fuss, person, staende) {
        const ich = ICH.person();
        if (!ich) {
            return;
        }
        const lage = SPIELER.freundschaft(staende.spieler, ich.id, person.id);
        const danach = () => RANGLISTE.zeichnen();

        if (lage === "freunde") {
            fuss.appendChild(RANGLISTE._element("span", "chip chip-fertig", "Ihr seid Freunde"));
            fuss.appendChild(DIALOG.zweiSchritt(
                RANGLISTE._knopf("Entfernen", "knopf-gefahr knopf-klein", null),
                () => { FREUNDE.entfernen(person.id); danach(); }));
        } else if (lage === "gesendet") {
            fuss.appendChild(RANGLISTE._element("span", "chip chip-offen", "Anfrage gesendet"));
            fuss.appendChild(RANGLISTE._knopf("Zurückziehen", "knopf-still knopf-klein",
                () => { FREUNDE.zurueckziehen(person.id); danach(); }));
        } else if (lage === "offen") {
            fuss.appendChild(RANGLISTE._element("span", "chip chip-laeuft",
                person.name + " möchte mit dir befreundet sein"));
            fuss.appendChild(RANGLISTE._knopf("Annehmen", "knopf-haupt knopf-klein",
                () => { FREUNDE.annehmen(person.id); danach(); }));
            fuss.appendChild(RANGLISTE._knopf("Ablehnen", "knopf-still knopf-klein",
                () => { FREUNDE.ablehnen(person.id); danach(); }));
        } else {
            fuss.appendChild(RANGLISTE._knopf("Freund anfragen", "knopf-haupt knopf-klein",
                () => { FREUNDE.anfragen(person.id); danach(); }));
        }
    },

    /* Ein Abzeichen als Marke: Zeichen im Kreis, Titel daneben. */
    _abzeichenBauen(eintrag, erreicht) {
        const marke = RANGLISTE._element("span",
            "abzeichen" + (erreicht ? " abzeichen-erreicht" : " abzeichen-offen"));
        marke.appendChild(RANGLISTE._element("span", "abzeichen-zeichen", eintrag.zeichen));
        marke.appendChild(RANGLISTE._element("span", "abzeichen-titel", eintrag.titel));
        marke.title = eintrag.text;
        return marke;
    },

    /*
     * DIE STATISTIK-KARTE: Kacheln mit je einer Zahl und einem Wort — das
     * Muster der Summen von Quizz-v3.3 (`profil-summe`). Was es nicht gibt
     * (kein Sieg, keine Zeit), wird weggelassen statt als 0 behauptet.
     */
    _statistikKarteBauen(person, staende, stat) {
        const karte = RANGLISTE._element("section", "karte");
        karte.appendChild(RANGLISTE._element("h3", "", "Statistik"));

        if (stat.partien === 0) {
            karte.appendChild(RANGLISTE._element("p", "erklaerung",
                "Noch keine beendete Partie — die Zahlen kommen mit der ersten."));
            return karte;
        }

        const kacheln = [
            [String(stat.partien), "Partien"],
            [String(stat.siege), stat.siege === 1 ? "Sieg" : "Siege"],
            [stat.siegquote + " %", "Siegquote"],
            [String(stat.remis), "Remis"],
            [String(stat.laengsteSerie), "längste Serie"],
            [String(stat.aktuelleSerie), "Siege in Folge"]
        ];
        if (stat.schnellsterSieg > 0) {
            kacheln.push([String(stat.schnellsterSieg), "Züge, schnellster Sieg"]);
        }
        if (stat.laengstePartie > 0) {
            kacheln.push([String(stat.laengstePartie), "Züge, längste Partie"]);
        }
        if (stat.zuege > 0) {
            kacheln.push([String(stat.zuege), "Züge gesamt"]);
        }
        if (stat.dauerMs > 0) {
            kacheln.push([RANGLISTE._dauerKurz(stat.dauerMs), "am Brett"]);
        }
        kacheln.push([String(stat.beute), "Punkte für Beute"]);

        const raster = RANGLISTE._element("div", "statistik-raster");
        for (const [zahl, wort] of kacheln) {
            const kachel = RANGLISTE._element("div", "profil-summe");
            kachel.appendChild(RANGLISTE._element("span", "profil-summe-zahl", zahl));
            kachel.appendChild(RANGLISTE._element("span", "profil-summe-titel", wort));
            raster.appendChild(kachel);
        }
        karte.appendChild(raster);

        /* Zwei Sätze, die eine Zahl nicht sagt. */
        const saetze = [];
        if (stat.lieblingsSpielart.id) {
            const variante = SCHACH_VARIANTEN.holen(stat.lieblingsSpielart.id);
            saetze.push("Am liebsten " + (variante ? variante.titel : stat.lieblingsSpielart.id)
                + " (" + RANGLISTE._menge(stat.lieblingsSpielart.anzahl, "Partie", "Partien") + ").");
        }
        if (stat.haeufigsterGegner.id) {
            const name = RANGLISTE._nameVon(stat.haeufigsterGegner.id, staende.spieler);
            if (name) {
                saetze.push("Am häufigsten gegen " + name + " ("
                    + RANGLISTE._menge(stat.haeufigsterGegner.anzahl, "Partie", "Partien") + ").");
            }
        }
        if (saetze.length > 0) {
            karte.appendChild(RANGLISTE._element("p", "erklaerung", saetze.join(" ")));
        }

        return karte;
    },

    /* Alle Abzeichen — verdiente farbig, offene blass, jedes mit Satz. */
    _abzeichenKarteBauen(person, staende, istIch) {
        const karte = RANGLISTE._element("section", "karte");
        const kopf = RANGLISTE._element("div", "karte-kopf");
        kopf.appendChild(RANGLISTE._element("h3", "", "Abzeichen"));
        const alle = RANGLISTE.abzeichenVon(person.id, staende);
        const verdient = alle.filter((eintrag) => eintrag.erreicht).length;
        kopf.appendChild(RANGLISTE._element("span", "chip chip-offen",
            verdient + " von " + alle.length));
        karte.appendChild(kopf);

        const liste = RANGLISTE._element("div", "abzeichen-liste");
        for (const eintrag of alle) {
            const zeile = RANGLISTE._element("div", "abzeichen-zeile");
            zeile.appendChild(RANGLISTE._abzeichenBauen(eintrag, eintrag.erreicht));
            zeile.appendChild(RANGLISTE._element("span", "abzeichen-text", eintrag.text));
            liste.appendChild(zeile);
        }
        karte.appendChild(liste);

        if (istIch) {
            karte.appendChild(RANGLISTE._element("p", "erklaerung",
                "Drei davon dürfen auf deine Visitenkarte — oben über \"Abzeichen wählen\"."));
        }

        return karte;
    },

    /*
     * ABZEICHEN WÄHLEN: ein Popup mit den verdienten Abzeichen zum Anhaken,
     * höchstens drei (dasselbe Muster wie die Item-Auswahl beim Anlegen).
     * Geschrieben wird der eigene Eintrag mit Zusammenführung.
     */
    abzeichenWaehlen() {
        const ich = ICH.person();
        if (!ich || !ANMELDUNG.abgleich) {
            return;
        }
        const staende = RANGLISTE._staende();
        const verdient = RANGLISTE.abzeichenVon(ich.id, staende)
            .filter((eintrag) => eintrag.erreicht);

        if (verdient.length === 0) {
            DIALOG.hinweis("Noch kein Abzeichen",
                "Spiel eine Partie zu Ende — das erste Abzeichen wartet schon.");
            return;
        }

        const spieler = SPIELER.spielerFinden(staende.spieler, ich.id);
        const wahl = (spieler ? spieler.abzeichen : [])
            .filter((id) => verdient.some((eintrag) => eintrag.id === id));

        const halter = RANGLISTE._element("div", "item-auswahl");
        const fuellen = () => {
            halter.innerHTML = "";
            for (const eintrag of verdient) {
                const drin = wahl.indexOf(eintrag.id) !== -1;
                const knopf = RANGLISTE._knopf((drin ? "[x] " : "[ ] ") + eintrag.titel,
                    "knopf-klein item-haken" + (drin ? " item-haken-an" : " knopf-still"),
                    () => {
                        if (drin) {
                            wahl.splice(wahl.indexOf(eintrag.id), 1);
                        } else if (wahl.length >= SPIELER.ABZEICHEN_PLAETZE) {
                            DIALOG.kurzmeldung("Höchstens " + SPIELER.ABZEICHEN_PLAETZE
                                + " Abzeichen — nimm erst eins weg.");
                            return;
                        } else {
                            wahl.push(eintrag.id);
                        }
                        fuellen();
                    });
                knopf.setAttribute("aria-pressed", drin ? "true" : "false");
                knopf.title = eintrag.text;
                halter.appendChild(knopf);
            }
        };
        fuellen();

        DIALOG.hinweis("Abzeichen wählen",
            "Bis zu drei stehen auf deiner Visitenkarte.", halter)
            .then(() => {
                ANMELDUNG.abgleich.aendern(
                    SPIELER.abzeichenSetzen(ANMELDUNG.abgleich.daten, ich.id, wahl), true);
                RANGLISTE.zeichnen();
            });
    },

    /*
     * Die Dauer als KURZE Zahl für eine Kachel („1 h 40 min", „35 min",
     * „2 T 5 h"): `_dauerText` sagt „1 Stunde 40 Minuten", und das sprengte
     * die Kachel auf drei Zeilen (im Browser gesehen, v0.119.0).
     */
    _dauerKurz(dauerMs) {
        const minuten = Math.round(dauerMs / 60000);
        if (minuten < 60) {
            return Math.max(1, minuten) + " min";
        }
        const stunden = Math.floor(minuten / 60);
        if (stunden < 24) {
            const rest = minuten % 60;
            return stunden + " h" + (rest > 0 ? " " + rest + " min" : "");
        }
        const tage = Math.floor(stunden / 24);
        const restStunden = stunden % 24;
        return tage + " T" + (restStunden > 0 ? " " + restStunden + " h" : "");
    },

    /* Tag.Monat.Jahr — für „dabei seit". */
    _datumText(zeitpunkt) {
        const wann = new Date(zeitpunkt);
        return String(wann.getDate()).padStart(2, "0")
            + "." + String(wann.getMonth() + 1).padStart(2, "0")
            + "." + wann.getFullYear();
    },

    _verlaufZeileBauen(eintrag, staende) {
        const zeile = RANGLISTE._element("div", "profil-zeile");

        const kopf = RANGLISTE._element("div", "profil-zeile-kopf");
        kopf.appendChild(RANGLISTE._element("span", "profil-titel", eintrag.titel));

        const marke = { sieg: "gewonnen", remis: "remis", niederlage: "verloren" };
        const stil = { sieg: "chip-fertig", remis: "chip-offen", niederlage: "chip-fehler" };

        kopf.appendChild(RANGLISTE._element("span",
            "chip " + stil[eintrag.ausgang], marke[eintrag.ausgang]));

        kopf.appendChild(RANGLISTE._element("span", "profil-punkte",
            "+" + eintrag.punkte));
        zeile.appendChild(kopf);

        /* Wann, wie lange, wie viele Züge — was fehlt, wird weggelassen. */
        const angaben = [];

        if (eintrag.wann > 0) {
            angaben.push(RANGLISTE._zeitpunktText(eintrag.wann));
        }
        if (eintrag.dauerMs > 0) {
            angaben.push("Dauer " + RANGLISTE._dauerText(eintrag.dauerMs));
        }
        if (eintrag.zuege > 0) {
            angaben.push(eintrag.zuege + " Züge");
        }
        if (eintrag.beute > 0) {
            angaben.push("davon " + eintrag.beute + " für geschlagene Figuren");
        }

        if (angaben.length > 0) {
            zeile.appendChild(RANGLISTE._element("span", "profil-angaben",
                angaben.join(" · ")));
        }

        /* Mit wem und gegen wen. */
        const namen = (ids) => ids
            .map((id) => RANGLISTE._nameVon(id, staende.spieler))
            .filter((name) => name !== "")
            .join(", ");

        const gegen = namen(eintrag.gegner);
        const mit = namen(eintrag.mitspieler);

        zeile.appendChild(RANGLISTE._element("span", "profil-gegner",
            "Gegen " + (gegen || "niemanden")
            + (mit ? " — zusammen mit " + mit : " — allein im Team")));

        return zeile;
    },

    /*
     * Der Anzeigename zu einer Kennung. Er steht nur in der Spielerliste —
     * dort meldet man sich an. Wer inzwischen entfernt wurde, liefert einen
     * leeren Namen und wird in der Aufzählung weggelassen.
     */
    _nameVon(spielerId, spielerDaten) {
        const spieler = SPIELER.spielerFinden(spielerDaten, spielerId);
        return spieler ? spieler.name : "";
    },

    /*
     * Tag und Uhrzeit. Für "heute" und "gestern" der Wochentag-lose Kurztext —
     * bei einem Spiel, das über den Tag läuft, ist das die häufigste Frage.
     */
    _zeitpunktText(zeitpunkt) {
        const wann = new Date(zeitpunkt);
        const uhr = String(wann.getHours()).padStart(2, "0")
            + ":" + String(wann.getMinutes()).padStart(2, "0");

        const heute = new Date();
        const gleicherTag = (einer, anderer) =>
            einer.getFullYear() === anderer.getFullYear()
            && einer.getMonth() === anderer.getMonth()
            && einer.getDate() === anderer.getDate();

        if (gleicherTag(wann, heute)) {
            return "Heute " + uhr;
        }

        const gestern = new Date(heute.getTime() - 24 * 60 * 60 * 1000);
        if (gleicherTag(wann, gestern)) {
            return "Gestern " + uhr;
        }

        return String(wann.getDate()).padStart(2, "0")
            + "." + String(wann.getMonth() + 1).padStart(2, "0")
            + "." + wann.getFullYear() + " " + uhr;
    },

    /*
     * Spieldauer in Worten. Über einer Stunde zählen Minuten nicht mehr.
     *
     * Die Schwelle wird auf den ROHEN Millisekunden geprüft, nicht auf den
     * gerundeten Minuten: `Math.round` macht aus 30 Sekunden sonst eine ganze
     * Minute, und dann behauptet die Anzeige eine Dauer, die es nicht gab.
     */
    _dauerText(dauerMs) {
        if (dauerMs < 60000) {
            return "unter einer Minute";
        }

        const minuten = Math.round(dauerMs / 60000);

        if (minuten < 60) {
            return RANGLISTE._menge(minuten, "Minute", "Minuten");
        }

        const stunden = Math.floor(minuten / 60);
        if (stunden < 24) {
            const rest = minuten % 60;
            return RANGLISTE._menge(stunden, "Stunde", "Stunden")
                + (rest > 0 ? " " + RANGLISTE._menge(rest, "Minute", "Minuten") : "");
        }

        const tage = Math.floor(stunden / 24);
        const restStunden = stunden % 24;
        return RANGLISTE._menge(tage, "Tag", "Tage")
            + (restStunden > 0
                ? " " + RANGLISTE._menge(restStunden, "Stunde", "Stunden") : "");
    },

    /* Zahl mit Einheit, in der richtigen Zahlform. */
    _menge(anzahl, einzahl, mehrzahl) {
        return anzahl + " " + ((anzahl === 1) ? einzahl : mehrzahl);
    },

    _knopf(beschriftung, klasse, beiKlick) {
        const knopf = document.createElement("button");
        knopf.type = "button";
        knopf.className = "knopf " + klasse;
        knopf.textContent = beschriftung;
        knopf.addEventListener("click", beiKlick);
        return knopf;
    },

    _infoKnopfBauen() {
        const knopf = document.createElement("button");
        knopf.type = "button";
        knopf.className = "info-knopf";
        knopf.textContent = "i";
        knopf.setAttribute("aria-label", "Wie entsteht die Gesamtwertung?");
        knopf.title = "Wie entsteht die Gesamtwertung?";
        knopf.addEventListener("click", () => {
            DIALOG.hinweis("Gesamtwertung", RANGLISTE.erklaerung());
        });
        return knopf;
    },

    _element(tag, klasse, text) {
        const element = document.createElement(tag);
        if (klasse) {
            element.className = klasse;
        }
        if (text !== undefined) {
            element.textContent = text;
        }
        return element;
    },

    /* Was zuletzt angezeigt wurde, je Zeile — damit `_zahlSetzen` weiss,
       WOHER es zählen soll. Kein Spielstand, nur Anzeige-Gedächtnis. */
    _punkteVorher: {},

    /*
     * ROLLENDE ZAHLEN (seit v0.114, ROADMAP Bündel X3): Ändert sich eine
     * Punktzahl, zählt die Anzeige sichtbar von der alten zur neuen, statt
     * hart umzuspringen. Beim ersten Zeichnen, ohne Änderung, ohne Browser-
     * Taktgeber oder bei „weniger Bewegung" steht die Zahl sofort da —
     * die Animation ist reine Zugabe, nie Voraussetzung.
     */
    _zahlSetzen(element, schluessel, neu) {
        const alt = RANGLISTE._punkteVorher[schluessel];
        RANGLISTE._punkteVorher[schluessel] = neu;

        const darf = (typeof window !== "undefined")
            && (typeof window.requestAnimationFrame === "function")
            && (typeof window.matchMedia === "function")
            && window.matchMedia("(prefers-reduced-motion: no-preference)").matches;

        if (!darf || alt === undefined || alt === neu) {
            element.textContent = String(neu);
            return;
        }

        const dauer = 600;
        const start = Date.now();
        const schritt = () => {
            const anteil = Math.min(1, (Date.now() - start) / dauer);
            /* Erst schnell, dann auslaufend — wie ein Zählwerk. */
            const weich = 1 - Math.pow(1 - anteil, 3);
            element.textContent = String(Math.round(alt + (neu - alt) * weich));
            if (anteil < 1) {
                window.requestAnimationFrame(schritt);
            }
        };
        window.requestAnimationFrame(schritt);
    }
};

/* Für die Tests ausserhalb des Browsers: SPIELER und SCHACH_TAFEL müssen dort
   vorher als globale Größen bereitstehen — genau wie im Browser. */
if (typeof module !== "undefined" && module.exports) {
    module.exports = RANGLISTE;
}
