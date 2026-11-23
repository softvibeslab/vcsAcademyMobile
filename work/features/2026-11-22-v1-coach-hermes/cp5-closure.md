# CP5 · Entrega

**Status:** implementado, publicado y verificado el 22 de noviembre de 2026 (America/Cancun).

**Rama:** `feature/v1-coach-hermes`.

**Sitio:** https://aisalesv1.softvibes.pro/#coach.

## Resultado

El Coach usa una cabecera compacta, conversación con desplazamiento interno y campo de escritura visible sobre la navegación. Conserva los temas light/dark, incluye tres sugerencias editables y permite ampliar respuestas largas. Envío, espera, error y reintento evitan duplicados y mantienen el contexto. Roleplay y evaluaciones conservan sus flujos existentes.

El perfil aislado `sales-academy-coach-v1` responde desde Hermes en `2.25.231.154`, elegido expresamente por el usuario. La API V1 sigue en `76.13.231.12` y se conecta mediante un túnel SSH privado. Las credenciales permanecen en los servidores. Se verificaron dos turnos reales y el recuerdo de la objeción planteada; no queda una reautenticación pendiente.

Se conserva la base V1 sin migración. La agenda mantiene las 42 fechas visibles sin scroll mensual en la matriz probada. El piloto privado V5 conserva su contenedor, imagen, configuración Nginx y HTML.

## Evidencia y operación

- Historia aprobada y gate LISTA: historia enlazada en CP0 y `evidence/readiness-approved.txt`.
- RED/GREEN, pruebas, regresiones, builds y TRUST 5: [CP4](cp4-validation.md).
- Prueba pública final: `evidence/live/results.json`, 11 verificaciones y 7 capturas; seis combinaciones navegador/tema, hashes publicados exactos e inferencia real con continuidad.
- Release final: `/srv/aisales-v1-release-20261122-coach-r2/web`. Manifest en `evidence/web-r2-manifest.json`.
- Topología, respaldo y reversión: [operación](deployment.md). La reversión no requiere restaurar SQLite porque no hubo migración.
- Gate de gobierno final: `evidence/governance.txt`.

## Límites

QA móvil realizado con WebKit/Chromium y viewport/DPR de iPhone/Android; no se usó hardware físico. El historial del chat permanece en memoria de la sesión y se limita al contexto aprobado para inferencia. Roleplay conserva la simulación previa. Los fallos del proveedor se muestran con un error recuperable y reintento, sin invalidar la sesión de la app.

No quedan cambios de producto ni decisiones pendientes en esta feature. Los procesos locales temporales de QA se detienen al cerrar; los servicios publicados permanecen activos.
