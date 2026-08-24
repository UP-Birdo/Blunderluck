/*
 * schach-bot.js — der Computer-Gegner (seit v0.27.0, Stufe 1).
 *
 * Er ist ein ganz gewöhnliches Team-Mitglied: eine feste Spieler-Kennung
 * ("bot") in `teams.schwarz`. Alles, was ein Mensch darf, darf er auch —
 * und nichts darüber hinaus. Deshalb steht hier KEINE einzige Schachregel:
 * Die möglichen Züge liefert `SCHACH.alleZuege`, ausgeführt wird über
 * `SCHACH_RUNDE.ziehen`, gesendet über `TEAM_SCHACH._sendenMitPruefung`.
 * Diese Datei entscheidet nur, WELCHEN der angebotenen Züge er nimmt.
 *
 * DREI FESTLEGUNGEN, DIE MAN KENNEN MUSS:
 *
 *   1. KEIN `Math.random()` (eiserne Regel). Die Wahl wird aus Partie-Kennung
 *      und Zugzähler GERECHNET (`SCHACH_RUNDE._zufallsWert`). Jedes Gerät
 *      käme damit auf denselben Zug — und die Tests können nachrechnen, was
 *      der Bot tun wird.
 *
 *   2. DER BOT SPICKT NICHT. Er liest von einer liegenden Lootbox nur, DASS
 *      sie daliegt (`eintrag.feld`) — nie `art`, `stufe` oder `pech`. Der
 *      Stand steht offen in der Datenbank, technisch käme er heran; genau
 *      deshalb steht die Regel hier. Wer die Bewertung erweitert, hält sich
 *      daran, sonst gewinnt der Computer mit Wissen, das kein Mensch hat.
 *
 *   3. GERECHNET WIRD AUF DEM GERÄT DES MENSCHEN (siehe
 *      `TEAM_SCHACH._botAnstossen`). Die Partie liegt gemeinsam in Firebase;
 *      würden zwei Geräte gleichzeitig für den Bot ziehen, fängt das die
 *      Zugzähler-Prüfung ab — aber gar nicht erst hinzukommen ist billiger.
 *
 * STUFE 1 SCHAUT NICHT VORAUS. Er nimmt den Zug, der SOFORT am meisten
 * einbringt: schlagen vor einsammeln vor ziehen. Was der Gegner darauf
 * antwortet, interessiert ihn nicht — er stellt seine Dame also durchaus
 * ein. Das ist bewusst so; Stufe 2 steht in docs\entwurf-bot.md.
 */

const SCHACH_BOT = {

    /*
     * Die Spieler-Kennung des Computers. Sie steht in `teams.schwarz` wie
     * jede andere Kennung — und in KEINER Spielerliste: Der Bot hat kein
     * Konto, kein Passwort und keinen Eintrag unter `spieler`. Deshalb
     * taucht er in der Rangliste und in der Freundesliste von selbst nicht
     * auf; beide bauen ihre Zeilen aus der Spielerliste.
     */
    KENNUNG: "bot",

    /* Sein Anzeigename an der Team-Karte und im Verlauf. */
    NAME: "Computer",

    /*
     * Wie lange er nachdenkt, bevor sein Zug erscheint (Millisekunden).
     * Ohne die Pause stünde der Gegenzug im selben Augenblick auf dem Brett
     * wie der eigene, und man sähe nicht, was passiert ist.
     */
    BEDENKZEIT_MS: 700,

    /* ---------------------------------------------------------------- *
     * Die Bewertung eines Zuges
     *
     * Die Zahlen sind Gewichte, keine Punkte des Spiels — sie stehen zu
     * NICHTS ausser zueinander in Beziehung. Massgeblich ist ihr Abstand:
     * Ein geschlagener Bauer (100) wiegt schwerer als vier Lootboxen (vier
     * mal 20), eine Umwandlung zur Dame (acht mal 12) schwerer als ein
     * geschlagener Springer.
     * ---------------------------------------------------------------- */

    /* Je Punkt Figurenwert der geschlagenen Figur (Bauer 1 bis Dame 9). */
    PUNKTE_JE_BEUTEWERT: 100,

    /* Je Lootbox, die auf dem Weg liegt und damit eingesammelt wird. */
    PUNKTE_LOOTBOX: 20,

    /* Je Punkt Wertgewinn einer Umwandlung (Bauer 1 wird Dame 9 = 8 Punkte). */
    PUNKTE_JE_UMWANDLUNG: 12,

    /* ---------------------------------------------------------------- *
     * Wer ist der Bot?
     * ---------------------------------------------------------------- */

    istBot(spielerId) {
        return spielerId === SCHACH_BOT.KENNUNG;
    },

    /*
     * Spielt in dieser Runde ein Computer mit?
     *
     * GELESEN WIRD DIREKT, OHNE `normalisieren` — mit Absicht: Die Frage
     * wird auch an CHRONIK-Einträge gestellt (Rangliste), und die tragen
     * ihre Teams genauso, aber keinen Spielstand. Sie durch das ganze
     * Normalisieren zu schicken hiesse, für jede beendete Partie ein Brett
     * aufzubauen — alle drei Sekunden, bei jedem Zeichnen der Rangliste.
     */
    istBotPartie(runde) {
        return SCHACH_BOT._teams(runde).some(
            (mannschaft) => mannschaft.some((id) => SCHACH_BOT.istBot(id)));
    },

    /*
     * Steht in beiden Teams NIEMAND ausser dem Computer?
     *
     * Gebraucht beim Verlassen einer Runde: Ein Bot allein hält keine Runde
     * am Leben — sonst bliebe für jede Partie gegen den Computer eine
     * verwaiste Runde im gemeinsamen Stand stehen. Zwei leere Teams zählen
     * ebenfalls als „nur noch Bot": Auch dort ist kein Mensch mehr.
     */
    nurNochBot(runde) {
        return SCHACH_BOT._teams(runde).every(
            (mannschaft) => mannschaft.every((id) => SCHACH_BOT.istBot(id)));
    },

    /* Beide Mannschaften als Listen — auch bei halbem oder fehlendem Stand. */
    _teams(runde) {
        const teams = (runde && runde.teams) ? runde.teams : {};

        return ["weiss", "schwarz"].map((farbe) =>
            Array.isArray(teams[farbe]) ? teams[farbe] : []);
    },

    /*
     * Den Computer in eine Runde setzen und seine Seite sofort bereit
     * melden. Er wartet auf nichts — angepfiffen wird, sobald der Mensch
     * bereit ist (`SCHACH_RUNDE.kannStarten` verlangt beide Seiten).
     */
    inRundeSetzen(runde, farbe, zeitpunkt) {
        const mitBot = SCHACH_RUNDE.teamBeitreten(
            runde, SCHACH_BOT.KENNUNG, farbe, zeitpunkt);

        return SCHACH_RUNDE.bereitSetzen(mitBot, farbe, true, zeitpunkt);
    },

    /* ---------------------------------------------------------------- *
     * Der Zug
     * ---------------------------------------------------------------- */

    /*
     * Ist der Computer gerade am Zug — und darf er auch ziehen?
     *
     * Gefragt wird das Modell, nicht die Farbe: Der Bot ist ein Team-Mitglied
     * wie jedes andere, und `darfZiehen` kennt schon alle Gründe, aus denen
     * gerade niemand ziehen darf (Partie nicht angepfiffen, Ergebnis steht
     * fest, anderes Team am Zug).
     */
    istAmZug(runde) {
        return SCHACH_RUNDE.darfZiehen(runde, SCHACH_BOT.KENNUNG);
    },

    /*
     * Welchen Zug macht der Computer? Liefert { von, nach, umwandlung }
     * oder null, wenn er nicht am Zug ist oder gar nicht ziehen kann.
     *
     * Reine Rechnung ohne Nebenwirkung — deshalb testbar und deshalb auch
     * gefahrlos zweimal aufrufbar.
     */
    zugWaehlen(runde) {
        const stand = SCHACH_RUNDE.normalisieren(runde);

        if (!SCHACH_BOT.istAmZug(stand)) {
            return null;
        }

        const zuege = SCHACH.alleZuege(stand.stand);
        if (zuege.length === 0) {
            return null;
        }

        /*
         * Die Lootbox-Felder EINMAL vorab einsammeln, nicht je Zug erneut:
         * Auf dem vollen Kreuzbrett liegen schnell dreissig Boxen, und
         * daneben stehen sechzig mögliche Züge.
         *
         * NUR DIE FELDNUMMER (siehe Kopf, Festlegung 2) — was in der Box
         * steckt, geht den Bot nichts an.
         */
        const boxFelder = stand.bonus.map((eintrag) => eintrag.feld);

        let beste = [];
        let bestwert = -Infinity;

        for (const zug of zuege) {
            const wert = SCHACH_BOT._bewerten(stand.stand, zug, boxFelder);

            if (wert > bestwert) {
                bestwert = wert;
                beste = [zug];
            } else if (wert === bestwert) {
                beste.push(zug);
            }
        }

        /*
         * Unter den gleich guten wird GERECHNET gewählt, nicht gewürfelt
         * (eiserne Regel). EIN Wert je Zug reicht dafür — eine Reihe von
         * Saaten wie `…|1`, `…|2`, `…|3` liefert dagegen fast denselben
         * Wert (erkenntnisse.md, v0.49.1).
         *
         * DER ZUGZÄHLER STEHT VORNE, weil er sich von Zug zu Zug ändert;
         * dieselbe Regel wie bei `_armeeSaat`.
         */
        const wahl = SCHACH_RUNDE._zufallsWert(
            stand.zugZaehler + "|bot|" + (stand.id || "partie"));

        const zug = beste[Math.min(beste.length - 1,
            Math.floor(wahl * beste.length))];

        return {
            von: zug.von,
            nach: zug.nach,

            /*
             * Nur ein Bauer auf der letzten Reihe hat überhaupt mehrere
             * Einträge auf dasselbe Zielfeld; bei allen anderen Zügen
             * greift `SCHACH.ziehen` den einzigen passenden, und die
             * Angabe zählt gar nicht.
             */
            umwandlung: zug.umwandlung || "D"
        };
    },

    /*
     * Der fertige Zug als neue Runde — oder null, wenn nichts geht.
     * Das ist die Schnittstelle, die der Bildschirm ruft; er stellt danach
     * nur noch zu (`TEAM_SCHACH._sendenMitPruefung`).
     */
    ziehen(runde, zeitpunkt) {
        const wahl = SCHACH_BOT.zugWaehlen(runde);
        if (!wahl) {
            return null;
        }

        return SCHACH_RUNDE.ziehen(runde, SCHACH_BOT.KENNUNG,
            wahl.von, wahl.nach, wahl.umwandlung, SCHACH_BOT.NAME, zeitpunkt);
    },

    /* ---------------------------------------------------------------- *
     * Innereien
     * ---------------------------------------------------------------- */

    /*
     * Was bringt dieser Zug SOFORT ein? Höher ist besser; 0 ist ein Zug,
     * der nichts einbringt — der Normalfall.
     *
     * Bewusst NICHT enthalten, weil Stufe 1 nicht vorausschaut: ob das
     * Zielfeld angegriffen ist, ob der Zug Schach gibt, ob die eigene Figur
     * danach frei steht. Das ist Stufe 2 (docs\entwurf-bot.md).
     */
    _bewerten(stand, zug, boxFelder) {
        let punkte = 0;

        /*
         * 1. Schlagen — der mit Abstand grösste Posten.
         *
         * Was auf dem Zielfeld steht, wird VOR dem Zug abgelesen; beim
         * en passant steht dort nichts, es fällt trotzdem ein Bauer.
         */
        const beute = SCHACH.artVon(SCHACH.figurAuf(stand, zug.nach));

        if (beute) {
            punkte += SCHACH_BOT.PUNKTE_JE_BEUTEWERT
                * (SCHACH_RUNDE.FIGUR_WERT[beute] || 0);
        } else if (zug.enPassant) {
            punkte += SCHACH_BOT.PUNKTE_JE_BEUTEWERT * SCHACH_RUNDE.FIGUR_WERT.B;
        }

        /*
         * 2. Lootboxen — sie werden auf dem GANZEN WEG eingesammelt, nicht
         * nur auf dem Zielfeld (`SCHACH_RUNDE._bonusEinsammeln`). Ein Turm,
         * der über drei Boxen fährt, holt drei.
         *
         * Das Startfeld zählt nicht mit: Dort stand die Figur schon, eine
         * Box läge da nicht mehr.
         */
        if (boxFelder.length > 0) {
            const weg = SCHACH.wegFelder(stand, zug.von, zug.nach, !!zug.ohneWeg);

            for (const feld of weg) {
                if (feld !== zug.von && boxFelder.indexOf(feld) !== -1) {
                    punkte += SCHACH_BOT.PUNKTE_LOOTBOX;
                }
            }
        }

        /* 3. Umwandlung — gezählt wird der GEWINN, nicht der Endwert. */
        if (zug.umwandlung) {
            const gewinn = (SCHACH_RUNDE.FIGUR_WERT[zug.umwandlung] || 0)
                - SCHACH_RUNDE.FIGUR_WERT.B;

            punkte += SCHACH_BOT.PUNKTE_JE_UMWANDLUNG * Math.max(0, gewinn);
        }

        return punkte;
    }
};

/* Für die Tests ausserhalb des Browsers. SCHACH und SCHACH_RUNDE müssen dort
   vorher als globale Grössen bereitstehen. */
if (typeof module !== "undefined" && module.exports) {
    module.exports = SCHACH_BOT;
}
