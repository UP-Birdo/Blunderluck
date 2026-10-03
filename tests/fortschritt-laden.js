/*
 * fortschritt-laden.js — lädt den Fortschritt so, wie ihn der Browser lädt
 * (seit v0.160.1). KEINE Testdatei: Sie beginnt nicht mit `test-`, der Läufer
 * startet sie nicht, und sie erzeugt keine Prüfungen.
 *
 * WARUM ES SIE GIBT: Seit v0.160.1 setzt sich `FORTSCHRITT` aus zwei Dateien
 * zusammen — dem Kern-Baustein js\fortschritt-kern.js (`FORTSCHRITT_KERN`) und
 * dem eigenen Teil js\fortschritt.js. Im Browser sehen sich die beiden über
 * gemeinsame Namen; ausserhalb des Browsers gibt es die nicht. Hier wird
 * deshalb in derselben Reihenfolge wie in index.html geladen:
 *
 *   1. den Kern laden und als `FORTSCHRITT_KERN` bereitstellen,
 *   2. js\fortschritt.js laden (setzt sich daraus zusammen),
 *   3. das Ergebnis als `FORTSCHRITT` bereitstellen — der Kern ruft jedes
 *      Glied über diesen Namen, nie über `FORTSCHRITT_KERN`.
 *
 * Geladen werden die ECHTEN Dateien, nichts ist kopiert. Aufruf in einer
 * Testdatei:
 *
 *     const FORTSCHRITT = require(pfad.join(__dirname, "fortschritt-laden.js"));
 *
 * Tests, die in einem eigenen vm-Kontext arbeiten, brauchen diese Datei
 * nicht: Sie setzen js\fortschritt-kern.js vor js\fortschritt.js in ihre
 * Dateiliste.
 */

const pfad = require("path");

const jsOrdner = pfad.join(__dirname, "..", "js");

const kern = require(pfad.join(jsOrdner, "fortschritt-kern.js"));
globalThis.FORTSCHRITT_KERN = kern.FORTSCHRITT_KERN;
globalThis.FORTSCHRITT_KERN_ERWARTET = kern.FORTSCHRITT_KERN_ERWARTET;

const FORTSCHRITT = require(pfad.join(jsOrdner, "fortschritt.js"));
globalThis.FORTSCHRITT = FORTSCHRITT;

module.exports = FORTSCHRITT;
