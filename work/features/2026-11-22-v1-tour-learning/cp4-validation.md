# CP4 · Validación

**Status:** implementación, QA local, Hermes real y recorrido público verificados.

## Aprobación y revisión

El PO aprobó v1 con «si hazlo !» el 2026-11-22 (America/Cancun). Historia LISTA: `evidence/readiness-approved.txt`. La inspección inicial y los gates de propuesta no aprobados se conservan como historia, no como estado actual.

Revisión independiente backend/Hermes/frontend ejecutada. Se corrigieron los casos de Unicode inválido, permisos de curso cambiados durante inferencia, finalización inmediata con precisión de tiempo y navegación desde Roleplay/Agenda contraída.

## Evidencia RED → GREEN

| Tarea | Fase | Comando / ejecución | Resultado observado |
|---|---|---|---|
| T01 | RED | `.venv/bin/python backend/tests/test_tour_visits.py` | Contratos de visitas ausentes; backend-red.txt. Casos adicionales de frontera en backend-analysis-red.txt, backend-boundary-red.txt y backend-unicode-red.txt |
| T01/T04/T05/T07 | GREEN | Mismo comando | 19 pruebas pasan: propiedad, múltiples visitas/día, replay, revisiones, fechas, permisos, expiración, leases y respuestas tardías; backend-green.txt |
| T04/T05 | RED | `.venv/bin/python backend/tests/test_tour_hermes.py` | Contexto/análisis todavía ausentes; hermes-red.txt. Unicode incorrecto del modelo reproducido en hermes-unicode-red.txt |
| T04/T05 | GREEN | Mismo comando | 15 pruebas pasan: contexto acotado íntegro, JSON validado, catálogo permitido y errores; hermes-unicode-green.txt |
| T02/T03/T06 | RED | `node --test frontend/src/pilot/tour-model.test.mjs` | Reglas ausentes, precision temporal y comparación de igualdad; frontend-model-red.txt, frontend-time-red.txt y frontend-equal-time-red.txt |
| T02/T03/T06 | GREEN | Mismo comando | 10 pruebas de visitas pasan dentro de 59 modelos frontend; frontend-model-green.txt y frontend-regression-r2.txt |
| T07 | RED | `.venv/bin/python backend/tests/test_tour_maintenance.py` | Mantenimiento no implementado; después fallo de purga dejaba backup viejo; maintenance-red.txt, maintenance-failure-red.txt y maintenance-partial-red.txt (respaldo interrumpido) |
| T07 | GREEN | Mismo comando | 6 pruebas pasan: copia SQLite consistente con WAL, permisos, 7 días, no seguir symlinks, parciales interrumpidos y retención independiente del éxito; maintenance-partial-green.txt |
| T02/T06 | RED | `TOUR_EDGE_EVIDENCE=ui-edges-red.json node work/features/2026-11-22-v1-tour-learning/verify-ui-edges.cjs` | Registrar desde Roleplay dejaba propuesta oculta; abrir visita conservaba Agenda contraída; 2 fallos reproducidos |
| T02/T06 | GREEN | Mismo script con evidencia ui-edges-green.json | Ambos recorridos pasan después de corregir callbacks |
| T06 | RED | `node work/features/2026-11-22-v1-tour-learning/verify-agenda-refresh.cjs` con dashboard real demorado | Aviso de actualización añadía 24 px a Agenda en ambos temas; agenda-refresh-red.json y agenda-refresh-cause.md |
| T06 | GREEN | Mismo script después de ajustar contenedor | 2/2 pasan con aviso visible y navegación dentro de 844 px; agenda-refresh-green.json |
| Regresión | GREEN | Suites backend Coach/acceso/legacy/V5 y npm test | 17 Coach, 16 acceso, 79 V5, 5 dominio y smoke legacy pasan; evidencia backend-*-regression.txt y domain-regression.txt |
| Build | GREEN | `npm run build:v1` y `npm run build:web` | Builds independientes V1/V5 pasan; frontend-build-v1-r2.txt/frontend-build-v5-r2.txt |
| Recorrido | GREEN | `node work/features/2026-11-22-v1-tour-learning/verify-tours.cjs` | 13 verificaciones y 14 capturas: 6 combinaciones navegador/tema, schedule/cancel, feedback, 503 + retry, Roadmap, contexto tras reload, Diary edit/delete y métricas intactas; browser/results.json |
| Captura | GREEN | `node work/features/2026-11-22-v1-tour-learning/verify-capture.cjs` | 5 verificaciones: contraste light, altura 460px, inicio/feedback inmediato, copia/cancelación de nota local y original intacto; capture-results.json |
| Integración local | GREEN | smoke(18936) de deploy-release.py | API real temporal + bridge externo simulado: crear/replay/análisis/contexto/métricas/borrado; local-api-smoke.json |
| Inferencia real | GREEN | Adaptador de análisis → bridge remoto 2.25.231.154 | Respuesta Hermes real en 11.98 s, esquema válido, recomendación step_1; hermes-real-analysis.json |
| T08 | GREEN | deploy-release.py + publish-web-r2.py | Candidato y API activa completaron análisis/contexto Hermes real; overlay web activado sin reiniciar APIs; release-activation.txt y web-r2-activation.json |
| Público | GREEN | `TOUR_QA_URL=https://aisalesv1.softvibes.pro/ TOUR_QA_LIVE=1 node work/features/2026-11-22-v1-tour-learning/verify-tours.cjs` | 13 verificaciones, 14 capturas y 6 combinaciones pasan con Hermes real; contexto tras recarga, recomendación, borrado y KPIs intactos; live/results.json |
| Carga pública | GREEN | `verify-agenda-refresh.cjs` con respuesta real demorada | 2/2 temas pasan; aviso visible y navegación dentro del viewport; agenda-refresh-live.json. Interceptación con service worker bloqueado sólo en este test, explicado en agenda-refresh-harness-note.md |
| Artefactos | GREEN | `verify-public-artifacts.py --after-activation --manifest .../web-r2-manifest.json` | 9/9 verificaciones: HTTPS, HTML/JS/CSS idénticos al build, API lista y HTML V5 sin cambios; public-artifacts.json |
| Operación | GREEN | Activación y ejecución del servicio systemd | Mantenimiento exit 0, timer activo, respaldos privados verificados y sin registros QA del recorrido ni análisis huérfanos; maintenance-activation.json y deployment-after.json |

Excepcion TDD: configuración de despliegue, documentación y estilos puramente visuales se verifican mediante revisión, sintaxis, hashes, geometría, contraste y smoke; no se declaran como pruebas de lógica. La primera prueba de mantenimiento falló explícitamente porque faltaba el módulo (sin error de sintaxis), antes de escribirlo. El detalle del orden de casos backend está en `evidence/backend-test-note.md`.

La primera pasada pública encontró el aviso de actualización desplazando Agenda. Se conserva en `live-first-run/`; la causa y su corrección reproducida constan en `agenda-refresh-cause.md`. La matriz pública final pasó con el artefacto r2.

La primera pasada local del recorrido impuso disabled sobre el textarea, que CP2 no exigía; la implementación ya limpiaba el contexto y bloqueaba el envío. Se corrigió esa expectativa y se conserva el fallo y la explicación en `browser-first-run/` y `browser-test-review.md`.

## TRUST 5

- Tested: contratos, regresiones, modelos, navegador y análisis real ejecutados; publicación y recorrido público verificados.
- Readable: entidad de visita separada del Goal Sheet; formulario, modelo frontend y adaptador independientes.
- Unified: API envelope, acceso, temas y catálogo existentes; base V1 independiente, sin cambios V5.
- Secured: owner por sesión, permisos antes de inferencia, sin herramientas de escritura, tombstones y borrado transaccional; threat-model.md y pruebas ejecutadas.
- Trackable: historia aprobada, CP0–CP5, ADR, rama y evidencia sanitizada. Gate de gobierno estricto aprobado en governance.txt; revisión de patrones de secretos sin hallazgos en changed-secret-scan.json.

## Límites

QA móvil es emulación Chromium/WebKit con viewport/DPR y altura reducida, no hardware físico. Datos de prueba exclusivamente sintéticos. La cuenta demo compartida comparte propietario; el aislamiento probado es entre cuentas distintas. El modelo puede no recomendar una lección si ninguna disponible se justifica; no se inventa contenido.
