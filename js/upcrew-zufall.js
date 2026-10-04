/*
 * upcrew-zufall.js — Zufall mit SEED für alle UPCrew-Spiele (rein: kein Bildschirm, kein Speicher, kein Netz).
 * Gemeinsamer Baustein: in die Apps KOPIEREN, nie abwandeln (Blunderluck seit v0.160.0; Typoluck baut
 * ihn später ein, siehe EINBAU-2026-09-30.md).
 *
 * Nutzer, 28.09.2026: „evtl macht es sinn in beiden spielen seeds einzubauen“ → „ja seeds einbauen“. Entschieden
 * (28.09.2026 spät):
 *   - Die SCHWIERIGKEIT kommt vom Ort bzw. Buch, die ABWECHSLUNG vom Seed.
 *   - Seed = Spieler + Turm/Buch + Durchgang. Gespeichert wird NUR die Durchgangsnummer; alles andere lässt sich
 *     jederzeit neu rechnen (jedes Gerät, jedes Mal dasselbe).
 *   - Dazu ein TAGES-SEED, der für alle gleich ist (Tagesbrett, Tageswort, Tagesangebot).
 *   - Dieser Baustein ersetzt `Math.random` für SPIELINHALTE. Was nicht Spielinhalt ist (Konfetti, Partikel, der
 *     Würfel der Sammlung) darf weiter `Math.random` nehmen. Bobs Züge hängen NICHT am Seed.
 *   - Der Generator hat eine VERSIONSNUMMER. Ein laufender Durchgang behält seine Version: Die App merkt sich die
 *     Version beim Beginn des Durchgangs (z. B. als Zahl im Zähler) und gibt sie hier wieder mit. Eine neue Version
 *     kommt nur mit einem NEUEN Generator dazu — die alten bleiben in `GENERATOREN` stehen und rechnen genau wie vorher.
 *
 * WIE ES RECHNET (Version 1):
 *   hash   FNV-1a (32 Bit) über die Zeichen des Seed-Texts, danach durchmischt (murmur3-Finalizer), damit ähnliche
 *          Texte („…|1“, „…|2“) weit auseinanderliegende Zahlen ergeben.
 *   folge  mulberry32: aus einer 32-Bit-Zahl eine Folge von Zahlen in [0, 1) — gleich auf jedem Gerät, jedem Browser.
 *   Der Seed-Text ist sichtbar und prüfbar, z. B. „anna#4821|turm|2|3|v1“.
 *
 * Nutzung:
 *     const s = UPCREW_ZUFALL.spielSeed({ spieler: "anna#4821", welt: "turm", durchgang: 3, teil: [2] });
 *               // → { text: "anna#4821|turm|2|3|v1", zahl: 2276217332, hex: "87AC51F4", version: 1 }
 *               //   `teil` = wahlfreie Zusätze vor dem Durchgang (z. B. der Ort im Turm, das Buch)
 *     const t = UPCREW_ZUFALL.tagesSeed("2026-09-30", "tagesbrett");   // für alle gleich
 *     const z = UPCREW_ZUFALL.folge(s);            // oder folge(zahl, version)
 *     z()                  → Zahl in [0, 1)
 *     z.ganz(6)            → 0 … 5
 *     z.zwischen(15, 30)   → 15 … 30 (beide Enden eingeschlossen)
 *     z.chance(0.1)        → true in 10 % der Fälle
 *     z.eins(liste)        → ein Eintrag
 *     z.mischen(liste)     → neue, gemischte Liste (die alte bleibt)
 *     z.gewichtet({ g: 46, e: 16 }) → ein Schlüssel nach Gewicht
 *     z.zweig("truhe")     → eine EIGENE Folge für einen Teilbereich: Kommt später an einer Stelle eine Ziehung dazu,
 *                            verschiebt sich dadurch nichts in den anderen Zweigen.
 *     UPCREW_ZUFALL.version(gespeichert)  → die gespeicherte Version, wenn es sie gibt, sonst die neueste
 *     UPCREW_ZUFALL.heute(jetzt)          → „JJJJ-MM-TT“ nach der Uhr des Geräts
 *
 * Keine App-Eigenheiten hier: Was eine Ziehung bedeutet (Station, Gegner, Wort), entscheidet die App.
 */
(function () {
    "use strict";

    /* Die neueste Version — neue Durchgänge beginnen mit ihr. */
    const VERSION = 1;

    /* ---------------------------------------------------------------- *
     * Text → 32-Bit-Zahl
     * ---------------------------------------------------------------- */
    function hash(text) {
        let h = 2166136261 >>> 0;
        for (const zeichen of String(text)) {
            h ^= zeichen.codePointAt(0);
            h = Math.imul(h, 16777619) >>> 0;
        }
        h ^= h >>> 16;
        h = Math.imul(h, 2246822507) >>> 0;
        h ^= h >>> 13;
        h = Math.imul(h, 3266489909) >>> 0;
        h ^= h >>> 16;
        return h >>> 0;
    }

    const hex = (zahl) => (zahl >>> 0).toString(16).toUpperCase().padStart(8, "0");

    /* ---------------------------------------------------------------- *
     * Die Generatoren je Version. NIE ÄNDERN — nur neue dazuschreiben.
     * Jeder liefert zu einer 32-Bit-Zahl eine Funktion, die bei jedem Aufruf
     * die nächste Zahl in [0, 1) gibt.
     * ---------------------------------------------------------------- */
    const GENERATOREN = {
        1: function mulberry32(start) {
            let a = start >>> 0;
            return function () {
                a = (a + 0x6D2B79F5) >>> 0;
                let t = a;
                t = Math.imul(t ^ (t >>> 15), t | 1);
                t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
                return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
            };
        }
    };
    const VERSIONEN = Object.keys(GENERATOREN).map(Number);

    /* Die Version eines Durchgangs: die gespeicherte, wenn es sie gibt — sonst die neueste. */
    function version(gespeichert) {
        const v = Number(gespeichert);
        return (Number.isInteger(v) && GENERATOREN[v]) ? v : VERSION;
    }

    /* ---------------------------------------------------------------- *
     * Seeds
     * ---------------------------------------------------------------- */
    function seed(teile, v) {
        const ver = version(v);
        const liste = (Array.isArray(teile) ? teile : [teile]).map((t) => String(t === undefined || t === null ? "" : t));
        const text = liste.concat("v" + ver).join("|");
        const zahl = hash(text);
        return { text: text, zahl: zahl, hex: hex(zahl), version: ver };
    }

    /* Spieler + Welt (Turm/Buch) + wahlfreie Zusätze + Durchgang. Der Spieler wird klein geschrieben und getrimmt,
       damit „Anna#4821“ und „anna#4821 “ denselben Weg bekommen. */
    function spielSeed(angabe) {
        const a = angabe || {};
        const spieler = String(a.spieler || "gast").trim().toLowerCase();
        const durchgang = (Number.isInteger(a.durchgang) && a.durchgang > 0) ? a.durchgang : 1;
        const teil = Array.isArray(a.teil) ? a.teil : (a.teil === undefined ? [] : [a.teil]);
        return seed([spieler, a.welt || "spiel"].concat(teil, [durchgang]), a.version);
    }

    /* Für alle gleich: nur Datum und Zweck, kein Spieler. */
    function tagesSeed(datum, zweck, v) {
        const tag = /^\d{4}-\d{2}-\d{2}$/.test(String(datum)) ? String(datum) : heute();
        return seed(["tag", tag, zweck || "tag"], v);
    }

    function heute(jetzt) {
        const d = new Date(typeof jetzt === "number" ? jetzt : Date.now());
        const zwei = (n) => (n < 10 ? "0" : "") + n;
        return d.getFullYear() + "-" + zwei(d.getMonth() + 1) + "-" + zwei(d.getDate());
    }

    /* ---------------------------------------------------------------- *
     * Die Folge mit ihren Helfern
     * ---------------------------------------------------------------- */
    function folge(s, v) {
        const istSeed = !!s && typeof s === "object";
        const zahl = istSeed ? s.zahl : s;
        const ver = version(istSeed ? s.version : v);
        const roh = GENERATOREN[ver](Number(zahl) >>> 0);
        const n = function () {
            return roh();
        };
        n.version = ver;
        n.zahl = Number(zahl) >>> 0;
        n.ganz = (bis) => Math.floor(roh() * Math.max(0, Math.floor(bis)));
        n.zwischen = (von, bis) => von + Math.floor(roh() * (bis - von + 1));
        n.chance = (p) => roh() < p;
        n.eins = (liste) => liste[Math.floor(roh() * liste.length)];
        n.mischen = (liste) => {
            const l = liste.slice();
            for (let i = l.length - 1; i > 0; i--) {
                const j = Math.floor(roh() * (i + 1));
                const t = l[i];
                l[i] = l[j];
                l[j] = t;
            }
            return l;
        };
        n.gewichtet = (gewichte) => {
            const schluessel = Object.keys(gewichte).filter((k) => gewichte[k] > 0);
            const summe = schluessel.reduce((a, k) => a + gewichte[k], 0);
            let r = roh() * summe;
            for (const k of schluessel) {
                r -= gewichte[k];
                if (r < 0) {
                    return k;
                }
            }
            return schluessel[schluessel.length - 1];
        };
        n.zweig = (name) => folge(hash(hex(n.zahl) + "|" + name), ver);
        return n;
    }

    const UPCREW_ZUFALL = { VERSION: VERSION, VERSIONEN: VERSIONEN, hash: hash, hex: hex, version: version,
        seed: seed, spielSeed: spielSeed, tagesSeed: tagesSeed, heute: heute, folge: folge };
    globalThis.UPCREW_ZUFALL = UPCREW_ZUFALL;
    if (typeof module !== "undefined" && module.exports) {
        module.exports = UPCREW_ZUFALL;
    }
})();
