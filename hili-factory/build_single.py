#!/usr/bin/env python3
"""Bundle the project into one self-contained HTML file (dist/hili-factory.html)."""
import base64, re, pathlib
root = pathlib.Path(__file__).parent
html = (root / 'index.html').read_text()
css = (root / 'style.css').read_text()
def b64(p): return 'data:image/png;base64,' + base64.b64encode((root / p).read_bytes()).decode()
body = html[html.index('<body>') + 6: html.index('<script src="vendor')]
body = body.replace('assets/logo-lodd.png', b64('assets/logo-lodd.png')).replace('assets/logo-hili.png', b64('assets/logo-hili.png'))
scripts = ''.join(f'<script>\n{(root / f).read_text()}\n</script>\n' for f in ['vendor/three.min.js', 'data.js', 'app.js'])
fonts = '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">\n'
out = f'<title>Hili Smart Factory</title>\n{fonts}<style>\n{css}\n</style>\n{body}{scripts}'
(root / 'dist').mkdir(exist_ok=True)
(root / 'dist' / 'hili-factory.html').write_text(out)
print(len(out) / 1e6, 'MB')
