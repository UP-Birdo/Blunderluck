/*
 * sammlung.js — der Tab „Sammlung" (seit v0.145.0, UPCrew-Angleichung
 * Runde 4, Design\3D-Schrift\docs\AUFTRAEGE-RUNDE-4.md).
 *
 * Nutzer 27.09.2026: „Anpassen soll nicht unter einem Knopf liegen, muss
 * zusammenpassen." Deshalb sind hier ZWEI frühere Tabs aufgegangen:
 *   - „Fähigkeiten" (v0.9.0 bis v0.144, js\faehigkeiten.js) und
 *   - „Anpassen" (v0.144.0, js\anpassen.js).
 * Beide Kennungen führen weiter hierher (`TABS.UMLEITUNGEN`).
 *
 * SEIT v0.162.0 „VARIANTE A" (UPCrew Runde 8; Nutzer 03.10.2026: „es soll
 * nicht mehr nach rechts oder links scroll bar sein das hin und her wischen
 * gehört dem tab wechsel", Wahl im Entwurf „1. A"): statt waagrecht
 * rollender Regal-Reihen KATEGORIE-KACHELN im 2er-Raster; ein Tipp öffnet
 * ein BLATT mit den Stücken (3er-Raster, rollt nur senkrecht). Nichts auf
 * dieser Seite rollt mehr waagrecht — ein Wisch gehört dem Seiten-Band.
 *
 * WAS AUF DER EINEN FLÄCHE STEHT, von oben nach unten:
 *   1. die Kopfzeile wie in den anderen Tabs, rechts „NN %" gesammelt;
 *   2. der gemeinsame Baustein js\upcrew-anpassen.js (`UPCREW_ANPASSEN`,
 *      Kopie aus Apps\UPCrew\bausteine, in Typoluck gleich): die Vorschau
 *      klebt bündig unter der Kopfzeile, darunter die Kacheln — zuerst die
 *      EIGENEN Regale (Brett · Brett-Design 2D · Brett-Design 3D · Figuren ·
 *      Figuren-Stil 3D), dann die Arten des Katalogs (js\upcrew-katalog.js:
 *      Farbwelten, Schriften, Knöpfe … — was noch nicht wirkt, trägt
 *      „bald"), dann Darstellung und Sets;
 *   3. die REINE SAMMLUNG — Dinge, die man nicht „anzieht": Abzeichen,
 *      Fähigkeiten (dieselbe Bibliothek wie bisher im Tab „Fähigkeiten",
 *      nichts fehlt) und Brettformen. Der Gerüst-Baustein
 *      (js\upcrew-sammlung.js) macht aus jedem Abschnitt eine Kachel im
 *      selben Raster und öffnet ihn im Blatt; der Abschnitt bleibt dasselbe
 *      Element;
 *   4. unten der Balken „Würfel · Zurück · Übernehmen", bündig auf der
 *      Leiste. Die Probe bleibt beim Schliessen eines Blatts stehen.
 *
 * FREI IST: 2D (immer), das Brett-Design „Grau", das Brett-Thema „Farbwelt"
 * und die Figuren „Emaille". 3D, die übrigen Themen und Figuren schaltet
 * seit v0.147.0 der Turm frei (js\freischaltung.js: 3D und Holz/Matt ab
 * Holzhalle …); bis dahin tragen sie ein Band mit dem Ort. Admin-Freigabe
 * und Werkstatt schalten alles frei. Daran ändert v0.162.0 nichts.
 * DIE OBERFLÄCHE NENNT KEIN LEVEL MEHR (seit v0.162.0): Was über das Level
 * frei wird (Farbwelt, Schrift, Knöpfe, Brett-Design „Farbwelt"), wirkt wie
 * bisher, trägt aber statt „Lv N" ein Band des Bausteins.
 * MIT SHOP UND BESITZ (seit v0.163.0): Kaufbares, das noch gesperrt ist,
 * trägt „im Shop"; was im Shop gekauft wurde, ist frei und lässt sich
 * übernehmen (`besitz: BESITZ.haken()`, js\besitz.js — dazu fragen
 * `BRETT_DESIGN.frei` und `FREISCHALTUNG.brettStueckFrei` den Besitz
 * selbst). In v0.162.0 stand hier noch `shop: false`.
 * In der reinen Sammlung ist alles „da" (Taten = Runde 5).
 *
 * Bei jedem Öffnen wird der Anpassen-Baustein neu aufgebaut — so zeigt er
 * immer den aktuellen Stand, auch wenn Typoluck inzwischen etwas umgestellt
 * hat. Die reine Sammlung wird dagegen nur EINMAL gebaut und bei jedem
 * Öffnen wieder eingehängt: Ein aufgeklappter Eintrag bleibt so offen, und
 * die Bibliothek meldet sich nicht bei jedem Öffnen ein weiteres Mal bei
 * `TEAM_SCHACH._kartenWurzeln` an.
 */

const SAMMLUNG = {

    id: "sammlung",
    titel: "Sammlung",
    zeichen: "sammlung",

    /* Die kleinen Bilder der Regale (echte Aufnahmen aus der Werkstatt,
       27.09.2026, aus Design\3D-Schrift\entwuerfe\Herausforderungen\bilder
       kopiert). */
    BILD_ORDNER: "img/sammlung/",

    /*
     * Die Brett-Themen und Figuren-Stile — die Kennungen sind die aus
     * js\brett-3d-aussehen.js (`THEMEN`, `FIGUR_STILE`, seit v0.166.0; bis
     * dahin js\brett-3d.js; test-aussehen.js hält beide
     * Listen gleich). `ort` ist der Ort im Turm, der das Stück später
     * freischaltet; ohne `ort` ist es die freie Vorgabe.
     */
    THEMEN: [
        { wert: "blunderluck", name: "Farbwelt", bild: "brett-3d" },
        { wert: "holz", name: "Holz", bild: "brett-3d-holz", ort: "Holzhalle" },
        { wert: "marmor", name: "Marmor", bild: "brett-3d-marmor", ort: "Marmorsaal" },
        { wert: "nacht", name: "Nacht", bild: "brett-3d-nacht", ort: "Nachtclub" },
        { wert: "turnier", name: "Turnier", bild: "brett-3d-turnier", ort: "Turniersaal" }
    ],

    FIGUREN: [
        { wert: "emaille", name: "Emaille", bild: "brett-3d" },
        { wert: "matt", name: "Matt", bild: "figuren-matt", ort: "Holzhalle" },
        { wert: "porzellan", name: "Porzellan", bild: "figuren-porzellan", ort: "Marmorsaal" },
        { wert: "metall", name: "Metall", bild: "figuren-metall", ort: "Nachtclub" }
    ],

    wurzelEl: null,
    kopfEl: null,
    anteilEl: null,
    ortEl: null,
    restEl: null,
    tab: null,

    /* Das Gerüst (seit v0.151.11) baut der gemeinsame Baustein
       js\upcrew-sammlung.js — in Typoluck dasselbe. */
    geruest: null,

    aufbauen(behaelter) {
        SAMMLUNG.wurzelEl = behaelter;
        behaelter.classList.add("sammlung");
        SAMMLUNG.geruest = UPCREW_SAMMLUNG.bauen(behaelter, { titel: SAMMLUNG.titel });
        SAMMLUNG.kopfEl = SAMMLUNG.geruest.kopf;
        SAMMLUNG.anteilEl = SAMMLUNG.geruest.anteil;
        SAMMLUNG.ortEl = SAMMLUNG.geruest.ort;
        /* Nach einem Kauf im Shop (seit v0.163.0) zeigt die Sammlung das
           Stück als frei, sobald sie wieder zu sehen ist. */
        if (typeof BESITZ !== "undefined" && BESITZ.beiAenderung) {
            BESITZ.beiAenderung(() => SAMMLUNG.besitzGeaendert());
        }
    },

    /* Der Besitz hat sich geändert (Kauf, Anmeldung, anderes Gerät). Steht
       die Sammlung nur als Nachbarseite im Band, wird sie gleich neu
       gezeichnet — sonst zeigte sie beim Wischen noch den alten Stand. Ist
       sie die OFFENE Seite, bleibt sie stehen (ein Entwurf ginge verloren);
       `beimOeffnen` baut ohnehin bei jedem Einrasten frisch. */
    besitzGeaendert() {
        if (!SAMMLUNG.ortEl || !SAMMLUNG.tab) {
            return;
        }
        if (typeof TABS !== "undefined" && TABS.offeneSeite === SAMMLUNG.id) {
            return;
        }
        SAMMLUNG._zeigen();
    },

    beimOeffnen() {
        /* Ein normaler Tab: kein Fenster, rollt wie immer. */
        if (typeof TABS !== "undefined" && TABS.rundeSetzen) {
            TABS.rundeSetzen(SAMMLUNG.id, false);
        }
        SAMMLUNG._zeigen();
    },

    /* Die Seite steht im Band neben der offenen (seit v0.161.0): einmal
       füllen, damit sie beim Wischen zu sehen ist. */
    vorzeichnen() {
        SAMMLUNG._zeigen();
    },

    /* KEIN `beimVerlassen` MEHR (seit v0.161.0): Bis v0.160 baute sich der
       Anpassen-Baustein beim Verlassen ab (`tab.entfernen()`). Im
       Seiten-Band muss die Sammlung als Nachbarseite beim Wischen zu sehen
       sein — sie bleibt stehen und zeigt ihr letztes Bild. Ein nicht
       übernommener Entwurf verfällt wie bisher: `beimOeffnen` baut bei
       jedem Einrasten frisch (`_zeigen` räumt den alten Stand selbst ab). */

    _zeigen() {
        if (!SAMMLUNG.ortEl) {
            return;
        }
        if (SAMMLUNG.tab) {
            SAMMLUNG.tab.entfernen();
            SAMMLUNG.tab = null;
        }
        if (!SAMMLUNG.restEl) {
            SAMMLUNG.restEl = SAMMLUNG.restBauen();
        }

        /* Ein offenes Blatt der reinen Sammlung geht vorher zu: Sein
           Abschnitt hängt dann wieder im Rest und bekommt unten seine
           Kachel (das Blatt einer Kategorie schliesst `tab.entfernen()`
           oben selbst). */
        SAMMLUNG._restBlattSchliessen();

        if (typeof UPCREW_ANPASSEN !== "undefined") {
            SAMMLUNG.tab = UPCREW_ANPASSEN.zeigen(SAMMLUNG.ortEl, {
                app: "blunderluck",
                stufe: FREISCHALTUNG.stufe(),
                alleFrei: FREISCHALTUNG.werkstatt(),
                /* Seit v0.163.0 mit Shop und Besitz: Kaufbares verweist auf
                   den Shop, Gekauftes ist frei (js\besitz.js) — zusätzlich
                   zum heutigen Weg (Level, Turm, Werkstatt). */
                besitz: (typeof BESITZ !== "undefined") ? BESITZ.haken() : undefined,
                /* Seit v0.166.3: „Im Shop ansehen" statt des grauen
                   „Nicht im Besitz" (siehe `zumShop`). */
                zumShop: (typeof SHOP !== "undefined") ? ((stueck) => SAMMLUNG.zumShop(stueck)) : undefined,
                regale: SAMMLUNG.regale(),
                vorschau: SAMMLUNG._vorschau
            });
        }

        /* Die reine Sammlung VOR den Übernehmen-Balken (das Gerüst weiß,
           wohin), „NN %" in den Kopf, die Vorschau bündig darunter. */
        /* Die Abzeichen (seit v0.151.12) zeigen den Stand von JETZT — sie
           werden bei jedem Öffnen neu gebaut, als erste Gruppe. */
        SAMMLUNG._abzeichenEinsetzen();
        SAMMLUNG.geruest.restEinsetzen(SAMMLUNG.restEl);
        const anteil = SAMMLUNG.anteil();
        SAMMLUNG.geruest.anteilSetzen(anteil.hat, anteil.alle);
        SAMMLUNG.geruest.obenSetzen();
    },

    /* DER WEG IN DEN SHOP (seit v0.166.3, UPCrew Runde 9; Vertrag
       `opt.zumShop` im Kopf von js\upcrew-anpassen.js). Der Baustein ruft
       das für ein kaufbares, nicht besessenes Stück mit dem KATALOG-Schlüssel
       der Art ({ art: "brett3d", wert: "holz" }), nachdem er sein Blatt
       geschlossen hat. Weg wie ein Tipp auf die Leiste: `TABS.wechseln`
       baut die Shop-Seite, falls sie noch fehlt (Nachbarseiten entstehen
       sonst erst im Leerlauf), und zeichnet sie sofort — ein Tipp wartet
       nicht aufs Einrasten des Bandes. Danach Reiter „Design" und das
       Stück-Blatt mit Preis und „Kaufen". Klappt das nicht (kein Shop, Tab
       nicht gewechselt, Stück unbekannt), bleibt es still beim Tab-Wechsel.
       Liefert, ob das Stück-Blatt offen ist. */
    zumShop(stueck) {
        if (!stueck || typeof TABS === "undefined" || typeof SHOP === "undefined") {
            return false;
        }
        try {
            TABS.wechseln(SHOP.id);
            const griff = SHOP.griff;
            if (TABS.aktiveId !== SHOP.id || !griff || typeof griff.oeffnen !== "function") {
                return false;
            }
            if (typeof griff.teil === "function" && griff.teil() !== "design" && typeof griff.teilSetzen === "function") {
                griff.teilSetzen("design");
            }
            return griff.oeffnen("stueck:" + stueck.art + "-" + stueck.wert) === true;
        } catch (fehler) {
            return false;
        }
    },

    /* Liegt oben ein Blatt der reinen Sammlung (Klasse `up-sm-blatt` des
       Gerüst-Bausteins), geht es zu — sein Abschnitt wandert dabei von
       selbst zurück in den Rest. Fremde Blätter bleiben unberührt. */
    _restBlattSchliessen() {
        if (typeof UPCREW_BLATT === "undefined" || typeof UPCREW_BLATT.oben !== "function") {
            return;
        }
        const oben = UPCREW_BLATT.oben();
        if (oben && oben.el && typeof oben.el.querySelector === "function"
                && oben.el.querySelector(".up-sm-blatt") && typeof oben.schliessen === "function") {
            oben.schliessen();
        }
    },

    /* ---------------------------------------------------------------- *
     * Die eigenen Regale (Auftrag Blunderluck, Punkt 2)
     * ---------------------------------------------------------------- */

    /* Reihenfolge seit v0.159.0 wie im Entwurf Sammlung-Neu: Brett ·
       Brett-Design 2D · Brett-Design 3D · Figuren · Figuren-Stil 3D. */
    regale() {
        return [SAMMLUNG.brettRegal(), SAMMLUNG.designRegal(), SAMMLUNG.themaRegal(),
            SAMMLUNG.figurArtRegal(), SAMMLUNG.figurenRegal()];
    },

    _bild(name) {
        return "<img class=\"sammlung-bild\" src=\"" + SAMMLUNG.BILD_ORDNER
            + "klein-" + name + ".png\" alt=\"\">";
    },

    /* Was gerade am 3D-Brett gilt. Ohne 3D-Modul (Tests, kein WebGL) die
       Vorgabe. */
    _brett3d() {
        if (typeof window !== "undefined" && window.BRETT_3D && window.BRETT_3D.aussehen) {
            return window.BRETT_3D.aussehen();
        }
        return { thema: SAMMLUNG.THEMEN[0].wert, figuren: SAMMLUNG.FIGUREN[0].wert };
    },

    /* Dürfen Thema und Figuren gewählt werden? Ohne 3D-Modul nur in der
       Werkstatt — dieselbe Antwort, die das Modul gäbe, ohne Admin. */
    aussehenFrei() {
        if (typeof window !== "undefined" && window.BRETT_3D && window.BRETT_3D.aussehenFrei) {
            return window.BRETT_3D.aussehenFrei();
        }
        return FREISCHALTUNG.werkstatt();
    },

    /*
     * BRETT UND FIGUREN SIND ZWEI STÜCKE (seit v0.157.4, Nutzer 29.09.2026:
     * „alles als items in die sammlung zum freischalten · 2d brett standard
     * drin und an und 3d brett erst später"). Bis v0.157.3 ein Regal „Brett"
     * mit 2D / 3D flach / 3D.
     *
     *   Regal „Brett"   (schluessel "brett"):   2D (Vorgabe) · 3D ab Holzhalle
     *   Regal „Figuren" (schluessel "figurart"): 2D (Vorgabe) · 3D ab Marmorsaal
     *
     * SEIT v0.159.0 (Nutzer 29.09.2026: „erst 3d brett dann figuren") in
     * dieser Reihenfolge, bis v0.158.0 umgekehrt; alle vier Kombinationen
     * sind möglich ("scheiben" = 3D-Brett mit 2D-Figuren), nichts zieht mehr
     * etwas mit. Der folgende Absatz beschreibt den Stand bis v0.158.0:
     *
     * Gespeichert bleibt EINE Art (jsreischaltung.js: "2d" | "oben" | "3d",
     * "oben" = 3D-Figuren auf dem 2D-Brett). 3D-Brett setzt 3D-Figuren
     * voraus: Wer das 3D-Brett nimmt, bekommt die 3D-Figuren mit; wer die
     * 2D-Figuren nimmt, das 2D-Brett. Werden beide zugleich widersprüchlich
     * übernommen, gewinnt das Brett (`_artVon`).
     */
    brettRegal() {
        return {
            schluessel: "brett",
            titel: "Brett",
            wert: FREISCHALTUNG.teile().brett,
            stuecke: [
                { wert: "2d", name: "2D", bild: (typeof FIGUREN_FLACH !== "undefined")
                    ? FIGUREN_FLACH.miniBrett() : SAMMLUNG._bild("brett-2d") },
                { wert: "3d", name: "3D", frei: FREISCHALTUNG.brettDreiDFrei(), ab: "Holzhalle",
                    bild: SAMMLUNG._bild("brett-3d") }
            ],
            uebernehmen(wert) {
                SAMMLUNG._teilWaehlen("brett", wert);
            }
        };
    },

    figurArtRegal() {
        const oben = typeof FIGUREN_FLACH !== "undefined" && FIGUREN_FLACH.obenBilder;
        return {
            schluessel: "figurart",
            titel: "Figuren",
            wert: FREISCHALTUNG.teile().figuren,
            stuecke: [
                { wert: "2d", name: "2D", bild: (typeof FIGUREN_FLACH !== "undefined")
                    ? FIGUREN_FLACH.miniBrett() : SAMMLUNG._bild("brett-2d") },
                { wert: "3d", name: "3D", frei: FREISCHALTUNG.dreiDFrei(), ab: "Marmorsaal",
                    bild: oben ? FIGUREN_FLACH.miniBrett(true) : SAMMLUNG._bild("brett-3d") }
            ],
            uebernehmen(wert) {
                SAMMLUNG._teilWaehlen("figuren", wert);
            }
        };
    },

    /*
     * BRETT-DESIGN · 2D (seit v0.159.0, js\brett-design.js): flache
     * Paletten für das 2D-Brett — Grau (Vorgabe), Farbwelt (ab Level 2),
     * Holz, Marmor, Nacht, Turnier (ab ihrem Ort im Turm).
     * Seit v0.162.0 nennt `ab` nur noch einen ORT, nie ein Level („Lv 2"
     * fällt weg — die Oberfläche nennt kein Level mehr): Die gesperrte
     * „Farbwelt" bekommt ihr Band vom Baustein. Frei wird sie weiter mit
     * Level 2 (`BRETT_DESIGN.frei`, unverändert).
     */
    designRegal() {
        return {
            schluessel: "design2d",
            titel: "Brett-Design · 2D",
            wert: BRETT_DESIGN.wahl(),
            stuecke: BRETT_DESIGN.DESIGNS.map((d) => ({
                wert: d.wert,
                name: d.name,
                frei: BRETT_DESIGN.frei(d.wert),
                ab: d.ort || "",
                bild: BRETT_DESIGN.miniBild(d.wert)
            })),
            uebernehmen(wert) {
                BRETT_DESIGN.waehlen(wert);
            }
        };
    },

    /* Die Art aus einem Entwurf (Brett- und Figuren-Wahl); was fehlt, gilt
       wie jetzt. */
    _artVon(brett, figuren) {
        const jetzt = FREISCHALTUNG.teile();
        return FREISCHALTUNG.artAus(brett || jetzt.brett, figuren || jetzt.figuren);
    },

    /* Der Baustein ruft `uebernehmen` je geändertem Regal nacheinander —
       gesammelt und EINMAL angewandt, danach neu gezeichnet, falls das
       andere Stück mitgezogen wurde. */
    _wahl: null,

    _teilWaehlen(teil, wert) {
        if (!SAMMLUNG._wahl) {
            SAMMLUNG._wahl = {};
            Promise.resolve().then(() => SAMMLUNG._wahlAnwenden());
        }
        SAMMLUNG._wahl[teil] = wert;
    },

    _wahlAnwenden() {
        const wahl = SAMMLUNG._wahl || {};
        SAMMLUNG._wahl = null;
        const jetzt = FREISCHALTUNG.teile();
        const b = wahl.brett || jetzt.brett;
        const f = wahl.figuren || jetzt.figuren;
        const art = FREISCHALTUNG.brettSetzen(SAMMLUNG._artVon(wahl.brett, wahl.figuren));
        const danach = FREISCHALTUNG.teile(art);
        if ((danach.brett !== b || danach.figuren !== f) && SAMMLUNG.tab) {
            SAMMLUNG._zeigen();
        }
        return art;
    },

    /* Die Regale „Brett-Thema · 3D" und „Figuren · 3D": gleich gebaut, nur
       Liste und Schlüssel unterscheiden sich. Frei ist ein Stück seit
       v0.147.0 JE STÜCK, sobald sein Ort im Turm erreicht ist
       (`FREISCHALTUNG.brettStueckFrei`, dort auch Admin und Werkstatt). */
    _stilRegal(schluessel, titel, liste) {
        const alleFrei = SAMMLUNG.aussehenFrei();
        const stueckFrei = (wert) => (typeof FREISCHALTUNG.brettStueckFrei === "function")
            ? FREISCHALTUNG.brettStueckFrei(schluessel, wert) : alleFrei;
        return {
            schluessel: schluessel,
            titel: titel,
            wert: SAMMLUNG._brett3d()[schluessel],
            stuecke: liste.map((eintrag) => ({
                wert: eintrag.wert,
                name: eintrag.name,
                frei: !eintrag.ort || stueckFrei(eintrag.wert),
                ab: eintrag.ort || "",
                bild: SAMMLUNG._bild(eintrag.bild)
            })),
            uebernehmen(wert) {
                if (typeof window !== "undefined" && window.BRETT_3D && window.BRETT_3D.aussehenWaehlen) {
                    window.BRETT_3D.aussehenWaehlen(schluessel, wert);
                }
            }
        };
    },

    /* Die Designs des 3D-Bretts (bis v0.158.0 „Brett-Thema · 3D"). */
    themaRegal() {
        return SAMMLUNG._stilRegal("thema", "Brett-Design · 3D", SAMMLUNG.THEMEN);
    },

    figurenRegal() {
        return SAMMLUNG._stilRegal("figuren", "Figuren-Stil · 3D", SAMMLUNG.FIGUREN);
    },

    /* ---------------------------------------------------------------- *
     * „NN %" gesammelt (Auftrag Gemeinsam, Punkt 2)
     *
     * SEIT v0.162.0 zählt der Anpassen-Baustein selbst (`tab.zaehlen()`):
     * alle Sammel-Kategorien — die eigenen Regale (mit den Stücken des
     * Katalogs, auch denen, die noch „bald" sind) und die Arten des
     * Katalogs. Dazu kommen hier die eigenen Abschnitte der reinen Sammlung
     * (Fähigkeiten, Brettformen — wie bisher; die Abzeichen zählten nie mit
     * und zählen weiter nicht). Die eigene Rechnung über `STUFEN` ist
     * entfallen. Nicht mitgezählt: „Darstellung" (Hell/Dunkel/Gerät ist eine
     * Einstellung, nichts zum Sammeln) und die Sets (eigene Merkplätze).
     * Steht der Baustein noch nicht (Tests ohne Bildschirm), zählen nur die
     * eigenen Regale.
     * ---------------------------------------------------------------- */

    anteil() {
        let hat = 0;
        let alle = 0;

        if (SAMMLUNG.tab && typeof SAMMLUNG.tab.zaehlen === "function") {
            const gezaehlt = SAMMLUNG.tab.zaehlen();
            hat += gezaehlt.hat;
            alle += gezaehlt.alle;
        } else {
            const alleFrei = FREISCHALTUNG.werkstatt();
            for (const regal of SAMMLUNG.regale()) {
                for (const stueck of regal.stuecke) {
                    alle++;
                    if (alleFrei || stueck.frei !== false) {
                        hat++;
                    }
                }
            }
        }

        /* Die eigenen Abschnitte der reinen Sammlung: alles „da". */
        const karten = SAMMLUNG.kartenAnzahl();
        const formen = SAMMLUNG.brettformen().length;
        alle += karten + formen;
        hat += karten + formen;

        return {
            hat: hat,
            alle: alle,
            prozent: alle > 0 ? Math.round(hat / alle * 100) : 0
        };
    },

    /* ---------------------------------------------------------------- *
     * Die reine Sammlung (Auftrag Blunderluck, Punkt 4)
     * ---------------------------------------------------------------- */

    /* Alle Karten der Bibliothek: Fähigkeiten und Unglücke — genau die, die
       das Raster zeigt (`TEAM_SCHACH._iconRasterBauen`). */
    kartenAnzahl() {
        let anzahl = 0;
        for (const stufe of SCHACH_VARIANTEN.STUFEN) {
            anzahl += SCHACH_VARIANTEN.faehigkeitenDerStufe(stufe.id).length;
            anzahl += SCHACH_VARIANTEN.pechDerStufe(stufe.id).length;
        }
        return anzahl;
    },

    /* Die Brettformen = die Spielarten zur Auswahl. */
    brettformen() {
        return SCHACH_VARIANTEN.zurAuswahl();
    },

    abzeichenEl: null,

    _abzeichenEinsetzen() {
        if (typeof UPCREW_ABZEICHEN === "undefined" || typeof RANGLISTE === "undefined"
                || !RANGLISTE.abzeichenListe) {
            return;
        }
        if (SAMMLUNG.abzeichenEl && SAMMLUNG.abzeichenEl.parentNode) {
            SAMMLUNG.abzeichenEl.parentNode.removeChild(SAMMLUNG.abzeichenEl);
        }
        SAMMLUNG.abzeichenEl = UPCREW_SAMMLUNG.abzeichenTeil(RANGLISTE.abzeichenListe(null, true),
            (eintrag) => RANGLISTE.abzeichenZeigen(eintrag));
        SAMMLUNG.restEl.insertBefore(SAMMLUNG.abzeichenEl, SAMMLUNG.restEl.firstChild);
    },

    /* Die Teile der reinen Sammlung kommen aus dem Gerüst-Baustein
       (`UPCREW_SAMMLUNG.rest/teil/gitter/stueck/innen`); hier nur, WAS
       darin steht. */
    restBauen() {
        const rest = UPCREW_SAMMLUNG.rest();
        rest.appendChild(SAMMLUNG._faehigkeitenBauen());
        rest.appendChild(SAMMLUNG._brettformenBauen());
        return rest;
    },

    /* Eine Überschrift im Stil der Regale: „Name n/m". */
    _teilBauen(titel, hat, alle) {
        return UPCREW_SAMMLUNG.teil(titel, hat, alle);
    },

    /*
     * „Fähigkeiten n/m": DIESELBE Bibliothek wie bis v0.144 im Tab
     * „Fähigkeiten" (`TEAM_SCHACH._infoInhaltBauen`) — Umschalter
     * Fähigkeiten/Unglücke, das i mit Lootboxen und Stufen, das Raster; ein
     * Tipp auf eine Kachel öffnet Beschreibung und abgespielte Anleitung.
     * Übernommen, nicht nachgebaut: So geht nichts verloren, und die
     * Bibliothek im Spiel bleibt dieselbe.
     */
    _faehigkeitenBauen() {
        const anzahl = SAMMLUNG.kartenAnzahl();
        const teil = SAMMLUNG._teilBauen("Fähigkeiten", anzahl, anzahl);
        teil.classList.add("sammel-faehigkeiten");
        const innen = UPCREW_SAMMLUNG.innen();
        TEAM_SCHACH._infoInhaltBauen(innen);
        teil.appendChild(innen);
        return teil;
    },

    /* „Brettformen n/m": je Spielart eine Kachel mit ihrer Form (Felder,
       beim Kreuz ohne Ecken) und dem Namen; antippen = kurze Beschreibung. */
    _brettformenBauen() {
        const formen = SAMMLUNG.brettformen();
        const teil = SAMMLUNG._teilBauen("Brettformen", formen.length, formen.length);
        const gitter = UPCREW_SAMMLUNG.gitter();

        for (const variante of formen) {
            gitter.appendChild(UPCREW_SAMMLUNG.stueck({
                name: variante.titel,
                bild: SAMMLUNG._formBauen(variante),
                da: true,
                beiKlick: () => DIALOG.hinweis(variante.titel, variante.beschreibung || "")
            }));
        }

        teil.appendChild(gitter);
        return teil;
    },

    /* Die Form einer Spielart als winziges Feldraster — ohne Figuren, nur
       hell/dunkel und die toten Ecken des Kreuzes (dieselbe Quelle wie die
       Vorschau: `SCHACH_VARIANTEN.kreuzEcken`). */
    _formBauen(variante) {
        const form = document.createElement("span");
        form.className = "stueck-form";
        form.setAttribute("aria-hidden", "true");
        form.style.setProperty("--form-spalten", String(variante.breite));
        form.style.setProperty("--form-reihen", String(variante.hoehe));
        const ecken = variante.kreuz ? SCHACH_VARIANTEN.kreuzEcken(variante) : [];
        const felder = variante.breite * variante.hoehe;
        for (let feld = 0; feld < felder; feld++) {
            const reihe = Math.floor(feld / variante.breite);
            const spalte = feld % variante.breite;
            const zelle = document.createElement("i");
            zelle.className = ecken.indexOf(feld) !== -1 ? "form-leer"
                : ((reihe + spalte) % 2 === 0 ? "form-hell" : "form-dunkel");
            form.appendChild(zelle);
        }
        return form;
    },

    /* ---------------------------------------------------------------- *
     * Die Vorschau zeigt das echte Brett (Auftrag Blunderluck, Punkt 3)
     * ---------------------------------------------------------------- */

    /* Das Brett der Start-Vorschau, gemerkt je Spielart — die Vorschau
       zeichnet bei jedem Antippen neu, gerechnet werden muss es nur einmal. */
    _brettGemerkt: null,

    _startBrett() {
        const variante = START._spielart();
        if (!SAMMLUNG._brettGemerkt || SAMMLUNG._brettGemerkt.id !== variante.id) {
            SAMMLUNG._brettGemerkt = { id: variante.id, brett: TEAM_SCHACH._vorschauBrett(variante) };
        }
        return { variante: variante, brett: SAMMLUNG._brettGemerkt.brett };
    },

    _name(liste, wert) {
        const eintrag = liste.find((e) => e.wert === wert) || liste[0];
        return eintrag.name;
    },

    /*
     * Rückruf des Bausteins nach jedem Zeichnen der Vorschau
     * (`opt.vorschau(el, entwurf, app)`). Für Blunderluck ersetzt er das
     * gezeichnete 6×6 durch die ECHTE Start-Vorschau (dieselbe wie auf dem
     * Start, `TEAM_SCHACH._vorschauBauen`). Bei 3D-Brett legt das 3D-Brett ein
     * Standbild mit Thema und Figuren des ENTWURFS darüber — nur für dieses
     * Bild; das echte Brett ändert erst „Übernehmen". Ohne 3D (kein WebGL,
     * noch am Laden) bleibt es beim flachen Gitter.
     *
     * SEIT v0.162.0 ruft der Baustein ihn ZWEIMAL je Zeichnen, solange ein
     * Blatt offen ist: für die klebende Vorschau der Seite und für die
     * KOMPAKTE im Blatt (`el` trägt dann `upa-kompakt`). Beide bekommen
     * dasselbe Brett — jedes sein eigenes Gitter; die kleinere Breite der
     * kompakten setzt css\stil.css (`.upa-kompakt .sammlung-buehne`). Das
     * 3D-Standbild rechnet dabei nur einmal (`MINI.cache` in brett-3d.js).
     */
    _vorschau(el, entwurf, app) {
        if (app !== "blunderluck" || typeof TEAM_SCHACH === "undefined"
                || typeof START === "undefined") {
            return;
        }
        const buehne = el.querySelector(".upa-schach-buehne");
        if (!buehne) {
            return;
        }

        const extra = entwurf.extra || {};
        /* Seit v0.157.4 zwei Stücke — die Vorschau zeigt, was „Übernehmen"
           daraus machen würde. */
        const art = SAMMLUNG._artVon(extra.brett, extra.figurart);
        /* Seit v0.159.0 vier Arten: 3D-Brett mit 3D-Figuren ("3d") oder mit
           2D-Scheiben ("scheiben"), 2D-Brett mit 3D-Figuren ("oben") oder
           2D-Figuren ("2d"). */
        const drei = art === "3d" || art === "scheiben";
        const start = SAMMLUNG._startBrett();
        const gitter = TEAM_SCHACH._vorschauBauen(start.variante, start.brett, true);
        const halter = document.createElement("div");
        /* Seit v0.157.3 zeigt die flache Vorschau die Figuren des ENTWURFS
           (2D flach oder 3D von oben), unabhängig von der geltenden Art;
           seit v0.159.0 auch das Brett-Design 2D des Entwurfs, flach. */
        halter.className = "sammlung-buehne"
            + (art === "oben" ? " figuren-oben" : (drei ? "" : " nur-flach"))
            + (drei ? "" : " brett-2d-vorschau");
        if (!drei && typeof BRETT_DESIGN !== "undefined") {
            BRETT_DESIGN.stilSetzen(gitter, extra.design2d || BRETT_DESIGN.wahl());
        }
        halter.appendChild(gitter);
        buehne.replaceWith(halter);

        if (drei && typeof window !== "undefined" && window.BRETT_3D && window.BRETT_3D.standbildMit) {
            window.BRETT_3D.standbildMit(gitter, { thema: extra.thema, figuren: extra.figuren,
                scheiben: art === "scheiben" });
        }

        const kopf = el.querySelector(".upa-v-kopf span");
        if (kopf) {
            const design = (typeof BRETT_DESIGN !== "undefined")
                ? (BRETT_DESIGN.eintrag(extra.design2d || BRETT_DESIGN.wahl()) || {}).name : "";
            if (art === "3d") {
                kopf.textContent = "3D · " + SAMMLUNG._name(SAMMLUNG.THEMEN, extra.thema)
                    + " · " + SAMMLUNG._name(SAMMLUNG.FIGUREN, extra.figuren);
            } else if (art === "scheiben") {
                kopf.textContent = "3D · " + SAMMLUNG._name(SAMMLUNG.THEMEN, extra.thema) + " · 2D-Figuren";
            } else {
                kopf.textContent = "2D" + (design ? " · " + design : "")
                    + (art === "oben" ? " · 3D-Figuren" : "");
            }
        }
    }
};

if (typeof module !== "undefined" && module.exports) {
    module.exports = SAMMLUNG;
}
