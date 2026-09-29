/*
 * profil.js — das Profil ZWEISTUFIG (seit v0.157.0; davor seit v0.156.0 ein Blatt). Das Aussehen ist der
 * gemeinsame Baustein js\upcrew-profil.js (final\EINBAU-2026-09-29b.md); hier steht nur, WAS Blunderluck
 * hineinlegt.
 *
 * Nutzer 29.09.2026: „generell soll es nur ein vorschau profil geben karte die oben ist mit den ausgerüsteten
 * abzeichen titel und level und flammen mit natürlich dem namen -> und halt das ausführliche wenn man draufklickt
 * mit mehr inhalten statistiken und so“ · „unten soll das level kachel aus dem profil“.
 *
 *   STUFE 1 — die VORSCHAU-KARTE (`UPCREW_PROFIL.vorschau`): oben auf dem Start (START._kurzprofilBauen) und für
 *     JEDEN Namen in der App (Rangliste, Vorraum, Freunde → RANGLISTE.profilOeffnen → `vorschauZeigen`, eine
 *     Karte über allem). Name #Tag, Titel, Level-Knopf (→ Level-Pfad), Serie, 3 ausgerüstete Abzeichen — egal
 *     aus welchem Spiel.
 *   STUFE 2 — das AUSFÜHRLICHE Profil (`oeffnen`, ein Blatt): Kopf, Ausgerüstet, Statistik (Platz, Punkte,
 *     Bilanz, Werte aus der Chronik), Stand (Turm, Bibliothek), Partien (Verlauf), alle Abzeichen, Über
 *     (Spielzeit, dabei seit), bei Fremden die Freundschaft, ganz unten die Level-Kachel (→ Level-Pfad). Das
 *     Zahnrad oben rechts nur im eigenen Profil (→ Einstellungen).
 *
 * FREMDE PROFILE unter Regel §12: Level, Serie und die fünf gemeinsamen Abzeichen kommen aus dem öffentlichen
 * Auszug (`FORTSCHRITT.auszugVon`), die gewählten Kennungen aus dem Feld `abzeichen` des Auszugs. Abzeichen
 * anderer Spiele (tl-…) stehen nicht im Auszug; sie gelten als verdient, weil die Auswahl nur Verdientes
 * annimmt (`UPCREW_PROFIL.abzeichenWahl`). Blunderlucks eigene (bl-…) werden an der Chronik geprüft.
 *
 * VERDIENTE BLUNDERLUCK-ABZEICHEN LIEGEN FEST IM PROFIL (Nutzer 28.09.2026): aus der Chronik gerechnet
 * (RANGLISTE.abzeichenVon), einmal verdient als Zähler `az…` = 1 in den eigenen Zweig (`abzeichenBuchen`).
 *
 * Ohne den Baustein (Bildschirm-Tests) bleibt der alte Weg: das Profil in der Rangliste.
 */

const PROFIL = {

    _eintrag: null,
    _wahl: null,
    _karte: null,
    _allePartien: false,

    /* So viele Partien zeigt „Partien", bevor „Alle" nötig wird. */
    PARTIEN_ANFANG: 5,

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

    /* Alle Abzeichen aller Spiele mit dem eigenen Stand (ohne Serien-Schutz seit v0.157.0). */
    alleAbzeichen() {
        if (typeof UPCREW_ABZEICHEN === "undefined" || typeof FORTSCHRITT === "undefined"
                || typeof FORTSCHRITT_KONTO === "undefined") {
            return [];
        }
        const sauber = FORTSCHRITT.normalisieren(FORTSCHRITT_KONTO.lesen());
        const heute = FORTSCHRITT.datumVon(Date.now());
        return UPCREW_ABZEICHEN.alle(sauber, FORTSCHRITT.serie(sauber, heute, 0).tage);
    },

    _gewaehlt() {
        const ich = ICH.person();
        const daten = (typeof ANMELDUNG !== "undefined" && ANMELDUNG.abgleich) ? ANMELDUNG.abgleich.daten : null;
        const spieler = (ich && daten) ? SPIELER.spielerFinden(daten, ich.id) : null;
        return (spieler && Array.isArray(spieler.abzeichen) ? spieler.abzeichen : []).map((k) => PROFIL.umdeuten(k));
    },

    _istIch(spielerId) {
        const ich = (typeof ICH !== "undefined") ? ICH.person() : null;
        return !spielerId || (!!ich && ich.id === spielerId);
    },

    /* Die Zahlen für den Baustein — ohne Kennung das eigene Profil, sonst das eines anderen. */
    daten(spielerId) {
        return PROFIL._istIch(spielerId) ? PROFIL._eigeneDaten() : PROFIL._fremdeDaten(spielerId);
    },

    _eigeneDaten() {
        const ich = ICH.person();
        const eintrag = (typeof ANMELDUNG !== "undefined" && typeof ANMELDUNG.ich === "function") ? ANMELDUNG.ich() : null;
        const lv = FORTSCHRITT_KONTO.level();
        const rahmen = FORTSCHRITT.rahmenVon(lv.level);
        const alle = PROFIL.alleAbzeichen();
        const zeit = FORTSCHRITT_KONTO.spielzeit();
        const heute = FORTSCHRITT_KONTO.heute();
        const namen = (typeof RANGLISTE !== "undefined") ? RANGLISTE.SPIEL_NAMEN : {};
        const zeilen = Object.keys(zeit.spiele).sort().filter((app) => zeit.spiele[app] > 0)
            .map((app) => (namen[app] || app) + " " + FORTSCHRITT.spielzeitText(zeit.spiele[app]));
        return {
            name: (eintrag && eintrag.name) || (ich ? ich.name : ""),
            tag: (typeof KONTO !== "undefined" && typeof KONTO.tagZusatz === "function") ? KONTO.tagZusatz(eintrag) : "",
            titel: FORTSCHRITT.titelVon(lv.level).name,
            level: lv.level,
            imLevel: Math.round(lv.imLevel),
            kosten: Math.round(lv.kosten),
            anteil: lv.anteil,
            ringKlasse: rahmen ? "level-rahmen-" + rahmen.id : "",
            serie: heute.serie.tage,
            heute: heute.serie.heute === true,
            abzeichen: UPCREW_ABZEICHEN.ausgeruestet(alle, PROFIL._gewaehlt(), SPIELER.ABZEICHEN_PLAETZE || 3),
            plaetze: SPIELER.ABZEICHEN_PLAETZE || 3,
            alle: alle,
            spielzeit: { wert: FORTSCHRITT.spielzeitText(zeit.summe), zeilen: zeilen,
                oeffentlich: FORTSCHRITT.spielzeitOeffentlichVon(eintrag) },
            seit: zeit.seit ? RANGLISTE._tagText(zeit.seit) : "",
            orte: PROFIL.orte()
        };
    },

    /* Ein anderer Spieler: alles aus seinem öffentlichen Auszug (Regel §12) und der Chronik. */
    _fremdeDaten(spielerId) {
        const staende = RANGLISTE._staende();
        const person = SPIELER.spielerFinden(staende.spieler, spielerId) || { id: spielerId, name: "" };
        const heute = FORTSCHRITT.datumVon(Date.now());
        const auszug = FORTSCHRITT.auszugVon(person, heute);
        const lv = FORTSCHRITT.auszugLevel(auszug);
        const rahmen = FORTSCHRITT.rahmenVon(lv.level);
        const serie = FORTSCHRITT.auszugSerie(auszug, heute);
        const alle = UPCREW_ABZEICHEN.alle(FORTSCHRITT.auszugAlsStand(auszug), serie);

        /* Blunderlucks eigene aus der Chronik; die anderer Spiele gelten als verdient (siehe Kopf). */
        const chronik = RANGLISTE.abzeichenVon(spielerId, staende);
        for (const e of alle) {
            if (e.kennung.indexOf("bl-") === 0) {
                const bl = chronik.find((c) => "bl-" + c.id === e.kennung);
                e.erreicht = (bl && bl.erreicht) ? Math.max(1, e.erreicht) : 0;
            }
        }
        /* Die gewählten anderer Spiele gelten als verdient — seit v0.157.0 im Baustein, in beiden Apps gleich
           (UPCREW_ABZEICHEN.fremdAusgeruestet); bl-… zählen nur mit der Chronik. */
        const gewaehlt = Array.isArray(person.abzeichen) ? person.abzeichen : [];
        const abzeichen = UPCREW_ABZEICHEN.fremdAusgeruestet(alle, gewaehlt, SPIELER.ABZEICHEN_PLAETZE || 3,
            (k) => PROFIL.umdeuten(k), (e) => e.kennung.indexOf("bl-") !== 0 || e.erreicht > 0);
        const zeit = (typeof auszug.werte.spielzeit === "number")
            ? { wert: FORTSCHRITT.spielzeitText(auszug.werte.spielzeit), zeilen: [], oeffentlich: true } : null;
        return {
            name: String(person.name || ""),
            tag: RANGLISTE.tagVon(staende.spieler, spielerId) || "",
            titel: FORTSCHRITT.titelVon(lv.level).name,
            level: lv.level,
            imLevel: Math.round(lv.imLevel),
            kosten: Math.round(lv.kosten),
            anteil: lv.anteil,
            ringKlasse: rahmen ? "level-rahmen-" + rahmen.id : "",
            serie: serie,
            heute: false,
            abzeichen: abzeichen,
            plaetze: SPIELER.ABZEICHEN_PLAETZE || 3,
            alle: alle,
            spielzeit: zeit
        };
    },

    /* Wo du stehst — je Spiel eine Zeile (nur im eigenen Profil). */
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
                titel: nr > alle ? "Turm · geschafft" : "Turm · " + (ort ? ort.name : ""),
                unter: nr > alle ? alle + "/" + alle + " Orte"
                    : "Ort " + nr + "/" + alle + " · " + summe.hat + "/" + summe.alle + " Figuren",
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
     * Karte und Blätter
     * ---------------------------------------------------------------- */

    _alsBlatt() {
        return typeof UPCREW_BLATT !== "undefined" && typeof UPCREW_PROFIL !== "undefined"
            && typeof UPCREW_PROFIL.vorschau === "function"
            && typeof UPCREW_ABZEICHEN !== "undefined" && typeof UPCREW_ABZEICHEN.alle === "function"
            && typeof FORTSCHRITT_KONTO !== "undefined";
    },

    /* Der Level-Pfad (UPCREW_LEVELPFAD) für diese Zahlen — eine offene Profil-Karte geht vorher zu, sonst läge
       sie über dem Blatt. */
    levelPfadOeffnen(daten) {
        if (typeof UPCREW_LEVELPFAD === "undefined") {
            return null;
        }
        if (PROFIL._karte) {
            PROFIL._karte.schliessen();
        }
        const d = daten || PROFIL.daten();
        return UPCREW_LEVELPFAD.oeffnen({ level: d.level, imLevel: d.imLevel, kosten: d.kosten });
    },

    /* STUFE 1 für jeden Namen: die Vorschau-Karte (über allem). Ein Tipp öffnet das ausführliche Profil. */
    vorschauZeigen(spielerId) {
        if (!PROFIL._alsBlatt()) {
            return null;
        }
        const daten = PROFIL.daten(spielerId);
        if (PROFIL._karte) {
            PROFIL._karte.schliessen();
        }
        const eintrag = UPCREW_BLATT.oeffnen({
            art: "karte",
            titel: "Profil",
            klasse: "karte-profil",
            beimSchliessen: () => {
                if (PROFIL._karte === eintrag) {
                    PROFIL._karte = null;
                }
            }
        });
        UPCREW_PROFIL.vorschau(eintrag.inhalt, daten, {
            beiOeffnen: () => {
                eintrag.schliessen();
                PROFIL.oeffnen(spielerId);
            },
            beiLevel: () => PROFIL.levelPfadOeffnen(daten)
        });
        PROFIL._karte = eintrag;
        return eintrag;
    },

    /* STUFE 2: das ausführliche Profil als Blatt — ohne Kennung das eigene. */
    oeffnen(spielerId) {
        const ich = ICH.person();
        const eigen = PROFIL._istIch(spielerId);
        if (eigen && !ich) {
            DIALOG.hinweis("Nicht angemeldet", "Dieses Gerät · niemand angemeldet");
            return null;
        }
        if (!PROFIL._alsBlatt()) {
            if (eigen) {
                RANGLISTE.eigenesProfilOeffnen("start");
            }
            return null;
        }
        const id = eigen ? ich.id : spielerId;
        if (eigen) {
            /* Das eigene Profil liegt über dem Start — offene Blätter gehen vorher zu. */
            if (typeof TABS !== "undefined" && TABS.aktiveId !== "start") {
                TABS.wechseln("start");
            } else if (typeof TABS !== "undefined" && typeof TABS._blaetterStillSchliessen === "function") {
                TABS._blaetterStillSchliessen();
            }
            PROFIL.abzeichenBuchen();
        } else if (PROFIL._eintrag) {
            PROFIL._eintrag.schliessen();
        }
        PROFIL._allePartien = false;
        const eintrag = UPCREW_BLATT.oeffnen({
            titel: "Profil",
            klasse: "blatt-profil",
            rechts: eigen ? [UPCREW_PROFIL.zahnrad(() => TABS.blattOeffnen("einstellungen"))] : [],
            beimSchliessen: () => {
                if (PROFIL._eintrag === eintrag) {
                    PROFIL._eintrag = null;
                }
            }
        });
        eintrag.spielerId = id;
        eintrag.eigen = eigen;
        PROFIL._eintrag = eintrag;
        PROFIL.zeichnen();
        return eintrag;
    },

    offen() {
        return !!PROFIL._eintrag;
    },

    zeichnen() {
        const eintrag = PROFIL._eintrag;
        if (!eintrag || !eintrag.inhalt) {
            return;
        }
        const id = eintrag.spielerId;
        const eigen = eintrag.eigen === true;
        const daten = PROFIL.daten(eigen ? "" : id);
        const zusatz = [];
        if (!eigen) {
            const freundschaft = PROFIL._freundschaftBauen(id);
            if (freundschaft) {
                zusatz.push(freundschaft);
            }
        }
        UPCREW_PROFIL.zeichnen(eintrag.inhalt, daten, {
            eigen: eigen,
            beiAbzeichen: eigen ? () => PROFIL.abzeichenWahlOeffnen() : undefined,
            beiAbzeichenTipp: (e) => RANGLISTE.abzeichenZeigen(e),
            beiLevel: () => PROFIL.levelPfadOeffnen(daten),
            statistik: (ort) => PROFIL._statistikBauen(ort, id),
            verlauf: (ort) => PROFIL._verlaufBauen(ort, id, eigen),
            zusatz: zusatz
        });
    },

    /* „Statistik": Platz, Punkte, Partien, Quote, die Bilanz, dann die Werte aus der Chronik (RANGLISTE rechnet). */
    _statistikBauen(ort, spielerId) {
        const staende = RANGLISTE._staende();
        const stat = RANGLISTE.statistik(spielerId, staende);
        const verlauf = RANGLISTE.verlauf(spielerId, staende.schach);
        const person = RANGLISTE.gesamt(staende.spieler, staende.schach).find((e) => e.id === spielerId);
        const platz = RANGLISTE._platzVon(spielerId, staende);
        const kurz = RANGLISTE._element("div", "profil-kurzwerte");
        for (const [zahl, wort] of [
            [platz.platz > 0 ? String(platz.platz) : "–", "Platz"],
            [String(person ? person.gesamt : 0), "Punkte"],
            [String(stat.partien), "Partien"],
            [stat.partien ? stat.siegquote + " %" : "–", "Quote"]
        ]) {
            const feld = RANGLISTE._element("div", "profil-kurzwert");
            feld.appendChild(RANGLISTE._element("span", "profil-kurzwert-zahl", zahl));
            feld.appendChild(RANGLISTE._element("span", "profil-kurzwert-wort", wort));
            kurz.appendChild(feld);
        }
        ort.appendChild(kurz);
        /* Ohne Partie sagt „Partien" darunter schon „Keine Partie" — hier nicht doppelt. */
        if (stat.partien > 0) {
            ort.appendChild(RANGLISTE._bilanzBauen(stat, verlauf));
            RANGLISTE._statistikReiterBauen(ort, staende, stat);
        }
    },

    /* „Partien": die jüngsten aus der Chronik (antippen = Einzelheiten), auf Wunsch alle; im eigenen Profil
       dazu „Vergangene Matches" (Wiederholungen, auch gegen Bob). */
    _verlaufBauen(ort, spielerId, eigen) {
        const staende = RANGLISTE._staende();
        const verlauf = RANGLISTE.verlauf(spielerId, staende.schach);
        if (verlauf.length === 0) {
            /* „Spielen" nur im eigenen Profil — bei anderen hilft es nicht weiter. */
            ort.appendChild(eigen ? RANGLISTE._leerOhnePartie()
                : ZUSTAND.leer({ zeichen: "pokal", text: "Keine Partie" }));
        } else {
            const gezeigt = PROFIL._allePartien ? verlauf : verlauf.slice(0, PROFIL.PARTIEN_ANFANG);
            const liste = RANGLISTE._element("div", "profil-partien");
            for (const eintrag of gezeigt) {
                liste.appendChild(RANGLISTE._verlaufZeileBauen(eintrag, staende));
            }
            ort.appendChild(liste);
            if (gezeigt.length < verlauf.length) {
                ort.appendChild(RANGLISTE._knopf("Alle " + verlauf.length, "knopf-still knopf-klein profil-mehr", () => {
                    PROFIL._allePartien = true;
                    PROFIL.zeichnen();
                }));
            }
        }
        if (eigen) {
            ort.appendChild(RANGLISTE._knopf("Vergangene Matches", "knopf-still knopf-klein profil-verlauf-knopf",
                () => PROFIL.verlaufOeffnen()));
        }
    },

    /* Bei fremden Profilen: die Freundschaft in einer Zeile (RANGLISTE._freundschaftBauen). */
    _freundschaftBauen(spielerId) {
        const staende = RANGLISTE._staende();
        const person = SPIELER.spielerFinden(staende.spieler, spielerId);
        if (!person) {
            return null;
        }
        const fuss = RANGLISTE._element("div", "karte-fuss visitenkarte-fuss");
        RANGLISTE._freundschaftBauen(fuss, person, staende);
        if (!fuss.firstChild) {
            return null;
        }
        const abschnitt = UPCREW_PROFIL.abschnitt("Freunde");
        abschnitt.appendChild(fuss);
        return abschnitt;
    },

    /* „Vergangene Matches" (seit v0.156.1 im Profil): als Blatt über dem Profil. */
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
