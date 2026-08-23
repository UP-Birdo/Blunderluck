# ---------------------------------------------------------------------------
# Figuren-Blender.py — erzeugt die 12 Schachfigur-Bilder fuer das Blunderluck-Schach (geerbt aus dem Quizz)
#
# WAS ES TUT
#   Baut in Blender eine komplette Szene (Kamera, Licht, Material), setzt die
#   sechs Figurarten aus Grundkoerpern zusammen und rendert daraus die zwoelf
#   PNGs nach img\figuren\ — nach der Vorgabe in docs\FIGUREN-BLENDER.md.
#
# WIE MAN ES BENUTZT — zwei Wege, und sie sind NICHT gleichwertig
#
#   ZUM RENDERN: Doppelklick auf "Figuren rendern.cmd" im selben Ordner.
#       Das startet Blender ohne Fenster, zeigt den Fortschritt in der
#       Eingabeaufforderung und ist nach gut einer halben Minute fertig.
#       Das ist der normale Weg.
#
#   ZUM ANSCHAUEN UND SCHRAUBEN: in Blender selbst, Reiter "Scripting" ->
#       Text -> Open -> diese Datei -> "Run Script" (oder Alt+P).
#       Vorher aber RENDERN = False setzen! Mit RENDERN = True blockiert
#       das Rendern die Oberflaeche: Blender meldet "Keine Rueckmeldung"
#       und man sieht bis zum Schluss nicht, ob es noch laeuft. Mit
#       RENDERN = False steht die Szene nach wenigen Sekunden da und man
#       kann die Figuren im Reiter "Layout" von allen Seiten ansehen.
#
#   ACHTUNG: Das Skript loescht alles, was gerade in der Blender-Datei ist.
#            Es fuellt eine leere Szene, es baut nichts in eine bestehende ein.
#
# WO MAN SCHRAUBT
#   Alles Einstellbare steht im Block "STELLSCHRAUBEN" weiter unten.
#   Die Form jeder Figur steht in ihrer eigenen bau_*-Funktion; dort sind die
#   Zahlen Radius, Hoehe und Position in Blender-Einheiten.
#   Massstab: der Koenig ist 2.00 Einheiten hoch, alle anderen Hoehen sind
#   daraus abgeleitet (siehe HOEHEN).
# ---------------------------------------------------------------------------

import bpy
import os
import math
from mathutils import Vector


# ===========================================================================
# STELLSCHRAUBEN
# ===========================================================================

# Wohin die fertigen PNGs geschrieben werden. Wird angelegt, falls es fehlt.
AUSGABE_ORDNER = r"c:\Users\jonas.boeckle\OneDrive - Biffar GmbH & Co. KG\Biffar - IT\JKB\dev\Apps\Blunderluck\img\figuren"

# Bildgroesse (quadratisch).
#
# 512 war die urspruengliche Vorgabe. Seit v0.122 stehen die Figuren steiler
# und fuellen ihr Bild deutlich mehr aus — bei 512 kamen die zwoelf Dateien
# zusammen auf 1,19 MB und rissen die 1-MB-Grenze der Vorgabe. 384 bringt sie
# auf gut zwei Drittel davon.
#
# Sichtbar ist der Unterschied nicht: Am groessten wird eine Figur auf einem
# 520-Pixel-Brett, dort misst ihr Kasten rund 71 Bildpunkte. Selbst auf einem
# Bildschirm mit dreifacher Aufloesung sind das 212 echte Punkte — 384 hat
# also noch Luft, 512 waere nur Ballast.
BILD_KANTE = 384

# Rechenaufwand je Bild. 64 reicht bei diesem einfachen Motiv voellig.
# Hoeher = sauberer, aber langsamer. 32 fuer schnelle Probelaeufe.
SAMPLES = 256

# Auf False stellen, wenn nur die Szene gebaut werden soll (zum Anschauen),
# ohne die zwoelf Bilder zu rendern.
RENDERN = True

# Die zwei Farben aus der Vorgabe, als Hex wie im CSS.
FARBE_WEISS = "#f2ecdf"     # warmes Creme
FARBE_SCHWARZ = "#2b2e35"   # dunkles Anthrazit

# Mattigkeit der Oberflaeche: 0 = Spiegel, 1 = voellig stumpf.
# 0.60 ergibt mattes Plastik mit sehr weichem, breitem Glanzlicht.
RAUHEIT = 0.60

# Helligkeit. Wenn die Bilder zu dunkel oder zu ausgebrannt herauskommen,
# ist BELICHTUNG die EINE Zahl, an der man dreht (+1.0 = doppelt so hell).
#
# Die Lichtwerte sind so abgestimmt, dass die HELLE Figur an ihrer hellsten
# Stelle knapp unter Reinweiss bleibt. Das ist die empfindliche Grenze: eine
# Creme-Figur hat schon von sich aus fast weisse Farbe, zu viel Licht macht
# aus ihr eine weisse Flaeche ohne Form (und das Koenigskreuz verschwindet).
# Wer hier dreht, prueft danach IMMER figur-koenig-weiss.png.
BELICHTUNG = 0.0
LICHT_HAUPT = 265.0         # grosses weiches Licht von oben links, in Watt
LICHT_AUFHELLER = 30.0      # schwaches Gegenlicht von rechts
LICHT_STREIFER = 55.0       # Kantenlicht von hinten oben
LICHT_UMGEBUNG = 0.28       # gleichmaessige Grundhelligkeit (0 bis 1)

# Kameraneigung in Grad ueber der Waagerechten.
#
# 50 Grad heisst: Man schaut deutlich von OBEN auf die Figuren und sieht den
# Sockel als breite Ellipse — das ist es, was sie auf der Kachel STEHEN laesst
# statt davor zu kleben (Nutzer-Entscheidung 22.08. nach dem Dribbble-Vorbild;
# die urspruengliche Vorgabe in docs\FIGUREN-BLENDER.md nannte 15 bis 25).
# Der Preis: Von oben verliert eine Figur ihren Umriss. Wer hier dreht, prueft
# danach IMMER, ob Bauer, Laeufer und Dame auf 32 Pixeln noch verschieden
# aussehen.
KAMERA_NEIGUNG = 50.0

# Bildaufteilung: Luft unter dem Sockel und Anteil, den die hoechste Figur
# (der Koenig) senkrecht im Bild einnimmt.
LUFT_UNTEN = 0.08
HOEHEN_ANTEIL = 0.86

# Wie fein die Figuren verschmolzen werden. Kleiner = feiner, aber langsamer.
# 0.020 ist ein guter Kompromiss; unter 0.012 wird es zaeh.
VOXEL_GROESSE = 0.020

# Wie GEDRUNGEN die Figuren sind: 1.0 ist die schlanke Fassung aus v0.121,
# 1.25 macht sie um ein Viertel breiter, ohne dass sie höher werden.
#
# Der Faktor wirkt als reine Breiten-Streckung auf die fertig verbundene
# Figur (x und y, NIE z). Das ist der Grund, warum die Höhen-Tabelle davon
# unberührt bleibt: Der König misst weiter 2.00, der Bauer weiter 0.55 davon
# — sie werden nur dicker. Kugeln werden dabei zu flachen Kugeln, und genau
# das ergibt den Knet-Eindruck des Vorbilds.
BREITE_FAKTOR = 1.25

# Wie stark die verschmolzene Form am Ende geglaettet wird ("Knet-Effekt").
# Zu viel frisst duenne Teile wie das Koenigskreuz weg.
GLAETTUNG_STAERKE = 0.50
GLAETTUNG_DURCHGAENGE = 2

# Die Kerbe im Laeufer-Kopf. Auf sehr kleinen Feldern unsichtbar — abschaltbar.
LAEUFER_KERBE = True

# Abstand, in dem die sechs Figuren nach dem Lauf nebeneinander stehen
# bleiben, damit man sie im Blender-Fenster vergleichen kann.
REIHENABSTAND = 1.6


# ===========================================================================
# FESTE WERTE — nur aendern, wenn die Vorgabe sich aendert
# ===========================================================================

# Hoehe des Koenigs in Blender-Einheiten. Alles andere haengt daran.
KOENIG_HOEHE = 2.00

# Relative Hoehen aus docs\FIGUREN-BLENDER.md.
HOEHEN = {
    "bauer":    0.55,
    "turm":     0.70,
    "springer": 0.75,
    "laeufer":  0.75,
    "dame":     0.90,
    "koenig":   1.00,
}

# Der gemeinsame Sockel: unten breit, oben leicht schmaler.
SOCKEL_RADIUS_UNTEN = 0.42
SOCKEL_RADIUS_OBEN = 0.37
SOCKEL_HOEHE = 0.14

# Reihenfolge fuer die Ausgabe und fuer die Reihe im Blender-Fenster.
REIHENFOLGE = ["bauer", "turm", "springer", "laeufer", "dame", "koenig"]


# ===========================================================================
# KLEINE HELFER
# ===========================================================================

def hex_nach_linear(hexwert):
    """Wandelt eine CSS-Farbe wie '#f2ecdf' in Blenders Farbraum um.

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


def neu_kugel(radius, ort, skalierung=(1.0, 1.0, 1.0)):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=radius, location=ort,
                                         segments=48, ring_count=24)
    obj = bpy.context.active_object
    obj.scale = skalierung
    return obj


def neu_kegel(radius_unten, radius_oben, hoehe, ort, drehung=(0.0, 0.0, 0.0)):
    bpy.ops.mesh.primitive_cone_add(radius1=radius_unten, radius2=radius_oben,
                                    depth=hoehe, location=ort,
                                    rotation=drehung, vertices=48)
    return bpy.context.active_object


def neu_zylinder(radius, hoehe, ort, drehung=(0.0, 0.0, 0.0)):
    bpy.ops.mesh.primitive_cylinder_add(radius=radius, depth=hoehe,
                                        location=ort, rotation=drehung,
                                        vertices=48)
    return bpy.context.active_object


def kugelkette(punkte, skalierung, feinheit=3):
    """Reiht Kugeln so eng an einem Streckenzug auf, dass sie zu EINER
    weichen Wurst verschmelzen.

    `punkte` ist eine Liste (x, z, radius) in der Profilebene (y = 0);
    zwischen je zwei Punkten werden `feinheit` Kugeln gesetzt und Ort wie
    Radius linear ueberblendet. Der enge Abstand ist der ganze Zweck: Mit
    grossem Abstand wird aus derselben Kette eine Perlenschnur — genau das
    ist beim ersten Springer-Entwurf passiert.
    """
    erzeugt = []
    for abschnitt in range(len(punkte) - 1):
        x1, z1, r1 = punkte[abschnitt]
        x2, z2, r2 = punkte[abschnitt + 1]
        for schritt in range(feinheit):
            t = schritt / float(feinheit)
            erzeugt.append(neu_kugel(
                r1 + (r2 - r1) * t,
                (x1 + (x2 - x1) * t, 0.0, z1 + (z2 - z1) * t),
                skalierung))
    letzte_x, letzte_z, letzter_r = punkte[-1]
    erzeugt.append(neu_kugel(letzter_r, (letzte_x, 0.0, letzte_z), skalierung))
    return erzeugt


def neu_ring(radius_gross, radius_klein, ort):
    bpy.ops.mesh.primitive_torus_add(major_radius=radius_gross,
                                     minor_radius=radius_klein,
                                     location=ort,
                                     major_segments=48, minor_segments=16)
    return bpy.context.active_object


def nur_diese_auswaehlen(objekte, aktiv):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objekte:
        o.select_set(True)
    bpy.context.view_layer.objects.active = aktiv


def modifikatoren_anwenden(obj):
    """Rechnet alle Modifikatoren fest in das Mesh ein."""
    nur_diese_auswaehlen([obj], obj)
    bpy.ops.object.convert(target="MESH")
    return bpy.context.view_layer.objects.active


def hoehe_von(obj):
    """Hoechster Punkt des Objekts ueber der Standflaeche."""
    matrix = obj.matrix_world
    return max((matrix @ ecke.co).z for ecke in obj.data.vertices)


# ===========================================================================
# DER GEMEINSAME BAUABLAUF EINER FIGUR
# ===========================================================================

def figur_fertigstellen(teile, name, kerbe=None):
    """Verschmilzt die Grundkoerper zu EINEM weichen Koerper.

    Ablauf, in dieser Reihenfolge und nicht anders:
      1. Alle Teile zu einem Objekt verbinden.
      2. Voxel-Remesh: rechnet die sich ueberlappenden Koerper zu einer
         einzigen, geschlossenen Huelle zusammen — das ist der Schritt, der
         aus Kugel-plus-Kegel eine Knetfigur macht.
      3. Erst JETZT der optionale Schnitt (Laeufer-Kerbe). Vorher waere das
         Mesh dafuer zu unsauber und der Schnitt koennte misslingen.
      4. Glaetten und weich schattieren.
    """
    nur_diese_auswaehlen(teile, teile[0])
    if len(teile) > 1:
        bpy.ops.object.join()
    obj = bpy.context.view_layer.objects.active
    obj.name = "figur_" + name

    # Breiten-Streckung: x und y wachsen, z bleibt. Sie wird SOFORT fest ins
    # Mesh gerechnet (`transform_apply`) — danach hat das Objekt wieder den
    # Massstab 1, und alles Weitere (Voxel-Groesse, Glaettung, das Messen der
    # Hoehen und des Bildausschnitts) rechnet in denselben Einheiten wie
    # vorher. Ohne das Festrechnen wuerde die Voxel-Groesse in einem
    # gestreckten Raum gelten und die Figur ungleichmaessig aufloesen.
    if BREITE_FAKTOR != 1.0:
        obj.scale = (BREITE_FAKTOR, BREITE_FAKTOR, 1.0)
        nur_diese_auswaehlen([obj], obj)
        bpy.ops.object.transform_apply(location=False, rotation=False,
                                       scale=True)

    remesh = obj.modifiers.new("Verschmelzen", "REMESH")
    remesh.mode = "VOXEL"
    remesh.voxel_size = VOXEL_GROESSE
    remesh.adaptivity = 0.0
    obj = modifikatoren_anwenden(obj)

    if kerbe is not None:
        schnitt = obj.modifiers.new("Kerbe", "BOOLEAN")
        schnitt.operation = "DIFFERENCE"
        schnitt.object = kerbe
        try:
            schnitt.solver = "EXACT"
        except TypeError:
            pass
        obj = modifikatoren_anwenden(obj)
        bpy.data.objects.remove(kerbe, do_unlink=True)

    if GLAETTUNG_DURCHGAENGE > 0:
        glatt = obj.modifiers.new("Glaetten", "SMOOTH")
        glatt.factor = GLAETTUNG_STAERKE
        glatt.iterations = GLAETTUNG_DURCHGAENGE
        obj = modifikatoren_anwenden(obj)

    nur_diese_auswaehlen([obj], obj)
    bpy.ops.object.shade_smooth()
    return obj


def bau_sockel():
    """Der gemeinsame Fuss. Bei allen sechs Figuren exakt gleich."""
    return neu_kegel(SOCKEL_RADIUS_UNTEN, SOCKEL_RADIUS_OBEN, SOCKEL_HOEHE,
                     (0.0, 0.0, SOCKEL_HOEHE / 2))


# ===========================================================================
# DIE SECHS FIGUREN
# Alle Zahlen sind Blender-Einheiten, z = 0 ist die Standflaeche.
# ===========================================================================

def bau_bauer():
    """Kugelkopf auf kurzem Kegel. Zielhoehe 1.10."""
    teile = [
        bau_sockel(),
        neu_kegel(0.30, 0.155, 0.62, (0.0, 0.0, 0.45)),      # Koerper
        neu_ring(0.19, 0.055, (0.0, 0.0, 0.78)),             # Kragen
        neu_kugel(0.255, (0.0, 0.0, 0.845)),                 # Kopf
    ]
    return figur_fertigstellen(teile, "bauer")


def bau_turm():
    """Zylinder mit vier dicken, runden Zinnen. Zielhoehe 1.40."""
    teile = [
        bau_sockel(),
        neu_kegel(0.32, 0.285, 0.86, (0.0, 0.0, 0.57)),      # Koerper
        neu_ring(0.30, 0.075, (0.0, 0.0, 1.02)),             # Kragen
        neu_zylinder(0.325, 0.22, (0.0, 0.0, 1.13)),         # Krone
    ]
    for nummer in range(4):
        # Eine Zinne zeigt genau zur Kamera, eine nach hinten, zwei zur
        # Seite. Das ergibt im Umriss die klassischen drei Zacken.
        winkel = math.radians(90.0 * nummer)
        teile.append(neu_kugel(0.115, (0.225 * math.sin(winkel),
                                       -0.225 * math.cos(winkel),
                                       1.285)))
    return figur_fertigstellen(teile, "turm")


def bau_springer():
    """Pferdekopf im Profil, Schnauze nach links. Zielhoehe 1.50.

    Der Springer steht bewusst im Profil: von vorne waere ein Pferdekopf
    auf 40 Pixeln nicht von einem Bauern zu unterscheiden.

    Er ist als einziger nicht drehsymmetrisch und deshalb aus einer Kette
    von Kugeln gebaut statt aus Kegeln: Hals, Kopf und Schnauze folgen einem
    Bogen nach links, der Maehnenkamm laeuft aussen an der rechten Seite
    dagegen. Alle Kugeln sind in Y schmal gedrueckt (dritter Skalenwert) —
    ein flacher Kopf gibt im Umriss die deutlichere Pferdeform.
    """
    teile = [
        bau_sockel(),
        neu_kegel(0.30, 0.22, 0.40, (0.0, 0.0, 0.34)),                # Brust
        neu_kugel(0.165, (-0.17, 0.0, 1.02), (1.00, 0.78, 0.95)),     # Kiefer
    ]

    # Hals: steigt nach links oben.
    teile += kugelkette([(0.01, 0.62, 0.195),
                         (-0.03, 0.82, 0.190),
                         (-0.06, 1.00, 0.190)], (1.00, 0.75, 1.00))

    # Kopf: eine einzige Linie vom Genick ueber den Nasenruecken bis zur
    # Nase, nach links UNTEN abfallend. Waagerecht sieht dieselbe Form aus
    # wie ein Entenschnabel — das Gefaelle macht den Pferdekopf.
    #
    # SEIT DER 50-GRAD-KAMERA IST DIE SCHNAUZE KURZ UND DICK (v0.122). Von
    # schraeg oben sieht man auf ihren Ruecken statt auf ihr Profil; die lange
    # schlanke Schnauze der 20-Grad-Fassung wirkte dabei wie ein Vogelschnabel.
    teile += kugelkette([(-0.02, 1.26, 0.175),
                         (-0.11, 1.24, 0.195),
                         (-0.22, 1.17, 0.180),
                         (-0.32, 1.08, 0.155),
                         (-0.41, 0.99, 0.120)], (1.10, 0.80, 1.00))

    # Maehnenkamm: durchgehende Rippe an der Halsrueckseite.
    teile += kugelkette([(0.03, 1.28, 0.090),
                         (0.11, 1.16, 0.105),
                         (0.17, 1.02, 0.120),
                         (0.21, 0.88, 0.130),
                         (0.23, 0.75, 0.130),
                         (0.22, 0.63, 0.115)], (0.90, 0.55, 1.00))

    for seite in (-1.0, 1.0):
        teile.append(neu_kegel(0.090, 0.0, 0.28,
                               (-0.02, 0.07 * seite, 1.40),
                               drehung=(0.0, math.radians(-8.0), 0.0)))  # Ohr
    return figur_fertigstellen(teile, "springer")


def bau_laeufer():
    """Tropfenform mit Spitze und schraeger Kerbe. Zielhoehe 1.50."""
    teile = [
        bau_sockel(),
        neu_kegel(0.30, 0.155, 0.78, (0.0, 0.0, 0.53)),          # Koerper
        neu_ring(0.185, 0.05, (0.0, 0.0, 0.94)),                 # Kragen
        neu_kugel(0.245, (0.0, 0.0, 1.13), (1.0, 1.0, 1.15)),    # Kopf
        # SPITZE STATT KUGEL (seit v0.122): Von der 50-Grad-Kamera aus sieht
        # eine Kugel obenauf genauso aus wie der Bauernkopf. Der Kegel laeuft
        # nach der Glaettung rund aus, gibt dem Umriss aber eine Spitze — auf
        # einem 32-Pixel-Feld ist das der einzige Unterschied, der bleibt.
        neu_kegel(0.125, 0.0, 0.26, (0.0, 0.0, 1.37)),           # Spitze
    ]
    kerbe = None
    if LAEUFER_KERBE:
        bpy.ops.mesh.primitive_cube_add(size=1.0, location=(-0.05, 0.0, 1.22),
                                        rotation=(0.0, math.radians(35.0), 0.0))
        kerbe = bpy.context.active_object
        kerbe.name = "hilfs_kerbe"
        kerbe.scale = (0.90, 0.90, 0.055)
    return figur_fertigstellen(teile, "laeufer", kerbe=kerbe)


def bau_dame():
    """Krone aus sieben kleinen Kugeln. Zielhoehe 1.80."""
    teile = [
        bau_sockel(),
        neu_kegel(0.31, 0.175, 0.94, (0.0, 0.0, 0.61)),      # Koerper
        neu_ring(0.21, 0.055, (0.0, 0.0, 1.10)),             # Kragen
        neu_kegel(0.175, 0.30, 0.32, (0.0, 0.0, 1.28)),      # Kelch
        neu_ring(0.29, 0.055, (0.0, 0.0, 1.45)),             # Kelchrand
        neu_kugel(0.115, (0.0, 0.0, 1.685)),                 # Mittelkugel
    ]
    for nummer in range(7):
        winkel = math.radians(360.0 / 7.0 * nummer)
        teile.append(neu_kugel(0.105, (0.26 * math.sin(winkel),
                                       -0.26 * math.cos(winkel),
                                       1.58)))
    return figur_fertigstellen(teile, "dame")


def bau_koenig():
    """Hoechste Figur, Kreuz obenauf. Zielhoehe 2.00 — der Massstab."""
    teile = [
        bau_sockel(),
        neu_kegel(0.31, 0.185, 1.00, (0.0, 0.0, 0.64)),               # Koerper
        neu_ring(0.22, 0.06, (0.0, 0.0, 1.16)),                       # Kragen
        neu_kegel(0.185, 0.29, 0.30, (0.0, 0.0, 1.33)),               # Kelch
        neu_ring(0.285, 0.055, (0.0, 0.0, 1.49)),                     # Kelchrand
        neu_zylinder(0.095, 0.52, (0.0, 0.0, 1.74)),                  # Kreuz hoch
        neu_zylinder(0.090, 0.40, (0.0, 0.0, 1.80),
                     drehung=(0.0, math.radians(90.0), 0.0)),         # Kreuz quer
    ]
    return figur_fertigstellen(teile, "koenig")


BAUPLAENE = {
    "bauer":    bau_bauer,
    "turm":     bau_turm,
    "springer": bau_springer,
    "laeufer":  bau_laeufer,
    "dame":     bau_dame,
    "koenig":   bau_koenig,
}


# ===========================================================================
# SZENE: MATERIAL, LICHT, KAMERA, RENDER-EINSTELLUNGEN
# ===========================================================================

def material_anlegen(name, hexfarbe):
    """Mattes Plastik. Fuer beide Farben identisch, nur der Farbwert wechselt."""
    mat = bpy.data.materials.new(name)
    # Ab Blender 5 haben neue Materialien ihren Knotenbaum schon; das alte
    # use_nodes meldet dort eine Veraltungs-Warnung. Darum nur setzen, wenn
    # noch keiner da ist — so laeuft es unter Blender 3, 4 und 5 gleich.
    if mat.node_tree is None:
        mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = hex_nach_linear(hexfarbe)
    bsdf.inputs["Roughness"].default_value = RAUHEIT

    # Der Name dieses Eingangs hat sich zwischen Blender 3 und 4 geaendert.
    for eingang in ("Specular IOR Level", "Specular"):
        if eingang in bsdf.inputs:
            bsdf.inputs[eingang].default_value = 0.25
            break
    for eingang in ("Metallic", "Coat Weight", "Clearcoat"):
        if eingang in bsdf.inputs:
            bsdf.inputs[eingang].default_value = 0.0
    return mat


def licht_aufbauen():
    """Grosses weiches Hauptlicht von oben links, Aufheller rechts, dazu ein
    schwacher Streifer von hinten oben.

    Der Streifer ist der Grund, warum die schwarze Figur auch auf einer
    dunklen Kachel noch eine helle Kante zeigt — Punkt aus der Vorgabe.
    """
    def lampe(name, ort, groesse, staerke):
        daten = bpy.data.lights.new(name, type="AREA")
        daten.energy = staerke
        daten.size = groesse
        obj = bpy.data.objects.new(name, daten)
        bpy.context.collection.objects.link(obj)
        obj.location = ort
        richtung = Vector((0.0, 0.0, 0.9)) - Vector(ort)
        obj.rotation_euler = richtung.to_track_quat("-Z", "Y").to_euler()
        return obj

    lampe("Hauptlicht", (-3.2, -3.4, 4.6), 5.0, LICHT_HAUPT)
    lampe("Aufheller", (3.6, -3.0, 1.4), 6.0, LICHT_AUFHELLER)
    lampe("Streifer", (0.4, 3.6, 4.2), 4.0, LICHT_STREIFER)

    # Weiches Umgebungslicht, damit die Schattenseite nicht absaeuft.
    welt = bpy.data.worlds.new("Umgebung")
    bpy.context.scene.world = welt
    if welt.node_tree is None:      # siehe Anmerkung in material_anlegen
        welt.use_nodes = True
    hintergrund = welt.node_tree.nodes["Background"]
    hintergrund.inputs[0].default_value = (LICHT_UMGEBUNG,
                                           LICHT_UMGEBUNG * 1.03,
                                           LICHT_UMGEBUNG * 1.10, 1.0)
    hintergrund.inputs[1].default_value = 1.0


def kamera_aufbauen():
    """Orthografische Kamera, leicht von schraeg oben.

    Orthografisch heisst: keine perspektivische Verzerrung. Das ist hier
    kein Schoenheitswunsch — nur so stimmen die Hoehenverhaeltnisse aus der
    Vorgabe (Koenig 1.00, Bauer 0.55) im fertigen Bild auf den Pixel genau.
    """
    daten = bpy.data.cameras.new("Kamera")
    daten.type = "ORTHO"
    daten.ortho_scale = 3.0        # wird in kamera_ausrichten exakt berechnet
    obj = bpy.data.objects.new("Kamera", daten)
    bpy.context.collection.objects.link(obj)

    neigung = math.radians(KAMERA_NEIGUNG)
    abstand = 8.0
    obj.location = (0.0,
                    -abstand * math.cos(neigung),
                    0.9 + abstand * math.sin(neigung))
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
    szene.render.image_settings.compression = 100  # kleinstmoegliche Dateien

    # Ohne diese Zeile faerbt Blenders Standard-Bildlook (AgX) die Farben um,
    # und aus dem warmen Creme wird ein muedes Grau.
    szene.view_settings.view_transform = "Standard"
    szene.view_settings.look = "None"
    szene.view_settings.exposure = BELICHTUNG

    if hasattr(szene, "cycles"):
        szene.cycles.samples = SAMPLES
        szene.cycles.use_denoising = True
        szene.cycles.max_bounces = 6

        # BEWUSST CPU, nicht Grafikkarte. Auf diesem Rechner (Zenbook mit
        # Intel-Grafik) bleibt Blender beim Rendern ueber die Grafikkarte
        # haengen — das Fenster meldet "Keine Rueckmeldung" und der Prozess
        # steht danach bei 0 % Auslastung. Ueber CPU laufen alle zwoelf
        # Bilder in gut einer halben Minute. Wer das aendert, prueft es
        # zuerst mit RENDERN = True und EINEM Bild.
        szene.cycles.device = "CPU"


# ===========================================================================
# BILDAUSSCHNITT — rechnet die Kamera exakt auf die Figuren ein
# ===========================================================================

def kamera_ausrichten(kamera, figuren):
    """Setzt Zoom und Lage der Kamera so, dass ALLE zwoelf Bilder passen.

    Gemessen wird ueber alle sechs Figuren zusammen. Danach steht die
    Sockel-Unterkante bei allen auf derselben Bildhoehe und der Koenig
    fuellt das Bild so weit, wie die Vorgabe verlangt. Ab hier wird die
    Kamera NICHT mehr angefasst — das ist die Bedingung dafuer, dass die
    Figuren spaeter auf dem Brett zueinander passen.
    """
    def messen():
        welt_zu_kamera = kamera.matrix_world.inverted()
        x_min = y_min = float("inf")
        x_max = y_max = float("-inf")
        for obj in figuren:
            matrix = welt_zu_kamera @ obj.matrix_world
            for ecke in obj.data.vertices:
                p = matrix @ ecke.co
                x_min = min(x_min, p.x)
                x_max = max(x_max, p.x)
                y_min = min(y_min, p.y)
                y_max = max(y_max, p.y)
        return x_min, x_max, y_min, y_max

    x_min, x_max, y_min, y_max = messen()

    # Zoom: senkrecht nach Vorgabe, waagerecht nur als Sicherheitsnetz
    # (der Springer ragt mit der Schnauze weiter zur Seite als die anderen).
    # Waagerecht wird der GROESSERE der beiden Ueberstaende verdoppelt, denn
    # die Bildmitte bleibt bei x = 0 — dort steht bei allen sechs Figuren der
    # Sockel, und genau das meint "Figur mittig" in der Vorgabe.
    zoom = max((y_max - y_min) / HOEHEN_ANTEIL,
               2.0 * max(abs(x_min), abs(x_max)) / 0.90)
    kamera.data.ortho_scale = zoom

    # Kamera in der Hoehe verschieben, bis der Sockel genau auf LUFT_UNTEN
    # sitzt. Bei einer orthografischen Kamera ist das eine reine Verschiebung
    # des Ausschnitts, keine Aenderung der Perspektive.
    versatz_hoch = y_min + (0.5 - LUFT_UNTEN) * zoom
    achsen = kamera.matrix_world.to_3x3()
    kamera.location = kamera.location + achsen @ Vector(
        (0.0, versatz_hoch, 0.0))
    bpy.context.view_layer.update()

    x_min, x_max, y_min, y_max = messen()
    print("  Bildausschnitt: Sockel bei {:.1%} Bildhoehe, Koenigsspitze bei "
          "{:.1%}, Zoom {:.3f}".format(0.5 + y_min / zoom,
                                       0.5 + y_max / zoom, zoom))


# ===========================================================================
# HAUPTABLAUF
# ===========================================================================

def aufreihen(figuren):
    """Stellt die sechs Figuren zum Vergleichen nebeneinander."""
    for nummer, name in enumerate(REIHENFOLGE):
        figuren[name].location.x = (nummer - 2.5) * REIHENABSTAND


def main():
    if bpy.app.version < (3, 2, 0):
        raise RuntimeError("Dieses Skript braucht Blender 3.2 oder neuer. "
                           "Gefunden: " + bpy.app.version_string)

    print("")
    print("=== Blunderluck-Schachfiguren: Bau gestartet (Blender {}) ===".format(
        bpy.app.version_string))

    szene_leeren()
    render_einstellen()
    licht_aufbauen()
    kamera = kamera_aufbauen()

    material = {
        "weiss": material_anlegen("Figur weiss", FARBE_WEISS),
        "schwarz": material_anlegen("Figur schwarz", FARBE_SCHWARZ),
    }

    # 1) Alle sechs Figuren bauen. Jede entsteht in der Bildmitte.
    figuren = {}
    for name in REIHENFOLGE:
        print("  baue {} ...".format(name))
        figuren[name] = BAUPLAENE[name]()

    # 2) Kontrolle: stimmen die Hoehenverhaeltnisse aus der Vorgabe?
    print("")
    print("  Figur        Hoehe   Soll    Ist")
    koenig_ist = hoehe_von(figuren["koenig"])
    for name in REIHENFOLGE:
        ist = hoehe_von(figuren[name])
        print("  {:<10} {:6.3f}  {:5.2f}  {:5.2f}".format(
            name, ist, HOEHEN[name], ist / koenig_ist))

    # 3) Kamera einmalig auf die Gesamtheit einrechnen — danach tabu.
    print("")
    kamera_ausrichten(kamera, [figuren[n] for n in REIHENFOLGE])

    if not RENDERN:
        aufreihen(figuren)
        print("  RENDERN steht auf False — es wurden keine Bilder erzeugt.")
        return

    # 4) Die zwoelf Bilder. Es rendert immer nur eine Figur, alle anderen
    #    sind fuer den Renderer unsichtbar geschaltet.
    os.makedirs(AUSGABE_ORDNER, exist_ok=True)
    szene = bpy.context.scene
    print("")
    print("  Ziel: {}".format(AUSGABE_ORDNER))

    for name in REIHENFOLGE:
        for farbe in ("weiss", "schwarz"):
            for anderer in REIHENFOLGE:
                figuren[anderer].hide_render = (anderer != name)
            obj = figuren[name]
            obj.data.materials.clear()
            obj.data.materials.append(material[farbe])

            dateiname = "figur-{}-{}.png".format(name, farbe)
            szene.render.filepath = os.path.join(AUSGABE_ORDNER, dateiname)
            print("  rendere {} ...".format(dateiname))
            bpy.ops.render.render(write_still=True)

    for name in REIHENFOLGE:
        figuren[name].hide_render = False

    # 5) Zum Anschauen: die Figuren nebeneinander aufstellen.
    aufreihen(figuren)

    gesamt = sum(os.path.getsize(os.path.join(AUSGABE_ORDNER, d))
                 for d in os.listdir(AUSGABE_ORDNER) if d.endswith(".png"))
    print("")
    print("=== Fertig. 12 Bilder, zusammen {:.0f} KB "
          "(Grenze laut Vorgabe: 1024 KB) ===".format(gesamt / 1024))


main()
