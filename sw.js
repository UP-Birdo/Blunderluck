/*
 * sw.js — der Service Worker: macht Blunderluck offline-fähig und installierbar.
 *
 * WARUM ER IN DER WURZEL LIEGT: Ein Service Worker darf nur den Ordner
 * bedienen, in dem er selbst liegt (und alles darunter). Läge er in `js\`,
 * bekäme er weder `index.html` noch die Stildateien zu sehen. Er gehört
 * deshalb neben die Einstiegsdatei — und wird von dort auch angemeldet
 * (js\app.js, Abschnitt „DER SERVICE WORKER").
 *
 * WAS ER TUT:
 *   install   Alle eigenen Dateien einmal in den Zwischenspeicher legen.
 *   activate  Zwischenspeicher ÄLTERER Fassungen wegwerfen.
 *   fetch     Eigene Dateien aus dem Zwischenspeicher beantworten,
 *             alles Fremde unangetastet ans Netz durchlassen.
 *
 * WAS ER AUSDRÜCKLICH NICHT TUT: Firebase zwischenspeichern. Der gemeinsame
 * Spielstand muss IMMER frisch sein — eine zwischengespeicherte Antwort
 * würde ein Brett zeigen, das es so nicht mehr gibt. Deshalb wird alles, was
 * nicht von der eigenen Herkunft (Origin) stammt, gar nicht erst angefasst:
 * kein `respondWith`, der Browser holt es selbst.
 *
 * DIE VERSION ZIEHT MIT DER APP-VERSION MIT (Hausregel). Der Name des
 * Zwischenspeichers enthält sie; ändert sich der Name, baut der Browser den
 * Speicher neu auf und die alte Fassung fliegt in `activate` weg. Bleibt die
 * Nummer stehen, behalten die Geräte tagelang den alten Stand — das ist der
 * häufigste Auslieferungsfehler im Haus. `tests\test-syntax.js` prüft
 * deshalb, dass diese Nummer mit `KONFIG.APP_VERSION` und dem `CHANGELOG.md`
 * übereinstimmt.
 */

/* Der Name des Zwischenspeichers. HIER STEHT DIE NUMMER GENAU EINMAL. */
const SPEICHER_NAME = "blunderluck-v0.109.0";

/*
 * BEIM BAUEN: NETZ ZUERST. IM BETRIEB: ZWISCHENSPEICHER ZUERST.
 *
 * Ohne diesen Schalter sieht man beim Entwickeln nach jeder Änderung die
 * alte Fassung — der Zwischenspeicher antwortet schneller, als man neu laden
 * kann. Erkannt wird der Bau-Rechner am Rechnernamen der Adresse, unter der
 * der Worker selbst läuft (`tools\Blunderluck lokal starten.cmd` öffnet
 * `http://localhost:...`). Auf GitHub Pages heisst der Rechner
 * `up-birdo.github.io` — dort greift der Schalter nie.
 */
const BEIM_BAUEN = self.location.hostname === "localhost"
    || self.location.hostname === "127.0.0.1";

/*
 * ALLES, WAS DIE APP ZUM LAUFEN BRAUCHT.
 *
 * Die Reihenfolge ist die aus `index.html` — so lässt sich Zeile für Zeile
 * vergleichen. WER EINE DATEI ERGÄNZT, TRÄGT SIE HIER EIN: `test-syntax.js`
 * vergleicht diese Liste mit dem, was wirklich im Projekt liegt, und schlägt
 * sonst an.
 *
 * Die Pfade sind bewusst relativ ("./..."): Auf GitHub Pages liegt die App
 * unter `/Blunderluck/`, lokal unter `/`. Absolute Pfade („/js/app.js")
 * gingen auf einem der beiden ins Leere.
 */
const DATEIEN = [
    /* Die Einstiegsdatei — zweimal: einmal als Ordner-Adresse, wie sie der
       Browser beim Aufruf der Seite anfragt, einmal unter ihrem Namen. */
    "./",
    "./index.html",
    "./manifest.webmanifest",
    "./icon.svg",

    /* Die Zeichen der App (Browser-Reiter, iPhone-Startbildschirm, Manifest). */
    "./icons/icon-32.png",
    "./icons/icon-180.png",
    "./icons/icon-192.png",
    "./icons/icon-512.png",

    /* Das Aussehen — die Reihenfolge IST die Kaskade (siehe index.html). */
    "./css/stil.css",
    "./css/stil-brett.css",
    "./css/stil-effekte.css",
    "./css/stil-auswertung.css",
    "./css/stil-start.css",

    /* Die Programmdateien in der Ladereihenfolge aus index.html. */
    "./js/konfig.js",
    "./js/spieler.js",
    "./js/versiegelung.js",
    "./js/ich.js",
    "./js/verwaltung.js",
    "./js/speicher.js",
    "./js/abgleich.js",
    "./js/dialog.js",
    "./js/tabs.js",
    "./js/anmeldung.js",
    "./js/faehigkeit-zeichen.js",
    "./js/schach-varianten.js",
    "./js/schach.js",
    "./js/schach-runde.js",
    "./js/schach-runde-faehigkeiten.js",
    "./js/schach-tafel.js",
    "./js/schach-bot.js",
    "./js/schach-vorschau.js",
    "./js/schach-grundlagen.js",
    "./js/team-schach.js",
    "./js/team-schach-uebersicht.js",
    "./js/team-schach-brett.js",
    "./js/team-schach-auswertung.js",
    "./js/team-schach-grundlagen.js",
    "./js/rangliste.js",
    "./js/start.js",
    "./js/faehigkeiten.js",
    "./js/freunde.js",
    "./js/einstellungen.js",
    "./js/verwaltungs-bildschirm.js",
    "./js/wunsch.js",
    "./js/app.js",

    /* Die zwölf Figuren des 3D-Looks. Sie stehen in KEINER HTML-Zeile,
       sondern in `css\stil-effekte.css` als Hintergrundbild — und darunter
       ist das Schriftzeichen durchsichtig geschaltet. Fehlen sie, ist das
       Brett nicht schmuckloser, sondern LEER. */
    "./img/figuren/figur-bauer-weiss.png",
    "./img/figuren/figur-springer-weiss.png",
    "./img/figuren/figur-laeufer-weiss.png",
    "./img/figuren/figur-turm-weiss.png",
    "./img/figuren/figur-dame-weiss.png",
    "./img/figuren/figur-koenig-weiss.png",
    "./img/figuren/figur-bauer-schwarz.png",
    "./img/figuren/figur-springer-schwarz.png",
    "./img/figuren/figur-laeufer-schwarz.png",
    "./img/figuren/figur-turm-schwarz.png",
    "./img/figuren/figur-dame-schwarz.png",
    "./img/figuren/figur-koenig-schwarz.png",

    /* Die Lootboxen. Sie hängt `js\team-schach-brett.js` zur Laufzeit ein
       (LOOTBOX_ORDNER) — ohne sie fehlt dem Spiel genau das, wonach es heisst. */
    "./img/lootboxen/lootbox-blau.png",
    "./img/lootboxen/lootbox-blau-pech.png",
    "./img/lootboxen/lootbox-gelb.png",
    "./img/lootboxen/lootbox-gelb-pech.png",
    "./img/lootboxen/lootbox-gruen.png",
    "./img/lootboxen/lootbox-gruen-pech.png",
    "./img/lootboxen/lootbox-lila.png",
    "./img/lootboxen/lootbox-lila-pech.png",
    "./img/lootboxen/lootbox-unbekannt.png",
    "./img/lootboxen/lootbox-unbekannt-pech.png"
];

/* ------------------------------------------------------------------ *
 * INSTALLIEREN — alles einmal einsammeln
 * ------------------------------------------------------------------ */

self.addEventListener("install", (ereignis) => {
    ereignis.waitUntil((async () => {
        const speicher = await caches.open(SPEICHER_NAME);

        /*
         * `addAll` ist absichtlich hart: Scheitert EINE Datei, gilt die
         * ganze Installation als gescheitert und der alte Worker bleibt in
         * Betrieb. Das ist richtig so — ein halb gefüllter Zwischenspeicher
         * wäre schlimmer als keiner: Die App käme offline hoch und fiele
         * dann an einer fehlenden Datei auseinander.
         */
        await speicher.addAll(DATEIEN);

        /*
         * SOFORT ÜBERNEHMEN, NICHT WARTEN.
         *
         * Ohne `skipWaiting` bliebe ein neuer Worker so lange im
         * Wartezimmer, bis der Nutzer JEDEN Reiter der App geschlossen hat —
         * in der Praxis tagelang. Hier ist das Übernehmen im laufenden
         * Betrieb unbedenklich: Die App hält keinen unsichtbaren Zustand,
         * den ein Neustart zerstören könnte (der gemeinsame Stand liegt in
         * Firebase, die Anmeldung im Browser-Speicher), und der Worker
         * liefert ohnehin nur Dateien aus — er rechnet nichts.
         */
        await self.skipWaiting();
    })());
});

/* ------------------------------------------------------------------ *
 * AKTIVIEREN — alte Fassungen wegräumen
 * ------------------------------------------------------------------ */

self.addEventListener("activate", (ereignis) => {
    ereignis.waitUntil((async () => {
        const namen = await caches.keys();

        /*
         * NUR EIGENE SPEICHER LÖSCHEN.
         *
         * Der Zwischenspeicher gehört der HERKUNFT, nicht dem Ordner: Unter
         * `up-birdo.github.io` liegen mehrere Apps des Hauses. Ein „lösche
         * alles ausser meinem" würde den Nachbar-Apps ihren Speicher unter
         * den Füssen wegziehen. Weggeworfen wird deshalb nur, was mit
         * `blunderluck-` beginnt und nicht der aktuelle Speicher ist.
         */
        await Promise.all(namen
            .filter((name) => name.startsWith("blunderluck-") && name !== SPEICHER_NAME)
            .map((name) => caches.delete(name)));

        /*
         * Und die bereits offenen Seiten sofort übernehmen — sonst würden
         * sie bis zum nächsten Neuladen weiter vom alten Worker bedient,
         * und `skipWaiting` oben verpuffte.
         */
        await self.clients.claim();
    })());
});

/* ------------------------------------------------------------------ *
 * ANTWORTEN — was aus dem Speicher kommt und was nicht
 * ------------------------------------------------------------------ */

self.addEventListener("fetch", (ereignis) => {
    const anfrage = ereignis.request;

    /*
     * NUR GET. Alles andere (Firebase schreibt mit PUT und PATCH) geht den
     * Worker nichts an — eine Schreibanfrage darf niemals aus einem
     * Zwischenspeicher beantwortet werden.
     */
    if (anfrage.method !== "GET") {
        return;
    }

    /*
     * NUR DIE EIGENE HERKUNFT. Damit ist Firebase draussen: Die Datenbank
     * liegt unter `...firebasedatabase.app`, also einer anderen Herkunft.
     * Ohne `respondWith` verhält sich der Worker, als gäbe es ihn nicht —
     * der Browser holt die Antwort selbst, frisch, jedes Mal.
     */
    const adresse = new URL(anfrage.url);
    if (adresse.origin !== self.location.origin) {
        return;
    }

    ereignis.respondWith(BEIM_BAUEN ? netzZuerst(anfrage) : speicherZuerst(anfrage));
});

/*
 * IM BETRIEB: erst der Zwischenspeicher, dann das Netz.
 *
 * `ignoreSearch` lässt einen angehängten Fragezeichen-Teil ausser Acht
 * (`index.html?stand=neu`) — sonst ginge so ein Aufruf offline ins Leere,
 * obwohl die Datei längst da liegt.
 */
async function speicherZuerst(anfrage) {
    const treffer = await caches.match(anfrage, { ignoreSearch: true });
    if (treffer) {
        return treffer;
    }

    try {
        return await fetch(anfrage);
    } catch (fehler) {
        /*
         * Ohne Netz und ohne Treffer: Bei einem Seitenaufruf wenigstens die
         * Einstiegsdatei zeigen (etwa, wenn jemand eine Unteradresse als
         * Lesezeichen hat). Für alles andere bleibt es beim Fehler — er
         * gehört dem aufrufenden Code, nicht dem Worker.
         */
        if (anfrage.mode === "navigate") {
            const start = await caches.match("./", { ignoreSearch: true });
            if (start) {
                return start;
            }
        }
        throw fehler;
    }
}

/*
 * BEIM BAUEN: erst das Netz, der Zwischenspeicher nur als Rückfall.
 * So sieht man jede Änderung sofort, bleibt aber auch ohne Netz arbeitsfähig.
 */
async function netzZuerst(anfrage) {
    try {
        return await fetch(anfrage);
    } catch (fehler) {
        const treffer = await caches.match(anfrage, { ignoreSearch: true });
        if (treffer) {
            return treffer;
        }
        throw fehler;
    }
}
