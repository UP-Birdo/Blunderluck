/*
 * wertung-rechner.js — der Web Worker der Wertung (seit v0.151.0).
 *
 * Bis v0.150.0 rechnete `WERTUNG.zugWerten` auf dem Hauptstrang: am
 * Bürorechner 1,3 s im Mittel, bis 2,7 s je eigenem Turm-Zug — solange
 * stand die Seite. Hier rechnet dieselbe Funktion in einem eigenen Strang;
 * der Bildschirm bleibt bedienbar, das Ergebnis kommt als Nachricht zurück
 * (`WERTUNG._antwort` in js\wertung.js).
 *
 * Geladen werden die ECHTEN Regeln und die echte Wertung — dieselbe
 * Reihenfolge wie in index.html und in den Tests. Keine zweite Rechnung.
 *
 * Nachricht hinein:  { nr, brett, zug }
 * Nachricht heraus:  { nr, ergebnis }   (ergebnis wie `WERTUNG.zugWerten`, oder null)
 */

importScripts(
    "schach-varianten.js",
    "schach.js",
    "schach-runde.js",
    "schach-runde-faehigkeiten.js",
    "schach-bot.js",
    "wertung.js"
);

self.onmessage = (nachricht) => {
    const daten = nachricht.data || {};
    let ergebnis = null;
    try {
        ergebnis = WERTUNG.zugWerten(daten.brett, daten.zug);
    } catch (fehler) {
        ergebnis = null;
    }
    self.postMessage({ nr: daten.nr, ergebnis: ergebnis });
};
