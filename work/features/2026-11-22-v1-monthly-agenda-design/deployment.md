# Publicación del calendario mensual V1

Destino: https://aisalesv1.softvibes.pro/#agenda.

## Preparación y activación

1. Ejecutar modelos, regresiones del perfil, QA local con datos simulados y ambos builds. `npm run build:v1` produce el frontend que se publica; `build:web` verifica el piloto actual por separado.
2. Copiar `/srv/aisales-v1-release-20261122-calendar/web` a una nueva raíz `/srv/aisales-v1-release-20261122-monthly/web` y superponer `frontend/dist-v1/assets` y la entrada `v1.html` como `index.html`, `pilot.html`, `academia/index.html` y `academia/pilot.html`.
3. Guardar el vhost V1 en `/srv/aisales-v1/ops/nginx-before-20261122-monthly.conf`. Cambiar solo su directiva `root`; validar con `nginx -t` y recargar.
4. Ejecutar `verify-live.cjs`: hashes del HTML/JS/CSS, HTTPS, navegación del calendario y FAB, login/logout demo sin escrituras de negocio. Comparar configuración, HTML y contenedor del piloto V5 con el baseline.

Se conserva API V1 en 127.0.0.1:18824, contenedor `aisales-v1-20261122` y base independiente `/srv/aisales-v1/data/academy.sqlite3`. No se migran datos ni se reinicia la API. El despliegue privado `/srv/aisales/current` no se cambia.

## Reversión

Restaurar únicamente el vhost V1 desde `nginx-before-20261122-monthly.conf`, ejecutar `nginx -t` y recargar nginx. La raíz semanal anterior permanece intacta; no restaurar bases de datos.

## Estado

Publicado y verificado el 2026-11-22. `nginx -t` y recarga completados; el aviso preexistente `server_names_hash` es no bloqueante y no se cambió configuración global.

- HTML SHA256: `1c4c946a7132c8c7b0ed497ee6042515e62fb60b093233029cde82f771e33c6c`.
- JS: `assets/pilot-D349lf_J.js`, SHA256 `512fd08f19c5a2a2b226496bc994030d45e3973b7fffda54799074f8ae0ab04d`.
- CSS: `assets/pilot-0JMcyTXr.css`, SHA256 `e5264b75e5a999617bc31a6a68d2f0c2df7c017dca5b6a76b8900be87b9f1d0e`.

`evidence/live/results.json` registra ocho comprobaciones públicas exitosas, incluyendo hashes, API, HTTPS y recorridos móvil/escritorio. Únicos POST: login/logout de la cuenta demo; no se sembraron ni guardaron datos de negocio. V5 conserva configuración, HTML, contenedor y modo de API. Servidores locales de QA cerrados al finalizar.
