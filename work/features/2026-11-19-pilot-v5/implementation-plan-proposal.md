# Plan preliminar · implementación del piloto v5

**Estado:** propuesta para revisión CP2; no habilita ejecución productiva.
**Base observada:** `951aa02`.
**Spec:** [cp2-spec.md](cp2-spec.md).

## Secuencia por dependencias

| Bloque | Trabajo | Dependencias | Resultado verificable |
|---|---|---|---|
| 1 | Organización, acceso privado, sesiones y operación manual | CP2 e historia aprobados | Aislamiento y revocación; ningún bypass demo/legacy |
| 2 | Tours, metas, métricas y preservación histórica | Bloque 1 | Varios tours/día y seis KPIs correctos |
| 3 | Ruta, archivos, progreso, solicitudes y equipo | Bloque 1; métricas del 2 | Dueño publica y concede acceso sin códigos comerciales |
| 4 | Notas/Diario, calculadoras y preferencias | Bloque 1; contratos de datos acordados | Persistencia privada y resultados numéricos |
| 5 | Home y navegación, EN/ES, guías y branding | Bloques 2–4 | Recorrido coherente vendedor/dueño sin IA |
| 6 | Regresión, seguridad, accesibilidad, UAT y release | Bloques 1–5 | Evidencia y respaldo/restauración probados |

Después del bloque 1 se puede trabajar en paralelo en 2/3/4, con archivos asignados y contratos comunes. Integración y migración son secuenciales. No se publica una UI nueva contra API antigua ni se cambia el dato legacy para facilitar una prueba.

## Repo Paths (spec ↔ código)

| Capa | Rutas existentes | Nuevas rutas propuestas | Runtime |
|---|---|---|---|
| Backend | backend/app/main.py, persistence.py, cli.py, access.py | backend/app/pilot/ | Python/FastAPI/Pydantic |
| Datos | backend/app/persistence.py | backend/app/pilot/migrations.py, repositorios bajo pilot/ | SQLite |
| Frontend | frontend/src/pilot/App.jsx, Auth.jsx, Workspace.jsx, Learning.jsx, Management.jsx, Guide.jsx, Onboarding.jsx, model.mjs | frontend/src/pilot/i18n/, servicios y componentes piloto acordados | React/Vite |
| Dominio | packages/domain/src/index.mjs, packages/domain/test/ | Módulo de métricas/calculadoras piloto separado de legacy | JavaScript |
| QA | backend/tests/, frontend/src/pilot/*.test.mjs, e2e/ | backend/tests/pilot/, e2e/pilot-v5.spec.js | unittest/httpx, node:test, Playwright |
| Operación | work/features/2026-11-14-acceso-free-premium/deploy.sh, 2026-11-16-guia-de-inicio/deploy-web.sh | Release/runbook propios de esta feature tras preflight | Docker/Nginx existentes, por verificar |

No se instala ni modifica el marco central del Ecosistema 360. Perfil local del producto no encontrado; antes de calidad de implementación se debe materializar un perfil del producto a partir de estos comandos observados, sin copiar configuración de otro proyecto.

## Pares test-first propuestos

Cada fila describe dos tareas separadas, todavía pendientes. `Txx-test`: escribir la prueba y observar fallo por comportamiento ausente, no por sintaxis/import. `Txx-impl`: implementar hasta pasar esa misma prueba y regresiones relacionadas. TC/AC son del mismo número.

| Par | AC/TC | Prueba con nombre propuesto | RED esperado | GREEN exigido |
|---|---|---|---|---|
| T01-test / T01-impl | 01 | test_pilot_requires_allowlisted_active_account | Acceso público/demo aún permitido | Solo cuenta autorizada |
| T02-test / T02-impl | 02 | test_temporary_password_and_session_revocation | Temporal abre módulos o sesión revocada funciona | Cambio y revocación efectivos |
| T03-test / T03-impl | 03 | test_organization_and_owner_isolation | Lectura/escritura cruzada posible | Matriz negativa íntegra |
| T04-test / T04-impl | 04 | pilot_navigation_and_guides | Dock/guía aún muestran Coach | Tres destinos coherentes |
| T05-test / T05-impl | 05 | locale_persists_and_translates_errors | EN sin acción o copy español fijo | Ambos idiomas persistentes |
| T06-test / T06-impl | 06 | test_multiple_tours_same_day | Segundo tour sobrescribe primero | IDs y registros separados |
| T07-test / T07-impl | 07 | effective_q_and_no_tour_rules | CT sin venta contado o NQ vendido omitido | Fixture DS-02 exacto |
| T08-test / T08-impl | 08 | six_kpis_match_period_and_budget | Fórmulas/denominadores incorrectos | DS-02/03 y ceros correctos |
| T09-test / T09-impl | 09 | test_tour_retry_conflict_and_cancellation | Duplicado/sobrescritura/cancelación incorrecta | Idempotencia, 409 y auditoría |
| T10-test / T10-impl | 10 | test_monthly_goal_unique_and_immutable | Dos metas o edición confirmada aceptada | Una meta mensual persistente |
| T11-test / T11-impl | 11 | test_legacy_preserved_without_synthetic_tours | Migración cambia historia o duplica | Dos arranques idénticos e integridad |
| T12-test / T12-impl | 12 | test_roadmap_publish_order_archive | Catálogo fijo o borrador visible | Ciclo editorial por organización |
| T13-test / T13-impl | 13 | test_media_upload_and_private_access | Falso PDF/ID ajeno aceptado | Validación y descarga autorizada |
| T14-test / T14-impl | 14 | test_completion_independent_of_order | Paso autorizado exige anterior | Completado idempotente e histórico |
| T15-test / T15-impl | 15 | test_access_request_dedup_and_grant | Solicitud inexistente/duplicada | Permiso individual y aviso único |
| T16-test / T16-impl | 16 | test_owner_team_metrics_without_private_notes | Equipo mezcla ámbito o notas | Agregados y privacidad correctos |
| T17-test / T17-impl | 17 | private_notes_persist_and_fail_honestly_offline | Solo localStorage o éxito sin servidor | Persistencia y aviso veraz |
| T18-test / T18-impl | 18 | diary_stores_three_private_answers | Una pregunta o contenido perdido | Tres respuestas privadas |
| T19-test / T19-impl | 19 | anyway_money_examples_and_bounds | Cálculo ausente/convención distinta | DS-08 y límites |
| T20-test / T20-impl | 20 | loan_examples_zero_rate_and_bounds | Cálculo ausente/tasa cero falla | Saldo y mensualidad exactos |
| T21-test / T21-impl | 21 | organization_branding_is_safe_and_scoped | Marca fija o ámbito incorrecto | Nombre/título en organización |
| T22-test / T22-impl | 22 | account_actions_available_without_profile_tab | Se pierde cerrar sesión/clave/guía | Mi cuenta completo |
| T23-test / T23-impl | 23 | responsive_keyboard_focus_and_zoom | Control inaccesible/recortado | Recorridos manuales y automatizados |
| T24-test / T24-impl | 24 | test_migration_backup_restore_and_legacy_guards | Copia no recuperable o bypass | Restauración y preflight aprobados |

Excepciones exclusivamente visuales se registrarán por tarea y con evidencia manual. No se declara una excepción global para saltar TDD de acceso, cálculos o datos.

## Comandos y aislamiento

Comandos existentes observados: `npm test`, `node --test frontend/src/pilot/*.test.mjs`, `npm run build:web`, `npm run e2e:api`, `npm run e2e:access`. Las pruebas API anteriores importan la app y pueden sembrar datos: solo ejecutar tras revisar fixture y forzar base temporal, nunca con configuración productiva heredada.

Comandos nuevos propuestos una vez existan sus archivos: `python3 -m unittest discover -s backend/tests/pilot -p 'test_*.py'` y `npx playwright test e2e/pilot-v5.spec.js`. Sus fixtures deben crear una base y directorio de archivos temporales y fallar si se intenta usar la ruta productiva. Playwright utilizará el navegador aislado ya autorizado por el usuario, sin perfiles reales.

Sin lint definido en package.json: no declarar un lint inexistente aprobado. Revisar sintaxis/imports, build, diffs y pruebas pertinentes; cualquier incorporación de tooling se decide antes y se documenta.

## Rama y entrega

Rama propuesta `feature/pilot-v5`, desde el HEAD revisado después de comprobar cambios ajenos. No se ha creado ni enviado una rama por esta entrega documental. No se hacen commits de claves, bases, copias ni PDFs de clientes. Los artefactos de la feature se versionan junto al código cuando se implemente.

## Publicación y recuperación propuestas

1. Inventario de solo lectura del host principal, release, contenedor, datos y proxy actuales; confirmar la correspondencia de organizaciones/cuentas sin registrar datos privados en el repo.
2. Preparar un release independiente y una copia consistente de SQLite/archivos/configuración necesaria en ubicación privada. Probar restauración aislada.
3. Ejecutar migración y pruebas en staging sintético. Revisar publicación de videos/PDF con el dueño, sin inventar contenido.
4. Preparar el cambio coordinado web/API, sin exponer modos demo/legacy. Conservar release anterior y invalidar sesiones antiguas conforme al contrato.
5. Smoke público sin crear resultados comerciales y QA autenticado con cuenta explícitamente destinada a pruebas.
6. Si falla, detener escrituras del piloto, preservar datos nuevos y usar el procedimiento ensayado. Nunca restaurar una base anterior sobre escrituras nuevas sin preservarlas.

La fecha objetivo es 2026-12-14. La aprobación CP2 permite empezar la ejecución; los datos reales y condiciones de infraestructura se resuelven cuando se concrete el release, sin pedir permiso repetido para trabajo ya autorizado.
