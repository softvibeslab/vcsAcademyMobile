# Operación · versión anterior independiente

Fecha: 2026-11-22. URL: https://aisalesv1.softvibes.pro/.

## Componentes

| Elemento | Valor |
|---|---|
| Artefacto web | /srv/aisales-release-20261116a/web |
| Contenedor | aisales-v1-20261122 |
| Imagen | aisales-api:20261114c (digest en CP1) |
| API | 127.0.0.1:18824 → 8001 |
| Datos demo | /srv/aisales-v1/data/academy.sqlite3 |
| Variables | VCSA_DB_PATH=/data/academy.sqlite3; VCSA_CORS_ORIGINS=https://aisalesv1.softvibes.pro |
| Nginx | /etc/nginx/sites-available/aisalesv1.softvibes.pro.conf |
| Certificado | /etc/letsencrypt/live/aisalesv1.softvibes.pro/ |
| DNS | A aisalesv1, TTL 300, mismo VPS del piloto |

La web original se sirve sin reconstruir; los datos se crearon desde las semillas públicas de esa versión. No utilizar cuentas o datos privados en esta instancia demo. Coach conserva el proveedor local histórico. No se ha vinculado el CMS/servicio de marketing compartido.

## Secuencia ejecutada

1. Leer inventario y registrar baseline de root/configuración/contenedor vigente y checksums del artefacto histórico.
2. Añadir solo el registro A nuevo (overwrite=false), sin reemplazar la zona.
3. Crear /srv/aisales-v1/data con permisos 700, iniciar imagen existente con --restart unless-stopped y bind de API únicamente a loopback.
4. Instalar nginx-http.conf para ACME; nginx -t y reload.
5. Solicitar certificado con certbot certonly --webroot, raíz /var/www/softvibes-recovery-acme y hostname exacto.
6. Instalar nginx.conf; nginx -t y reload. Verificar después de que nginx termine la recarga y sirva el certificado y bundle esperados.
7. Comprobar DNS, TLS, readiness, separación de volúmenes/base y aplicación en navegador temporal.

Certbot.timer está habilitado. El hook global existente /etc/letsencrypt/renewal-hooks/deploy/salesacademy-nginx.sh valida y recarga nginx tras renovación, también para este certificado; no se agregó otra tarea periódica.

## Revisión y reinicio

`docker ps --filter name=aisales-v1-20261122` y `curl -fsS http://127.0.0.1:18824/api/ready` verifican el servicio. El reinicio automático pertenece solo a este contenedor. Si necesita reinicio manual: `docker restart aisales-v1-20261122`.

Las comprobaciones de base son de solo lectura y muestran integridad y conteos, nunca filas o credenciales. No hay backup de datos reales que migrar; la base demo no se incluye en el plan privado existente.

## Reversión acotada

Deshabilitar únicamente /etc/nginx/sites-enabled/aisalesv1.softvibes.pro.conf, ejecutar nginx -t y reload, y detener aisales-v1-20261122. Conservar el directorio de datos y artefactos para diagnóstico. Si se desea retirar el hostname, eliminar solo su registro A exacto. Nunca restaurar snapshots sobre /srv/aisales/data, cambiar /srv/aisales/current ni reiniciar el antiguo contenedor aisales-api (monta datos del piloto vigente).

## Verificación reproducible

`node work/features/2026-11-22-legacy-v1-deploy/verify-public.cjs` usa Chromium temporal y semillas demo. Consulta producción actual solo por GET / y /api/ready; no inicia sesión ni escribe en ella. Evidencia en evidence/.

Si el resolver local aún conserva una respuesta negativa del hostname recién creado, primero verificar su A público. Para QA únicamente, QA_TARGET_IP=76.13.231.12 permite resolver ese hostname dentro del proceso y Chromium; mantiene HTTPS/SNI y la validación del certificado. No modifica /etc/hosts ni enmascara el resultado DNS: results.json declara el modo de resolución utilizado.
