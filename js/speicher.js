/*
 * speicher.js — wo die Tabelle liegt.
 *
 * Es gibt zwei Rückwände mit derselben Schnittstelle. Die App kennt nur die
 * Schnittstelle und weiß nicht, welche Rückwand gerade arbeitet:
 *
 *     art           "lokal" | "gemeinsam"
 *     beschreibung  kurzer Satz für die Statusanzeige im Kopf
 *     laden()       Versprechen auf einen normalisierten Datenstand
 *     speichern(d)  Versprechen; wirft bei Fehler
 *
 * Eine dritte Rückwand (anderer Dienst) wäre eine weitere Klasse hier — sonst
 * ändert sich nichts. Siehe docs\ARCHITECTURE.md.
 */

/* ------------------------------------------------------------------ *
 * Rückwand 1: lokal im Browser des Besuchers
 * ------------------------------------------------------------------ */

class SpeicherLokal {

    /*
     * `aufbereiten` bringt einen geladenen Stand in Form. Jeder Stand gibt
     * seine eigene Funktion mit (SPIELER.normalisieren für die Spielerliste,
     * SCHACH_TAFEL.normalisieren für das Schach) — die Speicher-Schicht selbst
     * weiß nichts über den Inhalt.
     */
    constructor(schluessel, aufbereiten) {
        this.art = "lokal";
        this.beschreibung = "Nur auf diesem Gerät gespeichert";
        this.schluessel = schluessel;
        this.aufbereiten = aufbereiten;
    }

    async laden() {
        try {
            const text = window.localStorage.getItem(this.schluessel);
            if (!text) {
                return this.aufbereiten(null);
            }
            return this.aufbereiten(JSON.parse(text));
        } catch (fehler) {
            /* Kaputter oder gesperrter Browser-Speicher darf die App nicht
               anhalten — dann eben leer starten. */
            console.warn("Lokaler Speicher nicht lesbar:", fehler);
            return this.aufbereiten(null);
        }
    }

    async speichern(daten) {
        window.localStorage.setItem(this.schluessel, JSON.stringify(daten));
    }
}

/* ------------------------------------------------------------------ *
 * Rückwand 2: gemeinsam über Firebase Realtime Database
 *
 * Bewusst über die reine REST-Schnittstelle (fetch), NICHT über das
 * Firebase-SDK: keine fremde Programmbibliothek, kein Bauschritt, die Seite
 * bleibt eine Sammlung einfacher Dateien.
 * ------------------------------------------------------------------ */

class SpeicherGemeinsam {

    constructor(basis, pfad, aufbereiten) {
        this.art = "gemeinsam";
        this.beschreibung = "Gemeinsamer Stand für alle Besucher";
        this.basis = String(basis).replace(/\/+$/, "");
        this.pfad = String(pfad).replace(/^\/+|\/+$/g, "");
        this.aufbereiten = aufbereiten;
    }

    get adresse() {
        return this.basis + "/" + this.pfad + ".json";
    }

    /*
     * Ruft die Datenbank auf — MIT ZEITLIMIT (seit v3.9).
     *
     * DAS WAR EIN ECHTER HÄNGER. `fetch` gibt von sich aus NIE auf: Steht das
     * Handy im Funkloch, bleibt der Aufruf offen, bis der Browser irgendwann
     * selbst abbricht — das kann über eine Minute dauern. Und solange er offen
     * war, hing das ganze Spiel:
     *
     *   - `TEAM_SCHACH.ziehtGerade` blieb gesetzt, das Brett nahm keinen
     *     einzigen Tipp mehr an;
     *   - die regelmässige Abfrage ruhte (sie wartet auf den eigenen Vorgang);
     *   - und vor v3.8 stand obendrein noch die alte Zugauswahl auf dem
     *     Bildschirm, weil erst nach dem Netzverkehr neu gezeichnet wurde.
     *
     * Von aussen sah das aus, als sei die Seite eingefroren — bis der Zug des
     * Gegners eintraf und alles auf einen Schlag nachholte.
     *
     * Mit Zeitlimit wird daraus ein normaler Fehler: Er wird gemeldet, der Zug
     * wird zurückgenommen, und man kann es sofort noch einmal versuchen.
     */
    async _rufen(einstellungen, zeitlimit, was) {
        /*
         * Ältere Browser ohne AbortController bekommen den Aufruf wie bisher —
         * lieber ohne Zeitlimit als gar nicht.
         */
        if (typeof AbortController === "undefined") {
            return fetch(this.adresse, einstellungen);
        }

        const abbruch = new AbortController();
        const uhr = window.setTimeout(() => abbruch.abort(), zeitlimit);

        try {
            return await fetch(this.adresse,
                Object.assign({}, einstellungen, { signal: abbruch.signal }));
        } catch (fehler) {
            /* Ein Abbruch durch das Zeitlimit ist etwas anderes als „Server
               antwortet mit Fehler" — und der Unterschied gehört in die
               Meldung, sonst sucht man an der falschen Stelle. */
            if (fehler && fehler.name === "AbortError") {
                throw new Error(was + " hat zu lange gedauert (über "
                    + Math.round(zeitlimit / 1000) + " Sekunden). Die Verbindung "
                    + "ist gerade zu schlecht.");
            }
            throw fehler;
        } finally {
            window.clearTimeout(uhr);
        }
    }

    async laden() {
        const antwort = await this._rufen({ cache: "no-store" },
            SpeicherGemeinsam.ZEITLIMIT_LADEN_MS, "Das Laden");

        if (!antwort.ok) {
            throw new Error("Laden fehlgeschlagen (HTTP " + antwort.status + ")");
        }
        return this.aufbereiten(await antwort.json());
    }

    async speichern(daten) {
        const antwort = await this._rufen({
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(daten)
        }, SpeicherGemeinsam.ZEITLIMIT_SPEICHERN_MS, "Das Speichern");

        if (!antwort.ok) {
            throw new Error("Speichern fehlgeschlagen (HTTP " + antwort.status + ")");
        }
    }
}

/*
 * Die Zeitlimits, in Millisekunden.
 *
 * Laden darf kürzer sein: Es wird ohnehin alle paar Sekunden wiederholt, und
 * ein verpasster Durchgang fällt niemandem auf. Speichern bekommt mehr Zeit —
 * dahinter steht ein Zug, den jemand wirklich machen wollte, und ein Abbruch
 * kostet ihn den Zug.
 */
SpeicherGemeinsam.ZEITLIMIT_LADEN_MS = 8000;
SpeicherGemeinsam.ZEITLIMIT_SPEICHERN_MS = 12000;

/* ------------------------------------------------------------------ *
 * Auswahl der Rückwand
 * ------------------------------------------------------------------ */

/*
 * Liefert { speicher, hinweis }. Der Hinweis ist leer, wenn alles wie
 * eingestellt läuft — sonst nennt er den Grund für den Rückfall auf "lokal".
 *
 * `pfad` und `lokalerSchluessel` gehören zum jeweiligen Tab, `aufbereiten` ist
 * dessen Normalisier-Funktion. So teilen sich beide Spiele dieselbe
 * Speicher-Schicht, ohne voneinander zu wissen.
 */
function speicherErzeugen(konfig, pfad, lokalerSchluessel, aufbereiten) {
    const einstellung = konfig.speicher;

    if (einstellung.modus === "gemeinsam") {
        if (!einstellung.firebaseBasis) {
            return {
                speicher: new SpeicherLokal(lokalerSchluessel, aufbereiten),
                hinweis: "Gemeinsamer Modus ist eingestellt, aber in js\\konfig.js "
                    + "steht keine Datenbank-Adresse. Es wird nur lokal gespeichert."
            };
        }
        return {
            speicher: new SpeicherGemeinsam(einstellung.firebaseBasis, pfad, aufbereiten),
            hinweis: ""
        };
    }

    return {
        speicher: new SpeicherLokal(lokalerSchluessel, aufbereiten),
        hinweis: ""
    };
}
