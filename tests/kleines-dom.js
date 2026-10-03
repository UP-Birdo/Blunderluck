/*
 * kleines-dom.js — ein kleines Dokument für Tests, die ECHTE Bausteine
 * fahren, die ihr Markup als Text setzen (seit v0.162.0, für
 * tests\test-sammlung-a.js: js\upcrew-anpassen.js schreibt `innerHTML`,
 * js\upcrew-platz.js liest `outerHTML`, js\upcrew-blatt.js hängt Ebenen ein).
 *
 * KEINE Testdatei (beginnt nicht mit `test-`, der Läufer startet sie nicht)
 * und kein Browser: nur so viel DOM, wie diese Bausteine brauchen.
 *
 *   - Elemente mit Attributen, `className`/`classList`, `dataset`, `style`
 *     (Zuweisung und `setProperty`), `hidden`, `disabled`, `id`, `type` …;
 *   - `innerHTML` setzen (kleiner Zerleger: Tags, Attribute, Text; `<x/>`
 *     und die leeren HTML-Tags schliessen sich selbst) und lesen,
 *     `outerHTML`, `textContent`;
 *   - `appendChild`, `insertBefore`, `removeChild`, `remove`, `replaceWith`;
 *   - `querySelector(All)`, `matches`, `closest` für Auswahlen aus Tag,
 *     `.klasse`, `#id`, `[attr]`, `[attr="wert"]`, Nachfahre (Leerzeichen),
 *     Kind (`>`) und Komma-Listen;
 *   - `addEventListener`/`removeEventListener` und `click()`, das wie im
 *     Browser nach oben steigt (`target`, `stopPropagation`); ein
 *     abgeschalteter Knopf (`disabled`) löst nichts aus.
 *
 * Gemessen wird nichts (`offsetWidth`/`offsetHeight` = 0), gezeichnet auch
 * nicht. Wie es aussieht und ob etwas waagrecht rollt, zeigt nur der Browser.
 *
 *     const { dokumentBauen } = require("./kleines-dom.js");
 *     const dokument = dokumentBauen();      // .documentElement, .body
 */

const LEERE_TAGS = ["img", "br", "hr", "input", "meta", "link"];
/* Eigenschaften, die ein Attribut gleichen Namens spiegeln. */
const TEXT_ATTRIBUTE = ["id", "type", "title", "src", "alt", "href", "decoding"];
const JA_NEIN_ATTRIBUTE = ["hidden", "disabled", "inert"];

const kebab = (name) => String(name).replace(/[A-Z]/g, (b) => "-" + b.toLowerCase());
const kamel = (name) => String(name).replace(/-([a-z])/g, (_, b) => b.toUpperCase());
const maskiert = (text) => String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const maskiertWert = (text) => String(text).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
const entmaskiert = (text) => String(text).replace(/&quot;/g, "\"").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

/* ------------------------------------------------------------------ *
 * Auswahlen
 * ------------------------------------------------------------------ */

/* Eine zusammengesetzte Auswahl ("button.a[data-x="1"]") → Prüf-Funktion. */
function teilPruefer(teil) {
    const pruefungen = [];
    const muster = /^([a-zA-Z][a-zA-Z0-9-]*|\*)|\.([a-zA-Z0-9_-]+)|#([a-zA-Z0-9_-]+)|\[([a-zA-Z0-9_-]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\]]*)))?\]/y;
    let stelle = 0;
    while (stelle < teil.length) {
        muster.lastIndex = stelle;
        const t = muster.exec(teil);
        if (!t) {
            throw new Error("kleines-dom: Auswahl nicht verstanden: " + teil);
        }
        stelle = muster.lastIndex;
        if (t[1]) {
            const tag = t[1].toUpperCase();
            pruefungen.push((el) => tag === "*" || el.tagName.toUpperCase() === tag);
        } else if (t[2]) {
            const klasse = t[2];
            pruefungen.push((el) => el.classList.contains(klasse));
        } else if (t[3]) {
            const id = t[3];
            pruefungen.push((el) => el.getAttribute("id") === id);
        } else {
            const name = t[4];
            const hatWert = t[5] !== undefined || t[6] !== undefined || t[7] !== undefined;
            const wert = t[5] !== undefined ? t[5] : (t[6] !== undefined ? t[6] : t[7]);
            pruefungen.push((el) => el.hasAttribute(name) && (!hatWert || el.getAttribute(name) === wert));
        }
    }
    return (el) => pruefungen.every((p) => p(el));
}

/* "a b > c" → [{ kombi: "", passt }, { kombi: " ", passt }, { kombi: ">", passt }] */
function ketteBauen(auswahl) {
    const kette = [];
    const stuecke = auswahl.trim().replace(/\s*>\s*/g, " > ").split(/\s+/);
    let kombi = "";
    for (const stueck of stuecke) {
        if (stueck === ">") {
            kombi = ">";
            continue;
        }
        kette.push({ kombi: kette.length === 0 ? "" : (kombi || " "), passt: teilPruefer(stueck) });
        kombi = "";
    }
    return kette;
}

function kettePasst(el, kette, stelle) {
    if (!el || el.nodeType !== 1 || !kette[stelle].passt(el)) {
        return false;
    }
    if (stelle === 0) {
        return true;
    }
    if (kette[stelle].kombi === ">") {
        return kettePasst(el.parentNode, kette, stelle - 1);
    }
    for (let vor = el.parentNode; vor; vor = vor.parentNode) {
        if (kettePasst(vor, kette, stelle - 1)) {
            return true;
        }
    }
    return false;
}

function passt(el, auswahl) {
    return String(auswahl).split(",").some((eine) => {
        const kette = ketteBauen(eine);
        return kette.length > 0 && kettePasst(el, kette, kette.length - 1);
    });
}

/* ------------------------------------------------------------------ *
 * Knoten
 * ------------------------------------------------------------------ */

function textKnoten(text) {
    return { nodeType: 3, parentNode: null, textContent: String(text),
        get outerHTML() { return maskiert(this.textContent); } };
}

function stilBauen() {
    const stil = {};
    Object.defineProperty(stil, "setProperty", { value(name, wert) { stil[name] = String(wert); } });
    Object.defineProperty(stil, "getPropertyValue", { value: (name) => (name in stil ? stil[name] : "") });
    Object.defineProperty(stil, "removeProperty", { value(name) { delete stil[name]; } });
    return stil;
}

function elementBauen(tag, dokument) {
    const attribute = {};
    const hoerer = {};
    const el = {
        nodeType: 1,
        tagName: String(tag),
        ownerDocument: dokument,
        parentNode: null,
        childNodes: [],
        style: stilBauen(),
        scrollTop: 0,
        scrollLeft: 0,
        offsetWidth: 0,
        offsetHeight: 0,

        setAttribute(name, wert) { attribute[String(name)] = String(wert); },
        getAttribute: (name) => (name in attribute ? attribute[name] : null),
        hasAttribute: (name) => name in attribute,
        removeAttribute(name) { delete attribute[name]; },
        get attributNamen() { return Object.keys(attribute); },

        get className() { return attribute.class || ""; },
        set className(w) { attribute.class = String(w); },

        get children() { return el.childNodes.filter((k) => k.nodeType === 1); },
        get firstChild() { return el.childNodes[0] || null; },
        get firstElementChild() { return el.children[0] || null; },
        get lastChild() { return el.childNodes[el.childNodes.length - 1] || null; },
        get nextSibling() {
            const g = el.parentNode ? el.parentNode.childNodes : [];
            return g[g.indexOf(el) + 1] || null;
        },

        appendChild(kind) { return el.insertBefore(kind, null); },
        insertBefore(kind, vor) {
            if (kind.parentNode) {
                kind.parentNode.removeChild(kind);
            }
            const stelle = vor ? el.childNodes.indexOf(vor) : -1;
            el.childNodes.splice(stelle === -1 ? el.childNodes.length : stelle, 0, kind);
            kind.parentNode = el;
            return kind;
        },
        removeChild(kind) {
            const stelle = el.childNodes.indexOf(kind);
            if (stelle !== -1) {
                el.childNodes.splice(stelle, 1);
                kind.parentNode = null;
            }
            return kind;
        },
        remove() {
            if (el.parentNode) {
                el.parentNode.removeChild(el);
            }
        },
        replaceWith(neu) {
            if (el.parentNode) {
                el.parentNode.insertBefore(neu, el);
                el.parentNode.removeChild(el);
            }
        },
        contains(anderer) {
            for (let k = anderer; k; k = k.parentNode) {
                if (k === el) {
                    return true;
                }
            }
            return false;
        },

        get textContent() {
            return el.childNodes.map((k) => k.textContent).join("");
        },
        set textContent(w) {
            el.childNodes.slice().forEach((k) => el.removeChild(k));
            if (w !== "" && w !== null && w !== undefined) {
                el.appendChild(textKnoten(w));
            }
        },
        get innerHTML() { return el.childNodes.map((k) => k.outerHTML).join(""); },
        set innerHTML(html) {
            el.childNodes.slice().forEach((k) => el.removeChild(k));
            zerlegen(String(html), el, dokument);
        },
        get outerHTML() {
            let kopf = "<" + el.tagName;
            const stilTeile = [];
            if (attribute.style) {
                stilTeile.push(attribute.style.replace(/;\s*$/, ""));
            }
            for (const name of Object.keys(el.style)) {
                stilTeile.push(kebab(name) + ":" + el.style[name]);
            }
            for (const name of Object.keys(attribute)) {
                if (name !== "style") {
                    kopf += " " + name + "=\"" + maskiertWert(attribute[name]) + "\"";
                }
            }
            if (stilTeile.length > 0) {
                kopf += " style=\"" + maskiertWert(stilTeile.join(";")) + "\"";
            }
            if (LEERE_TAGS.indexOf(el.tagName.toLowerCase()) !== -1) {
                return kopf + ">";
            }
            return kopf + ">" + el.innerHTML + "</" + el.tagName + ">";
        },

        matches: (auswahl) => passt(el, auswahl),
        closest(auswahl) {
            for (let k = el; k && k.nodeType === 1; k = k.parentNode) {
                if (passt(k, auswahl)) {
                    return k;
                }
            }
            return null;
        },
        querySelectorAll(auswahl) {
            const treffer = [];
            const gehen = (knoten) => {
                for (const k of knoten.children) {
                    if (passt(k, auswahl)) {
                        treffer.push(k);
                    }
                    gehen(k);
                }
            };
            gehen(el);
            return treffer;
        },
        querySelector: (auswahl) => el.querySelectorAll(auswahl)[0] || null,

        addEventListener(art, f) { (hoerer[art] = hoerer[art] || []).push(f); },
        removeEventListener(art, f) { hoerer[art] = (hoerer[art] || []).filter((g) => g !== f); },
        /* Ein Ereignis an DIESEM Element (ohne Aufsteigen). */
        _ausloesen(ereignis) { (hoerer[ereignis.type] || []).slice().forEach((f) => f(ereignis)); },
        /* Ein Klick wie im Browser: steigt nach oben, bis jemand ihn anhält. */
        click() {
            for (let k = el; k && k.nodeType === 1; k = k.parentNode) {
                if (k.disabled) {
                    return;
                }
            }
            let angehalten = false;
            const ereignis = { type: "click", target: el, stopPropagation() { angehalten = true; },
                preventDefault() {} };
            for (let k = el; k && !angehalten; k = k.parentNode) {
                if (typeof k._ausloesen === "function") {
                    k._ausloesen(ereignis);
                }
            }
        },
        getBoundingClientRect: () => ({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 }),
        focus() {}
    };

    el.classList = {
        contains: (k) => el.className.split(/\s+/).indexOf(k) !== -1,
        add(...namen) {
            for (const k of namen) {
                if (!el.classList.contains(k)) {
                    el.className = (el.className + " " + k).trim();
                }
            }
        },
        remove(...namen) {
            el.className = el.className.split(/\s+/).filter((k) => k && namen.indexOf(k) === -1).join(" ");
        },
        toggle(k, an) {
            const soll = an === undefined ? !el.classList.contains(k) : !!an;
            el.classList[soll ? "add" : "remove"](k);
            return soll;
        }
    };

    el.dataset = new Proxy({}, {
        get: (_, name) => (typeof name === "string" && ("data-" + kebab(name)) in attribute
            ? attribute["data-" + kebab(name)] : undefined),
        set(_, name, wert) { attribute["data-" + kebab(name)] = String(wert); return true; },
        has: (_, name) => typeof name === "string" && ("data-" + kebab(name)) in attribute,
        deleteProperty(_, name) { delete attribute["data-" + kebab(name)]; return true; },
        ownKeys: () => Object.keys(attribute).filter((n) => n.indexOf("data-") === 0).map((n) => kamel(n.slice(5))),
        getOwnPropertyDescriptor: (_, name) => (("data-" + kebab(name)) in attribute
            ? { value: attribute["data-" + kebab(name)], writable: true, enumerable: true, configurable: true }
            : undefined)
    });

    for (const name of TEXT_ATTRIBUTE) {
        Object.defineProperty(el, name, {
            get: () => (name in attribute ? attribute[name] : ""),
            set(w) { attribute[name] = String(w); }
        });
    }
    for (const name of JA_NEIN_ATTRIBUTE) {
        Object.defineProperty(el, name, {
            get: () => name in attribute,
            set(w) {
                if (w) {
                    attribute[name] = "";
                } else {
                    delete attribute[name];
                }
            }
        });
    }
    return el;
}

/* ------------------------------------------------------------------ *
 * Der Zerleger für innerHTML
 * ------------------------------------------------------------------ */

function zerlegen(html, wurzel, dokument) {
    const marke = /<!--[\s\S]*?-->|<\/([a-zA-Z][a-zA-Z0-9-]*)\s*>|<([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[^\s=>\/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>/g;
    const attributMuster = /([^\s=>\/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
    let offen = wurzel;
    let stelle = 0;
    const text = (bis) => {
        const stueck = html.slice(stelle, bis);
        if (stueck !== "") {
            offen.appendChild(textKnoten(entmaskiert(stueck)));
        }
    };
    let t;
    while ((t = marke.exec(html)) !== null) {
        text(t.index);
        stelle = marke.lastIndex;
        if (t[1]) {
            /* schliessendes Tag: bis zum passenden offenen Element hinauf */
            for (let k = offen; k && k !== wurzel; k = k.parentNode) {
                if (k.tagName.toLowerCase() === t[1].toLowerCase()) {
                    offen = k.parentNode;
                    break;
                }
            }
        } else if (t[2]) {
            const el = elementBauen(t[2], dokument);
            let a;
            attributMuster.lastIndex = 0;
            while ((a = attributMuster.exec(t[3] || "")) !== null) {
                const wert = a[2] !== undefined ? a[2] : (a[3] !== undefined ? a[3] : (a[4] !== undefined ? a[4] : ""));
                el.setAttribute(a[1], entmaskiert(wert));
            }
            offen.appendChild(el);
            if (!t[4] && LEERE_TAGS.indexOf(t[2].toLowerCase()) === -1) {
                offen = el;
            }
        }
    }
    text(html.length);
}

/* ------------------------------------------------------------------ *
 * Das Dokument
 * ------------------------------------------------------------------ */

function dokumentBauen() {
    const hoerer = {};
    const dokument = {
        nodeType: 9,
        createElement: (tag) => elementBauen(tag, dokument),
        createElementNS: (raum, tag) => elementBauen(tag, dokument),
        createTextNode: (text) => textKnoten(text),
        addEventListener(art, f) { (hoerer[art] = hoerer[art] || []).push(f); },
        removeEventListener(art, f) { hoerer[art] = (hoerer[art] || []).filter((g) => g !== f); },
        querySelector: (auswahl) => dokument.documentElement.querySelector(auswahl),
        querySelectorAll: (auswahl) => dokument.documentElement.querySelectorAll(auswahl),
        getElementById: (id) => dokument.documentElement.querySelector("#" + id),
        visibilityState: "visible"
    };
    dokument.documentElement = elementBauen("html", dokument);
    dokument.body = elementBauen("body", dokument);
    dokument.documentElement.appendChild(dokument.body);
    return dokument;
}

module.exports = { dokumentBauen: dokumentBauen };
