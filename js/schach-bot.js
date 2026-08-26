/*
 * schach-bot.js — der Computer-Gegner (seit v0.27.0, vier Stufen seit v0.28.0).
 *
 * Er ist ein ganz gewöhnliches Team-Mitglied: eine feste Spieler-Kennung
 * ("bot") in `teams.schwarz`. Alles, was ein Mensch darf, darf er auch —
 * und nichts darüber hinaus. Deshalb steht hier KEINE einzige Schachregel:
 * Die möglichen Züge liefert `SCHACH.alleZuege`, den Zug rechnet
 * `SCHACH._ausfuehren`, ausgeführt wird über `SCHACH_RUNDE.ziehen`, gesendet
 * über `TEAM_SCHACH._sendenMitPruefung`. Diese Datei entscheidet nur, WELCHEN
 * der angebotenen Züge er nimmt.
 *
 * ------------------------------------------------------------------
 * WIE DER BOT DENKT — das Verfahren in vier Begriffen
 *
 * Es ist das übliche Verfahren jeder Schach-Engine, in der kleinsten Form,
 * die hier tragfähig ist (Quellen: chessprogramming.org/Alpha-Beta und die
 * Schritt-für-Schritt-Anleitung von freeCodeCamp; nachgemessen wurde alles
 * am ECHTEN Modell dieses Projekts, siehe „Was gemessen wurde" unten).
 *
 *   1. BEWERTUNG (`_bewerten`). Eine Stellung wird zu EINER Zahl: Wie viel
 *      Material steht für mich auf dem Brett, wie viel für den Gegner?
 *      Positiv heisst gut für die Seite, die am Zug ist.
 *
 *   2. NEGAMAX (`_suchen`). Statt nur die eigenen Züge zu bewerten, spielt
 *      der Bot sie im Kopf durch und fragt: Was macht der Gegner DANN? Und
 *      was mache ich darauf? Weil beide Seiten dasselbe wollen, genügt EINE
 *      Funktion, die abwechselnd das Vorzeichen dreht — daher der Name.
 *      Wie tief er schaut, ist der eigentliche Schwierigkeitsgrad.
 *
 *   3. ALPHA-BETA. Der Trick, der das bezahlbar macht: Sobald ein Zug für
 *      den Gegner schon schlecht genug ist, muss man gar nicht mehr wissen,
 *      WIE schlecht — er wird ihn ohnehin nicht zulassen. Der ganze Ast
 *      fällt weg. **Am Ergebnis ändert das nichts**, nur an der Rechenzeit.
 *
 *   4. ZUGSORTIERUNG (`_sortieren`). Alpha-Beta schneidet nur dann viel weg,
 *      wenn der beste Zug zuerst dran ist. Deshalb werden Schlagzüge nach
 *      Beutewert vorsortiert. Das ist keine Feinheit, sondern der Unterschied
 *      zwischen spielbar und unbenutzbar: Auf dem grossen Kreuzbrett hat die
 *      Sortierung Tiefe 4 von 99 Sekunden auf 6,6 Sekunden gebracht.
 *
 * Dazu bei der höchsten Stufe:
 *
 *   5. RUHESUCHE (`_ruhesuche`). Wer mitten im Abtausch aufhört zu rechnen,
 *      sieht seinen eigenen Schlagzug, aber nicht den Rückschlag — und
 *      schlägt fröhlich mit der Dame einen gedeckten Bauern. Am Ende der
 *      Suche werden deshalb NUR NOCH SCHLAGZÜGE weiterverfolgt, bis es
 *      ruhig ist.
 *
 *   6. STELLUNGSBEWERTUNG. Nicht nur WAS steht, sondern WO: Ein Springer in
 *      der Mitte ist mehr wert als einer am Rand. Die üblichen
 *      Feldertabellen (piece-square tables) sind auf 8x8 zugeschnitten und
 *      hier deshalb nicht brauchbar — die Bretter reichen von 8x8 bis zum
 *      Kreuz mit 196 Feldern. An ihrer Stelle steht ein Mass, das auf JEDER
 *      Brettform funktioniert: der Abstand zur Brettmitte (`_mitteWert`).
 *
 *   7. ITERATIVE VERTIEFUNG (`zugWaehlen`). Gerechnet wird erst Tiefe 1,
 *      dann 2, dann 3 — nicht gleich die Zieltiefe. Das klingt nach
 *      Verschwendung, ist aber die Bedingung dafür, dass das Budget unten
 *      überhaupt sicher ist: Eine Tiefe wird GANZ gerechnet oder gar nicht,
 *      und es gilt das Ergebnis der letzten vollständigen. Ein
 *      abgebrochener Durchgang wäre schlimmer als keiner (siehe dort).
 *
 * ------------------------------------------------------------------
 * WAS GEMESSEN WURDE (24.08.2026, echtes Modell, Wegwerf-Skripte)
 *
 * Nichts an den Stufen ist geraten. Gemessen wurde am echten Modell, und
 * zwei Entwürfe sind dabei durchgefallen.
 *
 * ZEIT JE ZUG (Bürorechner, Mittelspiel; ein Handy ist ein Mehrfaches
 * langsamer — Mittel/Höchstwert in Millisekunden):
 *
 *              Standard    Doppelbrett   Kreuz gross
 *   Leicht        2/3           2/2           3/5
 *   Mittel        7/9          27/44         52/74
 *   Schwer       36/77        453/1149      364/668
 *   Meister     213/520       829/1441      627/900
 *
 * SPIELSTÄRKE (je 16 Partien, acht Stellungen in beiden Farben):
 *
 *   Mittel gegen Leicht    16:0
 *   Schwer gegen Mittel    14:1
 *   Meister gegen Schwer   14:2
 *
 * ZWEI ENTWÜRFE, DIE GEMESSEN UND VERWORFEN WURDEN:
 *
 *   - **Tiefe 4 für die höchste Stufe.** Erreichbar ist sie (mit iterativer
 *     Vertiefung und Budget), aber sie ist NICHT besser: gegen Tiefe 3 mit
 *     Ruhesuche stand es 3:5 bei acht Remis — und sie kostete 28 Prozent
 *     mehr Rechenzeit. Auf einem Handy ist das der Ausschlag.
 *   - **Ein gemeinsames Budget für Haupt- und Ruhesuche.** Die Ruhesuche
 *     ist gierig und war zuerst dran; sie ass der Hauptsuche die Tiefe weg,
 *     und „Meister" spielte dadurch SCHWÄCHER als „Schwer" (6:7). Seither
 *     zwei getrennte Töpfe.
 *
 * Der teuerste Posten ist überall die Zugerzeugung: `SCHACH.alleZuege`
 * prüft jeden Zug voll auf Legalität (Zug ausführen, Schach prüfen) und
 * kennt dazu Risse, Mauern, Fesseln und Kreuzbretter. Alles läuft im selben
 * Faden wie die Anzeige — eine Sekunde Rechnen ist eine Sekunde, in der die
 * App steht. Genau dagegen stehen Budget und iterative Vertiefung.
 *
 * ------------------------------------------------------------------
 * DREI FESTLEGUNGEN, DIE MAN KENNEN MUSS
 *
 *   1. KEIN `Math.random()` (eiserne Regel). Unter gleich guten Zügen wird
 *      aus Partie-Kennung und Zugzähler GERECHNET
 *      (`SCHACH_RUNDE._zufallsWert`). Jedes Gerät käme damit auf denselben
 *      Zug — und die Tests können nachrechnen, was der Bot tun wird.
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
 * WAS DIE SUCHE NICHT SIEHT: Lootboxen und Fähigkeiten. Sie rechnet mit
 * `SCHACH._ausfuehren`, und das ist der reine Zug — das Einsammeln steckt in
 * `SCHACH_RUNDE.ziehen`. Der Lootbox-Anreiz wird deshalb NUR an der Wurzel
 * draufgerechnet (`_wurzelZugabe`), also für den Zug, der wirklich gemacht
 * wird. Eigene Fähigkeiten setzt der Bot bis heute gar nicht ein; sie liegen
 * ungenutzt in seinem Vorrat (docs\entwurf-bot.md, Stufe 3).
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

    /*
     * Sein Anzeigename an der Team-Karte und im Verlauf.
     *
     * „Bob der Bot" seit v0.76.0 (Nutzer-Ansage 26.08.2026, vorher
     * „Computer"). Der Name gehört zur Zielgruppe ab sechs Jahren aus
     * `docs\VISION.md`: Ein Gegner mit Namen ist ein Mitspieler, „der
     * Computer" ist ein Gerät.
     *
     * ER STEHT NUR HIER. Wer ihn ändert, ändert ihn an dieser einen Zeile —
     * die Team-Karte und der Zugverlauf holen ihn über
     * `TEAM_SCHACH._nameVon`, und ein Test in `test-schach-bot.js` wacht
     * darüber. Die Spielart heisst weiterhin „Gegen den Computer": Dort ist
     * die Spielweise gemeint, nicht der Mitspieler.
     */
    NAME: "Bob der Bot",

    /*
     * Wie lange er nachdenkt, bevor sein Zug erscheint (Millisekunden).
     * Ohne die Pause stünde der Gegenzug im selben Augenblick auf dem Brett
     * wie der eigene, und man sähe nicht, was passiert ist.
     *
     * ES IST EINE MINDESTPAUSE, KEINE HÖCHSTZEIT: Rechnet die höchste Stufe
     * länger, dauert es eben länger.
     *
     * 1000 STATT 700 SEIT v0.77.0 (Nutzer-Ansage 26.08.2026: „Bots können
     * sogar ein wenig langsamer sein").
     *
     * WARUM DIESE ZAHL ETWAS BEWIRKT, und das ist nicht selbstverständlich:
     * Am 24.08.2026 wurde auf dem Bürorechner gemessen, dass der schlechteste
     * Zug 514 ms RECHNET. Die Pause ist damit fast immer die bestimmende
     * Grösse — der Zug erscheint also verlässlich nach einer Sekunde, nicht
     * mal nach 0,7 und mal nach 1,2. Wäre das Rechnen der Engpass, hätte
     * das Erhöhen hier gar nichts geändert.
     *
     * AM HANDY KANN DAS ANDERS SEIN: Ist es doppelt so langsam, rechnet der
     * schlechteste Fall rund 1030 ms und läuft der Pause davon. Genau das
     * steht als offene Messung in der `STATUS.md`.
     */
    BEDENKZEIT_MS: 1000,

    /* ---------------------------------------------------------------- *
     * DIE VIER SCHWIERIGKEITSSTUFEN (seit v0.28.0)
     *
     * Sie unterscheiden sich in genau drei Zahlen, und jede davon ist
     * gemessen (siehe Kopf). Reihenfolge ist die Reihenfolge am Bildschirm.
     *
     *   tiefe        Wie viele Halbzüge weit er rechnet. 1 = er sieht nur
     *                den eigenen Zug (und verschenkt darum Figuren).
     *   ruhe         Wie viele Halbzüge die Ruhesuche noch dranhängt,
     *                solange geschlagen wird. 0 = keine Ruhesuche.
     *   positionell  Zählt die Lage der Figuren mit, nicht nur ihr Wert.
     *
     * Dazu zwei Obergrenzen, `budget` und `ruheBudget`. Sie sind die
     * NOTBREMSE für die grossen Bretter — ohne sie rechnet die höchste Stufe
     * auf dem Kreuz mit 196 Feldern sekundenlang, und die App steht so lange
     * still. Ist eine Grenze erreicht, hört die betroffene Suche auf, tiefer
     * zu gehen, und bewertet die Stellung, wie sie ist: Das Ergebnis ist dann
     * schwächer, aber immer gültig und immer da.
     *
     * GEZÄHLT WIRD IN ANGESEHENEN FELDERN, nicht in Stellungen. Jede
     * betrachtete Stellung kostet so viel, wie das Brett Felder hat — denn
     * genau das tun `_bewerten` und `SCHACH.alleZuege`: Sie gehen das Brett
     * ab. Eine Stellung auf dem Kreuz (196 Felder) kostet damit von selbst
     * das Dreifache einer auf dem Standardbrett, und EINE Zahl passt für
     * alle Brettformen. Mit „Stellungen" als Einheit bräuchte es dafür eine
     * Umrechnung, die nie ganz stimmt.
     *
     * ZWEI GETRENNTE TÖPFE, und das ist der Kern: Bis zur ersten Messung
     * teilten sich Haupt- und Ruhesuche EIN Budget. Die Ruhesuche ist gierig
     * und war zuerst dran — sie ass der Hauptsuche die Tiefe weg, und
     * „Meister" spielte dadurch SCHWÄCHER als „Schwer" (nachgemessen im
     * Duell: 20 Figurenwerte Rückstand). Getrennte Töpfe können das nicht.
     * ---------------------------------------------------------------- */

    STUFEN: [
        {
            id: "leicht",
            titel: "Leicht",
            hinweis: "Er schaut nur auf den eigenen Zug: Er schlägt, was er "
                + "kriegen kann, und sammelt Lootboxen ein. Dass du "
                + "zurückschlagen könntest, sieht er nicht — er verschenkt "
                + "Figuren. Zum Ausprobieren und für den Anfang.",
            tiefe: 1,
            ruhe: 0,
            positionell: false,
            budget: 0,
            ruheBudget: 0
        },
        {
            id: "mittel",
            titel: "Mittel",
            hinweis: "Er rechnet deine Antwort mit. Geschenke gibt es damit "
                + "keine mehr: Was du im nächsten Zug zurückholen könntest, "
                + "lässt er stehen. Ein ordentlicher Gegner für zwischendurch.",
            tiefe: 2,
            ruhe: 0,
            positionell: false,
            budget: 800000,
            ruheBudget: 0
        },
        {
            id: "schwer",
            titel: "Schwer",
            hinweis: "Drei Halbzüge weit — er sieht kurze Kombinationen "
                + "kommen und stellt dir selbst welche. Wer nicht aufpasst, "
                + "verliert hier Material.",
            tiefe: 3,
            ruhe: 0,
            positionell: false,
            budget: 3000000,
            ruheBudget: 0
        },
        {
            id: "meister",
            titel: "Meister",
            hinweis: "Wie Schwer, dazu zwei Dinge: Er rechnet einen Abtausch "
                + "zu Ende, statt mitten darin aufzuhören — ein gedeckter "
                + "Bauer lockt ihn also nicht —, und er achtet auf die "
                + "Stellung seiner Figuren, nicht nur auf ihre Zahl. Er "
                + "braucht dafür spürbar länger.",
            tiefe: 3,
            ruhe: 2,
            positionell: true,
            budget: 1500000,
            ruheBudget: 1500000
        }
    ],

    /*
     * Die Stufe einer NEUEN Runde. „Mittel", weil „Leicht" seine Figuren
     * verschenkt — als erster Eindruck vom Computer wäre das der falsche.
     */
    STUFE_VORGABE: "mittel",

    /*
     * ZWEI VORGABEN, UND DAS IST ABSICHT.
     *
     * Eine Runde OHNE Angabe stammt aus v0.27.0, wo es nur eine Spielstärke
     * gab: „nur der eigene Zug zählt" — das ist heute „Leicht". Sie muss
     * weiterspielen wie bisher (eiserne Regel: „Laufende Partien müssen
     * laufen bleiben"), deshalb ist die Vorgabe für den Altbestand eine
     * andere als die für neue Runden.
     *
     * Feinheit: Ganz deckungsgleich mit v0.27.0 ist „Leicht" nicht — dort
     * war der Zugwert eine eigene Punktetabelle, heute ist es das Material
     * auf dem Brett. Beides sieht genau einen Halbzug weit; was sich ändert,
     * ist die Gewichtung (eine Umwandlung zur Dame wiegt jetzt richtig
     * schwer). Die RUNDE bricht davon nicht, nur der Geschmack des Zuges.
     */
    STUFE_ALTBESTAND: "leicht",

    /* Gibt es diese Stufe? Gebraucht beim Anlegen, wo Unbekanntes zur
       Vorgabe für NEUE Runden werden muss und nicht zum Altbestand. */
    gibtEsStufe(id) {
        return SCHACH_BOT.STUFEN.some((stufe) => stufe.id === id);
    },

    /* Die Stufe zu einer Kennung; alles Unbekannte wird zum Altbestand. */
    stufe(id) {
        return SCHACH_BOT.STUFEN.find((stufe) => stufe.id === id)
            || SCHACH_BOT.STUFEN.find((stufe) => stufe.id === SCHACH_BOT.STUFE_ALTBESTAND);
    },

    /* Auf welcher Stufe spielt der Computer in DIESER Runde? */
    stufeVon(runde) {
        return SCHACH_BOT.stufe(
            (runde && runde.regeln) ? runde.regeln.botStufe : "");
    },

    /* ---------------------------------------------------------------- *
     * Die Gewichte der Bewertung
     *
     * Hundertstel eines Bauern (Zentibauer) — die Einheit jeder
     * Schach-Engine. Sie stehen zu NICHTS ausser zueinander in Beziehung.
     * ---------------------------------------------------------------- */

    /*
     * Was eine Figur wert ist. Die üblichen Werte, mit zwei Abweichungen,
     * die dieses Spiel nötig macht:
     *
     *   - Der Läufer steht knapp über dem Springer (320 zu 300) — das ist
     *     die gängige Feinheit, die den Bot zwischen zwei sonst gleichen
     *     Zügen entscheiden lässt.
     *   - DER KÖNIG HAT EINEN WERT (350). In normalem Schach hat er keinen,
     *     weil er nie fällt. Hier kann eine Seite ZWEI Könige haben (zwei
     *     Leben, Zufallsarmee), und dann ist der zweite eine schlagbare
     *     Figur wie jede andere. Mit 0 würde der Bot ein geschenktes Leben
     *     stehen lassen. Bei je einem König heben sich die Werte auf, die
     *     Zahl ändert dort also nichts.
     *
     * NICHT ZU VERWECHSELN mit `SCHACH_RUNDE.FIGUR_WERT`: Das ist die
     * Rechnung des SPIELS (Beute, Bilanz, Rangliste) und muss so bleiben,
     * wie sie ist. Das hier ist die Meinung des Bots.
     */
    WERT: { B: 100, S: 300, L: 320, T: 500, D: 900, K: 350 },

    /*
     * Wie viel Zuschlag eine Figur in der Brettmitte bekommt (nur Stufe
     * „Meister"). Springer und Läufer gewinnen dort am meisten an
     * Reichweite; der König gehört im Mittelspiel gerade NICHT in die Mitte,
     * deshalb steht dort ein Abschlag.
     */
    MITTE: { B: 0, S: 30, L: 20, T: 5, D: 10, K: -20 },

    /* Der Zuschlag an der Wurzel für eine Lootbox auf dem Weg — in
       derselben Einheit, also gut ein Fünftel Bauer je Box. */
    PUNKTE_LOOTBOX: 25,

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
     * IST DIESE RUNDE ALS COMPUTER-RUNDE ANGELEGT WORDEN?
     *
     * Nicht dasselbe wie `istBotPartie`, und der Unterschied ist seit
     * v0.29.0 wichtig: Der Computer steigt erst ein, wenn der Mensch auf
     * „Bereit" drückt (vorher soll dieser sich in Ruhe eine Seite aussuchen
     * können). Zwischen „Spielen" und „Bereit" gibt es also eine
     * Computer-Runde OHNE Computer.
     *
     *   botVorgesehen  — die Runde WILL einen Computer (Absicht)
     *   istBotPartie   — es sitzt einer drin (Tatsache)
     *
     * Erkannt wird die Absicht an der Stufe: `regeln.botStufe` wird beim
     * Anlegen nur für Computer-Runden gesetzt (`TEAM_SCHACH.rundeStarten`).
     * Ein eigenes Feld daneben wäre eine zweite Quelle für dieselbe Aussage.
     */
    botVorgesehen(runde) {
        return !!(runde && runde.regeln && runde.regeln.botStufe);
    },

    /*
     * Den Computer in eine Runde setzen und seine Seite sofort bereit
     * melden — seit v0.62.0 BEIDE Bereitschaften: die zur Seite und die zur
     * Aufstellung. Er wartet auf nichts; angepfiffen wird, sobald der Mensch
     * beides gesagt hat (`SCHACH_RUNDE.kannAnpfeifen`).
     *
     * WARUM ER DIE AUFSTELLUNG NIE PRÜFT: Er hat keine Meinung zum Brett.
     * Müsste er zustimmen, stünde der Mensch auf dem zweiten Start-Bildschirm
     * und wartete auf jemanden, der nie antwortet.
     */
    inRundeSetzen(runde, farbe, zeitpunkt) {
        const mitBot = SCHACH_RUNDE.teamBeitreten(
            runde, SCHACH_BOT.KENNUNG, farbe, zeitpunkt);

        return SCHACH_BOT.aufstellungBestaetigen(
            SCHACH_RUNDE.bereitSetzen(mitBot, farbe, true, zeitpunkt), zeitpunkt);
    },

    /*
     * JEDE SEITE, IN DER NUR DER COMPUTER SITZT, SAGT JA ZUR AUFSTELLUNG
     * (seit v0.62.0).
     *
     * Gebraucht an zwei Stellen: beim Einsteigen (oben) und nach jedem
     * Neu-Würfeln — `SCHACH_RUNDE.armeeNeuWuerfeln` streicht die Zusage
     * BEIDER Seiten, und der Computer würde seine sonst nie erneuern.
     *
     * Liefert die Runde unverändert zurück, wenn kein Computer mitspielt;
     * der Aufrufer muss nichts prüfen.
     */
    aufstellungBestaetigen(runde, zeitpunkt) {
        let neu = runde;

        for (const farbe of ["weiss", "schwarz"]) {
            const seite = SCHACH_RUNDE.normalisieren(neu).teams[farbe];
            const nurBot = seite.length > 0
                && seite.every((id) => SCHACH_BOT.istBot(id));

            if (nurBot) {
                neu = SCHACH_RUNDE.aufstellungBereitSetzen(
                    neu, farbe, true, zeitpunkt);
            }
        }

        return neu;
    },

    /*
     * DER COMPUTER STEIGT EIN, WENN DER MENSCH BEREIT IST (seit v0.29.0).
     *
     * Er setzt sich dem Spieler GEGENÜBER — welche Seite das ist, hat der
     * Mensch vorher selbst gewählt. Liefert die Runde unverändert zurück,
     * wenn es nichts zu tun gibt; der Aufrufer muss also nichts prüfen.
     *
     * Warum das hier steht und nicht im Bildschirm: Wer wo sitzt, ist eine
     * Regel der Partie. Der Bildschirm weiss nur, WER gedrückt hat.
     */
    beiBereitDazuholen(runde, spielerId, zeitpunkt) {
        if (!SCHACH_BOT.botVorgesehen(runde) || SCHACH_BOT.istBotPartie(runde)) {
            return runde;
        }

        const meine = SCHACH_RUNDE.teamVon(runde, spielerId);
        if (!meine) {
            return runde;
        }

        return SCHACH_BOT.inRundeSetzen(runde, SCHACH.gegner(meine), zeitpunkt);
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

        const brett = stand.stand;
        const zuege = SCHACH.alleZuege(brett);
        if (zuege.length === 0) {
            return null;
        }

        const stufe = SCHACH_BOT.stufeVon(stand);

        /*
         * Die Lootbox-Felder EINMAL vorab einsammeln, nicht je Zug erneut:
         * Auf dem vollen Kreuzbrett liegen schnell dreissig Boxen.
         * NUR DIE FELDNUMMER (siehe Kopf, Festlegung 2).
         */
        const boxFelder = stand.bonus.map((eintrag) => eintrag.feld);

        /*
         * DAS BUDGET WIRD JE ZUG FRISCH GESETZT und in `_rest` heruntergezählt.
         * Es steht am Objekt und nicht als Parameter, weil sonst jede der drei
         * Suchfunktionen es durchreichen müsste — und es geht ja gerade darum,
         * dass ALLE zusammen an derselben Grenze hängen.
         */
        SCHACH_BOT._rest = stufe.budget;
        SCHACH_BOT._ruheRest = stufe.ruheBudget;

        const sortiert = SCHACH_BOT._sortieren(brett, zuege);

        /*
         * ITERATIVE VERTIEFUNG: erst Tiefe 1, dann 2, dann 3 …
         *
         * Warum nicht gleich die Zieltiefe? Weil das Budget mittendrin
         * ausgehen kann. Ein ABGEBROCHENER Durchgang ist wertlos und sogar
         * schädlich: Die zuerst betrachteten Züge wären tief gerechnet, die
         * späteren nur noch überschlagen — der Bot vergliche Äpfel mit
         * Birnen und nähme systematisch den, der zufällig vorn stand.
         *
         * Also wird jede Tiefe GANZ gerechnet oder gar nicht: Reicht das
         * Budget nicht, gilt das Ergebnis der letzten vollständigen Tiefe.
         * Der Bot wird auf grossen Brettern dadurch flacher, aber nie wirr.
         */
        let beste = SCHACH_BOT._wurzelDurchgang(brett, sortiert, boxFelder, 1, stufe);
        let letzterVerbrauch = 0;

        for (let tiefe = 2; tiefe <= stufe.tiefe; tiefe++) {
            /*
             * LOHNT SICH DER NÄCHSTE DURCHGANG ÜBERHAUPT NOCH?
             *
             * Eine Tiefe mehr kostet gemessen das Drei- bis Fünffache der
             * vorigen (`_SCHAETZFAKTOR`). Wer das nicht vorher abschätzt,
             * verheizt sein halbes Budget in einem Durchgang, den er
             * hinterher wegwerfen muss — auf dem Doppelbrett war das fast
             * eine Sekunde für nichts.
             */
            if (letzterVerbrauch * SCHACH_BOT._SCHAETZFAKTOR > SCHACH_BOT._rest) {
                break;
            }

            const vorrat = SCHACH_BOT._rest;
            const durchgang = SCHACH_BOT._wurzelDurchgang(
                brett, sortiert, boxFelder, tiefe, stufe);

            /* Budget mittendrin aufgebraucht: Durchgang verwerfen. */
            if (SCHACH_BOT._rest <= 0) {
                break;
            }

            beste = durchgang;
            letzterVerbrauch = vorrat - SCHACH_BOT._rest;
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
     * Die Suche
     * ---------------------------------------------------------------- */

    /*
     * Um wie viel teurer ist eine Tiefe mehr?
     *
     * Gemessen am echten Modell liegt der Sprung in der ZAHL der Stellungen
     * zwischen dem Drei- und dem Fünffachen (Standardbrett 4,5; Doppelbrett
     * 2,9; Kreuz 3,7). Hier steht trotzdem ACHT, und zwar mit Absicht: Mit
     * fünf wurde auf dem Doppelbrett ein Durchgang begonnen, der drei
     * Sekunden lief und dann am Budget scheiterte — die Zeit war weg, das
     * Ergebnis auch. Lieber einen Durchgang zu wenig beginnen als einen halb
     * bezahlen und wegwerfen; die Stufe wird dadurch auf grossen Brettern
     * flacher, aber nie langsamer als versprochen.
     */
    _SCHAETZFAKTOR: 8,

    /*
     * EIN vollständiger Durchgang über alle Wurzelzüge mit fester Tiefe.
     * Liefert die Liste der gleich guten besten Züge.
     */
    _wurzelDurchgang(brett, zuege, boxFelder, tiefe, stufe) {
        let beste = [];
        let bestwert = -Infinity;

        for (const zug of zuege) {
            /*
             * DER LOOTBOX-ZUSCHLAG GEHÖRT AN DIE WURZEL und nirgendwo
             * sonst: Tiefer in der Suche wäre er falsch, weil dort niemand
             * mehr weiss, welche Boxen noch liegen (die Suche rechnet mit
             * `SCHACH._ausfuehren`, das keine Boxen einsammelt).
             */
            const zugabe = SCHACH_BOT._wurzelZugabe(brett, zug, boxFelder);
            const danach = SCHACH._ausfuehren(brett, zug);

            /*
             * DIE SCHRANKE AN DER WURZEL LIEGT UM EINS TIEFER als der beste
             * bisherige Wert — und dieses eine Zählerchen ist der ganze
             * Kniff.
             *
             * Das Problem: Die Gleichstands-Liste unten sammelt Züge, die
             * GENAU so gut sind wie der beste. Alpha-Beta liefert aber für
             * jeden Zug, der die Schranke nicht überschreitet, nur noch eine
             * SCHRANKE statt des echten Werts („fail soft"). Mit
             * `alpha = bestwert` käme ein in Wahrheit schlechterer Zug mit
             * genau `bestwert` heraus und landete fälschlich in der Liste.
             *
             * Beim Bauen stand hier deshalb erst ein OFFENES Fenster
             * (`-Infinity, Infinity`). Das war korrekt, aber teuer: Ohne
             * obere Schranke schneidet Alpha-Beta überhaupt nichts mehr weg,
             * und auf dem grossen Kreuzbrett fiel „Mittel" dadurch auf Tiefe
             * 1 zurück — also auf „Leicht". Gemessen und verworfen.
             *
             * Mit `bestwert - 1` gilt beides: Alles, was mindestens so gut
             * ist wie der beste Zug, liegt IM Fenster und kommt exakt
             * heraus; alles Schlechtere fällt heraus und wird ohnehin
             * verworfen. Möglich ist das nur, weil die Bewertung in ganzen
             * Zahlen rechnet.
             *
             * Umgerechnet auf die Sicht des Gegners (Vorzeichen drehen) und
             * um die Wurzel-Zugabe versetzt ergibt das die Schranke unten.
             */
            const wert = zugabe + ((tiefe <= 1)
                ? -SCHACH_BOT._bewerten(danach, stufe)
                : -SCHACH_BOT._suchen(danach, tiefe - 1,
                    -Infinity, zugabe - bestwert + 1, stufe));

            if (wert > bestwert) {
                bestwert = wert;
                beste = [zug];
            } else if (wert === bestwert) {
                beste.push(zug);
            }
        }

        return beste;
    },

    /*
     * Wie viel Arbeit die Suche noch tun darf — in ANGESEHENEN FELDERN
     * (siehe die Erklärung bei den Stufen). Zwei getrennte Töpfe, damit die
     * gierige Ruhesuche der Hauptsuche nicht die Tiefe wegfrisst.
     *
     * Sie stehen hier nur, damit die Eigenschaften von Anfang an existieren;
     * gesetzt werden sie je Zug in `zugWaehlen`.
     */
    _rest: 0,
    _ruheRest: 0,

    /*
     * Negamax mit Alpha-Beta. Liefert den Wert der Stellung AUS SICHT DER
     * SEITE, DIE AM ZUG IST.
     *
     * Warum eine Funktion für beide Seiten genügt: Was für mich gut ist, ist
     * für den Gegner genau so schlecht. Man dreht deshalb bei jedem Halbzug
     * das Vorzeichen um (`-SCHACH_BOT._suchen(...)`) und tauscht die
     * Schranken (`-beta, -alpha`) — dann sucht immer dieselbe Funktion nach
     * ihrem eigenen Vorteil.
     *
     * `alpha` ist das Beste, was ICH mir bis hier schon sichern kann.
     * `beta` ist das Beste, was der GEGNER sich sichern kann.
     * Ist `alpha >= beta`, ist dieser Ast für den Gegner schon so schlecht,
     * dass er ihn nie zulässt — der Rest muss nicht mehr angesehen werden.
     * DAS ÄNDERT DAS ERGEBNIS NICHT, nur die Rechenzeit.
     */
    _suchen(brett, tiefe, alpha, beta, stufe) {
        /*
         * GEZÄHLT WIRD JEDE BETRACHTUNG, auch die, die nur bewertet und
         * nicht weiter aufgeklappt wird.
         *
         * BEIM BAUEN GENAU HIER FALSCH GEWESEN: Zuerst stand der Zähler
         * hinter der Abfrage darunter, wurde also nur beim AUFKLAPPEN
         * heruntergezählt. Die Blätter — und die sind so zahlreich wie die
         * Züge einer Stellung — kosteten damit nichts, und das Budget hielt
         * um den Faktor der Verzweigung zu wenig zurück: gemessen 6151 statt
         * der erwarteten rund 300 Millisekunden je Zug auf dem Doppelbrett.
         */
        SCHACH_BOT._rest -= SCHACH.felderVon(brett);

        /* Die Notbremse: kein Blatt mehr aufklappen, nur noch bewerten. */
        if (tiefe <= 0 || SCHACH_BOT._rest <= 0) {
            return (stufe.ruhe > 0 && SCHACH_BOT._ruheRest > 0)
                ? SCHACH_BOT._ruhesuche(brett, alpha, beta, stufe.ruhe, stufe)
                : SCHACH_BOT._bewerten(brett, stufe);
        }

        const zuege = SCHACH.alleZuege(brett);

        /*
         * Keine Züge mehr heisst matt oder patt — das entscheidet das
         * Modell, nicht der Bot. Hier zählt nur, dass die Stellung dann
         * nicht weiter aufgeklappt wird; wie schlimm sie ist, sagt die
         * Bewertung (bei Matt fehlt dem Verlierer sein König nicht, also
         * ist der Wert schlicht der der Stellung).
         */
        if (zuege.length === 0) {
            return SCHACH_BOT._bewerten(brett, stufe);
        }

        let beste = -Infinity;

        for (const zug of SCHACH_BOT._sortieren(brett, zuege)) {
            const wert = -SCHACH_BOT._suchen(SCHACH._ausfuehren(brett, zug),
                tiefe - 1, -beta, -alpha, stufe);

            if (wert > beste) {
                beste = wert;
            }
            if (beste > alpha) {
                alpha = beste;
            }
            if (alpha >= beta) {
                /* Der Gegner lässt diesen Ast nicht zu — abbrechen. */
                break;
            }
        }

        return beste;
    },

    /*
     * DIE RUHESUCHE (nur Stufe „Meister").
     *
     * Sie hängt sich ans Ende der Suche und verfolgt NUR NOCH SCHLAGZÜGE.
     * Grund ist der sogenannte Horizont: Eine Suche mit ungerader Tiefe hört
     * auf, nachdem der Bot geschlagen hat — den Rückschlag sieht sie nicht
     * mehr. Ohne Ruhesuche schlägt die Dame vergnügt einen gedeckten Bauern
     * und wundert sich im nächsten Zug.
     *
     * `stehen` ist der Wert, wenn man GAR NICHT weiterschlägt (im Englischen
     * „stand pat"). Er ist die Untergrenze: Niemand ist gezwungen zu
     * schlagen, also kann das Ergebnis nie schlechter sein als das.
     */
    _ruhesuche(brett, alpha, beta, rest, stufe) {
        /* Auch hier zählt JEDE Betrachtung — aber aus dem EIGENEN Topf. */
        SCHACH_BOT._ruheRest -= SCHACH.felderVon(brett);

        const stehen = SCHACH_BOT._bewerten(brett, stufe);

        if (rest <= 0 || SCHACH_BOT._ruheRest <= 0 || stehen >= beta) {
            return stehen;
        }
        if (stehen > alpha) {
            alpha = stehen;
        }

        const schlaege = SCHACH.alleZuege(brett).filter(
            (zug) => !!SCHACH.figurAuf(brett, zug.nach));

        for (const zug of SCHACH_BOT._sortieren(brett, schlaege)) {
            const wert = -SCHACH_BOT._ruhesuche(SCHACH._ausfuehren(brett, zug),
                -beta, -alpha, rest - 1, stufe);

            if (wert >= beta) {
                return beta;
            }
            if (wert > alpha) {
                alpha = wert;
            }
        }

        return alpha;
    },

    /*
     * ZUGSORTIERUNG: Schlagzüge zuerst, die wertvollste Beute vorn.
     *
     * Das ist die wichtigste einzelne Zeile für die Rechenzeit — Alpha-Beta
     * schneidet nur weg, wenn der beste Zug früh kommt (gemessen: auf dem
     * grossen Kreuzbrett Tiefe 4 von 99 auf 6,6 Sekunden).
     *
     * `slice()` ist Pflicht: `sort` arbeitet an Ort und Stelle, und die
     * Liste kommt frisch aus dem Modell — dort darf nichts umgeräumt werden.
     * Bei gleichem Beutewert bleibt die Reihenfolge des Modells stehen
     * (`sort` ist in JavaScript stabil); der Bot bleibt damit vorhersagbar.
     */
    _sortieren(brett, zuege) {
        return zuege.slice().sort((einer, anderer) =>
            SCHACH_BOT._beuteWert(brett, anderer) - SCHACH_BOT._beuteWert(brett, einer));
    },

    _beuteWert(brett, zug) {
        return SCHACH_BOT.WERT[SCHACH.artVon(SCHACH.figurAuf(brett, zug.nach))] || 0;
    },

    /* ---------------------------------------------------------------- *
     * Bewerten
     * ---------------------------------------------------------------- */

    /*
     * Was ist diese Stellung wert — aus Sicht der Seite, die am Zug ist?
     *
     * Positiv heisst gut für sie. Gezählt wird das Material auf dem ganzen
     * Brett; bei der Stufe „Meister" zusätzlich, WO die Figuren stehen.
     */
    _bewerten(brett, stufe) {
        const farbe = brett.amZug;
        const breite = SCHACH.breiteVon(brett);
        const hoehe = SCHACH.hoeheVon(brett);
        const felder = SCHACH.felderVon(brett);

        let summe = 0;

        for (let feld = 0; feld < felder; feld++) {
            const figur = SCHACH.figurAuf(brett, feld);
            if (!figur) {
                continue;
            }

            const art = SCHACH.artVon(figur);
            let wert = SCHACH_BOT.WERT[art] || 0;

            if (stufe.positionell) {
                wert += (SCHACH_BOT.MITTE[art] || 0)
                    * SCHACH_BOT._mitteWert(feld, breite, hoehe);
            }

            summe += (SCHACH.farbeVon(figur) === farbe) ? wert : -wert;
        }

        return summe;
    },

    /*
     * Wie nah ist dieses Feld der Brettmitte? 1 = genau in der Mitte,
     * 0 = ganz aussen.
     *
     * DER ERSATZ FÜR DIE FELDERTABELLEN (piece-square tables) der üblichen
     * Engines: Die sind 64 Zahlen für ein 8x8-Brett und lassen sich auf ein
     * Kreuz mit 196 Feldern nicht übertragen. Der Abstand zur Mitte ist
     * gröber, aber er stimmt auf JEDER Brettform — und er trifft den Kern
     * dessen, was die Tabellen sagen: In der Mitte hat eine Figur mehr Wege.
     */
    _mitteWert(feld, breite, hoehe) {
        const mitteReihe = (hoehe - 1) / 2;
        const mitteSpalte = (breite - 1) / 2;

        const abstand = (Math.abs(SCHACH.reiheVon(feld, breite) - mitteReihe)
                / (mitteReihe || 1)
            + Math.abs(SCHACH.spalteVon(feld, breite) - mitteSpalte)
                / (mitteSpalte || 1)) / 2;

        return 1 - abstand;
    },

    /*
     * Was dieser Zug NEBEN dem Schach einbringt — nur an der Wurzel.
     *
     * Heute ist das genau eines: die Lootboxen, die auf dem Weg liegen. Sie
     * werden auf dem GANZEN WEG eingesammelt, nicht nur auf dem Zielfeld
     * (`SCHACH_RUNDE._bonusEinsammeln`); ein Turm, der über drei Boxen
     * fährt, holt drei. Das Startfeld zählt nicht mit: Dort stand die Figur
     * schon, eine Box läge da nicht mehr.
     */
    _wurzelZugabe(brett, zug, boxFelder) {
        if (boxFelder.length === 0) {
            return 0;
        }

        const weg = SCHACH.wegFelder(brett, zug.von, zug.nach, !!zug.ohneWeg);
        let punkte = 0;

        for (const feld of weg) {
            if (feld !== zug.von && boxFelder.indexOf(feld) !== -1) {
                punkte += SCHACH_BOT.PUNKTE_LOOTBOX;
            }
        }

        return punkte;
    }
};

/* Für die Tests ausserhalb des Browsers. SCHACH und SCHACH_RUNDE müssen dort
   vorher als globale Grössen bereitstehen. */
if (typeof module !== "undefined" && module.exports) {
    module.exports = SCHACH_BOT;
}
