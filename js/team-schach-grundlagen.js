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
        wurzel.appendChild(kopf);

        wurzel.appendChild(TEAM_SCHACH._element("p", "erklaerung",
            "Alles fürs normale Schach — in der "
            + "Reihenfolge, in der man es braucht. Jedes Bild ist mit den echten "
            + "Regeln gerechnet."));

        for (const gruppe of SCHACH_GRUNDLAGEN.GRUPPEN) {
            wurzel.appendChild(TEAM_SCHACH._grundlagenGruppeBauen(gruppe));
        }

        /*
         * ZUM SCHLUSS DER VERWEIS AUF DAS, WAS HIER ANDERS IST. Ohne ihn
         * lernt jemand die Regeln und wundert sich dann über Mauern und
         * Lootboxen — die stehen in der anderen Bibliothek.
         */
        const abschluss = TEAM_SCHACH._element("section", "karte");
        abschluss.appendChild(TEAM_SCHACH._element("h3", "", "Und was ist hier anders?"));
        abschluss.appendChild(TEAM_SCHACH._element("p", "erklaerung",
            "Team Schach spielt nach diesen Regeln, mit einer Zugabe: Lootboxen "
            + "auf dem Brett. Ihre Fähigkeiten können Figuren zurückholen oder "
            + "Felder sperren — schachmatt setzen können sie nicht."));

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
        karte.appendChild(TEAM_SCHACH._element("h3", "", gruppe.titel));
        karte.appendChild(TEAM_SCHACH._element("p", "erklaerung", gruppe.text));

        /* Die Werte sind eine Tabelle, kein Kapitel mit Bild — sie stehen
           deshalb direkt da und nicht hinter einem Aufklapper. */
        if (gruppe.id === "werte") {
            karte.appendChild(TEAM_SCHACH._grundlagenWerteBauen());
            return karte;
        }

        for (const kapitel of SCHACH_GRUNDLAGEN.kapitelDerGruppe(gruppe.id)) {
            karte.appendChild(TEAM_SCHACH._grundlagenEintragBauen(kapitel));
        }

        return karte;
    },

    /*
     * Die Figurenwerte als Reihe: Zeichen, Name, Wert, Satz. Die Zahl kommt
     * aus `SCHACH_GRUNDLAGEN.werte()` und damit aus derselben Tabelle, mit der
     * die Bilanz am Ende der Partie rechnet.
     */
    _grundlagenWerteBauen() {
        const liste = TEAM_SCHACH._element("div", "werte-liste");

        for (const eintrag of SCHACH_GRUNDLAGEN.werte()) {
            const zeile = TEAM_SCHACH._element("div", "werte-zeile");

            zeile.appendChild(TEAM_SCHACH._element("span", "figur figur-weiss werte-figur"
                + TEAM_SCHACH._figurKlasse(eintrag.art),
                TEAM_SCHACH._figurZeichen(eintrag.art)));

            const text = TEAM_SCHACH._element("div", "werte-text");
            text.appendChild(TEAM_SCHACH._element("span", "werte-name", eintrag.name));
            text.appendChild(TEAM_SCHACH._element("span", "werte-satz", eintrag.satz));
            zeile.appendChild(text);

            /* Der König trägt 0 und ist trotzdem der wichtigste — die Zahl
               wäre dort eine falsche Auskunft. */
            zeile.appendChild(TEAM_SCHACH._element("span", "werte-zahl",
                (eintrag.art === "K") ? "—" : String(eintrag.wert)));

            liste.appendChild(zeile);
        }

        return liste;
    },

    _grundlagenEintragBauen(kapitel) {
        const eintrag = document.createElement("details");
        eintrag.className = "stufen-eintrag grundlagen-eintrag";

        const kopf = document.createElement("summary");
        kopf.className = "stufen-kopf";
        kopf.appendChild(TEAM_SCHACH._element("span", "stufen-name", kapitel.titel));
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
     * durchsuchen — dasselbe Muster wie `infoOffenerEintrag` in der
     * Fähigkeiten-Bibliothek. Es ist nicht nur billiger: Ein Griff nach
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
