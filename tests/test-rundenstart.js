/*
 * test-rundenstart.js — eine neue Runde zeigt nie das Ergebnis der alten,
 * und gegen Bob geht es direkt los (seit v0.155.1).
 *
 * Nutzer 28.09.2026: „wenn man eine Runde startet, kommt immer das Ergebnis
 * von der letzten Runde — mach das raus, macht alles kaputt" · „wenn ich eine
 * Runde starte mit einem bot soll es direkt los gehen, es soll davor schon
 * feststehen, welche Farbe ich bekomme, aber es soll auch random sein".
 *
 * Nachgestellt (echter Bildschirm im nachgebauten DOM, bildschirm-umgebung.js):
 * Runde gegen Bob starten → Partie endet → Abschluss erscheint → man wischt
 * ihn weg, OHNE zu schliessen → neue Runde starten. Bis v0.155.0 stand dann
 * der alte Abschluss über der neuen Runde. Geprüft: kein alter Abschluss,
 * die alte Partie ist gebucht (genau einmal) und abgehakt; die neue läuft
 * sofort, die Seite steht in der ersten Fassung und bleibt beim Neuladen.
 *
 * Aufruf: siehe tests\README.md
 */

const { umgebung, TEAM_SCHACH, SCHACH_TAFEL, SCHACH_VARIANTEN, SCHACH_RUNDE, SCHACH_BOT } =
    require("./bildschirm-umgebung.js");

let anzahlOk = 0;
let anzahlFehler = 0;

async function pruefe(bezeichnung, funktion) {
    try {
        await funktion();
        anzahlOk++;
    } catch (fehler) {
        anzahlFehler++;
        console.error("FEHLER: " + bezeichnung);
        console.error("        " + (fehler && fehler.message));
    }
}

function gleich(ist, soll, was) {
    if (JSON.stringify(ist) !== JSON.stringify(soll)) {
        throw new Error(was + ": ist " + JSON.stringify(ist) + ", soll " + JSON.stringify(soll));
    }
}

function wahr(bedingung, was) {
    if (!bedingung) {
        throw new Error(was);
    }
}

/* Ein Fortschritt, der mitschreibt, was gebucht wurde. */
const FK = {
    gebucht: [],
    lager: { leben: 0 },
    vorrat(ware) { return FK.lager[ware] || 0; },
    istGezaehlt(id) { return FK.gebucht.indexOf(id) !== -1; },
    /* Wie der echte: eine Partie zählt nur einmal (`FORTSCHRITT.partieZaehlen`). */
    partieBeendet(partie) {
        if (FK.gebucht.indexOf(partie.id) === -1) {
            FK.gebucht.push(partie.id);
        }
        return null;
    },
    hilfeGenutzt() { return false; },
    rundeGestartet() { return null; }
};
umgebung.FORTSCHRITT_KONTO = FK;

const START = umgebung.START;
const ICH = umgebung.ICH;

async function botRundeStarten(regeln) {
    START.spielartMerken(SCHACH_VARIANTEN.liste[0].id);
    START.regelnMerken(Object.assign(TEAM_SCHACH._regelnVorgabe(), { gegenComputer: true }, regeln || {}));
    await START.spielen();
    return SCHACH_TAFEL.partie(TEAM_SCHACH.abgleich.daten, TEAM_SCHACH.offeneId);
}

function beenden(partie, ergebnis) {
    const neu = Object.assign(SCHACH_RUNDE.kopieren(partie),
        { ergebnis: ergebnis, laeuft: false, geaendertAm: partie.geaendertAm + 10 });
    TEAM_SCHACH.abgleich.daten = SCHACH_TAFEL.partieEinsetzen(TEAM_SCHACH.abgleich.daten, neu);
    return neu;
}

(async () => {
    const echteDaten = TEAM_SCHACH.abgleich.daten;

    await pruefe("Partie beenden → Abschluss wegwischen → neue Runde: kein altes Ergebnis, einmal gebucht", async () => {
        TEAM_SCHACH.abgleich.daten = SCHACH_TAFEL.leereTafel(9700);
        TEAM_SCHACH.abschluss = null;
        const alt = await botRundeStarten();
        wahr(alt && SCHACH_RUNDE.teamVon(alt, "id-anna"), "alte Runde mit Anna");
        const vorbei = beenden(alt, "weiss");
        TEAM_SCHACH.zeichnen(TEAM_SCHACH.abgleich.daten);
        gleich(TEAM_SCHACH.abschluss && TEAM_SCHACH.abschluss.id, vorbei.id, "der Abschluss der eben beendeten erscheint");

        /* Weggewischt (Tab gewechselt), NICHT geschlossen. */
        umgebung.TABS.wechseln("start");
        const neu = await botRundeStarten();
        TEAM_SCHACH.zeichnen(TEAM_SCHACH.abgleich.daten);
        wahr(neu && neu.id !== vorbei.id, "eine neue Runde");
        gleich(TEAM_SCHACH.abschluss, null, "kein alter Abschluss über der neuen Runde");
        gleich(TEAM_SCHACH.offeneId, neu.id, "die neue ist offen");
        wahr(ICH.abschlussGesehen(vorbei.id), "die alte ist abgehakt");
        gleich(FK.gebucht.filter((id) => id === vorbei.id).length, 1, "die alte ist gebucht — genau einmal");

        /* Die neue verlassen: auch dann nicht das alte Ergebnis. */
        await TEAM_SCHACH.uebersichtOeffnen();
        TEAM_SCHACH.zeichnen(TEAM_SCHACH.abgleich.daten);
        gleich(TEAM_SCHACH.abschluss, null, "nach dem Verlassen ebenso nicht");
        gleich(FK.gebucht.filter((id) => id === vorbei.id).length, 1, "nie doppelt");
    });

    await pruefe("Ungesehene alte Partie (nie offen) meldet sich beim Start nicht — still gebucht", async () => {
        TEAM_SCHACH.abgleich.daten = SCHACH_TAFEL.leereTafel(9800);
        TEAM_SCHACH.abschluss = null;
        const alt = await botRundeStarten();
        const vorbei = beenden(alt, "schwarz");
        TEAM_SCHACH.offeneId = "";
        TEAM_SCHACH.abschluss = null;
        umgebung.TABS.wechseln("start");
        const neu = await botRundeStarten();
        TEAM_SCHACH.zeichnen(TEAM_SCHACH.abgleich.daten);
        gleich(TEAM_SCHACH.abschluss, null, "kein Abschluss");
        gleich(TEAM_SCHACH.offeneId, neu.id, "die neue offen");
        /* Spätestens beim Verlassen der neuen: still gebucht und abgehakt,
           nie gezeigt. */
        await TEAM_SCHACH.uebersichtOeffnen();
        TEAM_SCHACH.zeichnen(TEAM_SCHACH.abgleich.daten);
        gleich(TEAM_SCHACH.abschluss, null, "auch danach kein Abschluss");
        wahr(FK.istGezaehlt(vorbei.id) && ICH.abschlussGesehen(vorbei.id), "still gebucht und abgehakt");
    });

    await pruefe("Gegen Bob: sofort im Spiel, Seite in der ersten Fassung, fest beim Neuladen", async () => {
        const seiten = new Set();
        for (let i = 0; i < 12; i++) {
            TEAM_SCHACH.abgleich.daten = SCHACH_TAFEL.leereTafel(9900 + i);
            TEAM_SCHACH.abschluss = null;
            const p = await botRundeStarten();
            const seite = SCHACH_RUNDE.teamVon(p, "id-anna");
            wahr(seite, "Anna hat eine Seite");
            wahr(SCHACH_BOT.istBotPartie(p) && SCHACH_RUNDE.teamVon(p, SCHACH_BOT.KENNUNG) !== seite, "Bob gegenüber");
            wahr(p.laeuft === true, "läuft sofort (kein Vorraum)");
            /* „Neuladen": dieselbe Fassung noch einmal normalisiert und geöffnet. */
            const wieder = SCHACH_RUNDE.normalisieren(JSON.parse(JSON.stringify(p)));
            gleich(SCHACH_RUNDE.teamVon(wieder, "id-anna"), seite, "Seite bleibt");
            TEAM_SCHACH.partieOeffnen(p.id);
            gleich(SCHACH_RUNDE.teamVon(SCHACH_TAFEL.partie(TEAM_SCHACH.abgleich.daten, p.id), "id-anna"), seite,
                "Öffnen ändert nichts");
            seiten.add(seite);
            await TEAM_SCHACH.uebersichtOeffnen();
        }
        gleich(seiten.size, 2, "mal Weiss, mal Schwarz (zufällig)");
    });

    await pruefe("Wer die Seite selbst wählt (Zufall aus), wählt wie bisher; Menschen-Runde mit Vorraum", async () => {
        TEAM_SCHACH.abgleich.daten = SCHACH_TAFEL.leereTafel(9990);
        const p = await botRundeStarten({ seiteZufaellig: false });
        gleich(SCHACH_RUNDE.teamVon(p, "id-anna"), "", "noch keine Seite");
        gleich(p.laeuft, false, "wartet auf die Wahl");
        await TEAM_SCHACH.uebersichtOeffnen();
        TEAM_SCHACH.abgleich.daten = SCHACH_TAFEL.leereTafel(9995);
        START.regelnMerken(Object.assign(TEAM_SCHACH._regelnVorgabe(), { gegenComputer: false }));
        await START.spielen();
        const mensch = SCHACH_TAFEL.partie(TEAM_SCHACH.abgleich.daten, TEAM_SCHACH.offeneId);
        gleich(mensch.laeuft, false, "Menschen-Runde wartet im Vorraum");
        await TEAM_SCHACH.uebersichtOeffnen();
    });

    TEAM_SCHACH.abgleich.daten = echteDaten;
    console.log(anzahlOk + " ok, " + anzahlFehler + " Fehler");
    process.exit(anzahlFehler === 0 ? 0 : 1);
})();
