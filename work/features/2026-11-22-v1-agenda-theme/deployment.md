# Publicación del tema de agenda V1

Publicado el 22 de noviembre de 2026 (America/Cancun) en https://aisalesv1.softvibes.pro/#agenda.

- Build: `npm run build:v1`; el build normal de V5 se verificó por separado.
- Raíz previa: `/srv/aisales-v1-release-20261122-monthly/web`.
- Raíz activa: `/srv/aisales-v1-release-20261122-agenda-theme/web`.
- Se copiaron los recursos previos y se superpusieron assets y HTML V1 en las cuatro entradas existentes. Solo cambió la directiva root del vhost V1.
- Respaldo: `/srv/aisales-v1/ops/nginx-before-20261122-agenda-theme.conf`.
- `nginx -t` y recarga pasan. Aviso preexistente server_names_hash no bloqueante, sin alterar ajustes globales.
- API, contenedores y bases de datos permanecen iguales. Configuración y HTML de V5 conservan sus hashes previos.

## Artefactos

| Archivo | SHA256 |
|---|---|
| index.html | 1ccf5d99a7d3f4c81fff462c1e610cd187dad2d3777709faf5117769fd074869 |
| assets/pilot-BHk_pdBB.js | db6709e684fc8c20019c69776d1c7085b8e64cb0cb1a84ec56cd29c7695ee98b |
| assets/pilot-lrl43DIl.css | b54cbc405f0a653304c2e6244ab942fb157c62a1876be4fd89c7dbb34c0bc67e |

## Reversión

Restituir solo el vhost V1 desde el respaldo, ejecutar `nginx -t` y recargar nginx. La raíz mensual anterior está intacta; no restaurar ni modificar bases de datos.

## Evidencia

Baseline y activación en `evidence/deployment-before.txt` y `deployment-activation.txt`. El smoke público en `verify-live.cjs` verifica HTML/JS/CSS contra el build, ambos temas desde HOME, persistencia, ausencia de barra y navegación/FAB sin guardar; resultados en `evidence/live/`.

Smoke público completado: diez comprobaciones y cuatro capturas pasan en light/dark, móvil/escritorio; cero errores JS. Solo POST de login/logout demo, sin guardados de negocio.
