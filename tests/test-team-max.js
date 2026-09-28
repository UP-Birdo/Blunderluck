/*
 * test-team-max.js — höchstens 3 Spieler je Team (seit v0.155.2, Nutzer
 * 28.09.2026: „dann begrenze die Anzahl je Team bei Blunderluck auf 3
 * Spieler").
 *
 * Geprüft: das Modell (`SCHACH_RUNDE.teamBeitreten` nimmt in ein volles Team
 * niemanden mehr auf — Mensch, Nachzügler, Bot; wer drin sitzt, bleibt; alte
 * Partien mit mehr Spielern laufen weiter), die Zulosung, und der Bildschirm
 * (volles Team nicht wählbar, Zufall nie ins volle, Marke „voll · 3/3").
 *
 * Aufruf: siehe tests\README.md
 */

const { TEAM_SCHACH, SCHACH_RUNDE, SCHACH_BOT, SCHACH_TAFEL } = require("./bildschirm-umgebung.js");

let anzahlOk = 0;
let anzahlFehler = 0;

function pruefe(bezeichnung, funktion) {
    try {
        funktion();
        anzahlOk++;
    } catch (fehler) {
        anzahlFehler++;
        console.error("FEHLER: " + bezeichnung);
        console.error("        " + fehler.message);
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

/* Alle Elemente mit dieser Klasse. */
function mitKlasse(element, klasse, treffer) {
    const liste = treffer || [];
    for (const kind of (element && element.kinder) || []) {
        if (String(kind.className || "").split(" ").indexOf(klasse) !== -1) {
            liste.push(kind);
        }
        mitKlasse(kind, klasse, liste);
    }
    return liste;
}

function rundeMit(weiss, schwarz) {
    let r = SCHACH_RUNDE.leereRunde(1000, "standard", "p-max3", "Drei");
    for (const id of weiss) {
        r = SCHACH_RUNDE.teamBeitreten(r, id, "weiss", 1000);
    }
    for (const id of schwarz) {
        r = SCHACH_RUNDE.teamBeitreten(r, id, "schwarz", 1000);
    }
    return r;
}

pruefe("Modell: der Vierte kommt nicht ins volle Team", () => {
    gleich(SCHACH_RUNDE.TEAM_MAX, 3, "drei");
    const r = rundeMit(["a", "b", "c"], ["d"]);
    wahr(SCHACH_RUNDE.teamVoll(r, "weiss") && !SCHACH_RUNDE.teamVoll(r, "schwarz"), "voll erkannt");
    gleich(SCHACH_RUNDE.teamVon(SCHACH_RUNDE.teamBeitreten(r, "e", "weiss", 2000), "e"), "", "abgewiesen");
    gleich(SCHACH_RUNDE.teamVon(SCHACH_RUNDE.teamBeitreten(r, "e", "schwarz", 2000), "e"), "schwarz",
        "auf der anderen Seite geht es");
    gleich(SCHACH_RUNDE.teamBeitreten(r, "a", "weiss", 2000).teams.weiss.slice().sort(), ["a", "b", "c"],
        "wer drin sitzt, bleibt");
    const mitBot = SCHACH_BOT.inRundeSetzen(r, "weiss", 2000);
    wahr(mitBot.teams.weiss.indexOf(SCHACH_BOT.KENNUNG) === -1, "auch kein Bot ins volle Team");
});

pruefe("Modell: alte Partie mit mehr Spielern läuft weiter", () => {
    const alt = SCHACH_RUNDE.normalisieren({ teams: { weiss: ["a", "b", "c", "d"], schwarz: ["e"] } });
    gleich(alt.teams.weiss.length, 4, "bleibt beim Laden");
    gleich(SCHACH_RUNDE.teamVerlassen(alt, "d", 3000).teams.weiss, ["a", "b", "c"], "verlassen geht");
});

pruefe("Bildschirm: volles Team nicht wählbar, markiert, Zufall nie hinein", () => {
    const r = rundeMit(["a", "b", "c"], ["d"]);
    const wahl = TEAM_SCHACH._beitrittsWahlErmitteln(r, { id: "id-anna" });
    gleich(wahl.farben, ["schwarz"], "nur die freie Seite");
    gleich(wahl.zufall, false, "kein Zufall-Knopf mit vollem Team");
    const platz = TEAM_SCHACH._vorraumPlatzBauen(r, { id: "id-anna" }, "weiss", false);
    const marke = mitKlasse(platz, "chip-voll")[0];
    wahr(marke && marke.textContent === "voll · 3/3", "Marke voll");
    wahr(mitKlasse(TEAM_SCHACH._vorraumPlatzBauen(r, { id: "id-anna" }, "schwarz", true), "chip-voll").length === 0,
        "freie Seite ohne Marke");
    const voll = rundeMit(["a", "b", "c"], ["d", "e", "f"]);
    gleich(TEAM_SCHACH._beitrittsWahlErmitteln(voll, { id: "id-anna" }).farben, [], "beide voll: nichts wählbar");
    let getippt = null;
    const vorher = TEAM_SCHACH.teamBeitreten;
    TEAM_SCHACH.teamBeitreten = (partie, farbe) => { getippt = farbe; };
    try {
        TEAM_SCHACH.zufaelligBeitreten(r);
        gleich(getippt, "schwarz", "Zufall in die freie Seite");
        getippt = null;
        TEAM_SCHACH.zufaelligBeitreten(voll);
        gleich(getippt, null, "beide voll: kein Beitritt");
    } finally {
        TEAM_SCHACH.teamBeitreten = vorher;
    }
});

pruefe("Zulosung und Tafel halten sich an die Grenze", () => {
    const r = Object.assign(rundeMit(["a", "b", "c"], []), {});
    r.regeln.seiteZufaellig = true;
    gleich(SCHACH_RUNDE.teamVon(SCHACH_RUNDE.seiteZulosen(r, "x", 4000), "x"), "schwarz", "in die leere Seite");
    wahr(typeof SCHACH_TAFEL.partie === "function", "Tafel geladen");
});

console.log(anzahlOk + " ok, " + anzahlFehler + " Fehler");
process.exit(anzahlFehler === 0 ? 0 : 1);
