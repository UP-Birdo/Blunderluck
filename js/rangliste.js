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
    zeichen: "pokal",

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
    gesamt(spielerDaten, schachTafel, ichId) {
        /* Gäste stehen seit v0.151.3 in keiner Rangliste — ausser der Gast
           sieht seine eigene (sonst fehlten ihm Profil und Platz). `ichId`
           ohne Angabe: die Person dieses Geräts. */
        const eigene = (ichId !== undefined) ? ichId
            : ((typeof ICH !== "undefined" && ICH.person()) ? ICH.person().id : "");
        const mitspieler = SPIELER.mitspieler(spielerDaten, eigene);
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

    /* „#1234" eines Spielers oder "" (seit v0.155.0, `KONTO.tagZusatz`). */
    tagVon(spielerDaten, id) {
        const spieler = SPIELER.spielerFinden(spielerDaten, id);
        return (typeof KONTO !== "undefined" && typeof KONTO.tagZusatz === "function")
            ? KONTO.tagZusatz(spieler) : "";
    },

    /* Wird bei jedem Tab-Wechsel und nach jeder Datenänderung gerufen. */
    beimOeffnen() {
        RANGLISTE.zeichnen();
    },

    /* Seit v0.156.0: Kam man aus dem Profil-Blatt („Statistik und Partien",
       js\profil.js), ist das ausführliche Profil beim Verlassen erledigt —
       die Rangliste beginnt beim nächsten Mal wieder mit der Wertung. */
    _blattZurueck: false,

    beimVerlassen() {
        if (RANGLISTE._blattZurueck) {
            RANGLISTE._blattZurueck = false;
            RANGLISTE.offenesProfil = "";
        }
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
            /* Laden oder leer (UPCrew-Standard, seit v0.140.0): Solange die
               Spielerliste noch nicht angekommen ist, ist „leer" gelogen. */
            const abgleich = ANMELDUNG.abgleich;
            bereich.appendChild((abgleich && abgleich.geladen === false)
                ? ZUSTAND.laden({ zeilen: 4, nochmal: () => abgleich.fremdenStandHolen() })
                : ZUSTAND.leer({ zeichen: "pokal", text: "Noch niemand" }));
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
            const nameText = RANGLISTE._element("span", "name-text", eintrag.name);

            /* Die Nummer klein dahinter, bei allen (seit v0.155.0, Nutzer
               28.09.2026: „name und dann in klein # mit dem tag"). */
            const tag = RANGLISTE.tagVon(staende.spieler, eintrag.id);
            if (tag) {
                nameText.appendChild(RANGLISTE._element("span", "name-tag", tag));
            }
            nameKnopf.appendChild(nameText);

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
        RANGLISTE.profilReiter = "statistik";
        RANGLISTE.profilAllePartien = false;
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

        /* Aus dem Profil-Blatt gekommen (seit v0.156.0): „Zurück" legt das
           Rangliste-Blatt weg, darunter liegt wieder das Profil. */
        if (RANGLISTE._blattZurueck && typeof UPCREW_BLATT !== "undefined") {
            RANGLISTE._blattZurueck = false;
            UPCREW_BLATT.schliessen("knopf");
            return;
        }

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
                "Dieses Gerät · niemand angemeldet");
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

        /* Seit v0.156.0 stehen im Konto-Feld Kennungen ALLER Spiele
           (upcrew-abzeichen.js `alle`): „bl-…" (bis v0.155 ohne Vorsilbe) aus
           der Chronik, „up-…" aus dem gemeinsamen Fortschritt (bei Fremden aus
           ihrem öffentlichen Auszug). Kennungen anderer Spiele lassen sich hier
           nicht nachrechnen (ihr Zähler steht nicht im Auszug) — sie bleiben
           weg, damit nichts Erlogenes dasteht. */
        let gemeinsam = null;
        const gemeinsamVon = () => {
            if (gemeinsam === null) {
                const ich = (typeof ICH !== "undefined") ? ICH.person() : null;
                gemeinsam = (spieler && typeof RANGLISTE.abzeichenListe === "function")
                    ? RANGLISTE.abzeichenListe(spieler, !!ich && ich.id === spielerId) : [];
            }
            return gemeinsam;
        };

        return gewaehlt
            .map((roh) => {
                const kennung = String(roh);
                const id = kennung.indexOf("bl-") === 0 ? kennung.slice(3) : kennung;
                const bl = verdient.find((eintrag) => eintrag.id === id);
                if (bl) {
                    return bl;
                }
                if (kennung.indexOf("up-") === 0) {
                    const up = gemeinsamVon().find((eintrag) => "up-" + eintrag.id === kennung && eintrag.erreicht > 0);
                    if (up) {
                        return { id: kennung, titel: up.titel, zeichen: up.kurz,
                            text: up.wert + " " + up.einheit, erreicht: true };
                    }
                }
                return null;
            })
            .filter((eintrag) => !!eintrag);
    },

    /* ---------------------------------------------------------------- *
     * Zeichnen der Profilseite
     *
     * SEIT v0.119.1 KOMPAKT (Nutzer-Ansage 24.09.2026: „das Profil ist zu
     * überladen, mache es schöner, kompakter — kannst ruhig Untermenüs
     * benutzen oder Popups, nimm dir Beispiel an anderen Spiele-Apps").
     * Vorher standen Visitenkarte, elf Statistik-Kacheln, alle vierzehn
     * Abzeichen mit Satz und jede Partie mit drei Zeilen untereinander —
     * auf dem Handy fast drei Bildschirmhöhen.
     *
     * Jetzt, nach dem Muster der Profilseiten von Spiele-Apps:
     *   1. EINE Kopfkarte: Kreis mit Anfangsbuchstaben, Name, Platz,
     *      Punkte, vier Kurzwerte in einer Zeile, Bilanz-Balken mit Form
     *      (letzte fünf) und die drei gewählten Abzeichen.
     *   2. Drei Reiter darunter (Statistik / Abzeichen / Partien) — immer
     *      nur einer offen.
     *   3. Einzelheiten im Popup: ein Abzeichen antippen zeigt seine
     *      Bedingung, eine Partie antippen ihre Angaben; „Bearbeiten"
     *      sammelt Name, Passwort und Abzeichen in einem Menü.
     * Gerechnet wird genau wie vorher (`statistik`, `verlauf`,
     * `abzeichenVon`) — geändert hat sich nur die Anordnung.
     * ---------------------------------------------------------------- */

    /* Welcher Reiter offen ist. Reines Anzeige-Gedächtnis; jedes neu
       geöffnete Profil beginnt bei der Statistik. */
    profilReiter: "statistik",

    /* Ob die Partienliste ganz aufgeklappt ist (sonst die jüngsten). */
    profilAllePartien: false,

    PROFIL_REITER: [
        { id: "statistik", titel: "Statistik" },
        { id: "abzeichen", titel: "Abzeichen" },
        { id: "partien", titel: "Partien" }
    ],

    /* So viele Partien zeigt der Reiter, bevor „Alle zeigen" nötig wird. */
    PROFIL_PARTIEN_ANFANG: 8,

    /* So viele Ergebnisse zeigt die Form-Zeile der Kopfkarte. */
    PROFIL_FORM_LAENGE: 5,

    _profilZeichnen(wurzel, person, staende) {
        const ich = ICH.person();
        const istIch = !!ich && ich.id === person.id;

        const kopf = RANGLISTE._element("div", "partie-kopf partie-kopf-klebt profil-kopf");
        kopf.appendChild(ZUSTAND.alsZurueck(RANGLISTE._knopf("Zurück", "knopf-still knopf-klein",
            () => RANGLISTE.profilSchliessen())));
        kopf.appendChild(RANGLISTE._element("h2", "partie-titel",
            istIch ? "Dein Profil" : "Profil"));
        if (istIch) {
            kopf.appendChild(RANGLISTE._knopf("Bearbeiten", "knopf-still knopf-klein profil-bearbeiten",
                () => RANGLISTE.profilBearbeiten()));
        }
        wurzel.appendChild(kopf);

        const stat = RANGLISTE.statistik(person.id, staende);
        const verlauf = RANGLISTE.verlauf(person.id, staende.schach);

        wurzel.appendChild(RANGLISTE._visitenkarteBauen(person, staende, stat, verlauf, istIch));
        const levelKarte = RANGLISTE._levelKarteBauen(
            SPIELER.spielerFinden(staende.spieler, person.id) || person, istIch);
        if (levelKarte) {
            wurzel.appendChild(levelKarte);
        }
        /* Die fünf Abzeichen über beide Spiele (seit v0.151.12, 1:1 aus
           Typoluck, gemeinsamer Baustein js\upcrew-abzeichen.js). */
        const abzeichenKarte = RANGLISTE._fortschrittsAbzeichenBauen(
            SPIELER.spielerFinden(staende.spieler, person.id) || person, istIch);
        if (abzeichenKarte) {
            wurzel.appendChild(abzeichenKarte);
        }
        const spielzeitKarte = RANGLISTE._spielzeitKarteBauen(
            SPIELER.spielerFinden(staende.spieler, person.id) || person, istIch);
        if (spielzeitKarte) {
            wurzel.appendChild(spielzeitKarte);
        }
        wurzel.appendChild(RANGLISTE._profilReiterBauen(person, staende, verlauf));

        const inhalt = RANGLISTE._element("section", "karte profil-reiter-inhalt");
        if (RANGLISTE.profilReiter === "abzeichen") {
            RANGLISTE._abzeichenReiterBauen(inhalt, person, staende, istIch);
        } else if (RANGLISTE.profilReiter === "partien") {
            RANGLISTE._partienReiterBauen(inhalt, verlauf, staende);
        } else {
            RANGLISTE._statistikReiterBauen(inhalt, staende, stat);
        }
        wurzel.appendChild(inhalt);
    },

    /* Reiter wechseln — zeichnet nur neu, holt nichts. */
    profilReiterSetzen(id) {
        RANGLISTE.profilReiter = id;
        RANGLISTE.profilAllePartien = false;
        RANGLISTE.zeichnen();
    },

    /*
     * DAS BEARBEITEN-MENÜ des eigenen Profils: die drei Handlungen, die
     * vorher als drei Knöpfe auf der Karte standen. Die Einträge stehen in
     * einer eigenen Funktion, damit ein Test sie ohne Dialog prüfen kann.
     */
    _bearbeitenEintraege() {
        return [
            { beschriftung: "Abzeichen wählen", hinweis: "Bis zu 3 · auf der Karte", wert: "abzeichen" },
            { beschriftung: "Name ändern", hinweis: "Für alle sichtbar", wert: "name" },
            { beschriftung: "Passwort ändern", hinweis: "Anmeldung · neues Gerät", wert: "passwort" }
        ];
    },

    profilBearbeiten() {
        /* „Nummer ändern" (seit v0.151.8) nur mit Konto — aus ANMELDUNG. */
        const nummer = (typeof ANMELDUNG !== "undefined" && typeof ANMELDUNG._nummerEintrag === "function")
            ? ANMELDUNG._nummerEintrag(ANMELDUNG.ich()) : [];
        return DIALOG.liste("Profil bearbeiten", "Was ändern",
            RANGLISTE._bearbeitenEintraege().concat(nummer), "Schliessen")
            .then((wahl) => {
                if (wahl === "abzeichen") {
                    RANGLISTE.abzeichenWaehlen();
                } else if (wahl === "name") {
                    ANMELDUNG.namenAendern(ANMELDUNG.ich());
                } else if (wahl === "nummer") {
                    ANMELDUNG.nummerAendern(ANMELDUNG.ich());
                } else if (wahl === "passwort") {
                    ANMELDUNG.passwortAendern(ANMELDUNG.ich());
                }
            });
    },

    /*
     * DIE KOPFKARTE (Klasse bleibt `visitenkarte`): alles, was man auf den
     * ersten Blick wissen will, auf einer Karte.
     */
    _visitenkarteBauen(person, staende, stat, verlauf, istIch) {
        const karte = RANGLISTE._element("section", "karte visitenkarte");

        /* Zeile 1: Kreis, Name mit Platz, Punkte rechts. */
        const kopf = RANGLISTE._element("div", "visitenkarte-kopf");
        const name = String(person.name || "").trim();
        kopf.appendChild(RANGLISTE._element("span", "visitenkarte-bild",
            name ? name.charAt(0).toUpperCase() : "?"));

        const mitte = RANGLISTE._element("div", "visitenkarte-mitte");
        const nameZeile = RANGLISTE._element("span", "visitenkarte-name", person.name);
        const tag = RANGLISTE.tagVon(staende.spieler, person.id);
        if (tag) {
            nameZeile.appendChild(RANGLISTE._element("span", "name-tag", tag));
        }
        mitte.appendChild(nameZeile);

        const angaben = [];
        const platz = RANGLISTE._platzVon(person.id, staende);
        if (platz.platz > 0) {
            angaben.push("Platz " + platz.platz + " von " + platz.von);
        }
        angaben.push(stat.erstePartieAm > 0
            ? "dabei seit " + RANGLISTE._datumText(stat.erstePartieAm)
            : "0 Partien beendet");
        mitte.appendChild(RANGLISTE._element("span", "visitenkarte-angaben", angaben.join(" · ")));
        kopf.appendChild(mitte);

        const punkte = RANGLISTE._element("div", "visitenkarte-punktfeld");
        const punkteEl = RANGLISTE._element("span", "punkte-zahl visitenkarte-punkte");
        RANGLISTE._zahlSetzen(punkteEl, "profil-" + person.id, person.gesamt);
        punkte.appendChild(punkteEl);
        punkte.appendChild(RANGLISTE._element("span", "visitenkarte-punkte-wort", "Punkte"));
        kopf.appendChild(punkte);
        karte.appendChild(kopf);

        /* Zeile 2: vier Kurzwerte, durch feine Linien getrennt. */
        const kurz = RANGLISTE._element("div", "profil-kurzwerte");
        const kurzwerte = [
            [String(stat.partien), "Partien"],
            [String(stat.siege), stat.siege === 1 ? "Sieg" : "Siege"],
            [stat.partien ? stat.siegquote + " %" : "–", "Quote"],
            [String(stat.aktuelleSerie), "Serie"]
        ];
        for (const [zahl, wort] of kurzwerte) {
            const feld = RANGLISTE._element("div", "profil-kurzwert");
            feld.appendChild(RANGLISTE._element("span", "profil-kurzwert-zahl", zahl));
            feld.appendChild(RANGLISTE._element("span", "profil-kurzwert-wort", wort));
            kurz.appendChild(feld);
        }
        karte.appendChild(kurz);

        /* Zeile 3: Bilanz-Balken und Form — nur, wenn es etwas zu zeigen gibt. */
        if (stat.partien > 0) {
            karte.appendChild(RANGLISTE._bilanzBauen(stat, verlauf));
        }

        /* Zeile 4: die drei Abzeichen. Beim eigenen Profil führt jeder
           Platz in die Auswahl — so wie man in Spielen auf den Slot tippt. */
        const reihe = RANGLISTE._element("div", "visitenkarte-abzeichen");
        const gezeigt = RANGLISTE.gezeigteAbzeichen(person.id, staende);
        for (const eintrag of gezeigt) {
            const marke = RANGLISTE._abzeichenBauen(eintrag, true);
            if (istIch) {
                RANGLISTE._antippbar(marke, () => RANGLISTE.abzeichenWaehlen());
            } else {
                RANGLISTE._antippbar(marke, () => RANGLISTE._abzeichenZeigen(eintrag, true));
            }
            reihe.appendChild(marke);
        }
        for (let frei = gezeigt.length; frei < SPIELER.ABZEICHEN_PLAETZE; frei++) {
            const leer = RANGLISTE._element("span", "abzeichen abzeichen-leer", istIch ? "+" : "–");
            if (istIch) {
                RANGLISTE._antippbar(leer, () => RANGLISTE.abzeichenWaehlen());
                leer.setAttribute("aria-label", "Abzeichen wählen");
            }
            reihe.appendChild(leer);
        }
        karte.appendChild(reihe);

        /* Bei fremden Profilen: die Freundschaft, in einer Zeile. */
        if (!istIch) {
            const fuss = RANGLISTE._element("div", "karte-fuss visitenkarte-fuss");
            RANGLISTE._freundschaftBauen(fuss, person, staende);
            karte.appendChild(fuss);
        }

        return karte;
    },

    /*
     * DIE LEVEL-KARTE (seit v0.146.0, Runde 5, FORTSCHRITT.md: „Level …
     * Einzelheiten im Profil-Blatt"): Level und Titel, der XP-Balken des
     * laufenden Levels und — nur im eigenen Profil — die nächsten drei
     * Level mit dem, was sie bringen, und woher XP kommen.
     *
     * Das eigene Level kommt aus js\fortschritt-konto.js (Gerät + Konto),
     * ein fremdes seit v0.154.0 aus dem öffentlichen Auszug
     * (`FORTSCHRITT.auszugVon`: unter der alten Regel aus `fortschritt`
     * gerechnet, unter Regel §12 aus `spieler/oeffentlich`). Ohne den
     * Baustein (Tests) gibt es keine Karte.
     */
    _levelKarteBauen(person, istIch) {
        if (typeof FORTSCHRITT === "undefined") {
            return null;
        }
        const lv = (istIch && typeof FORTSCHRITT_KONTO !== "undefined")
            ? FORTSCHRITT_KONTO.level()
            : FORTSCHRITT.auszugLevel(FORTSCHRITT.auszugVon(person));

        const karte = RANGLISTE._element("section", "karte level-karte");

        const kopf = RANGLISTE._element("div", "level-kopf");
        kopf.appendChild(RANGLISTE._element("span", "level-gross", "Level " + lv.level));
        kopf.appendChild(RANGLISTE._element("span", "level-titel", FORTSCHRITT.titelVon(lv.level).name));
        karte.appendChild(kopf);

        const balken = RANGLISTE._element("div", "level-balken");
        balken.setAttribute("role", "progressbar");
        balken.setAttribute("aria-valuemin", "0");
        balken.setAttribute("aria-valuemax", String(lv.kosten));
        balken.setAttribute("aria-valuenow", String(lv.imLevel));
        const fuellung = RANGLISTE._element("span", "level-balken-fuellung");
        fuellung.style.width = (lv.anteil * 100).toFixed(1) + "%";
        balken.appendChild(fuellung);
        karte.appendChild(balken);
        karte.appendChild(RANGLISTE._element("span", "level-xp", lv.imLevel + " / " + lv.kosten + " XP"));

        if (!istIch) {
            return karte;
        }

        /* Woher XP kommen (FORTSCHRITT.md: Partie, neue Figur,
           Tagesaufgabe, beide Spiele, Serie). */
        const quellen = RANGLISTE._element("div", "level-quellen");
        quellen.appendChild(RANGLISTE._element("span", "level-quelle", "Partie +" + FORTSCHRITT.XP.partie));
        quellen.appendChild(RANGLISTE._element("span", "level-quelle", "Neue Figur im Turm +" + FORTSCHRITT.XP.figur));
        /* Seit v0.151.0 nach Schwierigkeit (FORTSCHRITT.TAGES_GRUND). */
        quellen.appendChild(RANGLISTE._element("span", "level-quelle", "Tagesaufgabe +"
            + FORTSCHRITT.tagesGrund(1) + "…" + FORTSCHRITT.tagesGrund(3)));
        quellen.appendChild(RANGLISTE._element("span", "level-quelle", "Beide Spiele ×1,5"));
        quellen.appendChild(RANGLISTE._element("span", "level-quelle",
            "Serie +" + FORTSCHRITT.SERIE_XP + "…" + FORTSCHRITT.SERIE_XP_MAX));
        karte.appendChild(quellen);

        const stufen = (typeof UPCREW_ANPASSEN !== "undefined") ? UPCREW_ANPASSEN.STUFEN : {};
        const naechste = RANGLISTE._element("div", "level-naechste");
        for (let l = lv.level + 1; l <= lv.level + 3; l++) {
            const zeile = RANGLISTE._element("div", "level-naechste-zeile");
            zeile.appendChild(RANGLISTE._element("span", "level-naechste-nr", String(l)));
            const belohnungen = FORTSCHRITT.belohnungen(l, stufen);
            const chips = RANGLISTE._element("span", "level-naechste-chips");
            if (belohnungen.length === 0) {
                chips.appendChild(RANGLISTE._element("span", "level-chip level-chip-leer", "–"));
            }
            for (const belohnung of belohnungen) {
                chips.appendChild(RANGLISTE._element("span",
                    "level-chip level-chip-" + belohnung.art, RANGLISTE._belohnungWort(belohnung)));
            }
            zeile.appendChild(chips);
            naechste.appendChild(zeile);
        }
        karte.appendChild(naechste);
        return karte;
    },

    /*
     * DIE FÜNF ABZEICHEN (seit v0.151.12, Nutzer 27.09.2026: „es fehlen die
     * Abzeichen, die sollen kopiert werden"): Viel gespielt, Serie, Beide
     * Spiele, Figuren, Tagesaufgaben — Rechnung und Aussehen aus dem
     * gemeinsamen Baustein (`UPCREW_ABZEICHEN`), gerechnet aus dem
     * gemeinsamen Fortschritt über ALLE Zweige, also dieselben Zahlen wie in
     * Typoluck. Nicht zu verwechseln mit den Blunderluck-Abzeichen auf der
     * Visitenkarte (Reiter „Abzeichen", seit v0.119.0).
     *
     * `person` null = ich. Die laufende Serie rechnet die App (Level und
     * Serien-Schutz): wie Typoluck `serieHeute`.
     */
    abzeichenListe(person, istIch) {
        if (typeof UPCREW_ABZEICHEN === "undefined" || typeof FORTSCHRITT === "undefined") {
            return [];
        }
        const heute = FORTSCHRITT.datumVon(Date.now());
        /* Fremde seit v0.154.0 über den öffentlichen Auszug (Regel §12;
           unter der alten Regel aus ihrem `fortschritt` gerechnet —
           dieselben Zahlen, test-regel-12.js). */
        if (!istIch || typeof FORTSCHRITT_KONTO === "undefined") {
            const auszug = FORTSCHRITT.auszugVon(person, heute);
            return UPCREW_ABZEICHEN.liste(FORTSCHRITT.auszugAlsStand(auszug),
                FORTSCHRITT.auszugSerie(auszug, heute));
        }
        const sauber = FORTSCHRITT.normalisieren(FORTSCHRITT_KONTO.lesen());
        const schutz = FORTSCHRITT.schutzVerdient(FORTSCHRITT.level(sauber).level);
        const laufend = FORTSCHRITT.serie(sauber, heute, schutz).tage;
        return UPCREW_ABZEICHEN.liste(sauber, laufend);
    },

    /*
     * DIE SPIELZEIT (seit v0.155.0, Nutzer 28.09.2026): im EIGENEN Profil je
     * Spiel, die Summe und „dabei seit" (auch als Gast — alles vom Gerät und
     * Konto, `FORTSCHRITT_KONTO.spielzeit`). Im fremden Profil nur, wenn der
     * andere sie öffentlich zeigt (dann steht sie in seinem Auszug), als
     * Summe. Anzeige `FORTSCHRITT.spielzeitText` („N min", „Nh+").
     */
    SPIEL_NAMEN: { blunderluck: "Blunderluck", typoluck: "Typoluck" },

    spielzeitZeilen(person, istIch) {
        if (typeof FORTSCHRITT === "undefined" || typeof FORTSCHRITT.spielzeitText !== "function") {
            return [];
        }
        if (istIch && typeof FORTSCHRITT_KONTO !== "undefined") {
            const zeit = FORTSCHRITT_KONTO.spielzeit();
            const zeilen = Object.keys(zeit.spiele).sort()
                .filter((app) => zeit.spiele[app] > 0)
                .map((app) => (RANGLISTE.SPIEL_NAMEN[app] || app) + " · " + FORTSCHRITT.spielzeitText(zeit.spiele[app]));
            zeilen.push("Gesamt · " + FORTSCHRITT.spielzeitText(zeit.summe));
            if (zeit.seit) {
                zeilen.push("Dabei seit · " + RANGLISTE._tagText(zeit.seit));
            }
            return zeilen;
        }
        const auszug = FORTSCHRITT.auszugPruefen(person && person.auszug);
        if (auszug && typeof auszug.werte.spielzeit === "number") {
            return ["Gesamt · " + FORTSCHRITT.spielzeitText(auszug.werte.spielzeit)];
        }
        return [];
    },

    /* „2026-09-28" → „28.09.2026". */
    _tagText(datum) {
        const t = String(datum || "");
        return /^\d{4}-\d{2}-\d{2}$/.test(t) ? t.slice(8, 10) + "." + t.slice(5, 7) + "." + t.slice(0, 4) : t;
    },

    _spielzeitKarteBauen(person, istIch) {
        const zeilen = RANGLISTE.spielzeitZeilen(person, istIch);
        if (zeilen.length === 0) {
            return null;
        }
        const karte = RANGLISTE._element("section", "karte profil-spielzeit");
        karte.appendChild(RANGLISTE._element("h3", "", istIch ? "Spielzeit · nur du" : "Spielzeit"));
        for (const zeile of zeilen) {
            karte.appendChild(RANGLISTE._element("p", "profil-spielzeit-zeile", zeile));
        }
        if (istIch) {
            karte.appendChild(RANGLISTE._element("p", "erklaerung",
                FORTSCHRITT.spielzeitOeffentlichVon(person) ? "Öffentlich · Einstellungen" : "Privat · Einstellungen"));
        }
        return karte;
    },

    abzeichenZeigen(eintrag) {
        DIALOG.hinweis(eintrag.titel, "", UPCREW_ABZEICHEN.blatt(eintrag));
    },

    _fortschrittsAbzeichenBauen(person, istIch) {
        if (typeof UPCREW_ABZEICHEN === "undefined" || typeof FORTSCHRITT === "undefined") {
            return null;
        }
        const karte = RANGLISTE._element("section", "karte profil-fortschritt-abzeichen");
        karte.appendChild(RANGLISTE._element("h3", "", "Abzeichen · beide Spiele"));
        karte.appendChild(UPCREW_ABZEICHEN.raster(RANGLISTE.abzeichenListe(person, istIch),
            (eintrag) => RANGLISTE.abzeichenZeigen(eintrag)));
        return karte;
    },

    /* Wie eine Belohnung in der Liste heisst: „Farbwelt Studio", „Crew 4",
       „Knöpfe Kapsel", „Rahmen Kupfer", „Titel Stammgast". */
    _belohnungWort(belohnung) {
        if (belohnung.art === "farbwelt") {
            const welten = (typeof UPCREW_INTRO !== "undefined" && UPCREW_INTRO.WELTEN) || {};
            return "Farbwelt " + ((welten[belohnung.wert] && welten[belohnung.wert].name) || belohnung.wert);
        }
        if (belohnung.art === "schrift") {
            return "Schrift Crew " + String(belohnung.wert).replace(/^S/, "");
        }
        if (belohnung.art === "knoepfe") {
            const namen = { K1: "Stufe", K2: "Kissen", K3: "Taste", K4: "Stempel", K5: "Kapsel", K6: "Ecke" };
            return "Knöpfe " + (namen[belohnung.wert] || belohnung.wert);
        }
        if (belohnung.art === "rahmen") {
            return "Rahmen " + belohnung.name;
        }
        if (belohnung.art === "titel") {
            return "Titel " + belohnung.name;
        }
        return belohnung.name;
    },

    /*
     * Name, Platz und Punkte eines Spielers — für das Kurzprofil oben
     * links auf dem Start (seit v0.120.0). Null, wenn er nicht (mehr) in
     * der Spielerliste steht.
     */
    kurzprofil(spielerId) {
        const staende = RANGLISTE._staende();
        const eintrag = RANGLISTE.gesamt(staende.spieler, staende.schach)
            .find((person) => person.id === spielerId);
        if (!eintrag) {
            return null;
        }
        const platz = RANGLISTE._platzVon(spielerId, staende);
        return { name: eintrag.name, punkte: eintrag.gesamt, platz: platz.platz, von: platz.von };
    },

    /* Platz in der Wertung — dieselbe Zählung wie in der Tabelle. */
    _platzVon(spielerId, staende) {
        const liste = RANGLISTE.gesamt(staende.spieler, staende.schach);
        let platz = 0;
        let letztePunkte = null;
        for (let stelle = 0; stelle < liste.length; stelle++) {
            if (liste[stelle].gesamt !== letztePunkte) {
                platz = stelle + 1;
                letztePunkte = liste[stelle].gesamt;
            }
            if (liste[stelle].id === spielerId) {
                return { platz: platz, von: liste.length };
            }
        }
        return { platz: 0, von: liste.length };
    },

    /*
     * DER BILANZ-BALKEN: Siege, Remis und Niederlagen als drei Anteile
     * eines Balkens, darunter links die Form (die jüngsten Ergebnisse als
     * Kästchen, das Jüngste links) und rechts die Zahlen im Wortlaut.
     */
    _bilanzBauen(stat, verlauf) {
        const block = RANGLISTE._element("div", "profil-bilanz");

        const balken = RANGLISTE._element("div", "profil-bilanz-balken");
        balken.setAttribute("aria-hidden", "true");
        for (const [anzahl, klasse] of [[stat.siege, "sieg"], [stat.remis, "remis"],
            [stat.niederlagen, "niederlage"]]) {
            if (anzahl > 0) {
                const teil = RANGLISTE._element("span", "profil-bilanz-teil profil-bilanz-" + klasse);
                teil.style.flexGrow = String(anzahl);
                balken.appendChild(teil);
            }
        }
        block.appendChild(balken);

        /* Seit v0.120.0 in Worten statt „Form" und „12 S · 1 R · 1 N" —
           Nutzer-Frage „was ist Form N?": Die Buchstaben allein erklärten
           sich nicht. Die Kästchen behalten ihren Buchstaben, sagen aber
           Vorleseprogramm und Maus das ganze Wort. */
        const zeile = RANGLISTE._element("div", "profil-bilanz-zeile");
        const letzte = verlauf.slice(0, RANGLISTE.PROFIL_FORM_LAENGE);
        const form = RANGLISTE._element("span", "profil-form");
        form.appendChild(RANGLISTE._element("span", "profil-form-wort",
            letzte.length === 1 ? "Letzte Partie" : "Letzte " + letzte.length));
        for (const eintrag of letzte) {
            const marke = RANGLISTE._element("span",
                "profil-marke profil-marke-" + eintrag.ausgang,
                RANGLISTE._ausgangKurz(eintrag.ausgang));
            marke.title = RANGLISTE._ausgangWort(eintrag.ausgang, 1);
            marke.setAttribute("aria-label", marke.title);
            form.appendChild(marke);
        }
        zeile.appendChild(form);
        zeile.appendChild(RANGLISTE._element("span", "profil-bilanz-text",
            [[stat.siege, "sieg"], [stat.remis, "remis"], [stat.niederlagen, "niederlage"]]
                .map(([anzahl, ausgang]) => anzahl + " " + RANGLISTE._ausgangWort(ausgang, anzahl))
                .join(" · ")));
        block.appendChild(zeile);

        return block;
    },

    /* S / R / N — der eine Buchstabe im farbigen Kästchen. */
    _ausgangKurz(ausgang) {
        return { sieg: "S", remis: "R", niederlage: "N" }[ausgang] || "?";
    },

    /* Das ganze Wort zum Ausgang, Einzahl oder Mehrzahl. */
    _ausgangWort(ausgang, anzahl) {
        const eins = anzahl === 1;
        if (ausgang === "sieg") {
            return eins ? "Sieg" : "Siege";
        }
        if (ausgang === "remis") {
            return "Remis";
        }
        return eins ? "Niederlage" : "Niederlagen";
    },

    /* Die Reiter-Leiste: drei Knöpfe, der offene hervorgehoben. */
    _profilReiterBauen(person, staende, verlauf) {
        const leiste = RANGLISTE._element("div", "profil-reiter");
        leiste.setAttribute("role", "tablist");

        const alle = RANGLISTE.abzeichenVon(person.id, staende);
        const zahl = {
            statistik: "",
            abzeichen: alle.filter((eintrag) => eintrag.erreicht).length + "/" + alle.length,
            partien: String(verlauf.length)
        };

        for (const reiter of RANGLISTE.PROFIL_REITER) {
            const aktiv = (reiter.id === RANGLISTE.profilReiter);
            const knopf = RANGLISTE._knopf(reiter.titel,
                "profil-reiter-knopf" + (aktiv ? " profil-reiter-aktiv" : ""),
                () => RANGLISTE.profilReiterSetzen(reiter.id));
            knopf.setAttribute("role", "tab");
            knopf.setAttribute("aria-selected", aktiv ? "true" : "false");
            knopf.dataset.reiter = reiter.id;
            if (zahl[reiter.id]) {
                knopf.appendChild(RANGLISTE._element("span", "profil-reiter-zahl", zahl[reiter.id]));
            }
            leiste.appendChild(knopf);
        }
        return leiste;
    },

    /*
     * REITER STATISTIK: Wert-Zeilen statt Kacheln — Name links, Zahl
     * rechts, wie die Statistik-Seiten in Spielen. Was es nicht gibt, wird
     * weggelassen statt als 0 behauptet.
     */
    _statistikReiterBauen(inhalt, staende, stat) {
        if (stat.partien === 0) {
            inhalt.appendChild(RANGLISTE._leerOhnePartie());
            return;
        }

        /* Siege, Remis und Niederlagen stehen schon im Bilanz-Balken der
           Kopfkarte — hier nur, was dort fehlt. */
        const zeilen = [
            ["Längste Siegesserie", String(stat.laengsteSerie)]
        ];
        if (stat.siege > 0) {
            zeilen.push(["Siege als Weiss / Schwarz", stat.siegeWeiss + " / " + stat.siegeSchwarz]);
        }
        if (stat.schnellsterSieg > 0) {
            zeilen.push(["Schnellster Sieg", stat.schnellsterSieg + " Züge"]);
        }
        if (stat.laengstePartie > 0) {
            zeilen.push(["Längste Partie", stat.laengstePartie + " Züge"]);
        }
        if (stat.zuege > 0) {
            zeilen.push(["Züge gesamt", String(stat.zuege)]);
        }
        if (stat.dauerMs > 0) {
            zeilen.push(["Zeit am Brett", RANGLISTE._dauerKurz(stat.dauerMs)]);
        }
        zeilen.push(["Punkte für Beute", String(stat.beute)]);

        if (stat.lieblingsSpielart.id) {
            const variante = SCHACH_VARIANTEN.holen(stat.lieblingsSpielart.id);
            zeilen.push(["Lieblings-Brett", (variante ? variante.titel : stat.lieblingsSpielart.id)
                + " (" + stat.lieblingsSpielart.anzahl + ")"]);
        }
        if (stat.haeufigsterGegner.id) {
            const name = RANGLISTE._nameVon(stat.haeufigsterGegner.id, staende.spieler);
            if (name) {
                zeilen.push(["Häufigster Gegner", name + " (" + stat.haeufigsterGegner.anzahl + ")"]);
            }
        }

        const liste = RANGLISTE._element("dl", "profil-werte");
        for (const [wort, wert] of zeilen) {
            const zeile = RANGLISTE._element("div", "profil-wert-zeile");
            zeile.appendChild(RANGLISTE._element("dt", "profil-wert-wort", wort));
            zeile.appendChild(RANGLISTE._element("dd", "profil-wert-zahl", wert));
            liste.appendChild(zeile);
        }
        inhalt.appendChild(liste);
    },

    /*
     * REITER ABZEICHEN: ein Raster aus Marken, verdiente farbig, offene
     * blass. Die Bedingung steht nicht mehr daneben, sondern kommt beim
     * Antippen im Popup.
     */
    _abzeichenReiterBauen(inhalt, person, staende, istIch) {
        if (istIch) {
            const kopf = RANGLISTE._element("div", "karte-kopf");
            kopf.appendChild(RANGLISTE._element("span", "profil-reiter-hinweis",
                "Antippen · Bedingung"));
            kopf.appendChild(RANGLISTE._knopf("Abzeichen wählen", "knopf-haupt knopf-klein",
                () => RANGLISTE.abzeichenWaehlen()));
            inhalt.appendChild(kopf);
        }

        const raster = RANGLISTE._element("div", "abzeichen-raster");
        for (const eintrag of RANGLISTE.abzeichenVon(person.id, staende)) {
            const kachel = RANGLISTE._element("button",
                "abzeichen-kachel" + (eintrag.erreicht ? " abzeichen-erreicht" : " abzeichen-offen"));
            kachel.type = "button";
            kachel.appendChild(RANGLISTE._element("span", "abzeichen-zeichen", eintrag.zeichen));
            kachel.appendChild(RANGLISTE._element("span", "abzeichen-titel", eintrag.titel));
            kachel.title = eintrag.text;
            kachel.addEventListener("click", () => RANGLISTE._abzeichenZeigen(eintrag, eintrag.erreicht));
            raster.appendChild(kachel);
        }
        inhalt.appendChild(raster);
    },

    /* Das Popup zu einem Abzeichen: Bedingung und ob es verdient ist. */
    _abzeichenZeigen(eintrag, erreicht) {
        return DIALOG.hinweis(eintrag.titel,
            eintrag.text + (erreicht ? " Verdient." : " Noch nicht verdient."));
    },

    /*
     * REITER PARTIEN: je Partie EINE Zeile (Ergebnis-Kästchen, Titel,
     * wann und gegen wen, Punkte). Dauer, Züge und Beute kommen beim
     * Antippen im Popup. Erst die jüngsten, der Rest auf Wunsch.
     */
    _partienReiterBauen(inhalt, verlauf, staende) {
        inhalt.appendChild(RANGLISTE._element("p", "profil-reiter-hinweis",
            "Antippen · Einzelheiten"));

        if (verlauf.length === 0) {
            inhalt.appendChild(RANGLISTE._leerOhnePartie());
            return;
        }

        const gezeigt = RANGLISTE.profilAllePartien
            ? verlauf : verlauf.slice(0, RANGLISTE.PROFIL_PARTIEN_ANFANG);
        const liste = RANGLISTE._element("div", "profil-partien");
        for (const eintrag of gezeigt) {
            liste.appendChild(RANGLISTE._verlaufZeileBauen(eintrag, staende));
        }
        inhalt.appendChild(liste);

        if (gezeigt.length < verlauf.length) {
            inhalt.appendChild(RANGLISTE._knopf("Alle " + verlauf.length + " Partien zeigen",
                "knopf-still knopf-klein profil-mehr", () => {
                    RANGLISTE.profilAllePartien = true;
                    RANGLISTE.zeichnen();
                }));
        }
    },

    /* Macht ein Nicht-Knopf-Element antippbar (Maus, Finger, Tastatur). */
    _antippbar(element, aktion) {
        element.setAttribute("role", "button");
        element.setAttribute("tabindex", "0");
        element.classList.add("antippbar");
        element.addEventListener("click", aktion);
        element.addEventListener("keydown", (ereignis) => {
            if (ereignis && (ereignis.key === "Enter" || ereignis.key === " ")) {
                aktion();
            }
        });
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
        if (!ich || SPIELER.istVerteiler(ich) || SPIELER.istVerteiler(person)) {
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
                person.name + " · Freundschaftsanfrage"));
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
     * ABZEICHEN WÄHLEN: ein Popup mit den verdienten Abzeichen zum Anhaken,
     * höchstens drei (dasselbe Muster wie die Item-Auswahl beim Anlegen).
     * Geschrieben wird der eigene Eintrag mit Zusammenführung.
     */
    abzeichenWaehlen() {
        /* Seit v0.156.0 die gemeinsame Auswahl über alle Spiele (Profil-Blatt,
           js\profil.js) — sonst fielen die Abzeichen anderer Spiele beim
           Speichern aus der Wahl. */
        if (typeof PROFIL !== "undefined" && PROFIL._alsBlatt()) {
            PROFIL.abzeichenWahlOeffnen();
            return;
        }
        const ich = ICH.person();
        if (!ich || !ANMELDUNG.abgleich) {
            return;
        }
        const staende = RANGLISTE._staende();
        const verdient = RANGLISTE.abzeichenVon(ich.id, staende)
            .filter((eintrag) => eintrag.erreicht);

        if (verdient.length === 0) {
            DIALOG.hinweis("Noch kein Abzeichen",
                "1 Partie beenden · erstes Abzeichen");
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
                const knopf = RANGLISTE._knopf("",
                    "knopf-klein item-haken" + (drin ? " item-haken-an" : " item-haken-aus"),
                    () => {
                        if (drin) {
                            wahl.splice(wahl.indexOf(eintrag.id), 1);
                        } else if (wahl.length >= SPIELER.ABZEICHEN_PLAETZE) {
                            DIALOG.kurzmeldung("Höchstens " + SPIELER.ABZEICHEN_PLAETZE
                                + " Abzeichen · erst eins abwählen");
                            return;
                        } else {
                            wahl.push(eintrag.id);
                        }
                        fuellen();
                    });
                knopf.setAttribute("aria-pressed", drin ? "true" : "false");
                if (typeof TEAM_SCHACH !== "undefined" && TEAM_SCHACH._itemKachelFuellen) {
                    TEAM_SCHACH._itemKachelFuellen(knopf, eintrag.titel, null);
                } else {
                    knopf.textContent = eintrag.titel;
                }
                knopf.title = eintrag.text;
                halter.appendChild(knopf);
            }
        };
        fuellen();

        DIALOG.hinweis("Abzeichen wählen",
            "Bis zu 3 · auf der Visitenkarte", halter)
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

    /*
     * Eine Partie im Reiter „Partien" — EINE Zeile, antippbar (seit
     * v0.119.1). Die Angaben, die vorher zwei weitere Zeilen füllten,
     * stehen jetzt im Popup (`_partieZeigen`).
     */
    _verlaufZeileBauen(eintrag, staende) {
        const zeile = RANGLISTE._element("button", "profil-partie");
        zeile.type = "button";

        zeile.appendChild(RANGLISTE._element("span",
            "profil-marke profil-marke-" + eintrag.ausgang,
            RANGLISTE._ausgangKurz(eintrag.ausgang)));

        const mitte = RANGLISTE._element("span", "profil-partie-mitte");
        mitte.appendChild(RANGLISTE._element("span", "profil-partie-titel", eintrag.titel));

        const unter = [];
        if (eintrag.wann > 0) {
            unter.push(RANGLISTE._zeitpunktText(eintrag.wann));
        }
        const gegen = RANGLISTE._namenText(eintrag.gegner, staende);
        unter.push("gegen " + (gegen || "niemanden"));
        mitte.appendChild(RANGLISTE._element("span", "profil-partie-unter", unter.join(" · ")));
        zeile.appendChild(mitte);

        zeile.appendChild(RANGLISTE._element("span", "profil-partie-punkte", "+" + eintrag.punkte));
        zeile.addEventListener("click", () => RANGLISTE._partieZeigen(eintrag, staende));
        return zeile;
    },

    /* Die Namen zu einer Liste von Kennungen, mit Komma — Entfernte fehlen. */
    _namenText(ids, staende) {
        return ids
            .map((id) => RANGLISTE._nameVon(id, staende.spieler))
            .filter((name) => name !== "")
            .join(", ");
    },

    /* Das Popup zu einer Partie: alles, was die Zeile weglässt. */
    _partieZeigen(eintrag, staende) {
        const marke = { sieg: "Gewonnen", remis: "Remis", niederlage: "Verloren" };
        const zeilen = [marke[eintrag.ausgang] + ", +" + eintrag.punkte + " Punkte"];

        if (eintrag.wann > 0) {
            zeilen.push("Beendet: " + RANGLISTE._zeitpunktText(eintrag.wann));
        }
        if (eintrag.dauerMs > 0) {
            zeilen.push("Dauer: " + RANGLISTE._dauerText(eintrag.dauerMs));
        }
        if (eintrag.zuege > 0) {
            zeilen.push("Züge: " + eintrag.zuege);
        }
        if (eintrag.beute > 0) {
            zeilen.push("Davon für geschlagene Figuren: " + eintrag.beute);
        }

        const gegen = RANGLISTE._namenText(eintrag.gegner, staende);
        const mit = RANGLISTE._namenText(eintrag.mitspieler, staende);
        zeilen.push("Gegen: " + (gegen || "niemanden"));
        zeilen.push(mit ? "Zusammen mit: " + mit : "Allein im Team");

        return DIALOG.hinweis(eintrag.titel, zeilen.join("\n"));
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

    /*
     * Noch keine beendete Partie (Statistik und Partien im Profil, seit
     * v0.140.0 EIN Bild statt zweier Sätze): Zeichen, zwei Wörter, und der
     * Knopf, der weiterhilft — zum Start, dort wird gespielt.
     */
    _leerOhnePartie() {
        return ZUSTAND.leer({
            zeichen: "pokal", text: "Keine Partie",
            aktion: {
                text: "Spielen",
                beiKlick: () => {
                    RANGLISTE.offenesProfil = "";
                    TABS.wechseln("start");
                }
            }
        });
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
