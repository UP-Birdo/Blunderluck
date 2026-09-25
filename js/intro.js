/*
 * intro.js — das UPCrew-Intro beim Start (seit v0.138.0).
 *
 * UPCrew ist das Studio hinter allen Spielen. Beim Öffnen erscheint kurz
 * das Studio-Zeichen, dann das Spiel — in JEDER UPCrew-App gleich (Nutzer-
 * Ansage 25.09.2026: „beide Apps gleich"). Vorlage mit Aufbau und Zeiten:
 * Apps\Typoluck\js\intro.js; die Stil-Regeln stehen in css\stil-start.css.
 *
 * Drei Regeln, damit es nicht nervt:
 *   - höchstens einmal je Besuch (sessionStorage), nicht bei jedem Neuladen;
 *   - ein Tipp oder eine Taste überspringt es sofort;
 *   - die App lädt darunter weiter — das Intro hält nichts auf.
 */

const INTRO = {

    STEHT_MS: 1800,
    AUSBLENDEN_MS: 400,

    /* Derselbe Schlüssel wie in Typoluck: Wer das Zeichen in dieser Sitzung
       schon gesehen hat, sieht es nicht noch einmal. */
    SCHLUESSEL: "upcrew.intro-gesehen",

    faellig() {
        try {
            return window.sessionStorage.getItem(INTRO.SCHLUESSEL) !== "ja";
        } catch (fehler) {
            return true;
        }
    },

    zeigen(behaelter) {
        return new Promise((fertig) => {
            if (!behaelter || !INTRO.faellig()) {
                fertig();
                return;
            }
            try {
                window.sessionStorage.setItem(INTRO.SCHLUESSEL, "ja");
            } catch (fehler) {
                /* Ohne Sitzungsspeicher kommt es eben jedes Mal. */
            }

            const element = (tag, klasse, text) => {
                const el = document.createElement(tag);
                el.className = klasse;
                if (text) {
                    el.textContent = text;
                }
                return el;
            };

            behaelter.innerHTML = "";
            const logo = element("div", "intro-logo");
            logo.setAttribute("role", "img");
            logo.setAttribute("aria-label", "UPCrew");
            logo.appendChild(element("span", "intro-up", "UP"));
            logo.appendChild(element("span", "intro-crew", "Crew"));
            behaelter.appendChild(logo);
            behaelter.appendChild(element("p", "intro-zeile", "präsentiert"));
            behaelter.hidden = false;

            let vorbei = false;
            const beenden = () => {
                if (vorbei) {
                    return;
                }
                vorbei = true;
                clearTimeout(uhr);
                document.removeEventListener("keydown", beenden);
                behaelter.classList.add("intro-weg");
                setTimeout(() => {
                    behaelter.hidden = true;
                    behaelter.classList.remove("intro-weg");
                    behaelter.innerHTML = "";
                    fertig();
                }, INTRO.AUSBLENDEN_MS);
            };

            const uhr = setTimeout(beenden, INTRO.STEHT_MS);
            behaelter.addEventListener("click", beenden, { once: true });
            document.addEventListener("keydown", beenden);
        });
    }
};
