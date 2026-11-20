# CP3 · Implementación del piloto v5

**Status:** in_progress
**Date:** 2026-11-20
**Spec:** [cp2-spec.md](cp2-spec.md) v1, aprobado junto con sus anexos el 2026-11-20.
**Historia:** [2026-11-19-pilot-v5.md](../../stories/2026-11-19-pilot-v5.md), LISTA.
**Rama:** `feature/pilot-v5`.

El [plan preliminar](implementation-plan-proposal.md) conserva la propuesta original. Este documento registra la ejecución autorizada; [CP4](cp4-validation.md) contiene resultados observados y pendientes. La aprobación citable está en [approval.md](approval.md).

## Gate de entrada ejecutado

- [x] Historia, criterios, escenarios y datos sintéticos aceptados por el PO.
- [x] `verify-story` ejecutado: historia LISTA, [evidencia](evidence/story-approved.txt).
- [x] CP2 y anexos aprobados; reglas de Q, neto, metas y privacidad conservadas.
- [x] Perfil local del producto materializado en `.ecosystem360/team-bootstrap/project-profile.local.yml`.
- [x] Rama nueva creada; trabajo paralelo por módulos con integración secuencial.

## Repo Paths · contrato a código construido

| Capa / contrato | Rutas implementadas | Verificación |
|---|---|---|
| Acceso privado, sesión y operación manual | `backend/app/pilot/auth.py`, `identity.py`, `errors.py` | `backend/tests/pilot/test_auth.py`, `test_identity.py` |
| Datos, auditoría y aplicación privada | `backend/app/pilot/db.py`, `bootstrap.py`, `app.py` | `test_bootstrap.py`, migración de auditoría y ensayo operativo |
| Tours, seguimientos, metas y seis KPIs | `backend/app/pilot/activity.py`, `metrics.py` | `test_activity.py` |
| Notas, Diario, equipo, preferencias y marca | `backend/app/pilot/workspace.py` | `test_workspace.py` |
| Ruta/CMS, publicación, permisos y PDFs | `backend/app/pilot/learning.py`, `assets.py` | `test_learning.py` |
| App, navegación y recursos | `frontend/src/pilot-v5/App.jsx`, `Activity.jsx`, `Learning.jsx`, `Resources.jsx`, `ui.jsx`, `styles.css` | Modelos comprobados; navegador/accesibilidad en curso |
| Cliente API, dinero y calculadoras | `frontend/src/pilot-v5/api.mjs`, `model.mjs` | `frontend/src/pilot-v5/model.test.mjs` |
| Recuperación, capacidad y publicación | `tools/pilot/verify_operations.py`, `operations-runbook.md`, `deploy-pilot.sh` de esta feature | Ensayo local observado; VPS/corte pendientes de evidencia final |

La app privada usa un entry point separado del backend legacy. No monta registro/demo/Coach ni permisos globales anteriores. La UI v5 también reside en un directorio separado; no cambia la interpretación de los modelos históricos.

## Pares test/impl y estado real

Cada grupo corresponde a AC/TC del mismo número y mantiene las tareas `Txx-test` antes de `Txx-impl`. Una suite aprobada no sustituye revisión visual ni UAT.

| Pares | Trabajo construido | Estado / evidencia |
|---|---|---|
| T01–T03 | Cookie privada, allowlist, temporal, CSRF, recuperación manual y aislamiento | Backend implementado/probado; identity RED/GREEN, matriz negativa workspace/learning y revisión adversarial |
| T04–T05 | Home/Route/Resources, guía y EN/ES persistente | UI/API construidas; modelos/preferencias verdes; navegador en curso |
| T06–T09 | Tours, No Tour, KPIs, cancelaciones, correcciones e idempotencia | API/dominio probados, incluyendo fechas originales/conflictos; UI en QA |
| T10–T11 | Meta mensual definitiva e histórico separado | Unicidad concurrente, triggers inmutables, siguiente mes y migración doble probados |
| T12–T15 | Ciclo editorial, PDF privado, progreso y solicitudes | Dos organizaciones, editor y nombres de archivos comprobados mediante RED/GREEN |
| T16 | Equipo con KPIs/progreso propios | Detalle compara KPIs de Home y esquema real de learning; sin textos privados |
| T17–T18 | Notas y tres respuestas de Diario persistentes | Privacidad, versiones, deduplicación y eliminación comprobadas; navegador/offline en QA |
| T19–T20 | Anyway money y enganche | Modelos verdes con oráculos/límites; presentación en QA |
| T21–T22 | Marca, Mi cuenta, idioma y sesión | API implementada/probada; recorridos visuales en curso |
| T23 | Responsive, teclado, foco y zoom | UI implementada; validación de navegador/accesibilidad en curso |
| T24 | Integración, migración, respaldo, recuperación y release | Integración y ensayo local comprobados; rendimiento VPS, conmutación y smoke en curso |

Corrección transversal terminada: auditoría con `X-Request-ID` generado por servidor, `ContextVar`, migración aditiva y prueba concurrente. El borrado de notas/Diario no conserva texto en auditoría ni en respuestas persistidas de idempotencia.

## Comandos y aislamiento

El perfil local declara Python/FastAPI, React/Vite, SQLite y Docker/Nginx. Las pruebas usan bases y archivos temporales; nunca el reset del producto anterior.

```sh
.venv/bin/python -m unittest discover -s backend/tests/pilot -p 'test_*.py'
node --test frontend/src/pilot-v5/*.test.mjs
npm run build:web
```

Suite backend, modelos frontend, build web y 17 recorridos de Chromium tienen salida registrada en CP4. Rendimiento HTTP del VPS comprobado con p95 Home 461.84 ms. Zoom nativo, UAT y release siguen en consolidación. No hay lint configurado: no se declara un lint inexistente aprobado. Publicación secuencial conforme al [runbook](operations-runbook.md), preservando la base vigente y escrituras nuevas.

## Trabajo restante

1. Conservar evidencia de los 17 recorridos de navegador y completar zoom nativo/lector y revisión UAT.
2. Consolidar el preflight y respaldo del corte; capacidad HTTP sintética del VPS ya verificada.
3. Publicar web/API coordinadas, comprobar smoke y conservar recuperación compatible.
4. Registrar build/gobernanza final, revisión editorial y UAT del responsable sin inferir aceptación de una prueba técnica.
