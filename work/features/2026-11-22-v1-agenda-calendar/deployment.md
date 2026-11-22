# Publicación del calendario V1

Destino: https://aisalesv1.softvibes.pro/#agenda. Se reemplaza únicamente el frontend de esa instancia.

- Build: `npm run build:v1` → frontend/dist-v1/v1.html y assets. El build ordinario genera el piloto V5 y no se debe usar para esta publicación.
- Fuente web anterior: /srv/aisales-release-20261116a/web.
- Nueva raíz web: /srv/aisales-v1-release-20261122-calendar/web.
- Vhost: /etc/nginx/sites-available/aisalesv1.softvibes.pro.conf.
- API existente: 127.0.0.1:18824, contenedor aisales-v1-20261122 y base /srv/aisales-v1/data/academy.sqlite3; no se reinician ni migran.

## Activación

1. Validar localmente modelo, E2E con API real temporal y builds; registrar baseline de V1 y piloto actual.
2. Empaquetar dist-v1 y copiarlo al VPS. Crear nueva carpeta de release, copiar web anterior y superponer únicamente assets nuevos y HTML de entrada para index.html/pilot.html/academia/index.html/academia/pilot.html. Conservar recursos, prototipos, PWA y release anterior.
3. Guardar copia del vhost anterior en /srv/aisales-v1/ops/nginx-before-20261122-calendar.conf.
4. Cambiar solo la directiva root del vhost V1; nginx -t y reload. Si falla, restituir únicamente ese vhost.
5. Verificar bundle/hash, HTTPS y API, recorrido de navegador público sin sembrar datos, y misma configuración/HTML/contenedor de V5.

## Reversión

Restituir el vhost guardado, ejecutar nginx -t y reload. La raíz anterior sigue intacta y la API/DB no cambian. No modificar /srv/aisales/current ni restaurar snapshots de datos.

## Evidencia

Activado el 2026-11-22 y verificado. Baseline en evidence/deployment-before.txt; evidence/deployment-activation.txt y deployment-after.txt confirman nginx válido, readiness y aislamiento. Fixtures usados por QA permanecen exclusivamente en la base temporal local.

Artefactos activos:

- JS: assets/pilot-VEf5AdlK.js, SHA256 5b516c645e6f6fb431d09925e9a5c527a1530691b5ecb3cfaf8ce5ca175e6821.
- CSS: assets/pilot-2EC2p-Ez.css, SHA256 72db73c054039f99c8f9433e6c551234c44334d771c5559e15d77fedbd50c41e.

Smoke público verify-live.cjs: ocho checks pasan con DNS normal, TLS válido y hashes idénticos al build; capturas móvil/escritorio en evidence/live/. Solo modifica sesiones demo mediante login/logout, nunca Goal Sheet ni otros datos de negocio. Piloto V5 conserva su configuración, HTML y API. El aviso global server_names_hash de nginx no impide nginx -t; no se modificaron ajustes globales ajenos.
