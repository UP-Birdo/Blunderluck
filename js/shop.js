/*
 * shop.js — der Tab „Shop" (seit v0.152.0, Platz 5 der Leiste statt „Bald").
 *
 * Nutzer 27.09.2026: „wir brauchen eine In-Game-Währung, die über beide
 * Spiele geht; mit denen kann man sich Extra-Leben, Tipps und Schild für
 * Flammen kaufen in einem Shop" · „Shop auf dem Platz von Bald soll der
 * kommen" · „Name → Münzen".
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

    aufbauen(behaelter) {
        if (typeof UPCREW_SHOP === "undefined" || typeof UPCREW_MUENZEN === "undefined") {
            return;
        }
        SHOP.griff = UPCREW_SHOP.bauen(behaelter, {
            titel: SHOP.titel,
            lesen: () => FORTSCHRITT_KONTO.lesen(),
            kaufen: (ware) => SHOP.kaufen(ware)
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
        const ja = await DIALOG.frage(w.name + " kaufen?",
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
        DIALOG.kurzmeldung(w.name + " gekauft");
        if (typeof START !== "undefined" && START.flammeAktualisieren) {
            START.flammeAktualisieren();
        }
        return true;
    }
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = SHOP;
}
