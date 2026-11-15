# Closure (CP5) · acceso-free-premium

**Status:** closed
**Feature:** `acceso-free-premium`
**Owner:** Roger (PO)
**Date:** 2026-11-14
**Validation:** cp4-validation.md

## 1. Summary

Registro público con cuenta Gratis, niveles Público / Gratis / Premium por lección, escenario, función y recurso, administrables en «Administración › Acceso y planes», códigos de licencia Premium y plan por usuario. El servidor aplica el acceso. Publicado en https://aisales.softvibes.pro junto con el FTD `instalar-app`.

**Despliegue (2026-11-14):** release `/srv/aisales-access-20261114`, imagen `aisales-api:20261114`; respaldo de la base `academy.sqlite3.bak-20261114`; release e imagen anteriores (`/srv/aisales-training-20261113`, `aisales-api:20261113`) conservadas para reversión. Script: `deploy.sh` (con reversión automática).

**Verificación en vivo:** `/api/ready` ready; catálogo de visitante: paso 1 público, 2-3 gratis, 4-11 premium; `/api/public/blueprint/steps/step_4` → 403; migración sobre la base real (7 usuarios demo, rep demo Premium, 28 elementos); Chrome: manifest sin errores, service worker activo, único aviso de instalabilidad `in-incognito` (propio del navegador de prueba); invitado ve los candados; registro visible; 0 errores JS. Capturas 10-12 en evidence/.

## 2. Shared Memory

- Las reglas de acceso viven en `backend/app/access.py`; la UI solo pinta (`access-model.mjs`).
- Un nivel nuevo de contenido se agrega como fila en `access_items` (migración `init_schema`, INSERT OR IGNORE).
- Rate limit por `X-Real-IP` (nginx), nunca por `X-Forwarded-For`.

## 3. Decisions Recorded

decision-log.md.

## 4. Learnings

- Una clase CSS genérica (`progress`) chocó con un componente existente: prefijar clases nuevas (`lock-*`, `pilot-*`).
- Capturas durante animaciones salen vacías: medir el elemento antes de concluir que falla.

## 5. Metrics

Eventos de auditoría `auth_register`, `license_redeem` y `access_level_changed` permiten medir registro y conversión a Premium.

## 6. Next Backlog

- Cobro en línea (pasarela de pagos) para Premium.
- Verificación de correo al registrarse.
- Editar el contenido de las lecciones desde el admin.
- Tipo MIME `application/manifest+json` en nginx (hoy `octet-stream`; Chrome lo acepta).

## Gate CP5 (Closure)

- [x] Desplegado y verificado en vivo
- [x] Documentación y evidencia en la feature
