# CP2 · Contrato operativo

**Status:** approved
**Fecha:** 2026-11-22
**Aprobación:** petición directa de despliegue y respuestas citadas en la historia. No se cambia código, contratos de API, diseño ni reglas de negocio existentes.

## Requisitos

- REQ-01: publicar exactamente la web de la release 20261116a en aisalesv1.softvibes.pro.
- REQ-02: ejecutar su imagen de API conservada en un contenedor nuevo, aisales-v1-20261122, puerto loopback 18824. Base /srv/aisales-v1/data/academy.sqlite3 inicializada con semillas demo originales.
- REQ-03: registro A del hostname en el VPS existente, certificado TLS propio, redirección HTTP a HTTPS y API relativa al nuevo origen.
- REQ-04: no modificar raíz, contenedor, base ni configuración nginx del piloto vigente. Reversión acotada a retirar el vhost y detener la nueva instancia, conservando sus datos.
- REQ-05: probar acceso, guía, Home, Roadmap, Coach local y Perfil con datos demo en navegador aislado.

## Criterios de aceptacion

AC-01 a AC-03 y ESC-01 a ESC-03 de la historia enlazada en CP0. HTTP 200 en web/bundle/API, certificado válido, recorrido sin errores JavaScript, mounts independientes y configuración vigente idéntica.

## Seguridad y límites

NFR-01: API accesible en el VPS por loopback; acceso web por HTTPS. Cookie histórica vcsa_session con Secure, HttpOnly y SameSite=Lax.
NFR-02: base nueva sin filas importadas; no reutilizar credenciales, backups ni volumen privado del piloto actual.
NFR-03: conservar artefacto sin reconstruir; checksums y resultado de validación documentados. No se añaden dependencias.

La versión contiene cuentas públicas de demostración; es una instancia de prueba. No se incorporan datos reales. La IA sigue usando su proveedor local histórico. Nuevas integraciones, cambios de funcionalidad o migración de datos requerirían otra decisión del usuario.
