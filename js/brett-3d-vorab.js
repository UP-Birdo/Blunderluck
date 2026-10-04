/*
 * brett-3d-vorab.js — bei gewähltem 3D three.js früh HERUNTERLADEN (seit v0.166.1).
 *
 * ANLASS (Messung v0.166.0): Seit das 3D-Modul per `import()` kommt
 * (js\brett-3d-start.js, ganz am Ende der Seite), begann bei gewähltem 3D der
 * Download von three.js erst nach allen 77 Skripten — das 3D-Brett war beim
 * ersten Besuch rund 2 s später bereit als bis v0.165.1, wo der Browser das
 * feste Modul-Skript schon beim Vorab-Lesen der Seite fand.
 *
 * WAS DIESE DATEI TUT: Sie steht im <head> direkt nach der Import-Karte (als
 * `async`, hält also nichts auf), liest NUR die gespeicherte Brett-Wahl und
 * hängt bei gewünschtem 3D `<link rel="modulepreload">` für das Modul,
 * three.js und die fünf Zusätze ein. Das lädt und übersetzt nur — AUSGEFÜHRT
 * wird das Modul weiter erst durch `import()` in js\brett-3d-start.js (ein
 * Laden, dasselbe Versprechen `geladen`; der Browser nimmt das schon geholte
 * Modul aus seiner Modul-Liste). Bei gewähltem 2D tut sie nichts.
 *
 * WARUM EINE EIGENE LESE-FUNKTION: Um diese Zeit gibt es weder
 * js\freischaltung.js noch das Konto (ob 3D schon frei ist, weiss erst der
 * Turm-Ort). Darum gilt hier nur der WUNSCH aus dem Speicher — derselbe, den
 * `FREISCHALTUNG.brett()` danach auf das Freie kürzt: 3D-Brett (`an`) oder
 * 3D-Figuren auf dem 2D-Brett (`oben`). Ist der Wunsch (noch) nicht frei,
 * war es nur ein unnötiger Download im Hintergrund. tests\test-3d-laden.js
 * prüft: Wo `FREISCHALTUNG.brett()` etwas anderes als "2d" sagt, sagt
 * `gewuenscht` immer ja.
 */

const BRETT_3D_VORAB = {
    SCHLUESSEL: "blunderluck.brett3d",

    /* Was das Modul braucht: die Imports oben in js\brett-3d.js UND was die
       Zusätze selbst importieren (seit v0.166.2: GLTFLoader holt
       BufferGeometryUtils). tests\test-3d-laden.js liest beides nach. */
    DATEIEN: [
        "brett-3d.js",
        "lib/three/three.module.min.js",
        "lib/three/addons/loaders/GLTFLoader.js",
        "lib/three/addons/controls/OrbitControls.js",
        "lib/three/addons/loaders/FontLoader.js",
        "lib/three/addons/geometries/TextGeometry.js",
        "lib/three/addons/geometries/RoundedBoxGeometry.js",
        "lib/three/addons/utils/BufferGeometryUtils.js"
    ],

    /* Der gespeicherte Wunsch: etwas anderes als reines 2D? */
    gewuenscht(roh) {
        let einst = null;
        try {
            einst = JSON.parse(roh || "{}");
        } catch (fehler) {
            return false;
        }
        return !!einst && typeof einst === "object" && (einst.an === true || einst.oben === true);
    },

    /* Hängt die Vorab-Links ein (Adressen neben dieser Datei). Gibt die
       Anzahl zurück. */
    vorladen(basis, dokument) {
        let anzahl = 0;
        for (const datei of BRETT_3D_VORAB.DATEIEN) {
            const link = dokument.createElement("link");
            link.rel = "modulepreload";
            link.href = new URL(datei, basis).href;
            dokument.head.appendChild(link);
            anzahl++;
        }
        return anzahl;
    }
};

if (typeof document !== "undefined" && document.currentScript && document.currentScript.src) {
    try {
        if (BRETT_3D_VORAB.gewuenscht(localStorage.getItem(BRETT_3D_VORAB.SCHLUESSEL))) {
            BRETT_3D_VORAB.vorladen(document.currentScript.src, document);
        }
    } catch (fehler) {
        /* privates Fenster ohne Speicher: dann eben nicht vorab */
    }
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = BRETT_3D_VORAB;
}
