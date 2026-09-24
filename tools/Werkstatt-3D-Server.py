"""Werkstatt-3D-Server.py - liefert den App-Ordner fuer die 3D-Werkstatt aus.

Aufruf (aus dem App-Ordner):  python tools\\Werkstatt-3D-Server.py
dann http://localhost:8094 oeffnen.

WARUM EIN EIGENER SERVER: Die Werkstatt-Seite `_werkstatt-3d.html` legt ein
Testkonto in den Geraetespeicher und laeuft im Modus "lokal". Oeffnet man auf
DERSELBEN Adresse die echte Startseite, liefe sie im Modus "gemeinsam" mit
diesem Testkonto gegen die echte Datenbank (24.09.2026 passiert: der
Browser-Bereich oeffnet beim Start immer "/"). Dieser Server leitet "/" und
"/index.html" deshalb IMMER auf die Werkstatt-Seite um - auf Port 8094 gibt es
die echte Startseite gar nicht.
"""
import functools
import http.server
import os

ORDNER = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = 8094


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map,
                      ".js": "text/javascript", ".glb": "model/gltf-binary"}

    def do_GET(self):
        pfad = self.path.split("?")[0]
        if pfad in ("/", "/index.html"):
            self.send_response(302)
            self.send_header("Location", "/_werkstatt-3d.html")
            self.end_headers()
            return
        super().do_GET()


if __name__ == "__main__":
    print("Werkstatt: http://localhost:{}  (Ordner {})".format(PORT, ORDNER))
    http.server.ThreadingHTTPServer(("127.0.0.1", PORT),
                                    functools.partial(Handler, directory=ORDNER)).serve_forever()
