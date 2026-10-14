#!/usr/bin/env python3
"""Build the realistic web version: glb_data.js (base64 glTF) + index.html + one fully standalone HTML file."""
import base64, pathlib, re
here = pathlib.Path(__file__).resolve().parent; root = here.parent
(here / 'vendor').mkdir(exist_ok=True)
(here / 'vendor' / 'three.bundle.js').write_bytes((root / 'vendor' / 'three.bundle.js').read_bytes())
for f in ('data.js', 'style.css'):
    (here / f).write_bytes((root / f).read_bytes())
(here / 'assets').mkdir(exist_ok=True)
for f in ('logo-lodd.png', 'logo-hili.png'):
    (here / 'assets' / f).write_bytes((root / 'assets' / f).read_bytes())
b = lambda n: base64.b64encode((here / 'assets' / n).read_bytes()).decode()
glb = 'window.HILI_GLB = {aircraft: "%s", site: "%s"};\n' % (b('hili_aircraft.glb'), b('hili_site.glb'))
(here / 'glb_data.js').write_text(glb)
html = (root / 'index.html').read_text().replace('<script src="vendor/three.min.js"></script>\n<script src="data.js"></script>', '<script src="vendor/three.bundle.js"></script>\n<script src="glb_data.js"></script>\n<script src="data.js"></script>')
html = html.replace('<title>Hili Smart Factory</title>', '<title>Hili Realistic Factory</title>')
(here / 'index.html').write_text(html)
# standalone: inline everything
css = (here / 'style.css').read_text()
body = html[html.index('<body>') + 6: html.index('<script src="vendor')]
for n in ('logo-lodd.png', 'logo-hili.png'):
    body = body.replace('assets/' + n, 'data:image/png;base64,' + b(n))
scripts = ''.join('<script>\n%s\n</script>\n' % (here / f).read_text() for f in ('vendor/three.bundle.js', 'glb_data.js', 'data.js', 'app.js'))
fonts = '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">\n'
out = ('<!doctype html>\n<html lang="en" dir="ltr">\n<head>\n<meta charset="utf-8">\n<title>Hili Realistic Factory</title>\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
       + fonts + '<style>\n' + css + '\n</style>\n</head>\n<body>' + body + scripts + '</body>\n</html>\n')
(here / 'Hili_Realistic_Standalone.html').write_text(out)
print('standalone', round(len(out) / 1e6, 2), 'MB')
