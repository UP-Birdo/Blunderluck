/*
 * messung-download.js — WIE VIEL LÄDT EIN SPIELER JE STUNDE? (seit v0.152.5)
 *
 * Kein Test für sich (der Testläufer nimmt nur `test-*.js`), sondern das
 * Mess-Werkzeug, das `test-weniger-download.js` benutzt. Es lässt sich auch
 * gegen eine ANDERE Fassung der Dateien laufen lassen — so ist die
 * Vorher-Zahl entstanden (Ordner mit den js-Dateien von v0.152.4):
 *
 *     node tests\messung-download.js <ordner-mit-js>
 *
 * WAS GEMESSEN WIRD: eine Stunde im Leben eines Spielers, gegen einen
 * nachgebauten Server (dieselbe Art Nachbau wie in test-schach-speicher.js),
 * der jede Antwort in Bytes zählt (JSON-Länge der Nutzlast) und jede Anfrage.
 * Der Abgleich wird nachgespielt, wie `Abgleich.fremdenStandHolen` ihn fährt:
 * je Takt die Marke (13 Byte), bei neuer Marke der Ladeweg des Schachs
 * (`SCHACH_SPEICHER.tafelLaden` ohne offene Partie, `partieAuffrischen` mit).
 * Der Takt kommt aus `SCHACH_SPEICHER.abfrageTakt`, wenn es ihn gibt — sonst
 * alle 3 Sekunden wie bis v0.152.4.
 *
 * DER SERVER (gleich für beide Fassungen, gebaut mit den Funktionen der
 * gemessenen Fassung; jede Partie auf 8 Kilobyte aufgefüllt wie eine
 * echte): 10 eigene und 30 fremde beendete Partien mit
 * Chronik, 4 fremde laufende (je alle 20 s ein Zug, versetzt — die Marke
 * springt also alle 5 s), 1 fremde wartende Runde. Alle 15 Minuten endet
 * eine fremde laufende (neuer Chronik-Eintrag) und eine neue beginnt.
 *
 * DIE LAGEN:
 *   start   — keine Partie offen (Start, Sammlung, Rangliste)
 *   mensch  — eigene Partie gegen einen Menschen, der alle 20 s zieht
 *   bob     — eigene Partie gegen Bob (das Gerät schreibt alle 30 s einen
 *             Zug; die Partie kennt es danach schon, die Marke springt)
 *
 * NICHT enthalten: die Kopfzeilen der Anfragen (je Anfrage einige hundert
 * Byte; deshalb steht die Zahl der Anfragen daneben), das eigene Schreiben,
 * die Spielerliste (ihr Anteil ist die Marke je Takt; dort gilt dasselbe
 * Verhältnis 3 s zu 15 s) und das Aufräumen (es ändert den Server, nicht
 * die Abfragen einer Stunde — dafür die Lage „aufgeräumt": derselbe Server
 * ohne die Partien, die das Aufräumen löschen darf).
 */

const pfad = require("path");

function codeLaden(jsOrdner) {
    const geraet = {};
    globalThis.window = {
        localStorage: {
            getItem(s) { return Object.prototype.hasOwnProperty.call(geraet, s) ? geraet[s] : null; },
            setItem(s, w) { geraet[s] = String(w); },
            removeItem(s) { delete geraet[s]; }
        }
    };
    globalThis.SCHACH_VARIANTEN = require(pfad.join(jsOrdner, "schach-varianten.js"));
    globalThis.SCHACH = require(pfad.join(jsOrdner, "schach.js"));
    globalThis.SCHACH_RUNDE = require(pfad.join(jsOrdner, "schach-runde.js"));
    require(pfad.join(jsOrdner, "schach-runde-faehigkeiten.js"));
    globalThis.SCHACH_TAFEL = require(pfad.join(jsOrdner, "schach-tafel.js"));
    const speicher = require(pfad.join(jsOrdner, "schach-speicher.js"));
    return { SCHACH_SPEICHER: speicher, geraet: geraet };
}

/* Der Server-Nachbau: zählt Bytes und Anfragen. */
function nachbau(baum) {
    const server = {
        art: "gemeinsam",
        baum: baum,
        bytes: 0,
        anfragen: 0,
        async teilLaden(unterpfad, flach) {
            server.anfragen++;
            let knoten = server.baum;
            for (const teil of String(unterpfad || "").split("/").filter((t) => t)) {
                knoten = (knoten && typeof knoten === "object") ? knoten[teil] : undefined;
            }
            let antwort = (knoten === undefined) ? null : knoten;
            if (flach && antwort && typeof antwort === "object") {
                const schluessel = {};
                Object.keys(antwort).forEach((k) => { schluessel[k] = true; });
                antwort = schluessel;
            }
            const text = JSON.stringify(antwort);
            server.bytes += text.length;
            return JSON.parse(text);
        },
        async teilSchreiben() {
            /* Die Messung schreibt nicht. */
        },
        marke() {
            server.anfragen++;
            server.bytes += String(server.baum.geaendertAm).length;
            return server.baum.geaendertAm;
        }
    };
    return server;
}

const ICH = "id-ich";
const STUNDE = 3600 * 1000;
const TAG = 24 * STUNDE;

function partieBauen(id, weiss, schwarz, zeitpunkt, ergebnis) {
    let partie = SCHACH_RUNDE.leereRunde(zeitpunkt, SCHACH_VARIANTEN.liste[0].id, id, "Partie " + id);
    partie = SCHACH_RUNDE.teamBeitreten(partie, weiss, "weiss", zeitpunkt);
    if (schwarz) {
        partie = SCHACH_RUNDE.teamBeitreten(partie, schwarz, "schwarz", zeitpunkt);
    }
    partie = SCHACH_RUNDE.kopieren(partie);
    if (ergebnis) {
        partie.laeuft = false;
        partie.ergebnis = ergebnis;
    } else if (schwarz) {
        partie.laeuft = true;
    }
    partie.geaendertAm = zeitpunkt;

    /* Eine frisch gebaute Partie ist klein; eine echte mit Verlauf und
       Brett liegt bei rund 8 Kilobyte (gemessen 18.09.2026, Kopf von
       js\schach-speicher.js). Die Füllung bringt sie auf diese Grösse —
       beim Laden fällt sie durch das Normalisieren wieder heraus. */
    const laenge = JSON.stringify(partie).length;
    if (laenge < PARTIE_BYTES) {
        partie.fuellung = "x".repeat(PARTIE_BYTES - laenge - 14);
    }
    return partie;
}

const PARTIE_BYTES = 8000;

/* Der Server zu Beginn der Stunde. `aufgeraeumt`: ohne die beendeten
   Partien, die älter als eine Woche sind (so sieht er aus, wenn alle
   Geräte aufgeräumt haben). */
function serverBauen(lage, beginn, aufgeraeumt) {
    const baum = { datenVersion: 1, geaendertAm: beginn, partien: {}, uebersicht: {}, chronik: [] };
    const setzen = (partie, marke) => {
        baum.partien[partie.id] = partie;
        baum.uebersicht[partie.id] = SCHACH_TAFEL.uebersichtEintrag(partie, marke);
        if (partie.ergebnis) {
            baum.chronik.push(SCHACH_TAFEL._chronikEintrag(partie));
        }
    };

    /* 40 beendete: 10 eigene, 30 fremde; je die Hälfte älter als 30 Tage,
       ein Fünftel jünger als eine Woche. */
    for (let n = 0; n < 40; n++) {
        const alter = (n % 5 === 0) ? 2 * TAG : 40 * TAG;
        const eigen = n < 10;
        const partie = partieBauen("p-ende-" + n, eigen ? ICH : "id-x" + n, "id-y" + n,
            beginn - alter, (n % 2) ? "weiss" : "schwarz");
        if (aufgeraeumt && alter > 7 * TAG) {
            baum.chronik.push(SCHACH_TAFEL._chronikEintrag(partie));
            continue;
        }
        setzen(partie, beginn - alter);
    }
    for (let n = 0; n < 4; n++) {
        setzen(partieBauen("p-fremd-" + n, "id-a" + n, "id-b" + n, beginn - STUNDE), beginn - STUNDE);
    }
    setzen(partieBauen("p-wartet", "id-c", "", beginn - STUNDE), beginn - STUNDE);

    if (lage === "mensch") {
        setzen(partieBauen("p-ich", ICH, "id-gegner", beginn - STUNDE), beginn - STUNDE);
    }
    if (lage === "bob") {
        setzen(partieBauen("p-ich", ICH, "bot", beginn - STUNDE), beginn - STUNDE);
    }
    return baum;
}

function zug(baum, id, zeit) {
    const partie = baum.partien[id];
    if (!partie) {
        return;
    }
    partie.zugZaehler = (partie.zugZaehler || 0) + 1;
    partie.geaendertAm = zeit;
    baum.uebersicht[id] = SCHACH_TAFEL.uebersichtEintrag(partie, zeit);
    baum.geaendertAm = zeit;
}

async function lageMessen(SCHACH_SPEICHER, lage, aufgeraeumt) {
    const beginn = 1790000000000;
    const baum = serverBauen(lage, beginn, aufgeraeumt);
    const server = nachbau(baum);
    const offeneId = (lage === "start") ? "" : "p-ich";

    const TAKTE = { partie: 3000, vorraum: 3000, bob: 15000, start: 15000, spieler: 15000 };
    const taktVon = () => {
        if (typeof SCHACH_SPEICHER.abfrageTakt !== "function") {
            return 3000;
        }
        const partie = offeneId ? baum.partien[offeneId] : null;
        const wert = SCHACH_SPEICHER.abfrageTakt(partie, TAKTE);
        return Math.max(3000, Math.ceil(wert / 3000) * 3000);
    };

    /* Der Start der Seite: einmal alles. */
    let tafel = await SCHACH_SPEICHER.tafelLaden(server, ICH, SCHACH_TAFEL.leereTafel(),
        { aufraeumen: false, jetzt: beginn });
    let gesehen = baum.geaendertAm;

    let naechsteAbfrage = beginn + taktVon();
    let neueNummer = 4;
    for (let t = beginn + 1000; t <= beginn + STUNDE; t += 1000) {
        const sekunde = (t - beginn) / 1000;

        /* Die fremden Züge: jede laufende alle 20 s, versetzt. */
        for (let n = 0; n < 4; n++) {
            if ((sekunde + n * 5) % 20 === 0) {
                zug(baum, "p-fremd-" + ((neueNummer - 4) + n), t);
            }
        }
        if (lage === "mensch" && sekunde % 20 === 10) {
            zug(baum, "p-ich", t);
        }
        /* Gegen Bob schreibt DIESES Gerät beide Züge (den eigenen und
           Bobs) — `SCHACH_SPEICHER.schreiben` merkt sich dabei die Marke
           der Partie, holt sie also nicht zurück; die Marke der Tafel
           springt trotzdem, wie bei jedem Schreiben. */
        if (lage === "bob" && sekunde % 30 === 0) {
            zug(baum, "p-ich", t);
            SCHACH_SPEICHER._gesehen["p-ich"] = t;
        }

        /* Alle 15 Minuten endet eine fremde, eine neue beginnt. */
        if (sekunde % 900 === 0) {
            const alt = "p-fremd-" + (neueNummer - 4);
            const partie = baum.partien[alt];
            if (partie) {
                partie.laeuft = false;
                partie.ergebnis = "weiss";
                partie.geaendertAm = t;
                baum.uebersicht[alt] = SCHACH_TAFEL.uebersichtEintrag(partie, t);
                baum.chronik.push(SCHACH_TAFEL._chronikEintrag(partie));
            }
            const neu = partieBauen("p-fremd-" + neueNummer, "id-a" + neueNummer, "id-b" + neueNummer, t);
            baum.partien[neu.id] = neu;
            baum.uebersicht[neu.id] = SCHACH_TAFEL.uebersichtEintrag(neu, t);
            baum.geaendertAm = t;
            neueNummer++;
        }

        if (t < naechsteAbfrage) {
            continue;
        }
        naechsteAbfrage = t + taktVon();

        const marke = server.marke();
        if (marke === gesehen) {
            continue;
        }
        tafel = offeneId
            ? await SCHACH_SPEICHER.partieAuffrischen(server, tafel, offeneId)
            : await SCHACH_SPEICHER.tafelLaden(server, ICH, tafel, { aufraeumen: false, jetzt: t });
        gesehen = marke;
    }

    return {
        bytes: server.bytes,
        anfragen: server.anfragen,
        fremdeLaufendeGeholt: Object.keys(tafel.partien).filter((id) => /^p-fremd-/.test(id)
            && !tafel.partien[id].ergebnis).length
    };
}

async function messen(jsOrdner) {
    const { SCHACH_SPEICHER } = codeLaden(jsOrdner);
    const ergebnis = {};
    for (const lage of ["start", "mensch", "bob"]) {
        SCHACH_SPEICHER.vergessen();
        ergebnis[lage] = await lageMessen(SCHACH_SPEICHER, lage, false);
    }
    SCHACH_SPEICHER.vergessen();
    ergebnis.startAufgeraeumt = await lageMessen(SCHACH_SPEICHER, "start", true);
    return ergebnis;
}

module.exports = { messen: messen };

if (require.main === module) {
    const ordner = process.argv[2] || pfad.join(__dirname, "..", "js");
    messen(pfad.resolve(ordner)).then((ergebnis) => {
        console.log(JSON.stringify(ergebnis, null, 4));
    }).catch((fehler) => {
        console.error(fehler);
        process.exit(1);
    });
}
