/*
 * shop.js — der Tab „Shop" (seit v0.152.0, Platz 5 der Leiste statt „Bald").
 *
 * Nutzer 27.09.2026: „wir brauchen eine In-Game-Währung, die über beide
 * Spiele geht; mit denen kann man sich Extra-Leben, Tipps und Schild für
 * Flammen kaufen in einem Shop" · „Shop auf dem Platz von Bald soll der
 * kommen" · „Name → Münzen". Seit v0.152.2 heisst das Extra-Leben hier
 * „Zeit zurück" (siehe `TEXTE`); den Schild gibt es seit v0.157.0 nicht mehr.
 *
 * Aussehen und Aufbau kommen aus dem gemeinsamen Baustein js\upcrew-shop.js
 * (gleich in Typoluck), Rechnung aus js\upcrew-muenzen.js; hier nur, woher
 * der Stand kommt (FORTSCHRITT_KONTO: Gerät + Konto) und wie gekauft wird
 * (kurz fragen, buchen, Kurzmeldung).
 */

const SHOP = {

    id: "shop",
    titel: "Shop",
    zeichen: "shop",

    griff: null,

    /* Die Waren-Texte dieses Spiels (seit v0.152.1, Option `texte` des
       Bausteins) — Preise und Vorrat bleiben in UPCREW_MUENZEN.WAREN.
       Die Ware „leben" heisst hier seit v0.152.2 „Zeit zurück" (Nutzer
       27.09.2026: „soll nicht Extra-Leben heißen, sondern Zeit zurück —
       zwei Halbzüge zurückspringen"); die Kennung bleibt `leben`, damit die
       Zähler `lebenGekauft`/`lebenGenutzt` am Konto gültig bleiben. Jeder
       Text im Spiel (Menü, Abschluss, Kurzmeldung, Rückfrage) kommt von
       hier (`TEAM_SCHACH._wareName`). */
    TEXTE: {
        /* Den Flammen-Schild gibt es seit v0.157.0 nicht mehr (Nutzer
           29.09.2026: „serien schild raus"); alte Käufe erstattet
           FORTSCHRITT_KONTO.schildeErstatten einmal in Münzen. */
        /* Nutzer 28.09.2026: „Keine Halbzug-Beschreibung, sondern ein
           ganzer Zug." — dein Zug samt Bobs Antwort ist EIN Zug. Und: „nur
           im Turm nutzbar, Bob da rauslassen". */
        leben: { name: "Zeit zurück", text: "Einen Zug zurück · nur im Turm" },
        tipp: { name: "Tipp", text: "Zeigt in einer Partie einen guten Zug" }
    },

    /* Eigene Bilder je Ware: Zeit zurück als Uhr statt Herz (wie
       ZUSTAND.ZEICHEN["zeit-zurueck"]; Nutzer 28.09.2026 „ja eine uhr").
       Option `bilder` des Bausteins, seit v0.153.0 in final und
       byte-gleich in `js\upcrew-shop.js`. */
    BILDER: {
        leben: "M4.5 12 A7.5 7.5 0 1 0 6.7 6.7 L4 9.4 M4 5.4 V9.4 H8 M12 8 V12 L14.5 13.5"
    },

    aufbauen(behaelter) {
        if (typeof UPCREW_SHOP === "undefined" || typeof UPCREW_MUENZEN === "undefined") {
            return;
        }
        SHOP.griff = UPCREW_SHOP.bauen(behaelter, {
            titel: SHOP.titel,
            lesen: () => FORTSCHRITT_KONTO.lesen(),
            kaufen: (ware) => SHOP.kaufen(ware),
            texte: SHOP.TEXTE,
            bilder: SHOP.BILDER
        });
        if (typeof FORTSCHRITT_KONTO !== "undefined" && FORTSCHRITT_KONTO.beiAenderung) {
            FORTSCHRITT_KONTO.beiAenderung(() => SHOP.zeichnen());
        }
    },

    beimOeffnen() {
        if (typeof TABS !== "undefined" && TABS.rundeSetzen) {
            TABS.rundeSetzen(SHOP.id, false);
        }
        SHOP.zeichnen();
    },

    /* Die Seite steht im Band neben der offenen (seit v0.161.0): einmal
       füllen, damit sie beim Wischen zu sehen ist. */
    vorzeichnen() {
        SHOP.zeichnen();
    },

    zeichnen() {
        if (SHOP.griff) {
            SHOP.griff.zeichnen();
        }
    },

    async kaufen(ware) {
        const w = UPCREW_MUENZEN.WAREN[ware];
        if (!w) {
            return false;
        }
        const name = UPCREW_SHOP.text(ware, SHOP.TEXTE).name;
        const ja = await DIALOG.frage(name + " kaufen?",
            w.preis + " " + UPCREW_MUENZEN.WAEHRUNG.name, "Kaufen");
        if (!ja) {
            return false;
        }
        const r = FORTSCHRITT_KONTO.kaufen(ware);
        if (!r.ok) {
            DIALOG.kurzmeldung(r.grund === "voll" ? "Vorrat voll" : "Zu wenig " + UPCREW_MUENZEN.WAEHRUNG.name);
            return false;
        }
        if (typeof FUEHLEN !== "undefined") {
            FUEHLEN.erfolg();
        }
        DIALOG.kurzmeldung(name + " gekauft");
        if (typeof START !== "undefined" && START.flammeAktualisieren) {
            START.flammeAktualisieren();
        }
        return true;
    }
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = SHOP;
}
