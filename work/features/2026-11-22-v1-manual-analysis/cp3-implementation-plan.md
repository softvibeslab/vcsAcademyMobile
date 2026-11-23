# CP3 · Tareas y Repo Paths

**Status:** completed
**Contrato:** cp2-spec.md

| Par | Prueba primero | Implementación | Repo Paths |
|---|---|---|---|
| T01 | RED guardar feedback no debe inferir | Quitar inferencia automática y actualizar ayuda | frontend/src/pilot/TourVisits.jsx |
| T02 | RED aporte, límites, fallo/replay sin duplicación | Orquestar PATCH contexto y análisis explícito; campo y estados | frontend/src/pilot/tour-analysis.mjs, tour-analysis.test.mjs, TourVisits.jsx, tour-visits.css |
| T03 | RED rechazar nueva respuesta extensa, verificar acciones breves | Acotar prompt/validador conservando esquema público | backend/app/coach_hermes.py, backend/tests/test_tour_hermes.py |
| T04 | QA móvil/light-dark, conservación del modal y resultado previo | Ajustes sólo si aparece una regresión | work/features/2026-11-22-v1-manual-analysis/verify-manual-analysis.cjs |
| T05 | Candidata con inferencia real y smoke público | Publicación V1 y commit/push | deploy-release.py, evidence/, cp4-validation.md, cp5-closeout.md |

No cambios productivos en main.py/tour_visits.py/SQLite ni SOUL remoto. Backend limita sólo la nueva salida del modo análisis, no respuestas normales del chat. No se requiere ADR nuevo: se reutilizan edición, revisión e idempotencia ya decididas en tour-learning.

T01–T05 completadas. Salidas observadas y revisión en CP4; entrega y publicación en CP5.
