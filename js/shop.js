/*
 * shop.js — der Tab „Shop" (seit v0.152.0, Platz 5 der Leiste statt „Bald").
 *
 * Nutzer 27.09.2026: „wir brauchen eine In-Game-Währung, die über beide
 * Spiele geht; mit denen kann man sich Extra-Leben, Tipps und Schild für
 * Flammen kaufen in einem Shop" · „Shop auf dem Platz von Bald soll der
 * kommen" · „Name → Münzen". Seit v0.152.2 heisst das Extra-Leben hier
 * „Zeit zurück" (siehe `TEXTE`); den Schild gibt es seit v0.157.0 nicht mehr.
 *
 * SEIT v0.163.0 DER NEUE SHOP (Nutzer 03.10.2026: „Der shop soll endlich mal
 * gemacht werden"; UPCrew Runde 8): zwei Reiter — „Design" (Angebot des
 * Tages, Design-Pakete, Einzelteile aus dem gemeinsamen Katalog
 * js\upcrew-katalog.js, dazu die Stücke nur dieses Spiels: Brett-Design 2D
 * und 3D, Figuren-Stil) und „Blunderluck" (der Vorrat wie bisher: Tipp, Zeit
 * zurück). Was gekauft ist, liegt als BESITZ auf dem Gerät und am Konto
 * (js\besitz.js) und ist in der Sammlung frei. Preise, Pakete und Stufen
 * stehen NUR im Katalog — hier wird nichts davon festgelegt.
 *
 * Aussehen und Aufbau kommen aus dem gemeinsamen Baustein js\upcrew-shop.js
 * (gleich in Typoluck), Rechnung aus js\upcrew-muenzen.js und
 * js\upcrew-besitz.js; hier nur, woher der Stand kommt (FORTSCHRITT_KONTO,
 * BESITZ: Gerät + Konto), wie gekauft wird (kurz fragen, buchen,
 * Kurzmeldung) und wie die ANPROBE aussieht.
 *
 * DIE ANPROBE („Anprobieren" im Blatt eines Stücks oder Pakets): zeigt das
 * Stück probeweise, speichert NICHTS. Farbwelt, Schrift und Knöpfe legen
 * sich über die ganze App (wie die Probe-Seite der Werkbank); Brett-Design
 * und Figuren-Stil zeigt die echte Start-Vorschau klein in der
 * Anprobe-Leiste (`SAMMLUNG._vorschau` — dieselbe wie in der Sammlung).
 * Die Leiste oben nennt das Stück und trägt den Knopf „Anprobe beenden";
 * ein Tab-Wechsel beendet sie von selbst (`beimVerlassen`).
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

    /* Welcher Reiter zuletzt offen war ("design" | "vorrat"). */
    teil: "design",

    aufbauen(behaelter) {
        if (typeof UPCREW_SHOP === "undefined" || typeof UPCREW_MUENZEN === "undefined") {
            return;
        }
        const mitBesitz = typeof BESITZ !== "undefined" && typeof UPCREW_BESITZ !== "undefined";
        SHOP.griff = UPCREW_SHOP.bauen(behaelter, {
            titel: SHOP.titel,
            lesen: () => FORTSCHRITT_KONTO.lesen(),
            kaufen: (ware) => SHOP.kaufen(ware),
            texte: SHOP.TEXTE,
            bilder: SHOP.BILDER,
            /* --- seit v0.163.0: der Reiter „Design" --- */
            spiel: "blunderluck",
            besitz: () => (mitBesitz ? BESITZ.lesen() : {}),
            frei: (art, wert) => SHOP.frei(art, wert),
            kaufenStueck: mitBesitz ? ((stueck, preis) => SHOP.kaufenStueck(stueck, preis)) : undefined,
            anprobieren: (stuecke) => SHOP.anprobieren(stuecke),
            bildVon: (s) => (s.art === "brett2d" && typeof BRETT_DESIGN !== "undefined"
                ? BRETT_DESIGN.miniBild(s.wert) : ""),
            teil: SHOP.teil,
            beiTeil: (teil) => {
                SHOP.teil = teil;
            }
        });
        if (typeof FORTSCHRITT_KONTO !== "undefined" && FORTSCHRITT_KONTO.beiAenderung) {
            FORTSCHRITT_KONTO.beiAenderung(() => SHOP.zeichnen());
        }
        /* Ein Kauf vom anderen Gerät, eine Anmeldung: neu zeichnen. */
        if (mitBesitz) {
            BESITZ.beiAenderung(() => SHOP.zeichnen());
        }
    },

    beimOeffnen() {
        if (typeof TABS !== "undefined" && TABS.rundeSetzen) {
            TABS.rundeSetzen(SHOP.id, false);
        }
        SHOP.zeichnen();
    },

    /* Ein anderer Tab kommt: die Anprobe endet (Auftrag v0.163.0, Teil C
       Punkt 3). Die Seite selbst bleibt im Band stehen, wie sie ist. */
    beimVerlassen() {
        SHOP.anprobeBeenden();
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
    },

    /* ---------------------------------------------------------------- *
     * Der Reiter „Design" (seit v0.163.0)
     * ---------------------------------------------------------------- */

    /*
     * Was das Spiel auf ANDEREM Weg schon frei rechnet (Level, Turm,
     * Werkstatt) — der Shop zeigt es als „im Besitz". Dieselben Fragen wie
     * in der Sammlung, nur OHNE den Besitz (den kennt der Baustein selbst):
     *   farbwelt · schrift · knoepfe   Level (`UPCREW_ANPASSEN.frei`, STUFEN)
     *   brett2d · brett3d · figurstil  Level bzw. Ort im Turm
     *                                  (`FREISCHALTUNG.erspielt`), nur für
     *                                  Stücke, die das Spiel wirklich kennt
     * Alles andere: nein.
     */
    REGAL_VON: { brett2d: "design2d", brett3d: "thema", figurstil: "figuren" },

    _kennt(art, wert) {
        if (art === "brett2d") {
            return typeof BRETT_DESIGN !== "undefined" && !!BRETT_DESIGN.eintrag(wert);
        }
        const liste = (typeof SAMMLUNG === "undefined") ? null
            : (art === "brett3d" ? SAMMLUNG.THEMEN : (art === "figurstil" ? SAMMLUNG.FIGUREN : null));
        return !!liste && liste.some((eintrag) => eintrag.wert === wert);
    },

    frei(art, wert) {
        if (typeof FREISCHALTUNG === "undefined") {
            return false;
        }
        const regal = SHOP.REGAL_VON[art];
        if (regal) {
            if (!SHOP._kennt(art, wert)) {
                return false;
            }
            return FREISCHALTUNG.werkstatt() || FREISCHALTUNG.adminAnpassung()
                || FREISCHALTUNG.erspielt(regal, wert);
        }
        if (art === "farbwelt" || art === "schrift" || art === "knoepfe") {
            if (typeof UPCREW_ANPASSEN === "undefined") {
                return false;
            }
            return (FREISCHALTUNG.werkstatt() && wert in (UPCREW_ANPASSEN.STUFEN[art] || {}))
                || UPCREW_ANPASSEN.frei(art, wert, FREISCHALTUNG.stufe(), null);
        }
        return false;
    },

    /*
     * EIN STÜCK KAUFEN (Rückruf `kaufenStueck` des Bausteins): kurz fragen
     * wie beim Vorrat, dann `BESITZ.kaufen` — dort die feste Reihenfolge
     * (Merker, ERST Besitz, DANN Fortschritt). Gebucht wird der Preis, den
     * der Baustein beim Kauf rechnet, nicht der angezeigte. Neu zeichnen tut
     * der Baustein selbst (auch offene Blätter).
     *
     * Die Wartesperre „Kaufen geht, sobald dein Konto geladen ist" (v0.164.1
     * bis v0.166.4) ist seit v0.167.0 weg: Ein gemerktes Konto kauft auch
     * vor dem Laden in seinen eigenen Geräte-Eintrag (js\besitz.js).
     */
    async kaufenStueck(stueck, preis) {
        if (!stueck || typeof BESITZ === "undefined") {
            return false;
        }
        const waehrung = UPCREW_MUENZEN.WAEHRUNG.name;
        const ja = await DIALOG.frage(stueck.name + " kaufen?", preis + " " + waehrung, "Kaufen");
        if (!ja) {
            return false;
        }
        const r = BESITZ.kaufen(stueck.art, stueck.wert);
        if (!r.ok) {
            DIALOG.kurzmeldung(r.grund === "zuWenig" ? "Zu wenig " + waehrung : "Nicht kaufbar");
            return false;
        }
        if (typeof FUEHLEN !== "undefined") {
            FUEHLEN.erfolg();
        }
        DIALOG.kurzmeldung(stueck.name + " gekauft");
        if (typeof START !== "undefined" && START.flammeAktualisieren) {
            START.flammeAktualisieren();
        }
        return true;
    },

    /* ---------------------------------------------------------------- *
     * Die Anprobe (seit v0.163.0)
     * ---------------------------------------------------------------- */

    /* Was gerade anprobiert wird: { name, sorte, stuecke } — oder null. */
    anprobe: null,
    anprobeEl: null,

    /* Welche Arten die Anprobe zeigen kann. */
    ANPROBE_APP: ["farbwelt", "schrift", "knoepfe"],
    ANPROBE_BRETT: ["brett2d", "brett3d", "figurstil"],

    /* Rückruf des Bausteins: ein Stück oder der wirkende Inhalt eines Pakets. */
    anprobieren(stuecke) {
        const liste = (Array.isArray(stuecke) ? stuecke : []).filter((s) => s
            && (SHOP.ANPROBE_APP.indexOf(s.art) !== -1 || SHOP.ANPROBE_BRETT.indexOf(s.art) !== -1));
        if (liste.length === 0) {
            return false;
        }
        const art = (typeof UPCREW_KATALOG !== "undefined") ? UPCREW_KATALOG.art(liste[0].art) : null;
        /* `name` = das Stück (bei einem Paket seine Farbwelt), `sorte` = die
           Art dahinter — zwei kurze Zeilen statt einer langen. */
        SHOP.anprobe = {
            name: liste[0].name,
            sorte: liste.length === 1 ? (art ? art.name : "") : "Design-Paket",
            stuecke: liste
        };
        SHOP._anprobeZeigen();
        return true;
    },

    anprobeBeenden() {
        if (!SHOP.anprobe && !SHOP.anprobeEl) {
            return;
        }
        SHOP.anprobe = null;
        SHOP._anprobeZeigen();
    },

    _anprobeWert(art) {
        const s = SHOP.anprobe ? SHOP.anprobe.stuecke.find((stueck) => stueck.art === art) : null;
        return s ? s.wert : "";
    },

    /* Das Aussehen der App: erst, was wirklich gilt — dann die Anprobe
       darüber. Gespeichert wird nichts (`UPCREW_AUSSEHEN.setzen` läuft nie). */
    _anprobeZeigen() {
        if (typeof document === "undefined") {
            return;
        }
        const html = document.documentElement;
        if (typeof DARSTELLUNG !== "undefined") {
            DARSTELLUNG.anwenden();
        }
        if (SHOP.anprobe && html) {
            const welt = SHOP._anprobeWert("farbwelt");
            const schrift = SHOP._anprobeWert("schrift");
            const knoepfe = SHOP._anprobeWert("knoepfe");
            if (welt && typeof window !== "undefined" && window.UPCREW_FARBWELTEN
                    && typeof DARSTELLUNG !== "undefined") {
                window.UPCREW_FARBWELTEN.anwenden(welt, DARSTELLUNG.modus(), html);
            }
            if (schrift && html.style) {
                if (typeof UPCREW_AUSSEHEN !== "undefined" && UPCREW_AUSSEHEN.schriftLaden) {
                    UPCREW_AUSSEHEN.schriftLaden(schrift);
                }
                html.style.setProperty("--schrift-familie", "\"Crew " + schrift + "\", system-ui, sans-serif");
            }
            if (knoepfe && html.dataset) {
                html.dataset.knoepfe = knoepfe;
            }
            if (welt && typeof DARSTELLUNG !== "undefined") {
                DARSTELLUNG._ergaenzen(html);
            }
        }
        SHOP._anprobeLeiste();
    },

    /* Die Leiste oben: Name, bei Brett-Stücken die echte Vorschau klein,
       und „Anprobe beenden". Ohne Anprobe verschwindet sie. */
    _anprobeLeiste() {
        if (SHOP.anprobeEl && SHOP.anprobeEl.parentNode) {
            SHOP.anprobeEl.parentNode.removeChild(SHOP.anprobeEl);
        }
        SHOP.anprobeEl = null;
        if (!SHOP.anprobe || !document.body) {
            return;
        }
        const leiste = document.createElement("div");
        leiste.className = "shop-anprobe";
        leiste.setAttribute("role", "status");

        const brett = SHOP._anprobeBrett();
        if (brett) {
            leiste.appendChild(brett);
        }

        /* Text und Knopf teilen sich den Rest: nebeneinander, wenn es
           reicht — sonst rückt der Knopf UNTER den Text (neben dem Brett
           bei 360 px), nie aus dem Bild. */
        const rest = document.createElement("div");
        rest.className = "shop-anprobe-rest";
        leiste.appendChild(rest);

        const text = document.createElement("span");
        text.className = "shop-anprobe-text";
        const klein = document.createElement("small");
        klein.textContent = "Anprobe" + (SHOP.anprobe.sorte ? " · " + SHOP.anprobe.sorte : "");
        text.appendChild(klein);
        const name = document.createElement("b");
        name.textContent = SHOP.anprobe.name;
        text.appendChild(name);
        rest.appendChild(text);

        const ende = document.createElement("button");
        ende.type = "button";
        ende.className = "knopf knopf-still shop-anprobe-ende";
        ende.textContent = "Anprobe beenden";
        ende.addEventListener("click", () => SHOP.anprobeBeenden());
        rest.appendChild(ende);

        document.body.appendChild(leiste);
        SHOP.anprobeEl = leiste;
    },

    /* Brett-Design 2D/3D, Figuren-Stil: die Start-Vorschau mit dem Stück —
       oder null, wenn nichts davon anprobiert wird (oder die Sammlung
       fehlt). Ein 3D-Stück zeigt das 3D-Brett, auch wenn es noch nicht
       erspielt ist (nur im Bild). */
    _anprobeBrett() {
        const design = SHOP._anprobeWert("brett2d");
        const thema = SHOP._anprobeWert("brett3d");
        const figuren = SHOP._anprobeWert("figurstil");
        if ((!design && !thema && !figuren) || typeof SAMMLUNG === "undefined"
                || typeof FREISCHALTUNG === "undefined") {
            return null;
        }
        const jetzt = FREISCHALTUNG.teile();
        const drei = SAMMLUNG._brett3d();
        const extra = {
            brett: (thema || figuren) ? "3d" : "2d",
            figurart: figuren ? "3d" : jetzt.figuren,
            design2d: design || undefined,
            thema: thema || drei.thema,
            figuren: figuren || drei.figuren
        };
        const halter = document.createElement("div");
        halter.className = "shop-anprobe-brett";
        const buehne = document.createElement("div");
        buehne.className = "upa-schach-buehne";
        halter.appendChild(buehne);
        try {
            SAMMLUNG._vorschau(halter, { extra: extra }, "blunderluck");
        } catch (fehler) {
            return null;
        }
        return halter;
    }
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = SHOP;
}
