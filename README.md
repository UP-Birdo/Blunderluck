# Blunderluck

**Schach, aber mit Lootboxen.**

Auf freien Feldern des Bretts erscheinen Boxen. Wer mit einer Figur darüber
zieht, sammelt sie ein — und darin steckt entweder eine **Fähigkeit** oder ein
**Unglück**. Aus einer ruhigen Stellung wird so in einem Halbzug eine ganz
andere Partie.

Der Name sagt, worum es geht: *blunder* ist der Fachbegriff für einen groben
Patzer im Schach, *luck* das Glück. Beides gehört hier zusammen.

## Was drinsteckt

**Rund zwanzig Fähigkeiten** in vier Seltenheitsstufen — gewöhnlich,
ungewöhnlich, episch, legendär. Ein paar Beispiele:

| Fähigkeit | Was sie tut |
|---|---|
| **Mauer** | Sperrt Felder für einige Züge — clever gesetzt, schneidet sie eine ganze Figur ab. |
| **Frost** | Friert eine Fläche ein; wer darin steht, zieht nicht. |
| **Teleport** | Eine eigene Figur springt an eine freie Stelle. |
| **Doppelzug** | Zwei Züge hintereinander. |
| **Nekromant** | Holt eine gefallene Figur zurück aufs Brett. |
| **Dieb** | Nimmt dem Gegner eine Fähigkeit aus dem Vorrat. |
| **Nudelholz** | Walzt eine ganze Bahn und schiebt alles vor sich her. |

**Fünf Unglücke**, die sofort zuschlagen: Der **Stolperstein** wirft die Figur
zurück, der **Spalt** reisst dauerhafte Löcher ins Brett, die
**Halluzination** lässt die gegnerischen Figuren für eine Weile falsch
aussehen. Ein Unglück darf als Einziges eine Partie direkt beenden — eine
Fähigkeit nie: Sie bereitet die Stellung vor, den entscheidenden Angriff führt
immer der Zug. Denken wird belohnt, nicht das Ziehen des besseren Loses.

**Bretter, die es sonst nirgends gibt:** vom kleinen 6-mal-6 über das
Doppelbrett bis zum Kreuz, auf dem bis zu vier Armeen aus vier Richtungen
antreten. Dazu Spielarten wie die Zufallsarmee, bei der jede Aufstellung neu
ausgelost wird.

**Alles einstellbar je Partie:** wie viele Lootboxen erscheinen (von wenig bis
Lootbox-Regen), welche Fähigkeiten überhaupt vorkommen (bis hin zur selbst
zusammengestellten Auswahl), wie gross die Armeen sind und ob die Seltenheit
einer Box sichtbar ist.

**Team-Modus:** Auf jeder Seite können mehrere Leute mitspielen. Innerhalb
eines Teams gibt es keine Reihenfolge — entweder stimmt das Team über einen
Vorschlag ab, oder es gilt schlicht: wer zuerst zieht, hat gezogen.

**Rangliste und Profil:** Jede beendete Partie wird festgeschrieben. Sieg,
Unentschieden und geschlagene Figuren geben Punkte; ein Tipp auf einen Namen
zeigt, aus welchen Partien sie stammen.

## Mitspielen

Die App läuft als Web-Seite im Browser — nichts zu installieren, kein Konto.
Auf dem Handy lässt sie sich über „Zum Startbildschirm hinzufügen" wie eine
App ablegen. Beim ersten Öffnen fragt sie nach einem Namen und einer
selbstgewählten PIN; mit der kommt man von jedem Gerät wieder als man selbst
hinein.

## Technik und Datenschutz

- Reines HTML, CSS und JavaScript — keine Bibliothek, kein Bauschritt.
- Der gemeinsame Spielstand liegt in einer Firebase Realtime Database (REST).
- **Keine Geheimnisse im Klartext:** PIN und Verwaltungs-Passwort werden nur
  als SHA-256-Prüfsummen gespeichert. In der Datenbank steht nur, was die
  Mitspieler ohnehin alle sehen.

## Wünsche und Fehler

Der Knopf **Wunsch** oben in der App öffnet ein vorbefülltes GitHub-Formular —
kein Zugangsschlüssel in der App, angemeldet wird bei GitHub.

## Entwicklung

Regressionstests: `tools\Test-Blunderluck.ps1 -NurFazit` (Anleitung in
`tests\README.md`). Ausliefern: `tools\Deploy-Blunderluck.ps1` (Anleitung in
`docs\DEPLOYMENT.md`). Lokal ausprobieren:
`tools\Blunderluck lokal starten.cmd`.

Blunderluck ist 2026 aus dem Spiele-Projekt „Quizz" hervorgegangen, in dem das
Schach als einer von drei Tabs begann.
