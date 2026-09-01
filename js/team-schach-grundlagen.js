/*
 * team-schach-grundlagen.js — der Bildschirm zur Schachregel-Anleitung
 * (seit v0.96).
 *
 * Ergänzt TEAM_SCHACH und muss in `index.html` NACH `team-schach.js` und nach
 * `team-schach-auswertung.js` stehen — von dort kommen `_element`, `_knopf`
 * und vor allem `_beispielBrettBauen`, mit dem auch die Fähigkeiten-Anleitung
 * ihre Bretter zeichnet.
 *
 * WAS HIER NICHT PASSIERT: rechnen. Welche Felder eine Figur erreicht, wann
 * Matt und wann Patt gilt, was eine Figur wert ist — alles kommt fertig aus
 * `SCHACH_GRUNDLAGEN`, und das rechnet mit den echten Regeln. Der Bildschirm
 * baut nur Kästen darum.
 *
 * Der Aufbau folgt der Fähigkeiten-Bibliothek: Gruppen als Überschrift,
 * darunter je Kapitel ein Aufklapper (`details`/`summary`). Wer nichts
 * aufklappt, sieht eine Inhaltsübersicht auf einem Bildschirm — die
 * Bilder entstehen erst beim Aufklappen, sonst wären es über tausend Elemente
 * auf einmal.
 */

Object.assign(TEAM_SCHACH, {

    grundlagenOeffnen() {
        TEAM_SCHACH.grundlagenOffen = true;
        TEAM_SCHACH.grundlagenGezeichnet = false;
        TEAM_SCHACH.grundlagenOffenerEintrag = null;
        TEAM_SCHACH.zeichnen(TEAM_SCHACH.abgleich.daten);
    },

    grundlagenSchliessen() {
        TEAM_SCHACH.grundlagenOffen = false;
        TEAM_SCHACH.grundlagenGezeichnet = false;
        TEAM_SCHACH.grundlagenOffenerEintrag = null;
        TEAM_SCHACH.zeichnen(TEAM_SCHACH.abgleich.daten);
    },

    /* Der Knopf, der hierher führt. Steht neben dem i der Fähigkeiten: Beide
       beantworten die Frage „wie geht das eigentlich", nur auf zwei Ebenen. */
    _grundlagenKnopfBauen() {
        const knopf = TEAM_SCHACH._knopf("Schach lernen", "knopf-still knopf-klein",
            () => TEAM_SCHACH.grundlagenOeffnen());

        knopf.title = "Die Grundregeln: Figuren, Schach, Matt und Patt";
        return knopf;
    },

    _grundlagenZeichnen(wurzel) {
        /* EIN Zurück-Knopf oben links; die Kopfzeile klebt beim Rollen fest —
           dieselbe Lösung wie in der Bibliothek (seit v0.110, dort steht das
           Warum). */
        const kopf = TEAM_SCHACH._element("div", "partie-kopf partie-kopf-klebt");
        kopf.appendChild(TEAM_SCHACH._knopf("Zurück", "knopf-still knopf-klein",
            () => TEAM_SCHACH.grundlagenSchliessen()));
        kopf.appendChild(TEAM_SCHACH._element("h2", "partie-titel", "Schach lernen"));

        /*
         * DIE EINLEITUNG STEHT SEIT v0.108.0 HINTER DEM i (Nutzer-Ansage
         * 28.08.2026: weniger Text). Sie stand als Absatz über den vier
         * Karten und sagte nichts, was man zum Lesen der Seite braucht —
         * die Reihenfolge sieht man, und dass die Bilder gerechnet sind,
         * ist eine Zusicherung, keine Anleitung. Verloren geht sie nicht.
         */
        kopf.appendChild(TEAM_SCHACH._infoZeichenBauen("Schach lernen",
            "Alles fürs normale Schach — in der Reihenfolge, in der man es "
            + "braucht. Jedes Bild ist mit den echten Regeln gerechnet."));

        wurzel.appendChild(kopf);

        for (const gruppe of SCHACH_GRUNDLAGEN.GRUPPEN) {
            wurzel.appendChild(TEAM_SCHACH._grundlagenGruppeBauen(gruppe));
        }

        /*
         * ZUM SCHLUSS DER VERWEIS AUF DAS, WAS HIER ANDERS IST. Ohne ihn
         * lernt jemand die Regeln und wundert sich dann über Mauern und
         * Lootboxen — die stehen in der anderen Bibliothek.
         */
        const abschluss = TEAM_SCHACH._element("section", "karte");

        const abschlussKopf = TEAM_SCHACH._element("div", "karte-kopf");
        abschlussKopf.appendChild(TEAM_SCHACH._element("h3", "",
            "Und was ist hier anders?"));
        abschlussKopf.appendChild(TEAM_SCHACH._infoZeichenBauen(
            "Und was ist hier anders?",
            "Blunderluck spielt nach diesen Regeln, mit einer Zugabe: "
            + "Lootboxen auf dem Brett. Ihre Fähigkeiten können Figuren "
            + "zurückholen oder Felder sperren — schachmatt setzen können "
            + "sie nicht."));
        abschluss.appendChild(abschlussKopf);

        const knopf = TEAM_SCHACH._knopf("Zu den Fähigkeiten", "knopf-still knopf-klein",
            () => {
                TEAM_SCHACH.grundlagenOffen = false;
                TEAM_SCHACH.faehigkeitenOeffnen();
            });
        abschluss.appendChild(knopf);
        wurzel.appendChild(abschluss);
    },

    _grundlagenGruppeBauen(gruppe) {
        const karte = TEAM_SCHACH._element("section", "karte");

        /*
         * ÜBERSCHRIFT LINKS, i RECHTS (seit v0.108.0) — der Einleitungssatz
         * jeder Gruppe steht dahinter statt darüber. Vier Gruppen mal ein
         * Absatz waren vier Absätze, bevor der erste Inhalt kam.
         *
         * DER TEXT BLEIBT IM MODELL (`SCHACH_GRUNDLAGEN.GRUPPEN[].text`) —
         * geändert hat sich nur, wo er auftaucht. Wer ihn dort pflegt,
         * pflegt weiterhin die eine Wahrheit.
         */
        const kopf = TEAM_SCHACH._element("div", "karte-kopf");
        kopf.appendChild(TEAM_SCHACH._element("h3", "", gruppe.titel));
        kopf.appendChild(TEAM_SCHACH._infoZeichenBauen(gruppe.titel, gruppe.text));
        karte.appendChild(kopf);

        /*
         * DIE FIGUREN-GRUPPE IST SEIT PUNKT 50 DIE ZUSAMMENGEFÜHRTE LISTE
         * (Nutzer-Ansage 01.09.2026: „dann dinge bei schach lernen
         * zusammenführen"; ausführlich 28.08.2026).
         *
         * Bis dahin standen dieselben sechs Figuren ZWEIMAL untereinander:
         * oben die Gangart hinter dem Aufklapper, darunter noch einmal Bild,
         * Name und Zahl. Jetzt ist es EINE Zeile je Figur — Bild, Name,
         * Wert — und die Gangart liegt dahinter. Die Überschrift „Was ist
         * wie viel wert?" ist damit entfallen; es gibt nichts mehr, was sie
         * von der Liste darüber unterscheiden würde.
         *
         * SIE ENTSTEHT AUS `SCHACH_GRUNDLAGEN.werte()` und steht damit in
         * der Reihenfolge des WERTES (König zuoberst), nicht in der des
         * Lernens. Das Gangart-Kapitel hängt als `kapitel` an jedem Eintrag.
         * Gebaut wird beides von `_grundlagenEintragBauen` — der zweite Wert
         * schaltet Zahl und Satz hinzu.
         */
        if (gruppe.id === "figuren") {
            for (const eintrag of SCHACH_GRUNDLAGEN.werte()) {
                karte.appendChild(TEAM_SCHACH._grundlagenEintragBauen(
                    eintrag.kapitel, eintrag));
            }
            return karte;
        }

        for (const kapitel of SCHACH_GRUNDLAGEN.kapitelDerGruppe(gruppe.id)) {
            karte.appendChild(TEAM_SCHACH._grundlagenEintragBauen(kapitel));
        }

        return karte;
    },

    /*
     * EIN KAPITEL ALS AUFKLAPPER. Der zweite Wert ist der Eintrag aus
     * `SCHACH_GRUNDLAGEN.werte()` und steht nur bei den Figuren da (Punkt
     * 50): Er bringt die Zahl in die Kopfzeile und den Satz in den Inhalt.
     * Ohne ihn — Schach, Matt, Rochade — bleibt alles wie seit v0.96.
     */
    _grundlagenEintragBauen(kapitel, wert) {
        const eintrag = document.createElement("details");
        eintrag.className = "stufen-eintrag grundlagen-eintrag";

        const kopf = document.createElement("summary");
        kopf.className = "stufen-kopf";

        /*
         * DIE FIGUR STEHT VOR IHREM NAMEN (seit v0.109.0, Nutzer-Ansage
         * 28.08.2026: Icons und Beispielbilder statt Texten). Bis v0.108.0
         * war die Liste der sechs Figuren eine reine Wortliste — „Der
         * Bauer", „Der Springer" —, obwohl das Kapitel seine Figur längst
         * kennt (`SCHACH_GRUNDLAGEN.KAPITEL[].figur`).
         *
         * Genommen wird DASSELBE Bild wie auf dem Brett und in der
         * Werte-Liste (`_figurZeichen` + `_figurKlasse`) — wer die Figur
         * hier sieht, erkennt sie im Spiel wieder. Kapitel ohne Figur
         * (Schach, Matt, Rochade) bekommen keins; ein Platzhalter wäre
         * schlimmer als die Lücke.
         */
        if (kapitel.figur) {
            kopf.appendChild(TEAM_SCHACH._element("span",
                "figur figur-weiss grundlagen-figur"
                + TEAM_SCHACH._figurKlasse(kapitel.figur),
                TEAM_SCHACH._figurZeichen(kapitel.figur)));
        }

        kopf.appendChild(TEAM_SCHACH._element("span", "stufen-name", kapitel.titel));

        /*
         * DIE ZAHL STEHT RECHTS IN DERSELBEN ZEILE (Punkt 50). Sie ist der
         * Grund, warum die Liste in dieser Reihenfolge steht — rechtsbündig
         * und in gleichen Ziffernbreiten bleibt die Spalte eine Spalte.
         *
         * BEIM KÖNIG IST ES NICHT DIE ZAHL DES MODELLS: Er trägt dort 0
         * (damit Bilanz, Beute und Bot richtig rechnen) und zeigt hier 15
         * (`SCHACH_GRUNDLAGEN.ANZEIGE_WERT`, Nutzer-Ansage 01.09.2026).
         */
        if (wert) {
            kopf.appendChild(TEAM_SCHACH._element("span", "werte-zahl",
                String(wert.anzeigeWert)));
        }
        eintrag.appendChild(kopf);

        /*
         * DER INHALT ENTSTEHT ERST BEIM AUFKLAPPEN — dasselbe wie in der
         * Fähigkeiten-Bibliothek: Alle Bretter auf einmal wären über tausend
         * Elemente, und gesucht wird ohnehin immer nur eines.
         *
         * Und wie dort ist immer nur EINER offen: Wer den nächsten aufklappt,
         * hat den vorigen hinter sich gelassen.
         */
        eintrag.addEventListener("toggle", () => {
            if (!eintrag.open) {
                return;
            }
            TEAM_SCHACH._grundlagenVorigenSchliessen(eintrag);

            if (eintrag.querySelector(".stufen-inhalt")) {
                return;
            }

            const inhalt = TEAM_SCHACH._element("div", "stufen-inhalt");

            /* Der Satz zur Figur steht VOR den Brettern (Punkt 50) — er
               ordnet die Zahl ein, die in der Kopfzeile steht. */
            if (wert && wert.satz) {
                inhalt.appendChild(TEAM_SCHACH._element("p", "stufen-text",
                    wert.satz));
            }

            for (const bild of SCHACH_GRUNDLAGEN.bilder(kapitel.id)) {
                /* `grundlagen-brett` gibt dem Bild mehr Breite als die
                   Fähigkeits-Anleitung: Acht Spalten statt sechs, und ein Feld
                   soll trotzdem gross genug zum Ansehen bleiben. */
                const halter = TEAM_SCHACH._element("div", "anleitung anleitung-film");
                const flaeche = TEAM_SCHACH._element("div",
                    "anleitung-bild grundlagen-brett");

                flaeche.appendChild(TEAM_SCHACH._beispielBrettBauen(bild));
                halter.appendChild(flaeche);
                inhalt.appendChild(halter);

                inhalt.appendChild(TEAM_SCHACH._element("p", "stufen-text", bild.text));
            }

            eintrag.appendChild(inhalt);
        });

        return eintrag;
    },

    /*
     * Den vorigen Aufklapper zumachen und seinen Inhalt wegräumen.
     *
     * Gemerkt wird der EINE offene Eintrag, statt beim Aufklappen alle zu
     * durchsuchen — dasselbe Muster, das bis v0.17.0 auch die
     * Fähigkeiten-Bibliothek benutzte. Es ist nicht nur billiger: Ein Griff nach
     * `document` hinaus wäre der einzige in dieser Datei, und der
     * Bildschirm-Test hat kein ganzes Dokument, nur den Baum, den er selbst
     * gebaut hat.
     */
    _grundlagenVorigenSchliessen(offen) {
        const vorig = TEAM_SCHACH.grundlagenOffenerEintrag;
        TEAM_SCHACH.grundlagenOffenerEintrag = offen;

        if (!vorig || vorig === offen) {
            return;
        }
        vorig.open = false;

        const inhalt = vorig.querySelector(".stufen-inhalt");
        if (inhalt && inhalt.parentNode) {
            inhalt.parentNode.removeChild(inhalt);
        }
    }
});
