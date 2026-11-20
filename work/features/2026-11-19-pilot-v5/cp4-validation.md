# CP4 · Validación del piloto v5

**Status:** in_progress — suites, navegador y rendimiento VPS verificados en su alcance; cierre operativo y UAT pendientes.
**Date:** 2026-11-20.
**Plan:** [CP3](cp3-implementation-plan.md).
**Contrato:** [CP2 v1](cp2-spec.md) y [aprobación](approval.md).

Se registran salidas observadas. La aprobación del contrato habilita desarrollo/publicación; no equivale a UAT aprobada ni a comprobación de producción.

## 1. Resultados observados

| Comprobación | Comando / ejecución | Resultado y alcance | Evidencia |
|---|---|---|---|
| Backend completo, incluidas operaciones | `.venv/bin/python -m unittest discover -s backend/tests/pilot -v` | 77 pruebas, 1.867 s, OK; bases/cuentas/PDF sintéticos | [backend-final.txt](evidence/backend-final.txt) |
| Modelos frontend v5 | `node --test frontend/src/pilot-v5/*.test.mjs` | 12 pruebas pasan: dinero, calculadoras, payloads, roles, fecha Cancún, versiones y editor | [frontend-final.txt](evidence/frontend-final.txt) |
| Revisión adversarial core | Cliente HTTP integrado, cookie y DB temporal | CSRF/origen rechazados; expiración/revocación; roles; legacy cerrado; migración repetida | [core-adversarial-review.txt](evidence/core-adversarial-review.txt) |
| Learning y medios privados | Suite learning y autenticación integrada | Permisos, publicación, PDF, seed único e idempotencia comprobados | [learning-tdd.txt](evidence/learning-tdd.txt), [learning-filename-green.txt](evidence/learning-filename-green.txt) |
| Respaldo/provisión/retención | `unittest backend.tests.pilot.test_operations -v` | 11 pruebas pasan; ruta privada, permisos 0700/0600, retención de 7 días solo archivos propios, restore y provisión idempotente | [operations-scripts-tdd.txt](evidence/operations-scripts-tdd.txt) |
| Ensayo operativo LOCAL | `tools/pilot/verify_operations.py` | 20 sesiones, 10,000 tours, 300 GET; hash/count legacy intactos tras dos migraciones; SQLite/PDF restaurados; venta posterior conservada | [operations.txt](evidence/operations.txt) |
| Optimización LOCAL de métricas | Mismo ensayo ASGI/TestClient | p95 metrics 275.60 ms, tours 97.22, notes 91.41, followups 94.71, lessons 45.91; bundle Home 492.19. Umbral API 1000 ms intacto | [operations-aggregated-local.txt](evidence/operations-aggregated-local.txt) |
| HTTP local real con cola de escritura | `tools/pilot/verify_operations.py --http` | Uvicorn único, httpx, 20 sesiones, 10,000 tours y 300 GET; Home paralelo p95 159.40 ms, metrics 125.99 ms, followups 126.40 ms; ambos gates pasan | [operations-http-queued-local.txt](evidence/operations-http-queued-local.txt); falta VPS final |
| Gate de historia | `verify-story` | LISTA antes de implementar | [story-approved.txt](evidence/story-approved.txt) |
| Baseline anterior | `npm test`; modelos `frontend/src/pilot` | 5 y 17 pruebas anteriores pasan; no GREEN de v5 | [baseline-domain.txt](evidence/baseline-domain.txt), [baseline-ui.txt](evidence/baseline-ui.txt) |
| Build web | `npm run build:web` | Vite construyó correctamente en 910 ms; entradas index/pilot y assets generados | [build-final.txt](evidence/build-final.txt) |
| Regresión de dominio anterior | `npm test` | 5 pruebas pasan después de integrar v5 | [domain-final.txt](evidence/domain-final.txt) |
| Navegador | `tools/qa/pilot-v5-e2e.mjs` | 17/17 recorridos pasan, cero errores JS; 360/390/1440 px, foco, offline y layout CSS 200% | [browser/results.json](evidence/browser/results.json), [frontend-tdd.txt](evidence/frontend-tdd.txt) |
| Rendimiento HTTP VPS final | Uvicorn real, 20 sesiones, 10,000 tours, 300 GET | p95 Home paralelo 461.84 ms; metrics 260.12 ms, followups 336.74 ms, tours 320.00 ms, notes 235.37 ms, lessons 187.14 ms. Ambos gates pasan con umbral 1000 ms | [operations-vps-http-final.txt](evidence/operations-vps-http-final.txt) |
| Publicación y smoke | Responsable de entrega | Pendientes de consolidación; no se declara release desplegado | CP5 y evidencia operativa a completar |

La medición local no incluye VPS/nginx/TLS/red. Los ensayos de rollback preservan la DB vigente y una venta posterior al snapshot; no acreditan una conmutación real de proxy/contenedor. Los archivos `story-gate.txt`, `governance-gate.txt` y `gate-results.json` conservan el resultado histórico de preparación del 19 de noviembre y no sustituyen la verificación vigente.

## 2. Evidencia TDD · RED → GREEN

Los grupos corresponden a pares test/impl de CP3. Se referencian fallos observados y sus salidas posteriores; no se declara excepción global para funcionalidades.

| Tarea | Fase | Comando / suite | Resultado observado |
|---|---|---|---|
| T01–T03 | RED | `unittest backend.tests.pilot.test_identity backend.tests.pilot.test_auth` | Esquema ausente y rutas privadas 404; [identity-tdd.txt](evidence/identity-tdd.txt) |
| T01–T03 | GREEN | Misma suite | 6 pruebas iniciales pasan: cookie, temporal/CSRF, revocación, recuperación y operación privada; [identity-tdd.txt](evidence/identity-tdd.txt) |
| T07–T08 | RED | `test_activity.MetricsTests` | 6 errores por claves de resultado ausentes en función sin implementar; [activity-tdd-red.txt](evidence/activity-tdd-red.txt) |
| T07–T08 | GREEN | Misma suite | 6 pasan con DS-02, ceros, cancelación y redondeo; [activity-tdd-green-metrics.txt](evidence/activity-tdd-green-metrics.txt) |
| T06–T11 | RED | `test_activity.ActivityApiTests` y validación | 7 fallos por rutas 404; validación No Tour/importe/fecha ausente; [activity-api-red.txt](evidence/activity-api-red.txt), [activity-validation-red.txt](evidence/activity-validation-red.txt) |
| T06–T11 | GREEN | `unittest backend.tests.pilot.test_activity` | 17 pruebas iniciales pasan; [activity-api-green.txt](evidence/activity-api-green.txt) |
| T09–T10 | RED | Guardrails de metas/seguimientos | Faltaba auditoría de rechazo y lista retornaba 3 pese a límite 2; [activity-guardrails-red.txt](evidence/activity-guardrails-red.txt) |
| T09–T10 | GREEN | Suite activity | 21 pruebas pasan, incluida meta concurrente, triggers y mes original; [activity-guardrails-green.txt](evidence/activity-guardrails-green.txt) |
| T16–T18, T21 | RED | `test_workspace.WorkspaceApiTests` | 7 rutas devolvían 404; [workspace-api-red.txt](evidence/workspace-api-red.txt) |
| T16–T18, T21 | GREEN | Misma suite | 7 pruebas iniciales pasan; integración ampliada a 31 activity/workspace; [workspace-api-green.txt](evidence/workspace-api-green.txt), [activity-workspace-integration.txt](evidence/activity-workspace-integration.txt) |
| T05, T22 | RED | `test_locale_is_persisted_and_cannot_change_identity` | PATCH preferencias 404; [workspace-preferences-red.txt](evidence/workspace-preferences-red.txt) |
| T05, T22 | GREEN | Activity/workspace | 32 pruebas pasan, preferencia persistente y rol no asignable; [workspace-preferences-green.txt](evidence/workspace-preferences-green.txt) |
| T12–T15 | RED | `unittest backend.tests.pilot.test_learning -v` | Normalización/ruta ausentes; después marcador seed y controles incompletos; [learning-red.txt](evidence/learning-red.txt), [learning-integration-red.txt](evidence/learning-integration-red.txt), [learning-controls-red.txt](evidence/learning-controls-red.txt) |
| T12–T15 | GREEN | Misma suite | 19 pruebas iniciales pasan con permisos, publicación, PDF y cookie/CSRF; [learning-green.txt](evidence/learning-green.txt) |
| T13 | RED | Nombre PDF codificado | No se decodificaba antes de validar; [learning-filename-red.txt](evidence/learning-filename-red.txt) |
| T13 | GREEN | Suite learning | Caso corregido; [learning-filename-green.txt](evidence/learning-filename-green.txt) |
| T04, T06–T08, T19–T20 | RED | Modelos frontend v5 | Resultados ausentes/incorrectos; [frontend-red.txt](evidence/frontend-red.txt) |
| T04, T06–T08, T19–T20 | GREEN | Mismo comando frontend | 9 pruebas iniciales pasan con oráculos; [frontend-green.txt](evidence/frontend-green.txt) |
| T15 | RED | Versión individual de permiso frontend | Se usaba versión de lección en vez de excepción; [frontend-permission-red.txt](evidence/frontend-permission-red.txt) |
| T15 | GREEN | Modelos frontend | 10 pruebas pasan; [frontend-permission-green.txt](evidence/frontend-permission-green.txt) |
| T06, T09 | RED | Corrección No Tour → Q | Resultado vacío bloqueaba corrección; [frontend-tour-correction-red.txt](evidence/frontend-tour-correction-red.txt) |
| T06, T09 | GREEN | Modelos frontend | 11 pruebas pasan con no venta predeterminada; [frontend-tour-correction-green.txt](evidence/frontend-tour-correction-green.txt) |
| T24 | RED | `unittest backend.tests.pilot.test_bootstrap` | Tours 404 en app integrada en lugar de exigir sesión 401; [bootstrap-tdd.txt](evidence/bootstrap-tdd.txt) |
| T24 | GREEN | Suite integrada | 51 pruebas en ese corte y seed repetible; [bootstrap-tdd.txt](evidence/bootstrap-tdd.txt) |
| T09, T24 | RED | Correlación/migración request ID | Auditoría/columna sin request_id; [core-audit-request-red.txt](evidence/core-audit-request-red.txt) |
| T09, T24 | GREEN | Suite auth/integración | IDs servidor coinciden con auditoría, concurrencia separada y migración conserva filas; [core-audit-request-green.txt](evidence/core-audit-request-green.txt), [core-activity-workspace-review-green.txt](evidence/core-activity-workspace-review-green.txt) |
| T16 | RED | Título de solicitud en detalle de equipo | lesson_title ausente; [workspace-request-labels-red.txt](evidence/workspace-request-labels-red.txt) |
| T16 | GREEN | Workspace | 11 pruebas pasan usando representación scoped de learning; [workspace-request-labels-green.txt](evidence/workspace-request-labels-green.txt) |
| T12 | RED | Modelo de editor frontend | Publicar dejaba formulario vacío; [frontend-editor-red.txt](evidence/frontend-editor-red.txt) |
| T12 | GREEN | Suite modelos frontend | 12 pruebas pasan; revisión publicada conserva contenido del editor; [frontend-editor-green.txt](evidence/frontend-editor-green.txt) |
| T23 | RED | Foco del modal de cuenta | El foco escapaba del modal; [frontend-modal-red.json](evidence/frontend-modal-red.json) |
| T23 | GREEN | Recorrido de teclado en navegador | Foco atrapado y restaurado, caso individual pasa en results; ampliación de layout continúa; [browser/results.json](evidence/browser/results.json) |
| T24 | RED | Configuración SQLite y benchmark | Journal DELETE en vez de WAL; WAL solo aún p95 metrics 1438.17 ms; [core-wal-red.txt](evidence/core-wal-red.txt), [operations-wal-local.txt](evidence/operations-wal-local.txt) |
| T24 | GREEN | Suite y ensayo local tras agregación SQL | WAL+FULL conserva durabilidad; SUM/COUNT reduce p95 metrics a 275.60 ms. Oráculo SQL/puro y presupuesto mensual coinciden; [core-metrics-scoped-green.txt](evidence/core-metrics-scoped-green.txt), [operations-aggregated-local.txt](evidence/operations-aggregated-local.txt) |
| T24 | RED | Cola de escritores y HTTP VPS | Segundo escritor abría conexión antes de esperar; VPS Home p95 1039.6 ms; [core-write-queue-red.txt](evidence/core-write-queue-red.txt), [operations-vps-http.txt](evidence/operations-vps-http.txt) |
| T24 | GREEN | Suite completa y HTTP local | 77 tests pasan. RLock antes de BEGIN, lectura simultánea y rollback comprobados; Home local p95 159.40 ms; [core-write-queue-green.txt](evidence/core-write-queue-green.txt), [operations-http-queued-local.txt](evidence/operations-http-queued-local.txt) |
| T24 | RED | `unittest backend.tests.pilot.test_operations -v` | 6 fallos: retención ajena, permisos, restos parciales, traversal/nombres; [operations-scripts-red.txt](evidence/operations-scripts-red.txt) |
| T24 | GREEN | Misma suite y suite global | 11 operaciones pasan; global 75 OK; [operations-scripts-green.txt](evidence/operations-scripts-green.txt), [operations-scripts-suite.txt](evidence/operations-scripts-suite.txt) |

`identity-tdd.txt` registra la corrección de ubicación de una aserción del fixture, sin cambiar su expectativa. La excepción/validación de scripts de infraestructura está en el runbook; no reemplaza pruebas de funciones ni el corte real de publicación.

## 3. Matriz de 24 criterios

Rutas de pruebas: `backend/tests/pilot/test_auth.py`, `test_activity.py`, `test_workspace.py`, `test_learning.py`, `test_identity.py`, `test_bootstrap.py`, `test_operations.py`; frontend en `frontend/src/pilot-v5/model.test.mjs`. El estado acredita la capa citada y nunca equivale a aceptación UAT del PO.

| AC / TC | Pruebas y evidencia concreta | Estado / restante |
|---|---|---|
| 01 | Auth: cookie/revocación y demo/recovery cerrados; identity/core GREEN | API verificada; E2E de acceso verificado |
| 02 | Auth: temporal/CSRF; core-adversarial: expiración y revocación | API verificada; E2E de cuenta/logout verificado; UAT pendiente |
| 03 | Activity: scope no asignable; Workspace: notas/diario privados; Learning: tenant/rol/PDF | Automatizado verificado en suite de 77; incluye dueño sin acceso a notas ajenas |
| 04 | Modelo `Routes never give representative owner destinations`, backend legacy404 | Parcial: modelo/API verificados; navegación/guía E2E verificadas |
| 05 | Workspace `test_locale_is_persisted_and_cannot_change_identity`; Learning fallback | Persistencia/fallback verificados; EN/ES y persistencia E2E verificados |
| 06 | Activity `test_two_tours_same_day_and_idempotency`; frontend No Tour corregido | API/modelos verificados; captura/recarga E2E verificadas |
| 07 | MetricsTests/TourValidationTests, No Tour convive sin seguimiento | Automatizado verificado: DS-02, canal y Q efectivo |
| 08 | Seis KPIs, ceros, half-up, mensual vs diario, paridad agregadosSQL/oráculo | Fórmulas verificadas; KPI cards E2E verificadas; lector pendiente |
| 09 | Activity: cancelación atómica, versión, mes original; auth request_id concurrente | Automatizado verificado; recorrido operativo E2E verificado |
| 10 | Meta única/inmutable, carrera concurrente, siguiente mes, rechazo auditado | Automatizado verificado, incluidos triggers SQL |
| 11 | Legacy propio separado; operations con 20 legacy, hash/conteo y migración doble | Sintético verificado; migración/backup del ambiente final en curso |
| 12 | Learning: editar/publicar/archivar conserva revisión/progreso; reorder/seed | API verificada; CMS E2E verificado; UAT pendiente |
| 13 | VideoContract; PDF cuota/límite/nombre/tenant/cookie/CSRF | API verificada; iframe y PDF E2E verificados; no prueba de proveedores remotos |
| 14 | Learning: completado idempotente/histórico sin bloqueo secuencial | API verificada; completado E2E verificado |
| 15 | Learning: solicitudes deduplicadas, allow/deny/equipo/cooldown; modelo versión | API/modelos verificados; interacción dueño/vendedor E2E verificada |
| 16 | Workspace: equipo privado y detalle idéntico a Home, learning real y labels | Automatizado verificado; equipo E2E verificado |
| 17 | Workspace: notas persistentes, versiones, borrado sin texto residual, búsqueda/páginas | API verificada; persistencia y offline E2E verificados |
| 18 | Workspace: tres respuestas, vínculo a tour propio, privacidad, borrado/idempotencia | API verificada; tres respuestas y offline E2E verificados |
| 19 | Anyway referencia/límites del modelo | 89,334.24 y 60,000.00 verificados; resultado visible E2E verificado |
| 20 | Loan referencia/cero/totales/límites | Saldo 16,000 y mensualidad 421.34/333.33 verificados; resultado visible E2E verificado |
| 21 | Workspace: settings owner/version, markup rechazado, org ajena intacta | API verificada; marca E2E verificada |
| 22 | Auth/locale persistente y navegación por rol | Parcial: API/modelos verificados; cuenta/guía/logout E2E verificados |
| 23 | Responsive/teclado/foco/reduced-motion en implementación frontend | En curso: consolidar 360/390/1440 px, zoom 200%, foco y accesibilidad |
| 24 | Bootstrap/core GREEN; operations restore/checksums/retención y venta posterior | LOCAL verificado; VPS HTTP final pasa tras SQL y cola de escritores; publicación/smoke pendientes |

### Alcance de navegador observado

[Resultados](evidence/browser/results.json): 17/17 casos pasan en Chromium aislado contra API real de loopback y fixture sintético. Incluyen acceso/navegación, varios tours, seguimiento, meta/KPIs, notas/Diario offline, calculadoras, idioma, CMS/video/PDF, solicitudes/permisos, privacidad de equipo, marca/orden/archivo, foco modal y logout. No hay errores JS registrados. Los casos cubren la parte de navegador de AC-01/04/05/06/08/09/10/12–22 según el detalle del reporte; no equivalen a UAT del PO.

La medición CSS al 200% pasó, pero **no es zoom nativo del navegador**. AC-23 conserva pendiente ese contraste y lector de pantalla. Safari/Firefox, reproducción remota real del proveedor y calidad editorial del material tampoco se afirman verificadas. [Límites y TDD frontend](evidence/frontend-tdd.txt).

La decisión técnica de rendimiento y sus límites están en [ADR-002](adr-002-sqlite-concurrency.md).

## 4. Hallazgos y estado

| Hallazgo | Corrección / evidencia | Estado |
|---|---|---|
| Preferencias sin endpoint | RED404→PATCH propio persistente estricto | Corregido |
| Rechazos de meta sin auditoría y seguimientos sin límite | Guardrails RED/GREEN | Corregido |
| Auditoría sin correlación HTTP | ContextVar, columna aditiva, ID del servidor y concurrencia | Corregido |
| Posible copia residual de notas/Diario borrados | Idempotencia guarda solo ID/hash; tests verifican borrado, replay 404 y ausencia de texto en logs | Verificado: no fuga reproducida |
| Permisos individuales, nombrePDF y corrección No Tour | RED/GREEN learning/frontend | Corregidos |
| Respaldo/retención/provisión inseguros en bordes | 6 RED → 11 GREEN operativos; global 75 pasa | Corregidos en entorno sintético |
| Rendimiento Home p95 > 1 s con 20 sesiones | WAL+FULL, agregación SQL con índice y cola RLock para escritores del proceso; HTTP local pasa sin cambiar timeout/last_seen/umbral | Corregido: HTTP VPS final pasa ambos gates |
| Zoom nativo, configuración final y publicación | Responsables activos, sin sustituir por pruebas locales | En progreso |

## 5. TRUST 5 ejecutado hasta este alcance

- **Tested:** RED→GREEN documentado, suite de 77 pruebas backend y 12 frontend pasan en salidas citadas. Casos negativos, fechas, ceros, concurrencia, permisos, privacidad y restore local ejecutados. El navegador tiene 17 recorridos observados y cero errores JS. Zoom nativo, lector de pantalla y cierre de publicación siguen abiertos; HTTP VPS final pasa.
- **Readable:** documentación funcional en español, identificadores en inglés, Repo Paths reales en CP3. Unidades/estados ligados al contrato.
- **Unified:** entry points v5 separados del legacy según ADR; contratos comunes de roles/periodos; equipo usa los mismos KPIs que Home. Seed persistente sin recrear contenido.
- **Secured:** cookie/CSRF/origen, allowlist/org/rol, revocación, inputs estrictos y PDF privado probados. Notas/Diario no entran en auditoría/IA. Claves privadas fuera del sitio, archivos 0600/directorios 0700 comprobados con datos sintéticos. No se certifica configuración productiva antes de preflight.
- **Trackable:** aprobación→historia LISTA→AC/TC→tests/evidencias→rutas CP3 en rama `feature/pilot-v5`. request_id correlacionado. Commit/release/UAT se incorporan al cierre cuando existan.

## 6. Gate de salida y decisión

- [x] Resultados automatizados y RED/GREEN registrados.
- [x] Aislamiento, privacidad, reglas monetarias y migración sintética comprobados.
- [x] Ensayo local de copia/restauración e integridad con límites explícitos.
- [x] Build y 17 recorridos Chromium concluidos, incluidos offline, foco y CSS 200%, con cero errores JS.
- [ ] Zoom nativo 200%, lector de pantalla y revisión editorial/UAT no comprobados por esos recorridos.
- [x] Rendimiento HTTP sintético del VPS comprobado con los umbrales originales.
- [ ] Respaldo/configuración de corte y publicación/smoke consolidados por responsable de entrega.
- [ ] UAT de negocio y revisión editorial registradas por responsable.
- [x] Gobernanza estricta ejecutada con perfil local: exit 0, metodología y plantillas completas, adapters sincronizados. Repetir al consolidar el cierre operativo.
- [ ] CP5 actualizado por responsable de entrega.

**Decisión:** continuar la validación/publicación autorizadas. No hay waiver ni UAT aprobada registrados. CP4 permanece abierto; un gate documental aprobado no sustituye los pendientes de producto/entorno.

### Gobernanza ejecutada

Comando observado el 2026-11-20 (solo lectura; sin modificar el marco central):

```sh
bash /Users/rogergv/Documents/SoftvibesLab/px-onboarding-mob-gen/install/verify-governance.sh /Users/rogergv/Documents/SoftvibesLab/px-onboarding-mob-gen --feature /Users/rogergv/Documents/SoftvibesLab/SalesAcademyVibes/vcsAcademyMobile/work/features/2026-11-19-pilot-v5 --profile /Users/rogergv/Documents/SoftvibesLab/SalesAcademyVibes/vcsAcademyMobile/.ecosystem360/team-bootstrap/project-profile.local.yml --strict
```

Salida observada: `OK: adapters sincronizados con la fuente neutral (16 agentes, 13 skills, 6 rules, 7 bloques multi-herramienta).` y `OK: metodologia y plantillas de gobierno completas.` Exit 0. No reportó faltantes documentales. No sustituye UAT, accesibilidad pendiente ni verificaciones del ambiente final.
