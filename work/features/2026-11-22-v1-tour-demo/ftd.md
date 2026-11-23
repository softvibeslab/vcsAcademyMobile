# FTD: visita de demostración con aprendizaje

**Status:** completed
**Lane:** FTD
**Author:** Codex
**Branch:** feature/v1-tour-learning
**Date:** 2026-11-22
**Ticket:** solicitud en conversación

## Claridad

- **Solicitud:** el usuario pidió «puedes crear una de prueba» después de revisar el detalle de visitas en Agenda.
- **Entendimiento:** crear una visita ficticia persistente en la cuenta demo del asesor mediante el contrato aprobado de `2026-11-22-v1-tour-learning`, con feedback y análisis Hermes real. La prueba queda disponible para que el usuario la abra.
- **Hecho cuando:** existe una sola visita identificada como DEMO, el análisis está guardado y el enlace público abre su detalle con esa cuenta. Las métricas del Goal Sheet permanecen intactas.

| # | Pregunta | Respuesta | Estado |
|---|---|---|---|
| 1 | Ninguna: solicitud clara | Se usa la cuenta demo existente; escenario completamente ficticio | Respondida |

## Intencion

Dejar un ejemplo visible de contexto, feedback, aprendizaje y acceso al Roadmap.

## Alcance

- Una operación de datos de demostración mediante API existente; no cambia producto, esquema, permisos ni despliegue.
- No se atribuye a la venta del Goal Sheet ni se relacionan entidades por compartir fecha.
- Capa: datos. El registro conserva las reglas de caducidad y borrado del contrato vigente.

## Escalamiento

- [x] Una sola capa; operación dentro de un contrato aprobado.
- [x] Sin cambios de contrato ni esquema.
- [x] Sin cambios de autenticación, datos reales o superficie externa nueva.
- [x] Sin dependencias ni decisión técnica nueva que requiera ADR.
- [x] Menos de dos días.

## Checklist

- [x] Crear una visita DEMO con request_id persistido para evitar duplicados al reintentar.
- [x] Generar y recuperar análisis real; comprobar métricas intactas.
- [x] Abrir el detalle público y dejar el enlace al usuario.

## Evidencia

Excepcion TDD: operación de datos sintéticos por una API ya implementada y probada; no se cambia código productivo. Se valida mediante lectura posterior y navegador aislado.

| Tarea | Fase | Comando | Resultado observado |
|---|---|---|---|
| Operación | GREEN | `TOUR_QA_URL=https://aisalesv1.softvibes.pro/ node work/features/2026-11-22-v1-tour-demo/create-demo.cjs` | Creada una visita, análisis Hermes ready, dos lecciones recomendadas, métricas intactas y detalle visible; evidence/demo-result.json y capturas |

## TRUST 5

- [x] Tested: lectura posterior y verificación visual.
- [x] Readable: título DEMO y contexto explícitamente ficticio.
- [x] Unified: mismo contrato de visitas y análisis.
- [x] Secured: sin clientes reales ni tokens guardados en el repositorio.
- [x] Trackable: evidencia y enlace del registro.

## Siguiente

Registro disponible para el usuario: [DEMO · Bienvenida y descubrimiento](https://aisalesv1.softvibes.pro/#agenda/fdaef241-a407-40bd-a3fc-a2ed7fbe125d). Cuenta demo del asesor. La visita se conserva intencionalmente; puede eliminarse desde su detalle.
