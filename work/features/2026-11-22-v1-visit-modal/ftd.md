# FTD: detalle de visita completo en Agenda

**Status:** completed
**Lane:** FTD
**Author:** Codex
**Branch:** fix/v1-visit-detail-modal
**Date:** 2026-11-22
**Ticket:** solicitud en conversación

## Claridad

- **Solicitud:** «no se abre completo el modal arreglaoo», después de abrir la visita DEMO publicada.
- **Entendimiento:** el detalle se aloja actualmente en el panel diario de altura máxima 40dvh. Abrirlo como diálogo amplio: pantalla completa en móvil, centrado en escritorio, cabecera y cerrar visibles, desplazamiento interno para contexto, feedback y análisis.
- **Hecho cuando:** tarjeta y enlace directo abren el detalle completo; se alcanza la última acción sin desplazar la página; Escape/cerrar regresan a Agenda y devuelven el foco; abrir/cerrar la edición anidada conserva el detalle. Light/dark, tamaños móviles y escritorio verificados y corrección publicada.

| # | Pregunta | Respuesta | Estado |
|---|---|---|---|
| 1 | Ninguna: bug visible y acotado | Sólo presentación del detalle existente de Agenda | Respondida |

## Intencion

Hacer legible el detalle y análisis de la visita sin confinarlo a una franja debajo del calendario.

## Alcance

- Archivos: `frontend/src/pilot/SmartAgenda.jsx`, `smart-agenda.css` y cierre de edición en `TourVisits.jsx`.
- Capa: frontend. Reutilizar `TourVisitDetail` en diálogo nativo; conservar panel/calendario al cerrar.
- Sin cambios de datos, API, autenticación, análisis Hermes, métricas o relación con Goal Sheet.
- La petición actual autoriza ampliar el panel visual previsto en CP2 de tour-learning. El contrato de datos permanece intacto.
- Publicación estática mediante el procedimiento existente; sin reiniciar APIs ni tocar V5.

## Escalamiento

- [x] Una sola capa; sin cambio de contrato entre capas.
- [x] Sin esquema ni migraciones.
- [x] Sin cambios de autenticación, datos sensibles ni superficie externa nueva.
- [x] Sin dependencia, servicio externo nuevo o decisión que requiera ADR.
- [x] Menos de dos días.

## Checklist

- [x] T01-test: reproducir que no existe un diálogo amplio y el detalle queda recortado en el panel diario.
- [x] T01-impl: diálogo móvil/escritorio con contenido desplazable y controles visibles.
- [x] T02-test: comprobar foco, Escape, edición anidada, cierre y reapertura.
- [x] T02-impl: completar el manejo de ciclo de vida y foco del diálogo.
- [x] Build V1/V5, regresión frontend y QA pública del artefacto final.

## Evidencia

| Tarea | Fase | Comando | Resultado observado |
|---|---|---|---|
| T01 | RED | `MODAL_QA_PHASE=red MODAL_QA_CASES=iphone-dark node .../verify-modal.cjs` con URL local | Falta el modal; detalle limitado a 188 px en viewport 390×844. evidence/red/results.json |
| T02 | RED | Mismo script, matriz de navegador/tema | WebKit no devuelve foco a Editar visita tras Escape: 3 fallos; evidence/focus-red/results.json |
| T01/T02 | GREEN | Mismo script después del arreglo | Seis combinaciones móvil/escritorio y light/dark pasan; evidence/viewport-first-run/results.json. La séptima se revisó por la premisa del teclado descrita abajo |
| Teclado | GREEN | `MODAL_QA_PHASE=keyboard-green MODAL_QA_CASES=reduced-height node .../verify-modal.cjs` | Modal de 460 px/cuerpo de 395 px, editor y cierre visibles, foco y regreso correctos; evidence/keyboard-green/results.json |
| Regresión | GREEN | `node --test frontend/src/pilot/*.test.mjs frontend/src/components/calendar/*.test.mjs frontend/src/pilot-v5/model.test.mjs` | 59/59; evidence/frontend-regression.txt |
| Build | GREEN | `npm run build:v1` y `npm run build:web` | Ambos builds pasan; evidence/build-v1.txt y build-v5.txt |
| Publicación | GREEN | publish-web.py con archivo y SHA256 verificado | 17 archivos; APIs V1/V5 sin cambios ni reinicio; evidence/release-activation.json |
| Público | GREEN | verify-modal.cjs contra HTTPS, ejemplo existente | Android claro, escritorio claro e iPhone oscuro pasan; evidence/live-summary.json cita cada ejecución observada |
| Artefactos | GREEN | verify-public-artifacts.py con release-manifest de esta feature | 9/9: HTTPS, HTML/JS/CSS idénticos al build, API lista y HTML V5 intacto; evidence/public-artifacts.json |

Excepcion TDD: configuración del paquete estático y documentación se validan con revisión, hashes y comprobaciones públicas. La lógica de navegación del modal tiene evidencia RED → GREEN.

**Revisión de la prueba de teclado:** el primer caso de 390×460 aprobó modal, contenido, editor y foco; falló al volver al calendario manteniendo la altura del teclado. La prueba se corrigió para restaurar 390×844 al cerrar la edición. Se conserva el fallo y la explicación en `evidence/viewport-test-review.md`. El calendario completo a 460 px queda como decisión pendiente fuera del arreglo, no se declara compatible.

**Sincronización de QA pública:** en Safari, la prueba desplazaba el contenido antes de que terminara de cargar el catálogo; las recomendaciones añadidas después movían el botón. Se confirmó la secuencia con posiciones y respuestas, y se esperó el catálogo antes del desplazamiento sin relajar visibilidad ni modificar producto. Evidencia original y ejecución corregida: `evidence/catalog-scroll/cause.md` y `evidence/live-summary.json`.

La QA usa una visita ficticia existente, únicamente lee su contenido y abre/cancela edición sin guardar. Comprueba que la visita permanezca idéntica y no haya POST/PATCH/DELETE de visitas. La emulación móvil no equivale a pruebas en hardware físico.

## TRUST 5

- [x] Tested: fallo reproducido y corrección verificada, foco y navegación incluidos.
- [x] Readable: wrapper separado que reutiliza el detalle existente.
- [x] Unified: mismos componentes, temas y contrato de visitas.
- [x] Secured: ejemplo sintético, sin credenciales en evidencia ni cambios de permisos/datos.
- [x] Trackable: feature, rama y evidencia de publicación identificadas.

## Publicación

- Artefacto: `evidence/release-manifest.json`, SHA256 `eda2e795b63facfe59055d9bb193cdb34c46562388a0bb6701e4fd7a2d4607f3`.
- Raíz anterior: `/srv/aisales-v1-release-20261122-tours-r2/web`; nueva: `/srv/aisales-v1-release-20261122-visit-modal/web`.
- El operador verifica HTML/JS/CSS y conserva identidad, imagen, estado y fecha de inicio de ambos contenedores API. No toca la base ni el perfil Hermes.
- Reversión: restaurar la configuración previa guardada en `/srv/aisales-v1/ops/20261122-visit-modal/nginx-before.conf`, validar `nginx -t` y recargar Nginx. No restaurar bases ni reiniciar APIs.

## Siguiente

Entrega publicada y verificada. Enlace del ejemplo: https://aisalesv1.softvibes.pro/?v=visit-modal#agenda/fdaef241-a407-40bd-a3fc-a2ed7fbe125d. La prueba queda guardada e intacta.
