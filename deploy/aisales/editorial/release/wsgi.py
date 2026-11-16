"""Isolated editorial runtime for aisales.softvibes.pro."""
from flask import request
from werkzeug.middleware.proxy_fix import ProxyFix
from growth.server.app import create_app
app = create_app()
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)
@app.after_request
def experience_navigation(response):
    if not request.path.startswith(('/cms/', '/descubre/', '/mediahub/')) or response.mimetype != 'text/html' or response.direct_passthrough:
        return response
    text = response.get_data(as_text=True)
    text = text.replace('https://salesacademy.softvibes.art/', '/academia/')
    text = text.replace('href="/descubre/"', 'href="/"')
    nav = '<details class="sa-switch"><summary>Sales Academy · Explorar ↗</summary><a href="/">Inicio</a><a href="/academia/">Entrar a la academia</a><a href="/mediahub/">MediaHub</a><a href="/descubre/diagnostico/">Diagnóstico</a><a href="/stitch/">Comparar diseños Stitch</a><a href="/cms/">Estudio editorial</a></details>'
    if request.path.startswith('/cms/'):
        nav = nav.replace('</details>', '<p>La landing editable se publica en /descubre/. La referencia Stitch es independiente.</p></details>')
    text = text.replace('</head>', '<link rel="stylesheet" href="/experience/navigation.css"></head>')
    response.set_data(text.replace('</body>', nav + '</body>'))
    return response
