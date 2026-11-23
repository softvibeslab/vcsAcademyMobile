# Validación frontend · visitas V1

Implementación limitada a `frontend/src/pilot/`. No se alteró código V5, KPIs, almacenamiento de notas anteriores ni el FAB de seguimiento de Agenda.

## Evidencia ejecutada

| Tarea | Estado | Comando / evidencia | Salida observada |
|---|---|---|---|
| T02/T03/T05/T06 | RED | `node --test frontend/src/pilot/tour-model.test.mjs`; frontend-model-red.txt | Siete comportamientos pendientes fallaron antes de implementar el modelo. |
| T03 | RED | Mismo comando; frontend-time-red.txt | Finalizar en el minuto de inicio se rechazaba al truncar segundos. |
| T03 | RED | Mismo comando; frontend-edited-time-red.txt | Una hora editada explícitamente se reemplazaba por ahora. |
| T03 | RED | Mismo comando; frontend-equal-time-red.txt | Inicio exactamente en segundo cero producía fin igual al inicio. |
| T02/T03/T05/T06 | GREEN | Mismo comando; frontend-model-green.txt | 10 pruebas pasan; hora editada se respeta, valor por defecto del minuto actual conserva instante real. |
| T02/T06 | RED | `node work/features/2026-11-22-v1-tour-learning/verify-ui-edges.cjs`; ui-edges-red.json | Panel de registro oculto desde Roleplay y detalle Agenda permanecía contraído. |
| T02/T06 | GREEN | `TOUR_EDGE_EVIDENCE=ui-edges-green.json node work/features/2026-11-22-v1-tour-learning/verify-ui-edges.cjs` | 2/2 comportamientos corregidos y verificados en navegador. |
| Regresión | GREEN | `node --test frontend/src/pilot/*.test.mjs frontend/src/components/calendar/*.test.mjs frontend/src/pilot-v5/model.test.mjs`; frontend-regression.txt | 59/59 pruebas pasan. |
| Build V1 | GREEN | `npm run build:v1`; frontend-build-v1.txt | Compilación completada. |
| Build V5 | GREEN | `npm run build:web`; frontend-build-v5.txt | Compilación completada, sin modificaciones de código V5. |

Excepcion TDD: estilos y texto de interfaz según excepción CP3. Las capturas y geometría de la matriz de navegador están a cargo del agente raíz. Se corrigió la especificidad light para que Cancelar y botones inactivos no heredaran el texto blanco del CTA; el borde de visitas completadas usa el token existente de Agenda.

## Recorrido y controles

- Coach propone las tres acciones sin guardar automáticamente; `Registrar visita` permite abrirlas manualmente desde Conversar o Roleplay.
- Formularios usan diálogo nativo, Escape, devolución de foco y confirmación; las notas locales sólo se copian tras `Usar en registro de visita` y guardado confirmado.
- Visitas separadas por UUID, contexto recargable `#coach/{id}`, detalle `#agenda/{id}` y `#diary/{id}`. Eliminada/no disponible limpia historial y deshabilita envío del contexto.
- Feedback se guarda antes del análisis; fallo o estado pendiente permite reintento. Análisis desactualizado no ofrece recomendaciones actuales.
- Roadmap valida catálogo y permisos antes de abrir una lección. Las métricas Agenda siguen calculándose sólo con Goal Sheet.

La matriz E2E completa, Hermes real y publicación los valida el agente raíz; este informe no declara despliegue ni reemplaza esa evidencia.
