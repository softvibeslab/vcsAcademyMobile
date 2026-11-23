# CP4 · Validación

**Status:** completed

| Tarea | Fase | Comando | Resultado observado |
|---|---|---|---|
| T01 | RED | `MANUAL_QA_PHASE=browser-red ... node verify-manual-analysis.cjs` | Guardar feedback hizo1 solicitud de análisis, esperado0. browser-red/results.json |
| T02 | RED | `node --test frontend/src/pilot/tour-analysis.test.mjs` | Helper inicial no guardaba aporte ni aplicaba límites/replay. frontend-red.txt |
| T02 | GREEN | Mismo comando | 10 pruebas del flujo básico pasan. frontend-green.txt |
| T02-replay | RED | `MANUAL_QA_PHASE=lost-response-red ... node verify-lost-response.cjs` | PATCH real confirmado y respuesta cortada: al reintentar aparecen2 aportes y revisión3. lost-response-red/results.json |
| T02-replay | RED | `node --test frontend/src/pilot/tour-analysis.test.mjs` | Selección de tarea tras refrescar revisión no conserva la petición. frontend-retry-red.txt |
| T02-replay | GREEN | Mismo comando y `verify-lost-response.cjs` | 11 unit tests; navegador conserva mismo UUID/body, revisión2 y un solo aporte. frontend-retry-green.txt y lost-response-green/results.json |
| T03 | RED | `.venv/bin/python -m unittest backend.tests.test_tour_hermes` | Prompt y límites breves fallan:5 failures. backend-red.txt |
| T03 | GREEN | Mismo comando | 18/18. backend-green.txt |
| Regresión backend | GREEN | Suites test_tour_visits, test_coach_hermes y backend/tests/pilot | 19+17+79 pruebas pasan. backend-visits/coach/v5-regression.txt |
| Regresión frontend | GREEN | `node --test frontend/src/pilot/*.test.mjs frontend/src/components/calendar/*.test.mjs frontend/src/pilot-v5/model.test.mjs` | 70/70. frontend-regression.txt |
| Dominio | GREEN | `npm test` | 5/5. domain-regression.txt |
| Build | GREEN | `npm run build:v1` y `npm run build:web` | Ambos pasan. build-v1.txt y build-v5.txt |
| QA final local | GREEN | `MANUAL_QA_PHASE=browser-final ... node verify-manual-analysis.cjs` | Android oscuro, iPhone claro y escritorio oscuro: guardado/lectura sin inferencia, aporte/reintento, nuevo aporte, pasos y viewport. browser-final/results.json |

Excepcion TDD: documentación y empaquetado/configuración de despliegue se validan mediante revisión, hashes y smoke. Los comportamientos productivos llevan RED → GREEN.

| Candidata | GREEN | `deploy-release.py ARCHIVE SHA256` | Hermes real responde resumen y3 acciones dentro de límites; PATCH/replay/retención/métricas correctos. hermes-real-analysis.json |
| Publicación | GREEN | Mismo operador | 21 archivos verificados, V1 lista, esquema/cuentas/DEMO/V5/mantenimiento intactos. release-activation.json |
| Artefactos públicos | GREEN | `verify-public-artifacts.py --after-activation ...` | 9/9, certificado HTTPS y hashes HTML/JS/CSS del build final. public-artifacts.json |
| Modal e histórico | GREEN | `verify-modal.cjs` reutilizado con salida en evidence/modal-live | 3 casos públicos: iPhone oscuro, Android claro y escritorio claro; DEMO idéntica, sin mutaciones, foco/edición/scroll correctos. modal-live/results.json |

| Flujo público | GREEN | `TOUR_QA_LIVE=1 MANUAL_QA_PHASE=live ... verify-manual-analysis.cjs` | 3 casos con Hermes real: cero análisis al guardar/abrir/escribir, aporte persistido, revisión correcta,3 pasos breves y sin overflow. live/results.json |
| Gobierno | GREEN | `verify-governance.sh ... --strict` | Gate completo; governance-before-release.txt y governance.txt |

## TRUST 5

- Tested: RED→GREEN del disparo, brevedad y pérdida real de respuesta. QA usa API propia real; sólo Hermes externo se simula en local. La prueba de red ejecuta PATCH real y corta su respuesta, sin fabricar respuestas de aplicación.
- Readable: orquestación de aporte/solicitud separada en tour-analysis.mjs; revisión independiente del selector de reintentos.
- Unified: componentes, temas, modal y contratos existentes. Sin nuevas rutas ni esquema.
- Secured: datos ficticios, límites existentes y propietario/retención intactos. No se copia DB productiva a QA.
- Trackable: rama, SPEC, pruebas, revisión y evidencia vinculadas a esta feature. Publicación, artefactos y flujo público verificados.

## Revisión independiente

El revisor detectó duplicación tras respuesta PATCH perdida y tras replay que devuelve una edición concurrente. Corregido el selector para conservar tarea/UUID; PATCH200 reconoce el aporte antes de exigir revisar un conflicto. La revisión final y 11 pruebas del helper no encontraron bloqueos. La primera prueba de conteo Unicode tenía un error de expectativa (separador27 caracteres): se documenta en unit-test-review.md, sin cambiar el límite del producto.

## Publicación verificada

Raíz: `/srv/aisales-v1-release-20261122-manual-analysis/web`. Imagen: `sha256:ed2da844f2d1588dff0e0dcc687e6ffb1587f42f0cfba33cf43636b13817830d`. Archivo SHA256: `ec5616e92c4fd368efe5b43db3d529d54bf5a3f99ab2fc777f9cdb1fce87459c`. HTML SHA256: `46e49361252e0531d28a819e95441cbeea39ef83391f2ca17b1ac1025b76a871`.

Se reutilizó la base productiva sin copiarla ni migrarla. Candidata sintética eliminada. El ejemplo persistente, contenedor/StartedAt de V5 y servicio/timer de retención conservaron sus hashes. Reversión documentada en README.md.

## Límites de la validación

Móvil se verificó con Chromium/WebKit emulados a360×800 y390×844; no equivale a hardware físico. La QA pública crea únicamente visitas ficticias de esta ejecución y las elimina al terminar. El ejemplo DEMO solicitado antes permanece idéntico. El plazo de retención y mantenimiento se reutiliza sin cambios.
