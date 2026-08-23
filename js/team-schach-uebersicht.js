/*
 * team-schach-uebersicht.js - die Uebersicht aller Partien und das Anlegen.
 *
 * Teil des Bildschirms TEAM_SCHACH; der Einstieg steht in team-schach.js.
 * Diese Datei ERGAENZT dasselbe Objekt (siehe dort) und wird NACH ihm geladen.
 *
 * Hier drin: die Auswahl der Spielart mit ihren Vorschaubildern, die
 * Einstellungen fuer eine neue Partie und die Liste aller Partien.
 */

Object.assign(TEAM_SCHACH, {
    /* ---------------------------------------------------------------- *
     * Auswahl der Spielart
     *
     * Eine eigene Ansicht statt eines Dialogs: Zu jeder Spielart gehört ein
     * Vorschaubild, und dafür ist eine Auswahlliste der falsche Ort. Auf dem
     * Handy ist eine volle Seite mit Kacheln ohnehin besser zu treffen als ein
     * Dialog mit fünf Zeilen.
     * ---------------------------------------------------------------- */

    _auswahlZeichnen(wurzel) {
        const kopf = TEAM_SCHACH._element("div", "partie-kopf");
        kopf.appendChild(TEAM_SCHACH._knopf("Zurück", "knopf-still knopf-klein",
            () => TEAM_SCHACH.auswahlSchliessen()));
        /*
         * „NEUE PARTIE" STATT „WELCHE SPIELART?" (seit v0.94).
         *
         * Die Überschrift stammte aus v0.44, als hier wirklich nur Kacheln
         * standen. Inzwischen kommen davor die Figurenzahl, sechs
         * Einstellungen, die Lootbox-Menge, der Item-Vorrat und die Brettform
         * — die Spielart ist der LETZTE Schritt, nicht der erste. Eine
         * Überschrift, die nach etwas fragt, das erst nach zwei Bildschirmen
         * kommt, führt in die Irre. Die Reihenfolge selbst bleibt, wie sie
         * ist: Die Kachel legt die Partie sofort an, also müssen die
         * Einstellungen davor stehen.
         */
        kopf.appendChild(TEAM_SCHACH._element("h2", "partie-titel", "Neue Partie"));

        /*
         * DER ERKLÄRSATZ STEHT HINTER DEM i (seit v0.52). Er sagt etwas, das man
         * EINMAL wissen muss und danach nie wieder — als Absatz blähte er den
         * Bildschirm auf und schob die Kacheln nach unten, also genau das, was
         * man hier eigentlich antippen will. Dasselbe Muster wie beim
         * Fähigkeiten-Fenster in v3.5.
         */
        kopf.appendChild(TEAM_SCHACH._infoZeichenBauen(
            "Was gilt beim Anlegen?",
            "Spielart und Einstellungen stehen mit dem Anlegen fest und lassen "
            + "sich später nicht mehr ändern. Das Bild auf der Kachel zeigt die "
            + "Startaufstellung."));

        wurzel.appendChild(kopf);

        /*
         * DIE FIGURENZAHL STEHT GANZ OBEN (seit v0.86, Wunsch V1: „die Anzahl
         * der Figuren auch eine Knopf-Funktion, immer bei der Auswahl ganz
         * oben"). Vor Brettform und Kacheln — wer die Stärke ändert, sieht die
         * Zahl unter JEDER Kachel sofort mitgehen, weil die Kachel dasselbe
         * `armeeAufstellen` rechnet wie die echte Partie.
         */
        wurzel.appendChild(TEAM_SCHACH._armeeStaerkeLeisteBauen());

        wurzel.appendChild(TEAM_SCHACH._regelSchalterBauen());
        wurzel.appendChild(TEAM_SCHACH._formLeisteBauen());

        const feld = TEAM_SCHACH._element("div", "spielart-feld");

        for (const variante of SCHACH_VARIANTEN.zurAuswahlNachForm(TEAM_SCHACH.gewaehlteForm)) {
            feld.appendChild(TEAM_SCHACH._spielartKachelBauen(variante));
        }

        wurzel.appendChild(feld);
    },

    /*
     * DIE BRETTFORM STEHT VOR DER SPIELART (seit v0.63, Wunsch #22).
     *
     * Bis v0.62 lagen alle Spielarten als eine flache Reihe Kacheln da und
     * mischten zwei Fragen: welche FORM und welche GRÖSSE. Mit den drei
     * Kreuz-Brettern wären das sieben Kacheln ohne erkennbare Ordnung gewesen.
     *
     * Jetzt wählt man erst die Form — Quadratisch, Rechteckig, Kreuz — und
     * sieht darunter nur deren Grössen. Die Form ist reine Anzeige: Sie steht
     * nicht in der Partie, sondern nur in diesem Bildschirm. Was gespeichert
     * wird, ist wie immer die eine gewählte Spielart.
     */
    _formLeisteBauen() {
        const karte = TEAM_SCHACH._element("section", "karte");
        karte.appendChild(TEAM_SCHACH._element("h3", "", "Welche Brettform?"));

        const leiste = TEAM_SCHACH._element("div", "form-leiste");

        for (const form of SCHACH_VARIANTEN.FORMEN) {
            const aktiv = (form.id === TEAM_SCHACH.gewaehlteForm);

            const knopf = TEAM_SCHACH._knopf(form.titel,
                "knopf-klein form-knopf" + (aktiv ? " form-knopf-aktiv" : " knopf-still"),
                () => {
                    TEAM_SCHACH.gewaehlteForm = form.id;
                    TEAM_SCHACH.weichZeichnen();
                });

            knopf.setAttribute("aria-pressed", aktiv ? "true" : "false");

            if (aktiv) {
                knopf.appendChild(TEAM_SCHACH._aktivPille("form"));
            }
            leiste.appendChild(knopf);
        }

        karte.appendChild(leiste);

        const gewaehlt = SCHACH_VARIANTEN.FORMEN.find(
            (form) => form.id === TEAM_SCHACH.gewaehlteForm);

        if (gewaehlt) {
            karte.appendChild(TEAM_SCHACH._element("p", "erklaerung", gewaehlt.beschreibung));
        }

        return karte;
    },

    /*
     * Die drei Einstellungen über den Kacheln. Sie stehen VOR der Spielart,
     * weil sie für jede gelten — die Kachel ist der letzte Klick, der die
     * Partie anlegt.
     */
    _regelSchalterBauen() {
        const karte = TEAM_SCHACH._element("section", "karte");
        karte.appendChild(TEAM_SCHACH._element("h3", "", "Einstellungen"));

        /*
         * Alle Haken sind zu Beginn AUS: Eine neue Partie ist erst einmal ein
         * normales Schachspiel. Was dazukommen soll, hakt man ausdrücklich an.
         *
         * „Seltenheit anzeigen" hängt am Würfel-Haken und erscheint erst, wenn
         * der gesetzt ist — ohne Würfel gäbe es nichts anzuzeigen.
         */
        const schalter = [
            {
                schluessel: "faehigkeiten",
                titel: "Lootboxen",
                hinweis: "Auf freien Feldern erscheinen Lootboxen mit Fähigkeiten — "
                    + "gute wie schlechte.",

                /*
                 * DAS i FÜHRT IN DIE GANZE BIBLIOTHEK (seit v0.55).
                 *
                 * In v0.52 zeigte es nur einen Absatz Text. Gemeint war aber
                 * das ganze Menü: alle Fähigkeiten mit ihren Stufen, Zeichen und
                 * abgespielten Anleitungen. Wer sich beim Anlegen fragt, ob er
                 * Würfel will, will genau das sehen — und nicht erst eine Partie
                 * anlegen müssen, um es zu erfahren.
                 *
                 * Möglich ist das ohne Umbau: `zeichnen` fragt `infoOffen` VOR
                 * `auswahlOffen` ab, und `infoSchliessen` bringt einen deshalb
                 * genau hierher zurück.
                 */
                bibliothek: true
            },
            {
                schluessel: "seltenheitZeigen",
                titel: "Seltenheit anzeigen",
                hinweis: "An heisst: Die Lootbox trägt schon auf dem Brett die Farbe "
                    + "ihrer Stufe. Aus sehen alle gleich aus, und man weiss erst "
                    + "beim Einsammeln, wie selten es war.",
                nurMitWuerfeln: true
            },
            {
                schluessel: "pechZeigen",
                titel: "Unglücks-Lootboxen anzeigen",
                hinweis: "An heisst: Eine schlechte Lootbox trägt ihr Fragezeichen "
                    + "auf dem Kopf, man erkennt sie von weitem. Aus sieht sie aus "
                    + "wie jede andere — dann ist jede ein Wagnis.",
                nurMitWuerfeln: true
            },
            {
                schluessel: "zufallsArmee",
                titel: "Zufallsarmee",
                hinweis: "Gewürfelte Figuren statt der gewohnten Aufstellung. Wie "
                    + "viele es sind, sagt allein der Regler oben. Selten sind es "
                    + "ZWEI Könige: Dann hast du zwei Leben — der erste fällt wie "
                    + "jede Figur, den letzten muss der Gegner mattsetzen."
            },
            {
                schluessel: "armeeUnterschiedlich",
                titel: "Unterschiedliche Armeen",
                hinweis: "An würfelt jede Mannschaft für sich — dann kann eine Seite "
                    + "zwei Türme und eine Dame haben und die andere fast nur Bauern. "
                    + "Aus bekommen beide dieselben Figuren, spiegelbildlich.",
                nurMitArmee: true
            },
            /*
             * EINIGKEIT IST SEIT v0.76 DIE VORGABE — der Haken fragt das
             * GEGENTEIL ab (Eingangskorb vom 18.08.: „Team muss einig sein soll
             * andersrum da stehen, also dass einig sein Standard sein soll und
             * das andere nur mit Knopfdruck auswählbar ist").
             *
             * Gespeichert wird weiter `regeln.einigkeit` mit derselben
             * Bedeutung (additiver Datenvertrag — jede laufende Partie trägt
             * das Feld). Umgedreht ist nur, was am Bildschirm steht: Der Haken
             * heisst jetzt nach dem SCHNELLEN Weg und ist aus.
             */
            {
                schluessel: "einigkeit",
                umgekehrt: true,
                titel: "Wer zuerst zieht, hat gezogen",
                hinweis: "Aus (Vorgabe) wird jeder Zug erst vorgeschlagen und "
                    + "ausgeführt, wenn das Team zustimmt oder die Frist abläuft. "
                    + "An zieht jeder sofort für sein ganzes Team. Der Vorschlag "
                    + "steht im gemeinsamen Stand — der Gegner liest ihn mit."
            }
        ];

        /*
         * Zwei Haken haben Unterpunkte: der Würfel-Haken und (seit v0.51) die
         * Zufallsarmee. Ein Unterpunkt erscheint erst, wenn sein Oberpunkt
         * gesetzt ist — sonst stünde dort eine Einstellung zu einer Sache, die
         * es in dieser Partie gar nicht gibt.
         */
        const obenDrueber = { nurMitWuerfeln: "faehigkeiten", nurMitArmee: "zufallsArmee" };

        /*
         * UNTERPUNKTE LIEGEN IN EINEM GRUPPEN-KASTEN (seit v0.110). Bis
         * v0.109 zeigte ein Einrück-Strich die Zugehörigkeit — weg damit
         * (Nutzer-Ansage 22.08.): Jetzt sammelt ein leise hinterlegter Kasten
         * alles, was zu einem Haken gehört, wie in den Einstellungen moderner
         * Apps. `ablegen` sortiert jede Zeile an ihren Platz: ohne Oberpunkt
         * in die Karte (und der Kasten ist zu), mit Oberpunkt in den Kasten
         * ihres Oberpunkts.
         */
        let gruppe = null;
        let gruppeFuer = "";

        const ablegen = (element, unter) => {
            if (!unter) {
                karte.appendChild(element);
                gruppe = null;
                gruppeFuer = "";
                return;
            }

            if (!gruppe || gruppeFuer !== unter) {
                gruppe = TEAM_SCHACH._element("div", "schalter-gruppe");
                gruppeFuer = unter;
                karte.appendChild(gruppe);
            }

            gruppe.appendChild(element);
        };

        for (const eintrag of schalter) {
            const oben = eintrag.nurMitWuerfeln
                ? obenDrueber.nurMitWuerfeln
                : (eintrag.nurMitArmee ? obenDrueber.nurMitArmee : "");

            if (oben && !TEAM_SCHACH.neueRegeln[oben]) {
                continue;
            }

            const zeile = TEAM_SCHACH._element("label", "schalter-zeile");

            const kasten = document.createElement("input");
            kasten.type = "checkbox";
            kasten.className = "schalter-kasten";
            /* `umgekehrt` (seit v0.76): Der Haken fragt das GEGENTEIL des
               gespeicherten Feldes ab — siehe „Wer zuerst zieht, hat gezogen".
               Im Stand ändert sich dadurch nichts. */
            kasten.checked = eintrag.umgekehrt
                ? !TEAM_SCHACH.neueRegeln[eintrag.schluessel]
                : !!TEAM_SCHACH.neueRegeln[eintrag.schluessel];

            kasten.addEventListener("change", () => {
                TEAM_SCHACH.neueRegeln[eintrag.schluessel] = eintrag.umgekehrt
                    ? !kasten.checked
                    : !!kasten.checked;

                /*
                 * JEDER HAKEN ZEICHNET NEU (seit v0.71).
                 *
                 * Bis v0.70 stand hier eine Liste mit zwei Schlüsseln: Nur
                 * „Lootboxen" und „Zufallsarmee" zeichneten neu, weil nur sie
                 * Unterpunkte hatten. Als der Regen-Haken v0.60 seinen
                 * Schieberegler bekam, wurde er zum dritten — und niemand
                 * ergänzte die Liste. Der Regler erschien deshalb erst, wenn
                 * irgendetwas anderes ein Neuzeichnen auslöste, etwa ein Tipp
                 * auf eine andere Brettform und zurück. Genau so wurde es
                 * gemeldet.
                 *
                 * Eine Liste, die man beim Einbauen des nächsten Unterpunkts
                 * mitpflegen muss, ist eine Falle. Neuzeichnen kostet hier
                 * nichts: `neueRegeln` ist reiner Bildschirm-Zustand, die
                 * Ansicht baut sich aus ihm auf.
                 */
                TEAM_SCHACH.weichZeichnen();
            });
            zeile.appendChild(kasten);

            /*
             * NUR DER TITEL STEHT DA (seit v0.105). Der Erklärsatz sitzt hinter
             * dem i daneben — siehe `_leistenKopfBauen`, dieselbe Ansage vom
             * 21.08. Sieben Haken mit je zwei bis vier Zeilen Text waren eine
             * Wand, durch die man sich zu den Kacheln durchscrollen musste.
             */
            const text = TEAM_SCHACH._element("span", "schalter-text");
            text.appendChild(TEAM_SCHACH._element("span", "schalter-titel", eintrag.titel));
            zeile.appendChild(text);

            /*
             * Das i steht NEBEN der Zeile, nicht darin: Die ganze Zeile ist ein
             * `label` und schaltet den Haken um — ein Knopf mittendrin würde
             * beides gleichzeitig auslösen.
             */
            const halter = TEAM_SCHACH._element("div", "schalter-halter");
            halter.appendChild(zeile);

            /*
             * EIN i JE ZEILE, und es zeigt immer den Erklärsatz dieser Zeile.
             * Beim Lootbox-Haken führt es zusätzlich in die Bibliothek: Wer
             * dort mehr wissen will, will die Fähigkeiten sehen, nicht noch
             * einen Absatz (seit v0.55 war das der ganze Zweck dieses i).
             */
            halter.appendChild(eintrag.bibliothek
                ? TEAM_SCHACH._bibliothekZeichenBauen(eintrag)
                : TEAM_SCHACH._infoZeichenBauen(eintrag.titel, eintrag.hinweis));

            ablegen(halter, oben);

            /* Wie viele Lootboxen es sein sollen, steht direkt unter ihrem
               Haken — es ist die erste Frage, die man danach hat. Beide
               Reihen liegen im Gruppen-Kasten des Lootbox-Hakens. */
            if (eintrag.schluessel === "faehigkeiten"
                && TEAM_SCHACH.neueRegeln.faehigkeiten) {
                ablegen(TEAM_SCHACH._mengenLeisteBauen(), "faehigkeiten");

                /* Und darunter, WELCHE Items vorkommen (seit v0.87, V3:
                   „nicht nur die Anzahl, sondern auch welche Items"). */
                ablegen(TEAM_SCHACH._vorratLeisteBauen(), "faehigkeiten");
            }
        }

        return karte;
    },

    /*
     * DIE VIER STUFEN FÜR DIE LOOTBOX-MENGE (seit v0.71).
     *
     * Sie lösen zwei Einstellungen auf einmal ab: den Haken „Lootbox-Regen"
     * (v0.50) und den Schieberegler „Wie früh es regnet" (v0.60). Beide
     * beantworteten dieselbe Frage — wie viel kommt —, und man musste sie
     * zusammendenken. Vier Kästchen nebeneinander sagen es in einem Blick.
     *
     * Was jede Stufe bedeutet, steht im Modell
     * (`SCHACH_VARIANTEN.LOOTBOX_MENGEN`), samt dem Satz darunter: Der
     * Bildschirm zeigt hier nur an, was das Modell sagt.
     */
    _mengenLeisteBauen() {
        const zeile = TEAM_SCHACH._element("div", "mengen-zeile");

        zeile.appendChild(TEAM_SCHACH._leistenKopfBauen("Wie viele Lootboxen?",
            SCHACH_VARIANTEN.LOOTBOX_MENGEN));

        const leiste = TEAM_SCHACH._element("div", "mengen-leiste");

        for (const menge of SCHACH_VARIANTEN.LOOTBOX_MENGEN) {
            const aktiv = (menge.id === TEAM_SCHACH.neueRegeln.lootboxMenge);

            const knopf = TEAM_SCHACH._knopf(menge.titel,
                "knopf-klein mengen-knopf" + (aktiv ? " mengen-knopf-aktiv" : " knopf-still"),
                () => {
                    TEAM_SCHACH.neueRegeln.lootboxMenge = menge.id;
                    TEAM_SCHACH.weichZeichnen();
                });

            knopf.setAttribute("aria-pressed", aktiv ? "true" : "false");

            if (aktiv) {
                knopf.appendChild(TEAM_SCHACH._aktivPille("mengen"));
            }
            leiste.appendChild(knopf);
        }

        zeile.appendChild(leiste);

        return zeile;
    },

    /*
     * Ein kleines i, das einen Text in einem Hinweis zeigt (seit v0.52).
     *
     * Es gibt schon `_infoKnopfBauen` — der führt aber fest in die
     * Fähigkeiten-Bibliothek. Dieses hier trägt seinen Text bei sich und ist
     * überall einsetzbar, wo ein Absatz den Bildschirm aufbläht.
     */
    /*
     * DER KOPF EINER KNOPFREIHE: Frage links, i rechts (seit v0.105).
     *
     * NUTZER-ANSAGE 21.08.: „Generell zu viel Texte überall — kürze die Infos
     * so, dass man sie noch versteht, und verstecke sie so, dass sie beim
     * normalen Nutzen nicht sichtbar sind, aber nicht verschwinden."
     *
     * Bis v0.104 stand unter jeder der drei Reihen ein ganzer Satz zur gerade
     * gewählten Stufe. Drei Reihen mal ein Satz, dazu sieben Haken mit je einem
     * Satz — der Anlege-Bildschirm war zu zwei Dritteln Text, und die Kacheln,
     * die man antippen will, standen ganz unten. Jetzt steht die Erklärung
     * hinter dem i, und zwar für ALLE Stufen auf einmal: Wer sie liest, will
     * ohnehin vergleichen, und ein Text, der nur die gewählte Stufe erklärt,
     * musste bei jedem Knopfdruck neu gelesen werden.
     *
     * Die Texte kommen aus dem Modell (`hinweis` je Stufe) — der Bildschirm
     * denkt sich keine Regeln aus (eiserne Regel).
     */
    /*
     * Das i des Lootbox-Hakens: erst der Erklärsatz, dann der Weg in die
     * Bibliothek. `DIALOG.frage` statt `hinweis`, weil es zwei Knöpfe braucht —
     * „Verstanden" und „Alle Fähigkeiten ansehen".
     */
    _bibliothekZeichenBauen(eintrag) {
        const knopf = document.createElement("button");

        knopf.type = "button";
        knopf.className = "info-knopf";
        knopf.textContent = "i";
        knopf.setAttribute("aria-label", eintrag.titel);
        knopf.title = eintrag.titel;
        knopf.addEventListener("click", (ereignis) => {
            /* Sonst schaltet der Klick zusätzlich den Haken der Zeile um. */
            if (ereignis && ereignis.preventDefault) {
                ereignis.preventDefault();
            }

            DIALOG.frage(eintrag.titel, eintrag.hinweis,
                "Alle Fähigkeiten ansehen").then((weiter) => {
                    if (weiter) {
                        TEAM_SCHACH.faehigkeitenOeffnen();
                    }
                });
        });

        return knopf;
    },

    /* `alsUeberschrift` (seit v0.109): Steht die Reihe in einer eigenen
       Karte, trägt der Kopf ein h3 wie die Nachbar-Karten — als Unterpunkt
       im Einstellungs-Kasten bleibt es der kleinere Titel. */
    _leistenKopfBauen(titel, stufen, nachsatz, alsUeberschrift) {
        const kopf = TEAM_SCHACH._element("div", "leisten-kopf");

        kopf.appendChild(alsUeberschrift
            ? TEAM_SCHACH._element("h3", "", titel)
            : TEAM_SCHACH._element("span", "schalter-titel", titel));

        const zeilen = stufen
            .filter((stufe) => !!stufe.hinweis)
            .map((stufe) => stufe.titel + ": " + stufe.hinweis);

        if (nachsatz) {
            zeilen.push("");
            zeilen.push(nachsatz);
        }

        kopf.appendChild(TEAM_SCHACH._infoZeichenBauen(titel, zeilen.join("\n")));

        return kopf;
    },

    _infoZeichenBauen(titel, text) {
        const knopf = document.createElement("button");

        knopf.type = "button";
        knopf.className = "info-knopf";
        knopf.textContent = "i";
        knopf.setAttribute("aria-label", titel);
        knopf.title = titel;
        knopf.addEventListener("click", (ereignis) => {
            /* Sonst schaltet der Klick zusätzlich den Haken der Zeile um. */
            if (ereignis && ereignis.preventDefault) {
                ereignis.preventDefault();
            }
            DIALOG.hinweis(titel, text);
        });

        return knopf;
    },

    /*
     * DIE KNOPFREIHE FÜR DIE FIGURENZAHL (seit v0.86, Wunsch V1).
     *
     * Gebaut wie die Lootbox-Mengen — dieselbe Reihe, dieselben Klassen; wer
     * die eine bedienen kann, kann auch die andere. Sie steht IMMER da, auch
     * ohne den Haken „Zufallsarmee": Die Ansage war „immer bei der Auswahl
     * ganz oben". Ohne den Haken sagt der Hinweis, dass die Spielart ihre
     * eigene Aufstellung mitbringt — die Reihe verschwindet nicht, sonst
     * springt der Bildschirm beim Haken-Setzen.
     */
    /*
     * WELCHE ITEMS ES IN DER PARTIE GIBT (seit v0.87, Wunsch R5/V3).
     *
     * Wieder dieselbe Knopfreihe. Eigene Klassen (`vorrat-*`) aus demselben
     * Grund wie bei der Armee-Stärke: Drei gleich aussehende Reihen auf einem
     * Bildschirm müssen im Test und im CSS unterscheidbar bleiben.
     *
     * Welche Items ausgelost werden, entscheidet sich erst beim ANLEGEN und
     * hängt an der Partie-Kennung — hier steht deshalb nur, WIE VIELE es sein
     * sollen. Die Liste selbst zeigt die Partie danach oben an.
     */
    /*
     * DREI MENGEN IN EINER REIHE, DIE EIGENE WAHL DARUNTER (seit v0.105,
     * Nutzer-Ansage 21.08.: „bei welche Items kommen vor die 10 rausnehmen und
     * die drei übrigen Punkte nebeneinander").
     *
     * Die Reihe zeigt nur noch die MENGEN (`wenig`, `viele`, `alle`) — sie
     * beantworten dieselbe Frage und passen damit zu dritt nebeneinander. Die
     * eigene Wahl ist keine Menge, sondern eine Liste; sie bekommt einen
     * eigenen Knopf darunter, der das Popup öffnet. Erkannt wird sie an
     * `eigeneWahl`, nicht am Namen.
     */
    _vorratLeisteBauen() {
        const zeile = TEAM_SCHACH._element("div", "vorrat-zeile");

        zeile.appendChild(TEAM_SCHACH._leistenKopfBauen("Welche Items kommen vor?",
            SCHACH_VARIANTEN.ITEM_VORRAETE));

        const leiste = TEAM_SCHACH._element("div", "vorrat-leiste");

        for (const groesse of SCHACH_VARIANTEN.ITEM_VORRAETE) {
            if (groesse.eigeneWahl) {
                continue;
            }

            const aktiv = (groesse.id === TEAM_SCHACH.neueRegeln.itemVorrat);

            const knopf = TEAM_SCHACH._knopf(groesse.titel,
                "knopf-klein vorrat-knopf" + (aktiv ? " vorrat-knopf-aktiv" : " knopf-still"),
                () => {
                    TEAM_SCHACH.neueRegeln.itemVorrat = groesse.id;
                    TEAM_SCHACH.weichZeichnen();
                });

            knopf.setAttribute("aria-pressed", aktiv ? "true" : "false");

            if (aktiv) {
                knopf.appendChild(TEAM_SCHACH._aktivPille("vorrat"));
            }
            leiste.appendChild(knopf);
        }

        zeile.appendChild(leiste);
        zeile.appendChild(TEAM_SCHACH._eigeneWahlKnopfBauen());

        return zeile;
    },

    /*
     * DER KNOPF FÜR DIE EIGENE WAHL — und was er anzeigt.
     *
     * Er trägt den STAND (wie viele von wie vielen), nicht die Erklärung: Das
     * ist die einzige Angabe, die man beim Anlegen wirklich sehen muss. Der
     * erste Druck hakt alles an und öffnet das Popup; man streicht weg, was man
     * nicht will — das ist weniger Arbeit als zwanzigmal anhaken, und die Liste
     * ist nie leer.
     */
    _eigeneWahlKnopfBauen() {
        const stufe = SCHACH_VARIANTEN.ITEM_VORRAETE.find(
            (eintrag) => eintrag.eigeneWahl);
        const aktiv = (TEAM_SCHACH.neueRegeln.itemVorrat === stufe.id);
        const gewaehlt = TEAM_SCHACH.neueRegeln.itemAuswahl.length;
        const alle = TEAM_SCHACH._alleItems().length;

        const knopf = TEAM_SCHACH._knopf(
            aktiv
                ? ("Selbst gewählt: " + gewaehlt + " von " + alle + " — ändern")
                : (stufe.titel + " ..."),
            "knopf-klein vorrat-eigene"
                + (aktiv ? " vorrat-knopf-aktiv" : " knopf-still"),
            () => {
                TEAM_SCHACH.neueRegeln.itemVorrat = stufe.id;

                if (TEAM_SCHACH.neueRegeln.itemAuswahl.length === 0) {
                    TEAM_SCHACH.neueRegeln.itemAuswahl = TEAM_SCHACH._alleItems();
                }

                TEAM_SCHACH._itemAuswahlOeffnen();
            });

        knopf.setAttribute("aria-pressed", aktiv ? "true" : "false");

        /* Auch hier wandert nur die farbige Fläche (siehe `_aktivPille`) —
           derselbe Name wie in der Mengen-Reihe darüber, denn aktiv ist
           immer nur EINER von beiden. */
        if (aktiv) {
            knopf.appendChild(TEAM_SCHACH._aktivPille("vorrat"));
        }

        return knopf;
    },

    /*
     * DIE LISTE ZUM ANHAKEN (seit v0.100).
     *
     * Gezeigt wird, was in dieser Partie überhaupt vorkommen KANN — also
     * `faehigkeitenDerStufe` je Stufe, dieselbe Quelle wie Ziehung und
     * Bibliothek. Versteckte Fähigkeiten stehen deshalb gar nicht erst drin.
     *
     * MINDESTENS EINS BLEIBT ANGEHAKT (Nutzer-Vorgabe). Das letzte Kästchen
     * lässt sich nicht ausschalten; wer es versucht, bekommt einen Hinweis
     * statt einer leeren Liste. Eine leere Liste hiesse im Modell „keine
     * Einschränkung", also das Gegenteil von dem, was man gerade wollte.
     */
    /* Jede Fähigkeit, die es zu wählen gibt — dieselbe Quelle wie Ziehung und
       Bibliothek, also ohne die versteckten. */
    _alleItems() {
        const liste = [];

        for (const stufe of SCHACH_VARIANTEN.STUFEN) {
            for (const art of SCHACH_VARIANTEN.faehigkeitenDerStufe(stufe.id)) {
                liste.push(art);
            }
        }
        return liste;
    },

    /*
     * DIE AUSWAHL STEHT IM POPUP (seit v0.105, Nutzer-Ansage 21.08.: „bei
     * selbst wählen soll statt dieser scrollbaren Liste ein Popup-Menü
     * kommen").
     *
     * Bis v0.104 hing die Ankreuzliste mitten im Anlege-Bildschirm, in einem
     * Kasten mit eigener Höhe und eigenem Rollbalken — zwei Rollbalken
     * ineinander, und die Kacheln darunter waren weg. Der Dialog bringt seinen
     * eigenen mit (`dialog-kasten`, 90 vh), also braucht die Liste hier keinen:
     * Sie darf so hoch werden, wie sie ist.
     *
     * Die Kästchen schreiben direkt in `neueRegeln.itemAuswahl` und zeichnen
     * NUR sich selbst neu (`_itemAuswahlFuellen`). Ein `TEAM_SCHACH.zeichnen`
     * bei jedem Haken würde den Bildschirm HINTER dem offenen Dialog neu
     * aufbauen — der Dialog bliebe stehen, aber sein Auslöser wäre ein anderes
     * Element als das, was man gerade sieht. Neu gezeichnet wird deshalb erst
     * beim Schliessen; dann stimmt auch die Zahl auf dem Knopf wieder.
     */
    _itemAuswahlOeffnen() {
        const halter = TEAM_SCHACH._element("div", "item-auswahl");

        TEAM_SCHACH._itemAuswahlFuellen(halter);

        DIALOG.hinweis("Welche Items kommen vor?",
            "Angehakt ist, was in dieser Partie vorkommen kann. Mindestens eins "
            + "bleibt stehen.",
            halter).then(() => TEAM_SCHACH.weichZeichnen());
    },

    _itemAuswahlFuellen(halter) {
        halter.innerHTML = "";

        for (const stufe of SCHACH_VARIANTEN.STUFEN) {
            const arten = SCHACH_VARIANTEN.faehigkeitenDerStufe(stufe.id);
            if (arten.length === 0) {
                continue;
            }

            halter.appendChild(TEAM_SCHACH._element("div",
                "item-auswahl-stufe stufe-" + stufe.id, stufe.titel));

            for (const art of arten) {
                halter.appendChild(TEAM_SCHACH._itemHakenBauen(art, halter));
            }
        }

        return halter;
    },

    _itemHakenBauen(art, halter) {
        const gewaehlt = TEAM_SCHACH.neueRegeln.itemAuswahl;
        const drin = (gewaehlt.indexOf(art) !== -1);

        const knopf = TEAM_SCHACH._knopf(
            (drin ? "[x] " : "[ ] ") + SCHACH_VARIANTEN.faehigkeitTitel(art),
            "knopf-klein item-haken" + (drin ? " item-haken-an" : " knopf-still"),
            () => {
                if (!drin) {
                    gewaehlt.push(art);
                    TEAM_SCHACH._itemAuswahlFuellen(halter);
                    return;
                }

                if (gewaehlt.length <= 1) {
                    DIALOG.hinweis("Mindestens ein Item",
                        "Sonst wäre jede Lootbox leer. Hake erst ein anderes an.");
                    return;
                }

                gewaehlt.splice(gewaehlt.indexOf(art), 1);
                TEAM_SCHACH._itemAuswahlFuellen(halter);
            });

        knopf.setAttribute("aria-pressed", drin ? "true" : "false");
        knopf.title = SCHACH_VARIANTEN.faehigkeitKurz(art);

        return knopf;
    },

    _armeeStaerkeLeisteBauen() {
        /*
         * EINE EIGENE KARTE (seit v0.109) wie „Einstellungen" und „Welche
         * Brettform?". Bis v0.108 trug die Reihe die Unterpunkt-Klasse samt
         * Einrück-Strich — der zeigt aber eine Zugehörigkeit an, und diese
         * Reihe gehört zu keinem Haken: Der Strich hing im Leeren
         * (Nutzer-Meldung 22.08.). Eigene Klassen (`armee-*`), nicht die der
         * Lootbox-Mengen — mit denselben hielte ein Test die eine Reihe für
         * die andere.
         */
        const karte = TEAM_SCHACH._element("section", "karte armee-karte");

        karte.appendChild(TEAM_SCHACH._leistenKopfBauen("Wie viele Figuren je Seite?",
            SCHACH_VARIANTEN.ARMEE_STAERKEN,
            "Ohne den Haken „Zufallsarmee“ bleibt die Aufstellung der Spielart "
            + "stehen, nur eben schmaler oder tiefer.", true));

        const leiste = TEAM_SCHACH._element("div", "armee-leiste");

        for (const staerke of SCHACH_VARIANTEN.ARMEE_STAERKEN) {
            const aktiv = (staerke.id === TEAM_SCHACH.neueRegeln.armeeStaerke);

            const knopf = TEAM_SCHACH._knopf(staerke.titel,
                "knopf-klein armee-knopf" + (aktiv ? " armee-knopf-aktiv" : " knopf-still"),
                () => {
                    TEAM_SCHACH.neueRegeln.armeeStaerke = staerke.id;
                    TEAM_SCHACH.weichZeichnen();
                });

            knopf.setAttribute("aria-pressed", aktiv ? "true" : "false");

            if (aktiv) {
                knopf.appendChild(TEAM_SCHACH._aktivPille("armee"));
            }

            leiste.appendChild(knopf);
        }

        karte.appendChild(leiste);

        return karte;
    },

    /*
     * DIE FARBIGE FLÄCHE DES AKTIVEN KNOPFS IST EIN EIGENES ELEMENT (seit
     * v0.109). Beim weichen Neuzeichnen wandert nur SIE zum neuen Knopf — der
     * Text bleibt stehen. Bis v0.108 trug der Knopf selbst den
     * `view-transition-name`: Dann wanderte er MITSAMT Beschriftung, und
     * „wenig" verschmierte sichtbar zu „normal" (Nutzer-Meldung 22.08.).
     *
     * Die Pille liegt hinter dem Text (`z-index: -1`) und trägt je Reihe
     * ihren eigenen Namen (`stil.css`). Ohne View-Transitions ist sie einfach
     * der Hintergrund — die Optik ist dieselbe.
     */
    _aktivPille(reihe) {
        const pille = TEAM_SCHACH._element("span",
            "reihen-pille reihen-pille-" + reihe);

        pille.setAttribute("aria-hidden", "true");
        return pille;
    },

    _spielartKachelBauen(variante) {
        const kachel = document.createElement("button");
        kachel.type = "button";
        kachel.className = "spielart-kachel";
        kachel.addEventListener("click", () => TEAM_SCHACH.spielartGewaehlt(variante.id));

        /*
         * MIT ZUFALLSARMEE ZEIGT DIE KACHEL EIN BEISPIEL (seit v0.83,
         * Nutzer-Wunsch 18.08.: „bei Zufall auch gleich ein Beispiel zeigen,
         * wie es sein kann").
         *
         * Gerechnet mit derselben Funktion, die auch die echte Partie
         * aufstellt — ein gemaltes Beispiel wäre die zweite Wahrheit, die
         * beim ersten Umbau abweicht. Die Saat hängt an der Spielart, das
         * Bild bleibt deshalb beim Neuzeichnen stehen und flackert nicht.
         */
        const brett = TEAM_SCHACH._vorschauBrett(variante);

        kachel.appendChild(TEAM_SCHACH._vorschauBauen(variante, brett));

        const kopf = TEAM_SCHACH._element("div", "spielart-kopf");
        kopf.appendChild(TEAM_SCHACH._element("span", "spielart-titel", variante.titel));
        kopf.appendChild(TEAM_SCHACH._element("span", "spielart-masse",
            variante.breite + " mal " + variante.hoehe));
        kachel.appendChild(kopf);

        /*
         * WIE VIELE FIGUREN JE SEITE (seit v0.83, „die Vorschau soll schon die
         * Anzahl anzeigen"). Gezählt wird aus dem Brett, das die Kachel WIRKLICH
         * zeigt — mit Zufallsarmee steht dort also die gewürfelte Zahl, nicht
         * die der vollen Aufstellung.
         *
         * Sind beide Seiten gleich stark, steht eine Zahl da; das ist der
         * Normalfall. Nur wenn sie sich unterscheiden (Haken „unterschiedliche
         * Armeen"), werden beide genannt — sonst wäre die eine Zahl gelogen.
         */
        kachel.appendChild(TEAM_SCHACH._element("span", "spielart-anzahl",
            TEAM_SCHACH._figurenText(brett)));

        /*
         * WIE LANGE DAUERT DAS? (seit v0.93, Wunsch W10.)
         *
         * Der einzige sichtbare Teil der stillen Zeitmessung — und ihr ganzer
         * Zweck. Gerechnet wird im Modell (`SCHACH_RUNDE.dauerText`) aus den
         * gewählten Einstellungen und dem, was in bisherigen Partien wirklich
         * gemessen wurde; der Bildschirm rechnet nichts selbst.
         *
         * Die Zahl steht bewusst unter der Figurenzahl: Beides beantwortet
         * dieselbe Frage — worauf lasse ich mich hier ein?
         */
        kachel.appendChild(TEAM_SCHACH._element("span", "spielart-dauer",
            "Dauer: " + SCHACH_RUNDE.dauerText(
                TEAM_SCHACH._figurenJeSeite(brett),
                variante.breite * variante.hoehe,
                TEAM_SCHACH.neueRegeln,
                TEAM_SCHACH._gespieltePartien())));

        kachel.appendChild(TEAM_SCHACH._element("span", "spielart-text", variante.beschreibung));

        return kachel;
    },

    /*
     * Das Brett, das die Kachel zeigt: die feste Aufstellung — oder ein
     * gewürfeltes Beispiel, wenn der Haken „Zufallsarmee" gesetzt ist.
     *
     * Gebaut wird das Beispiel über `SCHACH_RUNDE.armeeAufstellen`, also über
     * den öffentlichen Weg, den auch die echte Partie geht. Damit stimmt es
     * auch auf dem Kreuz (dort stellt `_armeeStandKreuz` seit v0.76 je
     * Startseite auf) und beim Haken „unterschiedliche Armeen".
     */
    _vorschauBrett(variante) {
        let runde = SCHACH_RUNDE.leereRunde(0, variante.id,
            "vorschau-" + variante.id, "");

        /*
         * OHNE HAKEN ZEIGT DIE KACHEL DIE FESTE AUFSTELLUNG — seit v0.100 aber
         * auf den Regler zugeschnitten, genau wie die Partie sie anlegt.
         * Vorher gab sie hier stumpf `variante.aufstellung` zurück; der Regler
         * bewegte das Bild also nur mit Haken, und ohne ihn versprach die
         * Kachel eine Aufstellung, die so gar nicht kam.
         *
         * Gerechnet wird über DENSELBEN Weg wie beim Anlegen. Eine Vorschau,
         * die aus einer anderen Quelle rechnet als das Ergebnis, bestätigt
         * einen Fehler, statt ihn zu zeigen — genau das ist in v0.86/v0.87
         * passiert (`erkenntnisse.md`).
         */
        if (TEAM_SCHACH.neueRegeln.zufallsArmee !== true) {
            runde.regeln.armeeStaerke = TEAM_SCHACH.neueRegeln.armeeStaerke;

            /* Die Vorschau ist immer eine NEUE Partie — sie rechnet deshalb
               nach der neuen Regel (siehe `armeeFassung`). */
            runde.regeln.armeeFassung = 1;

            runde = SCHACH_RUNDE.kreuzAufstellen(runde, "");
            runde = SCHACH_RUNDE.aufstellungAnpassen(runde);
            return runde.stand.brett;
        }

        runde.regeln.zufallsArmee = true;
        runde.regeln.armeeUnterschiedlich =
            (TEAM_SCHACH.neueRegeln.armeeUnterschiedlich === true);

        /* Dieselbe Stärke wie beim Anlegen (seit v0.86) — sonst zeigt die
           Kachel eine andere Zahl, als die Partie hinterher aufstellt. */
        runde.regeln.armeeStaerke = TEAM_SCHACH.neueRegeln.armeeStaerke;

        runde = SCHACH_RUNDE.armeeAufstellen(runde, "");
        return runde.stand.brett;
    },

    /*
     * Die Figurenzahl EINER Seite — die Grundlage der Dauer-Schätzung. Genommen
     * wird Weiss; unterscheiden sich die Seiten (Haken „unterschiedliche
     * Armeen"), ist das nah genug für einen groben Anhaltspunkt.
     */
    _figurenJeSeite(brett) {
        let anzahl = 0;

        for (const zeichen of brett) {
            if (zeichen !== "." && zeichen === zeichen.toUpperCase()) {
                anzahl++;
            }
        }

        return anzahl;
    },

    /*
     * Die Partien, aus denen die Zeitmessung lernt: alles, was auf der Tafel
     * liegt. Beendete wie laufende — beide tragen echte Sekunden und echte
     * Züge bei, und `sekundenJeHalbzug` verwirft von selbst, was zu kurz ist.
     */
    _gespieltePartien() {
        const daten = TEAM_SCHACH.abgleich && TEAM_SCHACH.abgleich.daten;
        const partien = (daten && Array.isArray(daten.partien)) ? daten.partien : [];

        return partien;
    },

    /* „12 Figuren je Seite" — oder beide Zahlen, wenn sie sich unterscheiden. */
    _figurenText(brett) {
        let weiss = 0;
        let schwarz = 0;

        for (const zeichen of brett) {
            if (zeichen === ".") {
                continue;
            }
            if (zeichen === zeichen.toUpperCase()) {
                weiss++;
            } else {
                schwarz++;
            }
        }

        if (weiss === schwarz) {
            return weiss + " Figuren je Seite";
        }
        return weiss + " gegen " + schwarz + " Figuren";
    },

    /*
     * Das Vorschaubild: ein Miniaturbrett aus DERSELBEN Aufstellung, aus der
     * auch das echte Brett entsteht. Deshalb kann es nicht veralten — wer eine
     * Spielart ändert, ändert ihr Bild automatisch mit. Eine gezeichnete Datei
     * je Spielart wäre die zweite Wahrheit, die irgendwann von der ersten
     * abweicht.
     */
    _vorschauBauen(variante, brett) {
        /* `brett` ist wahlfrei — ohne Angabe die feste Aufstellung der
           Spielart (seit v0.83; davor gab es nur diese eine Quelle). */
        const stellung = brett || variante.aufstellung;

        const vorschau = TEAM_SCHACH._element("div", "vorschau");
        vorschau.style.setProperty("--vorschau-spalten", String(variante.breite));

        const felder = variante.breite * variante.hoehe;

        /* Die toten Ecken eines Kreuz-Bretts gehören ins Vorschaubild — sonst
           sähe die Kachel aus wie ein gewöhnliches Quadrat (seit v0.63). */
        const ecken = variante.kreuz ? SCHACH_VARIANTEN.kreuzEcken(variante) : [];

        for (let feld = 0; feld < felder; feld++) {
            const reihe = Math.floor(feld / variante.breite);
            const spalte = feld % variante.breite;

            const zelle = TEAM_SCHACH._element("div",
                "vorschau-feld " + (((reihe + spalte) % 2 === 0) ? "feld-hell" : "feld-dunkel"));

            if (ecken.indexOf(feld) !== -1) {
                zelle.classList.add("feld-riss");
            }

            const figur = stellung[feld];
            if (figur !== ".") {
                zelle.appendChild(TEAM_SCHACH._element("span",
                    "figur " + (SCHACH.farbeVon(figur) === "weiss" ? "figur-weiss" : "figur-schwarz")
                    + TEAM_SCHACH._figurKlasse(figur),
                    TEAM_SCHACH._figurZeichen(figur)));
            }

            /* Angedeutete Würfel: Sie zeigen, dass in dieser Spielart welche
               erscheinen — wo genau, entscheidet später die Ziehung. */
            const beispiel = variante.bonusFelder.find((eintrag) => eintrag.feld === feld);
            if (beispiel) {
                zelle.classList.add("feld-bonus");
                zelle.appendChild(TEAM_SCHACH._wuerfelBauen(
                    SCHACH_VARIANTEN.stufeVon(beispiel.art)));
            }

            vorschau.appendChild(zelle);
        }

        return vorschau;
    },

    /* ---------------------------------------------------------------- *
     * Übersicht: alle Partien
     * ---------------------------------------------------------------- */

    _uebersichtZeichnen(wurzel, tafel, person) {
        const alle = SCHACH_TAFEL.liste(tafel);

        /*
         * Beendete Partien stehen nicht mehr zwischen den offenen: Sie sind
         * gespielt, ihre Punkte sind festgeschrieben. Weggeworfen werden sie
         * trotzdem nicht — sie liegen zugeklappt darunter, falls jemand noch
         * einmal nachsehen will.
         */
        const offene = alle.filter((partie) => !partie.ergebnis);

        /*
         * NUR DIE EIGENE HISTORIE (seit v0.59, Wunsch #8).
         *
         * Offene Partien sieht weiterhin jeder — man muss ja beitreten können.
         * Beendete sind dagegen abgeschlossen: Wer nicht mitgespielt hat, kann
         * dort nichts mehr tun, und die Liste wuchs mit jeder fremden Partie.
         * Gefiltert wird über `SCHACH_RUNDE.teamVon` — dieselbe Frage, die auch
         * über den Knopf „Ergebnis ansehen" entscheidet.
         *
         * Die Partien selbst bleiben unangetastet: Sie stehen weiter im
         * gemeinsamen Stand, und ihre Punkte stehen in der Chronik. Hier wird
         * nur ANGEZEIGT — die Rangliste zählt unverändert alles.
         */
        const beendete = alle.filter((partie) => partie.ergebnis
            && SCHACH_RUNDE.teamVon(partie, person.id));

        const kopf = TEAM_SCHACH._element("div", "phasen-leiste");
        kopf.appendChild(TEAM_SCHACH._element("span", "phasen-text",
            "Offene Partien: " + offene.length));

        /*
         * DER WEG ZU DEN SCHACHREGELN (seit v0.96).
         *
         * Er steht in der ÜBERSICHT und nicht erst in einer laufenden Partie:
         * Wer Schach nicht kann, soll nachlesen können, BEVOR er einem Team
         * beitritt. Die Fähigkeiten-Bibliothek erreicht man weiterhin über das
         * i beim Anlegen und über den Vorrat — sie beantwortet die zweite
         * Frage, nicht die erste.
         */
        kopf.appendChild(TEAM_SCHACH._grundlagenKnopfBauen());
        wurzel.appendChild(kopf);

        if (offene.length === 0) {
            wurzel.appendChild(TEAM_SCHACH._element("p", "erklaerung",
                "Es läuft keine Partie. Leg eine an, wähle deine Spielart "
                + "und tritt einem Team bei."));
        }

        for (const partie of offene) {
            wurzel.appendChild(TEAM_SCHACH._partieKarteBauen(partie, person));
        }

        if (beendete.length > 0) {
            const kasten = document.createElement("details");
            kasten.className = "verlauf-kasten";

            const titel = document.createElement("summary");
            titel.className = "verlauf-titel";
            titel.textContent = "Deine beendeten Partien (" + beendete.length + ")";
            kasten.appendChild(titel);

            for (const partie of beendete) {
                const karte = TEAM_SCHACH._partieKarteBauen(partie, person);

                /* Wer mitgespielt hat, kann sein Ergebnis jederzeit wieder
                   ansehen — auch nachdem er den Abschluss weggeklickt hat. */
                if (SCHACH_RUNDE.teamVon(partie, person.id)) {
                    const leiste = TEAM_SCHACH._element("div", "karte-fuss");
                    leiste.appendChild(TEAM_SCHACH._knopf("Ergebnis ansehen",
                        "knopf-still knopf-klein",
                        () => TEAM_SCHACH.abschlussZeigen(partie.id)));
                    karte.appendChild(leiste);
                }

                kasten.appendChild(karte);
            }

            wurzel.appendChild(kasten);
        }

        const fuss = TEAM_SCHACH._element("div", "fussleiste");
        fuss.appendChild(TEAM_SCHACH._knopf("Neue Partie", "knopf-haupt",
            () => TEAM_SCHACH.partieAnlegen()));
        wurzel.appendChild(fuss);
    },

    _partieKarteBauen(partie, person) {
        const karte = TEAM_SCHACH._element("section", "karte partie-karte");
        const meinTeam = SCHACH_RUNDE.teamVon(partie, person.id);

        const kopf = TEAM_SCHACH._element("div", "karte-kopf");
        kopf.appendChild(TEAM_SCHACH._element("h3", "", partie.titel));

        if (meinTeam) {
            kopf.appendChild(TEAM_SCHACH._element("span", "chip chip-fertig",
                (meinTeam === "weiss") ? "Du: Weiss" : "Du: Schwarz"));
        }
        /*
         * WER HAT GEWONNEN, WER VERLOREN (seit v0.59, Wunsch #18).
         *
         * Bis dahin stand hier nur „beendet", und wer gewonnen hatte, ging
         * allein aus dem Satz darunter hervor („Weiss hat gewonnen") — die
         * NAMEN dazu standen wieder zwei Zeilen tiefer, unsortiert. Jetzt sagt
         * der Kopf das Ergebnis, und die Namenszeile sagt, wer auf welcher
         * Seite stand.
         *
         * Das eigene Ergebnis steht dabei vorn: Wer mitgespielt hat, will
         * zuerst wissen, ob ER gewonnen hat.
         */
        if (partie.ergebnis) {
            if (meinTeam) {
                const gewonnen = (partie.ergebnis === meinTeam);
                const remis = (partie.ergebnis === "remis");

                kopf.appendChild(TEAM_SCHACH._element("span",
                    "chip " + (remis ? "chip-offen" : (gewonnen ? "chip-fertig" : "chip-fehler")),
                    remis ? "Unentschieden" : (gewonnen ? "Gewonnen" : "Verloren")));
            } else {
                kopf.appendChild(TEAM_SCHACH._element("span", "chip chip-offen",
                    (partie.ergebnis === "remis")
                        ? "Unentschieden"
                        : ((partie.ergebnis === "weiss") ? "Weiss gewinnt" : "Schwarz gewinnt")));
            }
        } else if (partie.laeuft) {
            kopf.appendChild(TEAM_SCHACH._element("span", "chip chip-laeuft", "läuft"));
        }
        karte.appendChild(kopf);

        const variante = SCHACH_RUNDE.varianteVon(partie);
        karte.appendChild(TEAM_SCHACH._element("p", "partie-zeile",
            variante.titel + " — " + SCHACH_RUNDE.kurzfassung(partie)));

        /*
         * MIT WELCHER VERSION SIE ANGELEGT WURDE (seit v0.77) — aber NUR, wenn
         * es eine andere als die laufende ist.
         *
         * Sonst stünde an jeder Karte dieselbe Nummer, und eine Angabe, die
         * immer gleich ist, liest nach zwei Tagen niemand mehr. Interessant ist
         * sie genau dann, wenn die Partie älter ist als die Seite: Dann
         * beantwortet sie beim Melden eines Fehlers die erste Rückfrage
         * („welcher Stand war das?"), ohne dass jemand sie stellen muss.
         *
         * Eine Partie von vor v0.77 trägt den Stempel nicht; dann bleibt die
         * Zeile weg, statt „unbekannt" zu behaupten.
         */
        const jetzt = SCHACH_RUNDE._appVersion();
        if (partie.angelegtMit && jetzt && partie.angelegtMit !== jetzt) {
            karte.appendChild(TEAM_SCHACH._element("p", "partie-zeile partie-herkunft",
                "Angelegt mit v" + partie.angelegtMit + " — die Seite läuft mit v"
                + jetzt + "."));
        }

        const weiss = partie.teams.weiss.map((id) => TEAM_SCHACH._nameVon(id));
        const schwarz = partie.teams.schwarz.map((id) => TEAM_SCHACH._nameVon(id));

        /* Bei einer beendeten Partie trägt jede Seite dazu, wie sie
           ausgegangen ist — sonst muss man das Ergebnis oben mit den Namen
           hier unten selbst zusammenrechnen. */
        const seite = (farbe, namen) => {
            const kopfText = (farbe === "weiss") ? "Weiss" : "Schwarz";
            const wer = namen.length ? namen.join(", ") : "niemand";

            if (!partie.ergebnis) {
                return kopfText + ": " + wer;
            }
            if (partie.ergebnis === "remis") {
                return kopfText + " (unentschieden): " + wer;
            }
            return kopfText + ((partie.ergebnis === farbe) ? " (Sieger): " : " (Verlierer): ") + wer;
        };

        karte.appendChild(TEAM_SCHACH._element("p", "team-namen",
            seite("weiss", weiss) + "   |   " + seite("schwarz", schwarz)));

        const leiste = TEAM_SCHACH._element("div", "karte-fuss");
        leiste.appendChild(TEAM_SCHACH._knopf("Öffnen", "knopf-still knopf-klein",
            () => TEAM_SCHACH.partieOeffnen(partie.id)));
        leiste.appendChild(DIALOG.zweiSchritt(
            TEAM_SCHACH._knopf("Löschen", "knopf-gefahr knopf-klein", null),
            () => TEAM_SCHACH.partieLoeschen(partie)));
        karte.appendChild(leiste);

        return karte;
    },

});
