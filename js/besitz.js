/*
 * besitz.js — was der Spieler im Shop GEKAUFT hat: wo es liegt und wie
 * gekauft wird (seit v0.163.0, UPCrew Runde 8, Auftrag
 * ..\UPCrew\AUFTRAG-Blunderluck-v0.163.0.md).
 *
 * Die Rechnung steht im gemeinsamen Baustein js\upcrew-besitz.js
 * (`UPCREW_BESITZ`: lesen, vereinigen, Preis, Kauf, Merker „Kauf offen") —
 * hier nur, WOHER der Besitz kommt und WOHIN er geht, nach dem Muster von
 * js\fortschritt-konto.js:
 *
 *   Gerät   immer: `upcrew.besitz` im Gerätespeicher — EIN Schlüssel für
 *           beide UPCrew-Spiele (derselbe Ursprung), darin JE PERSON eine
 *           Menge:
 *               { "<spieler-id oder gast>": { schrift: ["S3"], … } }
 *           Der Name der Person kommt aus `FORTSCHRITT_KONTO.person()` —
 *           genau der, unter dem ihr Fortschritt in `upcrew.fortschritt`
 *           liegt (Nachtrag der Koordination 04.10.2026, 02:10 Uhr: je
 *           Person, nicht flach — sonst sähe ein Gast nach dem Abmelden die
 *           Käufe des Kontos, und ein zweites Konto bekäme sie geschenkt).
 *           Gäste haben nur das. Fremde Einträge bleiben beim Schreiben
 *           erhalten (frisch gelesen, nur der eigene ersetzt).
 *   Konto   mit echtem Konto zusätzlich das Feld `besitz` am eigenen
 *           Eintrag (`spieler/konten/<uid>/besitz/<art>` = EIN Text aus
 *           `UPCREW_BESITZ.alsText`, Regel §13) — geschrieben über den
 *           Spieler-Abgleich (`ANMELDUNG.abgleich.aendern`), derselbe Weg
 *           wie Fortschritt und Aussehen. Blunderluck schreibt immer den
 *           ganzen Eintrag; dass dabei kein fremder Kauf verloren geht,
 *           sichert `SPIELER._besitzZusammen`.
 *
 * KÄUFE WACHSEN NUR: Gelesen wird immer die VEREINIGUNG aus Gerät und
 * Konto. `abgleichen()` schreibt sie auf die Seite zurück, der etwas fehlt —
 * gerufen, wo auch der Fortschritt vom Konto ankommt (js\app.js `beiDaten`:
 * Start, Anmeldung, zurück im Vordergrund).
 *
 * GAST → KONTO: genau dort und genau so wie der Fortschritt
 * (`FORTSCHRITT_KONTO.gastUebernehmen`, „Spielstand sichern"): Der
 * Gast-Eintrag wird mit dem der neuen Person vereinigt und verschwindet.
 * Meldet sich jemand an einem BESTEHENDEN Konto an, bleibt der Gast-Besitz
 * unter „gast" liegen — wie der Fortschritt.
 *
 * DER KAUF (`kaufen`, Reihenfolge aus dem Kopf von js\upcrew-besitz.js):
 *   0. seit v0.164.1: nur, wenn feststeht, wem er gehört (`kaufBereit` —
 *      ein gemerktes Konto, das noch nicht geladen ist, kauft nicht),
 *   1. rechnen (`UPCREW_BESITZ.kaufen` — speichert nichts),
 *   2. Merker „Kauf offen" aufs Gerät (`upcrew.kaufOffen.blunderluck` =
 *      { wem: "<person>", merker: … }),
 *   3. ERST den Besitz speichern (Gerät, dann Konto),
 *   4. DANN den Fortschritt (`FORTSCHRITT_KONTO.ablegen` — der Weg des
 *      Vorrat-Kaufs; der Zähler `muenzenAusgegeben` wächst um den Preis),
 *   5. Merker löschen.
 * Bricht es zwischen 3 und 4 ab, hat der Spieler das Stück und noch nichts
 * bezahlt; `offenAufloesen()` bucht es beim nächsten Start nach — nur für
 * die Person, der der Merker gehört.
 *
 * WAS „FREI" HEISST, BLEIBT WIE ES IST (Level, Turm, Werkstatt) — der Besitz
 * kommt als „ODER" dazu: `BESITZ.frei(schluessel, wert)` fragen
 * `FREISCHALTUNG.brettStueckFrei` (Brett-Design 2D/3D, Figuren-Stil) und
 * der Shop; die Sammlung bekommt `BESITZ.haken()`.
 */

const BESITZ = {

    /* Der gemeinsame Schlüssel beider UPCrew-Spiele. */
    SCHLUESSEL: "upcrew.besitz",

    /* Der Merker „Kauf offen" dieses Spiels. */
    OFFEN_SCHLUESSEL: "upcrew.kaufOffen.blunderluck",

    /* Regal-Schlüssel des Spiels → Art im Katalog (js\upcrew-katalog.js). */
    ART_VON: { design2d: "brett2d", thema: "brett3d", figuren: "figurstil" },

    _horcher: [],

    _da() {
        return typeof UPCREW_BESITZ !== "undefined" && typeof FORTSCHRITT_KONTO !== "undefined";
    },

    _istObjekt(wert) {
        return !!wert && typeof wert === "object" && !Array.isArray(wert);
    },

    /* Die Person von jetzt — derselbe Name wie beim Fortschritt. */
    person() {
        return FORTSCHRITT_KONTO.person();
    },

    /* ---------------------------------------------------------------- *
     * Gerät
     * ---------------------------------------------------------------- */

    /* Alle Einträge unter dem gemeinsamen Schlüssel — ein Objekt, notfalls
       ein leeres (kaputt, gesperrt, noch nie geschrieben). Wirft nie. */
    _alleLesen() {
        try {
            const roh = JSON.parse(localStorage.getItem(BESITZ.SCHLUESSEL) || "null");
            return BESITZ._istObjekt(roh) ? roh : {};
        } catch (fehler) {
            return {};
        }
    },

    /* Die Menge einer Person auf dem Gerät (Unlesbares = leere Menge). */
    _geraetLesen(person) {
        return UPCREW_BESITZ.lesen(BESITZ._alleLesen()[person || BESITZ.person()]);
    },

    /* Die Menge einer Person schreiben — FRISCH gelesen und vereinigt, damit
       das andere Spiel im selben Browser nichts verliert (andere Personen,
       ein Kauf von eben). Liefert, ob es geklappt hat. */
    _geraetSchreiben(menge, person) {
        try {
            const alle = BESITZ._alleLesen();
            const wem = person || BESITZ.person();
            alle[wem] = UPCREW_BESITZ.zusammenfuehren(alle[wem], menge);
            localStorage.setItem(BESITZ.SCHLUESSEL, JSON.stringify(alle));
            return true;
        } catch (fehler) {
            /* privates Fenster, Speicher voll: dann gilt es nur am Konto */
            return false;
        }
    },

    /* ---------------------------------------------------------------- *
     * Konto
     * ---------------------------------------------------------------- */

    /* Der eigene Eintrag — nur mit echtem Konto, nie als Gast. */
    _eigener() {
        return FORTSCHRITT_KONTO._eigener();
    },

    _kontoLesen() {
        const eintrag = BESITZ._eigener();
        return UPCREW_BESITZ.lesen(eintrag ? eintrag.besitz : null);
    },

    /* Die Vereinigung ans Konto geben — nur, wenn dort etwas fehlt, und nur
       in der Form der Regel §13. Liefert, ob geschrieben wurde. */
    _kontoSchreiben(menge) {
        const eintrag = FORTSCHRITT_KONTO.AM_KONTO ? BESITZ._eigener() : null;
        if (!eintrag) {
            return false;
        }
        const konto = UPCREW_BESITZ.alsText(UPCREW_BESITZ.lesen(eintrag.besitz));
        const zusammen = UPCREW_BESITZ.alsText(UPCREW_BESITZ.zusammenfuehren(eintrag.besitz, menge));
        if (!zusammen.ok || !konto.ok || JSON.stringify(zusammen.feld) === JSON.stringify(konto.feld)) {
            return false;
        }
        const neu = SPIELER.besitzSetzen(ANMELDUNG.abgleich.daten, eintrag.id, zusammen.feld);
        ANMELDUNG.abgleich.aendern(neu, false);
        return true;
    },

    /* ---------------------------------------------------------------- *
     * Lesen
     * ---------------------------------------------------------------- */

    /* Der geltende Besitz: Gerät und Konto vereinigt. */
    lesen() {
        if (!BESITZ._da()) {
            return {};
        }
        return UPCREW_BESITZ.zusammenfuehren(BESITZ._geraetLesen(), BESITZ._kontoLesen());
    },

    hat(art, wert) {
        return BESITZ._da() && UPCREW_BESITZ.hat(BESITZ.lesen(), art, wert);
    },

    /* Der Haken für `UPCREW_ANPASSEN.zeigen(ort, { besitz })` — gefragt wird
       mit der Art des KATALOGS (`brett3d`, nicht `thema`). */
    haken() {
        return (art, wert) => BESITZ.hat(art, wert);
    },

    /* Gekauft? Gefragt mit dem Regal-Schlüssel des Spiels (`design2d`,
       `thema`, `figuren`) oder gleich mit der Art des Katalogs. */
    frei(schluessel, wert) {
        return BESITZ.hat(BESITZ.ART_VON[schluessel] || schluessel, wert);
    },

    /* ---------------------------------------------------------------- *
     * Zusammenführen (Start, Anmeldung, Vordergrund)
     * ---------------------------------------------------------------- */

    /*
     * Gerät und Konto vereinigen; weicht eine Seite ab, dorthin
     * zurückschreiben. Dazu ein offener Kauf dieser Person (`offenAufloesen`).
     * Ändert sich dabei, was gilt, erfahren es die Horcher (Shop, Sammlung).
     * Liefert { geraet, konto } — wohin geschrieben wurde.
     */
    _zuletzt: null,

    abgleichen() {
        if (!BESITZ._da()) {
            return { geraet: false, konto: false };
        }
        const geraet = BESITZ._geraetLesen();
        const zusammen = UPCREW_BESITZ.zusammenfuehren(geraet, BESITZ._kontoLesen());
        const ergebnis = { geraet: false, konto: false };
        if (JSON.stringify(zusammen) !== JSON.stringify(geraet)) {
            ergebnis.geraet = BESITZ._geraetSchreiben(zusammen);
        }
        ergebnis.konto = BESITZ._kontoSchreiben(zusammen);
        BESITZ.offenAufloesen();

        const bild = BESITZ.person() + "|" + JSON.stringify(zusammen);
        if (BESITZ._zuletzt !== null && BESITZ._zuletzt !== bild) {
            BESITZ._melden();
        }
        BESITZ._zuletzt = bild;
        return ergebnis;
    },

    /*
     * GAST → KONTO (nach „Spielstand sichern", js\anmeldung-konto.js, direkt
     * nach `FORTSCHRITT_KONTO.gastUebernehmen`): Der Gast-Besitz wird mit
     * dem Eintrag der neuen Person vereinigt, der Gast-Eintrag verschwindet,
     * und die Vereinigung geht ans Konto. Liefert, ob etwas umgezogen ist.
     */
    gastUebernehmen() {
        if (!BESITZ._da()) {
            return false;
        }
        const person = BESITZ.person();
        if (person === FORTSCHRITT_KONTO.GAST) {
            return false;
        }
        try {
            const alle = BESITZ._alleLesen();
            if (!BESITZ._istObjekt(alle[FORTSCHRITT_KONTO.GAST])) {
                return false;
            }
            alle[person] = UPCREW_BESITZ.zusammenfuehren(alle[person], alle[FORTSCHRITT_KONTO.GAST]);
            delete alle[FORTSCHRITT_KONTO.GAST];
            localStorage.setItem(BESITZ.SCHLUESSEL, JSON.stringify(alle));
        } catch (fehler) {
            return false;
        }
        /* Ein offener Kauf des Gasts gehört jetzt der neuen Person. */
        const offen = BESITZ._offenLesen();
        if (offen && offen.wem === FORTSCHRITT_KONTO.GAST) {
            BESITZ._offenSchreiben(person, offen.merker);
        }
        BESITZ.abgleichen();
        BESITZ._melden();
        return true;
    },

    /* ---------------------------------------------------------------- *
     * Merker „Kauf offen"
     * ---------------------------------------------------------------- */

    /* { wem, merker } vom Gerät — oder null (keiner, unlesbar). */
    _offenLesen() {
        try {
            const roh = JSON.parse(localStorage.getItem(BESITZ.OFFEN_SCHLUESSEL) || "null");
            if (!BESITZ._istObjekt(roh) || typeof roh.wem !== "string" || roh.wem === "") {
                return null;
            }
            const merker = UPCREW_BESITZ.offenLesen(roh.merker);
            return merker ? { wem: roh.wem, merker: merker } : null;
        } catch (fehler) {
            return null;
        }
    },

    _offenSchreiben(wem, merker) {
        try {
            localStorage.setItem(BESITZ.OFFEN_SCHLUESSEL, JSON.stringify({ wem: wem, merker: merker }));
            return true;
        } catch (fehler) {
            return false;
        }
    },

    _offenLoeschen() {
        try {
            localStorage.removeItem(BESITZ.OFFEN_SCHLUESSEL);
        } catch (fehler) {
            /* ohne Gerätespeicher gibt es auch keinen Merker */
        }
    },

    /*
     * Was ist aus einem gemerkten Kauf geworden? Nur für die Person von
     * JETZT — der Merker eines anderen bleibt liegen, bis er wieder da ist.
     * Liefert die Lage ("kein", "fremd", "verworfen", "gebucht",
     * "nachbuchen"); bei "nachbuchen" ist der Preis danach gebucht.
     */
    offenAufloesen() {
        if (!BESITZ._da()) {
            return "kein";
        }
        let vorhanden = false;
        try {
            vorhanden = localStorage.getItem(BESITZ.OFFEN_SCHLUESSEL) !== null;
        } catch (fehler) {
            return "kein";
        }
        if (!vorhanden) {
            return "kein";
        }
        const offen = BESITZ._offenLesen();
        if (!offen) {
            /* ein unlesbarer Rest darf weg */
            BESITZ._offenLoeschen();
            return "kein";
        }
        if (offen.wem !== BESITZ.person()) {
            return "fremd";
        }
        const r = UPCREW_BESITZ.offenAufloesen(FORTSCHRITT_KONTO.lesen(), BESITZ.lesen(), offen.merker,
            FORTSCHRITT.APP, Date.now());
        if (r.lage === "nachbuchen") {
            FORTSCHRITT_KONTO.ablegen(r.stand);
            BESITZ._offenLoeschen();
        } else if (r.lage === "gebucht" || r.lage === "verworfen") {
            BESITZ._offenLoeschen();
        }
        return r.lage;
    },

    /* ---------------------------------------------------------------- *
     * Kauf
     * ---------------------------------------------------------------- */

    /*
     * DARF JETZT GEKAUFT WERDEN? (seit v0.164.1; Prüfung Besitz + Kauf vom
     * 04.10.2026, Funde 2 und 3.) Erst, wenn feststeht, wem der Kauf gehört,
     * und der Besitz dieses Kontos da ist — sonst läge er beim Gast (also
     * bei der falschen Person) oder bezahlte ein Stück ein zweites Mal, das
     * am anderen Gerät oder im anderen Spiel schon gekauft ist. Die Antwort
     * gibt `FORTSCHRITT_KONTO.personSteht()` (dort steht, wann: ein echter
     * Gast kauft wie bisher aufs Gerät). Bei „nein" bucht `kaufen` nichts
     * (Grund „laedt"), der Shop zeigt eine Kurzmeldung. Anprobieren fragt
     * hier nicht.
     */
    kaufBereit() {
        return !BESITZ._da() || typeof FORTSCHRITT_KONTO.personSteht !== "function"
            || FORTSCHRITT_KONTO.personSteht();
    },

    /*
     * Ein Stück kaufen — ohne Rückfrage (die stellt js\shop.js). Liefert
     * { ok, grund, preis, fehlt, neu }; bei `ok` ist alles gespeichert,
     * erst der Besitz, dann der Fortschritt. `datum` ("JJJJ-MM-TT") für das
     * Angebot des Tages; fehlt es, das Datum des Geräts.
     */
    kaufen(art, wert, datum) {
        if (!BESITZ._da()) {
            return { ok: false, grund: "unbekannt", preis: 0, fehlt: 0, neu: [] };
        }
        /* Seit v0.164.1: Solange nicht feststeht, wem der Kauf gehört (das
           Konto ist gemerkt, aber noch nicht geladen), wird NICHTS gebucht —
           kein Merker, kein Besitz, keine Zahlung (`kaufBereit`). */
        if (!BESITZ.kaufBereit()) {
            return { ok: false, grund: "laedt", preis: 0, fehlt: 0, neu: [] };
        }
        /* Ein früherer Kauf, der nicht zu Ende kam, wird zuerst geklärt. */
        BESITZ.offenAufloesen();

        const vorher = FORTSCHRITT_KONTO.lesen();
        const app = FORTSCHRITT.APP;
        const tag = (typeof datum === "string" && datum) ? datum : UPCREW_BESITZ.datumText(Date.now());
        const r = UPCREW_BESITZ.kaufen(vorher, BESITZ.lesen(), app, art, wert, tag, Date.now());
        if (!r.ok) {
            return { ok: false, grund: r.grund, preis: r.preis, fehlt: r.fehlt, neu: [] };
        }

        /* Merker aufs Gerät, direkt vor dem Besitz (ohne Warten). Liegt dort
           noch der Merker eines ANDEREN (anderes Konto, nie aufgelöst),
           bleibt er liegen — dieser Kauf läuft dann ohne Merker; verloren
           geht dabei nichts (Kopf von js\upcrew-besitz.js). */
        const person = BESITZ.person();
        const fremder = BESITZ._offenLesen();
        const merker = (fremder && fremder.wem !== person) ? null
            : UPCREW_BESITZ.offenMerken(vorher, app, art, wert, r.preis);
        const gemerkt = !!merker && BESITZ._offenSchreiben(person, merker);

        /* ERST der Besitz (Gerät, dann Konto) … */
        const aufGeraet = BESITZ._geraetSchreiben(r.besitz, person);
        const amKonto = BESITZ._kontoSchreiben(r.besitz);
        if (!aufGeraet && !amKonto) {
            /* Nirgends angekommen (Gerätespeicher gesperrt, kein Konto):
               Dann wird auch nichts bezahlt. */
            if (gemerkt) {
                BESITZ._offenLoeschen();
            }
            return { ok: false, grund: "speicher", preis: r.preis, fehlt: 0, neu: [] };
        }
        /* … DANN der Fortschritt, auf dem Weg des Vorrat-Kaufs. */
        FORTSCHRITT_KONTO.ablegen(r.stand);

        if (gemerkt) {
            BESITZ._offenLoeschen();
        }
        BESITZ._zuletzt = person + "|" + JSON.stringify(BESITZ.lesen());
        BESITZ._melden();
        return { ok: true, grund: "", preis: r.preis, fehlt: 0, neu: r.neu };
    },

    /* ---------------------------------------------------------------- *
     * Horcher
     * ---------------------------------------------------------------- */

    /* Wer wissen will, wann sich der Besitz ändert (Shop, Sammlung). */
    beiAenderung(horcher) {
        if (typeof horcher === "function") {
            BESITZ._horcher.push(horcher);
        }
    },

    _melden() {
        for (const horcher of BESITZ._horcher) {
            try {
                horcher();
            } catch (fehler) {
                console.error("Besitz-Horcher:", fehler);
            }
        }
    }
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = BESITZ;
}
