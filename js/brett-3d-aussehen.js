/*
 * brett-3d-aussehen.js — WAS am 3D-Brett gilt, ohne three.js (seit v0.166.0).
 *
 * ANLASS (Befund der Nacht 04.10.2026, Tabelle 2, Punkt B): Sammlung und Shop
 * fragen SYNCHRON nach dem geltenden Aussehen des 3D-Bretts (`aussehen`,
 * `aussehenFrei`, `aussehenWaehlen`). Bis v0.165.1 standen diese Auskünfte im
 * Modul js\brett-3d.js — darum musste das Modul samt three.js (690 KB) VOR
 * dem ersten Bild geladen und übersetzt sein. Sie brauchen aber nichts von
 * three.js: nur den Gerätespeicher (`blunderluck.brett3d`), die Freischaltung
 * und die Namen der Themen und Stile.
 *
 * EINE QUELLE DER WAHRHEIT: Die Tabellen (Themen, Figuren-Stile, Blicke,
 * Kacheln, Tempi, Vorgabe) und das Laden, Speichern, Prüfen und Wählen stehen
 * NUR hier. Das Modul nimmt dieselben Tabellen und ruft dieselben Funktionen
 * (`const A = BRETT_3D_AUSSEHEN` oben in js\brett-3d.js); was dort zusätzlich
 * gilt, ist nur der Zustand des fertigen Bretts (`Z.einst`), den es als
 * Argument hereinreicht. Solange das Modul nicht geladen ist, beantwortet
 * der Platzhalter `BRETT_3D` (js\brett-3d-start.js) die drei Fragen von hier.
 *
 * Die Blicke tragen ihren Winkel in Grad — das Modul rechnet ihn mit
 * three.js in Bogenmass um (`THREE.MathUtils.degToRad`, wie bis v0.165.1).
 *
 * Klassisches Skript, lädt nach js\freischaltung.js (fragt es erst beim
 * Aufruf). tests\test-3d-laden.js prüft Wert für Wert gegen die Fassung
 * v0.165.1.
 */

const BRETT_3D_AUSSEHEN = {
    SPEICHER_SCHLUESSEL: "blunderluck.brett3d",

    THEMEN: {
        blunderluck: { name: "Blunderluck", hell: "#eef2f7", dunkel: "#4a7fb5", rahmen: "#1d2330", sockel: "#141821" },
        holz:        { name: "Holz",        hell: "#ecd3a8", dunkel: "#a0703f", rahmen: "#4b2e18", sockel: "#2c1a0c" },
        turnier:     { name: "Turnier",     hell: "#eeeed2", dunkel: "#769656", rahmen: "#2f3a24", sockel: "#1b2215" },
        marmor:      { name: "Marmor",      hell: "#efeeea", dunkel: "#80868e", rahmen: "#2b2d31", sockel: "#18191c" },
        nacht:       { name: "Nacht",       hell: "#56607a", dunkel: "#262c3b", rahmen: "#0f1219", sockel: "#07090d" }
    },

    FIGUR_STILE: {
        /* Die Vorgabe trägt das Material der alten gerenderten Figuren
           (tools\Figuren-Blender.py: Rauheit 0,60, Glanz 0,25, kein Lack) —
           Nutzer 24.09.2026: „sollen genauso matt bleiben wie die alten". */
        emaille:   { name: "Emaille",   weiss: "#f2ecdf", schwarz: "#2b2e35", rau: 0.6, metall: 0.0, lack: 0.0, lackRau: 0.5, glanz: 0.5 },
        porzellan: { name: "Porzellan", weiss: "#f6f4ef", schwarz: "#1f2228", rau: 0.26, metall: 0.0, lack: 0.8, lackRau: 0.08 },
        matt:      { name: "Matt",      weiss: "#ebe5d8", schwarz: "#35383f", rau: 0.85, metall: 0.0, lack: 0.0, lackRau: 0.5 },
        metall:    { name: "Metall",    weiss: "#d9dde3", schwarz: "#8a5a2b", rau: 0.32, metall: 0.9, lack: 0.2, lackRau: 0.2 }
    },

    /* Blickwinkel als Abstand von der Senkrechten, in Grad. v0.132.0 bis
       v0.140.3 höchstens 17 Grad (bei 40 Grad verdeckte jede Figur die
       dahinter, Nutzer-Foto 24.09.2026). TEST 25.09.2026 (Nutzer: „der
       Blickwinkel soll nicht mehr so steil sein", dazu grössere Figuren):
       „Schräg" 30 Grad — Überdeckung wird dafür in Kauf genommen. */
    BLICKE: {
        oben:    { name: "Oben",   grad: 4 },
        schraeg: { name: "Schräg", grad: 30 }
    },

    KACHELN: {
        rund:   { name: "Rund",   rundung: 0.12, fase: 0.035, fuge: 0.07 },
        kantig: { name: "Kantig", rundung: 0.02, fase: 0.012, fuge: 0.03 }
    },

    TEMPI: {
        flott:  { name: "Flott",  faktor: 0.72 },
        normal: { name: "Normal", faktor: 1.0 }
    },

    /* `an` ist seit v0.144.0 ab Werk AUS: 3D ist eine Freischaltung
       (js\freischaltung.js), wer nichts gewählt hat, spielt 2D. */
    VORGABE: {
        an: false, thema: "blunderluck", figuren: "emaille", blick: "schraeg",
        kacheln: "rund", schatten: true, tempo: "normal"
    },

    /* ---------------------------------------------------------------- *
     * Einstellungen laden und speichern (nur auf diesem Gerät)
     * ---------------------------------------------------------------- */

    einstellungenLaden() {
        const A = BRETT_3D_AUSSEHEN;
        let gespeichert = {};
        try {
            gespeichert = JSON.parse(localStorage.getItem(A.SPEICHER_SCHLUESSEL) || "{}") || {};
        } catch (fehler) {
            gespeichert = {};
        }
        /* Ohne Admin-Freigabe gilt die Vorgabe — auch wenn auf diesem Gerät
           noch ein älteres eigenes Aussehen gespeichert ist (seit v0.129.0).
           Seit v0.145.0 zählt die Werkstatt mit (`aussehenFrei`), wie im Tab
           „Sammlung". Brett-Thema und Figuren gelten seit v0.147.0 JE STÜCK,
           sobald ihr Ort im Turm erreicht ist (js\freischaltung.js). */
        const einst = Object.assign({}, A.VORGABE, A.aussehenFrei() ? gespeichert : {});
        for (const schluessel of ["thema", "figuren"]) {
            if (typeof gespeichert[schluessel] === "string" && A.stueckFrei(schluessel, gespeichert[schluessel])) {
                einst[schluessel] = gespeichert[schluessel];
            }
        }
        /* 2D oder 3D wählt seit v0.144.0 jeder selbst (Tab „Anpassen") — die
           Wahl gilt also auch ohne Admin-Freigabe, aber nur, solange 3D frei
           ist. Die Antwort gibt allein js\freischaltung.js. */
        einst.an = A.dreiDGilt();
        /* Seit v0.157.3: 3D-Figuren auf dem 2D-Brett — nur gemerkt, damit
           `einstellungenSpeichern` die Wahl nicht verliert. */
        einst.oben = typeof FREISCHALTUNG !== "undefined" && FREISCHALTUNG.brett() === "oben";
        /* Seit v0.159.0: 2D-Figuren als Scheiben auf dem 3D-Brett. */
        einst.scheiben = typeof FREISCHALTUNG !== "undefined" && FREISCHALTUNG.brett() === "scheiben";
        if (!A.THEMEN[einst.thema]) einst.thema = A.VORGABE.thema;
        if (!A.FIGUR_STILE[einst.figuren]) einst.figuren = A.VORGABE.figuren;
        if (!A.BLICKE[einst.blick]) einst.blick = A.VORGABE.blick;
        if (!A.KACHELN[einst.kacheln]) einst.kacheln = A.VORGABE.kacheln;
        if (!A.TEMPI[einst.tempo]) einst.tempo = A.VORGABE.tempo;
        return einst;
    },

    /* Gilt gerade das 3D-BRETT (mit 3D-Figuren oder, seit v0.159.0, mit
       2D-Scheiben)? Ohne js\freischaltung.js (darf nicht sein) bleibt es 2D. */
    dreiDGilt() {
        if (typeof FREISCHALTUNG === "undefined") return false;
        const art = FREISCHALTUNG.brett();
        return art === "3d" || art === "scheiben";
    },

    dreiDFrei() {
        return typeof FREISCHALTUNG !== "undefined" && FREISCHALTUNG.dreiDFrei();
    },

    /*
     * THEMA UND FIGUREN SCHREIBT NUR, WER SIE GERADE WÄHLT (seit v0.164.1,
     * Prüfung Besitz + Kauf vom 04.10.2026, Fund 8). `einstellungenLaden`
     * kürzt eine gemerkte Wahl auf die Vorgabe, solange das Stück (noch)
     * nicht frei ist — etwa ein gekauftes Thema, bevor der Besitz vom Konto
     * angekommen ist. Bis v0.164.0 schrieb jedes Speichern (Schatten, der
     * andere Schlüssel …) diese gekürzte Anzeige zurück, und die Wahl war weg.
     * Jetzt bleibt für `thema` und `figuren` stehen, was im Speicher steht —
     * ausser für den Schlüssel `gewaehlt`, den der Spieler gerade selbst
     * gesetzt hat. Gekürzt wird nur die Anzeige (wie `BRETT_DESIGN.wahl`).
     * `einst` ist, was gilt: am fertigen Brett `Z.einst` (das Modul reicht es
     * herein), vor dem Aufbau die frisch geladenen Einstellungen.
     *
     * DIE BRETT-ART (`an`, `oben`, `scheiben`) SCHREIBT HIER NIEMAND (seit
     * v0.165.0): Sie wählt der Spieler allein über `FREISCHALTUNG.brettSetzen`,
     * das selbst speichert. `einst` hält davon nur die auf das Freie gekürzte
     * Anzeige — bis v0.164.1 wurde die zurückgeschrieben, und baute sich das
     * Brett vor dem Konto (Ort 0, nichts frei), war die 3D-Wahl weg. Fehlt ein
     * Feld im Speicher, wird es auch nicht erfunden.
     */
    einstellungenSpeichern(gewaehlt, einst) {
        const A = BRETT_3D_AUSSEHEN;
        const aus = Object.assign({}, einst);
        for (const art of ["an", "oben", "scheiben"]) delete aus[art];
        try {
            const gemerkt = JSON.parse(localStorage.getItem(A.SPEICHER_SCHLUESSEL) || "{}") || {};
            for (const art of ["an", "oben", "scheiben"]) {
                if (art in gemerkt) aus[art] = gemerkt[art];
            }
            if (gewaehlt !== "thema" && typeof gemerkt.thema === "string" && A.THEMEN[gemerkt.thema]) {
                aus.thema = gemerkt.thema;
            }
            if (gewaehlt !== "figuren" && typeof gemerkt.figuren === "string" && A.FIGUR_STILE[gemerkt.figuren]) {
                aus.figuren = gemerkt.figuren;
            }
        } catch (fehler) {
            /* unlesbar: dann gibt es nichts Gemerktes zu behalten */
        }
        try {
            localStorage.setItem(A.SPEICHER_SCHLUESSEL, JSON.stringify(aus));
        } catch (fehler) {
            /* privates Fenster: dann eben nur für diese Sitzung */
        }
    },

    /* ---------------------------------------------------------------- *
     * Wer darf was wählen
     * ---------------------------------------------------------------- */

    /*
     * DAS AUSSEHEN STELLT NUR DER ADMIN UM (seit v0.129.0, Nutzer-Ansage
     * 24.09.2026: „die Farben-Einstellungen nur der Admin — in den
     * Admin-Einstellungen ein Anpassungs-Knopf an/aus"). Zu sehen ist der
     * Paletten-Knopf nur, wenn auf diesem Gerät die Verwaltung freigeschaltet
     * UND dort „Brett-Anpassung" eingeschaltet ist (`ICH.anpassungAn`).
     */
    anpassungErlaubt() {
        return typeof ICH !== "undefined" && !!ICH.verwaltungAktiv && ICH.verwaltungAktiv()
            && !!ICH.anpassungAn && ICH.anpassungAn();
    },

    /*
     * BRETT-THEMA UND FIGUREN SIND FREI (seit v0.145.0, Tab „Sammlung",
     * Runde 4): mit der Admin-Freigabe oben ODER in der Werkstatt
     * (js\freischaltung.js). Für alle anderen gilt die Vorgabe, bis der Turm
     * (Runde 5) die Themen über Orte freischaltet. Der Paletten-Knopf am
     * Brett bleibt dem Admin vorbehalten (`anpassungZeigen` im Modul).
     */
    aussehenFrei() {
        return BRETT_3D_AUSSEHEN.anpassungErlaubt()
            || (typeof FREISCHALTUNG !== "undefined" && FREISCHALTUNG.werkstatt());
    },

    /* Ein einzelnes Thema oder ein Figuren-Stil frei? (seit v0.147.0) Die
       Antwort gibt js\freischaltung.js — der Turm schaltet sie je Ort frei. */
    stueckFrei(schluessel, wert) {
        if (typeof FREISCHALTUNG !== "undefined" && typeof FREISCHALTUNG.brettStueckFrei === "function") {
            return FREISCHALTUNG.brettStueckFrei(schluessel, wert);
        }
        return BRETT_3D_AUSSEHEN.aussehenFrei() || wert === BRETT_3D_AUSSEHEN.VORGABE[schluessel];
    },

    /* ---------------------------------------------------------------- *
     * Die drei Auskünfte für Sammlung und Shop
     * ---------------------------------------------------------------- */

    /* Was gerade gilt — `einst` vom fertigen Brett, sonst aus dem Speicher. */
    aussehenLesen(einst) {
        const gilt = einst || BRETT_3D_AUSSEHEN.einstellungenLaden();
        return { thema: gilt.thema, figuren: gilt.figuren };
    },

    /*
     * Brett-Thema oder Figuren wählen (seit v0.145.0, „Übernehmen" im Tab
     * „Sammlung"). Nur Bekanntes und nur, wenn es frei ist; gespeichert wird
     * wie über die Paletten-Tafel. Mit `einst` (das fertige Brett, `Z.einst`)
     * wird dort eingetragen und gespeichert — neu zeichnet das Modul selbst.
     * Ohne `einst` (noch nicht aufgebaut oder gar nicht geladen) wird nur
     * gespeichert; der Aufbau liest es dann.
     */
    aussehenWaehlen(schluessel, wert, einst) {
        const A = BRETT_3D_AUSSEHEN;
        const liste = schluessel === "thema" ? A.THEMEN : schluessel === "figuren" ? A.FIGUR_STILE : null;
        if (!liste || !liste[wert] || !A.stueckFrei(schluessel, wert)) return false;
        const ziel = einst || A.einstellungenLaden();
        ziel[schluessel] = wert;
        A.einstellungenSpeichern(schluessel, ziel);
        return true;
    }
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = BRETT_3D_AUSSEHEN;
}
