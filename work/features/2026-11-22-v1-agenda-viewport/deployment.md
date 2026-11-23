# Publicación de agenda a pantalla completa

Destino: https://aisalesv1.softvibes.pro/#agenda. Publicado el 22 de noviembre de 2026 (America/Cancun).

- Build: `npm run build:v1`; build ordinario de V5 verificado por separado.
- Raíz previa: `/srv/aisales-v1-release-20261122-agenda-theme/web`.
- Raíz activa: `/srv/aisales-v1-release-20261122-agenda-viewport/web`.
- Vhost: `/etc/nginx/sites-available/aisalesv1.softvibes.pro.conf`.
- Respaldo: `/srv/aisales-v1/ops/nginx-before-20261122-agenda-viewport.conf`.
- Se copiaron recursos existentes y se superpusieron assets/HTML V1 en las cuatro entradas ya existentes. Solo cambió la directiva root V1.
- `nginx -t` y recarga completados; aviso preexistente server_names_hash no bloqueante. API, contenedores y bases de datos permanecen iguales; hashes de configuración/HTML V5 conservados.

## Artefactos

| Archivo | SHA256 |
|---|---|
| index.html | c970803b4d5962d16401112046bd74dcac5612340af9ea91731d9521ce732853 |
| assets/pilot-B99LA0O0.js | 51d15d4152d19bd84b4806a50e5028a96ea9ebcf0bbc23ead25037df7c5a9c92 |
| assets/pilot-z1WX0d_C.css | c619983e3c60ec9562d52552cf270e40370a35d36363549803aec4b37a8e55c0 |

## Reversión

Restituir únicamente el vhost V1 desde el respaldo, ejecutar `nginx -t` y recargar nginx. El release anterior sigue intacto. No restaurar ni modificar bases de datos.

## Evidencia

Baseline/activación en `evidence/deployment-before.txt` y `deployment-activation.txt`. QA local con 25 grupos y doce combinaciones de motor/tamaño/tema, más Historial. El smoke público `verify-live.cjs` verifica hashes, temas, viewport completo, las 42 celdas, navegación y FAB sin guardar datos; evidencia en `evidence/live/`.

Smoke público completado: 12 verificaciones y seis capturas pasan en Chromium Android/escritorio y WebKit iPhone emulados, ambos temas. Cero scroll de página/mes en esos tamaños, cero errores JS y únicamente POST de login/logout demo. V5 permanece idéntico. Servicios temporales de QA cerrados.
