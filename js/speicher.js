/*
 * speicher.js — wo die Tabelle liegt.
 *
 * Es gibt zwei Rückwände mit derselben Schnittstelle. Die App kennt nur die
 * Schnittstelle und weiß nicht, welche Rückwand gerade arbeitet:
 *
 *     art           "lokal" | "gemeinsam"
 *     beschreibung  ein, zwei Wörter für die Statusanzeige (kein Satz)
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
        this.beschreibung = "Nur dieses Gerät";
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
        this.beschreibung = "Verbunden";
        this.basis = String(basis).replace(/\/+$/, "");
        this.pfad = String(pfad).replace(/^\/+|\/+$/g, "");
        this.aufbereiten = aufbereiten;

        /* Hängt den Anmelde-Schlüssel an (siehe `_rufen`). Nur das Lesen
           der ALTEN Datenbank beim Umzug schaltet es ab. */
        this.mitAnmeldung = true;
    }

    get adresse() {
        return this.basis + "/" + this.pfad + ".json";
    }

    /* ---------------------------------------------------------------- *
     * DIE MARKE (seit v0.111.0) — 13 Bytes statt 190 Kilobyte
     *
     * WAS SIE LÖST, GEMESSEN AM 30.08.2026: Die regelmässige Abfrage holte
     * alle drei Sekunden den GANZEN Stand — beim Schach 193.800 Bytes, also
     * rund 233 MB je Gerät und Stunde. Dabei ändert sich in den allermeisten
     * dieser drei Sekunden gar nichts: Man denkt nach, der Gegner ist noch
     * nicht dran, die Seite liegt offen daneben.
     *
     * Die Marke ist der Zeitstempel `geaendertAm` GANZ OBEN im Stand, einzeln
     * gelesen. Jeder Schreibweg pflegt ihn — nachgemessen für Anlegen,
     * Einsetzen, Entfernen, den Weg ohne Zeitangabe und das Normalisieren
     * beim Lesen. Ist er unverändert, muss der volle Stand nicht geholt
     * werden.
     *
     * SIE LIEFERT NULL STATT ZU WERFEN: Jeder Zweifel — kein Zahlenwert,
     * HTTP-Fehler, Zeitüberschreitung — bedeutet „ich weiss es nicht", und
     * der Abgleich holt dann den vollen Stand wie vor v0.111.0. Ein
     * verpasster Zug wäre der teuerste Fehler, den diese Ersparnis machen
     * könnte; sie ist deshalb in JEDEM Zweifelsfall die teure Variante.
     *
     * DAS ZEITLIMIT IST KURZ (halbe Sekunde): Die Marke ist eine
     * Beschleunigung. Antwortet sie nicht sofort, ist der volle Weg richtig,
     * statt auf sie zu warten.
     * ---------------------------------------------------------------- */

    get markenAdresse() {
        return this.basis + "/" + this.pfad + "/"
            + SpeicherGemeinsam.MARKEN_FELD + ".json";
    }

    async marke() {
        try {
            const antwort = await this._rufen({ cache: "no-store" },
                SpeicherGemeinsam.ZEITLIMIT_MARKE_MS, "Die Nachfrage",
                this.markenAdresse);

            if (!antwort.ok) {
                return null;
            }

            const wert = await antwort.json();

            /* `null` heisst hier: Das Feld gibt es (noch) nicht — etwa in
               einer frisch angelegten Datenbank. Auch dann wird voll
               geladen. */
            return (typeof wert === "number" && isFinite(wert)) ? wert : null;
        } catch (fehler) {
            return null;
        }
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
    async _rufen(einstellungen, zeitlimit, was, adresse) {
        /* Ohne Angabe der ganze Stand — das ist der Normalfall und war bis
           v0.110.0 der einzige. Seit v0.111.0 fragt die Marke einen
           Unterpfad (siehe `marke`). */
        let ziel = adresse || this.adresse;

        /*
         * DER ANMELDE-SCHLÜSSEL (seit v0.138.0, UPCrew-Umzug): Die Regeln
         * der UPCrew-Datenbank lassen nur angemeldete Konten schreiben. Der
         * Schlüssel wird geholt, BEVOR das Zeitlimit läuft — eine fällige
         * Erneuerung (js\konto.js) soll die Marke nicht in ihre halbe
         * Sekunde drängen. Ohne Schlüssel geht die Anfrage trotzdem hinaus:
         * Lesen darf jeder.
         */
        if (this.mitAnmeldung && typeof SpeicherGemeinsam.tokenGeber === "function") {
            let token = null;
            try {
                token = await SpeicherGemeinsam.tokenGeber();
            } catch (fehler) {
                token = null;
            }
            if (token) {
                ziel += (ziel.indexOf("?") === -1 ? "?" : "&")
                    + "auth=" + encodeURIComponent(token);
            }
        }

        /*
         * Ältere Browser ohne AbortController bekommen den Aufruf wie bisher —
         * lieber ohne Zeitlimit als gar nicht.
         */
        if (typeof AbortController === "undefined") {
            return fetch(ziel, einstellungen);
        }

        const abbruch = new AbortController();
        const uhr = window.setTimeout(() => abbruch.abort(), zeitlimit);

        try {
            return await fetch(ziel,
                Object.assign({}, einstellungen, { signal: abbruch.signal }));
        } catch (fehler) {
            /* Ein Abbruch durch das Zeitlimit ist etwas anderes als „Server
               antwortet mit Fehler" — und der Unterschied gehört in die
               Meldung, sonst sucht man an der falschen Stelle. */
            if (fehler && fehler.name === "AbortError") {
                throw new Error(was + " hat zu lange gedauert (über "
                    + Math.round(zeitlimit / 1000) + " s) · Verbindung "
                    + "zu schlecht");
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

    /* ---------------------------------------------------------------- *
     * TEILE STATT DES GANZEN (seit v0.114.3)
     *
     * GEMESSEN AM 18.09.2026: Der ganze Schach-Stand ist 192 Kilobyte,
     * eine einzelne Partie 8, die Chronik 9, die Schlüsselliste 0,6. Jeder
     * Zug lud und schrieb bis v0.114.2 die 192 Kilobyte — zweimal. Die
     * Realtime Database ist aber ein Baum, und jeder Knoten hat seine
     * eigene Adresse: `<pfad>/partien/<id>.json` liefert genau die eine
     * Partie, und eine PATCH-Anfrage an `<pfad>.json` setzt mehrere Knoten
     * auf einmal — atomar, also entweder alle oder keinen.
     *
     * Die zwei Aufrufe sind reine Leitungen: Sie wissen nicht, was eine
     * Partie ist. WELCHE Teile geholt und geschrieben werden, entscheidet
     * `SCHACH_SPEICHER` (js\schach-speicher.js). `laden` und `speichern`
     * bleiben — für die Spielerliste (0,7 Kilobyte, ungeteilt) und als
     * Rückfall.
     * ---------------------------------------------------------------- */

    /*
     * Einen Unterknoten holen. `flach = true` liefert nur die Schlüssel der
     * Kinder (`?shallow=true`), jeder als `true` — die Liste der Partien
     * ohne ihren Inhalt. Liefert `null`, wenn es den Knoten nicht gibt (so
     * antwortet die Datenbank selbst — kein Fehler).
     */
    async teilLaden(unterpfad, flach) {
        const sauber = String(unterpfad || "").replace(/^\/+|\/+$/g, "");
        const ziel = this.basis + "/" + this.pfad
            + (sauber ? "/" + sauber : "") + ".json"
            + (flach ? "?shallow=true" : "");

        const antwort = await this._rufen({ cache: "no-store" },
            SpeicherGemeinsam.ZEITLIMIT_LADEN_MS, "Das Laden", ziel);

        if (!antwort.ok) {
            throw new Error("Laden fehlgeschlagen (HTTP " + antwort.status + ")");
        }
        return antwort.json();
    }

    /*
     * Mehrere Unterknoten in EINEM Schritt setzen. `aenderungen` ist ein
     * Objekt aus Pfad → Wert, die Pfade relativ zum eigenen Knoten
     * („partien/p-abc", „geaendertAm"); `null` als Wert löscht den Knoten.
     * Die Datenbank führt alles zusammen aus oder nichts — ein
     * Zug, der ohne seine Marke landet, kann so nicht entstehen.
     */
    async teilSchreiben(aenderungen) {
        const antwort = await this._rufen({
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(aenderungen)
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

/*
 * Die Marke (seit v0.111.0) bekommt bewusst WENIG Zeit: Sie ist eine
 * Abkürzung, kein Weg. Antwortet sie nicht in einer halben Sekunde, wird der
 * volle Stand geholt — das ist langsamer, aber immer richtig.
 */
SpeicherGemeinsam.ZEITLIMIT_MARKE_MS = 500;

/*
 * WELCHES FELD DIE MARKE IST. Es steht ganz oben in beiden Ständen
 * (`SCHACH_TAFEL.leereTafel`, `SPIELER.leereDaten`) und wird von jedem
 * Schreibweg hochgezogen. Wer es umbenennt, macht die Marke wirkungslos —
 * ein Test hält deshalb fest, dass Name und Pflege zusammenpassen.
 */
SpeicherGemeinsam.MARKEN_FELD = "geaendertAm";

/*
 * Woher der Anmelde-Schlüssel kommt (seit v0.138.0) — `KONTO.token`, von
 * app.js gesetzt. Fehlt er, laufen alle Anfragen ohne Schlüssel wie bis
 * v0.137.0 (lokaler Modus, Tests).
 */
SpeicherGemeinsam.tokenGeber = null;

/* ------------------------------------------------------------------ *
 * Rückwand 3: die UPCrew-Konten (seit v0.138.0)
 *
 * WARUM EINE EIGENE RÜCKWAND: Bis v0.137.0 lag die Spielerliste als EINE
 * Liste unter `spieler` und wurde als Ganzes geschrieben (PUT). Die Regeln
 * der UPCrew-Datenbank lassen aber jeden nur seinen EIGENEN Eintrag
 * schreiben — das geht nur, wenn jeder Eintrag seinen eigenen Knoten hat:
 *
 *     spieler/
 *         geaendertAm: 1750000000000        (die Marke, wie bisher)
 *         konten/
 *             <uid>: { id, name, uid, kennung, freunde, abgelehnt, … }
 *
 * `<uid>` ist die Konto-Nummer von Firebase (js\konto.js). Der Rest der
 * App merkt davon nichts: `laden` macht aus den Knoten die gewohnte Liste
 * (`SPIELER.normalisieren` bleibt die eine Nachrüst-Stelle), `speichern`
 * schreibt aus der Liste nur den eigenen Eintrag — und nur, wenn er sich
 * gegenüber dem Server geändert hat. Fremde Einträge ändert allein
 * `eintragSetzen`, und das nur mit den Rechten, die die Regeln geben
 * (eigener Eintrag, Admin, freigegebenes Konto).
 *
 * Passwort-Prüfsummen schreibt diese Rückwand NIE — sie nimmt `pinPruefwert`
 * und `pinSalz` heraus, und die Regeln lehnen einen Eintrag mit ihnen ab.
 * ------------------------------------------------------------------ */

class SpeicherKonten extends SpeicherGemeinsam {

    /* `eigeneUid()` liefert die Konto-Nummer dieses Geräts oder null. */
    constructor(basis, pfad, aufbereiten, eigeneUid) {
        super(basis, pfad, aufbereiten);
        this.eigeneUid = eigeneUid;

        /* Der eigene Eintrag, wie er zuletzt auf dem Server stand (als
           Text) — nur was davon abweicht, wird geschrieben. */
        this.zuletzt = null;
    }

    /* Aus den Knoten die gewohnte Liste — sortiert nach Konto-Nummer, damit
       jedes Gerät dieselbe Reihenfolge sieht (`inhaltGleich` vergleicht der
       Reihe nach). */
    static alsListe(roh) {
        if (!roh || typeof roh !== "object") {
            return null;
        }

        const stand = {};
        for (const schluessel of Object.keys(roh)) {
            if (schluessel !== "konten") {
                stand[schluessel] = roh[schluessel];
            }
        }

        const konten = (roh.konten && typeof roh.konten === "object") ? roh.konten : {};
        stand.spieler = Object.keys(konten).sort()
            .filter((uid) => konten[uid] && typeof konten[uid] === "object")
            .map((uid) => Object.assign({}, konten[uid], { uid: uid }));
        return stand;
    }

    /*
     * Ein Eintrag, wie er auf den Server darf: ohne Passwort-Prüfsummen, und
     * (seit v0.151.1, Regel §11a + §11b eingespielt am 27.09.2026) die Felder
     * `aussehen` und `fortschritt` nur so, wie die Regel sie erlaubt.
     * WARUM HIER: Blunderluck schreibt immer den GANZEN Konto-Eintrag. Ein
     * einziges Feld ausserhalb der Regel, und die Datenbank lehnt alles ab —
     * auch Freunde und Abzeichen. Das ist die eine Stelle, durch die jeder
     * Schreibvorgang eines Konto-Eintrags geht (`speichern`, `eintragSetzen`).
     */
    static eintragFuerServer(spieler) {
        const eintrag = JSON.parse(JSON.stringify(spieler));
        delete eintrag.pinPruefwert;
        delete eintrag.pinSalz;
        if (eintrag.aussehen !== undefined) {
            const aussehen = SpeicherKonten.aussehenFuerRegel(eintrag.aussehen);
            if (aussehen) {
                eintrag.aussehen = aussehen;
            } else {
                delete eintrag.aussehen;
            }
        }
        /* Das Aussehen je Spiel (seit v0.151.17, Regel §11c): nur die zwei
           Spiele, je Spiel nur die sechs Felder. */
        if (eintrag.aussehenJe !== undefined) {
            const je = {};
            const roh = (eintrag.aussehenJe && typeof eintrag.aussehenJe === "object") ? eintrag.aussehenJe : {};
            for (const app of ["blunderluck", "typoluck"]) {
                const sauber = SpeicherKonten.aussehenFuerRegel(roh[app]);
                if (sauber) {
                    je[app] = sauber;
                }
            }
            if (Object.keys(je).length > 0) {
                eintrag.aussehenJe = je;
            } else {
                delete eintrag.aussehenJe;
            }
        }
        /* Der Haken „Spielzeit öffentlich" (seit v0.155.2): nur Ja/Nein
           (Regel §14 `spielzeitOeffentlich`). */
        if ("spielzeitOeffentlich" in eintrag && typeof eintrag.spielzeitOeffentlich !== "boolean") {
            delete eintrag.spielzeitOeffentlich;
        }
        if (eintrag.fortschritt && typeof eintrag.fortschritt === "object"
                && typeof FORTSCHRITT !== "undefined" && typeof FORTSCHRITT.fuerKonto === "function") {
            eintrag.fortschritt = FORTSCHRITT.fuerKonto(eintrag.fortschritt);
        }
        return eintrag;
    }

    /*
     * DIE WERTE DER REGEL §11a (SICHERHEIT.md) — dieselben wie `WAHL` in
     * js\upcrew-aussehen.js; `test-konto-regel.js` prüft, dass Regel,
     * Baustein und diese Liste übereinstimmen.
     */
    static get REGEL_AUSSEHEN() {
        return {
            darstellung: ["geraet", "hell", "dunkel"],
            farbwelt: ["werkstatt", "studio", "feld", "tiefsee", "gold"],
            schrift: ["S1", "S2", "S3", "S4", "S5", "S6"],
            knoepfe: ["K1", "K2", "K3", "K4", "K5", "K6"]
        };
    }

    /* Nur die sechs Felder mit erlaubten Werten — oder null, wenn nichts
       Gültiges übrig bleibt. */
    static aussehenFuerRegel(roh) {
        if (!roh || typeof roh !== "object" || Array.isArray(roh)) {
            return null;
        }
        const erlaubt = SpeicherKonten.REGEL_AUSSEHEN;
        const aus = {};
        for (const feld of Object.keys(erlaubt)) {
            if (erlaubt[feld].indexOf(roh[feld]) !== -1) {
                aus[feld] = roh[feld];
            }
        }
        if (typeof roh.leseschrift === "boolean") {
            aus.leseschrift = roh.leseschrift;
        }
        if (typeof roh.stand === "number" && isFinite(roh.stand) && roh.stand >= 0) {
            aus.stand = roh.stand;
        }
        return Object.keys(aus).length > 0 ? aus : null;
    }

    /*
     * LADEN — UNTER BEIDEN REGELN (seit v0.154.0, Regel §12 Phase A,
     * Apps\UPCrew\docs\DATENBANK-KONZEPT-12.md Abschnitt 4).
     *
     * Beim ersten Laden fragt `KONTO.regelErkennen`, welche Regel gilt.
     *   alt  — wie bisher: der ganze Knoten `spieler`.
     *   §12  — `geaendertAm` und `rollen`; dann
     *          Admins/UP#Plus: `konten` ganz und `namen` (Verwaltung);
     *          alle anderen: `oeffentlich` (fremde Auszüge) und nur
     *          `konten/<ich>` (der eigene, volle Eintrag);
     *          nicht angemeldet: keine Spieler.
     * Antwortet die Datenbank mit 401, wird die Regel neu erkannt und
     * einmal auf dem anderen Weg geladen. Das Ergebnis hat in beiden Fällen
     * dieselbe Form (`alsListe`); fremde Einträge tragen unter §12 statt
     * `fortschritt`, `tag`, `kennung` nur `auszug`.
     */
    async laden() {
        const regeln = (typeof KONTO !== "undefined" && typeof KONTO.regelErkennen === "function");
        if (regeln && !KONTO.regelBekannt) {
            await KONTO.regelErkennen();
        }
        let roh;
        try {
            roh = await this._rohLaden();
        } catch (fehler) {
            if (!regeln || !fehler || fehler.status !== 401) {
                throw fehler;
            }
            const vorher = KONTO.regel;
            await KONTO.regelErkennen();
            if (KONTO.regel === vorher) {
                throw fehler;
            }
            roh = await this._rohLaden();
        }
        const daten = this.aufbereiten(SpeicherKonten.alsListe(roh));
        this._merken(daten);
        if (regeln && KONTO.istP12()) {
            this._selbstEintragen(daten);
        }
        return daten;
    }

    async _rohLaden() {
        if (typeof KONTO !== "undefined" && typeof KONTO.istP12 === "function" && KONTO.istP12()) {
            return this._ladenP12();
        }
        const antwort = await this._rufen({ cache: "no-store" },
            SpeicherGemeinsam.ZEITLIMIT_LADEN_MS, "Das Laden");
        if (!antwort.ok) {
            throw SpeicherKonten._fehler("Laden fehlgeschlagen", antwort.status);
        }
        return antwort.json();
    }

    static _fehler(text, status) {
        const fehler = new Error(text + " (HTTP " + status + ")");
        fehler.status = status;
        return fehler;
    }

    /* Einen Unterknoten holen — null, wenn es ihn nicht gibt; wirft mit
       `status` bei einer Absage (401 = Regel lässt es nicht zu). */
    async _teilHolen(unterpfad) {
        const ziel = this.basis + "/" + this.pfad + "/" + unterpfad + ".json";
        const antwort = await this._rufen({ cache: "no-store" },
            SpeicherGemeinsam.ZEITLIMIT_LADEN_MS, "Das Laden", ziel);
        if (!antwort.ok) {
            throw SpeicherKonten._fehler("Laden fehlgeschlagen", antwort.status);
        }
        return antwort.json();
    }

    async _ladenP12() {
        const uid = this.eigeneUid ? this.eigeneUid() : null;
        const [marke, rollen] = await Promise.all([this._teilHolen(SpeicherGemeinsam.MARKEN_FELD),
            this._teilHolen("rollen")]);
        const roh = { rollen: (rollen && typeof rollen === "object") ? rollen : {} };
        if (typeof marke === "number") {
            roh[SpeicherGemeinsam.MARKEN_FELD] = marke;
        }
        if (!uid) {
            roh.konten = {};
            return roh;
        }
        if (KONTO.istAdmin(roh, uid)) {
            const [konten, namen, meinAuszug] = await Promise.all([this._teilHolen("konten"),
                this._teilHolen("namen"), this._teilHolen("oeffentlich/" + uid)]);
            roh.konten = (konten && typeof konten === "object") ? konten : {};
            roh.namen = (namen && typeof namen === "object") ? namen : {};
            this._oeffentlichVomServer = meinAuszug || null;
            return roh;
        }
        const [oeffentlich, eigen] = await Promise.all([this._teilHolen("oeffentlich"),
            this._teilHolen("konten/" + uid)]);
        roh.konten = {};
        const fremde = (oeffentlich && typeof oeffentlich === "object") ? oeffentlich : {};
        this._oeffentlichVomServer = fremde[uid] || null;
        for (const andere of Object.keys(fremde)) {
            if (fremde[andere] && typeof fremde[andere] === "object") {
                roh.konten[andere] = fremde[andere];
            }
        }
        if (eigen && typeof eigen === "object") {
            roh.konten[uid] = eigen;
        }
        return roh;
    }

    /* Den eigenen Auszug sofort neu schreiben (seit v0.155.0: nach dem
       Umschalten „Spielzeit öffentlich"). Unter der alten Regel nichts. */
    oeffentlichNeu(daten) {
        if (typeof KONTO === "undefined" || typeof KONTO.istP12 !== "function" || !KONTO.istP12()) {
            return Promise.resolve();
        }
        this._eingetragen = false;
        this.zuletztOeffentlich = null;
        /* Was zuletzt vom Server kam, kann veraltet sein — sicher schreiben. */
        this._oeffentlichVomServer = { neu: true };
        return this._selbstEintragen(daten);
    }

    /*
     * Unter §12 trägt sich jedes Konto beim ersten Laden je Sitzung selbst
     * in `oeffentlich` und das Anmeldeverzeichnis ein, wenn dort etwas
     * fehlt oder abweicht (Konzept Phase A: „UP#Plus trägt sich beim ersten
     * Start im Modus §12 selbst ein" — und jeder andere auch). Still, im
     * Hintergrund; ein Fehler wird beim nächsten Start wiederholt.
     */
    async _selbstEintragen(daten) {
        if (this._eingetragen) {
            return;
        }
        const eigener = this._eigener(daten);
        if (!eigener || !KONTO.angemeldet()) {
            return;
        }
        this._eingetragen = true;
        try {
            const eintrag = Object.assign(SpeicherKonten.eintragFuerServer(eigener), { uid: eigener.uid });
            const pfade = KONTO.oeffentlichePfade(eintrag, null);
            const soll = KONTO.anmeldungVon(eintrag);
            const verzeichnis = soll ? await KONTO.verzeichnisLesen(eintrag.name) : [];
            if (verzeichnis === null) {
                this._eingetragen = false;
                return;
            }
            const ist = verzeichnis.find((zeile) => zeile.uid === eintrag.uid) || null;
            const verzeichnisPasst = !soll
                || (!!ist && ist.k === soll.k && ist.f === (soll.f === true));
            const text = JSON.stringify(pfade);
            if (verzeichnisPasst && KONTO._gleich(this._oeffentlichVomServer,
                    pfade["oeffentlich/" + eintrag.uid])) {
                this.zuletztOeffentlich = text;
                return;
            }
            pfade[SpeicherGemeinsam.MARKEN_FELD] = Date.now();
            await this.teilSchreiben(pfade);
            this.zuletztOeffentlich = text;
        } catch (fehler) {
            this._eingetragen = false;
        }
    }

    _eigener(daten) {
        const uid = this.eigeneUid ? this.eigeneUid() : null;
        if (!uid || !daten || !Array.isArray(daten.spieler)) {
            return null;
        }
        return daten.spieler.find((spieler) => spieler.uid === uid) || null;
    }

    _merken(daten) {
        const eigener = this._eigener(daten);
        this.zuletzt = eigener
            ? JSON.stringify(SpeicherKonten.eintragFuerServer(eigener)) : null;
    }

    async speichern(daten) {
        const eigener = this._eigener(daten);
        if (!eigener) {
            /* Ohne eigenen Eintrag gibt es nichts, was dieses Gerät
               schreiben dürfte. */
            return;
        }

        const eintrag = SpeicherKonten.eintragFuerServer(eigener);
        const text = JSON.stringify(eintrag);
        if (text === this.zuletzt) {
            return;
        }

        const aenderungen = {};
        aenderungen["konten/" + eigener.uid] = eintrag;

        /* Regel §12 (seit v0.154.0): Auszug und Verzeichnis-Eintrag im
           SELBEN Schritt — aber nur, wenn sie sich geändert haben, und nur
           dann zieht auch die Marke hoch (Konzept §4: „Marke nur, wenn sich
           der Auszug ändert"). Unter der alten Regel wie bisher. */
        let oeffentlichText = null;
        if (typeof KONTO !== "undefined" && typeof KONTO.istP12 === "function" && KONTO.istP12()) {
            const pfade = KONTO.oeffentlichePfade(Object.assign({}, eintrag, { uid: eigener.uid }), null);
            oeffentlichText = JSON.stringify(pfade);
            if (oeffentlichText !== this.zuletztOeffentlich) {
                Object.assign(aenderungen, pfade);
                aenderungen[SpeicherGemeinsam.MARKEN_FELD] = Date.now();
            }
        } else {
            aenderungen[SpeicherGemeinsam.MARKEN_FELD] = Date.now();
        }
        try {
            await this.teilSchreiben(aenderungen);
        } catch (fehler) {
            /* Eine Absage (401) kann heissen: Die Regel hat gewechselt. Beim
               nächsten Laden wird neu erkannt. */
            if (typeof KONTO !== "undefined" && /HTTP 401/.test(String(fehler && fehler.message))) {
                KONTO.regelBekannt = false;
            }
            throw fehler;
        }
        this.zuletzt = text;
        if (oeffentlichText !== null) {
            this.zuletztOeffentlich = oeffentlichText;
        }
    }

    /*
     * Einen Eintrag gezielt setzen oder mit `null` löschen — für die Fälle,
     * die absichtlich einen FREMDEN Eintrag betreffen (Verwaltung) oder den
     * eigenen entfernen (Konto löschen). `weitere` sind zusätzliche Knoten
     * im selben Schritt (Neu-Verbinden: neuer Eintrag und alter weg, beides
     * oder keins).
     */
    async eintragSetzen(uid, eintrag, weitere) {
        const aenderungen = Object.assign({}, weitere || {});
        aenderungen["konten/" + uid] = (eintrag === null)
            ? null : SpeicherKonten.eintragFuerServer(eintrag);
        /* Regel §12 (seit v0.154.0): Auszug und Verzeichnis ziehen mit. */
        if (typeof KONTO !== "undefined" && typeof KONTO.istP12 === "function" && KONTO.istP12()) {
            if (eintrag === null) {
                aenderungen["oeffentlich/" + uid] = null;
            } else {
                Object.assign(aenderungen, KONTO.oeffentlichePfade(
                    Object.assign({}, aenderungen["konten/" + uid], { uid: uid }), null));
            }
        }
        aenderungen[SpeicherGemeinsam.MARKEN_FELD] = Date.now();
        await this.teilSchreiben(aenderungen);

        if (this.eigeneUid && uid === this.eigeneUid()) {
            this.zuletzt = (eintrag === null)
                ? null : JSON.stringify(SpeicherKonten.eintragFuerServer(eintrag));
        }
    }
}

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
function speicherErzeugen(konfig, pfad, lokalerSchluessel, aufbereiten, eigeneUid) {
    const einstellung = konfig.speicher;

    /* Die Spielerliste mit UPCrew-Konten (seit v0.138.0): Wer `eigeneUid`
       mitgibt und ein Konto eingerichtet hat, bekommt die Konten-Rückwand. */
    if (eigeneUid && einstellung.modus === "gemeinsam" && einstellung.firebaseBasis
            && konfig.konto && konfig.konto.apiKey) {
        return {
            speicher: new SpeicherKonten(einstellung.firebaseBasis, pfad,
                aufbereiten, eigeneUid),
            hinweis: ""
        };
    }

    if (einstellung.modus === "gemeinsam") {
        if (!einstellung.firebaseBasis) {
            return {
                speicher: new SpeicherLokal(lokalerSchluessel, aufbereiten),
                hinweis: "Keine Datenbank-Adresse in js\\konfig.js · "
                    + "speichert nur lokal"
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
