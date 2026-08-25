# Blunderluck — wohin das Spiel soll

> **Das ist kein Bauplan und keine Zusage.** Hier steht die Richtung, die der
> Nutzer am 25.08.2026 beschrieben hat, dazu die Folgen, die daraus für das
> Bauen entstehen. Was tatsächlich als Nächstes gebaut wird, steht in der
> `ROADMAP.md`; was gerade ist, in der `STATUS.md`.
>
> **Nichts hiervon wird auf Verdacht gebaut** (Hausregel). Diese Datei
> existiert, damit Entscheidungen, die HEUTE fallen, die Richtung nicht
> versperren — und damit man weiss, welche Türen man gerade zumauert.

## 1. Der Kern in einem Satz

**Blunderluck ist Schach mal anders:** die Grundregeln des Schachs, aber mit
vielen Dingen dazu — allen voran Lootboxen auf dem Brett, in denen
Fähigkeiten liegen, die man einsetzen kann.

Das ist seit dem ersten Tag so gebaut und bleibt der Kern. Alles Weitere
hier ist Ausbau um diesen Kern herum, nicht Ersatz.

## 2. Wohin es ausgeliefert werden soll

In dieser Reihenfolge, so hat der Nutzer es beschrieben:

| Stufe | Was es ist | Wie weit sind wir |
|---|---|---|
| Heute | Öffentliche Web-Seite auf GitHub Pages | **läuft**, seit v0.5.0 |
| Dann | **Play Store** (Android) | geplant, Weg steht in der `ROADMAP.md` |
| Später | **App Store** (iOS) | bisher ausdrücklich ausgeschlossen — siehe unten |
| Ganz später | **Steam** (PC), eventuell | neu am 25.08.2026 |

### Was jede Stufe wirklich bedeutet

**Play Store.** Der Weg ist schon eingeordnet (`ROADMAP.md`, „Fernziele",
Beratungs-Referenz `docs\uebergabe-schach-app.md`). Kurz: Vorher muss die
Architektur umgebaut werden — echte Anmeldung, die Datenbank-Regeln zu, Züge
als Absicht statt als fertiger Stand. Heute darf jedes Gerät in zwei Pfade
der Datenbank schreiben; das ist für eine Runde unter Bekannten in Ordnung
und für einen Store nicht.

**App Store.** Hier liegt eine Hürde, die man kennen muss, BEVOR man auf sie
zuläuft: **Apple weist Apps ab, die im Kern nur eine verpackte Web-Seite
sind** (Prüfrichtlinie 4.2, „Minimum Functionality"). Für den Play Store
genügt eine Hülle um die Web-Seite (Trusted Web Activity) — bei Apple in
aller Regel nicht. Der App Store verlangt praktisch eine echte App.

**Das ist der Grund, warum iOS bisher ausgeschlossen war**, und es hängt
unmittelbar an der Frage aus Abschnitt 5 (echtes 3D oder nicht): Wer sich für
eine echte Spiel-Engine entscheidet, löst das iOS-Problem nebenbei mit. Wer
bei Web-Technik bleibt, löst es nie.

**Steam.** Überraschung: **Steam ist von den dreien technisch das
Einfachste.** Es gibt dort keine Prüfung, die „das ist nur eine Web-Seite"
abweist; eine Web-App in einer Desktop-Hülle (Electron oder Tauri) ist ein
gangbarer Weg, und dass Blunderluck reines HTML, CSS und JavaScript ohne
Bauschritt ist, hilft dabei sogar. Es kostet eine einmalige Gebühr je Spiel
und verlangt eine Oberfläche, die für Maus und grossen Bildschirm gedacht
ist. **Das zuletzt genannte Ziel ist also womöglich das erste erreichbare.**

## 3. Die Modi

Alles Überlegungen des Nutzers, nichts davon entschieden:

- **Standard-Schach** — ohne alles, die reinen Grundregeln.
- **Item-Schach** — was Blunderluck heute ist: Lootboxen mit Fähigkeiten.
- **Gold-Münzen-Schach** — man kauft sich vor der Partie mit Spielwährung
  seine Figuren zusammen und stellt sie auf; wer eine gegnerische Figur
  schlägt, bekommt deren Wert gutgeschrieben.
- **Rätsel-Schach** — gestellte Aufgaben lösen.
- **Rogue-Like** — eventuell.
- **Freie Aufstellung** — man legt für jede Figur selbst fest, wo sie steht.

**Der Plan dahinter, und er ist gut:** *„Am Anfang soll noch alles offen und
einstellbar sein, um zu schauen, was Spass macht und die Grenzen zu testen;
später alles feste Modi in diese Richtung."*

Genau so ist die App heute gebaut — Regler für Lootbox-Menge, Item-Vorrat,
Armeegrösse, dazu ungewöhnliche Bretter. **Ein fester Modus ist nichts
anderes als eine gespeicherte Reglerstellung mit einem Namen.** Das heisst:
Der Weg von heute nach „feste Modi" ist kurz, solange die Regler das
Verhalten wirklich vollständig beschreiben. Wer eine Sonderregel an einer
anderen Stelle als in den Reglern einbaut, verlängert diesen Weg.

**Zwei der Modi sind mehr als Reglerstellungen** und brauchen echtes neues
Modell:

- **Gold-Münzen-Schach** braucht eine Aufstellungs-Phase vor der Partie und
  ein Konto je Seite, das während der Partie mitwächst.
- **Rätsel-Schach** braucht gespeicherte Aufgaben und eine Prüfung „ist das
  die Lösung" — das Modell kann heute nur „läuft weiter" oder „vorbei".

**Freie Aufstellung** liegt dazwischen: Das Brett kann schon jede Stellung
darstellen, es fehlt nur die Bedienung zum Hinstellen.

## 4. Skins

Für den **Hintergrund**, für **jede Figur einzeln** und für das **Feld**.
Freischalten durch: genug spielen, Events, Kampagne — oder kaufen.

### Der eine Punkt, an dem es gefährlich wird

**Lootboxen sind heute reines Spielgeschehen.** Sie liegen auf dem Brett,
man zieht darüber, man bekommt eine Fähigkeit. Es ist kein Geld im Spiel.
Das ist rechtlich harmlos.

**Sobald für ECHTES Geld etwas ZUFÄLLIGES gekauft werden kann, ist es eine
andere Welt.** Bezahlte Lootboxen sind in Belgien verboten, in den
Niederlanden stark eingeschränkt, in Deutschland führen sie regelmässig zu
einer höheren USK-Einstufung, und beide Stores verlangen inzwischen, dass die
Wahrscheinlichkeiten offengelegt werden. Bei einer Zielgruppe ab sechs Jahren
ist das kein Randthema.

**Die Empfehlung, und sie kostet nichts, wenn man sie von Anfang an
einhält:**

> **Zufall ja — aber nie gegen Geld. Geld ja — aber nur für etwas, das man
> vorher sieht.**
>
> Also: Skins durch Spielen freischalten dürfen gern ausgewürfelt werden.
> Skins, die Geld kosten, werden EINZELN und zu einem bekannten Preis
> gekauft. Keine bezahlte Kiste mit Überraschung.

Damit bleibt die ganze Vision rechtlich einfach, und die Zielgruppe ab sechs
bleibt erreichbar. Wer es andersherum baut, muss die Frage mit jemandem
klären, der davon wirklich etwas versteht — das bin ausdrücklich nicht ich.

### Was Skins technisch bedeuten

Ein Skin je Figur heisst: **jede Figur braucht ihre Bilder in jeder
Ausführung.** Heute sind das zwölf Bilder (sechs Arten mal zwei Farben) aus
Blender. Mit fünf Figuren-Skins sind es sechzig, dazu Feld und Hintergrund.
Der Weg dahin ist bereits richtig angelegt — die Bilder entstehen aus einem
Skript (`tools\Figuren-Blender.py`), nicht von Hand. **Das ist der Grund,
warum dieses Skript gepflegt gehört**, auch wenn es heute nur zwölf Bilder
macht.

## 5. Der Look — und die eine grosse Weggabelung

Der Nutzer beschreibt:

- **sehr stilistisch**, standardmässig viel 3D und Rundes im heutigen Look;
- die **Oberfläche aber auch ganz anders**, je nachdem, was man auswählt;
- beim Start einer Runde eventuell eine **3D-Flug-Animation** über das Brett;
- **Themen-Figuren** (Star Wars, Harry Potter und Ähnliches);
- **Figuren mit mehr Detail**, die sich **animiert fortbewegen**, und die
  beim Schlagen etwas TUN — der Bauer zieht die Mistgabel und haut die
  andere Figur vom Feld.

### Hier liegt die wichtigste Entscheidung des ganzen Vorhabens

**Heute:** Blender rendert **Standbilder**, die App zeigt sie als Bilder und
schiebt sie mit CSS über das Brett. Das ist billig, schnell und läuft auf
allem.

**Was beschrieben ist**, geht damit nicht: Eine Figur, die eine Mistgabel
zieht und zuschlägt, ist eine **Animation in Echtzeit**. Dafür gibt es genau
zwei Wege:

| Weg | Was es heisst | Was es kostet |
|---|---|---|
| **Bildfolgen** | Blender rendert jede Bewegung als viele Einzelbilder, die App spielt sie ab wie einen Daumenkino-Streifen | Bleibt bei der heutigen Technik. Wird bei vielen Figuren mal vielen Skins mal vielen Bewegungen sehr schnell sehr viel Datenmenge |
| **Echte 3D-Anzeige** | Die Figuren sind Modelle, die im Browser bzw. in einer Engine berechnet werden (three.js, Babylon, oder gleich Godot/Unity) | Die ganze Anzeige-Schicht wird neu. Dafür sind Animation, Kamerafahrt, Skins und iOS auf einmal lösbar |

**Was daran wichtig ist, und zwar JETZT:** Solange diese Frage offen ist,
sollte man **nicht viel weiteres Geld in den CSS-Look stecken** — auch nicht
in Punkt 11 („der Gesamtstil"). Was dort gebaut wird, ist bei einer
Entscheidung für echtes 3D umsonst gewesen.

**Die gute Nachricht:** Betroffen wäre nur die Anzeige. **Die fünf
Schach-Schichten darunter** (`schach.js`, `schach-runde.js`,
`schach-tafel.js`, `schach-varianten.js`, der Bot) **wissen nichts über den
Bildschirm und überleben jeden solchen Umbau unverändert.** Das ist kein
Zufall, sondern die eiserne Regel des Projekts — und sie zahlt sich genau
hier aus. Wer sie aufweicht, verliert diesen Vorteil.

## 6. Zielgruppe: sechs bis unendlich

> **ENTSCHIEDEN AM 25.08.2026: KEIN BLUT.** Nutzer-Ansage im Wortlaut: „kein
> blut". Damit ist die Frage unten beantwortet und war die erste der drei
> Vision-Entscheidungen, die fielen. **Was daraus folgt und ab sofort gilt:**
>
> - Es gibt **keinen Schalter** für Blut, auch keinen versteckten. Ein
>   zuschaltbares Blut hätte die Einstufung der ganzen App gehoben (siehe
>   unten) — die Zielgruppe ab sechs bleibt damit erreichbar.
> - Das Wegschlagen darf trotzdem **wuchtig** sein: Staubwolke, Sterne, ein
>   Sprung im Stein, eine Figur, die vom Feld fliegt. Das ist die dritte
>   Möglichkeit weiter unten, und sie ist jetzt der Weg.
> - **Auch die Zeichen halten sich daran** (v0.63.0): Der Nekromant zeigt ein
>   Aufstehen aus dem Boden statt eines Grabsteins, der Dieb eine Augenbinde.
>   Wer neue Zeichen oder Animationen baut, prüft sie an dieser Zeile.

Der Nutzer: *„Zielgruppe 6 bis unendlich drüber, also kein Blut — zumindest
für die Jungen. Wenn man es einstellt, für die Alten eventuell schon, mit
Flecken auf dem Spielfeld und so."*

**Was daran zu bedenken ist:** Eine Altersfreigabe (USK, PEGI, im Store über
den IARC-Fragebogen) bewertet, **was die App maximal zeigen kann** — nicht,
was in der Voreinstellung eingeschaltet ist. Ein Schalter, der Blut
dazuschaltet, hebt die Einstufung der ganzen App, auch für alle, die ihn nie
anfassen. Zwei Freigaben für eine App gibt es nicht.

**Praktisch heisst das:** Entweder das Spiel bleibt unblutig — dann trägt es
die niedrige Einstufung und erreicht die Zielgruppe ab sechs —, oder es gibt
Blut, dann gilt die höhere Einstufung für alle. Beides zugleich geht nicht.

**Die dritte Möglichkeit**, und sie passt zum Humor des Spiels: Das
Wegschlagen darf ruhig wuchtig sein, ohne blutig zu sein. Eine Figur, die vom
Feld geschleudert wird, Staubwolke, Sterne, ein Sprung im Stein — das ist
sichtbar heftig und bleibt bei sechs Jahren.

**Eine Zielgruppe ab sechs zieht weitere Pflichten nach sich**, sobald ein
Store dazukommt: keine personalisierte Werbung, Einkäufe hinter einer
Elternabfrage, und beim Datenschutz die strengeren Regeln (in Deutschland
gilt die Einwilligung in Datenverarbeitung erst ab sechzehn — darunter
entscheiden die Eltern). Auch das ist kein Hindernis, aber es entscheidet
mit, wie die Anmeldung aussehen darf.

## 7. Was heute schon richtig dafür steht

Damit klar ist, was NICHT neu gemacht werden muss:

- **Der Kern ist sauber getrennt.** Die Regeln kennen keinen Bildschirm; ein
  Anzeige-Umbau lässt sie unberührt (siehe Abschnitt 5).
- **Die Spielart ist eine Tabelle** (`schach-varianten.js`), kein Sonderfall
  im Code. Neue Modi sind dort Einträge, keine Verzweigungen.
- **Der Datenvertrag ist additiv** — Felder kommen dazu, keine verschwinden.
  Genau das braucht man, wenn später Skins, Währung und Modi dazukommen und
  alte Spielstände weiter lesbar bleiben müssen.
- **Die Bilder entstehen aus Skripten**, nicht von Hand. Das ist die
  Voraussetzung dafür, dass Skins überhaupt bezahlbar werden.
- **Es gibt einen Computer-Gegner.** Für Rätsel-Modus und Kampagne ist das
  die halbe Miete.

## 8. Was im Weg steht

- **Die Datenbank ist offen** (zwei Pfade, ohne Anmeldung beschreibbar). Für
  heute richtig entschieden, für einen Store nicht haltbar. Begründung:
  `docs\entscheidungen\offen-und-abgelehnt.md`, „Die offene Datenbank".
- **Es gibt keine echte Anmeldung**, nur eine selbstgebaute Spielerliste mit
  PIN. Sobald Geld oder Besitz (Skins, Währung) im Spiel ist, geht das nicht
  mehr: Wem etwas gehört, muss nachweisbar sein.
- **Die Anzeige-Frage aus Abschnitt 5 ist offen** und blockiert den Ausbau
  des Looks.
- **Nichts davon ist heute dringend.** Die App wird von einer Handvoll Leuten
  gespielt, und die Phase „ausprobieren, was Spass macht" ist genau die
  richtige. Der Punkt dieser Datei ist nur: **beim Ausprobieren keine Tür
  zumauern.**

## 9. Die Reihenfolge, die sich daraus ergibt

Kein Zeitplan — eine Abhängigkeitskette:

1. **Weiter ausprobieren**, mit offenen Reglern, bis klar ist, was Spass
   macht. Läuft.
2. **Feste Modi benennen**, sobald sich Reglerstellungen herausschälen, die
   sich gut anfühlen. Billig, solange alles in `schach-varianten.js` bleibt.
3. **Die Anzeige-Frage entscheiden** (Abschnitt 5). Sie steht vor jedem
   weiteren Ausbau des Looks und vor iOS.
4. **Steam prüfen**, wenn ein Desktop-Anlass da ist — technisch der kürzeste
   Weg zu einem Store.
5. **Architektur-Umbau** (echte Anmeldung, Datenbank zu, Züge geprüft) — die
   Voraussetzung für ALLES, was mit Store, Besitz oder Geld zu tun hat.
6. **Play Store**, dann **App Store** (Letzterer nur nach Entscheidung 3).
7. **Skins und Währung** — zuletzt, weil sie 5 voraussetzen und weil sie die
   Regel aus Abschnitt 4 einhalten müssen.

## 10. Wortlaut

Der ungekürzte Wortlaut der Nutzer-Ansage vom 25.08.2026 steht in der
`TODO.md` unter „Richtung des Spiels". Diese Datei ist die Auslegung davon;
wo beide sich widersprechen, gilt der Wortlaut.
