/*
 * schach-speicher.js — WAS vom Schach-Stand geholt und geschrieben wird
 * (seit v0.114.3). Lädt nach schach-tafel.js und speicher.js.
 *
 * DAS PROBLEM, GEMESSEN AM 18.09.2026: Der ganze Schach-Stand („die Tafel")
 * ist 192 Kilobyte gross und wächst mit jeder beendeten Partie — 34 der 37
 * Partien waren beendet und wurden trotzdem bei JEDEM Zug mitgeladen und
 * mitgeschrieben. Ein Zug kostete 192 Kilobyte hin und 192 zurück, ein
 * „Bereit" mit Nachkontrolle das Doppelte, und die regelmässige Abfrage
 * holte bei jeder fremden Änderung alles.
 *
 * DIE LÖSUNG IN EINEM SATZ: Geholt wird, was man ansieht; geschrieben, was
 * man geändert hat. Die Datenbank ist ein Baum, jeder Knoten hat seine
 * Adresse (`SpeicherGemeinsam.teilLaden`), und mehrere Knoten lassen sich
 * in EINEM Schritt setzen (`teilSchreiben`, atomar). Der Schach-Stand liegt
 * unverändert unter denselben Pfaden — das ist ein additiver Umbau, kein
 * neues Datenformat:
 *
 *     <pfad>/geaendertAm         die Marke (13 Byte) — wie seit v0.111.0
 *     <pfad>/partien/<id>        eine Partie (~8 KB), wie bisher
 *     <pfad>/chronik/<n>         die Chronik-Einträge, wie bisher
 *     <pfad>/uebersicht/<id>     NEU: je Partie Ergebnis, läuft, Zeitstempel,
 *                                Teams (~150 Byte) — `SCHACH_TAFEL.uebersichtEintrag`
 *
 * Der Übersichts-Knoten ist der Schlüssel: Mit EINER Abfrage (5 Kilobyte bei
 * 34 Partien) weiss der Lader, welche Partien er überhaupt holen muss —
 * fremde beendete NIE (niemand sieht sie an), eigene beendete EINMAL (danach
 * aus dem Gerätespeicher, „der Vorrat"), offene nur, wenn ihr Zeitstempel
 * neuer ist als der zuletzt gesehene. In einer offenen Partie wird bei
 * jeder Marken-Änderung nur ihr eigener Eintrag gefragt (150 Byte) und die
 * Partie nur bei Bedarf geholt (8 KB).
 *
 * WARUM NICHT „NUR DIE LETZTE BEWEGUNG"? Ein Zug ist rund 100 Byte, die
 * Partie 8 Kilobyte — das wäre noch einmal weniger. Dann müsste aber jedes
 * Gerät das Brett aus den Zügen SELBST nachrechnen, und zwei Geräte, die
 * einen Zug verschieden verstehen (Fähigkeit, Lootbox, Zufallswert), hätten
 * zwei Bretter. Genau davor schützt die Hausregel, dass der Stand IN der
 * Partie steht und das Modell ihn schreibt. 8 Kilobyte je Zug sind am Handy
 * ein Augenblick; die Sicherheit, dass alle dasselbe Brett sehen, ist mehr
 * wert als die letzten 7 Kilobyte.
 *
 * ALTBESTAND: Partien ohne Übersichts-Eintrag (aus der Zeit vor v0.114.3)
 * werden einmal geholt und der Eintrag wird nachgetragen — ohne Marke, denn
 * am Inhalt ändert sich nichts. Ein Gerät mit einer ÄLTEREN App-Fassung
 * schreibt weiterhin die ganze Tafel und nimmt dabei den Übersichts-Knoten
 * weg; die nächste neue Fassung baut ihn wieder auf. Das kostet einmal
 * einen vollen Ladevorgang, sonst nichts.
 *
 * Nichts hier kennt den Bildschirm. Wer `speicher` übergibt, gibt eine
 * Rückwand mit `teilLaden` und `teilSchreiben` (SpeicherGemeinsam oder ein
 * Nachbau im Test).
 */

const SCHACH_SPEICHER = {

    /* Der Vorrat: eigene beendete Partien im Gerätespeicher, je Kennung
       { marke, partie }. Beendete Partien ändern sich nur noch durch eine
       Revanche — und die ändert die Marke, dann wird neu geholt. */
    VORRAT_SCHLUESSEL: "blunderluck.partien-vorrat",

    /* So viele eigene beendete Partien werden höchstens geladen und
       gemerkt (die jüngsten zuerst). Ältere zeigt der Verlauf nicht mehr —
       sonst wüchse der erste Ladevorgang eines neuen Geräts mit jeder
       Partie, die man je gespielt hat. Der Gerätespeicher fasst rund
       5 Megabyte; 60 Partien sind etwa 500 Kilobyte. */
    VORRAT_HOECHSTENS: 60,

    /* Zeitstempel je Partie, mit dem sie zuletzt geholt oder geschrieben
       wurde — der Vergleichswert gegen `uebersicht/<id>/geaendertAm`. Lebt
       nur, solange die Seite offen ist; nach einem Neuladen wird jede
       offene Partie einmal geholt. */
    _gesehen: {},

    /* Wie viele Chronik-Einträge der Server beim letzten Blick hatte.
       `null` heisst „noch nie geschaut" — dann wird die Chronik geholt. */
    _chronikAnzahlGesehen: null,

    /*
     * DIE CHRONIK STÜCKWEISE (seit v0.152.5). Bis dahin kam bei jeder
     * neuen Anzahl die GANZE Chronik (9 Kilobyte bei 60 Einträgen, und sie
     * wächst mit jeder Partie, die je gespielt wurde). Jetzt liegt sie
     * zusätzlich im Gerätespeicher, je Nummer ein Eintrag, und geholt
     * werden nur die Nummern, die dort fehlen — einzeln, solange es
     * höchstens CHRONIK_EINZELN_HOECHSTENS sind, sonst (erster Start, lange
     * nicht da gewesen) einmal ganz. Ein Eintrag ändert sich nach dem
     * Schreiben nie mehr; deshalb genügt die Nummer als Vergleich.
     */
    CHRONIK_VORRAT_SCHLUESSEL: "blunderluck.chronik-vorrat",
    CHRONIK_EINZELN_HOECHSTENS: 20,

    /*
     * BEENDETE PARTIEN AUFRÄUMEN (seit v0.152.5, Nutzer-Auftrag 28.09.2026).
     * Jede beendete Partie blieb bisher für immer auf dem Server — die
     * Übersicht, die jeder Blick auf den Start holt, wuchs mit jeder.
     * Gelöscht werden `partien/<id>` und `uebersicht/<id>`, wenn die Partie
     *
     *   - beendet und mindestens MINDEST_TAGE alt ist (letztes Schreiben),
     *   - ihr Chronik-Eintrag auf dem Server steht (die Rangliste zählt
     *     aus der Chronik — die Punkte bleiben also),
     *   - und alle Menschen darin gebucht haben (`uebersicht/<id>/gebucht/
     *     <personId>`, geschrieben von `gebuchtMelden`) — oder sie
     *     mindestens HOECHST_TAGE alt ist.
     *
     * DIE HARTE GRENZE IST EBENFALLS 7 TAGE (Nutzer-Entscheid 28.09.2026 im
     * Auftrag: „Nach 7 Tagen wird also gelöscht, auch wenn noch nicht alle
     * gebucht haben. Wer die App 7 Tage nicht öffnet, bekommt XP und Münzen
     * dieser Partie nicht mehr. Das ist so gewollt.") — mit beiden Werten
     * gleich entscheidet heute allein das Alter. `gebucht` wird trotzdem
     * geschrieben und geprüft: für später (eine längere harte Grenze ist
     * dann nur diese eine Zahl) und für die Anzeige.
     *
     * Das erledigt jedes Gerät nebenbei beim Laden der Tafel: höchstens
     * JE_LAUF Partien, höchstens einmal je ABSTAND_MS. Jedes Gerät räumt
     * nur Partien, in denen seine Person sass — die Verwaltung alle; so
     * passt es schon zur kommenden Regel §12 (SICHERHEIT.md). Löschen,
     * kein Archiv; die eigenen behält der Vorrat auf dem Gerät.
     */
    AUFRAEUMEN: {
        MINDEST_TAGE: 7,
        HOECHST_TAGE: 7,
        JE_LAUF: 10,
        ABSTAND_MS: 60 * 60 * 1000,
        SCHLUESSEL: "blunderluck.aufraeumen-zuletzt"
    },

    /* Die Kennungen aller nicht beendeten Partien beim letzten Laden der
       Tafel — auch der fremden laufenden, die seit v0.152.5 nicht mehr
       geholt werden. Der Beitritt über den Code braucht nur die Kennung
       (`idZuCode`); die Partie holt er dann selbst. */
    _offeneKennungen: [],

    /* Das zuletzt angestossene Aufräumen — für Tests, die darauf warten. */
    _aufraeumenLaeuft: null,

    /* Wann zuletzt aufgeräumt wurde, falls der Gerätespeicher fehlt. */
    _aufraeumenZuletzt: null,

    /* ---------------------------------------------------------------- *
     * Holen
     * ---------------------------------------------------------------- */

    /* Eine Partie frisch vom Server, normalisiert — oder `null`, wenn es
       sie dort nicht (mehr) gibt. */
    async partieLaden(speicher, id) {
        const roh = await speicher.teilLaden("partien/" + id);
        if (!roh || typeof roh !== "object") {
            return null;
        }
        const partie = SCHACH_RUNDE.normalisieren(roh);
        partie.id = id;
        return partie;
    },

    /*
     * DIE OFFENE PARTIE AUFFRISCHEN — der Weg der regelmässigen Abfrage,
     * solange eine Partie offen ist. Erst der Übersichts-Eintrag (150
     * Byte): Ist sein Zeitstempel der zuletzt gesehene, hat sich an DIESER
     * Partie nichts geändert (die Marke ging wegen einer anderen hoch), und
     * es wird nichts geholt. Sonst die Partie (8 KB), in die bisherige
     * Tafel gesetzt. Ist sie weg, wird sie auch hier entfernt.
     *
     * Liefert immer eine Tafel — die bisherige, wenn nichts zu tun war.
     */
    async partieAuffrischen(speicher, tafelBisher, id) {
        const bisher = SCHACH_TAFEL.normalisieren(tafelBisher);

        /* Seit v0.152.5 nur der Zeitstempel des Eintrags (13 Byte statt
           des ganzen Eintrags mit Teams und Einladungen) — mehr braucht
           der Vergleich nicht. */
        const markeRoh = await speicher.teilLaden("uebersicht/" + id + "/geaendertAm");
        const marke = SCHACH_SPEICHER._markeVon({ geaendertAm: markeRoh });

        if (marke !== null && bisher.partien[id]
                && SCHACH_SPEICHER._gesehen[id] === marke) {
            return bisher;
        }

        const partie = await SCHACH_SPEICHER.partieLaden(speicher, id);
        if (!partie) {
            delete SCHACH_SPEICHER._gesehen[id];
            return SCHACH_TAFEL.partieEntfernen(bisher, id, bisher.geaendertAm);
        }

        SCHACH_SPEICHER._gesehen[id] = (marke !== null) ? marke : (partie.geaendertAm || 0);
        return SCHACH_TAFEL.partieEinsetzen(bisher, partie, bisher.geaendertAm);
    },

    /*
     * DIE TAFEL LADEN — beim Start und immer, wenn keine Partie offen ist.
     *
     * Drei kleine Abfragen auf einmal: die Übersicht, die Schlüsselliste der
     * Partien (welche gibt es überhaupt) und die Schlüssel der Chronik (wie
     * viele Einträge). Daraus ergibt sich, was zu holen ist:
     *
     *   - fremde beendete Partien: nie;
     *   - eigene beendete: aus dem Vorrat, wenn die Marke stimmt, sonst
     *     einmal holen und merken — höchstens VORRAT_HOECHSTENS, die
     *     jüngsten;
     *   - offene: aus der bisherigen Tafel, wenn die Marke die zuletzt
     *     gesehene ist, sonst holen — seit v0.152.5 aber FREMDE LAUFENDE
     *     nicht mehr (niemand zeigt sie an; siehe unten);
     *   - Partien ohne Übersichts-Eintrag (Altbestand): holen, Eintrag
     *     nachtragen;
     *   - die Chronik: nur, wenn sich die Anzahl der Einträge geändert hat,
     *     und seit v0.152.5 nur die neuen Einträge (`_chronikAbgleichen`).
     *
     * `personId` darf leer sein (vor der Anmeldung) — dann gibt es keine
     * eigenen beendeten Partien; die Anmeldung stösst danach ein volles
     * Nachladen an (`Abgleich.vollNachladen`).
     *
     * `optionen` (seit v0.152.5, alles freiwillig):
     *   verwaltung — die Verwaltung ist aktiv: auch fremde laufende
     *                Partien holen (sie zeigt sie zum Löschen) und beim
     *                Aufräumen alle Partien betrachten;
     *   jetzt      — die Uhr (Tests);
     *   aufraeumen — false schaltet das Aufräumen für diesen Lauf ab.
     */
    async tafelLaden(speicher, personId, tafelBisher, optionen) {
        const einstellung = optionen || {};
        const bisher = SCHACH_TAFEL.normalisieren(tafelBisher);

        const [uebersichtRoh, schluesselRoh, chronikSchluesselRoh] = await Promise.all([
            speicher.teilLaden("uebersicht"),
            speicher.teilLaden("partien", true),
            speicher.teilLaden("chronik", true)
        ]);

        const uebersicht = SCHACH_SPEICHER._objekt(uebersichtRoh);
        const ids = Object.keys(SCHACH_SPEICHER._objekt(schluesselRoh));
        const chronikAnzahl = SCHACH_SPEICHER._chronikListe(chronikSchluesselRoh).length;

        /* Die Chronik nur bei geänderter Anzahl — und dann nur, was fehlt. */
        let chronik = bisher.chronik;
        if (SCHACH_SPEICHER._chronikAnzahlGesehen !== chronikAnzahl
                || bisher.chronik.length !== chronikAnzahl) {
            const liste = await SCHACH_SPEICHER._chronikAbgleichen(speicher, chronikSchluesselRoh);
            chronik = SCHACH_TAFEL.normalisieren({ chronik: liste }).chronik;
            SCHACH_SPEICHER._chronikAnzahlGesehen = chronikAnzahl;
        }

        const vorrat = SCHACH_SPEICHER._vorratLesen();
        const partien = {};
        const zuHolen = [];
        const eigeneBeendete = [];
        const offeneKennungen = [];

        for (const id of ids) {
            const eintrag = uebersicht[id];
            const marke = SCHACH_SPEICHER._markeVon(eintrag);

            /* Altbestand ohne Eintrag: holen, danach weiss man mehr. */
            if (marke === null) {
                zuHolen.push(id);
                offeneKennungen.push(id);
                continue;
            }

            const beendet = !!eintrag.ergebnis;
            const eigene = SCHACH_SPEICHER._sitztDarin(eintrag, personId);

            if (beendet) {
                if (eigene) {
                    eigeneBeendete.push({ id: id, marke: marke });
                }
                continue;
            }

            offeneKennungen.push(id);

            /*
             * FREMDE LAUFENDE PARTIEN NICHT MEHR HOLEN (seit v0.152.5).
             * Sie zeigt niemand an: Die Übersicht listet wartende Runden
             * und Einladungen, der Start nur die eigene. Jede fremde
             * laufende Partie kostete aber bei jedem ihrer Züge 8 Kilobyte
             * auf JEDEM Gerät, das auf dem Start stand. Geholt werden
             * weiter: eigene, wartende (nicht laufend), solche mit einer
             * Einladung an mich, Einträge einer älteren Fassung ohne
             * Einladungsliste (wie bisher, sicher ist sicher) — und alle,
             * wenn die Verwaltung aktiv ist. Der Code-Beitritt in eine
             * laufende Runde findet die Kennung über `idZuCode`.
             */
            if (eintrag.laeuft === true && !eigene && !einstellung.verwaltung
                    && !SCHACH_SPEICHER._vielleichtEingeladen(eintrag, personId)) {
                delete SCHACH_SPEICHER._gesehen[id];
                continue;
            }

            if (bisher.partien[id] && SCHACH_SPEICHER._gesehen[id] === marke) {
                partien[id] = bisher.partien[id];
            } else {
                zuHolen.push(id);
            }
        }

        /* Die eigenen beendeten: jüngste zuerst, mehr als der Vorrat fasst
           wird gar nicht erst geladen. */
        eigeneBeendete.sort((a, b) => b.marke - a.marke);
        for (const kandidat of eigeneBeendete.slice(0, SCHACH_SPEICHER.VORRAT_HOECHSTENS)) {
            const gemerkt = vorrat[kandidat.id];
            if (gemerkt && gemerkt.marke === kandidat.marke && gemerkt.partie) {
                partien[kandidat.id] = gemerkt.partie;
                SCHACH_SPEICHER._gesehen[kandidat.id] = kandidat.marke;
            } else if (bisher.partien[kandidat.id]
                    && SCHACH_SPEICHER._gesehen[kandidat.id] === kandidat.marke) {
                partien[kandidat.id] = bisher.partien[kandidat.id];
            } else {
                zuHolen.push(kandidat.id);
            }
        }

        const geholt = await Promise.all(
            zuHolen.map((id) => SCHACH_SPEICHER.partieLaden(speicher, id)));

        const nachtragen = {};
        let vorratGeaendert = false;

        zuHolen.forEach((id, stelle) => {
            const partie = geholt[stelle];
            if (!partie) {
                /* Zwischen Schlüsselliste und Holen verschwunden — dann
                   gehört sie auch nicht mehr in die Tafel. */
                return;
            }
            partien[id] = partie;

            const eintrag = uebersicht[id];
            const marke = SCHACH_SPEICHER._markeVon(eintrag);
            const gesehen = (marke !== null) ? marke : (partie.geaendertAm || 0);
            SCHACH_SPEICHER._gesehen[id] = gesehen;

            if (marke === null) {
                nachtragen["uebersicht/" + id] = SCHACH_TAFEL.uebersichtEintrag(partie, gesehen);
            }

            if (partie.ergebnis && personId && SCHACH_RUNDE.teamVon(partie, personId)) {
                vorrat[id] = { marke: gesehen, partie: partie };
                vorratGeaendert = true;
            }
        });

        /*
         * Den Vorrat auf das kürzen, was gerade gebraucht wird — und nur
         * schreiben, wenn sich etwas getan hat.
         *
         * SEIT v0.152.5 BEHÄLT ER EIGENE PARTIEN, DIE AUF DEM SERVER
         * GELÖSCHT SIND (Aufräumen, siehe `aufraeumen`): Sie bleiben im
         * Verlauf dieses Geräts, solange sie zu den VORRAT_HOECHSTENS
         * jüngsten gehören. Gezeigt werden sie nur der Person, die darin
         * sass — ein anderer, der sich an diesem Gerät anmeldet, sieht sie
         * nicht, sie bleiben aber für den Besitzer liegen.
         */
        const aufServer = {};
        ids.forEach((id) => { aufServer[id] = true; });
        for (const id of Object.keys(vorrat)) {
            const gemerkt = vorrat[id];
            if (!aufServer[id]) {
                if (!gemerkt || !gemerkt.partie || !gemerkt.partie.ergebnis) {
                    delete vorrat[id];
                    vorratGeaendert = true;
                } else if (personId && !partien[id]
                        && SCHACH_RUNDE.teamVon(gemerkt.partie, personId)) {
                    partien[id] = gemerkt.partie;
                }
                continue;
            }
            if (!partien[id] || !partien[id].ergebnis) {
                delete vorrat[id];
                vorratGeaendert = true;
            }
        }
        const zuViele = Object.keys(vorrat)
            .sort((a, b) => (vorrat[b].marke || 0) - (vorrat[a].marke || 0))
            .slice(SCHACH_SPEICHER.VORRAT_HOECHSTENS);
        for (const id of zuViele) {
            delete vorrat[id];
            if (!aufServer[id]) {
                delete partien[id];
            }
            vorratGeaendert = true;
        }
        if (vorratGeaendert) {
            SCHACH_SPEICHER._vorratSchreiben(vorrat);
        }

        SCHACH_SPEICHER._offeneKennungen = offeneKennungen;

        /* Nebenbei aufräumen (seit v0.152.5) — nicht abgewartet: Ein
           Fehler oder eine abweisende Regel kostet nur, dass es später
           noch einmal versucht wird. */
        if (personId && einstellung.aufraeumen !== false
                && typeof speicher.teilSchreiben === "function") {
            SCHACH_SPEICHER._aufraeumenLaeuft = SCHACH_SPEICHER.aufraeumen(
                speicher, uebersicht, chronik, personId, {
                    verwaltung: !!einstellung.verwaltung,
                    jetzt: einstellung.jetzt
                }).catch((fehler) => {
                console.warn("Aufräumen übersprungen:", fehler);
                return [];
            });
        }

        /* Fehlende Übersichts-Einträge nachtragen — im Hintergrund, ohne
           Marke; ein Fehler dabei kostet nur, dass es beim nächsten Mal
           noch einmal versucht wird. */
        if (Object.keys(nachtragen).length > 0) {
            speicher.teilSchreiben(nachtragen).catch((fehler) => {
                console.warn("Übersicht nicht nachgetragen:", fehler);
            });
        }

        return SCHACH_TAFEL.normalisieren({
            datenVersion: bisher.datenVersion,
            geaendertAm: bisher.geaendertAm,
            partien: partien,
            chronik: chronik
        });
    },

    /* ---------------------------------------------------------------- *
     * Schreiben
     * ---------------------------------------------------------------- */

    /*
     * DIE GENANNTEN PARTIEN SCHREIBEN — und sonst nichts. Für jede Kennung
     * gehen die Partie (oder `null`, wenn sie in der Tafel fehlt: dann
     * wird sie gelöscht), ihr Übersichts-Eintrag und die Marke der Tafel
     * in EINE Mehrpfad-Änderung. Die Datenbank setzt alles zusammen oder
     * nichts.
     *
     * Ist eine der Partien beendet, kommt ihr Chronik-Eintrag ans Ende der
     * Chronik AUF DEM SERVER — vorher wird nachgesehen, ob er dort schon
     * steht (die Chronik ist klein, und ein Ergebnis darf nie zweimal
     * zählen). Die Stelle ist die nächste freie Nummer; zwei Partien, die
     * in derselben Sekunde auf zwei Geräten enden, könnten sich diese
     * Nummer streitig machen — das ist der eine Rest, den eine
     * Schnittstelle ohne Transaktion lässt, und er ist so selten wie zwei
     * gleichzeitige Matts.
     *
     * Die Marke ist `tafel.geaendertAm` — `partieEinsetzen` und
     * `partieEntfernen` haben sie eben auf „jetzt" gesetzt.
     */
    async schreiben(speicher, tafelRoh, partieIds) {
        const tafel = SCHACH_TAFEL.normalisieren(tafelRoh);
        const marke = tafel.geaendertAm || Date.now();
        const aenderungen = { geaendertAm: marke };
        const beendete = [];

        for (const id of partieIds) {
            const partie = tafel.partien[id] || null;
            aenderungen["partien/" + id] = partie;
            aenderungen["uebersicht/" + id] = partie
                ? SCHACH_TAFEL.uebersichtEintrag(partie, marke)
                : null;
            if (partie && partie.ergebnis) {
                beendete.push(partie);
            }
        }

        if (beendete.length > 0) {
            /* Seit v0.152.5 die Schlüssel und nur die fehlenden Einträge
               (`_chronikAbgleichen`) — die Liste ist danach genauso
               vollständig wie die ganze Chronik, die bis dahin kam. */
            const schluessel = await speicher.teilLaden("chronik", true);
            const liste = await SCHACH_SPEICHER._chronikAbgleichen(speicher, schluessel);
            let naechste = SCHACH_SPEICHER._chronikNaechsteStelle(schluessel);

            for (const partie of beendete) {
                if (liste.some((eintrag) => eintrag && eintrag.id === partie.id)) {
                    continue;
                }
                const eintrag = tafel.chronik.find((e) => e.id === partie.id)
                    || SCHACH_TAFEL._chronikEintrag(partie);
                aenderungen["chronik/" + naechste] = eintrag;
                naechste++;
            }
        }

        await speicher.teilSchreiben(aenderungen);

        for (const id of partieIds) {
            if (tafel.partien[id]) {
                SCHACH_SPEICHER._gesehen[id] = marke;
            } else {
                delete SCHACH_SPEICHER._gesehen[id];
            }
        }
    },

    /* ---------------------------------------------------------------- *
     * Aufräumen und Buchung (seit v0.152.5)
     * ---------------------------------------------------------------- */

    /*
     * „ICH HABE GEBUCHT" — nach der eigenen Buchung einer beendeten Partie
     * (XP, Münzen, Turm; `TEAM_SCHACH._buchen`). Ein einzelner Pfad unter
     * dem Übersichts-Eintrag, ohne Marke: Am Inhalt der Partie ändert sich
     * nichts, und niemand muss deshalb neu laden. Wird die Partie später
     * noch einmal geschrieben, ersetzt ihr neuer Übersichts-Eintrag auch
     * diesen Merker — dann greift beim Aufräumen die HOECHST_TAGE-Frist
     * (heute ohnehin dieselben 7 Tage).
     * Wirft nie; ein Fehler kostet nur, dass die Partie länger liegt.
     */
    async gebuchtMelden(speicher, partieId, personId, jetzt) {
        if (!speicher || speicher.art !== "gemeinsam"
                || typeof speicher.teilSchreiben !== "function"
                || !partieId || !personId) {
            return false;
        }
        const aenderungen = {};
        aenderungen["uebersicht/" + partieId + "/gebucht/" + personId] =
            (jetzt === undefined) ? Date.now() : jetzt;
        try {
            await speicher.teilSchreiben(aenderungen);
            return true;
        } catch (fehler) {
            console.warn("Buchung nicht gemeldet:", fehler);
            return false;
        }
    },

    /*
     * BEENDETE PARTIEN LÖSCHEN — die Regeln stehen oben bei AUFRAEUMEN.
     * `uebersicht` ist der Übersichts-Knoten wie eben geladen, `chronik` die
     * Chronik als Liste (vollständig, `_chronikAbgleichen`). Liefert die
     * Kennungen, die gelöscht wurden (leer, wenn nichts zu tun war oder die
     * Stunde noch nicht um ist).
     *
     * `optionen`: verwaltung (alle Partien statt nur der eigenen), jetzt
     * (die Uhr), ohneSperre (die Stunden-Sperre überspringen — Tests).
     */
    async aufraeumen(speicher, uebersichtRoh, chronik, personId, optionen) {
        const einstellung = optionen || {};
        const regel = SCHACH_SPEICHER.AUFRAEUMEN;
        const jetzt = (typeof einstellung.jetzt === "number") ? einstellung.jetzt : Date.now();
        const tag = 24 * 60 * 60 * 1000;

        if (!personId || !speicher || typeof speicher.teilSchreiben !== "function") {
            return [];
        }

        if (!einstellung.ohneSperre) {
            /* Gerätespeicher, und als Rückfall die offene Seite. */
            const gemerkt = SCHACH_SPEICHER._zahlLesen(regel.SCHLUESSEL);
            const zuletzt = (gemerkt !== null) ? gemerkt : SCHACH_SPEICHER._aufraeumenZuletzt;
            if (zuletzt !== null && jetzt - zuletzt < regel.ABSTAND_MS && jetzt >= zuletzt) {
                return [];
            }
            /* VOR der Arbeit merken: Scheitert sie, wird es trotzdem erst
               in einer Stunde wieder versucht, nicht bei jedem Blick. */
            SCHACH_SPEICHER._aufraeumenZuletzt = jetzt;
            SCHACH_SPEICHER._zahlSchreiben(regel.SCHLUESSEL, jetzt);
        }

        const inChronik = {};
        (Array.isArray(chronik) ? chronik : []).forEach((eintrag) => {
            if (eintrag && eintrag.id) {
                inChronik[eintrag.id] = true;
            }
        });

        const uebersicht = SCHACH_SPEICHER._objekt(uebersichtRoh);
        const kandidaten = [];

        for (const id of Object.keys(uebersicht)) {
            const eintrag = uebersicht[id];
            const marke = SCHACH_SPEICHER._markeVon(eintrag);
            if (marke === null || !eintrag.ergebnis || !inChronik[id]) {
                continue;
            }
            const alter = jetzt - marke;
            if (alter < regel.MINDEST_TAGE * tag) {
                continue;
            }

            const menschen = SCHACH_SPEICHER._menschen(eintrag);
            if (!einstellung.verwaltung && menschen.indexOf(personId) === -1) {
                continue;
            }

            const gebucht = SCHACH_SPEICHER._objekt(eintrag.gebucht);
            const alleGebucht = menschen.length > 0
                && menschen.every((mensch) => !!gebucht[mensch]);
            if (!alleGebucht && alter < regel.HOECHST_TAGE * tag) {
                continue;
            }
            kandidaten.push({ id: id, marke: marke });
        }

        /* Die ältesten zuerst — sie liegen am längsten. */
        kandidaten.sort((a, b) => a.marke - b.marke);
        const weg = kandidaten.slice(0, regel.JE_LAUF).map((k) => k.id);
        if (weg.length === 0) {
            return [];
        }

        const aenderungen = {};
        for (const id of weg) {
            aenderungen["partien/" + id] = null;
            aenderungen["uebersicht/" + id] = null;
        }
        await speicher.teilSchreiben(aenderungen);
        weg.forEach((id) => { delete SCHACH_SPEICHER._gesehen[id]; });
        return weg;
    },

    /* ---------------------------------------------------------------- *
     * Takt und Code (seit v0.152.5)
     * ---------------------------------------------------------------- */

    /*
     * WIE OFT SOLL GEFRAGT WERDEN? `partie` ist die offene Partie (oder
     * null), `takte` die Tabelle `KONFIG.speicher.abfrageTaktMs`:
     *
     *   keine Partie offen                    → start
     *   eigene Runde wartet (weder läuft noch beendet) → vorraum
     *   gegen Bob, höchstens ein Mensch darin → bob
     *   sonst (Menschen, auch im Abschluss)   → partie
     *
     * Liefert eine Zahl oder undefined (dann fragt der Abgleich bei jedem
     * Grundtakt, wie vor v0.152.5).
     */
    abfrageTakt(partie, takte) {
        const tabelle = takte || {};
        if (!partie) {
            return tabelle.start;
        }
        if (!partie.ergebnis && partie.laeuft !== true) {
            return tabelle.vorraum;
        }
        const menschen = SCHACH_SPEICHER._menschen(partie);
        const mitBob = SCHACH_SPEICHER._teamsListe(partie)
            .some((id) => !SCHACH_SPEICHER._istMensch(id));
        if (mitBob && menschen.length <= 1) {
            return tabelle.bob;
        }
        return tabelle.partie;
    },

    /*
     * DIE KENNUNG ZU EINEM BEITRITTS-CODE — auch einer Partie, die nicht
     * geladen ist (fremde laufende, seit v0.152.5). Der Code wird aus der
     * Kennung gerechnet (`SCHACH_RUNDE.beitrittsCode`); gesucht wird unter
     * den nicht beendeten Partien vom letzten Laden der Tafel.
     */
    idZuCode(code) {
        const gesucht = String(code || "").replace(/\s/g, "").toUpperCase();
        if (gesucht.length !== SCHACH_RUNDE.CODE_LAENGE) {
            return null;
        }
        return SCHACH_SPEICHER._offeneKennungen.find((id) =>
            SCHACH_RUNDE.beitrittsCode(id) === gesucht) || null;
    },

    /* ---------------------------------------------------------------- *
     * Helfer
     * ---------------------------------------------------------------- */

    /* Könnte die Person in dieser (fremden) Partie eingeladen sein? Ein
       Eintrag ohne `mitEinladungen` stammt von einer älteren Fassung und
       sagt es nicht — dann ja, wie bisher holen. */
    _vielleichtEingeladen(eintrag, personId) {
        if (!eintrag || eintrag.mitEinladungen !== true) {
            return true;
        }
        return !!personId && Array.isArray(eintrag.eingeladen)
            && eintrag.eingeladen.indexOf(personId) !== -1;
    },

    /* Alle Kennungen in den Teams (Partie oder Übersichts-Eintrag). */
    _teamsListe(etwas) {
        const teams = (etwas && etwas.teams) || {};
        return ["weiss", "schwarz"].reduce((liste, farbe) =>
            liste.concat(Array.isArray(teams[farbe]) ? teams[farbe] : []), []);
    },

    /* Ist die Kennung ein Mensch? Bob fragt `SCHACH_BOT`, wenn geladen. */
    _istMensch(id) {
        if (!id) {
            return false;
        }
        if (typeof SCHACH_BOT !== "undefined" && typeof SCHACH_BOT.istBot === "function") {
            return !SCHACH_BOT.istBot(id);
        }
        return id !== "bot";
    },

    /* Die Menschen einer Partie, jeder einmal. */
    _menschen(etwas) {
        const gesehen = {};
        return SCHACH_SPEICHER._teamsListe(etwas).filter((id) => {
            if (!SCHACH_SPEICHER._istMensch(id) || gesehen[id]) {
                return false;
            }
            gesehen[id] = true;
            return true;
        });
    },

    /*
     * DIE CHRONIK AUF STAND BRINGEN — aus dem Gerätespeicher, und nur die
     * fehlenden Nummern vom Server (siehe CHRONIK_VORRAT_SCHLUESSEL).
     * `schluesselRoh` ist die flache Abfrage `chronik?shallow=true`.
     * Liefert die Einträge nach Nummer geordnet.
     */
    async _chronikAbgleichen(speicher, schluesselRoh) {
        const nummern = Object.keys(SCHACH_SPEICHER._objekt(
            Array.isArray(schluesselRoh) ? Object.assign({}, schluesselRoh) : schluesselRoh))
            .filter((schluessel) => !isNaN(parseInt(schluessel, 10)));
        const vorrat = SCHACH_SPEICHER._chronikVorratLesen();
        const fehlend = nummern.filter((nummer) => !vorrat[nummer]);
        let geaendert = false;

        if (fehlend.length > 0) {
            if (Object.keys(vorrat).length === 0
                    || fehlend.length > SCHACH_SPEICHER.CHRONIK_EINZELN_HOECHSTENS) {
                /* Erster Blick oder lange weg: einmal ganz. */
                const roh = await speicher.teilLaden("chronik");
                const ganz = Array.isArray(roh) ? Object.assign({}, roh) : SCHACH_SPEICHER._objekt(roh);
                for (const nummer of nummern) {
                    if (ganz[nummer]) {
                        vorrat[nummer] = ganz[nummer];
                    }
                }
            } else {
                const geholt = await Promise.all(fehlend.map((nummer) =>
                    speicher.teilLaden("chronik/" + nummer)));
                fehlend.forEach((nummer, stelle) => {
                    if (geholt[stelle] && typeof geholt[stelle] === "object") {
                        vorrat[nummer] = geholt[stelle];
                    }
                });
            }
            geaendert = true;
        }

        /* Was der Server nicht mehr hat, fliegt auch hier raus. */
        const daSind = {};
        nummern.forEach((nummer) => { daSind[nummer] = true; });
        for (const nummer of Object.keys(vorrat)) {
            if (!daSind[nummer]) {
                delete vorrat[nummer];
                geaendert = true;
            }
        }
        if (geaendert) {
            SCHACH_SPEICHER._chronikVorratSchreiben(vorrat);
        }

        return nummern
            .slice()
            .sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
            .map((nummer) => vorrat[nummer])
            .filter((eintrag) => !!eintrag);
    },

    _chronikVorratLesen() {
        try {
            const text = window.localStorage.getItem(SCHACH_SPEICHER.CHRONIK_VORRAT_SCHLUESSEL);
            return SCHACH_SPEICHER._objekt(text ? JSON.parse(text) : null);
        } catch (fehler) {
            return {};
        }
    },

    _chronikVorratSchreiben(vorrat) {
        try {
            window.localStorage.setItem(
                SCHACH_SPEICHER.CHRONIK_VORRAT_SCHLUESSEL, JSON.stringify(vorrat));
        } catch (fehler) {
            console.warn("Chronik-Vorrat nicht gespeichert:", fehler);
        }
    },

    _zahlLesen(schluessel) {
        try {
            const zahl = parseInt(window.localStorage.getItem(schluessel), 10);
            return isNaN(zahl) ? null : zahl;
        } catch (fehler) {
            return null;
        }
    },

    _zahlSchreiben(schluessel, zahl) {
        try {
            window.localStorage.setItem(schluessel, String(zahl));
        } catch (fehler) {
            /* Ohne Gerätespeicher gilt die Sperre nur, solange die Seite offen ist. */
        }
    },

    _objekt(roh) {
        return (roh && typeof roh === "object" && !Array.isArray(roh)) ? roh : {};
    },

    /* Der Zeitstempel eines Übersichts-Eintrags, oder `null` ohne Eintrag. */
    _markeVon(eintrag) {
        if (!eintrag || typeof eintrag !== "object") {
            return null;
        }
        return (typeof eintrag.geaendertAm === "number" && isFinite(eintrag.geaendertAm))
            ? eintrag.geaendertAm : null;
    },

    /* Steht die Person in einem der Teams des Übersichts-Eintrags? */
    _sitztDarin(eintrag, personId) {
        if (!personId || !eintrag || !eintrag.teams) {
            return false;
        }
        return ["weiss", "schwarz"].some((farbe) =>
            Array.isArray(eintrag.teams[farbe])
            && eintrag.teams[farbe].indexOf(personId) !== -1);
    },

    /* Die Chronik vom Server als Liste — sie kommt als Feld, kann aber
       (mit Lücken) auch als Objekt mit Nummern-Schlüsseln kommen. */
    _chronikListe(roh) {
        if (Array.isArray(roh)) {
            return roh;
        }
        const objekt = SCHACH_SPEICHER._objekt(roh);
        return Object.keys(objekt).map((schluessel) => objekt[schluessel]);
    },

    /* Die nächste freie Nummer in der Chronik: hinter der grössten. */
    _chronikNaechsteStelle(roh) {
        if (Array.isArray(roh)) {
            return roh.length;
        }
        const nummern = Object.keys(SCHACH_SPEICHER._objekt(roh))
            .map((schluessel) => parseInt(schluessel, 10))
            .filter((nummer) => !isNaN(nummer));
        return nummern.length > 0 ? Math.max.apply(null, nummern) + 1 : 0;
    },

    /* Der Vorrat im Gerätespeicher — jeder Zugriff abgesichert: Ein
       gesperrter oder voller Speicher darf die App nicht anhalten. */
    _vorratLesen() {
        try {
            const text = window.localStorage.getItem(SCHACH_SPEICHER.VORRAT_SCHLUESSEL);
            const roh = text ? JSON.parse(text) : null;
            return SCHACH_SPEICHER._objekt(roh);
        } catch (fehler) {
            return {};
        }
    },

    _vorratSchreiben(vorrat) {
        try {
            window.localStorage.setItem(
                SCHACH_SPEICHER.VORRAT_SCHLUESSEL, JSON.stringify(vorrat));
        } catch (fehler) {
            console.warn("Vorrat nicht gespeichert:", fehler);
        }
    },

    /* Für Tests und die Abmeldung: alles vergessen, was gemerkt wurde. */
    vergessen() {
        SCHACH_SPEICHER._gesehen = {};
        SCHACH_SPEICHER._chronikAnzahlGesehen = null;
        SCHACH_SPEICHER._offeneKennungen = [];
        SCHACH_SPEICHER._aufraeumenZuletzt = null;
        try {
            window.localStorage.removeItem(SCHACH_SPEICHER.VORRAT_SCHLUESSEL);
            window.localStorage.removeItem(SCHACH_SPEICHER.CHRONIK_VORRAT_SCHLUESSEL);
            window.localStorage.removeItem(SCHACH_SPEICHER.AUFRAEUMEN.SCHLUESSEL);
        } catch (fehler) {
            /* Ohne Gerätespeicher gibt es nichts zu vergessen. */
        }
    }
};

/* Für die Tests ausserhalb des Browsers. SCHACH_TAFEL und SCHACH_RUNDE
   müssen dort vorher als globale Grössen bereitstehen. */
if (typeof module !== "undefined" && module.exports) {
    module.exports = SCHACH_SPEICHER;
}
