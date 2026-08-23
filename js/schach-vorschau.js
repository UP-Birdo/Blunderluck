/*
 * schach-vorschau.js — die Bildanleitung zu jeder Fähigkeit (seit v0.41).
 *
 * Zu jeder Fähigkeit und zu jedem Unglückswürfel gibt es zwei Bilder: VORHER
 * und NACHHER, auf einem kleinen Beispielbrett.
 *
 * DAS NACHHER-BILD WIRD GERECHNET, NICHT GEZEICHNET. Diese Datei beschreibt
 * nur die Ausgangsstellung und den einen Handgriff (welches Feld angetippt
 * wird, welcher Zug folgt) — was daraus wird, rechnen `SCHACH_RUNDE` und
 * `SCHACH` mit genau denselben Funktionen aus, die auch im Spiel laufen.
 * Deshalb kann die Anleitung nicht von der Regel abweichen: Wer eine Fähigkeit
 * ändert, ändert ihr Bild automatisch mit. Dasselbe Prinzip trägt schon die
 * Vorschaubilder der Spielarten (`TEAM_SCHACH._vorschauBauen`).
 *
 * Diese Datei weiss nichts über den Bildschirm — sie liefert Stände und
 * markierte Felder. Gezeichnet wird in `team-schach-auswertung.js`.
 *
 * Das Beispielbrett ist 6 mal 6 Felder gross: klein genug fürs Handy, gross
 * genug für Mauer (drei Felder nebeneinander), Erdbeben (drei Reihen) und
 * Friedhof (ein 2-mal-2-Feld).
 */

const SCHACH_VORSCHAU = {

    BREITE: 6,
    HOEHE: 6,

    /* Der Spieler, der im Beispiel handelt. Er steht im weissen Team. */
    SPIELER: "id-vorschau",
    FARBE: "weiss",

    /*
     * Aus sechs Zeilen wird ein Brett. Geschrieben wird von oben (schwarze
     * Seite) nach unten — so, wie das Brett auch auf dem Bildschirm steht.
     */
    _brett(zeilen) {
        return zeilen.join("");
    },

    /*
     * Feldnummer aus Reihe und Spalte, beide von 0 an. Nur zum Schreiben der
     * Beispiele — im Spiel rechnet `SCHACH` selbst.
     */
    _feld(reihe, spalte) {
        return reihe * SCHACH_VORSCHAU.BREITE + spalte;
    },

    /*
     * Die Beispiele. Jeder Eintrag beschreibt:
     *
     *     brett     Die Ausgangsstellung (6 mal 6 Zeichen).
     *     figur     Feld, um das es geht — im Vorher-Bild markiert. -1 = keines.
     *     ziel      Das angetippte Feld für Fähigkeiten der Art "ziel".
     *               -1 bei allen anderen.
     *     zug       Wahlfrei: [von, nach] — ein Zug, der NACH der Fähigkeit
     *               ausgeführt wird. Nur dort nötig, wo sich die Wirkung erst
     *               im nächsten Zug zeigt (Doppelzug) oder wo der Würfel erst
     *               eingesammelt werden muss (Unglückswürfel).
     *     todeszug  Wahlfrei: [von, nach] — ein Zug des GEGNERS, der VOR allem
     *               anderen läuft und dabei eine eigene Figur schlägt (seit
     *               v0.58, für die Wiedergeburt). Daraus entsteht der Verlust,
     *               den die Fähigkeit heilt — gerechnet, nicht eingetragen.
     *     vorspiel  Wahlfrei: der Satz zum Bild VOR dem Todeszug.
     *     nachspiel Wahlfrei: [von, nach] — ein Zug, der NACH der Wirkung
     *               gezeigt wird (seit v0.58). Damit erzählt eine Anleitung,
     *               was das Pluszeichen wert ist: erst die Fähigkeit, dann der
     *               Zug, den man dadurch noch hat.
     *     nachsatz  Wahlfrei: der Satz zum Bild nach `nachspiel`.
     *     nachschlag Wahlfrei: [von, nach] — NOCH ein eigener Zug, eine Runde
     *               später (seit v0.75). Dazwischen zieht der Gegner einmal;
     *               gebraucht für Wirkungen, die über mehrere Halbzüge halten.
     *     nachschlagSatz Wahlfrei: der Satz zu diesem Bild.
     *     verloren  Wahlfrei: geschlagene eigene Figuren als Arten
     *               (für die Wiedergeburt).
     *     gefallen  Wahlfrei: eigene Gefallene als [{ art, feld }]
     *               (für die Wiederbelebung — sie braucht den ORT).
     *     beute     Wahlfrei: gefallene GEGNER als [{ art, feld }]
     *               (für den Friedhof).
     *     vorher    Ein Satz unter dem linken Bild.
     *     nachher   Ein Satz unter dem rechten Bild.
     *
     * JEDE STELLUNG ERZÄHLT, WARUM MAN DIE FÄHIGKEIT NEHMEN WÜRDE (seit v0.50).
     *
     * Bis v0.49 standen auf fast jedem Beispielbrett nur zwei Könige und die
     * eine Figur, um die es ging — der Gegner fehlte, und damit fehlte der
     * Grund. Bei „Ausweichen" behauptete der Satz sogar „angegriffen und
     * eingeklemmt", während weit und breit nichts angriff. Jetzt steht in jeder
     * Stellung, was die Fähigkeit löst: ein Angreifer, eine Sperre, eine Lücke.
     *
     * DIE KÖNIGE SIND RAUS (seit v0.58).
     *
     * Bis v0.57 stand in jedem Beispiel ein Königspaar, mit der Begründung,
     * `SCHACH.zuege` prüfe für jeden Zug den eigenen König. Am 08.08.
     * nachgemessen: Das stimmt nicht — `imSchach` liefert ohne König schlicht
     * `false`, und eine Stellung ganz ohne Könige läuft durch alle Bilder,
     * Züge und Marken. Die beiden standen also nur herum und lenkten ab.
     *
     * Könige gehören jetzt nur noch dorthin, wo Schach zur Sache gehört. Keine
     * der Szenen unten braucht sie.
     *
     * Die Ausgangsstellungen bleiben leer geräumt: Ein Beispiel soll EINE
     * Sache zeigen, nicht eine Partie. Was darüber hinaus dasteht, ist immer
     * der GRUND — der Angreifer, die Sperre, die Beute.
     *
     * WAS EIN PLUSZEICHEN WERT IST, ZEIGT DAS LETZTE BILD (seit v0.58). Eine
     * Fähigkeit ohne `beendetZug` lässt einem den Zug; das steht zwar im Text,
     * ist aber erst zu sehen, wenn im Beispiel danach wirklich noch gezogen
     * wird. Dafür gibt es `nachspiel`.
     */
    BEISPIELE: {

        /* ---- Gewöhnlich: zusätzliche Gangarten ---- */

        /*
         * Der Turm steht so, dass ihn nur ein Springerzug an die Dame bringt.
         * Die übrigen drei Sprungfelder sind mit EIGENEN Bauern besetzt — damit
         * bleibt genau ein neues Zielfeld übrig, und das letzte Bild
         * (`_sprungSchritt` zieht dorthin) zeigt wirklich den Schlag. Ohne die
         * Bauern wären alle Sprungfelder gleich weit weg, und es hinge vom
         * Zufall ab, welchen Zug die Anleitung vorführt.
         */
        sprung: {
            brett: [
                ".....b",
                "......",
                "d.....",
                "......",
                ".T....",
                "......"
            ],
            figur: 25,
            ziel: -1,
            vorher: "Die schwarze Dame steht schräg versetzt — gerade kommt "
                + "der Turm "
                + "dort nie hin.",
            nachher: "Mit Sprung geht er wie ein Springer. Vier neue Punkte "
                + "stehen "
                + "auf dem Brett — und auf einem davon steht die Dame."
        },

        /*
         * AUSWEICHEN BEGINNT IM GEGENZUG (seit v0.58). Das Beispiel startet
         * deshalb mit Schwarz am Zug — `_runde` setzt das aus `nurImGegenzug`.
         * Der schwarze Bauer auf a6 steht vor der Dame in der Feldreihenfolge
         * und ist damit der Zug, den `_gegnerZiehtEinmal` nimmt: harmlos, und
         * die Drohung bleibt stehen.
         */
        /*
         * AUSWEICHEN NEU GESTELLT (v0.74, Meldung I4).
         *
         * Bis v0.73 stand oben links ein schwarzer Bauer und rechts eine Dame.
         * Der Turm hatte mehrere freie Nachbarfelder — und ausgerechnet das
         * vorgeführte lag im Schlagbereich dieses Bauern: Die Notbremse führte
         * im Bild direkt ins Verderben. Genau so wurde es gemeldet.
         *
         * Jetzt bleibt GENAU EIN freies Nachbarfeld übrig (b4), und das ist
         * nachweislich sicher: Der Angreifer ist ein SPRINGER, weil nur er
         * durch die eigene Mauer hindurch drohen kann — eine Dame oder ein Turm
         * bräuchte eine freie Linie, und die gäbe es nur über das Fluchtfeld.
         * Von c4 aus deckt der Springer c3, aber nicht b4; nachgerechnet wird
         * es nicht von Hand, sondern von einem Test.
         */
        ausweichen: {
            brett: [
                "......",
                "......",
                "..BBs.",
                ".BTB..",
                ".BBB..",
                "......"
            ],
            figur: 20,
            ziel: -1,
            vorher: "Der Turm ist von den eigenen Leuten zugestellt — kein "
                + "einziger "
                + "Zug bleibt ihm, und der Springer holt ihn beim nächsten "
                    + "Mal.",
            nachher: "Ausweichen öffnet ihm ein Feld in jede Richtung. Hier "
                + "ist genau eines frei — und dort kommt der Springer nicht "
                + "hin. Nur auf FREIE Felder, geschlagen wird nicht."
        },

        /*
         * TELEPORT NEU GESTELLT (v0.58, Punkt F4).
         *
         * Bis v0.57 riegelten drei Springer eine Reihe ab, und der Turm setzte
         * sich dahinter — mitten unter sie. Das Bild zeigte die Gangart, aber
         * keinen Grund. Jetzt ist er eingemauert UND vom Springer bedroht, und
         * das einzige weit entfernte freie Feld bringt ihn in Sicherheit und
         * greift denselben Springer an. Die anderen drei Ecken des Umkreises
         * sind besetzt, damit das vorgeführte Feld nicht dem Zufall überlassen
         * bleibt — `_sprungSchritt` nimmt das am weitesten entfernte.
         */
        teleport: {
            brett: [
                "...l..",
                ".s..b.",
                "..B...",
                ".BTB..",
                "..B...",
                "B...B."
            ],
            figur: 20,
            ziel: -1,
            vorher: "Der Turm ist von den eigenen Leuten eingemauert — kein "
                + "Zug "
                + "bleibt ihm, und der Springer holt ihn beim nächsten Mal.",
            nachher: "Der Teleport setzt über alles hinweg, auf ein freies "
                + "Feld im "
                + "Umkreis von zwei. Er kommt heraus — und nimmt von dort den "
                + "Springer ins Visier."
        },

        /*
         * SCHUBS (seit v0.79). Die Szene beantwortet „wozu?" mit der
         * häufigsten Lage überhaupt: Der gegnerische Bauer steht genau vor dem
         * eigenen und hält ihn auf. Ein Schubs räumt ihn weg, und der Zug
         * bleibt trotzdem übrig.
         *
         * Der schwarze Turm oben gibt Schwarz eine ziehfähige Figur, die Dame
         * unten Weiss — ohne das endet die Beispielpartie durch Patt, und
         * `bilder()` liefert gar nichts mehr (Hausregel, seit v0.58).
         */
        schubs: {
            brett: [
                "..t...",
                "......",
                "..b...",
                "..B...",
                "......",
                "...D.."
            ],
            figur: 14,
            ziel: 14,
            /* Das dritte Bild zeigt, was das Pluszeichen wert ist: Der Zug ist
               noch da, und der Weg ist jetzt frei (seit v0.80). */
            nachspiel: [20, 14],
            vorher: "Der schwarze Bauer steht deinem Bauern direkt im Weg — "
                + "keiner "
                + "von beiden kommt vorbei.",
            nachher: "Ein Schubs, und er steht ein Feld weiter hinten. "
                + "Geschlagen "
                + "wird dabei nichts.",
            nachsatz: "Und dein Zug gehört immer noch dir: Der Bauer rückt "
                + "sofort "
                + "in die Lücke nach."
        },

        /*
         * PLATZTAUSCH (seit v0.79). Der klassische Ärger: Der Läufer steht
         * hinter dem eigenen Bauern und sieht nichts. Nach dem Tausch steht er
         * vorn und nimmt den Turm ins Visier — ohne dass es einen Zug gekostet
         * hat.
         */
        platztausch: {
            brett: [
                "..t...",
                "......",
                "t.....",
                "......",
                "..B...",
                "..L..."
            ],
            figur: 32,
            ziel: 32,
            /* Das dritte Bild zeigt, was das Pluszeichen wert ist (seit v0.80):
               Der Läufer schlägt im selben Zug, für den er eben erst frei
               geworden ist. */
            nachspiel: [26, 12],
            vorher: "Dein Läufer steht hinter dem eigenen Bauern und sieht "
                + "keine "
                + "einzige Diagonale.",
            nachher: "Die beiden tauschen die Plätze: Der Läufer steht vorn, "
                + "der "
                + "Bauer rückt nach hinten.",
            nachsatz: "Und dein Zug bleibt dir — der Läufer holt sich den Turm "
                + "gleich selbst."
        },

        /* ---- Ungewöhnlich: verändert die Stellung ---- */

        /*
         * BAUERNSCHUB NEU GESTELLT (v0.58, Punkt G7).
         *
         * Bis v0.57 stand ein schwarzer Turm da, der die Bauern VORHER nicht
         * schlagen konnte und NACHHER schon — das Bild zeigte also einen
         * Nachteil, während der Satz einen Vorteil behauptete. Jetzt bringt der
         * Schub zweierlei sichtbar ein: Der vordere Bauer wandelt um (seit
         * v0.56 wählt man die Figur), und der mittlere greift danach den
         * Läufer an.
         */
        bauernschub: {
            brett: [
                "......",
                "B..l..",
                "......",
                "..B.B.",
                "......",
                "......"
            ],
            figur: -1,
            ziel: -1,
            vorher: "Drei eigene Bauern — und einer steht kurz vor der letzten "
                + "Reihe.",
            nachher: "Alle rücken auf einmal vor: Der vorderste wandelt um, "
                + "und der "
                + "mittlere greift jetzt den Läufer an. Danach ist der Gegner "
                    + "am Zug."
        },
        schutzschild: {
            brett: [
                "..t...",
                "......",
                "..D.l.",
                "......",
                "......",
                "....T."
            ],
            figur: 14,
            ziel: 14,
            nachspiel: [34, 16],
            vorher: "Der schwarze Turm steht deiner Dame gegenüber — er "
                + "schlägt sie "
                + "als Nächstes.",
            nachher: "Mit dem Schild überlebt sie den Schlag: Er verpufft, der "
                + "Angreifer bleibt stehen. Die Zahl sagt, wie lange es hält.",
            /* Der Satz sagt seit v0.75 ausdrücklich, WOZU das gut ist (Meldung
               I14): Man greift woanders an, ohne Angst um die Dame — der
               schwarze Turm steht ja noch da und zielt weiter auf sie. */
            nachsatz: "Weil das Schild keinen Zug kostet, greifst du im selben "
                + "Atemzug woanders an: Dein Turm holt sich den Läufer. Der "
                + "schwarze Turm zielt weiter auf die Dame — sein Schlag "
                + "verpufft."
        },
        /* Das Erdbeben ist seit v0.54 ein Unglückswürfel — sein Beispiel steht
           weiter unten bei `PECH_BEISPIELE`. */
        /*
         * DIE SZENE ZEIGT DIE GANZE SPALTE (seit v0.59, Wunsch #16 / I3).
         *
         * Gemeldet als „warum bewegt sich das Pferd nicht?" — in der Szene von
         * v0.58 stand der Springer in Spalte b, gerollt wurden c und d. Er
         * gehörte also gar nicht dazu, und das Bild sah aus, als wirke das
         * Nudelholz willkürlich.
         *
         * Jetzt steht in beiden gerollten Spalten je etwas, oben wie unten,
         * und alles davon rückt vor: Der Springer bewegt sich mit, und man
         * sieht zugleich, dass NUR diese zwei Spalten betroffen sind.
         */
        nudelholz: {
            brett: [
                "......",
                "..s...",
                "...b..",
                "..B...",
                "...L..",
                "......"
            ],
            figur: -1,
            ziel: 32,
            /* KEIN `nachspiel` MEHR (seit v0.80): Das Nudelholz beendet den
               Zug, danach ist der Gegner dran — ein eigener Zug im Anschluss
               wäre eine Lüge im Bild. Bis v0.79 zeigte das dritte Bild genau
               das, was die Fähigkeit jetzt nicht mehr hergibt. */
            vorher: "Angetippt wird ein Randfeld — von dort rollt das Holz "
                + "über die ganze Bahn. Mit dem Knopf am Brett drehst du, von "
                + "welchem Rand es kommt.",
            nachher: "Jede Figur in dieser Spalte rückt ein Feld weiter, "
                + "sobald die Walze sie erreicht — die eigenen wie die "
                + "fremden. Das Nudelholz IST dein Zug."
        },

        /*
         * NACHSCHUB (seit v0.61). Die Szene beantwortet „wozu ein einzelner
         * Bauer ganz hinten?" — er DECKT. Der Läufer steht auf der langen
         * Diagonale und nimmt sich sonst den ungedeckten Turm; der neue Bauer
         * auf b1 deckt a2 und macht den Schlag zum Verlustgeschäft.
         *
         * Kein `nachspiel`: Die Fähigkeit beendet den Zug, danach ist der
         * Gegner dran — ein weiteres Bild würde etwas zeigen, das es nicht gibt.
         */
        nachschub: {
            brett: [
                "......",
                "...l..",
                "......",
                "......",
                "T.....",
                "......"
            ],
            figur: -1,
            ziel: 31,
            vorher: "Der schwarze Läufer steht auf der langen Diagonale und "
                + "zielt auf "
                + "deinen Turm. Gedeckt ist der von niemandem.",
            nachher: "Der neue Bauer tritt auf deiner Grundreihe an und deckt "
                + "genau "
                + "dieses Feld. Jetzt kostet der Schlag den Läufer."
        },
        mauer: {
            brett: [
                "..t...",
                "l.....",
                "......",
                ".S....",
                "......",
                "..D..."
            ],
            figur: -1,
            ziel: 14,
            nachspiel: [19, 6],
            vorher: "Der schwarze Turm zielt die ganze Spalte hinunter auf "
                + "deine Dame.",
            nachher: "Die Mauer legt sich um das angetippte Feld und sperrt "
                + "die "
                + "Spalte — für beide Seiten. Die Zahl zählt herunter, bis sie "
                + "zerfällt.",
            nachsatz: "Nur Springer setzen darüber hinweg — und weil die Mauer "
                + "dich "
                + "keinen Zug kostet, tut deiner das sofort und holt den "
                    + "Läufer."
        },

        /* ---- Episch: kostet den Gegner etwas ---- */

        /*
         * FROST NEU GESTELLT (v0.58, Punkt G15) — er sperrt seit v0.56 eine
         * FLÄCHE. Beide Angreifer der Dame stehen im selben 2×2-Block; das
         * letzte Bild zeigt, was das Pluszeichen wert ist.
         */
        /*
         * DER TURM IST JETZT ERKLÄRT (v0.75, Meldung I18: „woher kommt der
         * Turm?"). Bis v0.74 stand er in der einen Ecke und schlug einen Bauern
         * in der anderen — beide hatten mit der Szene nichts zu tun. Jetzt
         * steht er von Anfang an in derselben Spalte wie sein Ziel: Man sieht
         * im ersten Bild, was er vorhat, und im letzten, dass der Frost ihm den
         * Zug dafür gelassen hat.
         */
        frost: {
            brett: [
                "......",
                "..sl..",
                "....b.",
                ".D....",
                "......",
                "....T."
            ],
            figur: 8,
            ziel: 8,
            nachspiel: [34, 16],
            vorher: "Springer und Läufer haben beide deine Dame im Visier — "
                + "einer "
                + "von ihnen holt sie.",
            nachher: "Der Frost sperrt ein 2-mal-2-Feld: Beide kommen einen "
                + "Zug lang nicht heraus und sind so lange auch nicht zu "
                + "schlagen. Innen dürfen sie sich bewegen — die blaue Linie "
                + "zeigt den Block.",
            nachsatz: "Und weil er dich keinen Zug kostet, holt sich dein Turm "
                + "derweil den Bauern, auf den er die ganze Zeit gezielt hat."
        },
        verstaerkung: {
            brett: [
                "......",
                ".t.t..",
                "......",
                "..B...",
                "......",
                "......"
            ],
            figur: 20,
            ziel: 20,
            vorher: "Ein einzelner Bauer. An die beiden Türme kommt er nie "
                + "heran.",
            nachher: "Er steigt eine Stufe auf: Aus dem Bauern wird ein "
                + "Springer — "
                + "und der bedroht von hier aus gleich beide. Danach ist der "
                    + "Gegner "
                + "am Zug."
        },
        /*
         * FESSEL NEU GESTELLT (v0.58, Punkt G14). Sie hält seit v0.56 mehrere
         * Züge und lässt die Figur schlagbar — beides zeigt erst das letzte
         * Bild: Man stellt in Ruhe den Turm auf, der sie holt.
         */
        /*
         * DIE FESSEL ZEIGT JETZT DEN SCHLAG (v0.75, Meldung I17).
         *
         * Bis v0.74 endete die Anleitung damit, dass der Turm sich aufstellt —
         * ob der Läufer wirklich fällt, blieb eine Behauptung. Das letzte Bild
         * holt ihn jetzt (`nachschlag`), und dazwischen zieht der Gegner
         * einmal: Genau darum geht es bei einer Fessel, die MEHRERE Halbzüge
         * hält.
         *
         * Der schwarze Bauer oben links ist dafür da, dass der Gegner
         * überhaupt ziehen KANN — der Läufer ist ja gefesselt. Ohne ihn wäre
         * Schwarz patt, und die Anleitung endete eine Runde zu früh.
         */
        fessel: {
            brett: [
                "b.....",
                "......",
                "..l...",
                "......",
                "....B.",
                "T....."
            ],
            figur: 14,
            ziel: 14,
            nachspiel: [30, 32],
            nachschlag: [32, 14],
            vorher: "Der schwarze Läufer greift deinen Bauern an — und könnte "
                + "jederzeit wegziehen.",
            nachher: "Gefesselt: Er bleibt mehrere Züge stehen. Die Zahl an "
                + "seinem "
                + "Feld zählt herunter — geschlagen werden kann er dabei ganz "
                    + "normal.",
            nachsatz: "Die Fessel kostet dich keinen Zug: Du stellst deinen "
                + "Turm "
                + "gleich so, dass er ihn als Nächstes holt.",
            nachschlagSatz: "Der Gegner zieht — nur der Läufer nicht, der "
                + "steht "
                + "fest. Und dann holt ihn dein Turm wirklich."
        },

        /* ---- Legendär ---- */

        /*
         * DOPPELZUG ALS KOMBINATIONSSCHLAG (v0.58, Punkt H10). Bis v0.57 schlug
         * der Turm einen Bauern und durfte „zurück" — das zeigte den zweiten
         * Zug, aber nicht, wozu er gut ist. Jetzt holt er zwei Figuren.
         */
        /*
         * DER LÄUFER RÜCKT VOM RAND WEG (v0.75, Meldung I20: „der Läufer ist am
         * PC nicht zu sehen"). Er stand in der äussersten Spalte und ging dort
         * im Rahmen unter. Zwei Felder weiter innen bleibt der Kombinationszug
         * derselbe, nur sieht man jetzt beide Ziele.
         *
         * Der zweite Teil der Meldung („Bild 1 weg") ist bewusst NICHT gebaut —
         * die Begründung steht in `entscheidungen\offen-und-abgelehnt.md`.
         */
        doppelzug: {
            brett: [
                "......",
                "......",
                "..b.l.",
                "..T...",
                "......",
                "......"
            ],
            figur: 20,
            ziel: -1,
            zug: [20, 14],
            nachspiel: [14, 16],
            vorher: "Der Turm kann den Bauern schlagen — und dahinter steht "
                + "noch "
                + "ein Läufer.",
            nachher: "Geschlagen, und dein Team ist sofort wieder am Zug: Die "
                + "Punkte "
                + "zeigen, wohin derselbe Turm gleich noch darf.",
            nachsatz: "Er nimmt den Läufer dazu — zwei Figuren, ein Zugrecht."
        },

        /*
         * DIE WIEDERGEBURT ZEIGT DEN TOD (v0.58, Punkt H7).
         *
         * Bis v0.57 stand die Dame einfach in `verloren`, und das erste Bild
         * behauptete, sie sei gefallen — zu sehen war davon nichts. Jetzt
         * beginnt die Anleitung eine Stellung früher: Die Dame lebt, der Turm
         * schlägt sie, DANN kommt die Fähigkeit. Der Schlag wird mit den
         * echten Regeln gerechnet (`todeszug`), also stimmen Brett, `verloren`
         * und `gefallen` zwangsläufig überein.
         */
        /*
         * DER BAUER AUF a1 IST PFLICHT, nicht Beiwerk: Ohne ihn hätte Weiss
         * nach dem Schlag KEINE Figur mehr, `SCHACH_RUNDE.ziehen` erkennt Patt
         * und beendet die Partie — danach lässt sich keine Fähigkeit mehr
         * einsetzen, und die ganze Anleitung fällt weg. Beim Schreiben eines
         * Beispiels mit `todeszug` also immer prüfen, ob beide Seiten danach
         * noch einen Zug haben.
         */
        wiedergeburt: {
            brett: [
                "......",
                "..t...",
                "......",
                "......",
                "..D...",
                "B....."
            ],
            figur: -1,
            ziel: 33,
            todeszug: [8, 26],
            vorspiel: "Deine Dame steht mitten auf dem Brett — und der "
                + "schwarze Turm "
                + "hat freie Bahn auf sie.",
            vorher: "Er schlägt sie. Angetippt wird jetzt ein freies Feld "
                + "deiner "
                + "eigenen Grundreihe.",
            nachher: "Sie kehrt zurück — hinten, weit weg vom Geschehen. "
                + "Danach ist "
                + "der Gegner am Zug."
        },
        spiegel: {
            brett: [
                "..t...",
                "......",
                "......",
                "..D...",
                "......",
                "......"
            ],
            figur: 20,
            ziel: 20,
            vorher: "Der schwarze Turm steht deiner Dame gegenüber. Eine Dame "
                + "ist gut.",
            nachher: "Zwei sind besser: Die Kopie erscheint auf einem freien "
                + "Feld "
                + "daneben — aus dem Nichts steht dort eine zweite. Danach ist "
                    + "der "
                + "Gegner am Zug."
        },
        wiederbelebung: {
            /* Der Bauer auf a1 hält die Stellung am Leben — ohne eine eigene
               Figur wäre Weiss patt, siehe die Anmerkung bei der Wiedergeburt. */
            brett: [
                "......",
                "......",
                "..t...",
                "......",
                "......",
                "B....."
            ],
            figur: 20,
            ziel: 20,
            gefallen: [{ art: "T", feld: 20 }],
            vorher: "Hier fiel dein Turm — direkt vor dem gegnerischen. Blass "
                + "siehst "
                + "du, wo. Das Feld ist frei.",
            nachher: "Er steht genau dort wieder auf, mitten im Geschehen, und "
                + "hält "
                + "den Gegner sofort auf. Danach ist der Gegner am Zug."
        },
        friedhof: {
            /* Der Bauer auf a1 steht ausserhalb des 2×2-Blocks und hält die
               Stellung am Leben — siehe die Anmerkung bei der Wiedergeburt. */
            brett: [
                ".....t",
                "......",
                "......",
                "......",
                "......",
                "B....."
            ],
            figur: -1,
            ziel: 14,
            /*
             * SEIT v0.54 MÜSSEN DIE GEFALLENEN IM BLOCK LIEGEN. Die Fähigkeit
             * weckt, wer GENAU DORT fiel — also stehen sie hier auf den vier
             * Feldern des 2×2-Blocks, dessen linke obere Ecke `ziel` ist
             * (14, 15, 20, 21). Lägen sie woanders, zeigte die Anleitung eine
             * Wirkung, die es nicht gibt.
             */
            beute: [
                { art: "B", feld: 14 },
                { art: "L", feld: 15 },
                { art: "S", feld: 20 },
                { art: "T", feld: 21 }
            ],
            vorher: "Hier sind vier GEGNER gefallen — blass siehst du, wo. "
                + "Angetippt "
                + "wird die linke obere Ecke des 2-mal-2-Feldes.",
            nachher: "Genau die, die dort fielen, stehen in DEINER Farbe "
                + "wieder auf "
                + "— jeder auf seinem Feld. Die Zahl sagt, wie lange sie "
                    + "bleiben: "
                + "Je stärker die Figur, desto kürzer."
        },
        /*
         * Der Händler zieht sein Angebot aus dem Spielstand — WELCHES es ist,
         * steht also nicht hier. Deshalb trägt sein Beispiel von jeder
         * Figurenart genug, damit jedes Angebot der Tabelle bedient werden
         * kann. Sonst zeigte die Anleitung eines Tages nichts, weil gerade ein
         * Tausch gezogen wurde, für den die Figuren fehlen.
         */
        haendler: {
            brett: [
                ".....t",
                "......",
                "......",
                "BBBBB.",
                "TT.SL.",
                "....D."
            ],
            figur: -1,
            ziel: -1,
            vorher: "Bauern, Türme, ein Springer, ein Läufer, eine Dame — der "
                + "Händler bedient sich aus dem, was du dastehen hast.",
            nachher: "Angenommen: Der Tausch ist vollzogen, ungefähr "
                + "gleichwertig. "
                + "Was er anbietet, wechselt mit jedem Zug — und danach ist "
                    + "der "
                + "Gegner am Zug."
        },

        /*
         * Der Dieb ist die einzige Fähigkeit, die auf dem BRETT gar nichts
         * ändert — sie räumt nur den Vorrat des Gegners. Das Bild kann davon
         * also nichts zeigen; beide Seiten sehen gleich aus, und der Text
         * erklärt, wo es stattfindet. Ein erfundenes Bild wäre hier
         * irreführender als keines.
         */
        enttarnen: {
            brett: [
                ".....t",
                "......",
                "..s...",
                ".B....",
                "TT..L.",
                "....D."
            ],
            figur: -1,
            ziel: -1,

            /* Drei Lootboxen im Bild (seit v0.118, Nutzer-Zuruf): Im
               Vorher-Bild sind sie grau (die Partie verbirgt die
               Seltenheit — `regeln`), im Nachher-Bild farbig. */
            boxen: [
                { feld: 7, stufe: "gruen" },
                { feld: 16, stufe: "blau" },
                { feld: 21, stufe: "lila" }
            ],
            regeln: { seltenheitZeigen: false },

            vorher: "Diese Partie verbirgt die Seltenheit: Jede liegende "
                + "Lootbox "
                + "sieht aus wie jede andere, man weiss nie, ob sich das "
                    + "Einsammeln "
                + "lohnt.",
            nachher: "Enttarnt: Für 6 Halbzüge trägt jede Lootbox ihre Farbe — "
                + "du siehst, wie SELTEN sie ist. Was drin steckt, verrät sie "
                + "nicht."
        },

        /*
         * Verstecken (seit v0.98) — die Wirkung liegt in der Ansicht des
         * GEGNERS. Seit v0.118 (Nutzer-Zuruf) zeigt das Nachher-Bild genau
         * DIESE Sicht: farbige Lootboxen vorher, graue nachher — der Text
         * sagt dazu, dass es die Sicht des Gegners ist.
         */
        verstecken: {
            brett: [
                ".....t",
                "......",
                "..s...",
                ".B....",
                "TT..L.",
                "....D."
            ],
            figur: -1,
            ziel: -1,

            boxen: [
                { feld: 7, stufe: "gruen" },
                { feld: 16, stufe: "blau" },
                { feld: 21, stufe: "lila" }
            ],

            vorher: "Diese Partie zeigt die Seltenheit: Jeder sieht an der "
                + "Farbe, "
                + "welche Lootbox sich lohnt — und der Gegner rechnet damit.",
            nachher: "Versteckt: So sieht der GEGNER das Brett jetzt — für "
                + "6 Halbzüge nur noch graue Lootboxen, er muss raten, welche "
                + "etwas taugt. Du selbst siehst die Farben weiter. Du bleibst "
                + "am Zug."
        },

        dieb: {
            brett: [
                ".....t",
                "......",
                "..s...",
                ".B....",
                "TT..L.",
                "....D."
            ],
            figur: -1,
            ziel: -1,
            /* Der Gegner muss etwas haben, sonst greift der Dieb ins Leere und
               das Beispiel liesse sich nicht bauen. */
            gegnerVorrat: ["sprung", "mauer"],
            vorher: "Der Griff geht nicht aufs Brett, sondern in den Vorrat: "
                + "Du siehst vorher, welche bis zu zwei Fähigkeiten du dem "
                    + "Gegner "
                + "abnimmst.",
            nachher: "Angenommen: Die Fähigkeiten liegen jetzt in DEINEM "
                + "Vorrat, "
                + "beim Gegner fehlen sie. Auf dem Brett ändert sich dabei "
                    + "nichts — "
                + "und danach ist der Gegner am Zug."
        }
    },

    /*
     * Die Beispiele zu den Unglückswürfeln. Sie tragen zusätzlich `wuerfel`:
     * das Feld, auf dem der Würfel liegt. Eingesammelt wird er, indem die
     * eigene Figur mit `zug` darauf zieht — auch das läuft durch den echten
     * Weg (`SCHACH_RUNDE.ziehen` sammelt ein und löst aus).
     */
    /*
     * JEDES DIESER BILDER ZEIGT EINEN SCHADEN (seit v0.50). Ein Unglückswürfel
     * ist keine Belohnung, und das Beispiel soll das auch nicht so aussehen
     * lassen: In der Ausgangsstellung steht immer etwas, das durch den Würfel
     * kaputtgeht — ein Angriff, der zusammenfällt, eine Figur, die überläuft.
     */
    PECH_BEISPIELE: {
        /*
         * STOLPERSTEIN NEU GESTELLT (v0.58, Punkt F5). Der Zug geht jetzt von
         * unten quer durch das Würfelfeld auf ein Feld weit oben — und genau
         * dort kommt die Figur NICHT an. Vorher lag der Würfel auf dem
         * Zielfeld, und der Rückwurf sah aus wie ein kurzer Zug.
         */
        /*
         * STOLPERSTEIN: DER ABGEBROCHENE ANGRIFF (v0.75, Meldung I13).
         *
         * Bis v0.74 zog der Turm ins Leere — man sah den Rückwurf, aber nicht,
         * was er kostet. Jetzt steht am Ende der Spalte ein Läufer, den er
         * schlagen wollte: Der Stein wirft ihn zurück, und weil er sein Ziel
         * nicht erreicht, schlägt er dort auch nichts (seit v0.73). Der Läufer
         * bleibt stehen — das ist der Schaden.
         *
         * Zurückgeworfen wird seit v0.73 AB DEM FELD DER LOOTBOX und entgegen
         * der Zugrichtung: Der Turm landet also genau ein Feld darunter, nicht
         * mehr ein Feld unter seinem Zielfeld.
         */
        stolperstein: {
            brett: [
                "......",
                "..l...",
                "......",
                "......",
                "......",
                "..T..."
            ],
            figur: 32,
            wuerfel: 20,
            zug: [32, 8],
            vorher: "Der Turm will die Spalte hinauf und den Läufer schlagen — "
                + "auf "
                + "dem Weg liegt eine Lootbox.",
            nachher: "Es war ein schlechter: Er stolpert am Stein zurück, "
                + "dorthin, "
                + "wo er hergekommen ist. Der Läufer steht noch — wer sein "
                    + "Ziel "
                + "nicht erreicht, schlägt dort auch nichts."
        },

        /*
         * VOLLES GLAS NEU GESTELLT (v0.58, Punkt F6). Der Turm ist eingebaut
         * und kommt nur nach oben heraus — über den Würfel. Er MUSS also, statt
         * zufällig darüber zu ziehen.
         */
        /*
         * HALLUZINATION NEU GESTELLT (v0.75, Meldung I12). Zwei Dinge fehlten:
         * Der Zug endete auf dem Würfelfeld, statt bis zum Schlag durchzugehen
         * — und es standen zu wenige Gegner da, um die Verwandlung überhaupt
         * zu sehen. Jetzt zieht der Turm ÜBER die Lootbox hinweg und holt den
         * Springer dahinter; drei weitere schwarze Figuren bleiben stehen und
         * sehen danach anders aus, als sie sind.
         */
        vollesGlas: {
            brett: [
                ".t..b.",
                "..s.l.",
                "......",
                ".BTB..",
                "..B...",
                "......"
            ],
            figur: 20,
            wuerfel: 14,
            zug: [20, 8],
            vorher: "Der Turm ist von den eigenen Leuten eingebaut — heraus "
                + "kommt er "
                + "nur nach oben. Dort liegt eine Lootbox, und dahinter steht "
                    + "der "
                + "Springer, den er holen will.",
            nachher: "Geschlagen hat er ihn — die Lootbox war trotzdem eine "
                + "schlechte: Für DICH sehen die gegnerischen Figuren eine "
                + "Weile falsch aus. Sie ziehen wie immer."
        },

        /*
         * AUSDEHNUNG NEU GESTELLT (v0.58, Punkt G12). Der Schaden gehört jetzt
         * DIR: Dein Bauer stand kurz vor der Umwandlung, und das gewachsene
         * Brett schiebt sie ausser Reichweite.
         */
        ausdehnung: {
            /*
             * Die eigene Saat sorgt dafür, dass das Brett OBEN wächst — nur
             * dort trifft es den Bauern, der kurz vor der Umwandlung steht.
             * An welcher Seite gewachsen wird, streut über die Partie-Kennung;
             * dieses Beispiel bekommt deshalb eine eigene.
             */
            saat: "vorschau-a",

            /*
             * OHNE GEGNERISCHEN BAUERN VOR DEM TURM (v0.75, Meldung I15). Bis
             * v0.74 stand ein schwarzer Bauer auf der eigenen Grundreihe —
             * dort hätte er längst umgewandelt sein müssen —, und der Turm
             * stand direkt darüber: Jeder normale Spieler hätte ihn geschlagen,
             * statt auf die Lootbox zu ziehen. Der Gegner steht jetzt abseits.
             */
            brett: [
                "......",
                "B.....",
                "......",
                "......",
                "..T...",
                ".....l"
            ],
            figur: 26,
            wuerfel: 20,
            zug: [26, 20],
            vorher: "Ein Zug noch, dann wandelt dein Bauer um — und der Turm "
                + "holt "
                + "sich vorher noch die Lootbox.",
            nachher: "Es war ein schlechter: Das Brett wächst an einer "
                + "zufälligen "
                + "Seite. Plötzlich ist alles weiter weg, und der Bauer "
                    + "braucht "
                + "wieder länger."
        },

        /*
         * EINSTURZ NEU GESTELLT (v0.58, Punkt G13). Vorher standen nur
         * gegnerische Bauern am Rand — das Bild war ein Geschenk. Jetzt
         * stehen EIGENE Figuren an den Rändern und stürzen mit.
         */
        /*
         * DER ANGRIFF GELINGT (v0.75, Meldung I16). Bis v0.74 zog der Turm nur
         * ein Feld auf die Lootbox und schlug nichts — der Einsturz sah aus wie
         * die einzige Wirkung. Jetzt sammelt er im VORBEIZIEHEN ein, erreicht
         * sein Ziel und schlägt den gegnerischen Turm; nebenbei bricht eine
         * Seite weg und nimmt eigene Bauern mit. Anders als beim Erdbeben
         * bricht der Zug dabei nicht ab: Ein Würfel, der die Brettgrösse
         * ändert, lässt den Zug ausdrücklich in Ruhe (siehe
         * `_zugAmRissAbbrechen`).
         */
        schrumpfung: {
            brett: [
                "..t..s",
                "B....B",
                "......",
                "..T...",
                "......",
                "B....B"
            ],
            figur: 20,
            wuerfel: 14,
            zug: [20, 2],
            vorher: "Vier eigene Bauern halten die Ränder, und der Turm zieht "
                + "auf "
                + "den gegnerischen los — die Lootbox liegt auf dem Weg.",
            nachher: "Der Angriff geht durch, die Lootbox war trotzdem eine "
                + "schlechte: Eine ganze Reihe bricht weg, und was dort stand, "
                + "stürzt mit — auch die eigenen Leute."
        },
        /*
         * ERDBEBEN NEU GESTELLT (v0.58, Punkt H8).
         *
         * Gezeigt werden soll, dass ein Riss den Weg wirklich sperrt — und
         * dass man einen Würfel auch im VORBEIZIEHEN einsammelt. Der Turm
         * fährt deshalb die ganze Spalte hinauf und nimmt ihn unterwegs mit.
         *
         * DAS VOLLE BRETT IST WEG (v0.75, Meldung I19: „ergibt keinen Sinn").
         *
         * Bis v0.74 stand die Stellung absichtlich voll: `erdbebenRisse` trifft
         * FREIE Felder, und auf einem leeren Brett landen die drei Risse
         * irgendwo — das Bild erzählte dann nichts. Nur sah ein Brett mit 28
         * Bauern eben auch nach nichts aus.
         *
         * Der bessere Weg ist derselbe wie bei der Ausdehnung: eine eigene
         * `saat`. Sie ist die Partie-Kennung dieser Szene, und aus ihr rechnet
         * das Regelwerk die Risse — `vorschau-e12` legt einen davon in die
         * Spalte des Turms, ein Feld VOR ihn. Gesucht wurde sie nicht von Hand,
         * sondern durchprobiert; die REGEL bleibt unangetastet (eiserne Regel:
         * nie die Regel anfassen, damit ein Bild passt).
         */
        erdbeben: {
            saat: "vorschau-e12",
            brett: [
                "..l..s",
                "......",
                "......",
                "......",
                "......",
                "..T..."
            ],
            figur: 32,
            wuerfel: 20,
            zug: [32, 2],
            vorher: "Der Turm will die ganze Spalte hinauf und den Läufer "
                + "schlagen — "
                + "die Lootbox nimmt er unterwegs mit, ohne stehen zu bleiben.",
            nachher: "Es war eine schlechte: Der Boden reisst SOFORT auf, "
                + "mitten in seinem Weg — der Zug endet vor dem Loch. Die Risse "
                + "bleiben die ganze Partie."
        },

        /*
         * ERDRUTSCH HÄRTER GESTELLT (v0.58, Punkt H9). Es rutscht nicht nur
         * die Figur zurück, die den Würfel eingesammelt hat: Der Bauer, der
         * gerade selbst hätte schlagen können, verliert sein Ziel mit.
         */
        erdrutsch: {
            brett: [
                "......",
                "..b..b",
                "....B.",
                "..T...",
                "......",
                "......"
            ],
            figur: 20,
            wuerfel: 14,
            zug: [20, 14],
            vorher: "Dein Angriff steht: Der Turm rückt vor, und der Bauer "
                + "nimmt "
                + "schon den zweiten ins Visier.",
            nachher: "Alle eigenen Figuren rutschen ein Feld zurück — nicht "
                + "nur die, "
                + "die die Lootbox eingesammelt hat. Beide Angriffe sind dahin."
        },
        /*
         * ES LÄUFT EIN TURM ÜBER, KEIN BAUER (v0.75, Meldung I22: „Meuterei ist
         * nicht negativ genug").
         *
         * Erzwungen wird das nicht mit einer Sonderregel, sondern mit der
         * Stellung: `SCHACH.meuterei` zieht eine BELIEBIGE eigene Figur, und
         * hier sind alle eigenen Figuren Türme. Welcher der beiden es trifft,
         * bleibt gerechnet — teuer ist es so oder so.
         */
        meuterei: {
            brett: [
                "t.....",
                "......",
                "..T...",
                "......",
                "......",
                "T....."
            ],
            /* `figur` markiert im ERSTEN Bild, worum es geht — das ist der
               Turm auf seinem Startfeld, nicht sein Ziel. */
            figur: 14,
            wuerfel: 20,
            zug: [14, 20],
            vorher: "Zwei Türme, und noch gehören beide dir.",
            nachher: "Einer läuft zum Gegner über und kämpft ab sofort GEGEN "
                + "dich — doppelt so schlimm wie ein Verlust. Könige meutern "
                + "nicht."
        }
    },

    /* ---------------------------------------------------------------- *
     * Die Bilder
     * ---------------------------------------------------------------- */

    /* Gibt es zu dieser Fähigkeit (oder diesem Unglückswürfel) ein Beispiel? */
    beispielVon(art) {
        return SCHACH_VORSCHAU.BEISPIELE[art]
            || SCHACH_VORSCHAU.PECH_BEISPIELE[art]
            || null;
    },

    /*
     * Baut die Beispiel-Partie: laufend, der Betrachter spielt Weiss.
     *
     * `amZug` ist wahlfrei — gebraucht wird das für Fähigkeiten, die NUR im
     * Gegenzug gehen (seit v0.58 das Ausweichen). Bei ihnen muss die
     * Ausgangsstellung Schwarz am Zug zeigen, sonst weist
     * `faehigkeitEinsetzen` das Beispiel zu Recht ab.
     */
    _rundeRoh(beispiel, amZug) {
        return SCHACH_RUNDE.normalisieren({
            /*
             * DIE KENNUNG IST DIE SAAT (seit v0.58).
             *
             * Alles Gerechnete im Spiel streut über die Partie-Kennung — auch
             * die Seite, an der das Brett wächst oder einstürzt. Ein Beispiel,
             * das eine BESTIMMTE Wirkung zeigen soll („dein Bauer schafft es
             * nicht mehr zur Dame"), braucht deshalb eine eigene Kennung. Das
             * ist keine Ausnahme von der Regel, sondern genau ihre Anwendung:
             * Jede Partie hat ihre eigene, und dieses Beispiel ist eine.
             */
            id: beispiel.saat || "vorschau",
            variante: SCHACH_VARIANTEN.STANDARD,
            laeuft: true,
            zugZaehler: 0,
            teams: { weiss: [SCHACH_VORSCHAU.SPIELER], schwarz: ["id-gegner"] },
            bereit: { weiss: true, schwarz: true },
            bonusFassung: 2,

            /* `boxen` legt mehrere Lootboxen frei ins Bild (seit v0.118,
               für Enttarnen/Verstecken: `[{ feld, stufe }]`); `wuerfel` ist
               der ältere Weg für den EINEN Unglückswürfel. */
            bonus: Array.isArray(beispiel.boxen)
                ? beispiel.boxen
                : (Number.isInteger(beispiel.wuerfel)
                    ? [{ feld: beispiel.wuerfel, art: beispiel.art || "", pech: true }]
                    : []),

            /* Wahlfreie Regel-Abweichung des Beispiels (seit v0.118) —
               Enttarnen spielt in einer Partie OHNE sichtbare Seltenheit. */
            regeln: beispiel.regeln,
            verloren: {
                weiss: Array.isArray(beispiel.verloren) ? beispiel.verloren : [],
                schwarz: []
            },
            /*
             * `gegnerVorrat` gibt dem Gegner Fähigkeiten in die Hand (seit
             * v0.85, für den Dieb). Bisher brauchte keine Anleitung das: Jede
             * Fähigkeit wirkte auf das BRETT, und dort steht ohnehin alles.
             * Der Dieb greift als erste in den Vorrat des Gegners — ohne
             * Inhalt liesse er sich im Beispiel gar nicht einsetzen.
             */
            faehigkeiten: {
                weiss: [],
                schwarz: Array.isArray(beispiel.gegnerVorrat)
                    ? beispiel.gegnerVorrat : []
            },
            /* Die Gefallenen tragen ihren ORT: Die Wiederbelebung holt die
               eigene Figur genau dorthin zurück, der Friedhof lässt gefallene
               GEGNER auf einem freien Platz aufstehen. */
            gefallen: {
                weiss: Array.isArray(beispiel.gefallen) ? beispiel.gefallen : [],
                schwarz: Array.isArray(beispiel.beute) ? beispiel.beute : []
            },
            stand: {
                brett: SCHACH_VORSCHAU._brett(beispiel.brett),
                breite: SCHACH_VORSCHAU.BREITE,
                hoehe: SCHACH_VORSCHAU.HOEHE,
                amZug: amZug || SCHACH_VORSCHAU.FARBE,
                rochade: "",
                rochadeFelder: [],
                rochadeKoenige: []
            }
        });
    },

    /*
     * Fängt die Stellung an, in der die Fähigkeit gedrückt wird.
     *
     * ZWEI FÄLLE MACHEN AUS DER AUSGANGSSTELLUNG ETWAS ANDERES:
     *
     *   `todeszug`        Der Gegner schlägt zuerst eine eigene Figur (seit
     *                     v0.58, für die Wiedergeburt). Erst dadurch entsteht
     *                     der Verlust, den die Fähigkeit heilt — und zwar
     *                     GERECHNET, nicht in `verloren` eingetragen. Die
     *                     Anleitung zeigt den Tod dann als eigenes Bild.
     *   `nurImGegenzug`   Die Fähigkeit geht nur, während der Gegner am Zug
     *                     ist (Ausweichen). Dann beginnt das Beispiel mit
     *                     Schwarz am Zug.
     */
    _runde(beispiel) {
        const beschreibung = SCHACH_VARIANTEN.FAEHIGKEITEN[beispiel.art] || {};

        if (!beispiel.todeszug) {
            return SCHACH_VORSCHAU._rundeRoh(beispiel,
                beschreibung.nurImGegenzug ? SCHACH.gegner(SCHACH_VORSCHAU.FARBE) : " ");
        }

        return SCHACH_VORSCHAU._nachDemTod(beispiel);
    },

    /*
     * Die Stellung NACH dem Schlag des Gegners. Gerechnet mit
     * `SCHACH_RUNDE.ziehen` — dadurch entstehen `verloren` und `gefallen` von
     * selbst und stimmen mit dem überein, was auf dem Brett zu sehen ist.
     */
    _nachDemTod(beispiel) {
        const vorher = SCHACH_VORSCHAU._rundeRoh(beispiel,
            SCHACH.gegner(SCHACH_VORSCHAU.FARBE));

        const gezogen = SCHACH_RUNDE.ziehen(vorher, "id-gegner",
            beispiel.todeszug[0], beispiel.todeszug[1], "D", "", 0);

        return gezogen || vorher;
    },

    /*
     * Zwei Bilder zu einer Fähigkeit:
     *
     *     { vorher: { runde, marken, text }, nachher: { … } }
     *
     * `marken` sind die Felder, auf die es ankommt. Bei einer Fähigkeit mit
     * zusätzlichem Zugmuster sind das im Nachher-Bild die Felder, die NEU
     * erreichbar sind — genau die Auskunft, um die es dort geht.
     *
     * Liefert null, wenn es kein Beispiel gibt oder die Wirkung im Beispiel
     * nicht zustande kommt. Der Bildschirm zeigt dann eben keines; ein Test
     * hält fest, dass das für keine Fähigkeit passiert.
     */
    bilder(art) {
        const beispiel = SCHACH_VORSCHAU.beispielVon(art);
        if (!beispiel) {
            return null;
        }

        const vorher = SCHACH_VORSCHAU._runde(
            Object.assign({}, beispiel, { art: art }));

        const nachher = SCHACH_VARIANTEN.PECH[art]
            ? SCHACH_VORSCHAU._pechRechnen(vorher, art, beispiel)
            : SCHACH_VORSCHAU._faehigkeitRechnen(vorher, art, beispiel);

        if (!nachher) {
            return null;
        }

        const vorherMarken = [];
        if (Number.isInteger(beispiel.figur) && beispiel.figur >= 0) {
            vorherMarken.push(beispiel.figur);
        }
        if (Number.isInteger(beispiel.ziel) && beispiel.ziel >= 0
            && vorherMarken.indexOf(beispiel.ziel) === -1) {
            vorherMarken.push(beispiel.ziel);
        }

        return {
            vorher: { runde: vorher, marken: vorherMarken, text: beispiel.vorher },
            nachher: nachher
        };
    },

    /*
     * DER ABLAUF ALS FOLGE VON BILDERN (seit v0.41) — das, was der Bildschirm
     * abspielt. Jeder Schritt beantwortet eine Frage:
     *
     *   1. Ausgangsstellung   — worum geht es?
     *   2. Fingerabdruck      — WO tippst du hin? (seit v0.44)
     *   3. (bei einem Zug)    — und wohin dann?
     *   4. Wirkung            — was ist daraus geworden?
     *
     * Ein Schritt trägt:
     *
     *     runde   der Spielstand, der gezeichnet wird
     *     marken  die Felder, um die es geht (kräftige Kontur)
     *     wahl    die übrigen möglichen Felder (helle Kontur)
     *     ziele   Felder mit dem ZUGPUNKT — dieselbe Marke wie im Spiel
     *     tipp    das Feld mit dem Fingerabdruck (-1 = keines)
     *     wege    [{ von, nach }] für die Bewegungspfeile
     *     text    ein Satz dazu
     *
     * Die Auswahlfelder werden nicht aufgezählt, sondern gefragt
     * (`SCHACH_RUNDE.zielFelder` / `SCHACH.zuege`) — sonst stünde die Regel
     * zweimal im Programm.
     */
    schritte(art) {
        const bilder = SCHACH_VORSCHAU.bilder(art);
        if (!bilder) {
            return null;
        }

        const beispiel = SCHACH_VORSCHAU.beispielVon(art);
        const vorher = bilder.vorher.runde;
        const breite = SCHACH.breiteVon(vorher.stand);
        const hoehe = SCHACH.hoeheVon(vorher.stand);
        const name = (feld) => SCHACH.feldName(feld, breite, hoehe);

        const hatFigur = Number.isInteger(beispiel.figur) && beispiel.figur >= 0;
        const hatZiel = Number.isInteger(beispiel.ziel) && beispiel.ziel >= 0;

        const liste = [];

        /*
         * ERST DER TOD, DANN DIE HEILUNG (seit v0.58, für die Wiedergeburt).
         *
         * Eine Fähigkeit, die eine gefallene Figur zurückholt, lässt sich nicht
         * erklären, ohne den Verlust zu zeigen — sonst steht im ersten Bild
         * einfach eine Figur weniger, und der Satz behauptet, sie sei gefallen.
         * Mit `todeszug` beginnt die Anleitung eine Stellung früher: Die Figur
         * lebt noch, dann schlägt der Gegner sie. Gerechnet wird der Schlag mit
         * den echten Regeln.
         */
        if (beispiel.todeszug) {
            const lebend = SCHACH_VORSCHAU._rundeRoh(beispiel,
                SCHACH.gegner(SCHACH_VORSCHAU.FARBE));

            liste.push(SCHACH_VORSCHAU._schritt({
                runde: lebend,
                marken: [beispiel.todeszug[1]],
                text: beispiel.vorspiel || ("Noch steht deine Figur auf "
                    + name(beispiel.todeszug[1]) + ".")
            }));

            liste.push(SCHACH_VORSCHAU._schritt({
                runde: vorher,
                marken: [beispiel.todeszug[1]],
                wege: [{ von: beispiel.todeszug[0], nach: beispiel.todeszug[1] }],
                text: beispiel.vorher
            }));

        } else {
            liste.push(SCHACH_VORSCHAU._schritt({
                runde: vorher,
                marken: hatFigur ? [beispiel.figur] : [],
                text: beispiel.vorher
            }));
        }

        /*
         * ZUERST DRÜCKT MAN DIE FÄHIGKEIT (seit v0.50).
         *
         * Bis v0.49 begann die Anleitung beim Brett — bei „Bauernschub" und
         * „Händler" zeigte sie überhaupt keinen Handgriff, und bei Sprung,
         * Ausweichen und Teleport sprang sie von der Ausgangsstellung direkt zu
         * den neuen Punkten. Wer die Fähigkeit zum ersten Mal einsetzt, sucht
         * aber genau das: WO fange ich an? Der erste Griff geht immer an den
         * Vorrat, und der ist jetzt ein eigenes Bild.
         *
         * Unglückswürfel bekommen es nicht: Sie werden nie gedrückt, sondern
         * eingesammelt — dort ist der erste Griff die eigene Figur.
         */
        const beschreibung = SCHACH_VARIANTEN.FAEHIGKEITEN[art];
        if (beschreibung) {
            liste.push(SCHACH_VORSCHAU._schritt({
                runde: vorher,
                marken: hatFigur ? [beispiel.figur] : [],
                knopfTipp: true,
                text: "Du tippst " + beschreibung.titel + " in deinem Vorrat an."
                    + (hatZiel || beispiel.zug
                        ? " Danach fragt das Brett nach dem Rest."
                        : " Mehr ist nicht zu tun — sie wirkt sofort.")
            }));
        }

        /*
         * DER HÄNDLER ZEIGT SEIN ANGEBOT (seit v0.58, Punkt G16).
         *
         * Er ist die einzige Fähigkeit mit einer Rückfrage — und bis v0.57
         * fehlte in der Anleitung genau die: Man sah den Griff an den Vorrat
         * und dann das Ergebnis, aber nie das Angebot dazwischen. Gefragt wird
         * `SCHACH_RUNDE.handelsAngebot`, also dasselbe, was der Dialog zeigt;
         * markiert werden die Felder, die weggehen, und die, auf denen etwas
         * erscheint.
         */
        if (beschreibung && beschreibung.art === "handel") {
            const angebot = SCHACH_RUNDE.handelsAngebot(vorher, SCHACH_VORSCHAU.FARBE);

            if (angebot) {
                const namen = (felder) => felder
                    .map((feld) => name(feld))
                    .join(", ");

                liste.push(SCHACH_VORSCHAU._schritt({
                    runde: vorher,
                    marken: angebot.gibtFelder.concat(angebot.bekommtFelder)
                        .filter((feld, stelle, alle) => alle.indexOf(feld) === stelle),

                    /*
                     * DAS FENSTER GEHÖRT INS BILD (seit v0.75, Meldung I6).
                     *
                     * v0.58 hat das Angebot als SATZ gebaut — gemeint war das
                     * Fenster, in dem man annimmt oder ablehnt. Der Händler ist
                     * die einzige Fähigkeit mit einer Rückfrage, und wer sie
                     * nicht kennt, weiss nicht, dass er ablehnen darf.
                     *
                     * Der Wortlaut kommt aus derselben Quelle wie im Spiel
                     * (`SCHACH_RUNDE.handelsAngebot`), damit Anleitung und
                     * Dialog nicht auseinanderlaufen.
                     */
                    fenster: {
                        titel: "Der Händler bietet",
                        text: angebot.text
                            + "\n\nDu gibst ab: " + namen(angebot.gibtFelder)
                            + "\nDu bekommst auf: " + namen(angebot.bekommtFelder),
                        ja: "Annehmen",
                        nein: "Abbrechen"
                    },

                    text: "So sieht sein Angebot aus. Markiert ist, was "
                        + "weggeht und wo das Neue erscheint. Du darfst "
                        + "ablehnen."
                }));
            }
        }

        if (hatZiel) {
            const moeglich = SCHACH_RUNDE.zielFelder(vorher, SCHACH_VORSCHAU.SPIELER, art);

            liste.push(SCHACH_VORSCHAU._schritt({
                runde: vorher,
                marken: [beispiel.ziel],
                wahl: moeglich.filter((feld) => feld !== beispiel.ziel),
                tipp: beispiel.ziel,
                text: (moeglich.length > 1)
                    ? ("Du tippst " + name(beispiel.ziel) + " an. Hell umrandet "
                        + "sind die anderen Felder, die auch gehen.")
                    : ("Du tippst " + name(beispiel.ziel) + " an.")
            }));

        } else if (beispiel.zug) {
            /*
             * Hier wird gezogen — und ein Zug sind ZWEI Tipper: erst die
             * Figur, dann ihr Ziel. Die Punkte dazwischen sind dieselben, die
             * das echte Brett zeigt.
             */
            const ziele = SCHACH.zuege(vorher.stand, beispiel.zug[0])
                .map((zug) => zug.nach)
                .filter((feld, stelle, alle) => alle.indexOf(feld) === stelle);

            liste.push(SCHACH_VORSCHAU._schritt({
                runde: vorher,
                marken: [beispiel.zug[0]],
                ziele: ziele,
                tipp: beispiel.zug[0],
                text: "Du tippst die Figur auf " + name(beispiel.zug[0])
                    + " an — die Punkte zeigen, wohin sie darf."
            }));

            liste.push(SCHACH_VORSCHAU._schritt({
                runde: vorher,
                marken: [beispiel.zug[1]],
                ziele: ziele,
                tipp: beispiel.zug[1],
                wege: [{ von: beispiel.zug[0], nach: beispiel.zug[1] }],
                text: "Dann tippst du " + name(beispiel.zug[1]) + " an."
            }));
        }

        liste.push(SCHACH_VORSCHAU._schritt({
            runde: bilder.nachher.runde,
            marken: bilder.nachher.marken,
            ziele: bilder.nachher.ziele,
            wege: bilder.nachher.wege,

            /* Im Wirkungs-Bild spielt das Schauspiel der Fähigkeit — dasselbe
               wie am echten Brett (seit v0.116). Arten ohne Schauspiel
               ignorieren die Angabe. */
            schauspiel: art,

            text: bilder.nachher.text
        }));

        /*
         * EIN LETZTES BILD: DIE FIGUR ZIEHT WIRKLICH (seit v0.46).
         *
         * Bei den Zugmustern (Sprung, Ausweichen, Teleport) endete die
         * Anleitung bisher bei den Punkten — „hier kämst du hin". Wie das
         * aussieht, blieb offen. Jetzt wird einer dieser Züge im Beispiel auch
         * ausgeführt, mit Pfeil. Gerechnet wird er wie jeder andere Zug; misst
         * einer, geht das Bild verloren, aber nicht die Anleitung.
         */
        const sprung = SCHACH_VORSCHAU._sprungSchritt(art, bilder.nachher, beispiel, name);
        if (sprung) {
            liste.push(sprung);
        }

        const nachspiel = SCHACH_VORSCHAU._nachspielSchritt(bilder.nachher, beispiel, name);
        if (nachspiel) {
            liste.push(nachspiel);

            const nachschlag = SCHACH_VORSCHAU._nachschlagSchritt(nachspiel, beispiel, name);
            if (nachschlag) {
                liste.push(nachschlag);
            }
        }

        /*
         * DER VORRAT-KNOPF STEHT IN JEDEM BILD (seit v0.58).
         *
         * Bis v0.57 tauchte die Marke nur in dem einen Bild auf, in dem sie
         * gedrückt wird, und verschwand danach wieder — die Anleitung sprang
         * bei jedem Takt in der Höhe. Jetzt steht sie durchgehend unter dem
         * Brett, und nur in dem Bild, in dem man sie drückt, liegt der
         * Fingerabdruck darauf (`knopfTipp`).
         *
         * Gesetzt wird das hier am Ende und nicht in jedem einzelnen Schritt:
         * Es ist eine Eigenschaft der ganzen Anleitung, nicht des Bildes.
         * Unglückswürfel bekommen keine Marke — sie werden nie gedrückt.
         */
        if (beschreibung) {
            for (const schritt of liste) {
                schritt.knopf = beschreibung.titel;
            }
        }

        /*
         * BLASSE GEFALLENE AUCH IN DER ANLEITUNG (seit v0.75, Meldung I21).
         *
         * Am echten Brett zeigen Friedhof und Wiederbelebung seit v0.57, WO
         * jemand gefallen ist — sonst tippt man ins Blaue. Die Anleitung tat es
         * nicht: `_beispielBrettBauen` zeichnete keine Gräber, und die
         * Beispiele der beiden erzählten damit von etwas Unsichtbarem.
         *
         * `graeber` sagt, WESSEN Gefallene blass zu sehen sind — dieselbe
         * Unterscheidung wie `TEAM_SCHACH._grabAuf`: Der Friedhof leiht sich
         * GEGNER, die Wiederbelebung holt EIGENE zurück.
         */
        const graeber = SCHACH_VORSCHAU.GRAEBER_ZEIGEN[art];

        if (graeber) {
            for (const schritt of liste) {
                schritt.graeber = graeber;
            }
        }

        return liste;
    },

    /* Wessen Gefallene eine Anleitung blass zeigt (seit v0.75). */
    GRAEBER_ZEIGEN: {
        friedhof: SCHACH.SCHWARZ,
        wiederbelebung: SCHACH.WEISS
    },

    /*
     * Führt im Beispiel einen der neu möglichen Züge aus — den, der am
     * deutlichsten zeigt, was das Muster kann: das am weitesten entfernte
     * Zielfeld. Nur für Fähigkeiten mit Zugmuster; sonst null.
     */
    _sprungSchritt(art, nachher, beispiel, name) {
        const beschreibung = SCHACH_VARIANTEN.FAEHIGKEITEN[art];
        const figur = beispiel.figur;

        if (!beschreibung || beschreibung.art !== "zugmuster") {
            return null;
        }
        if (!Number.isInteger(figur) || figur < 0
            || !nachher.ziele || nachher.ziele.length === 0) {
            return null;
        }

        const stand = nachher.runde.stand;
        const breite = SCHACH.breiteVon(stand);
        const abstand = (feld) => {
            const dr = SCHACH.reiheVon(feld, breite) - SCHACH.reiheVon(figur, breite);
            const ds = SCHACH.spalteVon(feld, breite) - SCHACH.spalteVon(figur, breite);
            return (dr * dr) + (ds * ds);
        };

        const ziel = nachher.ziele.slice().sort(
            (einer, anderer) => abstand(anderer) - abstand(einer))[0];

        const gezogen = SCHACH_RUNDE.ziehen(nachher.runde, SCHACH_VORSCHAU.SPIELER,
            figur, ziel, "D", "", 0);

        if (!gezogen) {
            return null;
        }

        return SCHACH_VORSCHAU._schritt({
            runde: gezogen,
            marken: [ziel],
            wege: [{ von: figur, nach: ziel }],

            /* Die Hand liegt auf dem Ziel — dorthin tippt man (seit v0.118:
               JEDES Bild, in dem der Betrachter tippt, zeigt die Hand). */
            tipp: ziel,

            text: "So sieht der Zug aus: Die Figur geht von "
                + name(figur) + " nach " + name(ziel) + "."
        });
    },

    /*
     * WAS DAS PLUSZEICHEN WERT IST (seit v0.58).
     *
     * Eine Fähigkeit ohne `beendetZug` lässt einem den Zug. Das steht im Text
     * — zu sehen war es nie. Mit `nachspiel` zieht das Beispiel danach
     * wirklich noch einmal, und zwar so, dass der Zug etwas einbringt: Der
     * Springer setzt über die eigene Mauer, der geschobene Bauer schlägt, der
     * Turm holt sich woanders eine Figur.
     *
     * Gerechnet wird der Zug wie jeder andere. Misslingt er (weil jemand die
     * Stellung geändert hat), fällt das Bild weg, nicht die Anleitung.
     */
    _nachspielSchritt(nachher, beispiel, name) {
        if (!beispiel.nachspiel) {
            return null;
        }

        const gezogen = SCHACH_RUNDE.ziehen(nachher.runde, SCHACH_VORSCHAU.SPIELER,
            beispiel.nachspiel[0], beispiel.nachspiel[1], "D", "", 0);

        if (!gezogen) {
            return null;
        }

        return SCHACH_VORSCHAU._schritt({
            runde: gezogen,
            marken: [beispiel.nachspiel[1]],
            wege: [{ von: beispiel.nachspiel[0], nach: beispiel.nachspiel[1] }],

            /* Auch hier tippt der Betrachter — die Hand aufs Ziel (v0.118). */
            tipp: beispiel.nachspiel[1],

            text: beispiel.nachsatz || ("Dein Zug bleibt dir: Die Figur geht "
                + "von "
                + name(beispiel.nachspiel[0]) + " nach "
                + name(beispiel.nachspiel[1]) + ".")
        });
    },

    /*
     * NOCH EIN ZUG, EINE RUNDE SPÄTER (seit v0.75, Meldung I17).
     *
     * Manche Fähigkeiten wirken über MEHRERE Züge — die Fessel hält vier
     * Halbzüge. Dass das etwas bringt, sieht man erst, wenn die gefesselte
     * Figur wirklich fällt, und dazwischen muss der Gegner einmal ziehen: Die
     * Regeln geben das Zugrecht nicht zweimal hintereinander her.
     *
     * Deshalb zieht hier erst der Gegner (`_gegnerZiehtEinmal`, derselbe Weg
     * wie bei den Zugmustern), dann folgt der Schlag. Klappt eines von beidem
     * nicht, fällt das Bild weg — nicht die Anleitung.
     */
    _nachschlagSchritt(vorheriger, beispiel, name) {
        if (!beispiel.nachschlag) {
            return null;
        }

        const dran = (vorheriger.runde.stand.amZug === SCHACH_VORSCHAU.FARBE)
            ? vorheriger.runde
            : SCHACH_VORSCHAU._gegnerZiehtEinmal(vorheriger.runde);

        if (!dran) {
            return null;
        }

        const gezogen = SCHACH_RUNDE.ziehen(dran, SCHACH_VORSCHAU.SPIELER,
            beispiel.nachschlag[0], beispiel.nachschlag[1], "D", "", 0);

        if (!gezogen) {
            return null;
        }

        return SCHACH_VORSCHAU._schritt({
            runde: gezogen,
            marken: [beispiel.nachschlag[1]],
            wege: [{ von: beispiel.nachschlag[0], nach: beispiel.nachschlag[1] }],

            /* Der Schlag ist ein Tipp auf die gegnerische Figur — die Hand
               liegt darauf (v0.118, Nutzer-Zuruf: „beim Schlagen sieht man
               den Finger nicht"). */
            tipp: beispiel.nachschlag[1],

            text: beispiel.nachschlagSatz || ("Und eine Runde später: von "
                + name(beispiel.nachschlag[0]) + " nach "
                + name(beispiel.nachschlag[1]) + ".")
        });
    },

    /* Füllt einen Schritt auf, damit der Bildschirm nie auf Fehlendes trifft. */
    _schritt(roh) {
        return {
            runde: roh.runde,
            marken: roh.marken || [],
            wahl: roh.wahl || [],
            ziele: roh.ziele || [],
            tipp: Number.isInteger(roh.tipp) ? roh.tipp : -1,
            wege: roh.wege || [],

            /* Ein nachgestelltes Fenster über dem Brett (seit v0.75) — bisher
               nur beim Händler, der als Einziger nachfragt. */
            fenster: roh.fenster || null,

            /*
             * `knopf` (seit v0.50) und `knopfTipp` (seit v0.58).
             *
             * `knopf` ist die Marke unter dem Brett — die Fähigkeit, um die es
             * geht. Sie steht seit v0.58 in JEDEM Bild einer Anleitung; gesetzt
             * wird sie am Ende von `schritte`, nicht hier.
             *
             * `knopfTipp` sagt, in welchem Bild sie GEDRÜCKT wird — nur dort
             * liegt der Fingerabdruck darauf. Vorher hing beides an `knopf`,
             * und die Marke sprang mit jedem Takt ins Bild und wieder heraus.
             */
            knopf: roh.knopf || "",
            knopfTipp: !!roh.knopfTipp,

            /* Welches Wirkungs-Schauspiel dieses Bild abspielt (seit v0.116)
               — die Fähigkeits-Kennung, oder leer. Gespielt wird dasselbe
               Schauspiel wie am echten Brett (`_wirkungSchauspiel`). */
            schauspiel: roh.schauspiel || "",

            text: roh.text || ""
        };
    },

    /* Der übliche Weg: Fähigkeit einsetzen, wie im Spiel. */
    _faehigkeitRechnen(vorher, art, beispiel) {
        const beschreibung = SCHACH_VARIANTEN.FAEHIGKEITEN[art];
        if (!beschreibung) {
            return null;
        }

        const vorbereitet = SCHACH_RUNDE.kopieren(vorher);
        vorbereitet.faehigkeiten[SCHACH_VORSCHAU.FARBE].push(art);

        let neu = SCHACH_RUNDE.faehigkeitEinsetzen(vorbereitet,
            SCHACH_VORSCHAU.SPIELER, art,
            Number.isInteger(beispiel.ziel) ? beispiel.ziel : -1, "", 0);

        if (!neu) {
            return null;
        }

        /*
         * Ein zusätzliches Zugmuster ändert das Brett nicht — es ändert, wohin
         * man darf. Die neuen Ziele bekommen deshalb den ZUGPUNKT, dieselbe
         * Marke wie im Spiel: Das Bild sagt „hier kommst du jetzt hin".
         *
         * Kostet die Fähigkeit den Zug (Sprung, Teleport seit v0.47), muss im
         * Beispiel erst der Gegner ziehen — sonst zeigte das Bild Punkte für
         * eine Seite, die gar nicht am Zug ist. Gezogen wird ein echter Zug,
         * kein gestellter.
         */
        if (beschreibung.art === "zugmuster") {
            const dran = (neu.stand.amZug === SCHACH_VORSCHAU.FARBE)
                ? neu
                : SCHACH_VORSCHAU._gegnerZiehtEinmal(neu);

            if (!dran) {
                return null;
            }

            return {
                runde: dran,
                marken: Number.isInteger(beispiel.figur) ? [beispiel.figur] : [],
                ziele: SCHACH_VORSCHAU._neueZiele(vorher, dran, beispiel.figur),
                wege: [],
                text: beispiel.nachher
            };
        }

        if (beispiel.zug) {
            const gezogen = SCHACH_RUNDE.ziehen(neu, SCHACH_VORSCHAU.SPIELER,
                beispiel.zug[0], beispiel.zug[1], "D", "", 0);

            if (!gezogen) {
                return null;
            }
            neu = gezogen;

            /* Nach dem Doppelzug ist dieselbe Seite wieder dran: Das Bild zeigt
               den gezogenen Weg UND wohin die Figur jetzt noch einmal darf. */
            return {
                runde: neu,
                marken: [beispiel.zug[1]],
                ziele: SCHACH.zuege(neu.stand, beispiel.zug[1])
                    .map((zug) => zug.nach)
                    .filter((feld, stelle, alle) => alle.indexOf(feld) === stelle),
                wege: [{ von: beispiel.zug[0], nach: beispiel.zug[1] }],
                text: beispiel.nachher
            };
        }

        return {
            runde: neu,
            marken: SCHACH_VORSCHAU._betroffeneFelder(neu),
            ziele: [],
            wege: SCHACH_VORSCHAU._betroffeneWege(neu),
            text: beispiel.nachher
        };
    },

    /*
     * Der Unglückswürfel wird EINGESAMMELT, nicht eingesetzt: Die eigene Figur
     * zieht darauf, und `SCHACH_RUNDE.ziehen` löst die Wirkung aus. Genau so
     * passiert es im Spiel.
     */
    _pechRechnen(vorher, art, beispiel) {
        if (!beispiel.zug) {
            return null;
        }

        const gezogen = SCHACH_RUNDE.ziehen(SCHACH_RUNDE.kopieren(vorher),
            SCHACH_VORSCHAU.SPIELER, beispiel.zug[0], beispiel.zug[1], "D", "", 0);

        if (!gezogen) {
            return null;
        }

        const letzter = gezogen.verlauf[gezogen.verlauf.length - 1];
        if (!letzter || letzter.wirkung !== "pech") {
            return null;
        }

        return {
            runde: gezogen,
            marken: SCHACH_VORSCHAU._betroffeneFelder(gezogen),
            ziele: [],
            wege: SCHACH_VORSCHAU._betroffeneWege(gezogen),
            text: beispiel.nachher
        };
    },

    /* Die Felder, die der letzte Verlaufseintrag als betroffen meldet. */
    _betroffeneFelder(runde) {
        const letzter = runde.verlauf[runde.verlauf.length - 1];
        if (!letzter || !Array.isArray(letzter.felder)) {
            return [];
        }
        return letzter.felder.slice();
    },

    /*
     * Die Wege aus dem letzten Verlaufseintrag — daraus werden die Pfeile.
     *
     * Es sind dieselben Angaben, aus denen das echte Brett die Spur des
     * letzten Zuges färbt: Wer eine Wirkung baut, die Figuren verschiebt,
     * liefert sie ohnehin mit, und die Anleitung zeichnet sie nur.
     */
    _betroffeneWege(runde) {
        const letzter = runde.verlauf[runde.verlauf.length - 1];
        if (!letzter || !Array.isArray(letzter.wege)) {
            return [];
        }

        return letzter.wege
            .filter((weg) => weg && Number.isInteger(weg.von) && Number.isInteger(weg.nach)
                && weg.von >= 0 && weg.nach >= 0 && weg.von !== weg.nach)
            .map((weg) => ({ von: weg.von, nach: weg.nach }));
    },

    /*
     * Lässt den Gegner EINEN Zug machen — den ersten regelgerechten, den es
     * gibt. Gebraucht wird das nur im Beispiel: Eine Fähigkeit, die den Zug
     * abgibt, wirkt ja erst, wenn man wieder dran ist.
     */
    _gegnerZiehtEinmal(runde) {
        const stand = runde.stand;
        const gegner = stand.amZug;

        for (let feld = 0; feld < SCHACH.felderVon(stand); feld++) {
            if (SCHACH.farbeVon(SCHACH.figurAuf(stand, feld)) !== gegner) {
                continue;
            }

            for (const zug of SCHACH.zuege(stand, feld)) {
                const gezogen = SCHACH_RUNDE.ziehen(runde, "id-gegner",
                    feld, zug.nach, "D", "", 0);

                if (gezogen) {
                    return gezogen;
                }
            }
        }

        return null;
    },

    /* Welche Ziele sind durch das Zusatzmuster hinzugekommen? */
    _neueZiele(vorher, nachher, feld) {
        if (!Number.isInteger(feld) || feld < 0) {
            return [];
        }

        const alte = SCHACH.zuege(vorher.stand, feld).map((zug) => zug.nach);

        return SCHACH.zuege(nachher.stand, feld)
            .map((zug) => zug.nach)
            .filter((ziel) => alte.indexOf(ziel) === -1)
            .filter((ziel, stelle, alle) => alle.indexOf(ziel) === stelle);
    }
};

/* Für die Tests unter Node; im Browser wird die Datei einfach eingebunden. */
if (typeof module !== "undefined" && module.exports) {
    module.exports = SCHACH_VORSCHAU;
}
