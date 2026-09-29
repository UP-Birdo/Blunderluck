/*
 * profil.js — das eigene Profil als BLATT (seit v0.156.0, Entwurf Oberfläche Runde 7, vom Nutzer abgenommen
 * 28.09.2026). Das Aussehen ist der gemeinsame Baustein js\upcrew-profil.js; hier steht nur, WAS Blunderluck
 * hineinlegt:
 *
 *   - Ring (XP im Level), Name + klein „#Tag“, XP bis zum nächsten Level (FORTSCHRITT_KONTO.level)
 *   - 3 ausgerüstete Abzeichen aus ALLEN Spielen (Konto-Feld `abzeichen`, UPCREW_ABZEICHEN.alle); ein Tipp öffnet
 *     die Auswahl als zweites Blatt darüber
 *   - Spielzeit (Summe, je Spiel) und „dabei seit“ (FORTSCHRITT_KONTO.spielzeit)
 *   - Wo du stehst: Blunderluck im Turm, Typoluck, sobald sein Zweig da ist
 *   - „Statistik und Partien“: das bisherige ausführliche Profil (Rangliste)
 *   Das Zahnrad oben rechts öffnet die Einstellungen als Blatt darüber (darin Admin → Verwaltung).
 *
 * VERDIENTE BLUNDERLUCK-ABZEICHEN LIEGEN FEST IM PROFIL (Nutzer 28.09.2026: „wenn ich in dem einen Spiel ein
 * Abzeichen bekomme, soll es fix im Profil liegen“): Sie werden weiter aus der Chronik gerechnet
 * (RANGLISTE.abzeichenVon), aber einmal verdient als Zähler `az…` = 1 in den eigenen Zweig geschrieben
 * (`abzeichenBuchen`). So sieht auch Typoluck sie, und sie gehen nicht verloren, wenn alte Partien wegfallen.
 *
 * Ohne den Baustein (Bildschirm-Tests) bleibt der alte Weg: das Profil in der Rangliste.
 */

const PROFIL = {

    _eintrag: null,
    _wahl: null,

    /* Alte Kennungen im Konto-Feld (bis v0.155: „erster-sieg“ …) → neue („bl-erster-sieg“). */
    umdeuten(kennung) {
        const k = String(kennung || "");
        if (typeof RANGLISTE !== "undefined" && RANGLISTE.ABZEICHEN.some((e) => e.id === k)) {
            return "bl-" + k;
        }
        return k;
    },

    /* Die Einträge der Datenliste für Blunderluck (js\upcrew-abzeichen-spiele.js). */
    _spielListe() {
        return (typeof UPCREW_ABZEICHEN_SPIELE !== "undefined" && UPCREW_ABZEICHEN_SPIELE.blunderluck)
            ? UPCREW_ABZEICHEN_SPIELE.blunderluck.abzeichen : [];
    },

    /*
     * Die verdienten Blunderluck-Abzeichen als Zähler in den eigenen Zweig (nur höher, nie tiefer).
     * Liefert, wie viele neu dazukamen.
     */
    abzeichenBuchen() {
        const ich = (typeof ICH !== "undefined") ? ICH.person() : null;
        if (!ich || typeof RANGLISTE === "undefined" || typeof FORTSCHRITT_KONTO === "undefined"
                || typeof FORTSCHRITT_KONTO.zaehlerHeben !== "function") {
            return 0;
        }
        const liste = PROFIL._spielListe();
        const felder = {};
        for (const eintrag of RANGLISTE.abzeichenVon(ich.id, RANGLISTE._staende())) {
            const daten = liste.find((e) => e.kennung === "bl-" + eintrag.id);
            if (eintrag.erreicht && daten) {
                felder[daten.feld] = 1;
            }
        }
        return FORTSCHRITT_KONTO.zaehlerHeben(felder);
    },

    /* Alle Abzeichen aller Spiele mit dem eigenen Stand. */
    alleAbzeichen() {
        if (typeof UPCREW_ABZEICHEN === "undefined" || typeof FORTSCHRITT === "undefined"
                || typeof FORTSCHRITT_KONTO === "undefined") {
            return [];
        }
        const sauber = FORTSCHRITT.normalisieren(FORTSCHRITT_KONTO.lesen());
        const heute = FORTSCHRITT.datumVon(Date.now());
        const schutz = FORTSCHRITT.schutzVerdient(FORTSCHRITT.level(sauber).level);
        return UPCREW_ABZEICHEN.alle(sauber, FORTSCHRITT.serie(sauber, heute, schutz).tage);
    },

    _gewaehlt() {
        const ich = ICH.person();
        const daten = (typeof ANMELDUNG !== "undefined" && ANMELDUNG.abgleich) ? ANMELDUNG.abgleich.daten : null;
        const spieler = (ich && daten) ? SPIELER.spielerFinden(daten, ich.id) : null;
        return (spieler && Array.isArray(spieler.abzeichen) ? spieler.abzeichen : []).map((k) => PROFIL.umdeuten(k));
    },

    /* Die Zahlen für den Baustein. */
    daten() {
        const ich = ICH.person();
        const eintrag = (typeof ANMELDUNG !== "undefined" && typeof ANMELDUNG.ich === "function") ? ANMELDUNG.ich() : null;
        const lv = FORTSCHRITT_KONTO.level();
        const rahmen = FORTSCHRITT.rahmenVon(lv.level);
        const alle = PROFIL.alleAbzeichen();
        const zeit = FORTSCHRITT_KONTO.spielzeit();
        const namen = (typeof RANGLISTE !== "undefined") ? RANGLISTE.SPIEL_NAMEN : {};
        const zeilen = Object.keys(zeit.spiele).sort().filter((app) => zeit.spiele[app] > 0)
            .map((app) => (namen[app] || app) + " " + FORTSCHRITT.spielzeitText(zeit.spiele[app]));
        return {
            name: (eintrag && eintrag.name) || (ich ? ich.name : ""),
            tag: (typeof KONTO !== "undefined" && typeof KONTO.tagZusatz === "function") ? KONTO.tagZusatz(eintrag) : "",
            level: lv.level,
            anteil: lv.anteil,
            ringKlasse: rahmen ? "level-rahmen-" + rahmen.id : "",
            xpText: Math.round(lv.imLevel) + " / " + Math.round(lv.kosten) + " XP bis Level " + (lv.level + 1),
            abzeichen: UPCREW_ABZEICHEN.ausgeruestet(alle, PROFIL._gewaehlt(), SPIELER.ABZEICHEN_PLAETZE || 3),
            plaetze: SPIELER.ABZEICHEN_PLAETZE || 3,
            spielzeit: { wert: FORTSCHRITT.spielzeitText(zeit.summe), zeilen: zeilen,
                oeffentlich: FORTSCHRITT.spielzeitOeffentlichVon(eintrag) },
            seit: zeit.seit ? RANGLISTE._tagText(zeit.seit) : "",
            orte: PROFIL.orte()
        };
    },

    /* Wo du stehst — je Spiel eine Zeile. */
    orte() {
        const orte = [];
        if (typeof TURM !== "undefined") {
            const figuren = FORTSCHRITT_KONTO.turmFiguren();
            const nr = TURM.erreicht(figuren);
            const alle = TURM.anzahlOrte();
            const ort = TURM.ort(Math.min(nr, alle));
            const summe = TURM.summe(figuren, Math.min(nr, alle));
            orte.push({
                spiel: "Blunderluck",
                titel: nr > alle ? "Turm · alle Orte geschafft" : "Turm · " + (ort ? ort.name : ""),
                unter: nr > alle ? alle + " von " + alle + " Orten"
                    : "Ort " + nr + " von " + alle + " · " + summe.hat + " von " + summe.alle + " Figuren",
                anteil: Math.min(1, (Math.min(nr, alle + 1) - 1 + (nr > alle ? 0 : summe.hat / Math.max(1, summe.alle))) / alle),
                pfad: "M6 21 V9 L4 7 V3 H8 V5 H10 V3 H14 V5 H16 V3 H20 V7 L18 9 V21 Z M10 21 V16 H14 V21"
            });
        }
        const stand = FORTSCHRITT.normalisieren(FORTSCHRITT_KONTO.lesen());
        if (stand.spiele && stand.spiele.typoluck) {
            const figuren = FORTSCHRITT.turmFiguren(stand, "typoluck");
            const zahl = Object.keys(figuren).reduce((s, k) => s + (Number(figuren[k]) || 0), 0);
            orte.push({
                spiel: "Typoluck",
                titel: "Bibliothek",
                unter: zahl + (zahl === 1 ? " Figur" : " Figuren"),
                pfad: "M4 5 C7 4 10 4 12 6 C14 4 17 4 20 5 V19 C17 18 14 18 12 20 C10 18 7 18 4 19 Z M12 6 V20"
            });
        }
        return orte;
    },

    /* ---------------------------------------------------------------- *
     * Blätter
     * ---------------------------------------------------------------- */

    _alsBlatt() {
        return typeof UPCREW_BLATT !== "undefined" && typeof UPCREW_PROFIL !== "undefined"
            && typeof UPCREW_ABZEICHEN !== "undefined" && typeof UPCREW_ABZEICHEN.alle === "function"
            && typeof FORTSCHRITT_KONTO !== "undefined";
    },

    oeffnen() {
        const ich = ICH.person();
        if (!ich) {
            DIALOG.hinweis("Nicht angemeldet", "Dieses Gerät · niemand angemeldet");
            return;
        }
        if (!PROFIL._alsBlatt()) {
            RANGLISTE.eigenesProfilOeffnen("start");
            return;
        }
        /* Das Profil liegt über dem Start — offene Blätter gehen vorher zu. */
        if (typeof TABS !== "undefined" && TABS.aktiveId !== "start") {
            TABS.wechseln("start");
        } else if (typeof TABS !== "undefined" && typeof TABS._blaetterStillSchliessen === "function") {
            TABS._blaetterStillSchliessen();
        }
        PROFIL.abzeichenBuchen();
        PROFIL._eintrag = UPCREW_BLATT.oeffnen({
            titel: "Profil",
            klasse: "blatt-profil",
            rechts: [UPCREW_PROFIL.zahnrad(() => TABS.blattOeffnen("einstellungen"))],
            inhalt: () => PROFIL.zeichnen(),
            beimSchliessen: () => {
                PROFIL._eintrag = null;
            }
        });
        PROFIL.zeichnen();
        return PROFIL._eintrag;
    },

    offen() {
        return !!PROFIL._eintrag;
    },

    zeichnen() {
        const eintrag = PROFIL._eintrag;
        if (!eintrag || !eintrag.inhalt) {
            return;
        }
        const statistik = UPCREW_PROFIL.abschnitt("Blunderluck");
        const knopf = document.createElement("button");
        knopf.type = "button";
        knopf.className = "knopf knopf-still profil-statistik-knopf";
        knopf.textContent = "Statistik und Partien";
        knopf.addEventListener("click", () => PROFIL.statistikOeffnen());
        statistik.appendChild(knopf);
        const verlauf = document.createElement("button");
        verlauf.type = "button";
        verlauf.className = "knopf knopf-still profil-verlauf-knopf";
        verlauf.textContent = "Verlauf";
        verlauf.title = "Vergangene Matches";
        verlauf.addEventListener("click", () => PROFIL.verlaufOeffnen());
        statistik.appendChild(verlauf);
        UPCREW_PROFIL.zeichnen(eintrag.inhalt, PROFIL.daten(), {
            beiAbzeichen: () => PROFIL.abzeichenWahlOeffnen(),
            zusatz: [statistik]
        });
    },

    /* Das ausführliche Profil (Statistik, Abzeichen der Chronik, Partien): seit v0.156.1 ein SEITENWECHSEL auf
       die Rangliste (Leisten-Tabs sind Seiten, final\EINBAU-2026-09-29.md); „Zurück“ dort öffnet dieses Blatt wieder. */
    statistikOeffnen() {
        if (!ICH.person()) {
            return;
        }
        RANGLISTE.eigenesProfilOeffnen("profil");
    },

    /* „Verlauf“ (Vergangene Matches, seit v0.156.1 hier statt im Menüband): als Blatt über dem Profil. */
    verlaufOeffnen() {
        if (typeof START !== "undefined" && typeof START.verlaufOeffnen === "function") {
            START.verlaufOeffnen();
        }
    },

    /* Die Auswahl als zweites Blatt: jede Änderung geht gleich ans Konto (mit Zusammenführung). */
    abzeichenWahlOeffnen() {
        const ich = ICH.person();
        if (!ich || typeof ANMELDUNG === "undefined" || !ANMELDUNG.abgleich) {
            return null;
        }
        PROFIL._wahl = UPCREW_BLATT.oeffnen({
            titel: "Abzeichen",
            klasse: "blatt-abzeichen",
            inhalt: (ort) => UPCREW_PROFIL.abzeichenWahl(ort, PROFIL.alleAbzeichen(), PROFIL._gewaehlt(), {
                plaetze: SPIELER.ABZEICHEN_PLAETZE || 3,
                beiWechsel: (liste) => {
                    ANMELDUNG.abgleich.aendern(SPIELER.abzeichenSetzen(ANMELDUNG.abgleich.daten, ich.id, liste), true);
                    PROFIL.zeichnen();
                },
                beiGesperrt: (eintrag) => DIALOG.kurzmeldung("Noch nicht verdient · " + (eintrag.text || eintrag.titel))
            }),
            beimSchliessen: () => {
                PROFIL._wahl = null;
            }
        });
        return PROFIL._wahl;
    }
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = { PROFIL };
}
