# Intake (CP0) · acceso-free-premium

**Status:** approved
**Feature:** `acceso-free-premium`
**Product:** Sales Academy · aisales.softvibes.pro (`vcsAcademyMobile`)
**Owner:** Roger (PO)
**Date:** 2026-11-14
**Historia:** work/stories/2026-11-14-acceso-free-premium.md (LISTA, `verify-story` OK)

## 1. Entrada

Origen: conversación con el PO (2026-11-14). «Cambia para que en el flujo de registro sea con base en un CRUD de qué lecciones u operaciones pueden hacerlas free o premium y de ahí eso se refleje la visibilidad pública, logeada y premium».

## 2. Contexto

- Las cuentas se creaban solo por invitación; el invitado veía los 11 pasos como vista previa local.
- Lecciones y escenarios fijos en código; recursos con CRUD y permiso por usuario, sin niveles.
- Sin pagos. Diseño Stitch C05 «Desbloquear acceso» con código de licencia.

## 3. Fuentes

| Fuente | Tipo | Acceso | Sensible |
|---|---|---|---|
| Historia HU-AISALES-ACCESO-01 | doc | work/stories/2026-11-14-acceso-free-premium.md | no |
| API FastAPI + SQLite | código | backend/app/ | no |
| Webapp piloto | código | frontend/src/pilot/ | no |
| Wireframe 43 pantallas (C05, A05, B06) | doc | SalesAcademyVibes/work/features/2026-11-13-app-wireframe/ | no |

## 4. Preguntas Abiertas

Ninguna: Q-01..Q-07 respondidas con la recomendación (historia, sección 17).

## 5. No-Goals

Cobro en línea, edición del contenido de lecciones, verificación de correo, OAuth.

## 6. Capas Afectadas (preliminar)

Backend (API, esquema SQLite), frontend web (piloto), despliegue (aisales).

## 7. Responsables Preliminares

PO: Roger. Implementación y QA: agente (Claude Code) con evidencia RED/GREEN.
