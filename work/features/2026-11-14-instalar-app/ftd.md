# FTD: `instalar-app`

**Status:** done (publicado en aisales 2026-11-14)
**Lane:** FTD
**Author:** `RogerDevAndroid`
**Branch:** `feature/acceso-free-premium`
**Date:** `2026-11-14`
**Ticket:** `Pedido del PO (2026-11-14): «agrega un boton para que se pueda instalar la app para cualquier dispositivo»`

## Claridad

- **Solicitud:** botón para instalar la app de aisales.softvibes.pro en cualquier dispositivo.
- **Entendimiento:** la app (React/Vite, `frontend/pilot.html`, servida en `/` y `/academia/`) no es instalable: no tiene manifest, service worker ni íconos. Se hace PWA con el mismo enfoque probado en la demo de agendas: manifest con `start_url` `/`, service worker que solo responde navegaciones sin red con una página offline (no cachea código), íconos propios con la marca de aisales y un botón «Instalar app» que aparece solo si la app no está instalada: diálogo nativo en Android y escritorio (Chrome/Edge), instrucciones en iOS y en navegadores sin diálogo.
- **Hecho cuando:** en el navegador, el botón aparece sin instalar, el manifest y el service worker cargan sin errores, y el botón desaparece en modo instalada (standalone).

| # | Pregunta | Respuesta | Estado |
|---|---|---|---|
| — | Sin preguntas | — | — |

## Intencion

Que reps y gerentes tengan la academia como app en su teléfono o computadora, con un toque.

## Alcance

- Incluye: `frontend/public/` (manifest, sw, offline, íconos), `pilot.html`, `install-model.mjs` + prueba, botón en la barra superior de la app, en el modo invitado y en la bienvenida.
- No incluye: notificaciones push ni modo offline de datos.
- Capa: frontend.

## Escalamiento

- [x] Una capa · [x] Sin contrato · [x] Sin esquema · [x] Sin datos sensibles · [x] Sin dependencias · [x] Sin ADR · [x] < 2 días

## Checklist (tests primero)

- [x] T01-test `install-model.test.mjs` (instalada, iOS, modo del botón) - FALLÓ con módulo vacío.
- [x] T01-impl `install-model.mjs` (misma lógica probada en la demo de agendas).
- [x] T02 navegador: botón visible, manifest/SW 200, oculto en standalone.

## Evidencia

| Tarea | Fase | Comando | Resultado observado |
|---|---|---|---|
| T01 | RED | `node --test frontend/src/pilot/install-model.test.mjs` | `pass 0 fail 3` |
| T01 | GREEN | `node --test frontend/src/pilot/install-model.test.mjs` | `pass 3 fail 0` |
| T02 | GREEN | Playwright `flow.mjs` | `install_button_welcome: true`, ayuda «Abre el menú del navegador…», `manifest_status: 200`, `sw_status: 200`, `install_button_topbar: true`, `install_hidden_standalone: true` |

## Decisiones

- Service worker sin caché de código (solo página offline para navegaciones): cada despliegue se ve al instante.
- Íconos propios (fondo #101319, «SA» en #00e676), versión maskable con margen.
- El botón vive en la bienvenida, la barra superior de la app y el modo invitado.

## TRUST 5

- [x] Tested [x] Readable [x] Unified [x] Secured (sin caché de datos) [x] Trackable

## Siguiente

Desplegar junto con `acceso-free-premium`.
