# ---------------------------------------------------------------------------
# Lootbox-Blender.py — erzeugt die zehn Lootbox-Bilder fuer Blunderluck
#
# WAS ES TUT
#   Baut in Blender einen weichen Wuerfel mit stark gebrochenen Kanten und
#   einem EINGRAVIERTEN Fragezeichen auf der Oberseite, und rendert ihn je
#   Seltenheitsstufe zweimal nach img\lootboxen\ — einmal normal, einmal mit
#   dem Zeichen auf dem Kopf (das ist der Unglueckswuerfel). Aufbau, Licht,
#   Kamera und Bildeinstellungen sind bewusst DIESELBEN wie in
#   Figuren-Blender.py — nur so passen Figuren und Lootboxen auf demselben
#   Brett zueinander.
#
# WIE MAN ES BENUTZT — zwei Wege, und sie sind NICHT gleichwertig
#
#   ZUM RENDERN: Doppelklick auf "Lootboxen rendern.cmd" im selben Ordner.
#       Das startet Blender ohne Fenster und zeigt den Fortschritt in der
#       Eingabeaufforderung. Das ist der normale Weg.
#
#   ZUM ANSCHAUEN UND SCHRAUBEN: in Blender selbst, Reiter "Scripting" ->
#       Text -> Open -> diese Datei -> "Run Script" (oder Alt+P).
#       Vorher aber RENDERN = False setzen! Mit RENDERN = True blockiert
#       das Rendern die Oberflaeche und Blender meldet "Keine Rueckmeldung".
#
#   ACHTUNG: Das Skript loescht alles, was gerade in der Blender-Datei ist.
#
# WO MAN SCHRAUBT
#   Alles Einstellbare steht im Block "STELLSCHRAUBEN". Die Form steht in
#   bau_wuerfel(); dort sind die Zahlen Kantenlaengen und Tiefen in
#   Blender-Einheiten, der Mittelpunkt liegt bei z = 0.
#
# WARUM ZEHN BILDER UND NICHT FUENF
#   Die Farbe traegt die Seltenheit (vier Stufen plus die verborgene Box mit
#   dem Regenbogen), und das Fragezeichen steckt seit v0.24.0 IM MESH — beim
#   Unglueckswuerfel steht es auf dem Kopf. Solange es ein aufgemaltes
#   Zeichen im Bildschirm-Code war, genuegten fuenf Bilder; eine Gravur laesst
#   sich dort nicht drehen. Zehn Bilder zu 256 Pixeln bleiben zusammen unter
#   einem halben Megabyte.
#
#   Vorgaenger (v0.23.0) war eine Truhe mit Deckel, Baendern und Schloss. Der
#   Nutzer hat sie am 24.08. zurueckgewiesen: „die item kisten sehen nicht
#   nach dem selben stil wie die figuren aus — am besten einen wuerfel der
#   schwebt mit abgerundeten ecken und einem eingravierten fragezeichen."
#   Sie steht im Backup Backup\Blunderluck\v0.20.0 nicht drin (sie ist
#   juenger); wer sie braucht, holt sie aus dem Git-Stand von v0.23.0.
# ---------------------------------------------------------------------------

import bpy
import os
import math
from mathutils import Vector


# ===========================================================================
# STELLSCHRAUBEN
# ===========================================================================

# Wohin die fertigen PNGs geschrieben werden. Wird angelegt, falls es fehlt.
AUSGABE_ORDNER = r"c:\Users\jonas.boeckle\OneDrive - Biffar GmbH & Co. KG\Biffar - IT\JKB\dev\Apps\Blunderluck\img\lootboxen"

# Bildgroesse (quadratisch). Kleiner als bei den Figuren (384): Eine Lootbox
# fuellt auf dem Brett 76 Prozent eines Feldes, eine Figur das Doppelte.
BILD_KANTE = 256

# Rechenaufwand je Bild. 32 fuer schnelle Probelaeufe.
SAMPLES = 256

# Auf False stellen, wenn nur die Szene gebaut werden soll (zum Anschauen).
RENDERN = True

# Die fuenf Faelle. Die Farbwerte sind die aus js\schach-varianten.js
# (STUFEN und STUFE_UNBEKANNT) — wer sie dort aendert, aendert sie hier mit.
#
# "regenbogen" gibt es nur einmal: Die verborgene Lootbox schillert, damit
# sie nach etwas aussieht, ohne die Stufe zu verraten (v0.69, Wunsch #26).
STUFEN = [
    ("gruen",     "#2e9e52", None),
    ("blau",      "#2f7fd0", None),
    ("lila",      "#8b46c8", None),
    ("gelb",      "#e0a800", None),
    ("unbekannt", "#8a919b", ["#e04b4b", "#e0a800", "#2e9e52",
                              "#2f7fd0", "#8b46c8"]),
]

# Wie viel dunkler die Einlage im gravierten Fragezeichen gegenueber dem
# Wuerfel ist (0.55 = knapp die halbe Helligkeit). Dieselbe Rechnung, die
# bis v0.22.0 TEAM_SCHACH._tonAendern im Bildschirm-Code machte.
EINLAGE_TON = 0.55

# Mattigkeit der Oberflaeche: 0 = Spiegel, 1 = voellig stumpf.
RAUHEIT = 0.60

# Licht und Belichtung — Zahl fuer Zahl aus Figuren-Blender.py uebernommen.
# Wer hier dreht, dreht dort mit, sonst passen Figur und Box nicht mehr
# zusammen.
BELICHTUNG = 0.0
LICHT_HAUPT = 265.0
LICHT_AUFHELLER = 30.0
LICHT_STREIFER = 55.0
LICHT_UMGEBUNG = 0.28

# Kameraneigung in Grad ueber der Waagerechten — wie bei den Figuren.
KAMERA_NEIGUNG = 50.0

# Wie viel des Bildes die Truhe fuellt. Der Rest ist Luft ringsum, damit der
# Schlagschatten des Bildschirms (drop-shadow) nicht am Rand abschneidet.
RAND_ANTEIL = 0.90

# Wie stark die Kanten gebrochen werden. Grosszuegig — genau das macht aus
# dem Wuerfel ein weiches Spielzeug im Stil der Figuren (Nutzer-Ansage
# 24.08.: „am besten einen Wuerfel der schwebt mit abgerundeten Ecken").
KANTEN_RUNDUNG = 0.14
KANTEN_STUFEN = 6


# ===========================================================================
# FESTE WERTE — die Form des Wuerfels
# ===========================================================================

WUERFEL_KANTE = 1.00        # x, y und z gleich lang

# Wie weit der Wuerfel um die Hochachse gedreht steht.
#
# WOZU: Die Kamera schaut mit 50 Grad recht steil von oben. Steht der Wuerfel
# achsparallel, sieht man fast nur seine Oberseite — im Bild wirkt er dann wie
# eine abgerundete Platte, nicht wie ein Wuerfel. Gedreht zeigt er Oberseite
# UND zwei Seitenflaechen, und das liest sich auf einen Blick als Koerper.
#
# Die GRAVUR wird NICHT mitgedreht: Sie liegt in derselben waagerechten Ebene,
# egal wie der Wuerfel darunter steht, und bleibt so im Bild aufrecht lesbar.
WUERFEL_DREHUNG = 30.0

# Das eingravierte Fragezeichen auf der Oberseite.
#
# GRAVUR HEISST WIRKLICH GRAVUR: Das Zeichen wird aus dem Wuerfel
# HERAUSGESCHNITTEN (Boolean), und in die Rille kommt ein dunkles Zeichen als
# Einlage. Nur die Rille allein waere auf einem 30-Pixel-Feld kaum zu sehen —
# der dunkle Grund macht sie lesbar, ohne dass ein aufgemaltes Zeichen
# daraufsitzt.
GRAVUR_HOEHE = 0.62         # Schriftgroesse in Blender-Einheiten
GRAVUR_TIEFE = 0.10         # wie tief die Rille in die Oberseite geht
GRAVUR_EINLAGE = 0.055      # wie hoch die dunkle Einlage darin steht

# ===========================================================================
# KLEINE HELFER
# ===========================================================================

def hex_nach_linear(hexwert):
    """Wandelt eine CSS-Farbe wie '#2e9e52' in Blenders Farbraum um.

    Blender rechnet intern linear, CSS-Hexwerte sind sRGB. Ohne diese
    Umrechnung kaeme die Farbe im Bild deutlich zu hell heraus.
    """
    hexwert = hexwert.lstrip("#")
    kanaele = []
    for i in (0, 2, 4):
        s = int(hexwert[i:i + 2], 16) / 255.0
        if s <= 0.04045:
            kanaele.append(s / 12.92)
        else:
            kanaele.append(((s + 0.055) / 1.055) ** 2.4)
    return (kanaele[0], kanaele[1], kanaele[2], 1.0)


def ton_aendern(hexwert, faktor):
    """Hellt eine Hex-Farbe auf oder dunkelt sie ab (1.0 = unveraendert)."""
    hexwert = hexwert.lstrip("#")
    teile = []
    for i in (0, 2, 4):
        wert = int(round(int(hexwert[i:i + 2], 16) * faktor))
        teile.append("{:02x}".format(max(0, min(255, wert))))
    return "#" + "".join(teile)


def szene_leeren():
    """Raeumt alles aus der Datei — Objekte, Meshes, Materialien, Lichter."""
    if bpy.context.object is not None and bpy.context.object.mode != "OBJECT":
        bpy.ops.object.mode_set(mode="OBJECT")
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for sammlung in (bpy.data.meshes, bpy.data.materials,
                     bpy.data.lights, bpy.data.cameras):
        for datenblock in list(sammlung):
            if datenblock.users == 0:
                sammlung.remove(datenblock)


def nur_diese_auswaehlen(objekte, aktiv):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objekte:
        o.select_set(True)
    bpy.context.view_layer.objects.active = aktiv


def neu_kasten(breite, tiefe, hoehe, ort):
    """Ein Quader. `ort` ist sein MITTELPUNKT.

    Die Groesse wird sofort fest ins Mesh gerechnet: Danach hat das Objekt
    wieder den Massstab 1, und das Kantenbrechen weiter unten wirkt auf
    allen Seiten gleich stark. Ohne das Festrechnen waeren die Rundungen an
    der langen Seite breiter als an der kurzen.
    """
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=ort)
    obj = bpy.context.active_object
    obj.scale = (breite, tiefe, hoehe)
    nur_diese_auswaehlen([obj], obj)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return obj


def modifikatoren_anwenden(obj):
    """Rechnet alle Modifikatoren fest in das Mesh ein."""
    nur_diese_auswaehlen([obj], obj)
    bpy.ops.object.convert(target="MESH")
    return bpy.context.view_layer.objects.active


def glatt_schattieren(obj):
    """Weich schattieren, ABER nur die gerundeten Kanten.

    `shade_smooth` allein verschmiert die Schattierung ueber ALLE Flaechen —
    nach dem Gravur-Schnitt zogen daraufhin fahle Dreiecke von der Rille bis
    zum Rand der Oberseite. `shade_auto_smooth` glaettet nur, wo der Winkel
    zwischen zwei Flaechen klein ist: die Kantenrundung wird weich, die
    ebene Oberseite und die Rillenwand bleiben scharf.

    Den Aufruf gibt es erst ab Blender 4.1; darunter bleibt es beim alten
    Verhalten (dann sieht die Gravur eben nicht so sauber aus).
    """
    nur_diese_auswaehlen([obj], obj)
    if hasattr(bpy.ops.object, "shade_auto_smooth"):
        bpy.ops.object.shade_auto_smooth(angle=math.radians(35.0))
    else:
        bpy.ops.object.shade_smooth()
    return obj



def verbinden_und_runden(teile, name):
    """Verbindet die Teile zu EINEM Koerper und bricht seine Kanten.

    Anders als bei den Figuren wird hier NICHT voxel-verschmolzen: Eine
    Truhe soll gerade Flaechen behalten. Gerundet wird nur die Kante — das
    genuegt, damit sie zu den weichen Figuren passt.
    """
    nur_diese_auswaehlen(teile, teile[0])
    if len(teile) > 1:
        bpy.ops.object.join()
    obj = bpy.context.view_layer.objects.active
    obj.name = name

    kante = obj.modifiers.new("Kanten", "BEVEL")
    kante.width = KANTEN_RUNDUNG
    kante.segments = KANTEN_STUFEN
    kante.limit_method = "ANGLE"
    kante.angle_limit = math.radians(40.0)
    obj = modifikatoren_anwenden(obj)

    return glatt_schattieren(obj)


# ===========================================================================
# DER WUERFEL
# Alle Zahlen sind Blender-Einheiten, der Mittelpunkt liegt bei z = 0.
# ===========================================================================

def gravur_zeichen(kopfueber, dicke, mitte_z, schrumpfen=1.0):
    """Baut das Fragezeichen als flache Scheibe ueber der Wuerfel-Oberseite.

    BLENDER-TEXT LIEGT SCHON FLACH in der xy-Ebene und wird nach OBEN
    dick — gedreht werden muss also gar nichts. (Der erste Versuch drehte
    ihn um 90 Grad und stellte ihn damit senkrecht auf die Kante; im Bild
    ragte ein Zeichen wie ein Segel aus dem Wuerfel.)

      kopfueber    dreht das Zeichen um 180 Grad in der Ebene — das ist der
                   Unglueckswuerfel.
      dicke        Gesamtdicke in z. `extrude` waechst nach BEIDEN Seiten,
                   deshalb ist es die halbe Dicke.
      mitte_z      wohin die Mitte der Scheibe kommt.
      schrumpfen   verkleinert das Zeichen leicht. Nur fuer die Einlage
                   noetig: Genau gleich gross laege sie Flaeche auf Flaeche
                   mit der Rillenwand, und der Renderer weiss dann nicht,
                   welche vorn liegt (Flimmern).
    """
    bpy.ops.object.text_add(location=(0.0, 0.0, 0.0))
    text = bpy.context.active_object
    text.data.body = "?"
    text.data.size = GRAVUR_HOEHE
    text.data.align_x = "CENTER"
    text.data.align_y = "CENTER"
    text.data.extrude = dicke / 2.0

    zeichen = modifikatoren_anwenden(text)

    zeichen.rotation_euler = (0.0, 0.0,
                              math.radians(180.0) if kopfueber else 0.0)
    zeichen.scale = (schrumpfen, schrumpfen, 1.0)
    zeichen.location = (0.0, 0.0, mitte_z)
    nur_diese_auswaehlen([zeichen], zeichen)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return zeichen


def bau_wuerfel(kopfueber):
    """Baut Wuerfel und Einlage als ZWEI Objekte.

    Zwei und nicht eines, weil sie verschiedene Farben tragen: der Wuerfel
    die Stufenfarbe, die Einlage im gravierten Fragezeichen ihre dunkle
    Fassung.

    Ablauf, in dieser Reihenfolge und nicht anders:
      1. Wuerfel bauen und seine Kanten gross brechen — er soll weich wirken.
      2. Das Fragezeichen ZWEIMAL bauen: dick als Schnittwerkzeug, duenn als
         Einlage. Zwei Kopien deshalb, weil der Boolean sein Werkzeug
         verbraucht — und die Einlage muss dieselbe Form haben.
      3. Schneiden, dann glatt schattieren.

    Die Hoehen, damit man sie nachrechnen kann (Oberseite liegt bei
    WUERFEL_KANTE / 2 = 0.50):

        Werkzeug   0.40 bis 0.80   schneidet 0.10 tief (GRAVUR_TIEFE)
        Rillenboden          0.40
        Einlage    0.40 bis 0.455  steht 0.055 hoch (GRAVUR_EINLAGE),
                                   bleibt also 0.045 unter der Oberflaeche
    """
    oberseite = WUERFEL_KANTE / 2.0

    wuerfel = neu_kasten(WUERFEL_KANTE, WUERFEL_KANTE, WUERFEL_KANTE,
                         (0.0, 0.0, 0.0))
    wuerfel = verbinden_und_runden([wuerfel], "lootbox_wuerfel")

    # Drehen, BEVOR graviert wird: Der Boolean rechnet in Weltkoordinaten,
    # und das Zeichen soll gerade im Bild stehen — nicht mitgedreht.
    wuerfel.rotation_euler = (0.0, 0.0, math.radians(WUERFEL_DREHUNG))
    nur_diese_auswaehlen([wuerfel], wuerfel)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)

    werkzeug = gravur_zeichen(kopfueber, GRAVUR_TIEFE * 4.0,
                              oberseite + GRAVUR_TIEFE)

    einlage = gravur_zeichen(kopfueber, GRAVUR_EINLAGE,
                             oberseite - GRAVUR_TIEFE + GRAVUR_EINLAGE / 2.0,
                             0.97)
    einlage.name = "lootbox_einlage"

    schnitt = wuerfel.modifiers.new("Gravur", "BOOLEAN")
    schnitt.operation = "DIFFERENCE"
    schnitt.object = werkzeug
    try:
        schnitt.solver = "EXACT"
    except TypeError:
        pass
    wuerfel = modifikatoren_anwenden(wuerfel)
    bpy.data.objects.remove(werkzeug, do_unlink=True)

    glatt_schattieren(wuerfel)
    glatt_schattieren(einlage)
    return wuerfel, einlage


# ===========================================================================
# MATERIAL, LICHT, KAMERA, RENDER — wie bei den Figuren
# ===========================================================================

def material_grundform(name):
    """Ein mattes Plastik-Material ohne Farbe. Die setzt der Aufrufer."""
    mat = bpy.data.materials.new(name)
    # Ab Blender 5 haben neue Materialien ihren Knotenbaum schon; das alte
    # use_nodes meldet dort eine Veraltungs-Warnung. Darum nur setzen, wenn
    # noch keiner da ist — so laeuft es unter Blender 3, 4 und 5 gleich.
    if mat.node_tree is None:
        mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Roughness"].default_value = RAUHEIT

    # Der Name dieses Eingangs hat sich zwischen Blender 3 und 4 geaendert.
    for eingang in ("Specular IOR Level", "Specular"):
        if eingang in bsdf.inputs:
            bsdf.inputs[eingang].default_value = 0.25
            break
    for eingang in ("Metallic", "Coat Weight", "Clearcoat"):
        if eingang in bsdf.inputs:
            bsdf.inputs[eingang].default_value = 0.0
    return mat, bsdf


def material_einfarbig(name, hexfarbe):
    mat, bsdf = material_grundform(name)
    bsdf.inputs["Base Color"].default_value = hex_nach_linear(hexfarbe)
    return mat


def material_regenbogen(name, farben):
    """Die verborgene Lootbox: ein Farbverlauf schraeg ueber den Koerper.

    Gebaut aus vier Knoten — Objekt-Koordinaten, ein gedrehter und
    gestreckter Verlauf, eine Farbleiter mit den fuenf Farben, ab in die
    Grundfarbe. Schraeg heisst hier: Der Verlauf laeuft ueber eine gedrehte
    Achse, damit alle sichtbaren Flaechen etwas davon abbekommen — genau
    wie der SVG-Verlauf im Bildschirm-Code.

    Die Streckung ist noetig, weil der Verlauf von 0 bis 1 ueber EINE
    Blender-Einheit laeuft, die Truhe aber um x = 0 herum steht: Ohne
    Verschiebung um 0.5 laege die halbe Farbleiter ausserhalb.
    """
    mat, bsdf = material_grundform(name)
    knoten = mat.node_tree.nodes
    kanten = mat.node_tree.links

    koordinaten = knoten.new("ShaderNodeTexCoord")
    koordinaten.location = (-900, 0)

    lage = knoten.new("ShaderNodeMapping")
    lage.location = (-700, 0)
    lage.inputs["Rotation"].default_value = (0.0, 0.0, math.radians(-35.0))
    lage.inputs["Scale"].default_value = (0.7, 0.7, 0.7)
    lage.inputs["Location"].default_value = (0.5, 0.5, 0.0)

    verlauf = knoten.new("ShaderNodeTexGradient")
    verlauf.gradient_type = "LINEAR"
    verlauf.location = (-500, 0)

    leiter = knoten.new("ShaderNodeValToRGB")
    leiter.location = (-300, 0)
    leiter.color_ramp.interpolation = "LINEAR"

    # Die Leiter bringt zwei Halte mit; sie werden auf einen zurueckgebaut
    # und dann durch die eigenen ersetzt.
    while len(leiter.color_ramp.elements) > 1:
        leiter.color_ramp.elements.remove(leiter.color_ramp.elements[-1])
    leiter.color_ramp.elements[0].position = 0.0
    leiter.color_ramp.elements[0].color = hex_nach_linear(farben[0])
    for nummer, farbe in enumerate(farben[1:], start=1):
        halt = leiter.color_ramp.elements.new(nummer / (len(farben) - 1.0))
        halt.color = hex_nach_linear(farbe)

    kanten.new(koordinaten.outputs["Object"], lage.inputs["Vector"])
    kanten.new(lage.outputs["Vector"], verlauf.inputs["Vector"])
    kanten.new(verlauf.outputs["Color"], leiter.inputs["Fac"])
    kanten.new(leiter.outputs["Color"], bsdf.inputs["Base Color"])
    return mat


def licht_aufbauen():
    """Grosses weiches Hauptlicht von oben links, Aufheller rechts, dazu ein
    schwacher Streifer von hinten oben — dieselbe Anordnung wie bei den
    Figuren, damit Box und Figur dasselbe Licht zeigen."""
    def lampe(name, ort, groesse, staerke):
        daten = bpy.data.lights.new(name, type="AREA")
        daten.energy = staerke
        daten.size = groesse
        obj = bpy.data.objects.new(name, daten)
        bpy.context.collection.objects.link(obj)
        obj.location = ort
        richtung = Vector((0.0, 0.0, 0.4)) - Vector(ort)
        obj.rotation_euler = richtung.to_track_quat("-Z", "Y").to_euler()
        return obj

    lampe("Hauptlicht", (-3.2, -3.4, 4.6), 5.0, LICHT_HAUPT)
    lampe("Aufheller", (3.6, -3.0, 1.4), 6.0, LICHT_AUFHELLER)
    lampe("Streifer", (0.4, 3.6, 4.2), 4.0, LICHT_STREIFER)

    welt = bpy.data.worlds.new("Umgebung")
    bpy.context.scene.world = welt
    if welt.node_tree is None:      # siehe Anmerkung in material_grundform
        welt.use_nodes = True
    hintergrund = welt.node_tree.nodes["Background"]
    hintergrund.inputs[0].default_value = (LICHT_UMGEBUNG,
                                           LICHT_UMGEBUNG * 1.03,
                                           LICHT_UMGEBUNG * 1.10, 1.0)
    hintergrund.inputs[1].default_value = 1.0


def kamera_aufbauen():
    """Orthografische Kamera, leicht von schraeg oben — wie bei den Figuren."""
    daten = bpy.data.cameras.new("Kamera")
    daten.type = "ORTHO"
    daten.ortho_scale = 2.0        # wird in kamera_ausrichten berechnet
    obj = bpy.data.objects.new("Kamera", daten)
    bpy.context.collection.objects.link(obj)

    neigung = math.radians(KAMERA_NEIGUNG)
    abstand = 8.0
    obj.location = (0.0,
                    -abstand * math.cos(neigung),
                    0.4 + abstand * math.sin(neigung))
    obj.rotation_euler = (math.radians(90.0) - neigung, 0.0, 0.0)
    bpy.context.scene.camera = obj
    return obj


def render_einstellen():
    szene = bpy.context.scene
    szene.render.engine = "CYCLES"
    szene.render.resolution_x = BILD_KANTE
    szene.render.resolution_y = BILD_KANTE
    szene.render.resolution_percentage = 100
    szene.render.film_transparent = True           # kein Hintergrund im Bild
    szene.render.image_settings.file_format = "PNG"
    szene.render.image_settings.color_mode = "RGBA"
    szene.render.image_settings.color_depth = "8"
    szene.render.image_settings.compression = 100

    # Ohne diese Zeile faerbt Blenders Standard-Bildlook (AgX) die Farben um.
    szene.view_settings.view_transform = "Standard"
    szene.view_settings.look = "None"
    szene.view_settings.exposure = BELICHTUNG

    if hasattr(szene, "cycles"):
        szene.cycles.samples = SAMPLES
        szene.cycles.use_denoising = True
        szene.cycles.max_bounces = 6

        # BEWUSST CPU, nicht Grafikkarte — die Begruendung steht ausfuehrlich
        # in Figuren-Blender.py. Auf diesem Rechner bleibt Blender ueber die
        # Grafikkarte haengen.
        szene.cycles.device = "CPU"


def kamera_ausrichten(kamera, objekte):
    """Zoomt die Kamera so, dass die Truhe mittig im Bild steht."""
    welt_zu_kamera = kamera.matrix_world.inverted()
    x_min = y_min = float("inf")
    x_max = y_max = float("-inf")
    for obj in objekte:
        matrix = welt_zu_kamera @ obj.matrix_world
        for ecke in obj.data.vertices:
            p = matrix @ ecke.co
            x_min = min(x_min, p.x)
            x_max = max(x_max, p.x)
            y_min = min(y_min, p.y)
            y_max = max(y_max, p.y)

    zoom = max(x_max - x_min, y_max - y_min) / RAND_ANTEIL
    kamera.data.ortho_scale = zoom

    # Die Truhe genau in die Bildmitte ruecken. Bei einer orthografischen
    # Kamera ist das eine reine Verschiebung des Ausschnitts.
    achsen = kamera.matrix_world.to_3x3()
    kamera.location = kamera.location + achsen @ Vector(
        ((x_min + x_max) / 2, (y_min + y_max) / 2, 0.0))
    bpy.context.view_layer.update()

    print("  Bildausschnitt: Zoom {:.3f}".format(zoom))


# ===========================================================================
# HAUPTABLAUF
# ===========================================================================

def main():
    if bpy.app.version < (3, 2, 0):
        raise RuntimeError("Dieses Skript braucht Blender 3.2 oder neuer. "
                           "Gefunden: " + bpy.app.version_string)

    print("")
    print("=== Blunderluck-Lootboxen: Bau gestartet (Blender {}) ===".format(
        bpy.app.version_string))

    szene_leeren()
    render_einstellen()
    licht_aufbauen()
    kamera = kamera_aufbauen()

    # ZWEI Wuerfel, nicht einer: Der Unglueckswuerfel traegt sein
    # Fragezeichen auf dem Kopf, und die Gravur ist Teil des Meshes — anders
    # als frueher, wo das Zeichen im Bildschirm-Code lag und sich dort drehen
    # liess. Sie stehen ineinander und werden einzeln sichtbar geschaltet.
    print("  baue den Wuerfel ...")
    wuerfel, einlage = bau_wuerfel(False)

    print("  baue den Unglueckswuerfel ...")
    pech_wuerfel, pech_einlage = bau_wuerfel(True)
    # BEIDE STEHEN AN DERSELBEN STELLE, ineinander. Das ist Absicht: Der
    # Bildausschnitt wird einmal berechnet und gilt fuer alle zehn Bilder,
    # und es ist immer nur einer von beiden sichtbar. Zum Ansehen im
    # Blender-Fenster rueckt der Unglueckswuerfel ganz am Ende zur Seite.

    print("")
    kamera_ausrichten(kamera, [wuerfel, einlage])

    if not RENDERN:
        print("  RENDERN steht auf False — es wurden keine Bilder erzeugt.")
        return

    os.makedirs(AUSGABE_ORDNER, exist_ok=True)
    szene = bpy.context.scene
    print("")
    print("  Ziel: {}".format(AUSGABE_ORDNER))

    faelle = [
        ("", wuerfel, einlage, pech_wuerfel, pech_einlage),
        ("-pech", pech_wuerfel, pech_einlage, wuerfel, einlage),
    ]

    for stufe, farbe, regenbogen in STUFEN:
        if regenbogen:
            haut = material_regenbogen("Lootbox " + stufe, regenbogen)
        else:
            haut = material_einfarbig("Lootbox " + stufe, farbe)
        einlagenfarbe = material_einfarbig(
            "Einlage " + stufe, ton_aendern(farbe, EINLAGE_TON))

        for nachsatz, koerper, marke, aus1, aus2 in faelle:
            for obj in (koerper, marke):
                obj.hide_render = False
            for obj in (aus1, aus2):
                obj.hide_render = True

            koerper.data.materials.clear()
            koerper.data.materials.append(haut)
            marke.data.materials.clear()
            marke.data.materials.append(einlagenfarbe)

            dateiname = "lootbox-{}{}.png".format(stufe, nachsatz)
            szene.render.filepath = os.path.join(AUSGABE_ORDNER, dateiname)
            print("  rendere {} ...".format(dateiname))
            bpy.ops.render.render(write_still=True)

    for obj in (wuerfel, einlage, pech_wuerfel, pech_einlage):
        obj.hide_render = False

    # Zum Ansehen im Blender-Fenster: die beiden auseinanderruecken. Fuers
    # Rendern ist es zu spaet — genau das ist der Zweck.
    for obj in (pech_wuerfel, pech_einlage):
        obj.location.x = 1.8

    gesamt = sum(os.path.getsize(os.path.join(AUSGABE_ORDNER, d))
                 for d in os.listdir(AUSGABE_ORDNER) if d.endswith(".png"))
    print("")
    print("=== Fertig. {} Bilder, zusammen {:.0f} KB ===".format(
        len(STUFEN) * 2, gesamt / 1024))


main()
