/*
 * brett-3d.js — das Schachbrett in echtem 3D (seit v0.122.0).
 *
 * AUFTRAG (Nutzer, 24.09.2026): „Baue zuerst das Schachbrett nach, dann
 * lasse die Würfel als echte 3D-Blöcke drüber schweben … neue Winkel aufs
 * Brett … interaktiver einstellen, wie das Spielbrett aussieht … statt der
 * Vorschau-Punkte eine Fassung, eine Mulde im Stein … keine Einbussen an
 * der Spielqualität, man soll genauso schnell ziehen können."
 *
 * WIE ES ANGEBUNDEN IST — UND WARUM SO:
 *
 *   Das 2D-Brett (`TEAM_SCHACH._brettBauen`) bleibt die EINE Stelle, die
 *   aus Modell und Bedienzustand ausrechnet, was auf jedem Feld zu sehen
 *   ist: Figur, Lootbox, Ziel, Schlag, Spur, Schach, Mauer, Frost …  Es
 *   schreibt das als Klassen an seine Feld-Knöpfe. Dieses Modul LIEST diese
 *   Knöpfe und zeichnet dasselbe in 3D; ein Tipp auf ein 3D-Feld löst den
 *   Klick des passenden Knopfs aus (`knopf.click()`). Damit gilt:
 *
 *     - Keine zweite Regel-Rechnung. Was das 2D-Brett weiss, weiss das 3D-
 *       Brett — auch jede künftige Markierung, sobald sie hier einen
 *       3D-Auftritt bekommt.
 *     - Kein Zug wird langsamer: Der Tipp geht denselben Weg wie vorher
 *       (`feldAngetippt` → sofort zeigen → senden).
 *     - Die Tests laufen unverändert: Sie laden keine Module, dieses Brett
 *       fehlt dort einfach, und das 2D-Brett arbeitet wie immer.
 *
 *   Die 2D-Knöpfe bleiben im Dokument (unsichtbar, für Vorleseprogramme);
 *   die Leinwand liegt darüber. Die Leinwand selbst wird NIE neu gebaut —
 *   der Bildschirm baut sich bei jedem Abgleich (alle 3 s) neu auf, die
 *   Leinwand wird nur umgehängt. Nur was sich wirklich ändert, bewegt sich.
 *
 * DIE FORMEN kommen aus der 3D-Werkstatt (`Design\Blunderluck-3D`,
 * `tools\Modelle-Exportieren.py`) als EINE glTF-Datei ohne Material.
 * Farben, Oberflächen und das Brett selbst entstehen hier — darum lassen sie
 * sich live umstellen (Ansicht-Knopf unten rechts auf dem Brett).
 *
 * KEINE DURCHDRINGUNG (Haus-Regel für 3D): Figuren springen im Bogen über
 * die Felder, erscheinen auf der Oberfläche statt aus ihr aufzusteigen, und
 * die Mulde liegt UNTER der Figur. Frost ist Reif auf dem Stein, kein Block
 * durch die Figur; der Schild eine Glocke, die die Figur nicht berührt.
 */

import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { FontLoader } from "three/addons/loaders/FontLoader.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

const MODELL_PFAD = "modelle/blunderluck-modelle.glb";
/* Droid Sans Bold (Apache 2.0, NOTICE daneben), gekürzt auf a–p, A–P, 0–9. */
const SCHRIFT_PFAD = "js/lib/three/addons/fonts/brett-schrift.typeface.json";
const SPEICHER_SCHLUESSEL = "blunderluck.brett3d";

/* ------------------------------------------------------------------ *
 * Die Einstellungen — alles, was der Spieler am Aussehen drehen kann.
 * ------------------------------------------------------------------ */

const THEMEN = {
    blunderluck: { name: "Blunderluck", hell: "#eef2f7", dunkel: "#4a7fb5", rahmen: "#1d2330", sockel: "#141821" },
    holz:        { name: "Holz",        hell: "#ecd3a8", dunkel: "#a0703f", rahmen: "#4b2e18", sockel: "#2c1a0c" },
    turnier:     { name: "Turnier",     hell: "#eeeed2", dunkel: "#769656", rahmen: "#2f3a24", sockel: "#1b2215" },
    marmor:      { name: "Marmor",      hell: "#efeeea", dunkel: "#80868e", rahmen: "#2b2d31", sockel: "#18191c" },
    nacht:       { name: "Nacht",       hell: "#56607a", dunkel: "#262c3b", rahmen: "#0f1219", sockel: "#07090d" }
};

const FIGUR_STILE = {
    /* Die Vorgabe trägt das Material der alten gerenderten Figuren
       (tools\Figuren-Blender.py: Rauheit 0,60, Glanz 0,25, kein Lack) —
       Nutzer 24.09.2026: „sollen genauso matt bleiben wie die alten". */
    emaille:   { name: "Emaille",   weiss: "#f2ecdf", schwarz: "#2b2e35", rau: 0.6, metall: 0.0, lack: 0.0, lackRau: 0.5, glanz: 0.5 },
    porzellan: { name: "Porzellan", weiss: "#f6f4ef", schwarz: "#1f2228", rau: 0.26, metall: 0.0, lack: 0.8, lackRau: 0.08 },
    matt:      { name: "Matt",      weiss: "#ebe5d8", schwarz: "#35383f", rau: 0.85, metall: 0.0, lack: 0.0, lackRau: 0.5 },
    metall:    { name: "Metall",    weiss: "#d9dde3", schwarz: "#8a5a2b", rau: 0.32, metall: 0.9, lack: 0.2, lackRau: 0.2 }
};

/* Blickwinkel als Abstand von der Senkrechten. Seit v0.132.0 höchstens
   17 Grad: Bei 40 Grad verdeckte jede Figur die auf dem Feld dahinter
   (Nutzer-Foto 24.09.2026). „Tief" (60 Grad) ist deshalb entfallen. */
const BLICKE = {
    oben:    { name: "Oben",   winkel: THREE.MathUtils.degToRad(4) },
    schraeg: { name: "Schräg", winkel: THREE.MathUtils.degToRad(17) }
};

const KACHELN = {
    rund:   { name: "Rund",   rundung: 0.12, fase: 0.035, fuge: 0.07 },
    kantig: { name: "Kantig", rundung: 0.02, fase: 0.012, fuge: 0.03 }
};

const TEMPI = {
    flott:  { name: "Flott",  faktor: 0.72 },
    normal: { name: "Normal", faktor: 1.0 }
};

const VORGABE = {
    an: true, thema: "blunderluck", figuren: "emaille", blick: "schraeg",
    kacheln: "rund", schatten: true, tempo: "normal"
};

/* Farben der Markierungen — dieselben wie im 2D-Brett (stil-brett.css). */
const FARBE = {
    gewaehlt: "#f2d675",
    schach: "#f09d4a",
    matt: "#e2574a",
    spur: "#9fd07a",
    spurEnde: "#6fbf4a",
    spurPech: "#e8c547",
    wahl: "#38c172",
    vorschau: "#2fb3a0",
    vorschlag: "#4fc3c9",
    schlag: "#e2574a",
    wirkung: "#4aa3ff",
    wirkungPech: "#ff5a4a",
    mauer: "#3b6fb0",
    frost: "#bfe6ff",
    schild: "#78b8ff",
    fessel: "#8b46c8",
    geliehen: "#9b5de5",
    stufe: {
        gruen: "#2e9e52", blau: "#2f7fd0", lila: "#8b46c8", gelb: "#e0a800",
        unbekannt: "#8a919b"
    }
};

/* Figurengrösse auf dem Feld: Die Werkstatt baut mit Sockel-Durchmesser
   0,84 und Königshöhe 2,00; ein Feld ist hier 1,00 breit. Seit v0.132.0
   0,63 statt 0,74 (König 1,26 hoch): Zusammen mit dem Blickwinkel 17 Grad
   verdeckt keine Figur die auf dem Feld dahinter — gemessen mit
   `BRETT_3D.ueberdeckungen()` für Bretter von 4×4 bis 12×12, mit 5 Prozent
   Sicherheit. Nutzer 24.09.2026: „sowas darf nie passieren". */
const FIGUR_MASS = 0.63;
const KACHEL_HOEHE = 0.2;
const MULDE_RADIUS = 0.3;
const MULDE_TIEFE = 0.115;
const BOX_MASS = 0.46;
const BOX_HUB = 1.8;            // so hoch steigt eine eingesammelte Box — über jede Figur

const ARTEN = ["bauer", "springer", "laeufer", "turm", "dame", "koenig"];

/* ------------------------------------------------------------------ *
 * Zustand
 * ------------------------------------------------------------------ */

const Z = {
    bereit: false,
    fehler: false,
    einst: null,
    renderer: null, szene: null, kamera: null, steuerung: null,
    huelle: null, leinwand: null, knopfLeiste: null, tafel: null,
    licht: null, lichtHimmel: null,
    formen: {},              // bauer … koenig, box_gabe, box_pech, einlage_gabe, einlage_pech
    mat: {},                 // gemeinsame Materialien
    brettGruppe: null,       // Sockel, Rahmen, Beschriftung
    felderGruppe: null,
    figurenGruppe: null,
    effektGruppe: null,
    felder: [],              // je Anzeige-Feld: { kachel, mulde, ring, deko, … }
    figuren: new Map(),      // Anzeige-Index -> Figur-Objekt
    geister: new Map(),      // Anzeige-Index -> Schemen-Objekt
    boxen: new Map(),        // Anzeige-Index -> Box-Objekt
    masse: null,             // { spalten, reihen, schluessel }
    partieId: null,
    zugZaehler: null,
    blickSchluessel: null,
    tweens: [],
    partikel: [],
    laeuft: false,
    letzteZeit: 0,
    ruheBild: 0,
    knoepfe: [],             // Anzeige-Index -> Feld-Knopf des 2D-Bretts
    letzte: null,            // { halter, partie, person }
    zeiger: null,
    geladen: null,
    reduziert: false,
    hand: null,              // Karten je Seite beim letzten Bild (Lootbox öffnen)
    mitAblage: false,        // Friedhof-Ablagen neben dem Brett (laufende Partie)
    friedhofGruppe: null,
    friedhofStand: null,     // gefallene Arten je Farbe beim letzten Bild
    friedhofSchluessel: null,
    kartenTex: null          // Art -> Textur des 3D-Plättchens
};

/* ------------------------------------------------------------------ *
 * Einstellungen laden und speichern (nur auf diesem Gerät)
 * ------------------------------------------------------------------ */

function einstellungenLaden() {
    let gespeichert = {};
    try {
        gespeichert = JSON.parse(localStorage.getItem(SPEICHER_SCHLUESSEL) || "{}") || {};
    } catch (fehler) {
        gespeichert = {};
    }
    /* Ohne Admin-Freigabe gilt die Vorgabe — auch wenn auf diesem Gerät
       noch ein älteres eigenes Aussehen gespeichert ist (seit v0.129.0). */
    if (!anpassungErlaubt()) gespeichert = {};
    const einst = Object.assign({}, VORGABE, gespeichert);
    if (!THEMEN[einst.thema]) einst.thema = VORGABE.thema;
    if (!FIGUR_STILE[einst.figuren]) einst.figuren = VORGABE.figuren;
    if (!BLICKE[einst.blick]) einst.blick = VORGABE.blick;
    if (!KACHELN[einst.kacheln]) einst.kacheln = VORGABE.kacheln;
    if (!TEMPI[einst.tempo]) einst.tempo = VORGABE.tempo;
    return einst;
}

function einstellungenSpeichern() {
    try {
        localStorage.setItem(SPEICHER_SCHLUESSEL, JSON.stringify(Z.einst));
    } catch (fehler) {
        /* privates Fenster: dann eben nur für diese Sitzung */
    }
}

function dauer(ms) {
    if (Z.reduziert) return Math.min(ms, 90);
    /* `zeitlupe` nur für die Werkstatt: BRETT_3D._zustand.zeitlupe = 6 */
    return ms * TEMPI[Z.einst.tempo].faktor * (Z.zeitlupe || 1);
}

/* ------------------------------------------------------------------ *
 * Aufbau: Renderer, Szene, Licht, Kamera
 * ------------------------------------------------------------------ */

function webglDa() {
    try {
        const probe = document.createElement("canvas");
        return !!(probe.getContext("webgl2") || probe.getContext("webgl"));
    } catch (fehler) {
        return false;
    }
}

function aufbauen() {
    Z.einst = einstellungenLaden();
    Z.reduziert = !!(window.matchMedia
        && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

    const huelle = document.createElement("div");
    huelle.className = "brett-3d";
    Z.huelle = huelle;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x000000, 0);
    Z.renderer = renderer;
    Z.leinwand = renderer.domElement;
    Z.leinwand.className = "brett-3d-leinwand";
    Z.leinwand.setAttribute("aria-hidden", "true");
    huelle.appendChild(Z.leinwand);

    const szene = new THREE.Scene();
    Z.szene = szene;

    Z.lichtHimmel = new THREE.HemisphereLight(0xf4f7ff, 0x3a3f4a, 1.25);
    szene.add(Z.lichtHimmel);

    /* Das Hauptlicht von oben links, wie in der Werkstatt. */
    const licht = new THREE.DirectionalLight(0xffffff, 2.1);
    licht.position.set(-5, 11, 6);
    licht.castShadow = true;
    const klein = Math.min(window.innerWidth, window.innerHeight) < 700;
    licht.shadow.mapSize.set(klein ? 1024 : 2048, klein ? 1024 : 2048);
    licht.shadow.bias = -0.0006;
    licht.shadow.normalBias = 0.02;
    licht.shadow.radius = 4;
    szene.add(licht);
    szene.add(licht.target);
    Z.licht = licht;

    const gegen = new THREE.DirectionalLight(0xdfe8ff, 0.55);
    gegen.position.set(6, 5, -7);
    szene.add(gegen);

    Z.kamera = new THREE.PerspectiveCamera(24, 1, 0.1, 200);
    Z.kamera.position.set(0, 10, 10);

    /*
     * DAS BRETT LÄSST SICH NICHT MEHR DREHEN ODER ZOOMEN (v0.129.0,
     * Nutzer-Ansage 24.09.2026: „das raus, wo man die Karte im Spiel selbst
     * drehen kann — komplett raus"). Die Steuerung bleibt als Objekt, weil
     * `blickSetzen` Ziel und Abstand über sie führt, nimmt aber keine
     * Eingaben mehr an. Nebenwirkung, und der eigentliche Gewinn: Ein Tipp
     * kann nicht mehr als Drehen missverstanden werden (siehe
     * `bedienungAnmelden`).
     */
    const steuerung = new OrbitControls(Z.kamera, Z.leinwand);
    steuerung.enabled = false;
    steuerung.enablePan = false;
    steuerung.enableDamping = true;
    steuerung.dampingFactor = 0.12;
    steuerung.rotateSpeed = 0.6;
    steuerung.minPolarAngle = 0.0;
    steuerung.maxPolarAngle = THREE.MathUtils.degToRad(72);
    steuerung.addEventListener("change", () => anstossen());
    steuerung.addEventListener("start", () => { Z.freierBlick = true; });
    Z.steuerung = steuerung;

    Z.brettGruppe = new THREE.Group();
    Z.felderGruppe = new THREE.Group();
    Z.figurenGruppe = new THREE.Group();
    Z.effektGruppe = new THREE.Group();
    szene.add(Z.brettGruppe, Z.felderGruppe, Z.figurenGruppe, Z.effektGruppe);

    materialienBauen();
    bedienungAnmelden();
    knopfLeisteBauen();

    new ResizeObserver(() => groesseAnpassen()).observe(huelle);
}

/* ------------------------------------------------------------------ *
 * Materialien
 * ------------------------------------------------------------------ */

function farbe(hex) {
    return new THREE.Color(hex);
}

function materialienBauen() {
    const thema = THEMEN[Z.einst.thema];
    const stil = FIGUR_STILE[Z.einst.figuren];
    const m = Z.mat;

    const figurMat = (hex) => new THREE.MeshPhysicalMaterial({
        color: farbe(hex), roughness: stil.rau, metalness: stil.metall,
        clearcoat: stil.lack, clearcoatRoughness: stil.lackRau,
        specularIntensity: stil.glanz === undefined ? 1 : stil.glanz
    });
    for (const alt of ["weiss", "schwarz"]) {
        if (m[alt]) m[alt].dispose();
    }
    m.weiss = figurMat(stil.weiss);
    m.schwarz = figurMat(stil.schwarz);

    m.sockel = m.sockel || new THREE.MeshStandardMaterial({ roughness: 0.7 });
    m.sockel.color = farbe(thema.sockel);
    m.rahmen = m.rahmen || new THREE.MeshPhysicalMaterial({ roughness: 0.45, clearcoat: 0.3 });
    m.rahmen.color = farbe(thema.rahmen);

    m.schrift = m.schrift || new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false });
    m.einlage = m.einlage || new THREE.MeshStandardMaterial({ color: 0x1b1f28, roughness: 0.6 });
    m.mauer = m.mauer || new THREE.MeshPhysicalMaterial({ color: farbe(FARBE.mauer), roughness: 0.55, clearcoat: 0.2 });
    m.mauerFuge = m.mauerFuge || new THREE.MeshStandardMaterial({ color: 0x1d3558, roughness: 0.8 });
    m.reif = m.reif || new THREE.MeshPhysicalMaterial({
        color: farbe(FARBE.frost), roughness: 0.15, transmission: 0.0, transparent: true,
        opacity: 0.82, clearcoat: 1.0, clearcoatRoughness: 0.05
    });
    m.kristall = m.kristall || new THREE.MeshPhysicalMaterial({
        color: 0xe8f7ff, roughness: 0.05, transparent: true, opacity: 0.75, clearcoat: 1.0
    });
    m.schild = m.schild || new THREE.MeshPhysicalMaterial({
        color: farbe(FARBE.schild), roughness: 0.1, transparent: true, opacity: 0.22,
        clearcoat: 1.0, side: THREE.DoubleSide, depthWrite: false,
        emissive: farbe(FARBE.schild), emissiveIntensity: 0.25
    });
    m.fessel = m.fessel || new THREE.MeshStandardMaterial({ color: farbe(FARBE.fessel), roughness: 0.35, metalness: 0.7 });
    m.grube = m.grube || new THREE.MeshStandardMaterial({ color: 0x0c0e12, roughness: 1.0 });
    m.funke = m.funke || new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false });
    m.staub = m.staub || new THREE.MeshStandardMaterial({ color: 0xd8d2c4, transparent: true, roughness: 1.0, depthWrite: false });
}

function kachelMaterial(hell) {
    const thema = THEMEN[Z.einst.thema];
    return new THREE.MeshPhysicalMaterial({
        color: farbe(hell ? thema.hell : thema.dunkel),
        roughness: Z.einst.thema === "marmor" ? 0.25 : 0.5,
        clearcoat: Z.einst.thema === "holz" ? 0.15 : 0.35,
        clearcoatRoughness: 0.3,
        emissive: new THREE.Color(0x000000)
    });
}

/* Die Stufenfarben der Lootbox; die verborgene Box trägt einen Verlauf
   durch alle vier Farben, gerechnet als Eckfarben im Netz. */
function boxMaterial(stufe) {
    const schluessel = "box_" + stufe;
    if (Z.mat[schluessel]) return Z.mat[schluessel];
    let mat;
    if (stufe === "unbekannt") {
        mat = new THREE.MeshPhysicalMaterial({
            vertexColors: true, roughness: 0.4, clearcoat: 0.5, clearcoatRoughness: 0.2
        });
    } else {
        mat = new THREE.MeshPhysicalMaterial({
            color: farbe(FARBE.stufe[stufe] || FARBE.stufe.unbekannt),
            roughness: 0.4, clearcoat: 0.5, clearcoatRoughness: 0.2,
            emissive: farbe(FARBE.stufe[stufe] || FARBE.stufe.unbekannt), emissiveIntensity: 0.12
        });
    }
    Z.mat[schluessel] = mat;
    return mat;
}

function regenbogenFaerben(geo) {
    const pos = geo.attributes.position;
    const farben = new Float32Array(pos.count * 3);
    const stufen = ["gruen", "blau", "lila", "gelb"].map((s) => farbe(FARBE.stufe[s]));
    const c = new THREE.Color();
    geo.computeBoundingBox();
    const bb = geo.boundingBox;
    for (let i = 0; i < pos.count; i++) {
        const t = THREE.MathUtils.clamp(
            ((pos.getX(i) - bb.min.x) / (bb.max.x - bb.min.x) * 0.6
            + (pos.getY(i) - bb.min.y) / (bb.max.y - bb.min.y) * 0.4), 0, 0.999) * 3;
        const k = Math.floor(t);
        c.copy(stufen[k]).lerp(stufen[k + 1], t - k);
        farben[i * 3] = c.r; farben[i * 3 + 1] = c.g; farben[i * 3 + 2] = c.b;
    }
    geo.setAttribute("color", new THREE.BufferAttribute(farben, 3));
}

/* ------------------------------------------------------------------ *
 * Formen laden
 * ------------------------------------------------------------------ */

function formenLaden() {
    return new Promise((fertig, abbruch) => {
        new GLTFLoader().load(MODELL_PFAD, (gltf) => {
            const nimm = (name) => {
                const obj = gltf.scene.getObjectByName(name);
                if (!obj || !obj.geometry) return null;
                const geo = obj.geometry.clone();
                obj.updateWorldMatrix(true, false);
                geo.applyMatrix4(obj.matrixWorld);
                return geo;
            };
            for (const art of ARTEN) {
                const geo = nimm("figur_" + art);
                if (!geo) {
                    abbruch(new Error("Form fehlt: " + art));
                    return;
                }
                geo.computeBoundingBox();
                const bb = geo.boundingBox;
                geo.translate(0, -bb.min.y, 0);
                geo.scale(FIGUR_MASS, FIGUR_MASS, FIGUR_MASS);
                geo.computeBoundingBox();
                Z.formen[art] = geo;
            }
            for (const art of ["gabe", "pech"]) {
                const kasten = nimm("lootbox_" + art);
                const einlage = nimm("lootbox_" + art + "_einlage");
                kasten.computeBoundingBox();
                const mitte = new THREE.Vector3();
                kasten.boundingBox.getCenter(mitte);
                kasten.translate(-mitte.x, -mitte.y, -mitte.z);
                einlage.translate(-mitte.x, -mitte.y, -mitte.z);
                kasten.scale(BOX_MASS, BOX_MASS, BOX_MASS);
                einlage.scale(BOX_MASS, BOX_MASS, BOX_MASS);
                Z.formen["box_" + art] = kasten;
                Z.formen["einlage_" + art] = einlage;
                const bunt = kasten.clone();
                regenbogenFaerben(bunt);
                Z.formen["box_" + art + "_bunt"] = bunt;
            }
            fertig();
        }, undefined, abbruch);
    });
}

/* ------------------------------------------------------------------ *
 * Die Kachel — mit und ohne Mulde
 * ------------------------------------------------------------------ */

const GEO = {};

function kachelFormen() {
    const k = KACHELN[Z.einst.kacheln];
    const schluessel = Z.einst.kacheln;
    if (GEO.schluessel === schluessel) return;
    for (const g of ["kachel", "kachelMulde", "mulde", "ring", "sockelFeld"]) {
        if (GEO[g]) GEO[g].dispose();
    }
    GEO.schluessel = schluessel;

    const seite = 1 - k.fuge;
    const innen = seite / 2 - k.fase;
    const r = Math.min(k.rundung, innen - 0.01);

    const umriss = () => {
        const s = new THREE.Shape();
        s.moveTo(-innen + r, -innen);
        s.lineTo(innen - r, -innen);
        s.quadraticCurveTo(innen, -innen, innen, -innen + r);
        s.lineTo(innen, innen - r);
        s.quadraticCurveTo(innen, innen, innen - r, innen);
        s.lineTo(-innen + r, innen);
        s.quadraticCurveTo(-innen, innen, -innen, innen - r);
        s.lineTo(-innen, -innen + r);
        s.quadraticCurveTo(-innen, -innen, -innen + r, -innen);
        return s;
    };
    const auspressen = (form) => {
        const geo = new THREE.ExtrudeGeometry(form, {
            depth: KACHEL_HOEHE - 2 * k.fase, bevelEnabled: true,
            bevelThickness: k.fase, bevelSize: k.fase, bevelSegments: 3, curveSegments: 10
        });
        /* Die Form liegt in xy und wächst in +z — aufstellen, sodass die
           Oberseite nach oben (+y) zeigt und bei KACHEL_HOEHE liegt. */
        geo.rotateX(-Math.PI / 2);
        geo.translate(0, k.fase, 0);
        geo.computeVertexNormals();
        return geo;
    };

    GEO.kachel = auspressen(umriss());

    const mitLoch = umriss();
    const loch = new THREE.Path();
    loch.absarc(0, 0, MULDE_RADIUS, 0, Math.PI * 2, true);
    mitLoch.holes.push(loch);
    GEO.kachelMulde = auspressen(mitLoch);

    /* Die Mulde: eine flache Schale, deren Rand an die Lochwand stösst
       (die Fase zieht das Loch um `fase` enger). */
    const rand = MULDE_RADIUS - k.fase * 0.9;
    const punkte = [];
    const schritte = 14;
    for (let i = 0; i <= schritte; i++) {
        const t = i / schritte;
        const x = rand * t;
        const y = -MULDE_TIEFE * (1 - Math.pow(t, 2.2));
        punkte.push(new THREE.Vector2(Math.max(x, 0.0001), y));
    }
    GEO.mulde = new THREE.LatheGeometry(punkte, 40);
    GEO.mulde.scale(1, 1, 1);
    GEO.oberkante = KACHEL_HOEHE - k.fase * 0.5;

    GEO.ring = new THREE.RingGeometry(MULDE_RADIUS + 0.01, MULDE_RADIUS + 0.05, 48);
    GEO.ring.rotateX(-Math.PI / 2);

    GEO.rand = new THREE.RingGeometry(0, 1, 4, 1);
    GEO.sockelFeld = new THREE.BoxGeometry(1, 0.14, 1);
}

/* ------------------------------------------------------------------ *
 * Das Brett aufbauen (nur bei neuen Massen oder neuem Aussehen)
 * ------------------------------------------------------------------ */

function feldMitte(index) {
    const s = index % Z.masse.spalten;
    const r = Math.floor(index / Z.masse.spalten);
    return new THREE.Vector3(s - (Z.masse.spalten - 1) / 2, 0, r - (Z.masse.reihen - 1) / 2);
}

function leeren(gruppe) {
    for (let i = gruppe.children.length - 1; i >= 0; i--) {
        const kind = gruppe.children[i];
        gruppe.remove(kind);
        kind.traverse((o) => {
            if (o.userData && o.userData.eigenesMaterial && o.material) o.material.dispose();
            if (o.userData && o.userData.eigeneForm && o.geometry) o.geometry.dispose();
        });
    }
}

function brettBauen(beschreibung) {
    kachelFormen();
    leeren(Z.brettGruppe);
    leeren(Z.felderGruppe);
    Z.felder = [];

    const { spalten, reihen } = beschreibung;
    const da = beschreibung.zellen.map((zelle) => !zelle.ausserhalb);

    /*
     * KEIN SOCKEL, KEIN RAHMEN (Nutzer, 24.09.2026: „mache den Rand weg vom
     * Brett, sodass es nur die Felder gibt"). Die Steine stehen frei; durch
     * die Fugen sieht man den Hintergrund der Seite. Die Beschriftung
     * schwebt stattdessen als 3D-Schrift neben dem Brett.
     */
    beschriftungBauen(beschreibung);

    for (let i = 0; i < beschreibung.zellen.length; i++) {
        const zelle = beschreibung.zellen[i];
        const mitte = feldMitte(i);
        const feld = { index: i, mitte, hell: zelle.hell, da: !zelle.ausserhalb, kachel: null, mulde: null,
            ring: null, deko: new THREE.Group(), zustand: "", muldeZiel: 0, muldeJetzt: 0, hub: 0, hubZiel: 0 };
        feld.deko.position.copy(mitte);
        Z.felderGruppe.add(feld.deko);
        if (feld.da) {
            const mat = kachelMaterial(zelle.hell);
            const kachel = new THREE.Mesh(GEO.kachel, mat);
            kachel.userData.eigenesMaterial = true;
            kachel.userData.feld = i;
            kachel.position.copy(mitte);
            kachel.castShadow = false;
            kachel.receiveShadow = true;
            Z.felderGruppe.add(kachel);
            feld.kachel = kachel;
            feld.grundFarbe = mat.color.clone();
        }
        Z.felder.push(feld);
    }

    /* Die Lampe so richten, dass ihr Schatten genau das Brett deckt. */
    const halb = Math.max(spalten, reihen) / 2 + 1.5;
    const sk = Z.licht.shadow.camera;
    sk.left = -halb; sk.right = halb; sk.top = halb; sk.bottom = -halb;
    sk.near = 1; sk.far = 40;
    sk.updateProjectionMatrix();
    Z.licht.castShadow = !!Z.einst.schatten;
}

/*
 * DIE BESCHRIFTUNG FLIEGT (Nutzer, 24.09.2026: „die Zahlen und Buchstaben,
 * wo derzeit am Rand drauf gemalt sind, mach 3D und lasse sie fliegen").
 * Echte 3D-Schrift (ausgepresst, mit Fase), links die Reihen, unten die
 * Linien; sie schweben in einer Welle auf und ab und drehen sich immer zur
 * Kamera, damit sie aus jedem Blickwinkel lesbar bleiben. Die Texte kommen
 * weiter aus dem 2D-Rand — Drehung und Brettgrösse laufen nie auseinander.
 */
const SCHRIFT_ABSTAND = 0.62;   // Mitte der Schrift bis zur Brettkante
const SCHRIFT_HOEHE = 0.02;     // knapp über der Steinoberseite (Nutzer: „nicht so aufdringlich")

function schriftFarbe() {
    const dunkel = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const thema = THEMEN[Z.einst.thema];
    return dunkel ? thema.hell : thema.dunkel;
}

function beschriftungBauen(beschreibung) {
    Z.schilder = [];
    if (!Z.schrift) return;
    const { spalten, reihen, randSpalten, randReihen } = beschreibung;
    const hex = schriftFarbe();
    /* Zurückhaltend: halb durchsichtig, kein Leuchten, kein Schatten — die
       Schrift ist Orientierung, nicht Blickfang. */
    Z.mat.schrift3d = Z.mat.schrift3d || new THREE.MeshStandardMaterial({ roughness: 0.6, transparent: true, opacity: 0.55, depthWrite: false });
    Z.mat.schrift3d.color = farbe(hex);
    GEO.schrift = GEO.schrift || new Map();

    const schild = (text, x, z, phase) => {
        if (!text) return;
        let geo = GEO.schrift.get(text);
        if (!geo) {
            geo = new TextGeometry(text, {
                font: Z.schrift, size: 0.2, depth: 0.035, curveSegments: 5,
                bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.006, bevelSegments: 2
            });
            geo.computeBoundingBox();
            const bb = geo.boundingBox;
            geo.translate(-(bb.min.x + bb.max.x) / 2, -(bb.min.y + bb.max.y) / 2, -(bb.min.z + bb.max.z) / 2);
            GEO.schrift.set(text, geo);
        }
        const netz = new THREE.Mesh(geo, Z.mat.schrift3d);
        netz.castShadow = false;
        netz.renderOrder = 1;
        netz.position.set(x, GEO.oberkante + SCHRIFT_HOEHE, z);
        netz.userData.basis = netz.position.clone();
        netz.userData.phase = phase;
        Z.brettGruppe.add(netz);
        Z.schilder.push(netz);
    };
    const links = -spalten / 2 - SCHRIFT_ABSTAND + 0.5;
    const unten = reihen / 2 + SCHRIFT_ABSTAND - 0.5;
    for (let r = 0; r < reihen; r++) {
        schild(randReihen[r], links, r - (reihen - 1) / 2, r * 0.55);
    }
    for (let st = 0; st < spalten; st++) {
        schild(randSpalten[st], st - (spalten - 1) / 2, unten, (reihen + st) * 0.55);
    }
}

function schilderSchweben(zeit) {
    for (const netz of Z.schilder || []) {
        const b = netz.userData.basis;
        /* Nur ein ruhiges Wiegen; die Schrift steht immer genau zum Blick. */
        const w = zeit / 1500 + netz.userData.phase;
        netz.position.set(b.x, b.y + (Z.reduziert ? 0 : Math.sin(w) * 0.015), b.z);
        netz.quaternion.copy(Z.kamera.quaternion);
    }
}

/* ------------------------------------------------------------------ *
 * Das 2D-Brett lesen
 * ------------------------------------------------------------------ */

function lesen(halter) {
    const brett = halter.querySelector(".brett");
    if (!brett) return null;
    const spalten = parseInt(brett.style.getPropertyValue("--brett-spalten"), 10) || 8;
    const knoepfe = Array.from(brett.querySelectorAll(":scope > .feld"));
    const reihen = Math.round(knoepfe.length / spalten);

    const randText = (auswahl) => Array.from(halter.querySelectorAll(auswahl + " .brett-marke"))
        .map((el) => (el.textContent || "").trim());

    const zellen = knoepfe.map(zelleLesen);

    return {
        spalten, reihen, zellen, knoepfe,
        randReihen: randText(".brett-rand-reihen"),
        randSpalten: randText(".brett-rand-spalten")
    };
}

/* Ein Feld des 2D-Bretts (grosses Brett oder kleines Vorschau-Brett). */
function zelleLesen(knopf) {
        const k = knopf.classList;
        const zelle = {
            feld: knopf.dataset && knopf.dataset.feld !== undefined ? parseInt(knopf.dataset.feld, 10) : -1,
            hell: k.contains("feld-hell"),
            k,
            figur: null, geist: null, box: null,
            ausserhalb: k.contains("feld-ausserhalb"),
            riss: k.contains("feld-riss") && !k.contains("feld-ausserhalb"),
            restzeit: ""
        };
        for (const kind of knopf.children) {
            const kk = kind.classList;
            if (kk.contains("figur")) {
                const art = ARTEN.find((a) => kk.contains("figur-art-" + a)) || "bauer";
                const eintrag = {
                    art,
                    farbe: kk.contains("figur-schwarz") ? "schwarz" : "weiss",
                    getruebt: kk.contains("figur-getruebt")
                };
                if (kk.contains("figur-schemen")) zelle.geist = eintrag;
                else zelle.figur = eintrag;
            } else if (kk.contains("wuerfel")) {
                const bild = kind.querySelector("image");
                const quelle = bild ? (bild.getAttribute("href") || bild.getAttribute("xlink:href") || "") : "";
                const treffer = /lootbox-([a-z]+?)(-pech)?\.png/.exec(quelle);
                zelle.box = { stufe: treffer ? treffer[1] : "unbekannt", pech: !!(treffer && treffer[2]) };
            } else if (kk.contains("feld-restzeit")) {
                zelle.restzeit = (kind.textContent || "").trim();
            }
        }
        return zelle;
}

/* ------------------------------------------------------------------ *
 * Figuren
 * ------------------------------------------------------------------ */

function figurBauen(eintrag, geist) {
    const mat = geist
        ? Z.mat[eintrag.farbe].clone()
        : Z.mat[eintrag.farbe];
    if (geist) {
        mat.transparent = true;
        mat.opacity = 0.32;
        mat.depthWrite = false;
    }
    const netz = new THREE.Mesh(Z.formen[eintrag.art], mat);
    netz.castShadow = !geist;
    netz.receiveShadow = !geist;
    const gruppe = new THREE.Group();
    gruppe.add(netz);
    gruppe.userData = { art: eintrag.art, farbe: eintrag.farbe, netz, geist: !!geist, eigenesMaterial: !!geist };
    if (geist) netz.userData.eigenesMaterial = true;
    ausrichten(gruppe);
    return gruppe;
}

/* Der Springer schaut zum Gegner; eigene Figuren stehen unten. */
function ausrichten(gruppe) {
    if (gruppe.userData.art !== "springer") return;
    const unten = Z.untenFarbe || "weiss";
    const meine = gruppe.userData.farbe === unten;
    gruppe.userData.netz.rotation.y = meine ? Math.PI / 2 + 0.35 : -Math.PI / 2 + 0.35;
}

function figurSetzen(gruppe, index) {
    const m = Z.felder[index].mitte;
    gruppe.position.set(m.x, GEO.oberkante, m.z);
}

function figurEntfernen(gruppe) {
    Z.figurenGruppe.remove(gruppe);
    gruppe.traverse((o) => {
        if (o.userData && o.userData.eigenesMaterial && o.material) o.material.dispose();
    });
}

/* ------------------------------------------------------------------ *
 * Tweens und Partikel
 * ------------------------------------------------------------------ */

function tween(ms, schritt, fertig, verzoegerung) {
    Z.tweens.push({ start: performance.now() + (verzoegerung || 0), ms: Math.max(1, ms), schritt, fertig });
    anstossen();
}

const weich = (t) => t * t * (3 - 2 * t);
const raus = (t) => 1 - Math.pow(1 - t, 3);

function funkenWolke(ort, hex, anzahl, kraft) {
    const geo = GEO.funke || (GEO.funke = new THREE.OctahedronGeometry(0.035, 0));
    for (let i = 0; i < anzahl; i++) {
        const mat = Z.mat.funke.clone();
        mat.color = farbe(hex);
        const t = new THREE.Mesh(geo, mat);
        t.userData.eigenesMaterial = true;
        t.position.copy(ort);
        const w = Math.random() * Math.PI * 2;
        const v = new THREE.Vector3(Math.cos(w) * kraft, 0.6 + Math.random() * kraft * 1.5, Math.sin(w) * kraft);
        Z.effektGruppe.add(t);
        Z.partikel.push({ obj: t, v, leben: 0, max: 520 + Math.random() * 260, schwer: 3.2 });
    }
    anstossen();
}

function staubRing(ort) {
    const geo = GEO.staub || (GEO.staub = new THREE.SphereGeometry(0.06, 8, 6));
    for (let i = 0; i < 10; i++) {
        const mat = Z.mat.staub.clone();
        const t = new THREE.Mesh(geo, mat);
        t.userData.eigenesMaterial = true;
        const w = (i / 10) * Math.PI * 2;
        t.position.set(ort.x + Math.cos(w) * 0.25, ort.y + 0.03, ort.z + Math.sin(w) * 0.25);
        const v = new THREE.Vector3(Math.cos(w) * 0.9, 0.25, Math.sin(w) * 0.9);
        Z.effektGruppe.add(t);
        Z.partikel.push({ obj: t, v, leben: 0, max: 420, schwer: 0.4, wachsen: true });
    }
    anstossen();
}

/* ------------------------------------------------------------------ *
 * Abgleich: was stand da, was steht jetzt — und wie kommt es dahin?
 * ------------------------------------------------------------------ */

function abstand(a, b) {
    const sa = a % Z.masse.spalten, ra = Math.floor(a / Z.masse.spalten);
    const sb = b % Z.masse.spalten, rb = Math.floor(b / Z.masse.spalten);
    return Math.hypot(sa - sb, ra - rb);
}

function figurenAbgleichen(beschreibung, animieren, bekannterZug, extras) {
    const alt = Z.figuren;
    const neu = new Map();
    const offenAlt = new Map(alt);
    const offenNeu = [];

    beschreibung.zellen.forEach((zelle, i) => {
        if (!zelle.figur) return;
        const g = offenAlt.get(i);
        if (g && g.userData.art === zelle.figur.art && g.userData.farbe === zelle.figur.farbe) {
            neu.set(i, g);
            offenAlt.delete(i);
            g.userData.getruebt = zelle.figur.getruebt;
        } else {
            offenNeu.push(i);
        }
    });

    const bewegungen = [];

    /* 1. Der bekannte Zug aus dem Verlauf (auch Umwandlung und Springer). */
    if (animieren && bekannterZug) {
        for (const weg of bekannterZug) {
            const g = offenAlt.get(weg.von);
            const stelle = offenNeu.indexOf(weg.nach);
            if (g && stelle !== -1) {
                const ziel = beschreibung.zellen[weg.nach].figur;
                if (ziel.farbe === g.userData.farbe) {
                    bewegungen.push({ g, von: weg.von, nach: weg.nach, neu: ziel });
                    offenAlt.delete(weg.von);
                    offenNeu.splice(stelle, 1);
                }
            }
        }
    }

    /* 1b. An Ort und Stelle verwandelt: Meuterei (andere Farbe, gleiche
           Art) oder Verstärkung (gleiche Farbe, andere Art) — die Figur
           dreht sich und ist danach die neue, statt zu verschwinden und neu
           zu erscheinen. */
    if (animieren) {
        for (let n = offenNeu.length - 1; n >= 0; n--) {
            const i = offenNeu[n];
            const g = offenAlt.get(i);
            if (!g) continue;
            const ziel = beschreibung.zellen[i].figur;
            const meuterei = ziel.farbe !== g.userData.farbe && ziel.art === g.userData.art;
            const aufstieg = ziel.farbe === g.userData.farbe && ziel.art !== g.userData.art;
            if (!meuterei && !aufstieg) continue;
            neu.set(i, g);
            offenAlt.delete(i);
            offenNeu.splice(n, 1);
            verwandeln(g, ziel, meuterei);
        }
    }

    /* 2. Übrige: nächste gleiche Figur in der Nähe (Nudelholz, Erdrutsch,
          Schubs, Platztausch …). */
    if (animieren) {
        for (let n = offenNeu.length - 1; n >= 0; n--) {
            const i = offenNeu[n];
            const ziel = beschreibung.zellen[i].figur;
            let beste = null, besteWeite = 3.01;
            for (const [j, g] of offenAlt) {
                if (g.userData.art !== ziel.art || g.userData.farbe !== ziel.farbe) continue;
                const w = abstand(i, j);
                if (w < besteWeite) { beste = j; besteWeite = w; }
            }
            if (beste !== null) {
                bewegungen.push({ g: offenAlt.get(beste), von: beste, nach: i, neu: ziel });
                offenAlt.delete(beste);
                offenNeu.splice(n, 1);
            }
        }
    }

    const schlagOrte = new Set(bewegungen.map((b) => b.nach));

    /* 3a. Die Bahnen planen, BEVOR sich etwas bewegt (seit v0.132.0):
           Wer geschlagen wird, ist weg, bevor der Angreifer ihn berührt;
           wer zieht, springt so hoch, dass er über jede Figur auf seinem
           Weg kommt. */
    const plan = animieren ? bahnenPlanen(bewegungen, neu, offenAlt, schlagOrte, extras) : null;

    /* 3. Weg ist weg: geschlagen (wegschleudern) oder verschwunden. */
    for (const [j, g] of offenAlt) {
        if (animieren && schlagOrte.has(j)) {
            wegschleudern(g, plan.opferStart.get(j) || 0);
        } else if (animieren) {
            verschwinden(g);
        } else {
            figurEntfernen(g);
        }
    }

    /* 4. Die Bewegungen. */
    for (const b of bewegungen) {
        neu.set(b.nach, b.g);
        ziehen(b.g, b.von, b.nach, b.neu, schlagOrte.has(b.nach) && alt.has(b.nach) && alt.get(b.nach) !== b.g,
            plan ? plan.extra.get(b) : (extras ? extras.get(b.von) : null));
    }

    /* 5. Neu da: erscheinen. */
    for (const i of offenNeu) {
        const eintrag = beschreibung.zellen[i].figur;
        const g = figurBauen(eintrag, false);
        g.userData.getruebt = eintrag.getruebt;
        figurSetzen(g, i);
        Z.figurenGruppe.add(g);
        neu.set(i, g);
        if (animieren) erscheinen(g);
    }

    Z.figuren = neu;
}

function verwandeln(g, ziel, meuterei) {
    const start = g.rotation.y;
    let getauscht = false;
    g.userData.ziehtBis = performance.now() + dauer(560);
    tween(dauer(560), (t) => {
        g.rotation.y = start + raus(t) * Math.PI * 2;
        const hub = Math.sin(Math.PI * t) * 0.35;
        g.position.y = GEO.oberkante + hub;
        if (!getauscht && t >= 0.5) {
            getauscht = true;
            g.userData.art = ziel.art;
            g.userData.farbe = ziel.farbe;
            g.userData.netz.geometry = Z.formen[ziel.art];
            g.userData.netz.material = Z.mat[ziel.farbe];
            ausrichten(g);
        }
    }, () => {
        g.rotation.y = start;
        g.position.y = GEO.oberkante;
    });
    funkenWolke(g.position.clone().setY(GEO.oberkante + 0.6), meuterei ? "#c77dff" : "#ffd76a", 18, 1.0);
}

/* Teleport: an der alten Stelle im Wirbel vergehen, an der neuen im
   Wirbel entstehen — kein Bogen, kein Weg dazwischen. */
function teleportieren(g, a, b, warten) {
    const ms = dauer(230);
    g.userData.ziehtBis = performance.now() + warten + ms * 2;
    tween(ms, (t) => {
        const s = 1 - raus(t) * 0.99;
        g.scale.set(s, 1 + t * 0.6, s);
        g.rotation.y = t * Math.PI * 3;
    }, () => {
        funkenWolke(new THREE.Vector3(a.x, GEO.oberkante + 0.4, a.z), "#9b5de5", 12, 0.8);
        g.position.set(b.x, GEO.oberkante, b.z);
        tween(ms, (t) => {
            const s = 0.01 + raus(t) * 0.99;
            g.scale.set(s, 1 + (1 - t) * 0.6, s);
            g.rotation.y = (1 - t) * Math.PI * 3;
        }, () => {
            g.scale.set(1, 1, 1);
            g.rotation.set(0, 0, 0);
            funkenWolke(new THREE.Vector3(b.x, GEO.oberkante + 0.4, b.z), "#9b5de5", 12, 0.8);
        });
    }, warten);
}

/* Grundhöhe und Dauer eines Zugs — der Planer (`bahnenPlanen`) hebt die
   Höhe an, wenn etwas im Weg steht. */
function zugGrund(art, weite) {
    return {
        hoch: art === "springer" ? 0.75 + weite * 0.12 : 0.18 + weite * 0.07,
        ms: dauer(Math.min(420, 230 + weite * 22))
    };
}

function ziehen(g, von, nach, neu, schlaegt, extra) {
    const a = Z.felder[von].mitte.clone();
    const b = Z.felder[nach].mitte.clone();
    const weite = a.distanceTo(b);
    const grund = zugGrund(g.userData.art, weite);
    const hoch = (extra && extra.hoch) || grund.hoch;
    const ms = grund.ms;
    const warten = (extra && extra.verzoegerung) || 0;
    const y0 = GEO.oberkante;
    if (extra && extra.teleport) {
        teleportieren(g, a, b, warten);
        return;
    }
    g.userData.ziehtBis = performance.now() + warten + ms;

    tween(ms, (t) => {
        const k = weich(t);
        g.position.x = a.x + (b.x - a.x) * k;
        g.position.z = a.z + (b.z - a.z) * k;
        g.position.y = y0 + Math.sin(Math.PI * t) * hoch;
        const kipp = Math.sin(Math.PI * t) * 0.12;
        g.rotation.x = (b.z - a.z) / (weite || 1) * kipp;
        g.rotation.z = -(b.x - a.x) / (weite || 1) * kipp;
    }, () => {
        g.position.set(b.x, y0, b.z);
        g.rotation.set(0, 0, 0);
        /* Umwandlung: die neue Form erst bei der Landung. */
        if (neu && neu.art !== g.userData.art) {
            g.userData.art = neu.art;
            g.userData.netz.geometry = Z.formen[neu.art];
            ausrichten(g);
            funkenWolke(new THREE.Vector3(b.x, y0 + 0.6, b.z), "#ffd76a", 14, 0.9);
        }
        /* Landen: kurz stauchen. */
        tween(dauer(130), (t) => {
            const s = 1 - Math.sin(Math.PI * t) * 0.08;
            g.userData.netz.scale.set(1 + (1 - s) * 0.6, s, 1 + (1 - s) * 0.6);
        }, () => g.userData.netz.scale.set(1, 1, 1));
        if (schlaegt) {
            funkenWolke(new THREE.Vector3(b.x, y0 + 0.35, b.z), "#fff3b0", 12, 1.1);
        }
        staubRing(new THREE.Vector3(b.x, y0, b.z));
    }, warten);
}

/* Geschlagen: wuchtig, aber ohne Blut (VISION, 25.08.2026) — die Figur
   fliegt drehend vom Brett. */
/*
 * GESCHLAGEN (seit v0.132.0 ohne Durchdringung): Die Figur hebt senkrecht
 * aus ihrem Feld ab, dreht sich, schrumpft und zerfällt in Funken — fertig,
 * BEVOR der Angreifer sie berührt (`wartet` rechnet `bahnenPlanen`). Bis
 * v0.131.0 schlitterte sie drei Felder weit durch alles, was dahinter
 * stand, und der Angreifer steckte schon in ihr, wenn sie losflog.
 */
function wegschleudern(g, wartet) {
    const start = g.position.clone();
    const mat = g.userData.netz.material.clone();
    mat.transparent = true;
    g.userData.netz.material = mat;
    g.userData.netz.userData.eigenesMaterial = true;
    g.userData.eigenesMaterial = true;
    g.userData.ziehtBis = performance.now() + wartet + opferMs();
    tween(opferMs(), (t) => {
        const k = raus(t);
        g.position.set(start.x, start.y + k * 0.5, start.z);
        g.rotation.set(0, t * 5, 0);
        const s = Math.max(0.001, 1 - k);
        g.scale.set(s, s, s);
        mat.opacity = 1 - t;
    }, () => {
        figurEntfernen(g);
        funkenWolke(start.clone().setY(start.y + 0.5), "#ffe27a", 16, 1.4);
    }, wartet);
}

/* So lange braucht ein Geschlagener, um zu vergehen. */
function opferMs() {
    return dauer(170);
}

/* ------------------------------------------------------------------ *
 * Hitboxen und Bahnplanung (seit v0.132.0) — Haus-Regel „keine
 * Durchdringung": Keine Figur geht durch eine andere, auch nicht für
 * einen Augenblick.
 * ------------------------------------------------------------------ */

const LUFT = 0.04;   // Mindestabstand zwischen zwei Hitboxen beim Planen

/* Die Hitbox einer Art: stehender Zylinder um die Drehachse. Der Radius
   ist der weiteste Punkt der Form von der Achse — so passt er in jeder
   Drehung (der Springer schaut schräg). */
function hitbox(art) {
    Z.hitboxen = Z.hitboxen || {};
    if (!Z.hitboxen[art]) {
        const lage = Z.formen[art].attributes.position;
        let r = 0, h = 0;
        for (let i = 0; i < lage.count; i++) {
            r = Math.max(r, Math.hypot(lage.getX(i), lage.getZ(i)));
            h = Math.max(h, lage.getY(i));
        }
        Z.hitboxen[art] = { r, h };
    }
    return Z.hitboxen[art];
}

/* Wo ist ein Zug zur Zeit `ms` (ab Start aller Züge)? `y` ist die
   Unterkante über der Brettoberfläche — dieselbe Formel wie `ziehen`. */
function bahnOrt(bahn, ms) {
    const t = Math.min(1, Math.max(0, (ms - bahn.warten) / bahn.ms));
    const k = weich(t);
    return {
        x: bahn.a.x + (bahn.b.x - bahn.a.x) * k,
        z: bahn.a.z + (bahn.b.z - bahn.a.z) * k,
        y: Math.sin(Math.PI * t) * bahn.hoch
    };
}

function stossen(p, hp, q, hq) {
    if (Math.hypot(p.x - q.x, p.z - q.z) >= hp.r + hq.r + LUFT) return false;
    return p.y < q.y + hq.h + LUFT && q.y < p.y + hp.h + LUFT;
}

function bahnenPlanen(bewegungen, bleiben, offenAlt, schlagOrte, extras) {
    const plan = { extra: new Map(), opferStart: new Map() };
    const stehend = (i, g) => ({ ort: { x: Z.felder[i].mitte.x, z: Z.felder[i].mitte.z, y: 0 }, hb: hitbox(g.userData.art) });
    /* Was stehen bleibt — und was gleich vergeht, zählt vorsichtshalber
       für die ganze Dauer mit. */
    const stehen = [];
    for (const [i, g] of bleiben) stehen.push(stehend(i, g));
    for (const [j, g] of offenAlt) {
        if (!schlagOrte.has(j)) stehen.push(stehend(j, g));
    }

    const fertig = [];
    for (const bew of bewegungen) {
        const ex = extras ? extras.get(bew.von) : null;
        if (ex && ex.teleport) {
            plan.extra.set(bew, ex);
            continue;
        }
        const a = Z.felder[bew.von].mitte, b = Z.felder[bew.nach].mitte;
        const grund = zugGrund(bew.g.userData.art, Math.hypot(b.x - a.x, b.z - a.z));
        const hb = hitbox(bew.g.userData.art);
        const bahn = { a, b, ms: grund.ms, warten: (ex && ex.verzoegerung) || 0, hoch: (ex && ex.hoch) || grund.hoch };

        /* Der Geschlagene: vergangen, bevor der Angreifer ihn berührt. */
        const opfer = offenAlt.get(bew.nach);
        if (opfer && schlagOrte.has(bew.nach)) {
            const ho = hitbox(opfer.userData.art);
            const ort = { x: b.x, z: b.z, y: 0 };
            let kontakt = bahn.warten + bahn.ms;
            for (let ms = bahn.warten; ms <= bahn.warten + bahn.ms; ms += 4) {
                if (stossen(bahnOrt(bahn, ms), hb, ort, ho)) { kontakt = ms; break; }
            }
            const vorlauf = opferMs() + 10;
            if (kontakt < vorlauf) {
                /* Zu nah für die Zeit: Der Angreifer wartet so lange. */
                bahn.warten += vorlauf - kontakt;
                kontakt = vorlauf;
            }
            plan.opferStart.set(bew.nach, kontakt - vorlauf);
        }

        /* So hoch springen, bis nichts mehr im Weg ist — stehende Figuren
           und die Bahnen der Züge davor (Rochade, Nudelholz, Erdrutsch). */
        const hindernisse = stehen.concat(fertig);
        const frei = () => {
            for (let ms = bahn.warten; ms <= bahn.warten + bahn.ms; ms += 6) {
                const p = bahnOrt(bahn, ms);
                for (const h of hindernisse) {
                    if (stossen(p, hb, h.bahn ? bahnOrt(h.bahn, ms) : h.ort, h.hb)) return false;
                }
            }
            return true;
        };
        let runden = 0;
        while (!frei() && runden < 60) {
            bahn.hoch += 0.05;
            runden++;
        }
        if (runden >= 60) console.warn("3D-Brett: Bahn nicht frei", bew.von, bew.nach);
        fertig.push({ bahn, hb });
        plan.extra.set(bew, { hoch: bahn.hoch, verzoegerung: bahn.warten });
    }
    return plan;
}

/*
 * DIE PRÜFUNG FÜR DIE WERKSTATT: `BRETT_3D.kollisionen(true)` schaltet sie
 * ein; ab dann misst jedes Bild alle Figuren- und Lootbox-Hitboxen
 * gegeneinander und merkt sich jeden Zusammenstoss. `kollisionen()` gibt
 * die Liste zurück — nach jeder Animation muss sie leer sein.
 */
function kollisionenMessen() {
    const teile = [];
    for (const g of Z.figurenGruppe.children) {
        if (!g.userData || !g.userData.art || g.userData.geist) continue;
        const hb = hitbox(g.userData.art);
        const netz = g.userData.netz.scale;
        const sr = g.scale.x * netz.x, sh = g.scale.y * netz.y;
        if (sr < 0.05) continue;
        teile.push({ name: g.userData.farbe + " " + g.userData.art,
            ort: { x: g.position.x, z: g.position.z, y: g.position.y - GEO.oberkante },
            hb: { r: hb.r * sr, h: hb.h * sh } });
    }
    for (const g of Z.effektGruppe.children) {
        if (!g.userData || !g.userData.dreher) continue;
        const s = g.scale.x;
        if (s < 0.05) continue;
        /* Der Würfel dreht sich: Hitbox bis zur Raumdiagonale. */
        const halb = BOX_MASS / 2 * s * 1.42;
        teile.push({ name: "lootbox", ort: { x: g.position.x, z: g.position.z, y: g.position.y - GEO.oberkante - halb },
            hb: { r: halb, h: halb * 2 } });
    }
    for (let i = 0; i < teile.length; i++) {
        for (let j = i + 1; j < teile.length; j++) {
            const p = teile[i], q = teile[j];
            const d = Math.hypot(p.ort.x - q.ort.x, p.ort.z - q.ort.z);
            if (d >= p.hb.r + q.hb.r) continue;
            if (p.ort.y < q.ort.y + q.hb.h && q.ort.y < p.ort.y + p.hb.h) {
                Z.stoesse.push({ a: p.name, b: q.name, abstand: +d.toFixed(3),
                    hoehe: [+p.ort.y.toFixed(2), +q.ort.y.toFixed(2)] });
            }
        }
    }
}

/*
 * DIE PRÜFUNG DES RUHEBILDS: Verdeckt eine Figur eine andere? Gerechnet
 * für den schlimmsten Fall — König vor König und vor Springer auf JEDEM
 * Feld, Umriss aus den echten Formpunkten, 5 Prozent grösser als echt —
 * mit der Kamera, wie sie gerade steht. Gibt die Paare zurück; leer = gut.
 */
function ueberdeckungen() {
    if (!Z.masse) return null;
    const { spalten, reihen } = Z.masse;
    const kam = Z.kamera;
    const punkte = (art) => {
        const lage = Z.formen[art].attributes.position;
        const schritt = Math.max(1, Math.floor(lage.count / 400));
        const aus = [];
        for (let i = 0; i < lage.count; i += schritt) aus.push([lage.getX(i) * 1.05, lage.getY(i) * 1.05, lage.getZ(i) * 1.05]);
        return aus;
    };
    const huelle = (P) => {
        P.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
        const kreuz = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
        const unten = [], oben = [];
        for (const p of P) { while (unten.length >= 2 && kreuz(unten[unten.length - 2], unten[unten.length - 1], p) <= 0) unten.pop(); unten.push(p); }
        for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; while (oben.length >= 2 && kreuz(oben[oben.length - 2], oben[oben.length - 1], p) <= 0) oben.pop(); oben.push(p); }
        return unten.slice(0, -1).concat(oben.slice(0, -1));
    };
    const v = new THREE.Vector3();
    const umriss = (P, i) => {
        const m = Z.felder[i].mitte;
        return huelle(P.map(([x, y, z]) => { v.set(x + m.x, y + GEO.oberkante, z + m.z).project(kam); return [v.x * kam.aspect, v.y]; }));
    };
    const trennt = (A, B) => {
        for (const H of [A, B]) {
            for (let i = 0; i < H.length; i++) {
                const p = H[i], q = H[(i + 1) % H.length];
                const n = [q[1] - p[1], p[0] - q[0]];
                let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
                for (const w of A) { const d = w[0] * n[0] + w[1] * n[1]; a0 = Math.min(a0, d); a1 = Math.max(a1, d); }
                for (const w of B) { const d = w[0] * n[0] + w[1] * n[1]; b0 = Math.min(b0, d); b1 = Math.max(b1, d); }
                if (a1 < b0 || b1 < a0) return true;
            }
        }
        return false;
    };
    const vorn = punkte("koenig");
    const paare = [];
    for (const hinten of [punkte("koenig"), punkte("springer")]) {
        for (let i = 0; i < Z.felder.length; i++) {
            if (!Z.felder[i] || !Z.felder[i].da) continue;
            const s = i % spalten, r = Math.floor(i / spalten);
            const A = umriss(vorn, i);
            for (const [ds, dr] of [[0, -1], [-1, -1], [1, -1], [-1, 0], [1, 0], [0, 1], [-1, 1], [1, 1]]) {
                const s2 = s + ds, r2 = r + dr;
                if (s2 < 0 || s2 >= spalten || r2 < 0 || r2 >= reihen) continue;
                const j = r2 * spalten + s2;
                if (!Z.felder[j] || !Z.felder[j].da) continue;
                if (!trennt(A, umriss(hinten, j))) paare.push([i, j]);
            }
        }
    }
    return paare;
}

function verschwinden(g) {
    const mat = g.userData.netz.material.clone();
    mat.transparent = true;
    g.userData.netz.material = mat;
    g.userData.netz.userData.eigenesMaterial = true;
    tween(dauer(320), (t) => {
        const s = 1 - raus(t) * 0.9;
        g.scale.set(s, s, s);
        mat.opacity = 1 - t;
    }, () => figurEntfernen(g));
    funkenWolke(g.position.clone().setY(g.position.y + 0.4), "#d9d4ff", 10, 0.7);
}

function erscheinen(g) {
    g.scale.set(0.01, 0.01, 0.01);
    tween(dauer(360), (t) => {
        const k = raus(t);
        const s = k + Math.sin(Math.PI * t) * 0.12;
        g.scale.set(s, s, s);
    }, () => g.scale.set(1, 1, 1));
    funkenWolke(g.position.clone().setY(g.position.y + 0.2), "#ffffff", 10, 0.8);
}

/* ------------------------------------------------------------------ *
 * Das Nudelholz (Fähigkeit): eine Holzwalze rollt über eine Bahn
 * ------------------------------------------------------------------ */

function nudelholzRollen(beschreibung, eintrag, bekannt) {
    const zuAnzeige = new Map(beschreibung.zellen.map((z, i) => [z.feld, i]));
    const bahn = (eintrag.felder || []).filter((f) => zuAnzeige.has(f)).map((f) => zuAnzeige.get(f));
    if (bahn.length === 0) return null;
    const erster = bekannt[0];
    const richtung = Z.felder[erster.nach].mitte.clone().sub(Z.felder[erster.von].mitte).setY(0);
    if (richtung.lengthSq() < 0.01) return null;
    richtung.normalize();

    /* Anfang und Ende der Bahn entlang der Rollrichtung. */
    const lage = (i) => Z.felder[i].mitte.dot(richtung);
    let min = Infinity, max = -Infinity, mitte = new THREE.Vector3();
    for (const i of bahn) {
        min = Math.min(min, lage(i));
        max = Math.max(max, lage(i));
        mitte.add(Z.felder[i].mitte);
    }
    mitte.divideScalar(bahn.length);
    const quer = new THREE.Vector3(-richtung.z, 0, richtung.x);
    const basis = mitte.clone().sub(richtung.clone().multiplyScalar(mitte.dot(richtung)));
    const start = basis.clone().addScaledVector(richtung, min - 0.9);
    const ende = basis.clone().addScaledVector(richtung, max + 0.9);
    const weg = start.distanceTo(ende);
    const roll = dauer(900);

    const holz = Z.mat.holz || (Z.mat.holz = new THREE.MeshPhysicalMaterial({ color: 0xc8955a, roughness: 0.55, clearcoat: 0.2 }));
    const walze = new THREE.Group();
    const r = 0.1;
    const koerper = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.86, 24), holz);
    const griffGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.22, 12);
    const griff1 = new THREE.Mesh(griffGeo, holz);
    const griff2 = new THREE.Mesh(griffGeo, holz);
    griff1.position.y = 0.54; griff2.position.y = -0.54;
    koerper.castShadow = true;
    const achse = new THREE.Group();
    achse.add(koerper, griff1, griff2);
    walze.add(achse);
    /* Die Walze liegt quer zur Rollrichtung. */
    walze.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), quer);
    walze.traverse((o) => { if (o.isMesh) { o.userData.eigeneForm = true; } });
    Z.effektGruppe.add(walze);

    tween(roll, (t) => {
        const ort = start.clone().lerp(ende, t);
        walze.position.set(ort.x, GEO.oberkante + r, ort.z);
        achse.rotation.set(0, (t * weg) / r, 0);
        const blende = Math.min(1, t * 8, (1 - t) * 8);
        walze.scale.setScalar(0.3 + 0.7 * blende);
    }, () => {
        Z.effektGruppe.remove(walze);
        walze.traverse((o) => { if (o.isMesh) o.geometry.dispose(); });
    });

    /* Jede Figur springt, kurz bevor die Walze sie erreicht. */
    const extras = new Map();
    for (const w of bekannt) {
        const t = (lage(w.von) - (min - 0.9)) / weg;
        extras.set(w.von, { verzoegerung: Math.max(0, t * roll - dauer(140)), hoch: 0.5 });
    }
    return extras;
}

/* ------------------------------------------------------------------ *
 * Geister (Gräber beim Nekromanten, Vorschläge im Team)
 * ------------------------------------------------------------------ */

function geisterAbgleichen(beschreibung) {
    for (const [i, g] of Z.geister) {
        const z = beschreibung.zellen[i];
        if (!z || !z.geist || z.geist.art !== g.userData.art || z.geist.farbe !== g.userData.farbe) {
            figurEntfernen(g);
            Z.geister.delete(i);
        }
    }
    beschreibung.zellen.forEach((z, i) => {
        if (!z.geist || Z.geister.has(i)) return;
        const g = figurBauen(z.geist, true);
        figurSetzen(g, i);
        Z.figurenGruppe.add(g);
        Z.geister.set(i, g);
    });
}

/* ------------------------------------------------------------------ *
 * Lootboxen — echte Würfel, die über dem Feld schweben
 * ------------------------------------------------------------------ */

function boxBauen(box) {
    const art = box.pech ? "pech" : "gabe";
    const bunt = box.stufe === "unbekannt";
    const kasten = new THREE.Mesh(Z.formen["box_" + art + (bunt ? "_bunt" : "")], boxMaterial(box.stufe));
    const einlage = new THREE.Mesh(Z.formen["einlage_" + art], Z.mat.einlage);
    kasten.castShadow = true;
    const gruppe = new THREE.Group();
    const dreher = new THREE.Group();
    dreher.add(kasten, einlage);
    gruppe.add(dreher);
    gruppe.userData = { stufe: box.stufe, pech: box.pech, dreher, phase: Math.random() * Math.PI * 2 };
    return gruppe;
}

function boxenAbgleichen(beschreibung, animieren, gewonnen) {
    const neu = new Map();
    beschreibung.zellen.forEach((z, i) => {
        if (!z.box) return;
        const alt = Z.boxen.get(i);
        if (alt && alt.userData.stufe === z.box.stufe && alt.userData.pech === z.box.pech) {
            neu.set(i, alt);
            Z.boxen.delete(i);
            return;
        }
        if (alt) {
            Z.effektGruppe.remove(alt);
            Z.boxen.delete(i);
        }
        const g = boxBauen(z.box);
        const m = Z.felder[i].mitte;
        g.position.set(m.x, GEO.oberkante, m.z);
        Z.effektGruppe.add(g);
        neu.set(i, g);
        if (animieren && !alt) {
            /* Fällt von oben herein und federt aus. */
            g.userData.einflug = 1;
            tween(dauer(520), (t) => { g.userData.einflug = 1 - raus(t); }, () => { g.userData.einflug = 0; });
        }
    });
    /* Eingesammelt oder gefressen: in die Höhe drehen und zerplatzen —
       oder, wenn eine neue Karte in einer Hand liegt, aufspringen und sie
       herausfliegen lassen (seit v0.127.0). */
    for (const g of Z.boxen.values()) {
        if (!animieren) {
            Z.effektGruppe.remove(g);
            continue;
        }
        const hex = FARBE.stufe[g.userData.stufe] || "#ffffff";
        const ort = g.position.clone();
        g.userData.weg = true;
        const inhalt = gewinnZuordnen(g.userData, gewonnen);
        if (inhalt && !Z.reduziert) {
            boxOeffnen(g, inhalt);
            continue;
        }
        /* Sofort und schnell nach oben (seit v0.132.0) — bis dahin wartete
           sie 140 ms, und die ankommende Figur fuhr in sie hinein. */
        tween(dauer(420), (t) => {
            g.userData.dreher.rotation.y += 0.35;
            const s = 1 + t * 0.4;
            g.scale.set(s * (1 - t), s * (1 - t), s * (1 - t));
            g.position.y = ort.y + raus(Math.min(1, t * 2.1)) * BOX_HUB;
        }, () => {
            Z.effektGruppe.remove(g);
            funkenWolke(g.position.clone(), hex, 18, 1.2);
        });
    }
    Z.boxen = neu;
}

/* ------------------------------------------------------------------ *
 * Die Lootbox springt auf (seit v0.127.0, ROADMAP 61)
 *
 * WAS DRIN WAR, LIEST DAS BRETT AB, es rechnet es nicht: Zwischen zwei
 * Zeichnungen wächst eine Hand (Fähigkeiten oder Unglückskarten) um genau
 * die Karte, die die Box hergab. `handZuwachs` vergleicht die Hände mit dem
 * letzten Stand; jede verschwundene Box sucht sich daraus die Karte ihrer
 * Art (Gabe oder Unglück) und Stufe. Findet sie keine (Unglück ohne Karte,
 * gefressen von Mauer oder Riss), zerplatzt sie wie bisher.
 * ------------------------------------------------------------------ */

function handZaehlen(partie) {
    const hand = {};
    for (const farbeName of ["weiss", "schwarz"]) {
        const zaehler = {};
        const gaben = (partie.faehigkeiten && partie.faehigkeiten[farbeName]) || [];
        for (const art of gaben) zaehler["g:" + art] = (zaehler["g:" + art] || 0) + 1;
        const pech = (partie.unglueckskarten && partie.unglueckskarten[farbeName]) || [];
        for (const karte of pech) {
            const art = karte && (karte.art || karte);
            if (typeof art === "string") zaehler["p:" + art] = (zaehler["p:" + art] || 0) + 1;
        }
        hand[farbeName] = zaehler;
    }
    return hand;
}

function handZuwachs(partie) {
    const jetzt = handZaehlen(partie);
    const vorher = Z.hand;
    Z.hand = jetzt;
    if (!vorher) return [];
    const neu = [];
    for (const farbeName of ["weiss", "schwarz"]) {
        for (const [schluessel, anzahl] of Object.entries(jetzt[farbeName])) {
            const mehr = anzahl - (vorher[farbeName][schluessel] || 0);
            for (let n = 0; n < mehr; n++) {
                const pech = schluessel.startsWith("p:");
                const art = schluessel.slice(2);
                let stufe = "unbekannt";
                try {
                    stufe = (pech ? SCHACH_VARIANTEN.pechStufeVon(art) : SCHACH_VARIANTEN.stufeVon(art)).id;
                } catch (fehler) { /* dann eben ohne Stufe */ }
                neu.push({ art, pech, stufe, farbe: farbeName });
            }
        }
    }
    return neu;
}

function gewinnZuordnen(box, gewonnen) {
    if (!gewonnen || !gewonnen.length) return null;
    let stelle = gewonnen.findIndex((e) => e.pech === !!box.pech && e.stufe === box.stufe);
    if (stelle < 0) stelle = gewonnen.findIndex((e) => e.pech === !!box.pech);
    if (stelle < 0) return null;
    return gewonnen.splice(stelle, 1)[0];
}

function kartenTextur(art) {
    Z.kartenTex = Z.kartenTex || new Map();
    if (Z.kartenTex.has(art)) return Z.kartenTex.get(art);
    const adresse = (typeof FAEHIGKEIT_ZEICHEN !== "undefined") && FAEHIGKEIT_ZEICHEN.plaettchen[art];
    if (!adresse) return null;
    const tex = new THREE.TextureLoader().load(adresse, () => anstossen());
    tex.colorSpace = THREE.SRGBColorSpace;
    Z.kartenTex.set(art, tex);
    return tex;
}

function boxOeffnen(g, inhalt) {
    const ort = g.position.clone();
    const hex = FARBE.stufe[g.userData.stufe] || FARBE.stufe[inhalt.stufe] || "#ffffff";

    /* 1. Hochspringen und schneller drehen — wie ein Deckel, der aufwill.
          Seit v0.132.0 schnell und hoch: Die Figur, die das Feld betritt,
          kommt gleichzeitig an und darf nicht in die Box geraten. */
    tween(dauer(200), (t) => {
        g.userData.dreher.rotation.y += 0.25 + t * 0.5;
        const s = 1 + weich(t) * 0.25;
        g.scale.set(s, s, s);
        g.position.y = ort.y + raus(t) * BOX_HUB;
    }, () => {
        const mitte = g.position.clone();
        Z.effektGruppe.remove(g);

        /* 2. Die Wände fliegen auseinander. */
        const wand = GEO.wand || (GEO.wand = new THREE.BoxGeometry(BOX_MASS * 0.95, BOX_MASS * 0.95, 0.05));
        const richtungen = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
        for (const [x, y, z] of richtungen) {
            const mat = boxMaterial(g.userData.stufe).clone();
            mat.transparent = true;
            if (mat.vertexColors) {
                mat.vertexColors = false;
                mat.color = farbe(FARBE.stufe.unbekannt);
            }
            const stueck = new THREE.Mesh(wand, mat);
            stueck.userData.eigenesMaterial = true;
            stueck.position.copy(mitte).add(new THREE.Vector3(x, y, z).multiplyScalar(BOX_MASS * 0.55));
            stueck.lookAt(mitte.clone().add(new THREE.Vector3(x, y, z).multiplyScalar(2)));
            Z.effektGruppe.add(stueck);
            const v = new THREE.Vector3(x * 1.6, 1.2 + y * 1.2 + Math.random() * 0.6, z * 1.6);
            Z.partikel.push({ obj: stueck, v, leben: 0, max: 620, schwer: 5.5 });
        }
        funkenWolke(mitte, hex, 22, 1.4);

        /* 3. Die Karte steigt heraus, dreht sich zweimal um, bleibt kurz
              stehen und fliegt zu ihrer Hand (unten die eigene Seite). */
        const tex = kartenTextur(inhalt.art);
        if (!tex) return;
        const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
        const karte = new THREE.Sprite(mat);
        karte.renderOrder = 10;
        karte.position.copy(mitte);
        Z.effektGruppe.add(karte);
        const B = 0.71, H = 1.0;
        const hoch = mitte.clone().setY(mitte.y + 1.25);
        const halbZ = (Z.masse ? Z.masse.reihen : 8) / 2;
        const unten = inhalt.farbe === Z.untenFarbe;
        const ziel = unten ? new THREE.Vector3(mitte.x * 0.3, 0.9, halbZ + 1.6)
            : new THREE.Vector3(mitte.x * 0.3, 2.2, -halbZ - 0.6);

        tween(dauer(620), (t) => {
            const k = raus(t);
            karte.position.lerpVectors(mitte, hoch, k);
            const gross = 0.25 + k * 1.15;
            const drehen = Math.abs(Math.cos(k * Math.PI * 2));
            karte.scale.set(B * gross * Math.max(0.06, drehen), H * gross, 1);
        }, () => {
            tween(dauer(520), (t) => {
                const k = weich(t);
                karte.position.lerpVectors(hoch, ziel, k);
                const gross = 1.4 - k * 1.0;
                karte.scale.set(B * gross, H * gross, 1);
                mat.opacity = 1 - Math.max(0, (t - 0.6) / 0.4);
            }, () => {
                Z.effektGruppe.remove(karte);
                mat.dispose();
            }, dauer(450));
        });
    });
}

/* ------------------------------------------------------------------ *
 * Der Friedhof: Grabsteine auf einer Ablage (seit v0.127.0, ROADMAP 62)
 *
 * NUTZER-ANSAGE 24.09.2026: „Friedhof soll nicht mehr durchsichtige
 * Figuren zeigen, sondern Grabsteine, worauf das Profil der Figur 2D
 * eingraviert wurde — so wenig Text wie möglich, so intuitiv wie möglich."
 * (Die Haus-Entscheidung „kein Grabstein, Zielgruppe ab sechs" von v0.63.0
 * galt dem Nekromant-Zeichen; hier hat der Nutzer ausdrücklich Grabsteine
 * bestellt. Sie bleiben freundlich: glatter Stein, runder Bogen, keine
 * Schrift, kein Kreuz.)
 *
 * SO LIEST MAN ES OHNE TEXT:
 *   - EIN Stein je gefallener Figur — zählen heisst hinschauen.
 *   - Die Steinfarbe ist die Seite: Weiss fällt auf hellen Stein, Schwarz
 *     auf dunklen. Links stehen die der oberen Seite (was unten erbeutet
 *     hat), rechts die eigenen — jede Gruppe nach Wert, die wertvollste
 *     aussen.
 *   - Das eingravierte Seitenprofil sagt, wer es war; wertvolle Figuren
 *     bekommen grössere Steine, Bauern kleinere.
 *
 * Gelesen wird `SCHACH_RUNDE.bilanz(...).verloren` — das Modell entscheidet,
 * wer gefallen ist. NUR VORN: Eine Ablage hinter der 8. Reihe war im
 * Schrägblick verdeckt (angesehen 24.09.2026); vorn kostet sie kaum Brett,
 * der Blick ist im Hochformat durch die Breite begrenzt. Neu Gefallene
 * fallen verzögert von oben herein (erst `wegschleudern`, dann landen);
 * nie ineinander — reicht die Ablage nicht, werden alle Steine kleiner.
 * ------------------------------------------------------------------ */

const ABLAGE_TIEFE = 0.72;       // Tiefe der Ablage (in Feldern)
const ABLAGE_LUECKE = 0.16;      // Luft zwischen Schrift und Ablage
const ABLAGE_DICKE = 0.05;
const BUCHSTABE_ART = { B: "bauer", S: "springer", L: "laeufer", T: "turm", D: "dame", K: "koenig" };
const ART_WERT = { bauer: 1, springer: 3, laeufer: 3, turm: 5, dame: 9, koenig: 10 };

/* Der Grabstein, in Einheiten seiner Breite: Bogen oben, flacher Fuss. */
const GRAB_HOEHE = 1.4;
const GRAB_TIEFE = 0.26;
const GRAB_BREITE = 0.46;        // Breite eines Steins, in Feldern
const GRAB_NEIGUNG = 0.42;       // nach hinten gelehnt: die Gravur schaut zum Blick
const GRAB_GROESSE = { bauer: 0.8, springer: 0.92, laeufer: 0.92, turm: 0.96, dame: 1.06, koenig: 1.1 };
const GRAB_STEIN = {
    weiss: { stein: "#d8d3c8", gravur: "#6d665a" },
    schwarz: { stein: "#3b4049", gravur: "#b9b2a2" }
};
const GRAB_RASTER_B = 128;
const GRAB_RASTER_H = Math.round(128 * GRAB_HOEHE);

/* Wo die Ablage liegt (z der Mitte); gebraucht auch vom Blick. */
function ablageMitte() {
    return Z.masse.reihen / 2 + SCHRIFT_ABSTAND + 0.2 + ABLAGE_LUECKE + ABLAGE_TIEFE / 2;
}

function grabsteinForm() {
    if (GEO.grab) return GEO.grab;
    const bogen = 0.5;
    const form = new THREE.Shape();
    form.moveTo(-0.5, 0);
    form.lineTo(0.5, 0);
    form.lineTo(0.5, GRAB_HOEHE - bogen);
    form.absarc(0, GRAB_HOEHE - bogen, bogen, 0, Math.PI, false);
    form.lineTo(-0.5, 0);
    const geo = new THREE.ExtrudeGeometry(form, {
        depth: GRAB_TIEFE, curveSegments: 20,
        bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.035, bevelSegments: 2
    });
    geo.computeBoundingBox();
    const bb = geo.boundingBox;
    /* Fuss auf y = 0, Tiefe mittig; die Vorderseite bekommt ihr Bild über
       eigene UVs aus x und y (Umriss samt Fase = ganzes Bild). */
    geo.translate(0, -bb.min.y, -(bb.min.z + bb.max.z) / 2);
    geo.computeBoundingBox();
    const b2 = geo.boundingBox;
    const pos = geo.attributes.position;
    const uv = geo.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
        uv.setXY(i, (pos.getX(i) - b2.min.x) / (b2.max.x - b2.min.x),
            (pos.getY(i) - b2.min.y) / (b2.max.y - b2.min.y));
    }
    uv.needsUpdate = true;
    GEO.grab = geo;
    return geo;
}

/* Das Seitenprofil einer Figur als Maske (0 bis 1), so gross wie das
   Raster der Steinvorderseite. JEDE Figur füllt ihren Stein — klein
   gezeichnet war der Bauer auf dem Handy nicht zu erkennen; wie wertvoll
   sie war, sagt schon die Steingrösse. */
function profilMaske(art) {
    const szene = new THREE.Scene();
    const netz = new THREE.Mesh(Z.formen[art], new THREE.MeshBasicMaterial({ color: 0xffffff }));
    /* Der Springer von der Seite, sonst wäre er nur ein Klotz. */
    if (art === "springer") netz.rotation.y = Math.PI / 2;
    szene.add(netz);
    netz.updateMatrixWorld();
    const kiste = new THREE.Box3().setFromObject(netz);
    const mitte = (kiste.min.x + kiste.max.x) / 2;
    const seite = Math.max(kiste.max.y - kiste.min.y, (kiste.max.x - kiste.min.x) * 1.1) * 1.04;
    const kamera = new THREE.OrthographicCamera(mitte - seite / 2, mitte + seite / 2,
        kiste.min.y + 0.98 * seite, kiste.min.y - 0.02 * seite, 0.1, 50);
    kamera.position.set(0, 0, 10);
    kamera.updateProjectionMatrix();

    const r = miniRenderer();
    r.setSize(96, 96, false);
    r.render(szene, kamera);
    netz.material.dispose();

    const leinwand = document.createElement("canvas");
    leinwand.width = GRAB_RASTER_B;
    leinwand.height = GRAB_RASTER_H;
    const ctx = leinwand.getContext("2d");
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, GRAB_RASTER_B, GRAB_RASTER_H);
    /* Das Profil steht im Stein, der Fuss ein Stück über dem Boden. */
    const g = GRAB_RASTER_B * 1.05;
    ctx.drawImage(r.domElement, (GRAB_RASTER_B - g) / 2, GRAB_RASTER_H * 0.92 - g, g, g);
    const daten = ctx.getImageData(0, 0, GRAB_RASTER_B, GRAB_RASTER_H).data;
    const maske = new Float32Array(GRAB_RASTER_B * GRAB_RASTER_H);
    for (let i = 0; i < maske.length; i++) maske[i] = daten[i * 4] / 255;
    return maske;
}

/* Bild und Normalen der Steinvorderseite: Grund in Steinfarbe, das Profil
   eingetieft und in der Gravurfarbe — wie gemeisselt. */
function grabMaterial(art, farbeName) {
    const schluessel = "grab_" + art + "_" + farbeName;
    if (Z.mat[schluessel]) return Z.mat[schluessel];
    const b = GRAB_RASTER_B, h = GRAB_RASTER_H;
    const scharf = profilMaske(art);
    const tiefe = kaestchenWeich(kaestchenWeich(scharf, b, h, 1, 0), b, h, 0, 1);

    const stein = farbe(GRAB_STEIN[farbeName].stein);
    const gravur = farbe(GRAB_STEIN[farbeName].gravur);
    const bild = document.createElement("canvas");
    bild.width = b; bild.height = h;
    const normal = document.createElement("canvas");
    normal.width = b; normal.height = h;
    const bildDaten = bild.getContext("2d").createImageData(b, h);
    const normalDaten = normal.getContext("2d").createImageData(b, h);
    const c = new THREE.Color();
    const staerke = 3.2;
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < b; x++) {
            const i = y * b + x;
            /* Eingetieft heisst: Höhe = minus Tiefe. Die Wände einer Grube
               schauen in die Grube hinein; Bildzeilen laufen nach unten, die
               Normalen-Karte zählt y nach oben. */
            const l = tiefe[y * b + Math.max(0, x - 1)], r = tiefe[y * b + Math.min(b - 1, x + 1)];
            const o = tiefe[Math.max(0, y - 1) * b + x], u = tiefe[Math.min(h - 1, y + 1) * b + x];
            const nx = (r - l) * staerke, ny = (o - u) * staerke, nz = 1;
            const laenge = Math.hypot(nx, ny, nz);
            normalDaten.data[i * 4] = (nx / laenge * 0.5 + 0.5) * 255;
            normalDaten.data[i * 4 + 1] = (ny / laenge * 0.5 + 0.5) * 255;
            normalDaten.data[i * 4 + 2] = (nz / laenge * 0.5 + 0.5) * 255;
            normalDaten.data[i * 4 + 3] = 255;
            c.copy(stein).lerp(gravur, Math.min(1, scharf[i] * 0.85 + tiefe[i] * 0.15));
            /* Ein Hauch Körnung, damit es nach Stein aussieht. */
            const korn = ((((x * 7349) ^ (y * 1931)) & 15) / 15) * 0.05 - 0.025;
            bildDaten.data[i * 4] = Math.max(0, Math.min(255, (c.r + korn) * 255));
            bildDaten.data[i * 4 + 1] = Math.max(0, Math.min(255, (c.g + korn) * 255));
            bildDaten.data[i * 4 + 2] = Math.max(0, Math.min(255, (c.b + korn) * 255));
            bildDaten.data[i * 4 + 3] = 255;
        }
    }
    bild.getContext("2d").putImageData(bildDaten, 0, 0);
    normal.getContext("2d").putImageData(normalDaten, 0, 0);
    const karte = new THREE.CanvasTexture(bild);
    karte.colorSpace = THREE.SRGBColorSpace;
    const normalKarte = new THREE.CanvasTexture(normal);
    const vorn = new THREE.MeshStandardMaterial({
        map: karte, normalMap: normalKarte, normalScale: new THREE.Vector2(1.4, 1.4), roughness: 0.82
    });
    const seite = new THREE.MeshStandardMaterial({ color: stein, roughness: 0.85 });
    Z.mat[schluessel] = [vorn, seite];
    return Z.mat[schluessel];
}

function friedhofAbgleichen(partie, animieren) {
    if (!Z.friedhofGruppe) {
        Z.friedhofGruppe = new THREE.Group();
        Z.szene.add(Z.friedhofGruppe);
    }
    const gruppe = Z.friedhofGruppe;
    const zeigen = Z.mitAblage && typeof SCHACH_RUNDE !== "undefined";
    const vorher = Z.friedhofStand || { weiss: [], schwarz: [] };
    const jetzt = { weiss: [], schwarz: [] };
    if (zeigen) {
        for (const farbeName of ["weiss", "schwarz"]) {
            try {
                jetzt[farbeName] = SCHACH_RUNDE.bilanz(partie, farbeName).verloren
                    .map((b) => BUCHSTABE_ART[b]).filter(Boolean);
            } catch (fehler) { /* ohne Bilanz keine Ablage */ }
        }
    }
    const schluessel = JSON.stringify(jetzt) + Z.untenFarbe + Z.masse.schluessel;
    if (schluessel === Z.friedhofSchluessel) return;
    Z.friedhofSchluessel = schluessel;
    Z.friedhofStand = jetzt;

    leeren(gruppe);
    if (!zeigen) return;

    const z0 = ablageMitte();
    const breite = Z.masse.spalten - 0.3;
    GEO.ablage = GEO.ablage || {};
    if (!GEO.ablage[breite]) {
        GEO.ablage[breite] = new RoundedBoxGeometry(breite, ABLAGE_DICKE, ABLAGE_TIEFE, 3, 0.02);
    }
    if (!Z.mat.ablage) {
        Z.mat.ablage = new THREE.MeshPhysicalMaterial({ color: 0x4a5160, roughness: 0.55, clearcoat: 0.3 });
    }
    const schale = new THREE.Mesh(GEO.ablage[breite], Z.mat.ablage);
    schale.position.set(0, ABLAGE_DICKE / 2, z0);
    schale.receiveShadow = true;
    gruppe.add(schale);

    const obenFarbe = Z.untenFarbe === "weiss" ? "schwarz" : "weiss";
    const links = jetzt[obenFarbe].slice().sort((a, b) => ART_WERT[b] - ART_WERT[a]);
    const rechts = jetzt[Z.untenFarbe].slice().sort((a, b) => ART_WERT[a] - ART_WERT[b]);
    const reihe = links.map((art) => ({ art, farbe: obenFarbe }))
        .concat(rechts.map((art) => ({ art, farbe: Z.untenFarbe })));
    if (!reihe.length) {
        anstossen();
        return;
    }

    /* Breite eines Steins samt Fase; die leichte Drehung braucht etwas
       mehr Platz (Tiefe mal Sinus), damit sich Nachbarn nie berühren. */
    const geo = grabsteinForm();
    const steinBreite = geo.boundingBox.max.x - geo.boundingBox.min.x;
    const drehung = 0.14;
    const zusatz = GRAB_TIEFE * Math.sin(drehung);
    let massstab = GRAB_BREITE;
    const luecke = 0.05, mittelLuecke = (links.length && rechts.length) ? 0.45 : 0;
    const breiteVon = (art) => (steinBreite + zusatz) * GRAB_GROESSE[art] * massstab;
    const noetig = reihe.reduce((s, e) => s + breiteVon(e.art) + luecke, 0) + mittelLuecke;
    if (noetig > breite - 0.2) massstab *= (breite - 0.2 - mittelLuecke) / (noetig - mittelLuecke);

    /* Welche kamen seit dem letzten Bild dazu? Sie fallen herein. */
    const neu = { weiss: [], schwarz: [] };
    for (const farbeName of ["weiss", "schwarz"]) {
        const rest = (vorher[farbeName] || []).slice();
        for (const a of jetzt[farbeName]) {
            const s = rest.indexOf(a);
            if (s >= 0) rest.splice(s, 1); else neu[farbeName].push(a);
        }
    }

    let nummer = 0;
    const setzen = (eintrag, x) => {
        const stein = new THREE.Mesh(geo, grabMaterial(eintrag.art, eintrag.farbe));
        stein.castShadow = true;
        stein.receiveShadow = true;
        const mass = GRAB_GROESSE[eintrag.art] * massstab;
        stein.scale.setScalar(mass);
        /* Nach hinten gelehnt, gedreht um die HINTERE Fusskante: So hebt
           sich vorn die Kante ein wenig, und nichts sticht in die Ablage
           (andersherum ginge die Hinterkante hinein). */
        const tiefe = (geo.boundingBox.max.z - geo.boundingBox.min.z) * mass;
        const kippe = new THREE.Group();
        kippe.position.set(0, ABLAGE_DICKE, 0.1 - tiefe / 2);
        kippe.rotation.x = -GRAB_NEIGUNG;
        stein.position.z = tiefe / 2;
        kippe.add(stein);
        const halter = new THREE.Group();
        halter.add(kippe);
        /* Nicht in Reih und Glied: jeder Stein ein wenig verdreht (nur um
           die Senkrechte). */
        halter.rotation.y = ((((nummer++) * 37) % 5) - 2) / 2 * drehung;
        halter.position.set(x, 0, z0);
        gruppe.add(halter);

        const stelle = neu[eintrag.farbe].indexOf(eintrag.art);
        if (stelle >= 0 && animieren && !Z.reduziert) {
            neu[eintrag.farbe].splice(stelle, 1);
            halter.visible = false;
            tween(dauer(460), (t) => {
                halter.visible = true;
                halter.position.y = (1 - t * t) * 1.8;
            }, () => {
                halter.position.y = 0;
                staubRing(new THREE.Vector3(x, ABLAGE_DICKE, z0));
            }, dauer(640));
        }
    };

    /* Links von aussen nach innen, rechts von aussen nach innen. */
    let x = -breite / 2 + 0.1;
    for (const eintrag of reihe.slice(0, links.length)) {
        const b = breiteVon(eintrag.art);
        setzen(eintrag, x + b / 2);
        x += b + luecke;
    }
    x = breite / 2 - 0.1;
    for (const eintrag of reihe.slice(links.length).reverse()) {
        const b = breiteVon(eintrag.art);
        setzen(eintrag, x - b / 2);
        x -= b + luecke;
    }
    anstossen();
}

function boxenSchweben(zeit) {
    for (const g of Z.boxen.values()) {
        if (g.userData.weg) continue;
        const u = g.userData;
        const schweben = Z.reduziert ? 0 : Math.sin(zeit / 620 + u.phase) * 0.045;
        g.position.y = GEO.oberkante + 0.42 + schweben + (u.einflug || 0) * 2.2;
        if (!Z.reduziert) {
            u.dreher.rotation.y = zeit / 1900 + u.phase;
            u.dreher.rotation.x = Math.sin(zeit / 1300 + u.phase) * 0.12;
        }
    }
}

/* ------------------------------------------------------------------ *
 * Die Felder: Mulde, Farbe, Anheben, Deko (Mauer, Reif, Schild …)
 * ------------------------------------------------------------------ */

function mischen(grund, hex, anteil) {
    return grund.clone().lerp(farbe(hex), anteil);
}

/* Die Farbe eines Steins aus seinen Markierungen (Spur, Vorschlag,
   Auswahl, Schach, Matt, Riss) — für das grosse und die kleinen Bretter. */
function kachelFarbe(zelle, grund) {
    const k = zelle.k;
    let c = grund.clone();
    if (k.contains("feld-spur") || k.contains("feld-spur-pech")) {
        const pech = k.contains("feld-spur-pech");
        c = mischen(c, pech ? FARBE.spurPech : (k.contains("feld-spur-ende") ? FARBE.spurEnde : FARBE.spur),
            k.contains("feld-spur-ende") ? 0.55 : 0.38);
    }
    if (k.contains("feld-vorschlag-weg") || k.contains("feld-vorschlag-ziel")) {
        c = mischen(c, FARBE.vorschlag, k.contains("feld-vorschlag-ziel") ? 0.55 : 0.35);
    }
    if (k.contains("feld-gewaehlt")) c = mischen(c, FARBE.gewaehlt, 0.7);
    if (k.contains("feld-schach")) c = mischen(c, FARBE.schach, 0.75);
    if (k.contains("feld-matt")) c = mischen(c, FARBE.matt, 0.8);
    if (zelle.riss) c = farbe("#15171c");
    return c;
}

function felderAbgleichen(beschreibung, animieren) {
    const jetzt = performance.now();
    beschreibung.zellen.forEach((zelle, i) => {
        const feld = Z.felder[i];
        if (!feld || !feld.da) return;
        const k = zelle.k;
        const mat = feld.kachel.material;

        /* --- Farbe der Kachel (Spur, Schach, Auswahl …) --- */
        let c = feld.grundFarbe.clone();
        let leuchten = null, leuchtKraft = 0;
        if (k.contains("feld-spur") || k.contains("feld-spur-pech")) {
            const pech = k.contains("feld-spur-pech");
            c = mischen(c, pech ? FARBE.spurPech : (k.contains("feld-spur-ende") ? FARBE.spurEnde : FARBE.spur),
                k.contains("feld-spur-ende") ? 0.55 : 0.38);
        }
        if (k.contains("feld-vorschlag-weg") || k.contains("feld-vorschlag-ziel")) {
            c = mischen(c, FARBE.vorschlag, k.contains("feld-vorschlag-ziel") ? 0.55 : 0.35);
        }
        if (k.contains("feld-gewaehlt")) {
            c = mischen(c, FARBE.gewaehlt, 0.7);
            leuchten = FARBE.gewaehlt; leuchtKraft = 0.18;
        }
        if (k.contains("feld-schach")) {
            c = mischen(c, FARBE.schach, 0.75);
            leuchten = FARBE.schach; leuchtKraft = 0.3;
        }
        if (k.contains("feld-matt")) {
            c = mischen(c, FARBE.matt, 0.8);
            leuchten = FARBE.matt; leuchtKraft = 0.4;
        }
        if (zelle.riss) {
            c = farbe("#15171c");
        }
        mat.color.copy(c);
        feld.leuchten = leuchten ? farbe(leuchten) : null;
        feld.leuchtKraft = leuchtKraft;
        feld.pulsiert = k.contains("feld-schach") || k.contains("feld-matt");

        /* --- Wirkung: kurzes Aufleuchten (Fähigkeit blau, Unglück rot) --- */
        if (k.contains("feld-wirkung") || k.contains("feld-wirkung-pech")) {
            if (!feld.wirkungBis || feld.wirkungBis < jetzt) {
                feld.wirkungFarbe = farbe(k.contains("feld-wirkung-pech") ? FARBE.wirkungPech : FARBE.wirkung);
                feld.wirkungStart = jetzt;
                feld.wirkungBis = jetzt + 1600;
            }
        }

        /* --- Mulde: Zugziel und Schlag. Die Fassung sinkt in den Stein. --- */
        const ziel = k.contains("feld-ziel");
        const schlag = k.contains("feld-schlag");
        const willMulde = ziel || schlag;
        if (willMulde && !feld.mulde) {
            feld.kachel.geometry = GEO.kachelMulde;
            const mm = new THREE.MeshPhysicalMaterial({
                color: feld.grundFarbe.clone().multiplyScalar(0.74), roughness: 0.6, clearcoat: 0.25,
                side: THREE.DoubleSide
            });
            const mulde = new THREE.Mesh(GEO.mulde, mm);
            mulde.userData.eigenesMaterial = true;
            mulde.receiveShadow = true;
            mulde.position.set(feld.mitte.x, GEO.oberkante, feld.mitte.z);
            mulde.scale.y = animieren ? 0.01 : 1;
            Z.felderGruppe.add(mulde);
            feld.mulde = mulde;
            if (animieren) {
                tween(dauer(150), (t) => { mulde.scale.y = 0.01 + raus(t) * 0.99; });
            }
        } else if (!willMulde && feld.mulde) {
            Z.felderGruppe.remove(feld.mulde);
            feld.mulde.material.dispose();
            feld.mulde = null;
            feld.kachel.geometry = GEO.kachel;
        }
        /* Schlag: roter Einleger um die Fassung, damit man ihn auch unter
           der gegnerischen Figur sieht. */
        ringSetzen(feld, "schlag", schlag ? FARBE.schlag : null, MULDE_RADIUS + 0.012, MULDE_RADIUS + 0.07);

        /* --- Fähigkeits-Ziele: der Stein hebt sich und trägt einen Rand
               (Wunsch #1: „nicht drauf gemalt, der Stein an sich"). --- */
        const wahl = k.contains("feld-wahl");
        const vorschau = k.contains("feld-vorschau");
        feld.hubZiel = vorschau ? 0.1 : (wahl ? 0.05 : 0);
        randSetzen(feld, vorschau ? FARBE.vorschau : (wahl ? FARBE.wahl : null));

        /* --- Riss: der Stein ist weg, eine Grube bleibt. --- */
        feld.kachel.visible = !zelle.riss;
        dekoSetzen(feld, "riss", zelle.riss, () => {
            const g = new THREE.Group();
            const grube = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.04, 0.9), Z.mat.grube);
            grube.userData.eigeneForm = true;
            grube.position.y = 0.02;
            g.add(grube);
            const splitter = new THREE.DodecahedronGeometry(0.06, 0);
            for (let n = 0; n < 5; n++) {
                const s = new THREE.Mesh(splitter, feld.kachel.material);
                const w = n * 1.3;
                s.position.set(Math.cos(w) * 0.32, 0.07, Math.sin(w) * 0.32);
                s.rotation.set(w, w * 2, 0);
                s.castShadow = true;
                g.add(s);
            }
            return g;
        }, animieren, (obj, f) => {
            /* Der Stein zerspringt: Splitter in seiner Farbe fliegen auf. */
            const ort = f.mitte.clone().setY(GEO.oberkante);
            funkenWolke(ort, "#" + f.grundFarbe.getHexString(), 16, 1.6);
            staubRing(ort);
        });

        /* --- Mauer: echte Steine auf dem Feld. --- */
        const mauer = k.contains("feld-mauer");
        const senkrecht = k.contains("mauer-senkrecht");
        dekoSetzen(feld, mauer ? (senkrecht ? "mauer-s" : "mauer-w") : "mauer", mauer, () => mauerBauen(senkrecht), animieren, auftrittMauer);

        /* --- Frost: Reif auf dem Stein und Eiszapfen am Rand. --- */
        dekoSetzen(feld, "frost", k.contains("feld-frost"), () => reifBauen(), animieren, auftrittFrost);

        /* --- Schild: eine Glocke über der Figur. --- */
        dekoSetzen(feld, "schild", k.contains("feld-schild"), () => {
            const figur = Z.figuren.get(i);
            return schildBauen(figur ? figur.userData.art : null);
        }, animieren, auftrittSchild);

        /* --- Fessel: eine Kette um den Fuss. --- */
        dekoSetzen(feld, "fessel", k.contains("feld-fessel"), () => fesselBauen(),
            animieren, (obj, f) => auftrittFessel(obj, f, i));

        /* --- Geliehen (Nekromant): violetter Schein am Fuss. --- */
        ringSetzen(feld, "geliehen", k.contains("feld-geliehen") ? FARBE.geliehen : null, 0.36, 0.44);

        /* --- Restzeit: eine kleine Zahl über der Ecke. --- */
        restzeitSetzen(feld, zelle.restzeit);
    });
}

function ringSetzen(feld, name, hex, innen, aussen) {
    const schluessel = "ring_" + name;
    const da = feld[schluessel];
    if (!hex) {
        if (da) {
            Z.felderGruppe.remove(da);
            da.material.dispose();
            da.geometry.dispose();
            feld[schluessel] = null;
        }
        return;
    }
    if (da && da.userData.hex === hex) return;
    if (da) {
        Z.felderGruppe.remove(da);
        da.material.dispose();
        da.geometry.dispose();
    }
    const geo = new THREE.RingGeometry(innen, aussen, 48);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ color: farbe(hex), transparent: true, opacity: 0.9, depthWrite: false });
    const ring = new THREE.Mesh(geo, mat);
    ring.position.set(feld.mitte.x, GEO.oberkante + 0.004, feld.mitte.z);
    ring.userData.hex = hex;
    ring.userData.basisY = GEO.oberkante + 0.004;
    ring.renderOrder = 2;
    Z.felderGruppe.add(ring);
    feld[schluessel] = ring;
}

/* Ein leuchtender Rand um den ganzen Stein — für Fähigkeitsziele. */
function randSetzen(feld, hex) {
    if (!hex) {
        if (feld.rand) {
            Z.felderGruppe.remove(feld.rand);
            feld.rand.material.dispose();
            feld.rand = null;
        }
        return;
    }
    if (feld.rand && feld.rand.userData.hex === hex) return;
    if (feld.rand) {
        Z.felderGruppe.remove(feld.rand);
        feld.rand.material.dispose();
    }
    if (!GEO.randForm) {
        const k = KACHELN[Z.einst.kacheln];
        const aussen = (1 - k.fuge) / 2 + 0.02;
        const innen = aussen - 0.07;
        const s = new THREE.Shape();
        s.moveTo(-aussen, -aussen); s.lineTo(aussen, -aussen); s.lineTo(aussen, aussen); s.lineTo(-aussen, aussen); s.lineTo(-aussen, -aussen);
        const h = new THREE.Path();
        h.moveTo(-innen, -innen); h.lineTo(-innen, innen); h.lineTo(innen, innen); h.lineTo(innen, -innen); h.lineTo(-innen, -innen);
        s.holes.push(h);
        GEO.randForm = new THREE.ExtrudeGeometry(s, { depth: 0.05, bevelEnabled: false });
        GEO.randForm.rotateX(-Math.PI / 2);
    }
    const mat = new THREE.MeshStandardMaterial({ color: farbe(hex), emissive: farbe(hex), emissiveIntensity: 0.55, roughness: 0.4 });
    const rand = new THREE.Mesh(GEO.randForm, mat);
    rand.position.set(feld.mitte.x, GEO.oberkante - 0.035, feld.mitte.z);
    rand.userData.hex = hex;
    rand.userData.basisY = GEO.oberkante - 0.035;
    Z.felderGruppe.add(rand);
    feld.rand = rand;
}

function dekoSetzen(feld, name, an, bauen, animieren, auftritt) {
    feld.dekos = feld.dekos || {};
    const da = feld.dekos[name.split("-")[0]];
    if (!an) {
        if (da) {
            feld.deko.remove(da);
            feld.dekos[name.split("-")[0]] = null;
        }
        return;
    }
    if (da && da.userData.name === name) return;
    if (da) feld.deko.remove(da);
    const obj = bauen();
    obj.userData.name = name;
    obj.position.y += 0;
    feld.deko.add(obj);
    feld.dekos[name.split("-")[0]] = obj;
    if (animieren && auftritt && !Z.reduziert) {
        auftritt(obj, feld);
    } else if (animieren) {
        obj.scale.set(0.01, 0.01, 0.01);
        tween(dauer(380), (t) => {
            const s = raus(t) + Math.sin(Math.PI * t) * 0.1;
            obj.scale.set(s, s, s);
        }, () => obj.scale.set(1, 1, 1));
    }
}

/* Die Mauer schichtet sich Stein für Stein auf — jeder fällt von oben auf
   den darunter, keiner geht durch einen anderen. */
function auftrittMauer(obj) {
    obj.children.forEach((stein, n) => {
        const ziel = stein.position.y;
        stein.position.y = ziel + 1.4;
        stein.visible = false;
        tween(dauer(220), (t) => {
            stein.visible = true;
            stein.position.y = ziel + 1.4 * (1 - t * t);
        }, () => { stein.position.y = ziel; }, dauer(n * 55));
    });
}

/* Reif wächst von der Mitte nach aussen, dann schiessen die Zapfen. */
function auftrittFrost(obj) {
    const [platte, ...zapfen] = obj.children;
    platte.scale.set(0.01, 1, 0.01);
    tween(dauer(480), (t) => {
        const s = 0.01 + raus(t) * 0.99;
        platte.scale.set(s, 1, s);
    });
    zapfen.forEach((z, n) => {
        z.scale.set(0.01, 0.01, 0.01);
        tween(dauer(200), (t) => {
            const s = raus(t) + Math.sin(Math.PI * t) * 0.25;
            z.scale.set(s, s, s);
        }, () => z.scale.set(1, 1, 1), dauer(300 + n * 40));
    });
}

/* Die Glocke senkt sich über die Figur und blitzt einmal auf. */
function auftrittSchild(obj) {
    const ziel = obj.position.y;
    const mat = obj.material;
    tween(dauer(360), (t) => {
        obj.position.y = ziel + (1 - raus(t)) * 1.5;
    }, () => {
        obj.position.y = ziel;
        tween(dauer(420), (t) => {
            mat.emissiveIntensity = 0.25 + Math.sin(Math.PI * t) * 1.4;
            mat.opacity = 0.22 + Math.sin(Math.PI * t) * 0.3;
        }, () => { mat.emissiveIntensity = 0.25; mat.opacity = 0.22; });
    });
}

/* Die Kette schnappt von weit aussen zu, die Figur rüttelt. */
function auftrittFessel(obj, feld, index) {
    obj.scale.set(2.2, 1, 2.2);
    tween(dauer(260), (t) => {
        const s = 2.2 - raus(t) * 1.2;
        obj.scale.set(s, 1, s);
    }, () => {
        obj.scale.set(1, 1, 1);
        const figur = Z.figuren.get(index);
        if (!figur) return;
        tween(dauer(450), (t) => {
            figur.userData.netz.rotation.z = Math.sin(t * Math.PI * 8) * 0.12 * (1 - t);
        }, () => { figur.userData.netz.rotation.z = 0; });
        funkenWolke(feld.mitte.clone().setY(GEO.oberkante + 0.1), FARBE.fessel, 10, 0.7);
    });
}

function schildBauen(art) {
    const g = new THREE.Mesh(GEO.glocke || (GEO.glocke = new THREE.SphereGeometry(0.43, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2)), Z.mat.schild);
    const hoehe = art ? Z.formen[art].boundingBox.max.y : 0.9;
    g.scale.y = (hoehe + 0.2) / 0.43;
    g.position.y = GEO.oberkante;
    return g;
}

function fesselBauen() {
    const g = new THREE.Group();
    const glied = GEO.glied || (GEO.glied = new THREE.TorusGeometry(0.07, 0.018, 8, 16));
    for (let n = 0; n < 12; n++) {
        const w = (n / 12) * Math.PI * 2;
        const t = new THREE.Mesh(glied, Z.mat.fessel);
        t.position.set(Math.cos(w) * 0.37, GEO.oberkante + 0.03, Math.sin(w) * 0.37);
        t.rotation.set(n % 2 ? Math.PI / 2 : 0, -w, 0);
        t.castShadow = true;
        g.add(t);
    }
    return g;
}

function mauerBauen(senkrecht) {
    const g = new THREE.Group();
    const stein = GEO.mauerStein || (GEO.mauerStein = new THREE.BoxGeometry(0.31, 0.16, 0.26));
    const reihen = 3;
    for (let r = 0; r < reihen; r++) {
        const versatz = (r % 2) ? 0.16 : 0;
        for (let n = -1; n <= 1; n++) {
            const pos = n * 0.33 + versatz;
            if (Math.abs(pos) > 0.5) continue;
            const s = new THREE.Mesh(stein, Z.mat.mauer);
            s.castShadow = true;
            s.receiveShadow = true;
            const y = GEO.oberkante + 0.085 + r * 0.17;
            if (senkrecht) s.position.set(0, y, pos); else s.position.set(pos, y, 0);
            if (senkrecht) s.rotation.y = Math.PI / 2;
            g.add(s);
        }
    }
    return g;
}

function reifBauen() {
    const g = new THREE.Group();
    const k = KACHELN[Z.einst.kacheln];
    const seite = 1 - k.fuge - 0.04;
    const reif = new THREE.Mesh(GEO.reifPlatte || (GEO.reifPlatte = new THREE.BoxGeometry(seite, 0.018, seite)), Z.mat.reif);
    reif.position.y = GEO.oberkante + 0.012;
    reif.receiveShadow = true;
    g.add(reif);
    const zapfen = GEO.zapfen || (GEO.zapfen = new THREE.ConeGeometry(0.035, 0.16, 5));
    const ecken = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
    ecken.forEach(([ex, ez], n) => {
        for (let m = 0; m < 2; m++) {
            const t = new THREE.Mesh(zapfen, Z.mat.kristall);
            t.position.set(ex * (seite / 2 - 0.06 - m * 0.07), GEO.oberkante + 0.08 + m * 0.02, ez * (seite / 2 - 0.05 - (1 - m) * 0.07));
            t.rotation.set(ez * 0.25, n, -ex * 0.25);
            t.castShadow = true;
            g.add(t);
        }
    });
    return g;
}

function restzeitSetzen(feld, text) {
    if (!text) {
        if (feld.restzeit) {
            Z.felderGruppe.remove(feld.restzeit);
            feld.restzeit.material.map.dispose();
            feld.restzeit.material.dispose();
            feld.restzeit = null;
        }
        return;
    }
    if (feld.restzeit && feld.restzeit.userData.text === text) return;
    if (feld.restzeit) {
        Z.felderGruppe.remove(feld.restzeit);
        feld.restzeit.material.map.dispose();
        feld.restzeit.material.dispose();
    }
    const lw = document.createElement("canvas");
    lw.width = 64; lw.height = 64;
    const c = lw.getContext("2d");
    c.fillStyle = "#1d2330";
    c.beginPath(); c.arc(32, 32, 28, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#ffffff";
    c.font = "700 34px system-ui, sans-serif";
    c.textAlign = "center"; c.textBaseline = "middle";
    c.fillText(text, 32, 34);
    const tex = new THREE.CanvasTexture(lw);
    tex.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
    sprite.scale.set(0.24, 0.24, 0.24);
    sprite.position.set(feld.mitte.x + 0.33, GEO.oberkante + 0.14, feld.mitte.z + 0.33);
    sprite.renderOrder = 5;
    sprite.userData.text = text;
    Z.felderGruppe.add(sprite);
    feld.restzeit = sprite;
}

/* ------------------------------------------------------------------ *
 * Jeder Rahmen: Schweben, Pulsieren, Heben, Tweens, Partikel
 * ------------------------------------------------------------------ */

/*
 * EINE SCHLEIFE, NIE ZWEI (seit v0.133.0). `Z.laeuft` heisst: „ein Bild ist
 * bestellt". Bis v0.132.0 setzte `bild` die Marke zu Beginn zurück und
 * bestellte am Ende selbst neu — stiess währenddessen etwas `anstossen` an
 * (Funken, Box öffnet, Landung), lief ab da eine ZWEITE Schleife mit, und
 * weil die Lootboxen immer schweben, endete keine je. Jede Animation
 * verdoppelte die Arbeit: am Handy wurde es mit jedem Zug langsamer
 * (Nutzer-Video 24.09.2026).
 */
function anstossen() {
    if (Z.laeuft || !Z.bereit) return;
    Z.laeuft = true;
    if (!Z.imBild) Z.letzteZeit = performance.now();
    requestAnimationFrame(bild);
}

function bild(zeit) {
    Z.laeuft = false;
    Z.imBild = true;
    try {
        bildInnen(zeit);
    } finally {
        Z.imBild = false;
    }
}

function bildInnen(zeit) {
    if (!Z.huelle || !Z.huelle.isConnected) {
        if (Z.tafel) { Z.tafel.remove(); Z.tafel = null; }
        return;
    }

    const dt = Math.min(64, zeit - Z.letzteZeit);
    Z.letzteZeit = zeit;
    let weiter = false;

    /* Tweens */
    for (let n = Z.tweens.length - 1; n >= 0; n--) {
        const tw = Z.tweens[n];
        if (zeit < tw.start) { weiter = true; continue; }
        const t = Math.min(1, (zeit - tw.start) / tw.ms);
        tw.schritt(t);
        if (t >= 1) {
            Z.tweens.splice(n, 1);
            if (tw.fertig) tw.fertig();
        }
        weiter = true;
    }

    /* Partikel */
    for (let n = Z.partikel.length - 1; n >= 0; n--) {
        const p = Z.partikel[n];
        p.leben += dt;
        const s = dt / 1000;
        p.v.y -= p.schwer * s;
        p.obj.position.addScaledVector(p.v, s);
        const rest = 1 - p.leben / p.max;
        p.obj.material.opacity = Math.max(0, rest);
        if (p.wachsen) p.obj.scale.setScalar(1 + (1 - rest) * 2);
        else p.obj.rotation.x += s * 8;
        if (p.leben >= p.max) {
            Z.effektGruppe.remove(p.obj);
            p.obj.material.dispose();
            Z.partikel.splice(n, 1);
        }
        weiter = true;
    }

    /* Felder: heben, leuchten, pulsieren */
    for (const feld of Z.felder) {
        if (!feld.kachel) continue;
        if (Math.abs(feld.hub - feld.hubZiel) > 0.001) {
            feld.hub += (feld.hubZiel - feld.hub) * Math.min(1, dt / 70);
            weiter = true;
            Z.imZug = true;
        } else {
            feld.hub = feld.hubZiel;
        }
        const y = feld.hub;
        feld.kachel.position.y = y;
        if (feld.mulde) feld.mulde.position.y = GEO.oberkante + y;
        if (feld.rand) feld.rand.position.y = feld.rand.userData.basisY + y;
        if (feld.ring_schlag) feld.ring_schlag.position.y = feld.ring_schlag.userData.basisY + y;
        feld.deko.position.y = y;

        const e = feld.kachel.material.emissive;
        e.setRGB(0, 0, 0);
        let kraft = 0;
        if (feld.leuchten) {
            kraft = feld.leuchtKraft * (feld.pulsiert && !Z.reduziert ? (0.6 + 0.4 * Math.sin(zeit / 260)) : 1);
            e.copy(feld.leuchten).multiplyScalar(kraft);
            if (feld.pulsiert) weiter = true;
        }
        if (feld.wirkungBis && zeit < feld.wirkungBis + 50) {
            const t = (zeit - feld.wirkungStart) / 1600;
            const puls = Math.max(0, Math.sin(t * Math.PI * 4)) * (1 - t);
            e.lerp(feld.wirkungFarbe, Math.min(1, puls));
            e.multiplyScalar(0.3 + puls * 0.9);
            weiter = true;
        }
        if (feld.ring_schlag) {
            feld.ring_schlag.material.opacity = Z.reduziert ? 0.9 : 0.65 + 0.3 * Math.sin(zeit / 180);
            weiter = true;
        }
    }

    /* Figuren: die gewählte schwebt, getrübte flirren */
    for (const [i, g] of Z.figuren) {
        const feld = Z.felder[i];
        if (!feld || (g.userData.ziehtBis && zeit < g.userData.ziehtBis)) continue;
        const gewaehlt = Z.gewaehlt === i;
        const soll = GEO.oberkante + feld.hub + (gewaehlt ? 0.22 + (Z.reduziert ? 0 : Math.sin(zeit / 240) * 0.035) : 0);
        if (Math.abs(g.position.y - soll) > 0.0005) {
            g.position.y += (soll - g.position.y) * Math.min(1, dt / 60);
            weiter = true;
            Z.imZug = true;
        }
        if (gewaehlt) weiter = true;
        if (g.userData.getruebt && !Z.reduziert) {
            g.userData.netz.rotation.z = Math.sin(zeit / 170 + i) * 0.06;
            g.userData.netz.position.x = Math.sin(zeit / 230 + i * 2) * 0.03;
            weiter = true;
        }
    }

    /* Lootboxen schweben immer — das ist ihr Wesen. */
    if (Z.boxen.size > 0) {
        boxenSchweben(zeit);
        weiter = true;
    }

    /* Die Beschriftung fliegt mit. */
    if (Z.schilder && Z.schilder.length > 0) {
        schilderSchweben(zeit);
        if (!Z.reduziert) weiter = true;
    }

    if (Z.steuerung.update()) weiter = true;

    /*
     * IM LEERLAUF HALBER TAKT (seit v0.133.0): Bewegt sich nur, was immer
     * schwebt oder pulsiert (Lootboxen, Schilder, Ringe), reichen 30 Bilder
     * in der Sekunde — das Auge sieht das sanfte Schweben gleich, das Handy
     * rechnet die Hälfte. Sobald etwas zieht, fliegt oder aufgeht, wieder
     * jedes Bild.
     */
    const lebhaft = Z.tweens.length > 0 || Z.partikel.length > 0 || Z.imZug;
    Z.imZug = false;
    Z.ruheTakt = lebhaft ? 0 : ((Z.ruheTakt || 0) + 1) % 2;
    if (lebhaft || Z.ruheTakt === 1 || !weiter) {
        if (Z.stoesse) kollisionenMessen();
        Z.renderer.render(Z.szene, Z.kamera);
        if (lebhaft) aufloesungAnpassen(dt);
    }

    if (weiter) anstossen();
}

/*
 * SCHWACHE GERÄTE (seit v0.133.0): Brauchen die bewegten Bilder im Schnitt
 * deutlich länger als 1/40 Sekunde, rechnet die Leinwand mit weniger
 * Bildpunkten (Stufen 0,25, nie unter 1). Nur abwärts — sonst pendelt es.
 */
function aufloesungAnpassen(dt) {
    const m = Z.messung || (Z.messung = { summe: 0, n: 0 });
    m.summe += dt;
    m.n++;
    if (m.n < 40) return;
    const schnitt = m.summe / m.n;
    m.summe = 0;
    m.n = 0;
    const jetzt = Z.renderer.getPixelRatio();
    if (schnitt > 25 && jetzt > 1) {
        Z.renderer.setPixelRatio(Math.max(1, jetzt - 0.25));
        groesseAnpassen();
    }
}

/* ------------------------------------------------------------------ *
 * Kamera: auf das Brett einpassen
 * ------------------------------------------------------------------ */

function groesseAnpassen() {
    if (!Z.huelle) return;
    const b = Z.huelle.clientWidth;
    const h = Z.huelle.clientHeight;
    if (b < 10 || h < 10) return;
    Z.renderer.setSize(b, h, false);
    Z.kamera.aspect = b / h;
    Z.kamera.updateProjectionMatrix();
    if (!Z.freierBlick) blickSetzen(false);
    anstossen();
}

/* Sucht den Abstand, bei dem das ganze Brett samt hoher Figuren in die
   Leinwand passt — für den gewählten Blickwinkel. */
function blickSetzen(weich) {
    if (!Z.masse) return;
    const winkel = BLICKE[Z.einst.blick].winkel;
    const { spalten, reihen } = Z.masse;
    /* Die Schrift steht nur links (Reihen) und unten (Linien) — dort Platz
       für sie, rechts und oben nur die Steine. */
    const xs = [-(spalten / 2 + SCHRIFT_ABSTAND + 0.15), spalten / 2 + 0.1];
    const zs = [-(reihen / 2 + 0.1), reihen / 2 + SCHRIFT_ABSTAND + 0.15];
    /* Mit Friedhof-Ablage (laufende Partie) gehört sie ins Bild. */
    if (Z.mitAblage) zs[1] = ablageMitte() + ABLAGE_TIEFE / 2 + 0.05;
    const punkte = [];
    for (const x of xs) for (const z of zs) for (const y of [-0.15, 1.35]) punkte.push(new THREE.Vector3(x, y, z));
    const ziel = new THREE.Vector3((xs[0] + xs[1]) / 2, 0.25, (zs[0] + zs[1]) / 2);
    const richtung = new THREE.Vector3(0, Math.cos(winkel), Math.sin(winkel));
    const cam = Z.kamera.clone();
    let unten = 2, oben = 120;
    for (let n = 0; n < 30; n++) {
        const d = (unten + oben) / 2;
        cam.position.copy(ziel).addScaledVector(richtung, d);
        cam.lookAt(ziel);
        cam.updateMatrixWorld();
        let passt = true;
        for (const p of punkte) {
            const q = p.clone().project(cam);
            if (Math.abs(q.x) > 0.97 || Math.abs(q.y) > 0.97) { passt = false; break; }
        }
        if (passt) oben = d; else unten = d;
    }
    const zielPos = ziel.clone().addScaledVector(richtung, oben);
    Z.steuerung.minDistance = oben * 0.45;
    Z.steuerung.maxDistance = oben * 1.6;
    Z.freierBlick = false;
    if (!weich) {
        Z.kamera.position.copy(zielPos);
        Z.steuerung.target.copy(ziel);
        Z.kamera.lookAt(ziel);
        anstossen();
        return;
    }
    const start = Z.kamera.position.clone();
    const startZiel = Z.steuerung.target.clone();
    tween(dauer(420), (t) => {
        const k = weich ? raus(t) : t;
        Z.kamera.position.lerpVectors(start, zielPos, k);
        Z.steuerung.target.lerpVectors(startZiel, ziel, k);
    });
}

/* ------------------------------------------------------------------ *
 * Bedienung: Tippen = Klick auf den 2D-Knopf
 * ------------------------------------------------------------------ */

function bedienungAnmelden() {
    const lw = Z.leinwand;
    const strahl = new THREE.Raycaster();
    const zeiger = new THREE.Vector2();

    /*
     * DER TIPP ZÄHLT BEIM AUFSETZEN (seit v0.129.0).
     *
     * Nutzer-Meldung 24.09.2026: „riesen Probleme mit der Zeit, wo ich was
     * drücke". Gemessen: Tipp plus Neuzeichnen kosten 3 bis 4 ms — daran lag
     * es nicht. Es lag an der Unterscheidung Tippen/Drehen: Gezählt wurde
     * erst beim Loslassen, und nur, wenn der Finger weniger als 8 px
     * gewandert und keine 0,6 s lang gelegen hatte. Am Handy wandert ein
     * Finger beim Tippen oft mehr — dann drehte sich das Brett ein Stück,
     * und der Tipp verfiel. Seit das Drehen weg ist, gibt es nichts mehr zu
     * unterscheiden: Das Feld reagiert, sobald der Finger aufsetzt.
     */
    lw.addEventListener("pointerdown", (e) => {
        if (e.button !== undefined && e.button !== 0) return;
        const r = lw.getBoundingClientRect();
        zeiger.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
        strahl.setFromCamera(zeiger, Z.kamera);
        const index = feldUnterStrahl(strahl);
        if (index === null) return;
        const knopf = Z.knoepfe[index];
        if (knopf && !knopf.disabled) knopf.click();
    });
}

function feldUnterStrahl(strahl) {
    /* Zuerst Figuren und Boxen (sie stehen höher als ihr Feld), dann die
       Ebene der Kacheloberseite. */
    const ziele = [];
    for (const [i, g] of Z.figuren) { g.userData.netz.userData.feld = i; ziele.push(g.userData.netz); }
    for (const [i, g] of Z.boxen) { g.traverse((o) => { if (o.isMesh) { o.userData.feld = i; ziele.push(o); } }); }
    const treffer = strahl.intersectObjects(ziele, false);
    if (treffer.length > 0 && Number.isInteger(treffer[0].object.userData.feld)) {
        return treffer[0].object.userData.feld;
    }
    const ebene = new THREE.Plane(new THREE.Vector3(0, 1, 0), -GEO.oberkante);
    const punkt = new THREE.Vector3();
    if (!strahl.ray.intersectPlane(ebene, punkt)) return null;
    const s = Math.round(punkt.x + (Z.masse.spalten - 1) / 2);
    const r = Math.round(punkt.z + (Z.masse.reihen - 1) / 2);
    if (s < 0 || r < 0 || s >= Z.masse.spalten || r >= Z.masse.reihen) return null;
    const index = r * Z.masse.spalten + s;
    const feld = Z.felder[index];
    if (!feld || !feld.da) return null;
    return index;
}

/* ------------------------------------------------------------------ *
 * Die Ansicht-Tafel: das Aussehen live umstellen
 * ------------------------------------------------------------------ */

/* Ein Linienzeichen wie in der übrigen App (24er Raster, Strich 2),
   gebaut über den Baum, nie als eingesetzter Text (Haus-Regel, test-syntax.js). */
function zeichen(teile) {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    const attr = { viewBox: "0 0 24 24", width: "18", height: "18", fill: "none", stroke: "currentColor",
        "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round" };
    for (const [k, v] of Object.entries(attr)) svg.setAttribute(k, v);
    for (const [name, werte] of teile) {
        const el = document.createElementNS(ns, name);
        for (const [k, v] of Object.entries(werte)) el.setAttribute(k, v);
        svg.appendChild(el);
    }
    return svg;
}

function knopfLeisteBauen() {
    const leiste = document.createElement("div");
    leiste.className = "brett-3d-leiste";

    const ansichtKnopf = document.createElement("button");
    ansichtKnopf.type = "button";
    ansichtKnopf.className = "brett-3d-knopf";
    ansichtKnopf.title = "Aussehen des Bretts";
    ansichtKnopf.setAttribute("aria-label", "Aussehen des Bretts");
    ansichtKnopf.appendChild(zeichen([
        ["circle", { cx: "13.5", cy: "6.5", r: "1.5" }], ["circle", { cx: "17.5", cy: "10.5", r: "1.5" }],
        ["circle", { cx: "8.5", cy: "7.5", r: "1.5" }], ["circle", { cx: "6.5", cy: "12.5", r: "1.5" }],
        ["path", { d: "M12 2a10 10 0 0 0 0 20c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.3 0-1.1.9-2 2-2h2.4A5.6 5.6 0 0 0 22 9.8C22 5.5 17.5 2 12 2Z" }]
    ]));
    ansichtKnopf.addEventListener("click", () => tafelUmschalten());

    leiste.append(ansichtKnopf);
    Z.huelle.appendChild(leiste);
    Z.knopfLeiste = leiste;
    anpassungZeigen();
}

/*
 * DAS AUSSEHEN STELLT NUR DER ADMIN UM (seit v0.129.0, Nutzer-Ansage
 * 24.09.2026: „die Farben-Einstellungen nur der Admin — in den
 * Admin-Einstellungen ein Anpassungs-Knopf an/aus"). Zu sehen ist der
 * Paletten-Knopf nur, wenn auf diesem Gerät die Verwaltung freigeschaltet
 * UND dort „Brett-Anpassung" eingeschaltet ist (`ICH.anpassungAn`).
 */
function anpassungErlaubt() {
    return typeof ICH !== "undefined" && !!ICH.verwaltungAktiv && ICH.verwaltungAktiv()
        && !!ICH.anpassungAn && ICH.anpassungAn();
}

function anpassungZeigen() {
    if (!Z.knopfLeiste) return;
    const erlaubt = anpassungErlaubt();
    Z.knopfLeiste.hidden = !erlaubt;
    if (!erlaubt && Z.tafel) tafelUmschalten();
}

function tafelUmschalten() {
    if (Z.tafel) {
        Z.tafel.remove();
        Z.tafel = null;
        return;
    }
    const tafel = document.createElement("div");
    tafel.className = "brett-3d-tafel";
    tafel.setAttribute("role", "dialog");
    tafel.setAttribute("aria-label", "Aussehen des Bretts");

    const zeile = (titel, schluessel, liste, farbig) => {
        const block = document.createElement("div");
        block.className = "brett-3d-zeile";
        const kopf = document.createElement("div");
        kopf.className = "brett-3d-titel";
        kopf.textContent = titel;
        const auswahl = document.createElement("div");
        auswahl.className = "brett-3d-wahl";
        for (const [id, eintrag] of Object.entries(liste)) {
            const k = document.createElement("button");
            k.type = "button";
            k.className = "brett-3d-segment" + (String(Z.einst[schluessel]) === id ? " ist-an" : "");
            if (farbig) {
                const probe = document.createElement("span");
                probe.className = "brett-3d-probe";
                probe.style.background = "linear-gradient(135deg, " + eintrag.hell + " 50%, " + eintrag.dunkel + " 50%)";
                k.appendChild(probe);
            }
            k.appendChild(document.createTextNode(eintrag.name));
            k.addEventListener("click", () => {
                Z.einst[schluessel] = id;
                einstellungenSpeichern();
                auswahl.querySelectorAll(".brett-3d-segment").forEach((b) => b.classList.remove("ist-an"));
                k.classList.add("ist-an");
                aussehenAnwenden(schluessel);
            });
            auswahl.appendChild(k);
        }
        block.append(kopf, auswahl);
        tafel.appendChild(block);
    };

    zeile("Blick", "blick", BLICKE);
    zeile("Brett", "thema", THEMEN, true);
    zeile("Figuren", "figuren", FIGUR_STILE);
    zeile("Steine", "kacheln", KACHELN);
    zeile("Tempo", "tempo", TEMPI);
    zeile("Schatten", "schatten", { true: { name: "An" }, false: { name: "Aus" } });

    const fuss = document.createElement("div");
    fuss.className = "brett-3d-fuss";
    const zwei = document.createElement("button");
    zwei.type = "button";
    zwei.className = "knopf knopf-still knopf-klein";
    zwei.textContent = "Flaches 2D-Brett";
    zwei.addEventListener("click", () => {
        Z.einst.an = false;
        einstellungenSpeichern();
        tafelUmschalten();
        abbinden();
    });
    const zu = document.createElement("button");
    zu.type = "button";
    zu.className = "knopf knopf-haupt knopf-klein";
    zu.textContent = "Fertig";
    zu.addEventListener("click", () => tafelUmschalten());
    fuss.append(zwei, zu);
    tafel.appendChild(fuss);

    document.body.appendChild(tafel);
    Z.tafel = tafel;
}

function aussehenAnwenden(schluessel) {
    if (schluessel === "schatten") {
        Z.einst.schatten = (Z.einst.schatten === true || Z.einst.schatten === "true");
        einstellungenSpeichern();
        Z.licht.castShadow = Z.einst.schatten;
        anstossen();
        return;
    }
    if (schluessel === "blick") {
        blickSetzen(true);
        return;
    }
    if (schluessel === "tempo") return;
    MINI.cache.clear();
    if (schluessel === "figuren") {
        materialienBauen();
        for (const g of Z.figuren.values()) {
            g.userData.netz.material = Z.mat[g.userData.farbe];
        }
        figurenBilder();
        anstossen();
        return;
    }
    /* Brett oder Steine: neu aufbauen, Figuren bleiben stehen. */
    materialienBauen();
    if (schluessel === "kacheln") GEO.randForm = null;
    Z.masse = null;
    neuZeichnen(false);
}

/* ------------------------------------------------------------------ *
 * Anbinden: nach jedem Zeichnen des 2D-Bretts
 * ------------------------------------------------------------------ */

function abbinden() {
    document.body.classList.remove("brett-3d-aktiv");
    if (Z.huelle && Z.huelle.parentNode) {
        const rahmen = Z.huelle.parentNode;
        rahmen.classList.remove("brett-3d-an");
        Z.huelle.remove();
    }
    if (Z.letzte) {
        zweiDKnopf(Z.letzte.halter);
    }
}

/* Auf dem flachen Brett ein kleiner Knopf zurück ins 3D. */
function zweiDKnopf(halter) {
    const rahmen = halter && halter.querySelector(".brett-rahmen");
    if (!rahmen || rahmen.querySelector(".brett-3d-zurueck")) return;
    const knopf = document.createElement("button");
    knopf.type = "button";
    knopf.className = "brett-3d-zurueck";
    knopf.textContent = "3D";
    knopf.title = "Brett in 3D zeigen";
    knopf.addEventListener("click", () => {
        Z.einst.an = true;
        einstellungenSpeichern();
        knopf.remove();
        neuZeichnen(false);
    });
    rahmen.appendChild(knopf);
}

function neuZeichnen(animieren) {
    if (!Z.letzte) return;
    anbinden(Z.letzte.halter, Z.letzte.partie, Z.letzte.person, animieren);
}

function anbinden(halter, partie, person, animierenErlaubt) {
    Z.letzte = { halter, partie, person };
    if (!Z.bereit || !halter || !halter.isConnected) return;
    if (!Z.einst.an) {
        document.body.classList.remove("brett-3d-aktiv");
        zweiDKnopf(halter);
        return;
    }
    const rahmen = halter.querySelector(".brett-rahmen");
    const beschreibung = lesen(halter);
    if (!rahmen || !beschreibung) return;

    rahmen.classList.add("brett-3d-an");
    rahmen.classList.remove("brett-3d-wartet");
    anpassungZeigen();
    /* Der Friedhof steht jetzt als Grabsteine vor dem Brett; die flache
       Klappe darf gehen (stil-effekte.css, `.brett-3d-aktiv`). */
    document.body.classList.add("brett-3d-aktiv");
    if (Z.huelle.parentNode !== rahmen) rahmen.appendChild(Z.huelle);
    Z.knoepfe = beschreibung.knoepfe;

    /* Wer unten steht: die eigene Farbe, sonst Weiss. */
    let unten = "weiss";
    try {
        const team = SCHACH_RUNDE.teamVon(partie, person.id);
        if (team === "schwarz") unten = "schwarz";
    } catch (fehler) { /* Zuschauer */ }
    Z.untenFarbe = unten;

    const schluessel = beschreibung.spalten + "x" + beschreibung.reihen + ":"
        + beschreibung.zellen.map((z) => (z.ausserhalb ? "0" : "1")).join("")
        + ":" + beschreibung.randSpalten.join("") + beschreibung.randReihen.join("");
    const neuesBrett = !Z.masse || Z.masse.schluessel !== schluessel;
    const anderePartie = Z.partieId !== partie.id;
    const mitAblage = !!(partie.laeuft || partie.ergebnis);
    const ablageWechsel = Z.mitAblage !== mitAblage;
    Z.mitAblage = mitAblage;

    if (neuesBrett || anderePartie) {
        for (const g of Z.figuren.values()) figurEntfernen(g);
        for (const g of Z.geister.values()) figurEntfernen(g);
        for (const g of Z.boxen.values()) Z.effektGruppe.remove(g);
        /* Eine Karte, die gerade aus ihrer Box flog, gehört zum alten Brett. */
        for (const kind of Z.effektGruppe.children.slice()) {
            if (kind.isSprite) Z.effektGruppe.remove(kind);
        }
        Z.figuren = new Map();
        Z.geister = new Map();
        Z.boxen = new Map();
        Z.tweens = [];
        Z.masse = { spalten: beschreibung.spalten, reihen: beschreibung.reihen, schluessel };
        brettBauen(beschreibung);
        groesseAnpassen();
        blickSetzen(false);
    } else if (ablageWechsel) {
        blickSetzen(true);
    }

    const animieren = animierenErlaubt !== false && !neuesBrett && !anderePartie
        && Z.zugZaehler !== null && partie.zugZaehler !== Z.zugZaehler;

    /* Der bekannte Zug, in Anzeige-Felder übersetzt. */
    let bekannt = null;
    let letzterEintrag = null;
    if (animieren && typeof TEAM_SCHACH !== "undefined" && TEAM_SCHACH._letzterBewegungsEintrag) {
        const eintrag = TEAM_SCHACH._letzterBewegungsEintrag(partie);
        letzterEintrag = eintrag;
        if (eintrag) {
            const zuAnzeige = new Map(beschreibung.zellen.map((z, i) => [z.feld, i]));
            const wege = (eintrag.wege && eintrag.wege.length) ? eintrag.wege
                : [{ von: eintrag.von, nach: eintrag.nach }];
            bekannt = wege
                .filter((w) => zuAnzeige.has(w.von) && zuAnzeige.has(w.nach))
                .map((w) => ({ von: zuAnzeige.get(w.von), nach: zuAnzeige.get(w.nach) }));
        }
    }

    /* Das Nudelholz: eine Walze rollt über die Bahn, jede Figur hüpft
       darüber, sobald die Walze sie erreicht. */
    let extras = null;
    if (animieren && bekannt && bekannt.length && letzterEintrag
            && letzterEintrag.wirkung === "nudelholz" && !Z.reduziert) {
        extras = nudelholzRollen(beschreibung, letzterEintrag, bekannt);
    }

    if (animieren && bekannt && bekannt.length && letzterEintrag
            && letzterEintrag.wirkung === "teleport" && !extras) {
        extras = new Map(bekannt.map((w) => [w.von, { teleport: true }]));
    }

    /* Was ist seit dem letzten Bild in eine Hand gekommen? (Lootbox öffnen) */
    if (anderePartie) Z.hand = null;
    const gewonnen = handZuwachs(partie);

    felderAbgleichen(beschreibung, animieren || !anderePartie);
    figurenAbgleichen(beschreibung, animieren, bekannt, extras);
    geisterAbgleichen(beschreibung);
    boxenAbgleichen(beschreibung, !neuesBrett && !anderePartie, gewonnen);
    friedhofAbgleichen(partie, animieren);

    Z.gewaehlt = beschreibung.zellen.findIndex((z) => z.k.contains("feld-gewaehlt"));
    if (Z.gewaehlt < 0) Z.gewaehlt = null;

    Z.partieId = partie.id;
    Z.zugZaehler = partie.zugZaehler;
    anstossen();
}

/* ------------------------------------------------------------------ *
 * Die kleinen Bretter als 3D-Standbilder (seit v0.123.0)
 *
 * Startvorschau, Brettform-Kacheln, Bildanleitungen, „Schach lernen" und
 * die Rückschau bauen ihre Bretter weiter als 2D-Gitter (`.vorschau`).
 * `standbild(el)` liest dieses Gitter wie das grosse Brett und legt ein
 * 3D-Bild darüber — gerendert von einem zweiten, unsichtbaren Renderer,
 * zwischengespeichert nach Inhalt (dieselbe Stellung = dasselbe Bild, ohne
 * neu zu rechnen). Das Gitter bleibt darunter (unsichtbar), damit Hand und
 * Pfeile der Anleitung ihre Lage behalten; deshalb blicken Anleitungen
 * senkrecht von oben, alle anderen schräg.
 * ------------------------------------------------------------------ */

const MINI = { renderer: null, cache: new Map(), warte: [] };
const MINI_ZELLE = 64;          // Bildpunkte je Feld
const MINI_UEBER = 0.4;        // Platz über der hintersten Reihe, in Zellen
const MINI_FIGUR = 1.0;       // Figuren im kleinen Bild etwas kleiner

/* Derselbe Blickwinkel wie das grosse Brett (Nutzer 24.09.2026: „der
   Blickwinkel ist anders"). Bis v0.130.0 fest 30 Grad. */
function miniNeigung() {
    return (BLICKE[Z.einst.blick] || BLICKE[VORGABE.blick]).winkel;
}

function miniRenderer() {
    if (MINI.renderer) return MINI.renderer;
    const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    r.setPixelRatio(1);
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.NoToneMapping;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.setClearColor(0x000000, 0);
    MINI.renderer = r;
    return r;
}

function miniLicht(szene, halb) {
    szene.add(new THREE.HemisphereLight(0xf4f7ff, 0x3a3f4a, 1.25));
    const licht = new THREE.DirectionalLight(0xffffff, 2.1);
    licht.position.set(-5, 11, 6);
    licht.castShadow = true;
    licht.shadow.mapSize.set(1024, 1024);
    licht.shadow.bias = -0.0006;
    licht.shadow.normalBias = 0.02;
    const sk = licht.shadow.camera;
    sk.left = -halb; sk.right = halb; sk.top = halb; sk.bottom = -halb; sk.near = 1; sk.far = 40;
    szene.add(licht, licht.target);
    const gegen = new THREE.DirectionalLight(0xdfe8ff, 0.55);
    gegen.position.set(6, 5, -7);
    szene.add(gegen);
}

/* Eine orthografische Kamera, die genau `punkte` umschliesst. */
function miniKamera(richtung, punkte, rand) {
    const kamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
    kamera.position.copy(richtung).multiplyScalar(30);
    kamera.up.set(0, 1, 0);
    if (Math.abs(richtung.y) > 0.999) kamera.up.set(0, 0, -1);
    kamera.lookAt(0, 0, 0);
    kamera.updateMatrixWorld();
    const inv = kamera.matrixWorldInverse;
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const p of punkte) {
        const q = p.clone().applyMatrix4(inv);
        x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x);
        y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y);
    }
    kamera.left = x0 - rand; kamera.right = x1 + rand;
    kamera.top = y1 + rand; kamera.bottom = y0 - rand;
    kamera.updateProjectionMatrix();
    return kamera;
}

function miniSignatur(b, draufsicht) {
    const teile = [b.spalten, draufsicht ? "o" : "s", Z.einst.blick, Z.einst.thema, Z.einst.figuren, Z.einst.kacheln];
    for (const z of b.zellen) {
        const klassen = Array.from(z.k).filter((n) => n.startsWith("feld-") || n.startsWith("mauer-") || n.startsWith("kante-")).sort().join(".");
        const f = z.figur ? z.figur.farbe[0] + z.figur.art : "";
        const g = z.geist ? "g" + z.geist.farbe[0] + z.geist.art : "";
        const x = z.box ? "b" + z.box.stufe + (z.box.pech ? "p" : "") : "";
        teile.push(klassen + f + g + x);
    }
    return teile.join("|");
}

/*
 * EIN FELD DES KLEINEN BRETTS OHNE FIGUR: Stein, Mulde, Ringe, Rahmen und
 * Deko (Mauer, Reif, Schild, Fessel). Gemeinsam für Standbild und Bühne
 * (seit v0.135.0 herausgelöst). Gibt den Hub des Steins zurück — oder
 * `null` bei einem Riss (dort steht nichts).
 */
function miniFeldBauen(ziel, z, m, wegwerfen) {
    const oben = GEO.oberkante;
    const k = z.k;
    const grund = farbe(z.hell ? THEMEN[Z.einst.thema].hell : THEMEN[Z.einst.thema].dunkel);
    if (z.riss) {
        const grube = new THREE.Mesh(GEO.grube || (GEO.grube = new THREE.BoxGeometry(0.9, 0.04, 0.9)), Z.mat.grube);
        grube.position.set(m.x, 0.02, m.z);
        ziel.add(grube);
        return null;
    }
    const mat = kachelMaterial(z.hell);
    mat.color.copy(kachelFarbe(z, grund));
    wegwerfen.push(mat);
    const mulde = k.contains("feld-ziel") || k.contains("feld-schlag");
    const hub = k.contains("feld-vorschau") ? 0.1 : (k.contains("feld-wahl") ? 0.05 : 0);
    const kachel = new THREE.Mesh(mulde ? GEO.kachelMulde : GEO.kachel, mat);
    kachel.position.set(m.x, hub, m.z);
    kachel.receiveShadow = true;
    ziel.add(kachel);
    if (mulde) {
        const mm = new THREE.MeshPhysicalMaterial({ color: grund.clone().multiplyScalar(0.74), roughness: 0.6, side: THREE.DoubleSide });
        wegwerfen.push(mm);
        const schale = new THREE.Mesh(GEO.mulde, mm);
        schale.position.set(m.x, oben + hub, m.z);
        ziel.add(schale);
    }
    if (k.contains("feld-schlag") || k.contains("feld-geliehen")) {
        const ring = new THREE.Mesh(GEO.ring, new THREE.MeshBasicMaterial({
            color: farbe(k.contains("feld-schlag") ? FARBE.schlag : FARBE.geliehen), transparent: true, opacity: 0.9, depthWrite: false }));
        wegwerfen.push(ring.material);
        ring.position.set(m.x, oben + hub + 0.004, m.z);
        ziel.add(ring);
    }
    if (hub > 0) {
        const hex = k.contains("feld-vorschau") ? FARBE.vorschau : FARBE.wahl;
        const rm = new THREE.MeshStandardMaterial({ color: farbe(hex), emissive: farbe(hex), emissiveIntensity: 0.55 });
        wegwerfen.push(rm);
        const rand = new THREE.Mesh(randGeometrie(), rm);
        rand.position.set(m.x, oben - 0.035 + hub, m.z);
        ziel.add(rand);
    }
    const deko = new THREE.Group();
    deko.position.set(m.x, hub, m.z);
    if (k.contains("feld-mauer")) deko.add(mauerBauen(k.contains("mauer-senkrecht")));
    if (k.contains("feld-frost")) deko.add(reifBauen());
    if (k.contains("feld-schild")) deko.add(schildBauen(z.figur ? z.figur.art : null));
    if (k.contains("feld-fessel")) deko.add(fesselBauen());
    ziel.add(deko);
    return hub;
}

function miniRendern(b, draufsicht) {
    kachelFormen();
    const szene = new THREE.Scene();
    const wegwerfen = [];
    const { spalten, reihen } = b;
    const mitte = (i) => new THREE.Vector3(i % spalten - (spalten - 1) / 2, 0,
        Math.floor(i / spalten) - (reihen - 1) / 2);
    miniLicht(szene, Math.max(spalten, reihen) / 2 + 1.5);

    const oben = GEO.oberkante;
    b.zellen.forEach((z, i) => {
        if (z.ausserhalb) return;
        const m = mitte(i);
        const hub = miniFeldBauen(szene, z, m, wegwerfen);
        if (hub === null) return;

        for (const [eintrag, geist] of [[z.figur, false], [z.geist, true]]) {
            if (!eintrag) continue;
            let fm = Z.mat[eintrag.farbe];
            if (geist) {
                fm = fm.clone(); fm.transparent = true; fm.opacity = 0.32; fm.depthWrite = false;
                wegwerfen.push(fm);
            }
            const netz = new THREE.Mesh(Z.formen[eintrag.art], fm);
            netz.castShadow = !geist;
            netz.scale.setScalar(MINI_FIGUR);
            netz.position.set(m.x, oben + hub, m.z);
            if (eintrag.art === "springer") {
                netz.rotation.y = eintrag.farbe === "weiss" ? Math.PI / 2 + 0.35 : -Math.PI / 2 + 0.35;
            }
            szene.add(netz);
        }
        if (z.box) {
            const box = boxBauen(z.box);
            box.position.set(m.x, oben + 0.42 + hub, m.z);
            box.userData.dreher.rotation.y = 0.5;
            szene.add(box);
        }
    });

    /*
     * DIE KAMERA DECKT DAS GITTER GENAU. Orthografisch und schräg bildet sie
     * die Ebene der Steinoberseiten LINEAR ab: Wird das Bild auf die Grösse
     * des 2D-Gitters gezogen, liegt jeder Stein genau auf seiner Zelle — und
     * Hand und Pfeile der Anleitung treffen ihr Feld. Links/rechts sind die
     * Brettkanten, unten die Vorderkante, oben die Hinterkante plus Platz für
     * die hohen Figuren der hintersten Reihe (`MINI_UEBER`).
     */
    const hx = spalten / 2, hz = reihen / 2;
    const neigung = miniNeigung();
    const richtung = new THREE.Vector3(0, Math.cos(neigung), Math.sin(neigung));
    const kamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
    kamera.position.copy(richtung).multiplyScalar(30).add(new THREE.Vector3(0, oben, 0));
    kamera.lookAt(0, oben, 0);
    kamera.updateMatrixWorld();
    const vorn = new THREE.Vector3(0, oben, hz).applyMatrix4(kamera.matrixWorldInverse).y;
    const hinten = new THREE.Vector3(0, oben, -hz).applyMatrix4(kamera.matrixWorldInverse).y;
    const zelleY = (hinten - vorn) / reihen;
    kamera.left = -hx; kamera.right = hx;
    kamera.bottom = vorn; kamera.top = hinten + MINI_UEBER * zelleY;
    kamera.updateProjectionMatrix();

    const r = miniRenderer();
    const breite = Math.min(900, Math.round(spalten * MINI_ZELLE));
    /* UNVERZERRT: Das Bild bekommt genau das Seitenverhältnis, das die
       Kamera sieht. Bis v0.130.0 wurde es auf quadratische Zellen gezogen —
       die Figuren wirkten gestaucht (Nutzer 24.09.2026). Jetzt passt sich
       umgekehrt das 2D-Gitter an (`--vorschau-stauchung`, stil-effekte.css). */
    const hoehe = Math.round(breite / spalten * (reihen + MINI_UEBER) * zelleY);
    r.setSize(breite, hoehe, false);
    r.render(szene, kamera);
    const url = r.domElement.toDataURL("image/png");
    for (const m of wegwerfen) m.dispose();
    return url;
}

/* Der Rahmen-Ring um einen gehobenen Stein (dieselbe Form wie am grossen
   Brett). */
function randGeometrie() {
    if (!GEO.randForm) {
        const k = KACHELN[Z.einst.kacheln];
        const aussen = (1 - k.fuge) / 2 + 0.02;
        const innen = aussen - 0.07;
        const s = new THREE.Shape();
        s.moveTo(-aussen, -aussen); s.lineTo(aussen, -aussen); s.lineTo(aussen, aussen); s.lineTo(-aussen, aussen); s.lineTo(-aussen, -aussen);
        const h = new THREE.Path();
        h.moveTo(-innen, -innen); h.lineTo(-innen, innen); h.lineTo(innen, innen); h.lineTo(innen, -innen); h.lineTo(-innen, -innen);
        s.holes.push(h);
        GEO.randForm = new THREE.ExtrudeGeometry(s, { depth: 0.05, bevelEnabled: false });
        GEO.randForm.rotateX(-Math.PI / 2);
    }
    return GEO.randForm;
}

function standbild(el) {
    if (!el) return;
    if (!Z.bereit) {
        if (!Z.fehler) MINI.warte.push(el);
        return;
    }
    if (!Z.einst.an || el.querySelector(":scope > .vorschau-3d-bild")) return;
    const zellen = Array.from(el.querySelectorAll(":scope > .vorschau-feld"));
    if (zellen.length === 0) return;
    const spalten = parseInt(el.style.getPropertyValue("--vorschau-spalten"), 10) || 8;
    const b = { spalten, reihen: Math.round(zellen.length / spalten), zellen: zellen.map(zelleLesen) };
    const draufsicht = el.classList.contains("anleitung-brett");
    const sig = miniSignatur(b, draufsicht);
    let url = MINI.cache.get(sig);
    if (!url) {
        try {
            url = miniRendern(b, draufsicht);
        } catch (fehler) {
            console.error("3D-Standbild nicht möglich:", fehler);
            return;
        }
        if (MINI.cache.size > 80) MINI.cache.delete(MINI.cache.keys().next().value);
        MINI.cache.set(sig, url);
    }
    const bild = document.createElement("img");
    bild.className = "vorschau-3d-bild";
    /* Volle Breite, Höhe aus dem Bild selbst; es steht unten bündig und
       ragt oben hinaus. Das Gitter darunter staucht seine Zeilen um
       denselben Faktor wie die Kamera, damit Hand und Pfeile ihr Feld
       treffen. */
    el.style.setProperty("--vorschau-stauchung", Math.cos(miniNeigung()).toFixed(4));
    bild.alt = "";
    bild.setAttribute("aria-hidden", "true");
    bild.src = url;
    el.classList.add("vorschau-3d");
    el.appendChild(bild);
}

/* ------------------------------------------------------------------ *
 * DIE ANLEITUNGS-BÜHNE (seit v0.135.0, Nutzer: „weniger Text bis keinen,
 * nur das Video, wie es geht" — Entwurf docs\entwurf-anleitungen-und-
 * platzieren.md, Abschnitt 3)
 *
 * Eine Anleitung ist ein kleines Spiel, das sich selbst vorspielt. Die
 * Bilder rechnet weiter `SCHACH_VORSCHAU.schritte` mit den echten Regeln;
 * der Bildschirm baut aus jedem Schritt das 2D-Gitter wie bisher, und die
 * Bühne LIEST es (wie das grosse Brett) — nur zeigt sie nicht Bild für
 * Bild, sondern spielt dazwischen: Ein 3D-Finger schwebt zum Feld, zur
 * Karte oder zu ✓ und tippt (kleine Welle), die Figuren hüpfen ihren Weg,
 * Geschlagene vergehen, eine leuchtende Spur ersetzt die Pfeile. Karte und
 * ✓ liegen als 3D-Teile vor dem Brett — genau wie die Leiste im Spiel.
 *
 * Gezeichnet wird mit dem EINEN kleinen Renderer der Standbilder; jede
 * Bühne kopiert ihr Bild in eine eigene Leinwand. Eine gemeinsame
 * Schleife mit 30 Bildern je Sekunde läuft nur, solange eine Bühne im
 * Bildschirm steht. Tippen hält an und lässt weiterlaufen.
 * ------------------------------------------------------------------ */

const BUEHNE = { alle: new Set(), laeuft: false, zuletzt: 0 };
const BUEHNE_VORN = 1.7;       // Platz vor dem Brett für Karte und ✓, in Feldern
const BUEHNE_MS = { hin: 520, tipp: 300, zug: 560, halt: 900, ende: 1300 };

function buehneMoeglich() {
    return !!(Z.bereit && !Z.fehler && Z.einst && Z.einst.an);
}

function buehneMitte(b, i) {
    return new THREE.Vector3(i % b.spalten - (b.spalten - 1) / 2, 0,
        Math.floor(i / b.spalten) - (b.reihen - 1) / 2);
}

/* Der Finger: ein weisser Handschuh mit dunklem Rand (wie die flache Hand
   von v0.116), die Spitze im Ursprung, der Zeigefinger zeigt zum Feld. */
function handBauen() {
    const weiss = Z.mat.handschuh || (Z.mat.handschuh = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55 }));
    const rand = Z.mat.handRand || (Z.mat.handRand = new THREE.MeshBasicMaterial({ color: 0x1c1f23, side: THREE.BackSide }));
    const teile = new THREE.Group();
    const stueck = (geo, x, y, z, rx, rz) => {
        for (const [mat, s] of [[weiss, 1], [rand, 1.12]]) {
            const m = new THREE.Mesh(geo, mat);
            m.position.set(x, y, z);
            m.rotation.set(rx || 0, 0, rz || 0);
            m.scale.setScalar(s);
            m.castShadow = mat === weiss;
            teile.add(m);
        }
    };
    GEO.handFinger = GEO.handFinger || new THREE.CapsuleGeometry(0.075, 0.42, 6, 12);
    GEO.handKnoechel = GEO.handKnoechel || new THREE.CapsuleGeometry(0.07, 0.14, 6, 10);
    GEO.handFlaeche = GEO.handFlaeche || new RoundedBoxGeometry(0.44, 0.4, 0.2, 3, 0.08);
    /* Zeigefinger entlang +Y, Spitze bei 0. */
    stueck(GEO.handFinger, 0, 0.285, 0);
    /* Handfläche darüber, die eingeklappten Finger davor, der Daumen. */
    stueck(GEO.handFlaeche, 0.13, 0.66, 0);
    for (const x of [0.2, 0.33]) stueck(GEO.handKnoechel, x - 0.02, 0.5, 0.06, 0, 0);
    stueck(GEO.handKnoechel, -0.12, 0.62, 0.05, 0, 0.9);
    /* Gekippt: der Finger kommt von vorn rechts und zeigt nach hinten unten
       aufs Feld — so sieht man ihn auch von fast oben. */
    const hand = new THREE.Group();
    hand.add(teile);
    teile.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0.3, 0.42, 0.86).normalize());
    hand.scale.setScalar(1.35);
    return hand;
}

/* Karte und ✓ vor dem Brett. */
function buehneLeisteBauen(bu) {
    const gruppe = new THREE.Group();
    const vorn = bu.b.reihen / 2 + 0.85;
    const oben = GEO.oberkante;
    /* Die Karte: das Plättchen-Bild der Karten-Leiste, flach hingelegt. */
    const kartenMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true });
    const adresse = (typeof FAEHIGKEIT_ZEICHEN !== "undefined" && bu.art) ? FAEHIGKEIT_ZEICHEN.plaettchen[bu.art] : null;
    if (adresse) {
        new THREE.TextureLoader().load(adresse, (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace;
            kartenMat.map = tex;
            kartenMat.needsUpdate = true;
        });
    } else {
        kartenMat.color = farbe("#4a78c8");
    }
    bu.wegwerfen.push(kartenMat);
    const karte = new THREE.Mesh(new THREE.PlaneGeometry(0.68, 0.96), kartenMat);
    karte.rotation.x = -Math.PI / 2;
    karte.position.set(-0.55, oben + 0.01, vorn);
    gruppe.add(karte);
    /* Der Haken: grüne Scheibe, weisses Zeichen aus zwei Balken. */
    const scheibeMat = new THREE.MeshStandardMaterial({ color: farbe("#3a3f4a"), roughness: 0.5 });
    bu.wegwerfen.push(scheibeMat);
    const scheibe = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.08, 32), scheibeMat);
    scheibe.position.set(0.55, oben + 0.04, vorn);
    const zeichenMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    bu.wegwerfen.push(zeichenMat);
    const kurz = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.02, 0.06), zeichenMat);
    kurz.position.set(-0.07, 0.05, 0.02);
    kurz.rotation.y = -0.8;
    const lang = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.02, 0.06), zeichenMat);
    lang.position.set(0.06, 0.05, -0.03);
    lang.rotation.y = 0.85;
    scheibe.add(kurz, lang);
    gruppe.add(scheibe);
    bu.karte = karte;
    bu.haken = scheibe;
    bu.hakenMat = scheibeMat;
    bu.kartenMat = kartenMat;
    bu.szene.add(gruppe);
}

function buehne(el, auftrag) {
    if (!buehneMoeglich()) return false;
    const gitter = auftrag.gitter;
    const bretter = gitter.map((g) => {
        const zellen = Array.from(g.querySelectorAll(":scope > .vorschau-feld"));
        const spalten = parseInt(g.style.getPropertyValue("--vorschau-spalten"), 10) || 8;
        return { spalten, reihen: Math.round(zellen.length / spalten), zellen: zellen.map(zelleLesen) };
    });
    if (bretter.length === 0) return false;
    kachelFormen();

    const b = bretter[0];
    const szene = new THREE.Scene();
    miniLicht(szene, Math.max(b.spalten, b.reihen) / 2 + 2);
    const leinwand = document.createElement("canvas");
    leinwand.className = "anleitung-buehne-leinwand";
    leinwand.setAttribute("aria-hidden", "true");
    el.appendChild(leinwand);

    const bu = {
        el, leinwand, szene, b, bretter, schritte: auftrag.schritte, art: auftrag.art || "",
        beiSchritt: auftrag.beiSchritt || (() => {}),
        felder: new THREE.Group(), figuren: new Map(), boxen: new Map(), geister: new Map(),
        effekte: new THREE.Group(), tweens: [], wegwerfen: [], feldWeg: [],
        uhr: 0, pause: false, stelle: -1, naechsterWechsel: 0, hand: handBauen(),
        handZiel: null, handVon: null, handStart: 0, tippZeit: -1, tippFertig: null
    };
    szene.add(bu.felder, bu.effekte, bu.hand);

    /* Kamera wie beim Standbild, dazu vorn Platz für Karte und ✓. */
    const oben = GEO.oberkante;
    const neigung = miniNeigung();
    const richtung = new THREE.Vector3(0, Math.cos(neigung), Math.sin(neigung));
    const kamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
    kamera.position.copy(richtung).multiplyScalar(30).add(new THREE.Vector3(0, oben, 0));
    kamera.lookAt(0, oben, 0);
    kamera.updateMatrixWorld();
    const hz = b.reihen / 2;
    const mitKarte = !!bu.art;
    const vornY = new THREE.Vector3(0, oben, hz + (mitKarte ? BUEHNE_VORN : 0.35)).applyMatrix4(kamera.matrixWorldInverse).y;
    const hintenY = new THREE.Vector3(0, oben, -hz).applyMatrix4(kamera.matrixWorldInverse).y;
    const zelleY = Math.cos(neigung);
    kamera.left = -b.spalten / 2 - 0.1; kamera.right = b.spalten / 2 + 0.1;
    kamera.bottom = vornY; kamera.top = hintenY + (MINI_UEBER + 0.3) * zelleY;
    kamera.updateProjectionMatrix();
    bu.kamera = kamera;
    bu.seitenVerhaeltnis = (kamera.top - kamera.bottom) / (kamera.right - kamera.left);
    leinwand.style.aspectRatio = (1 / bu.seitenVerhaeltnis).toFixed(4);

    if (mitKarte) buehneLeisteBauen(bu);
    /* Ohne Karte (Unglücke) ruht die Hand unsichtbar; mit Karte rechts
       neben ✓. */
    bu.ruhe = new THREE.Vector3(1.45, oben + 0.5, hz + 0.75);
    bu.hand.position.copy(bu.ruhe);
    bu.handRuhtSichtbar = mitKarte;

    leinwand.addEventListener("click", () => { bu.pause = !bu.pause; });

    buehneSchritt(bu, 0, false);
    BUEHNE.alle.add(bu);
    buehneStarten();
    return true;
}

/* Wohin tippt der Finger in diesem Schritt? */
function buehneTippOrt(bu, schritt) {
    const oben = GEO.oberkante;
    if (schritt.okTipp && bu.haken) return bu.haken.position.clone().setY(oben + 0.09);
    if (schritt.knopfTipp && bu.karte) return bu.karte.position.clone().setY(oben + 0.02);
    if (schritt.tipp >= 0) {
        const m = buehneMitte(bu.b, schritt.tipp);
        /* Auf eine Figur tippt man oben auf den Kopf — die Hand darf nicht
           in sie hineingehen. */
        const figur = bu.figuren.get(schritt.tipp);
        const hoehe = figur ? hitbox(figur.userData.art).h * MINI_FIGUR : 0;
        return m.setY(oben + hoehe + 0.02);
    }
    return null;
}

/* In Schritt `k` wechseln: erst der Finger (falls getippt wird), beim Tipp
   das neue Brett. */
function buehneSchritt(bu, k, animieren) {
    const schritt = bu.schritte[k];
    bu.stelle = k;
    bu.beiSchritt(k);
    const ziel = animieren ? buehneTippOrt(bu, schritt) : null;
    if (ziel) {
        bu.handVon = bu.hand.position.clone();
        bu.handZiel = ziel;
        bu.handStart = bu.uhr;
        bu.tippZeit = bu.uhr + BUEHNE_MS.hin;
        bu.tippFertig = () => buehneAnwenden(bu, k, true, ziel);
        bu.naechsterWechsel = bu.uhr + BUEHNE_MS.hin + BUEHNE_MS.tipp + BUEHNE_MS.zug + BUEHNE_MS.halt;
    } else {
        bu.handVon = bu.hand.position.clone();
        bu.handZiel = bu.ruhe.clone();
        bu.handStart = bu.uhr;
        bu.tippZeit = -1;
        bu.tippFertig = null;
        buehneAnwenden(bu, k, animieren, null);
        bu.naechsterWechsel = bu.uhr + (animieren ? BUEHNE_MS.zug : 0) + BUEHNE_MS.halt;
    }
    if (k === bu.schritte.length - 1) bu.naechsterWechsel += BUEHNE_MS.ende - BUEHNE_MS.halt;
}

function buehneTween(bu, ms, schritt, fertig, verzoegerung) {
    bu.tweens.push({ start: bu.uhr + (verzoegerung || 0), ms: Math.max(1, ms), schritt, fertig });
}

/* Das Brett von Schritt `k` herstellen — mit Bewegung oder sofort. */
function buehneAnwenden(bu, k, animieren, tippOrt) {
    const b = bu.bretter[k];
    const schritt = bu.schritte[k];
    const oben = GEO.oberkante;

    /* Die Steine, Rahmen und Deko: neu, das ist billig. */
    for (const kind of bu.felder.children.slice()) bu.felder.remove(kind);
    for (const m of bu.feldWeg) m.dispose();
    bu.feldWeg = [];
    const hub = [];
    b.zellen.forEach((z, i) => {
        if (z.ausserhalb) return;
        hub[i] = miniFeldBauen(bu.felder, z, buehneMitte(b, i), bu.feldWeg) || 0;
    });
    bu.felder.traverse((o) => { if (o.isMesh) o.receiveShadow = true; });

    /* Die Welle, wo getippt wurde. */
    if (tippOrt && animieren) buehneWelle(bu, tippOrt, "#ffffff");

    /* Figuren: bekannte Wege zuerst, dann Gleiches in der Nähe, der Rest
       vergeht oder erscheint. */
    const alt = new Map(bu.figuren);
    const neu = new Map();
    const offen = [];
    b.zellen.forEach((z, i) => {
        if (!z.figur) return;
        const g = alt.get(i);
        if (g && g.userData.art === z.figur.art && g.userData.farbe === z.figur.farbe) {
            neu.set(i, g); alt.delete(i);
        } else {
            offen.push(i);
        }
    });
    const bewegen = [];
    for (const weg of (schritt.wege || [])) {
        const g = alt.get(weg.von);
        const stelle = offen.indexOf(weg.nach);
        if (g && stelle !== -1 && b.zellen[weg.nach].figur.farbe === g.userData.farbe) {
            bewegen.push({ g, von: weg.von, nach: weg.nach, neu: b.zellen[weg.nach].figur });
            alt.delete(weg.von); offen.splice(stelle, 1);
        }
    }
    for (let n = offen.length - 1; n >= 0; n--) {
        const i = offen[n];
        const ziel = b.zellen[i].figur;
        let beste = null, weite = 3.01;
        for (const [j, g] of alt) {
            if (g.userData.art !== ziel.art || g.userData.farbe !== ziel.farbe) continue;
            const w = buehneMitte(b, i).distanceTo(buehneMitte(b, j));
            if (w < weite) { beste = j; weite = w; }
        }
        if (beste !== null) {
            bewegen.push({ g: alt.get(beste), von: beste, nach: i, neu: ziel });
            alt.delete(beste); offen.splice(n, 1);
        }
    }
    /* Was bleibt, vergeht — vor der Ankunft (keine Durchdringung). */
    for (const [, g] of alt) {
        if (!animieren) { bu.szene.remove(g); continue; }
        const start = g.position.clone();
        buehneTween(bu, 200, (t) => {
            const s = Math.max(0.001, 1 - raus(t));
            g.scale.set(s, s, s);
            g.position.y = start.y + raus(t) * 0.4;
            g.rotation.y = t * 5;
        }, () => bu.szene.remove(g));
    }
    bewegen.forEach((bew, nummer) => {
        neu.set(bew.nach, bew.g);
        const a = buehneMitte(b, bew.von), z = buehneMitte(b, bew.nach);
        const y0 = oben + (hub[bew.nach] || 0);
        if (!animieren) { bew.g.position.set(z.x, y0, z.z); return; }
        const weite = a.distanceTo(z);
        /* Hoch genug über jede Figur auf dem Weg (die Bühne ist klein —
           Springer und lange Wege springen über alles). Ziehen mehrere
           zugleich (Platztausch, Rochade), springt jeder weitere über den
           ersten — keine Durchdringung. */
        const hoch = (nummer > 0 || bew.g.userData.art === "springer" || weite > 1.5)
            ? 1.45 : 0.35 + weite * 0.1;
        buehneTween(bu, BUEHNE_MS.zug - 60, (t) => {
            const k2 = weich(t);
            bew.g.position.set(a.x + (z.x - a.x) * k2, y0 + Math.sin(Math.PI * t) * hoch, a.z + (z.z - a.z) * k2);
        }, () => {
            bew.g.position.set(z.x, y0, z.z);
            if (bew.neu.art !== bew.g.userData.art) {
                bew.g.userData.art = bew.neu.art;
                bew.g.userData.netz.geometry = Z.formen[bew.neu.art];
            }
            buehneWelle(bu, new THREE.Vector3(z.x, oben + 0.005, z.z), "#d8d2c4");
        }, 60);
    });
    for (const i of offen) {
        const g = figurBauen(b.zellen[i].figur, false);
        g.userData.netz.scale.setScalar(MINI_FIGUR);
        const m = buehneMitte(b, i);
        g.position.set(m.x, oben + (hub[i] || 0), m.z);
        bu.szene.add(g);
        neu.set(i, g);
        if (animieren) {
            g.scale.setScalar(0.01);
            buehneTween(bu, 320, (t) => { const s = 0.01 + raus(t) * 0.99; g.scale.set(s, s, s); }, null, 120);
        }
    }
    /* Figuren auf gehobenen Steinen mitheben. */
    for (const [i, g] of neu) {
        if (!bewegen.some((bew) => bew.g === g)) g.position.y = oben + (hub[i] || 0);
    }
    bu.figuren = neu;

    /* Geister und Lootboxen: einfach abgleichen. */
    for (const [schluessel, karte, bauen] of [["geist", bu.geister, (e) => figurBauen(e, true)], ["box", bu.boxen, (e) => boxBauen(e)]]) {
        const neuKarte = new Map();
        b.zellen.forEach((z, i) => {
            const e = z[schluessel];
            if (!e) return;
            const kennung = schluessel === "box" ? e.stufe + (e.pech ? "p" : "") : e.farbe + e.art;
            const vorher = karte.get(i);
            if (vorher && vorher.userData.kennung === kennung) {
                neuKarte.set(i, vorher); karte.delete(i); return;
            }
            const g = bauen(e);
            g.userData.kennung = kennung;
            const m = buehneMitte(b, i);
            g.position.set(m.x, oben + (schluessel === "box" ? 0.42 : 0) + (hub[i] || 0), m.z);
            bu.szene.add(g);
            neuKarte.set(i, g);
        });
        for (const [, g] of karte) {
            if (!animieren) { bu.szene.remove(g); continue; }
            const y = g.position.y;
            buehneTween(bu, 260, (t) => {
                const s = Math.max(0.001, 1 - t);
                g.scale.set(s, s, s);
                g.position.y = y + raus(t) * 1.6;
            }, () => bu.szene.remove(g));
        }
        if (schluessel === "box") bu.boxen = neuKarte; else bu.geister = neuKarte;
    }

    /* Die Spur statt der Pfeile. */
    for (const kind of bu.effekte.children.slice()) {
        if (kind.userData.spur) { bu.effekte.remove(kind); kind.geometry.dispose(); }
    }
    for (const weg of (schritt.wege || [])) buehneSpur(bu, weg, animieren);

    /* Das Wirkungs-Bild: die markierten Felder leuchten kurz auf. */
    if (animieren && schritt.schauspiel) {
        for (const feld of (schritt.marken || [])) {
            const m = buehneMitte(b, feld);
            buehneWelle(bu, new THREE.Vector3(m.x, oben + 0.01, m.z), "#ffd76a", 180);
            buehneWelle(bu, new THREE.Vector3(m.x, oben + 0.01, m.z), "#ffd76a", 420);
        }
    }

    /* Karte und ✓ zeigen, wo man gerade ist. */
    if (bu.karte) {
        const karteAn = bu.schritte.slice(0, k + 1).some((s) => s.knopfTipp)
            && !bu.schritte.slice(0, k).some((s) => s.okTipp);
        bu.karte.position.y = oben + (karteAn ? 0.12 : 0.01);
        bu.kartenMat.opacity = karteAn || schritt.knopfTipp ? 1 : 0.55;
        const hakenAn = !!schritt.okTipp;
        bu.hakenMat.color = farbe(hakenAn ? "#38c172" : "#3a3f4a");
        bu.hakenMat.emissive = farbe(hakenAn ? "#38c172" : "#000000");
        bu.hakenMat.emissiveIntensity = hakenAn ? 0.35 : 0;
    }
}

const SPUR_MAT = {};
function buehneSpur(bu, weg, animieren) {
    const b = bu.b;
    const a = buehneMitte(b, weg.von), z = buehneMitte(b, weg.nach);
    const laenge = a.distanceTo(z);
    if (laenge < 0.01) return;
    const mat = SPUR_MAT.an || (SPUR_MAT.an = new THREE.MeshBasicMaterial({ color: farbe("#9fd07a"), transparent: true, opacity: 0.85, depthWrite: false }));
    const geo = new THREE.BoxGeometry(0.1, 0.02, laenge - 0.5);
    const spur = new THREE.Mesh(geo, mat);
    spur.position.set((a.x + z.x) / 2, GEO.oberkante + 0.03, (a.z + z.z) / 2);
    spur.rotation.y = Math.atan2(z.x - a.x, z.z - a.z);
    spur.userData.spur = true;
    bu.effekte.add(spur);
    if (animieren) {
        spur.scale.z = 0.01;
        buehneTween(bu, 300, (t) => { spur.scale.z = 0.01 + weich(t) * 0.99; });
    }
}

function buehneWelle(bu, ort, hex, verzoegerung) {
    GEO.welle = GEO.welle || new THREE.RingGeometry(0.2, 0.26, 36).rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ color: farbe(hex), transparent: true, opacity: 0.9, depthWrite: false });
    const ring = new THREE.Mesh(GEO.welle, mat);
    ring.position.copy(ort).setY(ort.y + 0.01);
    ring.visible = false;
    bu.effekte.add(ring);
    buehneTween(bu, 480, (t) => {
        ring.visible = true;
        ring.scale.setScalar(0.6 + t * 1.6);
        mat.opacity = 0.9 * (1 - t);
    }, () => { bu.effekte.remove(ring); mat.dispose(); }, verzoegerung || 0);
}

/* Die Bühne auf ihren Anfang: alles sofort, ohne Bewegung. */
function buehneZurueck(bu) {
    for (const karte of [bu.figuren, bu.boxen, bu.geister]) {
        for (const [, g] of karte) bu.szene.remove(g);
        karte.clear();
    }
    bu.tweens = [];
    buehneSchritt(bu, 0, false);
}

function buehneBild(bu, dt) {
    if (!bu.pause) bu.uhr += dt;
    const uhr = bu.uhr;
    /* Tweens der Bühne. */
    for (let n = bu.tweens.length - 1; n >= 0; n--) {
        const tw = bu.tweens[n];
        if (uhr < tw.start) continue;
        const t = Math.min(1, (uhr - tw.start) / tw.ms);
        tw.schritt(t);
        if (t >= 1) { bu.tweens.splice(n, 1); if (tw.fertig) tw.fertig(); }
    }
    /* Der Finger: hinschweben, tippen, stehen bleiben. */
    const hin = Math.min(1, (uhr - bu.handStart) / BUEHNE_MS.hin);
    bu.hand.visible = bu.handRuhtSichtbar || bu.tippZeit >= 0 || hin < 1;
    const ziel = bu.handZiel.clone().setY(bu.handZiel.y + (bu.tippZeit >= 0 ? 0.35 : 0));
    bu.hand.position.lerpVectors(bu.handVon, ziel, weich(hin));
    if (bu.tippZeit >= 0 && uhr >= bu.tippZeit) {
        const t = Math.min(1, (uhr - bu.tippZeit) / BUEHNE_MS.tipp);
        bu.hand.position.y = ziel.y - Math.sin(Math.PI * t) * 0.35;
        if (t >= 0.5 && bu.tippFertig) {
            const f = bu.tippFertig;
            bu.tippFertig = null;
            f();
        }
    }
    /* Lootboxen drehen sich langsam. */
    for (const [, g] of bu.boxen) {
        if (g.userData.dreher) g.userData.dreher.rotation.y += dt / 1900;
    }
    /* Nächster Schritt — nach dem letzten wieder von vorn. */
    if (!bu.pause && uhr >= bu.naechsterWechsel) {
        const k = bu.stelle + 1;
        if (k >= bu.schritte.length) buehneZurueck(bu);
        else buehneSchritt(bu, k, true);
    }

    /* Zeichnen: der gemeinsame Renderer, dann in die eigene Leinwand. */
    const breite = Math.max(1, Math.round(bu.leinwand.clientWidth * Math.min(window.devicePixelRatio || 1, 2)));
    const hoehe = Math.max(1, Math.round(breite * bu.seitenVerhaeltnis));
    if (bu.leinwand.width !== breite || bu.leinwand.height !== hoehe) {
        bu.leinwand.width = breite;
        bu.leinwand.height = hoehe;
    }
    const r = miniRenderer();
    r.setSize(breite, hoehe, false);
    r.render(bu.szene, bu.kamera);
    const ctx = bu.ctx || (bu.ctx = bu.leinwand.getContext("2d"));
    ctx.clearRect(0, 0, breite, hoehe);
    ctx.drawImage(r.domElement, 0, 0, breite, hoehe);
}

function buehneStarten() {
    if (BUEHNE.laeuft) return;
    BUEHNE.laeuft = true;
    BUEHNE.zuletzt = performance.now();
    requestAnimationFrame(buehneTakt);
}

function buehneTakt(zeit) {
    const dt = Math.min(80, zeit - BUEHNE.zuletzt);
    /* 30 Bilder je Sekunde reichen für die kleine Bühne. */
    if (dt < 30) { requestAnimationFrame(buehneTakt); return; }
    BUEHNE.zuletzt = zeit;
    for (const bu of BUEHNE.alle) {
        if (!bu.el.isConnected) {
            BUEHNE.alle.delete(bu);
            for (const m of bu.feldWeg.concat(bu.wegwerfen)) m.dispose();
            continue;
        }
        /* Nicht im Bild (Dialog zu, weggescrollt, verborgen): nicht rechnen. */
        if (bu.el.offsetParent === null) continue;
        try {
            buehneBild(bu, dt);
        } catch (fehler) {
            console.error("Anleitungs-Bühne:", fehler);
            BUEHNE.alle.delete(bu);
        }
    }
    if (BUEHNE.alle.size === 0) { BUEHNE.laeuft = false; return; }
    requestAnimationFrame(buehneTakt);
}

/* ------------------------------------------------------------------ *
 * Die Figurenbilder der App aus denselben Formen (seit v0.123.0)
 *
 * Überall, wo eine Figur als Bild steht (Hand, Bilanz, „Schach lernen",
 * Rückschau …), zeigte die App die gerenderten PNGs aus img\figuren\. Jetzt
 * rechnet dieses Modul die zwölf Bilder selbst — mit Kamera und Fusslinie
 * des Liefervertrags (50 Grad, Fuss bei 8 Prozent, gemeinsamer Massstab)
 * und im gewählten Figurenstil — und legt sie per Stilregel über die PNGs.
 * Ohne WebGL bleiben die PNGs.
 * ------------------------------------------------------------------ */

function figurenBilder() {
    const szene = new THREE.Scene();
    miniLicht(szene, 2);
    const richtung = new THREE.Vector3(0, Math.sin(THREE.MathUtils.degToRad(50)), Math.cos(THREE.MathUtils.degToRad(50)));
    /* Gemeinsamer Massstab: der König ist die höchste Figur. */
    const punkte = [];
    const r = FIGUR_MASS * 0.42;
    const hoechste = Z.formen.koenig.boundingBox.max.y;
    for (let w = 0; w < Math.PI * 2; w += Math.PI / 8) {
        punkte.push(new THREE.Vector3(Math.cos(w) * r, 0, Math.sin(w) * r));
        punkte.push(new THREE.Vector3(Math.cos(w) * r * 0.5, hoechste, Math.sin(w) * r * 0.5));
    }
    const kamera = miniKamera(richtung, punkte, 0);
    /* Quadratisch machen, Fuss auf 8 Prozent, oben etwas Luft. */
    const hoehe = (kamera.top - kamera.bottom) / 0.89;
    kamera.bottom = kamera.bottom - hoehe * 0.08;
    kamera.top = kamera.bottom + hoehe;
    const mitteX = (kamera.left + kamera.right) / 2;
    kamera.left = mitteX - hoehe / 2;
    kamera.right = mitteX + hoehe / 2;
    kamera.updateProjectionMatrix();

    const ren = miniRenderer();
    ren.setSize(256, 256, false);
    const regeln = [];
    for (const art of ARTEN) {
        for (const farbeName of ["weiss", "schwarz"]) {
            const netz = new THREE.Mesh(Z.formen[art], Z.mat[farbeName]);
            if (art === "springer") netz.rotation.y = -0.5;
            szene.add(netz);
            ren.render(szene, kamera);
            szene.remove(netz);
            regeln.push("body.design-3d .figur-" + farbeName + ".figur-art-" + art
                + " { background-image: url(\"" + ren.domElement.toDataURL("image/png") + "\"); }");
        }
    }
    let stil = document.getElementById("figuren-3d-bilder");
    if (!stil) {
        stil = document.createElement("style");
        stil.id = "figuren-3d-bilder";
        document.head.appendChild(stil);
    }
    stil.textContent = regeln.join("\n");
}

/* ------------------------------------------------------------------ *
 * Die Fähigkeitskarten als 3D-Plättchen (seit v0.127.0, ROADMAP 60)
 *
 * Jede Fähigkeit und jedes Unglück wird eine kleine Karte aus Emaille im
 * Pokerkarten-Verhältnis: die Platte in der Stufenfarbe, das Linienzeichen
 * aus `faehigkeit-zeichen.js` als erhabenes Relief darauf, ringsum ein
 * schmaler erhabener Rahmen. Unglücke sind dunkel, Zeichen und Rahmen
 * leuchten in ihrer Stufenfarbe — so bleiben sie auf einen Blick getrennt.
 *
 * DAS RELIEF IST ECHT: Das Zeichen wird auf eine Leinwand gerastert,
 * weichgezeichnet und hebt die Punkte eines feinen Netzes an; das Licht
 * fällt darauf wie auf die Figuren. Gerendert wird einmal je Art mit dem
 * Renderer der kleinen Bretter, abgelegt als Bildadresse in
 * `FAEHIGKEIT_ZEICHEN.plaettchen` — die Karten selbst bleiben Knöpfe.
 * ------------------------------------------------------------------ */

const PLATTE_B = 0.71;          // Breite zu Höhe 44 : 62
const PLATTE_H = 1.0;
const PLATTE_DICKE = 0.09;
const PLATTE_RUND = 0.06;
const RELIEF_HOEHE = 0.035;
const RASTER_B = 142;           // Höhenraster: Bildpunkte in der Breite
const RASTER_H = 200;

/* Das Linienzeichen als Graustufen-Höhe (0 bis 1), samt Rahmen. */
function reliefRastern(art) {
    return new Promise((fertig) => {
        const svg = FAEHIGKEIT_ZEICHEN.flachBauen(art);
        if (!svg) {
            fertig(null);
            return;
        }
        svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        svg.setAttribute("width", "240");
        svg.setAttribute("height", "240");
        svg.setAttribute("color", "#ffffff");
        const text = new XMLSerializer().serializeToString(svg);
        const bild = new Image();
        bild.onload = () => {
            const leinwand = document.createElement("canvas");
            leinwand.width = RASTER_B;
            leinwand.height = RASTER_H;
            const ctx = leinwand.getContext("2d");
            ctx.fillStyle = "#000";
            ctx.fillRect(0, 0, RASTER_B, RASTER_H);

            /* Der Rahmen: ein schmaler Steg knapp innerhalb der Kante. */
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = RASTER_B * 0.028;
            const e = RASTER_B * 0.1;
            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(e, e, RASTER_B - 2 * e, RASTER_H - 2 * e, RASTER_B * 0.07);
            } else {
                ctx.rect(e, e, RASTER_B - 2 * e, RASTER_H - 2 * e);
            }
            ctx.stroke();

            /* Das Zeichen, etwas über der Mitte — unten stehen Plus und Blitz. */
            const g = RASTER_B * 0.66;
            ctx.drawImage(bild, (RASTER_B - g) / 2, RASTER_H * 0.44 - g / 2, g, g);

            const daten = ctx.getImageData(0, 0, RASTER_B, RASTER_H).data;
            let hoehe = new Float32Array(RASTER_B * RASTER_H);
            for (let i = 0; i < hoehe.length; i++) hoehe[i] = daten[i * 4] / 255;
            /* Zweimal weichzeichnen (Kästchen, waagrecht und senkrecht):
               runde Flanken statt Treppen. `ctx.filter` kennt Safari nicht. */
            for (let durchgang = 0; durchgang < 2; durchgang++) {
                hoehe = kaestchenWeich(hoehe, RASTER_B, RASTER_H, 1, 0);
                hoehe = kaestchenWeich(hoehe, RASTER_B, RASTER_H, 0, 1);
            }
            fertig(hoehe);
        };
        bild.onerror = () => fertig(null);
        bild.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(text);
    });
}

function kaestchenWeich(werte, b, h, dx, dy) {
    const neu = new Float32Array(werte.length);
    const r = 2;
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < b; x++) {
            let summe = 0, n = 0;
            for (let k = -r; k <= r; k++) {
                const xx = x + k * dx, yy = y + k * dy;
                if (xx < 0 || yy < 0 || xx >= b || yy >= h) continue;
                summe += werte[yy * b + xx];
                n++;
            }
            neu[y * b + x] = summe / n;
        }
    }
    return neu;
}

/*
 * DAS ZEICHEN IST EINGESCHNITTEN, NICHT ERHABEN (seit v0.129.0).
 *
 * Nutzer-Ansage 24.09.2026: „die Muster sollen nicht rausstehen, sondern
 * reingehen in die Karten — wie bei der Schablone beim IT-Logo". Auf der
 * Karte liegt dafür eine leicht erhöhte Innenfläche (`RELIEF_HOEHE` dick,
 * mit eigenen Seitenwänden); Zeichen und Rahmenlinie sind in sie
 * hineingeschnitten, bis hinunter auf die Karte. Der Grund der Schnitte hat
 * eine eigene Farbe (`tief`): dunkler bei Fähigkeiten, leuchtend in der
 * Stufenfarbe bei Unglücken — wie Licht, das durch eine Schablone fällt.
 *
 * Warum die erhöhte Fläche und nicht einfach eine Grube in der Karte: Eine
 * Grube unter der Kartenoberseite läge im Körper und wäre verdeckt. So ist
 * die Innenfläche die Oberseite, und ihre tiefsten Punkte liegen genau auf
 * der Karte.
 */
function reliefNetz(hoehe, grund, tief, mat, wandMat) {
    const b = PLATTE_B - 2 * PLATTE_RUND;
    const h = PLATTE_H - 2 * PLATTE_RUND;
    const geo = new THREE.PlaneGeometry(b, h, 110, 155);
    const pos = geo.attributes.position;
    const farben = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
        /* Das Raster deckt die ganze Karte; das Netz nur die flache Mitte. */
        const u = (pos.getX(i) + PLATTE_B / 2) / PLATTE_B;
        const v = 1 - (pos.getY(i) + PLATTE_H / 2) / PLATTE_H;
        const px = Math.min(RASTER_B - 1, Math.max(0, Math.round(u * (RASTER_B - 1))));
        const py = Math.min(RASTER_H - 1, Math.max(0, Math.round(v * (RASTER_H - 1))));
        const w = Math.min(1, hoehe[py * RASTER_B + px] * 1.35);
        pos.setZ(i, (1 - w) * RELIEF_HOEHE);
        c.copy(grund).lerp(tief, Math.min(1, w * 1.5));
        farben[i * 3] = c.r; farben[i * 3 + 1] = c.g; farben[i * 3 + 2] = c.b;
    }
    geo.setAttribute("color", new THREE.BufferAttribute(farben, 3));
    geo.computeVertexNormals();

    const gruppe = new THREE.Group();
    gruppe.add(new THREE.Mesh(geo, mat));
    /* Die Seitenwände der Innenfläche — sonst schwebte ihr Rand. */
    const dicke = 0.006;
    for (const [bw, hw, x, y] of [[b, dicke, 0, h / 2 - dicke / 2], [b, dicke, 0, -h / 2 + dicke / 2],
        [dicke, h, b / 2 - dicke / 2, 0], [dicke, h, -b / 2 + dicke / 2, 0]]) {
        const wand = new THREE.Mesh(new THREE.BoxGeometry(bw, hw, RELIEF_HOEHE), wandMat);
        wand.position.set(x, y, RELIEF_HOEHE / 2);
        gruppe.add(wand);
    }
    gruppe.position.z = PLATTE_DICKE / 2 + 0.0005;
    return gruppe;
}

function plaettchenRendern(art, hoehe, szene, kamera) {
    const pech = !!FAEHIGKEIT_ZEICHEN.ZEICHEN_PECH[art];
    const stufe = pech ? SCHACH_VARIANTEN.pechStufeVon(art) : SCHACH_VARIANTEN.stufeVon(art);
    const stufeFarbe = farbe(stufe.farbe);

    /* Fähigkeit: Karte in der Stufenfarbe, Schnitte dunkel.
       Unglück: dunkle Karte, Schnitte leuchten in der Stufenfarbe. */
    const koerperFarbe = pech ? farbe("#2a2e36") : stufeFarbe.clone();
    const grund = pech ? farbe("#30343d") : stufeFarbe.clone().lerp(farbe("#ffffff"), 0.1);
    const tief = pech ? stufeFarbe.clone().lerp(farbe("#ffffff"), 0.2)
        : stufeFarbe.clone().lerp(farbe("#0c0e12"), 0.62);

    const koerperMat = new THREE.MeshPhysicalMaterial({
        color: koerperFarbe, roughness: 0.42, clearcoat: 0.7, clearcoatRoughness: 0.18
    });
    const reliefMat = new THREE.MeshPhysicalMaterial({
        vertexColors: true, roughness: 0.4, clearcoat: 0.6, clearcoatRoughness: 0.2
    });
    const wandMat = new THREE.MeshPhysicalMaterial({
        color: grund, roughness: 0.4, clearcoat: 0.6, clearcoatRoughness: 0.2
    });

    const karte = new THREE.Group();
    karte.add(new THREE.Mesh(GEO.plaette, koerperMat));
    const relief = reliefNetz(hoehe, grund, tief, reliefMat, wandMat);
    karte.add(relief);
    karte.rotation.set(-0.3, 0.16, 0);
    szene.add(karte);

    const r = miniRenderer();
    r.setSize(PLAETTCHEN_PX_B, PLAETTCHEN_PX_H, false);
    r.render(szene, kamera);
    const url = r.domElement.toDataURL("image/png");

    szene.remove(karte);
    relief.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
    koerperMat.dispose();
    reliefMat.dispose();
    wandMat.dispose();
    return url;
}

const PLAETTCHEN_PX_B = 220;
const PLAETTCHEN_PX_H = 310;

async function plaettchenBilder() {
    if (typeof FAEHIGKEIT_ZEICHEN === "undefined" || typeof SCHACH_VARIANTEN === "undefined") return;
    const arten = Object.keys(FAEHIGKEIT_ZEICHEN.ZEICHEN)
        .concat(Object.keys(FAEHIGKEIT_ZEICHEN.ZEICHEN_PECH));

    if (!GEO.plaette) {
        GEO.plaette = new RoundedBoxGeometry(PLATTE_B, PLATTE_H, PLATTE_DICKE, 4, PLATTE_RUND);
    }
    const szene = new THREE.Scene();
    miniLicht(szene, 1);

    /* Eine Kamera für alle: frontal, das Plättchen leicht gekippt und
       gedreht; umschlossen werden die Ecken samt Relief, dann aufs
       Kartenverhältnis gebracht. */
    const probe = new THREE.Object3D();
    probe.rotation.set(-0.3, 0.16, 0);
    probe.updateMatrixWorld();
    const punkte = [];
    for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) {
        punkte.push(new THREE.Vector3(x * PLATTE_B / 2, y * PLATTE_H / 2,
            z * (PLATTE_DICKE / 2 + (z > 0 ? RELIEF_HOEHE : 0))).applyMatrix4(probe.matrixWorld));
    }
    const kamera = miniKamera(new THREE.Vector3(0, 0, 1), punkte, 0.03);
    const verh = PLAETTCHEN_PX_B / PLAETTCHEN_PX_H;
    const breite = kamera.right - kamera.left, hoehe = kamera.top - kamera.bottom;
    if (breite / hoehe < verh) {
        const mitte = (kamera.left + kamera.right) / 2;
        kamera.left = mitte - hoehe * verh / 2;
        kamera.right = mitte + hoehe * verh / 2;
    } else {
        const mitte = (kamera.top + kamera.bottom) / 2;
        kamera.top = mitte + breite / verh / 2;
        kamera.bottom = mitte - breite / verh / 2;
    }
    kamera.updateProjectionMatrix();

    for (const art of arten) {
        const hoeheRaster = await reliefRastern(art);
        if (!hoeheRaster) continue;
        FAEHIGKEIT_ZEICHEN.plaettchen[art] = plaettchenRendern(art, hoeheRaster, szene, kamera);
    }

    /* Was schon dasteht, einmal austauschen; alles Neue baut `bauen` so. */
    for (const alt of document.querySelectorAll("svg.faehigkeit-bild[data-art]:not(.faehigkeit-bild-3d)")) {
        const neu = FAEHIGKEIT_ZEICHEN.bauen(alt.getAttribute("data-art"));
        if (neu) alt.replaceWith(neu);
    }
}

/* ------------------------------------------------------------------ *
 * Start
 * ------------------------------------------------------------------ */

/* Das flache Brett wartete verborgen auf uns (`_brett3dAbwarten`, v0.127.0):
   Es wird wieder gezeigt, sobald wir zeichnen oder aufgeben. */
function wartenBeenden() {
    for (const el of document.querySelectorAll(".brett-3d-wartet")) {
        el.classList.remove("brett-3d-wartet");
    }
}

async function starten() {
    if (!webglDa()) {
        window.BRETT_3D_AUS = true;
        wartenBeenden();
        return;
    }
    try {
        aufbauen();
        const [, schrift] = await Promise.all([
            formenLaden(),
            new Promise((fertig) => new FontLoader().load(SCHRIFT_PFAD, fertig, undefined, () => fertig(null)))
        ]);
        Z.schrift = schrift;
        Z.bereit = true;
        kachelFormen();
        /*
         * ERST DAS BRETT, DANN DER REST (seit v0.133.0). Bis v0.132.0
         * rechnete das Modul zuerst die zwölf Figurenbilder und alle
         * kleinen Bretter — am Handy sah man so lange das flache Brett.
         * Jetzt steht das grosse Brett sofort; die Bilder folgen danach,
         * jedes in einem eigenen Takt, damit nichts hängt.
         */
        const letzte = (typeof TEAM_SCHACH !== "undefined") ? TEAM_SCHACH._brett3dLetzte : null;
        if (letzte) anbinden(letzte.halter, letzte.partie, letzte.person, false);
        wartenBeenden();
        plaettchenBilder().catch((fehler) => console.error("Plättchen nicht möglich:", fehler));
        const spaeter = (arbeit) => new Promise((fertig) => setTimeout(() => {
            try { arbeit(); } catch (fehler) { console.error("3D-Bild nicht möglich:", fehler); }
            fertig();
        }, 20));
        await spaeter(figurenBilder);
        const wartend = MINI.warte.splice(0);
        for (const el of wartend) {
            await spaeter(() => { if (el.isConnected) standbild(el); });
        }
    } catch (fehler) {
        Z.fehler = true;
        window.BRETT_3D_AUS = true;
        wartenBeenden();
        console.error("3D-Brett nicht verfügbar:", fehler);
    }
}

window.BRETT_3D = {
    anbinden(halter, partie, person) {
        anbinden(halter, partie, person, true);
    },
    aktiv() {
        return Z.bereit && Z.einst && Z.einst.an;
    },
    /* Formen noch unterwegs? Dann verbirgt der Bildschirm das flache Brett. */
    laedt() {
        return !Z.bereit && !Z.fehler;
    },
    /* Kleine Bretter (`.vorschau`) als 3D-Standbild. */
    standbild,
    /* Die Anleitung als abgespielte 3D-Bühne (seit v0.135.0). */
    buehneMoeglich,
    buehne,
    /* Werkstatt: Zusammenstösse in jeder Animation — `true` misst ab
       jetzt, `false` hört auf, ohne Wert kommt die Liste. */
    kollisionen(an) {
        if (an === true) Z.stoesse = [];
        else if (an === false) Z.stoesse = null;
        return Z.stoesse ? Z.stoesse.slice() : null;
    },
    /* Werkstatt: Verdeckt im Ruhebild eine Figur die auf dem Nachbarfeld? */
    ueberdeckungen,
    /* Für die Werkstatt und Bildschirmbilder. */
    _zustand: Z
};

starten();
