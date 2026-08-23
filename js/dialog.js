/*
 * dialog.js — eigene Dialoge.
 *
 * Haus-Regel: kein confirm() und kein alert(). Beide sehen auf jedem Gerät
 * anders aus, blockieren die Seite und lassen sich nicht gestalten.
 *
 * Verwendung:
 *     const ja = await DIALOG.frage("Zeile loeschen?", "…", "Loeschen");
 *     await DIALOG.hinweis("Titel", "Text");
 */

const DIALOG = {

    /* Wird von app.js beim Start gesetzt (das <div id="dialog"> aus index.html). */
    behaelter: null,

    aufbauen(behaelter) {
        DIALOG.behaelter = behaelter;
    },

    /*
     * Rückfrage mit zwei Knöpfen. Liefert true bei Bestätigung.
     * Der Schalter `gefaehrlich` färbt den Bestätigen-Knopf rot (Löschen).
     */
    /*
     * `zusatz` ist wahlfrei: ein fertiges Element, das unter dem Text steht —
     * gedacht für Bilder, die eine Frage beantworten, bevor man sie stellt
     * (die Bildanleitung zu einer Fähigkeit, seit v0.41). Es bleibt bei EINER
     * Dialog-Funktion; wer nichts übergibt, bekommt genau den Dialog von
     * vorher.
     */
    frage(titel, text, bestaetigenText, gefaehrlich, zusatz) {
        return DIALOG._zeigen({
            titel: titel,
            text: text,
            zusatz: zusatz || null,
            knoepfe: [
                { beschriftung: "Abbrechen", wert: false, stil: "knopf-still" },
                {
                    beschriftung: bestaetigenText || "OK",
                    wert: true,
                    stil: gefaehrlich ? "knopf-gefahr" : "knopf-haupt"
                }
            ]
        });
    },

    /*
     * Reine Mitteilung mit einem Knopf. `zusatz` ist wahlfrei und wirkt wie bei
     * `frage`: ein fertiges Element unter dem Text — gebraucht wird es für die
     * Bildanleitung einer Fähigkeit, die man nur ansieht (seit v0.48).
     */
    hinweis(titel, text, zusatz) {
        return DIALOG._zeigen({
            titel: titel,
            text: text,
            zusatz: zusatz || null,
            knoepfe: [{ beschriftung: "Verstanden", wert: true, stil: "knopf-haupt" }]
        });
    },

    /*
     * DIE ZWEI-SCHRITT-BESTÄTIGUNG AM KNOPF SELBST (seit v0.112, Nutzer-
     * Entscheidung 22.08., ROADMAP Bündel X6): Der erste Druck stellt die
     * Frage IM Knopf — er wird rot und zeigt „Wirklich?" —, erst der zweite
     * Druck führt aus. Wer nicht erneut drückt, bekommt den Knopf nach vier
     * Sekunden unverändert zurück.
     *
     * Sie ersetzt den Rückfrage-Dialog NUR bei kleinen zerstörenden
     * Aktionen, deren Folge sich von selbst versteht (Löschen, Austreten,
     * Aufgeben). Alles, was eine echte Erklärung braucht, bleibt bei
     * `DIALOG.frage` — der Knopf kann keinen Erklärtext tragen.
     *
     * Aufruf beim Bauen des Knopfs; der Knopf kommt zurück, damit der
     * Aufruf direkt im `appendChild` stehen kann:
     *     leiste.appendChild(DIALOG.zweiSchritt(
     *         X._knopf("Löschen", "knopf-gefahr", null),
     *         () => X.loeschen(ding)));
     */
    zweiSchritt(knopf, aktion, beschriftung) {
        const ruhe = { text: knopf.textContent, klasse: knopf.className };
        let zeiger = null;

        const zurueck = () => {
            if (zeiger !== null) {
                clearTimeout(zeiger);
                zeiger = null;
            }
            knopf.textContent = ruhe.text;
            knopf.className = ruhe.klasse;
        };

        knopf.addEventListener("click", () => {
            if (zeiger === null) {
                knopf.textContent = beschriftung || "Wirklich?";
                knopf.className = ruhe.klasse + " knopf-gefahr knopf-wirklich";
                zeiger = setTimeout(zurueck, 4000);
                return;
            }
            zurueck();
            aktion();
        });

        return knopf;
    },

    /*
     * DIE KURZMELDUNG (seit v0.114, ROADMAP Bündel X2): eine kleine Meldung
     * am unteren Rand, die von selbst wieder geht — für reine „hat
     * geklappt"-Rückmeldungen, die niemand wegklicken soll. Alles, was der
     * Nutzer LESEN muss (Fehler, Erklärungen), bleibt bei `DIALOG.hinweis`.
     */
    kurzmeldung(text) {
        if (typeof document === "undefined" || !document.body) {
            return;
        }

        /* Immer nur eine: Eine neue Meldung löst die alte ab. */
        const alte = document.body.querySelector
            ? document.body.querySelector(".kurzmeldung") : null;
        if (alte && alte.parentNode) {
            alte.parentNode.removeChild(alte);
        }

        const meldung = document.createElement("div");
        meldung.className = "kurzmeldung";
        meldung.setAttribute("role", "status");
        meldung.textContent = text;
        document.body.appendChild(meldung);

        setTimeout(() => {
            meldung.classList.add("kurzmeldung-geht");
            setTimeout(() => {
                if (meldung.parentNode) {
                    meldung.parentNode.removeChild(meldung);
                }
            }, 250);
        }, 2200);
    },

    /*
     * Abfrage eines kurzen Textes (z. B. des eigenen Namens).
     * Liefert den eingegebenen Text oder null bei Abbruch.
     * Mit `abbrechbar = false` gibt es keinen Abbrechen-Knopf — für die Frage
     * beim ersten Besuch, ohne die es nicht weitergeht.
     *
     * `mehrzeilig` (seit v0.59) macht daraus ein Feld, das mit dem Text nach
     * unten WÄCHST statt in eine endlose Zeile zu laufen. Gebraucht wird es
     * beim Wunsch-Knopf: Dort schreibt man Sätze, keinen Namen. Ein Zeilenumbruch
     * ist dann ein Zeilenumbruch — bestätigt wird über den Knopf, nicht über die
     * Eingabetaste (siehe `_zeigen`).
     */
    eingabe(titel, text, vorgabe, bestaetigenText, abbrechbar, mehrzeilig) {
        return DIALOG._zeigen({
            titel: titel,
            text: text,
            eingabe: {
                wert: vorgabe || "",
                platzhalter: mehrzeilig ? "" : "Name",
                mehrzeilig: !!mehrzeilig
            },
            knoepfe: (abbrechbar === false)
                ? [{ beschriftung: bestaetigenText || "Weiter", wert: true, stil: "knopf-haupt" }]
                : [
                    { beschriftung: "Abbrechen", wert: false, stil: "knopf-still" },
                    { beschriftung: bestaetigenText || "Weiter", wert: true, stil: "knopf-haupt" }
                ]
        });
    },

    /*
     * Eingabe einer Zahlenfolge (PIN). Liefert die Ziffern als Zeichenkette
     * oder null bei Abbruch. Bestätigen geht erst, wenn genau `stellen`
     * Ziffern eingegeben sind.
     */
    zahlen(titel, text, stellen, bestaetigenText, abbrechbar) {
        return DIALOG._zeigen({
            titel: titel,
            text: text,
            eingabe: {
                wert: "",
                platzhalter: "".padStart(stellen, "0"),
                nurZiffern: true,
                stellen: stellen
            },
            knoepfe: (abbrechbar === false)
                ? [{ beschriftung: bestaetigenText || "Weiter", wert: true, stil: "knopf-haupt" }]
                : [
                    { beschriftung: "Abbrechen", wert: false, stil: "knopf-still" },
                    { beschriftung: bestaetigenText || "Weiter", wert: true, stil: "knopf-haupt" }
                ]
        });
    },

    /*
     * Auswahl aus einer Liste. `eintraege` ist eine Liste aus
     * { beschriftung, hinweis, wert }. Liefert den gewählten Wert oder null.
     * Für die Frage beim ersten Besuch: Bist du einer dieser Spieler?
     */
    liste(titel, text, eintraege, abbrechenText) {
        return DIALOG._zeigen({
            titel: titel,
            text: text,
            liste: eintraege,
            knoepfe: [
                { beschriftung: abbrechenText || "Abbrechen", wert: null, stil: "knopf-still" }
            ]
        });
    },

    /*
     * Zählt die geöffneten Dialoge durch (seit v0.107). Der Aufräum-Zeitgeber
     * des Schliessens räumt nur auf, wenn dazwischen kein NEUER Dialog
     * geöffnet wurde — sonst versteckte er den gerade erschienenen gleich mit.
     */
    _laufnummer: 0,

    _zeigen(vorgabe) {
        return new Promise((erfuellen) => {
            const behaelter = DIALOG.behaelter;
            const meineNummer = ++DIALOG._laufnummer;
            behaelter.innerHTML = "";
            behaelter.classList.remove("dialog-geht-hintergrund");

            const kasten = document.createElement("div");
            kasten.className = "dialog-kasten";
            kasten.setAttribute("role", "dialog");
            kasten.setAttribute("aria-modal", "true");

            const ueberschrift = document.createElement("h2");
            ueberschrift.textContent = vorgabe.titel;
            kasten.appendChild(ueberschrift);

            const absatz = document.createElement("p");
            absatz.textContent = vorgabe.text;
            kasten.appendChild(absatz);

            /* Optionaler Zusatz: ein fertiges Element unter dem Text. */
            if (vorgabe.zusatz) {
                kasten.appendChild(vorgabe.zusatz);
            }

            /* Optionale Auswahlliste (jeder Eintrag ein eigener Knopf). */
            if (vorgabe.liste) {
                const liste = document.createElement("div");
                liste.className = "dialog-liste";

                for (const eintrag of vorgabe.liste) {
                    const knopf = document.createElement("button");
                    knopf.type = "button";
                    knopf.className = "dialog-listeneintrag";

                    knopf.appendChild(DIALOG._zeile("dialog-listenname", eintrag.beschriftung));
                    if (eintrag.hinweis) {
                        knopf.appendChild(DIALOG._zeile("dialog-listenhinweis", eintrag.hinweis));
                    }

                    knopf.addEventListener("click", () => schliessen(eintrag.wert));
                    liste.appendChild(knopf);
                }

                kasten.appendChild(liste);
            }

            /* Optionales Eingabefeld. */
            let feld = null;
            if (vorgabe.eingabe) {
                const langerText = !!vorgabe.eingabe.mehrzeilig;

                feld = document.createElement(langerText ? "textarea" : "input");
                feld.className = "dialog-feld" + (langerText ? " dialog-feld-lang" : "");
                feld.value = vorgabe.eingabe.wert;
                feld.placeholder = vorgabe.eingabe.platzhalter || "";
                feld.setAttribute("aria-label", vorgabe.titel);

                if (langerText) {
                    /*
                     * Es wächst mit — bis zu einer Höhe, ab der der Dialog
                     * selbst scrollt (die Grenze steht in der Stildatei). Ein
                     * `textarea` hat von sich aus eine feste Zeilenzahl; ohne
                     * das Nachmessen bekäme man wieder ein Kästchen, in dem
                     * man nach vier Zeilen blind schreibt.
                     */
                    feld.rows = 4;
                    const mitwachsen = () => {
                        if (typeof feld.scrollHeight !== "number") {
                            return;
                        }
                        feld.style.height = "auto";
                        feld.style.height = feld.scrollHeight + "px";
                    };
                    feld.addEventListener("input", mitwachsen);
                    mitwachsen();

                } else if (vorgabe.eingabe.nurZiffern) {
                    /* Auf dem Handy soll der Zahlenblock erscheinen, und es
                       sollen nur Ziffern hineinkommen. */
                    feld.type = "text";
                    feld.inputMode = "numeric";
                    feld.autocomplete = "off";
                    feld.maxLength = vorgabe.eingabe.stellen;
                    feld.classList.add("dialog-feld-zahlen");
                    feld.addEventListener("input", () => {
                        const nurZiffern = feld.value.replace(/[^0-9]/g, "");
                        if (feld.value !== nurZiffern) {
                            feld.value = nurZiffern;
                        }
                    });
                } else {
                    feld.type = "text";
                }

                /*
                 * DIE SCHWEBENDE BESCHRIFTUNG (seit v0.114, ROADMAP Bündel
                 * X4): Bei einzeiligen Textfeldern steht die Beschriftung IM
                 * leeren Feld und wandert beim Tippen klein an den oberen
                 * Rand — statt eines Platzhalters, der beim ersten Zeichen
                 * verschwindet. Ziffernfelder (PIN) und mehrzeilige Felder
                 * bleiben, wie sie sind.
                 */
                const schwebend = !langerText && !vorgabe.eingabe.nurZiffern
                    && (vorgabe.eingabe.platzhalter || "") !== "";

                if (schwebend) {
                    const halter = document.createElement("div");
                    halter.className = "dialog-feld-halter";

                    const marke = document.createElement("span");
                    marke.className = "dialog-feld-marke";
                    marke.textContent = vorgabe.eingabe.platzhalter;
                    marke.setAttribute("aria-hidden", "true");

                    feld.placeholder = "";
                    const fuellstand = () => halter.classList.toggle(
                        "dialog-feld-gefuellt", feld.value !== "");
                    feld.addEventListener("input", fuellstand);
                    fuellstand();

                    halter.appendChild(feld);
                    halter.appendChild(marke);
                    kasten.appendChild(halter);
                } else {
                    kasten.appendChild(feld);
                }
            }

            const leiste = document.createElement("div");
            leiste.className = "dialog-knopfleiste";

            /*
             * Ergebnis eines Dialogs:
             *   ohne Eingabefeld -> true / false
             *   mit Eingabefeld  -> der Text bei Bestätigung, sonst null
             */
            /*
             * SCHLIESSEN IN ZWEI SCHRITTEN (seit v0.107): Erst spielt eine
             * kurze Ausblende-Animation (die Klasse `dialog-geht`, rund 100
             * Millisekunden), dann verschwindet der Dialog wirklich und das
             * Versprechen wird erfüllt. Der Riegel `zu` sorgt dafür, dass ein
             * zweiter Druck während des Ausblendens nichts doppelt auslöst.
             *
             * Ohne Animations-Unterstützung (die Tests, Bewegungs-Reduzierung
             * über die Stildatei) läuft die Wartezeit trotzdem — 100 ms sind
             * unterhalb der Wahrnehmungsschwelle für eine Antwort.
             */
            let zu = false;

            const schliessen = (wert) => {
                if (zu) {
                    return;
                }
                zu = true;

                document.removeEventListener("keydown", beiTaste);
                kasten.classList.add("dialog-geht");
                behaelter.classList.add("dialog-geht-hintergrund");

                const antwort = feld
                    ? (wert ? feld.value.trim() : null)
                    : wert;

                setTimeout(() => {
                    /* Nur aufräumen, wenn nicht längst der nächste Dialog
                       dasteht — siehe `_laufnummer`. */
                    if (DIALOG._laufnummer === meineNummer) {
                        behaelter.hidden = true;
                        behaelter.innerHTML = "";
                        behaelter.classList.remove("dialog-geht-hintergrund");
                        document.body.classList.remove("dialog-offen");
                    }
                    erfuellen(antwort);
                }, 100);
            };

            /* Bei erzwungener Eingabe (nur ein Knopf) bleibt Escape wirkungslos. */
            const escapeErlaubt = !(vorgabe.eingabe && vorgabe.knoepfe.length === 1);

            const beiTaste = (ereignis) => {
                if (ereignis.key === "Escape" && escapeErlaubt) {
                    schliessen(vorgabe.liste ? null : false);
                }
            };

            let bestaetigenKnopf = null;

            for (const knopfVorgabe of vorgabe.knoepfe) {
                const knopf = document.createElement("button");
                knopf.type = "button";
                knopf.className = "knopf " + knopfVorgabe.stil;
                knopf.textContent = knopfVorgabe.beschriftung;
                knopf.addEventListener("click", () => schliessen(knopfVorgabe.wert));
                leiste.appendChild(knopf);

                if (knopfVorgabe.wert === true) {
                    bestaetigenKnopf = knopf;
                }
            }

            /*
             * Bestätigen ist gesperrt, solange die Eingabe unvollständig ist:
             * bei Text ein leeres Feld, bei Ziffern eine falsche Anzahl.
             */
            if (feld && bestaetigenKnopf) {
                const vollstaendig = () => {
                    const wert = feld.value.trim();
                    if (vorgabe.eingabe.nurZiffern) {
                        return wert.length === vorgabe.eingabe.stellen;
                    }
                    return wert !== "";
                };

                const knopfPruefen = () => {
                    bestaetigenKnopf.disabled = !vollstaendig();
                };

                feld.addEventListener("input", knopfPruefen);
                feld.addEventListener("keydown", (ereignis) => {
                    /* Im mehrzeiligen Feld ist die Eingabetaste ein
                       Zeilenumbruch — bestätigt wird dort über den Knopf. */
                    if (vorgabe.eingabe.mehrzeilig) {
                        return;
                    }
                    if (ereignis.key === "Enter" && vollstaendig()) {
                        schliessen(true);
                    }
                });
                knopfPruefen();
            }

            kasten.appendChild(leiste);
            behaelter.appendChild(kasten);
            behaelter.hidden = false;

            /* Die Seite dahinter steht fest, solange der Dialog offen ist —
               siehe `body.dialog-offen` in der Stildatei (seit v0.108). */
            document.body.classList.add("dialog-offen");

            document.addEventListener("keydown", beiTaste);

            if (vorgabe.liste) {
                const ersterEintrag = kasten.querySelector(".dialog-listeneintrag");
                if (ersterEintrag) {
                    ersterEintrag.focus();
                }
            } else if (feld) {
                feld.focus();
                feld.select();
            } else {
                const letzterKnopf = leiste.lastElementChild;
                if (letzterKnopf) {
                    letzterKnopf.focus();
                }
            }
        });
    },

    /* Eine Textzeile innerhalb eines Listeneintrags. */
    _zeile(klasse, text) {
        const zeile = document.createElement("span");
        zeile.className = klasse;
        zeile.textContent = text;
        return zeile;
    }
};
