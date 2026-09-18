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
        const eintrag = await speicher.teilLaden("uebersicht/" + id);
        const marke = SCHACH_SPEICHER._markeVon(eintrag);

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
     *     gesehene ist, sonst holen;
     *   - Partien ohne Übersichts-Eintrag (Altbestand): holen, Eintrag
     *     nachtragen;
     *   - die Chronik: nur, wenn sich die Anzahl der Einträge geändert hat.
     *
     * `personId` darf leer sein (vor der Anmeldung) — dann gibt es keine
     * eigenen beendeten Partien; die Anmeldung stösst danach ein volles
     * Nachladen an (`Abgleich.vollNachladen`).
     */
    async tafelLaden(speicher, personId, tafelBisher) {
        const bisher = SCHACH_TAFEL.normalisieren(tafelBisher);

        const [uebersichtRoh, schluesselRoh, chronikSchluesselRoh] = await Promise.all([
            speicher.teilLaden("uebersicht"),
            speicher.teilLaden("partien", true),
            speicher.teilLaden("chronik", true)
        ]);

        const uebersicht = SCHACH_SPEICHER._objekt(uebersichtRoh);
        const ids = Object.keys(SCHACH_SPEICHER._objekt(schluesselRoh));
        const chronikAnzahl = SCHACH_SPEICHER._chronikListe(chronikSchluesselRoh).length;

        /* Die Chronik nur bei geänderter Anzahl — 9 Kilobyte, die sich
           sonst bei jedem Blick wiederholten. */
        let chronik = bisher.chronik;
        if (SCHACH_SPEICHER._chronikAnzahlGesehen !== chronikAnzahl) {
            const roh = await speicher.teilLaden("chronik");
            chronik = SCHACH_TAFEL.normalisieren(
                { chronik: SCHACH_SPEICHER._chronikListe(roh) }).chronik;
            SCHACH_SPEICHER._chronikAnzahlGesehen = chronikAnzahl;
        }

        const vorrat = SCHACH_SPEICHER._vorratLesen();
        const partien = {};
        const zuHolen = [];
        const eigeneBeendete = [];

        for (const id of ids) {
            const eintrag = uebersicht[id];
            const marke = SCHACH_SPEICHER._markeVon(eintrag);

            /* Altbestand ohne Eintrag: holen, danach weiss man mehr. */
            if (marke === null) {
                zuHolen.push(id);
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

        /* Den Vorrat auf das kürzen, was es noch gibt und was gerade
           gebraucht wird — und nur schreiben, wenn sich etwas getan hat. */
        for (const id of Object.keys(vorrat)) {
            if (!partien[id] || !partien[id].ergebnis) {
                delete vorrat[id];
                vorratGeaendert = true;
            }
        }
        if (vorratGeaendert) {
            SCHACH_SPEICHER._vorratSchreiben(vorrat);
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
            const dort = await speicher.teilLaden("chronik");
            const liste = SCHACH_SPEICHER._chronikListe(dort);
            let naechste = SCHACH_SPEICHER._chronikNaechsteStelle(dort);

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
     * Helfer
     * ---------------------------------------------------------------- */

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
        try {
            window.localStorage.removeItem(SCHACH_SPEICHER.VORRAT_SCHLUESSEL);
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
