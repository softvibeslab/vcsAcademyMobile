# Agenda responsiva

La Agenda conserva sus funciones y colores, adaptando el espacio:

- **Escritorio:** calendario a la izquierda y tarjetas del día a la derecha, con ancho acotado.
- **Tablet vertical:** calendario y detalle apilados con proporciones legibles.
- **Móvil:** pantalla completa; en horizontal se aprovechan dos columnas. Si falta altura, se desplazan el calendario y las tarjetas dentro de sus paneles.

El detalle de visita sigue abriendo su modal completo. Aprendizaje con IA mantiene el campo de aporte y el botón Analizar.

Verificado en 12 tamaños de ventana con Chromium/WebKit, temas claro y oscuro, y 4 casos adicionales sobre el sitio público. Son pruebas emuladas, no dispositivos físicos.

## Publicación

Disponible en [Agenda](https://aisalesv1.softvibes.pro/?v=responsive-agenda#agenda).

Sólo archivos estáticos V1. `package-release.py` empaqueta el build; `publish-web.py ARCHIVE SHA256` verifica y activa la nueva raíz, conservando los contenedores API y V5 sin reiniciarlos.

Reversión: restaurar `/srv/aisales-v1/ops/20261122-responsive-agenda/nginx-before.conf` al vhost V1, validar `nginx -t` y recargar Nginx. La raíz anterior es `/srv/aisales-v1-release-20261122-manual-analysis/web`. No se modifica ni restaura ninguna base de datos.

Alcance, pruebas y evidencia: [ftd.md](ftd.md).
